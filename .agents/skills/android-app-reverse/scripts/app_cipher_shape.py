#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""app_cipher_shape.py — 客户端封包「密文形状」零依赖诊断器。

用途（对应 android-app-reverse/references/02-native-dynamic-tracing.md §5、
      references/05-flutter-app-reverse.md §4）：

  shape <cipher>                 判编码、字节长度、块对齐、算法候选
  decompose <out_len> --fixed N --rand M [--block B]
                                 把输出拆成「固定头 + 随机材料 + 块对齐密文」
  predict --prefix P --fixed N --rand M --inputs 1,3,16
                                 预测「摘要前缀 + PKCS#7」方案的输出长度

设计原则：
  * 零依赖（只用标准库），可离线复跑；
  * **只报「候选」，不报「结论」** —— 判据要三种证据吻合才算（见 SKILL.md §2 铁律三）；
  * `--selftest` 内置断言，断言数字全部来自本批源文的实测表，可直接复跑。

用法：
  python app_cipher_shape.py shape 5YyX5Lqs...
  python app_cipher_shape.py decompose 118 --fixed 6 --rand 32
  python app_cipher_shape.py predict --prefix 64 --fixed 6 --rand 32 --inputs 1,3,15,16,17,31,32,1024
  python app_cipher_shape.py --selftest
"""

from __future__ import annotations

import base64
import binascii
import re
import sys

# ------------------------------------------------------------------ 常量表

# Base64 长度 → 原始字节数（标准表，末尾可能带 = 或 ==）
B64_LEN_TABLE = {24: 16, 44: 32, 64: 48, 88: 64, 172: 128, 344: 256, 684: 512}

# RSA 密文长度 = 密钥长度（字节）
RSA_BYTES = {128: 1024, 256: 2048, 512: 4096}

HEX_RE = re.compile(r"^[0-9a-fA-F]+$")
B64_RE = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")


def detect_encoding(s: str):
    """返回 (编码名, 原始字节)。判不出来返回 (None, None)。"""
    s = s.strip()
    if not s:
        return None, None
    if len(s) % 2 == 0 and HEX_RE.match(s):
        try:
            return "hex", binascii.unhexlify(s)
        except binascii.Error:
            pass
    if B64_RE.match(s):
        try:
            return "base64", base64.b64decode(s + "=" * (-len(s) % 4))
        except binascii.Error:
            pass
    return None, None


def candidates(n: int):
    """按「字节长度」给算法候选（不是结论！）。"""
    out = []
    if n in RSA_BYTES:
        out.append(("RSA", "长度恰好等于 %d 位密钥的密文长度（固定长度特征）" % RSA_BYTES[n]))
    if n % 16 == 0:
        out.append(("AES", "长度是 16 的倍数（分组 16 字节）"))
    if n % 8 == 0:
        out.append(("DES/3DES", "长度是 8 的倍数（分组 8 字节）"))
    if not out:
        out.append(("未知", "既不是 8 的倍数、也不是 16 的倍数 ⇒ 可能带自定义固定头（用 decompose）"))
    return out


def cmd_shape(argv):
    if not argv:
        print("用法: shape <hex-or-base64>")
        return 2
    s = argv[0]
    enc, raw = detect_encoding(s)
    if raw is None:
        print("无法识别编码（既不是偶数长 hex，也不是合法 base64）")
        return 2
    n = len(raw)
    print("编码      : %s" % enc)
    print("字符长度  : %d" % len(s.strip()))
    print("字节长度  : %d" % n)
    if enc == "base64" and len(s.strip()) in B64_LEN_TABLE:
        print("长度表命中: base64 %d ↔ %d 字节" % (len(s.strip()), B64_LEN_TABLE[len(s.strip())]))
    print("块对齐    : 16 的倍数=%s · 8 的倍数=%s" % (n % 16 == 0, n % 8 == 0))
    print("候选（非结论）:")
    for name, why in candidates(n):
        print("  · %-8s %s" % (name, why))
    print("\n⚠️ 提醒：16 字节密文 AES 与 DES 都可能；同时满足两者时**优先判 AES**。")
    print("⚠️ 提醒：这只是形状，模式/Key/IV/明文仍需三种证据吻合（SKILL.md §2 铁律三）。")
    return 0


def cmd_decompose(argv):
    if not argv:
        print("用法: decompose <out_len> --fixed N --rand M [--block B]")
        return 2
    try:
        out_len = int(argv[0])
    except ValueError:
        print("out_len 必须是整数")
        return 2
    fixed = _opt_int(argv, "--fixed", 0)
    rand = _opt_int(argv, "--rand", 0)
    block = _opt_int(argv, "--block", 16)
    cipher = out_len - fixed - rand
    print("out_len = %d" % out_len)
    print("固定头  = %d" % fixed)
    print("随机材料= %d" % rand)
    print("cipher_len = %d - %d - %d = %d" % (out_len, fixed, rand, cipher))
    if cipher < 0:
        print("⇒ 负数：说明 fixed/rand 猜大了。")
        return 1
    ok = (cipher % block == 0)
    print("⇒ %d 是 %d 的倍数：%s（%s）" % (cipher, block, ok, "块对齐，符合分组密码" if ok else "不对齐 ⇒ 固定头可能不止这些"))
    if ok:
        print("⇒ 相当于 %d 个 %d 字节分组" % (cipher // block, block))
    return 0


def _pkcs7_block(n: int, block: int = 16) -> int:
    """PKCS#7：n 已是 block 倍数时**补满一整块**（不是补 0）。"""
    return ((n // block) + 1) * block


def cmd_predict(argv):
    prefix = _opt_int(argv, "--prefix", 0)
    fixed = _opt_int(argv, "--fixed", 0)
    rand = _opt_int(argv, "--rand", 0)
    block = _opt_int(argv, "--block", 16)
    ins = _opt(argv, "--inputs", "1,3,16")
    print("模型: out = fixed(%d) + rand(%d) + PKCS7_block(prefix(%d) + in_len)" % (fixed, rand, prefix))
    print("| 输入长度 | 明文长度 | 补齐后 | 输出长度 |")
    print("| --- | --- | --- | --- |")
    for tok in ins.split(","):
        tok = tok.strip()
        if not tok:
            continue
        L = int(tok)
        p = prefix + L
        c = _pkcs7_block(p, block)
        print("| %d | %d | %d | %d |" % (L, p, c, fixed + rand + c))
    return 0


def _opt(argv, name, default):
    if name in argv:
        i = argv.index(name)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def _opt_int(argv, name, default):
    try:
        return int(_opt(argv, name, default))
    except (TypeError, ValueError):
        return default


# ------------------------------------------------------------------ 自检

def _selftest():
    """断言全部来自本批源文实测表，可逐条复算。"""
    checks = []

    def ck(desc, got, want):
        checks.append((desc, got == want, got, want))

    # ① 52pojie-2122819：abc → 118 字节；cipher_len = 118 - 6 - 32 = 80 = 5 个 AES 分组
    ck("118-6-32", 118 - 6 - 32, 80)
    ck("80 是 16 的倍数", (80 % 16) == 0, True)
    ck("80 = 5 个分组", (80 // 16), 5)

    # ② 52pojie-2122819 长度表（prefix=64 摘要前缀 + fixed=6 + rand=32）
    got = []
    for L in (1, 3, 15, 16, 17, 31, 32, 1024):
        got.append(6 + 32 + _pkcs7_block(64 + L))
    ck("长度表复算", got, [118, 118, 118, 134, 134, 134, 150, 1142])

    # ③ 52pojie-2100363：base64 长度 512 → 384 字节 → 非 RSA 固定长度、是 16 的倍数
    ck("base64 512 → 384 字节", len(base64.b64decode("A" * 512 + "==")), 384)
    ck("384 不是 RSA 固定长度", 384 in RSA_BYTES, False)
    ck("384 是 16 的倍数", 384 % 16 == 0, True)
    ck("base64 88 → 64 字节", B64_LEN_TABLE[88], 64)

    # ④ 长度特征表：16 字节 AES/DES 都可能
    cand16 = {c[0] for c in candidates(16)}
    ck("16 字节同时命中 AES 与 DES", ("AES" in cand16) and ("DES/3DES" in cand16), True)
    ck("512 字节命中 RSA", "RSA" in {c[0] for c in candidates(512)}, True)
    ck("384 字节不命中 RSA", "RSA" in {c[0] for c in candidates(384)}, False)
    ck("12 字节都不命中", [c[0] for c in candidates(12)], ["未知"])

    # ⑤ PKCS#7：整块对齐时补满一整块（不是补 0）
    ck("PKCS7(64)", _pkcs7_block(64), 80)
    ck("PKCS7(65)", _pkcs7_block(65), 80)
    ck("PKCS7(80)", _pkcs7_block(80), 96)

    # ⑥ 编码识别：32 位 hex → 16 字节；含 = 的 base64 也认
    enc, raw = detect_encoding("0123456789abcdef0123456789abcdef")
    ck("32 hex → 16 字节", (enc, len(raw)), ("hex", 16))
    enc2, raw2 = detect_encoding("MDEyMzQ1Njc4OWFiY2RlZg==")
    ck("base64 识别", (enc2, raw2.decode()), ("base64", "0123456789abcdef"))

    # ⑦ 固定开销分解：2070898 的三段（part1|part2|part3）不适用于本模型，跳过；
    #    用 2107752 的 AES-ECB 形态做一条：明文 46 字节 → 补到 48
    ck("AES-ECB 46 → 48", _pkcs7_block(46), 48)

    passed = sum(1 for _, ok, _, _ in checks if ok)
    for desc, ok, got, want in checks:
        if not ok:
            print("FAIL  %-28s got=%r want=%r" % (desc, got, want))
    print("%d/%d" % (passed, len(checks)))
    return 0 if passed == len(checks) else 1


# ------------------------------------------------------------------ main

def main(argv):
    if "--selftest" in argv:
        return _selftest()
    if not argv:
        print(__doc__)
        return 2
    cmd, rest = argv[0], argv[1:]
    if cmd == "shape":
        return cmd_shape(rest)
    if cmd == "decompose":
        return cmd_decompose(rest)
    if cmd == "predict":
        return cmd_predict(rest)
    print("未知子命令：%s" % cmd)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
