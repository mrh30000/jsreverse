# 在线文档解锁（PDF / 文库 / 阅读器 —— Range · base64 · AES · pdf.js · 一次性 URL）

> **来源**：`52pojie-1375791`（2021-02，GB688 / openstd + pdf.js + wasm）、
> `52pojie-1385134`（2021-03，单文件 HTML 内嵌 base64 PDF）、
> `52pojie-1433013`（2021-05，文库 `@media print`）、
> `52pojie-1674294`（2022-08，在线阅读文档五形态，**本篇主源**）、
> `52pojie-1960261`（2024-09，试读站 PDF：`salt ‖ IV ‖ 密文` + PBKDF2-SHA256 派生，§5.4）、
> `52pojie-2088383`（2026-01，pdf.js 通用下载与追密码）。
>
> **定位**：目标不是 `m3u8 + ts`，而是「**浏览器里能看、本地打开就废**」的**文档页** ——
> 在线 PDF 预览、文库、在线阅读器。本文只解决一件事：**先判「载体形态」，再挑对应的取数手法**。
>
> ⚠️ **口径**：
> - 标注「**该案例实测**」的条目是**单样本观察**（如「小十个字节」），**不是**普遍规律。
> - 标注「**源文以截图给出、未复算**」的条目，源文正文**没有可复算的文字依据**，
>   **不得**反推为算法结论；本文一律不替它补算法。
> - 标「**复算**」的条目是本文对源文给出的数字/串**自己算过一遍**的，可信度高于截图。

---

## 1. 一句话定位与分工

**一句话**：文档型目标的「锁」不多，但**载体形态多**——同一份 PDF 可以是「Range 分块流」「base64 内嵌」
「整体 AES」「pdf.js 容器」「一次性签名 URL」五副面孔，**认错形态就会在错的一层抠半天**。

**何时用**：页面能看、下载不了；或下载下来的 PDF **打不开 / 要密码**；网络面板里看不到 `m3u8`，
但能看到「一页一请求」的文档接口、`Range` 头、一段超长 base64、或一堆看不懂的响应体。

**与同族文件的分工**（先判「内容单位」，再进对应文件）：

| 内容单位 / 现象 | 去哪个文件 |
| --- | --- |
| **一章一份的加密正文**（EPUB / 阅读器章节接口 `read_chapter.action` / `enc=1` / 双层 AES-ECB + 长度前置 `dpbt`），落点是 zip / XHTML | `references/ebook-and-container-drm.md` |
| **m3u8 / ts 分片**，或「只给 N 秒试看 / 索引被截断」 | `SKILL.md` 分层表；试看门控 → `references/preview-gating-and-segment-enumeration.md` |
| **一页 / 一整份 PDF / 一张图片**，且「页面能看、下载器拿不到」「PDF 有密码」 | **本文**（判据来自**网络面板的响应形态**，不是内容结构） |
| 内容是 `canvas` 自渲染 / 逐帧加密的**视频** | 回 `SKILL.md` → `references/frame-encryption-and-wasm-decryptors.md` |

**边界（易混淆点）**：
- 站点若把「一页」做成**加密整包**、且走章节式接口 ⇒ 回 `references/ebook-and-container-drm.md`。
- 站点若把「文档」切成了 **m3u8 分片** ⇒ 回 `SKILL.md` 分层表，**不在本文**。
- 「试看 N 页 / 索引被截断」是**门控**问题，不是载体问题 ⇒ `references/preview-gating-and-segment-enumeration.md`。

---

## 2. 载体形态分流表（30 秒判据）

**看网络面板里出现什么，而不是看 JS 里有什么。**

| 网络面板 / 页面里出现什么 | 载体形态 | 一句话处置 | 详节 |
| --- | --- | --- | --- |
| 同一 URL 反复请求，请求头带 `Range: bytes=0-0` / `bytes=0-327679`，响应 `206 Partial Content` + `Content-Range: a-b/total` | **① Range 分段懒加载** | 改 `bytes=0-<total-1>` 一次取全；**先按 `total` 核对边界**，别盲信 `0-` | §3 |
| 一次**不带 Range** 的响应里就有 `Content-Range: bytes 0-2967096/2967097`，且**没有文件传输** | **① Range（探长握手）** | 这是「拿总长」的那一次，紧接着才发 `Range` 取块 | §3.2 |
| `data:application/pdf;base64,` / 单文件 30MB HTML / 一个 `blob:` 地址 | **② base64 内嵌** | `atob` / `base64.b64decode` 落盘；**注意可能带密码**（含「生成 blob 时加密码」） | §4 |
| 响应体「啥也看不懂」、`Content-Type: application/octet-stream`、页面用 XHR 取 | **③ 整体加密（AES / wasm）** | 下 XHR 断点 → F5 看堆栈 → 找 AES（常带注释）/ wasm `_decodeData` | §5 |
| 同一份文件**一个 URL 一次取全**，JS 里出现 `crypto.subtle` + `PBKDF2` + `slice(0x0,0x8)` | **③-子 自描述容器**（盐 ‖ IV ‖ 密文） | 按 §5.4 的固定布局切三段 + `PBKDF2-SHA256/65536/16B` 派生 → AES-CBC | §5.4 |
| 网络面板里有 **pdf.js worker**（`pdf.worker.js`）、页面全局有 `PDFViewerApplication`、或 URL 片段带 `#pdfjs.action=download` | **④ pdf.js 容器** | 控制台 `PDFViewerApplication.download()`；**有密码就追 `.onPassword`** | §6 |
| 同一本书**每「页」4 个参数**（页数 / 时间戳 / sign / nonce），链接**只能用一次** | **⑤ 一次性 URL + 签名分页** | 「阻止请求域」取链接；复现 `MD5('123456'+nonce+stime)` 后按页循环 | §7 |
| 每页一张图片，元数据响应里有 `encryptedData` / `encrypted:true` | **⑥ 逐页图片流**（源文附带形态） | 元数据 ECB 解 → 取 `canvas_info` → 按索引重映射像素 | §8 |
| `ctrl+P` 打印失效 / 右键复制受限（文库类） | **文库展示限制** | 全局搜 `@media print` 删掉 | §9.9 |

> **判据优先级**：先看**响应形态**（Range / base64 / 乱码 / pdf.js / 一次性），
> 再看**参数形态**（4 个逐页变化的参数），最后才看 JS。**本文的形态判定不依赖扣 JS。**

---

## 3. 形态①：Range 分段懒加载

**特征（源文 1674294 / 1375791 实测）**：

- 请求头里有明显的 `Range: bytes=0-0`，「看网页中不断请求同一个地址」；
- 每次请求的 `Range` 范围都不一样 ⇒ 分段请求；
- 响应是 `206 Partial Content` + `Content-Range: bytes a-b/total`。

### 3.1 探长 → 一次取全（含边界核对）

**★ 不要直接 `bytes=0-`** —— 源文明确记过一个反例（见 §9.2）。正确姿势是**用响应头的 `total` 反推**：

```python
import re, requests

def probe_total(url, headers=None):
    """向同一 URL 发一个极小的 Range，从 Content-Range 里拿到文件总长。"""
    r = requests.get(url, headers=dict(headers or {}, Range="bytes=0-0"))
    m = re.search(r"bytes\s+(\d+)-(\d+)/(\d+)", r.headers["Content-Range"])
    start, end, total = (int(x) for x in m.groups())
    return start, end, total                      # total = 文件总字节数

url = "<viewer URL>"
_, _, total = probe_total(url)
r = requests.get(url, headers={"Range": f"bytes=0-{total - 1}"})
cr = r.headers.get("Content-Range")
assert cr == f"bytes 0-{total - 1}/{total}", cr   # ★ 边界核对：不盲信「0- 拿全」
open("enc.bin", "wb").write(r.content)
```

> 若 `Content-Range` 与预期对不上（或直接报错），说明该站对「一次拿全」有限制
> ⇒ 回退到**按块拼接**：`bytes=0-N`、`N+1-2N+1`、… 逐块取，**用响应的 `Content-Range` 对齐每块边界**，
> **不要**用自己算的块长。该案例的块长实测是 **320 KiB**（见 §9.2）。

### 3.2 ★ 两次请求的语义区分（源文 1375791 抓包）

同一 URL 的**前两次**请求**职责不同**，不要把第一次当成失败：

```text
① 拿总长：GET viewGb?type=online&hcno=CC68F6BFD3E104560914271598AFE8C8
   → 200 OK
   → Content-Length: 2967097
   → Accept-Ranges: bytes
   → Content-Range: bytes 0-2967096/2967097
   「此过程中没有发生文件传输, 而是从返回头中获得了文件大小」

② 取数据块：同一 URL + Range: bytes=0-327679
   → 206 Partial Content
   → Content-Length: 436928
   → Content-Range: bytes 0-327679/2967097
   → 响应体是加密后的 base64 串（拿到后解密再喂 pdf.js）

末块：Range: bytes=2949120-2967096
   → 206 Partial Content
   → Content-Length: 23980
   → Content-Range: bytes 2949120-2967096/2967097
```

**从这组数字能复算出来的三件事**（本文复算，可核对）：

- `total - 1 = 2967096` ⇒ **`total` 是总字节数，有效下标是 `0..total-1`**（末块起点 `2949120 = 9 × 327680`）。
- 块粒度 = **`327680` 字节 = 320 KiB**；`⌈2967097 / 327680⌉ = 10` 块。
- 两处 `Content-Length`（`436928`、`23980`）都**约等于请求区间长度的 4/3**
  （`436928 / 327680 ≈ 1.3334`、`23980 / 17977 ≈ 1.3339`）⇒ 与「**响应体是 base64 文本、
  `Range` 计的是解码后字节**」一致。**源文未明说这一点，本条为对抓包数字的复算推断。**

---

## 4. 形态②：base64 内嵌（单文件 HTML / data URI / blob）

**特征（1674294）**：「很明显就是 base64 编码了，网页解码后很多时候再生成一个 blob，pdf。」

**三种落点**：

1. **HTML 内一个超长 JS 变量**（1385134 实测：**单文件 HTML 30 多 MB**，数据全在本地，弹窗是服务器验证）；
2. **`data:application/pdf;base64,`** 前缀 + `PDFData`（1385134 实测）；
3. **`blob:` 地址**（页面先 `URL.createObjectURL`）——「有 blob 直接下载就行」。

### 4.1 定位与 Python 落地（1385134 形态）

源文的 `convertDataURIToBinary` 已经把协议和编码写明了：

```js
var BASE64_MARKER = ";base64,";
var pdfAsDataUri = "data:application/pdf;base64," + PDFData;
```

⇒ 所以只要**把 `PDFData` 抠出来 base64 解码**即可：

```python
import base64, re

# 30MB 的单文件 HTML，010 Editor 把前后删掉、只留 PDFData 变量亦可（源文即此法）
html = open("page.html", "rb").read().decode("utf-8", "ignore")
m = re.search(r'PDFData\s*=\s*"([A-Za-z0-9+/=\s]+)"', html)
b64 = re.sub(r"[\s]", "", m.group(1))            # 去掉换行/空白
head = base64.b64decode(b64[:16])                # 先验文件头（§9.1）
print(head)                                      # 期望 b"%PDF-1."
open("out.pdf", "wb").write(base64.b64decode(b64))
```

> **先验文件头再落盘**：`PDFData` 的开头源文给出是 `JVBERi0xLjYK…` ⇒ 解出来必然是 `%PDF-1.6`
> （§9.1 的四种表示法）。**头不对就是抓错了变量**（30MB 的页面里变量不止一个）。

### 4.2 JS blob 下载（无 Python 环境时的等价动作）

见 §9.11（源文原样片段）。源文自述「搞不懂为啥比 python 解码还快」。

**★ 本形态的坑（源文原话）**：「这种也有坑的，有可能 pdf 会有**密码**，也有可能在**生成 blob 时加上了密码**。」
⇒ 解出 PDF 后**先试打开**；要密码就走 §9.10 的两条路线。

---

## 5. 形态③：整体加密（AES / 其他 —— 响应体乱码）

**特征（1674294）**：「最大特征就是**啥也看不懂**，只有分析 js。」

### 5.1 常规路线：XHR 断点 → 看堆栈 → 找算法

```
① 下 XHR 断点（也可根据调用堆栈分析）
② F5 刷新 → 看堆栈 → 看附近代码
③ 发现可疑处 → 「查看函数调用」直接搜索，或下断点刷新再看堆栈
④ 常见结局：人家注释都标上了，就是一个 AES（源文原话）
⑤ 用 Python 复现 AES 解密；key / IV 从断点处直接读
```

> 定位手法与「一搜就到」的经验，见 `../../web-reverse-algorithm/references/15-call-site-locating-playbook.md`
> 与 `../../web-reverse-algorithm/references/16-ciphertext-structure-diagnostics.md`。

### 5.2 wasm 路线一：**不还原算法，直接 hook 解密出口**（1674294 第五种）

**判据**：解密函数在 wasm 里，页面调的是个薄壳：

```
decodeData(data) {
    var ptr = this._module._malloc(data.length);
    this._module.HEAPU8.set(data, ptr);
    this._module._decodeData(ptr, data.length);
    var output_array = new Uint8Array(this._module.HEAPU8.subarray(ptr, ptr + data.length));
    this._module._free(ptr);
    return output_array;
}
```

**处置（源文原话）**：「要么分析 wasm，还原算法，要么把 wasm 扣下来，但**对于这个网站完全没必要**——
注意到 **pdf 是整个文件**，那就根本没必要了，直接就 **hook 整个 pdf 数据**，再下载下来，省去复杂的解密过程。」

- ✅ 收益：零算法成本。
- ⚠️ **边界（源文原话）**：「但这种**仅限于单个 pdf**，不然文件太多了，比较麻烦。」
  ⇒ 只有「**一次请求 = 一整份 PDF**」时划算；「一次请求 = 一页」的站点不适用。
- wasm 反编译路线见 `../../wsam-reverse/SKILL.md`；白盒 / wasm2js 分析见
  `references/whitebox-and-wasm-crypto.md`。

### 5.3 wasm 路线二：**用 wasm 解出 key/IV 三元组**（1375791 形态）

预览页里 `var HCNO="e+fr0OSr1Px3S3phy72jth0Hq3HBZZ+ZDXKIbZQEWVeWUhQ7hYT4ELgJTdrFvtx9lSgoZL0ew6+0DcVriDfUeMIK59fQUGvHqO8h3Ps31m4="`，
记录了加密 PDF 用的 **key + IV**；它自身是密文，由站点编译的 **`pdf-work.wasm`** 里的**固定参数**解密：

```js
Module.onRuntimeInitialized = function () {
    var ptr = allocateUTF8(HCNO);
    var retPtr = Module._init(ptr);
    HCNO = UTF8ToString(retPtr);      // 解出三元组，形如：
    DEFAULT_URL += HCNO;              // **************:################:CC68F6BFD3E104560914271598AFE8C8
    console.log(DEFAULT_URL);
    // ...
};
```

**三元组结构（源文原话）**：

| 段 | 含义 |
| --- | --- |
| `**************` | **密钥（key）** |
| `################` | **初始向量（IV）** |
| `CC68F6BFD3E104560914271598AFE8C8` | **hcno**（就是随后请求 URL 里的 `hcno=` 值） |

> - 上面 `*` / `#` 的**个数只是源文占位写法**，真实两段是 hex 串；判据是**「以 `:` 分成三段、末段 == URL 里的 hcno」**。
> - 该形态的 key/IV 获取是**一次性的**（wasm 解一次），随后正文仍走 §3 的 Range 分块。
> - **登记（源文未展开）**：源文只给到 `DEFAULT_URL += HCNO` 这一句，
>   **未展开**「三元组具体如何被拆开、key 段与 IV 段各自喂给谁」⇒ 以抓包为准自行核对，不要照抄本表当结论。
> - 站点背景（供判据参考）：2021 年起 openstd 新站全面改用 **pdf.js**，
>   **手机版也用同一套加密**；站点另给「直接下载」的 DRM 文件，那种**必须用站点自带工具打开**
>   （⇒ 见到「需专用阅读器」的下载件，不要当成本文形态硬解）。

---

### 5.4 形态③-子：**自描述容器**（`salt ‖ IV ‖ 密文` + PBKDF2 派生，1960261）

**现象**：阅读器（Vite/SPA 的 chunk）里有一个 `loadDecrypt(url)`：`fetch(url)` → `arrayBuffer()` →
**切三段** → 派生 key → AES-CBC 解密 → 把结果当 PDF 喂给 pdf.js（`initDocument(buf, 'xxx.pdf')`）。

**判据（不用猜，看三处）**：

1. 有 **`window.crypto.subtle`** ⇒ 走的是 WebCrypto 语义（`deriveKey` / `decrypt` 都是 Promise）；
2. 出现 **`'name': 'PBKDF2'` + `iterations` + `'hash': 'SHA-256'`** ⇒ 这一族**唯一**的指纹；
3. 切片下标是**十六进制字面量**：`slice(0x0, 0x8)` / `slice(0x8, 0x18)` / `slice(0x18)`。

**容器布局（本族固定，`0x18 = 24`）**：

| 段 | 切片 | 长度 | 用途 |
| --- | --- | --- | --- |
| ① | `buf.slice(0x0, 0x8)` | **8 字节** | **PBKDF2 的 salt** |
| ② | `buf.slice(0x8, 0x18)` | **16 字节** | **AES-CBC 的 IV** |
| ③ | `buf.slice(0x18)` | 余下全部 | **密文** |

**KDF 参数（源文原样）**：`importKey('raw', new TextEncoder().encode(<口令>), {name:'PBKDF2'}, false, ['deriveKey'])`
→ `deriveKey({name:'PBKDF2', salt, iterations: 0x10000, hash:'SHA-256'}, key, {name:'AES-CBC', length: 0x80}, …)`
⇒ **iterations = 65536**、**dkLen = 128 bit = 16 字节**、**口令是明文 UTF-8 字符串**（不是 hex、不是 base64）。

**★ 本库独立复算（可逐字节对拍，本批 `b36-verify-numbers.py` 已断言）**：

源文自己给了一个可对拍样本 ——
`Passphrase="xSeZw1dY2HKAj3yk"` / `salt=d6 dc bf d0 0e c1 81 f1` / `iterations=65536` / `SHA-256` / `Key size=128`
⇒ 派生 key = **`1f67c8caec75e3069c52e43e29555904`**。
`hashlib.pbkdf2_hmac("sha256", b"xSeZw1dY2HKAj3yk", bytes.fromhex("d6dcbfd00ec181f1"), 65536, 16).hex()`
**逐字节命中** ⇒ **本族配方可用，不是截图推断**。

**Python 落地（零依赖，`media_crypto.py` 走 AES 那一档）**：

```python
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes   # 或 pycryptodome

raw = open("some.xxxx", "rb").read()
salt, iv, ct = raw[:8], raw[8:0x18], raw[0x18:]
key = hashlib.pbkdf2_hmac("sha256", PASS.encode(), salt, 0x10000, 16)
dec = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
open("out.pdf", "wb").write(dec.update(ct) + dec.finalize())     # 头应为 %PDF-
```

**坑**：

| 坑 | 症状 | 正解 |
| --- | --- | --- |
| 把 `slice` 当成**字符串**切片 | 边界对不上、解出来乱码 | `arrayBuffer()` 之后是**字节**；`0x8` / `0x18` 是字节偏移 |
| 口令按 hex/base64 解 | 派生出的 key 完全不对 | 口令是**明文串**（`TextEncoder().encode()` 即 UTF-8 字节） |
| 少做一次 base64 | 解出来还是乱 | 源文这一族的 `loadDecrypt` **不做** base64（`fetch` 直接给二进制）—— 与 §5.2 的 wasm 路线不同，**先看代码有没有 `atob` 再决定** |
| 把 `extractable=false` 当硬约束 | 想看中间 key 却看不到 | 源文调试时把 `deriveKey(..., false, ...)` 的 `false` 改 `true` 即可 `exportKey` ⇒ **这是调试技巧，不是算法的一部分** |

**⚠️ 源文残留登记（不要据它推算法）**：该篇开头另挂了一段
`RC4密文: 54f7d1b1…30cba` / `RC4KEY: V0hBVCBUSEUgRlVDSw==`，
**正文再未回到 RC4**；且该 `RC4KEY` 的 base64 解出是 **`WHAT THE FUCK`（13 字节）**、
密文 94 个 hex 字符 = **47 字节**（本库复算）。
⇒ 登记为「**源文残留、与正文链路无对应关系**」，**不得**据此推断正文算法，也**不得**把它当成同一目标的两层。

---

## 6. 形态④：pdf.js 容器（含通用下载与追密码）

**判据**：

- 网络面板里出现 pdf.js 的 worker（`pdf.worker.js`）；
- 页面全局对象 `PDFViewerApplication`（或 `PDFViewerApplication.pdfDocument`）；
- URL 片段形如 `#pdfjs.action=download`（2088383 给出的样例 URL 即带此片段）。

### 6.1 通用下载：`PDFViewerApplication.download()`

```js
// F12 → 定位到 pdf 渲染层（页面嵌套）→ Console：
PDFViewerApplication.download()
```

- 源文原话：**「即可（基本上通用）」**；「pdf.js 应该是通用的，除非服务器做了限制（也有办法绕过然后保存）」。
- ⚠️ **登记**：源文对「服务器做了限制时怎么绕」**只写了这一句、未展开** ⇒ 该分支**未复核**。
- ⚠️ 源文实测存在**「能下但很慢」**的情况（作者自述），注意区分「下不动」与「下不了」。

### 6.2 有密码：追 `.onPassword`

```
① 在 pdf.js 代码里搜 .onPassword
② 有密码时会在此处断下，并报错 No password given
③ 在 e.onPassword 的第一个回调参数（s 函数）下断点 ⇒「即可直接偷鸡」
   （手速不够快可能需要刷新）
```

内层 `onPassword` 原文（2088383，已 AI 格式化）：

```js
onPassword = (e, t) => {
    this.isViewerEmbedded && this._unblockDocumentLoadEvent(),
    window.addEventListener('message', function t(i) {
        window.removeEventListener('message', t)
        for (var n = i.data, s = '', o = 1; o < n.length; o++)
            o % 2 && (s += String.fromCharCode(parseInt(n[o - 1] + n[o], 36)))
        e(s)
    }),
    window.parent.postMessage('s', location.href)
}
```

⇒ 这里同时给出了**密码解码算法**（base36 两位一组）与**自动传密码链**，见 §9.5 / §9.6。

### 6.3 `PDFViewerApplication.download()` 拿到的可能是「加密 PDF」

源文流程即：先 `download()` 拿到文件 → 打开发现**有密码** → 再去 `r0inab` 里取 base36 串解密码。
⇒ **形态④ 与「内嵌 PDF 带密码」经常同时出现**，两条配方要连着用。

---

## 7. 形态⑤：一次性 URL + 签名分页

**判据（1674294 实测）**：「浏览器返回的数据，**并没有加密**，但无论是**直接打开**还是用 **curl-py**，都不行，
说明请求地址很可能是一次性的。」

### 7.1 两个验证动作（30 秒坐实「一次性」）

| 动作 | 观察 | 结论 |
| --- | --- | --- |
| 右键「**阻止请求域**」→ 翻一页 | 「**链接生成了，并没有发送出去**」 | 可以在浏览器里**看到/复制到**这条链接 |
| 用 Python 把**同一条链接跑两次** | 「第一次请求成功，第二次失败了」 | **坐实一次性** |

> ★ 这两个动作是**通用手法**：任何「怀疑 URL 一次性 / 短效」的场景都能照搬
> （对照：`references/playback-address-interfaces.md` 的短效地址处置）。

### 7.2 参数面（4 个）

「而且是这个 pdf 是**分页的，不可能手动下载**」——看参数，**同一本书，四个不一样**：

```
页数（pageno） / 时间戳（stime） / 签名（sign） / 随机值（nonce）
```

- **随机值**：源文实测就是 `uuid4` ⇒ `nonce = str(uuid.uuid4())`。
- **签名**：先**在控制台跑几遍看它稳不稳**——「每次签名结果都一样，而且都是 32 位，很大可能就是 MD5」，
  再用在线工具验证确认是 MD5（源文即此法，**先猜 MD5 再验证**）。

### 7.3 可跑通的配方（1674294 原样 + 本文整理）

```python
import hashlib
import time
import uuid

import requests

SALT = "123456"          # ⚠️ 源文写死的盐；源文未说明其来源（见 §9.8）
bookruid = "<书 id>"
cookies, headers = {}, {}

def make_sign():
    stime = str(round(time.time()))
    nonce = str(uuid.uuid4())
    sign = hashlib.md5((SALT + nonce + stime).encode()).hexdigest().upper()
    return stime, nonce, sign

# ① 取目录 / 总页数 / filePath
stime, nonce, sign = make_sign()
params = {"pinst": "null", "nonce": nonce, "stime": stime, "sign": sign, "typecode": "ebook"}
data = requests.get(f"https://www.**.com/api/books/{bookruid}/pdf",
                    params=params, cookies=cookies, headers=headers).json()
print(data["title"], data["filePath"], data["totalPage"])
file_path = data["filePath"].split("filePath=")[1].split("&")[0]
pages = data["totalPage"]

# ② 按页循环：每页都重算一组 (stime, nonce, sign)；URL 只能用一次
for page in range(0, pages):
    stime, nonce, sign = make_sign()          # ★ 每页现取现用，不复用
    params = [("filePath", file_path), ("readtype", "pdf"), ("pageno", page),
              ("bookruid", bookruid), ("readtype", "pdf"),
              ("nonce", nonce), ("stime", stime), ("sign", sign)]
    resp = requests.get("https://mirrorxz.**.com/ebookapissocore/api/OnlineEBook",
                        params=params, headers=headers)
    print("page:", page, resp.status_code)
```

> - ★ **`nonce` / `stime` / `sign` 三者必须同一次生成、同一页用完即弃**（一次性 URL 的必然含义）。
> - ⚠️ 源文的 `filePath` 是**从 `data['filePath']` 里再解析 query 取 `filePath` 参数**（`parse_qs(urlparse(...).query)`）；
>   上面用 `split` 只是等价简化写法，**换站请以实际结构为准**。
> - ⚠️ 源文代码里 `readtype` **重复出现两次**（源文原样），本文保留原样；**不要**据此推断服务端语义。

---

## 8. 形态⑥：逐页图片流（元数据 ECB + 索引重映射）【源文附带形态】

**判据（1674294「png 格式 · 综合类」实测）**：一本书 = 一页一张图片；图片地址**直接打开不行**，
且元数据接口返回：

```
encrypted: true
encryptedData: "aSJcuVHA2HEFmUiq5SApZDxNRcMMQofnCufp3uU69XXP4Mk3Z..."
success: true
```

### 8.1 元数据：整串 base64 + AES/ECB + JSON

源文定位：搜 `encryptedData` → 下断点刷新 → 是个 ECB。

```python
import base64, json
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

key = b"Suj4XDDt3jPsH9Jj"                      # 源文实测的 16 字节 key
ct = base64.b64decode(data["encryptedData"])
meta = json.loads(unpad(AES.new(key, AES.MODE_ECB).decrypt(ct), AES.block_size))
# meta 里有关键字段：图片 url、canvas_info（加密时的索引表）、encrypted
```

> **机械动作**：ECB + PKCS#7 无 IV，可直接用
> `python scripts/media_crypto.py aes-ecb --input <ct.bin> --key-utf8 Suj4XDDt3jPsH9Jj --pad`
> （对照 `references/ebook-and-container-drm.md` §4 的同类「ECB + base64」形态）。

### 8.2 图片本体：**只重映射中间 10% 的字节（走 `canvas_info` 索引表）**

源文解密函数（`ImgBytes.render`）的关键循环：

```js
for (var A = new Uint8Array(r), v = new Uint8Array(r.byteLength),
         K = Math.floor(.45 * r.byteLength), B = Math.floor(.55 * r.byteLength), E = 0;
     E < r.byteLength; E += 1)
    v[E] = E >= K && E < B ? imgBytes[A[E]] : A[E];
```

⇒ **位置 `[0.45L, 0.55L)` 的字节，其值被 `canvas_info` 当索引用过一次**（其余字节原样）。
`imgBytes` 就是元数据里 `canvas_info`（源文：`imgBytes = t.canvas ? $.parseJSON(t.canvas).canvas_info : ""`）。

Python 等价（源文原样整理）：

```python
import math, requests

def unpack_page(down_url, canvas):
    z = requests.get(down_url, stream=True).content
    L = len(z)
    K, B = math.floor(0.45 * L), math.floor(0.55 * L)
    v = bytearray(L)
    for i in range(L):
        v[i] = canvas[z[i]] if K <= i < B else z[i]
    return bytes(v)
```

> ⚠️ **顺序**：`canvas_info` 来自**元数据 ECB 解密结果**，必须**先解元数据再解图片**；
> 源文自述第一次跑完「以为结束了」，结果图片仍是坏的——就是漏了这一步。

### 8.3 ★ 一个可直接省掉整条链的观察（源文原话）

「注意到图片地址，开头 **sample img tmp**，说明很可能是**临时缓存，可以直接改 host 拿到永久的地址**，
就用不到分析图片地址加密参数。」

⇒ 见到临时缓存域名/路径（`sample` / `tmp` / 时间戳目录），先试**改 host / 换稳定域名**，
**别急着扣 `auth_key`**。

### 8.4 逐页图片流另外两个签名（源文实测，供对照）

| 签名 | 公式（源文实测） |
| --- | --- |
| 图片地址 `auth_key` | `K = 时间戳(+偏移)；v = Math.random()；A = MD5(pathname + "-" + K + "-" + v + "-0-69731cbade6a64b58d60")`，地址拼 `auth_key=K-v-0-A&key1=<sia 返回>&key2=023<cookie logkey>` |
| 接口 `_sign` | 参数按 key 排序后 `e += 值 + 键` 逐段拼接 ⇒ `MD5(e).toUpperCase().slice(0, 20)` |

> ⚠️ **源文自相矛盾（已登记，不要照抄）**：`auth_key` 里的 `K`，
> **JS 写的是** `Date.parse(new Date) / 1E3 - parseInt(differenceDate) + 15`，
> 而**源文 Python 复现写的是** `int(time.time()) + 18`。**两者不一致**（偏移量与 `differenceDate` 都不同）
> ⇒ 该偏移**必须自行取证复算**，本文不给统一公式。
> 另外 `_nonce` 用的是自写 `requestUuidV4()`（源文 Python 用 `str(uuid.uuid4()).replace("-", "")`），
> **与 `uuid.uuid4()` 原样输出不同**（无短横线）。

---

## 9. 可迁移判据与坑（本文件核心）

> 本节是**跨形态**的判据/坑；形态专属细节在 §3–§8。

### 9.1 ★ PDF 文件头的四种表示法（源文原话，用得最多）

源文（1674294）原文：

```text
%PDF-1.
base64:JVBERi0x
hex:25 50 44 46 2D 31
bytes:{37,80,68,70,45,49}
这个很重要，至少要记住前两行，方便快速识别文件
```

| 表示法 | 串 | 用途 |
| --- | --- | --- |
| 明文 | `%PDF-1.` | 落盘文件开头 |
| base64 | `JVBERi0x` | **在 base64 载体里搜它可直接定位 PDF 起点** |
| hex | `25 50 44 46 2D 31` | 十六进制视图里核对 |
| bytes | `{37,80,68,70,45,49}` | JS `Uint8Array` 里核对（`%`=37,`P`=80,`D`=68,`F`=70,`-`=45,`1`=49） |

- 四种表示**互可换算**（本文复算）：`JVBERi0x`、`25 50 44 46 2D 31`、`{37,80,68,70,45,49}`
  **三者对应的都是前 6 字节 `%PDF-1`**（源文那行明文多写了一个 `.`，写成 `%PDF-1.`）；
  `JVBERi0xLjYK` 则等于 `%PDF-1.6` + 换行 —— 正是 1385134 那篇里 `PDFData` 的真实开头。
- ★ **可迁移推论（本文加，源文未明说）**：「至少要记住前两行」的真正价值是——
  **拿到任何可疑响应/变量，先在上面的四种表示里对一头**，对上了再谈解密；
  对不上就说明**还没到 PDF 那一层**（或抓错了变量）。

### 9.2 ★ Range 拼接的实测坑（**该案例实测，单样本**）

源文（1674294）原话：

> 「这种应该是最简单的了，但可能会有坑，我碰到过一个，**如果直接按 `bytes=0-`，会报错**，
> 后来发现，**直接翻到最后一页，请求头中的范围，比响应头返回的要小十个字节左右**，
> 所以还是要根据实际情况仔细甄别。」

**处置**：

- **以响应头 `Content-Range` 里的 `total` 为准做边界核对**（§3.1 的 `assert`），
  **不要**盲信「一次 `bytes=0-` 拿全」。
- 「小十个字节」是**该案例的实测值**（单样本），**不是**固定偏移 ⇒ 换成 `total` 反推，别照抄数字。
- 该案例同样说明：Range 端点**未必**=`total-1`，**服务器可以返回比你请求更小的区间** ⇒
  **每一块都读响应的 `Content-Range` 对齐**，块边界不要自己算。

> **与之并列的另一种实测形态**（1375791）：服务器**接受** `bytes=0-327679`（320 KiB 粒度）并逐块返回，
> 但也有站点**先返回总长、再收 Range**（§3.2）。两种都属形态①。

### 9.3 ★ wasm 解 key 的结构（1375791）

- 输入：页面里一段 base64 变量（如 `HCNO`），**自身是密文**；
- 链路：`allocateUTF8(HCNO)` → `Module._init(ptr)` → `UTF8ToString(retPtr)`；
- 输出：**「密钥 + IV + hcno」三元组**，以 `:` 分隔
  （形如 `**************:################:CC68F6BFD3E104560914271598AFE8C8`）；
- **`#` 段是 IV**；
- 末段 `hcno` == 后续请求 URL 里的 `hcno=` 值（可**互相校验**：拿到了就先对一遍）。
- ⚠️ 属于 F 白盒 / wasm 层 ⇒ 完整路线见 `references/whitebox-and-wasm-crypto.md`
  与 `../../wsam-reverse/SKILL.md`；本形态**通常不必读算法**（解一次即可）。

### 9.4 ★ pdf.js 通用下载与追密码（2088383）

| 目标 | 动作 | 备注（源文口径） |
| --- | --- | --- |
| 拿文件 | 控制台 `PDFViewerApplication.download()` | **「基本上通用」**，除非服务器做了限制 |
| 找密码入口 | pdf.js 里搜 `.onPassword` | 有密码会在此断下并报 `No password given` |
| 偷密码 | 在 `e.onPassword` **第一回调参数**（`s` 函数）下断点 | 「即可直接偷鸡」；手速不够快可刷新 |

### 9.5 ★ base36 两位一组的 key 解码算法（2088383 原样收录）

```js
function decode(encodedString) {
    let result = '';
    for (let o = 1; o < encodedString.length; o++) {
        if (o % 2 === 1) {
            const charCode = parseInt(encodedString[o-1] + encodedString[o], 36);
            result += String.fromCharCode(charCode);
        }
    }
    return result;
}

const encoded = "2s1e1k2p1d1j2t2p1e1g1d1h172u1g1j2p171k2t1d1d172s1h2p2u171f2u2q1c1g1f2u1j";
console.log(decode(encoded));
```

- **实测输入→输出（本文复算，可自行验证）**：上式输出
  `d28a17ea2415+f47a+8e11+d5af+3fb043f7`。
- **规则**：从左到右**每两位**当一组、按 **base36** 解析成一个码元（`String.fromCharCode`）；
  循环从下标 `1` 起、只处理**奇下标**，即取 `(0,1)`、`(2,3)`、… ⇒ **串长须为偶数**。
- Python 等价：

```python
def decode_b36(encoded_string):
    return "".join(chr(int(encoded_string[i - 1] + encoded_string[i], 36))
                   for i in range(1, len(encoded_string), 2))
```

> ⚠️ `parseInt(xx, 36)` 对**超出 `0xFF` 的两字符组**会给出 >255 的码元（`fromCharCode` 仍可吃），
> 该案例的密码含 `+` 说明码元也覆盖标点 ⇒ **不要**用「限定 base64 字母表」的直觉去收窄。

### 9.6 ★ postMessage 自动传密码链（2088383）

两个 **`script` 标签**（`r0inab` / `r0inyk`）承载密钥与密码（内容为 **JSON 文本**）。
外层监听（源文，已格式化）：

```js
// 外层
function onMessage(e) {
    e.origin === location.protocol + "//" + location.host &&
    (e.data === String.fromCharCode(115)
        ? e.source.postMessage(JSON.parse(document.getElementById("r0inab").innerText), location.href)
        : e.data === String.fromCharCode(103) &&
          e.source.postMessage(JSON.parse(document.getElementById("r0inyk").innerText), location.href));
}
```

**整条链**（内层 `onPassword` 见 §6.2）：

```
内层 onPassword：
  注册 message 监听  →  向 parent 发 's'  →  等到回来 → base36 解码 → e(密码) 交给 pdf.js
外层 onMessage：
  收到 's'  → 取 r0inab 的 innerText → JSON.parse → postMessage 回内层
  收到 'g'  → 取 r0inyk 的 innerText → JSON.parse → postMessage 回内层
```

- `String.fromCharCode(115)` = `'s'`，`String.fromCharCode(103)` = `'g'`
  （与内层的 `window.parent.postMessage('s', location.href)` 对应）。
- ★ **要拿密码，最短路径是直接读 DOM**：
  `JSON.parse(document.getElementById("r0inab").innerText)`，
  再对结果跑 §9.5 的 `decode` ⇒ 该案例得到 `d28a17ea2415+f47a+8e11+d5af+3fb043f7`。
- ⚠️ **登记（源文未展开）**：源文只把 `r0inab` 的用途写清楚（**加密后的密钥**，
  解出来就是 PDF 打开密码）；`r0inyk` **只出现在 `'g'` 分支**，源文**未展开**它承载什么
  ⇒ 本文不臆测，需现场取证。
- ⚠️ `innerText` 是**带引号的 JSON 字符串字面量**（`JSON.parse` 后才是裸 base36 串）
  —— 直接当裸串用会多出引号。

### 9.7 ★ 一次性 URL 的验证手法（1674294）

1. **右键「阻止请求域」→ 翻页**：链接**照常生成**、只是**发不出去** ⇒ 可复制到该链接；
2. **同一链接跑两次**：第一次成功、**第二次失败** ⇒ **坐实一次性**。

> ⇒ 判据：**「响应没加密但 curl 拿不到」= 先怀疑 URL 一次性**，优先做上面两个动作，
> **不要去抠加密算法**（源文的正确判断就是「并没有加密」）。

### 9.8 ★ 签名四参数与盐（1674294）

- 四个逐页变化的参数：**页数 / 时间戳 / 签名 / 随机值**（随机值 = `uuid4`）。
- 定 `sign` 的两步经验法（**可与 `../../reverse-knowledge/SKILL.md` 的站型蓝图互参**）：
  1. **先控制台跑几遍**：结果**每次一样 + 32 位** ⇒ 优先猜 **MD5**（源文即此法）；
  2. **再找在线工具/自算验证**，确认后才写进脚本。
- 实测公式：`sign = MD5("123456" + nonce + stime).hexdigest().upper()`，
  `stime = str(round(time.time()))`（秒级），`nonce = str(uuid.uuid4())`。
- ⚠️ **`"123456"` 是源文写死的盐**，**源文未说明其来源**（疑为固定盐或示例值）
  ⇒ **换站必须重新取证**，不得照抄。
- ⚠️ 该案例的 `stime` 是**秒级整数**（`round(time.time())`）；页数参与循环
  （`for page in range(0, totalPage)`），**每页重算一组三元组**。

### 9.9 ★ `@media print` 破除法与边界（1433013）

**场景**：文库类老招「`ctrl+P` 打印为 PDF / 纸质件」**用不了了** ⇒ 源文推测是 **CSS** 原因。

**配方**：

```
① 保存一个文库页面到本地
② 用 filelocator（全盘/全目录文本搜索）搜 @media print
③ 回到 console，找到 xreader 文件 → 右键 reveal in source panel → 跳到源文件
④ 点格式化按钮 → 搜 @media print → 把这段删掉
⑤ 重新打印 ⇒ 限制解除
```

**★ 边界（源文原话，务必连边界一起引用）**：

> 「此方法**只能获取看得到的页面**！！！可以**绕过复制等限制**，**不能破解会员**」

⇒ 本文只解决「**展示 / 复制限制**」；文库类的「按页付费 / 会员」是**另一层**，**不在本文射程**。

**与形态①的关系**：文库「打印」拿到的常常是**渲染后的页面**（等同截图），
不一定是原始 PDF；要**原始 PDF** 仍要走 §3/§4/§7 的取数链路。

### 9.10 ★ 内嵌 PDF 的密码两条路线（1385134）

| 路线 | 做法 | 备注 |
| --- | --- | --- |
| **解密 JS 法** | 密码是 `_0x4c77('0x2', 'V%DS')` 的结果 ⇒「**直接运行即可出结果**」 | 该「最强加密」的 JS 很短，「直接看都能看出来」 |
| **劫持事件法** | 在「输入密码以打开此 PDF 文件」弹窗的**确定按钮监听处**下断点 → 刷新断下 → **鼠标悬停 `value`** 看密码 | 找不到监听位置就**切到元素界面再点一次**再断 |

> 两条路线是**互备**：JS 太绕就走事件法；事件监听难定位就走 JS 法。
> 拿到密码后若要**免密**，源文建议用在线解锁站（如 ilovepdf 的 `unlock_pdf`）。

### 9.11 ★ blob 下载片段（1385134 原样收录）

```js
var bstr = atob(PDFData)              // 1) base64 → 二进制字符串
var leng = bstr.length                // 2) 长度
var u8arr = new Uint8Array(leng)      // 3) 建字节数组
while (leng--) {
    u8arr[leng] = bstr.charCodeAt(leng)   // 4) 逐字节填入
}
const blob = new Blob([u8arr], {type: 'application/pdf'})   // 5) 生成 blob
const fileName = `jiemipdf.pdf`
const link = document.createElement('a')                    // 6) 造 a 标签
link.href = window.URL.createObjectURL(blob)
link.download = fileName
link.click()                                                // 7) 模拟点击下载
window.URL.revokeObjectURL(link.href)
```

- **登记（源文观察）**：源文注「（搞不懂为啥**比 python 解码还快**。。。）」
  ⇒ 只登记现象，**不判因**（本文不替它解释）。
- 变量名可能不同 ⇒「如果 `PDFData` 变量名变了记得重命名」（源文自注）。
- Python 侧等价动作见 §4.1。

### 9.12 ★ 软件差异登记（**只登记不判因**，2088383）

同一份带密码 PDF，**同一密码**：

| 软件 | 结果（源文观察） |
| --- | --- |
| Chrome、2345PDF 阅读器 | **报密码不对** |
| Edge、福昕 PDF 编辑器、ilovepdf 在线解锁 | **能正确打开** |

- 源文推测「可能是**软件 bug**」⇒ **本文只登记，不判因**。
- **可迁移的处置**：遇到「密码看着对却打不开」，先**换一个阅读器/在线解锁站**再怀疑密码本身。

### 9.13 ★ 逐页图片流的迁移点（1674294，详见 §8）

- 元数据整串 **base64 + AES/ECB + PKCS#7 + JSON**，是这类阅读器的常见组合；
- **加密只覆盖中间 10% 的字节**（`[0.45L, 0.55L)`）且**要走 `canvas_info` 索引表**
  ⇒ 只解元数据不解图片 = **半成品**；
- 「图片地址开头 `sample img tmp`」⇒ **先试改 host 拿永久地址**，可能整条签名链都不用扣。

---

## 10. 排错速查

| 现象 | 判断 | 处置 |
| --- | --- | --- |
| `Range: bytes=0-` 报错 / 拿到的 PDF 坏 | 服务器返回区间**小于**请求区间（该案例实测小约十个字节） | 以 `Content-Range` 的 `total` 为边界核对，逐块按响应头对齐（§3.1/§9.2） |
| 首次响应带 `Content-Range` 却「没有文件传输」 | 这是**探长握手**，不是失败 | 照原样发第二条带 `Range` 的请求（§3.2） |
| 解出来的东西开头不是 `%PDF-` | 抓错变量 / 还差一层解码 | 用 §9.1 四种表示法对头；查是否 base64 / hex / bytes 未换算 |
| 响应体「啥也看不懂」 | 形态③ 整体加密 | XHR 断点看堆栈；是 wasm 就先看能否**直接 hook 整份 PDF 出口**（§5.2） |
| 下载下来的 PDF **要密码** | 形态② / ④ 的常见附带 | §9.10 两条路线；pdf.js 走 §6.2 / §9.6 |
| 密码看着对、Chrome 却打不开 | 软件差异（已登记） | **换阅读器 / 在线解锁站**（§9.12），别急着改密码 |
| 响应没加密、curl/直接打开**都拿不到** | 疑似**一次性 URL** | 做 §9.7 的两个验证动作；按 §7.3 复现签名后循环 |
| 同一链接第一次成功、第二次失败 | **坐实一次性** | 每页重算 `nonce/stime/sign`（§9.8） |
| `ctrl+P` 打印失效 | 文库展示限制（CSS） | 全局搜 `@media print` 删掉；**边界见 §9.9** |
| 图片页解出来是花的 | 漏了 `canvas_info` 索引重映射那一步 | 先解元数据 ECB，再对中间 10% 字节走索引表（§8.2） |
| 图片地址带 `sample/tmp` 字样 | 很可能是临时缓存 | 先试改 host 拿永久地址（§8.3） |
| 站点给的是「需专用阅读器打开的下载件」 | 那是**另一套 DRM 工具链** | 不属本文形态；回 `SKILL.md` / `references/license-and-key-hierarchy.md` 定层 |

---

## 11. 来源表（可复核）

| # | 来源文章裸 id | 标题 | 日期 | 它贡献了哪几条 |
| --- | --- | --- | --- | --- |
| 1 | `52pojie-1375791` | 关于 GB688 文件下载的脚本讨论 | 2021-02-23 | 形态① 的 **320 KiB 分块**与两块 `Content-Range` 实测；§3.2 **两次请求语义**；§5.3 **wasm 解 key 三元组（`HCNO` → `_init` → `UTF8ToString`，`#` 段是 IV）**；「0-2967096/2967097」边界复算 |
| 2 | `52pojie-1385134` | 记一次有限制的网页 pdf 破解 | 2021-03-07 | 形态② 的**单文件 30MB HTML + `data:application/pdf;base64,` + `convertDataURIToBinary`**；§9.10 **密码两条路线**（`_0x4c77('0x2','V%DS')` / 劫持事件看 `value`）；§9.11 **blob 下载片段**（含「比 python 还快」观察） |
| 3 | `52pojie-1433013` | 某度文库导出 pdf 格式的 html | 2021-05-04 | §9.9 **`@media print` 破除法**与**边界**（「只能获取看得到的页面 / 不能破解会员」） |
| 4 | `52pojie-1674294` | 在线阅读文档解密（**本篇主源**） | 2022-08-11 | §9.1 **PDF 文件头四种表示法**；形态① **Range 懒加载 + 「小十个字节」实测坑**；形态② base64→blob；形态③ **XHR 追栈 + wasm `_decodeData` 直接 hook 整份 PDF**；形态⑤ **一次性 URL 两个验证动作 + 四参数 + `MD5('123456'+nonce+stime)` 分页**；形态⑥ **元数据 ECB + `canvas_info` 索引重映射 + 改 host 拿永久地址**；EPUB / PNG 附形态（EPUB 部分归 `ebook-and-container-drm.md`） |
| 5 | `52pojie-2088383` | pdf.js 通用 pdf 下载教程 | 2026-01-23 | 形态④ `PDFViewerApplication.download()`「基本上通用」；§9.4 **`.onPassword` 追码**；§9.5 **base36 两位一组解码**（含可复算的实测输入输出）；§9.6 **postMessage 自动传密码链 + `r0inab`/`r0inyk`**；§9.12 **软件差异登记** |
| 6 | `52pojie-1960261` | 某试读解密 | 2024-09-01 | §5.4 **自描述容器**（`salt=0x0..0x8` / `iv=0x8..0x18` / `ct=0x18..` + `PBKDF2-SHA256/65536/128bit` → AES-CBC → pdf.js）；**本库逐字节复算源文给出的 PBKDF2 样本**（`1f67c8ca…` 命中）；源文残留 RC4 段（`RC4KEY` 解出 `WHAT THE FUCK`）登记为无对应链路 |

> 「日期」= 来源文章发布时间（**不是**站点改版时间）。站点随时会换鉴权、分块粒度与加密形态
> ⇒ **引用本表时必须连同日期一起引用**。

---

## 12. 与其他文件的分工（交叉引用导航）

- **容器型 / 章节型内容保护（EPUB、阅读器章节接口）** → `references/ebook-and-container-drm.md`
- **试看门控 / 索引被截断（m3u8 分片族）** → `references/preview-gating-and-segment-enumeration.md`
- **m3u8 / TS / PES / NAL 分层与 key/IV 四类来源** → `references/hls-and-ts-structure.md`
- **wasm / 白盒加密** → `references/whitebox-and-wasm-crypto.md`、`../../wsam-reverse/SKILL.md`
- **key 二次构造（W 族）** → `references/key-wrapper-families.md`
- **接口签名 / 参数还原 / 调试点定位** → `../../web-reverse-algorithm/SKILL.md`、
  `../../web-reverse-algorithm/references/15-call-site-locating-playbook.md`、
  `../../web-reverse-algorithm/references/16-ciphertext-structure-diagnostics.md`
- **反调试 / 现场改码（`debugger`、`ctrl+shift+I` 被封）** →
  `../../web-reverse-algorithm/references/07-antidebug-and-live-patching.md`
- **混淆外壳（jsjiami / OB）** → `../../ast-deobfuscation/SKILL.md`
- **浏览器环境补全 / 会话 Cookie** → `../../web-js-env-patcher/SKILL.md`
- **hook 与 RPC 免扣** → `../../web-reverse-hook/SKILL.md`
- **「自描述密文 / 响应自带密钥 / 算法分支切换」通用骨架** →
  `../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`
