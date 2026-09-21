# 某猫盘加密参数par与pto分析

> **作者**: 临渊OvO | **发布时间**: 2023-12-12 18:44:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4789 / 5
> **原文**: [https://www.52pojie.cn/thread-1868285-1-1.html](https://www.52pojie.cn/thread-1868285-1-1.html)

---

*本帖最后由 临渊OvO 于 2023-12-13 23:53 编辑*

## 某猫盘加密参数par与pto分析

### 前言

某一天突发奇想想要查看一下有没有什么脚本可以写，想到了之前写的飞猫盘自动签到，因为后面加了加密算法就没法自动签到了，那段时间又没什么时间就搁置了，所以准备看一下算法到底怎么回事

### 准备工作

首先先去看了一下具体是那些参数，用 F12 的网络工具查看一下包，这里进行一下过滤，就过滤`info`关键词免得信息太多了，可以看到这个`par`和`pto`长得就像被加密的样子，所以我们主攻这两个参数

![](https://attach.52pojie.cn/forum/202312/13/233518q89e687682zezc98.png)

### 分析

#### pto 参数

这里的先去全局搜索一下，这里的话搜索也是有小技巧的，因为毕竟是全局搜索，如果光搜这个很短的参数肯定会特别多，所以我这边搜索的是`pto:`，为什么这样搜？因为既然他会用到这个参数，只要源代码里面会生成肯定就会`pto:它的生成过程或者用法`，不出意外这样搜就只有几个，但是没有直接找到我们想要的生成过程，但是至少确定到了他所在的文件

![](https://attach.52pojie.cn/forum/202312/13/233628izzigmmk9gi338wb.png)

进去查看发现虽然两个参数都在，但这几个都不是生成过程仅仅只是用法，所以我们在文件里面进行一下搜索，确定所在文件之后搜索很快就找到生成位置，这里比较明显就是我们要的，毕竟前面是`setitem`函数

![](https://attach.52pojie.cn/forum/202312/13/233652oe6yzck66y6c67ws.png)

跟踪一下看到 pto 所对应的`o`是`pt.re()`函数生成，里面有`i`和`C`两个参数，那么我先去找 i 和 C 这两个参数，看到 i 是`pt.genak()`生成，那么先跟踪这个函数

![](https://attach.52pojie.cn/forum/202312/13/233739xp1ibiapjdd8tlla.png)

能够看出来这个函数是生成一个随机字符串的，然后长度为 12，同时跳转跟踪一下可以得到`C`是`MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6dK2bq7H5xk8uySxE/fp\nH54yGIL8pwYE7IbF4pxBXG1QVla3MGjJc2Qp3VlFIXfAegjZPr68hqymDYcEHF80\nniGSW3PjJQnhKEqErtfSogDR2iSZg303oMSNHGkk9cfPkNfGU+9v/DYFKovZqwbS\n4J9UEwfHtw27CUi9hvMwGPW4XGK2kBYW5JiPsUG7pQ+zkwxwLndHnzfAezBriX6g\nSTEPQREWGVuboRXpiL94iOi5/hAl8muUnGiGbIcYHwvKz1kIbNe2KTIj8r/87bY2\njArs9DZDn+38+2MUHpT6o99jN9mkTWFeUSUhQsL09ruah2aDaj2flUW7hEcxCqfj\ntQIDAQAB`猜测应该是密钥

![](https://attach.52pojie.cn/forum/202312/13/233742smn3fu7en7kn88mm.png)

接下来跟踪`pt.re()`函数，其实这个函数就在刚才生成随机字符串的下面，这个函数的话看起来就有些难度，需要一定基础。它先是初始化一个密钥对象，规定了一下长度，然后检查传入的参数`t`是不是对象，然后用`m()`函数处理，接着如果传入的参数`e`存在则是将其设置为公钥，最后进行加密

![](https://attach.52pojie.cn/forum/202312/13/233745sreemz909e0qxlkk.png)

然而这里并不需要细扣 m 函数，我们在这里下一个断点，然后刷新页面，发现 t 在处理前后没有差别，所以在复刻的时候就不必管了

![](https://attach.52pojie.cn/forum/202312/13/233749id37i78y9yieg86e.png)

那么接下来就是看具体是什么算法了，刚才我们说到 e 被设置为公钥，其实有公钥而且常用的加密算法没几个，很容易就想到`RSA`算法了，这里的话我们调出控制台验证一下，利用断点得到的 t 进行调用加密函数，`dt.thisKeyPair.encrypt("CLoaz8Lornil")`，查看输出，发现输出每次都不一样，这里我们几乎就可以确定是 RSA 算法了，等待后期验证即可

![](https://attach.52pojie.cn/forum/202312/13/233752y3yanf2iy8ki62ni.png)

至此 pto 参数分析完毕，初步确定是一个 RSA 算法，具体留待后面验证

#### par 参数

回到 par 的生成地方，继续开始分析，看到`s = pt.secret(a, i)`，那么就是找`pt.secret()`以及它的两个参数`a`和`i`，刚才分析过了 i 就是 12 位的随机字符串，那么看 a，a 是`device_key`，字面意思就是设备号之类的，我猜测是不会变化的，于是接着下断点进行验证

![](https://attach.52pojie.cn/forum/202312/13/233756gsf927i9jxcx99zq.png)

下一个断点在退出这段程序之前就可以，这里我重复执行了两遍发现都没有变化，可以确定这是生成之后固定的，这样就不必去扣`x64hash128()`函数了（因为它是由这个函数生成的，实际上我去看了一下，是一个很复杂的混淆函数，很头疼）

![](https://attach.52pojie.cn/forum/202312/13/233759i5udlxflcrgll99n.png)

参数确定完了接下来找`pt.secret()`函数，搜索一下发现在刚才 re 函数的下面，这个函数看起来比较简单明了。它接受`t`、`e`、`n`三个参数

1. t：t 是对象的话进行预处理，此处和 pto 参数的预处理一样，实际上并无变化
2. e：e 进行`MD5`哈希，前 16 位做**AES 加密**的`iv偏移量`，后 16 位做 AES 加密的`密钥`
3. n：若输入存在 n 则是进行 AES 解密，不存在则是 AES 加密

![](https://attach.52pojie.cn/forum/202312/13/233815mbccfnancavpapqp.png)

至此 par 参数分析完毕，可以看到是 MD5+AES 算法生成

### 验证

既然分析完毕那么接下来就可以进行验证了，我选择的是 python，用了一下`Cryptodome`库，生成这两个参数之后其他的参数从 F12 的网络工具里面复制进来进行 request 请求即可，请求之后发现成功过验证（注意 pto 和 par 参数所用到的 12 位随机字符串必须是同一个，否则过不去验证，我在这里踩了一下坑，浪费了一些时间去重新看算法）

![](https://attach.52pojie.cn/forum/202312/13/233818ucbpj69ncrue7epe.png)

### 结语

总的来说这次扣算法还算是成功的，虽然说中间走了一些弯路，但好在结局是好的不是吗？小萌新的第一篇文章，如果有格式或者其他不对的地方，希望能够包容一下
