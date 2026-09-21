# 某音a_bogus详细分析-含50位数组生成过程

> **作者**: LiXieZengHui | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 4807 / 44
> **原文**: [https://www.52pojie.cn/thread-2092806-1-1.html](https://www.52pojie.cn/thread-2092806-1-1.html)

---

## 正式分析

## 目标

本地纯算生成a_bogus

## 定位a_bogus生成位置

### 接口

二级评论

![image](https://attach.52pojie.cn/forum/202602/23/195123e14bsssnba1kgkfb.png)

### XHR断点

![image](https://attach.52pojie.cn/forum/202602/23/195128pcxw1sdsbmowadc1.png)

### 跟栈

![image](https://attach.52pojie.cn/forum/202602/23/195136qf195u49fok8pfzu.png)

![image](https://attach.52pojie.cn/forum/202602/23/195125t313bzid3ixv13hr.png)

继续往下走发现形似jsvmp的代码，看起来像是在vmp的初始化

![image](https://attach.52pojie.cn/forum/202602/23/195052cqrcf2cwii2w9w3t.png)

继续往前找，在进入疑似vmp之前下一个断点，这里其实有个小技巧，因为这里是多个运算的必经之路，所以会多次断住，我们可以使用条件断点

```
this?._url?.includes("reply")
```

，如果

```
_url
```

中存在

```
reply
```

，我们再断住，这样可以极大降低逆向成本。

![image](https://attach.52pojie.cn/forum/202602/23/195054wui8r5msn000ff0g.png)

因此我们可以确定，

```
bdms.js
```

就是

```
a_bogus
```

生成的位置。

## VMP逆向

### 重要位置插桩

既然已经知道了是

```
jsvmp
```

，那么我们在低阶的情况下没有太多的选择，要么跟栈，要么就是分析日志，而跟栈太慢太痛苦，一般细碎的位置或者日志无法看出生成方式的位置我们再考虑通过跟栈分析。我们先从分析日志开始。

众所周知，

```
vmp
```

的函数调用基本上是通过

```
call
```

和

```
apply
```

来进行调用的，所以我们可以考虑给这两个位置打下日志点。而我们刚才分析的时候发现，离开bdms之前最后一个位置就是一个

```
apply
```

，所以我们自然给这个

```
apply
```

打下日志点。

```
"apply:::m=>",m,"func=>",n,"this=>",d,"args=>",e
```

![image](https://attach.52pojie.cn/forum/202602/23/195057o2efyzpzne622iy4.png)

3k+日志，完全可以接受，我们在

```
console
```

中分析也可以，导出分析也可以

### CustomBase64

因为这个

```
a_bogus
```

参数是作为URL查询参数，因此极有可能在最后会通过

```
append
```

追加到

```
URLSearchParams
```

因此我们全局搜索

```
a_bogus
```

这个参数，发现确实存在，而且出现了两次

![image](https://attach.52pojie.cn/forum/202602/23/195059wm6994mz09r6l02m.png)

第一次，函数是has

![image](https://attach.52pojie.cn/forum/202602/23/195101vswypooxwowo3owo.png)

第二次，函数是append

好，那么好，逻辑不言而喻，最开始先判定

```
URLSearchParams
```

中是否存在

```
a_bogus
```

参数，如果不存在就开始生成，最后通过

```
append
```

添加到

```
URLSearchParams
```

中。

那么我们倒着向上查找，我们看看这个a_bogus是如何生成的

append位置上方，我们发现了一个有趣的现象，出现了结构性运算，具体结构见图

![image](https://attach.52pojie.cn/forum/202602/23/195132cnj8jjz1lcx2jjjp.png)

这特么base64的特征简直不要太明显。。。

我们用AI生成一个支持自定义编码表的base64来校验一下

![image](https://attach.52pojie.cn/forum/202602/23/195140g9s9bzr2a4sgwwwb.png)

```

```

class CustomBase64:
def **init**(self, alphabet=None):

# 默认 Base64 编码表

self.standard_alphabet = (
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
)
self.alphabet = alphabet or self.standard_alphabet
if len(self.alphabet) != 64:
raise ValueError("编码表长度必须是64个字符！")

# 创建解码映射

self.decode_map = {c: i for i, c in enumerate(self.alphabet)}

def encode(self, data: bytes) -> str:
bits = 0
bits_len = 0
encoded = []

for b in data:
bits = (bits << 8) | b
bits_len += 8
while bits_len >= 6:
bits_len -= 6
index = (bits >> bits_len) & 0b111111
encoded.append(self.alphabet[index])
if bits_len > 0:

# 补齐最后的 bits

index = (bits << (6 - bits_len)) & 0b111111
encoded.append(self.alphabet[index])

# 补齐 "=" 到4的倍数

while len(encoded) % 4 != 0:
encoded.append("=")
return "".join(encoded)

def decode(self, s: str) -> bytes:
bits = 0
bits_len = 0
decoded = bytearray()

for c in s:
if c == "=":
break
if c not in self.decode_map:
raise ValueError(f"字符 {c} 不在编码表中")
bits = (bits << 6) | self.decode_map[c]
bits_len += 6
if bits_len >= 8:
bits_len -= 8
decoded.append((bits >> bits_len) & 0xFF)
return bytes(decoded)

if **name** == "**main**":
custom_alphabet = "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe"
b64 = CustomBase64(custom_alphabet)

text="pUu\n3¸ü#½£à;Ù«ÝDÈÌ“4íÚJb<ÝÑ,¢îøžˆÉ'¯wê)xYhœÂí‡mõ¡+ß²(º!ÝIoÁœAòÐT•ÖºJÃd1yV¤¼FF3\nùb¶iuîh §˜?õXx“þX&œJ©x\"÷°æb!??vÝHë0‹k˜/Ë:‹Yæ¢iôê.¹—'”".encode("latin1")
encoded = b64.encode(text)
print("编码结果:", encoded)
encoded = "DjsjD7X7dN/bed/tYCDa95FUv8EMrs8yaUTQRNrUyVnxaqebqYNssctHcxL5AhwYq8Bzi9H7YVFluxxcmU7sZ9ekqmhkSzk6wU5cVu0L81wITBJ2vN8QCvGxziTTUAGYmQAREMXRAsMCId5WVqCTAdBHu/4xmRDdMH-UV/ujx9KRBSucx7qoYoLXtk3OBPo1sGf="
decoded = b64.decode(encoded).decode("latin1")

print("解码结果:", decoded)

```

```

因为

```
base64
```

通过字节进行运算，一次编码十分重要，在js中使用

```
latin-1
```

编码能够确保每个字节都有一个对应的字符，即使不可见。

我们测试了一下，与结果一致，因此可知，

```
a_bogus
```

生成前经过一次魔改

```
base64
```

![image](https://attach.52pojie.cn/forum/202602/23/195134x9x96sbjs98cxxlc.png)

所以我们的思路就是

```
CustomBase64()⇒a_bogus
```

那么

```
base64
```

的输入是怎么来的呢？我们继续向上查找

### CustomRC4

![image](https://attach.52pojie.cn/forum/202602/23/195033uegqef1tx1xgngkq.png)

![image](https://attach.52pojie.cn/forum/202602/23/195035t602o98c2ac9jo9k.png)

![image](https://attach.52pojie.cn/forum/202602/23/195038dms4s40f0p0fftou.png)

我们统计了一下长毛O出现的次数，一共是256次，这个数组，额，就很灵性，不得不警惕一手啊。

再往上倒，我们看到结构性运算的输入出现在长毛O之前

![image](https://attach.52pojie.cn/forum/202602/23/195040sdbiqbtxk6zzlecv.png)

经验丰富的高手此时应该已经发现了，256循环，结构性运算中的对明文读取生成读取生成，这特么大概率是个RC4，流密码还有一个很明显的特征，输入与输出的长度相同，我们校验一下

![image](https://attach.52pojie.cn/forum/202602/23/195042xvqdnhjmhoz7okc3.png)

奇怪，长度并不相同，可能是哪里被魔改了。。。但是我们假装没有发现

这时候我们的日志就明显不够用了，这个长毛O256次不知道在干什么。。。

因此我们要获取更多的信息，我们需要给运算符添加日志点

```
`*=:::v[${p}]=>
```

,v[p]*E,

```
v[${p}]=>
```

,v[p],"E=>",E`

```

```

`-=:::v[${p}]=`,v[p]-E,`=>v[${p}]=`,v[p],"-E=>",E

```

```

![image](https://attach.52pojie.cn/forum/202602/23/195045vgb5gf5f5px4zlbj.png)

OK，那么也是生成了16K的日志，这时候导出或者搜索浏览器就扛不住了。。。

再次回到刚才的位置观察日志，我们看到了一些新线索

![image](https://attach.52pojie.cn/forum/202602/23/195047nbwb852gguz4urrw.png)

这个进入结构化运算的142位数组，是通过两个小数组拼接而成的

这里其实我们还漏掉了一些信息位，在vmp中，数组操作十分重要，其要扮演寄存器&栈，用于记录每一个操作完成之后的运算结果以及完成操作所需要的输入，因此我们还需要对数组相关操作打上日志点。我们针对创建数组、修改数组、读取数组增加日志点。

![image](https://attach.52pojie.cn/forum/202602/23/195049d5fs5q60s36s0tgs.png)

注意，这里也要添加日志点，这里是对v自身的数组进行修改，建议把相关的都打上

```

```

`Read:::v[${p+1}]=`,E,"v[]=>",v
`Push:::U[${x}]=`,v[p],"U[]=>",U
"创建数组:::长度=>",r,"内容=>",v.slice(p+1,p+r+1)
"创建数组:::长度=>",F,`v[${p-F-1}]=>`,v.slice(p,p+F)
"修改数组:::索引=>", T, "新值=>", E, "数组=>", v[p]

```

```

![image](https://attach.52pojie.cn/forum/202602/23/195009kjt6nvm517kuxl6m.png)

OK，我们获取了日志，那么长度已经是来到了恐怖的50K

额，实在是太尼玛多了，我们先关闭一些无关紧要的日志点，比如说读取数组，反正我们会输出整个栈的内容，读取就暂时先不关注了

![image](https://attach.52pojie.cn/forum/202602/23/195117geugcixug4qi1bxl.png)

OK，我们回到最初创建长毛O的位置，向上看发现一直在对一个arr_256进行修改，我们继续向上看，发现vmp创建了一个逆序的arr_256

![image](https://attach.52pojie.cn/forum/202602/23/195014uaqi8s23p8spqsrr.png)

OK，也就是说现在的思路变成了

```

```

arr_142
⬇️
arr_256
⬇️
256长毛O
⬇️
结构化运算
⬇️
魔改base64
⬇️
a_bogus

```

```

那么接下来我们分析一下对逆序arr_256进行了哪些修改，以及256次长毛O和结构化运算在做什么

#### arr_256

![image](https://attach.52pojie.cn/forum/202602/23/195017mljgeqy2jjqbzb7e.png)

![image](https://attach.52pojie.cn/forum/202602/23/195020c15yn07ll7px1r46.png)

OK，我们已经可以推导出来了

每一次结构化运算，都是在swap数组中的两个位置，归纳总结一下我们得到代码

![image](https://attach.52pojie.cn/forum/202602/23/195022lwbfhfubtfq5nh14.png)

![image](https://attach.52pojie.cn/forum/202602/23/195024mq7xm0zglezrydyh.png)

#### 第二个结构化操作

![image](https://attach.52pojie.cn/forum/202602/23/195027juapefe95ufr5u5c.png)

![image](https://attach.52pojie.cn/forum/202602/23/195030jkbvdrx4xe1pen0c.png)

OK，分析完毕，我们转换一下代码，变成一个完整的RC4加密

用数据测试一下

![image](https://attach.52pojie.cn/forum/202602/23/194954x0vjjlflswjjvow8.png)

OK，⬆️校验通过

在确定结果的时候我们发现了一个小细节

在进入魔改base64之前被拼接上去了一个数组

![image](https://attach.52pojie.cn/forum/202602/23/194957g5ylvw7l1lz11ssz.png)

OK，那么魔改RC4也是验证通过了，我们来整理一下思路

```

```

arr_144
RC4=>arr_144'
arr_4+arr_144'
base64
a_bogus

```

```

现在我们看一下这个四位数组哪里生成

### arr_4/base64_prefix

嗯，这个数组在上下问附近没有生成。。。

我们在日志中搜索一下

![image](https://attach.52pojie.cn/forum/202602/23/194959hqq3j22t22u3tq0o.png)

![image](https://attach.52pojie.cn/forum/202602/23/195001dzyyqukz4uqfa66q.png)

可以看到在上面别的地方生成，而且就是我们的目标，看一下生成过程

![image](https://attach.52pojie.cn/forum/202602/23/195004laqjwjmh9aqwhbad.png)

这里出现了随机数，我们可以尝试着注入一下，让rand失效，永远等于0.05，这样分析起来比较的方便

我们在console中注入

```

```

Math.random = function () {
return 0.05;
};

```

```

```

```

def gen_arr_4_base64_prefix():
a = int(random.random() *0xFFFF)
b = int(random.random()* 40)

res = [
(a & 0xAA) | (3 & 0x55),
(3 & 0xAA) | (a & 0x55),
(b & 0xAA) | (82 & 0x55),
(82 & 0xAA) | (b & 0x55),
]
return res

```

```

OK，Random注入后验证通过

![image](https://attach.52pojie.cn/forum/202602/23/195006p594zzi6iu6euj0j.png)

![image](https://attach.52pojie.cn/forum/202602/23/194938vjghd3xhx333x4kh.png)

目前思路如下

```

```

arr_144
RC4=>arr_144'
arr_4+arr_144'
base64
a_bogus

```

```

### arr_144

![image](https://attach.52pojie.cn/forum/202602/23/194940sxhrrxplch5cq75p.png)

可以看到这个数组并不是定长的，而是会发生改变的

```
arr_144
```

的是

```
arr_8
```

和

```
arr_133
```

拼接而成

我们可以看到上方就是arr_133和arr_8的赋值过程

![image](https://attach.52pojie.cn/forum/202602/23/194936wffgf5njv2iv7qnw.png)

#### arr_8

嗯，很抽象，特么的找不到。。。

目前的有效线索只有

![image](https://attach.52pojie.cn/forum/202602/23/194942rhsndfq0lnnshol9.png)

### arr_134

通过搜索部分数据

![image](https://attach.52pojie.cn/forum/202602/23/194945zaarea4a2uksaacu.png)

发现arr_134来自一个循环，这个循环每次生成4位数组，追加到一个数组中最后在拼接上几位数字，得到arr_134

![image](https://attach.52pojie.cn/forum/202602/23/194947jvhdxdvh401xdt4z.png)

![image](https://attach.52pojie.cn/forum/202602/23/194950xvkz8b6q10bybrbp.png)

![image](https://attach.52pojie.cn/forum/202602/23/194952ta4r0xhg5k2klhex.png)

嗯，分析了一下，这个循环来自于一个新的数组arr_100

通过arr_100每次取3个，然后生成四个，循环完成之后将100位中末尾没使用到的拼接到最后

思路如下

```

```

arr_136=func(arr_100)
arr_144=arr_8+arr_136
arr_144'=RC4(arr_144)
arr_4+arr_144'
base64
a_bogus

```

```

我们将结构化运算转换成代码

![image](https://attach.52pojie.cn/forum/202602/23/194920m5lxfzbb8u5pxp47.png)

![image](https://attach.52pojie.cn/forum/202602/23/194922tt7ngzqyaxx7qxmm.png)

OK，校验通过，我们接下来的思路就是查看这个arr_100是如何生成的

![image](https://attach.52pojie.cn/forum/202602/23/194925duuuspg0agf9p2hs.png)

OK，我们发现这个arr_100也是通过concat拼接而成

整理一下思路

```

```

arr_100=arr_50+arr_47+arr_2+arr_1
arr_136=func(arr_100)
arr_144=arr_8+arr_136
arr_144'=RC4(arr_144)
arr_4+arr_144'
base64
a_bogus

```

```

### arr_100

#### arr_1

![image](https://attach.52pojie.cn/forum/202602/23/194927wizbw0bskwyz7byi.png)

看到了一大堆异或，但是操作数不知道从何而来，暂时先放一下

#### arr_2

![image](https://attach.52pojie.cn/forum/202602/23/194929sw4ircb4ogg6r656.png)

我们发现这里获取了时间戳，看来我们有必要hook一下时间戳了

这里有一个小技巧，在这种可能多次获取时间戳的vmp中，最好不要让时间戳返回定值

我们可以每次调用时间戳就让其值+1或者+3

```

```

(function () {
let base = 1771655150000;
let current = base;

function nextTime() {
return current++;
}

// hook Date.now
Date.now = function () {
return nextTime();
};

// hook getTime
Date.prototype.getTime = function () {
return nextTime();
};

})();

```

```

![image](https://attach.52pojie.cn/forum/202602/23/194931paxqx5elpnllpblx.png)

目测没什么大问题，应该就是个比较普通的时间戳，转化成代码

![image](https://attach.52pojie.cn/forum/202602/23/194933z5wf7za12ma5vjwc.png)

校验通过，没问题

#### arr_47

这个值的生成比较简单，就是根据我们的电脑环境生成的

![image](https://attach.52pojie.cn/forum/202602/23/194904k8zk3yvn8v7k653o.png)

![image](https://attach.52pojie.cn/forum/202602/23/194906fm7fspfswqw15qaq.png)

看了一下，是根据我们当前的电脑屏幕参数以及平台型号ord得到的

```

```

["innerWidth","innerHeight","outerWidth","outerHeight","availWidth","availHeight","sizeWidth","sizeHeight","platform"]

```

```

转换为代码

好，整理一下思路

```

```

arr_100=arr_50+arr_47+arr_2+arr_1
arr_136=func(arr_100)
arr_144=arr_8+arr_136
arr_144'=RC4(arr_144)
arr_4+arr_144'
base64
a_bogus

```

```

目前我们欠缺的

```
arr_50
```

`arr_1

```
\
```

arr_8`

### arr_50

这个数组的生成方式是比较出其不意的，会者不难，难者不会

我们先用一般思路搜索一下

使用关键字搜索我们无法获取任何信息。。。

也是醉了，这个数组不知道是什么时候生成的

那么说明目前我们的信息还是有缺失

我们再观察，这个50位数组是出现在apply中的，apply运行结束之后会存储在v[p]中，那么是不是意味着我们可以窥探一下全局栈和当前的运行栈相关的数据？说不定什么时候这个arr_50就偷偷摸摸的生成了呢？

我们打开之前关闭的那些和数组操作的Read和Push，看看有什么有效信息

淦，打出来50K日志。。。

醉了，我们还是下几个条件断点吧，不然真的遭不住。。。

我们观察之前的日志

![image](https://attach.52pojie.cn/forum/202602/23/194908vd0wzsvk7dtyjisz.png)

可以发现，在concat之前，创建了一个长度为1的数组，对应最后arr_1，我们直接在这里断住即可

![image](https://attach.52pojie.cn/forum/202602/23/194910vxh46w1kx1j6phot.png)

他喵的，就是下完断点还是输出了20K。。。我们现在先不关注这个运算过程，我们先验证一下，这个arr_50究竟是不是这么生成的，因此我们目前就保留push、read、apply三个日志点，其他运算相关的都不需要

![image](https://attach.52pojie.cn/forum/202602/23/194913irbaz04ccbn0rceb.png)

我们直接搜索开头比较有代表性的数，171

![image](https://attach.52pojie.cn/forum/202602/23/194916a66jxpg63uevbkjj.png)

发现确实是存在的，这个171是通过读取U[56]被放入arr_50的

![image](https://attach.52pojie.cn/forum/202602/23/194918fi85l86d2uuo6nnu.png)

那么接下来思路就比较简单了，我们可以看看arr_50分别来自全局数组U的哪些位置

![image](https://attach.52pojie.cn/forum/202602/23/194849yfiryuifftffbiy2.png)

拷贝出来，不多不少，恰好50个，难怪我们最开始没有发现这个arr_50的生成逻辑，因为不涉及到计算，只涉及到数据读取

我们提取出取得的索引

```

```

U_index_unsorted = [34,44,56,61,73,29,70,45,35,49,38,66,51,68,28,48,64,47,30,71,26,55,31,69,59,40,62,63,27,72,41,74,57,52,42,39,33,67,53,43,65,46,36,24,60,32,79,80,84,85]

```

```

将其还原一下顺序

```

```

U_index_sorted = [24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 55, 56, 57, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 79, 80, 84, 85]

```

```

可以看到是分段生成的

24，26-36，38-53，55-57，59-74，79-80，84-85

那么这些值是怎么生成的呢？很简单，我们只需要放开运算日志点，然后给Push添加为条件日志断点，这样就能够指哪儿打哪儿了。

这里我们使用js中

```
,
```

会返回最后一个表达式的值的特性，构造

```
console.log(xxx),x==n
```

来输出

![image](https://attach.52pojie.cn/forum/202602/23/194852s9fqix44xmxmq91b.png)

像这里的24，这特么一看就是默认值，为什么？因为我们现在所有的运算日志都打开了，但是却没有任何涉及生成的日志，那么说明这个值就是定值，或者写在指令中的值，反正不是被计算出来的值，是可以被写死的值。

#### U26-36

我们接着看看U26-53的生成过程

![image](https://attach.52pojie.cn/forum/202602/23/194855yzjz8nx8dzy1j811.png)

可以看到是时间戳相关的操作，转换成代码

这里小提一嘴，因为我们现在是站在上帝视角看代码，所以我们知道一些隐情，

U27这个值其实并不是定值，我们跟栈发现这个值来自于opcode，但是是根据一些相关值比较大小，只能说反正这个值不是被计算出来的

#### U38-53

![image](https://attach.52pojie.cn/forum/202602/23/194857q3cnfu3iniy5nkck.png)

![image](https://attach.52pojie.cn/forum/202602/23/194901hj4jb333h4b1jmu4.png)

![image](https://attach.52pojie.cn/forum/202602/23/194839aictuotufee8ly5t.png)

U44来自U17，往上追溯十分混乱，暂时写死不做纠缠

![image](https://attach.52pojie.cn/forum/202602/23/194841qlov6w6gm7u7m767.png)

U48来自arr_32_1中的[9]

![image](https://attach.52pojie.cn/forum/202602/23/194844k6il1rgdcdtzwob3.png)

U49来自arr_32_1中的[18]

U50是固定值，为3

U51来自arr_32_1中的[3]

U52来自arr_32_1中的[10]

U53来自arr_32_1中的[19]

U54是固定值，为4

U56-59的值与arr_32_3相关

![image](https://attach.52pojie.cn/forum/202602/23/194846a3u2bhhkkbp35sq3.png)

#### U60-70通过时间戳计算得到

![image](https://attach.52pojie.cn/forum/202602/23/194812erll9i3mlmj3r55m.png)

#### U71-74通过appid计算得到

![image](https://attach.52pojie.cn/forum/202602/23/194818llaokn4y3e307q3z.png)

![image](https://attach.52pojie.cn/forum/202602/23/194820z7yeledieeuielr2.png)

#### U79-80

我们之前的screen_platform数组长度计算得到

![image](https://attach.52pojie.cn/forum/202602/23/194822g6k69d7t66bzafay.png)

#### U84-85

是我们之前生成的那个时间戳+

```
,
```

的数组的长度运算得到

![image](https://attach.52pojie.cn/forum/202602/23/194825cdokovkddwnlhhdk.png)

OK，接下来我们只需要通过将这些数据删除几个不需要的值，然后按照乱序U_index_unsorted排列就能够得到正确的arr_50

OK，我们来整理一下思路

```

```

arr_100=arr_50+arr_47+arr_2+arr_1
arr_136=func(arr_100)
arr_144=arr_8+arr_136
arr_144'=RC4(arr_144)
arr_4+arr_144'
base64
a_bogus

```

```

目前还缺少的是3个arr_32/arr_1/arr_8

### arr_1

我们观察一下arr_1的生成逻辑

![image](https://attach.52pojie.cn/forum/202602/23/194828zzmbyhynb044q9bx.png)

我们发现arr_1的生成最开始还是和arr_8有关联

![image](https://attach.52pojie.cn/forum/202602/23/194831iaialn2wnlflzkg2.png)

不过，基本的逻辑是没有问题的，我们可以直接写出代码

OK，我们接着研究一下这个arr_8

### arr_8

![image](https://attach.52pojie.cn/forum/202602/23/194834dca8uzla2z2i996d.png)

![image](https://attach.52pojie.cn/forum/202602/23/194837t4z4neb1qjkjqmkk.png)

还涉及到了随机数，不过没什么好分析的，对着日志都能转化成代码

至此，我们现在还剩下三个32位没有找到，其他都能够正常生成了

我们来看一下这3个32位数组是如何生成的

分析日志，我们可以看到大量的32位数组在这里生成

```

```

bdms_1.0.1.19_fix.js:2 +=:::v[2]= device_platform=webapp&aid=6383&channel=channel_pc_web&item_id=7602288425055669519&comment_id=7602444990388192049&cut_version=1&cursor=0&count=3&item_type=0&update_version_code=170400&pc_client_type=1&pc_libra_divert=Mac&support_h265=1&support_dash=1&cpu_core_num=10&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1920&screen_height=1080&browser_language=zh-CN&browser_platform=MacIntel&browser_name=Chrome&browser_version=145.0.0.0&browser_online=true&engine_name=Blink&engine_version=145.0.0.0&os_name=Mac+OS&os_version=10.15.7&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7592450952608892435&uifid=4a6f79d53a9eb34097631580ea9ea3ff3a17eaf36e45654c72ea19224fc01912e013cfb0c3a2b22d7c2196ecc85a84a07fef4059238cac2b54acb69c5a9bc6b5f677b0af15337f0aa4eccdcc74f194e11508b23ec0a02fd0da51c42fac539581c1091bca24fb1f85e74a080d3d8e07bf7c088eab6ad1ec2e605a4fe6865ac5ad9439b87633673ffe8fcf38a8495cfb3c4caca77f3cce98ddb1ce175918c9e016&msToken=dXe0jnNzu431nXFqwMl1tf0TENOS39jD0PyUCG3gEYF5UeKLZj8ZF1RDkMXUAlQkZdgHWUiCjfYGRuSi6dXNrcc4Ut_8Z3wc2itPGK3L5q4G30UFaxOihBGzUsdbIyRJ6Ge2gN5EHUt2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3Ddhzx =>v[2]= device_platform=webapp&aid=6383&channel=channel_pc_web&item_id=7602288425055669519&comment_id=7602444990388192049&cut_version=1&cursor=0&count=3&item_type=0&update_version_code=170400&pc_client_type=1&pc_libra_divert=Mac&support_h265=1&support_dash=1&cpu_core_num=10&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1920&screen_height=1080&browser_language=zh-CN&browser_platform=MacIntel&browser_name=Chrome&browser_version=145.0.0.0&browser_online=true&engine_name=Blink&engine_version=145.0.0.0&os_name=Mac+OS&os_version=10.15.7&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7592450952608892435&uifid=4a6f79d53a9eb34097631580ea9ea3ff3a17eaf36e45654c72ea19224fc01912e013cfb0c3a2b22d7c2196ecc85a84a07fef4059238cac2b54acb69c5a9bc6b5f677b0af15337f0aa4eccdcc74f194e11508b23ec0a02fd0da51c42fac539581c1091bca24fb1f85e74a080d3d8e07bf7c088eab6ad1ec2e605a4fe6865ac5ad9439b87633673ffe8fcf38a8495cfb3c4caca77f3cce98ddb1ce175918c9e016&msToken=dXe0jnNzu431nXFqwMl1tf0TENOS39jD0PyUCG3gEYF5UeKLZj8ZF1RDkMXUAlQkZdgHWUiCjfYGRuSi6dXNrcc4Ut_8Z3wc2itPGK3L5q4G30UFaxOihBGzUsdbIyRJ6Ge2gN5EHUt2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D +E=> dhzx
bdms_1.0.1.19_fix.js:2 apply:::m= (32) [163, 158, 245, 87, 46, 98, 78, 25, 40, 119, 92, 38, 252, 10, 52, 75, 152, 156, 25, 73, 23, 88, 155, 195, 95, 36, 214, 144, 190, 140, 153, 165] func=> ƒ (t,r){t&&(this.reset(),this.write(t)),this._fill();for(var e=0;e<this.chunk.length;e+=64)this._compress(this.chunk.slice(e,e+64));var n,o,i,u=null;if("hex"==r){u="";for(e=0;e<8;e++)u+=(n=this.reg[e].… this=> t {reg: Array(8), chunk: Array(0), size: 0} args=> ['device_platform=webapp&aid=6383&channel=channel_pc…Nn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3Ddhzx']
bdms_1.0.1.19_fix.js:2 Push to stack:::U[18]=v[0] (32) [163, 158, 245, 87, 46, 98, 78, 25, 40, 119, 92, 38, 252, 10, 52, 75, 152, 156, 25, 73, 23, 88, 155, 195, 95, 36, 214, 144, 190, 140, 153, 165] U[]=> (18) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[0]=U[15]= t {reg: Array(8), chunk: Array(0), size: 0} U (19) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[2]=U[18]= (32) [163, 158, 245, 87, 46, 98, 78, 25, 40, 119, 92, 38, 252, 10, 52, 75, 152, 156, 25, 73, 23, 88, 155, 195, 95, 36, 214, 144, 190, 140, 153, 165] U (19) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32)]
bdms_1.0.1.19_fix.js:2 apply:::m= (32) [102, 195, 180, 216, 25, 217, 144, 125, 153, 232, 46, 222, 38, 67, 83, 224, 83, 235, 13, 208, 92, 128, 111, 204, 74, 132, 210, 246, 75, 91, 63, 129] func=> ƒ (t,r){t&&(this.reset(),this.write(t)),this._fill();for(var e=0;e<this.chunk.length;e+=64)this._compress(this.chunk.slice(e,e+64));var n,o,i,u=null;if("hex"==r){u="";for(e=0;e<8;e++)u+=(n=this.reg[e].… this=> t {reg: Array(8), chunk: Array(0), size: 0} args=> [Array(32)]
bdms_1.0.1.19_fix.js:2 Push to stack:::U[18]=v[0] (32) [102, 195, 180, 216, 25, 217, 144, 125, 153, 232, 46, 222, 38, 67, 83, 224, 83, 235, 13, 208, 92, 128, 111, 204, 74, 132, 210, 246, 75, 91, 63, 129] U[]=> (19) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[0]=U[15]= t {reg: Array(8), chunk: Array(0), size: 0} U (19) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[2]=U[6]=  U (19) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[3]=U[2]= dhzx U (22) [{…}, {…}, 'dhzx', 1771662511330, 54, {…}, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ]
bdms_1.0.1.19_fix.js:2 +=:::v[2]= dhzx =>v[2]=  +E=> dhzx
bdms_1.0.1.19_fix.js:2 apply:::m= (32) [84, 5, 129, 131, 8, 127, 140, 225, 135, 212, 38, 248, 177, 176, 15, 84, 78, 171, 200, 27, 25, 238, 131, 165, 32, 44, 187, 129, 18, 123, 129, 190] func=> ƒ (t,r){t&&(this.reset(),this.write(t)),this._fill();for(var e=0;e<this.chunk.length;e+=64)this._compress(this.chunk.slice(e,e+64));var n,o,i,u=null;if("hex"==r){u="";for(e=0;e<8;e++)u+=(n=this.reg[e].… this=> t {reg: Array(8), chunk: Array(0), size: 0} args=> ['dhzx']
bdms_1.0.1.19_fix.js:2 Push to stack:::U[19]=v[0] (32) [84, 5, 129, 131, 8, 127, 140, 225, 135, 212, 38, 248, 177, 176, 15, 84, 78, 171, 200, 27, 25, 238, 131, 165, 32, 44, 187, 129, 18, 123, 129, 190] U[]=> (19) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[0]=U[15]= t {reg: Array(8), chunk: Array(0), size: 0} U (20) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32), Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[2]=U[19]= (32) [84, 5, 129, 131, 8, 127, 140, 225, 135, 212, 38, 248, 177, 176, 15, 84, 78, 171, 200, 27, 25, 238, 131, 165, 32, 44, 187, 129, 18, 123, 129, 190] U (20) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32), Array(32)]
bdms_1.0.1.19_fix.js:2 apply:::m= (32) [64, 253, 156, 240, 44, 96, 159, 150, 27, 122, 82, 52, 197, 120, 234, 119, 245, 89, 71, 177, 99, 98, 28, 142, 5, 99, 123, 199, 176, 9, 152, 240] func=> ƒ (t,r){t&&(this.reset(),this.write(t)),this._fill();for(var e=0;e<this.chunk.length;e+=64)this._compress(this.chunk.slice(e,e+64));var n,o,i,u=null;if("hex"==r){u="";for(e=0;e<8;e++)u+=(n=this.reg[e].… this=> t {reg: Array(8), chunk: Array(0), size: 0} args=> [Array(32)]
bdms_1.0.1.19_fix.js:2 Push to stack:::U[19]=v[0] (32) [64, 253, 156, 240, 44, 96, 159, 150, 27, 122, 82, 52, 197, 120, 234, 119, 245, 89, 71, 177, 99, 98, 28, 142, 5, 99, 123, 199, 176, 9, 152, 240] U[]=> (20) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32), Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[1]=U[14]= ƒ (){return X(e,this,arguments,r)} U (22) [{…}, {…}, 'dhzx', 1771662511330, 54, {…}, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ, ƒ]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[2]=U[16]= 1 U (20) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32), Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[3]=U[17]= 0 U (20) [Array(22), {…}, 1, 0, 8, 'device_platform=webapp&aid=6383&channel=channel_pc…Ut2uNn0n0tZXhgYa-vhaR4RywUc_evB652IKnRLLkdc0tA%3D', '', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', 6241, 6383, '1.0.1.19-fix.01', 空白, 3, {…}, 1771662511336, t, 1, 0, Array(32), Array(32)]
bdms_1.0.1.19_fix.js:2 Read from stack:::v[0]=U[4]= Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 U (5) [Array(22), {…}, 1, 0, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36']
bdms_1.0.1.19_fix.js:2 apply:::m= Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 func=> ƒ trim() { [native code] } this=> Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 args=> []

```

```

我们可以看到第一行，这里是我们的URI最后追加了一个dhzx

然后接下来一个apply就产生了一个32位数组，这里我们可以直接点击然后跳转过去

直接扣代码用即可，或者询问AI，得知这里是sm3，这样就完成了。

当然这几个32位的数组之间也有RC4还有一个base64，分析过程与上述类似，故而不再赘述！
