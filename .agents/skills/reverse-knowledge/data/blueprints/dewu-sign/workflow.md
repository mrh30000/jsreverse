## 入口与传输

- 生成位置: 商家后台面 `return_sign`（源文只有断点截图）；**web 端首页推荐面 `cxx(t)`（源文 52pojie-2036327 第 956–981 行，已给出完整函数体）**
- 触发时机: 请求前构造 post_data / 首页请求体时生成
- 传输方式: 商家后台：POST body（str(post_data) 后发送），字段名 sign；web 端：请求体 `data['sign']`（经 `execjs` 调 `ctx.call('cxx', data)` 注入）

## 排查步骤

1. 登录得物商家后台，定位统计数据接口（Host: stark.dewu.com，请求头 appid: h5 / channel: pc / clientId: stark / platform: h5 / content-type: application/json）
2. 在发起请求处断点，跟入 sign 生成逻辑（观察 return_sign 的实现）
3. 按参数名升序把「键名+值」直接相连：bizChannelId-1 + brandIds + categoryLv3Ids + endDate20230205 + startDate20230130 + timeSpanType2 + timeType2
4. 在末尾直接追加常量 048a9c4943398714b356a696503d2d36
5. 把该串交给 return_sign 得到 sign，放入 post_data['sign']
6. 校验：响应 {"code":200,"msg":"success",...} 即通过

## 算法口径

- 家族: `md5`（**B35 升级**：web 端首页推荐面的 `cxx()` 从打包产物里读出完整实现 —— `u()("".concat(<升序拼串>, "048a9c4943398714b356a696503d2d36"))`，而 `u()` 所在的模块即 blueimp-md5，同包第 597/746 行出现其 IV 常量 `1732584193 / -271733879 / -1732584194 / 271733878`）
- 细节: 按参数名升序（`Object.keys(t).sort()`）把「键名+值」直接相连（无分隔符；空数组只留键名；非空数组元素 `sort()` 后用 `,` 连接；对象值走 `JSON.stringify`），随后**直接拼接常量**，整体入 MD5；sign 自身不参与。**两个面逐条规则相同、常量逐字符相同。**
- 密钥/常量: `048a9c4943398714b356a696503d2d36`（**拼串尾部常量**，32 hex = 128 bit；性质仍未知，但位置已确定：在拼串**之后**、整体入 MD5）
- ⚠️ 证据等级：**读码 + 跨面互证**，**两个面都没有服务端返回值可对拍** ⇒ `status: partial`，落地前请用一次真实响应自证（预测值见下方「自算核对」）

## 自算核对（源文章数字重算结果）

- 按原文逐字拼接待签名串：bizChannelId-1|brandIds|categoryLv3Ids|endDate20230205|startDate20230130|timeSpanType2|timeType2，再接 048a9c4943398714b356a696503d2d36，合计 122 字符，与第 58 行字符串完全吻合
- 常量长度核算：048a9c4943398714b356a696503d2d36 = 32 个十六进制字符（128 bit），形似一枚 MD5 摘要
- MD5(参数拼接串)=038faad8f2cd7b1c60d90b64e7712bcd、MD5(拼接串+常量)=71c9f7ef54ec3ab5bb233e48934222b3、MD5(常量+拼接串)=8ab345342e28abf0b1fdb701f953c1af，三者均 ≠ 048a9c49…，故该常量不是上述任一式的 MD5 结果，只能是另取的固定值
- ★ **B35 用 Node 从零复算，上条三个值逐字符重现** ⇒ 该 self_check 可信。
  **其中 `MD5(拼接串+常量) = 71c9f7ef54ec3ab5bb233e48934222b3` 就是本文档所示那次请求的 `sign` 预测值**
  （参数：`bizChannelId=-1 / brandIds=[] / categoryLv3Ids=[] / endDate=20230205 / startDate=20230130 / timeSpanType=2 / timeType=2`）
  —— 后续批次拿到该接口真实响应后**逐字符对拍**，即可把 `status` 从 `partial` 升为 `active`。
- ★ **跨面一致性（B35）**：web 端首页推荐面的拼法与商家后台面逐条规则相同、常量逐字符相同 ⇒ 两个独立面互证。

## 明确留白（原文未给出，不要臆测）

- ★ **未对拍**：两个面都没有服务端返回值 ⇒ `family: md5` 是读码 + 跨面互证所得
- 常量 048a9c4943398714b356a696503d2d36 的**性质**仍未知（盐值 / 密钥 / 消息片段）
- 输出编码与长度未对拍（按 `md5` 推断为 32 位小写 hex）
- 时间戳/随机数是否参与签名未知：待签名串里只有 startDate/endDate 两个日期字符串
- 两个面的**参数集不同** ⇒ 参数名与取值口径不可跨面照抄，**只有「升序拼法 + 常量」可跨面复用**
- 接口是否已改版（商家后台样本 2023-02、web 端样本 2025-06）未知
