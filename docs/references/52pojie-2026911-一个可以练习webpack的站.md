# 一个可以练习webpack的站

> **作者**: biedaliana | **发布时间**: 2025-04-24 15:14:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5123 / 37
> **原文**: [https://www.52pojie.cn/thread-2026911-1-1.html](https://www.52pojie.cn/thread-2026911-1-1.html)

---

*本帖最后由 biedaliana 于 2025-4-24 15:19 编辑*

网址
aHR0cHM6Ly9mdXd1Lm5oc2EuZ292LmNuL25hdGlvbmFsSGFsbFN0LyMvc2VhcmNoL3BoYXJtYWNpZXM=

分析

1. 发现发送request时候带着参数
2. 返回response也是加密过的

步骤

1. f12看网络接口POST的传参
2. req报文
{"data":{"data":{"encData":"3DFBCA4667B978F639BB23B95DCE4CC7FD8A6FBFABB29999F8D398B88F9EA7F3CCD20943B4DAE96380B41164D761DE97BBBD5DB53EA5E7154071E74EF0BE481E2BADC2FDCC843E425B4CA14CEDBC102C8FAC228E3FCCD7616813AFFBFC8928E064DE712DF3683DE81C358841664CBE17561D0390069F11B0D412FE38BE15BA5C"},"appCode":"T98HPCGN5ZVVQBS8LZQNOAEXVI9GYHKQ","version":"1.0.0","encType":"SM4","signType":"SM2","timestamp":1745474870,"signData":"e8NNcfuVvI4LfHjYRkQehhF0AAcrF+cnfFta0Bn1z4iJNCBTmRaWImrnB7iW8bQXoijuzne8Fo61AF6/ovAZKw=="}}

1. 断点定位。直接搜索interceptors.request(查找req拦截器， 因为随便点了几个页面 发现每个请求都带着encData这样的数据格式,试试拦击器)

![](https://attach.52pojie.cn/forum/202504/24/151001y5xxtx6x6x0g0xgg.png)

发现有对 data进行处理。打印下前后e的内容。加密信息给上了。那**e=Object(u.a)(e)** 这个地方肯定做过了啥 跳转过去看看有 **sha256** 关键字. 本来想扣代码的。一看这不是webpack么。直接暴力扣下来

![](https://attach.52pojie.cn/forum/202504/24/151003sgsvgsagayfhfawq.png)

 webpack扣取

1. 看到图1中 u= n("7d92") 直接打断点 刷新页面进到加载器. 标准的webpack格式。直接全部拷下来
放到loading.js中 7w多行（本人菜狗 一个一个具体加载不如全部拷下来。ps希望有大佬能教一下如何动态加载自动拷贝）
直接右击下运行下没问题。注意注释掉加载0的那行代码

![](https://attach.52pojie.cn/forum/202504/24/151005rcm4c2us8ckuy484.png)

2. 图1中只用到了u 那么很好 **u = window.ooo('7d92');**加载下就行了

3. 定义一个encrypt函数。然后从浏览器里把e拷贝出来。执行下发现请求加密加上了

![](https://attach.52pojie.cn/forum/202504/24/150958uumkmm6ucs239k63.png)

4. response 解密同理。虽然不知道具体加密逻辑是什么。直接用u去调用就行

python封装

1. 直接赋值curl请求。丢网址上生成python脚本。
2. 使用execjs把刚才扣的js代码直接调用

![](https://attach.52pojie.cn/forum/202504/24/151000flai435t3iyb4bbw.png)
