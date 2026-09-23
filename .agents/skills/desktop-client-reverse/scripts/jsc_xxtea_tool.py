#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cocos2d-JS / 网易系 `.jsc` 解密工具（零依赖）。

`.jsc` 在实战里有**两种完全不同的东西**，先分清再动手：

| 形态 | 判据 | 怎么处理 |
| --- | --- | --- |
| **Cocos2d-JS 加密脚本** | 无固定 magic；文件长度多为 4 的倍数；用 xxtea 试解会得到 gzip 或 JS 文本 | 本脚本 `decrypt`（`xxtea` / `xor+xxtea` / `+gzip` 自动分流） |
| **V8 code cache / bytenode** | 头部是 V8 私有格式，**没有可依赖的公开 magic** | 不要试图"解出源码"：只能交给 V8 反序列化（d8 打补丁 / 在 Electron 里 `require`），见 `references/jsc-and-v8-bytecode.md` |

Cocos2d-JS 的解密链在引擎里是写死的：

```
js = un?gzip(xxtea_decrypt(file_bytes, xxtea_key))
```

网易系（`cc::FileUtils::getDataFromFile`）在 xxtea 之前还多一层**重复密钥异或**：

```
1. 文件前 11 字节 == b"netease" + 01 01 01 EF   ⇒ 跳过这 11 字节
2. 剩余内容逐字节 ^= xor_key[i % len(xor_key)]   ⇒ 得到 xxtea 密文
3. xxtea_decrypt(..., xxtea_key)                 ⇒ 得到（可能是 gzip 的）明文
```

本脚本把这三段做成一条可复现流水线，并在 `--selftest` 里用**双实现互证 + 往返 + 反例**做门禁。
"""

from __future__ import annotations

import argparse
import gzip
import os
import struct
import sys

EXIT_OK = 0
EXIT_UNKNOWN = 3
EXIT_USAGE = 2
EXIT_DECRYPT_FAIL = 5

DELTA = 0x9E3779B9
SIGN = b"netease" + bytes([0x01, 0x01, 0x01, 0xEF])
GZIP_MAGIC = b"\x1f\x8b"

JS_TOKENS = (b"function", b"=>", b"var ", b"const ", b"let ", b"return", b"this.",
             b"require(", b"module.exports", b"prototype", b"window.")


# --------------------------------------------------------------------------- #
# XXTEA：两套独立实现，互为对照（防止抄错循环方向 / 下标）
# --------------------------------------------------------------------------- #

def _bytes_to_words(data: bytes) -> list:
    """按小端把字节补齐到 4 的倍数后切成 u32 数组（XXTEA 的定义域）。"""
    pad = (-len(data)) % 4
    data = data + b"\x00" * pad
    return list(struct.unpack("<%dI" % (len(data) // 4), data))


def _words_to_bytes(words: list) -> bytes:
    return struct.pack("<%dI" % len(words), *[w & 0xFFFFFFFF for w in words])


def _mx_a(sum_, y, z, p, e, k) -> int:
    return ((((z >> 5) ^ ((y << 2) & 0xFFFFFFFF)) + ((y >> 3) ^ ((z << 4) & 0xFFFFFFFF)))
            ^ ((sum_ ^ y) + (k[(p & 3) ^ e] ^ z))) & 0xFFFFFFFF


def _mx_b(sum_, y, z, p, e, k) -> int:
    left = ((z >> 5) ^ ((y << 2) & 0xFFFFFFFF)) + ((y >> 3) ^ ((z << 4) & 0xFFFFFFFF))
    right = (sum_ ^ y) + (k[(p & 3) ^ e] ^ z)
    return (left ^ right) & 0xFFFFFFFF


def xxtea_decrypt_words_ref(v: list, k: list) -> list:
    """实现 A：直接照抄参考实现（do/while + 宏展开 + 变量名 y/z/p/e）。"""
    v = list(v)
    n = len(v)
    if n < 2:
        return v
    k = (list(k) + [0, 0, 0, 0])[:4]
    rounds = 6 + 52 // n
    sum_ = (rounds * DELTA) & 0xFFFFFFFF
    y = v[0]
    while sum_ != 0:
        e = (sum_ >> 2) & 3
        for p in range(n - 1, 0, -1):
            z = v[p - 1]
            v[p] = (v[p] - _mx_a(sum_, y, z, p, e, k)) & 0xFFFFFFFF
            y = v[p]
        z = v[n - 1]
        v[0] = (v[0] - _mx_a(sum_, y, z, 0, e, k)) & 0xFFFFFFFF
        y = v[0]
        sum_ = (sum_ - DELTA) & 0xFFFFFFFF
    return v


def xxtea_decrypt_words_alt(v: list, k: list) -> list:
    """实现 B：独立写法（while 递减计数、显式 MX 分量、p 从尾部反向遍历）。"""
    v = list(v)
    n = len(v)
    if n < 2:
        return v
    k = (list(k) + [0, 0, 0, 0])[:4]
    rounds = 6 + 52 // n
    sum_ = (rounds * DELTA) & 0xFFFFFFFF
    y = v[0] & 0xFFFFFFFF
    remaining = rounds
    while remaining:
        e = (sum_ >> 2) & 3
        p = n - 1
        while p > 0:
            z = v[p - 1]
            v[p] = (v[p] - _mx_b(sum_, y, z, p, e, k)) & 0xFFFFFFFF
            y = v[p]
            p -= 1
        z = v[n - 1]
        v[0] = (v[0] - _mx_b(sum_, y, z, 0, e, k)) & 0xFFFFFFFF
        y = v[0]
        sum_ = (sum_ - DELTA) & 0xFFFFFFFF
        remaining -= 1
    return v


def xxtea_encrypt_words(v: list, k: list) -> list:
    """加密（只为往返与构造夹具；同样按参考实现写）。"""
    v = list(v)
    n = len(v)
    if n < 2:
        return v
    k = (list(k) + [0, 0, 0, 0])[:4]
    rounds = 6 + 52 // n
    sum_ = 0
    z = v[n - 1]
    for _ in range(rounds):
        sum_ = (sum_ + DELTA) & 0xFFFFFFFF
        e = (sum_ >> 2) & 3
        for p in range(0, n - 1):
            y = v[p + 1]
            v[p] = (v[p] + _mx_a(sum_, y, z, p, e, k)) & 0xFFFFFFFF
            z = v[p]
        p = n - 1
        y = v[0]
        v[p] = (v[p] + _mx_a(sum_, y, z, p, e, k)) & 0xFFFFFFFF
        z = v[p]
    return v


def key_to_words(key) -> list:
    if isinstance(key, str):
        raw = key.encode("utf-8")
    else:
        raw = bytes(key)
    if not raw:
        raise ValueError("xxtea key 不能为空")
    pad = (-len(raw)) % 4
    raw = raw + b"\x00" * pad
    return list(struct.unpack("<%dI" % (len(raw) // 4), raw))


def xxtea_decrypt_bytes(data: bytes, key) -> bytes:
    """两套实现必须一致，不一致就抛错（静默取一个 = 埋雷）。"""
    k = key_to_words(key)
    a = xxtea_decrypt_words_ref(_bytes_to_words(data), k)
    b = xxtea_decrypt_words_alt(_bytes_to_words(data), k)
    if a != b:
        raise RuntimeError("XXTEA 双实现不一致：实现 A 与实现 B 结果不同，拒绝输出")
    return _words_to_bytes(a)


def xxtea_encrypt_bytes(data: bytes, key) -> bytes:
    return _words_to_bytes(xxtea_encrypt_words(_bytes_to_words(data), key_to_words(key)))


# --------------------------------------------------------------------------- #
# 流水线
# --------------------------------------------------------------------------- #

def xor_repeat(data: bytes, key: bytes) -> bytes:
    if not key:
        raise ValueError("xor key 不能为空")
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


def js_score(data: bytes) -> float:
    """0..1 的"像 JS/文本"打分：可打印率 + 关键词命中，用来当**判据**而非猜测。"""
    if not data:
        return 0.0
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        sample = data[:4096]
        printable = sum(1 for b in sample if 32 <= b < 127 or b in (9, 10, 13))
        return 0.4 * (printable / max(len(sample), 1))
    clean = text.replace("\r", "").replace("\n", "").replace("\t", "")
    printable = sum(1 for ch in clean if ch.isprintable())
    base = printable / max(len(clean), 1)
    hits = sum(1 for t in JS_TOKENS if t in data)
    return min(1.0, 0.6 * base + 0.1 * hits)


def identify(data: bytes) -> str:
    if data[:2] == GZIP_MAGIC:
        return "gzip"
    if data[:11] == SIGN:
        return "netease-xor-sign"
    head = data.lstrip(b" \t\r\n\xef\xbb\xbf")
    if js_score(data) >= 0.85 and any(t in data for t in JS_TOKENS):
        return "plain-js"
    if len(data) >= 4 and data[0] == 0x83 and data[1] in (0x73,):
        # V8 私有格式**没有**可依赖 magic，这里只做"提示"，判据永远是要交给 V8 反序列化
        return "maybe-v8-code-cache(启发式,需 d8/vm 确认)"
    return "unknown-binary"


def decrypt_pipeline(data: bytes, xxtea_key, xor_key=None, strip_sign=True) -> dict:
    """返回每一步的结果与判定，不做任何"猜"：拿不到 JS 就明确报失败。"""
    steps = []
    blob = data
    if strip_sign and blob[:11] == SIGN:
        blob = blob[11:]
        steps.append("strip-sign(+11B)")
    if xor_key:
        blob = xor_repeat(blob, xor_key if isinstance(xor_key, bytes) else xor_key.encode())
        steps.append("xor-repeat(%dB key)" % len(xor_key))
    plain = xxtea_decrypt_bytes(blob, xxtea_key)
    steps.append("xxtea-decrypt")
    if plain[:2] == GZIP_MAGIC:
        try:
            out = gzip.decompress(plain)
            steps.append("gunzip")
            plain = out
        except Exception as exc:  # noqa: BLE001
            steps.append("gunzip-failed:%s" % exc)
    return {"steps": steps, "plain": plain, "score": js_score(plain), "kind": identify(plain)}


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def cmd_identify(args) -> int:
    data = open(args.file, "rb").read()
    kind = identify(data)
    print("%s  %d 字节  → %s" % (os.path.basename(args.file), len(data), kind))
    if kind == "unknown-binary":
        print("提示：Cocos 系请用 `decrypt --key <xxtea_key>` 试解（key 从 libcocos*.so 里找，")
        print("      搜 'decrypt' 关键字或 `Can't decrypt code for %s` 这句报错的引用）。")
    return EXIT_OK if kind != "unknown-binary" else EXIT_UNKNOWN


def cmd_decrypt(args) -> int:
    data = open(args.file, "rb").read()
    try:
        res = decrypt_pipeline(data, args.key, args.xor_key, strip_sign=not args.no_strip_sign)
    except RuntimeError as exc:
        print("拒绝输出：%s" % exc)
        return EXIT_DECRYPT_FAIL
    print("步骤            : %s" % " → ".join(res["steps"]))
    print("产物类型        : %s（JS 打分 %.3f）" % (res["kind"], res["score"]))
    if res["kind"] not in ("plain-js", "gzip"):
        print("结论            : 未得到 JS/文本 —— 大概率 key 或 xor_key 不对（不是「再试一次」的问题，")
        print("                  而是要去 so/JS 里重新取证密钥；错误密钥也能产出看似随机的字节，")
        print("                  所以判据只能是'解出来像 JS'，不能是'没报错'。")
        if args.out and os.path.exists(args.out):
            os.remove(args.out)
        return EXIT_DECRYPT_FAIL
    if args.out:
        with open(args.out, "wb") as fh:
            fh.write(res["plain"])
        print("已写出          : %s" % args.out)
    if args.show_head:
        print("--- 前 400 字节 ---")
        sys.stdout.write(res["plain"][:400].decode("utf-8", "replace"))
        print("\n--- 结束 ---")
    return EXIT_OK


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Cocos2d-JS / 网易系 .jsc 解密（零依赖）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p1 = sub.add_parser("identify", help="判断 .jsc 属于哪一类")
    p1.add_argument("file")
    p1.set_defaults(func=cmd_identify)

    p2 = sub.add_parser("decrypt", help="按 netease-xor → xxtea → gunzip 流水线解密")
    p2.add_argument("file")
    p2.add_argument("--key", required=True, help="xxtea 密钥（字符串或 hex:...）")
    p2.add_argument("--xor-key", help="重复密钥异或的 xor_key（网易系需要）")
    p2.add_argument("--no-strip-sign", action="store_true", help="不剥离 netease 签名头")
    p2.add_argument("--out")
    p2.add_argument("--show-head", action="store_true")
    p2.set_defaults(func=cmd_decrypt)

    args = ap.parse_args(argv)
    if args.selftest:
        return _selftest()
    if not getattr(args, "func", None):
        ap.print_help()
        return EXIT_USAGE
    if getattr(args, "key", None) and args.key.startswith("hex:"):
        args.key = bytes.fromhex(args.key[4:])
    return args.func(args)


# --------------------------------------------------------------------------- #
# 自检
# --------------------------------------------------------------------------- #

def _selftest() -> int:
    import random
    import subprocess
    import tempfile
    fails = []
    seen = []

    def ok(cond, label):
        seen.append(label)
        if not cond:
            fails.append(label)

    rnd = random.Random(20260923)
    key = "Za810xwef83lsa0A"
    xkey = b"Wa810xwef83lsa0A"

    # 1) 双实现互证（实现 A == 实现 B，逐字节）
    for n in (4, 8, 12, 17, 64, 260):
        blob = bytes(rnd.randrange(256) for _ in range(n))
        a = _words_to_bytes(xxtea_decrypt_words_ref(_bytes_to_words(blob), key_to_words(key)))
        b = _words_to_bytes(xxtea_decrypt_words_alt(_bytes_to_words(blob), key_to_words(key)))
        ok(a == b, "双实现互证 n=%d" % n)

    # 2) 加解密往返（含非 4 对齐长度：补零后往返前缀必须一致）
    for n in (8, 16, 33, 128):
        blob = bytes(rnd.randrange(256) for _ in range(n))
        rt = xxtea_decrypt_bytes(xxtea_encrypt_bytes(blob, key), key)
        ok(rt[:n] == blob, "xxtea 往返 n=%d" % n)

    # 3) n < 2 词：按 XXTEA 定义原样返回，不崩
    ok(xxtea_decrypt_bytes(b"\x01\x02\x03", key)[:3] == b"\x01\x02\x03", "n<2 词原样返回（尾部补零 1 字节）")
    ok(xxtea_decrypt_bytes(b"", key) == b"", "空输入不崩")

    # 4) 网易系 sign+xor 流水线：构造真样本 → 流水线必须还原
    js = b"function a(){return window.utoken;}var b=1;\n" * 6
    body = xxtea_encrypt_bytes(js, key)
    payload = SIGN + xor_repeat(body, xkey)
    ok(identify(payload) == "netease-xor-sign", "识别 netease 签名头")
    res = decrypt_pipeline(payload, key, xkey)
    ok(res["plain"][:len(js)] == js, "sign+xor+xxtea 流水线还原成功")
    ok(res["kind"] == "plain-js", "还原产物被判为 JS（实际 %s）" % res["kind"])
    ok("strip-sign(+11B)" in res["steps"][0] and "xor-repeat" in res["steps"][1], "步骤顺序必须是 sign→xor→xxtea")

    # 5) gzip 分支：cocos 的 ungzip(xxtea_decrypt())
    gz = gzip.compress(js)
    gz_payload = xxtea_encrypt_bytes(gz, key)
    res2 = decrypt_pipeline(gz_payload, key)
    ok(res2["plain"][:len(js)] == js, "xxtea→gunzip 分支还原成功")
    ok("gunzip" in res2["steps"], "gzip 分支必须被记录")

    # 6) 反例：xor_key 错 → 不能"看起来成功"
    res3 = decrypt_pipeline(payload, key, b"Wa810xwef83lsaXXX")
    ok(res3["plain"][:len(js)] != js, "错 xor_key 必须还原不出原文")
    ok(res3["kind"] != "plain-js", "错 xor_key 不得被判成 JS（实际 %s）" % res3["kind"])

    # 7) 反例：xxtea key 错 → JS 打分离谱（假阳性门禁）
    res4 = decrypt_pipeline(payload, "Za810xwef83lsa0B", xkey)
    ok(res4["kind"] != "plain-js", "错 xxtea key 不得被判成 JS（实际 %s）" % res4["kind"])

    # 8) 明文 gzip / 明文 JS 的识别（避免"对着已解密文件反复解"）
    ok(identify(gz) == "gzip", "gzip 识别")
    ok(identify(js) == "plain-js", "明文 JS 识别")

    # 9) CLI 端到端（含退出码契约）
    with tempfile.TemporaryDirectory() as tmp:
        p_in = os.path.join(tmp, "x.jsc")
        p_out = os.path.join(tmp, "x.js")
        with open(p_in, "wb") as fh:
            fh.write(payload)
        rc = _run_cli(["decrypt", p_in, "--key", key, "--xor-key", xkey.decode(), "--out", p_out])
        ok(rc == 0, "CLI decrypt 退出码应为 0（实际 %s）" % rc)
        got = open(p_out, "rb").read()
        ok(got[:len(js)] == js, "CLI 产物与期望一致")
        rc = _run_cli(["decrypt", p_in, "--key", key, "--xor-key", "wrongwrongwrong!", "--out", os.path.join(tmp, "bad.js")])
        ok(rc == EXIT_DECRYPT_FAIL, "错密钥时 CLI 必须返回 5（实际 %s）" % rc)
        ok(not os.path.exists(os.path.join(tmp, "bad.js")), "错密钥时不得留下产物文件")
        p_bad = os.path.join(tmp, "rand.bin")
        with open(p_bad, "wb") as fh:
            fh.write(os.urandom(300))
        rc = _run_cli(["identify", p_bad])
        ok(rc == EXIT_UNKNOWN, "随机二进制的 identify 必须返回 3（实际 %s）" % rc)
        rc = _run_cli(["decrypt", p_in])
        ok(rc == EXIT_USAGE, "缺 --key 必须返回用法错误 2（实际 %s）" % rc)

    print("jsc_xxtea_tool --selftest：%d 项断言，失败 %d" % (len(seen), len(fails)))
    for f in fails:
        print("  ✗ %s" % f)
    return 1 if fails else 0


def _run_cli(argv) -> int:
    import subprocess
    proc = subprocess.run([sys.executable, os.path.abspath(__file__)] + argv,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode


if __name__ == "__main__":
    sys.exit(main())
