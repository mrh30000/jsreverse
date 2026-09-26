# 反调试绕过与在线补丁调试（mitmproxy / FiddlerScript / 响应改写）

> 目录
> 1. 什么时候用这份文档
> 2. 无限 debugger 的三层定位与处置
> 3. 为什么优先用响应改写而不是 DevTools 的 Overrides
> 3.1 FiddlerScript 的 `OnBeforeResponse` 通道（Windows 侧等价物）
> 4. 动态加密响应体的「解密 → 反混淆 → 再加密」回写
> 5. 每次访问都变的 JS：把逻辑还原成 Python
> 5.7 注入式反调试对抗四条（改 `eval` 实参 / 反向插 `debugger` / 本地桩 / 两份 eval diff）
> 5.8 扣代码阶段的运行期对拍与环境检测处置
> 6. 参数溯源三元分类法
> 7. 失败模式表
> 8. 反例黑名单

---

## 1. 什么时候用这份文档

- 打开 DevTools 就断在 `debugger`，无法操作页面。
- 目标 JS **每次请求都不一样**（动态下发），扣代码活不过十分钟。
- 要提交/响应的关键数据被加密，必须在中间层看清楚明文。
- 目标把第二层代码藏在 `eval` / `Function` 里，需要先主动执行第一层才能拿到。

---

## 2. 无限 debugger 的三层定位与处置

`debugger` 语句本身不可被 DevTools「禁用」，只能让它**不执行**。定位方法只有一条：**在断住的地方看调用堆栈，跳到最上层**。

按出现顺序，真实站点通常叠了三层反调试，要逐层拆：

| 层 | 形态 | 处置 |
| --- | --- | --- |
| L1 函数级 | `txsdefwsw()` 之类的函数里塞了 `debugger` | 把调用点注释掉：`html.replace('txsdefwsw();', '// txsdefwsw();')` |
| L2 页面级 | 检测到 DevTools 后 `document.write('检测到非法调试...')` 覆写整页 | 在覆写语句**前面插入 `return;`**：`html.replace("document.write('...');", "return; document.write('...');")`——只删这句没用，后面的逻辑会走别的分支 |
| L3 动态级 | 接口返回的 HTML 里带 `eval(...)` 的监管脚本 | 注释掉**整个 `eval` 调用**，而不是它内部的某一句 |

处置必须走响应改写（见下节）。**每拆一层都要刷新页面重新观察**，因为上一层的失败分支可能激活下一层。

### 2.1 ★★ 两个「搜不到 `debugger` 字面量」的构造（B43 新增）

`debugger` 只要被拆成字符串拼接，**全文搜 `debugger` 就搜不到** —— 这时要改搜拼接片段或构造点。

| 构造 | 原码形态 | 搜什么 |
| --- | --- | --- |
| ① **`setInterval` + 字符串拼接** | `setInterval(function(){ Function("Function(arguments[0]+\"bugger\")()")("de") }, 2000)` —— `"de"` + `"bugger"` = `debugger`，**每 2 秒触发一次** | 搜 **`bugger`**（片段）/ 搜 **`setInterval`** 的调用点；`Function` 里再套 `Function` 是强信号 |
| ② **把 `debugger` 当参数传给构造方法** | `check(debugger)` 一类，`debugger` **不是语句而是实参**，由被调方构造执行 | 只能 hook **`Function.prototype.constructor`**（在页面脚本**之前**注入），见下 |

**hook 写法（`52pojie-1590803` 原码，Fiddler / 响应改写 / 早期注入三处都适用）**：

```js
Function.prototype.constructor_ = Function.prototype.constructor;
Function.prototype.constructor = function (a) {
  if (a == "debugger") { return function () {}; }   // 把 debugger 换成空函数
  return Function.prototype.constructor_(a);
};
```

★ 两条纪律：

1. **必须在页面脚本之前注入**（后注入等于没注入 —— 反调试逻辑已经跑过一遍）。
2. 与「DevTools 里点 Deactivate breakpoints」**不等价**：那只让当前会话不断，页面仍能检测到并走别的分支。

### 2.2 ★★★ 环境守卫：让「本地复现值」静默错（B43 新增）

**触发信号：扣出来的函数在本地算出的值和服务端不一样，而且不报错。**
这是「扣代码」路线最容易白干一天的地方 —— **先怀疑守卫，再怀疑算法**。

| # | 写法 | 现象 | 处置 |
| --- | --- | --- | --- |
| ① | **整段函数定义**包在 `if (location.host 命中白名单) {…defs…} else { top.location.href = "…" }` | 在 Node 里跑 ⇒ **函数根本不存在**（`ReferenceError`，不是静默） | 搜 `top.location.href`；补 `location.host` 或在浏览器里跑 |
| ② | **函数体内**先判白名单，**非白名单就把形参替换成硬编码假值** | **算法照跑、不报错、结果全错**（实测假值形如 `"dwvzv142x454fe54sa"` / `"asdsad541sdsa1"`） | 用正则搜「**给形参直接赋字符串常量**」这一形态；或**在浏览器里对拍入参** |
| ③ | 「**反格式化**」：检测自身是否被 pretty-print，命中就进死循环 / 内存爆破 | 一格式化就卡死、浏览器崩溃 | **不要格式化**（DevTools 的 pretty-print 也算）；改在压缩态下打条件/日志断点；或**只扣需要的片段** |

- ★ 写法② 的判据可机械化：把「`形参名 = "字面量"`」当一条正则在扣出来的源码里扫一遍，
  **命中的函数一律先在浏览器里对拍一次入参**再采信。
  ⚠️ 与「`btoa` 前给形参赋默认值」**形态相同、意图相反**（那处是兜底、这处是投毒）⇒ **不能只看形状**。
- ⚠️ 写法③ 是**单源**（`52pojie-1590803`）：源文只说「会检测你是否格式化」，**未给出检测代码**
  ⇒ 只登记现象与处置纪律，**不声称已知其检测机制**。
- ★ 真机验证（B43，`b43-browsercli-validate.js` G8 组）：`location.host` 在真实浏览器里可读，
  且「非白名单 ⇒ 静默替换入参」的产物**仍是合法 base64**，调用方看不出错。

---

## 3. 为什么优先用响应改写而不是 DevTools 的 Overrides

DevTools 的 Local Overrides 需要目录授权、且对**动态 URL**（带 token/时间戳）不生效。mitmproxy 的 `response` 钩子是纯文本替换，稳定、可脚本化、可回归。

```python
# main.py
import mitmproxy.http, re

def response(flow: mitmproxy.http.HTTPFlow):
    if flow.request.url == 'https://www.example.cn/':
        html = flow.response.text
        html = html.replace('txsdefwsw();', '// txsdefwsw();')
        html = html.replace(
            "document.write('检测到非法调试, 请关闭调试终端后刷新本页面重试!');",
            "return; document.write('检测到非法调试, 请关闭调试终端后刷新本页面重试!');",
        )
        flow.response.text = html
    elif 'html/city_realtime.php' in flow.request.url:
        js = re.findall('eval\(.+', flow.response.text)
        if js:
            flow.response.text = flow.response.text.replace(js[0], '// ' + js[0])
```

```bash
pip install mitmproxy
mitmdump -q -p 8888 -s main.py     # -q 静默 / -p 端口 / -s 脚本
# 系统代理指向 127.0.0.1:8888
```

要点：

- **替换串必须逐字符来自真实响应**。先用断点把原串打印出来再复制，不要凭截图手打（空格、标点、单双引号都可能是坑）。
- 匹配用「最独特的子串」，不要用整行；换行/缩进在压缩后的 HTML 里不可靠。
- 先只改一处、验证生效，再叠加下一处。一次改三处，出错时无法归因。

### 3.1 FiddlerScript 的 `OnBeforeResponse` 通道（Windows 侧等价物）

mitmproxy 需要 Python 环境；Windows 上更顺手的等价物是 Fiddler 的**规则脚本** `CustomRules.js`（`Rules → Customize Rules`，
语言是 JScript.NET，语法按 ECMAScript 用即可）。它的关键优势是**运行状态下改脚本、重新编译，不需要重启 Fiddler**
（`52pojie-1208999` 源文引述《Fiddler 调试权威指南》）。

**Session 处理函数按下列顺序执行**（源文逐条列出，**注入点在 `OnBeforeResponse`**）：

| 顺序 | 函数 | 时机 |
| --- | --- | --- |
| 1 | `OnPeekAtRequestHeaders` | 收到客户端**请求头**之后 |
| 2 | `OnBeforeRequest` | 收到**请求体**之后（此后请求转发给服务器） |
| 3 | `OnPeekAtResponseHeaders` | 收到服务器**响应头**之后（此后响应头转发给客户端） |
| 4 | **`OnBeforeResponse`** | 收到服务器**响应体**之后（此后响应体转发给客户端）← **改响应体在这里** |
| 5 | `OnReturningError` | Fiddler 自身产生的错误信息返回给客户端时（用于定制客户端看到的错误） |

> ★ **必踩的坑**：**所有**经过 Fiddler 的请求都会走 `OnBeforeResponse`，跨域资源也不例外。
> 源文原话：「这就要求你自己对请求进行筛选，否则将会对**所有请求**都执行对应的操作」。
> 源文的最小筛选口径是 **主机名 + 响应类型双条件**（JScript.NET 原样）：

```
if (oSession.HostnameIs("<目标域名>") && oSession.oResponse.headers.ExistsAndContains("Content-Type", "html")) { … }
```

> ⚠️ 不要拿 `HostnameIs` 去匹配路径（它只比主机名）——同一条坑在
> `../../target-analysis/references/capture-layer-tooling.md` §2 已由另一源文书证过。

**这一侧的 API 清单**（`GetResponseBodyAsString` / `utilSetResponseBody` / `GetRequestBodyAsString` /
`utilSetRequestBody` / `oSession.oRequest["Cookie"]` / `ui-color` / `utilDecodeResponse` 等）见
`../../target-analysis/references/capture-layer-tooling.md` §2，**本节不重复登记**，只讲"用它做反调试对抗"的配方（见 §5.7）。

---

## 4. 动态加密响应体的「解密 → 反混淆 → 再加密」回写

有些站点返回的是**加密过的 JS**（不是混淆）。此时直接反混淆后塞回去，页面必然报错——因为原本是密文。必须做完整闭环：

```python
def response(flow):
    if 'flow/ov1' not in flow.request.url:
        return
    data64 = base64.b64decode(flow.response.content)
    x = reduce(lambda n, m: n ^ m, [32] + list((cRay + "_0").encode()))
    # 解密
    dedata = bytes([((data64[i] & 255) - x - i % 65535 + 65535) % 255 for i in range(len(data64))])
    # ...对 dedata 做 AST 反混淆...
    # 加密回写：解密是减，加密就是加
    endata = bytes([(plain[i] + (i % 65535) + x) % 255 for i in range(len(plain))])
    flow.response.set_content(base64.b64encode(endata))
```

三条硬性要求：

1. **解密与加密必须严格互逆**。写完用「原始密文 → 解密 → 加密」跑一遍字符串比较，不一致就重写，不要靠页面报错来发现。
2. 请求体同理。想看提交了什么或想改请求体，一样要解密再加密回写。
3. 「压缩」不要误判成「加密」。有的站点用的是 **LZString 压缩 + 非标准 base64 编码表**：
   - Python 的 `lzstring` 库**不能直接用**，要先按站点的编码表改源码。
   - 判据：解出来是可读 JS/JSON 且长度明显变长 → 是压缩，不是加密。

---

## 5. 每次访问都变的 JS：把逻辑还原成 Python

关键判据（来自真实案例的结论）：**JS 会变，但接口的加密逻辑不变**。所以路线是：

```
不要扣代码（每次变 → 明天就失效）
要提取"这次请求里用到的那几个常量与调用"，用正则 + 本地重写实现同一逻辑
```

执行步骤：

1. 从接口 HTML 里正则提取脚本 URL（如含 `/js/encrypt_` 的 `src`），下载。
2. **逐层剥 `eval`**，直到拿到明文 JS：
   ```python
   while data.startswith("eval("):
       # 把 eval 的参数包成 console.log 交给 node 执行，拿回结果
       open('temp.js','w').write('console.log(' + data.strip()[5:-1] + ')')
       data = subprocess.run(['node','temp.js'], capture_output=True).stdout.decode().replace('\n','')
       if 'dswejwehxt(dswejwehxt' in data:      # 双层 base64
           s = re.findall(r'(?<=dswejwehxt\(dswejwehxt\().+?(?=\))', data)[0][1:-1]
           data = base64.b64decode(base64.b64decode(s.encode())).decode()
       elif 'dswejwehxt(' in data:              # 单层 base64
           s = re.findall(r'(?<=dswejwehxt\().+?(?=\))', data)[0][1:-1]
           data = base64.b64decode(s.encode()).decode()
   ```
3. **用 Babel 统一格式化成非压缩代码**（未格式化的代码做正则匹配极不友好）：
   ```js
   const parser = require("@babel/parser"), generate = require("@babel/generator"), fs = require("fs");
   console.log(generate.default(parser.parse(fs.readFileSync('temp.js','utf8')), {
     compact: false, comments: false, jsescOption: { minimal: true }
   }).code);
   ```
4. 正则提取「key/iv/算法选择」这类常量与分支判据：
   ```python
   appId = re.findall(r"(?<=var appId = ').+?(?=')", data)[0]
   if 'param = AES.encrypt' in data:
       keyid = re.findall(r'(?<=param = AES\.encrypt\(param, ).+?(?=,)', data)[0]
       key = re.findall(r'(?<=const )' + keyid + r' = ".+?(?=")', data)[0].split('"')[-1]
   elif 'param = DES.encrypt' in data:
       ...  # 同一套正则改算法名
   ```
5. **密钥派生往往不是直接拿 key**，而是先摘要再切片。真实案例：
   ```python
   secretkey = MD5.new(key.encode()).hexdigest()[16:]   # AES 取摘要后 16 位
   secretiv  = MD5.new(iv.encode()).hexdigest()[:16]
   # DES 则是 [:8] 与 [24:]
   ```
   看不出规律时，按 `字节长度`反推：AES-128 要 16 字节、DES 要 8 字节，切片位置自然就出来了。
6. **响应解密常是链式的**：先 AES 解一次，结果再 DES 解一次，最后 base64 解一次。按调用栈顺序照抄，不要按自己的直觉排序。

### 两层（VM 内）代码的获取

若第一层 `eval` 出来的代码里还有一层 `eval`，第二层**必须让第一层主动跑起来才能拿到**。流程：

```
拦截首层 HTML/JS → AST 反混淆第一层
→ node 本地主动执行第一层，把生成出来的第二层代码 dump 成 json
→ 反混淆第二层
→ 把反混淆后的第二层嵌回第一层的对应位置
→ set_content 回写
```

mitmproxy 里直接串起来：

```python
def response(flow):
    if 'new_house.html' in flow.request.url:
        open('new_house.html','wb').write(flow.response.content)
        os.system('node astfangdi_init')                       # 1) 反混淆第一层
        jscode = os.popen('node fangdi_init').read().replace('\n','')   # 2) 主动执行拿第二层
        open('fangdi_init.json','w',encoding='utf-8').write(jscode)
        os.system('node astfangdi2')                           # 3) 反混淆第二层
        os.system('node astfangdi')                            # 4) 把第二层嵌回第一层
        flow.response.set_content(open('new_house_decrypt.html','rb').read())
```

回写后在第二层代码里**任意位置下断点**即可，不用再设事件监听断点。

### 5.7 注入式反调试对抗四条（都来自 `52pojie-1208999` / `52pojie-1496350`）

上面的 §4 与本节是**两条不同颗粒度的路线**，先分清：

| 路线 | 改什么 | 要不要"再加密" | 持久性 |
| --- | --- | --- | --- |
| §4 闭包回写 | **脚本本体**（解密 → 反混淆 → 再加密） | **要**（必须严格互逆） | 一次改写，长期有效 |
| 本节 ① | **只在 `eval` 执行的那一瞬间改它的实参** | **不要** | 每次响应都要注入（由中间人自动完成） |

**① 在 `eval(string)` 之前改它的实参 —— 可以完全跳过解密算法**

原理：这类站点的 `debugger` **不在静态 JS 文件里**，而在"解密后准备送进 `eval` 的字符串"里。
脚本本体仍有解密算法，但**在 `eval` 执行的前一瞬间，那个字符串已经是明文** —— 在这一点上动手，**解密算法可以完全不管**。

定位**不能靠变量名**（变量名/数字都是动态生成的），要靠**语法特征**。源文给的正则（`52pojie-1208999` 原样）：

```
/\bret\s*=\s*[\w\$]+\.call\([\w\$]+,\s*([\w\$]+)\)/
```

第 1 个捕获组就是 `eval` 的实参变量名；随后把 `eval(<该变量>)` 换成 `eval(<去过 debugger 的变量>)`。
源文的注入是**两步**：先 `var rmDbg1Res = <arg>.replace(/\bdebugger\s*;/, '');`（只删第一条），
再用第二个正则把另一处"赋值型反调试"**整块**替换成 `<var> = false;`，最后才把 `eval` 的实参换成处理后的变量。

> ⚠️ **`debugger` 不止一处，而且触发源不同**。源文实测该站有**两处**：一处由**鼠标事件**（`MouseEvent`）触发，
> 一处由**定时器**（`setInterval`）触发；两处都在 `debugger` 前后用 `new Date().getTime()` 做**时间差判定**。
> ⇒ **只顺着堆栈拆掉第一处是不够的**，要按**触发源**各找一遍（"事件 / 定时器各一"是这类站的常见配置）。

**② 以牙还牙：注入 `debugger` 做动态断点**

动机：动态脚本**在 DevTools 里留不下断点位置**（每次都是新的 `VM<编号>`），于是"无法反复调试"。
做法：用同一套正则把 `debugger` **注入**到目标位置 —— 断点位置由**你的中间人规则**决定，与 DevTools 无关。

> 同一招的另一种落点：**把脚本替换成本地固定副本，再在自执行脚本开头手插 `debugger`** ——
> 见 `../../web-js-env-patcher/references/ruishu-botgate.md`（瑞数 §3 入口定位）。
> 两者是"**规则注入**"vs"**固定副本**"的取舍：前者免维护副本、后者断点更稳。

**③ 用本地桩替换线上页面，先拿到"能调的环境"**（`52pojie-1496350`，猿人学第 10 题）

两条 AutoResponder 规则（源文原样）：

```
EXACT:https://<目标站>/match/10   ->  http://127.0.0.1:5000/10
regex:https://<目标站>/eval.*?    ->  http://127.0.0.1:5000/eval
```

★ **验收判据（源文口径）**：配好规则后重开首页**数据仍能正常加载**，并且按 F12 **不再进入无限 debugger**
⇒ 调试环境已经搭好。这两条同时成立才算成功（少了第一条，你以为在调线上，其实页面是残的）。

> 操作路径与"两个勾"见 `../../target-analysis/references/capture-layer-tooling.md` §3。
> 其中 **`Unmatched requests passthrough` 必须勾**，否则没命中的请求被拦死，页面表现为"莫名其妙地坏了"。

**④ 两份 `eval` 字符串对比找变量**（同源）：动态脚本的变量名会在两次下发之间变化 ——
**把两份 `eval` 出来的代码 diff 一遍**，变化的标识符就是"本次运行的变量名"，比逐个猜快。

### 5.8 扣代码阶段的运行期对拍与环境检测处置（`52pojie-1496350`）

**★ 浏览器 ↔ Node 的「`case` 号」对拍**

控制流平坦化的 VM（或"多个函数合并的大型控制流"）扣代码时，**把依次执行的 `case` 编号打印出来**，
浏览器与 Node 两边**逐项比对**。源文原话的用途是「**以免误入歧途**」——
只看最终结果，很容易把"过程完全不同但结果偶然一致"当成成功。

> 这是**没有 Trace 基建时的人工 timeline 对拍**。正式版（机器可验证的 contract + sequence hash）见
> `../../web-js-env-patcher/references/trace-runtime-conformance.md`；那边是重型闭环，这边是十分钟能上手的手工版。

**环境检测的处置范式：把检测的返回值改写成常量（最小干预）**

| 检测对象 | 源文里的形态 | 处置（源文原样） |
| --- | --- | --- |
| `userAgent` | `... _yrxWeF[...].userAgent.indexOf(...) !== -1 \|\| ...` 整行赋给 `_yrxTY4` | 把整行注释掉，紧跟其后写 `_yrxTY4 = false;` |
| `HeadlessChrome` | `/HeadlessChrome/.test(...) \|\| ... === ''` → `_yrxTY4` | 同上，写 `_yrxTY4 = false;` |
| DOM 探针 | `function _yrxWxt()` 里 `createElement('div')` 造元素 + `while` 循环追加 + cookie 检测 | **函数体整段注释掉，只留 `var _yrxrqQ = 3`**（返回值写死） |

> 原则与 §8 一致：**只写死返回值，不删整段逻辑** —— 删掉会连带删掉正常业务分支，结论会失真。
> 源文自陈「**还有很多就不列举了**」⇒ 上表是**样例而非全集**；检测面清单见
> `../../web-js-env-patcher/references/high-strength-browser-detection.md`。

---

### 5.9 ★★ 「动态文件名 + VM 内脚本」的本地替换与 `//@sourceURL` 命名

> **来源** `52pojie-1565766`（赛尔号启航手游，egret 引擎，2021-12）。
> 这一节解决两个**只在游戏/引擎类站点上出现**的阻碍：**文件名每次都变**、**脚本在 VM 里改不了**。

**阻碍一：入口 JS 的文件名带时间戳**

```text
静态页里几乎没有 JS，只调用一个 bootstrap+<时间戳>.js，
它再用 document.appendHead 动态加载 base/lib/env 等一串同样带时间戳的文件
⇒ 上一次下的断点，下次打开就没了（文件名变了）
```

> ★★ **处置**：用 **DevTools 的本地替换（Local Overrides）**，把那个文件**固定成一个名字**。
> 原理（源文原话）：「浏览器会先检查本地是否有要请求的资源，如果有就不会向服务器请求」。
> ★ 配套判据：`base` / `lib` / `env` 这几个包**大部分是引擎库代码** ⇒
> **对照引擎官方文档在关键函数下断点**（如「发送事件的函数」「加载 2D 骨骼动画资源的函数」），
> **不要试图读完整库**。

**阻碍二：真正想改的文件在 VM 里，本地替换不生效**

```text
WS 发包文件形如 socket<一串数字>.js，但它出现在 VM 里
⇒ 无法本地替换
```

> ★★★ **处置（本节最值钱的一条）**：**往上找「加载它的那个非 VM 的 JS」**，
> 在那个**HTTP 响应内容的最后一行**追加：

```js
//@sourceURL=<随便起个名字>.js
```

> 再让它执行原本的 `document.appendHead` ⇒ **这段脚本就被命名成可替换的具名文件了**。
> ⇒ **判据：`//@sourceURL` 的作用是「给无源脚本一个虚拟文件名」，从而把「不可替换」变成「可替换」。**

**定位发包函数的省力动作**

| 动作 | 说明 |
| --- | --- |
| 在 Network 面板选 **WS** 过滤 | 高版本 Chrome 能看到 WS 帧（本样本**未加密、明文**） |
| 点一条 WS 记录 → **发起程序（Initiator）** | 直接落到发包文件 `socket<数字>.js` |
| 在发包文件里搜 **`sendmessage` / `receivemessage`** | 一步定位发包与收包函数 |

**★ 最后一条「真·简单粗暴法」（可迁移到所有引擎类小游戏）**

源文发现站点**暴露了大量全局变量**，于是直接在控制台调用业务 API，**完全跳过模拟点击**：

```js
MFC.battleManager.pveFight({"id": 11, "type": 17, "catchPet": 0, "battleType": 3})
GlobalSocket.PROTOCOL_SOCKET.send(1110, {"levelId": 80, "loop": 10})
```

> ★★ **可迁移判据**：**引擎类站点的业务对象常常挂在全局上** ⇒
> **先枚举全局（`Object.keys(window)` 过滤可疑命名空间），再决定要不要逆协议**。
> 能直调 API 就不要模拟点击 —— 与 `AGENTS.md` 的「能复用就不重走」同源。

---

## 6. 参数溯源三元分类法

面对一大串看不懂的提交参数（登录/下单类接口），先把它们**三分类**再动手，能省掉一半时间：

| 类别 | 判据 | 处置 |
| --- | --- | --- |
| **固定值** | 刷新几次都不变 | 直接写死 |
| **上次返回** | 与上一个接口响应里的某字段同名 | 记录「前置接口 → 字段」的依赖关系 |
| **JS 计算** | 其余 | 逐个下断点 |

定位技巧：

- **挑最生僻的参数名搜**（如 `prelt` 比 `encoding` 好搜十倍），命中率最高。
- 搜「带点带空格的赋值」限定对象属性：`.servertime =`（前面带 `.`、后面带空格和 `=`），可绕开大量同名局部变量。
- 找到加密对象后用 `.call(obj)` 反查定义：搜索 `.call(`，把「被 `call` 进去的函数整体」一起扣走。
- **注意「上次返回」也是可计算的**。真实案例里 `servertime` = 上次返回的值循环 `+2`（间隔毫秒 / 2），`prelt` = 上一次请求的本地耗时减云端耗时，可以随机化。这类参数不必精确复刻，只要落在合理区间。

> **登录 / 账号体系**（密码加密 + 表单参数 + 会话令牌）在这一节之上还有一套**专有**的清单与判据 ——
> **服务器下发字段的具体名单**（`formhash` / `csrf` / `execution` / `token_id` / `uuid` /
> `pwdDefaultEncryptSalt`）、**密码加密族判据表**（MD5 链四形态 / base64 / AES / DES / RSA）、
> **提交形态两段式（明文框 + 隐藏字段）**、以及 `charCodeAt & 0xff` 与 `CryptoJS.MD5` 的口径差：
> 见 `12-login-and-account-params.md`（该文是登录提交参数的唯一权威源）。

---

## 7. 失败模式表

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| 改了响应但页面没变化 | 目标走了 Service Worker / 强缓存 | 勾选 Disable cache；或在 SW 的 `fetch` 里加钩子 |
| 注释掉 `debugger` 后出现新的断点 | 站点有多层反调试，L1 → L2 → L3 | 按 §2 逐层拆，每层刷新后重新定位最上层堆栈 |
| 反混淆结果塞回去页面报错 | 原响应是**加密**的，不是混淆的 | 走 §4 的闭环：解密 → 反混淆 → 再加密 |
| 解密后再加密对不上原始密文 | 解密公式抄错（模运算 / 异或序） | 用「密文→解密→加密」做字符串相等断言，锁定是公式问题 |
| 正则匹配不到 key | 代码未格式化，或压缩后标识符被改名 | 先过 Babel 格式化；改用 AST 按 `CallExpression` 语义匹配 |
| 扣下来的 JS 明天就跑不了 | 目标是动态下发 JS | 改用 §5：只还原逻辑为 Python，不扣代码 |
| 第二层代码 dump 不出来 | 第一层需要浏览器环境才肯执行 | 先做最小补环境（转 `web-js-env-patcher`），或直接在第一层末尾注入 dump 语句 |
| `debugger` 删掉一处后仍在**别处**断下 | 站点有**多处** `debugger`，且触发源不同 | 按**触发源**（鼠标事件 / `setInterval`）各定位一遍，各自注入（§5.7 ①） |
| 本地桩替换后页面数据加载不出来 | AutoResponder 没勾 `Unmatched requests passthrough`，未命中的请求被拦死 | 勾上；见 `../../target-analysis/references/capture-layer-tooling.md` §3 |
| 响应注入"这次生效、下次失效" | 站点是**动态下发脚本**，每次响应都要重新注入 | 把注入写成中间人规则（§3.1 / §5.7 ①），不要指望改一次管很久 |
| Node 复算的中间值与浏览器不一致（最终结果却一样） | 控制流平坦化 VM 的 `case` 走向不同 | 打印 `case` 序号序列逐项对拍（§5.8），别只看最终结果 |

---

## 8. 反例黑名单

- **不要用 DevTools 的「Deactivate breakpoints」当作绕过**。它只影响当前会话，刷新即失效，且掩盖了失败分支的真实行为。
- **不要手打要替换的字符串**。必须从真实响应里复制（§3）。
- **不要删掉反调试的整段逻辑**。它后面往往跟着正常业务分支，删了会导致页面行为改变、结论失真；只做最小干预（插入 `return;` / 注释调用点）。
- **不要在同一轮里既改请求体又改响应体**。出错时无法判断是上游还是下游。
- **不要把「能跑通一次」当作完成**。动态 JS 类目标的验收标准是「连续 N 次（N ≥ 3）跑通且中间不重新扣代码」。
- **不要在没确认授权的情况下改写第三方站点响应并提交数据**。改写仅用于本地调试定位，提交前必须回到授权范围内的自有目标。
- **不要以为"删掉了一个 `debugger`"就拆完了**。源文站点实测有**两处**，且触发源不同（鼠标事件 / `setInterval`）。
- **不要靠变量名去定位动态脚本里的注入点**。变量名每次下发都变，匹配必须落在**语法特征**上（§5.7 ① 的正则）。
- **不要在扣代码时凭"最终结果对了"收工**。中间过程也要对拍（`case` 号序列，§5.8）——"结果偶然一致"最容易被当成成功。
- **不要为了省事把检测函数整体删掉**。把返回值写成常量即可（§5.8），删掉会连带影响正常分支（§8 同条原则）。
