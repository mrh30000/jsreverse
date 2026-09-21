// 假设: -4 来自设备被标记为说谎。dump 里 hlb:true (hasLiedBrowser),
// 因为 Node 的 eval.toString().length / new Error().stack 与真浏览器不一致。
// 做法: 包住 mergeOptions, 强制翻转可疑标志位后重发, 看 status 是否变 2。
// 用法: node dx_c1_flags.js
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

function grab(overrides) {
  const { win, mods } = load();
  const CI = mods.c[7].exports.default;
  const inst = new CI({ appKey: AK, server: SERVER, cache: false });
  const real = inst.mergeOptions.bind(inst);
  inst.mergeOptions = (o) => real(Object.assign({}, o, overrides));
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
  try {
    inst.detect();
  } catch {
    /* 只取请求 */
  }
  return new Promise((r) =>
    setTimeout(
      () =>
        r(
          urls
            .map((x) => x.url)
            .filter((u) => u.includes("Param="))
            .sort((a, b) => b.length - a.length)[0] || "",
        ),
      1100,
    ),
  );
}

async function freshSession() {
  const q = new URLSearchParams({
    aid: `dx-${Date.now()}-${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}-1`,
    ak: AK,
    c: "",
    de: "0",
    h: "150",
    jsv: "v1.4.0(81)",
    lf: "0",
    m: "",
    s: "50",
    sid: "",
    tpc: "",
    uid: "",
    w: "300",
    wp: "1",
    dt: "1",
    wtf: "false",
    _r: String(Math.random()),
  });
  const j = await (
    await fetch(`https://captcha.gdtspace.com/api/a?${q}`, { headers: H })
  ).json();
  return { aid: q.get("aid"), sid: j.sid };
}

(async () => {
  const s = await freshSession();
  console.log(`新会话 aid=${s.aid}
         sid=${s.sid}`);
  const cases = [
    ["基线(不改)", {}],
    ["hlb=false", { hlb: false }],
    ["hlb=false + web 造值", { hlb: false, web: "a".repeat(32) }],
    ["+sid", { sid: s.sid }],
    ["+aid", { aid: s.aid }],
    ["+aid+sid", { aid: s.aid, sid: s.sid }],
  ];
  for (const [name, ov] of cases) {
    const url = await grab(ov);
    if (!url) {
      console.log(`${name.padEnd(24)} 没抓到请求`);
      continue;
    }
    const r = await fetch(url, { headers: H });
    const t = (await r.text()).replace(/\s+/g, " ");
    const st = (t.match(/"status":(-?\d+)/) || [])[1];
    const msg = (t.match(/"msg":"([^"]*)"/) || [])[1];
    console.log(
      `${name.padEnd(24)} param=${(url.match(/Param=([^&]*)/) || [])[1].length}  status=${st}  ${msg}`,
    );
  }
})();
