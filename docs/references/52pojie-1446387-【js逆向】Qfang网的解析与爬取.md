# 【js逆向】Qfang网的解析与爬取

> **作者**: helian147 | **发布时间**: 2021-05-24 16:25:00 | **版块**: 『编程语言区』 | **查看/回复**: 7531 / 13
> **原文**: [https://www.52pojie.cn/thread-1446387-1-1.html](https://www.52pojie.cn/thread-1446387-1-1.html)

---

*本帖最后由 helian147 于 2021-5-24 17:13 编辑*

一、链接的请求逻辑

先用F12进入浏览器控制台看看，直接被debugger糊一脸。还是Fiddler来试试，不能这也不行吧。

看前几个请求，在第三个请求发现了返回的网页数据，往上回溯：

第一个get请求的response返回set-cookie、且返回一个js文件；
第二个get请求为302重定向，URL带参数，response返回新的set-cookie；
第三个get请求，返回HTML内容。

显然，解析js文件，获得第二个请求的URL参数是关键。
各个请求的headers, cookie可以通过requests.Session来保持、传递。

![](https://attach.52pojie.cn/forum/202105/24/162750j5ibz58uie3inuv2.png)

![](https://attach.52pojie.cn/forum/202105/24/162746tl0fseaeflfllltf.png)

![](https://attach.52pojie.cn/forum/202105/24/162754jd0vc0zqkaqhe0ep.png)

二、js逆向
分析js文件的目的就是获得第二个get请求的URL参数生成逻辑。
【'jsjiami.com.v6'   这是js文件直接提示的加密版本号】

从前面第一步获得js文件保存，格式化，是ob混淆后的一堆s山，要分析出参数生成逻辑不得头秃？
1、先清除浏览器cookie、缓存等数据，进浏览器控制台，有无限debugger挡着，Deactivate Breakpoints先统统禁止掉，此时页面已加载完毕。
debugger被禁止了，自己也没法用插件下debugger了，只能手撕了：

二分法，将各个明显的function都打下断点，然后逐步迫近。首先得下断点在无限debugger之前，多打几个断点，不要钱的。
重新加载页面，被第一个断点断下。
之后，被断下，跳转到\_0x305110，执行完，返回；
再次进入\_0x305110，执行其内的\_x7fc51d(0x0)，再次返回；
再次进入\_0x305110，执行其内的\_x7fc51d()，然后就是无限debugger。

查看884行附近if-else语句，不仅有\_x7fc51d(0x0)，还有一句\_x7fc51d(‘0’)语句未被执行到，这可能是正常运行时的语句。
这个‘0’是哪里赋值的，只要向\_x7fc51d输入参数‘0’，就可让其去想去的地方，而不是无限debugger卡着。
\_0x459edd，很明显，而\_0x459edd就在if语句上头呢： \_0x459edd = f \_0x7fc51d(\_0x3cff02)
验证一下：
console控制台直接输入 \_0x3cff02，获得其值正是整数0
console控制台将其值修改为‘0’字符，输入 \_0x3cff02 = ‘0’
然后让断点下一步，来到新地方，接着直接跳出第二个get请求。

![](https://attach.52pojie.cn/forum/202105/24/163419cabhuvk34khh33sv.png)

![](https://attach.52pojie.cn/forum/202105/24/163421gffba2ia646hbr61.png)

![](https://attach.52pojie.cn/forum/202105/24/163423py399otce533jc50.png)

![](https://attach.52pojie.cn/forum/202105/24/163426l5gydldlf8y1yqzy.png)

2、很明显了，重新来过：
先在上一步跳转的附近多下几个断点；
清除浏览器cookie、缓存，重新加载页面；
为避免反复被debugger，在try语句附近查看\_0x3cff02值，为整数0，直接修改赋值为字符‘0’；
1023行附近，\_0x21f02d变量生成了URL参数，目的达到。

![](https://attach.52pojie.cn/forum/202105/24/163630jk22zkqakqggqgcr.png)

3、回溯\_0x21f02d变量的生成过程
直接往上回溯即可，有两个坑：

var  \_0x14e579 , var \_0x351708   这个2个变量，每次get获得js文件中的值都不同；

![](https://attach.52pojie.cn/forum/202105/24/163649szwm3ekgogyypnww.png)

var \_0x4ce3 变量存储了大量变量和函数，一般js逆向时，找到参数的生成过程后，直接扒拉下来相关的js代码，运行即可，包括node，浏览器等都可以运行js代码，这个\_0x4ce3扒下来后运行直接是node崩溃、浏览器控制台崩溃，吐血......  替换掉\_0x4ce3[]对应的值。

[JavaScript] *纯文本查看*

```
function _0xcff1b8(_0x358fd9) {
    var _0x179d92 = {
        'TXsUM': function (_0x2383e2, _0x1de425) {
            return _0x2383e2(_0x1de425);
        },
        'HQeHK': "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        'ZUcpH': function (_0x248b52, _0x5ed497) {
            return _0x248b52 < _0x5ed497;
        },
        'FbBTx': function (_0x36946b, _0x3a2f11) {
            return _0x36946b & _0x3a2f11;
        },
        'jhkwT': function (_0x4e9119, _0xa070d6) {
            return _0x4e9119 == _0xa070d6;
        },
        'WJmPx': function (_0x51583c, _0x5367ea) {
            return _0x51583c !== _0x5367ea;
        },
        'NiLhy': "BVUeB",
        'FjkCX': function (_0x3ddcc5, _0x2b6867) {
            return _0x3ddcc5 >> _0x2b6867;
        },
        'mBHDt': function (_0x2a91d8, _0x228d4f) {
            return _0x2a91d8 << _0x228d4f;
        },
        'aCQPW': function (_0x1306f3, _0x598fc9) {
            return _0x1306f3 & _0x598fc9;
        },
        'Walbv': function (_0x793957, _0x39b61b) {
            return _0x793957 >> _0x39b61b;
        },
        'NWBHv': function (_0x4586db, _0x3a8868) {
            return _0x4586db | _0x3a8868;
        },
        'fBZaG': function (_0x68d10e, _0x3db0c3) {
            return _0x68d10e >> _0x3db0c3;
        },
        'pOsdD': function (_0x1d641f, _0x4f2573) {
            return _0x1d641f & _0x4f2573;
        },
        'atQDi': function (_0x1b239c, _0x21e5f5) {
            return _0x1b239c | _0x21e5f5;
        },
        'WtLrH': function (_0x31fc35, _0x3b7945) {
            return _0x31fc35 << _0x3b7945;
        },
        'pyPRI': function (_0x328d78, _0x36b47f) {
            return _0x328d78 >> _0x36b47f;
        },
        'LVufl': function (_0x1bdb11, _0x337636) {
            return _0x1bdb11 << _0x337636;
        },
        'NNOIu': function (_0x4d3d01, _0x17a933) {
            return _0x4d3d01 & _0x17a933;
        },
        'OIfGa': function (_0xf3dd18, _0x7f485e) {
            return _0xf3dd18 & _0x7f485e;
        }
    };
    var _0xfed051 = _0x179d92['HQeHK'];
    var _0x2139d5 = _0x358fd9["length"]; // _0x4ce3
    var _0x10071f = '';
    for (var _0x23e584 = 0x0; _0x179d92['ZUcpH'](_0x23e584, _0x2139d5); ) {
        var _0x2fa93b = _0x179d92['FbBTx'](_0x358fd9["charCodeAt"](_0x23e584++), 0xff);
        if (_0x179d92["jhkwT"](_0x23e584, _0x2139d5)) {
            if (_0x179d92["WJmPx"](_0x179d92["NiLhy"], _0x179d92["NiLhy"])) {
                _0x179d92["TXsUM"](result, '0');
            } else {
                _0x10071f += _0xfed051["charAt"](_0x179d92["FjkCX"](_0x2fa93b, 0x2));
                _0x10071f += _0xfed051["charAt"](_0x179d92["mBHDt"](_0x179d92["aCQPW"](_0x2fa93b, 0x3), 0x4));
                _0x10071f += '==';
                break;
            }
        }
        var _0x3a4809 = _0x358fd9["charCodeAt"](_0x23e584++);
        if (_0x179d92["jhkwT"](_0x23e584, _0x2139d5)) {
            _0x10071f += _0xfed051["charAt"](_0x179d92["Walbv"](_0x2fa93b, 0x2));
            _0x10071f += _0xfed051["charAt"](_0x179d92["NWBHv"](_0x179d92["mBHDt"](_0x179d92["aCQPW"](_0x2fa93b, 0x3), 0x4), _0x179d92["fBZaG"](_0x179d92["aCQPW"](_0x3a4809, 0xf0), 0x4)));
            _0x10071f += _0xfed051["charAt"](_0x179d92["mBHDt"](_0x179d92["pOsdD"](_0x3a4809, 0xf), 0x2));
            _0x10071f += '=';
            break;
        }
        var _0x3e2d13 = _0x358fd9["charCodeAt"](_0x23e584++);
        _0x10071f += _0xfed051["charAt"](_0x179d92["fBZaG"](_0x2fa93b, 0x2));
        _0x10071f += _0xfed051["charAt"](_0x179d92["atQDi"](_0x179d92["WtLrH"](_0x179d92["pOsdD"](_0x2fa93b, 0x3), 0x4), _0x179d92["pyPRI"](_0x179d92["pOsdD"](_0x3a4809, 0xf0), 0x4)));
        _0x10071f += _0xfed051["charAt"](_0x179d92["atQDi"](_0x179d92["LVufl"](_0x179d92["NNOIu"](_0x3a4809, 0xf), 0x2), _0x179d92["pyPRI"](_0x179d92["NNOIu"](_0x3e2d13, 0xc0), 0x6)));
        _0x10071f += _0xfed051["charAt"](_0x179d92["OIfGa"](_0x3e2d13, 0x3f));
    }
    return _0x10071f;
}

var args = process.argv.splice(2);
console.log(_0xcff1b8(args[0]));
```

三、python爬取数据
解析后，python代码就好办了。

[Python] *纯文本查看*

```
import requests
from lxml import etree
import time
import re
from subprocess import check_output

headers = {
    "User-Agent":'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Host':'shenzhen.qfang.com',
    'Connection': 'keep-alive'
    }

def c_0x25d6be(a, b):
    j = 0
    for i in range(0, len(a)):
        j += ord(a[i])
    j *= int(b)
    j += 0x1b207
    str_wzws = "WZWS_CONFIRM_PREFIX_LABEL" + str(j)
    print(str_wzws)
    return str_wzws

# 由于有302重定向，以Session保持、传递response的set-cookie
s = requests.Session()

# 第一次get请求：js文件中的2个变量值提取、计算得出第二次get的url参数
url = 'https://shenzhen.qfang.com/sale'
rsp_1 = s.get(url=url, headers=headers)

rsp_1_0x14e579 = re.findall(r"_0x14e579='(.*?)';" ,rsp_1.text)[0]
rps_1_0x351708 = re.findall(r"_0x351708='(.*?)';" ,rsp_1.text)[0]
str_wzws = c_0x25d6be(rsp_1_0x14e579, rps_1_0x351708)

# process模块的check_output, 以命令行运行node
js_open = check_output(['node', r'd:\new-3.js', str_wzws], timeout=100)
url_path = js_open.decode('utf8').strip()
print(url_path)
time.sleep(1)

# 第二次get请求：
headers.update({'Referer':'https://shenzhen.qfang.com/sale'})

url_2 = 'https://shenzhen.qfang.com/WZWSREL3NhbGU=?wzwschallenge={0}'.format(url_path)
rsp_2 = s.get(url=url_2, headers=headers)
time.sleep(1)

# 第三次get请求：解析response获得数据
rsp_3 = s.get(url=url, headers=headers)
selector = etree.HTML(rsp_3.text)
x = selector.xpath('/html/body/div[4]/div/div[1]/div[4]/ul/li[1]/div[2]/div[1]/a/text()')
print(x)
```

![](https://attach.52pojie.cn/forum/202105/24/163707t77a9ir7i4r7cuam.png)
