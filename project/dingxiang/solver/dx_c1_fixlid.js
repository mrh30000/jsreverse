// 假设验证: `-4 The lid is invalid` 是因为本机时钟(2026)超前服务端,
// 而 lid = Date.now() + makeLocalID(), 时间戳部分被服务端判为非法。
// 做法: 读服务端 date 头算出偏移, 在沙箱里把 Date 平移, 再跑一遍 detect()。
// 用法: node dx_c1_fixlid.js
const { load } = require("./dx_constid.js");

const AK = "90762f230adee6af3957d9a029269461";
const SERVER = "https://captcha.gdtspace.com/udid/c1";
const H = {
  accept: "*/*",
  origin: "https://www.hb56.com",
  referer: "https://www.hb56.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

async function serverDelta() {
  const r = await fetch(`${SERVER}?probe=1`, { headers: H });
  const d = r.headers.get("date");
  const srv = Date.parse(d);
  if (Number.isNaN(srv)) throw new Error(`date 头不可解析: ${d}`);
  return {
    delta: srv - Date.now(),
    serverDate: d,
    local: new Date().toISOString(),
  };
}

function run(delta) {
  const { win, mods } = load();
  // 平移沙箱时间: SDK 用 new Date().getTime() 与 Date.now() 造 lid 和 ct
  const RealDate = win.Date;
  const shifted = new RealDate(RealDate.now() + delta);
  function FakeDate(...a) {
    if (a.length === 0)
      return new RealDate(shifted.getTime() + (Date.now() - RealDate.now()));
    return new RealDate(...a);
  }
  FakeDate.now = () => shifted.getTime() + (Date.now() - RealDate.now());
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.prototype = RealDate.prototype;
  win.Date = FakeDate;

  const CI = mods.c[7].exports.default;
  const urls = [];
  const rec = () => {
    const o = { url: "" };
    urls.push(o);
    return {
      set src(v) {
        o.url = v;
      },
      get src() {
        return o.url;
      },
      addEventListener() {},
      setAttribute() {},
      appendChild() {},
      style: {},
      width: 0,
      height: 0,
      onload: null,
      onerror: null,
    };
  };
  win.Image = () => rec();
  const ce = win.document.createElement;
  win.document.createElement = (t) => {
    const e = ce(t);
    if (/script|iframe/i.test(String(t))) {
      const o = { url: "" };
      urls.push(o);
      Object.defineProperty(e, "src", {
        set(v) {
          o.url = v;
        },
        get() {
          return o.url;
        },
      });
    }
    return e;
  };

  const inst = new CI({ appKey: AK, server: SERVER, cache: false });
  try {
    inst.detect();
  } catch (e) {
    console.log("detect 抛错:", e.message);
  }
  return new Promise((res) =>
    setTimeout(
      () =>
        res(
          urls
            .map((x) => x.url)
            .filter((u) => u.includes("Param="))
            .sort((a, b) => b.length - a.length)[0] || "",
        ),
      1200,
    ),
  );
}

(async () => {
  const { delta, serverDate, local } = await serverDelta();
  console.log(`服务端 date: ${serverDate}`);
  console.log(`本机时间:    ${local}`);
  console.log(`偏移:        ${(delta / 864e5).toFixed(2)} 天 (${delta} ms)\n`);

  const url = run(delta);
  const wait = await url;
  const pm = (wait.match(/Param=([^&]*)/) || [])[1] || "";
  console.log(`校准后 param 长度 ${pm.length}`);
  const r = await fetch(wait, { headers: H });
  const txt = await r.text();
  console.log(`HTTP ${r.status} -> ${txt.replace(/\s+/g, " ").slice(0, 260)}`);
  require("node:fs").writeFileSync(
    "dingxiang/artifacts/c1-calibrated.txt",
    `delta=${delta}\nURL:\n${wait}\n\nRESP:\n${txt}\n`,
  );
})();
