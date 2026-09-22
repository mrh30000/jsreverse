## 入口与传输

- 生成位置: cookie __lg_stoken__：window.gt（混淆 JS 中即 _0x11db59）的 prototype.a()；AES 加解密：Rt()/It()；X-S-HEADER 组装：jt()；traceparent：E()；X_HTTP_TOKEN：一段 OB 混淆 JS（约 300 行）里的 _0x32e0d2
- 触发时机: __lg_stoken__ 在点击搜索后才生成；X-S-HEADER 每次翻页都会改变；traceparent 每次请求生成；aesKey 每次会话重新生成并经 agreement 接口激活
- 传输方式: cookie: __lg_stoken__ / X_HTTP_TOKEN / user_trace_token；header: traceparent / X-K-HEADER / X-S-HEADER / X-SS-REQ-HEADER / x-anit-forge-code / x-anit-forge-token；POST form: data=<AES 密文>

## 排查步骤

1. 全局搜索 crawlerInfo 类关键字定位密文位置，直接搜 AES.encrypt / AES.decrypt 断点，确认请求/响应是同一套 Rt()/It()
2. 拿 aesKey 与 rsaEncryptData：本地跑 getAesKeyAndRsaEncryptData()，POST gate.xxx/system/agreement {"secretKeyDecode": rsaEncryptData}，取返回 content.secretKeyValue
3. 组 X-K-HEADER=secretKeyValue；X-SS-REQ-HEADER=json.dumps({"secret": secretKeyValue})
4. 组 X-S-HEADER：SHA256(JSON.stringify({deviceType:1}) + u + JSON.stringify(originalData)).toUpperCase() → 再 AES-CBC 加密 JSON{originHeader, code}，iv=c558Gq0YQK2QUlMc
5. 组 traceparent："00-" + E() + "-" + E(16) + "-01"
6. 取 __lg_stoken__：请求 https://www.xxx.com/wn/jobs?kd=..&city=..（禁止重定向），从 302 Location 拿 query → 请求 https://www.xxx.com/common-sec/dist/<name>.js → 拼接 window={location:{hostname,search}} + getLgStoken() 后执行
7. 取 user_trace_token：GET a.xxx.com/json 后从 cookies 里取；取 X_HTTP_TOKEN：把 OB 混淆 JS 整段 copy 下来，补 var document={"cookie":cookie}、window 等，跑出 _0x32e0d2
8. 取 x-anit-forge-code/token：请求 /wn/jobs 带登录后 cookies（login/gate_login_token/_putrc/JSESSIONID），解析 #__NEXT_DATA__ 的 props.tokenData.submitCode/submitToken
9. POST https://www.xxx.com/jobs/v2/positionAjax.json，data={"data": AES密文}，带上全部 header 与 cookie；返回 data 用 It() 解密

## 算法口径

- 家族: `symmetric`
- 细节: 两段算法：① X-S-HEADER 的 code = CryptoJS.SHA256( JSON.stringify({deviceType:1}) + u + JSON.stringify(originalData) ).toString().toUpperCase()（u 为接口 URL，如搜索职位是 .../jobs/v2/positionAjax.json）；随后 X-S-HEADER = Rt( JSON.stringify({originHeader: JSON.stringify({deviceType:1}), code: code}), aesKey)。② Rt(t, aesKey) = CryptoJS.AES.encrypt(Utf8.parse(t), Utf8.parse(aesKey), {iv: Utf8.parse('c558Gq0YQK2QUlMc'), mode: CipherMode.CBC, padding: Pkcs7}).toString()；It() 用同样参数做 AES.decrypt 并 JSON.parse。请求体（getRequestData）与响应解密（getResponseData）复用同一 Rt/It。RSA 部分：JSEncrypt.setPublicKey(下方 PEM).encrypt(aesKey) 得到 secretKeyDecode，POST 到 gate.xxx/system/agreement 换取 secretKeyValue。
- 密钥/常量: `AES IV 固定值(Utf8) = c558Gq0YQK2QUlMc；aesKey = 32 位随机字符串（示例 dgHY1qVeo/Z0yDaF5WV/EEXxYiwbr5Jt，Utf8.parse 后 32 字节 → AES-256）；RSA 公钥 PEM = -----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnbJqzIXk6qGotX5nD521Vk/24APi2qx6C+2allfix8iAfUGqx0MK3GufsQcAt/o7NO8W+qw4HPE+RBR6m7+3JVlKAF5LwYkiUJN1dh4sTj03XQ0jsnd3BYVqL/gi8iC4YXJ3aU5VUsB6skROancZJAeq95p7ehXXAJfCbLwcK+yFFeRKLvhrjZOMDvh1TsMB4exfg+h2kNUI94zu8MK3UA7v1ANjfgopaE+cpvoulg446oKOkmigmc35lv8hh34upbMmehUqB51kqk9J7p8VMI3jTDBcMC21xq5XF7oM8gmqjNsYxrT9EVK7cezYPq7trqLX1fyWgtBtJZG7WMftKwIDAQAB-----END PUBLIC KEY-----`
- 输出编码: base64

## 自算核对（源文章数字重算结果）

- traceparent 长度核算：E() 不带参数时 substr(0, undefined) 取整串 32 位 hex；E(16) 取 16 位 → "00-"+32hex+"-"+16hex+"-01"，与 W3C traceparent 的 55 字符格式吻合
- IV 长度核算："c558Gq0YQK2QUlMc" = 16 字节 → AES 分组 128bit；aesKey = 32 字节 Utf8 → AES-256-CBC/Pkcs7
- RSA 公钥前缀 MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A…IDAQAB = 2048 bit（与 JSEncrypt 常见用法一致）
- SHA256 结果长度 64 hex（32 字节），toUpperCase 后作为 code 参与 AES，符合原文描述

## 明确留白（原文未给出，不要臆测）

- X_HTTP_TOKEN 的具体算法文章未给（OB 混淆约 300 行，作者只贴了改写后的时间戳函数 _0x89ea42）
- X-S-HEADER 的 AES 输出是否为 base64 未逐字说明（CryptoJS AES.encrypt(...).toString() 默认为 base64，属推论，未在文中写明）
- aesKey 字符表含 '+' '/' '='，是否 URL 安全、如何编码传输未说明
- X-K-HEADER 与 X-SS-REQ-HEADER 的完整示例值文章未给（只给 secretKeyValue 变量）
- agreement 接口的完整域名被脱敏处理，无法复现
