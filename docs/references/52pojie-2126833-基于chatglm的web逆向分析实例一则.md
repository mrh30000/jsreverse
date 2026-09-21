# 基于chatglm的web逆向分析实例一则

> **作者**: liyitong | **发布时间**: 2026-09-07 17:02:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1205 / 8
> **原文**: [https://www.52pojie.cn/thread-2126833-1-1.html](https://www.52pojie.cn/thread-2126833-1-1.html)

---

*本帖最后由 liyitong 于 2026-9-11 23:30 编辑*

起因：

> https://www.52pojie.cn/thread-1857089-1-1.html
> 不能用了，一看是接口没了，于是一顿搜索，又找了个能用的，谢谢好心人。

目标网站：文中涉及相关网站，以URL代替。
提交数据，cookie是空。
"encrypted": "mNrpwm25DgVvhcsS2H1xZGFC1ir50m7a/EGWG+UXWnhcjYf7ubphqTNDZvj0KuczO2vYBcpqB7rT2KPKmF8sPUTItKc\*\*\*\*\*\*\*\*\*\*\*\*\*\*"
在调试器中搜索encrypted，未找到结果。

![](https://attach.52pojie.cn/forum/202609/07/161423ayn4n4oek7eboklk.png)

然后从源代码顺着路径找，显然(index)，查看源代码，果然是混淆过了。

![](https://attach.52pojie.cn/forum/202609/07/162659brvzru0rkwlkz22z.png)

找一个js在线返混淆的工具，解密结果如下：

[JavaScript] *纯文本查看*

```
var a =  URL;
var i = "Yx9#mK2$pL7@qN4^";
var j = "Bw5&hT8!vR3%jM6*";
// TOLOOK
setInterval(function () {
  p();
}, 4000);
function k(a) {
  var b = CryptoJS.enc.Utf8.parse(i);
  var c = CryptoJS.enc.Utf8.parse(j);
  var d = CryptoJS.AES.encrypt(a, b, {
    iv: c,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return d.toString();
}
Date.prototype.Format = function (a) {
  var b = {
    "M+": this.getMonth() + 1,
    "d+": this.getDate(),
    "h+": this.getHours(),
    "m+": this.getMinutes(),
    "s+": this.getSeconds(),
    "q+": Math.floor((this.getMonth() + 3) / 3),
    S: this.getMilliseconds()
  };
  if (/(y+)/.test(a)) {
    a = a.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for (var c in b) {
    if (new RegExp("(" + c + ")").test(a)) {
      a = a.replace(RegExp.$1, RegExp.$1.length == 1 ? b[c] : ("00" + b[c]).substr(("" + b[c]).length));
    }
  }
  return a;
};
var l = 0;
function m(a) {
  var b = new Date().Format("yyyy-MM-dd hh:mm:ss");
  $("#result-div").append(b + ": " + a);
  $("#result-div").append("<br/>");
}
function n() {
  console.log("date", l, a, a - l, l - new Date().getTime() > 5000);
  if (l == 0) {
    return true;
  }
  var a = new Date().getTime();
  if (a - l > 5000) {
    return true;
  }
  return false;
}
$("#submit").click(function () {
  if (!n()) {
    alert("不要提交的太频繁哦");
    return;
  }
  $("#submit").attr("readonly", "readonly");
  var a = $("#user").val();
  var b = $("#password").val();
  var c = $("#step").val();
  var d = k(JSON.stringify({
    ups1: a,
    ups2: b,
    ups3: c,
    timestamp: new Date().getTime()
  }));
  $.ajaxSetup({
    contentType: "application/x-www-form-urlencoded; charset=UTF-8"
  });
  var e = generateToken();
  var f = {
    encrypted: d
  };
  $.ajax({
    url: URL,
    method: "POST",
    cache: false,
    dataType: "json",
    data: f,
    beforeSend: function () {
      m("提交中...");
    },
    success: function (a) {
      console.log(a);
      m("请求结果:" + a.msg);
    },
    error: function (a) {
      m("请刷新再试，如多次尝试失败，请暂用闪步用户端");
    },
    complete: function (d) {
      console.log(d);
      m("结束");
      m("======================================");
      $("#submit").removeAttr("readonly");
      o(a, b, c);
      l = new Date().getTime();
    }
  });
});
function o(a, b, c) {
  $("#user").val(a);
  $("#password").val(b);
  $("#step").val(c);
}
$(document).ready(function () {
  $("#defaultForm").bootstrapValidator({
    message: "This value is not valid",
    feedbackIcons: {
      valid: "glyphicon glyphicon-ok",
      invalid: "glyphicon glyphicon-remove",
      validating: "glyphicon glyphicon-refresh"
    },
    fields: {
      user: {
        message: "用户名无效",
        validators: {
          notEmpty: {
            message: "用户名不能为空"
          },
          stringLength: {
            min: 3,
            max: 32,
            message: "用户名必须大于3，小于32个字符"
          },
          emailAddress: {
            message: "请输入有效的邮箱地址"
          }
        }
      },
      password: {
        validators: {
          notEmpty: {
            message: "密码不能为空"
          }
        }
      },
      step: {
        validators: {
          notEmpty: {
            message: "步数不能为空"
          },
          numeric: {
            message: "请输入有效的数字"
          },
          between: {
            min: 1,
            max: 99999,
            message: "步数必须在1-99999之间"
          }
        }
      }
    }
  });
  $("#validateBtn").click(function () {
    $("#defaultForm").bootstrapValidator("validate");
  });
  $("#resetBtn").click(function () {
    $("#user").val("");
    $("#password").val("");
    $("#step").val("");
    $("#defaultForm").bootstrapValidator("resetForm", true);
  });
});
```

可以看到最后提交的数据，前3个是在页面上输入，最后一个数据是funtion k()过来的。
于是丢给chatglm，主要是function k()的逻辑过程。

[JavaScript] *纯文本查看*

```
function k(a) {
  var b = CryptoJS.enc.Utf8.parse(i);   // i = "Yx9#mK2$pL7@qN4^"  → AES KEY
  var c = CryptoJS.enc.Utf8.parse(j);   // j = "Bw5&hT8!vR3%jM6*"  → AES IV
  var d = CryptoJS.AES.encrypt(a, b, {
    iv: c,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return d.toString();                  // 输出 Base64 密文（OpenSSL 格式）
}
```

1.功能定位

[JavaScript] *纯文本查看*

```
var d = k(JSON.stringify({
  ups1: a,          // Zepp Life 账号（邮箱）
  ups2: b,          // Zepp Life 密码（明文！）
  ups3: c,          // 目标步数
  timestamp: new Date().getTime()   // 当前毫秒时间戳
}));// 然后 POST 到 [color=#ff0000]URL[/color].php，参数名 encrypted，值为 d
```

2.加密算法细节：
项目    值
算法    AES-128-CBC
Key     "Yx9#mK2$pL7@qN4^"（16 字节）
IV        "Bw5&hT8!vR3%jM6\*"（16 字节，固定写死）
填充    PKCS7
输出    d.toString() = Base64 密文
因为它用的是固定 Key + 固定 IV 的 CBC 模式，所以**同样明文永远得到同样密文**，纯前端可逆。服务端用同一对 Key/IV 做 AES 解密即可拿到账号密码。
解密等价于：

[JavaScript] *纯文本查看*

```
var decrypted = CryptoJS.AES.decrypt(d, CryptoJS.enc.Utf8.parse(i), {
  iv: CryptoJS.enc.Utf8.parse(j),
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7
}).toString(CryptoJS.enc.Utf8);
```

3. 配套的防重放逻辑
    timestamp 打进密文里，服务端大概率校验"时间戳与服务器时间差"，防止抓包重放；
    checkSubmitStatus() / 变量 l：前端限制 5 秒内只能提交一次（a - l > 5000）；
    generateToken()（来自 tokenJM.js）：把时间换算成东八区（getTime() + getTimezoneOffset()\*60000 + 8h），再算出 年 × (月 + 日) + 日 × 时 × 分 的一个整数作为动态 token，随请求一起提交——本质是"按北京时间每分钟变化"的校验值。
然后我们假设a=1,b=2,c=3，问d值是如何构造的。**d 的生成过程详解**
（1）输入

> var a = 1;  // 账号（实际应是邮箱，这里假设为 1）var b = 2;  // 密码，假设为 2var c = 3;  // 步数，假设为 3

（2）JSON.stringify 组装明文

> JSON.stringify({
>   ups1: a,        // ups1: 1
>   ups2: b,        // ups2: 2
>   ups3: c,        // ups3: 3
>   timestamp: new Date().getTime()
> })
> JSON.stringify 会把对象序列化成**紧凑字符串**（键之间没有空格）。假设 new Date().getTime() 返回 1735660800000，则明文字符串为：
> {"ups1":1,"ups2":2,"ups3":3,"timestamp":1735660800000}

（3）进入加密函数k()

> function k(a) {
>   var b = CryptoJS.enc.Utf8.parse(i);   // ① 解析 Key
>   var c = CryptoJS.enc.Utf8.parse(j);   // ② 解析 IV
>   var d = CryptoJS.AES.encrypt(a, b, {  // ③ 加密
>     iv: c,
>     mode: CryptoJS.mode.CBC,            // CBC 模式
>     padding: CryptoJS.pad.Pkcs7         // PKCS7 填充
>   });
>   return d.toString();                  // ④ 转 Base64 字符串
> }

> ①Key的解析
> i = "Yx9#mK2$pL7@qN4^"   // 16 个 ASCII 字符 = 16 字节
> Utf8.parse 把它转成 CryptoJS 内部的 WordArray（二进制字数组）。AES-128 要求密钥必须是 128/192/256 位，这里 16 字节 = **128 位**，正好合法。
> ②IV 的解析
> > j = "Bw5&hT8!vR3%jM6\*"   // 同样 16 字节 = 128 位
> > CBC 模式需要一个与分组同长的初始向量（IV），它让相同明文在相同 Key 下也能产生不同密文——**但这里 IV 是写死的常量**，所以这个"防重放"作用实际等于零。
>
> **③**分组加密过程（AES-128-CBC + PKCS7）明文 54 字节不是 16 的整数倍（16×3=48，54-48=6），需要填充。
> **PKCS7 填充规则**：差 n 个字节就补 n 个值为 n 的字节。54 字节明文 → 差 10 字节补到 64
> 补的内容：10 个字节，每个都是 0x0A（十进制 10）
> 填充后的明文块结构：
> 块1: {"ups1":1,"ups2 (16字节)
> 块2: ":2,"ups3":3,"tim (16字节)
> 块3: estamp":1735660800 (16字节)
> 块4: 000}\x0A×10         (16字节)
> 然后逐块加密：
> C1 = AES\_encrypt(P1 XOR IV)          ← 第一个块与 IV 异或
> C2 = AES\_encrypt(P2 XOR C1)          ← 后续块与前一个密文块异或
> C3 = AES\_encrypt(P3 XOR C2)
> C4 = AES\_encrypt(P4 XOR C3)
> 每一步 AES\_encrypt 内部是标准的 AES 轮函数（10 轮：SubBytes → ShiftRows → MixColumns → AddRoundKey），结果得到 **64 字节的密文**。
> **④** 输出 Base64
> d.toString() 默认调用 CryptoJS.enc.Base64.stringify()，把 64 字节二进制密文编码成 Base64 字符串：64 字节 → ceil(64/3)×4 = 88 个字符（无填充符，因为 64 % 3 = 1，会有两个 "=="）
> 实际上 64 字节 = 21 组×3 + 1 字节 → 21×4 + 4 = 88 字符，末尾 "=="

（4）最终结果

> var d = "某个 88 字符左右的 Base64 字符串，例如：";
> d = "t8fJ2kQ9xR...=="
> 由于 Key/IV/明文都是确定的，这次加密的输出是**完全确定**的——同样的输入再来一次，得到的 d 一模一样。

（5）d的去向

[JavaScript] *纯文本查看*

```
var f = { encrypted: d };
$.ajax({
  url: "URL.php",
  method: "POST",
  data: f,          // 表单编码：encrypted=t8fJ2kQ9xR...%3D%3D
  dataType: "json"
});
```

服务端拿到 encrypted 后，用同一对硬编码的 Key/IV 做 AES-128-CBC 解密 + 去 PKCS7 填充，还原出 JSON：
{"ups1":1,"ups2":2,"ups3":3,"timestamp":1735660800000}
然后校验 timestamp 是否新鲜、token 是否正确，再拿 ups1/ups2 去 Zepp Life 登录、提交步数 ups3。
**一句话**：
d 就是把「账号+密码+步数+时间戳」的 JSON 字符串，用写死的 AES-128-CBC 密钥/初始向量加密后，再 Base64 编码得到的密文字符串——纯前端可逆，密钥公开，任何人都能解出/伪造这段数据。d = AES(JSON.stringify({a,b,c,时间戳}))，**d 的内容就是 a、b、c 的密文**。服务端解密 d 才能知道你提交的账号密码和步数。所以正确的函数签名就是你说的 def tijiao(a, b, c)——只是内部要先算出 d。
完整链路：a,b,c → JSON.stringify → AES-128-CBC加密 → Base64 → 作为 encrypted 字段 POST。
然后把数据提交的状态告诉chatglm：

> {
>         "requestHeaders": {
>                 "headers": [
>                         {
>                                 "name": "Accept",
>                                 "value": "application/json, text/javascript, \*/\*; q=0.01"
>                         },
>                         {
>                                 "name": "Accept-Encoding",
>                                 "value": "gzip, deflate, br, zstd"
>                         },
>                         {
>                                 "name": "Accept-Language",
>                                 "value": "zh,en-US;q=0.7,en;q=0.3"
>                         },
>                         {
>                                 "name": "Connection",
>                                 "value": "keep-alive"
>                         },
>                         {
>                                 "name": "Content-Length",
>                                 "value": "126"
>                         },
>                         {
>                                 "name": "Content-Type",
>                                 "value": "application/x-www-form-urlencoded; charset=UTF-8"
>                         },
>                         {
>                                 "name": "Host",
>                                 "value": "bs.yanwan.store"
>                         },
>                         {
>                                 "name": "Origin",
>                                 "value": URL
>                         },
>                         {
>                                 "name": "Priority",
>                                 "value": "u=0"
>                         },
>                         {
>                                 "name": "Referer",
> "value": URL
> },
>                         {
>                                 "name": "Sec-Fetch-Dest",
>                                 "value": "empty"
>                         },
>                         {
>                                 "name": "Sec-Fetch-Mode",
>                                 "value": "cors"
>                         },
>                         {
>                                 "name": "Sec-Fetch-Site",
>                                 "value": "same-origin"
>                         },
>                         {
>                                 "name": "User-Agent",
>                                 "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"
>                         },
>                         {
>                                 "name": "X-Requested-With",
>                                 "value": "XMLHttpRequest"
>                         }
>                 ]
>         }
> }这是请求头。{
>         "responseHeaders": {
>                 "headers": [
>                         {
>                                 "name": "access-control-allow-headers",
>                                 "value": "Content-Type"
>                         },
>                         {
>                                 "name": "access-control-allow-methods",
>                                 "value": "GET, POST, OPTIONS"
>                         },
>                         {
>                                 "name": "access-control-allow-origin",
> "value": URL
> },
>                         {
>                                 "name": "cache-control",
>                                 "value": "no-store, no-cache, must-revalidate, max-age=0"
>                         },
>                         {
>                                 "name": "content-encoding",
>                                 "value": "gzip"
>                         },
>                         {
>                                 "name": "content-length",
>                                 "value": "97"
>                         },
>                         {
>                                 "name": "content-type",
>                                 "value": "application/json; charset=utf-8"
>                         },
>                         {
>                                 "name": "date",
>                                 "value": "Sun, 06 Sep 2026 17:59:34 GMT"
>                         },
>                         {
>                                 "name": "expires",
>                                 "value": "0"
>                         },
>                         {
>                                 "name": "pragma",
>                                 "value": "no-cache"
>                         },
>                         {
>                                 "name": "server",
>                                 "value": "nginx"
>                         },
>                         {
>                                 "name": "vary",
>                                 "value": "Accept-Encoding"
>                         },
>                         {
>                                 "name": "x-cache",
>                                 "value": "BYPASS"
>                         },
>                         {
>                                 "name": "X-Firefox-Spdy",
>                                 "value": "h2"
>                         }
>                 ]
>         }
> }这是打开网页时候的响应头。cookie是空的。{
>         "encrypted": "mNrpwm25DgVvhcsS2H1xZGFC1ir50m7a/EGWG+UXWnhcjYf7ubphqTNDZvj0KuczO2vYBcpqB7rT2KPKmF8sPUTItKc885Du4Uo+T1DJlmI="
> }这是post提交数据时候的请求。应该不涉及token

chatglm思考如下：

> 确认：POST 只有一个字段 encrypted，不涉及 token
>
> 你的抓包验证了这一点。还有个细节可以对上：Content-Length: 126 = encrypted=（10 字符）+ Base64 密文（108 字符）+ URL 编码多出的字符（+→%2B、/→%2F 等），说明请求体确实只有这一个参数。服务端校验只依赖密文里的 timestamp。
>
> 顺便可以从密文长度反推：Base64 长 108 字符 → 80 字节密文 → 明文 65~80 字节，正好对应 {"ups1":"邮箱","ups2":"密码","ups3":"步数","timestamp":13位毫秒} 的长度，与我们还原的格式吻合。

然后让它按照整个思路写一份Python代码：

[Python] *纯文本查看*

```
# pip install pycryptodome requests
import json
import time
import base64
import datetime
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# ===== 前端写死的常量 =====
AES_KEY = b"Yx9#mK2$pL7@qN4^"
AES_IV  = b"Bw5&hT8!vR3%jM6*"
URL     = URL

# ===== 完全按你抓到的请求头还原 =====
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "zh,en-US;q=0.7,en;q=0.3",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": URL,
    "Referer": URL",
    "X-Requested-With": "XMLHttpRequest",
    # Connection / Accept-Encoding / Sec-Fetch-* 由 requests 自动处理，无需手写
}

def aes_encrypt(plaintext: str) -> str:
    """对应 JS 的 k()：AES-128-CBC + PKCS7 → Base64"""
    cipher = AES.new(AES_KEY, AES.MODE_CBC, AES_IV)
    return base64.b64encode(
        cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))
    ).decode()

def aes_decrypt(b64_text: str) -> str:
    """反向解密，可用于验证抓包到的 encrypted 内容"""
    cipher = AES.new(AES_KEY, AES.MODE_CBC, AES_IV)
    return unpad(
        cipher.decrypt(base64.b64decode(b64_text)), AES.block_size
    ).decode("utf-8")

def tijiao(a, b, c) -> dict:
    """
    a: Zepp Life 账号(邮箱)
    b: Zepp Life 密码
    c: 目标步数
    返回服务端 JSON，如 {"code":..., "msg":...}
    """
    # 1. 组装明文（与 JSON.stringify 一致：紧凑、无空格、值均为字符串）
    payload = json.dumps(
        {
            "ups1": str(a),
            "ups2": str(b),
            "ups3": str(c),
            "timestamp": int(time.time() * 1000),
        },
        separators=(",", ":"),
    )
    print("[提交中...]")

    # 2. 生成密文
    encrypted = aes_encrypt(payload)

    # 3. POST，请求体只有 encrypted 一个字段
    try:
        resp = requests.post(URL, data={"encrypted": encrypted},
                             headers=HEADERS, timeout=15)
    except requests.RequestException as e:
        print("请求失败:", e)
        print("请刷新再试，如多次尝试失败，请暂用闪步用户端")
        return {"code": -1, "msg": "network error"}

    # 4. 解析 JSON 响应
    try:
        result = resp.json()
    except ValueError:
        result = {"code": -2, "msg": "响应非JSON", "raw": resp.text[:200]}

    print("[请求结果]", result.get("msg", result))
    print("[结束]")
    print("=" * 38)
    return result

if __name__ == "__main__":
    # 先用抓包数据验证加密实现是否正确：
    captured = ("mNrpwm25DgVvhcsS2H1xZGFC1ir50m7a/EGWG+UXWnhcjYf7ubphqTNDZvj0Kucz"
                "O2vYBcpqB7rT2KPKmF8sPUTItKc885Du4Uo+T1DJlmI=")
    print("抓包密文解密结果：")
    print(aes_decrypt(captured))   # 应输出 {"ups1":"...","ups2":"...","ups3":"...","timestamp":...}

    # 正式提交
    # print(tijiao("your_email@example.com", "your_password", "20000"))
```

执行结果：

![](https://attach.52pojie.cn/forum/202609/11/232817zy7mzvtdrydhl6ou.png)
