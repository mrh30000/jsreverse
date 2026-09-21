/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const parser = require('@babel/parser');
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

function isObfuscatorIdentifier(name) {
  return typeof name === 'string' && /^_0x[a-z0-9]+$/i.test(name);
}

function isStaticLiteral(node) {
  if (
    t.isNumericLiteral(node) ||
    t.isStringLiteral(node) ||
    t.isBooleanLiteral(node)
  ) {
    return true;
  }
  if (
    t.isUnaryExpression(node, {operator: '-'}) &&
    t.isNumericLiteral(node.argument)
  ) {
    return true;
  }
  return false;
}

function parseCode(code) {
  return parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  });
}

function generateCode(ast) {
  return generator(ast, {
    compact: false,
    comments: false,
    jsescOption: {minimal: true},
  }).code;
}

module.exports = {
  isObfuscatorIdentifier,
  isStaticLiteral,
  parseCode,
  generateCode,
  traverse,
  t,
};
