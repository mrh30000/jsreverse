const fs = require("fs");
const s = fs.readFileSync(__dirname + "/output.js", "utf8");
function show(needle, before, after, max) {
  let idx = -1;
  let n = 0;
  while ((idx = s.indexOf(needle, idx + 1)) !== -1 && n < (max || 2)) {
    n++;
    console.log(`\n##### "${needle}" #${n} @${idx} #####`);
    console.log(s.slice(Math.max(0, idx - before), idx + after));
  }
  if (!n) console.log(`\n##### "${needle}" 0 命中 #####`);
}
show("'pow_msg'", 1500, 300, 1);
show("'guid'", 200, 700, 1);
show("MIGf", 100, 500, 1);
show("'modulus'", 200, 400, 1);
show("arrayToHex", 60, 80, 3);
