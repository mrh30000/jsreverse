// ua 各 tag 的明文构造器 + 对真 SDK 的逐字节自检。
//
// 帧结构(已验证): tag(1B) + 密文长度(2B 大端) + 密文;  密文 = encrypt_<tag>(明文)
// tag -> encrypt 映射见 artifacts/tag-encrypt-map.json
//
// 同一个脚本里: (a) 跑真 SDK 抓每个 tag 的真实明文字节当 oracle,
// (b) 跑本文件构造器, (c) 逐 tag diff。tag6 是环境探测值(Node 与真浏览器必然不同), 只校验长度。
// 用法: node dx_plaintext.js
const { load, findEncrypt } = require("./dx_harness.js");
const enc = require("./dx_encrypt.js");

const B = (...n) => n.map((x) => x & 255);
const u16 = (n) => [(n >> 8) & 255, n & 255];
const u32 = (n) => [
  (n >>> 24) & 255,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
];
const str = (s) => [...String(s)].map((c) => c.codePointAt(0) & 255);
/** 文章那句"高32位/低32位各转4字节大端"合起来就是 8 字节大端时间戳 */
const ts8 = (ms) => [
  ...u32(Math.floor(ms / 0x100000000)),
  ...u32(ms % 0x100000000),
];

// ---- oracle: 跑真 SDK, 记录 tag -> 明文字节 --------------------------------
function capture() {
  const { cache } = load();
  const Ve = findEncrypt(cache)[0].obj;
  const stack = [];
  for (const k of Object.keys(Ve)) {
    if (!/^encrypt_/.test(k)) continue;
    const f = Ve[k];
    Ve[k] = function (x) {
      stack.push(String(x));
      return f.call(this, x);
    };
  }
  const cls = cache[5].exports.default;
  const realApp = cls.prototype.app;
  const frames = [];
  cls.prototype.app = function (t, _o) {
    const s = stack.pop();
    if (s !== undefined && !frames.some((f) => f.tag === t))
      frames.push({ tag: t, s });
    return realApp.apply(this, arguments);
  };
  const inst = new cls({});
  inst.init({});
  const out = {};
  for (const f of frames) out[f.tag] = [...f.s].map((c) => c.codePointAt(0));
  return out;
}

// ---- 构造器 ---------------------------------------------------------------
const BUILDERS = {
  // 1 getTM  时间戳
  1: (e) => ts8(e.now),
  // 2 getBR  [平台码, 浏览器码, 0, 版本长度, ...版本]
  2: (e) => [
    ...B(e.platformCode, e.browserCode, 0, e.browserVersion.length),
    ...str(e.browserVersion),
  ],
  // 3 getSC  10 个 u16 大端: screen / avail / 0 / 0 / inner / outer
  3: (e) => [
    ...u16(e.screen.width),
    ...u16(e.screen.height),
    ...u16(e.screen.availWidth),
    ...u16(e.screen.availHeight),
    ...u16(0),
    ...u16(0),
    ...u16(e.window.innerWidth),
    ...u16(e.window.innerHeight),
    ...u16(e.window.outerWidth),
    ...u16(e.window.outerHeight),
  ],
  // 4 getLO  [0, href长, href, 0, referrer长, referrer] 截到 64B
  4: (e) =>
    [
      ...B(0, e.href.length),
      ...str(e.href),
      ...B(0, e.referrer.length),
      ...str(e.referrer),
    ].slice(0, 64),
  // 5 getCF  js 代码签名 -> 只能按版本写死 (文章原话)
  5: (e) => [...u16(e.jsCode), ...u16(e.jsSig.length), ...str(e.jsSig)],
  // 6 getDI  devtools 探测, 1 字节, 值随环境变
  6: (e) => B(e.devtools ? 1 : 0),
  // 7 getEM  自动化探测位图
  7: (e) => [...u16(e.emA), ...u16(e.emB ? 1 : 0)],
  // 8 getJSV jsv 版本标志
  8: (e) => [...u16(e.jsvA), ...u16(e.jsvB)],
};

// tag6 是环境探测值, 真浏览器与 Node stub 必然不同 -> 只校验布局(1B), 不比值
const ENV_ONLY = new Set([6]);

// ---- 自检 ----------------------------------------------------------------
const truth = capture();
const tags = Object.keys(truth)
  .map(Number)
  .sort((a, b) => a - b);
console.log(
  "SDK 现场帧:",
  tags.map((t) => `${t}:${truth[t].length}B`).join("  "),
);

// 用 oracle 自己的值反推 env: 布局对了才能反推出来, 所以这一步不构成循环论证 ——
// 真正被检验的是 BUILDERS 的字节排布, 而不是数值来源。
const t2 = truth[2] || [1, 1, 0, 3, 49, 51, 49];
const t5 = truth[5] || [];
const env = {
  now: (truth[1] || []).reduce((a, b) => a * 256 + b, 0) || Date.now(),
  platformCode: t2[0],
  browserCode: t2[1],
  browserVersion: String.fromCharCode(...t2.slice(4)),
  screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040 },
  window: {
    innerWidth: 1920,
    innerHeight: 929,
    outerWidth: 1936,
    outerHeight: 1048,
  },
  href: "https://www.hb56.com/Login.aspx?type=pw",
  referrer: "https://www.hb56.com/",
  devtools: (truth[6] || [0])[0] === 1,
  emA: 0,
  emB: true,
  jsvA: 0,
  jsvB: 1,
  jsCode: (t5[0] << 8) | t5[1],
  jsSig: String.fromCharCode(...t5.slice(4)),
};

let bad = 0;
let ok = 0;
let warn = 0;
console.log("\n逐 tag 对比 (构造器 vs SDK 现场明文):");
for (const t of tags) {
  const b = BUILDERS[t];
  if (!b) {
    console.log(`  tag ${t}: 未实现`);
    bad++;
    continue;
  }
  const mine = b(env);
  const tv = truth[t];
  if (ENV_ONLY.has(t)) {
    const good = mine.length === tv.length;
    console.log(
      `  tag ${t}: ${good ? "✓" : "✗"} ${mine.length}B (环境探测值, 只校验布局)`,
    );
    if (good) warn++;
    else bad++;
    continue;
  }
  const same = mine.length === tv.length && mine.every((v, i) => v === tv[i]);
  if (same) {
    ok++;
    console.log(`  tag ${t}: ✓ ${mine.length}B 逐字节一致`);
    continue;
  }
  bad++;
  const i = mine.findIndex((v, k) => v !== tv[k]);
  console.log(
    `  tag ${t}: ✗ 我${mine.length}B/SDK${tv.length}B 首差@${i < 0 ? "长度" : i} ` +
      `我=[${mine.slice(Math.max(0, i), i + 6)}] SDK=[${tv.slice(Math.max(0, i), i + 6)}]`,
  );
}

const TAG_ENC = {
  1: "encrypt_jrk7m86fvtabp7zcnwue",
  2: "encrypt_ludoj0512480ts7tf89b",
  3: "encrypt_6yioqc6nzuwge5qbo8v5",
  4: "encrypt_4r4cerm4cpjc74vhznnh",
  5: "encrypt_mm8fyhuehlp6qgks4lni",
  6: "encrypt_21wpc2mwfyi2t86t19qs",
  7: "encrypt_fqe9088f8le6wmwaqvfn",
  8: "encrypt_vmh0hi6mi3rzm89i85kk",
};
console.log("\nencrypt 链路 (dx_encrypt.js 对每个 tag 明文):");
for (const t of tags) {
  const name = TAG_ENC[t];
  if (!name || !enc[name]) {
    console.log(`  tag ${t}: 无映射`);
    bad++;
    continue;
  }
  const out = enc[name](String.fromCharCode(...truth[t]));
  const good = out.length === truth[t].length;
  if (!good) bad++;
  console.log(`  tag ${t}: ${good ? "✓" : "✗"} ${out.length}B`);
}
console.log(`\n结果: 逐字节一致 ${ok}, 布局校验 ${warn}, 失败 ${bad}`);

// ---- 端到端: 在【同一次】SDK 运行里取齐 明文/帧顺序/ua, 重建后直接比 ----------
// 只验【帧顺序 + 加密 + base64】。tag5(getCF) 长度会跨运行变化, 所以必须单次运行内闭环。
// 各 tag 的【布局】正确性由上面的逐 tag 对比负责。
const { buildUa } = require("./dx_ac.js");
function sdkRun() {
  const { cache } = load(); // 只 load 一次: 两次 load 的 getCF 长度会漂
  const Ve = findEncrypt(cache)[0].obj;
  const stack = [];
  const plain = {}; // tag -> 本次运行真实明文
  for (const k of Object.keys(Ve)) {
    if (!/^encrypt_/.test(k)) continue;
    const f = Ve[k];
    Ve[k] = function (x) {
      stack.push(String(x));
      return f.call(this, x);
    };
  }
  const cls = cache[5].exports.default;
  const ra = cls.prototype.app;
  const order = [];
  const frames = [];
  const byIndex = []; // 两遍设备块时间戳不同, 必须按帧序号记
  cls.prototype.app = function (t, o) {
    const s = stack.pop();
    const bytes = s === undefined ? null : [...s].map((c) => c.codePointAt(0));
    order.push(t);
    frames.push({ tag: t, cipher: String(o) });
    byIndex.push(bytes);
    if (bytes && plain[t] === undefined) plain[t] = bytes;
    return ra.apply(this, arguments);
  };
  const inst = new cls({});
  inst.init({});
  return { ua: String(inst.ua), order, frames, plain, byIndex };
}
const run = sdkRun();
console.log(`\nSDK 帧顺序: ${run.order.join(",")}`);
const uniq = [...new Set(run.order)];
console.log(
  `  → 设备块共 ${uniq.length} 帧, 发了 ${run.order.length / uniq.length} 遍` +
    ` (对应文章"app 里根据 t 做标记, 后续通过 1-10 序列还原")`,
);

// 用【本次运行真实明文】过一遍我的 dx_encrypt.js + 帧拼接 + base64
const mineFrames = run.order.map((t, i) => ({
  tag: t,
  cipher: enc[TAG_ENC[t]](String.fromCharCode(...run.byIndex[i])),
}));
const mineUa = buildUa(mineFrames);
const e2e = mineUa === run.ua;
console.log(
  `端到端 ua(=ac) 一致: ${e2e ? "✓ 逐字节相同" : "✗"}  (长度 ${mineUa.length} vs ${run.ua.length})`,
);
if (e2e) {
  console.log(`  样例: ${JSON.stringify(mineUa.slice(0, 48))}…`);
} else {
  const i = [...mineUa].findIndex((c, k) => c !== run.ua[k]);
  console.log(
    `  首个差异 @${i}: 我=${JSON.stringify(mineUa.slice(i, i + 12))} SDK=${JSON.stringify(run.ua.slice(i, i + 12))}`,
  );
  bad++;
}
console.log(`\n最终: 失败 ${bad}`);
process.exit(bad ? 1 : 0);

if (require.main !== module) module.exports = { BUILDERS, capture, env };
