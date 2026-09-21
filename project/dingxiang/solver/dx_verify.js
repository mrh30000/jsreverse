// 第 4 步 verify 外层: 从 basic-captcha-js.js.orig @39700-41200 实抄的参数装配。
//
// 实测源码(已去混淆变量名):
//   E = typeNum(= init 的 type), B = Math.round(disx) + (0===E ? 10 : 0), T = Math.round(y||0)
//   A.sendSA(); A.sendTemp(sd ? JSON({x,y,speed,dt}) : "x="+B+"&y="+T+("&speed="+..))
//   R = {ac: A.getUA(), ak, c: p(t), uid, jsv, sid, aid, x: B, y: T}   // 可选 code
//   POST(api_verify = server + "/api/v1", {body: R})
//   移动端(isDown)不 POST, token = getUA().replace(/#/,"=").replace(/\+/g,"-").replace(/\//g,"_")
//
// 结论: ac 就是 ua 本身, 没有额外算法 —— 复用 dx_ac.js 已字节验证的 ua。
// 用法: node dx_verify.js
const { b64Custom } = require("./dx_ac.js");

/** typeNum==0 才有 10px 初始偏移 */
function verifyX(disx, typeNum) {
  return Math.round(disx) + (typeNum === 0 ? 10 : 0);
}

/** 实际滑动距离 -> 图上 0 到缺口的距离 (文章: actual=(disx-10)/speed) */
function slideDistance(gapX, speed, typeNum) {
  const off = typeNum === 0 ? 10 : 0;
  return Math.floor((gapX - off) / speed);
}

/** 移动端分支的 URL-safe token */
function tokenFromUa(ua) {
  return ua.replace(/#/g, "=").replace(/\+/g, "-").replace(/\//g, "_");
}

function verifyBody(o) {
  const r = {
    ac: o.ac,
    ak: o.ak,
    c: o.c,
    uid: o.uid,
    jsv: o.jsv,
    sid: o.sid,
    aid: o.aid,
    x: verifyX(o.disx, o.typeNum),
    y: Math.round(o.y || 0),
  };
  if (o.code) r.code = o.code;
  return r;
}

// ---- 自检 -------------------------------------------------------------
function selfCheck() {
  let fails = 0;
  const chk = (name, cond, detail) => {
    console.log(`${cond ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
    if (!cond) fails++;
  };

  // 1) x 公式: type=0 加 10, 其它不加
  chk(
    "x 公式 type=0",
    verifyX(63, 0) === 73,
    `verifyX(63,0)=${verifyX(63, 0)}`,
  );
  chk(
    "x 公式 type!=0",
    verifyX(63, 1) === 63,
    `verifyX(63,1)=${verifyX(63, 1)}`,
  );
  chk(
    "x 四舍五入",
    verifyX(62.6, 0) === 73,
    `verifyX(62.6,0)=${verifyX(62.6, 0)}`,
  );

  // 2) 端到端链路: 缺口 x -> 实际滑动距离 -> 上传 x 必须回到缺口 x (speed=1)
  const actual = slideDistance(73, 1.0, 0);
  chk(
    "链路自洽 speed=1",
    verifyX(actual, 0) === 73,
    `actual=${actual} -> 上传=${verifyX(actual, 0)}`,
  );
  // speed 让上传值经服务端 *speed+10 反推时只能近似回到缺口(floor 丢精度), 断言往返误差 <=1
  for (const sp of [0.9, 1.0, 1.2]) {
    const up = verifyX(slideDistance(73, sp, 0), 0);
    const back = (up - 10) * sp + 10;
    chk(
      `往返 speed=${sp}`,
      Math.abs(back - 73) <= 1,
      `上传=${up} 反推=${back.toFixed(1)} 误差=${Math.abs(back - 73).toFixed(1)}`,
    );
  }

  // 3) token 变换: 首个 # -> =, 且 + / 全部消失; 长度不变
  const bytes = buildUaBytes();
  const ua = `s_v3#${b64Custom(bytes)}`;
  const tok = tokenFromUa(ua);
  chk(
    "token 无 +/ 残留",
    !/[+/]/.test(tok),
    `样例尾部=${JSON.stringify(tok.slice(-24))}`,
  );
  chk(
    "token 首个 # 变 =",
    tok.startsWith("s_v3=") && !tok.slice(5).includes("#"),
    JSON.stringify(tok.slice(0, 12)),
  );
  chk(
    "token 长度不变",
    tok.length === ua.length,
    `${tok.length}==${ua.length}`,
  );

  // 4) verify body: disx 传的是「实际滑动距离」, 不是图上缺口 x
  const body = verifyBody({
    ac: ua,
    ak: "AK",
    c: "C",
    uid: "",
    jsv: "v1.4.0(81)",
    sid: "S",
    aid: "A",
    disx: slideDistance(73, 1.0, 0),
    y: 35,
    typeNum: 0,
  });
  const want = ["ac", "ak", "c", "uid", "jsv", "sid", "aid", "x", "y"];
  chk(
    "body 字段集",
    JSON.stringify(Object.keys(body).sort()) ===
      JSON.stringify(want.slice().sort()),
    Object.keys(body).join(","),
  );
  chk(
    "body.x = round(actual)+10",
    body.x === 73 && body.y === 35,
    `x=${body.x} y=${body.y}`,
  );

  console.log(fails ? `\n${fails} 项失败` : "\n全部通过");
  return fails === 0;
}

function buildUaBytes() {
  // 造几帧真实结构的字节, 只为检验 base64 -> URL-safe 的可逆性
  const frames = [
    { tag: 1, cipher: "abcdefgh" },
    { tag: 6, cipher: "x" },
    { tag: 7, cipher: "ABCD" },
  ];
  const out = [];
  for (const f of frames) {
    out.push(f.tag & 255, (f.cipher.length >> 8) & 255, f.cipher.length & 255);
    for (const ch of f.cipher) out.push(ch.codePointAt(0) & 255);
  }
  return out;
}

if (require.main === module) process.exit(selfCheck() ? 0 : 1);

// 真实样本上的 x 预演
module.exports = { verifyX, slideDistance, tokenFromUa, verifyBody, selfCheck };
