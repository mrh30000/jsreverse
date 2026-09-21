/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const {traverse, t} = require('./utils');
const {replaceWithStatements} = require('./control-flow');

const BINARY_OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => (b === 0 ? undefined : a / b),
  '%': (a, b) => (b === 0 ? undefined : a % b),
  '**': (a, b) => a ** b,
  '|': (a, b) => a | b,
  '&': (a, b) => a & b,
  '^': (a, b) => a ^ b,
  '<<': (a, b) => a << b,
  '>>': (a, b) => a >> b,
  '>>>': (a, b) => a >>> b,
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  // 数值字面量之间 ==/!= 与严格比较语义一致，统一按严格语义求值。
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
};

function statementsOf(branch) {
  if (t.isBlockStatement(branch)) return branch.body;
  return [branch];
}

function runOptimizationPass(ast) {
  let changed = false;

  traverse(ast, {
    // 1. 清理字符串与数字的 extra（解码 hex / unicode）
    StringLiteral(path) {
      if (path.node.extra) {
        delete path.node.extra;
        changed = true;
      }
    },
    NumericLiteral(path) {
      if (path.node.extra) {
        delete path.node.extra;
        changed = true;
      }
    },

    // 2. 常量折叠 (Unary: !0 -> true, !1 -> false, !![] -> true, ![] -> false)
    UnaryExpression(path) {
      const {operator, argument} = path.node;
      if (operator === '!') {
        if (t.isNumericLiteral(argument)) {
          path.replaceWith(t.booleanLiteral(!argument.value));
          changed = true;
          return;
        }
        if (t.isArrayExpression(argument)) {
          path.replaceWith(t.booleanLiteral(false));
          changed = true;
          return;
        }
        if (
          t.isUnaryExpression(argument, {operator: '!'}) &&
          t.isArrayExpression(argument.argument)
        ) {
          path.replaceWith(t.booleanLiteral(true));
          changed = true;
          return;
        }
      }
      // 双重取负等价于一元 +，会触发数字强制转换（-(-"5") === 5），
      // 仅在操作数为数字字面量时才可安全折叠为原值。
      if (
        operator === '-' &&
        t.isUnaryExpression(argument, {operator: '-'}) &&
        t.isNumericLiteral(argument.argument)
      ) {
        path.replaceWith(argument.argument);
        changed = true;
        return;
      }
      if (operator === '~' && t.isNumericLiteral(argument)) {
        path.replaceWith(t.numericLiteral(~argument.value));
        changed = true;
        return;
      }
      if (operator === '+' && t.isNumericLiteral(argument)) {
        path.replaceWith(t.numericLiteral(+argument.value));
        changed = true;
        return;
      }
    },

    // 3. 常量折叠 (Binary: 1 + 2 -> 3, "a" + "b" -> "ab")
    BinaryExpression(path) {
      const {operator, left, right} = path.node;

      if (t.isNumericLiteral(left) && t.isNumericLiteral(right)) {
        const fn = BINARY_OPS[operator];
        if (fn) {
          const res = fn(left.value, right.value);
          if (typeof res === 'number' && Number.isFinite(res)) {
            path.replaceWith(t.numericLiteral(res));
            changed = true;
            return;
          }
          if (typeof res === 'boolean') {
            path.replaceWith(t.booleanLiteral(res));
            changed = true;
            return;
          }
        }
      }

      if (
        operator === '+' &&
        t.isStringLiteral(left) &&
        t.isStringLiteral(right)
      ) {
        path.replaceWith(t.stringLiteral(left.value + right.value));
        changed = true;
        return;
      }

      if (t.isStringLiteral(left) && t.isStringLiteral(right)) {
        if (operator === '===' || operator === '==') {
          path.replaceWith(t.booleanLiteral(left.value === right.value));
          changed = true;
          return;
        }
        if (operator === '!==' || operator === '!=') {
          path.replaceWith(t.booleanLiteral(left.value !== right.value));
          changed = true;
          return;
        }
      }
    },

    // 4. 逻辑表达式化简 (true && a -> a, false || a -> a)
    LogicalExpression(path) {
      const {operator, left, right} = path.node;
      if (t.isBooleanLiteral(left)) {
        if (operator === '&&') {
          path.replaceWith(left.value ? right : t.booleanLiteral(false));
          changed = true;
        } else if (operator === '||') {
          path.replaceWith(left.value ? t.booleanLiteral(true) : right);
          changed = true;
        }
      }
    },

    // 5. 三元表达式化简 (true ? a : b -> a)
    ConditionalExpression(path) {
      const {test, consequent, alternate} = path.node;
      if (t.isBooleanLiteral(test)) {
        path.replaceWith(test.value ? consequent : alternate);
        changed = true;
      }
    },

    // 6. 消除虚假 if 分支与 dead code
    IfStatement(path) {
      const {test, consequent, alternate} = path.node;
      if (t.isBooleanLiteral(test)) {
        // 标签语句上展开多语句会让标签只绑定首条语句，导致 break/continue
        // 指向错误的标签（Foo: if (x) {...} 折叠后 break Foo 变成非法跳转）。
        if (path.parentPath.isLabeledStatement()) return;
        // replaceWithStatements 兼容单语句位置（循环体/with 体等），
        // 避免 replaceWithMultiple 在非语句列表位置抛异常中断整轮优化。
        if (test.value) {
          replaceWithStatements(path, statementsOf(consequent));
        } else if (alternate) {
          replaceWithStatements(path, statementsOf(alternate));
        } else {
          path.remove();
        }
        changed = true;
      }
    },

    // 7. 序列表达式拆解为独立语句
    ExpressionStatement(path) {
      if (t.isSequenceExpression(path.node.expression)) {
        const statements = path.node.expression.expressions.map(expr =>
          t.expressionStatement(expr),
        );
        replaceWithStatements(path, statements);
        changed = true;
      }
    },

    // 8. 规范化静态成员访问 obj["prop"] -> obj.prop
    MemberExpression(path) {
      if (
        path.node.computed &&
        t.isStringLiteral(path.node.property) &&
        t.isValidIdentifier(path.node.property.value)
      ) {
        path.node.computed = false;
        path.node.property = t.identifier(path.node.property.value);
        changed = true;
      }
    },
  });

  return changed;
}

module.exports = {
  BINARY_OPS,
  runOptimizationPass,
};
