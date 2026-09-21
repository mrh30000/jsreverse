# 酷我破解js脚本分析

> **作者**: HackXK | **发布时间**: 2026-01-23 13:48:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 12195 / 166
> **原文**: [https://www.52pojie.cn/thread-2088285-1-1.html](https://www.52pojie.cn/thread-2088285-1-1.html)

---

突然在TG遇到了一个好玩的事情，我在看到一个酷我音乐的破解js脚本后，本来想看一下他的逻辑，打开后是加密的，故尝试还原了一下，但是被别人说是装X。那我分享给吾爱友友们交流学习心得可以吧？
退一万步来讲，只允许你破解别人酷我音乐，就不能让别人反编译你的js脚本吗？这是什么逻辑。

本文档基于一个实际案例，详细分析 JavaScript 代码混淆的常见技术手段以及对应的反混淆方法。

### 一、背景说明

在逆向分析某个网络代理脚本时，发现其使用了多层混淆技术来保护源代码。本文将从技术角度剖析这些混淆手段，并展示如何进行反混淆处理。

本文仅用于技术学习和安全研究，请勿用于非法用途。

### 二、混淆前后对比

#### 2.1 混淆前的代码结构

正常的 JavaScript 代码应该是这样的：

```
function encryptData(key, data) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

#### 2.2 混淆后的代码结构

经过混淆后，代码变成了这样：

```
function ONZ3V_0x5351(_0x32ae47,_0x48829){
  var _0x5e0803=ONZ3V_0x5e08();
  return ONZ3V_0x5351=function(_0x535185,_0x369601){
    _0x535185=_0x535185-0xec;
    var _0x67e527=_0x5e0803[_0x535185];
    if(ONZ3V_0x5351['\x4f\x56\x77\x6a\x46\x41']===undefined){
      // ... 大量混淆代码
    }
  }
}
```

可以看到，原本清晰的代码逻辑完全被打乱了。

### 三、混淆技术详解

#### 3.1 字符串十六进制编码

这是最基础的混淆手段，将所有可读字符串转换为十六进制转义序列。

混淆前：

```
var cipher = "BlockCipher";
```

混淆后：

```
var cipher = "\x42\x6c\x6f\x63\x6b\x43\x69\x70\x68\x65\x72";
```

这种方式虽然简单，但能有效阻止简单的字符串搜索。

#### 3.2 变量名混淆

所有有意义的变量名、函数名都被替换成无意义的随机字符串。

混淆前：

```
function createEncryptor(key, iv) {
  return new Encryptor(key, iv);
}
```

混淆后：

```
function ONZ3V_0x5351(_0x32ae47, _0x48829) {
  return new _0x5e0803(_0x32ae47, _0x48829);
}
```

变量名通常采用以下几种模式：

* 十六进制格式：`_0x32ae47`
* 随机字符串：`ONZ3V_0x5351`
* 下划线+数字：`_0x5e0803`

#### 3.3 字符串数组化

这是一种高级混淆技术，将所有字符串提取到一个数组中，然后通过索引访问。

原理：

```
// 步骤1：提取所有字符串到数组
function ONZ3V_0x5e08() {
  return [
    'BlockCipher',
    'encrypt',
    'decrypt',
    'AES',
    'createEncryptor',
    // ... 更多字符串
  ];
}

// 步骤2：通过索引访问
var _0x5e0803 = ONZ3V_0x5e08();
var cipher = _0x5e0803[0];  // 'BlockCipher'
var method = _0x5e0803[1];  // 'encrypt'
```

实际混淆后的访问方式更复杂：

```
_0x43b01b(0x49e)  // 实际上是访问字符串数组的某个元素
```

#### 3.4 Base64 编码层

在字符串数组的基础上，再加一层 Base64 编码。

```
var _0xd2d070 = function(_0x58801a) {
  var _0x100db9 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
  var _0x337781 = '', _0x49759e = '';

  // Base64 解码逻辑
  for(var _0x3ef051 = 0x0, _0x589ea3, _0x42d2fd, _0x13c93a = 0x0;
      _0x42d2fd = _0x58801a['\x63\x68\x61\x72\x41\x74'](_0x13c93a++);
      ~_0x42d2fd && (_0x589ea3 = _0x3ef051 % 0x4 ? _0x589ea3 * 0x40 + _0x42d2fd : _0x42d2fd,
      _0x3ef051++ % 0x4) ? _0x337781 += String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](0xff & _0x589ea3 >> (-0x2 * _0x3ef051 & 0x6)) : 0x0) {
    _0x42d2fd = _0x100db9['\x69\x6e\x64\x65\x78\x4f\x66'](_0x42d2fd);
  }

  // URL 解码
  for(var _0x49cbee = 0x0, _0x3b23d9 = _0x337781['\x6c\x65\x6e\x67\x74\x68']; _0x49cbee < _0x3b23d9; _0x49cbee++) {
    _0x49759e += '\x25' + ('\x30\x30' + _0x337781['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x49cbee)['\x74\x6f\x53\x74\x72\x69\x6e\x67'](0x10))['\x73\x6c\x69\x63\x65'](-0x2);
  }

  return decodeURIComponent(_0x49759e);
};
```

这个函数的作用是：

1. 从字符串数组中取出 Base64 编码的字符串
2. 进行 Base64 解码
3. 进行 URL 解码
4. 返回原始字符串

#### 3.5 RC4 流加密

更高级的混淆会在 Base64 的基础上再加一层 RC4 加密。

```
var _0x58801a = function(_0x52ded8, _0x4f7819) {
  var _0x55dcd6 = [], _0x285da9 = 0x0, _0x25254d, _0x50d18f = '';

  // 先进行 Base64 解码
  _0x52ded8 = _0xd2d070(_0x52ded8);

  // RC4 密钥调度算法 (KSA)
  var _0x5794f5;
  for(_0x5794f5 = 0x0; _0x5794f5 < 0x100; _0x5794f5++) {
    _0x55dcd6[_0x5794f5] = _0x5794f5;
  }

  for(_0x5794f5 = 0x0; _0x5794f5 < 0x100; _0x5794f5++) {
    _0x285da9 = (_0x285da9 + _0x55dcd6[_0x5794f5] + _0x4f7819['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x5794f5 % _0x4f7819['\x6c\x65\x6e\x67\x74\x68'])) % 0x100;
    _0x25254d = _0x55dcd6[_0x5794f5];
    _0x55dcd6[_0x5794f5] = _0x55dcd6[_0x285da9];
    _0x55dcd6[_0x285da9] = _0x25254d;
  }

  // RC4 伪随机生成算法 (PRGA)
  _0x5794f5 = 0x0;
  _0x285da9 = 0x0;
  for(var _0x5d635b = 0x0; _0x5d635b < _0x52ded8['\x6c\x65\x6e\x67\x74\x68']; _0x5d635b++) {
    _0x5794f5 = (_0x5794f5 + 0x1) % 0x100;
    _0x285da9 = (_0x285da9 + _0x55dcd6[_0x5794f5]) % 0x100;
    _0x25254d = _0x55dcd6[_0x5794f5];
    _0x55dcd6[_0x5794f5] = _0x55dcd6[_0x285da9];
    _0x55dcd6[_0x285da9] = _0x25254d;

    // XOR 解密
    _0x50d18f += String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](
      _0x52ded8['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x5d635b) ^
      _0x55dcd6[(_0x55dcd6[_0x5794f5] + _0x55dcd6[_0x285da9]) % 0x100]
    );
  }

  return _0x50d18f;
};
```

RC4 加密的特点：

* 使用密钥进行流加密
* 每个字符串可以使用不同的密钥
* 增加了破解难度

调用方式：

```
// 不带密钥的调用（只有 Base64）
_0x43b01b(0x49e)

// 带密钥的调用（Base64 + RC4）
_0x2e8329(0x4e8, '\x52\x48\x77\x62')  // 第二个参数是 RC4 密钥
```

#### 3.6 控制流平坦化

这是一种高级混淆技术，通过打乱代码执行顺序来增加分析难度。

```
(function(_0x2dc29a, _0x1699e8) {
  var _0x2e8329 = ONZ3V_0x5880,
      _0x43b01b = ONZ3V_0x5351,
      _0x55e37e = _0x2dc29a();

  while(!![]) {
    try {
      var _0x2c606b =
        -parseInt(_0x43b01b(0x49e)) / 0x1 * (parseInt(_0x2e8329(0x4e8, '\x52\x48\x77\x62')) / 0x2) +
        -parseInt(_0x2e8329(0x586, '\x23\x6f\x6a\x31')) / 0x3 +
        -parseInt(_0x2e8329(0x67b, '\x43\x69\x6c\x59')) / 0x4 +
        parseInt(_0x2e8329(0x1e9, '\x69\x51\x68\x75')) / 0x5 * (-parseInt(_0x2e8329(0x537, '\x57\x7a\x6b\x58')) / 0x6) +
        -parseInt(_0x2e8329(0x227, '\x53\x48\x42\x62')) / 0x7 +
        parseInt(_0x2e8329(0x3bf, '\x70\x54\x43\x53')) / 0x8 +
        parseInt(_0x43b01b(0x5dc)) / 0x9;

      if(_0x2c606b === _0x1699e8) break;
      else _0x55e37e['push'](_0x55e37e['shift']());
    } catch(_0x1f24b8) {
      _0x55e37e['push'](_0x55e37e['shift']());
    }
  }
})(ONZ3V_0x5e08, 0x642d5);
```

这段代码的作用：

1. 计算一个特定的数值
2. 如果数值匹配，跳出循环
3. 如果不匹配，将字符串数组的第一个元素移到最后
4. 重复这个过程，直到数组顺序正确

这样做的目的是：

* 打乱字符串数组的初始顺序
* 只有在运行时才能确定正确的顺序
* 静态分析无法直接获取字符串内容

#### 3.7 数字混淆

将所有数字转换为十六进制，增加可读性难度。

混淆前：

```
for(var i = 0; i < 256; i++) {
  array[i] = i;
}
```

混淆后：

```
for(var _0x5794f5 = 0x0; _0x5794f5 < 0x100; _0x5794f5++) {
  _0x55dcd6[_0x5794f5] = _0x5794f5;
}
```

常见的数字对应关系：

* `0x0` = 0
* `0x1` = 1
* `0x4` = 4
* `0x100` = 256
* `0xff` = 255
* `0x642d5` = 410325

### 四、反混淆方法

#### 4.1 自动化工具反混淆

对于标准的混淆器（如 obfuscator.io），可以使用专门的反混淆工具。

在线工具：

* <https://deobfuscate.io/>
* <https://obf-io.deobfuscate.io/>
* <https://lelinhtinh.github.io/de4js/>

命令行工具：

```
# 安装 js-beautify
npm install -g js-beautify

# 格式化代码
js-beautify input.js > output.js

# 或者使用 prettier
npm install -g prettier
prettier --write input.js
```

这些工具可以：

* 自动格式化代码
* 还原部分变量名
* 移除死代码
* 简化控制流

但是，自动化工具通常只能完成部分工作，深度混淆仍需要手动分析。

#### 4.2 手动分析反混淆

对于复杂的混淆，需要手动分析和逐步还原。

步骤1：格式化代码

使用 js-beautify 或浏览器的格式化功能，让代码具有可读的缩进和换行。

步骤2：识别解密函数

找到字符串解密函数，通常在代码开头：

```
function ONZ3V_0x5351(_0x32ae47, _0x48829) {
  // Base64 解码函数
}

function ONZ3V_0x5880(_0x32ae47, _0x48829) {
  // RC4 解密函数
}
```

步骤3：提取字符串数组

找到字符串数组函数：

```
function ONZ3V_0x5e08() {
  return ['加密字符串1', '加密字符串2', ...];
}
```

步骤4：编写解密脚本

创建一个 Node.js 脚本来批量解密字符串：

```
// decrypt.js
const fs = require('fs');

// 复制混淆代码中的解密函数
function ONZ3V_0x5e08() {
  return ['...'];  // 字符串数组
}

function ONZ3V_0x5351(_0x32ae47, _0x48829) {
  // Base64 解码逻辑
}

function ONZ3V_0x5880(_0x32ae47, _0x48829) {
  // RC4 解密逻辑
}

// 测试解密
console.log(ONZ3V_0x5351(0x49e));  // 输出解密后的字符串
console.log(ONZ3V_0x5880(0x4e8, 'RHwb'));  // 输出解密后的字符串
```

运行脚本：

```
node decrypt.js
```

步骤5：批量替换

使用正则表达式批量替换混淆的字符串调用：

```
// 使用 Node.js 脚本批量替换
const code = fs.readFileSync('obfuscated.js', 'utf8');

// 替换不带密钥的调用
let deobfuscated = code.replace(/_0x43b01b\(0x([0-9a-f]+)\)/g, (match, hex) => {
  const index = parseInt(hex, 16);
  const decrypted = ONZ3V_0x5351(index);
  return `"${decrypted}"`;
});

// 替换带密钥的调用
deobfuscated = deobfuscated.replace(/_0x2e8329\(0x([0-9a-f]+),\s*'([^']+)'\)/g, (match, hex, key) => {
  const index = parseInt(hex, 16);
  const decrypted = ONZ3V_0x5880(index, key);
  return `"${decrypted}"`;
});

fs.writeFileSync('deobfuscated.js', deobfuscated);
```

步骤6：变量重命名

根据上下文，将无意义的变量名改为有意义的名称：

```
// 混淆的变量名
var _0x5e0803 = ONZ3V_0x5e08();
var _0x3133cb = _0x5e0803[0];

// 重命名后
var stringArray = getStringArray();
var blockCipher = stringArray[0];
```

步骤7：还原控制流

移除控制流平坦化代码，恢复正常的执行顺序：

```
// 混淆的控制流
(function(_0x2dc29a, _0x1699e8) {
  var _0x55e37e = _0x2dc29a();
  while(!![]) {
    // ... 复杂的循环逻辑
  }
})(ONZ3V_0x5e08, 0x642d5);

// 还原后（直接执行字符串数组初始化）
var stringArray = ['string1', 'string2', ...];
```

步骤8：数字还原

将十六进制数字转换为十进制：

```
// 混淆的数字
for(var i = 0x0; i < 0x100; i++) {
  array[i] = 0xff & value;
}

// 还原后
for(var i = 0; i < 256; i++) {
  array[i] = 255 & value;
}
```

#### 4.3 浏览器动态调试

对于特别复杂的混淆，可以使用浏览器的开发者工具进行动态调试。

步骤1：在浏览器中打开混淆代码

创建一个 HTML 文件：

```
<!DOCTYPE html>
<html>
<head>
  <title>Deobfuscate</title>
</head>
<body>
  <script src="obfuscated.js"></script>
</body>
</html>
```

步骤2：设置断点

在浏览器开发者工具中：

1. 打开 Sources 面板
2. 找到字符串解密函数
3. 在 return 语句处设置断点

步骤3：观察解密结果

当代码执行到断点时：

1. 查看局部变量的值
2. 记录解密后的字符串
3. 继续执行，收集更多解密结果

步骤4：使用 Console 批量解密

在浏览器 Console 中直接调用解密函数：

```
// 批量解密
for(let i = 0; i < 100; i++) {
  try {
    console.log(i, ONZ3V_0x5351(i));
  } catch(e) {}
}

// 带密钥的解密
console.log(ONZ3V_0x5880(0x4e8, 'RHwb'));
```

步骤5：导出解密映射

创建一个映射表，记录所有解密结果：

```
const decryptMap = {};
for(let i = 0; i < 1000; i++) {
  try {
    decryptMap[i] = ONZ3V_0x5351(i);
  } catch(e) {}
}
console.log(JSON.stringify(decryptMap, null, 2));
```

然后将这个映射表保存下来，用于批量替换。

### 五、实际案例分析

#### 5.1 混淆代码示例

这是从实际案例中提取的混淆代码片段：

```
function ONZ3V_0x5351(_0x32ae47,_0x48829){
  var _0x5e0803=ONZ3V_0x5e08();
  return ONZ3V_0x5351=function(_0x535185,_0x369601){
    _0x535185=_0x535185-0xec;
    var _0x67e527=_0x5e0803[_0x535185];
    if(ONZ3V_0x5351['\x4f\x56\x77\x6a\x46\x41']===undefined){
      var _0xd2d070=function(_0x58801a){
        var _0x100db9='\x61\x62\x63\x64\x65\x66\x67\x68\x69\x6a\x6b\x6c\x6d\x6e\x6f\x70\x71\x72\x73\x74\x75\x76\x77\x78\x79\x7a\x41\x42\x43\x44\x45\x46\x47\x48\x49\x4a\x4b\x4c\x4d\x4e\x4f\x50\x51\x52\x53\x54\x55\x56\x57\x58\x59\x5a\x30\x31\x32\x33\x34\x35\x36\x37\x38\x39\x2b\x2f\x3d';
        var _0x337781='',_0x49759e='';
        for(var _0x3ef051=0x0,_0x589ea3,_0x42d2fd,_0x13c93a=0x0;_0x42d2fd=_0x58801a['\x63\x68\x61\x72\x41\x74'](_0x13c93a++);~_0x42d2fd&&(_0x589ea3=_0x3ef051%0x4?_0x589ea3*0x40+_0x42d2fd:_0x42d2fd,_0x3ef051++%0x4)?_0x337781+=String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](0xff&_0x589ea3>>(-0x2*_0x3ef051&0x6)):0x0){
          _0x42d2fd=_0x100db9['\x69\x6e\x64\x65\x78\x4f\x66'](_0x42d2fd);
        }
        for(var _0x49cbee=0x0,_0x3b23d9=_0x337781['\x6c\x65\x6e\x67\x74\x68'];_0x49cbee<_0x3b23d9;_0x49cbee++){
          _0x49759e+='\x25'+('\x30\x30'+_0x337781['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x49cbee)['\x74\x6f\x53\x74\x72\x69\x6e\x67'](0x10))['\x73\x6c\x69\x63\x65'](-0x2);
        }
        return decodeURIComponent(_0x49759e);
      };
      ONZ3V_0x5351['\x47\x56\x74\x67\x6c\x4a']=_0xd2d070,_0x32ae47=arguments,ONZ3V_0x5351['\x4f\x56\x77\x6a\x46\x41']=!![];
    }
    var _0x519bfe=_0x5e0803[0x0],_0x58fd4a=_0x535185+_0x519bfe,_0x306093=_0x32ae47[_0x58fd4a];
    return!_0x306093?(_0x67e527=ONZ3V_0x5351['\x47\x56\x74\x67\x6c\x4a'](_0x67e527),_0x32ae47[_0x58fd4a]=_0x67e527):_0x67e527=_0x306093,_0x67e527;
  },ONZ3V_0x5351(_0x32ae47,_0x48829);
}
```

这段代码的功能是：

1. 从字符串数组中获取加密的字符串
2. 进行 Base64 解码
3. 进行 URL 解码
4. 缓存解密结果，避免重复解密

#### 5.2 反混淆后的代码

经过反混淆处理后，代码变成：

```
function decodeString(index) {
  var stringArray = getStringArray();
  var encodedString = stringArray[index - 0xec];

  if(!decodeString.cache) {
    decodeString.cache = {};
    decodeString.decoder = function(base64String) {
      var base64Chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
      var output = '';
      var urlEncoded = '';

      // Base64 解码
      for(var i = 0, a, b, c = 0; b = base64String.charAt(c++); ~b && (a = i % 4 ? a * 64 + b : b, i++ % 4) ? output += String.fromCharCode(255 & a >> (-2 * i & 6)) : 0) {
        b = base64Chars.indexOf(b);
      }

      // URL 编码
      for(var j = 0, len = output.length; j < len; j++) {
        urlEncoded += '%' + ('00' + output.charCodeAt(j).toString(16)).slice(-2);
      }

      return decodeURIComponent(urlEncoded);
    };
  }

  var cacheKey = index;
  var cached = decodeString.cache[cacheKey];

  if(!cached) {
    cached = decodeString.decoder(encodedString);
    decodeString.cache[cacheKey] = cached;
  }

  return cached;
}
```

可以看到，反混淆后的代码逻辑清晰了很多。

#### 5.3 完整的反混淆流程

以实际案例为例，展示完整的反混淆过程。

原始混淆代码（部分）：

```
(function(_0x2dc29a,_0x1699e8){
  var _0x2e8329=ONZ3V_0x5880,_0x43b01b=ONZ3V_0x5351,_0x55e37e=_0x2dc29a();
  while(!![]){
    try{
      var _0x2c606b=-parseInt(_0x43b01b(0x49e))/0x1*(parseInt(_0x2e8329(0x4e8,'\x52\x48\x77\x62'))/0x2)+-parseInt(_0x2e8329(0x586,'\x23\x6f\x6a\x31'))/0x3;
      if(_0x2c606b===_0x1699e8)break;
      else _0x55e37e['push'](_0x55e37e['shift']());
    }catch(_0x1f24b8){
      _0x55e37e['push'](_0x55e37e['shift']());
    }
  }
})(ONZ3V_0x5e08,0x642d5);
```

第一步：格式化代码

```
(function(_0x2dc29a, _0x1699e8) {
  var _0x2e8329 = ONZ3V_0x5880,
      _0x43b01b = ONZ3V_0x5351,
      _0x55e37e = _0x2dc29a();

  while(!![]) {
    try {
      var _0x2c606b =
        -parseInt(_0x43b01b(0x49e)) / 0x1 *
        (parseInt(_0x2e8329(0x4e8, '\x52\x48\x77\x62')) / 0x2) +
        -parseInt(_0x2e8329(0x586, '\x23\x6f\x6a\x31')) / 0x3;

      if(_0x2c606b === _0x1699e8) break;
      else _0x55e37e['push'](_0x55e37e['shift']());
    } catch(_0x1f24b8) {
      _0x55e37e['push'](_0x55e37e['shift']());
    }
  }
})(ONZ3V_0x5e08, 0x642d5);
```

第二步：解密字符串

```
// 使用浏览器 Console 或 Node.js 解密
ONZ3V_0x5351(0x49e)  // 返回 "1XRPqqq"
ONZ3V_0x5880(0x4e8, 'RHwb')  // 返回 "511118bEIlid"
ONZ3V_0x5880(0x586, '#oj1')  // 返回 "806319vHSzgW"
```

第三步：替换解密结果

```
(function(getStringArray, targetValue) {
  var decodeRC4 = ONZ3V_0x5880,
      decodeBase64 = ONZ3V_0x5351,
      stringArray = getStringArray();

  while(true) {
    try {
      var calculatedValue =
        -parseInt("1XRPqqq") / 1 *
        (parseInt("511118bEIlid") / 2) +
        -parseInt("806319vHSzgW") / 3;

      if(calculatedValue === targetValue) break;
      else stringArray['push'](stringArray['shift']());
    } catch(error) {
      stringArray['push'](stringArray['shift']());
    }
  }
})(ONZ3V_0x5e08, 410325);
```

第四步：变量重命名

```
(function(getStringArray, targetValue) {
  var stringArray = getStringArray();

  // 通过循环调整字符串数组顺序，直到计算值匹配目标值
  while(true) {
    try {
      var calculatedValue =
        -parseInt("1XRPqqq") / 1 *
        (parseInt("511118bEIlid") / 2) +
        -parseInt("806319vHSzgW") / 3;

      if(calculatedValue === targetValue) break;
      else stringArray.push(stringArray.shift());
    } catch(error) {
      stringArray.push(stringArray.shift());
    }
  }
})(getStringArray, 410325);
```

第五步：简化逻辑（可选）

```
// 这段代码的作用是调整字符串数组的顺序
// 在实际使用中，可以直接运行一次，获取正确的数组顺序
// 然后用正确顺序的数组替换这段代码

var stringArray = [
  'string1',
  'string2',
  'string3',
  // ... 正确顺序的字符串
];
```

### 六、混淆工具识别

#### 6.1 常见混淆工具特征

根据代码特征，可以判断使用了哪种混淆工具。

obfuscator.io 特征：

* 函数名格式：`_0x[hex]` 或 `prefix_0x[hex]`
* 字符串数组函数
* Base64 + RC4 双重加密
* 控制流平坦化
* 十六进制数字

UglifyJS 特征：

* 简单的变量名缩短：`a`, `b`, `c`
* 移除空格和换行
* 没有字符串加密
* 保留代码逻辑结构

Webpack 打包特征：

* 模块化结构：`(function(modules) { ... })`
* 模块 ID 映射
* `__webpack_require__` 函数
* 源码映射注释

#### 6.2 本案例使用的混淆工具

根据代码特征分析，本案例使用的是 obfuscator.io，配置参数可能是：

```
{
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
}
```

关键配置说明：

* `stringArray: true` - 启用字符串数组
* `stringArrayEncoding: ['rc4']` - 使用 RC4 加密
* `stringArrayRotate: true` - 旋转字符串数组
* `controlFlowFlattening: true` - 控制流平坦化
* `identifierNamesGenerator: 'hexadecimal'` - 十六进制变量名

### 七、反混淆工具推荐

#### 7.1 在线工具

1. deobfuscate.io

   * 网址：<https://deobfuscate.io/>
   * 特点：专门针对 obfuscator.io 的反混淆
   * 支持：字符串解密、变量重命名、控制流还原
   * 使用：直接粘贴代码，点击 Deobfuscate
2. obf-io.deobfuscate.io

   * 网址：<https://obf-io.deobfuscate.io/>
   * 特点：另一个针对 obfuscator.io 的工具
   * 支持：自动识别混淆配置
   * 使用：上传文件或粘贴代码
3. de4js

   * 网址：<https://lelinhtinh.github.io/de4js/>
   * 特点：支持多种混淆格式
   * 支持：Packer, Eval, JSFuck, JJencode, AAencode
   * 使用：选择混淆类型，粘贴代码

#### 7.2 命令行工具

1. js-beautify

   ```
   npm install -g js-beautify
   js-beautify input.js -o output.js
   ```
2. prettier

   ```
   npm install -g prettier
   prettier --write input.js
   ```
3. babel

   ```
   npm install -g @babel/cli @babel/preset-env
   babel input.js --out-file output.js
   ```

#### 7.3 浏览器插件

1. Chrome DevTools

   * 内置格式化功能
   * 支持断点调试
   * 可以查看变量值
2. Firefox Developer Tools

   * 类似 Chrome DevTools
   * 更好的性能分析

### 八、实战技巧

#### 8.1 快速定位关键代码

在大量混淆代码中，如何快速找到关键逻辑？

技巧1：搜索关键字符串

即使字符串被加密，也可以通过特征搜索：

```
// 搜索 URL 特征
/https?:\/\//

// 搜索 API 端点
/api|endpoint|request/

// 搜索加密相关
/encrypt|decrypt|cipher|aes|rsa/
```

技巧2：查找网络请求

在浏览器 Network 面板中：

1. 找到关键的 API 请求
2. 在 Initiator 中查看调用栈
3. 定位到发起请求的代码位置

技巧3：使用 debugger 语句

在可疑位置插入 debugger：

```
// 在混淆代码中插入
if(someCondition) {
  debugger;  // 程序会在这里暂停
}
```

技巧4：Hook 关键函数

拦截关键函数的调用：

```
// Hook XMLHttpRequest
var originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  console.log('XHR:', method, url);
  debugger;
  return originalOpen.apply(this, arguments);
};

// Hook fetch
var originalFetch = window.fetch;
window.fetch = function(url, options) {
  console.log('Fetch:', url, options);
  debugger;
  return originalFetch.apply(this, arguments);
};
```

#### 8.2 处理反调试技术

混淆代码可能包含反调试措施。

常见反调试技术：

1. 检测 DevTools

   ```
   // 检测窗口大小变化
   setInterval(function() {
   if(window.outerWidth - window.innerWidth > 100) {
   debugger;  // 检测到 DevTools 打开
   }
   }, 1000);
   ```

绕过方法：

```
// 在 Console 中禁用 debugger
Object.defineProperty(window, 'debugger', {
  get: function() { return function() {}; }
});
```

2. 无限 debugger 循环

   ```
   setInterval(function() {
   debugger;
   }, 100);
   ```

绕过方法：

* 在 DevTools 中右键 debugger 语句
* 选择 "Never pause here"
* 或者禁用所有断点

3. 时间检测

   ```
   var start = Date.now();
   debugger;
   if(Date.now() - start > 100) {
   // 检测到调试器
   }
   ```

绕过方法：

```
// Hook Date.now
var originalNow = Date.now;
Date.now = function() {
  return originalNow.call(this);
};
```

#### 8.3 批量处理技巧

处理大量混淆代码时的效率技巧。

技巧1：使用正则批量替换

```
// 替换十六进制数字
code = code.replace(/0x([0-9a-f]+)/gi, (match, hex) => {
  return parseInt(hex, 16);
});

// 替换转义字符
code = code.replace(/\\x([0-9a-f]{2})/gi, (match, hex) => {
  return String.fromCharCode(parseInt(hex, 16));
});
```

技巧2：使用 AST 工具

```
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// 解析代码
const ast = parser.parse(code);

// 遍历 AST
traverse(ast, {
  StringLiteral(path) {
    // 处理字符串节点
    if(path.node.value.startsWith('\\x')) {
      // 解码十六进制字符串
    }
  },
  NumericLiteral(path) {
    // 处理数字节点
  }
});

// 生成代码
const output = generate(ast);
```

技巧3：编写自动化脚本

```
const fs = require('fs');

function deobfuscate(inputFile, outputFile) {
  let code = fs.readFileSync(inputFile, 'utf8');

  // 步骤1：格式化
  code = beautify(code);

  // 步骤2：解密字符串
  code = decryptStrings(code);

  // 步骤3：重命名变量
  code = renameVariables(code);

  // 步骤4：简化表达式
  code = simplifyExpressions(code);

  fs.writeFileSync(outputFile, code);
}

deobfuscate('input.js', 'output.js');
```

### 九、总结

#### 9.1 混淆技术总结

本文分析的混淆技术包括：

1. 基础混淆

   * 字符串十六进制编码
   * 变量名混淆
   * 数字十六进制化
2. 中级混淆

   * 字符串数组化
   * Base64 编码
   * 控制流平坦化
3. 高级混淆

   * RC4 流加密
   * 字符串数组旋转
   * 反调试技术

这些技术组合使用，可以达到很好的混淆效果。

#### 9.2 反混淆方法总结

反混淆的主要方法：

1. 自动化工具

   * 在线反混淆工具
   * 命令行工具
   * 浏览器插件
2. 手动分析

   * 代码格式化
   * 字符串解密
   * 变量重命名
   * 逻辑还原
3. 动态调试

   * 浏览器 DevTools
   * 断点调试
   * 变量监控
   * 函数 Hook
4. 批量处理

   * 正则表达式
   * AST 工具
   * 自动化脚本

#### 9.3 注意事项

在学习和使用这些技术时，请注意：

1. 合法合规

   * 仅用于学习和研究
   * 不要用于非法目的
   * 尊重知识产权
   * 遵守法律法规
2. 技术道德

   * 不要恶意破坏
   * 不要窃取数据
   * 不要传播恶意代码
   * 负责任地使用技术
3. 持续学习

   * 混淆技术在不断发展
   * 反混淆方法也在进步
   * 保持学习和更新
   * 关注安全动态
4. 实践应用

   * 理论结合实践
   * 多做实际项目
   * 分享学习经验
   * 参与社区讨论

### 十、参考资源

#### 10.1 在线工具

* obfuscator.io - JavaScript 混淆工具
  <https://obfuscator.io/>
* deobfuscate.io - 反混淆工具
  <https://deobfuscate.io/>
* de4js - 多功能反混淆工具
  <https://lelinhtinh.github.io/de4js/>
* JS Beautifier - 代码格式化
  <https://beautifier.io/>

#### 10.2 开源项目

* javascript-obfuscator
  <https://github.com/javascript-obfuscator/javascript-obfuscator>
* babel
  <https://github.com/babel/babel>
* terser
  <https://github.com/terser/terser>
* uglify-js
  <https://github.com/mishoo/UglifyJS>

---

本文档仅用于技术学习和安全研究，请勿用于非法用途。

作者：[MacXK]

[脚本练手地址](https://raw.githubusercontent.com/Yuheng0101/X/main/Scripts/kuwo.js)

如有问题或建议，欢迎在吾爱论坛讨论交流。
喜欢请给个免费的评分，谢谢各位吾爱友友！
