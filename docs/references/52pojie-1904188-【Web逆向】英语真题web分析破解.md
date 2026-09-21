# 【Web逆向】英语真题web分析破解

> **作者**: hualy | **发布时间**: 2024-03-21 22:45:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6758 / 102
> **原文**: [https://www.52pojie.cn/thread-1904188-1-1.html](https://www.52pojie.cn/thread-1904188-1-1.html)

---

*本帖最后由 hualy 于 2024-5-20 16:55 编辑*

[color=var(--a-color) !important]英语真题在线 - 官网:<https://zhenti.burningvocabulary.com/>            ![](https://wdcdn.qpic.cn/MTMxMDI2NjIxNjUxODY1MTM_26134_d_LLW1ocl1KH6URi_1710995242?sign=1711031715-1787695182-0-40ee64804a7a4a936d1bc9481a97785a)            在看的时候，点击查询，发现够次数了。我肯定不爽啦，于是我想跳过这个，这个网页，我没有登录账号，我就觉得这个是跟本地想关联的，于是我开始F12            ![](https://wdcdn.qpic.cn/MTMxMDI2NjIxNjUxODY1MTM_792446_ajgMNpMWzuT8HZUM_1710995593?sign=1711031715-91530224-0-1b0c426f8bd0db9da24305db8dff3126)            发现在本地存储那有一个跟次数相关的内容，把数据Clear掉后，发现重新可以用了            ![](https://wdcdn.qpic.cn/MTMxMDI2NjIxNjUxODY1MTM_92246_OJ8LrymXoU_FjqKd_1710995569?sign=1711031715-1512506339-0-43f9f47d2edce4c3b9835ee3318553c7)            所以，可以肯定，查询次数的限制就是跟本地存储有关，于是我把extra\_data删除掉，发现又可以重新查询了            ![](https://wdcdn.qpic.cn/MTMxMDI2NjIxNjUxODY1MTM_90433_8R_aVMr6kWMaI-Ma_1710997251?sign=1711031715-648795350-0-0e8f97b29c62799a70eb944d543c4549)            于是，用油猴做了个脚本，用ai写的，可以实现，触发点击事件，删除extra\_data。

[JavaScript] *纯文本查看*

```

// ==UserScript==
// [url=home.php?mod=space&uid=170990]@name[/url]         英语真题在线解锁无限次数查单词
// [url=home.php?mod=space&uid=1248337]@version[/url]      1.0
// @description  每点击一次，删除本地存储中的特定键值对
// [url=home.php?mod=space&uid=686208]@AuThor[/url]       hualy13
// [url=home.php?mod=space&uid=195849]@match[/url]        *://zhenti.burningvocabulary.com/*
// [url=home.php?mod=space&uid=609072]@grant[/url]        none
// ==/UserScript==
(function() {
    'use strict';
&#8203;
    // 添加点击事件监听器
    document.addEventListener('click', function() {
        // 执行localStorage.removeItem('extra_data')
        localStorage.removeItem('extra_data');
    });
})();
```

最后，希望抛砖引玉，把另外的vip功能进行[破解](https://www.52pojie.cn)，如听力原文、真题生词本的导出中英对照PDF功能
