## 入口与传输

- 生成位置: JS 函数 get_data() → d() → b()（AES）/ c()（RSA）；文章称另存为 网易云.js
- 触发时机: 请求前：execjs 调 ctx.call('get_data', i1x)，即对请求体 JSON 调 get_data
- 传输方式: body，Content-Type: application/x-www-form-urlencoded，字段名逐字为 params、encSecKey

## 排查步骤

1. 搜索 weapi 接口，确认请求体字段为 params、encSecKey，content-type: application/x-www-form-urlencoded
2. 在 JS 搜 encSecKey 或 get_data，定位 d(d,e,f,g)：h.encText=b(d,g); h.encText=b(h.encText,i); h.encSecKey=c(i,e,f)
3. 取常量：g='0CoJUm6Qyw8W8jud'、iv='0102030405060708'、e='010001'、m=n(长hex)、i=a(16)
4. 用 crypto-js 复现两次 AES-CBC + 自实现 RSA，或用 execjs 直接调 get_data

## 算法口径

- 家族: `symmetric`
- 细节: params：AES-128-CBC（两次，CryptoJS.AES.encrypt，key 为 CryptoJS.enc.Utf8.parse 的 16 字节，iv 固定，mode CBC）；encSecKey：RSA（自实现 RSAKeyPair / encryptedString，指数 e 与模数 m）
- 密钥/常量: `AES key1='0CoJUm6Qyw8W8jud'; AES IV='0102030405060708'; RSA e='010001'; RSA m='00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'`
- 输出编码: params=base64（CryptoJS ciphertext.toString()）；encSecKey=hex（biToHex）

## 自算核对（源文章数字重算结果）

- n 的 hex 串长度实测 = 258 字符（129 字节），与代码 setMaxDigits(131) 量级一致
- 文章未给 params/encSecKey 示例密文，无法对拍；仅确认常量与调用链
- 1271541 全文仅 7 张截图，无正文，无法据此新增结论 → evidence: screenshot-only

## 来源之间的矛盾

- docs/references/52pojie-1334257-QQ音乐API签名算法分析.md:19 vs docs/references/52pojie-2018113-网易云音乐逆向.md:522 —— 1334257 称网易云(WY)算法为 AES、RSA、MD5；2018113 给出的 weapi 实现只有 AES + RSA，未见 MD5 参与（判定: 无法判定：2018113 只覆盖 weapi 播放接口，其他接口（如登录）可能另有 MD5；按 2018113 原文，weapi 不涉及 MD5）

## 明确留白（原文未给出，不要臆测）

- 文章未给 params、encSecKey 的示例密文，无法对拍
- 本批 8 篇均未出现 eapi 接口、'非ce' 二次加密、'crypto 前 16 字节' 等说法，故这些一律 null
- encSecKey 的具体填充/长度（RSA chunkSize 细节）文章未展开
- 1271541（网易云）为 screenshot-only，无可用正文
