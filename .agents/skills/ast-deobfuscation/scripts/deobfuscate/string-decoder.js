/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const vm = require('node:vm');
const generator = require('@babel/generator').default;

const {createSandbox} = require('../sandbox-evaluator');
const {
  isObfuscatorIdentifier,
  isStaticLiteral,
  traverse,
  t,
} = require('./utils');

/**
 * 字符串数组轮转通常写成 IIFE（数组作实参、体内 push/shift），callee 是
 * FunctionExpression，不满足下面按 `_0x` 名字收集的条件。若不收集，沙箱里
 * 数组保持未轮转，后续把 _0xdec(i) 替换成沙箱求值结果会写入错误字符串。
 */
function isArrayRotationStatement(statement) {
  if (!t.isExpressionStatement(statement)) return false;
  const expr = statement.expression;
  if (!t.isCallExpression(expr)) return false;
  const callee = expr.callee;
  if (!t.isFunctionExpression(callee) && !t.isArrowFunctionExpression(callee)) {
    return false;
  }
  const body = generator(callee.body, {compact: true}).code;
  return body.includes('push') && body.includes('shift');
}

function evaluateStringDecoders(ast) {
  let changed = false;
  const helperStatements = [];

  for (const statement of ast.program.body) {
    if (
      t.isFunctionDeclaration(statement) &&
      statement.id &&
      isObfuscatorIdentifier(statement.id.name)
    ) {
      helperStatements.push(generator(statement, {compact: true}).code);
      continue;
    }
    if (t.isVariableDeclaration(statement)) {
      const hasHelper = statement.declarations.some(decl => {
        if (!t.isIdentifier(decl.id)) return false;
        return (
          isObfuscatorIdentifier(decl.id.name) ||
          (t.isIdentifier(decl.init) && isObfuscatorIdentifier(decl.init.name))
        );
      });
      if (hasHelper) {
        helperStatements.push(generator(statement, {compact: true}).code);
      }
      continue;
    }
    if (
      t.isExpressionStatement(statement) &&
      t.isCallExpression(statement.expression) &&
      t.isIdentifier(statement.expression.callee) &&
      isObfuscatorIdentifier(statement.expression.callee.name) &&
      statement.expression.arguments.every(isStaticLiteral)
    ) {
      helperStatements.push(generator(statement, {compact: true}).code);
      continue;
    }
    if (isArrayRotationStatement(statement)) {
      helperStatements.push(generator(statement, {compact: true}).code);
    }
  }

  if (helperStatements.length === 0) return false;

  // 复用 sandbox-evaluator 的统一沙箱（含 window/self/globalThis shim），
  // 避免两份沙箱定义漂移导致样本在一条路径能解、另一条不能。
  const sandboxContext = createSandbox();

  // 逐条求值：单条失败（如依赖 document 的声明）不应中断整段 helper 加载，
  // 否则一个坏声明会让整个文件的字符串解码全盘放弃。
  for (const statement of helperStatements) {
    try {
      new vm.Script(statement).runInContext(sandboxContext, {timeout: 500});
    } catch {
      // 跳过无法求值的 helper，继续加载其余部分
    }
  }

  // 共享整体预算：逐条 traverse 时每条各自 100ms 会被大量调用累积放大。
  const deadline = Date.now() + 2000;
  traverse(ast, {
    CallExpression(path) {
      if (!t.isIdentifier(path.node.callee)) return;
      if (!isObfuscatorIdentifier(path.node.callee.name)) return;
      if (!path.node.arguments.every(isStaticLiteral)) return;

      const remaining = deadline - Date.now();
      if (remaining <= 0) return;

      const callCode = generator(path.node, {compact: true}).code;
      let evaluated;
      try {
        evaluated = new vm.Script(callCode).runInContext(sandboxContext, {
          timeout: remaining,
        });
      } catch {
        return;
      }

      if (typeof evaluated === 'string') {
        path.replaceWith(t.stringLiteral(evaluated));
        changed = true;
      } else if (typeof evaluated === 'number' && Number.isFinite(evaluated)) {
        path.replaceWith(t.numericLiteral(evaluated));
        changed = true;
      } else if (typeof evaluated === 'boolean') {
        path.replaceWith(t.booleanLiteral(evaluated));
        changed = true;
      }
    },
  });

  return changed;
}

module.exports = {
  evaluateStringDecoders,
};
