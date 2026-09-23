# HOOK send 并解密WebSocket 协议

> **作者**: By：刺刀 | **发布时间**: 2018-11-23 01:11:00 | **版块**: 『编程语言区』 | **查看/回复**: 11215 / 11
> **原文**: [https://www.52pojie.cn/thread-827180-1-1.html](https://www.52pojie.cn/thread-827180-1-1.html)

---

*本帖最后由 By：刺刀 于 2018-11-27 14:51 编辑*

## 正在封装客户端. 使其能与Chrome浏览器进行通信 (11/24)

### 参考地址

[WebSocket协议详解及应用](https://blog.csdn.net/SilenceNet/article/details/79662124)
[WebSocket 协议](https://segmentfault.com/a/1190000013298527)

### 分析过程

首先对send 下断点 回到调用函数
[![CallSend.png](https://i.loli.net/2018/11/23/5bf79acacaeab.png)](https://i.loli.net/2018/11/23/5bf79acacaeab.png)
在这里他首先会发送握手包
[![握手包.png](https://i.loli.net/2018/11/23/5bf79ba2b6880.png)](https://i.loli.net/2018/11/23/5bf79ba2b6880.png)
由于我并没有Hook recv 所以不能接受到服务端返回数据. 用了比较笨的办法:
Sec-WebSocket-Key 的固定长度为 24
我先判断了 是否发送了 长为24字节的数据包....
我这里他是分别发送的 整个握手包不是一次发送完.
我不知道你们那里是什么情况
发送握手包的时候 是明文
[![Code1.png](https://i.loli.net/2018/11/23/5bf79ccda61ba.png)](https://i.loli.net/2018/11/23/5bf79ccda61ba.png)
犹豫我这里Sec-WebSocket-Key 是最后发送. 所以我就简单的判断了一下.

> PS: 头顺序无所谓.一旦客户端和服务器都发送了握手信号，如果握手成功,数据传输部分启动。这是双方沟通的渠道，独立于另一方,可随意发送数据。

你们可以依靠服务器返回数据来进行判断 握手是否完成. 嘛 我的先就这样了. 回头再修改.

数据传输格式:
[![传输数据格式.png](https://i.loli.net/2018/11/23/5bf79e4662e08.png)](https://i.loli.net/2018/11/23/5bf79e4662e08.png)

> 分析协议的时候 这里出现了一个小问题: 目前也不知道是什么问题
> 按照协议 他会传输一个2字节的head头
> 在Wireshark中. 能看见 Hook Send的时候并不能看见
> 所以没办法判断数据是否已经传输完毕.

我只能按照Send的发送数据对比Wireshark中的未解密数据
过滤掉握手包后.
第一次调用Send的时候 buf里面的值 为 4字节的 masking-key 解密时候需要使用.
随后调用Send发送密文

#### 解密代码

```
void Decrypt(LPCSTR buf, int len) {

        if (len == 24) {
                status = true;
        }

        if (status) {
                std::string s;
                if (len == 4) {
                        strncpy((char *)g_dec, buf, 4);
                        status1 = true;
                }
                else {
                        if (status1) {
                                for (int i = 0; i < len; i++) {
                                        s += buf[i] ^ g_dec[i % 4];
                                }
                                FILE *fp = fopen("dec.txt", "a");
                                fprintf(fp, "%s\n", s.c_str());
                                fclose(fp);
                                status1 = false;
                        }
                }
        }
}
```

#### 加密原理

[![加密原理.png](https://i.loli.net/2018/11/23/5bf7a1867f6b8.png)](https://i.loli.net/2018/11/23/5bf7a1867f6b8.png)

### 源代码

> 代码已经上传到 github: <https://github.com/hackbayonet/WebSocket>

最终效果图

![](https://attach.52pojie.cn/forum/201811/23/011030yjc3xtoyx1abcsbb.png)
