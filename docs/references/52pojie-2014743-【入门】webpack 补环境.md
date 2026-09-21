# 【入门】webpack 补环境

> **作者**: 就往丶 | **发布时间**: 2025-03-15 01:02:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4807 / 19
> **原文**: [https://www.52pojie.cn/thread-2014743-1-1.html](https://www.52pojie.cn/thread-2014743-1-1.html)

---

*本帖最后由 就往丶 于 2025-3-15 11:12 编辑*

网址： `aHR0cHM6Ly95LnFxLmNvbS9uL3J5cXEvcGxheWVy`​

---

## 1.接口分析

接口：`cgi-bin/musics.fcg`​

参数：sign是加密的

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_5_32_20250314190531068.png)

## 2.代码分析

进入调用栈

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_6_10_20250314190610062.png)

先在send位置打上断点，页面刷新

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_8_30_20250314190829816.png)

往上一个栈找

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_9_15_20250314190914936.png)

‍

可以看到上面就有一个关键词`sign`​是从`i`​变量获取到的，`i`​变量就在上面 get请求走前面的部分 post 走后面的部分 我们的接口是post 所以我们需要分析后面的`o`​函数 。

​`o`​函数在上面 `o = n(350).default`​ 赋值得到 ，一看这种格式大概率是webpack 可以在往上面和下面看看

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_34_53_20250314193452305.png)

在n位置打上断点，进入n函数  找到构造器 ，那个`d`​函数就是构造器了  把这个页面的代码全部都复制出来

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_37_38_20250314193738186.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/14_19_38_2_20250314193801672.png)

扣出来代码运行一下，出现下面的错误，在最上面补一个 `window = global;`​

> ReferenceError: window is not defined

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_13_2_image-20250315001244-nfqrjdl.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_25_44_20250315002543392.png)

把构造器导出

`![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_16_48_20250315001648144.png)

1 **.**​**​`t.type.toUpperCase()`​** ​ **:** 将这个字符串转换为大写。例如，"get" 变为 "GET"。

**2.**   **​`"GET" === t.type.toUpperCase()`​** ​ **:** 这部分比较转换后的 `t.type`​ 是否严格等于字符串 "GET"。​`===`​ 是严格相等运算符，它不仅比较值，还比较类型。

**3.**  **​`o(t.data.data)`​** ​ **:**  如果 `t.type`​ 是 "GET"（忽略大小写），则执行这部分。

**4.**  **​`o(t.data)`​** ​ **:**  如果 `t.type`​ 不是 "GET"（忽略大小写），则执行这部分。

‍

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_21_27_20250315002126632.png)

把网站里面的代码复刻进去

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_42_9_20250315004208078.png)

在重新运行一下 会发现下面的错误 缺少函数  我们得继续补齐这个代码

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_26_37_20250315002636509.png)

回到网站中，在构造器的位置下一个条件断点 `t=350`​，在重新刷新网页

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_28_18_20250315002817762.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_28_56_20250315002855535.png)

就会重新断在这个位置，进入这个函数

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_29_25_20250315002924645.png)

可以在这个里面看到很多这样的函数，我们可以把他们拿出来，避免我们后面还要一直添加

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_30_22_20250315003022141.png)

可以下载一个 notepad++ 软件，把代码复制进去调整语音 ，把层级全部都缩起来

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_34_41_20250315003440253.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_35_4_20250315003504078.png)

打开第一层的时候会发现下面都是函数定义，然后在最上面有一个·`【`​ 跟最下面的`】`​是对应的 可以表示那些函数都是一个数组里面 都扣出来

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_35_16_20250315003515320.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_35_41_20250315003540901.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_36_12_20250315003611813.png)

‍

把代码放在之前的函数里面

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_42_37_20250315004236964.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_42_59_20250315004256805.png)

在重新运行一下，发现出结果了没有报错

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_43_16_20250315004314537.png)

我们在重新断到加密的位置然后输出一下`o(t.data)`​发现跟我们代码加密的不一样，我们要猜测是不是有环境检测

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_44_11_20250315004410784.png)

在 JavaScript 逆向工程中，我们的目标通常是获取目标网站的加密或解密函数，或者特定值的生成算法。在理想情况下，我们可以直接提取这些算法并在本地执行。然而，许多网站会实施浏览器指纹检测，这使得直接执行变得困难。为了解决这个问题，我们需要进行“环境补全”，即模拟目标网站的浏览器环境。

传统的环境补全方法往往依赖于逐步调试，通过观察程序运行时的 `undefined`​ 错误，逐个补充缺失的环境变量。这种方法繁琐且耗时。

为了提高效率，我们可以利用 `Proxy`​ 技术。`Proxy`​ 允许我们拦截对 `window`​、`document`​、`navigator`​ 等全局对象的访问和函数调用，这些对象通常是浏览器指纹检测的重点。通过代理这些对象，我们可以实时记录网站尝试访问的环境信息，并将其输出到控制台。这种“环境自吐”的方法使我们能够快速了解网站的环境检测机制，并集中进行环境补全，从而大大简化了逆向工程的流程。

对于JS逆向来说，我们扣完代码的目的就是调用目标网站的加/解密函数或某个值的算法，一般情况下我们把他的算法扣下来能够直接执行，但是如果检测了浏览器指纹，那就比较难了，只能够去深入分析进行补环境。

一般的补环境的是通过运行程序后的undefined报错去一点一点分析，一点一点的去补一些环境，是非常掉头发的。

所以我们使用 Proxy 对全局遍历window、document、navigator等常见环境检测点进行代理，拦截代理对象的读取、函数调用等操作，并通过控制台输出，这样的话我们就能够实现检测环境自吐的功能，后续我们再针对吐出来的环境统一的进行补环境，这样就会方便的多。

**代码如下**

```
function getEnv(proxy_array) {
    for(let i=0; i<proxy_array.length; i++){
        handler = `{
            get: function(target, property, receiver) {
                   console.log('方法：get','    对象：${proxy_array[i]}','    属性：',property,'    属性类型：',typeof property,'    属性值类型：',typeof target[property]);
                   return target[property];
            },
            set: function(target, property, value, receiver){
                    console.log('方法：set','    对象：${proxy_array[i]}','    属性：',property,'    属性类型：',typeof property,'    属性值类型：',typeof target[property]);
                    return Reflect.set(...arguments);
            }
        }`;
        eval(`
            try{
                ${proxy_array[i]};
                ${proxy_array[i]} = new Proxy(${proxy_array[i]},${handler});
            }catch(e){
                ${proxy_array[i]}={};
                ${proxy_array[i]} = new Proxy(${proxy_array[i]},${handler});
            }
        `);
    }
}
proxy_array = ['window','document','location', 'navigator', 'history', 'screen', 'history']
getEnv(proxy_array);
```

在代码最上面添加，在重新运行一下代码

```
navigator = {}
location= {}
document = {}
```

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_50_51_20250315005051129.png)

可以看到在`navigator`​对象缺少 `userAgent`​ 值，我们在浏览器中获取然后填写到代码里面

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_51_48_20250315005147778.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_53_37_20250315005336586.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_53_59_20250315005358090.png)

继续运行`location`​ 的`host`​属性没有 ，继续从浏览器中获取

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_57_41_20250315005740810.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_58_25_20250315005824779.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_58_47_20250315005846312.png)

重新生成好了，在跟网站里面的对比一下，

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_59_5_20250315005904002.png)

![image](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/15_0_59_28_20250315005928009.png)

---

**本文档所涉逆向分析内容仅为个人技术研究及学习交流之用，所有技术细节均基于公开可见信息整理。 技术研究应遵守国家法律法规及行业规范，使用者需对自身行为承担全部法律责任。如权利人认为存在侵权内容，请及时联系处理。**
