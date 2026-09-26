# AI辅助逆向某flutter应用

> **作者**: Evan422 | **发布时间**: 2026-04-02 11:44:00 | **版块**: 『移动安全区』 | **查看/回复**: 3336 / 23
> **原文**: [https://www.52pojie.cn/thread-2100902-1-1.html](https://www.52pojie.cn/thread-2100902-1-1.html)

---

引言：最近买了点基金，然后我对象基本过半个小时就提醒我看看基金情况，工位不太好不好摸鱼，所以就想着搞下这个app接口，
然后开发一个桌面应用挂在这里定时轮询，正好最近也想尝试一下jadx的mcp，AI分析到最后告诉我这是flutter开发的，
之前没有接触过flutter逆向，所以搞一下填补一下空白，下面开始正篇。

<hr>

样本&&工具&&环境：

* 样本：5YW75Z+65a6d
* ubuntu\_22.04.5
* jadx-mcp插件
* IDA 9.2
* frida 16.1.5
* reqable

<hr>

1.分析接口嘛，肯定先抓个包试试

* 抓包这里有个坑点，flutter自带SSL校验，这个问了下AI，github上有佬开源的通杀flutter SSL校验，感兴趣的可以去看一下
  代码实现 <https://github.com/NVISOsecurity/disable-flutter-tls-verification>
* 定位到目标接口，头部有一个签名，看长度初步判断是md5

  ![](https://attach.52pojie.cn/forum/202604/02/113841mddq62dlvoll4ohv.png)

2. 算法逆向

   * flutter开发的应用核心代码打包后都在libapp.so里面

     ![](https://attach.52pojie.cn/forum/202604/02/113907p2wwz7qgfg8ppnrp.png)
   * 先在IDA里面搜索一下字符串 request-sign

     ![](https://attach.52pojie.cn/forum/202604/02/113910h8wr230oltmw0rra.png)
   * 这里我本来想看交叉引用的，发现没效果，问了下AI，告诉我如下原因和解决方案

     ![](https://attach.52pojie.cn/forum/202604/02/113912tw3dyq5321xwfco2.png)
   * 按blutter官方文档执行以下命令，执行完之后会在你的输出目录生成以下内容

     ```
     python3 blutter.py path/to/app/lib/arm64-v8a out_dir
     ```
   * 输出文件

     ![](https://attach.52pojie.cn/forum/202604/02/113914lf1b9pjrjprw1rjj.png)
   * 其实到这里如果只是为了搞算法的话就已经可以将输出的asm里面的dio\_request.dart导出文件丢给ai去分析就行了，针对这个app因为我
     已经知道它是一个加盐其未魔改的md5了，所以找盐这种事丢给ai完全可以胜任的

     ![](https://attach.52pojie.cn/forum/202604/02/113916mtkpy3t8d59yw3v3.png)
   * 但是为了体验flutter逆向全流程和熟悉IDA，我还是按网上教程，在IDA中导入了blutter生成的还原字符的脚本

     ![](https://attach.52pojie.cn/forum/202604/02/113918aph24v1416jx2uc1.png)
   * 定位到\_onRequest函数

     ![](https://attach.52pojie.cn/forum/202604/02/113920su5le499rf6769gm.png)
   * hook盐值，在ida里我们看到了generateMD5函数的起始地址是0x70A264，所以我们只需要hook函数的入参和返回值，就能看到盐值了

     [JavaScript] *纯文本查看*

     ```
     function readDartStringExact(ptr) {
     if (ptr.isNull()) return "null";

     try {
     // 1. 读取长度：位于指针偏移 +7 的位置，占用 4 个字节
     // 读取出来的 Smi 编码值需要右移 1 位才是真实长度
     let lengthSmi = ptr.add(7).readU32();
     let length = lengthSmi >> 1;

     ```
     if (length === 0) return "";
     if (length &gt; 10240) return "[String suspiciously long: " + length + " bytes]";

     // 2. 读取字符串数据：位于指针偏移 +15 (0x0F) 的位置
     let strDataPtr = ptr.add(15);

     // 按照真实长度读取完整的 UTF-8 字符串
     let str = strDataPtr.readUtf8String(length);
     return str;
     ```

     } catch (e) {
     return "[Error reading string at " + ptr + ": " + e.message + "]";
     }
     }

     function hookMD5() {
     let moduleName = "libapp.so";
     let libapp = Process.getModuleByName(moduleName);
     let targetOffset = 0x70A264;
     let targetAddress = libapp.base.add(targetOffset);

     ```
     console.log(" Hooking generateMD5 at: " + targetAddress);
     console.log(" Waiting for network requests...\n");

     Interceptor.attach(targetAddress, {
         onEnter: function (args) {
             // 我们已经确认 args[zxsq-anti-bbcode-0] 就是我们要的明文字符串指针
             this.inputStringPtr = args[zxsq-anti-bbcode-0];

             console.log("=========================================");
             console.log("[+] MD5 Signature Triggered!");

             // 使用精准解析函数读取完整明文
             let plaintext = readDartStringExact(this.inputStringPtr);

             console.log("[-&gt;] Full Plaintext Input:");
             console.log("-----------------------------------------");
             console.log(plaintext);
             console.log("-----------------------------------------");
             console.log("[zxsq-anti-bbcode-i] Plaintext Length: " + plaintext.length + " characters");
         },
         onLeave: function (retval) {
             // 返回值同样是 Dart 字符串，包含 32 位的 MD5 Hex
             let md5Result = readDartStringExact(retval);

             console.log("[&lt;-] MD5 Output Hash : " + md5Result);
             console.log("=========================================\n");
         }
     });
     ```

     }

     setTimeout(function () {
     hookMD5();
     }, 1000);
     ```

     } catch (e) {
     return "[Error reading string at " + ptr + ": " + e.message + "]";
     }
     }

     function hookMD5() {
     let moduleName = "libapp.so";
     let libapp = Process.getModuleByName(moduleName);
     let targetOffset = 0x70A264;
     let targetAddress = libapp.base.add(targetOffset);

     ```
     console.log(" Hooking generateMD5 at: " + targetAddress);
     console.log(" Waiting for network requests...\n");

     Interceptor.attach(targetAddress, {
         onEnter: function (args) {
             // 我们已经确认 args[0] 就是我们要的明文字符串指针
             this.inputStringPtr = args[0];

             console.log("=========================================");
             console.log("[+] MD5 Signature Triggered!");

             // 使用精准解析函数读取完整明文
             let plaintext = readDartStringExact(this.inputStringPtr);

             console.log("[->] Full Plaintext Input:");
             console.log("-----------------------------------------");
             console.log(plaintext);
             console.log("-----------------------------------------");
             console.log("[i] Plaintext Length: " + plaintext.length + " characters");
         },
         onLeave: function (retval) {
             // 返回值同样是 Dart 字符串，包含 32 位的 MD5 Hex
             let md5Result = readDartStringExact(retval);

             console.log("[<-] MD5 Output Hash : " + md5Result);
             console.log("=========================================\n");
         }
     });
     ```

     }

     setTimeout(function () {
     hookMD5();
     }, 1000);

     3. 总结
        + 本次样本逆向全程基本都是由ai完成的，包括思路和分析，我只是给它提供需要的信息，虽然不复杂，不过也是学到一些
          新东西的，包括怎么去逆flutter，怎么过flutter的SSL校验，基于地址hook so函数等，写的比较水勿喷，只是为了记录
          一下flutter逆向的流程。感谢AI— ~hhhha
