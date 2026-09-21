/**
 * 由「明文」反查它在 webmssdk 字符串表 A 中的下标，再列出源码里所有 `A[<idx>]` 的使用位置。
 * 用途：定位 X-Gnarly / X-Dynosaur / signURL 的真正调用点。
 *
 * 用法：node tiktok/scripts/locate-string-usage.js <file.js> <plaintext>
 */
const fs = require('fs');

const QUOTE = '"';
const BACKSLASH = '\\';

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

function xorDecode(item, key) {
  let buf;
  try { buf = Buffer.from(item, 'base64'); } catch (e) { return null; }
  if (!buf.length || !key.length) return null;
  let o = '';
  for (let i = 0; i < buf.length; i++) o += String.fromCharCode(buf[i] ^ key.charCodeAt(i % key.length));
  return o;
}

const file = process.argv[2];
const target = process.argv[3];
const src = fs.readFileSync(file, 'utf8');

// 找最大的字符串数组
let best = null;
const re = /([A-Za-z_$][\w$]*)\s*=\s*\[/g;
let m;
while ((m = re.exec(src))) {
  const openIdx = src.indexOf('[', m.index);
  const { end, parts } = bracketSlice(src, openIdx);
  const items = [];
  parts.forEach((p, idx) => {
    const t = p.trim();
    if (t.length >= 2 && t[0] === QUOTE && t[t.length - 1] === QUOTE) {
      try { items.push([idx, JSON.parse(t)]); } catch (e) {}
    }
  });
  if (items.length > 50 && (!best || items.length > best.items.length)) {
    best = { name: m[1], openIdx, end, items, parts };
  }
}

console.log('table', best.name, 'items', best.items.length, 'at', best.openIdx);
const values = best.items.map(([, v]) => v);

// 找出能解码出 target 的 (原下标, key)
const matches = [];
best.items.forEach(([idx, item]) => {
  values.forEach(key => {
    if (!key) return;
    const s = xorDecode(item, key);
    if (s === target) matches.push({ idx, item, key });
  });
});
console.log('plaintext matches:', matches.length);
matches.forEach(mm => console.log('  idx=' + mm.idx + ' item=' + mm.item + ' key=' + mm.key));

// 列出源码中 A[idx] 的使用位置
const indexes = matches.map(x => x.idx);
for (const idx of indexes) {
  const needle = best.name + '[' + idx + ']';
  let i = -1, n = 0;
  while ((i = src.indexOf(needle, i + 1)) >= 0 && n < 20) {
    n++;
    console.log('  use ' + needle + ' @' + i + ': ' + JSON.stringify(src.slice(Math.max(0, i - 260), i + 260)));
  }
  console.log('  total uses of ' + needle + ':', n);
}