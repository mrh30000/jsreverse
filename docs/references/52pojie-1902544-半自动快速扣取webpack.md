# 半自动快速扣取webpack

> **作者**: YIUA | **发布时间**: 2024-03-18 17:11:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5048 / 28
> **原文**: [https://www.52pojie.cn/thread-1902544-1-1.html](https://www.52pojie.cn/thread-1902544-1-1.html)

---

声明：本文只作学习研究，禁止用于非法用途，否则后果自负，如有侵权，请告知删除，谢谢！

目标网站：
aHR0cHM6Ly93d3cubWFvbWFvenUuY29tLyMvYnVpbGQ=
[md]声明：本文只作学习研究，禁止用于非法用途，否则后果自负，如有侵权，请告知删除，谢谢！

目标网站：
aHR0cHM6Ly93d3cubWFvbWFvenUuY29tLyMvYnVpbGQ=

![image-20240318162704904.png](https://img2.imgtp.com/2024/03/18/q8MPzb1x.png)

根据加密参数我们可以进行猜测该加密类型可能是RSA，我们可以尝试搜索publick，rsa，encrypt等关键词

![image-20240318163051915.png](https://img2.imgtp.com/2024/03/18/fJSAoD7h.png)

找到加密位置后，我们观察一下，可以明显发现该网站用了webpack，o=t(r), r=l(15)，接下来就该进入正题，如何快速半自动扣取webpack，节省我们小白的时间

首先在这两处下断点，然后刷新页面

![image-20240318163445925.png](https://img2.imgtp.com/2024/03/18/6PPJQ9iz.png)

![image-20240318163826389.png](https://img2.imgtp.com/2024/03/18/STQHM5nJ.png)

刷新后进入上一个堆栈，进入后把f中的缓存全部置空，置空后后面新增的模块就是r所需要的模块，然后跟着我设置一个xxx = {}

![image-20240318163952672.png](https://img2.imgtp.com/2024/03/18/FbBcEGKU.png)

然后在箭头所指的地方设置一个条件断点（如果不明白加false的原因，小白请了解一下逗号表达式）

xxx[c] = e[c],false

![image-20240318164237214.png](https://img2.imgtp.com/2024/03/18/ATuthDfB.png)

设置完后回到原来的堆栈，点击运行，这个时候控制台输出xxx可以看到r所用到的模块全部齐全了

![image-20240318164515798.png](https://img2.imgtp.com/2024/03/18/8gqtlx0V.png)

然后把下面的代码放到控制台运行

result='{';

for(let x of Object.keys(xxx)){result = result+'"'+x+'"'+':'+xxx[x]+','};

result+='}'

将得到的字符串复制，然后打开一个新的代码段，复制上去，去掉两边的引号就可以了，见下图

![image-20240318164804237.png](https://img2.imgtp.com/2024/03/18/m4dV3PIq.png)

![image-20240318165102686.png](https://img2.imgtp.com/2024/03/18/85hlJLIb.png)

![image-20240318165509323.png](https://img2.imgtp.com/2024/03/18/ufCCR0QS.png)

![image-20240318165539046.png](https://img2.imgtp.com/2024/03/18/AYlDRHn0.png)

可以看到成功了，我们扣取的不多不少刚刚好，本期到此为止，如有不对请及时纠正。

如果有不明白的，可以留言回复，我会一一解答。

![image-20240318162704904.png](https://img2.imgtp.com/2024/03/18/q8MPzb1x.png)

根据加密参数我们可以进行猜测该加密类型可能是RSA，我们可以尝试搜索publick，rsa，encrypt等关键词

![image-20240318163051915.png](https://img2.imgtp.com/2024/03/18/fJSAoD7h.png)

找到加密位置后，我们观察一下，可以明显发现该网站用了webpack，o=t(r), r=l(15)，接下来就该进入正题，如何快速半自动扣取webpack，节省我们小白的时间

首先在这两处下断点，然后刷新页面

![image-20240318163445925.png](https://img2.imgtp.com/2024/03/18/6PPJQ9iz.png)

![image-20240318163826389.png](https://img2.imgtp.com/2024/03/18/STQHM5nJ.png)

刷新后进入上一个堆栈，进入后把f中的缓存全部置空，置空后后面新增的模块就是r所需要的模块，然后跟着我设置一个xxx = {}

![image-20240318163952672.png](https://img2.imgtp.com/2024/03/18/FbBcEGKU.png)

然后在箭头所指的地方设置一个条件断点（如果不明白加false的原因，小白请了解一下逗号表达式）

xxx[c] = e[c],false

![image-20240318164237214.png](https://img2.imgtp.com/2024/03/18/ATuthDfB.png)

设置完后回到原来的堆栈，点击运行，这个时候控制台输出xxx可以看到r所用到的模块全部齐全了

![image-20240318164515798.png](https://img2.imgtp.com/2024/03/18/8gqtlx0V.png)

然后把下面的代码放到控制台运行

result='{';

for(let x of Object.keys(xxx)){result = result+'"'+x+'"'+':'+xxx[x]+','};

result+='}'

将得到的字符串复制，然后打开一个新的代码段，复制上去，去掉两边的引号就可以了，见下图

![image-20240318164804237.png](https://img2.imgtp.com/2024/03/18/m4dV3PIq.png)

![image-20240318165102686.png](https://img2.imgtp.com/2024/03/18/85hlJLIb.png)

![image-20240318165509323.png](https://img2.imgtp.com/2024/03/18/ufCCR0QS.png)

![image-20240318165539046.png](https://img2.imgtp.com/2024/03/18/AYlDRHn0.png)

可以看到成功了，我们扣取的不多不少刚刚好，本期到此为止，如有不对请及时纠正。

如果有不明白的，可以留言回复，我会一一解答。[/md]
