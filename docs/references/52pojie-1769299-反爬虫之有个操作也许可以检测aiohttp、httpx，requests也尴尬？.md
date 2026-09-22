# 反爬虫之有个操作也许可以检测aiohttp、httpx，requests也尴尬？

> **作者**: warner | **发布时间**: 2023-04-04 09:54:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8591 / 29
> **原文**: [https://www.52pojie.cn/thread-1769299-1-1.html](https://www.52pojie.cn/thread-1769299-1-1.html)

---

*本帖最后由 warner 于 2023-4-20 10:03 编辑*

**前言**
最近发现一个很6的东西。这个问题是在差不多半个月前，在技术群里一个老哥发现的问题，然后在群里跟大家讨论。

这个网站，请求的时候，requests正常：

![](https://attach.52pojie.cn/forum/202304/03/180925q88ijcclhkl77kj6.jpg)

原始的curl也可以

![](https://attach.52pojie.cn/forum/202304/03/181122u1l5oknbbrub3b5a.jpg)

aiohttp，直接报错

![](https://attach.52pojie.cn/forum/202304/03/181136ql1ze81l28n751bl.jpg)

httpx，也直接报错：

![](https://attach.52pojie.cn/forum/202304/03/181209ctcbtkommccfmt0l.jpg)

不过httpx的报错要明显点，这就进入了有意思的环节

**分析**

看到这里，估计就有朋友开始冷笑了：搞爬虫大部分不都用requests的吗，谁会用httpx和aiohttp这些啊，感觉这个是不是没啥用啊。

别急，朋友，在文章的下面会说这个，当然如果你赶时间或者觉得没啥意思，那就没必要浪费时间继续看了

****1.httpx****

拿着上面的报错，去网上搜，找到如下issues:

> https://github.com/encode/httpx/issues/1561
>
> https://github.com/encode/httpx/issues/1363

看完里面各位大佬的一顿分析，说是hyper库的问题：

![](https://attach.52pojie.cn/forum/202304/03/181207lujij0ujgalada7e.jpg)

![](https://attach.52pojie.cn/forum/202304/03/181205ywoqyjcywkww9kmn.jpg)

然后hyper库的开发者，如下链接回复：

> https://github.com/python-hyper/h11/issues/113

大概意思是这个不是一个问题，而是http请求的严格性判断问题，请求头的协议，按国际标准，是不能出现 “[Cache-Control]” 这种带有特殊符号作为响应头的键名的，所以报错

而requests却可以，或许是因为requests的校验不严格，直接就放过了：

![](https://attach.52pojie.cn/forum/202304/03/181203t5phsanwwywh5wrw.jpg)

而，浏览器访问也是可以的：

![](https://attach.52pojie.cn/forum/202304/03/181200y91rin2llyeyj19n.jpg)

那么我个人就有理由认为

**这是一个bug，httpx和aiohttp都存在的bug**

httpx的作者，对这个问题那段时间确实在尝试解决，github机器人都想关闭了，httpx作者还不想放弃：

![](https://attach.52pojie.cn/forum/202304/03/181158oyyj1ghx1ytrnryy.jpg)

且至今没解决，遇到的人还不少，至少，上个月都还有人在说这个问题

![](https://attach.52pojie.cn/forum/202304/03/181156a4e8xet1tjlrmxr6.jpg)

卧槽，这时间，上周都还有人在问啊：

![](https://attach.52pojie.cn/forum/202304/03/181154p0l3aft4lae41ve3.jpg)

其中也有说解决办法，看到有个老哥说改h11的源码，改成这样：

![](https://attach.52pojie.cn/forum/202304/03/181152mffd1tz3zgf5aa5z.jpg)

但是报错依然在

![](https://attach.52pojie.cn/forum/202304/03/181150oqpzdzi0yip00wjy.jpg)

另外有个老哥说了这个方法：

![](https://attach.52pojie.cn/forum/202304/03/181457jjebk3n7ffbeknfb.jpg)

[Python] *纯文本查看*

```

h11.readers.header_field_re = re.compile(b"(?P<field_name>[-!#$%&'*+.^`/|~0-9a-zA-Z]+):[ \t](?P<field_value>([^\\x00\\s]+(?:[ \t]+[^\\x00\\s]+))?)[ \t]*")
```

我把这个代码直接放我代码里，报错了，根本没有这个属性

![](https://attach.52pojie.cn/forum/202304/03/181455fvtcutin9hbs3t3b.jpg)

经过一顿查阅，他换了个属性名，是这个：

![](https://attach.52pojie.cn/forum/202304/03/181453p0t9099yyzzrygtv.jpg)

[Python] *纯文本查看*

```
import h11
from h11 import _readers
import re
h11._readers.header_field_re = re.compile(b"(?P<field_name>[-!#$%&'*+.^`/|~0-9a-zA-Z]+):[ \t](?P<field_value>([^\\x00\\s]+(?:[ \t]+[^\\x00\\s]+))?)[ \t]*")
```

但是我试了，换成了新的报错：

![](https://attach.52pojie.cn/forum/202304/03/181451pfcxftfgxgynf9gt.jpg)

也许是正则表达式写的不完美：

![](https://attach.52pojie.cn/forum/202304/03/181448qqruitu70urq4hw1.jpg)

正则表达式通用匹配一下，然后就可以了：

![](https://attach.52pojie.cn/forum/202304/03/181446b3mtjwull3do3rwk.jpg)

[Python] *纯文本查看*

```
import httpx
import h11
from h11 import _readers
import re
# h11._readers.header_field_re = re.compile(b"(?P<field_name>[-!#$%&'*+.^`/|~0-9a-zA-Z]+):[ \t](?P<field_value>([^\\x00\\s]+(?:[ \t]+[^\\x00\\s]+))?)[ \t]*")
h11._readers.header_field_re = re.compile(b"(?P<field_name>.*?):[ \t](?P<field_value>.*?)")
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'}
url = '
# url = '
resp = httpx.get(url=url, headers=headers)
print(resp.text)
```

但是，我换了一个网站，也就是那个issue里某华某为的社区地址，不出正常的结果：

![](https://attach.52pojie.cn/forum/202304/03/181858z5b3xyx3d13s51y7.jpg)

所以，修改正则表达式并不是一个通用的方案。

插一句，在请求的时候，就不要开代{过}{滤}理或者抓包软件了，不然他报错更奇怪：

![](https://attach.52pojie.cn/forum/202304/03/181855n85qt0yl2w1ztwyx.jpg)

综上所述，也就是，只要服务器的返回头埋的坑够多，这个方法根本无法完美解决那么这个问题，httpx作者就给了个这个解释就没下文了
> > https://github.com/encode/httpx/issues/767#issuecomment-1367498458

就这么不了了之了。。。
因为根据http协议的响应头原理，确实不会出现这种不标准的字段
更官方的解释可以去查查http协议原理，或者看看以下资料：

> > https://developer.mozilla.org/zh-CN/docs/Glossary/Response\_header

我的理解如下：

> > 客户端需要先解析响应头，通过响应头的一些规范来解析返回的响应体的，既然你响应头都报错了，那后续的响应体解析自然也不会往下走了，直接报错退出。

**2.aiohttp**
对于aiohttp来说，像上面那么加正则表达式是无效的：

![](https://attach.52pojie.cn/forum/202304/03/181853tyjovorprxxdruv7.jpg)

一顿搜索，发现有如下方案

![](https://attach.52pojie.cn/forum/202304/03/181851dzk0gu9qnnli4qb4.jpg)

改完发现并没有用

![](https://attach.52pojie.cn/forum/202304/03/181849v4k32z4kiqww2kc6.jpg)

这还有说，改成1，也试了，不行

![](https://attach.52pojie.cn/forum/202304/03/181846o7h8808aemzhoczp.jpg)

更多的就不演示了反正就是一顿查找，发现aiohttp上并没有合理方案解决

**针对的解决方案**
 **1.用requests**
上面有了，这里就不展示了

但是requests我们知道，它是不支持http2.0协议的
**2.用正则表达式替换**

上面也有了，这里不贴了但是不能完美覆盖后续的响应头特殊参数

**3.用urllib3处理**
这个库用的倒不多，但可以直接请求：

![](https://attach.52pojie.cn/forum/202304/03/181844sxrxip4rp2882h42.jpg)

但是他也是个可以直接拿来请求的库，相比requets，那很多功能还是没有。其实requests本质就是借助了urllib3库的

所以，这个库，不出意外应该也是不支持http2.0的

**用非常规的请求库尝试**

既然目前的方法，除了requests/urllib3，其他都不行，那我在这个基础之上，强制http2，是不是就可以干掉requets库了，python的常规请求库直接无可用的，直接干死这些爬虫？

想的挺美的，哈哈

****1.用tls-client试试****

虽然他是用来对抗tls的，试试呢：

![](https://attach.52pojie.cn/forum/202304/03/181842w8ec0fy9efk0zgcf.jpg)

可行。为啥，因为他原理就是完全模拟浏览器，大概看了它的源码，用curl\_impersonate库，打包成了一个dll（具体怎么打包的不可知，这部分没开源，插一句，据群友反馈，也是因为这个dll，会导致内存泄漏），然后可以直接用，上面说过了，浏览器可以访问，那这个库肯定也可以访问了

那么测试那个某为的网址：

![](https://attach.52pojie.cn/forum/202304/03/181840a7l8nj5w3h0t57ww.jpg)

不行，被识别了，牛吧，还是得是某为啊

**2.用curl\_cffi试试**

![](https://attach.52pojie.cn/forum/202304/03/181838urvbnxixzb029i1v.jpg)

再来测试那个某为的网址：

![](https://attach.52pojie.cn/forum/202304/03/181836iqvpcdicjqttccjj.jpg)

这么对比，看来curl\_cffi才是获胜者啊，只能说，牛逼啊！！！

**实现一个anti aiohttp、httpx的服务**

简单的用fastapi 实现一个简单的服务，设置了下响应头，直接无情的嘲讽（只能设置英文状态的，要不然嘲讽力度拉满，嘿嘿）

![](https://attach.52pojie.cn/forum/202304/03/181834vffftht1xtffps5m.jpg)

**1.用httpx请求**

httpx代码不变，只是把url换了，果然报错

![](https://attach.52pojie.cn/forum/202304/03/181832chvy59tt9l8t8hbm.jpg)

**2.用aiohttp请求**

再来看aiohttp，果然报错，哈哈哈哈

![](https://attach.52pojie.cn/forum/202304/03/181829nwn7lxl3h1leslx3.jpg)

**2.用http.client请求**

![](https://attach.52pojie.cn/forum/202304/03/181827lcg726s66mn66cfo.jpg)

**3.用urllib3、requests测试**

![](https://attach.52pojie.cn/forum/202304/03/181825zsx7jflc4zs64ul4.jpg)

![](https://attach.52pojie.cn/forum/202304/03/181823xzy21wqxhv5ykqeq.jpg)

还得是这哥俩啊，直接能跑

**4.用node的request请求看看**

![](https://attach.52pojie.cn/forum/202304/03/181821mp8fltlppk6yvnyt.jpg)

刺激，也给防住了。

**5.用golang 看看**

![](https://attach.52pojie.cn/forum/202304/03/181818jpdgdahxpome7b7e.jpg)

刺激啊，也没有正常返回

**6.用postman看看**

![](https://attach.52pojie.cn/forum/202304/03/181816chbbh41a99149b44.jpg)

postman也直接无返回

**7.用安卓看看**

[Java] *纯文本查看*

```
package com.geek.spiderclient;
import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;import android.util.Log;
import android.widget.TextView;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends AppCompatActivity {
    private TextView textView;
    [url=https://www.52pojie.cn/home.php?mod=space&uid=1892347]@Override[/url]    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        textView = findViewById(R.id.hello);
        new Thread(new Runnable() {
            String result = "";
            @Override
            public void run() {
                try {
                    String url_string = "http://192.168.30.251:8000/";// 由于高版本有https的限制，需要修改targetSdk为27及一下。
                    URL url = new URL(url_string);                    //得到connection对象。
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();                    //设置请求方式
                    connection.setRequestMethod("GET");                    //连接
                    connection.connect();                    //得到响应码
                    int responseCode = connection.getResponseCode();
                    Log.d("headers", "" + connection.getHeaderFields());
                    if (responseCode == HttpURLConnection.HTTP_OK) {                        //得到响应流
                        InputStream inputStream = connection.getInputStream();                        //将响应流转换成字符串
                        result = is2String(inputStream);//将流转换为字符串。
                        Log.d("result", "result=============" + result);
                    }
                 }
                 catch (Exception e) {
                     e.printStackTrace();
                 }
                 runOnUiThread(new Runnable() {
                     @Override
                     public void run() {
                         Log.e("result", "runOnUiThread");
                         textView.setText(result);
                         }
                 });
                 }
                 }).start();
            }
    public String is2String(InputStream is) {        //连接后，创建一个输入流来读取response
        BufferedReader bufferedReader = null;
        try {
            bufferedReader = new BufferedReader(new InputStreamReader(is, "utf-8"));
            String line = "";
            StringBuilder stringBuilder = new StringBuilder();
            String response = "";            //每次读取一行，若非空则添加至 stringBuilder
            while ((line = bufferedReader.readLine()) != null) {
                stringBuilder.append(line);
            }            //读取所有的数据后，赋值给 response
            response = stringBuilder.toString().trim();
            return response;
            }
            catch (IOException e) {
            e.printStackTrace();
         }
           return null;
       }}
```

打包好之后：

安卓是可以的

再来看看服务端这边

![](https://attach.52pojie.cn/forum/202304/03/181814vuu23s2m2iisau1a.jpg)

其实是有正常请求的，但是客户端那边无法正常解而已。

那么有朋友估计有想法，那既然报错，我捕获异常强制打印结果不行吗？
这里还是用回到python httpx库试试

![](https://attach.52pojie.cn/forum/202304/03/181812h5jje5sesiefc5n6.jpg)

不行的哈哈，原因前面说过了

**配置将服务强制http2.0协议**

**1.配置服务端**

说干就干，准备尝试把代码移植刀服务器上，直接启动这边的服务，然后nginx搭建好，配置好http2，我买的服务器它默认没给开80和443等常规的库，问了客服说要申请备案了才行，卧槽，很迷，无所谓，我把这个服务搭建到6363端口上：

nginx如下配置：

[Bash shell] *纯文本查看*

```

server {
    # listen 6363;
    listen [::]:6363 ssl  http2; # managed by Certbot
    listen 6363  ssl http2; # managed by Certbot
    ssl_certificate /root/cert.pem; # managed by Certbot
    ssl_certificate_key /root/key.pem; # managed by Certbot
    if ($server_protocol !~* "HTTP/2.0") {
        return 444;
    }
    root /data/www/fast-tortoise;
    server_name 0.0.0.0;
    location / {
        proxy_set_header x-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:8000/; # gunicorn绑定的fastapi的端口号
    }      # 配置static的静态文件：
    location ~ ^\/static\/.*$ {
        root /data/www/fast-tortoise/static;
    }}
```

证书文件用以下命令生成即可：前提得安装openssl库

[Bash shell] *纯文本查看*

```
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

**2.请求测试**
配置好了之后，首先requests肯定是不行了，因为不支持http2.0。这里就不演示了。

用httpx测试下，唉？直接就给放行了

![](https://attach.52pojie.cn/forum/202304/03/181808o6gb6fmt89zlp1n8.jpg)

卧槽？反爬虫路途创业未半中道崩卒....
.....

看来http2.0把这个问题修复了呀......

......
那就只能在http1.0，http1.1下防住一部分的爬虫了

那有朋友估计要问了，你这个操作，好像只是有点奇怪，但实际并没有文章标题说的那么邪乎啊，说直接点，基本没啥用啊

**解惑**

如果坚持看到这里的朋友，还没有忘记前面说的有关requests问的话。ok，这里开始说说。
其实我一开始发现这个所谓的bug的时候，感觉也不是太有用，requests都能跑，没把requests防住，那肯定没啥意思啊。
那么这个所谓的bug，真的没用吗？
只是这一个的话肯定防不住的，可以用来跟其他反爬手段组合啊，比如tls指纹，或者其他的风控检测手段等等的。

其实，我在发这篇文章之前，也开发了两个爬虫练习题：

![](https://attach.52pojie.cn/forum/202304/03/181805oo9zvkt090v7bruq.jpg)

第一题就是这个bug了。
第二题是另外一个检测手段，**可以检测到requests和httpx，tls-client，curl\_cffi，aiohttp，还有常规的请求软件，而且没有用到tls指纹**
本来说是先让群友拿来玩，然后过几天发文章公开检测手段以及如何bypass的。
我没想到，有无聊的人搞我服务器.....，所以我服务关了
以后想好了再公布另一种检测方案吧

**结语**
**爬虫的核心，还是指纹等静态特征完全的模拟浏览器环境，行为等动态特征完全的模拟人为操作**

第一次在吾爱发帖，萌新表示好紧张，排版调了好半天

感谢大哥大姐们的耐心观看！！！！
