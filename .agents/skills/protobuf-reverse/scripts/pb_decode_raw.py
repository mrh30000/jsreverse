#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pb_decode_raw.py — 零依赖 protobuf wire-format 解析器。

定位：`protoc --decode_raw` 的离线替代品。**不需要 protoc、不需要 google.protobuf**，
本机只有 Python 标准库时也能用（AGENTS.md「环境坑」：本机无 protobuf / protoc）。

它能做的：
  * varint / fixed32 / fixed64 / length-delimited 的完整解码（wire type 0/1/2/5，含废弃 group 3/4）
  * **帧剥离**：gRPC-Web 5 字节帧、4/2/1 字节大端/小端长度前缀、整段 base64
  * **嵌套自动判定**：length-delimited 载荷递归试探，能解析通就按嵌套 message 展示
  * 输出 JSON（字段号 → 值），可选 `--typedef` 输出 blackboxprotobuf 风格的推测类型表

它不做的：
  * 不推断字段**名**（wire format 里没有字段名，字段名只能从生成 JS 里捞，见
    `references/schema-recovery-from-js.md`）
  * 不区分 int32/uint32/sint32/enum —— 这些都落在 wire type 0，取值本身相同；
    负数与 sint 的 zigzag 需要**用生成 JS 里的 `read*` 函数名**来定
  * 不区分 string/bytes/message —— 同属 wire type 2，只能靠"像不像文本"和"能不能递归解析"

用法：
  python pb_decode_raw.py --input body.bin --frame grpc-web --pretty
  python pb_decode_raw.py --input resp.bin --frame len4be --typedef
  python pb_decode_raw.py --b64 "CgZQZXJpb2RpY2Fs" --pretty
  echo -n ... | python pb_decode_raw.py --stdin
  python pb_decode_raw.py --selftest

退出码：0 成功；1 输入不是合法的 protobuf 字节流；2 参数错误。校验失败一律非 0 退出，
不打印半成品结果（避免把"部分解析"当成"解析成功"）。
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import sys

# ---------------------------------------------------------------- 核心解码

WIRE_VARINT = 0
WIRE_I64 = 1
WIRE_LEN = 2
WIRE_SGROUP = 3
WIRE_EGROUP = 4
WIRE_I32 = 5

WIRE_NAMES = {
    WIRE_VARINT: "varint",
    WIRE_I64: "fixed64",
    WIRE_LEN: "length-delimited",
    WIRE_SGROUP: "start-group",
    WIRE_EGROUP: "end-group",
    WIRE_I32: "fixed32",
}


class PbError(ValueError):
    """输入不是合法 protobuf 字节流。"""


def read_varint(buf: bytes, pos: int, limit: int):
    """返回 (值, 新位置)。最长 10 字节；超长或越界即报错。"""
    result = 0
    shift = 0
    start = pos
    while True:
        if pos >= limit:
            raise PbError("varint 在偏移 %d 处越界" % start)
        if pos - start >= 10:
            raise PbError("varint 在偏移 %d 处超过 10 字节" % start)
        byte = buf[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, pos
        shift += 7


def decode_message(buf: bytes, start: int, limit: int):
    """解出一层 message，返回 [(field_no, wire_type, value), ...]。

    value 的形态由 wire type 决定：
      varint -> int；fixed64/fixed32 -> int；length-delimited -> bytes
      start-group/end-group -> 原样记录，不展开（保留现场，避免吞掉字节）
    """
    fields = []
    pos = start
    while pos < limit:
        tag_start = pos
        tag, pos = read_varint(buf, pos, limit)
        field_no = tag >> 3
        wire = tag & 0x07
        if field_no == 0:
            raise PbError("偏移 %d 处字段号为 0（非法）" % tag_start)
        if wire == WIRE_VARINT:
            value, pos = read_varint(buf, pos, limit)
        elif wire == WIRE_I64:
            if pos + 8 > limit:
                raise PbError("偏移 %d 处 fixed64 越界" % pos)
            value = int.from_bytes(buf[pos : pos + 8], "little")
            pos += 8
        elif wire == WIRE_LEN:
            length, pos = read_varint(buf, pos, limit)
            if length < 0 or pos + length > limit:
                raise PbError("偏移 %d 处 length-delimited 长度 %d 越界" % (pos, length))
            value = buf[pos : pos + length]
            pos += length
        elif wire == WIRE_I32:
            if pos + 4 > limit:
                raise PbError("偏移 %d 处 fixed32 越界" % pos)
            value = int.from_bytes(buf[pos : pos + 4], "little")
            pos += 4
        elif wire in (WIRE_SGROUP, WIRE_EGROUP):
            # 废弃的 group：不做语义展开，记录标签位置即可
            value = None
        else:
            raise PbError("偏移 %d 处未知 wire type %d" % (tag_start, wire))
        fields.append((field_no, wire, value))
    return fields


def _printable_ratio(data: bytes) -> float:
    if not data:
        return 1.0
    ok = 0
    for b in data:
        if b in (0x09, 0x0A, 0x0D) or 0x20 <= b <= 0x7E or b >= 0x80:
            ok += 1
    return ok / len(data)


def looks_like_text(data: bytes) -> bool:
    """长度分隔载荷是否像 UTF-8 文本（宽松判定，用于 string vs bytes 分流）。

    高字节按 UTF-8 续字节放宽，避免误杀中文。控制字符（除 \\t \\n \\r）算不可打印。
    """
    if not data:
        return True
    if _printable_ratio(data) < 0.95:
        return False
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def _is_clean_text(data: bytes) -> bool:
    """严格判定：整段是"干净文本"——合法 UTF-8，且除 \\t \\n \\r 外无任何控制字符。

    只用于 `try_parse_nested` 的**否决**：干净的文本不该被硬拆成 message。
    二进制 protobuf 里几乎必然出现 < 0x20 的控制字节（长度前缀、tag 低字节），
    所以这条否决不会挡住正常的嵌套 message。
    """
    if not data:
        return False
    for byte in data:
        if byte < 0x20 and byte not in (0x09, 0x0A, 0x0D):
            return False
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def try_parse_nested(data: bytes):
    """能完整递归解析时返回字段列表，否则 None。

    判定顺序（与 `protoc --decode_raw` 的行为一致）：
      1. 必须把整段字节**恰好**解析完（decode_message 抛错即失败，不许剩尾巴）
      2. 至少解出 1 个字段
      3. 唯一否决项：整段是"干净文本" → 判为 string，不拆 message
         （例：`Periodical` 恰好能被 decode_message 吃掉，但它是文本）
    """
    if not data:
        return None
    if _is_clean_text(data):
        return None
    try:
        fields = decode_message(data, 0, len(data))
    except PbError:
        return None
    if not fields:
        return None
    return fields


def normalize(fields, depth: int = 0, max_depth: int = 12):
    """把 (field_no, wire, value) 列表转成可 JSON 化的 dict/list。"""
    out = {}
    for field_no, wire, value in fields:
        if wire == WIRE_LEN and isinstance(value, (bytes, bytearray)):
            raw = bytes(value)
            nested = try_parse_nested(raw) if depth < max_depth else None
            if nested is not None:
                item = normalize(nested, depth + 1, max_depth)
            elif looks_like_text(raw):
                item = raw.decode("utf-8")
            else:
                item = {"$bytes": binascii.hexlify(raw).decode("ascii")}
        elif wire in (WIRE_SGROUP, WIRE_EGROUP):
            item = {"$group": WIRE_NAMES[wire]}
        else:
            item = value
        out.setdefault(str(field_no), []).append(item)
    for key in out:
        if len(out[key]) == 1:
            out[key] = out[key][0]
    return out


def infer_typedef(fields, depth: int = 0, max_depth: int = 12):
    """blackboxprotobuf 风格的推测类型表：{'1': {'type': 'int'}, ...}。"""
    typedef = {}
    for field_no, wire, value in fields:
        entry = {"type": "unknown"}
        if wire == WIRE_VARINT:
            entry["type"] = "int"
        elif wire in (WIRE_I64, WIRE_I32):
            entry["type"] = "fixed"
        elif wire == WIRE_LEN and isinstance(value, (bytes, bytearray)):
            raw = bytes(value)
            nested = try_parse_nested(raw) if depth < max_depth else None
            if nested is not None:
                entry["type"] = "message"
                entry["message_typedef"] = infer_typedef(nested, depth + 1, max_depth)
            elif looks_like_text(raw):
                entry["type"] = "str"
            else:
                entry["type"] = "bytes"
        typedef[str(field_no)] = entry
    return typedef


def count_occurrences(fields):
    """统计每个字段号出现次数，用于判定 repeated（同号出现 >1 次即为 repeated 的强证据）。"""
    counter = {}
    for field_no, _wire, _value in fields:
        counter[field_no] = counter.get(field_no, 0) + 1
    return {str(k): v for k, v in sorted(counter.items())}


def dump_raw(fields):
    """按**原始出现顺序**输出字段列表，携带足够信息做逐字节重编码。

    这是 round-trip oracle 的输入格式（见 pb_reencode.py）。关键点：
      * 顺序必须保留 —— protobuf 允许任意字段顺序，重组字典会丢失顺序，
        重编码时就无法做到逐字节一致，也就失去了"解码无损"的证明力
      * length-delimited 一律带 `payload_hex`（原始字节），
        不做嵌套结构化 —— 重编码要的是原字节，不是被解释后的结构
    """
    out = []
    for field_no, wire, value in fields:
        item = {"field": field_no, "wire": wire}
        if wire in (WIRE_SGROUP, WIRE_EGROUP):
            item["payload_hex"] = ""
        elif wire == WIRE_LEN:
            item["payload_hex"] = binascii.hexlify(bytes(value)).decode("ascii")
            item["length"] = len(value)
        else:
            item["value"] = value
        out.append(item)
    return out


def encode_tag(field_no: int, wire: int) -> bytes:
    return encode_varint((field_no << 3) | wire)


def encode_varint(value: int) -> bytes:
    if value < 0:
        value &= (1 << 64) - 1
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return bytes(out)


def reencode(raw_fields) -> bytes:
    """把 dump_raw 的输出重编码回字节流。"""
    out = bytearray()
    for item in raw_fields:
        field_no = int(item["field"])
        wire = int(item["wire"])
        out += encode_tag(field_no, wire)
        if wire == WIRE_LEN:
            payload = binascii.unhexlify(item["payload_hex"])
            out += encode_varint(len(payload))
            out += payload
        elif wire == WIRE_I64:
            out += int(item["value"]).to_bytes(8, "little")
        elif wire == WIRE_I32:
            out += int(item["value"]).to_bytes(4, "little")
        elif wire == WIRE_VARINT:
            out += encode_varint(int(item["value"]))
        elif wire in (WIRE_SGROUP, WIRE_EGROUP):
            pass
        else:
            raise PbError("无法重编码的 wire type %d" % wire)
    return bytes(out)


# ---------------------------------------------------------------- 帧剥离

def decode_b64_tolerant(text) -> tuple:
    """宽容 base64 解码：返回 (bytes, 说明)。

    真实语料里的 base64 经常不"干净"：抓包工具导出带换行、JSON 里带 `\\/` 转义、
    URL-safe 变体用 `-_`、结尾被截断而缺 `=` 填充。严格模式会全部拒绝，
    所以这里**先严格、再宽容**，并把走了哪条路写进说明，避免"静默接受垃圾"。

    宽容模式做的三件事（都是可逆的、不改变字节语义的规范化）：
      1. 去掉所有空白与反斜杠
      2. `-` → `+`，`_` → `/`（URL-safe 字母表）
      3. 按需补 `=` 到 4 的倍数
    """
    if isinstance(text, (bytes, bytearray)):
        text = bytes(text).decode("ascii", "ignore")
    raw = text.strip()
    try:
        return base64.b64decode(raw, validate=True), "base64 解码（严格）"
    except (binascii.Error, ValueError):
        pass
    cleaned = "".join(ch for ch in raw if not ch.isspace() and ch != "\\")
    cleaned = cleaned.replace("-", "+").replace("_", "/")
    pad = (-len(cleaned)) % 4
    try:
        data = base64.b64decode(cleaned + "=" * pad, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise PbError("base64 解码失败（严格与宽容均失败）: %s" % exc)
    return data, "base64 解码（宽容：去空白/反斜杠、URL-safe 映射、补 %d 个填充）" % pad


def strip_frame(data: bytes, frame: str) -> tuple:
    """返回 (载荷, 说明)。frame: none|grpc-web|len4be|len4le|len2be|base64|auto。"""
    if frame == "none":
        return data, "未做帧剥离"
    if frame == "base64":
        return decode_b64_tolerant(data)
    if frame == "grpc-web":
        if len(data) < 5:
            raise PbError("gRPC-Web 帧至少 5 字节，实际 %d" % len(data))
        flag = data[0]
        length = int.from_bytes(data[1:5], "big")
        if flag != 0:
            raise PbError("gRPC-Web 第 0 字节应为 0（未压缩），实际 %d" % flag)
        if 5 + length > len(data):
            raise PbError("gRPC-Web 声明长度 %d，实际可用 %d" % (length, len(data) - 5))
        return data[5 : 5 + length], "gRPC-Web 帧: flag=%d, len=%d(大端)" % (flag, length)
    if frame in ("len4be", "len4le", "len2be"):
        width = 4 if frame.startswith("len4") else 2
        order = "little" if frame.endswith("le") else "big"
        if len(data) < width:
            raise PbError("长度前缀 %d 字节，数据不足" % width)
        length = int.from_bytes(data[:width], order)
        if width + length > len(data):
            raise PbError("长度前缀声明 %d，实际可用 %d" % (length, len(data) - width))
        return data[width : width + length], "长度前缀 %d 字节(%s)=%d" % (width, order, length)
    if frame == "auto":
        candidates = []
        try:
            payload, note = strip_frame(data, "grpc-web")
            candidates.append((payload, "auto→" + note))
        except PbError:
            pass
        for name in ("len4be", "len4le", "len2be"):
            try:
                payload, note = strip_frame(data, name)
                candidates.append((payload, "auto→" + note))
            except PbError:
                pass
        candidates.append((data, "auto→原样（未识别到已知帧头）"))
        for payload, note in candidates:
            if payload and try_parse_nested(payload) is not None:
                return payload, note
        return candidates[-1]
    raise PbError("未知 --frame 取值: %s" % frame)


# ---------------------------------------------------------------- 自检

def _selftest() -> int:
    failures = []
    total = [0]

    def check(name, cond, extra=""):
        total[0] += 1
        if not cond:
            failures.append("%s %s" % (name, extra))

    # 1) varint 边界：0 / 127 / 128 / 300 / 2**64-1
    for value in (0, 127, 128, 300, 16384, 2**64 - 1):
        enc = b""
        v = value
        while True:
            b = v & 0x7F
            v >>= 7
            if v:
                enc += bytes([b | 0x80])
            else:
                enc += bytes([b])
                break
        got, pos = read_varint(enc, 0, len(enc))
        check("varint-roundtrip", got == value and pos == len(enc), "%r -> %r" % (value, got))

    # 2) 越界 varint 必须报错
    try:
        read_varint(b"\x80\x80", 0, 2)
        check("varint-truncated", False, "未报错")
    except PbError:
        check("varint-truncated", True)

    # 3) 超过 10 字节的 varint 必须报错
    try:
        read_varint(b"\x80" * 11 + b"\x01", 0, 12)
        check("varint-overlong", False, "未报错")
    except PbError:
        check("varint-overlong", True)

    # 4) 经典样例：{"resourcetype":"Periodical","id":"wlxb202301001"}
    body = b"\x0a\x0aPeriodical\x12\x0dwlxb202301001"
    fields = decode_message(body, 0, len(body))
    check(
        "sample-fields",
        fields == [(1, WIRE_LEN, b"Periodical"), (2, WIRE_LEN, b"wlxb202301001")],
        repr(fields),
    )
    obj = normalize(fields)
    check("sample-text", obj.get("1") == "Periodical" and obj.get("2") == "wlxb202301001", repr(obj))
    check("sample-typedef", infer_typedef(fields)["1"]["type"] == "str", repr(infer_typedef(fields)))

    # 5) repeated 判定：同号出现三次
    rep = b"\x08\x01\x08\x02\x08\x03"
    fields = decode_message(rep, 0, len(rep))
    check("repeated-count", count_occurrences(fields) == {"1": 3}, repr(count_occurrences(fields)))
    check("repeated-values", normalize(fields)["1"] == [1, 2, 3], repr(normalize(fields)))

    # 6) 嵌套 message：字段 4 是 length-delimited，里面又是合法 message
    inner = b"\x08\x8a\x01\x10\x08"  # {1: 138, 2: 8}
    outer = b"\x08\x03" + b"\x22" + bytes([len(inner)]) + inner
    fields = decode_message(outer, 0, len(outer))
    obj = normalize(fields)
    check("nested-msg", obj.get("4") == {"1": 138, "2": 8}, repr(obj))

    # 7) 纯文本载荷绝不能被误判成嵌套 message
    check("text-not-nested", try_parse_nested(b"Periodical") is None, "被误判为嵌套")
    check("text-not-nested2", try_parse_nested(b"wlxb202301001") is None, "被误判为嵌套")

    # 8) fixed64 / fixed32
    f64 = b"\x09" + (1).to_bytes(8, "little")
    fields = decode_message(f64, 0, len(f64))
    check("fixed64", fields == [(1, WIRE_I64, 1)], repr(fields))
    f32 = b"\x0d" + (7).to_bytes(4, "little")
    fields = decode_message(f32, 0, len(f32))
    check("fixed32", fields == [(1, WIRE_I32, 7)], repr(fields))

    # 9) 字段号 0 必须报错
    try:
        decode_message(b"\x00\x01", 0, 2)
        check("field-zero", False, "未报错")
    except PbError:
        check("field-zero", True)

    # 10) length 越界必须报错
    try:
        decode_message(b"\x0a\x50abc", 0, 5)
        check("len-overflow", False, "未报错")
    except PbError:
        check("len-overflow", True)

    # 11) gRPC-Web 帧：00 00 00 00 1b + body
    framed = b"\x00\x00\x00\x00\x1b" + body
    payload, note = strip_frame(framed, "grpc-web")
    check("grpc-web", payload == body and "gRPC-Web" in note, "%r / %s" % (payload, note))

    # 12) gRPC-Web 长度不符必须报错（防止把 TCP 头当帧头静默吞掉）
    try:
        strip_frame(b"\x00\x00\x00\x00\xff" + body, "grpc-web")
        check("grpc-web-len", False, "未报错")
    except PbError:
        check("grpc-web-len", True)

    # 13) 去除非 protobuf 帧头后应能解析；不去帧头则解析失败
    check("framed-parses", try_parse_nested(payload) is not None)
    check("framed-raw-fails", try_parse_nested(framed) is None, "10 字节帧头被误当字段")

    # 14) base64 整段（严格路径）
    enc = base64.b64encode(body).decode()
    payload, _ = strip_frame(enc.encode(), "base64")
    check("base64-frame", payload == body, repr(payload))

    # 14b) base64 宽容路径：URL-safe + 换行 + 缺填充，必须与严格路径结果一致
    url_safe = base64.urlsafe_b64encode(body).decode().rstrip("=")
    noisy = url_safe[:6] + "\n" + url_safe[6:] + "\n"
    payload, note = strip_frame(noisy.encode(), "base64")
    check("base64-tolerant", payload == body, "%r / %s" % (payload, note))
    try:
        strip_frame(b"!!!not base64!!!", "base64")
        check("base64-garbage", False, "垃圾输入未报错")
    except PbError:
        check("base64-garbage", True)

    # 15) --frame auto 能识别 gRPC-Web
    payload, note = strip_frame(framed, "auto")
    check("auto-grpcweb", payload == body and "gRPC-Web" in note, note)

    # 16) 非法输入下 normalize/decode 不产生"半成品成功"
    try:
        decode_message(b"\x0a\xff\xff\xff\xff\x0f", 0, 6)
        check("bad-input", False, "未报错")
    except PbError:
        check("bad-input", True)

    # 17) 嵌套深度上限：构造 20 层，超过 max_depth 时应退化为 bytes 而不是无限递归
    deep = b"\x08\x01"
    for _ in range(20):
        deep = b"\x0a" + bytes([len(deep)]) + deep if len(deep) < 128 else b"\x0a\x80\x01" + deep
    obj = normalize(decode_message(deep, 0, len(deep)))
    check("depth-guard", isinstance(obj, dict), "深度保护失效")

    # 18) round-trip：任意合法字节流都必须能"解码 → 重编码"逐字节还原。
    #     这是本技能的核心 oracle —— 只有它通过，"解码无损"才算被证明，
    #     否则 normalize() 丢掉的顺序信息会让人以为解析成功而实际有损。
    samples = [
        body,
        rep,
        outer,
        f64,
        f32,
        b"\x0a\x00",                                    # 空 length-delimited
        b"\x0a\x03\xff\xff\xff",                        # 非 UTF-8 的 bytes
        b"\x08\xff\xff\xff\xff\xff\xff\xff\xff\xff\x01",  # 10 字节 varint（最大值）
        b"\x0a" + bytes([len(inner)]) + inner + rep,    # 嵌套 + repeated 混合
        b"\x1d" + bytes(range(4)) + b"\x11" + bytes(range(8)),  # fixed32 + fixed64
    ]
    for idx, sample in enumerate(samples):
        try:
            parsed = decode_message(sample, 0, len(sample))
            rebuilt = reencode(dump_raw(parsed))
        except PbError as exc:
            check("roundtrip-%d" % idx, False, "异常 %s" % exc)
            continue
        check("roundtrip-%d" % idx, rebuilt == sample, "原始 %s vs 重建 %s" % (
            binascii.hexlify(sample).decode(), binascii.hexlify(rebuilt).decode()))

    # 18a) CLI 侧非法输入必须归一成 PbError（不能裸抛 binascii.Error，
    #      否则用户看到的是栈回溯而不是可读错误 + 退出码 1）
    for bad in ({"b64": "!!!not base64!!!"}, {"hex": "zz"}):
        try:
            load_bytes(argparse.Namespace(input=None, b64=bad.get("b64"), hex=bad.get("hex"), stdin=False))
            check("cli-bad-input-%s" % list(bad)[0], False, "未报错")
        except PbError:
            check("cli-bad-input-%s" % list(bad)[0], True)
        except Exception as exc:  # noqa: BLE001 - 就是要抓裸异常
            check("cli-bad-input-%s" % list(bad)[0], False, "裸异常 %r" % exc)

    # 18a2) 空文件：默认只是警告（exit 0），加 --strict 必须失败（防止把空文件当成功）
    import tempfile

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        empty_path = tmp.name
    try:
        rc_plain = main(["--input", empty_path])
        rc_strict = main(["--input", empty_path, "--strict"])
    finally:
        import os as _os

        _os.unlink(empty_path)
    check("empty-input-warns", rc_plain == 0, "默认应 exit 0（只警告），实际 %r" % (rc_plain,))
    check("empty-input-strict-fails", rc_strict == 1, "实际 rc=%r" % (rc_strict,))

    # 18b) dump_raw 必须**保留字段顺序**（重排会静默破坏 round-trip）
    ordered = b"\x10\x02\x08\x01"  # 先字段 2 再字段 1
    parsed = decode_message(ordered, 0, len(ordered))
    check("order-preserved", [f["field"] for f in dump_raw(parsed)] == [2, 1],
          repr([f["field"] for f in dump_raw(parsed)]))
    check("order-roundtrip", reencode(dump_raw(parsed)) == ordered)

    if failures:
        print("SELFTEST FAIL (%d/%d)" % (len(failures), total[0]))
        for item in failures:
            print("  -", item)
        return 1
    print("SELFTEST PASS (%d/%d)" % (total[0], total[0]))
    return 0


# ---------------------------------------------------------------- CLI

def build_parser():
    p = argparse.ArgumentParser(
        description="零依赖 protobuf wire-format 解析器（protoc --decode_raw 的离线替代）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    src = p.add_mutually_exclusive_group()
    src.add_argument("--input", "-i", help="二进制文件路径")
    src.add_argument("--b64", help="直接传 base64 字符串")
    src.add_argument("--hex", help="直接传十六进制字符串")
    src.add_argument("--stdin", action="store_true", help="从标准输入读原始字节")
    src.add_argument("--selftest", action="store_true", help="跑内置自检并退出")
    p.add_argument(
        "--frame",
        default="auto",
        choices=["auto", "none", "grpc-web", "len4be", "len4le", "len2be", "base64"],
        help="帧剥离方式；默认 auto（依次尝试 gRPC-Web / 长度前缀，都不通则原样）",
    )
    p.add_argument("--typedef", action="store_true", help="额外输出推测类型表")
    p.add_argument("--raw", action="store_true", help="额外输出按原始顺序的字段列表（round-trip 输入）")
    p.add_argument(
        "--roundtrip",
        action="store_true",
        help="解码后重编码，与原始字节逐字节比对；不一致则退出码 1（核心 oracle）",
    )
    p.add_argument(
        "--strict",
        action="store_true",
        help="解出 0 个字段时视为失败（退出码 1）。用于脚本/CI：避免把空文件当成解析成功",
    )
    p.add_argument("--pretty", action="store_true", help="缩进输出")
    p.add_argument("--max-depth", type=int, default=12, help="嵌套递归上限，默认 12")
    return p


def load_bytes(args) -> bytes:
    if args.input:
        with open(args.input, "rb") as fh:
            return fh.read()
    if args.b64:
        # 与 --frame base64 用同一条宽容路径：URL-safe / 换行 / 缺填充都能吃，
        # 失败时统一抛 PbError（而不是裸的 binascii.Error），由 main 归一成退出码 1。
        return decode_b64_tolerant(args.b64)[0]
    if args.hex:
        try:
            return binascii.unhexlify("".join(args.hex.split()))
        except (binascii.Error, ValueError) as exc:
            raise PbError("--hex 不是合法十六进制: %s" % exc)
    if args.stdin:
        return sys.stdin.buffer.read()
    raise PbError("必须给出 --input / --b64 / --hex / --stdin / --selftest 之一")


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    if args.selftest:
        return _selftest()
    try:
        data = load_bytes(args)
        payload, frame_note = strip_frame(data, args.frame)
        fields = decode_message(payload, 0, len(payload))
    except PbError as exc:
        print("PARSE FAIL: %s" % exc, file=sys.stderr)
        return 1
    except OSError as exc:
        print("IO FAIL: %s" % exc, file=sys.stderr)
        return 2

    result = {
        "frame": frame_note,
        "bytes_in": len(data),
        "bytes_decoded": len(payload),
        "field_occurrences": count_occurrences(fields),
        "message": normalize(fields, max_depth=args.max_depth),
    }
    if args.typedef:
        result["typedef"] = infer_typedef(fields, max_depth=args.max_depth)
    if args.raw:
        result["raw"] = dump_raw(fields)

    rc = 0
    rt_failed = False
    if not fields:
        # 空字节序列在协议上确实是"合法空 message"，所以不能一律判错；
        # 但用户十有八九是传错了文件（空文件/截断/忘了剥帧），
        # 静默返回 {"message": {}} 会让人误以为解析成功 —— 必须提示。
        print(
            "WARN: 解出 0 个字段（空字节序列在协议上是合法空 message，但更可能是输入有误："
            "空文件 / 被截断 / 帧头没剥干净）。加 --strict 可让这种情况直接失败。",
            file=sys.stderr,
        )
        if args.strict:
            rc = 1
    if args.roundtrip:
        try:
            rebuilt = reencode(dump_raw(fields))
        except PbError as exc:
            result["roundtrip"] = {"ok": False, "error": str(exc)}
            rc = 1
            rt_failed = True
        else:
            ok = rebuilt == payload
            result["roundtrip"] = {
                "ok": ok,
                "bytes_rebuilt": len(rebuilt),
                "first_diff": None
                if ok
                else next((i for i in range(min(len(rebuilt), len(payload))) if rebuilt[i] != payload[i]), min(len(rebuilt), len(payload))),
            }
            if not ok:
                rc = 1
                rt_failed = True

    json.dump(result, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None)
    sys.stdout.write("\n")
    # 只在这里报 round-trip 失败 —— 不能用 `if rc:` 代替，否则 --strict 判 0 字段失败时
    # 会被误报成"重编码不一致"（错怪解码器）。
    if rt_failed:
        print("ROUNDTRIP FAIL: 重编码与原始字节不一致，解码结果不可信", file=sys.stderr)
    return rc


if __name__ == "__main__":
    sys.exit(main())
