# python selenium自动化过指纹检测

> **作者**: devilpanama | **发布时间**: 2024-03-08 23:44:00 | **版块**: 『编程语言区』 | **查看/回复**: 5557 / 35
> **原文**: [https://www.52pojie.cn/thread-1898387-1-1.html](https://www.52pojie.cn/thread-1898387-1-1.html)

---

*本帖最后由 devilpanama 于 2024-3-8 23:46 编辑*

最近有个自动化的项目，用的是python+selenium实现网页自动化，目的是实现自动化发文
问题：正常打开发布页面可以发布并且网页自带了自动保存功能，用selenium打开的浏览器提示保存失败，也无法进行后续操作
初步分析：现在一般网站的反爬都是检测UA头或者js检测环境，分析失败和成功的区别也就是selenium的问题
初步尝试：先用调试模式打开浏览器，再用python操作

[Asm] *纯文本查看*

```
start chrome --remote-debugging-port=9527 --user-data-dir="F:\selenium"
```

打开浏览器后运行python

[Python] *纯文本查看*

```
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# 以下代码是使用 Python 接管已经打开的浏览器
options = Options()
options.add_experimental_option("debuggerAddress", "127.0.0.1:64829")
browser = webdriver.Chrome(options=options)
```

结果：失败

再次分析：想到了之前看的一篇文章，关于浏览器指纹的问题，大概意思就是不管你怎么打开浏览器，浏览器呈现出来的特征值都一样，即视为同一指纹同一个环境
查看指纹特征网址：https://bot.sannysoft.com/
方法：改变指纹特征
工具：**stealth.min.js**是puppeteer中用于抹去自动化程序特征的。当他被单独提取出来后就可以在selenium中加载并使用，使得可以抹掉selenium中的自动化特征，从而绕过一些网站或者验证程序的机器人检测。
代码如下

[Python] *纯文本查看*

```

from selenium import webdriver

STEALTH_JS = r'stealth.min.js'
with open(STEALTH_JS) as f:
    js = f.read()

    # print(js)
chromedriver_path = r"C:\XXXXXXXX\chromedriver.exe"
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(chromedriver_path,options=options)
driver.execute_cdp_cmd(
    cmd="Page.addScriptToEvaluateOnNewDocument",
    cmd_args={
        "source": js
    }
)

# 打开一个标签页
driver.get("https://bot.sannysoft.com/")
```

结果：成功
