#!/usr/bin/env node
'use strict';

const fs = require('fs');

function parseArgs(argv) {
  const args = { input: null, param: null, position: null, json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '--curl-file' || a === '-i') args.input = argv[++i];
    else if (a === '--param' || a === '-p') args.param = argv[++i];
    else if (a === '--position') args.position = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--markdown') args.markdown = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  if (!args.json && !args.markdown) args.markdown = true;
  return args;
}

function usage() {
  return `用法：\n  node scripts/parse_curl.js --input request.curl --param sign --position header --markdown\n  node scripts/parse_curl.js --input request.curl --json\n\n不提供 --input 时会从标准输入读取内容。脚本会同时列出请求样本中的所有可疑加密参数；这些值只能作为浏览器样本 / fixture，最终产物必须通过补环境重新生成，不能直接复用。`;
}

function readInput(input) {
  if (input) return fs.readFileSync(input, 'utf8');
  return fs.readFileSync(0, 'utf8');
}

function normalizeCurl(s) {
  return s.replace(/\r\n/g, '\n')
    .replace(/\\\n/g, ' ')
    .replace(/\^\n/g, ' ')
    .replace(/`\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s) {
  const out = [];
  let cur = '';
  let quote = null;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\' && quote !== "'") { esc = true; continue; }
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur = ''; }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function parseHeader(v) {
  const idx = v.indexOf(':');
  if (idx === -1) return null;
  return [v.slice(0, idx).trim(), v.slice(idx + 1).trim()];
}

function parseCurl(text) {
  const tokens = tokenize(normalizeCurl(text));
  const result = { url: '', method: '', headers: {}, body: '', cookies: {}, rawTokens: tokens };
  let sawCurl = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'curl' || t.endsWith('/curl')) { sawCurl = true; continue; }
    if (['-X', '--request'].includes(t)) { result.method = (tokens[++i] || '').toUpperCase(); continue; }
    if (['-H', '--header'].includes(t)) {
      const h = parseHeader(tokens[++i] || '');
      if (h) result.headers[h[0]] = h[1];
      continue;
    }
    if (['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '--form'].includes(t)) {
      const val = tokens[++i] || '';
      result.body = result.body ? result.body + '&' + val : val;
      continue;
    }
    if (t === '-b' || t === '--cookie') {
      result.headers.Cookie = tokens[++i] || '';
      continue;
    }
    if (!t.startsWith('-') && /^https?:\/\//i.test(t) && !result.url) result.url = t;
  }
  if (!sawCurl && !/^https?:\/\//i.test(result.url)) throw new Error('输入内容不像有效的 cURL 命令');
  if (!result.method) result.method = result.body ? 'POST' : 'GET';
  const cookieHeader = Object.entries(result.headers).find(([k]) => k.toLowerCase() === 'cookie');
  if (cookieHeader) {
    for (const part of cookieHeader[1].split(';')) {
      const idx = part.indexOf('=');
      if (idx !== -1) result.cookies[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
  }
  return result;
}

function headerHas(headers, param) {
  const p = param.toLowerCase();
  return Object.keys(headers).some(k => k.toLowerCase() === p);
}

function bodyHas(body, param) {
  if (!body) return false;
  const p = param.toLowerCase();
  try {
    const obj = JSON.parse(body);
    const stack = [obj];
    while (stack.length) {
      const cur = stack.pop();
      if (cur && typeof cur === 'object') {
        for (const [k, v] of Object.entries(cur)) {
          if (k.toLowerCase() === p) return true;
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    }
  } catch (_) {}
  try {
    const sp = new URLSearchParams(body);
    for (const k of sp.keys()) if (k.toLowerCase() === p) return true;
  } catch (_) {}
  return new RegExp(`(^|[&?\\s"'])${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:=]`, 'i').test(body);
}

function queryHas(url, param) {
  try {
    const u = new URL(url);
    for (const k of u.searchParams.keys()) if (k.toLowerCase() === param.toLowerCase()) return true;
  } catch (_) {}
  return false;
}

function cookieHas(cookies, param) {
  const p = param.toLowerCase();
  return Object.keys(cookies).some(k => k.toLowerCase() === p);
}


function maskValue(value) {
  const s = String(value ?? '');
  if (!s) return '';
  if (s.length <= 8) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}...${s.slice(-4)}（len=${s.length}）`;
}

function sha256(value) {
  try { return require('crypto').createHash('sha256').update(String(value)).digest('hex'); }
  catch { return ''; }
}

const BENIGN_PARAM_NAMES = new Set(['accept','accept-language','accept-encoding','content-type','content-length','origin','referer','host','connection','user-agent','sec-ch-ua','sec-fetch-site','sec-fetch-mode','sec-fetch-dest']);
const STRONG_CRYPTO_NAME = /^(?:sign|signature|_signature|x[-_]?sign|x[-_]?s|x[-_]?t|a[_-]?bogus|h5st|mtgsig|w[_-]?rid|x[-_]?bogus|token|access[-_]?token|auth[-_]?token|x[-_]?token|csrf[-_]?token|csrftoken|verify|digest|hash|hmac|mac|nonce|sig)$/i;
const WEAK_CRYPTO_NAME = /(^|[-_])(sign|signature|token|csrf|verify|digest|hash|hmac|mac|nonce|timestamp|ts|random|device|fp|fingerprint)([-_]|$)/i;

function looksEncodedOrCrypto(value) {
  const s = String(value || '');
  if (s.length >= 32) return true;
  if (s.length >= 24 && /^[A-Za-z0-9+/=_-]+$/.test(s)) return true;
  if (s.length >= 24 && /^[a-f0-9]+$/i.test(s)) return true;
  if (s.length >= 20 && /%[0-9a-f]{2}/i.test(s)) return true;
  return false;
}

function scoreSuspiciousParam(name, value, position) {
  const n = String(name || '').trim();
  const v = String(value ?? '');
  const reasons = [];
  let score = 0;
  if (!n || BENIGN_PARAM_NAMES.has(n.toLowerCase())) return { score: 0, reasons: ['常规请求字段，默认排除'] };
  if (STRONG_CRYPTO_NAME.test(n)) { score += 75; reasons.push('参数名命中常见加密 / 签名 / token 规则'); }
  else if (WEAK_CRYPTO_NAME.test(n)) { score += 45; reasons.push('参数名疑似签名、token、随机数、设备或指纹字段'); }
  if (looksEncodedOrCrypto(v)) { score += 35; reasons.push('样本值长度或编码形态像签名 / token'); }
  if (position === 'Header') score += 8;
  if (position === 'Cookie') { score += 8; reasons.push('位于 Cookie，需区分登录态与 JS 生成型 Cookie'); }
  if (/^\d{10,13}$/.test(v) && !STRONG_CRYPTO_NAME.test(n)) { score -= 20; reasons.push('值像纯时间戳，需结合链路确认'); }
  if (v.length <= 6 && !STRONG_CRYPTO_NAME.test(n)) score -= 20;
  return { score, reasons };
}

function addSuspiciousCandidate(map, name, value, position, sourcePath) {
  if (value === undefined || value === null || value === '') return;
  const { score, reasons } = scoreSuspiciousParam(name, value, position);
  if (score < 35) return;
  const key = `${position}:${String(name).toLowerCase()}:${sourcePath}`;
  if (map.has(key)) return;
  map.set(key, {
    name: String(name),
    position,
    sourcePath,
    samplePreview: maskValue(value),
    valueLength: String(value).length,
    valueSha256: sha256(value),
    score,
    reasons,
    mustGenerate: true,
  });
}

function collectJsonSuspicious(obj, map, prefix = 'body') {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const p = `${prefix}.${k}`;
    if (v && typeof v === 'object') collectJsonSuspicious(v, map, p);
    else addSuspiciousCandidate(map, k, v, 'Body', p);
  }
}

function collectBodySuspicious(body, map) {
  if (!body) return;
  try { collectJsonSuspicious(JSON.parse(body), map, 'body'); return; } catch (_) {}
  try {
    const sp = new URLSearchParams(body);
    for (const [k, v] of sp.entries()) addSuspiciousCandidate(map, k, v, 'Body', `body.${k}`);
  } catch (_) {}
  const re = /["']?([A-Za-z_$][\w$-]{0,80})["']?\s*[:=]\s*["']?([^&\s"',}]{4,})/g;
  let m;
  while ((m = re.exec(body))) addSuspiciousCandidate(map, m[1], m[2], 'Body', `body.${m[1]}`);
}

function discoverSuspiciousParams(req) {
  const map = new Map();
  try {
    const u = new URL(req.url);
    for (const [k, v] of u.searchParams.entries()) addSuspiciousCandidate(map, k, v, 'Query', `query.${k}`);
  } catch (_) {}
  for (const [k, v] of Object.entries(req.headers || {})) addSuspiciousCandidate(map, k, v, 'Header', `header.${k}`);
  for (const [k, v] of Object.entries(req.cookies || {})) addSuspiciousCandidate(map, k, v, 'Cookie', `cookie.${k}`);
  collectBodySuspicious(req.body, map);
  return [...map.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function analyze(text, param, position) {
  const req = parseCurl(text);
  let paramPresence = null;
  if (param) {
    paramPresence = {
      query: queryHas(req.url, param),
      header: headerHas(req.headers, param),
      body: bodyHas(req.body, param),
      cookie: cookieHas(req.cookies, param),
    };
    if (position) {
      const key = position.toLowerCase();
      paramPresence.expectedPosition = key;
      paramPresence.foundAtExpectedPosition = !!paramPresence[key];
    }
  }
  const suspiciousParams = discoverSuspiciousParams(req);
  return { request: req, param, position, paramPresence, suspiciousParams };
}

function renderMarkdown(result) {
  const req = result.request;
  const lines = [];
  lines.push('# cURL 请求样本检查结果');
  lines.push('');
  lines.push(`- URL：${req.url || '未识别'}`);
  lines.push(`- 请求方法：${req.method || '未识别'}`);
  lines.push(`- 请求头数量：${Object.keys(req.headers).length}`);
  lines.push(`- 是否有请求体：${req.body ? '是' : '否'}`);
  lines.push(`- Cookie 数量：${Object.keys(req.cookies).length}`);
  if (result.param) {
    const p = result.paramPresence;
    lines.push('');
    lines.push(`## 目标参数 \`${result.param}\` 检查`);
    lines.push(`- Query：${p.query ? '找到' : '未找到'}`);
    lines.push(`- Header：${p.header ? '找到' : '未找到'}`);
    lines.push(`- Body：${p.body ? '找到' : '未找到'}`);
    lines.push(`- Cookie：${p.cookie ? '找到' : '未找到'}`);
    if (result.position) lines.push(`- 期望位置 ${result.position}：${p.foundAtExpectedPosition ? '匹配' : '不匹配'}`);
  }
  lines.push('');
  lines.push('## 发现的可疑加密参数（需用户确认）');
  if (!result.suspiciousParams.length) {
    lines.push('- 未发现明显可疑加密参数；请结合 Network / Hook / HAR 继续确认。');
  } else {
    lines.push('| 参数名 | 位置 | 样本值摘要 | 分数 | 命中原因 |');
    lines.push('|---|---|---|---:|---|');
    for (const item of result.suspiciousParams) {
      lines.push(`| ${item.name} | ${item.position} | ${item.samplePreview} | ${item.score} | ${item.reasons.join('；')} |`);
    }
    lines.push('');
    lines.push('请让用户确认哪些参数需要分析。进入正式补环境前，必须把确认后的参数写入任务摘要；未确认前不要开始补环境。');
  }
  lines.push('');
  lines.push('> 注意：cURL 中已有的 sign / token / a_bogus / h5st 等值只能作为浏览器真实样本或 fixture 期望值，最终产物必须通过补环境调用目标 JS 入口重新生成，不能把样本值硬编码或直接复用。');
  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); process.exit(0); }
  const text = readInput(args.input);
  const result = analyze(text, args.param, args.position);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}

module.exports = { parseCurl, analyze, discoverSuspiciousParams, maskValue };
