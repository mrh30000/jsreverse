# 闲鱼 mtop h5 搜索接口 sign —— 作业手册

## 一、入口与传输

- 生成位置: 请求发出前用 `hashlib.md5` 现算（源文 line 75-77）。**没有可断点的独立 JS 函数名** —— 这是「协议级签名」，照 mtop h5 的通用口径拼串即可，不需要抠 JS。
- 触发时机: 每次 `POST` 搜索请求前；**同一个请求的 query 参数 `t` 与参与签名的 `t` 必须是同一个值**。
- 请求: `POST https://h5api.m.goofish.com/h5/mtop.taobao.idlemtopsearch.pc.search/1.0/`
- 传输方式:
  - **query**：`jsv=2.7.2` / `appKey=34839810` / `t=<毫秒>` / `v=1.0` / `type=originaljson` / `accountSite=xianyu` / `dataType=json` / `timeout=20000` / `api=mtop.taobao.idlemtopsearch.pc.search` / `sessionOption=AutoLoginOnly` / `spm_cnt=a21ybx.search.0.0` / `spm_pre=a21ybx.search.searchInput.0` / **`sign=<md5>`**
  - **POST body**：`data=<紧凑 JSON 串>`
- **cookie 必须从浏览器取**（源文里的 `cna` / `cookie2` / `_tb_token_` / `_m_h5_tk` / `_m_h5_tk_enc` 全是示例值且已过期，源文自己也写了「记得改成自己电脑的 cookies」）。

## 二、排查步骤

1. 浏览器打开闲鱼 PC 搜索页，F12 → Network，搜一次，过滤 `mtop.taobao.idlemtopsearch.pc.search`，右键 **Copy as cURL**（拿到完整 cookie 与 body）。
2. 在请求的 query 里确认 `sign` 是 32 位 hex、`t` 是 13 位毫秒；把 cookie 里 `_m_h5_tk` 的值抄下来（形如 `<32位hex>_<13位毫秒>`）。
3. 全局搜 `sign` **搜不到**时不要慌 —— 这个站的 sign 在**协议层**生成（mtop 网关 SDK），不一定有独立函数名可断；直接照 §三 的口径复算即可。
4. 复算：`token = _m_h5_tk.split('_')[0]`；`t = str(round(time.time()*1000))`；`appKey = '34839810'`；`data` 用**你实际要发的那一串 body 字符串**（逐字节一致）。
5. `sign = md5((token + '&' + t + '&' + appKey + '&' + data).encode()).hexdigest()`，写回 query。
6. 用同一份 `t` 发请求；若返回参数非法，**先核对 `data` 的逐字节口径**（空格/键序），再核对 `_m_h5_tk` 是否过期。

## 三、算法口径

- 家族: `hash`
- 细节: `sign = md5(token + "&" + t + "&" + appKey + "&" + data)`；四段、三个单字符 `&`；**无盐值、无排序、无末尾追加**。
  - `token` = cookie `_m_h5_tk` 的值按 `_` 切分取第 0 段（`<token>_<过期毫秒>`）；
  - `t` = `str(round(time.time()*1000))`（毫秒字符串，与 query 的 `t` 同源）；
  - `appKey` = `34839810`；
  - `data` = **POST body 里那一整串紧凑 JSON 本身**（不是 dict）。
- 密钥/常量: `appKey = '34839810'`；`token` 来自 `_m_h5_tk` cookie（会话级、会过期）；无固定盐值
- 输出编码: hex（32 位小写）
- 输出长度: 32

## 四、自算核对（源文章数字重算结果）

- **token 口径核对**：示例 cookie `43a8d19ad104ac584f86e23e273c6aa8_1743764419015` 按 `_` 切分 ⇒ 第 0 段 `43a8d19ad104ac584f86e23e273c6aa8`（32 位 hex）、第 1 段 `1743764419015`（13 位毫秒），与「`<token>_<过期毫秒>`」口径一致。
- **appKey 两处一致**：源文 line 58 的 query `appKey` 与 line 72 的独立变量 `appKey` 都是 `'34839810'`（逐字相同）。
- **`data` 与 `data_1` 是同一串**：源文 line 52 与 line 73 两条 f-string **逐字符相同** ⇒ `print(data,data_1)` 打的是同一串，作者为「签名用」复制了第二份变量，**这不是两个参数**。
- **★ 本流水线独立复算锚点**（源文未给示例值，**不能当作「与源文一致」的证据**，只作回归对拍）：
  `token='43a8d19ad104ac584f86e23e273c6aa8'`、`t='1743764419015'`、`appKey='34839810'`、
  `data` 取 line 52 模板且 `page='1'`、`keyword='鞋'`（串长 240）⇒ **`sign=0b7b9b56009a4b31c5c69b0ad95b924a`**。
- **★ 口径敏感性锚点**：同一锚点改用 `json.dumps` 默认分隔符（`, ` 与 `: `）得到 `data` ⇒ `sign=9bc63f0e2e3aa4865d0fa9a9fb0c370b`。
  **两个值不同** ⇒ 证明「`data` 串必须与浏览器逐字节一致」不是形式要求。

## 五、与 taobao-isg-cna 蓝图的关系

同一母体（**淘宝系**）的**两条不同支线**，不可互换：

| | 本蓝图（`xianyu-mtop-h5-sign`） | 同库蓝图 `taobao-isg-cna`（`.agents/skills/reverse-knowledge/data/blueprints/taobao-isg-cna/metadata.json`） |
| --- | --- | --- |
| 参数 | query 的 `sign` | cookie 的 `isg` |
| 算法 | `md5(token & t & appKey & data)` | 46 字节字段序列化 → 前置 `[4, checksum]` → 异或流 → URL-safe Base64 |
| 密钥 | `_m_h5_tk` cookie（会话级） | 固定字母表 + 异或常量 131 |
| 位置 | **请求参数** | **反爬 cookie** |

判据：**看到 `_m_h5_tk` + `&` 拼接，就是 mtop h5 这一支**；看到 `isg` cookie / `getIsg`，才是 isg 那一支。
两者可能**同时出现在同一个请求上**（一个管网关鉴权、一个管反爬），不要以为「有一个就不用另一个」。

## 六、来源之间的矛盾

- 本批只有**单源**（`52pojie-2021569`），**没有第二篇文章可互证**。
- 源文内部没有真矛盾，只有**一处容易误读**：`print(data,data_1)` 看着像两个参数，
  实际 line 52 与 line 73 的 f-string 逐字符相同（见 §四）。**登记为「作者复制了两份，不是两个参数」。**
- 🔴 **源文业务代码缺陷（与签名无关，但会污染采集结果）**：line 105
  `f'https://www.goofish.com/item?id=893424239322&categoryId={shop_id}'` ——
  `893424239322` 是**写死的常量**，而 `{shop_id}` 实际取自 `detailParams['itemId']`
  ⇒ **字段名（categoryId）与实际值（itemId）不符**。**不要照抄进「正确做法」。**

## 七、明确留白（原文未给出，不要臆测）

- 源文**未给任何** `(token, t, appKey, data) → sign` 的示例四元组，也没贴出 `sign` 的值 ⇒ 算式只做逐字登记，**无法与源文对拍**。
- `spm_cnt` / `spm_pre` 是固定值还是随页面变化的埋点位：未说明。
- `sessionOption=AutoLoginOnly` 的作用与是否必需：未说明。
- `t` 与 `_m_h5_tk` 里那段过期毫秒是否有关联：未说明。
- `_m_h5_tk_enc` 是否必需：未说明。
- `data` 里 `keyword` 后那个空格、以及 `false` / `30` 不加引号的口径，是否为服务端硬性要求：未说明（只知道源文这么写）。
- 源文 cookies / headers 全是**示例值且已过期**，无法据此复现请求。
