# Akamai最新js风控浅分析——指纹

> **作者**: PokerS429 | **发布时间**: 2026-08-09 13:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1020 / 8
> **原文**: [https://www.52pojie.cn/thread-2122060-1-1.html](https://www.52pojie.cn/thread-2122060-1-1.html)

---

**Akamai最新js风控浅分析——指纹**

**浅析检测点，论指纹的变化**

在做自动化的时候，我时常在想，开一个context，除了时区语言指纹，还有哪些指纹需要注意。或者说，我们需要关注哪些检测点。

所以我们不妨就在这篇文章里补一个知识点，一个浏览器，究竟有多少指纹可以检测。

> 部分参考于
>
> https://www.52pojie.cn/forum.php?mod=viewthread&tid=2045645&highlight=%E4%AF%C0%C0%C6%F7%D6%B8%CE%C6#53428667\_%E8%87%AA%E5%8A%A8%E5%8C%96%E6%A3%80%E6%B5%8B%E7%BB%95%E8%BF%87

**常见的浏览器指纹**

最常见的UA,语言时区,屏幕指纹
userAgent，appName，appVersion，platform，vendor，product，language，languages，timezone，locale，screenWidth，screenHeight，availWidth，availHeight，colorDepth，pixelDepth，orientation，devicePixelRatio

这些一个一个来讲，首先登场的是，指纹的大脑，上帝的眼睛，浏览器的代名词，userAgent!

userAgent。浏览器自我声明字符串，指纹核心。来源于navigator.userAgent，典型的长成Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36这个样子，通常在请求头中一直出现。

appName。历史遗留，现代浏览器永远是这个值。来源于navigator.appName，典型长Netscape这个样子。

appVersion。基本等于 UA 去掉 Mozilla/ 前缀，navigator.appVersion，5.0 (Windows NT 10.0; Win64; x64)...

platform。操作系统平台标识，navigator.platform，常见有，Win32 / MacIntel / Linux x86\_64

vendor。浏览器厂商，navigator.vendor，比如谷歌浏览器，'Google Inc.'

product。同样是历史遗留，所有浏览器都是这个值，navigator.product，'Gecko'

language。首选语言（单值），navigator.language，中文的话就是'zh-CN'

languages。语言偏好数组，顺序是有意义的。navigator.languages，比如我浏览器就是，['zh-CN', 'en-AS', 'en', 'zh']

timezone。时区，Intl.DateTimeFormat().resolvedOptions().timeZone，'Etc/GMT-8'

locale。区域设置，用来判断你的语言、地区、数字/日期格式偏好。Intl.NumberFormat().resolvedOptions().locale，这是**直接**方式：明确返回浏览器解析后使用的 locale 标识符（BCP 47 格式，如 en-US、zh-Hans-CN）

screenWidth/Height，screen.width / screen.height。这个地方可以细讲一下。

这是一种screen 对象获取的**屏幕分辨率信息**

[Plain Text] *纯文本查看*

```

screen.width        // 屏幕物理宽度，例如 1920
screen.height       // 屏幕物理高度，例如 1080
screen.availWidth   // 可用宽度（排除任务栏、Dock 等系统占用区域）
screen.availHeight  // 可用高度
window.innerWidth   // 浏览器视口宽度（不含滚动条）
window.innerHeight  // 浏览器视口高度
window.devicePixelRatio // 设备像素比，例如 Retina 屏是 2 或 3
```

colorDepth，色彩深度，screen.colorDepth，24（10bit 屏为 30）

这里也可以细讲一下，并且pixelDepth 和 colorDepth 在现代浏览器里几乎总是**返回相同的值**——两者本质是同一信息的两个历史遗留 API 名称（colorDepth 更老，源自早期 DOM 标准；pixelDepth 是后加的），保留两者只是为了兼容性。

|  |  |
| --- | --- |
| 值 | 含义 |
| 24 | 最常见值，表示 RGB 各 8 位（8+8+8=24），约 1670 万种颜色 |
| 30 | 高色深屏幕（如支持 HDR / 广色域的显示器），RGB 各 10 位 |
| 32 | 有些系统会算上 8 位透明通道（Alpha），但显示效果和 24 位相同 |

orientation，屏幕方向，screen.orientation.type。

devicePixelRatio，物理像素与 CSS 像素比，window.devicePixelRatio

Canvas指纹
canvas 2D
canvas指纹在浏览器中依赖canvas API来获取，在不同操作系统和浏览器中有所不同

简单来说，Canvas 指纹反映的是"**你的硬件+操作系统+浏览器+字体+驱动这一整套组合,在执行同一段绘图指令时产生的像素级差异**",这套组合的稀有程度决定了指纹的区分度。

[] *纯文本查看*

```

function getCanvasFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 240;
  canvas.height = 60;

  // 文字渲染
  ctx.textBaseline = 'top';
  ctx.font = '16px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillText('BrowserFP &#128512;&#128293;', 2, 2);

  // 图形+渐变
  const gradient = ctx.createLinearGradient(0, 0, 200, 0);
  gradient.addColorStop(0, 'red');
  gradient.addColorStop(1, 'blue');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(60, 40, 20, 0, Math.PI * 2);
  ctx.fill();

  // 混合模式
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0,255,0,0.5)';
  ctx.fillRect(0, 0, 240, 60);

  return canvas.toDataURL();
}
```

这段代码把文字、渐变、圆弧、混合模式全叠加在一张 canvas 上,提取的最终 toDataURL() 结果在不同设备上区分度非常高。同一段代码连续调用多次 toDataURL(),正常情况下结果应该完全一致(渲染是确定性的);如果每次结果都不同,说明浏览器在做随机化处理,这本身就成了一个新的可识别信号。其次需要注意的是canvas和UA，WebGL 时常也是挂钩的，对抗时需注意。

canvas WebGL
Web Graphics Library，是一种在网页浏览器中运行的技术，可以创建各种3D场景和动画，同时，WebGL指纹是在浏览器使用WebGL时所展现出的硬件和软件配置信息，如显卡型号，驱动版本，操作系统等。

单条信号来讲，GPU 信息直接读取（最简单粗暴）

[] *纯文本查看*

```

const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
// 例如:LE (NVIDIA, NVIDIA GeForce RTX 5060 Laptop GPU (0x00002D59) Direct3D11 vs_5_0 ps_5_0, D3D11)'
```

参数枚举来讲，WebGL 有大量与硬件能力相关的常量参数,不同 GPU 支持的规格不同:

[] *纯文本查看*

```

gl.getParameter(gl.MAX_TEXTURE_SIZE);          // 最大纹理尺寸
gl.getParameter(gl.MAX_VIEWPORT_DIMS);         // 最大视口尺寸
gl.getParameter(gl.MAX_VERTEX_ATTRIBS);        // 顶点属性数量上限
gl.getParameter(gl.MAX_VARYING_VECTORS);       // 着色器插值变量数量
gl.getSupportedExtensions();                   // 支持的扩展列表(几十项)
```

同时，webgl各网站检测方式不同，需要注意的点也不同。

WebAudio指纹
这是一种利用音频信号的特征来唯一识别音频的技术，通过一系列功能组合，使生成的音频指纹具有独特性。

而WebAudio API主要用于 AudioContext上下文中。所有音频节点(振荡器、压缩器、分析器等)**必须挂在某个 Context 对象上才能创建和运行**，但是在实际指纹采集中，通常不是直接用 AudioContext,而是用它的一个"离线"变体 —— \*\*OfflineAudioContext\*\*它能够以离线无感的方式来采集浏览器上的音频信息。

[] *纯文本查看*

```

const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
const ctx = new OfflineCtx(1, 44100, 44100); // 声道数, 采样帧数, 采样率

const oscillator = ctx.createOscillator();
const compressor = ctx.createDynamicsCompressor();
oscillator.type = 'triangle';
oscillator.frequency.value = 10000;

oscillator.connect(compressor);
compressor.connect(ctx.destination);
oscillator.start(0);

ctx.startRendering().then(buffer => {
  const output = buffer.getChannelData(0); // Float32Array,读取渲染结果
  // 对 output 做哈希 -> 得到音频指纹
});
```

字体指纹
由于每台设备上安装的字体集合、字体渲染方式因操作系统、软件安装历史、语言包等因素千差万别，从而导致"字体清单+渲染特征"组合是一个强区分度的指纹信号。简单来说，通过字体能看出你的操作系统等。常见的绕过措施有，限制字体枚举范围，统一 fallback，禁用本地字体访问 API等。整体处于联合检测的一种，可以依据网站定制化修改。

[] *纯文本查看*

```

//举个例子
function detectFont(fontName) {
  const testString = "mmmmmmmmmmlli";
  const testSize = "72px";
  const baseFonts = ["monospace", "sans-serif", "serif"];

  const span = document.createElement("span");
  span.style.fontSize = testSize;
  span.textContent = testString;
  document.body.appendChild(span);

  const baseWidths = {};
  baseFonts.forEach(base => {
    span.style.fontFamily = base;
    baseWidths[base] = span.offsetWidth;
  });

  // 用目标字体 + 备用字体做 fallback 测试
  let detected = false;
  baseFonts.forEach(base => {
    span.style.fontFamily = `"${fontName}", ${base}`;
    if (span.offsetWidth !== baseWidths[base]) {
      detected = true; // 宽度变了,说明目标字体存在并生效
    }
  });

  document.body.removeChild(span);
  return detected;
}
```

时间指纹
它是一种统称，具体来说，他们都是利用"时间/延迟测量"来获取设备信息的方法，时间指纹的核心思路是:**测量某个操作耗费的时间,通过时间差异反推硬件性能、系统配置或用户环境**主要可以分为三类：

（1）性能基准测试指纹
这也是最常见的一种，它通过测量某段代码的执行耗时来推断 CPU/GPU 性能特征,进而作为设备指纹的一部分。

[] *纯文本查看*

```

function getCPUFingerprint() {
  const start = performance.now();

  // 执行一段固定的高强度计算任务
  let result = 0;
  for (let i = 0; i < 10000000; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }

  const elapsed = performance.now() - start;
  return elapsed; // 不同 CPU 主频、架构、当前负载下耗时不同
}
```

简单来说，就是通过计算时间反映出设备信息，这类方法也常用于**检测[虚拟机](https://www.52pojie.cn/thread-661779-1-1.html)/模拟器/无头浏览器**——因为虚拟化环境下某些操作(尤其是涉及硬件加速的)耗时模式和真实物理机差异明显。

（2）时钟偏移指纹
每台设备的硬件时钟(石英晶振)在制造时都存在极其微小的频率误差,导致设备的系统时钟会以一个恒定但独特的速率"漂移"(比如每小时快 0.001 秒)。这个漂移速率对每台设备来说几乎是唯一且长期稳定的物理特征。典型做法是通过 **TCP 时间戳选项(TCP Timestamp Option)**,持续采集服务器和客户端之间的时间戳数据,拟合出时钟漂移曲线。更多用于**网络层/服务器端**的设备追踪(不完全是浏览器 JS 能单独做到的),也有研究把它用 JS 的 performance.now() 结合WebSocket/HTTP 请求往返时间来近似实现。

（3）执行环境时间特征
这类更偏向"检测浏览器是否在做防护/伪装"

[] *纯文本查看*

```

function detectTimerResolution() {
  const samples = [];
  let last = performance.now();
  for (let i = 0; i < 1000; i++) {
    const now = performance.now();
    if (now !== last) {
      samples.push(now - last);
      last = now;
    }
  }
  return Math.min(...samples); // 最小非零差值 ≈ 实际计时精度
}
```

硬件指纹
硬件指纹很多时候是**直接调用浏览器暴露的 API,读取硬件参数的明文数值**,不需要做像素比对或计时侧信道,采集起来更直接、成本更低。

硬件内容繁多，在这里用表格的形式展现不同硬件的权重和API

|  |  |  |  |
| --- | --- | --- | --- |
| 类别 | 典型 API | 单项区分度 | 是否需要用户授权 |
| CPU 核心数 | navigator.hardwareConcurrency | 低 | 否 |
| 内存 | navigator.deviceMemory | 低(已粗粒度化) | 否 |
| 屏幕参数 | screen.\* / matchMedia | 中 | 否 |
| GPU | WebGL/WebGPU debug info | 高 | 否 |
| 电池 | Battery API | 高(已基本废弃) | 否(历史上) |
| 传感器 | DeviceMotion/Orientation | 高 | 是(移动端) |
| 触摸/指针 | maxTouchPoints 等 | 低(辅助验证用) | 否 |
| 媒体设备数量 | enumerateDevices() | 中 | 部分(label 需权限) |

WebRTC指纹
WebRTC（Web Real-Time Communication）是浏览器提供的实时音视频与点对点数据通道技术。**WebRTC 泄露** 指的是在使用浏览器或某些应用时，WebRTC 的连接流程（ICE 候选交换）意外暴露了本地或真实公网 IP 地址，导致即便你在用 VPN/代理，目标网站或第三方仍可能看到你的真实 IP 地址或局域网地址，从而破坏隐私与匿名性。

在这里也简单讲一下原理。

核心原因:WebRTC 为了实现"点对点"直连,必须先互相知道对方的真实网络地址。

正常上网时,浏览器发请求走的是 HTTP/HTTPS,这条路径可以被代理/VPN 完全接管,所以别人只能看到代理的 IP,看不到你的真实 IP。

但 **WebRTC 是设计来做视频通话、文件直传这种"点对点"实时通信的**,双方要建立直连,就必须先交换"我的网络地址是什么"这个信息——这个过程叫 **ICE(地址收集)**,通常不经过你配置的 HTTP 代理/VPN 通道,而是走独立的 UDP 连接。

解决方法也很简单，本地访问的话，开虚拟网卡就好了。同时，也可以进行魔改浏览器去定制。

插件和扩展指纹
这类指纹的核心思路和前面讲的字体指纹很像:**通过检测浏览器安装了哪些插件/扩展,反推用户的软件配置和使用习惯**,区分度往往很高,因为浏览器扩展的安装组合"因人而异"的程度比字体更极端——普通用户可能一个扩展都不装,重度用户可能装几十个。

浏览器扩展如果打包了网页可访问资源(Web Accessible Resources,如图标、CSS、JS 文件),这些资源会暴露在一个固定格式的 URL 下:chrome-extension://<扩展的固定ID>/<资源路径>如果它的 manifest.json 里声明了某个图标为"网页可访问资源",网站脚本就可以尝试加载这个资源来**探测该扩展是否安装**。不过，上述内容的基础是在已知扩展id的情况下。

同时，有些扩展会在网页 DOM 里留下痕迹,不需要提前知道扩展 ID:

[] *纯文本查看*

```

// 广告拦截器通常会修改/移除广告位元素,可以通过检测特定广告位是否被拦截来判断
const testAd = document.createElement('div');
testAd.className = 'ad-banner ads adsbygoogle'; // 故意用广告拦截器规则库常见的类名
testAd.style.height = '1px';
document.body.appendChild(testAd);

setTimeout(() => {
  const isBlocked = testAd.offsetHeight === 0 || getComputedStyle(testAd).display === 'none';
  console.log(isBlocked ? '检测到广告拦截器' : '未检测到广告拦截器');
  document.body.removeChild(testAd);
}, 100);
```

WebDriver
这是浏览器自动化检测(Headless/Bot Detection)里**最基础、也是最经典**的一个检测点,和前面聊的那些指纹性质不太一样——它不是用来区分"你是谁",而是用来判断"**当前这个浏览器是不是被自动化工具控制的**"。

这是 **W3C WebDriver 规范**里正式定义的一个标准属性。规范要求:**当浏览器被 WebDriver 协议(即自动化工具)控制时,必须把这个值设为 true**,让网页能够识别出"当前会话不是真人在操作"。

同时，绕过方式也很简单。

[] *纯文本查看*

```

Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined
});
```

**Akamai中指纹检测**

文章写到这里，最开始的小目标其实是完成了，但是作者并不想到此为止，所以作者会拿Akamai js中的一些检测点来做一些真实讲解，算是对上面的知识做一些巩固。

在这里，我们只针对前文讲过的指纹点，挑那些在 Akamai sensor 里真实出现过的来讲。讲"采集了什么、为什么这么采"

基础指纹：UA-CH 高熵值
前文说了 UA 是指纹核心，但在 Akamai 的新版 sensor 里，光改 navigator.userAgent 已经不够了。它会调用 UA-CH 的高熵接口：

[] *纯文本查看*

```

navigator.userAgentData.getHighEntropyValues([
  'brands', 'mobile', 'architecture', 'bitness', 'model',
  'platform', 'platformVersion', 'uaFullVersion', 'fullVersionList'
])
```

一次拿 9 项。注意这是个**异步 Promise** 接口，和同步的 navigator.userAgent 是两条路——你改了同步的 UA，忘了处理这个异步接口，两边数据对不上，直接暴露。同时 language/languages、platform、oscpu、deviceMemory、hardwareConcurrency、时区（getTimezoneOffset 和 Intl 双采）、屏幕全家桶这些老朋友一个不少，属于基础盘。

WebGL：三路冗余采集
前文讲了 WebGL 的 GPU 信息直读，Akamai 把这个思路做到了极致：**同一份 UNMASKED\_VENDOR/RENDERER，采三次**。

1. 主线程 document.createElement('canvas') 采一次；
2. OffscreenCanvas 采一次；
3. 用 Blob 包一段代码动态创建 **Web Worker**，在 Worker 里再采一次。

[] *纯文本查看*

```

// 思路示意：Worker 里的代码是独立执行的
const workerCode = `
  const canvas = new OffscreenCanvas(1, 1);
  const gl = canvas.getContext('webgl');
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  postMessage(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
`;
const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
```

这就是为什么"主线程 hook getParameter"的常规打法会翻车：你 hook 的作用域只在主线程，Worker 里那次采集走的是干净环境，三份结果一比对，不一致就是实锤。对抗这类采集，要么在更底层（CDP、内核）做，要么保证三路环境行为一致——成本和稳定性完全是两个量级。

WebAudio：经典配置就是生产配置
前文给的示例，参数是 OfflineAudioContext(1, 44100, 44100) + Oscillator + DynamicsCompressor。这里可以明确说：**Akamai 生产环境用的就是这个经典配置，声道数、采样帧数、采样率一字不差**，连节点连接方式都是教科书式的振荡器接压缩器。区别只在于它会先探测 AudioContext 的存在性，再决定走不走离线采集。

所以音频指纹这块，市面上公开资料和生产环境之间没有信息差，真正的差异在于你伪造的音频结果能不能和设备画像（GPU、UA、平台）自洽。

插件：校验的是对象图完整性
前文"插件和扩展"一节讲了扩展探测，但 Akamai 关心的是另一个东西：navigator.plugins。

它的思路不是"看你装了什么"，而是**校验 plugins 对象图的完整性**：

&#8226; 枚举插件列表，和一批知名插件（Flash、Widevine、Native Client 这类时代眼泪）做比对；
&#8226; 校验自引用一致性：plugins[0][0].enabledPlugin === plugins[0] 是否成立；
&#8226; 改写 plugins.refresh 埋个探针，探测你是不是 hook 过它。

伪造 plugins 的人大多只补了 length 和名字，但插件对象之间的引用关系、PluginArray/Plugin/MimeType 三层的互相指向，很少有人补全。这就像伪造一张身份证，照片名字都对，但紫外光下的防伪纹理没有——检查点不在明面数据上。

WebDriver：掩码 + 完整性校验
前文说 webdriver 绕过很简单，defineProperty 改一下就行。在 Akamai 面前这个说法要打个补丁。

首先，它有一个几十位的自动化特征掩码，把一批自动化框架留下的全局变量做存在性检测：\_\_nightmare、cdc\_ 开头的 ChromeDriver 残留、\_\_playwright\_\_binding\_\_、\_\_selenium\_ 系列等等，一位一个，拼出一张自动化工具画像。你清掉 navigator.webdriver 只是清掉了其中一格。

其次，它做**原型链完整性校验**：Navigator.prototype 上关键属性的描述符、函数 toString 是否返回 [native code]、getter 的 hasOwnProperty 分布。Object.defineProperty(navigator, 'webdriver', {get: () => undefined}) 这种改法，改完之后的描述符形态和原生环境是不同的——原生 webdriver 定义在 Navigator.prototype 上且 getter 是 native 函数，你挂在实例上的自定义 getter 在描述符检查面前一览无遗。

所以改值不难，难的是改完之后整个对象图看起来还像没人动过。

品牌特征位：存在即打标
前文 WebRTC 一节讲的是 IP 泄露，但在 Akamai 这里，RTCPeerConnection 的用法完全不同——**存在即打标**。

浏览器厂商各自有一些独占的、别家没有的 API 或全局属性。Akamai 对这些点挨个做存在性检测，每个结果就是一个 bit：存在记 1，不存在记 0。十几个 bit 拼起来，就是当前环境的品牌画像。常见检测点的指向性非常明确：

|  |  |
| --- | --- |
| 检测点 | 指向 |
| window.InstallTrigger | 只有 Firefox 有 |
| window.chrome / chrome.webstore | 只有 Chrome 系有 |
| window.opera | 老 Opera 有 |
| window.ActiveXObject | 只有 IE 有 |
| window.callPhantom | PhantomJS（老无头浏览器）有 |
| window.mozInnerScreenY | Firefox 有 |
| navigator.getBattery | Chrome 曾支持并至今保留，Firefox/Safari 没有或已删 |
| navigator.vibrate | 各浏览器 typeof 形态不同 |

同一个 API，指纹商用 ICE 候选泄露你的真实 IP，风控却压根不调它的方法、不建立任何连接，一句就够用：

[] *纯文本查看*

```

typeof RTCPeerConnection  // "function" 还是 "undefined"？
```

检测思路的差异，本质是目的不同：指纹要区分"你是谁"，追求区分度；风控只要判断"你声明的身份和环境对不对得上"，追求一致性。

两个反向结论
最后说两个和主流认知相反的实测结论：

&#8226; **字体指纹**：经典的文章都在讲字体枚举，但这个版本的 Akamai 里没有出现典型的 width 探测式字体检测，权重很低。
&#8226; **Canvas 2D**：同理，toDataURL 式经典 canvas 指纹不是主力，算力都花在 WebGL 和 Audio 上了。

这也符合直觉：字体和 canvas 2D 受字体渲染栈影响太大，同一台机器装个软件都可能漂移，对风控来说稳定性比区分度更重要。

**总结**

指纹只是入场券。上面这些点采完，拼出的是一张静态设备画像，用来回答"这台设备声明的身份和环境自不自洽"。Akamai 真正的大头在行为生物特征——鼠标轨迹、键盘节奏、触摸事件流，以及服务端的动态挑战。那部分展开会是一大难关。同时，也是Akamai真正的核心，本篇文章可用于简单了解指纹等。

最后，如果本篇文章有任何技术问题描述的不正确，或者别的问题，恳请大佬多多批评指正。
