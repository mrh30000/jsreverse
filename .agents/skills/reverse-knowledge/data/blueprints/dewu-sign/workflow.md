## 入口与传输

- 生成位置: 未给出（正文只有断点截图，未贴出 return_sign 实现）
- 触发时机: 请求前构造 post_data 时生成
- 传输方式: POST body（str(post_data) 后发送），字段名 sign

## 排查步骤

1. 登录得物商家后台，定位统计数据接口（Host: stark.dewu.com，请求头 appid: h5 / channel: pc / clientId: stark / platform: h5 / content-type: application/json）
2. 在发起请求处断点，跟入 sign 生成逻辑（观察 return_sign 的实现）
3. 按参数名升序把「键名+值」直接相连：bizChannelId-1 + brandIds + categoryLv3Ids + endDate20230205 + startDate20230130 + timeSpanType2 + timeType2
4. 在末尾直接追加常量 048a9c4943398714b356a696503d2d36
5. 把该串交给 return_sign 得到 sign，放入 post_data['sign']
6. 校验：响应 {"code":200,"msg":"success",...} 即通过

## 算法口径

- 家族: `unknown`
- 细节: 文章未给出哈希/加密算法（正文为截图 + 已成功运行的 Python，未贴出 return_sign 源码）。仅可逐字核对的拼法：按参数名升序把「键名+值」直接相连（无分隔符），最后直接拼接常量 048a9c4943398714b356a696503d2d36；sign 自身不参与。
- 密钥/常量: `048a9c4943398714b356a696503d2d36（原样出现在待签名串尾部；文章未说明其性质）`

## 自算核对（源文章数字重算结果）

- 按原文逐字拼接待签名串：bizChannelId-1|brandIds|categoryLv3Ids|endDate20230205|startDate20230130|timeSpanType2|timeType2，再接 048a9c4943398714b356a696503d2d36，合计 122 字符，与第 58 行字符串完全吻合
- 常量长度核算：048a9c4943398714b356a696503d2d36 = 32 个十六进制字符（128 bit），形似一枚 MD5 摘要
- MD5(参数拼接串)=038faad8f2cd7b1c60d90b64e7712bcd、MD5(拼接串+常量)=71c9f7ef54ec3ab5bb233e48934222b3、MD5(常量+拼接串)=8ab345342e28abf0b1fdb701f953c1af，三者均 ≠ 048a9c49…，故该常量不是上述任一式的 MD5 结果，只能是另取的固定值

## 明确留白（原文未给出，不要臆测）

- return_sign 的具体哈希算法未知（正文未贴源码，只有断点截图）
- 文章未给出任何示例签名值，无法核对输出编码（hex/base64）与长度
- 常量 048a9c4943398714b356a696503d2d36 的性质（盐值 / 密钥 / 消息片段）文章未说明
- 时间戳/随机数是否参与签名未知：待签名串里只有 startDate/endDate 两个日期字符串，没有时间戳、没有 nonce
- 接口是否已改版（样本 2023-02）未知
