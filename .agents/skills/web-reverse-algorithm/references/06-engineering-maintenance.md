# 工程化、GitHub 吸收与扩库维护

## 一、把逆向结果做成接口，而不是只做成笔记

优先把结果收敛为这些接口：

- `build_context(input)`
- `build_payload(ctx)`
- `sign_payload(payload, ctx)`
- `solve(ctx)`
- `validate(browser_checkpoints, local_checkpoints)`

## 二、GitHub 项目最值得学什么

真正值得吸收的不是“又一个能跑的脚本”，而是：

1. 最小输入集合怎么定义
2. 算法层、环境层、请求层怎么分模块
3. 哪些检查点要暴露给调用方
4. 失败如何分类成环境问题、参数问题、版本问题

## 三、国外工程化思路要补的 5 个意识

1. 模块化
2. 版本意识
3. 输入边界意识
4. 中间检查点意识
5. 失败诊断意识

## 四、推荐的项目层次

```text
context/
payload builder/
crypto or vm layer/
env patch/
validation/
service or sdk/
```

## 五、吸收来源时的记录模板

每条来源或每个仓库，至少记：

1. 主落点
2. 补充落点
3. 备注
4. 题型
5. 输入集合
6. 输出集合
7. 关键脚本文件
8. 最值得学习的结构

## 六、案例与来源的标签化

建议使用：

- `header-sign`
- `cookie-sign`
- `response-decrypt`
- `captcha`
- `vmp`
- `jsvmp`
- `wasm`
- `protobuf`
- `websocket`
- `env`
- `fingerprint`
- `ast`
- `solver`
- `sdk`
- `service`

## 七、扩库时的固定栏目

每篇新案例文档尽量保留：

1. 来源
2. 请求链
3. 关键字段
4. 入口定位
5. 代码骨架
6. 中间检查点
7. 易错点

## 八、推荐从 GitHub 项目抄的文件角色

- `sign.py / xbogus.js`：算法层
- `get_fingerprint.js`：环境采集层
- `deobfuscate.js`：前处理层
- `solve.py`：求解层
- `server.py / __main__.py`：服务封装层

## 九、版本变化时先改哪里

优先排查：

1. 输入边界有没有变化
2. 页面态参数或 load 返回对象有没有变化
3. 中间 payload 结构有没有变化
4. 只是编码层变了，还是 builder 逻辑变了
5. 环境字段是变成强校验了，还是仍然可写死

## 十、文档和代码的最终目标

目标不是“再多收集一篇文章”，而是让每次新增资料都能补到下面这条能力闭环：

```text
请求链定位
-> 算法或 builder 还原
-> 中间检查点对齐
-> 环境与协议边界确认
-> 本地复现
-> solver / SDK / 服务化
```

## 十一、扣 JS → Node CLI 桥接（Python 主控时的最快路径）

当加密函数**扣出来就能跑**（没有环境检测、不依赖 `window`/`document`），不要在 Python 里重写算法 ——
直接做一层 Node CLI 桥接，把 JS 当黑盒函数用。这是"还原成本最低、保真度最高"的一档。

### 11.1 三段式结构

```js
// 扣出来的单文件：缺什么函数就继续往里贴，贴到 node 不报错为止
var do_type = process.argv[2];                       // ① 用 argv 切加/解密两个方向
if (do_type === 'ENCODE') {
  console.log(_0x3c4b2e(process.argv[3], 'ENCODE', process.argv[4], 0));
} else {
  console.log(_0x3c4b2e(process.argv[3], 'DECODE', process.argv[4]));
}
```

```python
# Python 侧只做进程调用，不关心内部算法
nodejs = os.popen(f'node attakids ENCODE {sig} {salt}')
sig = nodejs.read().replace('\n', '')            # ② 必须 strip：stdout 带换行
nodejs.close()
```

**为什么要留 DESC 分支**：响应体往往也是同一个函数解出来的（本题的 `url` 字段就是加密返回的），
一个双模式脚本能同时覆盖请求加密与响应解密，不用写两份。

### 11.2 三个必踩的坑

1. **stdout 换行**：`console.log` 会加 `\n`，不 strip 会污染参数。
2. **自定义 base64 变体**：站点常把 `+ / =` 换成 URL 安全字符，**加解密两个方向都要对称变换**：

   ```python
   # 加密方向（本地算完再发出去）
   sig = sig.replace('+', '-').replace('/', '_').replace('=', '.')
   # 解密方向（收到密文先换回来）
   enc = enc.replace('-', '+').replace('_', '/').replace('.', '=')
   ```

   漏掉任何一半都会表现为"算法看起来对但结果不同"。
3. **常量从源码里正则取**：目标页把常量直接写在 HTML 内联脚本里时，不要手抄，
   用正则提（`(?<=var Key = ").+?(?=")`），脚本换代时自动跟着变。

### 11.3 路线选择（三档成本）

| 路线 | 适用 | 成本 | 保真度 |
| --- | --- | --- | --- |
| 扣代码 + Node CLI | 无环境检测、纯计算 | 最低 | 最高（原函数） |
| **打包产物抠取 + Node CLI** | 扣出来是 webpack 模块、`.call of undefined` 补不完 | 中 | 最高（原函数） |
| 补环境（`web-js-env-patcher`） | 依赖 `window`/`document`/`navigator` | 中 | 高 |
| 纯算重写 | 要脱离 Node 部署、要批量化 | 最高 | 需逐参数对齐 |

**判断依据**：扣完跑一次，若报的是"某函数 is not defined"⇒ 继续贴代码（仍在第一档）；
若报的是"`Cannot read property 'call' of undefined`"⇒ **不是缺环境，是模块闭包不完整**，
转 `../../webpack-bundle-extraction/SKILL.md`（`closure` / `wrap` 会把缺的模块 id 列出来）；
若报的是"`document` is not defined"或结果随环境变 ⇒ 转补环境。

**为什么单列一行**：打包产物这一档，算法往往**本来就是标准算法**（AES/RSA/MD5 一通），
真正的成本全在「把模块抠全」上。把它误判成"环境问题"去补环境，会白跑很久。

## 十二、用真实密文做第一道 oracle（离线复现前置习惯）

**在写任何加密逻辑之前，先做这一步**：把抓包里真实出现过的密文**解密成功一次**。
解密成功会一次性锁死 算法/模式/Key/IV/填充/编码 五件事；不先做这步就开始"加密方向"试错，
最常见的后果是密文能生成但服务端不认，而且看不出错在哪。

顺序固定为：**读密文 → 解密 → 看明文结构 → 再写加密**。

### 12.1 从密文长度反推明文长度（零成本交叉验证）

**适用范围：分组密码 + PKCS7 填充（如 AES-CBC/ECB）**。流密码、CTR/GCM、无填充模式下
密文长度等于明文长度，下表的推演不成立 —— 先确认模式，再用这张表。

| 观察 | 结论 |
| --- | --- |
| Base64 长 `L` → 字节数 `B = L / 4 × 3 − 尾部 '=' 个数` | CBC 密文必为 16 的整数倍 |
| 明文 ∈ `(B − 16, B]`（PKCS7 至少补 1 字节） | 明文长度落在哪个区间 |
| Base64 含 `+` `/` `=` | 提交时必须 URL 编码（`+`→`%2B`、`/`→`%2F`、`=`→`%3D`） |

**实用推论**：`Content-Length` 可以反推请求体到底有几个字段。
若 `Content-Length −(参数名 + '=')` 等于"Base64 串 URL 编码后的长度"，就说明**请求体只有这一个参数**
（不存在额外的 token / 签名 / 时间戳字段）。这比逐个删参数试要快得多。

### 12.2 技术栈与部署指纹（可选的旁证）

只有当算法还原卡住时，才用这几个弱信号辅助判断，别当成结论：
响应头里的 `server: nginx` + `x-cache: BYPASS` 说明前面挂了 CDN 但缓存层不参与业务校验；
`X-Firefox-Spdy: h2` 表示抓包是从 Firefox 导出的（不是 Chrome）；
若泄露的技术栈里有 Python 特征，则该站算法多半照抄 JS 原文，纯算还原难度偏低。

### 12.3 `application/x-www-form-urlencoded` 下的 JSON 明文

服务器按表单接收、但业务体是 JSON 的形态很常见（`encrypted=<Base64>`）。
此时**明文的序列化方式必须与 `JSON.stringify` 逐字节一致**：

- 键之间**无空格** ⇒ `json.dumps(..., separators=(",", ":"))`；
- 值若在 JS 里是数字，Python 若传 `str` 会**改变字节**，务必对齐类型；
- `timestamp` 是 13 位毫秒，不是秒。

### 12.4 检验清单

| # | 检查 | 通过标准 |
| --- | --- | --- |
| 1 | 抓包密文能解出可读明文 | ✅ 解密方向验证通过 |
| 2 | 密文长度与明文长度符合 11.1 的表 | ✅ 参数集猜对了 |
| 3 | 本地"加密同一明文"的密文与抓包**逐字节相同**（固定 Key/IV 场景） | ✅ 加密方向验证通过 |
| 4 | 明文序列化用 `separators=(",",":")` | ✅ 无多余空格 |
| 5 | 提交前做 URL 编码 | ✅ 服务端不报格式错 |

第 3 条是最强的验证：**固定 Key + 固定 IV 的 CBC（纯前端可逆）** 下，
相同明文必然得到相同密文。如果不一致，一定是 Key/IV/模式/填充/编码有一处抄错了。
反之，若站点每次密文都不同，说明 IV 或盐参与了随机 —— 那就退回到"解方向验证"即可。

### 12.5 常见的「非算法」扣分项

密文完美、算法完全正确但**仍然提交失败**时，按这个顺序排查（都在算法之外）：

1. **时间戳新鲜度**：`timestamp` 打进密文时，服务端会校验与服务器时间差 ⇒ 不能复用旧密文；
2. **前端限流**：站点可能用 `now - lastSubmit > 5000` 之类的前端判定拒绝高频提交
   （前端限流通常只影响操作节奏，不影响算法本身，但会让"偶发失败"看起来像算法问题）；
3. **动态 token**：站点可能另有 `generateToken()` 随请求提交，其内容由时间派生
   （**仅作示例**：某站用「东八区时间的 年 ×(月+日) + 日 × 时 × 分」得到一个整数）。
   这类 token **每分钟变**，反推时要固定"取时间的那一行"再算，否则会误以为算法随机。
   具体公式因站而异，**不要照搬**，要按目标站的实现读出来。
4. **固定 IV 的伪防护**：Key/IV 都写死在 JS 里时，`IV` 形同虚设（相同明文 → 相同密文），
   不要因为"有 IV"就以为有随机性。

> 与 `07-antidebug-and-live-patching.md` 的分工：本文件讲的是**离线编码前先验证解密方向**；
> 07 讲的是**在线把"解密→反混淆→再加密"的结果回写页面**。两者是不同动作，不要混用。

---

## 十三、JS 侧编码库与 Python 标准库的「字节级差异」

参数里出现 **gzip / deflate / base64url** 这类纯编码（不是加密）时，最容易出现
「逻辑完全正确、但字节对不上」——因为两边用的**不是同一个实现**。
判据：长度一致、解出来内容一致，但逐字节 diff 有差异 ⇒ 一定是头部字段或填充策略不同。

### 13.1 gzip：JS 的 `fflate` vs Python 的 `gzip`

`fflate` 无参压缩时写入的是 **Unix 秒级 mtime + OS=3**，
而 Python `gzip` 模块默认的 mtime/OS 与它不同。要**逐字节对拍**时必须自己拼头尾：

```python
import zlib, struct, time
data = b'{"a":1}'
co = zlib.compressobj(6, zlib.DEFLATED, -15)            # 原始 deflate，level 6
body = co.compress(data) + co.flush()
header = b"\x1f\x8b\x08\x00" + struct.pack("<I", int(time.time())) + b"\x00\x03"
tail = struct.pack("<II", zlib.crc32(data) & 0xFFFFFFFF, len(data))
gzip_bytes = header + body + tail                        # fflate 等价输出
```

**只是解压分析的话不用管**：gzip 解压端不校验 mtime/OS，`gzip.decompress` 直接能用。
只有「本地生成 → 与浏览器逐字节比对」时才需要对齐。

### 13.2 base64url：无填充是常态

`-` / `_` 替 `+` / `/`、**去掉 `=` 填充**，是浏览器端 `btoa` 变体与 URL 安全编码的默认形态。
Python 侧对应：

```python
base64.urlsafe_b64encode(b).rstrip(b"=")      # 编码
base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))   # 解码（补回填充）
```

**判据**：字符串里出现 `-` 或 `_`、且长度不是 4 的倍数 ⇒ 就是 base64url 无填充，
不要先当"自定义码表"去解（那是另一类，见 `08-mixed-crypto-segmentation.md` §四）。

### 13.3 通用的「先对拍、再下结论」习惯

纯编码段的验证成本极低，务必做：

| 段 | 验证方式 |
| --- | --- |
| gzip / deflate | 解压后内容一致即可；要逐字节一致才拼头尾 |
| base64 / base64url | 解码后字节一致；再确认填充与字符表 |
| 紧凑 JSON | `separators=(",",":")` + `ensure_ascii=False`，字段顺序按站点原样 |
| 浮点数 | JS 的 `toFixed(n)` 与 Python 的 `f"{x:.nf}"` 在四舍五入边界上可能不同，需要时按位对齐 |

> 这类差异**不会报错**，只会让「签名不匹配」看起来像算法问题。
> 遇到"逻辑都对但服务端不认"时，先把纯编码段逐字节 diff 一遍。