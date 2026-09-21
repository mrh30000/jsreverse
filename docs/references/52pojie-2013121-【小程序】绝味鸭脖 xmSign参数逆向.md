# 【小程序】绝味鸭脖 xmSign参数逆向

> **作者**: 就往丶 | **发布时间**: 2025-03-10 15:08:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10032 / 94
> **原文**: [https://www.52pojie.cn/thread-2013121-1-1.html](https://www.52pojie.cn/thread-2013121-1-1.html)

---

*本帖最后由 就往丶 于 2025-3-10 22:45 编辑*

小程序：绝味鸭脖 xmSign参数逆向

## 1. 环境使用

使用手机连接电脑 adb控制手机

微信中打开 <http://debugxweb.qq.com/?inspector=true> 地址

![image-20250310142809865](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_28_9_image-20250310142809865.png)

打开cmd 输入`adb devices` 查看下面是否有设备

![image-20250310142857897](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_28_57_image-20250310142857897.png)

edge浏览器打开`edge://inspect/#devices`

chrome浏览器打开`chrome://inspect/#devices`

![image-20250310143019969](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_30_20_image-20250310143019969.png)

在手机中打开小程序网页等待一会，就会出现页面信息

![image-20250310143101094](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_31_1_image-20250310143101094.png)

先刷新一下网页 重新获取全部的文件

![image-20250310144232658](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_42_32_image-20250310144232658.png)

## 2.请求解析

接口：`activity/function/task/get`

`xmsign` 加密数据

`noncestr` 加密数据

`xmtimestamp` 13位时间戳

![image-20250310144357993](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_43_58_image-20250310144357993.png)

## 3.代码分析

### xmSign参数

按住`ctrl+shift+p`打开搜索

搜索`xmsign`信息发现有5条数据 全部打上断点 刷新页面

在打断点的时候 前面两个打不上 只有最后可以 那我们先测试一下最后的能不能断下来

![image-20250310144542251](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_45_42_image-20250310144542251.png)

成功断下

看到了一个md5 大概率就是md5 先把这些参数拿出来 去[CyberChef](<https://gchq.github.io/CyberChef/#recipe=MD5()&oenc=65001>) 测试一下 是原本的md5 那开始看这些参数哪来的

![image-20250310144834608](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_48_34_image-20250310144834608.png)

![image-20250310145123159](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_51_23_image-20250310145123159.png)

![1](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_52_34_image-20250310145234846.png)

* `p.default.enc.Base64.parse("dWgzJEhnJl5ISzg3NiVnYnhWRzdmJCVwPTBNfj5zMXg=").toString(p.default.enc.Utf8)` 这句代码只是一个编码转换 是写死的值可以不用看
* `q`参数
  + (1)处定义了q为空字符串
  + (2)处 `r[S] instanceof Object`：如果 `r[S]` 是一个对象（包括数组），则条件为真。
  + `? q += JSON.stringify(r[S]) + ""`：如果 `r[S]` 是一个对象，则使用 `JSON.stringify(r[S])` 将其转换为 JSON 字符串，然后将其追加到 `q` 中。`+ ""` 确保结果始终是一个字符串。
  + `: q += r[S] + ""`：如果 `r[S]` 不是一个对象（例如，字符串、数字、布尔值），则直接将其转换为字符串并追加到 `q` 中。`+ ""` 确保结果始终是一个字符串。

![image-20250310145446496](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_56_43_10_14_54_46_image-20250310145446496.png)

这个只是把r里面的数组都拼接起来 继续向上找 看看`nonceStr`在哪里生成的
![image-20250310145842040](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_14_58_42_image-20250310145842040.png)

看到这里 发现是从m获取到的 继续向上找

```
x = x && JSON.stringify(x).length > 2 && Object.keys(x).length ? Object.assign(x, m) : m,
r = g(x)
```

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_15_0_15_10_15_0_6_image-20250310150006095.png)

找到生成的了 `nonceStr`就是`v`函数生成的了 打上断点跟进去看看

![image-20250310150131466](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_15_1_31_image-20250310150131466.png)

看到 Math.random() 通过一些位运算改变了一些什么  大概率就是随机生成的了 32位

![image-20250310150241674](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_15_2_41_image-20250310150241674.png)

现在捋一下思路

1. 通过m获取到 `nonceStr` 和 `xmTimestamp` 把这两个拼接起来
2. 在把上面拼接的内容加上`p.default.enc.Base64.parse("dWgzJEhnJl5ISzg3NiVnYnhWRzdmJCVwPTBNfj5zMXg=").toString(p.default.enc.Utf8)`的盐
3. 进行md5生成

m到q就是拼接的然后加上盐 进行md5加密

![image-20250310151108481](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_15_11_8_image-20250310151108481.png)

---

### tokenSign

接口：`xm/token/getUserToken`

比上面多了一个参数**tokenSign**

![image-20250310223415232](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_34_22_image-20250310223415232.png)

继续先来一个搜索大法 下面这个文件跟上面xmSign是一起的 直接看这个

![image-20250310223516471](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_35_16_image-20250310223516471.png)

可以直接看到用的是md5加密 `n`参数就在上面生成的

![image-20250310223658011](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_36_58_image-20250310223658011.png)

直接把吧断点打上

`r.default.getUrlParameter("li")` 这个看方法名就是用url中获取一个数据 ，重复请求了一下发现是固定的参数 猜测一下可能是对应的当前活动页面的id 可以从下面的图片2中看到

![image-20250310223807047](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_38_7_image-20250310223807047.png)

![image-20250310223945644](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_39_45_image-20250310223945644.png)

这三步就是跟上面xmSign的加密方式相同了

`p.default.enc.Base64.parse("SjdoOCZeQmdzNSNibio3aG4lIT1raDMwOCpidjIhc14=").toString(p.default.enc.Utf8)`变化了

```
J7h8&^Bgs5#bn*7hn%!=kh308*bv2!s^
```

![image-20250310224027208](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_40_27_image-20250310224027208.png)

![image-20250310224104719](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_41_4_image-20250310224104719.png)

跟上面差不多的加密就可能多了一个活动id

![image-20250310224314570](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_43_14_image-20250310224314570.png)

可以看到从接口出去的tokenSign是跟上面一样的

![image-20250310224344034](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_43_44_image-20250310224344034.png)

py实现了没有任何问题

![image-20250310224446031](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/10_22_44_46_image-20250310224446031.png)
