# Python攻破淘宝网各类反爬手段，采集淘宝网ZDB（女用）的销量！

> **作者**: 长情 | **发布时间**: 2019-09-23 18:48:00 | **版块**: 『编程语言区』 | **查看/回复**: 16731 / 36
> **原文**: [https://www.52pojie.cn/thread-1028214-1-1.html](https://www.52pojie.cn/thread-1028214-1-1.html)

---

**声明：**由于某些原因，我这里会用手机代替，其实是一样的！**环境：**

* windows
* python3.6.5

**模块：**

* time
* selenium
* re

环境与模块介绍完毕后，就可以来实行我们的操作了。
完整代码：
链接：https://pan.baidu.com/s/1vL59KfVw5QWut9kG\_EljeA
提取码：rt9q
（过期后，提醒我补即可！）**第一步：**
进入淘宝首页：
driver = webdriver.Chrome()driver.get('http://www.taobao.com')
![](https://img2018.cnblogs.com/blog/1813177/201909/1813177-20190923155959752-255072205.png)**第二步：**

* 在输入框中，输入想要查找的商品（keyword），往后用手机代替。
* 点击搜索按钮

driver.find\_element\_by\_id('q').send\_keys(keyword)driver.find\_element\_by\_class\_name('btn-search').click()
       它会跳转到我们的登陆界面：

我们选择扫码登陆，那么既然要扫码，肯定就需要等待时间。一般提供10S即可，取决于你单身的年龄
time.sleep(10)

登陆后，我们跳转到了 含有信息的页面：
![](https://img2018.cnblogs.com/blog/1813177/201909/1813177-20190923160800720-1985415581.png)
 **第三步：**
提取出我们需要的信息，价格、订单量、商品信息、卖家地址：
![](https://img2018.cnblogs.com/blog/1813177/201909/1813177-20190923161029785-1631295516.png)

很容易发现我们的商品信息都是包括在了class属性为item J\_MouserOnverReq  的div标签当中。
所以可以写出我们的xpath规则：
        info = li.find\_element\_by\_xpath('.//div[@class="row row-2 title"]').text        price = li.find\_element\_by\_xpath('.//a[@class="J\_ClickStat"]').get\_attribute('trace-price') + '元'        deal = li.find\_element\_by\_xpath('.//div[@class="deal-cnt"]').text        name = li.find\_element\_by\_xpath('.//div[@class="shop"]/a/span[2]').text        position = li.find\_element\_by\_xpath('.//div[@class="row row-3 g-clearfix"]/div[@class="location"]').text **第四步：**
第一页采集完毕后，我们需要进行翻页操作。
记住，这里千万不要去模拟点击下一页，会被反爬虫策略命中！
我们可以构造url，
![](https://img2018.cnblogs.com/blog/1813177/201909/1813177-20190923161447904-1113390932.png)
很容易发现我们的url的步长为44，并且总页数为100。那么我们可以先提取出我们的总页数：
    token = driver.find\_element\_by\_xpath('//\*[@id="mainsrp-pager"]/div/div/div/div[1]')    token = token.text    token = int(re.compile('(\d+)').search(token).group(1))
然后循环构造url：
[url=]![](https://common.cnblogs.com/images/copycode.gif)[/url]    num = 1    while num != token - 1:        driver.get('https://s.taobao.com/search?q={}&s={}'.format(keyword, 44 \* num))        driver.implicitly\_wait(10)        drop\_down()        get\_product()        num += 1
[url=]![](https://common.cnblogs.com/images/copycode.gif)[/url]**效果：**
少儿不宜

![](https://attach.52pojie.cn/forum/201909/23/184220w1s1o12d122iq1is.png)

好了今天的教程到此结束，希望对你有所帮助！
