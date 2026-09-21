#!/usr/bin/env node
'use strict';

/**
 * extract_challenge_bundle.js — 挑战页「三件套」抽取与保鲜元数据生成（零依赖）
 *
 * 用途：把「首访 202 / 412 + 内联自执行脚本 + 外链 JS」形态的页面快照，
 *       抽取成一份可复现、可校验、带 hash 的资源包清单，供补环境入口运行时分片加载。
 *
 * 抽取内容（瑞数族谱见 references/ruishu-botgate.md §2）：
 *   1. meta.content       —— 挑战内容（可能带 id，取值方式因站而异）
 *   2. 内联自执行脚本      —— 定义 window.$_ts 的那一段（ts_js）
 *   3. 外链 JS            —— 内联脚本负责还原的乱码 JS
 *
 * 同时给出保守的代际判据信号（仅作提示，必须多条件交叉，不构成结论）。
 *
 * 用法：
 *   node extract_challenge_bundle.js <html> [选项]
 *     --dir <dir>        在目录内按文件名匹配外链 JS（默认 html 所在目录）
 *     --status <code>    HTTP 状态码（202 / 412），用于代际判据
 *     --cookies <str>    Set-Cookie 原始串或多行文件；用于 Cookie 命名判据
 *     --out <json>       写出 bundle JSON（默认 stdout）
 *     --markdown         额外渲染人读视图
 *     --selftest         运行内置断言自检，不读外部输入
 *
 * 退出码：0 成功；1 参数/IO 错误；2 自检失败。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SCHEMA = 'challenge-bundle/v1';
const NOTES = [
  '外链 JS 与内联脚本必须与浏览器取到的原始字节逐字节一致；站点会校验代码格式，重新格式化或编辑器重新编码会导致校验失败。',
  '本脚本只做静态抽取与提示，不替代浏览器取证；代际判据必须多条件交叉。',
];

// ---------------------------------------------------------------- 基础工具

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readText(p) {
  const buf = fs.readFileSync(p);
  return { text: buf.toString('utf8'), bytes: buf.length, sha256: sha256(buf), mtime: fs.statSync(p).mtime.toISOString() };
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([:@A-Za-z_][-.:\w]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    attrs[name] = value;
  }
  return attrs;
}

/** 文本体检：行长、别名密度、是否单行。 */
function analyzeText(name, text) {
  const trimmed = text.replace(/\s+$/, '');
  const nl = (trimmed.match(/\n/g) || []).length;
  const kb = Math.max(trimmed.length / 1024, 0.001);
  const aliasCount = (trimmed.match(/_[$A-Za-z]/g) || []).length;
  const ternary = (trimmed.match(/\?/g) || []).length;
  return {
    name,
    bytes: Buffer.byteLength(text, 'utf8'),
    chars: text.length,
    sha256: sha256(Buffer.from(text, 'utf8')),
    lineCount: trimmed.length === 0 ? 0 : nl + 1,
    singleLine: trimmed.length > 0 && nl === 0,
    aliasPerKb: Number((aliasCount / kb).toFixed(1)),
    ternaryPerKb: Number((ternary / kb).toFixed(1)),
  };
}

// ---------------------------------------------------------------- HTML 抽取

function extractMeta(html) {
  const out = [];
  const re = /<meta\b([^>]*)\/?>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    const content = attrs.content;
    const contentLen = content ? content.length : 0;
    // 挑战 content 的经验特征：足够长、且不是 charset / viewport 这类常规声明
    const isChallengeCandidate = contentLen >= 40 && !/^text\/html|^width=|charset=/.test(content || '');
    out.push({
      index: i++,
      id: attrs.id || null,
      httpEquiv: attrs['http-equiv'] || null,
      name: attrs.name || null,
      contentLength: contentLen,
      contentSample: content ? content.slice(0, 24) + (contentLen > 24 ? '...' : '') : null,
      contentSha256: content ? sha256(Buffer.from(content, 'utf8')) : null,
      hasId: Object.prototype.hasOwnProperty.call(attrs, 'id'),
      isChallengeCandidate,
    });
  }
  return out;
}

function extractScripts(html) {
  const inline = [];
  const external = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    const body = m[2] || '';
    if (attrs.src) {
      external.push({ index: i++, src: attrs.src, type: attrs.type || null, attrs });
      continue;
    }
    if (body.trim() === '') {
      i++;
      continue;
    }
    const info = analyzeText(`inline[${i}]`, body);
    const definesTs = /\$_ts/.test(body);
    inline.push({
      index: i++,
      ...info,
      src: null,
      definesTs,
      attrs,
      code: body,
    });
  }
  return { inline, external };
}

/** 从 Set-Cookie 原始串中提炼 Cookie 命名判据。 */
function parseCookies(raw) {
  if (!raw) return [];
  const out = [];
  const re = /([A-Za-z0-9_.\-]+)\s*=\s*([^;,\s]*)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1];
    const value = m[2] || '';
    const tail = /(80|443)$/.test(name) ? name.slice(-3) : name.slice(-1);
    // 端口命中时再取真正的后缀字母
    const suffixLetter = /^\d{2,3}$/.test(tail) ? null : tail;
    const portMatch = name.match(/(80|443)([A-Za-z])$/);
    out.push({
      name,
      valueLength: value.length,
      valueHead: value.slice(0, 1) || null,
      suffixLetter: portMatch ? portMatch[2] : suffixLetter,
      port: portMatch ? portMatch[1] : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- 代际信号

/**
 * 代际判据信号表。
 *
 * weight 语义：这是**判据强度**，不是出现次数。入口形态这类模式在 VM 代码里会大量误命中
 * （`_$xx.call(...)` 在 VM 内随处可见），所以：
 *   - 结构性门控（如 6 代的 if($_ts.cd)）权重最高，且基本排他；
 *   - 响应码、Cookie 命名是服务端行为，权重次之；
 *   - 入口形态只作**弱佐证**，不能单独定代。
 * 只把「排除不了的信号」当判据，是避免假阳性的关键。
 */
const ENTRY_PATTERNS = [
  {
    id: 'eval-call-with-ret',
    re: /\bret\s*=\s*_\$[A-Za-z0-9]+\s*\.\s*call\s*\(/g,
    why: '入口形如 ret = _$xx.call(a, b)，call 为明文',
    weight: { '4': 1, '5': 1 },
  },
  {
    id: 'call-from-array',
    re: /_\$[A-Za-z0-9]+\s*=\s*_\$[A-Za-z0-9]+\s*\[\s*_\$[A-Za-z0-9]+\s*\[\s*\d+\s*\]\s*\]\s*\(/g,
    why: '入口形如 _$x8 = _$mP[_$nU[15]](...)（call 也从数组取）',
    weight: { '3': 1, '5': 1 },
  },
  {
    id: 'ts-gate-6th',
    re: /if\s*\(\s*\$_ts\s*\.\s*(?:cd|lcd)\s*\)/g,
    why: '412 页面内联脚本出现 if($_ts.cd){...} / if($_ts.lcd) 门控',
    weight: { '6': 3 },
  },
];

/**
 * 仅作观测记录、**不参与打分**的形态。
 * `_$xx = _$yy.call(...)` 在 VM 代码内部海量出现，作为判据必然假阳性，因此降级为备注。
 */
const OBSERVED_ONLY = [
  {
    id: 'eval-call-plain',
    re: /_\$[A-Za-z0-9]+\s*=\s*_\$[A-Za-z0-9]+\s*\.\s*call\s*\(/g,
    why: '出现 _$xx = _$yy.call(...) 形态（5 代无 ret 变体与 VM 内部调用共用此写法，不能单独定代）',
  },
];

function countMatches(text, re) {
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return (text.match(r) || []).length;
}

function classifyGeneration({ status, cookies, jsTexts }) {
  const corpus = jsTexts.join('\n');
  const evidence = [];
  const scores = { '3': 0, '4': 0, '5': 0, '6': 0 };

  const statusNum = status === undefined || status === null || status === '' ? null : Number(status);
  if (statusNum !== null && !Number.isNaN(statusNum)) {
    if (statusNum === 202) {
      scores['3'] += 2; scores['4'] += 2;
      evidence.push(`HTTP ${statusNum}：指向 3/4 代（3 代与 4 代首访均为 202）[+2]`);
    } else if (statusNum === 412) {
      scores['5'] += 2; scores['6'] += 2;
      evidence.push(`HTTP ${statusNum}：指向 5/6 代（首访 412）[+2]`);
    } else {
      evidence.push(`HTTP ${statusNum}：不属于 202/412，瑞数判据不成立或需换证据`);
    }
  }

  for (const c of cookies) {
    if (c.port === '80' || c.port === '443') {
      scores['3'] += 2; scores['4'] += 2;
      evidence.push(`Cookie ${c.name}：名中带端口号(${c.port})，指向 3/4 代 [+2]`);
    }
    if (c.suffixLetter === 'O' || c.suffixLetter === 'P') {
      scores['5'] += 3;
      evidence.push(`Cookie ${c.name}：后缀为 ${c.suffixLetter}（服务端 / JS 生成），指向 5 代特殊变体 [+3]`);
    }
    if (c.suffixLetter === 'T' || c.suffixLetter === 'S') {
      for (const k of ['3', '4', '5', '6']) scores[k] += 0.5;
      evidence.push(`Cookie ${c.name}：后缀 ${c.suffixLetter}（T=JS 生成 / S=服务端下发），为瑞数族共有信号 [+0.5 各族]`);
    }
    if (c.valueHead && c.valueHead !== '0') {
      evidence.push(`Cookie ${c.name}：值首位 ${c.valueHead}（5/6 代该判据不可靠，仅记录）`);
    }
  }

  for (const p of ENTRY_PATTERNS) {
    const n = countMatches(corpus, p.re);
    if (n > 0) {
      const targets = Object.keys(p.weight).map((k) => `${k}代+${p.weight[k]}`).join(' / ');
      for (const [k, w] of Object.entries(p.weight)) scores[k] += w;
      evidence.push(`命中 ${n} 处 ${p.id}：${p.why} → ${targets}`);
    }
  }

  for (const p of OBSERVED_ONLY) {
    const n = countMatches(corpus, p.re);
    if (n > 0) evidence.push(`观测到 ${n} 处 ${p.id}（不计分）：${p.why}`);
  }

  const hasTs = /\$_ts/.test(corpus);
  if (hasTs) evidence.push('检测到 $_ts 变量（瑞数族必现，内联脚本定义、VM 内全程使用；不计分）');

  const ranked = Object.entries(scores)
    .map(([k, v]) => ({ generation: Number(k), score: v }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.generation - b.generation);

  const hint = ranked.length === 0 ? null : ranked[0].generation;
  // 歧义：无任何信号，或榜首与次席分数相等（无法定代）
  const ambiguous = ranked.length === 0 || (ranked.length > 1 && ranked[0].score === ranked[1].score);

  return {
    hint: ambiguous ? null : hint,
    ambiguous,
    ranked,
    evidence,
    note: 'hint 仅为多信号加权提示；入口形态为弱佐证，不可单独定代。必须结合人工确认（见 references/ruishu-botgate.md §1）。',
  };
}

/**
 * 在目录内定位外链 JS。
 *
 * 现实约束：瑞数的外链 JS **文件名每次刷新都会变**（如 `c.FxJzG50F.dfe1675.js`），
 * 而分析者手上通常只存了当时那一份。因此不能只做精确 basename 匹配，按优先级降级：
 *   1. exact      —— 文件名完全相同
 *   2. hash-token —— 去掉目录与扩展名后，取末段「类哈希」token 相同（如 dfe1675）
 *   3. stem       —— 去掉扩展名后主体相同
 *   4. sole-js    —— 目录内只有一个 .js，视为该文件（附告警，需人工确认）
 * 任何降级匹配都要留下 matchType 与告警，避免把「猜到的文件」当成「确认的文件」。
 */
function resolveExternal(src, dir, htmlPath) {
  const base = path.basename(src.split('?')[0]);
  const stem = base.replace(/\.[^.]*$/, '');
  const exactPath = path.join(dir, base);
  if (fs.existsSync(exactPath)) {
    return { localPath: exactPath, matchType: 'exact', warning: null };
  }

  let entries = [];
  try {
    entries = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.js'));
  } catch (_) {
    entries = [];
  }
  // 排除快照本身（html 路径不会在 .js 列表里，这里只是防御）
  entries = entries.filter((f) => path.resolve(dir, f) !== path.resolve(htmlPath));

  const tokenOf = (name) => {
    const s = name.replace(/\.[^.]*$/, '');
    const parts = s.split(/[.\-_]/).filter(Boolean);
    // 取末段；长度 >= 5 才认为像哈希片段
    const last = parts[parts.length - 1] || '';
    return /^[A-Za-z0-9]{5,}$/.test(last) ? last : null;
  };

  const wantToken = tokenOf(base);
  if (wantToken) {
    const hit = entries.find((f) => tokenOf(f) === wantToken);
    if (hit) {
      return {
        localPath: path.join(dir, hit),
        matchType: 'hash-token',
        warning: `外链 JS 按哈希片段匹配：期望 ${base}，目录内命中 ${hit}（文件名每次刷新会变，请确认是同一版）。`,
      };
    }
  }

  const stemHit = entries.find((f) => f.replace(/\.[^.]*$/, '') === stem);
  if (stemHit) {
    return {
      localPath: path.join(dir, stemHit),
      matchType: 'stem',
      warning: `外链 JS 按主体名匹配：期望 ${base}，目录内命中 ${stemHit}（请确认是同一版）。`,
    };
  }

  if (entries.length === 1) {
    return {
      localPath: path.join(dir, entries[0]),
      matchType: 'sole-js',
      warning: `外链 JS 未按名匹配到 ${base}；目录内仅有一个 .js（${entries[0]}），已按唯一候选采纳，必须人工确认。`,
    };
  }

  return {
    localPath: null,
    matchType: null,
    warning: `未在 ${dir} 找到 ${base}${entries.length ? `（目录内候选：${entries.slice(0, 5).join('、')}${entries.length > 5 ? ' 等' : ''}）` : '（目录内无 .js）'}，外链 JS 未纳入 bundle。`,
  };
}

// ---------------------------------------------------------------- 主流程

function buildBundle(opts) {
  const htmlPath = path.resolve(opts.html);
  const htmlInfo = readText(htmlPath);
  const html = htmlInfo.text;
  const dir = opts.dir ? path.resolve(opts.dir) : path.dirname(htmlPath);

  const warnings = [];
  const metas = extractMeta(html);
  const { inline, external } = extractScripts(html);

  const metaCandidates = metas.filter((m) => m.isChallengeCandidate);
  if (metaCandidates.length === 0) {
    warnings.push('未找到疑似挑战 content 的 meta（长度>=40 且非常规声明）；请确认快照是否完整。');
  } else if (metaCandidates.length > 1) {
    warnings.push(`找到 ${metaCandidates.length} 个疑似挑战 meta，需人工确认取哪一个。`);
  }

  // 内联 ts 脚本 = 定义 $_ts 的那一段
  const tsInline = inline.filter((s) => s.definesTs);
  if (tsInline.length === 0) {
    warnings.push('内联脚本中未出现 $_ts；可能快照不含自执行脚本，或该站结构特殊。');
  }
  for (const s of tsInline) {
    if (!s.singleLine) {
      warnings.push(`内联 ts 脚本(${s.name})含 ${s.lineCount} 行：需确认这是浏览器取到的原始字节，而非被编辑器重新格式化。`);
    }
  }

  // 外链 JS 落地匹配（精确 → 哈希片段 → 主体名 → 唯一候选，逐级降级并留告警）
  const externals = external.map((e) => {
    const r = resolveExternal(e.src, dir, htmlPath);
    if (!r.localPath) {
      return { ...e, resolved: false, matchType: null, localPath: null, warning: r.warning };
    }
    const info = readText(r.localPath);
    const analyzed = analyzeText(path.basename(r.localPath), info.text);
    if (!analyzed.singleLine) {
      warnings.push(`外链 JS(${path.basename(r.localPath)})含 ${analyzed.lineCount} 行：需确认这是浏览器取到的原始字节，而非被编辑器重新格式化。`);
    }
    if (r.warning) warnings.push(r.warning);
    return {
      ...e,
      resolved: true,
      matchType: r.matchType,
      localPath: r.localPath,
      bytes: info.bytes,
      sha256: info.sha256,
      mtime: info.mtime,
      ...analyzed,
      obfuscated: analyzed.aliasPerKb >= 5,
    };
  });

  const unresolved = externals.filter((e) => !e.resolved).map((e) => e.warning);
  warnings.push(...unresolved);

  const jsTexts = [
    ...inline.map((s) => s.code),
    ...externals.filter((e) => e.resolved).map((e) => fs.readFileSync(e.localPath, 'utf8')),
  ];

  if (jsTexts.length === 0) {
    warnings.push('未获得任何 JS 文本，代际判据仅有 HTTP / Cookie 信号。');
  }

  const status = opts.status !== undefined && opts.status !== null && opts.status !== ''
    ? Number(opts.status)
    : null;

  let cookieRaw = opts.cookies || '';
  if (cookieRaw && fs.existsSync(cookieRaw)) cookieRaw = fs.readFileSync(cookieRaw, 'utf8');
  const cookies = parseCookies(cookieRaw);

  const generation = classifyGeneration({ status, cookies, jsTexts });

  const bundle = {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    source: {
      htmlPath,
      htmlBytes: htmlInfo.bytes,
      htmlSha256: htmlInfo.sha256,
      htmlMtime: htmlInfo.mtime,
      resourceDir: dir,
    },
    http: { status, cookies },
    meta: metas,
    metaCandidate: metaCandidates.length === 1 ? metaCandidates[0] : null,
    inlineScripts: inline.map((s) => ({ ...s, code: undefined })),
    tsScript: tsInline.length === 1 ? { name: tsInline[0].name, index: tsInline[0].index, sha256: tsInline[0].sha256 } : null,
    externalScripts: externals.map((e) => ({ ...e, attrs: undefined })),
    generation,
    resources: {
      note: '三件套必须同会话、同一次刷新取得；任一变化都要整体刷新，不得混用。',
      metaContent: metaCandidates.map((m) => ({ index: m.index, sha256: m.contentSha256, length: m.contentLength, hasId: m.hasId })),
      tsScript: tsInline.map((s) => ({ name: s.name, sha256: s.sha256 })),
      externalJs: externals.map((e) => ({ src: e.src, resolved: e.resolved, sha256: e.sha256 || null })),
    },
    warnings,
    notes: NOTES,
  };

  return { bundle, inlineCode: inline };
}

function renderMarkdown(bundle) {
  const L = [];
  L.push('# 挑战页资源包清单');
  L.push('');
  L.push(`- schema：\`${bundle.schema}\``);
  L.push(`- 快照：\`${bundle.source.htmlPath}\`（${bundle.source.htmlBytes} bytes，sha256 \`${bundle.source.htmlSha256.slice(0, 16)}…\`）`);
  L.push(`- HTTP 状态：${bundle.http.status === null ? '未提供' : bundle.http.status}`);
  L.push('');
  L.push('## 三件套');
  L.push('');
  L.push('| 件 | 结果 |');
  L.push('|---|---|');
  const mc = bundle.metaCandidate;
  L.push(`| meta.content | ${mc ? `命中 index ${mc.index}，长度 ${mc.contentLength}，hasId=${mc.hasId}` : '未唯一命中'} |`);
  L.push(`| 内联 ts 脚本 | ${bundle.tsScript ? `${bundle.tsScript.name}（sha256 \`${bundle.tsScript.sha256.slice(0, 16)}…\`）` : '未命中'} |`);
  const ext = bundle.externalScripts;
  L.push(`| 外链 JS | ${ext.length === 0 ? '无' : ext.map((e) => `${path.basename(e.src.split('?')[0])}${e.resolved ? '' : '(未落地)'}`).join('、')} |`);
  L.push('');
  L.push('## 代际信号');
  L.push('');
  L.push(`- 提示：${bundle.generation.hint === null ? '证据不足' : `${bundle.generation.hint} 代`}（歧义=${bundle.generation.ambiguous ? '是' : '否'}）`);
  for (const e of bundle.generation.evidence) L.push(`- ${e}`);
  L.push('');
  if (bundle.warnings.length) {
    L.push('## 告警');
    L.push('');
    for (const w of bundle.warnings) L.push(`- ⚠️ ${w}`);
    L.push('');
  }
  L.push('## 注意事项');
  L.push('');
  for (const n of bundle.notes) L.push(`- ${n}`);
  L.push('');
  return L.join('\n');
}

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const opts = { markdown: false, selftest: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') opts.dir = argv[++i];
    else if (a === '--status') opts.status = argv[++i];
    else if (a === '--cookies') opts.cookies = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--markdown') opts.markdown = true;
    else if (a === '--selftest') opts.selftest = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else rest.push(a);
  }
  if (rest.length) opts.html = rest[0];
  return opts;
}

const HELP = `extract_challenge_bundle.js — 挑战页三件套抽取（零依赖）

用法：
  node extract_challenge_bundle.js <html> [选项]

选项：
  --dir <dir>       在目录内按文件名匹配外链 JS（默认 html 所在目录）
  --status <code>   HTTP 状态码（202 / 412）
  --cookies <str>   Set-Cookie 原始串，或包含该串的文件路径
  --out <json>      写出 bundle JSON（默认 stdout）
  --markdown        额外渲染人读视图
  --selftest        运行内置断言自检
  -h, --help        显示本帮助

退出码：0 成功；1 参数/IO 错误；2 自检失败。`;

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.selftest && !opts.html)) {
    console.log(HELP);
    process.exit(opts.help ? 0 : 1);
  }
  if (opts.selftest) {
    process.exit(runSelftest() ? 0 : 2);
  }
  if (!fs.existsSync(opts.html)) {
    console.error(`输入文件不存在：${opts.html}`);
    process.exit(1);
  }

  const { bundle } = buildBundle(opts);
  const json = JSON.stringify(bundle, null, 2);

  if (opts.out) {
    fs.writeFileSync(opts.out, json, 'utf8');
    if (opts.markdown) {
      const mdPath = opts.out.replace(/\.json$/i, '') + '.md';
      fs.writeFileSync(mdPath, renderMarkdown(bundle), 'utf8');
      console.log(`已写出：${opts.out} / ${mdPath}`);
    } else {
      console.log(`已写出：${opts.out}`);
    }
  } else {
    console.log(json);
    if (opts.markdown) {
      console.log('\n---\n');
      console.log(renderMarkdown(bundle));
    }
  }

  if (bundle.warnings.length) {
    console.error(`\n${bundle.warnings.length} 条告警：`);
    for (const w of bundle.warnings) console.error(`  ⚠️  ${w}`);
  }
}

// ---------------------------------------------------------------- 自检

function runSelftest() {
  const checks = [];
  const ok = (name, cond, detail) => {
    checks.push({ name, pass: Boolean(cond), detail });
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ← ${detail || ''}`}`);
  };

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-selftest-'));
  const cleanup = () => { try { fs.rmSync(work, { recursive: true, force: true }); } catch (_) { /* ignore */ } };
  const sub = (name) => { const d = path.join(work, name); fs.mkdirSync(d, { recursive: true }); return d; };

  try {
    // --- 夹具 A：6 代形态（412 + meta 带 id + 单行内联 ts + 外链 JS 精确命中）
    const dirA = sub('a');
    const tsCode = 'var $_ts={};if($_ts.cd){var _$ab=_$cd.call(_$ef,_$gh);}';
    const extCode = 'function _$a1(){var _$pn=[249];return _$2W.apply(this,_$pn);}function _$b2(){return 1;}var _$c3=2;var _$d4=3;var _$e5=4;var _$f6=5;var _$g7=6;var _$h8=7;var _$i9=8;';
    fs.writeFileSync(path.join(dirA, 'c.FxJzG50F.dfe1675.js'), extCode, 'utf8');
    const htmlA = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta id="FbkwzLN5XOx0" content="${'A'.repeat(120)}">
<script>${tsCode}</script>
<script src="/c.FxJzG50F.dfe1675.js"></script></head><body></body></html>`;
    const pathA = path.join(dirA, 'a.html');
    fs.writeFileSync(pathA, htmlA, 'utf8');

    const A = buildBundle({ html: pathA, dir: dirA, status: '412' }).bundle;
    ok('A: 唯一命中 meta 候选', A.metaCandidate !== null, JSON.stringify(A.meta));
    ok('A: meta 候选带 id（取值方式提示）', A.metaCandidate && A.metaCandidate.hasId === true, JSON.stringify(A.metaCandidate));
    ok('A: Content-Type meta 不算候选', A.meta.length === 2 && A.meta.filter((m) => m.isChallengeCandidate).length === 1, JSON.stringify(A.meta.map((m) => m.isChallengeCandidate)));
    ok('A: 命中内联 ts 脚本且单行', A.tsScript !== null && A.inlineScripts.every((s) => s.singleLine || !s.definesTs), JSON.stringify(A.inlineScripts));
    ok('A: 外链 JS 精确命中', A.externalScripts.length === 1 && A.externalScripts[0].resolved === true && A.externalScripts[0].matchType === 'exact', JSON.stringify(A.externalScripts));
    ok('A: 外链 JS 记了 sha256', typeof A.externalScripts[0].sha256 === 'string' && A.externalScripts[0].sha256.length === 64, String(A.externalScripts[0].sha256));
    ok('A: 外链 JS 识别为混淆', A.externalScripts[0].obfuscated === true, `aliasPerKb=${A.externalScripts[0].aliasPerKb}`);
    ok('A: 代际提示为 6 代（结构门控压过响应码）', A.generation.hint === 6 && A.generation.ambiguous === false, JSON.stringify(A.generation.ranked));
    ok('A: 6 代证据含 ts-gate', A.generation.evidence.some((e) => e.includes('ts-gate-6th')), JSON.stringify(A.generation.evidence));
    ok('A: 无告警', A.warnings.length === 0, JSON.stringify(A.warnings));

    // --- 夹具 B：4 代形态（202 + 无 id 的 meta + ret.call 入口 + 带端口 Cookie）
    const dirB = sub('b');
    const htmlB = `<html><head><meta content="${'B'.repeat(80)}">
<script>var $_ts={_$Rm:"x"};ret = _$DG.call(_$6a, _$YK);</script></head><body></body></html>`;
    const pathB = path.join(dirB, 'b.html');
    fs.writeFileSync(pathB, htmlB, 'utf8');
    const B = buildBundle({
      html: pathB,
      dir: dirB,
      status: '202',
      cookies: 'FSSBBIl1UgzbN7N443T=4a.tr1kEXk; FSSBBIl1UgzbN7N80S=1abc',
    }).bundle;
    ok('B: meta 无 id 也能命中候选', B.metaCandidate !== null && B.metaCandidate.hasId === false, JSON.stringify(B.meta));
    ok('B: 代际提示为 4 代', B.generation.hint === 4, JSON.stringify(B.generation.ranked));
    ok('B: 识别端口后缀 Cookie', B.http.cookies.length >= 2 && B.http.cookies.some((c) => c.port === '443' && c.suffixLetter === 'T'), JSON.stringify(B.http.cookies));
    ok('B: 证据含 202 判据', B.generation.evidence.some((e) => e.includes('202')), JSON.stringify(B.generation.evidence));
    ok('B: 证据含 eval-call-with-ret', B.generation.evidence.some((e) => e.includes('eval-call-with-ret')), JSON.stringify(B.generation.evidence));

    // --- 夹具 C：被重新格式化的脚本（多行）必须告警
    const dirC = sub('c');
    const multi = '<script>var $_ts = {};\nif ($_ts.cd) {\n  var x = 1;\n}\n</script>';
    const htmlC = `<html><head><meta content="${'C'.repeat(60)}">${multi}</head><body></body></html>`;
    const pathC = path.join(dirC, 'c.html');
    fs.writeFileSync(pathC, htmlC, 'utf8');
    const C = buildBundle({ html: pathC, dir: dirC, status: '412' }).bundle;
    ok('C: 多行 ts 脚本被判为非单行', C.inlineScripts.some((s) => s.definesTs && s.singleLine === false), JSON.stringify(C.inlineScripts));
    ok('C: 产生格式告警', C.warnings.some((w) => w.includes('原始字节')), JSON.stringify(C.warnings));

    // --- 夹具 D：外链 JS 缺失必须告警，且不能静默跳过
    const dirD = sub('d');
    const htmlD = `<html><head><meta content="${'D'.repeat(60)}"><script src="/missing.js"></script><script>var $_ts={};</script></head><body></body></html>`;
    const pathD = path.join(dirD, 'd.html');
    fs.writeFileSync(pathD, htmlD, 'utf8');
    const D = buildBundle({ html: pathD, dir: dirD, status: '412' }).bundle;
    ok('D: 外链缺失标记 resolved=false', D.externalScripts.length === 1 && D.externalScripts[0].resolved === false, JSON.stringify(D.externalScripts));
    ok('D: 外链缺失产生告警', D.warnings.some((w) => w.includes('未在')), JSON.stringify(D.warnings));

    // --- 夹具 E：证据不足时不得硬给结论
    const dirE = sub('e');
    const pathE = path.join(dirE, 'e.html');
    fs.writeFileSync(pathE, '<html><body>plain</body></html>', 'utf8');
    const E = buildBundle({ html: pathE, dir: dirE }).bundle;
    ok('E: 空快照 hint 为 null', E.generation.hint === null, JSON.stringify(E.generation));
    ok('E: 空快照 ambiguous 为 true', E.generation.ambiguous === true, 'expected ambiguous');
    ok('E: 空快照给出 meta 告警', E.warnings.some((w) => w.includes('meta')), JSON.stringify(E.warnings));

    // --- 夹具 F：外链文件名变了 → 按哈希片段降级匹配并告警（真实高频场景）
    const dirF = sub('f');
    fs.writeFileSync(path.join(dirF, 'c.FxJzG50F.dfe1675.js'), 'var _$aa=1;var _$bb=2;var _$cc=3;', 'utf8');
    const htmlF = `<html><head><meta content="${'F'.repeat(60)}">
<script>var $_ts={};if($_ts.cd){var z=1;}</script>
<script src="/x.FxJzG50F.dfe1675.js"></script></head><body></body></html>`;
    const pathF = path.join(dirF, 'f.html');
    fs.writeFileSync(pathF, htmlF, 'utf8');
    const F = buildBundle({ html: pathF, dir: dirF, status: '412' }).bundle;
    ok('F: 文件名变化时按 hash-token 命中', F.externalScripts[0].resolved === true && F.externalScripts[0].matchType === 'hash-token', JSON.stringify(F.externalScripts));
    ok('F: 降级匹配必须告警', F.warnings.some((w) => w.includes('哈希片段')), JSON.stringify(F.warnings));

    // --- 夹具 G：目录内仅一个 .js → sole-js 采纳但必须告警
    const dirG = sub('g');
    fs.writeFileSync(path.join(dirG, 'unknown-name.js'), 'var _$aa=1;', 'utf8');
    const htmlG = `<html><head><meta content="${'G'.repeat(60)}">
<script>var $_ts={};if($_ts.cd){var z=1;}</script>
<script src="/totally-different.js"></script></head><body></body></html>`;
    const pathG = path.join(dirG, 'g.html');
    fs.writeFileSync(pathG, htmlG, 'utf8');
    const G = buildBundle({ html: pathG, dir: dirG, status: '412' }).bundle;
    ok('G: 唯一候选按 sole-js 采纳', G.externalScripts[0].resolved === true && G.externalScripts[0].matchType === 'sole-js', JSON.stringify(G.externalScripts));
    ok('G: sole-js 必须要求人工确认', G.warnings.some((w) => w.includes('人工确认')), JSON.stringify(G.warnings));

    // --- 夹具 H：`_$xx = _$yy.call(...)` 是 VM 内部高频写法，不得单独定代（防假阳性回归）
    const dirH = sub('h');
    const htmlH = `<html><head><meta content="${'H'.repeat(60)}">
<script>var $_ts={};var _$ab = _$cd.call(_$ef, _$gh);var _$ij = _$kl.call(_$mn);</script></head><body></body></html>`;
    const pathH = path.join(dirH, 'h.html');
    fs.writeFileSync(pathH, htmlH, 'utf8');
    const H = buildBundle({ html: pathH, dir: dirH }).bundle;
    ok('H: 仅有 plain-call 形态时不得给代际结论', H.generation.hint === null, JSON.stringify(H.generation.ranked));
    ok('H: plain-call 记入证据但不计分', H.generation.evidence.some((e) => e.includes('eval-call-plain') && e.includes('不计分')), JSON.stringify(H.generation.evidence));

    // --- 辅助函数
    ok('I: parseAttrs 解出引号/无引号属性', (() => {
      const a = parseAttrs(' id="x" content=\'y\' data-r=z ');
      return a.id === 'x' && a.content === 'y' && a['data-r'] === 'z';
    })());
    ok('I: analyzeText 判定单行', analyzeText('t', 'var a=1;').singleLine === true && analyzeText('t', 'var a=1;\nvar b=2;').singleLine === false, 'singleLine check');
    ok('I: parseCookies 处理多 Cookie', parseCookies('a=1; b=22, c=333').length === 3, JSON.stringify(parseCookies('a=1; b=22, c=333')));
    ok('I: parseCookies 无端口时后缀取末位', (() => {
      const c = parseCookies('NfBCSins2OywT=0fq1');
      return c[0].port === null && c[0].suffixLetter === 'T';
    })(), JSON.stringify(parseCookies('NfBCSins2OywT=0fq1')));

    // --- 确定性：同一输入两次抽取，除时间戳外应完全一致
    const A2 = buildBundle({ html: pathA, dir: dirA, status: '412' }).bundle;
    const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.generatedAt; return JSON.stringify(c); };
    ok('J: 同一输入两次抽取结果一致（确定性）', strip(A) === strip(A2), 'bundle 不稳定');

    // --- markdown 渲染不抛错且包含关键小节
    const md = renderMarkdown(A);
    ok('K: markdown 含三件套小节', md.includes('## 三件套') && md.includes('## 代际信号'), 'markdown 结构缺失');
    ok('K: bundle 不含内联脚本文本（避免快照外泄进产物）', strip(A).includes('"code"') === false, 'bundle 不应携带内联脚本原文');

    const failed = checks.filter((c) => !c.pass);
    console.log(`\n自检：${checks.length - failed.length}/${checks.length} 通过`);
    return failed.length === 0;
  } catch (err) {
    console.error(`自检异常：${err && err.stack ? err.stack : err}`);
    return false;
  } finally {
    cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildBundle, renderMarkdown, parseAttrs, analyzeText, parseCookies, classifyGeneration, extractMeta, extractScripts };
