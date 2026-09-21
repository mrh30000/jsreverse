---
name: reverse-knowledge
description: 逆向工程知识库、成熟平台算法蓝图检索与 6 大阶段决策向导技能。支持离线检索内置的经典参数签名蓝图（如京东 h5st、抖音 a_bogus、快手 falcon、通用 Header 签名、通用 Query Token 等）的参数分解（parts）、变异规则（mutations）与标准排查工作流；提供涵盖 Observe ➔ Capture ➔ Rebuild ➔ Patch ➔ PureExtraction ➔ Port 6 大阶段的准入准出规范评估与下一步决策建议。
---

# 逆向工程知识库与阶段向导 (Reverse Knowledge & Guide)

本技能提供 100% 离线运行的平台算法蓝图库与逆向方法论状态机，指导逆向开发者在面对新目标或卡点时快速定位题型、匹配成熟经验并做出正确的下一步动作。

## 适用场景

1. **平台签名算法参考**：遇到京东 `h5st`、抖音 `a_bogus`、快手 `falcon` 等常见算法时，查询其字段组成（parts）、时间戳/随机数变异规则（mutations）及标准抓包与分析工作流。
2. **逆向卡点与阶段决策**：不知道当前该抓包、该 Hook、该补环境还是该反混淆时，使用状态机向导获取准入准出条件与避坑建议。

---

## 核心脚本与 CLI 用法

所有脚本均位于 `skills/reverse-knowledge/scripts/`，采用原生 Node.js ESM 编写，支持标准 `--help` 与 `--json` 输出。

### 1. 算法蓝图库查询 (`query-blueprint.js`)

离线检索与查看平台逆向算法蓝图：

```bash
# 列出所有已收录的成熟平台算法方案
node skills/reverse-knowledge/scripts/query-blueprint.js --list

# 按 ID 或别名查询具体算法结构（含 parts 字段分解与工作流）
node skills/reverse-knowledge/scripts/query-blueprint.js --id jd-h5st
node skills/reverse-knowledge/scripts/query-blueprint.js --id a_bogus

# 根据自然语言或关键词智能推荐
node skills/reverse-knowledge/scripts/query-blueprint.js -q "抖音 resource list 接口签名"
node skills/reverse-knowledge/scripts/query-blueprint.js -q "header x-sign"

# 纯 JSON 格式输出供机器消费
node skills/reverse-knowledge/scripts/query-blueprint.js --id douyin-a-bogus --json
```

---

### 2. 6 大阶段决策向导 (`stage-advisor.js`)

提供逆向工程 6 大标准阶段（`Observe` ➔ `Capture` ➔ `Rebuild` ➔ `Patch` ➔ `DeepDive` ➔ `PureExtraction` ➔ `Port`）的准入/准出评估与状态机建议：

```bash
# 查看指定阶段的标准手册（目标、准入准出、避坑原则、推荐动作）
node skills/reverse-knowledge/scripts/stage-advisor.js --explain Observe
node skills/reverse-knowledge/scripts/stage-advisor.js --explain Patch

# 查看全部 6 大阶段手册
node skills/reverse-knowledge/scripts/stage-advisor.js --explain all

# 输入当前状态，让向导输出当前最高收益动作
node skills/reverse-knowledge/scripts/stage-advisor.js --has-target true --hook-records 0
node skills/reverse-knowledge/scripts/stage-advisor.js --stage Patch --passing false --json
```

---

## 逆向阶段速查表

| 阶段 | 核心目标 | 准入条件 | 核心切忌 |
| :--- | :--- | :--- | :--- |
| **Observe** | 锁定目标请求与参数边界 | 任务初始 | 切忌过早打断点或手翻数万行混淆代码 |
| **Capture** | 获取运行时参数真值样本 | 已确认目标请求 | 切忌无真值样本直接本地跑脚本 |
| **Rebuild** | 导出本地独立 Node.js 脚手架 | 已有真值样本与核心代码 | 切忌只在浏览器控制台手工调试或跨语言盲目重写 |
| **Patch** | 最小因果补齐环境并对齐真值 | 已有本地入口但运行报错 | 切忌没有日志盲目挂载大量假对象 |
| **DeepDive** | 剖析 JSVMP / Wasm / AST 结构 | 需深度理解内部指令或混淆 | 切忌脱离逆向目标陷入混淆死循环 |
| **PureExtraction** | 提炼纯算法函数并剥离 DOM 依赖 | 本地环境已稳定跑通并验收通过 | 切忌本地链路未通就过早开始纯算提纯 |
| **Port** | 交付 SDK、CLI 脚本或服务模块 | 纯函数已通过边界校验 | 切忌未做异常处理直接上线 |
