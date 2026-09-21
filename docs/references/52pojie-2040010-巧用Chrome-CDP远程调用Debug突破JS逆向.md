# 巧用Chrome-CDP远程调用Debug突破JS逆向

> **作者**: Eureka8 | **发布时间**: 2025-06-19 13:57:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8959 / 56
> **原文**: [https://www.52pojie.cn/thread-2040010-1-1.html](https://www.52pojie.cn/thread-2040010-1-1.html)

---

*本帖最后由 Eureka8 于 2025-6-19 13:59 编辑*

### 前言

我在测试一个网站的时候，大多数的网站不会对接口的请求数据做加密处理，但有的时候在测试一些重点行业的网络资产时，常常会碰到一些功能点存在加密，例如登录，个人信息查询，搜索等等。在以往我遇到这些存在接口加密站点的时候，一般就是通过一些调试手段，找到加解密函数，从F12的控制台对变量手动加密，解密，但这一方法的弊病就是我们每次都必须断好点，同时必须提前预知要加解密的内容，还要拼接函数执行，因此如果遇到需要FUZZ或者爆破的接口，只能放弃。再者就是通过开发者工具断点跟栈，一点点找函数调用关系，还原加密算法，但是一旦遇到加密复杂，存在js混淆的网站，这个方法的失败率就会成指数级上升。

于是，为了解决这个需求，在网上冲浪的时候，便发现了**Chrome DevTools Protocol**这个好东西，这是一套开放协议，简称CDP，允许外部程序通过Chrome浏览器提供的接口与其进行交互，CDP提供了丰富的接口，使得我们可以通过WebSocket协议来对接口传输数据，进而操作浏览器的各种功能，例如打开标签页，断点调试，执行js函数等等。这里有兴趣的小伙伴可以看一下官方文档：<https://chromedevtools.github.io/devtools-protocol/>

我在网上搜索资料的时候发现这方面教程极少，应用于安全领域方面的文章也是不超过五篇，在文章最后已经注明了地址，在按照文章学习使用的过程中，也是遇到了挫折重重，但是经过研究分析之后，本篇文章也都会尽可能详细地向大家介绍，CDP远程调用非常方便，他允许我们直接可以通过代码来操作浏览器完成一系列行为，希望通过我的这篇文章让师傅们对其有一定了解，学习并赋能与我们的渗透测试与安全研究工作之中，提升效率！

### CDP，启动！

#### 开启远程调试

首先我们要开启谷歌浏览器的远程调试，并且设置端口，同时允许所有的源访问调试界面:

进入Chrome的根目录，呼出cmd:

![](https://attach.52pojie.cn/forum/202506/19/135007o3485458ih9444sg.png)

执行命令，打开Chrome浏览器，同时设置远程调试端口，允许所有源访问调试详情页面:

**这里要注意，在运行下面命令的时候，我们要先关闭电脑上运行的所有浏览器，不然会由于冲突导致启动失败。**

> chrome --remote-debugging-port=9222 --remote-allow-origins=\*

#### 查看正在进行CDP调试的端点信息

执行命令我们会打开一个全新的Chrome，访问[http://localhost:9222/json](http://localhost:9222/json%3A):

![](https://attach.52pojie.cn/forum/202506/19/135030htbprg71oz5cc11g.png)

在上图可以看到，访问之后有一堆json格式的数据，实际这个通俗理解是Chrome为我们以API的方式展示的可供远程调用的端点，我们可以看到我现在有一个标签页，是百度，因此在第二个数据中也看到了它的WebSocke调试地址，webSocketDebuggerUrl，因此假如我们想对其进行远程断点debug，执行js函数，我们就可以对这个地址发命令即可。

这里也标注一下json数据中其他键的含义：

* `id`: 会话 ID，用于在 CDP 中与特定页面进行通信。
* `title`: 页面的标题。
* `url`: 当前页面的 URL。
* `webSocketDebuggerUrl`: WebSocket 地址，用于与 CDP 建立通信。

### CDP 命令

CDP命令格式，即我们向WebSocket接口发送的数据格式，所有的命令实际上有一个统一的格式规范。

> {
> 'method': '方法(命令)',
> 'id': (随便一个数字),
> 'params': {
> 需要用到的参数都写在这里
> }
> }

官方文档介绍了很多命令，这里我们主要用到一个命令:**Debugger.evaluateOnCallFrame**，主要作用就是：在xx处断点，同时在这里执行xx函数。

> {
> 'method': 'Debugger.evaluateOnCallFrame',
> 'id': 123,
> 'params': {
> 'callFrameId': callFrameId,
> 'expression': expression,
> 'objectGroup': 'console',
> 'includeCommandLineAPI': True,
> }
> }

上面那句话可以看到我给了两个变量，而本方法参数callFrameId，实际就表示了在哪里断点，而expression则是我们要执行的js函数。callFrameId的获取我们在下面的实验部分将有所介绍

### 实验开始

#### 生成一个示例登录站点

这部分使用GPT来完成，我选用的模型是ChatGPT 4o with canvas，提示词如下：

> 请你帮我写一个登录系统，输入账号密码登录即可。要求使用php语言，无需使用mysql，直接用硬编码判断账号admin和密码admin123即可。登陆成功后可以无需有任何页面，这个系统的关键就是在前端写入账号密码，发送到后端接口校验的时候，要利用js对账号和密码的参数进行加密，请你发挥想象，对AES加密算法进行魔改，把加密算法写道单独的额外的js文件中，尽可能地避免通过前端的js代码审计可以复刻出加密算法，一定要确保js加密的安全性，防止被逆向。

在这篇文章完成的时候利用这个提示词，我测试了多个大模型，发现这个提示词会使AI产生幻觉，包括我再次用ChatGPT 4o跑了一遍，代码就有问题了，要么是前端得加密是先A再B再C，结果后端解密时候顺序乱套了，要么就是前后端的密钥和偏移，以及一些函数都不一样，容易出现一些尴尬的小问题，因此我把这个实验用的示例系统源代码也贴在下面，各位朋友可以复制到本地，方便复现学习。当然代码中也有丰富的注释，大家也可以一目了然加密逻辑，方面理解。

示例系统构成：前端页面i代码ndex.html，二次加密混淆逻辑代码secureEncrypt.js，后端校验代码login.php。

**index.html**

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>史上最安全的登录系统</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <script src="./js/secureEncrypt.js"></script>
    <style>
        /* 页面基础样式 */
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        /* 登录容器样式 */
        .login-container {
            background: #fff;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
        }

        .login-container h1 {
            margin: 0 0 1.5rem;
            font-size: 1.8rem;
            color: #333;
            text-align: center;
        }

        /* 表单样式 */
        form {
            display: flex;
            flex-direction: column;
        }

        label {
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            color: #555;
        }

        input {
            padding: 0.8rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        input:focus {
            border-color: #007bff;
            outline: none;
        }

        button {
            padding: 0.8rem;
            background-color: #007bff;
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        button:hover {
            background-color: #0056b3;
        }

        /* 错误和成功信息样式 */
        .message {
            margin-top: 1rem;
            text-align: center;
            font-size: 0.9rem;
        }

        .message.error {
            color: #ff0000;
        }

        .message.success {
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>史上最安全的登录系统</h1>
        <form id="loginForm">
            <label for="account">账号:</label>
            <input type="text" id="account" name="account" placeholder="请输入你的账号" required>

            <label for="password">密码:</label>
            <input type="password" id="password" name="password" placeholder="请输入你的密码" required>

            <button type="submit">登录</button>
            <div id="message" class="message"></div>
        </form>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const account = document.getElementById('account').value.trim();
            const password = document.getElementById('password').value.trim();
            const messageBox = document.getElementById('message');

            if (!account || !password) {
                messageBox.textContent = "Please fill out all fields.";
                messageBox.className = "message error";
                return;
            }

            messageBox.textContent = ""; // 清除之前的消息

            const key = "MySuperSecretKey1234567890123456"; // 必须 32 字节
            const iv = "RandomInitVector"; // 必须 16 字节

            try {
                // 加密数据
                const encryptedAccount = secureEncrypt(account, key, iv);
                const encryptedPassword = secureEncrypt(password, key, iv);

                // 发送加密数据到后端
                const response = await fetch('login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        account: encryptedAccount,
                        password: encryptedPassword,
                    }),
                });

                const result = await response.json();
                if (response.ok) {
                    messageBox.textContent = result.message;
                    messageBox.className = "message success";
                } else {
                    messageBox.textContent = result.message || "Login failed.";
                    messageBox.className = "message error";
                }
            } catch (err) {
                console.error('Error:', err);
                messageBox.textContent = "An error occurred while logging in.";
                messageBox.className = "message error";
            }
        });
    </script>
</body>
</html>
```

secureEncrypt.js

```
// secureEncrypt.js

// 自定义加密函数
function secureEncrypt(input, key, iv) {
    // AES 加密的核心函数
    function aesEncrypt(data, key, iv) {
        return CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(key), {
            iv: CryptoJS.enc.Utf8.parse(iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        }).toString(); // Base64 输出
    }

    // 生成随机干扰数据
    function addNoise(data) {
        const noise = Math.random().toString(36).substring(2, 8); // 6 位随机字符
        return noise + '|' + data + '|' + noise.split('').reverse().join('');
    }

    // 替换部分字符以增加混淆
    function obfuscate(data) {
        const map = { 'a': '@', 'e': '3', '1': 'l', 'o': '0', 's': '$' };
        return data.replace(/[aeios]/g, char => map[char] || char);
    }

    // 混淆处理
    const noisyInput = addNoise(input); // 添加干扰数据
    const obfuscatedInput = obfuscate(noisyInput); // 字符替换

    // 加密混淆后的数据
    return aesEncrypt(obfuscatedInput, key, iv);
}
```

login.php

```
<?php
header('Content-Type: application/json');

// 定义密钥和偏移量
$key = "MySuperSecretKey1234567890123456"; // 32 字节
$iv = "RandomInitVector"; // 16 字节

// AES 解密函数
function customDecrypt($data, $key, $iv) {
    $method = "AES-256-CBC";
    $options = OPENSSL_RAW_DATA;

    // 确保 key 和 iv 使用 UTF-8 编码
    $key = mb_convert_encoding($key, 'UTF-8');
    $iv = mb_convert_encoding($iv, 'UTF-8');

    // 解密
    $ciphertext = base64_decode($data);
    $plaintext = openssl_decrypt($ciphertext, $method, $key, $options, $iv);

    return $plaintext;
}

// 反混淆函数
function removeNoiseAndReverse($data) {
    // 反字符替换
    $map = ['@' => 'a', 'e' => '3', 'l' => '1', 'o' => '0', '$' => 's'];
    $replacedData = strtr($data, $map); // 替换回原始字符

    // 提取原始数据
    $parts = explode('|', $replacedData);
    if (count($parts) !== 3) {
        throw new Exception("Invalid data format.");
    }
    return $parts[1]; // 返回中间的原始数据
}

try {
    // 获取加密后的账号和密码
    $encryptedAccount = $_POST['account'] ?? '';
    $encryptedPassword = $_POST['password'] ?? '';

    // AES 解密
    $decryptedAccountRaw = customDecrypt($encryptedAccount, $key, $iv);
    $decryptedPasswordRaw = customDecrypt($encryptedPassword, $key, $iv);

    if ($decryptedAccountRaw === false || $decryptedPasswordRaw === false) {
        throw new Exception("AES decryption failed.");
    }

    // 反混淆和提取原始数据
    $decryptedAccount = removeNoiseAndReverse($decryptedAccountRaw);
    $decryptedPassword = removeNoiseAndReverse($decryptedPasswordRaw);

    // 硬编码的账号密码
    $validAccount = 'admin';
    $validPassword = 'admin123';

    if ($decryptedAccount === $validAccount && $decryptedPassword === $validPassword) {
        echo json_encode(['success' => true, 'message' => '登录成功!']);
    } else {
        echo json_encode(['success' => false, 'message' => "账号或密码错误！"]);
    }
} catch (Exception $e) {
    // 返回错误信息
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e]);
}
?>
```

搭建完成，运行之后，我们抓登陆包，目前已经达到了请求包加密效果:

![](https://attach.52pojie.cn/forum/202506/19/135111ucf9if4bqv4ccz1o.png)

#### 开启协议监听

这一步骤用于监听我们执行debug的地方，得到callFrameId

打开网页，按F12进入开发者工具，进入设置，实验，开启Protocol Monitor

![](https://attach.52pojie.cn/forum/202506/19/135127lgxkrfttib6ftmhx.png)

开启后紧接着我们去更多工具，开启协议监视器

![](https://attach.52pojie.cn/forum/202506/19/135155eh611u8ww69ugd8v.png)

![](https://attach.52pojie.cn/forum/202506/19/135209md5i365w6dwd65d6.png)

开启后我们进行抓包，接下来便是常规的js逆向初始阶段，但是我们不用还原加密算法，直接找到加解密的函数即可，这个很简单，使用最常规的方法，点一下登录之后到抓包界面，点击js

![](https://attach.52pojie.cn/forum/202506/19/135229j16paa16lp6p10rr.png)

进入后开启断点，再点击一下登录，发现程序已经断点，向上跟栈，得到加解密的最终步骤

![](https://attach.52pojie.cn/forum/202506/19/135246am53lz4yjjmdazxy.png)

这里由于是我们自己创建的实验环境，所以很简单的找到了加密函数地点，我们在这里再断点，重新运行后让网页在这里停下

![](https://attach.52pojie.cn/forum/202506/19/135259jgvx4xmwfg7wgwax.png)

紧接着我们到控制台执行任意一个函数，这里我们直接输入变量，请求控制台把加密后的值打印出来

![](https://attach.52pojie.cn/forum/202506/19/135312fx6jimnvyec2yuuh.png)

接下来进入协议监视器，拉到最下方，突然发现一个熟悉的字眼！没错，这就是我们上面刚刚提到的一个CDP命令，在右边也是出现了命令执行的结果，再加上上面熟悉的请求/响应，整个过程很像抓包有木有，哈哈哈哈

![](https://attach.52pojie.cn/forum/202506/19/135325wzliyi44flllupjh.png)

从请求中，我们可以看到这次方法调用的参数，得到我们之后要用的**callFrameId**，这里细心观察可以看到，我们上面的命令编写，实际就是重写了一下这里的参数，我们只需要再包装成相同的格式，替换callFrameId后再重发即可，替换expression的值，执行我们想要的js函数，即可实现远程调用

![](https://attach.52pojie.cn/forum/202506/19/135351uuuc04s555cc504m.png)

#### 代码远程调试

从上面的步骤我们抓到了callFrameId为"9154534773061276043.7.0"，接下来我们使用Python的websocket-client模块尝试远程调用。

在开始之前我们别忘了要到http://localhost:9222/json 里面看下这个标签页的webSocketDebuggerUrl

![](https://attach.52pojie.cn/forum/202506/19/135406yc9x1q7fk19vn7ht.png)

代码如下：

```
import json

import websocket

webSocketDebuggerUrl = "ws://localhost:9222/devtools/page/9F47572FDBFB63E8B1EF661D1714E3DC"
command = {
    'method': 'Debugger.evaluateOnCallFrame',
    'id': 123,
    'params': {
        'callFrameId': "9154534773061276043.7.0",
        'expression': "encryptedAccount",
        'objectGroup': 'console',
        'includeCommandLineAPI': True,
    }
}
connection = websocket.create_connection(webSocketDebuggerUrl)
connection.send(json.dumps(command))
print(json.loads(connection.recv()))
```

运行之后，发现返回一个json格式的数据，这个数据恰好也就是我们从浏览器看到响应模块的内容，里面包含了该函数运行的结果

![](https://attach.52pojie.cn/forum/202506/19/135420zo5nr4r4lb6lrnf5.png)

更改expression的值，运行其他函数，测试一下，这里我改成明文的函数，可以看到已经返回了我输入的明文

![](https://attach.52pojie.cn/forum/202506/19/135439jgi6zvf6avaggaog.png)

![](https://attach.52pojie.cn/forum/202506/19/135453pepzt4prc9zpqeck.png)

至此，我们就成功实现了CDP远程调用，在代码层面执行了JS函数，实现逆向！

### 思路拓展

#### 脚本化批量执行实现爆破

我们知道既然可以用Python远程调用CDP命令，执行JS函数，那么我们可以应用这一功能，批量执行目标网站的JS加密函数，把我们本地的明文字典，批量跑函数，得到密文字典，从而方便后续爆破测试，如下实战应用：

1. 目标网站登录存在复杂加密，js逆向逆不出来

   ![](https://attach.52pojie.cn/forum/202506/19/135520q6p67ng66pp6270t.png)
2. 但是通过断点，我们可以得到加解密的函数，算法无法还原

   ![](https://attach.52pojie.cn/forum/202506/19/135537v3pafaa3tqspn7aw.png)
3. 使用Python进行CDP远程调用，批量跑加密函数，使明文字典变为密文字典

   ![](https://attach.52pojie.cn/forum/202506/19/135557ntmj666cj76tb86f.png)

   如下图代码，我把执行CDP命令部分封装成了一个方法，直接调用这个方法，即可打印批量函数运行的结果，得到密文字典

```
import json
   import websocket

   def execute_dp(connection, data):
       command = {
           'method': 'Debugger.evaluateOnCallFrame',
           'id': 123,
           'params': {
               'callFrameId': "-2349054866915643001.1.0",
               'expression': f'secureEncrypt("{data}", key, iv)',
               'objectGroup': 'console',
               'includeCommandLineAPI': True,
           }
       }

       connection.send(json.dumps(command))
       return json.loads(connection.recv())

   if __name__ == '__main__':
       webSocketDebuggerUrl = "ws://localhost:9222/devtools/page/1EC8507DECF7CA1E2FB1F9A9E9FB0862"
       connection = websocket.create_connection(webSocketDebuggerUrl)
       f = open("zhuan.txt", "r", encoding="utf-8")
       g = open("result.txt", "a", encoding="utf-8")
       for i in f.read().split("\n"):
           g.write(execute_dp(connection, i)['result']['result']['value'] + "\n")
```

![](https://attach.52pojie.cn/forum/202506/19/135615xu5th6ni5btpavzp.png)

4. 使用Burp，Intruder模块，密码选用密文字典爆破

   ![](https://attach.52pojie.cn/forum/202506/19/135627uchksuttnt1fn7kl.png)
5. 返回200，成功爆破带有登录参数加密的系统

   ![](https://attach.52pojie.cn/forum/202506/19/135638ptpc2z2tt5z8a2ta.png)

#### 配合mitmproxy实现全流量加解密

mitmproxy是一款非常好用的工具，可以截获请求，同时支持将请求体内容存储为变量，因此我们就可以使用mitmproxy截获请求，将请求体的某个参数，以变量形式作为执行CDP命令的参数，将他解密之后再拼回请求体，转发至burp，这样我们在burp侧看到的请求就是解密后的，同时我们在burp设置代理转发，将流量转回mitmproxy，运行加密脚本，将明文加密成密文再拼接请求体，发给服务端。

这样就可以达到burp明文测试的结果，具体流量发送步骤如下：

![](https://attach.52pojie.cn/forum/202506/19/135649wy84tzprvtjcpa44.png)

我们直接使用python写一个decrypt.py

```
from mitmproxy import http, ctx
import urllib.parse  # 用于解析和编码 URL 编码数据
import zhuan

class ModifyPassword:
    def request(self, flow: http.HTTPFlow) -> None:
        # 判断是否是目标主机和POST请求
        if "xx.xx" in flow.request.headers.get("Host", "") and flow.request.method == "POST":
            try:
                # 获取原始请求体
                req_data = flow.request.text  # 请求体是字符串
                ctx.log.info(f"原始请求体: {req_data}")

                # 解析请求体为字典
                parsed_data = urllib.parse.parse_qs(req_data)

                # 替换 password 参数值
                if "password" in parsed_data:
                    old_password = parsed_data["password"][0]  # 原始 password 值
                    new_password = execute_cdp(data)  # 替换为你需要的值
                    parsed_data["password"] = [new_password]

                    ctx.log.info(f"旧的 password 值: {old_password}")
                    ctx.log.info(f"替换后的 password 值: {new_password}")
                else:
                    ctx.log.info("请求体中未找到 password 参数")

                # 重新编码请求体
                new_req_data = urllib.parse.urlencode(parsed_data, doseq=True)
                flow.request.text = new_req_data  # 替换请求体为新的数据
                ctx.log.info(f"修改后的请求体: {new_req_data}")

            except Exception as e:
                ctx.log.error(f"处理请求时出错: {str(e)}")

addons = [
    ModifyPassword()
]
```

启用cmd，运行mitmproxy

> mitmproxy --mode upstream:<http://127.0.0.1:8080> -s decrypt.py --listen-port 8989 --ssl-insecure

其中 --mode upstream:<http://127.0.0.1:8080> 指的是二次转发至burp

运行后可以看到mitmproxy已经抓到了，是密文

![](https://attach.52pojie.cn/forum/202506/19/135708xakyabw0ohh9guwh.png)

但是我们到burp，拦截，发现password字段已经变成了明文

![](https://attach.52pojie.cn/forum/202506/19/135726hg37m0765aab3mm2.png)

同理我们使用相同的方法，也可达到相应包全流程加解密。

### 结语

Chrom的CDP命令是一个十分强大的功能，这个我们也许往往忘记深入挖掘，实际其中的很多接口，很多方法都能对我们渗透测试过程提供莫大帮助，本文只是介绍了冰山一角，展现其对于js逆向的遍历，我们不用再拘束于传统的算法逆向，而是直接找到关键函数即可，希望读完这篇文章的你可以继续探索，欢迎评论交流，我是小安，感谢你的阅读！

### 致谢

* [前端加密对抗——CDP远程调用Debug断点函数python代码实现-CSDN博客](https://blog.csdn.net/qq_44657899/article/details/130987135)
* [Chrome DevTools Protocol 入门：快速开始-CSDN博客](https://blog.csdn.net/qqyy_sj/article/details/143672162)
* [前端加密对抗1-mitmproxy - 渗透测试文章(Security Articles) - T00ls | 低调求发展 - 潜心习安全](https://www.t00ls.com/thread-69052-1-1.html)
* [前端加密对抗2-通过CDP远程调用Debug断点函数 - 渗透测试文章(Security Articles) - T00ls | 低调求发展 - 潜心习安全](https://www.t00ls.com/thread-69054-1-1.html)
