# Cloudflare五秒盾JS逆向实战：cf_clearance生成原理与工程化落地

> **来源**: CSDN | **作者**: 吴声威 | **发布**: 2026-05-21
> **原文**: [161274429](https://blog.csdn.net/weixin_32553219/article/details/161274429)
> **采集**: hubcli csdn search/article（CF 盾纯协议实现方案调研）

---

# Cloudflare五秒盾JS逆向实战：cf_clearance生成原理与工程化落地

- url: https://blog.csdn.net/weixin_32553219/article/details/161274429?ops_request_misc=elastic_search_misc&request_id=7ad2d4216d76cfe53652d02cb31bc84f&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-14-161274429-null-null.541^v3^pc_search_result_blog7&utm_term=cloudflare%20%E6%8E%A5%E5%8F%A3%20%E9%80%86%E5%90%91
- author: 吴声威
- pub: 2026-05-21

# Cloudflare五秒盾JS逆向实战：cf_clearance生成原理与工程化落地

> **作者**: 吴声威 | **发布时间**: 于 2026-05-20 09:28:34 发布 | **阅读**: 719 | **点赞**: 14 | **评论**: 0
> **标签**: `JS逆向`, `Cloudflare`, `五秒盾`
> **原文**: [https://blog.csdn.net/weixin_32553219/article/details/161274429](https://blog.csdn.net/weixin_32553219/article/details/161274429)

---

1. 这不是“破解”，而是一场标准的前端对抗实验  
 你打开一个网站，页面卡住五秒，中间弹出“Checking your browser before accessing...”，进度条缓慢推进，最后跳转——这是 Cloudflare 的免费版“五秒盾”（Five-Second Challenge），也叫  cf_clearance  验证流程。它不依赖人机识别、不调用滑块或点选，只靠一段 JavaScript 在浏览器中执行计算并返回 token。很多人一看到“JS逆向”就本能联想到“绕过验证”“批量爬虫”“黑产工具”，但我要先说清楚：  本文所有操作均在合法合规前提下进行，仅用于理解 Web 安全机制、提升前端工程能力、辅助自动化测试与合规数据采集场景下的技术预研  。关键词是：  JS逆向、Cloudflare、五秒盾、cf_clearance、浏览器环境模拟、V8 引擎行为、WebAssembly 辅助检测、JavaScript 执行上下文还原  。  
 这不是教你怎么“干掉 Cloudflare”，而是带你亲手拆开这个被千万网站默认启用的安全模块，看清它的齿轮怎么咬合、哪些齿能被复刻、哪些齿一旦错位就会触发拦截。适合三类人：一是做合规爬虫开发的工程师，需要稳定获取  cf_clearance  以通过基础访问校验；二是前端安全研究者，想理解现代反自动化手段的真实构成；三是刚接触 JS 逆向的新手，五秒盾结构清晰、无混淆嵌套、无服务端动态下发逻辑，是极佳的入门靶场。它不像验证码那样依赖图像识别，也不像指纹墙那样强耦合设备特征，它的核心就一句话：  让真实浏览器执行一段确定性 JS，生成一个有时效性的签名凭证  。而我们的任务，就是把这段 JS 从网页里完整抠出来、在可控环境中跑通、理解它每一步的输入输出关系，并最终实现可复现、可调试、可维护的本地执行方案。  
 我第一次遇到它是在给某家教育平台做课程信息聚合时。对方用了 Cloudflare 免费版，没上 WAF 规则，也没配 Bot Management，但只要请求头里缺  cf_clearance  ，哪怕带了正确 User-Agent 和 Referer，也一律 403。当时我试了三种常见思路：直接复用浏览器抓包拿到的 cookie（失效快）；用 Selenium 启动真实 Chrome（资源开销大、启动慢、易被检测）；用 Pyppeteer 模拟（稳定性差，经常卡在 challenge 页面）。直到我把 challenge 页面保存为 HTML，用 DevTools 逐行打断点，才意识到：这段 JS 并不神秘——它没有调用  window.crypto.subtle  ，没读取  navigator.plugins  ，甚至没访问  document.all  ，它只做了三件事：基于时间戳和随机数生成初始 seed；用自定义的 RC4 变种算法对固定字符串加密；再用 SHA256 哈希拼接结果。整个过程完全可预测、可重放、可剥离。这让我意识到：所谓“盾”，本质是信任链的起点；而“攻”，只是把这条链从浏览器里完整搬出来而已。  
 2. 五秒盾的完整生命周期：从 HTML 注入到 cf_clearance 生效  
 要真正吃透五秒盾，不能只盯着 JS 代码看，得把它放进完整的 HTTP 请求-响应闭环里理解。它不是独立存在的“验证页”，而是 Cloudflare 边缘节点在判定请求可疑时，主动插入的一次“临时拦截”。整个流程有明确的触发条件、标准响应格式、严格的时间窗口和精确的 Cookie 设置规则。下面我按真实网络链路顺序，把每个环节掰开揉碎讲清楚。  
 2.1 触发条件：什么情况下你会看到那个五秒倒计时？  
 Cloudflare 免费版的 challenge 触发逻辑是隐式的，不对外公开，但通过大量实测可归纳出高频触发场景。注意：  这些是概率性策略，非绝对规则，且会随 Cloudflare 策略更新动态调整  ：  
 
    首次访问新 IP 或新 User-Agent 组合  ：比如你用一台全新云服务器，curl 直接请求目标站首页，90% 概率返回 challenge 页面。Cloudflare 会将  (IP, User-Agent)  视为一个会话标识，新组合需“验明正身”。   
    请求头缺失关键字段  ：最典型的是  Accept  ,  Accept-Language  ,  Sec-Ch-Ua  （Chromium 浏览器特有），甚至  DNT: 1  。Cloudflare 会比对正常浏览器发出的 header 样本库，缺失任一高频字段即提高风险分。   
    TCP/TLS 握手特征异常  ：比如 TLS 扩展顺序错乱、ALPN 协议未声明  h2  、SNI 域名与 Host 不一致。这类检测发生在四层，JS 逆向解决不了，需底层网络栈模拟（如 mitmproxy + custom TLS stack），本文不展开。   
    HTTP/2 流控异常  ：真实浏览器发起请求时，HEADERS 帧和 DATA 帧有特定时序和大小分布。若用 requests 库发请求，所有 header 打包进一帧，DATA 帧为空，与 Chrome 的分帧行为差异明显。   
 
 
  提示：判断是否触发 challenge，最简单方法是检查响应状态码和 Content-Type。正常响应是  200 OK  +  text/html  或  application/json  ；challenge 响应一定是  503 Service Temporarily Unavailable  +  text/html  ，且 HTML body 中包含  <script>  标签内嵌 challenge JS，以及  <form>  提交到  /cdn-cgi/challenge-platform/h/g/  路径。  
 
 2.2 响应结构：HTML 页面里藏着全部线索  
 当你收到 challenge 响应，不要急着去“解密 JS”，先看 HTML 结构。它高度标准化，是逆向的第一手资料。以下是一个典型响应片段（已脱敏）：  
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Just a moment...</title>
  <script src="/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=1234567890abcdef"></script>
</head>
<body>
  <div id="cf-wrapper">
    <div class="cf-section cf-wrapper">
      <div class="cf-spinner-container">
        <div class="cf-spinner"></div>
        <p class="cf-status">Checking your browser...</p>
      </div>
      <form id="challenge-form" action="/cdn-cgi/challenge-platform/h/g/jschl_answer" method="get">
        <input type="hidden" name="jschl_vc" value="a1b2c3d4e5f67890">
        <input type="hidden" name="pass" value="1712345678">
        <input type="hidden" name="s" value="1234567890abcdef1234567890abcdef">
      </form>
    </div>
  </div>
  <script>
    // 这里是核心 challenge JS，通常 300~800 行
    // 包含：seed 生成、RC4 加密、SHA256 计算、setTimeout 提交
  </script>
</body>
</html>
 
 关键元素解析：  
 
    <script src="...">  ：这是 Cloudflare 动态加载的公共 challenge 脚本（orchestrate.js），负责初始化环境、注入执行上下文、处理超时逻辑。它本身不参与计算，但会校验执行环境完整性（如检测  window.eval.toString()  是否被篡改）。   
    <form>  中的三个 hidden input：  
   
     jschl_vc  ：challenge 版本标识符，对应后端存储的 challenge 配置，用于匹配 JS 计算逻辑。  
     pass  ：Unix 时间戳（秒级），表示 challenge
