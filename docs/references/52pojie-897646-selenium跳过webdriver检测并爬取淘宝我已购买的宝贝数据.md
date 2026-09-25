# selenium跳过webdriver检测并爬取淘宝我已购买的宝贝数据

> **作者**: 4444nn | **发布时间**: 2019-03-14 16:17:00 | **版块**: 『编程语言区』 | **查看/回复**: 7582 / 7
> **原文**: [https://www.52pojie.cn/thread-897646-1-1.html](https://www.52pojie.cn/thread-897646-1-1.html)

---

## 简介

上一个博文已经讲述了如何使用selenium跳过webdriver检测并爬取天猫商品数据，所以在此不再详细讲，有需要思路的可以查看另外一篇博文。

### 源代码

```
    # -*- coding: utf-8 -*-

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pyquery import PyQuery as pq
from time import sleep
import random

#定义一个taobao类
class taobao_infos:

    #对象初始化
    def __init__(self):
        url = 'https://login.taobao.com/member/login.jhtml'
        self.url = url

        options = webdriver.ChromeOptions()
        options.add_experimental_option("prefs", {"profile.managed_default_content_settings.images": 2}) # 不加载图片,加快访问速度
        options.add_experimental_option('excludeSwitches', ['enable-automation']) # 此步骤很重要，设置为开发者模式，防止被各大网站识别出来使用了Selenium
        self.browser = webdriver.Chrome(executable_path=chromedriver_path, options=options)

        self.wait = WebDriverWait(self.browser, 10) #超时时长为10s

    #登录淘宝
    def login(self):

        # 打开网页
        self.browser.get(self.url)

        # 自适应等待，点击密码登录选项
        self.browser.implicitly_wait(30) #智能等待，直到网页加载完毕，最长等待时间为30s
        self.browser.find_element_by_xpath('//*[@class="forget-pwd J_Quick2Static"]').click()

        # 自适应等待，点击微博登录宣传
        self.browser.implicitly_wait(30)
        self.browser.find_element_by_xpath('//*[@class="weibo-login"]').click()

        # 自适应等待，输入微博账号
        self.browser.implicitly_wait(30)
        self.browser.find_element_by_name('username').send_keys(weibo_username)

        # 自适应等待，输入微博密码
        self.browser.implicitly_wait(30)
        self.browser.find_element_by_name('password').send_keys(weibo_password)

        # 自适应等待，点击确认登录按钮
        self.browser.implicitly_wait(30)
        self.browser.find_element_by_xpath('//*[@class="btn_tip"]/a/span').click()

        # 直到获取到淘宝会员昵称才能确定是登录成功
        taobao_name = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.site-nav-bd > ul.site-nav-bd-l > li#J_SiteNavLogin > div.site-nav-menu-hd > div.site-nav-user > a.site-nav-login-info-nick ')))
        # 输出淘宝昵称
        print(taobao_name.text)

    # 模拟向下滑动浏览
    def swipe_down(self,second):
        for i in range(int(second/0.1)):
            #根据i的值，模拟上下滑动
            if(i%2==0):
                js = "var q=document.documentElement.scrollTop=" + str(300+400*i)
            else:
                js = "var q=document.documentElement.scrollTop=" + str(200 * i)
            self.browser.execute_script(js)
            sleep(0.1)

        js = "var q=document.documentElement.scrollTop=100000"
        self.browser.execute_script(js)
        sleep(0.1)

    # 爬取淘宝 我已买到的宝贝商品数据
    def crawl_good_buy_data(self):

        # 对我已买到的宝贝商品数据进行爬虫
        self.browser.get("https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm")

        # 遍历所有页数
        for page in range(1,1000):

            # 等待该页面全部已买到的宝贝商品数据加载完毕
            good_total = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '#tp-bought-root > div.js-order-container')))

            # 获取本页面源代码
            html = self.browser.page_source

            # pq模块解析网页源代码
            doc = pq(html)

            # # 存储该页已经买到的宝贝数据
            good_items = doc('#tp-bought-root .js-order-container').items()

            # 遍历该页的所有宝贝
            for item in good_items:
                good_time_and_id = item.find('.bought-wrapper-mod__head-info-cell___29cDO').text().replace('\n',"").replace('\r',"")
                good_merchant = item.find('.seller-mod__container___1w0Cx').text().replace('\n',"").replace('\r',"")
                good_name = item.find('.sol-mod__no-br___1PwLO').text().replace('\n', "").replace('\r', "")
                # 只列出商品购买时间、订单号、商家名称、商品名称
                # 其余的请自己实践获取
                print(good_time_and_id, good_merchant, good_name)

            print('\n\n')

            # 大部分人被检测为机器人就是因为进一步模拟人工操作
            # 模拟人工向下浏览商品，即进行模拟下滑操作，防止被识别出是机器人
            # 随机滑动延时时间
            swipe_time = random.randint(1, 3)
            self.swipe_down(swipe_time)

            # 等待下一页按钮 出现
            good_total = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.pagination-next')))
            # 点击下一页按钮
            good_total.click()
            sleep(2)

if __name__ == "__main__":

    # 使用之前请先查看当前目录下的使用说明文件README.MD
    # 使用之前请先查看当前目录下的使用说明文件README.MD
    # 使用之前请先查看当前目录下的使用说明文件README.MD

    chromedriver_path = "/Users/bird/Desktop/chromedriver.exe" #改成你的chromedriver的完整路径地址
    weibo_username = "改成你的微博账号" #改成你的微博账号
    weibo_password = "改成你的微博密码" #改成你的微博密码

    a = taobao_infos()
    a.login() #登录
    a.crawl_good_buy_data() #爬取淘宝 我已买到的宝贝商品数据
```

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

![](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/3.%E6%B7%98%E5%AE%9D%E5%B7%B2%E4%B9%B0%E5%88%B0%E7%9A%84%E5%AE%9D%E8%B4%9D%E6%95%B0%E6%8D%AE%E7%88%AC%E8%99%AB(%E5%B7%B2%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95)/example.gif)
![](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/3.%E6%B7%98%E5%AE%9D%E5%B7%B2%E4%B9%B0%E5%88%B0%E7%9A%84%E5%AE%9D%E8%B4%9D%E6%95%B0%E6%8D%AE%E7%88%AC%E8%99%AB(%E5%B7%B2%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95)/example2.png)
[爬虫过程图片查看不了点击这里](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/3.%E6%B7%98%E5%AE%9D%E5%B7%B2%E4%B9%B0%E5%88%B0%E7%9A%84%E5%AE%9D%E8%B4%9D%E6%95%B0%E6%8D%AE%E7%88%AC%E8%99%AB%28%E5%B7%B2%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95%29/example.gif)
[爬虫结果图片查看不了点击这里](https://raw.githubusercontent.com/shengqiangzhang/examples-of-web-crawlers/master/3.%E6%B7%98%E5%AE%9D%E5%B7%B2%E4%B9%B0%E5%88%B0%E7%9A%84%E5%AE%9D%E8%B4%9D%E6%95%B0%E6%8D%AE%E7%88%AC%E8%99%AB%28%E5%B7%B2%E6%A8%A1%E6%8B%9F%E7%99%BB%E5%BD%95%29/example2.png)

### 其他爬虫源代码

所有关于爬虫的项目都放在github了，有需要的可以去[GitHub仓库](https://github.com/shengqiangzhang/examples-of-web-crawlers)

项目持续更新，欢迎您[star本项目](https://github.com/shengqiangzhang/examples-of-web-crawlers)
