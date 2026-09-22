## 入口与传输

- 生成位置: 多版本入口名不同：(a) 2022 试用页 main.6d****82.js，`y = this[o(81,0,25)+t(0,920,0,1148)](f, s, g)` 赋值给 `c.h5st`/`w.h5st`；(b) 2024 搜索页 js_security_v3_0.1.6.js 的 `window.PSign.sign`，h5st 实际来自 `__genSignParams`；(c) 另一版本为全局 `ParamsSign`（1.js，约 10500 行混淆）
- 触发时机: 请求前生成（文章在滑动加载下一页 / 点类目 / 发搜索请求时断点命中）
- 传输方式: query 参数，参数名逐字 `h5st`；2104180 中随 `params` 一起 GET 到 https://api.m.jd.com/api，同请求另有 query `x-api-eid-token`、`appid`、`functionId`、`client`、`clientVersion`、`t`、`body`

## 排查步骤

1. 打开目标页（search.jd.com 或试用活动页），F12 搜 `h5st`，定位赋值点（`c.h5st = y` / `w.h5st = y`）并在附近下断点，触发翻页/搜索。
2. 断到赋值处后看 this：2022 版为 `_appId`/`_fingerprint`/`_token`/`_timestamp`/`_version`；2024 版看 `window.PSign.sign` 入参。
3. 若文件名是 js_security_v3_*.js，先按 1913553 的 AST 流程去混淆：字符串函数根函数 `kA`（取值 [500, 500+EA().length]，解码类似 base64 但取字符表 "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=" 的下标）→ for-switch 控制流（`value.split("|")` 还原块顺序）→ 单行 return 包装函数（如 ut.xtLZB）内联。
4. 去混淆后全文搜 `h5st`，定位 `__genSignParams`；再跟 `__genKey`（VM 加载代码，来自 localStorage `WQ_dy_algo_s_f06cc_4.3`）与 `__genSign`->`Zb`（HmacSHA256）。
5. 在 `__genSign` 内打印待签字符串，确认是 `key:value` 以 `&` 连接、且 body 字段是紧凑 JSON 的 sha256 hex。
6. 在 Promise 状态机里跟 t：t 来自 `V = t["sent"]`，在 case5→case8 区间内**最后一次** `t["abrupt"]("return", xxx)` 处下断点，那里就是 AES 加密环境串的代码（见 jd-env-params）。
7. 用 Node 跑通后发一次请求；403 时按顺序排查：token 是否 tk03、body 是否紧凑 JSON、appid/signAppId 是否混用、navigator 等全局是否被宿主覆盖。
8. 若走纯补环境路线（2092635），至少补 window/document/navigator/localStorage/XMLHttpRequest/screen，并把 `_onRequestTokenRemotely` 实现成真正发 HTTP 的 XHR。

## 算法口径

- 家族: `hmac`
- 细节: 第5段与最终签名段均为 HMAC-SHA256（原文 `Jd.HmacSHA256`、`HmacSHA256签名`）。签名原文由若干 `key:value` 用 `&` 连接（示例逐字：`appid:search-pc-java&body:xxxxxx&client:pc&clientVersion:1.0.0&functionId:mixerOut&t:1713089999455`）；HMAC 的 salt 不是固定盐，而是 __genKey(_token,_fingerprint,v,_appId,algos) 的返回值，其算法体由远端下发 VM 代码定义
- 密钥/常量: `无固定全局盐值；HMAC key = token（tk03/tk05，来自 request_algo）或 __genKey 派生值。注意：本批文章中**没有** `_key` 这一变量名`
- 输出编码: unknown（文章只说明第 5 段做了 o(93,0,-78) 的转换，未说明是 hex 还是 base64）

## 自算核对（源文章数字重算结果）

- 2104180 的 body hash 为 64 个 hex 字符；1669042:116 说的『boby是64位的未知数』与之吻合（是 64 个字符而非 64 bit），SHA-256 摘要长度核算通过
- 1913553:794 的 body 值 `4003786fdc49eae4d371309b4e42395f38e243887e470fe2cef2733dc03581c3` 实测长度 = 64 字符，确认为 SHA-256 hex
- 1913553 的示例时间戳 1713089999455 换算为 UTC 2024-04-14 10:19:59.455，与文章发布时间 2024-04-14 吻合，确认是毫秒
- 2092635 的示例 t=1771501263005 换算为 UTC 2026-02-19 11:41:03.005，与帖子编辑时间 2026-02-22 吻合，确认是毫秒
- 2052845 的 `v: "h5_file_v5.2.0"` 与标题『5.2版本』一致
- 拼接串分隔符核算：示例串中 6 组 `key:value` 之间确实是 `&`，键值之间是 `:`，与文章文字描述一致

## 来源之间的矛盾

- docs/references/52pojie-1669042-京东试用h5st参数.md:48 vs docs/references/52pojie-1669042-京东试用h5st参数.md:106 —— 同一篇里同一对 iv/key 出现两个不同 key：line 48 `wm0!@w\_s#ll1flo(`（下划线）vs line 106 `wm0!@w-s#ll1flo(`（连字符），iv 都是 0102030405060708（判定: 无法判定哪个对。两处都是 markdown 表格里的明文；line 48 的 `\_` 是 markdown 转义写法，去转义后是 `_`，与 line 106 的 `-` 确实不同字符。可能是同篇笔误，也可能两处代码路径用了不同 key，需实测比对）
- docs/references/52pojie-1669042-京东试用h5st参数.md:46 vs docs/references/52pojie-1913553-利用 ast 解混淆某东 h5st js 文件并进行参数分析.md:819 —— 环境段 AES key 跨版本不同：2022 版为 `wm0!@w_s#ll1flo(`，2024 版 js_security_v3_0.1.6 为 `&d74&yWoV.EYbWbZ`（iv 两篇一致：0102030405060708）（判定: 判定为版本差异（2022-07 vs 2024-04），不能据此判谁错；两处都只是作者断点读出的值，均未给出完整可复现的加解密输出）
- docs/references/52pojie-1913553-利用 ast 解混淆某东 h5st js 文件并进行参数分析.md:36 vs docs/references/52pojie-1913553-利用 ast 解混淆某东 h5st js 文件并进行参数分析.md:765 —— 同一篇里版本号不一致：js 文件名是 `js_security_v3_0.1.6.js`，而 localStorage key 是 `WQ_dy_algo_s_f06cc_4.3` / `WQ_dy_tk_s_f06cc_4.3`（4.3）（判定: 无法判定。可能分别是 SDK 文件版本与算法包版本两个维度，文章未解释；存疑，低置信）

## 明确留白（原文未给出，不要臆测）

- h5st 的完整 8 段分段结构（分隔符到底是 `;` 还是其他、每段是什么）本批 5 篇文章全部未给出；第 1/2/4/6/7 段逐字含义 unknown
- 第 5 段 o(93, 0, -78) 转换后的编码（hex / base64）与长度，文章未说明
- h5st 整体字符串长度：2104180 代码里 print 了 `len(h5st_value)`，但文章未贴出输出值
- `_key` 这一变量名在本批文章中不存在（仅 `_token`/`_fingerprint`/`_appId`/`_version`），如其他来源提到 `_key` 需另行取证
- 算法体（algos / __genKey 内部实现）由远端 VM 代码下发，文章未展开，纯算需自行 dump
- 2104180 未给出可运行的 h5st.js（作者说『js文件非常大』、放在压缩包），只有 Python 侧代码
