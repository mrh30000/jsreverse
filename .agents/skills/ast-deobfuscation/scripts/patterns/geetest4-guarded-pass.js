const { clone } = require("../shared");
const { runPatternPass } = require("./shared-pattern-pass");
const { createSandbox, evaluateExpression, evaluateNodes, generateCode, traverse, t } = require("./pattern-utils");

function geetest4GuardedPass(ast) {
  let changed = false;
  const body = ast.program.body;

  if (body.length >= 5) {
    const sandbox = createSandbox();
    const decriptPropName = body[2] && body[2].expression && body[2].expression.left ? generateCode(body[2].expression.left) : "";
    const ctrlVarName = body[3] && body[3].expression && body[3].expression.left ? generateCode(body[3].expression.left) : "";

    if (decriptPropName && evaluateNodes(body.slice(0, 5), sandbox)) {
      traverse(ast, {
        VariableDeclaration(path) {
          if (
            path.node.declarations.length !== 3 ||
            !path.get("declarations.0.init").node ||
            generateCode(path.get("declarations.0.init").node) !== decriptPropName
          ) {
            return;
          }

          // 别名族的真实形态（实测 gcaptcha4.js：1647 组）是
          //   var A = <decoder>, B = ["$_x"].concat(A), C = B[1];   ← 一条 var 带 3 个 declarator
          //   B.shift();                                            ← 紧跟**一条**语句
          // 因此只允许删除「声明 + 紧跟的那条 X.shift()」，且 X 必须是本组声明的名字。
          // 早期版本无条件删除后两条兄弟语句，会把紧跟其后的**真实业务语句**一起删掉
          // （静默语义改变），这里改为严格匹配 shift() 调用后再删。
          const next1 = path.getNextSibling();
          if (!next1 || !next1.node) {
            return;
          }

          const declaredNames = path.node.declarations
            .map((d) => d.id)
            .filter((id) => id && id.type === "Identifier")
            .map((id) => id.name);

          const isAliasCleanup =
            next1.isExpressionStatement() &&
            next1.get("expression").isCallExpression() &&
            next1.get("expression.callee").isMemberExpression() &&
            !next1.get("expression.callee.computed").node &&
            next1.get("expression.callee.property").isIdentifier({ name: "shift" }) &&
            next1.get("expression.callee.object").isIdentifier() &&
            declaredNames.includes(next1.get("expression.callee.object").node.name);

          if (!isAliasCleanup) {
            return;
          }

          const candidateNames = [0, 2]
            .map((index) => path.get(`declarations.${index}.id`))
            .filter((idPath) => idPath && idPath.isIdentifier())
            .map((idPath) => idPath.node.name);

          candidateNames.forEach((name) => {
            const binding = path.scope.getBinding(name);
            if (!binding) {
              return;
            }
            binding.referencePaths.forEach((refPath) => {
              const parent = refPath.parentPath;
              if (!parent.isCallExpression() || parent.node.arguments.length !== 1 || !parent.get("arguments.0").isNumericLiteral()) {
                return;
              }
              const argValue = parent.node.arguments[0].value;
              const result = evaluateExpression(`${decriptPropName}(${argValue})`, sandbox);
              if (!result.ok) {
                return;
              }
              parent.replaceWith(t.valueToNode(result.value));
              changed = true;
            });
          });

          path.remove();
          next1.remove();
          changed = true;
        },
        ForStatement(path) {
          if (
            path.node.init !== null ||
            path.node.update !== null ||
            !path.get("test").isBinaryExpression() ||
            !generateCode(path.get("test.right").node).includes(ctrlVarName) ||
            !path.get("body").isBlockStatement() ||
            path.get("body.body").length !== 1 ||
            !path.get("body.body.0").isSwitchStatement()
          ) {
            return;
          }

          const testNamePath = path.get("test.left");
          if (!testNamePath.isIdentifier()) {
            return;
          }

          const testName = testNamePath.node.name;
          const statements = [];
          path.get("body.body.0.cases").forEach((casePath) => {
            casePath.get("consequent").forEach((stmtPath) => {
              if (stmtPath.isBreakStatement()) {
                return;
              }
              if (
                stmtPath.isExpressionStatement() &&
                stmtPath.get("expression").isAssignmentExpression() &&
                stmtPath.get("expression.left").isIdentifier({ name: testName })
              ) {
                return;
              }
              statements.push(clone(stmtPath.node));
            });
          });

          if (statements.length > 0) {
            path.replaceWithMultiple(statements);
            const prev = path.getPrevSibling();
            if (prev && prev.node) {
              prev.remove();
            }
            changed = true;
          }
        }
      });
    }
  }

  return { ast, changed };
}

runPatternPass(geetest4GuardedPass);
