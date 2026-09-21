const fs = require("fs");
const s = fs.readFileSync(__dirname + "/output.js", "utf8");
function show(needle, before, after, max) {
  let idx = -1;
  let n = 0;
  while ((idx = s.indexOf(needle, idx + 1)) !== -1 && n < (max || 3)) {
    n++;
    console.log(`\n########## "${needle}" 命中 ${n} @${idx} ##########`);
    console.log(s.slice(Math.max(0, idx - before), idx + after));
  }
  if (!n) console.log(`\n########## "${needle}" — 0 命中 ##########`);
}
show("biht", 200, 400, 2);
show("arrayToHex", 700, 900, 2);
show("'symmetrical'", 400, 1200, 1);
