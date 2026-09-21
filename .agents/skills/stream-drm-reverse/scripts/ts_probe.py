#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ts_probe.py — MPEG-TS 解复用：PAT/PMT/PES/ES(NALU) 分层、CRC16 探针、逐 NALU 解密

回答 C 层（ES/NALU 逐帧加密）必须搞清的几件事：
  1. 包结构是否规整（188 对齐、同步字节 0x47）
  2. PAT / PMT：哪个 PID 是视频、哪个是音频；**PMT 描述符里有没有 `service_name`（DRM 模式串常藏这里）**
  3. PES 头长度与 payload 边界 —— 决定「从第几个字节开始是密文」
  4. ES/NALU 切分：NAL 头是否明文、**尾部 2 字节 CRC16 属于哪个变体**（厂商多项式未知时不要猜）
  5. 逐 NALU 解密并原样写回 TS（长度不变时）；长度变化时明确拒绝，改为输出 annex-B ES

**关键顺序（写反会静默出错）**：切 NAL → 保留 NAL 头 → 去防竞争字节 → CRC 校验 → 解密 → 再校验。

用法：
  python ts_probe.py --selftest
  python ts_probe.py <seg.ts> --pretty
  python ts_probe.py <seg.ts> --nalu --pid 256 --pretty
  python ts_probe.py <seg.ts> --es-out seg.es --pid 256
  python ts_probe.py <seg.ts> --decrypt-nalu --out seg.clear.ts --pid 256 \
      --cipher dcm --key-hex <hex> --iv-hex <hex> --crc16
退出码：0 成功；1 参数/IO 错误；2 自检失败。
"""

import argparse
import binascii
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from media_crypto import (AES, SM4, mode_cbc, mode_ctr, mode_dcm, crc16_probe,
                              parse_key, read_bytes, write_bytes, strip_crc16)
except ImportError as _e:                                     # pragma: no cover
    print('ERROR 需要与 media_crypto.py 同目录：%s' % _e, file=sys.stderr)
    raise

TS_PACKET = 188
TS_SYNC = 0x47


# ---------------------------------------------------------------------------
# TS 层
# ---------------------------------------------------------------------------

def packet_info(p: bytes) -> dict:
    if len(p) < 188 or p[0] != TS_SYNC:
        return {'valid': False}
    pid = ((p[1] & 0x1F) << 8) | p[2]
    pusi = bool(p[1] & 0x40)
    afc = (p[3] >> 4) & 0x03
    cc = p[3] & 0x0F
    poff = 4
    if afc & 0x02:
        poff = 5 + p[4]
    has_payload = bool(afc & 0x01) and poff < TS_PACKET
    return {'valid': True, 'pid': pid, 'pusi': pusi, 'afc': afc, 'cc': cc,
            'payload_off': poff, 'has_payload': has_payload}


def iter_packets(data: bytes):
    n = len(data) // TS_PACKET
    for i in range(n):
        off = i * TS_PACKET
        yield off, data[off:off + TS_PACKET]


def ts_overview(data: bytes) -> dict:
    n = len(data) // TS_PACKET
    bad_sync = 0
    pids = {}
    for off, p in iter_packets(data):
        info = packet_info(p)
        if not info['valid']:
            bad_sync += 1
            continue
        pids.setdefault(info['pid'], 0)
        pids[info['pid']] += 1
    return {
        'bytes': len(data),
        'packet_count': n,
        'remainder': len(data) - n * TS_PACKET,
        'bad_sync_packets': bad_sync,
        'pid_histogram': dict(sorted(pids.items(), key=lambda kv: -kv[1])[:12]),
        'note': ('包结构规整' if bad_sync == 0 and len(data) % TS_PACKET == 0
                 else '⚠️ 存在坏同步包或尾部余数：可能是整片加密、或前置/后置附加数据'),
    }


# ---------------------------------------------------------------------------
# PSI（PAT / PMT）
# ---------------------------------------------------------------------------

def _psi_section(payload: bytes) -> bytes:
    """去掉 pointer_field 后返回完整 section（不做跨包拼接）。"""
    if not payload:
        return b''
    ptr = payload[0]
    start = 1 + ptr
    if start + 3 > len(payload):
        return b''
    sect_len = ((payload[start + 1] & 0x0F) << 8) | payload[start + 2]
    end = start + 3 + sect_len
    return payload[start:min(end, len(payload))]


def _parse_descriptors(buf: bytes):
    out = []
    i = 0
    while i + 2 <= len(buf):
        tag, ln = buf[i], buf[i + 1]
        i += 2
        body = buf[i:i + ln]
        i += ln
        item = {'tag': '0x%02X' % tag, 'len': ln, 'ascii': _printable(body)}
        if tag == 0x48 and ln >= 3:                            # service_descriptor
            p = body[1]
            prov = body[2:2 + p]
            k = p + 2
            n2 = body[k] if k < len(body) else 0
            name = body[k + 1:k + 1 + n2]
            item['service_provider'] = _printable(prov)
            item['service_name'] = _printable(name)
        out.append(item)
    return out


def _printable(b: bytes) -> str:
    return ''.join(chr(c) if 32 <= c < 127 else '' for c in b)


def parse_psi(data: bytes) -> dict:
    """扫一遍抓 PAT 与 PMT（只取每个 section 的首包，足够用于判层与取 service_name）。"""
    pat_programs = []
    pmt_raw = {}
    pmt_pids = set()
    for off, p in iter_packets(data):
        info = packet_info(p)
        if not info['valid'] or not info['has_payload']:
            continue
        pl = p[info['payload_off']:]
        if info['pid'] == 0 and not pat_programs:
            s = _psi_section(pl)
            if len(s) >= 8 and s[0] == 0x00:
                i = 8
                end = 3 + (((s[1] & 0x0F) << 8) | s[2]) - 4
                while i + 4 <= min(end, len(s)):
                    prog = (s[i] << 8) | s[i + 1]
                    pid = ((s[i + 2] & 0x1F) << 8) | s[i + 3]
                    if prog:
                        pat_programs.append({'program_number': prog, 'pmt_pid': pid})
                        pmt_pids.add(pid)
                    i += 4
            continue
        if info['pid'] in pmt_pids and info['pid'] not in pmt_raw:
            s = _psi_section(pl)
            if s and s[0] == 0x02:
                pmt_raw[info['pid']] = s

    pmts = []
    for pid, s in pmt_raw.items():
        if len(s) < 12:
            continue
        pinfo_len = ((s[10] & 0x0F) << 8) | s[11]
        pinfo = s[12:12 + pinfo_len]
        streams = []
        i = 12 + pinfo_len
        end = 3 + (((s[1] & 0x0F) << 8) | s[2]) - 4
        while i + 5 <= min(end, len(s)):
            stype = s[i]
            epid = ((s[i + 1] & 0x1F) << 8) | s[i + 2]
            esinfo_len = ((s[i + 3] & 0x0F) << 8) | s[i + 4]
            esinfo = s[i + 5:i + 5 + esinfo_len]
            streams.append({'stream_type': '0x%02X' % stype,
                            'elementary_pid': epid,
                            'kind': STREAM_TYPES.get(stype, 'unknown'),
                            'descriptors': _parse_descriptors(esinfo)})
            i += 5 + esinfo_len
        pmts.append({'pmt_pid': pid,
                     'program_descriptors': _parse_descriptors(pinfo),
                     'streams': streams})
    return {'pat': pat_programs, 'pmts': pmts}


STREAM_TYPES = {
    0x01: 'video/mpeg2', 0x02: 'video/mpeg2', 0x1B: 'video/h264',
    0x24: 'video/hevc', 0x10: 'video/mpeg4', 0x03: 'audio/mp2',
    0x04: 'audio/mp2', 0x0F: 'audio/aac', 0x11: 'audio/aac-latm',
    0x06: 'private-data', 0x05: 'private-sections', 0x81: 'audio/ac3',
}


def extract_service_names(psi: dict):
    """从 PMT 的程序描述符里捞出 service_name（`mdcm|...` 就在这）与所有可打印串。"""
    names, blobs = [], []
    for pmt in psi['pmts']:
        for d in pmt['program_descriptors']:
            if d.get('service_name'):
                names.append(d['service_name'])
            if d.get('ascii') and len(d['ascii']) >= 4:
                blobs.append(d['ascii'])
    return names, sorted(set(blobs))


# ---------------------------------------------------------------------------
# PES / ES
# ---------------------------------------------------------------------------

def collect_es(data: bytes, pid: int) -> dict:
    """返回该 PID 的 ES 字节、以及「ES 字节 → 文件偏移」的映射（用于原样写回）。"""
    ranges = []
    pes_headers = []
    for off, p in iter_packets(data):
        info = packet_info(p)
        if not info['valid'] or not info['has_payload'] or info['pid'] != pid:
            continue
        pl = p[info['payload_off']:]
        base = off + info['payload_off']
        if info['pusi']:
            if len(pl) >= 9 and pl[0] == 0 and pl[1] == 0 and pl[2] == 1:
                hdr_len = pl[8]
                es_start = 9 + hdr_len
                pes_headers.append({
                    'file_offset': off,
                    'stream_id': '0x%02X' % pl[3],
                    'stream_kind': ('video' if 0xE0 <= pl[3] <= 0xEF
                                    else 'audio' if 0xC0 <= pl[3] <= 0xDF else 'other'),
                    'pes_packet_length': (pl[4] << 8) | pl[5],
                    'es_start_in_payload': es_start,
                })
                if es_start < len(pl):
                    ranges.append((base + es_start, len(pl) - es_start))
                continue
        ranges.append((base, len(pl)))
    es = b''.join(data[o:o + n] for o, n in ranges)
    # TS 包用 0xFF 填充到 188 字节，PES_packet_length 才是真实长度。
    # 不按声明长度裁剪，尾部填充会被当 ES（表现为「多出一大段 0xFF」）。
    declared = None
    if len(pes_headers) == 1 and pes_headers[0]['pes_packet_length'] > 0:
        hdr_data_len = pes_headers[0]['es_start_in_payload'] - 9
        declared = pes_headers[0]['pes_packet_length'] - 3 - hdr_data_len
    if declared is not None and 0 < declared < len(es):
        es = es[:declared]
        trimmed, remain = [], declared
        for o, n in ranges:
            if remain <= 0:
                break
            take = min(n, remain)
            trimmed.append((o, take))
            remain -= take
        ranges = trimmed
    return {'es': es, 'ranges': ranges, 'pes_headers': pes_headers, 'es_len': len(es),
            'declared_es_len': declared}


# ---------------------------------------------------------------------------
# NALU
# ---------------------------------------------------------------------------

def split_nals(es: bytes, hevc=False) -> list:
    starts = []
    i = 0
    while True:
        j = es.find(b'\x00\x00\x01', i)
        if j < 0:
            break
        sc = 3
        if j >= 1 and es[j - 1] == 0:
            sc = 4
            j -= 1
        starts.append((j, sc))
        i = j + sc
    nals = []
    hdr_len = 2 if hevc else 1
    for k, (j, sc) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(es)
        hs = j + sc
        if hs + hdr_len > end:
            continue
        hdr = es[hs:hs + hdr_len]
        if hevc:
            ntype = (hdr[0] >> 1) & 0x3F
        else:
            ntype = hdr[0] & 0x1F
        nals.append({
            'index': k,
            'start': j, 'start_code_len': sc,
            'header': hdr.hex(),
            'nal_type': ntype,
            'nal_type_name': (HEVC_NAL.get(ntype, '?') if hevc else H264_NAL.get(ntype, '?')),
            'header_offset': hs,
            'payload_offset': hs + hdr_len,
            'payload_end': end,
            'payload_len': end - (hs + hdr_len),
        })
    return nals


H264_NAL = {1: 'non-IDR slice', 5: 'IDR slice', 6: 'SEI', 7: 'SPS', 8: 'PPS',
            9: 'AUD', 10: 'end-of-seq', 11: 'end-of-stream', 12: 'filler'}
HEVC_NAL = {0: 'TRAIL_N', 1: 'TRAIL_R', 19: 'IDR_W_RADL', 20: 'IDR_N_LP',
            32: 'VPS', 33: 'SPS', 34: 'PPS', 39: 'SEI'}


def nal_unescape(b: bytes) -> bytes:
    """去掉防竞争字节 00 00 03 中的 03。**必须在解密之前做。**"""
    out = bytearray()
    i, n = 0, len(b)
    while i < n:
        if i + 2 < n and b[i] == 0 and b[i + 1] == 0 and b[i + 2] == 3:
            out += b'\x00\x00'
            i += 3
        else:
            out.append(b[i])
            i += 1
    return bytes(out)


def nal_escape(b: bytes) -> bytes:
    """重新插入防竞争字节（解密后写回时用）。"""
    out = bytearray()
    zeros = 0
    for x in b:
        if zeros >= 2 and x <= 0x03:
            out.append(0x03)
            zeros = 0
        out.append(x)
        zeros = zeros + 1 if x == 0 else 0
    return bytes(out)


NALU_HIST_KEYS = ('nal_type_name',)


def nalu_report(data: bytes, pid: int, hevc=False, crc=True, limit=40) -> dict:
    col = collect_es(data, pid)
    nals = split_nals(col['es'], hevc)
    hist = {}
    items = []
    for nl in nals:
        hist[nl['nal_type_name']] = hist.get(nl['nal_type_name'], 0) + 1
    for nl in nals[:limit]:
        item = {k: v for k, v in nl.items()}
        if crc and nl['payload_len'] >= 3:
            body = col['es'][nl['payload_offset']:nl['payload_end']]
            item['crc16'] = crc16_probe(body)
        items.append(item)
    return {
        'pid': pid,
        'es_len': col['es_len'],
        'pes_header_count': len(col['pes_headers']),
        'nal_count': len(nals),
        'nal_type_histogram': hist,
        'nals': items,
        'note': 'NAL 头为明文、payload 高熵 ⇒ 逐 NALU 加密的特征；'
                'crc16.matched=True 的变体即该目标的校验多项式',
    }


# ---------------------------------------------------------------------------
# 逐 NALU 解密
# ---------------------------------------------------------------------------

def _make_cipher(cipher: str, key: bytes):
    if cipher == 'dcm' or cipher.startswith('aes'):
        return AES(key)
    if cipher.startswith('sm4'):
        return SM4(key)
    raise ValueError('未知 cipher：%s' % cipher)


def _crypt_nals(es: bytes, key: bytes, iv: bytes, cipher: str, hevc: bool,
                unescape: bool, dcm_params=None, decrypt=True, nals=None) -> tuple:
    """
    对每个 NALU 的 payload 独立加/解密（**每个 NALU 重置 IV** —— 与原实现一致：
    每次调用都 av_aes_ctr_alloc + set_full_iv）。

    `nals` 可传入**预先切好的边界**：CTR/dcm 这类保长密码下，解密方向可用加密方向的
    边界（长度不变 ⇒ 偏移不变），从而避免「密文里恰好出现 00 00 01 被当新 NAL」的干扰。

    返回 (新 ES, 每 NALU 明细, meta)。meta['boundary_stable'] 为 False 时说明输出里
    NAL 边界数量变了 —— 几乎总是「加密后没做 nal_escape」造成的**伪 NAL 边界**。
    """
    nals = nals if nals is not None else split_nals(es, hevc)
    out = bytearray()
    cursor = 0
    details = []
    for nl in nals:
        out += es[cursor:nl['payload_offset']]
        raw = es[nl['payload_offset']:nl['payload_end']]
        work = nal_unescape(raw) if unescape else raw
        bc = _make_cipher(cipher, key)
        if cipher.endswith('cbc'):
            new = mode_cbc(bc, work, iv, decrypt=decrypt)
        elif cipher.endswith('ctr'):
            new = mode_ctr(bc, work, iv, decrypt=decrypt)
        elif cipher == 'dcm':
            p = dcm_params or {}
            new = mode_dcm(bc, work, iv, p.get('ctr_blocks', 1),
                           p.get('xor_blocks', 9), p.get('total_rounds', 10))
        else:
            raise ValueError('未知 cipher：%s' % cipher)
        if unescape:
            new = nal_escape(new)
        out += new
        cursor = nl['payload_end']
        details.append({'index': nl['index'], 'nal_type_name': nl['nal_type_name'],
                        'payload_len': len(raw), 'out_len': len(new),
                        'length_preserved': len(raw) == len(new)})
    out += es[cursor:]
    out = bytes(out)
    meta = {
        'boundary_stable': len(split_nals(out, hevc)) == len(nals),
        'cipher': cipher,
        'escaped': unescape,
    }
    return out, details, meta


def splice_es(data: bytes, ranges, new_es: bytes) -> bytes:
    """把新 ES 按原映射写回 TS 的对应字节区间（要求总长度不变）。"""
    total = sum(n for _, n in ranges)
    if len(new_es) != total:
        raise ValueError('ES 长度变化（%d → %d），无法原样写回 TS：'
                         '请用 --es-out 输出 annex-B ES，或按 references 里的 ffmpeg 接入点处理'
                         % (total, len(new_es)))
    buf = bytearray(data)
    pos = 0
    for off, n in ranges:
        buf[off:off + n] = new_es[pos:pos + n]
        pos += n
    return bytes(buf)


# ---------------------------------------------------------------------------
# 自检：合成一个结构完整的 TS（PAT + PMT + service_descriptor + 2 个 NALU）
# ---------------------------------------------------------------------------

def _mk_packet(pid: int, payload: bytes, pusi=True, cc=0) -> bytes:
    p = bytearray(188)
    p[0] = TS_SYNC
    p[1] = (0x40 if pusi else 0x00) | ((pid >> 8) & 0x1F)
    p[2] = pid & 0xFF
    p[3] = 0x10 | (cc & 0x0F)
    body = payload[:184]
    p[4:4 + len(body)] = body
    p[4 + len(body):188] = b'\xFF' * (184 - len(body))
    return bytes(p)


def _mk_pat(pmt_pid=0x100) -> bytes:
    sect = bytearray()
    sect += b'\x00'                       # table_id
    body = bytearray()
    body += b'\x00\x01'                   # program_number
    body += bytes([0xE0 | (pmt_pid >> 8), pmt_pid & 0xFF])
    # section_length = tsid(2)+ver(1)+sec(1)+last(1) + body + CRC(4)
    sect_len = 5 + len(body) + 4
    sect += bytes([0xB0 | ((sect_len >> 8) & 0x0F), sect_len & 0xFF])
    sect += b'\x00\x01'                   # transport_stream_id
    sect += b'\xC1'                       # version/current_next
    sect += b'\x00'                       # section_number
    sect += b'\x00'                       # last_section_number
    sect += body
    crc = b'\x00\x00\x00\x00'             # 合成样本不校验 CRC32
    return b'\x00' + bytes(sect) + crc    # 前置 pointer_field=0


def _mk_pmt(video_pid=0x101, service='mdcm|s1:9:10|a0|vd70b0e7a262f4cc52b667901eb2e8b9d|e1|f497006|') -> bytes:
    svc = service.encode('ascii')
    # service_descriptor(0x48)：service_type(1) + provider_len(1)+provider + name_len(1)+name
    desc = bytes([0x48, 3 + len(svc), 0x01, 0x00, len(svc)]) + svc
    pinfo = desc
    streams = bytearray()
    streams += bytes([0x1B, 0xE0 | (video_pid >> 8), video_pid & 0xFF])   # H.264
    streams += b'\x00\x00'                                                # ES_info_length=0
    body = bytearray()
    body += b'\x00\x01'                                                   # program_number
    body += b'\xC1\x00\x00'                                               # version/sec/last
    body += b'\xE0\x01'                                                   # PCR_PID（占位）
    body += bytes([0xE0 | (len(pinfo) >> 8), len(pinfo) & 0xFF])
    body += pinfo
    body += bytes(streams)
    sect_len = len(body) + 4
    sect = bytearray()
    sect += b'\x02'
    sect += bytes([0xB0 | ((sect_len >> 8) & 0x0F), sect_len & 0xFF])
    sect += body
    return b'\x00' + bytes(sect) + b'\x00\x00\x00\x00'


def _mk_pes(nal_bytes: bytes, stream_id=0xE0) -> bytes:
    pes_payload = b'\x80\x00\x00'          # flags + header_data_length=0
    hdr = b'\x00\x00\x01' + bytes([stream_id])
    body = pes_payload + nal_bytes
    length = len(pes_payload) + len(nal_bytes)
    return hdr + bytes([(length >> 8) & 0xFF, length & 0xFF]) + body


def _build_sample_ts() -> bytes:
    nals = (b'\x00\x00\x01' + b'\x65' + bytes(range(1, 33)) +
            b'\x00\x00\x01' + b'\x41' + bytes(range(33, 81)))
    pes = _mk_pes(nals)
    out = bytearray()
    out += _mk_packet(0x0000, _mk_pat())
    out += _mk_packet(0x0100, _mk_pmt())
    for i in range(0, len(pes), 184):
        out += _mk_packet(0x0101, pes[i:i + 184], pusi=(i == 0), cc=(i // 184) & 0x0F)
    return bytes(out)


def _selftest() -> int:
    fails, total = [], 0

    def check(name, cond, extra=''):
        nonlocal total
        total += 1
        if not cond:
            fails.append('%s %s' % (name, extra))

    data = _build_sample_ts()

    ov = ts_overview(data)
    check('TS 概览识别包数', ov['packet_count'] >= 3, str(ov))
    check('TS 包结构规整（无坏同步字节）', ov['bad_sync_packets'] == 0 and ov['remainder'] == 0)
    check('TS PID 直方图含 PID 0/256/257',
          {0, 256, 257} <= set(ov['pid_histogram']), str(ov['pid_histogram']))

    psi = parse_psi(data)
    check('解析出 PAT 一个 program', len(psi['pat']) == 1 and psi['pat'][0]['pmt_pid'] == 0x100, str(psi['pat']))
    check('解析出 PMT 一个流且为 H.264',
          len(psi['pmts']) == 1 and psi['pmts'][0]['streams'][0]['kind'] == 'video/h264',
          str(psi['pmts']))
    names, blobs = extract_service_names(psi)
    check('从 PMT 描述符取出 service_name',
          any(n.startswith('mdcm|') for n in names), str(names))
    check('service_name 内容完整（含 s/a/v 段）',
          any('s1:9:10' in n and 'vd70b0e7a262f4cc52b667901eb2e8b9d' in n for n in names), str(names))

    col = collect_es(data, 0x101)
    check('ES 非空', col['es_len'] > 0, str(col['es_len']))
    check('ES 按 PES_packet_length 裁剪（不含 TS 填充 0xFF）',
          col['es_len'] == col.get('declared_es_len'), '%s vs %s' % (col['es_len'], col.get('declared_es_len')))
    check('PES 头被识别（stream_id=0xE0，video）',
          len(col['pes_headers']) == 1 and col['pes_headers'][0]['stream_kind'] == 'video',
          str(col['pes_headers']))

    nals = split_nals(col['es'])
    check('切出 2 个 NALU', len(nals) == 2, str(len(nals)))
    check('NALU 类型识别（IDR=5 / non-IDR=1）',
          [n['nal_type'] for n in nals] == [5, 1], str([n['nal_type'] for n in nals]))
    check('NALU 头是明文（首个 payload 字节起为数据）', nals[0]['header'] == '65')
    check('NALU payload 长度正确', nals[0]['payload_len'] == 32 and nals[1]['payload_len'] == 48,
          '%d/%d' % (nals[0]['payload_len'], nals[1]['payload_len']))

    rep = nalu_report(data, 0x101)
    check('NALU 报告给出类型直方图', rep['nal_type_histogram'].get('IDR slice') == 1, str(rep['nal_type_histogram']))
    check('NALU 报告带 CRC16 探针结果', 'crc16' in rep['nals'][0])

    # --- 防竞争字节 ---
    check('nal_unescape 去掉 00 00 03',
          nal_unescape(b'\x00\x00\x03\x01\x00\x00\x03\x02') == b'\x00\x00\x01\x00\x00\x02')
    check('nal_escape 插回 00 00 03',
          nal_escape(b'\x00\x00\x01\x00\x00\x02') == b'\x00\x00\x03\x01\x00\x00\x03\x02')
    check('escape/unescape 往返',
          all(nal_unescape(nal_escape(x)) == x for x in
              (b'\x00\x00\x00', b'\x00\x00\x03', b'\x12\x00\x00\x00', b'\x00\x00\x12\x00\x00\x00')))
    check('nal_escape 不误伤 00 00 04', nal_escape(b'\x00\x00\x04') == b'\x00\x00\x04')
    check('nal_unescape 不误伤结尾 00 00 03', nal_unescape(b'\x00\x00\x03') == b'\x00\x00')

    # --- 逐 NALU 解密的端到端往返（用 CTR，每个 NALU 重置 IV） ---
    key = bytes(range(16))
    iv = bytes(range(16, 32))
    nals = split_nals(col['es'])
    for cipher in ('aes-ctr', 'sm4-ctr'):
        enc_es, det, meta = _crypt_nals(col['es'], key, iv, cipher, False, False,
                                        decrypt=True, nals=nals)
        check('%s 逐 NALU 长度保持' % cipher, all(d['length_preserved'] for d in det))
        check('%s 边界稳定' % cipher, meta['boundary_stable'])
        back, _, _ = _crypt_nals(enc_es, key, iv, cipher, False, False, decrypt=True, nals=nals)
        check('%s 逐 NALU 往返还原 ES' % cipher, back == col['es'])

    # --- dcm 往返 ---
    dcm_params = {'ctr_blocks': 1, 'xor_blocks': 9, 'total_rounds': 10}
    dcm_es, det, meta = _crypt_nals(col['es'], key, iv, 'dcm', False, False,
                                    dcm_params=dcm_params, decrypt=True, nals=nals)
    check('dcm 保持长度', all(d['length_preserved'] for d in det))
    back, _, _ = _crypt_nals(dcm_es, key, iv, 'dcm', False, False,
                             dcm_params=dcm_params, decrypt=True, nals=nals)
    check('dcm 逐 NALU 往返还原 ES', back == col['es'])

    # --- （不做 nal_escape 的）伪 NAL 边界：必须被 meta 报出来 ---
    esc_es, det_esc, meta_esc = _crypt_nals(col['es'], key, iv, 'dcm', False, True,
                                            dcm_params=dcm_params, decrypt=True, nals=nals)
    check('做 nal_escape 后边界稳定', meta_esc['boundary_stable'] is True)
    check('nal_escape 会改变长度（这是必要的代价）',
          any(not d['length_preserved'] for d in det_esc) or esc_es == dcm_es,
          'esc len=%d plain len=%d' % (len(esc_es), len(col['es'])))
    # 负向断言：不 escape 时，解密方若重新按 start code 切，边界可能变多 —— 用构造样本证明该风险真实存在
    crafted = b'\x00\x00\x01\x65' + b'\x00\x00\x01' + b'AB'          # payload 里含一个 start code
    check('split_nals 会把 payload 里的 start code 当新 NAL（伪边界风险确实存在）',
          len(split_nals(crafted)) == 2)

    # --- 写回 TS：长度不变时必须逐字节可逆 ---
    enc_ts = splice_es(data, col['ranges'], dcm_es)
    check('写回 TS 后仍是合法包结构', ts_overview(enc_ts)['bad_sync_packets'] == 0)
    enc_col = collect_es(enc_ts, 0x101)
    check('写回 TS 后 ES 与加密 ES 一致', enc_col['es'] == dcm_es)
    check('写回 TS 后仍能解析 PMT', len(parse_psi(enc_ts)['pmts']) == 1)
    dec_es, _, _ = _crypt_nals(enc_col['es'], key, iv, 'dcm', False, False,
                               dcm_params=dcm_params, decrypt=True, nals=nals)
    check('TS 级端到端往返', splice_es(enc_ts, enc_col['ranges'], dec_es) == data)

    # --- 长度变化必须显式拒绝（不静默产出坏 TS） ---
    try:
        splice_es(data, col['ranges'], col['es'][:-1])
        check('ES 长度变化时拒绝写回 TS', False)
    except ValueError as e:
        check('ES 长度变化时拒绝写回 TS', 'ffmpeg' in str(e))

    # --- CRC16 探针在合成样本上要能命中（构造一个 XMODEM 尾部） ---
    body = b'\x00\x00\x01\x65' + bytes(range(64))
    from media_crypto import _crc16, CRC16_VARIANTS
    poly, init, refin, refout, xorout = CRC16_VARIANTS['XMODEM']
    v = _crc16(body, poly, init, refin, refout, xorout)
    check('合成样本 CRC16 命中 XMODEM',
          crc16_probe(body + v.to_bytes(2, 'big'))['matched'])
    check('strip_crc16 剪掉 2 字节', strip_crc16(body + b'\x12\x34') == body)

    # --- 畸形输入不崩 ---
    for bad in (b'', b'\x00' * 100, b'\x47' + b'\x00' * 187):
        try:
            ts_overview(bad)
            collect_es(bad, 0x101)
            parse_psi(bad)
            check('畸形输入不抛异常（%d 字节）' % len(bad), True)
        except Exception as e:                                # noqa: BLE001
            check('畸形输入不抛异常（%d 字节）' % len(bad), False, str(e))

    print('ts_probe 自检：%d 项，失败 %d 项' % (total, len(fails)))
    for f in fails:
        print('  FAIL ' + f)
    return 1 if fails else 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description='MPEG-TS 解复用与逐 NALU 解密')
    ap.add_argument('input', nargs='?')
    ap.add_argument('--out')
    ap.add_argument('--es-out')
    ap.add_argument('--pid', type=lambda s: int(s, 0))
    ap.add_argument('--hevc', action='store_true')
    ap.add_argument('--pretty', action='store_true')
    ap.add_argument('--nalu', action='store_true')
    ap.add_argument('--limit', type=int, default=40)
    ap.add_argument('--no-crc', action='store_true')

    ap.add_argument('--decrypt-nalu', action='store_true')
    ap.add_argument('--cipher', default='aes-ctr',
                    choices=['aes-cbc', 'aes-ctr', 'sm4-cbc', 'sm4-ctr', 'dcm'])
    ap.add_argument('--key-hex'); ap.add_argument('--key-utf8'); ap.add_argument('--key-latin1')
    ap.add_argument('--iv-hex'); ap.add_argument('--iv-utf8'); ap.add_argument('--iv-latin1')
    ap.add_argument('--ctr-blocks', type=int, default=1)
    ap.add_argument('--xor-blocks', type=int, default=9)
    ap.add_argument('--total-rounds', type=int, default=10)
    ap.add_argument('--unescape', action='store_true',
                    help='解密前做 nal_unescape、解密后再 nal_escape（长度可能变化）')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()
    if not args.input:
        ap.print_help()
        return 1

    try:
        data = read_bytes(args.input)
        out = {}
        out['overview'] = ts_overview(data)
        out['psi'] = parse_psi(data)
        names, blobs = extract_service_names(out['psi'])
        out['service_names'] = names
        out['descriptor_strings'] = blobs

        video_pid = None
        for pmt in out['psi']['pmts']:
            for s in pmt['streams']:
                if s['kind'].startswith('video'):
                    video_pid = video_pid if video_pid is not None else s['elementary_pid']
        pid = args.pid if args.pid is not None else video_pid

        if pid is not None:
            col = collect_es(data, pid)
            out['pid'] = pid
            out['es_len'] = col['es_len']
            out['declared_es_len'] = col.get('declared_es_len')
            out['pes_headers'] = col['pes_headers'][:8]
            if args.nalu or args.decrypt_nalu:
                out['nalu'] = nalu_report(data, pid, args.hevc, crc=(not args.no_crc), limit=args.limit)
            if args.decrypt_nalu:
                if not (args.key_hex or args.key_utf8 or args.key_latin1):
                    raise ValueError('--decrypt-nalu 需要 key：请给 --key-hex / --key-utf8 / --key-latin1')
                if not (args.iv_hex or args.iv_utf8 or args.iv_latin1):
                    raise ValueError('--decrypt-nalu 需要 IV：请给 --iv-hex / --iv-utf8 / --iv-latin1')
                key = parse_key(args.key_hex or args.key_utf8 or args.key_latin1,
                                'hex' if args.key_hex else ('utf8' if args.key_utf8 else 'latin1'), 'key')
                iv = parse_key(args.iv_hex or args.iv_utf8 or args.iv_latin1,
                               'hex' if args.iv_hex else ('utf8' if args.iv_utf8 else 'latin1'), 'iv')
                new_es, det, meta = _crypt_nals(col['es'], key, iv, args.cipher, args.hevc, args.unescape,
                                                {'ctr_blocks': args.ctr_blocks, 'xor_blocks': args.xor_blocks,
                                                 'total_rounds': args.total_rounds}, decrypt=True)
                out['decrypt'] = {'cipher': args.cipher, 'nalu_count': len(det),
                                  'lengths_preserved': all(d['length_preserved'] for d in det),
                                  'boundary_stable': meta['boundary_stable'],
                                  'details': det[:8]}
                if args.out:
                    if len(new_es) == col['es_len']:
                        write_bytes(args.out, splice_es(data, col['ranges'], new_es))
                        print('OK  已写回 TS：%s（%d 字节，长度不变）' % (args.out, os.path.getsize(args.out)),
                              file=sys.stderr)
                    else:
                        alt = args.out + '.es'
                        write_bytes(alt, new_es)
                        print('WARN 解密后 ES 长度变化（%d → %d），无法原样写回 TS；'
                              '已改输出 annex-B ES：%s' % (col['es_len'], len(new_es), alt), file=sys.stderr)
            if args.es_out:
                write_bytes(args.es_out, col['es'])
                print('OK  已输出 ES：%s（%d 字节）' % (args.es_out, col['es_len']), file=sys.stderr)
        else:
            out['pid'] = None
            out['warning'] = '没能从 PMT 里识别视频 PID（可能是纯音频/加密 PSI）。请用 --pid 指定。'
            if args.decrypt_nalu or args.es_out:
                print('ERROR 无法确定 PID：输入可能不是 TS（或 PSI 被加密）。'
                      '请用 --pid 显式指定；包结构诊断见上面 overview 的 bad_sync_packets/remainder。',
                      file=sys.stderr)
                print(json.dumps(out, ensure_ascii=False, indent=2) if args.pretty
                      else json.dumps(out, ensure_ascii=False))
                return 1

        print(json.dumps(out, ensure_ascii=False, indent=2) if args.pretty
              else json.dumps(out, ensure_ascii=False))
        return 0
    except (ValueError, IOError, OSError) as e:
        print('ERROR %s' % e, file=sys.stderr)
        return 1
    except Exception as e:                                    # noqa: BLE001
        print('ERROR %s: %s' % (type(e).__name__, e), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())