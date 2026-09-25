# 登录 / 账号体系：提交参数的判族与还原 —— 唯一权威源

> **本文是「登录（注册 / 改密 / 认证跳转）这一条链路上，提交参数怎么判族、怎么复算」的唯一权威源。**
> 与 `07-antidebug-and-live-patching.md` §6「参数溯源三元分类法」的分工：
> 那份讲**任意接口**的参数来源分类（固定 / 上次返回 / JS 计算）；
> 本文讲**登录专有**的三件事 —— **服务器下发字段清单**、**密码加密族判据**、**提交形态**。
> 可执行实现：`scripts/login_param_probe.py`（自带 `--selftest`）。
> 结构化结论来源：B15 蒸馏（21 篇，见 `docs/references/verified.md` 三·M）。

---

## §0 五步工作流（照做，不要跳）

| 步 | 动作 | 判据 / 命令 |
| --- | --- | --- |
| 1 | **抓两次包**（同一账号密码，间隔几秒） | 只看「哪些字段变了」。全都不变 ⇒ 走 §6 的「固定值」；只有 password 变 ⇒ 对称/哈希；**password 长度也变** ⇒ 非对称（RSA，含随机填充） |
| 2 | **三分类**（§1） | 服务器下发 / 加密产物 / 风控指纹。**先把「服务器下发」的全部摘出去**，剩下的才值得逆 |
| 3 | **判族**（§2） | `python login_param_probe.py classify --cipher "<密文>"` |
| 4 | **复算**（§3~§5） | 按族选命令；**必须拿抓包里的那一份密文当 oracle 对拍**，不要只看「算出来了」 |
| 5 | **闭环** | 用复算值**原样**发一次登录请求，看是否真的登录成功。**只有服务端认了才算过** |

> ★ **第 1 步的「抓两次」是这一族最省力的一步**：一次就能砍掉「密码到底是不是对称加密」这个最大的分岔。
> 实测来源：`52pojie-2063774`（某店）就是靠「`credentials.username` 与 `credentials.password` 的**长度与内容都会变**」直接判出 RSA。

---

## §1 三分类（登录版）：先把「服务器下发字段」全摘出来

> 通用版（固定 / 上次返回 / JS 计算）见 `07-antidebug-and-live-patching.md` §6；
> 本节是它在登录场景下的**具体字段清单** —— 这一族最常见的浪费是把服务器下发的字段当成加密产物去逆。

| 类别 | 典型字段名 | 从哪取 | 硬判据 |
| --- | --- | --- | --- |
| **服务器下发（页面内）** | `formhash` / `csrf` / `_csrf` / `execution` / `token_id` / `uuid` / `lt` / `view` / `usedogcode` / `pwdDefaultEncryptSalt` / `bridgeData` | **登录页 HTML 里**（正则 / XPath 抠），或页面内 `window.*` 全局 | 去掉 cookie 单独 GET 一次登录页，**这些值就在响应里**（`1316664` / `536217` / `1353766` / `1980542`） |
| **服务器下发（前置接口）** | `publickey_mod` / `publickey_exp` / `randomcode` / 带 `#` 的盐串 / `_sessionid` | 登录前的一个独立 GET/POST 接口 | `1217367`（盐由接口返回、按 `#` 分割）、`1522743`（steam `getrsakey`）、`1861004`（js 函数本身每次刷新都变） |
| **加密产物** | `password` / `pwd` / `pass` / `encoded` / `passwordEnc` / `credentials.password` / `encData` / `encKey` / `Sign` / `X-Sign` / `sign` | 由 JS 计算 | 见 §2 判族 |
| **风控 / 指纹** | `h5Fingerprint` / `risk_partner` / `risk_platform` / `risk_app` / `device_name` / `device_type` / `device_os` / `sdkType` / `fingerprint` | 由 JS 计算（但对**入参**的敏感度低） | `1316664`：`h5Fingerprint = utility.getH5fingerprint(window.location.origin + url)` —— **对 POST 的 URL 加密**，换 URL 就得重算 |

### §1.1 三条易错点

1. **`formhash` / `csrf` / `execution` 是「每次都变但可复现」**：它们不是加密，只是防重放。
   拿不到就重 GET 一次登录页，**不要试图算**。
2. **`uuid` / `token_id` 这类「看着像随机」的值也在页面里**（`1316664` 原文：去掉 cookies 单独请求登录 URL，
   全局搜一下 `uuid`、`token_id` 就在网页里）——**先搜页面，再考虑算**。
3. **同一接口里的「编码」不是「加密」**：`su = base64(encodeURIComponent(手机号))` 是编码；
   别把它和 `password` 一起当成加密处理（`02-algorithm-families.md` 微博小节同源）。

---

## §2 密码加密族判据表（30 秒分流）

> **判据看形态，不看名字。** 先跑 `classify`，再决定要不要扣代码。

| 密文形态 | 族 | 复算命令 | 实测来源 |
| --- | --- | --- | --- |
| 32 位 hex | **MD5 族**（裸 md5 / md5 链） | `md5-chain --preset bare`（或 §3.2 的链） | `536217` / `1108756` / `1815692` |
| 32 位 hex 大写 | MD5 + `toUpperCase()` | `md5-chain --preset bare --upper` | — |
| 40 / 64 位 hex | SHA-1 / SHA-256 | 先确认是哈希不是 HMAC | — |
| 纯 base64，**解码后是可打印文本** | **base64(文本)**，多为 `base64(md5hex)` | 先 `b64-probe` 看内层 | `1266540`（`$.base64.btoa(pwd,"UTF-8")`） |
| 纯 base64，**解码后是乱码且长度是 16 的倍数** | **base64(分组密码密文)** = AES / SM4 | `media_crypto.py aes-cbc / sm4-cbc`（`stream-drm-reverse`） | `1723994`（AES-CBC，key=iv=固定 16 字符） |
| 纯 base64，**解码后长度是 8 的倍数但不是 16** | **DES / 3DES** | `des --mode cbc --key-hex … --iv-hex …` | `1108756`（`b64_encode(des_encode(params))`） |
| base64 且**很长**（解码后 64/128/256 字节） | **RSA** | `rsa-pubkey` 解析公钥 → 与接口下发的 mod/exp 对拍 | `1111948` / `1522743` / `1861004` / `1991268` / `2063774` |
| 两段**等长**的 base64 | AES + RSA 混合：`encData` = AES(明文, **随机 key**) + `encKey` = RSA(该 key) | 先 `rsa-pubkey` 解 `encKey`，再 `media_crypto.py` 解 `encData` | `1991268` |
| 含 `%XX` | **不是加密**，是 URL 编码 | `unquote` 后再看 | `02-algorithm-families.md` |

> ★ **「解出来是乱码」本身就是判据**，不是「我解错了」。
> 实测反例（`1723994`）：base64 解出来是乱码 → 作者一开始以为解错，实际内层是 AES-CBC 密文。
> `classify` 会把这条判据直接打出来。

---

## §3 MD5 族：四种实测形态

### §3.1 裸 MD5

```js
password = hex_md5(pw);        // 吾爱论坛 pwmd5：只有 password 一个字段会变
```

### §3.2 四种「加盐 / 加时间戳」的链

| 形态 | JS | 复算 |
| --- | --- | --- |
| **盐在中间**（青果教务 `1108756`） | `hex_md5(hex_md5(password) + hex_md5(randnumber.toLowerCase()))` | `md5-chain --preset pwd-then-salt --pwd <pw> --salt <验证码>` |
| **双 hex 相加**（青果 token） | `md5(md5(params) + md5(timestamp))` | `md5-chain --preset hex-pair --x <params> --y <ts>` |
| **前后各一段固定串 + 时间戳**（某卢 `1815692`） | `hex_md5(A + hex_md5(B + pwd + ts))` | `md5-chain --preset nested-with-ts --outer-prefix A --inner-prefix B --pwd <pw> --ts <ts>` |
| **裸 MD5 后转大写** | `hex_md5(pw).toUpperCase()` | `--upper` |

### §3.3 ★ `charCodeAt & 0xff` 与 `CryptoJS.MD5` 是**两个不同的口径**

`1815692` 那套手写 MD5 的内部是：

```js
x[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((i % 4) * 8);   // ← 低 8 位截断（latin-1）
```

而 `CryptoJS.MD5(str)` 走的是 **UTF-8**。**同一个非 ASCII 密码，两种实现算出完全不同的哈希。**

- 复算时用 `--encoding latin1`（默认，对应 `& 0xff`）或 `--encoding utf8`（对应 `CryptoJS.MD5`）。
- 本脚本自检里有一条**区分性断言**：对含中文的密码，两种口径必须给出不同结果 ——
  否则说明实现把口径写死了（B14 `../../stream-drm-reverse/references/key-wrapper-families.md` §7「md5 的口径」是同一个坑）。
- 同一个页面里**两个库混用**是真实存在的：先确认**这一个字段**用的是哪个库。

### §3.4 扣 MD5 代码时必须保留的两个常量

`1815692` 明确点出：`chrsz = 8` 与 `hexcase = 0` 是**函数族依赖的常量**，扣代码时漏掉会静默算出别的值。
通用做法：**扣完立刻拿一次抓包密文对拍**，不要等到最后。

---

## §4 base64 / AES / DES / RSA

### §4.1 base64 只是「外层编码」

- `$.base64.btoa(pwd, "UTF-8")`（`1266540`）：**扣 JS 时**要把文件首行/末行删掉、
  并把 `$.base64 = ` 这种**库挂载写法**改掉，再自己写一个 `getPwd(p){ return Plugin.btoa(p,"UTF-8"); }`。
- 若是 `$.base64` 这种 jQuery 插件式的自实现 base64，**优先直接改写成 Python 标准 base64**，
  而不是把整个插件扣下来 —— 但要**先对拍一次**确认它和标准 base64 逐字节一致（有些站改过字母表）。

### §4.2 AES：key/iv 的三种来源

| 来源 | 判据 | 实测 |
| --- | --- | --- |
| **key = iv = 固定串** | JS 里 `CryptoJS.AES.decrypt(pwd, key, {iv: key, mode: CBC, padding: Pkcs7})`，同一变量传两次 | `1723994`：`u2oh6Vu^HWe4_AES`（16 字符） |
| **盐在 HTML 隐藏字段** | `$("#pwdDefaultEncryptSalt").val()` → `_etd2(password, salt)` → `encryptAES(p0, p1)` | `1353766`（CAS 系）；加密结果写进 `#passwordEnc` 隐藏字段 |
| **随机 key + 非对称封装** | 响应里同时出现 `encData`（密文）与 `encKey`（很短的 base64） | `1991268`：key = 16 位随机 hex，iv = 固定 `16-Bytes--String`，`encKey = ee(key)` |

> ★ **AES 的密文长度一定是 16 的倍数**（CBC 带 PKCS7 填充后）。长度不是 16 的倍数 ⇒ 不是 AES-CBC。

### §4.3 DES / 3DES（本仓库此前没有实现，B15 补上）

```js
var _params = b64_encode(des_encode(params));      // 青果教务 1108756
```

- DES 密钥 **8 字节**、3DES **24 字节**；CBC 的 IV 也是 8 字节。
- 填充口径有三档，**必须问清楚**：`pkcs7`（CryptoJS 默认）/ `zero`（数美等厂商常用，见
  `web-verify-patcher` 的厂商笔记）/ `none`（数据本身已是 8 的倍数）。
- `login_param_probe.py des` 的**默认动作是解密**（这一族的主用途），`--encrypt` 才反向。
- 期望值来自**独立实现**：`node --openssl-legacy-provider`（本机 Node 22 默认禁用 DES，
  必须加这个开关）。夹具见 `artifacts/skill-evolution/b15-run-20260922-1733/des-vectors.txt`。

### §4.4 RSA：三条必查

| 必查项 | 判据 | 实测 |
| --- | --- | --- |
| **公钥从哪来** | ① 硬编码在页面（全局搜 `key_to_encode` / `Pubkey`）② 前置接口下发（`getrsakey` 返回 `publickey_mod` / `publickey_exp`）③ 藏在另一个请求的 body 里 | `1111948` / `1522743` / `1627217`（**公钥地址在 `ajax.post` 的 `t.data` 里，且必须带 Referer**） |
| **是否每次刷新都变** | 刷新页面看 JS 文件本身变不变 | `1861004`：**js 加密函数每次刷新都不一样** ⇒ 必须「先请求页面拿函数与密钥，再算」 |
| **是不是真的 RSA** | **同一明文两次密文不同**（长度也可能变） | `2063774` 就是靠这一条判出来的 |

`rsa-pubkey` 的用法（纯 Python，无任何加密库）：

```bash
# JSEncrypt 形式的裸 base64 公钥
python $S/login_param_probe.py rsa-pubkey --b64 "<页面里的公钥>"
# 与接口下发的 mod/exp 逐值对拍（steam 式）
python $S/login_param_probe.py rsa-pubkey --b64 "<公钥>" --match-mod "<publickey_mod>" --match-exp "010001"
```

> 对拍不通过会打印 `match_mod False` 并以 exit 1 退出 —— **这是防止「公钥拿错了还在算」的唯一机械手段**。

### §4.5 RSA 登录参数的三个静默事实（B36 补，`52pojie-1853120`）

**事实一 · 加密点可能被裹在一段「假循环」里**

源文原样形态：

```js
jiami = function (password) {
    var e = 'password';                       // ← 常量，与下面循环无关
    var n = new JSEncrypt;
    n.setPublicKey("-----BEGIN PUBLIC KEY-----\n MIGf...");
    for (var s = 0; s < e.length; s++) {      // ← 循环 8 次
        var t = n.encrypt(password);          // ← 每次入参都是同一个 password
    }
    return t;                                 // ← 只有最后一次的值被返回
}
```

⇒ **判据**：**循环变量没有出现在 `encrypt(...)` 的实参里** ⇒ 这是**假循环**（每轮算同一个输入）。
**后果有两面**：

- **复现时不要照抄这个循环**：它做的是**同一件事做 N 遍**（`e.length` = 8 次），结果取最后一次；
- **对拍时不要拿「密文是否相等」当判据**：§4.4 已立「同一明文两次密文不同 ⇒ 真是 RSA」，
  这里再补一句 —— **PKCS#1 v1.5 的填充字节带随机**，所以这个循环的 **8 次结果互不相同**，
  只有最后一次被用。**「解出来对不上」先别怀疑算法，先怀疑你复现的是第几次的结果**。

**事实二 · 「公钥能对拍」不等于「这就是最终待提交的值」**

源文自述踩过：在某处下断 → 随便填账号密码登录 **失败** ⇒ 说明**断点那个位置不是生效路径**。
处置：**换关键词重搜**，直到断在一个「改了它、请求就变」的位置。
⇒ 与 §11 反例黑名单里「不要停在第一个长得像的函数上」同一条。

**事实三 · 关键字搜索要带「拼音 / 别名」候选（这一条最省时间）**

源文第一步搜 `password` 只找到一半，**第二步搜 `jiami` 才断成功**。
⇒ **判据**：国内站点把函数命名为 **`jiami`（加密）/ `jiemi`（解密）/ `mima`（密码）/ `yanzheng`（验证）**
是常态。**关键字搜索表**（按命中率）：

| 优先级 | 关键词 |
| --- | --- |
| 1 | **业务语义**：`password` / `pwd` / `passwd` / `encrypt` / `decrypt` |
| 2 | **拼音**：`jiami` / `jiemi` / `mima` / `yanzheng` / `denglu` |
| 3 | **库名**：`JSEncrypt` / `setPublicKey` / `CryptoJS` / `Aes` / `Sm4` |
| 4 | **调用形态**：`===BEGIN PUBLIC KEY===` 的开头 `-----BEGIN`（公钥字面量） |

> ⚠️ **口径**：拼音命名属**站点习惯**，不是通用规律；只作为「换一靶再试」的候选清单，
> **不要**因为搜到了就认定它是生效路径 —— 仍要按 §0 的口径做「改一处 ⇒ 请求变」的确认。

---

## §5 会话与前置：登录链路特有的三件事

1. **第一次 GET 的 Cookie 必须保存并携带**（`1217367`：服务器分发的标识，后续所有请求都带它）。
   用 `requests.Session()` / 会话对象，不要每步新建。
2. **`execution` / `csrf` / `formhash` 必须与本次会话配套**（`1980542`：CAS 的 `execution` 来自
   `bridgeData`；`536217`：`formhash` 在登录页源码里）。
   **它们和 Cookie 是绑定的** —— 拿 A 会话的 token 配 B 会话的 cookie 一定失败。
3. **加密用的盐 / 公钥可能来自「另一个接口」**（`1217367` 的带 `#` 字符串、`1522743` 的 `getrsakey`）。
   抓包时**只抓登录那一个包是不够的**：把登录前所有 XHR 都留着。

---

## §6 提交形态：明文输入框 + 隐藏字段（两段式）

这一族非常常见，**逆对了也算不对**，因为提交的不是你看到的那个字段：

```html
<input type="password" id="password" name="password">
<input type="hidden" id="passwordEnc" name="passwordEnc" value="">     <!-- 加密结果写这里 -->
<!-- 或 -->
<input name="encoded" id="encoded" type="hidden" value="">             <!-- 1217367 / 1421183 -->
```

```js
casLoginForm.submit(doLogin);
function doLogin() {
    ...
    _etd2(password.val(), casLoginForm.find("#pwdDefaultEncryptSalt").val());   // 加密 → 写隐藏字段
}
```

**判据**：抓包里出现**两个**密码相关字段（一个明文、一个密文），或提交的字段名与输入框 `name` 不一致。
**处置**：复算的密文要塞进**隐藏字段**，明文框可能根本不提交（或被置空）。

---

## §7 扣 JS 的四处固定修改

| 现象 | 原因 | 改法 | 来源 |
| --- | --- | --- | --- |
| 函数一进去就 `return`（返回空） | 有「密码为空直接返回」的**短路分支** | 删掉第一个 `if` | `536217` |
| 满屏 `arguments` 报错 | 用 `arguments` 枚举形参 | 删掉 `arguments` 相关行，改成显式形参 | `536217` |
| 报 `xxx is not defined` / `$.xxx = ` 出错 | 函数被挂在 jQuery / 全局对象上 | 删掉文件首末行，把 `$.base64 = ` 之类**改写成普通对象/直接调用** | `1266540` |
| 少 `o` / 少 `r` / 少函数 | 抠的是**调用链的一段** | **反复「少什么补什么」**，每次跑一次看下一个缺谁 | `1607798`（`o(r(e))`）、`1743808`（`r` 是字符串，控制台打印后直接写死） |

> ★ **不要一次抠完再跑**。这一族的 JS 深度嵌套（`1815692` 的 md5 套了 6~7 层），
> 「跑一次 → 补一个 → 再跑」比「一次抠全」快得多，且每次都能定位到具体缺哪个符号。

---

## §8 webpack 单文件：「外部拿不到局部变量」的两种打法

**症状**：`webpack` 打包成单文件，函数名被压成 `r` / `t` / `y`，从外部（控制台 / Node）**调用不到**。

| 打法 | 做法 | 来源 |
| --- | --- | --- |
| **JS 注入（推荐）** | 用 DevTools 的 `Overrides` / 「替换 JS」，在源码里加一行把函数挂到 `window`（`window.weiboLX = makeRequest`），刷新后从控制台调用 | `1783614` |
| **遍历导出表找下标** | 用替换 JS 拿到导出对象 → 遍历找「哪个下标的函数是解密函数」（实测输出 `62`）→ 把**加载器**一起搬出来在外部执行 + 补环境 | `1904594` |

**把浏览器当 oracle**：注入之后挂一个 WebSocket 客户端 / `fetch` 把入参送进页面、把结果送出来，
本地就不用补环境了。适用边界：**只要能稳定复现一次调用就划算**；要长期批量再回头扣代码
（与 `stream-drm-reverse/SKILL.md` 的「RPC 兜底」同一条思路）。

> 注意：`1783614` 的站点**JS 文件每小时重命名一次** ⇒ `Overrides` 的映射会失效，要重新保存。
> **判据：注入后过一段时间突然失效 ⇒ 先看文件名变没变。**

---

## §9 签名类（`Sign` / `X-Sign`）：先看「签的是哪几段」

实测最稳的一种（`1626143`）：

```js
function getParamsHash(cfg) {
  const url = new URL(cfg.url);
  const urlQueryString = url.searchParams.toString();
  let paramsQueryString = new URLSearchParams(cfg.params).toString();
  paramsQueryString = paramsQueryString.replace(/%2C/g, ',').replace('%3A', ':')
                                       .replace('%28', '(').replace('%29', ')');
  const queryString = [urlQueryString, paramsQueryString].filter(Boolean).join('&');
  const body = cfg.data ? JSON.stringify(cfg.data) : '';
  return md5(url.pathname + queryString + body).toString();
}
```

**四条必记**：

1. 签的是 **`pathname`（不含域名/协议）+ query + body** 三段拼接 —— **顺序不能换**。
2. **`URLSearchParams` 会把 `,` `:` `(` `)` 百分号编码**，而 JS 里做了一次**白名单还原**。
   Python 侧 `urlencode` 默认**不**还原这些 ⇒ 必须显式 `unquote` 这几个字符，否则签出来永远不对。
   （`urllib.parse.quote` 的 `safe` 参数要显式给 `",:()"`。）
3. `body` 是 `JSON.stringify` 的结果 —— **键序**要与页面一致（Python 的 `json.dumps` 保持插入序即可，
   但**空格**要留意：`JS` 的 `JSON.stringify` 无空格，Python 的默认 `', '` / `': '` 有空格 ⇒ 用 `separators=(',', ':')`）。
4. **多个登录入口可能共用同一套签名**（`1626143`：首页入口的 `X-Sign` 逻辑可以直接用到第二个入口）。

另一类（`1743808`）：`Sign = md5(<某个参数>)`，先 `initiator` 下断点 → **堆栈回溯**找变量来源
→ 再在那一行附近找 `md5`。**判据：断点停下的那一层 scope 里没有目标参数 ⇒ 往上一层层跟。**

---

## §10 「不报错但结果错」坑表

| 坑 | 症状 | 判据 / 修法 |
| --- | --- | --- |
| **`charCodeAt & 0xff` vs UTF-8** | 密码含非 ASCII 时算出的哈希与服务端不一致；**纯 ASCII 样本暴露不出** | `--encoding latin1/utf8` 两个都试；自检里有区分性断言 |
| **base64 密文被复制时截断** | 数据字符数 ≡ 1 (mod 4)，怎么补都解不出 | `classify` / `b64-probe` 会直接报「至少缺 3 个字符」 |
| **隐藏字段没写** | 密文算对了但登录失败 | 查提交字段名与输入框 `name` 是否一致（§6） |
| **盐/公钥是「上一次刷新」的** | 密文能算出来但服务端不认 | 盐/公钥/`execution` 必须与**本次会话**配套（§5） |
| **`urlencode` 没还原 `,:()`** | 签名永远不匹配 | §9 第 2 条 |
| **`JSON.stringify` 的空格** | 签名永远不匹配 | `separators=(',', ':')` |
| **CBC 只做了异或没做链** | 第一块对、后面全错 | 用「逐块等于 ECB + 前密文异或」做断言（`des --selftest` 自带） |
| **DES 填充口径猜错** | 解密抛填充错误 / 尾部多出 `\x00` | 三档 `pkcs7/zero/none` 逐个试；**报错比静默出垃圾好** |
| **AES 当 DES 解（或反之）** | 长度不是 16 的倍数却硬套 AES | 先看密文长度（§2 表） |
| **把「编码」当「加密」** | 白花时间找算法 | `su = base64(encodeURIComponent(...))` 这类先 unquote 看内容 |

---

## §11 反例黑名单（不要做的事）

- **不要只看长度就断言「这是裸 MD5」**：32 位 hex 也可能是 MD5 链的**外层**结果。先用 §3.2 的四种形态逐个试。
- **不要试图「算」服务器下发的字段**（`formhash` / `csrf` / `execution` / `uuid` / `token_id`）：它们在页面里。
- **不要在 `password` 字段上死磕，而忽略隐藏字段**：提交的可能根本不是它（§6）。
- **不要用「我本地算出来看着像」当验收**：唯一硬标准是**拿抓包的密文对拍**（`--verify`）+ 真的登录成功。
- **不要一次把 JS 全抠完**：反复「少什么补什么」（§7）。
- **不要假设「同一页面里的 md5 都是同一个口径」**：`charCodeAt & 0xff` 与 `CryptoJS.MD5` 混用是实测存在的。
- **不要用「公钥拿到了」当结论**：必须与接口下发的 `publickey_mod` / `publickey_exp` **逐值对拍**（§4.4）。
- **不要在 RSA 上用固定密文当 oracle**：RSA 每次加密结果都不同（随机填充）⇒
  验收口径是「**服务端能解密**」，不是「与上次密文相等」。
- **不要把 `h5Fingerprint` 这类风控字段当加密来逆**：它只是对 URL 做一次哈希（`1316664`），
  入参就是 POST 的完整 URL；**换了 URL 就得重算**，但不需要「理解」它。

---

## §12 复跑命令

```bash
S=.claude/skills/web-reverse-algorithm/scripts

# 0) 自检（RFC 1321 MD5 向量 / 文章原样 JS 实跑向量 / OpenSSL DES 向量 / 拒绝路径）
python $S/login_param_probe.py --selftest

# 1) 判族（把抓包里的密文原样贴进去）
python $S/login_param_probe.py classify --cipher "<密文>"
python $S/login_param_probe.py classify --cipher "cDt6MblySvQIt0kTLdTUpA==" --json

# 2) base64 载荷体检（看内层是文本 / gzip / 分组密码密文）
python $S/login_param_probe.py b64-probe --input "<base64 密文>" --json

# 3) MD5 链复算 + 与抓包对拍
python $S/login_param_probe.py md5-chain --preset bare --pwd "<明文>"
python $S/login_param_probe.py md5-chain --preset pwd-then-salt --pwd "<明文>" --salt "<验证码>"
python $S/login_param_probe.py md5-chain --preset nested-with-ts \
    --outer-prefix "@345Kie(873_dfbKe>d3<.d23432=" --inner-prefix "EW234@![#\$&]*{,OP}Kd^w349Op+-32_" \
    --pwd "123456" --ts "1690810935" --verify edca867125d5f76542c10e1cc4667969
#    ↑ 这条的期望值来自 52pojie-1815692 的**文章原样 JS 实跑**（见 b15-run 目录）

# 4) RSA 公钥解析与对拍
python $S/login_param_probe.py rsa-pubkey --b64 "<JSEncrypt 公钥>"
python $S/login_param_probe.py rsa-pubkey --pem pub.pem --match-mod "<mod>" --match-exp "010001"

# 5) DES / 3DES（默认解密）
python $S/login_param_probe.py des --input-b64 "<密文>" --key-hex 0123456789abcdef \
    --mode cbc --iv-hex 1234567890abcdef
python $S/login_param_probe.py des --input "<明文>" --key-hex <16位hex> --mode ecb --encrypt --json

# 6) AES / SM4 走相邻技能（不要在本技能重复实现）
python ../stream-drm-reverse/scripts/media_crypto.py aes-cbc --input seg.bin --out clear.bin \
    --key-hex <32位hex> --iv-hex <32位hex>
```

---

## §13 与其它文档 / 技能的边界

- **通用参数溯源三分类（固定 / 上次返回 / JS 计算）** → `07-antidebug-and-live-patching.md` §6
- **混合加密 / 分段 / 自描述密文的总纲** → `08-mixed-crypto-segmentation.md`
- **AES / SM4 / dcm 等分组密码实现** → `../../stream-drm-reverse/scripts/media_crypto.py`
- **key 被二次构造（不是 16 字节）** → `../../stream-drm-reverse/references/key-wrapper-families.md`
- **验证码 / 滑块 / 风控 Cookie** → `../../web-verify-patcher/SKILL.md`
- **补环境（`navigator is not defined` 等）** → `../../web-js-env-patcher/SKILL.md`
- **webpack 模块抠取与在 Node 里复用** → `../../webpack-bundle-extraction/SKILL.md`
- **纯二进制协议（TCP/UDP / PCAP / 自定义帧）** → `../../protocol-reverse/SKILL.md`
