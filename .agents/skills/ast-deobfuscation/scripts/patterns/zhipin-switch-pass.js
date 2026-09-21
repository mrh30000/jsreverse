const { runPatternPass } = require("./shared-pattern-pass");
const { traverse, t } = require("./pattern-utils");

/**
 * BOSS 直聘（`__zp_stoken__`）多层 switch 专用适配。
 *
 * 该站的控制流形态是多入口多层 `switch`：
 *   - 整个 switch 由**最外层调用时传入的 index** 控制；
 *   - 每一层 `switch` 的判别式都是**同一个标识符**（如 `w`）；
 *   - 最内层 case 跑完逐层 `break` / `return` 回到最外层，不在中间层停留；
 *   - 变量靠 switch 层级隔离，所以不能简单"拉平"（见 references/multi-entry-switch-reduction.md §4）。
 *
 * 本 pass 只做**保守可证明**的折叠，三类情况一律不动：
 *   1. 判别式拿不到静态值（参数、函数调用结果等）；
 *   2. 某个名字在文件内被重新赋值过 ⇒ 不参与常量传播（浅层扫描看不准，宁可不做）；
 *   3. 命中的 case 存在 **fallthrough**（case 体不以 break/return/throw/continue 结尾）
 *      ⇒ 只取该 case 的 body 会丢掉后继 case 的语句，属静默语义改变。
 *
 * 能折叠时的语义保持：去掉被选中 case 尾部的 `break`；命中 `default` 时用 default；
 * 无匹配且无 default 时替换为空语句（`switch` 无匹配本就是 no-op）。
 * 剩余无法证明的部分只统计数量，交给规则文档里"按入口拆函数"的人工流程。
 */

/** 收集「数值常量」绑定：`var x = 1` / `x = 2`（只认字面量）。 */
function collectNumericConstants(ast) {
  const consts = new Map();
  traverse(ast, {
    VariableDeclarator(path) {
      const id = path.get("id");
      const init = path.get("init");
      if (!id.isIdentifier() || !init.node) {
        return;
      }
      if (init.isNumericLiteral()) {
        consts.set(id.node.name, init.node.value);
        return;
      }
      if (init.isUnaryExpression() && init.get("argument").isNumericLiteral()) {
        const v = init.node.argument.value;
        consts.set(id.node.name, init.node.operator === "-" ? -v : v);
      }
    },
    AssignmentExpression(path) {
      const left = path.get("left");
      const right = path.get("right");
      if (left.isIdentifier() && right.isNumericLiteral()) {
        consts.set(left.node.name, right.node.value);
      }
    }
  });
  return consts;
}

/** 收集「被重新赋值过」的标识符：这类名字不能按常量传播。 */
function collectReassigned(ast) {
  const reassigned = new Set();
  traverse(ast, {
    AssignmentExpression(path) {
      const left = path.get("left");
      if (left.isIdentifier()) {
        reassigned.add(left.node.name);
      }
    },
    UpdateExpression(path) {
      const arg = path.get("argument");
      if (arg.isIdentifier()) {
        reassigned.add(arg.node.name);
      }
    }
  });
  return reassigned;
}

/** case 的测试值（只认字面量，其余返回 undefined）。 */
function caseTestValue(casePath) {
  const test = casePath.get("test");
  if (!test.node) {
    return undefined; // default
  }
  if (test.isNumericLiteral()) {
    return test.node.value;
  }
  if (test.isStringLiteral()) {
    return test.node.value;
  }
  if (test.isUnaryExpression() && test.get("argument").isNumericLiteral()) {
    const v = test.node.argument.value;
    return test.node.operator === "-" ? -v : v;
  }
  return undefined;
}

/**
 * 沿祖先链收集 (判别式名, 已定 case 值) 对，由内向外。
 * 用于「多层 switch 判别式都是同一个标识符」的形态：内层继承外层的 case 值。
 * 无状态实现（不维护栈），避免节点被替换导致栈失衡。
 *
 * 注意向上走时**先遇到 SwitchCase、再遇到它所属的 SwitchStatement**，
 * 所以用一个 `pendingCase` 暂存最近一次遇到的 case 值，等碰到外层 switch 时再认领。
 */
function ancestorFrames(switchPath) {
  const frames = [];
  let pendingCase;
  let cur = switchPath.parentPath;
  while (cur && cur.node) {
    if (cur.isSwitchCase()) {
      if (cur.node.test !== null) {
        pendingCase = caseTestValue(cur);
      }
    } else if (cur.isSwitchStatement()) {
      const disc = cur.get("discriminant");
      frames.push({
        discName: disc.isIdentifier() ? disc.node.name : null,
        caseValue: pendingCase
      });
      pendingCase = undefined;
    }
    cur = cur.parentPath;
  }
  return frames;
}

/** 判别式 → 静态值（拿不到就返回 undefined）。 */
function resolveDiscriminant(discPath, consts, reassigned, frames) {
  if (!discPath || !discPath.node) {
    return undefined;
  }
  if (discPath.isNumericLiteral()) {
    return discPath.node.value;
  }
  if (discPath.isStringLiteral()) {
    return discPath.node.value;
  }
  if (discPath.isUnaryExpression() && discPath.get("argument").isNumericLiteral()) {
    const v = discPath.node.argument.value;
    return discPath.node.operator === "-" ? -v : v;
  }
  if (discPath.isIdentifier()) {
    const name = discPath.node.name;
    if (reassigned.has(name)) {
      return undefined;
    }
    if (consts.has(name)) {
      return consts.get(name);
    }
    // 祖先层同一标识符的 case 已定值 ⇒ 内层判别式继承该值
    for (let i = 0; i < frames.length; i += 1) {
      if (frames[i].discName === name && frames[i].caseValue !== undefined) {
        return frames[i].caseValue;
      }
    }
  }
  return undefined;
}

/** 去掉 case 语句体末尾的 `break;`。 */
function stripTrailingBreak(bodyPaths) {
  if (bodyPaths.length === 0) {
    return bodyPaths;
  }
  const last = bodyPaths[bodyPaths.length - 1];
  if (last.isBreakStatement() && !last.node.label) {
    return bodyPaths.slice(0, -1);
  }
  return bodyPaths;
}

/** case 是否会穿透到下一个 case。 */
function hasFallthrough(casePath, isLastCase) {
  if (isLastCase) {
    return false;
  }
  const body = casePath.get("consequent");
  if (body.length === 0) {
    return true; // 空 case 必然穿透
  }
  const last = body[body.length - 1];
  if (last.isBreakStatement() && !last.node.label) {
    return false;
  }
  if (last.isReturnStatement() || last.isThrowStatement() || last.isContinueStatement()) {
    return false;
  }
  return true;
}

function zhipinSwitchPass(ast) {
  const consts = collectNumericConstants(ast);
  const reassigned = collectReassigned(ast);
  const stats = { collapsed: 0, unresolved: 0, fallthroughSkipped: 0 };
  let changed = false;

  traverse(ast, {
    SwitchStatement(path) {
      const discPath = path.get("discriminant");
      const frames = ancestorFrames(path);
      const value = resolveDiscriminant(discPath, consts, reassigned, frames);

      if (value === undefined) {
        stats.unresolved += 1;
        return;
      }

      const cases = path.get("cases");
      let matched = null;
      let defaultCase = null;
      for (let i = 0; i < cases.length; i += 1) {
        const casePath = cases[i];
        const tv = caseTestValue(casePath);
        if (tv === undefined && casePath.node.test === null) {
          defaultCase = casePath;
        } else if (tv !== undefined && tv === value) {
          matched = casePath;
          break;
        }
      }

      const target = matched || defaultCase;
      if (!target) {
        // 无匹配且无 default：switch 本身就是 no-op
        path.replaceWith(t.emptyStatement());
        stats.collapsed += 1;
        changed = true;
        return;
      }

      if (hasFallthrough(target, cases[cases.length - 1] === target)) {
        stats.fallthroughSkipped += 1;
        stats.unresolved += 1;
        return;
      }

      const consequent = stripTrailingBreak(target.get("consequent"));
      if (consequent.length === 0) {
        path.replaceWith(t.emptyStatement());
      } else if (consequent.length === 1) {
        path.replaceWith(consequent[0].node);
      } else {
        path.replaceWith(t.blockStatement(consequent.map((p) => p.node)));
      }
      stats.collapsed += 1;
      changed = true;
      // 折叠后新节点可能仍含 switch，交由 reparse 后的下一轮处理
      path.skip();
    }
  });

  if (stats.unresolved > 0 || stats.collapsed > 0) {
    // 残留统计：unresolved / fallthroughSkipped 属于「判别式无法静态确定」或「存在穿透」的 switch，
    // 交给 references/multi-entry-switch-reduction.md §2/§4 的人工流程
    // （收集 index → 按入口拆函数），不要为了好看强行拉平。
    process.stderr.write(
      `[zhipin-switch-pass] collapsed=${stats.collapsed} unresolved=${stats.unresolved} ` +
        `fallthrough_skipped=${stats.fallthroughSkipped}\n`
    );
  }

  return { ast, changed };
}

runPatternPass(zhipinSwitchPass);
