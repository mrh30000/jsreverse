const fs = require("fs");
const s = fs.readFileSync(__dirname + "/gcaptcha4.js", "utf8");
console.log("bytes", Buffer.byteLength(s), "lines", s.split("\n").length);
const pats = {
  "RSA modulus C1E3934D": /c1e3934d/i,
  "biht value 1426265548": /1426265548/,
  getStringByIndexes: /getStringByIndexes/,
  _lib: /_lib/,
  _abo: /_abo/,
  symmetrical: /symmetrical/,
  arrayToHex: /arrayToHex/,
  "dollar-dollar props $_Xy": /\$_[A-Za-z][A-Za-z]/,
  winlinze: /winlinze/,
  pow_msg: /pow_msg/,
  gee_guard: /gee_guard/,
  userresponse: /userresponse/,
  passtime: /passtime/,
  "Canadian syllabics U+1400-167F": /[\u1400-\u167f]/,
  "CJK compat U+3100-318F": /[\u3100-\u318f]/,
  sha256: /sha256/,
  "dQFB (article literal key)": /dQFB/,
  "BoHp (article literal val)": /BoHp/,
};
for (const [k, re] of Object.entries(pats)) {
  const g = new RegExp(
    re.source,
    re.flags.includes("g") ? re.flags : re.flags + "g",
  );
  const m = s.match(g);
  console.log(String(m ? m.length : 0).padStart(7), "  ", k);
}
const NodePath = require("@babel/traverse").NodePath;
console.log(
  "\nreplaceInline on NodePath.prototype:",
  typeof NodePath.prototype.replaceInline,
);
console.log(
  "replaceWith  on NodePath.prototype:",
  typeof NodePath.prototype.replaceWith,
);
