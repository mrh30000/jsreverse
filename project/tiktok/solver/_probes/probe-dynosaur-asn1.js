/**
 * 探针 V：把 X-Dynosaur 的 base64 载荷当 ASN.1/DER 解出来，对比「浏览器版 vs 离线版」的字段结构，
 * 定位两者差在哪一段（时间戳？随机数？指纹哈希？长度字段？）。
 *
 * 动机：probe-signature-delta 已证明「唯一差异参数是 X-Dynosaur」，
 * 而 probe-block-mssdk 排除了后端响应。剩下的路就是直接看载荷本身。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/_probes/probe-dynosaur-asn1.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('../tt_sign');
const { pageSigned, pageSession, RAW_POST } = require('../cdp-oracle');

const PATH_ = '/api/post/item_list/';
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const b64 = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** 最小 DER 解析器：够用即可（SEQUENCE / SET / INTEGER / BIT STRING / OCTET STRING / OID / UTF8 / PrintableString / UTCTime / GeneralizedTime） */
function parseDer(buf, off, end, depth = 0, out = []) {
  while (off < end) {
    const tag = buf[off++];
    let len = buf[off++];
    if (len === undefined) break;
    if (len & 0x80) {
      const n = len & 0x7f; len = 0;
      for (let i = 0; i < n; i++) len = (len << 8) | buf[off++];
    }
    const cls = (tag >> 6) & 3, cons = !!(tag & 0x20), num = tag & 0x1f;
    const name = ({ 0: 'EOC', 1: 'BOOL', 2: 'INT', 3: 'BITSTR', 4: 'OCTSTR', 5: 'NULL', 6: 'OID',
      10: 'ENUM', 12: 'UTF8', 16: 'SEQ', 17: 'SET', 19: 'PRINTSTR', 20: 'T61', 22: 'IA5',
      23: 'UTCTIME', 24: 'GENTIME' })[num] || ('tag' + num);
    const start = off, body = buf.slice(off, off + len);
    const node = { depth, cls, cons, name, len, start, body };
    if (cons) { node.kids = parseDer(buf, off, off + len, depth + 1, []); out.push(node); }
    else { node.val = body; out.push(node); }
    off += len;
  }
  return out;
}
function dump(nodes, lines = []) {
  for (const n of nodes) {
    const pad = '  '.repeat(n.depth);
    let extra = '';
    if (!n.kids) {
      const hex = n.body.slice(0, 20).toString('hex');
      const asc = /^[\x20-\x7e]*$/.test(n.body.toString('latin1')) ? JSON.stringify(n.body.toString('latin1')) : '';
      // 大整数也值一下
      let intv = '';
      if (n.name === 'INT' && n.len <= 16) { try { intv = ' = ' + BigInt('0x' + (n.body.toString('hex') || '0')).toString(); } catch (e) {} }
      extra = '  ' + hex + (n.len > 20 ? '..' : '') + ' ' + asc + intv;
    }
    lines.push(pad + n.name + '(' + n.len + ')' + extra);
    if (n.kids) dump(n.kids, lines);
  }
  return lines;
}

(async () => {
  const page = await pageSession();
  const liveMs = get(await pageSigned(RAW_POST, PATH_), 'msToken');
  const st = { local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }), session: Object.assign({}, page.session, { msToken: liveMs }) };
  const s = new TikTokSigner({ cookie: page.cookie, storage: st, url: page.url }).init(); s.bootstrap();
  const O = (await s.sign(RAW_POST, PATH_)).url;
  const B = await pageSigned(RAW_POST, PATH_);
  const spec = [['浏览器', B], ['离线', O]];
  const shapes = {};
  for (const [name, u] of spec) {
    for (const k of ['X-Dynosaur', 'X-Gnarly']) {
      const raw = b64(get(u, k));
      console.log('\n======== %s 的 %s：%d 字符 → %d 字节 ========', name, k, get(u, k).length, raw.length);
      console.log('前 16 字节:', raw.slice(0, 16).toString('hex'), '  末 8 字节:', raw.slice(-8).toString('hex'));
      let lines;
      try { lines = dump(parseDer(raw, 0, raw.length, 0)); }
      catch (e) { lines = ['DER 解析失败: ' + e.message]; }
      console.log(lines.slice(0, 40).join('\n'));
      shapes[name + ':' + k] = lines.map(l => l.replace(/\((\d+)\).*/, '($1)'));
    }
  }
  // 结构对比
  console.log('\n======== 结构对比 ========');
  for (const k of ['X-Dynosaur', 'X-Gnarly']) {
    const a = shapes['浏览器:' + k] || [], b = shapes['离线:' + k] || [];
    console.log(k + ': 浏览器节点数=' + a.length + '  离线节点数=' + b.length);
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) console.log('   #' + i + ' 浏览器: ' + (a[i] || '(无)') + '\n      #' + i + ' 离线  : ' + (b[i] || '(无)'));
    }
  }
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });
