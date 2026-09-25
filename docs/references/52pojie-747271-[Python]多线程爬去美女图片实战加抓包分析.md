# [Python]多线程爬去美女图片实战加抓包分析

> **作者**: 4028574 | **发布时间**: 2018-06-02 12:11:00 | **版块**: 『编程语言区』 | **查看/回复**: 7457 / 22
> **原文**: [https://www.52pojie.cn/thread-747271-1-1.html](https://www.52pojie.cn/thread-747271-1-1.html)

---

*本帖最后由 wushaominkk 于 2018-6-2 17:06 编辑*

昨天发了一个爬去影视网站的帖子 看到很多有很多朋友蛮喜欢的
正好又看到一个帖子上二楼说 图片的地址随机化了 不能直接取

才有了此贴  本帖的目的是
原贴中的方法是方法是访问每个页面去取得这个图片的地址 这样是很浪费性能的 本帖是通过分析js代码从中找到他交互的地址得到他的返回值 自己构造图片地址 实现下载
这样的好处就是 我们不需要为了下载每个图片都去访问一遍他们的页面  只需要访问第一页获得这个图片的前段的url 后面的图片地址自己构造就都可以下载了
其实本帖就是对原贴的升级和改进而已

原贴在此：<https://www.52pojie.cn/thread-691064-1-1.html>
原贴中使用的是多进程 本帖采用多线程的方式因为有linux开发经验的朋友 应该知道  win系统是没有多进程的概念的 多进程是linux的概念
鉴于很多朋友是在win平台下运行的 所以这里采用多线程的方法进行操作

第一步进入网站

[Python] *纯文本查看*

```
www.mmjpg.com
```

进入之后可以看到很多图片这里打开浏览器只带的开发者模式我相信这个大家应该都会了就不多说了 然后点击左上角的

![](https://attach.52pojie.cn/forum/201806/02/113158itvmmantooauk22h.png)

点击其中一个图片 就可以看到这个图片的地址了 然后使用xpath语法来获得这个图片的href那么开始  至于xpath的语法 大家可以进入百度里面有详细介绍 这里就不多言了

[Python] *纯文本查看*

```
//div[@class='pic']/ul/li/a/@href   [font=宋体]这样就获得了第一页的所有的图片的链接[/font]
```

第二步或者单个链接中的所有图片的下载地址这里随便点击一张图片进入之后照例按下F12 选择图片  这里需要获得是图片的名称 和 所有图片的链接

![](https://attach.52pojie.cn/forum/201806/02/113236e2p0ztk28pktgkx6.png)

[Python] *纯文本查看*

```
//div[@class='article']/h2/text()   [font=宋体]图片的名称[/font]
```

然后来取图片的链接  这里就是关键了 首先我们按下F5刷新一下因为大家知道  如果这个页面需要用到js那么必须要加载  那么抓包的话 是可以看到他加载的js的

![](https://attach.52pojie.cn/forum/201806/02/113236kqyeex80zxocooze.png)

这里看到他加载了一个content.js 那么我们直接进去分析他就可以了  但是鉴于可能有的朋友不太知道js的语法  那么告诉大家一个偷懒的方法首先先点击clear 清理一下因为这个图片进入之后可以点击全部图片那么正常的情况下应该是你点击全部图片之后他会发包 那么我只要知道他发的什么包 发包时的参数 然后自己去构造这个发包的请求就可以了那么当我们点击全部图片之后会看到如下内容

![](https://attach.52pojie.cn/forum/201806/02/113237lqw82nrnqo862ggj.png)

大家看到 他会发送一个data.php的请求  而且后面的指示是content.js中47行发出的 所以跟我们上面分析的一样 那么我们看看 他的返回

![](https://attach.52pojie.cn/forum/201806/02/113358hljn8b8y6fpfyfuf.png)

他返回了一串看不懂的东西  其实稍微懂点的人应该能明白了 这里返回的是图片的随机的名称因为我们当前在第一张图那么我们看下图片的地址

![](https://attach.52pojie.cn/forum/201806/02/113237c5eth7a48ar867vi.png)

有没有发现什么一样的东西
所有的地址中有固定的值 比如第一个是 1ifn.jpg  第二个是2ig6
也就是说这个名称中 第一个字符是图片序号 第二字符是固定的i那么后两位就是上面返回的值第一个是fn 第二个是g6
那么到此图片的所有名称  我们已经拿到了 那么就可以去下载了

那么来分析一下参数  大家能看到 他需要两个参数
第一个是id
第二个是 page

![](https://attach.52pojie.cn/forum/201806/02/113358x811dhdioib1bd8v.png)

这个就是id至于page 那个应该是请求的显示页面 给最大就行 他自己的js中就写的8899 说明这个应该是最大了 所以这个参数中  只有一个id是需要的 其他的都不需要

这个data.php 请求是get的值 在浏览器中直接访问是不返回的 所以他可能检测了请求头中的某些值 我们只需要在请求中加上就可以了

好了 那么分析已经完成 下面开始上代码
Python环境: python2.7
模块用到 requests   lxml

[Python] *纯文本查看*

```
#!/usr/bin/env python
# -*- coding: utf-8 -*-

from threading import *
import requests
from lxml import etree
import os

gHeads = {
    "User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36",
}

nMaxThread = 3
ThreadLock = BoundedSemaphore(nMaxThread)

class PhotoThread(Thread):
    def __init__(self,url):
        Thread.__init__(self)
        self.url = url

    def run(self):
        try:
            PhotoName,firsturl,uid = self.GetPhotoInfo(self.url)
            if uid :
                secName = self.GetPhotoRandomName(uid)
                if secName:
                    self.DownloadPhoto(firsturl,secName,uid,PhotoName)
        finally:
            ThreadLock.release()

    def GetPhotoInfo(self,url):
        heads = {
            "Host": "www.mmjpg.com",
            "Referer": "http://www.mmjpg.com/"
        }
        heads.update(gHeads)
        try:
            html = requests.get(url,headers=heads)
            html.encoding="utf-8"
            xmlContent = etree.HTML(html.text)
            PhotoName = xmlContent.xpath("//div[@class='article']/h2/text()")[0]
            imgUrl = xmlContent.xpath("//div[@class='content']/a/img/@src")[0]
            firstImgUrl = imgUrl[:imgUrl.rfind("/")]
            uid = firstImgUrl[firstImgUrl.rfind("/")+1:]
            return PhotoName,firstImgUrl,uid
        except:
            return None,None

    def GetPhotoRandomName(self,uid):
        heads = {
            "Host":"www.mmjpg.com",
            "Referer":"http://www.mmjpg.com/mm/%s"%(uid)
        }
        heads.update(gHeads)
        try:
            html = requests.get("http://www.mmjpg.com/data.php?id=%s&page=8999"%(uid),headers=heads).text
            retName = html.split(",")
            return retName
        except:
            return None

    def DownloadPhoto(self,firstUrl,randomName,uid,photoName):
        heads = {
            "Host": "img.mmjpg.com",
            "Referer":"http://www.mmjpg.com/mm/%s"%(uid)
        }
        heads.update(gHeads)
        savePath = "./photo/%s"%photoName
        if not os.path.exists(savePath):
            os.makedirs(savePath)
        for i in xrange(len(randomName)):
            url = "%s/%si%s.jpg"%(firstUrl,i+1,randomName[i])
            html = requests.get(url,headers=heads)
            if html.status_code == 200 :
                with open("%s/%d.jpg"%(savePath,i+1),"wb") as f:
                    print "Download : %s/%d.jpg"%(photoName,i+1)
                    f.write(html.content)
                    #sleep(0.2)
            else:
                return None

def main():
    nMaxPage = int(raw_input("请输入需要几页: "))
    for i in xrange(nMaxPage):
        url = "http://www.mmjpg.com/" if i == 0 else "http://www.mmjpg.com/home/%d"%(i+1)
        html = requests.get(url,headers=gHeads).text
        xmlContent = etree.HTML(html)
        urlList = xmlContent.xpath("//div[@class='pic']/ul/li/a/@href")
        for url in urlList:
            ThreadLock.acquire()
            t = PhotoThread(url)
            t.start()

if __name__ == '__main__':
    main()
```

代码中使用的是3条线程同时操作 可以自己修改nMaxThread 这个参数 来实现更多条线程  下载的时候最好加上延时 这样不至于被检测到
最后附上成品图

![](https://attach.52pojie.cn/forum/201806/02/121249aqxhkmo4jzbk3oqa.png)

请看官看请备好纸巾  以免  你懂的![](https://static.52pojie.cn/static/image/smiley/laohu/laohu25.gif)

![](https://attach.52pojie.cn/forum/201806/02/121836zao0aacrr33a7owo.png)
