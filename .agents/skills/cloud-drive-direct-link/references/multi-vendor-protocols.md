# 多厂商协议矩阵：百度 / 123 / 夸克 / 文叔叔 / 阿里云盘

**唯一权威源。** 本文覆盖蓝奏云系之外的**五个厂商**的"分享链接 → 可用直链"链路。
蓝奏云系见 `lanzou-protocol-generations.md`；门禁/时效/302 见 `direct-link-gating-and-freshness.md`。

> ⚠️ 与蓝奏云的**根本差别**：蓝奏云的终点是一个**匿名可下的 URL**；
> 百度 / 夸克 / 文叔叔 / 阿里云盘的终点多是**带账号态的临时签名 URL**（阿里云盘 `url_expire_sec`：源文**显式传 1800** 秒，源文未说明服务端默认值）。
> 所以这一族**更难"只给输入不给账号"**：百度群分享与直链可匿名（分享者公开分享），
> 夸克/阿里云盘/文叔叔上传侧**必须自带登录态或匿名 token**。

## §1 三十秒判厂商

| 现象 / 域名 | 厂商 | 走哪一节 |
| --- | --- | --- |
| `pan.baidu.com` / `yun.baidu.com` / `bdstoken` / `BAIDUID` | 百度网盘 | §2（**三代链路，按年份分**） |
| `123pan.com` / `/b/api/share/` / `S3keyFlag` | 123 云盘 | §3 |
| `drive.quark.cn` / `pr=ucpro&fr=pc&ve=` / `fids` | 夸克网盘 | §4 |
| `wenshushu.cn` / `x-token` / `wss1.cn/f/` | 文叔叔 | §5 |
| `api.aliyundrive.com` / `drive_id` / `authorization` / `part_info_list` | 阿里云盘 | §6 |
| `pan.teambition.com` / `orgId` / `spaceId` | 阿里云盘**团队版**（Teambition） | §6.3 |

**判代际（仅百度）**：分享页 HTML 里搜 `fs_id` ⇒ §2.1（2015）；
搜 `api/streaming?path=` ⇒ §2.2（2017）；搜 `bdstoken` + `mbox/` ⇒ §2.3（2020 群分享）。
**不要混用**：三代用的字段名、接口路径、鉴权方式完全不同。

## §2 百度网盘：三代链路

### §2.1 §A 分享直链（2015 代）

分享页 HTML 是唯一参数源，五个正则：

| 字段 | HTML 里的锚点 | 备注 |
| --- | --- | --- |
| `fs_id` | `fs_id":` 到 `,` | 文件 ID，**一次只能取一个** |
| `uk` | `yunData.SHARE_UK = "` 到 `"` | 分享者 ID |
| `shareid` | `"shareid":` 到 `,` | |
| `sign` | `sign":"` 到 `"` | 一次性 |
| `timestamp` | `"timestamp":` 到 `,` | 源文只做取值、**未给单位**（同文件的时间戳助手写的是 13 位，推测为秒级 —— 未证） |

**判文件夹**：`"isdir":` 为 `1` ⇒ 不支持，直接返回（别硬拼）。

请求（**必须 POST + 两个头**）：

```
POST http://pan.baidu.com/api/sharedownload
     ?sign=<sign>&timestamp=<timestamp>&bdstoken=&channel=chunlei
     &clienttype=0&web=1&app_id=250528
Referer: <分享页 URL>                      ← 必带
X-Requested-With: XMLHttpRequest           ← 必带
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Cookie: BAIDUID=<…>:FG=1

encrypt=0&fid_list=<urlencode("["+fs_id+"]")>&primaryid=<shareid>&product=share&uk=<uk>
```

响应读法：

| 响应特征 | 含义 | 处置 |
| --- | --- | --- |
| `{"errno":0` | 成功 | 取 `dlink`（**`\/` 要换成 `/`**）、`server_filename`、`size` |
| `error=-20` | **需要验证码** | 换一条路或带完整登录态；不要继续重试 |
| 其他 | 失败 | 把原文当 reason 返回，别猜 |

拿 `dlink` 之后再请求一次（带 `pcsett` cookie），若响应里出现 `{"error_code":302` ⇒ **取 `Location`**。
这一跳才是真直链。

#### §2.1.1 直链 host 替换（带宽调优，不是修复）

解析出来的直链开头若是 `d.pcs.baidu.com`，**可以**替换成 `yqall02.baidupcs.com`：

- **适用**：`d.pcs` 资源不理想（速度上不去）时对比带宽；
- **不是修复**：原 host 是能下的，别把它当"必须替换"的步骤；
- 来源把该替换做成了工具开关（「替换资源链头」）。**源文未说明默认开关状态**（别默认它开着）。

#### §2.1.2 语料陷阱：`&times;` 实体吃掉 `&timestamp=`

`52pojie-443111` 的源码行里写的是：

```csharp
string durl = "http://pan.baidu.com/api/sharedownload?sign=" + sign + "×tamp=" + timestamp + "&bdstoken=…";
```

**`&timestamp=` 被 Markdown 渲染成了 `&times;` 实体**（`&times;` = `×`），于是只剩 `×tamp=`。
不报错、不变红，只会让参数名从 `timestamp` 退化成 `tamp`。
**这是与 `52pojie-1899689`（咪咕 `&timestamp=` → `×tamp=`）同型、第二次出现的坑** ⇒ 已升格为通用判据：

> 从论坛/博客语料里抄请求串时，**先搜 `×`（U+00D7）**。凡出现 `×tamp=` / `×t=`，
> 都是 `&times` 实体残留，原文是 `&timestamp=` / `&t=`。

### §2.2 §B 云端转码 m3u8（2017 代）

播放器播的是**网盘云端转码后的 m3u8**，接口就一个：

```
GET https://pan.baidu.com/api/streaming
      ?path=<urlencode(网盘内文件路径)>&type=M3U8_FLV_264_480&app_id=250528&t=<随机小数>
```

| 现象 | 含义 | 处置 |
| --- | --- | --- |
| `{"errno":-6,…}` | **缺 cookie** | 补自己的 cookie（`PANWEB=1; bdshare_firstime=…`） |
| 正常返回 | m3u8 文本 | 手机端可直接播；PC 端播放器受 `crossdomain.xml` 限制 |

**`t=<随机小数>`**：源文只给出取值形态（`t=0.32432524021714926` / `t=0.18165189120918512`）、**未说明语义** ⇒ 「防缓存用、不参与校验」是**推测**（未证；真机复核前别依赖它）。
**PC 端"拿到了却播不了"** 是 `crossdomain.xml` 问题，不是解析问题 —— 站点只允许自家域取流；
要么用百度自己的播放器，要么在**你自己的**站点根放一个允许全域的 `crossdomain.xml`。
**别把这个当成算法问题去调参。**

### §2.3 §C 分享群转存（2020 代，需要登录态）

链路是**四跳**，全程 `GET`/`POST` 都带 `bdstoken` + `logid` + `channel=chunlei&web=1&app_id=250528&clienttype=0`：

| 跳 | 接口 | 关键参数 | 取什么 |
| --- | --- | --- | --- |
| 0 | `GET /disk/home` | — | 正则 `"bdstoken":"([0-9a-z]+)","is_vip"` |
| 1 | `GET /mbox/msg/historysession` | `t=<now>` | `records[].{gid, uk, name}`（**`gid` 为空的行跳过**） |
| 2 | `GET /mbox/group/listshare` | `gid=&limit=50&desc=1&type=2` | `records.msg_list[].{msg_id, file_list[]}` |
| 3 | `GET /mbox/msg/shareinfo` | `msg_id=&page=1&from_uk=&gid=&type=2&fs_id=&num=1000` | `records[]` 文件树 |
| 4 | `POST /mbox/msg/transfer` | `from_uk&msg_id&path&ondup=newcopy&async=1&type=2&gid&fs_ids` | `errno==0` 即转存成功 |

#### §2.3.1 两条"判文件夹"的冲突口径（都用，场景不同）

| 场景 | 判据 | 依据 |
| --- | --- | --- |
| `shareinfo` 返回的**条目**是文件还是目录 | **有 `md5` 字段的是文件，没有的是目录** | `52pojie-1208082`："只有文件才会有 MD5 这个参数，文件夹是没有的" |
| `sharedownload` 的**分享对象**是文件还是目录 | `"isdir":1` ⇒ 目录 | §2.1 |

前者用来**递归下钻**（目录 ⇒ 用它的 `fs_id` 再请求一次 `shareinfo`），后者用来**直接拒绝**。

#### §2.3.2 转存去重：**别用 MD5**

`52pojie-1208082` 明确记录："这里用 md5 会出问题…**实测同一个有些文件转存之后 MD5 会发生改变**"（**原文限定词是「有些文件」**，不要读成「必然改变」）。

**正确判重键 = `server_filename` + `size`**（同一目录下 `GET /api/list?dir=<path>&num=1000` 拉列表比对）。
用 MD5 判重会把已存在的文件当成"不存在"而重复转存。

#### §2.3.3 `errno` 速查

| errno | 含义 |
| --- | --- |
| `0` | 成功 |
| `-9` | **没有这个文件夹**（`/api/list` 的 `dir` 不存在） |

### §2.4 `logid` 参数：**它跟 `baiduid` 没关系**

来源把 `logid` 说成"用 `baiduid` 算出来的"（`ctx.call("w", baiduid, "")`），但**读源码可知入参被丢弃**：

```js
m = function() { return p(f((new Date).getTime())) }        // ← 零形参
w = function(e, t) { return t ? m(String(e)).replace(…) : m(String(e)) };  // ← String(e) 传给 m 后被忽略
```

**三条机器可判的结论**（`scripts/multi_vendor_parse.py logid` 已做成断言）：

1. **`logid` 只依赖 `Date.now()` + `Math.random()`**，与 `baiduid`、与任何账号字段无关。
   换 `baiduid` 重跑，`logid` 形态不变。
2. **那个自定义 base64 字母表（源文原串共 **73** 字符）里，尾部 9 个字符是死代码。**
   `s = "ABC…xyz0123456789" + "+/" + "~！@#￥%……&"` 共 **73** 个字符，但编码时三字节块 `n` 是 24 位，
   四个 `charAt` 的下标最大是 `63 & n = 63` ⇒ **只会取到前 64 个字符，而前 64 个恰好就是标准 base64 表**。
   ⇒ **`logid` 就是标准 `base64(毫秒时间戳 + Math.random())`**。写成"自定义字母表 decoder"会白写一大段。
3. **`f(e)` 里的 UTF-8 转义分支对 ASCII 输入永不触发**：`d = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g`，
   而输入是纯 ASCII ⇒ `replace` 是恒等变换。
4. **padding 是按"块"算的，不是按整个输入算的**：`p` 用 `e.replace(/[\s\S]{1,3}/g, g)` 切块，
   `g` 内部的 `t = [0, 2, 1][e.length % 3]` 里的 `e` 是**当前这一块**。
   按总长算会把 `"1234"` 编成 `MT==NA==`（错），正确是 `MTIzNA==`。
   —— 这条是我自己第一版实现写错、被自检里那条"73 字符表 == 标准 base64"断言抓出来的。

复算：

```bash
python scripts/multi_vendor_parse.py logid --input '16990000000000.842315623456789'
python scripts/multi_vendor_parse.py logid --audit        # 打印字母表审计
```

### §2.5 `createLinkShare.js` 原型替换（AMD 模块劫持）

自定义分享密码（**不是**破解，是给自己分享的文件设任意密码）：

```js
require(["function-widget-1:share/util/service/createLinkShare.js"])
  .prototype.makePrivatePassword = () => prompt("请输入自定义的密码", "1234");
```

| 要点 | 说明 |
| --- | --- |
| **前置动作** | 必须先点一次「分享」按钮，**让 AMD 模块载入**；否则 `require` 拿不到那个模块 |
| 密码约束 | 4 个字符，中文要配数字或字母 |
| 已知瑕疵 | 密码含中文时首次访问报错，**刷新一次才正常** |

**这是"AMD `require` 取模块 + 替换原型方法"的通用手法**（不只是改密码）：凡是
`require(["function-widget-N:…"])` 能取到的模块，都能在运行时替换其 `prototype` 上的方法。
与 §2.1.1 的 host 替换、`1735138` 的 `video.pause = null` 同属**"不改源码改运行时"**一族。

### §2.6 客户端平台伪装（`navigator.platform`）：**限制在前端，不在协议里**

来源 `52pojie-742650`（2018 年，转载，工具 `BaiduYunEnhancer` 0.5.2）。整个脚本**只有一行有效代码**：

```js
// ==UserScript==
// @match        http*://pan.baidu.com/*
// @run-at       document-start
// ==/UserScript==
Object.defineProperty(navigator, 'platform', { get: function () { return 'Maoger'; } });
```

脚本自己的 description 直接说明了目标：「通过修改浏览器的操作系统和（或）硬件平台（`navigator.platform`），
破解 百度云/百度网盘 的下载限制」。

| 要点 | 说明 |
| --- | --- |
| **`@match http*://…`** | `http*` 是合法写法，等价于 **http + https 两条**；只写 `https` 会漏掉 http 入口 |
| **`@run-at document-start` 是必须的** | 站点在**页面脚本里**读 `navigator.platform`；装晚了读到真值。注入时机四档见 `../../web-reverse-hook/SKILL.md`「断点暂停」一节 |
| **必须用 `defineProperty` 覆盖 getter** | 直接 `navigator.platform = 'X'` 在多数浏览器上是**只读属性、静默失败**（赋值不报错但读出来还是真值） |

**判据（这才是本节的长期价值）**：接口链路**完全正确**、直链也拿到了，但**行为仍被限制**
（限速 / 要求装客户端 / 要求登录），**且 Network 里看不到任何额外请求** ⇒
限制落在**前端环境判断**上，不在协议里。此时去查 `navigator.platform` / `navigator.userAgent` /
`navigator.hardwareConcurrency` 这类**被读了但没影响请求**的属性。

⚠️ **边界与时效**：这是 2018 年的手法，今天的百度早已换成**服务端限速 + 客户端签名**
（`x-device-id` / `x-signature`，见 `signed-api-and-helper-scripts.md`）—— **不要把这一行当今天的可用解**。
它登记的是**判据**与**手法族**：与 §2.1.1 的 host 替换、§2.5 的原型替换、`1735138` 的 `video.pause = null`
同属「**不改源码改运行时**」，区别只在「改的是环境 / 地址 / 方法 / 播放器」。

## §3 123 云盘：三步，终点藏在 `params=<base64>` 里

| 步 | 接口 | 参数 | 取什么 |
| --- | --- | --- | --- |
| 1 | `GET /b/api/share/get` | `limit=100&next=1&orderBy=share_id&orderDirection=desc&shareKey=<sid>&SharePwd=<pwd>&ParentFileId=0&Page=1` | `data.InfoList[0].{Type,FileId,Size,S3KeyFlag,Etag}` |
| 2 | `POST /b/api/share/download/info` | JSON `{ShareKey,FileID,S3keyFlag,Size,Etag}` | `data.DownloadURL` |
| 3 | `GET <DownloadURL>` | — | `data.redirect_url` |

**输入解析**：`shareId` 用 `/(?<=\/s\/)[^\/.]+/`，提取码用 `/提取码:(\w+)/`。

> ⚠️ **源正则有个真实缺陷**：`[^\/.]+` **没有排除空白**。而"分享链接 + 提取码"最常见的粘贴形态是
> `https://…/s/AbCd-1234 提取码:xyz9`（中间是空格），源正则会把 `AbCd-1234 提取码:xyz9` **整段**当成 shareId。
> 本技能的实现加了 `\s`（`[^/.\s]+`）与全角冒号兼容（`提取码[:：]\s*(\w+)`），并做了阴性对照断言。
> **拿到 `shareKey` 后先 `assert` 它不含空格**，这是最便宜的一道体检。

### §3.1 两个静默坑

1. **`DownloadURL` 不是可直接请求的 URL**，它长这样：`…?params=<base64>&…`。
   **要取出 `params=` 的值做一次 `base64_decode`**，解出来才是真正的请求地址。
2. 解出来的地址**要补 `auto_redirect=0`**（已经是它的 query 就补 `&`，否则补 `?`）。
   **判据是"解码后的串里有没有 `auto_redirect`"**，不是"原串里有没有" ——
   在第 3 步的响应上判会永远为假。补上后响应里的 `data.redirect_url` 才是直链。

```bash
python scripts/multi_vendor_parse.py pan123 --download-url 'https://…?params=<base64>'
```

**边界**：`Type != 0` 是文件夹，源实现直接报"Folder parsing is currently not supported"。

## §4 夸克网盘：一个接口 + 一个 DOM 手法

```
POST https://drive.quark.cn/1/clouddrive/file/download?pr=ucpro&fr=pc&ve=2.1.5
Content-Type: application/json;charset=utf-8
{"fids": ["<fid>", …]}            →  data[].download_url
```

| 要点 | 说明 |
| --- | --- |
| **前提** | 必须**先保存到自己网盘**（端点吃的是自己空间的 `fid`，不是分享 URL） |
| 批量 | `fids` 是数组，一次可拿多个 `download_url` |
| 文件夹 | **不支持**（`data` 为空） |
| 触发方式 | 油猴脚本是 `GM_xmlhttpRequest` 直打接口，再 `window.open(download_url)` |

**DOM 侧手法（可复用）**：来源的注释只写了 `// remove all event listener` —— **动机未展开**（页面用 Ant Design，疑为框架合成事件，**推测**）。做法本身是逐字正确的：

```js
btn.replaceWith(btn.cloneNode(true));   // 克隆替换 ⇒ 一次性摘掉该节点上"所有"监听器
btn = getBtn();                         // 重新取（原引用已脱离文档）
btn.addEventListener('click', handler); // 干净地挂自己的
```

**`replaceWith(cloneNode(true))` = 移除某节点上全部监听器的标准写法**，
比 `removeEventListener`（要求你拿到**同一个函数引用**）在逆向场景下实用得多。

## §5 文叔叔：整条链都要 `x-token`，且上传侧有"秒传三件套"

### §5.1 会话自举

```
POST /ap/login/anonymous   {"dev_info":"{}"}   →  data.token
之后所有请求带 header:  x-token: <token>        （每次运行重新取，游客态）
```

### §5.2 下载链（五个接口）

| 步 | 接口 | 参数 | 关键点 |
| --- | --- | --- | --- |
| 1 | `POST /ap/task/token` | `{token}` | **分享 URL 尾段长度决定语义**：16 位 = `token`（要换 `tid`）；11 位 = 直接是 `tid` |
| 2 | `POST /ap/task/mgrtask` | `{tid, password:""}` | 返回 `expire` / `file_size` / `boxid` / `ufileid`(=pid) |
| 3 | `POST /ap/ufile/list` | `{start,sort,bid,pid,type:1,options,size}` | `data.fileList[0].{fname, fid}` |
| 4 | `POST /ap/dl/sign` | `{bid, fid}` | `data.url` = 下载地址 |
| 5 | `GET <url>` | — | 落盘 |

**第 1 步的长度判据最值得记**：`len(url.split('/')[-1]) == 16` ⇒ 是 token；`== 11` ⇒ 是 tid。
**两种长度的 URL 形态完全一样，不判长度会走错分支。**

### §5.3 上传链与**秒传三件套**

链路：`/ap/user/userinfo` → `/ap/user/storage` → `/ap/task/addsend` → `/ap/upload/fast` →
`/ap/upload/psurl` → `PUT <url>` → `/ap/upload/complete` → `/ap/task/cpltsend`。

分块阈值 **2097152（2MB）**，判据是 **`size > 2097152` ⇒ `ispart=True`（分块上传）**；
`size <= 2097152`（含**恰好 2MB**）⇒ 整块上传。
> ⚠️ 别写成「整数倍就整块上传」—— 4MB 在源实现里是**分块**的（`ispart=True`）。

秒传 hash 三件套（`/ap/upload/fast` 的 `hash` 字段）：

| 字段 | 算法 | 备注 |
| --- | --- | --- |
| `cm1` | `md5(首个分块)` | 分块上传时"首个分块" = 前 2MB；否则 = 整个文件 |
| `cs1` | `sha1(同一个分块)` | 与 `cm1` 取**同一段字节** |
| `cm` | **整块上传**：`sha1(cm1)`；**分块上传**：`sha1(拼接所有分块的 md5 hex)` | 注意是 `sha1(hex 字符串)`，不是 `sha1(原始字节)` |

**`cm` 的定义是"md5 的 sha1"**，这是全链最容易写错的一处：
拿 `sha1(bytes)` 或 `md5(md5)` 都会让秒传永远返回 `isCan:false`。

**限流**：`code == 1021` 是"操作太快"，响应里有 `message` 给出等待秒数。

## §6 阿里云盘：上传协议与**专有 `content_hash`**

### §6.1 直链（最省事的一条）

```
POST https://api.aliyundrive.com/v2/file/get
{"drive_id": "<…>", "file_id": "<…>", "url_expire_sec": 1800}
→ data.url          （源文**显式传** `url_expire_sec: 1800`；源文未说服务端默认值）
```

**`drive_id` 与 `authorization` 只能抓包拿**（源文原话："可以通过 app 或者网页抓包得到"）——
本厂商**没有匿名路线**。

> ⚠️ **本文只管「上传 / 秒传 / 直链的链路与参数」**；本厂商取下载链接那一跳还要带
> `x-device-id` / `x-signature`（缺了会 `invalid X-Device-Id`）⇒ 签名字段的还原口径见
> `signed-api-and-helper-scripts.md` §2（**那份才是签名字段的权威源**，本文不复制它）。

### §6.2 上传协议与"秒传"判据

```
POST https://api.aliyundrive.com/v2/file/create   → **非 409 即视为成功**（拿 upload_id / file_id / part_info_list[].upload_url）
                                                   ⚠️ 源文主站分支**只判 409**、成功分支没有任何状态码判断；
                                                      `201` 出现在**团队版**段（§6.3），别拿它当主站成功码
                        → 409 **文件已存在** ⇒ 改走秒传分支
PUT  <upload_url> ×N    （每片 5MB，最后一片为余量）
POST https://api.aliyundrive.com/v2/file/complete
```

三分支的 hash 是**三个不同的算法**，别混：

| 字段 | 用在哪 | 算法 |
| --- | --- | --- |
| `pre_hash` | `create` 请求 | `sha1(前 1024 字节)` |
| `content_hash` | **秒传**（`create` 被 409 后重发时的 `content_hash`） | `sha1(整文件的 1MB 分块)` = 普通全文件 sha1 |
| `user_meta.hash` | `create` 请求 | **专有算法**，见下 |

#### §6.2.1 专有算法：`user_meta.hash`（三取样点 + 长度）

```
if size <= 20480:            sha1(整个文件)
else:                        sha1( bytes[0 : 2048]
                                    + bytes[size//2 : size//2 + 1024]
                                    + bytes[size-1024 : size]
                                    + str(size).encode() )     ← 长度字符串也要喂进去
```

**三个取样点 + 十进制长度字符串**，顺序不能变。这是**唯一一处"元数据哈希"**，
写成"全文件 sha1"不会报错，只会让服务端判为重传。

```bash
python scripts/multi_vendor_parse.py aliyun-hash --file <路径>     # 三个 hash 一起算
python scripts/multi_vendor_parse.py aliyun-hash --fixture 5000000 # 用合成文件跑（含边界 20480）
```

> 边界值 **20480** 是"小文件"判据的分水岭：`size == 20480` 走全文件分支，`size == 20481` 走三取样点分支。

### §6.3 团队版（Teambition）：**五步才拿到上传地址**

```
GET  /api/organizations/personal                    → _id(=orgId), _creatorId
GET  pan.teambition.com/pan/api/spaces?orgId=&memberId=   → spaceId, rootId
GET  pan.teambition.com/pan/api/orgs/<orgId>?orgId=  → data.driveId
GET  pan.teambition.com/pan/api/nodes/<rootId>?orgId=&driveId=&spaceId=  → ccpFileId
POST pan.teambition.com/pan/api/nodes/file          → uploadId, nodeId, ccpFileId, uploadUrl[]
PUT  <uploadUrl> ×N                                  （每片 10MB = 10485760）
POST pan.teambition.com/pan/api/nodes/complete
GET  pan.teambition.com/pan/api/nodes/<nodeId>?orgId=&driveId=&spaceId=  → url
```

⚠️ **两处易错的量纲**：本厂商分片是 **10MB（10485760）**，而阿里云盘主站是 **5MB**；
`spaceId` 取 `spaces` 响应的**第 0 个**（= 默认主目录）—— 要换目录得自己选下标。

## §7 排错

| # | 症状 | 原因 | 处置 |
| --- | --- | --- | --- |
| 1 | 百度 `error=-20` | 需要验证码 | 换路线 / 上完整登录态 |
| 2 | 百度 `errno:-6`（streaming） | 缺 cookie | 补 `PANWEB=1; bdshare_firstime=…` |
| 3 | 百度转存"明明有却重复转" | 用 MD5 判重（转存后 MD5 会变） | 改用 `server_filename` + `size` |
| 4 | 请求串参数名少一截（`tamp=`） | `&times;` 实体残留 | 搜 `×`，补回 `&tim` |
| 5 | 123 `DownloadURL` 直接请求失败 | 忘了 `base64_decode(params)` | 解 `params` 再请求 |
| 6 | 123 解出地址后响应里没有 `redirect_url` | 忘了补 `auto_redirect=0` | 按解码后串判是否已有，再补 |
| 7 | 夸克 `data` 为空 | 没先保存到自己网盘 / 选的是文件夹 | 先转存；排除文件夹 |
| 8 | 文叔叔秒传永远 `isCan:false` | `cm` 算成了 `sha1(bytes)` | `cm = sha1(md5 的 hex 字符串)` |
| 9 | 文叔叔下载走错分支 | 没按 URL 尾段长度判 `token`/`tid` | 16 位判 token、11 位判 tid |
| 10 | 阿里云盘 `create` 不返回 409 但也不秒传 | `user_meta.hash` 用了全文件 sha1 | 用三取样点 + 长度字符串 |
| 11 | 阿里云盘直链很快就 403 | `url_expire_sec` 到期（源文传 1800 秒） | 解析与下载同批；直链不落库 |
| 12 | 阿里云盘/文叔叔整链 401 | `authorization` / `x-token` 过期 | 重新抓包 / 重新匿名登录 |
| 13 | 团队版上传 400 | 分片用成了 5MB | 团队版是 **10MB** |
| 14 | 分享密码带中文首次报错 | 站点既有瑕疵 | 刷新一次 |

## §8 来源

| 结论 | 来源 |
| --- | --- |
| 百度 §2.1 五字段 + `sharedownload` + `error=-20` + 302 `Location` | `52pojie-443111` |
| 百度 `&times;` 实体坑 | `52pojie-443111`（`×tamp=`） |
| 百度 streaming + `errno:-6` + crossdomain | `52pojie-572431` |
| 百度 host 替换 `d.pcs` → `yqall02.baidupcs.com` | `52pojie-703837` |
| 百度 `createLinkShare` 原型替换 | `52pojie-789831` |
| 百度群分享四跳 + `logid` 算法 + md5 判文件夹 + 转存后 MD5 会变 | `52pojie-1208082` |
| 123 云盘三步 + `params` base64 + `auto_redirect=0` | `52pojie-1790540` |
| 夸克 `file/download` + `cloneNode` 去监听 | `52pojie-1678828` |
| 文叔叔全链 + 秒传三件套 + 16/11 位判据 | `52pojie-1075330` |
| 阿里云盘上传协议 + 三取样点 hash + 409 秒传 | `52pojie-1311697` |
| 30 秒试看是**播放器暂停**、直链本身完整（`video.pause=null`） | `52pojie-1735138` |

> 单源条目：`52pojie-443111` / `703837` / `789831` / `1075330` / `1311697` / `1678828` / `1735138` 均为**单篇来源**；
> §2.4 三条结论虽是单源，但**由读源码 + 实跑复算得出**（`scripts/multi_vendor_parse.py logid`），可独立复核。
