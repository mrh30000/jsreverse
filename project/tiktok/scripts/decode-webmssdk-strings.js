/**
 * 解开 webmssdk.js 的字符串表 A（可能是「字符串 + 别名变量」混合数组）。
 *
 * 依据 webmssdk.js 内的解码函数：
 *   function l(n, t){ n = utf8decode(b64decode(n)); for (i...) r += char(n[i] ^ t[i % t.length]); return r }
 * 调用点：var c = A[x], a = A[y]; f[c + ":" + a] ||= l(c, a)
 * => 表项 c 做 base64 解码，再用「另一个表项 a」作循环 XOR key 还原明文。
 *
 * 用法：node tiktok/scripts/decode-webmssdk-strings.js <file.js> [out.json]
 */
const fs = require('fs');

const QUOTE = '"';
const BACKSLASH = '\\';

/** 从 '[' 起做括号配对，返回 [起止下标, 顶层元素切片数组] */
function bracketSlice(src, openIdx) {
  let depth = 0, i = openIdx, inStr = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === BACKSLASH) esc = true;
      else if (c === QUOTE) inStr = false;
      continue;
    }
    if (c === QUOTE) { inStr = true; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) break; }
  }
  const body = src.slice(openIdx + 1, i);
  const parts = [];
  let start = 0, d2 = 0, s2 = false, e2 = false;
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (s2) {
      if (e2) e2 = false;
      else if (c === BACKSLASH) e2 = true;
      else if (c === QUOTE) s2 = false;
      continue;
    }
    if (c === QUOTE) { s2 = true; continue; }
    if (c === '[' || c === '{' || c === '(') d2++;
    else if (c === ']' || c === '}' || c === ')') d2--;
    else if (c === ',' && d2 === 0) { parts.push(body.slice(start, k)); start = k + 1; }
  }
  parts.push(body.slice(start));
  return { end: i, parts };
}

function stringItems(parts) {
  // 返回 [原下标, 字符串值] 列表
  const out = [];
  parts.forEach((p, idx) => {
    const t = p.trim();
    if (t.length >= 2 && t[0] === QUOTE && t[t.length - 1] === QUOTE) {
      try { out.push([idx, JSON.parse(t)]); } catch (e) {}
    }
  });
  return out;
}

function xorDecode(item, key) {
  let buf;
  try { buf = Buffer.from(item, 'base64'); } catch (e) { return null; }
  if (!buf.length || !key.length) return null;
  let o = '';
  for (let i = 0; i < buf.length; i++) o += String.fromCharCode(buf[i] ^ key.charCodeAt(i % key.length));
  return o;
}

const KEYWORDS = ['Gnarly', 'Dynosaur', 'Bogus', 'msToken', 'Mssdk', 'X-', 'sign', 'acrawler', 'X-Ss'];

const file = process.argv[2];
const outPath = process.argv[3];
const src = fs.readFileSync(file, 'utf8');

// 找所有 `IDENT=[`，取元素最多的那个作为字符串表
let best = null;
const re = /([A-Za-z_$][\w$]*)\s*=\s*\[/g;
let m;
while ((m = re.exec(src))) {
  const openIdx = src.indexOf('[', m.index);
  const { parts } = bracketSlice(src, openIdx);
  const items = stringItems(parts);
  if (items.length > 50 && (!best || items.length > best.items.length)) {
    best = { name: m[1], openIdx, parts, items };
  }
}

if (!best) { console.log('no string table found'); process.exit(1); }
console.log('table', best.name, 'stringItems=', best.items.length, 'totalParts=', best.parts.length, 'at', best.openIdx);

const values = best.items.map(([, v]) => v);
const found = new Map();
let tried = 0;
for (const item of values) {
  if (!item) continue;
  for (const key of values) {
    if (!key) continue;
    tried++;
    const s = xorDecode(item, key);
    if (!s || s.length < 2 || !/^[\x20-\x7e]*$/.test(s)) continue;
    for (const kw of KEYWORDS) {
      if (s.includes(kw) && !found.has(s)) found.set(s, { item, key });
    }
  }
}
console.log('tried pairs', tried, 'unique hits', found.size);
for (const s of Array.from(found.keys()).sort()) console.log('  ', JSON.stringify(s.slice(0, 120)));

if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(
    Array.from(found.entries()).map(([s, v]) => ({ s, item: v.item, key: v.key })), null, 1));
  console.log('written', outPath);
}