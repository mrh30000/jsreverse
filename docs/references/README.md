# Web JS 逆向参考资料索引

来源：52pojie 精华/技术/热门/最新帖 + 关键词搜索（`hubcli 52pojie`）。
文件名格式：`52pojie-<帖子ID>-<标题>.md`（批量归档）与 `<帖子ID>-<英文 slug>.md`（早期人工命名），
正文即帖子 Markdown（含作者 / 发布时间 / 原文链接头部）。

- 早期归档：**43 篇**（原 `README` 表格，人工筛选+英文 slug）
- 批量归档：**166 篇**（2026-09-20 自动抓取+筛选，见第二节）
- 补充归档（一）：**82 篇**（2026-09-20 扩关键词补漏抓取，见第三节）
- 补充归档（二）：**41 篇**（2026-09-20 第三轮长尾关键词 + 筛选口径修正，见第四节）
- 补充归档（三）：**30 篇**（2026-09-20 第四轮长尾关键词 [webpack/protobuf/字体反爬] + 审计补漏，见第五节）
- 补充归档（四）：**15 篇**（2026-09-20 第五轮长尾关键词 + 审计补漏 [sign 参数逆向类漏拣]，见第六节）
- 补充归档（五）：**60 篇**（2026-09-20 第六轮 [验证码/滑块/纯算/参数分析类被 `search --limit 40` 截断的老帖补回] + STRONG 扩容，见第七节）
- 补充归档（六）：**13 篇**（2026-09-21 第七轮 [「验证码逆向专栏」系列 + 点选/指纹类] + 修一处历史误杀，见第八节）
- 补充归档（七）：**22 篇**（2026-09-21 第八轮 [STRONG 扩容后存量补捞 + 剔除 23 篇「通用加解密」假阳性]，见第九节）
- 补充归档（八）：**18 篇**（2026-09-21 第九轮 [隐称「某X」关键词首次覆盖 + 审计 B/C 表逐条补漏]，见第十节）
- 补充归档（九）：**27 篇**（2026-09-21 第十轮 [审计 C 表 STRONG 整类漏拣补回 + 长尾关键词/隐称二批 + 坑19 缓解落地]，见第十一节）
- 补充归档（十）：**22 篇**（2026-09-21 第十一轮 [关键词「视频/m3u8/直播源 × 解密」与「平台+登录/接口」两个组合命中存量老帖 + 审计 C 表逐条补回]，见第十二节）
- 补充归档（十一）：**110 篇**（2026-09-21 第十二轮 [`hubcli search` GBK 字符集失效修复 → 浏览器驱动搜索 + 全量分页；30 个高价值历史词复扫命中 88 篇被 `limit 40` 截断的存量老帖]，见第十三节）
- 补充归档（十二）：**37 篇**（2026-09-22 第十三轮 [历轮全部 586 个历史关键词「浏览器全量分页」复扫至 470 词收口；新增全部来自审计 C/E 表补漏通道，主题集中为 `视频/m3u8/直播源解密` 与 `登录/接口/签名/参数逆向` 两类存量老帖]，见第十四节）
- 补充归档（十三）：**39 篇**（2026-09-22 第十五轮[第十四轮审计粗筛出的 548 篇 C/E 表候选**逐条抓正文复核**：548 → 196 核心命中 → 定稿 39，主题为 `登录/参数/算法还原` 17 + `扣代码/AST/反调试` 6 + `风控/字体/指纹` 7 + `视频/m3u8/DRM` 9]，见第十五节）

> 目录现状（`artifacts/52pojie-fetch15/` 终检，2026-09-22 第十五轮）：
> 文章 `.md` 共 **739 个**（不含本 README）= `52pojie-<id>-<标题>.md` **682 个** + 早期 `<id>-<slug>.md` **51 个**
> + 无 ID 的早期手工文件 6 个（`weixin-*.md`、`cloudflare*.md`、`verified.md` 等）。
> 唯一帖子 ID **731** 个；另有 2 个 `.验证报告.md` 与主文共用同一 ID（`2098573`、`2100076`，非重复）。
> 空文件（<400B）**0** 个；本轮新增 39 篇中薄文件（<1500B）1 个（`1044889` 58同城字体解析，正文仅说明+附件，属正常）。重复 ID 0 组。
> 编码扫描（`repair-encoding.py --scan`）740 文件 **0 命中**。

---

## 一、早期归档（43 篇）

### 基础理论 / V8

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| V8 词法/语法分析、AST、作用域、闭包、字节码生成（超长入门） | `2092084-web-js-rev-v8-ast-bytecode.md` | [2092084](https://www.52pojie.cn/thread-2092084-1-1.html) |
| Ignition 解释器（下）：执行上下文、词法环境、栈帧 | `2105820-web-js-rev-ignition-part2.md` | [2105820](https://www.52pojie.cn/thread-2105820-1-1.html) |
| Ignition 解释器（三） | `2107113-web-js-rev-ignition-part3.md` | [2107113](https://www.52pojie.cn/thread-2107113-1-1.html) |
| JS 事件、事件循环与异步 | `2111598-web-rev-js-event-loop-async.md` | [2111598](https://www.52pojie.cn/thread-2111598-1-1.html) |

### JSVMP / VMP 逆向

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| 某Q音乐 jsvmp：AST 插桩 + 检测点（域名）定位 | `2123850-qqmusic-jsvmp.md` | [2123850](https://www.52pojie.cn/thread-2123850-1-1.html) |
| 某Q音乐 sign 纯算：vmp 插桩日志逐条分析（含完整日志导出脚本） | `2104849-qqmusic-sign-vmp-instrument-log.md` | [2104849](https://www.52pojie.cn/thread-2104849-1-1.html) |
| 某Q音乐 Sign 参数 vmp 逆向分析 | `2079071-qqmusic-sign-param-vmp.md` | [2079071](https://www.52pojie.cn/thread-2079071-1-1.html) |
| 某Q音乐 VMP 初始化分析 & SHA-1 算法识别 | `2116112-qqmusic-vmp-init-sha1.md` | [2116112](https://www.52pojie.cn/thread-2116112-1-1.html) |
| 某音 a_bogus：栈式 VM 指令表还原 + CFG 反编译 | `2116186-douyin-a_bogus-jsvmp-decompile.md` | [2116186](https://www.52pojie.cn/thread-2116186-1-1.html) |
| 某音 bogus 纯算：旁路式 AST 插桩 + PC 状态机还原 | `2120914-douyin-jsvmp-bogus-pure-algo.md` | [2120914](https://www.52pojie.cn/thread-2120914-1-1.html) |
| 某音 a_bogus：50 位数组生成过程（RC4/SM3/魔改 base64 日志法） | `2092806-douyin-a_bogus-50bytes.md` | [2092806](https://www.52pojie.cn/thread-2092806-1-1.html) |
| 某红书 4.3.2 mns0301：绕过 ob 直面 JSVMP 插桩 | `2098573-xhs-4.3.2-jsvmp-mns0301.md` | [2098573](https://www.52pojie.cn/thread-2098573-1-1.html) |
| 某红书 4.3.2 ob 混淆 AST 还原（字符串数组/字典/控制流平坦化） | `2100076-xhs-4.3.2-ob-deobfuscate.md` | [2100076](https://www.52pojie.cn/thread-2100076-1-1.html) |
| 某讯 jsvmp（一）：VMP 结构与指令流定位 | `2084662-tencent-jsvmp-part1.md` | [2084662](https://www.52pojie.cn/thread-2084662-1-1.html) |
| JSVMP 纯算取巧方式（栈/指令/PC 语义归纳） | `2073641-jsvmp-pure-algo-tricks.md` | [2073641](https://www.52pojie.cn/thread-2073641-1-1.html) |
| AST 自动插桩 jsvmp 的简单实现 | `2079058-ast-jsvmp-instrument.md` | [2079058](https://www.52pojie.cn/thread-2079058-1-1.html) |
| cctv 视频解密：wasm vmp 反汇编为 IR 中间产物 | `2094716-cctv-video-decrypt-wasm-vmp.md` | [2094716](https://www.52pojie.cn/thread-2094716-1-1.html) |

### AST / 解混淆

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| 某招投标服务平台 AST 详细解析（别名映射替换、表达式还原） | `2062927-ast-bidding-platform.md` | [2062927](https://www.52pojie.cn/thread-2062927-1-1.html) |
| funcaptcha 类 ob 逆向解混淆（为通用 ob 解混淆器做准备） | `2092043-funcaptcha-ob-deobfuscate.md` | [2092043](https://www.52pojie.cn/thread-2092043-1-1.html) |

### Hook / 插桩工具

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| Hook CryptoJS 所有对称加密算法（成品脚本） | `2081618-hook-cryptojs-symmetric.md` | [2081618](https://www.52pojie.cn/thread-2081618-1-1.html) |

### 补环境

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| h5st：纯 AI 补环境 + 纯算（tk03/token、XMLHttpRequest 实现） | `2092635-h5st-ai-env-patching.md` | [2092635](https://www.52pojie.cn/thread-2092635-1-1.html) |
| iv8：Python 原生 V8 补环境（瑞数6 / zp_stoken / abogus / h5st 实战） | `2106217-iv8-python-v8-env-ruishu6.md` | [2106217](https://www.52pojie.cn/thread-2106217-1-1.html) |
| 慢脚 AI 全链路 js 分析补环境 | `2097554-kuaishou-ai-js-env-patching.md` | [2097554](https://www.52pojie.cn/thread-2097554-1-1.html) |
| AI 复现 CCTV 播放链路：worker 消息重放、逻辑时间对齐 | `2102594-ai-replay-cctv-playback.md` | [2102594](https://www.52pojie.cn/thread-2102594-1-1.html) |

### 签名 / 加密参数纯算

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| 小蓝鸟 x-client-transaction-id：CSS 动画指纹 + SHA-256 本地重算 | `2122687-twitter-x-client-transaction-id.md` | [2122687](https://www.52pojie.cn/thread-2122687-1-1.html) |
| 雷速体育：动态 AES 签名（accept 头）+ 魔改 gzip 响应解密 | `2122363-leisu-api-aes-sign-gzip.md` | [2122363](https://www.52pojie.cn/thread-2122363-1-1.html) |
| 某大型电商（JD）平台参数逆向：sign 生成链还原 | `2082647-js-reverse-ecommerce-params.md` | [2082647](https://www.52pojie.cn/thread-2082647-1-1.html) |
| 某音 ab 参数逆向分析 | `2088330-douyin-ab-params.md` | [2088330](https://www.52pojie.cn/thread-2088330-1-1.html) |
| 某咕视频 ddCalcu 参数分析 | `2101190-migu-video-ddcalcu.md` | [2101190](https://www.52pojie.cn/thread-2101190-1-1.html) |
| 某程 token 纯算：vmp 插桩日志分析 | `2106666-ctrip-token-vmp-trace-log.md` | [2106666](https://www.52pojie.cn/thread-2106666-1-1.html) |
| 爱某网参数逆向全流程（音频接口 base64/加密链） | `2093320-aimouwang-params-reverse.md` | [2093320](https://www.52pojie.cn/thread-2093320-1-1.html) |
| 某里新版 acw_sc__v2 算法分析 | `2062618-ali-acw-sc-v2.md` | [2062618](https://www.52pojie.cn/thread-2062618-1-1.html) |
| 酷我破解 js 脚本分析 | `2088285-kuwo-js-reverse.md` | [2088285](https://www.52pojie.cn/thread-2088285-1-1.html) |

### 通信协议 / 消息还原

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| WebSocket 通信逆向：AES 加解密 + 消息还原为完整 HTML | `2066191-websocket-reverse-rebuild-html.md` | [2066191](https://www.52pojie.cn/thread-2066191-1-1.html) |
| Trae CN：`tc` 加密格式破解，本地 OpenAI/Anthropic 兼容 API 服务 | `2113927-trae-cn-protocol.md` | [2113927](https://www.52pojie.cn/thread-2113927-1-1.html) |
| Cloudflare Drop 逆向：串行哈希链 PoW 求解、Ed25519/HS256 JWT 鉴权与自动化部署 Skill | `2116523-cloudflare-drop-reverse.md` | [2116523](https://www.52pojie.cn/thread-2116523-1-1.html) |

### 验证码 / 风控

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| 某象（顶象）滑块纯算逆向分析 | `2125447-dingxiang-slider-pure-algo.md` | [2125447](https://www.52pojie.cn/thread-2125447-1-1.html) |
| 最新易盾 web 滑块逆向分析 | `2108119-yidun-web-slider-reverse.md` | [2108119](https://www.52pojie.cn/thread-2108119-1-1.html) |
| 某御（天御）验证码逆向：auth/verify 接口 + 有效性校验 | `2082553-yuyu-captcha-reverse.md` | [2082553](https://www.52pojie.cn/thread-2082553-1-1.html) |
| Tbooking 验证码逆向：AST 解混淆定位别名映射 | `2080682-tbooking-captcha-visual.md` | [2080682](https://www.52pojie.cn/thread-2080682-1-1.html) |
| 某美验证码 + 指纹风控浅析（register/web/fverify/verify 四接口） | `2069214-meimei-captcha-risk.md` | [2069214](https://www.52pojie.cn/thread-2069214-1-1.html) |
| 某盾无感（无感验证）逆向分析 | `2073124-shield-passive-reverse.md` | [2073124](https://www.52pojie.cn/thread-2073124-1-1.html) |
| 智慧酒店滑块底图还原（canvas 断点 + 乱序底图重排） | `2094667-smart-hotel-slider-bg-restore.md` | [2094667](https://www.52pojie.cn/thread-2094667-1-1.html) |
| YOLO 深度学习识别计算题验证码 | `2098921-yolo-captcha-calc.md` | [2098921](https://www.52pojie.cn/thread-2098921-1-1.html) |
| Cloudflare Turnstile 逆向：自定义 VM 字节码、BigInt 模幂 PoW、LZW 压缩与遥测系统 | `1752891-cloudflare-turnstile-reverse.md` | [1752891](https://linux.do/t/1752891) |

### App 侧（含抓包校验绕过，非纯 Web）

| 主题 | 文件 | 帖子 |
| --- | --- | --- |
| 七猫小说：OkHttp hostnameVerify 绕过 + native sign（frida/IDA） | `2102001-bamao-novel-hostnameverify-sign.md` | [2102001](https://www.52pojie.cn/thread-2102001-1-1.html) |
| 某黑盒 App 登录参数逆向：请求头 nonce 生成链 | `2065441-blackbox-app-login-params.md` | [2065441](https://www.52pojie.cn/thread-2065441-1-1.html) |
| 某乖生活 App 桶自洁接口加密参数（360 加固/frida/jadx） | `2069979-guaigai-liveapp-encrypt-params.md` | [2069979](https://www.52pojie.cn/thread-2069979-1-1.html) |
| 某短视频指纹与纯算 sig3（QUIC 降级抓包） | `2080428-shortvideo-sig3-fingerprint-pure-algo.md` | [2080428](https://www.52pojie.cn/thread-2080428-1-1.html) |

### 其他（第三方来源）

| 主题 | 文件 |
| --- | --- |
| Cloudflare 5s 盾分析（CSDN） | `cloudflare 5s盾分析-CSDN博客.md` |
| Cloudflare / Akamai / Kasada 反爬侧重点对比 | `Cloudflare、Akamai、Kasada 等头部公司怎么做反爬？侧重点是什么，一篇文章给你说清楚！.md` |
| 微信 gecaptcha 逆向 | `weixin-geetest.md` |
| 一文速通控制流平坦化 | `weixin-一文速通控制流平坦化.md` |

---

## 二、新增批量归档（166 篇，2026-09-20 自动抓取）

来源：`hubcli 52pojie Thread`（精华/热门/技术/最新 三页）+ `hubcli 52pojie search`（JS逆向 / web逆向 / jsvmp / 补环境 / AST / 滑块 / 验证码 / 加密参数 / wasm / 反爬 / 混淆 等关键词）。
筛选口径：标题/版块命中 web 逆向特征（JS 逆向、JSVMP、AST、补环境、验证码滑块、加密参数、wasm、反爬），
排除求助/悬赏/资源索取帖，以及纯 Android/Windows/native 逆向、木马分析、游戏外挂等非 web 主题。已按帖子 ID 去重。
分类由标题关键词自动生成，仅供参考。同名 `.验证报告.md` 为后续人工核验产物。

### 验证码 / 滑块 / 风控（50）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2128465](https://www.52pojie.cn/thread-2128465-1-1.html) | 【逆向分析】某验4代滑块验证码纯算还原——从抓包到全参数纯算 | `52pojie-2128465-【逆向分析】某验4代滑块验证码纯算还原——从抓包到全参数纯算.md` |
| [2126956](https://www.52pojie.cn/thread-2126956-1-1.html) | qcloud滑块验证 | `52pojie-2126956-qcloud滑块验证.md` |
| [2125810](https://www.52pojie.cn/thread-2125810-1-1.html) | 文字点选验证码逆向实战 | `52pojie-2125810-文字点选验证码逆向实战.md` |
| [2112042](https://www.52pojie.cn/thread-2112042-1-1.html) | YOLO识别拼图过滑块验证 | `52pojie-2112042-YOLO识别拼图过滑块验证.md` |
| [2111224](https://www.52pojie.cn/thread-2111224-1-1.html) | 某网站登录及拼图滑块参数逆向分析 | `52pojie-2111224-某网站登录及拼图滑块参数逆向分析.md` |
| [2109685](https://www.52pojie.cn/thread-2109685-1-1.html) | SM双图滑块验证码逆向分析 | `52pojie-2109685-SM双图滑块验证码逆向分析.md` |
| [2106089](https://www.52pojie.cn/thread-2106089-1-1.html) | 智慧酒店登录滑块各部分易错点详析 | `52pojie-2106089-智慧酒店登录滑块各部分易错点详析.md` |
| [2104726](https://www.52pojie.cn/thread-2104726-1-1.html) | 猿人学验证码 - 图文点选题目分析 | `52pojie-2104726-猿人学验证码 - 图文点选题目分析.md` |
| [2099515](https://www.52pojie.cn/thread-2099515-1-1.html) | 文字点选及语序点选验证码识别方案 | `52pojie-2099515-文字点选及语序点选验证码识别方案.md` |
| [2098660](https://www.52pojie.cn/thread-2098660-1-1.html) | 【Web逆向】GIF验证码 | `52pojie-2098660-【Web逆向】GIF验证码.md` |
| [2098532](https://www.52pojie.cn/thread-2098532-1-1.html) | 基于AI的某防水墙滑块验证码自动化全链路实现 | `52pojie-2098532-基于AI的某防水墙滑块验证码自动化全链路实现.md` |
| [2097198](https://www.52pojie.cn/thread-2097198-1-1.html) | 腾讯滑块纯算法浅析 | `52pojie-2097198-腾讯滑块纯算法浅析.md` |
| [2089027](https://www.52pojie.cn/thread-2089027-1-1.html) | 手把手教你给某讯滑块的JSVMP写反编译器 (如宝宝辅食一样易懂) | `52pojie-2089027-手把手教你给某讯滑块的JSVMP写反编译器 (如宝宝辅食一样易懂).md` |
| [2088578](https://www.52pojie.cn/thread-2088578-1-1.html) | 某雷云盘验证码逆向思路总结 | `52pojie-2088578-某雷云盘验证码逆向思路总结.md` |
| [2076316](https://www.52pojie.cn/thread-2076316-1-1.html) | 极验滑块第4代逆向分析 | `52pojie-2076316-极验滑块第4代逆向分析.md` |
| [2071222](https://www.52pojie.cn/thread-2071222-1-1.html) | 一时兴起分析并绕过某网站验证码验证 | `52pojie-2071222-一时兴起分析并绕过某网站验证码验证.md` |
| [2059636](https://www.52pojie.cn/thread-2059636-1-1.html) | 数美滑动验证码逆向 | `52pojie-2059636-数美滑动验证码逆向.md` |
| [2057521](https://www.52pojie.cn/thread-2057521-1-1.html) | 百度旋转验证码算法逆向分析 | `52pojie-2057521-百度旋转验证码算法逆向分析.md` |
| [2057071](https://www.52pojie.cn/thread-2057071-1-1.html) | 极验4代 九宫格验证码识别(Resnet) | `52pojie-2057071-极验4代 九宫格验证码识别(Resnet).md` |
| [2053068](https://www.52pojie.cn/thread-2053068-1-1.html) | 顶象滑块验证码纯算逆向分析 | `52pojie-2053068-顶象滑块验证码纯算逆向分析.md` |
| [2052187](https://www.52pojie.cn/thread-2052187-1-1.html) | 某x滑块补环境分析 | `52pojie-2052187-某x滑块补环境分析.md` |
| [2051616](https://www.52pojie.cn/thread-2051616-1-1.html) | 极验3代滑块-扣代码及思路 | `52pojie-2051616-极验3代滑块-扣代码及思路.md` |
| [2051507](https://www.52pojie.cn/thread-2051507-1-1.html) | 极验3代滑块流程分析 | `52pojie-2051507-极验3代滑块流程分析.md` |
| [2049410](https://www.52pojie.cn/thread-2049410-1-1.html) | 某酒店登录系统滑块逆向分析 | `52pojie-2049410-某酒店登录系统滑块逆向分析.md` |
| [2044075](https://www.52pojie.cn/thread-2044075-1-1.html) | ast还原某程登陆滑块逆向分析 | `52pojie-2044075-ast还原某程登陆滑块逆向分析.md` |
| [2043678](https://www.52pojie.cn/thread-2043678-1-1.html) | 虚实相生-某网真假双滑块逆向分析 | `52pojie-2043678-虚实相生------某网真假双滑块逆向分析.md` |
| [2043649](https://www.52pojie.cn/thread-2043649-1-1.html) | 某美官网案例滑块逆向 | `52pojie-2043649-某美官网案例滑块逆向.md` |
| [2043291](https://www.52pojie.cn/thread-2043291-1-1.html) | 某云空间推理验证码识别模型训练 | `52pojie-2043291-某云空间推理验证码识别模型训练.md` |
| [2042937](https://www.52pojie.cn/thread-2042937-1-1.html) | 某财富网滑块逆向 | `52pojie-2042937-某财富网滑块逆向.md` |
| [2040415](https://www.52pojie.cn/thread-2040415-1-1.html) | 乐某自研滑块逆向分析 | `52pojie-2040415-乐某自研滑块逆向分析.md` |
| [2038410](https://www.52pojie.cn/thread-2038410-1-1.html) | 猿人学第二题之获取 滑块图片相关信息 | `52pojie-2038410-猿人学第二题之获取 滑块图片相关信息.md` |
| [2037138](https://www.52pojie.cn/thread-2037138-1-1.html) | 超星某习通滑块验证登录逆向分析 | `52pojie-2037138-超星某习通滑块验证登录逆向分析.md` |
| [2035508](https://www.52pojie.cn/thread-2035508-1-1.html) | 某花顺登录滑块逆向 | `52pojie-2035508-某花顺登录滑块逆向.md` |
| [2031712](https://www.52pojie.cn/thread-2031712-1-1.html) | Tk-验证码hashcash之answer参数详解 | `52pojie-2031712-Tk-验证码hashcash之answer参数详解.md` |
| [2028581](https://www.52pojie.cn/thread-2028581-1-1.html) | 信息公示平台搜索滑块逆向 | `52pojie-2028581-信息公示平台搜索滑块逆向.md` |
| [2025578](https://www.52pojie.cn/thread-2025578-1-1.html) | 某当网登录滑块逆向 | `52pojie-2025578-某当网登录滑块逆向.md` |
| [2014831](https://www.52pojie.cn/thread-2014831-1-1.html) | 某音滑块captchaBody分析 | `52pojie-2014831-某音滑块captchaBody分析.md` |
| [2006169](https://www.52pojie.cn/thread-2006169-1-1.html) | 算术验证码识别模型训练 | `52pojie-2006169-算术验证码识别模型训练.md` |
| [1982617](https://www.52pojie.cn/thread-1982617-1-1.html) | 某云无感滑块逆向之懵了几天（下）【修改一下有始有终】 | `52pojie-1982617-某云无感滑块逆向之懵了几天（下）【修改一下有始有终】.md` |
| [1978737](https://www.52pojie.cn/thread-1978737-1-1.html) | 某云无感滑块逆向之“大爷，饶了我吧！”（上） | `52pojie-1978737-某云无感滑块逆向之“大爷，饶了我吧！”（上）.md` |
| [1946693](https://www.52pojie.cn/thread-1946693-1-1.html) | DrissionPage过某验滑块 | `52pojie-1946693-DrissionPage过某验滑块.md` |
| [1940566](https://www.52pojie.cn/thread-1940566-1-1.html) | 某验反爬滑块逆向分析 | `52pojie-1940566-某验反爬滑块逆向分析.md` |
| [1908744](https://www.52pojie.cn/thread-1908744-1-1.html) | 【JavaScript 逆向】某音滑块纯算，底图还原，captchaBody，轨迹算法，abogus | `52pojie-1908744-【JavaScript 逆向】某音滑块纯算，底图还原，captchaBody，轨迹算法，abogus.md` |
| [1897823](https://www.52pojie.cn/thread-1897823-1-1.html) | 快手滑块轨迹分析 | `52pojie-1897823-快手滑块轨迹分析.md` |
| [1888845](https://www.52pojie.cn/thread-1888845-1-1.html) | [验证码逆向]某手势验证码逆向分析 | `52pojie-1888845-[验证码逆向]某手势验证码逆向分析.md` |
| [1888314](https://www.52pojie.cn/thread-1888314-1-1.html) | [验证码识别]点选验证码识别的通用解决方案-相似度识别 | `52pojie-1888314-[验证码识别]点选验证码识别的通用解决方案-相似度识别.md` |
| [1885936](https://www.52pojie.cn/thread-1885936-1-1.html) | 【验证码逆向专栏】最新某验三代滑块逆向分析，干掉所有的 w 参数！ | `52pojie-1885936-【验证码逆向专栏】最新某验三代滑块逆向分析，干掉所有的 w 参数！.md` |
| [1868945](https://www.52pojie.cn/thread-1868945-1-1.html) | [补环境流]易盾智能无感逆向fp参数 | `52pojie-1868945-[补环境流]易盾智能无感逆向fp参数.md` |
| [1162979](https://www.52pojie.cn/thread-1162979-1-1.html) | 极验反爬虫防护分析之slide验证方式下图片的处理及滑动轨迹的生成思路 | `52pojie-1162979-极验反爬虫防护分析之slide验证方式下图片的处理及滑动轨迹的生成思路.md` |
| [1162893](https://www.52pojie.cn/thread-1162893-1-1.html) | 极验反爬虫防护分析之接口交互的解密方法 | `52pojie-1162893-极验反爬虫防护分析之接口交互的解密方法.md` |

### JSVMP / VMP 逆向（21）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2117124](https://www.52pojie.cn/thread-2117124-1-1.html) | 一文读懂jsvmp之入门篇 | `52pojie-2117124-一文读懂jsvmp之入门篇.md` |
| [2096887](https://www.52pojie.cn/thread-2096887-1-1.html) | 某音乐jsvmp插桩纯算解析+响应数据加密绕过 | `52pojie-2096887-某音乐jsvmp插桩纯算解析+响应数据加密绕过.md` |
| [2086034](https://www.52pojie.cn/thread-2086034-1-1.html) | 某讯jsvmp(二) | `52pojie-2086034-某讯jsvmp(二).md` |
| [2083501](https://www.52pojie.cn/thread-2083501-1-1.html) | JS逆向外贸教育平台，调度器的理解 | `52pojie-2083501-JS逆向外贸教育平台，调度器的理解.md` |
| [2076005](https://www.52pojie.cn/thread-2076005-1-1.html) | Python爬虫进阶：spiderdemo困难题JSVMP-T6题解 | `52pojie-2076005-Python爬虫进阶：spiderdemo困难题JSVMP-T6题解.md` |
| [2053916](https://www.52pojie.cn/thread-2053916-1-1.html) | 【js逆向】码上爬-题十二JSVMP入门逆向补环境 | `52pojie-2053916-【js逆向】码上爬-题十二JSVMP入门逆向补环境.md` |
| [2042090](https://www.52pojie.cn/thread-2042090-1-1.html) | 某q音乐jsvmp反编译 | `52pojie-2042090-某q音乐jsvmp反编译.md` |
| [2040789](https://www.52pojie.cn/thread-2040789-1-1.html) | Web逆向之VMP还原全流程 | `52pojie-2040789-Web逆向之VMP还原全流程.md` |
| [2034891](https://www.52pojie.cn/thread-2034891-1-1.html) | 某程token  jsvmp算法分析 | `52pojie-2034891-某程token jsvmp算法分析.md` |
| [2027657](https://www.52pojie.cn/thread-2027657-1-1.html) | AI与JSVMP的初次结合-深入浅出的逆向JSVMP | `52pojie-2027657-AI与JSVMP的初次结合-深入浅出的逆向JSVMP.md` |
| [2023103](https://www.52pojie.cn/thread-2023103-1-1.html) | 某q-深入浅出 JSVMP | `52pojie-2023103-某q-深入浅出 JSVMP.md` |
| [1974900](https://www.52pojie.cn/thread-1974900-1-1.html) | 某音新版jsvmp参数a_bogus分析 | `52pojie-1974900-某音新版jsvmp参数a_bogus分析.md` |
| [1969992](https://www.52pojie.cn/thread-1969992-1-1.html) | 某q音乐新版txjsvmp分析 | `52pojie-1969992-某q音乐新版txjsvmp分析.md` |
| [1894606](https://www.52pojie.cn/thread-1894606-1-1.html) | 某讯jsvmp还原 | `52pojie-1894606-某讯jsvmp还原.md` |
| [1865940](https://www.52pojie.cn/thread-1865940-1-1.html) | [JSvmp] 某书最新webprofile之profileData逆向算法 | `52pojie-1865940-[JSvmp] 某书最新webprofile之profileData逆向算法.md` |
| [1865657](https://www.52pojie.cn/thread-1865657-1-1.html) | 巨量算数response解密[jsvmp] | `52pojie-1865657-巨量算数response解密[jsvmp].md` |
| [1744197](https://www.52pojie.cn/thread-1744197-1-1.html) | 【JS 逆向百例】某音 X-Bogus 逆向分析，JSVMP 纯算法还原 | `52pojie-1744197-【JS 逆向百例】某音 X-Bogus 逆向分析，JSVMP 纯算法还原.md` |
| [1686683](https://www.52pojie.cn/thread-1686683-1-1.html) | 【JS逆向系列】某乎x96参数3.0版本与jsvmp进阶 | `52pojie-1686683-【JS逆向系列】某乎x96参数3.0版本与jsvmp进阶.md` |
| [1645300](https://www.52pojie.cn/thread-1645300-1-1.html) | 某乎x96jsvmp算法还原新手初体验 | `52pojie-1645300-某乎x96jsvmp算法还原新手初体验.md` |
| [1631492](https://www.52pojie.cn/thread-1631492-1-1.html) | 某音jsvmp下参数分析笔记 | `52pojie-1631492-某音jsvmp下参数分析笔记.md` |
| [1619464](https://www.52pojie.cn/thread-1619464-1-1.html) | 【JS逆向系列】某乎x96参数与jsvmp初体验 | `52pojie-1619464-【JS逆向系列】某乎x96参数与jsvmp初体验.md` |

### AST / 解混淆（21）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2128072](https://www.52pojie.cn/thread-2128072-1-1.html) | 猿人学第二题 js混淆-动态cookie1 | `52pojie-2128072-猿人学第二题 js混淆-动态cookie1.md` |
| [2127930](https://www.52pojie.cn/thread-2127930-1-1.html) | 记自己的第一次完整Web逆向——【某人学】js混淆源码 | `52pojie-2127930-记自己的第一次完整Web逆向——【某人学】js混淆源码.md` |
| [2127389](https://www.52pojie.cn/thread-2127389-1-1.html) | 猿人学第一题 js混淆-源码乱码 | `52pojie-2127389-猿人学第一题 js混淆-源码乱码.md` |
| [2085320](https://www.52pojie.cn/thread-2085320-1-1.html) | AST从入门到入土：还原简单的动态JS混淆字符串 | `52pojie-2085320-AST从入门到入土：还原简单的动态JS混淆字符串.md` |
| [2062929](https://www.52pojie.cn/thread-2062929-1-1.html) | Python爬虫进阶：acw_v2加密AST解混淆全流程 | `52pojie-2062929-Python爬虫进阶：acw_v2加密AST解混淆全流程.md` |
| [2034613](https://www.52pojie.cn/thread-2034613-1-1.html) | 某大厂waf逆向 - 用AST还原加强ob混淆壳 | `52pojie-2034613-某大厂waf逆向-- 用AST还原加强ob混淆壳.md` |
| [2015241](https://www.52pojie.cn/thread-2015241-1-1.html) | 【web逆向】优某愿 字体反混淆 | `52pojie-2015241-【web逆向】优某愿 字体反混淆.md` |
| [1913553](https://www.52pojie.cn/thread-1913553-1-1.html) | 利用 ast 解混淆某东 h5st js 文件并进行参数分析 | `52pojie-1913553-利用 ast 解混淆某东 h5st js 文件并进行参数分析.md` |
| [1772187](https://www.52pojie.cn/thread-1772187-1-1.html) | 某小说站点逆向还原文本——CSS反爬，AST解混淆-完美破解于20230409 | `52pojie-1772187-某小说站点逆向还原文本——CSS反爬，AST解混淆-完美破解于20230409.md` |
| [1763215](https://www.52pojie.cn/thread-1763215-1-1.html) | 使用AST解混淆某数5代 | `52pojie-1763215-使用AST解混淆某数5代.md` |
| [1744206](https://www.52pojie.cn/thread-1744206-1-1.html) | 逆向进阶，利用 AST 技术还原 JavaScript 混淆代码 | `52pojie-1744206-逆向进阶，利用 AST 技术还原 JavaScript 混淆代码.md` |
| [1715908](https://www.52pojie.cn/thread-1715908-1-1.html) | 使用AST还原某JS字符串混淆 | `52pojie-1715908-使用AST还原某JS字符串混淆.md` |
| [1700036](https://www.52pojie.cn/thread-1700036-1-1.html) | 用Babel解析AST处理OB混淆JS代码：去除控制流平坦化、处理常量串隐藏和其他通用操作 | `52pojie-1700036-用Babel解析AST处理OB混淆JS代码：去除控制流平坦化、处理常量串隐藏和其他通用操作.md` |
| [1641170](https://www.52pojie.cn/thread-1641170-1-1.html) | AST实战|免安装一键还原ob混淆详细使用教程 | `52pojie-1641170-AST实战 免安装一键还原ob混淆详细使用教程.md` |
| [1591331](https://www.52pojie.cn/thread-1591331-1-1.html) | 某芯片网站js反混淆分析与ast一键还原 | `52pojie-1591331-某芯片网站js反混淆分析与ast一键还原.md` |
| [1569514](https://www.52pojie.cn/thread-1569514-1-1.html) | 某酷ckey签名生成算法系列-（四）ast代码字符串反混淆与回填 | `52pojie-1569514-某酷ckey签名生成算法系列--（四）ast代码字符串反混淆与回填.md` |
| [1566794](https://www.52pojie.cn/thread-1566794-1-1.html) | 某酷ckey签名生成算法系列-（二）ast代码结构逻辑反混淆 | `52pojie-1566794-某酷ckey签名生成算法系列--（二）ast代码结构逻辑反混淆.md` |
| [1354557](https://www.52pojie.cn/thread-1354557-1-1.html) | 利用AST对抗某网站的javascript抽取型混淆 | `52pojie-1354557-利用AST对抗某网站的javascript抽取型混淆.md` |
| [1340226](https://www.52pojie.cn/thread-1340226-1-1.html) | 【使用AST还原JS混淆代码应用】 猿人学爬虫攻防赛 第九题详解 | `52pojie-1340226-【使用AST还原JS混淆代码应用】 猿人学爬虫攻防赛 第九题详解.md` |
| [1339239](https://www.52pojie.cn/thread-1339239-1-1.html) | Python反反爬之JS混淆-动态Cookie(持续更新详细教程) | `52pojie-1339239-Python反反爬之JS混淆---动态Cookie(持续更新详细教程).md` |
| [1337317](https://www.52pojie.cn/thread-1337317-1-1.html) | Python反反爬之JS混淆-源码乱码 (  详细教程 ) | `52pojie-1337317-Python反反爬之JS混淆---源码乱码 ( 详细教程 ).md` |

### 补环境 / 环境还原（19）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2128911](https://www.52pojie.cn/thread-2128911-1-1.html) | 手动补环境过同花顺网站 | `52pojie-2128911-手动补环境过同花顺网站.md` |
| [2103854](https://www.52pojie.cn/thread-2103854-1-1.html) | ai补环境(下) | `52pojie-2103854-ai补环境(下).md` |
| [2092725](https://www.52pojie.cn/thread-2092725-1-1.html) | 某red书最新'x-s'ai纯算+补环境 | `52pojie-2092725-某red书最新'x-s'ai纯算+补环境.md` |
| [2063774](https://www.52pojie.cn/thread-2063774-1-1.html) | 某店登录用户名与密码参数补环境 | `52pojie-2063774-某店登录用户名与密码参数补环境.md` |
| [2062377](https://www.52pojie.cn/thread-2062377-1-1.html) | 某航司Reese84逆向分析-补环境篇 | `52pojie-2062377-某航司Reese84逆向分析-补环境篇.md` |
| [2059718](https://www.52pojie.cn/thread-2059718-1-1.html) | 【js逆向】码上爬-题16 补环境，第一次补环境成功记录一下！ | `52pojie-2059718-【js逆向】码上爬-题16 补环境，第一次补环境成功记录一下！.md` |
| [2047209](https://www.52pojie.cn/thread-2047209-1-1.html) | 【JS逆向】某条signature逆向补环境 | `52pojie-2047209-【JS逆向】某条signature逆向补环境.md` |
| [2042722](https://www.52pojie.cn/thread-2042722-1-1.html) | 药监局瑞数6补环境生成cookie | `52pojie-2042722-药监局瑞数6补环境生成cookie.md` |
| [2014743](https://www.52pojie.cn/thread-2014743-1-1.html) | 【入门】webpack 补环境 | `52pojie-2014743-【入门】webpack 补环境.md` |
| [2012536](https://www.52pojie.cn/thread-2012536-1-1.html) | 药某局 webpack js逆向扣代码 | `52pojie-2012536-药某局 webpack js逆向扣代码.md` |
| [2012413](https://www.52pojie.cn/thread-2012413-1-1.html) | 某瑞数5代cookie和url后缀补环境代码 | `52pojie-2012413-某瑞数5代cookie和url后缀补环境代码.md` |
| [2010844](https://www.52pojie.cn/thread-2010844-1-1.html) | 扇贝单词js逆向补环境 | `52pojie-2010844-扇贝单词js逆向补环境.md` |
| [2010081](https://www.52pojie.cn/thread-2010081-1-1.html) | 某图，瑞数6补环境 | `52pojie-2010081-某图，瑞数6补环境.md` |
| [1988393](https://www.52pojie.cn/thread-1988393-1-1.html) | 【JS逆向】瑞数6逆向简单分析 | `52pojie-1988393-【JS逆向】瑞数6逆向简单分析.md` |
| [1917988](https://www.52pojie.cn/thread-1917988-1-1.html) | 某音长ab补环境分析 | `52pojie-1917988-某音长ab补环境分析.md` |
| [1859510](https://www.52pojie.cn/thread-1859510-1-1.html) | 关于瑞数4补环境的一点小心得 | `52pojie-1859510-关于瑞数4补环境的一点小心得.md` |
| [1639885](https://www.52pojie.cn/thread-1639885-1-1.html) | 猿人学第2题手把手补环境 | `52pojie-1639885-猿人学第2题手把手补环境.md` |
| [1513032](https://www.52pojie.cn/thread-1513032-1-1.html) | Js 逆向之补环境到底是在补什么？ | `52pojie-1513032-Js 逆向之补环境到底是在补什么？.md` |
| [1495847](https://www.52pojie.cn/thread-1495847-1-1.html) | 某社区网站的 Header 加密参数分析补环境踩坑分析笔记 | `52pojie-1495847-某社区网站的 Header 加密参数分析补环境踩坑分析笔记.md` |

### Wasm 逆向（9）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2107193](https://www.52pojie.cn/thread-2107193-1-1.html) | 针对wasm反CFF的尝试 | `52pojie-2107193-针对wasm反CFF的尝试.md` |
| [2094419](https://www.52pojie.cn/thread-2094419-1-1.html) | 春节】解题领红包之九 {Web 中级题} 题解 - wasm逆向 | `52pojie-2094419-春节】解题领红包之九 {Web 中级题} 题解 - wasm逆向.md` |
| [2063345](https://www.52pojie.cn/thread-2063345-1-1.html) | 荔枝网wasm 逆向 | `52pojie-2063345-荔枝网wasm 逆向.md` |
| [1970885](https://www.52pojie.cn/thread-1970885-1-1.html) | 【JS逆向系列】某乎_zse_ck参数js与wasm多重套娃地狱级（右篇） | `52pojie-1970885-【JS逆向系列】某乎__zse_ck参数js与wasm多重套娃地狱级（右篇）.md` |
| [1968832](https://www.52pojie.cn/thread-1968832-1-1.html) | 【JS逆向系列】某乎_zse_ck参数js与wasm多重套娃地狱级（左篇） | `52pojie-1968832-【JS逆向系列】某乎__zse_ck参数js与wasm多重套娃地狱级（左篇）.md` |
| [1864441](https://www.52pojie.cn/thread-1864441-1-1.html) | 某解析wasm逆向 | `52pojie-1864441-某解析wasm逆向.md` |
| [1863743](https://www.52pojie.cn/thread-1863743-1-1.html) | 某巴巴文档网站加密文件逆向，wasm直接获取文本 | `52pojie-1863743-某巴巴文档网站加密文件逆向，wasm直接获取文本.md` |
| [1773515](https://www.52pojie.cn/thread-1773515-1-1.html) | 某某电影网页wasm逆向思路 | `52pojie-1773515-某某电影网页wasm逆向思路.md` |
| [962068](https://www.52pojie.cn/thread-962068-1-1.html) | 【转帖】一种Wasm逆向静态分析方法 | `52pojie-962068-【转帖】一种Wasm逆向静态分析方法.md` |

### 签名 / 加密参数纯算（15）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2096479](https://www.52pojie.cn/thread-2096479-1-1.html) | 【JS逆向入门】国*医*服务平台 国密SM4、SM2加密解密分析 | `52pojie-2096479-【JS逆向入门】国 医 服务平台 国密SM4、SM2加密解密分析.md` |
| [2033704](https://www.52pojie.cn/thread-2033704-1-1.html) | 某站w_rid加密参数分析 | `52pojie-2033704-某站w_rid加密参数分析.md` |
| [2014994](https://www.52pojie.cn/thread-2014994-1-1.html) | 【JS逆向】某审批局加解密逆向分析 | `52pojie-2014994-【JS逆向】某审批局加解密逆向分析.md` |
| [1914310](https://www.52pojie.cn/thread-1914310-1-1.html) | 【JavaScript 逆向】企某宝，header加密，字体反爬（内附源码） | `52pojie-1914310-【JavaScript 逆向】企某宝，header加密，字体反爬（内附源码）.md` |
| [1911621](https://www.52pojie.cn/thread-1911621-1-1.html) | [MD5-JS逆向]某高等继续教育平台自动化答题 | `52pojie-1911621-[MD5-JS逆向]某高等继续教育平台自动化答题.md` |
| [1881510](https://www.52pojie.cn/thread-1881510-1-1.html) | 新手写的一个python脚本，有道翻译，一丢丢js逆向加解密 | `52pojie-1881510-新手写的一个python脚本，有道翻译，一丢丢js逆向加解密.md` |
| [1868285](https://www.52pojie.cn/thread-1868285-1-1.html) | 某猫盘加密参数par与pto分析 | `52pojie-1868285-某猫盘加密参数par与pto分析.md` |
| [1861424](https://www.52pojie.cn/thread-1861424-1-1.html) | 某站主页指纹校验加密参数逆向 | `52pojie-1861424-某站主页指纹校验加密参数逆向.md` |
| [1716929](https://www.52pojie.cn/thread-1716929-1-1.html) | 某东APP地址加密参数浅分析 | `52pojie-1716929-某东APP地址加密参数浅分析.md` |
| [1677764](https://www.52pojie.cn/thread-1677764-1-1.html) | 记一次实习僧雪碧图字体加密反爬 | `52pojie-1677764-记一次实习僧雪碧图字体加密反爬.md` |
| [1589290](https://www.52pojie.cn/thread-1589290-1-1.html) | [Scrape Center - spa2]含加密参数的动态网页爬取 | `52pojie-1589290-[Scrape Center - spa2]含加密参数的动态网页爬取.md` |
| [1575866](https://www.52pojie.cn/thread-1575866-1-1.html) | 某咖啡app加密参数分析进阶版 | `52pojie-1575866-某咖啡app加密参数分析进阶版.md` |
| [1511745](https://www.52pojie.cn/thread-1511745-1-1.html) | 某店登陆加密参数 UA 加密逻辑分析 | `52pojie-1511745-某店登陆加密参数 UA 加密逻辑分析.md` |
| [1164928](https://www.52pojie.cn/thread-1164928-1-1.html) | JS逆向分析某国外电商网站加密参数 | `52pojie-1164928-JS逆向分析某国外电商网站加密参数.md` |
| [1074706](https://www.52pojie.cn/thread-1074706-1-1.html) | 【JS逆向练习】新浪微博登录加密参数分析 | `52pojie-1074706-【JS逆向练习】新浪微博登录加密参数分析.md` |

### 字体反爬 / 反爬对抗（11）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1860909](https://www.52pojie.cn/thread-1860909-1-1.html) | 论字体反爬通杀 | `52pojie-1860909-论字体反爬通杀.md` |
| [1786543](https://www.52pojie.cn/thread-1786543-1-1.html) | [爬虫-字体反爬] 爬取起点小说中文网的字数 | `52pojie-1786543-[爬虫--字体反爬] 爬取起点小说中文网的字数.md` |
| [1780318](https://www.52pojie.cn/thread-1780318-1-1.html) | 记一次字体反爬 | `52pojie-1780318-记一次字体反爬.md` |
| [1721355](https://www.52pojie.cn/thread-1721355-1-1.html) | 实战-某手H5字体反爬 | `52pojie-1721355-实战-某手H5字体反爬.md` |
| [1680600](https://www.52pojie.cn/thread-1680600-1-1.html) | 超详细的裁判文书网反爬虫破解流程 | `52pojie-1680600-超详细的裁判文书网反爬虫破解流程.md` |
| [1669861](https://www.52pojie.cn/thread-1669861-1-1.html) | 记一次潇湘书院静态字体反爬 | `52pojie-1669861-记一次潇湘书院静态字体反爬.md` |
| [1656505](https://www.52pojie.cn/thread-1656505-1-1.html) | 字体反爬——可视化字符匹配通用方案(浏览器版) | `52pojie-1656505-字体反爬——可视化字符匹配通用方案(浏览器版).md` |
| [1576862](https://www.52pojie.cn/thread-1576862-1-1.html) | 使用ddddocr解决某汽车论坛网站字体反爬 | `52pojie-1576862-使用ddddocr解决某汽车论坛网站字体反爬.md` |
| [1411371](https://www.52pojie.cn/thread-1411371-1-1.html) | 中国裁判文书网的反爬破解过程 | `52pojie-1411371-中国裁判文书网的反爬破解过程.md` |
| [1290997](https://www.52pojie.cn/thread-1290997-1-1.html) | 快手解析作品/用户信息[字体反爬] | `52pojie-1290997-快手解析作品 用户信息[字体反爬].md` |
| [1031413](https://www.52pojie.cn/thread-1031413-1-1.html) | 对某N博客网站的反爬虫机制分析 | `52pojie-1031413-对某N博客网站的反爬虫机制分析.md` |

### 反调试 / Hook / 调试工具（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2040010](https://www.52pojie.cn/thread-2040010-1-1.html) | 巧用Chrome-CDP远程调用Debug突破JS逆向 | `52pojie-2040010-巧用Chrome-CDP远程调用Debug突破JS逆向.md` |
| [2015243](https://www.52pojie.cn/thread-2015243-1-1.html) | [学习笔记]JS逆向-控制台反调试使用的常见三种方式及hook思路 | `52pojie-2015243-[学习笔记]JS逆向-控制台反调试使用的常见三种方式及hook思路.md` |
| [2011480](https://www.52pojie.cn/thread-2011480-1-1.html) | [Web逆向反调试]常见检测到开发者工具的制止手段 | `52pojie-2011480-[Web逆向反调试]常见检测到开发者工具的制止手段.md` |

### 协议 / 登录 / 接口 / 小程序（17）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2126833](https://www.52pojie.cn/thread-2126833-1-1.html) | 基于chatglm的web逆向分析实例一则 | `52pojie-2126833-基于chatglm的web逆向分析实例一则.md` |
| [2088971](https://www.52pojie.cn/thread-2088971-1-1.html) | 某安充电小程序js逆向 | `52pojie-2088971-某安充电小程序js逆向.md` |
| [2048032](https://www.52pojie.cn/thread-2048032-1-1.html) | JS逆向实战案例之———x日头条【a-bogus】分析 | `52pojie-2048032-JS逆向实战案例之———x日头条【a-bogus】分析.md` |
| [2028837](https://www.52pojie.cn/thread-2028837-1-1.html) | 【JS逆向】某点数据登录逆向分析 | `52pojie-2028837-【JS逆向】某点数据登录逆向分析.md` |
| [2018450](https://www.52pojie.cn/thread-2018450-1-1.html) | 【js逆向】学某通模拟登录 | `52pojie-2018450-【js逆向】学某通模拟登录.md` |
| [2017867](https://www.52pojie.cn/thread-2017867-1-1.html) | 【js逆向入门】某酒店模拟登录 | `52pojie-2017867-【js逆向入门】某酒店模拟登录.md` |
| [2013037](https://www.52pojie.cn/thread-2013037-1-1.html) | 【入门】青某汇web逆向 | `52pojie-2013037-【入门】青某汇web逆向.md` |
| [2006876](https://www.52pojie.cn/thread-2006876-1-1.html) | 某试鸭web逆向题目 | `52pojie-2006876-某试鸭web逆向题目.md` |
| [1996108](https://www.52pojie.cn/thread-1996108-1-1.html) | 【JS逆向】纯异步JS逆向分析 | `52pojie-1996108-【JS逆向】纯异步JS逆向分析.md` |
| [1986969](https://www.52pojie.cn/thread-1986969-1-1.html) | 【JS逆向】某茄小说逆向分析 | `52pojie-1986969-【JS逆向】某茄小说逆向分析.md` |
| [1926574](https://www.52pojie.cn/thread-1926574-1-1.html) | 【Web逆向】基于Electron的CrackMe详细教程 | `52pojie-1926574-【Web逆向】基于Electron的CrackMe详细教程.md` |
| [1919638](https://www.52pojie.cn/thread-1919638-1-1.html) | 【web逆向】南京某学院登录接口分析 | `52pojie-1919638-【web逆向】南京某学院登录接口分析.md` |
| [1917012](https://www.52pojie.cn/thread-1917012-1-1.html) | 【Web逆向】头号老玩家逆向分析 | `52pojie-1917012-【Web逆向】头号老玩家逆向分析.md` |
| [1904188](https://www.52pojie.cn/thread-1904188-1-1.html) | 【Web逆向】英语真题web分析破解 | `52pojie-1904188-【Web逆向】英语真题web分析破解.md` |
| [1903660](https://www.52pojie.cn/thread-1903660-1-1.html) | 【web逆向】某省开放大学登陆接口（上） | `52pojie-1903660-【web逆向】某省开放大学登陆接口（上）.md` |
| [1855674](https://www.52pojie.cn/thread-1855674-1-1.html) | web逆向，产业政策大数据 | `52pojie-1855674-web逆向，产业政策大数据.md` |
| [1739717](https://www.52pojie.cn/thread-1739717-1-1.html) | 【WEB逆向】某瓣读书搜索接口 | `52pojie-1739717-【WEB逆向】某瓣读书搜索接口.md` |

---

## 三、补充归档（82 篇，2026-09-20 扩关键词补漏）

来源：`hubcli 52pojie search` 扩至 53 个关键词（第二轮新增：混淆/反混淆/控制流平坦化/九宫格/
算法还原/顶象/易盾/数美/Akamai/Cloudflare/h5st/zp_stoken/acw_sc__v2/字体反爬 等）。
筛选口径同上，另加人工黑名单剔除纯 native/桌面端/工具发布类帖。与第一、二节按帖子 ID 去重。
分类由标题关键词自动生成，仅供参考。

### 验证码 / 滑块 / 风控（34）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2122060](https://www.52pojie.cn/thread-2122060-1-1.html) | Akamai最新js风控浅分析——指纹 | `52pojie-2122060-Akamai最新js风控浅分析——指纹.md` |
| [2102398](https://www.52pojie.cn/thread-2102398-1-1.html) | 顶象滑块的x问题！ | `52pojie-2102398-顶象滑块的x问题！.md` |
| [2097555](https://www.52pojie.cn/thread-2097555-1-1.html) | 论Cloudflare验证的自动化方案 | `52pojie-2097555-论Cloudflare验证的自动化方案.md` |
| [2085758](https://www.52pojie.cn/thread-2085758-1-1.html) | 某waf的acw_sc__v2算法逆向 | `52pojie-2085758-某waf的acw_sc__v2算法逆向.md` |
| [2069036](https://www.52pojie.cn/thread-2069036-1-1.html) | 另辟蹊径：基于浏览器脚本与中间人拦截的瑞数“异步”解决方案 | `52pojie-2069036-另辟蹊径：基于浏览器脚本与中间人拦截的瑞数“异步”解决方案.md` |
| [2056918](https://www.52pojie.cn/thread-2056918-1-1.html) | 极验4代 九宫格协议分析 | `52pojie-2056918-极验4代 九宫格协议分析.md` |
| [2046823](https://www.52pojie.cn/thread-2046823-1-1.html) | 关于图标点选验证码识别方案 | `52pojie-2046823-关于图标点选验证码识别方案.md` |
| [2046426](https://www.52pojie.cn/thread-2046426-1-1.html) | 欧冶瑞数练习 | `52pojie-2046426-欧冶瑞数练习.md` |
| [2045645](https://www.52pojie.cn/thread-2045645-1-1.html) | 浏览器指纹追踪入门：常见检测手段 + 小白适用的绕过小技巧 | `52pojie-2045645-浏览器指纹追踪入门：常见检测手段 + 小白适用的绕过小技巧.md` |
| [2009699](https://www.52pojie.cn/thread-2009699-1-1.html) | Akamai某环境VMP算法分析 | `52pojie-2009699-Akamai某环境VMP算法分析.md` |
| [1952790](https://www.52pojie.cn/thread-1952790-1-1.html) | 某灵考核题-瑞数，部分环境分析 | `52pojie-1952790-某灵考核题-瑞数，部分环境分析.md` |
| [1912306](https://www.52pojie.cn/thread-1912306-1-1.html) | [验证码识别]相似度模型匹配的替代方案-特征匹配 | `52pojie-1912306-[验证码识别]相似度模型匹配的替代方案-特征匹配.md` |
| [1909489](https://www.52pojie.cn/thread-1909489-1-1.html) | 某验点选验证码分析 | `52pojie-1909489-某验点选验证码分析.md` |
| [1904971](https://www.52pojie.cn/thread-1904971-1-1.html) | [验证码识别]某盾滑块验证码增强版的识别 | `52pojie-1904971-[验证码识别]某盾滑块验证码增强版的识别.md` |
| [1885166](https://www.52pojie.cn/thread-1885166-1-1.html) | [验证码逆向]关于极验4验证通过却无法登录的问题 | `52pojie-1885166-[验证码逆向]关于极验4验证通过却无法登录的问题.md` |
| [1882302](https://www.52pojie.cn/thread-1882302-1-1.html) | 易盾点选踩坑 | `52pojie-1882302-易盾点选踩坑.md` |
| [1881927](https://www.52pojie.cn/thread-1881927-1-1.html) | 数美点选验证协议全面剖析 | `52pojie-1881927-数美点选验证协议全面剖析.md` |
| [1880797](https://www.52pojie.cn/thread-1880797-1-1.html) | 【验证码识别专栏】人均通杀点选验证码！Yolov5 + 孪生神经网络 or 图像分类 = 高 | `52pojie-1880797-【验证码识别专栏】人均通杀点选验证码！Yolov5 + 孪生神经网络 or 图像分类 = 高.md` |
| [1880058](https://www.52pojie.cn/thread-1880058-1-1.html) | 过某站点选验证码 | `52pojie-1880058-过某站点选验证码.md` |
| [1857712](https://www.52pojie.cn/thread-1857712-1-1.html) | 【验证码逆向专栏】百某网数字九宫格验证码逆向分析 | `52pojie-1857712-【验证码逆向专栏】百某网数字九宫格验证码逆向分析.md` |
| [1846988](https://www.52pojie.cn/thread-1846988-1-1.html) | 人均瑞数系列，瑞数 6 代 JS 逆向分析 | `52pojie-1846988-人均瑞数系列，瑞数 6 代 JS 逆向分析.md` |
| [1831827](https://www.52pojie.cn/thread-1831827-1-1.html) | 浅逆某简单akamai(无风控部分) | `52pojie-1831827-浅逆某简单akamai(无风控部分).md` |
| [1782883](https://www.52pojie.cn/thread-1782883-1-1.html) | 【验证码逆向专栏】数美验证码全家桶逆向分析以及 AST 获取动态参数 | `52pojie-1782883-【验证码逆向专栏】数美验证码全家桶逆向分析以及 AST 获取动态参数.md` |
| [1756692](https://www.52pojie.cn/thread-1756692-1-1.html) | 【验证码逆向专栏】某片滑块、点选验证码逆向分析 | `52pojie-1756692-【验证码逆向专栏】某片滑块、点选验证码逆向分析.md` |
| [1743428](https://www.52pojie.cn/thread-1743428-1-1.html) | 人均瑞数系列，瑞数 4 代 JS 逆向分析 | `52pojie-1743428-人均瑞数系列，瑞数 4 代 JS 逆向分析.md` |
| [1743411](https://www.52pojie.cn/thread-1743411-1-1.html) | 人均瑞数系列，瑞数 5 代 JS 逆向分析 | `52pojie-1743411-人均瑞数系列，瑞数 5 代 JS 逆向分析.md` |
| [1665936](https://www.52pojie.cn/thread-1665936-1-1.html) | 顶象滑块逆向分析——背景图还原分析 | `52pojie-1665936-顶象滑块逆向分析——背景图还原分析.md` |
| [1654390](https://www.52pojie.cn/thread-1654390-1-1.html) | 网易易盾——推理拼图验证码参数逆向分析和调用 | `52pojie-1654390-网易易盾——推理拼图验证码参数逆向分析和调用.md` |
| [1643467](https://www.52pojie.cn/thread-1643467-1-1.html) | [原创] Akamai保护的相关网站（IHG，TI）学习记录 | `52pojie-1643467-[原创] Akamai保护的相关网站（IHG，TI）学习记录.md` |
| [1583574](https://www.52pojie.cn/thread-1583574-1-1.html) | 网易易盾—推理拼图验证的破解 | `52pojie-1583574-网易易盾—推理拼图验证的破解.md` |
| [1501158](https://www.52pojie.cn/thread-1501158-1-1.html) | 顶象无感验证码demo | `52pojie-1501158-顶象无感验证码demo.md` |
| [1163221](https://www.52pojie.cn/thread-1163221-1-1.html) | 某解析网站过极验滑块测试源码 | `52pojie-1163221-某解析网站过极验滑块测试源码.md` |
| [1162951](https://www.52pojie.cn/thread-1162951-1-1.html) | 极验反爬虫防护分析之接口交互的解密方法补遗 | `52pojie-1162951-极验反爬虫防护分析之接口交互的解密方法补遗.md` |
| [1162853](https://www.52pojie.cn/thread-1162853-1-1.html) | 极验反爬虫防护分析之交互流程分析 | `52pojie-1162853-极验反爬虫防护分析之交互流程分析.md` |

### JSVMP / VMP 逆向（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2057046](https://www.52pojie.cn/thread-2057046-1-1.html) | 某视频平台jsvmp纯算还原 | `52pojie-2057046-某视频平台jsvmp纯算还原.md` |
| [1752755](https://www.52pojie.cn/thread-1752755-1-1.html) | 如何使用AST还原某音的jsvmp | `52pojie-1752755-如何使用AST还原某音的jsvmp.md` |

### Wasm 逆向（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1900845](https://www.52pojie.cn/thread-1900845-1-1.html) | 某视频解析网站js逆向分析——学会wasm文件类型逆向 | `52pojie-1900845-某视频解析网站js逆向分析——学会wasm文件类型逆向.md` |
| [1492577](https://www.52pojie.cn/thread-1492577-1-1.html) | 某德地图矢量瓦片逆向(快速wasm逆向)，c c++ c#可调用，执行wasm2c翻译出来的c代码一 | `52pojie-1492577-某德地图矢量瓦片逆向(快速wasm逆向)，c c++ c#可调用，执行wasm2c翻译出来的c代码一.md` |
| [1379690](https://www.52pojie.cn/thread-1379690-1-1.html) | 某5影视ts视频wasm加密分析(wasm逆向) | `52pojie-1379690-某5影视ts视频wasm加密分析(wasm逆向).md` |

### AST / 解混淆（9）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2099086](https://www.52pojie.cn/thread-2099086-1-1.html) | 浅谈OB混淆及其变体特征 | `52pojie-2099086-浅谈OB混淆及其变体特征.md` |
| [2076729](https://www.52pojie.cn/thread-2076729-1-1.html) | SpiderDemo T3 protobuf混淆解析挑战题解 | `52pojie-2076729-SpiderDemo T3 protobuf混淆解析挑战题解.md` |
| [2073419](https://www.52pojie.cn/thread-2073419-1-1.html) | 某老板直聘四层switch反混淆 | `52pojie-2073419-某老板直聘四层switch反混淆.md` |
| [2017304](https://www.52pojie.cn/thread-2017304-1-1.html) | 记一次简单的JS(ob高级)混淆算法逆向分析 | `52pojie-2017304-记一次简单的JS(ob高级)混淆算法逆向分析.md` |
| [1901741](https://www.52pojie.cn/thread-1901741-1-1.html) | web控制流平坦化解混淆 | `52pojie-1901741-web控制流平坦化解混淆.md` |
| [1598418](https://www.52pojie.cn/thread-1598418-1-1.html) | 某数和某5秒-反混淆动态注入调试的一种方案 | `52pojie-1598418-某数和某5秒-反混淆动态注入调试的一种方案.md` |
| [1567312](https://www.52pojie.cn/thread-1567312-1-1.html) | 某酷ckey签名生成算法系列--（三）ast代码控制流平坦化 | `52pojie-1567312-某酷ckey签名生成算法系列--（三）ast代码控制流平坦化.md` |
| [1548533](https://www.52pojie.cn/thread-1548533-1-1.html) | 混合布尔算术运算的混淆及反混淆 | `52pojie-1548533-混合布尔算术运算的混淆及反混淆.md` |
| [1450900](https://www.52pojie.cn/thread-1450900-1-1.html) | 某视频解析分析-AST反混淆与nodejs调用 | `52pojie-1450900-某视频解析分析-AST反混淆与nodejs调用.md` |

### 字体反爬 / 反爬对抗（5）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1640421](https://www.52pojie.cn/thread-1640421-1-1.html) | 小白教小白之签名验证反爬虫初探 | `52pojie-1640421-小白教小白之签名验证反爬虫初探.md` |
| [1209888](https://www.52pojie.cn/thread-1209888-1-1.html) | 【Python 字体反爬（新手向）】简单几步学会 58 同城字体反爬 | `52pojie-1209888-【Python 字体反爬（新手向）】简单几步学会 58 同城字体反爬.md` |
| [1111698](https://www.52pojie.cn/thread-1111698-1-1.html) | 字体反爬解决方案——突破抖音字体反爬机制 | `52pojie-1111698-字体反爬解决方案——突破抖音字体反爬机制.md` |
| [858765](https://www.52pojie.cn/thread-858765-1-1.html) | JS实战系列之解密-拼夕夕反爬虫算法 | `52pojie-858765-JS实战系列之解密-拼夕夕反爬虫算法.md` |
| [568846](https://www.52pojie.cn/thread-568846-1-1.html) | 小小爬虫之突破反爬虫限制重写javascript函数 | `52pojie-568846-小小爬虫之突破反爬虫限制重写javascript函数.md` |

### 协议 / 接口 / 小程序 / 参数还原（29）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2122346](https://www.52pojie.cn/thread-2122346-1-1.html) | 【逆向实战】电商“找小店“接口逆向分析与竞品店铺数据抓取 | `52pojie-2122346-【逆向实战】电商“找小店“接口逆向分析与竞品店铺数据抓取.md` |
| [2104414](https://www.52pojie.cn/thread-2104414-1-1.html) | 抖音详情页数据采集及a_bogus参数逆向分析 | `52pojie-2104414-抖音详情页数据采集及a_bogus参数逆向分析.md` |
| [2104180](https://www.52pojie.cn/thread-2104180-1-1.html) | 京东搜索接口商品数据获取及h5st参数解析 | `52pojie-2104180-京东搜索接口商品数据获取及h5st参数解析.md` |
| [2058603](https://www.52pojie.cn/thread-2058603-1-1.html) | [原创]boss直聘__zp_stoken__的控制平坦流纯算逆向思路 | `52pojie-2058603-[原创]boss直聘__zp_stoken__的控制平坦流纯算逆向思路.md` |
| [2055333](https://www.52pojie.cn/thread-2055333-1-1.html) | 某Y院WX小程序挂号，算法还原 | `52pojie-2055333-某Y院WX小程序挂号，算法还原.md` |
| [2048600](https://www.52pojie.cn/thread-2048600-1-1.html) | Js逆向实战案例之 ------x企查【ymg_ssr】+反调试分析 | `52pojie-2048600-Js逆向实战案例之 ------x企查【ymg_ssr】+反调试分析.md` |
| [2047326](https://www.52pojie.cn/thread-2047326-1-1.html) | js逆向实战案例之----X花顺cookie V值逆向 | `52pojie-2047326-js逆向实战案例之----X花顺cookie V值逆向.md` |
| [2038738](https://www.52pojie.cn/thread-2038738-1-1.html) | 抖音小程序逆向工具重磅发布 | `52pojie-2038738-抖音小程序逆向工具重磅发布.md` |
| [2027025](https://www.52pojie.cn/thread-2027025-1-1.html) | 记一次某电网e充电小程序逆向 | `52pojie-2027025-记一次某电网e充电小程序逆向.md` |
| [1983924](https://www.52pojie.cn/thread-1983924-1-1.html) | 【JS逆向】某建筑webpack逆向分析 | `52pojie-1983924-【JS逆向】某建筑webpack逆向分析.md` |
| [1942706](https://www.52pojie.cn/thread-1942706-1-1.html) | 某供水公司请求签名算法分析 | `52pojie-1942706-某供水公司请求签名算法分析.md` |
| [1934663](https://www.52pojie.cn/thread-1934663-1-1.html) | 某迪汽车品牌小程序逆向 | `52pojie-1934663-某迪汽车品牌小程序逆向.md` |
| [1928860](https://www.52pojie.cn/thread-1928860-1-1.html) | 某音a_bogus纯算分析 | `52pojie-1928860-某音a_bogus纯算分析.md` |
| [1915231](https://www.52pojie.cn/thread-1915231-1-1.html) | 【Web逆向】关于我是如何解决mooc禁止右键、复制 | `52pojie-1915231-【Web逆向】关于我是如何解决mooc禁止右键、复制.md` |
| [1908456](https://www.52pojie.cn/thread-1908456-1-1.html) | 浅谈某云盘签名算法的分析与如何生成 | `52pojie-1908456-浅谈某云盘签名算法的分析与如何生成.md` |
| [1905842](https://www.52pojie.cn/thread-1905842-1-1.html) | 【web逆向】某省开放大学一键看视频、文章、评论（中） | `52pojie-1905842-【web逆向】某省开放大学一键看视频、文章、评论（中）.md` |
| [1822807](https://www.52pojie.cn/thread-1822807-1-1.html) | 阿里系cookie之acw_sc__v2 逆向分析 | `52pojie-1822807-阿里系cookie之acw_sc__v2 逆向分析.md` |
| [1745677](https://www.52pojie.cn/thread-1745677-1-1.html) | 阿里云盘签名算法探究及可用 PoC | `52pojie-1745677-阿里云盘签名算法探究及可用 PoC.md` |
| [1738723](https://www.52pojie.cn/thread-1738723-1-1.html) | 完整逆向某小程序破解签名算法过程记录 | `52pojie-1738723-完整逆向某小程序破解签名算法过程记录.md` |
| [1722264](https://www.52pojie.cn/thread-1722264-1-1.html) | 微信小程序逆向之校友邦小程序请求加密算法解析 | `52pojie-1722264-微信小程序逆向之校友邦小程序请求加密算法解析.md` |
| [1683284](https://www.52pojie.cn/thread-1683284-1-1.html) | 什么？你居然还不会分析网站加密算法？某翻译网站JS算法还原实战 | `52pojie-1683284-什么？你居然还不会分析网站加密算法？某翻译网站JS算法还原实战.md` |
| [1669042](https://www.52pojie.cn/thread-1669042-1-1.html) | 京东试用h5st参数 | `52pojie-1669042-京东试用h5st参数.md` |
| [1631378](https://www.52pojie.cn/thread-1631378-1-1.html) | 某乎x-zse-96签名算法python重写 | `52pojie-1631378-某乎x-zse-96签名算法python重写.md` |
| [1625598](https://www.52pojie.cn/thread-1625598-1-1.html) | 某acw_sc__v2 cookie逆向分析 | `52pojie-1625598-某acw_sc__v2 cookie逆向分析.md` |
| [1619257](https://www.52pojie.cn/thread-1619257-1-1.html) | vue项目webpack逆向需有.map文件 | `52pojie-1619257-vue项目webpack逆向需有.map文件.md` |
| [1613466](https://www.52pojie.cn/thread-1613466-1-1.html) | 某网站webpack逆向 | `52pojie-1613466-某网站webpack逆向.md` |
| [1595155](https://www.52pojie.cn/thread-1595155-1-1.html) | 【JS逆向系列】某空气质量监测平台无限 debugger 与 python算法还原 | `52pojie-1595155-【JS逆向系列】某空气质量监测平台无限 debugger 与 python算法还原.md` |
| [1334257](https://www.52pojie.cn/thread-1334257-1-1.html) | QQ音乐API签名算法分析 | `52pojie-1334257-QQ音乐API签名算法分析.md` |
| [1291943](https://www.52pojie.cn/thread-1291943-1-1.html) | 关于CSDN获取博客内容接口的x-ca-signature签名算法研究 | `52pojie-1291943-关于CSDN获取博客内容接口的x-ca-signature签名算法研究.md` |

---

## 四、补充归档（二）（41 篇，2026-09-20 第三轮长尾补漏 + 口径修正）

本轮做了什么：
1. 长尾关键词扫描 40 个（站点名 / 厂商 / 加密算法 / 自动化工具），合并历史池后候选全集 **1678 条**；
2. 审计（`artifacts/52pojie-fetch2/audit_pool.py`、`audit_miss3.py`）发现第二轮筛选有两处系统性偏差：
   NOTWEB 黑名单误杀标题写着「[Web逆向]」/ 小程序 / 加密参数的真阳性帖；
   STRONG 正则漏掉长尾标题形态（如「参数加密」≠「加密参数」）。
   修正手段：新增 `WEB_OVERRIDE` 豁免 + `ALLOW_EXTRA` 人工白名单（21 条）+ `BLOCK_EXTRA` 反例（11 条）；
3. Thread 列表增量仅 3 条（均非逆向），本轮增量价值全部来自关键词补漏。

### 验证码 / 滑块 / 风控（5）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1089899](https://www.52pojie.cn/thread-1089899-1-1.html) | 基于python写的 超星学习通、智慧树 课程查询小工具 包含验证码识别【开源】 | `52pojie-1089899-基于python写的 超星学习通、智慧树 课程查询小工具 包含验证码识别【开源】.md` |
| [1717767](https://www.52pojie.cn/thread-1717767-1-1.html) | TLY验证码识别自动签到JavaScript代码 | `52pojie-1717767-TLY验证码识别自动签到JavaScript代码.md` |
| [1808597](https://www.52pojie.cn/thread-1808597-1-1.html) | playwright+opencv 过滑块拼图验证码 | `52pojie-1808597-playwright+opencv 过滑块拼图验证码.md` |
| [1828098](https://www.52pojie.cn/thread-1828098-1-1.html) | 某【网盘直链下载助手】验证码获取思路 | `52pojie-1828098-某【网盘直链下载助手】验证码获取思路.md` |
| [1898387](https://www.52pojie.cn/thread-1898387-1-1.html) | python selenium自动化过指纹检测 | `52pojie-1898387-python selenium自动化过指纹检测.md` |

### Wasm 逆向（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1487959](https://www.52pojie.cn/thread-1487959-1-1.html) | 某网站心跳包参数加密的wasm分析 | `52pojie-1487959-某网站心跳包参数加密的wasm分析.md` |

### AST / 解混淆（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2016235](https://www.52pojie.cn/thread-2016235-1-1.html) | 【JS逆向】某加速乐分析解混淆 | `52pojie-2016235-【JS逆向】某加速乐分析解混淆.md` |

### 字体反爬 / 反爬对抗（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1730071](https://www.52pojie.cn/thread-1730071-1-1.html) | c#,.net Selenium 反反爬配置 | `52pojie-1730071-c#,.net Selenium 反反爬配置.md` |
| [1990765](https://www.52pojie.cn/thread-1990765-1-1.html) | 一个技术网站的反反爬和模拟镜像网站搭建方法 | `52pojie-1990765-一个技术网站的反反爬和模拟镜像网站搭建方法.md` |
| [2051487](https://www.52pojie.cn/thread-2051487-1-1.html) | 下载某小说站小说完美无错，单线程避开反爬虫机制支持单章多页 | `52pojie-2051487-下载某小说站小说完美无错，单线程避开反爬虫机制支持单章多页.md` |

### 协议 / 接口 / 小程序 / 参数还原（28）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1134741](https://www.52pojie.cn/thread-1134741-1-1.html) | nodejs 搭建某音web端_signature参数生成的服务（puppeteer+express） | `52pojie-1134741-nodejs 搭建某音web端_signature参数生成的服务（puppeteer+express）.md` |
| [1154784](https://www.52pojie.cn/thread-1154784-1-1.html) | 分析并破解某猫网站js数据接口请求参数加密 | `52pojie-1154784-分析并破解某猫网站js数据接口请求参数加密.md` |
| [1182980](https://www.52pojie.cn/thread-1182980-1-1.html) | 【原创】网课刷课加密参数JS分析获取 | `52pojie-1182980-【原创】网课刷课加密参数JS分析获取.md` |
| [1490744](https://www.52pojie.cn/thread-1490744-1-1.html) | 记一次web端jsjiami.v6的逆向思路 | `52pojie-1490744-记一次web端jsjiami.v6的逆向思路.md` |
| [1499238](https://www.52pojie.cn/thread-1499238-1-1.html) | 某音乐网站查询参数加密逻辑分析（分离式的 webpack 加密代码扣取详解） | `52pojie-1499238-某音乐网站查询参数加密逻辑分析（分离式的 webpack 加密代码扣取详解）.md` |
| [1513028](https://www.52pojie.cn/thread-1513028-1-1.html) | 某常见 cookie 加密逻辑分析 （加速乐 - jsl） | `52pojie-1513028-某常见 cookie 加密逻辑分析 （加速乐 - jsl）.md` |
| [1607798](https://www.52pojie.cn/thread-1607798-1-1.html) | 某网站登录参数加密js逆向 | `52pojie-1607798-某网站登录参数加密js逆向.md` |
| [1614850](https://www.52pojie.cn/thread-1614850-1-1.html) | 某大学堂逆向笔记，实现查看作业答案思路 | `52pojie-1614850-某大学堂逆向笔记，实现查看作业答案思路.md` |
| [1664417](https://www.52pojie.cn/thread-1664417-1-1.html) | Electron 逆向实战 | `52pojie-1664417-Electron 逆向实战.md` |
| [1684583](https://www.52pojie.cn/thread-1684583-1-1.html) | 【逆向分析】抖音小程序逆向ttpkg.js文件解包记录 | `52pojie-1684583-【逆向分析】抖音小程序逆向ttpkg.js文件解包记录.md` |
| [1857670](https://www.52pojie.cn/thread-1857670-1-1.html) | 某牛m3u8 key解密算法分析及实现 | `52pojie-1857670-某牛m3u8 key解密算法分析及实现.md` |
| [1861004](https://www.52pojie.cn/thread-1861004-1-1.html) | 某科网登录模块RSA加密分析 | `52pojie-1861004-某科网登录模块RSA加密分析.md` |
| [1868749](https://www.52pojie.cn/thread-1868749-1-1.html) | 反调试-编译pass彻底解决调试web无限debugger问题 | `52pojie-1868749-反调试-编译pass彻底解决调试web无限debugger问题.md` |
| [1902605](https://www.52pojie.cn/thread-1902605-1-1.html) | 某道翻译（MD5加密、AES解密） | `52pojie-1902605-某道翻译（MD5加密、AES解密）.md` |
| [1907108](https://www.52pojie.cn/thread-1907108-1-1.html) | 某kr 文章内容AES解密 | `52pojie-1907108-某kr 文章内容AES解密.md` |
| [1913592](https://www.52pojie.cn/thread-1913592-1-1.html) | 【Web逆向】资源替换之pacdora去水印 | `52pojie-1913592-【Web逆向】资源替换之pacdora去水印.md` |
| [1915411](https://www.52pojie.cn/thread-1915411-1-1.html) | 微信小程序逆向之牛仔城游戏厅签到接口 | `52pojie-1915411-微信小程序逆向之牛仔城游戏厅签到接口.md` |
| [1918167](https://www.52pojie.cn/thread-1918167-1-1.html) | [Web逆向] 智慧职教资源库-刷课分析 | `52pojie-1918167-[Web逆向] 智慧职教资源库-刷课分析.md` |
| [1940297](https://www.52pojie.cn/thread-1940297-1-1.html) | [javascript][chrome插件]Circle 阅读助手 v3.1.2 逆向笔记 | `52pojie-1940297-[javascript][chrome插件]Circle 阅读助手 v3.1.2 逆向笔记.md` |
| [2014821](https://www.52pojie.cn/thread-2014821-1-1.html) | js过反调试 | `52pojie-2014821-js过反调试.md` |
| [2018113](https://www.52pojie.cn/thread-2018113-1-1.html) | 网易云音乐逆向 | `52pojie-2018113-网易云音乐逆向.md` |
| [2047827](https://www.52pojie.cn/thread-2047827-1-1.html) | 【反反调试】破解匿名函数的构造函数执行的debugger | `52pojie-2047827-【反反调试】破解匿名函数的构造函数执行的debugger.md` |
| [2052845](https://www.52pojie.cn/thread-2052845-1-1.html) | 某东最新5.2版本的第8段环境参数加密逆向解析 | `52pojie-2052845-某东最新5.2版本的第8段环境参数加密逆向解析.md` |
| [2055997](https://www.52pojie.cn/thread-2055997-1-1.html) | 【简单】逆向实战 手把手教你JSSS-Find破解 | `52pojie-2055997-【简单】逆向实战 手把手教你JSSS-Find破解.md` |
| [2063588](https://www.52pojie.cn/thread-2063588-1-1.html) | 某迪汽车vx小程序逆向及每日签到--站在巨人的肩膀上确实可以少走弯路 | `52pojie-2063588-某迪汽车vx小程序逆向及每日签到--站在巨人的肩膀上确实可以少走弯路.md` |
| [2084041](https://www.52pojie.cn/thread-2084041-1-1.html) | 某AppCDRM 直播m3u8 SM4-CBC解密分析 | `52pojie-2084041-某AppCDRM 直播m3u8 SM4-CBC解密分析.md` |
| [2104039](https://www.52pojie.cn/thread-2104039-1-1.html) | 新版小红书首页笔记获取及X-s参数解密 | `52pojie-2104039-新版小红书首页笔记获取及X-s参数解密.md` |
| [2128820](https://www.52pojie.cn/thread-2128820-1-1.html) | Ai逆向同花顺网站采集数据 | `52pojie-2128820-Ai逆向同花顺网站采集数据.md` |

### 其他（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1569032](https://www.52pojie.cn/thread-1569032-1-1.html) | node与python同时使用ast还原2021春节番外篇的JSFuck | `52pojie-1569032-node与python同时使用ast还原2021春节番外篇的JSFuck.md` |
| [1734107](https://www.52pojie.cn/thread-1734107-1-1.html) | jsFuck eval 模式快速解码 | `52pojie-1734107-jsFuck eval 模式快速解码.md` |
| [2128269](https://www.52pojie.cn/thread-2128269-1-1.html) | Drissionpage焦点伪造检测点 | `52pojie-2128269-Drissionpage焦点伪造检测点.md` |

---

## 五、补充归档（三）（30 篇，2026-09-20 第四轮长尾补漏 + 审计补漏）

本轮做了什么：
1. Thread 列表首次拉到 **6 页**（788 条，此前仅 2 页），但增量里 web 逆向为 0 —— 论坛新帖以资源求助/工具发布为主；
2. 长尾关键词扫描 50 个（站点名：闲鱼/转转/58同城/天眼查…；技术词：webpack / protobuf / 国密 SM2/SM4 / ast还原 / sourcemap / drissionpage…），
   合并历史池后候选全集 **2960 条**（唯一 ID）；
3. 审计（`artifacts/52pojie-fetch4/audit4.py`）定位到两类新偏差并修正：
   - **Thread 来源帖子 `forum` 字段为空**，绕过了 BAD_FORUM 版块黑名单（移动安全区 / 病毒分析区 的 Android 帖被误选）→ 新增 `BLOCK_EXTRA4`（11 条）；
   - 长尾词捞回大量 webpack/protobuf/字体反爬老帖，但标题不含 STRONG 特征 → 新增 `ALLOW_EXTRA4`（8 条）。
4. 候选 **220 条** → 去重跳过 183 → 实际归档 **30 篇**（空正文 7 篇，失败 0）。

### 分类


### Wasm 逆向（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1992926](https://www.52pojie.cn/thread-1992926-1-1.html) | 适合宝宝体质的wasm2js白盒AES | `52pojie-1992926-适合宝宝体质的wasm2js白盒AES.md` |
| [1493082](https://www.52pojie.cn/thread-1493082-1-1.html) | 执行wasm2c翻译出来的c代码二 | `52pojie-1493082-执行wasm2c翻译出来的c代码二.md` |

### 字体反爬 / 反爬对抗（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2122149](https://www.52pojie.cn/thread-2122149-1-1.html) | 爬取某顺的业绩预告小程序，帮你避坑 | `52pojie-2122149-爬取某顺的业绩预告小程序，帮你避坑.md` |
| [1631357](https://www.52pojie.cn/thread-1631357-1-1.html) | 关于超星学习通网页版字体加密分析 | `52pojie-1631357-关于超星学习通网页版字体加密分析.md` |
| [1441582](https://www.52pojie.cn/thread-1441582-1-1.html) | 破解大众点评评论字体加密思路 | `52pojie-1441582-破解大众点评评论字体加密思路.md` |

### Webpack / Protobuf 扣取与还原（15）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2031316](https://www.52pojie.cn/thread-2031316-1-1.html) | WEB前端逆向在nodejs环境中复用webpack代码 | `52pojie-2031316-WEB前端逆向在nodejs环境中复用webpack代码.md` |
| [2024402](https://www.52pojie.cn/thread-2024402-1-1.html) | protobuf 逆向学习笔记 | `52pojie-2024402-protobuf 逆向学习笔记.md` |
| [1906192](https://www.52pojie.cn/thread-1906192-1-1.html) | 某云盘encryptMsg 加密之半自动化扣webpack | `52pojie-1906192-某云盘encryptMsg 加密之半自动化扣webpack.md` |
| [1902544](https://www.52pojie.cn/thread-1902544-1-1.html) | 半自动快速扣取webpack | `52pojie-1902544-半自动快速扣取webpack.md` |
| [1889016](https://www.52pojie.cn/thread-1889016-1-1.html) | 新版dy弹幕protobuf分析还原 | `52pojie-1889016-新版dy弹幕protobuf分析还原.md` |
| [1874655](https://www.52pojie.cn/thread-1874655-1-1.html) | steam 登录 Protobuf 协议详解 | `52pojie-1874655-steam 登录 Protobuf 协议详解.md` |
| [1737925](https://www.52pojie.cn/thread-1737925-1-1.html) | 某音直播弹幕web端js逆向分析----protobuf实战及工具介绍 | `52pojie-1737925-某音直播弹幕web端js逆向分析----protobuf实战及工具介绍.md` |
| [1735975](https://www.52pojie.cn/thread-1735975-1-1.html) | protobuf知识补充 | `52pojie-1735975-protobuf知识补充.md` |
| [1735973](https://www.52pojie.cn/thread-1735973-1-1.html) | 某方数据平台的逆向分析-------学会逆向protobuf | `52pojie-1735973-某方数据平台的逆向分析-------学会逆向protobuf.md` |
| [1723802](https://www.52pojie.cn/thread-1723802-1-1.html) | JS逆向之webpack 通用扣取思路 | `52pojie-1723802-JS逆向之webpack 通用扣取思路.md` |
| [1692444](https://www.52pojie.cn/thread-1692444-1-1.html) | Protobuf的正逆向学习和基于python的实现 | `52pojie-1692444-Protobuf的正逆向学习和基于python的实现.md` |
| [1572529](https://www.52pojie.cn/thread-1572529-1-1.html) | ast自动扣webpack脚本实战 | `52pojie-1572529-ast自动扣webpack脚本实战.md` |
| [1490174](https://www.52pojie.cn/thread-1490174-1-1.html) | Webpack改写实战案例（三） | `52pojie-1490174-Webpack改写实战案例（三）.md` |
| [1489972](https://www.52pojie.cn/thread-1489972-1-1.html) | Webpack改写实战案例（二） | `52pojie-1489972-Webpack改写实战案例（二）.md` |
| [1469095](https://www.52pojie.cn/thread-1469095-1-1.html) | 对某网站进行webpack改写 | `52pojie-1469095-对某网站进行webpack改写.md` |

### 协议 / 接口 / 小程序 / 参数还原（10）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2122203](https://www.52pojie.cn/thread-2122203-1-1.html) | 看球直播接口逆向分析：签名机制与 AES 解密实战 | `52pojie-2122203-看球直播接口逆向分析：签名机制与 AES 解密实战.md` |
| [2095322](https://www.52pojie.cn/thread-2095322-1-1.html) | 某招聘网站的反调试与反反调试策略 | `52pojie-2095322-某招聘网站的反调试与反反调试策略.md` |
| [2091979](https://www.52pojie.cn/thread-2091979-1-1.html) | 某iq drm v3 解密全流程 | `52pojie-2091979-某iq drm v3 解密全流程.md` |
| [2061802](https://www.52pojie.cn/thread-2061802-1-1.html) | 千呼万唤始出来《WX小程序反编译教程》 | `52pojie-2061802-千呼万唤始出来《WX小程序反编译教程》.md` |
| [1832406](https://www.52pojie.cn/thread-1832406-1-1.html) | windows下通杀wx小程序云函数实战 | `52pojie-1832406-windows下通杀wx小程序云函数实战.md` |
| [1801836](https://www.52pojie.cn/thread-1801836-1-1.html) | 某网站关注公众号逆向 | `52pojie-1801836-某网站关注公众号逆向.md` |
| [1708787](https://www.52pojie.cn/thread-1708787-1-1.html) | 抓取微信小程序源码【附逆向工具wxappUnpacker使用方法】 | `52pojie-1708787-抓取微信小程序源码【附逆向工具wxappUnpacker使用方法】.md` |
| [1486505](https://www.52pojie.cn/thread-1486505-1-1.html) | 新手小白Js解密思路之md5加密 | `52pojie-1486505-新手小白Js解密思路之md5加密.md` |
| [1310619](https://www.52pojie.cn/thread-1310619-1-1.html) | 超星（学习通）网络协议分析 | `52pojie-1310619-超星（学习通）网络协议分析.md` |
| [1169827](https://www.52pojie.cn/thread-1169827-1-1.html) | 尝试解决58同城数字加密 | `52pojie-1169827-尝试解决58同城数字加密.md` |

### 本轮空正文（无实质内容，未归档）

`1994034`（某东 h5st 5.0 补环境分析流程）、`1985832`（AST 解混淆实现某 Epub 图片还原）、
`1831357`（小菜鸡的答题游戏&Web 逆向初步）、`1757443`（某刷步网网站逆向）、
`1756698`（某网站加速乐 Cookie 混淆逆向详解）、`1528155`（猿人第 3 题）、
`1205982`（浏览器指纹追踪技术探究）—— 与前三轮记录一致，长期为作者删正文。
---

## 六、补充归档（四）（15 篇，2026-09-20 第五轮长尾补漏 + 审计补漏）

本轮做了什么：

1. Thread 列表拉到 **8 页**（886 条，第四轮为 6 页），但新帖仍以资源求助 / 工具发布为主，
   **web 逆向为 0** —— 增量价值再次全部落在关键词补漏上（与前两轮结论一致）；
2. 关键词扫描 **52 个**（站点补全：抖音 / 爱奇艺 / 优酷 / QQ音乐 / 酷狗 / 去哪儿 / 飞猪 /
   12306 / 顺丰 / 菜鸟 / 支付宝 / 中国移动 / 交管12123…；厂商：同盾 / ja3 / ja4 / 白山云 /
   通付盾 / 创宇；算法协议：sm3 / sm9 / hmac / jwt / des加密 / rc4 / wss / brotli / 设备指纹；
   工具：jsdom / vm2 / scrapy / feapder / frida / charles / fiddler / burpsuite / appium /
   jadx / unicorn / ollvm；反混淆：babel / esprima / acorn / ast脱壳 / 字符串加密 / 请求签名 /
   响应加密 / 参数逆向），补跑 3 个失败词后合并历史池 → 全量候选 **3893 条**（唯一 ID，第四轮 2960）；
3. 审计（`artifacts/52pojie-fetch5/audit5.py`，A~E 五表）定位到本轮两处口径缺口并修正：
   - **漏拣**：标题形如「X参数逆向 / sign参数逆向」的帖子，不含「加密参数」「签名算法」
     「加密分析」等 STRONG 特征词，被正则整类漏掉 → `ALLOW_EXTRA5`（15 条，
     含 `某鱼sign参数逆向`、`某香医生sign值参数逆向`、`某麦数据参数逆向分析`…）；
   - **误收**：工具类长尾词（rc4 / des加密 / 字符串加密 / fiddler / charles / jadx / ollvm）
     捞进大量**加密小工具、native 教程、移动端抓包帖**，且 Thread 来源帖子 `forum` 为空
     使版块白名单失效 → `BLOCK_EXTRA5`（41 条）。
4. 候选 **238 条** → 去重跳过 216 → 实际归档 **15 篇**（空正文 7 篇，失败 0）。

### 分类


### 补环境 / 环境还原（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1618249](https://www.52pojie.cn/thread-1618249-1-1.html) | 猿人学Web端爬虫攻防大赛第十题 与某数ast+jsdom方法 | `52pojie-1618249-猿人学Web端爬虫攻防大赛第十题 与某数ast+jsdom方法.md` |

### Webpack / Protobuf 扣取与还原（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1667701](https://www.52pojie.cn/thread-1667701-1-1.html) | B 站弹幕 protobuf 协议 | `52pojie-1667701-B 站弹幕 protobuf 协议.md` |

### 协议 / 接口 / 小程序 / 参数还原（13）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2114389](https://www.52pojie.cn/thread-2114389-1-1.html) | 某股票网ab_sr参数逆向分析 | `52pojie-2114389-某股票网ab_sr参数逆向分析.md` |
| [2057979](https://www.52pojie.cn/thread-2057979-1-1.html) | 某鱼sign参数逆向[适合小白新手] | `52pojie-2057979-某鱼sign参数逆向[适合小白新手].md` |
| [2050371](https://www.52pojie.cn/thread-2050371-1-1.html) | 某500px登录参数逆向分析 | `52pojie-2050371-某500px登录参数逆向分析.md` |
| [2038968](https://www.52pojie.cn/thread-2038968-1-1.html) | 某香医生sign值参数逆向分析 | `52pojie-2038968-某香医生sign值参数逆向分析.md` |
| [2021390](https://www.52pojie.cn/thread-2021390-1-1.html) | 【js逆向】某有声书网站参数逆向分析 | `52pojie-2021390-【js逆向】某有声书网站参数逆向分析.md` |
| [2013121](https://www.52pojie.cn/thread-2013121-1-1.html) | 【小程序】绝味鸭脖 xmSign参数逆向 | `52pojie-2013121-【小程序】绝味鸭脖 xmSign参数逆向.md` |
| [1989660](https://www.52pojie.cn/thread-1989660-1-1.html) | 某某方sign参数逆向-------小白讲解02 | `52pojie-1989660-某某方sign参数逆向-------小白讲解02.md` |
| [1934526](https://www.52pojie.cn/thread-1934526-1-1.html) | 某家请求头X-TJH参数逆向流程分析 | `52pojie-1934526-某家请求头X-TJH参数逆向流程分析.md` |
| [1795558](https://www.52pojie.cn/thread-1795558-1-1.html) | 某台葫芦娃小程序系列协议开源C++,QT6,X-HMAC-SIGNATURE算法,X-HMAC-DIGEST学习研究 | `52pojie-1795558-某台葫芦娃小程序系列协议开源C++,QT6,X-HMAC-SIGNATURE算法,X-HMAC-DIGEST学习研究.md` |
| [1783824](https://www.52pojie.cn/thread-1783824-1-1.html) | 某麦数据参数逆向分析 | `52pojie-1783824-某麦数据参数逆向分析.md` |
| [1752724](https://www.52pojie.cn/thread-1752724-1-1.html) | 某数据服务平台头部参数逆向分析 | `52pojie-1752724-某数据服务平台头部参数逆向分析.md` |
| [1743808](https://www.52pojie.cn/thread-1743808-1-1.html) | 某登录表单参数逆向分析 | `52pojie-1743808-某登录表单参数逆向分析.md` |
| [1280130](https://www.52pojie.cn/thread-1280130-1-1.html) | 利用fiddler在浏览器打开微信网页链接,并进行js断点调试解密 | `52pojie-1280130-利用fiddler在浏览器打开微信网页链接,并进行js断点调试解密.md` |

### 本轮空正文（无实质内容，未归档）

`1994034`（某东 h5st 5.0 补环境分析流程）、`1985832`（AST 解混淆实现某 Epub 图片还原）、
`1831357`（小菜鸡的答题游戏&Web 逆向初步）、`1757443`（某刷步网网站逆向，key 加密参数分析）、
`1756698`（某网站加速乐 Cookie 混淆逆向详解）、`1528155`（猿人第 3 题）、
`1205982`（关于浏览器指纹追踪技术探究）—— 与历轮记录完全一致，长期为作者删正文，
**记入长期空帖清单，后续不必重复尝试**。

---

## 七、补充归档（五）（60 篇，2026-09-20 第六轮：验证码/滑块/纯算老帖补回 + STRONG 扩容）

**数据源**
- `Thread` 逐页拉到第 8 页（888 条），新增帖仅 6 条，其中 web 逆向 **0 条** —— 与第 3/4/5 轮
  结论一致。唯一相关新帖 `2129114`《基于 Trace 的 VMP 还原实践文档》抓正文确认为 **native VMP**
  （P-code / SLEIGH / varnode / IDA / LLVM IR），非 web，未收录。
- 75 个长尾关键词（站点补全 30 / 防护厂商与论坛隐称 9 / 算法协议 13 / 方法工程 16 / 组合词 8），
  8 个词为真实零结果（易车、猎聘、寺库、perimeterx、datadome、行为验证码、表单加密、web逆向实战）。

**本轮最大收获，也是一处此前未被发现的口径盲区**
`search --limit 40` 对**热门关键词会截断**，导致「验证码逆向专栏」「某验 N 代滑块」「某讯滑块」
「纯算」等**整批高价值老帖从未进入候选池**（历轮 A 表也从未暴露，因为它们连池都没进）。
本轮改用更细的**组合词**（`滑块验证` / `参数分析` / `sign参数` / `验签` / `参数校验` / `扣代码` /
`纯算` / `指令还原` / `字节码` / `opcode` / `报文加密` …）后一次性补回 **65 篇**，
占本轮新增的绝大部分。

**口径改动**
- **STRONG 扩容**（第五轮遗留待办）：把 `参数逆向|参数分析|参数校验|参数签名|验签|sign参数|参数解密`
  并入 STRONG。只放行「原口径仅因 STRONG 未命中而落选」的项，且**必须先过历史全部人工黑名单**——
  首跑未过黑名单，A 表立刻冒出 99 条（把前几轮明确排除的 native/工具帖重新放进来）；
  修复后 F 表只剩 6 条，净收益 **+3 篇真阳性**，代价 3 条假阳性（「汽车配置参数分析」×2、
  C# 验签工具）→ 已入 `BLOCK_EXTRA6`。**结论：扩容有效但 `参数分析` 会误伤「非加密参数」语境。**
- 新增 `BLOCK_EXTRA6`（11 条：桌面端 `hexin.exe`、纯爬虫教程、RSA 库教学、短信验证码 demo 等）。
- 新增 `ALLOW_EXTRA6`（6 条，C 表漏拣逐条抓正文确认）。

**结果**：候选 322（未归档 67）→ 抓取成功 **60 篇**，跳过重复 255，空正文 7（与历轮长期空帖
清单完全一致），失败 0。目录 391 → **451**（唯一 ID 383 → 443）。审计五表（A~E）+ 新增 F 表
见 `artifacts/52pojie-fetch6/audit6.out`。

### 验证码 / 滑块 / 风控（33）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2054148](https://www.52pojie.cn/thread-2054148-1-1.html) | 360滑块验证码逆向 | `52pojie-2054148-360滑块验证码逆向.md` |
| [2051922](https://www.52pojie.cn/thread-2051922-1-1.html) | 某手势验证码纯算逆向分析 | `52pojie-2051922-某手势验证码纯算逆向分析.md` |
| [2049010](https://www.52pojie.cn/thread-2049010-1-1.html) | 某盾无感验证码逆向 - 1 | `52pojie-2049010-某盾无感验证码逆向 - 1.md` |
| [2038972](https://www.52pojie.cn/thread-2038972-1-1.html) | v5滑块验证逆向 | `52pojie-2038972-v5滑块验证逆向.md` |
| [2037361](https://www.52pojie.cn/thread-2037361-1-1.html) | 猿人学第三届js逆向&验证码比赛第一题纯算思路 | `52pojie-2037361-猿人学第三届js逆向&验证码比赛第一题纯算思路.md` |
| [2020008](https://www.52pojie.cn/thread-2020008-1-1.html) | 【JS逆向】yun片滑块验证码分析 | `52pojie-2020008-【JS逆向】yun片滑块验证码分析.md` |
| [2017394](https://www.52pojie.cn/thread-2017394-1-1.html) | 【JS逆向】某验三代点选逆向分析 | `52pojie-2017394-【JS逆向】某验三代点选逆向分析.md` |
| [1996654](https://www.52pojie.cn/thread-1996654-1-1.html) | 某讯点选纯算识别可能性（抛砖引玉） | `52pojie-1996654-某讯点选纯算识别可能性（抛砖引玉）.md` |
| [1918745](https://www.52pojie.cn/thread-1918745-1-1.html) | [51]网站滑块验证码还原 | `52pojie-1918745-[51]网站滑块验证码还原.md` |
| [1892035](https://www.52pojie.cn/thread-1892035-1-1.html) | 某盾滑块验证：从0到1，逐步分析 (图片还原、轨迹模拟) | `52pojie-1892035-某盾滑块验证：从0到1，逐步分析 (图片还原、轨迹模拟).md` |
| [1887377](https://www.52pojie.cn/thread-1887377-1-1.html) | 40行python识别某讯云滑块验证码并自动登录 | `52pojie-1887377-40行python识别某讯云滑块验证码并自动登录.md` |
| [1886624](https://www.52pojie.cn/thread-1886624-1-1.html) | 某查查登录验证（滑块验证、图标验证、字体验证） | `52pojie-1886624-某查查登录验证（滑块验证、图标验证、字体验证）.md` |
| [1859105](https://www.52pojie.cn/thread-1859105-1-1.html) | 记一次查询网站备案中滑块验证码的逆向分析 | `52pojie-1859105-记一次查询网站备案中滑块验证码的逆向分析.md` |
| [1858066](https://www.52pojie.cn/thread-1858066-1-1.html) | 模拟网页滑块验证 | `52pojie-1858066-模拟网页滑块验证.md` |
| [1779592](https://www.52pojie.cn/thread-1779592-1-1.html) | 【验证码逆向专栏】某验全家桶细节避坑总结 | `52pojie-1779592-【验证码逆向专栏】某验全家桶细节避坑总结.md` |
| [1773476](https://www.52pojie.cn/thread-1773476-1-1.html) | 【验证码逆向专栏】某验深知 V2 业务风控逆向分析 | `52pojie-1773476-【验证码逆向专栏】某验深知 V2 业务风控逆向分析.md` |
| [1770958](https://www.52pojie.cn/thread-1770958-1-1.html) | 【验证码逆向专栏】某验三代、四代一键通过模式逆向分析 | `52pojie-1770958-【验证码逆向专栏】某验三代、四代一键通过模式逆向分析.md` |
| [1758969](https://www.52pojie.cn/thread-1758969-1-1.html) | 【验证码逆向专栏】某验四代五子棋、消消乐验证码逆向分析 | `52pojie-1758969-【验证码逆向专栏】某验四代五子棋、消消乐验证码逆向分析.md` |
| [1758943](https://www.52pojie.cn/thread-1758943-1-1.html) | 【验证码逆向专栏】某验三代、四代点选类验证码逆向分析 | `52pojie-1758943-【验证码逆向专栏】某验三代、四代点选类验证码逆向分析.md` |
| [1749842](https://www.52pojie.cn/thread-1749842-1-1.html) | 【验证码逆向专栏】某验四代滑块验证码逆向分析 | `52pojie-1749842-【验证码逆向专栏】某验四代滑块验证码逆向分析.md` |
| [1749808](https://www.52pojie.cn/thread-1749808-1-1.html) | 【验证码逆向专栏】某验三代滑块验证码逆向分析 | `52pojie-1749808-【验证码逆向专栏】某验三代滑块验证码逆向分析.md` |
| [1749803](https://www.52pojie.cn/thread-1749803-1-1.html) | 【验证码逆向专栏】某验二代滑块验证码逆向分析 | `52pojie-1749803-【验证码逆向专栏】某验二代滑块验证码逆向分析.md` |
| [1749799](https://www.52pojie.cn/thread-1749799-1-1.html) | 【验证码逆向专栏】某验“初代”滑块验证码逆向分析 | `52pojie-1749799-【验证码逆向专栏】某验“初代”滑块验证码逆向分析.md` |
| [1745678](https://www.52pojie.cn/thread-1745678-1-1.html) | 抖音 滑块验证方案 s_v_web_id 参数分析 | `52pojie-1745678-抖音 滑块验证方案 s_v_web_id 参数分析.md` |
| [1729065](https://www.52pojie.cn/thread-1729065-1-1.html) | 某讯滑块验证码反汇编分析-第三章 | `52pojie-1729065-某讯滑块验证码反汇编分析-第三章.md` |
| [1727676](https://www.52pojie.cn/thread-1727676-1-1.html) | 某讯滑块验证码反汇编分析-第二章 | `52pojie-1727676-某讯滑块验证码反汇编分析-第二章.md` |
| [1725219](https://www.52pojie.cn/thread-1725219-1-1.html) | 某讯滑块验证码反汇编分析-第一章 | `52pojie-1725219-某讯滑块验证码反汇编分析-第一章.md` |
| [1674986](https://www.52pojie.cn/thread-1674986-1-1.html) | 树美滑块验证—滑块识别、获取和提交参数一条龙分析和调用 | `52pojie-1674986-树美滑块验证—滑块识别、获取和提交参数一条龙分析和调用.md` |
| [1631496](https://www.52pojie.cn/thread-1631496-1-1.html) | 某验四代滑块参数学习 | `52pojie-1631496-某验四代滑块参数学习.md` |
| [1521480](https://www.52pojie.cn/thread-1521480-1-1.html) | 某鹅滑块验证码破解笔记 | `52pojie-1521480-某鹅滑块验证码破解笔记.md` |
| [1486705](https://www.52pojie.cn/thread-1486705-1-1.html) | 某验滑块加密分析下 | `52pojie-1486705-某验滑块加密分析下.md` |
| [1479607](https://www.52pojie.cn/thread-1479607-1-1.html) | 某验滑块加密分析(上) | `52pojie-1479607-某验滑块加密分析(上).md` |
| [1476911](https://www.52pojie.cn/thread-1476911-1-1.html) | 某验滑块图片还原 | `52pojie-1476911-某验滑块图片还原.md` |

### AST / 解混淆（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1713986](https://www.52pojie.cn/thread-1713986-1-1.html) | Python调用，爬虫JS混淆——数据加密获取步骤和方法 | `52pojie-1713986-Python调用，爬虫JS混淆——数据加密获取步骤和方法.md` |
| [1351841](https://www.52pojie.cn/thread-1351841-1-1.html) | Python反反爬之JS混淆---回溯 | `52pojie-1351841-Python反反爬之JS混淆---回溯.md` |

### 字体反爬 / 反爬对抗（4）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1773958](https://www.52pojie.cn/thread-1773958-1-1.html) | 【JS 逆向百例】拉勾网爬虫，traceparent、__lg_stoken__、X-S-HEADER 等参数分析 | `52pojie-1773958-【JS 逆向百例】拉勾网爬虫，traceparent、__lg_stoken__、X-S-HEADER 等参数分析.md` |
| [1714904](https://www.52pojie.cn/thread-1714904-1-1.html) | Python调用，爬虫JS逆向—— sign参数获取步骤和方法 | `52pojie-1714904-Python调用，爬虫JS逆向—— sign参数获取步骤和方法.md` |
| [1346210](https://www.52pojie.cn/thread-1346210-1-1.html) | Python反反爬之CSS加密---样式干扰(详细教程) | `52pojie-1346210-Python反反爬之CSS加密---样式干扰(详细教程).md` |
| [914709](https://www.52pojie.cn/thread-914709-1-1.html) | 【吾爱破解】租房子被房东扣了一千五，发一个房产网站字体反反爬的研究过程。 | `52pojie-914709-【吾爱破解】租房子被房东扣了一千五，发一个房产网站字体反反爬的研究过程。.md` |

### 协议 / 接口 / 小程序 / 参数还原（19）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2107326](https://www.52pojie.cn/thread-2107326-1-1.html) | Amazon登录协议逆向分析 | `52pojie-2107326-Amazon登录协议逆向分析.md` |
| [2072858](https://www.52pojie.cn/thread-2072858-1-1.html) | 前端加密函数利用 RPC 调用实现自动化 | `52pojie-2072858-前端加密函数利用 RPC 调用实现自动化.md` |
| [2064583](https://www.52pojie.cn/thread-2064583-1-1.html) | 某平台登录参数扣代码 | `52pojie-2064583-某平台登录参数扣代码.md` |
| [2063429](https://www.52pojie.cn/thread-2063429-1-1.html) | 某验3纯算逆向分析 | `52pojie-2063429-某验3纯算逆向分析.md` |
| [1983577](https://www.52pojie.cn/thread-1983577-1-1.html) | 【JS逆向】某Q音乐VMP纯算 | `52pojie-1983577-【JS逆向】某Q音乐VMP纯算.md` |
| [1962421](https://www.52pojie.cn/thread-1962421-1-1.html) | 西瓜视频最新解密链接 | `52pojie-1962421-西瓜视频最新解密链接.md` |
| [1916130](https://www.52pojie.cn/thread-1916130-1-1.html) | 某蜂窝w_tsfp参数分析 | `52pojie-1916130-某蜂窝w_tsfp参数分析.md` |
| [1905002](https://www.52pojie.cn/thread-1905002-1-1.html) | 某数藏头部逆向 | `52pojie-1905002-某数藏头部逆向.md` |
| [1901995](https://www.52pojie.cn/thread-1901995-1-1.html) | 小白hook无限debugger | `52pojie-1901995-小白hook无限debugger.md` |
| [1856684](https://www.52pojie.cn/thread-1856684-1-1.html) | 逆向分析星巴克前端加密逻辑，使用mitm自动改包 | `52pojie-1856684-逆向分析星巴克前端加密逻辑，使用mitm自动改包.md` |
| [1824337](https://www.52pojie.cn/thread-1824337-1-1.html) | 挑战解密最强前端加密播放器 | `52pojie-1824337-挑战解密最强前端加密播放器.md` |
| [1679174](https://www.52pojie.cn/thread-1679174-1-1.html) | js逆向-猿人学比赛14题-扣代码破解 | `52pojie-1679174-js逆向-猿人学比赛14题-扣代码破解.md` |
| [1625463](https://www.52pojie.cn/thread-1625463-1-1.html) | 问卷星(答题)协议全参数分析 | `52pojie-1625463-问卷星(答题)协议全参数分析.md` |
| [1519694](https://www.52pojie.cn/thread-1519694-1-1.html) | js逆向之Rpc免扣代码 | `52pojie-1519694-js逆向之Rpc免扣代码.md` |
| [1376651](https://www.52pojie.cn/thread-1376651-1-1.html) | 某工业超市加密 header 参数分析 | `52pojie-1376651-某工业超市加密 header 参数分析.md` |
| [1316664](https://www.52pojie.cn/thread-1316664-1-1.html) | 记一次猫眼电影登录POST参数分析 | `52pojie-1316664-记一次猫眼电影登录POST参数分析.md` |
| [1293936](https://www.52pojie.cn/thread-1293936-1-1.html) | js逆向：某瓜_signature、__ac_signature参数分析 | `52pojie-1293936-js逆向：某瓜_signature、__ac_signature参数分析.md` |
| [1214010](https://www.52pojie.cn/thread-1214010-1-1.html) | 17track接口逆向分析 | `52pojie-1214010-17track接口逆向分析.md` |
| [1111210](https://www.52pojie.cn/thread-1111210-1-1.html) | 【JS逆向】某监测平台数据加密逆向分析 | `52pojie-1111210-【JS逆向】某监测平台数据加密逆向分析.md` |

### 其他（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1856239](https://www.52pojie.cn/thread-1856239-1-1.html) | 淘系浏览器请求验签isg和cna分享 | `52pojie-1856239-淘系浏览器请求验签isg和cna分享.md` |
| [1783820](https://www.52pojie.cn/thread-1783820-1-1.html) | 某数控制流改写 | `52pojie-1783820-某数控制流改写.md` |

### 本轮空正文（与历轮完全一致，长期为作者删正文，不再重复尝试）

`1994034`（某东 h5st 5.0 补环境分析流程）、`1985832`（AST 解混淆实现某 Epub 图片还原）、
`1831357`（小菜鸡的答题游戏&Web 逆向初步）、`1757443`（某刷步网网站逆向，key 加密参数分析）、
`1756698`（某网站加速乐 Cookie 混淆逆向详解）、`1528155`（猿人第 3 题）、
`1205982`（关于浏览器指纹追踪技术探究）。


---

## 八、补充归档（六）（13 篇，2026-09-21 第七轮：验证码逆向专栏系列 + 历史误杀修正）

**数据源**：`Thread` 逐页到空（8 页，880 条；新帖 36 条**全为工具/求助帖，web 逆向 0**）
+ 69 个新关键词（站点长尾：出行/汽车、生鲜零售、金融理财、内容社区、医疗教育、海外电商、房产婚恋；
细粒度组合词：`点选` / `某验4` / `免扣` / `rpc调用` / `环境监测` / `反hook` / `指纹` / `验证码逆向` …）。
合并后全量池 **5277** 条（唯一 ID，上轮 4682）→ 口径命中 342 → 去重后待抓 18 → 复核删除 5 → **净新增 13 篇**。

**本轮价值高度集中在一处**：`验证码逆向` 这个关键词**首次返回 `[]`（假零）**，复测后拿到 **30 条**，
其中「【验证码逆向专栏】」系列 4 篇 + 某东/某省验证码逆向 2 篇，几乎撑起本轮全部新增。
若沿用旧脚本（首次 `[]` 即落盘），这批帖子会被永久跳过。

### 验证码 / 滑块 / 点选（8）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1903272](https://www.52pojie.cn/thread-1903272-1-1.html) | 某东常用验证码逆向流程分析 | `52pojie-1903272-某东常用验证码逆向流程分析.md` |
| [2024396](https://www.52pojie.cn/thread-2024396-1-1.html) | 某某省过验证码逆向---------小白讲解09 | `52pojie-2024396-某某省过验证码逆向---------小白讲解09.md` |
| [1846995](https://www.52pojie.cn/thread-1846995-1-1.html) | 【验证码逆向专栏】房天下登录滑块逆向分析 | `52pojie-1846995-【验证码逆向专栏】房天下登录滑块逆向分析.md` |
| [1846991](https://www.52pojie.cn/thread-1846991-1-1.html) | 【验证码逆向专栏】螺丝帽人机验证逆向分析 | `52pojie-1846991-【验证码逆向专栏】螺丝帽人机验证逆向分析.md` |
| [1756696](https://www.52pojie.cn/thread-1756696-1-1.html) | 【验证码逆向专栏】安某客滑块逆向 | `52pojie-1756696-【验证码逆向专栏】安某客滑块逆向.md` |
| [1872638](https://www.52pojie.cn/thread-1872638-1-1.html) | 某备案查询网站 汉字点选逆向分析 | `52pojie-1872638-某备案查询网站 汉字点选逆向分析.md` |
| [1606710](https://www.52pojie.cn/thread-1606710-1-1.html) | 非深度学习非调用API过猿人学第八题点选验证 | `52pojie-1606710-非深度学习非调用API过猿人学第八题点选验证.md` |
| [1792807](https://www.52pojie.cn/thread-1792807-1-1.html) | 《某度旋转验证码逆向》（水贴冒泡） | `52pojie-1792807-《某度旋转验证码逆向》（水贴冒泡）.md` |

### 风控 / 指纹 / 环境监测（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2040484](https://www.52pojie.cn/thread-2040484-1-1.html) | 简单探究某站指纹参数算法 | `52pojie-2040484-简单探究某站指纹参数算法.md` |
| [2074942](https://www.52pojie.cn/thread-2074942-1-1.html) | steam hcaptcha 一些环境监测点分享 | `52pojie-2074942-steam hcaptcha 一些环境监测点分享.md` |
| [1648410](https://www.52pojie.cn/thread-1648410-1-1.html) | 爬虫自动化之定制浏览器随机指纹 | `52pojie-1648410-爬虫自动化之定制浏览器随机指纹.md` |

### 协议 / 参数 / webpack 扣取（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1111948](https://www.52pojie.cn/thread-1111948-1-1.html) | JS逆向 房天下登录RSA | `52pojie-1111948-JS逆向 房天下登录RSA.md` |
| [2026911](https://www.52pojie.cn/thread-2026911-1-1.html) | 一个可以练习webpack的站（正文实为 webpack 扣取 + 请求/响应 SM4 加密 + SM2 签名 + execjs 复现） | `52pojie-2026911-一个可以练习webpack的站.md` |

> `2026911` 是**本轮修正的一处历史误杀**：第四轮按标题「练习站推荐」拉黑，
> 但正文是完整的 webpack 扣取 + 国密报文加解密实战。已移入 `ALLOW_EXTRA7`。

### 本轮剔除（STRONG 命中但抓正文确认非 web 逆向，入 `BLOCK_EXTRA7`）

| ID | 标题 | 剔除理由 |
| --- | --- | --- |
| 327512 | 世纪佳缘注册验证码识别 识别率95以上 | 正文仅一个 rar 附件，无分析内容 |
| 2002242 | 2025淘宝"一笔连福"解题工具Python版 | 工具发布 + 外链下载，无逆向分析 |
| 2001865 | 船新 淘宝"一笔连福"可视化点选单页面 | DFS 小工具页面，非逆向 |
| 2074398 | 企业级一体化安全扫描利器（12.4w+POC / 2.7w+指纹识别） | 渗透扫描工具分享 |
| 2054685 | 基于硬件指纹的"一机一码"软件授权系统全实现 | 桌面端授权系统 |

### 本轮空正文（新增 1 条；其余 7 条与历轮完全一致）

新增：`1778315`（JavaScript 爬虫 根据地图爬取链家所有房源和小区信息，0B）。
长期空帖不变：`1994034`、`1985832`、`1831357`、`1757443`、`1756698`、`1528155`、`1205982`。

---

## 九、补充归档（七）（22 篇，2026-09-21 第八轮：`参数逆向|参数分析|sign参数` 口径扩容后的存量补捞）

**数据源**：`Thread` 逐页到空（8 页，886 条；新帖 web 逆向 0）
+ **105 个关键词**（A 线：历轮 48 个「全零」关键词批量复测，全部确认为**真实零结果**；
B 线：57 个新细粒度组合词——站点长尾 + `参数/签名/加密` 组合 + 具体算法名 + 验证码厂商）。
合并后全量池 **6051** 条（唯一 ID，上轮 5277）→ 口径命中 392 → 去重后待抓 57 →
抓取 45 篇 → **复核剔除 23 篇非 web** → **净新增 22 篇**。

> ⚠️ **本轮暴露的核心口径缺陷（坑 19）**：`STRONG` 里裸的 `解密` / `加密.*分析` 在
> **『编程语言区』**召回了大量与 web 逆向无关的**通用加解密教程 / 小工具**——
> PHP / C++ / Golang / Python / 易语言 / VB.NET 实现、native 内存与磁盘解密、
> recaptcha/Kaptcha 的**后端接入教程**。共 23 篇，已删文件并入 `BLOCK_EXTRA8`。
> 教训：**只看标题的 STRONG 正则无法区分「web 逆向」与「加解密编程」**，
> 必须靠抓正文复核兜底；下轮考虑给 STRONG 的 `解密` 分支加「前端/web/js/接口/参数」共现约束。

### 协议 / 接口 / 参数加密（8）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2058010](https://www.52pojie.cn/thread-2058010-1-1.html) | 某习通混淆代码及滑动验证码全协议分析 | `52pojie-2058010-某习通混淆代码及滑动验证码全协议分析.md` |
| [1955460](https://www.52pojie.cn/thread-1955460-1-1.html) | 某保险行业协会接口返回加密数据解密算法 | `52pojie-1955460-某保险行业协会接口返回加密数据解密算法.md` |
| [1904594](https://www.52pojie.cn/thread-1904594-1-1.html) | 某二手房网站登录密码加密分析 | `52pojie-1904594-某二手房网站登录密码加密分析.md` |
| [1885820](https://www.52pojie.cn/thread-1885820-1-1.html) | 某视频解析网址加密接口分析 | `52pojie-1885820-某视频解析网址加密接口分析.md` |
| [1782321](https://www.52pojie.cn/thread-1782321-1-1.html) | 某乐网加密算法逆向分析分享 | `52pojie-1782321-某乐网加密算法逆向分析分享.md` |
| [1692161](https://www.52pojie.cn/thread-1692161-1-1.html) | [2022.9.28]羊了个羊协议分析 | `52pojie-1692161-[2022.9.28]羊了个羊协议分析.md` |
| [1639222](https://www.52pojie.cn/thread-1639222-1-1.html) | 某画师的登陆协议分析 | `52pojie-1639222-某画师的登陆协议分析.md` |
| [1353766](https://www.52pojie.cn/thread-1353766-1-1.html) | 记XX大学身份认证管理平台密码加密解密流程 | `52pojie-1353766-记XX大学身份认证管理平台密码加密解密流程.md` |

### 小程序 / 前端 WEB 系统（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1843617](https://www.52pojie.cn/thread-1843617-1-1.html) | 某XX自考小程序的AES加密分析 | `52pojie-1843617-某XX自考小程序的AES加密分析.md` |
| [1336342](https://www.52pojie.cn/thread-1336342-1-1.html) | 搜索编程的艺术之C#实现小程序包解密算法 | `52pojie-1336342-搜索编程的艺术之C#实现小程序包解密算法.md` |
| [656986](https://www.52pojie.cn/thread-656986-1-1.html) | 某公司内部WEB系统登录密码加密解密分析及易语言实现源码 | `52pojie-656986-某公司内部WEB系统登录密码加密解密分析及易语言实现源码.md` |

### 验证码 / 滑块（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1491635](https://www.52pojie.cn/thread-1491635-1-1.html) | 公众号验证码破解 | `52pojie-1491635-公众号验证码破解.md` |
| [1371291](https://www.52pojie.cn/thread-1371291-1-1.html) | JS实现阿里云滑动验证码破解 | `52pojie-1371291-JS实现阿里云滑动验证码破解.md` |

### 风控 / 反调试 / 风控厂商（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2049540](https://www.52pojie.cn/thread-2049540-1-1.html) | 风控逆向之qrator | `52pojie-2049540-风控逆向之qrator.md` |
| [1812867](https://www.52pojie.cn/thread-1812867-1-1.html) | 《某某点评》九卦连线图风控逆向第一部分 | `52pojie-1812867-《某某点评》九卦连线图风控逆向第一部分.md` |
| [1393398](https://www.52pojie.cn/thread-1393398-1-1.html) | 一款js加密的反调试分析 | `52pojie-1393398-一款js加密的反调试分析【后续继续更新】.md` |

### JS 解密 / 媒体资源 / 播放地址（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1533870](https://www.52pojie.cn/thread-1533870-1-1.html) | 清风DJ网在线播放地址JS解密转MP3方法 | `52pojie-1533870-清风DJ网在线播放地址JS解密转MP3方法.md` |
| [1508165](https://www.52pojie.cn/thread-1508165-1-1.html) | 某某云音乐歌曲评论获取JS加密分析 | `52pojie-1508165-某某云音乐歌曲评论获取JS加密分析.md` |
| [1075981](https://www.52pojie.cn/thread-1075981-1-1.html) | 某小说网js解密 | `52pojie-1075981-某小说网js解密.md` |

### websocket / 登录算法 / 其他（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1837847](https://www.52pojie.cn/thread-1837847-1-1.html) | golang-南华期货js解密.链接websocket（goja 跑 JS + websocket 协议） | `52pojie-1837847-golang-南华期货js解密.链接websocket.md` |
| [975800](https://www.52pojie.cn/thread-975800-1-1.html) | 【JS解密】某久久魔芋，官网账号登录算法MD5解密 | `52pojie-975800-【JS解密】某久久魔芋，官网账号登录算法MD5解密。.md` |
| [235244](https://www.52pojie.cn/thread-235244-1-1.html) | 西祠胡同登录源码（内涵js解密） | `52pojie-235244-西祠胡同登录源码（内涵js解密）.md` |

### 本轮剔除（抓正文复核确认非 web 逆向，入 `BLOCK_EXTRA8`，共 23 篇）

| 类别 | 帖子 ID |
| --- | --- |
| native 内存 / 磁盘 / 数据库解密 | `2112948`（Wechat 密钥内存）、`2107951`（LUKS 全盘）、`1991362`（PCQQ db） |
| 桌面端 / 客户端 / 脚本工具 | `2026748`（锁屏预览图片）、`1487411`（机房管理软件 VB.NET）、`870222`（按键精灵斗鱼客户端）、`1934625`（PowerShell 剪贴板）、`292225`（IP 加密过域名拦截，2014） |
| 通用加解密算法教程（非 web） | `1838243`(Golang)、`1829215`(Python)、`1811482`、`1785998`、`1726169`(C++)、`1566703`(Python AES)、`1258638`(甲骨符)、`1210762`(虎符)、`902592`(PHP)、`793477`(遍历小工具)、`1966678`(文件内容 AES)、`1963507`(AS3 vs C) |
| 验证码**接入**教程（后端） | `1488672`、`1487657`（PHP recaptcha v2/v3）、`1346400`（Spring Kaptcha） |

### 本轮空正文（12 条，其中 7 条为历轮长期空帖）

新增：`1867851`（抖音直播匿名采集，0B）、`1641626`（三进制加解密算法，280B）、
`1305572`（Wireshark 抓包课程，360B）、`417613`（雷盾域名授权加解密，642B）。
长期空帖：`1994034`、`1985832`、`1831357`、`1757443`、`1756698`、`1528155`、`1205982`。
（`1778315` 上轮已记录为空，本轮重试仍空。）

---

## 十、补充归档（八）（18 篇，2026-09-21 第九轮：隐称「某X」关键词首次覆盖 + B/C 表逐条补漏）

**数据源**：`Thread` 续拉到空（第 8~9 页，共 879 条；3 条新帖全是无关资源帖）
+ **66 个关键词**，本轮最大变量是**首次使用「隐称」词形**：`某音 / 某书 / 某东 / 某团 / 某宝 /
某多 / 某手 / 某鱼 / 某滴`（历轮只试过 `某数 / 某验 / 某盾`），另有验证码与加密的细粒度组合、
VMP/混淆动作词、`uni-app / taro / 抖音小程序 / 支付宝小程序` 等框架词。
合并后全量池 **6417** 条（唯一 ID，上轮 6051）→ 口径命中 386 → 去重后待抓 24 →
抓取 7 篇 → **审计 B/C 表逐条复核补回 11 篇** → **净新增 18 篇**。

**本轮两个增量来源**：

1. **隐称「某X」是历轮完全没试过的词形，且回报最高**：`某音` 40 条 / `某东` 40 条 /
   `uni-app` 40 条 / `某团` `某书` 各 15 条 —— 说明论坛里大量 web 逆向帖**标题只用隐称**
   （「某音」「某东」），宽泛词与站点全名都捞不到。26 个词为真实零结果（`某滴`、`语序验证`、
   `缺口识别`、`指纹算法`、`vue逆向`、`tls握手`、`v8引擎` …）。
2. **B/C 双向补漏**（本技能的核心价值再次体现在审计上）：
   - **B 表（NOTWEB 误杀）5 篇**：`NOTWEB` 的 `直播间|弹幕`、`监控`、`下载`、`网课`
     把 `抖音直播间弹幕获取及参数逆向`、`某麦网回流票监控 sing 参数分析`、
     `某手短视频接口请求参数分析`、`酷狗音乐搜索下载 js 解密`、`某网课平台 m3u8 key 解密` 全拦下了。
   - **C 表（STRONG 漏拣）6 篇**：标题不含任何 STRONG 特征，靠人工看「参数 / sign / 加密算法」
     识别——`某电商平台客户联系方式加密算法`、`vmp套vmp之探讨某d的_fingerprint参数生成`、
     `某去水印小程序的加密字段算法解析`、`DE物后台请求 sign 加密算法`、
     `某酷 ckey 签名生成算法`、`超星学习通登入密码加密算法逆向`。

### 签名 / 参数 / 风控指纹（7）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2065208](https://www.52pojie.cn/thread-2065208-1-1.html) | 基于 AST 手撕 xm-sign 生成逻辑：从环境补全到代码深度解析 | `52pojie-2065208-基于 AST 手撕 xm-sign 生成逻辑：从环境补全到代码深度解析.md` |
| [1873704](https://www.52pojie.cn/thread-1873704-1-1.html) | 某东方-头部sign解密 | `52pojie-1873704-某东方-头部sign解密.md` |
| [2030247](https://www.52pojie.cn/thread-2030247-1-1.html) | vmp套vmp之探讨某d的_fingerprint参数生成 | `52pojie-2030247-vmp套vmp之探讨某d的_fingerprint参数生成.md` |
| [1744074](https://www.52pojie.cn/thread-1744074-1-1.html) | 记一次DE物后台请求sign加密算法过程 | `52pojie-1744074-记一次DE物后台请求sign加密算法过程.md` |
| [1565241](https://www.52pojie.cn/thread-1565241-1-1.html) | 某酷ckey签名生成算法系列--（一）参数生成来源分析 | `52pojie-1565241-某酷ckey签名生成算法系列--（一）参数生成来源分析.md` |
| [1845064](https://www.52pojie.cn/thread-1845064-1-1.html) | 某麦网回流票监控，sing参数分析 | `52pojie-1845064-某麦网回流票监控，sing参数分析.md` |
| [2105256](https://www.52pojie.cn/thread-2105256-1-1.html) | 抖音直播间弹幕获取及参数逆向 | `52pojie-2105256-抖音直播间弹幕获取及参数逆向.md` |

### 验证码 / 滑块 / 点选（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1988302](https://www.52pojie.cn/thread-1988302-1-1.html) | xhs 某书 旋转验证码 图片识别+算法 纯协议 | `52pojie-1988302-xhs 某书 旋转验证码 图片识别+算法 纯协议.md` |
| [1754224](https://www.52pojie.cn/thread-1754224-1-1.html) | 简单聊聊旋转验证码攻防（24.03.19更新） | `52pojie-1754224-简单聊聊旋转验证码攻防（24.03.19更新）.md` |
| [867169](https://www.52pojie.cn/thread-867169-1-1.html) | 小学数学破解滑动拼图验证码 | `52pojie-867169-小学数学破解滑动拼图验证码.md` |

### 登录 / 加密算法 / 接口参数（5）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1991268](https://www.52pojie.cn/thread-1991268-1-1.html) | 【JS逆向】某手机厂商登录逆向分析 | `52pojie-1991268-【JS逆向】某手机厂商登录逆向分析.md` |
| [2065515](https://www.52pojie.cn/thread-2065515-1-1.html) | 某电商平台客户联系方式加密算法 | `52pojie-2065515-某电商平台客户联系方式加密算法.md` |
| [1856275](https://www.52pojie.cn/thread-1856275-1-1.html) | 记一次纯小白对某去水印小程序的加密字段算法解析 | `52pojie-1856275-记一次纯小白对某去水印小程序的加密字段算法解析.md` |
| [1266540](https://www.52pojie.cn/thread-1266540-1-1.html) | 超星学习通登入密码加密算法逆向 | `52pojie-1266540-超星学习通登入密码加密算法逆向.md` |
| [1740170](https://www.52pojie.cn/thread-1740170-1-1.html) | 某手短视频接口请求参数分析，获取短视频无水印下载链接 | `52pojie-1740170-某手短视频接口请求参数分析，获取短视频无水印下载链接.md` |

### JS 解密 / 媒体资源（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1269855](https://www.52pojie.cn/thread-1269855-1-1.html) | 01-酷狗音乐搜索下载js解密附Python源码 | `52pojie-1269855-01-酷狗音乐搜索下载js解密附Python源码.md` |
| [1846708](https://www.52pojie.cn/thread-1846708-1-1.html) | 某网课平台m3u8 key解密算法分析以及python实现 | `52pojie-1846708-某网课平台m3u8 key解密算法分析以及python实现.md` |
| [1634927](https://www.52pojie.cn/thread-1634927-1-1.html) | 某东和文泉在线阅读epub解密 | `52pojie-1634927-某东和文泉在线阅读epub解密.md` |

### 本轮剔除（抓正文复核确认非 web 逆向，入 `BLOCK_EXTRA9`，共 7 篇）

`1028246` / `1027769`（学破解 C 语言异或加密教学）、`859330`（SMP 音频文件异或解密）、
`684263`（java 图形验证码工具）、`417613`（雷盾域名授权加解密）、
`293509`（au3/AutoIt 反混淆工具）、`1305572`（Wireshark 抓包视频课程，无正文）。
—— 全部是**坑 19**（裸 `解密/加密` token 召回非 web 帖）的同一类假阳性。

### 本轮空正文（10 条，其中 7 条为历轮长期空帖）

长期空帖：`1994034`、`1985832`、`1831357`、`1757443`、`1756698`、`1528155`、`1205982`。
其中 `1867851`（抖音直播匿名采集）、`1778315`、`1641626`（三进制加解密）本轮再次确认为空。
另 `1287341`（笔图网 文件下载协议分析）抓取返回 0B，正文已删。

---

## 十一、补充归档（九）（27 篇，2026-09-21 第十轮：审计 C 表整类漏拣补回 + 长尾关键词/隐称二批 + 坑19 缓解落地）

### 本轮做了什么

- **Thread**：逐页拉到第 8 页（894 条，第 9 页空）。本轮新帖 33 条**全为工具/求助帖，web 逆向 0 条**
  —— 与第 3~9 轮同一结论：Thread 列表已无逆向增量。
- **关键词 79 个**（六维：站点隐称二批 / 站点长尾二批 / 参数·签名细粒度组合 / 算法密钥层 /
  动作工程词 / 验证码细分二批），其中 **25 个为真实零结果**，0 失败。
  全量池 6417 → **7159**（唯一 ID），未归档 6633。
- **审计七表**：A 表 113（= 94 条历史 ID 黑名单 + 9 条长期空帖，**无新缺口**）；
  **B/D 表本轮零新增**（B 63 / D 40，与上轮同源）；**C 表 227 条**粗筛到 125 条后逐条抓正文复核 ——
  这是本轮唯一有效召回通道；G 表 83 条复核后仍全部成立（无需改判）。
- **口径修正（第 8 轮遗留待办正式落地）**：新增 `CRYPTO_GUARD`（坑 19 缓解手段 ②「共现约束」）——
  只有同时满足「含裸 `解密/加密`」+「**完全没有任何 web 信号**」+「含语言/桌面/native 特征」才排除。
  实测影响面仅 **1 条**（`1641626` 三进制加解密算法源码），且 6 个历轮人工白名单**不受影响**
  （守卫判定放在白名单之后，这是本轮特意加的保险）。
- **抓取**：待抓 38 → 写入 29 → 复核剔除 2（`1871048` 本地视频加密软件 OD 汇编、`1798155` execjs 环境配置）
  → **净新增 27 篇**。空正文 9 条（其中 7 条为历轮长期空帖）。

> 边际收益继续下降：79 个关键词 + 227 条 C 表，最终换来 27 篇，其中 **20 篇来自 C 表补漏**（老帖），
> 只有 7 篇来自本轮新关键词 —— 说明「新增关键词」这条路已接近见底，
> 历轮漏拣**只存在于 STRONG 正则的整类盲区**里。

### 签名 / 加密参数定位（7）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1964578](https://www.52pojie.cn/thread-1964578-1-1.html) | 某团新版Web mtgsig1.2 算法解析 | `52pojie-1964578-某团新版Web mtgsig1.2 算法解析.md` |
| [2070601](https://www.52pojie.cn/thread-2070601-1-1.html) | 某视频网站signter简要分析 | `52pojie-2070601-某视频网站signter简要分析.md` |
| [1829071](https://www.52pojie.cn/thread-1829071-1-1.html) | 某度翻譯逆向分析 | `52pojie-1829071-某度翻譯逆向分析.md` |
| [1769988](https://www.52pojie.cn/thread-1769988-1-1.html) | 某道翻译请求关键参数和返回数据解密过程分析-20230405 | `52pojie-1769988-某道翻译请求关键参数和返回数据解密过程分析-20230405.md` |
| [1522744](https://www.52pojie.cn/thread-1522744-1-1.html) | Python自学记录--PyExecJs+微信公众平台js算法改写 | `52pojie-1522744-Python自学记录--PyExecJs+微信公众平台js算法改写.md` |
| [1421125](https://www.52pojie.cn/thread-1421125-1-1.html) | 某条signature签名分析 | `52pojie-1421125-某条signature签名分析.md` |
| [1496415](https://www.52pojie.cn/thread-1496415-1-1.html) | 某电子商务生态链平台登陆 Form Data 加密逻辑分析 | `52pojie-1496415-某电子商务生态链平台登陆 Form Data 加密逻辑分析.md` |

### 登录 / 密码加密（6）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1783614](https://www.52pojie.cn/thread-1783614-1-1.html) | 今天分享一下某Bo的登录参数超简单获取方法 | `52pojie-1783614-今天分享一下某Bo的登录参数超简单获取方法.md` |
| [1522743](https://www.52pojie.cn/thread-1522743-1-1.html) | Python自学记录--steam密码加密逆向 | `52pojie-1522743-Python自学记录--steam密码加密逆向.md` |
| [1627217](https://www.52pojie.cn/thread-1627217-1-1.html) | 某贷登录加密破解思路及加密源码 | `52pojie-1627217-某贷登录加密破解思路及加密源码.md` |
| [1541593](https://www.52pojie.cn/thread-1541593-1-1.html) | 暴雪战网最新登录加密JS和调试代码 | `52pojie-1541593-暴雪战网最新登录加密JS和调试代码.md` |
| [1701172](https://www.52pojie.cn/thread-1701172-1-1.html) | 【已失效】超星学习通图书馆预约(更新免抓包版) | `52pojie-1701172-【已失效】超星学习通图书馆预约(更新免抓包版).md` |
| [819754](https://www.52pojie.cn/thread-819754-1-1.html) | 【原创】Python爬取12306登录 | `52pojie-819754-【原创】Python爬取12306登录.md` |

### 接口 / 报文加密（6）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1151791](https://www.52pojie.cn/thread-1151791-1-1.html) | Python分析破解js——AES加密 | `52pojie-1151791-Python分析破解js——AES加密.md` |
| [1848164](https://www.52pojie.cn/thread-1848164-1-1.html) | 某量算术的传输加密破解 | `52pojie-1848164-某量算术的传输加密破解.md` |
| [2048339](https://www.52pojie.cn/thread-2048339-1-1.html) | 码上爬-题五：屠龙刀（JS加密-请求参数经过特殊处理） | `52pojie-2048339-码上爬-题五：屠龙刀（JS加密-请求参数经过特殊处理）.md` |
| [1464031](https://www.52pojie.cn/thread-1464031-1-1.html) | Python爬虫之社区团购某团、某心、某多、某马微信小程序商品数据 | `52pojie-1464031-Python爬虫之社区团购某团、某心、某多、某马微信小程序商品数据.md` |
| [1762470](https://www.52pojie.cn/thread-1762470-1-1.html) | 搭建属于自己的某多多视频解析接口 | `52pojie-1762470-搭建属于自己的某多多视频解析接口.md` |
| [1706864](https://www.52pojie.cn/thread-1706864-1-1.html) | js逆向某视频VIP | `52pojie-1706864-js逆向某视频VIP.md` |

### 验证码 / 滑块（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1903141](https://www.52pojie.cn/thread-1903141-1-1.html) | 浅逆某里227滑块 | `52pojie-1903141-浅逆某里227滑块.md` |
| [1634219](https://www.52pojie.cn/thread-1634219-1-1.html) | pyppeteer过某里纯滑块【通用】 | `52pojie-1634219-pyppeteer过某里纯滑块【通用】.md` |

### AST / 解混淆（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1818486](https://www.52pojie.cn/thread-1818486-1-1.html) | 还原某里226控制流混淆的思路 | `52pojie-1818486-还原某里226控制流混淆的思路.md` |

### Wasm 逆向（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1837142](https://www.52pojie.cn/thread-1837142-1-1.html) | 某视频网站wasm简要分析 | `52pojie-1837142-某视频网站wasm简要分析.md` |

### 小程序 / 前端源码（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1774754](https://www.52pojie.cn/thread-1774754-1-1.html) | 微信小程序签名逆向分析 | `52pojie-1774754-微信小程序签名逆向分析.md` |

### JS 媒体资源 / 反爬对抗（3）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2035143](https://www.52pojie.cn/thread-2035143-1-1.html) | 某视频网站视频逆向（内容脱敏，学习思路） | `52pojie-2035143-某视频网站视频逆向（内容脱敏，学习思路）.md` |
| [1978507](https://www.52pojie.cn/thread-1978507-1-1.html) | 结合DrissionPage、OCR、OpenCV，实现WEB中canvas元素自动化 | `52pojie-1978507-结合DrissionPage、OCR、OpenCV，实现WEB中canvas元素自动化.md` |
| [953640](https://www.52pojie.cn/thread-953640-1-1.html) | 简单无头浏览器爬虫，与知网的相爱相杀 | `52pojie-953640-简单无头浏览器爬虫，与知网的相爱相杀.md` |

### 本轮剔除（抓正文复核后入 `BLOCK_EXTRA10`，共 7 篇，已删除文件）

`2115425`（基于文本匹配的 VMP 还原思路 —— ARM64 dispatcher/handler，native）、
`1398682`（易语言某团模块的逆向和分析 —— OD 逆向 `Game-EC.fne` 支持库 DLL）、
`2123217`（快手 VMP 分析与还原 —— `__NS_xfalcon`，移动安全区 arm64 native）、
`2078117`（某应用 AntiToken 算法分析 —— pdd apk + unidbg 补环境，移动安全区）、
`1648818`（某度某吧私信 websocket —— jadx 反编译 app + 模拟器，移动安全区）、
`1871048`（手磋汇编解密某视频软件 —— 本地视频加密软件，OD 汇编）、
`1798155`（Mac pycharm execjs 报错 —— 环境配置，无逆向内容）。

### 本轮空正文（9 条，其中 7 条为历轮长期空帖）

长期空帖：`1994034`、`1985832`、`1831357`、`1757443`、`1756698`、`1528155`、`1205982`。
另 `1867851`（抖音直播匿名采集）、`1778315`（链家房源爬虫）本轮再次确认为空。

### 本轮的新坑（WAF 从文字验证码换成了滑块）

`content` / `Thread` / `search` 全部**静默返回空**（不报错），浏览器标签页访问任意帖子会被 302 到
`https://www.52pojie.cn/waf_slider_verify.html`（**网宿 WZWS WAF**，文案「请完成安全验证! … 向右滑动填充拼图」）。
该滑块页内联脚本做了反调试（CDP `eval` / `content` / `screenshot` 会 30s 超时），**不要去解滑块**：

```bash
# 恢复方式（实测立即生效）：
hubcli browser tabs                                   # 找到 52pojie 标签页 id
hubcli browser navigate --tab_id <id> --url "https://www.52pojie.cn/"
hubcli 52pojie Thread --page 1 --json                 # 随即恢复
```

## 十二、补充归档（十）（22 篇，2026-09-21 第十一轮：「视频/m3u8/直播源 × 解密」与「平台+登录/接口」两个新组合命中存量老帖 + 审计 C 表逐条补回）

### 本轮做了什么

- **Thread**：逐页拉到第 6 页（790 条，第 7 页空）。新帖 6 条**全为资源/求助帖，web 逆向 0 条**
  —— 第 3~11 轮同一结论：Thread 列表已无逆向增量。
- **关键词 73 个**（七维：隐称第三批 / 「平台+登录/接口」式无算法词 / 爬虫·采集·抓包 × 加密·签名·参数 /
  **视频·m3u8·直播 × 解密** / 加密入口·定位·断点 / 密钥·算法二批 / 验证码三批），
  其中 **35 个为真实零结果**，0 失败（1 个 FAILED 复跑后得 1 条）。
  全量池 7159 → **7453**（唯一 ID），未归档 7019。
- **审计七表**：A 表新增 **12 条**（历轮 A 表首次出现增量）；B 表 64 / C 表 222 / D 表 39 / G 表 85，
  复核后**无需改判**（G 表唯一可疑项 `2124408` 经正文复核确为 `libmsec.so` native 风控 SDK，维持拉黑）。
- **本轮最大收获＝两个新组合词生效**（第十轮留下的待验证项）：
  1. **视频 / m3u8 / 直播源 × 解密** → 一次捞回 **9 篇**（`2112556` 央视 h5e、`1617087` 某浪 m3u8、
     `1162942` widevine、`957638` 斗鱼直播源 …），这类标题**几乎不含任何 STRONG token**。
  2. **「平台 + 登录/接口」式无算法词** → 补回 `1108756` 青果教务登录接口、`1626143` 某招标 X-Sign 等。
- **抓取**：待抓 31 → 写入 **22 篇**，空正文 **5 条**（历轮长期空帖），
  **权限受限 4 条**（新增记账口径，见下），0 失败。

> **坑 23（本轮新增）**：`content` 对受限帖返回 `RPC API Error [Code -1]: 抱歉，本帖要求阅读权限高于 N`。
> 这与「空正文」「反爬页」是**三类不同状态**，必须分开记账：
> 受限帖**不是**非目标、也**不该**反复重试。本轮 4 条：`1653467`(>20) `1605281`(>20)
> `1867851`(>40) `1778315`(>20)；另有 `1985832`(>30) `1831357`(>20) 被历轮误记为「长期空帖」，
> **本轮更正为权限受限** —— 长期空帖清单由 7 条收敛为 5 条。

### 空正文 / 权限受限清单（本轮）

| 状态 | 帖子 ID |
| --- | --- |
| 长期空正文（5） | `1994034` `1757443` `1756698` `1528155` `1205982` |
| 权限受限（6） | `1653467` `1605281` `1867851` `1778315` `1985832` `1831357` |

> 边际判断：73 个关键词只换来 0 篇新帖（Thread 新帖无逆向），但**两个新组合词命中 14 篇存量老帖**，
> 说明「词形组合」仍是唯一有效的召回手段；下一轮预算应继续给**未试过的组合词**（而非站点名）。

### 视频 / m3u8 / 直播源解密（9）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2112556](https://www.52pojie.cn/thread-2112556-1-1.html) | 央视 h5e 视频解密脚本 | `52pojie-2112556-央视 h5e 视频解密脚本.md` |
| [2052533](https://www.52pojie.cn/thread-2052533-1-1.html) | Web视频解析接口解密 | `52pojie-2052533-Web视频解析接口解密.md` |
| [1664368](https://www.52pojie.cn/thread-1664368-1-1.html) | 某hukem3u8解密简单分析 | `52pojie-1664368-某hukem3u8解密简单分析.md` |
| [1655529](https://www.52pojie.cn/thread-1655529-1-1.html) | 某培训中心介绍页视频解密 | `52pojie-1655529-某培训中心介绍页视频解密.md` |
| [1617087](https://www.52pojie.cn/thread-1617087-1-1.html) | 某浪m3u8解密简单分析 | `52pojie-1617087-某浪m3u8解密简单分析.md` |
| [1616797](https://www.52pojie.cn/thread-1616797-1-1.html) | 爬虫之巧用BurpSuite获取m3u8视频真实mp4地址 | `52pojie-1616797-爬虫之巧用BurpSuite获取m3u8视频真实mp4地址.md` |
| [1258605](https://www.52pojie.cn/thread-1258605-1-1.html) | 【记录】某网站js逆向与m3u8解密 | `52pojie-1258605-【记录】某网站js逆向与m3u8解密.md` |
| [1162942](https://www.52pojie.cn/thread-1162942-1-1.html) | HTML5视频解密的方法（widevine的破解思路） | `52pojie-1162942-HTML5视频解密的方法（widevine的破解思路）.md` |
| [957638](https://www.52pojie.cn/thread-957638-1-1.html) | 【直播源综合教程】斗鱼直播真实地址解析，直播源抓取方法，自抓直播源分享长期有效 | `52pojie-957638-【直播源综合教程】斗鱼直播真实地址解析，直播源抓取方法，自抓直播源分享长期有效.md` |

### 验证码 / 滑块逆向（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1591712](https://www.52pojie.cn/thread-1591712-1-1.html) | 某音网页版弹窗验证码自动验证 | `52pojie-1591712-某音网页版弹窗验证码自动验证.md` |

### 接口 / 协议 / 小程序 / 抓包（5）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1719655](https://www.52pojie.cn/thread-1719655-1-1.html) | 酷狗音乐网页歌曲爬取优化 | `52pojie-1719655-酷狗音乐网页歌曲爬取优化.md` |
| [1709344](https://www.52pojie.cn/thread-1709344-1-1.html) | PCVX小程序抓包分析 | `52pojie-1709344-PCVX小程序抓包分析.md` |
| [1511380](https://www.52pojie.cn/thread-1511380-1-1.html) | CSDN爬虫signature加密算法破解 | `52pojie-1511380-CSDN爬虫signature加密算法破解.md` |
| [1297824](https://www.52pojie.cn/thread-1297824-1-1.html) | 小米商城 红米K30S 米金兑换抓包 提交兑换资格 | `52pojie-1297824-小米商城 红米K30S 米金兑换抓包 提交兑换资格.md` |
| [1108756](https://www.52pojie.cn/thread-1108756-1-1.html) | 逆向分析青果教务系统的登录接口 | `52pojie-1108756-逆向分析青果教务系统的登录接口.md` |

### 签名 / 登录 / 加密参数定位（6）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1732525](https://www.52pojie.cn/thread-1732525-1-1.html) | 记数据加密学习笔记之举一反三 | `52pojie-1732525-记数据加密学习笔记之举一反三.md` |
| [1626143](https://www.52pojie.cn/thread-1626143-1-1.html) | 【JS逆向学习实践】某招标网站登录X-Sign逆向 | `52pojie-1626143-【JS逆向学习实践】某招标网站登录X-Sign逆向.md` |
| [951623](https://www.52pojie.cn/thread-951623-1-1.html) | 利用python破解js加密模拟登录猎X网 | `52pojie-951623-利用python破解js加密模拟登录猎X网.md` |
| [838247](https://www.52pojie.cn/thread-838247-1-1.html) | python 3 实现js中JSEncrypt encrypt方法，rsa模块根据字符串公钥生成加密字符串 | `52pojie-838247-python 3 实现js中JSEncrypt encrypt方法，rsa模块根据字符串公钥生成加密字符串.md` |
| [536217](https://www.52pojie.cn/thread-536217-1-1.html) | 简单分析下吾爱POST登录MD5密码加密找法 | `52pojie-536217-简单分析下吾爱POST登录MD5密码加密找法.md` |
| [170898](https://www.52pojie.cn/thread-170898-1-1.html) | 网页base64_md5加密如何计算的， | `52pojie-170898-网页base64_md5加密如何计算的，.md` |

### 逆向调试 / 学习笔记（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1484444](https://www.52pojie.cn/thread-1484444-1-1.html) | js 逆向调试初学笔记 | `52pojie-1484444-js 逆向调试初学笔记.md` |

## 十三、补充归档（十一）（110 篇，2026-09-21 第十二轮：`hubcli search` GBK 字符集失效修复 → 浏览器驱动搜索 + 全量分页，B 批高价值历史词复扫命中整批被 `limit 40` 截断的老帖）

**本轮数据来源**
- **Thread 逐页到空**：8 页 891 条，较第十一轮新增 104 条，**web 逆向 0 条**（第 3~12 轮同一结论，新增全是求助/资源帖）。
- **关键词扫描改为「浏览器驱动」**（本轮最大变化）：A 批 56 个新词（音频/音乐·字体·hls/flv·播放器·订单支付·电商长尾·隐称三批·小程序接口·请求令牌加密）
  + B 批 30 个高价值历史词**全量分页复扫**，共 86 个词、16 个真实零结果；全量池 7453 → **9661**（唯一 ID）。
- **筛选**：沿用第十一轮口径（`filter_candidates11.keep11`）+ 本轮 `ALLOW_EXTRA12`（24 条 A/B/C/E 表补漏真阳性）
  + `BLOCK_EXTRA12`（57 条人工黑名单）+ `EMPTY_IDS` 常量（6 条长期空帖，第十轮待办落地）。
- **抓取**：候选 642 → 未归档 36 → 分两批抓取，**写入 110 篇**（空正文 3、权限受限 8、复核剔除 2、失败 0）。
- **复核剔除**：`829103` PHPwebsocket 协议分析（服务端 PHP 实现，非 web 逆向）、`1363105` PC 微信小程序反编译（正文仅一个附件，无实质内容）。
- **副作用修复**：`1477462` 该帖正文在源头即为 UTF-8→cp1256 双重编码乱码，已按行 `cp1256 → UTF-8` 还原为正常中文。

**本轮四个新发现（均已写入 skill `forum-corpus-archival`）**
1. **坑 27（最严重，直接导致前几轮「假零」）**：`hubcli 52pojie search --keyword <中文>` **恒定返回 `[]`**。
   原因：hubcli 把关键词按 **UTF-8** 百分号编码提交，而 52pojie 是 **GBK** 站点，服务端按 GBK 解码 → 关键词变乱码
   （实测 `滑块` 被解成 `婊戝潡` → 「相关内容 0 个」）。
   **修复**＝绕开 `search` 命令，用 `browser navigate` 打开
   `search.php?mod=forum&srchtxt=<GBK 百分号编码>&searchsubmit=yes`，一次即恢复（`滑块` → 141 条）。
2. **坑 28**：本仓库 shell 宿主是 cmd.exe，`subprocess.run(..., shell=True)` 会把 URL 里的 `&` 当命令分隔符，
   把 navigate 的 URL 截断成 `search.php?mod=forum`。hubcli 是 `.EXE` → **必须 `shell=False` 传参数组**。
3. **坑 29**：**不能**用 `waf_slider_verify` 之类的字符串直接判 WAF —— 正常搜索结果页尾部 `<script>` 里就引用了
   `waf_*_verify.html`，会把每一页都误判成 WAF 而中止扫描。正确判据＝**页面没有 `相关内容` 标记** 且命中 WAF 文案。
4. **能力升级（比坑 14「细粒度组合词」更彻底）**：搜索结果页**自带 `searchid` 分页**（`共 N 页`，每页 50 条），
   单关键词最多可拿 ~200 条，而 `search --limit 40` 只能拿前 40 条。B 批用 30 个高价值历史词复扫即命中 **2561 条**
   （`滑块`141 / `验证码`200 / `ast`200 / `js逆向`200 / `加密算法`128 / `某音`200 / `某东`110 / `某宝`200 / `抓包`200 / `爬虫`200 / `逆向`200 …）。
   **本轮 110 篇新增里 88 篇（80%）来自这批「被 `limit 40` 截断的存量老帖」**，仅 3 篇来自审计白名单、其余来自 A 批新词 —— 说明
   「关键词还能捞什么」已不是问题，**真正的瓶颈一直是工具层截断**。

**空正文（3 条，长期稳定）**：`1872959` 记一次简单破解-网站引流验证码 / `1859859` 引流公众号验证码 / `1525939` [POST+JS逆向]2.猿人学JS逆向大赛第一题。
**权限受限（8 条，不是非目标，权限升级后可复捞）**：`1638202`(>80) `1467610`(>80) `1867851`(>40) `1985832`(>30)
`1831357` `1778315` `1655123` `1587768`（均 >20）。

### 视频 / m3u8 / 直播源解密（8）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2052017](https://www.52pojie.cn/thread-2052017-1-1.html) | cctv视频下载解密 | `52pojie-2052017-cctv视频下载解密.md` |
| [2030526](https://www.52pojie.cn/thread-2030526-1-1.html) | 【js逆向】爱xx视频逆向分析 | `52pojie-2030526-【js逆向】爱xx视频逆向分析.md` |
| [2021915](https://www.52pojie.cn/thread-2021915-1-1.html) | 【js逆向】虾m视频真实地址 | `52pojie-2021915-【js逆向】虾m视频真实地址.md` |
| [1602878](https://www.52pojie.cn/thread-1602878-1-1.html) | 某牙直播flv地址解密 | `52pojie-1602878-某牙直播flv地址解密.md` |
| [1549711](https://www.52pojie.cn/thread-1549711-1-1.html) | xx艺视频wasm转js分析，cmd5x算法脱离环境限制 | `52pojie-1549711-xx艺视频wasm转js分析，cmd5x算法脱离环境限制.md` |
| [1535897](https://www.52pojie.cn/thread-1535897-1-1.html) | 某网站视频加密的wasm略谈（二） | `52pojie-1535897-某网站视频加密的wasm略谈（二）.md` |
| [971265](https://www.52pojie.cn/thread-971265-1-1.html) | 解密m3u8文件, ts文件解密, hls 解密 | `52pojie-971265-解密m3u8文件, ts文件解密, hls 解密.md` |
| [864112](https://www.52pojie.cn/thread-864112-1-1.html) | 【Fiddler为所欲为第四篇】直播源抓取与接口分析 | `52pojie-864112-【Fiddler为所欲为第四篇】直播源抓取与接口分析.md` |

### 靶场练习 / wasm 逆向（17）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2100547](https://www.52pojie.cn/thread-2100547-1-1.html) | 猿人学第三题逆向分析 | `52pojie-2100547-猿人学第三题逆向分析.md` |
| [2062825](https://www.52pojie.cn/thread-2062825-1-1.html) | 码上爬 8~13关js逆向代码 | `52pojie-2062825-码上爬 8~13关js逆向代码.md` |
| [2060789](https://www.52pojie.cn/thread-2060789-1-1.html) | 码上爬 1~7关js逆向代码 | `52pojie-2060789-码上爬 1~7关js逆向代码.md` |
| [2054126](https://www.52pojie.cn/thread-2054126-1-1.html) | 【js逆向】码上爬 题七：千山鸟飞绝 | `52pojie-2054126-【js逆向】码上爬 题七：千山鸟飞绝.md` |
| [2044904](https://www.52pojie.cn/thread-2044904-1-1.html) | [原创] 崔大Scrape十四题, 入门级wasm加密分析 | `52pojie-2044904-[原创] 崔大Scrape十四题, 入门级wasm加密分析.md` |
| [2044873](https://www.52pojie.cn/thread-2044873-1-1.html) | 码上爬-题四-JS逆向入门（首次发帖，请多关照，谢谢） | `52pojie-2044873-码上爬-题四-JS逆向入门（首次发帖，请多关照，谢谢）.md` |
| [2043995](https://www.52pojie.cn/thread-2043995-1-1.html) | 猿人学二十题 js 逆向分析 | `52pojie-2043995-猿人学二十题 js 逆向分析.md` |
| [2039700](https://www.52pojie.cn/thread-2039700-1-1.html) | [原创] 猿人学学员题34题 js加课例题1 逆向分析 | `52pojie-2039700-[原创] 猿人学学员题34题 js加课例题1 逆向分析.md` |
| [2038595](https://www.52pojie.cn/thread-2038595-1-1.html) | [原创] 猿人学 学员14题 js_fuck 逆向分析 | `52pojie-2038595-[原创] 猿人学 学员14题 js_fuck 逆向分析.md` |
| [2037819](https://www.52pojie.cn/thread-2037819-1-1.html) | [原创]Scrape spa14 wasm加密过程分析 | `52pojie-2037819-[原创]Scrape spa14 wasm加密过程分析.md` |
| [2037096](https://www.52pojie.cn/thread-2037096-1-1.html) | [原创] 猿人学Web爬虫攻防第一题 js 混淆 - 源码乱码 | `52pojie-2037096-[原创] 猿人学Web爬虫攻防第一题 js 混淆 - 源码乱码.md` |
| [1862975](https://www.52pojie.cn/thread-1862975-1-1.html) | 绕过 AGE 动漫的 wasm 加密与解密函数 | `52pojie-1862975-绕过 AGE 动漫的 wasm 加密与解密函数.md` |
| [1836908](https://www.52pojie.cn/thread-1836908-1-1.html) | 某网站wasm md5简单分析 | `52pojie-1836908-某网站wasm md5简单分析.md` |
| [1581887](https://www.52pojie.cn/thread-1581887-1-1.html) | wasm转c调用实战 | `52pojie-1581887-wasm转c调用实战.md` |
| [1556027](https://www.52pojie.cn/thread-1556027-1-1.html) | wasm转c调用与封装至dll案例 | `52pojie-1556027-wasm转c调用与封装至dll案例.md` |
| [1461335](https://www.52pojie.cn/thread-1461335-1-1.html) | 某网站字幕加密的wasm分析 | `52pojie-1461335-某网站字幕加密的wasm分析.md` |
| [1330472](https://www.52pojie.cn/thread-1330472-1-1.html) | 【使用Hook技术让JS逆向少掉几根头发】 猿人学爬虫攻防赛 第五题详解 | `52pojie-1330472-【使用Hook技术让JS逆向少掉几根头发】 猿人学爬虫攻防赛 第五题详解.md` |

### 验证码 / 滑块逆向（19）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2057170](https://www.52pojie.cn/thread-2057170-1-1.html) | 逆向过云片滑动验证码 | `52pojie-2057170-逆向过云片滑动验证码.md` |
| [2054474](https://www.52pojie.cn/thread-2054474-1-1.html) | 丰巢过注册验证码 | `52pojie-2054474-丰巢过注册验证码.md` |
| [2052600](https://www.52pojie.cn/thread-2052600-1-1.html) | 某初滑块逆向分析 | `52pojie-2052600-某初滑块逆向分析.md` |
| [2042898](https://www.52pojie.cn/thread-2042898-1-1.html) | 某天御滑块逆向分析 | `52pojie-2042898-某天御滑块逆向分析.md` |
| [1995970](https://www.52pojie.cn/thread-1995970-1-1.html) | 雷池WAF滑块版本逆向分析 | `52pojie-1995970-雷池WAF滑块版本逆向分析.md` |
| [1985041](https://www.52pojie.cn/thread-1985041-1-1.html) | 【JS逆向】某滑块逆向分析 | `52pojie-1985041-【JS逆向】某滑块逆向分析.md` |
| [1973043](https://www.52pojie.cn/thread-1973043-1-1.html) | 页面验证码自动填写思路 - ddddocr 油猴+XMLHttpRequest拦截自动填写 | `52pojie-1973043-页面验证码自动填写思路 - ddddocr 油猴+XMLHttpRequest拦截自动填写.md` |
| [1915737](https://www.52pojie.cn/thread-1915737-1-1.html) | 某pt站点验证码签到分析 | `52pojie-1915737-某pt站点验证码签到分析.md` |
| [1881668](https://www.52pojie.cn/thread-1881668-1-1.html) | 异型滑块算法解决思路 | `52pojie-1881668-异型滑块算法解决思路.md` |
| [1820088](https://www.52pojie.cn/thread-1820088-1-1.html) | 九卦阵验证码通过流程 | `52pojie-1820088-九卦阵验证码通过流程.md` |
| [1815916](https://www.52pojie.cn/thread-1815916-1-1.html) | 随手记录一个2分钟破解文章验证码 | `52pojie-1815916-随手记录一个2分钟破解文章验证码.md` |
| [1807876](https://www.52pojie.cn/thread-1807876-1-1.html) | 一个菜菜菜菜鸡看了菜菜菜鸡的帖子对关注公众号回复密码获取验证码的分析 | `52pojie-1807876-一个菜菜菜菜鸡看了菜菜菜鸡的帖子对关注公众号回复密码获取验证码的分析.md` |
| [1807169](https://www.52pojie.cn/thread-1807169-1-1.html) | 记一个菜菜菜鸡看了菜菜鸡的帖子对关注公众号回复密码获取验证码的分析 | `52pojie-1807169-记一个菜菜菜鸡看了菜菜鸡的帖子对关注公众号回复密码获取验证码的分析.md` |
| [1804662](https://www.52pojie.cn/thread-1804662-1-1.html) | 一个菜菜鸡看了菜鸡的帖子对关注公众号回复密码获取验证码的分析 | `52pojie-1804662-一个菜菜鸡看了菜鸡的帖子对关注公众号回复密码获取验证码的分析.md` |
| [1796423](https://www.52pojie.cn/thread-1796423-1-1.html) | 某居客滑块逆向分析 | `52pojie-1796423-某居客滑块逆向分析.md` |
| [1697353](https://www.52pojie.cn/thread-1697353-1-1.html) | 快手滑块—逆向分析（web） | `52pojie-1697353-快手滑块—逆向分析（web）.md` |
| [1647615](https://www.52pojie.cn/thread-1647615-1-1.html) | 某电商滑块js分析 | `52pojie-1647615-某电商滑块js分析.md` |
| [1482838](https://www.52pojie.cn/thread-1482838-1-1.html) | 使用像素对比来完成Selenium滑块验证码的登录 | `52pojie-1482838-使用像素对比来完成Selenium滑块验证码的登录.md` |
| [1477462](https://www.52pojie.cn/thread-1477462-1-1.html) | 某壁纸网站js逆向，涉及ob混淆，滑块 | `52pojie-1477462-某壁纸网站js逆向，涉及ob混淆，滑块.md` |

### 接口 / 协议 / 小程序 / 抓包（8）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2022349](https://www.52pojie.cn/thread-2022349-1-1.html) | 批量爬取音乐数据 - js逆向 | `52pojie-2022349-批量爬取音乐数据 - js逆向.md` |
| [1934003](https://www.52pojie.cn/thread-1934003-1-1.html) | 某壁纸小程序sign逆向分析 | `52pojie-1934003-某壁纸小程序sign逆向分析.md` |
| [1602777](https://www.52pojie.cn/thread-1602777-1-1.html) | Python实例记录----CSS位置偏移反爬案例与爬取实战 | `52pojie-1602777-Python实例记录----CSS位置偏移反爬案例与爬取实战.md` |
| [1446387](https://www.52pojie.cn/thread-1446387-1-1.html) | 【js逆向】Qfang网的解析与爬取 | `52pojie-1446387-【js逆向】Qfang网的解析与爬取.md` |
| [1214662](https://www.52pojie.cn/thread-1214662-1-1.html) | python 逆向某咖啡小程序接口 | `52pojie-1214662-python 逆向某咖啡小程序接口.md` |
| [1157426](https://www.52pojie.cn/thread-1157426-1-1.html) | 一些自己想出来的很皮的反爬技巧 | `52pojie-1157426-一些自己想出来的很皮的反爬技巧.md` |
| [1028214](https://www.52pojie.cn/thread-1028214-1-1.html) | Python攻破淘宝网各类反爬手段，采集淘宝网ZDB（女用）的销量！ | `52pojie-1028214-Python攻破淘宝网各类反爬手段，采集淘宝网ZDB（女用）的销量！.md` |
| [794828](https://www.52pojie.cn/thread-794828-1-1.html) | XX网课协议分析报告 | `52pojie-794828-XX网课协议分析报告.md` |

### 签名 / 登录 / 加密参数定位（27）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2106690](https://www.52pojie.cn/thread-2106690-1-1.html) | 某龙酒店网站请求头参数user-dun逆向分析 | `52pojie-2106690-某龙酒店网站请求头参数user-dun逆向分析.md` |
| [2038005](https://www.52pojie.cn/thread-2038005-1-1.html) | [原创] 网洛者 AAEncode加密 - 初体验 逆向分析 | `52pojie-2038005-[原创] 网洛者 AAEncode加密 - 初体验 逆向分析.md` |
| [2037870](https://www.52pojie.cn/thread-2037870-1-1.html) | [原创] 网洛者 JJEncode加密 - 初体验 逆向分析 | `52pojie-2037870-[原创] 网洛者 JJEncode加密 - 初体验 逆向分析.md` |
| [2022463](https://www.52pojie.cn/thread-2022463-1-1.html) | 某q音乐sign逆向-多角度 | `52pojie-2022463-某q音乐sign逆向-多角度.md` |
| [2019537](https://www.52pojie.cn/thread-2019537-1-1.html) | 【js逆向】某云模拟登录 | `52pojie-2019537-【js逆向】某云模拟登录.md` |
| [2002575](https://www.52pojie.cn/thread-2002575-1-1.html) | 某某音乐馆sign逆向------------小白讲解06 | `52pojie-2002575-某某音乐馆sign逆向------------小白讲解06.md` |
| [1987108](https://www.52pojie.cn/thread-1987108-1-1.html) | 超星网页字体解密 | `52pojie-1987108-超星网页字体解密.md` |
| [1910709](https://www.52pojie.cn/thread-1910709-1-1.html) | 某音乐站混淆加密分析 | `52pojie-1910709-某音乐站混淆加密分析.md` |
| [1897565](https://www.52pojie.cn/thread-1897565-1-1.html) | 某度翻译的sign逆向 | `52pojie-1897565-某度翻译的sign逆向.md` |
| [1853640](https://www.52pojie.cn/thread-1853640-1-1.html) | 记一次海拍客母婴平台sign逆向js分析 | `52pojie-1853640-记一次海拍客母婴平台sign逆向js分析.md` |
| [1793208](https://www.52pojie.cn/thread-1793208-1-1.html) | 【js逆向】某习通座位预约加密分析（新手向） | `52pojie-1793208-【js逆向】某习通座位预约加密分析（新手向）.md` |
| [1779380](https://www.52pojie.cn/thread-1779380-1-1.html) | 某某盘搜加密混淆速通 | `52pojie-1779380-某某盘搜加密混淆速通.md` |
| [1778995](https://www.52pojie.cn/thread-1778995-1-1.html) | nodjs某宝登录 | `52pojie-1778995-nodjs某宝登录.md` |
| [1752497](https://www.52pojie.cn/thread-1752497-1-1.html) | 某音平台某浪新版key解密 play_licenses | `52pojie-1752497-某音平台某浪新版key解密 play_licenses.md` |
| [1723994](https://www.52pojie.cn/thread-1723994-1-1.html) | 【JS逆向】某习通登录密码逆向 | `52pojie-1723994-【JS逆向】某习通登录密码逆向.md` |
| [1678353](https://www.52pojie.cn/thread-1678353-1-1.html) | 【JS逆向解密】多个小说网站资源下载脚本 | `52pojie-1678353-【JS逆向解密】多个小说网站资源下载脚本.md` |
| [1627920](https://www.52pojie.cn/thread-1627920-1-1.html) | 【JS逆向学习实践】某翼云盘登录从头分析（一） | `52pojie-1627920-【JS逆向学习实践】某翼云盘登录从头分析（一）.md` |
| [1480963](https://www.52pojie.cn/thread-1480963-1-1.html) | JS逆向之某道translate解密 | `52pojie-1480963-JS逆向之某道translate解密.md` |
| [1480158](https://www.52pojie.cn/thread-1480158-1-1.html) | JS逆向之对称加密算法初体验 | `52pojie-1480158-JS逆向之对称加密算法初体验.md` |
| [1479508](https://www.52pojie.cn/thread-1479508-1-1.html) | JS逆向之EVAL加密初體驗 | `52pojie-1479508-JS逆向之EVAL加密初體驗.md` |
| [1478472](https://www.52pojie.cn/thread-1478472-1-1.html) | JS逆向之MD5闭包 | `52pojie-1478472-JS逆向之MD5闭包.md` |
| [1475463](https://www.52pojie.cn/thread-1475463-1-1.html) | JS逆向之RSA初体验 | `52pojie-1475463-JS逆向之RSA初体验.md` |
| [1474736](https://www.52pojie.cn/thread-1474736-1-1.html) | JS逆向之MD5初体验 | `52pojie-1474736-JS逆向之MD5初体验.md` |
| [1468829](https://www.52pojie.cn/thread-1468829-1-1.html) | 对某网站进行JS逆向AES实战 | `52pojie-1468829-对某网站进行JS逆向AES实战.md` |
| [1421183](https://www.52pojie.cn/thread-1421183-1-1.html) | 解析某网络教学平台登录时的明文加密方法并使用python实现代码复现 | `52pojie-1421183-解析某网络教学平台登录时的明文加密方法并使用python实现代码复现.md` |
| [1410357](https://www.52pojie.cn/thread-1410357-1-1.html) | 某音web端signature nodejs版本 不依赖浏览器 | `52pojie-1410357-某音web端signature nodejs版本 不依赖浏览器.md` |
| [1131554](https://www.52pojie.cn/thread-1131554-1-1.html) | JS逆向 某某街 某乐网 加密算法分析 | `52pojie-1131554-JS逆向 某某街 某乐网 加密算法分析.md` |

### 逆向调试 / 学习笔记（29）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2053165](https://www.52pojie.cn/thread-2053165-1-1.html) | 【js逆向】图书馆挠痒大作战 | `52pojie-2053165-【js逆向】图书馆挠痒大作战.md` |
| [2047992](https://www.52pojie.cn/thread-2047992-1-1.html) | “一款优秀的网页表格控件的逆向分析”-探讨完全AI编程实现逆向分析的可能性和价值 | `52pojie-2047992-“一款优秀的网页表格控件的逆向分析”-探讨完全AI编程实现逆向分析的可能性和价值.md` |
| [2034020](https://www.52pojie.cn/thread-2034020-1-1.html) | 某data网逆向和解混淆 | `52pojie-2034020-某data网逆向和解混淆.md` |
| [2013056](https://www.52pojie.cn/thread-2013056-1-1.html) | 【JS逆向】某漫画网站图片还原逆向 | `52pojie-2013056-【JS逆向】某漫画网站图片还原逆向.md` |
| [2011345](https://www.52pojie.cn/thread-2011345-1-1.html) | 【JS逆向】某土地市场网逆向分析 | `52pojie-2011345-【JS逆向】某土地市场网逆向分析.md` |
| [2002450](https://www.52pojie.cn/thread-2002450-1-1.html) | 记录一次某标准规范网的逆向分析 | `52pojie-2002450-记录一次某标准规范网的逆向分析.md` |
| [1989050](https://www.52pojie.cn/thread-1989050-1-1.html) | 【JS逆向】某招标公告逆向分析 | `52pojie-1989050-【JS逆向】某招标公告逆向分析.md` |
| [1984864](https://www.52pojie.cn/thread-1984864-1-1.html) | 某某漫画平台逆向分析 | `52pojie-1984864-某某漫画平台逆向分析.md` |
| [1983279](https://www.52pojie.cn/thread-1983279-1-1.html) | 【JS逆向】某某经营网jsl逆向分析 | `52pojie-1983279-【JS逆向】某某经营网jsl逆向分析.md` |
| [1959760](https://www.52pojie.cn/thread-1959760-1-1.html) | 某浏览器插件的逆向分析 一、 | `52pojie-1959760-某浏览器插件的逆向分析 一、.md` |
| [1905370](https://www.52pojie.cn/thread-1905370-1-1.html) | 某音乐网站反调试分析 | `52pojie-1905370-某音乐网站反调试分析.md` |
| [1898677](https://www.52pojie.cn/thread-1898677-1-1.html) | 某动云盘分享得云朵逆向分析 | `52pojie-1898677-某动云盘分享得云朵逆向分析.md` |
| [1892812](https://www.52pojie.cn/thread-1892812-1-1.html) | 某次网站的js逆向 | `52pojie-1892812-某次网站的js逆向.md` |
| [1820587](https://www.52pojie.cn/thread-1820587-1-1.html) | 【js逆向】某网课平台前端限制破除思路分析 | `52pojie-1820587-【js逆向】某网课平台前端限制破除思路分析.md` |
| [1740057](https://www.52pojie.cn/thread-1740057-1-1.html) | 什么？！某度营销数据js逆向只用5行代码？ | `52pojie-1740057-什么？！某度营销数据js逆向只用5行代码？.md` |
| [1722677](https://www.52pojie.cn/thread-1722677-1-1.html) | 221024【js逆向百例】PM2.5动态混淆代码调试060 | `52pojie-1722677-221024【js逆向百例】PM2.5动态混淆代码调试060.md` |
| [1692629](https://www.52pojie.cn/thread-1692629-1-1.html) | 小姐姐网站 (美之图) js逆向 | `52pojie-1692629-小姐姐网站 (美之图) js逆向.md` |
| [1657066](https://www.52pojie.cn/thread-1657066-1-1.html) | PJ一个小游戏（js逆向） | `52pojie-1657066-PJ一个小游戏（js逆向）.md` |
| [1654799](https://www.52pojie.cn/thread-1654799-1-1.html) | 【JS逆向系列】某服务器平台sm系列算法分析 | `52pojie-1654799-【JS逆向系列】某服务器平台sm系列算法分析.md` |
| [1629907](https://www.52pojie.cn/thread-1629907-1-1.html) | 刚学js逆向解析，写了个有道翻译，发出来跟大佬们讨论学习下 | `52pojie-1629907-刚学js逆向解析，写了个有道翻译，发出来跟大佬们讨论学习下.md` |
| [1611798](https://www.52pojie.cn/thread-1611798-1-1.html) | 【JS逆向系列】某方数据获取，proto入门 | `52pojie-1611798-【JS逆向系列】某方数据获取，proto入门.md` |
| [1587398](https://www.52pojie.cn/thread-1587398-1-1.html) | 【JS逆向系列】某海关公示平台分析 | `52pojie-1587398-【JS逆向系列】某海关公示平台分析.md` |
| [1533169](https://www.52pojie.cn/thread-1533169-1-1.html) | 某图获取图片链接--JS逆向 | `52pojie-1533169-某图获取图片链接--JS逆向.md` |
| [1391511](https://www.52pojie.cn/thread-1391511-1-1.html) | 新人报道：澎湃新闻js逆向 | `52pojie-1391511-新人报道：澎湃新闻js逆向.md` |
| [1348220](https://www.52pojie.cn/thread-1348220-1-1.html) | [Js逆向]将逆向完的js打包成浏览器插件自动加载 | `52pojie-1348220-[Js逆向]将逆向完的js打包成浏览器插件自动加载.md` |
| [1310268](https://www.52pojie.cn/thread-1310268-1-1.html) | 嗨皮漫画JS逆向分析 | `52pojie-1310268-嗨皮漫画JS逆向分析.md` |
| [1299239](https://www.52pojie.cn/thread-1299239-1-1.html) | coco漫画js逆向分析下载漫画 | `52pojie-1299239-coco漫画js逆向分析下载漫画.md` |
| [1260612](https://www.52pojie.cn/thread-1260612-1-1.html) | 记一次签到网站js逆向与python实现 | `52pojie-1260612-记一次签到网站js逆向与python实现.md` |
| [1222708](https://www.52pojie.cn/thread-1222708-1-1.html) | 【JS逆向】逆向某学英语网站老外开发的刷经验插件 | `52pojie-1222708-【JS逆向】逆向某学英语网站老外开发的刷经验插件.md` |

### 其他（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1552994](https://www.52pojie.cn/thread-1552994-1-1.html) | 某东金融 白条 H5天天提鹅js 执行脚本 | `52pojie-1552994-某东金融 白条 H5天天提鹅js 执行脚本.md` |
| [767803](https://www.52pojie.cn/thread-767803-1-1.html) | XX音乐解析大法好 php or JavaScript | `52pojie-767803-XX音乐解析大法好 php or JavaScript.md` |

## 十四、补充归档（十二）（37 篇，2026-09-22 第十三轮：历轮全部历史关键词「浏览器全量分页」复扫）

承接第十二轮结论：`hubcli 52pojie search --keyword <中文>` 因 GBK 字符集失效恒返回 `[]`（坑 27），
改由浏览器驱动搜索（GBK 百分号编码 + `searchid` 全量分页，单关键词最多 ~200 条）后，
对历轮累计 **586 个历史关键词**做全量复扫。本轮完成 **470 个**（按优先级：旧工具命中 ≥38、
必被 `--limit 40` 截断的词优先，再按旧命中数降序）；第 293→470 词区间候选池**零增长**，
说明高价值词已在前段覆盖完毕，尾部为长尾品牌词（多为真实零结果），遂收口。

本轮新增**全部来自审计 C/E 表补漏通道**（历轮被 `limit 40` 截断的存量老帖），
主题高度集中在 `视频/m3u8/直播源解密`（14）与 `登录/接口/签名/参数逆向`（14）两类。
本轮口径：`ALLOW_EXTRA13`（38 条 C/E 表真阳性）/ `BLOCK_EXTRA13`（50 条噪声：native 反调试·OD·IDA 22
+ 验证码识别工具 19 + 纯自动化过验证码/native 文件解密 8 + 第 12 轮已剔除 1）。


### 视频 / m3u8 / 直播源解密（14）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2061590](https://www.52pojie.cn/thread-2061590-1-1.html) | 原创抖音网页版直播源FLV格式真实直播流web源码 | `52pojie-2061590-原创抖音网页版直播源FLV格式真实直播流web源码.md` |
| [1888176](https://www.52pojie.cn/thread-1888176-1-1.html) | 某平台m3u8视频js获取解密key过程分析 | `52pojie-1888176-某平台m3u8视频js获取解密key过程分析.md` |
| [1833748](https://www.52pojie.cn/thread-1833748-1-1.html) | 某e通的m3u8文件解密 | `52pojie-1833748-某e通的m3u8文件解密.md` |
| [1749546](https://www.52pojie.cn/thread-1749546-1-1.html) | 中岩培训 某讯云 m3u8二次加密key分析 | `52pojie-1749546-中岩培训 某讯云 m3u8二次加密key分析.md` |
| [1734656](https://www.52pojie.cn/thread-1734656-1-1.html) | 破解某动漫m3u8加密 | `52pojie-1734656-破解某动漫m3u8加密.md` |
| [1689801](https://www.52pojie.cn/thread-1689801-1-1.html) | 某鹅通m3u8视频JS获取解密Key的过程分析 | `52pojie-1689801-某鹅通m3u8视频JS获取解密Key的过程分析.md` |
| [1688088](https://www.52pojie.cn/thread-1688088-1-1.html) | 修改hls.js增加播放某CTO视频的方法 | `52pojie-1688088-修改hls.js增加播放某CTO视频的方法.md` |
| [1679546](https://www.52pojie.cn/thread-1679546-1-1.html) | 可批量爬取某影视工厂 m3u8 文件 | `52pojie-1679546-可批量爬取某影视工厂 m3u8 文件.md` |
| [1635800](https://www.52pojie.cn/thread-1635800-1-1.html) | 某医学网站的加密M3U8分析 | `52pojie-1635800-某医学网站的加密M3U8分析.md` |
| [1624279](https://www.52pojie.cn/thread-1624279-1-1.html) | 逆向某个vip视频解析,获取m3u8播放源,纯技术分享、研究 | `52pojie-1624279-逆向某个vip视频解析,获取m3u8播放源,纯技术分享、研究.md` |
| [1495421](https://www.52pojie.cn/thread-1495421-1-1.html) | 以 aqistudy 为例的无限 debugger 反调试绕过演示（附视频） | `52pojie-1495421-以 aqistudy 为例的无限 debugger 反调试绕过演示（附视频）.md` |
| [1362235](https://www.52pojie.cn/thread-1362235-1-1.html) | 短视频去水印接口源码分析（今日头条第一弹） | `52pojie-1362235-短视频去水印接口源码分析（今日头条第一弹）.md` |
| [1122675](https://www.52pojie.cn/thread-1122675-1-1.html) | [web]分析调试某qiyi直播源【未完成】 | `52pojie-1122675-[web]分析调试某qiyi直播源【未完成】.md` |
| [1056116](https://www.52pojie.cn/thread-1056116-1-1.html) | 网易CC直播源抓取分析过程 | `52pojie-1056116-网易CC直播源抓取分析过程.md` |

### 接口 / 协议 / 小程序 / 抓包（14）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1980542](https://www.52pojie.cn/thread-1980542-1-1.html) | 某校WebVPN登录接口分析 | `52pojie-1980542-某校WebVPN登录接口分析.md` |
| [1975366](https://www.52pojie.cn/thread-1975366-1-1.html) | 记录某小程序做任务伪造微博发帖 | `52pojie-1975366-记录某小程序做任务伪造微博发帖.md` |
| [1881734](https://www.52pojie.cn/thread-1881734-1-1.html) | scrapy爬虫框架setting.py配置自定义应对服务器反爬策略 | `52pojie-1881734-scrapy爬虫框架setting.py配置自定义应对服务器反爬策略.md` |
| [1865269](https://www.52pojie.cn/thread-1865269-1-1.html) | 蓝奏云直链抓包教程（手慢无） | `52pojie-1865269-蓝奏云直链抓包教程（手慢无）.md` |
| [1769299](https://www.52pojie.cn/thread-1769299-1-1.html) | 反爬虫之有个操作也许可以检测aiohttp、httpx，requests也尴尬？ | `52pojie-1769299-反爬虫之有个操作也许可以检测aiohttp、httpx，requests也尴尬？.md` |
| [1513179](https://www.52pojie.cn/thread-1513179-1-1.html) | [原创][python爬虫] 利用多线程爬取漫画实例及简单反反爬 | `52pojie-1513179-[原创][python爬虫] 利用多线程爬取漫画实例及简单反反爬.md` |
| [1481688](https://www.52pojie.cn/thread-1481688-1-1.html) | 【自用工具】协议分析工具1.2，进制转换，protobuf反序列化 | `52pojie-1481688-【自用工具】协议分析工具1.2，进制转换，protobuf反序列化.md` |
| [1474990](https://www.52pojie.cn/thread-1474990-1-1.html) | python爬虫-最新破解百度翻译sign值 | `52pojie-1474990-python爬虫-最新破解百度翻译sign值.md` |
| [1341502](https://www.52pojie.cn/thread-1341502-1-1.html) | Python反反爬之访问逻辑---推心置腹 | `52pojie-1341502-Python反反爬之访问逻辑---推心置腹.md` |
| [1288511](https://www.52pojie.cn/thread-1288511-1-1.html) | Python高级编程之反爬虫及应对方案(可能是最全的应对方案) | `52pojie-1288511-Python高级编程之反爬虫及应对方案(可能是最全的应对方案).md` |
| [1217367](https://www.52pojie.cn/thread-1217367-1-1.html) | 强智科技教务系统python爬虫模拟登录分析(湖南) | `52pojie-1217367-强智科技教务系统python爬虫模拟登录分析(湖南).md` |
| [1143613](https://www.52pojie.cn/thread-1143613-1-1.html) | 逆向某网站的登录接口生成元素加密 | `52pojie-1143613-逆向某网站的登录接口生成元素加密.md` |
| [927649](https://www.52pojie.cn/thread-927649-1-1.html) | python反反爬基础 网页随机UA提交请求 | `52pojie-927649-python反反爬基础 网页随机UA提交请求.md` |
| [521674](https://www.52pojie.cn/thread-521674-1-1.html) | 【原创源码】用Python来实现一个简易的MP3播放器(采用酷我接口,包含接口分析) | `52pojie-521674-【原创源码】用Python来实现一个简易的MP3播放器(采用酷我接口,包含接口分析).md` |

### 签名 / 登录 / 加密参数定位（6）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2032824](https://www.52pojie.cn/thread-2032824-1-1.html) | 某投资网站登录密码逆向(适合小白新手) | `52pojie-2032824-某投资网站登录密码逆向(适合小白新手).md` |
| [1943363](https://www.52pojie.cn/thread-1943363-1-1.html) | WEB前端逆向获取EME解密密钥 | `52pojie-1943363-WEB前端逆向获取EME解密密钥.md` |
| [1815692](https://www.52pojie.cn/thread-1815692-1-1.html) | 某卢小说网站登录密码逆向 | `52pojie-1815692-某卢小说网站登录密码逆向.md` |
| [1574225](https://www.52pojie.cn/thread-1574225-1-1.html) | 某酷ckey签名生成算法系列--（五）调用js生成结果 | `52pojie-1574225-某酷ckey签名生成算法系列--（五）调用js生成结果.md` |
| [1536564](https://www.52pojie.cn/thread-1536564-1-1.html) | 继某音频网站加密方式更改 | `52pojie-1536564-继某音频网站加密方式更改.md` |
| [1271541](https://www.52pojie.cn/thread-1271541-1-1.html) | 02-网易云音乐加密分析 | `52pojie-1271541-02-网易云音乐加密分析.md` |

### 逆向调试 / 学习笔记（2）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1939114](https://www.52pojie.cn/thread-1939114-1-1.html) | WEB前端逆向反反调试一例 | `52pojie-1939114-WEB前端逆向反反调试一例.md` |
| [1855147](https://www.52pojie.cn/thread-1855147-1-1.html) | 使用burp bypass某站点反调试 | `52pojie-1855147-使用burp bypass某站点反调试.md` |

### 其他（1）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [1056860](https://www.52pojie.cn/thread-1056860-1-1.html) | [Javascript] 极限省字节（看懂混淆后的代码） | `52pojie-1056860-[Javascript] 极限省字节（看懂混淆后的代码）.md` |

---

## 十五、补充归档（十三）（39 篇，2026-09-22 第十五轮：**第十四轮 C/E 表 548 篇候选逐条抓正文复核**落地）

承接第十四轮：该轮只做到「审计粗筛出 548 篇 → 抓正文打分」，未复核未落盘。本轮**不投任何新关键词**，全部预算给存量候选的正文复核（`review15_scored.py` v2 口径：「核心逆向信号必须命中」+ 通用爬虫教程/工具/native 计负分），从 548 → 196 篇核心命中 → 逐条看正文定稿 **39 篇**（其余 92 篇入 `BLOCK_EXTRA15` 防下轮重复复核）。

**本轮数据来源**
- **Thread 逐页到空**：8 页 901 条（第 9 页空），较上轮新增 11 条，**web 逆向 0 条**（第 3~15 轮同一结论：新增全是求助/资源帖）。
- **关键词**：**0 个新词**（结论已明确：瓶颈不是词而是「存量候选的复核深度」）。
- **候选池**：pool_v14（17558）＋ thread15 新帖 → **17569**；口径候选 719（含本轮 ALLOW 39）。
- **落盘**：39 篇正文由 `materialize15.py` 从第十四轮已抓 `bodies/` 直落（省 39 次请求）；另跑 `fetch_save15.py` 复核 11 条历史待办 → 8 条权限受限、3 条空正文，**0 失败**。


### 签名 / 登录 / 参数加密 / 算法还原（17）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2065287](https://www.52pojie.cn/thread-2065287-1-1.html) | 某平台登录：加速乐 | `52pojie-2065287-某平台登录：加速乐.md` |
| [2023585](https://www.52pojie.cn/thread-2023585-1-1.html) | 某贝漫画逆向分析 | `52pojie-2023585-某贝漫画逆向分析.md` |
| [2017695](https://www.52pojie.cn/thread-2017695-1-1.html) | 某东培训网络学院登录分析 | `52pojie-2017695-某东培训网络学院登录分析.md` |
| [2015289](https://www.52pojie.cn/thread-2015289-1-1.html) | 某专业技术人员继续教育平台登录分析及模拟实践 | `52pojie-2015289-某专业技术人员继续教育平台登录分析及模拟实践.md` |
| [1961495](https://www.52pojie.cn/thread-1961495-1-1.html) | 某考试平台登录分析 | `52pojie-1961495-某考试平台登录分析.md` |
| [1949337](https://www.52pojie.cn/thread-1949337-1-1.html) | 某卡麦逆向分析 | `52pojie-1949337-某卡麦逆向分析.md` |
| [1947244](https://www.52pojie.cn/thread-1947244-1-1.html) | 国密获取数据思路（RPC、非扣代码） | `52pojie-1947244-国密获取数据思路（RPC、非扣代码）.md` |
| [1929548](https://www.52pojie.cn/thread-1929548-1-1.html) | Python学习通（一）手机号POST登录 | `52pojie-1929548-Python学习通（一）手机号POST登录.md` |
| [1887573](https://www.52pojie.cn/thread-1887573-1-1.html) | 智慧教育公共服务平台登录分析 | `52pojie-1887573-智慧教育公共服务平台登录分析.md` |
| [1771094](https://www.52pojie.cn/thread-1771094-1-1.html) | 这也太酷炫了！python爬虫直接干翻美团 | `52pojie-1771094-这也太酷炫了！python爬虫直接干翻美团.md` |
| [1567320](https://www.52pojie.cn/thread-1567320-1-1.html) | RPC 百度登录RSA免扣调用实战 | `52pojie-1567320-RPC 百度登录RSA免扣调用实战.md` |
| [1493788](https://www.52pojie.cn/thread-1493788-1-1.html) | 【Python】易班新版网站登录思路分析 | `52pojie-1493788-【Python】易班新版网站登录思路分析.md` |
| [1272834](https://www.52pojie.cn/thread-1272834-1-1.html) | 04-咪咕视频登录RSA分析 | `52pojie-1272834-04-咪咕视频登录RSA分析.md` |
| [1101196](https://www.52pojie.cn/thread-1101196-1-1.html) | 网易云音乐评论爬虫 | `52pojie-1101196-网易云音乐评论爬虫.md` |
| [1094968](https://www.52pojie.cn/thread-1094968-1-1.html) | 网易云音乐在线播放接口解析(两种方法运行扣出来的js) | `52pojie-1094968-网易云音乐在线播放接口解析(两种方法运行扣出来的js).md` |
| [1066341](https://www.52pojie.cn/thread-1066341-1-1.html) | JS实战系列视频教学- 并爹爹商城快速寻找加密入口完整版 | `52pojie-1066341-JS实战系列视频教学- 并爹爹商城快速寻找加密入口完整版.md` |
| [1013338](https://www.52pojie.cn/thread-1013338-1-1.html) | 爱奇艺视频cmd5x解析算法的移植分析和实现<Nodejs>（2019-08） | `52pojie-1013338-爱奇艺视频cmd5x解析算法的移植分析和实现 Nodejs （2019-08）.md` |

### 扣代码 / AST / 混淆还原 / 反调试（6）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2058187](https://www.52pojie.cn/thread-2058187-1-1.html) | 手把手带你AST还原某验三代(一) | `52pojie-2058187-手把手带你AST还原某验三代(一).md` |
| [2056857](https://www.52pojie.cn/thread-2056857-1-1.html) | 某高考逆向分析 | `52pojie-2056857-某高考逆向分析.md` |
| [2056072](https://www.52pojie.cn/thread-2056072-1-1.html) | 彻底解决前端无限debugger | `52pojie-2056072-彻底解决前端无限debugger.md` |
| [2055730](https://www.52pojie.cn/thread-2055730-1-1.html) | 某验3AST分析及实现 | `52pojie-2055730-某验3AST分析及实现.md` |
| [2028814](https://www.52pojie.cn/thread-2028814-1-1.html) | 使用AST技术自动扣代码的一些尝试 | `52pojie-2028814-使用AST技术自动扣代码的一些尝试.md` |
| [1908049](https://www.52pojie.cn/thread-1908049-1-1.html) | 蓝奏云优享版js代码扣取.encryptHex | `52pojie-1908049-蓝奏云优享版js代码扣取.encryptHex.md` |

### 风控 / 验证码 / 字体 / 指纹（7）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2096339](https://www.52pojie.cn/thread-2096339-1-1.html) | 通过DrissionPage爬取某聘 | `52pojie-2096339-通过DrissionPage爬取某聘.md` |
| [2089394](https://www.52pojie.cn/thread-2089394-1-1.html) | 某18+论坛CF盾验证扣代码 | `52pojie-2089394-某18+论坛CF盾验证扣代码.md` |
| [1542629](https://www.52pojie.cn/thread-1542629-1-1.html) | selenium 隐藏 Chrome 爬虫特征实现模拟登录 | `52pojie-1542629-selenium 隐藏 Chrome 爬虫特征实现模拟登录.md` |
| [1382392](https://www.52pojie.cn/thread-1382392-1-1.html) | 关于知乎登录的反扒机制绕过 | `52pojie-1382392-关于知乎登录的反扒机制绕过.md` |
| [1323885](https://www.52pojie.cn/thread-1323885-1-1.html) | 58租房爬取已破解字体加密但是gui方面还不完善 | `52pojie-1323885-58租房爬取已破解字体加密但是gui方面还不完善.md` |
| [1044889](https://www.52pojie.cn/thread-1044889-1-1.html) | 58同城房源模块数字字体解析java版 | `52pojie-1044889-58同城房源模块数字字体解析java版.md` |
| [896348](https://www.52pojie.cn/thread-896348-1-1.html) | selenium跳过webdriver检测并爬取天猫商品数据 | `52pojie-896348-selenium跳过webdriver检测并爬取天猫商品数据.md` |

### 视频 / m3u8 / 直播源 / DRM 解密（9）

| ID | 标题 | 文件 |
| --- | --- | --- |
| [2060041](https://www.52pojie.cn/thread-2060041-1-1.html) | 某网站 DRM Clear Key 密钥获取 | `52pojie-2060041-某网站 DRM Clear Key 密钥获取.md` |
| [1892868](https://www.52pojie.cn/thread-1892868-1-1.html) | 某鹅通M3U8分析 | `52pojie-1892868-某鹅通M3U8分析.md` |
| [1715277](https://www.52pojie.cn/thread-1715277-1-1.html) | HLS-M3U8流媒体视频加密KEY介绍以及平台案例！ | `52pojie-1715277-HLS-M3U8流媒体视频加密KEY介绍以及平台案例！.md` |
| [1686788](https://www.52pojie.cn/thread-1686788-1-1.html) | 【在线M3U8音视频加密安全与技术防护】 | `52pojie-1686788-【在线M3U8音视频加密安全与技术防护】.md` |
| [1640483](https://www.52pojie.cn/thread-1640483-1-1.html) | M3U8加密key计算 | `52pojie-1640483-M3U8加密key计算.md` |
| [1479898](https://www.52pojie.cn/thread-1479898-1-1.html) | 获取优酷视频真实m3u8播放链接，非vip也可得到原视频最高画质 | `52pojie-1479898-获取优酷视频真实m3u8播放链接，非vip也可得到原视频最高画质.md` |
| [1475807](https://www.52pojie.cn/thread-1475807-1-1.html) | 分析某视频网站将 HLS 流伪装成图片以隐藏视频源 | `52pojie-1475807-分析某视频网站将 HLS 流伪装成图片以隐藏视频源.md` |
| [1123176](https://www.52pojie.cn/thread-1123176-1-1.html) | 分析调试某qiyi直播源【分析了一部分】 | `52pojie-1123176-分析调试某qiyi直播源【分析了一部分】.md` |
| [1002283](https://www.52pojie.cn/thread-1002283-1-1.html) | 某鱼直播链接分析与获取 | `52pojie-1002283-某鱼直播链接分析与获取.md` |


**本轮新增 39 篇的主题分布**：签名/登录/参数加密/算法还原 **17**、扣代码/AST/反混淆/反调试 **6**、风控/验证码/字体/指纹 **7**、视频/m3u8/直播源/DRM **9**。

**空正文（3 条）**：`1985832`（121B）/ `1525939`（309B）/ `1482970`（276B）。
**权限受限（8 条，勿重复进待抓）**：`1867851`(40) / `1831357`(20) / `1778315`(20) / `1655123`(20) / `1638202`(80) / `1587768`(20) / `1467610`(80) / `904285`(20)。
