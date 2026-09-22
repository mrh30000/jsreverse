# 算法家族与站点模式

## 一、标准签名题

### 统一结构

```text
request params
-> normalize / stringify / sort
-> inject token / timestamp / cookie / ua
-> hash / encrypt
-> final sign
```

### 高频站点模式

#### 财联社

- 典型链：`query string -> SHA1 -> MD5`
- 真正难点：参数排序、URL 编码、query string 一致性

#### 百度翻译

- `token` 来自页面
- `sign` 来自前端函数
- 典型价值：页面态参数与 JS 纯算参数分离

#### 有道翻译

- 请求签名：`client + mysticTime + product + key -> MD5`
- 响应侧还存在固定 seed 派生的 `AES-CBC` 解密
- 典型价值：同题同时训练请求签名和响应解包

#### 淘宝 H5

- 典型链：`token&t&appKey&data -> MD5`
- 真正难点：token 提取、`t` 一致性、紧凑 JSON

## 二、混合加密题

### 统一结构

```text
明文
-> 对称加密
-> 对称加密或再次包装
-> 编码
-> params

随机 key
-> reverse / transform
-> RSA / SM2
-> encSecKey / signature
```

> **动加密之前，先做"解方向验证"**：把抓包里真实出现过的密文解密成功一次，
> 一次性锁死 算法/模式/Key/IV/填充/编码。顺序是「读密文 → 解密 → 看明文结构 → 再写加密」，
> 不要反着来。长度反推、`Content-Length` 反推字段数、固定 Key/IV 的逐字节复现等技巧见
> `06-engineering-maintenance.md` §12。
>
> **骨架的通用推演法、分段定界、变体对照与 PoW 归约，见 `08-mixed-crypto-segmentation.md`**
> （从密文长度/字符集黑盒推出「前段密文 + 后段被加密的密钥」结构，再分工定位）。
> 那一份是新写这类题时的**第一份**要读的文档；本节只保留站点速查。

#### 网易云音乐

- 双层 AES-CBC + RSA
- 重点不是入口，而是“业务数据”和“密钥包装”分层

#### 极验 v3 `w`（RSA 包 AES 密钥）

`w` 是这一类题最干净的样本，结构固定：

```text
w = 密文段 + RSA 段          # 两段直接拼接，中间无分隔符
密文段 = 自有变体 base64( AES-128-CBC( 紧凑 JSON(提交内容) ) )
RSA 段 = RSA-1024 / PKCS1v15( AES 的 key )      # 恰好 256 个 hex 字符，长度不符要重试
```

拆解要点：

| 环节 | 取值方式 | 验证方式 |
| --- | --- | --- |
| AES key | **4 段随机 hex 拼接**：`(65536*(1+Math.random())\|0).toString(16).substring(1)` × 4 ⇒ 16 位 | 同一会话内多个 `w` 共用**同一把**，这才是对齐检查点 |
| AES mode | CBC | 密文长度比明文多整整一块 ⇒ 有填充 |
| IV | **字符串 `"0000000000000000"`，即 16 个 ASCII `'0'`（0x30）**，不是 16 个 `\x00` | 用 `'0'×16` 能解出明文、用 `\x00×16` 是乱码 |
| 补位 | 站点侧（CryptoJS）实测为 `pad.Pkcs7` | 固定 key/iv/明文本地跑，与浏览器密文逐字节 diff |
| RSA | `publicExponent = 0x10001`，公钥可从断点处的 `publicKey` 变量直接读 | 用 `rsa.encrypt` 加密同一把 key，密文应与抓包一致 |
| 编码段 | **自有 base64 变体**：码表尾 `+/` 换成 `()`，剩余位补 `.`（不是 `=`），位掩码是 `7274496/9483264/19220/235`，**与标准 base64 不等价** | 拿标准 base64 解出来对不上 ⇒ 别怀疑算法，是码表 |

> ⚠️ **历史纠正**：早期公开分析里「AES key 由时间戳派生、用字符 `'0'` 手工补位」的说法，
> 是作者当时的推测（其 Python 复现脚本自身的实现选择），已被同系列补遗否证。
> 按本表口径执行，并注明取证版本。

明文 JSON 里最值钱的字段是 `i`：**它是一串用 `!!` 分隔的浏览器环境数组**
（75 项左右：窗口/屏幕尺寸、`navigator` 各字段、字体列表、性能时间、WebGL/插件结果等）。
定位方法：在加密函数入参处断下，把 `i` 的值原样抄下来，与最终 `w` 解密结果逐字段比对。

> 该字段就是「环境 / 指纹 / collect 线」，与图像线、参数 builder 线必须分开处理——见本文档第五节的五线拆法。

**v3 是三个 `w`，不是两个**：`get.php`（首包）、`ajax.php`（题型确认包）、`ajax.php`（提交包）
各带一个 `w`，三个相互关联，**只逆最后一个会被判 `forbidden`**。
第一个与第三个结构完全同构（`密文段 + RSA 段`）；第二个走的是无感路线，同样两段。
完整链路顺序、字段表与轨迹编码见 `../../web-verify-patcher/references/geetest-protocol-matrix.md`。

#### 极验 v4（`gcaptcha4.js`）

同样两段，但**编码层从「自有 base64」换成小写 hex**，字段从「环境串」换成「PoW + 动态键名防篡改块」：

```text
w = hex( AES-128-CBC( 紧凑 JSON(data) ) ) + hex( RSA-1024 / PKCS1v15( 同一把 AES key ) )
```

- `data` 里每轮必变的字段：`setLeft` / `passtime` / `userresponse` / `lot_number` / `pow_msg` / `pow_sign` / 防篡改块三层键值；
- `userresponse` 是一道换算题：`setLeft / 1.0059466666666665 + 2`（分母是 SDL 常量，web 端长期未变）；
- **防篡改块**的**键名**由 `lot_number` 按固定下标切片拼出（含「两段切片重叠拼接」这种非直觉形态），
  写死模板下一轮直接失效；下标规则本身也是版本相关的，v1.9.x 可在控制台执行 `window.lib._abo` 打印规则；
- 轨迹是**独立参数** `td`，不参与 `w`：`td = base64url_nopad( gzip( JSON(轨迹 payload) ) )`，
  而 `data.td_sign = HMAC-SHA256(key = 同轮 lot_number, msg = td)` —— 明文轨迹走 query、签名进密文，
  服务端对拍绑定；**所以 `w` 解密结果里永远找不到轨迹本体**；
- PoW 段：`pow_msg = '1|{bits}|{hashfunc}|{datetime}|{captcha_id}|{lot_number}||' + salt(16 hex)`，
  `pow_sign = SHA256(pow_msg)`，`bits` 从 `pow_detail` 动态读，判定用整数比较。

> 固定 key/iv/明文与浏览器 diff 的方法、变体对照表、PoW 归约模板见
> `08-mixed-crypto-segmentation.md`；`data` 的字段分桶表与踩坑清单见
> `../../web-verify-patcher/references/geetest-protocol-matrix.md`。

#### 微博登录 `sp`（RSA + 参数三元分类）

- `sp = RSA_encrypt(servertime + "\t" + nonce + "\n" + 明文密码)`，公钥与 `publicExponent` 均硬编码在页面里。
- 同接口的 `su = base64(encodeURIComponent(手机号))`，是编码不是加密，不要一起当成加密处理。
- `servertime` 直接来自上一个接口的返回值，`nonce`/`rsakv`/`pcid` 同理——**先把参数分成「固定 / 上次返回 / JS 计算」三类再动手**，详见 `07-antidebug-and-live-patching.md` §6。
- `prelt`（上一次请求的本地耗时减云端耗时）可以随机化，不需要精确复刻。
- **登录 / 账号体系**（注册 / 改密 / CAS 单点登录）的参数不在本节展开：它们的**服务器下发字段清单**、
  **密码加密族判据表**与**提交形态（明文框 + 隐藏字段两段式）**见 `12-login-and-account-params.md`。

## 三、Cookie / Header / 多参数联动题

### Cookie 题

统一结构：

```text
环境采集
-> builder
-> hash / encrypt / encode
-> document.cookie 写入
```

最稳入口：

- Hook `document.cookie`
- 回栈看 builder
- 继续追环境采集层

#### 盼之 cookie

- 典型价值：从 cookie sink 反推 IIFE 和 builder

### 多参数联动题

#### 滴滴 `dd03 / dd05 / wsgsig`

- `dd03` 更偏纯算层
- `dd05` 更偏运行时或 webpack/VMP 层
- `wsgsig` 更像收口层
- 最稳打法：先拆组成件，再拆最终收口件

#### 某农网 `X-CLIENT-SIGN`

- 先盯最终缺的 header
- 再把真正返回它的混淆函数整段收缩

## 四、JSVMP / VMP 题

### 共同策略

1. 不从文件头正推。
2. 先找最终 writer 和最终返回值。
3. 先恢复中间数组 / 中间对象 / payload。
4. 再恢复最终编码层。

### 小红书 `X-s / X-t / X-S-Common`

- 第一入口是 `window._webmsxyw()`，不是最终 header 串。
- 必须把 `X-s` 和 `X-S-Common` 分开看。
- `X-S-Common` 体现的是 header 家族和环境/指纹字段联动。
- 高频中间结构：`x1 / x2 / x3 / x4 / payload`。
- 同站点多文章要分“入口定位”“AST 解混”“JSVMP 结构”“环境位串”“算法骨架”五种思路记录。

### 抖音 `a_bogus`

- 不要把它简化成 `SM3 + RC4 + Base64`。
- 真正难点是多段数组、状态推进、时间戳/随机数/UA/环境材料如何进入 96/128/136 位数组。
- 最该保存的检查点：双 SM3 输出、41 位浏览器数组、50 位主数组、96/128/136 位数组、最终 `a_bogus`。

### QQ 音 / Spiderdemo / 复杂 VMP

- 更适合当“标准题”和“超重型对抗题”之间的过渡训练。
- 优先练 webpack 入口定位、最终 writer 确认、协议/页面回填拆分。

## 五、Wasm / 协议题

### Wasm

优先顺序：

1. 找加载点
2. 找 Wasm URL
3. 看 `instance.exports`
4. 用固定输入验证输出
5. 再决定是否反编译

### Protobuf / WebSocket

- 先数包或先确认 message type
- 先拆协议线和页面线
- 不要一开始就把二进制题当“某个 sign 函数”

#### Spiderdemo T6

- 重点不是 sign，而是 protobuf + 页面占位回填

## 六、国密题

### SM3

- 经常作为最终签名层或中间摘要层出现
- 真正要对齐的是：原始明文、SM3 输入字节、SM3 输出、后续 builder 输入

### SM4

- 分析重点和 AES 类似：key、iv、模式、padding、编码层

### SM2

- 更适合作为“识别型知识”
- 先确认它是不是关键层，再决定是否优先迁移

## 七、最小落地接口

优先收敛成这类分层：

```text
build_context
-> build_raw_string / build_payload
-> crypto_or_vm_layer
-> validate_checkpoints
-> final_output
```

不要把所有逻辑塞进一个大函数里。