# pyppeteer过某里纯滑块【通用】

> **作者**: lx7399 | **发布时间**: 2022-05-10 16:46:00 | **版块**: 『编程语言区』 | **查看/回复**: 6826 / 14
> **原文**: [https://www.52pojie.cn/thread-1634219-1-1.html](https://www.52pojie.cn/thread-1634219-1-1.html)

---

*本帖最后由 lx7399 于 2022-5-10 16:58 编辑*

萌新第一次发帖，若有不足之处希望大佬多多指点。

目标地址：

> ```
> aHR0cHM6Ly94ZC5odWF0dS5jb20vbG9naW4=
> ```

缘由：

接触Python有一小段时间了，在某一次模拟登录的时候遇到了某里滑块，像是下面这个样子：

![](https://attach.52pojie.cn/forum/202205/10/163013ivg6gj9vwtoj9xj9.png)

于是启动百度，一顿操作下来，发现网上解决的办法五花八门，鉴于js[破解](https://www.52pojie.cn)难度较大，所以采用爬虫神器Pyppeteer来模拟浏览器pass滑块。

遇到的坑以及具体操作：

本机环境：Win11+Python 3.6.3

首先安装python依赖

```
pip install pyppeteer
```

然后按照Pyppeteer文档以及百度上前辈留下的文章照猫画虎：

import asyncio
from pyppeteer import launch

async def main():
    browser = await launch(headless=False)  # 开启浏览器
    page = await browser.newPage()
    # 进行操作
    await page.goto('目标地址')  # 跳转
    await page.type('.phone', '18812345678')
    await asyncio.sleep(2)
    await page.click('.btn')
    await asyncio.sleep(1)
    # 获取滑块的尺寸
    el = await page.querySelector('#nc\_1\_n1t')
    box = await el.boundingBox()
    # 鼠标悬浮在块上
    await page.hover('#nc\_1\_n1t')
    # 按下鼠标
    await page.mouse.down()
    # 移动鼠标, 数字调试几次就知道了, 延迟设大点
    await page.mouse.move(box['x'] + 500, box['y'] + 5,{'delay': 5000, 'steps': 50})
    # 松开鼠标
    await page.mouse.up()
    # time.sleep(1)
    input()
    await browser.close()  # 关闭

if \_\_name\_\_ == '\_\_main\_\_':
    asyncio.get\_event\_loop().run\_until\_complete(main())

运行，不出意外的话，应该要出问题了，果然：

![](https://attach.52pojie.cn/forum/202205/10/163009i6oipqnee5embzn6.png)

还是检测到自动化浏览器了，验证失败。

接下来思路就很明显了，只要屏蔽掉自动化浏览器的标识，问题应该就解决掉了。于是本着能Ctrl C V绝不自己写的原则，开启百度之旅，但是前辈留下的各种方法都用了，仍然是被检测。

于是，我转变了一个思路，既然被检测指定是pyppeteer源码中有某个标识，代表着pyppeteer启动的浏览器和正常浏览器有着不同，于是我尝试看看能不能从pyppeteer 源码中发现点线索。

![](https://attach.52pojie.cn/forum/202205/10/163028d7n7tx1800ag3v1t.png)

经过一段时间的查找与测试，最终发现，在launcher源码中发现了--enable-automation参数，注释掉，如下图：

![](https://attach.52pojie.cn/forum/202205/10/163030cew3hfwwsq3sseee.png)

再次启动

![](https://attach.52pojie.cn/forum/202205/10/163015ddpazmp9hqexk8om.png)

大功告成！

进一步的分析：

虽然说通过模拟操作，跳过了恶心的JS代码分析，已经可以滑动成功了，但是，在模拟登陆的时候总不能指着自动化来完成操作吧。所以首先看看发送验证码的时候传递了哪些参数吧：

![](https://attach.52pojie.cn/forum/202205/10/163011gljebbugznmuufjk.png)

如图，可以看到，在发送验证码的时候，传递了session\_id、sig、token这几个参数，那这几个参数哪里的呢

![](https://attach.52pojie.cn/forum/202205/10/163005wf9vf5fv7fxfnikd.png)

![](https://attach.52pojie.cn/forum/202205/10/163017pei38isis2zkff83.png)

可以看到，session\_id对应着滑块成功后接口的返回数据csessionid、sig对应value、token对应请求参数的token字段。

这样一来思路就清晰了，能不能通过pyppeteer的某些功能对自动化浏览器的请求和响应进行拦截呢，获取到咱们想要的参数，并且阻止验证码发送接口对验证码的使用，保证验证的有效。查阅相关资料后，实现代码如下：

import asyncio
from urllib.parse import unquote
import json
from pyppeteer import launch

token = ""
csessionid = ""
sig = ""

async def intercept\_request(req):
    global token
    # 拦截token
    if "cf.aliyun.com/nocaptcha/analyze.jsonp" in req.url:
        token = unquote(req.url).split("&t=")[1].split("&scene")[0]
    # 拦截短信发送接口，保证滑块有效
    if "auth/sendMsg" in req.url:
        await req.abort()
    else:
        await req.continue\_()

async def intercept\_response(res):
    global csessionid,sig
    if "cf.aliyun.com/nocaptcha/analyze.jsonp" in res.request.url:
        json\_data = json.loads(str(await res.text()).split("(")[1].split(")")[0])
        csessionid = json\_data["result"]["csessionid"]
        sig = json\_data["result"]["value"]

async def main():
    browser = await launch(headless=False)  # 开启浏览器
    page = await browser.newPage()

    # 启用拦截器
    await page.setRequestInterception(True)
    page.on('request', lambda req: asyncio.ensure\_future(intercept\_request(req)))
    # 设置response拦截器
    page.on('response', lambda rep: asyncio.ensure\_future(intercept\_response(rep)))

    # 进行操作
    await page.goto('目标地址')  # 跳转
    await page.type('.phone', '18812345678')
    await asyncio.sleep(2)
    await page.click('.btn')
    await asyncio.sleep(1)
    # 获取滑块的尺寸
    el = await page.querySelector('#nc\_1\_n1t')
    box = await el.boundingBox()
    # 鼠标悬浮在块上
    await page.hover('#nc\_1\_n1t')
    # 按下鼠标
    await page.mouse.down()
    # 移动鼠标, 数字调试几次就知道了, 延迟设大点
    await page.mouse.move(box['x'] + 500, box['y'] + 5,{'delay': 5000, 'steps': 50})
    # 松开鼠标
    await page.mouse.up()
    # time.sleep(1)
    print(token)
    print(csessionid)
    print(sig)
    print("------------------------------------------------------------------------------------")
    input()
    await browser.close()  # 关闭

if \_\_name\_\_ == '\_\_main\_\_':
    asyncio.get\_event\_loop().run\_until\_complete(main())

运行，Nice！完美获取

![](https://attach.52pojie.cn/forum/202205/10/163007p1um44n45uwqqrw4.png)

举一反三：

虽然说现在此网站的滑块是没有问题的了，但是放到别的网站指定是不行的，那到底能不能做到通用，首先来找一个另一个使用某里滑块的站点，找了一圈，最终发现，常用的某奏云网盘，登陆就是使用的某里滑块，下面分析下。

![](https://attach.52pojie.cn/forum/202205/10/163021dwtz6ulo7p1z53w3.png)

有没有很熟悉的感觉，跟之前目标网站滑块请求的是不是很相似，仔细对比，只有请求时传递的a参数是不一样的，返回字段是一样的。

那么问题来了，总不能每个网站都去做适配，实现自动化吧。那有没有别的解决办法。

经过不断测试，当成功滑动以后，会发送一个这样的GET请求：

https://cf.aliyun.com/nocaptcha/analyze.jsonp?a=XXXXXXXXXX&t=XXXXXXXXXX:1652162973395:0.8002250131556388&scene=nc\_register\_h5.....

这个请求可以请求两次且都可以返回（第三次就不行了，在自动化操作时已使用一次，所以还可以访问一次获取结果）csessionid、sig、value，而且这个a值，在某个特定的网站是不变的。那是不是可以将目标网站滑动验证的请求URL中的a值替换成某奏云网盘的a值，从而过掉某奏云的滑块验证呢？还是利用pyppeteer的拦截实现对a值的替换，下面进行实操：

import asyncio
from urllib.parse import unquote
import json
from pyppeteer import launch

async def intercept\_request(req):
    global token
    # 拦截token
    if "cf.aliyun.com/nocaptcha/analyze.jsonp" in req.url:
        token = unquote(req.url).split("&t=")[1].split("&scene")[0]
        # 打印替换某奏云网盘a值后的地址
        print(req.url.replace('FFFF0N000000000099DF','FFFF0N00000000000555'))
    # 拦截短信发送接口，保证滑块有效
    if "auth/sendMsg" in req.url:
        await req.abort()
    else:
        await req.continue\_()

async def intercept\_response(res):
    global csessionid,sig
    if "cf.aliyun.com/nocaptcha/analyze.jsonp" in res.request.url:
        json\_data = json.loads(str(await res.text()).split("(")[1].split(")")[0])
        csessionid = json\_data["result"]["csessionid"]
        sig = json\_data["result"]["value"]

async def main():
    browser = await launch(headless=False)  # 开启浏览器
    page = await browser.newPage()

    # 启用拦截器
    await page.setRequestInterception(True)
    # 设置requests拦截器
    page.on('request', lambda req: asyncio.ensure\_future(intercept\_request(req)))
    # 设置response拦截器
    page.on('response', lambda rep: asyncio.ensure\_future(intercept\_response(rep)))

    # 进行操作
    await page.goto('目标网站')  # 跳转
    await page.type('.phone', '18812345678')
    await asyncio.sleep(2)
    await page.click('.btn')
    await asyncio.sleep(1)
    # 获取滑块的尺寸
    el = await page.querySelector('#nc\_1\_n1t')
    box = await el.boundingBox()
    # 鼠标悬浮在块上
    await page.hover('#nc\_1\_n1t')
    # 按下鼠标
    await page.mouse.down()
    # 移动鼠标, 数字调试几次就知道了, 延迟设大点
    await page.mouse.move(box['x'] + 500, box['y'] + 5,{'delay': 5000, 'steps': 50})
    # 松开鼠标
    await page.mouse.up()
    # time.sleep(1)
    input()
    await browser.close()  # 关闭

if \_\_name\_\_ == '\_\_main\_\_':
    asyncio.get\_event\_loop().run\_until\_complete(main())

![](https://attach.52pojie.cn/forum/202205/10/163019afi6w6xmfm7tlgfa.png)

成功替换a值，下面进行访问这个url，并可以得到成功返回值。

![](https://attach.52pojie.cn/forum/202205/10/163026v2c0eu3u1y35puk0.png)

那能不能用呢，下面用postman验证下某奏云登录接口。

![](https://attach.52pojie.cn/forum/202205/10/163024kgd3y3y33n01jy1d.png)

完美登录，至此所有的某里纯滑块即可实现通杀，只需替换a值即可！

最近一直在忙毕业论文的事情，零零散散这些搞了一个多星期，希望大家给个免费的评分！

本人小白，菜的扣脚，第一次在吾爱发帖，若有不足希望大佬指点。
本测试仅用于学习交流，请勿用于非法用途，由此产生的法律后果与作者无关。
