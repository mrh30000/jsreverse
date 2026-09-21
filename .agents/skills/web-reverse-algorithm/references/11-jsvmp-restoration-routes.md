# JSVMP 还原路线（选路 / 衔接 / 落地）

> **本文是「JSVMP 该走哪条路」的唯一权威源**，只讲**选路与衔接**。
> 三条路线各自的实现细节**不在这里重复维护**：
>
> | 路线 | 细节权威源 |
> | --- | --- |
> | **插桩纯算** | `../../ast-deobfuscation/references/jsvmp-dynamic-instrumentation.md` |
> | **反编译器 / CFG** | `../../ast-deobfuscation/references/jsvmp-bytecode-and-decompiler.md`、`../../ast-deobfuscation/references/jsvmp-cfg-and-symbolic-paths.md` |
> | **补环境** | `../../web-js-env-patcher/SKILL.md` |
>
> 本技能负责的是：**怎么判、怎么选、选完怎么和「最终请求 → writer → builder → entry → source」这条闭环接上**。

---

## 0. 选路决策树

```
目标是「跑出结果」还是「读懂结构」？
├─ 跑出结果
│   ├─ 有强环境检测 / 无状态需求 / 只要一个签名值
│   │     → 补环境（web-js-env-patcher），成本最低
│   └─ 无强环境检测 / 要长期稳定 / 要能离线批量
│         → 插桩纯算（jsvmp-dynamic-instrumentation.md）
└─ 读懂结构
    ├─ 只想知道「该往哪插桩」        → 先做 CFG（jsvmp-cfg-and-symbolic-paths.md §1），再回插桩
    ├─ 指令集 ≤ 20 条、结构简单      → 纯静态生成器
    └─ 指令集 70~90 条、要完整还原   → 解释器改造为生成器 / 旁路 AST
```

**一句话判据**：
- **插桩解决「值是什么」，反编译器解决「结构是什么」。**
- **补环境解决「能不能跑」，它不解决「算法是什么」。**

---

## 1. 五条快速判据（先花 10 分钟定路，别急着读代码）

| # | 观察 | 结论 |
| --- | --- | --- |
| 1 | 请求/响应里有**密文**，且长度规整 | 先按 `08-mixed-crypto-segmentation.md` 推骨架，**再决定要不要碰 VM** |
| 2 | 目标 JS **每次访问都变** | 扣代码必然失效 ⇒ 只还原逻辑，走 `07-antidebug-and-live-patching.md` |
| 3 | 打开 DevTools 就断住 | 先处置反调试（`09-antidebug-and-automation-fingerprint.md`），否则插桩插不进去 |
| 4 | 需要**跑出结果**且环境检测不重 | 补环境；**不要为了「优雅」去写反编译器** |
| 5 | 只需要**一个常量 / 一个公式** | 插桩（1.0 函数调用层打头），**不要一上来就插运算符层** |

**反例**：为了拿一个 `sign` 而写完整反编译器——`jsvmp-bytecode-and-decompiler.md §0` 的判据表里，
这条路只在「第二个 VM 上才回本」。

---

## 2. 插桩纯算：落地顺序（摘要，细节见权威源）

1. **锁定最终写出点**（本技能统一工作流第 1 步）：`fetch` / `XMLHttpRequest.send` /
   `setRequestHeader` / `document.cookie` / verify 提交点。
2. **往回跟栈**，找到参数生成函数；**判它是不是 VM**（大数组 + `for(;;)+switch`）。
3. **只插真正走到的那个解释器**（VM 常有 `i()` / `a()` 两个重复解释器）。
4. **三层插桩**：call/apply → 运算符 → 赋值。
5. **固定密文 + hook 随机源**（`Math.random` / `Date.now` / `getRandomValues`），保证日志可复现。
6. **从结果倒推**：长度 → 拼接点 → 各段来源 → 定值数组 → 索引语义。
7. **识别标准算法**：长度 + **初始寄存器特征值** + 轮函数结构 + padding 反推；
   用 `crypto-signature-id.js` 一把判完并列出**魔改 diff**。
8. **纯算实现 + oracle 对拍**（§3）。

---

## 3. 纯算实现：先拿「真实密文」当第一道 oracle

> 与 `06-engineering-maintenance.md` §12 同一条原则，在 JSVMP 场景下的具体形态。

- **输入固定**：把明文固定成 `'1'`（或最短可复现输入），这样日志和本地实现对拍时只有一个变量。
- **中间值固定**：日志里出现的「定值数组」全部抄成本地常量，**不要重新推导**。
- **对拍口径**：本地实现与浏览器**逐字节一致**才算完；只对长度或前缀不算。
- **魔改常量**：只改 `crypto-signature-id.js` 报出来的那几处，**T 表/S 表没改就不要动**。

**判据**：如果本地实现与浏览器在「固定输入」下都不能逐字节一致，
说明你还有一段没还原——**不要靠「多试几次能过」蒙过去**。

---

## 4. 反编译器路线：什么时候值得

| 信号 | 建议 |
| --- | --- |
| 指令数组每次重排、变量名也变 | 先做**助记符表**（跨版本稳定），再决定是否写反编译器 |
| 指令数组稳定、指令数 ≥ 50 | 值得写；`--diff` 两次抓取确认指令集一致 |
| 只要定位插桩点 | **只做 CFG**，不做完整反编译 |
| 有 try/catch / finally | 先只做「无异常表」的版本，异常表语义另算 |

**已知代价**（必须提前说清，别让使用者误以为能一键出代码）：

- CFG 只出「块与块的关系」，块内语义仍要靠插桩或语义表；
- 旁路 AST 的产物是**半成品**，槽位与调用细节需要运行时比对修正；
- 递归 opcode、`break`/`continue`/`finally` 通常**第一版不支持**，应当显式报「未支持」而不是静默生成错的控制流。

---

## 5. 补环境路线：边界在哪

**适用**：环境检测不重、只要结果、目标已被收缩成纯函数。

**不适用**（判据）：

- 目标**每次访问都变** ⇒ 扣代码必然失效（走 `07-*`）。
- 有**强环境检测**（原生方法完整性、隐藏 iframe 取原生 API）⇒ 先读
  `../../web-js-env-patcher/references/high-strength-browser-detection.md`。
- 要**长期稳定**且要**离线批量** ⇒ 补环境的资源开销（`52pojie-1865940` 原话：
  「执行 vmp 消耗的资源巨大，手上没点钱是顶不住业务机器的高并发的」）通常不可接受，
  应当转插桩纯算。

**中间形态**：先用补环境**跑出签名**建立 oracle，再去做纯算——
`52pojie-1865940` 就是这个顺序（jsdom 补环境拿到一致的结果 → 再分析算法）。
**这是本技能最推荐的组合**：补环境给你「正确答案」，纯算给你「可扩展的实现」。

---

## 6. 交叉场景

### 6.1 媒体流 / DRM 里的 JSVMP

`52pojie-2057046`（某视频平台）的形态是：**m3u8 里下发的 key 是被加密的**，
而解密 key 的逻辑在 JSVMP 里。

**分工**：

- 「判层 / AES-CBC 内容解密 / key 与 iv 的来源」→ `../../stream-drm-reverse/SKILL.md`（**不在这里重复**）；
- 「这个 VM 里的解密函数怎么还原」→ 本文 §2 的插桩流程。

**判据**：先按 stream-drm 的判层表确认「加密在接口层还是内容层」，
再决定要不要进 VM。**不要一上来就啃 VM**——`52pojie-2057046` 作者自己也说
「即使我最后发现之前的部分分析没有必要」。

### 6.2 响应数据加密的绕过（先想「能不能不还原」）

`52pojie-2096887` 的做法：接口带 `encoding: ag-1` 这个**加密标志**时，
服务端才加密响应；**去掉这个参数 + 表单走明文**即可绕过，完全不碰第二个 VM。

**判据（值得优先试一次）**：响应密文只在**带某个标志参数**时才出现 ⇒ 先试去掉标志。
绕过 ≠ 放弃：**绕过是降低工作量，不是降低理解**——需要交付稳定性时再回来还原。

---

## 7. 反例黑名单

- **不要为了拿一个常量就写反编译器。** 先用插桩（`jsvmp-bytecode-and-decompiler.md §0` 判据表）。
- **不要在没处置反调试的情况下开始插桩。** 插桩点根本停不下来。
- **不要在「只要结果」的场景硬啃 VM。** 补环境成本低一个数量级。
- **不要假设「每次结果不同」就是自己错了。** 先查有没有 `Math.random` 噪声（`2106666` 的防重放设计）。
- **不要相信文章里的十六进制换算。** 一律自己转（见 `jsvmp-dynamic-instrumentation.md §7` 的踩坑留痕）。
- **不要跳过 CFG 直接猜插桩点。** 插桩点找不到时，CFG 是最快的定位手段。
- **不要把「补环境能跑」当成「算法已还原」。** 补环境不可离线、不可高并发，交付前要转纯算。

---

## 8. 复跑

```bash
cd <仓库根>    # 本仓库无固定安装路径：cd 到你 clone 出来的 jsreverse 根目录

# 判族 / 定路：扫描目标脚本里的加密算法与魔数
node .claude/skills/web-reverse-algorithm/scripts/detect-crypto.js --input <file.js>

# 常量识别（标准 IV / 魔改 diff / 反例）
node .claude/skills/ast-deobfuscation/scripts/crypto-signature-id.js --selftest
node .claude/skills/ast-deobfuscation/scripts/crypto-signature-id.js \
  --input "1732584201,4023233415,2562383102,271733878,942946097,7,3614090360"

# 插桩（三层；自检含实跑对拍与节点数守卫）
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/ast-deobfuscation/scripts/jsvmp-instrument.js --selftest

# VM 骨架静态解剖
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/ast-deobfuscation/scripts/analyze-jsvmp-vm.js \
  artifacts/tiktok/webmssdk.js --json
```
