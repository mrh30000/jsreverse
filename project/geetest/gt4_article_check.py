"""按《某验4五子棋逆向py纯算》文章方案实现的 gt4 winlinze 端到端验证脚本（一次性核查工具，不是生产代码）。
逐条复刻文章 四.1~四.11，输出每一步证据；失败时打印 traceback 即为期望行为。
"""

import base64
import hashlib
import json
import random
import re
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlencode

import requests
from Crypto.Cipher import AES, PKCS1_v1_5
from Crypto.PublicKey import RSA
from Crypto.Util.Padding import pad

BASE = "https://gcaptcha4.geetest.com"
CAPTCHA_ID = "54088bb07d2df3c46b79f80300b0abbe"  # 官方 demo（已从 gt4.geetest.com/assets/index.*.js 核对）
RSA_MODULUS = (
    "00C1E3934D1614465B33053E7F48EE4EC87B14B95EF88947713D25EECBFF7E74C7977D"
    "02DC1D9451F79DD5D1C10C29ACB6A9B4D6FB7D0A0279B6719E1772565F09AF6277159192"
    "21AEF91899CAE08C0D686D748B20A3603BE2318CA6BC2B59706592A9219D0BF05C9F6502"
    "3A21D2330807252AE0066D59CEEFA5F2748EA80BAB81"
)
RSA_EXPONENT = "10001"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Referer": "https://gt4.geetest.com/",
}
# 文章 3.4.2 原样正则（无 DOTALL），用于检验其是否可用
LIB_RE = r"\['_lib'\]\s*=\s*(\{.*?\})(?=,|;)"
ABO_RE = r"\['lib'\]\['_abo'\]\s*=\s*(\{.*?\})(?=,|;)"


def article_guid():
    """文章 3.3.2 原文实现：4 段 2 字节大端 hex = 16 个 hex 字符。"""
    return "".join(random.randint(1, 65535).to_bytes(2, "big").hex() for _ in range(4))


def jsonp(text):
    try:
        return json.loads(re.sub(r"^geetest_\d+\(", "", text.strip())[:-1] or "{}")[
            "data"
        ]
    except (json.JSONDecodeError, KeyError) as exc:
        raise RuntimeError(
            f"load/verify 响应不是预期 JSONP: {exc}\n{text[:300]}"
        ) from exc


def get_power_key(captcha_id, lot_number, pow_detail):
    bits, hashfunc = pow_detail["bits"], pow_detail["hashfunc"]
    prefix = f"{pow_detail['version']}|{bits}|{hashfunc}|{pow_detail['datetime']}|{captcha_id}|{lot_number}||"
    digest = {"md5": hashlib.md5, "sha1": hashlib.sha1, "sha256": hashlib.sha256}[
        hashfunc
    ]
    while True:
        pow_msg = prefix + article_guid()
        pow_sign = digest(pow_msg.encode()).hexdigest()
        if pow_sign.startswith("0" * (bits // 4)):
            return pow_msg, pow_sign


def find_move(ques):
    """文章 3.3.3 原样实现。"""
    grid = [row[:] for row in ques]

    def check_five(num):
        for i in range(5):
            if all(grid[i][j] == num for j in range(5)):
                return True
            if all(grid[j][i] == num for j in range(5)):
                return True
        return all(grid[i][i] == num for i in range(5)) or all(
            grid[i][4 - i] == num for i in range(5)
        )

    for target in range(1, 5):
        positions = [(y, x) for y in range(5) for x in range(5) if grid[y][x] == target]
        for from_y, from_x in positions:
            grid[from_y][from_x] = 0
            for to_y in range(5):
                for to_x in range(5):
                    if grid[to_y][to_x] != 0:
                        continue
                    grid[to_y][to_x] = target
                    if check_five(target):
                        return [[from_y, from_x], [to_y, to_x]]
                    grid[to_y][to_x] = 0
            grid[from_y][from_x] = target
    return None


def _slice_expr(expr, target):
    out = ""
    for part in expr.split("+"):
        m = re.search(r"n\[(\d+):(\d+)\]", part.strip())
        if m:
            a, b = map(int, m.groups())
            out += target[a : b + 1]  # 文章规则：n[a:b] 取到 b（含）
    return out


def build_abo(abo_str, target):
    from ast import literal_eval

    nested = {}
    for key_rule, val_rule in literal_eval(abo_str).items():
        vals = [_slice_expr(lv, target) for lv in re.split(r"\+\.\+", key_rule)]
        m = re.search(r"n\[(\d+):(\d+)\]", val_rule)
        if not m:
            raise ValueError(f"_abo 值规则无法解析: {val_rule}")
        a, b = map(int, m.groups())
        cur = nested
        for i, lv in enumerate(vals):
            if i == len(vals) - 1:
                cur[lv] = target[a : b + 1]
            else:
                cur = cur.setdefault(lv, {})
    return nested


def parse_lib(lib_str):
    d = {}
    for m in re.finditer(
        r"([A-Za-z_$][\w$]*)\s*:\s*(?:'([^']*)'|\"([^\"]*)\")",
        lib_str.strip().strip("{}"),
    ):
        d[m.group(1)] = m.group(2) or m.group(3)
    return d


def extract(path="ast解析/output.js"):
    text = Path(path).read_text(encoding="utf-8")
    strict = {"_lib": re.search(LIB_RE, text), "_abo": re.search(ABO_RE, text)}
    dot = {
        "_lib": re.search(r"\['_lib'\]\s*=\s*(\{.*?\})\s*,", text, re.S),
        "_abo": re.search(r"\['lib'\]\['_abo'\]\s*=\s*(\{.*?\})(?=;)", text, re.S),
    }
    return (
        {k: bool(v) for k, v in strict.items()},
        {k: v.group(1) if v else None for k, v in dot.items()},
    )


def _parse_hex(hex_str):
    """文章 3.4.3 的实现（ASCII→WordArray→bytes）。"""
    t = len(hex_str)
    s = [0] * (t // 4 + 1)
    for n in range(t):
        s[n >> 2] |= (ord(hex_str[n]) & 0xFF) << (24 - n % 4 * 8)
    out = bytearray()
    for w in s:
        out.extend(w.to_bytes(4, "big"))
    return bytes(out[:16])


def aes_encrypt(text, key_str, iv_str="0000000000000000"):
    return (
        AES.new(_parse_hex(key_str), AES.MODE_CBC, _parse_hex(iv_str))
        .encrypt(pad(text.encode(), AES.block_size))
        .hex()
    )


def rsa_encrypt(message):
    key = RSA.construct((int(RSA_MODULUS, 16), int(RSA_EXPONENT, 16)))
    return PKCS1_v1_5.new(key).encrypt(message.encode()).hex()


def cb():
    return f"geetest_{time.time_ns() // 1_000_000}"


def main():
    risk = next(
        (x.split("=", 1)[1] for x in sys.argv if x.startswith("--risk=")), "winlinze"
    )
    ch = str(uuid.uuid4())
    p = {
        "callback": cb(),
        "captcha_id": CAPTCHA_ID,
        "challenge": ch,
        "client_type": "web",
        "risk_type": risk,
        "lang": "zh",
    }
    d = jsonp(
        requests.get(f"{BASE}/load?{urlencode(p)}", headers=HEADERS, timeout=20).text
    )
    lot, pd = d["lot_number"], d["pow_detail"]
    print(
        f"[load] type={d['captcha_type']} pt={d['pt']} proto={d['payload_protocol']} "
        f"static={d['static_path']} pow_detail={pd}\n[load] ques={d.get('ques')} 其他键={sorted(set(d) - {'ques'})}"
    )

    strict_hit, dot_vals = extract()
    print(
        f"[文章正则] 原样(无DOTALL)命中={strict_hit}  <- 关键：{'FAIL' if not all(strict_hit.values()) else 'ok'}"
    )
    lib, abo = parse_lib(dot_vals["_lib"]), dot_vals["_abo"]
    print(f"[提取] _lib={lib}  _abo={abo}")

    pow_msg, pow_sign = get_power_key(CAPTCHA_ID, lot, pd)
    print(f"[pow]  {pow_msg}\n       {pow_sign}")
    move = (
        find_move(d["ques"]) if d["captcha_type"] == "winlinze" else 199
    )  # 非五子棋时给个占位答案
    print(f"[棋盘] type={d['captcha_type']} userresponse={move}")

    a = {
        "passtime": random.randint(500, 3000),
        "userresponse": move or "",
        "device_id": "",
        "lot_number": lot,
        "pow_msg": pow_msg,
        "pow_sign": pow_sign,
        "geetest": "captcha",
        "lang": "zh",
        "ep": "123",
        "gee_guard": {
            "roe": dict.fromkeys(
                ("aup", "sep", "egp", "auh", "rew", "snh", "res", "cdc"), "3"
            )
        },
        "em": {"ph": 0, "cp": 0, "ek": "11", "wd": 1, "nt": 0, "si": 0, "sc": 0},
    }
    if "--biht" in sys.argv:
        a["biht"] = "1426265548"  # 文章称固定值；当前 v1.9.7 中已不存在
    if "--nolib" not in sys.argv:
        a.update(lib)
    if "--noabo" not in sys.argv:
        a.update(build_abo(abo, lot))
    if "--nolib" in sys.argv:
        print("[消融] 去掉 _lib(dQFB)")
    if "--noabo" in sys.argv:
        print("[消融] 去掉 _abo 切片字段")
    plain = json.dumps(a, separators=(",", ":"))
    key = article_guid()
    w = aes_encrypt(plain, key) + rsa_encrypt(key)
    pt = d["pt"]
    if "--sep" in sys.argv:
        w = aes_encrypt(plain, key) + "_" + rsa_encrypt(key)
    if "--pt0" in sys.argv:
        # 源码：!n.pt || n.pt==='0' -> return urlsafe_encode(payload)，即 w 只是 urlsafe base64，不加密
        pt = "0"
        w = base64.urlsafe_b64encode(plain.encode()).decode().rstrip("=")
    if "--nopt" in sys.argv:
        # 不传 pt，走客户端 !n['pt'] 同一分支（urlsafe base64、不加密）
        pt = None
        w = base64.urlsafe_b64encode(plain.encode()).decode().rstrip("=")
    print(
        f"[明文] {plain[:200]}...\n[w]    len={len(w)} head={w[:32]}...tail=...{w[-32:]}"
    )

    v = {
        "callback": cb(),
        "captcha_id": CAPTCHA_ID,
        "challenge": ch,
        "client_type": "web",
        "lot_number": lot,
        "risk_type": d["captcha_type"],
        "payload": d["payload"],
        "process_token": d["process_token"],
        "payload_protocol": d["payload_protocol"],
        "pt": pt,
        "w": w,
    }
    if pt is None:
        del v["pt"]
    r = requests.get(f"{BASE}/verify?{urlencode(v)}", headers=HEADERS, timeout=20)
    print(f"[verify] HTTP {r.status_code}\n{r.text[:500]}")


if __name__ == "__main__":
    main()
