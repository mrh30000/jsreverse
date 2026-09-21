/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

function getPropertyKey(node) {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return String(node.value);
  if (t.isIdentifier(node)) return node.name;
  return null;
}

/**
 * 解析成员访问的静态键。非计算属性恒为静态；计算属性仅接受字面量键，
 * 变量键（obj[k]）是动态查找，不能按变量名当成属性名解析。
 */
function getStaticMemberKey(member) {
  if (!member.computed) return getPropertyKey(member.property);
  if (
    t.isStringLiteral(member.property) ||
    t.isNumericLiteral(member.property)
  ) {
    return getPropertyKey(member.property);
  }
  return null;
}

function extractDescriptor(valueNode) {
  // 1. 字面量
  if (
    t.isStringLiteral(valueNode) ||
    t.isNumericLiteral(valueNode) ||
    t.isBooleanLiteral(valueNode)
  ) {
    return {type: 'literal', node: t.cloneNode(valueNode)};
  }

  // 2. 包装函数
  if (
    t.isFunctionExpression(valueNode) ||
    t.isArrowFunctionExpression(valueNode)
  ) {
    const params = valueNode.params;
    const paramName = index => {
      const p = params[index];
      return t.isIdentifier(p) ? p.name : null;
    };
    // 操作数必须按形参顺序引用自身形参：非交换运算（a - b）交换操作数会
    // 改变结果，引用外层变量（a + outer）会丢引用。
    const isOrderedParams = (left, right) =>
      t.isIdentifier(left) &&
      t.isIdentifier(right) &&
      left.name === paramName(0) &&
      right.name === paramName(1);

    let bodyExpr = null;
    if (t.isBlockStatement(valueNode.body)) {
      // 仅当函数体只包含单条 return 时才视为纯包装器，
      // 否则前置/后置语句的副作用（日志、赋值、守卫）会在折叠时被丢弃。
      if (
        valueNode.body.body.length === 1 &&
        t.isReturnStatement(valueNode.body.body[0]) &&
        valueNode.body.body[0].argument
      ) {
        bodyExpr = valueNode.body.body[0].argument;
      }
    } else {
      bodyExpr = valueNode.body;
    }

    if (!bodyExpr) return null;

    // 二元运算: function(a, b) { return a + b; }
    if (
      t.isBinaryExpression(bodyExpr) &&
      isOrderedParams(bodyExpr.left, bodyExpr.right)
    ) {
      return {type: 'binary', operator: bodyExpr.operator};
    }

    // 逻辑运算: function(a, b) { return a && b; }
    if (
      t.isLogicalExpression(bodyExpr) &&
      isOrderedParams(bodyExpr.left, bodyExpr.right)
    ) {
      return {type: 'logical', operator: bodyExpr.operator};
    }

    // 一元运算: function(a) { return !a; }
    if (
      t.isUnaryExpression(bodyExpr) &&
      t.isIdentifier(bodyExpr.argument) &&
      bodyExpr.argument.name === paramName(0)
    ) {
      return {
        type: 'unary',
        operator: bodyExpr.operator,
        prefix: bodyExpr.prefix !== false,
      };
    }

    // 调用包装: function(fn, ...args) { return fn(...args); }
    // callee 必须是自身形参，实参必须是自身剩余参数展开，
    // 否则会折叠出错误的调用目标（function(a){ return util(a); }）。
    if (t.isCallExpression(bodyExpr) && t.isIdentifier(bodyExpr.callee)) {
      const isOwnParam = params.some(
        p => t.isIdentifier(p) && p.name === bodyExpr.callee.name,
      );
      const spread = bodyExpr.arguments[0];
      const isRestSpread =
        bodyExpr.arguments.length === 1 &&
        t.isSpreadElement(spread) &&
        t.isIdentifier(spread.argument) &&
        params.some(
          p =>
            t.isRestElement(p) &&
            t.isIdentifier(p.argument) &&
            p.argument.name === spread.argument.name,
        );
      if (isOwnParam && isRestSpread) return {type: 'call'};
    }
  }

  return null;
}

/**
 * 逻辑折叠会短路求值，仅当实参无副作用（标识符/字面量）时才安全，
 * 否则 `f(a, sideEffect())` 折叠为 `a && sideEffect()` 会丢掉副作用。
 */
function isSideEffectFreeArg(node) {
  return t.isIdentifier(node) || t.isLiteral(node);
}

/**
 * 同一份混淆产物中多处局部作用域会各自生成同名的 dispatcher 对象
 * （var _0xobj = {...} 在每个函数里重复出现）。仅按名字索引会让后出现的
 * 对象覆盖先前的条目，把 A 作用域的调用折叠成 B 作用域的描述符。
 * 因此按名字存条目列表，查找时用作用域 binding 精确匹配。
 */
function findDescriptor(wrapperObjects, name, refPath) {
  const entries = wrapperObjects.get(name);
  if (!entries) return null;
  const binding = refPath.scope.getBinding(name);
  for (const entry of entries) {
    if (entry.binding === binding) return entry.propMap;
  }
  return null;
}

/**
 * 判断成员表达式是否位于赋值左值/自增/delete 目标的基对象链上。
 * 只检查直接 parent 会漏掉 `_0xobj['msg'].foo = 1` / `_0xobj['msg']++`
 * 这类嵌套目标：折叠后会产生 `"str".foo = 1` 的非法赋值。
 */
function isAssignTargetBase(pathNode) {
  let node = pathNode;
  let parent = pathNode.parentPath;
  while (parent) {
    const isMember =
      parent.isMemberExpression({object: node.node}) ||
      (typeof parent.isOptionalMemberExpression === 'function' &&
        parent.isOptionalMemberExpression({object: node.node}));
    if (!isMember) break;
    node = parent;
    parent = node.parentPath;
  }
  if (!parent) return false;
  return (
    parent.isAssignmentExpression({left: node.node}) ||
    parent.isUpdateExpression({argument: node.node}) ||
    parent.isUnaryExpression({operator: 'delete', argument: node.node})
  );
}

function foldWrappers(code) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });

    let totalFolded = 0;
    // objName -> Array<{propMap: Map, declPath: Path, binding}>
    const wrapperObjects = new Map();

    // 1. 收集定义在顶层或块作用域中的 dispatcher 对象
    traverse(ast, {
      VariableDeclarator(pathNode) {
        const {id, init} = pathNode.node;
        if (!t.isIdentifier(id) || !t.isObjectExpression(init)) return;

        const objName = id.name;
        const propMap = new Map();

        for (const prop of init.properties) {
          if (!t.isObjectProperty(prop)) continue;
          const key = getPropertyKey(prop.key);
          if (key === null) continue;

          const desc = extractDescriptor(prop.value);
          if (desc) {
            propMap.set(key, desc);
          }
        }

        if (propMap.size > 0) {
          const entries = wrapperObjects.get(objName) || [];
          entries.push({
            propMap,
            declPath: pathNode,
            binding: pathNode.scope.getBinding(objName),
          });
          wrapperObjects.set(objName, entries);
        }
      },
    });

    // 2. 遍历 AST 进行调用折叠与字面量内联
    traverse(ast, {
      // 2.1 函数调用形式: _0xobj['add'](a, b)
      CallExpression(pathNode) {
        const callee = pathNode.node.callee;
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.object))
          return;

        const objName = callee.object.name;
        const propMap = findDescriptor(wrapperObjects, objName, pathNode);
        if (!propMap) return;

        const key = getStaticMemberKey(callee);
        if (key === null) return;

        const desc = propMap.get(key);
        if (!desc) return;

        const args = pathNode.node.arguments;

        // 实参个数必须与包装器形参完全一致：多出的实参会在折叠时被丢弃，
        // 从而丢掉其副作用（如 f(1, 2, sideEffect())）。
        if (desc.type === 'binary' && args.length === 2) {
          pathNode.replaceWith(
            t.binaryExpression(desc.operator, args[0], args[1]),
          );
          totalFolded++;
          return;
        }

        if (desc.type === 'logical' && args.length === 2) {
          // 逻辑折叠会短路求值，只有实参均无副作用时才与原语义等价。
          if (!isSideEffectFreeArg(args[0]) || !isSideEffectFreeArg(args[1])) {
            return;
          }
          pathNode.replaceWith(
            t.logicalExpression(desc.operator, args[0], args[1]),
          );
          totalFolded++;
          return;
        }

        if (desc.type === 'unary' && args.length === 1) {
          pathNode.replaceWith(
            t.unaryExpression(desc.operator, args[0], desc.prefix),
          );
          totalFolded++;
          return;
        }

        if (desc.type === 'call' && args.length >= 1) {
          const [fn, ...fnArgs] = args;
          pathNode.replaceWith(t.callExpression(fn, fnArgs));
          totalFolded++;
        }
      },

      // 2.2 属性访问形式: _0xobj['msg']
      MemberExpression(pathNode) {
        // 如果当前 MemberExpression 是 CallExpression 的 callee，已经在上面处理过了，跳过
        if (pathNode.parentPath.isCallExpression({callee: pathNode.node}))
          return;
        // 赋值/自增/delete 的目标位置不能被替换为字面量，否则产生非法 AST。
        if (isAssignTargetBase(pathNode)) return;
        if (!t.isIdentifier(pathNode.node.object)) return;

        const objName = pathNode.node.object.name;
        const propMap = findDescriptor(wrapperObjects, objName, pathNode);
        if (!propMap) return;

        const key = getStaticMemberKey(pathNode.node);
        if (key === null) return;

        const desc = propMap.get(key);
        if (desc && desc.type === 'literal') {
          pathNode.replaceWith(t.cloneNode(desc.node));
          totalFolded++;
        }
      },
    });

    // 3. 尝试清理不再被引用的 dispatcher 对象
    // 第 2 步的 replaceWith 不会刷新 binding.referencePaths，需先 re-crawl，
    // 否则可能把仍被引用的对象误判为 0 引用而删除。
    const allEntries = [];
    for (const entries of wrapperObjects.values()) {
      allEntries.push(...entries);
    }
    for (const {declPath} of allEntries) {
      declPath.scope.crawl();
    }
    for (const {declPath} of allEntries) {
      const binding = declPath.scope.getBinding(declPath.node.id.name);
      if (binding && binding.referencePaths.length === 0) {
        if (declPath.parent.declarations.length === 1) {
          declPath.parentPath.remove();
        } else {
          declPath.remove();
        }
      }
    }

    return {
      success: true,
      totalFolded,
      code: generator(ast, {
        compact: false,
        comments: false,
        jsescOption: {minimal: true},
      }).code,
    };
  } catch (err) {
    return {
      success: false,
      totalFolded: 0,
      code,
      error: err.message,
    };
  }
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    process.stderr.write(
      'Usage: node fold-wrappers.js <input.js> <output.js>\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const result = foldWrappers(raw);
  if (!result.success) {
    process.stderr.write(`Warning: fold-wrappers failed (${result.error})\n`);
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
  fs.writeFileSync(path.resolve(outputPath), result.code, 'utf8');
}

module.exports = {
  foldWrappers,
  extractDescriptor,
};
