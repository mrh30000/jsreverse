# js逆向实战案例之-X花顺cookie  V值逆向

> **作者**: zhnn | **发布时间**: 2025-07-22 10:16:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2677 / 24
> **原文**: [https://www.52pojie.cn/thread-2047326-1-1.html](https://www.52pojie.cn/thread-2047326-1-1.html)

---

网站：aHR0cHM6Ly9zdG9jay4xMGpxa2EuY29tLmNuL2hzZHBfbGlzdC9pbmRleF8zLnNodG1s
目标：cookie里面的 V值

![](https://attach.52pojie.cn/forum/202507/22/092520fhb4m7cb7mzmtv4h.png)

**分析：**
**里面就只有一个V值的加密**

![](https://attach.52pojie.cn/forum/202507/22/092933h5mi3qtut5dqueap.png)

写一个hook脚本hook里面的V值，搜关键字太多了

[JavaScript] *纯文本查看*

```
(function (){
    'use strict';
    var cookieTemp = '';
    Object.defineProperty(document, 'cookie', {

        set: function (value) {
            if (value.indexOf('v') !== -1) {
                debugger
            }
            return  value;
        },
         get: function () {

            return cookieTemp;
    },
    });
})();
```

使用浏览器注入上面的脚本

![](https://attach.52pojie.cn/forum/202507/22/093240pidvq5jqltkndrqd.png)

直接断住了，还是比较好用的，接下来我们跟栈分析一下

![](https://attach.52pojie.cn/forum/202507/22/093534ldmw8jvvvesc8gz8.png)

可以看到就是这个W方法里面的update加密的
进去看看

![](https://attach.52pojie.cn/forum/202507/22/093804w1z14dj2dnys42yd.png)

加密逻辑全部在这个js文件里面，我们就全部扣，然后把B方法导出就可以了

![](https://attach.52pojie.cn/forum/202507/22/094000tp44pqmqppk74uk0.png)

大概就是这样

![](https://attach.52pojie.cn/forum/202507/22/094121qxoagxlxowgq2k1k.png)

但是环境还是不完整的，我们需要挂上代理补一下环境，最后环境大概就这么多，不算多

![](https://attach.52pojie.cn/forum/202507/22/094336mvlmabsshlslhjat.png)

环境补完就出值了

![](https://attach.52pojie.cn/forum/202507/22/094436hf27k1m2pfma2zey.png)

最后我们验证一下，看看效果

![](https://attach.52pojie.cn/forum/202507/22/101444r2u2422j2rjlkliu.png)

没问题，模拟成功
