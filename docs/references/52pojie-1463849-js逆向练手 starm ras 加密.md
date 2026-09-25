# js逆向练手 starm  ras 加密

> **作者**: lihu5841314 | **发布时间**: 2021-06-23 14:46:00 | **版块**: 『编程语言区』 | **查看/回复**: 1946 / 7
> **原文**: [https://www.52pojie.cn/thread-1463849-1-1.html](https://www.52pojie.cn/thread-1463849-1-1.html)

---

[Asm] *纯文本查看*

```
import requests,time
import execjs

key_url = "https://store.steampowered.com/login/getrsakey/"  #公钥url post请求
start_time =time.time()
key_data ={
'donotcache': int(start_time*1000), #经过分析就是时间戳
'username': 'lihu123456'
}
headers = {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36'
}
key_resp = requests.post(url=key_url,headers=headers,data=key_data)
print(key_resp)
# print(key_resp.json())
mod = key_resp.json()['publickey_mod']   #获取公钥   一看network抓的包名字就是getrsakey  一猜都是加密钥匙  rsa加密为非对称加密  通过公钥获取私钥
exp = key_resp.json()['publickey_exp']

node = execjs.get()
pasword = execjs.compile(open('stram.js',encoding="utf-8").read())

password = pasword.call("getpwd","123456",exp,mod)
print(password)
```

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
通过关键字搜索定位到encryptedPassword  RSA关键参数
function getpwd(password,ex,mo) {
var exp = ex;
var mod = mo;
var pubKey = RSA.getPublicKey(mod,exp);
var encryptedPassword = RSA.encrypt(password, pubKey);
return  encryptedPassword
}
#RSA需要2个参数  一个秘密一个pubkey    就是公钥  很好找就找这个加密入口上方  找不到就用搜索  var pubKey = RSA.getPublicKey(mod,exp); 也需要2个参数一看这不是登录抓的第一个getrsakey里面的json里面   直接获取
#参数都有了  需要RSA.encrypt和RSA.getPublicKey进行函数调用加密   用鼠标点在上面进入函数里面 一眼就看到var RSA   直接扣
var RSA = {

getPublicKey: function($modulus\_hex, $exponent\_hex) {
    return new RSAPublicKey($modulus\_hex, $exponent\_hex);
},

encrypt: function($data, $pubkey) {
    if (!$pubkey) return false;
    $data = this.pkcs1pad2($data, ($pubkey.modulus.bitLength() + 7) >> 3);
    if (!$data) return false;
    $data = $data.modPowInt($pubkey.encryptionExponent, $pubkey.modulus);
    if (!$data) return false;
    $data = $data.toString(16);
    if (($data.length & 1) == 1) $data = "0" + $data;
    return Base64.encode(Hex.decode($data));
},

pkcs1pad2: function($data, $keysize) {
    if ($keysize < $data.length + 11) return null;
    var $buffer = [];
    var $i = $data.length - 1;
    while ($i >= 0 && $keysize > 0) $buffer[--$keysize] = $data.charCodeAt($i--);
    $buffer[--$keysize] = 0;
    while ($keysize > 2) $buffer[--$keysize] = Math.floor(Math.random() \* 254) + 1;
    $buffer[--$keysize] = 2;
    $buffer[--$keysize] = 0;
    return new BigInteger($buffer);
}
};然后就发现问题了 return Base64.encode(Hex.decode($data));  一个base64加密   找一下在RSA函数的上方  一看这个包名叫rsa.js  干脆直接全复制  var RSAPublicKey = function($modulus\_hex, $encryptionExponent\_hex) {
this.modulus = new BigInteger($modulus\_hex, 16);
this.encryptionExponent = new BigInteger($encryptionExponent\_hex, 16);
};

var Base64 = {
base64: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
encode: function($input) {
    if (!$input) {
        return false;
    }
    var $output = "";
    var $chr1, $chr2, $chr3;
    var $enc1, $enc2, $enc3, $enc4;
    var $i = 0;
    do {
        $chr1 = $input.charCodeAt($i++);
        $chr2 = $input.charCodeAt($i++);
        $chr3 = $input.charCodeAt($i++);
        $enc1 = $chr1 >> 2;
        $enc2 = (($chr1 & 3) << 4) | ($chr2 >> 4);
        $enc3 = (($chr2 & 15) << 2) | ($chr3 >> 6);
        $enc4 = $chr3 & 63;
        if (isNaN($chr2)) $enc3 = $enc4 = 64;
        else if (isNaN($chr3)) $enc4 = 64;
        $output += this.base64.charAt($enc1) + this.base64.charAt($enc2) + this.base64.charAt($enc3) + this.base64.charAt($enc4);
    } while ( $i < $input . length );
    return $output;
},
decode: function($input) {
    if (!$input) return false;
    $input = $input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    var $output = "";
    var $enc1, $enc2, $enc3, $enc4;
    var $i = 0;
    do {
        $enc1 = this.base64.indexOf($input.charAt($i++));
        $enc2 = this.base64.indexOf($input.charAt($i++));
        $enc3 = this.base64.indexOf($input.charAt($i++));
        $enc4 = this.base64.indexOf($input.charAt($i++));
        $output += String.fromCharCode(($enc1 << 2) | ($enc2 >> 4));
        if ($enc3 != 64) $output += String.fromCharCode((($enc2 & 15) << 4) | ($enc3 >> 2));
        if ($enc4 != 64) $output += String.fromCharCode((($enc3 & 3) << 6) | $enc4);
    } while ( $i < $input . length );
    return $output;
}
};

var Hex = {
hex: "0123456789abcdef",
encode: function($input) {
    if (!$input) return false;
    var $output = "";
    var $k;
    var $i = 0;
    do {
        $k = $input.charCodeAt($i++);
        $output += this.hex.charAt(($k >> 4) & 0xf) + this.hex.charAt($k & 0xf);
    } while ( $i < $input . length );
    return $output;
},
decode: function($input) {
    if (!$input) return false;
    $input = $input.replace(/[^0-9abcdef]/g, "");
    var $output = "";
    var $i = 0;
    do {
        $output += String.fromCharCode(((this.hex.indexOf($input.charAt($i++)) << 4) & 0xf0) | (this.hex.indexOf($input.charAt($i++)) & 0xf));
    } while ( $i < $input . length );
    return $output;
}
};

var RSA = {

getPublicKey: function($modulus\_hex, $exponent\_hex) {
    return new RSAPublicKey($modulus\_hex, $exponent\_hex);
},

encrypt: function($data, $pubkey) {
    if (!$pubkey) return false;
    $data = this.pkcs1pad2($data, ($pubkey.modulus.bitLength() + 7) >> 3);
    if (!$data) return false;
    $data = $data.modPowInt($pubkey.encryptionExponent, $pubkey.modulus);
    if (!$data) return false;
    $data = $data.toString(16);
    if (($data.length & 1) == 1) $data = "0" + $data;
    return Base64.encode(Hex.decode($data));
},

pkcs1pad2: function($data, $keysize) {
    if ($keysize < $data.length + 11) return null;
    var $buffer = [];
    var $i = $data.length - 1;
    while ($i >= 0 && $keysize > 0) $buffer[--$keysize] = $data.charCodeAt($i--);
    $buffer[--$keysize] = 0;
    while ($keysize > 2) $buffer[--$keysize] = Math.floor(Math.random() \* 254) + 1;
    $buffer[--$keysize] = 2;
    $buffer[--$keysize] = 0;
    return new BigInteger($buffer);
}
};然后再试 提示BigInteger未定义  根据缺啥补啥  继续找  搜索定位  进入这个函数  发现这里有100多处调用 一个扣到啥时候去了  直接全复制 代码太长不沾了 然后再调试  #提示navigator未定义  navigator为js内置函数 遇到js内置函数直接定义为navigator = this;  遇到普通的未定义参数定义为空字典 例如 i={}
