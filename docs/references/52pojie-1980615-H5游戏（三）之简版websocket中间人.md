# H5游戏（三）之简版websocket中间人

> **作者**: 闷骚小贱男 | **发布时间**: 2024-11-12 14:17:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6027 / 31
> **原文**: [https://www.52pojie.cn/thread-1980615-1-1.html](https://www.52pojie.cn/thread-1980615-1-1.html)

---

[H5游戏（一）H5游戏之WebSockets初涉](https://www.52pojie.cn/thread-1629782-1-1.html)
[H5游戏（二）给游戏做内挂](https://www.52pojie.cn/thread-1631515-1-1.html)

## 为什么会又这篇文章（废话）

这段时间研究一个Cocos2D-JS的小APP，发现能一直领精英副本奖励，所以㝍了一个ajs，但是操作下来速度太慢了。
黄鸟抓包发现是ws通信（奇怪的是FD抓不到。），解密多个jsc之后发现分析代码也不简单
想着用fiddlerScript替换WX小程序ws的帐号登录，效果始终不如意。
突然想到用中间人的形式，APP的所有数据都通过我搭建的服务器，并由此服务器转发给真正的服务器，收到信息后下发给APP，开干。

fiddler和小黄鸟的抓包，好像都不能发送字符串或者是HEX给服务器？

### bug的发现过程

* 单人模式闯关未完成，重启APP之后还是之前的界面
* 精英关闯关未完成，重启APP之后会下发一个奖励补发邮件（再次重启无邮件）
  1. 查看所有应用的本地文件，发现databases中的jsb.sqlite很可疑，打开后发现有战斗数据，
  2. 再次精英闯关并结束APP，把jsb.sqlite文件复制到另一个文件夹，重启APP，收到补发邮件
  3. 把备份的jsb.sqlite复制回databases中，重启APP，依然还能收到补发邮件。
  4. 所以抓包，分析，找到提交精英关未完成的那一条数据，重复发送，会一直收到补发邮件（上限50封邮件）
* 重新开一局之后，jsb.sqlite文件失效，复制后无补发邮件

### 为什么要用中间人？

1. 易语言wss刷副本奖励之后，app会掉线，需要重新关了才能重连。。
2. 易语言wss刷副本奖励之后，如果用易语言wss领奖励，需要提交邮件的id，需要逆向代码，耗时，但是如果完成之后的确挺好，但是对我这种小白来说挺难
3. 中间人刷奖励之后，不需要关闭APP

## 用到的工具

* 易语言是必备。。
* e2ee
* fiddler

## 分析/操作

### 修改ws服务器地址

APP是通过一个.json文件来获取ws服务器地址的，所以大大提升了可操作性
我们通过fd的“自动回复器（AutoResponse）”修改ws的服务器到笔记本易语言搭建的e2ee

![](https://attach.52pojie.cn/forum/202411/12/120248h1iar1ktaq0sm4tk.png)

这样的话，笔记本易语言e2ee搭建的服务器就起到中间人的形式

### 易语言用e2ee搭建服务器

1. 因为是中间人，所以WebSocket服务器和WebSocket客户端 都用到了，所以设置2个变量

![](https://attach.52pojie.cn/forum/202411/12/123258wnrt93dnstr6d97p.png)

| WebSocket服务器 | WebSocket客户端 |
| --- | --- |
| 接收APP发来的消息 | 发送APP发来的消息给真正的服务器 |

2. 初始化服务器和客户端

![](https://attach.52pojie.cn/forum/202411/12/123500o1cl74s7vbnvi47l.png)

3. 程序收到APP发来消息的函数
   收到数据之后，定义客户句柄（下发数据需要），并转发给真实的服务器

![](https://attach.52pojie.cn/forum/202411/12/124519hctrlkikbqciizab.png)

4. 程序收到真实服务器下发的数据，并转发给客户

![](https://attach.52pojie.cn/forum/202411/12/124900hl7b9875i954yi55.png)

至此就完成了一个中间人的操作

5. 当然也可以增加一个按钮一键刷N封邮件

![](https://attach.52pojie.cn/forum/202411/12/141132xxmpygiezy6g3x30.png)

## 实现效果

用几行代码实现中间人补发副本奖励数据

![](https://attach.52pojie.cn/forum/202411/12/140231duwscmmk2c5nxy5s.gif)
