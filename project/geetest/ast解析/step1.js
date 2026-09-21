// 文章 2.3/2.6.1/2.6.3 的等价实现：结构特征匹配 + 解密函数调用还原
// 与文章唯一差异：用 node:vm 执行解密函数前奏（文章用 eval），语义等价、无动态 eval。
const fs = require("fs");
const vm = require("vm");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generator = require("@babel/generator").default;
const path = require("path");
const baseDir = __dirname;

const js_code = fs.readFileSync(path.join(baseDir, "code.js"), "utf-8");
const ast = parser.parse(js_code, {
  tokens: true,
  sourceType: "module",
  ranges: true,
  locations: true,
});

function get_decryptFunc(ast) {
  const body = ast.program.body.slice(0, 5);
  const newAst = { type: "File", program: { type: "Program", body: body } };
  const eval_code = generator(newAst).code;
  const target_decrypt_fn = generator(body[2].expression.left).code;
  return { eval_code, target_decrypt_fn };
}
const { eval_code, target_decrypt_fn } = get_decryptFunc(ast);
const sandbox = { decodeURI, encodeURIComponent, Date, Math, JSON, console };
sandbox.self = sandbox;
sandbox.global = sandbox;
const decrypt = vm.runInNewContext(
  eval_code + "\n;(" + target_decrypt_fn + ")",
  sandbox,
);
if (typeof decrypt !== "function") {
  process.stdout.write("FATAL: 解密函数不可调用\n");
  process.exit(1);
}

// 抽样打印，供与浏览器控制台输出对照（文章 2.5 的校验方法）
const probe = [];
for (let a = 0; a < 12; a++) probe.push(`${a}->${decrypt(a)}`);

let count = 0;
const misses = [];
traverse(ast, {
  VariableDeclaration(p) {
    if (p.node.declarations.length !== 3) return;
    const d = p.node.declarations;
    if (d[0].type !== "VariableDeclarator") return;
    if (d[1].type !== "VariableDeclarator") return;
    if (d[2].type !== "VariableDeclarator") return;
    if (!d[0].init) return;
    if (d[0].init.type !== "MemberExpression") return;
    if (generator(d[0].init).code !== target_decrypt_fn) return;
    const nameA = d[0].id.name;
    const nameC = d[2].id.name;
    const bindA = p.scope.getBinding(nameA);
    const bindC = p.scope.getBinding(nameC);
    if (!bindA) misses.push("no-binding:" + nameA);
    if (!bindC) misses.push("no-binding:" + nameC);
    [bindA, bindC].forEach((bind) => {
      if (!bind) return;
      bind.referencePaths.forEach((_path) => {
        if (!_path.parentPath) return;
        if (_path.parentPath.node.type !== "CallExpression") return;
        if (_path.parentPath.node.arguments.length !== 1) return;
        if (_path.parentPath.node.arguments[0].type !== "NumericLiteral")
          return;
        const idx = _path.parentPath.node.arguments[0].value;
        const value = decrypt(idx);
        _path.parentPath.replaceInline(t.valueToNode(value));
        count++;
      });
    });
  },
});

const out = generator(ast, {
  compact: false,
  minified: false,
  comments: true,
  retainLines: false,
  jsescOption: { quotes: "single" },
}).code;
fs.writeFileSync(path.join(baseDir, "output.js"), out);
const summary = {
  target_decrypt_fn,
  replaced_calls: count,
  binding_misses: misses.length,
  output_bytes: Buffer.byteLength(out),
  sample_decrypt: probe,
};
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
