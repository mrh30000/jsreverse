/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const {createSandbox} = require('./sandbox-evaluator');

// 1. keyToLiteral: obj.key -> obj["key"]
function keyToLiteral(ast) {
  let changed = false;
  traverse(ast, {
    MemberExpression: {
      exit(pathNode) {
        const node = pathNode.node;
        if (!node.computed && t.isIdentifier(node.property)) {
          node.property = t.stringLiteral(node.property.name);
          node.computed = true;
          changed = true;
        }
      },
    },
    ObjectProperty: {
      exit(pathNode) {
        const node = pathNode.node;
        if (!node.computed && t.isIdentifier(node.key)) {
          node.key = t.stringLiteral(node.key.name);
          node.shorthand = false;
          changed = true;
        }
      },
    },
  });
  return changed;
}

// 2. varDeclarToFuncDeclar: var f = function() {} -> function f() {}
function varDeclarToFuncDeclar(ast) {
  let changed = false;
  traverse(ast, {
    VariableDeclarator(pathNode) {
      const {node, parentPath} = pathNode;
      if (parentPath.parentPath?.isFor() || !t.isIdentifier(node.id)) return;
      if (!t.isFunctionExpression(node.init, {id: null})) return;
      // 同名声明若含多个 declarator（var f = function(){}, g = 1;），
      // 整体替换为 FunctionDeclaration 会丢失同级绑定；仅替换单 declarator。
      if (parentPath.node.declarations.length !== 1) return;
      // 单语句位置（while/for/if 体）不允许 function 声明，替换后会产出
      // `while (x) function f() {}` 这类非法语法。仅语句列表位置才转换。
      if (
        !parentPath.parentPath.isBlockStatement() &&
        !parentPath.parentPath.isProgram()
      ) {
        return;
      }

      const {params, body} = node.init;
      const newNode = t.functionDeclaration(node.id, params, body);
      parentPath.replaceWith(newNode);
      changed = true;
      pathNode.scope.crawl();
    },
  });
  return changed;
}

// 3. declaratorToDeclaration: var a = 1, b = 2; -> var a = 1; var b = 2;
function declaratorToDeclaration(ast) {
  let changed = false;
  traverse(ast, {
    VariableDeclaration(pathNode) {
      const {node, parentPath} = pathNode;
      if (parentPath.parentPath?.isFor()) return;
      // replaceWithMultiple 仅在语句列表位置合法；作为 if/循环体的单语句
      // 位置时会抛异常并导致整个 pass 失败，直接跳过。
      if (!parentPath.isBlockStatement() && !parentPath.isProgram()) return;
      const {declarations, kind} = node;
      if (declarations.length <= 1) return;

      const newDeclarations = declarations.map(decl =>
        t.variableDeclaration(kind, [decl]),
      );
      pathNode.replaceWithMultiple(newDeclarations);
      changed = true;
    },
  });
  return changed;
}

// 4. deleteRepeatDefine: var alias = orig -> rename alias to orig
function hasShadowedName(binding, origName) {
  // rename 会把 alias 的所有引用改名为 origName；若某条引用所在的嵌套作用域
  // 已声明同名 origName，改名会产生变量捕获，改写语义。
  return binding.referencePaths.some(refPath => {
    let scope = refPath.scope;
    while (scope && scope !== binding.scope) {
      if (scope.hasOwnBinding(origName)) return true;
      scope = scope.parent;
    }
    return false;
  });
}

function deleteRepeatDefine(ast) {
  let changed = false;
  traverse(ast, {
    VariableDeclarator(pathNode) {
      const {id, init} = pathNode.node;
      if (!t.isIdentifier(id) || !t.isIdentifier(init)) return;

      const aliasName = id.name;
      const origName = init.name;
      const binding = pathNode.scope.getBinding(aliasName);
      // rename 会把 alias 的引用改名为来源变量；若来源变量在 alias 声明之后
      // 被重新赋值，折叠后引用会拿到新值（var b=1; var a=b; b=3; use(a)）。
      const sourceBinding = pathNode.scope.getBinding(origName);

      if (
        binding &&
        binding.constant &&
        (sourceBinding === undefined || sourceBinding.constant) &&
        !hasShadowedName(binding, origName)
      ) {
        pathNode.scope.rename(aliasName, origName);
        pathNode.remove();
        changed = true;
      }
    },
  });
  return changed;
}

// 5. preDecodeObject: merge obj["key"] = val into var obj = { key: val }
function preDecodeObject(ast) {
  let changed = false;
  traverse(ast, {
    VariableDeclarator(pathNode) {
      const {id, init} = pathNode.node;
      if (!t.isIdentifier(id) || !t.isObjectExpression(init)) return;

      const name = id.name;
      const properties = init.properties;
      const parentPath = pathNode.parentPath;
      const allNextSiblings = parentPath.getAllNextSiblings();

      if (!allNextSiblings || allNextSiblings.length === 0) return;

      // 先收集可合并的兄弟语句再统一删除：边遍历 getNextSiblings 快照边
      // remove 会让后续 sibling 路径的 key/listKey 失效。
      const merged = [];
      for (const nextSibling of allNextSiblings) {
        if (!nextSibling.isExpressionStatement()) break;
        const expr = nextSibling.get('expression');
        if (!expr.isAssignmentExpression({operator: '='})) break;

        const {left, right} = expr.node;
        if (!t.isMemberExpression(left)) break;

        const {object, property} = left;
        if (
          !t.isIdentifier(object, {name}) ||
          (!t.isStringLiteral(property) && !t.isIdentifier(property))
        ) {
          break;
        }

        // 仅静态字面量可安全前移：把带副作用的表达式提前到对象字面量位置
        // 会改变求值顺序；引用更早语句的标识符也会拿到未定义值。
        if (!t.isLiteral(right) || t.isTemplateLiteral(right)) break;

        merged.push({nextSibling, property, right});
      }

      for (const {nextSibling, property, right} of merged) {
        const propKey = t.isStringLiteral(property)
          ? property
          : t.stringLiteral(property.name);
        properties.push(t.objectProperty(propKey, right));
        nextSibling.remove();
        changed = true;
      }
    },
  });
  return changed;
}

// 6. deleteObfuscatorCode: remove anti-debugger / console traps / setInterval traps
// babel traverse 只接受 Program/File 根节点（或需要 scope/parentPath），
// 对函数体子树检测时包一层 File/Program。
function traverseSubtree(node, visitors) {
  let statements;
  if (t.isProgram(node)) statements = node.body;
  else if (t.isBlockStatement(node)) statements = node.body;
  else if (t.isStatement(node)) statements = [node];
  else statements = [];
  // 表达式等非语句节点用表达式语句包裹，保证 Program 只含 Statement。
  if (statements.length === 0) statements = [t.expressionStatement(node)];
  traverse(t.file(t.program(statements)), visitors);
}

function containsDebuggerStatement(node) {
  if (!node) return false;
  let found = false;
  traverseSubtree(node, {
    DebuggerStatement(pathNode) {
      found = true;
      pathNode.stop();
    },
  });
  return found;
}

function containsDebuggerTrap(node) {
  if (!node) return false;
  let found = false;
  traverseSubtree(node, {
    CallExpression(pathNode) {
      if (isDebuggerConstructorCall(pathNode.node)) {
        found = true;
        pathNode.stop();
      }
    },
    NewExpression(pathNode) {
      if (isDebuggerConstructorCall(pathNode.node)) {
        found = true;
        pathNode.stop();
      }
    },
  });
  return found;
}

function isDebuggerConstructorCall(node) {
  if (!t.isCallExpression(node) && !t.isNewExpression(node)) return false;
  const {callee, arguments: args} = node;

  const isConstructor =
    t.isIdentifier(callee, {name: 'Function'}) ||
    (t.isMemberExpression(callee) &&
      (t.isIdentifier(callee.property, {name: 'constructor'}) ||
        t.isStringLiteral(callee.property, {value: 'constructor'})) &&
      (t.isFunctionExpression(callee.object) ||
        t.isArrowFunctionExpression(callee.object) ||
        t.isIdentifier(callee.object, {name: 'Function'})));
  if (!isConstructor) return false;

  const staticArgs = args.filter(arg => !t.isSpreadElement(arg));
  return (
    staticArgs.length > 0 &&
    staticArgs.every(
      arg => t.isStringLiteral(arg) && /debugger/i.test(arg.value),
    )
  );
}

function deleteObfuscatorCode(ast) {
  let changed = false;
  traverse(ast, {
    CallExpression(pathNode) {
      const {callee, arguments: args} = pathNode.node;
      if (t.isIdentifier(callee, {name: 'setInterval'})) {
        if (args.length === 2 && t.isFunctionExpression(args[0])) {
          // 按 AST 形状匹配反调试陷阱，避免 `obj.constructor` /
          // `class A { constructor(){} }` 等合法代码因字符串包含 constructor
          // 而被误删（setInterval 删除会静默改变程序行为）。检查包裹的
          // 反调试调用或回调体内是否直接含 debugger 语句。
          if (
            containsDebuggerStatement(args[0].body) ||
            containsDebuggerTrap(args[0].body)
          ) {
            pathNode.remove();
            changed = true;
            return;
          }
        }
        return;
      }

      // 经典反调试陷阱形如 `(function(){return false;}).constructor("debugger")()`
      // 或 `Function("debugger")()`：按 AST 形状匹配，避免误删只是提到
      // debugger/RegExp/chain 字样的正常语句。
      if (isDebuggerConstructorCall(pathNode.node)) {
        // 陷阱可能是链式调用的一环（`.constructor("debugger").call()` /
        // `["call"]()`），向上找到包含它的最外层调用，避免只删内层节点后
        // 留下指向空节点的 MemberExpression。
        let top = pathNode;
        let next = top.parentPath;
        while (
          next &&
          (next.isMemberExpression({object: top.node}) ||
            next.isCallExpression({callee: top.node}))
        ) {
          top = next;
          next = top.parentPath;
        }

        if (top.parentPath.isExpressionStatement()) {
          top.parentPath.remove();
        } else {
          top.replaceWith(t.unaryExpression('void', t.numericLiteral(0)));
        }
        changed = true;
      }
    },
  });
  return changed;
}

// 基于 AST 形状（标识符 / StringLiteral 数组）筛选 helper：用生成后文本的
// 子串判断（如 `_0x`）会把恰好引用混淆函数名的无关声明也丢进同一沙箱执行，
// 若其中有副作用语句会意外触发或抛错，导致整个 helper 加载失败。
function isObfuscatorHelperDecl(decl) {
  if (!t.isIdentifier(decl.id)) return false;
  if (/^_0x[a-z0-9]+$/i.test(decl.id.name)) return true;
  if (t.isIdentifier(decl.init)) return /^_0x[a-z0-9]+$/i.test(decl.init.name);
  return false;
}

function isObfuscatorHelperFunction(stmt) {
  if (!t.isFunctionDeclaration(stmt) || !stmt.id) return false;
  if (/^_0x[a-z0-9]+$/i.test(stmt.id.name)) return true;
  // 无返回值形态的解码函数：函数体内含对字符串数组的索引访问。
  let returnsIndexed = false;
  traverseSubtree(stmt, {
    ReturnStatement(pathNode) {
      const arg = pathNode.node.argument;
      if (t.isMemberExpression(arg)) {
        returnsIndexed = true;
        pathNode.stop();
      }
    },
  });
  return returnsIndexed;
}

function hasXHexString(node) {
  let found = false;
  traverseSubtree(node, {
    StringLiteral(pathNode) {
      if (pathNode.node.extra && /\\x/i.test(pathNode.node.extra.raw)) {
        found = true;
        pathNode.stop();
      }
    },
  });
  return found;
}

// 7. callExpressToLiteral: 沙箱动态求值还原混淆字符串函数
function callExpressToLiteral(ast, options = {}) {
  let changed = false;
  const timeoutMs = options.timeoutMs || 1000;

  // 收集顶层数组与解码函数
  const helperCodes = [];
  const helperNames = new Set();

  for (const stmt of ast.program.body) {
    if (t.isVariableDeclaration(stmt)) {
      const isHelper = stmt.declarations.some(isObfuscatorHelperDecl);
      const hasHexString =
        !isHelper &&
        stmt.declarations.some(decl => decl.init && hasXHexString(decl.init));
      if (isHelper || hasHexString) {
        helperCodes.push(generator(stmt, {compact: true}).code);
        for (const decl of stmt.declarations) {
          if (t.isIdentifier(decl.id)) helperNames.add(decl.id.name);
        }
      }
    } else if (t.isFunctionDeclaration(stmt) && stmt.id) {
      if (isObfuscatorHelperFunction(stmt)) {
        helperCodes.push(generator(stmt, {compact: true}).code);
        helperNames.add(stmt.id.name);
      }
    } else if (
      t.isExpressionStatement(stmt) &&
      t.isCallExpression(stmt.expression)
    ) {
      const code = generator(stmt, {compact: true}).code;
      if (code.includes('push') && code.includes('shift')) {
        helperCodes.push(code);
      }
    }
  }

  if (helperCodes.length === 0 || helperNames.size === 0) return false;

  // 复用 sandbox-evaluator 的 createSandbox：统一全局能力集（含 Map/Set/Symbol 等），
  // 并沿用其「vm 不是安全边界，仅用于本地可信样本」的边界约定。
  const context = createSandbox();

  try {
    new vm.Script(helperCodes.join(';\n')).runInContext(context, {
      timeout: timeoutMs,
    });
  } catch {
    return false;
  }

  // 单次解码调用通常比 helper 加载快，默认给更小的预算，可由调用方覆盖。
  const callTimeoutMs = options.callTimeoutMs || 200;

  traverse(ast, {
    CallExpression(pathNode) {
      const callee = pathNode.node.callee;
      if (!t.isIdentifier(callee)) return;
      if (!helperNames.has(callee.name)) return;

      const args = pathNode.node.arguments;
      const allStatic = args.every(
        arg =>
          t.isStringLiteral(arg) ||
          t.isNumericLiteral(arg) ||
          (t.isUnaryExpression(arg, {operator: '-'}) &&
            t.isNumericLiteral(arg.argument)),
      );
      if (!allStatic) return;

      const callCode = generator(pathNode.node, {compact: true}).code;
      try {
        const val = new vm.Script(callCode).runInContext(context, {
          timeout: callTimeoutMs,
        });
        if (typeof val === 'string') {
          pathNode.replaceWith(t.stringLiteral(val));
          changed = true;
        } else if (typeof val === 'number' && Number.isFinite(val)) {
          pathNode.replaceWith(t.numericLiteral(val));
          changed = true;
        } else if (typeof val === 'boolean') {
          pathNode.replaceWith(t.booleanLiteral(val));
          changed = true;
        }
      } catch {
        // ignore failed individual evaluations
      }
    },
  });

  return changed;
}

function runBabelPackPasses(code, options = {}) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });

    let passChanged = false;

    // 运行结构标准化与展开
    passChanged = keyToLiteral(ast) || passChanged;
    passChanged = declaratorToDeclaration(ast) || passChanged;
    passChanged = varDeclarToFuncDeclar(ast) || passChanged;
    passChanged = preDecodeObject(ast) || passChanged;
    passChanged = deleteRepeatDefine(ast) || passChanged;
    passChanged = deleteObfuscatorCode(ast) || passChanged;

    // 运行动态求值与内联
    if (options.callExpress !== false) {
      passChanged = callExpressToLiteral(ast, options) || passChanged;
    }

    return {
      success: true,
      changed: passChanged,
      code: generator(ast, {
        compact: false,
        comments: false,
        jsescOption: {minimal: true},
      }).code,
    };
  } catch (err) {
    return {
      success: false,
      changed: false,
      code,
      error: err.message,
    };
  }
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    process.stderr.write(
      'Usage: node babelpack-enhancer-pass.js <input.js> <output.js>\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const result = runBabelPackPasses(raw);
  if (!result.success) {
    process.stderr.write(
      `Warning: BabelPack passes failed (${result.error})\n`,
    );
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
  fs.writeFileSync(path.resolve(outputPath), result.code, 'utf8');
}

module.exports = {
  runBabelPackPasses,
  keyToLiteral,
  varDeclarToFuncDeclar,
  declaratorToDeclaration,
  deleteRepeatDefine,
  preDecodeObject,
  deleteObfuscatorCode,
  callExpressToLiteral,
};
