# 某q音乐jsvmp浅析

> **作者**: 中二 | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 4014 / 81
> **原文**: [https://www.52pojie.cn/thread-2123850-1-1.html](https://www.52pojie.cn/thread-2123850-1-1.html)

---

## 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

## 前言

网址：aHR0cHM6Ly95LnFxLmNvbS8=

前段时间一直在研究风控问题，发现某些站检测点真的是三天一小改，五天一大改，算法几乎都是不变的，每次更新加环境or更环境都很头大，所以也是开始学习一手jsvmp插桩，虽然说现在都是ai梭哈，大力出奇迹，但是秉着知其然知其所以然还是得打牢基础。记录一下做个总结，方便后续复习。

## 正文

### AST插桩

在源码里面搜索，总共搜索到12个call，需要在解释器内部关键位置CALL指令处理分支植入日志探针，一开始是直接学的手动插桩，后面看了几集教程视频，看了几篇文章，还是决定使用ast来写吧，确实省时省力啊！

![image](https://attach.52pojie.cn/forum/202608/19/234054qec4a2y5455yn590.png)

分析代码，其实很明了，直接抓普通赋值语句右边调用了

```
.call()
```

方法的所有节点

![image](https://attach.52pojie.cn/forum/202608/19/234353i7c3lalr2zb7ggkr.png)

也是匹配到了所有的call函数调用节点

```

```

const fs = require('fs');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const code = fs.readFileSync('./main.js', 'utf8');
const ast = parse(code, { sourceType: 'module' });
let count = 0;
traverse(ast, {
AssignmentExpression(path) {
const node = path.node;
if (
node.operator === '=' &&
node.right.type === 'CallExpression' &&
node.right.callee.type === 'MemberExpression' &&
node.right.callee.property.type === 'Identifier' &&
node.right.callee.property.name === 'call'
) {
count++;
console.log(path.toString());
}
}
});
console.log('\n匹配总数：', count);

```

```

![image](https://attach.52pojie.cn/forum/202608/19/234444smbpbskilm3kvfph.png)

提取三要素（AST 节点，不是字符串）

```

```

const call = node.right;
const calleeObject = call.callee.object; // Y 也就是被调用函数 fn
const originalArgs = call.arguments;     // .call( thisArg, arg1, arg2 )
const thisArg = originalArgs[0];         // call第一个参数就是this
const argsArray = t.arrayExpression(originalArgs.slice(1).map(clone)); // 后面全部参数打包数组

```

```

有些大佬的思路就是直接console.log(func、this、args、result),但是我为了方便后续日志导出本地分析，我就是使用了固定函数模板，下次也可以继续复用的，遇到更加复杂点的还是得优化！

call_hook函数：

```

```

// Call Hook
function hookCall(func, thisArg, args) {
const result = func.call(thisArg, ...args);
log("Call", {
fn: func.name || "anonymous",
thisArg: thisArg,
args: args,
result: result
});
return result;
}

```

```

![image](https://attach.52pojie.cn/forum/202608/19/234502rinfn2rg3wgvn7vr.png)

call_op函数:

```

```

// Op Hook
function hookOp(op, left, right) {
var result;
if (right === null) {
result = new Function("a", "return " + op + "(a)")(left);
} else {
result = new Function("a", "b", "return a " + op + " b")(left, right);
}
log("Op", op + " | " + left + " | " + right + " | " + result);
return result;
}

```

```

运算符我也是用的比较粗暴的，可能也是没有系统化学过ast的原因吧，东学点西学点的原因哈哈哈，直接就是只保留赋值表达式并且该赋值二元表达式的 left、right同时都是MemberExpression。

![image](https://attach.52pojie.cn/forum/202608/19/234515pu959uv9y4yn6ycp.png)

![image](https://attach.52pojie.cn/forum/202608/19/234528t5pgsbohlptvsqhp.png)

搜索发现没有&&/ ||，取到所有的节点之后替换成使用模版函数

```

```

// Op 插桩: h[n[++p]] = h[n[++p]] >= h[n[++p]]
if (isBinaryOpAssignment(node)) {
const bin = node.right;
node.right = t.callExpression(t.identifier("hookOp"), [
t.stringLiteral(bin.operator),
bin.left,
bin.right
]);
opCount++;
}

```

```

剩余模版代码

```

```

// 日志收集
window.**LOGS** = [];
function log(type, data) {
let strData;
try {
strData = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
} catch (e) {
strData = "stringify_err:" + e.message + " raw:" + data;
}
var entry = "[" + type + "] " + strData;
console.log(entry);
window.**LOGS**.push(entry);
}
//hookCall
//hookOp
// 导出日志
function saveLogs() {
console.log(JSON.stringify(window.**LOGS**, null, 2));
}

```

```

ast 总共就是这么写，写的有点low了 ，一份固定模板读取添加到ast之后的上面，对函数调用指令跟算术运算指令做了个插桩，后续练习其他项目的时候再慢慢优化模版吧

#### 调试总结

这次主要分析的就是这个sign，入口也很简单，直接全局搜sign就行了

![image](https://attach.52pojie.cn/forum/202608/19/234554esr5x5trg4rechb2.png)

这次分析主要拿的还是搜索接口，需要删掉关键词重新搜索可能才会触发，sign就是u，那么u在哪里，可以看到上面代码n.next = 11，所以可以判断u是由ie(r.data)生成之后跳转到11分支给sign使用的。

![image](https://attach.52pojie.cn/forum/202608/19/234607z73yntffmmvfrnl0.png)

ie函数就是c函数，点击c函数跳转就是jsvmp所在的地方了

![image](https://attach.52pojie.cn/forum/202608/19/234619kcl33xlljs3na7m8.png)

![image](https://attach.52pojie.cn/forum/202608/19/234633ej30e4a504j5nz08.png)

开无痕跑一下jsvmp跟网页对比产出有些不一致，一开始我还以为是更新变了，其实不然，jsvmp估计就是有一些检测点，比如检测网址或者就是cookie等缓存信息影响，后面看了日志才能发现其检测点！这时候就对补环境很有用了，一直补都跟网页上不一样，并不一定是你补的不对哈，可能就是某些东西被检测了，你有这个值，但是这个值跟他想要的不一样就过不去，只要插桩看一下检测点就能针对性去补检测点环境了。

![image](https://attach.52pojie.cn/forum/202608/19/234645a9u9kfmk999jgkpg.png)

![image](https://attach.52pojie.cn/forum/202608/19/234658h1k94ii6s2926syz.png)

### 日志分析

这里使用的明文值为12345

总共导出了3000多行的日志，初步就可以分析zzca873dd41zwq69wr8hrqun6rvk1b5srwqncdc4c4d03是由 固定zzc+A873DD4+1ZWQ69wr8HRqUN6Rvk1b5srwQNc+DC4C4D03拼接而成的。

![image](https://attach.52pojie.cn/forum/202608/19/234718qphkrhotmz33d3jk.png)

直接全局搜索A873DD4 ，A873DD4是跟: [ 23,14, 6,36,16,40,7,19]有关，此刻是没过检测点的日志

```

```

[Op] + | 23 | 1 | 24
[Op] + | 14 | 1 | 15
[Op] + | 6 | 1 | 7
[Op] + | 36 | 1 | 37
[Op] + | 16 | 1 | 17
[Op] + | 40 | 1 | 41
[Op] + | 7 | 1 | 8
[Op] + | 19 | 1 | 20
[Call] {
"fn": "map",
"thisArg": [
23,
14,
6,
36,
16,
40,
7,
19
],
"args": [
null
],
"result": [
"C",
"8",
"D",
"9",
"B",
null,
"0",
"6"
]
}
[Call] {
"fn": "join",
"thisArg": [
"C",
"8",
"D",
"9",
"B",
null,
"0",
"6"
],
"args": [
""
],
"result": "C8D9B06"
} [
""
],
"result": "A873DD4"
}

```

```

看了很多大佬的文章，说是直接前面生成的hash值取固定下标，我一直取的是错误的，后面才想起来可能是更新了，其实不然，于是仔细看了下日志，发现有不少检测点，先把相关检测点分析一下，再分析日志吧

#### 检测点分析

正常检测点日志：

```

```

[Op] === | object | object | true
[Op] === | object | object | true
[Op] === | object | object | true
[Call] {
"fn": "RegExp",
"args": [
"Headless",
"i"
],
"result": {}
}
[Call] {
"fn": "test",
"thisArg": {},
"args": [
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0"
],
"result": false
}
[Op] === | undefined | 1 | false
[Call] {
"fn": "indexOf",
"thisArg": "y.qq.com",
"args": [
"qq.com"
],
"result": 2
}
[Op] > | 2 | -1 | true
[Call] {
"fn": "some",
"thisArg": [
"qq.com",
"joox.com",
"tencentmusic.com",
"wavecommittee.com",
"kugou.com",
"kuwo.cn"
],
"args": [
null
],
"result": true
}

```

```

非正常检测点日志：

```

```

[Op] === | object | object | true
[Op] === | object | object | true
[Op] === | object | object | true
[Call] {
"fn": "RegExp",
"args": [
"Headless",
"i"
],
"result": {}
}
[Call] {
"fn": "test",
"thisArg": {},
"args": [
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0"
],
"result": false
}
[Op] === | undefined | 1 | false
[Call] {
"fn": "indexOf",
"thisArg": "ntp.msn.cn",
"args": [
"qq.com"
],
"result": -1
}
[Op] > | -1 | -1 | false
[Call] {
"fn": "indexOf",
"thisArg": "ntp.msn.cn",
"args": [
"joox.com"
],
"result": -1
}
[Op] > | -1 | -1 | false
[Call] {
"fn": "indexOf",
"thisArg": "ntp.msn.cn",
"args": [
"tencentmusic.com"
],
"result": -1
}
[Op] > | -1 | -1 | false
[Call] {
"fn": "indexOf",
"thisArg": "ntp.msn.cn",
"args": [
"wavecommittee.com"
],
"result": -1
}
[Op] > | -1 | -1 | false
[Call] {
"fn": "indexOf",
"thisArg": "ntp.msn.cn",
"args": [
"kugou.com"
],
"result": -1
}
[Op] > | -1 | -1 | false
[Call] {
"fn": "indexOf",
"thisArg": "ntp.msn.cn",
"args": [
"kuwo.cn"
],
"result": -1
}
[Op] > | -1 | -1 | false
[Call] {
"fn": "some",
"thisArg": [
"qq.com",
"joox.com",
"tencentmusic.com",
"wavecommittee.com",
"kugou.com",
"kuwo.cn"
],
"args": [
null
],
"result": false
}

```

```

日志检测对比：

某某对象检测，我也不知道具体检测哪些对象，估计得改针对性插桩才能知道吧

```

```

[Op] === | object | object | true

```

```

创建了 Headless 检测正则。两个 User-Agent 都没有包含 Headless，所以结果一致，不影响后续结果

```

```

RegExp("Headless", "i")

```

```

估计猜测是自动化检测，这个并不受影响

```

```

[Op] === | undefined | 1 | false

```

```

受影响检测点：

被检测日志：

```

```

"ntp.msn.cn".indexOf("qq.com") // -1
-1 > -1                     // false

```

```

如果没过会继续检测，所有域名都没匹配到，所以是false

```

```

"ntp.msn.cn".indexOf("joox.com")          // -1
"ntp.msn.cn".indexOf("tencentmusic.com")  // -1
"ntp.msn.cn".indexOf("wavecommittee.com") // -1
"ntp.msn.cn".indexOf("kugou.com")         // -1
"ntp.msn.cn".indexOf("kuwo.cn")           // -1

```

```

正常日志：

```

```

"y.qq.com".indexOf("qq.com") // 2
2 > -1                     // true

```

```

some() 立即停止，不再检测后面的域名

```

```

joox.com
tencentmusic.com
wavecommittee.com
kugou.com
kuwo.cn

```

```

最终检测点就是域名检测

#### 算法分析

对比一下自己遇到的坑吧，检测点到底哪里受了影响呢

zzca873dd41zwq69wr8hrqun6rvk1b5srwqncdc4c4d03是由 固定zzc+A873DD4+1ZWQ69wr8HRqUN6Rvk1b5srwQNc+DC4C4D03拼接而成的。

这边暂且A873DD4就叫车头密文吧，1ZWQ69wr8HRqUN6Rvk1b5srwQNc就叫中间密文，DC4C4D03就叫车尾密文。

检测点受影响前分析：

经过分析，明文到密文这一步还是没受到影响的

直接拿浏览器的搜索明文日志分析吧

![image](https://attach.52pojie.cn/forum/202608/19/234750hmwn2rm21w8vm02g.png)

日志其实一目了然，"12345" 到 "8cb2237d0679ca88db6464eac60da96345513964" 就是hash算法，不是md5就是sha1

```

```

Call] {
"fn": "split",
"thisArg": "0123456789abcdef",
"args": [
""
],
"result": [
"0",
"1",
"2",
"3",
"4",
"5",
"6",
"7",
"8",
"9",
"a",
"b",
"c",
"d",
"e",
"f"
]
}
[Call] {
"fn": "charCodeAt",
"thisArg": "12345",
"args": [
0
],
"result": 49
}
[Call] {
"fn": "charCodeAt",
"thisArg": "12345",
"args": [
1
],
"result": 50
}
[Call] {
"fn": "charCodeAt",
"thisArg": "12345",
"args": [
2
],
"result": 51
}
[Call] {
"fn": "charCodeAt",
"thisArg": "12345",
"args": [
3
],
"result": 52
}
[Call] {
"fn": "charCodeAt",
"thisArg": "12345",
"args": [
4
],
"result": 53
}
[Call] {
"fn": "c",
"thisArg": {
"blocks": [
825373492,
889192448,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0
],
"h0": 1732584193,
"h1": 4023233417,
"h2": 2562383102,
"h3": 271733878,
"h4": 3285377520,
"hBytes": 0,
"bytes": 5,
"start": 5,
"block": 889192448,
"hashed": false,
"finalized": false,
"first": true,
"lastByteIndex": 5
},
"args": [
"12345"
],
"result": {
"blocks": [
825373492,
889192448,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0,
0
],
"h0": 1732584193,
"h1": 4023233417,
"h2": 2562383102,
"h3": 271733878,
"h4": 3285377520,
"hBytes": 0,
"bytes": 5,
"start": 5,
"block": 889192448,
"hashed": false,
"finalized": false,
"first": true,
"lastByteIndex": 5
}
}
[Call] {
"fn": "c",
"args": [
"12345"
],
"result": "8cb2237d0679ca88db6464eac60da96345513964"
}

```

```

没有魔改，直接套用就行了

![image](https://attach.52pojie.cn/forum/202608/19/234808rh7jl2rwhff0e4v0.png)

```

```

const crypto = require('crypto');
function sha1(str) {
return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
}
const res = sha1('明文');
console.log(res);

```

```

检测点之后日志分析：

车头密文分析：

正常日志：

经过多次调试，[23, 14, 6, 36, 16, 40, 7,19]下标数组是固定的，正常日志就如各大文章视频所说直接取下标就行了。

```

```

[Call] {
"fn": "map",
"thisArg": [
23,
14,
6,
36,
16,
40,
7,
19
],
"args": [
null
],
"result": [
"A",
"8",
"7",
"3",
"D",
null,
"D",
"4"
]
}
[Call] {
"fn": "join",
"thisArg": [
"A",
"8",
"7",
"3",
"D",
null,
"D",
"4"
],
"args": [
""
],
"result": "A873DD4"
}

```

```

跟日志也是能对得上的~~~~

![image](https://attach.52pojie.cn/forum/202608/19/234829kk5k5zp0imkczfcj.png)

检测点日志分析：

[23, 14, 6, 36, 16, 40, 7,19]是一样的，但是结果却是数组每个+1 去取下标，这样子就导致了提取的值不一致

```

```

[Op] + | 23 | 1 | 24
[Op] + | 14 | 1 | 15
[Op] + | 6 | 1 | 7
[Op] + | 36 | 1 | 37
[Op] + | 16 | 1 | 17
[Op] + | 40 | 1 | 41
[Op] + | 7 | 1 | 8
[Op] + | 19 | 1 | 20
[Call] {
"fn": "map",
"thisArg": [
23,
14,
6,
36,
16,
40,
7,
19
],
"args": [
null
],
"result": [
"C",
"8",
"D",
"9",
"B",
null,
"0",
"6"
]
}
[Call] {
"fn": "join",
"thisArg": [
"C",
"8",
"D",
"9",
"B",
null,
"0",
"6"
],
"args": [
""
],
"result": "C8D9B06"
}

```

```

跟日志上面的结果也是能对得上的，最起码检测点不过车头密文是会受影响的，每个数组都会加1

![image](https://attach.52pojie.cn/forum/202608/19/234849wzqxq9grdqkzkksg.png)

车尾密文：

车尾密文就不多说了，跟车头密文是一致的只是换了下标数组，检测点不一致照样会收影响

中间密文：

正常日志:

```

```

[Op] < | 0 | 20 | true
[Op] *| 0 | 2 | 0
[Op]* | 8 | 16 | 128
[Op] *| 0 | 2 | 0
[Op] + | 0 | 1 | 1
[Op] + | 128 | 12 | 140
[Op] ^ | 140 | 89 | 213
[Call] {
"fn": "push",
"thisArg": [
213
],
"args": [
213
],
"result": 1
}
[Op] < | 1 | 20 | true
[Op]* | 1 | 2 | 2
[Op] *| 11 | 16 | 176
[Op]* | 1 | 2 | 2
[Op] + | 2 | 1 | 3
[Op] + | 176 | 2 | 178
[Op] ^ | 178 | 39 | 149
[Call] {
"fn": "push",
"thisArg": [
213,
149
],
"args": [
149
],
"result": 2
}
[Op] < | 2 | 20 | true
[Op] *| 2 | 2 | 4
[Op]* | 2 | 16 | 32
[Op] *| 2 | 2 | 4
[Op] + | 4 | 1 | 5
[Op] + | 32 | 3 | 35
[Op] ^ | 35 | 179 | 144
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144
],
"args": [
144
],
"result": 3
}
[Op] < | 3 | 20 | true
[Op]* | 3 | 2 | 6
[Op] *| 7 | 16 | 112
[Op]* | 3 | 2 | 6
[Op] + | 6 | 1 | 7
[Op] + | 112 | 13 | 125
[Op] ^ | 125 | 150 | 235
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235
],
"args": [
235
],
"result": 4
}
[Op] < | 4 | 20 | true
[Op] *| 4 | 2 | 8
[Op]* | 0 | 16 | 0
[Op] *| 4 | 2 | 8
[Op] + | 8 | 1 | 9
[Op] + | 0 | 6 | 6
[Op] ^ | 6 | 218 | 220
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220
],
"args": [
220
],
"result": 5
}
[Op] < | 5 | 20 | true
[Op]* | 5 | 2 | 10
[Op] *| 7 | 16 | 112
[Op]* | 5 | 2 | 10
[Op] + | 10 | 1 | 11
[Op] + | 112 | 9 | 121
[Op] ^ | 121 | 82 | 43
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43
],
"args": [
43
],
"result": 6
}
[Op] < | 6 | 20 | true
[Op] *| 6 | 2 | 12
[Op]* | 12 | 16 | 192
[Op] *| 6 | 2 | 12
[Op] + | 12 | 1 | 13
[Op] + | 192 | 10 | 202
[Op] ^ | 202 | 58 | 240
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240
],
"args": [
240
],
"result": 7
}
[Op] < | 7 | 20 | true
[Op]* | 7 | 2 | 14
[Op] *| 8 | 16 | 128
[Op]* | 7 | 2 | 14
[Op] + | 14 | 1 | 15
[Op] + | 128 | 8 | 136
[Op] ^ | 136 | 252 | 116
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116
],
"args": [
116
],
"result": 8
}
[Op] < | 8 | 20 | true
[Op] *| 8 | 2 | 16
[Op]* | 13 | 16 | 208
[Op] *| 8 | 2 | 16
[Op] + | 16 | 1 | 17
[Op] + | 208 | 11 | 219
[Op] ^ | 219 | 177 | 106
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106
],
"args": [
106
],
"result": 9
}
[Op] < | 9 | 20 | true
[Op]* | 9 | 2 | 18
[Op] *| 6 | 16 | 96
[Op]* | 9 | 2 | 18
[Op] + | 18 | 1 | 19
[Op] + | 96 | 4 | 100
[Op] ^ | 100 | 52 | 80
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80
],
"args": [
80
],
"result": 10
}
[Op] < | 10 | 20 | true
[Op] *| 10 | 2 | 20
[Op]* | 6 | 16 | 96
[Op] *| 10 | 2 | 20
[Op] + | 20 | 1 | 21
[Op] + | 96 | 4 | 100
[Op] ^ | 100 | 186 | 222
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222
],
"args": [
222
],
"result": 11
}
[Op] < | 11 | 20 | true
[Op]* | 11 | 2 | 22
[Op] *| 14 | 16 | 224
[Op]* | 11 | 2 | 22
[Op] + | 22 | 1 | 23
[Op] + | 224 | 10 | 234
[Op] ^ | 234 | 123 | 145
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145
],
"args": [
145
],
"result": 12
}
[Op] < | 12 | 20 | true
[Op] *| 12 | 2 | 24
[Op]* | 12 | 16 | 192
[Op] *| 12 | 2 | 24
[Op] + | 24 | 1 | 25
[Op] + | 192 | 6 | 198
[Op] ^ | 198 | 120 | 190
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190
],
"args": [
190
],
"result": 13
}
[Op] < | 13 | 20 | true
[Op]* | 13 | 2 | 26
[Op] *| 0 | 16 | 0
[Op]* | 13 | 2 | 26
[Op] + | 26 | 1 | 27
[Op] + | 0 | 13 | 13
[Op] ^ | 13 | 64 | 77
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77
],
"args": [
77
],
"result": 14
}
[Op] < | 14 | 20 | true
[Op] *| 14 | 2 | 28
[Op]* | 10 | 16 | 160
[Op] *| 14 | 2 | 28
[Op] + | 28 | 1 | 29
[Op] + | 160 | 9 | 169
[Op] ^ | 169 | 242 | 91
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77,
91
],
"args": [
91
],
"result": 15
}
[Op] < | 15 | 20 | true
[Op]* | 15 | 2 | 30
[Op] *| 6 | 16 | 96
[Op]* | 15 | 2 | 30
[Op] + | 30 | 1 | 31
[Op] + | 96 | 3 | 99
[Op] ^ | 99 | 133 | 230
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77,
91,
230
],
"args": [
230
],
"result": 16
}
[Op] < | 16 | 20 | true
[Op] *| 16 | 2 | 32
[Op]* | 4 | 16 | 64
[Op] *| 16 | 2 | 32
[Op] + | 32 | 1 | 33
[Op] + | 64 | 5 | 69
[Op] ^ | 69 | 143 | 202
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77,
91,
230,
202
],
"args": [
202
],
"result": 17
}
[Op] < | 17 | 20 | true
[Op]* | 17 | 2 | 34
[Op] *| 5 | 16 | 80
[Op]* | 17 | 2 | 34
[Op] + | 34 | 1 | 35
[Op] + | 80 | 1 | 81
[Op] ^ | 81 | 161 | 240
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77,
91,
230,
202,
240
],
"args": [
240
],
"result": 18
}
[Op] < | 18 | 20 | true
[Op] *| 18 | 2 | 36
[Op]* | 3 | 16 | 48
[Op] *| 18 | 2 | 36
[Op] + | 36 | 1 | 37
[Op] + | 48 | 9 | 57
[Op] ^ | 57 | 121 | 64
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77,
91,
230,
202,
240,
64
],
"args": [
64
],
"result": 19
}
[Op] < | 19 | 20 | true
[Op]* | 19 | 2 | 38
[Op] *| 6 | 16 | 96
[Op]* | 19 | 2 | 38
[Op] + | 38 | 1 | 39
[Op] + | 96 | 4 | 100
[Op] ^ | 100 | 179 | 215
[Call] {
"fn": "push",
"thisArg": [
213,
149,
144,
235,
220,
43,
240,
116,
106,
80,
222,
145,
190,
77,
91,
230,
202,
240,
64,
215
],
"args": [
215
],
"result": 20
}

```

```

被风控日志：

```

```

[Op] < | 0 | 20 | true
[Op] *| 0 | 2 | 0
[Op]* | 8 | 16 | 128
[Op] *| 0 | 2 | 0
[Op] + | 0 | 1 | 1
[Op] + | 128 | 12 | 140
[Op] ^ | 140 | 149 | 25
[Call] {
"fn": "anonymous",
"thisArg": [
25
],
"args": [
25
],
"result": 1
}
[Op] < | 1 | 20 | true
[Op]* | 1 | 2 | 2
[Op] *| 11 | 16 | 176
[Op]* | 1 | 2 | 2
[Op] + | 2 | 1 | 3
[Op] + | 176 | 2 | 178
[Op] ^ | 178 | 114 | 192
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192
],
"args": [
192
],
"result": 2
}
[Op] < | 2 | 20 | true
[Op] *| 2 | 2 | 4
[Op]* | 2 | 16 | 32
[Op] *| 2 | 2 | 4
[Op] + | 4 | 1 | 5
[Op] + | 32 | 3 | 35
[Op] ^ | 35 | 150 | 181
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181
],
"args": [
181
],
"result": 3
}
[Op] < | 3 | 20 | true
[Op]* | 3 | 2 | 6
[Op] *| 7 | 16 | 112
[Op]* | 3 | 2 | 6
[Op] + | 6 | 1 | 7
[Op] + | 112 | 13 | 125
[Op] ^ | 125 | 179 | 206
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206
],
"args": [
206
],
"result": 4
}
[Op] < | 4 | 20 | true
[Op] *| 4 | 2 | 8
[Op]* | 0 | 16 | 0
[Op] *| 4 | 2 | 8
[Op] + | 8 | 1 | 9
[Op] + | 0 | 6 | 6
[Op] ^ | 6 | 58 | 60
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60
],
"args": [
60
],
"result": 5
}
[Op] < | 5 | 20 | true
[Op]* | 5 | 2 | 10
[Op] *| 7 | 16 | 112
[Op]* | 5 | 2 | 10
[Op] + | 10 | 1 | 11
[Op] + | 112 | 9 | 121
[Op] ^ | 121 | 37 | 92
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92
],
"args": [
92
],
"result": 6
}
[Op] < | 6 | 20 | true
[Op] *| 6 | 2 | 12
[Op]* | 12 | 16 | 192
[Op] *| 6 | 2 | 12
[Op] + | 12 | 1 | 13
[Op] + | 192 | 10 | 202
[Op] ^ | 202 | 170 | 96
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96
],
"args": [
96
],
"result": 7
}
[Op] < | 7 | 20 | true
[Op]* | 7 | 2 | 14
[Op] *| 8 | 16 | 128
[Op]* | 7 | 2 | 14
[Op] + | 14 | 1 | 15
[Op] + | 128 | 8 | 136
[Op] ^ | 136 | 255 | 119
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119
],
"args": [
119
],
"result": 8
}
[Op] < | 8 | 20 | true
[Op] *| 8 | 2 | 16
[Op]* | 13 | 16 | 208
[Op] *| 8 | 2 | 16
[Op] + | 16 | 1 | 17
[Op] + | 208 | 11 | 219
[Op] ^ | 219 | 101 | 190
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190
],
"args": [
190
],
"result": 9
}
[Op] < | 9 | 20 | true
[Op]* | 9 | 2 | 18
[Op] *| 6 | 16 | 96
[Op]* | 9 | 2 | 18
[Op] + | 18 | 1 | 19
[Op] + | 96 | 4 | 100
[Op] ^ | 100 | 22 | 114
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114
],
"args": [
114
],
"result": 10
}
[Op] < | 10 | 20 | true
[Op] *| 10 | 2 | 20
[Op]* | 6 | 16 | 96
[Op] *| 10 | 2 | 20
[Op] + | 20 | 1 | 21
[Op] + | 96 | 4 | 100
[Op] ^ | 100 | 171 | 207
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207
],
"args": [
207
],
"result": 11
}
[Op] < | 11 | 20 | true
[Op]* | 11 | 2 | 22
[Op] *| 14 | 16 | 224
[Op]* | 11 | 2 | 22
[Op] + | 22 | 1 | 23
[Op] + | 224 | 10 | 234
[Op] ^ | 234 | 156 | 118
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118
],
"args": [
118
],
"result": 12
}
[Op] < | 12 | 20 | true
[Op] *| 12 | 2 | 24
[Op]* | 12 | 16 | 192
[Op] *| 12 | 2 | 24
[Op] + | 24 | 1 | 25
[Op] + | 192 | 6 | 198
[Op] ^ | 198 | 143 | 73
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73
],
"args": [
73
],
"result": 13
}
[Op] < | 13 | 20 | true
[Op]* | 13 | 2 | 26
[Op] *| 0 | 16 | 0
[Op]* | 13 | 2 | 26
[Op] + | 26 | 1 | 27
[Op] + | 0 | 13 | 13
[Op] ^ | 13 | 9 | 4
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4
],
"args": [
4
],
"result": 14
}
[Op] < | 14 | 20 | true
[Op] *| 14 | 2 | 28
[Op]* | 10 | 16 | 160
[Op] *| 14 | 2 | 28
[Op] + | 28 | 1 | 29
[Op] + | 160 | 9 | 169
[Op] ^ | 169 | 186 | 19
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4,
19
],
"args": [
19
],
"result": 15
}
[Op] < | 15 | 20 | true
[Op]* | 15 | 2 | 30
[Op] *| 6 | 16 | 96
[Op]* | 15 | 2 | 30
[Op] + | 30 | 1 | 31
[Op] + | 96 | 3 | 99
[Op] ^ | 99 | 34 | 65
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4,
19,
65
],
"args": [
65
],
"result": 16
}
[Op] < | 16 | 20 | true
[Op] *| 16 | 2 | 32
[Op]* | 4 | 16 | 64
[Op] *| 16 | 2 | 32
[Op] + | 32 | 1 | 33
[Op] + | 64 | 5 | 69
[Op] ^ | 69 | 95 | 26
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4,
19,
65,
26
],
"args": [
26
],
"result": 17
}
[Op] < | 17 | 20 | true
[Op]* | 17 | 2 | 34
[Op] *| 5 | 16 | 80
[Op]* | 17 | 2 | 34
[Op] + | 34 | 1 | 35
[Op] + | 80 | 1 | 81
[Op] ^ | 81 | 204 | 157
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4,
19,
65,
26,
157
],
"args": [
157
],
"result": 18
}
[Op] < | 18 | 20 | true
[Op] *| 18 | 2 | 36
[Op]* | 3 | 16 | 48
[Op] *| 18 | 2 | 36
[Op] + | 36 | 1 | 37
[Op] + | 48 | 9 | 57
[Op] ^ | 57 | 217 | 224
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4,
19,
65,
26,
157,
224
],
"args": [
224
],
"result": 19
}
[Op] < | 19 | 20 | true
[Op]* | 19 | 2 | 38
[Op] *| 6 | 16 | 96
[Op]* | 19 | 2 | 38
[Op] + | 38 | 1 | 39
[Op] + | 96 | 4 | 100
[Op] ^ | 100 | 19 | 119
[Call] {
"fn": "anonymous",
"thisArg": [
25,
192,
181,
206,
60,
92,
96,
119,
190,
114,
207,
118,
73,
4,
19,
65,
26,
157,
224,
119
],
"args": [
119
],
"result": 20
}

```

```

被检测日志：异或数组

SHA1 每两个字符组成一个原始字节，右侧数字是异或值，最后一列是结果：

i
SHA1 两字符
原始字节
key[i]
异或结果
日志中的

```
^
```

0
