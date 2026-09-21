# 某芯片网站js反混淆分析与ast一键还原

> **作者**: 漁滒 | **发布时间**: 2022-02-21 22:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9873 / 54
> **原文**: [https://www.52pojie.cn/thread-1591331-1-1.html](https://www.52pojie.cn/thread-1591331-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E6%9F%90%E8%8A%AF%E7%89%87%E7%BD%91%E7%AB%99js%E5%8F%8D%E6%B7%B7%E6%B7%86%E5%88%86%E6%9E%90%E4%B8%8East%E4%B8%80%E9%94%AE%E8%BF%98%E5%8E%9F)

样品网址：aHR0cHM6Ly93d3cudGkuY29t

打开f12后打开网站，在主页源代码拉到最下面

![在这里插入图片描述](https://img-blog.csdnimg.cn/98279e2633a749b0b4ca8280e1fe235c.png#pic_center)
有一个文件路径都是随机英文的js文件，这次需要反混淆的就是这个js文件，先下载文件到本地

![在这里插入图片描述](https://img-blog.csdnimg.cn/4882c9c6b97c4b79be0c142e90631b32.png?)
格式化后发现代码非常混乱，难以阅读

![在这里插入图片描述](https://img-blog.csdnimg.cn/239864c881ab469d946d23eb38d171a9.png?)
![在这里插入图片描述](https://img-blog.csdnimg.cn/5560dbc3220c4afa92172ac3216f7220.png#pic_center)
函数开始的时候发现是先调用了sX函数，手动调试后发现，这个是定义的0-9的10个数字，这个函数可以先进行还原

![在这里插入图片描述](https://img-blog.csdnimg.cn/94482da3aa23406a9b5c330196306b2e.png?)
还原出数值后，就可以对作用域内的这些数字的变量进行回填

![在这里插入图片描述](https://img-blog.csdnimg.cn/58b38ee44fbf4c109e4d3c11245c8299.png?)
接着调用的就是gX函数，和上面的逻辑一模一样，先计算出二元运算的结果，然后再进行回填

![在这里插入图片描述](https://img-blog.csdnimg.cn/10a33b0157e646d9ace2f4adf72fb0ae.png?)
接下来还是需要手动慢慢调试走一下流程，看看什么地方可以还原了，比较核心的就是字符串的还原，还是和ob混淆类似的思想，需要想办法在环境里面获取到解密函数，然后调用解密

![在这里插入图片描述](https://img-blog.csdnimg.cn/f7b8d7f5598b44608591b4c3dd421f95.png?)
字符串还原后，已经算是还原的七七八八了，还原后会发现有很多废代码，剩下的就是去除一些控制流和删除废代码

![在这里插入图片描述](https://img-blog.csdnimg.cn/897b604e541f4ea7b81d0e390e76573e.png?)
最后把废代码都删除后的结构大概是这样

![在这里插入图片描述](https://img-blog.csdnimg.cn/3d51c7ff46d44dd5bf81facd81dda97e.png?)
函数内部的一些逻辑比一开始容易理解了不少。我是用以往一周的js进行反混淆测试，都可以达到一键解混淆的效果。接下在尝试一下在网页中替换js

![在这里插入图片描述](https://img-blog.csdnimg.cn/d155f359d9284f83870602bf927706b3.png?)
![在这里插入图片描述](https://img-blog.csdnimg.cn/2c680402bf05419e971f7b3c7d265530.png?)
![在这里插入图片描述](https://img-blog.csdnimg.cn/34c9e5633f524f75a57d5bb097b49312.png?)
替换js后，请求体和响应体都是正常的，说明反混淆正确，反混淆工作完成。

接下来就是加密算法的分析，预计算法比较复杂，需要耐心一步一步跟进，希望有生之年可以分析出来吧！！！
