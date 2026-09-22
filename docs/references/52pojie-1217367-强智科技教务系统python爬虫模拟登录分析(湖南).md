# 强智科技教务系统python爬虫模拟登录分析(湖南)

> **作者**: lishunwei | **发布时间**: 2020-07-11 13:23:00 | **版块**: 『编程语言区』 | **查看/回复**: 6221 / 10
> **原文**: [https://www.52pojie.cn/thread-1217367-1-1.html](https://www.52pojie.cn/thread-1217367-1-1.html)

---

#### 强智科技教务系统python爬虫模拟登录分析（湖南）

***本文章仅用作于学习***

***前提：最近期末到来，想第一时间看到新出成绩的，于是就有了爬取学校教务系统自己的成绩并通过Qmsg酱推送到自己QQ上的想法，目前完成了模拟登录的阶段。***

* *分析思路用到了[这个帖子](https://blog.csdn.net/qq_40590018/article/details/100593751?utm_medium=distribute.pc_relevant_t0.none-task-blog-BlogCommendFromMachineLearnPai2-1.edu_weight&depth_1-utm_source=distribute.pc_relevant_t0.none-task-blog-BlogCommendFromMachineLearnPai2-1.edu_weight)*（点击查看）

##### 进入正题：

1. **分析登录网页**

打开教务系统的登录页面，F12 点击到Network分析，不输入账号密码，点击刷新

![无法显示](https://s1.ax1x.com/2020/07/11/UQJ3MF.png)

可以看到前两个东西带有logon字样，不用想肯定和登录验证有关

接下来输入账号，密码再试一次

![无法显示](https://s1.ax1x.com/2020/07/11/UQGRvF.png)

发现还是没变化，那我们点开第一个数据看看详情

![无法显示](https://s1.ax1x.com/2020/07/11/UQtlB4.png)

我们看到第一个数据的链接，上面看到flag字样，肯定代表的是服务器分发给客户端某种标识，点到headers看看详情，发现这时候已经已经出现了一个cookie，我们接着往下面看

![无法显示](https://s1.ax1x.com/2020/07/11/UQwcX6.jpg)

我们可以看到是post请求，我们不难想到一般post的请求都是提交了某种表单，好，那我们接着翻下去看看（这里我们应该是看左边红框里面刷新的刷新的，但是我写这个文章的时候才发现，不过并不影响接着分析）

![](https://s1.ax1x.com/2020/07/11/UQUMTJ.png)

我们发现cookie和前面尝试登陆的cookie一样，这个cookie也代表这服务器分发给客户端，代表一种标识，以后的访问都会带有这个cookie，那我们肯定要保存下来。又可以看到form data里面提交的表单，好像跟我们提交的填写的账号密码一点关系都没有。。。。这是教务系统！！！肯定不是明文传输啊，提交的数据肯定是经过加密了的表单。那我们这次成功登陆再看看这些数据。

![无法显示](https://s1.ax1x.com/2020/07/11/UQaT5d.png)

我们登陆进去了，可以看到cookie还是跟前面的一样，那我们的猜测是没有错的，我们得保存第一次请求的cookie，以后所有的访问都要带有这个cookie，然后再看到表单的地方，我们发现view 和 usedogcode 没变化 但是encoded和randomcode有了数据，看出了什么，randomcode的表单数据不就是上一张图我们填写的验证码嘛，好我们弄清楚了randomcode代表的数据。我们再看看encoded，我发现这个encoded里面提交的数据竟然和我的账号密码有点相似。这个数据那这无疑是加密过后的账号密码。那这个是不是固定不变的呢?或者说这一串数据仅仅通过某种固定的变化对账号密码加密。我们退出重新登录看下有没有变化。

![无法显示](https://s1.ax1x.com/2020/07/11/UQys9e.jpg)

结果发现是有变化的，好。。。。接下来该怎么办呢。。。那我们不妨去看看登录页面的源代码：

![无法显示](https://s1.ax1x.com/2020/07/11/UQ6J58.png)

我们看到表单的位置，提交时候调用了js函数，我们不妨搜索函数的位置一探究竟

![无法显示](https://s1.ax1x.com/2020/07/11/UQcSdP.png)

我们用浏览器自带的搜索工具Ctrl+F，找到函数的位置，果然这个地方就是对我们账号密码加密的位置，但是好像没那么简单，我们看到success后面又调用了函数里面还传递了一个形参。。。我们把它专门拿出来看一下：

![无法显示](https://s1.ax1x.com/2020/07/11/UQc5lQ.png)

不难发现，这个函数里面对传过来的形参#号位置分割之后，就对我们账号密码和形参传过来的字符串的一套猛如虎的操作（我也看不懂，看不懂没关系）后组成了我们的encoded。不是python无所不能嘛，哈哈哈，理所当然我们就想到了execjs库，可以用来跑js代码，然后用python直接获取加密后的数据。但是这个形参是从那里传来的呢，我们看到strUrl变量被赋值了一个url链接的一部分，好像很眼熟，对，其实我们在之前见过了。下图红框：

![](https://s1.ax1x.com/2020/07/11/UQ22RS.png)

我们直接点进去

![无法显示](https://s1.ax1x.com/2020/07/11/UQ24qs.png)

我们看到返回了一个字符串，还带有#号，这就与前面的分析联系起来了。那这就应该是传给形参的参数了。

2. **根据分析写代码**

   * 第一步就是应该访问获取形参的参数的地址，获取形参，并保存cookie（以后的所有访问都要设置这个cookie）。

     ```
      def get_login_cookies(self):#获取全局cookies
          header = {
              "Content-Type": "text/html;charset=utf-8",
              "Vary": "Accept-Encoding"
          }
          url = "http://jiaowu2.hufe.edu.cn/Logon.do?method=logon&flag=sess"
          response = session.get(url=url, headers=header, timeout=1000)  # ses已经获得了cookies
          self.dataStr = response.text
          print("dataStr为："+self.dataStr)
          self.encode = self.get_js()
          self.fun_code()
          cookies = session.cookies.get_dict()  # 获得临时的cookies
          cookies = str(cookies).replace("{", '').replace("'", '').replace(":", '=').replace('}', '').replace(",", ";")
          cookies = cookies.replace(" ", '')
          self.cookie = cookies
          print('cookie为：'+cookies)
          return cookies
     ```
   * 第二步就是通过获取的形参参数和自己的账号密码组合成加密后的数据:

     + 但是我们得把js代码做相应修改保存到本地调用，如下：

     ![无法显示](https://s1.ax1x.com/2020/07/11/UQc5lQ.png)

     去掉多余代码，把获取到得形参对应的字符串和账号密码也直接作为形参传进来，因为我们只要最终组合的加密字符串：

     ```
     function(dataStr,userAccount,userPassword) {
                 var scode=dataStr.split("#")[0];
                 var sxh=dataStr.split("#")[1];
                 var code=userAccount+"%%%"+userPassword
                 var encoded="";
                 for(var i=0;i<code.length;i++){
                     if(i<20){
                         encoded=encoded+code.substring(i,i+1)+scode.substring(0,parseInt(sxh.substring(i,i+1)));
                         scode = scode.substring(parseInt(sxh.substring(i,i+1)),scode.length);
                     }else{
                         encoded=encoded+code.substring(i,code.length);
                         i=code.length;
                     }
                 }
                 return encoded;
             }
     ```

     python代码：

     ```
      def get_js(self):  # python 调用JS加密 返回 加密后的结果
          with open(r'教务系统加密.js', encoding='utf-8') as f:
              js = execjs.compile(f.read())
              return js.call('encode', self.dataStr,self.use_id,self.password)
     ```
   * 第三步携带cookie头部获取验证码保存到本地，用百度识图识别：

     ```
      def fun_code(self):  # 获取验证码并保存到本地，返回验证码图片文件名
          url_verifycode = 'http://jiaowu2.hufe.edu.cn/verifycode.servlet'
          cookie = {"Cookie": self.cookie}
          response = session.get(url_verifycode,cookies=cookie)
          with open('verifycode.jpg', 'wb')as f:
              f.write(response.content)
              f.close()
          return 'verifycode.jpg'

      class ReadImage:#验证码识别
      # code = ''
      access_token = ''
      def __init__(self):
          self.access_token = self.Access_Token(API_key,Secret_key)
      def Access_Token(self,API_key, Scret_key):#获取百度识图api的token
          host = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={}&client_secret={}'\
              .format(API_key, Scret_key)
          response = requests.get(host)
          print(response.status_code)
          if response:
              # print(response.json())
              data = json.loads(response.content)
              # print(type(data))
              # print(data)
              return data['access_token']

      def read(self,access_token, path):#验证码识别
          request_url = "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic"
          f = open(path, 'rb')
          img = base64.b64encode(f.read())
          params = {"image": img}
          access_token = access_token
          request_url = request_url + "?access_token=" + access_token
          headers = {'content-type': 'application/x-www-form-urlencoded'}
          response = requests.post(request_url, data=params, headers=headers)
          # print(response.status_code)
          # print(response.text)
          if response:
              print('识别返回结果：'+str(response.json()))
              code = response.json().get('words_result')[0].get('words')
              #待完善
              print('验证码最终识别结果:'+code)
              return code
      def get_code(self):
          path = 'verifycode.jpg'
          code = self.read(self.access_token,path)
          return code.strip()
     ```
   * 最后一步，得到验证码的识别后的结果后，模拟登录

     ```
      def login(self):
          image = ReadImage()
          header = {#设置头部
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;"
                        "q=0.8,application/signed-exchange;v=b3;q=0.9",
              "Accept-Encoding": "gzip, deflate",
              "Accept-Language": "zh-CN,zh;q=0.9",
              "Cache-Control": "max-age=0",
              "Content-Length": "47",
              "Content-Type": "application/x-www-form-urlencoded",  # 接收类型
              "Cookie": self.cookie,
              "Host": "jiaowu2.hufe.edu.cn",
              "Origin": "http://jiaowu2.hufe.edu.cn",
              "Proxy-Connection": "keep-alive",
              "Referer": "http://jiaowu2.hufe.edu.cn/Logon.do?method=logon",
              "Upgrade-Insecure-Requests": "1",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
                            " Chrome/83.0.4103.116 Safari/537.36",
          }
          PostData = {
              'useDogCode':'',
              'view':'0',
              'encoded': self.encode,#账号密码加密后的东西
              'RANDOMCODE': image.get_code()
          }
          url = 'http://jiaowu2.hufe.edu.cn/Logon.do?method=logon'
          msg = session.post(url, headers=header, data=PostData, timeout=1000)
          print(msg.url)#打印访问的地址
          print(msg.text)#打印返回的网页信息
     ```

* 完整代码：
* ```
  '''
  --- DaWeiGuo 2020/7/10 ---
  个人主页：www.daweiguo.xyz
  '''
  import base64
  import requests
  import json
  import execjs
  ```

API\_key = '百度识图创建应用后的key'
Secret\_key = '百度识图创建应用后的密钥'
session = requests.session()

class ClimBug:
use\_id = '你自己的账号'
password = '密码'
cookie = ''
dataStr = ''
encode = ''
def get\_login\_cookies(self):#获取全局cookies
header = {
"Content-Type": "text/html;charset=utf-8",
"Vary": "Accept-Encoding"
}
url = "<http://jiaowu2.hufe.edu.cn/Logon.do?method=logon&flag=sess>"
response = session.get(url=url, headers=header, timeout=1000)  # ses已经获得了cookies
self.dataStr = response.text
print("dataStr为："+self.dataStr)
self.encode = self.get\_js()
self.fun\_code()
cookies = session.cookies.get\_dict()  # 获得临时的cookies
cookies = str(cookies).replace("{", '').replace("'", '').replace(":", '=').replace('}', '').replace(",", ";")
cookies = cookies.replace(" ", '')
self.cookie = cookies
print('cookie为：'+cookies)
return cookies
def get\_js(self):  # python 调用JS加密 返回 加密后的结果
with open(r'教务系统加密.js', encoding='utf-8') as f:
js = execjs.compile(f.read())
return js.call('encode', self.dataStr,self.use\_id,self.password)

```
def fun_code(self):  # 获取验证码并保存到本地，返回验证码图片文件名
    url_verifycode = 'http://jiaowu2.hufe.edu.cn/verifycode.servlet'
    cookie = {"Cookie": self.cookie}
    response = session.get(url_verifycode,cookies=cookie)
    with open('verifycode.jpg', 'wb')as f:
        f.write(response.content)
        f.close()
    return 'verifycode.jpg'

def login(self):
    image = ReadImage()
    header = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;"
                  "q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Cache-Control": "max-age=0",
        "Content-Length": "47",
        "Content-Type": "application/x-www-form-urlencoded",  # 接收类型
        "Cookie": self.cookie,
        "Host": "jiaowu2.hufe.edu.cn",
        "Origin": "http://jiaowu2.hufe.edu.cn",
        "Proxy-Connection": "keep-alive",
        "Referer": "http://jiaowu2.hufe.edu.cn/Logon.do?method=logon",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
                      " Chrome/83.0.4103.116 Safari/537.36",
    }
    PostData = {
        'useDogCode':'',
        'view':'0',
        'encoded': self.encode,#账号密码加密后的东西
        'RANDOMCODE': image.get_code()
    }
    url = 'http://jiaowu2.hufe.edu.cn/Logon.do?method=logon'
    msg = session.post(url, headers=header, data=PostData, timeout=1000)
    print(msg.url)
    print(msg.text)
```

class ReadImage:#验证码识别

## code = ''

```
access_token = ''
def __init__(self):
    self.access_token = self.Access_Token(API_key,Secret_key)
def Access_Token(self,API_key, Scret_key):#获取百度识图api的token
    host = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={}&client_secret={}'\
        .format(API_key, Scret_key)
    response = requests.get(host)
    print(response.status_code)
    if response:
        # print(response.json())
        data = json.loads(response.content)
        # print(type(data))
        # print(data)
        return data['access_token']

def read(self,access_token, path):#验证码识别
    request_url = "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic"
    f = open(path, 'rb')
    img = base64.b64encode(f.read())
    params = {"image": img}
    access_token = access_token
    request_url = request_url + "?access_token=" + access_token
    headers = {'content-type': 'application/x-www-form-urlencoded'}
    response = requests.post(request_url, data=params, headers=headers)
    # print(response.status_code)
    # print(response.text)
    if response:
        print('识别返回结果：'+str(response.json()))
        code = response.json().get('words_result')[0].get('words')
        #待完善
        print('验证码最终识别结果:'+code)
        return code
def get_code(self):
    path = 'verifycode.jpg'
    code = self.read(self.access_token,path)
    return code.strip()
```

demo = ClimBug()
demo.get\_login\_cookies()
demo.login()
 ***最后代码有很多的缺点，还有待完善的地方，希望大家指出***
