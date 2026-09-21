# 反调试绕过与在线补丁调试（mitmproxy / 响应改写）

> 目录
> 1. 什么时候用这份文档
> 2. 无限 debugger 的三层定位与处置
> 3. 为什么优先用响应改写而不是 DevTools 的 Overrides
> 4. 动态加密响应体的「解密 → 反混淆 → 再加密」回写
> 5. 每次访问都变的 JS：把逻辑还原成 Python
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

---

## 8. 反例黑名单

- **不要用 DevTools 的「Deactivate breakpoints」当作绕过**。它只影响当前会话，刷新即失效，且掩盖了失败分支的真实行为。
- **不要手打要替换的字符串**。必须从真实响应里复制（§3）。
- **不要删掉反调试的整段逻辑**。它后面往往跟着正常业务分支，删了会导致页面行为改变、结论失真；只做最小干预（插入 `return;` / 注释调用点）。
- **不要在同一轮里既改请求体又改响应体**。出错时无法判断是上游还是下游。
- **不要把「能跑通一次」当作完成**。动态 JS 类目标的验收标准是「连续 N 次（N ≥ 3）跑通且中间不重新扣代码」。
- **不要在没确认授权的情况下改写第三方站点响应并提交数据**。改写仅用于本地调试定位，提交前必须回到授权范围内的自有目标。
