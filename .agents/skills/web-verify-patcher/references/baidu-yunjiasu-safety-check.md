# 百度云加速（Yunjiasu）「安全检查」挑战页

一句话：**首访拿到的不是业务页面，而是一张标题写着「安全检查! | 百度云加速」、带 `cf-ray` 响应头、
响应体里放着一个待提交表单的挑战页；补齐「响应头 2 项 + 响应体 2 项 + 验证码 2 项」后 POST 回该表单即可进站。**

本文件只描述**判据、可复算链路与参数固化口径**，用于授权范围内的抓取工程。
它属于「有图 / 有交互 / 需要人工成功样本」的 `waf-challenge` 子形态（**不是**无图准入 Cookie 链，
两者的分流见 `references/provider-execution-notes.md` §「WAF / Bot Management」）。

> ★ **本文件覆盖同一厂商的两件事**（不同年份、不同来源）：
> **① §1–§6**：百度云加速的**挑战页链路**（`52pojie-1186703`，2020）；
> **② §2.7**：同厂商注册链的**错误码分层与「延迟发送」变量**（`52pojie-1988994`，2024，**求助帖未解**）。

## 1. 判据：三件套同时成立才是本形态

| # | 判据 | 观测点 | 说明 |
| --- | --- | --- | --- |
| 1 | 页面标题含 `安全检查!` | `<title>安全检查! \| 百度云加速</title>` | 源文标题逐字为 `安全检查! \| 百度云加速` |
| 2 | 响应头里有 `cf-ray` | `response.headers['cf-ray']` | **沿用了 Cloudflare 的 `cf-*` 头族**（见 §4 厂商误判） |
| 3 | 响应体里有一个待提交表单 | `action="…"` + `value="…"` | 表单指向一个「提交验证码」的 POST 端点 |

三条**同时**成立才归本形态。只命中第 2 条（有 `cf-ray`）**不足以**判定厂商——大量非 Cloudflare 厂商也带这个头。

## 2. 完整可复算链路（源文全量 Python，逐步标注来源）

源文给的是**一整段可运行脚本**，下面按执行顺序拆成 6 步，每步标注它从哪来。
所有参数名、正则、URL 均**逐字照抄源文**，未做改写。

### 2.1 第 0 步：直接请求，确认拿到的是挑战页

```python
shareurl = 'https://************/**************************'
headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
}
response = httpx.get(url=shareurl, headers=headers)
print(response.text)
```

来源：源文开头「先直接获取」。打印结果里能看到 `安全检查! | 百度云加速` 才算命中。
（源文未贴 `import` 段；下文用到 `httpx` / `re` / `html`，需自行导入。）

### 2.2 第 1 步：从响应头取 `cookie` 与 `ray`

```python
cookie = response.headers['set-cookie'].split(';')[0]
ray = response.headers['cf-ray'].split('-')[0]
```

来源：源文「首先是响应头中的参数」。

- `cookie`：只取 `Set-Cookie` 的**第一段**（`split(';')[0]`，即 `k=v`，丢掉 `Path` / `Domain` / `HttpOnly` 等属性）。
- `ray`：`cf-ray` 形如 `<hex>-<colo>`，`split('-')[0]` 取前半段（源文写法）。
  ⇒ 这个值在 §2.6 里就是表单字段 `id`。

### 2.3 第 2 步：从响应体取 `posturl` 与 `r`

```python
posturl = '/'.join(shareurl.split('/')[:3]) + html.unescape(re.findall('(?<=action=").+?(?=")', response.text)[0])
r = re.findall('(?<=value=").+?(?=")', response.text)[0]
```

来源：源文「然后是响应体的参数」。

- `shareurl.split('/')[:3]` 得到 `['https:', '', '<host>']`，`'/'.join(...)` 还原成 `https://<host>`；
  再接上表单的 `action`（相对路径）拼出完整提交地址。
- `html.unescape(...)`：把 `action` 里的 HTML 实体（如 `&amp;`）还原成真实字符。
- `r`：抓响应体里**第一个** `value="…"`（隐藏字段）。
- ⚠️ 两处都用 `[0]` 取**第一个**命中，隐含假设「页面里第一个 `action="` / `value="` 就是目标字段」——
  这是**源文写法的脆弱点**（见 §6 登记）。

### 2.4 第 3 步：取 `session`（用于换验证码图）

```python
url = 'https://captcha.su.baidu.com/session_cb?pub=377e4907e1a3b419708dbd00df9e8f79'
headers = {
    'Host': 'captcha.su.baidu.com',
    'Referer': shareurl,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
}
response = httpx.get(url, headers=headers).text
session = response.split('"')[-2]
```

来源：源文「首先获取一个用于获取验证码图片的参数 session」。

- 端点固定为 `https://captcha.su.baidu.com/session_cb`，`pub` 是**写死值**（见 §3）。
- `session = response.split('"')[-2]`：响应是一段带引号的文本（JSONP 形态），
  按 `"` 切开后取**倒数第二段**即是 session 值。
- 请求头里 `Host` 与 `Referer` 都要给，`Referer` 为目标站首页。

### 2.5 第 4 步：下载验证码图并**人工输入**

```python
url = 'https://captcha.su.baidu.com/image?session=' + session + '&pub=377e4907e1a3b419708dbd00df9e8f79'
response = httpx.get(url, headers=headers).content
with open('验证码.jpg', 'wb') as f:
    f.write(response)
yanzhengma = input('请输入同目录下的验证码：')
```

来源：源文「此时通过 session 以及前面的 pub 可以获得验证码图片，保存到本地再手动输入」。

- 图片端点 = `captcha.su.baidu.com/image`，带 `session` + `pub` 两个 query。
- **这一步是人工**：源文用 `input()` 让操作者看图手输，**没有做自动识别**。
  ⇒ 与模型训练路线的分工见 §5。

### 2.6 第 5 步：构造表单提交

```python
headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'cookie': cookie,
    'referer': shareurl,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
}
data = {
    'r': r,
    'id': ray,
    'captcha_challenge_field': session,
    'manual_captcha_challenge_field': yanzhengma,
}
response = httpx.post(posturl, headers=headers, data=data)
print(response.text)
```

来源：源文「最后构造请求头和请求体，发出请求即可得到目标网页数据」。

表单四个字段的来源一一对应：

| 字段 | 值来源 | 步骤 |
| --- | --- | --- |
| `r` | 响应体第一个 `value="…"` | §2.3 |
| `id` | 响应头 `cf-ray` 的前半段 | §2.2 |
| `captcha_challenge_field` | `session_cb` 接口返回的 session | §2.4 |
| `manual_captcha_challenge_field` | 人工看图输入的验证码 | §2.5 |

成功后 `response.text` 就是目标网页数据（源文以截图佐证「获取正确」）。

### 2.7 ★★ 触发条件不总是「参数算错」：也可能是**流量/速率画像**

**来源** `52pojie-1988994`（2024-12，同厂商的注册验证码接口）。
> ⚠️ **保真纪律**：源文把域名与 Referer 都写成 **Base64 打码**（`aHR0cHM6Ly9wYXNzcG9ydC5iYWlkdS5jb20vdjIv`，源文自注 `//Base64`，
> 标题亦写「某度」）⇒ **本库不擅自解开脱敏**，需要域名时自行解码该串（本批首版曾直接写成明文，已按保真纪律改回）。

源文的现象与自问自答：

```text
用易语言……还是其它能尝试的，都是返回 130049（操作存在安全风险，请稍后再试）
换成 py / fd / postMan 之类的偶尔还能返回 50052（触发滑块验证），直接发送成功的则更少
……也往 tls 方向试了，发现没有 tls 指纹校验
```

**补充里给出了唯一被实证的变量**（源文原话）：

```text
py 触发目前测试出来一种方案，就是**把这些参数都先存起来，等一会再去发送**，
立马就是 50052，此时在易语言应该也是适用
```

> ★★ **判据（零成本、优先排除）：参数在浏览器里明明是对的，换到脚本里却稳定失败时，
> 先做一次「拿到参数后**立刻**发 vs **等一会**再发」的对照。**
> 两者结果不同 ⇒ **触发条件与参数无关，是「参数生成到发出之间的时间差」**，
> 属于速率/画像类风控。此时**继续调参数是白费**。
> 注意这几个错误码的**语义分层**（源文实测）：
> `130049` = 直接拒绝（安全风险）；`50052` = **降级为滑块**（比直接拒绝"更接近通过"，
> 说明画像分更高）；`0` = 通过。
> ⇒ **错误码本身是画像的读数**，可以用来判断「改动是变好还是变坏」，而不是只看成功/失败。

> ⚠️⚠️ **登记纪律（本条是「求助帖式任务」的典型，必须按未结论登记）**：
> 源文是**悬赏问答帖，提问者自己还没解决**，且明确说「8 成都是对的，但总觉得可能少哪了或哪错了」。
> ⇒ 本库**只登记上面那条被实证的变量**（时间差 ⇒ 速率触发），
> **不登记**帖子里的任何一组参数（`dv` / `tk` / `ds` / `s` / `k` / `sig` / `shaOne` / `rinfo` / `gid`）
> 为「必需参数」或「生成公式」——它们**全部未经证实**。
> 这与 `../../web-reverse-algorithm/references/16-ciphertext-structure-diagnostics.md` §5「没有结论时怎么登记」是同一纪律。
> ★ 源文另一个**方法论级**可迁移点：提问者的自陈「没有 tls 指纹校验」是**排除法产出的负结论**，
> 同样值得记（**它把「TLS 指纹」这个高成本怀疑项划掉了**）。

## 3. 参数固化判据：哪些能写死、哪些必须每次取

这是本样本**最可迁移的一条**——「多次抓包不变 ⇒ 写死」的判据与「哪几个必须每轮重取」的清单。

| 参数 | 是否固化 | 判据 / 来源 | 备注 |
| --- | --- | --- | --- |
| `pub` = `377e4907e1a3b419708dbd00df9e8f79` | **写死** | 源文原话「这里的 pub 参数多次抓包发现是不变的，所以就直接写死」 | ⚠️ 只对该站当时有效（见 §6） |
| `shareurl`（目标 URL） | 写死 | 业务目标 | — |
| UA / `content-type` | 写死 | 源文写死 | — |
| `cookie`（`Set-Cookie` 首段） | **每轮取** | 响应头 | 会话绑定 |
| `ray`（`cf-ray` 前半段） | **每轮取** | 响应头 | 每请求变 |
| `posturl` | 从响应体取 | `action="…"` | 形态上可固定，但源文从响应体取更稳 |
| `r` | **每轮取** | 响应体第一个 `value="…"` | 隐藏字段 |
| `session` | **每轮取** | `session_cb` 接口 | 每张图一换 |
| `manual_captcha_challenge_field` | **每轮取** | 人工输入 | 见 §5 |

**通用判据（可迁移到别的 WAF / 挑战页）**：
先对同一个目标**连续抓 2–3 次**，把每个参数分三类 ——
① **恒定值**（多次抓包逐字节相同）⇒ 可写死，但**必须标注"对该站当时有效"**；
② **响应头 / 响应体派生值**（`Set-Cookie`、`cf-ray`、隐藏字段）⇒ 每轮从上一跳的响应里取；
③ **接口下发的一次性值**（`session`、挑战票据、验证码）⇒ 每轮调对应接口重取，不可复用。
「看起来像常量」的（如 `pub`）**只有抓包验证过不变才敢写死**，不要凭形态猜。

## 4. 厂商误判提醒：`cf-ray` 不是 Cloudflare 专属

- 本样本是**百度云加速（Yunjiasu）**，但响应头里照样有 `cf-ray`（以及同族的 `cf-*` 头）。
- ⇒ **判据**：**看到 `cf-*` 头不要直接判 Cloudflare**。云加速这一支在早期与 Cloudflare 同源/兼容，
  沿用了这套头名。定厂要看**页面标题 / 品牌文案 / 挑战端点域名**（本例 `captcha.su.baidu.com` + 标题里的「百度云加速」），
  头名只是弱信号。
- 反过来的口径同样成立：Cloudflare 的 Turnstile 与 Cloudflare WAF challenge 要用
  `cf_clearance` / `/cdn-cgi/challenge-platform/` 这类**更强的形态判据**区分，
  不要只看 `cf-ray`（见 `references/provider-execution-notes.md` §「Cloudflare Turnstile」与 §「Cloudflare：5s 盾五步链」）。

## 5. 与其它文件的分工

- **验证码识别线**：本例源文是**人工 `input()`**，没有训练模型。若要把这一步自动化，
  按 `references/captcha-model-training.md` 走（标注 → 训练 → 自举闭环）；
  **不要**把「人工输入」当成已解决的问题登记。本文件只负责「把图取下来、把字段拼回去」，
  识别本身是另一条线。
- **本形态 vs 无图准入 Cookie 链**：本例**有图、有交互、需要人工成功样本** ⇒ 留在本技能（`waf-challenge` 的
  有图分支）。无图、只需算出 clearance cookie 的形态改读
  `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md`（判层与链路）与
  `../../web-reverse-algorithm/references/10-waf-clearance-cookie.md`（可离线求解）。
- **同族厂商注意点**：`references/provider-execution-notes.md` 的「WAF / Bot Management」节列了各家的设卡层，
  动手前先读，避免把「算 cookie」当成「识图」。

## 6. 登记（未复核 / 单样本 / 源文缺陷）

| # | 条目 | 类型 | 说明 |
| --- | --- | --- | --- |
| 1 | 全链路未在本仓复跑 | **未复核** | 源文 2020-05 的样本，站点与端点是否仍存在未知 |
| 2 | `pub=377e4907e1a3b419708dbd00df9e8f79` | **单样本 / 时效** | 源文自陈「多次抓包不变」，但**只对该站当时有效**；换站必须重新抓包验证 |
| 3 | `cf-ray` 作为厂商判据 | **源文缺陷（弱判据）** | 头名会误导定厂（§4）；源文也没强调「这不是 Cloudflare」 |
| 4 | `action="…"` / `value="…"` 取 `[0]` | **源文缺陷（脆弱）** | 页面若有多个 `value="`（如其它隐藏 input），`[0]` 可能抓错字段；应带上下文定位 |
| 5 | `session = response.split('"')[-2]` | **源文缺陷（脆弱）** | 依赖「倒数第二段引号内就是 session」这一格式假设，格式一变即失效 |
| 6 | 验证码为**人工输入** | **源文未展开** | 源文用 `input()`，未给自动识别方案；自动化需另接 `captcha-model-training.md` |
| 7 | 源文未贴 `import` | **源文缺陷** | `httpx` / `re` / `html` 需自行导入 |
| 8 | 源文 URL 被屏蔽 | **单样本** | `shareurl` 与 `posturl` 域名打码，无法回源核对该站现状 |
| 9 | 同一账号下 `130049` / `50052` 的分层语义 | **单源** | 来自求助帖 `52pojie-1988994`（作者**未解决**）⇒ 只登记「错误码是画像读数」「参数延迟发送会改变错误码」两条，**不登记任何参数** |
| 10 | 「没有 TLS 指纹校验」 | **作者排除法结论** | 属负结论，仅作「划掉高成本怀疑项」用；**不保证长期成立** |

## 7. 来源表

| 主题 | 文章裸 id | 年份 | 关键面量 |
| --- | --- | --- | --- |
| 百度云加速「安全检查」挑战页的完整复算链路 | 52pojie-1186703 | 2020 | `安全检查! \| 百度云加速`、`cf-ray`、`captcha.su.baidu.com/session_cb`、`pub=377e4907e1a3b419708dbd00df9e8f79`、`captcha_challenge_field`、`manual_captcha_challenge_field` |
| 同一厂商注册链的**错误码分层**与「延迟发送」变量 | 52pojie-1988994 | 2024 | `130049`（直接拒）/ `50052`（降级滑块）/ `0`（通过）；接口域源文以 Base64 打码（`aHR0cHM6Ly9wYXNzcG9ydC5iYWlkdS5jb20vdjIv`） |
