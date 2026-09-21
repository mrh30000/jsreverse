const fs = require("fs");
const s = fs.readFileSync(__dirname + "/output.js", "utf8");
const marks = {
  _lib_marker: "\\['_lib'\\]",
  _abo_marker: "\\['lib'\\]\\['_abo'\\]",
  biht_1426265548: "1426265548",
  getStringByIndexes: "getStringByIndexes",
  dQFB: "dQFB",
  BoHp: "BoHp",
  rsa_modulus_C1E3934D: "(?i)C1E3934D",
  underscore_join: "\\+_?[\"']_[\"']",
  pow_msg: "pow_msg",
  sha256: "[Ss][Hh][Aa]256",
  MD5: "MD5",
  slice_expr: "n\\\\[5:7\\\\]",
};
for (const [k, src] of Object.entries(marks)) {
  let re;
  try {
    re = new RegExp(src, "g");
  } catch (e) {
    console.log("bad", k);
    continue;
  }
  const m = s.match(re);
  console.log(String(m ? m.length : 0).padStart(6), "  ", k);
}
const i = s.indexOf("['_lib']");
console.log("\n===== 定位 _lib 片段（含前后各 350 字符）=====");
if (i >= 0) console.log(s.slice(Math.max(0, i - 350), i + 900));
const j = s.indexOf("getStringByIndexes");
console.log("\n===== 定位 getStringByIndexes 片段 =====");
if (j >= 0) console.log(s.slice(Math.max(0, j - 200), j + 1100));
