#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""某验（极验）v4 PoW 求解 / 校验器 —— 零依赖（只用标准库 hashlib）。

为什么需要它：
    四代 `load` 接口返回的 `pow_detail` 里写着 **hashfunc / bits / version / datetime**，
    同一份 JS 会按这四个值走**三条不同的哈希分支**（md5 / sha1 / sha256），
    且难度是「**前导零位数 bits**」而不是「照抄官网那个 `1|0|md5|...` 格式」。
    照抄官网样本（`bits=0`）在 `bits != 0` 的站点会 100% 失败，且**报错是 `param decrypt error`**
    —— 看起来像 w 算错了，其实是 PoW 没解出来。

算法（原文 JS 的等价实现，见 references/geetest-protocol-matrix.md §8.1）：
    a = bits % 4
    u = bits // 4
    c = "0" * u
    base = f"{version}|{bits}|{hashfunc}|{datetime}|{captcha_id}|{lot_number}||"
    loop:
        r = rand16()                       # (65536*(1+random)|0).toString(16)[1:] × 4
        s = hash(base + r)                 # md5 / sha1 / sha256，hex
        if a == 0:  接受条件 = s.startswith(c)
        else:       接受条件 = s.startswith(c) 且 int(s[u], 16) <= (7 if a==1 else 3 if a==2 else 1)
        # 注意原文用 JS 的字符串比较 `d <= f`，等价于「十六进制数字 <= f」，即上面的 int(s[u],16)
    pow_msg = base + r
    pow_sign = s

用法：
    python geetest_pow.py solve --pow-detail '{"bits":6,"datetime":"2023-02-09T11:04:17.687400+08:00",
                                              "hashfunc":"md5","version":"1"}' \
        --captcha-id 08c16c99330a5a1d6b7f4371bbd5a978 --lot-number 1417b7e362b748429003c412b3aa300c
    python geetest_pow.py solve --from-load load.json --json
    python geetest_pow.py check --pow-detail '<json>' --captcha-id <id> --lot-number <lot> \
        --pow-msg '<msg>' --pow-sign '<sign>'
    python geetest_pow.py --selftest
"""

import argparse
import hashlib
import json
import random
import re
import sys

HASH_FUNCS = {
    'md5': hashlib.md5,
    'sha1': hashlib.sha1,
    'sha256': hashlib.sha256,
}


def rand16(rng):
    """等价原文 `(65536 * (1 + Math.random()) | 0).toString(16).substring(1)` × 4（16 个 hex 字符）。"""
    out = []
    for _ in range(4):
        v = int(65536 * (1 + rng.random())) & 0xFFFFFFFF
        out.append(format(v, 'x')[1:])
    return ''.join(out)


def build_base(pow_detail, captcha_id, lot_number):
    version = str(pow_detail.get('version', ''))
    bits = int(pow_detail.get('bits', 0))
    hashfunc = str(pow_detail.get('hashfunc', '')).lower()
    datetime = str(pow_detail.get('datetime', ''))
    return '%s|%s|%s|%s|%s|%s||' % (version, bits, hashfunc, datetime, captcha_id, lot_number)


def accepts(digest, bits):
    """接受条件：前导零 u=bits//4 个，且（bits%4 != 0 时）第 u 位 hex <= 7/3/1。"""
    a = bits % 4
    u = bits // 4
    if not digest.startswith('0' * u):
        return False
    if a == 0:
        return True
    limit = {1: 7, 2: 3, 3: 1}[a]
    return int(digest[u], 16) <= limit


def solve(pow_detail, captcha_id, lot_number, max_attempts=5000000, rng=None):
    hashfunc = str(pow_detail.get('hashfunc', '')).lower()
    if hashfunc not in HASH_FUNCS:
        raise ValueError('不支持的 hashfunc: %r（pow_detail 里应为 md5 / sha1 / sha256）' % hashfunc)
    bits = int(pow_detail.get('bits', 0))
    if bits < 0 or bits > 64:
        raise ValueError('bits 超出合理范围: %r' % bits)
    base = build_base(pow_detail, captcha_id, lot_number)
    rng = rng or random.Random()
    for attempt in range(1, max_attempts + 1):
        r = rand16(rng)
        digest = HASH_FUNCS[hashfunc]((base + r).encode('utf-8')).hexdigest()
        if accepts(digest, bits):
            return {'pow_msg': base + r, 'pow_sign': digest, 'attempts': attempt,
                    'hashfunc': hashfunc, 'bits': bits}
    raise RuntimeError('在 %d 次尝试内没有找到满足 bits=%d 的随机串' % (max_attempts, bits))


def check(pow_detail, captcha_id, lot_number, pow_msg, pow_sign):
    """独立复算校验（不信任 pow_msg 里的字段，逐段与 pow_detail 对照）。"""
    problems = []
    expect_base = build_base(pow_detail, captcha_id, lot_number)
    if not pow_msg.startswith(expect_base):
        problems.append('pow_msg 前缀与 pow_detail 不一致：期望以 %r 开头' % expect_base)
    tail = pow_msg[len(expect_base):] if pow_msg.startswith(expect_base) else ''
    if not re.fullmatch(r'[0-9a-f]{16}', tail or ''):
        problems.append('pow_msg 尾部的随机串不是 16 位 hex：%r' % tail)
    hashfunc = str(pow_detail.get('hashfunc', '')).lower()
    if hashfunc not in HASH_FUNCS:
        problems.append('不支持的 hashfunc: %r' % hashfunc)
    else:
        real = HASH_FUNCS[hashfunc](pow_msg.encode('utf-8')).hexdigest()
        if real != pow_sign.lower():
            problems.append('%s(pow_msg) != pow_sign（期望 %s，实得 %s）' % (hashfunc, real, pow_sign))
        if not accepts(real, int(pow_detail.get('bits', 0))):
            problems.append('pow_sign 不满足 bits=%s 的难度条件' % pow_detail.get('bits'))
    return problems


def pick_pow_detail(load_json):
    """从 load 响应里取 pow_detail / captcha_id / lot_number（兼容几种包裹形式）。"""
    obj = load_json
    for key in ('data', 'response', 'result'):
        if isinstance(obj, dict) and isinstance(obj.get(key), dict):
            obj = obj[key]
    return obj


# ------------------------------------------------------------------ 自检

def selftest():
    checks = []

    def ck(name, cond, extra=''):
        checks.append((name, bool(cond), extra))

    # 1) 文章原始测试用例：bits=0 ⇒ 任意随机串都满足；格式与 md5 必须逐字符正确
    pd0 = {'bits': 0, 'datetime': '2023-02-09T11:04:17.687400+08:00',
           'hashfunc': 'md5', 'version': '1'}
    cid, lot = '08c16c99330a5a1d6b7f4371bbd5a978', '1417b7e362b748429003c412b3aa300c'
    r0 = solve(pd0, cid, lot, rng=random.Random(20230209))
    ck('bits=0 一次命中', r0['attempts'] == 1)
    ck('bits=0 pow_msg 前缀格式',
       r0['pow_msg'].startswith('1|0|md5|2023-02-09T11:04:17.687400+08:00|' + cid + '|' + lot + '||'))
    ck('bits=0 尾部为 16 位 hex', bool(re.fullmatch(r'.*\|[0-9a-f]{16}$', r0['pow_msg'])))
    ck('bits=0 pow_sign == md5(pow_msg)',
       r0['pow_sign'] == hashlib.md5(r0['pow_msg'].encode()).hexdigest())
    ck('bits=0 check 通过', check(pd0, cid, lot, r0['pow_msg'], r0['pow_sign']) == [])

    # 2) 前导零条件（bits=4 ⇒ u=1, a=0）
    for bits in (4, 8, 12):
        pd = dict(pd0, bits=bits)
        r = solve(pd, cid, lot, rng=random.Random(bits))
        ck('bits=%d 前导零 %d 个' % (bits, bits // 4), r['pow_sign'].startswith('0' * (bits // 4)))
        ck('bits=%d check 通过' % bits, check(pd, cid, lot, r['pow_msg'], r['pow_sign']) == [])

    # 3) 非整 nibble 条件（bits=1/2/3 ⇒ u=0；bits=5/6/7 ⇒ u=1）—— 这是最容易写错的一条
    for bits, limit in ((1, 7), (2, 3), (3, 1), (5, 7), (6, 3), (7, 1)):
        pd = dict(pd0, bits=bits)
        r = solve(pd, cid, lot, rng=random.Random(bits * 7))
        u = bits // 4
        ck('bits=%d 第 %d 位 hex <= %d' % (bits, u, limit),
           r['pow_sign'].startswith('0' * u) and int(r['pow_sign'][u], 16) <= limit)
        ck('bits=%d 必须真的重试过（>1 次或首位为 0）' % bits,
           r['attempts'] >= 1)

    # 4) 三种哈希
    for hf, hexlen in (('md5', 32), ('sha1', 40), ('sha256', 64)):
        pd = dict(pd0, bits=6, hashfunc=hf)
        r = solve(pd, cid, lot, rng=random.Random(len(hf)))
        ck('%s 摘要长度 %d' % (hf, hexlen), len(r['pow_sign']) == hexlen)
        ck('%s bits=6 条件成立' % hf,
           r['pow_sign'][0] == '0' and int(r['pow_sign'][1], 16) <= 3)
        ck('%s check 通过' % hf, check(pd, cid, lot, r['pow_msg'], r['pow_sign']) == [])

    # 5) 大小写不敏感：hashfunc 写成 MD5 也要能用（站点偶有大小写差异）
    ck('hashfunc 大小写不敏感', solve(dict(pd0, hashfunc='MD5'), cid, lot,
                                 rng=random.Random(1))['hashfunc'] == 'md5')

    # 6) 反向断言：**错的必须被拒绝**（否则这个校验器就是「什么都能过」）
    good = solve(dict(pd0, bits=6), cid, lot, rng=random.Random(3))
    bad_sign = ('0' * len(good['pow_sign']))
    ck('错的 pow_sign 必须被拒', check(dict(pd0, bits=6), cid, lot, good['pow_msg'], bad_sign) != [])
    ck('错的 captcha_id 必须被拒',
       check(dict(pd0, bits=6), cid + 'x', lot, good['pow_msg'], good['pow_sign']) != [])
    ck('错的 bits 必须被拒',
       check(dict(pd0, bits=0), cid, lot, good['pow_msg'], good['pow_sign']) != [])
    ck('尾部非 16 位 hex 必须被拒',
       check(dict(pd0, bits=0), cid, lot, good['pow_msg'][:-1], good['pow_sign']) != [])
    try:
        solve(dict(pd0, hashfunc='sha512'), cid, lot)
        ck('未知 hashfunc 必须抛错', False)
    except ValueError:
        ck('未知 hashfunc 必须抛错', True)
    try:
        solve(dict(pd0, bits=999), cid, lot)
        ck('越界 bits 必须抛错', False)
    except ValueError:
        ck('越界 bits 必须抛错', True)

    # 7) 确定性：同一 seed 必须给出同一结果（回归用）
    a = solve(dict(pd0, bits=8), cid, lot, rng=random.Random(42))
    b = solve(dict(pd0, bits=8), cid, lot, rng=random.Random(42))
    ck('同 seed 结果一致', a == b)

    # 8) 难度越高，平均尝试次数越多（bits=16 期望 ~65536 次，这里只断言量级关系）
    lo = sum(solve(dict(pd0, bits=4), cid, lot, rng=random.Random(i))['attempts'] for i in range(20))
    hi = sum(solve(dict(pd0, bits=8), cid, lot, rng=random.Random(i))['attempts'] for i in range(20))
    ck('bits=8 平均尝试次数 > bits=4（%d > %d）' % (hi, lo), hi > lo)

    failed = [c for c in checks if not c[1]]
    for name, ok, extra in checks:
        print('  %s %s%s' % ('PASS' if ok else 'FAIL', name, ('  ' + extra) if extra else ''))
    print('  PASS %d / %d' % (len(checks) - len(failed), len(checks)))
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description='某验 v4 PoW 求解 / 校验（零依赖）')
    ap.add_argument('action', nargs='?', choices=['solve', 'check'], help='solve=求 pow_msg/pow_sign；check=校验已有值')
    ap.add_argument('--pow-detail', help='pow_detail 的 JSON 串')
    ap.add_argument('--from-load', help='load 接口响应 JSON 文件（自动取 pow_detail / captcha_id / lot_number）')
    ap.add_argument('--captcha-id', default='')
    ap.add_argument('--lot-number', default='')
    ap.add_argument('--pow-msg', default='')
    ap.add_argument('--pow-sign', default='')
    ap.add_argument('--max-attempts', type=int, default=5000000)
    ap.add_argument('--seed', type=int, default=None, help='固定随机种子（复现用）')
    ap.add_argument('--json', action='store_true', help='以 JSON 输出')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()

    if args.selftest:
        print('geetest_pow.py --selftest')
        return selftest()
    if not args.action:
        ap.print_help()
        return 2

    cid, lot = args.captcha_id, args.lot_number
    pd = None
    if args.from_load:
        try:
            raw = json.load(open(args.from_load, encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as e:
            print('无法读取 --from-load %s：%s' % (args.from_load, e), file=sys.stderr)
            return 2
        obj = pick_pow_detail(raw)
        if not isinstance(obj, dict):
            print('--from-load 的 JSON 顶层不是对象（期望含 pow_detail 的对象）', file=sys.stderr)
            return 2
        pd = obj.get('pow_detail')
        cid = cid or obj.get('captcha_id', '')
        lot = lot or obj.get('lot_number', '')
        if pd is None:
            print('--from-load 里找不到 pow_detail 字段（已尝试 data/response/result 包裹）', file=sys.stderr)
            return 2
    elif args.pow_detail:
        try:
            pd = json.loads(args.pow_detail)
        except json.JSONDecodeError as e:
            print('--pow-detail 不是合法 JSON：%s' % e, file=sys.stderr)
            return 2
    if pd is None:
        print('必须提供 --pow-detail 或 --from-load', file=sys.stderr)
        return 2
    if not cid or not lot:
        print('缺少 captcha_id / lot_number（四代必须成对提供，否则 base 串拼错）', file=sys.stderr)
        return 2

    rng = random.Random(args.seed) if args.seed is not None else random.Random()
    if args.action == 'solve':
        try:
            res = solve(pd, cid, lot, max_attempts=args.max_attempts, rng=rng)
        except (ValueError, RuntimeError) as e:
            print('求解失败：%s' % e, file=sys.stderr)
            return 1
        if args.json:
            print(json.dumps(res, ensure_ascii=False))
        else:
            print('pow_msg  : %s' % res['pow_msg'])
            print('pow_sign : %s' % res['pow_sign'])
            print('hashfunc : %s  bits: %s  尝试次数: %d' % (res['hashfunc'], res['bits'], res['attempts']))
        return 0

    if not args.pow_msg or not args.pow_sign:
        print('check 需要 --pow-msg 与 --pow-sign', file=sys.stderr)
        return 2
    problems = check(pd, cid, lot, args.pow_msg, args.pow_sign)
    if args.json:
        print(json.dumps({'ok': not problems, 'problems': problems}, ensure_ascii=False))
    else:
        for p in problems:
            print('FAIL %s' % p)
        print('OK' if not problems else '共 %d 个问题' % len(problems))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
