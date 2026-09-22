## 入口与传输

- 生成位置: window.bdms（文件 bdms_1.0.1.19_fix.js，版本串 "1.0.1.19-fix.01"），jsvmp 解释器内部；作者定位到 bdms.js 就是 a_bogus 生成位置
- 触发时机: 请求前。先判断 URLSearchParams 里有没有 a_bogus（has），没有才生成，生成后 append 到 URLSearchParams；也可通过构造一个 XHR（get_a_bogus）触发并把 window.a_bogus 取回
- 传输方式: query 参数，参数名逐字为 `a_bogus`（2104414 的 jsvmp 代码字面量 e[0]=='a_bogus'）

## 排查步骤

1. XHR 断点断在目标接口（如 /aweme/v1/web/comment/list/reply/），跟栈进入 bdms.js 的 jsvmp。
2. 给 jsvmp 的 apply/call 打日志点："apply:::m=>",m,"func=>",n,"this=>",d,"args=>",e（2092806:117）；给运算符 *= / -= / +=、数组创建/修改/读取/Push 打日志点（2092806:349/364/390-394）。
3. 倒着从 URLSearchParams.append 往上找：确认 a_bogus 前一步是魔改 base64（结构性位运算：<<8、>>6、&0b111111）。
4. 用自定义字母表的 CustomBase64 校验 decode/encode 对拍（2092806 给的 Python 实现含标准表与自定义表两套）。
5. 往上找 base64 输入：arr_4 + RC4 输出；定位 256 循环 + 结构化 swap 即 RC4，并核对其长度特性。
6. 解 arr_144 = arr_8 + arr_136，arr_136 = func(arr_100)，arr_100 = arr_50+arr_47+arr_2+arr_1。
7. arr_50 不是算出来的：只保留 Push/Read/apply 三类日志点，搜代表值（如 171 来自 U[56]），得到 50 个索引；按 U_index_unsorted 还原顺序。
8. arr_2 用 Date.now/getTime 递增 hook；arr_47 用屏幕参数 + platform；arr_4 固定 Math.random=0.05 后对拍。
9. 三个 32 位数组：日志里 apply 的 func 形如 ƒ(t,r){...this.reg...}（reg:Array(8)）即 SM3，直接扣代码用。
10. 或用 2104414 的省事法：补好 navigator/location/XMLHttpRequest 环境后，调用 get_a_bogus(url) 构造 XHR，在 e[0]=='a_bogus' 处取 window.a_bogus。

## 算法口径

- 家族: `custom`
- 细节: 复合链路（按 2092806 的可复现顺序）：① 载荷(URI query 串)尾部拼 `dhzx` → SM3 得 32 字节数组（共 3 个 32 位数组，之间还有 RC4 与 base64，2088330 记为 encrypt1=SM3(载荷+dhzx)、encrypt2=SM3(encrypt1)、encrypt3=SM3("dhzx")、encrypt4=SM3(encrypt3)）；② UA 经 String.fromCharCode + charCodeAt 处理后也进 SM3（2088330 记 encrypt4=SM3(UA_)）；③ 组装 arr_100 = arr_50 + arr_47 + arr_2 + arr_1；④ arr_136 = func(arr_100)（每 3 个取、生成 4 个，尾部余数补上）；⑤ arr_144 = arr_8 + arr_136；⑥ arr_144' = 魔改 RC4(arr_144)；⑦ arr_4 + arr_144' → 魔改 base64 → a_bogus。另有 2088330 的另一种中间量计数：98 位数组 = 50 位数组 + 44 位数组(浏览器指纹) + 4 位数组 + 1 位数组，130 位数组 + 8 位数组 → 138 位数组 → fromCharCode → 魔改 RC4 → 魔改 base64
- 密钥/常量: `魔改 base64 字母表（逐字）：Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe；固定盐值：dhzx；arr_4 常量：3、82；掩码常量：0xAA/0x55/0xFFFF`
- 输出编码: 自定义字母表 base64（字母表见 key_material；作者说'其实也不算魔改，只是把映射表做了替换'，原表为大小写字母+数字++/）
- 输出长度: 文章未给固定长度。2048032(头条) 称长度不固定；抖音侧样例实测 188 字符(2104414:8266) 与 196 字符(2092806:273 逆向测试串)，均以单个 `=` 结尾

## 自算核对（源文章数字重算结果）

- 魔改 base64 字母表 'Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe'：长度=64，去重后仍=64（无重复字符），不含 '+'、'_'、'='，含 '-' 与 '/'。与标准表 'ABC...xyz0123456789+/' 不同（标准表含 '+'）。
- 2092806:273 的逆向测试串实测 196 字符，以 1 个 '=' 结尾，含 '-'、'/'，不含 '+'。
- 2104414:8266 的 a_bogus 示例实测 188 字符，以 1 个 '=' 结尾，含 '/'，不含 '+'、不含 '-'。两例字符集均落在自定义字母表 ∪ {'='} 内，符合魔改 base64 含补位的描述。
- 算术核对：2088330:136 的 50+44+4+1=99 ≠ 文中 98（不成立）；2088330:66 的 50+3数组=98 → 其余 3 个共 48（与 :136 的 49 差 1）。2092806 的 arr_100=50+47+2+1=100 成立；arr_144=arr_8(8)+arr_136 → 136 成立。
- 『50 bytes』核实：2092806 标题为『含50位数组生成过程』，正文全程说的是 `50 位数组`/`arr_50`（50 个元素的数组，见 :781『这个50位数组是出现在apply中的』、:813『恰好50个』）。全文没有任何地方说 a_bogus 输出是 50 字节。文件名 2092806-douyin-a_bogus-50bytes.md 中的 '50bytes' 系外部命名，与文章内容不符。
- arr_4 掩码核对：(a&0xAA)|(3&0x55) 中 0xAA 与 0x55 互为按位取反，属标准奇偶位分离写法；常量 3、82 逐字抄自文章。
- 环境指纹核对：全 5 篇 grep 'canvas|webgl|performance|$_|_0x' 未命中任何与 a_bogus 生成相关的项；2104414:7705 的 'ev_type: "performance"' 属于 bdms 埋点上报（/monitor_browser/collect/batch/?biz_id=web_bdms_cn），与签名链路无关。

## 来源之间的矛盾

- 2088330-douyin-ab-params.md:77 vs 2088330-douyin-ab-params.md:83 vs 2092806-douyin-a_bogus-50bytes.md:989 —— 尾部固定盐值：:77 写 `dgzx`（原文『将载荷内容尾部拼接了 `dgzx4`个字符』），:83 与 2092806:989 都写 `dhzx`（判定: 判定 dhzx 正确、dgzx 为笔误：2092806 有真实日志回显 `...%3Ddhzx`（逐字），且 2088330 自身在 :114 又写回 dhzx）
- 2088330-douyin-ab-params.md:66 vs 2088330-douyin-ab-params.md:136 —— 中间数组长度：:66 说 50 位数组 + 3 个数组 = 98 位（其余 3 个合计 48）；:136 枚举为 44 + 4 + 1 = 49，50+49=99≠98（判定: 无法判定哪个对，两处自相矛盾（差 1）。2092806 的同位数字自洽：arr_100 = arr_50+arr_47+arr_2+arr_1 = 100，且 arr_144 = arr_8+arr_136 自洽，故更信 2092806 的计数体系）
- 52pojie-1928860-某音a_bogus纯算分析.md:60 vs 2092806-douyin-a_bogus-50bytes.md:989 —— 尾部固定盐值不同版本：1928860(2024-05) 说『最后还加上了cus这三个字符』；2092806(2026-02)/2088330(2026-01) 说 dhzx（判定: 判定为版本演进（接口改版）而非矛盾：2024 年版盐值 `cus`，2026 年版盐值 `dhzx`。使用时应按目标站点当时的 JS 版本取盐值）
- 52pojie-2048032-...:15 vs 52pojie-2048032-...:27 vs 52pojie-2048032-...:53 —— a-bogus 长度：:15 说『长度为168位』，:27 又说『a-bogus的长度不是固定的』，:53 说补环境后『长度160』（判定: 作者自述长度不固定，168 与 160 是两次不同环境的观测值，非矛盾；但说明不能按固定长度做条件断点（应改为『长度大于168』））

## 明确留白（原文未给出，不要臆测）

- 魔改 RC4 的完整密钥/初始化细节：2092806 只给『校验通过』截图与文字描述，未逐字给出 KSA/PRGA 里被改动的那一处（只说『长度并不相同，可能是哪里被魔改了』）。
- arr_1、arr_8 的逐字节生成逻辑：2092806 明说『找不到』『很抽象，特么的找不到』，只给出与随机数/arr_8 关联。
- arr_136 = func(arr_100) 的 func 具体规则：文章只说『每次取3个生成4个，循环完成之后将100位中末尾没使用到的拼接到最后』，未给逐字代码。
- U26-36 / U38-53 / U56-59 / U60-70 / U71-74 各段与时间戳、appid、arr_32_1/arr_32_3 的精确映射：文章多处写『暂时写死不做纠缠』。
- 魔改 base64 是否有版本位/魔数位：文章未提及，仅 arr_4 是 4 位随机前缀（不是固定魔数）。故本蓝图不写魔数位。
- a_bogus 是否 URL 编码两次：2092806 的 CustomBase64 会输出 '=' 补位，但文章未说明最终 append 前是否 encodeURIComponent。
- 2088330 的 encrypt1..encrypt4 命名与 2092806 的『3 个 32 位数组』未一一对齐（数量对不上：4 个 SM3 结果 vs 3 个 32 位数组）。
