// 独立校验: dx_encrypt.js 的 18 个 encrypt_* 必须与真 SDK 逐字节一致。
// 为什么要单独一个脚本: pi-lens 会在写文件后改写生成物(箭头函数等), 生成时的自检不代表落盘后的状态。
// 用法: node dx_verify_encrypt.js
const { load, findEncrypt } = require("./dx_harness.js");

const { cache } = load();
const orig = findEncrypt(cache)[0].obj;
const gen = require("./dx_encrypt.js");

const samples = [
  "",
  "a",
  "abc",
  "https://www.hb56.com/Login.aspx?type=pw",
  String.fromCharCode(
    ...Array.from({ length: 64 }, (_, i) => (i * 37 + 11) % 256),
  ),
];
const keys = Object.keys(orig).filter((k) => /^encrypt_/.test(k));

let bad = 0;
let ok = 0;
for (const k of keys) {
  if (typeof gen[k] !== "function") {
    console.log(`✗ 缺少 ${k}`);
    bad++;
    continue;
  }
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
      console.log(
        `✗ ${k} len=${s.length} 原=${JSON.stringify(a).slice(0, 60)} 新=${JSON.stringify(b).slice(0, 60)}`,
      );
      break;
    }
  }
  if (pass) ok++;
  else bad++;
}
console.log(
  `encrypt_* 与真 SDK 一致: ${ok}/${keys.length}  (额外导出 ${Object.keys(gen).length - keys.length} 个)`,
);
process.exit(bad ? 1 : 0);
