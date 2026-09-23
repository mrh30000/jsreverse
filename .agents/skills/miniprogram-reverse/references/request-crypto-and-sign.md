# 小程序的请求签名与加解密（唯一权威源）

一句话：**小程序前端 = 网页前端。** 所有 sign / 加密逻辑都在解包出的 JS 里，
"扣代码"和"纯算重写"的难度**不高于**网页站；真正麻烦的是**参数来源跨进程**（缓存、`wx.login`、原生桥）。

> 包怎么拿、怎么解包见 `unpack-and-decrypt.md`；运行时调试 / 云函数 / 原生层见 `runtime-and-debug.md`。
> 通用的哈希 / HMAC / AES 配方与阻塞点排查见 `web-reverse-algorithm`；
> 通用的补环境见 `web-js-env-patcher`。**本文只写小程序特有的那些**.

---

## 1. 先分类：抓包一眼定题型

| 现象 | 题型 | 处置 |
| --- | --- | --- |
| 请求/响应均明文，无 sign | ① 无防护 | 直接重放；只防 UA / Referer |
| 请求体（或响应体）是密文，无 sign | ② 只加密 | 找加解密函数（§3） |
| 参数明文，但有 `sign` / `X-Sign` / `Checksum` | ③ 只签名 | 找 sign 函数（§2） |
| 密文 + `sign` 同时存在 | ④ 都加密 | **先解 sign（它是"入场券"），再解 body** |

**"两个等号"是第一判据**：密文尾部出现 `==` ⇒ base64 或（base64 包裹的）AES。
先用 base64 试一把（能出可读 JSON 就是纯 base64 —— 实测确有这样的站点），不行再上 AES。

`sign` 落在哪，决定断点下在哪：

| 位置 | 特征 | 断点 |
| --- | --- | --- |
| **请求头** | `sign` / `X-Sign` / `x-*-signature` / `Checksum` / `Nonce` / `Curtime` 等非标准头，"每个请求都有" | `XMLHttpRequest.setRequestHeader` / 拦截器封装 |
| **请求体** | body 里多一个 `sign` 字段 | 搜索该字段名 |
| **整个 body 加密** | body 是 base64 长串 | 搜 `encrypt` / `aes` / `decrypt` |

> **判定技巧**：把 `time` 改掉重放。若返回 `checkSum error` / `签名错误` / `416` ⇒ 参数进了签名；
> 若只报"时间不对"⇒ 时间戳另有独立校验（见 §6）。

---

## 2. sign 族：五类结构签名

| 族 | 结构签名（在 JS 里长什么样） | 复现要点 |
| --- | --- | --- |
| **S1 排序拼接 + 盐** | `Object.keys(p).sort()` → `h += k + v` → `md5(base64(h))` 或 `md5(h + 盐)` | **排序是对 key 排**；拼接是 `k+v`（不带分隔符）还是 `k+"="+v+"&"` 必须逐字符抄 |
| **S2 字典序 + 固定前缀 + 大写** | `u = "SING=HLYF"` 起手 → `&k=v` 累加 → `.toUpperCase()` → md5 | **前缀参与哈希**，且**要先大写再 md5**；`u` 若恰好等于前缀还要补 `&` |
| **S3 HmacSHA256(值排序, 盐)** | `HmacSHA256(str, key)` + `enc.Base64.stringify` | 签名是 **base64** 不是 hex；盐常来自"本地值 + 接口下发值"**拼接**（见 §4） |
| **S4 时间戳 + 本地 key 拼 md5** | `md5(ts + "," + client_key) + "," + ts` | `client_key` **不加密、明文过网络** ⇒ 抓包直接读；这也是最常见的"看着玄其实很弱" |
| **S5 数组乱序取字符** | 62 字符表 + `r = shuffle(0..61).slice(-20)`，再 `s += t[e]` | 表与取值顺序是**写死的**；照抄表 + 照抄取字符循环即可，**不要试图"理解"它** |

**排除字段是高频坑**：签名前常**剔除**一批 key（`tokenId` / `ssid` / `sign` 本身 / `content` / `file` / `openid` / 一堆业务字段）。
**剔除名单同样要逐字符抄** —— 漏一个或错一个，sign 就是错的，且**没有任何报错提示**。

**大小写/编码三连坑**（同一站点内也可能不一致）：
1. 最终 sign 是 **hex 小写**、**hex 大写**、还是 **base64**；
2. 明文拼接前是否先 `Base64.encode`（实测有 `md5(base64(明文))` 这种）；
3. 是否做了 URL-safe 替换（`+`→`-`、`/`→`_`）——**逆向时记得反向**：
   ```python
   s = s.replace("-", "+").replace("_", "/")   # URL-safe base64 → 标准 base64
   ```

---

## 3. 加解密：四类结构

| 类型 | 特征 | 处置 |
| --- | --- | --- |
| **单层 AES** | `CryptoJS.AES.decrypt(ciphertext, key, {iv, mode:CBC, padding:Pkcs7})` | 抠 key/iv（§4）；注意 `mode` 可能是 **ECB**（此时 `iv` 传 `""`，且**必须忽略 iv**） |
| **双层 AES（自描述）** | 第一层解出的 JSON 里**又给了 `UTS`/`UVER` 当第二层的 key/iv** | 解两遍：`JSON.parse` → 取字段 → 再解。**key 也可能在数据里**（`key`/`iv` 同名字段） |
| **RSA 私钥前端签名** | `KEYUTIL.getKey("-----BEGIN PRIVATE KEY-----…")` + `SHA256withRSA` | **私钥就写在包里**（`priK`）⇒ 纯算复现，注意签名输出是 `hextob64` |
| **国密 / 魔改** | `sm-crypto` 的 sm2/sm3/sm4；或"名字叫 sm4 但改了一处" | 先按标准 sm3/sm4 试；**不一致时逐轮对拍**（见 §5 坑表） |

**key/iv 派生与补齐**：
- `key = padEnd(x.toString(), 16, "0")` —— **用 `0` 右补到 16 位**（不是 padding、不是截断）。自己实现时极易漏。
- `key = md5(小程序 id)`；`iv = 某接口返回值的某个切片`；`iv = 响应里的 `UVER``。
- 有站点直接给 `q.substr(1,16)` / `q.substr(16,16)`：**一个长串前切 1 位再取 16、再取 16**（`substr` 第二参是**长度**，不是结束下标）。

**编码链**：小程序里 base64 常是**自实现**的（`C.Base64.encode`），可能与标准实现存在**非标准字符表 / 缺 `=` 补齐 / URL-safe 变体**差异。
解不出来时先 `print` 出它的字符表，**别假设是标准表**。

---

## 4. key / iv / 盐 从哪来：五个来源 + 爆破法

| 来源 | 特征 | 处置 |
| --- | --- | --- |
| **混淆常量数组** | `constant-obfuscated.js` 里一个长数组，元素被拆散/拼接/乱序 | **不要硬读，去爆破**（下） |
| **DOM / 页面属性** | `<div id="app-key" data-keys="3854…,2917…">` | HTML 里搜属性名；`data-keys` 是 **Uint32 掩码表** |
| **本地 + 远端拼接** | 本地 `tk` 与 `getconfig` 接口返回的 `tk` **拼接**才是真密钥 | 抓包找出那个接口；"单个值试不对"是这类题的典型症状 |
| **storage 缓存** | `wx.getStorageSync("userInfo").token` | 缓存里就有；**别去算**，直接读（见 §6） |
| **接口下发** | 响应里直接给 `key`/`iv`/`UTS`/`UVER` | 抓一次就够；但**可能带时效** |

### 爆破法（本技能的主推手段）

```bash
S=.agents/skills/miniprogram-reverse/scripts

# ① AES key+iv 双遍历：拿一组已知密文，遍历常量数组
python $S/const_bruteforce.py aes-pair --ciphertext "<抓到的 b64>" \
       --array-file unpacked/constant-obfuscated.js --json-only

# ② md5 / sha256 盐值爆破
python $S/const_bruteforce.py md5-salt --target "<抓到的 sign>" \
       --template "{salt}nonce1231759127717" --array-file unpacked/header.js

# ③ int32 掩码异或（掩码在 DOM 属性或常量表里）
python $S/const_bruteforce.py xor-int32 --data "<b64>" --mask 3854078970,2917115795,3887476043,3350876132
```

**为什么爆破优于读代码 / 问 AI**：实测过同一个混淆数组——
AI 读出来的候选值**是错的**；而"遍历数组 + 用 JSON 可解析性当判据"一次命中。

**唯一正确判据：解出来必须是合法 JSON（或业务可识别的明文）。**
⚠️ **错误的 iv 也能解出"看起来很可读"的字符** —— AES-CBC 是逐块独立的，iv 只影响第一块，
且填充校验常能"歪打正着"通过。实测同一把 key 换 10 个不同 iv，**大部分都吐出了带部分正确明文的串**。
所以 `aes-pair` 会把所有命中按 `json=True` 排在最前，**只认 JSON 那一组**。

### 常量会跨版本轮换（双源互证结论）

同一小程序 2024 版 vs 2025 版实测：

| 常量 | 2024 版 | 2025 版 | 结论 |
| --- | --- | --- | --- |
| `aes_key` | `3993014457161851` | `3993014457161851` | **没变** |
| `appSecret`（Checksum 用） | `%4_CA*U$GM6N#0EP` | `Kfl%BOk6C5PwARw8` | **换了** ⇒ 照抄文章常量必然失效 |
| `aes_iv` | `PDVcDRWMrBlLHTqh` | `PDVcDRWMrBlLHTqh` | 没变 |
| 请求头集合 | `x-clienttraceid / Nonce / Curtime / Checksum` | 同上 | 稳定，可当地标 |

⇒ **正确姿势**：抄"结构 + 判据"，**不抄常量**；常量一律从当次解包产物里爆破/抠取。
`Checksum` 的结构稳定可复用：`sha256(appSecret + Nonce + Curtime)`（hex 小写）。

---

## 5. 坑表（"不报错但结果错"专区）

| 触发条件 | 一线修复 | 说明 / 兜底 |
| --- | --- | --- |
| sign 算出来长度对但服务端报"签名错误" | 逐字符核对**排序方式**（`sort()` 对 key 排 vs 对 `k=v` 串排）、**剔除名单**、**分隔符** | 三者任一错都只报"签名错误"，无法区分 ⇒ 用抓包值反解：**先拿 JS 原函数算一次**，与抓包值比，一致才动 Python |
| AES 解出来"部分对、部分乱码" | 你选错 **iv**；或密文不是 CBC（是 ECB/CTR） | 同 key 换 iv 会"部分正确"⇒ **必须用 JSON 判据**；ECB 时 `iv` 传空串 |
| `decrypt` 抛 `padding error` | 密文是 **URL-safe base64** 或**缺 `=`** | 先 `-`→`+`、`_`→`/`、再补 `=` |
| 明文解出来前 16 字节乱、后面全对 | **CBC 的 iv 缺失/错误**（iv 只影响第一块） | 别以为"前 16 字节乱=算法错" |
| 换了台设备/清了缓存就失败 | token 在 `wx.getStorageSync` 里 | 清缓存会丢 token ⇒ **调试前先备份缓存**；或从接口重新取 |
| 参数里有个看不懂的 `code` / `id` | **`wx.login()` 生成，`code` 是一次性的、不可复现** | 真实业务里**无法纯算复现**。处置：① 老 code 在有效期内可能还能用；② 找 `updateCode` 一类"刷新 code"的接口；③ 若只是被塞进加密体且**不参与签名**，可**直接解出旧值复用** |
| 改完 sign 请求返回"请在设置中将手机时间调成北京时间" | 服务端对 **`Curtime` 与真实时间做过比较**（不止进签名） | `Curtime` 要用**当前真实秒级时间戳**，不能沿用抓包的 |
| sign 里含 `token`，token 是上一个接口给的 | token 有**时效**（常几分钟） | 把"取 token → 算 sign → 发请求"串成一次执行，**不要分开跑两遍** |
| 同一接口不同调用 sign 不同，且参数完全一样 | 明文里含**时间戳 / `Math.random()`** | 固定参数 + 变时间戳重放即可；`nonce` 类随机串**照抄结构**（32 位 hex 常见） |
| 算法"是标准 sm4/sm3 但算出来不对" | 站点**魔改了国密**（改 S 盒/轮数/初始向量） | 拿浏览器真实值当 oracle 逐轮对拍；**不要假设国密实现是标准的** |
| `md5` 结果与 `hashlib.md5` 不一致 | 明文编码不同（UTF-8 vs latin1）、或**先 base64 再 md5** | 用 `CyberChef` 手算一遍对齐编码链 |
| 前端私钥签名（RSA）解不出 | 密钥是 **PKCS#8 PEM 文本**、签名输出做了 `hextob64` | 私钥就在包里（`priK`），直接拿；注意 `SHA256withRSA` 是 **PKCS#1 v1.5** |
| 请求头里有 `x-*` 自定义头却搜不到赋值 | 值是**随机 UUID/设备指纹/固定常量** | 随机串不必复现；**固定设备 id 直接照抄**（部分站点带设备绑定，慎改） |

---

## 6. 参数来源矩阵（决定"能不能纯算"）

| 参数来源 | 典型字段 | 能否纯算复现 | 处置 |
| --- | --- | --- | --- |
| 纯前端计算 | `sign`、`Checksum`、`Nonce`、`Curtime`、加密后的 body | ✅ | 抠代码 / 纯算重写（本文主战场） |
| 本地缓存 | `token`、`openid`、`unionid`、`session_id` | ✅（取一次即可） | 从 storage 读；**会话期内有效** |
| 服务端下发 | `session_id`、`client_key`、`uts`/`uver` | ✅（取一次） | 先调前置接口；**注意时效** |
| **原生桥生成** | `wx.login()` 的 `code`、部分 `device_id` | ❌ **不可复现** | 见坑表；或改走"浏览器/真机里挂 RPC"（`runtime-and-debug.md`） |

**"哪些值参与签名"的最快判据**：抓两次请求 → **逐字段 diff**；
再对变化字段**逐个改坏重放**，看服务端是否报签名错误 ⇒ 一次就能确定参与名单。

---

## 7. 命令入口（可直接粘贴跑）

```bash
S=.agents/skills/miniprogram-reverse/scripts

# 包识别 / PC 解密 / 列举 / 提取
python $S/wxapkg_tool.py identify __APP__.wxapkg sub1.wxapkg
python $S/wxapkg_tool.py decrypt --in __APP__.wxapkg --out app.wxapkg --wxid wx1234567890abcdef
python $S/wxapkg_tool.py list app.wxapkg --json
python $S/wxapkg_tool.py extract app.wxapkg -o unpacked/

# 常量表爆破三件套
python $S/const_bruteforce.py aes-pair --ciphertext "<b64>" --array-file constant-obfuscated.js --json-only
python $S/const_bruteforce.py md5-salt --target "<sign>" --template "{salt}nonce1759127717" --array-list '["a","b"]'
python $S/const_bruteforce.py xor-int32 --data "<b64>" --mask 3854078970,2917115795,3887476043,3350876132

# 全脚本自检
python $S/wxapkg_tool.py --selftest
python $S/const_bruteforce.py --selftest
```
