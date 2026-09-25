# [JavaScript] GitHub 去跟踪原理

> **作者**: 三滑稽甲苯 | **发布时间**: 2024-10-03 22:09:00 | **版块**: 『编程语言区』 | **查看/回复**: 2113 / 9
> **原文**: [https://www.52pojie.cn/thread-1969514-1-1.html](https://www.52pojie.cn/thread-1969514-1-1.html)

---

*本帖最后由 三滑稽甲苯 于 2024-10-3 22:22 编辑*

### 前言

众所周知，GitHub 会对用户操作信息进行收集，装上 uBlock Origin 并且订阅了 EasyPrivacy 规则后即可在控制台中看到被屏蔽的请求：

![](https://attach.52pojie.cn/forum/202410/03/220738kgaa8dnzvqdshnhl.jpg)

那么我们的目标就是阻止对这两个网站的请求的发送。注意，我们想要的是将其扼杀在摇篮里，而不是等它将要发送的时候再阻止。

### Part 1

既然对 `https://collector.github.com/github/collect` 的请求较多，那就先分析这个网址。从网络面板中找到请求，然后检视它的调用堆栈：

![](https://attach.52pojie.cn/forum/202410/03/220734pxbrbh9zb1cb1c77.jpg)

进入最顶部的调用者，可以看到是这一行代码发出的请求：

![](https://attach.52pojie.cn/forum/202410/03/220731oibc85ghwthjp284.jpg)

要是我们可以阻止 `hydroAnalyticsClient` 初始化就好了。搜索此变量，可以发现其初始化的位置：

![](https://attach.52pojie.cn/forum/202410/03/220729ly0tz2o6yton5025.jpg)

主要考虑怎么在 `getOptionsFromMeta` 或 `new AnalyticsClient` 时出错，那么根据代码和注释 (`This most likely means analytics are disabled.`)，应该是不会进行信息收集了。往上翻代码，可以看到这俩玩意都是从 `@github/hydro-analytics-client` 导入的：

```
import {AnalyticsClient, getOptionsFromMeta} from '@github/hydro-analytics-client'
import type {Context} from '@github/hydro-analytics-client'
// ...
```

那么我们随便下个断点，刷新页面来寻找这俩玩意代码的位置。首先看 `AnalyticsClient`：

![](https://attach.52pojie.cn/forum/202410/03/220726h5v6xlqoaz0yudq6.jpg)

这里点进去，可以看到它的定义：

![](https://attach.52pojie.cn/forum/202410/03/220753tqkqda30cbkqkk3k.jpg)

经检查，没有可以利用的地方，那么我们继续检查 `getOptionsFromMeta`：

![](https://attach.52pojie.cn/forum/202410/03/220751ih484hwi59hxh4ha.jpg)

```
// 源代码映射: https://github.githubassets.com/assets/node_modules/@github/hydro-analytics-client/dist/meta-helpers.js
export function getOptionsFromMeta(prefix = 'ha') {
    let collectorUrl;
    const baseContext = {};
    const metaTags = document.head.querySelectorAll(`meta[name^="${prefix}-"]`);
    for (const meta of Array.from(metaTags)) {
        const { name: originalName, content } = meta;
        const name = originalName.replace(`${prefix}-`, '').replace(/-/g, '_');
        if (name === 'url') {
            collectorUrl = content;
        }
        else {
            baseContext[name] = content;
        }
    }
    if (!collectorUrl) {
        throw new Error(`AnalyticsClient ${prefix}-url meta tag not found`);
    }
    return {
        collectorUrl,
        ...(Object.keys(baseContext).length > 0 ? { baseContext } : {})
    };
}
```

可以看到，它是从文档头部所有 `name` 属性以 `${prefix}-` 开头的 `meta` 元素中获取配置信息。根据前面 `hydro-analytics.ts` 中的代码 `const options = getOptionsFromMeta('octolytics')`，或者自行下断点，我们都可以知道这里 `prefix === "octolytics"`。继续分析代码，可以发现如果不存在 `name` 属性 为 `${prefix}-url` 的元素时，`collectorUrl` 就会为 `undefined`，那么后续代码就会报错，从而达成我们的目的。既然如此，阻止这块的信息收集就轻而易举了：

```
$$("meta[name^=octolytics-]").forEach(el => el.remove());
```

需要注意的是，这一段代码必须在 `getOptionsFromMeta` 之前被调用，否则就太晚了。若使用篡改猴的话，需要设置 `@run-at document-start`。

### Part 1 - 验证

```
// ==UserScript==
// @name         GitHub Tracking Prevention Test
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  try to take over the world!
// @author       PRO-2684
// @match        https://github.com/*
// @icon         https://github.com/favicon.ico
// @run-at       document-start
// @license      gpl-3.0
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const $$ = document.querySelectorAll.bind(document);
    $$("meta[name^=octolytics-]").forEach(el => el.remove());
})();
```

安装上述脚本，随后清空网络日志并刷新页面。在网络日志中搜索关键词 `collect`，并未找到任何结果，可知我们已经成功阻止了向这个网址提交的跟踪信息。

![](https://attach.52pojie.cn/forum/202410/03/220749xmb7j0b0p9rcaldb.jpg)

### Part 2

接下来，我们分析 `https://api.github.com/_private/browser/stats`。同 Part 1，我们从网络面板中找到请求，然后检视它的调用堆栈：

![](https://attach.52pojie.cn/forum/202410/03/220746h3gdagpduclupy0y.jpg)

进入最顶部的调用者，可以看到是这一行代码发出的请求：

![](https://attach.52pojie.cn/forum/202410/03/220744nolaldezgzjhvuec.jpg)

心急的朋友肯定有这个想法：把 [`navigator.sendBeacon`](https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator/sendBeacon) 覆盖掉不就好了？我知道你很急，但是你先别急。可以看到这是在函数 `safeSend` 内被调用的，那么我们就先看看到底是谁调用了这个函数。在文件内搜索关键词 `safeSend`，只找到了另外一处匹配：

![](https://attach.52pojie.cn/forum/202410/03/220742zefnos3eeim4el83.jpg)

查看附近代码，发现可以利用的点：

```
const url = ssrSafeDocument?.head?.querySelector<HTMLMetaElement>('meta[name="browser-stats-url"]')?.content
if (!url) {
  return
}
```

那么我们只需要移除文档头中 `name` 属性为 `browser-stats-url` 的 `meta` 元素即可。需要注意的是，这一段代码必须在 `flushStats` 之前被调用，否则就太晚了。若使用篡改猴的话，需要设置 `@run-at document-start`。是不是和 Part 1 十分相似呢？

```
$("meta[name=browser-stats-url]")?.remove();
```

### Part 2 - 验证

```
// ==UserScript==
// @name         GitHub Tracking Prevention Test
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  try to take over the world!
// @author       PRO-2684
// @match        https://github.com/*
// @icon         https://github.com/favicon.ico
// @run-at       document-start
// @license      gpl-3.0
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    $$("meta[name^=octolytics-]").forEach(el => el.remove());
    $("meta[name=browser-stats-url]")?.remove();
})();
```

更新上述脚本，随后清空网络日志并刷新页面。在网络日志中搜索关键词 `stats`，并未找到任何结果，可知我们已经成功阻止了向这个网址提交的跟踪信息。

![](https://attach.52pojie.cn/forum/202410/03/220740a8d2fpp3mpzm81kv.jpg)

### 后言

带有此功能的脚本已上传至 [GreasyFork](https://greasyfork.org/scripts/510742)，欢迎各位安装体验。除了阻止跟踪的功能外，它还可以显示 Release 中文件的上传者、下载次数与下载次数直方图。若有需要，我可以新开一个帖子讲解这些功能的实现方法。

![](https://raw.githubusercontent.com/PRO-2684/gadgets/refs/heads/main/github_plus/assets.jpg)
