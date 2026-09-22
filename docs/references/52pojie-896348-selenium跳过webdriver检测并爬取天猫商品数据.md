# selenium跳过webdriver检测并爬取天猫商品数据

> **作者**: 4444nn | **发布时间**: 2019-03-14 00:59:00 | **版块**: 『编程语言区』 | **查看/回复**: 13320 / 29
> **原文**: [https://www.52pojie.cn/thread-896348-1-1.html](https://www.52pojie.cn/thread-896348-1-1.html)

---

## 简介

现在爬取淘宝，天猫商品数据都是需要首先进行登录的。上一节我们已经完成了模拟登录淘宝的步骤，所以在此不详细讲如何模拟登录淘宝。把关键点放在如何爬取天猫商品数据上。

过去我曾经使用get/post方式进行爬虫，同时也加入IP代{过}{滤}理池进行跳过检验，但随着大型网站的升级，采取该策略比较难实现了。因为你使用get/post方式进行爬取数据，会提示需要登录，而登录又是一大难题，需要滑动验证码验证。当你想使用IP代{过}{滤}理池进行跳过检验时，发现登录时需要手机短信验证码验证，由此可以知道旧的全自动爬取数据对于大型网站比较困难了(小型网站可以使用get/post，没检测或者检测系数较低)。

selenium是一款优秀的WEB自动化测试工具，所以现在采用selenium进行半自动化爬取数据。

### 编写思路

由于现在大型网站对selenium工具进行检测，若检测到selenium，则判定为机器人，访问被拒绝。所以第一步是要防止被检测出为机器人，如何防止被检测到呢？当使用selenium进行自动化操作时，在chrome浏览器中的consloe中输入windows.navigator.webdriver会发现结果为Ture，而正常使用浏览器的时候该值为False。所以我们将windows.navigator.webdriver进行屏蔽。
在代码中添加：

```
        options = webdriver.ChromeOptions()
        # 此步骤很重要，设置为开发者模式，防止被各大网站识别出来使用了Selenium
        options.add_experimental_option('excludeSwitches', ['enable-automation'])
        self.browser = webdriver.Chrome(executable_path=chromedriver_path, options=options)
```

同时，为了加快爬取速度，我们将浏览器模式设置为不加载图片，在代码中添加：

```
        options = webdriver.ChromeOptions()
        # 不加载图片,加快访问速度
        options.add_experimental_option("prefs", {"profile.managed_default_content_settings.images": 2})
```

同时，为了模拟人工操作，我们在浏览网页的时候，模拟下滑，插入代码：

```
    # 模拟向下滑动浏览
    def swipe_down(self,second):
        for i in range(int(second/0.1)):
            js = "var q=document.documentElement.scrollTop=" + str(300+200*i)
            self.browser.execute_script(js)
            sleep(0.1)
        js = "var q=document.documentElement.scrollTop=100000"
        self.browser.execute_script(js)
        sleep(0.2)
```

至此，关键的步骤我们已经懂了，剩下的就是编写代码的事情了。在给定的例子中，需要你对html、css有一定了解。
比如存在以下代码：

```
        self.browser.find_element_by_xpath('//*[@class="btn_tip"]/a/span').click()
        taobao_name = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.site-nav-bd > ul.site-nav-bd-l > li#J_SiteNavLogin > div.site-nav-menu-hd > div.site-nav-user > a.site-nav-login-info-nick ')))
        print(taobao_name.text)
```

第1行代码指的是从根目录(//)开始寻找任意(\*)一个class名为btn\_tip的元素，并找到btn\_tip的子元素a标签中的子元素span

第2行代码指的是等待某个CSS元素出现，否则代码停留在这里一直检测。以.开头的在CSS中表示类名(class)，以#开头的在CSS中表示ID名(id)。A > B，指的是A的子元素B。所以这行代码可以理解为寻找A的子元素B的子元素C的子元素D的子元素E出现，否则一直在这里检测。

第3行代码指的是打印某个元素的文本内容

看完上面的代码，我们大概了解了selenium中html、css的基本规则。我们来实践一下，在搜索商品的时候如何检测一共有多少页呢？不妨看看以下代码：

```
        # 等待该页面全部商品数据加载完毕
        good_total = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '#J_ItemList > div.product > div.product-iWrap')))

        # 等待该页面input输入框加载完毕
        input = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.ui-page > div.ui-page-wrap > b.ui-page-skip > form > input.ui-page-skipTo')))

        # 获取当前页
        now_page = input.get_attribute('value')
        print("当前页数" + now_page + ",总共页数" + page_total)
```

打开chrome中的控制台，转向console。点击console面板中的十字指针，移动到网页中的“共31页，到第1页”，然后点击。你就可以看到该元素的class名为ui-page-skipTo，由于在css中，class用.表示，所以代码为.ui-page-skipTo。

同时由于他的类型是input输入框，变成input.ui-page-skipTo。那么是否可以把代码直接写成.ui-page-skipTo呢？答案是不一定，如果这个元素在网页中是唯一的，没有其他的input的名字也叫ui-page-skipTo的话，就可以。

所以，为了保证代码健壮性，我们从他的父元素一直查找，直到我们觉得那个父元素是唯一的，那么这样查找到的元素就是唯一的了。所以最终查找到的结果为`.ui-page > div.ui-page-wrap > b.ui-page-skip > form > input.ui-page-skipTo`

最后，我们获取这个Input的值，代码为`input.get_attribute('value')`

在获取商品数据中，存在以下代码：

```
        # 获取本页面源代码
        html = self.browser.page_source

        # pq模块解析网页源代码
        doc = pq(html)

        # 存储天猫商品数据
        good_items = doc('#J_ItemList .product').items()

        # 遍历该页的所有商品
        for item in good_items:
            good_title = item.find('.productTitle').text().replace('\n',"").replace('\r',"")
            good_status = item.find('.productStatus').text().replace(" ","").replace("笔","").replace('\n',"").replace('\r',"")
            good_price = item.find('.productPrice').text().replace("￥", "").replace(" ", "").replace('\n', "").replace('\r', "")
            good_url = item.find('.productImg').attr('href')
            print(good_title + "   " + good_status + "   " + good_price + "   " + good_url + '\n')
```

首先，我们获取本页面的源代码`html = self.browser.page_source`，然后用pq模块对源代码进行格式化解析`doc = pq(html)`，通过上面的讲解，我们已经学会了如何分析css元素了。你会发现有一个DIV元素包含着所有商品元素，他的ID(不是class哦)为J\_ItemList，所以代码为`#J_ItemList`，由于我们要获取的是每一个商品，所以代码为`#J_ItemList .product`，这样就可以获取所有class名为product的元素啦。

接着对每个商品元素进行分析，后面的就不必详细说了。replace函数是对文本进行一些基本替换。

### 使用教程

1. [点击这里下载](https://www.google.com/chrome/)下载chrome浏览器
2. 查看chrome浏览器的版本号，[点击这里下载](http://chromedriver.storage.googleapis.com/index.html)对应版本号的chromedriver驱动
3. pip安装下列包
   * [x] pip install selenium
4. [点击这里](https://account.weibo.com/set/bindsns/bindtaobao)登录微博，并通过微博绑定淘宝账号密码
5. 在main中填写chromedriver的绝对路径
6. 在main中填写微博账号密码

```
    #改成你的chromedriver的完整路径地址
    chromedriver_path = "/Users/bird/Desktop/chromedriver.exe"
    #改成你的微博账号
    weibo_username = "改成你的微博账号"
    #改成你的微博密码
    weibo_password = "改成你的微博密码"
```

### 演示图片

![](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/1.%E6%B7%98%E5%AE%9D%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95/example.gif)
![](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/2.%E5%A4%A9%E7%8C%AB%E5%95%86%E5%93%81%E6%95%B0%E6%8D%AE%E7%88%AC%E8%99%AB(%E5%B7%B2%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95)/example2.png)
[爬虫过程图片查看不了点击这里](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/1.%E6%B7%98%E5%AE%9D%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95/example.gif)
[爬虫结果图片查看不了点击这里](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/2.%E5%A4%A9%E7%8C%AB%E5%95%86%E5%93%81%E6%95%B0%E6%8D%AE%E7%88%AC%E8%99%AB%28%E5%B7%B2%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95%29/example2.png)

### 源代码

项目源代码在[GitHub仓库](https://github.com/shengqiangzhang/examples-of-web-crawlers)

项目持续更新，欢迎您[star本项目](https://github.com/shengqiangzhang/examples-of-web-crawlers)