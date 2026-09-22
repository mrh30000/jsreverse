# 酷我音乐 各种付费歌曲，音质包括ape、flac无损音乐api接口

> **作者**: lianyi | **发布时间**: 2018-01-03 22:02:00 | **版块**: 『编程语言区』 | **查看/回复**: 46536 / 97
> **原文**: [https://www.52pojie.cn/thread-682968-1-1.html](https://www.52pojie.cn/thread-682968-1-1.html)

---

*本帖最后由 lianyi 于 2018-5-15 18:04 编辑*

1，首先用官方搜索歌曲的api获取歌曲id
搜索api：http://search.kuwo.cn/r.s?client=kt&all={$word}&pn={$page}&rn={$size}&uid=221260053&ver=kwplayer\_ar\_99.99.99.99&vipver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1

其中：
$word = 要搜索的歌曲或关键字
$page = 搜索页数（起始为0）
$size = 搜索分页大小

以 林俊杰的穿越 为例：
http://search.kuwo.cn/r.s?client=kt&all=穿越&pn=0&rn=10&uid=221260053&ver=kwplayer\_ar\_99.99.99.99&vipver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1
访问后取出 林俊杰 - 穿越 这首歌中 "MUSICRID": "MUSIC\_39763265" 中的39763265为歌曲id

2，用下面我提供的接口输入歌曲id（$id），格式（$ext），品质（$rate），就可以得到获取歌曲直链的入口地址

api接口：http://api.ly93.cc/kw.php?id={$id}&ext={$ext}&rate={$rate}
其中已知支持的格式和品质有：
aac：24，48
wma：96，128
mp3：128，192，320
ape：1000
flac：2000

例如上面那首 林俊杰的穿越
mp3格式320品质：http://api.ly93.cc/kw.php?id=39763265&ext=mp3&rate=320
无损ape格式1000品质：http://api.ly93.cc/kw.php?id=39763265&ext=ape&rate=1000
无损flac格式2000品质：http://api.ly93.cc/kw.php?id=39763265&ext=flac&rate=2000
…
访问本接口后可获得歌曲直链入口的url

3，取出该url访问即可获得对应格式和品质的歌曲直链地址了（前提酷我官方存在对应的歌曲文件）

例上面 林俊杰的穿越 无损flac格式2000品质的歌曲直链入口地址为：

林俊杰 - 穿越.flac ：http://nmobi.kuwo.cn/mobi.s?f=kuwo&q=R8ngNi17rInncUbiOVBI8V0BJzJODsANHbUI3IEkHudRwINDBOvYbE0xWa1My+8k+bmceK/YmpWfRAjj1oDwsAMUu4PLj8PjjlyWu4Fl13pIGGDpc8nhwVaiFNf2DTYgQfLMIpYg1Oo0iqIa+py66xHHgRplR5TY1U64Yh2Cg68feyrPSohZILChWaJVrkm17BFiE4FxyvgjhcNVUEP52vLiERMfIGfrB+7Y4dIhx6EZe7UvfQE6Z7lWWqQ2aY6c

打开这个地址，你看看到了什么？后面不用我说了吧，喜欢的请支持我哦！

补充
官方图片api：http://artistpicserver.kuwo.cn/pic.web?corp=kuwo&type=rid\_pic&pictype=url&content=list&size={$size}&rid={$id}

官方歌词api：http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId={$id} //完整lrc歌词需要自己取值拼接转换一下
转载请注明出处！
