# 清风DJ网在线播放地址JS解密转MP3方法

> **作者**: paxj168 | **发布时间**: 2021-10-26 19:44:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 23751 / 151
> **原文**: [https://www.52pojie.cn/thread-1533870-1-1.html](https://www.52pojie.cn/thread-1533870-1-1.html)

---

前面看到@[ehepls](https://www.52pojie.cn/home.php?mod=space&uid=1656700) 兄弟发布的易语言版，我来发一个python版的

准备工作：

1、网址：https://www.vvvdj.com/play/221250.html
2、python3.9
3、发条JS工具
4、格式工厂

1、抓包
              1-1、谷妹儿浏览器，F12
              1-2、具体内看@[ehepls](https://www.52pojie.cn/home.php?mod=space&uid=1656700) 兄弟发布的方法

![](https://attach.52pojie.cn/forum/202110/26/184733wze5tkj32x65xtem.jpg)

经过分析发现，他的JS并不是独立的，而是在播放页面里面先执行，取得吗m3u8播放地址 + upt的值 + news

[HTML] *纯文本查看*

```
https://tspc.vvvdj.com/c1/2021/10/221250-bf40bf/221250.m3u8?upt=d75e43361637855999&news
```

![](https://attach.52pojie.cn/forum/202110/26/185616qve9twezwgytwqz3.jpg)

2、解密

[JavaScript] *纯文本查看*

```
    function DeCode() {
        this.OO0O00OO00OO = function (a, b) {
            return b > 0 ? a.substring(0, b) : null;
        }, this.OO00OO0O00O0 = function (a, b) {
            return a.length - b >= 0 && a.length >= 0 && a.length - b <= a.length ? a.substring(a.length - b, a.length) : null;
        }, this.O0000OO0OO00O0 = function (a, b) {
            var c, d, e, f, g, h, i, j, k = "";
            for (c = 0; c < b.length; c++) {
                k += b.charCodeAt(c).toString();
            }
            for (d = Math.floor(k.length / 5), e = parseInt(k.charAt(d) + k.charAt(2 * d) + k.charAt(3 * d) + k.charAt(4 * d) + k.charAt(5 * d)),
                     f = Math.round(b.length / 2), g = Math.pow(2, 31) - 1, h = parseInt(a.substring(a.length - 8, a.length), 16),
                     a = a.substring(0, a.length - 8), k += h; k.length > 10; ) {
                k = (parseInt(k.substring(0, 10)) + parseInt(k.substring(10, k.length))).toString();
            }
            for (k = (e * k + f) % g, i = "", j = "", c = 0; c < a.length; c += 2) {
                i = parseInt(parseInt(a.substring(c, c + 2), 16) ^ Math.floor(255 * (k / g))), j += String.fromCharCode(i),
                    k = (e * k + f) % g;
            }
            return j;
        }, this.O0000OO0OO00O = function (a, b, c) {
            return a.length >= 0 ? a.substr(b, c) : null;
        }, this.O0O000000O0O0 = function (a) {
            return a.length;
        }, this.O000O0OO0O0OO = function (a,b) {
            var h, i, j, k, l, m, n, o, p, c = b, d = this.O0O000000O0O0(c), e = d, f = new Array(), g = new Array();
            for (l = 1; d >= l; l++) {
                f[l] = this.O0000OO0OO00O(c, l - 1, 1).charCodeAt(0), g[e] = f[l], e -= 1;
            }
            for (h = "", i = a, m = this.OO0O00OO00OO(i, 2), i = this.OO00OO0O00O0(i, this.O0O000000O0O0(i) - 2),
                     l = 0; l < this.O0O000000O0O0(i); l += 4) {
                j = this.O0000OO0OO00O(i, l, 4), "" != j && (b = this.OO0O00OO00OO(j, 1), k = (parseInt(this.OO00OO0O00O0(j, 3)) - 100) / 3,
                    m == this.O0000OO0OO00O0("a9ab044c634a", "O0000OO0OO00O") ? (n = 2 * parseInt(b.charCodeAt(0)),
                        o = parseInt(f[k]), p = n - o, h += String.fromCharCode(p)) : (n = 2 * parseInt(b.charCodeAt(0)),
                        o = parseInt(g[k]), p = n - o, h += String.fromCharCode(p)));
            }
            return h;
        };
    }
    var x=new DeCode();
    playurl=x.O000O0OO0O0OO('e0>187Q190q193k196Q202N208?214m220W223_226M229o232I235j238[250k2591262J268R271C277:280>283D292A295?298I3012304C31053193325A3281331K3379343C346K355k358<361D373M379[382M385S388M394:397;400P406<4092412q421;448g4574463I466v469]472n475D478K484A490B499o502R5055523J526M532O535H538=541H547A556V559O571N574B57755835586Z595l601X610l613','3DVyqLyrEBCoQP9eNuqpyUEX42V4MsncH289YPId8H6tdqINVGJhi3P1sLWBLSiVQOa4LWOS8W4Q0Ha7BY7M4pDIyeX98PktWhCDvkH6JvuHpnT4fhXC6jY50SwJhKi2LKzNOypTh4th7aKdmZGbYGyJwlvnicKz1DGyF0sbF9eZknPKsHOSzBRdiHh5wG79VOi6B5tfsR0sBAMqzYgP2InT8uR08mz9UXsFGK6qNn8Ult1EOXZFGsBwj58G2NcPgxfKxWXgYMcEcx6uhlOrJ25RrPyPK7svsh8pqQWdXjvl6GVG4ZZjYq8XeDfTRJXCfJvAtKSocvxr5sNJePq6IivoX2Pe0xU47CSipsqUL9AjCwJTqkfweSjiFIzf4mT1pCJgDw9S6omu0udx3rN8kXv46IKWGrS0spAXN2mf3qpwcHDUO8bFojPlHkwtEH8iMeRhISsA4DtKsrWUPdBuCAAd0sNI3ICH4fQ0xvkBdNXE27FSyuTpaM3ZajvoH3Z2');
```

这上面的就是他的加密代码，具体是干了些啥，反正我也不需要理解，主要是理解不了，但不影响我们
我们只知道他的加密入口及解密参数就行了![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)

[JavaScript] *纯文本查看*

```
var x=new DeCode();
playurl=x.O000O0OO0O0OO(参数1，参数2)
```

先请求页面获取参数1，参数2，然后得到在带上参数请求m3u8视频流列表，知道参数怎么来的就好办了![](https://static.52pojie.cn/static/image/smiley/default/4.gif)

2、python3.9获取参数
需要加载几个模块
import asyncio  //这个协助
import aiohttp   //这个是下载
import os
import requests
import re
import execjs  //这个是执行JS的

[JavaScript] *纯文本查看*

```
function DeCode() {
this.OO0O00OO00OO = function(a, b) {
    return b > 0 ? a.substring(0, b) : null;
},
this.OO00OO0O00O0 = function(a, b) {
    return a.length - b >= 0 && a.length >= 0 && a.length - b <= a.length ? a.substring(a.length - b, a.length) : null;
},
this.O0000OO0OO00O0 = function(a, b) {
    var c, d, e, f, g, h, i, j, k = "";
    for (c = 0; c < b.length; c++) {
        k += b.charCodeAt(c).toString();
    }
    for (d = Math.floor(k.length / 5), e = parseInt(k.charAt(d) + k.charAt(2 * d) + k.charAt(3 * d) + k.charAt(4 * d) + k.charAt(5 * d)), f = Math.round(b.length / 2), g = Math.pow(2, 31) - 1, h = parseInt(a.substring(a.length - 8, a.length), 16), a = a.substring(0, a.length - 8), k += h; k.length > 10;) {
        k = (parseInt(k.substring(0, 10)) + parseInt(k.substring(10, k.length))).toString();
    }
    for (k = (e * k + f) % g, i = "", j = "", c = 0; c < a.length; c += 2) {
        i = parseInt(parseInt(a.substring(c, c + 2), 16) ^ Math.floor(255 * (k / g))),
        j += String.fromCharCode(i),
        k = (e * k + f) % g;
    }
    return j;
},
this.O0000OO0OO00O = function(a, b, c) {
    return a.length >= 0 ? a.substr(b, c) : null;
},
this.O0O000000O0O0 = function(a) {
    return a.length;
},
this.O000O0OO0O0OO = function(a, b) {
    var h, i, j, k, l, m, n, o, p, c = b,
    d = this.O0O000000O0O0(c),
    e = d,
    f = new Array(),
    g = new Array();
    for (l = 1; d >= l; l++) {
        f[l] = this.O0000OO0OO00O(c, l - 1, 1).charCodeAt(0),
        g[e] = f[l],
        e -= 1;
    }
    for (h = "", i = a, m = this.OO0O00OO00OO(i, 2), i = this.OO00OO0O00O0(i, this.O0O000000O0O0(i) - 2), l = 0; l < this.O0O000000O0O0(i); l += 4) {
        j = this.O0000OO0OO00O(i, l, 4),
        "" != j && (b = this.OO0O00OO00OO(j, 1), k = (parseInt(this.OO00OO0O00O0(j, 3)) - 100) / 3, m == this.O0000OO0OO00O0("a9ab044c634a", "O0000OO0OO00O") ? (n = 2 * parseInt(b.charCodeAt(0)), o = parseInt(f[k]), p = n - o, h += String.fromCharCode(p)) : (n = 2 * parseInt(b.charCodeAt(0)), o = parseInt(g[k]), p = n - o, h += String.fromCharCode(p)));
    }
    return h;
};
}
function playurl(pj, pj1) {
var x = new DeCode();
playurl = x.O000O0OO0O0OO(pj, pj1);
return playurl;
}
```

![](https://attach.52pojie.cn/forum/202110/26/191427br99b6kb3jbso8gi.jpg)

哈哈哈，可以得到我们想要的参数，请求时候记得一定要带上 headers
带上参数请求m3u8视频流列表信息

[Python] *纯文本查看*

```
def htmlm3u8list(htmls, headers):
    # 创建一个node对象
    node = execjs.get()
    # js源文件编译
    ctx = node.compile(open('./1-01.js', encoding='utf-8').read())
    # 执行JS涵数
    funcname = 'playurl("{0}","{1}")'.format(htmls[0], htmls[1])
    pwd = 'https:' + ctx.eval(funcname)
    tsurl = pwd.split(".m3u8")[0]
    numbeid = tsurl.split('/')[-1]
    data = requests.get(url=pwd, headers=headers).text
    name = numbeid + "-" + htmls[2].replace("(", "").replace(")", "")
    print(name)
    isExists = os.path.exists(name)
    if not isExists:
        os.makedirs(name)
    tslist = re.findall(r'-\d+.ts\?upt=[a-zA-Z0-9]+', data)
    urllist = []
    for ts in tslist:
        sss = tsurl + ts
        urllist.append(sss)
    urllists = [urllist, [name]]
    return urllists
```

到了这里就完成了兄弟前面的效果，但是我想把这个在加深一些，下载
下载有个问题就是，因为一个音频文件他会分成几百个流文件，如果单线程下载的话，会比较慢，然后我就用协程的方法这样快一些

![](https://attach.52pojie.cn/forum/202110/26/192420aul4j5ivgg5jrlsg.jpg)

[Python] *纯文本查看*

```
async def downs(hj):
    async with aiohttp.ClientSession() as session:
        url_list = hj
        name = url_list[1][0]
        print(url_list)
        print(name)
        tasks = [asyncio.create_task(fetch(session, urls, name)) for urls in url_list[0]]
        await asyncio.wait(tasks)

async def fetch(session, urls, name):
    async with session.get(urls, verify_ssl=False) as response:
        content = await response.content.read()
        tslist = re.findall(r'-\d+.ts\?upt=[a-zA-Z0-9]+', urls)
        for ts in tslist:
            filename = ts.replace("-", "").split("?")[0]
            print(filename)
        path = './' + name + './' + filename
        with open(path, "wb") as f:
            f.write(content)
```

下载的时候把ID号和文件名建一个文件夹这样方便管理
例如：221250 + 四会DJ清扬-国粤语Club抖音DjHs华少秋风吹飘来好消息串烧

好，现在流文件下载下来了，就是解决文件合并和转MP3格式了

看到一个兄弟在说在线的视频流文件很小，音质达不到要求，我们把这个问题一起解决了

![](https://attach.52pojie.cn/forum/202110/26/193242rjhszjgblrfhzjom.jpg)

![](https://attach.52pojie.cn/forum/202110/26/193245fhaso8b8of4h48fb.jpg)

网站显示的是 147.2MB   而我们下载下来的只有32.4MB，这个问题只要我们设置一下转换值就可以了
然后就是等几分钟转换好了

![](https://attach.52pojie.cn/forum/202110/26/193704y9pttrl6iy6xi19t.jpg)

![](https://attach.52pojie.cn/forum/202110/26/193706ruejy4gne292x5pv.jpg)

格式工厂比特率选择320，然后我们看一下转换后的文件是否与网站一致

![](https://attach.52pojie.cn/forum/202110/26/194329pqpyz7un7hdgyf7a.jpg)

一毛一样![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)

这个是全代码

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[清风DJ.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjM0MTk0NnxkNzRlMDAzZHwxNzg5OTgwNjQ2fDIzMjM3Mjd8MTUzMzg3MA%3D%3D)
*(2.13 KB, 下载次数: 490)*

https://tspc.vvvdj.com/c1/2021/10/221250-bf40bf/221250.m3u8?upt=d75e43361637855999&news"
https://tspc.vvvdj.com/c1/2021/10/221250-bf40bf/221250.m3u8?upt=d75e43361637855999&news
