# 基于 AST 手撕 xm-sign 生成逻辑：从环境补全到代码深度解析

> **作者**: 板砖亲你头 | **发布时间**: 2025-10-11 14:40:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3532 / 8
> **原文**: [https://www.52pojie.cn/thread-2065208-1-1.html](https://www.52pojie.cn/thread-2065208-1-1.html)

---

## 基于 AST 手撕 sign 生成逻辑：从环境补全到代码深度解析

### 一、sign 与 AST 的核心价值

书接上文（音频网站逆向如何进行捞偏门https://www.52pojie.cn/thread-2031462-1-1.html (出处: 吾爱破解论坛)）
在逆向工程与爬虫开发领域，**sign** 是典型反爬签名机制，广泛应用于音频、视频类平台的接口请求中。其核心作用是通过对请求参数进行多轮加密、压缩处理，生成唯一的 `sign` 签名，验证请求合法性，抵御恶意爬取行为。

#### 1.1 sign 逆向的核心难点

sign 的生成逻辑通常被封装在 **高度混淆的 JavaScript 代码** 中，常见混淆手段包括：

* 变量名加密（如 `_0x383a33`、`_0x292fa3` 等无意义标识符）
* 控制流平坦化（用 `switch-case` 打散正常逻辑顺序）
* 字符串加密（关键密钥、常量通过自定义函数加密存储）
* 浏览器环境依赖（`atob`、`encodeURIComponent` 等 API）

直接阅读和复现这类代码效率极低，且易因手动修改引入错误。

#### 1.2 AST 的解决方案价值

**抽象语法树（AST，Abstract Syntax Tree）** 是 JavaScript 代码的结构化表示，可将非线性的混淆代码转化为可遍历、可修改的树形结构，解决逆向痛点：

1. **自动化解混淆**：批量还原变量名、重组控制流、解密字符串，摆脱手动操作；
2. **精准定位逻辑**：快速定位加密函数（如 `AES`）、参数处理步骤（如 `compress`）；
3. **跨语言复现**：基于清晰的 AST 分析结果，可无缝将 JS 逻辑复现为 Python、Java 等语言。

### 二、第一步：环境补全——模拟浏览器与依赖库

sign 生成依赖浏览器原生 API 与第三方库，需先搭建 Node.js 模拟环境，补全所有依赖项。

#### 2.1 核心依赖清单

| 依赖类型 | 具体依赖 | 作用 | 模拟/安装方式 |
| --- | --- | --- | --- |
| 浏览器原生 API | `atob`、`encodeURIComponent` | Base64 解码、URI 编码 | 全局对象 |
| 第三方库 | CryptoJS | AES 加密/解密核心库 | 安装 npm 包 `CryptoJS` |
| 第三方库 | pako | zlib 压缩（DEFLATE 算法） | 安装 npm 包 `pako` |
| AST 工具链 | @babel/parser、@babel/traverse | AST 解析、遍历与修改 | 安装 Babel 生态相关 npm 包 |

#### 2.2 环境搭建步骤

##### 步骤 1：初始化 Node.js 项目

```
# 创建项目目录并初始化
mkdir sign-ast && cd sign-ast
npm init -y
```

##### 步骤 2：安装核心依赖

```
# AST 工具链（解析、遍历、生成）
npm install @babel/parser @babel/traverse @babel/generator @babel/types
```

### 三、第二步：获取混淆代码与 AST 工具准备

#### 3.1 抓取混淆代码（以 Chrome 为例）

1. 打开目标平台，按 `F12` 打开 **开发者工具**；
2. 切换到 **Network** 面板，筛选 **JS** 类型请求；
3. 触发包含 `***-sign` 的接口，找到命名含 `sdk`、`sign` 的 JS 文件（如 `***2.0.0.js`）；
4. 点击该文件，复制 **Response** 标签页中的完整代码，保存为 `obfuscated.js`（混淆代码文件）。

#### 3.2 AST 工具链与可视化

##### 3.2.1 核心工具库功能

| 库名 | 核心作用 | 关键 API 示例 |
| --- | --- | --- |
| `@babel/parser` | 将 JS 代码解析为 AST 树 | `parse(code, { sourceType: 'script' })` |
| `@babel/traverse` | 遍历 AST 树并修改节点 | `traverse(ast, { Identifier(path) {} })` |
| `@babel/generator` | 将修改后的 AST 重新生成 JS 代码 | `generate(ast, { comments: false })` |
| `@babel/types` | 创建/判断 AST 节点类型（辅助工具） | `t.stringLiteral('key')` |

##### 3.2.2 AST 可视化工具

推荐使用 [AST Explorer](https://astexplorer.net/)（在线工具），配置如下：

* **Language**：选择 `JavaScript`
* **Parser**：选择 `@babel/parser`
* **Transform**：选择 `@babel/traverse`

将混淆代码粘贴到左侧，右侧可实时查看 AST 结构，快速定位节点类型（如 `Identifier` 变量节点、`CallExpression` 函数调用节点）。

### 四、第三步：基于 AST 解混淆——还原核心逻辑

解混淆是逆向的核心环节，通过 AST 分三步逐步还原代码可读性：**变量名还原(不重要)**、**控制流平坦化还原**、**字符串解密**。

#### 4.1 步骤 1：字符串解密（还原密钥与常量）

混淆代码可能将关键字符串（函数(0x567^0x789)）加密存储。

##### 实现代码

```
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const { decrypt } = require("./decrypt.js");
const { memberExpression } = require("@babel/types");
globalThis.generator = require("@babel/generator").default;
// 混淆js代码文件
const encode_file = "./encode.js";
// 反混淆js代码文件
const decode_file = "./decode.js";

let js_code = fs.readFileSync(encode_file, {
  encoding: "utf-8",
});
let ast = parser.parse(js_code);

const visitor1 = {
  BinaryExpression(path) {
    const { value, confident } = path.evaluate();
    if (confident) {
      path.replaceWith(types.valueToNode(value));
    }
  },
};
.....
traverse(ast, visitor1);
// 将处理后的ast转化为js代码，compact = 'minified' or 'concise'。是否压缩代码
let { code } = generator(ast);
fs.writeFile(decode_file, code, () => {});
```

#### 4.2 步骤 2：控制流平坦化还原（重组逻辑顺序）

部分混淆代码会用 `while-switch` 结构打散逻辑（控制流平坦化），例如：

```
// 混淆后的控制流
let _0xabc = 0;
while (1) {
  switch (_0xabc) {
    case 0:
      _0xdef = encodeURIComponent(_0xghi);
      _0xabc = 1;
      break;
    case 1:
      _0xjkl = decodeUriSpecial(_0xdef);
      _0xabc = 2;
      break;
    case 2:
      _0x mno = stringToUint8Array(_0xjkl);
      _0xabc = 3;
      break;
    // ... 其他 case
  }
}
```

##### 还原思路与代码

1. 找到控制流变量（如 `_0xabc`）；
2. 按 `case` 顺序提取代码块；
3. 用顺序执行代码替换 `while-switch` 结构：

### 五、第四步：sign 生成逻辑深度解析（基于还原代码）

经过 AST 解混淆后，sign 的生成逻辑清晰呈现，整体分为 **8个核心步骤**，从参数构造到签名生成形成完整闭环。

#### 5.1 完整流程拆解（JS 还原代码）

```
import pako from "pako";
import CryptoJS from "crypto-js";
import axios from "axios";

const objectToJson = function (_0x332989, _0x29cee8) {
  return JSON.stringify(_0x332989, null, _0x29cee8);
};

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 解码URI编码的字符串（支持%XX和%uXXXX格式）
function decodeUriSpecial(str) {
  let result = "";
  const len = str.length;
  let i = 0;

  while (i < len) {
    let char = str[i];

    // 处理%开头的编码
    if (char === "%") {
      let hexStr = "";

      // 检测%uXXXX格式（Unicode编码）
      if (i <= len - 6 && str[i + 1] === "u") {
        hexStr = str.substring(i + 2, i + 6); // 提取4位十六进制数
      }
      // 检测普通%XX格式
      else if (i <= len - 3) {
        hexStr = str.substring(i + 1, i + 3); // 提取2位十六进制数
      }

      // 验证十六进制有效性
      if (/^[0-9A-Fa-f]+$/.test(hexStr)) {
        const code = parseInt(hexStr, 16);
        char = String.fromCharCode(code);

        // 跳过已处理的编码部分
        if (hexStr.length === 4) {
          i += 6; // %uXXXX共6个字符
          result += char;
          continue;
        } else if (hexStr.length === 2) {
          i += 3; // %XX共3个字符
          result += char;
          continue;
        }
      }
    }

    // 非编码字符直接拼接
    result += char;
    i++;
  }

  return result;
}

// 将字符串转换为Uint8Array（结合上述解码函数）
function _stringToUint8Array(str) {
  // 1. 先对字符串进行URI编码
  const encoded = encodeURIComponent(str);
  // 2. 使用自定义解码器处理编码后的字符串
  const decoded = decodeUriSpecial(encoded);
  // 3. 拆分字符并获取每个字符的Unicode编码
  const charCodes = [];
  for (let i = 0; i < decoded.length; i++) {
    charCodes.push(decoded.charCodeAt(i));
  }
  // 4. 转换为Uint8Array
  return new Uint8Array(charCodes);
}

const _compress = function (_0x383a33) {
  return pako.deflate(_0x383a33, {
    level: 6,
  });
};

const _aeEn = function (_0x1a4a6f, _0x292fa3) {
  let _0x29b5e5 = CryptoJS.enc.Utf8.parse(_0x292fa3);
  return CryptoJS.AES.encrypt(_0x1a4a6f, _0x29b5e5, {
    iv: _0x29b5e5,
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

const _aeDe = function (_0x42bf9a, _0x24981f) {
  let _0x10ec79 = CryptoJS.enc.Utf8.parse(_0x24981f);
  return CryptoJS.AES.decrypt(_0x42bf9a, _0x10ec79, {
    iv: _0x10ec79,
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

const processHexString = function (hexStr, key) {
  // 假设 _aeDe 是一个解密或解码函数，返回十六进制字符串
  const decodedHex = _aeDe(hexStr, key); // _0x3d8670 可能是待处理数据，_0x1c7038 可能是密钥

  // 如果处理后的字符串为空，返回null
  if (decodedHex.length <= 0) {
    return null;
  }

  // 将十六进制字符串转换为字节数组（Number[]）
  const bytes = [];
  // 每次取2个字符（一个十六进制字节）
  for (let i = 0; i < decodedHex.length; i += 2) {
    // 截取2个字符，转为16进制整数（0-255范围）
    const byte = parseInt(decodedHex.substr(i, 2), 16);
    bytes.push(byte);
  }

  // 将字节数组转换为目标格式（推测是WordArray或其他二进制格式）
  return fromBytes(bytes);
};
const fromBytes = function (byteArray) {
  const charArray = [];
  // 遍历字节数组中的每个元素（每个元素是 0-255 的整数）
  for (let i = 0; i < byteArray.length; i++) {
    // 将每个字节值转换为对应的字符
    charArray.push(String.fromCharCode(byteArray[i]));
  }
  // 将字符数组合并为完整字符串并返回
  return charArray.join("");
};

const _base64ToArrayBuffer = function (_0x5cf3f5) {
  const binaryString = atob(_0x5cf3f5);
  const length = binaryString.length;
  const uint8Array = new Uint8Array(length);

  // 2. 循环遍历字符串，填充 Uint8Array
  for (let i = 0; i < length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  // 3. 返回 ArrayBuffer
  return uint8Array.buffer;
};

const _getProcessData = function (_0x2017a4, _0x4057be) {
  let str = objectToJson(_0x2017a4, 0);
  let _0x1134e3 = _stringToUint8Array(str);
  let _0x311c22 = _compress(_0x1134e3);
  let _0x49dc27 = CryptoJS.lib.WordArray.create(_0x311c22.buffer);
  let _0x536148 = _aeEn(_0x49dc27, _0x4057be);
  let buffer = _base64ToArrayBuffer(_0x536148);
  return buffer;
};

let arrayBufferToBase64 = function (buffer) {
  // 将 ArrayBuffer 转换为 Uint8Array
  const uint8Array = new Uint8Array(buffer);

  // 逐个字符转换为 ASCII 字符串
  let binary = "";
  uint8Array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  // 使用 btoa() 进行 Base64 编码
  return btoa(binary);
};

const params = {
    浏览器信息，自己找
};
const host_url =
  "校验url，自己找";

const xm_sign_gen = function (code) {
  let obj = JSON.parse(processHexString(code, "key 自己找"));
  return `${obj["cadd"]}&&${obj["sid"]}`;
};

const getXm_sign = () => {
  axios
    .post(host_url, _getProcessData(params, "key 自己找"))
    .then((res) => {
      if (res.status == 200) {
        console.log(xm_sign_gen(res.data));
      } else {
        console.error("失败");
      }
    });
};

getXm_sign();
```

#### 5.2 关键步骤避坑点

1. **zlib 压缩格式**：`pako.deflate` 默认生成 **纯 DEFLATE 数据**（无 zlib 头尾部）
2. **AES 模式细节**：ECB 模式不依赖 IV，但代码中仍传入 `iv: keyBytes`（仅为兼容，实际解密时可忽略）；
3. **请求体类型**：`ArrayBuffer` 对应的 HTTP `Content-Type` 为 `application/octet-stream`，不可改为 `application/json`；
4. **UUID 生成**：URL 中的 `r` 参数为 UUID4（随机生成），需确保与 JS `generateUUID` 逻辑一致（Python 可用 `uuid.uuid4()`）。

### 六、第五步：Python 复现与验证

基于 AST 解析的清晰逻辑，将 JS 代码复现为 Python，核心依赖 `requests`（网络请求）、`pycryptodome`（AES 加密）、`zlib`（压缩）。

#### 6.1 完整 Python 代码

```
import base64
import json
import re
import uuid
import zlib

import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

def object_to_json(data: dict, indent: int) -> str:
    """对应 JS 的 objectToJson：JSON 序列化，保持 indent 一致"""
    return json.dumps(data, indent=indent, separators=(',', ':'), ensure_ascii=False)

def generate_uuid() -> str:
    """对应 JS 的 generateUUID：生成 UUID4（与 JS 格式完全一致）"""
    return str(uuid.uuid4())

def decode_uri_special(encoded_str: str) -> str:
    """对应 JS 的 decodeUriSpecial：处理 %XX 和 %uXXXX 格式的 URI 解码"""
    result = []
    i = 0
    len_str = len(encoded_str)

    while i < len_str:
        char = encoded_str[i]
        if char == '%':
            # 处理 %uXXXX（Unicode 编码，4 位十六进制）
            if i + 5 <= len_str and encoded_str[i + 1] == 'u':
                hex_str = encoded_str[i + 2:i + 6]  # 提取 %u 后的 4 位十六进制
                if re.match(r'^[0-9A-Fa-f]{4}$', hex_str):
                    code = int(hex_str, 16)
                    result.append(chr(code))
                    i += 6  # 跳过 %uXXXX（共 6 个字符）
                    continue
            # 处理 %XX（普通字节编码，2 位十六进制）
            elif i + 2 <= len_str:
                hex_str = encoded_str[i + 1:i + 3]
                if re.match(r'^[0-9A-Fa-f]{2}$', hex_str):
                    code = int(hex_str, 16)
                    result.append(chr(code))
                    i += 3  # 跳过 %XX（共 3 个字符）
                    continue
        # 非编码字符直接添加
        result.append(char)
        i += 1
    return ''.join(result)

def string_to_uint8_array(s: str) -> bytes:
    """对应 JS 的 _stringToUint8Array：字符串 → 类似 Uint8Array 的 bytes"""
    # 1. 对应 JS 的 encodeURIComponent
    encoded = requests.utils.quote(s, safe='')  # safe='' 确保所有特殊字符都被编码
    # 2. 自定义 URI 解码
    decoded = decode_uri_special(encoded)
    # 3. 取每个字符的 Unicode 编码，转 bytes（Python bytes 等效于 Uint8Array）
    return bytes(ord(c) for c in decoded)

def compress(data: bytes) -> bytes:
    """对应 JS 的 _compress：zlib 压缩（level=6，纯 DEFLATE 格式）"""
    # wbits=15 表示纯 DEFLATE 压缩（无 zlib 头尾），与 pako.deflate 一致
    return zlib.compress(data, level=6)

def ae_en(data: bytes, key: str) -> str:
    """对应 JS 的 _aeEn：AES-ECB-PKCS7 加密，返回 Base64 字符串"""
    # 1. 密钥转 UTF-8 bytes（对应 CryptoJS.enc.Utf8.parse）
    key_bytes = key.encode('utf-8')
    # 2. AES-ECB 初始化（ECB 模式忽略 IV，与 JS 行为一致）
    cipher = AES.new(key_bytes, AES.MODE_ECB)
    # 3. PKCS7 填充（AES 块大小 16）
    padded_data = pad(data, AES.block_size)
    # 4. 加密 → Base64 编码
    encrypted_bytes = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted_bytes).decode('utf-8')

def ae_de(encrypted_str: str, key: str) -> str:
    """对应 JS 的 _aeDe：AES-ECB-PKCS7 解密，返回 UTF-8 字符串"""
    # 1. 密钥转 UTF-8 bytes
    key_bytes = key.encode('utf-8')
    # 2. Base64 解码加密数据
    encrypted_bytes = base64.b64decode(encrypted_str)
    # 3. AES-ECB 初始化
    cipher = AES.new(key_bytes, AES.MODE_ECB)
    # 4. 解密 → 去除 PKCS7 填充 → UTF-8 解码
    decrypted_bytes = cipher.decrypt(encrypted_bytes)
    unpadded_data = unpad(decrypted_bytes, AES.block_size)
    return unpadded_data.decode('utf-8')

def from_bytes(byte_array: bytes) -> str:
    """对应 JS 的 fromBytes：字节数组 → 字符串（单字节映射）"""
    # 用 latin-1 解码（0-255 字节直接映射 Unicode 字符，与 JS String.fromCharCode 一致）
    return byte_array.decode('latin-1')

def base64_to_array_buffer(base64_str: str) -> bytes:
    """对应 JS 的 _base64ToArrayBuffer：Base64 → 类似 ArrayBuffer 的 bytes"""
    # Base64 解码直接得到 bytes（Python bytes 等效于 ArrayBuffer）
    return base64.b64decode(base64_str)

def get_process_data(params: dict, key: str) -> bytes:
    """对应 JS 的 _getProcessData：整合流程，返回请求体 bytes"""
    # 1. params → JSON 字符串（indent=0，对应 objectToJson）
    json_str = object_to_json(params, indent=0)
    # 2. 字符串 → Uint8Array（bytes）
    uint8_array = string_to_uint8_array(json_str)
    # 3. 压缩（zlib）
    compressed_data = compress(uint8_array)
    # 4. 直接用压缩后的 bytes 加密（跳过 WordArray 包装，因 bytes 已等效二进制数据）
    encrypted_base64 = ae_en(compressed_data, key)
    # 5. Base64 → ArrayBuffer（bytes）
    return base64_to_array_buffer(encrypted_base64)

def xm_sign_gen(code: str, key: str = "key 自己找") -> str:
    """对应 JS 的 xm_sign_gen：解密并生成 xm_sign"""
    # 1. 解密得到十六进制字符串 → 转 bytes
    decoded_hex = ae_de(code, key)
    if not decoded_hex:
        raise ValueError("解密结果为空")
    obj = json.loads(decoded_hex)
    # 4. 拼接 cadd 和 sid
    return f"{obj['cadd']}&&{obj['sid']}"

def get_xm_sign(uuid):
    """对应 JS 的 getXm_sign：发送 POST 请求并获取 xm_sign"""
    # 1. 定义参数和密钥（与 JS 一致）
    params = {
         浏览器信息，自己找
    }
    key = "加密key 自己找"
    host_url = f"url 自己找"

    # 2. 生成请求体（bytes 类型，与 JS 一致）
    request_body = get_process_data(params, key)

    # 3. 发送 POST 请求（对应 axios.post）
    try:
        response = requests.post(
            url=host_url,
            data=request_body,  # requests 自动处理 bytes 类型的请求体
            timeout=10
        )
        # 4. 处理响应（状态码 200 则生成 xm_sign）
        if response.status_code == 200:
            # 响应数据可能是 bytes 或 str，统一按 str 处理
            response_data = response.text if isinstance(response.text, str) else response.content.decode('utf-8')
            xm_sign = xm_sign_gen(response_data, key)
            return xm_sign
        else:
            print(f"请求失败，状态码：{response.status_code}")
    except Exception as e:
        print(f"请求异常：{str(e)}")

if __name__ == "__main__":
    xm_sign = get_xm_sign(generate_uuid())
    print(xm_sign)
```

#### 6.2 验证方法

1. **参数一致性验证**：对比 Python 与 JS 生成的 `request_body`（Base64 编码后），若完全一致则参数处理逻辑正确；
2. **签名一致性验证**：分别用 JS 和 Python 生成 `sign`，若结果相同则整体逻辑复现正确；
3. **接口调用验证**：将 Python 生成的 `sign` 传入目标接口请求头，若返回 200 则签名有效。

### 七、合规提示

1. **合法边界**：<span style="color: red">逆向与爬虫开发需遵守《中华人民共和国网络安全法》《数据安全法》，不得突破平台反爬措施窃取敏感数据；</span>
2. **授权原则**：<span style="color: red">仅对获得合法授权的系统进行逆向分析，禁止用于恶意攻击或商业竞争；</span>
3. **技术研究**：<span style="color: red">本文技术仅用于学习 AST 与逆向工程原理，请勿用于非法用途。</span>
