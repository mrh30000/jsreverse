# javscript 抓取 抖音弹幕 礼物信息等...

> **作者**: ey5740 | **发布时间**: 2024-06-01 16:55:00 | **版块**: 『精品软件区』 | **查看/回复**: 1640 / 8
> **原文**: [https://www.52pojie.cn/thread-1930498-1-1.html](https://www.52pojie.cn/thread-1930498-1-1.html)

---

*本帖最后由 ey5740 于 2024-6-1 16:57 编辑*

早前发布的js 抓取抖音弹幕被和谐掉了 https://www.52pojie.cn/thread-1756031-1-1.html
原因竟然是字节跳动改了代码命名规范，将 驼峰改为 下划线 userId 变 user\_id
![](https://static.52pojie.cn/static/image/hrline/1.gif)

现在修复了,并重构了代码：

git 仓库地址：https://github.com/jiansenc/tiktok\_barrage\_nodejs

抓取内容 包括 点赞,礼物，房间进入，弹幕等信息, 分别对应 text:文字 join: 进入房间, like:点赞, gift:礼物

使用方法：
你自己先启动一个websocket 服务 并监听 2019端口 ，然后浏览器进入抖音直播间, 在控制台执行下面js 代码 。 js 会给你的websocket 服务 发送消息。

[JavaScript] *纯文本查看*

```
var scriptElement = document.createElement('script')
scriptElement.src = '[color=#5ce638 !important]https://jiansenc.github.io/tiktok_barrage_nodejs/index.js?t=' + Math.random()
document.body.appendChild(scriptElement)
```

![](https://attach.52pojie.cn/forum/202406/01/165212innngxk9n68kgvvn.png)

抓取内容： json string

[JavaScript] *纯文本查看*

```
{
  "message_type": "gift",
  "user_follow_status": "y",
  "user_id": "123456",
  "user_url": "https://www.douyin.com/user/xxx",
  "user_nickName": "userxxx",
  "user_avatar": "https://p3.douyinpic.com/xxx.jpeg",
  "user_gender": "女",
  "user_is_admin": "n",
  "user_is_super_admin": "n",
  "user_level_value": "7",
  "user_level_icon": "http://p3-webcast.douyinpic.com/xxx.image",
  "user_fans_light_level_value": "2",
  "user_fans_light_level_name": "xxx",
  "user_fans_light_icon_url": "http://p3-webcast.douyinpic.com/xxx.image",
  "gift_id": "685",
  "gift_url": "http://p11-webcast.douyinpic.com/img/xxx.png",
  "gift_name": "粉丝团灯牌",
  "gift_total_count": "1",
  "message_describe": "userxxx 送出了 粉丝团灯牌 x1"
}
```

demo:

![](https://attach.52pojie.cn/forum/202406/01/165247gq8zgojrjt5ggurj.png)

自己写了一个易语言工具, 用来接收消息并转发出去 。 其他html 就可以接收到了,可以在  ws服务助手.exe。作用是创建服务并监听。
你也可以自己实现websocket.

...
