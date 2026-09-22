## 入口与传输

- 生成位置: 前端 JS（chunk/tpl/ccloud-bbs/index.<hash>.js 内以常量 appSecret 与 e.headers["X-Ca-Key"]=… 形式存在；具体签名函数名文章未给）
- 触发时机: 每次请求前（x-ca-nonce 每次请求都需要重新生成）
- 传输方式: 请求头 x-ca-key / x-ca-nonce / x-ca-signature / x-ca-signature-headers

## 排查步骤

1. 直接 GET 目标接口会返回 400，响应头 x-ca-error-message: Header `X-Ca-Key` is Required → 确认是阿里云网关签名
2. 在成功报文里抄下 x-ca-key / x-ca-nonce / x-ca-signature / x-ca-signature-headers 四个头
3. 到前端 JS 里取常量：appSecret（正则 appSecret:"([a-zA-Z0-9]*)"）与 AppKey（正则 e.headers["X-Ca-Key"]=([0-9]*,)）；1291943 给出当时的字面值 ekey=9znpamsyl2c7cdrr9sas0le9vbc3r6ba / x-ca-key=203803574
4. 生成 nonce（UUID，格式正确即可，作者说明不必严格按 JS 算法）
5. 拼待签名串："GET\n*/*\n\n\n\nx-ca-key:203803574\nx-ca-nonce:<uuid>\n" + path + '?' + query[:-1]
6. sign = base64( HMAC-SHA256(key=ekey, msg=待签名串) )
7. 带 x-ca-key/x-ca-nonce/x-ca-signature/x-ca-signature-headers 与登录 cookie 请求
8. 校验：能拿到 JSON 且 markdowncontent 字段有值

## 算法口径

- 家族: `hmac`
- 细节: HMAC-SHA256，输出 Base64。待签名串按阿里云 API 网关规范逐行拼接：HTTPMethod + \n + Accept + \n + Content-MD5 + \n + Content-Type + \n + Date + \n + Headers + PathAndQuery；其中 Headers 为参与签名的头按 x-ca-key、x-ca-nonce 顺序各占一行、行尾带 \n。本文示例串共 7 个 \n："GET\n*/*\n\n\n\nx-ca-key:203803574\nx-ca-nonce:{uuid}\n{path?query}"。
- 密钥/常量: `9znpamsyl2c7cdrr9sas0le9vbc3r6ba（32 字符 ASCII；文章变量名 ekey，出自前端 JS 的 appSecret）`
- 输出编码: base64

## 自算核对（源文章数字重算结果）

- 待签名串结构核算："GET\n*/*\n\n\n\nx-ca-key:203803574\nx-ca-nonce:<uuid>\n<path?query>" 共 7 个 \n，第 1 个分 Method 与 Accept，第 2~4 个产生 3 个空行，第 5 个结束 x-ca-key 行，第 6 个结束 x-ca-nonce 行，第 7 个结束 PathAndQuery → 与阿里云网关规范（Method/Accept/Content-MD5/Content-Type/Date/Headers/PathAndQuery）一致
- 密钥长度核算：9znpamsyl2c7cdrr9sas0le9vbc3r6ba = 32 字符（符合 appSecret 32 位特征）
- AppKey 长度核算：203803574 = 9 位纯数字，与 1511380 的正则 e.headers["X-Ca-Key"]=([0-9]*,) 的限制匹配
- 示例 URL 核算：query = "id=109204774&model_type="，query[:-1] = "id=109204774&model_type"，因此原文待签名串末尾没有 '='
- HMAC-SHA256 + Base64 输出长度应为 44 字符（32 字节 → 44 base64），文章未给示例值，无法实测比对

## 来源之间的矛盾

- docs/references/52pojie-1291943-关于CSDN获取博客内容接口的x-ca-signature签名算法研究.md:68 vs docs/references/52pojie-1511380-CSDN爬虫signature加密算法破解.md:41 —— 请求头名大小写：1291943 用全小写 x-ca-key 且成功跑通；1511380 引用 JS 源码为 e.headers["X-Ca-Key"]（大写）。（判定: 无法从文章判定服务端是否区分大小写。1291943 给的是可运行代码，以它的小写为准；1511380 是大写形式的 JS 源码字面量。疑为 HTTP/1.1 头名大小写不敏感导致的两种写法并存。）
- docs/references/52pojie-1291943-关于CSDN获取博客内容接口的x-ca-signature签名算法研究.md:56 vs docs/references/52pojie-1511380-CSDN爬虫signature加密算法破解.md:40 —— 密钥来源：1291943 直接硬编码字面量 9znpamsyl2c7cdrr9sas0le9vbc3r6ba；1511380 说 appSecret 需从 JS 里正则动态提取（未给当时的具体值）。（判定: 两者不矛盾：1511380 说明该常量来自前端 JS（appSecret:"..." 形式），1291943 给出了当时的字面值。若前端 JS 更新，应按 1511380 的方法重新提取。）

## 明确留白（原文未给出，不要臆测）

- 1511380 未给出待签名串原文（只有截图），无法逐字核对它与 1291943 的串是否完全一致（尤其空行数量）
- 服务端是否对 header 名大小写敏感未知
- x-ca-nonce 是否必须严格符合 UUID v4 格式：1291943 明确说「主要的格式正确，而不是特别严格的，我没有严格的按照js的算法去写」
- 文章未给任何 x-ca-signature 示例值，无法验证输出长度/编码
- 两篇样本为 2020-10 与 2021-09，接口是否已改版未知（1511380 另给出 2021 年的新接口 community-cloud/v1/…）
