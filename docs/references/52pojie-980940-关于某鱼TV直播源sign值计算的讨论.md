# 关于某鱼TV直播源sign值计算的讨论

> **作者**: cursor3946 | **发布时间**: 2019-06-26 09:24:00 | **版块**: 『编程语言区』 | **查看/回复**: 2508 / 9
> **原文**: [https://www.52pojie.cn/thread-980940-1-1.html](https://www.52pojie.cn/thread-980940-1-1.html)

---

*本帖最后由 cursor3946 于 2019-6-26 09:25 编辑*

近日对某鱼的直播源提取比较感兴趣，
想着用python爬出来，供大家使用，
经过F12大法后，
我找到了https://www.douyu.com/lapi/live/getH5Play/roomid这个API，

![](https://attach.52pojie.cn/forum/201906/26/083905tlcriovvvyxbcrqh.png)

如图所示，通过POST访问该链接后，会返回该直播间的源地址，包含不同线路和不同清晰度，

[JavaScript] *纯文本查看*

```
{error: 0, msg: "ok",…}
data: {room_id: 4332, is_mixed: false, mixed_live: "", mixed_url: "", rtmp_cdn: "tct-h5",…}
cdnsWithName: [{name: "主线路", cdn: "ws-h5"}, {name: "备用线路5", cdn: "tct-h5"}]
0: {name: "主线路", cdn: "ws-h5"}
1: {name: "备用线路5", cdn: "tct-h5"}
client_ip: "211.137.68.21"
eticket: null
inNA: 0
isPassPlayer: 0
is_mixed: false
mixedCDN: ""
mixed_live: ""
mixed_url: ""
multirates: [{name: "蓝光", rate: 0, highBit: 1, bit: 3000}, {name: "超清", rate: 3, highBit: 0, bit: 2000},…]
0: {name: "蓝光", rate: 0, highBit: 1, bit: 3000}
1: {name: "超清", rate: 3, highBit: 0, bit: 2000}
2: {name: "高清", rate: 2, highBit: 0, bit: 1200}
3: {name: "流畅", rate: 1, highBit: 0, bit: 550}
online: 0
p2p: 0
rate: 0
rateSwitch: 1
room_id: 4332
rtmp_cdn: "tct-h5"
rtmp_live: "4332rhynGgaHFkh8.flv?wsAuth=ff9a201e994bee1b91a4367d9cb397ad&token=web-h5-10727002-4332-14e87fc1cf2cbfc4fa1d2347b56a63ec35c31b8d5833af0f&logo=0&expire=0&did=efb26545bdf6e8c48d03177600091501&ver=Douyu_219062545&pt=2&st=0&mix=0&isp="
rtmp_url: "https://tc-tct.douyucdn2.cn/dyliveflv3a"
smt: 0
streamStatus: 1
error: 0
msg: "ok"
```

这正是我想要的值。

![](https://static.52pojie.cn/static/image/hrline/1.gif)

但是现在有一点问题需要跟大家讨论一下：
这个API需要带参数POST，如图

![](https://attach.52pojie.cn/forum/201906/26/083909hvv4k2htzo4p4y1b.png)

其中最重要的就是sign值，
据网上查的资料显示sign值是根据设备ID（did）、当前时间戳（tt）、和房间ID（roomid）三个参数加上一些辅助参数计算32位MD5值得来的，
但是使用资料给出的计算公式计算出来的MD5却并不吻合，比如：

[Python] *纯文本查看*

```
'lapi/live/thirdPart/getPlay/' + rid  + '?aid=pcclient&' + 'rate=0' + '&time=' + tt + '9TUk5fjjUjg9qIMH3sdnh'
```

再比如：

[Python] *纯文本查看*

```
"room/" + rid + "?aid=androidhd1&cdn=ws&client_sys=android&time=" + tt +"Y237pxTx2In5ayGz"
```

[Python] *纯文本查看*

```
roomid+"?aid=android&cdn=ws&client_sys=android&time="+ t + '1231'
```

[Python] *纯文本查看*

```
rid + did + 'A12Svb&%1UUmf@hC' + tt
```

[Python] *纯文本查看*

```
"room/%s?aid=wp&client_sys=wp&time=%d" % (roomid, tt) + "zNzMV1y4EMxOHS6I5WKm"
```

将这些参数传入POST，全部返回“鉴权失败”，说明sign值都没对，

![](https://static.52pojie.cn/static/image/hrline/1.gif)

后来我又想：斗鱼的sign值不是从服务器获取返回值，那么应该是在本地js计算出来的，
于是我就用fiddler抓包，打断点，发现sign值可能是三个js计算出来的，而这三个js正好在ISO下的网页源代码里面：

https://shark2.douyucdn.cn/front-publish/m-douyu-v3-master/js/runtime\_0e4beee.js
https://shark2.douyucdn.cn/front-publish/m-douyu-v3-master/js/mdouyu\_commons\_a236906.js
https://shark2.douyucdn.cn/front-publish/m-douyu-v3-master/js/room\_e0f9a60.js

PC端web页面的计算js是：

https://sta-op.douyucdn.cn/front-publish/live-master/lib/runtime-room\_ae652a4.js
https://sta-op.douyucdn.cn/front-publish/live-master/lib/playerSDK-room\_b59f0f1.js
https://sta-op.douyucdn.cn/front-publish/live-master/lib/playerInit-room\_7b2b683.js
https://sta-op.douyucdn.cn/front-publish/live-master/lib/shark-file-loader\_469a1d6.js
https://sta-op.douyucdn.cn/front-publish/live\_player\_first-master/js/h5\_video\_bfa97da.js
https://sta-op.douyucdn.cn/front-publish/sdk-file-master/psDevice\_98c8efe.js

不过我没涉猎过JS，实在看着有点懵，所以特来论坛问一问，

![](https://static.52pojie.cn/static/image/hrline/1.gif)

大佬们，救救孩子吧！好几天了，一直纠结![](https://static.52pojie.cn/static/image/smiley/laohu/laohu10.gif)
