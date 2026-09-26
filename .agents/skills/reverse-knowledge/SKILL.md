---
name: reverse-knowledge
description: 逆向工程知识库、成熟平台签名参数蓝图检索与 6 大阶段决策向导技能。离线检索内置平台算法蓝图库（抖音 a_bogus、京东 h5st、知乎 x-zse-96/__zse_ck、小红书 x-s、B站 w_rid、美团 mtgsig、BOSS __zp_stoken__、淘宝 isg/cna、网易云 weapi、QQ音乐/酷狗 sign、百度翻译 sign、同花顺 hexin-v、CSDN x-ca-signature 等 24 个）的参数分解（parts）、变异规则（mutations）与可执行排查工作流，并附跨平台共性坑表；提供 Observe ➔ Capture ➔ Rebuild ➔ Patch ➔ PureExtraction ➔ Port 6 大阶段的准入准出评估与下一步决策建议。
---

# 逆向工程知识库与阶段向导 (Reverse Knowledge & Guide)

本技能 100% 离线运行：一个**平台参数蓝图库** + 一套**逆向方法论状态机**。

## 适用场景

1. **平台签名算法参考**：命中已知平台的参数时，先查蓝图拿到 parts 分解、算法族、固定常量与排查步骤，再动手。
2. **同类坑速查**：拿不准「该不该怀疑换表 / 时间戳单位 / 环境白名单 / token 来源」时，
   先读 `references/platform-signature-patterns.md`（跨平台共性规律，含 12 节排查顺序）。
3. **逆向卡点与阶段决策**：不知道当前该抓包、Hook、补环境还是反混淆时，用状态机向导取准入准出与下一步动作。

---

## 蓝图库

数据**自包含**在 `data/blueprints/`（蓝图数以 `--list` 输出为准，勿手抄计数）。
文件契约与新增流程见 `references/blueprint-schema.md`（**唯一权威源**）。

```bash
node scripts/query-blueprint.js --list         # 全部蓝图概览
node scripts/query-blueprint.js --id jd-h5st   # 按 id / 别名看详情
node scripts/query-blueprint.js -q "抖音 resource list 签名"   # 自然语言模糊推荐
node scripts/query-blueprint.js --where        # 打印实际命中的数据目录与来源
node scripts/query-blueprint.js --selftest     # 自检（含失败分支）
node scripts/blueprint-lint.js                 # 结构 + 来源溯源校验（exit 1 = 有 error）
```

已收录平台（准确口径以 `--list` 为准）：抖音/头条 `a_bogus` · 京东 `h5st` / 第 8 段环境段 /
`request_algo` token · 知乎 `x-zse-96` / `__zse_ck` · 小红书 `x-s` · B 站 `w_rid` · 美团 `mtgsig` ·
BOSS `__zp_stoken__` · 淘宝 `isg`/`cna` · 网易云 `weapi` · QQ 音乐 `sign`/`zzc` · 酷狗 `signature` ·
百度翻译 `sign` · 同花顺 `hexin-v` · 得物/拉勾/拼多多/CSDN/问卷星/12306/羊了个羊。 ★ 另有**公开文档型**一条：腾讯云 COS `Authorization`（`q-sign-algorithm=sha1`，蓝图 id `tencent-cos-authorization`）—— 无需逆向、可离线纯算。

**四条质量红线**（新增蓝图必须满足，否则 `blueprint-lint.js` 会拦或告警）：

1. `metadata.sources` **逐篇列出**来源文章与行号 —— 没有出处的蓝图等于凭印象写。
2. 每条 `mutations` 必须写 **`symptom_if_wrong`**（搞错会看到什么现象）—— 只写规则对排错没用。
3. 源文章只给定位不给算法时，如实写 `algorithm.family: unknown` + `status: unknown` 并列入 `gaps`，
   **不要为了"看起来完整"补一个猜的算法**。
4. 同一份清单只在一处维护：跨平台共性进 `platform-signature-patterns.md`，
   平台细节进对应蓝图，**不要把平台细节抄进本文件**。

---

## 6 大阶段决策向导

提供逆向工程 6 大标准阶段（`Observe` ➔ `Capture` ➔ `Rebuild` ➔ `Patch` ➔ `DeepDive` ➔ `PureExtraction` ➔ `Port`）
的准入/准出评估与状态机建议：

```bash
node scripts/stage-advisor.js --explain Observe      # 单阶段手册
node scripts/stage-advisor.js --explain all          # 全部阶段
node scripts/stage-advisor.js --has-target true --hook-records 0   # 输出当前最高收益动作
node scripts/stage-advisor.js --stage Patch --passing false --json
```

| 阶段 | 核心目标 | 准入条件 | 核心切忌 |
| :--- | :--- | :--- | :--- |
| **Observe** | 锁定目标请求与参数边界 | 任务初始 | 切忌过早打断点或手翻数万行混淆代码 |
| **Capture** | 获取运行时参数真值样本 | 已确认目标请求 | 切忌无真值样本直接本地跑脚本 |
| **Rebuild** | 导出本地独立 Node.js 脚手架 | 已有真值样本与核心代码 | 切忌跨语言盲目重写 |
| **Patch** | 最小因果补齐环境并对齐真值 | 已有本地入口但运行报错 | 切忌没有日志盲目挂载大量假对象 |
| **DeepDive** | 剖析 JSVMP / Wasm / AST 结构 | 需深度理解内部指令或混淆 | 切忌脱离逆向目标陷入混淆死循环 |
| **PureExtraction** | 提炼纯算法函数并剥离 DOM 依赖 | 本地环境已稳定跑通并验收 | 切忌本地链路未通就过早开始纯算提纯 |
| **Port** | 交付 SDK、CLI 脚本或服务模块 | 纯函数已通过边界校验 | 切忌未做异常处理直接上线 |

> `DeepDive` 阶段的具体手法不属本技能，按题型切到 `ast-deobfuscation`（混淆 / JSVMP / AST）、
> `wsam-reverse`（wasm）或 `web-js-env-patcher`（补环境）。
