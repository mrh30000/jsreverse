# babel解混淆模板

> **作者**: zhangzetong | **发布时间**: 2024-11-15 14:58:00 | **版块**: 『编程语言区』 | **查看/回复**: 1062 / 0
> **原文**: [https://www.52pojie.cn/thread-1982161-1-1.html](https://www.52pojie.cn/thread-1982161-1-1.html)

---

[JavaScript] *纯文本查看*

```
//babel库及文件模块导入
const fs = require('fs');
const path = require('path');
const parentDir = path.join(__dirname,);
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generator = require("@babel/generator").default;

let encode_file = `源码.js`
let decodeFile = `测试.js`
let jscode = fs.readFileSync(encode_file, { encoding: "utf-8" });
let ast = parser.parse(jscode);

/////////////////////////////////////////////////////////////////////////////////////////////////

//1.首先统一字符串和数字的编码类型
const simplifyLiteral = {
  NumericLiteral({ node }) {
    if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
      node.extra = undefined;
    }
  },
  StringLiteral({ node }) {
    if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
      node.extra = undefined;
    }
  },
}
traverse(ast, simplifyLiteral);

////////////////////////////////////////////////////////////////////////////////////////////

console.timeEnd("处理完毕，耗时");
let { code } = generator(ast, opts = {
  "compact": false,  // 是否压缩代码
  "comments": false,  // 是否保留注释
  "jsescOption": { "minimal": false },  //Unicode转义
});

fs.writeFile(decodeFile, code, (err) => {
});
```
