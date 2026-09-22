# selenium 隐藏 Chrome 爬虫特征实现模拟登录

> **作者**: zh648990 | **发布时间**: 2021-11-12 12:07:00 | **版块**: 『编程语言区』 | **查看/回复**: 6163 / 23
> **原文**: [https://www.52pojie.cn/thread-1542629-1-1.html](https://www.52pojie.cn/thread-1542629-1-1.html)

---

*本帖最后由 zh648990 于 2021-11-24 14:05 编辑*

最典型的就是模拟淘宝登录，直接登录的话会有一个滑块验证，这个滑块不管怎么滑动都无法验证，因为淘宝识别到这个是爬虫，那怎么解决呢？
我在 github 找到一个脚本 已经完美实现模拟登录不会出现滑块验证了

https://github.com/kingname/stealth.min.js

关键代码如下

[Python] *纯文本查看*

```
    # 浏览器配置对象
    options = webdriver.ChromeOptions()
    # 以开发者模式启动浏览器
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    # 屏蔽以开发者运行提示框
    # options.add_experimental_option('useAutomationExtension', False)
    # 屏蔽保存密码提示框
    prefs = {'credentials_enable_service': False, 'profile.password_manager_enabled': False}
    options.add_experimental_option('prefs', prefs)
    # chrome 88 或更高版本的反爬虫特征处理
    options.add_argument('--disable-blink-features=AutomationControlled')
    # 浏览器对象
    driver = webdriver.Chrome(options=options)
    # 读取脚本 下载 stealth.min.js 到本地
    with open('stealth.min.js', mode='r', encoding='utf-8') as f:
        string = f.read()
    # 移除 selenium 中的爬虫特征
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {'source': string})
```

实现原理就是在访问网址前加载js脚本隐藏 window.navigator.webdriver 爬虫特征
检测方法是访问 https://bot.sannysoft.com/ 查看属性 WebDriver 是否为 missing (passed)
这是隐藏爬虫的

![](https://attach.52pojie.cn/forum/202111/24/140502xz2rymiiqiy24vtq.jpg)

这是没隐藏的

![](https://attach.52pojie.cn/forum/202111/24/140514cmnonjeykzet88ok.jpg)