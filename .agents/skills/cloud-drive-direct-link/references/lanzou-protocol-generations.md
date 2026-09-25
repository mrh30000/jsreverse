# 蓝奏云系：代际协议矩阵（2017 → 2025）

**唯一权威源。** 本文回答一件事：**这一份分享链接属于哪一代，该取哪几个字段，按什么顺序取。**

蓝奏云（`lanzou*` 域名族）平均一到两年换一次代际，字段名与接口形状**整体重写**。
"按记忆拼字段"是这一族最高频的失败原因 —— 所以**先判代际，再动手**。

## §1 代际判据表（30 秒定位）

只读分享页与第二跳 HTML 的这三处：① 有没有 `iframe`；② 有没有 `down_p()`；③ 内联脚本里出现哪一组字段名。

| 代际 | 取证年份 | 分享页特征 | 第二跳特征 | POST 字段组 |
| --- | --- | --- | --- | --- |
| **G2017** | 2017-08 | 用**手机 UA** 打开分享页，源码里**直接内联**出直链参数（源文口径：手机访问端源码"毫无保留的把下载链接的参数给贡献出来了"，按页面里 `submit.href` 那串式子拼接即得下载链接）；手机端页面地址形如 `蓝奏云官网网址+ "tp/" + 文件ID` | —（**无第二跳**，参数就在手机页里） | —（无 `ajaxm.php`；按页面里 `submit.href` 拼接） |
| **G2018** | 2018-03 | 下载按钮是一个 `iframe`，`src="/fn?f=…&t=…&k=…"` | 内联脚本里是**随机变量名**（`iay7or` / `igwjqk` / `imuvsd`）+ `action=down_process` | `action=down_process&file_id=&t=&k=` |
| **G2019** | 2019-07 | 同上（`iframe`） | 同上 | 同上，但 **POST 必须带 Cookie + UA + Referer**（原文明确"几次验证都过不去，后来发现是倒在这里"）；且出现验证码 |
| **G2022** | 2022-07 | 无码：`<iframe … src="/…">`；有码：**一步到位**（页面里直接有 `down_p()`） | 无码跳：`sign = '…'`；有码页：`var skdklds = '…'` | 无码 `action=downprocess&signs=?ctdf&sign=`；有码 `action=downprocess&sign=&p=<提取码>` |
| **G2024** | 2024-03 | `<iframe class="ifr2" name="…" src="…" frameborder="0" scrolling="no">` | 内联脚本里是 `'sign':'…'` 与 `url : '/ajaxm.php?file=…'` | `action=downprocess&signs=?ctdf&sign=&websign=&websignkey=bL27&ves=1` |
| **G2025** | 2025-12 | 分享页前置 **Cloudflare JS 挑战**（`acw_sc__v2` / `_0x4818` / `arg1` / `posList`） | 挑战通过后与 G2024 同形 | 同 G2024；**反爬部分不在本技能**，转 `web-js-env-patcher` |

> ⚠️ 表中"取证年份"= 该来源文章的发布时间，不是站点改版时间。站点改版总早于文章发布。
> 复用时**先按当前页面重新判据**，再回来看这一行。

**代际判据的四句话**（背下来就够用）：

1. 有 `iframe` ⇒ 走"两跳"；有 `down_p()` ⇒ 走"一跳"（有码）。
2. 字段里出现 `websignkey` ⇒ G2024+，五个字段**一个都不能少**。
3. 字段名是**随机字符串**（`iay7or` 这种）⇒ G2018/G2019 老链，按变量名逐项取。
4. **PC 页里搜不到参数 ⇒ 换手机 UA 再取一遍**：同一链接的手机页是**另一套（更简陋、参数直接内联）**的页面，
   2017 那代就是靠这个暴露的（`52pojie-635800`）。

### §1.1 移动端 UA 分流（本族最早、也最通用的一条定位技巧）

**一句话**：同一分享链接，**换手机 UA 会拿到另一套页面** —— 手机页更简陋，而且**直链参数直接内联在源码里**。

| 项 | 内容 |
| --- | --- |
| ① 可操作动作 | 浏览器 F12 → 设备模拟 / UA 切换 → 设成手机 UA → 重载分享页（源文就是"用一个支持模拟 User Agent 的浏览器"）；脚本侧则**直接带 `User-Agent: <手机 UA>` 请求**分享页 |
| ② 判据（正反两条） | 反面：PC 页里**找不到**直链参数（PC 页会自动跳转，源码里看不到）；正面：**换成手机 UA 后参数直接内联**——2017 那代直接给出 `submit.href`，按它拼接即得下载链接；且手机端页面地址本身形如 `蓝奏云官网网址+ "tp/" + 文件ID` |
| ③ 工程结论 | 请求手机下载页**必须模拟手机 UA**（`52pojie-636373` 原文加粗强调「必须模拟手机 UA !!!」）；用 `curl_post` 请求手机页时漏了 UA 就拿不到那套页面 |
| ④ 边界 | 这是 **2017 年**的形态；站点已演化到 **G2024 / G2025**，**今天不要再指望"手机页直接给参数"**。本小节只把「**换 UA 拿另一套页面**」当**通用定位手法**保留：任何一代遇到"PC 页找不到参数"，第一反应都可以是换 UA 再取一遍 |

> 该手法与代际**正交**：G2018–G2025 的字段名照旧看 §2 / §3；UA 分流只解决"参数在哪一版页面里"。

## §2 G2018 / G2019：六字段老链

**分享页**（`iframe src`）：

```html
src="/fn?f=2843560&t=1521525682&k=702303f99ddec1ee347e83d3e6954ff1"
```

**第二跳**返回的内联脚本（注意变量名是随机的，**不能写死**）：

```js
var a = 'down_process';
var iay7or = '2843560';                 // file_id
var igwjqk = '1521525328';              // t
var imuvsd = 'ada9b5c064ee3f1baf176ae849194dd1';   // k
$.ajax({ type:'post', url:'/ajaxm.php',
  data : 'action=down_process&file_id='+ iay7or +'&t='+ igwjqk +'&k='+ imuvsd,
  dataType:'json', success:function(msg){ … } });
```

**请求**：`POST /ajaxm.php`，`data = action=down_process&file_id=<file_id>&t=<t>&k=<k>`。

**响应**：

```json
{"zt":1,"dom":"vip.d0.baidupan.com","url":"?VTNaZFloVGUJAFFpUWRVOQA\\/UGhS…","inf":null}
```

**组装**：`http://<dom>/file/<url>` → 请求该地址 → 读 **302 `Location`**：

```
Location: http://development01.baidupan.com/2018032014bb/2018/03/17/98ce5e4dc270150784d4f5cf1af4a920.zip?st=bYKY5VG3dkyPOnKSO0_OjQ&q=<URL编码的文件名>&e=1521527859&ip=<出口IP>&fi=2843560&up=
```

> **G2019 的增量只有一条：POST 要带 Cookie / UA / Referer**，且站方开始上验证码（原文作者说"这个验证码还是比较烦人的"）。
> 老链的 `t` / `k` 是**签名对**：`t` 是时间戳，`k` 是它的摘要；两者与 `file_id` 绑定，**改一个就 `zt != 1`**。

## §3 G2022 / G2024：`signs` 双链（无码）与 `down_p()` 单链（有码）

### §3.1 先判有没有提取码（三条独立判据，任一命中即"有码"）

| # | 判据 | 说明 |
| --- | --- | --- |
| 1 | 页面里含 `<title>文件</title>` | 无码时标题是 `<title><文件名> - 蓝奏云</title>` |
| 2 | 页面里含大量 `<style>` | 有码页带内联样式，无码页没有 |
| 3 | 页面里含 `function down_p(){` | 有码页的下载入口函数；无码页没有 |

### §3.2 无码链（两跳）

1. 分享页取 `iframe` 的 `src`（G2024 的正则见下），**拼回输入 URL 的域名**后请求；
2. 第二跳 HTML 里取两个值：

```js
// 老一点（G2022）
sign = 'VTMHOVloBjcEDVRrCzsAPFQ_aBTZSPgMwBzFXYwVsW29SYVUkAClSOwViVjdUMQEwVzsFMwRtADQCMVBk'
url  : '/ajaxm.php?file=163112553'

// G2024 的写法（同一个意思）
'sign':'VTMHOVloBjcE…'
url : '/ajaxm.php?file=163112553'
```

3. POST `/ajaxm.php`（`Referer` = **第二跳那个地址**）：

```
action=downprocess
signs=?ctdf
sign=<sign>
websign=
websignkey=bL27
ves=1
```

> G2022 来源只带了 `action` / `signs` / `sign` 三个字段也成功；G2024 来源带全五个。
> **取"当前页面出现的那一组"**，不要两边混。

G2024 的 `iframe` 抽取正则（原文口径，注意索引是 `matches[1]`）：

```python
re.compile(r'<iframe\s+class="ifr2"\s+name="\d+"\s+src="([^"]+)"\s+frameborder="0"\s+scrolling="no"></iframe>')
```

### §3.3 有码链（一跳）

有码分享页**不再套娃**：页面里直接给出 `skdklds` 与 `ajaxm.php` 的相对地址：

```js
function down_p(){ …
  url : '/ajaxm.php?file=163112553'
  var skdklds = '<签名字符串>';
… }
```

抽取：

```python
re.compile(r"url\s*:\s*'(/ajaxm\.php\?file=\d+)'")
re.compile(r"var\s+skdklds\s*=\s*'([^']*)';")
```

POST（`Referer` = **分享页地址本身**）：

```
action=downprocess
sign=<skdklds>
p=<提取码>
```

> 提取码传 `str` 或 `int` 都可以（表单编码时都会变字符串）。
> 原文提到的第三种判据是"后面的很多函数只有有密码的才有" —— 判据 1/2/3 任一命中即可，**别只依赖一条**。

## §4 文件夹分享：`filemoreajax.php`

分享的是**文件夹**时，页面加载后走分页接口列目录。

**七字段**（`pwd` 为提取码；无码分享可留空，但多数文件夹分享都带码）：

| 字段 | 含义 | 来源 |
| --- | --- | --- |
| `lx` | 固定 `2` | 抓包 |
| `fid` | 文件（夹）分享 ID | 页面内联配置 |
| `uid` | 用户 ID | 页面内联配置 |
| `pg` | 页码（一页 50 条） | 自己递增 |
| `rep` | 固定 `0` | 抓包 |
| `t` | **动态**（时间戳） | 页面内联配置 |
| `k` | **动态**（与 `t` 配对的摘要） | 页面内联配置 |
| `up` / `ls` | 固定 `1` | 抓包 |
| `pwd` | 提取码 | 分享者 |

⚠️ **`t` / `k` 是"变量名 → 值"两跳**，这是本接口最容易踩的地方：页面里先出现**变量名**，再出现该变量的**赋值**。

```php
preg_match("/t':(.*),/U", $content, $qt);        // 先取到变量名，例如 'TZkK3'
preg_match("/k':(.*),/U", $content, $qk);
preg_match("/$qt[1] = '(.*)\'/U", $content, $t); // 再取该变量的值
preg_match("/$qk[1] = '(.*)\'/U", $content, $k);
```

**T/K 的两条硬性质**（都有来源）：

1. **`T` 是时间戳，`K` 与它配对**；
2. **网页缓存约 3 分钟** —— 3 分钟后 T/K 失效。所以：
   - **翻页必须与"取 T/K"在同一个会话里连续完成**（原文明写：直接请求 `pg=2` 会重新生成 T/K 且没有访问第一页，于是取不到数据）；
   - 生产环境用**定时任务每 2 分钟刷新一次 T/K**（原文口径）或干脆每次现取。

> **2022-10 实测一例**（来源文章的抓包表原样）：`lx=2` `fid=2455975` `uid=569689` `pg=1` `rep=0` `t=1666146943` `k=5e30653d4f54227c4856e473e49c3d5b` `up=1` `ls=1` `pwd=fp0b`。
> 其中 `t` 是时间戳、`k` 与它配对 —— 这两项是**每次访问都会更新**的，其余固定。

**列表响应**里每个文件取五个字段：`id` / `name_all` / `size` / `icon` / `ico`
（`name_all` 是 Unicode 转义，要解码；`icon` 是文件类型）。拿到 `id` 后回到 §3 取单个文件的直链。

### §4.1 ★★ 文件夹批量的**速率硬约束**：把「所有人」ban 掉

**来源** `52pojie-2005690`（2025-02，Python 实现文件夹内文件列表 + 直链）。原话：

> 「`GetAllFileListByUrl()` 时，每获取一页会延时 1 秒（可自行修改，**小于 1 秒我没试过**），
> 因为**文件夹访问过频繁，蓝奏云会 ban 掉所有访问，导致所有人都无法访问该文件夹**。」

> ★★★ **这是本族唯一一条「后果外溢」的门禁** —— 与「直链 3 分钟过期」不同，
> 触发频率限制的代价是**把分享者和其他人一起打挂**。⇒ **批量场景必须限速，且要可配置。**
> ★★ 但**列表接口与直链接口的限速不是同一套**：源文明确「`GetFileListByData()` 没有做此 API 速率限制，
> 使用时一定要小心」⇒ **不要以为给分页加了 `sleep` 就安全了。**

### §4.2 ★★ 2025 版文件夹接口的三个函数边界

源文（`52pojie-2005690`）把接口收成了三个函数，**这个签名本身就是接口契约**：

| 函数 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `GetFileListByUrl(url, pwd, pg=1)` | 文件夹分享链接 / 提取码 / **页码从 1 开始** | 列表（**空列表 = 没有更多**）；失败返回 `None` | 分页顺序**与网页一致（按时间由新到旧）** |
| `GetAllFileListByUrl(url, pwd)` | 同上（内部翻页） | 同上的合并列表 | ★ 内部**每页延时 1 秒** |
| `Get_final_link(_id)` | 上两者返回的字典里键为 `"id"` 的值 | 直链；失败 `None` | ★ **不能用于单文件分享** |

**四条边界（全部来自源文自陈，别当成 bug）**：

1. ★ **嵌套文件夹不支持** —— 只能取到文件夹内的**文件**，文件夹里的文件夹无能为力；
2. ★ **无密码（无提取码）的文件夹不支持**（源文注：「网上有第三方提供的 API 可以解决此情况」）；
3. ★★ **HTTP 401 = 文件夹已经暂时不可访问 ⇒ 抛异常**（不是「解析失败」，是「被临时封了」）；
4. ★★ **接口会变，必须跟改** —— 源文自己两次维护：`2025.2.27` 修「无法获取第 2 页以上」、
   `2025.4.10` 修「因蓝奏云 api 变更带来的问题」。

> ★ **与 §4 的关系**：§4 是「字段怎么拼、T/K 怎么取」的**协议层**；
> 本节是「调用节奏与失败语义」的**工程层**。两者必须一起满足，否则会得到
> 「代码没错、但第 2 页开始全空 / 隔天整个文件夹 401」。

### §4.3 手工链路（无脚本入口时的最小复现）

**来源** `52pojie-1619961`（2022-04）。若目标只是**单个文件**且不想写解析器，可走这条纯手工链：

```text
① 下载按钮在 <iframe> 里 ⇒ 取 iframe 的 src，与原站 host 拼成新 URL
② 打开新 URL ⇒ 页面异步 POST /ajaxm.php（form 表单）⇒ 返回 JSON
③ 响应里的 dom 与 url 字段拼起来 ⇒ 得到「下载地址」
④ 访问该地址 ⇒ HTTP 302 ⇒ ★★ 响应头里的 Location 就是真实直链
```

> ★★ **判据**：`302` + `Location` ⇒ **真实直链**（本族通用收尾动作，与 §3 一致）。
> ★ 陷阱（源文原话）：新 URL 页面上会显示「**地址超时，请刷新**」——
> **这不是失败，是需要你「手快」**（刷新后立刻抓 `ajaxm.php`）。

## §5 优享版（`ilanzou`）：`encryptHex` 链接拼装

优享版（`www.ilanzou.com/s/…`）不走 `ajaxm.php`，而是**把参数加密后拼进 URL，服务端 302 到直链**：

```js
function V(e, t, n) {
  let f = void 0 == H.Z.state.admin.account.info.userId ? "" : H.Z.state.admin.account.info.userId;
  let o = v.Z.encryptHex(e + "|" + f);          // downloadId = encryptHex(fileId|userId)
  let u = C();                                   // devType
  let r = !0 === t && void 0 == n ? "&enable=0" : "&enable=1";
  let A = (new Date).getTime();
  let a = v.Z.encryptHex(e + "|" + A);           // auth = encryptHex(fileId|timestamp)
  let i = D.Z.apiBaseURL + b.sT + "?downloadId=" + o + r +
          "&devType=" + u +
          "&uuid=" + localStorage.getItem("uuid") +
          "×tamp=" + v.Z.encryptHex(A) +           // ⚠️ 原文如此：timestamp 也再加密一次
          "&auth=" + a;
  window.open(i, "_self");                       // 302 回来就是直链
}
```

**三个可复用的结构结论**：

1. `encryptHex` 的作用域是 webpack 模块（原文：`v` 是 `n(6686)`）⇒ 按 webpack 抠模块的方式取，不要正则硬抠；
2. **同一个明文拼法出现三次**（`fileId|userId`、`fileId|ts`、`ts`）⇒ 还原时先把"拼接模板"和"加密函数"分开确认；
3. `enable=0/1`、`devType`、`uuid` 都是**客户端状态**（`localStorage` 里的 `uuid` 要复用同一份）。

> 本技能只记"链接怎么拼、字段从哪来"；`encryptHex` 自身的算法还原走 `web-algorithm` 族
> （判型：把同一份明文用两次不同时间戳加密，看输出是否只与明文相关）。

## §6 来源表（可复核）

| 代际 / 主题 | 来源文章 | 取证年份 | 关键字面量 |
| --- | --- | --- | --- |
| G2017 手机页直出参数 | `52pojie-635800` | 2017-08 | `submit.href`、"网站的手机访问端的源代码竟然毫无保留的把下载链接的参数给贡献出来了"、`蓝奏云官网网址+ "tp/" + 文件ID` |
| G2017 PHP 实现（必须模拟手机 UA） | `52pojie-636373` | 2017-08 | "必须模拟手机 UA !!!"、`curl_post`、"获取手机下载页面源码" |
| G2018 六字段 + 302 | `52pojie-713762` | 2018-03 | `/fn?f=2843560&t=…&k=…`、`down_process`、`vip.d0.baidupan.com`、`development01.baidupan.com` |
| G2019 加 Cookie/验证码 | `52pojie-988145` | 2019-07 | "POST 加入了 Cookie，协议头，特别是 UA 和 Referer" |
| G2022 有码/无码双链 + PHP 实现 | `52pojie-1668489` | 2022-07 | `www.lanzouf.com`、`function down_p(){`、`signs`、`?ctdf`、`down_ip=1`、`developer.store.pujirc.com` |
| 文件夹 `filemoreajax.php` | `52pojie-1701084` | 2022-10 | `lx=2`、`fid`、`uid`、`pg`、`rep=0`、`up=1`、`ls=1`、一页 50 条 |
| T/K 三分钟缓存 | `52pojie-1703600` | 2022-10 | "蓝奏的网页缓存时间是 3 分钟，三分钟后就会失效"、宝塔定时任务 |
| 抓包三会话 + "手慢无" | `52pojie-1865269` | 2023-12 | `lanzouj.com`、`fn?`、`ajaxm.php`、"直链失效时间很短" |
| G2024 无码链 | `52pojie-1901884` | 2024-03 | `ifr2`、`websignkey=bL27`、`ves`、`down_ip=1`、400 |
| G2024 有码链 | `52pojie-1904710` | 2024-03 | `skdklds`、`p=<提取码>`、`<title>文件</title>` |
| 优享版 `encryptHex` | `52pojie-1908049` | 2024-03 | `downloadId`、`devType`、`×tamp`、`auth`、`n(6686)` |
| G2025 Cloudflare | `52pojie-2078178` | 2025-12 | `acw_sc__v2`、`_0x4818`、`arg1`、`posList` |
| 单文件手工链（iframe + `ajaxm.php` + 302） | `52pojie-1619961` | 2022-04 | "下载按钮其实是来自于 iframe"、`ajaxm.php`、"location 的值就是真实下载地址"、"地址超时，请刷新" |
| 文件夹批量（限速 / 401 / 接口漂移） | `52pojie-2005690` | 2025-02（2025-04 修订） | `GetFileListByUrl`、`GetAllFileListByUrl`、`Get_final_link`、"会 ban 掉所有访问，导致所有人都无法访问该文件夹"、401、"2025.2.27 修复第 2 页"、"2025.4.10 修复 api 变更" |

> 本表是**保真度锚点**：脚本里的每条断言都应能指回这里的某一行。
> 站点随时会改代际 —— **引用本表时必须连同"取证年份"一起引用**。
