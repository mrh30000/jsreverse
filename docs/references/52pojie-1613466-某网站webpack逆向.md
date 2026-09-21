# 某网站webpack逆向

> **作者**: Akihi6 | **发布时间**: 2022-03-30 11:36:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 19559 / 87
> **原文**: [https://www.52pojie.cn/thread-1613466-1-1.html](https://www.52pojie.cn/thread-1613466-1-1.html)

---

*本帖最后由 Akihi6 于 2022-3-30 13:19 编辑*

**目标网站：`aHR0cHM6Ly9tLmN0eXVuLmNuL3dhcC9tYWluL2F1dGgvbG9naW4/cmVkaXJlY3Q9JTJGbXk=`**

##### 寻找加密函数入口

输入邮箱、密码点击登录抓取请求信息（user@163.com、654321）

![](https://attach.52pojie.cn/forum/202203/30/130510gjgihv8x80h8z0mf.png)

这里看到password加密了（des加密）

在请求中看堆栈信息（Initiator）可以看到login的信息，点进去看一下

![](https://attach.52pojie.cn/forum/202203/30/115514z8babsag00zpos5z.png)

可以看到password的赋值操作,在这行打上断点重新请求一下

![](https://attach.52pojie.cn/forum/202203/30/115614gi266imlah7tvzmv.png)

可以看到`a.value`是输入的密码，`s.value`是输入的邮箱

![](https://attach.52pojie.cn/forum/202203/30/115704rbfywxx6s8gxfe7e.png)

![](https://attach.52pojie.cn/forum/202203/30/115902pn5u77565pct2csf.png)

复制这行在控制台打印一下，可以看到密码就经过加密处理了

![](https://attach.52pojie.cn/forum/202203/30/115932u8usks5ngunueece.png)

美化一下代码，在控制台打印一下结果一样

```
encodeURI(Object(l["c"])(a.value, Object(l["f"])(Object(l["g"])(s.value))))
l["c"](a.value, l["f"](l["g"](s.value)))
```

![](https://attach.52pojie.cn/forum/202203/30/120007xwreet68twaorz8x.png)

先找`l["c"]`方法，可以看到H方法，追进去看一下，

![](https://attach.52pojie.cn/forum/202203/30/120038dv9vhopugtehf651.png)

![](https://attach.52pojie.cn/forum/202203/30/122916zl2qfndy2jzskjy2.png)

可以看到最后返回`s.toString()`  `s = p.a.TripleDES.encrypt(e, d, l)`

![](https://attach.52pojie.cn/forum/202203/30/122942frdozgl5r5ohifd0.png)

这是参数e是传参过来的、d是也是p.a的方法生成的、l也是p.a的方法生成的，找一下p.a在哪儿构建的，ctrl+f搜索后发现找不到，那就找p的构建

![](https://attach.52pojie.cn/forum/202203/30/123004gh04nyatar4yx74a.png)

看到这里就可以确定是webpack了

##### webpack处理

###### 第一种姿势

这里用漁佬（@漁滒 ）的AST自动扣webpack

这里附上神器地址

使用教程：[ast自动扣webpack脚本实战](https://www.52pojie.cn/thread-1572529-1-1.html)

​        源码：[渔滒 / webpack\_ast](https://gitcode.net/zjq592767809/webpack_ast)

**寻找加载器的js文件保存到本地**

​        在password断点文件中看一下有没有加载器加载函数

![](https://attach.52pojie.cn/forum/202203/30/123033n99whgtpgzzhvzxg.png)

​        在文件开头可以看到`r("854c")`这个r肯定就是加载器了，在这行打一个断点，重新刷新页面

![](https://attach.52pojie.cn/forum/202203/30/123056dz19ydylk55iwkyr.png)

​        这里可以看到r的函数体u()，追进去

![](https://attach.52pojie.cn/forum/202203/30/123121b4hkfl2fej1fiffc.png)

​        这个u()就是加载器了，直接将这个js文件保存到本地

![](https://attach.52pojie.cn/forum/202203/30/123140w3gmehbmgnema18e.png)

**寻找函数模块的js文件保存到本地**

​        刚刚发现p是通过`t.n(t('3452'))`加载出来的在 `s = t("3452")`打个断点重新刷新页面，发现这个的t就是我们的u构造器那就好办了

![](https://attach.52pojie.cn/forum/202203/30/123201sgb8x9kdxjgumkkx.png)

​
![](https://attach.52pojie.cn/forum/202203/30/123237kv42hqhjdj8n6n8f.png)

​        F11单步追t("3452")就可以找到函数模块，把这个文件保存到本地

![](https://attach.52pojie.cn/forum/202203/30/123311uson07sdnaney7yy.png)

**使用大佬写好的AST代码**

现在目录下有3个文件

![](https://attach.52pojie.cn/forum/202203/30/123335vgratjoj7bmrhh8g.png)

执行`node .\webpack_mixer.js -l .\main.03a4fbe9.js -m .\chunk-vendors.f4efd280.js -o webpack_sdk.js`

生成了扣好的webpack代码

![](https://attach.52pojie.cn/forum/202203/30/123356mwfcpcpd0alffzdv.png)

###### 第二种姿势

自己扣webpack

往上看找加载器 可以看到开头`function(e)`先扣下来

将加载器(function(e) {里面的全部内容}扣下来，封装为匿名函数

![](https://attach.52pojie.cn/forum/202203/30/123418z9bz2f9jujz99jvj.png)

声明一个全部变量，再将加载器u赋值给use

![](https://attach.52pojie.cn/forum/202203/30/123435re40nho75o6746nr.png)

![](https://attach.52pojie.cn/forum/202203/30/123508ae05k51znh13tx0p.png)

先把函数模块js文件保存下来

![](https://attach.52pojie.cn/forum/202203/30/123528nhdqt8w5rdtzrapw.png)

搜索3452，将3452传给匿名函数

![](https://attach.52pojie.cn/forum/202203/30/123546hw1gtztwjzwdq6y2.png)

加载一下3452函数，window未定义，补上window

![](https://attach.52pojie.cn/forum/202203/30/123627koaaxtxg9ah2lgx8.png)

![](https://attach.52pojie.cn/forum/202203/30/123654dwc2uxqzum7u97qd.png)

![](https://attach.52pojie.cn/forum/202203/30/123714bpec30x8zx95c89c.png)

再次运行发现`TypeError: Cannot read property 'call' of undefined`这个错误，这个错误就是少函数模块，然后发现3452里面加载了其他函数模块

![](https://attach.52pojie.cn/forum/202203/30/123737zv1e5ygyyr55j1re.png)

![](https://attach.52pojie.cn/forum/202203/30/123757inb5bpo85114npbk.png)

将其他函数模块粘过来，粘完之后运行就不报错了

![](https://attach.52pojie.cn/forum/202203/30/123816relc9zvcmvr63jjj.png)

##### 构造password生成代码

将H()函数扣下来，生成p

![](https://attach.52pojie.cn/forum/202203/30/123835rkvwdei7p6i2c676.png)

这里用漁佬的生成加载器赋给了`module.exports`，所以用`module.exports`加载3452，

![](https://attach.52pojie.cn/forum/202203/30/123852qir8qp82r7vdg32q.png)

![](https://attach.52pojie.cn/forum/202203/30/123911jmm4o9p6c6977h7p.png)

![](https://attach.52pojie.cn/forum/202203/30/123931hikgjgvk5tcpir8p.png)

调用H函数（这里我将u赋值给了use，所以用use加载3452函数）发现不报错了

![](https://attach.52pojie.cn/forum/202203/30/123953i2pnv4s4uprpwvuu.png)

之前美化的调用h方法的代码就变成了

```
// 第一步美化
l["c"](a.value, l["f"](l["g"](s.value)))
// 第二步美化
H(a.value, l["f"](l["g"](s.value)))
```

这里a.value和s.value之前分析过,a.value是密码明文，s.value是邮箱

看一下`l["f"](l["g"](s.value))`干了什么，这里看到就是给邮箱加了12个0

![](https://attach.52pojie.cn/forum/202203/30/124014kfestufxefzxs8dg.png)

封装加密函数

![](https://attach.52pojie.cn/forum/202203/30/124033fqxl5546j8x544tt.png)

![](https://attach.52pojie.cn/forum/202203/30/124052fvbaag33u3aypnhh.png)

可以看到结果跟页面结果一样，至此加密完成！

![](https://attach.52pojie.cn/forum/202203/30/124112ktml50ptoj6t4j9j.png)
