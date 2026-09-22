#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
m3u8_probe.py — HLS 播放列表解析与「加密发生在哪一层」判定

先跑这个，再读 JS。本工具回答四个问题：
  1. 这是 master 还是 media 列表（拿错层会得出「没有加密」的错误结论）
  2. 属于 A 层（容器层 AES-128）还是 C 层（SAMPLE-AES，样本级）还是 B/E 层（列表里没有 KEY）
  3. key 的 URI / IV 是什么；**IV 缺省时按 EXT-X-MEDIA-SEQUENCE 推出每片的 IV**
  4. （--fetch-keys）拉回 key 并报出它的**形态**（16 字节原始 / 32 字符 hex / base64）

用法：
  python m3u8_probe.py --selftest
  python m3u8_probe.py <playlist.m3u8> --pretty
  python m3u8_probe.py <playlist.m3u8> --fetch-keys -o keys.json
  python m3u8_probe.py <playlist.m3u8> --only-layer
退出码：0 成功；1 参数/IO 错误；2 自检失败。
"""

import argparse
import base64
import binascii
import json
import os
import re
import sys

KEY_RE = re.compile(r'^#EXT-X-KEY:(.*)$')
ATTR_RE = re.compile(r'([A-Z0-9\-]+)=("[^"]*"|[^,]*)')


def parse_attrs(s: str) -> dict:
    out = {}
    for k, v in ATTR_RE.findall(s):
        v = v.strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        out[k] = v
    return out


def parse_playlist(text: str) -> dict:
    """把 m3u8 文本解析成结构化字典（状态机式：EXT-X-KEY 作用于其后所有分片）。"""
    lines = [ln.strip() for ln in text.replace('\r\n', '\n').replace('\r', '\n').split('\n')]
    if not any(ln.startswith('#EXTM3U') for ln in lines):
        # 不抛异常：很多站点的 m3u8 被包了 BOM 或前后有噪声
        pass
    res = {
        'is_master': False,
        'is_media': False,
        'variants': [],
        'segments': [],
        'key_states': [],          # 每次 EXT-X-KEY 变化都记一条
        'maps': [],
        'media_sequence': 0,
        'target_duration': None,
        'discontinuities': 0,
        'has_endlist': False,
        'unknown_tags': [],
    }
    cur_key = None
    idx = 0
    pending_stream_inf = None      # master 用：EXT-X-STREAM-INF 的下一行 URI 是 variant
    pending_extinf = None          # media 用：EXTINF 的下一行 URI 是分片
    for ln in lines:
        if not ln:
            continue
        if ln.startswith('#EXT-X-STREAM-INF:'):
            res['is_master'] = True
            pending_stream_inf = parse_attrs(ln.split(':', 1)[1])
            continue
        if ln.startswith('#EXT-X-KEY:'):
            attrs = parse_attrs(ln.split(':', 1)[1])
            cur_key = attrs
            res['key_states'].append({'index': len(res['key_states']), 'attrs': attrs,
                                      'from_segment': idx})
            continue
        if ln.startswith('#EXT-X-MEDIA-SEQUENCE:'):
            res['media_sequence'] = int(ln.split(':', 1)[1].strip() or 0)
            continue
        if ln.startswith('#EXT-X-TARGETDURATION:'):
            res['target_duration'] = float(ln.split(':', 1)[1].strip() or 0)
            continue
        if ln.startswith('#EXT-X-MAP:'):
            res['maps'].append(parse_attrs(ln.split(':', 1)[1]))
            continue
        if ln.startswith('#EXT-X-DISCONTINUITY'):
            res['discontinuities'] += 1
            continue
        if ln.startswith('#EXT-X-ENDLIST'):
            res['has_endlist'] = True
            continue
        if ln.startswith('#EXTINF'):
            pending_extinf = {}
            continue
        if ln.startswith('#'):
            if ln.startswith('#EXT'):
                res['unknown_tags'].append(ln.split(':', 1)[0])
            continue
        # 非 # 行 = URI
        if pending_stream_inf is not None:
            res['variants'].append({'uri': ln, 'attrs': pending_stream_inf})
            pending_stream_inf = None
        else:
            res['is_media'] = True
            res['segments'].append({
                'index': idx,
                'uri': ln,
                'media_seq': res['media_sequence'] + idx,
                'key': cur_key,
                'extinf': pending_extinf,
            })
            pending_extinf = None
            idx += 1
    return res


def iv_from_media_seq(seq: int) -> str:
    """HLS 规定：EXT-X-KEY 未给 IV 时，用分片的媒体序列号作为 16 字节大端整数 IV。"""
    return (seq & ((1 << 128) - 1)).to_bytes(16, 'big').hex()


def classify(pl: dict) -> dict:
    """返回分层结论 + 理由。判据集中在 references/hls-and-ts-structure.md §1。"""
    if pl['is_master'] and not pl['segments']:
        return {
            'layer': 'MASTER',
            'confident': True,
            'reason': '这是 master 列表（含 EXT-X-STREAM-INF，无分片）。'
                      '必须再请求每个 variant 的 URI 才能看到真正的 EXT-X-KEY——'
                      '在此层下结论「没有加密」是错的。',
            'next': '对每个 variants[].uri 再跑一次本工具',
        }

    keys = [k['attrs'] for k in pl['key_states']]
    methods = [k.get('METHOD', '') for k in keys]
    if not keys:
        return {
            'layer': 'B-or-E',
            'confident': False,
            'reason': '列表里没有任何 EXT-X-KEY（也没有 EXT-X-MAP）。'
                      '加密不在这层，key 来自 JS 派生（B 层）或 DRM 许可证（E 层）。',
            'next': '搜 JS 的 decryptdata / decryptkey / DRMKey / GetLicense；跑 license_parse.py',
        }
    if any(m == 'SAMPLE-AES' for m in methods):
        return {
            'layer': 'C',
            'confident': True,
            'reason': 'METHOD=SAMPLE-AES ⇒ 样本级加密，不是整片加密。整片解密必然花屏。',
            'next': 'ts_probe.py 看 PES / NAL 分层；或转 E 层（多数 SAMPLE-AES 配 CENC/KID）',
        }
    if any('KEYFORMAT' in k for k in keys):
        return {
            'layer': 'E',
            'confident': True,
            'reason': 'EXT-X-KEY 带 KEYFORMAT（DRM 系统标识）⇒ DRM 许可证体系。',
            'next': 'references/license-and-key-hierarchy.md',
        }
    if any(m == 'NONE' for m in methods):
        # METHOD=NONE 是**标准值**（表示该段不加密），单独出现时不是「容器层加密」。
        # 旧版把 NONE 归进「非标准值 ⇒ A?」，会让「整份列表都不加密」也被报成「有加密」。
        enc_methods = [m for m in methods if m and m != 'NONE']
        if not enc_methods:
            return {
                'layer': 'PLAIN',
                'confident': True,
                'reason': '只有 METHOD=NONE（HLS 标准值，表示不加密）⇒ 这份列表本身没有加密。'
                          '若视频仍不可播，加密必然在 B/C/E 层（看 JS 或 NALU），不要在这层找 key。',
                'next': 'ts_probe.py <seg.ts> 看 PES/NAL；或搜 JS 的 decryptdata / GetLicense',
            }
        return {
            'layer': 'A',
            'confident': True,
            'reason': '含 METHOD=NONE 段 ⇒ 有明文广告/插播段。**不要**把 NONE 之后的分片也解密。',
            'next': 'media_crypto.py aes-cbc（按 key_states 分段处理）',
        }

    # ---- 厂商扩展 METHOD（非 HLS 标准值，但有明确实测语义）----
    # 判据来源：B14 蒸馏（52pojie-1688088 某 CTO 阿里云播放器实测 m3u8 样本）。
    # 这一类**不是** A 层（整片 AES-128-CBC）也不必然是 D 层，单独成族以免被当成「未知」。
    VENDOR_METHODS = {
        'AES-128-ECB': ('C', 'METHOD=AES-128-ECB ⇒ ECB 模式 + 无 IV。'
                             '常见两种覆盖范围：整片 ES，或 PES 载荷。'
                             'ECB 无 IV ⇒ 不要用 AES-CBC 解（会静默解错，不报错）。'),
        'AES-128-PES': ('C', 'METHOD=AES-128-PES ⇒ 加密覆盖 **PES 载荷**而非整片。'
                             '按整片 AES-CBC 解必然花屏；TS 包头/PES 头保持明文。'),
        'AES-256': ('A', 'METHOD=AES-256 ⇒ 容器层整片加密，但密钥 32 字节而非 16。'
                         '用 aes-cbc 时必须给 64 位 hex key，给 32 位会静默用错长度。'),
        'AES-128-CTR': ('A', 'METHOD=AES-128-CTR ⇒ 容器层，但模式是 CTR。'
                             'CTR 不使用 padding，且 IV 是计数器初值 ⇒ 别套 CBC 的 PKCS7 处理。'),
        'SM4-CBC': ('A', 'METHOD=SM4-CBC ⇒ 国密容器层整片加密。用 media_crypto.py sm4-cbc。'),
        'SM4-ECB': ('A', 'METHOD=SM4-ECB ⇒ 国密 ECB，无 IV；注意 SM4 密文长度必须是 16 的倍数。'),
    }
    for m in methods:
        if m in VENDOR_METHODS:
            layer, why = VENDOR_METHODS[m]
            return {
                'layer': layer,
                'confident': True,
                'vendor_method': m,
                'reason': why,
                'next': ('media_crypto.py aes-ecb / sm4-*；覆盖范围不确定时先 ts_probe.py 看 NAL 分层'
                         if layer == 'C' else 'media_crypto.py 按该模式解；先用单分片跑 ffmpeg 闭环'),
            }
    if any(m == 'AES-128' for m in methods):
        multi = len({k.get('URI') for k in keys}) > 1
        return {
            'layer': 'A',
            'confident': True,
            'reason': 'METHOD=AES-128 + URI ⇒ 容器层整片加密。'
                      + ('存在多个不同 URI，说明中途换 key。' if multi else ''),
            'next': '--fetch-keys 取回 key，media_crypto.py aes-cbc 解分片',
        }
    return {
        'layer': 'A?',
        'confident': False,
        'reason': '有 EXT-X-KEY 但 METHOD 是 %s，非标准值。' % methods,
        'next': '人工确认 METHOD 语义',
    }


def fetch_key(uri: str, timeout=15) -> dict:
    """拉回 key 并判定形态。形态判错是 A 层最常见的静默错误。"""
    import urllib.request
    req = urllib.request.Request(uri, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    info = {'uri': uri, 'bytes': len(raw), 'raw_hex': raw.hex()}
    if len(raw) == 16:
        info['form'] = 'raw16'
        info['key_hex'] = raw.hex()
        info['note'] = '16 字节原始密钥，直接当 key 用'
    else:
        try:
            txt = raw.decode('ascii').strip()
        except UnicodeDecodeError:
            info['form'] = 'binary-unknown'
            info['note'] = '非 ASCII 且非 16 字节，需要人工确认'
            return info
        if len(txt) == 32 and all(c in '0123456789abcdefABCDEF' for c in txt):
            info['form'] = 'hex-text'
            info['key_hex'] = txt.lower()
            info['note'] = '32 字符 hex 文本 → 解码为 16 字节后使用（不要直接把文本当 key）'
        elif len(txt) == 16:
            info['form'] = 'ascii16'
            info['key_utf8'] = txt
            info['note'] = '16 个 ASCII 字符：可能是**明文密钥**，也可能是被当文本渲染的原始密钥'
        else:
            pad = txt + '=' * (-len(txt) % 4)
            try:
                b = base64.b64decode(pad, validate=True)
                info['form'] = 'base64'
                info['key_hex'] = b.hex()
                info['note'] = 'base64 解码后 %d 字节' % len(b)
            except Exception:
                info['form'] = 'unknown'
                info['note'] = '既不是 16 字节、也不是 32 位 hex、也不是 base64'
    return info


def probe(path_or_text: str, fetch=False) -> dict:
    if os.path.exists(path_or_text):
        with open(path_or_text, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
        source = path_or_text
    else:
        text = path_or_text
        source = '<inline>'
    pl = parse_playlist(text)
    verdict = classify(pl)

    # IV 推导
    ivs = []
    for seg in pl['segments'][:8]:
        k = seg['key'] or {}
        if k.get('IV'):
            iv = k['IV'].lower().replace('0x', '')
            src = 'from-key'
        elif k:
            iv = iv_from_media_seq(seg['media_seq'])
            src = 'derived-media-seq'
        else:
            iv, src = None, 'no-key'
        ivs.append({'segment': seg['index'], 'media_seq': seg['media_seq'],
                    'iv_hex': iv, 'iv_source': src})

    out = {
        'source': source,
        'is_master': pl['is_master'],
        'is_media': pl['is_media'],
        'segment_count': len(pl['segments']),
        'variant_count': len(pl['variants']),
        'media_sequence': pl['media_sequence'],
        'target_duration': pl['target_duration'],
        'discontinuities': pl['discontinuities'],
        'has_endlist': pl['has_endlist'],
        'key_states': pl['key_states'],
        'iv_plan': ivs,
        'unknown_tags': sorted(set(pl['unknown_tags'])),
        'variants': pl['variants'][:10],
        'verdict': verdict,
    }
    if fetch:
        fetched = []
        seen = set()
        for k in pl['key_states']:
            uri = k['attrs'].get('URI')
            if not uri or uri in seen:
                continue
            seen.add(uri)
            try:
                fetched.append(fetch_key(uri))
            except Exception as e:                            # noqa: BLE001
                fetched.append({'uri': uri, 'error': '%s: %s' % (type(e).__name__, e)})
        out['keys'] = fetched
    return out


# ---------------------------------------------------------------------------

SAMPLE_MEDIA = """#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-KEY:METHOD=AES-128,URI="https://x/k",IV=0x000102030405060708090a0b0c0d0e0f
#EXTINF:10.0,
seg0.ts
#EXT-X-DISCONTINUITY
#EXT-X-KEY:METHOD=AES-128,URI="https://x/k2"
#EXTINF:10.0,
seg1.ts
#EXTINF:10.0,
seg2.ts
#EXT-X-ENDLIST
"""

SAMPLE_MASTER = """#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8
"""

SAMPLE_NOKEY = """#EXTM3U
#EXT-X-TARGETDURATION:6
#EXTINF:6.0,
a.ts
#EXTINF:6.0,
b.ts
"""

SAMPLE_DRM = """#EXTM3U
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://x",KEYFORMAT="com.apple.streamingkeydelivery",KEYFORMATVERSIONS="1"
#EXTINF:6.0,
c.ts
"""


def _selftest() -> int:
    fails, total = [], 0

    def check(name, cond, extra=''):
        nonlocal total
        total += 1
        if not cond:
            fails.append('%s %s' % (name, extra))

    # --- 解析正确性 ---
    pl = parse_playlist(SAMPLE_MEDIA)
    check('解析出 3 个分片', len(pl['segments']) == 3, str(len(pl['segments'])))
    check('媒体序列号为 100', pl['media_sequence'] == 100)
    check('识别 2 次 KEY 状态', len(pl['key_states']) == 2)
    check('识别 DISCONTINUITY', pl['discontinuities'] == 1)
    check('识别 ENDLIST', pl['has_endlist'] is True)
    check('第一片带 IV（来自 KEY）', pl['segments'][0]['key']['IV'] == '0x000102030405060708090a0b0c0d0e0f')
    check('KEY 状态是「作用于其后所有分片」',
          pl['segments'][1]['key']['URI'] == 'https://x/k2' and pl['segments'][2]['key']['URI'] == 'https://x/k2')

    # --- 缺省 IV 推导（B 层最常见的静默错误） ---
    check('缺省 IV 用媒体序列号（seg1 → 101）',
          iv_from_media_seq(pl['segments'][1]['media_seq']) ==
          '00000000000000000000000000000065', iv_from_media_seq(pl['segments'][1]['media_seq']))
    check('缺省 IV 用媒体序列号（seg2 → 102）',
          iv_from_media_seq(pl['segments'][2]['media_seq']) ==
          '00000000000000000000000000000066')
    check('IV 推导顺序正确（seg0 用显式 IV，seg1/seg2 用推导）',
          [x['iv_source'] for x in probe(SAMPLE_MEDIA)['iv_plan']] ==
          ['from-key', 'derived-media-seq', 'derived-media-seq'])

    # --- 分层判据 ---
    check('A 层：AES-128 + URI', classify(pl)['layer'] == 'A', str(classify(pl)))
    check('A 层会提示多个 URI（换 key）', '换 key' in classify(pl)['reason'])
    check('MASTER 层不下加密结论', classify(parse_playlist(SAMPLE_MASTER))['layer'] == 'MASTER')
    check('无 KEY ⇒ B-or-E 且不自信',
          classify(parse_playlist(SAMPLE_NOKEY))['layer'] == 'B-or-E'
          and classify(parse_playlist(SAMPLE_NOKEY))['confident'] is False)
    check('SAMPLE-AES ⇒ C 层', classify(parse_playlist(SAMPLE_DRM))['layer'] == 'C')
    check('KEYFORMAT ⇒ E 层',
          classify(parse_playlist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k",'
                                  'KEYFORMAT="urn:uuid:edef8ba9"\n#EXTINF:6.0,\na.ts\n'))['layer'] == 'E')
    check('METHOD=NONE 混用 ⇒ A 层且提示不要全解',
          '不要' in classify(parse_playlist(
              '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:6.0,\na.ts\n'
              '#EXT-X-KEY:METHOD=NONE\n#EXTINF:6.0,\nb.ts\n'))['reason'])
    # --- 厂商扩展 METHOD（B14 新增：旧版一律落到「非标准值 ⇒ A?」，会把语义完全不同的一族混在一起）---
    def _cls(method):
        return classify(parse_playlist(
            '#EXTM3U\n#EXT-X-KEY:METHOD=%s,URI="k",IV=0x00\n#EXTINF:6.0,\na.ts\n' % method))
    check('只有 METHOD=NONE ⇒ PLAIN（不是「有加密」）', _cls('NONE')['layer'] == 'PLAIN', str(_cls('NONE')))
    check('AES-128-PES ⇒ C 层（覆盖 PES 载荷，不是整片）',
          _cls('AES-128-PES')['layer'] == 'C', str(_cls('AES-128-PES')))
    check('AES-128-ECB ⇒ C 层且提示不要用 AES-CBC 解',
          _cls('AES-128-ECB')['layer'] == 'C' and 'CBC' in _cls('AES-128-ECB')['reason'])
    check('AES-256 ⇒ A 层且提示 key 是 32 字节',
          _cls('AES-256')['layer'] == 'A' and '32' in _cls('AES-256')['reason'])
    check('AES-128-CTR ⇒ A 层且提示 CTR 不用 padding',
          _cls('AES-128-CTR')['layer'] == 'A' and 'padding' in _cls('AES-128-CTR')['reason'])
    check('SM4-CBC ⇒ A 层', _cls('SM4-CBC')['layer'] == 'A')
    check('未知 METHOD 仍落 A? 且标记不自信',
          _cls('FOO-BAR')['layer'] == 'A?' and _cls('FOO-BAR')['confident'] is False)
    check('厂商 METHOD 会回填 vendor_method 字段供程序化分支',
          _cls('AES-128-PES').get('vendor_method') == 'AES-128-PES')

    # --- 变体列表 ---
    mpl = parse_playlist(SAMPLE_MASTER)
    check('master 解析出 2 个 variant', len(mpl['variants']) == 2)
    check('variant 属性解析正确', mpl['variants'][1]['attrs']['RESOLUTION'] == '640x360')

    # --- 畸形输入不得抛异常 ---
    for bad in ('', '#EXTM3U\n', 'not a playlist at all', '#EXTM3U\r\n#EXTINF:1,\r\na.ts\r\n'):
        try:
            probe(bad)
            check('畸形输入不抛异常：%r' % bad[:16], True)
        except Exception as e:                                # noqa: BLE001
            check('畸形输入不抛异常：%r' % bad[:16], False, str(e))
    check('非 playlist 文本得到 B-or-E（而不是崩）',
          probe('hello world')['verdict']['layer'] == 'B-or-E')

    # --- key 形态判定（不打网络：直接核对 16/32hex/16ascii 三形态的分支） ---
    check('media_seq → IV 是 16 字节大端', len(iv_from_media_seq(7)) == 32)
    check('media_seq=0 的 IV 为全零',
          iv_from_media_seq(0) == '0' * 32)
    check('attribute 解析支持引号内逗号',
          parse_attrs('METHOD=AES-128,URI="http://a/b?x=1,y=2"')['URI'] == 'http://a/b?x=1,y=2')

    print('m3u8_probe 自检：%d 项，失败 %d 项' % (total, len(fails)))
    for f in fails:
        print('  FAIL ' + f)
    return 1 if fails else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description='m3u8 解析与分层判定')
    ap.add_argument('target', nargs='?', help='m3u8 文件路径（也可传 http(s) URL）')
    ap.add_argument('--pretty', action='store_true')
    ap.add_argument('--fetch-keys', action='store_true')
    ap.add_argument('--only-layer', action='store_true')
    ap.add_argument('-o', '--out')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()
    if not args.target:
        ap.print_help()
        return 1
    try:
        target = args.target
        if re.match(r'^https?://', target):
            import urllib.request
            req = urllib.request.Request(target, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=20) as r:
                text = r.read().decode('utf-8', 'replace')
            res = probe(text, fetch=args.fetch_keys)
            res['source'] = target
        else:
            res = probe(target, fetch=args.fetch_keys)
    except (IOError, OSError) as e:
        print('ERROR 读取失败：%s' % e, file=sys.stderr)
        return 1
    except Exception as e:                                    # noqa: BLE001
        print('ERROR %s: %s' % (type(e).__name__, e), file=sys.stderr)
        return 1

    if args.only_layer:
        v = res['verdict']
        print('%s\t%s\t%s' % (v['layer'], 'confident' if v['confident'] else 'uncertain', v['reason']))
    else:
        text = json.dumps(res, ensure_ascii=False, indent=2) if args.pretty else json.dumps(res, ensure_ascii=False)
        print(text)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=2)
        print('已写出 %s' % args.out, file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())