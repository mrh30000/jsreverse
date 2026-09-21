// 驱动真 SDK 的 ua 构造类, 打印每个采集器对 _ua 的贡献 -> 得到 ac 的字节装配图。
// 用法: node dx_drive_ua.js
const { load } = require("./dx_harness.js");

const { cache, win } = load();
const Cls = cache[5].exports.default;
const P = Cls.prototype;

const inst = new Cls({});
try {
  inst.init({});
} catch (e) {
  console.log("init 抛错:", e.message);
}

const order = [
  "getTM",
  "getBR",
  "getLO",
  "getCF",
  "getDI",
  "getEM",
  "getJSV",
  "getTK",
  "getSC",
];
const fakeEvent = {
  type: "mousemove",
  clientX: 100,
  clientY: 200,
  pageX: 100,
  pageY: 200,
  screenX: 100,
  screenY: 200,
  timeStamp: Date.now(),
  button: 0,
  keyCode: 13,
  which: 13,
  isTrusted: true,
  target: win.document.body,
  currentTarget: win.document.body,
  srcElement: win.document.body,
  preventDefault() {},
  stopPropagation() {},
};

function uaLen(o) {
  for (const k of ["_ua", "ua"]) {
    if (typeof o[k] === "string") return o[k].length;
  }
  const hit = Object.getOwnPropertyNames(o).find((k) => /^_?ua$/.test(k));
  return hit ? String(o[hit]).length : -1;
}
const keyOf =
  Object.getOwnPropertyNames(inst).find((k) => /^_?ua$/.test(k)) || "_ua";
console.log(
  "ua 字段名:",
  keyOf,
  " 初值长度:",
  String(inst[keyOf] || "").length,
);
console.log("实例字段:", Object.getOwnPropertyNames(inst).join(","), "\n");

const rows = [];
for (const m of order) {
  const before = String(inst[keyOf] || "").length;
  let err = "";
  try {
    const r = P[m].call(inst, fakeEvent);
    if (r !== undefined)
      rows.push([m, "返回值", JSON.stringify(r).slice(0, 60)]);
  } catch (e) {
    err = String(e.message).slice(0, 40);
  }
  const after = String(inst[keyOf] || "").length;
  console.log(
    `${m.padEnd(8)} _ua ${before} -> ${after}  ${err ? "ERR " + err : ""}`,
  );
}

console.log("\n轨迹采集器:");
for (const m of [
  "recordSA",
  "recordCA",
  "getMM",
  "getMD",
  "getKD",
  "getFO",
  "getTC",
  "getTMV",
]) {
  const before = String(inst[keyOf] || "").length;
  let err = "";
  try {
    P[m].call(inst, fakeEvent);
  } catch (e) {
    err = String(e.message).slice(0, 40);
  }
  console.log(
    `${m.padEnd(8)} _ua ${before} -> ${String(inst[keyOf] || "").length}  ${err ? "ERR " + err : ""}`,
  );
}

console.log("\napp(t, bytes) 帧格式探测:");
for (const tag of [1, 2, 3]) {
  const before = String(inst[keyOf] || "").length;
  try {
    P.app.call(inst, tag, "ABC");
  } catch (e) {
    console.log(`  app(${tag}) ERR ${e.message}`);
    continue;
  }
  const s = String(inst[keyOf]);
  console.log(
    `  app(${tag},"ABC") -> 新增 ${s.length - before} 字节, 头部码点=[${[...s.slice(before, before + 8)].map((c) => c.codePointAt(0)).join(",")}]`,
  );
}

const final = String(inst[keyOf] || "");
console.log(`\n最终 _ua 长度=${final.length}`);
console.log("前 120 字符:", JSON.stringify(final.slice(0, 120)));
