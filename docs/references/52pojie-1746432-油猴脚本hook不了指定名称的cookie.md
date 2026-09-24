# 油猴脚本hook不了指定名称的cookie

> **作者**: xzdatm | **发布时间**: 2023-02-15 17:37:00 | **版块**: 『悬赏问答区』 | **查看/回复**: 725 / 0
> **原文**: [https://www.52pojie.cn/thread-1746432-1-1.html](https://www.52pojie.cn/thread-1746432-1-1.html)

---

佬们 请问这个油猴脚本hook网站的指定名称的cookie为什么实现不了？
就是hook-> https://passport.1905.com的PHPSESSID
代码如下:

[JavaScript] *纯文本查看*

```
// ==UserScript==
// [url=home.php?mod=space&uid=170990]@name[/url]         Hook Cookie
// [url=home.php?mod=space&uid=467642]@namespace[/url]    http://tampermonkey.net/
// [url=home.php?mod=space&uid=1248337]@version[/url]      0.1
// @description  try to take over the world!
// [url=home.php?mod=space&uid=686208]@AuThor[/url]       You
// [url=home.php?mod=space&uid=195849]@match[/url]        https://passport.1905.com
// [url=home.php?mod=space&uid=593100]@Icon[/url]         https://passport.1905.com/favicon.ico
// [url=home.php?mod=space&uid=609072]@grant[/url]        none
// @run-at       document-start
// ==/UserScript==

let cookieTemp='';
Object.defineProperty(document,'cookie',{
    set:(newValue)=>{
        console.log('Hook cookie set -->',newValue)

        if(newValue.includes('PHPSESSION')){
            debugger
        }

        return (cookieTemp=newValue)
    },
    get:()=>cookieTemp
})
```

谢谢佬们！
