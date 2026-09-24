# 利用javascript代码实现自定义百度网盘分享密码

> **作者**: daowuya | **发布时间**: 2018-08-30 14:53:00 | **版块**: 『编程语言区』 | **查看/回复**: 5307 / 6
> **原文**: [https://www.52pojie.cn/thread-789831-1-1.html](https://www.52pojie.cn/thread-789831-1-1.html)

---

采用 JS 的方式修改密码。
方法很简单：修改 makePrivatePassword 这一函数即可。
压缩版javascript:require(["function-widget-1:share/util/service/createLinkShare.js"]).prototype.makePrivatePassword=function(){return prompt("请输入自定义的密码","1234")}原版require(["function-widget-1:share/util/service/createLinkShare.js"]).prototype.makePrivatePassword = () =&gt; {return prompt("请输入自定义的密码", "1234")}**使用方法**
首先，选择要分享的文件，点击分享按钮。这时候，按 F12 打开控制台，切换至 Console ，输入代码按回车即可。当然，你也可以存为书签，点一下书签。然后点击创建私密链接，会弹出输入框，输入密码即可！注意使用代码前要先点一下 分享 按钮，相关模块才会载入，这时候用代码才有效果。
![](https://attach.52pojie.cn/forum/201808/30/145249eyyouzp7w2exzeoy.gif)
或者自己创建一个网址收藏夹，名字随意，网址复制上方代码粘贴进去，在我们要分享的文件，点击分享后出现的页面，先不要点击分享，先点击自己创建的收藏夹，然后再点分享。密码必须是 4 个字符,中文加一个数字或字母
其他类型请各位自己探索
好像如果密码有中文，第一次访问时会提示错误，刷新一下才正常。
