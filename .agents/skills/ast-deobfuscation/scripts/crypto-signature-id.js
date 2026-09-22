#!/usr/bin/env node
/**
 * crypto-signature-id.js — 从插桩日志里的「一组定值」反查标准算法，并逐值列出魔改差异
 *
 * 依据 references/jsvmp-dynamic-instrumentation.md §6/§7：
 *   - 只看长度不够（40 hex 可能是 SHA-1，也可能是魔改 MD5 变体）
 *   - 最硬的证据是「初始寄存器特征值」；其次才是轮函数结构
 *   - 魔改常量取证 = 标准实现 vs 实测值**逐值 diff**，不要读 VM 字节码
 *
 * 用法：
 *   node crypto-signature-id.js --input "1732584201,4023233415,2562383102,271733878"
 *   node crypto-signature-id.js --input "[0x67452301,0xEFCDAB89,0x98BADCFE,0x10325476]"
 *   node crypto-signature-id.js --file <插桩日志.txt> [--top 20] [--json]
 *   node crypto-signature-id.js --selftest
 *
 * 零依赖，无需 @babel 预加载。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const u32 = (x) => x >>> 0;
const hex = (x) => '0x' + u32(x).toString(16).toUpperCase().padStart(8, '0');

// ---------------------------------------------------------------- 常量库

const ALGOS = [
  {
    id: 'md5', name: 'MD5', regs: 4,
    iv: [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476],
    caveat: 'MD5 与 SHA-1 的前 4 个 IV 完全相同；判别点在第 5 个值（SHA-1 多一个 0xC3D2E1F0）',
  },
  {
    id: 'sha1', name: 'SHA-1', regs: 5,
    iv: [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0],
  },
  {
    id: 'sha256', name: 'SHA-256', regs: 8,
    iv: [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
      0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19],
  },
  {
    id: 'sm3', name: 'SM3', regs: 8,
    iv: [0x7380166F, 0x4914B2B9, 0x172442D7, 0xDA8A0600,
      0xA96F30BC, 0x163138AA, 0xE38DEE4D, 0xB0FB0E4E],
  },
  {
    id: 'sm4-fk', name: 'SM4 系统参数 FK', regs: 4,
    iv: [0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc],
    caveat: 'SM4 的 FK 出现时，紧接着通常还有 CK（CK[0]=0x00070E15，可由 (28i+7j)&0xFF 生成）',
  },
];

/** 单值常量：命中即给出语义（用于定位 T 表 / K 表起点，也是判族的关键佐证） */
const SINGLE_DEFS = [
  [0xD76AA478, 'MD5 T[0]', 'md5'],
  [0xE8C7B756, 'MD5 T[1]', 'md5'],
  [0x242070DB, 'MD5 T[2]', 'md5'],
  [0xC1BDCEEE, 'MD5 T[3]', 'md5'],
  [0x5A827999, 'SHA-1 K[0]', 'sha1'],
  [0x6ED9EBA1, 'SHA-1 K[1]', 'sha1'],
  [0x8F1BBCDC, 'SHA-1 K[2]', 'sha1'],
  [0xCA62C1D6, 'SHA-1 K[3]', 'sha1'],
  [0x428A2F98, 'SHA-256 K[0]', 'sha256'],
  [0x71374491, 'SHA-256 K[1]', 'sha256'],
  [0xB5C0FBCF, 'SHA-256 K[2]', 'sha256'],
  [0xE9B5DBA5, 'SHA-256 K[3]', 'sha256'],
  [0x79CC4519, 'SM3 T_j=0', 'sm3'],
  [0x7A879D8A, 'SM3 T_j=1', 'sm3'],
  [0x00070E15, 'SM4 CK[0]', 'sm4-fk'],
  [0xEDB88320, 'CRC-32 反射多项式', null],
  [0x04C11DB7, 'CRC-32 正序多项式', null],
  [0x01000193, 'FNV-1a 32 位质数', null],
  [0x811C9DC5, 'FNV-1/1a 32 位偏移基', null],
];

const SINGLES = new Map();   // value -> desc（用于打印）
const SINGLE_ALGO = new Map(); // value -> algo id（用于判族佐证）
for (const [v, desc, algo] of SINGLE_DEFS) {
  SINGLES.set(u32(v), desc);
  SINGLE_ALGO.set(u32(v), algo);
}

/** 「魔改」判定：某个位置与标准 IV 的差值在 ±TOL 内，视为「同一常量被微调过」 */
const TOL = 16;

// ---------------------------------------------------------------- 大整数（limb 形式）

/**
 * 识别「limb 形式的大整数」——**不要把它当成哈希常量表**。
 *
 * 实测形态（`52pojie-2076005` 的插桩日志，RSA 公钥对象）：
 *     {n: {0:192007799, 1:114825681, …, 36:34738, t:37, s:0},
 *      e:65537, default_key_size:1024, default_public_exponent:"010001"}
 *
 * 判据（三条同时成立才算）：
 *   a. 有 `t`（limb 个数）与 `s`（符号）字段，且 `t` == 下标最大值 + 1；
 *   b. 所有 limb < 2^30（实测最大 266222446 < 2^28，故基数只可能是 30）；
 *   c. 按 `n = Σ limb[i] << (30*i)`（**低位在前**）算出的整数，其 bit 长度
 *      落在 `30*(t-1)` 与 `30*t` 之间。
 *
 * 🔴 为什么单列一节：这种数组**看起来和哈希常量表一模一样**（一大串"神秘整数"），
 *    很容易被误当成"魔改 MD5 的 T 表"去逐值 diff —— 那是**完全错误的方向**。
 *    正确的第一步是**把它还原成整数**（或直接交给目标库的 `fromString/toString`）。
 *    实测该例还原后是 **1096 bit** 的整数，即 RSA 模数 n；指数就在隔壁的 `e:65537`。
 *
 * @param {{t?:number,s?:number}} meta  对象里读到的 t / s
 * @param {number[]} nums
 */
function analyzeBignum(meta, nums) {
  const n = nums.map(u32);
  const out = { isBignum: false, reasons: [], radix: 30, bitLen: 0, hex: '', t: meta.t, s: meta.s };

  if (n.length < 2) { out.reasons.push('元素太少'); return out; }
  const maxLimb = Math.max(...n);
  if (!(maxLimb < (2 ** 30))) { out.reasons.push('存在 limb >= 2^30 ⇒ 不是 30 位基数'); return out; }
  const radixGuess = maxLimb < 2 ** 26 ? 26 : (maxLimb < 2 ** 28 ? 28 : 30);
  out.radix = radixGuess;

  if (meta.t !== undefined && meta.t !== n.length) {
    out.reasons.push(`t=${meta.t} 与元素个数 ${n.length} 不符`);
    return out;
  }
  if (meta.s !== undefined && meta.s !== 0 && meta.s !== 1) {
    out.reasons.push('s 不是 0/1');
    return out;
  }

  // 低位在前累加（jsbn / node-forge 口径）
  let acc = 0n;
  for (let i = n.length - 1; i >= 0; i--) acc = (acc << 30n) | BigInt(n[i]);
  out.bitLen = acc.toString(2).length;
  out.hex = '0x' + acc.toString(16);
  out.isBignum = true;
  out.reasons.push(`limb 基数 ${radixGuess}、bit 长度 ${out.bitLen}（${n.length} limb）`);
  return out;
}

// ---------------------------------------------------------------- 解析

const NUM_TOKEN = String.raw`-?(?:0[xX][0-9a-fA-F]+|\d+)`;

/** 解析任意分隔形式的数字列表（支持 0x 前缀、方括号、引号、换行） */
function parseNumbers(text) {
  if (typeof text !== 'string') throw new Error('输入必须是字符串');
  const cleaned = text.replace(/[\[\](){}"']/g, ' ');
  const tokens = cleaned.match(new RegExp(NUM_TOKEN, 'g'));
  if (!tokens) return [];
  return tokens.map((tok) => {
    const v = /^[-+]?0[xX]/.test(tok)
      ? parseInt(tok, 16) | 0
      : Number(tok);
    return Number.isFinite(v) ? v : 0;
  });
}

/** 从日志文本里抽取所有「长度 ≥ 4 的数字数组」 */
function extractArrays(text) {
  const re = new RegExp(String.raw`\[\s*${NUM_TOKEN}\s*(?:,\s*${NUM_TOKEN}\s*){3,}\]`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

// ---------------------------------------------------------------- 识别

function indexOfSub(arr, sub, from) {
  outer: for (let i = from || 0; i + sub.length <= arr.length; i++) {
    for (let j = 0; j < sub.length; j++) if (arr[i + j] !== sub[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * @param {number[]} nums
 * @returns {{matches: Array, singles: Array, verdict: string}}
 */
function analyze(nums) {
  const n = nums.map(u32);
  const matches = [];
  const singles = [];

  for (let i = 0; i < n.length; i++) {
    const desc = SINGLES.get(n[i]);
    if (desc) singles.push({ index: i, value: n[i], hex: hex(n[i]), desc, algo: SINGLE_ALGO.get(n[i]) });
  }

  // 每个算法的「佐证分」：它的 T/K 表常量在输入里出现了几次
  const supportOf = (algoId) => singles.filter((s) => s.algo === algoId).length;

  const modifiedCandidates = [];

  for (const algo of ALGOS) {
    const iv = algo.iv;
    if (n.length < iv.length) continue;

    // ① 精确：前 iv.length 个位置逐一相等
    let exactRun = 0;
    while (exactRun < iv.length && n[exactRun] === iv[exactRun]) exactRun++;
    if (exactRun === iv.length) {
      matches.push({
        algo: algo.id, name: algo.name,
        kind: n.length === iv.length ? 'exact' : 'prefix',
        matched: exactRun, total: iv.length,
        diffs: iv.map(() => 0),
        ambiguousWith: algo.id === 'md5' && n.length > 4 ? ['sha1'] : [],
        caveat: algo.caveat || null,
      });
      continue;
    }

    // ② 疑似魔改：用「容忍前缀」（|diff| <= TOL）作为判据。
    //    不能用「精确前缀」——首元素就被改掉时精确前缀恒为 0，
    //    而实战里的魔改恰恰经常改第一个寄存器（如 0x67452301 -> 0x67452309）。
    let lead = 0;
    while (lead < iv.length && Math.abs(n[lead] - iv[lead]) <= TOL) lead++;
    let exactCount = 0;
    for (let i = 0; i < iv.length; i++) if (n[i] === iv[i]) exactCount++;

    const half = Math.ceil(iv.length / 2);
    if (lead >= half && exactCount < iv.length) {
      const diffs = [];
      for (let i = 0; i < iv.length; i++) diffs.push(n[i] - iv[i]);
      modifiedCandidates.push({
        algo: algo.id, name: algo.name, kind: 'modified',
        matched: exactCount, total: iv.length, lead, diffs,
        support: supportOf(algo.id),
        // 容忍前缀占比 + T/K 表佐证（用来在 MD5 / SHA-1 这种共享 IV 前缀的家族里定族）
        rank: lead / iv.length + 0.2 * supportOf(algo.id),
        caveat: algo.caveat || null,
      });
    }
  }

  if (modifiedCandidates.length) {
    modifiedCandidates.sort((a, b) => b.rank - a.rank);
    const top = modifiedCandidates[0];
    const ties = modifiedCandidates.filter((c) => Math.abs(c.rank - top.rank) < 1e-9 && c !== top);
    top.alsoConsidered = ties.map((c) => ({ algo: c.algo, name: c.name, rank: Number(c.rank.toFixed(3)) }));
    matches.push(top);
  }

  // IV 出现在中间（不是开头）→ 可能是「先塞了几个别的常量，再接 IV」
  for (const algo of ALGOS) {
    const at = indexOfSub(n, algo.iv, 1);
    if (at > 0) {
      matches.push({
        algo: algo.id, name: algo.name, kind: 'contains',
        matched: algo.iv.length, total: algo.iv.length, at,
      });
    }
  }

  let verdict = 'none';
  if (matches.some((m) => m.kind === 'exact')) verdict = 'exact';
  else if (matches.some((m) => m.kind === 'modified')) verdict = 'modified';
  else if (matches.some((m) => m.kind === 'prefix' || m.kind === 'contains')) verdict = 'prefix';

  return { matches, singles, verdict, length: n.length };
}

/** 把一条「日志里的一组定值」渲染成人可读的结论 */
function render(nums, label) {
  const r = analyze(nums);
  const lines = [];
  const head = (label ? label + ' ' : '') + '[' + nums.length + ' 个元素]';
  lines.push(head);

  if (r.verdict === 'none') {
    lines.push('  未命中任何已知算法的 IV（可能是自定义表 / 分组数据 / 随机噪声）');
    lines.push('  十进制: ' + nums.map(u32).join(','));
    lines.push('  十六进制: ' + nums.slice(0, 16).map(hex).join(', ') + (nums.length > 16 ? ', …' : ''));
    return lines.join('\n');
  }

  for (const m of r.matches) {
    if (m.kind === 'exact') {
      lines.push(`  ✅ 精确命中 ${m.name} 初始向量（${m.matched}/${m.total}）`);
      if (m.caveat) lines.push('     ⚠️ ' + m.caveat);
    } else if (m.kind === 'prefix') {
      lines.push(`  ◐ 前缀命中 ${m.name}（输入比 IV 长，${m.matched}/${m.total}）`);
      if (m.ambiguousWith && m.ambiguousWith.length) {
        lines.push('     ⚠️ 与 ' + m.ambiguousWith.join('/').toUpperCase() + ' 前若干值相同，'
          + '需要用第 ' + (m.total + 1) + ' 个元素判别');
      }
    } else if (m.kind === 'modified') {
      lines.push(`  ⚠️ 疑似魔改 ${m.name}（容忍前缀 ${m.lead}/${m.total}，其中精确相等 ${m.matched} 个）`);
      lines.push('     逐值 diff（实测 - 标准）:');
      for (let i = 0; i < m.diffs.length; i++) {
        const d = m.diffs[i];
        const mark = d === 0 ? '  =' : '  ≠';
        lines.push(`       [${i}] 实测 ${hex(nums[i])} (${u32(nums[i])})`
          + ` / 标准 ${hex(ALGOS_IV(m.algo)[i])} → diff ${d > 0 ? '+' : ''}${d}${mark}`);
      }
      if (m.support) lines.push(`     佐证：输入里命中 ${m.name} 的 T/K 表常量 ${m.support} 处`);
      if (m.alsoConsidered && m.alsoConsidered.length) {
        lines.push('     同分候选（共享 IV 前缀，需自行判别）: '
          + m.alsoConsidered.map((c) => c.name).join(' / '));
      }
      lines.push('     ⇒ 处置：只改被改的常量，T 表/S 表未动就不要动；改完用真实密文逐字节对拍。');
    } else if (m.kind === 'contains') {
      lines.push(`  ◐ ${m.name} 的 IV 出现在下标 ${m.at} 处（前面还有别的常量）`);
    }
  }

  if (r.singles.length) {
    lines.push('  单值常量命中:');
    for (const s of r.singles) lines.push(`     [${s.index}] ${s.hex} = ${s.desc}`);
  }
  return lines.join('\n');
}

function ALGOS_IV(id) {
  const a = ALGOS.find((x) => x.id === id);
  return a ? a.iv : [];
}

// ---------------------------------------------------------------- padding

/**
 * 标准 MD5/SHA-1/SHA-256 的字节级 padding 方案（分组 512 bit = 64 字节，长度域 8 字节大端）。
 * 用途：在插桩日志里**生成预期值**再去搜，而不是盲搜。
 * ⚠️ 只生成预期；对不上说明目标 VM 的 padding 非标准，此时以日志为准。
 */
function shaPaddingPlan(byteLen) {
  if (!Number.isInteger(byteLen) || byteLen < 0) throw new Error('byteLen 必须是非负整数');
  const r = byteLen % 64;
  let zeros, total;
  if (r < 56) {
    zeros = 55 - r;                       // 0x80 之后要补的 0x00 个数
    total = byteLen + 1 + zeros + 8;
  } else {
    zeros = (64 - r) + 56;                // 本块补满 + 新开一块的 56 个 0
    total = byteLen + (64 - r) + 56 + 8;
  }
  return { byteLen, remainder: r, oneByte: 1, zeros, lenBytes: 8, total, ok: total % 64 === 0 };
}

/** 日志里应当出现的那个 32 位字：末 3 字节 + 0x80（用于回日志核对） */
function expectedPadWord(lastThreeBytes) {
  const b = lastThreeBytes.map((x) => x & 0xff);
  return (((b[0] << 24) >>> 0) | (b[1] << 16) | (b[2] << 8) | 0x80) >>> 0;
}

// ---------------------------------------------------------------- selftest

function selftest() {
  const assert = require('assert');
  let checks = 0;
  const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
  const has = (r, algo, kind) => r.matches.some((m) => m.algo === algo && m.kind === kind);

  // 1) 标准 MD5 IV → 精确命中，diff 全 0
  const md5iv = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
  const r1 = analyze(md5iv);
  ok(has(r1, 'md5', 'exact'), '标准 MD5 IV 应精确命中 md5');
  ok(r1.matches.find((m) => m.algo === 'md5' && m.kind === 'exact').diffs.every((d) => d === 0),
    '标准 MD5 IV 的 diff 必须全 0');
  ok(!has(r1, 'sha1', 'exact'), '4 元素数组不得命中 sha1（长度守卫）');
  ok(!has(r1, 'sha1', 'exact') && !has(r1, 'sha1', 'prefix'),
    '4 元素数组不得把 sha1 报成前缀命中');

  // 2) 标准 SHA-1 IV（5 个）→ 精确命中 sha1；md5 只能是「前缀命中」并被标注歧义
  const sha1iv = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
  const r2 = analyze(sha1iv);
  ok(has(r2, 'sha1', 'exact'), '标准 SHA-1 IV（5 个）应精确命中 sha1');
  ok(has(r2, 'md5', 'prefix'), 'SHA-1 IV 的前 4 个应被报成 md5 前缀命中（歧义必须显式给出）');
  ok(r2.matches.find((m) => m.algo === 'md5' && m.kind === 'prefix').ambiguousWith.includes('sha1'),
    'md5 前缀命中必须标注与 sha1 歧义');

  // 3) 魔改 MD5 IV → 疑似魔改 + 逐值 diff = [+8, -2, 0, 0]
  const mod4 = [0x67452309, 0xEFCDAB87, 0x98BADCFE, 0x10325476];
  const r3 = analyze(mod4);
  ok(has(r3, 'md5', 'modified'), '魔改 MD5 IV 应报为 modified');
  const d3 = r3.matches.find((m) => m.algo === 'md5' && m.kind === 'modified').diffs;
  ok(d3[0] === 8 && d3[1] === -2 && d3[2] === 0 && d3[3] === 0,
    '魔改 diff 应为 [+8,-2,0,0]，实际 ' + JSON.stringify(d3));

  // 4) 某程实测 7 元数组（2034891）：魔改 MD5 + 命中 MD5 T[0]
  const ctrip = [1732584201, 4023233415, 2562383102, 271733878, 942946097, 7, 3614090360];
  const r4 = analyze(ctrip);
  ok(has(r4, 'md5', 'modified'), '某程 7 元数组应报为魔改 MD5');
  const d4 = r4.matches.find((m) => m.algo === 'md5' && m.kind === 'modified').diffs;
  ok(d4[0] === 8 && d4[1] === -2, '某程魔改 diff 前两位应为 +8 / -2');
  ok(r4.singles.some((s) => s.index === 6 && s.desc === 'MD5 T[0]'),
    '下标 6 的 3614090360 应被识别为 MD5 T[0]');
  // 下标 4 是「多出来的第 5 个寄存器」，属非标准常量，不得被误认成任何已知常量
  ok(!r4.singles.some((s) => s.index === 4),
    '非标准常量（下标 4 = ' + hex(942946097) + '）不得被误命中');
  ok(!SINGLES.has(u32(942946097)), '942946097 不应存在于已知常量表里');

  // 5) 随机数 → 不得命中（反向断言：防止「什么都能认」）
  const r5 = analyze([12345, 67890, 111, 222]);
  ok(r5.verdict === 'none', '随机数不得命中任何算法，实际 ' + r5.verdict);

  // 6) 更狠的反向断言：200 组随机数组都不许出现 exact / modified
  let falsePos = 0;
  let seed = 20260921;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
  for (let i = 0; i < 200; i++) {
    const len = 4 + (rnd() % 5);
    const arr = [];
    for (let j = 0; j < len; j++) arr.push(rnd() % 0xFFFFFFFF);
    const r = analyze(arr);
    if (r.verdict === 'exact' || r.verdict === 'modified') falsePos++;
  }
  ok(falsePos === 0, '200 组随机数组不得出现 exact/modified，实际误报 ' + falsePos);

  // 7) SM3 / SHA-256 / SM4-FK
  ok(has(analyze([0x7380166F, 0x4914B2B9, 0x172442D7, 0xDA8A0600,
    0xA96F30BC, 0x163138AA, 0xE38DEE4D, 0xB0FB0E4E]), 'sm3', 'exact'), 'SM3 IV 应精确命中');
  ok(has(analyze([0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19]), 'sha256', 'exact'), 'SHA-256 IV 应精确命中');
  ok(has(analyze([0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc]), 'sm4-fk', 'exact'),
    'SM4 FK 应精确命中');

  // 8) 解析：十进制 / 十六进制 / 带括号引号 / 换行 等价
  const p1 = parseNumbers('1732584201,4023233415,2562383102,271733878');
  const p2 = parseNumbers('[0x67452309, 0xEFCDAB87, 0x98BADCFE, 0x10325476]');
  const p3 = parseNumbers('0x67452309\n0xEFCDAB87\n0x98BADCFE\n0x10325476');
  ok(JSON.stringify(p1.map(u32)) === JSON.stringify(p2.map(u32)) && p2.length === 4,
    '十进制与十六进制解析结果应一致');
  ok(JSON.stringify(p2.map(u32)) === JSON.stringify(p3.map(u32)), '换行分隔应与逗号分隔等价');

  // 9) 日志抽取：能从一段插桩日志文本里挖出数组
  const log = [
    '[BIN_1] 左值 ==> [1732584201, 4023233415, 2562383102, 271733878, 942946097, 7, 3614090360]',
    '不相关的一行 [ 1, 2, 3 ] 只有三个元素，不该被抽出来',
    '[CALL_2] 结果 ==> [0x67452309,0xEFCDAB87,0x98BADCFE,0x10325476]',
  ].join('\n');
  const arrays = extractArrays(log);
  ok(arrays.length === 2, '应恰好抽出 2 个 ≥4 元素的数组，实际 ' + arrays.length);
  ok(analyze(parseNumbers(arrays[0])).matches.length > 0, '抽出的第一个数组应能被识别');

  // 10) 退出码约定：未命中不等于错误（调用方靠 verdict 判断）
  ok(typeof analyze([1, 2, 3, 4]).verdict === 'string', 'verdict 必须是字符串');

  // 11) padding 方案：`52pojie-2116112` 的 971 字节实测 —— 必须补 44 个 0，总长 1024
  const p971 = shaPaddingPlan(971);
  ok(p971.remainder === 11, '971 % 64 应为 11，实际 ' + p971.remainder);
  ok(p971.zeros === 44, '971 字节应补 44 个 0x00，实际 ' + p971.zeros);
  ok(p971.total === 1024, '971 字节补完总长应为 1024，实际 ' + p971.total);
  ok(p971.ok, '补完总长必须是 64 的整数倍');

  // 12) 边界：r = 55 / 56 / 63 三个分界点
  ok(shaPaddingPlan(55).zeros === 0 && shaPaddingPlan(55).total === 64, 'r=55 应恰好补满到 64');
  ok(shaPaddingPlan(56).total === 128, 'r=56 应新开一块，总长 128');
  ok(shaPaddingPlan(63).total === 128, 'r=63 应新开一块，总长 128');
  ok(shaPaddingPlan(0).total === 64, 'L=0 应补出完整一块 64');

  // 13) 反向断言：任意长度补完都必须是 64 的整数倍（防止公式被改坏后「看起来还能算」）
  let badTotal = 0;
  for (let L = 0; L <= 300; L++) if (!shaPaddingPlan(L).ok) badTotal++;
  ok(badTotal === 0, '0..300 字节补完总长都必须能被 64 整除，实际违规 ' + badTotal);

  // 14) 原文的中间算术是错的 —— 用「补完必须整除 64」把它证伪（区分性断言）
  const articleZeros = 64 - 11 - 1;                       // 原文写的 42
  ok(articleZeros === 52, '64-11-1 实际是 52，不是原文写的 42');
  ok((971 + 1 + articleZeros + 8) % 64 !== 0,
    '按原文的 42 补完总长 1022 不能被 64 整除 ⇒ 该数字自相矛盾');
  ok((971 + 1 + 42 + 8) % 64 === 62, '按 42 补完总长 1022，1022 % 64 = 62');

  // 15) 日志里应当出现的那 32 位字（末三字节 `}}}` = 0x7D7D7D）
  ok(expectedPadWord([0x7d, 0x7d, 0x7d]) === 0x7D7D7D80, '末三字节 7D7D7D + 0x80 应得 0x7D7D7D80');
  ok((0x7D7D7D00 >>> 0) === 2105376000, '0x7D7D7D00 应为十进制 2105376000（原文该值正确）');

  // 16) 🔴 limb 大整数识别（B13 新增）——防止把 RSA 模数误判成「魔改哈希常量表」
  //     这是本轮真实走过的弯路：一组 37 个神秘整数，第一直觉是"魔改 MD5 的 T 表"，
  //     实际是 jsbn 形式（2^30 limb、低位在前）的 RSA 模数 n；指数就在隔壁的 e。
  const rsaN = [192007799, 114825681, 193118990, 266222446, 239702029, 53419855,
    210456210, 235088571, 118605468, 111081405, 23033814, 37191, 216811803,
    188222612, 194936855, 40795983, 128992659, 19418592, 1961647, 228544787,
    47368259, 57130987, 233317798, 232454343, 168541728, 22284269, 67866178,
    123637318, 184039944, 194835225, 17862181, 199213632, 123184483, 122629547,
    208085612, 19616610, 34738];
  const bn = analyzeBignum({ t: 37, s: 0 }, rsaN);
  ok(bn.isBignum === true, '37 limb 数组被识别为 limb 大整数');
  ok(bn.bitLen === 1096, `还原后 bit 长度应为 1096（实测 ${bn.bitLen}）`);
  ok(bn.bitLen > 1024 && bn.bitLen <= 1024 + 72,
    '1096 bit 落在 RSA-1024 加 limb 填充的区间内（1024~1096）');
  ok(analyzeBignum({ t: 36, s: 0 }, rsaN).isBignum === false, 't 与实际 limb 数不符 ⇒ 拒绝');
  ok(analyzeBignum({ t: 37, s: 2 }, rsaN).isBignum === false, 's 非 0/1 ⇒ 拒绝');
  ok(analyzeBignum({}, [0]).isBignum === false, '单元素 ⇒ 拒绝（非 limb 数组）');
  // 反向断言：真正的哈希 IV 不得被判成 limb 大整数
  ok(analyzeBignum({}, [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476]).isBignum === false,
    'MD5 标准 IV 不得被判成 limb 大整数（含 >= 2^30 的 limb）');
  ok(analyzeBignum({}, [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a]).isBignum === false,
    'SHA-256 标准 IV 不得被判成 limb 大整数');

  console.log('crypto-signature-id --selftest: ' + checks + ' 项断言全部通过');
}

// ---------------------------------------------------------------- cli

function main(argv) {
  const args = argv.slice(2);
  if (args.indexOf('--selftest') !== -1) { selftest(); return 0; }

  const getOpt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? null : (args[i + 1] === undefined ? null : args[i + 1]);
  };
  const asJson = args.indexOf('--json') !== -1;
  const inputArg = getOpt('--input');
  const fileArg = getOpt('--file');
  const padArg = getOpt('--padding');
  const top = Number(getOpt('--top') || 20);

  if (padArg !== null && padArg !== undefined) {
    const n = Number(padArg);
    if (!Number.isInteger(n) || n < 0) {
      console.error('--padding 需要一个非负整数（明文字节数）');
      return 2;
    }
    const p = shaPaddingPlan(n);
    if (asJson) {
      console.log(JSON.stringify(p, null, 2));
    } else {
      console.log(`明文 ${p.byteLen} 字节 → r = ${p.byteLen} % 64 = ${p.remainder}`);
      console.log(`  补 0x80 × 1 + 0x00 × ${p.zeros} + 长度域 8 字节`);
      console.log(`  补完总长 ${p.total}（${p.total % 64 === 0 ? '可被 64 整除 ✓' : '⚠️ 不可整除，公式有误'}）`);
      console.log('  ⚠️ 这只是「预期值」：回日志搜时对不上，说明目标 VM 的 padding 非标准，以日志为准。');
    }
    return p.ok ? 0 : 3;
  }

  if (!inputArg && !fileArg) {
    console.error('用法: node crypto-signature-id.js --input "<数字列表>" [--json]');
    console.error('      node crypto-signature-id.js --file <日志.txt> [--top 20] [--json]');
    console.error('      node crypto-signature-id.js --padding <明文字节数>');
    console.error('      node crypto-signature-id.js --selftest');
    return 2;
  }

  if (inputArg) {
    const nums = parseNumbers(inputArg);
    if (nums.length < 4) {
      console.error('至少需要 4 个数字');
      return 2;
    }
    const r = analyze(nums);
    if (asJson) {
      console.log(JSON.stringify({ input: nums.map(u32), result: r }, null, 2));
    } else {
      console.log(render(nums));
    }
    return r.verdict === 'none' ? 3 : 0;
  }

  const abs = path.resolve(fileArg);
  if (!fs.existsSync(abs)) {
    console.error('文件不存在: ' + abs);
    return 1;
  }
  const text = fs.readFileSync(abs, 'utf8');
  const arrays = extractArrays(text);
  if (!arrays.length) {
    console.error('未在文件中找到长度 ≥ 4 的数字数组');
    return 3;
  }

  const seen = new Set();
  const items = [];
  for (const a of arrays) {
    const nums = parseNumbers(a).map(u32);
    const key = nums.join(',');
    if (seen.has(key)) continue;         // 去重：同一组定值在日志里重复出现很正常
    seen.add(key);
    items.push(nums);
  }
  items.sort((a, b) => b.length - a.length);

  const shown = items.slice(0, top);
  const json = [];
  for (const nums of shown) {
    const r = analyze(nums);
    if (asJson) json.push({ input: nums, result: r });
    else console.log(render(nums) + '\n');
  }
  if (asJson) console.log(JSON.stringify(json, null, 2));

  const hits = shown.filter((n) => analyze(n).verdict !== 'none').length;
  console.error(`共抽取 ${items.length} 组去重数组，展示 ${shown.length} 组，其中 ${hits} 组命中已知算法`);
  return hits > 0 ? 0 : 3;
}

module.exports = { analyze, parseNumbers, extractArrays, render, shaPaddingPlan, expectedPadWord, ALGOS, SINGLES };

if (require.main === module) {
  process.exit(main(process.argv));
}
