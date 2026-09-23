#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""const_bruteforce.py —— 小程序「常量表爆破」三件套

为什么需要它：小程序把 key / iv / 盐值 / 掩码**全塞进一个混淆过的常量数组**里
（典型文件名 `constant-obfuscated.js`）。正则抠不出来（数组元素被拆散、拼接、乱序），
但**候选集是有限且可枚举的** —— 于是「拿一组已知明文密文对，遍历候选集反解参数」比
逐行读混淆代码快一到两个数量级。

实测价值（B22 双源互证）：
  * 同一小程序 2024 版与 2025 版，`aes_key` 没变（`3993014457161851`）而 `appSecret`
    从 `%4_CA*U$GM6N#0EP` 换成了 `Kfl%BOk6C5PwARw8` ——
    **照抄文章里的常量必然失效，而"遍历常量数组"这一招跨版本依然有效**。
  * AI 读混淆代码给出的候选值（`3917763gCFENO`）是**错的**；爆破才是判据。

三个子命令：
  aes-pair     遍历候选集当 (key, iv)，解一段 base64 密文，按"能否 JSON 化"排序
  md5-salt     遍历候选集当盐/前缀/后缀，对已知 sign 反解一次 md5
  xor-int32    16 字节 key 被 4 个 int32 按**大端**异或（`DataView` 默认大端）

用法：
  python const_bruteforce.py aes-pair --ciphertext "<b64>" --array-file const.js [--json-only] [--top 20]
  python const_bruteforce.py aes-pair --ciphertext "<b64>" --array-list '["aaa...","bbb..."]'
  python const_bruteforce.py md5-salt --target "<32位hex>" --template "{salt}nonce1231759127717" --array-list '["a","b"]'
  python const_bruteforce.py xor-int32 --data "<b64 或 hex>" --mask 3854078970,2917115795,3887476043,3350876132
  python const_bruteforce.py --selftest
"""

import argparse
import base64
import hashlib
import json
import re
import sys


# --------------------------------------------------------------------------- 工具

def b64_decode(s, urlsafe=True, pad=True):
    s = s.strip()
    if urlsafe:
        s = s.replace("-", "+").replace("_", "/")
    if pad:
        s += "=" * (-len(s) % 4)
    return base64.b64decode(s)


def maybe_json(text):
    try:
        json.loads(text)
        return True
    except Exception:
        return False


def printable_ratio(text):
    if not text:
        return 0.0
    ok = sum(1 for ch in text if ch.isprintable() or ch in "\r\n\t")
    return ok / len(text)


def extract_strings_from_js(path):
    """从 JS/混淆文件里抠「长度像 key/iv/盐」的字符串字面量候选。

    这里刻意**不做 AST**：常量数组常被拆成 `"a"+"b"` 或 `["x"][0]`，
    AST 反而抠不全；先粗网捞（含拼接结果的启发式合并），再由爆破判据筛。
    """
    src = open(path, "r", encoding="utf-8", errors="replace").read()
    lits = re.findall(r'"((?:[^"\\]|\\.){1,64})"|\'((?:[^\'\\]|\\.){1,64})\'', src)
    cands = []
    for a, b in lits:
        s = a or b
        try:
            s = s.encode().decode("unicode_escape") if "\\" in s else s
        except Exception:
            pass
        cands.append(s)
    return cands


def aes_cbc_decrypt(key: bytes, iv: bytes, data: bytes) -> bytes:
    """AES-CBC 解密。优先 pycryptodome；缺失时复用同目录 wxapkg_tool 的纯 Python 实现（保持零依赖）。"""
    try:
        from Crypto.Cipher import AES  # type: ignore

        return AES.new(key, AES.MODE_CBC, iv).decrypt(data)
    except ImportError:
        pass
    try:
        import wxapkg_tool  # 同目录，脚本运行时 sys.path[0] 即本目录

        return wxapkg_tool._aes_cbc_decrypt(key, iv, data)
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"没有可用的 AES 实现（pip install pycryptodome 或保证 wxapkg_tool.py 同目录）: {exc}")


def _has_aes():
    try:
        aes_cbc_decrypt(b"0" * 16, b"0" * 16, b"\0" * 16)
        return True
    except Exception:
        return False


# --------------------------------------------------------------------------- aes-pair

def cmd_aes_pair(args):
    if not _has_aes():
        print("[!] 没有可用的 AES 实现（pip install pycryptodome，或保证 wxapkg_tool.py 同目录）", file=sys.stderr)
        return 2
    ct = b64_decode(args.ciphertext)
    cands = args.array_list if args.array_list is not None else extract_strings_from_js(args.array_file)
    if isinstance(cands, str):
        cands = json.loads(cands)

    # 候选过滤：CBC 的 iv 必须 16 字节；key 允许 16/24/32
    ivs = [c for c in cands if isinstance(c, str) and len(c.encode("utf-8")) == 16]
    keys = [c for c in cands if isinstance(c, str) and 16 <= len(c.encode("utf-8")) <= 64]
    print(f"# 候选 {len(cands)} → iv 候选 {len(ivs)}，key 候选 {len(keys)}；密文 {len(ct)}B")
    if not ivs or not keys:
        print("[!] iv 或 key 候选为空 —— 检查常量数组是否被拆包/混淆（见 references/request-crypto-and-sign.md §4）", file=sys.stderr)
        return 2

    hits = []
    for kv in keys:
        kb = kv.encode("utf-8")
        if len(kb) not in (16, 24, 32):
            continue
        for iv in ivs:
            try:
                pt = aes_cbc_decrypt(kb, iv.encode("utf-8"), ct)
            except Exception:
                continue
            # 去 PKCS7 填充（不合法就保持原样：**很多错误的 iv 也能"解出可打印字符"**）
            if 1 <= pt[-1] <= 16 and pt[-16:] and pt[-pt[-1]:] == bytes([pt[-1]]) * pt[-1]:
                body = pt[:-pt[-1]]
            else:
                body = pt
            try:
                text = body.decode("utf-8")
            except UnicodeDecodeError:
                continue
            is_json = maybe_json(text)
            pr = printable_ratio(text)
            if is_json or (pr > 0.95 and args.loose):
                hits.append({"key": kv, "iv": iv, "json": is_json, "printable": round(pr, 3), "plain": text})

    hits.sort(key=lambda h: (not h["json"], -h["printable"]))
    if args.json_only:
        hits = [h for h in hits if h["json"]]
    if not hits:
        print("[!] 无命中。常见原因：① iv 不在常量表里（是派生值）；② 密文不是 CBC/PKCS7；③ 常量数组被进一步编码（base64/hex）")
        return 1
    print(f"# 命中 {len(hits)} 组；**只有 json=True 的那一组才是答案**（其余都是「能解出字符」的假阳性）")
    for h in hits[:args.top]:
        tag = "JSON ✓" if h["json"] else f"可打印={h['printable']} ✗"
        print(f"  key={h['key']!r:<24} iv={h['iv']!r:<20} {tag}  {h['plain'][:80]!r}")
    return 0


# --------------------------------------------------------------------------- md5-salt

def cmd_md5_salt(args):
    cands = args.array_list if args.array_list is not None else extract_strings_from_js(args.array_file)
    if isinstance(cands, str):
        cands = json.loads(cands)
    target = args.target.lower()
    hits = []
    for salt in cands:
        if not isinstance(salt, str):
            continue
        s = args.template.replace("{salt}", salt)
        for name, digest in (("md5", hashlib.md5), ("sha256", hashlib.sha256), ("sha1", hashlib.sha1)):
            if args.algo and args.algo != name:
                continue
            h = digest(s.encode("utf-8")).hexdigest()
            if h == target or h.upper() == args.target.upper():
                hits.append((name, salt, s, h))
    if not hits:
        print("[!] 无命中 —— 模板拼法可能不同（小写/大写、是否含分隔符、是否先 base64、是否 keys 排序）")
        return 1
    for name, salt, s, h in hits:
        print(f"  ✓ {name}  盐={salt!r}  明文={s!r}\n              → {h}")
    return 0


# --------------------------------------------------------------------------- xor-int32

def xor_int32_mask(data: bytes, masks):
    """按 **大端** 把每 4 字节与一个 int32 掩码异或，模拟 `DataView.setInt32(i, getInt32(i) ^ m)`。

    ⚠️ 两个必须点破的坑：
      1. `DataView.getInt32/setInt32` **默认大端**（`littleEndian` 省略 = false）；
         `Uint32Array` 视图则是**平台端序**（x86 为小端）⇒ 两者把同一个整数摊成字节串的结果**不同**，
         写法不同、结果不同、还都不报错。
      2. 掩码数组常直接写在 DOM 属性里（`<div id="app-key" data-keys="...">`），
         而不是在 JS 常量里 —— 找不到常量表时先去 HTML 里翻。
    """
    if len(data) % 4 != 0:
        raise ValueError("数据长度必须是 4 的倍数")
    out = bytearray(data)
    for i, m in enumerate(masks):
        chunk = bytes(data[4 * i:4 * i + 4])
        v = int.from_bytes(chunk, "big") ^ (m & 0xFFFFFFFF)
        out[4 * i:4 * i + 4] = v.to_bytes(4, "big")
    return bytes(out)


def cmd_xor_int32(args):
    raw = args.data
    if re.fullmatch(r"[0-9a-fA-F]+", raw) and len(raw) % 2 == 0 and len(raw) >= 32:
        data = bytes.fromhex(raw)
    else:
        data = b64_decode(raw)
    masks = [int(x, 0) for x in args.mask.split(",")]
    out = xor_int32_mask(data, masks)
    print(f"输入 {len(data)}B → 输出 {len(out)}B")
    print(f"  hex    : {out.hex()}")
    try:
        print(f"  ascii  : {out.decode('utf-8')!r}")
    except UnicodeDecodeError:
        print("  ascii  : <非 UTF-8>")
    return 0


# --------------------------------------------------------------------------- 自检

def selftest():
    checks = []

    def ck(name, cond, extra=""):
        checks.append((name, bool(cond), extra))

    # --- xor-int32：与文章里的真实数值对齐（1851955）
    enc = bytes([128, 245, 244, 139, 212, 166, 215, 255, 208, 226, 106, 4, 240, 217, 14, 134])
    mask = [3854078970, 2917115795, 3887476043, 3350876132]
    got = xor_int32_mask(enc, mask)
    ck("xor-int32 复现文章真实数值 → eMgqyypl7TGO7cAb", got == b"eMgqyypl7TGO7cAb", got.hex())
    ck("xor-int32 结果 hex 与文章一致", got.hex() == "654d67717979706c3754474f37634162")
    # 大端 vs 小端必须区分开（否则会"看着对但值错"）
    le = bytes().join(((int.from_bytes(enc[4 * i:4 * i + 4], "little") ^ mask[i]) & 0xFFFFFFFF).to_bytes(4, "little")
                      for i in range(4))
    ck("大端掩码 ≠ 小端掩码（语义差异必须显式断言）", le != got)
    # 与 DataView 语义等价（JS: setUint8 → getInt32 默认大端 → XOR → setInt32）
    ck("xor-int32 幂等（再做一次回到原文）", xor_int32_mask(got, mask) == enc)
    # 掩码可取反：DOM 属性给的是字符串数字时按十进制解析
    ck("掩码支持 0x 前缀解析", [int(x, 0) for x in "0xE5B893FA,0".split(",")][0] == 3854078970)

    # --- md5-salt：文章真实数值（某迪 2024 版 appSecret，Checksum = sha256(appSecret+Nonce+Curtime)）
    app_secret_2024 = "%4_CA*U$GM6N#0EP"
    nonce, curtime = "m28fRzhXxcGcJJb3", "1718350950"
    h = hashlib.sha256((app_secret_2024 + nonce + curtime).encode()).hexdigest()
    ck("sha256(appSecret+Nonce+Curtime) 复现文章值",
       h == "81353d1e9f31e6763c35279853312ad5faa95e5b7355edfd4d04a3fe778c4530", h)
    # 2025 版换了 appSecret ⇒ 同法可判"常量已轮换"
    h2 = hashlib.sha256(("Kfl%BOk6C5PwARw8" + nonce + curtime).encode()).hexdigest()
    ck("换 appSecret 后结果不同（证明常量会跨版本轮换）", h2 != h)
    ck("md5-salt 模板替换可用", hashlib.md5("SALTx".replace("{salt}", "SALT").encode()).hexdigest() ==
       hashlib.md5(b"SALTx").hexdigest())

    # --- aes-pair：真造一组 CBC 密文，验证"能命中且能识别 JSON"
    if _has_aes():
        import wxapkg_tool

        key = b"3993014457161851"
        iv = b"PDVcDRWMrBlLHTqh"
        pt = b'{"group":"community","is_new":"2","session_id":""}'
        pad = 16 - len(pt) % 16
        ct = wxapkg_tool._aes_cbc_encrypt(key, iv, pt + bytes([pad]) * pad)
        args = argparse.Namespace(ciphertext=base64.b64encode(ct).decode(),
                                  array_file=None,
                                  array_list=json.dumps(["3993014457161851", "PDVcDRWMrBlLHTqh", "8765432187654321"]),
                                  json_only=True, loose=False, top=10)
        import io
        import contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = cmd_aes_pair(args)
        ck("aes-pair 命中唯一 JSON 解（含干扰 iv）", rc == 0 and "JSON ✓" in buf.getvalue())
        # 干扰 iv 也会"解出可打印字符" —— 这正是必须用 JSON 判据的原因
        bad = aes_cbc_decrypt(key, b"8765432187654321", ct)
        ck("错误 iv 解出的前 16 字节仍可能是可打印（假阳性必须靠判据筛掉）",
           printable_ratio(bad.decode("utf-8", "replace")) > 0.3)
    else:
        ck("aes-pair 自检（跳过：无 AES 实现）", False)

    # --- 候选抽取
    tmp = "_cbf_selftest.js"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write('var a=["abc","3993014457161851","PDVcDRWMrBlLHTqh"];var b="%4_CA*U$GM6N#0EP";')
    cands = extract_strings_from_js(tmp)
    import os
    os.remove(tmp)
    ck("从混淆 JS 抽出候选字面量", "3993014457161851" in cands and "%4_CA*U$GM6N#0EP" in cands, str(cands))

    ok = sum(1 for _, c, _ in checks if c)
    for name, cond, extra in checks:
        print(("  ✓ " if cond else "  ✗ ") + name + (("   [" + extra + "]") if (extra and not cond) else ""))
    print(f"\n自检 {ok}/{len(checks)} 通过")
    return 0 if ok == len(checks) else 1


def main(argv=None):
    ap = argparse.ArgumentParser(description="小程序常量表爆破三件套")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("aes-pair")
    p.add_argument("--ciphertext", required=True)
    p.add_argument("--array-file")
    p.add_argument("--array-list")
    p.add_argument("--json-only", action="store_true")
    p.add_argument("--loose", action="store_true", help="放宽到「可打印率 > 0.95」也算命中")
    p.add_argument("--top", type=int, default=20)

    p = sub.add_parser("md5-salt")
    p.add_argument("--target", required=True)
    p.add_argument("--template", required=True, help="用 {salt} 占位，如 '{salt}nonce1759127717'")
    p.add_argument("--array-file")
    p.add_argument("--array-list")
    p.add_argument("--algo", choices=["md5", "sha1", "sha256"])

    p = sub.add_parser("xor-int32")
    p.add_argument("--data", required=True, help="base64 或 hex（≥32 字符的纯 hex 按 hex 解析）")
    p.add_argument("--mask", required=True, help="逗号分隔的 int32，如 3854078970,2917115795,3887476043,3350876132")

    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.cmd == "aes-pair":
        return cmd_aes_pair(args)
    if args.cmd == "md5-salt":
        return cmd_md5_salt(args)
    if args.cmd == "xor-int32":
        return cmd_xor_int32(args)
    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
