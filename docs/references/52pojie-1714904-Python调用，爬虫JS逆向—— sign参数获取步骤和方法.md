# Python调用，爬虫JS逆向—— sign参数获取步骤和方法

> **作者**: liufu123 | **发布时间**: 2022-11-18 11:23:00 | **版块**: 『编程语言区』 | **查看/回复**: 5987 / 42
> **原文**: [https://www.52pojie.cn/thread-1714904-1-1.html](https://www.52pojie.cn/thread-1714904-1-1.html)

---

### JS逆向—sign参数

##### 无法直接请求数据，需添加sign参数进行请求

###### 目标网站：<https://sale.1688.com/factory/home.html?spm=a260k.22464671.kyebv087.2.13d47a6e2aTz9Q>

###### 1. html中无法找到正文数据，找到接口位置，大致记住参数部分。

![在这里插入图片描述](https://img-blog.csdnimg.cn/b5c1e095bded4788b439a102f19b7f2e.png)

###### 2. 在文件中找到启动器，进去JS文件中。

![在这里插入图片描述](https://img-blog.csdnimg.cn/10426d60b689434ea4fcddac9ac44393.png)

###### 3. JS文件中搜索sign，找到完整的sign位置，可以看出sign是由j生成，解出j函数。

![在这里插入图片描述](https://img-blog.csdnimg.cn/b127ca02b4364df6a42fad38843ecea7.png)
![在这里插入图片描述](https://img-blog.csdnimg.cn/4b8e584782824b2c83ae543d8ee71f91.png)

###### 4. 在j的位置进行断点，刷新网页，将d.token、i、g、c.data找出（c.data 跟数据接口的data来对比）

![在这里插入图片描述](https://img-blog.csdnimg.cn/bacfa4f45b4d44499f6d3479f597bd49.png)

###### 5. 取出参数，写入python代码。

```
import time
# d.token + "&" + i + "&" + g + "&" + c.data
# token 会变化。
token = '************************'
i = round(time.time() * 1000)
g = '12574478'
data = '{"cid":"FactorySearchPCConditionService:FactorySearchPCConditionService","methodName":"execute","params":"{\\"lv1RecCateSize\\":\\"50\\",\\"classifyByCategory\\":\\"true\\",\\"classifyByGeo\\":\\"true\\",\\"from\\":\\"pc_index_recommend\\",\\"trafficSource\\":\\"pc_index_recommend\\",\\"url\\":\\"https://sale.1688.com/factory/home.html?spm=a260k.dacugeneral.0.0\\"}"}'
signkey = token + '&' + str(i) + '&' + g + '&' + data
```

###### 6. 进入h方法，将整个函数写入js文件中。![在这里插入图片描述](https://img-blog.csdnimg.cn/073c2cb3928d4462a5bc619ac5799eda.png)

![在这里插入图片描述](https://img-blog.csdnimg.cn/c2159bc68c3344b19fb588b9170239cb.png)

###### 7. 创建js文件，将找到的h方法写入js文件。

```
    function h(a) {
        function b(a, b) {
            return a << b | a >>> 32 - b
        }
        function c(a, b) {
            var c, d, e, f, g;
            return e = 2147483648 & a,
            f = 2147483648 & b,
            c = 1073741824 & a,
            d = 1073741824 & b,
            g = (1073741823 & a) + (1073741823 & b),
            c & d ? 2147483648 ^ g ^ e ^ f : c | d ? 1073741824 & g ? 3221225472 ^ g ^ e ^ f : 1073741824 ^ g ^ e ^ f : g ^ e ^ f
        }
        function d(a, b, c) {
            return a & b | ~a & c
        }
        function e(a, b, c) {
            return a & c | b & ~c
        }
        function f(a, b, c) {
            return a ^ b ^ c
        }
        function g(a, b, c) {
            return b ^ (a | ~c)
        }
        function h(a, e, f, g, h, i, j) {
            return a = c(a, c(c(d(e, f, g), h), j)),
            c(b(a, i), e)
        }
        function i(a, d, f, g, h, i, j) {
            return a = c(a, c(c(e(d, f, g), h), j)),
            c(b(a, i), d)
        }
        function j(a, d, e, g, h, i, j) {
            return a = c(a, c(c(f(d, e, g), h), j)),
            c(b(a, i), d)
        }
        function k(a, d, e, f, h, i, j) {
            return a = c(a, c(c(g(d, e, f), h), j)),
            c(b(a, i), d)
        }
        function l(a) {
            for (var b, c = a.length, d = c + 8, e = (d - d % 64) / 64, f = 16 * (e + 1), g = new Array(f - 1), h = 0, i = 0; c > i; )
                b = (i - i % 4) / 4,
                h = i % 4 * 8,
                g[b] = g[b] | a.charCodeAt(i) << h,
                i++;
            return b = (i - i % 4) / 4,
            h = i % 4 * 8,
            g[b] = g[b] | 128 << h,
            g[f - 2] = c << 3,
            g[f - 1] = c >>> 29,
            g
        }
        function m(a) {
            var b, c, d = "", e = "";
            for (c = 0; 3 >= c; c++)
                b = a >>> 8 * c & 255,
                e = "0" + b.toString(16),
                d += e.substr(e.length - 2, 2);
            return d
        }
        function n(a) {
            a = a.replace(/\r\n/g, "\n");
            for (var b = "", c = 0; c < a.length; c++) {
                var d = a.charCodeAt(c);
                128 > d ? b += String.fromCharCode(d) : d > 127 && 2048 > d ? (b += String.fromCharCode(d >> 6 | 192),
                b += String.fromCharCode(63 & d | 128)) : (b += String.fromCharCode(d >> 12 | 224),
                b += String.fromCharCode(d >> 6 & 63 | 128),
                b += String.fromCharCode(63 & d | 128))
            }
            return b
        }
        var o, p, q, r, s, t, u, v, w, x = [], y = 7, z = 12, A = 17, B = 22, C = 5, D = 9, E = 14, F = 20, G = 4, H = 11, I = 16, J = 23, K = 6, L = 10, M = 15, N = 21;
        for (a = n(a),
        x = l(a),
        t = 1732584193,
        u = 4023233417,
        v = 2562383102,
        w = 271733878,
        o = 0; o < x.length; o += 16)
            p = t,
            q = u,
            r = v,
            s = w,
            t = h(t, u, v, w, x[o + 0], y, 3614090360),
            w = h(w, t, u, v, x[o + 1], z, 3905402710),
            v = h(v, w, t, u, x[o + 2], A, 606105819),
            u = h(u, v, w, t, x[o + 3], B, 3250441966),
            t = h(t, u, v, w, x[o + 4], y, 4118548399),
            w = h(w, t, u, v, x[o + 5], z, 1200080426),
            v = h(v, w, t, u, x[o + 6], A, 2821735955),
            u = h(u, v, w, t, x[o + 7], B, 4249261313),
            t = h(t, u, v, w, x[o + 8], y, 1770035416),
            w = h(w, t, u, v, x[o + 9], z, 2336552879),
            v = h(v, w, t, u, x[o + 10], A, 4294925233),
            u = h(u, v, w, t, x[o + 11], B, 2304563134),
            t = h(t, u, v, w, x[o + 12], y, 1804603682),
            w = h(w, t, u, v, x[o + 13], z, 4254626195),
            v = h(v, w, t, u, x[o + 14], A, 2792965006),
            u = h(u, v, w, t, x[o + 15], B, 1236535329),
            t = i(t, u, v, w, x[o + 1], C, 4129170786),
            w = i(w, t, u, v, x[o + 6], D, 3225465664),
            v = i(v, w, t, u, x[o + 11], E, 643717713),
            u = i(u, v, w, t, x[o + 0], F, 3921069994),
            t = i(t, u, v, w, x[o + 5], C, 3593408605),
            w = i(w, t, u, v, x[o + 10], D, 38016083),
            v = i(v, w, t, u, x[o + 15], E, 3634488961),
            u = i(u, v, w, t, x[o + 4], F, 3889429448),
            t = i(t, u, v, w, x[o + 9], C, 568446438),
            w = i(w, t, u, v, x[o + 14], D, 3275163606),
            v = i(v, w, t, u, x[o + 3], E, 4107603335),
            u = i(u, v, w, t, x[o + 8], F, 1163531501),
            t = i(t, u, v, w, x[o + 13], C, 2850285829),
            w = i(w, t, u, v, x[o + 2], D, 4243563512),
            v = i(v, w, t, u, x[o + 7], E, 1735328473),
            u = i(u, v, w, t, x[o + 12], F, 2368359562),
            t = j(t, u, v, w, x[o + 5], G, 4294588738),
            w = j(w, t, u, v, x[o + 8], H, 2272392833),
            v = j(v, w, t, u, x[o + 11], I, 1839030562),
            u = j(u, v, w, t, x[o + 14], J, 4259657740),
            t = j(t, u, v, w, x[o + 1], G, 2763975236),
            w = j(w, t, u, v, x[o + 4], H, 1272893353),
            v = j(v, w, t, u, x[o + 7], I, 4139469664),
            u = j(u, v, w, t, x[o + 10], J, 3200236656),
            t = j(t, u, v, w, x[o + 13], G, 681279174),
            w = j(w, t, u, v, x[o + 0], H, 3936430074),
            v = j(v, w, t, u, x[o + 3], I, 3572445317),
            u = j(u, v, w, t, x[o + 6], J, 76029189),
            t = j(t, u, v, w, x[o + 9], G, 3654602809),
            w = j(w, t, u, v, x[o + 12], H, 3873151461),
            v = j(v, w, t, u, x[o + 15], I, 530742520),
            u = j(u, v, w, t, x[o + 2], J, 3299628645),
            t = k(t, u, v, w, x[o + 0], K, 4096336452),
            w = k(w, t, u, v, x[o + 7], L, 1126891415),
            v = k(v, w, t, u, x[o + 14], M, 2878612391),
            u = k(u, v, w, t, x[o + 5], N, 4237533241),
            t = k(t, u, v, w, x[o + 12], K, 1700485571),
            w = k(w, t, u, v, x[o + 3], L, 2399980690),
            v = k(v, w, t, u, x[o + 10], M, 4293915773),
            u = k(u, v, w, t, x[o + 1], N, 2240044497),
            t = k(t, u, v, w, x[o + 8], K, 1873313359),
            w = k(w, t, u, v, x[o + 15], L, 4264355552),
            v = k(v, w, t, u, x[o + 6], M, 2734768916),
            u = k(u, v, w, t, x[o + 13], N, 1309151649),
            t = k(t, u, v, w, x[o + 4], K, 4149444226),
            w = k(w, t, u, v, x[o + 11], L, 3174756917),
            v = k(v, w, t, u, x[o + 2], M, 718787259),
            u = k(u, v, w, t, x[o + 9], N, 3951481745),
            t = c(t, p),
            u = c(u, q),
            v = c(v, r),
            w = c(w, s);
        var O = m(t) + m(u) + m(v) + m(w);
        return O.toLowerCase()
    }
```

###### 8. 在python中对参数进行整合，传入js文件得到加密参数sign。

```
import time
import execjs
import requests

# d.token + "&" + i + "&" + g + "&" + c.data
token = '************************'
i = round(time.time() * 1000)
g = '12574478'
data = '{"cid":"FactorySearchPCConditionService:FactorySearchPCConditionService","methodName":"execute","params":"{\\"lv1RecCateSize\\":\\"50\\",\\"classifyByCategory\\":\\"true\\",\\"classifyByGeo\\":\\"true\\",\\"from\\":\\"pc_index_recommend\\",\\"trafficSource\\":\\"pc_index_recommend\\",\\"url\\":\\"https://sale.1688.com/factory/home.html?spm=a260k.dacugeneral.0.0\\"}"}'

signkey = token + '&' + str(i) + '&' + g + '&' + data

with open('./16xxsign加密.js','r',encoding='utf-8') as f:
    jscall = f.read()

ctx = execjs.compile(jscall).call('h',signkey)
print(ctx)

ctx输出：7a19d23c2be028316ab448fb582e9c6b
```

###### 9. 在python中url进行访问，取出需要的数据。

```
import time
import execjs
import requests

# d.token + "&" + i + "&" + g + "&" + c.data
token = '************************'
i = round(time.time() * 1000)
g = '12574478'
data = '{"cid":"FactorySearchPCConditionService:FactorySearchPCConditionService","methodName":"execute","params":"{\\"lv1RecCateSize\\":\\"50\\",\\"classifyByCategory\\":\\"true\\",\\"classifyByGeo\\":\\"true\\",\\"from\\":\\"pc_index_recommend\\",\\"trafficSource\\":\\"pc_index_recommend\\",\\"url\\":\\"https://sale.1688.com/factory/home.html?spm=a260k.dacugeneral.0.0\\"}"}'

signkey = token + '&' + str(i) + '&' + g + '&' + data

with open('./16xxsign加密.js','r',encoding='utf-8') as f:
    jscall = f.read()

ctx = execjs.compile(jscall).call('h',signkey)
# print(ctx)

url = 'https://h5api.m.1688.com/h5/mtop.taobao.widgetservice.getjsoncomponent/1.0/?'

payload = {'jsv': '2.6.1', 'appKey': g, 't': i, 'sign': ctx, 'v': '1.0', 'type': 'jsonp', 'isSec': 0,
           'timeout': 20000, 'api': 'mtop.taobao.widgetService.getJsonComponent', 'dataType': 'jsonp', 'jsonpIncPrefix': 'mboxfc',
           'callback': 'mtopjsonpmboxfc9', 'data': data}

headers = {
  'cookie': 'cookie2=1c0abad5c2140fdeede0825e2afc1d61; t=158eb3f1db5b6433c138d96a55bff422; _tb_token_=e9b6d8de8eebe; __cn_logon__=false; cna=BsypG+e0SikCAX0mpQ6sZKaj; ali_ab=117.14.229.124.1667377780458.6; _csrf_token=1668502961679; _m_h5_tk=e01893f248fba2155ddbf5ad725026c8_1668591039098; _m_h5_tk_enc=02271f81b3eb9e5860e2d6d24e1ca468; xlly_s=1; alicnweb=touch_tb_at%3D1668584062851; tfstk=cUrCBb2Jj7ENcAIkxX6NaMWW1anCZ9KIQ9Ggd66MrW5evmyCihtqGQxQECnreA1..; l=eBOBUSdmTJ6RPHFh2Ofwourza77OSIRAguPzaNbMiOCPOPCp5r7CW6zJ0AL9C3GVh6yWR3kzvXKpBeYBcIjcdlWlc7DZWVHmn; isg=BHV1Kcb6ekD1w57qTSyw0YfbhPcv8ikEmNzmk_eaMew7zpXAv0I51INIGJJ4jkG8',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
}

res = requests.get(url,headers=headers,data=payload)
print(res.text)
```
