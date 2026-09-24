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

## 定位手法：ReRes 本地映射（B35 追加，源文 52pojie-1361387）

**目的**：把线上混淆文件在浏览器里**换成你本地改好的反混淆版**，然后才打断点 ——
这样断到的就是可读代码，而不是 `_0x` 森林。

1. 在本地反混淆版所在目录起一个静态服务（源文用的命令）：`python -m http.server`
   （默认 8000 端口；源文的映射目标是 9000，端口按你的实际服务填即可）。
2. 在 ReRes（或任一请求重定向插件）里加映射规则，**把线上 JS 地址映射到本地文件**：
   - 规则形态（源文原话）：`https://image.wjx.com/joinnew/js/cktoole.js>.*   --->   http://localhost:9000/tool.js`
3. ★ **规则要点**：**问号及其后面的参数用 `.*` 代掉**（源文原话「js映射时去调问号及后面的参数用.\*代替即可」）——
   否则 `cktoole.js?v=5` 这种带 query 的地址匹配不上。
4. 刷新页面，确认浏览器实际加载的是本地文件，**再**打断点分析。

**判据**：**先换文件、再打断点**；顺序反了等于没换（断点仍打在线上混淆代码上）。

## 触发形态：参数生成挂在 mousemove 上（B35 追加，源文 52pojie-1361387）

`jqParam` **不是在提交时算的**，而是挂在鼠标移动事件上（三重门禁，缺一不可）：

```js
$(function () {
  setTimeout(function () {
    window["hdm1113"] = true;      // 门禁 ③：页面加载 1 秒后才为 true
  }, 1000);

  function _0x3ef545(_0x151a89) {
    if (_0x151a89["pageX"] > 0 && abcdx() && window["hdm1113"]) {
      // 门禁 ①：pageX > 0（真实鼠标移动；脚本合成事件常为 0）
      // 门禁 ②：abcdx()（反调试环境自检）
      jqParam = abcd3(_0x3a5cf2, _0x1b3de6);
      var _0x5d90fd = abcd5(jqParam);
      jqParam = _0x5d90fd;                                       // ★ 这里才回写
      $(document)["unbind"]("mousemove", _0x3ef545);             // 只算一次
    }
  }

  $(document)["bind"]("mousemove", _0x3ef545);
});
```

- **判据**：用自动化工具跑时「抓不到 jqParam」，**先怀疑这三条门禁** ——
  尤其 `window["hdm1113"]` 的 **1 秒延迟**与 `pageX`（合成事件为 0）。
- 与既有来源（1625463）的关系：1625463 只说「答题提交时」触发，**没提事件绑定**；
  1361387 补上了「挂在 mousemove 上」这一形态。两者不冲突（提交时读到的是已算好的 `jqParam`）。

## 多源对照：1361387（2021-01）与 1625463 的一致性（B35 追加）

- **逐字一致**：两篇的 62 字符表 `kgESOLJUbB2fCteoQdYmXvF8j9IZs3K0i6w75VcDnG14WAyaxNqPuRlpTHMrhz`、
  常量 `3597397`、后缀 `'89123'` 三者**逐字符相同**（机械核对通过）⇒ 属同一套算法的**两次独立观察**，可互证。
- **口径不同的两处（以 1625463 为准）**：
  1. **`get_jqParam` 的截断点**：1361387 的可复用版是 `return jqParam`（**在 `abcd5` 之前**，
     且 `var _0x5d90fd = abcd5(jqParam);` 的结果**从未回写** ⇒ 是死代码），
     而页面内联代码是 `jqParam = _0x5d90fd`（**在 `abcd5` 之后**）⇒ **照抄可复用版会少做一次循环左移**。
  2. **`activityId` 是否先异或**：1361387 的样例直接写 `activityId = '105444284'` 参与
     `parseInt(activityId)`，**没有** `^ 2130030173` 这一步；1625463 则明确要求先 `DecodeId`（`^2130030173`）。
     ⇒ 两文对「页面里那个数是不是已解密值」的理解不同，**以 1625463 的口径为准**（它给了 `2035206417 ^ 2130030173 = 129722188` 的自洽核算）。
- **`_0x3a5cf2` 是数字相加、不是字符串拼接**：`_0xd16fcc + _0x4aaf4a + parseInt(activityId)` 三项都是 `number`
  ⇒ JS 左结合下是**算术和**；写成 Python 字符串拼接会得到完全不同的值（见 mutations.json）。
- **两篇都无法对拍**：都只贴可运行 JS、没给数值示例。
