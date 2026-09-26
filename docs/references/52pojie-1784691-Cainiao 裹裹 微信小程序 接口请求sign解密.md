# Cainiao 裹裹 微信小程序 接口请求sign解密

> **作者**: kwk99 | **发布时间**: 2023-05-12 17:28:00 | **版块**: 『编程语言区』 | **查看/回复**: 2280 / 2
> **原文**: [https://www.52pojie.cn/thread-1784691-1-1.html](https://www.52pojie.cn/thread-1784691-1-1.html)

---

*本帖最后由 kwk99 于 2023-5-12 17:32 编辑*

需求: 菜鸟裹裹 的微信小程序端-查取寄件地址附近的全部服务点信息, 源于此需求,对菜鸟点API接口点sign做了一次分析,直接贴结论

[Python] *纯文本查看*

```
"""菜鸟裹裹查单"""
    '''
    sign 加密方式 j = h(d.token + “&” + i + “&” + g + “&” + c.data)
    d.token 为请求参数里 c 值去掉时间戳那部分,i为时间戳,g为固定参数即appKey ,data为请求body
    如 c 为6a2d5d82ce974dd421126ffae77f7dad_1678092180335;6c4b4a5d2c2712b9c877df0e82794693 则 d.token 为6a2d5d82ce974dd421126ffae77f7dad
    i 时间戳 1678171465000 ; g 为appKey 为 12574478
    c.data 则为请求的 application/x-www-form-urlencoded 参数
    h 使用的加密方式为 md5 32位加密
    '''
```

接口实例如下

[Python] *纯文本查看*

```
api = "服务接口地址"
        ##url参数
        params = {
            'jsv': self.jsv,  ##固定参数
            'appKey': self.appKey,  ##固定参数,12574478
            'api': 'mtop.cainiao.tdwxgateway.send.query.resources',
            'v': '1.0',
            'type': 'originaljson',
            'dataType': 'json',
            '_bx-m': '1'
        }
        ##application/x-www-form-urlencoded
        body = {"senderAreaId": senderAreaId, "senderAddress": senderAddress, "resourceTypeList": "6,2,5",
                "extendedMapJson": "{}"}
        payload = f"data={quote_plus(json.dumps(body, ensure_ascii=False, separators=(',', ':')))}"  ##注意此处一定要添加 separators=(',', ':') 去除多余的空格
        json_resp = None
        for _retry in range(5):
            t = self.__get_timestamp()
            c_token = self.c.split(';')[0].split('_')[0]
            c_data = json.dumps(body, ensure_ascii=False, separators=(',', ':'))
            enc_str = c_token + "&" + str(t) + "&" + self.appKey + "&" + c_data
            sign = self.__get_sign(enc_str)  ##进行MD5 加密
            params['t'] = t
            params['sign'] = sign
            params['c'] = self.c
            proxies = tools.get_random_proxy()
            try:
                resp = requests.post(api, headers=self.headers, params=params, data=payload, timeout=15,
                                     proxies=proxies)
                if resp.status_code == 200:
                    json_resp = json.loads(resp.content.decode('utf-8'))
            except Exception:
                time.sleep(random.random())
                continue
            else:
                break
        return json_resp
```

新手发帖,大佬请忽略
