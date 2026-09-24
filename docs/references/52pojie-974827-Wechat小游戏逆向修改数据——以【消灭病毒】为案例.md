# Wechat小游戏逆向修改数据——以【消灭病毒】为案例

> **作者**: 小飞X | **发布时间**: 2019-06-13 21:58:00 | **版块**: 『移动安全区』 | **查看/回复**: 5548 / 4
> **原文**: [https://www.52pojie.cn/thread-974827-1-1.html](https://www.52pojie.cn/thread-974827-1-1.html)

---

0.前言
最近有一款很火的微信小游戏叫【消灭病毒】
在QQ小程序里也有类似的游戏叫 全民打飞机
控制战机移动射击，消灭病毒，就可以过关
这次就来试着分析一下它

![](https://attach.52pojie.cn/forum/201906/13/211856a587w6661w68nw56.png)

1.抓包
先来抓包，电脑端用fiddler
手机端推荐一个小众的抓包工具【抓包精灵】

![](https://attach.52pojie.cn/forum/201906/13/212553tul8mujmwqcfrztr.png)

这个wxwyjh.chiji-h5.com域名就是要找的

![](https://attach.52pojie.cn/forum/201906/13/212422pc2uvpjuomjdooxv.png)

调用archive/upload，上传游戏数据
2.使用wxappUnpacker对小程序进行解压缩
从data/data/com.tencent.mm/MicroMsg/{用户，一串乱码}/appbrand/pkg/xxxxxx.wxapkg
将小程序的包导入到电脑上
使用解包工具<https://github.com/qwerty472123/wxappUnpacker>
使用前，需要先配置nodejs环境
安装相关依赖
npm install 包名 -g

![](https://attach.52pojie.cn/forum/201906/13/213124u5rvcrrngncsnvir.png)

安装相应组件
npm i 包名 --save

最后使用node wuWxapkg.js xxxx.wxapkg
即可完成解压
目录大概是这样的

![](https://attach.52pojie.cn/forum/201906/13/213515k7hkn7ivejkhc8ts.png)

open目录装一些启动图片、音乐
sd目录装音乐
game.js 小游戏入口文件
game.json 小游戏配置文件
code.js 本次分析的核心文件
其它文件的功能，推荐查看官方文档：<https://developers.weixin.qq.com/minigame/dev/guide/>
3.分析code代码
将生成的文件夹用微信开发工具打开，
刚开始，想使用微信开发工具直接运行小程序

![](https://attach.52pojie.cn/forum/201906/13/214013t7f746f50l7z67o6.png)

却发现加载到100%后，没报错，但是无法继续运行
真机调试也是一样，卡在100%处
（不是很懂在哪里卡住了，大家有懂的，希望指点迷津）
代码都有了，开始逆向吧。

ctrl+F  “archive/upload”也就是刚刚发送的数据包
发现有多处重构，但都是调用了this.sign()

![](https://attach.52pojie.cn/forum/201906/13/214434dx7ew8wwzi8ik7we.png)

向下跟踪，会发现这个sign方法（里面有好多同名的sign）

![](https://attach.52pojie.cn/forum/201906/13/214554mciff9vct6uv0toz.png)

大概意思就是，根据参数的key升序排序，
根据sign类型，选择不同的密钥，拼接起来，md5加密

secretkey 哪里找呢？继续跟，会发现这个

![](https://attach.52pojie.cn/forum/201906/13/214904zynl7oj2noc2ev7p.png)

![](https://attach.52pojie.cn/forum/201906/13/215016iej7ppmxfx8fxpzn.png)

算法原理不细究了
可以解密得到secret 和 secret1两个密钥，
同时wx\_appid是微信小程序的标识，
openid是每个微信用户的标识
调用刚刚的sign，就可以构造数据包，实现修改游戏了
4.总结
1.获取.wxapkg，使用wxappUnpacker解密
2.使用微信开发工具 帮助调试
3.使用抓包工具帮助定位

文档只做交流，仅提供思路，故部分细节已略去
![](https://static.52pojie.cn/static/image/smiley/laohu/laohu8.gif)
