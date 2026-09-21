# h5st纯ai补环境+逆向

> **作者**: 过往233 | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 5504 / 36
> **原文**: [https://www.52pojie.cn/thread-2092635-1-1.html](https://www.52pojie.cn/thread-2092635-1-1.html)

---

* 本帖最后由 过往233 于 2026-2-22 08:04 编辑 *

大家好我是个逆向小白，一直想搞h5st，但是每次都不知道该怎么搞，总是插桩到一半由于手头有各种事情耽搁了，上个月看到了一个大佬的文章，ai逆向，寻思试一试，没想到补环境1个小时不到就自己补好了，纯算从头来耽搁了两天走了不少弯路

先来说说心路历程，我是直接用补完的环境直接丢给ai让ai去操作，让他把补环境版本改成纯算版本，想法挺好现实给了一记重锤，ai直接去静态分析，然后上下文吃满，直接忘掉了最一开始的要求

算了，别的不多说了直接放总结吧，总之ai确实不错，而且还有待提升的空间，比如利用mcp添加更完善的提示词

哦对了xsh的补环境也搞出来了，直接把两个js一丢给ai他自己就可以搞好

以下是纯算和补环境的总结

## h5st 签名本地化 — 完整对话记录

### 第一轮：补环境，让 JS 能在 Node.js 里跑

**我：**

底下那段是 ParamsSign 调用接口，我需要你帮我补环境让我可以本地运行 JS。

**AI：**

分析了

```
1.js
```

（约 10500 行混淆代码），发现它重度依赖浏览器全局对象：window、document、navigator、localStorage、XMLHttpRequest、screen 等。底部还有 TypeScript 语法（

```
const time: any
```

）在 Node 里跑不了。

创建了两个文件：

*

```
env.js
```

— 补浏览器环境（window、document、navigator、localStorage、screen、crypto 等）

*

```
run.js
```

— 入口文件，加载环境后调用 ParamsSign 进行签名

原

```
1.js
```

底部的 TypeScript 调用代码已移除。

运行方式：

```
cd h5stai醇酸 && node run.js
```

### 第二轮：用生成的 h5st 发请求，遇到 403

**我：**

（贴了一段 curl 命令，包含完整的 headers、cookies 和 h5st）

带着生成的 h5st 请求这个试试。

**AI：**

签名生成成功了，h5st 正常产出。但请求返回了 403。初步判断可能是 cookie 过期。

**我：**

算了我不要发请求测试了，给我直接生成下 h5st：

```

```

{
"appid": "search-pc-java",
"functionId": "pc_search_adv_Search",
"client": "pc",
"clientVersion": "1.0.0",
"t": 1771501263005,
"body": "881e4ddbb37b54759c65772e65dda6cb04433e3b0dd553eb89e698d51c67daf1"
}

```

```

**AI：**

生成成功，

```
run.js
```

已精简成纯签名模式，改底部参数就能生成不同的 h5st。

### 第三轮：写 Python 脚本自动调签名

**我：**

（贴了一段 Python 代码，包含 headers、cookies、body、h5st）

来替换这个的 h5st 试试。

**AI：**

改造了流程：

```
run.js
```

接受命令行 JSON 参数输出 h5st，

```
1.py
```

调用它自动替换。

测试结果还是 403。

**我：**

现在是没问题的。（把 h5st 注释掉了，不带 h5st 能正常请求）

**AI：**

看到了，不带 h5st 能通。需要自动生成的时候把

```
get_h5st
```

函数加回来就行。

**我：**

我需要你把 h5st 加过来。

**AI：**

把自动生成 h5st 的逻辑加到了

```
1.py
```

里。

### 第四轮：排查 403 的真正原因

**我：**

现在报错 403，body 不应该换。

**AI：**

开始排查。发现 Python 端用

```
hashlib.sha256
```

算的 body hash 和 JS 内部算的不一致。改成直接把原始 body 传给 JS，让 JS 内部统一处理。

还是 403。

**我：**

2.py 是正常能请求的，也就是说你的 h5st 生成的不对。

**AI：**

对比发现

```
2.py
```

用的是原始抓包的固定 h5st，能正常返回 200。确认 cookie 没问题，问题在 h5st 签名本身。

### 第五轮：发现 signAppId 和 appid 是两个不同的值

**AI：**

发现关键区别：

*

```
ParamsSign({ appId: '01a47' })
```

— 构造函数用

```
01a47
```

（h5st 第三段）

*

```
sign({ appid: 'pc-rate-qa', ... })
```

— sign 参数里用

```
pc-rate-qa
```

（POST data 里的 appid）

之前把这两个混在一起了。分开后还是 403。

### 第六轮：发现 token 问题（tk05 vs tk03）

**AI：**

通过 hook 内部方法，发现签名流程：

*

```
_$cps
```

— 排序参数

*

```
_$rds
```

— 获取 token

*

```
_$clt
```

— 环境检测（收集浏览器指纹）

*

```
_$ms
```

— 主签名逻辑

*

```
_$gdk
```

— 用 token 派生密钥

*

```
_$gs
```

/

```
_$gsd
```

— 计算签名和摘要

*

```
_$gsp
```

— 拼接最终 h5st

关键发现：我们生成的 h5st 里 token 是

```
tk05
```

（本地生成），但原始抓包的是

```
tk03
```

（远程获取）。

原因：

```
_onRequestTokenRemotely
```

是空函数，没有真正去服务端请求 token。token 请求发到

```
https://cactus.jd.com/request_algo
```

。

修复：在

```
env.js
```

里实现了真正能发 HTTP 请求的 XMLHttpRequest（基于 Node.js 的

```
https
```

模块），让 token 请求能正常工作。

修复后 token 变成了

```
tk03
```

，但还是 403。

### 第七轮：找到根本原因 — Node.js 内置 navigator

**AI：**

用 Proxy 监控

```
_$clt
```

（环境检测方法）执行时访问的属性：

*

```
document.cookie
```

*

```
navigator.languages
```

*

```
navigator.plugins
```

*

```
navigator.userAgent
```

*

```
document.head
```

*

```
document.body
```

*

```
document.all
```

*

```
navigator.hardwareConcurrency
```

检查实际值发现：

属性
期望值
实际值

```
navigator.userAgent
```
