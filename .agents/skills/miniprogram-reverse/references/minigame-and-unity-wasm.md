# 小游戏（含 Unity/WASM 与 Cocos）与帧协议：入口层权威源

> **来源（B27，2026-09-24）**：
> `52pojie-1150098`（《胡莱三国》WebSocket + MessagePack）、
> `52pojie-2081826`（wx 小游戏反编译，Cocos2d-JS + AES-CBC）、
> `52pojie-1936819`（Unity 导出的 vx 小游戏，IL2CPP → wasm 全链路）、
> `52pojie-901994`（消灭病毒 sign 双签名）、
> `52pojie-965556`（电影小程序 `check` + AES-ECB，含"弯道超车"调试法）、
> `52pojie-1775370`（token 构造求助帖：未证字段的定位与登记范式）、
> `52pojie-2058459`（欢乐麻将：响应体改写的边界）。
>
> **为什么单列**：`SKILL.md` 与另外三个 reference 讲的是**小程序**（`app.json` / `app-service.js` / 页面路由）。
> 小游戏是**另一个入口形态**：包里是 `game.json`、逻辑在 `game.js` 或 **wasm**、**没有 WXML/WXSS**。
> 用小程序那套"从 `app-service.js` 搜 URL 片段"的方法打小游戏，会**搜不到目标**（逻辑不在那儿）。
>
> 本文件只管**入口层与帧/协议层的判据**；`.jsc` 字节码形态在
> `../../desktop-client-reverse/references/jsc-and-v8-bytecode.md`（第三形态 Mozjs），
> 通用 wasm 技法（`wasm_split` / brotli / wat 补丁）在
> `../../wsam-reverse/references/wasm-toolchain-and-decompilation.md` §11。

---

## 0. 分流：先判"是哪一栈"，再决定读哪个文件

`unveilr` 跑完后**先看目录**（30 秒决定后面几小时的方向）：

| 目录特征 | 技术栈 | 逻辑在哪里 | 后续 |
| --- | --- | --- | --- |
| `game.js` + `cocos/` + `cocos2d-js-min.js` | **Cocos2d-JS 小游戏** | `game.js`（常常几千行但**可读**） | §1、§2 |
| `wasmcode/` + `wasmcode1/` + `*.unityweb` | **Unity IL2CPP → WASM 小游戏** | `wasmcode*/*.wasm` | §3（本技能）+ `wsam-reverse` §11 |
| `game.js` 里直接是业务逻辑、无引擎目录 | **原生 JS 小游戏** | `game.js` | 同小程序：搜 URL 片段 / 参数名 |
| 包内是 `app.json`、有 `pages/` | 不是小游戏 | — | 回 `SKILL.md` 主流程 |

**判据补充**：小游戏包里是 **`game.json`**（小程序是 `app.json`）；
两者共用 `wxapkg` 容器与 `unveilr` / `wxapkg_tool.py`，所以**容器层完全复用**，不需要新工具。

⚠️ **本技能的 `SKILL.md` 分流表里"小程序小游戏 / 存档数值 ⇒ MITM 改 JSON 即可"这条有前提**，
见 §7：**只有在服务端不权威时才成立**。

---

## 1. 把反编译出来的小游戏"跑起来"（`52pojie-2081826` 实录，6 个坑）

目标**不是"跑得对"，是"能下断点"** —— 资源缺失、排版错乱都可以忍。

| # | 报错/现象 | 处置 |
| --- | --- | --- |
| 1 | 解出来是 `app-config.json` | 手工改名为 **`game.json`** |
| 2 | `game.json` 里 `gamePlugins` 不被开发者工具认 | 字段改名为 **`plugins`** |
| 3 | 缺 `cocos2d-js-min.js` | 补一份放进 `cocos/` 目录 |
| 4 | **`md5 不一致`** | 报错提示里**自带期望的 md5** ⇒ 用它覆盖 `signature.json` 中的值 |
| 5 | `ERROR 4930`（Cocos 引擎报错，指向 `EngineErrorMap.md#4930`） | 多为图集/资源问题 ⇒ 定位到 `new Error` 处**注释掉**（代价：图片显示不出来） |
| 6 | 登录失败（`openid` 不对） | 用 Fiddler 抓到的登录响应**替换**（走代理），即可进游戏页 |

**顺序很关键**：4 必须在 5 之前（签名不过根本不进资源阶段）；
3 必须在 2 之后（字段名不对，插件目录不会被加载）。

> ⚠️ 坑 5 的"注释掉 `new Error`"是**来源的权宜做法**，代价是资源不可用。
> 它换来的是"能跑到业务逻辑"，属**探针式修复**，不要写进交付物。

---

## 2. 小游戏的请求加密：先搜 `encrypt`，不要读 `game.js` 全文

`52pojie-2081826` 的做法：
1. 先只改 **response**（AutoResponder）就能改金币/钻石 ⇒ 说明**客户端信任返回体**；
2. 想改"每局道具逻辑"才需要源码 ⇒ 搜关键词 **`encrypt`**，命中 `encryptStr` ⇒
   这是**所有接口的统一加解密入口**（这一条比"逐接口找"高效得多）；
3. 算法是 **AES-CBC**，key 常写成 `this.ddd` 这类字段 ⇒ 在同文件里搜**字段名**拿到字面量。

**判据**：小游戏里"所有接口都过同一个方法"是常态 ⇒
**先搜一个通用动词（`encrypt` / `sign` / `str2md5`），再顺它往下**，
比按接口逐个啃快一个数量级。

⚠️ 来源把代码交给 AI 辅助分析 —— 这只能**加速定位**，key 与模式**必须自己回源核对**
（见 `SKILL.md` 反例："不要读混淆常量表去找密钥"）。

---

## 3. Unity IL2CPP → vx 小游戏 → wasm（`52pojie-1936819` 全链路）

### 3.1 识别与取件

```bash
# 解包（unveilr 走 wxapkg，与小程序同一条路）
unveilr wx -f "D:\WeChat Files\WeChat Files\Applet\wxxxxxxx\34"
```

出现 `wasmcode/`、`wasmcode1/` ⇒ **Unity 项目转的小游戏**（来源同时说：从解包目录也能看出来）。

```bash
# .br 后缀 = brotli 压缩 ⇒ 先解压才拿到 wasm
brotli.exe -d "xxx.code.import.unityweb.br"
```

| 解压后原文件名 | 改名（来源做法） | 作用 |
| --- | --- | --- |
| `xxx.code.import.unityweb.wasm` | `import.wasm` | **动态调用偏移表**（§3.3 的关键） |
| `xxx.code.unityweb.wasm` | `main.wasm` | 主逻辑 |
| `wasmcode1/xxx.code.unityweb.wasm` | `sub.wasm` | 分包逻辑 |

三个一起拖进 **Ghidra**（来源注：IDA 的 wasm 插件"好像有点问题"）。
**但函数名会是一堆 `j2174` 之类 ⇒ 不能直接读，先做符号恢复。**

### 3.2 `global-metadata.dat` 不在包里 ⇒ 去缓存找

`Il2CppDumper.exe <executable-file> <global-metadata> <output-directory>` 是符号恢复的源头，
但它要的 `global-metadata.dat` **不在 wxapkg 里** —— 因为**它是远程下载的**。

⇒ **去小程序缓存目录找可疑的二进制文件**，再用 `unityweb.exe` 把它解析导出。
（这是"包内找不到就去运行时缓存找"的又一个实例，与 `SKILL.md` 的"包落点"同型。）

产出：`script.json`（含符号信息）+ dummy dll。

### 3.3 🔴 Unity-wasm 的关键差异：函数名要**重算**，不能直接用 `script.json` 里的地址

来源实测：`ghidra_wasm.py` 的现成脚本**不适合 vx 小游戏**，因为
**动态调用的偏移存放在 `import.wasm` 里**。所以 `script.json` 的 `Address` **不是** wasm 里的函数名。

做法（来源给的 `restore.js`）：**核心只有一行** ——

```js
// getRedirIndex 就是对 import.wasm 的导出 `wasm_split.__wasm_split_getRedirIndex` 取 & 0xFFFFFFF
item.FuntionName = `j${getRedirIndex(item.Address)}`
```

🔴 **完整代码块、索引掩码（`268435455`）与「为什么必须重算」的推导，权威源在**
`../../wsam-reverse/references/wasm-toolchain-and-decompilation.md` **§11.2** ——
本文件不复制它（同一份知识写两处必然分叉，B20 教训）。

**推广**：凡"包被 `wasm_split` 拆成 import + main"的产物，
**符号名要经 `__wasm_split_getRedirIndex` 重定向**，`& 0xFFFFFFF` 是**索引掩码**。
直接把 dump 工具给的地址当函数名搜，**永远搜不到**（这条是本批最有价值的单点结论）。

随后魔改 `ghidra_wasm.py`：拿 `scriptMethod['FuntionName']`（即 `jXXXX`）去 `symbolTable` 里找函数、
用 `getPlateComment()` 做**幂等守卫**（已改过就跳过）、`set_name` + `setPlateComment` 写入原名与签名、
再按 `Signature` 恢复参数名（`restore_params`，参数名重复时加数字后缀）。
来源评价：**"不能完全正确，但大致没问题，大大提升分析效率"**（→ 属**启发式**，不是精确还原）。

### 3.4 定位与调试

1. **静态定位**：在 ILSpy 里打开 dummy dll 找目标方法（如 `PlaySkill`）→
   在 Ghidra 搜 **`类名$$方法`**（如 `SkillCaster$$PlaySkill`）⇒ 注释里会带 `j2174`。
2. **运行时定位**：开**小程序的 devtools**，用 `j2174` 在 wasm 里搜。
3. **改内存**：下**日志断点**，实时改内存数值。
   ⚠️ 来源提醒：**可能有内存检查（小心封号）**。
4. **持久化**（来源自述**"我还没测试，但是我感觉可行"** ⇒ 属**未证**）：
   `wasm2wat` → 改 WAT → `wat2wasm` 写回。示例把 `i32.const 0` 改成 `1`，运行后确实从 0 变 1。
   ⚠️ 同一篇又提醒：**里面可能有 md5 校验** —— 即"改完要能过完整性校验"这一步**来源未给**。

> **口径**：3.4 的第 4 步在本仓登记为 **未证**（来源自己说没测），
> 不要把它写成"可行方案"；引用时应带"来源未验证 + 可能有 md5 校验"两个限定。

### 3.5 常用工具链（来源原样保留）

`unveilr`（解包）· `brotli.exe`（解 `.br`）· `Ghidra` + `ghidra-wasm-plugin`（反编译）·
`Il2CppDumper`（符号恢复）· `ILSpy`（读 dummy dll 的结构与字段偏移）· `wabt`（`wasm2wat`/`wat2wasm`）·
`unityweb.exe`（解析缓存的 `global-metadata.dat`）。

---

## 4. 帧协议：WebSocket + MessagePack（`52pojie-1150098`）

**判据**：抓到的 WS 帧"**不是 JSON**"，也不是可读文本 ⇒ 先猜 **MessagePack**（而不是先猜加密）。

```python
pip install msgpack
# 服务端 → 客户端（收）：
arr = msgpack.loads(frame_after_unmask)   # 来源写作 "msgpack.loads() 解密 / dumps() 加密"
```

⚠️ **两个必须自己补的细节（来源没写清，本仓按协议事实登记）**：

1. **客户端 → 服务端的帧带 4 字节 mask**：来源明写"**接受的数据需要先去掉前面的 mask**"。
   即解包前要先按 RFC 6455 去掉 mask 头（客户端帧的 payload 是异或过的）。
2. `loads` = 解、`dumps` = 编（来源把二者写成"加密/解密"，是**口语化说法**，不是加密算法）。

实时改包：**mitmproxy**（来源用的就是它）。

### ⚠️ 这一族的"死路判据"（比算法更重要）

来源最后给了一条结论：

> **"发送的数据全是你的操作代码，不附带任何数据。所有的数据计算及保存都在服务器上。"**

⇒ 这是**纯操作码协议**：本地改包**改不出任何收益**，因为客户端从不发送权威数值。
**判据**：解出帧后，若客户端帧里只有动作 ID/序号、没有业务数值，就**当场停止**，
不要在客户端找"改哪里"（与服务端权威同型，见 §7）。

---

## 5. `sign` / `check` 的两族还原（`52pojie-901994` + `52pojie-965556`）

### 5.1 族一：参数名升序拼接 + MD5（`901994`，消灭病毒）

```js
// 原文（语义已核对）：先把键收集、排序，再 "k=v&" 拼接，去尾 & 后 MD5
e.sort(function (t, e) { return t > e ? 1 : t < e ? -1 : 0 })
for (n in e) i += (s = e[n]) + "=" + t[s] + "&"
document.write($.md5(i.substring(0, i.length - 1)))
```

| 要点 | 值（原文） |
| --- | --- |
| 参与签名的键 | `plat` / `time` / `openid` / **`wx_appid`** / **`wx_secret`** |
| 分隔符 | `&`，**末位 `&` 要去掉** |
| 排序 | **参数名升序**（字典序） |
| 算法 | MD5（hex 小写 32 位） |

**两条容易漏的**：

1. **`wx_secret` 参与签名** —— 前端内置的密钥会出现在签名串里。
   ⇒ 逆向时它是最容易漏掉的一项（"参数都在 body 里"的直觉会把它漏掉）。
2. **同一个站有**两处**签名**：`/api/archive/get`（取用户信息）与 `/api/archive/upload`（改用户信息）。
   两处的 `t` 对象**键集合不同**（后者多一个巨大的 `record`），
   所以**必须按接口分别还原**，不能"还原一个当通用"。
3. **返回体里的 `record` 自带一个内层 `sign` 字段**（`"sign":"e63a0b8b…"`）——
   它是**记录级**签名，与外层请求签名不是一回事。改 `record` 内容时**不要把它一起改掉**
   （它是原样回传的），但外层签名要**按改后的 `record` 重算**。

### 5.2 族二：固定前缀 + 密钥 + 时间戳 + 完整 URL（`965556`，电影小程序）

由断点实测（不是猜）确定：

```
check = MD5( sCode + cCode + key + ts + 请求末尾完整 url )
```

| 项 | 值/来源 |
| --- | --- |
| 拼接顺序 | `sCode + cCode + key + ts + 完整请求 URL（含 query）` |
| `sCode` / `cCode` | 字面量（`Wanda` / `XIAOCHENGXUGP`） |
| `key` | 形如 `4906B2***`，来源**调了几次才看到它的产生** |
| `ts` | 13 位毫秒时间戳，与 `check` **同步变化** |
| **`_mi_` 是否参与** | **不参与**。判据：按上式算出的 `check` 与调试值**逐字符相同** ⇒ 反证 `_mi_` 不在其中 |

**"完整 URL"这一条是弯道超车的产物**：来源先以为是"未知参数"，最后发现
**就是请求末尾的完整 url**（`/user/apply_verify_img_code.api` + 后面的 query）。
⇒ 遇到"参数拼不齐"时，**先假设它是 URL 本身**（这条在多个站上都成立）。

### 5.3 🔴 弯道超车法：不知道在哪断 ⇒ 整个文件全行断点

来源不会 JS、`app-service.js` 格式化后近 4 万行且**多个文件含相同代码块** ⇒ 改走调试：

1. 用**微信开发者工具**导入解包工程（`AppID` 选**测试号**）；
2. 编译报错 ⇒ **把 `app.json` 里报错的项直接去掉**（来源原话）；
3. **勾上"不校验合法域名/https 证书"**（否则跑不下去）；
4. 界面残缺没关系，**点一次目标操作**；
5. **把候选文件（如 `MxApiHelper.js`，仅 100 行）整文件逐行下断点**；
6. 断下后看**"即将被 MD5 的那个变量"** —— 那就是明文拼接串。

**为什么有效**：sign 类代码的难点不是算法（就是 MD5），而是**"到底拼了哪些字段、什么顺序"**。
逐行断点把这个问题变成"看一眼变量值"。
⇒ **"不知道在哪下断点"的正解是"全下"**，而不是继续读代码。

### 5.4 输出编码判据：**没有 `==` ⇒ 不是 base64**

来源对 `card_no` / `password`（64 位 / 32 位）的定性推理，值得直接复用：

> 输出**是纯小写字母和数字**、**没有 base64 的 `==` 标志** ⇒ 是 **hex**。

（同时定性出：**AES / ECB / Pkcs7**。）

### 5.5 密钥"二次复用"（`965556`）

```js
n = t.default.clientKey.substr(0, 16)   // 密码 = clientKey 的前 16 位
```

**同一个 `clientKey` 既做请求签名的 key、又做 AES 的 key（截前 16 位）** ⇒
在某个站上"看到一个 key、另一个算法找不到 key"时，**先回去复用它**，不要急着爆破。

**验证姿势**（来源做法，很值得抄）：把明文填成 `123456`，抓包拿到密文 `d48a93104ebcb43196ec847f60ef2cb2`，
再用**在线 AES 逐个组合撞**（模式 / 填充 / 字符集）—— 用**已知明文密文对**筛参数，
比"读完代码再实现"快且不会自欺。

### 5.6 抓包前置：安卓 7.0+ 的 CA 信任问题（`965556`）

- 现象：小程序 https 抓包直接 **`ssl handshake error`**。
- 原因：**Android Nougat(7.0) 起，自签 CA 默认不被应用信任**（network security config）。
- 处置：HttpCanary 官方仓库给了几种绕过方式；或**直接换 Burp Suite**（需电脑 + 提前配置）。
- 来源另给了一条**包落点**细节（安卓 7 时代）：
  `/data/data/com.tencent.mm/MicroMsg/…/appbrand/pkg/`，
  中间那层是 **32 位十六进制命名的目录**；**分不清哪个是目标时，全删 → 重新添加小程序 → 看新建目录**。
  （⇒ 与 `SKILL.md` 的"全删再打开"定位法同一条，设备/平台不同而已。）

---

## 6. 未证字段怎么登记：`t` 定位法（`52pojie-1775370` 求助帖）

这一篇**没有解出答案**，但它的价值在**失败模式与定位手段**：

| 已确知 | 值 |
| --- | --- |
| token 结构 | `"consumer=".concat("188880000002","&timestamp=").concat(u,"&nonce=").concat(c,"&sign=").concat(a,"&tenantId=").concat(o,"&cid=").concat(e,"&openId=").concat(r,"&v=20211030")` |
| `sign` 公式 | `MD5("188880000002" + c + u + "bbd2b25e7a8b4d94a8cc167ba2f27edd" + o + e + r + t)` |
| 固定值 | `tenantId=13474`、`cid=ca975b725998428480600f1baf3bda18`、`openId=o5oC55QBHtF_862zWbo5F5JC-iiI`、`v=20211030` |
| 防重放 | `timestamp` / `nonce`（32 位随机）/ `sign` **缺一不可** |
| **未解** | **`t`** |

**定位手段（可复用）**：

1. 代码在 `app-service.js` 的**第 20676 行**（`unveilr` 只提取、不能反编译 ⇒ **按行号直接看**即可）；
2. 第 **20733** 行有 `globalData` 定义 `t` 的**一长串结构** ⇒ 这是唯一线索；
3. 已排除的候选（来源实测）：**空值 / `1` / `0` / `20211030` 都不对**。

> **本仓登记口径（范式）**：来源未解的字段，**登记为"未证"**，
> 同时写清 **① 已排除的候选**、**② 下一步可跑的实验**（在第 20733 行的定义处下断点 / 插桩输出 `t`）。
> **不允许**用"看起来像"的猜测值填进去 —— 这比留空更危险（会把错误固化进交付物）。
> 参考 `web-malware-forensics` 的同类范式（`alpha2` / `US-ASCII` 的"未证 + 证伪实验"）。

**反例**：不要用"猜参数"代替"定位定义处"。本例中 `t` 的定义就在**另一个行号里**，
搜变量名可能被压缩后的单字符名淹没 ⇒ **行号 + `globalData`/`Page(`/`Component(` 这类结构性关键字**更可靠。

---

## 7. 响应体改写的边界：什么时候"改了会被覆盖"（`52pojie-2058459`）

**可以做**（来源全程只改 response，未碰包）：
地图数据、关卡 id、钞票余额 —— 都在**返回体**里 ⇒ MITM / AutoResponder 改 JSON 即可。

**但有边界**，且来源**亲手撞上了**：

> 改完余额**买完豪车后又被重置成真实余额**；而"购买"这个动作**自己也会返回一份数据**，
> 里面同样带余额 ⇒ 盘它。

⇒ **判据**：

| 现象 | 含义 | 处置 |
| --- | --- | --- |
| 改完立刻生效、之后不再触发服务端写操作 | 纯显示层 / 本地缓存 | 改 response 即可，收工 |
| 改完生效，但**做一次"服务端写操作"后被覆盖** | **服务端权威**，客户端只是镜像 | 要改就得**把每个会回写状态的响应都改**（通常是"操作完成"那一类的返回） |
| 客户端帧里**只有动作码、没有数值** | 纯操作码协议（§4） | 客户端无解，**当场停** |

**为什么值得单列**：这条把"小游戏改数值"从"一句话结论"变成**三步判据**，
避免下一个人改完一个响应就以为成功了（**症状是"过一会儿又变回去"，极难归因**）。

---

## 8. 排错表

| 现象 | 原因 | 处置 |
| --- | --- | --- |
| `unveilr` 扫完目录里有 `wasmcode/` | 是 Unity 小游戏，逻辑不在 JS 里 | 走 §3，别在 `game.js` 里找 |
| `.wasm` 打不开 / 头不对 | 它是 **brotli 压缩的 `.br`** | `brotli.exe -d` |
| Ghidra 里全是 `j2174` 之类 | 缺符号恢复 | §3.3：`script.json` 的地址**要经 `import.wasm` 重算** |
| 按 `script.json` 的地址搜函数**搜不到** | 该产物是 `wasm_split` 拆分型 | 同上；名字是 `j${getRedirIndex(addr) & 0xFFFFFFF}` |
| 找不到 `global-metadata.dat` | 它**不在包里**，是远程下发的 | 去小程序缓存找二进制 + `unityweb.exe` 解析 |
| 开发者工具报 `md5 不一致` | `signature.json` 与实际文件不符 | **用报错里的 md5 覆盖** |
| 报 `ERROR 4930` | Cocos 图集/资源问题 | 定位 `new Error` 处注释（**权宜，会丢图**） |
| 小程序 https 抓包 `ssl handshake error` | 安卓 7.0+ 不信任自签 CA | §5.6；或换 PC 端抓 / Burp |
| 分不清哪个 32 位十六进制目录是目标 | — | **全删 + 重新添加小程序 + 看新建目录** |
| WS 帧不是 JSON 也不是可读文本 | 可能是 MessagePack | `msgpack.loads()`；**收帧先去掉 mask** |
| 改了余额，过一会儿又变回去 | 服务端权威，被写操作覆盖 | §7，改"操作完成"类返回 |
| 客户端帧里只有动作码 | 纯操作码协议 | 客户端无解，转服务端侧 |
| `check` 拼不齐 | 可能"未知参数"就是**完整 URL** | §5.2 先试 URL |

---

## 9. 反例（不要做）

- **不要拿小程序的搜法打小游戏。** 小游戏没有 `app-service.js` 路由那套；搜 URL 片段会一无所获，改用 §0 的分流表。
- **不要在 `game.js` 里逐行读加密。** 先搜 `encrypt` / `sign` 这类**通用动词**命中统一入口，再顺它往下。
- **不要把 `msgpack.loads` 当"解密"。** 它是反序列化；协议里若真加密，`loads` 会直接抛。
- **不要漏掉帧的 mask。** 客户端 → 服务端的 WS 帧带 mask，不去掉就解不出结构。
- **不要以为"改了响应就成功了"。** 先做一次服务端写操作再复查（§7），否则"过一会儿又变回去"会让你查错方向。
- **不要把"来源自己说没测"的步骤写成可行方案。** §3.4 的 WAT 补丁持久化 + md5 校验即属此类。
- **不要用 `script.json` 的地址直接当 wasm 函数名。** 拆分产物必须经 `__wasm_split_getRedirIndex` 重定向。
- **不要在未证字段上填猜测值。** 留"未证 + 已排除候选 + 下一步实验"，比填一个"看起来像"的数负责得多。
- **不要把"注释掉 `new Error`"当交付修复。** 它只是让流程跑到业务逻辑的探针手段，会丢资源。
- **不要以为一个 sign 还原就能通吃所有接口。** 同站不同接口的**参与字段集合不同**（§5.1），必须逐个还原。
- **不要漏 `wx_secret` / `clientKey` 这类"前端内置密钥"。** 它们常常既参与签名、又被复用作加密 key。

---

## 10. 与其它技能的边界

- **通用 wasm 技法**（`wasm_split` 重定向、brotli、`wasm2wat` 级补丁、IL2CPP 符号恢复的通用面）
  → `wsam-reverse`（本文件只给"小游戏侧怎么走到那儿"）。
- **`.jsc` 三类形态**（Cocos xxtea / V8 字节码 / **Mozjs（SpiderMonkey）字节码**）
  → `../../desktop-client-reverse/references/jsc-and-v8-bytecode.md`。
- **请求签名与加密的通用打法**（阻塞点排查、纯算还原顺序、CryptoJS 的 Hook）
  → `web-reverse-algorithm` / `web-reverse-hook`。
- **把小程序 JS 搬进 Node 复现（补 `wx.*` / `getApp()` 宿主对象）** → `web-js-env-patcher`。
