#!/usr/bin/env node
/**
 * php_opaque_patch.js —— 不透明 PHP 源码的「定向方法体替换」工具（零依赖）
 *
 * 场景：站点/主题/插件用商业混淆器（如 Z5Encrypt）把 PHP 方法体整体加密成
 *       `函数签名 { $随机变量='密文'; return eval(解密器($随机变量));$_SERVER; }`。
 *       我们**不解密**，只把整个方法体替换成自定义 `return`，从而把授权/自毁判断改写成常量。
 *
 * 与只写 `if (false)` 的区别：源文（52pojie-2116200）踩过这个坑 —— 校验点在**别处**，
 * 改错地方表现为「改了但没有任何变化」。本工具强制你先**枚举出全部候选方法**再动手。
 *
 * ⚠️ 关键实现判据（本工具与源文那版 nuke() 的差别，全部有 --selftest 覆盖）：
 *   1. 源文用 `code.indexOf(');$_SERVER;}', openBrace)` 取「第一个匹配」。
 *      密文字符串里**可能**原生出现同形片段（源文自己就警告密文含 `}`/`;`）
 *      ⇒ 本工具改为**字符串感知扫描**（跳过 '...' / "..." / 注释），并在 selftest 里用
 *      反面夹具证明朴素 indexOf 会切错。
 *   2. 源文替换后紧跟「补 static」再「删残留 standalone public static」两步，**顺序敏感**。
 *      本工具把两步合成一次幂等操作，并断言 `public static public static` 出现 0 次。
 *   3. 替换完成必须过一遍**括号配平 + 字符串配平**，否则 PHP 在运行期才报错。
 *
 * 用法：
 *   node php_opaque_patch.js --list  <file.php>
 *   node php_opaque_patch.js --patch <file.php> --out <out.php> --plan plan.json
 *   node php_opaque_patch.js --selftest
 *
 * plan.json 形如：[{"name":"is_aut","body":"return true;"}, {"name":"curl_aut","body":"return \"\";"}]
 */
'use strict';
const fs = require('fs');

// ---------- 字符串感知的工具 ----------

/**
 * 扫描源码，产出「哪些下标位于字符串/注释内部」的位图。
 * 只处理 PHP 常见的 '  "  //  #  /* *\/  四种；heredoc 不处理（登记为已知边界）。
 */
function literalMaskCode(src) {
  const n = src.length;
  const inLit = new Uint8Array(n); // 1 = 在字符串/注释内
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === "'" || c === '"') {
      const q = c;
      inLit[i] = 1;
      i++;
      while (i < n) {
        inLit[i] = 1;
        if (src[i] === '\\') { if (i + 1 < n) inLit[i + 1] = 1; i += 2; continue; }
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      inLit[i] = inLit[i + 1] = 1; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { inLit[i] = 1; i++; }
      if (i < n) { inLit[i] = 1; if (i + 1 < n) inLit[i + 1] = 1; i += 2; }
      continue;
    }
    if ((c === '/' && src[i + 1] === '/') || c === '#') {
      while (i < n && src[i] !== '\n') { inLit[i] = 1; i++; }
      continue;
    }
    i++;
  }
  return inLit;
}

/** 在 [from, n) 内找 needle 的**第一个字符串外**出现；找不到返回 -1。 */
function indexOfCode(src, needle, from, mask) {
  let p = from;
  for (;;) {
    const at = src.indexOf(needle, p);
    if (at < 0) return -1;
    if (!mask[at]) return at;
    p = at + 1;
  }
}

const FUNC_RE = /(?:^|[\s;{}])((?:(?:final|abstract|public|protected|private|static)\s+)*)function\s+&?\s*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*\(/g;

/** 枚举所有函数定义（类方法或全局函数），返回签名/修饰符/位置。 */
function listFunctions(src) {
  const mask = literalMaskCode(src);
  const out = [];
  FUNC_RE.lastIndex = 0;
  let m;
  while ((m = FUNC_RE.exec(src)) !== null) {
    if (mask[m.index] || mask[m.index + m[0].indexOf('function')]) continue;
    const modifiers = (m[1] || '').trim().split(/\s+/).filter(Boolean);
    const name = m[2];
    const openParen = src.indexOf('(', m.index + m[0].length - 1);
    // 配平括号找参数表结束
    let depth = 0, j = openParen, closeParen = -1;
    for (; j < src.length; j++) {
      if (mask[j]) continue;
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) { closeParen = j; break; } }
    }
    if (closeParen < 0) continue;
    const braceAt = indexOfCode(src, '{', closeParen, mask);
    if (braceAt < 0) continue;                    // 抽象方法/接口声明：无体
    // 配平花括号找方法体结束
    let d2 = 0, k = braceAt, endBrace = -1;
    for (; k < src.length; k++) {
      if (mask[k]) continue;
      if (src[k] === '{') d2++;
      else if (src[k] === '}') { d2--; if (d2 === 0) { endBrace = k; break; } }
    }
    if (endBrace < 0) continue;
    out.push({
      name,
      modifiers,
      sigStart: m.index,
      braceAt,
      bodyStart: braceAt + 1,
      endBrace,
      body: src.slice(braceAt + 1, endBrace),
    });
  }
  return out;
}

/** 判定方法体是否属于「混淆器产物」：代码层尾部锚点 + 代码层 `return eval(...)` 形态。 */
function looksOpaque(src, method, anchor) {
  const mask = literalMaskCode(src);
  const at = indexOfCode(src, anchor, method.bodyStart, mask);
  if (at < 0 || at > method.endBrace) return false;
  return /\breturn\s+eval\s*\(/.test(src.slice(method.bodyStart, method.endBrace));
}

/**
 * 只替换指定方法体的尾部（anchor 之后到 } 之前），返回新源码。
 * 采用**切掉 anchor（含）之后、'}' 之前**的全部内容再补上 `return ...;`。
 */
function patchBody(src, method, anchor, returnStmt, opts) {
  const mask = literalMaskCode(src);
  const naive = !!(opts && opts.naive);
  const a = naive
    ? src.indexOf(anchor, method.bodyStart)
    : indexOfCode(src, anchor, method.bodyStart, mask);
  if (a < 0 || a >= method.endBrace) {
    return { ok: false, reason: '锚点未在方法体内部（代码层）出现' };
  }
  const ret = returnStmt.endsWith(';') ? returnStmt : returnStmt + ';';
  const before = src.slice(0, method.bodyStart);      // 保留到 '{' 之后
  // ★ 整段替换方法体：after 必须从 '}' **之后**取（否则闭合花括号会被重复），
  //   这样 ( ) / { } 天然配平。源文那版用 `termIdx + SERVER_END.length` 当切点，
  //   锚点落在密文字符串里时会切错、留下未消化的尾巴。
  const after = naive ? src.slice(a + anchor.length) : src.slice(method.endBrace + 1);
  return { ok: true, code: before + ' ' + ret + ' }' + after, anchorAt: a };
}

/**
 * 幂等地把方法补成 `public static function name(`。
 * ★ 必须先「清残留」再「补」：顺序反了会出现「以为已有 static → 不补」+「残留行被清掉」= 两头都没了。
 */
function ensureStatic(src, names) {
  // 第 1 步：清掉「独占一行、紧随其后就是 function」的修饰符残留
  let out = src.replace(
    /^[ \t]*(?:public|protected|private)[ \t]+static[ \t]*\r?\n(?=[ \t]*function\b)/gm, '');
  // 第 2 步：缺 static 才补
  for (const n of names) {
    const re = new RegExp('function\\s+&?\\s*' + n + '\\s*\\(', 'g');
    out = out.replace(re, (mm, off) => {
      const head = out.slice(Math.max(0, off - 40), off);
      return /\b(public|protected|private)[ \t]+static[ \t]+$/.test(head) ? mm : 'public static ' + mm;
    });
  }
  return out;
}

/**
 * ★ 把「Markdown 转义泄漏进代码块」的 `\_` 还原成 `_`。
 * 场景：源文（论坛帖）里的方法名逐字是 `is\_local` / `zib\_init\_add\_action`，
 * 连 `function is\_local(){` 都是转义的 ⇒ 直接拿源文当输入时，按名字匹配会**全部落空且不报错**。
 * ⚠️ 只处理 `\_`（Markdown 最常见的转义），不碰其它转义，避免误伤真实反斜杠。
 */
function normalizeMdEscapes(src) {
  const n = (src.match(/\\_/g) || []).length;
  return { code: src.replace(/\\_/g, '_'), count: n };
}

/** 括号/花括号配平检查（字符串感知）。返回 {ok, delta, msg} */
function balanceCheck(src) {
  const mask = literalMaskCode(src);
  let par = 0, br = 0;
  for (let i = 0; i < src.length; i++) {
    if (mask[i]) continue;
    const c = src[i];
    if (c === '(') par++; else if (c === ')') par--;
    else if (c === '{') br++; else if (c === '}') br--;
    if (par < 0) return { ok: false, delta: par, msg: '多余的 )，位置 ' + i };
    if (br < 0) return { ok: false, delta: br, msg: '多余的 }，位置 ' + i };
  }
  return { ok: par === 0 && br === 0, delta: par + br, msg: `( ) 余 ${par}，{ } 余 ${br}` };
}

// ---------- 自检 ----------

const FIXTURE = `<?php
/* 夹具：模拟 Z5Encrypt 产物。
   第 1 个方法的密文串里**故意**塞一个同形锚点 —— 用来暴露朴素 indexOf 会切错；
   最后一个**明文**函数把锚点写在字符串里 —— 用来暴露朴素判据会把明文方法误判成混淆产物。 */
class ZibAut {
public static
function is_local(){$v='uVMO\\x14A\\x10});$_SERVER;}'.'\\x08\\x0a...';return eval($DEC($v));$_SERVER;}
public static
function is_aut(){$v='uVMO\\x14A\\x10~ZD>';return eval($DEC($v));$_SERVER;}
public static
function curl_aut($aut_code=null){$v='abc';return eval($DEC($v));$_SERVER;}
function delete(){$v='q';return eval($DEC($v));$_SERVER;}
}
function zib_init_add_action(){return "VM 全局函数定义处，q.a.c 依赖它，禁止改";}
function build_anchor_hint(){return '形如 );$_SERVER;} 的尾巴只是混淆器的边界标记，别当语法用';}
`;

function selftest() {
  let pass = 0, fail = 0;
  const t = (desc, exp, act) => {
    if (String(exp) === String(act)) { pass++; console.log('  PASS  ' + desc); }
    else { fail++; console.log('  FAIL  ' + desc + '  期望=' + exp + ' 实际=' + act); }
  };
  const ANCHOR = ');$_SERVER;}';

  console.log('== php_opaque_patch --selftest ==');
  console.log('-- 1. 枚举与分类 --');
  const fns = listFunctions(FIXTURE);
  const opaque = fns.filter((f) => looksOpaque(FIXTURE, f, ANCHOR)).map((f) => f.name);
  t('枚举到 6 个函数', 6, fns.length);
  t('方法名序列', 'is_local,is_aut,curl_aut,delete,zib_init_add_action,build_anchor_hint',
    fns.map((f) => f.name).join(','));
  t('4 个被判为混淆产物', 'is_local,is_aut,curl_aut,delete', opaque.join(','));
  t('★ 明文函数（锚点只写在字符串里）不被误判为混淆产物', false,
    opaque.includes('build_anchor_hint'));
  t('VM 初始化函数不被误判', false, opaque.includes('zib_init_add_action'));

  console.log('-- 2. ★ 字符串感知扫描 vs 朴素 indexOf（反面夹具）--');
  const isLocal = fns.find((f) => f.name === 'is_local');
  const naive = patchBody(FIXTURE, isLocal, ANCHOR, 'return false;', { naive: true });
  const aware = patchBody(FIXTURE, isLocal, ANCHOR, 'return false;', { naive: false });
  t('朴素切法也「成功」返回（不报错，静默出错）', true, naive.ok);
  t('两者锚点下标不同', true, naive.anchorAt !== aware.anchorAt);
  t('字符串感知产物括号配平', true, balanceCheck(aware.code).ok);
  t('★ 朴素产物括号不配平（PHP 到运行期才炸）', false, balanceCheck(naive.code).ok);
  const naiveBody = listFunctions(naive.code).find((f) => f.name === 'is_local').body;
  const awareBody = listFunctions(aware.code).find((f) => f.name === 'is_local').body;
  t('★ 朴素产物在替换点后面挂着未消化的尾巴（`return false; }\'`）', true,
    naive.code.includes("return false; }'"));
  t('字符串感知产物在替换点后面干净闭合（`return false; }` 后紧跟换行）', true,
    aware.code.includes('return false; }\n'));
  t('★ 朴素产物里目标方法的 eval 尾巴原样残留（字符串级判据）', true,
    naive.code.includes("return eval($DEC($v));$_SERVER;}"));
  t('字符串感知产物里目标方法的 eval 尾巴已消失', false,
    aware.code.split('return eval($DEC($v));$_SERVER;}').length - 1 > 3);

  console.log('-- 3. 逐方法替换后的结构不变量 --');
  let out = FIXTURE;
  const plan = [
    { name: 'is_local', body: 'return false;' },
    { name: 'is_aut', body: 'return true;' },
    { name: 'curl_aut', body: 'return "";' },
    { name: 'delete', body: 'return "";' },
  ];
  for (const step of plan) {
    const cur = listFunctions(out);
    const m = cur.find((f) => f.name === step.name);
    const r = patchBody(out, m, ANCHOR, step.body, {});
    t('替换 ' + step.name + ' 成功', true, r.ok);
    out = r.code;
  }
  out = ensureStatic(out, plan.map((p) => p.name));
  const after = listFunctions(out);
  t('替换后函数个数不变', 6, after.length);
  t('方法名序列不变', 'is_local,is_aut,curl_aut,delete,zib_init_add_action,build_anchor_hint',
    after.map((f) => f.name).join(','));
  t('is_local 体 = " return false; "', ' return false; ', after[0].body);
  t('is_aut 体 = " return true; "', ' return true; ', after[1].body);
  t('curl_aut 体 = \' return ""; \'', ' return ""; ', after[2].body);
  t('delete 体 = \' return ""; \'', ' return ""; ', after[3].body);
  t('★ 目标方法内已无 eval', 0, after.slice(0, 4).filter((f) => f.body.includes('eval(')).length);
  t('★ 目标方法内已无混淆锚点', 0,
    after.slice(0, 4).filter((f) => (f.body + '}').includes(ANCHOR)).length);
  t('括号配平', true, balanceCheck(out).ok);
  t('★ 无重复修饰符 public static public static', 0, (out.match(/public\s+static\s+public\s+static/g) || []).length);
  t('★ 4 个目标方法都有 static（源文漏补会静态调用失败）', 4,
    after.slice(0, 4).filter((f) => f.modifiers.includes('static')).length);
  t('非目标函数体逐字节保留', true, out.includes('"VM 全局函数定义处，q.a.c 依赖它，禁止改"'));
  t('未出现在 plan 里的方法未被改动（zib_init_add_action 原样）', true,
    out.includes('function zib_init_add_action(){return "VM 全局函数定义处'));
  t('明文函数（含锚点字符串）逐字节保留', true, out.includes("build_anchor_hint(){return '形如 "));
  t('★ 明文函数仍被正确判为明文（分类不受补丁影响）', false,
    looksOpaque(out, listFunctions(out)[5], ANCHOR));

  console.log('-- 4. ensureStatic 幂等 --');
  const twice = ensureStatic(ensureStatic(out, plan.map((p) => p.name)), plan.map((p) => p.name));
  t('第二次 ensureStatic 结果不变', out, twice);

  console.log('-- 5. patchBody 的反例：锚点不在体内 --');
  const zib = listFunctions(out).find((f) => f.name === 'zib_init_add_action');
  t('对未混淆方法替换应失败', false, patchBody(out, zib, ANCHOR, 'return true;', {}).ok);

  console.log('-- 6. 平衡检查能抓出人为破坏 --');
  t('人为删一个 } 会被抓出', false, balanceCheck(out.replace('}\nfunction zib_init', 'function zib_init')).ok);

  console.log('-- 7. ★ Markdown 转义泄漏（源文把 _ 写成 \\_）--');
  const escaped = FIXTURE.replace(/zib_init_add_action/g, 'zib\\_init\\_add\\_action')
                         .replace(/is_aut/g, 'is\\_aut');
  t('未归一化时按真名找不到方法（匹配全部落空且不报错）', false,
    listFunctions(escaped).map((f) => f.name).includes('is_aut'));
  const nrm = normalizeMdEscapes(escaped);
  t('归一化计数 = 4（is_aut 1 + zib_init_add_action 3 段）', 4, nrm.count);
  t('归一化后能正确枚举出 is_aut', true,
    listFunctions(nrm.code).map((f) => f.name).includes('is_aut'));
  t('归一化后方法名序列与原文一致',
    'is_local,is_aut,curl_aut,delete,zib_init_add_action,build_anchor_hint',
    listFunctions(nrm.code).map((f) => f.name).join(','));
  t('归一化是幂等的', nrm.code, normalizeMdEscapes(nrm.code).code);

  console.log('\n== 汇总: PASS=' + pass + ' FAIL=' + fail + ' ==');
  return fail === 0 ? 0 : 1;
}

// ---------- CLI ----------

function main(argv) {
  const a = argv.slice(2);
  if (a.includes('--selftest')) process.exit(selftest());
  const srcFile = a.find((x) => !x.startsWith('--') && x.endsWith('.php') || /\.php$/.test(x));
  if (a.includes('--list')) {
    if (!srcFile) { console.error('用法: --list <file.php>'); process.exit(2); }
    const raw = fs.readFileSync(srcFile, 'utf8');
    const norm = normalizeMdEscapes(raw);
    if (norm.count) console.log('已归一化 Markdown 转义 \_ -> _ ：' + norm.count + ' 处');
    const src = norm.code;
    const fns = listFunctions(src);
    console.log('函数/方法共 ' + fns.length + ' 个：');
    for (const f of fns) {
      console.log('  ' + (looksOpaque(src, f, ');$_SERVER;}') ? '[混淆]' : '[明文]') +
        ' ' + (f.modifiers.join(' ') || '(无修饰符)') + ' ' + f.name +
        '  体长=' + f.body.length);
    }
    return 0;
  }
  if (a.includes('--patch')) {
    const outIdx = a.indexOf('--out');
    const planIdx = a.indexOf('--plan');
    if (!srcFile || outIdx < 0 || planIdx < 0) {
      console.error('用法: --patch <file.php> --out <out.php> --plan <plan.json>');
      return 2;
    }
    const raw = fs.readFileSync(srcFile, 'utf8');
    const norm = normalizeMdEscapes(raw);
    if (norm.count) console.log('已归一化 Markdown 转义 \_ -> _ ：' + norm.count + ' 处');
    let src = norm.code;
    const plan = JSON.parse(fs.readFileSync(a[planIdx + 1], 'utf8'));
    const ANCHOR = ');$_SERVER;}';
    for (const step of plan) {
      const m = listFunctions(src).find((f) => f.name === step.name);
      if (!m) { console.error('找不到方法 ' + step.name); return 3; }
      const r = patchBody(src, m, ANCHOR, step.body, {});
      if (!r.ok) { console.error('方法 ' + step.name + ' 替换失败：' + r.reason); return 4; }
      src = r.code;
      console.log('已替换 ' + step.name + ' -> ' + step.body);
    }
    src = ensureStatic(src, plan.map((p) => p.name));
    const bal = balanceCheck(src);
    if (!bal.ok) { console.error('括号不配平，拒绝写出：' + bal.msg); return 5; }
    fs.writeFileSync(a[outIdx + 1], src, 'utf8');
    console.log('已写出 ' + a[outIdx + 1] + '（括号配平 ' + bal.msg + '）');
    return 0;
  }
  console.error('用法: --list <f.php> | --patch <f.php> --out <o.php> --plan <p.json> | --selftest');
  return 2;
}

if (require.main === module) process.exit(main(process.argv));
module.exports = { listFunctions, patchBody, ensureStatic, balanceCheck, looksOpaque, literalMaskCode, indexOfCode, normalizeMdEscapes, FIXTURE };
