# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库性质

个人 Web/JS 逆向研究 workspace，不是单一构建产物：无 git 仓库、无根级 package.json / 构建脚本。每个顶层目录是一个**独立 case**（按目标站点或厂商命名）。所有报告与注释用中文，新结论也用中文写。

验证方式不是统一 test runner，而是各 case `solver/` 里**自带 assert 的独立脚本**，node/python 直接跑即自检。

## 工具链

- Node v22.23 / npm 11.8；Python 3.13。无 pytest、无 ruff（`.ruff_cache/` 是历史残留）。
- 依赖按 case 自带 `node_modules`（多用 `@babel/*`），Python 脚本直接用 `requests` 等。
- `proxycli` 在 `/e/env/nvm/nodejs/proxycli`（Windows 上调用须 `exec(..., {shell:true})`，见下「环境坑」）。

## 架构

### 技能层：`.claude/skills/` 与 `.agents/skills/`
两份内容完全一致的镜像，共 12 个 skill。每个 skill 由 `SKILL.md` 的 YAML frontmatter `description` 触发，结构为 `SKILL.md` + `scripts/`（离线 CLI）+ `references/`（方法论）+ 可选 `agents/ assets/`。

主要可执行入口（用法见各自 `SKILL.md` / `--help`）：

- `ast-deobfuscation`：`node scripts/detect-patterns.js <in.js> [hint]` 检测混淆家族，再 `node scripts/run-pipeline.js <in.js> <out-dir> [hint]` 分层反混淆；站点特征在 `references/patterns/`。
- `reverse-knowledge`：`node scripts/query-blueprint.js --list | --id <jd-h5st|douyin-a-bogus|...> | -q "<描述>"`；`node scripts/stage-advisor.js --explain <Observe|Capture|Rebuild|Patch|PureExtraction|Port>` 按阶段给准入/准出。
- `sourcemap-reverse` / `wsam-reverse`：`reconstruct-tree.js` / `wasm-decompile.js` 等离线 CLI。
- `code-analysis` / `target-analysis`：文档型 skill，分析由 Agent 自己完成，无内置 LLM。

**陷阱**：`protocol-reverse/SKILL.md` 的 ACTION REQUIRED 引用了 `../field-journal/`、`../scripts/case-init.ps1`、`../tool-index.md`。那是父级独立仓库 `open-source/reverse-skill/` 的布局，在本仓库根**不存在**——别把这些路径当成本仓库流程，按 SKILL.md 的方法论部分执行即可。

### 知识层：`docs/references/`
52pojie 文章 markdown + 对应「`.验证报告.md`」。这是方法论与站点特征的源头，`README.md` 是主题→文件索引（V8/JSVMP/补环境/纯算/验证码）。开工前先查这里有没有同厂同题方案的既有结论。

### 第三方层：`open-source/`
克隆的 skill 仓库（各自带 `.git`），只读参考，勿改。

## Case 目录约定

`dingxiang/` 最完整，可作模板：

- `README.md`：中文完整报告（背景 / 协议链路 / 已证部分 / 未证部分 / 文件表 / 复跑命令）。
- `sources/`：原站 JS，**一律存成 `*.js.orig`**，防 linter/pi-lens autofix 改写。
- `evidence/`：原始协议抓包文本。`artifacts/`：截图、二进制、dump、json 等中间产物。
- `solver/` + `scripts/`：可直接运行的推导件与浏览器辅助脚本，每个自带 assert 自检。
- 工作模式：**真 SDK 在 DOM stub/harness 里跑出 oracle，纯算实现与它逐字节 diff**（见 `dingxiang/solver/dx_harness.js`、`dx_verify_encrypt.js`、`dx_plaintext.js`）。
- README 明确标注「已证伪假设」与「仍缺方向」。**改动前先读**，不要重跑已证伪的路径。

## 具体 case 命令

- `dingxiang/`（顶象滑块纯算）：完整复跑清单在其 README「复跑」段，例如
  ```bash
  python dingxiang/solver/dx_find_gap.py <bg> <piece> <y> # 缺口定位
  node dingxiang/solver/dx_verify_encrypt.js              # encrypt_* 保真自检
  node dingxiang/solver/dx_plaintext.js                   # 明文层 + 端到端 ua 自检
  node dingxiang/scripts/resume-loop.js &                 # 浏览器操作前先起，绕无限 debugger
  ```
- `geetest/`：`python geetest/gt4_article_check.py [--risk=winlinze]`；`python geetest/browsertest/replace_server.py`（`127.0.0.1:8799`，只替换 `gcaptcha4.js` 为本地版，`browsertest/mode.txt` 写 `orig` 切回原版）。
- `yuanrenxue/match30/`：`python yuanrenxue/match30/crawler.py [--sessionid ... --submit]`；纯算/Wasm 校验 `node yuanrenxue/match30/encrypt.js`、`wasm_runner.js`。
- `xai-cloudflare/`：结论在 `REPORT.md`，`artifacts/cf_decoder.js` 可 node 直跑（rayId 派生 XOR 解密）。

## 环境坑（实测）

- pi-lens autofix 会改写下载的第三方 JS：原始证据存 `.orig`，`geetest/.pi-lens.json` 是 ignore 清单。
- 本 workspace 的 bg_run 走 **cmd.exe**：`$((...))`、`seq`、`/d/...` 路径失效；用 node 脚本或 `D:\` 绝对路径。
- Node 22 `execFile('proxycli.cmd')` → `spawn EINVAL`，必须 `exec(..., {shell:true})`。
