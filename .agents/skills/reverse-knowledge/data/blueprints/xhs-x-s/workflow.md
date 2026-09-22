## 入口与传输

- 生成位置: seccore_signv2(e, a)（function.js 主方法），内部调用 window.mnsv2(u, m, w)；window.mnsv2 在 ds_script / VMP 文件中定义
- 触发时机: 请求前生成；文章明确 x-t 必须在签名生成后立即生成
- 传输方式: header，参数名逐字："x-s"、"x-t"、"x-s-common"

## 排查步骤

1. 先确认接口：POST https://edith.xiaohongshu.com/api/sns/web/v1/homefeed，body 用分隔符最紧凑的 JSON（json.dumps(separators=(',',':'))）
2. 复现 x-s：u = url + body_json；m = MD5(u)；w = MD5(url)；C = mnsv2(u,m,w)；P={x0:'4.3.5',x1:'xhs-pc-web',x2:'Windows',x3:C,x4:'object'}
3. x-s = 'XYS_' + 用自定义字母表对 encodeUtf8(JSON.stringify(P)) 做 Base64
4. x-t = 毫秒时间戳（文章2：生成签名后立即取）
5. 若走补环境：加载初始化的 VMP(env)+ds_script，再调用 seccore_signv2；若走纯算：按文章1思路 Hook XXTEA/Base64 抓运行时数据后重写
6. 发送时 header 带 x-s / x-t / x-s-common，并带全套 cookie（a1、webId、web_session、gid 等）

## 算法口径

- 家族: `symmetric`
- 细节: 外层：x-s = 'XYS_' + 自定义码表 Base64( encodeUtf8( JSON.stringify(P) ) )；encodeUtf8 是'先 encodeURIComponent 再逐字节取值'。核心：P.x3 由 window.mnsv2(u, md5_1, md5_2) 生成，文章1称其为 XXTEA 加密 + 自定义 Base64 编码（前缀 'mns0201_'）。
- 密钥/常量: `自定义 Base64 字母表（文章2 逐字）: "ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5"。XXTEA key（文章1）: "e6483ca2a1eed5e3"（按 ASCII 字节直接当 key）；DELTA = 0x3C6EF373（文章1）。`
- 输出编码: 自定义字母表（仍用 '=' 填充）
- 输出长度: 文章未给；文章2 实测样本 x-s 去掉 'XYS_' 后 Base64 正文解码为 269 字节 → 360 个 base64 字符，x-s 全长 364

## 自算核对（源文章数字重算结果）

- 逐字符数：文章2 line33 的字母表 = 64 字符，去重也是 64（与文章1 的'65'矛盾，判定 64）。
- 用该字母表把文章2 line2080 的 x-s（去 'XYS_'）重映射到标准 Base64 表后解码，结果 = {"x0":"4.3.5","x1":"xhs-pc-web","x2":"Windows","x3":"mns0301_gRaKqcgJb/QcUUzNEp0idC7x+racR85VC7jxYGGI2jnM7z4dsiOURGFrmUXQypUdBXCGmAZt1dS3tYlX4uocRicjmh4ZUecbVzzm4jvVz/4IT71k+1gA0JHKXSbdL8Wo1fMCnpsRzRJPUaT3lJxKSndVZlciE0JRIk0OHNRRTMrZ5D8d8B8gceko1i8lgtB/","x4":"object"} —— 与文章2 line75-81 的 P 结构 + line89 的公式完全吻合，佐证 x-s 公式正确。
- 同一字母表解 line2081 的 x-s-common（2127 字节）= {"s0":5,"s1":"","x0":"1","x1":"4.3.5","x2":"Windows","x3":"xhs-pc-web","x4":"6.7.0","x5":<a1 cookie>,"x6":"","x7":"","x8":<长 base64 串>,"x9":1795279484,"x10":0,"x11":"normal","x12":"1776697320839;1776355418720"}（这是解码得到的事实，文章正文未说明）。
- x-t 示例 1776697339937 是 13 位毫秒时间戳，与 line2138 的 int(time.time()*1000) 一致（x12 中的 1776697320839 与之相差约 19 秒）。
- 文章1 给的 DELTA=0x3C6EF373 与'标准 XXTEA'常用的 0x9E3779B9 不同，但文章1 未展示完整 XXTEA 代码，无法自验；按原样记录。

## 来源之间的矛盾

- 52pojie-2092725:67（返回 "mns0201_" + base64 结果） vs 52pojie-2104039:2080（实测 x3 解出 mns0301_...） —— 两篇文章给出的 mnsv2 返回前缀不同：文章1 写 mns0201_，文章2（2026-04）的真实样本解码后 x3 = mns0301_（判定: 无法判定哪个'对'——发布时间差两个月（2026-02 vs 2026-04），最可能是版本升级 mns0201→mns0301。蓝图里两个前缀都记录，使用时以实际样本为准。）
- 52pojie-2092725:44 / 66（65 字符字母表） vs 52pojie-2104039:33（字母表字符串） —— 文章1 说自定义 Base64 是 65 字符字母表；文章2 给出的字母表字符串只有 64 个字符（判定: 我逐字符数过文章2 的字母表 = 64 字符（set 去重后也为 64）。Base64 表本就应为 64；文章1 的'65'可能把 '=' 填充也算进去了。判文章2 的 64 为准。）
- 52pojie-2104039:2080（x-s 正文） vs 52pojie-2104039:2081（x-s-common 正文） —— 文章给了 x-s-common 的示例值，但全文没有 x-s-common 的生成代码；且两者解码后的 JSON 结构完全不同（判定: 无法从文章判定 x-s-common 的算法。见 self_check：我解出 x-s-common 是另一套字段（s0..x12），文章代码只覆盖了 x-s。）

## 明确留白（原文未给出，不要臆测）

- x-s-common 的生成算法（文章只给示例值，无代码）。
- XXTEA 的 89 字节 payload 内部字段布局（magic/随机数/时间戳/URL 长度/XOR 编码的 MD5/指纹 只列了名字，未给字节偏移）。
- mnsv2 里两个 md5 参数各自的具体用途（文章只写 mnsv2(url, md5_1, md5_2)）。
- 自定义 Base64 是否含 key 派生/移位（文章2 的 alphabet 是直接常量表，未提及位移）。
- mns 版本号（mns0201 / mns0301）与生效时间的对应关系。
