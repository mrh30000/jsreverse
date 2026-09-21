# 某网站wasm md5简单分析

> **作者**: 我是不会改名的 | **发布时间**: 2023-09-21 22:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10201 / 30
> **原文**: [https://www.52pojie.cn/thread-1836908-1-1.html](https://www.52pojie.cn/thread-1836908-1-1.html)

---

*本帖最后由 我是不会改名的 于 2023-9-21 22:52 编辑*

## 某网站wasm md5逆向分析

目标网站:aHR0cHM6Ly93d3cuaXFpeWkuY29tL3ZfMXIxb2JoanRpNTguaHRtbA==

目标参数：&vf=

### 一扣代码

下一个xhr断点

![image-20230921195350251](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/1.png)

往回找堆栈，发现核心部分在mmc里面，下个断点刷新跟进去

![image-20230921195535804](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/2.png)

传入参数就是链接去头去尾，返回字符串长32

![image-20230921195756858](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/3.png)

跟进去，看起来就一个简单的webpack

```
(window.iqiyiPlayerJSONPCallback = window.iqiyiPlayerJSONPCallback || []).push([[1], {
    1089: function(module, exports, __webpack_require__) {
    ...............
    },
    576: function(x, a, e) {
        var i;
        i = function(x, a, i) {
            var r = e(1089)
              , c = null;
            i.exports = {
                setEngine: function(x) {
                    c = x
                },
                mmcd: r.mmcd,
                mmc: function() {
                    var x = c && c.sbtr;
                    x && x.authkeyInvoking();
                    var a = r.mmc.apply(r, arguments);
                    return x && x.authkeyInvoked(),
                    a
                }
            }
        }
    }
}]);
```

关键函数就是1089里面的mmc，直接扣下来，因为没有依赖其他文件直接拿下来就行了，简单运行一下

![](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/4.png)

![image-20230921201011825](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/5.png)

结果就是不一样，说明很可能检测了环境，直接上v神插件

插件地址：<https://github.com/cilame/v_jstools>

![image-20230921201456141](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/6.png)

检测了一些简单的东西

![image-20230921203822118](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/7.png)

点击生成临时环境,复制到文件开头

![image-20230921205544375](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/8.png)

根据报错修改代码

![image-20230921205832957](https://attach.52pojie.cn//forum/202309/21/224727etp6gvl7t4eex7fx.png?l)

测试结果完全一致

![image-20230921205925238](https://attach.52pojie.cn//forum/202309/21/224725pbmb5qqq5bbn5uiu.png?l)

### 算法还原

首先是一个简单的ob混淆,随便找个开源的就能还原

![image-20230921210748008](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/9.png)

然后删除虚假分支，我用的蔡老板插件

![image-20230921211001515](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/10.png)

然后删除无用代码，找大妈

![image-20230921211253366](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/11.png)

从还原后的代码可以依稀看出来，是wasm,只不过并没有看到有wasm文件，它是直接编译成了asm.js

![image-20230921211950857](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/12.png)

通常最简单的命令是

emcc main.cpp -s WASM=1 -o main.js

要想不输出wasm,而是转成asm.js.把WASM=1 改成WASM=0

除此之外，它还将异步加载改为了同步-s WASM\_ASYNC\_COMPILATION=0;

如果是异步加载，直接运行会报错

最常见的报错就是

TypeError: Cannot read properties of undefined (reading 'apply')

主要原因就是，异步加载asm没有赋值，也就是c导出函数与js没完成交互

![image-20230921212923009](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/13.png)

既然是wasm,那么环境检测很可能不在wasm,而是在导入函数中，目前遇到的检测，有直接导入检测函数，有把eval导入，wasm里面存有部分检测代码，除此之外，由于go自带js的特殊性，给人一种感觉可以直接获取环境，实际上还是通过js交互的

目标网站就属于第一种导入函数

![image-20230921213618235](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/14.png)

导入了很多函数，一个个分析发现，只要au返回6就行

```
function aU() {
    return 6
}
```

![image-20230921214030777](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/15.png)

测试和网站一样，基本准备工作就完成了

返回值是32位很可能是md5，搜索一下关键字

![image-20230921214501425](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/16.png)

然后就没有然后了

![image-20230921214544155](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/17.png)

还原是不可能还原的，这辈子都不可能的

从初始化的值没看出有什么魔改，找一份标准的md5，有很明显的特征，16\*轮循环，把每次的case打印出来，简单画一个图

![image-20230921215718350](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/18.png)

把出现16次的打印一下

```
import numpy as np
from matplotlib import pyplot as plt
from collections import Counter
from t import data
counts = Counter(data)
valid_data_points = {key for key, value in counts.items() if value == 16}
filtered_data = np.array([point for point in data if point in valid_data_points])
plt.plot(filtered_data)
plt.show()
```

很明显有4次16轮循环

![image-20230921220005058](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/19.png)

```
101,80,25,-117,-98,96,88,17,
```

第一轮核心部分就这些

101

```
                        case 101: {
                                v = $x & ~Rx | Qx & Rx,
                                Ex = sa + -1 | 0,
                                s = 80,
                                Ex = Ex >> 2,
                                f = v,
                                ta = na,
                                v = (v + (Ux & -2) & -2 | Ux & 1) + (v & 1) | 0,
                                g = aa + ((ia | 0) % 16 | 0) | 0;
                            break
                        }
```

就对应着

(b & c) | ((~b) & d) 以及safe\_add(a, q)

```
                       case 80: {

                                s = sa + 32 | 0,
                                    s = (g | 0) > (s >> 2 | 0) ? 36 : 25;
                                break
                            }
                       case 25: {
                            s = (g | 0) > (Tx | 0) ? 136 : 139;
                            break
                        }
                       case -117: {
                                s = (g | 0) == (Tx | 0) ? 166 : 158;
                                break
                            }
                      case -98: {
                                s = (g | 0) > (Tx + 1 | 0) ? 83 : 96;}
                      case 96: {
                                s = 88,
                                    f = c[G + (g << 2) >> 2] | 0;
                                break
                            }
```

​

看起来没啥用

```
                        case 88: {
                            Ex = ca + (ia << 3) | 0,
                                g = f >> 1,
                                g = _i64Add(c[Ex >> 2] | 0, c[Ex + 4 >> 2] | 0, _bitshift64Shl(g | 0, ((g | 0) < 0) << 31 >> 31 | 0, 1) | 0, w() | 0) | 0,
                            w() | 0,
                                g = (f & 1) + g | 0,
                                Ex = (g + (v & -2) & -2 | v & 1) + (g & 1) | 0,
                                f = ((ia | 0) % 4 | 0) * 5 | 0,
                                ta = f + 7 | 0,
                                f = 25 - f | 0,
                                f = Ex << ta | (f ? Ex >>> f : Ex),
                                s = 17,
                                Vx = $x,
                                Fx = (f + (Rx & -2) & -2 | Rx & 1) + (f & 1) | 0,
                                _x = Rx,
                                xa = Qx,
                                ra = ia + 1 | 0,
                                ma = ka;
                            break
                        }
```

88就是最核心的了，看不懂不重要，其中f就是加密的数据，保存下来跑一下

![image-20230921220906655](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/20.png)

添加一个日志点，保存数据

![image-20230921221048019](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/21.png)

```
from Crypto.Util.number import long_to_bytes
d = [1935762479, 1819557736, ''']
datas = b""
for i in d:
    datas += long_to_bytes(i)[::-1]
print(datas)
```

去除填充转成字符串，随便找个在线网站试一下，很好说明只是加盐了，只是加的有一点点离谱

![](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/22.png)

### 总结

总的来说，相对还是不难，比某迅的vmp加wasm简单一点，环境监测有但不多，有混淆相当于没有(蔡老板yyds)，主要是控制流烦人，我这里取巧了，大佬们直接还原就行了

除此之外，app，TV端用的应该是同一套代码还原基本一致，trace代码，找到添加数据位置，拿出来就行了，只是TV端同一个src可能有

两个盐，主要是qd\_v不一样。
![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[bj.7z](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjY0NDcyM3w1NDE0NjMzZnwxNzkwMDAzNzczfDIzMjM3Mjd8MTgzNjkwOA%3D%3D)
*(1.3 MB, 下载次数: 222)*

![image-20230921222821587](https://s3.ananas.chaoxing.com/sv-w9/doc/fe/49/3f/d3d2adbe2e07e39463f95c2e0f57e9d3/thumb/23.png)
