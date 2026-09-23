# 分析A站的连环会每次变动的cookie

> **作者**: YuanFang0w0 | **发布时间**: 2022-04-04 21:30:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5086 / 13
> **原文**: [https://www.52pojie.cn/thread-1616585-1-1.html](https://www.52pojie.cn/thread-1616585-1-1.html)

---

*本帖最后由 YuanFang0w0 于 2022-4-4 23:04 编辑*

## 连环请求拼接cookie的分析

---

### 需求&前言

有需求要爬一下[A站](https://www.52pojie.cn/www.artstation.com)（外国网站要VPN）的用户信息，但是这个站的反爬还是有的，来分析一下他的cookie生成，当时可是让我想了有半天，都以为是本地动js动态生成cookie了，因为他的cookie每次请求都会变，都准备进行js逆向了，还好从头到尾在看了看，总算看出来了，总体难度不大，看的时候仔细点就行

### 一、预备

因为要爬取的是用户，所以请求他的搜索页面（因为只有搜索页面里可以看得到全站的用户）看一下请求头都有什么，当然别的就不说了，主要是cookie，这个网站没有cookie根本请求不到数据

#### cookie如下

> `__cf_bm=hOp0StVR19qWb9i_nIZXxZZLG5JRd8rG_rFhf10lX6E-1649076445-0-AVdRlUdbl6tti5QIri4NnceSb/M9gwoeABh5aEqcbsYTsOmr+9qTre/GXFK5FbxvoOJC4VF6LRxm6RMKQXh1MzzNSKPm/L/29xiQMhyPq83v; PRIVATE-CSRF-TOKEN=sPjo%2FuV5Iy1%2BG3Hx2vstvhBGFFGlCNzbtMdfGjbazOM%3D; _ArtStation_session=NkEwUHFUbWxKYlJMVmFTSjFveGFNWEJ6c25RY0hFclNTcEhrOUZyOHFoaEx2aWE4MUR0UjE2UXFkQlNCRmhsdkNpZ3hxcHBMU2laUWVPY1VyM0dlWWF6TnFFT0FiLy9JNU5rTjlMMWhTRm5MZkkzaTY2WE02aDgrVE1nMkJ4UU9JOENObXRRam5YekwyVEkxN1NVLzdBSHFtZS9OUTZIS1BncUMwd2hNTUd4VTZCbGh5VHNaWE9LUFJkNzJrMGQwLS05TWg3aHFPbXpQQlJtM1RNdURyajlBPT0%3D--3b02775f0ba8cd168123dcfc93229e2d32480c62; __stripe_mid=6a0b9d7b-4f0c-4a78-b03d-b113986e2c621099cc; __stripe_sid=50a19f9e-47a2-4576-8ab5-99be3feae17be81b61`

可以看到，cookie里面包含了这么几个字段`__cf_bm、PRIVATE-CSRF-TOKEN、_ArtStation_session`
我测试的时候发现少了这三个任何一个都会被浏览器判定为机器，请求到的页面是一个Google的人机验证！！！
那么这几个值就是我们需要的对象

### 二、进行信息分析获取

#### 1.获取第一个参数

清楚浏览器的cookie信息，我们刷新一下网页，再去看开发者工具拦截的数据包（我刚开始没有发现，可能是我没有清除本地cookie哈哈哈 丢人。。。）
发现请求的页面不再是用cookie请求的了，他其实是可以直接不需要cookie请求的
![图一请求结果](https://s1.328888.xyz/2022/04/04/Lcn0Q.png)
可以看到里面的cookie包含了`__cf_bm`这个字段，那么我们就拿到了这个信息，然后还要另外两个字段的信息

#### 2.获取第二个参数

这里要注意请求第二个接口的时候要用到第一次获取到的cookie就是`__cf_bm`，不然应该是请求不到的，
请求之后
继续在数据包里面找
![图二，查找参数二](https://s1.328888.xyz/2022/04/04/LcFG4.png)
这里小小的利用了一下搜索功能，因为已经明确知道我需要的是`PRIVATE-CSRF-TOKEN`这个值了，所以就找一下 果然发现了里面有token.json两个文件都有set-cookie，看到确实是这个需要的`PRIVATE-CSRF-TOKEN`，那么这里有两个token，我又不知道需要哪一个了，最后发现这两个应该都是可以的，因为他们的链接都是一样的，只是请求头的区别，一个中包含了`public-csrf-token`，应该是公钥吧可能，但是他的值其实是null。而且我写代码也没有这个请求头，只加了useragent和referer，再加一个cookie。所以这两个应该是都可以的。
这里注意一下，这个token.json是有返回值的，返回的是一个json格式的`public_csrf_token`
![图三返回值](https://s1.328888.xyz/2022/04/04/LcMT7.png)
这个后面不在cookie利用，但是你请求数据要放在请求头里面。所以后面有需要的就需要保存下来了。

#### 到最后一个参数了

一样，请求要带第一次的cookie，就是`__cf_bm`字段
最后一个参数是`_ArtStation_session`，这个肯定是最重要的，这里在用一下搜索吧，哈哈哈，因为搜索实在是太方便了
![图四](https://s1.328888.xyz/2022/04/04/LcofZ.png)
搜索发现依然还是有set-cookie，所以果断就是他了。

### 结语

到这里所有的cookie获取结束了，然后后面就是需要什么数据就去请求什么数据就行了。
写文档的时候发现，原来还是挺简单的（也可能是第二次，轻车熟路），当时搞了半天没出来。
总的来说不是多难，但是也是一次跟以往不同的经历，因为以前都是直接复制网站的cookie就行了，这个网站的cookie是一直变的，所以复制没用，才搞了这么长时间。
也算是一次经历，就记录一下吧。总结一次经验也算是。
