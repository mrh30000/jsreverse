// 从原帖 HTML 中抽取 [code] 块，用于与本地 md 逐块对比
const fs = require("fs");
const NL = String.fromCharCode(10);
const seg = fs.readFileSync(__dirname + "/post1.raw.txt", "utf8");
const blocks = [...seg.matchAll(/<div class="blockcode">[\s\S]*?<\/div>/g)].map((m) => m[0]);

function clean(h) {
  h = h.replace(/<\/?ol[^>]*>/g, "");
  h = h.replace(/<li[^>]*>/g, NL);
  h = h.replace(/<em>\d+<\/em>/g, "");
  h = h.replace(/<\/?li>/g, "");
  h = h.replace(/<[^>]+>/g, "");
  h = h.split("&quot;").join('"').split("&#039;").join("'")
    .split("&lt;").join("<").split("&gt;").join(">").split("&amp;").join("&")
    .split("&nbsp;").join(" ");
  return h.split(NL).map((l) => l.replace(/\s+$/, "")).join(NL).replace(/^(\s*\n)+/, "").replace(/(\s*\n)+$/, "");
}

const codes = blocks.map(clean);
console.log("blockcode count =", codes.length);
codes.forEach((c, i) => {
  console.log("---- block " + i + " (" + c.split(NL).length + " lines) ----");
  console.log(c.split(NL).slice(0, 3).join("  |  "));
});
fs.writeFileSync(__dirname + "/orig_code_blocks.json", JSON.stringify(codes, null, 1));

const imgs = [...seg.matchAll(/src="([^"]*attach[^"]*\.png)"/g)].map((m) => m[1]);
console.log("attach png count =", imgs.length);
fs.writeFileSync(__dirname + "/orig_imgs.json", JSON.stringify(imgs, null, 1));

// 纯文本段落（判断作者叙述是否被爬取过程改写）
let text = seg.replace(/<div class="blockcode">[\s\S]*?<\/div>/g, "[[CODE]]");
text = text.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
text = text.replace(/<br\s*\/?>/gi, NL).replace(/<[^>]+>/g, NL);
text = text.split("&quot;").join('"').split("&#039;").join("'").split("&lt;").join("<").split("&gt;").join(">").split("&amp;").join("&").split("&nbsp;").join(" ");
text = text.split(NL).map((l) => l.trim()).filter(Boolean).join(NL);
fs.writeFileSync(__dirname + "/orig_text.txt", text);
console.log("text lines =", text.split(NL).length);
