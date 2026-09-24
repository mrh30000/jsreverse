#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""阿里云盘族签名字段：`x-device-id` + `x-signature`（ECDSA secp256k1）。

**零依赖**（只用标准库）—— 不引入 `ecdsa` / `coincurve`，便于在任意机器上复算。

结论来源：`52pojie-1745677`（见 `references/signed-api-and-helper-scripts.md` §2）。
本脚本做三件事：

1. `pubkey`  —— 由私钥推导未压缩公钥（`04 || x || y`）。这是**确定性**的，
   所以能用源文给出的真实私钥做 oracle（外部可复核常量）。
2. `signbody` —— 构造签名体明文 `appId:deviceId:userId:nonce` → SHA-256，
   并给出 `x-signature` 的完整形状（签名 hex + `01` 后缀）。
3. `sign` / `verify` —— 完整 ECDSA 实现，用来证明"我们的实现自洽"。

⚠️ 三处与来源一致的工程约束（不要改）：

* 公钥要**上报**给服务端（源文：先请求 `get_public_key`，再把 `04||pub` 发过去）；
* `x-signature` **不可复用**，且 `createSession` 那一次的值必须**原样透传**给后续接口；
* `nonce` 的语义是"限位"：初始 0，超时后 **+1**，更新时间随机 ⇒ 它参与签名体，所以会改变签名。

用法：
    python aliyun_ecc_sign.py pubkey   --priv 175,87,171,...
    python aliyun_ecc_sign.py signbody --app-id <appId> --device-id <uuid> --user-id <userId> --nonce 0
    python aliyun_ecc_sign.py sign     --priv 1 --digest <64hex>
    python aliyun_ecc_sign.py verify   --pub <130hex> --digest <64hex> --sig <r><s>
    python aliyun_ecc_sign.py --selftest
"""

from __future__ import annotations

import argparse
import hashlib
import json
import secrets
import sys

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
A = 0
B = 7
GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
INFINITY = None


def _inv(x: int, m: int = P) -> int:
    return pow(x % m, m - 2, m)


def point_add(p1, p2):
    if p1 is INFINITY:
        return p2
    if p2 is INFINITY:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % P == 0:
        return INFINITY
    if p1 == p2:
        lam = (3 * x1 * x1 + A) * _inv(2 * y1) % P
    else:
        lam = (y2 - y1) * _inv(x2 - x1) % P
    x3 = (lam * lam - x1 - x2) % P
    y3 = (lam * (x1 - x3) - y1) % P
    return (x3, y3)


def point_mul(k: int, point=(GX, GY)):
    k %= N
    if k == 0 or point is INFINITY:
        return INFINITY
    result = INFINITY
    addend = point
    while k:
        if k & 1:
            result = point_add(result, addend)
        addend = point_add(addend, addend)
        k >>= 1
    return result


def on_curve(point) -> bool:
    if point is INFINITY:
        return True
    x, y = point
    return (y * y - (x * x * x + A * x + B)) % P == 0


def priv_to_point(priv: int):
    if not (1 <= priv < N):
        raise ValueError("私钥必须落在 [1, n-1]（源文：随机生成，没有额外限制）")
    return point_mul(priv)


def pub_uncompressed(priv: int) -> str:
    """`04 || x || y`（未压缩公钥）。源文里那个 `04` 是转 HEX 时手工加的。"""
    x, y = priv_to_point(priv)
    return "04" + "%064x%064x" % (x, y)


def pub_compressed(priv: int) -> str:
    """`02/03 || x`。前缀判据取自源文 `${this.y & o ? "03" : "02"}${e}`：y 的奇偶决定 02/03。"""
    x, y = priv_to_point(priv)
    return ("03" if (y & 1) else "02") + "%064x" % x


def _k_deterministic(priv: int, digest: bytes) -> int:
    """确定性 k（只为可复现；生产实现用随机 k —— 源文用的是 `entropy=None`）。"""
    h = hashlib.sha256(priv.to_bytes(32, "big") + digest).digest()
    k = int.from_bytes(h, "big") % N
    return k or 1


def sign(priv: int, digest: bytes, k: int | None = None):
    if len(digest) != 32:
        raise ValueError("digest 必须是 32 字节（先做 SHA-256）")
    z = int.from_bytes(digest, "big")
    while True:
        kk = k or _k_deterministic(priv, digest)
        rp = point_mul(kk)
        if rp is INFINITY:
            k = None
            continue
        r = rp[0] % N
        if r == 0:
            k = None
            continue
        s = _inv(kk, N) * (z + r * priv) % N
        if s == 0:
            k = None
            continue
        return r, s


def verify(pub_hex: str, digest: bytes, r: int, s: int) -> bool:
    pub_hex = pub_hex.strip().lower()
    if pub_hex.startswith("04"):
        body = pub_hex[2:]
    elif pub_hex[:2] in ("02", "03"):
        raise ValueError("本工具只支持未压缩公钥（04 前缀）；先解压")
    else:
        body = pub_hex
    if len(body) != 128:
        raise ValueError("公钥长度不对（应为 04 + 64 + 64 hex）")
    q = (int(body[:64], 16), int(body[64:], 16))
    if not on_curve(q):
        raise ValueError("公钥不在曲线上")
    if not (1 <= r < N and 1 <= s < N):
        return False
    z = int.from_bytes(digest, "big")
    w = _inv(s, N)
    u1 = z * w % N
    u2 = r * w % N
    pt = point_add(point_mul(u1), point_mul(u2, q))
    if pt is INFINITY:
        return False
    return pt[0] % N == r


def build_sign_body(app_id: str, device_id: str, user_id: str, nonce: int) -> dict:
    """签名体明文与摘要（源文：先生成 `appId:deviceId:userId:nonce`，再 SHA-256）。"""
    plain = f"{app_id}:{device_id}:{user_id}:{nonce}"
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return {"plain": plain, "sha256": digest.hex()}


def sign_body(app_id: str, device_id: str, user_id: str, nonce: int, priv: int) -> dict:
    body = build_sign_body(app_id, device_id, user_id, nonce)
    r, s = sign(priv, bytes.fromhex(body["sha256"]))
    sig = "%064x%064x" % (r, s)
    return {
        **body,
        "signature_hex": sig,
        "x_signature": sig + "01",   # 源文：签名值后面加上 01
        "pubkey_uncompressed": pub_uncompressed(priv),
        "nonce_note": "nonce 初始 0，超时后 +1 且更新时间随机 ⇒ 它参与签名体",
    }


def parse_priv(text: str) -> int:
    text = text.strip()
    if "," in text:
        parts = [int(x) for x in text.replace(" ", "").split(",") if x != ""]
        if len(parts) != 32 or any(not (0 <= x <= 255) for x in parts):
            raise ValueError("字节数组形态必须是 32 个 0..255 的整数")
        return int.from_bytes(bytes(parts), "big")
    if text.startswith("0x"):
        text = text[2:]
    if len(text) != 64:
        raise ValueError("hex 形态必须是 64 个 hex 字符（32 字节）；不要传 UUID 或 userId")
    return int(text, 16)


# ---------------------------------------------------------------------------
# selftest
# ---------------------------------------------------------------------------

# 源文（52pojie-1745677）给出的真实私钥（32 字节数组）与对应的未压缩公钥（去 04 前缀）
SRC_PRIV_BYTES = [175, 87, 171, 214, 222, 196, 127, 36, 25, 50, 237, 179, 71, 81, 49, 196,
                  250, 103, 115, 203, 138, 179, 192, 182, 43, 175, 233, 72, 200, 14, 64, 254]
SRC_PUB_BODY = ("3e2a3bbd2dfe8675bc40b0b0af6a558421b827b5ad022c8d305eb861b9bfdcc4"
                "8aea1243df77a6298dfd5cf692a407852b3fd996ea5a13ae213c4380bb7b8d0d")


def selftest() -> int:
    checks = 0
    fails = []

    def ok(cond, label):
        nonlocal checks
        checks += 1
        if not cond:
            fails.append(label)

    def eq(a, b, label):
        ok(a == b, f"{label}（期望 {b!r}，实得 {a!r}）")

    # ---- 1. 曲线参数自检
    ok(on_curve((GX, GY)), "基点 G 在曲线上")
    ok(P % 4 == 3, "p ≡ 3 (mod 4)（用于快速求逆）")
    eq(point_add((GX, GY), INFINITY), (GX, GY), "P + O = P")
    eq(point_add(INFINITY, (GX, GY)), (GX, GY), "O + P = P")
    eq(point_add((GX, GY), (GX, -GY % P)), INFINITY, "P + (-P) = O")
    eq(point_add((GX, GY), (GX, GY)), point_mul(2), "P + P = 2P")
    eq(point_mul(3), point_add(point_mul(2), (GX, GY)), "3P = 2P + P")
    eq(point_mul(N), INFINITY, "n·G = O（阶正确）")

    # ---- 2. 私钥 → 公钥（源文真实 oracle）
    priv = int.from_bytes(bytes(SRC_PRIV_BYTES), "big")
    x, y = priv_to_point(priv)
    eq("%064x" % x, SRC_PUB_BODY[:64], "oracle：公钥 x 与源文逐字符一致")
    eq("%064x" % y, SRC_PUB_BODY[64:], "oracle：公钥 y 与源文逐字符一致")
    full = pub_uncompressed(priv)
    eq(full, "04" + SRC_PUB_BODY, "oracle：04 前缀 + 源文公钥体")
    eq(len(full), 130, "未压缩公钥 = 130 hex（04 + 64 + 64）")
    eq(full[2:], SRC_PUB_BODY, "去掉 04 后与源文一致")
    ok(SRC_PUB_BODY in full, "源文公钥串是 full 的子串")
    eq(pub_compressed(priv), ("03" if (y & 1) else "02") + SRC_PUB_BODY[:64],
       "压缩公钥前缀判据（y 奇偶 → 03/02）")

    # ---- 3. 私钥边界
    eq(priv_to_point(1), (GX, GY), "私钥 1 → 公钥 = 基点 G")
    eq(priv_to_point(N - 1), (GX, (-GY) % P), "私钥 n-1 → (Gx, -Gy)")
    for bad in (0, N, N + 1):
        try:
            priv_to_point(bad)
            ok(False, f"私钥 {bad} 应当报错")
        except ValueError:
            ok(True, f"私钥 {bad} 正确报错")

    # ---- 4. 签名体构造（源文口径）
    b = build_sign_body("APPID", "device-uuid", "12345678", 0)
    eq(b["plain"], "APPID:device-uuid:12345678:0", "签名体明文 = appId:deviceId:userId:nonce")
    eq(b["sha256"], hashlib.sha256(b["plain"].encode()).hexdigest(), "SHA-256 可独立复算")
    eq(len(b["sha256"]), 64, "SHA-256 = 64 hex")
    b1 = build_sign_body("APPID", "device-uuid", "12345678", 1)
    ok(b1["sha256"] != b["sha256"], "nonce +1 会改变摘要（源文：nonce 参与签名体）")
    eq(build_sign_body("A", "B", "C", 0)["plain"], "A:B:C:0", "拼接顺序与分隔符")

    # ---- 5. 签名 / 验签（证明实现自洽）
    d = bytes.fromhex(b["sha256"])
    r, s = sign(priv, d)
    sig = "%064x%064x" % (r, s)
    ok(0 < r < N and 0 < s < N, "r/s 落在 [1, n-1]")
    ok(verify(full, d, r, s), "自签自验通过")
    ok(not verify(pub_uncompressed(priv + 1), d, r, s), "换公钥后验签必须失败（阴性对照）")
    ok(not verify(full, d, r, (s + 1) % N), "篡改 s 后验签必须失败（阴性对照）")
    ok(not verify(full, hashlib.sha256(b"other").digest(), r, s), "换摘要后验签必须失败（阴性对照）")
    r2, s2 = sign(priv, d)
    eq((r2, s2), (r, s), "确定性 k ⇒ 同输入可复现（便于回归）")
    r3, s3 = sign(priv, d, k=7)
    ok((r3, s3) != (r, s), "换 k 后签名不同（同一内容可产生多个合法签名 ⇒ 源文「签名不可复用」）")

    # ---- 6. x-signature 形状
    sb = sign_body("APPID", "device-uuid", "12345678", 0, priv)
    eq(sb["x_signature"], sb["signature_hex"] + "01", "x-signature = 签名 hex + 01")
    ok(sb["x_signature"].endswith("01"), "01 后缀存在")
    eq(len(sb["signature_hex"]), 128, "ECDSA 签名 hex = 128（r||s 各 32 字节）")
    eq(len(sb["x_signature"]), 130, "x-signature 总长 = 130")
    eq(sb["pubkey_uncompressed"], "04" + SRC_PUB_BODY, "sign_body 同时给出待上报公钥")
    ok("nonce" in sb["nonce_note"], "非对称签名语义写进输出（供文档引用）")

    # ---- 7. 私钥输入解析
    eq(parse_priv(",".join(str(v) for v in SRC_PRIV_BYTES)), priv, "逗号字节数组解析")
    eq(parse_priv("%064x" % priv), priv, "64 hex 解析")
    eq(parse_priv("0x%064x" % priv), priv, "0x 前缀 hex 解析")
    for bad in ("abc", "1234", "0x1234", "%064x" % priv + "ff"):
        try:
            parse_priv(bad)
            ok(False, f"非法私钥 {bad!r} 应当报错")
        except ValueError:
            ok(True, f"非法私钥 {bad!r} 正确报错")
    try:
        parse_priv(",".join(["1"] * 31))
        ok(False, "31 字节数组应当报错")
    except ValueError:
        ok(True, "31 字节数组正确报错")

    # ---- 8. 随机私钥的整体一致性（各 3 次，保证不是"只有那一个常量能过"）
    for _ in range(3):
        k = secrets.randbelow(N - 1) + 1
        dg = hashlib.sha256(secrets.token_bytes(16)).digest()
        rr, ss = sign(k, dg)
        ok(verify(pub_uncompressed(k), dg, rr, ss), "随机私钥：自签自验通过")
        ok(on_curve(priv_to_point(k)), "随机私钥：公钥在曲线上")

    if fails:
        print("FAILED %d / %d" % (len(fails), checks))
        for f_ in fails:
            print("  -", f_)
        return 1
    print("OK: %d/%d" % (checks, checks))
    return 0


# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="阿里云盘族 x-device-id / x-signature（ECDSA secp256k1）")
    ap.add_argument("cmd", nargs="?", help="pubkey|compressed|signbody|sign|verify")
    ap.add_argument("--priv", help="私钥：32 字节逗号数组，或 64 hex（可带 0x）")
    ap.add_argument("--digest", help="32 字节摘要 hex")
    ap.add_argument("--pub", help="未压缩公钥 hex（04 前缀）")
    ap.add_argument("--sig", help="签名 r||s（128 hex）")
    ap.add_argument("--app-id", default="")
    ap.add_argument("--device-id", default="")
    ap.add_argument("--user-id", default="")
    ap.add_argument("--nonce", type=int, default=0)
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if not args.cmd:
        ap.print_help()
        return 1

    try:
        if args.cmd in ("pubkey", "compressed"):
            priv = parse_priv(args.priv or "")
            out = {
                "priv_hex": "%064x" % priv,
                "pubkey_uncompressed": pub_uncompressed(priv),
                "pubkey_compressed": pub_compressed(priv),
                "note": "先请求 get_public_key，再把 `04||x||y` 上报给服务端",
            }
        elif args.cmd == "signbody":
            out = sign_body(args.app_id, args.device_id, args.user_id, args.nonce, parse_priv(args.priv or ""))
        elif args.cmd == "sign":
            r, s = sign(parse_priv(args.priv or ""), bytes.fromhex(args.digest or ""))
            out = {"signature_hex": "%064x%064x" % (r, s), "x_signature": "%064x%064x" % (r, s) + "01"}
        elif args.cmd == "verify":
            sig = (args.sig or "").strip()
            okk = verify(args.pub or "", bytes.fromhex(args.digest or ""), int(sig[:64], 16), int(sig[64:], 16))
            out = {"verified": okk}
        else:
            ap.print_help()
            return 1
    except Exception as exc:  # noqa: BLE001 —— CLI 场景下把原因原样给出
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2))
        return 2

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
