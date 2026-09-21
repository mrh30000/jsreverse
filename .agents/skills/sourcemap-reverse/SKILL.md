---
name: sourcemap-reverse
description: 面向前端构建产物 SourceMap 的离线逆向工程与工程源码树还原技能。支持解析 .map 文件或内嵌 base64 SourceMap，完整恢复原始前端工程目录树（具备严格防目录穿越与 Windows 保留字防护）、混淆线上坐标与原始源码行列号双向查找定位（lookup）、以及多版本 SourceMap 差异对比（diff）。适用于线上泄露 .map 分析、前端代码审计、定位签名算法未混淆源码等离线分析场景。
---

# SourceMap 逆向与工程还原

本技能提供 100% 纯离线（免启动 Chromium / Browser / Daemon 进程）的 SourceMap 前端代码还原与符号映射工具链。

## 适用场景

1. **源码树完整恢复**：抓取到线上前端产物的 `.js.map` 文件后，直接解包还原原始工程代码结构（如 Vue/React 组件、TS 模块、工具函数等）。
2. **符号与断点反向定位**：在线上报错或混淆 JS 中定位到某行某列（如 `app.min.js:1:18290`），快速查出对应的未混淆源文件及行列位置。
3. **多版本差异追踪**：对比新旧两个版本的 `.map` 文件，迅速识别变更/新增/移除的源文件与核心逻辑。

---

## 核心脚本与 CLI 用法

所有脚本均位于 `skills/sourcemap-reverse/scripts/`，采用原生 Node.js ESM 编写，支持标准 `--help` 与 `--json` 输出。

### 1. 还原工程源码树 (`reconstruct-tree.js`)

读取 `.map` 文件或包含内嵌 base64 SourceMap 的 `.js` 脚本，将内嵌的 `sources` 与 `sourcesContent` 完整写入本地目录树：

```bash
# 还原到默认 ./reconstructed 目录
node skills/sourcemap-reverse/scripts/reconstruct-tree.js --input ./dist/app.js.map

# 还原到指定目录并允许覆盖同名文件
node skills/sourcemap-reverse/scripts/reconstruct-tree.js -i ./dist/app.js.map -o ./src_recovered --overwrite

# 输出 JSON 统计摘要
node skills/sourcemap-reverse/scripts/reconstruct-tree.js -i ./dist/app.js.map -o ./src_recovered --json
```

**安全防护特性**：
- 自动清理 `webpack://`、`vite://`、`../` 等前缀与多余层级；
- 彻底拦截路径穿越（Path Traversal），确保所有还原文件严格受限于 `--output-dir` 内部；
- 过滤 Windows 保留文件名（CON, PRN, AUX, COM1-9 等）及非法文件名字符。

---

### 2. 坐标与符号双向查找 (`lookup-symbol.js`)

解析 SourceMap 的 mappings 表，支持生成代码坐标与原始源码坐标的双向映射：

```bash
# 生成代码 -> 原始源码定位（查找 app.min.js 第 1 行 15234 列在原始工程里的位置）
node skills/sourcemap-reverse/scripts/lookup-symbol.js -i ./dist/app.js.map -l 1 -c 15234

# 原始源码 -> 生成代码定位
node skills/sourcemap-reverse/scripts/lookup-symbol.js \
  -i ./dist/app.js.map \
  -l 45 -c 8 \
  -d original_to_generated \
  -s "src/utils/crypto.ts"

# 机器消费 JSON 模式
node skills/sourcemap-reverse/scripts/lookup-symbol.js -i ./dist/app.js.map -l 1 -c 15234 --json
```

---

### 3. 多版本 SourceMap 差异比对 (`diff-sourcemap.js`)

对比两个 SourceMap 构建产物包含的文件变动：

```bash
# 快速输出汇总（文件新增、删除、修改数量）
node skills/sourcemap-reverse/scripts/diff-sourcemap.js -l ./v1.0.map -r ./v1.1.map

# 查看具体新增/删除的文件清单
node skills/sourcemap-reverse/scripts/diff-sourcemap.js -l ./v1.0.map -r ./v1.1.map -m sources

# 机器消费 JSON 模式
node skills/sourcemap-reverse/scripts/diff-sourcemap.js -l ./v1.0.map -r ./v1.1.map -m sources --json
```

---

## 推荐工作流

```text
获取线上目标 .map 文件
       │
       ▼
运行 reconstruct-tree.js 还原完整源码树
       │
       ▼
在还原工程目录中直接检索关键词（如 sign, encrypt, token, aes）
       │
       ▼
若需对齐线上断点与真值：使用 lookup-symbol.js 双向确认行列号
```
