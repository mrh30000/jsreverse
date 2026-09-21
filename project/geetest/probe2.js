const fs = require("fs");
const parser = require("@babel/parser");
const generator = require("@babel/generator").default;
const t = require("@babel/types");

const code = fs.readFileSync(__dirname + "/gcaptcha4.js", "utf8");
const ast = parser.parse(code, {
  tokens: true,
  sourceType: "module",
  ranges: true,
  locations: true,
});
const body = ast.program.body;
console.log("program.body length:", body.length);
body.slice(0, 8).forEach((n, i) => {
  const src = generator(n).code;
  console.log(
    `\n===== body[${i}]  type=${n.type}  chars=${src.length}  line=${n.loc && n.loc.start.line} =====`,
  );
  console.log(
    src.length > 1500 ? src.slice(0, 1500) + "\n...[truncated]" : src,
  );
});
