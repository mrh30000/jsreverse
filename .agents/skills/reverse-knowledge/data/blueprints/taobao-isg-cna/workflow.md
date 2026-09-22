## 入口与传输

- 生成位置: getIsg() → S.F() → w()（第一段/第二段 JS 均定义 getIsg）；核心构造在 W.sa(n, r) / W.F(n)
- 触发时机: 页面脚本自执行（document['_sufei_data2'] = 399 时）首次生成；后续请求带 cookie
- 传输方式: cookie，参数名逐字："isg"、"cna"；另有 document['_sufei_data2']、localStorage['isg__']

## 排查步骤

1. cna：请求 https://log.mmstat.com/eg.js，正则提取 goldlog.Etag 即为 cna（文章 line 10）
2. isg：在浏览器可加载第二段 JS 调 getIsg()；纯 Node 无 window 时用第一段 JS 调 getIsg()
3. 确认内部链路 getIsg() → S.F() → w() → W.F(r) 与 W.sa(false,true)
4. 若纯算：复刻 B 类（按宽度描述符小端展开 46 字节）、pppp.a/c/d/h 四个工具函数、M.pa 编码（前置 4 + checksum，异或 131 流，URL-safe base64）
5. 填充 a[1]=随机、a[2]/a[3]=秒级时间戳、a[6]=平台索引、a[8]=UA哈希，其余指纹项按补环境实测值填
6. 输出写入 cookie 'isg'，Domain/Path 按脚本设置（z.A('/')）

## 算法口径

- 家族: `custom`
- 细节: 字段宽度描述符 [2,2,4,4,4,1,1,4,4,3,2,2,2,2,2,1,2,1,1,1,1] 展开为 46 字节小端；前置 [4, checksum] 两字节；checksum=(Σ((t<<5)-t+charCode))&255；异或流 r[i]=n[t]^(255&a)，a=~(131*a)（a 初值=checksum）；最后用 URL-safe Base64 字母表编码。
- 密钥/常量: `Base64 字母表: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'；异或常量 131；前置字节 4；isg cookie 有效期加成 +15552e6 毫秒`
- 输出编码: 自定义字母表（URL-safe base64 变体）
- 输出长度: 文章未给；我算得 46+2=48 字节 → 64 个 base64 字符（48%3==0，无 '=' 填充）

## 自算核对（源文章数字重算结果）

- 宽度描述符求和 = 2+2+4+4+4+1+1+4+4+3+2+2+2+2+2+1+2+1+1+1+1 = 46；加前置 2 字节 = 48 字节。
- 48 % 3 == 0 → URL-safe Base64 无 '=' 填充，输出恰好 64 字符。
- 校验字节公式 (Σ((t<<5)-t+c)) & 255 与 e(n) 中 't = (t << 5) - t + n.charCodeAt(r)' 后取低 8 位一致（t 为单字节初值 0）。
- XOR 递推 a_next = ~(131 * a)：~x 在 JS 中为 32 位有符号，但随后用 255 & a 取低字节，等价于 (-131*a - 1) & 255。

## 明确留白（原文未给出，不要臆测）

- A._() 中 P 表如何被填充（文章只见 P={} 与 x() 遍历）。
- j.G/H/I/J/N/Q/R/S/T/W/Y 等指纹/行为项的具体算法（鼠标轨迹、isTrusted、电量等只看到调用点）。
- user_agent 常量如何与真实 UA 配合（a[8] 用 pppp.c(user_agent) 还是 navigator.userAgent，两段代码不一致：line 616 用 user_agent，line 1659 用 navigator.userAgent）。
- document['_sufei_data2'] = 399（d=399）这个数字的含义。
- g='isg' 时 localStorage['isg__'] 的写入/读取细节（k.v）。
