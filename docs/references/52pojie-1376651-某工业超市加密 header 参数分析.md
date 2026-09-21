# 某工业超市加密 header 参数分析

> **作者**: xianyucoder | **发布时间**: 2021-02-24 14:16:00 | **版块**: 『编程语言区』 | **查看/回复**: 3183 / 7
> **原文**: [https://www.52pojie.cn/thread-1376651-1-1.html](https://www.52pojie.cn/thread-1376651-1-1.html)

---

*本帖最后由 xianyucoder 于 2021-2-24 14:33 编辑*

### 今日网站

aHR0cHM6Ly93ZWIuemtoMzYwLmNvbS9saXN0L2MtMjYwMTg2Lmh0bWw/c2hvd1R5cGU9cGljJmNscD0x

这个网站是在某交流群看到的，随手保存下来作为今天的素材

![](https://attach.52pojie.cn/forum/202102/24/142553ldldndc4znwxdzw2.png)

#### 抓包分析与加密定位

先看看抓包的结果，可以看到请求的`header`中包含两个未知的参数，分别是`zkhs`和`zkhst`

![](https://attach.52pojie.cn/forum/202102/24/142624ktwl7p6wsewl08nb.png)

进一步检索参数`zkhst`和`zkhs`，可以发现这两个参数的值没有做过混淆

并且都有对应的搜索结果

![](https://attach.52pojie.cn/forum/202102/24/142626o54wdtjjpdx7iy7w.png)

![](https://attach.52pojie.cn/forum/202102/24/142629mc6lltcwcwws3woo.png)

根据搜索结果的提示inde，进一步在文件中检索`zkhst`和`zkhs`

可以在文件中找到下面这几个关键位置

![](https://attach.52pojie.cn/forum/202102/24/142631gh1a5acnczalttcn.png)

#### 加密分析

在逻辑里比较明显的是

```
e.headers.zkhs = o,e.headers.zkhst = r
```

这行代码预示我们要分析的是`o`和`r`这两个变量

这两个变量的赋值分别可以在上面的 js 逻辑中找到

```
o = u()("body=".concat(i, "&params=").concat(o, "&sign_token=").concat(r), r)
r = Object(s.f)("zkhst")
```

接下来只要单点调试即可，先来看`o`的生成

`o`的逻辑是将所有的参数拼接，传入`u()`中计算

这里的参数是一个逗号表达式，最后得到的传入参数是`r`

```
r = ("body=".concat(i, "&params=").concat(o, "&sign_token=").concat(r)
```

这里较为明显的未知参数是`body`以及`sign_token`

可以通过断点分析得到下面的结果，这个结果就是计算后的`r`

```
body={"brandId":"","catalogueId":"260186","cityCode":350100,"clp":true,"extraFilter":{"inStock":false,"showIndustryFeatured":false},"from":0,"fz":false,"keyword":"","productFilter":{"brandIds":[""],"properties":{}},"rangeFilter":null,"searchType":{"notNeedCorrect":false},"size":20,"sort":0}&params={"traceId":"213681131613962067063"}&sign_token=799c9842f09c490196047064e10dead8
```

网站的开发很贴心了，还在逻辑里加了`console.log`

![](https://attach.52pojie.cn/forum/202102/24/142635e5ve1syyazcu6pav.png)

`body`和`parmas`都是查询参数，`body`中包含了城市信息之类的内容，这个需要根据要爬取的内容修改

除此之外还有`sign_token`未知，这个就是另一个要分析的参数`zkhst`

#### zkhst 获取

经过调试得到下面这个结果，在定位的`js`中有一个`switch`控制流

在`918`行，会进行一次判断，如果`r = Object(s.f)("zkhst")`没有获取到值，会进入到`Object(l.i)();`这个逻辑。如果有值会`break`进入`926`行的逻辑。

![](https://attach.52pojie.cn/forum/202102/24/142637eyjguuoml63zzopu.png)

所以需要先把`Object(s.f)("zkhst")`的值变为`undefinde`，进入`s.f`中，可以看到下面这段逻辑

```
 h = function(t) {
        t = document.cookie.match(new RegExp("(^| )".concat(t, "=([^;]*)(;|$)")));
        return null != t ? decodeURIComponent(t[2]) : null
    }
```

可以得到`zkhst`是从`cookie`中得出的，直接清除`cookie`中的`zkhst`就能进入生成的逻辑

所以清除浏览器缓存/`cookie`

顺利进入`(l.i)()`，可以看到下面这串逻辑

![](https://attach.52pojie.cn/forum/202102/24/142633v7yw104bb0gy74t1.png)

并且在`network`中也的到印证

![](https://attach.52pojie.cn/forum/202102/24/142622rth9vhdb2e7nq97b.png)

这个`zkhst`是由页面请求返回得到的。

得到`zkhst`之后只要将 u 的加密分析出来即可，打上断点，单步调试后可以看到，这个 u 是一个  sha1 加密

至此两个加密参数均已得到，就可以获取页面的数据了。

好了，今天的文章就到这里了，我们下次再会~
