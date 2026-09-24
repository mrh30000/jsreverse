---
name: web-reverse-algorithm
description: 面向 Web/JS 逆向中的纯算、验证码纯算、复杂 header/cookie 签名、混合加密、JSVMP/VMP、Wasm、PoW、响应解密、指纹与 challenge 参数还原工作流。用于需要从最终请求、最终 cookie、最终 verify 或最终 WebSocket 帧倒推 writer、builder、entry、source，设计浏览器与本地对齐检查点，判断何时做 AST 解混、何时插桩、何时做最小补环境、何时拆图像线与参数线、以及如何把研究结果落成 solver、SDK、脚本或服务的场景。用户明确提到纯算、验证码纯算、滑块、点选、旋转、PoW、collect、w、x-s、a_bogus、encSecKey、captchaBody、X-Bogus、Wasm、国密、补环境、指纹、challenge、verify、header 签名、cookie 签名、登录密码加密、登录提交参数、表单参数、单点登录、CAS、WebVPN、execution 令牌、RSA 公钥、JSEncrypt、密码 MD5 加盐、`publickey_mod`、DES 解密、`encoded` 隐藏字段时使用。当目标带无限 debugger / 反调试（打开 DevTools 就断住、document.write 覆写页面、eval 监管脚本）、JS 每次访问都变、响应体是加密的 JS、需要 mitmproxy/Fiddler 改写响应做在线补丁、或要判断某个参数属于「固定 / 上次返回 / JS 计算」时，同样使用本技能。当需要在 DevTools 里**跟栈定位加密发生在哪一行**（参数在某层「消失」、断在函数头部已带密文、函数没有形参却返回密文）、用**条件断点**在几十个共用同一拦截器的请求里筛出目标包、按「缺什么补什么」扣代码并让加载器自己报出缺失模块、排查**原型追加的方法必须在 `new` 之前补**或加载器头部「形参与 `e = {}` 冲突」时，也用本技能。当**手上只有一段密文**时需要先读**长度 / 字符集 / 公共子串**判断块大小与编码链，当请求头 Token 其实来自**别的响应**（`Bearer eyJ...` 直接解 payload）无需逆向算法，或加密落在**原生 so 层**（自描述导出名、hook 入参返回值对拍）时也用本技能。
---

# Web 逆向纯算

这项技能不是“给一个固定公式”，而是把资料库里的方法层、题型层、训练层、工程化层压成一套总入口。

先把任务压缩成这条闭环，再决定读哪份 references、走哪条路径、写哪种落地代码：

```text
最终请求 / 最终 cookie / 最终 verify / 最终 WS 帧
-> writer
-> builder
-> entry
-> source
```

## 核心原则

1. 先找最终写出点，不先读混淆大文件。
2. 先存中间值，不先猜算法名。
3. 先缩小执行范围，再补环境。
4. 先证明输入输出边界，再决定是否整体迁移。
5. 先把结果整理成可复用结构，再继续做版本适配。

## 使用顺序

### 1. 先判题型

优先使用内置脚本进行 AST 与常量特征探测（免人工盲猜）：

```bash
# 扫描目标脚本中的加密算法、第三方库、魔数与模式
node skills/web-reverse-algorithm/scripts/detect-crypto.js --input <file.js>
node skills/web-reverse-algorithm/scripts/detect-crypto.js -i ./dist/sign.js --json
```

根据探测结果将目标归到下面之一：

- 标准签名 / 标准摘要题
- 混合加密 / 密钥包装题
- Cookie / Header / 多参数联动题
- JSVMP / VMP / 强混淆纯算题
- Wasm / Protobuf / WebSocket / 二进制协议题
- 验证码 / 风控 / challenge 题

如果还没分清，先读 [references/01-decision-tree.md](./references/01-decision-tree.md)。

### 2. 再判当前阻塞点

优先判断你卡在下面哪一类：

- 入口没找对
- **加密发生在哪一行还没钉死**（多层调用栈、同一个加密函数被几十个请求共用、异步栈里断不住）
- 原始串或原始 payload 没对齐
- 中间数组 / 中间对象没采到
- 运行时依赖没补齐
- 图像线和参数线没拆开
- 协议边界没证明
- **反调试挡路（打开 DevTools 即断）/ 目标 JS 每次访问都变**
- **要提交或响应的关键数据是密文，需要先解密才能看清**
- **一个参数里塞了两段以上密码学（前段密文 + 后段被加密的密钥），结构还没定下来**

后两类不要硬啃代码，读 [references/07-antidebug-and-live-patching.md](./references/07-antidebug-and-live-patching.md)：
响应改写 + 在线补丁比「扣代码」快一个数量级，且动态 JS 类目标**扣代码必然失效**（判据：JS 变、加密逻辑不变 ⇒ 只还原逻辑，不扣代码）。

**「加密在哪一行」还没钉死时**，读 [references/15-call-site-locating-playbook.md](./references/15-call-site-locating-playbook.md)
（该文是「跟栈 + 断点定位调用点」的唯一权威源）：五条判据（其中 **J1「参数在某层消失」复用率最高**）、
`send` 起点的统一开场、三种生成形态（另一模块产出 / 本函数内逐步生成 / 来自会话）、
**唯一验收动作「断点处的值与最终请求里的值逐字符对拍」**、
**多包共用同一加密函数时的条件断点**（`e.url.includes('...')`，异步栈里要改到异步那一帧）、
以及「扣代码」的四个实操要点（报错驱动补全 / 让加载器 `console.log` 自己报缺哪个模块 /
**原型追加的方法必须补在 `new` 之前** / 加载器头部「形参 vs `e = {}`」冲突）。

**反调试的范围远不止 `debugger`**：还有窗口尺寸探测、console 探测、跳转/清 DOM/内存炸弹、
原生方法完整性校验、以及**受 hook 影响的隐藏 iframe**（从 `contentWindow` 取回未 hook 的原生 API）。
`07-*` 解决「怎么处置无限 debugger」，本文另外补的反调试分类、sink→栈→bundle 三步定位法、
以及**自动化框架自身留下的指纹**（CDP `Emulation.setFocusEmulationEnabled` 导致的焦点伪造）
读 [references/09-antidebug-and-automation-fingerprint.md](./references/09-antidebug-and-automation-fingerprint.md)：
**建议顺序是先读 09 定位是第几类，再读 07 做处置。**
「hook 了但还是被抓」的第一嫌疑是隐藏 iframe 而非目标 JS。

最后一类先读 [references/08-mixed-crypto-segmentation.md](./references/08-mixed-crypto-segmentation.md)：
从密文长度与字符集**先推出骨架**（如「末尾恒定 256 hex ⇒ RSA-1024 密钥包装」），
再用「常量特征优先于关键字」的定位法逐段取证，最后用固定 key/iv/明文与浏览器逐字节 diff 锁死四元组。
**先认形态、再谈算法**：除了「前段密文 + 后段密钥包装」，还有三种高频形态 ——
自描述密文（长度字段 + 尾部密钥）、响应自带 key/iv、算法按时间戳奇偶切换（§八），
三种都只需量体征就能判出来，判错形态会白读一整轮混淆代码。

遇到这一步拿不准时，优先读 [references/04-debug-env-playbook.md](./references/04-debug-env-playbook.md)。

### 3. 按题型选路线

#### 标准签名 / 混合加密 / Cookie / Header / 国密

适用信号：

- 输出长度规整
- `md5/sha1/hmac/aes/rsa/sm3/sm4`
- `token&t&appKey&data`
- `params + encSecKey`
- `document.cookie` 或 header 明显可追

优先读取 [references/02-algorithm-families.md](./references/02-algorithm-families.md)。

#### 登录 / 账号体系（密码加密 + 表单参数 + 会话令牌）

适用信号：

- 目标链路是**登录 / 注册 / 改密 / 单点登录（CAS / WebVPN）**
- 提交体里出现 `password` / `pwd` / `encoded` / `passwordEnc` / `credentials.password` / `encData` + `encKey`
- 同接口还有 `formhash` / `csrf` / `execution` / `token_id` / `uuid` / `lt` / `pwdDefaultEncryptSalt`
- 出现 `h5Fingerprint` / `risk_platform` / `device_type` 一类**风控指纹字段**
- 「下载器/脚本提示密码不对」「本地算出的密文服务端不认」「同一明文两次密文不同」

**这类题有自己的一套判据与工具**，读 [references/12-login-and-account-params.md](./references/12-login-and-account-params.md)
（**该文是「登录提交参数怎么判族、怎么复算」的唯一权威源**）并用 `scripts/login_param_probe.py`：

```bash
S=skills/web-reverse-algorithm/scripts
python $S/login_param_probe.py classify --cipher "<抓包里的密文>"   # 先判族，再决定扣不扣代码
python $S/login_param_probe.py --selftest                            # RFC1321 + 文章原样 JS 实跑 + OpenSSL DES 向量
```

**四条一句话判据**（细节在 12）：

1. **抓两次包**：密码字段**长度也变** ⇒ RSA（非对称）；只有值变 ⇒ 对称/哈希。
2. **`formhash` / `csrf` / `execution` / `uuid` / `token_id` 是服务器下发**（在登录页 HTML 或前置接口里），
   不要试图算 —— 这类浪费是这一族最大的一笔。
3. **32 位 hex 不等于「裸 MD5」**，可能是四种 MD5 链之一；先跑 `md5-chain` 逐个试。
4. **提交的可能不是你看到的那个字段**：明文框 + 隐藏字段（`encoded` / `passwordEnc`）两段式极常见。

#### JSVMP / VMP / 小红书 / a_bogus / 多参数复杂纯算

适用信号：

- 大数组、解释器、`for(;;)+switch`
- 位运算密集、状态数组、寄存器式写法
- `window._webmsxyw`、`__TENCENT_CHAOS_VM`、`byted_acrawler` 一类入口

优先读取 [references/02-algorithm-families.md](./references/02-algorithm-families.md) 和 [references/04-debug-env-playbook.md](./references/04-debug-env-playbook.md)。

**但先读 [references/11-jsvmp-restoration-routes.md](./references/11-jsvmp-restoration-routes.md) 定路**（该文是
「JSVMP 该走哪条路」的唯一权威源）：它给出选路决策树与五条快速判据，并说明三条路线的细节权威源——
**插桩**看 `../ast-deobfuscation/references/jsvmp-dynamic-instrumentation.md`，
**反编译/CFG** 看 `../ast-deobfuscation/references/jsvmp-bytecode-and-decompiler.md`
与 `../ast-deobfuscation/references/jsvmp-cfg-and-symbolic-paths.md`，
**补环境**看 `../web-js-env-patcher/SKILL.md`。

**一句话判据**：插桩解决「值是什么」，反编译器解决「结构是什么」，补环境解决「能不能跑」。
**只要一个常量/公式时不要写反编译器；只要结果时不要啃 VM。**
最推荐的组合是**先用补环境跑出签名当 oracle，再做插桩纯算**。

#### Wasm / Protobuf / WebSocket / challenge 协议

适用信号：

- `WebAssembly.instantiate`
- `application/x-protobuf`
- 二进制响应、导出函数、首包/验证包分段

优先读取 [references/02-algorithm-families.md](./references/02-algorithm-families.md) 和 [references/03-captcha-families.md](./references/03-captcha-families.md)。

#### 媒体流 / DRM / ts 分片

适用信号：

- `m3u8` / `#EXT-X-KEY` / `decryptdata.key` / `qiniuDRMKey`
- `ts` 分片、`PES` / `NALU`、`SM4` 内容加密、`GetLicense` / `protectedLicenses`
- 「分片能下载但不能播放 / 花屏 / 只有声音没画面」

**这类题不属于本技能**（判层与解密有自己的完整链路），交给 `../stream-drm-reverse/SKILL.md`：
先判「加密在哪一层」（容器层 / 播放器层 / ES 层 / 接口层 / DRM 许可证层 / 白盒 wasm 层），再动手。
本技能只在「**接口签名**算不出」或「**参数加密**与媒体流无关」时参与。

#### 打包产物（webpack）—— 加密函数「扣不完」

**一条判据即可归入本类**：扣出来的函数**跑不起来且报 `Cannot read property 'call' of undefined`**，
或者「缺哪个模块补哪个」永远补不完。

**这类题的解不是「读懂算法」，而是「把模块抠出来当黑盒用」** ——
先用它拿到稳定 oracle，再按 1~7 类做纯算。

**判族信号表与全部流程以 `../webpack-bundle-extraction/SKILL.md` 为唯一权威源**
（本文件不复制那张表，避免两处漂移）；这里只给两个入口：

```bash
node ../webpack-bundle-extraction/scripts/detect-bundler.js <bundle.js>   # 退出码 2 = 不是打包产物
```

**关键判据（别混）**：`Cannot read property 'call' of undefined` = **模块闭包不完整**（去补模块），
不是环境问题；报错落在指纹/风控 SDK 里才是环境问题（转 `../web-js-env-patcher/SKILL.md`）。

#### 验证码 / 风控 / challenge / verify

永远先拆 5 条线：

1. 初始化 / challenge 线
2. 图像或题面识别线
3. 参数 builder 线
4. 环境 / 指纹 / collect 线
5. 最终 verify 线

优先读取 [references/03-captcha-families.md](./references/03-captcha-families.md)。

#### 边缘 WAF / CDN 准入 Cookie（clearance cookie）

适用信号：

- **首访不是正常页面**（403 / 412 / 429 / 503 / 521 / 202），响应体是「一段 JS」或「HTML 里塞着 JS」
- `Set-Cookie` 下发一个「无值或半值」的准 cookie（`__jsluid_s`、`__cf_bm`、`ak_bmsc`…）
- 响应体里出现 `document.cookie=`、`_cf_chl_opt`、`arg1` + `unsbox`、`sensor_data`、`reese84`
- 明确的目标是「**必须先拿到一个 clearance cookie 才能进站**」

**这类题不属于验证码**（无图片、无交互、无人工成功样本基线），不要走图像 / 坐标 / 打码平台路线。

先判层（十二族一页判层表在 `../web-js-env-patcher/references/edge-waf-cookie-challenge.md`），
可离线部分读 [references/10-waf-clearance-cookie.md](./references/10-waf-clearance-cookie.md)
并用 `scripts/waf_clearance_solver.py`（**下面所有命令的路径以本技能根 `skills/web-reverse-algorithm/` 为基准；
命令要在本技能根下执行**）：

```bash
python scripts/waf_clearance_solver.py classify --html page.html --status 521   # Python 兜底版，有 Node 时优先用 classify_edge_challenge.js
python scripts/waf_clearance_solver.py jsl-first --html page.html              # 传 521 页面原文，自动抽 document.cookie 表达式
python scripts/waf_clearance_solver.py jsl --json '<go({...}) 参数>'
python scripts/waf_clearance_solver.py acw-v2-old --arg1 <40位hex>
python scripts/waf_clearance_solver.py cf-decode --body <fo响应体文件> --ray <_cf_chl_opt.rayId，16位hex>
python scripts/waf_clearance_solver.py cf-strtable --table <表文件> --base 458 --target 608776
python scripts/waf_clearance_solver.py --selftest
```

`cf-decode` 的实跑样本在本仓 `cloudflare/xai-cloudflare/artifacts/`：
`--body cloudflare/xai-cloudflare/artifacts/fo_stage2.txt --ray a393f8784a8dce7a`
（rayId **必须**取自同一响应体的 `_cf_chl_opt.rayId`，不能从别处抄；解码后用 base64 占比自检）。

**退出码**（实测）：`0` 成功；`1` 没给子命令（打印帮助）；`2` 参数用法错误（argparse）；
`3` 求解失败 / 结果不可信（rayId 取错、补位无命中、枚举不到旋转量、定族歧义等，stderr 有原因）。
**看到 3 不要当崩溃**——它是「算法走到了但没有可信结果」，按 stderr 提示换输入重试。

**边界**：环境校验点顺序随机、`isTrusted` 事件、行为生物特征这三类**不可离线**，
判定后交回 `../web-js-env-patcher/SKILL.md`；有图有交互的验证码交 `../web-verify-patcher/SKILL.md`。

## 统一工作流

### 1. 锁定最终写出点

优先从这些位置切：

- `fetch`
- `XMLHttpRequest.send`
- `setRequestHeader`
- `document.cookie`
- `JSON.stringify`
- verify 提交点
- WebSocket 首包或验证包发送点

### 2. 记录 5 层检查点

至少保留：

1. writer 检查点：最终 URL / header / body / cookie / WS 帧
2. builder 输入：query、payload、token、challenge、distance、track、browser info
3. 原始串或原始 payload
4. 中间数组 / 中间对象 / 编码前字节流
5. 最终输出

### 3. 先恢复中间态，再恢复最终编码

这条规则在下面几类题里尤其重要：

- 小红书 `x-s / x-s-common`
- 抖音 `a_bogus / X-Bogus`
- 腾讯 `collect`
- 网易盾 `w`
- 各类 `payload -> encode` 的 header 家族

### 4. 只在必要时补环境

优先补到最小可运行边界：

1. `window/self/globalThis/document/navigator/location`
2. `cookie/storage/performance/Date/crypto`
3. `canvas/webgl/audio/plugins/mimeTypes/RTCPeerConnection`

如果目标已经被收缩成纯函数，就不要把任务升级成“大补环境题”。

### 5. 把结果收敛到工程接口

最终优先沉淀下面这些产物：

- 最小输入集合
- 中间检查点集合
- `build_context()` / `build_payload()` / `sign()` / `solve()` 这种分层接口
- 本地样本与浏览器样本对照
- 失败诊断点

## 你应该产出的结果

使用这项技能时，优先输出：

1. 题型判断
2. writer / builder / entry / source 分层
3. 当前阻塞点判断
4. 必要检查点列表
5. 是否需要 AST、插桩、补环境、图像识别或协议拆包
6. 推荐的落地结构：函数、solver、SDK、服务
7. 易错点与版本风险

## 资源导航

- [references/01-decision-tree.md](./references/01-decision-tree.md)
  用途：先做题型判断、阻塞点判断、请求链定位。
- [references/02-algorithm-families.md](./references/02-algorithm-families.md)
  用途：标准签名、混合加密（**含极验 v3 三个 `w` / v4 `hex(AES)+hex(RSA)` 速查**）、Cookie/Header、JSVMP、Wasm、国密、站点家族模式。
- [references/03-captcha-families.md](./references/03-captcha-families.md)
  用途：腾讯、极验、网易盾、百度旋转、阿里 v2、V5、拼多多、hCaptcha 等验证码/风控路线。
- [references/04-debug-env-playbook.md](./references/04-debug-env-playbook.md)
  用途：hook、logpoint、最小补环境、浏览器/本地对齐、反调试与证据管理。
- [references/05-training-routes.md](./references/05-training-routes.md)
  用途：学习顺序、训练阶段、案例如何带新人、视频资料怎么吸收。
- [references/06-engineering-maintenance.md](./references/06-engineering-maintenance.md)
  用途：GitHub 项目怎么吸收、接口如何设计、扩库时怎么记主落点/补充落点/标签，以及 **§11「扣 JS → Node CLI 桥接」、§12「先拿抓包密文做解密 oracle 再写加密」（密文长度反推明文/`Content-Length` 反推字段数/URL 编码/JSON `separators` 对齐/固定 IV 逐字节复现）与 §13「JS 侧编码库与 Python 标准库的字节级差异」（fflate gzip 头尾拼装、base64url 无填充、浮点数格式对齐）**。
- [references/07-antidebug-and-live-patching.md](./references/07-antidebug-and-live-patching.md)
  用途：无限 debugger 三层定位、mitmproxy 响应改写与在线补丁、**「解密 → 反混淆 → 再加密」回写**、每次访问都变的 JS 如何还原成 Python、两层 eval（VM 内代码）的获取流程、参数溯源三分类法。
- [references/09-antidebug-and-automation-fingerprint.md](./references/09-antidebug-and-automation-fingerprint.md)
  用途：**反调试完整分类表（10 类，含判据与处置）**、不受 hook 影响的检测（隐藏 iframe 取原生 API、
  `[native code]` 完整性校验与 `toString` 联动 patch）、`location` 不可重写 / `console.log` 与定时器不能无条件置空、
  **sink→运行时栈→bundle 对位三步定位法**、自动化框架自身指纹（CDP 焦点伪造 `hasFocus()+visible` 矛盾、
  实测 A/B 对照与规避）、反调试处置决策树。
- [references/08-mixed-crypto-segmentation.md](./references/08-mixed-crypto-segmentation.md)
  用途：**混合加密分段还原总纲** —— 从密文长度/字符集黑盒推骨架、长度→算法反查表、三段定位法（常量特征 / 关键字 / Proxy 陷阱）、对称段四元组定界与逐字节 diff 验证、同骨架四类变体对照、会话级复用清单、PoW 段归约、**密钥包装的另外三种形态（自描述密文 / 响应自带密钥 / 算法按时间戳奇偶切换，§八）**。
- [references/10-waf-clearance-cookie.md](./references/10-waf-clearance-cookie.md)
  用途：**边缘 WAF / CDN 准入 Cookie 的离线求解**（该族「可离线部分」的唯一权威源）——
  加速乐 jsl 两趟（第一趟 JSFuck 化算术按 JS 语义求值、第二趟双字符补位暴力、`bts[1]` 不可 unquote）、
  阿里 acw_sc__v2 旧版 `unsbox`+`hexXor` 与新版 LCG+洗牌（含「`Function.toString()` 参与计算 ⇒ 格式化必失败」
  与「`debugger` 字符串不能删」两个机制）、RC4 字符串表的旋转量标定（**有效次数恰等于字面量**）、
  Cloudflare 响应体 rayId 派生 XOR（**base64 占比 = 1.000 才是 rayId 取对**）与字符串表恒等式枚举旋转量
  （**`parseInt` 前导整数语义 + 精确相等，否则静默搜不到**）、Turnstile 1024 bit 模幂与 Drop 时间锁 PoW、
  以及「常量表还原优先级」「何时不要做纯算」两条跨族结论。
- [references/11-jsvmp-restoration-routes.md](./references/11-jsvmp-restoration-routes.md)
  用途：**JSVMP 该走哪条路的唯一权威源** —— 选路决策树、五条快速判据、
  三条路线（插桩 / 反编译 / 补环境）的细节权威源指针、插桩纯算落地八步、
  「真实密文当第一道 oracle」的对拍口径、媒体流里 JSVMP 与 `stream-drm-reverse` 的分工、
  「响应加密能不能直接绕过」的判据、以及七条反例。
- [references/12-login-and-account-params.md](./references/12-login-and-account-params.md)
  用途：**登录 / 账号体系提交参数的唯一权威源** —— 五步工作流、参数三分类（服务器下发字段清单 /
  密码加密族 / 风控指纹）、密码加密族判据表（MD5 链四形态 / base64 / AES / DES / RSA）、
  `charCodeAt & 0xff` 与 `CryptoJS.MD5` 的口径差、提交形态两段式（明文框 + 隐藏字段）、
  扣 JS 的四处固定修改、webpack 单文件「外部拿不到局部变量」的两种打法、
  签名类 `md5(pathname + query + body)` 与百分号白名单还原、「不报错但结果错」坑表与反例黑名单。
- [scripts/login_param_probe.py](./scripts/login_param_probe.py)
  用途：上条目的可执行实现（**零依赖**）—— `classify`（密文形态 → 加密族，含「base64 解出来是乱码
  ⇒ 内层是分组密码」这条关键分岔）/ `b64-probe` / `md5-chain`（四种实测 MD5 链）/
  `rsa-pubkey`（纯 Python 解析 PEM / JSEncrypt base64 / 裸 DER，可与接口下发的
  `publickey_mod` / `publickey_exp` **逐值对拍**）/ `des`（**本仓库此前没有 DES**，纯 Python DES/3DES ECB+CBC）。
  `--selftest` 的期望值来自三条**独立**来源：RFC 1321、文章原样 JS 实跑、OpenSSL
  （夹具与生成器见 `artifacts/skill-evolution/b15-run-20260922-1733/`）。
- [references/14-browser-rpc-bridge.md](./references/14-browser-rpc-bridge.md)
  用途：**浏览器 WebSocket RPC 免扣方案** —— 在重度 JSVMP、超高频密钥轮换或极端浏览器环境绑定下，
  通过轻量 WebSocket 脚本桥接浏览器运行时与本地 Python / 爬虫，实现“免扣代码、秒级交付、零风控差异调用”。
- [scripts/waf_clearance_solver.py](./scripts/waf_clearance_solver.py)
  用途：上条目的可执行实现（**零依赖，`--selftest` 自带分组断言，含真实样本 oracle 与反例**）——
  `classify` / `jsl-first` / `jsl` / `acw-table` / `acw-v2-old` / `cf-decode` / `cf-strtable` / `pow-drop` / `pow-bigint`。
  其中 `cf-decode` 与 `cf-strtable` 会对本仓 `cloudflare/xai-cloudflare/artifacts/` 的真实样本做逐字节对拍。
- [scripts/new_case_scaffold.py](./scripts/new_case_scaffold.py)
  用途：新站点或新 challenge 建标准化案例目录。
- [scripts/browser_rpc_bridge.py](./scripts/browser_rpc_bridge.py)
  用途：**浏览器 WebSocket RPC 桥接中继服务** —— 支持 `--emit-inject` 打印浏览器注入脚本，支持 `--serve` 启动双向 WS/HTTP 调用中继，支持 `--call` 命令行快速验证。
- [references/15-call-site-locating-playbook.md](./references/15-call-site-locating-playbook.md)
  用途：**「加密发生在哪一行」的唯一权威源** —— 跟栈五判据（J1「参数在某层消失」/ J2 头部已带密文 /
  J3 头部没有尾部有 / J4 函数无形参 / J5 控制台是明文）、`send` 起点与 `Preserve log` 开场、
  三种生成形态、**「断点处的值 vs 最终请求里的值」逐字符对拍**（唯一验收动作）与「连抓两次」定参数三分类、
  三个隐藏依赖（**响应 Cookie 既是加密输入又是请求头** / 时间戳同源 / 表单格式一致）、
  `public` 密钥包 → 目标密文包的两包链、扣代码四要点（报错驱动补全 / `console.log(e)` 让加载器报缺模块 /
  **原型方法必须补在 `new` 之前** / 加载器头部形参与 `e = {}` 冲突）、
  条件断点定位器（`e.url.includes(...)`，异步栈内要换帧）、八条静默陷阱（**抄串先搜 `&#` 实体** / 待签数组 `sort()` / 参数在 URL 而非 body）。
- [references/16-ciphertext-structure-diagnostics.md](./references/16-ciphertext-structure-diagnostics.md)
  用途：**「只有一段密文时先读什么」的唯一权威源** —— 三类不需密钥的客观信息（**长度**判块大小与填充 /
  **字符集**判编码链，含 `%uXXXX` 只有 `escape()` 会产生、base64url 必须先替换 `-`/`_` /
  **公共子串**判「明文哪两段相同」），以及 **★ 反向用法**：**公共段长度不是块大小整数倍就反证了「整块加密」**
  （实测 40 字节 + 8 字节公共尾 ⇒ 直接排除 16 字节块 AES-CBC，省掉「用 AES 试一百遍再怀疑 key」的时间）；
  内置编解码函数的**形态指纹表**（能从产物形状反查用了 `escape` / `encodeURI` / `btoa` / `fromCharCode` / `CryptoJS`）；
  「形态像 ≠ 就是它」的四个陷阱（32 位 hex 未必是 MD5、末尾 `==` 未必是 AES、**前 16 字节乱是 IV 错不是算法错**）；
  以及**求助帖式任务（原文没有结论）的登记纪律**——只登记可复现的结构观察，一条结论都不许往外推。
- 媒体流 / DRM / ts 分片（判层、AES/SM4 内容解密、许可证体系、白盒 wasm）→ `../stream-drm-reverse/SKILL.md`：
  本技能不覆盖这条链路，遇到 `m3u8` / `EXT-X-KEY` / `GetLicense` / 花屏类现象请直接切过去。

## 案例脚手架

要在工作区里快速起一套“可复盘、可扩展”的案例骨架，运行：

```powershell
python "<skill-dir>\\scripts\\new_case_scaffold.py" `
  "case-name" `
  --type captcha `
  --family tencent `
  --tags captcha,collect,pow `
  --sources "https://example-a,https://example-b" `
  --language py `
  --output ".\\research"
```

脚手架会生成：

- `case-overview.md`
- `request-chain.md`
- `evidence-log.md`
- `checkpoints.json`
- `metadata.json`
- `solver_stub.js` 或 `solver_stub.py`
- `todo.md`

## 最后约束

始终偏向下面这些做法：

1. 从真实请求或真实 sink 进入。
2. 对浏览器值和本地值建立同构检查点。
3. 先拆算法层、环境层、协议层，再决定怎么迁移。
4. 同站点多文章时记录“思路差异”，不要只保留一个最终答案。
5. 每个案例都沉淀输入边界、检查点、代码骨架、易错点，而不是只留最终成品。