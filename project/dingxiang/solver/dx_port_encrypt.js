// 把 greenseer 模块 11 (18 个 encrypt_* ua 字节变换) 移植成零依赖的 dx_encrypt.js。
//
// 做法(机械、不改语义):
//   1) 取 webpack factory 源码 function(t,o,i){...}
//   2) 只把三张字符串表的索引 e[i]/n[i]/r[i] 内联成字面量 —— 标识符一个都不替换,
//      因为函数体内 o/i/u/c 等是局部量, 替换会把 `u++` 变成 `"..."++` 这种垃圾。
//   3) 用 IIFE 重新包好, 导出那 18 个函数。
//   4) 自检: 与原 SDK 逐字节比对, 不一致退出非 0。
const fs = require("node:fs");
const { load, findEncrypt } = require("./dx_harness.js");

const { mods, cache, tables } = load();
const hit = findEncrypt(cache)[0];
const id = Number(hit.path.match(/\d+/)[0]);
const orig = hit.obj; // 真 SDK = oracle
const facRaw = String(mods.m[id]);

// ---- 1) 内联表索引 ---------------------------------------------------
const lit = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));
function inlineTables(src) {
  return src.replace(/\b([enr])\[(\d+)\]/g, (_s, t, i) => {
    const v = tables[t][Number(i)];
    return v === undefined ? _s : lit(v);
  });
}

const body = inlineTables(facRaw);
const left = (body.match(/\b([enr])\[\d+\]/g) || []).length;

const out = [
  `// 自动生成 (dx_port_encrypt.js) — greenseer.js 模块 ${id}`,
  "// 18 个 ua 字节变换, 字符串表索引已全部内联成字面量, 零依赖。",
  "// 与真 SDK 逐字节一致由 dx_port_encrypt.js 的自检保证。",
  "/* eslint-disable */",
  "'use strict';",
  "var __ex = {};",
  `(${body})({}, __ex, function () { return {}; });`,
  "module.exports = __ex;",
  "",
].join("\n");
fs.writeFileSync("dingxiang/solver/dx_encrypt.js", out);

// ---- 2) 自检 --------------------------------------------------------
const gen = require("./dx_encrypt.js");
const keys = Object.keys(orig).filter((k) => /^encrypt_/.test(k));
const samples = [
  "",
  "a",
  "abc123",
  "https://www.hb56.com/Login.aspx?type=pw",
  String.fromCharCode(
    ...Array.from({ length: 40 }, (_, i) => (i * 37 + 11) % 256),
  ),
];
let bad = 0;
let ok = 0;
for (const k of keys) {
  let pass = true;
  for (const s of samples) {
    let a;
    let b;
    try {
      a = orig[k](s);
    } catch (e) {
      a = `ERR:${e.message}`;
    }
    try {
      b = gen[k](s);
    } catch (e) {
      b = `ERR:${e.message}`;
    }
    if (a !== b) {
      pass = false;
      bad++;
      console.log(
        `✗ ${k} len=${s.length}\n  原=${JSON.stringify(a).slice(0, 70)}\n  新=${JSON.stringify(b).slice(0, 70)}`,
      );
      break;
    }
  }
  if (pass) ok++;
}
console.log(
  `生成 dingxiang/solver/dx_encrypt.js  (${(out.length / 1024).toFixed(1)}KB, 残留表索引 ${left})`,
);
console.log(`18 个 encrypt_* 逐字节一致: ${ok}/${keys.length}`);
process.exit(bad || left ? 1 : 0);
