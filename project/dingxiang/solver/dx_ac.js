// 纯算 ua/ac 组装器 + 对真 SDK 的字节级自检。
//
// 已实测确认的结构:
//   _ua = Σ ( tag 1字节 + 密文长度 2字节大端 + 密文 )          —— 每个采集器一帧
//   ua  = "s_v3#" + 自定义base64(_ua)                          —— 288B -> 384+5=389 ✓
//   密文 = encrypt_XXX(明文字节串), 每个 tag 用不同的 encrypt_*  —— 见 TAG_ENCRYPT
//
// 自检: 用真 SDK 现场抓到的 (tag, 密文) 帧重建 _ua 与 ua, 必须与 SDK 字段逐字节相同。
// 用法: node dx_ac.js
const fs = require("node:fs");
const enc = require("./dx_encrypt.js");
const { load } = require("./dx_harness.js");

// 自定义 base64 表(从 greenseer.js 提出)
const ALPHA =
  "XmYj3u1PnvisIZUF8ThR/a6DfO+kW4JHrCELycAzSxleoQp02MtwV9Nd57qGgbKB=";
const STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function b64Custom(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out +=
      ALPHA[(n >> 18) & 63] +
      ALPHA[(n >> 12) & 63] +
      ALPHA[b === undefined ? 64 : (n >> 6) & 63] +
      ALPHA[c === undefined ? 64 : n & 63];
  }
  return out;
}

/** tag -> 该帧密文; 返回 _ua 原始字节数组 */
function buildRawUa(frames) {
  const bytes = [];
  for (const { tag, cipher } of frames) {
    bytes.push(tag & 255, (cipher.length >> 8) & 255, cipher.length & 255);
    for (const ch of cipher) bytes.push(ch.codePointAt(0) & 255);
  }
  return bytes;
}

function buildUa(frames) {
  return `s_v3#${b64Custom(buildRawUa(frames))}`;
}

// ---- 自检: 拿真 SDK 现场跑的帧重建, 与 SDK 自己的 _ua / ua 比对 ----------
function selfCheck() {
  const { cache } = load();
  const Ve = cache[11].exports;
  const P = cache[5].exports.default.prototype;
  const frames = [];
  const tagMap = {};
  for (const k of Object.keys(Ve)) {
    if (!/^encrypt_/.test(k)) continue;
    const f = Ve[k];
    Ve[k] = function (x) {
      const o = f.call(this, x);
      frames.push({ enc: k, cipher: String(o) });
      return o;
    };
  }
  const realApp = P.app;
  P.app = function (t, o) {
    frames.push({ tag: t, cipher: String(o) });
    return realApp.apply(this, arguments);
  };

  const inst = new cache[5].exports.default({});
  inst.init({});

  const pairs = [];
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].tag !== undefined) {
      const e = [...frames.slice(i - 8, i)].reverse().find((f) => f.enc);
      pairs.push({
        tag: frames[i].tag,
        cipher: frames[i].cipher,
        enc: e && e.enc,
      });
    }
  }
  for (const p of pairs) if (p.enc) tagMap[p.tag] = p.enc;

  const sdkRaw = String(inst._ua);
  const mineRaw = String.fromCharCode(...buildRawUa(pairs));
  const rawOk = sdkRaw === mineRaw;
  const sdkUa = String(inst.ua);
  const mineUa = buildUa(pairs);
  const uaOk = sdkUa === mineUa;

  console.log(`抓到 ${pairs.length} 帧, _ua ${sdkRaw.length}B`);
  console.log(`帧拼接自检: ${rawOk ? "✓ 逐字节一致" : "✗ 不一致"}`);
  if (!rawOk) {
    for (let i = 0; i < Math.max(sdkRaw.length, mineRaw.length); i++) {
      if (sdkRaw[i] !== mineRaw[i]) {
        console.log(
          `  首个差异 @${i}: sdk=${sdkRaw.codePointAt(i)} mine=${mineRaw.codePointAt(i)}`,
        );
        break;
      }
    }
  }
  console.log(
    `base64 自检: ${uaOk ? "✓ 逐字节一致" : "✗ 不一致"}  (长度 ${sdkUa.length}/${mineUa.length})`,
  );
  if (!uaOk)
    console.log(
      `  sdk=${JSON.stringify(sdkUa.slice(0, 60))}\n  mine=${JSON.stringify(mineUa.slice(0, 60))}`,
    );
  console.log("\ntag -> encrypt_* :", JSON.stringify(tagMap, null, 0));
  fs.writeFileSync(
    "dingxiang/artifacts/tag-encrypt-map.json",
    JSON.stringify(tagMap, null, 1),
  );
  return rawOk && uaOk;
}

if (require.main === module) {
  const ok = selfCheck();
  process.exit(ok ? 0 : 1);
}

module.exports = { buildRawUa, buildUa, b64Custom, ALPHA };
