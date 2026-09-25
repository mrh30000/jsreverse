# 安卓协议逆向之frida hook百例

> **作者**: xiaoc996 | **发布时间**: 2022-11-12 18:21:00 | **版块**: 『移动安全区』 | **查看/回复**: 21568 / 175
> **原文**: [https://www.52pojie.cn/thread-1711668-1-1.html](https://www.52pojie.cn/thread-1711668-1-1.html)

---

*本帖最后由 xiaoc996 于 2022-11-12 20:04 编辑*

### 安卓协议逆向之frida hook百例

各位下午好 我是一位往Android安全方向走的小菜鸟一枚 目前也是很努力在学 这个系列也会一直更新 记录自己的学习过程 大佬多担待担待 有出错的地方也帮忙指出

### frida hook环境

```
1. pycharm（python,JavaScript）
2.安卓模拟器（觉得哪个好用就用哪个）
3.frida配置（frida是配置在python的）
4.jadx-gui (反编译工具)
（后续有其他工具再贴 以上的工具论坛已经有很多大佬教过安装和配置了 这里就不赘述了）
```

### 目标app

```
SHB9Bp8hYYgXQMYBQViZQF==（题目：仿射后的base)
```

### 分析过程

#### 刨析内容

此处是fd抓的password login 的提交
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/logintxt.png)
提交的data:

```
appid (app标识)
sign(加密)
appversion(app版本)
channelid(好像也是一个标识吧反正固定的)
pwd (密码(加密))
udid (加密)
username (手机号)
```

共有三处加密 一个sign  一个pwd 这两个初步看是md5  还有一个udid 一开始还以为是base加密 丢进base全家桶解密结果不是 那就暂定AES或RSA吧

#### pwd|sign分析

该说不说 是骡子是马直接丢jadx
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/login.ashx.png)
好家伙搜sign这么多地址 那咱怎么可能一个个看 直接搜login.ashx
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/666.png)
那咋办嘛 进来之后 看到这里string了一个对象 是login\_url 那就应该会有调用他的地方进行post提交 直接搜这个对象看看
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/pwd.png)
果不其然 这里拼接了一个username 和pwd  还能看到有个encodemd5 里面传了个str3 str3还是一个被传进来的参数 这里应该就是对pwd进行加密的地方 双击进入这个方法 真相就要水落石出了
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/%E5%AF%86%E7%A0%81.png)
md5的模子  直接给他hook下来

```
#####python代码块
import frida  # 导入frida模块
import sys  # 导入sys模块
def on_message(message, data):  # js中执行send函数后要回调的函数
print(message)# 打印回调的函数
session = frida.get_remote_device().attach('name')  # app名字
with open("./hook.js",encoding='utf-8') as f:script = session.create_script(f.read())# 找到我们写好的hook脚本 然后进行注入
script.on('message', on_message)  # 加载回调函数，也就是js中执行send函数规定要执行的python函数
script.load()  # 加载脚本

sys.stdin.read()#进行程序阻塞 让我们进行调试  如果不加这段会直接允许会直接结束代码 CTRL+D可以直接结束程序
```

```
##JS代码块
Java.perform(function (){
Java.use('com.autohome.ahkit.utils.SecurityUtil').encodeMD5.implementation=function (data){          ///function里面的data是要劫持的函数
///com.autohome.ahkit.utils <文件名 package>
///SecurityUtil <类名 class>
///encodeMD5 <函数名 调用的方法名>
console.log(data); ///打印此函数
return this.encodeMD5(data);///劫持完代码看一下怎么个事就给你反回去
 }
});
```

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/hookpwd.png)

好家伙 点一下登陆 有两处调用了这里  第一个应该是密码 pwd  第二个可能是sign 经过抓包检验 确实是我们要的sign参数 只是抓到的包里面的sign参数是经过md5到大写

###### 事已至此 sign or pwd的encrypt到此结束

---

#### udid分析

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/data.png)
通过我们对sign的劫持 我们取到了一串明文  接下来还是继续分割出来 发现了udid在这里就已经进行了加密  然后pwd也是加密了  pwd没什么好说的 在刚才的hook中已经知道他是先加密了pwd再进行拼接 然后把这个拼接完的数据继续入参进行md5加密成sign   以下是对udid的分析

依旧是无脑定位大法  搜udid 看到getudid直接进
(接下来看图吧 以下是找udid的生成过程)
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/udid.png)
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/hhh.png)
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/udid4.jpg)
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/%E5%A4%AA%E6%A3%92%E4%BA%86.png)
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221112174315.png)
到这里 就给大家简单说一下 这个udid的生成

```
HiAnalyticsConstant.REPORT_VAL_SEPARATOR 这玩意转到声明  实际上就是一个|  分割用的
getIMEI(context)  这里是获取了你的设备号
System.nanoTime  这里是调用了系统方法 查了下好像是生成随机时间的？
# SPUtils.getDeviceId() device iD 设备ID？ 后面发现这里是抓包获取到的 设备号固定这个值也固定
```

udid的生成找到了  最后是通过encode3Des进行加密  如果不懂什么是3Des加密的可以去上网搜一下
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221112175956.png)
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221112180145.png)

```
Java.perform(function (){
Java.use('com.autohome.ahkit.AHAPIHelper').getDesKey.implementation=function (mDesKey){///function里面的data是要劫持的函数
var key = this.getDesKey(mDesKey)

     console.log(key)
   return key;///劫持完代码看一下怎么个事就给你反回去

 }
});
```

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221112180513.png)
key找到了 大概过程也分析完了  我们尝试hook一下拿到明文然后自己还原校验一下
![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221112181030.png)
OK 成功 至此分析过程已经完毕

---

### 结束语

感谢各位的阅读 学逆向很累 但是喜欢的事还是得坚持下去 后面还是输出更好的例子给大家学习 我个人也在很努力的学习 跟大家一共共进步

###### 话说本来想输出js的逆向百例的 但是论坛已经很多大佬输出这类了 而Android逆向的确很少 自己也攻这方面不久 也想记录一下自己的成长
