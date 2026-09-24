# 畅玩空间SVIP解锁（ajaxHooker应用）

> **作者**: 涛之雨 | **发布时间**: 2022-12-04 00:56:00 | **版块**: 『编程语言区』 | **查看/回复**: 1452 / 17
> **原文**: [https://www.52pojie.cn/thread-1722262-1-1.html](https://www.52pojie.cn/thread-1722262-1-1.html)

---

之前和法王 [@冥界3大法王](https://www.52pojie.cn/home.php?mod=space&uid=82258) 玩坦克大战来着，随手就改了一下。。。

解锁 <https://play.wo1wan.com/> 部分SVIP，包括且不限于：

* 修改内置头像（修改变会请刷新页面）（不支持自定义头像）
* 显示banner（没啥用）
* 解锁皮肤（似乎没效果？）
* 解锁存档
* 解锁金手指
* 等……

[【直接安装】](https://greasyfork.org/zh-CN/scripts/455945-wan-svip)

代码

```
// ==UserScript==
// @name         wan-SVIP
// @namespace    svip.wo1wan.taozhiyu.gitee.io
// @version      0.1
// @description  一直解锁一直爽
// @AuThor       涛之雨
// @match        https://play.wo1wan.com/*
// @Icon         https://static.wo1wan.com/headimg/s1/svip/1.gif
// @require      https://greasyfork.org/scripts/455943-ajaxhooker/code/ajaxHooker.js?version=1124435
// @grant        unsafeWindow
// @run-at       document-start
// @license      WTFPL
// ==/UserScript==

/* global ajaxHooker*/
(function() {
    'use strict';
    // cxxjackie 牛逼
    ajaxHooker.hook(request => {
        if (request.url.endsWith('userinfo')) {
            request.response = res => {
                const a=JSON.parse(res.responseText);
                a.info.LevelInfo.VipLevel=10;
                a.info.LevelInfo.Svip=1;
                res.responseText=JSON.stringify(a);
            };
        }
    });
})();
```

啊没错！核心代码就几行。。。

使用了 cxxjackie 的[ajaxHooker库](https://scriptcat.org/script-show-page/637/)（这里的cxxjackie好像不是吾爱破解的cxxjackie？？）

cxxjackie牛逼！
感谢一只大佬的帮助（我也不知道他吾爱有没有号。。。）
