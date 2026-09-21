// 驱动 ConstID 把真实 `param` 录出来 (第 2/3 步设备认证)。
// 用法: node dx_drive_lid.js
const { load, reqs } = require("./dx_constid.js");

const { win, mods } = load();
const CI = mods.c[7].exports.default;
const P = CI.prototype;

const APPKEY = "90762f230adee6af3957d9a029269461";
const SERVER = "https://captcha.gdtspace.com/udid/c1";

console.log("=== 逐个探测原型方法源码规模 ===");
for (const k of [
  "getLid",
  "_getLid",
  "setLid",
  "XuRhstZ",
  "detect",
  "prequest",
  "parseResponse",
  "checkOptions",
]) {
  console.log(` ${k}: ${String(P[k]).length}B`);
}

console.log("\n=== 实例化 ===");
let inst;
try {
  inst = new CI({ appKey: APPKEY, server: SERVER, cache: false, timeout: 0 });
  console.log("ok. 实例键:", Object.getOwnPropertyNames(inst).join(","));
} catch (e) {
  console.log(
    "失败:",
    e.message,
    "\n",
    String(e.stack).split("\n").slice(1, 4).join("\n"),
  );
}

if (!inst) process.exit(1);

console.log(
  "\n实例 option =",
  JSON.stringify(inst.option || inst._option || {}).slice(0, 300),
);
console.log("实例 _state =", JSON.stringify(inst._state));

console.log("\n=== getLid() ===");
try {
  const r = inst.getLid();
  Promise.resolve(r)
    .then((v) => console.log("getLid ->", JSON.stringify(v).slice(0, 200)))
    .catch((e) =>
      console.log(
        "getLid reject:",
        String((e && e.message) || e).slice(0, 160),
      ),
    );
} catch (e) {
  console.log("getLid 抛错:", e.message);
}

console.log("\n=== 直接调 XuRhstZ(样例对象) ===");
try {
  const out = inst.XuRhstZ({
    lid: "1234567890123TESTLID",
    appKey: APPKEY,
    type: "private",
  });
  console.log("XuRhstZ ->", JSON.stringify(out).slice(0, 400));
} catch (e) {
  console.log("抛错:", e.message);
}

console.log("\n=== 录到的请求 ===");
for (const r of reqs) {
  console.log(`${r.method} ${String(r.url).slice(0, 140)}`);
  for (const [k, v] of Object.entries(r.headers))
    console.log(`   H ${k}: ${String(v).slice(0, 200)}`);
  if (r.body) console.log(`   body: ${String(r.body).slice(0, 260)}`);
}
console.log(
  "\nwindow._constID_param =",
  JSON.stringify(String(win._constID_param || "").slice(0, 260)),
);
