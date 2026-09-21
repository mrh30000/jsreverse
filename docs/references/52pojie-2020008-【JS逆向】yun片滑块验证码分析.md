# 【JS逆向】yun片滑块验证码分析

> **作者**: ShriyGo | **发布时间**: 2025-03-30 15:09:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2890 / 14
> **原文**: [https://www.52pojie.cn/thread-2020008-1-1.html](https://www.52pojie.cn/thread-2020008-1-1.html)

---

*本帖最后由 ShriyGo 于 2025-4-2 19:47 编辑*

本文中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责

**站点：aHR0cHM6Ly93d3cueXVucGlhbi5jb20vcHJvZHVjdC9jYXB0Y2hh**

## 1. 抓包分析

主要请求有`get`,`verify`，`get`获取验证码图片，`verify`提交验证

![](https://attach.52pojie.cn/forum/202503/30/150702luh2p3nk2piikn2i.png)

需要逆向的参数就是`cb`,`i`,`k`

## 2. 逆向分析

### 2.1 get

跟栈下断点，刷新验证码

![](https://attach.52pojie.cn/forum/202503/30/150704egnozg4b3t334t40.png)

很容易跟进来，发现加密的几个参数都在这里了

![](https://attach.52pojie.cn/forum/202503/30/150706o141uqh2bc1cw5w2.png)

先大概看下都是哪些

![](https://attach.52pojie.cn/forum/202503/30/150708ou0zs8vkbb0cnv1k.png)

**先处理`cb`。跟栈进去**

![](https://attach.52pojie.cn/forum/202503/30/150710tfvluuvgmlffnfew.png)

本质就是

```
Math.random().toString(32).replace("0.", ""))
```

`cb`搞定。

**再看看a，就是i，k，也就是`this.encrypt(e)`**

跟进去看看

![](https://attach.52pojie.cn/forum/202503/30/150712y49500nulon00sn9.png)

一看到这就有数了，标准的`crypto-js`加密。

```
t = JSON.stringify(t);
                var e = mt.getRandomStr(16)
                  , n = mt.getRandomStr(16);// e n 为加密key和iv
                return {
                    i: lt.a.encrypt(t, ht.a.parse(e), {
                        iv: ht.a.parse(n)
                    }).toString(),
                    k: this.rsaEncrypt(e + n)
                }
            }
```

`k`是rsa加密，`i`不确定，要跟进去找找。

![](https://attach.52pojie.cn/forum/202503/30/150714oikymunr66ihfmfn.png)

看到这就有数了，`AES CBC`。

结论：

> cb: Math.random
>
> i: AES CBC， key和iv为 mt.getRandomStr(16)
>
> k: RSA，公钥就在上面
>
> ![](https://attach.52pojie.cn/forum/202503/30/150716oa82928ie2j32rwe.png)

那么就是看加密明文的组成了。

![](https://attach.52pojie.cn/forum/202503/30/150719q45lurvzr7dv7cr8.png)

> fp:浏览器指纹
>
> browserInfo:浏览器环境相关参数
>
> options:一些固定值

fp简单，浏览器环境值再哈希，由于只是个demo，其他的都可以固定.

那就全部搞定，用标准算法库套一下就🆗了。

![](https://attach.52pojie.cn/forum/202503/30/150721vnzs00vvp9f5b57z.png)

### 2.2 verify

随便拖一次滑块看看。还是定位再第一步的那段方法内。加密方式不变，只是加密明文有变化。

![](https://attach.52pojie.cn/forum/202503/30/150723nx08op04i44tqd1i.png)

分析下明文：

![](https://attach.52pojie.cn/forum/202503/30/150725xsf5ju9zgpo6pg6t.png)

`address、yp_`固定，`fp`逻辑同上，需要处理的就2个，`points`,`distanceX`，而这两个参数来自于前面的栈

![](https://attach.52pojie.cn/forum/202503/30/150727gbrckz7hs4k44qdq.png)

`i`是鼠标移动轨迹

`r`的逻辑：`(this.imgWidth - this.alertImgTag.width) * (this.offsetX / (this.imgWidth - 42)) / n`

## 3. 验证

没问题。轨迹随便搞了搞，r的话值要注意，`this.alertImgTag.width`这个值不一定的，要根据返回的小图图片宽度来，并且背景图有等比例缩放。

![](https://attach.52pojie.cn/forum/202503/30/150729gqctyq8q7aazq2qb.png)
