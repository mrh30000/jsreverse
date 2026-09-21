# 【JS逆向学习实践】某招标网站登录X-Sign逆向

> **作者**: 503671998 | **发布时间**: 2022-04-22 19:38:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8340 / 52
> **原文**: [https://www.52pojie.cn/thread-1626143-1-1.html](https://www.52pojie.cn/thread-1626143-1-1.html)

---

> 今天又练习了另一个站点，登录的时候协议头里有一个X-Sign参数是变化的，并且他有两个登录入口，第一个是首页的登录那个X-Sign很简单一眼就能看到，但是另一个页面的登录X-Sign比较难找，最好玩的是简单的那个X-Sign可以用到第二个上，废话不多说，上地址。
> 地址： aHR0cHM6Ly93d3cubWFmZW5ncy5jb20vdGVuZGVyT3Jn

#### 第一步抓包查看

![](https://attach.52pojie.cn/forum/202204/22/192322a6vfx56ahka3m6vl.png)

可以看到登录信息都是明文的，最主要的就是这个X-Sign,我们直接搜索X-Sign搜不到，搜不到的话它是在Header中，搜索Header

![](https://attach.52pojie.cn/forum/202204/22/192458pdfcf7dadfudoz7d.png)

这个太像了啊，跟进去看看

![](https://attach.52pojie.cn/forum/202204/22/192608b4go7hbg7a8obbna.png)

果然是，这两个函数都是关键的，直接抠出来

```
function getParamsHash(axiosRequestConfig) {
  const url = new URL(axiosRequestConfig.url)
  const urlQueryString = url.searchParams.toString()
  let paramsQueryString = new URLSearchParams(
    axiosRequestConfig.params
  ).toString()
  paramsQueryString = paramsQueryString.replace(/%2C/g, ',')
  paramsQueryString = paramsQueryString.replace('%3A', ':')
  paramsQueryString = paramsQueryString.replace('%28', '(')
  paramsQueryString = paramsQueryString.replace('%29', ')')
  const queryStringList = []
  if (urlQueryString) {
    queryStringList.push(urlQueryString)
  }
  if (paramsQueryString) {
    queryStringList.push(paramsQueryString)
  }
  const queryString = queryStringList.join('&')
  const uri = url.pathname
  let body = axiosRequestConfig.data
    ? JSON.stringify(axiosRequestConfig.data)
    : ''
  if (typeof body !== 'string') {
    body = ''
  }
  const inputToSign = uri + queryString + body
  log.debug('uri：', uri)
  log.debug('queryString：', queryString)
  log.debug('body：', body)
  log.debug('inputToSign：', inputToSign)
  return md5(inputToSign).toString()
}
```

这个是根据url信息通过MD5加密，得出一个hash值给上图中的function makeJwt(paramsHash, { clientId })使用，这里我们自己套用CroptoJS进行操作不需要抠它了

```
function makeJwt(paramsHash, { clientId }) {
  const oHeader = { alg: 'HS256', typ: 'JWT' }
  const oPayload = {}
  const tNow = Math.round(getServerEpochMilli() / 1000)
  const ttl = 10
  oPayload.sub = paramsHash
  oPayload.nbf = tNow - getLeeway()
  oPayload.iat = tNow
  oPayload.exp = tNow + ttl + getLeeway()
  oPayload.iss = clientId
  const sHeader = JSON.stringify(oHeader)
  const sPayload = JSON.stringify(oPayload)
  log.debug('payload iat', new Date(tNow * 1000))
  log.debug('payload exp', new Date(oPayload.exp * 1000))
  return jwtLib.jws.JWS.sign(
    'HS256',
    sHeader,
    sPayload,
    'VPLnFDx85XuNPvVVOQfjF3ftfoZP8ckP'
  )
}
```

这个函数最后调用了jsrsasign.js库进行sign加密，我们直接全文抠出来，手动引用就行了

![](https://attach.52pojie.cn/forum/202204/22/193043ufi9mobbui5oojoi.png)

图中圈出来的函数跟一下就出来了，另外getleeway函数里面获取的是localstorage的东西，可以跟一下它的返回值，是0，我们直接让他返回0就行了
这样就已经全部抠出来了，我操作的时候有一个坑，导致我算出来的和真实环境算出来的不一样

![](https://attach.52pojie.cn/forum/202204/22/193351rrfvs0vrl0ce4f0i.png)

看图中画出来的第二个参数是clientId，他有一个生成函数是取一个小数点随机数，我直接写进去了，但是通过跟环境发现，它实际是undefined，这里我们也直接给他一个undefined，否则算出来的值是错误的

![](https://attach.52pojie.cn/forum/202204/22/193605y07msvibgeis7m9l.png)

这就是最后算出来的，提交post的时候要把它的请求头全部带上，要不然也返回的是sign值错误

![](https://attach.52pojie.cn/forum/202204/22/193738cub08u0lixep05tz.png)

希望大佬看见有什么不足可以指导我一下，抠了4个小时抠出来，感觉还是经验太少，技术太菜
