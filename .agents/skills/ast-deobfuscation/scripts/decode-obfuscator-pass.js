const {spawnSync} = require('node:child_process');
const fs = require('node:fs');

const {clone, parseArgs, parseFile, saveAst, t, traverse} = require('./shared');

const STACK_READY_ENV = 'AST_DEOBFUSCATION_STACK_READY';

function restartWithLargerStack() {
  const result = spawnSync(
    process.execPath,
    ['--stack-size=8192', __filename, ...process.argv.slice(2)],
    {
      env: {...process.env, [STACK_READY_ENV]: '1'},
      stdio: 'inherit',
    },
  );
  if (result.error) {
    throw result.error;
  }
  process.exit(result.status ?? 1);
}

function getStaticPropertyKey(memberPath) {
  const propertyPath = memberPath.get('property');
  if (!memberPath.node.computed && propertyPath.isIdentifier()) {
    return propertyPath.node.name;
  }
  if (propertyPath.isStringLiteral() || propertyPath.isNumericLiteral()) {
    return String(propertyPath.node.value);
  }
  return null;
}

function referencesBinding(path, binding) {
  let found =
    path.isIdentifier() && path.scope.getBinding(path.node.name) === binding;
  path.traverse({
    Identifier(identifierPath) {
      if (
        identifierPath.scope.getBinding(identifierPath.node.name) === binding
      ) {
        found = true;
        identifierPath.stop();
      }
    },
  });
  return found;
}

function mergeAdjacentObjectAssignments(ast) {
  traverse(ast, {
    VariableDeclarator(path) {
      if (
        !path.get('id').isIdentifier() ||
        !path.get('init').isObjectExpression() ||
        path.parent.declarations.length !== 1
      ) {
        return;
      }

      const binding = path.scope.getBinding(path.node.id.name);
      if (!binding) {
        return;
      }

      const seenKeys = new Set(
        path.node.init.properties
          .filter(property => t.isObjectProperty(property))
          .map(property => {
            if (!property.computed && t.isIdentifier(property.key)) {
              return property.key.name;
            }
            if (
              t.isStringLiteral(property.key) ||
              t.isNumericLiteral(property.key)
            ) {
              return String(property.key.value);
            }
            return null;
          })
          .filter(key => key !== null),
      );

      for (const siblingPath of path.parentPath.getAllNextSiblings()) {
        if (!siblingPath.isExpressionStatement()) {
          break;
        }
        const expressionPath = siblingPath.get('expression');
        if (!expressionPath.isAssignmentExpression({operator: '='})) {
          break;
        }
        const leftPath = expressionPath.get('left');
        if (
          !leftPath.isMemberExpression() ||
          !leftPath.get('object').isIdentifier({name: path.node.id.name})
        ) {
          break;
        }

        const key = getStaticPropertyKey(leftPath);
        const rightPath = expressionPath.get('right');
        if (
          key === null ||
          seenKeys.has(key) ||
          referencesBinding(rightPath, binding)
        ) {
          break;
        }

        path.node.init.properties.push(
          t.objectProperty(t.stringLiteral(key), clone(rightPath.node)),
        );
        seenKeys.add(key);
        siblingPath.remove();
      }
    },
  });
}

function evaluateSafely(path) {
  try {
    return path.evaluate();
  } catch (error) {
    if (error instanceof RangeError) {
      return null;
    }
    throw error;
  }
}

function isSafeConstant(node) {
  return (
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node) ||
    t.isBooleanLiteral(node) ||
    t.isNullLiteral(node)
  );
}

function canFold(path) {
  if (path.isBinaryExpression()) {
    return isSafeConstant(path.node.left) && isSafeConstant(path.node.right);
  }
  if (
    !path.isUnaryExpression() ||
    !['!', '+', '-', '~', 'typeof'].includes(path.node.operator)
  ) {
    return false;
  }
  return (
    isSafeConstant(path.node.argument) ||
    (t.isArrayExpression(path.node.argument) &&
      path.node.argument.elements.length === 0) ||
    (t.isObjectExpression(path.node.argument) &&
      path.node.argument.properties.length === 0)
  );
}

function normalizeSafeExpressions(ast, foldConstants) {
  traverse(ast, {
    'ForStatement|WhileStatement'(path) {
      if (!path.get('body').isBlockStatement()) {
        path.get('body').replaceWith(t.blockStatement([path.node.body]));
      }
    },
    NumericLiteral(path) {
      if (path.node.extra && /^0[box]/i.test(path.node.extra.raw)) {
        path.node.extra = undefined;
      }
    },
    StringLiteral(path) {
      if (path.node.extra && /\\[ux]/i.test(path.node.extra.raw)) {
        path.node.extra = undefined;
      }
    },
    'BinaryExpression|UnaryExpression': {
      exit(path) {
        if (!foldConstants || !canFold(path)) {
          return;
        }
        const evaluation = evaluateSafely(path);
        if (!evaluation) {
          return;
        }
        const value = evaluation.value;
        if (
          !evaluation.confident ||
          value === undefined ||
          (typeof value === 'number' && !Number.isFinite(value)) ||
          !['boolean', 'number', 'string'].includes(typeof value)
        ) {
          return;
        }
        path.replaceWith(t.valueToNode(value));
      },
    },
  });
}

function main() {
  const {inputPath, outputPath} = parseArgs();
  const ast = parseFile(inputPath);
  mergeAdjacentObjectAssignments(ast);
  // ponytail: large ASTs skip mass constant replacement; split folding into a batched pass if this 512 KiB ceiling becomes limiting.
  const foldConstants = fs.statSync(inputPath).size <= 512 * 1024;
  normalizeSafeExpressions(ast, foldConstants);
  saveAst(ast, outputPath);
}

if (process.env[STACK_READY_ENV] === '1') {
  main();
} else {
  restartWithLargerStack();
}
