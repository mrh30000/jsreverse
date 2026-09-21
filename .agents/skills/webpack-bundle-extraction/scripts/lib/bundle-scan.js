'use strict';

/**
 * bundle-scan.js —— 打包产物（webpack / browserify / rollup）结构扫描（零依赖）
 *
 * 设计前提（B11 固化）：
 *   1. **不执行输入代码**。本库只做「按字符位置的结构识别」，所有对外接口都是纯函数。
 *   2. **掩码后再正则**。字符串/注释/正则字面量里的 `{` `}` `(` `)` `:` 会污染括号匹配，
 *      所以先产出等长掩码串 `masked`（字面量内容替换为空格，保留换行与定界符本身），
 *      所有「找括号配对」「找函数体」都在 `masked` 上做；
 *      需要读原文（模块 id、模块源码）时用 `masked` 上的偏移回查 `raw`。
 *   3. 掩码的已知边界：模板字面量 `${}` 里的代码会被一并掩掉（真实打包产物极少出现）。
 *      本库不解析语法，因此不做「掩码串能不能 parse」的假设。
 *
 * 关键判据（比正则更可靠的那一条）：
 *   **位置校验** —— 任何在 `raw` 上正则命中、但要求它必须是「真代码」的位置，
 *   都要回查 `masked[pos]` 是否等于该字符。这一条把「字符串里的假命中」全部挡掉，
 *   是本库与「一把梭正则」的本质区别。
 */

const WS = /\s/;

/** 关键字集合：`return /re/` 里的 `/` 是正则而不是除号。 */
const REGEX_PREV_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

/**
 * 产出等长掩码串：注释与字符串/模板/正则字面量的内容替换为空格。
 * 换行符原样保留（保证行号可用），字符串定界符保留（便于肉眼核对）。
 */
function maskLiterals(src) {
  const out = src.split('');
  const n = src.length;
  let i = 0;

  const prevSignificant = (from) => {
    for (let j = from - 1; j >= 0; j--) {
      const c = src[j];
      if (!WS.test(c)) return c;
    }
    return '';
  };
  const prevWord = (from) => {
    let j = from - 1;
    while (j >= 0 && WS.test(src[j])) j--;
    const end = j;
    while (j >= 0 && /[A-Za-z0-9_$]/.test(src[j])) j--;
    return src.slice(j + 1, end + 1);
  };
  const blank = (k) => { if (out[k] !== '\n') out[k] = ' '; };

  while (i < n) {
    const c = src[i];

    // 行注释
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') { blank(i); i++; }
      continue;
    }
    // 块注释
    if (c === '/' && src[i + 1] === '*') {
      blank(i); blank(i + 1); i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { blank(i); i++; }
      if (i < n) { blank(i); blank(i + 1); i += 2; }
      continue;
    }
    // 字符串 / 模板字面量
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') { blank(i); if (i + 1 < n) blank(i + 1); i += 2; continue; }
        if (src[i] === q) break;
        if (src[i] === '\n' && q !== '`') break;   // 未闭合的单/双引号：到此为止
        blank(i);
        i++;
      }
      if (i < n && src[i] === q) i++;
      continue;
    }
    // 正则字面量（判定「上一个有效字符不是可作除号左操作数的结尾」）
    if (c === '/') {
      const p = prevSignificant(i);
      const isRegex = p === '' || /[(,=:[!&|?{};+\-*%~^<>]/.test(p)
        || (p !== '' && /[A-Za-z_$]/.test(p) && REGEX_PREV_KEYWORDS.has(prevWord(i)));
      if (isRegex) {
        i++;
        let inClass = false;
        while (i < n) {
          const d = src[i];
          if (d === '\\') { blank(i); if (i + 1 < n) blank(i + 1); i += 2; continue; }
          if (d === '\n') break;                   // 未闭合：中止
          if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) { i++; break; }
          blank(i);
          i++;
        }
        continue;
      }
    }
    i++;
  }
  return out.join('');
}

/**
 * 在掩码串上求配对括号。`i` 必须指向 `(` `[` `{` 之一。
 * 返回配对闭合符的下标；找不到返回 -1。
 */
function matchPair(masked, i) {
  const open = masked[i];
  const close = open === '(' ? ')' : open === '[' ? ']' : open === '{' ? '}' : null;
  if (!close) return -1;
  let depth = 0;
  for (let j = i; j < masked.length; j++) {
    const c = masked[j];
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return j; }
  }
  return -1;
}

/** 跳过空白，返回下一个非空白字符下标（越界返回 -1）。 */
function skipWs(s, i) {
  while (i < s.length && WS.test(s[i])) i++;
  return i < s.length ? i : -1;
}

/**
 * 扫描所有 `function` 函数（声明与表达式）。返回按出现顺序排列的数组：
 *   { name, params, headerStart, bodyStart, bodyEnd, argStart }
 * `bodyStart` 指向 `{`，`bodyEnd` 指向配对的 `}`。
 * 匿名函数 `name` 为 ''。
 */
function findFunctions(masked) {
  const out = [];
  const re = /(?<![\w$.])function\b/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    let i = skipWs(masked, m.index + 'function'.length);
    if (i < 0) break;
    if (masked[i] === '*') { i = skipWs(masked, i + 1); if (i < 0) break; }  // function*
    let name = '';
    const nm = /^[A-Za-z_$][\w$]*/.exec(masked.slice(i));
    if (nm) { name = nm[0]; i = skipWs(masked, i + nm[0].length); }
    if (i < 0 || masked[i] !== '(') continue;         // 不是标准函数头
    const closeParen = matchPair(masked, i);
    if (closeParen < 0) continue;
    const params = masked.slice(i + 1, closeParen);
    const j = skipWs(masked, closeParen + 1);
    if (j < 0 || masked[j] !== '{') continue;         // 无函数体（极少见）
    const bodyEnd = matchPair(masked, j);
    if (bodyEnd < 0) continue;
    out.push({
      name,
      params: params.trim(),
      headerStart: m.index,
      argStart: i,
      bodyStart: j,
      bodyEnd,
    });
  }
  return out;
}

/** 把参数表按顶层逗号切成数组（用于判断「一元参数」的 loader）。 */
function splitParams(params) {
  return params.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * 识别 webpack 加载器（`__webpack_require__` 的等价物）。
 *
 * 判据（三条同时成立才算 loader，避免把业务函数误判进来）：
 *   A. 恰好 1 个形参 `p`；
 *   B. 体内至少 2 处 `SOMETHING[ p ]` 形式的「按 id 取表」；
 *   C. 体内有 `.call(` 与 `.exports`。
 * 另外单独识别两种典型形态用于提高置信度：
 *   经典（webpack ≤4）：`if (X[p]) return X[p].exports;`
 *   新版（webpack 5）  ：`if (X[p] !== undefined) return X[p].exports;`
 *
 * 返回按置信度降序的候选数组，元素：
 *   { name, param, cacheIdent, modulesIdent, confidence, evidence[] }
 */
function findLoaders(masked, functions) {
  const cands = [];
  for (const fn of functions) {
    const ps = splitParams(fn.params);
    if (ps.length !== 1) continue;
    const p = ps[0];
    if (!/^[A-Za-z_$][\w$]*$/.test(p)) continue;
    const body = masked.slice(fn.bodyStart, fn.bodyEnd + 1);
    if (!/\.call\s*\(/.test(body)) continue;
    if (!/\.exports/.test(body)) continue;

    const idx = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\[\\s*${p}\\s*\\]`, 'g');
    const idents = [];
    let mm;
    while ((mm = idx.exec(body)) !== null) if (!idents.includes(mm[1])) idents.push(mm[1]);

    const evidence = [];
    let cacheIdent = '';
    let modulesIdent = '';
    const classic = new RegExp(
      `if\\s*\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\[\\s*${p}\\s*\\]\\s*\\)\\s*return\\s+\\1\\s*\\[\\s*${p}\\s*\\]\\s*\\.\\s*exports`);
    const modern = new RegExp(
      `if\\s*\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\[\\s*${p}\\s*\\]\\s*!==\\s*undefined\\s*\\)`);
    // webpack 5 官方 runtime 的写法：先把缓存项取到局部变量，再判 undefined
    //   `var r = i[e]; if (r !== undefined) return r.exports;`
    const varCache = new RegExp(
      `var\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*\\[\\s*${p}\\s*\\]\\s*;[\\s\\S]{0,120}?if\\s*\\(\\s*\\1\\s*!==\\s*undefined\\s*\\)`);
    const mc = classic.exec(body);
    const mm2 = modern.exec(body);
    const mv = varCache.exec(body);
    if (mc) { cacheIdent = mc[1]; evidence.push('classic-cache-check'); }
    else if (mm2) { cacheIdent = mm2[1]; evidence.push('modern-undefined-cache-check'); }
    else if (mv) { cacheIdent = mv[2]; evidence.push('webpack5-localvar-cache-check'); }

    const callRe = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\[\\s*${p}\\s*\\]\\s*\\.\\s*call\\s*\\(`);
    const cm = callRe.exec(body);
    if (cm) { modulesIdent = cm[1]; evidence.push('modules-table-call'); }

    if (!modulesIdent) {
      // 退路：`.call(` 的接收者写成 `X[p]` 之外的形态时，取另一个「按 id 取表」的标识符
      const other = idents.filter((x) => x !== cacheIdent);
      if (other.length) { modulesIdent = other[0]; evidence.push('modules-ident-heuristic'); }
    }
    if (idents.length >= 2) evidence.push(`indexed-idents:${idents.join('/')}`);
    if (!cacheIdent && !modulesIdent) continue;

    let confidence = 0;
    if (mc || mm2 || mv) confidence += 2;
    if (cm) confidence += 2;
    if (idents.length >= 2) confidence += 1;
    if (fn.name && /^(__webpack_require__|r|n|e|o|c|s|d|u|t|f|i|a|b)$/.test(fn.name)) confidence += 1;
    if (confidence < 3) continue;

    cands.push({ name: fn.name, param: p, cacheIdent, modulesIdent, confidence, evidence, fn });
  }
  cands.sort((a, b) => b.confidence - a.confidence || (b.fn.bodyEnd - b.fn.bodyStart) - (a.fn.bodyEnd - a.fn.bodyStart));
  return cands;
}

/** 从 `keyStart` 向前找包住它的对象字面量起始 `{`（掩码串上）。找不到返回 -1。 */
function enclosingObjectStart(masked, keyStart) {
  let depth = 0;
  for (let j = keyStart - 1; j >= 0; j--) {
    const c = masked[j];
    if (c === ')' || c === ']' || c === '}') depth++;
    else if (c === '(' || c === '[') { if (depth === 0) return -1; depth--; }
    else if (c === '{') { if (depth === 0) return j; depth--; }
  }
  return -1;
}

/**
 * 扫描模块表（`{ "id": function(...){...}, ... }` 形态）。
 * 做法：在 `raw` 上找 `key: function` / `key: (...) =>`，再用 `masked` 校验该 `:` 是真代码；
 * 随后按「所属对象字面量」分组，条目最多的那组即模块表。
 *
 * 返回按条目数降序的数组，元素：
 *   { start, end, count, moduleLike, entries:[{ key, keyStart, valueStart, valueEnd, form }] }
 * `form` 为 `function` 或 `arrow`。
 *
 * 两个关键修正（都是实测踩出来的）：
 *   1. **模块 id 可以以数字开头**（`10:` / `245:`），所以键的正则必须是 `[A-Za-z0-9_$]+`
 *      而不是标识符正则；用标识符正则会**一条都匹配不到**，然后退化成
 *      「把模块体内的 `dbl:function(a){}` 当成模块表」——条目数 1、id 是 `dbl`，
 *      **看着像识别成功了，其实全错**。
 *   2. 因此再加一层 `moduleLike` 打分：真正的模块函数形参个数是 1~3
 *      （`(module,exports,__webpack_require__)`），业务对象里的方法常是别的形态。
 *      排序时先比条目数、再比 moduleLike，避免把嵌套对象当成模块表。
 */
function findModuleTables(raw, masked) {
  const re = /(?:^|[,{;])\s*(?:"([^"\n]*)"|'([^'\n]*)'|([A-Za-z0-9_$]+))\s*:\s*(function\b|\([^()\n]*\)\s*=>)/g;
  const allFns = findFunctions(masked);
  const groups = new Map();
  let m;
  while ((m = re.exec(raw)) !== null) {
    const colon = raw.indexOf(':', m.index);
    if (colon < 0) continue;
    if (masked[colon] !== ':') continue;                 // 位置校验：必须在真代码里
    const keyStart = m.index + (m[0].length - m[0].replace(/^\s*[,{;]?\s*/, '').length);
    const key = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
    const vs = raw.indexOf(m[4], m.index);
    if (vs < 0) continue;
    if (masked[vs] !== 'f' && masked[vs] !== '(') continue;   // 位置校验

    const objStart = enclosingObjectStart(masked, keyStart);
    if (objStart < 0) continue;
    const objEnd = matchPair(masked, objStart);
    if (objEnd < 0) continue;

    let valueEnd;
    let params = [];
    if (m[4] === 'function') {
      const hit = allFns.find((f) => f.headerStart === vs);
      if (!hit) continue;
      valueEnd = hit.bodyEnd;
      params = splitParams(hit.params);
    } else {
      const arrowAt = raw.indexOf('=>', vs);
      if (arrowAt < 0) continue;
      const braceAt = skipWs(masked, arrowAt + 2);
      if (braceAt < 0 || masked[braceAt] !== '{') continue;
      const e = matchPair(masked, braceAt);
      if (e < 0) continue;
      valueEnd = e;
      params = splitParams(masked.slice(vs + 1, matchPair(masked, vs)));
    }
    const nParams = params.length;
    if (nParams > 4) continue;                            // 明显不是模块函数

    const gkey = objStart + ':' + objEnd;
    if (!groups.has(gkey)) groups.set(gkey, { start: objStart, end: objEnd, entries: [] });
    const g = groups.get(gkey);
    if (g.entries.some((e) => e.keyStart === keyStart)) continue;
    g.entries.push({
      key,
      keyStart,
      valueStart: vs,
      valueEnd,
      form: m[4] === 'function' ? 'function' : 'arrow',
      nParams,
      // 模块函数的形参名**必须留下**：第三个形参才是该模块体内的 require，
      // 而它的名字与加载器自己的函数名常常不同（加载器叫 `e`，模块里叫 `n`）。
      // 只按加载器名找依赖调用，会得到「闭包只有入口模块」这种**静默残缺**结果。
      params,
    });
  }
  const out = [...groups.values()].filter((g) => g.entries.length > 0);
  for (const g of out) {
    g.count = g.entries.length;
    g.entries.sort((a, b) => a.keyStart - b.keyStart);
    const mod = g.entries.filter((e) => e.nParams >= 1 && e.nParams <= 3).length;
    g.moduleLike = g.entries.length ? mod / g.entries.length : 0;
  }
  // 剔除「被别的候选表整段包住」的嵌套对象：模块体内的 `e.exports = { fn: function(){} }`
  // 会长成一个 1 项的子表，不剔掉会让调用方看到一堆假表。
  const nested = new Set();
  for (const a of out) {
    for (const b of out) {
      if (a === b) continue;
      if (a.start > b.start && a.end < b.end) { nested.add(a); break; }
    }
  }
  return out
    .filter((g) => !nested.has(g))
    .sort((a, b) => b.count - a.count || b.moduleLike - a.moduleLike);
}

/** 在掩码串上按顶层逗号切分实参表（`(` 与 `)` 之间）。 */
function splitArgs(masked, from, to) {
  const parts = [];
  let depth = 0;
  let start = from;
  for (let i = from; i <= to; i++) {
    const c = i === to ? ',' : masked[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { parts.push([start, i]); start = i + 1; }
  }
  return parts.map(([a, b]) => ({ start: a, end: b }));
}

/**
 * 取 `.push` 之前的接收者表达式文本（仅用于报告）。
 *   `(window.webpackJsonp = window.webpackJsonp || []).push` → `(window.webpackJsonp = window.webpackJsonp || [])`
 *   `self.webpackChunkapp.push`                            → `self.webpackChunkapp`
 *   `xxx.push`                                             → `xxx`
 */
function describeCallee(raw, masked, dotPos) {
  let end = dotPos;
  while (end > 0 && WS.test(raw[end - 1])) end--;
  if (end === 0) return '';
  const prev = raw[end - 1];
  if (prev === ')') {
    // 从右往左找与它配对的 `(`
    let depth = 0;
    for (let j = end - 1; j >= 0; j--) {
      const c = masked[j];
      if (c === ')' || c === ']') depth++;
      else if (c === '(' || c === '[') { depth--; if (depth === 0) return raw.slice(j, end); }
    }
  }
  let start = end;
  while (start > 0 && /[A-Za-z0-9_$.]/.test(raw[start - 1])) start--;
  return raw.slice(start, end);
}

/**
 * 解析注册语句的「载荷」：chunk 名数组 + 模块表（+ 可选入口 id 列表）。
 *
 * 两种真实写法（**都要认，只认一种会漏掉整站**）：
 *   ① 单数组实参：`.push([[chunkIds], {模块表}, [[入口id]]])`
 *   ② 多实参：    `webpackJsonpdxCaptcha(["basic-captcha-js"], {模块表})`
 * ② 是 webpack 4「把 JSONP 数组替换成函数」之后的调用形态，实测存在于顶象 `captcha.js`。
 *
 * 返回 { chunkIds, tableStart, tableEnd, idsText, tailText } 或 null。
 */
function parsePayload(raw, masked, lp, rp) {
  const args = splitArgs(masked, lp + 1, rp);
  if (!args.length) return null;

  const takeRange = (a, b) => raw.slice(a, b + 1);
  const tryPair = (idsFrom, idsTo, tableFrom) => {
    const idsStart = skipWs(masked, idsFrom);
    if (idsStart < 0 || idsStart > idsTo || masked[idsStart] !== '[') return null;
    const idsEnd = matchPair(masked, idsStart);
    if (idsEnd < 0) return null;
    const tbl = skipWs(masked, tableFrom);
    if (tbl < 0 || masked[tbl] !== '{') return null;
    const tblEnd = matchPair(masked, tbl);
    if (tblEnd < 0) return null;
    const chunkIds = [];
    for (const q of raw.slice(idsStart + 1, idsEnd).matchAll(/["']([^"']*)["']|(\d+)/g)) {
      chunkIds.push(q[1] !== undefined ? q[1] : q[2]);
    }
    return { chunkIds, tableStart: tbl, tableEnd: tblEnd, idsText: takeRange(idsStart, idsEnd), tailText: '' };
  };

  // 形态②：至少两个实参，arg0 = chunk 名数组，arg1 = 模块表
  if (args.length >= 2) {
    const hit = tryPair(args[0].start, args[0].end, args[1].start);
    if (hit) {
      if (args.length >= 3) {
        const t0 = skipWs(masked, args[2].start);
        const t1 = t0 >= 0 ? matchPair(masked, t0) : -1;
        if (t1 > 0) hit.tailText = takeRange(t0, t1);
      }
      return hit;
    }
  }

  // 形态①：单个数组实参（外层数组是整体载荷）
  if (args.length === 1) {
    const outer = skipWs(masked, args[0].start);
    if (outer < 0 || masked[outer] !== '[') return null;
    const outerEnd = matchPair(masked, outer);
    if (outerEnd < 0) return null;
    const elems = splitArgs(masked, outer + 1, outerEnd);
    if (elems.length < 2) return null;
    const hit = tryPair(elems[0].start, elems[0].end, elems[1].start);
    if (!hit) return null;
    if (elems.length >= 3) {
      const t0 = skipWs(masked, elems[2].start);
      const t1 = t0 >= 0 ? matchPair(masked, t0) : -1;
      if (t1 > 0) hit.tailText = takeRange(t0, t1);
    }
    return hit;
  }
  return null;
}

/**
 * 扫描「模块注册语句」。返回数组，元素：
 *   { kind:'push'|'call', calleeExpr, start, end, chunkIds, table:{start,end}, idsText, tailText, moduleTable }
 *
 * kind 决定重建方式：`push` 要 `.push(...)`，`call` 直接 `CALLEE(...)`。
 */
function findRegistrations(raw, masked) {
  const out = [];
  const seen = new Set();

  const add = (kind, calleeExpr, start, end, lp, rp, pushDot) => {
    const payload = parsePayload(raw, masked, lp, rp);
    if (!payload) return;
    const tables = findModuleTables(raw, masked).filter((t) => t.start === payload.tableStart);
    if (!tables.length) return;
    const key = start + ':' + calleeExpr;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kind,
      calleeExpr,
      start,
      end: rp,
      chunkIds: payload.chunkIds,
      table: { start: payload.tableStart, end: payload.tableEnd },
      idsText: payload.idsText,
      tailText: payload.tailText,
      moduleTable: tables[0],
      pushDot: pushDot === undefined ? -1 : pushDot,
    });
  };

  // ① push 形态
  const pushRe = /\.\s*push\s*\(/g;
  let m;
  while ((m = pushRe.exec(masked)) !== null) {
    const lp = masked.indexOf('(', m.index);
    const rp = matchPair(masked, lp);
    if (rp < 0) continue;
    add('push', describeCallee(raw, masked, m.index), m.index, rp, lp, rp, m.index);
  }

  // ② 直接调用形态：`webpackJsonp<名>([...], {...})` / `webpackChunk<名>([[...],{...}])`
  const identRe = /\b(?:webpackJsonp|webpackChunk)[A-Za-z0-9_$]*/g;
  while ((m = identRe.exec(masked)) !== null) {
    const nxt = skipWs(masked, m.index + m[0].length);
    if (nxt < 0 || masked[nxt] !== '(') continue;      // 形如 `window.webpackJsonp || []` 的不是调用
    const rp = matchPair(masked, nxt);
    if (rp < 0) continue;
    add('call', m[0], m.index, rp, nxt, rp, -1);
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/** 打包器家族信号（全部在掩码串上判，避免把注释/字符串里的词当成信号）。 */
function familySignals(masked) {
  const has = (re) => re.test(masked);
  return {
    // 注意必须允许后缀：真实站点常把全局名改成 `webpackJsonpdxCaptcha` 这类
    // （实测顶象 `captcha.js`）。用 `\bwebpackJsonp\b` 会**一条都匹配不到** ——
    // 后面紧跟的是单词字符，那里没有词边界。
    webpackChunk: has(/\bwebpackChunk[A-Za-z0-9_$]*/),
    webpackJsonp: has(/\bwebpackJsonp[A-Za-z0-9_$]*/),
    reqDevNames: has(/\b__webpack_require__\b/) || has(/\b__webpack_modules__\b/) || has(/\b__webpack_module_cache__\b/),
    runtimeHelpers: has(/\.\s*d\s*=\s*function\s*\(/) && has(/\.\s*o\s*=\s*function\s*\(/) || has(/\b__webpack_require__\.(d|o|t|e|n|r)\b/),
    asyncChunk: has(/\.\s*e\s*\(\s*["'][^"']*["']\s*\)/) || has(/\b__webpack_require__\.e\b/),
    browserify: has(/\[\s*function\s*\(\s*require\s*,\s*module\s*,\s*exports\s*\)/) || has(/typeof\s+require\s*==\s*["']function["']\s*&&\s*require/),
    esm: has(/^\s*export\s/m) || has(/^\s*import\s/m) || has(/\bimport\s*\(/),
    selfName: has(/\bself\s*\[\s*["']webpackChunk/),
  };
}

module.exports = {
  maskLiterals,
  matchPair,
  skipWs,
  findFunctions,
  splitParams,
  findLoaders,
  findModuleTables,
  findRegistrations,
  parsePayload,
  splitArgs,
  familySignals,
  enclosingObjectStart,
};
