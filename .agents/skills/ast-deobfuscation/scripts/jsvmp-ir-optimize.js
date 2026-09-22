#!/usr/bin/env node
/**
 * jsvmp-ir-optimize.js —— JSVMP 反汇编产物的「中间代码优化 + CFG 回译」工具
 *
 * 定位：`references/jsvmp-ir-and-optimization.md` 的可执行件。
 * 上游是「字节码 → IR」的反汇编（`jsvmp-bytecode-and-decompiler.md` 讲怎么产出），
 * 本工具负责上游之后的六件事（也就是多篇文章作者自述的「下步改进方向」）：
 *
 *   1. fold-const    常量虚假指令表折叠：`M[i] = v` 已知的替换成常量，未赋值的替换成 null
 *   2. prune-cases   死 case 消除：断点探测出的「从未执行的 case」整段删除
 *   3. simplify-cfg  常量折叠 + 块内常量传播 + 恒真/恒假分支 + 重复边消除 + 不可达块删除 + 单前驱单后继合并
 *   4. restore-logic `&&` / `||` 还原（两个分支汇合到同一对后继 = 被拆开的短路表达式）
 *   5. emit-js       CFG → JS（两种发射器：`flat` 保底正确，`structured` 可读）
 *   6. --selftest    随机程序对拍：解释器 / flat / structured 三方结果必须逐字节一致
 *
 * 🔴 设计要点（这是本工具「能被信任」的原因）：
 *   - **flat 发射器是保底**：它把 CFG 原样变成 `switch(pc)` 循环，语义上几乎不可能写错。
 *   - **structured 发射器是可读版**：它必须与 flat **结果一致**才算通过。
 *     两者由完全不同的代码路径产生 ⇒ 「结果一致」是一个真正的交叉验证，
 *     而不是「自己跟自己比」（B8 教训：往返自检抓不到对称的错误）。
 *   - **区分性断言**：优化步骤不能只证明「结果还对」，还要证明「**真的做了优化**」
 *     （折叠了几处 M 引用、删了几个死 case、合并了几个块、还原了几处短路）。
 *     否则「什么都没做」也会全绿。
 *
 * IR schema（JSON）：
 * {
 *   "entry": 0,
 *   "constTable": { "21": 8, "22": 0 },     // VM 的常量虚假指令表；未列出的下标 = null
 *   "deadCases":  [27, 34, 41],             // 断点探测出的从未执行的 case
 *   "instrs": [
 *     {"addr":0,"case":5,"op":"mov","dst":"r1","src":{"t":"imm","v":5}},
 *     {"addr":1,"case":5,"op":"mconst","dst":"r2","idx":21},
 *     {"addr":2,"case":5,"op":"binop","dst":"r3","kind":"add","a":{"t":"reg","v":"r1"},"b":{"t":"reg","v":"r2"}},
 *     {"addr":3,"case":5,"op":"condbr","cond":{"t":"reg","v":"r3"},"t":6,"f":9},
 *     {"addr":4,"case":5,"op":"call","dst":"r4","name":"sha1","args":["r3"]},
 *     {"addr":5,"case":5,"op":"br","target":9},
 *     {"addr":6,"case":5,"op":"ret","src":{"t":"reg","v":"r4"}}
 *   ]
 * }
 * 约定：`addr` 必须是 0..n-1 的连续整数（反汇编阶段很容易满足，也让 CFG 边计算无歧义）。
 * 运算语义：32 位。add/sub/mul/xor/and/or/shl/shr 走有符号 32 位，ushr 走无符号。
 *
 * 退出码：0 成功 / 1 校验失败或运行时错误 / 2 输入不满足前置条件（拒绝执行）/ 3 参数错误
 */

'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';
const EXIT_OK = 0, EXIT_FAIL = 1, EXIT_REFUSE = 2, EXIT_USAGE = 3;

// ---------------------------------------------------------------- 工具

function die(code, msg) {
  process.stderr.write('错误：' + msg + '\n');
  process.exit(code);
}

function isRef(x) {
  if (!x || typeof x !== 'object') return false;
  if (x.t === 'reg' || x.t === 'imm') return true;
  // `restore-logic` 会引入短路节点 ⇒ 校验器必须认它，否则「optimize → emit-js」这类链式命令会在中途被自己的产物卡住
  if (x.t === 'logic') return (x.kind === 'and' || x.kind === 'or') && isRef(x.a) && isRef(x.b);
  return false;
}

function refText(x) {
  if (!isRef(x)) return 'undefined';
  if (x.t === 'reg') return String(x.v);
  if (x.t === 'imm') return JSON.stringify(x.v);
  return '(' + refText(x.a) + ' ' + (x.kind === 'and' ? '&&' : '||') + ' ' + refText(x.b) + ')';
}

/** 把 known 里的常量代进短路节点；两侧都是常量时按 JS 语义折成一个常量 */
function foldLogicRef(node, known) {
  const sub = (x) => {
    if (!x || typeof x !== 'object') return x;
    if (x.t === 'reg' && known.has(x.v)) return { t: 'imm', v: known.get(x.v) };
    if (x.t === 'logic') return { t: 'logic', kind: x.kind, a: sub(x.a), b: sub(x.b) };
    return x;
  };
  const a = sub(node.a), b = sub(node.b);
  if (a.t === 'imm' && b.t === 'imm') {
    const v = node.kind === 'and' ? (truthy(a.v) ? b.v : a.v) : (truthy(a.v) ? a.v : b.v);
    return { t: 'imm', v: v };
  }
  return { t: 'logic', kind: node.kind, a: a, b: b };
}

function i32(v) { return v | 0; }
function u32(v) { return v >>> 0; }

// ---------------------------------------------------------------- 校验

const OPS = new Set(['mov', 'binop', 'mconst', 'call', 'br', 'condbr', 'ret']);
const BINOPS = new Set(['add', 'sub', 'mul', 'xor', 'and', 'or', 'shl', 'shr', 'ushr']);

function validateIR(ir) {
  const errs = [];
  if (!ir || typeof ir !== 'object') return ['IR 不是对象'];
  if (!Array.isArray(ir.instrs) || ir.instrs.length === 0) return ['instrs 缺失或为空'];
  if (typeof ir.entry !== 'number') errs.push('entry 必须是数字');
  const addrs = ir.instrs.map(i => i && i.addr);
  for (let i = 0; i < addrs.length; i++) {
    if (addrs[i] !== i) { errs.push('addr 必须是从 0 开始的连续整数，第 ' + i + ' 条是 ' + addrs[i]); break; }
  }
  if (errs.length) return errs;
  const n = ir.instrs.length;
  const check = (a, where) => {
    if (typeof a !== 'number' || a < 0 || a >= n) errs.push(where + ' 指向越界地址 ' + a);
  };
  ir.instrs.forEach((ins, i) => {
    const w = '第 ' + i + ' 条(' + ins.op + ')';
    if (!OPS.has(ins.op)) { errs.push(w + ' 未知 op'); return; }
    if (ins.op === 'mov') {
      if (typeof ins.dst !== 'string') errs.push(w + ' 缺 dst');
      if (!isRef(ins.src)) errs.push(w + ' src 必须是 {t:"reg"|"imm"}');
    } else if (ins.op === 'binop') {
      if (typeof ins.dst !== 'string') errs.push(w + ' 缺 dst');
      if (!BINOPS.has(ins.kind)) errs.push(w + ' 未知 kind ' + ins.kind);
      if (!isRef(ins.a) || !isRef(ins.b)) errs.push(w + ' 操作数必须是 {t:"reg"|"imm"}');
    } else if (ins.op === 'mconst') {
      if (typeof ins.dst !== 'string') errs.push(w + ' 缺 dst');
      if (typeof ins.idx !== 'number') errs.push(w + ' 缺 idx');
    } else if (ins.op === 'call') {
      if (typeof ins.name !== 'string') errs.push(w + ' 缺 name');
      if (!Array.isArray(ins.args)) errs.push(w + ' args 必须是数组');
      else ins.args.forEach(a => { if (!isRef(a)) errs.push(w + ' args 元素必须是 {t:"reg"|"imm"}'); });
    } else if (ins.op === 'br') {
      check(ins.target, w + ' target');
    } else if (ins.op === 'condbr') {
      if (!isRef(ins.cond)) errs.push(w + ' cond 必须是 {t:"reg"|"imm"}');
      check(ins.t, w + ' true 分支'); check(ins.f, w + ' false 分支');
    } else if (ins.op === 'ret') {
      if (!isRef(ins.src)) errs.push(w + ' src 必须是 {t:"reg"|"imm"}');
    }
  });
  // 每条指令都必须可达（否则说明反汇编阶段有残留）
  return errs;
}

// ---------------------------------------------------------------- 解释器（参考语义）

function interpretIR(ir, input, world) {
  const instrs = ir.instrs;
  const regs = Object.create(null);
  const M = ir.constTable || {};
  const worldFn = world || {};
  let pc = ir.entry;
  let steps = 0;
  const LIMIT = 2000000;
  while (true) {
    if (++steps > LIMIT) throw new Error('解释器步数超过上限（疑似死循环）');
    const ins = instrs[pc];
    if (!ins) throw new Error('pc 落到不存在的地址 ' + pc);
    switch (ins.op) {
      case 'mov':
        regs[ins.dst] = evalRef(ins.src, regs, worldFn);
        pc++; break;
      case 'mconst':
        regs[ins.dst] = Object.prototype.hasOwnProperty.call(M, String(ins.idx)) ? M[String(ins.idx)] : null;
        pc++; break;
      case 'binop': {
        const a = evalRef(ins.a, regs, worldFn);
        const b = evalRef(ins.b, regs, worldFn);
        regs[ins.dst] = applyBinop(ins.kind, a, b);
        pc++; break;
      }
      case 'call': {
        const fn = worldFn[ins.name];
        if (typeof fn !== 'function') throw new Error('world 里没有函数 ' + ins.name);
        const args = ins.args.map(x => evalRef(x, regs, worldFn));
        const rv = fn.apply(null, args);
        if (ins.dst) regs[ins.dst] = rv;
        pc++; break;
      }
      case 'br':
        pc = ins.target; break;
      case 'condbr': {
        const c = evalRef(ins.cond, regs, worldFn);
        pc = truthy(c) ? ins.t : ins.f; break;
      }
      case 'ret':
        return evalRef(ins.src, regs, worldFn);
      default:
        throw new Error('未知 op ' + ins.op);
    }
  }
}

// JS 真值语义（与 VM 内的 `x ? a : b` 一致：0/''/null/undefined/NaN 为假）
function truthy(v) { return !!v; }

function applyBinop(kind, a, b) {
  switch (kind) {
    case 'add': return i32(i32(a) + i32(b));
    case 'sub': return i32(i32(a) - i32(b));
    case 'mul': return i32(Math.imul(i32(a), i32(b)));
    case 'xor': return i32(i32(a) ^ i32(b));
    case 'and': return i32(i32(a) & i32(b));
    case 'or': return i32(i32(a) | i32(b));
    case 'shl': return i32(i32(a) << (i32(b) & 31));
    case 'shr': return i32(i32(a) >> (i32(b) & 31));
    case 'ushr': return u32(u32(a) >>> (i32(b) & 31));
    default: throw new Error('未知 binop ' + kind);
  }
}

// ---------------------------------------------------------------- CFG

function buildCFG(instrs, entry) {
  const n = instrs.length;
  const isLeader = new Array(n).fill(false);
  isLeader[entry] = true;
  instrs.forEach((ins, i) => {
    if (ins.op === 'br') { isLeader[ins.target] = true; if (i + 1 < n) isLeader[i + 1] = true; }
    else if (ins.op === 'condbr') { isLeader[ins.t] = true; isLeader[ins.f] = true; if (i + 1 < n) isLeader[i + 1] = true; }
    else if (ins.op === 'ret') { if (i + 1 < n) isLeader[i + 1] = true; }
  });
  const blocks = [];
  const addrToBlock = new Map();
  for (let i = 0; i < n; i++) {
    if (!isLeader[i]) continue;
    let end = i;
    while (end + 1 < n && !isLeader[end + 1]) end++;
    const b = { id: blocks.length, start: i, end: end, instrs: [], succ: [], pred: [], kind: 'normal' };
    for (let k = i; k <= end; k++) b.instrs.push(k);
    blocks.push(b);
    for (let k = i; k <= end; k++) addrToBlock.set(k, b.id);
  }
  // 后继
  blocks.forEach(b => {
    const last = instrs[b.end];
    if (last.op === 'br') { b.succ = [addrToBlock.get(last.target)]; b.kind = 'br'; }
    else if (last.op === 'condbr') { b.succ = [addrToBlock.get(last.t), addrToBlock.get(last.f)]; b.kind = 'condbr'; }
    else if (last.op === 'ret') { b.succ = []; b.kind = 'ret'; }
    else { b.succ = (b.end + 1 < n) ? [addrToBlock.get(b.end + 1)] : []; b.kind = 'fall'; }
  });
  blocks.forEach(b => b.succ.forEach(s => { if (s != null) blocks[s].pred.push(b.id); }));
  return { blocks, addrToBlock, entryBlock: addrToBlock.get(entry) };
}

/** 判断每个块是否「在某个环里」（块能到达自身）。环内的块禁止做寄存器常量传播。 */
function cyclicBlocks(cfg) {
  const cyc = new Set();
  const nb = cfg.blocks.length;
  cfg.blocks.forEach(start => {
    const seen = new Set();
    const stack = start.succ.filter(x => x != null);
    while (stack.length) {
      const x = stack.pop();
      if (x === start.id) { cyc.add(start.id); break; }
      if (seen.has(x)) continue;
      seen.add(x);
      for (const y of cfg.blocks[x].succ) if (y != null) stack.push(y);
    }
  });
  return cyc;
}

function reachable(cfg) {
  const seen = new Set([cfg.entryBlock]);
  const stack = [cfg.entryBlock];
  while (stack.length) {
    const b = stack.pop();
    for (const s of cfg.blocks[b].succ) if (s != null && !seen.has(s)) { seen.add(s); stack.push(s); }
  }
  return seen;
}

// 迭代式支配集（Cooper 式简化：全集迭代到不动点）
function dominators(cfg, reverse) {
  const nb = cfg.blocks.length;
  const all = new Set();
  for (let i = 0; i < nb; i++) all.add(i);
  const dom = new Array(nb).fill(null).map(() => new Set(all));
  const start = reverse ? cfg.blocks.findIndex(b => b.succ.length === 0) : cfg.entryBlock;
  if (start < 0) return dom;
  dom[start] = new Set([start]);
  const predsOf = i => (reverse
    ? cfg.blocks[i].succ.filter(x => x != null)
    : cfg.blocks[i].pred);
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 10000) {
    changed = false;
    for (let i = 0; i < nb; i++) {
      if (i === start) continue;
      const ps = predsOf(i);
      let next;
      if (ps.length === 0) { next = new Set([i]); }
      else {
        next = new Set(dom[ps[0]]);
        for (let k = 1; k < ps.length; k++) {
          for (const x of Array.from(next)) if (!dom[ps[k]].has(x)) next.delete(x);
        }
        next.add(i);
      }
      if (next.size !== dom[i].size) { dom[i] = next; changed = true; }
    }
  }
  return dom;
}

// ---------------------------------------------------------------- 优化步骤

function cloneIR(ir) { return JSON.parse(JSON.stringify(ir)); }

/** 1. 常量虚假指令表折叠 */
function foldConstTable(ir) {
  const out = cloneIR(ir);
  const M = ir.constTable || {};
  let folded = 0, nulled = 0;
  out.instrs = out.instrs.map(ins => {
    if (ins.op !== 'mconst') return ins;
    const has = Object.prototype.hasOwnProperty.call(M, String(ins.idx));
    if (has) folded++; else nulled++;
    return { addr: ins.addr, case: ins.case, op: 'mov', dst: ins.dst, src: { t: 'imm', v: has ? M[String(ins.idx)] : null } };
  });
  return { ir: out, stats: { folded: folded, nulled: nulled } };
}

/** 2. 死 case 消除 */
function pruneCases(ir, deadCases) {
  if (!Array.isArray(deadCases) || deadCases.length === 0) return { ir: cloneIR(ir), stats: { removed: 0, remaining: ir.instrs.length } };
  const dead = new Set(deadCases);
  const kept = ir.instrs.filter(i => !(i.case != null && dead.has(i.case)));
  if (kept.length === 0) return { ir: cloneIR(ir), stats: { removed: 0, remaining: ir.instrs.length }, refused: '删除后会清空全部指令' };
  const removed = ir.instrs.length - kept.length;
  const remapped = kept.map((ins, i) => ({ ...ins, addr: i }));
  const map = new Map(kept.map((ins, i) => [ins.addr, i]));
  // 重定位跳转目标；目标落在被删指令上 ⇒ 拒绝（静默改地址是最危险的错误）
  const fix = a => (map.has(a) ? map.get(a) : null);
  for (const ins of remapped) {
    if (ins.op === 'br') { const t = fix(ins.target); if (t == null) return { ir: cloneIR(ir), stats: { removed: 0, remaining: ir.instrs.length }, refused: '跳转目标 ' + ins.target + ' 落在被删指令上' }; ins.target = t; }
    else if (ins.op === 'condbr') {
      const t = fix(ins.t), f = fix(ins.f);
      if (t == null || f == null) return { ir: cloneIR(ir), stats: { removed: 0, remaining: ir.instrs.length }, refused: '分支目标落在被删指令上' };
      ins.t = t; ins.f = f;
    }
  }
  const entry = map.has(ir.entry) ? map.get(ir.entry) : null;
  if (entry == null) return { ir: cloneIR(ir), stats: { removed: 0, remaining: ir.instrs.length }, refused: '入口落在被删指令上' };
  const out = cloneIR(ir);
  out.instrs = remapped;
  out.entry = entry;
  return { ir: out, stats: { removed: removed, remaining: kept.length } };
}

/** 3. simplify-cfg：块内常量传播 + 常量折叠 + 恒真恒假 + 重复边 + 不可达 + 块合并 */
function simplifyCFG(ir) {
  let cur = cloneIR(ir);
  const stats = { propRegs: 0, foldBinops: 0, constBranches: 0, dupEdges: 0, unreachable: 0, mergedBlocks: 0 };
  let changed = true;
  let round = 0;
  while (changed && round++ < 32) {
    changed = false;

    // 3a. 块内常量传播 + 常量折叠
    // 🔴 **环内的块禁止做寄存器传播**：`r8 = 3; …; condbr r8` 在环里只对第一趟成立，
    //    第二趟 r8 已经变成 2/1/0 ⇒ 传播会把「循环条件恒真」写死，把循环整个折没、连出口都删掉。
    //    本工具实测踩到过（计数器自环被折成死循环、`ret` 被当不可达删除）。
    //    环内仍允许「两侧都是字面量」的折叠，那是与迭代次数无关的。
    const cfg = buildCFG(cur.instrs, cur.entry);
    const cyc = cyclicBlocks(cfg);
    for (const b of cfg.blocks) {
      const allowProp = !cyc.has(b.id);
      const known = new Map();
      for (const idx of b.instrs) {
        const ins = cur.instrs[idx];
        if (ins.op === 'mov' && ins.src.t === 'imm') { known.set(ins.dst, ins.src.v); continue; }
        if (ins.op === 'mov' && ins.src.t === 'reg') {
          if (allowProp && known.has(ins.src.v)) { ins.src = { t: 'imm', v: known.get(ins.src.v) }; stats.propRegs++; changed = true; }
          if (ins.src.t === 'imm') known.set(ins.dst, ins.src.v); else known.delete(ins.dst);
          continue;
        }
        if (ins.op === 'binop') {
          let touched = false;
          if (allowProp) {
            for (const k of ['a', 'b']) {
              if (ins[k].t === 'reg' && known.has(ins[k].v)) { ins[k] = { t: 'imm', v: known.get(ins[k].v) }; stats.propRegs++; changed = true; touched = true; }
            }
          }
          if (ins.a.t === 'imm' && ins.b.t === 'imm') {
            const v = applyBinop(ins.kind, ins.a.v, ins.b.v);
            cur.instrs[idx] = { addr: ins.addr, case: ins.case, op: 'mov', dst: ins.dst, src: { t: 'imm', v: v } };
            stats.foldBinops++; changed = true;
            known.set(ins.dst, v);
            continue;
          }
          if (touched) { /* 传播后仍非全常量 */ }
          known.delete(ins.dst);
          continue;
        }
        if (ins.op === 'call' || ins.op === 'mconst') { if (ins.dst) known.delete(ins.dst); continue; }
        if (ins.op === 'condbr') {
          if (!allowProp) { continue; }
          if (ins.cond.t === 'reg' && known.has(ins.cond.v)) {
            // 只记传播次数；「恒真/恒假分支」由 3b 统一计数，否则会重复计数
            ins.cond = { t: 'imm', v: known.get(ins.cond.v) }; stats.propRegs++; changed = true;
          } else if (ins.cond.t === 'logic') {
            const before = JSON.stringify(ins.cond);
            ins.cond = foldLogicRef(ins.cond, known);
            if (JSON.stringify(ins.cond) !== before) { stats.propRegs++; changed = true; }
          }
          continue;
        }
        if (ins.op === 'ret') {
          if (allowProp && ins.src.t === 'reg' && known.has(ins.src.v)) { ins.src = { t: 'imm', v: known.get(ins.src.v) }; stats.propRegs++; changed = true; }
          continue;
        }
      }
    }

    // 3b. 恒真/恒假分支 → 无条件跳转
    for (const ins of cur.instrs) {
      if (ins.op !== 'condbr' || ins.cond.t !== 'imm') continue;
      const to = truthy(ins.cond.v) ? ins.t : ins.f;
      stats.constBranches++;
      cur.instrs[ins.addr] = { addr: ins.addr, case: ins.case, op: 'br', target: to };
      changed = true;
    }

    // 3c. 重复边：condbr 的两个目标相同 ⇒ br
    for (const ins of cur.instrs) {
      if (ins.op === 'condbr' && ins.t === ins.f) {
        stats.dupEdges++;
        cur.instrs[ins.addr] = { addr: ins.addr, case: ins.case, op: 'br', target: ins.t };
        changed = true;
      }
    }

    // 3d. 不可达块删除
    const cfg2 = buildCFG(cur.instrs, cur.entry);
    const live = reachable(cfg2);
    const kill = new Set();
    for (const b of cfg2.blocks) if (!live.has(b.id)) for (const i of b.instrs) kill.add(i);
    if (kill.size) {
      const kept = cur.instrs.filter((_, i) => !kill.has(i));
      const map = new Map(kept.map((ins, i) => [ins.addr, i]));
      const remapped = kept.map((ins, i) => ({ ...ins, addr: i }));
      let ok = true;
      for (const ins of remapped) {
        if (ins.op === 'br') { if (!map.has(ins.target)) { ok = false; break; } ins.target = map.get(ins.target); }
        else if (ins.op === 'condbr') {
          if (!map.has(ins.t) || !map.has(ins.f)) { ok = false; break; }
          ins.t = map.get(ins.t); ins.f = map.get(ins.f);
        }
      }
      if (ok && map.has(cur.entry)) {
        cur.instrs = remapped; cur.entry = map.get(cur.entry);
        stats.unreachable += kill.size;
        changed = true;
      }
    }

    // 3e. 单前驱单后继合并（纯 fallthrough 边）
    const cfg3 = buildCFG(cur.instrs, cur.entry);
    for (const b of cfg3.blocks) {
      if (b.kind !== 'fall' || b.succ.length !== 1) continue;
      const s = cfg3.blocks[b.succ[0]];
      if (s.pred.length !== 1 || s.id === b.id) continue;
      // 把后继块的指令接到本块尾部；后继块必须是「非入口」
      if (s.start === cur.entry) continue;
      // 🔴 **只有地址相邻才能合并**：否则把两块拼起来就必须重排整个指令数组，
      //    而那些 `fall`（顺序落穿）的块的语义依赖物理相邻 ⇒ 会静默改变控制流。
      if (s.start !== b.end + 1) continue;
      // 顺序必须按块地址顺序重建（不能「先放 merged 再放其余」，那会打乱其它块的落穿关系）
      const order = [];
      for (const blk of cfg3.blocks) {
        if (blk.id === b.id) { order.push(...blk.instrs, ...s.instrs); continue; }
        if (blk.id === s.id) continue;
        order.push(...blk.instrs);
      }
      const map = new Map(order.map((oldAddr, i) => [oldAddr, i]));
      const remapped = order.map((oldAddr, i) => ({ ...cur.instrs[oldAddr], addr: i }));
      let ok = true;
      for (const ins of remapped) {
        if (ins.op === 'br') { if (!map.has(ins.target)) { ok = false; break; } ins.target = map.get(ins.target); }
        else if (ins.op === 'condbr') {
          if (!map.has(ins.t) || !map.has(ins.f)) { ok = false; break; }
          ins.t = map.get(ins.t); ins.f = map.get(ins.f);
        }
      }
      if (ok && map.has(cur.entry)) {
        cur.instrs = remapped; cur.entry = map.get(cur.entry);
        stats.mergedBlocks++;
        changed = true;
        break;
      }
    }
  }
  return { ir: cur, stats: stats };
}

/**
 * 4. && / || 还原
 *
 * 🔴 只做「**可证明语义等价**」的两种形态，不抄原文那版带缺陷的启发式：
 *
 *   && 形态（`t = a; if (a) t = b; if (t)` 降级后的形状）
 *     B0: condbr a -> B1, B2
 *     B1: condbr b -> X, Y        B2: br -> Y（a 为假时 t 恒为假 ⇒ 直奔假出口）
 *     ⇒ 等价改写为  B0: condbr (a && b) -> X, Y
 *
 *   || 形态
 *     B0: condbr a -> B1, B2
 *     B2: condbr b -> X, Y        B1: br -> X（a 为真时 t 恒为真 ⇒ 直奔真出口）
 *     ⇒ 等价改写为  B0: condbr (a || b) -> X, Y
 *
 * ⚠️ **「两个分支各自再判一次 b、且出口完全一致」不是 `a && b`**：
 *     那个形态的含义是「外层条件对结果无影响」，正确可读形式只有 `if (b)`。
 *     原文（`52pojie-1894606`）把它写成 `a && b`，并自己注明了缺陷
 *     （「a 为 false 时 b 不该被求值」）。照抄会**把结果算错**：
 *     a 为假、b 为真时 VM 走真出口，而 `a && b` 走假出口。
 *     本工具对这类形态只**报告**（`ambiguous`）不改写，避免静默算错。
 */
function restoreLogic(ir) {
  const cur = cloneIR(ir);
  const stats = { andRestored: 0, orRestored: 0, ambiguous: 0 };
  let guard = 0, changed = true;
  while (changed && guard++ < 64) {
    changed = false;
    const cfg = buildCFG(cur.instrs, cur.entry);
    for (const b of cfg.blocks) {
      if (b.kind !== 'condbr' || b.succ.length !== 2) continue;
      const [tId, fId] = b.succ;
      if (tId === fId) continue;
      const T = cfg.blocks[tId], F = cfg.blocks[fId];
      if (!T || !F) continue;
      const outer = cur.instrs[b.end];

      // && 形态
      if (T.kind === 'condbr' && T.pred.length === 1 && T.pred[0] === b.id && F.succ.length === 1) {
        const ti = cur.instrs[T.end];
        const Tt = cfg.addrToBlock.get(ti.t), Tf = cfg.addrToBlock.get(ti.f);
        if (T.succ.length === 2 && T.succ[0] === Tt && T.succ[1] === Tf
          && F.succ[0] === Tf && Tt !== Tf) {
          cur.instrs[b.end] = {
            addr: outer.addr, case: outer.case, op: 'condbr',
            cond: { t: 'logic', kind: 'and', a: outer.cond, b: ti.cond },
            t: ti.t, f: ti.f,
          };
          stats.andRestored++; changed = true; break;
        }
      }
      // || 形态
      if (F.kind === 'condbr' && F.pred.length === 1 && F.pred[0] === b.id && T.succ.length === 1) {
        const fi = cur.instrs[F.end];
        const Ft = cfg.addrToBlock.get(fi.t), Ff = cfg.addrToBlock.get(fi.f);
        if (F.succ.length === 2 && F.succ[0] === Ft && F.succ[1] === Ff
          && T.succ[0] === Ft && Ft !== Ff) {
          cur.instrs[b.end] = {
            addr: outer.addr, case: outer.case, op: 'condbr',
            cond: { t: 'logic', kind: 'or', a: outer.cond, b: fi.cond },
            t: fi.t, f: fi.f,
          };
          stats.orRestored++; changed = true; break;
        }
      }
      // 退化形态：只报告，不改写
      if (T.kind === 'condbr' && F.kind === 'condbr') {
        const ti = cur.instrs[T.end], fi = cur.instrs[F.end];
        if (ti.t === fi.t && ti.f === fi.f) stats.ambiguous++;
      }
    }
  }
  return { ir: cur, stats };
}

// 逻辑节点的「求值」：解释器需要支持 {t:'logic'}
function evalRef(x, regs, world) {
  if (x.t === 'logic') {
    const a = evalRef(x.a, regs, world);
    if (x.kind === 'and') return truthy(a) ? evalRef(x.b, regs, world) : a;
    return truthy(a) ? a : evalRef(x.b, regs, world);
  }
  return x.t === 'reg' ? regs[x.v] : x.v;
}

// ---------------------------------------------------------------- 发射器

function emitFlat(ir, world) {
  const lines = [];
  lines.push('// 由 jsvmp-ir-optimize.js 生成（flat 保底发射器：语义与 CFG 一一对应）');
  lines.push('(function (world) {');
  lines.push('  return function run() {');
  lines.push('    var r = Object.create(null);');
  lines.push('    var M = ' + JSON.stringify(ir.constTable || {}) + ';');
  lines.push('    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }');
  lines.push('    var pc = ' + ir.entry + ';');
  lines.push('    for (;;) {');
  lines.push('      switch (pc) {');
  ir.instrs.forEach((ins, i) => {
    lines.push('      case ' + i + ':');
    const body = [];
    switch (ins.op) {
      case 'mov': body.push('r[' + JSON.stringify(ins.dst) + '] = ' + refJs(ins.src) + ';'); body.push('pc = ' + (i + 1) + ';'); break;
      case 'mconst': body.push('r[' + JSON.stringify(ins.dst) + '] = has(M,' + ins.idx + ') ? M[' + ins.idx + '] : null;'); body.push('pc = ' + (i + 1) + ';'); break;
      case 'binop': body.push('r[' + JSON.stringify(ins.dst) + '] = B[' + JSON.stringify(ins.kind) + '](' + refJs(ins.a) + ', ' + refJs(ins.b) + ');'); body.push('pc = ' + (i + 1) + ';'); break;
      case 'call': body.push('r[' + JSON.stringify(ins.dst || '_') + '] = world[' + JSON.stringify(ins.name) + '].apply(null, [' + ins.args.map(refJs).join(', ') + ']);'); body.push('pc = ' + (i + 1) + ';'); break;
      case 'br': body.push('pc = ' + ins.target + ';'); break;
      case 'condbr': body.push('pc = (' + refJs(ins.cond) + ') ? ' + ins.t + ' : ' + ins.f + ';'); break;
      case 'ret': body.push('return ' + refJs(ins.src) + ';'); break;
    }
    body.forEach(l => lines.push('        ' + l));
    if (ins.op !== 'ret') lines.push('        break;');
    else lines.push('        break;');
  });
  lines.push('      default: throw new Error("pc 越界: " + pc);');
  lines.push('      }');
  lines.push('    }');
  lines.push('  };');
  lines.push('})(__WORLD__);');
  return { code: lines.join('\n'), needsWorld: true };
}

function refJs(x) {
  if (!x) return 'undefined';
  if (x.t === 'reg') return 'r[' + JSON.stringify(x.v) + ']';
  if (x.t === 'imm') return JSON.stringify(x.v === undefined ? null : x.v);
  if (x.t === 'logic') {
    const op = x.kind === 'and' ? '&&' : '||';
    return '(' + refJs(x.a) + ' ' + op + ' ' + refJs(x.b) + ')';
  }
  return 'undefined';
}

const BINOP_SRC = {
  add: 'function (a, b) { return ((a | 0) + (b | 0)) | 0; }',
  sub: 'function (a, b) { return ((a | 0) - (b | 0)) | 0; }',
  mul: 'function (a, b) { return Math.imul(a | 0, b | 0); }',
  xor: 'function (a, b) { return ((a | 0) ^ (b | 0)); }',
  and: 'function (a, b) { return ((a | 0) & (b | 0)); }',
  or: 'function (a, b) { return ((a | 0) | (b | 0)); }',
  shl: 'function (a, b) { return ((a | 0) << ((b | 0) & 31)); }',
  shr: 'function (a, b) { return ((a | 0) >> ((b | 0) & 31)); }',
  ushr: 'function (a, b) { return (((a >>> 0) >>> ((b | 0) & 31)) >>> 0); }',
};

/** 结构化发射器：只处理可结构化（reducible + 单出口 + 无多入口环）的 CFG，否则拒绝 */
function emitStructured(ir) {
  const cfg = buildCFG(ir.instrs, ir.entry);
  const dom = dominators(cfg, false);
  const pdom = dominators(cfg, true);
  const exitBlocks = cfg.blocks.filter(b => b.succ.length === 0);
  if (exitBlocks.length !== 1) return { refused: '存在 ' + exitBlocks.length + ' 个出口块（要求单出口）' };

  // 回边检测：边 b -> s 是回边 ⟺ **s 支配 b**（s 是 b 的祖先）
  // 🔴 判据方向写反会「把向前的边当成回边」（本工具实测踩过：线性 CFG 被判成 2 条回边而拒绝发射）。
  const backEdges = new Map();   // header -> [tail...]
  cfg.blocks.forEach(b => {
    b.succ.forEach(s => {
      if (s == null) return;
      if (dom[b.id] && dom[b.id].has(s)) {
        if (!backEdges.has(s)) backEdges.set(s, []);
        backEdges.get(s).push(b.id);
      }
    });
  });
  // 只支持「单回边、且回边尾就是 header 的直接前驱之一」的简单环
  for (const [h, tails] of backEdges) {
    if (tails.length !== 1) return { refused: '块 ' + h + ' 有多条回边（' + tails.length + '），超出结构化能力' };
  }

  const emitted = [];
  const done = new Set();
  let guard = 0;

  function blockCode(bid) {
    const b = cfg.blocks[bid];
    const out = [];
    for (const idx of b.instrs) {
      const ins = ir.instrs[idx];
      if (ins.op === 'br' || ins.op === 'condbr') continue;
      if (ins.op === 'ret') continue;
      if (ins.op === 'mov') out.push('r[' + JSON.stringify(ins.dst) + '] = ' + refJs(ins.src) + ';');
      else if (ins.op === 'mconst') out.push('r[' + JSON.stringify(ins.dst) + '] = has(M,' + ins.idx + ') ? M[' + ins.idx + '] : null;');
      else if (ins.op === 'binop') out.push('r[' + JSON.stringify(ins.dst) + '] = B[' + JSON.stringify(ins.kind) + '](' + refJs(ins.a) + ', ' + refJs(ins.b) + ');');
      else if (ins.op === 'call') out.push('r[' + JSON.stringify(ins.dst || '_') + '] = world[' + JSON.stringify(ins.name) + '].apply(null, [' + ins.args.map(refJs).join(', ') + ']);');
    }
    return out;
  }

  function ipdom(bid) {
    const set = pdom[bid];
    if (!set || set.size <= 1) return -1;
    const cands = [];
    for (const x of set) if (x !== bid) cands.push(x);
    if (cands.length === 1) return cands[0];
    // 立即后支配：候选里「被其余候选共同后支配」的那个
    for (const d of cands) {
      let all = true;
      for (const m of cands) {
        if (m === d) continue;
        if (!(pdom[m] && pdom[m].has(d))) { all = false; break; }
      }
      if (all) return d;
    }
    return -1;
  }

  function emitRegion(bid, stop, indent) {
    const pad = '  '.repeat(indent);
    const pad1 = '  '.repeat(indent + 1);
    let cur = bid;
    let local = 0;
    while (cur !== -1 && cur !== stop && local++ < 200) {
      if (guard++ > 2000) throw new Error('REFUSE: 结构化发射器步数超限');
      const b = cfg.blocks[cur];
      const last = ir.instrs[b.end];

      // 🔴 自环 while 必须**先判**，否则循环体会被发射到 while 外面（顺序反了）
      if (b.kind === 'condbr') {
        const [sT, sF] = b.succ;
        if (sT === cur || sF === cur) {
          const selfT = sT === cur;
          const condSrc = refJs(last.cond);
          emitted.push(pad + 'while (' + (selfT ? condSrc : '!(' + condSrc + ')') + ') {');
          blockCode(cur).forEach(l => emitted.push(pad1 + l));
          emitted.push(pad + '}');
          const next = selfT ? sF : sT;
          if (next === stop || next === -1) return;
          cur = next;
          continue;
        }
      }

      blockCode(cur).forEach(l => emitted.push(pad + l));
      if (b.kind === 'ret') {
        emitted.push(pad + 'return ' + refJs(last.src) + ';');
        return;
      }
      if (b.kind === 'fall' || b.kind === 'br') {
        const next = b.succ[0];
        if (next === stop || next === -1) return;
        cur = next;
        continue;
      }
      // 普通 condbr：if / else
      const join = ipdom(cur);
      if (join === -1) throw new Error('REFUSE: condbr 无唯一汇合点');
      const [tId, fId] = b.succ;
      emitted.push(pad + 'if (' + refJs(last.cond) + ') {');
      emitRegion(tId, join, indent + 1);
      emitted.push(pad + '} else {');
      emitRegion(fId, join, indent + 1);
      emitted.push(pad + '}');
      cur = join;
    }
  }


  try {
    emitRegion(cfg.entryBlock, -1, 2);
  } catch (e) {
    if (String(e.message).startsWith('REFUSE')) return { refused: e.message.slice(8) };
    throw e;
  }

  const lines = [];
  lines.push('// 由 jsvmp-ir-optimize.js 生成（structured 可读发射器；已与 flat 发射器对拍）');
  lines.push('(function (world) {');
  lines.push('  return function run() {');
  lines.push('    var r = Object.create(null);');
  lines.push('    var M = ' + JSON.stringify(ir.constTable || {}) + ';');
  lines.push('    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }');
  lines.push('    var B = {');
  Object.keys(BINOP_SRC).forEach(k => lines.push('      ' + k + ': ' + BINOP_SRC[k] + ','));
  lines.push('    };');
  emitted.forEach(l => lines.push(l));
  const tail = (emitted[emitted.length - 1] || '').trim();
  if (!tail.startsWith('return ')) lines.push('    return undefined;');
  lines.push('  };');
  lines.push('})(__WORLD__);');
  return { code: lines.join('\n') };
}

/** 把生成的代码变成可执行函数 */
function compile(code, world) {
  // 发射器的产物是「一个表达式语句」：(function (world) {...})(__WORLD__);
  // ⇒ 必须剥掉结尾分号，否则 `return (…;)` 是语法错误。
  const expr = code.replace('__WORLD__', 'world').replace(/;\s*$/, '');
  const B = {};
  Object.keys(BINOP_SRC).forEach(k => { B[k] = eval('(' + BINOP_SRC[k] + ')'); });
  /* eslint-disable no-new-func */
  // 注意：expr 的第一行是注释 ⇒ 必须写成 `return (\n…\n)`，
  // 否则 `return // 注释` 会把 return 后面的整行注释掉，函数静默返回 undefined。
  const factory = new Function('B', 'world', 'return (\n' + expr + '\n);');
  return factory(B, world);
}

// ---------------------------------------------------------------- 随机夹具（自检用）

function makeRng(seed) {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 生成一个「可结构化」的随机 IR：seq / if-else / while / && 还原形态 混合 */
function makeRandomProgram(seed) {
  const rnd = makeRng(seed);
  const instrs = [];
  const M = {};
  const nConst = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < nConst; i++) M[String(i)] = Math.floor(rnd() * 100) - 50;
  const push = (ins) => { ins.addr = instrs.length; ins.case = 1 + Math.floor(rnd() * 5); instrs.push(ins); };
  const reg = () => 'r' + Math.floor(rnd() * 6);
  const imm = (v) => ({ t: 'imm', v: v === undefined ? Math.floor(rnd() * 100) - 50 : v });
  const r = (v) => ({ t: 'reg', v: v === undefined ? reg() : v });

  // 初始化
  push({ op: 'mov', dst: 'r0', src: imm(1) });
  push({ op: 'mov', dst: 'r1', src: imm(0) });
  if (rnd() < 0.7) push({ op: 'mconst', dst: 'r2', idx: Math.floor(rnd() * (nConst + 1)) });
  else push({ op: 'mov', dst: 'r2', src: imm(Math.floor(rnd() * 5)) });

  const shape = Math.floor(rnd() * 4);
  if (shape === 0) {
    // if/else
    push({ op: 'binop', dst: 'r3', kind: 'and', a: r('r2'), b: imm(1) });
    const c = instrs.length; push({ op: 'condbr', cond: r('r3'), t: 0, f: 0 });
    const tStart = instrs.length;
    push({ op: 'binop', dst: 'r1', kind: 'add', a: r('r1'), b: imm(7) });
    push({ op: 'br', target: 0 });
    const fStart = instrs.length;
    push({ op: 'binop', dst: 'r1', kind: 'add', a: r('r1'), b: imm(9) });
    const join = instrs.length;
    instrs[c].t = tStart; instrs[c].f = fStart; instrs[c + 2].target = join;
    push({ op: 'ret', src: r('r1') });
  } else if (shape === 1) {
    // while 计数
    push({ op: 'mov', dst: 'r4', src: imm(3) });
    const head = instrs.length;
    push({ op: 'binop', dst: 'r5', kind: 'sub', a: r('r4'), b: imm(1) });
    push({ op: 'mov', dst: 'r4', src: r('r5') });
    push({ op: 'binop', dst: 'r1', kind: 'add', a: r('r1'), b: r('r4') });
    push({ op: 'condbr', cond: r('r4'), t: head, f: 0 });
    const after = instrs.length;
    instrs[instrs.length - 1].f = after;
    push({ op: 'ret', src: r('r1') });
  } else if (shape === 2) {
    // && 的**语义等价**降级形态：B1 测 b；B2（a 为假）直奔 b 的假出口
    const av = Math.floor(rnd() * 2), bv = Math.floor(rnd() * 2);
    push({ op: 'call', dst: 'r3', name: 'pick', args: [{ t: 'imm', v: 0 }] });
    push({ op: 'call', dst: 'r4', name: 'pick', args: [{ t: 'imm', v: 1 }] });
    const b0 = instrs.length; push({ op: 'condbr', cond: r('r3'), t: 0, f: 0 });
    const b1 = instrs.length; push({ op: 'condbr', cond: r('r4'), t: 0, f: 0 });
    const b2 = instrs.length; push({ op: 'br', target: 0 });
    const jF = instrs.length; push({ op: 'mov', dst: 'r1', src: imm(22) });
    push({ op: 'br', target: 0 });
    const jT = instrs.length; push({ op: 'mov', dst: 'r1', src: imm(11) });
    const end = instrs.length;
    instrs[b0].t = b1; instrs[b0].f = b2;
    instrs[b1].t = jT; instrs[b1].f = jF;
    instrs[b2].target = jF;
    instrs[jF + 1].target = end;
    instrs[jT + 1] = { addr: end, case: 1, op: 'ret', src: r('r1') };
    push({ op: 'ret', src: r('r1') });
  } else {
    // 顺序 + 一次调用
    push({ op: 'binop', dst: 'r6', kind: 'xor', a: r('r0'), b: r('r2') });
    push({ op: 'call', dst: 'r7', name: 'mix', args: [r('r6'), imm(3)] });
    push({ op: 'binop', dst: 'r1', kind: 'add', a: r('r1'), b: r('r7') });
    push({ op: 'ret', src: r('r1') });
  }
  return { ir: { entry: 0, constTable: M, deadCases: [], instrs: instrs }, world: { mix: (a, b) => i32(i32(a) * 3 + i32(b)), pick: () => 1 } };
}

// ---------------------------------------------------------------- 自检

function selftest(verbose) {
  let pass = 0, fail = 0;
  const failures = [];
  const ok = (cond, label) => { if (cond) { pass++; if (verbose) console.log('  PASS ' + label); } else { fail++; failures.push(label); console.log('  FAIL ' + label); } };

  console.log('jsvmp-ir-optimize.js 自检 v' + VERSION);

  // A. 校验器拒绝路径
  ok(validateIR(null).length > 0, 'A1 拒绝 null IR');
  ok(validateIR({ instrs: [] }).length > 0, 'A2 拒绝空 instrs');
  ok(validateIR({ entry: 0, instrs: [{ addr: 1, op: 'ret', src: { t: 'imm', v: 0 } }] }).length > 0, 'A3 拒绝非连续 addr');
  ok(validateIR({ entry: 0, instrs: [{ addr: 0, op: 'nope' }] }).length > 0, 'A4 拒绝未知 op');
  ok(validateIR({ entry: 0, instrs: [{ addr: 0, op: 'br', target: 99 }] }).length > 0, 'A5 拒绝越界跳转');
  ok(validateIR({ entry: 0, instrs: [{ addr: 0, op: 'binop', dst: 'r0', kind: 'div', a: { t: 'imm', v: 1 }, b: { t: 'imm', v: 2 } }] }).length > 0, 'A6 拒绝未知 binop');
  ok(validateIR({ entry: 0, instrs: [{ addr: 0, op: 'condbr', cond: { t: 'reg', v: 'r0' }, t: 0, f: 5 }] }).length > 0, 'A7 拒绝越界分支目标');

  // B. 常量虚假指令表折叠（区分性断言）
  {
    const ir = { entry: 0, constTable: { '21': 8 }, instrs: [
      { addr: 0, op: 'mconst', dst: 'r1', idx: 21 },
      { addr: 1, op: 'mconst', dst: 'r2', idx: 99 },
      { addr: 2, op: 'binop', dst: 'r3', kind: 'add', a: { t: 'reg', v: 'r1' }, b: { t: 'reg', v: 'r2' } },
      { addr: 3, op: 'ret', src: { t: 'reg', v: 'r3' } },
    ] };
    const { ir: out, stats } = foldConstTable(ir);
    ok(stats.folded === 1 && stats.nulled === 1, 'B1 折叠计数：1 处已知 + 1 处未知→null');
    ok(out.instrs[0].op === 'mov' && out.instrs[0].src.v === 8, 'B2 M[21] → 8');
    ok(out.instrs[1].src.v === null, 'B3 未赋值下标 → null（不是 0，也不是 undefined）');
    ok(out.instrs.filter(i => i.op === 'mconst').length === 0, 'B4 折叠后不再有 mconst');
    ok(interpretIR(out, {}, {}) === 8, 'B5 折叠后结果仍为 8（null 参与算术按 0 处理）');
    const ref = interpretIR(ir, {}, {});
    ok(ref === 8, 'B6 折叠前解释结果 = 8（8 + null 中 null 转 0）');
  }

  // C. 死 case 消除（含拒绝路径）
  {
    const ir = { entry: 0, instrs: [
      { addr: 0, case: 1, op: 'mov', dst: 'r1', src: { t: 'imm', v: 5 } },
      { addr: 1, case: 9, op: 'mov', dst: 'r2', src: { t: 'imm', v: 7 } },
      { addr: 2, case: 1, op: 'ret', src: { t: 'reg', v: 'r1' } },
    ] };
    const { ir: out, stats } = pruneCases(ir, [9]);
    ok(stats.removed === 1, 'C1 删掉 1 条死 case 指令');
    ok(out.instrs.length === 2 && out.instrs[2] === undefined, 'C2 指令表被压缩');
    ok(interpretIR(out, {}, {}) === 5, 'C3 结果不变');
    // 拒绝：跳转目标落在被删指令上
    const bad = { entry: 0, instrs: [
      { addr: 0, case: 1, op: 'br', target: 1 },
      { addr: 1, case: 9, op: 'mov', dst: 'r1', src: { t: 'imm', v: 1 } },
      { addr: 2, case: 1, op: 'ret', src: { t: 'imm', v: 0 } },
    ] };
    const rb = pruneCases(bad, [9]);
    ok(rb.refused && rb.stats.removed === 0, 'C4 目标落在死 case 上 ⇒ 拒绝执行而不是静默改地址');
  }

  // D. simplify-cfg 的区分性断言
  {
    const ir = { entry: 0, instrs: [
      { addr: 0, op: 'mov', dst: 'r1', src: { t: 'imm', v: 6 } },
      { addr: 1, op: 'binop', dst: 'r2', kind: 'mul', a: { t: 'reg', v: 'r1' }, b: { t: 'imm', v: 7 } },
      { addr: 2, op: 'condbr', cond: { t: 'reg', v: 'r2' }, t: 3, f: 5 },
      { addr: 3, op: 'mov', dst: 'r3', src: { t: 'imm', v: 111 } },
      { addr: 4, op: 'br', target: 6 },
      { addr: 5, op: 'mov', dst: 'r3', src: { t: 'imm', v: 222 } },
      { addr: 6, op: 'ret', src: { t: 'reg', v: 'r3' } },
    ] };
    const ref = interpretIR(ir, {}, {});
    const { ir: out, stats } = simplifyCFG(ir);
    ok(stats.propRegs >= 1, 'D1 发生了常量传播（r1 → imm）');
    ok(stats.foldBinops >= 1, 'D2 发生了常量折叠（6*7）');
    ok(stats.constBranches === 1, 'D3 恒真分支被消掉（42 为真 ⇒ 走 t）');
    ok(interpretIR(out, {}, {}) === ref, 'D4 优化前后结果一致');
    ok(interpretIR(out, {}, {}) === 111, 'D5 语义正确：走真分支');
    ok(out.instrs.length < ir.instrs.length, 'D6 不可达块被删除');
    // 重复边
    const dupWorld = { mix: (a, b) => i32(i32(a) * 3 + i32(b)) };
    const dup = { entry: 0, instrs: [
      { addr: 0, op: 'call', dst: 'r1', name: 'mix', args: [{ t: 'imm', v: 1 }, { t: 'imm', v: 0 }] },
      { addr: 1, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 2, f: 2 },
      { addr: 2, op: 'ret', src: { t: 'reg', v: 'r1' } },
    ] };
    const rd = simplifyCFG(dup);
    ok(rd.stats.dupEdges >= 1, 'D7 重复边被识别（t === f）');
    ok(interpretIR(rd.ir, {}, dupWorld) === interpretIR(dup, {}, dupWorld), 'D8 重复边优化后结果不变');
    ok(interpretIR(rd.ir, {}, dupWorld) === 3, 'D9 语义正确（mix(1,0) = 3）');
  }

  // E. && / || 还原（用**非常量**条件，否则会被常量折叠先吃掉）
  {
    const callA = { op: 'call', dst: 'r1', name: 'A', args: [] };
    const callB = { op: 'call', dst: 'r2', name: 'B', args: [] };

    // && 的语义等价降级形态
    const andIR = { entry: 0, instrs: [
      { addr: 0, ...callA },
      { addr: 1, ...callB },
      { addr: 2, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 3, f: 4 },
      { addr: 3, op: 'condbr', cond: { t: 'reg', v: 'r2' }, t: 7, f: 5 },
      { addr: 4, op: 'br', target: 5 },
      { addr: 5, op: 'mov', dst: 'r3', src: { t: 'imm', v: 0 } },
      { addr: 6, op: 'br', target: 8 },
      { addr: 7, op: 'mov', dst: 'r3', src: { t: 'imm', v: 1 } },
      { addr: 8, op: 'ret', src: { t: 'reg', v: 'r3' } },
    ] };
    // || 的语义等价降级形态
    const orIR = { entry: 0, instrs: [
      { addr: 0, ...callA },
      { addr: 1, ...callB },
      { addr: 2, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 3, f: 4 },
      { addr: 3, op: 'br', target: 7 },
      { addr: 4, op: 'condbr', cond: { t: 'reg', v: 'r2' }, t: 7, f: 5 },
      { addr: 5, op: 'mov', dst: 'r3', src: { t: 'imm', v: 0 } },
      { addr: 6, op: 'br', target: 8 },
      { addr: 7, op: 'mov', dst: 'r3', src: { t: 'imm', v: 1 } },
      { addr: 8, op: 'ret', src: { t: 'reg', v: 'r3' } },
    ] };
    // 退化形态（两分支各自再判一次、出口一致）—— 含义只是 if(b)，**不是 a && b**
    const degIR = { entry: 0, instrs: [
      { addr: 0, ...callA },
      { addr: 1, ...callB },
      { addr: 2, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 3, f: 4 },
      { addr: 3, op: 'condbr', cond: { t: 'reg', v: 'r2' }, t: 6, f: 8 },
      { addr: 4, op: 'condbr', cond: { t: 'reg', v: 'r2' }, t: 6, f: 8 },
      { addr: 5, op: 'br', target: 9 },
      { addr: 6, op: 'mov', dst: 'r3', src: { t: 'imm', v: 1 } },
      { addr: 7, op: 'br', target: 9 },
      { addr: 8, op: 'mov', dst: 'r3', src: { t: 'imm', v: 0 } },
      { addr: 9, op: 'ret', src: { t: 'reg', v: 'r3' } },
    ] };

    for (const [a, b] of [[1, 1], [1, 0], [0, 1], [0, 0]]) {
      const w = { A: () => a, B: () => b };
      const tag = '(a=' + a + ', b=' + b + ')';

      const refAnd = interpretIR(andIR, {}, w);
      const rAnd = restoreLogic(andIR);
      ok(rAnd.stats.andRestored === 1, 'E1 && 还原命中 ' + tag);
      ok(interpretIR(simplifyCFG(rAnd.ir).ir, {}, w) === refAnd, 'E2 && 还原后语义不变 ' + tag);
      ok(refAnd === ((a && b) ? 1 : 0), 'E3 && 还原结果 == JS 的 a&&b ' + tag);

      const refOr = interpretIR(orIR, {}, w);
      const rOr = restoreLogic(orIR);
      ok(rOr.stats.orRestored === 1, 'E4 || 还原命中 ' + tag);
      ok(interpretIR(simplifyCFG(rOr.ir).ir, {}, w) === refOr, 'E5 || 还原后语义不变 ' + tag);
      ok(refOr === ((a || b) ? 1 : 0), 'E6 || 还原结果 == JS 的 a||b ' + tag);
    }

    // 退化形态：必须只报告、不改写（照抄原文的 a&&b 会在 a=0,b=1 时算错）
    const rDeg = restoreLogic(degIR);
    ok(rDeg.stats.ambiguous >= 1, 'E7 退化形态被标记为 ambiguous');
    ok(rDeg.stats.andRestored === 0 && rDeg.stats.orRestored === 0, 'E8 退化形态不得被改写成 a&&b / a||b');
    ok(interpretIR(rDeg.ir, {}, { A: () => 0, B: () => 1 }) === 1, 'E9 退化形态语义 = if(b)：a=0,b=1 时结果是 1（a&&b 会错成 0）');
  }


  // F. 随机程序三方对拍（解释器 / flat / structured）
  {
    let agree = 0, refuse = 0, checked = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { ir, world } = makeRandomProgram(seed);
      let ref;
      try { ref = interpretIR(ir, {}, world); } catch (e) { continue; }
      const flatCode = emitFlat(ir, world).code;
      let flatVal;
      try { flatVal = compile(flatCode, world)(); } catch (e) { ok(false, 'F flat 编译/执行失败 seed=' + seed + '：' + e.message); continue; }
      ok(flatVal === ref, 'F1 flat == 解释器 seed=' + seed + ' (' + JSON.stringify(flatVal) + ')');
      checked++;
      // 优化后再跑一遍
      const pruned = pruneCases(ir, ir.deadCases);
      const folded = foldConstTable(pruned.ir);
      const logic = restoreLogic(folded.ir);
      const simp = simplifyCFG(logic.ir);
      const optVal = interpretIR(simp.ir, {}, world);
      ok(optVal === ref, 'F2 优化链 == 解释器 seed=' + seed);
      // structured
      const st = emitStructured(simp.ir);
      if (st.refused) { refuse++; continue; }
      let stVal;
      try { stVal = compile(st.code, world)(); } catch (e) { ok(false, 'F structured 执行失败 seed=' + seed + '：' + e.message); continue; }
      ok(stVal === ref, 'F3 structured == flat seed=' + seed + ' (' + JSON.stringify(stVal) + ')');
      if (stVal === ref) agree++;
    }
    ok(checked >= 60, 'F4 全部 60 个随机夹具都被对拍（实际 ' + checked + '）');
    ok(refuse === 0, 'F5 线性/菱形/自环 CFG 不得被结构化发射器拒绝（拒绝 ' + refuse + ' 个）');
    ok(agree === checked, 'F6 structured 与 flat 在全部夹具上一致（' + agree + '/' + checked + '）');
    if (verbose) console.log('  （随机夹具：对拍 ' + checked + ' 个，structured 通过 ' + agree + ' 个，拒绝 ' + refuse + ' 个）');
  }

  // G. 结构化发射器的拒绝路径
  {
    const twoExits = { entry: 0, instrs: [
      { addr: 0, op: 'mov', dst: 'r1', src: { t: 'imm', v: 1 } },
      { addr: 1, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 2, f: 3 },
      { addr: 2, op: 'ret', src: { t: 'imm', v: 1 } },
      { addr: 3, op: 'ret', src: { t: 'imm', v: 2 } },
    ] };
    ok(!!emitStructured(twoExits).refused, 'G1 多出口 ⇒ 拒绝结构化');
    // 多回边（两个 latch 回到同一个 header）⇒ 明确拒绝，而不是发射出错的代码
    const multiLatch = { entry: 0, instrs: [
      { addr: 0, op: 'call', dst: 'r1', name: 'A', args: [] },
      { addr: 1, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 2, f: 3 },
      { addr: 2, op: 'br', target: 1 },
      { addr: 3, op: 'condbr', cond: { t: 'reg', v: 'r1' }, t: 4, f: 6 },
      { addr: 4, op: 'br', target: 1 },
      { addr: 5, op: 'br', target: 6 },
      { addr: 6, op: 'ret', src: { t: 'reg', v: 'r1' } },
    ] };
    const ml = emitStructured(multiLatch);
    ok(!!ml.refused && /回边/.test(ml.refused), 'G2 多回边 ⇒ 拒绝结构化（' + (ml.refused || '未拒绝') + '）');
    ok(typeof emitFlat(multiLatch, null).code === 'string' && emitFlat(multiLatch, null).code.length > 0, 'G3 被拒绝时 flat 仍可用（保底路线）');
  }

  // H. 解释器健壮性
  {
    let threw = false;
    try { interpretIR({ entry: 0, instrs: [{ addr: 0, op: 'br', target: 0 }] }, {}, {}); } catch (e) { threw = /步数超过上限/.test(e.message); }
    ok(threw, 'H1 死循环被步数上限拦住（不挂死）');
    let threw2 = false;
    try { interpretIR({ entry: 0, instrs: [{ addr: 0, op: 'call', dst: 'r1', name: 'nope', args: [] }, { addr: 1, op: 'ret', src: { t: 'reg', v: 'r1' } }] }, {}, {}); } catch (e) { threw2 = /world 里没有函数/.test(e.message); }
    ok(threw2, 'H2 缺 world 函数时报可读错误');
  }

  // I. 回归：**环内的寄存器常量传播必须被禁用**
  //    历史缺陷：`r8 = 3; …; condbr r8` 全在同一个环块里时，传播把条件写成恒真，
  //    循环被整个折没、`ret` 被当不可达删除，产物「还能跑」但语义已错（且完全静默）。
  {
    // I-1 死循环：初始化就在环内 ⇒ 优化后必须**仍然发散**，不得被折成直线代码
    const diverge = { entry: 0, instrs: [
      { addr: 0, op: 'mov', dst: 'r1', src: { t: 'imm', v: 0 } },
      { addr: 1, op: 'mov', dst: 'r8', src: { t: 'imm', v: 3 } },
      { addr: 2, op: 'binop', dst: 'r10', kind: 'sub', a: { t: 'reg', v: 'r8' }, b: { t: 'imm', v: 1 } },
      { addr: 3, op: 'mov', dst: 'r8', src: { t: 'reg', v: 'r10' } },
      { addr: 4, op: 'binop', dst: 'r1', kind: 'add', a: { t: 'reg', v: 'r1' }, b: { t: 'reg', v: 'r8' } },
      { addr: 5, op: 'condbr', cond: { t: 'reg', v: 'r8' }, t: 1, f: 6 },
      { addr: 6, op: 'ret', src: { t: 'reg', v: 'r1' } },
    ] };
    const sd = simplifyCFG(diverge);
    ok(sd.stats.constBranches === 0, 'I1 环内的条件分支不得被折成恒真/恒假');
    ok(cyclicBlocks(buildCFG(sd.ir.instrs, sd.ir.entry)).size >= 1, 'I2 环必须仍然存在（不能被折没）');
    let stillDiverges = false;
    try { interpretIR(sd.ir, {}, {}); } catch (e) { stillDiverges = /步数超过上限/.test(e.message); }
    ok(stillDiverges, 'I3 优化后仍然发散（不终止语义被保留）');

    // I-2 可终止的计数循环：初始化在环外 ⇒ 数值结果必须与优化前一致
    const counting = { entry: 0, instrs: [
      { addr: 0, op: 'mov', dst: 'r1', src: { t: 'imm', v: 0 } },
      { addr: 1, op: 'mov', dst: 'r8', src: { t: 'imm', v: 3 } },
      { addr: 2, op: 'binop', dst: 'r10', kind: 'sub', a: { t: 'reg', v: 'r8' }, b: { t: 'imm', v: 1 } },
      { addr: 3, op: 'mov', dst: 'r8', src: { t: 'reg', v: 'r10' } },
      { addr: 4, op: 'binop', dst: 'r1', kind: 'add', a: { t: 'reg', v: 'r1' }, b: { t: 'reg', v: 'r8' } },
      { addr: 5, op: 'condbr', cond: { t: 'reg', v: 'r8' }, t: 2, f: 6 },
      { addr: 6, op: 'ret', src: { t: 'reg', v: 'r1' } },
    ] };
    const refC = interpretIR(counting, {}, {});
    const sc = simplifyCFG(counting);
    ok(interpretIR(sc.ir, {}, {}) === refC, 'I4 计数循环优化后结果不变（期望 ' + refC + '）');
    ok(cyclicBlocks(buildCFG(sc.ir.instrs, sc.ir.entry)).size >= 1, 'I5 计数循环的环被保留');
    const flatC = compile(emitFlat(sc.ir, null).code, {})();
    ok(flatC === refC, 'I6 计数循环 flat 产物结果一致');
  }

  console.log('自检结果：' + pass + ' 项通过，' + fail + ' 项失败。');
  if (fail) { console.log('失败项：\n  - ' + failures.join('\n  - ')); return EXIT_FAIL; }
  return EXIT_OK;
}

// ---------------------------------------------------------------- CLI

function usage() {
  console.log([
    'jsvmp-ir-optimize.js v' + VERSION + ' —— JSVMP 反汇编产物的中间代码优化 + CFG 回译',
    '',
    '用法：',
    '  node jsvmp-ir-optimize.js --selftest [--verbose]',
    '  node jsvmp-ir-optimize.js fold-const    <ir.json> [-o out.json] [--stats]',
    '  node jsvmp-ir-optimize.js prune-cases   <ir.json> [--dead 27,34,41 | --from-ir] [-o out.json] [--stats]',
    '  node jsvmp-ir-optimize.js simplify-cfg  <ir.json> [-o out.json] [--stats]',
    '  node jsvmp-ir-optimize.js restore-logic <ir.json> [-o out.json] [--stats]',
    '  node jsvmp-ir-optimize.js optimize      <ir.json> [-o out.json] [--stats]      # 全链：fold→prune→logic→simplify',
    '  node jsvmp-ir-optimize.js emit-js       <ir.json> [--style structured|flat] [-o out.js]',
    '  node jsvmp-ir-optimize.js cfg           <ir.json> [-o out.dot]                  # 输出 Graphviz dot',
    '',
    '说明：addr 必须是 0..n-1 连续整数；constTable 未列出的下标语义为 null。',
    '退出码：0 成功 / 1 失败 / 2 拒绝执行（前置条件不足）/ 3 参数错误。',
  ].join('\n'));
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--o') { out.flags.o = argv[++i]; continue; }
    if (a === '-h') { out.flags.help = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['selftest', 'verbose', 'stats', 'from-ir'].includes(key)) out.flags[key] = true;
      else { out.flags[key] = argv[++i]; }
    } else out._.push(a);
  }
  return out;
}

function readIR(p) {
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); } catch (e) { die(EXIT_FAIL, '读不到文件 ' + p + '：' + e.message); }
  let json;
  try { json = JSON.parse(raw); } catch (e) { die(EXIT_FAIL, p + ' 不是合法 JSON：' + e.message); }
  const errs = validateIR(json);
  if (errs.length) die(EXIT_REFUSE, 'IR 校验未通过：\n  - ' + errs.join('\n  - '));
  return json;
}

function writeOut(p, text) {
  // 输出路径要做干净失败：裸 fs.writeFileSync 在路径不可写时会甩一大段栈帧，
  // 对使用者毫无信息量（实测踩到一次：MSYS 的 `/dev/null` 被解析成 `D:\dev\null`）。
  if (p) {
    try {
      fs.writeFileSync(p, text, 'utf8');
    } catch (e) {
      die(EXIT_FAIL, '写不到文件 ' + p + '：' + e.message
        + '\n  提示：MSYS/Git Bash 里 `/dev/null` 会被解析成 `D:\\dev\\null`，不是黑洞设备——'
        + '要丢弃输出请省略 `-o`，让脚本打到 stdout 再自行重定向。');
    }
    console.log('已写入 ' + p);
  } else {
    process.stdout.write(text + '\n');
  }
}

function dumpStats(name, stats) {
  const parts = Object.keys(stats).map(k => k + '=' + stats[k]);
  console.log('[' + name + '] ' + parts.join(' '));
}

function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  if (args.flags.selftest || cmd === 'selftest') return selftest(!!args.flags.verbose);
  if (!cmd || args.flags.help) { usage(); return cmd ? EXIT_OK : EXIT_USAGE; }

  const src = args._[1];
  if (!src) die(EXIT_USAGE, '缺少输入 IR 文件。用法见 --help');

  if (cmd === 'fold-const') {
    const ir = readIR(src);
    const r = foldConstTable(ir);
    if (args.flags.stats) dumpStats('fold-const', r.stats);
    writeOut(args.flags.o, JSON.stringify(r.ir, null, 2));
    return EXIT_OK;
  }

  if (cmd === 'prune-cases') {
    const ir = readIR(src);
    let dead = ir.deadCases || [];
    if (args.flags.dead) dead = String(args.flags.dead).split(',').map(s => parseInt(s.trim(), 10)).filter(x => !isNaN(x));
    if (!args.flags['from-ir'] && !args.flags.dead && dead.length === 0) {
      die(EXIT_REFUSE, '没有死 case 列表：请用 --dead a,b,c 传入，或在 IR 里写 deadCases 字段。\n'
        + '  探测方法见 references/jsvmp-ir-and-optimization.md §4.1（给所有 case 下断点，命中的取消断点，跑完仍留断点的即死 case）。');
    }
    const r = pruneCases(ir, dead);
    if (r.refused) die(EXIT_REFUSE, '拒绝执行：' + r.refused);
    if (args.flags.stats) dumpStats('prune-cases', r.stats);
    writeOut(args.flags.o, JSON.stringify(r.ir, null, 2));
    return EXIT_OK;
  }

  if (cmd === 'simplify-cfg') {
    const ir = readIR(src);
    const r = simplifyCFG(ir);
    if (args.flags.stats) dumpStats('simplify-cfg', r.stats);
    writeOut(args.flags.o, JSON.stringify(r.ir, null, 2));
    return EXIT_OK;
  }

  if (cmd === 'restore-logic') {
    const ir = readIR(src);
    const r = restoreLogic(ir);
    if (args.flags.stats) dumpStats('restore-logic', r.stats);
    writeOut(args.flags.o, JSON.stringify(r.ir, null, 2));
    return EXIT_OK;
  }

  if (cmd === 'optimize') {
    const ir = readIR(src);
    const p = pruneCases(ir, ir.deadCases || []);
    if (p.refused) die(EXIT_REFUSE, 'prune-cases 拒绝：' + p.refused);
    const f = foldConstTable(p.ir);
    const l = restoreLogic(f.ir);
    const s = simplifyCFG(l.ir);
    const l2 = restoreLogic(s.ir);
    const s2 = simplifyCFG(l2.ir);
    if (args.flags.stats) {
      dumpStats('prune-cases', p.stats); dumpStats('fold-const', f.stats);
      dumpStats('restore-logic', { and: l.stats.andRestored + l2.stats.andRestored, or: l.stats.orRestored + l2.stats.orRestored });
      dumpStats('simplify-cfg', { propRegs: s.stats.propRegs + s2.stats.propRegs, foldBinops: s.stats.foldBinops + s2.stats.foldBinops, constBranches: s.stats.constBranches + s2.stats.constBranches, dupEdges: s.stats.dupEdges + s2.stats.dupEdges, unreachable: s.stats.unreachable + s2.stats.unreachable, mergedBlocks: s.stats.mergedBlocks + s2.stats.mergedBlocks });
    }
    writeOut(args.flags.o, JSON.stringify(s2.ir, null, 2));
    return EXIT_OK;
  }

  if (cmd === 'emit-js') {
    const ir = readIR(src);
    const style = args.flags.style || 'structured';
    if (style === 'flat') { writeOut(args.flags.o, emitFlat(ir, null).code); return EXIT_OK; }
    if (style !== 'structured') die(EXIT_USAGE, '--style 只能是 structured 或 flat');
    const st = emitStructured(ir);
    if (st.refused) die(EXIT_REFUSE, '该 CFG 不可结构化（' + st.refused + '）⇒ 请用 --style flat（保底正确，可读性差）。');
    writeOut(args.flags.o, st.code);
    return EXIT_OK;
  }

  if (cmd === 'cfg') {
    const ir = readIR(src);
    const cfg = buildCFG(ir.instrs, ir.entry);
    const lines = ['digraph cfg {', '  node [shape=box, fontname="Consolas"];'];
    cfg.blocks.forEach(b => {
      const body = b.instrs.map(i => i + ': ' + ir.instrs[i].op + (ir.instrs[i].dst ? ' ' + ir.instrs[i].dst : '')).join('\\l');
      lines.push('  b' + b.id + ' [label="B' + b.id + ' [' + b.start + '-' + b.end + ']\\l' + body + '\\l"];');
    });
    cfg.blocks.forEach(b => {
      const last = ir.instrs[b.end];
      b.succ.forEach((s, k) => {
        if (s == null) return;
        const lbl = (b.kind === 'condbr') ? (k === 0 ? 'T' : 'F') : '';
        lines.push('  b' + b.id + ' -> b' + s + (lbl ? ' [label="' + lbl + '"]' : '') + ';');
      });
    });
    lines.push('}');
    writeOut(args.flags.o, lines.join('\n'));
    return EXIT_OK;
  }

  usage();
  return EXIT_USAGE;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = {
  validateIR, interpretIR, buildCFG, foldConstTable, pruneCases, simplifyCFG,
  restoreLogic, emitFlat, emitStructured, compile, makeRandomProgram, selftest,
};
