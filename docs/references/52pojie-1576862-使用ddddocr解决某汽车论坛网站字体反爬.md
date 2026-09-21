# 使用ddddocr解决某汽车论坛网站字体反爬

> **作者**: 漁滒 | **发布时间**: 2022-01-16 23:37:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10989 / 38
> **原文**: [https://www.52pojie.cn/thread-1576862-1-1.html](https://www.52pojie.cn/thread-1576862-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E4%BD%BF%E7%94%A8ddddocr%E8%A7%A3%E5%86%B3%E6%9F%90%E6%B1%BD%E8%BD%A6%E8%AE%BA%E5%9D%9B%E7%BD%91%E7%AB%99%E5%AD%97%E4%BD%93%E5%8F%8D%E7%88%AC)

链接地址：aHR0cHM6Ly9jbHViLmF1dG9ob21lLmNvbS5jbi9iYnMvdGhyZWFkLzIyMTRiYWZhMDIyMGY4MGQvMTAxMTIzODE0LTEuaHRtbA==

![在这里插入图片描述](https://img-blog.csdnimg.cn/2c39cfac09c443b8bd0ac7705085da25.png?)

打开网页后，需要获取文章的正文内容，如果使用常规的办法，获取到的是存在乱码的内容

![在这里插入图片描述](https://img-blog.csdnimg.cn/89cd3801aca147b6b2c477a53ae2d3b9.png#pic_center)
可以看到有少许的文字出现乱码，然后在网页f12 查看

![在这里插入图片描述](https://img-blog.csdnimg.cn/3003144386984429a377a25c6fbd8449.png?)
其网页中确实不是常规的文字，而是这个网站的自定义字体。如果直接忽略这个文字，肯定是不可行的，得想办法把图片变成文字。

在源代码中搜索【tff】可以找到字体文件的地址，下载这个字体文件下来
![在这里插入图片描述](https://img-blog.csdnimg.cn/a8c345c6407848809a882d9baee90ce4.png#pic_center)
然后在网站  <http://font.qqe2.com/index-en.html>  中可以进行在线查看

![在这里插入图片描述](https://img-blog.csdnimg.cn/aa89a061828b44e493cc85caaa08b880.png?)

那么尝试先使用python把ttf文件转换为一个一个的图像

![在这里插入图片描述](https://img-blog.csdnimg.cn/47357ee2c19e4cffb41291595a8e98c2.png?)
在转换的时候需要注意，尽量把需要识别的内容放置在中间，并在在周边留有一定的空白，这样可以提高识别的准确率。

接下来就是要ocr来将图片转换为文字了，这里我是用的是ddddocr，安装相对来说很方便

```
pip install ddddocr
```

接着把每一张图片放到ddddocr这个模型去识别，就可以得到每一张图片的文字内容，最后得到一个文件名个文字的映射关系，是用方法也非常简单。

```
Oocr = ddddocr.DdddOcr()  # 初始化识别模型
text = Oocr.classification(img_bytes=image_io)  # 把图片的字节放到模型中，返回识别的文字
```

最后再请求一次，然后通过ocr识别得到的映射关系替换自定义字体

![在这里插入图片描述](https://img-blog.csdnimg.cn/94d9c3027c3f409d9fd1dc5fc2af3ab4.png?)
可以看到识别非常的准备，完美解决了字体反爬的问题
