# 半夜逆向一个Cocos2D-JS做的棋牌App,解密Jsc拿下Authorization算法

> **作者**: 罗婷 | **发布时间**: 2020-11-18 08:42:00 | **版块**: 『移动安全区』 | **查看/回复**: 9229 / 133
> **原文**: [https://www.52pojie.cn/thread-1307664-1-1.html](https://www.52pojie.cn/thread-1307664-1-1.html)

---

## 动机

夜黑风高夜，逆向破解天。基友突然找我吐槽自己网贝者输光了自己的私房钱，我问为什么会去玩网xx，他说注册就送红包的哇。
突然天边一声惊雷，灵光一闪，我说我可以帮你拿回输掉的钱哇，于是就有了这篇帖子。（贴中涉及不文明的内容已经大码）

## 干它

### 拿到 App 分析任务执行可行性

0x1.叫朋友通过我们的基友群共享了App，用神器 `xapkdetector`（<https://github.com/horsicq/XAPKDetector>） 查壳，没加固，想想也是棋牌App怎么可能加固呢？要热更新的嘛，换皮不勤快狗庄怎么赚钱，但是发现使用了 cocos2d-js 引擎，通讯库是 okhttp3.5+。
0x2.尝试注册，发现要求提供 `手机号` 但是不校验 `验证码` 一周七次签到可拿1.2元早餐费,完事一天有4波红包且金额随机。
0x3.使用抓包工具（`xposed+justtrustme+charles`）抓包分析一波，一眼望去发现关键的请求都有 `一个` 加密的协议头参数 `Authorization`
0x4.审视 多个请求返回内容 发现记录IP和GPS信息，根据IP居然还有LBS信息
0x5.综上所述，如果 `Authorization` 是个签名参数的话，那肝它势在必行
0x6.为了熬夜体力保障，我点了个16.5的外卖并且因为派送超时返给我1.65准时达无门槛优惠券

### 拆包分析重点文件

0x1.在百度游走一圈大致知道了 cocos2d-js 的封装app的核心脚本位于 包的 `assets\src` 文件夹,一看是jsc文件,莽夫思路推测这是js文件编译或者加密得来的.Maybe jsc=jscript? Or jsc = js+c ?，于是乎还是直接上手把cocos2d sdk拉下来，读了代码 知道这东西原来就是单纯的js文件通过加密得到的。
0x2.有加密自然就要有解密咯，有sdk还想啥呢直接拉代码

```
uint8_t* data = xxtea_decrypt((uint8_t*)fileData.getBytes(), (uint32_t)fileData.getSize(), (uint8_t*)xxteaKey.c_str(), (uint32_t)xxteaKey.size(), &dataLen);
```

cocos2d git:<https://github.com/cocos-creator/cocos2d-x-lite/blob/f4a387d614691101c79ef75d1dbce705c834cad3/cocos/scripting/js-bindings/manual/jsb_global.cpp#L181>
本着一目十行的超能力，我又多看了几眼发现下三行还有

```
ZipUtils::isGZipBuffer(data,dataLen)
```

0x3.这就简单了，那么思路就是 `ungzip(xxtea_decrypt(file_bin,key))`

### 找Key之路

0x1.从GitHub上的公开仓库，顺手拉一个小游戏demo，build -> encrypt[&gzip] -> createApp ，将App丢进Winhex搜索自己预设的 Key（大神应该是IDA Pro 走一波so库），查看上下文 拿到这么一句 `Can't decrypt code for %s`
0x2.拿 `Can't decrypt code for %s` 去原包搜得到key `xxxxxxxx-xxxx-xx`(气死狗庄，我不暴露，就要撸你)

### 上手写个解密工具将JSC解密成JS

0x1.编译一个 xxtea 动态库(百度上捡的 看着像批量爬出来的文章 没有原作者版权了 这里不标了),提供给易语言调用（谁叫我不会C呢，易语言又没有xxtea的支持库）
0x2.再捡一个 Gzip 动态库（百度云上捡的）
0x3.写个了小工具

![](https://attach.52pojie.cn/forum/202011/18/084259s9ld2zsoemqmoomj.jpg)

### 从明文分析Authorization来源

0x1.逐一搜索确定核心文件

```
t.url.indexOf("member/common/getVerify") > 0 && (window.utoken = o.getResponseHeader("Authorization"));
```

```
this.bLogin = !0;
window.utoken = this.userInfo.data.token;
```

0x2.看到这我差点哭出来！原来这货来源于服务器返回用户数据
0x3.有些姥爷要问了，那没登录呢？
0x4.没登录服务器也分配，就问你服不服！

### 文末总结

End.其实呢很多加密手法或算法不会很复杂，关键呢你要有一颗好肝...呸..好胆，要勇于尝试冷静分析，一看到加密呢就放弃了，不会有进步的啦。

#### 姥爷们，点评+c币不扣自己c币哟~~~~走一波~~~走一波

谢谢啦~
