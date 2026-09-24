# Javascript 加密解密方法

> **作者**: hybpjx | **发布时间**: 2023-08-11 16:29:00 | **版块**: 『编程语言区』 | **查看/回复**: 4244 / 8
> **原文**: [https://www.52pojie.cn/thread-1820070-1-1.html](https://www.52pojie.cn/thread-1820070-1-1.html)

---

Javascript 和 我之前发的 [python加密](https://www.cnblogs.com/zichliang/p/16857694.html)
以及 [go加密](https://www.cnblogs.com/zichliang/p/16653303.html)
解密不一样 不需要导那么多的库
只需要安装几个库 其中需要了解最多的 **crypto-js**

具体就不多介绍了直接上官网
<https://www.npmjs.com/package/crypto-js>

**安装**

```
npm install crypto-js --save-dev
npm install md5 --save-dev
```

## 一些常见的built-in 函数加密

### unescape

unescape() 函数可对通过 escape() 编码的字符串进行解码。

```
let e = escape("始識")
console.log(e) // %u59CB%u8B58
let u = unescape(e)
console.log(u) // 始識
```

### URL编码与解码

```
let e = encodeURI("https://始識的博客")
console.log(e) // https://%E5%A7%8B%E8%AD%98%E7%9A%84%E5%8D%9A%E5%AE%A2
let u = decodeURI(e)
console.log(u) // https://始識的博客
```

### fromCharCode

将 Unicode 编码转为一个字符

```
var n = String.fromCharCode(65);
// A

[101,118,97,108].map(item=>{
    return String.fromCharCode(item)
})
 ['e', 'v', 'a', 'l']
```

## Base64

### btoa atob

```
let e = btoa("https://www.cnblogs.com/zichliang/p/17265960.html")
console.log(e) // // https://%E5%A7%8B%E8%AD%98%E7%9A%84%E5%8D%9A%E5%AE%A2
let u = atob(e)
console.log(u) // https://www.cnblogs.com/zichliang/p/17265960.html
```

### node实现方式

```
// Base64 encoded string
const str = 'https://www.cnblogs.com/zichliang/p/17265960.html';
//b编码
const buffBase64 = Buffer.from(str, 'utf-8').toString('base64');
console.log(buffBase64);

//解码
const buffStr = Buffer.from(buffBase64, 'base64').toString("utf-8");
// print normal string
console.log(buffStr);
```

### 引用 crypto-js 加密模块

```
var CryptoJS = require('crypto-js')

function base64Encode() {
  var srcs = CryptoJS.enc.Utf8.parse(text);
  var encodeData = CryptoJS.enc.Base64.stringify(srcs);
  return encodeData
}

function base64Decode() {
  var srcs = CryptoJS.enc.Base64.parse(encodeData);
  var decodeData = srcs.toString(CryptoJS.enc.Utf8);
  return decodeData
}

var text = "https://www.cnblogs.com/zichliang/p/17265960.html"

var encodeData = base64Encode()
var decodeData = base64Decode()

console.log("Base64 编码: ", encodeData)
console.log("Base64 解码: ", decodeData)

// Base64 编码:  aHR0cHM6Ly93d3cuY25ibG9ncy5jb20vemljaGxpYW5nL3AvMTcyNjU5NjAuaHRtbA==
// Base64 解码:  https://www.cnblogs.com/zichliang/p/17265960.html
```

## MD5

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function MD5Test() {
    var text = "https://www.cnblogs.com/zichliang"
    return CryptoJS.MD5(text).toString()
}

console.log(MD5Test())  // 50177badb579733de56b628ae57fb972
```

## PBKDF2

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function pbkdf2Encrypt() {
    var text = "https://www.cnblogs.com/zichliang"
    var salt = "1234567"
    // key 长度 128，10 次重复运算
    var encryptedData = CryptoJS.PBKDF2(text, salt, {keySize: 128/32,iterations: 10});
    return encryptedData.toString()
}

console.log(pbkdf2Encrypt())  // bcda4be78de797d8f5067331b1a70d40
```

## SHA1

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function SHA1Encrypt() {
    var text = "https://www.cnblogs.com/zichliang"
    return CryptoJS.SHA1(text).toString();
}

console.log(SHA1Encrypt())  // ca481c13d5af7135b69d11ffb0a443a635fbc307
```

## SHA256

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function SHA256Encrypt() {
    var text = "https://www.cnblogs.com/zichliang"
    return CryptoJS.SHA256(text).toString();
}

console.log(SHA256Encrypt())  // 0b16c8942abbf124f6fef65ae145314dd72ed495ede2b95fe0bde722c0e26478
```

或者使用原生JS源代码文件生成
不要问为什么只有这个有js源码，因为这个加密我刚好用到了。

```
function sha256(s) {
    const chrsz = 8
    const hexcase = 0

    function safe_add(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF)
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
        return (msw << 16) | (lsw & 0xFFFF)
    }

    function S(X, n) {
        return (X >>> n) | (X << (32 - n))
    }

    function R(X, n) {
        return (X >>> n)
    }

    function Ch(x, y, z) {
        return ((x & y) ^ ((~x) & z))
    }

    function Maj(x, y, z) {
        return ((x & y) ^ (x & z) ^ (y & z))
    }

    function Sigma0256(x) {
        return (S(x, 2) ^ S(x, 13) ^ S(x, 22))
    }

    function Sigma1256(x) {
        return (S(x, 6) ^ S(x, 11) ^ S(x, 25))
    }

    function Gamma0256(x) {
        return (S(x, 7) ^ S(x, 18) ^ R(x, 3))
    }

    function Gamma1256(x) {
        return (S(x, 17) ^ S(x, 19) ^ R(x, 10))
    }

    function core_sha256(m, l) {
        const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2]
        const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19]
        const W = new Array(64)
        let a, b, c, d, e, f, g, h, i, j
        let T1, T2
        m[l >> 5] |= 0x80 << (24 - l % 32)
        m[((l + 64 >> 9) << 4) + 15] = l
        for (i = 0; i < m.length; i += 16) {
            a = HASH[0]
            b = HASH[1]
            c = HASH[2]
            d = HASH[3]
            e = HASH[4]
            f = HASH[5]
            g = HASH[6]
            h = HASH[7]
            for (j = 0; j < 64; j++) {
                if (j < 16) {
                    W[j] = m[j + i]
                } else {
                    W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16])
                }
                T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j])
                T2 = safe_add(Sigma0256(a), Maj(a, b, c))
                h = g
                g = f
                f = e
                e = safe_add(d, T1)
                d = c
                c = b
                b = a
                a = safe_add(T1, T2)
            }
            HASH[0] = safe_add(a, HASH[0])
            HASH[1] = safe_add(b, HASH[1])
            HASH[2] = safe_add(c, HASH[2])
            HASH[3] = safe_add(d, HASH[3])
            HASH[4] = safe_add(e, HASH[4])
            HASH[5] = safe_add(f, HASH[5])
            HASH[6] = safe_add(g, HASH[6])
            HASH[7] = safe_add(h, HASH[7])
        }
        return HASH
    }

    function str2binb(str) {
        const bin = []
        const mask = (1 << chrsz) - 1
        for (let i = 0; i < str.length * chrsz; i += chrsz) {
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32)
        }
        return bin
    }

    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, '\n')
        let utfText = ''
        for (let n = 0; n < string.length; n++) {
            const c = string.charCodeAt(n)
            if (c < 128) {
                utfText += String.fromCharCode(c)
            } else if ((c > 127) && (c < 2048)) {
                utfText += String.fromCharCode((c >> 6) | 192)
                utfText += String.fromCharCode((c & 63) | 128)
            } else {
                utfText += String.fromCharCode((c >> 12) | 224)
                utfText += String.fromCharCode(((c >> 6) & 63) | 128)
                utfText += String.fromCharCode((c & 63) | 128)
            }
        }
        return utfText
    }

    function binb2hex(binarray) {
        const hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef'
        let str = ''
        for (let i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF)
        }
        return str
    }
    s = Utf8Encode(s)
    return binb2hex(core_sha256(str2binb(s), s.length * chrsz))
}
```

**使用**

```
console.log(sha256('https://www.cnblogs.com/zichliang')) // 0b16c8942abbf124f6fef65ae145314dd72ed495ede2b95fe0bde722c0e26478
```

## HMAC-SHA256

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function HmacSHA256Encrypt() {
    var hash = CryptoJS.HmacSHA256("这是加密信息", "这是秘钥");
    var hashInBase64 = CryptoJS.enc.Base64.stringify(hash);
    return hashInBase64;
}

console.log(HmacSHA256Encrypt())  // qMlLziV3yzjVb3VgwWhbSTYLsCZXTB1jftypu04SUDM=
```

js源代码

```
// To ensure cross-browser support even without a proper SubtleCrypto
// impelmentation (or without access to the impelmentation, as is the case with
// Chrome loaded over HTTP instead of HTTPS), this library can create SHA-256
// HMAC signatures using nothing but raw JavaScript

/* eslint-disable no-magic-numbers, id-length, no-param-reassign, new-cap */

// By giving internal functions names that we can mangle, future calls to
// them are reduced to a single byte (minor space savings in minified file)
var uint8Array = Uint8Array;
var uint32Array = Uint32Array;
var pow = Math.pow;

// Will be initialized below
// Using a Uint32Array instead of a simple array makes the minified code
// a bit bigger (we lose our `unshift()` hack), but comes with huge
// performance gains
var DEFAULT_STATE = new uint32Array(8);
var ROUND_CONSTANTS = [];

// Reusable object for expanded message
// Using a Uint32Array instead of a simple array makes the minified code
// 7 bytes larger, but comes with huge performance gains
var M = new uint32Array(64);

// After minification the code to compute the default state and round
// constants is smaller than the output. More importantly, this serves as a
// good educational aide for anyone wondering where the magic numbers come
// from. No magic numbers FTW!
function getFractionalBits(n) {
    return ((n - (n | 0)) * pow(2, 32)) | 0;
}

var n = 2, nPrime = 0;
while (nPrime < 64) {
    // isPrime() was in-lined from its original function form to save
    // a few bytes
    var isPrime = true;
    // Math.sqrt() was replaced with pow(n, 1/2) to save a few bytes
    // var sqrtN = pow(n, 1 / 2);
    // So technically to determine if a number is prime you only need to
    // check numbers up to the square root. However this function only runs
    // once and we're only computing the first 64 primes (up to 311), so on
    // any modern CPU this whole function runs in a couple milliseconds.
    // By going to n / 2 instead of sqrt(n) we net 8 byte savings and no
    // scaling performance cost
    for (var factor = 2; factor <= n / 2; factor++) {
        if (n % factor === 0) {
            isPrime = false;
        }
    }
    if (isPrime) {
        if (nPrime < 8) {
            DEFAULT_STATE[nPrime] = getFractionalBits(pow(n, 1 / 2));
        }
        ROUND_CONSTANTS[nPrime] = getFractionalBits(pow(n, 1 / 3));

        nPrime++;
    }

    n++;
}

// For cross-platform support we need to ensure that all 32-bit words are
// in the same endianness. A UTF-8 TextEncoder will return BigEndian data,
// so upon reading or writing to our ArrayBuffer we'll only swap the bytes
// if our system is LittleEndian (which is about 99% of CPUs)
var LittleEndian = !!new uint8Array(new uint32Array([1]).buffer)[0];

function convertEndian(word) {
    if (LittleEndian) {
        return (
            // byte 1 -> byte 4
            (word >>> 24) |
            // byte 2 -> byte 3
            (((word >>> 16) & 0xff) << 8) |
            // byte 3 -> byte 2
            ((word & 0xff00) << 8) |
            // byte 4 -> byte 1
            (word << 24)
        );
    } else {
        return word;
    }
}

function rightRotate(word, bits) {
    return (word >>> bits) | (word << (32 - bits));
}

function sha256(data) {
    // Copy default state
    var STATE = DEFAULT_STATE.slice();

    // Caching this reduces occurrences of ".length" in minified JavaScript
    // 3 more byte savings! :D
    var legth = data.length;

    // Pad data
    var bitLength = legth * 8;
    var newBitLength = (512 - ((bitLength + 64) % 512) - 1) + bitLength + 65;

    // "bytes" and "words" are stored BigEndian
    var bytes = new uint8Array(newBitLength / 8);
    var words = new uint32Array(bytes.buffer);

    bytes.set(data, 0);
    // Append a 1
    bytes[legth] = 0b10000000;
    // Store length in BigEndian
    words[words.length - 1] = convertEndian(bitLength);

    // Loop iterator (avoid two instances of "var") -- saves 2 bytes
    var round;

    // Process blocks (512 bits / 64 bytes / 16 words at a time)
    for (var block = 0; block < newBitLength / 32; block += 16) {
        var workingState = STATE.slice();

        // Rounds
        for (round = 0; round < 64; round++) {
            var MRound;
            // Expand message
            if (round < 16) {
                // Convert to platform Endianness for later math
                MRound = convertEndian(words[block + round]);
            } else {
                var gamma0x = M[round - 15];
                var gamma1x = M[round - 2];
                MRound =
                    M[round - 7] + M[round - 16] + (
                        rightRotate(gamma0x, 7) ^
                        rightRotate(gamma0x, 18) ^
                        (gamma0x >>> 3)
                    ) + (
                        rightRotate(gamma1x, 17) ^
                        rightRotate(gamma1x, 19) ^
                        (gamma1x >>> 10)
                    )
                ;
            }

            // M array matches platform endianness
            M[round] = MRound |= 0;

            // Computation
            var t1 =
                (
                    rightRotate(workingState[4], 6) ^
                    rightRotate(workingState[4], 11) ^
                    rightRotate(workingState[4], 25)
                ) +
                (
                    (workingState[4] & workingState[5]) ^
                    (~workingState[4] & workingState[6])
                ) + workingState[7] + MRound + ROUND_CONSTANTS[round]
            ;
            var t2 =
                (
                    rightRotate(workingState[0], 2) ^
                    rightRotate(workingState[0], 13) ^
                    rightRotate(workingState[0], 22)
                ) +
                (
                    (workingState[0] & workingState[1]) ^
                    (workingState[2] & (workingState[0] ^
                        workingState[1]))
                )
            ;

            for (var i = 7; i > 0; i--) {
                workingState[i] = workingState[i - 1];
            }
            workingState[0] = (t1 + t2) | 0;
            workingState[4] = (workingState[4] + t1) | 0;
        }

        // Update state
        for (round = 0; round < 8; round++) {
            STATE[round] = (STATE[round] + workingState[round]) | 0;
        }
    }

    // Finally the state needs to be converted to BigEndian for output
    // And we want to return a Uint8Array, not a Uint32Array
    return new uint8Array(new uint32Array(
        STATE.map(function (val) {
            return convertEndian(val);
        })
    ).buffer);
}

function hmac(key, data) {
    if (key.length > 64)
        key = sha256(key);

    if (key.length < 64) {
        const tmp = new Uint8Array(64);
        tmp.set(key, 0);
        key = tmp;
    }

    // Generate inner and outer keys
    var innerKey = new Uint8Array(64);
    var outerKey = new Uint8Array(64);
    for (var i = 0; i < 64; i++) {
        innerKey[i] = 0x36 ^ key[i];
        outerKey[i] = 0x5c ^ key[i];
    }

    // Append the innerKey
    var msg = new Uint8Array(data.length + 64);
    msg.set(innerKey, 0);
    msg.set(data, 64);

    // Has the previous message and append the outerKey
    var result = new Uint8Array(64 + 32);
    result.set(outerKey, 0);
    result.set(sha256(msg), 64);

    // Hash the previous message
    return sha256(result);
}

// Convert a string to a Uint8Array, SHA-256 it, and convert back to string
const encoder = new TextEncoder("utf-8");

function sign(inputKey, inputData) {
    const key = typeof inputKey === "string" ? encoder.encode(inputKey) : inputKey;
    const data = typeof inputData === "string" ? encoder.encode(inputData) : inputData;
    return hmac(key, data);
}

function hash(str) {
    return hex(sha256(encoder.encode(str)));
}

function hex(bin) {
    return bin.reduce((acc, val) =>
        acc + ("00" + val.toString(16)).substr(-2)
        , "");
}
```

**使用**

```
console.log(hex(sign("秘钥", "数据"))) // qMlLziV3yzjVb3VgwWhbSTYLsCZXTB1jftypu04SUDM=
```

## HMAC

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function HMACEncrypt() {
  var text = "https://www.cnblogs.com/zichliang"
  var key = "secret"
  return CryptoJS.HmacMD5(text, key).toString();
}

console.log(HMACEncrypt())// 20ca7a63f1f4a7047ffd6b722b45319a
```

## DES

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function desEncrypt() {
  var key = CryptoJS.enc.Utf8.parse(desKey),
      iv = CryptoJS.enc.Utf8.parse(desIv),
      srcs = CryptoJS.enc.Utf8.parse(text),
      // CBC 加密模式，Pkcs7 填充方式
      encrypted = CryptoJS.DES.encrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
  return encrypted.toString();
}

function desDecrypt() {
  var key = CryptoJS.enc.Utf8.parse(desKey),
      iv = CryptoJS.enc.Utf8.parse(desIv),
      srcs = encryptedData,
      // CBC 加密模式，Pkcs7 填充方式
      decrypted = CryptoJS.DES.decrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

var text = "https://www.cnblogs.com/zichliang"       // 待加密对象
var desKey = "0123456789ABCDEF"    // 密钥
var desIv = "0123456789ABCDEF"    // 初始向量

var encryptedData = desEncrypt()
var decryptedData = desDecrypt()

console.log("加密字符串: ", encryptedData)
console.log("解密字符串: ", decryptedData)

// 加密字符串:  p+4ovmk1n5YwN3dq5y8VqhngLKW//5MM/qDgtj2SOC6TpJaFgSKEVg==
// 解密字符串:   https://www.cnblogs.com/zichliang
```

## 3DES

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function tripleDesEncrypt() {
  var key = CryptoJS.enc.Utf8.parse(desKey),
      iv = CryptoJS.enc.Utf8.parse(desIv),
      srcs = CryptoJS.enc.Utf8.parse(text),
      // ECB 加密方式，Iso10126 填充方式
      encrypted = CryptoJS.TripleDES.encrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Iso10126
      });
  return encrypted.toString();
}

function tripleDesDecrypt() {
  var key = CryptoJS.enc.Utf8.parse(desKey),
      iv = CryptoJS.enc.Utf8.parse(desIv),
      srcs = encryptedData,
      // ECB 加密方式，Iso10126 填充方式
      decrypted = CryptoJS.TripleDES.decrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Iso10126
      });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

var text = "https://www.cnblogs.com/zichliang"       // 待加密对象
var desKey = "0123456789ABCDEF"    // 密钥
var desIv = "0123456789ABCDEF"    // 偏移量

var encryptedData = tripleDesEncrypt()
var decryptedData = tripleDesDecrypt()

console.log("加密字符串: ", encryptedData)
console.log("解密字符串: ", decryptedData)

// 加密字符串:   pl/nNfpIrejwK+/X87VmGZIbS3kOB+IpFcx/97wpR4AO6q9HGjxb4w==
// 解密字符串:   https://www.cnblogs.com/zichliang
```

## AES

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function aesEncrypt() {
    var key = CryptoJS.enc.Utf8.parse(aesKey),
        iv = CryptoJS.enc.Utf8.parse(aesIv),
        srcs = CryptoJS.enc.Utf8.parse(text),
        // CBC 加密方式，Pkcs7 填充方式
        encrypted = CryptoJS.AES.encrypt(srcs, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return encrypted.toString();
}

function aesDecrypt() {
    var key = CryptoJS.enc.Utf8.parse(aesKey),
        iv = CryptoJS.enc.Utf8.parse(aesIv),
        srcs = encryptedData,
        // CBC 加密方式，Pkcs7 填充方式
        decrypted = CryptoJS.AES.decrypt(srcs, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

var text = "https://www.cnblogs.com/zichliang"       // 待加密对象
var aesKey = "0123456789ABCDEF"   // 密钥，16 倍数
var aesIv = "0123456789ABCDEF"    // 偏移量，16 倍数

var encryptedData = aesEncrypt()
var decryptedData = aesDecrypt()

console.log("加密字符串: ", encryptedData)
console.log("解密字符串: ", decryptedData)

// 加密字符串:  /q8i+1GN8yfzIb8CaEJfDOfDQ74in+XzQZYBtKF2wkAB6dM1qbBZ3HJVlY+kHDE3
// 解密字符串:  https://www.cnblogs.com/zichliang
```

## RC4

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function RC4Encrypt() {
    return CryptoJS.RC4.encrypt(text, key).toString();
}

function RC4Decrypt(){
    return CryptoJS.RC4.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
}

var text = "https://www.cnblogs.com/zichliang"
var key = "12345678ASDFG"

var encryptedData = RC4Encrypt()
var decryptedData = RC4Decrypt()

console.log("加密字符串: ", encryptedData)
console.log("解密字符串: ", decryptedData)

// 加密字符串:  U2FsdGVkX19/bT2W57mzjwoF5Fc3Zb4WiyDU+MiNMmHfdJvZeScl0EW9yJWCPiRrsA==
// 解密字符串:  https://www.cnblogs.com/zichliang
```

## Rabbit

```
// 引用 crypto-js 加密模块
var CryptoJS = require('crypto-js')

function rabbitEncrypt() {
    return CryptoJS.Rabbit.encrypt(text, key).toString();
}

function rabbitDecrypt() {
    return CryptoJS.Rabbit.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
}

var text = "https://www.cnblogs.com/zichliang/p/16653303.html"
var key = "1234567ASDFG"

var encryptedData = rabbitEncrypt()
var decryptedData = rabbitDecrypt()

console.log("加密字符串: ", encryptedData)
console.log("解密字符串: ", decryptedData)

// 加密字符串:  U2FsdGVkX1/pYbHvbNff3/RNpso4yRKIX0XDFta8hoLNxe52K8HSmF+XV8ayYqucTKVPP6AJtGczXS7U9kkxHnw=
// 解密字符串:  https://www.cnblogs.com/zichliang/p/16653303.html
```

## RSA

### 使用 node-rsa

需要安装一个库

> npm install node-rsa

```
// 引用 node-rsa 加密模块
var NodeRSA = require('node-rsa');

function rsaEncrypt() {
    pubKey = new NodeRSA(publicKey,'pkcs8-public');
    var encryptedData = pubKey.encrypt(text, 'base64');
    return encryptedData
}

function rsaDecrypt() {
    priKey = new NodeRSA(privatekey,'pkcs8-private');
    var decryptedData = priKey.decrypt(encryptedData, 'utf8');
    return decryptedData
}

var key = new NodeRSA({b: 512});                    //生成512位秘钥
var publicKey = key.exportKey('pkcs8-public');    //导出公钥
var privatekey = key.exportKey('pkcs8-private');  //导出私钥
var text = "https://www.cnblogs.com/zichliang/p/16653303.html"

var encryptedData = rsaEncrypt()
var decryptedData = rsaDecrypt()

console.log("公钥:\n", publicKey)
console.log("私钥:\n", privatekey)
console.log("加密字符串: ", encryptedData)
console.log("解密字符串: ", decryptedData)

/*
公钥:
 -----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAN7JoMDNvvpB/po2OMSeSKsromfP5EyI
0fAz6XDVwqdTUBwwAArLlqIzmVNK0yi4nlbj5eF+O8ZjRkRQ6xKP/CMCAwEAAQ==
-----END PUBLIC KEY-----
私钥:
 -----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEA3smgwM2++kH+mjY4
xJ5IqyuiZ8/kTIjR8DPpcNXCp1NQHDAACsuWojOZU0rTKLieVuPl4X47xmNGRFDr
Eo/8IwIDAQABAkEArI0Ps6TnIJ9SmZAbYbWSZPjTvYHXuatSpq8eQ+Vb8Ql003G5
Y2FIoWpQX1jQ9/DsxEZ/1u+71bl08z1eONz2KQIhAPgLZOKanhDDaOn5sO7Y2RM3
TyLS08mCGNGQxEhkEttFAiEA5e7bvnrSNh1lcF/QTxkWPGoXb9kxPljm49CfiTS9
PEcCIDzxX7olTwzDVjWWeZhVgxArmK/vqMVrx3lF3lQC8ncZAiBlpY5nSoybd6tc
Xj8MeJ6n3o6112I5mbuYgqXEVhhCCQIgY6vinhOzMF0dX9MNjBm8x1mUCd4XG2TN
QQcOik3RIGw=
-----END PRIVATE KEY-----
加密字符串:  ZolvYwjFqOp1Yldui7rm75mSN5kz7533nc3B3H6xZGQR9v0elhbcjmI9vXaBsgdLNTuyoVk3bfzWfQdeIpvCpcBCTGe1HG9KrSBYDiWJc4vBgVBz8D57/XaS1zjM0kuAJ/ELu4os7XG5lMQbRbFhHXs7zQsIBq6/m2IZdGWx7HjB2jiQBQPMfszdQUOwQA
bM5o7lRvUgdMVaZkEWpOTEybmUX4kxBP5CvNtB86oTRUw+U7Ex7QB8lWj33hoKvh70
解密字符串:  https://www.cnblogs.com/zichliang/p/16653303.html
*/
```

### 使用自带模块crypto:

```
const crypto = require('crypto');
const nodeRSA = require('node-rsa');

// 生成一个1024长度的密钥对
const key = new nodeRSA({b: 1024});
// 导出公钥
const publicKey = key.exportKey('public');
// 导出私钥
const privateKey = key.exportKey('private');

const secret = 'https://www.cnblogs.com/zichliang/p/16653303.html'
// 使用私钥加密，公钥解密
const encrypt = crypto.privateEncrypt(privateKey, Buffer.from(secret));
const decrypt = crypto.publicDecrypt(publicKey, encrypt);

console.log('加密后：', encrypt.toString('base64'));
console.log('解密后：', decrypt.toString());
```

## RSA 长加密

这个加密是真的麻烦 ，而且还需要导入jsencrypt.min.js
这里贴上 GitHub地址 <https://github.com/wangqinglongDo/github_demo/blob/master/libs/jsencrypt.min.js>
对了 还需要补环境 而且解密也不是很好用，如果有大佬知道如何解密的 希望在评论区告诉我

```
var encrypt = new JSEncrypt();
var publickKey = "-----BEGIN PUBLIC KEY-----\
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLFb8qp1vRFvi/qfgi1Wg7Mi8l\
LcpfAc+tgpyD7aFW9QquQVMm/jG1IJZVQ6LsdkI7TiDutMCzOMCBXbdSC9BCIAGA\
L2Sz3cYVlGb1kYSM0ZMcUMIK5eF4Bptke070XHvbi8wArtysJ0l71RHDd786tNbG\
W0hDSw3zAqTErbxFaQIDAQAB\
-----END PUBLIC KEY-----\
"
encrypt.setPublicKey(publickKey);  //设置公钥加密证书
var data = "https://www.cnblogs.com/zichliang/p/17265960.html";
var commonEncodeData = encrypt.encryptLong(data);   // 普通的加密

console.log(commonEncodeData)

var cnEscapeData = window.btoa(window.encodeURIComponent(data));  //base64 解密后的加密
var encryptData = encrypt.encryptLong(cnEscapeData);  //获取加密后数据。
console.log(encryptData)
```
