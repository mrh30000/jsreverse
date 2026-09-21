// Protocol 1 (顶象 /api/a init) replay with locally generated params.
// Article claim under test: only aid (dx-<13-digit-ts>-<random8>-<t>), ak (fixed) and _r (Math.random)
// are generated; everything else is static per integration.
const AK = "90762f230adee6af3957d9a029269461";
const HOST = "https://captcha.gdtspace.com";

function aid(t = 1) {
  return `dx-${Date.now()}-${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}-${t}`;
}

async function init(c = "") {
  const q = new URLSearchParams({
    aid: aid(),
    ak: AK,
    c,
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
  const r = await fetch(`${HOST}/api/a?${q}`, {
    headers: {
      accept: "*/*",
      origin: "https://www.hb56.com",
      referer: "https://www.hb56.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  return { status: r.status, body: await r.text() };
}

(async () => {
  for (const c of ["", "6a9d9c2agNsItl5bbeuTvdfVxyepRCdkUeNzVQP1"]) {
    const res = await init(c);
    console.log(`\n### c=${c || "(empty)"} -> HTTP ${res.status}`);
    console.log(res.body.slice(0, 700));
  }
})();
