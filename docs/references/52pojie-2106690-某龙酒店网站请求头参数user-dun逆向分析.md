# 某龙酒店网站请求头参数user-dun逆向分析

> **作者**: zouziao | **发布时间**: 2026-05-08 15:14:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2479 / 10
> **原文**: [https://www.52pojie.cn/thread-2106690-1-1.html](https://www.52pojie.cn/thread-2106690-1-1.html)

---

## 本文仅供学习交流，因使用本文内容而产生的任何风险及后果，作者不承担任何责任

### 某龙酒店网站请求头参数user-dun逆向分析

网站：aHR0cHM6Ly93d3cuZWxvbmcuY29tLw==

接口：aHR0cHM6Ly93d3cuZWxvbmcuY29tL3RhcGkvdjIvbGlzdA==

新人第一次发帖请多包涵

#### 一、分析加密位置

通过hook XMLHttpRequest.setRequestHeader跟栈找到加密参数位置

![](https://ps.ssl.qhimg.com/t029c62b7abe31df57e.jpg)

发现加密参数由异步方法传入(“get”,e: 接口，t：请求参数)生成，继续跟进Gw函数内部

![](https://ps.ssl.qhimg.com/t027471c28925df47ae.jpg)

发现最终参数经过处理后经过window.h5sign.sign生成

#### 二、扣代码

先将Gw函数扣下来，放到本地，并删掉try和catch方便调试

注意到i变量引用了Nw.stringify做处理，在浏览器运行发现不是JSON.stringify，运行结果如下：

![](https://ps.ssl.qhimg.com/t02898364ad731def16.jpg)

用ai还原逻辑：

```
const Nw = {
    stringify: function(obj, options) {
        // 基础实现：处理扁平对象，值转为字符串并做 URI 编码
        if (!obj || typeof obj !== 'object') return '';

        const pairs = [];
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let value = obj[key];
                // 可选的过滤器（类似之前代码中的 filter 参数）
                if (options && typeof options.filter === 'function') {
                    // 过滤器接收 key 和 value，若返回 false 则跳过该字段
                    if (options.filter(key, value) === false) continue;
                }
                // 若值为对象/数组，可自行扩展为 JSON 或递归
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        }
        return pairs.join('&');
    }
};
```

由于Gw是个异步函数,询问ai后以这种方法执行

```
function get_dun (param){
    (async () => {
        const n = await Gw("get", "接口", param);
        console.log(n.value);
        return n.value;
    })();
}
get_dun(params)
```

继续跟入window.h5sign.sign 进入 dun.min.1.1.4.5.js 发现里面做了混淆

![](https://ps.ssl.qhimg.com/t02fb9756fa6d9126da.jpg)

于是选择将代码进行全扣，放到本地

#### 三、补环境

在文末附上我平时用来补环境的模板

使用模板后发现直接出值了，但是长度还远远不够,并且值不可用

![](https://ps.ssl.qhimg.com/t02ed939a0e8e86759c.jpg)

而且程序还停不下来，于是先把setTimeout置空，原因稍后解释

再将undefined的值补完,长度来到了416位，这时候值已经可用了

![](https://ps.ssl.qhimg.com/t0291769ea6c1e7eb9d.jpg)

#### 四、进一步分析

回到代理吐出的信息，我们发现还有1个值我们没有搞明白怎么来的

就是这个在window里的dif

![](https://ps.ssl.qhimg.com/t02ec7b188534d3f023.jpg)

通过用ai写的脚本hook window.dif

```
// hook_window_dif.js
(function() {
    'use strict';

    // 存储内部实际值
    let _dif = window.dif;

    // 劫持 window.dif 的 getter / setter
    Object.defineProperty(window, 'dif', {
        configurable: true,   // 允许重新定义
        enumerable: true,
        get: function() {
            console.log('[Hook] 读取 window.dif →', _dif);
            return _dif;
        },
        set: function(newValue) {
            console.group('[Hook] window.dif 被修改');
            console.log('旧值:', _dif);
            console.log('新值:', newValue);
            console.trace('调用栈'); // 打印调用位置（部分浏览器支持）
            console.groupEnd();
            _dif = newValue;
        }
    });

    // 如果原来的 dif 已经是对象/函数，但你想继续保留它原有的引用？以上实现已经保留。
    // 可选：首次打印一下当前值
    console.log('[Hook] 已启用 window.dif 劫持，当前值:', _dif);
})();
```

我们发现这个值在浏览器中每隔一段时间会变换一次

通过调用栈可以发现，一个计时器一直在被递归调用，刷新dif的值，这就解释了为什么刚刚不置空setTimeout程序会一直运行

于是我们定位到代码的位置，注释掉计时器让其只在开始时运行一次

![](https://ps.ssl.qhimg.com/t02c851138c77e25feb.jpg)

再次运行，发现dif仍是未定义

再次回到代码中分析,发现函数cD，实际上就是调用函数M0,而函数M0被try和catch包裹

![](https://ps.ssl.qhimg.com/t025399b8523e4bb1e8.jpg)

去掉try和catch再运行，果然报错

![](https://ps.ssl.qhimg.com/t02c82e07dcd42b7f7e.jpg)

随后根据代理信息补上canvas和video标签后，便可出值，补法这里直接给出代码

```
createConstructor("CanvasRenderingContext2D",true, [],{
    "direction": "ltr",
    fillRect:function (args){console.log("调用了CanvasRenderingContext2D.fillRect方法，参数为:", args)},
    fillText:function (args){console.log("调用了CanvasRenderingContext2D.fillText方法，参数为:", args)},
    "fillStyle": "#000000",
    "filter": "none",
    "font": "10px sans-serif",
    "fontKerning": "auto",
    "fontStretch": "normal",
    "fontVariantCaps": "normal",
    "globalAlpha": 1,
    "globalCompositeOperation": "source-over",
    "imageSmoothingEnabled": true,
    "imageSmoothingQuality": "low",
    "lang": "inherit",
    "letterSpacing": "0px",
    "lineCap": "butt",
    "lineDashOffset": 0,
    "lineJoin": "miter",
    "lineWidth": 1,
    "miterLimit": 10,
    "shadowBlur": 0,
    "shadowColor": "rgba(0, 0, 0, 0)",
    "shadowOffsetX": 0,
    "shadowOffsetY": 0,
    "strokeStyle": "#000000",
    "textAlign": "start",
    "textBaseline": "alphabetic",
    "textRendering": "auto",
    "wordSpacing": "0px"
})
createConstructor("HTMLElement", true, [], {
    toDataURL:function (args){console.log("调用了HTMLElement.toDataURL方法，参数为:", args);return 'data:image/png;base64,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'},
    canPlayType:function (args){console.log("调用了HTMLElement.canPlayType方法，参数为:", args)},
    getContext:function (args){console.log("调用了HTMLElement.getContext方法，参数为:", args)
        if(args==="2d"){
            return watch(new CanvasRenderingContext2D(null, null, "yuan"), "CanvasRenderingContext2D")
        }

    },
    toBuffer:function (args){console.log("调用了HTMLElement.toBuffer方法，参数为:", args)},
}, "Element");
createConstructor("HTMLScriptElement", true, [], {},"HTMLElement");
document.createElement=function (args){
    console.log("调用了document.createElement方法，参数为:", args)
    if(args==="canvas"){
        return watch(new HTMLElement(null, null, "yuan"), "canvas")
    }
    if(args==="video"){
        return watch(new HTMLElement(null, null, "yuan"), "vedio")
    }
}
```

![](https://ps.ssl.qhimg.com/t021d95be221efb2117.jpg)

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[环境.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=Mjg1MDA2NXw3MzljMzNkOXwxNzkwMDA0Mjc0fDIzMjM3Mjd8MjEwNjY5MA%3D%3D)
*(4.72 KB, 下载次数: 23)*
