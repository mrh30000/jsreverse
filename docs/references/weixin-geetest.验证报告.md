# 《某验4五子棋逆向py纯算》验证报告

- 被验证文章：`references/weixin-geetest.md`（猿人学公众号，王平，2026-09-07）
- 原文地址：<https://mp.weixin.qq.com/s/P9bWMSC3Yvf19Coe_noTkg>
- 验证时间：2026-09-07 21:25–21:40 (+08:00)
- 验证对象版本：极验 `static_path = /v4/static/v1.9.7-0ad79a`（验证当天从 `static.geetest.com` 实下）
- 验证方式：真实 `load/verify` 端到端跑通 + 对下载的 `gcaptcha4.js` 做文章同款 AST 解混淆 + 消融实验

## 一、总体结论

**文章主干成立**：AST 解混淆思路、`w` 的构造（AES-CBC + RSA）、`pow_msg/pow_sign`、切片字段、五子棋求解算法，全部在官方 demo 上真实跑通，拿到 `pass_token / captcha_output`。

**但有 6 处错误或必须纠正的描述**，其中 2 处会让读者按文章代码直接跑挂（文章自带正则 0 命中、`w` 加 `_` 报 `param decrypt error`）。

端到端结果：`"result":"success"` 累计 **9/9**（核查补记又追加 4 次基线，无一次失败）；消融样本见 §二·补 与 §三.5。

## 二、已证实（逐条带证据）

| # | 文章结论 | 实测证据 |
| --- | --- | --- |
| 1 | demo 站点、`captcha_id` 固定 | `gt4.geetest.com/assets/index.a4243149.js` 内 `captcha_id:"54088bb07d2df3c46b79f80300b0abbe"`，与文章 pow_msg 示例里的 captchaId 逐字符一致 |
| 2 | 首次 `load` 只需 `callback/captcha_id/challenge/client_type/risk_type/lang` | 只带这 6 个参数 HTTP 200 `status:success`；`challenge` 用随机 uuid4 即被接受 |
| 3 | 返回 `lot_number / ques / pow_detail{bits,datetime,hashfunc,version} / payload / process_token / static_path` | 实测全部存在；`ques` 就是 5×5 数组（`[[3,0,3,3,3],[0,...],...]`）；`payload_protocol:1`、`pt:"1"` |
| 4 | 五子棋 `risk_type=winlinze` | 返回 `"captcha_type":"winlinze"` ✓ |
| 5 | verify 除 `w` 外参数都能从 load 入参/返回中找到 | 实下代码 `verify` 参数集：`callback, captcha_id, challenge, client_type, lot_number, risk_type, payload, process_token, payload_protocol, pt, w`（+ 可选 `td/GeeToken`），与文章一致 |
| 6 | “混淆结构和位置固定、按结构匹配而非名字” | 实测 `ast.program.body` **恰好 6 块**，前 5 块就是 `_X.$_AO / $_Bn / $_Cl / $_Dl + function _X(){}`；`generator(body[2].expression.left).code` 自动得到 `_ᖈᕴᖙᕶ.$_Cl`（与文章字面完全相同）；只靠文章那条 `declarations.length===3 + MemberExpression + concat/shift` 结构规则，替换 **12272** 个解密调用点，`getBinding` 缺失 **0** 次 |
| 7 | 文章引用的源码片段 | `output.js` 中逐字符复现：`c=(0,_ᕺᖈᕴᖁ['default'])(_ᖆᖃᖉᖉ['default']['stringify'](_ᖄᖃᖙᖁ), _ᖀᖚᖙᖈ)`、`_ᖉᕹᕾᖀ['default'](lotNumber, captchaId, hashfunc, version, bits, datetime, '')`、`getStringByIndexes(lot, lotNumber)` → 不是照抄旧版文章 |
| 8 | “全局搜 `captcha_id` 共 7 处” | `output.js` 内 `captcha_id` 出现次数 = **7** |
| 9 | `pow_msg = version\|bits\|hashfunc\|datetime\|captchaId\|lotNumber\|\|随机串`，`pow_sign=sha256`，需前导 `00` | 服务端接受；实测 bits=8 ⇒ 前导 0 个数 = bits/4 = 2（文章硬编码 `'00'`，等价但只对 bits=8 成立） |
| 10 | `dQFB/BoHp`、切片表达式来自 gcaptcha4.js | 解混淆后明文字面出现 `_ᖃᕹᖙᕶ['_lib']={dQFB:'BoHp'}` 与 `['lib']['_abo']={"(n[5:7]+n[7:9])+.+(n[20:27])+.+(n[10:10]+n[12:12]+n[3:3]+n[7:7])": 'n[7:14]'}` —— 与文章 3.4.2 例子 **逐字符相同**（含 `BoHp`） |
| 11 | 切片语义：`+` 同层拼接、`.` 进层、`:` 赋值、`n[a:b]` 取到 b（含） | 源码处即为 `i=getStringByIndexes(lot,...)`、`o=i.split('.')`、`o.reduce(...)` 逐层建对象；按文章 `_slice_expr/build_abo` 实现提交成功 |
| 12 | AES-CBC：key=16 位随机串、iv 固定 `"0000000000000000"`；RSA：模数 `00C1E3934D…`、指数 `10001`，AES 与 RSA 用同一个 `s` | 全部按文章实现 → verify success；且 `00C1E3934D16…BAB81`（258 位 hex）与 `'10001'` 确实存在于 `output.js`（原文里是密文字符串，必须先解混淆） |
| 13 | `userresponse = [[from_y,from_x],[to_y,to_x]]` | 源码 `userresponse:[选中元素.dataId, 目标元素.dataId]`；实测返回 `wipe` 五连列表 + `success` |
| 14 | 各验证码类型共用同一套加密，只是 `userresponse` 不同 | 同一份 `w` 构造下：`risk_type=slide` 返回 `result`、`wait` 返回 `result:"fail"`（**不是解密错误**）⇒ 参数线一致、差别只在答题 |
| 15 | 五子棋求解 `find_move`（枚举 4 色 × 每子 × 每空格，判五连） | 直接照抄文章 Python，5/5 通过 |

## 二·补 核查补记（第二轮自核，2026-09-07 21:52–22:05）

对第一轮结论逐条复查，1 条加强、2 条修正措词、无结论推翻：

| 复查项 | 结果 |
| --- | --- |
| RSA 模数与文章常量**逐字符**对比 | 完全相等（258 hex）；且 `output.js` 中 `'10001'` 1 次、原始 `gcaptcha4.js` 中 `10001` **0 次** → “必须先解混淆才能拿到密钥常量”成立 |
| 切片 `n[a:b]` 是否含右边界 | 源码直接证实：`getStringByIndexes` 内部 `end = args.length>1 ? args[1]+1 : args[0]+1; target.slice(start,end)` → 文章“等价于 `slice(m, n+1)`”字面成立（`n[10:10]` → 单字符） |
| 消融实验可复现性 | `--noabo` 3/3 `forbidden`；`--nolib` 3/3 `success`；基线共 **9/9 `success`** |
| `w` 无分隔符 | 基线 9/9 vs `--sep` 1/1 `-50002` → 结论未动 |
| **修正**：§五 “slide 假答案也返回 success” | 实测 6 次 = **3 success / 3 fail**（非稳定直通），表述已改为“随机放行” |
| **修正**：§三.5 pt 分支 | 补上服务端实测：`pt=0`/不传 `pt` 均被拒 → 只能当客户端代码路径事实，不能当可用提交方案 |
| 报告内数字 | `gcaptcha4.js` 1,047,303 B / `output.js` 1,322,405 B / 12272 调用点 / 0 binding miss / `captcha_id` 7 处 / 音节文字 176,832 个 — 均重跑校对一致 |

## 二·补二 浏览器整包替换验证（文章 2.7 已证实，2026-09-08 10:56–11:12）

第一轮把 2.7 列为未核查（proxycli daemon 当时挂了）。补测完成：

**方法（等价于“把 output.js 换回网页里的 gcaptcha4.js”，且更干净：不改任何 vendored 文件）**

- `geetest/browsertest/replace_server.py`：本地 8799 端口的反向代理，只把 `^/v4/static/<ver>/js/gcaptcha4\.js` 返回本地解混淆版（`mode.txt` 写 `orig` 则回源原始混淆版），其余 `static.geetest.com` 资源原样反代，`/load`、`/verify` 反代到 `gcaptcha4.geetest.com` 并落盘 `api_log.jsonl`。
- `geetest/browsertest/index.html`：加载 **官方原版 gt4.js**（经反代，未打任何补丁），`initGeetest4({riskType:'winlinze', product:'float', staticServers/apiServers 指向 127.0.0.1:8799})` + `appendTo('#captcha')`。
- 真实 Chrome 里用 CDP 真实鼠标事件点格子，不调用页面内部函数。

**实测链路（全部经我自己的代理，日志可查）**

1. `/load` → `captcha_type:winlinze`、`lot_number=827db76557124fdd947054...`、`ques=[[0,3,0,0,0],[3,4,0,0,0],[4,2,4,4,2],[1,1,0,1,1],[0,0,4,3,1]]`
2. 解混淆 bundle 渲染出完整五子棋 UI（`geetest_item-{r}-{c}-bg`、`geetest_subitem`、“请移动棋子形成同色五子连线”）
3. 用文章 `find_move` 算出 `[[4,4],[3,2]]` → 真实点击 `(4,4)` 再点 `(3,2)`
4. `/verify` → `"result":"success","fail_count":0,"wipe":[[3,0],[3,1],[3,3],[3,4],[4,4]]` + `seccode`（pass_token/captcha_output）

**结论**：文章 2.6.3 那套“按结构定位解密函数 + referencePaths 全量替换”产出的 `output.js`，在真实浏览器中功能完全等价（能加载资源、渲染 UI、自己生成正确的 `w` 并通过校验）。这比用 Python 复算 `w` 更强：说明解混淆过程没有损坏任何加密常量、切片表、i18n/CSS 加载逻辑。

**踩坑备注**（下次做同类验证直接避开）

- 官方 demo 用 `product:'float'` + `captcha.appendTo('#captcha')` 才渲染；只调 `showCaptcha()` 不给容器 → 静默无 UI（不算 bundle 问题，对照原始混淆版同样不渲染）。
- 该 Chrome 装了 8+ 个扩展，proxycli `evaluate_script` 因 16 个 content-script 上下文无法定位主世界而报 `目标对象可能位于扩展 content script 隔离上下文`；改用 `query_dom` + `click_at`（CDP 真实鼠标）+ 本地反代理日志即可完全绕开。
- `python -m http.server` 与自建反代都要给 `Cache-Control: no-store`，否则改 index.html 后浏览器仍拿旧页（本会话已踩过）。

## 三、不成立 / 需纠正

1. **`w` 里没有 `_` 分隔符（3.4.3 标题写错，且与四.11 自相矛盾）**
   真实代码：`return (0, arrayToHex)(c) + u;`（`u` 本身已是 256 位 hex）。
   实测：`w = aesHex + "_" + rsaHex` → `{"status":"error","code":"-50002","msg":"param decrypt error"}`；不带 `_` → `success`。文章四.11 的 `w = res1 + res2` 是对的。
   另：`arrayToHex` 是对 **AES 结果 c** 调用的，不是标题里的 `arrayToHex(u)`。

2. **文章自带的正则提取跑不通（致命，按原文抄就挂）**
   `\['_lib'\]\s*=\s*(\{.*?\})(?=,|;)` / `\['lib'\]\['_abo'\]\s*=\s*(\{.*?\})(?=,|;)` 未加 `re.S`，而文章 step1 的 generator 用 `compact:false, retainLines:false` → 对象被输出成多行，`.` 不跨行。
   实测两个正则命中 **False/False**（`geetest/gt4_article_check.py` 的 `extract()` 原样复现）。
   修法二选一：正则加 `re.S`；或 generator 用 `compact:true`。
   附带：文章 `load_extracted_values` 里“output.js 不存在就回退从 gcaptcha4.js 提取”这条兜底是死代码——未解混淆的原文里 `_lib`/`_abo`/`biht`/`getStringByIndexes` 明文出现 **0 次**。

3. **`dQFB`（`_lib`）并非必需；只有 `_abo` 切片字段是硬门禁**
   消融（各 3 次，可复现）：去掉 `dQFB` → **3/3 `success`**；去掉切片字段 → **3/3 `forbidden`**。
   文章“这两个字段缺失或错误会导致 verify 直接失败”只对后一半。

4. **`biht:"1426265548"` 在当前版本已经不存在**
   `gcaptcha4.js` 与解混淆后的 `output.js` 全文 `biht`、`1426265548` 命中 **0 次**；实测带上它服务端也不报错（容忍未知字段），不带上也过。它是历史残留，不该作为“固定值”长期写死，读者会误以为需要维护。

5. **“第二个参数 b 没起到作用”——错**
   真实实现 `function i(payload, captcha)`：
   - `var n = captcha['options']; if (!n['pt'] || n['pt']==='0') return urlsafe_encode(payload);` ← **pt 缺省时整段 payload 只做 urlsafe base64，完全不加密**；
   - `var r = {1:{symmetrical:..., asymmetric:...}, 2:{symmetrical: new AES({key:s,mode:'cbc',iv:'0000000000000000'}), ...}}` ← `pt` 用来 **选密钥/算法套件**；
   - `var o = '1'===n['pt']` 还控制 `while (!u || u.length!==256) { s = guid(); u = rsa(s) }` 的重试。
   当前 demo 恰好 `pt=1`，所以看起来“无作用”。写成结论会埋坑（换 `pt=2` 的站点直接错）。
   核查补记：客户端分支为真，但不能当成可用提交路径 —— 本地按该分支构造 `pt=0`、不传 `pt` 各提交 1 次（`w=urlsafe_base64(明文)`），均返回 `-50002 param decrypt error`（load 返回的 `payload/process_token` 已绑定 `pt=1`）。

6. **变量名字符集说法错**
   `_ᕺᕶᕹᕸ` 这类标识符属 **加拿大原住民音节文字 U+1400–U+167F**（`output.js` 内该类字符 176832 个），不是“CJK 兼容区”（`U+3100–U+318F` 实测 0 个）。写规则/正则时按 CJK 区写会漏匹配。

## 四、未核查（如实标注）

- ~~2.7 整包替换~~ → **已核查并证实**，见 §二·补二。
- **“每隔几天变化”**：单时点无法证；本次下到 `v1.9.7-0ad79a`。
- **3.2 “第 7 处是刷新时调用、第 6 处是校验时调用”**：7 处总数已核对，逐处调用时机未打断点核对。
- **五.说明里的滑块/文字点选成功率、偏移量、ddddocr 识别率**：属图像线，未测。
- **六、业务实战（`account.wps.cn`，captcha_id=703298677ada65c569195d173645cde7）**：未测（拿真实第三方站点跑验证不合适）。

## 五、工程风险（文章的实现层面问题）

- **用 `eval()` 直接执行下载来的 JS**：`eval(eval_code)`、`eval(path+'')`、`eval(_path.parentPath+'')`。等于把外部 JS 当本地代码跑，且替换值来自该 eval。功能上可行（本版能跑通），但应该用 `node:vm` 建沙箱——本报告配套 `ast解析/step1.js` 就是 vm 等价实现，同样 12272 个调用点、结果一致。
- **`getBinding()` 可能返回 undefined**：文章代码不判空，遇到别名跨作用域/被重赋值会 `TypeError` 直接崩。
- **`parse_lib()` 只吃无引号键**：某版本若 generator 输出 `'dQFB':` 会静默返回 `{}`，最坏情况是“字段缺失 → forbidden”这种最难查的失败模式。提取失败应显式报错，别静默降级。
- **`passtime` 500–3000 随机、无轨迹、`em` 与 `gee_guard` 硬编码**：本版 demo 未拦；真实站点带 `gct_path` 指向的 `gct4.*.js` 上报（源码里 `guard && clientType=='web'` 时会等 `options.geeGuard` 就绪再提交），照抄硬编码值大概率不够。
- **demo 通过 ≠ 算法正确**：实测 `risk_type=slide` 且 `userresponse:199`（假距离）6 次里 **3 次 success / 3 次 fail** —— demo 对滑块答案存在随机放行，不能拿 demo 的 success 当算法正确的证据（五子棋不存在随机性：`userresponse` 必须真解出，基线 9/9 才是有效证据）。

## 六、复现物与命令

```text
geetest/gcaptcha4.js                    # 实下 v1.9.7-0ad79a（1,047,303 B）
geetest/ast解析/code.js                 # 同内容，文章 step1 的输入名
geetest/ast解析/step1.js                # 文章 2.3+2.6.1+2.6.3 等价实现（vm 替代 eval）
geetest/ast解析/output.js               # 解混淆产物（1,322,405 B，12272 处还原）
geetest/gt4_article_check.py            # 文章 四.1~四.11 全流程 + 消融开关
```

```bash
node "geetest/ast解析/step1.js"          # -> target_decrypt_fn=_ᖈᕴᖙᕶ.$_Cl, replaced_calls=12272, binding_misses=0
python geetest/gt4_article_check.py                 # -> "result":"success"（累计 9/9）
python geetest/gt4_article_check.py --sep           # -> code -50002 param decrypt error（证明无 `_`）
python geetest/gt4_article_check.py --pt0           # -> -50002（urlsafe base64 分支不被当前服务端接受）
python geetest/gt4_article_check.py --nopt         # -> -50002（同上，不传 pt）
python geetest/gt4_article_check.py --nolib         # -> success 3/3（dQFB 非必需）
python geetest/gt4_article_check.py --noabo         # -> "result":"forbidden" 3/3（切片字段必需）
python geetest/gt4_article_check.py --biht          # -> success（biht 冗余、无害）
python geetest/gt4_article_check.py --risk=slide    # -> 6 次 3 success / 3 fail（假答案被随机放行）
python geetest/gt4_article_check.py --risk=wait     # -> captcha_type=svg_icon, "result":"fail"（解密正常）
```

浏览器整包替换（§二·补二）：

```bash
cd geetest && printf local > browsertest/mode.txt \
  && cp "ast解析/output.js" browsertest/output_local.js \
  && python browsertest/replace_server.py            # 监听 127.0.0.1:8799
# Chrome 打开 http://127.0.0.1:8799/index.html?fresh=1
#   → 点 .geetest_btn_svg 开始 → 按 find_move 结果点 .geetest_item-{r}-{c}-bg（先 from 后 to）
# 结果看 geetest/browsertest/api_log.jsonl 最后一行 verify 的 result
tail -1 geetest/browsertest/api_log.jsonl | python -c "import sys,json;print(json.loads(sys.stdin.read())['resp'][:200])"
printf orig > geetest/browsertest/mode.txt          # 对照组：回源原始混淆版
```
