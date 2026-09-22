## 入口与传输

- 生成位置: jqmobo2.js 中的 dataenc()（jqsign/jcn）；jqParam 来自一个 ob 混淆 JS（文中给出解混淆后函数 _0x156205 / abcd1 / abcd2 / abcd3 / abcd4 / abcd5 / abcdu / abcdx）
- 触发时机: 答题提交时
- 传输方式: URL query（shortid, starttime, source, submittype, ktimes, hlv, rn, jqpram, jcn, nw, jwt, jpm, t, jqnonce, jqsign）；POST body：submitdata

## 排查步骤

1. 无痕窗口提交一次问卷，抓包拿到 URL query 的 15 个参数与 POST body 的 submitdata
2. 参数分三类：可固定（source/submittype/hlv/nw/jwt/jpm）、页面可取（shortid/starttime/rn/jqnonce）、需计算（jqsign/jcn/jqpram）
3. 全局搜索参数名搜不到 → 查看发起程序 → 第二个是 jqmobo2.js
4. jqsign：在 jqmobo2.js 里断点，扣出 dataenc()，把 ktimes 作为第二参传入（原函数用外部变量 ktimes）
5. jqParam：全局搜索 jqParam，定位到 ob 混淆 JS，用 github.com/DingZaiHub/ob-decrypt 解混淆，再用 Fiddler 映射到网页
6. 断点跟 _0x156205：先 abcd1(rndnum 整数部分) 得 _0x37348b；abcdu(starttime 转 Date) 得秒级时间戳并视 %10 决定反转，拼 '89123' 得 _0x24bc24
7. 拼 (_0x24bc24 + _0x37348b) 的字符数组，用 abcd4 以 62 字符表做交换得到 _0xd36323
8. _0xc23193 = _0x24bc24 + _0x37348b + parseInt(activityId)；jqParam = abcd5(abcd3(_0xc23193, _0xd36323))
9. 把 activityId 按 DecodeId = input ^ 2130030173 先解密
10. jqpram = encodeURIComponent(jqParam)，与其余参数一起提交

## 算法口径

- 家族: `custom`
- 细节: 共 6 个自定义函数：① dataenc(a,ktimes)：b = ktimes % 10（b==0 时取 1），对 a 每个字符 e = charCodeAt(d) ^ b，再 String.fromCharCode 拼接——即整串逐字符 XOR 一个 1~9 的数字。② abcd1(x) = abcd2(x, 3597397)，而 abcd2 把两数拆成高 31 位与低 31 位分别异或后再合并，等价于 32 位整数异或 x ^ 3597397。③ abcd4(数字串, 字母表)：把每个数字位 d 取出，交换 字母表[d] 与 字母表[len-1-d]，得到重排后的 62 字符表。④ abcd3(n, 字母表)：递归 n%62 取表中字符做「62 进制」编码（n-62<0 时取 substr(n,1)）。⑤ abcd5(s)：把字符串循环左移（所有字符码之和 % 长度）位。⑥ abcdu(date)：date.getTime()/1000 + (-480 - new Date().getTimezoneOffset())*60，即换算成 GMT+8 的秒级时间戳。另有 abcdx() 反调试：检查 navigator.webdriver、document.$cdc_asdjflasutopfhvcZLmcfl_、/PhantomJS/ test userAgent、window.callPhantom/_phantom，任一命中则整个运算 return。jqParam 流程：_0x4b9009 = rndnum.split('.')[0] → _0x37348b = abcd1(parseInt(_0x4b9009)) → _0x17071c = abcdu(new Date(starttime.replace(/-/gm,'/'))) → _0x12e25a = _0x17071c+''，若 _0x17071c%10>0 则反转字符串 → _0x24bc24 = parseInt(_0x12e25a + '89123') → _0xd36323 = abcd4((_0x24bc24+''+_0x37348b).split(''), 62字符表) → _0xc23193 = _0x24bc24 + _0x37348b + parseInt(activityId) → jqParam = abcd5(abcd3(_0xc23193, _0xd36323))。
- 密钥/常量: `62 字符表 = kgESOLJUbB2fCteoQdYmXvF8j9IZs3K0i6w75VcDnG14WAyaxNqPuRlpTHMrhz（62 个不重复字符）；XOR 常量 = 3597397（abcd1/abcd2 第二参）；时间戳后缀常量 = "89123"；时区常量 = -480（分钟）；activityId 异或常量 = 2130030173`
- 输出编码: 自定义字母表

## 自算核对（源文章数字重算结果）

- activityId 核算：2035206417 ^ 2130030173 = 129722188，与第 297 行示例 var activityId="129722188" 完全一致 → DecodeId 逻辑确认无误
- 62 字符表核算：kgESOLJUbB2fCteoQdYmXvF8j9IZs3K0i6w75VcDnG14WAyaxNqPuRlpTHMrhz 长度 62 且无重复字符（无 '+' '/' '='），可用于 62 进制编码
- abcd1 等价性核算：3597397 < 2^31，abcd2 把两数拆成高 31 位与低 31 位分别 ^ 后合并，故 abcd1(x) 等价于 x ^ 3597397
- 文中两次运行示例的 rndnum/starttime 不同（第 78 行 607374188.63586548 vs 第 295 行 607374188.44535993；starttime 12:10:55 vs 14:25:20），系不同次运行，不是矛盾

## 明确留白（原文未给出，不要臆测）

- jqParam 没有给出数值示例（作者只贴了可运行 JS 与 console.log 行），无法对拍
- ktimes 可随机，但服务端如何校验 ktimes 与 jqsign 的一致性未说明
- jqParam 来源的 ob 混淆 JS 文件名未给出（只说「来源于一个混淆的js，用的是ob混淆」）
- submitdata 的字段结构未展开（文章只截图）
- 问卷是否存在其他校验（如短信/滑块/答题时长）未涉及
