# 电子书 / 容器型内容保护（EPUB / PDF / 章节接口）

**这一篇回答的是**：目标不是 `m3u8 + ts`，而是「**一章一份的加密内容**」——
在线阅读器、EPUB / PDF 平台、文档站。加密对象是**文本/资源包**，不是分片流。

**为什么要单独一篇**：容器型 DRM 的**分层判据完全不同**。
`SKILL.md` 的分层表是围绕 `m3u8`/`ts` 写的，套到这里会出现「既不是 A 层也不是 C 层」的卡死。
本文件给出这一族的判据、配方与坑。

> **先划边界**：本文只管「**一章一份的加密正文**」（章节接口 / EPUB 正文 / 分章交付的阅读器）。
> 若目标是**一页 / 一整份 PDF / 一张图片**，或现象是「页面能看、下载器拿不到 / 下到的 PDF 要密码」，
> 那属于**载体形态**问题（Range 分块 / base64 内嵌 / 整体 AES / pdf.js 容器 / 一次性签名 URL）
> ⇒ 去 `references/online-document-unlock.md`（`SKILL.md` 分层表「在线文档载体层」那行）。
> 两篇的分界是**内容单位**：**一章一份** → 本文；**一页/一整份** → `online-document-unlock.md`。

---

## 1. 先判：这是不是容器型

| 现象 | 结论 |
| --- | --- |
| 请求链路上出现 `read_chapter` / `chapter` / `content` / `bookId` / `chapterId` 之类字段 | 容器型 |
| 响应体「看起来像 XML / HTML / JSON，但解不开」 | 容器型，内容被整体加密 |
| 请求参数里有个 `k` / `params` / `enc` / `data` 字段，值是密文 | 容器型 |
| 页面 JS 里出现 `Uint8Array` + 一个**自己写的长度读取函数** | 容器型，且是「长度前置」的自描述密文 |
| 拿到的是 `m3u8` / `.ts` / `EXT-X-KEY` | 不是本文件，回 `SKILL.md` 分层表 |
| 目标是**一页 / 一整份 PDF / 一张图片**：面板只见 `Range`、`data:application/pdf;base64,`、pdf.js worker、或「每页 4 个签名参数」的 URL；或「下到的 PDF 要密码」 | **不是本文件**，去 `online-document-unlock.md`（载体形态分流） |

**通用流程**：

```
① 抓一次"点下一章"的请求（不要刷新后再点，直接点下一章，便于定位）
② 请求参数里那个可疑字段 → 搜关键词（请求路径里的动作名最有效，如 read_chapter.action）
③ 响应体是密文 → 同一个 JS 文件里，解密函数几乎必然就在加密函数下面（"摸鱼三大法则"）
④ 章节 id / bookId 拿不到 → 翻【上一次响应的解密结果】，它常常藏在里面
```

> **③ 的经验依据**：加密与解密成对出现是绝对规律，
> 而且**解密函数就在加密函数的下一屏**（同一对象、相邻行）。
> 这条经验在本族实测中命中率极高，比全局搜 `decrypt` 快得多。

---

## 2. 配方 A：某东系在线阅读（PC / H5-1）

**链路**：

```
read_chapter.action?...&k=<密文>
    ↓  k = encryption(JSON)     JSON 形如 {"encrypt":1,"bookId":"...","chapterId":"..."}
    ↓  响应是 hex 密文
    content = decryption(响应hex)   → {"contentList":[{"content":"<XHTML>"}]}
```

**实现形态**：`k` 与响应解密是**一对自写加解密函数**，形如

```js
function encryption(s) {
    return pc1[enc](pc1[enc2](pc1.utf16ToBytes(s), pc1.stringToBytes(口令), false));
}
function decryption(hexStr) {
    return pc1.bytesToUtf16(pc1[dec](pc1.hexToBytes(hexStr), pc1.stringToBytes(口令), true));
}
```

注意 `utf16ToBytes` —— **不是 UTF-8**。用 Python 侧按 UTF-8 复现会**长度就对不上**。

**工程化处置（本族最省力的做法）**：

> 因为函数很短、依赖也短，**直接把这两个函数原样存成 js 文件，用 execjs 调用**，
> 不要去还原混淆、也不要用 Python 重写 `utf16ToBytes`。
> 实测「加密后的内容与网页返回**完全一样**」，一次到位。

**陷阱**：

- `chapterId` **不在**原始请求的明文里，也不在任何接口的明文响应里。
  它藏在**上一次请求的解密结果**中，而且**名字不叫 chapterId**。
  定位手法：记下密文解出来的那个可读 JSON，在里面按**值的长度/形态**找（它就是下一个章节号）。
- 请求侧返回的 `k` 是**每章一变**的（因为明文里含 chapterId）⇒ 不要复用。

---

## 3. 配方 B：某东 H5-2（webpack 产物，`enc=1` 家族）

**链路**：

```
encData(e) {
    t = this.getKey(this.time)
    n = this.encrypt(e.split("?")[1], t, this.time)
    return e.split("?")[0] + "?enc=1&app=" + this.app + "&tm=" + this.time + "&params=" + encodeURIComponent(n)
}
```

**🔴 最大的坑：算法按时间戳奇偶切换**

```js
return n % 2 == 0 ? this.AESEncrypt(e, t) : this.DESEncrypt(e, t);   // n === this.time
```

⇒ **同一份 JS 里同时存在 AES 与 DES 两条路**，走哪条取决于 `tm` 的奇偶。
**处置：把 `tm` 写死成偶数**，锁定 AES 分支（原文即如此做，因为不需要碰 DES）。
无脑按 AES 复现会在奇数的请求上**解出乱码但不报错**。

**算法**：

```
AESEncrypt(e, t) {
    n = Utf8.parse(e);
    o = MD5(Utf8.parse(t));               // key = MD5(tm) 的 WordArray（16 字节）
    return AES.encrypt(n, o, {mode: ECB, padding: Pkcs7}).toString();
}
```

- **ECB / PKCS7 / 无 IV**；key 是 `MD5(时间戳字符串)` 的 16 字节结果。
- 解密侧同构（`AESDecrypt(e, t)`），key 同样是 `MD5(t)`。
- **惯例动作**：复现完一定用第三方工具（在线 AES 或另一份实现）对拍一次，**防魔改**。

**同接口的其他参数**：

```
uuid = "h5" + guid()             // guid = 4 段 (((1+random())*0x10000)|0).toString(16).substring(1) 拼接
     → 存 localStorage["_u"]；即 localStorage 里已有 u 就用 u
sign  = md5( salt + URI + queryString )      // URI 不带 query
salt  = md5( app + time + uuid )
```

**陷阱（调试姿势）**：

- 搜 `uuid` 定位不到关键位置时，**先 `localStorage.clear()` 再刷新**：
  如果页面回到登录界面 ⇒ `uuid` 是**登录时写入**的，去登录流程里找。
  这个「清空后观察行为变化」的手法比继续单步快得多。
- `sign` 与 `uuid` 出自同一个 `utils/encrypt.js`，**一次基本能一起拿到**（原文即在此处同时发现）。
- `team_id` 是机构号，**在 cookie 里**，不要费劲找算法。

---

## 4. 配方 C：某学堂 EPUB（**双层 AES/ECB + 长度前置**）

**现象**：`epub?bid=<id>` 返回的**不是图片**（PDF 模式返回图片，不需要解密），
而是**整体加密的 EPUB 内容**。响应很长、`Uint8Array` 满天飞。

**定位手法**：搜 **`Uint8Array`**。解密后必然要把它当字节流用，
所以 `new Uint8Array(...)` 附近就是解密出口。

**关键结构常量 —— `dpbt`（自己写的长度读取函数）**：

```js
dpbt = function(t) {
    var r = new Uint8Array(4), e = r.length - 1, i = t.length - 1;
    for (; e >= 0; e--, i--) r[e] = i >= 0 ? t[i] : 0;      // 取末 4 字节
    return (255 & r[0]) << 24 | (255 & r[1]) << 16 | (255 & r[2]) << 8 | (255 & r[3]);
}
```

⇒ **密文尾部 4 字节是大端长度**（自描述密文的「长度前置/后置」变体）。

**算法**：

```
第一层：AES/ECB 解密 → 得到第二层的 key
        （原文里 o 是定值、a 恒为 48 ⇒ 16 + 32 的拼接长度）
第二层：AES/ECB 解密 → EPUB 正文
🔴 且正文必须先去掉【前 10 个字符】再解
```

**判据**：「双层 AES/ECB + 正文要跳过定长前缀」是本族的常见形态；
`dpbt` 这类自写函数**返回的值**就是你要跳过的长度或要取的字节数——
**先把它的返回值打印出来**，别猜。

**工程化处置（本族最省力）**：第一层解出的 key 就是最终 AES 的 key，
**把两次 ECB 解密串起来，用 `media_crypto.py aes-ecb` 直接跑**（无填充那档），不必还原整份 OB 混淆。

**混淆外壳**：这类站点的 JS 常是 OB + 平坦流 + 花指令，一键还原插件**可能无效**。
⇒ 外壳问题交给 `../../ast-deobfuscation/SKILL.md`，**但不要为了外壳停下**：
本族的算法只有 AES-ECB + 长度跳过，**先按上面配方解，解出来了就不用还原壳**。

---

## 5. 容器型通用配方（拿到明文之后）

| 产物 | 下一步 |
| --- | --- |
| 解出 `{"contentList":[{"content":"<XHTML>"}]}` | 按 EPUB 结构回填：`META-INF/container.xml` → `OEBPS/*.xhtml` |
| 解出的是 base64 的图片 | PDF 模式通常**不加密**，直接拼 |
| 解出的是 **hex** | 先 hex→bytes，再看是不是 `PK\x03\x04`（zip ⇒ EPUB 本体） |
| 解出的是**整包 zip** | `PK\x03\x04` 开头即 EPUB：直接当普通 zip 解，`mimetype` 必须是第一个条目且**不压缩** |

**EPUB 最小结构**（自己拼包时用）：

```
mimetype                     # 内容就是 application/epub+zip，必须第一个、stored 不压缩
META-INF/container.xml       # 指向 OEBPS/content.opf
OEBPS/content.opf            # manifest + spine
OEBPS/*.xhtml                # 正文章节（上面解出来的 content）
```

**验收判据**：解出的 XHTML 能被任意 EPUB 阅读器打开 ⇒ 才算成功。
「解出可读字符串」只是间接证据（和流媒体那边的「解出字节」同级）。

---

## 6. 坑表

| 坑 | 触发 | 表现 | 正确做法 |
| --- | --- | --- | --- |
| 按 UTF-8 复现 `utf16ToBytes` | 对端用的是 UTF-16 | 长度就对不上，或末尾乱码 | 看函数名，按 UTF-16 走；或直接 execjs 调原函数 |
| 没发现 AES/DES 由时间戳奇偶切换 | 同一份 JS 里有两条加密路 | **奇数请求解出乱码，不报错** | 把 `tm` / `time` 写死到固定分支 |
| 正文没跳过定长前缀 | 对端在密文前垫了 10 个字符 | 解密报填充错，或前几字节乱 | 先打印自写长度函数的返回值 |
| 缓存了某一章的 key | 每章 key / 每章密文都变 | 「这章能解下章不行」 | 每章现取现解 |
| 花时间还原 OB 外壳 | 以为壳不还原就没法解 | 白花数天 | 先按「AES-ECB + 长度跳过」直接解，解出来就不用还原 |
| 清了 `localStorage` 后忘了重新登录 | 调试时清过 | 后续请求全部失败 | 记住 `uuid`/token 常由登录写入 |
| 把 PDF 模式也当加密 | PDF 返回的是图片 | 白忙 | 先确认返回的是图片还是密文 |
| 只验「解出可读字符串」 | 对标错到别的字段 | 后面章节全错 | 认准 `contentList[].content` 是 XHTML，并用阅读器打开验收 |

---

## 7. 和其他文件的分工

- 流媒体（m3u8 / ts / DRM 许可证） → `SKILL.md` 分层表 + `hls-and-ts-structure.md`
- 在线 PDF / 文库 / 阅读器的**载体形态**（Range 分块 / base64 内嵌 / 整体 AES / pdf.js / 一次性签名 URL） → `online-document-unlock.md`
- 厂商 key 方案与接口配方 → `vendor-key-schemes.md`
- 混淆外壳（OB / 平坦流 / jsjiami） → `../../ast-deobfuscation/SKILL.md`
- 纯接口签名（不含内容加密） → `../../web-reverse-algorithm/SKILL.md`
- 「自描述密文 / 响应自带密钥 / 算法分支切换」的**通用骨架推断** →
  `../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`
