# 【原创】【Python】一个有意思的自定义字体

> **作者**: gentlespider | **发布时间**: 2021-03-24 11:28:00 | **版块**: 『编程语言区』 | **查看/回复**: 3205 / 8
> **原文**: [https://www.52pojie.cn/thread-1400684-1-1.html](https://www.52pojie.cn/thread-1400684-1-1.html)

---

#### 目标：易车论坛

##### 随便找个url，如https://baa.yiche.com/aodia4l/thread-24943442.html

##### 进入后发现页面是这样的

##### 然后打开response，看到的是这样的

![](https://attach.52pojie.cn/forum/202103/24/111320iuuwm6iz5rnq006z.png)

##### 我们发现字体加密了。

##### 于是找了下字体文件，发现是一个静态的url，而且内容没有任何变化，url是：<https://baa.yiche.com/yc-pc/comment/font/yc-ft.woff>

##### 然后我们对比看下：

![](https://attach.52pojie.cn/forum/202103/24/111710o11au12xpeo8p822.png)

##### 这里一共对400多个汉字进行了自定义

##### 通过fonttool库，我们对字体进行转换为xml文件，发现name对应的属性值是uniEE86 这样的数据

##### 在这里说下，页面上的&#xe和后面的分号是没用的。字体文件中的uni也是没用的。我们通过ee86确定了字是“了”。于是就很容易的确定了映射关系。通过分析，ee86前面加上\u ，即可得到对应的汉字“了”，那么我们就可以通过这个映射关系，对页面上的字体进行替换。

##### 代码：

```
from fontTools.ttLib import TTFont

word = TTFont('./yc-ft.woff') # 字体文件目录

value_lists = word.getGlyphOrder()[2:] # 获取字体文件中value

d = [eval(r"'\u" + i[3:] + "'") for i in value_lists]  # 拼接成汉字

d1 = ["" + i[-3:].lower() + ";" for i in value_lists] # 处理成网页内容

file_dict = dict(zip(d1, d)) # 建立映射字典

for key in file_dict: # 挨个替换，res就是网页的html源码
        res = res.replace(key.lower(), file_dict[key])
```

##### 总的来说，这个自定义字体还是蛮简单的，而且有意思，如果找对方法，其实破解还是很容易的，找不对的话，就一点点自己写映射关系吧。

#### 感谢支持
