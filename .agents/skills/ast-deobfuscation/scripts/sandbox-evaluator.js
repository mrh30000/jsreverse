/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 安全边界声明：`node:vm` 不是安全边界，本模块执行的是被分析样本的代码，
 * 通过 constructor 链仍可能触达宿主能力。仅用于本地可信样本/隔离主机，
 * 不得直接对未经审查的网络输入启用。
 */

const vm = require('node:vm');
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

function createSandbox(extra = {}) {
  const sandbox = {
    Array,
    Boolean,
    Date,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    RegExp,
    Set,
    String,
    Symbol,
    TypeError,
    WeakMap,
    WeakSet,
    atob: val => Buffer.from(val, 'base64').toString('binary'),
    btoa: val => Buffer.from(val, 'binary').toString('base64'),
    clearInterval: () => {},
    clearTimeout: () => {},
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
    },
    decodeURIComponent,
    encodeURIComponent,
    escape,
    isFinite,
    isNaN,
    parseFloat,
    parseInt,
    setInterval: () => {},
    setTimeout: () => {},
    unescape,
    Uint8Array,
    ...extra,
  };

  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;

  return vm.createContext(sandbox);
}

function evaluateExpression(code, sandbox, timeoutMs = 1000) {
  try {
    const value = vm.runInContext(code, sandbox, {timeout: timeoutMs});
    return {ok: true, value};
  } catch (error) {
    return {ok: false, error};
  }
}

function evaluateNodes(nodes, sandbox, timeoutMs = 1000) {
  try {
    const code = nodes
      .map(
        n =>
          generator(n, {
            compact: true,
            comments: false,
            jsescOption: {minimal: true},
          }).code,
      )
      .join(';\n');
    vm.runInContext(code, sandbox, {timeout: timeoutMs});
    return {ok: true};
  } catch (error) {
    return {ok: false, error};
  }
}

/**
 * 保守判定表达式是否无副作用（纯字面量/标识符/结构构建）。
 * 调用、new、赋值、自增、await/yield 等一律视为有副作用，不参与 prelude 预执行。
 */
function isSideEffectFreeExpression(node) {
  if (!node) return false;
  if (t.isLiteral(node) || t.isIdentifier(node)) return true;
  if (t.isTemplateLiteral(node)) {
    return node.expressions.every(isSideEffectFreeExpression);
  }
  if (t.isArrayExpression(node)) {
    return node.elements.every(
      el => el === null || isSideEffectFreeExpression(el),
    );
  }
  if (t.isObjectExpression(node)) {
    return node.properties.every(prop => {
      if (!t.isObjectProperty(prop)) return false;
      return isSideEffectFreeExpression(prop.value);
    });
  }
  if (t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
    return true;
  }
  if (t.isUnaryExpression(node)) {
    return isSideEffectFreeExpression(node.argument);
  }
  if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
    return (
      isSideEffectFreeExpression(node.left) &&
      isSideEffectFreeExpression(node.right)
    );
  }
  if (t.isConditionalExpression(node)) {
    return (
      isSideEffectFreeExpression(node.test) &&
      isSideEffectFreeExpression(node.consequent) &&
      isSideEffectFreeExpression(node.alternate)
    );
  }
  if (t.isMemberExpression(node)) {
    // 属性访问可能触发 getter 副作用，保守视为有副作用。
    return false;
  }
  return false;
}

function shouldEvaluateTopLevelStatement(node) {
  // 1. 函数声明
  if (t.isFunctionDeclaration(node)) return true;

  // 2. 变量声明：仅当所有 declarator 的 init 可证明无副作用时才预执行，
  //    避免 `var x = document.title` / `var r = fs.readFileSync(...)` 之类
  //    语句在沙箱里触发 IO。
  if (t.isVariableDeclaration(node)) {
    return node.declarations.every(
      decl => decl.init === null || isSideEffectFreeExpression(decl.init),
    );
  }

  // 3. 自执行函数表达式 (IIFE)
  if (t.isExpressionStatement(node)) {
    const expr = node.expression;
    if (t.isCallExpression(expr)) {
      const callee = expr.callee;
      if (
        t.isFunctionExpression(callee) ||
        t.isArrowFunctionExpression(callee)
      ) {
        return true;
      }
      if (
        t.isUnaryExpression(callee) &&
        (t.isFunctionExpression(callee.argument) ||
          t.isArrowFunctionExpression(callee.argument))
      ) {
        return true;
      }
    }
  }

  return false;
}

function evaluatePrelude(ast, options = {}) {
  const maxStatements = options.maxStatements || 15;
  const timeoutMs = options.timeoutMs || 1000;
  const sandbox = options.sandbox || createSandbox(options.extraGlobals);

  const executed = [];
  const failures = [];
  // 共享截止时间：timeoutMs 是整段 prelude 的总预算，而非每条语句各自
  // 重置（否则 15 条语句最坏可卡 15×timeoutMs）。
  const deadline = Date.now() + timeoutMs;

  for (const node of ast.program.body) {
    if (executed.length >= maxStatements) break;
    if (!shouldEvaluateTopLevelStatement(node)) break;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      failures.push({
        node,
        error: new Error('prelude timeout budget exhausted'),
      });
      break;
    }
    const result = evaluateNodes([node], sandbox, remaining);
    if (!result.ok) {
      failures.push({node, error: result.error});
      break;
    }
    executed.push(node);
  }

  return {
    sandbox,
    executedCount: executed.length,
    executedNodes: executed,
    failures,
  };
}

function seedSandboxFromAliases(ast, sandbox) {
  let changed = false;

  traverse(ast, {
    VariableDeclarator(pathNode) {
      if (
        !t.isIdentifier(pathNode.node.id) ||
        !t.isIdentifier(pathNode.node.init)
      ) {
        return;
      }

      const aliasName = pathNode.node.id.name;
      const sourceName = pathNode.node.init.name;

      if (
        Object.hasOwn(sandbox, sourceName) &&
        !Object.hasOwn(sandbox, aliasName)
      ) {
        // 别名来自不可信样本代码，var __proto__ = Object 这类声明会命中
        // 原型 setter 而不是定义自有属性；显式定义自有数据属性规避原型污染。
        try {
          Object.defineProperty(sandbox, aliasName, {
            value: sandbox[sourceName],
            writable: true,
            enumerable: true,
            configurable: true,
          });
          changed = true;
        } catch {
          // ignore frozen context
        }
      }
    },
  });

  return changed;
}

module.exports = {
  createSandbox,
  evaluateExpression,
  evaluateNodes,
  evaluatePrelude,
  seedSandboxFromAliases,
  shouldEvaluateTopLevelStatement,
};
