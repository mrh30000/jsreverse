#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""播放地址还原层（§0 层）的四个可复算 oracle。

本脚本对应 `references/playback-address-interfaces.md`：在 A–F 层之前，
先把「页面/接口里的那串东西」还原成一个**能直接播的地址**。

子命令
------
charcodes       字符码表族（`*104*116*116*112…` → `http…`）
qingting        蜻蜓FM 电台地址（HMAC-MD5 签名）
migu-ddcalcu    咪咕 playurl 的 ddCalcu 字符交织（不是加密）
iqiyi-authkey   爱奇艺 dash 的 authKey（加盐 MD5）

零依赖、纯标准库。`--selftest` 自带正/负对照。

⚠️ 口径声明（B29）：本脚本的**算法**全部逐行抄自源文；但
   - `qingting` 源文**未给示例 URL** ⇒ 只做结构断言，未与真实响应对拍；
     其中「十六进制大小写」源文未明确，用 `--ts-case` 暴露成开关；
   - `migu-ddcalcu` 源文**未给 ddCalcu 的期望输出** ⇒ 断言的是**结构**（长度与四个插入位），
     不是某个具体值。这两条在文档里也必须同样标注。
"""

import argparse
import hashlib
import hmac
import json
import sys
import time
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

# --------------------------------------------------------------------------- #
# 1) 字符码表族
# --------------------------------------------------------------------------- #

def charcodes_decode(text, sep='*', skip_first=1, encoding='utf-8'):
    """`*104*116*116*112…` → `http…`（听书网 FonHen_JieMa 族）。

    源文实现（52pojie-2017001:52-57）：
        var a = u.split("*");
        for (var i = 1, n = a.length; i < n; i++) b += String.fromCharCode(a[i]);
    注意三件事，每一件都对应一个静默出错路径：
      1. **从下标 1 开始**（下标 0 是前导分隔符留下的空串）；
      2. `String.fromCharCode` 是**按 UTF-16 码元**取值，不是按字节 —— 码点 > 0xFFFF
         时要按 `chr()` 的语义处理，本实现直接用 `chr()`；
      3. 分隔符、前导空段、越界码点都要**报错而不是静默跳过**。
    """
    if not text:
        raise ValueError('空输入')
    parts = text.split(sep)
    if skip_first:
        parts = parts[skip_first:]
    out = []
    for idx, piece in enumerate(parts):
        piece = piece.strip()
        if piece == '':
            raise ValueError('第 %d 段为空（分隔符连写？）' % idx)
        try:
            code = int(piece, 10)
        except ValueError:
            raise ValueError('第 %d 段不是十进制整数：%r' % (idx, piece))
        if code < 0 or code > 0x10FFFF:
            raise ValueError('第 %d 段码点越界：%d' % (idx, code))
        if 0xD800 <= code <= 0xDFFF:
            raise ValueError('第 %d 段是 UTF-16 代理区码点（不可单独成字）：%d' % (idx, code))
        out.append(chr(code))
    return ''.join(out)


# --------------------------------------------------------------------------- #
# 2) 蜻蜓FM 电台地址
# --------------------------------------------------------------------------- #

QT_KEY = 'Lwrpu$K5oP'          # 源文 line 10 / 20 的固定口令
QT_HOST = 'https://lhttp.qtfm.cn'
QT_PATH_TPL = '/live/{id}/64k.mp3'


def qingting_sign(path, ts_hex, app_id='web', key=QT_KEY):
    """sign = hex_hmac_md5(key, "app_id=<app_id>&path=<path>&ts=<ts_hex>")"""
    msg = 'app_id=%s&path=%s&ts=%s' % (app_id, path, ts_hex)
    return hmac.new(key.encode('utf-8'), msg.encode('utf-8'), hashlib.md5).hexdigest()


def qingting_url(channel_id, ts_unix=None, ts_offset=3600, ts_case='upper', app_id='web'):
    """源文口径：`ts` 是「当前时间 + 1 小时」的**十六进制文本**。

    易语言 `取十六进制文本(Unix时间戳(增减时间(取现行时间(), #小时, 1)))`。
    ⚠️ 源文未给示例 URL ⇒ **大小写未证**，默认 `upper`（易语言该函数惯例输出大写），
       用 `--ts-case lower` 可切换。这条不确定性必须留在文档里，不要悄悄选一个。
    """
    path = QT_PATH_TPL.format(id=channel_id)
    base_ts = int(ts_unix if ts_unix is not None else time.time())
    ts = base_ts + int(ts_offset)
    ts_hex = format(ts, 'X') if ts_case == 'upper' else format(ts, 'x')
    sign = qingting_sign(path, ts_hex, app_id=app_id)
    return '%s%s?app_id=%s&ts=%s&sign=%s' % (QT_HOST, path, app_id, ts_hex, sign), {
        'path': path, 'ts_unix': ts, 'ts_hex': ts_hex, 'sign': sign, 'msg': 'app_id=%s&path=%s&ts=%s' % (app_id, path, ts_hex),
    }


# --------------------------------------------------------------------------- #
# 3) 咪咕 ddCalcu（字符交织）
# --------------------------------------------------------------------------- #

DD_INDEX_TABLE = '2624'        # 源文 line 113：s = list("2624")
DD_DEFAULTS = {
    'userid': 'eeeeeeeee',        # 9 个 e
    'timestamp': 'tttttttttttttt',  # 14 个 t
    'ProgramID': 'ccccccccc',     # 9 个 c
    'Channel_ID': 'nnnnnnnnnnnnnnnn',  # 16 个 n
}


def migu_ddcalcu(url):
    """把 h5 播放地址的 `puData` 交织成校验串，拼回 `&ddCalcu=`。

    逐行抄自 52pojie-1899689:95-136。**这不是加密**：没有任何密钥与运算，
    只是把 `puData` 反转后与原串交替配对，再在固定位置插入 4 个单字符。
    索引表 `s = "2624"` 决定取哪一位：
        u = t[2]（userid）· l = r[6]（timestamp）· c = n[2]（ProgramID）· f = a[len(a)-4]（Channel_ID）
    四个字段为空时用**定长默认串**兜底 —— 默认串的长度就是「必须 ≥ 索引」这件事本身
    （9 / 14 / 9 / 16 ⇒ 覆盖 2 / 6 / 2 / len-4），所以默认值不能随便改短。
    """
    parsed = urlparse(url)
    para = dict(parse_qsl(parsed.query))

    t = para.get('userid') or DD_DEFAULTS['userid']
    r = para.get('timestamp') or DD_DEFAULTS['timestamp']
    n = para.get('ProgramID') or DD_DEFAULTS['ProgramID']
    a = para.get('Channel_ID') or DD_DEFAULTS['Channel_ID']
    o = para.get('puData') or ''
    if not o:
        return url, {'skipped': '无 puData ⇒ 原样返回'}

    idx = DD_INDEX_TABLE
    for label, value, need in (('userid', t, int(idx[0]) + 1),
                               ('timestamp', r, int(idx[1]) + 1),
                               ('ProgramID', n, int(idx[2]) + 1),
                               ('Channel_ID', a, int(idx[3]) + 1)):
        if len(value) < need:
            raise ValueError('%s 长度 %d < 索引需要 %d（源文默认串被改短了？）' % (label, len(value), need))

    u = t[int(idx[0])] or 'e'
    l = r[int(idx[1])] or 't'
    c = n[int(idx[2])] or 'c'
    f = a[len(a) - int(idx[3])] or 'n'

    d = list(o)
    h = []
    p = 0
    while p * 2 < len(d):
        h.append(d[len(d) - p - 1])
        if p < len(d) - p - 1:
            h.append(o[p])
        if p == 1:
            h.append(u)
        if p == 2:
            h.append(l)
        if p == 3:
            h.append(c)
        if p == 4:
            h.append(f)
        p += 1
    v = ''.join(h)
    return url + '&ddCalcu=' + v, {
        'puData': o, 'u': u, 'l': l, 'c': c, 'f': f, 'ddCalcu': v, 'len': len(v),
    }


# --------------------------------------------------------------------------- #
# 4) 爱奇艺 authKey
# --------------------------------------------------------------------------- #

IQ_SALT = 'd41d8cd98f00b204e9800998ecf8427e'   # 源文 line 47/111


def iqiyi_authkey(tm, tvid, salt=IQ_SALT):
    """authKey = md5("<salt>" + tm + tvid)，tm 是 **13 位毫秒**时间戳。

    源文 line 111 自注「测试为真」。注意那个"盐"就是 `md5("")` —— 也就是说
    它并不是保密常量，只是一个**约定前缀**；换成真盐同样能算，但服务端只认这一个。
    """
    return hashlib.md5(('%s%s%s' % (salt, tm, tvid)).encode('utf-8')).hexdigest()


# --------------------------------------------------------------------------- #
# 自检
# --------------------------------------------------------------------------- #

def selftest():
    n = 0
    ok = 0

    def chk(cond, name):
        nonlocal n, ok
        n += 1
        if cond:
            ok += 1
        else:
            print('  ✗ %s' % name)

    def raises(fn, name):
        nonlocal n, ok
        n += 1
        try:
            fn()
        except Exception:
            ok += 1
            return
        print('  ✗ %s（本应抛错却没有）' % name)

    # ---- charcodes
    chk(charcodes_decode('*104*116*116*112*58*47*47*97') == 'http://a', 'charcodes 基本解码')
    chk(charcodes_decode('*104*116*116*112') == 'http', 'charcodes skip_first=1 默认（源文带前导 *）')
    chk(charcodes_decode('|104|116|116|112', sep='|') == 'http', 'charcodes 自定义分隔符')
    chk(charcodes_decode('120*104*116', skip_first=0) == 'xht', 'charcodes skip_first=0 保留首段')
    chk(charcodes_decode('*233*189*160') == '\u00e9\u00bd\u00a0',
        'charcodes 按 UTF-16 码元（不是按字节，故 233 单独成字）')
    raises(lambda: charcodes_decode('*104**116'), 'charcodes 空段必须报错')
    raises(lambda: charcodes_decode('*abc'), 'charcodes 非整数必须报错')
    raises(lambda: charcodes_decode('*1114112'), 'charcodes 码点越界必须报错')
    raises(lambda: charcodes_decode('*55296'), 'charcodes 代理区码点必须报错')
    raises(lambda: charcodes_decode(''), 'charcodes 空输入必须报错')
    # 源文把目标站点写成 base64（line 15），解出来是站名 —— 本批实算
    import base64
    chk(base64.b64decode('aHR0cHM6Ly93d3cudGluZ3poLmNvbS9wbGF5LzE2MTI0LTAtMC5odG1s').decode() ==
        'https://www.tingzh.com/play/16124-0-0.html', '听书网源文的 base64 站点名可解')

    # ---- qingting
    url, meta = qingting_url(1234, ts_unix=1758700000, ts_offset=3600, ts_case='upper')
    chk(meta['ts_unix'] == 1758703600, 'qingting ts = unix + 3600')
    chk(meta['ts_hex'] == '68D3AFF0', 'qingting ts 十六进制（大写）')
    chk(meta['path'] == '/live/1234/64k.mp3', 'qingting path 模板')
    chk(meta['msg'] == 'app_id=web&path=/live/1234/64k.mp3&ts=68D3AFF0', 'qingting 待签串口径')
    chk(meta['sign'] == '57f8fb7d1488e93140cb986498c28d8e',
        'qingting sign = HMAC-MD5(口令, 待签串)（本批实算值，源文未给）')
    chk(meta['sign'] == hmac.new(b'Lwrpu$K5oP', meta['msg'].encode(), hashlib.md5).hexdigest(),
        'qingting sign 与 hashlib 直算一致')
    chk(len(meta['sign']) == 32 and all(c in '0123456789abcdef' for c in meta['sign']),
        'qingting sign 是 32 位小写 hex')
    chk(url == 'https://lhttp.qtfm.cn/live/1234/64k.mp3?app_id=web&ts=68D3AFF0&sign=' + meta['sign'],
        'qingting URL 拼装顺序')
    _, low = qingting_url(1234, ts_unix=1758700000, ts_offset=3600, ts_case='lower')
    chk(low['ts_hex'] == '68d3aff0' and low['sign'] != meta['sign'],
        'qingting 大小写开关真的会改签名（源文未证 ⇒ 必须留开关）')
    chk(qingting_sign('/live/1234/64k.mp3', '68D3AFF0', key='wrong') != meta['sign'],
        'qingting 负对照：换口令签名必须不同')
    chk(QT_KEY == 'Lwrpu$K5oP' and QT_HOST == 'https://lhttp.qtfm.cn', 'qingting 源文常量逐字一致')

    # ---- migu ddcalcu
    sample = ('https://h5live.gslb.cmvideo.cn/wd_r2/cctv/cctv1hd/600/index.m3u8'
              '?msisdn=202312241405015bc0ae24f1bb42dc9e16ff0f7ac931f9&mdspid=&spid=699004'
              '&netType=0&sid=2201057821&pid=2028597139&timestamp=20231224140501'
              '&Channel_ID=0116_25000000-99000-100300010010001&ProgramID=608807420'
              '&ParentNodeID=-99&assertID=2201057821&SecurityKey=20231224140501'
              '&promotionId=&mvid=2201057821&mcid=500020'
              '&playurlVersion=WX-A1-6.12.1.1-RELEASE&userid=&jmhm=&videocodec=h264'
              '&bean=mgsph5&puData=3f841e2a0b365c2914ee68cd75073bdb')
    out, info = migu_ddcalcu(sample)
    chk(out.startswith(sample) and out.endswith('&ddCalcu=' + info['ddCalcu']), 'ddcalcu 只做追加不改原 URL')
    chk(len(info['ddCalcu']) == len(info['puData']) + 4, 'ddcalcu 长度 = len(puData) + 4')
    chk(info['u'] == 'e', 'ddcalcu u 取 userid[2]，空则默认串 t[2]')
    chk(info['l'] == '2', 'ddcalcu l 取 timestamp[6]')
    chk(info['c'] == '8', 'ddcalcu c 取 ProgramID[2]')
    chk(info['f'] == sample.split('Channel_ID=')[1].split('&')[0][-4], 'ddcalcu f 取 Channel_ID[len-4]')
    chk(info['ddCalcu'][4] == info['u'] and info['ddCalcu'][7] == info['l']
        and info['ddCalcu'][10] == info['c'] and info['ddCalcu'][13] == info['f'],
        'ddcalcu 四个插入位固定在 4 / 7 / 10 / 13')
    # 结构复算（k >= 5 时进入稳定区，插入位已全部落完）：
    #   v[2k+4] == o[n-1-k]（逆序侧）  v[2k+5] == o[k]（正序侧）
    o = info['puData']
    chk(all(info['ddCalcu'][2 * k + 5] == o[k] for k in range(5, len(o) // 2)),
        'ddcalcu 正序侧按 o[k] 落位（v[2k+5]）')
    chk(all(info['ddCalcu'][2 * k + 4] == o[len(o) - 1 - k] for k in range(5, len(o) // 2)),
        'ddcalcu 逆序侧按 o[n-1-k] 落位（v[2k+4]）')
    no_pu = migu_ddcalcu('https://h5live.gslb.cmvideo.cn/a/index.m3u8?sid=1')
    chk(no_pu[0] == 'https://h5live.gslb.cmvideo.cn/a/index.m3u8?sid=1' and 'skipped' in no_pu[1],
        'ddcalcu 无 puData ⇒ 原样返回（源文 line 111）')
    raises(lambda: migu_ddcalcu(sample.replace('&Channel_ID=0116_25000000-99000-100300010010001', '&Channel_ID=01')),
           'ddcalcu 字段被改短到索引之外必须报错')
    chk(len(DD_DEFAULTS['userid']) >= 3 and len(DD_DEFAULTS['timestamp']) >= 7
        and len(DD_DEFAULTS['ProgramID']) >= 3 and len(DD_DEFAULTS['Channel_ID']) >= 4,
        'ddcalcu 四个默认串长度覆盖索引（这就是默认值不能改短的原因）')

    # ★ 语料陷阱：源文样例 URL 里的 `&timestamp=` 在 Markdown 里被渲染成了 `×tamp=`
    #   （`&times;` 是 HTML 实体）。后果**不报错**：`timestamp` 取不到 ⇒ 走默认串 ⇒
    #   第 7 个字符由 '2' 变成 't'，其余完全相同。这条做成断言，把"陷阱"变成机器可判。
    mangled = sample.replace('&timestamp=', '×tamp=')
    chk('×' in mangled and '&times' not in mangled, '语料实体化前提：&timestamp= 变成 ×tamp=')
    _, info_bad = migu_ddcalcu(mangled)
    chk(info_bad['l'] == 't' and info['l'] == '2',
        '★ 实体陷阱可机器判定：×tamp= ⇒ l 退化成默认 t；&timestamp= ⇒ l = 时间戳[6] = 2')
    chk(info_bad['ddCalcu'][7] == 't' and info['ddCalcu'][7] == '2'
        and info_bad['ddCalcu'][:7] == info['ddCalcu'][:7]
        and info_bad['ddCalcu'][8:] == info['ddCalcu'][8:],
        '★ 实体陷阱只改第 7 位、其余逐字符相同（静默出错的标准形态）')
    # 回归护栏：源文**未给** ddCalcu 的期望输出，因此这条不是「对拍」，而是「本批实算基线」。
    # 任何算法改动都会打红它 —— 它是护栏，不是证据。
    chk(info['ddCalcu'] == 'b3dfeb823487100e527ad0cb8366e5ec4219',
        'ddcalcu 本批实算基线（不是源文对拍值，仅作回归护栏）')

    # ---- iqiyi authkey
    chk(IQ_SALT == hashlib.md5(b'').hexdigest(), '爱奇艺"盐"就是 md5("")（不是保密常量）')
    chk(iqiyi_authkey('1625936950392', '8485811691506600') ==
        hashlib.md5(b'd41d8cd98f00b204e9800998ecf8427e1625936950392' + b'8485811691506600').hexdigest(),
        'authKey = md5(salt + tm + tvid)')
    # ★ 源文 line 92 与 line 136 各给了一条**完整样例 URL**，其中 authKey / tm / tvid 同时出现
    #   ⇒ 这两条是「源文自带的对拍向量」，不是本批自己编的。实算逐字符命中。
    chk(iqiyi_authkey('1625936950392', '8485811691506600') == 'c45e671cc7f74b52f477dc8fb32e27ba',
        '★ 源文 line 92 样例 URL 复算命中（authKey=c45e671c…）')
    chk(iqiyi_authkey('1625847214729', '4742103680293600') == 'f39c6550d42daea8c13722e0351a789c',
        '★ 源文 line 136 样例 URL 复算命中（authKey=f39c6550…）')
    chk(iqiyi_authkey('1', '2') != iqiyi_authkey('2', '1'), 'authKey 拼接顺序敏感（tm 在前）')
    chk(len(iqiyi_authkey('1', '2')) == 32, 'authKey 是 32 位 hex')
    # 源文 line 44：node 输出要取尾部 33 个字符再 strip ⇒ vf 是最后 32 位
    node_stdout = 'some noise from js\n8f2b8b04a29e5e8d0f10b8e7a7bc7668\n'
    chk(node_stdout[-33:].strip() == '8f2b8b04a29e5e8d0f10b8e7a7bc7668',
        '爱奇艺源文的 result[-33:] 切片口径')

    print('playback_address selftest: %d/%d' % (ok, n))
    return 0 if ok == n else 1


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def main(argv=None):
    ap = argparse.ArgumentParser(description='播放地址还原层 oracle（§0 层）')
    ap.add_argument('--selftest', action='store_true')
    sub = ap.add_subparsers(dest='cmd')

    p1 = sub.add_parser('charcodes', help='字符码表族解码（*104*116…）')
    p1.add_argument('--input', required=True)
    p1.add_argument('--sep', default='*')
    p1.add_argument('--skip-first', type=int, default=1)
    p1.add_argument('--json', action='store_true')

    p2 = sub.add_parser('qingting', help='蜻蜓FM 电台地址')
    p2.add_argument('--id', required=True, help='电台 id（path 里的那段）')
    p2.add_argument('--ts-unix', type=int, default=None, help='不传则用当前时间')
    p2.add_argument('--ts-offset', type=int, default=3600)
    p2.add_argument('--ts-case', choices=['upper', 'lower'], default='upper')
    p2.add_argument('--app-id', default='web')
    p2.add_argument('--json', action='store_true')

    p3 = sub.add_parser('migu-ddcalcu', help='咪咕 playurl 的 ddCalcu')
    p3.add_argument('--url', required=True)
    p3.add_argument('--json', action='store_true')

    p4 = sub.add_parser('iqiyi-authkey', help='爱奇艺 dash 的 authKey')
    p4.add_argument('--tm', required=True, help='13 位毫秒时间戳')
    p4.add_argument('--tvid', required=True)
    p4.add_argument('--json', action='store_true')

    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    if not args.cmd:
        ap.print_help()
        return 2

    if args.cmd == 'charcodes':
        val = charcodes_decode(args.input, sep=args.sep, skip_first=args.skip_first)
        print(json.dumps({'decoded': val}, ensure_ascii=False) if args.json else val)
    elif args.cmd == 'qingting':
        url, meta = qingting_url(args.id, ts_unix=args.ts_unix, ts_offset=args.ts_offset,
                                 ts_case=args.ts_case, app_id=args.app_id)
        print(json.dumps({'url': url, **meta}, ensure_ascii=False, indent=2) if args.json else url)
    elif args.cmd == 'migu-ddcalcu':
        url, meta = migu_ddcalcu(args.url)
        print(json.dumps({'url': url, **meta}, ensure_ascii=False, indent=2) if args.json else url)
    elif args.cmd == 'iqiyi-authkey':
        val = iqiyi_authkey(args.tm, args.tvid)
        print(json.dumps({'authKey': val}, ensure_ascii=False) if args.json else val)
    return 0


if __name__ == '__main__':
    sys.exit(main())
