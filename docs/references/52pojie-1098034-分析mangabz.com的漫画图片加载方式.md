# 分析mangabz.com的漫画图片加载方式

> **作者**: h4ckm310n | **发布时间**: 2020-02-03 19:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 16088 / 15
> **原文**: [https://www.52pojie.cn/thread-1098034-1-1.html](https://www.52pojie.cn/thread-1098034-1-1.html)

---

*本帖最后由 h4ckm310n 于 2020-2-3 19:56 编辑*

最近正在用python写一个下载在线漫画的程序，其中一个漫画网站就是这个mangabz.com。在加载图片的时候，图片并不是在网页中静态加载的，而是通过Ajax动态获取图片链接再显示。其实可以通过模拟浏览器访问的方式来直接获取，但是这样效率有点低，有没有别的方式呢？

打开浏览器的开发者工具，可以看到加载完成后的网页中包含了图片：

![](https://attach.52pojie.cn/forum/202002/03/193100pb7f8hymh49h34zm.png)

但是，这是动态加载后的结果，关闭JS之后再刷新，图片就加载不出来了：

![](https://attach.52pojie.cn/forum/202002/03/193132astfb1znfqzfv9ev.png)

翻一下JS内容，在chapter.js里面找到一个“ajaxloadimage()”，根据函数名字判断，这应该就是加载图片的关键。

![](https://attach.52pojie.cn/forum/202002/03/193230l37tar4i3qx744r4.png)

在这个函数里，通过Ajax向chapterimage.ashx发送请求，那么请求的参数都是些啥呢？

其中，参数”key“的值mkey是一个空字符串，在函数开头就能看到。
其他几个值都是全大写，应该是常量，在chapter.js里找不到，不妨回到之前的章节网页去看看：

![](https://attach.52pojie.cn/forum/202002/03/193322tz6jeeoj33oqae9w.png)

知道了URL和请求参数，现在可以看看这个请求得到了什么响应内容：

![](https://attach.52pojie.cn/forum/202002/03/193407dr0rgzegorggojnj.png)

这是一段混淆过的JS脚本，试试看直接执行可以得到什么：

![](https://attach.52pojie.cn/forum/202002/03/193444aat1cwo7ru3tfrav.png)

出现了！这个数组的第一项就是这一页的图片地址。

以上操作都是在浏览器中进行的，知道了过程，接下来就可以用python来操作了。

简单来说就是以下几个步骤：
1. 访问章节网址，得到网页内容（text）
2. 用正则表达式找到上述几个变量的值，对chapterimage.ashx发送请求，得到JS脚本
3. 用execjs模块运行这个脚本（execjs.eval()），得到图片的地址。
4. 如此访问每一页，直到得到404，说明已经访问了每一页，这样就得到了所有的图片。

附上python的代码片段：

[Python] *纯文本查看*

```
page_no = 1
img_urls = []

while True:
    page_url = url + '-p' + str(page_no) + '/'
    r = requests.get(page_url)
    if r.status_code == 404:
        break

    cid = re.compile('var MANGABZ_CID=[^;]*;').findall(r.text)[0].lstrip('var MANGABZ_CID=').rstrip(';')
    _mid = re.compile('var MANGABZ_MID=[^;]*;').findall(r.text)[0].lstrip('var MANGABZ_MID=').rstrip(';')
    _dt = re.compile('var MANGABZ_VIEWSIGN_DT=[^;]*;').findall(r.text)[0].lstrip('var MANGABZ_VIEWSIGN_DT="').rstrip('";')
    _sign = re.compile('var MANGABZ_VIEWSIGN=[^;]*;').findall(r.text)[0].lstrip('var MANGABZ_VIEWSIGN="').rstrip('";')

    img_ajax_url = page_url + 'chapterimage.ashx'
    params = {
        'cid': cid,
        'page': page_no,
        'key': '',
        '_cid': cid,
        '_mid': _mid,
        '_dt': _dt,
        '_sign': _sign
    }
    ajax_r = requests.get(img_ajax_url, headers=headers, params=params)
    img_url = execjs.eval(ajax_r.text)
    img_urls.append(img_url[0])
    page_no += 1
```

原文来自我的个人网站：https://ssjgoku.win/?p=461
