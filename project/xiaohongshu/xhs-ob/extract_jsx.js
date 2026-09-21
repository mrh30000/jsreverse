// 从 52pojie 原帖 HTML 抽取 <pre><code class="language-jsx"> 代码块，供与本地 md 逐块比对
const fs = require("fs");
const NL = String.fromCharCode(10);
const html = fs.readFileSync(__dirname + "/post1.raw.txt", "utf8");

const blocks = [...html.matchAll(/<pre><code class="language-jsx">([\s\S]*?)<\/code><\/pre>/g)].map((m) => m[1]);

function clean(h) {
  return h
    .replace(/<br\s*\/?>/g, NL)
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .split(NL)
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join(NL)
    .replace(/^(\s*\n)+/, "")
    .replace(/(\s*\n)+$/, "");
}

const codes = blocks.map(clean);
console.log("language-jsx block count =", codes.length);
codes.forEach((c, i) => {
  const head = c.split(NL).slice(0, 1).join("");
  console.log(`${String(i).padStart(2)}: ${String(c.split(NL).length).padStart(3)} lines | ${head.slice(0, 70)}`);
});
fs.writeFileSync(__dirname + "/orig_jsx_blocks.json", JSON.stringify(codes, null, 1));
