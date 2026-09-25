## 入口与传输

- 生成位置: seccore_signv2(e, a)（function.js 主方法），内部调用 window.mnsv2(u, m, w)；window.mnsv2 在 ds_script / VMP 文件中定义。另一来源（52pojie-1981410）记 x-s 入口为 window._webmsxyw，依赖三参数：请求 url、body、a1
- 触发时机: 请求前生成；文章明确 x-t 必须在签名生成后立即生成
- 传输方式: header，参数名逐字："x-s"、"x-t"、"x-s-common"

## a1 的定位与两条实现路线（52pojie-1981410）

- **a1 的定位法（★ 从值反查写入点）**: a1 是常量 cookie。先搜 `a1`（命中太多）→ **发现 a1 的值是常量** → **改搜这个常量本身** → **命中 `set` 方法**（是 `set` 才让它成为 cookie）。a1 算法源文自述「很简单就一些随机数」，扣到本地与浏览器一致。
  - 这是本仓「从值反查写入点」的一个实例；同类方法与「消失点 / 变化点」判据见 `../../../../web-reverse-algorithm/references/15-call-site-locating-playbook.md` §0（J1）。
- **x-s 入口**: `window._webmsxyw`（源文写作 "windos 函数"，实为 window 上的函数），依赖三个参数：**请求 url、body、a1**。
- **两条路线取舍**: ① 补环境 ② 长链接调用。源文两种都试过，**推荐补环境**（理由：长链接方式 **a1 是写死，拓展性差**）。
- **x-s-common**: 对 v 值做加密编码，v 里含 `x1~x10` 等属性（源文仅命名，未给代码）。

## 排查步骤

1. 先确认接口：POST https://edith.xiaohongshu.com/api/sns/web/v1/homefeed，body 用分隔符最紧凑的 JSON（json.dumps(separators=(',',':'))）
2. 复现 x-s：u = url + body_json；m = MD5(u)；w = MD5(url)；C = mnsv2(u,m,w)；P={x0:'4.3.5',x1:'xhs-pc-web',x2:'Windows',x3:C,x4:'object'}
3. x-s = 'XYS_' + 用自定义字母表对 encodeUtf8(JSON.stringify(P)) 做 Base64
4. x-t = 毫秒时间戳（文章2：生成签名后立即取）
5. 若走补环境：加载初始化的 VMP(env)+ds_script，再调用 seccore_signv2；若走纯算：按文章1思路 Hook XXTEA/Base64 抓运行时数据后重写
6. 发送时 header 带 x-s / x-t / x-s-common，并带全套 cookie（a1、webId、web_session、gid 等）
7. 若走补环境路线（源文推荐）：用本文「最小补环境模板」一节逐字模板起手，**关键桩 `document.cookie = "a1"` 不能漏**；随后把 x-s 那段混淆 js 贴到模板下面即可运行
8. 若走长链接调用：注意 a1 写死、拓展性差（换号 / 换 a1 即失效），只适合一次性取证

## 最小补环境模板（52pojie-1981410 逐字）

源文原话：「第一步点进去直接把源码复制过去 / 第二步补环境即可」，并给出下面这份**最小面**（**逐字保真，含源文自己打的码 `xxxx` / `www.xxxxx.com`，未擅自还原**）：

```js
window = global;
delete global;
delete Buffer;

window.sdt_source_init = true
window.external = {}
window.Window = function () {
}
window.Image = function () {
}

canvas = {

    innerHTML: "",
    tagName: "",
    className: "",
    nodeName: {},
    contentWindow: {},
    getContext: function (arr) {
    },
    remove: function (arr) {
    },
    style: {
        position: {}, left: {}, fontSize: {}, fontStyle: {}, fontWeight: {}, letterSpacing: {}, lineBreak: {}, lineHeight: {},
        textTransform: "", textAlign: {}, textDecoration: {}, textShadow: "", whiteSpace: {}, wordBreak: {}, wordSpacing: {}, fontFamily: {}
    },
    appendChild: function (arr) {
    },
    offsetWidth: function (arr) {

    },
    offsetHeight: function (arr) {
    },
}
document = {
    createElement: function (arr) {
        return canvas
    },
    documentElement: {},
    querySelectorAll: function () {
    },
    cookie: "a1"
}

navigator = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) xxxx",
    platform: "Win32",
    webdriver: false,
}
screen = {}
localStorage = {
    getItem: function () {
    }
}
location = {
    host: "www.xxxxx.com"
}
history = {};
```

⚠️ **保真要点**：
- `document.cookie = "a1"` 是**关键桩**（源文把 a1 直接写死在 `document.cookie` 上）—— 别漏；
- `userAgent` 里的 `xxxx` 与 `location.host` 里的 `www.xxxxx.com` 是**源文自己打的码**，**保留原样、不得解码**；
- 模板首行 `window = global; delete global; delete Buffer;` 是「把 Node 全局伪装成 window」的标准起手；
- 源文原话「把 x-s 那段混淆的 js 贴到下面就可以运行了」。

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

- x-s-common 的生成算法（文章只给示例值，无代码；52pojie-1981410 也只说「对 v 值加密编码，v 里有 x1~x10 等属性」，仍无代码）。
- XXTEA 的 89 字节 payload 内部字段布局（magic/随机数/时间戳/URL 长度/XOR 编码的 MD5/指纹 只列了名字，未给字节偏移）。
- mnsv2 里两个 md5 参数各自的具体用途（文章只写 mnsv2(url, md5_1, md5_2)）。
- 自定义 Base64 是否含 key 派生/移位（文章2 的 alphabet 是直接常量表，未提及位移）。
- mns 版本号（mns0201 / mns0301）与生效时间的对应关系。
- a1 的具体生成算法（52pojie-1981410 只给「很简单就一些随机数」这一句描述，未给代码）。
