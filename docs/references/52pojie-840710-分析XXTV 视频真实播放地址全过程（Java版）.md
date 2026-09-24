# 分析XXTV 视频真实播放地址全过程（Java版）

> **作者**: qiuqiu3 | **发布时间**: 2018-12-18 16:09:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 70163 / 287
> **原文**: [https://www.52pojie.cn/thread-840710-1-1.html](https://www.52pojie.cn/thread-840710-1-1.html)

---

*本帖最后由 潇未然 于 2019-6-6 18:30 编辑*

**分析视频地址有什么用？**
有些朋友经常会问到这个问题，其实这也是思维肌肉训练的问题。我举一个宋老师讲过的例子（天气预报和投资机会之间的关系）。说加勒比海出现热带飓风，普通小白看到这个新闻就会想和自己有什么关系呢？但是经过训练的大脑就会上网查飓风的等级，在哪里着落，移动方位是怎么样的。因为他知道俄克拉荷马库欣是美国原油期货的交割地，飓风会造成原油淤积那里运不出去，结果是库存增加，原油价格下跌。你还在看新闻，别人的期货单子已经飞出去了。回到问题上来，分析的这些地址怎么用？经过训练的人会想自己公司的 App 有哪些视频是挂上腾讯或者其它地方的，广告多不多，视频质量如何。假如把视频上传到 PPTV 上，自己再把视频地址分析出来，再做个播放器，那么广告问题、视频质量问题、带宽问题是不是都解决了啊。有一些影音 App，基本上都是用磁链搜索 + 迅雷 Mini 库来实现边下边播，技术痛点在哪里啊？迅雷有版权限制，大多数视频播放不了，Seed 少播放起来也很卡。还有一影音 App 找第三方解析网站，问题是同样的啊，线路经常被封，域名经常变化。有的朋友说：我没上班或者我们 App 没有播放视频的需求。那你也可以学学里面用到的 url 签名技术啊，将来和别的公司做数据共享的时候你们的 url 也是要加密的啊。 还有的朋友说：我根本不喜欢技术，也不打算从事程序员，这些地址对我一点用都没有。将来你家有小孩，你可以把视频下载到 U 盘上给孩子看啊，等等......
 **第三方视频分析网站所存在问题**

* 被解析的视频网站（PPTV、腾讯）url 签名算法改变，普遍来看，所有第三方平台反映都很迟钝；
* 现在各大视频网站也在封杀这种三方平台，服务经常被中断，域名经常改变，需要加群得知新域名；
* 解析出来的地址依赖平台提供的 H5 播放器，广告一大堆，视频清晰度还不够。

**项目运行效果**

![](https://attach.52pojie.cn/forum/201812/18/141646lrrr8rq7kb5rs8is.png)

游客模式下，PPTV 只提供标清、高清、超清三种格式，我感觉超清的效果就能满足观看需求了，给出播放地址（<http://v.pptv.com/show/qk3vbLiahSojradE.html>），输出标清、高清、超清，三种格式的分段视频地址，PPTV 视频真实的播放地址主要的获取渠道有：智能电视、电视盒子、Web 以及 App，这次我准备分析一下如何从 Web 里找出视频的真实播放地址。

**常见的视频播放技术的套路**
现在每行都有自己的套路，比如拍电影，只要出现武装直升机就必然会坠毁，只要出现火车那一定会出现铁路断裂的情形。视频播放也不例外，常见的有 H5 播放（一般有20分钟的限制）、P2P 播放（这个也是辅助）、ts 播放、分段播放（Flash 或 H5）等等。PPTV 就采用了分段播放+P2P辅助的方法，我们找出分段信息再反编译出 swf 签名算法，这样问题就迎刃而解了。

**找出播放地址**
使用带开发者模式的浏览器（火狐、谷歌都行）打开一个 PP 视频，拖动进度条，然后按响应 Body 排序，你会发现播放地址：
**![](https://attach.52pojie.cn/forum/201812/18/143755jb1dqtllh1i3ql3d.png)**

> http://42.56.93.26/16/5412864/0/59fcfcdf1e6bd26c3fa64c3c7a8a73f4.mp4?fpp.ver=1.3.0.24&key=14fb862504f61910d29de89e4981a93e&k=31a8c1459a1d7a7d5520e86da96f154b-bf57-1545129327%26bppcataid%3D38&type=web.fpp&vvid=52056dc1-d005-5d53-a186-c006bf1b3aa3

42.56.93.26：服务器地址
16：分段视频序号
5412864：偏移位，这个最后我们不传
0：固定值
9fcfcdf1e6bd26c3fa64c3c7a8a73f4.mp4：视频文件名
fpp.ver：播放器版本号
key：服务器返回的时间生成 16 位固定字符 + 16 位随机字符，可以不传的，这是 PPTV 迷惑我们，增加我们的[破解](https://www.52pojie.cn)难度
k：非常关键，需要解密
type：web.fpp（说明是 Web 访问的，App 这个值是不同的）
vvid：播放唯一标识，统计广告展示次数，检测卡顿时用的，我们同样不传

**上面的地址是谁发出请求的呢？**

![](https://attach.52pojie.cn/forum/201812/18/144750zsiod2ds77uusofo.png)

原来是一个叫做“player4player2.swf”的文件发出的，可以断定这就是播放器文件，我们现在要反编译它，先把这个 swf 下载到本地磁盘，然后用 AS3 Sorcere 打开这个文件（反编译），最好是把反编译的源代码导出来，然后用 Sublime Text 打开比较好（可以全局搜索）。

**计算 k 值**
我们搜索 "k": 找到赋值的地方，当 flag 和 iv 不为空的时候就用 Decrypt 计算 k 值：

![](https://attach.52pojie.cn/forum/201812/18/150050fg4z41yjg01g1e4n.png)

再搜索 Global.getInstance()["crypto"]，找到定义它的地方：

![](https://attach.52pojie.cn/forum/201812/18/152312afll0yle800i6y06.png)

上面的 new this.Crypto() 引用的是 VodFacade\_Crypto 类，找到 VodFacade\_Crypto 类发现是空类，原来是 PPTV  把核心算法以 swf 的方式嵌入到类里面了，我们要把 VodFacade\_Crypto 这个空类的内容提取出来。用 Flash Builder 新建一个 Flex 项目，代码如下：

[Actionscript3] *纯文本查看*

```
<?xml version="1.0" encoding="utf-8"?>
<s:Application xmlns:fx="http://ns.adobe.com/mxml/2009"
      xmlns:s="library://ns.adobe.com/flex/spark"
      xmlns:mx="library://ns.adobe.com/flex/mx" minWidth="955" minHeight="600"
      applicationComplete="init()">
 <fx:Declarations>
  <!-- 将非可视元素（例如服务、值对象）放在此处 -->
 </fx:Declarations>
 <fx:Script>
  <![CDATA[
   import flash.display.Loader;
   import flash.events.Event;
   import flash.net.URLRequest;
   import mx.core.ByteArrayAsset;
   private var byteArray:ByteArrayAsset;

   private function init():void{
    var _loader:Loader = new Loader();
    _loader.load(new URLRequest("player4player2.swf"));
    _loader.contentLoaderInfo.addEventListener(Event.COMPLETE, swfComplete);
    function swfComplete(event:Event):void
    {
     var myClass:Class = _loader.contentLoaderInfo.applicationDomain.getDefinition("VodFacade_Crypto") as Class;
     byteArray = new myClass as ByteArrayAsset;
    }
   }

   private function onSaveClick():void
   {
    var fr:FileReference = new FileReference();
    fr.save(byteArray, "VodFacade_Crypto.swf");
   }
  ]]>
 </fx:Script>

 <mx:Button label="Save File" left="10" top="10" id="saveButton" click="onSaveClick()" />

</s:Application>
```

这里要注意，把 player4player2.swf 放到 bin-debug 目录中，运行后点击 Save File 按钮，弹出另存对话框保存为 swf 文件，我们在用 AS3 Sorcere 打开这个保存的 swf 文件就看到计算 k 值的方法了。

**计算 key 值（和上面的 k 不是同一个）**
通过上图不难发现 key 值的计算是用 constructKey 方法生成的，同样搜索 constructKey：

![](https://attach.52pojie.cn/forum/201812/18/153711bs88p0opyx1g85yz.png)

有了 as3 源码改成 Java 代码就不难了，这里要注意原版 as3 的位运算是用无符号整型，Java 没有这个类型，只能用 Long 模拟。

**找出视频分段信息请求地址**
到现在为止，我们已经分析出 k 值、key 值，现在要做的是怎么找出视频分段信息。还是用之前的方法，找一找哪些文件是由 player4player2.swf 发出的：
**![](https://attach.52pojie.cn/forum/201812/18/154626lqwwdjb7ubbn55k9.png)**
果真找来了，原来是个 xml 文件，我们来分析一下：

> http://web-play.pptv.com/webplay3-0-29412562.xml?zone=8&pid=5701&vvid=ebe7b84a-5255-9186-d549-c0461fbe153b&version=4&token=L24-CYpmKPLh9EfpvsprW1JRK40FS\_8NA2zOtDTrtmtBspTp\_bOph4ZnnBzfm9O3qIeAg1f0w4rV%0D%0Ayyrq3KamgIuaYBPZN6ViSHXjngETGhTIKw52H4Awhng9jaX62-F6UHxwJDbqiMQVc7hIkTY13duO%0D%0AlTOpicDi5svdemeWXZM%0D%0A&username=18642727712\_180923o10&#182;m=type%3Dweb.fpp%26ahl\_ver%3D1%26ahl\_random%3D457772653e3f21707033616a26376824%26ahl\_signa%3Dd73b26d0178a002db51a774299197937a7501c958c0fe78910495942899158c7%26userType%3D0%26o%3D0&ppi=302c393939&isSports=1&p\_type=22&kk=ff70f71cb7d1660b20a68df11eb19474-69a2-5c18b372&referrer=&stime=2077&isIframe=0&o=0&duration=3086&sl=1&type=web.fpp&pageUrl=http%3A%2F%2Fv.pptv.com%2Fshow%2F0lzicfORKuvhb2UE.html&vts=1&r=1545119080458&scver=1&appplt=flp&appid=pptv.flashplayer.vod&appver=3.4.3.27&nddp=1

这个串参数比较多，实际上我们根本用不到，先看这个“webplay3-0-29412562.xml”，其中“webplay3-0-”是固定值，我们不关注，29412562.xml 里面的数字我们可以在播放网页的源代码找出来。

appplt、appid、appver、type，我们需要这四个值，具体为啥别的值不要下面再说。

param 参数有4个值非常关键，少了任何一个就被判定为盗链。

ahl\_ver：固定值（默认值为1）
type：固定值（默认值为web.fpp)
ahl\_random：16 位随机字符
ahl\_signa：ahl\_random + "web.fpp" + "-" + "1" + "V8oo0Or1f047NaiMTxK123LMFuINTNeI" 用这几个值拼串然后用 SHA256 编下码

把这几个参数拼起来加上地址访问后就可以得到视频分段请求地址了。

现在验证一下我上面说的算法，搜索 ahl\_random 找到如下方法：

![](https://attach.52pojie.cn/forum/201812/18/155519to1yd31dmho11o1z.png)

看到没，这里面还有 VIP 相关的参数等着你发掘新的功能。

**回头看**
还记得我们计算 k 值的时候所有到的 flag、iv 的值在哪里吗？我们看看上面这个 xml 的内容：

![](https://attach.52pojie.cn/forum/201812/18/155850mtt9d44099dvd9jr.png)

**channel 节点**

* nm -- 视频标题
* pic  -- 视频缩略图

**dt 节点**

* rid -- mp4文件名
* sh -- 服务器地址
* st  -- 请求时间（以请求时间为准，计算过期时间）
* id  -- 视频主键
* bh -- 备份服务器地址
* flag -- 这个没猜出来
* iv   -- 这个也没猜出来
* key -- 需要解密

**dragdata 节点**

* sgm -- 视频播放地址序列

dt 节点里有我们计算 k 值所需要的参数，如果你打算自己开发播放器（带播放进度条功能），那 sgm 里的 dur（时长）、fs（大小）、os（偏移量），就很重要了。

至此，PPTV 视频的真实播放地址在技术层面已经彻底脱光了给我们看，实际上算法非常简单，我稍后把 Java 源代码发到 github 上给大家下载，谢谢观看。

**开源地址**
https://github.com/qiuqiu3/pptv
把项目下载后导入到 MyEclipse 中，右键 App.java 那个类-》Run as -》Java Application。
