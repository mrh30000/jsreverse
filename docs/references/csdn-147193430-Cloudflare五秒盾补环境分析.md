# Cloudflare五秒盾补环境分析

> **来源**: CSDN | **作者**: 熊孩子啥也不会 | **发布**: 2025-04-13
> **原文**: [147193430](https://blog.csdn.net/qq_45696543/article/details/147193430)
> **采集**: hubcli csdn search/article（CF 盾纯协议实现方案调研）

---

# Cloudflare五秒盾补环境分析

- url: https://blog.csdn.net/qq_45696543/article/details/147193430?ops_request_misc=elastic_search_misc&request_id=2cb5566e5c2c1b43db01b719bb109886&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~blog~sobaiduend~default-1-147193430-null-null.541^v3^pc_search_result_blog7&utm_term=cloudflare%20%E8%A1%A5%E7%8E%AF%E5%A2%83
- author: 熊孩子啥也不会
- pub: 2025-04-13

# Cloudflare五秒盾补环境分析

> **作者**: 熊孩子啥也不会 | **发布时间**: 最新推荐文章于 2026-05-24 16:36:51 发布 | **阅读**: 5 | **点赞**: 33 | **评论**: 1
> **标签**: `爬虫`, `javascript`
> **原文**: [https://blog.csdn.net/qq_45696543/article/details/147193430](https://blog.csdn.net/qq_45696543/article/details/147193430)

---

本文内容仅限于学术研究和技术讨论，实际应用中应严格遵守相关法律法规和服务条款。本文内容遵守CC BY-NC-ND 4.0协议，禁止任何修改后二次传播。 
欢迎访问博客浏览更多内容：Cloudflare五秒盾补环境分析 – 编程技术杂谈 
一.认识5s盾 
在正式开始对五秒盾进行分析之前，我们先来了解一下如何简单的判断是不是五秒盾。 第一种方式便是通过网页显示的图片进行判断，当你在网页上看见下图时，那大概率就是遇到五秒盾了。 
 
当然，因为五秒盾是存在 Invisible 模式，即无感模式的，因此在某些情况下即便没有看见上面的图片也有可能遇到五秒盾，下面会讲一些其他的判断方式。 
python requests请求返回 html 出现 “Just a moment…”网页 cookie 中存在 cf_clearance 字段五秒盾进行校验时发送的请求存在 https://challenges.cloudflare.com/cdn-cgi/challenge-platform 特征 
二.请求流程拆解 
本次五秒盾请求流程拆解使用的是 cookie 类型作为样例，其余类似无感和token类型的五秒盾，在请求流程上对比cookie的流程大多只是做了一定的删减。 
 
最后服务器返回的 set-cookie 中包含 cf_clearance 字段就是验证通过了。 
1. 第一个请求——首页返回403 
 
请求首页返回的html最重要的就是这段js代码，后续流程中会使用到 _cf_chl_opt 中的 cRay、cH、md等字段。 
2.第二个请求——第1个js文件 
当首页代码执行完毕后便会请求第一个 js 文件，在这个 js 文件中会进行一定的 dom 操作，然后将获取的值进行 JSON.stringify 转换然后再编码后通过 post 请求发送出去。 
请求链接类似于下面这种： 
https://网站域名/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1?ray=92f9047e7ecb2f41 
其中ray便是首页 html 中的 _cf_chl_opt.cRay 的值。 
3.第三个请求 —— 第1个post请求 
下图就是 JSON.stringify 转换的内容。 
 
4.第四个请求——normal请求 
紧接着我们会来到第二个 html 请求： 
https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile/if/ov2/av0/rcv/wu5a7/0x4AAAAAAAAjq6WYeRDKmebM/light/fbE/new/normal/auto/ 
在这个请求中 0x4AAAAAAAAjq6WYeRDKmebM 相当于网站的 key，是固定的。 
在normal页面中，最重要的值和首页请求的值一样，都是 window._cf_chl_opt，不过需要注意的是，虽然他们都是 window._cf_chl_opt，但是其中的字段确实千差万别，千万要注意分开保存下来，不要覆盖了。 
 
4.第五个请求——第2个js文件 
https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/orchestrate/chl_api/v1?ray=92f90b53fd3a28f3&lang=auto 
这一部分没什么好说的，就是获取 js 代码，然后执行环境检测的主要代码。 
5.第六个请求—— 第2个 post 请求 
这里和第一个 js 文件一样，在经过一系列比之前更为繁杂的 dom 操作以后，使用 JSON.stringify 将对象转化后进行编码然后发送，返回的值进行解码后便是进行环境检测和环境字典的代码了。 
 
可以看到，对象里面有部分值就是 normal 页面获取的 window._cf_chl_opt 的值，同时还有一部分值其实和第一个 js 文件发送 post 请求返回后的结果有关。 
6.第七个请求——环境字典 
这一部分就是整个 5s 盾里面最主要、最核心的一块，他检测了包括并不限于浏览器的 dom 、window、navigator、location等等环境，然后生成一个环境对象，将环境对象进行编码后通过 post 请求发送给服务器进行检测，如果通过了，那么返回 response 的长度就会大于1000并小于10000，如果长度小于1000那就是环境值有问题，如果长度大于10000，那就需要进行点击操作了。 
 
这些字段便是环境检测的结果。 
同时，再这一步里面还会发送一个 fetch 请求和一个 image 请求，先后顺序是不固定的，image 请求结果的图片宽高时会用到环境监测结果中的。 
7.最后一个请求——获取cookie字段cf_clearance 
当前面的校验通过后，这里就会携带者请求结果返回第一个js文件中，发送最后一个请求 ，去获取cookie字段cf_clearance。 
 
三、结果展示 结果肯定是嘎嘎跑
