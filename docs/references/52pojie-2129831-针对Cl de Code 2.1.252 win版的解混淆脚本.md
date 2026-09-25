# 针对Cl**de Code 2.1.252 win版的解混淆脚本

> **作者**: Shadione | **发布时间**: 2026-09-25 12:40:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 240 / 0
> **原文**: [https://www.52pojie.cn/thread-2129831-1-1.html](https://www.52pojie.cn/thread-2129831-1-1.html)

---

## Clxxde Code 解混淆：还原可读源码树

### 简介

Clxxde Code 官方客户端是 Bun standalone 打包的原生 exe，内部 JS 全部经过 minify（标识符短名化），无法直接阅读。本工具把它自动还原为结构化、可读的 JS 源码树。

说明，由于混淆量较大，在解混淆的研究过程中使用了大量AI工具作为辅助

已验证样本：Clxxde Code 2.1.252（Windows x64）。
MD5值：5EB043F2630D710629BD80CCE2D6C39B

### 用法

1. 解压压缩包；
2. 把原版 clxxde.exe 放进 input/ 文件夹；
3. 双击 run.bat（或运行 python deobfuscate.py）；
4. 约 2 分钟后，output/human/ 即为解混淆源码树。

### 效果

* 1,798 个 JS 文件按功能分层：entry / core / app×17 主题域 / vendor / assets；
* 22,517 个导出符号 99.7% 恢复语义命名（其余 70 个为恒值桩/死代码）；
* 440,176 个局部绑定改名后混淆残留 0；
* 文件名全部功能化，如 collect-boot-warnings-start-chunk-ha7s3hgf.js。

### 原理

原版混淆仅为 minify——只改了名，没有控制流扁平化。因此把名字改回去即可还原可读性，且行为零变化。本包的做法：从历史已验证状态推导出「改名变换序列」（[遍历序号, 旧名, 新名]），现场对自备样本的 AST 按序号锚定回放，Babel 作用域安全重命名，只改标识符、零结构改动。

### 环境要求

* Python 3.9+（标准库）、Node.js ≥ 18；
* @biomejs/biome 2.5.14 首次运行经 npx/bunx 自动拉取（需一次网络）；
* 磁盘约 1.5GB，总计耗时约 2 分钟。

### 运行时的预期现象（不是错误）

* biome 跳过 >1MiB 大文件（历史基线的一部分，放开会偏离基准产物）；
* 3 个非 UTF-8 vendor 资产（chart/hljs/mermaid）解析报错——上游压缩资产，不参与重命名。

### 声明

压缩包内只有脚本与标识符映射字典（无任何 Anxxropic 源代码/字节码/二进制片段），原版代码由你用自备样本现场提取。产物仅供安全研究与学习交流，请勿再分发或冒充官方产品。
