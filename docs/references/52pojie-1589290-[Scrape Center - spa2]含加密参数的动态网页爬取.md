# [Scrape Center - spa2]含加密参数的动态网页爬取

> **作者**: 三滑稽甲苯 | **发布时间**: 2022-02-17 15:35:00 | **版块**: 『编程语言区』 | **查看/回复**: 3687 / 5
> **原文**: [https://www.52pojie.cn/thread-1589290-1-1.html](https://www.52pojie.cn/thread-1589290-1-1.html)

---

## 网址

主站：<https://scrape.center/>
题目：<https://spa2.scrape.center/>

## 前言

这个题目和 [spa1](https://www.52pojie.cn/thread-1589077-1-1.html) 很像，但是难度大了很多，因为它有**加密参数**。但是俗话说得好，功夫不负有心人，只要坚持一定能够拿下它。

## 分析

找到 api 接口，发现相较于 spa1 多了一个 token 参数，那么我们只要找到生成 token 的方法即可。

![](https://attach.52pojie.cn/forum/202202/17/153113xye0itht2s5e4qek.png)

查看它的请求调用堆栈，第一个直接点进去，然后格式化

![](https://attach.52pojie.cn/forum/202202/17/153118qinwn3ala7qpphoy.png)

![](https://attach.52pojie.cn/forum/202202/17/153122frncp45ri4wwwaps.png)

下了断点后发现 `u` 是 `null` ， `d` 就是一个普通的 `XMLHttpRequest` ，并且这个 js 里区分大小写搜索 `token` 后没有出现类似于 `limit: xxx, offset: xxx, token: xxx` 的结构，那大概率是找错地方了

![](https://attach.52pojie.cn/forum/202202/17/153126a5lim9xu5ucli2yc.png)

带有 `:formatted:` 肯定是查看过的 js ，那么接下来看看没有 `:formatted:` 的 js 。

![](https://attach.52pojie.cn/forum/202202/17/153130mp4ipdjk4a0jkycp.png)

跟进去，是不是看到了很熟悉的结构？

![](https://attach.52pojie.cn/forum/202202/17/153133b55sk333d6gskpsi.png)

```
params: {
    limit: this.limit,
    offset: a,
    token: e
}
```

接下来只需要下个断点，看看 `e` 是怎么出来的就好了

![](https://attach.52pojie.cn/forum/202202/17/153137hn4u6nu4n47nfonu.png)

点击第 2 页，看看断到了什么
`Object(i["a"])` 是一个函数

![](https://attach.52pojie.cn/forum/202202/17/153139zk80kn494a1g14gb.png)

同时可以猜测 `this.$store.state.url.index` 是一个定值

![](https://attach.52pojie.cn/forum/202202/17/153142zygneojrzxhu2h3o.png)

`a` 就是简简单单的一个 offset 。
跟进 `Object(i["a"])` ，格式化，计算 `token` 的函数终于映入眼帘

![](https://attach.52pojie.cn/forum/202202/17/153144i2n2ygvn4r14y1xx.png)

猜测 `n` 指代的就是 cryptojs ，这个很容易验证，接下来只要把 js 转为 Python 就好了。
把代码复制下来，进行“翻译”

```
function i() { // arg: '/api/movie', offset
    for (var t = Math.round((new Date).getTime() / 1e3).toString(), e = arguments.length, r = new Array(e), i = 0; i < e; i++)
        //   t = str(int(time()))                                   e = len(args) # 2     r = [?, ?]        for i in range(e)
        r[i] = arguments[i]; // r[i] = args[i]
    r.push(t); // r.append(t)
    var o = n.SHA1(r.join(",")).toString(n.enc.Hex)
    // o = sha1(','.join(str(item) for item in r).encode()).hexdigest()
    //                    ↑ 这里不套一层 str 会导致 Python 报错
      , c = n.enc.Base64.stringify(n.enc.Utf8.parse([o, t].join(",")));
      //c =              b64encode(f'{o},{t}'.encode('utf-8')        ).decode()
      //                 stringify 应该包括了 b64encode 和 decode 两个操作
    return c
}
// token = i("/api/movie", offset)
```

完整的生成 token 代码

```
def generate_token(*args) -> str:
    t = str(int(time()))
    e = len(args)
    r = [None, None]
    for i in range(e):
        r[i] = args[i]
    r.append(t)
    o = sha1(",".join(str(item) for item in r).encode()).hexdigest()
    c = b64encode(f"{o},{t}".encode("utf-8")).decode()
    return c
```

最后在原来代码的基础上添加参数 `token=generate_token("/api/movie", offset)` 即可使用。

## 完整代码

```
from requests import Session
from time import time
from hashlib import sha1
from base64 import b64encode

def show(movies: list):
    for movie in movies:
        print(f"{movie['name']} - {movie['alias']}")
        print("  Score:", movie["score"])
        print("  Tags:", *movie["categories"])
        print("  Regions:", *movie["regions"])
        print(f'  Duration: {movie["minute"]} min')
        print("  Release date:", movie["published_at"])
        print("  Link:", f"https://spa2.scrape.center/detail/{movie['id']}")
        print()

def generate_token(*args) -> str:
    t = str(int(time()))
    e = len(args)
    r = [None, None]
    for i in range(e):
        r[i] = args[i]
    r.append(t)
    o = sha1(",".join(str(item) for item in r).encode()).hexdigest()
    c = b64encode(f"{o},{t}".encode("utf-8")).decode()
    return c

if __name__ == "__main__":
    start = time()
    x = Session()
    LIMIT = 10  # 每次最多获取10条数据
    URL = "https://spa2.scrape.center/api/movie/"
    r = x.get(
        URL, params={"limit": 1, "offset": 0, "token": generate_token("/api/movie", 0)}
    )
    TOTAL = r.json()["count"]
    offset = 0
    while offset < TOTAL:
        r = x.get(
            URL,
            params={
                "limit": LIMIT,
                "offset": offset,
                "token": generate_token("/api/movie", offset),
            },
        )
        show(r.json()["results"])
        offset += LIMIT
    end = time()
    input(f"Time used: {end - start} s.")
```

## 效果图

![](https://attach.52pojie.cn/forum/202202/17/153149tjjy5rmdowrjyd0m.png)
