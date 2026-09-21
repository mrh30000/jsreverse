# xx艺视频wasm转js分析，cmd5x算法脱离环境限制

> **作者**: 漁滒 | **发布时间**: 2021-11-23 11:16:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 16531 / 170
> **原文**: [https://www.52pojie.cn/thread-1549711-1-1.html](https://www.52pojie.cn/thread-1549711-1-1.html)

---

@[TOC](https://www.52pojie.cn/xx%E8%89%BA%E8%A7%86%E9%A2%91wasm%E8%BD%ACjs%E5%88%86%E6%9E%90%EF%BC%8Ccmd5x%E7%AE%97%E6%B3%95%E8%84%B1%E7%A6%BB%E7%8E%AF%E5%A2%83%E9%99%90%E5%88%B6)

### 1.js代码扣取

文献1：[XX视频H5解析分析过程](https://www.52pojie.cn/thread-792958-1-1.html)
文献2：[爱奇艺视频cmd5x解析算法的移植分析和实现<Nodejs>（2019-08）](https://www.52pojie.cn/thread-1013338-1-1.html)

本篇文章建立在上面两篇文章的前提下，所以部分已经提到过的内容，就不再重复叙述

首先直接过滤视频信息接口

![](https://attach.52pojie.cn/forum/202410/11/174549q0z9dc92hcq8bq59.jpg)

可以看到来自于pcweb.wonder.js，打开这个js

![](https://attach.52pojie.cn/forum/202410/11/174551m0kpe191m3x1xcpl.jpg)

搜索【vf=】，只有一个结果，在生成之前下一个断点，重新加载网页。断点断下后可以看到，【r】参数是由【cmd5x】方法的得到，参数就是视频url的一部分。

![](https://attach.52pojie.cn/forum/202410/11/174553eubfh8ls5ubrh1mn.jpg)

进入cmd5x方法后，可以看到这个是webpack打包的js，使用了里面的第295个方法。那先把这个js下载，然后扣出来本地先测试一下。

![](https://attach.52pojie.cn/forum/202410/11/174555ytkgtnntjaxxun40.jpg)

在一般的webpack前面还有一段其他的函数，先手动删除，然后用之前的一键扣webpack来测试一下

非常漂亮，没有报错，跑一下导出函数是否正常

可惜报错了，这里出现了document，那么直接上jsdom。

可以出结果了，难道就这么简单？经过测试发现，生成的值和浏览器的不一样，这就是被检测node环境了

### 2.ast反混淆，平坦流

不着急，接下来单独把295的整个函数体拿出来调试

可以看到一开始有一个大数组，明显的ob混淆特征，用ast先去掉这个混淆看看

![](https://attach.52pojie.cn/forum/202410/11/174557c7fmbhfw4a4w4c0c.jpg)

这时字符串都被还原回去了，但是还有很多了类似【"jxnRC" !== "fsFmd"】这样恒真或者恒假的代码，把这也处理一下

![](https://attach.52pojie.cn/forum/202410/11/174559kkahhhhk85wqz52h.jpg)

这时逻辑就更加清晰了，但是还有一些代码是在break或者return后面，是一定不会执行的废代码，也一起去掉吧

![](https://attach.52pojie.cn/forum/202410/11/174601dtegsovbbgmkb3km.jpg)

![](https://attach.52pojie.cn/forum/202410/11/174603uiflygqdb9luopgu.jpg)

这时分析就更加方便了

![](https://attach.52pojie.cn/forum/202410/11/174605jnvitm20as1jat5s.jpg)

通过上图可以确定，这个其实就是调用的wasm，但是网页并没有加载wasm文件，也没有把文件在写js中，哪里来的wasm呢？

实际上这个js是把wasm转换成了js，所有的逻辑都用js来完成

![](https://attach.52pojie.cn/forum/202410/11/174607dl0yu8e0611kxxqy.jpg)

通过fd替换js文件后可以发现，js调用【cmd5x】方法实际就是调用的是【g】方法，这里的【g】方法应该理解成一个js层的方法

下面就可以分析出这个方法内部的逻辑，这里需要一个wasm调用的基本知识

![](https://attach.52pojie.cn/forum/202410/11/174609umermxpga7r8cic4.jpg)

1.首先是计算参数url的长度
2.然后申请申请长度+1的内存空间（因为字符串是以字节0结尾的，需要把这个算上）
3.然后把参数url复制到内存，然后调用【f】方法计算，这里的【f】应该理解为wasm层的方法
4.计算完成后释放之前申请的参数url的内存
5.然后把cmd5x计算的结果从内存中读出来，最后把这个计算结果的内存也释放掉

这里的重点明显就是这个【f】的函数了

![](https://attach.52pojie.cn/forum/202410/11/174611vfjxr3i83r8arir8.jpg)

wasm层的cmd5x函数绑定的是【ca】这个函数

![](https://attach.52pojie.cn/forum/202410/11/174613kjev0y2sky2mdyvs.jpg)

但是【ca】函数这个控制流太恐怖了，有170+个case，直接分析明显是不明智的

### 3.脱离环境与调用

这里有一个点是，实际我们可以不分析这个【ca】函数，因为我们之前试过计算vf，是因为被检测了node的环境。但是wasm又无法直接操作BOM和DOM，如果wasm中要检测环境，这是一定要通过导入函数，才能进行检测的。所以，可以先分析一下调用到的所有导入函数。

![](https://attach.52pojie.cn/forum/202410/11/174615d9q3oqqp1ini4h2y.jpg)

这里的【bL】就是导入函数，就是参数的【b7】，也就是上面的【aI、L、M、aU、aV、aY、aX、aQ】

查看各个函数后发现，除了【aU】这个函数，其他都是非常短的，没有出现检测点

![](https://attach.52pojie.cn/forum/202410/11/174617v9t7qtz9q6q7qj8m.jpg)

【aU】这个函数非常长，还有控制流，并且存在明显的检测点，所以这时应该分析的是这个函数。首先还是尝试使用ast去除控制流。过程稍微有点长，就不详细叙述

![](https://attach.52pojie.cn/forum/202410/11/174619nx9wuy7761hdzrhn.jpg)

去除了控制流后，分析就简单很多，可以很明显的看出检测的地方。在我调试的时候，就发现了其中的秘密。我替换网页的js后发现，当环境检测正确时，这个函数的返回值必定是6，否则就会得出和浏览器不一致的结果。所以可以直接进行以下的修改

```
  function aU() {
    return 6;
  }
```

![](https://attach.52pojie.cn/forum/202410/11/174621ez060bke00oobh30.jpg)

此时再运行js可以发现，结果就和网页的一模一样了

js调用方法

```
const t = require('./295_decrypt');
const vf = t.cmd5x('/dash?tvid=114869400&bid=300&vid=eac5b7e5c7d6c471a6635725f0173fdc&src=01010031010000000000&vt=0&rs=1&uid=1626142844&ori=pcw&ps=0&k_uid=49c360579e9a7cf874d599de913c6bff&pt=0&d=0&s=&lid=&cf=&ct=&authKey=b66ff0001e1568368db1f0827830ffeb&k_tag=1&ost=0&ppt=0&dfp=a11d64e2e196534268a0b9ab3908bffd86cec25e335c3269344667023b08b60afe&locale=zh_cn&prio=%7B%22ff%22%3A%22f4v%22%2C%22code%22%3A2%7D&pck=4aT95ShhWNgoEXxVzhFwU28qb6fXgiMIWS7d3DjB1t2KBKGj8m1Npt3LUz3KQauw35i99&k_err_retries=0&up=&qd_v=2&tm=1637337797663&qdy=a&qds=0&k_ft1=706436220846084&k_ft4=1162183859249156&k_ft5=262145&bop=%7B%22version%22%3A%2210.0%22%2C%22dfp%22%3A%22a11d64e2e196534268a0b9ab3908bffd86cec25e335c3269344667023b08b60afe%22%7D&ut=1');

console.log(vf);
```

python调用方法

首先安装依赖库 pip install node\_vm2

```
def get_vf(url):
    from node_vm2 import NodeVM
    with open('295_decrypt.js', 'r', encoding='utf-8') as f:
        js = f.read()
    module = NodeVM.code(js)
    vf = module.call_member('cmd5x', url)
    print(vf)

if __name__ == '__main__':
    main()
```

移植并优化后的文件

<https://pan.lanzoui.com/i0DEiwstteh>

![](https://attach.52pojie.cn/forum/202410/11/174623l5o9lnscp7zzl4rp.jpg)
