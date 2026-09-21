// 插桩真 SDK, 打印 ac/ua 的完整装配蓝图: 每一步的 tag、用了哪个 encrypt_*、明文字节、密文长度。
// 手法: Ve(mods[11].exports) 与 P.app 都是共享对象引用, 原地包一层日志即可, 不改 SDK 源码。
// 用法: node dx_blueprint.js
const { load } = require("./dx_harness.js");

const { cache, win } = load();
const Ve = cache[11].exports;
const Cls = cache[5].exports.default;
const P = Cls.prototype;

const log = [];
let cur = "ctor";
for (const k of Object.keys(Ve)) {
  if (!/^encrypt_/.test(k)) continue;
  const f = Ve[k];
  Ve[k] = function (input) {
    const out = f.call(this, input);
    log.push({
      step: cur,
      enc: k,
      plainLen: input == null ? -1 : input.length,
      plain:
        typeof input === "string"
          ? [...input].map((c) => c.codePointAt(0))
          : null,
      outLen: out == null ? -1 : out.length,
    });
    return out;
  };
}
const realApp = P.app;
P.app = function (t, o) {
  log.push({ step: cur, tag: t, cipherLen: o == null ? -1 : o.length });
  return realApp.call(this, t, o);
};

const inst = new Cls({});
inst.init({});
const uaKey = Object.getOwnPropertyNames(inst).find((k) => /^_?ua$/.test(k));
const ev = {
  type: "mousemove",
  clientX: 120,
  clientY: 240,
  pageX: 120,
  pageY: 240,
  screenX: 120,
  screenY: 240,
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

const steps = [
  "getTM",
  "getBR",
  "getLO",
  "getCF",
  "getDI",
  "getEM",
  "getJSV",
  "getTK",
  "getSC",
  "getMM",
  "getMD",
  "getKD",
  "getFO",
  "getTC",
  "getTMV",
  "recordSA",
];
for (const m of steps) {
  cur = m;
  const before = String(inst[uaKey] || "").length;
  try {
    P[m].call(inst, ev);
  } catch (e) {
    log.push({ step: m, err: String(e.message).slice(0, 40) });
    continue;
  }
  log.push({ step: m, uaDelta: String(inst[uaKey] || "").length - before });
}

console.log("=== ac/ua 装配蓝图 ===");
for (const r of log) {
  const bits = Object.entries(r)
    .filter(([, v]) => v !== undefined)
    .map(
      ([k, v]) =>
        `${k}=${Array.isArray(v) && v.length > 12 ? v.slice(0, 12).join(",") + "…" : v}`,
    )
    .join("  ");
  console.log(" ", bits);
}
console.log("\n=== 最终 ua ===");
const ua = String(inst[uaKey] || "");
console.log("长度", ua.length, "前缀", JSON.stringify(ua.slice(0, 12)));
console.log(JSON.stringify(ua.slice(0, 200)));
console.log("\n=== app 内部按 tag 建的索引表 ===");
for (const k of Object.getOwnPropertyNames(inst)) {
  const v = inst[k];
  if (
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v).length &&
    Object.keys(v).length < 16
  ) {
    console.log(" ", k, "=", JSON.stringify(v).slice(0, 200));
  }
}
