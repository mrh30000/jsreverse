# 某 xor + xxtea 加密 jsc 解密记录

> **作者**: omae | **发布时间**: 2024-04-13 15:10:00 | **版块**: 『移动安全区』 | **查看/回复**: 7252 / 6
> **原文**: [https://www.52pojie.cn/thread-1913191-1-1.html](https://www.52pojie.cn/thread-1913191-1-1.html)

---

*本帖最后由 omae 于 2024-4-13 15:14 编辑*

某使用 cocos2dx 编写的模拟经营类游戏，使用 apktool 解包后找到一些 .jsc 文件。通过 frida hook 的方式得到 xxtea 密钥后，尝试直接解密，但解密失败。

使用 16 进制阅读器打开这些 .jsc 文件，发现文件头有疑似 sign 的特征字符串：

![](https://attach.52pojie.cn/forum/202404/13/144958bgj9y9bajgllbuf9.png)

尝试仿照 xxtea 加密的 .luac 文件解密流程，直接删去 sigh 后解密，但仍失败。

搜索该特征字符串，发现 github 上有一个比较新（建立时间约 5 个月前）的repo，在使用示例中出现了该 sign 字符串：

[Shell] *纯文本查看*

```
python js_xxtea_decrypt.py -k Za810xwef83lsa0A -xs "$(echo -en 'netease\x01\x01\x01\xef' | xxd -p)" -xk Wa810xwef83lsa0A enshtak_apktool/assets
```

据此，初步判断 .jsc 文件们使用了 xor + xxtea 的加密方式，目前缺失的信息是 xor\_key。

在正式开始逆向前，初步思考了下：

1. 既然例子中的 xxtea\_key（Za810xwef83lsa0A） 符合常见的 .jsc 密钥格式（长度为 16 的随机数字字母字符串），xor\_sign 内容是真实的，那么 xor\_key（Wa810xwef83lsa0A）大概率也是某个 apk 的真实加密密钥。

2. 例子中的 xxtea\_key 和 xor\_key 格式类似。如果 xxtea\_key 是被随机生成的话，如果是懒人如我写代码的话，没道理 xor\_key 不被（使用相同的算法）随机生成。

在上述推测的前提下，搜索 libcocos.so 中长度为 16 的字符串，直接暴力[破解](https://www.52pojie.cn)，成功获得密钥。

获得密钥后虽然开心，但考虑到后续可能遇到使用相同加密方式的 apk，一旦换了密钥生成算法的话之后再解密就束手无策了，于是开始了正经的逆向尝试。

ida 打开 libcocos.so，搜索 xor\_key 的交叉引用，发现一构造函数：

[C] *纯文本查看*

```
void __fastcall cc::FileUtils::FileUtils(cc::FileUtils *this) {
  // ...
  this->neteaseKey = "XOR_KEY";
  // ...
  cc::FileUtils::sharedFileUtils = (__int64)this;
}
```

本来思路是获取内存中存放 neteaseKey 的地址，然后下读断点，之后打印函数调用栈。但因为手头没有 root 的安卓手机，动态调试需要远程到队友电脑上十分不方便，遂继续尝试静态分析。

既然存放 xor\_key 的变量被命名为 neteaseKey，且通过简单检索没找到 cocos2dx 官方有使用 xor 加密方式的文章，因此推测该加密逻辑由某插件或定制代码提供，且推测提供者为 netease 或者和其有关系。因此在字符串中搜索关键词 netease，找到一个几乎紧挨着 xor\_key 的字符串 “netease”。搜索其 xref，找到了如下逻辑：

[Asm] *纯文本查看*

```
cc::Data __fastcall cc::FileUtils::getDataFromFile(cc::FileUtils *this, const std::string *filename) {
  const char *neteaseKey; // x20
  Size = (uint8_t *)cc::Data::getSize(v3);
  if ( (unsigned int)Size >= 0xC ) {
    Bytes = cc::Data::getBytes(v3);
    Size = (uint8_t *)memcmp(Bytes, "netease", 7uLL);
    if ( !(_DWORD)Size && Bytes[7] == 1 && Bytes[10] == 239 && Bytes[9] == 1 && Bytes[8] == 1 ) {
      v9 = cc::Data::getSize(v3) - 11;
      v10 = calloc(1uLL, v9);
      memcpy(v10, Bytes + 11, v9);
      if ( (_DWORD)v9 ) {
        neteaseKey = this->neteaseKey;
        v12 = 0;
        v13 = v9;
        v14 = v10;
        do {
          if ( strlen(neteaseKey) <= v12 ) {
            v15 = 0;
          } else {
            v15 = v12;
          }
          --v13;
          v12 = v15 + 1;
          *v14++ ^= neteaseKey[v15];
        }
        while ( v13 );
      }
      cc::Data::fastSet(v3, (unsigned __int8 *)v10, v9);
    }
  }
  result._size = v7;
  result._bytes = Size;
  return result;
}
```

大体逻辑是检测文件头是否为 xor\_sign，是则跳过，后续内容使用 xor\_key 进行解密。

修改 frida hook 代码，增加获取 xor\_key 部分的逻辑，收工~
