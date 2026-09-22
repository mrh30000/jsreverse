# 【原创源码】用Python来实现一个简易的MP3播放器(采用酷我接口,包含接口分析)

> **作者**: 突突兔 | **发布时间**: 2016-07-28 11:18:00 | **版块**: 『编程语言区』 | **查看/回复**: 7264 / 19
> **原文**: [https://www.52pojie.cn/thread-521674-1-1.html](https://www.52pojie.cn/thread-521674-1-1.html)

---

*本帖最后由 突突兔 于 2016-7-28 11:26 编辑*

首先要找个下载音乐的地方

我看酷我不错，就它了。

![](http://ttt.sssie.com/content/uploadfile/201607/4a471469674002.png)

![](http://ttt.sssie.com/content/uploadfile/201607/fb5c1469674032.png)

http://sou.kuwo.cn/ws/NSearch?type=all&catalog=yueku2016&key=晚期拖延症患者key要等于搜索的内容
http://www.kuwo.cn/bang/content?name=%e4%b8%ad%e5%9b%bdTOP%e6%a6%9c这个是top榜单。
写个渣渣正则处理下<a  title=".\*?" target="\_blank">
![](http://ttt.sssie.com/content/uploadfile/201607/10fb1469674655.png)
可以看到他不知道从那里得到这个下载连接的。
![](http://ttt.sssie.com/content/uploadfile/201607/09dd1469675055.png)
最后追踪到了这个链接。
http://antiserver.kuwo.cn/anti.s?rid=MUSIC\_1034671&format=aac|mp3&response=url&type=convert\_urlrid=MUSIC\_要下载的歌曲IDformat=要下载的歌曲的格式
由于设计上是MP3所以要让format=mp3http://antiserver.kuwo.cn/anti.s?rid=MUSIC\_音乐ID&format=mp3&response=url&type=convert\_url![](http://ttt.sssie.com/content/uploadfile/201607/82661469675359.png)
成功获取到下载链接。
大概原理就是这个。
代码如下:

[Python] *纯文本查看*

```
#!/usr/bin/env python
#coding:utf8
from __future__ import division
import os
import urllib
import urllib2
import re
import sys
reload(sys)
sys.setdefaultencoding('utf8')
wenjian = os.path.exists(os.getcwd() + "\\temp\\")
if wenjian == False:
    os.mkdir(os.getcwd() + "\\temp\\")
a = raw_input(
    "Please enter the operation instructions: \r\n1. Search music \r\n2. View music charts \r\n")

def baofang(ID):
    gqurl = urllib2.urlopen("http://antiserver.kuwo.cn/anti.s?rid=MUSIC_" + ID
                            + "&format=mp3&response=url&type=convert_url")
    url = gqurl.read()
    urllib.urlretrieve(url, os.getcwd() + '\\temp\\' + ID + '.mp3')
    filename = os.getcwd() + '\\temp\\' + str(ID) + '.mp3'
    print "Download to : " + filename
    print "Exit, please press Ctrl + Alt keys."
    playMP3(filename)

def playMP3(name):
    import pymedia.audio.acodec as acodec
    import pymedia.muxer as muxer
    import pymedia.audio.sound as sound
    import time, wave, string, os

    name1 = str.split(name, '.')
    # Open demuxer first
    dm = muxer.Demuxer(name1[-1].lower())
    dec = None
    snd = None
    s = " "
    f = open(name, 'rb')
    while len(s):
        s = f.read(20000)
        if len(s):
            frames = dm.parse(s)
            for fr in frames:
                if dec == None:
                    # Open decoder
                    dec = acodec.Decoder(dm.streams[0])
                r = dec.decode(fr[1])
                if r and r.data:
                    if snd == None:
                        snd = sound.Output(r.sample_rate, r.channels,
                                           sound.AFMT_S16_LE)

                    snd.play(r.data)

    if type(snd) == 'pymedia.audio.sound.Output':
        while snd.isPlaying():
            time.sleep(0.05)

def search():
    search = raw_input("Enter the song you want to search for:\r\n")
    qwe = search.decode('gbk', 'replace')
    url = "http://sou.kuwo.cn/ws/NSearch?type=all&catalog=yueku2016&key=" + urllib.quote(
        qwe.encode('utf-8', 'replace'))
    response = urllib2.urlopen(url)
    data = response.read()
    pattern = re.compile(
        '''<a  title=".*?" target="_blank">''',
        re.S)
    text = re.findall(pattern, data)
    for element in text:
        print(element.encode('cp936'))
    ID = str(raw_input("Please enter the music you need to play ID:\r\n"))
    baofang(ID)
    return data

def catlist():
    response = urllib2.urlopen(
        "http://www.kuwo.cn/bang/content?name=%e4%b8%ad%e5%9b%bdTOP%e6%a6%9c")
    data = response.read()
    pattern = re.compile(
        '''<a  target="_blank">.*?</a>''',
        re.S)
    text = re.findall(pattern, data)
    for element in text:
        print(element.encode('cp936'))
    ID = str(raw_input("Please enter the music you need to play ID:\r\n"))
    baofang(ID)
    return data

switch = {'1': search, '2': catlist}

def f(a):
    switch.get(a)()

f(a)
```

EXE版本下载地址:https://yunpan.cn/c6QsNFJmiI58B （提取码：c949）
PY脚本下载地址:https://yunpan.cn/c6QsC9NsCgPFV （提取码：884a）
如果转载请标明来源:http://ttt.sssie.com/post-25.html
PS:在造这个播放器的时候最坑的就是编码问题了。py版的要装pymedia。
顺便打个广告:本人博客新开张。欢迎访问和交换友情链接。
地址:http://ttt.sssie.com/
