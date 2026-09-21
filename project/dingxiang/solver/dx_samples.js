// 多样本取样: 自造协议1参数 -> 下载 p1/p2 -> 写 artifacts/s<i>-*.{bin,json}
// 用法: node dx_samples.js [次数]
const fs = require("node:fs");
const AK = "90762f230adee6af3957d9a029269461";
const HOST = "https://captcha.gdtspace.com";
const H = {
  accept: "*/*",
  origin: "https://www.hb56.com",
  referer: "https://www.hb56.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const n = Number(process.argv[2] || 3);

(async () => {
  for (let i = 0; i < n; i++) {
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
    const j = await (await fetch(`${HOST}/api/a?${q}`, { headers: H })).json();
    const bg = Buffer.from(
      await (await fetch(HOST + j.p1, { headers: H })).arrayBuffer(),
    );
    const pc = Buffer.from(
      await (await fetch(HOST + j.p2, { headers: H })).arrayBuffer(),
    );
    fs.writeFileSync(`dingxiang/artifacts/s${i}-bg.bin`, bg);
    fs.writeFileSync(`dingxiang/artifacts/s${i}-piece.bin`, pc);
    fs.writeFileSync(
      `dingxiang/artifacts/s${i}.json`,
      JSON.stringify({ o: j.o, y: j.y, type: j.type, sid: j.sid }),
    );
    console.log(
      `s${i}: y=${j.y} type=${j.type} o=${j.o} bg=${bg.length}B piece=${pc.length}B`,
    );
  }
})();
