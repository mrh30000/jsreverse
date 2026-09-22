# Cloudflare 5秒盾JS逆向实战：纯请求模拟获取cf_clearance

> **来源**: CSDN | **作者**: weixin_30908941 | **发布**: 2019-08-03
> **原文**: [99171711](https://blog.csdn.net/weixin_30908941/article/details/99171711)
> **采集**: hubcli csdn search/article（CF 盾纯协议实现方案调研）

---

# Cloudflare 5秒盾JS逆向实战：纯请求模拟获取cf_clearance

- url: https://blog.csdn.net/weixin_30908941/article/details/99171711?ops_request_misc=elastic_search_misc&request_id=7ad2d4216d76cfe53652d02cb31bc84f&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-13-99171711-null-null.541^v3^pc_search_result_blog7&utm_term=cloudflare%20%E6%8E%A5%E5%8F%A3%20%E9%80%86%E5%90%91
- author: weixin_30908941
- pub: 2019-08-03

# Cloudflare 5秒盾JS逆向实战：纯请求模拟获取cf_clearance

> **作者**: weixin_30908941 | **发布时间**: 最新推荐文章于 2026-09-18 16:31:12 发布 | **阅读**: 394 | **点赞**: 10 | **评论**: 0
> **标签**: `Cloudflare`, `5秒盾`, `JS逆向`
> **原文**: [https://blog.csdn.net/weixin_30908941/article/details/99171711](https://blog.csdn.net/weixin_30908941/article/details/99171711)

---

1. 项目概述：当爬虫遇上Cloudflare的“安检门”  
 做爬虫的朋友，尤其是搞数据采集的，这两年最头疼的恐怕就是Cloudflare的防护了。你精心构造的请求，满怀期待地发出去，结果服务器回给你的不是梦寐以求的HTML数据，而是一个旋转的小圈圈，或者是一段让你等待几秒钟的JavaScript代码。这种机制，就是圈内人常说的“5秒盾”（5-second challenge），或者更正式一点，叫“浏览器完整性检查”。  
 这玩意儿本质上是一道动态的、在服务器端执行的“安检门”。当Cloudflare怀疑一个请求不是来自真实的浏览器（比如，它来自一个没有完整浏览器环境、没有执行JavaScript能力的爬虫脚本）时，就会触发这个机制。它的目的不是彻底封死你，而是给你一个“证明自己是人类”的机会。这个机会，就是去执行一段由Cloudflare生成的、包含复杂逻辑和计算的JavaScript代码。这段代码执行完毕后，会在你的浏览器（或模拟环境）里生成一个关键的“通行证”——一个名为  cf_clearance  的Cookie。  
 这个  cf_clearance  就是本次实战的核心目标。只有成功获取并携带了这个Cookie，你的后续请求才能绕过“5秒盾”，被Cloudflare视为“已验证的合法流量”，从而访问到目标网站的真实内容。所以，整个逆向工程的核心，就是搞清楚：Cloudflare的那段JS到底干了什么？  cf_clearance  是如何被计算出来的？我们如何在不启动完整浏览器的情况下，模拟出这个过程？  
 2. 核心思路与方案选型：模拟还是接管？  
 面对5秒盾，技术上有几条主流路径，各有优劣，选择哪种取决于你的目标、技术栈和资源。  
 2.1 纯浏览器自动化方案（如Selenium、Playwright）  
 这是最直观、最“笨”但往往最有效的方法。思路是：用一个自动化工具控制一个真实的浏览器（如Chrome、Firefox），打开目标网页，等待5秒盾的JS执行完毕，然后从浏览器中提取出生成的  cf_clearance  Cookie。  
  优点：   
 
   成功率高  ：由于使用了真实的浏览器和JavaScript引擎（如V8），能够完美执行Cloudflare的挑战代码，几乎100%通过。  
   无需逆向  ：完全不用关心JS代码的具体逻辑，省去了最复杂的分析工作。  
   应对变化能力强  ：即使Cloudflare更新了挑战算法，只要浏览器能正常通过，这套方案就依然有效。  
 
  缺点：   
 
   资源消耗大  ：每个请求（或会话）都需要启动/维护一个浏览器实例，内存和CPU开销巨大。  
   速度慢  ：浏览器启动、页面加载、JS执行都需要时间，无法满足高并发、低延迟的爬取需求。  
   容易被检测  ：虽然用的是真浏览器，但自动化工具的行为指纹（如WebDriver属性、非人类操作模式）可能被高级防护检测到，导致挑战失败或被封禁。  
 
 
   实操心得  ：对于低频、对成功率要求极高、且目标网站防护不算极端严苛的场景，Playwright（配合Stealth插件）是比Selenium更好的选择，因为它对CDP（Chrome DevTools Protocol）的支持更原生，能更好地隐藏自动化痕迹。  
 
 2.2 基于无头浏览器内核的方案（如Puppeteer Extra Stealth）  
 这是方案一的升级版，核心是使用无头浏览器（Headless Chrome）并加载各种反检测插件（如  puppeteer-extra-plugin-stealth  ），尽可能模拟真人浏览器的所有特征，以绕过Cloudflare基于浏览器指纹的检测。  
  优点：   
 
  继承了方案一高成功率的优点。  
  相比完整GUI浏览器，资源消耗稍低。  
  通过插件可以深度定制指纹，对抗检测的能力更强。  
 
  缺点：   
 
  资源消耗和速度问题虽有改善，但本质未变，仍不适合大规模爬取。  
  配置和维护一套稳定的反检测环境较为复杂。  
 
 2.3 JS逆向与纯请求模拟方案（本次实战核心）  
 这是最具技术挑战性，但也是效率最高的方案。核心思路是：通过逆向工程，彻底搞清楚Cloudflare挑战JavaScript的逻辑，然后用Python（或其他语言）重新实现这个逻辑。这样，你的爬虫程序就从一个“需要浏览器环境的脚本”，变成了一个“能独立计算出  cf_clearance  的纯HTTP客户端”。  
  优点：   
 
   极致性能  ：无需启动浏览器，纯计算，速度极快，资源占用极低，可轻松实现高并发。  
   完全隐身  ：发出的请求与普通HTTP客户端无异，没有浏览器指纹泄露的风险。  
   一次破解，长期受益  ：一旦逆向成功，代码逻辑相对稳定，除非Cloudflare进行算法大改。  
 
  缺点：   
 
   技术门槛高  ：需要深厚的JavaScript逆向、代码混淆分析、密码学基础。  
   维护成本高  ：Cloudflare会不定期更新其挑战算法，逆向代码需要随之更新。  
   逆向过程可能非常复杂  ：挑战代码通常被严重混淆和加密，分析起来犹如解谜。  
 
  我们的选择  ：本次实战将聚焦于  方案三  ，即JS逆向与纯请求模拟。这不仅是因为它代表了爬虫工程师技术的“天花板”，更因为理解了这个过程，你将能更深刻地理解现代Web反爬机制的运作原理，从而举一反三，应对其他类似的挑战（如Akamai、PerimeterX等）。我们会从最基础的请求-响应循环开始，一步步拆解，直到用Python计算出属于自己的  cf_clearance  。  
 3. 环境准备与初步探测  
 在开始逆向之前，我们需要搭建一个便于分析和调试的环境。  
 3.1 工具链准备  
 工欲善其事，必先利其器。以下是本次实战推荐的工具清单：  
 
    Python环境  ：建议使用Python 3.8+。主要库包括：  
   
     requests  /  httpx  /  aiohttp  ：用于发送HTTP请求。  
     nodejs  ：  必不可少  。我们需要它的  node  命令来执行提取和净化后的JS代码。请确保系统已安装Node.js。  
     execjs  或  PyExecJS  ：一个优秀的库，它允许Python调用Node.js、JavaScriptCore等引擎来执行JS代码。这是我们连接Python和逆向后JS逻辑的桥梁。  
     curl_cffi  ：一个非常新的、强大的库。它不仅能模拟不同浏览器（如chrome110, safari15.5）的TLS指纹，还能  自动处理一些简单的Cloudflare挑战  。在后续的请求模拟阶段，它可以作为  requests  的增强替代品。
