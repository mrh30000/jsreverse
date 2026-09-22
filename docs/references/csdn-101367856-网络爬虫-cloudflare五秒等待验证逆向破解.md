# 网络爬虫-cloudflare五秒等待验证逆向破解

> **来源**: CSDN | **作者**: 井蛙不可语于海 | **发布**: 2019-09-25
> **原文**: [101367856](https://blog.csdn.net/qq_39802740/article/details/101367856)
> **采集**: hubcli csdn search/article（CF 盾纯协议实现方案调研）

---

# 网络爬虫-cloudflare五秒等待验证逆向破解

- url: https://blog.csdn.net/qq_39802740/article/details/101367856?ops_request_misc=elastic_search_misc&request_id=7ad2d4216d76cfe53652d02cb31bc84f&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-4-101367856-null-null.541^v3^pc_search_result_blog7&utm_term=cloudflare%20%E6%8E%A5%E5%8F%A3%20%E9%80%86%E5%90%91
- author: 井蛙不可语于海
- pub: 2019-09-25

# 网络爬虫-cloudflare五秒等待验证逆向破解

> **作者**: 井蛙不可语于海 | **发布时间**: 最新推荐文章于 2026-07-29 10:02:58 发布 | **阅读**: 2 | **点赞**: 10 | **评论**: 19
> **标签**: `网络爬虫`, `cloudflare`, `js逆向`, `五秒等待验证`, `逆向分析`
> **原文**: [https://blog.csdn.net/qq_39802740/article/details/101367856](https://blog.csdn.net/qq_39802740/article/details/101367856)

---

Cloudflare是国外的一家安全防护公司，最近在很多网站上也看到了他的身影，比较明显的特征就是让你等待5秒钟以验证你是否是真实的浏览器。 
以 https://www.biovision.com/ 为例 
另一个明显的特征就是它的cookie里面会包含__cfduid, cf_clearance 这个两个字段。 如果你发现你访问的网站里有这些特征，那么毫无疑问他就是采用了 Cloudflare的安全防护了，我们这里讲他的初级防护，也就是等待5秒的js逆向分析。 
 
首先访问网站，抓包分析。 
   
可以很清晰地看到，第一次请求访问该网站会503，然后给你一个__cfduid的cookie，带着这个cookie以及某几个参数(后面会讲到)去访问第二个url，会返回给你cf_clearance这个cookie,最后带着这俩cookie再次访问该网站即可正常拿到数据了。 
 
接下来就是找第二个链接里面的params参数了，不难发现，前面三个参数都是直接在第一次访问网站时返回的静态html里面，用正则取出来即可，所以我们重点关注的是第四个参数jschl_answer，因为我们在源码里面没有发现他。 
 
_s = re.findall('name="s" value="(.*?)"', r.text)[0]
_jschl_vc = re.findall('name="jschl_vc" value="(.*?)"', r.text)[0]
_pass = re.findall('name="pass" value="(.*?)"', r.text)[0]
 
然后我们看第一次访问网站时返回给我们的html,可以发现里面有一大段很奇怪的js。 
  
我们可以看到 这个a其实就是我们要的东西，a.value实际上就是我们需要找到的加密参数。接下来只需要用execjs把这段js运行出来，拿到a.value的值即可。 
r = s.get('https://www.biovision.com/', headers=headers)
print(r.text)

pattern = re.compile('setTimeout\(function\(\)\{(.*?)f.action \+= location.hash;', re.S)
code = pattern.findall(r.text)
code = re.sub('\s+(t = document.*?);\s+;', '', code[0], flags=re.S)
code = re.sub('a.value', 'value', code)
code = re.sub('t.length', '17', code)
code = 'function test(){' + code.strip() + ';return value;}'
s1 = execjs.compile(code)
t = s1.call('test')
print(t)
 
 
 这里讲解一下t.length替换为17是怎么来的，以免有些同学一头雾水。直接拿源码中的js去浏览器运行，因为这个是固定值，所以我直接替换了，如下图： 
 
 
然后我们可以拿fiddler抓包拿到的这段js去运行，看看生成的结果是否和抓包里的jschl_answer一致。 
 
可以看到完全一致，至此逆向分析结束。 
OK 大功告成 
 
Ending 
Github传送门 
持续更新ing （欢迎各种star与fork） 
联系方式: 442891187(QQ) 
如有权益问题可以发私信联系我删除
