# 页面验证码自动填写思路 - ddddocr/ 油猴+XMLHttpRequest拦截自动填写

> **作者**: Cristy | **发布时间**: 2024-10-16 17:03:00 | **版块**: 『编程语言区』 | **查看/回复**: 5116 / 23
> **原文**: [https://www.52pojie.cn/thread-1973043-1-1.html](https://www.52pojie.cn/thread-1973043-1-1.html)

---

*本帖最后由 Cristy 于 2024-10-17 09:27 编辑*

---

### aliases: tags: 油猴, author: Aura Service created: 2024-10-14T11:52:23 updated: 2024-10-17T09:26:31

## 油猴脚本通过XMLHttpRequest拦截实现验证码自动填写

这篇文章提到了两种验证码识别思路，并详细分析了一个Tampermonkey脚本，该脚本自动化了在某些网站上填写验证码的过程。这个脚本利用了多种高级JavaScript技术，包括拦截`XMLHttpRequest`调用、操作DOM以及模拟用户输入事件。

**本文对部分隐私信息做了屏蔽，用常见数据替换。如接口鉴权打码、页面元素id改为标签名、url改为局域网ip等等。<font color="#ff0000">如果您发现文中可能存在隐私泄露问题，烦请回复提醒我做屏蔽修改或删除处理！</font>谢谢！**

### 1 目录

1. [目录](https://www.52pojie.cn/thread-1973043-1-1.html##1-目录)
2. [脚本思路简述](https://www.52pojie.cn/thread-1973043-1-1.html#2-脚本思路简述)
3. [Tampermonkey脚本简介](https://www.52pojie.cn/thread-1973043-1-1.html#3-tampermonkey脚本简介)
4. [理解脚本结构](https://www.52pojie.cn/thread-1973043-1-1.html#4-脚本结构)
5. [拦截AJAX请求](https://www.52pojie.cn/thread-1973043-1-1.html#5-拦截ajax请求)
6. [解析JSON响应](https://www.52pojie.cn/thread-1973043-1-1.html#6-解析json响应)
7. [与DOM交互](https://www.52pojie.cn/thread-1973043-1-1.html#7-与dom交互)
8. [模拟用户输入事件](https://www.52pojie.cn/thread-1973043-1-1.html#8-模拟用户输入事件)
9. [复制文本到剪贴板](https://www.52pojie.cn/thread-1973043-1-1.html#9-复制文本到剪贴板)
10. [安全考虑](https://www.52pojie.cn/thread-1973043-1-1.html#10-安全考虑)
11. [结论](https://www.52pojie.cn/thread-1973043-1-1.html#11-结论)

---

### 2 脚本思路简述

#### 2.1 思路历程

面对如下用户输入框，作为一个懒人每次都需要输入验证码是很难受的事情：
![登录框截图](https://iili.io/2J2fItt.png)

##### 2.1.1 思路1（较为通用） - ddddocr

* 最容易想到的思路  - ddddocr（本文仅简述）

该验证码极其简单，使用ddddocr识别错误率接近0。所以可用本地ddddocr程序进行识别。

**程序逻辑：**

编写Python程序从剪贴板读取验证码图片交给ddddocr识别并拿到文本，将文本写回剪贴板。其中 <font color="#ff0000">filename=f'{Path.home() / "Desktop"}clipboard\_image.png'</font>使用桌面作为临时文本存储路径

*识别剪贴板图片验证码Python代码：* ddddocr.py

```
# -*- coding: utf-8 -*-

"""
@File       : 识别剪贴板图片验证码.py
@Project    : PythonTools
@Author     : Aura Service
@Time       : 2023/11/21 9:47
@Description:
"""
import os
from pathlib import Path

import ddddocr
import pyperclip
from PIL import ImageGrab
import subprocess

def save_clipboard_image(filename=f'{Path.home() / "Desktop"}clipboard_image.png'):
    # 从剪贴板获取图像
    image = ImageGrab.grabclipboard()

    if image:
        # 保存图像到文件
        image.save(filename, 'PNG')
        return filename
    else:
        print("剪贴板中没有图像数据。")
        return None

def ocr_image(image_path):
    # 调用 ddddocr 进行 OCR    try:
        ocr = ddddocr.DdddOcr()
        with open(image_path, 'rb') as f:
            img_bytes = f.read()
        res = ocr.classification(img_bytes)
        return res
    except subprocess.CalledProcessError as e:
        print(f"识别失败：{e}")
        return None

def main():
    # 保存剪贴板中的图像到文件
    image_path = save_clipboard_image(os.path.join(os.path.expanduser('~'), 'Desktop', "temp.png"))

    if image_path:
        # 进行 OCR 识别
        result = ocr_image(image_path)

        if result:
            # 将识别结果写入剪贴板
            pyperclip.copy(result)
            print(f"识别结果已复制到剪贴板：\n{result}")
            # 删除临时文件
            os.remove(image_path)
            print(f"临时文件 {image_path} 已删除。")

if __name__ == "__main__":
    main()
```

**<font color="#ff0000">--20241017更新</font>-可以使用Utools+快捷命令插件完成下面这一步骤用于快捷执行py脚本**
![](https://www.helloimg.com/i/2024/10/17/671066adad75b.png)
复制后唤出快捷命令  输入ocr执行即可

**<font color="#ff0000">--20241017更新end</font>**

创建一个bat文件，贴以下代码并保存。把该创建快捷方式放到常用的地方。使用的时候，复制验证码图片，双击bat文件等待一两秒再粘贴出来的就是脚本识别的验证码结果。

```
@echo off
python ddddocr.py
pause
```

##### 2.1.2 ddddocr思路延伸

1. 本地搭建dddocr的api服务，仅接收图片并返回文本。
2. 油猴脚本获取页面上的验证码图片并通过api发给本地ddddocr处理。

实践这个方法的时候，我遇到了网站跨域拦截问题，无法解决。若有大佬读到此处，望能指点一二，万分感谢！

##### 2.1.3 <font color="#ff0000">思路3</font> （较为局限）本文重点-使用XMLHttpRequest获取响应中的验证码

F12截取到生成验证验证码的请求如图，故而有此思路，该思路仅适用于类似该web系统。该登录页是向后台服务器请求验证码，服务器生成后以未加密的明文形式放到响应的body里面返回给前端，由前端实现图片生成。
![生成验证码的请求](https://s2.loli.net/2024/10/16/dwsOaVvh3oN614K.png)

**脚本逻辑：**
监听所有<font color="#ff0000">/gencap</font>的请求，并获取响应，从中提取"result" 下 "captcha"的值 填入到验证码输入框中。

*自动填写验证码油猴脚本：*

```
// ==UserScript==
// @name        自动填写验证码 - Captcha Fetcher
// @namespace   Violentmonkey Scripts
// @match       http://192.168.1.10:1234/web/login*
// @grant       none
// @version     1.0
// @author      -
// @description 2024/9/17 09:31:05
// ==/UserScript==

(function() {
    'use strict';

    function fillCaptchaAfterDelay(captcha) {
        setTimeout(function() {
            console.log("now host :"+window.location.host);
            var input_code_condition = '[id="inputCode"]';
            var element = document.querySelector(input_code_condition);
            if (element) {
                element.value = captcha;
                console.log('Captcha filled:', captcha);
                // 写入剪贴板
                // writeToClipboard(captcha);
                // Manually trigger input event to simulate user input
                var event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
            } else {
                console.error('Element not found');
            }
        }, 100); // 3 seconds delay
    }

    function writeToClipboard(text) {
        var tempInput = document.createElement("textarea");
        tempInput.style.position = "absolute";
        tempInput.style.left = "-1000px";
        tempInput.style.top = "-1000px";
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        console.log('Text successfully copied to clipboard:', text);
    }

    // Intercept XMLHttpRequest
    (function() {
        var originalXhrOpen = XMLHttpRequest.prototype.open;
        var originalXhrSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return originalXhrOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function() {
            this.addEventListener('load', function() {
                if (this._url.includes('/gencap')) {
                    console.log('Request URL:', this._url);
                    try {
                        var responseJson = JSON.parse(this.responseText);
                        if (responseJson.result && responseJson.result.captcha) {
                            console.log('Captcha:', responseJson.result.captcha);
                            fillCaptchaAfterDelay(responseJson.result.captcha);
                        } else {
                            console.error('Captcha not found in response');
                        }
                    } catch (e) {
                        console.error('Error parsing response JSON:', e);
                    }
                }
            });

            return originalXhrSend.apply(this, arguments);
        };
    })();

})();
```

---

**下面为脚本详细解析说明**

### 3 Tampermonkey脚本简介

**Tampermonkey** 是一个流行的用户脚本管理器，允许用户在特定网站上运行自定义JavaScript代码。这些脚本可以修改网页的外观或行为，自动化任务，并增强用户体验。

在这次分析中，我们将重点关注一个旨在通过拦截网络请求和操作页面内容来自动化验证码输入的脚本。

### 4 脚本结构

脚本被包裹在一个启用了`'use strict'`模式的**立即调用函数表达式（IIFE）**中：

```
(function() {
    'use strict';
    // ...脚本代码...
})();
```

**关键点：**

* **IIFE：** 这种模式防止变量和函数污染全局命名空间，避免与其他脚本或页面代码产生潜在冲突。
* **'use strict'：** 强制严格模式，可以捕获常见的编码错误，并阻止使用一些被认为是有问题的JavaScript特性。

### 5 拦截AJAX请求

脚本的核心功能之一是拦截`XMLHttpRequest`调用来捕获服务器响应中的验证码。

#### 5.1 重写`XMLHttpRequest`方法

脚本重写了`XMLHttpRequest`原型的`open`和`send`方法：

```
(function() {
    var originalXhrOpen = XMLHttpRequest.prototype.open;
    var originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            // ...处理代码...
        });

        return originalXhrSend.apply(this, arguments);
    };
})();
```

**关键点：**

* **Monkey Patching：** 这种技术涉及在运行时修改或扩展内置对象或函数的行为。
* **存储原始方法：** 保存原始的`open`和`send`方法，以确保在被覆盖后仍能被调用。
* **保持上下文：** 使用`apply(this, arguments)`确保原始方法被调用时具有正确的上下文和参数。

#### 5.2 捕获请求URL

重写的`open`方法捕获请求URL：

```
XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalXhrOpen.apply(this, arguments);
};
```

**关键点：**

* **自定义属性（\_url）：** 在`XMLHttpRequest`实例上存储请求URL以供后续使用。
* **方法参数：** 访问`url`参数，其中包含请求端点。

#### 5.3 监听响应

重写的`send`方法添加了一个`load`事件的监听器：

```
XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
        if (this._url.includes('/captcha')) {
            // ...处理代码...
        }
    });

    return originalXhrSend.apply(this, arguments);
};
```

**关键点：**

* **`load`事件：** 当请求成功完成时触发。
* **过滤请求：** 检查请求URL是否包含`/genCaptcha`以识别与验证码相关的请求。

### 6 解析JSON响应

一旦脚本识别出验证码请求，它就会解析服务器的响应以提取验证码。

```
try {
    var responseJson = JSON.parse(this.responseText);
    if (responseJson.result && responseJson.result.captcha) {
        fillCaptchaAfterDelay(responseJson.result.captcha);
    } else {
        console.error('在响应中未找到验证码');
    }
} catch (e) {
    console.error('解析响应JSON时出错:', e);
}
```

**关键点：**

* **`this.responseText`：** 包含响应数据的字符串。
* **`JSON.parse()`：** 将JSON字符串转换为JavaScript对象。
* **错误处理：** 使用`try...catch`块来处理潜在的解析错误。

### 7 与DOM交互

获取验证码后，脚本与页面的DOM进行交互以填写验证码输入字段。

#### 7.1 延迟执行

脚本使用`setTimeout`来延迟验证码填充的执行：

```
function fillCaptchaAfterDelay(captcha) {
    setTimeout(function() {
        // ...DOM交互代码...
    }, 100); // 延迟100毫秒
}
```

**关键点：**

* **`setTimeout`：** 延迟执行以确保DOM元素已加载并准备好。
* **闭包：** 由于JavaScript闭包，`captcha`变量在延迟函数内部可访问。

#### 7.2 选择输入元素

脚本根据当前主机选择验证码输入字段：

```
var input_code_condition = '[id="inputCode"]';
var element = document.querySelector(input_code_condition);
```

**关键点：**

* **`window.location.host`：** 检索当前主机名。
* **条件逻辑：** 根据主机更改选择器以适应不同的页面结构。
* **`document.querySelector()`：** 选择与CSS选择器匹配的第一个元素。

#### 7.3 设置输入值

如果找到了元素，脚本就设置其值：

```
if (element) {
    element.value = captcha;
    // ...模拟输入事件...
} else {
    console.error('未找到元素');
}
```

**关键点：**

* **直接操作：** 设置输入元素的`value`属性。
* **空值检查：** 在尝试交互之前确保元素存在。

### 8 模拟用户输入事件

为确保触发输入字段上附加的任何事件监听器（例如，验证脚本），脚本分派了一个`input`事件：

```
var event = new Event('input', { bubbles: true });
element.dispatchEvent(event);
```

**关键点：**

* **事件创建：** 使用`Event`构造函数创建新事件。
* **事件冒泡：** `{ bubbles: true }`选项允许事件沿DOM树向上传播。
* **分派事件：** `element.dispatchEvent(event)`在指定元素上触发事件。

### 9 复制文本到剪贴板

尽管在提供的脚本中被注释掉了，但有一个函数旨在将文本复制到剪贴板：

```
function writeToClipboard(text) {
    var tempInput = document.createElement("textarea");
    // ...定位和样式...
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    console.log('文本已成功复制到剪贴板:', text);
}
```

**关键点：**

* **临时元素：** 创建一个隐藏的`<textarea>`元素来保存文本。
* **选择文本：** 在textarea内聚焦并选择文本。
* **`document.execCommand('copy')`：** 执行复制命令将选定的文本传输到剪贴板。
* **清理：** 复制后移除临时元素。

**注意：** 现代浏览器已经不推荐使用`document.execCommand('copy')`，而是使用异步的剪贴板API（`navigator.clipboard.writeText()`）。

### 10 安全考虑

虽然脚本提供了有用的自动化，但考虑安全影响很重要：

* **篡改网络请求：** 拦截和修改网络请求如果被滥用可能会带来安全风险。
* **隐私问题：** 访问和操作敏感数据（如验证码）应该负责任地进行。
* **跨源限制：** 脚本在同一源中运行，但跨源请求受到同源策略的限制。

### 11 结论

这个Tampermonkey脚本展示了自动化网页任务的高级JavaScript技术。通过拦截AJAX请求、解析JSON响应、操作DOM以及模拟用户事件，脚本有效地自动化了验证码输入。

**关键收获：**

* **理解原型：** 修改原型允许你拦截和扩展对象行为。
* **事件处理：** 模拟事件可以触发DOM元素上的内置或自定义事件监听器。
* **异步编程：** 使用`setTimeout`和事件监听器有效管理异步操作。

**免责声明：** 自动化验证码输入可能违反某些网站的服务条款。始终确保你有权限在网站上自动化交互，并确保你的行为符合法律和道德标准。

---

**参考资料：**

* [Tampermonkey Official Website](https://www.tampermonkey.net/)
* [XMLHttpRequest - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
* [EventTarget.addEventListener() - MDN Web Docs](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)
* [Interact with the clipboard](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)
