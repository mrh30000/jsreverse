# Hook CryptoJS所有对称加密算法

> **作者**: 0xsdeo | **发布时间**: 2025-12-22 14:45:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5617 / 40
> **原文**: [https://www.52pojie.cn/thread-2081618-1-1.html](https://www.52pojie.cn/thread-2081618-1-1.html)

---

*本帖最后由 0xsdeo 于 2025-12-22 15:00 编辑*

**0x00 前言**
Hook成品：![](https://oss.bdziyi.com/vip/2025/10/20251019161823535.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161829193.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161835735.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161841785.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161847890.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161854733.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161900614.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161905927.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019161912410.png?imageView2/0/format/webp/q/75)
本文成品脚本已嵌入在AntiDebug\_Breaker插件中：

![](https://attach.52pojie.cn/forum/202512/22/150032yndkyynfzkl4zdll.png)

Github地址：https://github.com/0xsdeo/AntiDebug\_Breaker
注：本文仅针对CryptoJS中的所有对称加密算法，不涉及到任何其它加密库以及其他加密算法。目录：

0x01 正文
0x02 原理剖析
0x03 Fuzz加密参数

**0x01 正文**

在前端逆向领域中，我们不可避免的会与CryptoJS这个库打交道。CryptoJS是一个流行的 JavaScript 加密库，它支持多种加密算法，例如AES、DES、Rabbit、RC4、Triple DES 等对称加密，该库在前端加解密中应用极广，下面是一个简单的CryptoJS AES加解密示例：

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AES 加解密示例（含 mode、padding、iv）</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
</head>
<body>

<h2>AES 加解密示例</h2>
<form id="aesForm">
  <label>输入要加密的内容：</label>
  <input type="text" id="plaintext" value="HelloCryptoJS">
  <button type="submit">加密并解密</button>
</form>

<script>
document.getElementById("aesForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const plaintext = document.getElementById("plaintext").value;

  // === AES 参数 ===
  const key = CryptoJS.enc.Utf8.parse("1234567890abcdef"); // 16字节 = 128位
  const iv  = CryptoJS.enc.Utf8.parse("abcdef1234567890"); // 16字节 IV

  // === 加密 ===
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plaintext),
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,      // 加密模式：CBC、CFB、OFB、CTR、ECB 等
      padding: CryptoJS.pad.Pkcs7   // 填充方式：Pkcs7、Iso97971、AnsiX923、ZeroPadding、NoPadding
    }
  );

  const cipherText = encrypted.toString();
  console.log("AES 加密结果（Base64）:", cipherText);

  // === 解密 ===
  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(cipherText)
    },
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  console.log("AES 解密结果:", decryptedText);
});
</script>

</body>
</html>
![](https://oss.bdziyi.com/vip/2025/10/20251019162116346.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162122304.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162127209.png?imageView2/0/format/webp/q/75)
这也就导致了我们在逆向时，不可避免会与CryptoJS打交道，所以为了提升我们的逆向效率，为此我写出了支持hook CryptoJS库当中的所有对称加密算法的hook脚本，在开头我也给大家看过效果了，那么我现在就来给大家讲讲我是如何做到的。

**0x02 原理剖析**
我们拿spiderdemo这个靶场来做试验：https://www.spiderdemo.cn/authentication/symmetry\_challenge/?challenge\_type=symmetry\_challenge：
![](https://oss.bdziyi.com/vip/2025/10/20251019162134437.png?imageView2/0/format/webp/q/75)
先来进行一个简单的逆向：
![](https://oss.bdziyi.com/vip/2025/10/20251019162140127.png?imageView2/0/format/webp/q/75)
可以看到切换页码时传递了aes\_sign和des\_sign两个加密sign，全局搜索一下aes\_sign：
![](https://oss.bdziyi.com/vip/2025/10/20251019162147183.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162153997.png?imageView2/0/format/webp/q/75)
可以看到aes\_sign后面拼接的是p，而p就是上面aes encrypt后的内容。mode：OFB，padding：Nopadding，iv：
![](https://oss.bdziyi.com/vip/2025/10/20251019162205153.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162210307.png?imageView2/0/format/webp/q/75)
密文：
![](https://oss.bdziyi.com/vip/2025/10/20251019162216736.png?imageView2/0/format/webp/q/75)
key：
![](https://oss.bdziyi.com/vip/2025/10/20251019162221967.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162230854.png?imageView2/0/format/webp/q/75)
我们来测试一下加密的内容是否与请求的sign一致：
![](https://oss.bdziyi.com/vip/2025/10/20251019162236784.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162242819.png?imageView2/0/format/webp/q/75)
一致。
那么现在问题来了，我们在进行CryptoJS当中的aes加解密时，它内部是怎么运作的，这就是我下文着重要讲的内容。我们打个断点跟进一下：
![](https://oss.bdziyi.com/vip/2025/10/20251019162248764.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162253886.png?imageView2/0/format/webp/q/75)
进入encrypt方法：
![](https://oss.bdziyi.com/vip/2025/10/20251019162258955.png?imageView2/0/format/webp/q/75)
可以看到该方法最后return了一个d.create执行后的内容，我们跟到那里执行一下return的内容：
![](https://oss.bdziyi.com/vip/2025/10/20251019162312353.png?imageView2/0/format/webp/q/75)
可以看到执行后的内容是一个对象，我在这里向大家说明一下里面每个属性代表的功能：ciphertext：加密后的密文数据（二进制格式）
![](https://oss.bdziyi.com/vip/2025/10/20251019162319532.png?imageView2/0/format/webp/q/75)
key：加密使用的密钥
![](https://oss.bdziyi.com/vip/2025/10/20251019162324675.png?imageView2/0/format/webp/q/75)
iv：初始化向量 (Initialization Vector)
![](https://oss.bdziyi.com/vip/2025/10/20251019162329609.png?imageView2/0/format/webp/q/75)
mode: 加密模式：CBC、ECB、CFB、OFB、CTR 等
![](https://oss.bdziyi.com/vip/2025/10/20251019162334886.png?imageView2/0/format/webp/q/75)
padding: 填充方案，例如Pkcs7、Iso97971、AnsiX923、Iso10126、ZeroPadding 等
![](https://oss.bdziyi.com/vip/2025/10/20251019162339380.png?imageView2/0/format/webp/q/75)
我们现在来toString一下iv：
![](https://oss.bdziyi.com/vip/2025/10/20251019162344368.png?imageView2/0/format/webp/q/75)
这就是iv的十六进制字符串，这里我需要强调一下，这个toString并不是Function原型上的toString：
![](https://oss.bdziyi.com/vip/2025/10/20251019162350797.png?imageView2/0/format/webp/q/75)
而是这个对象指向的原型对象上的toString：
![](https://oss.bdziyi.com/vip/2025/10/20251019162355908.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162403767.png?imageView2/0/format/webp/q/75)
我用gpt为大家解答了一下toString的作用：
![](https://oss.bdziyi.com/vip/2025/10/20251019162408613.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162414317.png?imageView2/0/format/webp/q/75)
我们还可以控制输出格式：
![](https://oss.bdziyi.com/vip/2025/10/20251019162419802.png?imageView2/0/format/webp/q/75)
也就是说我们可以通过toSting方法将WordArray转换为十六进制字符串，这样就能拿到十六进制的key、iv等内容：
![](https://oss.bdziyi.com/vip/2025/10/20251019162431444.png?imageView2/0/format/webp/q/75)
我们再来toString一下这整个对象：
![](https://oss.bdziyi.com/vip/2025/10/20251019162437155.png?imageView2/0/format/webp/q/75)
可以看到这个内容实际上就是加密后的字符串，我们放掉看一下请求：
![](https://oss.bdziyi.com/vip/2025/10/20251019162446130.png?imageView2/0/format/webp/q/75)
现在我们可以确认encrypt方法return后的内容其实就是加密后的内容，里面包括了很多信息，例如iv、key、mode、padding等等，所以我们只要hook掉里面调用的某个方法就能拿到这个对象了，关键是hook哪个方法，现在我们就跟进d.create这个方法里面看一下：![](https://oss.bdziyi.com/vip/2025/10/20251019162451467.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162457230.png?imageView2/0/format/webp/q/75)
可以看到进入了create方法里，执行this.extend()时什么都没传，所以我们直接来看一下return时调用的apply里都传了什么：
![](https://oss.bdziyi.com/vip/2025/10/20251019162502524.png?imageView2/0/format/webp/q/75)
t就是刚刚我们讲的原型对象。
![](https://oss.bdziyi.com/vip/2025/10/20251019162513529.png?imageView2/0/format/webp/q/75)
arguments里实际上就是我们刚刚看到的传进来的内容：
![](https://oss.bdziyi.com/vip/2025/10/20251019162519585.png?imageView2/0/format/webp/q/75)
而这个apply其实就是Function.prototype.apply！
![](https://oss.bdziyi.com/vip/2025/10/20251019162525817.png?imageView2/0/format/webp/q/75)
此时我们就找到了我们需要hook的方法，话不多说直接上Hook脚本：
![](https://oss.bdziyi.com/vip/2025/10/20251019162530715.png?imageView2/0/format/webp/q/75)
可以看到在代码中我hook了apply方法，进入内部后首先做了一个判断：
if (arguments.length === 2 && arguments[1] && typeof arguments[1] === 'object' && arguments[1].length === 1 && hasEncryptProp(arguments[1][0])) {}1.传进的内容长度是否为2。2.第二个参数是否为真。3.第二个参数是否为对象。4.第二个参数的长度是否为1。5.第二个参数里的对象是否包含ciphertext,key,iv,algorithm,mode,padding,blockSize,formatter这几个属性前四点其实很好解释，我们通过代码给apply传进来的内容就能知道我为什么要这么判断，最主要是第五点，在上文我们看到了进入create方法前会传入一个对象：![](https://oss.bdziyi.com/vip/2025/10/20251019162555316.png?imageView2/0/format/webp/q/75)
这个对象里面的属性是写死的，所以我们可以通过对象是否存在这些属性来判断是否是CryptoJS对称加密后的内容。接下来我依然是做了一个判断：

if (Object.hasOwn(arguments[0], "$super") && Object.hasOwn(arguments[0], "init")) {}Object.hasOwn方法可以帮助我们检测我们传入的对象是否存在一个属性：
![](https://oss.bdziyi.com/vip/2025/10/20251019162611556.png?imageView2/0/format/webp/q/75)
例如我们可以看一下MDN给的案例：
![](https://oss.bdziyi.com/vip/2025/10/20251019162616514.png?imageView2/0/format/webp/q/75)
我在代码中通过判断第一个传进的内容中是否包含$super和init来进一步佐证是否是CryptoJS加密时所进行的动作。其实我写这么多判断，就是因为apply方法在js当中应用极为广泛，如果让其他无关参数进入hook后的函数内部，可能就会引发异常，所以我不得不写这么多判断。接下来就是我在开头给大家看到的控制台内容了：
![](https://oss.bdziyi.com/vip/2025/10/20251019162621171.png?imageView2/0/format/webp/q/75)
这些大多数也不用讲，读者朋友们应该能看懂，我认为唯一需要讲的就是这段代码：

console.log("加密后的密文：", arguments[0].$super.toString.call(arguments[1][0]));说句实话，写出这段代码确实也耗费了我一些心思，可能有朋友会说密文既然已经在arguments[1][0]里了，那么我们直接toString不就行了：![](https://oss.bdziyi.com/vip/2025/10/20251019162636512.png?imageView2/0/format/webp/q/75)
我给大家演示一下这个toString后的内容是什么：
![](https://oss.bdziyi.com/vip/2025/10/20251019162642156.png?imageView2/0/format/webp/q/75)
效果显而易见，我来给大家看一下我们调用的toString是哪个原型对象下的toString：
![](https://oss.bdziyi.com/vip/2025/10/20251019162647249.png?imageView2/0/format/webp/q/75)
可以看到它调用的实际上是Object原型上的toString，而不是CryptoJS当中的toString，造成这种问题的原因只有一个，那就是我们拿到的仅仅是一个对象，也就是调用create时传入的那个对象：
![](https://oss.bdziyi.com/vip/2025/10/20251019162658227.png?imageView2/0/format/webp/q/75)
它就是一个普普通通的对象，它的原型对象指向的就是Object.prototype，所以直接调用toString指向的并不是CryptoJS提供的原型对象里的toString。获取到能让我们用的那个toString方法也很简单，调用apply时传入的第一个内容就是原型对象：![](https://oss.bdziyi.com/vip/2025/10/20251019162718208.png?imageView2/0/format/webp/q/75)
所以我们可以通过直接调用这个对象的toString输出密文：
![](https://oss.bdziyi.com/vip/2025/10/20251019162724300.png?imageView2/0/format/webp/q/75)
用call调用其实就是因为它是一个构造方法，需要用call调用而不能直接调用，里面传的参数就代表了this的指向，我们看一下toString方法内部的实现：
![](https://oss.bdziyi.com/vip/2025/10/20251019162730181.png?imageView2/0/format/webp/q/75)
里面的this将会指向我们传进去的对象，接着就会返回我们加密的内容。这就是整个hook CryptoJS对称加密的逻辑，我们来看一下效果：![](https://oss.bdziyi.com/vip/2025/10/20251019162735571.png?imageView2/0/format/webp/q/75)
可以看到输出了密文、key、iv、填充模式、运算模式、密钥长度。填充模式和运算模式我需要讲一下，由于我尝试过很多办法，最终未能实现直接获取到填充模式和运算模式的具体名称，但是我们毕竟是能获取到它的方法的，所以直接跟进代码就能看到加密时用的是什么填充模式和运算模式，例如：
![](https://oss.bdziyi.com/vip/2025/10/20251019162740517.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162750216.png?imageView2/0/format/webp/q/75)
可以看到靶场并未使用填充模式，看一下运算模式：
![](https://oss.bdziyi.com/vip/2025/10/20251019162756487.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162804776.png?imageView2/0/format/webp/q/75)
运算模式为CTR，我们根据打印的内容解密一下：
![](https://oss.bdziyi.com/vip/2025/10/20251019162814975.png?imageView2/0/format/webp/q/75)
成功解密，说明信息都是对的，成功hook CryptoJS对称加密。现在我来给大家讲一下关于解密的部分，在上文我们知道了当aes加密的时候会调用encrypt方法：
![](https://oss.bdziyi.com/vip/2025/10/20251019162820467.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162825605.png?imageView2/0/format/webp/q/75)
其实它下面也有一个decrypt方法：
![](https://oss.bdziyi.com/vip/2025/10/20251019162831530.png?imageView2/0/format/webp/q/75)
这个方法就是解密的时候会调用的，由于spiderdemo没有做解密，所以接下来我们换一个案例：
![](https://oss.bdziyi.com/vip/2025/10/20251019162837518.png?imageView2/0/format/webp/q/75)
可以看到在代码中调用了decrypt，我们断点跟进一下：
![](https://oss.bdziyi.com/vip/2025/10/20251019162842174.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019162847906.png?imageView2/0/format/webp/q/75)
可以看到这里调用的是decrypt方法，跟进：
![](https://oss.bdziyi.com/vip/2025/10/20251019162854496.png?imageView2/0/format/webp/q/75)
最后跟到了我们上文hook加密的那个位置，我在这里直接告诉大家：hook解密需要跟进createDecryptor方法：
![](https://oss.bdziyi.com/vip/2025/10/20251019162900584.png?imageView2/0/format/webp/q/75)
我们看一下n和r是什么：
![](https://oss.bdziyi.com/vip/2025/10/20251019162905383.png?imageView2/0/format/webp/q/75)
可以看到n是key，r：
![](https://oss.bdziyi.com/vip/2025/10/20251019162912616.png?imageView2/0/format/webp/q/75)
r里包含了mode和padding，我们跟进一下这个方法：
![](https://oss.bdziyi.com/vip/2025/10/20251019162918546.png?imageView2/0/format/webp/q/75)
可以看到这里也是调用了create方法，里面调用了apply方法，我们看一下解密传入的内容：
![](https://oss.bdziyi.com/vip/2025/10/20251019162924186.png?imageView2/0/format/webp/q/75)
e依然是原型对象，arguments：
![](https://oss.bdziyi.com/vip/2025/10/20251019162929127.png?imageView2/0/format/webp/q/75)
可以看到调用create时传递的参数就有mode、padding，以及key，所以我们依然可以通过hook apply方法拿到这些内容：
![](https://oss.bdziyi.com/vip/2025/10/20251019162934233.png?imageView2/0/format/webp/q/75)
这些代码大多数都不用讲，与hook加密时的代码没有什么不同，我唯一需要讲的就是：实际上hook解密的这段代码，传进来的内容并不是由create方法调用传递的，而是这个方法：
![](https://oss.bdziyi.com/vip/2025/10/20251019162940420.png?imageView2/0/format/webp/q/75)也就是create上面的extend方法，我后期发现调用这个方法时才是真正进行了解密的动作，所以我多加了一个判断：
![](https://oss.bdziyi.com/vip/2025/10/20251019162945618.png?imageView2/0/format/webp/q/75)

if (this.toString().indexOf('function()') === -1 && arguments[1][0] === 2)如果没有这个判断，当没有进行解密时控制台可能也会输出解密，所以我们就可以通过这个if来判断代码是否真正进行了解密，效果：![](https://oss.bdziyi.com/vip/2025/10/20251019162958931.png?imageView2/0/format/webp/q/75)
那么问题来了，我是如何做到hook掉CryptoJS当中的所有对称加密？因为上文我都是以AES来写hook脚本的。我先来给大家看一下刚刚spiderdemo那个靶场打印的内容：
![](https://oss.bdziyi.com/vip/2025/10/20251019163004112.png?imageView2/0/format/webp/q/75)
![](https://oss.bdziyi.com/vip/2025/10/20251019163011391.png?imageView2/0/format/webp/q/75)
这个靶场实现了AES、DES两种加密，可以看到控制台输出了这两种加密的加密信息，说明CryptoJS进行所有对称加密时都会调用我上述所说的那些方法，我们可以直接使用我的脚本去hook掉CryptoJS当中的所有对称加密算法，我们来验证一下DES加密时输出的内容是否是正确的：
![](https://oss.bdziyi.com/vip/2025/10/20251019163017863.png?imageView2/0/format/webp/q/75)
成功解密，一切尽在不言中。

**0x03 Fuzz加密参数**

有些时候脚本可能无法获取到解密时使用的填充模式、加密模式，例如：
![](https://oss.bdziyi.com/vip/2025/10/20251019163023414.png?imageView2/0/format/webp/q/75)
这是由于获取到的对象并没有运行模式和填充模式：
![](https://oss.bdziyi.com/vip/2025/10/20251019163028926.png?imageView2/0/format/webp/q/75)可以看到只有一个iv，那么此时就可以利用我的脚本进行fuzz：https://github.com/0xsdeo/Fuzz\_Crypto\_Algorithms：
![](https://oss.bdziyi.com/vip/2025/10/20251019163034719.png?imageView2/0/format/webp/q/75)
现在我们已经有key、iv和密文：

key：673939333038347039773471313671763533676b6a376d6f333575676437356c

iv：66366636613778733131663733377836使用脚本进行fuzz：
![](https://oss.bdziyi.com/vip/2025/10/20251019163049636.png?imageView2/0/format/webp/q/75)
成功获取到，我们取第一个解密组合尝试下解密：
![](https://oss.bdziyi.com/vip/2025/10/20251019163055904.png?imageView2/0/format/webp/q/75)
成功解密，成功fuzz出加密参数。由于这个工具是cursor所作，所以如果出现bug请及时联系我。Fuzz加密参数脚本：https://github.com/0xsdeo/Fuzz\_Crypto\_Algorithms
![](https://oss.bdziyi.com/vip/2025/10/20251019163118191.png?imageView2/0/format/webp/q/75)
