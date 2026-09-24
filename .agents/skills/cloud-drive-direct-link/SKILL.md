---
name: cloud-drive-direct-link
description: 网盘 / 文件托管站的「分享链接 → 可用直链」解析技能。覆盖蓝奏云系（lanzou / lanzoui / lanzoue / lanzouf / lanzoux / lanzouj / ww*.lanzou*.com）、优享版 ilanzou、城通 / 奶牛 / 123 云盘 / 百度盘 / 阿里云盘，以及网盘直链下载助手与解析站。涉及：分享页套娃 iframe（`ifr2`）、`/ajaxm.php`、`action=downprocess`、`signs=?ctdf`、`websignkey=bL27`、`ves`、`sign` / `skdklds` / `down_p()` 的代际字段差异、`dom + "/file/" + url` 拼接、`Referer` 与 `down_ip=1` 门禁、`st` / `e` / `ip` / `fi` / `up` 时效参数、302 `Location` 取最终直链、T/K 与 `filemoreajax.php` 文件夹分页、网页三分钟缓存、提取码与分享密码、优享版 `encryptHex` / `downloadId` / `auth` / `timestamp`、阿里云盘 `x-device-id` / `x-signature`（ECDSA secp256k1 + `01` 后缀）/ `get_public_key` / nonce、油猴助手本地校验（改 `if(true)`）、Cloudflare `acw_sc__v2` 反爬。用户说「蓝奏云直链」「网盘直链解析」「取真实下载地址」「分享链接转直链」「直链 400 / 失效」「解析站」「downprocess」时用本技能。
---

# 网盘 / 文件托管站直链解析：分享链接 → 可用直链

一句话：**这一族的终点是一个"能直接下"的 URL**，而它从不在分享页里现成给出。

三条硬约束，任何一条不满足，产出就不可交付：

1. **直链有时效。** 解析与下载必须放在**同一个批次**里跑完（实测"手慢无"：抓包与请求之间隔几分钟就失效）。
   不要先把直链存库、稍后再下 —— 应存的是**分享链接 + 提取码 + 解析步骤**，直链每次现算。
2. **每一步都要带上一步产出的门禁。** `Referer`（指向上一跳）与 `Cookie: down_ip=1`（下载域）少一个就是 400/403；
   最终地址还必须补 `/file/` 段。**"参数都对但取不到"几乎全是门禁问题，不是算法问题。**
3. **只解析分享者公开分享的链接，提取码由分享者提供。** 不做口令爆破、不做目录越权遍历（见反例）。

这一族的时间浪费在三件事上：

① **把分享页当直链页** —— 真参数在**第二跳**（iframe / 内联脚本 / `down_p()`）里，第一页只有文件名和尺寸；
② **拼出 `dom + url` 就直接请求** —— 少了 `/file/`、少了 `Referer`、少了 `down_ip` cookie，症状是 400；
③ **只顾这一次能下** —— 忽略时效、忽略文件夹分页的 T/K 同批约束、忽略域名族（`wwa` / `wwt` / `lanzoue` / `lanzouf`…），
   换一个分享链接就全盘失效。

> 代际协议矩阵（2018 → 2025）、提取码两条链、文件夹分页、优享版 `encryptHex` → `references/lanzou-protocol-generations.md`
> 门禁、时效、302 取直链、域名族、排错 → `references/direct-link-gating-and-freshness.md`
> 签名型网盘（阿里云盘 ECDSA）与助手类脚本边界 → `references/signed-api-and-helper-scripts.md`
> 本文只给**分流判据、执行顺序、坑表与反例**。

## 分流判据（30 秒定位）

| 现象 | 判断 | 先做什么 |
| --- | --- | --- |
| 分享页能打开，但页面里搜不到下载地址 | **参数在第二跳**（iframe / 内联脚本） | 从分享页抓 `iframe src=` 或 `url : '/ajaxm.php?file=…'` 这一类内联配置（`references/lanzou-protocol-generations.md` §1） |
| 页面里有 `function down_p(){` | **该分享有提取码**（一步到位） | 直接取 `skdklds` + `p=<提取码>`（`references/lanzou-protocol-generations.md` §3） |
| 页面标题是 `<title>文件</title>` | **有提取码**（无码时标题是 `<title>文件名 - 蓝奏云</title>`） | 先判码再选链，别拿无码链去试有码页 |
| 内联脚本里是 `'sign':'…'` + `url : '…'` | **2022+ 无码链** | POST `action=downprocess&signs=?ctdf&sign=…`（`references/lanzou-protocol-generations.md` §3.2） |
| 内联脚本里是 `var iay7or = '…'` 这类随机变量名 + `action=down_process` | **2018 老链**（六字段） | 按变量名逐项取，再拼 `action=down_process&file_id=&t=&k=`（`references/lanzou-protocol-generations.md` §2） |
| 内联脚本里是 `signs`+`websign`+`websignkey`+`ves` | **2024 链** | 五个字段原样带上（漏一个就 `zt != 1`） |
| 拿到 `{"zt":1,"dom":"…","url":"?…"}` 但访问报 400 | **门禁缺失**（不是地址错） | 补 `Referer`（上一跳）+ `Cookie: down_ip=1`，且必须 `dom + "/file/" + url`（`references/direct-link-gating-and-freshness.md` §1） |
| 要求"输入提取码"才显示文件 | **带码分享** | `p=<pwd>` 与 `sign` 一起 POST；不要试图跳过校验 |
| 分享的是**文件夹**（多个文件） | `filemoreajax.php` 分页 | 抓 `t` / `k` / `fid` / `uid` / `pg`（`references/lanzou-protocol-generations.md` §4） |
| 翻到第 2 页就报错 / 返回空 | **T/K 未与第一页同批** | 同一个会话里"取 T/K → 翻页"连续跑，T/K 别复用（`references/lanzou-protocol-generations.md` §4） |
| 业务方说"昨天还好，今天全挂" | **站点改代际 / 上反爬** | 先按代际表重新判据（2025 代际加了 Cloudflare `acw_sc__v2`） |
| 页面里出现 `acw_sc__v2` / `_0x4818` / `arg1` / `posList` | **Cloudflare JS 挑战** | 不在本技能范围内，转 `web-js-env-patcher`（`../web-js-env-patcher/references/edge-waf-cookie-challenge.md`） |
| 目标是一次性签名 URL（`downloadId` / `auth` / `x-signature`） | **签名型网盘** | 走 `references/signed-api-and-helper-scripts.md`；先判"算法型"还是"协议型" |
| 报 `invalid X-Device-Id` | **设备身份校验**（阿里云盘族） | 补 `x-device-id`（UUID）与 `x-signature`（`references/signed-api-and-helper-scripts.md` §2） |
| 油猴 / 篡改猴助手要求"关注公众号后输入验证码" | **本地校验**（不发请求） | 先看有没有网络请求；没有就是纯前端判断（`references/signed-api-and-helper-scripts.md` §3.1） |
| 直链拿到后过一会儿再下报 403 / 过期 | **时效**（正常现象） | 别改参数硬猜；把"解析 → 下载"合成一次执行 |

## 工作流

1. **🔴 CHECKPOINT · 先判"这是哪一种网盘 + 哪一代"。**
   打开分享页，只看三处：① 有没有 `iframe class="ifr2"`；② 有没有 `function down_p(){`；
   ③ 内联脚本里出现的是 `signs` / `websignkey` / `skdklds` / `file_id` 中的哪一组。
   这三处直接决定后面取哪几个字段（`references/lanzou-protocol-generations.md` §1 判据表）。
   **不要**先写正则再回头看页面 —— 代际不同，字段名完全不同。
2. **抽第二跳。** 无码：`iframe src` → 再请求那一跳，拿到 `sign` 与 `ajaxm.php` 的相对 URL。
   有码：分享页本身就有 `skdklds` 与 `url : '/ajaxm.php?file=<id>'`，省一步。
   ⚠️ `iframe` 抽出来是**相对路径**，要拼回"分享链接所在的那个域名族"，不是写死的域名。
3. **POST `/ajaxm.php`。** 按代际带字段（`action=downprocess` + 代际附加字段 + `<提取码>`）；
   `Referer` 必须是**第二跳那个地址**。拿回 `{zt, dom, url, inf}`。
   `zt != 1` 先看 `inf`：它是站点给的失败原因（口令错 / 链接失效 / 被限流），**不要直接重试**。
4. **拼最终地址并取 302。**
   `full = dom + "/file/" + url`（`dom` 里的 `\` 要删；`url` 以 `?` 开头），
   带 `Referer` + `Cookie: down_ip=1` + 浏览器 UA，`allow_redirects=False`，读 `Location`。
   **这就是"可用直链"**；`full` 本身通常也能直接下，但中转一跳更稳。
5. **🔴 CHECKPOINT · 批量场景：直链不落库。**
   分享链接 / 提取码 / 代际是**可长期保存的输入**；直链是**一次性产物**。
   落库只落前者，直链只在"要下的时候"现算（`references/direct-link-gating-and-freshness.md` §3）。
6. **文件夹分享先列目录再逐个取直链。**
   `filemoreajax.php` 的 `t` / `k` 与首页同批拿；`pg` 递增；一页 50 条。
7. **签名型网盘（阿里云盘族）先"判型"。**
   是"算法型"（`x-signature` 需要真正签名，见 §阿里云盘）还是"协议型"（只是一串一次性 token）？
   判据：把同一请求里的该字段**原样重放**看是否通过 —— 通过是协议型，不通过才需要还原算法。
8. **收尾自检。** 解析器跑完后：① 直链能不能 `HEAD` 到 200/206；② `Content-Type` 是不是文件而不是 HTML；
   ③ 同一分享链接连跑两次结果都能下（证明不是"撞上了缓存"）。

## 失败模式与一线修复

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| 最终地址 400 | 少 `Referer` 或 `Cookie: down_ip=1`，或漏了 `/file/` 段 | 把三样都补齐再试；用 `allow_redirects=False` 看 `Location` |
| `ajaxm.php` 返回 `zt != 1` | 字段组合不对（代际混用） | 按页面上**实际出现的那组**字段重拼，别按记忆拼 |
| `sign` 提取到的是 `Match` 对象不是字符串 | 忘了 `.group(1)` | 所有正则都先 `group(1)` 再拼 |
| 有码页走无码链 | 判错了代际 | 用 `<title>文件</title>` 或 `function down_p(){` 先判 |
| 翻页永远只拿到第一页 | T/K 被重新生成（缓存 3 分钟） | 一次会话内"取 T/K → 立刻翻页"，不要跨会话复用 |
| 直链刚拿到就失效 | 时效（含服务端 `st` / `e` / `ip` / `fi` 绑定，甚至与出口 IP 相关） | 缩短"解析 → 下载"间隔；换出口 IP 要重新解析 |
| 换一个分享链接全挂 | 域名族不同（`wwa` / `wwt` / `lanzoue` / `lanzouf` / `lanzoux` …） | 域名从**输入 URL** 解析出来，不要写死 |
| 页面变了但接口还是 `/ajaxm.php` | 站点上了新代际 | 重新走工作流第 1 步的三处判据 |
| 出现 Cloudflare 挑战页 | 反爬（2025 代际） | 转 `web-js-env-patcher`，本技能不重造轮子 |
| `dom` 里出现 `\/` 转义 | JSON 解出来本来就是 `https:\/\/…` | 先 `replace('\\','')` 或直接 `json.loads` 后再用 |
| 阿里云盘报 `invalid X-Device-Id` | 缺 `x-device-id` / `x-signature` | `references/signed-api-and-helper-scripts.md` §2；注意签名**不可复用**、必须原样透传 |
| 阿里云盘签名自检通过但请求仍失败 | 每次签名不同，而服务端要求"用 createSession 那一次的值" | 把 `createSession` 返回的 `x-signature` **原样**带给后续接口 |
| 油猴助手点"确定"没反应 | 校验在本地（无网络请求） | 改判据为 `true`（`references/signed-api-and-helper-scripts.md` §3.1） |
| 想"顺手把整个文件夹都下下来" | 越权风险 | 只处理分享者公开的分享；不做递归遍历 |
| 直链下回来是 HTML 而不是文件 | 打到了错误页（多半是门禁或时效） | 检查 `Content-Type` 与 `Content-Disposition`，再看 `Location` 是否二次跳转 |

## 反例黑名单（不要做的事）

- **不要把直链写进配置 / 数据库 / 文档。** 它是**一次性产物**；存分享链接与提取码。
- **不要写死域名。** `wwa` / `wwt` / `lanzoue` / `lanzouf` / `lanzoux` / `lanzouj` 都是同一家的域名族，
  域名必须从输入 URL 解析（原文的 `re_domain()` 就是干这个的）。
- **不要漏 `Referer`。** 多条来源都明确记了"有次没带所以没取到数据"——这是本族最高频的失败点。
- **不要把 `dom + url` 当成完整 URL。** 中间那个 `/file/` 段是**必须**的（`.com` 后直接跟 `?` 不是合法 URL）。
- **不要用固定字段名去匹配所有代际。** `file_id` / `signs` / `skdklds` / `websignkey` 分属不同代际。
- **不要复用 T/K。** 网页缓存 3 分钟后失效；跨会话复用必然空结果。
- **不要把"口令错"当"算法错"。** `inf` 字段已经告诉你原因了。
- **不要口令爆破、不要遍历他人目录、不要绕过账号权限。** 本技能只面向"分享者公开分享"的场景。
- **不要把 Cloudflare / 风控挑战解在本技能里。** 那是 `web-js-env-patcher` 的活；本技能只负责**判出来并转交**。
- **不要相信"新的 API 地址"能长期有效。** 这一族平均一到两年换一次代际（2018 → 2019 → 2022 → 2024 → 2025 都有记录），
  任何写死的地址都要在文档里注明**取证时间**。
- **不要把油猴 / 第三方助手脚本当可信实现。** 它们的"验证码"可能只是本地判断，
  也可能把你的 Cookie 带出去；先审 `@match` / `@grant` / `@connect`。

## 命令入口

```bash
S=.agents/skills/cloud-drive-direct-link/scripts

# 0) 两个脚本的自检（各含真实样本 oracle 与阴性对照）
python $S/lanzou_parse.py --selftest
python $S/aliyun_ecc_sign.py --selftest

# 1) 判代际（喂分享页 HTML）
python $S/lanzou_parse.py detect --in share-page.html

# 2) 从第二跳（iframe / 内联脚本）抽参数，并打印将要发出的 POST 表单
python $S/lanzou_parse.py params --in hop2.html

# 3) 从 ajaxm.php 的 JSON 响应组装最终地址（自动删 \、补 /file/）
python $S/lanzou_parse.py final --json '{"zt":1,"dom":"https:\/\/down-load.lanrar.com","url":"?VDJVaw…"}'

# 4) 从 302 响应头里取直链（喂 curl -i 的原始输出或单独的 header 文件）
python $S/lanzou_parse.py location --in 302-headers.txt

# 5) 文件夹分享：从列表页抽 filemoreajax.php 需要的 7 个字段
python $S/lanzou_parse.py folder --in folder-page.html --pwd <提取码>

# 6) 阿里云盘：纯标准库推导 secp256k1 公钥、构造签名体、校验 04/01 格式
python $S/aliyun_ecc_sign.py pubkey --priv 175,87,171,214,222,196,127,36,25,50,237,179,71,81,49,196,250,103,115,203,138,179,192,182,43,175,233,72,200,14,64,254
python $S/aliyun_ecc_sign.py signbody --app-id <appId> --device-id <uuid> --user-id <userId> --nonce 0

# 7) 门禁自查：把最终地址该带的头打出来（对照抓包逐项核对）
python $S/lanzou_parse.py gating --referer 'https://wwt.lanzouu.com/fn?f=…' --full 'https://down-load.lanrar.com/file/?…'
```

## 资源

- `references/lanzou-protocol-generations.md`：**蓝奏云系代际协议的唯一权威源** ——
  代际判据表（2018 `file_id/t/k` → 2019 加 Cookie 与验证码 → 2022 `signs` + `down_p()` 双链 →
  2024 `websign` / `websignkey` / `ves` → 2025 Cloudflare）、
  无码链与有码链的逐步抓取顺序、有码/无码的三条区分法（`<title>` / `<style>` / 函数存在性）、
  文件夹分享的 `filemoreajax.php` 七字段与 T/K 同批约束、`ilanzou` 优享版 `encryptHex` 链接拼装、
  以及"每个结论来自哪一篇、取证时间是什么"的来源表。
- `references/direct-link-gating-and-freshness.md`：**门禁与时效的唯一权威源** ——
  `Referer` / `Cookie: down_ip=1` / `/file/` 段三条硬门禁、`st` / `e` / `ip` / `fi` / `up` / `q` 参数语义、
  302 `Location` 的读法、域名族（`ww*` / `lanzou*` / `lanrar` / `baidupan`）与"从输入解析域名"的写法、
  时效分级（分钟级 / 与出口 IP 绑定）、批量场景的"不落库"设计、排错表 12 条。
- `references/signed-api-and-helper-scripts.md`：**签名型网盘与助手类脚本的唯一权威源** ——
  阿里云盘 `x-device-id`（UUID，种子取 userId）与 `x-signature`
  （明文 `appId:deviceId:userId:nonce` → SHA-256 → **ECDSA secp256k1** 签名 → 末尾拼 `01`）、
  `get_public_key` 上报与 `04||x||y` 未压缩公钥格式、nonce 的限位语义、
  "签名不可复用 / 必须原样透传"这条实测坑、
  "列目录接口顺带返回下载链接"这一旁路与它的风险、
  以及油猴 / 篡改猴助手的判型法（先看有没有网络请求 ⇒ 没有就是本地校验）、
  解析站（服务端代取）与本地解析的边界与合规红线。
- `scripts/lanzou_parse.py`：代际判据 + 参数抽取 + 最终地址组装 + 302 解析 + 门禁自查，**零依赖**，
  `--selftest` **96 项**（真实样本 oracle：2018 六字段（含"注释那行不许命中"的对照）、
  2024 五字段与 2022 三字段两版、有码 `skdklds`、文件夹七字段与 t/k 两跳、`dom + /file/ + url` 组装
  与 `\/` 转义还原、302 `Location` 及其 `st/e/fi/up` 参数、门禁三条、域名族判据；
  每条都带阴性对照，构造夹具在脚本里显式标注"值本身为构造"）。
- `scripts/aliyun_ecc_sign.py`：**纯标准库** secp256k1（不引入 `ecdsa` / `coincurve`），
  公钥推导 + 签名体构造 + 完整 ECDSA 签/验 + 格式校验，**零依赖**，
  `--selftest` **52 项**（真实 oracle：源文给出的 32 字节私钥 → 未压缩公钥 hex **逐字符命中**
  `043e2a3bbd…bb7b8d0d`；`04` 前缀 / `01` 后缀 / 130 长度；私钥 1 → G、n-1 → (Gx,−Gy)、n·G → O；
  换公钥 / 篡改 s / 换摘要三条验签阴性对照；随机私钥 3 轮自签自验）。

## 与其它技能的边界

- **目标是"把直链解出来"**：本技能。
- **直链本身就是媒体流（m3u8 / TS / FLV / DRM）**：本技能只负责拿到 URL，
  分片解包与解密走 `stream-drm-reverse`。
- **站点上的是 Cloudflare / 加速乐 / 雷池 / Akamai 挑战**：走 `web-js-env-patcher`
  （本技能只做"判出来并转交"）。
- **需要过滑块 / 点选 / 行为验证才能拿链接**：走 `web-verify-patcher`。
- **签名不是"一次性 token"而是真算法（HMAC / RSA / ECC / 国密）**：
  算法族的还原流程走 `web-reverse-algorithm`；本技能只保留"网盘场景下怎么用"的部分。
- **要托管浏览器 / 复用登录态 / 现场抓包**：走 `browsercli`。
- **分享页被注入、下载器带毒、油猴脚本回传数据**：不是本技能，
  走 `web-malware-forensics`（审计与定性）。
- **客户端形态的网盘（Electron / 桌面版 / 装机版）**：走 `desktop-client-reverse`。
