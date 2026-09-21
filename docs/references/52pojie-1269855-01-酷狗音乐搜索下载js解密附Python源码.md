# 01-酷狗音乐搜索下载js解密附Python源码

> **作者**: miboy | **发布时间**: 2020-09-18 14:44:00 | **版块**: 『编程语言区』 | **查看/回复**: 5610 / 8
> **原文**: [https://www.52pojie.cn/thread-1269855-1-1.html](https://www.52pojie.cn/thread-1269855-1-1.html)

---

*本帖最后由 miboy 于 2020-9-18 14:47 编辑*

## 01-酷狗音乐搜索下载

原文：<https://www.yuque.com/docs/share/1c3cd2ef-9bce-4427-a402-ec733488f6cd>?# 《01-酷狗音乐搜索下载》

##### 分析问题

需要下载音乐，首先最重要的是得到音乐的下载url，发现在听歌页面，会发送一个get请求，得到歌曲的下载mp3地址。而这个地址，是需要HASH参数，其他参数测试可以忽略。<br />那新的问题就是如何得到一系列我要的歌曲的HASH？<br />发现在酷狗搜索页面，搜索某个歌手，就可以在搜索请求中，发现GET请求，会返回搜索歌手的歌曲，其中参数FileHash即上文歌曲hash。<br />

<a name="BslK4"></a>

##### 实现搜索页面结果

<br />当在表单搜索“许嵩”，会发现页面发起了4个请求。其中

> <https://complexsearch.kugou.com/v2/search/song?callback=callback123&keyword=%E8%AE%B8%E5%B5%A9&page=1&pagesize=30&bitrate=0&isfuzzy=0&tag=em&inputtype=0&platform=WebFilter&userid=-1&clientver=2000&iscorrection=1&privilege_filter=0&srcappid=2919&clienttime=1600304102390&mid=1600304102390&uuid=1600304102390&dfid=-&signature=99B1C89A2402FFD00BA141EF34811A87>

请求的输出结果是歌曲的列表信息。<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/1563201/1600304625074-2f80baeb-74e7-4b6a-a49f-8438b89719f3.png#align=left&display=inline&height=588&margin=%5Bobject%20Object%5D&name=image.png&originHeight=588&originWidth=793&size=61616&status=done&style=stroke&width=793)<br />而链接中我尝试减少各别参数，譬如：callback、platform等看起来不那么重要的参数，均无法再次请求得到数据。<br />根据经验：这些必要字段都参与数据加密，而这个加密结果，想必就是signature的值，signature就在其中充当数据校验的作用（如果开发过API就应该清楚）<br />
<br />接下来就要观察，这个signature是由哪些参数，以哪种形式，以哪种加密方式得到的

全局搜索signature。<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/1563201/1600305109891-1455e422-845e-44f9-b639-051e669d15c4.png#align=left&display=inline&height=498&margin=%5Bobject%20Object%5D&name=image.png&originHeight=498&originWidth=1092&size=59552&status=done&style=stroke&width=1092)<br />不属意外，就一个搜索结果。

> o.unshift(p),
> o.push(p),
> h.signature = faultylabs.MD5(o.join("")),

我们可以通过以上代码发现，变量o实际上就是数组，因为o有unshift和push方法。然后再把o以字符串方式拼接。通过 faultylabs.MD5 函数加密后得到signature值。

那就把o这个值加入watch列表，尝试再次下断点，再次搜索“林俊杰”，观察断点情况。

![image.png](https://cdn.nlark.com/yuque/0/2020/png/1563201/1600305095154-ac31f7c2-663e-46bd-8fc3-667291d141ad.png#align=left&display=inline&height=573&margin=%5Bobject%20Object%5D&name=image.png&originHeight=573&originWidth=1534&size=73036&status=done&style=stroke&width=1534)<br />接下来从两个方向解决问题：1.得到参数；2.得到加密。

* 得到参数：

上文提到，参数即o数组转为字符串。

> NVPh5oo715z5DIWAeQlhMDsWXXQV4hwtbitrate=0callback=callback123clienttime=1600305065609clientver=2000dfid=-inputtype=0iscorrection=1isfuzzy=0keyword=林俊杰mid=1600305065609page=1pagesize=30platform=WebFilterprivilege\_filter=0srcappid=2919tag=emuserid=-1uuid=1600305065609NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt

其中发现"NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt"首尾是固定不变的。这也是signature中常见的手法。<br />而其他的一些诸如clienttime、uuid、mid他们都应该是13位时间戳。<br />

* 得到加密：

  ```
  "undefined" == typeof faultylabs && (faultylabs = {}),
  faultylabs.MD5 = function(a) {
  function b(a) {
      var b = (a >>> 0).toString(16);
      return "00000000".substr(0, 8 - b.length) + b
  }
  function c(a) {
      for (var b = [], c = 0; c < a.length; c++)
          b = b.concat(k(a[c]));
      return b
  }
  function d(a) {
      for (var b = [], c = 0; 8 > c; c++)
          b.push(255 & a),
          a >>>= 8;
      return b
  }
  function e(a, b) {
      return a << b & 4294967295 | a >>> 32 - b
  }
  function f(a, b, c) {
      return a & b | ~a & c
  }
  function g(a, b, c) {
      return c & a | ~c & b
  }
  function h(a, b, c) {
      return a ^ b ^ c
  }
  function i(a, b, c) {
      return b ^ (a | ~c)
  }
  function j(a, b) {
      return a[b + 3] << 24 | a[b + 2] << 16 | a[b + 1] << 8 | a[b]
  }
  function k(a) {
      for (var b = [], c = 0; c < a.length; c++)
          if (a.charCodeAt(c) <= 127)
              b.push(a.charCodeAt(c));
          else
              for (var d = encodeURIComponent(a.charAt(c)).substr(1).split("%"), e = 0; e < d.length; e++)
                  b.push(parseInt(d[e], 16));
      return b
  }
  function l() {
      for (var a = "", c = 0, d = 0, e = 3; e >= 0; e--)
          d = arguments[e],
          c = 255 & d,
          d >>>= 8,
          c <<= 8,
          c |= 255 & d,
          d >>>= 8,
          c <<= 8,
          c |= 255 & d,
          d >>>= 8,
          c <<= 8,
          c |= d,
          a += b(c);
      return a
  }
  function m(a) {
      for (var b = new Array(a.length), c = 0; c < a.length; c++)
          b[c] = a[c];
      return b
  }
  function n(a, b) {
      return 4294967295 & a + b
  }
  function o() {
      function a(a, b, c, d) {
          var f = v;
          v = u,
          u = t,
          t = n(t, e(n(s, n(a, n(b, c))), d)),
          s = f
      }
      var b = p.length;
      p.push(128);
      var c = p.length % 64;
      if (c > 56) {
          for (var k = 0; 64 - c > k; k++)
              p.push(0);
          c = p.length % 64
      }
      for (k = 0; 56 - c > k; k++)
          p.push(0);
      p = p.concat(d(8 * b));
      var m = 1732584193
        , o = 4023233417
        , q = 2562383102
        , r = 271733878
        , s = 0
        , t = 0
        , u = 0
        , v = 0;
      for (k = 0; k < p.length / 64; k++) {
          s = m,
          t = o,
          u = q,
          v = r;
          var w = 64 * k;
          a(f(t, u, v), 3614090360, j(p, w), 7),
          a(f(t, u, v), 3905402710, j(p, w + 4), 12),
          a(f(t, u, v), 606105819, j(p, w + 8), 17),
          a(f(t, u, v), 3250441966, j(p, w + 12), 22),
          a(f(t, u, v), 4118548399, j(p, w + 16), 7),
          a(f(t, u, v), 1200080426, j(p, w + 20), 12),
          a(f(t, u, v), 2821735955, j(p, w + 24), 17),
          a(f(t, u, v), 4249261313, j(p, w + 28), 22),
          a(f(t, u, v), 1770035416, j(p, w + 32), 7),
          a(f(t, u, v), 2336552879, j(p, w + 36), 12),
          a(f(t, u, v), 4294925233, j(p, w + 40), 17),
          a(f(t, u, v), 2304563134, j(p, w + 44), 22),
          a(f(t, u, v), 1804603682, j(p, w + 48), 7),
          a(f(t, u, v), 4254626195, j(p, w + 52), 12),
          a(f(t, u, v), 2792965006, j(p, w + 56), 17),
          a(f(t, u, v), 1236535329, j(p, w + 60), 22),
          a(g(t, u, v), 4129170786, j(p, w + 4), 5),
          a(g(t, u, v), 3225465664, j(p, w + 24), 9),
          a(g(t, u, v), 643717713, j(p, w + 44), 14),
          a(g(t, u, v), 3921069994, j(p, w), 20),
          a(g(t, u, v), 3593408605, j(p, w + 20), 5),
          a(g(t, u, v), 38016083, j(p, w + 40), 9),
          a(g(t, u, v), 3634488961, j(p, w + 60), 14),
          a(g(t, u, v), 3889429448, j(p, w + 16), 20),
          a(g(t, u, v), 568446438, j(p, w + 36), 5),
          a(g(t, u, v), 3275163606, j(p, w + 56), 9),
          a(g(t, u, v), 4107603335, j(p, w + 12), 14),
          a(g(t, u, v), 1163531501, j(p, w + 32), 20),
          a(g(t, u, v), 2850285829, j(p, w + 52), 5),
          a(g(t, u, v), 4243563512, j(p, w + 8), 9),
          a(g(t, u, v), 1735328473, j(p, w + 28), 14),
          a(g(t, u, v), 2368359562, j(p, w + 48), 20),
          a(h(t, u, v), 4294588738, j(p, w + 20), 4),
          a(h(t, u, v), 2272392833, j(p, w + 32), 11),
          a(h(t, u, v), 1839030562, j(p, w + 44), 16),
          a(h(t, u, v), 4259657740, j(p, w + 56), 23),
          a(h(t, u, v), 2763975236, j(p, w + 4), 4),
          a(h(t, u, v), 1272893353, j(p, w + 16), 11),
          a(h(t, u, v), 4139469664, j(p, w + 28), 16),
          a(h(t, u, v), 3200236656, j(p, w + 40), 23),
          a(h(t, u, v), 681279174, j(p, w + 52), 4),
          a(h(t, u, v), 3936430074, j(p, w), 11),
          a(h(t, u, v), 3572445317, j(p, w + 12), 16),
          a(h(t, u, v), 76029189, j(p, w + 24), 23),
          a(h(t, u, v), 3654602809, j(p, w + 36), 4),
          a(h(t, u, v), 3873151461, j(p, w + 48), 11),
          a(h(t, u, v), 530742520, j(p, w + 60), 16),
          a(h(t, u, v), 3299628645, j(p, w + 8), 23),
          a(i(t, u, v), 4096336452, j(p, w), 6),
          a(i(t, u, v), 1126891415, j(p, w + 28), 10),
          a(i(t, u, v), 2878612391, j(p, w + 56), 15),
          a(i(t, u, v), 4237533241, j(p, w + 20), 21),
          a(i(t, u, v), 1700485571, j(p, w + 48), 6),
          a(i(t, u, v), 2399980690, j(p, w + 12), 10),
          a(i(t, u, v), 4293915773, j(p, w + 40), 15),
          a(i(t, u, v), 2240044497, j(p, w + 4), 21),
          a(i(t, u, v), 1873313359, j(p, w + 32), 6),
          a(i(t, u, v), 4264355552, j(p, w + 60), 10),
          a(i(t, u, v), 2734768916, j(p, w + 24), 15),
          a(i(t, u, v), 1309151649, j(p, w + 52), 21),
          a(i(t, u, v), 4149444226, j(p, w + 16), 6),
          a(i(t, u, v), 3174756917, j(p, w + 44), 10),
          a(i(t, u, v), 718787259, j(p, w + 8), 15),
          a(i(t, u, v), 3951481745, j(p, w + 36), 21),
          m = n(m, s),
          o = n(o, t),
          q = n(q, u),
          r = n(r, v)
      }
      return l(r, q, o, m).toUpperCase()
  }
  var p = null
    , q = null;
  return "string" == typeof a ? p = k(a) : a.constructor == Array ? 0 === a.length ? p = a : "string" == typeof a[0] ? p = c(a) : "number" == typeof a[0] ? p = a : q = typeof a[0] : "undefined" != typeof ArrayBuffer ? a instanceof ArrayBuffer ? p = m(new Uint8Array(a)) : a instanceof Uint8Array || a instanceof Int8Array ? p = m(a) : a instanceof Uint32Array || a instanceof Int32Array || a instanceof Uint16Array || a instanceof Int16Array || a instanceof Float32Array || a instanceof Float64Array ? p = m(new Uint8Array(a.buffer)) : q = typeof a : q = typeof a,
  q && alert("MD5 type mismatch, cannot process " + q),
  o()
  }
  ```

  通过函数跳转，得到了这个MD5加密的JS方法。<br />在工具中尝试加密，看看结果是否与网页一致。<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/1563201/1600305848551-b270f690-c38b-4b70-b655-55f1229f8826.png#align=left&display=inline&height=331&margin=%5Bobject%20Object%5D&name=image.png&originHeight=331&originWidth=617&size=30113&status=done&style=stroke&width=617)<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/1563201/1600305934774-c0d5da7b-8d30-4063-b748-4077dad690fb.png#align=left&display=inline&height=532&margin=%5Bobject%20Object%5D&name=image.png&originHeight=532&originWidth=506&size=25695&status=done&style=stroke&width=506)<br />

```
import time
import execjs

KEY_CODE = "NVPh5oo715z5DIWAeQlhMDsWXXQV4hwtbitrate=0callback=callback123clienttime={time}clientver=2000dfid=-inputtype=0iscorrection=1isfuzzy=0keyword={keyword}mid={time}page=1pagesize=30platform=WebFilterprivilege_filter=0srcappid=2919tag=emuserid=-1uuid={time}NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt"
URL_SEARCH = "https://complexsearch.kugou.com/v2/search/song?callback=callback123&keyword={keyword}&page=1&pagesize=30&bitrate=0&isfuzzy=0&tag=em&inputtype=0&platform=WebFilter&userid=-1&clientver=2000&iscorrection=1&privilege_filter=0&srcappid=2919&clienttime={time}&mid={time}&uuid={time}&dfid=-&signature={signature}"

# 生成加密
def getSignature(text):
    with open("kugou.js", "r", encoding='utf-8') as f:
        js_str = f.read()
    if js_str is not None:
        js_obj = execjs.compile(js_str)
        return js_obj.call('getMD5', text)
    return None

# 返回搜索url
def search(keyword):
    # 获得13位时间戳
    millis = str(round(time.time() * 1000))
    p = KEY_CODE.format(time=millis, keyword=keyword)
    signature = getSignature(p)
    url = URL_SEARCH.format(keyword=keyword, time=millis, signature=signature)
    print(url)
```

> <https://complexsearch.kugou.com/v2/search/song?callback=callback123&keyword=许嵩&page=1&pagesize=30&bitrate=0&isfuzzy=0&tag=em&inputtype=0&platform=WebFilter&userid=-1&clientver=2000&iscorrection=1&privilege_filter=0&srcappid=2919&clienttime=1600307100792&mid=1600307100792&uuid=1600307100792&dfid=-&signature=AD72928A4E0B85FCDC9A34FF1C238AAB>

访问得到的url，可以成功输出结果，O(∩\_∩)O~~<br />

<a name="q177L"></a>

##### 实现歌曲下载地址

<br />访问：

> [https://wwwapi.kugou.com/yy/index.php?r=play/getdata&callback=jQuery19106972086837400218\_1600304199645&hash=2FFF4D0CAD2DADC043B6F0ABA6F7EFC1&album*id=973251&dfid=3dGOvT21OnXb0sdCOD1Z9wUo&mid=dbf31ed5384e98e7138f718097daf2b1&platid=4&*=1600304199647](https://wwwapi.kugou.com/yy/index.php?r=play/getdata&callback=jQuery19106972086837400218_1600304199645&hash=2FFF4D0CAD2DADC043B6F0ABA6F7EFC1&album_id=973251&dfid=3dGOvT21OnXb0sdCOD1Z9wUo&mid=dbf31ed5384e98e7138f718097daf2b1&platid=4&_=1600304199647)

即可获得歌曲下载地址：其中除hash和r参数外，其他参数都可以忽略~参数r表示请求的action<br />即：

> <https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=2FFF4D0CAD2DADC043B6F0ABA6F7EFC1>

```
def get_download_url(hash):
    headers = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 Edg/85.0.564.51",
    }
    cookies = "kg_mid=dbf31ed5384e98e7138f718097daf2b1; Hm_lvt_aedee6983d4cfc62f509129360d6bb3d=1600302507; kg_dfid=3dGOvT21OnXb0sdCOD1Z9wUo; kg_dfid_collect=d41d8cd98f00b204e9800998ecf8427e; Hm_lpvt_aedee6983d4cfc62f509129360d6bb3d=1600304200; kg_mid_temp=dbf31ed5384e98e7138f718097daf2b1; ACK_SERVER_10016=%7B%22list%22%3A%5B%5B%22gzreg-user.kugou.com%22%5D%5D%7D; ACK_SERVER_10015=%7B%22list%22%3A%5B%5B%22gzlogin-user.kugou.com%22%5D%5D%7D; ACK_SERVER_10017=%7B%22list%22%3A%5B%5B%22gzverifycode.service.kugou.com%22%5D%5D%7D"
    url = URL_DOWNLOAD.format(hash=hash)
    response = requests.get(url=url, headers=headers, cookies=extract_cookies(cookies))
    try:
        json_dict = response.json()
    except Exception as e:
        json_dict = {}
    return json_dict.get("data", {}).get("play_url")
```

<a name="FuoDh"></a>

##### python实现搜索和下载

<br />这个方案是通过execjs，来调用js文件方式，也可以通过自己写md5方法调用。<br />[kugou\_music.py](https://www.yuque.com/attachments/yuque/0/2020/txt/1563201/1600308643024-c5e778ca-81af-4cac-bea3-dc59741035ac.txt?_lake_card=%7B%22uid%22%3A%221600308643950-0%22%2C%22src%22%3A%22https%3A%2F%2Fwww.yuque.com%2Fattachments%2Fyuque%2F0%2F2020%2Ftxt%2F1563201%2F1600308643024-c5e778ca-81af-4cac-bea3-dc59741035ac.txt%22%2C%22name%22%3A%22kugou_music.py%22%2C%22size%22%3A2789%2C%22type%22%3A%22text%2Fplain%22%2C%22ext%22%3A%22txt%22%2C%22progress%22%3A%7B%22percent%22%3A99%7D%2C%22status%22%3A%22done%22%2C%22percent%22%3A0%2C%22id%22%3A%223l4tD%22%2C%22card%22%3A%22file%22%7D)
