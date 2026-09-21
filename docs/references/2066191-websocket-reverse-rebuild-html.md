# WebSocket通信逆向实战：加解密剖析与完整HTML重构（内附源码）

> **作者**: LiSAimer | **发布时间**: 2025-10-16 13:53:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5491 / 28
> **原文**: [https://www.52pojie.cn/thread-2066191-1-1.html](https://www.52pojie.cn/thread-2066191-1-1.html)

---

### 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

### 前言

难得遇到个用websocket的网站，但遇到了都是比较恶心人的，以这个网站为例，记录一下分析过程，加解密不难，难的是websocket的消息处理还原html，话不多说，开搞！

### 逆向目标

目标网站：
aHR0cDovL3d3dy5jcnNjLmNuL2cyNjcwL202MDkzL21wMS5hc3B4

关键要点：
aes加密、通信消息获取与还原

### 过无限debugger

开局一个无限debugger

![](https://attach.52pojie.cn/forum/202510/16/134741t0fhqyfynxx3l8z7.png)

两种方法过

第一种无脑型：

直接右键选择 Never pause here

![](https://attach.52pojie.cn/forum/202510/16/134744nv2xwxxjtqjwy3iy.png)

第二种钻研型：

往上跟一个栈进入js文件

![](https://attach.52pojie.cn/forum/202510/16/134747v2cklz3iyiq21g3x.png)

把这段函数 r 混淆解一下看看

```
function r(e) {
    if (false) {
        return function(e) {}["constructor"]("while (true) {}")["apply"]("counter")
    }
    ("" + (e / e))["length"] !== 1 || e % 20 === 0 ? function() {
        return !0
    }["constructor"]("debugger")["call"]("action") : function() {
        return !1
    }["constructor"]("debugger")["apply"]("stateObject"),
    r(++e)
}
```

第一部分：永远不会执行的代码（迷惑性代码）

```
if (false) {
        return function(e) {}["constructor"]("while (true) {}")["apply"]("counter")
    }
}
```

第二部分：核心逻辑（反调试）

```
("" + (e / e))["length"] !== 1 || e % 20 === 0
```

如果 e 是 0（或非法值），或者 e 是 20 的倍数，则执行第一个分支；否则执行第二个分支。

条件为真时：

```
function() { return !0 }["constructor"]("debugger")["call"]("action")
```

条件为假时：

```
function() { return !1 }["constructor"]("debugger")["apply"]("stateObject")
```

这两段代码本质相同，都是：
利用函数的 constructor（即 Function）动态创建一个包含 "debugger" 语句的函数
然后立即调用它（.call() 或 .apply()）
Function("debugger")() 等价于直接写 debugger;
所以无论哪个分支，都会执行 debugger 语句

最后再递归调用 r(++e)
对 e 自增 1导致函数无限递归下去（直到栈溢出或触发调试器）

原理弄清了就能想到很多技巧绕过了

不想打开控制台每次都右键绕过debugger

要么写hook脚本注入

```
Function.prototype.constructor = function(){}
```

或者

```
const originalConstructor = Function.prototype.constructor;
Function.prototype.constructor = function (val) {
    if (val == "debugger") {
        return function (){};
    }
    return originalConstructor(a);
};
```

要么修改替换js文件
往上再跟栈可以找到执行 r 函数的位置
直接注释掉就行了

![](https://attach.52pojie.cn/forum/202510/16/134749hegepp2z3zyjj4pp.png)

### 抓包分析

sessions接口
载荷加密

![](https://attach.52pojie.cn/forum/202510/16/134751shnenuvhvic2gzie.png)

响应也是加密的

![](https://attach.52pojie.cn/forum/202510/16/134753sbt7f7tj0fh6x6ff.png)

然后是websocket请求

![](https://attach.52pojie.cn/forum/202510/16/134757ecpn01j16t0n3n46.png)

ws链接也是有加密的

![](https://attach.52pojie.cn/forum/202510/16/134759ohwhh6olhd5s5ol5.png)

### 加解密分析

打上xhr断点刷新页面

![](https://attach.52pojie.cn/forum/202510/16/134802d34vngcepgwvp9vc.png)

可以看到发送请求前的加密载荷

再往上跟栈找加密位置

发现请求整体是在sessionData方法中处理

![](https://attach.52pojie.cn/forum/202510/16/134804tjvztj9e55swev5j.png)

在Promise第一行代码打上断点进去看看

![](https://attach.52pojie.cn/forum/202510/16/134808aq8i34imu53m5ui4.png)

f 就是我们所需的载荷
通过encryptSessions方法加密而来

把这段代码还原如下

```
var f = S["encryptSessions"](JSON.stringify(N));
```

再看看要加密的参数 N
只有cid、tabId、uuid是动态随机生成的
\_ 需要拼接cid
referrer和url是要访问的列表页地址
全都写死也是可以的

![](https://attach.52pojie.cn/forum/202510/16/134810agbgbz55iij1gbam.png)

N 参数的生成位置就在Promise上方

![](https://attach.52pojie.cn/forum/202510/16/134813v994jn5m5j87554n.png)

随机代码

```
import uuid
import random
import string

def random_id(self, k):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=k))

self.cid = self.random_id(8)
self.tab_id = self.random_id(10)
self._uuid = str(uuid.uuid4())
```

进入encryptSessions方法分析

![](https://attach.52pojie.cn/forum/202510/16/134815svoq14916ie1cctt.png)

还原看看

```
function (e) {
    if (!this.priKey || !this.iv)
        return "";
    return this["_dynamicEncrypt"](e, this.priKey, this.iv)
}
```

还要进\_dynamicEncrypt方法

![](https://attach.52pojie.cn/forum/202510/16/134817ea41ovd4lnnvbofj.png)

继续还原

```
function (e, t, n) {
    var u = c['createCipheriv']("aes-128-cbc", t, n)
    , l = u["update"](e, "utf8", "base64");
    return l += u["final"]("base64"),
    l["replace"](/\//g, "_")
}
```

很明显了

标准的aes-128-cbc加密
接着我们要找到 key 和 iv
分析可知 key 是固定的 iv 每次都不一样
重点找下iv的生成逻辑

回到 f 位置
鼠标放在 S 上可以看到 iv 早已生成了

![](https://attach.52pojie.cn/forum/202510/16/134820y8tq6ui7vue68e17.png)

往上在刚进入sessionData处打上断点

![](https://attach.52pojie.cn/forum/202510/16/134823amvkmk6n6koztmhe.png)

getKey方法执行完后 S 中就有key值了

![](https://attach.52pojie.cn/forum/202510/16/134825rxmwf1vv7xxx78jx.png)

继续往下走

![](https://attach.52pojie.cn/forum/202510/16/134827nkkk6adakka6z0o6.png)

执行完genrandomString方法 S 就有 iv了

![](https://attach.52pojie.cn/forum/202510/16/134830wi5ibpifb1po59p9.png)

进方法看看

![](https://attach.52pojie.cn/forum/202510/16/134833stjdumz31oxesbnd.png)

还原

```
functio() {
    var i = Math["random"]()["toString"](36)["slice"](-8) + "-" + Math["random"]()["toString"](36)["slice"](-8) + (new Date)["getTime"]();
    var s = this["_dynamicEncrypt"](i, C, w)["replace"]("_", "");
    return this.iv = s["substring"](1, 17),
    this.iv
}
```

创建一个随机字符串还是用上面的aes加密
这次用的key 和 iv 是固定的

![](https://attach.52pojie.cn/forum/202510/16/134835lq9fm4omtz21u7m2.png)

生成的就是我们需要的动态 iv 值
还原代码如下

```
def random_iv(self):
    part1 = self.random_id(8)
    part2 = self.random_id(8)
    timestamp = str(int(time.time() * 1000))
    crypto = AesCbcCrypto(b"E08247708934F42E", b"0A234C4C639E015D")
    encrypt_info = crypto.aes_encrypt(f"{part1}-{part2}{timestamp}")
    return encrypt_info[1:17].encode()
```

请求看看结果
注意请求头headers中需要有Fetch-Mode和etag（动态 iv 值）

![](https://attach.52pojie.cn/forum/202510/16/134837ys3i8yqcuiycr99o.png)

### websocket分析

ws链接

```
ws://www.****.cn/1ywuKELSO2ahQuWZ/pr/8XIdWc356kGBPGt7xGkFZKdv19oQMigyzm9H3A3Wupo%3D/b/ws/af10no7t8e/095f5c9f-0945-414d-aace-d4f60167807f

8XIdWc356kGBPGt7xGkFZKdv19oQMigyzm9H3A3Wupo%3D  sessions接口返回的token值
af10no7t8e  tab_id
095f5c9f-0945-414d-aace-d4f60167807f  uuid
```

跟着ws请求的堆栈进去

![](https://attach.52pojie.cn/forum/202510/16/134840cfqk5pnjj3pcfq3q.png)

![](https://attach.52pojie.cn/forum/202510/16/134842d262pjw9w8hp9pr9.png)

在这里可以看到创建了websocket的实例以及四个关键事件注册回调函数
onmessage 是收到服务器消息时触发的回调函数
这里绑定到了this.\_onMessage方法里

![](https://attach.52pojie.cn/forum/202510/16/134844k43u0xm9mdc2n2z0.png)

一步步来看看

![](https://attach.52pojie.cn/forum/202510/16/134847xiznzjzejejn9m7s.png)

用 t = this 保存当前实例引用（避免在回调中 this 指向错误）
lastSyncTime记录最后一次收到消息的时间（用于心跳、超时判断等）
n 获取原始消息数据
如果：
window.\_\_wm\_wsNoBinary\_\_ 为真
消息是 JSON 字符串，用 JSON.parse(n) 解析
否则：
消息是二进制数据（ArrayBuffer）先转为Uint8Array，再用r.decode解码
接着遍历解码后的消息进行处理

![](https://attach.52pojie.cn/forum/202510/16/134849dwyyhr727fyptkef.png)

e[1][1]是取当前消息的指令
a.CommandCodes 是指令集如下

```
{
    "TAB_OPS": 0,
    "DOM_EVENT": 4,
    "DOM_METHOD": 5,
    "RESET_DOM": 6,
    "ADD_DOC_TYPE": 7,
    "ADD_HTML_ELEMENT": 8,
    "ADD_SVG_ELEMENT": 9,
    "ADD_NS_ELEMENT": 10,
    "MOVE_ELEMENT": 11,
    "SHUFFLE_CHILDREN": 12,
    "EDIT_ELEMENT": 13,
    "DELETE_ELEMENT": 14,
    "ADD_STYLE": 15,
    "ADD_TEXT": 16,
    "MODIFY_TEXT": 17,
    "MODIFY_PROPERTY": 18,
    "MODIFY_ATTRIBUTES": 19,
    "SET_SELECTIONS": 20,
    "INSERT_RULE": 21,
    "DELETE_RULE": 22,
    "DISABLED_STYLE": 24,
    "SET_CANVAS_DATA": 23,
    "WEBRTC": 30,
    "NAVIGATE": 31,
    "SYNC": 32,
    "SYNC_COOKIE": 34,
    "FILE": 35,
    "TAB_ACTIVE": 42,
    "NATIVE_METHOD": 44,
    "MODIFY_DOC_TYPE": 47,
    "CHANGE_BLOCK": 48,
    "RELOAD": 49,
    "SYNC_ALL_COOKIE": 50,
    "SYNC_WRITE_COOKIE": 51,
    "MEDIA_STATE": 52,
    "DOM_READY": 53,
    "AUGMENT_CSS": 54,
    "MULTI_CMD": 55,
    "REDIRECT_REQUEST": 56,
    "TEXTAREA_RESIZE": 57,
    "SIMPLE_HTML": 58
}
```

o = e[0] → 消息的序列号（seq number）
如果e[1][1]等于a.CommandCodes.SYNC（32）
执行 \_cleanUpPendingQueue(i) 清除已确认的消息（ACK 机制）

i = e[1][2] → 服务器确认已收到的客户端最新的消息内容
c = e[1][3] → 是否需要客户端重发（布尔值）

如果 c 为真且服务器确认的消息序列小于本地记录的 lastClientSeqNum：
说明服务器丢失了部分客户端消息
打印警告日志
重置 lastClientSeqNum = i
调用 \_sendPendingMessages() 重新发送未确认的消息

![](https://attach.52pojie.cn/forum/202510/16/134851sb050k8ccn0nunss.png)

先说eles
如果收到的 seq 跳过了中间某些号（比如期望 5，却收到 8）
说明中间消息丢失或乱序
如果当前未处于同步状态（!t.syncing）
打印警告日志
构造一条 SYNC 请求消息
[-1, ["", "", SYNC, lastServerSeqNum, true]]
-1 表示这条 SYNC 消息本身无 seq
最后一个 true 表示“请服务器重发缺失的消息”
根据是否二进制，用 JSON.stringify 或 r.encode 编码
通过 ws.send(l) 发送给服务器
设置 t.syncing = true 防止重复请求
return：不处理这条乱序消息（等同步完成后再处理）

再说if
如果满足以下任一条件，说明消息是按序到达的
第一条消息（o === 1）
还没收到过任何消息（lastServerSeqNum === 0）
当前 seq 正好是上一条的下一个（o === lastServerSeqNum+ 1）
则
更新 lastServerSeqNum = o
触发回调函数 onmessage

跟着再进onmessage
进入了一个onReceive方法里

![](https://attach.52pojie.cn/forum/202510/16/134854o7mbj97bbmifzblb.png)

碍于篇幅问题，这里就不一步步解释了，直接捡重点的说

![](https://attach.52pojie.cn/forum/202510/16/134856fkgx2x31313z3cte.png)

![](https://attach.52pojie.cn/forum/202510/16/134858ifoqjjqfmkkjvujo.png)

这里将数组类型的消息转为对象类型
看看具体怎么转的

![](https://attach.52pojie.cn/forum/202510/16/134900irak2h2k6kink3ha.png)

先走方法getObjHandler方法
根据e中的指令码从一个映射表中取相对应的转换函数

![](https://attach.52pojie.cn/forum/202510/16/134903ee60r0b11rbbahtz.png)

![](https://attach.52pojie.cn/forum/202510/16/134905y3t3qtd22a9zgao4.png)

转换函数

![](https://attach.52pojie.cn/forum/202510/16/134907oqwqlaw4tldlqqy0.png)

转换成对象类型后再继续往下处理

![](https://attach.52pojie.cn/forum/202510/16/134910lfquhqknchff2hru.png)

MULTI\_CMD指令码55
批量命令，说明需要一次性执行多个子命令

取出content消息集合

![](https://attach.52pojie.cn/forum/202510/16/134912dxx3niz6ghcnnvxf.png)

递归调用i方法处理消息集合

![](https://attach.52pojie.cn/forum/202510/16/134914wgh5tjmy153qtvby.png)

实际是在html创建一个dom元素，再处理指令集合渲染html

![](https://attach.52pojie.cn/forum/202510/16/134916mrzc72vfgg6yb76y.png)

![](https://attach.52pojie.cn/forum/202510/16/134919es4cjxxzguxzix5o.png)

流程弄明白后，接着我们就可以模拟websocket请求
将这些关键的方法进行还原

### python版源代码

```
import json
import time
import uuid
import random
import string
import base64
import msgpack
import requests
import websocket
from loguru import logger
from pyquery import PyQuery as pq
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

class AesCbcCrypto:
    def __init__(self, key, iv):
        self.key = key
        self.iv = iv

    def aes_encrypt(self, plaintext):
        cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
        padded_data = pad(plaintext.encode('utf-8'), AES.block_size)
        ciphertext = cipher.encrypt(padded_data)
        b64 = base64.b64encode(ciphertext).decode('utf-8')
        return b64.replace('/', '_')

    def aes_decrypt(self, encrypted_data):
        ciphertext = base64.b64decode(encrypted_data.replace('_', '/').replace('\n', ''))
        cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
        padded_plaintext = cipher.decrypt(ciphertext)
        plaintext_bytes = unpad(padded_plaintext, AES.block_size)
        return plaintext_bytes.decode('utf-8')

class WebsocketClient:
    def __init__(self, list_ws_url):
        self.html = ''
        self.command_list = []
        self.last_server_seq_num = 0
        self.handle_fun = {
            'converter_to_command': self.converter_to_command,
            'converter_to_object': self.converter_to_object
        }
        # 定义所有命令码
        all_codes = (
            # 数字命令码
            ["6", "34", "51", "50", "35", "31", "44", "16", "7", "47", "18", "19",
             "5", "8", "9", "10", "11", "12", "13", "14", "17", "20", "21", "22",
             "24", "23", "48", "30", "42", "49", "52", "53", "54", "55", "56", "57", "58"] +
            # 4-前缀命令码
            [f"4-{code}"for code in ["drag", "groupdrag", "scroll", "input", "replacetext",
                                      "inserttext", "deletebycut", "copy", "change", "shadow",
                                      "key", "groupmouse", "mouse", "contextmenu", "click",
                                      "selection", "wheel", "paste", "touch", "grouppointer",
                                      "pointer", "forceblur", "forcefocus", "focus",
                                      "fullscreen", "continue"]] +
            # 0-前缀命令码
            [f"0-{code}"for code in ["new", "resize", "nativemethodresult", "inputattack",
                                      "fingerprint", "feedback", "decrypt", "canceldownload",
                                      "filedownloaded", "neterroralert", "suspectedphishing",
                                      "targetlocation", "syncfingerprint", "pop", "newwindow",
                                      "emailuserfeedbackresult", "browseraction", "visible"]]
        )
        self.command_handlers = {code: self.handle_fun for code in all_codes}
        self.ws = websocket.WebSocketApp(list_ws_url, on_message=self.on_message)

    def run(self):
        self.ws.run_forever()

    def close(self):
        self.ws.close()

    def converter_to_command(self, e):
        return [
            e["commandCode"] if e isnotNoneelseNone,
            e["content"] if e isnotNoneelseNone,
            e["config"] if e isnotNoneelseNone
        ]

    def converter_to_object(self, e):
        if len(e) != 3:
            logger.error("MultiCmdMessageConverter#converterToObject The message length is wrong, expectation is 3, the actual is " + len(e))
            returnNone
        return {
            "commandCode": e[0],
            "content": e[1],
            "config": e[2]
        }

    def on_message(self, ws, message):
        unpack_message = msgpack.unpackb(message)
        for msg in unpack_message:
            o = msg[0]
            if o == -1or msg[1][1] == 32:
                self.close()
                self.html = self.format_html()
            elif-1 != o:
                if1 == o or0 == self.last_server_seq_num or o == self.last_server_seq_num + 1:
                    self.last_server_seq_num = o
                    self.on_receive(msg[1])

    def on_receive(self, e):
        r = e[1:]
        obj = self.command_converter_to_obj(r)
        ifnot obj:
            returnNone
        self.command_converter(obj)

    def command_converter(self, e):
        if e['commandCode'] == 55:
            d = json.loads(e['content'])
            for c in d['list']:
                if c['commandCode'] == 8or c['commandCode'] == 16:
                    self.command_list.append(c)

    def get_handle(self, e, t):
        if t:
            n = e + '-' + t.replace('-', '')
            if n in self.command_handlers:
                return self.command_handlers[n]
            logger.error("handler is undefined of handlerName = " + n)
        else:
            logger.error("opsCodeOrType or commandCode is undefined opsCodeOrType==>" + t + " commandCode==> " + e)

    def get_obj_handler(self, e):
        if e[0] == 0:
            return self.get_handle(e[0], e[1])
        elif e[0] == 4:
            return self.get_handle(e[0], e[3])
        elif str(e[0]) in self.command_handlers:
            return self.command_handlers[str(e[0])]
        else:
            returnNone

    def command_converter_to_obj(self, e):
        t = self.get_obj_handler(e)
        if t:
            return t['converter_to_object'](e)
        returnNone

    def format_html(self):
        ifnot self.command_list:
            returnNone
        doc = pq('<html></html>')
        for cmd in self.command_list:
            cmd_code = cmd.get('commandCode')
            nid = cmd.get('nid')
            parent_id = cmd.get('parent')
            if cmd_code == 8andnot parent_id:
                doc('html').attr('nid', f'{nid}')
                continue
            parent = doc(f'*[nid="{parent_id}"]')
            ifnot parent:
                continue
            if cmd_code == 8:
                attrs = ' '.join(f'{a["name"]}="{a["value"]}"'for a in cmd.get('attributes', []))
                tag = cmd.get('tag')
                html = f'<{tag} nid="{nid}" {attrs}></{tag}>'
                parent.append(html)
            elif cmd_code == 16:
                text = cmd.get('textContent', '')
                if text.strip():
                    parent.append(text)
        return doc.outer_html()

class Session:
    def __init__(self):
        self.iv = self.random_iv()
        self.cid = self.random_id(8)
        self.tab_id = self.random_id(10)
        self._uuid = str(uuid.uuid4())
        self.session_url = 'http://www.脱敏处理.cn/1ywuKELSO2ahQuWZ/api/v1/sessions'
        self.ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        self.headers = {
            'Fetch-Mode': self.ua,
            'User-Agent': self.ua,
            'etag': self.iv.decode()
        }

    def random_iv(self):
        part1 = self.random_id(8)
        part2 = self.random_id(8)
        timestamp = str(int(time.time() * 1000))
        crypto = AesCbcCrypto(b"E08247708934F42E", b"0A234C4C639E015D")
        encrypt_info = crypto.aes_encrypt(f"{part1}-{part2}{timestamp}")
        return encrypt_info[1:17].encode()

    def random_id(self, k):
        return''.join(random.choices(string.ascii_lowercase + string.digits, k=k))

    def get_ws_url(self, list_url):
        data = {
            "uuid": self._uuid,
            "url": list_url,
            "cid": self.cid,
            "_": f"{self.ua}|{self.cid}",
            "common": {
                "isPost": False,
                "postBody": "",
                "timeZone": "Asia/Shanghai",
                "tabId": self.tab_id,
                "referrer": "",
                "isReload": False,
                "docType": "<!DOCTYPE html>",
                "screenWidth": 1849,
                "screenHeight": 1080,
                "windowWidth": 1849,
                "windowHeight": 222,
                "isMobile": False,
                "urlPrefix": "http://www.脱敏处理.cn/1ywuKELSO2ahQuWZ/pr/0",
                "cookies": None,
                "zoomFactor": 1,
                "dpr": 1,
                "userAgent": self.ua,
                "platform": "Win32",
                "language": "zh-CN",
                "languages": "zh-CN,zh"
            },
            "extension": {
                "reuse": False,
                "simMode": False
            }
        }
        key = b"QaZB7ddSo0bedGhW"
        logger.info(f'key：{key.decode()}  iv: {self.iv.decode()}  tab_id: {self.tab_id}')
        crypto = AesCbcCrypto(key, self.iv)
        encrypt_data = crypto.aes_encrypt(json.dumps(data, separators=(',', ':')))
        logger.info(f'encrypt payload：{encrypt_data}')
        response = requests.post(self.session_url, headers=self.headers, json={'data': encrypt_data})
        logger.success(f'session response：{response.text}')
        session_data = json.loads(crypto.aes_decrypt(response.json()['data']))
        logger.info(f'decrypt response：{session_data}')
        token = session_data['token']
        ws_list_url = f'ws://www.脱敏处理.cn/1ywuKELSO2ahQuWZ/pr/{token}/b/ws/{self.tab_id}/{self._uuid}'
        return ws_list_url

    def main(self, list_url):
        ws_url = self.get_ws_url(list_url)
        client = WebsocketClient(ws_url)
        client.run()
        logger.info(client.html)

if __name__ == '__main__':
    url = 'http://www.脱敏处理.cn/g2670/m6093/mp1.aspx'             # 列表页url
    # url = 'http://www.脱敏处理.cn/news/tsi_7267_6093_91201.html'  # 详情页url
    Session().main(url)
```

### 结果验证

列表页

![](https://attach.52pojie.cn/forum/202510/16/134922cxnqsvukxddmmq6x.png)

详情页

![](https://attach.52pojie.cn/forum/202510/16/134925bvy6ahjy7jvbybl4.png)
