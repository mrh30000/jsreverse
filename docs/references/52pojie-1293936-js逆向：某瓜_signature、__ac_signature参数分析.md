# js逆向：某瓜_signature、_ac_signature参数分析

> **作者**: xmy00000 | **发布时间**: 2020-10-30 14:11:00 | **版块**: 『编程语言区』 | **查看/回复**: 11593 / 41
> **原文**: [https://www.52pojie.cn/thread-1293936-1-1.html](https://www.52pojie.cn/thread-1293936-1-1.html)

---

### 2020-10-28更新

今天抓取西瓜的时候发现需要带cookie才能得到详情页的数据。熟悉的\_\_ac\_signature字段，熟悉的配方。应该是跟某条详情页一样。

#### 正文开始

首先搜索参数出现的js文件
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028134806333.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
ctrl+f在js文件搜索\_signature
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028135017228.png#pic_center)
可以看出\_signature就是n，而j就是入口函数。跟进去
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028135257885.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
o是j函数的返回值，所以重点看1904行
改写一下
var o = window.byted\_acrawler.sign(i)
我们需要在n.call(a,i)处打个断点跟进去
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028140155176.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
js文件不大，可以全部放进webstorm里。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028141015577.png#pic_center)
简化一下
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028141058194.png#pic_center)
我们知道sign方法是window下的，所以我们打印一下是否有。
当然，此window不是浏览器中的window。node js中的window是global。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028141533647.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)

#### 补环境

这个属性很熟悉。我们可以在调试的浏览器中找到。
我们一般可以window.document = {}或者
window.document = {referrer: "<https://www.ixigua.com/>"}
直接使用网站主页

![在这里插入图片描述](https://img-blog.csdnimg.cn/2020102814302029.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
可以看点window.BytedAcrawler下确实有sign方法
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028143409704.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
调用这个方式，然后接着补userAgent等。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028143943346.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
可能碰到这个属性时都会有点懵逼
使用好哥哥教的插桩大法，其实就是打印值
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028144317546.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
这个可以看的更直观。
从而可以分析出z[S]为protocol时才能有length
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028144812443.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
这个太短！男人不能太短！
所以再找找别的原因。。

#### 获取长\_signature

当我们请求详情页的时候会返回一段代码，里面有一段js，很可疑。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028145330245.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028150804326.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
格式化之后看的更清晰。
可以看出f3函数时设置cookie

var **ac\_nonce = \_f2("**ac\_nonce");
**ac\_signature = window.byted\_acrawler.sign("",** ac\_nonce);
这个就是\_\_ac\_signature 的来源。后面再说

改写一下f3函数，然后复制浏览器中的cookie
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028151345774.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hteTk0MA==,size_16,color_FFFFFF,t_70#pic_center)
这样就能拿到想要的长\_signature。。。

#### \_\_ac\_signature 获取

**ac\_signature = window.byted\_acrawler.sign("",** ac\_nonce);
我们想要**ac\_signature 就需要先拿到\_\_ac\_nonce。
我们先请求详情页，会返回**ac\_nonce
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028151908892.png#pic_center)
拿到**ac\_nonce之后调用window.byted\_acrawler.sign("",** ac\_nonce)
我们就可以得到\_\_ac\_signature 的值了
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201028152142865.png#pic_center)
最后想要的数据拿到啦。。。。
