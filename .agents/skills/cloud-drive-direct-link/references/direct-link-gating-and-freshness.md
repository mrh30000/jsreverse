# 门禁、时效与 302：拿到"能直接下"的那个 URL

**唯一权威源。** 本文回答一件事：**参数都对、`zt=1` 了，为什么还是 400/403/过期。**

## §1 三条硬门禁（缺一条就 400）

| # | 门禁 | 值 | 缺了会怎样 |
| --- | --- | --- | --- |
| 1 | `Referer` | **上一跳的地址**（无码链 = 第二跳 `iframe` 的完整 URL；有码链 = 分享页 URL） | 400 / 403 |
| 2 | `Cookie: down_ip=1` | 字面量 | 400（下载域要求） |
| 3 | URL 里的 `/file/` 段 | `dom + "/file/" + url` | 请求到一个不存在的路径 |

**第 3 条最容易被忽略**：`{"dom":"…","url":"?VTN…"}` 直接拼起来是 `https://down-load.lanrar.com?VTN…`，
`.com` 后面直接跟 `?` 不是合法 URL 结构 —— **必须补 `/file/`**。

**第 1 条是最高频失败点**。多篇来源独立记录过同一件事：

> "这个挺关键的，我们把它加到 post 的协议头中" / "有次没带所以就没获取到数据" / "几次验证都过不去，后来发现是倒在这里"。

**`Referer` 不是可有可无的"礼貌头"**，它参与服务端的"你是不是从正确的那一跳来的"判定。
**每一跳的 Referer 都不一样**：请求 `ajaxm.php` 时是第二跳地址，请求下载域时是第二跳地址（不是分享页）。

门禁自查：

```bash
python scripts/lanzou_parse.py gating --referer '<上一跳>' --full '<dom>/file/<url>'
```

## §2 参数语义与 302 读法

### §2.1 最终直链上的参数（G2018 实测样本）

```
http://development01.baidupan.com/2018032014bb/2018/03/17/98ce5e4dc270150784d4f5cf1af4a920.zip
  ?st=bYKY5VG3dkyPOnKSO0_OjQ
  &q=%E6%B5%81%E5%85%89%E5%8A%A9%E6%89%8B5.1.0.zip
  &e=1521527859
  &ip=<你的IP地址>
  &fi=2843560
  &up=
```

| 参数 | 语义 | 对解析的影响 |
| --- | --- | --- |
| `st` | 一次性令牌 | **不可猜、不可复用** |
| `q` | 文件名（URL 编码） | 只影响 `Content-Disposition` |
| `e` | 过期时间戳（秒） | **时效的直接来源** |
| `ip` | **出口 IP** | 换网络要重新解析（原文样本里就是这个字面形态） |
| `fi` | 文件 ID | 与 `file_id` / `file=<id>` 一致 |
| `up` | 上传者相关（多为空） | 忽略 |

> `ip` 参数是"直链有时效且可能绑出口"的直接证据。**不要把直链交给另一个出口去下**。

### §2.2 302 的读法

正确姿势（`allow_redirects=False`，只看头）：

```python
resp = requests.get(full_url, headers={... 'Referer': hop2, 'Cookie': 'down_ip=1'}, allow_redirects=False)
final = resp.headers['Location']
```

两条经验：

1. **`dom/file/url` 本身通常也能直接下**（浏览器里点下载就是这么走的），
   但走一次 302 拿到 `Location` 更稳、也更适合"只要 URL 不要文件"的场景；
2. `Location` 可能**再跳一次**（CDN → 真实存储）。要"绝对终态 URL"就循环跟随到 200/206 为止，
   但注意**每次跳都要保留 Referer 语义**，别把第一跳的 Referer 一路带到底。

## §3 时效分级与"直链不落库"的设计

### §3.1 时效分级

| 级别 | 表现 | 判据 |
| --- | --- | --- |
| **分钟级** | 抓包后隔几分钟再下就失败（原文标题即"手慢无"） | `e` 与当前时间差很小 |
| **出口绑定** | 换 IP / 换网络后同一个 URL 403 | URL 里有 `ip=<出口IP>` |
| **会话级** | T/K 三分钟失效，跨会话复用必空 | 文件夹分页场景 |

### §3.2 因此，落库只落"可长期保存的输入"

| 该存 | 不该存 |
| --- | --- |
| 分享链接（含提取码） | 最终直链 |
| 代际与取证年份 | `sign` / `skdklds`（一次性） |
| 解析器版本 | T/K |

**判据**：这个值**明天还能用吗**？能 ⇒ 输入；不能 ⇒ 产物。

### §3.3 批量场景的执行形状

```
for share in shares:                     # 输入：可长期保存
    hop2   = fetch(iframe_or_inline(share))
    post   = build_ajaxm(hop2, pwd)      # 现算
    full   = assemble(dom, url)
    final  = location_302(full, referer=hop2)   # 立刻
    download(final)                      # 同一个批次里下完
```

三个"不要"：不要先解析全量再统一下载；不要把解析与下载拆成两个任务；不要在下载前插入人工确认。

## §4 域名族与"从输入解析域名"

蓝奏云使用**大量同构域名**（`wwa` / `wwt` / `wwanu` / `lanzoue` / `lanzouf` / `lanzoui` / `lanzouu` / `lanzoux` / `lanzouj` …），
且**分享链接与接口同域**。下载域又是另一族（`lanrar.com` / `baidupan.com` 系）。

**唯一正确写法**：域名从输入 URL 解析出来。

```python
def re_domain(url):
    m = re.search(r"https?://([^/]+)", url)
    return m.group(1) if m else None
```

三条纪律：

1. 第二跳的 `iframe src` / `url : '/ajaxm.php…'` 都是**相对路径** ⇒ 拼回"输入 URL 的域名"；
2. 请求 `ajaxm.php` 用同一个域名（别跨域）；
3. **下载域（`dom`）必须用响应里给的那个**，不要替换成分享域。

## §5 排错 12 条

| # | 症状 | 原因 | 处置 |
| --- | --- | --- | --- |
| 1 | 400 | 缺 `Referer` | 带上"上一跳"地址 |
| 2 | 400 | 缺 `Cookie: down_ip=1` | 补 cookie |
| 3 | 404 / 异常页 | 漏了 `/file/` 段 | 用 `dom + "/file/" + url` |
| 4 | 403 且刚还能下 | 时效 / 出口绑定 | 重新解析；同一出口下载 |
| 5 | `zt != 1` | 代际字段混用 | 按当前页面出现的那组字段重拼 |
| 6 | `sign` 是对象不是字符串 | 忘了 `.group(1)` | 先 `group(1)` 再拼 |
| 7 | 有码页走无码链 | 代际判错 | 用 `<title>文件</title>` / `down_p()` 先判 |
| 8 | 翻页只拿到第一页 | T/K 跨会话复用 | 同会话内"取 T/K → 立刻翻页" |
| 9 | 换分享链接全挂 | 域名写死 | 域名从输入解析 |
| 10 | 拿到的 `dom` 里带 `\/` | JSON 转义 | `json.loads` 后自然还原（或 `replace('\\','')`） |
| 11 | 页面出现 Cloudflare 挑战 | G2025 反爬 | 转 `web-js-env-patcher`，不要自己写挑战求解 |
| 12 | 下回来是 HTML | 打到错误页 | 校验 `Content-Type` / `Content-Disposition`，再检查 `Location` 是否二次跳转 |

## §6 来源

| 结论 | 来源 | 关键面量 |
| --- | --- | --- |
| Referer 必带 | `52pojie-1901884` / `52pojie-1865269` / `52pojie-988145` | "别忘记在协议头中加入 Referer" |
| `down_ip=1` | `52pojie-1901884` / `52pojie-1668489` | `down_ip=1; expires=Sat, 16-Nov-2019 …` |
| `/file/` 段 | `52pojie-1865269` / `52pojie-713762` | ".com 后面不能直接跟 ? 号…后面要加 /file/" |
| `st/e/ip/fi/up/q` | `52pojie-713762` | `…&e=1521527859&ip=<你的IP地址>&fi=2843560&up=` |
| 时效"手慢无" | `52pojie-1865269` | "直链失效时间很短…可能是你太慢了" |
| 域名族 | `52pojie-1901884` / `52pojie-1668489` / `52pojie-2078178` | `wwt.lanzouu.com`、`www.lanzouf.com`、`wwanu.lanzoue.com` |
| 302 `Location` | `52pojie-1901884` / `52pojie-713762` | `response.headers['Location']` |
