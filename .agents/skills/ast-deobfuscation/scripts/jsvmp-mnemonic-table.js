#!/usr/bin/env node
/**
 * jsvmp-mnemonic-table.js — 从 JSVMP 的「指令函数数组」抽出**跨版本稳定的助记符表**。
 *
 * ## 要解决的问题
 *
 * 腾讯防水墙 TDC.js 这类 VM，指令数组**每次请求都会被打乱重排**：
 * 序号会变、数组变量名会变（这次叫 `w`，下次叫 `Q`），只有指令的**动作结构**不变。
 *
 *   // 这次
 *   I[I.length - 2] = I[I.length - 2] + I.pop();
 *   // 下次（同一动作）
 *   Q[Q.length - 2] = Q[Q.length - 2] + Q.pop();
 *
 * 所以**不能按序号识别指令**。必须先做一次"变量名归一化"，把动作变成与混淆无关的助记符：
 *
 *   #[#.length - 2] = #[#.length - 2] + #.pop()
 *
 * 归一化后，同一动作在任何一次混淆产物里都得到**完全相同的字符串**，
 * 于是可以建一张"助记符 → 语义"的映射表，反编译器只认这张表，不再关心序号。
 *
 * ## 用法
 *
 *   node jsvmp-mnemonic-table.js --input tdc.js --out mnemonics.json
 *   node jsvmp-mnemonic-table.js --input tdc.js --pretty --min-size 10
 *   node jsvmp-mnemonic-table.js --diff a.json b.json     # 比较两次抓取的指令语义是否一致
 *   node jsvmp-mnemonic-table.js --selftest
 *
 * 退出码：0 成功；1 `--diff` 发现语义集合不一致 / `--strict` 下未找到指令数组；2 参数错误。
 *
 * 零依赖（不需要 @babel/*）。指令数组是高度规律的数组字面量，文本扫描 + 括号配平足够；
 * 被压得连数组字面量都变形时，才需要转到 AST pass。
 */

'use strict';

const fs = require('fs');

// ------------------------------------------------------------ 词法切分

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in',
  'instanceof', 'let', 'new', 'of', 'return', 'super', 'switch', 'this', 'throw', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield', 'async', 'await', 'static', 'get', 'set',
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'arguments',
]);

/** 极简 JS 词法切分：返回 [{type, value}]。type ∈ ident|number|string|punct|comment */
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    // 空白
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    // 注释
    if (ch === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? n : end;
      tokens.push({ type: 'comment', value: src.slice(i, stop) });
      i = stop;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? n : end + 2;
      tokens.push({ type: 'comment', value: src.slice(i, stop) });
      i = stop;
      continue;
    }
    // 字符串 / 模板串
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: 'string', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // 数字（含 0x / 小数 / 指数 / 大数后缀）
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)n?/.exec(src.slice(i));
      const value = m ? m[0] : ch;
      tokens.push({ type: 'number', value });
      i += value.length;
      continue;
    }
    // 标识符
    if (/[A-Za-z_$\u00a0-\uffff]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$\u00a0-\uffff]/.test(src[j])) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // 标点（多字符运算符优先）
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    const ops3 = ['===', '!==', '**=', '>>>', '<<=', '>>=', '&&=', '||=', '??='];
    const ops2 = ['==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**', '=>'];
    if (ops3.includes(three)) {
      tokens.push({ type: 'punct', value: three });
      i += 3;
      continue;
    }
    if (ops2.includes(two)) {
      tokens.push({ type: 'punct', value: two });
      i += 2;
      continue;
    }
    tokens.push({ type: 'punct', value: ch });
    i++;
  }
  return tokens;
}

/**
 * 归一化：把标识符替换成 `#`（或 `#1/#2/...` 区分不同名字），保留关键字/字面量/标点结构。
 *
 * - 同一段代码里**同一个标识符名**映射到同一个占位符（`#1`、`#2`…），
 *   这样 `w.length - 2` 与 `w.length - 2` 保持一致，而 `w` 与 `E` 的区分也保留。
 * - 默认 `--placeholders` 关闭时所有标识符统一成 `#`，**跨版本比对用这个**
 *   （因为变量名会变，只有结构才稳定）。
 * - 开启时保留"同一版本内不同名字的区分"，适合看单个版本内部的语义。
 */
function normalize(tokens, opts = {}) {
  const distinct = !!opts.placeholders;
  const map = new Map();
  let counter = 0;
  const out = [];
  for (const tok of tokens) {
    if (tok.type === 'comment') continue;
    if (tok.type === 'ident' && !KEYWORDS.has(tok.value)) {
      if (!distinct) {
        out.push('#');
      } else {
        if (!map.has(tok.value)) map.set(tok.value, '#' + ++counter);
        out.push(map.get(tok.value));
      }
    } else {
      out.push(tok.value);
    }
  }
  return out
    .join(' ')
    // 紧贴型标点：**前面**不留空格（`# [ # . # - 2 ]` → `#[# . # - 2]`）
    .replace(/\s*([.[\](){};,?])/g, '$1')
    // 开括号与点：**后面**不留空格（`. #` → `.#`）。
    // 闭括号/闭方括号后面**保留**空格，这样 `a[i] = x` 与 `a[i]= x` 归一化后一致。
    .replace(/([([{.])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 去掉指令数组元素外层的 `function (...) { ... }` 壳，只留动作本体。
 *  指令表里每个元素都是这个壳，留着纯属噪音；去掉后助记符直接就是"这条指令做什么"。 */
function stripFunctionWrapper(code) {
  if (!code) return code;
  let m = /^function\s*\([^)]*\)\s*\{([\s\S]*)\}$/.exec(code.trim());
  if (m) return m[1].trim();
  m = /^\(?\s*[A-Za-z_$][\w$]*\s*\)?\s*=>\s*\{([\s\S]*)\}$/.exec(code.trim());
  if (m) return m[1].trim();
  return code;
}

// ------------------------------------------------------------ 括号配平

function matchBracket(src, open, openCh, closeCh) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 按顶层逗号切分数组元素，**保留空洞**（`,` `,` 之间的空位是真实存在的干扰项）。 */
function splitArrayElements(src, start, end) {
  const parts = [];
  let depth = 0;
  let cur = start;
  for (let i = start; i < end; i++) {
    const ch = src[i];
    if (ch === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
      const j = matchBracket(src, i, '\u0000', '\u0000'); // 仅用于跳过？见下
      break;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < end) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(src.slice(cur, i));
      cur = i + 1;
    }
  }
  parts.push(src.slice(cur, end));
  return parts;
}

// ------------------------------------------------------------ 指令数组抽取

/**
 * 找出"指令函数数组"：长度 ≥ minSize、且元素里含 `function` 的数组字面量。
 * 返回 [{ varName, start, end, elements: [{index, code|null}] }]
 */
function extractInstructionArrays(src, opts = {}) {
  const minSize = opts.minSize || 10;
  const found = [];
  const re = /(?:var|let|const)?\s*([A-Za-z_$][\w$]*)?\s*=\s*\[/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(src, open, '[', ']');
    if (close < 0) continue;
    const inner = src.slice(open + 1, close);
    if (!/function/.test(inner)) continue;
    const parts = splitArrayElements(src, open + 1, close);
    if (parts.length < minSize) continue;
    found.push({
      varName: m[1] || null,
      start: open,
      end: close,
      elements: parts.map((code, index) => ({
        index,
        code: code.trim() ? code.trim() : null,
      })),
    });
    re.lastIndex = close + 1;
  }
  return found;
}

/** 把一条指令函数源码归一化成助记符（先剥 `function(){...}` 壳）。 */
function toMnemonic(code, opts = {}) {
  if (!code) return null;
  return normalize(tokenize(stripFunctionWrapper(code)), opts);
}

function buildTable(src, opts = {}) {
  const arrays = extractInstructionArrays(src, opts);
  return arrays.map((arr) => {
    const entries = arr.elements.map((el) => {
      const mnemonic = toMnemonic(el.code, opts);
      // 三态必须分开，不能混：
      //   hole  —— 数组里就是空的（`,` `,`），是**干扰项**，真实 VM 用它做序号偏移
      //   empty —— 有函数体但body为空（`function(){}`），是**合法指令**（no-op），潜在可执行
      //   其余   —— 正常指令
      // 把 hole 与 empty 混为一谈会导致"序号偏移"算错，反编译出来的控制流整体错位。
      const kind = el.code === null ? 'hole' : mnemonic === '' || mnemonic === null ? 'empty' : 'instruction';
      return { index: el.index, hole: kind === 'hole', empty: kind === 'empty', kind, mnemonic, code: el.code };
    });
    const unique = [...new Set(entries.filter((e) => e.kind === 'instruction').map((e) => e.mnemonic))];
    return {
      varName: arr.varName,
      size: entries.length,
      holes: entries.filter((e) => e.kind === 'hole').length,
      empties: entries.filter((e) => e.kind === 'empty').length,
      distinctMnemonics: unique.length,
      entries,
    };
  });
}

// ------------------------------------------------------------ 自检

function selftest() {
  const failures = [];
  let total = 0;
  const check = (name, cond, extra) => {
    total++;
    if (!cond) failures.push(name + (extra ? ' :: ' + extra : ''));
  };

  // 1) 词法切分：字符串/注释里的标点不能当代码
  const toks = tokenize('a = "x,y]"; // ] ,\nb = `t${c}`;');
  check('tokenize-string', toks.some((t) => t.type === 'string' && t.value === '"x,y]"'));
  check('tokenize-comment', toks.some((t) => t.type === 'comment'));
  check('tokenize-template', toks.some((t) => t.type === 'string' && t.value.startsWith('`')));

  // 2) 归一化必须**与变量名无关**：这正是"指令乱序 + 改名"下唯一稳定的东西
  const v1 = 'I[I.length - 2] = I[I.length - 2] + I.pop();';
  const v2 = 'Q[Q.length - 2] = Q[Q.length - 2] + Q.pop();';
  check('mnemonic-rename-invariant', toMnemonic(v1) === toMnemonic(v2), toMnemonic(v1) + ' vs ' + toMnemonic(v2));
  check('mnemonic-keeps-structure', toMnemonic(v1) === '#[#.# - 2] = #[#.# - 2] + #.#();', toMnemonic(v1));

  // 3) 关键字 / 字面量 / 标点必须保留（否则不同语义会被归一成同一个助记符）
  const a1 = 'Z = Codes[PC++];';
  const a2 = 'Z = Codes[PC--];';
  check('mnemonic-keeps-operators', toMnemonic(a1) !== toMnemonic(a2), toMnemonic(a1) + ' vs ' + toMnemonic(a2));
  check('mnemonic-keeps-keywords', toMnemonic('switch (x) { case 1: return typeof y; }') === 'switch(#){case 1 : return typeof #;}', toMnemonic('switch (x) { case 1: return typeof y; }'));
  check('mnemonic-keeps-numbers', /8/.test(toMnemonic('e.uint32(8)')), toMnemonic('e.uint32(8)'));
  check('mnemonic-keeps-strings', /"debugger"/.test(toMnemonic('x("debugger")')), toMnemonic('x("debugger")'));

  // 4) 语义不同的指令**不能**归一成同一个助记符；空洞要占位但不产生助记符
  //    这是 `[fn1, , fn2, fn3]` —— 4 个槽位，1 个空洞（真实 VM 数组里就靠这种空洞做干扰）
  const src4 = `var I = [
    function () { w[w.length - 2] = w[w.length - 2] + w.pop(); },
    ,function () { w[w.length - 2] = w[w.length - 2] - w.pop(); },
    function () { w[w.length - 2] = w[w.length - 2] + w.pop(); }
  ];`;
  const table = buildTable(src4, { minSize: 2 });
  check('array-found', table.length === 1, 'got ' + table.length);
  if (table[0]) {
    check('array-size', table[0].size === 4, 'size=' + table[0].size);
    check('array-holes', table[0].holes === 1, 'holes=' + table[0].holes);
    check('array-distinct', table[0].distinctMnemonics === 2, 'distinct=' + table[0].distinctMnemonics);
    check('array-hole-slot', table[0].entries[1].hole === true && table[0].entries[1].mnemonic === null, JSON.stringify(table[0].entries[1]));
    check('array-minus-mnemonic', (table[0].entries[2].mnemonic || '').startsWith('#[#.# - 2] = #[#.# - 2] - '), String(table[0].entries[2].mnemonic));
    // 序号会变：把同一动作换到别的下标，助记符必须一模一样
    check('array-mnemonic-position-invariant', table[0].entries[0].mnemonic === table[0].entries[3].mnemonic, table[0].entries[0].mnemonic + ' vs ' + table[0].entries[3].mnemonic);
  }

  // 5) 空洞不产生助记符（否则会污染"助记符 → 语义"映射表）
  check('hole-no-mnemonic', table[0].entries.filter((e) => e.mnemonic === null).length === 1);

  // 6) `--placeholders` 模式：同一版本内不同名字要区分开
  const m1 = normalize(tokenize('w = E[x];'), { placeholders: true });
  const m2 = normalize(tokenize('w = w[x];'), { placeholders: true });
  check('placeholders-distinguish', m1 !== m2, m1 + ' vs ' + m2);

  // 7) 括号配平要跳过字符串/注释里的括号
  const tricky = 'var I = [function(){ return "]["; }, function(){ return 1; }, function(){ return 2; }];';
  const t2 = buildTable(tricky, { minSize: 2 });
  check('bracket-skips-strings', t2.length === 1 && t2[0].size === 3, JSON.stringify(t2.map((x) => x.size)));

  // 8) 不满足 min-size / 不含 function 的数组不应被误认
  check('no-false-positive-small', extractInstructionArrays('var x = [1,2,3];', { minSize: 2 }).length === 0);
  check('no-false-positive-nofunc', extractInstructionArrays('var x = [1,2,3,4,5,6,7,8,9,10,11];', { minSize: 2 }).length === 0);

  // 9) 多字符运算符不能被切成两个单字符（否则 `>>>` 与 `>>` 会混）
  check('tokenize-urshift', tokenize('a >>> 3').some((t) => t.type === 'punct' && t.value === '>>>'), JSON.stringify(tokenize('a >>> 3').map((t) => t.value)));
  check('mnemonic-urshift-distinct', toMnemonic('a >>> 3') !== toMnemonic('a >> 3'), toMnemonic('a >>> 3') + ' vs ' + toMnemonic('a >> 3'));

  // 10) 数字字面量形态要保留（0x / 小数 / 大数）
  check('tokenize-hex', /0x1f/.test(toMnemonic('x = 0x1f')), toMnemonic('x = 0x1f'));
  check('tokenize-float', /1\.5/.test(toMnemonic('x = 1.5')), toMnemonic('x = 1.5'));

  // 11) hole 与 empty 是两种不同状态，绝不能混（混了会让序号整体错位）
  const src11 = 'var C = [function(){ return 1; }, , function(){}, function(){ return 2; }];';
  const t11 = buildTable(src11, { minSize: 2 })[0];
  check('kind-hole', t11.entries[1].kind === 'hole' && t11.entries[1].hole === true, JSON.stringify(t11.entries[1]));
  check('kind-empty', t11.entries[2].kind === 'empty' && t11.entries[2].hole === false, JSON.stringify(t11.entries[2]));
  check('kind-instruction', t11.entries[0].kind === 'instruction');
  check('kind-counts', t11.holes === 1 && t11.empties === 1 && t11.distinctMnemonics === 2,
    'holes=' + t11.holes + ' empties=' + t11.empties + ' distinct=' + t11.distinctMnemonics);

  // 12) 序号不变性：同一动作换个下标，助记符必须一致（这是整个工具存在的理由）
  const srcA = 'var C = [function(){ w[w.length-2] = w[w.length-2] ^ w.pop(); }, function(){ return 1; }];';
  const srcB = 'var Z = [function(){ return 1; }, function(){ Q[Q.length-2] = Q[Q.length-2] ^ Q.pop(); }];';
  const tA = buildTable(srcA, { minSize: 2 })[0];
  const tB = buildTable(srcB, { minSize: 2 })[0];
  check('cross-version-mnemonic-stable',
    tA.entries[0].mnemonic === tB.entries[1].mnemonic,
    tA.entries[0].mnemonic + ' vs ' + tB.entries[1].mnemonic);
  check('cross-version-var-rename', tA.varName === 'C' && tB.varName === 'Z');

  if (failures.length) {
    console.log('SELFTEST FAIL (' + failures.length + '/' + total + ')');
    failures.forEach((x) => console.log('  - ' + x));
    return 1;
  }
  console.log('SELFTEST PASS (' + total + '/' + total + ')');
  return 0;
}

// ------------------------------------------------------------ CLI

function parseArgs(argv) {
  const o = { input: null, out: null, diff: null, minSize: 10, pretty: false, strict: false, selftest: false, placeholders: false, full: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') o.input = argv[++i];
    else if (a === '--out' || a === '-o') o.out = argv[++i];
    else if (a === '--diff') o.diff = argv.slice(i + 1, i + 3), (i += 2);
    else if (a === '--min-size') o.minSize = Number(argv[++i]);
    else if (a === '--pretty') o.pretty = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--placeholders') o.placeholders = true;
    else if (a === '--full') o.full = true;
    else if (a === '--selftest') o.selftest = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else {
      console.error('未知参数: ' + a);
      process.exit(2);
    }
  }
  return o;
}

function loadMnemonics(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tables = Array.isArray(data) ? data : data.tables || [];
  const set = new Set();
  for (const t of tables) for (const e of t.entries || []) if (e.mnemonic) set.add(e.mnemonic);
  return set;
}

function diffMode(a, b, opts = {}) {
  const width = opts.full ? Infinity : 160;
  const clip = (s) => (s.length > width ? s.slice(0, width) + ' …（共 ' + s.length + ' 字符，--full 看全文）' : s);
  const A = loadMnemonics(a);
  const B = loadMnemonics(b);
  const onlyA = [...A].filter((x) => !B.has(x));
  const onlyB = [...B].filter((x) => !A.has(x));
  console.log('A 助记符 ' + A.size + ' 条 / B 助记符 ' + B.size + ' 条');
  console.log('共有 ' + (A.size - onlyA.length) + ' 条');
  if (onlyA.length) {
    console.log('\n只在 A 出现（B 里没有，可能是版本差异或 A 抽多了）：');
    onlyA.slice(0, 20).forEach((x) => console.log('  - ' + clip(x)));
  }
  if (onlyB.length) {
    console.log('\n只在 B 出现：');
    onlyB.slice(0, 20).forEach((x) => console.log('  + ' + clip(x)));
  }
  if (onlyA.length || onlyB.length) {
    console.log('\n注意：变量名已被归一化，所以这里的差异**不是**改名造成的。');
    console.log('先排除两种假差异，再谈真实差异：');
    console.log('  1) 两次抓的不是同一个 VM / 不是同一个文件（最常见）');
    console.log('  2) 生成夹具时**动到了字符串字面量内部**——字符串不会被归一化，');
    console.log('     改名必须按 token 类型做（字符串/注释原样保留），不能用正则直接替换全文件');
    console.log('排除后仍不一致 ⇒ 站点升级了 VM 指令集，助记符表需要重新标定语义。');
    return 1;
  }
  console.log('\n两次抓取的指令语义集合完全一致 —— 助记符表可跨版本复用。');
  return 0;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.selftest) return selftest();
  if (o.help) {
    console.log('用法: node jsvmp-mnemonic-table.js --input <vm.js> [--out table.json] [选项]');
    console.log('      node jsvmp-mnemonic-table.js --diff <a.json> <b.json>');
    console.log('选项: --min-size N（默认 10） --pretty --placeholders --full --strict --selftest');
    return 0;
  }
  if (o.diff) {
    if (o.diff.length !== 2) {
      console.error('--diff 需要两个文件参数');
      return 2;
    }
    return diffMode(o.diff[0], o.diff[1], o);
  }
  if (!o.input) {
    console.error('缺少 --input');
    return 2;
  }
  let src;
  try {
    src = fs.readFileSync(o.input, 'utf8');
  } catch (err) {
    console.error('读取失败: ' + err.message);
    return 2;
  }
  const tables = buildTable(src, o);
  const payload = { input: o.input, minSize: o.minSize, tables };
  if (o.out) {
    fs.writeFileSync(o.out, JSON.stringify(payload, null, 2), 'utf8');
    console.log('已写入 ' + o.out);
  }
  for (const t of tables) {
    console.log(
      '指令数组 ' + (t.varName || '<匿名>') + '：' + t.size + ' 项（空洞 ' + t.holes + ' / 空体 ' + t.empties + '），去重后 ' + t.distinctMnemonics + ' 种助记符'
    );
    if (o.pretty) {
      for (const e of t.entries) {
        const label = e.kind === 'hole' ? '<空洞，占位不算指令>' : e.kind === 'empty' ? '<空体 no-op>' : e.mnemonic;
        console.log('  [' + String(e.index).padStart(4) + '] ' + label);
      }
    }
  }
  if (tables.length === 0) {
    console.error('未找到指令数组。排查顺序：');
    console.error('  1) 数组元素里是否含 function 表达式（本工具靠这个判据）');
    console.error('  2) --min-size 是否设得过大（默认 10）');
    console.error('  3) 指令数组是否被拆到多个变量里（先看 references/jsvmp-bytecode-and-decompiler.md §2）');
    if (o.strict) return 1;
  }
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { tokenize, normalize, extractInstructionArrays, toMnemonic, buildTable, matchBracket, splitArrayElements };
