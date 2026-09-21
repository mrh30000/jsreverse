#!/usr/bin/env node
'use strict';

/**
 * ruishu_keynames.js — 瑞数 VM 变量名数组的确定性重算与覆盖率校验（零依赖）
 *
 * 背景（见 references/ruishu-vmp-structure.md）：
 *   VM 里的变量名并非「每次随机变化、只能正则动态匹配」，而是由 `$_ts.nsd` 唯一决定的
 *   置换结果：先按固定字母表生成 `_$xx` 名称池，再用 `nsd` 驱动的 LCG + Fisher-Yates 置换。
 *   因此只要拿到同一份 `nsd` 与变量名池长度，就能**确定性重算**变量名，不必依赖正则。
 *
 * 本脚本提供三件事：
 *   1. 从 VM 代码里提取变量名池长度（稳定锚点，正则形如 _$xx=_$yy(0,<数字>,_$zz( ）。
 *   2. 由 nsd + 池长度重算变量名数组（与实现同构）。
 *   3. 覆盖率校验：重算出的名字在 VM 代码中的命中率，用于确认 nsd / 池长度取自同一份资源。
 *
 * 用法：
 *   node ruishu_keynames.js --extract-keyname-num <vm.js>
 *   node ruishu_keynames.js --nsd <n> --keyname-num <n> [--limit 20] [--json]
 *   node ruishu_keynames.js --verify <vm.js> --nsd <n> [--keyname-num <n>]
 *   node ruishu_keynames.js --selftest
 *
 * 退出码：0 成功 / 覆盖率达标；1 参数或 IO 错误；2 自检失败；3 覆盖率不达标。
 */

const fs = require('fs');
const crypto = require('crypto');

// 变量名池的固定字母表（顺序即生成顺序，不要改动）
const NAME_ALPHABET = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// LCG 常量：s' = 15679 * (s & 0xffff) + 2531011
const LCG_MUL = 15679;
const LCG_ADD = 2531011;

// 变量名池长度锚点：_$xx = _$yy(0, <数字>, _$zz(
const KEYNAME_NUM_RE = /_\$[\$_A-Za-z0-9]{2}\s*=\s*_\$[\$_A-Za-z0-9]{2}\s*\(\s*0\s*,\s*([0-9]+)\s*,\s*_\$[\$_A-Za-z0-9]{2}\s*\(/;

/** 生成 `_$` + 双字符的名称池，按固定字母表双重循环。 */
function grenKeys(maxlen) {
  const keys = NAME_ALPHABET.split('');
  const ans = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      ans.push('_$' + keys[i] + keys[j]);
      if (ans.length === maxlen) return ans;
    }
  }
  return ans;
}

/** LCG 序列生成器：与实现同构（& 触发 ToInt32，保证可复现）。 */
function makeScd(seed) {
  let scd = seed;
  return function next() {
    scd = LCG_MUL * (scd & 65535) + LCG_ADD;
    return scd;
  };
}

/** Fisher-Yates，取模用 LCG 序列；nsd 相同则结果完全相同。 */
function arraySwap(arr, seed) {
  const knarr = [...arr];
  let len = knarr.length;
  const next = makeScd(seed);
  while (len-- > 1) {
    const idx = next() % len;
    const temp = knarr[len];
    knarr[len] = knarr[idx];
    knarr[idx] = temp;
  }
  return knarr;
}

/** 由 nsd + 池长度重算变量名数组。 */
function keynamesFor(nsd, keynameNum) {
  return arraySwap(grenKeys(keynameNum), nsd);
}

/** 从 VM 代码中提取变量名池长度；找不到返回 null。 */
function extractKeynameNum(code) {
  const m = code.match(KEYNAME_NUM_RE);
  return m ? Number(m[1]) : null;
}

/**
 * 名称使用情况（仅信息性，不作为通过判据）。
 *
 * ⚠️ 为什么不能当判据：名称池有数千个名字，而一份 VM 代码通常只用到其中几十个，
 * 所以「池中名字在代码里出现的比例」天然很低（真实样本实测约 8%）。
 * 把它当阈值会导致大量假告警。这里只报告绝对数量；`used === 0` 才是硬失配信号。
 */
function usage(keynames, code) {
  const uniq = [...new Set(keynames)];
  let used = 0;
  for (const name of uniq) {
    // 用词边界近似：名字后不接标识符字符
    if (new RegExp(escapeRe(name) + '(?![\\$_A-Za-z0-9])').test(code)) used++;
  }
  return { used, poolTotal: uniq.length, ratio: uniq.length ? used / uniq.length : 0 };
}

/**
 * 覆盖率校验（反向）：VM 代码里出现的 `_$xx` 标识符有多少落在名称池内。
 *
 * 这是**有判断力**的方向：池长度取小了、字母表或实现族不对，都会立刻暴露。
 * 但它仍是**集合**判定，不能发现 nsd 取错（换 nsd 只是同一集合的另一排列）。
 */
function reverseCoverage(code, keynames) {
  const pool = new Set(keynames);
  const found = new Set(code.match(/_\$[\$_A-Za-z0-9]{2}(?![\$_A-Za-z0-9])/g) || []);
  const outside = [...found].filter((n) => !pool.has(n));
  return {
    total: found.size,
    inside: found.size - outside.length,
    ratio: found.size ? (found.size - outside.length) / found.size : 1,
    outsideSample: outside.slice(0, 5),
  };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const o = { selftest: false, json: false, limit: 20, threshold: 0.5 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--nsd') o.nsd = Number(argv[++i]);
    else if (a === '--keyname-num') o.keynameNum = Number(argv[++i]);
    else if (a === '--extract-keyname-num') o.extractFrom = argv[++i];
    else if (a === '--verify') o.verify = argv[++i];
    else if (a === '--limit') o.limit = Number(argv[++i]);
    else if (a === '--threshold') o.threshold = Number(argv[++i]);
    else if (a === '--json') o.json = true;
    else if (a === '--selftest') o.selftest = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else rest.push(a);
  }
  if (rest.length) o.file = rest[0];
  return o;
}

const HELP = `ruishu_keynames.js — 瑞数 VM 变量名的确定性重算（零依赖）

用法：
  node ruishu_keynames.js --extract-keyname-num <vm.js>
  node ruishu_keynames.js --nsd <n> --keyname-num <n> [--limit 20] [--json]
  node ruishu_keynames.js --verify <vm.js> --nsd <n> [--keyname-num <n>] [--threshold 0.5]
  node ruishu_keynames.js --selftest

说明：
  变量名 = arraySwap(grenKeys(keynameNum), nsd)，与实现同构；nsd 相同则结果完全相同。
  --verify 的覆盖率用于确认 nsd / 池长度与 VM 代码来自同一份资源。

退出码：0 成功；1 参数/IO 错误；2 自检失败；3 覆盖率不达标。`;

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || (process.argv.length <= 2)) {
    console.log(HELP);
    process.exit(o.help ? 0 : 1);
  }
  if (o.selftest) process.exit(runSelftest() ? 0 : 2);

  // 模式 1：只提取锚点
  if (o.extractFrom) {
    if (!fs.existsSync(o.extractFrom)) {
      console.error(`文件不存在：${o.extractFrom}`);
      process.exit(1);
    }
    const code = fs.readFileSync(o.extractFrom, 'utf8');
    const n = extractKeynameNum(code);
    if (n === null) {
      console.error('未匹配到变量名池长度锚点（正则：_$xx=_$yy(0,<数字>,_$zz( ）。');
      process.exit(1);
    }
    console.log(o.json
      ? JSON.stringify({ keynameNum: n, source: o.extractFrom, sha256: sha256(code) }, null, 2)
      : `keynameNum = ${n}\nsource sha256 = ${sha256(code)}`);
    process.exit(0);
  }

  // 模式 2：覆盖率校验（必须先于「重算」分支判断，否则 --verify 会被重算分支吞掉）
  if (o.verify) {
    if (!fs.existsSync(o.verify)) {
      console.error(`文件不存在：${o.verify}`);
      process.exit(1);
    }
    if (!Number.isFinite(o.nsd)) {
      console.error('--verify 需要同时提供 --nsd。');
      process.exit(1);
    }
    const code = fs.readFileSync(o.verify, 'utf8');
    const n = Number.isFinite(o.keynameNum) ? o.keynameNum : extractKeynameNum(code);
    if (!Number.isFinite(n)) {
      console.error('未能确定变量名池长度：请显式提供 --keyname-num。');
      process.exit(1);
    }
    const names = keynamesFor(o.nsd, n);
    const use = usage(names, code);
    const rev = reverseCoverage(code, names);
    // 通过判据：代码内标识符绝大多数落在池内，且池中名字确实被用到。
    // 不用「池中名字占代码的比例」当阈值 —— 该比例天然很低（见 usage() 注释）。
    const pass = rev.ratio >= o.threshold && use.used > 0;
    const out = {
      file: o.verify,
      keynameNum: n,
      nsd: o.nsd,
      codeSha256: sha256(code),
      reverseCoverage: rev,
      poolUsage: use,
      threshold: o.threshold,
      orderSensitive: false,
      pass,
      caveat: '覆盖率是集合判定，不能验证 nsd 是否正确；nsd 需端到端 Cookie 对拍确认。',
    };
    if (o.json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log(`文件：${o.verify}`);
      console.log(`keynameNum=${n} nsd=${o.nsd}`);
      console.log(`反向覆盖率（代码内 _$xx 落在池中）：${rev.inside}/${rev.total} = ${(rev.ratio * 100).toFixed(1)}%${rev.outsideSample.length ? `（池外样例：${rev.outsideSample.join(' ')}）` : ''}`);
      console.log(`池使用量（信息性，不作判据）：${use.used}/${use.poolTotal} = ${(use.ratio * 100).toFixed(1)}% —— VM 代码通常只用到池中一小部分，比例低属正常`);
      console.log(`阈值 ${(o.threshold * 100).toFixed(0)}% → ${pass ? '达标' : '不达标：keynameNum 或资源不匹配'}`);
      console.log('注意：覆盖率不区分顺序，无法验证 nsd；nsd 需端到端 Cookie 对拍。');
    }
    process.exit(pass ? 0 : 3);
  }

  // 模式 3：重算变量名数组
  if (Number.isFinite(o.nsd) && Number.isFinite(o.keynameNum)) {
    const names = keynamesFor(o.nsd, o.keynameNum);
    if (o.json) {
      console.log(JSON.stringify({ nsd: o.nsd, keynameNum: o.keynameNum, count: names.length, sha256: sha256(names.join(',')), names: names.slice(0, o.limit) }, null, 2));
    } else {
      console.log(`nsd=${o.nsd} keynameNum=${o.keynameNum} count=${names.length}`);
      console.log(`sha256(names) = ${sha256(names.join(','))}`);
      console.log(`前 ${Math.min(o.limit, names.length)} 个：${names.slice(0, o.limit).join(' ')}`);
    }
    process.exit(0);
  }

  console.log(HELP);
  process.exit(1);
}

// ---------------------------------------------------------------- 自检

function runSelftest() {
  const checks = [];
  const ok = (name, cond, detail) => {
    checks.push({ name, pass: Boolean(cond) });
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ← ${detail || ''}`}`);
  };

  // --- 名称池生成
  const A = NAME_ALPHABET.length;
  const k5 = grenKeys(5);
  ok('名称池：字母表长度为 64（_$ + a-z + A-Z + 0-9）', A === 64, String(A));
  ok('名称池：按固定字母表双重循环生成', k5.join(',') === '_$__,_$_$,_$_a,_$_b,_$_c', k5.join(','));
  ok('名称池：长度等于请求值', grenKeys(200).length === 200, String(grenKeys(200).length));
  ok('名称池：截断长度不为 1 时也能截断', grenKeys(1).length === 1, JSON.stringify(grenKeys(1)));
  const kAll = grenKeys(A * A);
  ok(`名称池：全量 ${A}*${A}`, kAll.length === A * A, String(kAll.length));
  ok('名称池：无重复', new Set(kAll).size === kAll.length, `unique=${new Set(kAll).size}`);
  ok('名称池：超长请求返回全量而非死循环', grenKeys(1e9).length === A * A, String(grenKeys(1e9).length));

  // --- LCG
  const next = makeScd(123456789);
  const s1 = next();
  const s2 = next();
  ok('LCG：首项与手算一致', s1 === LCG_MUL * (123456789 & 65535) + LCG_ADD, String(s1));
  ok('LCG：次项与手算一致', s2 === LCG_MUL * (s1 & 65535) + LCG_ADD, String(s2));
  ok('LCG：序列确定（两次生成一致）', (() => {
    const a = makeScd(42), b = makeScd(42);
    for (let i = 0; i < 50; i++) if (a() !== b()) return false;
    return true;
  })());
  ok('LCG：项始终为安全整数', (() => {
    const f = makeScd(7);
    for (let i = 0; i < 2000; i++) {
      const v = f();
      if (!Number.isSafeInteger(v) || v < 0) return false;
    }
    return true;
  })());

  // --- 置换
  const base = grenKeys(300);
  const p1 = arraySwap(base, 987654321);
  const p2 = arraySwap(base, 987654321);
  ok('置换：同 nsd 结果完全一致（确定性）', p1.join(',') === p2.join(','), '两次结果不同');
  ok('置换：是排列（元素集合不变）', [...p1].sort().join(',') === [...base].sort().join(','), '元素集合被改变');
  ok('置换：不改动入参', base.join(',') === grenKeys(300).join(','), '入参被就地修改');
  ok('置换：长度保持', p1.length === base.length, String(p1.length));
  const variants = [1, 2, 3].map((n) => arraySwap(base, n).join(','));
  ok('置换：不同 nsd 至少产生一种不同排列', new Set(variants).size > 1, '三种 nsd 结果完全相同');
  ok('置换：长度为 1 时不越界', arraySwap(['x'], 5).join(',') === 'x', 'len=1 处理异常');
  ok('置换：长度为 0 时不越界', arraySwap([], 5).length === 0, 'len=0 处理异常');

  // --- 锚点提取
  ok('锚点：提取典型形态', extractKeynameNum('var _$ab=_$cd(0,1684,_$ef(x));') === 1684, String(extractKeynameNum('var _$ab=_$cd(0,1684,_$ef(x));')));
  ok('锚点：容忍空格', extractKeynameNum('_$ab = _$cd ( 0 , 900 , _$ef (' ) === 900, String(extractKeynameNum('_$ab = _$cd ( 0 , 900 , _$ef (')));
  ok('锚点：含 $ 的名字也能匹配', extractKeynameNum('_$$a=_$$b(0,77,_$$c(') === 77, String(extractKeynameNum('_$$a=_$$b(0,77,_$$c(')));
  ok('锚点：不匹配时返回 null', extractKeynameNum('var a = f(0, 12, g(') === null, String(extractKeynameNum('var a = f(0, 12, g(')));

  // --- 池使用量（信息性）
  const names = keynamesFor(20240101, 40);
  const code = names.slice(0, 30).join(' ') + ' var other = 1;';
  const use = usage(names, code);
  ok('池使用量：命中数正确', use.used === 30 && use.poolTotal === 40, JSON.stringify(use));
  ok('池使用量：比例计算正确', Math.abs(use.ratio - 0.75) < 1e-9, String(use.ratio));
  ok('池使用量：名字后接标识符字符不算命中（避免前缀误判）', usage(['_$ab'], 'x_$abc = 1;').used === 0, JSON.stringify(usage(['_$ab'], 'x_$abc = 1;')));
  ok('池使用量：去重后统计', usage(['_$aa', '_$aa', '_$bb'], '_$aa _$bb').poolTotal === 2, JSON.stringify(usage(['_$aa', '_$aa', '_$bb'], '_$aa _$bb')));

  // --- 覆盖率（反向：代码内标识符是否都在池中）
  const rev = reverseCoverage('_$aa _$bb _$zz', ['_$aa', '_$bb']);
  ok('反向覆盖率：检出池外标识符', rev.total === 3 && rev.inside === 2 && rev.outsideSample.join(',') === '_$zz', JSON.stringify(rev));
  ok('反向覆盖率：空代码视为达标', reverseCoverage('', ['_$aa']).ratio === 1, JSON.stringify(reverseCoverage('', ['_$aa'])));

  // --- 端到端：用一段合成 VM 代码走完 提取 → 重算 → 校验
  // 夹具刻意全部使用池内名称（连锚点语句也用池内名称），这样反向覆盖率应为 100%；
  // 若夹具混入池外名称，反向覆盖率会（正确地）报警 —— 见下方「池外名称」用例。
  const poolLen = 60;
  const pool = grenKeys(poolLen);
  const nsd = 1357924680;
  const shuffled = arraySwap(pool, nsd);
  const vmCode = 'var x=1;'
    + shuffled.map((n, i) => `function ${n}(){return ${i};}`).join('')
    + `var ${shuffled[0]}=${shuffled[1]}(0,${poolLen},${shuffled[2]}(`;
  const extracted = extractKeynameNum(vmCode);
  const recomputed = keynamesFor(nsd, extracted);
  ok('端到端：锚点提取正确', extracted === poolLen, String(extracted));
  ok('端到端：重算结果与原始排列一致', recomputed.join(',') === shuffled.join(','), '重算结果与生成顺序不一致');
  ok('端到端：反向覆盖率 100%（池内无外来标识符）', reverseCoverage(vmCode, recomputed).ratio === 1, JSON.stringify(reverseCoverage(vmCode, recomputed)));
  ok('端到端：池使用量等于代码中实际用到的名字数', usage(recomputed, vmCode).used === recomputed.length, JSON.stringify(usage(recomputed, vmCode)));

  // --- 池外名称必须被反向覆盖率抓到（夹具混入 _$zz/_$yy/_$xx 的情形）
  const polluted = `var _$zz=_$yy(0,${poolLen},_$xx(`;
  const revPolluted = reverseCoverage(polluted, recomputed);
  ok('池外名称：反向覆盖率检出 _$zz/_$yy/_$xx', revPolluted.outsideSample.join(',') === '_$zz,_$yy,_$xx', JSON.stringify(revPolluted));

  // --- 负例：池长度取小了，反向覆盖率必须报警
  const small = keynamesFor(nsd, 10);
  ok('负例：池过小被反向覆盖率检出', reverseCoverage(vmCode, small).ratio < 1, JSON.stringify(reverseCoverage(vmCode, small)));

  // --- 已知局限的回归守卫：nsd 取错**无法**被覆盖率发现（集合判定，不区分顺序）
  const wrongNsd = keynamesFor(nsd + 1, extracted);
  ok('局限回归：错误 nsd 的排列确实不同（先确认前提成立）', wrongNsd.join(',') !== recomputed.join(','), '两个 nsd 排列相同，前提不成立');
  ok('局限回归：反向覆盖率仍为 1（不区分顺序，不能验证 nsd）', reverseCoverage(vmCode, wrongNsd).ratio === 1, JSON.stringify(reverseCoverage(vmCode, wrongNsd)));
  ok('局限回归：池使用量也仍为满值', usage(wrongNsd, vmCode).used === wrongNsd.length, JSON.stringify(usage(wrongNsd, vmCode)));

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n自检：${checks.length - failed.length}/${checks.length} 通过`);
  return failed.length === 0;
}

if (require.main === module) main();

module.exports = { grenKeys, arraySwap, makeScd, keynamesFor, extractKeynameNum, usage, reverseCoverage, NAME_ALPHABET };
