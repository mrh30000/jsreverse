---
title: "Cloudflare、Akamai、Kasada 等头部公司怎么做反爬？侧重点是什么，一篇文章给你说清楚！"
source: "https://mp.weixin.qq.com/s/vy8jWdroOC4leQ2CQeAdVg"
author:
  - "[[RR]]"
published:
created: 2026-08-15
description: "之前讲过很多篇关于反爬的内容了，对之前有兴趣的可以翻下看看你以为反爬在看指纹，其实它在看你像不像一个活人很多人"
tags:
  - "clippings"
---
RR 时间摆渡 *2026年8月11日 07:50*

之前讲过很多篇关于反爬的内容了，对之前有兴趣的可以翻下看看

[你以为反爬在看指纹，其实它在看你像不像一个活人](https://mp.weixin.qq.com/s?__biz=MzIyODkwNTE0Nw==&mid=2247484049&idx=1&sn=c9bf5ff3df001aaf696ee2620ddef5f2&scene=21#wechat_redirect)

[很多人对“浏览器指纹”的理解，还停在很浅的一层。](https://mp.weixin.qq.com/s?__biz=MzIyODkwNTE0Nw==&mid=2247484045&idx=1&sn=e8a197c88bcf601d5356011dc5f9c680&scene=21#wechat_redirect)

[真正的反爬｜不用等页面加载完再看你有没有移动鼠，而是看它从 TCP 连接建立的那一刻，就已经开始打分。](https://mp.weixin.qq.com/s?__biz=MzIyODkwNTE0Nw==&mid=2247484041&idx=1&sn=18f921c745fe57ed6f72980d1d4c4502&scene=21#wechat_redirect)

[真正懂反爬的人，第一眼看的不是“像不像真人”，而是“数据从哪里流出去”](https://mp.weixin.qq.com/s?__biz=MzIyODkwNTE0Nw==&mid=2247484037&idx=1&sn=15d4b9b529338846cf8235c53536e2a0&scene=21#wechat_redirect)

今天说说头部反爬厂商做的事，其实还是我们前面说的“身份审计”。它们不只看你有没有点按钮，而是看你的网络、浏览器、设备、行为、IP 信誉、会话历史能不能互相对上。一个请求说自己来自 Chrome，不够；TLS 指纹要像 Chrome，HTTP/2 帧顺序要像 Chrome，Canvas、字体、插件、时区、语言也要像一个真实用户的机器。现代反爬最狠的地方就在这里：它不是抓一个破绽，而是看整套身份故事有没有漏洞。

Akamai 的特点是把检测推进浏览器内部。它的 Bot Manager 会在页面里注入 sensor.js，材料里提到脚本大约 512KB，而且高度混淆。这个脚本不是摆设，它会在浏览器里收集大量环境信号，再通过 \_abck、bm\_sz 这类 cookie 维持会话状态。Akamai 不是只看第一次请求，它做的是多请求评分，用户从首页进来、停留多久、有没有滚动、后续去了哪里，都会影响信任分。材料里还有一个很硬的细节：它会探测大约 60 个 chrome-extension:// URL。真实用户的浏览器通常有扩展，太干净的浏览器反而像自动化环境。Akamai 适合航空、银行、大零售，因为这些业务最怕抢票、撞库、库存抓取和价格监控。

Cloudflare 的优势在位置。它站在 CDN 边缘，请求还没到源站，就已经被 Cloudflare 的边缘节点看过一遍。它会看 JA3/JA4 这类 TLS 指纹，也会看 HTTP 头、IP 信誉、请求速率和历史行为。材料里提到 Cloudflare 拿到全网约 20% 流量的视角，这意味着它有很强的“正常浏览器基线”。Cloudflare 的 Bot Score 是 1 到 99 分，Turnstile 表面上是验证码替代品，实际更像一套客户端可信度采样：材料里提到一次 Turnstile POST 里有 79 个参数，包含 Canvas hash、字体测量、SHA-256 工作量证明和加密时序数据。它不是问你会不会点图，而是问你的网络栈、浏览器栈、执行时序是不是同一个真人。

DataDome 的重点是站点级模型。它不像 Cloudflare 那样主要靠全网边缘视角，而是更贴近每个具体业务。材料里说 DataDome 部署了 85,000 个独立 ML 模型，每个受保护站点一个，这个思路很合理：新闻站、电商站、航空站、银行站的“正常用户”根本不是一类人。DataDome 的典型标志是 datadome cookie，也会用 WASM boring\_challenge、Picasso 设备指纹、行为信号和 IP 信誉。材料里有两个细节很关键：它每天处理 5 万亿信号，实时响应大约 2ms，IP 信誉能占总信任分 25% 到 30%。也就是说，在 DataDome 面前，光把浏览器伪装好不够，IP 背景和站内行为也要说得通。

PerimeterX 并入 HUMAN Security 后，更像一个跨站信誉网络。它的典型 cookie 是 \_px3、\_pxde。它不是只问你在当前网站像不像人，而是看你的设备、IP、TLS、HTTP headers、JS fingerprint、行为路径在更大网络里有没有坏记录。材料里提到它覆盖 29,650+ 个受保护站点，每周验证 15 万亿次交互，涉及 30 亿设备。这个体系最麻烦的地方是五向量统一评分：TLS、IP、HTTP 头、JS 指纹、行为必须同时成立。只修一个点没用。你换了干净 IP，但浏览器指纹复用；你修了指纹，但行为路径像脚本；你这次访问正常，但同一画像在别的站点被标过。HUMAN 的强项不是某个单点检测，而是让“伪造一个完整身份”变得很贵。

Kasada 的气质更硬。它通常作为网关代理挡在源站前面，请求先过 Kasada，再进业务服务器。它的标志包括 x-kpsdk-ct、x-kpsdk-cd，前端会出现多态命名的 ips.js。它没有那么依赖验证码，而是用 JavaScript 工作量证明和浏览器完整性检测。材料里提到一个关键点：Kasada 会检查被自动化框架补丁改过的原生函数，比如用 Function.prototype.toString() 看函数形态。这个设计很狠，因为自动化工具为了隐藏自己会改浏览器 API，但改动本身也会留下痕迹。Kasada 的封禁也很冷，常见就是静默 403 或 429，不解释。它查的不是“你有没有浏览器”，而是“你的浏览器是不是被改装过”。

F5 Shape 是重型客户端挑战路线。F5 在 2020 年花 10 亿美元收购 Shape Security，这个价格买的不是普通 WAF，而是一套复杂的客户端执行体系。Shape 的典型标志是 reese84、TS cookie，以及一些带 $rsc 的参数。它最核心的特点是自定义 JavaScript VM：浏览器里跑的不是普通、容易理解的 JS，而是虚拟化后的专有字节码。挑战载荷会轮换，token 有效期按分钟算。它的目标不是让你完全无法逆向，而是让你维护不起。今天刚分析完，明天换一版；这周能生成 token，下周字段又变了。对大规模自动化来说，持续跟随这种轮换，本身就是成本。

Fastly Bot Management 走的是 CDN 原生路线。它叠在 Fastly 的 Next-Gen WAF 上，在边缘层看 JA3/JA4、HTTP 头顺序、IP 信誉和行为评分。它比较有辨识度的是动态客户端挑战，常见 cookie 是fs\_ch\_st、fs\_ch\_cp，高级客户端检测里还可能看到fs\_cd\_cp\*。Fastly 的挑战更接近轻量 JS 工作量证明，不是 F5 Shape 那种重型 VM。它的目标是把纯 HTTP 客户端、粗糙脚本和可疑代理挡在前面，只在风险更高时才升级。

Anubis 则代表了另一条路：开源、轻量、专门对付 AI 爬虫。它由 TecharoHQ 用 Go 写，GitHub 上有 15k+ stars，常见于 Codeberg、FFmpeg、Linux kernel source、Sourcehut 这类 FOSS 项目。Anubis 作为反向代理运行，在服务页面前发起 JavaScript 工作量证明。它的逻辑很朴素：你要抓，可以，但先花 CPU 把题算完。它不一定能挡住有决心的操作者，但能明显拖慢那些大规模、低成本、无视 robots.txt 的 AI 抓取。

这些厂商的差异，归根结底是它们选择在哪一层设卡。为啥这样？究其原因是他们他们解决客户的不同问题。Akamai 盯浏览器内部，Cloudflare 盯边缘网络和全网画像，DataDome 盯单站行为模型，HUMAN 盯跨站信誉，Kasada 盯浏览器完整性和 PoW，F5 Shape 盯自定义 VM 和短 token，Fastly 盯 CDN 边缘挑战，Anubis 盯低成本 AI 爬虫。它们防的不是同一种“爬虫”，而是不同形态的自动化访问。

所以反爬真正的核心不是其中的某一点，而是对抗成本。低级脚本直接拦，数据中心代理限掉，不执行 JS 的客户端卡掉，自动化浏览器靠指纹和时序识别，复杂攻击再用挑战、信誉和业务行为消耗。最好的反爬系统不一定能拦住所有人，但它能让爬虫从便宜变贵，从稳定变不稳定，从批量作业变成长期维护工程。对网站来说，这就够了。

反爬 · 目录

同步

点击同步文章到多平台