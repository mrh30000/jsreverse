/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const {traverse, t} = require('./utils');

/**
 * replaceWithMultiple 仅在语句列表（Program/BlockStatement）位置合法；
 * 作为循环体、label 体等单语句位置时会抛异常，此时退化为 block/单语句。
 */
function replaceWithStatements(path, statements) {
  if (statements.length === 0) {
    path.remove();
    return;
  }
  if (path.parentPath.isBlockStatement() || path.parentPath.isProgram()) {
    path.replaceWithMultiple(statements);
    return;
  }
  if (statements.length === 1) {
    path.replaceWith(statements[0]);
  } else {
    path.replaceWith(t.blockStatement(statements));
  }
}

/**
 * 判断语句中是否存在带标签的 break/continue。这类语句指向外层 label，
 * 而扁平化会删除它们所在的 while/switch，展开后标签引用会变成非法跳转，
 * 因此遇到时保守放弃本次还原。
 */
function hasLabeledJump(statements) {
  let found = false;
  const wrapper = t.file(t.program(statements));
  traverse(wrapper, {
    BreakStatement(path) {
      if (path.node.label) found = true;
    },
    ContinueStatement(path) {
      if (path.node.label) found = true;
    },
  });
  return found;
}

function unflattenControlFlow(ast) {
  let changed = false;

  traverse(ast, {
    WhileStatement(path) {
      const {test, body} = path.node;
      if (
        !t.isBooleanLiteral(test, {value: true}) &&
        !t.isNumericLiteral(test, {value: 1})
      ) {
        return;
      }
      if (!t.isBlockStatement(body) || body.body.length !== 1) {
        return;
      }

      const [switchStmt] = body.body;
      if (!t.isSwitchStatement(switchStmt)) {
        return;
      }

      // 寻找前面的分发序列表声明，例如: var _0xseq = "3|1|2".split('|') 或 var _0xseq = ['3', '1', '2']
      let prev = path.getPrevSibling();
      let order = null;
      let orderVarName = null;
      const declsToRemove = [];

      while (prev && prev.isVariableDeclaration()) {
        for (const decl of prev.node.declarations) {
          if (!t.isIdentifier(decl.id) || !decl.init) continue;

          // 形式 1: "0|2|1".split('|')
          if (
            t.isCallExpression(decl.init) &&
            t.isMemberExpression(decl.init.callee) &&
            t.isStringLiteral(decl.init.callee.object) &&
            t.isIdentifier(decl.init.callee.property, {name: 'split'}) &&
            decl.init.arguments.length === 1 &&
            t.isStringLiteral(decl.init.arguments[0])
          ) {
            order = decl.init.callee.object.value.split(
              decl.init.arguments[0].value,
            );
            orderVarName = decl.id.name;
            // 多 declarator 声明（var seq = ..., keep = ...）整体删除会丢失
            // 其他绑定，故仅在单 declarator 时才移除该声明。
            if (prev.node.declarations.length === 1) declsToRemove.push(prev);
            break;
          }

          // 形式 2: ['0', '2', '1']
          if (t.isArrayExpression(decl.init)) {
            const elements = decl.init.elements.map(el => {
              if (t.isStringLiteral(el)) return el.value;
              if (t.isNumericLiteral(el)) return String(el.value);
              return null;
            });
            if (elements.length > 0 && elements.every(el => el !== null)) {
              order = elements;
              orderVarName = decl.id.name;
              if (prev.node.declarations.length === 1) declsToRemove.push(prev);
              break;
            }
          }
        }

        if (order) break;
        // 未命中分发序列表时不要累积中间声明：它们与本次扁平化无关，
        // 若在后续 declsToRemove 中删除会误删有效代码。
        prev = prev.getPrevSibling();
      }

      if (!order || !orderVarName) return;

      // 序列表变量必须真的被 switch 判别式引用，否则一个无关的 while+switch
      // 只要前面恰好有条元素集合相同的声明就会被错误重排，静默改变控制流。
      const discriminant = switchStmt.discriminant;
      if (
        !t.isIdentifier(discriminant, {name: orderVarName}) &&
        !(
          t.isMemberExpression(discriminant) &&
          t.isIdentifier(discriminant.object, {name: orderVarName})
        ) &&
        !(
          t.isUpdateExpression(discriminant) &&
          t.isMemberExpression(discriminant.argument) &&
          t.isIdentifier(discriminant.argument.object, {name: orderVarName})
        )
      ) {
        return;
      }

      // 收集各个 case 的有效语句块
      const casesMap = new Map();
      for (const switchCase of switchStmt.cases) {
        let key = null;
        if (t.isStringLiteral(switchCase.test)) key = switchCase.test.value;
        else if (t.isNumericLiteral(switchCase.test))
          key = String(switchCase.test.value);
        if (key === null) continue;

        const statements = switchCase.consequent.filter(stmt => {
          // 仅移除无标签的 break/continue：带标签的语句可能指向外层循环/块，
          // 移除后会破坏语义。
          if (t.isContinueStatement(stmt) && !stmt.label) return false;
          if (t.isBreakStatement(stmt) && !stmt.label) return false;
          return true;
        });

        // 带标签的跳转指向被删除的 while/label，展开后会变成非法跳转，
        // 保守放弃本次还原而不是产出坏代码。
        if (hasLabeledJump(statements)) return;

        casesMap.set(key, statements);
      }

      // 序列表中每个步骤都应有对应 case，缺失说明输入不符合该还原模式，
      // 静默丢弃步骤会产出错误代码。
      if (!order.every(stepKey => casesMap.has(stepKey))) return;

      // 若序列表变量在 while 之外仍被引用，替换后不能删除其声明。
      const orderBinding = prev.scope.getBinding(orderVarName);
      const hasExternalRef =
        orderBinding !== undefined &&
        orderBinding.referencePaths.some(ref => !path.isAncestor(ref));

      const rebuiltStatements = [];
      for (const stepKey of order) {
        rebuiltStatements.push(...casesMap.get(stepKey));
      }

      if (rebuiltStatements.length > 0) {
        replaceWithStatements(path, rebuiltStatements);
        if (!hasExternalRef) {
          for (const p of declsToRemove) {
            p.remove();
          }
        }
        changed = true;
      }
    },
  });

  return changed;
}

module.exports = {
  unflattenControlFlow,
  replaceWithStatements,
};
