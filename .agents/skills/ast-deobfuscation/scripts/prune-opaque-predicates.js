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

const NUMERIC_COMPARATORS = {
  '>': (l, r) => l > r,
  '<': (l, r) => l < r,
  '>=': (l, r) => l >= r,
  '<=': (l, r) => l <= r,
  '===': (l, r) => l === r,
  '==': (l, r) => l === r, // eslint-disable-line eqeqeq
  '!==': (l, r) => l !== r,
  '!=': (l, r) => l !== r, // eslint-disable-line eqeqeq
};

function isMultiplyByZero(expr) {
  if (!t.isBinaryExpression(expr, {operator: '*'})) return false;
  // 假设另一操作数为有限数字（见 references/opaque-predicates.md）：
  // NaN/Infinity * 0 不等于 0，此启发式对这类输入不成立。
  return (
    (t.isNumericLiteral(expr.left) && expr.left.value === 0) ||
    (t.isNumericLiteral(expr.right) && expr.right.value === 0)
  );
}

function isSelfZero(expr) {
  if (!t.isBinaryExpression(expr)) return false;
  // 仅保留异或：x ^ x 依赖 ToInt32 强制转换，恒为 0。
  // 减法 x - x 在 NaN/Infinity 下不等于 0，不能当作恒等式折叠。
  if (expr.operator === '^') {
    if (t.isIdentifier(expr.left) && t.isIdentifier(expr.right)) {
      return expr.left.name === expr.right.name;
    }
  }
  return false;
}

function evaluatePredicate(testNode) {
  // 1. 纯布尔字面量
  if (t.isBooleanLiteral(testNode)) {
    return testNode.value;
  }

  // 2. 数值字面量比较: 5 > 3, 1 === 2
  if (t.isBinaryExpression(testNode)) {
    const {operator, left, right} = testNode;
    if (t.isNumericLiteral(left) && t.isNumericLiteral(right)) {
      const cmp = NUMERIC_COMPARATORS[operator];
      if (cmp) return cmp(left.value, right.value);
    }

    // 字符串字面量比较
    if (t.isStringLiteral(left) && t.isStringLiteral(right)) {
      if (operator === '===' || operator === '==')
        return left.value === right.value;
      if (operator === '!==' || operator === '!=')
        return left.value !== right.value;
    }

    // 3. 代数恒等式: x * 0 === 0
    if (
      (operator === '===' || operator === '==') &&
      t.isNumericLiteral(right, {value: 0})
    ) {
      if (isMultiplyByZero(left) || isSelfZero(left)) return true;
    }
    if (
      (operator === '!==' || operator === '!=') &&
      t.isNumericLiteral(right, {value: 0})
    ) {
      if (isMultiplyByZero(left) || isSelfZero(left)) return false;
    }
  }

  // 4. typeof 常量: typeof "str" === "string"
  if (
    t.isBinaryExpression(testNode) &&
    (testNode.operator === '===' || testNode.operator === '==')
  ) {
    if (
      t.isUnaryExpression(testNode.left, {operator: 'typeof'}) &&
      t.isStringLiteral(testNode.right)
    ) {
      if (t.isStringLiteral(testNode.left.argument))
        return testNode.right.value === 'string';
      if (t.isNumericLiteral(testNode.left.argument))
        return testNode.right.value === 'number';
      if (t.isBooleanLiteral(testNode.left.argument))
        return testNode.right.value === 'boolean';
    }
  }

  return null;
}

function detectOpaquePredicates(code) {
  return (
    /(?<![\w$])if\s*\(\s*\d+\s*[<>!=]+\s*\d+\s*\)/.test(code) ||
    /(?<![\w$])if\s*\(\s*\w+\s*\*\s*0\s*===?\s*0\s*\)/.test(code)
  );
}

/**
 * 用被选中的分支替换 if 语句。
 * replaceWithMultiple 仅在该 if 处于语句列表（Program/BlockStatement）时合法；
 * 直接作为循环体/label 等单语句位置时，需退化为 blockStatement 或 emptyStatement。
 */
function replaceWithStatements(pathNode, branch) {
  if (!branch) {
    pathNode.remove();
    return;
  }
  const stmts = t.isBlockStatement(branch) ? branch.body : [branch];
  const inStatementList =
    pathNode.parentPath.isBlockStatement() || pathNode.parentPath.isProgram();

  if (inStatementList) {
    if (stmts.length === 0) pathNode.remove();
    else pathNode.replaceWithMultiple(stmts);
    return;
  }

  if (stmts.length === 1) {
    pathNode.replaceWith(stmts[0]);
  } else if (stmts.length === 0) {
    pathNode.replaceWith(t.emptyStatement());
  } else {
    pathNode.replaceWith(t.blockStatement(stmts));
  }
}

function pruneOpaquePredicates(code) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });

    let removed = 0;

    traverse(ast, {
      IfStatement(pathNode) {
        const truthy = evaluatePredicate(pathNode.node.test);
        if (truthy === null) return;

        if (truthy) {
          replaceWithStatements(pathNode, pathNode.node.consequent);
        } else {
          replaceWithStatements(pathNode, pathNode.node.alternate);
        }
        removed++;
      },
      ConditionalExpression(pathNode) {
        const truthy = evaluatePredicate(pathNode.node.test);
        if (truthy === null) return;

        // ConditionalExpression 的 consequent/alternate 都是必填字段，
        // 直接按真假取对应分支即可。
        pathNode.replaceWith(
          truthy ? pathNode.node.consequent : pathNode.node.alternate,
        );
        removed++;
      },
    });

    return {
      success: true,
      removed,
      code: generator(ast, {
        compact: false,
        comments: false,
        jsescOption: {minimal: true},
      }).code,
    };
  } catch (err) {
    return {
      success: false,
      removed: 0,
      code,
      error: err.message,
    };
  }
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    process.stderr.write(
      'Usage: node prune-opaque-predicates.js <input.js> <output.js>\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const result = pruneOpaquePredicates(raw);
  if (!result.success) {
    process.stderr.write(
      `Warning: failed to prune opaque predicates (${result.error})\n`,
    );
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
  fs.writeFileSync(path.resolve(outputPath), result.code, 'utf8');
}

module.exports = {
  pruneOpaquePredicates,
  detectOpaquePredicates,
  evaluatePredicate,
};
