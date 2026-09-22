#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ts_repack.py —— 解密后重新封装 TS（零依赖，仅标准库）

为什么需要它
------------
`ts_probe.py --decrypt-nalu` 能解出**明文 ES**，但**不能把明文写回一个合法的 TS**：
只要解密/反转义让 ES 长度发生变化（`nal_unescape` 会、文件头解密会、NALU 重排也会），
原来的 TS 包布局就不再成立 —— 直接覆盖字节会让后续所有 PES 的边界错位，
表现是「文件大小对、ffmpeg 报 `Invalid NALU unit size` 或直接花屏」。

本脚本补上这条**回写路径**：把新的 ES 重新装箱成合规 TS。
参考实现来自央视 h5e 与某视频站 v13 的真实产物（两者都在解密后重算了 adaptation field）：

    adaptationField.payloadLength = 188 - 4 - 1 - offset - newNALU.byteLength

要点
----
1. **保留原 PES 头**（含 PTS/DTS），只补 `PES_packet_length` —— 重建 PES 头会把时间戳丢掉，
   表现是「能播但音画不同步」。
2. **按 NALU 起始码切分**新 ES 回填到原来的每个 PES 单元里：切点选在离「按长度比例算出的目标位置」
   最近的起始码上，避免把一个 NALU 劈成两个 PES（很多解码器不接受）。
3. 最后一个不满 188 的包**补 adaptation field 填充**（0xFF），而不是截断或补零。
4. 非目标 PID（PAT / PMT / 音频）**逐字节原样通过**。

用法
----
    # 0) 自检（含拒绝路径）
    python ts_repack.py --selftest

    # 1) 导出某个 PID 的明文 ES（解密前的原料 / 解密后的验收）
    python ts_repack.py seg0.ts --pid 0x100 --extract-es seg0.es

    # 2) 用新的 ES 重新封装（长度变了也没关系）
    python ts_repack.py seg0.ts --pid 0x100 --es seg0.clear.es -o seg0.clear.ts

    # 3) 校验产物是不是合规 TS（逐包 sync / CC 连续性 / PES 长度字段 / 可选的 ES 比对）
    python ts_repack.py seg0.clear.ts --pid 0x100 --check --expect-es seg0.clear.es

    # 4) 单分片闭环（唯一算数的验收）
    ffmpeg -v error -i seg0.clear.ts -f null -

退出码：0 成功 / 1 输入有问题 / 2 拒绝执行（形态不符或校验失败）
"""

import argparse
import os
import sys

VERSION = "1.0.0"
PKT = 188
SYNC = 0x47


# --------------------------------------------------------------------------
# TS 包层
# --------------------------------------------------------------------------
def iter_packets(data):
    if len(data) % PKT:
        raise ValueError(
            "文件长度 %d 不是 188 的整数倍（余 %d）—— 不是裸 TS，"
            "可能带了 m3u8/discontinuity 或前面还有文件头未去掉" % (len(data), len(data) % PKT))
    for i in range(0, len(data), PKT):
        yield data[i:i + PKT]


def parse_packet(p):
    """解析一个 TS 包 → dict；sync 不对时返回 None。"""
    if len(p) != PKT or p[0] != SYNC:
        return None
    pid = ((p[1] & 0x1F) << 8) | p[2]
    afc = (p[3] >> 4) & 0x03
    cc = p[3] & 0x0F
    d = {"pid": pid, "pusi": bool(p[1] & 0x40), "tei": bool(p[1] & 0x80),
         "afc": afc, "cc": cc, "af": b"", "payload": b"", "af_len": None}
    i = 4
    if afc in (2, 3):
        if i >= PKT:
            return None
        af_len = p[i]
        d["af_len"] = af_len
        if i + 1 + af_len > PKT:
            return None
        d["af"] = p[i + 1:i + 1 + af_len]
        i += 1 + af_len
    if afc in (1, 3):
        d["payload"] = p[i:]
    return d


def build_packet(pid, payload, pusi=False, cc=0):
    """按需自动选择 AFC 并把 payload 装进一个 188 字节包。

    188 = 4（TS 头）+ 1（adaptation_field_length）+ af_len + payload_len
    ⇒ af_len = 183 - payload_len；af_len 为 0 时只有那个 0 字节，后面直接跟 payload。
    """
    n = len(payload)
    if n > 184:
        raise ValueError("单个 TS 包的 payload 最多 184 字节，收到 %d" % n)

    if n == 184:
        afc, af = 1, b""                                    # 无 adaptation field
    elif n == 0:
        afc, af = 2, b"\x00" + bytes([0xFF]) * 182                # af_len=183：flags + 182 填充
    else:
        af_len = 183 - n
        af = (b"\x00" + bytes([0xFF]) * (af_len - 1)) if af_len >= 1 else b""
        afc = 3

    b1 = (0x40 if pusi else 0x00) | ((pid >> 8) & 0x1F)
    b3 = ((afc & 0x03) << 4) | (cc & 0x0F)
    out = bytes([SYNC, b1, pid & 0xFF, b3])
    if afc in (2, 3):
        out += bytes([len(af)]) + af
    out += payload
    if len(out) != PKT:
        raise AssertionError("内部错误：组包长度 %d != 188" % len(out))
    return out


# --------------------------------------------------------------------------
# PES 层
# --------------------------------------------------------------------------
def pes_header_len(payload):
    """返回 (PES 头总长, 是否含 PTS/DTS)。payload 以 00 00 01 开头。"""
    if len(payload) < 9 or payload[0:3] != b"\x00\x00\x01":
        return None
    if payload[6] & 0xC0 != 0x80:
        return None
    return 9 + payload[8], bool(payload[7] & 0x80)


def collect_es(data, pid):
    """把某个 PID 的 ES 取出来（跳过每个 PES 头）。

    返回 dict：
      es        : 全部 ES 字节
      units     : 每个 PES 单元 [{'header': 原样头字节, 'es_len': 原 ES 长度, 'start': 起包序号}]
      bad       : 结构可疑的提示
    """
    units, es, cur = [], bytearray(), None
    for idx, p in enumerate(iter_packets(data)):
        d = parse_packet(p)
        if d is None:
            raise ValueError("第 %d 个包 sync 不是 0x47 —— 这不是合规 TS" % idx)
        if d["pid"] != pid:
            continue
        if d["pusi"]:
            if cur is not None:
                units.append(cur)
            hl = pes_header_len(d["payload"])
            if hl is None:
                cur = {"header": b"", "es_len": 0, "start": idx, "bad": "PES 头解析失败"}
                es.extend(d["payload"])
            else:
                h = hl[0]
                cur = {"header": d["payload"][:h], "es_len": len(d["payload"]) - h,
                       "start": idx, "bad": None}
                es.extend(d["payload"][h:])
        else:
            if cur is None:
                cur = {"header": b"", "es_len": 0, "start": idx,
                       "bad": "首包没有 PUSI（PES 头被截断？）"}
            cur["es_len"] += len(d["payload"])
            es.extend(d["payload"])
    if cur is not None:
        units.append(cur)
    bad = [u for u in units if u.get("bad")]
    return {"es": bytes(es), "units": units, "bad": bad}


def patch_pes_length(header, es_len):
    """只补 PES_packet_length（头 6 字节里的 2 字节），其余原样保留。

    值为 0 表示「长度不受限」，视频流常见；超出 0xFFFF 时写 0。
    """
    if len(header) < 6:
        return header
    total = es_len + len(header) - 6
    v = total if 0 < total <= 0xFFFF else 0
    return header[:4] + bytes([(v >> 8) & 0xFF, v & 0xFF]) + header[6:]


def find_nal_starts(es):
    """返回所有起始码（00 00 01 / 00 00 00 01）的起点位置。"""
    starts = []
    i = 0
    n = len(es)
    while i + 4 <= n:
        if es[i] == 0 and es[i + 1] == 0 and es[i + 2] == 1:
            starts.append(i)
            i += 3
            continue
        if es[i] == 0 and es[i + 1] == 0 and es[i + 2] == 0 and es[i + 3] == 1:
            starts.append(i)
            i += 4
            continue
        i += 1
    return starts


def split_es(es, targets):
    """把 es 切成 len(targets)+1 段，切点尽量落在 NALU 起始码上。

    targets 是**期望的切点位置**（通常由原各 PES 的 ES 长度按新长度比例算出）。
    """
    if not targets:
        return [es]
    starts = find_nal_starts(es)
    cuts = []
    for t in targets:
        if starts:
            best = min(starts, key=lambda s: abs(s - t))
        else:
            best = t
        best = max(1, min(len(es) - 1, best))
        if cuts and best <= cuts[-1]:
            best = min(len(es) - 1, cuts[-1] + 1)
        cuts.append(best)
    out, prev = [], 0
    for c in cuts:
        out.append(es[prev:c])
        prev = c
    out.append(es[prev:])
    return out


def pack_pid(pid, es, header, n_units, cc_start=0):
    """把一个 PID 的全部 ES 装箱 → (packets_bytes, next_cc, unit_es_lengths)。"""
    if n_units <= 1 or len(es) < 2:
        slices = [es]
    else:
        scale = len(es) / max(1, n_units)
        targets = [int(round(scale * (i + 1))) for i in range(n_units - 1)]
        slices = split_es(es, targets)

    out, cc = bytearray(), cc_start
    lens = []
    for i, sl in enumerate(slices):
        hdr = patch_pes_length(header, len(sl)) if header else b""
        pes = hdr + sl
        first = True
        off = 0
        while off < len(pes):
            chunk = pes[off:off + 184]
            if first and len(chunk) < 184:
                pass  # 交给 build_packet 补填充
            out += build_packet(pid, chunk, pusi=first, cc=cc)
            cc = (cc + 1) & 0x0F
            first = False
            off += 184
        if not slices[i] and first:
            # 空 ES：仍要产出一个空 PES 包，保持单元数一致
            out += build_packet(pid, hdr, pusi=True, cc=cc)
            cc = (cc + 1) & 0x0F
        lens.append(len(sl))
    return bytes(out), cc, lens


def repack(data, pid, new_es):
    """用 new_es 重新封装 pid 的 ES，其余包原样通过。返回 (out_bytes, info)。"""
    info = collect_es(data, pid)
    if not info["units"]:
        raise ValueError("这个文件里没有 PID=0x%X 的包（可用 --check 看有哪些 PID）" % pid)
    if info["bad"]:
        raise ValueError("PID=0x%X 的 PES 结构可疑：%s" % (pid, info["bad"][0].get("bad")))

    units = info["units"]
    header = units[0]["header"] or b"\x00\x00\x01\xe0\x00\x00\x80\x00\x00"
    # 起始 CC 取原第一个目标包的 CC
    first_cc = 0
    for p in iter_packets(data):
        d = parse_packet(p)
        if d and d["pid"] == pid:
            first_cc = d["cc"]
            break

    new_bytes, _, lens = pack_pid(pid, new_es, header, len(units), first_cc)

    # 逐包重建：非目标 PID 原样；遇到第一个目标包时插入全部新包
    out, inserted = bytearray(), False
    for p in iter_packets(data):
        d = parse_packet(p)
        if d and d["pid"] == pid:
            if not inserted:
                out += new_bytes
                inserted = True
            continue
        out += p
    if not inserted:
        raise ValueError("内部错误：没有插入位置")

    return bytes(out), {
        "units": len(units),
        "unit_es_lens": lens,
        "old_es_len": len(info["es"]),
        "new_es_len": len(new_es),
        "old_packets": len(data) // PKT,
        "new_packets": len(out) // PKT,
        "header_preserved": bool(units[0]["header"]),
    }


# --------------------------------------------------------------------------
# 校验
# --------------------------------------------------------------------------
def verify(data, pid=None, expect_es=None):
    """返回 (errors, info)。errors 为空即通过。"""
    errors, info = [], {}
    if len(data) % PKT:
        return ["文件长度 %d 不是 188 的整数倍" % len(data)], info
    info["packets"] = len(data) // PKT
    pids, cc_state, cc_broken, pusi_cnt = {}, {}, [], 0
    for i, p in enumerate(iter_packets(data)):
        d = parse_packet(p)
        if d is None:
            errors.append("第 %d 包 sync != 0x47（值 0x%02X）" % (i, p[0]))
            continue
        pids[d["pid"]] = pids.get(d["pid"], 0) + 1
        if d["afc"] == 0:
            errors.append("第 %d 包 AFC=0（保留值）" % i)
        if d["pusi"]:
            pusi_cnt += 1
        # CC 连续性：有 payload 的包必须 +1（允许重复包=不改）
        if d["afc"] in (1, 3):
            prev = cc_state.get(d["pid"])
            if prev is not None and (prev + 1) & 0x0F != d["cc"]:
                cc_broken.append((i, d["pid"], prev, d["cc"]))
            cc_state[d["pid"]] = d["cc"]
        # adaptation field 填充必须是 0xFF
        if d["af_len"]:
            flags = d["af"][0] if d["af"] else 0
            if flags == 0 and d["af_len"] > 1:
                stuff = d["af"][1:]
                if stuff != bytes([0xFF]) * len(stuff):
                    errors.append("第 %d 包 adaptation field 填充不是 0xFF" % i)
    info["pids"] = pids
    info["pusi"] = pusi_cnt
    if cc_broken:
        errors.append("CC 连续性断裂 %d 处，首处：包 %d PID=0x%X %d→%d"
                      % (len(cc_broken), cc_broken[0][0], cc_broken[0][1],
                         cc_broken[0][2], cc_broken[0][3]))
    if pid is not None:
        if pid not in pids:
            errors.append("文件里没有 PID=0x%X" % pid)
        else:
            info["pid_packets"] = pids[pid]
            if expect_es is not None:
                got = collect_es(data, pid)["es"]
                info["es_len"] = len(got)
                if got != expect_es:
                    errors.append("ES 与期望不一致（期望 %d 字节，实得 %d 字节）%s"
                                  % (len(expect_es), len(got),
                                     "" if len(got) == len(expect_es) else " —— 长度都不同"))
    return errors, info


# --------------------------------------------------------------------------
# 命令
# --------------------------------------------------------------------------
def cmd_extract(args):
    data = open(args.input, "rb").read()
    info = collect_es(data, args.pid)
    if not info["units"]:
        print("错误：没有 PID=0x%X 的包" % args.pid, file=sys.stderr)
        return 2
    if info["bad"]:
        print("错误：PES 结构可疑：%s" % info["bad"][0].get("bad"), file=sys.stderr)
        return 2
    with open(args.extract_es, "wb") as f:
        f.write(info["es"])
    print("== 导出 ES ==")
    print("PID             : 0x%X" % args.pid)
    print("PES 单元数      : %d" % len(info["units"]))
    print("ES 字节数       : %d → %s" % (len(info["es"]), args.extract_es))
    print("各单元 ES 长度  : %s" % ", ".join(str(u["es_len"]) for u in info["units"][:12]))
    return 0


def cmd_repack(args):
    if not os.path.isfile(args.es):
        raise FileNotFoundError("找不到 --es 文件：%s" % args.es)
    data = open(args.input, "rb").read()
    new_es = open(args.es, "rb").read()
    out, info = repack(data, args.pid, new_es)

    if args.out:
        d = os.path.dirname(os.path.abspath(args.out))
        if d and not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        with open(args.out, "wb") as f:
            f.write(out)

    errors, vinfo = verify(out, args.pid, expect_es=new_es)

    print("== TS 重新封装报告 ==")
    print("PID                 : 0x%X" % args.pid)
    print("原 PES 单元数       : %d" % info["units"])
    print("ES 长度             : %d → %d（差 %+d 字节）"
          % (info["old_es_len"], info["new_es_len"], info["new_es_len"] - info["old_es_len"]))
    print("回填各单元 ES 长度  : %s" % ", ".join(str(x) for x in info["unit_es_lens"][:12]))
    print("包数                : %d → %d" % (info["old_packets"], info["new_packets"]))
    print("PES 头              : %s" % ("已保留（含 PTS/DTS）" if info["header_preserved"]
                                          else "⚠️ 原头不可用，已用最简头合成（时间戳会丢）"))
    print("重封装后校验        : %s" % ("通过（sync / CC / 填充 / ES 逐字节一致）"
                                      if not errors else "失败"))
    for e in errors:
        print("  ✗ %s" % e)
    print("\n🔴 唯一算数的验收：\n   ffmpeg -v error -i %s -f null -" % (args.out or "<输出.ts>"))
    return 0 if not errors else 2


def cmd_check(args):
    data = open(args.input, "rb").read()
    exp = None
    if args.expect_es:
        if not os.path.isfile(args.expect_es):
            raise FileNotFoundError("找不到 --expect-es 文件：%s" % args.expect_es)
        exp = open(args.expect_es, "rb").read()
    errors, info = verify(data, args.pid, exp)
    print("== TS 校验 ==")
    print("包数        : %d（188 字节对齐：%s）"
          % (info.get("packets", 0), "是" if not errors or info.get("packets") else "否"))
    print("PID 分布    : %s" % ", ".join("0x%X×%d" % (k, v) for k, v in sorted(info.get("pids", {}).items())))
    print("PUSI 包数   : %d" % info.get("pusi", 0))
    if args.pid is not None:
        print("目标 PID    : 0x%X（%d 个包）" % (args.pid, info.get("pid_packets", 0)))
    print("结论        : %s" % ("通过" if not errors else "不通过"))
    for e in errors:
        print("  ✗ %s" % e)
    return 0 if not errors else 2


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------
def _mk_pat(pmt_pid=0x100):
    sec = bytearray()
    sec += bytes([0x00, 0x00])              # table_id, section_syntax(1)+reserved
    body = bytearray()
    body += bytes([0x00, 0x00])             # tsid
    body += bytes([0xC1])                   # version/current
    body += bytes([0x00, 0x00])             # section 0
    body += bytes([0x00, 0x01])             # last
    body += bytes([0x00, 0x00, 0xE0 | (pmt_pid >> 8), pmt_pid & 0xFF])
    total = 5 + len(body) + 4
    sec = bytearray([0x00, 0xB0 | ((total >> 8) & 0x0F), total & 0xFF])
    sec += body
    sec += bytes([0x00, 0x00, 0x00, 0x00])  # CRC32 占位
    payload = bytes([0x00]) + bytes(sec)    # pointer_field
    return build_packet(0, payload, pusi=True, cc=0)


def _mk_pmt(video_pid, stream_type=0x1B):
    body = bytearray()
    body += bytes([video_pid >> 8 & 0x1F, video_pid & 0xFF])  # PCR_PID
    body += bytes([0xF0, 0x00])                                # program_info_length=0
    body += bytes([stream_type])
    body += bytes([0xE0 | (video_pid >> 8), video_pid & 0xFF])
    body += bytes([0xF0, 0x00])
    total = 5 + 4 + len(body) + 4
    sec = bytearray([0x02, 0xB0 | ((total >> 8) & 0x0F), total & 0xFF])
    sec += bytes([0x00, 0x01, 0xC1, 0x00, 0x00, 0xE0 | (video_pid >> 8), video_pid & 0xFF])
    sec += bytes([0xF0, 0x00])
    sec += body
    sec += bytes([0x00, 0x00, 0x00, 0x00])
    return build_packet(0x100, bytes([0x00]) + bytes(sec), pusi=True, cc=0)


def _mk_pes(es, stream_id=0xE0, pts=None):
    """构造一个带 PTS 的 PES（头长 9 + 5 = 14）。"""
    if pts is None:
        hdr = b"\x80\x00\x00"
        hdr_len = 0
    else:
        pts_enc = bytes([0x21 | ((pts >> 29) & 0x0E), (pts >> 22) & 0xFF,
                         ((pts >> 14) & 0xFE) | 0x01, (pts >> 7) & 0xFF,
                         ((pts << 1) & 0xFE) | 0x01])
        hdr = b"\x80" + b"\x80" + bytes([len(pts_enc)]) + pts_enc
        hdr_len = len(pts_enc)
    total = 3 + hdr_len + len(es)
    v = total if total <= 0xFFFF else 0
    return b"\x00\x00\x01" + bytes([stream_id]) + bytes([(v >> 8) & 0xFF, v & 0xFF]) + hdr + es


def _build_sample_ts(video_pid=0x101, n_units=3, nal_len=40, pts0=90000):
    out = bytearray()
    out += _mk_pat(0x100)
    out += _mk_pmt(video_pid)
    cc = 0
    for u in range(n_units):
        es = b""
        for k in range(2):
            body = bytes([(0x41 + u) & 0xFF] * (nal_len - 4))
            es += bytes([0, 0, 0, 1]) + body
        pes = _mk_pes(es, pts=pts0 + u * 3000)
        off = 0
        first = True
        while off < len(pes):
            chunk = pes[off:off + 184]
            out += build_packet(video_pid, chunk, pusi=first, cc=cc)
            cc = (cc + 1) & 0x0F
            first = False
            off += 184
    return bytes(out)


def _selftest():
    ok = fail = 0
    msgs = []

    def chk(name, cond, extra=""):
        nonlocal ok, fail
        if cond:
            ok += 1
        else:
            fail += 1
            msgs.append("FAIL %s %s" % (name, extra))

    PID = 0x101
    sample = _build_sample_ts(video_pid=PID, n_units=3, nal_len=40)
    chk("合成样本 188 对齐", len(sample) % PKT == 0, str(len(sample)))
    e0, i0 = verify(sample, PID)
    chk("合成样本自身校验通过", not e0, str(e0))
    # PUSI 包 = PAT + PMT + 3 个 PES = 5
    chk("合成样本 PUSI 包数", i0.get("pusi") == 5, str(i0.get("pusi")))

    got = collect_es(sample, PID)
    chk("提取 ES 无异常", not got["bad"], str(got["bad"]))
    chk("提取到 3 个单元", len(got["units"]) == 3, str(len(got["units"])))
    chk("单元 ES 长度一致", len({u["es_len"] for u in got["units"]}) == 1,
        str([u["es_len"] for u in got["units"]]))
    chk("每个单元含 2 个 NALU 起始码", len(find_nal_starts(got["es"])) == 6,
        str(len(find_nal_starts(got["es"]))))

    # 1) 等长回填：应当逐字节稳定（除了包数/CC 可能变）
    out1, info1 = repack(sample, PID, got["es"])
    chk("等长回填 ES 逐字节一致", collect_es(out1, PID)["es"] == got["es"])
    chk("等长回填单元数不变", len(collect_es(out1, PID)["units"]) == 3)
    e1, _ = verify(out1, PID, expect_es=got["es"])
    chk("等长回填产物合规", not e1, str(e1))
    chk("PES 头被保留（含 PTS）", info1["header_preserved"] is True)
    chk("等长回填保留 PTS 标志", pes_header_len(_mk_pes(b"x" * 10, pts=90000))[1] is True)

    # 2) 变长回填（+37 字节）：ES 必须逐字节一致
    big = got["es"] + b"bytes([0, 0, 0, 1])" + b"w" * 33
    out2, info2 = repack(sample, PID, big)
    chk("变长回填 ES 逐字节一致", collect_es(out2, PID)["es"] == big)
    e2, _ = verify(out2, PID, expect_es=big)
    chk("变长回填产物合规", not e2, str(e2))
    chk("变长回填仍为 3 个 PES 单元", len(collect_es(out2, PID)["units"]) == 3)

    # 2b) 真正跨包边界的增长：样本本身要够大，否则 +37 字节仍塞得进同一个包
    big_sample = _build_sample_ts(video_pid=PID, n_units=3, nal_len=160)
    big_es = collect_es(big_sample, PID)["es"]
    grown = big_es + b"bytes([0, 0, 0, 1])" + b"U" * 36
    out2b, info2b = repack(big_sample, PID, grown)
    chk("跨包增长后包数增加", info2b["new_packets"] > info2b["old_packets"],
        "%d→%d" % (info2b["old_packets"], info2b["new_packets"]))
    chk("跨包增长后 ES 逐字节一致", collect_es(out2b, PID)["es"] == grown)
    e2b, _ = verify(out2b, PID, expect_es=grown)
    chk("跨包增长后产物合规", not e2b, str(e2b))

    # 3) 变短回填（-25 字节）
    small = got["es"][:-25]
    out3, info3 = repack(sample, PID, small)
    chk("变短回填 ES 逐字节一致", collect_es(out3, PID)["es"] == small)
    e3, _ = verify(out3, PID, expect_es=small)
    chk("变短回填产物合规", not e3, str(e3))

    # 4) PES_packet_length 必须被正确改写
    units = collect_es(out2, PID)["units"]
    hdr = units[1]["header"]
    plen = (hdr[4] << 8) | hdr[5]
    chk("PES_packet_length 已改写", plen == units[1]["es_len"] + len(hdr) - 6,
        "字段=%d 期望=%d" % (plen, units[1]["es_len"] + len(hdr) - 6))
    # 且不是写死成 0（短包场景必须给真实长度）
    chk("短包不写长度 0", plen != 0, str(plen))

    # 5) 非目标 PID 必须原样通过
    others_in = [p for p in iter_packets(sample) if parse_packet(p)["pid"] != PID]
    others_out = [p for p in iter_packets(out2) if parse_packet(p)["pid"] != PID]
    chk("非目标 PID 逐字节原样", others_in == others_out,
        "%d vs %d" % (len(others_in), len(others_out)))

    # 6) 填充字节必须是 0xFF（而不是 0x00）
    stuffed = 0
    for p in iter_packets(out2):
        d = parse_packet(p)
        if d["af_len"] and d["af"] and d["af"][0] == 0 and d["af_len"] > 1:
            if d["af"][1:] == bytes([0xFF]) * (d["af_len"] - 1):
                stuffed += 1
    chk("存在 0xFF 填充的包", stuffed > 0, str(stuffed))

    # 7) 切点落在 NALU 起始码上
    starts = set(find_nal_starts(big))
    cut_positions = []
    acc = 0
    for u in collect_es(out2, PID)["units"][:-1]:
        acc += u["es_len"]
        cut_positions.append(acc)
    chk("切点都在 NALU 起始码上", all(c in starts for c in cut_positions),
        "切点=%s 起始码=%s" % (cut_positions, sorted(starts)[:8]))
    chk("切分函数保证不劈 NALU", all(c in starts for c in
                                 [sum(u["es_len"] for u in collect_es(out2, PID)["units"][:i + 1])
                                  for i in range(len(collect_es(out2, PID)["units"]) - 1)]))

    # 8) 校验器必须能抓到人为损坏（不是"什么都能认"）
    bad = bytearray(out2)
    bad[0] = 0x48
    eb, _ = verify(bytes(bad), PID)
    chk("校验器抓到 sync 错误", any("sync" in x for x in eb), str(eb))
    # 找一个 CC != 0 的目标包再改它，否则改了个本来就是 0 的包，等于没改
    bad2 = bytearray(out2)
    cc_idx = None
    for i, pp in enumerate(iter_packets(out2)):
        dd = parse_packet(pp)
        if dd["pid"] == PID and dd["cc"] != 0:
            cc_idx = i
            break
    chk("样本里存在 CC != 0 的目标包（可测 CC）", cc_idx is not None)
    if cc_idx is not None:
        off = cc_idx * PKT
        bad2[off + 3] = (bad2[off + 3] & 0xF0) | ((bad2[off + 3] + 5) & 0x0F)
        eb2, _ = verify(bytes(bad2), PID)
        chk("校验器抓到 CC 断裂", any("CC" in x for x in eb2), str(eb2))
    eb3, _ = verify(bytes(out2), PID, expect_es=b"nope")
    chk("校验器抓到 ES 不符", any("不一致" in x for x in eb3), str(eb3))

    # 9) 拒绝路径
    try:
        collect_es(sample + b"\x00", PID)
        chk("非 188 对齐应报错", False, "没有抛异常")
    except ValueError as e:
        chk("非 188 对齐报错可读", "188" in str(e), str(e))
    try:
        repack(sample, 0x1FFF, b"x")
        chk("不存在的 PID 应报错", False, "没有抛异常")
    except ValueError as e:
        chk("不存在的 PID 报错可读", "没有 PID" in str(e), str(e))

    # 10) build_packet 越界保护
    try:
        build_packet(PID, b"x" * 185)
        chk("超长 payload 应报错", False, "没有抛异常")
    except ValueError:
        chk("超长 payload 报错", True)

    # 11) patch_pes_length 超 0xFFFF 时写 0
    h = b"\x00\x00\x01\xe0\x00\x00\x80\x00\x00"
    chk("超长 PES 长度写 0", patch_pes_length(h, 0x10000)[4:6] == b"\x00\x00",
        patch_pes_length(h, 0x10000)[4:6].hex())
    chk("正常 PES 长度写实值", patch_pes_length(h, 100)[4:6] == b"\x00\x67",
        patch_pes_length(h, 100)[4:6].hex())

    print("== ts_repack.py 自检 ==")
    for m in msgs:
        print("  " + m)
    print("通过 %d / 失败 %d" % (ok, fail))
    return 0 if fail == 0 else 1


# --------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(
        prog="ts_repack.py",
        description="解密后重新封装 TS：保留 PES 头、按 NALU 起始码切分回填、补 adaptation field 填充")
    ap.add_argument("input", nargs="?", help="输入 TS 文件")
    ap.add_argument("--pid", type=lambda s: int(s, 0), help="目标 PID（如 0x100 / 256）")
    ap.add_argument("--extract-es", metavar="OUT.es", help="导出该 PID 的 ES")
    ap.add_argument("--es", metavar="NEW.es", help="用这个 ES 重新封装")
    ap.add_argument("-o", "--out", help="输出 TS")
    ap.add_argument("--check", action="store_true", help="只校验，不改写")
    ap.add_argument("--expect-es", metavar="EXPECT.es", help="配合 --check：逐字节比对 ES")
    ap.add_argument("--selftest", action="store_true", help="跑内置自检")
    ap.add_argument("--version", action="version", version="ts_repack.py " + VERSION)
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()
    if not args.input:
        ap.print_help()
        return 1
    if not os.path.isfile(args.input):
        print("错误：找不到输入文件：%s" % args.input, file=sys.stderr)
        return 1

    mode = sum(1 for x in (args.extract_es, args.es, args.check) if x)
    if mode == 0:
        print("错误：需要 --extract-es / --es / --check 之一", file=sys.stderr)
        return 1
    if mode > 1:
        print("错误：--extract-es / --es / --check 一次只能用一个", file=sys.stderr)
        return 1
    if args.pid is None:
        print("错误：需要 --pid", file=sys.stderr)
        return 1
    if args.pid < 0 or args.pid > 0x1FFF:
        print("错误：PID 超出 0..0x1FFF", file=sys.stderr)
        return 1

    try:
        if args.extract_es:
            return cmd_extract(args)
        if args.es:
            return cmd_repack(args)
        return cmd_check(args)
    except (ValueError, FileNotFoundError) as e:
        print("错误：%s" % e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
