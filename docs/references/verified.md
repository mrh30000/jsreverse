# 未验证文章 → 知识蒸馏 → 技能演化 · 验证台账

> **本文件是流水线的幂等依据。**
> 扫描口径：`docs/references/*.md` 中，凡「文件」列出现过的条目视为**已处理**；其余 `.md`（排除 `README.md` 与 `*.验证报告.md`）构成**待处理队列**。
> 哈希口径：`md5(文件字节)`。同一文件名内容变更后哈希不匹配 → 视为新版本，需重新评估，不得因「文件名已在表中」而跳过。
> 处理时间：本地时区 UTC+8。变更类型：`create` 新建技能｜`evolve` 演化既有技能｜`archive-only` 流水线上线前已有独立验证报告｜`skip` 已精读但判定无对应技能。

---

## 一、批次 B0 · 存量验证报告归档（流水线上线前已完成，补登记）

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `2098573-xhs-4.3.2-jsvmp-mns0301.md` | `a9f0e9eb5087bc668642ae191b53f852` | 2026-09-11 | — | archive-only | 已有 `2098573-xhs-4.3.2-jsvmp-mns0301.验证报告.md`（本地样本 + 线上 `window.mnsv2` 核对） |
| 2 | `2100076-xhs-4.3.2-ob-deobfuscate.md` | `15aef4485000acec77653aaeb5127160` | 2026-09-11 | — | archive-only | 已有 `2100076-xhs-4.3.2-ob-deobfuscate.验证报告.md`；结论已回灌 `ast-deobfuscation`（见 B1-4 备注） |
| 3 | `weixin-geetest.md` | `9380b47543843fa2d23e0d14db578d28` | ≤2026-09-11 | — | archive-only | 已有 `weixin-geetest.验证报告.md` |

---

## 二、批次 B1 · 2026-09-20（本流水线首次执行）

取材口径：`52pojie-*` 新归档中**主题可清晰归类**且能直接落到技能库的 14 篇；按「厂商 / 技术族」聚类后一次性蒸馏，避免逐篇碎片化改动。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 4 | `52pojie-1111698-字体反爬解决方案——突破抖音字体反爬机制.md` | `7116988a8dbf9e7b606ba2476ffb6405` | 2026-09-20 | `web-font-obfuscation` | create | 字体反爬识别三线（Network/CSS/内联 base64）；单层 cmap 映射；一对多码位（每数字 3 个等价码位）；空格补位与 `w`（万）单位 |
| 5 | `52pojie-1209888-【Python 字体反爬（新手向）】简单几步学会 58 同城字体反爬.md` | `9dd36b3ed7c51578cda9807000b9e1df` | 2026-09-20 | `web-font-obfuscation` | create | 两层映射（`code↔glyphName` 变、`glyphName↔真值` 不变）；`data:application/font-ttf;base64` 内嵌字体；`&#x9476;` 实体匹配坑 |
| 6 | `52pojie-1548533-混合布尔算术运算的混淆及反混淆.md` | `4ff49db513b14c58c24e472798ddd5fe` | 2026-09-20 | `ast-deobfuscation` | evolve | MBA 真值表构造/化简；「n 位 = 1 位」引理；z3 unsat 验证；VMP `not_not_and`/`not_not_or` 万用门；`~(~x&~y)&~(x&y) == x^y` 实例 |
| 7 | `52pojie-1567312-某酷ckey签名生成算法系列--（三）ast代码控制流平坦化.md` | `18030e0989c5024425c5b34f69bed678` | 2026-09-20 | `ast-deobfuscation` | evolve | 多层位切片 dispatcher 归约（`li = C \| m<<5 \| A<<10`）；逗号表达式拆分；case 尾跳转串接 → 单 case switch → 去 switch |
| 8 | `52pojie-1379690-某5影视ts视频wasm加密分析(wasm逆向).md` | `960b55540fdf910a659abd0fb73da72d` | 2026-09-20 | `wsam-reverse` | evolve | wasm 内存语义铁律（地址来自栈顶 + 小端）；`i32.load` 逐字节还原实例；131072 分块搬运；Itanium 修饰符号名（`__ZNSt3__26__tree...`）；`pushState` 反调试 hook |
| 9 | `52pojie-1492577-某德地图矢量瓦片逆向(快速wasm逆向)，c c++ c#可调用，执行wasm2c翻译出来的c代码一.md` | `9aab4faaa858a9f8261ab3a6bed678fd` | 2026-09-20 | `wsam-reverse` | evolve | wasm2c + wasm-rt 快速逆向路线（免分析算法，多语言可调）；`passStringToWasm0` 仅支持 ASCII；导出签名与内存分配约定；wasm 加载后注入可搜索标记 |
| 10 | `52pojie-1162853-极验反爬虫防护分析之交互流程分析.md` | `6c83adb03dc38a7135f7a06ce67ac7ae` | 2026-09-20 | `web-verify-patcher` | evolve | 极验 v3 七步交互链；最小链路 `1→3→5→6→7`；`geetest_challenge/validate/seccode` 与业务请求的绑定关系 |
| 11 | `52pojie-1162893-极验反爬虫防护分析之接口交互的解密方法.md` | `58e1a1fa59d2e73d9466e41cd281810e` | 2026-09-20 | `web-verify-patcher` + `web-reverse-algorithm` | evolve | `w = base64(AES-CBC(json)) + RSA(AES key)`；AES key 由时间戳派生、IV 为 `'0'`×16 补位（非 PKCS7）；`i` 字段＝`!!` 分隔的环境数组 |
| 12 | `52pojie-1654390-网易易盾——推理拼图验证码参数逆向分析和调用.md` | `01e0534996d11a536f6d394f94b56d29` | 2026-09-20 | `web-verify-patcher` | evolve | 易盾推理拼图 `data.m/p/ext` + `cb` + `callback` 构造；JSONP 提交（XHR 断点无效）；暴露内部函数代替扣代码；GET 提交需处理空格 |
| 13 | `52pojie-1595155-【JS逆向系列】某空气质量监测平台无限 debugger 与 python算法还原.md` | `c5d9bebdca90d45936770948f419ea04` | 2026-09-20 | `web-reverse-algorithm` | evolve | 无限 debugger 三层处置（函数级注释 / `return;` 前置破 `document.write` 覆写 / 注释 `eval` 调用）；mitmproxy 响应改写；动态 JS「逻辑不变、代码变」⇒ 只还原逻辑 |
| 14 | `52pojie-1598418-某数和某5秒-反混淆动态注入调试的一种方案.md` | `fde813434feade0ae29e502ef61f6d32` | 2026-09-20 | `web-reverse-algorithm` | evolve | 「解密 → 反混淆 → 再加密」闭环回写；两层 `eval`（VM 内代码）主动执行获取流程；LZString 压缩误判为加密的判据；非标准 base64 表 |
| 15 | `52pojie-1074706-【JS逆向练习】新浪微博登录加密参数分析.md` | `5e13f97243ffdf996b80d6497c665e5c` | 2026-09-20 | `web-reverse-algorithm` | evolve | 参数溯源三分类（固定 / 上次返回 / JS 计算）；生僻参数名定位法；`.call(obj)` 反查加密对象定义；`sp = RSA(servertime\tnonce\n密码)` |
| 16 | `52pojie-1643467-[原创] Akamai保护的相关网站（IHG，TI）学习记录.md` | `3189c9cb09374fa416295fd50f5a9a91` | 2026-09-20 | `web-verify-patcher` | evolve | Akamai 三层校验（TLS/HTTP 指纹 · `sensor_data` 环境指纹 · cookie 状态机）；`*_bm=Unknown Bot` 即已被标记（「能登录」≠「过了」）；通过检测的响应会注入 `/akam/13/...` 脚本；`curl-impersonate` 对齐 JA3 |
| 17 | `52pojie-1722264-微信小程序逆向之校友邦小程序请求加密算法解析.md` | `df4e4124afbcfc9d16047ff087a40a37` | 2026-09-20 | — | skip | 已精读。知识点为「小程序包解包 → 定位请求封装 → 抄签名函数 → Postman 逐参数删减确定参与签名的字段」。当前技能库明确排除小程序（`web-js-env-patcher` 边界声明），且样本量不足以支撑独立技能 ⇒ 按「避免滥建冗余技能」约束**不建技能**，登记为已处理 |

### 本批次技能变更汇总

> ⚠️ **历史结论纠正（由 B3 回灌）**：第 11 条（B1-11，`52pojie-1162893`）当时登记的口径
> 「AES key 由时间戳派生 / IV 为 `'0'`×16 补位、非 PKCS7」**是不准确的**：
> - 该文作者在同一系列的**补遗**（B3-40，`52pojie-1162951`）里已给出实际代码，
>   key 是 4 段 `(65536*(1+Math.random())|0).toString(16).substring(1)` 拼接的**随机** hex；
> - 「用字符 `'0'` 补位」是**该作者自己 Python 复现脚本**的实现选择，不能反推站点 padding 语义；
>   2024 年实测站点侧（CryptoJS）用的是 `pad.Pkcs7`。
>
> 正确口径已写入 `.claude/skills/web-verify-patcher/references/provider-execution-notes.md` 与
> `.claude/skills/web-reverse-algorithm/references/02-algorithm-families.md`，
> 并统一注明「以固定 key/iv/明文与浏览器密文逐字节 diff 为最终判据」。

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-font-obfuscation` | **create** | 新技能：`SKILL.md` + `references/font-cmap-decode.md` + `scripts/font_cmap_dump.py`（零依赖 cmap 导出/比对，支持 sfnt/WOFF1/TTC）+ `scripts/font_glyph_fingerprint.py`（轮廓指纹跨版本对齐） |
| `ast-deobfuscation` | evolve | 新增 `references/mba-and-dispatcher-reduction.md`；`SKILL.md` 参考导航补 CFF 顺序依赖硬约束指针；`references/control-flow-reduction-rules.md` 的「状态编码与跳转表」条目补交叉引用 |
| `wsam-reverse` | evolve | 新增 `references/wasm2c-and-memory-semantics.md`；`SKILL.md` 新增路线选择表、内存语义铁律、C++ 符号还原、调试注入、F12 反调试处置；description 补触发词；失败回退表 +7 行 |
| `web-reverse-algorithm` | evolve | 新增 `references/07-antidebug-and-live-patching.md`；`references/02-algorithm-families.md` 混合加密题补「极验 v3 `w`」「微博 `sp`」；`SKILL.md` 阻塞点与导航补条目；description 补触发词 |
| `web-verify-patcher` | evolve | `references/provider-execution-notes.md` 极验补 v3 七步链与 `w` 结构、易盾补推理拼图参数构造、WAF 补 Akamai 三层结构；description 补触发词 |
| `websocket-reverse` | 附带修复 | 交叉引用 `wasm-reverse` → `wsam-reverse`（历史拼写漂移） |
| `wsam-reverse` | 附带修复 | frontmatter `name: wasm-reverse` → `wsam-reverse`，与目录名一致 |
| `web-verify-patcher` | 附带修复 | 失效引用 `references/proxycli-tools.md`（该文件实际位于 `ast-deobfuscation` 技能下）→ `../ast-deobfuscation/references/proxycli-tools.md`，2 处 |
| `web-reverse-env` | 附带修复 | 失效引用 `references/08-proxycli.md`（实际文件名为 `08-browsercli.md`），6 处 |

### 评审结论（darwin Phase 2 Step 4，paired 多数决）

- 评审方式：3 个独立 judge，各自在**同一轮内**同时读取改前（`artifacts/skill-evolution/backup-20260920-1635/`）与改后版本，按 9 维 rubric 作比较准则，回 `better/worse/tie`。
- 无 git 仓库 ⇒ 回滚基线采用文件备份（`artifacts/skill-evolution/backup-20260920-1635/`）+ `baseline-md5-20260920-1635.txt`，替代 `git revert`（darwin 异常表 fallback）。
- 逐技能票数见文末「评审记录」。

---

## 三、批次 B2 · 2026-09-20（第二次执行）

取材口径：**主题可聚簇成完整能力块**的 13 篇 —— 顶象/切片还原线 5 篇 + 验证码图像识别线 2 篇 + 易盾拼图线 1 篇 + OB/多层 switch 线 4 篇 + 混合调用/解密 oracle 线 1 篇。
按簇一次性蒸馏，同一篇可同时落两个技能（如 B1-11 的先例）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 18 | `52pojie-1665936-顶象滑块逆向分析——背景图还原分析.md` | `95c05f5abdcd1181db8d079fd771ee56` | 2026-09-20 | `web-verify-patcher` | evolve | 顶象顺序派生三件套 `En`/`_n`/`Cn`（`ord%32` + 冲突自增；`c` 覆盖 `sid`/`aid`）；canvas `drawImage` 还原语义 `target-to-source`；滑块图反相 + 高斯 + `TM_CCOEFF_NORMED` |
| 19 | `52pojie-2053068-顶象滑块验证码纯算逆向分析.md` | `cc5d8f7cec04f66736ace379f79448ed` | 2026-09-20 | `web-verify-patcher` | evolve | 5.1.53 四段链路 `c1(GET→lid) → c1(POST→c) → a(p1/p2/sid/y) → v1(token)`；`aid` 格式与一致性要求；`greenseer.js` 的 `get*` 方法族与 `app` 组装 `btoa(_ua)`；轨迹三处仅第三处强校验 |
| 20 | `52pojie-2102398-顶象滑块的x问题！.md` | `3cf75ec6802c7c2e91fb600f93cb48a5` | 2026-09-20 | `web-verify-patcher` | evolve | **视觉坐标 ≠ 提交坐标**：`视觉位置 = 10 + dx × speed`，`speed ∈ {0.9,1.1,1.2}` 随机且参与上报；`165` vs `128` 是坐标系差异而非识别错误；FFT-NCC + 亚像素高斯拟合（多尺度反而更差） |
| 21 | `52pojie-1501158-顶象无感验证码demo.md` | `3b88f65008c8824b4227d955465d52eb` | 2026-09-20 | `web-verify-patcher` | evolve | canvas 元素截图取证（先隐藏干扰元素再 `screenshot`）；显示缩放换算 `(识别位置 − 10) × 0.75`（300/400）；物理模型轨迹（加速段/减速段 + `ActionChains`） |
| 22 | `2094667-smart-hotel-slider-bg-restore.md` | `4800a8852d0fa96efb1db47ad8dc793d` | 2026-09-20 | `web-verify-patcher` | evolve | **接口下发式**顺序（`shuffle` 为 JSON 字符串、语义 `source-to-target`、2 行 × N 列）；`collectData` 的 **类 TLV + CRC32** 打包（`Length = DataLen + 3`、252 字节分片、`'|'` 连接）；**AES-CTR + nopadding**、IV 前置拼接；RSA **PKCS1v15**；`getKey` 索引从 1 起 ⇒ 永不生成 `'0'` |
| 23 | `52pojie-1583574-网易易盾—推理拼图验证的破解.md` | `3ddce5489e2b82cd9a8c93ee2d0089c5` | 2026-09-20 | `web-verify-patcher` | evolve | 真拼图（非切片乱序）⇒ **遗传算法**路线；判据是"错误拼缝处二值化后边缘趋于直线且突变明显"；二开 `individual.py` 导出 `pieceMapping`；复杂原图误差会放大 |
| 24 | `2098921-yolo-captcha-calc.md` | `49a67fd78e5ce5cc3938d4807a52eaf4` | 2026-09-20 | `web-verify-patcher` | evolve | 切片 base64 **按序拼接**（非置换）→ 二值化 + 连通域面积去噪 → Label Studio 标注 → YOLOv8 训练（**`fliplr=0.0` 必关**）→ 按 x 排序拼算式 → 白名单求值；收敛判据 `loss<0.2~0.3` / `mAP50-95≥0.9`；样本量 180+ 才稳 |
| 25 | `52pojie-2112042-YOLO识别拼图过滑块验证.md` | `4037be3cd60c241ae7ee4eb6e8ce6248` | 2026-09-20 | `web-verify-patcher` | evolve | **自举闭环**：小样本训练 → 导出 ONNX → X-AnyLabeling 自动标注 → 人工修正 → 重训；滑块只需 `max_det=1` 取拼图左下角 `x1`；"训练一次换永久免手动"的收益判断 |
| 26 | `52pojie-2099086-浅谈OB混淆及其变体特征.md` | `c68f7b149cccbc2983d997a926da92fe` | 2026-09-20 | `ast-deobfuscation` | evolve | 标准 OB 五特征 + **动态识别的两条硬判据**（数组元素全为字符串 / 解密函数含标准 base64 码表）；四类变体（掺非字符串、去自执行、乱序码表、格式化检查、多重赋值分身、字典混淆、外衣函数）逐一对策；`path.crawl()` 必要性 |
| 27 | `52pojie-2034613-某大厂waf逆向-- 用AST还原加强ob混淆壳.md` | `15420cc0abd32934b17ca347e2b2dbc8` | 2026-09-20 | `ast-deobfuscation` | evolve | 加强 OB 壳的四步 AST 配方：`path.evaluate()` 静态求值（**必须先查 `confident`**）→ 数值字典 `Pm.B → 2` 内联 → 分身归一回原名 + **导出函数主动调用** → `B[键]` 按 value 类型（字符串/代理调用/二元运算）分类还原；压缩后再加载以绕过格式化检查 |
| 28 | `52pojie-2073419-某老板直聘四层switch反混淆.md` | `80dd3c65fbe5c91430e18c11b93258cd` | 2026-09-20 | `ast-deobfuscation` | evolve | **多入口多层 switch**（起始 index 由调用传参决定）三步还原法：收集 index → 最内层插探针 → 拖进 `for` 循环取映射；两个致命坑：case index 藏在调用点、还原后**变量污染**⇒ 必须按入口拆回多个函数；新增 `patterns/zhipin-switch-pass.js` + `patterns/zhipin.md` + detector/pipeline 接入 |
| 29 | `52pojie-1450900-某视频解析分析-AST反混淆与nodejs调用.md` | `9b0a316a4c59cf5fdaf520286693ad8e` | 2026-09-20 | `web-reverse-algorithm` | evolve | **扣 JS → Node CLI 桥接**三段式（argv 切 ENCODE/DECODE、`os.popen` + 必须 strip 换行）；自定义 base64 变体 `+→- /→_ =→.` **双向对称**；常量用正则从源码提；三档路线选择判据（报 `X is not defined` 继续贴代码 / 报 `document is not defined` 转补环境） |
| 30 | `52pojie-2126833-基于chatglm的web逆向分析实例一则.md` | `68636ba3b97ca4efdbd52345cad05c09` | 2026-09-20 | `web-reverse-algorithm` | evolve | **用抓包密文做解密 oracle**：顺序固定为「读密文 → 解密 → 看明文结构 → 再写加密」；Base64 长度反推明文字节区间（CBC/PKCS7）；`Content-Length` 反推"请求体只有几个字段"；表单壳 + JSON 体必须 `separators=(",",":")` 对齐；固定 Key/IV ⇒ 相同明文密文逐字节可复现；密文对但失败时的 4 个非算法扣分项（时间戳新鲜度/前端限频/时间派生 token/固定 IV 伪防护） |

### 本批次技能变更汇总（B2）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-verify-patcher` | evolve | **新增** `references/tile-scramble-and-coordinate-mapping.md`（顺序来源三分类 + 正/逆置换语义判定 + 视觉/提交坐标换算 + 匹配算法递进）、`references/captcha-model-training.md`（切片拼接/去噪/标注/训练/自举闭环/推理拼装 + 遗传算法拼图）、`scripts/restore_slices.py`（**零依赖** PNG 读写 + 切片重排 + 语义 auto 判优 + 8 项 `--selftest`）；`SKILL.md` 导航 +2 行、description 补触发词；`solution-playbooks.md` 的 `image-restore`/`math` 补语义表与升级路线；`motion-and-coordinate.md` 补"先做坐标换算"前置；`provider-execution-notes.md` 新增顶象链路小节与第三方行为验证（tuyacn）打包格式 |
| `ast-deobfuscation` | evolve | **新增** `references/ob-variant-taxonomy.md`（OB 五特征 + 七类变体对策 + 主动调用四步配方）、`references/multi-entry-switch-reduction.md`（多入口多层 switch 三步还原 + 两个致命坑）、`references/patterns/zhipin.md`、`scripts/patterns/zhipin-switch-pass.js`（只折叠可静态确定且无 fallthrough 的 switch）；`pipeline-config.js` 新增 `zhipin` 模式、`detect-obfuscator-types.js` 新增 `zhipin` 信号；`obfuscation-detector.md` 新增"命中之后读什么"分流表 |
| `web-reverse-algorithm` | evolve | `references/06-engineering-maintenance.md` 新增 §11「扣 JS → Node CLI 桥接」与 §12「用真实密文做第一道 oracle」；`references/02-algorithm-families.md` 混合加密题补"先解方向验证"前置；`SKILL.md` 资源导航点出 §11/§12 |
| `protocol-reverse` | 附带修复 | `SKILL.md` 的 ACTION REQUIRED 明确标注 `../field-journal/`、`../scripts/case-init.ps1`、`../tool-index.md` **不在本仓库**（属父级 `open-source/reverse-skill/` 布局），并给出本仓库内的替代动作，避免后续执行者追空路径 |
| `ast-deobfuscation` | 附带修复 | `references/patterns/xiaohongshu.md` 的验证报告引用由失效的 `references/...` 改为仓库根相对路径 `docs/references/2100076-xhs-4.3.2-ob-deobfuscate.验证报告.md`（附 `../../../../../` 展开式） |
| `web-verify-patcher` | 附带修复 | `references/provider-execution-notes.md` 的跨技能引用由裸 `references/02-algorithm-families.md` 改为 `../../web-reverse-algorithm/references/02-algorithm-families.md`，消除歧义 |

### 评审结论（B2，darwin Phase 2 Step 4，paired 多数决）

- 评审方式：3 个独立 judge（A/B/C），各自在**同一轮内**同时读取改前（`artifacts/skill-evolution/backup-20260920-1807/`）与改后版本，按 9 维 rubric 作比较准则，回 `better/worse/tie` + `clear/marginal`。
- 结果：3 个技能均 **3/3 better** ⇒ 全部 **keep**。
- **评审发现的缺陷已在本轮内修复**（不是留待下轮）：
  1. `tile-scramble-and-coordinate-mapping.md` §2 误用 `--order-from-url` 跑顶象最常见（`e=true` 文件名派生）场景 ⇒ 改为 `--order-from-name` 并补 `e=false` 示例；
  2. `zhipin-switch-pass.js` **未建模 switch fallthrough**（只取命中 case 的 body 会丢掉穿透段，属静默语义改变）⇒ 新增 `hasFallthrough()` 守卫，命中即跳过；
  3. 跨层 `caseValue` 继承可能被"同名标识符被重新赋值"污染 ⇒ 新增 `collectReassigned()`，被赋值过的名字不参与常量传播；并修复祖先链遍历顺序（向上先遇到 case 再遇到其 switch）；
  4. `pipeline-config.js` 的 `zhipin` 步骤含 `flatten`，与"绝不拉平多入口 switch"的文档指引矛盾 ⇒ 补 notes 明确 `flatten` 是**数组流**平坦化，并指向"按入口拆函数"；
  5. `open-source-recipes.md` 仍推荐旧脚本 `analyze_tile_restore.py` ⇒ 改为两脚本分工说明，补 `restore_slices.py` 的独有能力；
  6. `06-engineering-maintenance.md` §12.1 的长度反推表**只对分组密码 + PKCS7 成立** ⇒ 补适用范围前提；动态 token 公式标注为"示例，勿照搬"；§12.2 弱指纹压缩为旁证；
  7. `obfuscation-detector.md` 缺反向链接 ⇒ 新增"命中之后读什么"分流表（含"多入口 switch 不要当单层 CFF"的优先级提醒）；
  8. `ob-variant-taxonomy.md` §6 第 4 步只给示意代码 ⇒ 指向 `scripts/patterns/ob-variant-pass.js`，并补"首参当被调函数"规则的适用边界；
  9. `captcha-model-training.md` 的绝对路径示例改占位符；`gaps` 二开明确标注"外部工具指针，非本技能内置"；
  10. `web-verify-patcher` description 精简（去掉冗余枚举）；`motion-and-coordinate.md` 去掉与新文件重复的具体数值（避免三处漂移）。

- 逐技能票数见文末「评审记录」。

---

## 三·B、批次 B3 · 2026-09-20（第三次执行）

取材口径：**极验全族** 14 篇一次性蒸馏（v3 滑块 7 篇 + v4 滑块 3 篇 + 九宫格/点选 3 篇 + 自动化绕行 1 篇）。
按「同一厂商的不同代际 / 不同题型」聚簇，把链路、字段、几何、轨迹、踩坑一次性压成一个协议矩阵，
再按「协议知识归 `web-verify-patcher`、算法知识归 `web-reverse-algorithm`、混淆知识归 `ast-deobfuscation`」三分。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 31 | `52pojie-2051507-极验3代滑块流程分析.md` | `360b7e15dc4c99fc7a7d031ec8d74ba6` | 2026-09-20 | `web-verify-patcher` | evolve | v3 链路六包全景（register / gettype / get.php×2 / ajax.php×2）；**三个 `w` 分布在三个包**；底图乱序 52 片与还原公式 |
| 32 | `52pojie-2051616-极验3代滑块-扣代码及思路.md` | `5771de6b74e21592ac49f052ce08e2b0` | 2026-09-20 | `ast-deobfuscation` + `web-verify-patcher` | evolve | 硬扣代码的逐轮错误收敛法（报错 → 搜定义 → 同作用域优先 → 缺啥补啥）；`this` 指向 `window` 的处理；`crypto.getRandomValues` 需补；**随机 key 一个文件只生成一次**（三处 `w` 共用） |
| 33 | `52pojie-1885936-【验证码逆向专栏】最新某验三代滑块逆向分析，干掉所有的 w 参数！.md` | `99792d31245ac316c0104ab21462ef0b` | 2026-09-20 | `web-verify-patcher` + `web-reverse-algorithm` | evolve | 三个 `w` 的明文差异与结构同构；`rp = MD5(gt + challenge前32 + passtime)`；`aa` 轨迹三段 `!!` 拼接；自有 base64 变体（码表尾 `()`、补 `.`） |
| 34 | `52pojie-1940566-某验反爬滑块逆向分析.md` | `eeef94603585af5265939cef32a117e7` | 2026-09-20 | `ast-deobfuscation` | evolve | **别名族的真实压缩形态**（一条 var 带 3 declarator + 紧跟 `shift()`）；批量删「单声明且 init 是成员表达式」会误删哨兵变量；`window.$_EJK` 对象补法；`gct.js` 的 `h9s9` 可用固定值替代 |
| 35 | `52pojie-2076316-极验滑块第4代逆向分析.md` | `2a5be057ff49bfcc79b303bf88d2efab` | 2026-09-20 | `web-verify-patcher` | evolve | v4 两接口（`load`/`verify`）；`pow_msg` 拼接格式与 `pow_sign = MD5`；`pow_detail` 随轮下发；新增动态键值对参数；轨迹未加密时的提交方式 |
| 36 | `52pojie-2128465-【逆向分析】某验4代滑块验证码纯算还原——从抓包到全参数纯算.md` | `222902fb2646e5b87cd489547d328ec2` | 2026-09-20 | `web-verify-patcher` + `web-reverse-algorithm` | evolve | **黑盒从密文长度推骨架**（末尾恒定 256 hex ⇒ RSA-1024）；`w = hex(AES-CBC) + hex(RSA)`；**IV 是 `'0'×16` ASCII 不是 `\x00`**；`userresponse = setLeft/1.0059466666666665 + 2`；`td = base64url(gzip(json))` 与 `td_sign = HMAC-SHA256(lot_number, td)` 的明密文绑定；**动态键名防篡改块的下标切片**；`bits` 动态读；失败重试链与新票据 |
| 37 | `52pojie-2056918-极验4代 九宫格协议分析.md` | `9e79be2d188f5cfee8f9a87e0e734e1c` | 2026-09-20 | `web-verify-patcher` | evolve | 九宫格协议（`ques`/`imgs` 均不乱序）；`w` 与滑块 v4 同构；`deobfuscate.io → UglifyJS → DevTools Override content` 组合拳与 `console.log(arguments)` 批量埋点找 `encrypt` |
| 38 | `52pojie-2057071-极验4代 九宫格验证码识别(Resnet).md` | `7d6974a5bfbc7cddfbfaa2aa970f6356` | 2026-09-20 | `web-verify-patcher` | evolve | **九宫格走「特征相似度」而非分类**：ResNet18 提特征 + 余弦相似度取 top-3；数据集 md5 去重；Tkinter 轻量标注；ONNX 推理 |
| 39 | `52pojie-1909489-某验点选验证码分析.md` | `0947d35ff11b6bf79aad95d718991138` | 2026-09-20 | `web-verify-patcher` | evolve | 点选题字段：`o.a` 点击坐标（`round(x*100)_round(y*100)`）、`o.ep.ca` 点击序列、`o.pic`；`tt` 两套字符表的用途；`captcha_token` / `h9s9` 都是 djb 代码签名；**Proxy 拦截 `set` 抓无明文赋值的字段**（`h9s9`）；`ep.em` 七位自动化探针含义 |
| 40 | `52pojie-1162951-极验反爬虫防护分析之接口交互的解密方法补遗.md` | `328d807a410eafbfa83325dc8b08c063` | 2026-09-20 | `web-reverse-algorithm` | evolve | **历史纠正**：AES key 不是时间戳派生，而是 4 段随机 hex 拼接；早期文章里的 `'0'` 补位属作者 Python 复现选择，不能反推站点 padding；自有 base64 的四个位掩码（`7274496/9483264/19220/235`）；`i` 75 项环境数组取样 |
| 41 | `52pojie-1162979-极验反爬虫防护分析之slide验证方式下图片的处理及滑动轨迹的生成思路.md` | `4a524897cd0c4f26932725507da1e251` | 2026-09-20 | `web-verify-patcher` | evolve | 52 片几何（26×2、块 10×80、源 stride 12、源左偏移 +1、画布 260×160）；`SEQUENCE()` 的 13 元素盐展开公式；轨迹差分 + 9 方向表 + `!!` 三段编码；找零法 `userresponse`；**老文章耗时区间自相矛盾**（注释 vs 代码） |
| 42 | `52pojie-1946693-DrissionPage过某验滑块.md` | `b0e1d54c7547872bec75c36a76eccca8` | 2026-09-20 | `web-verify-patcher` | evolve | 自动化路线只能替「识别 + 轨迹」两步（`w` 仍由页面生成）；滑块图不在 HTML，须 `page.listen` 抓接口；**缓动函数生成的是累积位置，自动化要取相邻差值** |
| 43 | `52pojie-1885166-[验证码逆向]关于极验4验证通过却无法登录的问题.md` | `d7390224a4cca1361a52490ef4d20223` | 2026-09-20 | `web-verify-patcher` | evolve | **「验证通过却登录失败」的根因**：与 `gcaptcha4.js` 版本绑定的固定键值对（异常标记）；每次 `load` 校验版本号并重算；`ep`/`biht`/`gct.js` 的处理方式 |
| 44 | `52pojie-1163221-某解析网站过极验滑块测试源码.md` | `178b864a132550d38058ce56a7706776` | 2026-09-20 | `web-verify-patcher` | evolve | 早期整站过验证脚本的通过率衰减记录（60% → 不稳定），以及「`w` 拿不到数据就写死」的**反面样本**；作为「行为参数必须逐轮重算」的失败证据 |

### 本批次技能变更汇总（B3）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-verify-patcher` | evolve | **新增** `references/geetest-protocol-matrix.md`（极验协议矩阵：代际判据表、v3 七步链路、三个 `w` 的分工与字段来源、52 片底图几何、轨迹 `aa` 编码、`i`/`ep` 环境线、v4 两接口与 `data` 分桶表、PoW/防篡改块/`td`+`td_sign`、九宫格、点选字段、自动化注意点、**14 条排错清单**）；`references/provider-execution-notes.md` 极验小节改写为「代际判据 + 三条必知 + 指针」，并**纠正历史错误结论**；`references/captcha-model-training.md` **新增 §八「九宫格/图标点选：特征相似度而非分类」**并补路线判据；`references/tile-scramble-and-coordinate-mapping.md` §一 补「几何不一定是均匀网格」与 `--model gt3` 说明；`scripts/restore_slices.py` **新增 `--model gt3`**（52 片专用几何 + `--gt3-salt` + 三档结构化报错）与 7 项新自检；`SKILL.md` 导航 +1、扩写两条、description 补 v4 触发词 |
| `web-reverse-algorithm` | evolve | **新增** `references/08-mixed-crypto-segmentation.md`（混合加密分段还原总纲：黑盒推骨架、长度→算法反查表、三段定位法、四元组定界与逐字节 diff、四类变体对照、会话级复用清单、PoW 归约）；`references/02-algorithm-families.md` 混合加密节重写（极验 v3 三个 `w` + v4 速查，**纠正 key/IV/padding 三处历史误述**）；`references/06-engineering-maintenance.md` **新增 §十三「JS 侧编码库与 Python 标准库的字节级差异」**（fflate gzip 头尾拼装、base64url 无填充、浮点数对齐）；`SKILL.md` 阻塞点 +1、导航 +1 |
| `ast-deobfuscation` | evolve | `references/patterns/geetest4.md` 重写（识别信号改为「别名族真实形态」、处理顺序硬约束、外部工具链的代价与处置）；`references/string-array-and-minimal-eval.md` 新增「别名族 + 数组字面量」小节；`SKILL.md` 导航补别名族硬约束、pattern 行补说明、**移除写死的机器绝对路径**（校验步骤改为动态解析）；**`scripts/patterns/geetest4-guarded-pass.js` 修复静默语义缺陷**（见下） |
| `ast-deobfuscation` | 附带修复 | `references/obfuscation-detector.md` / `references/pattern-layering.md` 占位符统一为 `<site>` / `<site>-<pass>`，消除可达性扫描的假告警 |
| `web-verify-patcher` | 附带修复 | `references/geetest-protocol-matrix.md` 全部跨技能引用按「三级 `../`」修正（该文件在 `references/` 下，回到 skills 根需三级） |

### 重点缺陷修复（B3，由 judge 提出并当场修复）

**`geetest4-guarded-pass.js` 的静默语义丢失**（judge B 提出，已确认是真 bug）：

- 旧实现按「声明之后的第 1、2 条兄弟语句」计数删除，而别名族的真实形态只有**一条** `shift()`，
  于是把紧随其后的**真实业务语句**一并删掉。
- 夹具 `fixtures-20260920-1939/alias-and-next-statement.js`：旧版产物 **node 实跑抛
  `ReferenceError: keep is not defined`**；新版输出 `S242`，与基线一致。
- 真实样本 `geetest/gcaptcha4.js`（1647 组别名族）：旧版产物 AST 节点 91,832、新版 100,928，
  即旧版**静默删掉约 9,096 个节点的真实代码**，且两者都能被 parser 解析（`errors = 0`）——
  属于只能靠运行才能发现的静默失败。
- 修法：改为**严格匹配 `X.shift()` 调用且 `X` 属于本组声明的名字**才删除。

### 评审结论（B3，darwin Phase 2 Step 4，paired 多数决）

- 评审方式：3 个独立 judge（A/B/C），各自在**同一轮内**同时读取改前（`backup-20260920-1939/`）
  与改后版本，按 9 维 rubric 作比较准则，回 `better/worse/tie` + `clear/marginal`。
- 结果：3 个技能均 **3/3 better（clear）** ⇒ 全部 **keep**。
- **judge 提出的 12 项缺陷已在本轮内全部修复**（不是留待下轮），明细见
  `artifacts/skill-evolution/judge-findings-20260920-1939.md`。
- 逐技能票数见文末「评审记录」。

---

## 三·C、批次 B4 · 2026-09-20（第四次执行）

**取材口径**：**单一厂商全代际 + 全形态**——瑞数（Botgate）4/5/6 代主线 3 篇 + 分代补环境实战 7 篇 + 异步替代路线 1 篇 + 其它运行时 1 篇。

选它的理由：B3 遗留的下一批建议把「瑞数系」列为当前**最大知识空洞**（`web-js-env-patcher` 在 B1/B2/B3 三批中一次都没被碰过）；
且同族多篇可**交叉验证同一对象**——本轮正是靠「文章 ↔ 独立开源实现」双源互证，把若干「只能靠断点跟栈」的结论升级为**可确定性重算**。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 45 | `52pojie-1743428-人均瑞数系列，瑞数 4 代 JS 逆向分析.md` | `94ebc100ee02b456c76964423a563d46` | 2026-09-20 | `web-js-env-patcher` | evolve | 代际判据（响应码 202/412·Cookie 命名·入口 call 形态·`$_ts` 结构四类交叉）；三件套（meta.content / 内联 `$_ts` 脚本 / 外链 JS）；假 Cookie→真 Cookie 两段；20 位数组后 4 位为核心；核心 4 值动态替换五步法（按 20 条赋值语句的**索引**定位）；后缀生成复用 Cookie 控制流 |
| 46 | `52pojie-1743411-人均瑞数系列，瑞数 5 代 JS 逆向分析.md` | `804f86a67896b5314a9eda41cd0118f2` | 2026-09-20 | `web-js-env-patcher` | evolve | 128 位大数组的分段填充（段号 → 段内容）；`localStorage` 系键 `$_YWTU/$_cDro/$_fb/$_f0/$_fh0/$_f1/$_fr/$_fpn1/$_vvCI/$_JQnh` 且「为空则不加值」；`$_ts` 跑完被清空；`navigator.connection.type` 五值匹配；「短 Cookie 过主页 / 长 Cookie 才过接口」的指纹追加机制 |
| 47 | `52pojie-1846988-人均瑞数系列，瑞数 6 代 JS 逆向分析.md` | `5fe1d0d385b4482cd65cf6ffd97bd25b` | 2026-09-20 | `web-js-env-patcher` | evolve | 173 位 Cookie 两段结构；16/4/8/32 位数组生成链；**方法内一位数组值 ↔ 返回值映射表（21 组）**；`_$BW` 等价代码；6 代动态匹配六步法（`842,` 定位容器 → 索引名 → `$_ts` 取值 → 反查方法名 → 取数组 → 查映射）；推荐正则而非 AST |
| 48 | `52pojie-1988393-【JS逆向】瑞数6逆向简单分析.md` | `5bf558c49512cbdddf3ea57739f22cd1` | 2026-09-20 | `web-js-env-patcher` | evolve | 插桩锚点「搜 `<= 63`」；数组长度演化链 117→95→176；`[1,0,33,128]` 中的 `33 = eval.toString().length`、`128 = 1<<7`；**`cp[1]` 约 850 个参数名由 `nsd` 生成**（与独立实现互证）；「该代不存在严格意义上的纯算」 |
| 49 | `52pojie-2010081-某图，瑞数6补环境.md` | `69e7d09985d11f89b45f7789604f14d2` | 2026-09-20 | `web-js-env-patcher` | evolve | `Document`/`HTMLDocument`/`Window` 原型链与 `Symbol.toStringTag`；**`window.name = '$_YWTU=...&$_YVTX=...&vdFm='`**；`%GetUndetectable()` + `document.all` 零依赖 fallback；`form` 的 `id/action/textContent/innerText` 成对 getter/setter；`getElementsByTagName('script')` 首调返 2 个、之后返 `[]` |
| 50 | `52pojie-2042722-药监局瑞数6补环境生成cookie.md` | `30d7ef2fb6078ec41b5810e0a2ab3c03` | 2026-09-20 | `web-js-env-patcher` | evolve | meta 只有 content 无 id 的站点如何取值；**`getElementById('root-hammerhead-shadow-ui')` 必须返回 `null`**（返回非 null 即 400）；Proxy `watch()` 吐环境（含 `has`/`ownKeys` 探测）；**「复制时须保持原始字节，逻辑会校验代码格式」** |
| 51 | `52pojie-1859510-关于瑞数4补环境的一点小心得.md` | `846ee2db8cea872d91dfc01d5eca979a` | 2026-09-20 | `web-js-env-patcher` | evolve | **多趟（自举）Cookie 的关键反证**：第一趟读到 null/undefined 时产物约 219 位，浏览器约 300+ 位；原因是第二趟读到了第一趟写入的 sessionStorage/localStorage/cookie ⇒ 单趟结果不可交付 |
| 52 | `52pojie-1952790-某灵考核题-瑞数，部分环境分析.md` | `4de9b3df7c56eac2ffe06ab88dda1a5f` | 2026-09-20 | `web-js-env-patcher` | evolve | **该站 meta 不在 `getElementsByTagName('meta')` 而在 `getElementById` 返回的对象上**（与 2010081 互证两种取法）；`_$hg[_$eg[49]] is not a function` → `createElement` 未补；「没看到无限 debugger」不能否定瑞数 |
| 53 | `52pojie-2012413-某瑞数5代cookie和url后缀补环境代码.md` | `dd94837b1a6c8fe13fc8c093e6fb214f` | 2026-09-20 | `web-js-env-patcher` | evolve | `location`/`form`/`input` 的**顺序耦合**（`createElement('input')` 按三次调用返回不同对象）；`a` 标签 href 赋值联动 host/pathname/protocol 的机制与测法；`document.all` + `%GetUndetectable()`；`XMLHttpRequest.open` 重写为记录改写后 URL 不发包 |
| 54 | `52pojie-2046426-欧冶瑞数练习.md` | `730ea0a0227b9518b75b30ecf6f2ce43` | 2026-09-20 | `web-js-env-patcher` | evolve | 端到端流水线：`fetch_1` 取三件套（`//meta[2]/@content`、`//script[1]/text()`、外链 JS）→ `execjs` 生成 cookie → `session.cookies.update` → 业务请求；「每次请求前清 Cookie 重新取三件套」 |
| 55 | `52pojie-2069036-另辟蹊径：基于浏览器脚本与中间人拦截的瑞数“异步”解决方案.md` | `2b515d30086e512b10c081b338f0fa4d` | 2026-09-20 | `web-js-env-patcher` | evolve | 兜底路线：让 JS 在真浏览器跑，用中间人拦被重写后的 URL（带后缀）与 Cookie；异步转同步用本地文件/DB 或本地 API；重放 200 = 参数有效、400 = 失效；**不得进入 `result/` 交付物** |
| 56 | `2106217-iv8-python-v8-env-ruishu6.md` | `3b5c54e7930bed11f78e946f0ad4d146` | 2026-09-20 | `web-js-env-patcher` | evolve | Python 原生 V8 运行时路线（C++ 层实现 BOM/DOM/CSSOM）；`[[IsHTMLDDA]]` 等在引擎层达成；`debugger` 被禁用、改用 `vdebugger`；`watch_apis` 监控读写触发断点；逻辑时钟 `eventLoop.advance()` 与 `time_mode="system"` |

### 本批的交叉验证（最硬的一环）

除上述来源文章外，本轮还引入**独立第三方实现**作为第二来源：`open-source/reverse-skill-old/项目资料/rs-reverse-main/`（只读参考，未修改）。
两处来源互相印证后才写入技能，关键互证结论：

| 结论 | 文章侧证据 | 实现侧证据 | 结果 |
| --- | --- | --- | --- |
| `cp[1]` 由 `nsd` 生成的参数名数组，约 850 个 | 1988393：「`cp[1]`和`cp[3]`是根据页面`nsd`生成的 **850** 个参数名」 | `initTs.js` 的 `cp[1] = arraySwap(grenKeys(keynameNum), nsd)`；真实样本锚点正则提取得 **851** | ✅ 互证（850/851 差 1 为池长度上限口径差） |
| `[1,0,33,128]` 的真实语义 | 1988393：「前两个数字写死，第三个 33 是 `eval.toString()` 的长度，128 是 `1<<7`」 | `len103.js`：`numarrJoin(1, maxTouchPoints, eval.toString().length, 128, ...)` | ✅ 互证，且「写死的两个数字」被升级为「段号 + `maxTouchPoints`」 |
| 6 代 4 位数组的映射表是**常量表** | 1846988 的 21 组 valueMap，值域 16 个值 | `fixedValue20.js` 的 20 值常量表，值域与文章**逐值一致** | ✅ 互证；结论升级为「值域常量、键随版本变」 |
| 代码内容参与校验 | 2042722：「复制时记得恢复成原始单行格式，逻辑中会校验代码格式」 | `Cookie.js` 的 `codeUid` 由主函数体哈希派生；`initTs.js` 的 `$_ts.jf` 为格式校验标志 | ✅ 三方互证（含实现项目博客《瑞数vmp-代码格式化后无法正常运行原因分析》） |
| `lastWord` 才是 Cookie 后缀字母 | 4 代文章称「`T`=JS 生成 / `S`=服务端」 | `len103.js` 的 `lastWord: 'T'` / `'P'` 为**站点适配配置项** | ⚠️ **证伪文章口径**，已写入技能为「禁用该判据」 |
| Cookie 值首位不是代际标识 | 4 代文章称「值第一位为版本号」 | `Cookie.js`：`return '0' + numarr2string(...)`，**首位是常量 `'0'`** | ⚠️ **证伪文章口径**，已写入技能为「禁用该判据」 |

**在真实样本上的实测复现**（`example/codes/main.js` + `$_ts.json` 的 `nsd = 24296`）：

| 检查 | 实测结果 |
| --- | --- |
| 变量名池长度锚点提取 | `keynameNum = 851` |
| 反向覆盖率（代码内 `_$xx` 落在重算池中） | 68 / 69 = **98.6%** |
| 池使用量（信息性） | 68 / 851 = 8.0%（正常，VM 只用池中一小部分） |
| 负例：池长度取 100 | 23.2% → **正确报警** |
| 负例：池长度取 3000 | 100% → **测不出「过大」**（已知非对称，已写入技能） |
| 覆盖率能否验证 `nsd` | **不能**（集合判定不区分顺序）——已写入技能为硬约束，`nsd` 必须靠端到端 Cookie 对拍 |

**本轮已证伪 / 已认定为不可靠的做法**（写入技能正文，避免后人重走）：

1. 用 Cookie 值首位数字判断代际。
2. 用 Cookie 后缀字母（`T`/`S`/`O`/`P`）推断「谁生成的」。
3. 要求挑战脚本「必须单行」——准确口径是「与浏览器取到的原始字节逐字节一致」（真实 VM 代码实测 5 行 / 约 19.5 万字符）。
4. 用「覆盖率」验证 `nsd` 是否正确。
5. 把第一趟（冷启动）生成的 Cookie 当交付值。

## 三·D、批次 B5 · 2026-09-20（第五次执行）

**取材口径**：**验证码图像识别系全题型** —— 点选类识别 7 篇（文字/图标/语序/图文） + 识别模型训练 2 篇
+ 图像形态专项 4 篇（GIF / 旋转 / 特征匹配 / 检测即坐标） + 滑块变体 6 篇（真假双滑块 / 双图 / 增强版旋转弧线 / 拼图参数 / 树美一条龙 / 同盾还原）。

选它的理由：B2 / B3 / B4 三次都把「验证码图像识别系」列为**最厚的簇**却始终没碰
（B3 只覆盖了极验一家的点选/九宫格**协议**，识别路线本身仍是空白），其中**语序点选**在技能库里完全没有对应能力。
本批按「同一对象的多种解法」聚簇，让**分类 / 相似度 / 特征匹配 / 语言模型**四条路线能在同一批里互相定位。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 57 | `52pojie-2099515-文字点选及语序点选验证码识别方案.md` | `53b53575f4c3b97a559c84d9b3aa3408` | 2026-09-20 | `web-verify-patcher` | evolve | 点选五子类判据（文字/图标/语序/图文/空间语义）；两级模型（YOLO 检测 50~60 张 + YOLO-cls 分类）；**类别不均衡用「过采样补齐到每类 20 张」**；多模态 OCR 自动分桶 + 人工审查（类别常达 1000+）；`class_map.json` 按目录名排序定索引；**语序还原用离线词库 n-gram `Σ len² × log(freq+1)`**（长词权重爆炸、`freq=0` 强制取 1）；「精确匹配 → 字形相似度兜底」且命中后按池 pop |
| 58 | `52pojie-2125810-文字点选验证码逆向实战.md` | `8c74e94007bc17e2e6bb898bf593a41c` | 2026-09-20 | `web-verify-patcher` | evolve | 点选提交侧加密最小样本：`pointJson = base64( AES-ECB + PKCS7( JSON.stringify(checkPosArr), secretKey ) )`；`secretKey` / `token` 来自 `get` 接口且**每次不同**；`captchaType = clickWord` 为固定值 |
| 59 | `52pojie-2104726-猿人学验证码 - 图文点选题目分析.md` | `44eec2f81bad04bbd62f4db3122fb27e` | 2026-09-20 | `web-verify-patcher` | evolve | 九宫格**固定切分逐格 OCR**（整图 OCR 识别率低到不可用）；点击点 = 格中心 + `±cell/3` 随机抖动并 clamp；**识别到的目标数不足（应点 4 个只到 3 个）时重新取题**，不用残缺结果提交；`w` 字段给出图片宽度用于切格 |
| 60 | `52pojie-2046823-关于图标点选验证码识别方案.md` | `26f95d05b06c147178cbccf3adc9f426` | 2026-09-20 | `web-verify-patcher` | evolve | 图标点选**不要用 labelimg 逐张手标**：先做「图标种类去重 → 与自建数据集合并 → 记录位置+种类直接转 YOLO 格式」，数据集规模自控（1 万张 / ~400 epoch / mAP50-95 ≈ 0.94） |
| 61 | `52pojie-1880797-【验证码识别专栏】人均通杀点选验证码！Yolov5 + 孪生神经网络 or 图像分类 = 高.md` | `f44f27b6e98908c889ef12adc41f9938` | 2026-09-20 | `web-verify-patcher` | evolve | 点选三条路线对照（yolo+CNN / yolo+Siamese / yolo+OCR）；ddddocr 自训 CLI（`app.py create/cache/train`，`--single` 只用于图标这类「图像分类」）；**检测与识别拆成两个接口**（检测返框、识别返字）再用字回查坐标 |
| 62 | `52pojie-1912306-[验证码识别]相似度模型匹配的替代方案-特征匹配.md` | `f50e027e41804143fca4e0c5026c332c` | 2026-09-20 | `web-verify-patcher` | evolve | **SIFT 特征匹配替代孪生网络**：`knnMatch(k=2)` + `m.distance ≤ 0.88 × n.distance` 过滤，good 数量即相似度；**5~10 ms/对 vs 模型 35 ms/对，且免数据集**；但对颜色/形变/尺寸敏感（须同色 + resize 到同尺寸），黑白图标混排时按颜色分支匹配，必要时先反色 |
| 63 | `52pojie-1888314-[验证码识别]点选验证码识别的通用解决方案-相似度识别.md` | `6f7e9729d29139840663f94e0099802c` | 2026-09-20 | `web-verify-patcher` | evolve | **相似度矩阵的贪心指派**（argmax → 行/列置零 → 循环至全零）；参考图透明底须先合成白底；`text_to_image` 造参考字图（`msyh.ttc`）；Siamese 数据集每类仅 2 张时通用仓库会死循环（换 `dianxuan`）；**语序还原可用 KenLM（`pycorrector` 大模型 3 GB），jieba 效果差** |
| 64 | `52pojie-2043291-某云空间推理验证码识别模型训练.md` | `99acaff7e4a83b82acebf998c4379744` | 2026-09-20 | `web-verify-patcher` | evolve | labelme + `labelme2yolo --val_size 0.1 --test_size 0.1`（8:1:1）；`names` 顺序**不可改**（索引即 `class_id`）；`imgsz` 取 32 的倍数且训练/导出/推理三处一致；**CPU 120 张 / 200 epoch ≈ 80 min → mAP50-95 ≈ 0.988**；`best.pt`/`best.onnx` 才是部署件 |
| 65 | `52pojie-2006169-算术验证码识别模型训练.md` | `b822765813782c417f2fad29b26026ea` | 2026-09-20 | `web-verify-patcher` | evolve | 算术题 15 类（`0-9` + `+ - x = ?`）；**运算符形状相近（`+`/`x`、`-`/`=`）必须逐字符单独框**，乘号统一写 `x`，否则推理侧 `replace('x','*')` 会漏替换 |
| 66 | `52pojie-2098660-【Web逆向】GIF验证码.md` | `92483fca3823cbdce681e826dbb86f03` | 2026-09-20 | `web-verify-patcher` | evolve | **GIF 动图验证码**：响应同时给 `T`/`F` 两个 base64 时取体积大的那个；前缀经验判据 `IVB...` = 静态图 / `ROLGO...` = GIF；逐帧拆后按**像素标准差**挑最清晰帧再 OCR；合成帧必须先垫白底（否则透明区变黑块）；识别结果过短直接丢弃重取 |
| 67 | `52pojie-2057521-百度旋转验证码算法逆向分析.md` | `c9e69fa56ab671e8fad7d955fb5c248c` | 2026-09-20 | `web-verify-patcher` | evolve | 百度旋转三接口 `init`/`style`/`log`；**`fs` 赋值两次**（第二次把第一次结果与 `backstr` 再加密，只做一次必失败）；`ac_c = round(distance/(290-52), 2)`（**先减 52 再除**）；**AES key 派生按 `as` 末位字符查表选 MD5/SHA1/SHA256/SHA512/SHA3-256/SHA3-512，取 hex 前 16 位**；`fs` 用 AES-ECB+ZeroPadding、`fuid` 用 AES-ECB+PKCS7；`?cdnversion=` 动态后缀导致断点打不上 → 全局搜 `cdnversion` 删后缀（等价 Overrides） |
| 68 | `52pojie-1880058-过某站点选验证码.md` | `7901814bd6b618346a0b2d2ae3d0cd27` | 2026-09-20 | `web-verify-patcher` | evolve | **「检测即坐标」轻量路线**：ddddocr 1.3.0+ 的 `det.detection()` 直接给全部文字坐标集，无需自训检测/相似度；**扣字 → autocontrast → 二值化 → 横向拼接 → 一次识别**（不拼接识别率差），`assert len(text) == len(boxes)` 后用 `text.index(target)` 回查坐标算中心点 |
| 69 | `52pojie-2043678-虚实相生------某网真假双滑块逆向分析.md` | `734d9ca353666af3adf7f9e9d855e495` | 2026-09-20 | `web-verify-patcher` | evolve | **真假双滑块**：第一层真滑块 `pointJson = AES-ECB+PKCS7(序列化坐标, secretKey)`（key 默认常量 `XwKsGlMcdPMEhR1B`，实际取前置接口 `secretKey`）；第二层是**纯前端假滑块**（无后端参与）→ 直接读 `v-value` 属性跳过；`returnUrl` 由 `?` 后 query 分割重组 |
| 70 | `52pojie-2109685-SM双图滑块验证码逆向分析.md` | `e340915a0dfa5d81a15683ab52d932f3` | 2026-09-20 | `web-verify-patcher` | evolve | 数美(SM)/易盾类两段式（请求 1 取图 `bg`/`fg`/`rid`，**响应可能不是 JSON，先按文本处理**；请求 2 校验）；提交字段 `wi`(距离)/`gq`(轨迹)/`vs`(时间)；`getEncryptContent` = **DES-ECB + ZeroPadding**，各字段带固定 key；**控制流平坦化按业务关键词分支（`slide`/`auto_slide`）下断点**，比搜 `_0x` 名有效 |
| 71 | `52pojie-2111224-某网站登录及拼图滑块参数逆向分析.md` | `4180929c3284f01be1f32de8c22f6056` | 2026-09-20 | `web-verify-patcher` | evolve | 易盾类四接口链（`getconf`→`j/up`→`v3/get`→`v3/check`）；**JSONP `callback` 后缀是递增计数器 `__JSONP_<rand>_<i++>`**（本轮修正了原「固定 `1`」的口径）；`fp` 由 cookie 自动生成 → 用 `Object.defineProperty` 监听 setter 打断点定位；`extraData` 内轨迹每组是 `[x, y, t, 1]` 四元组再套加密 |
| 72 | `52pojie-1904971-[验证码识别]某盾滑块验证码增强版的识别.md` | `a7aa7fc3b9260ef993d4ddc6363534eb` | 2026-09-20 | `web-verify-patcher` | evolve | **增强版滑块（弧线 + 自转）**：新增 `attrs` 决定曲线；**`rotate = attrs × 视觉偏移`**、`transformOrigin` 随 `attrs` 符号切 `bottom right`/`top right`；两缺口同形 ⇒ 纯模板匹配失效，推荐「`attrs` 推轨迹 → YOLO 出缺口 → 轨迹点到缺口最小距离」；用 alpha 通道去背景求滑块中心 |
| 73 | `52pojie-1892035-某盾滑块验证：从0到1，逐步分析 (图片还原、轨迹模拟).md` | `c3f03a9975ffa671334954623eb1c65d` | 2026-09-20 | `web-verify-patcher` | evolve | 同盾背景图还原用 **hex 串 `bgImageSplitSequence`**（16 字符 = 2 层 × 8 片，`int(c,16)` 为目标槽位，**source-to-target 且来源索引扁平：`x≥8` 要从第 1 层取片**）→ `restore_slices.py` 新增 `--order-hex`；提交字段 `requestType=3`/`validateCodeObj`/`userAnswer`/`mouseInfo`(重点)/`usedTime`(非 0)；**自有 base64 变体**（`mnoqpr`、`~`）+ 混淆层字母位移（小写 `-1`，`a→{`） |
| 74 | `52pojie-1674986-树美滑块验证—滑块识别、获取和提交参数一条龙分析和调用.md` | `a577e1704cf2ab61f8cb20162a41eaf4` | 2026-09-20 | `web-verify-patcher` | evolve | 数美系提交三字段 `th`(轨迹)/`gk`(时间差)/`ud`(距离) 各带固定 key；**「格式化/改写 JS 后提交必失败」**（检测点在路径加密函数内，形如 `obj[a][b]() && (x = y)`）→ 删检测或把代码重新压缩回去；轨迹生成模板（7~9 点、`x` 递增、`y` 微抖、时间 100 ms 步进） |
| 75 | `52pojie-1996654-某讯点选纯算识别可能性（抛砖引玉）.md` | `93abf4e27bf1591818545e2c71936081` | 2026-09-20 | `web-verify-patcher` | evolve | 腾讯 TCaptcha **六宫格 AI 生成图**纯算：3×2 等分（672×480 先裁顶部 34 px、步长 226 切 220），**2 张彼此相似且孤立**即目标；平均色 RGB 距离 `sim = 1 - dist/441.67`；**色系法 50%+，换 pHash/SSIM 可到 80%+**；图片经 `puppeteer-extra-plugin-stealth` 监听 `cap_union_new_getcapbysig?img` 取 buffer |

### 本批的结构性增量（能力级，不只是补文字）

| 增量 | 改前 | 改后 |
| --- | --- | --- |
| **语序点选** | 技能库完全没有这个概念（`click-select` 只有「题面顺序 = 提交顺序」） | 新增子类判据 + 第三步「语序还原」（词频表 `len²×log(freq+1)` / KenLM），并明确「顺序错了静默失败」 |
| **题目 → 坐标** | 「每个题目各自取相似度最大」 | **行列不相交指派**（贪心 / 匈牙利，`scripts/assign_by_similarity.py`），并把 top1–top2 分差做成置信度门槛 |
| **相似度实现** | 只有 Siamese 一条路 | 新增 **SIFT/SURF 特征匹配**（5~10 ms/对、免数据集）与路线选择表 |
| **切片顺序来源** | 数组（JSON / 逗号串） | 新增 **hex 字符串形式 + 跨层扁平索引**（同盾），`restore_slices.py` 新增 `--order-hex`（自检 16 → 22 项） |
| **旋转滑块** | 只有「角度 → 拖动距离」 | 新增 `rotate = attrs × 偏移` 的几何推导与「轨迹点到缺口最小距离」选目标 |
| **训练施工** | 通用 YOLO 模板 | 新增 labelme2yolo 8:1:1、`imgsz` 三处一致、算术类逐字符标注、CPU 训练成本实测、`best/last` 产物解读 |

### 本批已证伪 / 已认定为不可靠的做法（写入技能正文，避免后人重走）

1. 语序点选按「题面顺序」点击 —— **静默失败**，必须额外做语序还原。
2. 「每个题目各取相似度最大的框」—— 有重复目标时会把同一个坐标返回两遍，且不报错。
3. 用**整图 OCR** 识别九宫格题面 —— 识别率低到不可用，必须逐格。
4. 单字小图**不拼接**直接 OCR —— 识别率显著下降。
5. 空间语义题用 `max_det=1` —— 等于取消「找最大/最小」的筛选逻辑，小目标永远选不出。
6. 照着「脚本发 warning」继续跑错误顺序 —— `restore_slices.py` 对越界/非置换顺序**直接报错退出**，不发 warning（本轮据实测修正了原表述）。
7. 用**标准 base64** 解同盾的密文 —— 该站码表是自有变体（`mnoqpr`、`~`）。
8. 认为「改写/格式化 JS 只是调试手段」—— 数美系会检测脚本格式，格式化后**即使滑块位置全对也过不去**。

---

## 三·E、批次 B6 · 2026-09-21（本流水线第 6 次执行）

取材口径：**三簇「能力块」一次性蒸馏** ——
① **Protobuf / 二进制协议**（9 篇：jspb · protobufjs full · protobufjs 静态表 · 厂商自研轻量 四方言 + gRPC-Web 帧头 + 从生成 JS 抽 .proto）；
② **腾讯防水墙滑块全代际**（8 篇：`cap_union_*` 五参数 + 魔改 TEA + `vData` 四步 + JSVMP 反编译器 + 五请求链）；
③ **反调试与自动化指纹**（10 篇：10 类反调试判据 + sink→栈→bundle 三步定位 + 隐藏 iframe 取原生 API + 框架自身指纹）。

选它们的理由：① 是**全库唯一真正的能力缺口**（15 个技能里没有任何 protobuf 实战能力，
`websocket-reverse` 的 protobuf case 长期标注"待补"，`protocol-reverse` 只有一句 `protoc --decode_raw`）；
② 是 B5 之后剩余的最大厂商空洞；③ 是「hook 了还是被抓」这类反复出现的疑难。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 76 | `52pojie-1667701-B 站弹幕 protobuf 协议.md` | `da13e306e8406457557c7b2aab80eff4` | 2026-09-21 | `protobuf-reverse` | create | 两条并列路线：① 官方 `protoc --python_out` 生成 pb2 后 `ParseFromString`；② `blackboxprotobuf.protobuf_to_json` 黑盒解。两者都依赖 protobuf 且版本要匹配（blackboxprotobuf 需较低版本） |
| 77 | `52pojie-1692444-Protobuf的正逆向学习和基于python的实现.md` | `40647038208f64b6d49c9c707c8332cd` | 2026-09-21 | `protobuf-reverse` | create | **方言 B（protobufjs full）** 判据：`t.encode`/`t.decode` 函数体。`e.uint32(8)` 里 `8=(字段号<<3)|wire`，`34=4<<3|2` 即 repeated 嵌套；`t.skipType(7 & a)` 是 default 不是字段。外层 base64 包装（`base64_encode(b)`）+ `MatchPlayInfo` 全链路；该文被固化为 `--selftest` fixture B |
| 78 | `52pojie-1735973-某方数据平台的逆向分析-------学会逆向protobuf.md` | `f3aa1d4223723ee75d9d01050876d10d` | 2026-09-21 | `protobuf-reverse` | create | **gRPC-Web 5 字节帧头**（`00 00 00 00 1b` = flag + 4 字节大端长度）；`content-type: application/grpc-web+proto`；URL 形如 `/SearchService.SearchService/search`；响应取值要按声明长度截断（`int.from_bytes(content[:5],'big')` 只在 flag=0 时偶然成立）；`packed enum` 用 repeated 表示 |
| 79 | `52pojie-1735975-protobuf知识补充.md` | `9fe314ae00a71947408f2fa790b140ca` | 2026-09-21 | `protobuf-reverse` | create | proto→JS 的正向对照表（`setXxx`→单值、`addXxx`/`getXxxList`/`clearXxxList`→repeated、`getFieldWithDefault`/`setProto3*Field`→类型与编号）；`repeatedFields_ = [4,6]` 显式声明 repeated 字段号；Python 侧 `add()` 与 `extend/append` 的分工；enum 必须设 0 号 |
| 80 | `52pojie-1737925-某音直播弹幕web端js逆向分析----protobuf实战及工具介绍.md` | `96f70f2aee6f4f421d1529312d425040` | 2026-09-21 | `protobuf-reverse` | create | **`read*`→proto 类型映射表**（本技能唯一权威来源）+ 用 Babel 写「JS→.proto」抽取器；WebSocket 两层结构（外层帧 message + 内层业务 message，`payload` 可为 gzip）；`payloadType` 是消息路由键；map 字段无 setter 只能跳过；WS 连接需 cookie（ttwid）、URL 带 `X-Bogus` 签名 |
| 81 | `52pojie-1874655-steam 登录 Protobuf 协议详解.md` | `a1fb5b226e1ce7cb08943077aebb4d79` | 2026-09-21 | `protobuf-reverse` | create | **方言 D（厂商自研轻量）** 判据：字段表 `{n:1, br: readString, bw: writeString, d: 默认值, c: 子类型}` + `sm_m` 惰性缓存；`input_protobuf_encoded` = base64(protobuf)；**同一站点不同 message 的字段号互不相干**（`account_name` 在公钥请求是 1、登录请求是 2） |
| 82 | `52pojie-1889016-新版dy弹幕protobuf分析还原.md` | `10f511f92494d581a897ad591bbe0ab5` | 2026-09-21 | `protobuf-reverse` | create | **方言 C（protobufjs 静态描述表）** 判据：`protobuf.roots['a.b.c']` + `{id:['name', decoder, ?]}`；`getType(name)` 会正则去 `Webcast(Open)?` 前缀再按 `typeHintPrefix + 名字` 候选表查 root；`_loadSchema()` 才把 schema 挂到 `this.root`；`constructor.decode.toString()` 可拿回解码器源码 |
| 83 | `52pojie-2024402-protobuf 逆向学习笔记.md` | `1c29ac6ed45a4d9e6789fe00508a2ee6` | 2026-09-21 | `protobuf-reverse` | create | **从生成 JS 反推 .proto 的完整手工流程**（`deserializeBinaryFromReader` 逐层跟栈展开）；`protoc --decode_raw` 用法与「必须先去掉非 protobuf 帧头」；**该文手写还原的 `Issn issn = 45;` 与其自己贴出的生成 JS（`case 45: readString()`）矛盾** —— 机械抽取产出 `string issn = 45;` 才是对的（旁证：手写版解码结果 `"issn": {}` 为空对象） |
| 84 | `52pojie-2076729-SpiderDemo T3 protobuf混淆解析挑战题解.md` | `cd2ae73b3ad1a4990cb4c69d59178fec` | 2026-09-21 | `protobuf-reverse` | create | **明文 `.proto` 随页面下发时直接下载编译，不要逆向**（判据：请求里有 `challenge.proto`）；生成 JS 被特殊 unicode 变量名糊住时，用「OB 工具关掉全部混淆选项 + mangled 变量名」自动清掉；字符串被包两层时只去一层会有「够用了」的错觉 |
| 85 | `52pojie-1521480-某鹅滑块验证码破解笔记.md` | `5251435bd301dccec694570d91469b33` | 2026-09-21 | `web-verify-patcher` + `ast-deobfuscation` | evolve | 腾讯 `__TENCENT_CHAOS_VM(pc, codes, stack)` 结构与 VM 执行过程；`collect` 明文 `{"cd":[...]}` **数组顺序一个滑块一个样**（不能按固定下标伪造）；采集项 `[1024,768]` 的来源定位法（对比两次打印的差集） |
| 86 | `52pojie-1725219-某讯滑块验证码反汇编分析-第一章.md` | `d6c15fc6529aa6673f02793c62525b77` | 2026-09-21 | `web-verify-patcher` + `ast-deobfuscation` | evolve | 五个参数的来源定性：`ua`=base64(UA)、`sess` 来自 prehandle、`collect`=`getData`、`eks`=`getEks`、`vData` 由 `XMLHttpRequest.prototype.send` 重写注入（判据：send 断点处还没有该参数）；TDC 字节码由「一大段 base64 + 一个大数组」解码拼成；VM 四参数含义 |
| 87 | `52pojie-1727676-某讯滑块验证码反汇编分析-第二章.md` | `741bc6198bd143f099f42eaf6f707d4b` | 2026-09-21 | `ast-deobfuscation` | evolve | **指令乱序是这套 VM 的核心难点**：指令序号会变、数组标识符也会变（`I`→`Q`），因此不能按序号识别指令，必须转成**与混淆无关的助记符表**；反汇编四大难点（条件/循环分支、子函数与闭包参数、try/catch、for-in）；webpack 打包 + 环境检测模块数组 + `setErrorStack` |
| 88 | `52pojie-1729065-某讯滑块验证码反汇编分析-第三章.md` | `efe0a782387bb592645ed0b9daa684f4` | 2026-09-21 | `web-verify-patcher` + `ast-deobfuscation` | evolve | `collect` 生成链路：`mInit` 跑环境检测模块 → **37 个 `get()` 拼接** → 填充 → **魔改 TEA（`>>` 改 `>>>`）**，分段加密以 `"],"` 结尾的才是最后一段；环境检测只需固定「通过时的正确返回值」，不必逆运算；`vData` 四步：填充到 16 倍数 → 打乱 → 魔改 TEA（key 固定）→ **自定义 base64 码表** |
| 89 | `52pojie-2089027-手把手教你给某讯滑块的JSVMP写反编译器 (如宝宝辅食一样易懂).md` | `6b6225a228fcef68b6571e023a91676f` | 2026-09-21 | `ast-deobfuscation` | evolve | **JSVMP 符号执行反编译器的完整设计**：栈上放 AST 节点而非值；`used` 标记区分中间产物与完整语句（依赖对象引用共享，不能深拷贝）；变量以 BOX（`Stack[i]=[value]`）承载做引用传递；成员引用是 `[Object, Key]` 数组且赋值时不 pop；`JZ`→`IfStatement`、`JMP` 上跳+`Visited`→`WhileStatement`；函数栈布局 `[this, arguments, 自身]`；**明确未覆盖 break/continue/do-while/finally** |
| 90 | `52pojie-2097198-腾讯滑块纯算法浅析.md` | `29814728f4153ea92f43deb1b764b940` | 2026-09-21 | `web-verify-patcher` | evolve | 纯算实操顺序：先看 `encodeURIComponent()` **之前**的字符串；多处 `btoa()` 拼接说明是同一套算法只分析一处；**运算符也要插桩**（约 7 万行日志，必须 push 到数组最后一次性 dump，直接 log 会卡死）；骨架是「每 4 字符切片 + `charCodeAt(0..3)` + 4 次数值运算」，落点 `[235,7,11,255]` 经 `fromCharCode()` 出串 |
| 91 | `52pojie-1887377-40行python识别某讯云滑块验证码并自动登录.md` | `d032af049291a7c94e3ecab8695ae0ed` | 2026-09-21 | `web-verify-patcher` | evolve | 缺口坐标**存在站点级固定偏移**（实测 `距离 = 识别缺口 x - 60`，因滑块初始位置不在最左）；取图可从 iframe 内 `style` 里正则提 URL；偏移量按站点实测、不可跨站套用 |
| 92 | `52pojie-2106089-智慧酒店登录滑块各部分易错点详析.md` | `777321954a7a80677b7f7cfdc42b5cdf` | 2026-09-21 | `web-verify-patcher` | evolve | **五请求链**（而非三请求）：challenge/verifyId → 静态资源（`shuffle` 切割表 + `publicKey` 加密轨迹）→ `collectData` 得 `result`（=登录用 `secure_key`）→ `secret-key` 得 `iv`/`secret_key`/`secret_key_id` → login；**`csrf-token` 要「先发一次再从响应 Cookie 取值」两步法**，第 4 个请求同样要更新；双缺口底图用**中心点**计算 + 红线校验 |
| 93 | `52pojie-1868749-反调试-编译pass彻底解决调试web无限debugger问题.md` | `aec9df38777673a3eee294b02542171e` | 2026-09-21 | `web-reverse-algorithm` | evolve | **编译级绕过**：V8 把 `debugger` 当关键字（`parsing/keywords-gen.h` / `token.h` / `scanner-inl.h`），改这几个字符串后重编 node 即可；Chrome 侧更省事的是**二进制改 `chrome.dll` 里的硬 token**（`grep -aboP "\x00[xd]ebugger\x00"` 定位后把首字节改掉），副作用：语法完整性被破坏会被探测、部分插件失效 |
| 94 | `52pojie-2047827-【反反调试】破解匿名函数的构造函数执行的debugger.md` | `b338847feb716ef984dd4f47678b4bae` | 2026-09-21 | `web-reverse-algorithm` | evolve | `(function(){}["constructor"]("debugger"))()` 的处置：核心是重写 **`Function.prototype.constructor` 的 getter**，而不是只换 `window.Function`；配套要 `Object.getOwnPropertyDescriptor` 联动 + 定时自检复原 + `onerror` 静默；另可在 `setInterval` 包装器里临时替换 `Function` 来保护闭包变量 |
| 95 | `52pojie-2095322-某招聘网站的反调试与反反调试策略.md` | `51a3fc461b396583e182f5efc4b4c20a` | 2026-09-21 | `web-reverse-algorithm` | evolve | **sink→运行时栈→bundle 对位三步定位法**（先 hook `window.open`/`location` setter/`history`/`body.innerHTML`，用 `new Error().stack` 一次拿全 `XCID → onDevToolOpen → ht` 链路，再回快照按符号定位）；**隐藏 iframe 从 `contentWindow` 取未 hook 的原生 API**（只在主窗口 hook 会全失效）；`[native code]` 完整性校验；**内存炸弹**（`1000×1000` 对象 / `new Array(1e4).fill('x')` 定时器）；定时器拦截要从「全拦」收敛到「按调用栈白名单」 |
| 96 | `52pojie-2014821-js过反调试.md` | `0580097b41454853ae16f0929d0e4617` | 2026-09-21 | `web-reverse-algorithm` | evolve | 实战踩坑：hook 后断点「停不下来」是因为还要在 `eval` 里注入 + 定时器也在检测；**`endebug` / `txsdefwsw` 必须在断点处清空**（不在断点处清无效）；`location` 不可置空只能改判据或替换文件 |
| 97 | `52pojie-1901995-小白hook无限debugger.md` | `9cbe4bf28f5684159949f24d12b76bf1` | 2026-09-21 | `web-reverse-algorithm` | evolve | 三类 debugger（裸 / `eval` 内 / 定时器）与「必须在定时器首次执行前 hook」的时序要求；「永不在此断点」的副作用：内存爆破型会让浏览器卡死（这条是判据，不是偏好） |
| 98 | `52pojie-2040010-巧用Chrome-CDP远程调用Debug突破JS逆向.md` | `c670fd4748e5402da7dec632e0a85208` | 2026-09-21 | `web-reverse-algorithm` | evolve | **CDP 远程调用代替扣代码**：`chrome --remote-debugging-port=9222 --remote-allow-origins=*` → `http://localhost:9222/json` 取 `webSocketDebuggerUrl` → `Debugger.evaluateOnCallFrame`；`callFrameId` 从 DevTools 的 **Protocol Monitor** 里抓（请求参数里直接有）；Python 用 `websocket-client` 重发即可 |
| 99 | `52pojie-2128269-Drissionpage焦点伪造检测点.md` | `a6747f0407525585a801ed40013fe7cf` | 2026-09-21 | `web-reverse-algorithm` | evolve | **自动化框架自身的指纹**：DrissionPage 默认无条件下发 `Emulation.setFocusEmulationEnabled(enabled=True)`，导致页面被挤到后台后仍报 `hasFocus()===true` + `visibilityState==='visible'`；判据是**矛盾**而非 `hasFocus===true`；实测 A/B 对照 + 规避 `enabled=False`（新 tab/frame 后需再关） |
| 100 | `52pojie-2045645-浏览器指纹追踪入门：常见检测手段 + 小白适用的绕过小技巧.md` | `11612d32785e694c286a3027f3a71251` | 2026-09-21 | `web-reverse-algorithm` | evolve | 指纹检测 19 类清单（UA/语言/屏幕/Canvas2D/WebGL/AudioContext/字体/硬件/电池/时间精度/WebRTC/鼠标/键盘/插件/Flash/Selenium/Puppeteer/综合指纹）→ 与「运行时状态一致性」是**三类独立检测**，补了前两类不代表第三类也过 |
| 101 | `52pojie-2011480-[Web逆向反调试]常见检测到开发者工具的制止手段.md` | `6bba4ec2a3f550952e28ae65e655659a` | 2026-09-21 | `web-reverse-algorithm` | evolve | **`location` 的属性/方法不可重写**（直接置空无效，`defineProperty` 与 `Proxy` 也无效）⇒ 只能改条件逻辑或替换文件；`console.log/table` 的对象求值副作用被用作探测点；`setInterval/setTimeout` 也是探测通道；油猴注入时机必须 `@run-at document-start` |
| 102 | `52pojie-2015243-[学习笔记]JS逆向-控制台反调试使用的常见三种方式及hook思路.md` | `cf6e96ccd04c8587deb1de366c8988e5` | 2026-09-21 | `web-reverse-algorithm` | evolve | 三种控制台反调试：窗口尺寸（`outerHeight - innerHeight > 400`）、构造函数无限递归断点、定时器 debugger；对应的三种零时解法（一律不在此处暂停 / 条件断点 false / 替换文件）；**`console.log` 不要置空**（会破坏自身调试能力，且站点可能因此走另一条分支） |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `protobuf-reverse` | **create** | 新技能（本流水线第 2 个新建技能）。`SKILL.md` + 4 份 references（方言矩阵 / 分帧与传输 / 从生成 JS 还原 / 无描述表与误判清单）+ 2 个**零依赖**脚本：`scripts/pb_decode_raw.py`（`protoc --decode_raw` 的离线替代，含 **`--roundtrip` 逐字节可逆 oracle**、gRPC-Web/长度前缀/base64 帧剥离、嵌套自动判定、46 项 `--selftest`）、`scripts/pb_proto_from_js.js`（jspb 与 protobufjs(full) 双方言机械抽取，含模块别名尾段消解，35 项 `--selftest`） |
| `ast-deobfuscation` | evolve | 新增 `references/jsvmp-bytecode-and-decompiler.md`（助记符表必要性 / BOX 引用传递 / 成员引用数组 / `used` 标记 / 控制流与函数还原 / 迁移成本表）；新增 `scripts/jsvmp-mnemonic-table.js`（**跨版本稳定助记符**，`hole`/`empty`/`instruction` 三态分离，`--diff` 比对，31 项 `--selftest`）；`SKILL.md` 导航 +2 |
| `web-verify-patcher` | evolve | 新增 `references/tencent-tcaptcha-protocol.md`（腾讯系**提交参数来源的唯一权威源**：五参数来源表 / TDC 37 段拼接 / 魔改 TEA / `vData` 四步含自定义 base64 / 五请求链与 `csrf-token` 两步法 / 排错速查）；`provider-execution-notes.md` 腾讯小节改为指针（消除并行维护）；`browser-acquisition.md` 新增"框架自身指纹"两条规则；`SKILL.md` 导航 + description 触发词 |
| `web-reverse-algorithm` | evolve | 新增 `references/09-antidebug-and-automation-fingerprint.md`（**10 类反调试判据表** / 不受 hook 影响的检测 / `location` 不可重写与 `console.log` 不可置空 / **sink→栈→bundle 三步定位法** / 自动化框架自身指纹 / 处置决策树）；`SKILL.md` 导航 +2 |
| `websocket-reverse` | evolve | `references/cases/case-websocket-protobuf.md` 从"待补"补成完整流程（方言判据、两层结构、`payloadType` 路由、gzip 内层、round-trip 验收口径、与 `protobuf-reverse` 的分工）；`SKILL.md` protobuf 处理段与失败回退表改为指向 `protobuf-reverse` |
| `protocol-reverse` | evolve | 路由表新增 protobuf/gRPC-Web → `protobuf-reverse` 的分流；Phase 3 的 protobuf 步骤改为转技能；参考与自检段同步（消除 `protoc --decode_raw` 的重复维护） |

### 本批次的两级验证口径（新技能引入）

`protobuf-reverse` 把「解码无损」做成了**可判定的机械验收**，这是本批最重要的方法论增量：

1. **结构层**：解码 → 按原始顺序重编码 → 与原始字节**逐字节相等**（`--roundtrip`，零依赖）。
   仅靠"字段值看着对"不算——protobuf 允许任意字段顺序，按字段号重组字典会**静默丢顺序**。
2. **业务层**：自造的请求体与浏览器实际发出的请求体**逐字节相等**。
   "服务器返回 200"不能替代它：服务端对字段省略/乱序很宽容，字节不一致但能跑通的情况大量存在。

### 本批次的量化交叉验证

| 验证 | 方法 | 结果 |
| --- | --- | --- |
| 抽取器保真 | 用文章里**真实生成代码**做 fixture（`artifacts/skill-evolution/fixtures-20260921-0900/`） | protobufjs fixture 的产物与文章**手写**的 `.proto` 字段逐项一致 |
| 抽取器纠错 | 同一 fixture 与文章手写版逐字段 diff | 抓到文章手写版的**层级错误**：`case 45` 的 `readString()` 被写成嵌套 message `Issn issn = 45;`（旁证：其解码结果里 `"issn"` 是空对象） |
| 助记符跨版本不变 | 对真实 365 条指令的 VM 做**确定性重排 + 按 token 改名**（种子 20260921） | 助记符集合 **359/359 完全一致**；而**同位置**助记符相同数 **0/365** |
| 解码可逆 | `pb_decode_raw.py --selftest` 内置 10 个 round-trip 用例 | 含非 UTF-8 bytes、10 字节 varint、fixed32/64 混合、空载荷，全部逐字节还原 |

### 本批次评审与修复（3 名独立 judge，分视角）

| judge | 视角 | 判定 | 提出的问题 | 本轮处置 |
| --- | --- | --- | --- | --- |
| A | 保真度（逐条回源核对） | `needs-fix` → 修复后 keep | 2 项 | **2/2 已修**：① 把 `52pojie-1692444` 误列为 `read*`→类型映射的第二来源（该文是 protobufjs(full) 示例，**零个 `read*` 方法**）；② 方言 D 示例把 steam **三个不同 message** 的字段混编进一张表（`account_name` 在公钥请求是 n:1、登录请求是 n:2），字段号口径冲突 |
| B | 新用户可用性（20 条命令实测） | `needs-fix` → 修复后 keep | 5 阻断 + 若干建议 | **5/5 已修**：① 示例路径 `artifacts/captured.bin` 不存在 → 改占位符；② 示例 hex 被截断（声明长度 27 实际 12）→ 换完整 32 字节；③ `--b64` 叠 `--frame base64` 双重解码 → 拆分并加警示；④「两级验收缺一不可」与「没有 protoc 不影响交付」口径冲突 → 改为按有无 protoc 的两条**等价**路线；⑤ websocket case 的跨技能引用**少写 3 层 `../`**（`Cannot find module`）→ 修正并实测可达 |
| C | 机械校验（跑命令） | `needs-fix`（仅告警）→ 修复后 all-clear | 0 阻断 + 4 告警 | **3/4 已修**：① 非法 base64 抛裸 `binascii.Error` → 归一为 `PARSE FAIL`；② "解出 0 个字段"默认 exit 0 → 加 stderr 警告 + `--strict`；③（信息项）6 个 SKILL.md 用 CRLF；④ `web-js-env-patcher` 内 6 张重复表属**历史遗留**、非本批引入，登记为后续批次待办 |

**自检规模**：`pb_decode_raw.py` 46 项 / `pb_proto_from_js.js` 35 项 / `jsvmp-mnemonic-table.js` 31 项，全部通过。
judge C 已独立核对「打印的分母 = 实际断言数」，**无虚报**。

**体积门禁**（改后 SKILL.md / 改前 ≤ 150%）：`ast-deobfuscation` 111.7% · `web-verify-patcher` 105.0% ·
`web-reverse-algorithm` 112.8% · `websocket-reverse` 111.0% · `protocol-reverse` 136.2% —— 全部通过。
（`websocket-reverse` / `protocol-reverse` 的**改前备份缺失**，已记录在
`artifacts/skill-evolution/backup-20260921-0900/README-BACKUP-GAP.md`，后续批次务必先备份再改。）

### B6 新增能力的复跑命令

```bash
cd D:/work/jsreverse

# 1) 新技能自检（零依赖）
python .claude/skills/protobuf-reverse/scripts/pb_decode_raw.py --selftest      # 46 项
node   .claude/skills/protobuf-reverse/scripts/pb_proto_from_js.js --selftest   # 35 项

# 2) 结构层 oracle：真实样本解码 → 重编码 → 逐字节相等
python .claude/skills/protobuf-reverse/scripts/pb_decode_raw.py   --hex "00 00 00 00 1b 0a 0a 50 65 72 69 6f 64 69 63 61 6c 12 0d 77 6c 78 62 32 30 32 33 30 31 30 30 31"   --frame grpc-web --roundtrip --pretty

# 3) 从真实生成代码抽 .proto（fixture 取自文章原文）
node .claude/skills/protobuf-reverse/scripts/pb_proto_from_js.js   --input artifacts/skill-evolution/fixtures-20260921-0900/pbfull-matchplay.js   --out artifacts/skill-evolution/fixtures-20260921-0900/extracted-matchplay.proto --field-case keep --pretty
node .claude/skills/protobuf-reverse/scripts/pb_proto_from_js.js   --input artifacts/skill-evolution/fixtures-20260921-0900/jspb-wanfang.js   --out artifacts/skill-evolution/fixtures-20260921-0900/extracted-wanfang.proto --strict

# 4) JSVMP 助记符表：真实 VM + 跨版本不变量
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js --selftest   # 31 项
node artifacts/skill-evolution/tools/make-jsvmp-cross-version.js
D=artifacts/skill-evolution/jsvmp-run-20260921-0900
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js --input artifacts/tiktok/webmssdk.js --out $D/webmssdk-mnemonics.json --min-size 100
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js --input $D/webmssdk-shuffled-renamed.js --out $D/shuffled-mnemonics.json --min-size 100
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js --diff $D/webmssdk-mnemonics.json $D/shuffled-mnemonics.json
# 期望：A 359 条 / B 359 条 / 共有 359 条 / 完全一致 / exit 0

# 5) 整体机械校验（frontmatter / 引用可达 / 章节号 / 脚本自检 / 镜像逐字节 / 台账口径）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
```

---

## 三·F、批次 B7 · 2026-09-21（本流水线第 7 次执行）

取材口径：**单一能力族「字体 / CSS / 文本层反爬」一次性做全** ——
18 篇，覆盖**五个族 + 两个子形态**：A 字体 cMap（含 gid 顺序表 / 英文语义名 / `uniXXXX` 语义名四个形态）、
B 雪碧图背景图（大众点评网格式 / 实习僧偏移查表式）、C CSS 位移换序、D 伪元素 `::before` 补字、
E 定长分组自定义进制、F 同源字体换表（图元被换）。

选它的理由：`web-font-obfuscation` 是 B1 建的技能，**从建库到 B6 一次都没被演化过**，
而待处理队列里这一族积压了 **15+ 篇**（远超「同类 ≥3 篇才值得动」的门槛）；
更关键的是 B1 建库时只覆盖了「字体文件内部」的行列，**B/C/D/E/F 四族根本不碰字体文件**，
属于「技能名覆盖了、能力没覆盖」的隐性缺口 —— 用户搜「字体反爬」会被引导到本技能，
但真正需要的是雪碧图/CSS/伪元素/打包编码的算法。

**本批最大的能力级增量（不只是补文字）**：

| 增量 | 此前状态 | 现在 |
| --- | --- | --- |
| B/C/D/E/F 五族的分流判据 | 技能里只区分「字体 / 编码 / 验证码」三种，四族会被误判为「没有反爬」 | 一条 `Network 里有没有 .woff/.ttf/.svg` 的 30 秒分流 |
| 雪碧图网格还原 | 无 | `offset → (col, row_px) → path id → textPath 第 N 字` 全链路可执行 |
| CSS 位移换序 | 无 | 位置=`下标+round(偏移/step)`，配「不自洽硬失败」三条拒绝规则 |
| 伪元素补字 | 无 | `.clsN::before{content}` 抽取 + HTML 替换 + `replaced` 计数 |
| 定长分组解码 | 无 | base-N 逐组 + 条带语义，字典/分组长度可用已知码位反查 |
| **同源字体换表（F 族）** | 无。且**任何只 dump cmap 的做法在这一族 100% 失效且不报错** | 用官方原版字体建轮廓指纹模板库反推真值，歧义不猜 |
| 真值形态判据 | 只有「两层映射」的稳定性分类 | 按 glyphName 形态分流（`uniXXXX` 等/不等 · 英文语义名 · gid 顺序 · 真名） |
| OCR 兜底 | 只有一句反例「不要用 OCR 代替 cmap」 | 明确它的**适用边界**（cmap/轮廓都不可用时）+ 渲染留白/分档复核/符号后处理/反向校验 |

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 103 | `52pojie-1346210-Python反反爬之CSS加密---样式干扰(详细教程).md` | `cbba0823e923a40a423f3b979d09fa1c` | 2026-09-21 | `web-font-obfuscation` | evolve | **C 族（CSS 位移换序）**：页面拿到接口返回的 `key`/`value` 后现算 `j_key = md5(btoa(key+value) 去掉 = 号)`，用它 `display:none` 掉干扰图；正常显示的 4 张靠 `left` 偏移错位，`位置 = 下标 + round(偏移/step)`。实例：源码序 2941 显示为 2914。**偏移不是 step 整数倍 / 越界 / 撞位必须硬失败**——静默产出一个错的四位数比抛异常危险得多 |
| 104 | `52pojie-1772187-某小说站点逆向还原文本——CSS反爬，AST解混淆-完美破解于20230409.md` | `68c87199728cebbb11f501f8da818c85` | 2026-09-21 | `web-font-obfuscation` + `ast-deobfuscation` | evolve | **D 族（伪元素 `::before` 补字）**：症状是「文字缺失」不是「乱码」，`<span class="context_kwN"]` 为空、真值在 CSS 的 `content`。**锚点用 class 名尾部数字**（同站可能有 `context_kw0`/`context_kw0x`/`context_kw12` 混用）。同文还给出 **OB 字符串表的「三点定位法」**：取值函数体第 1 条的减数 = 偏移量；洗牌 IIFE 的**第二个实参 (= 左移次数)**与**第一个实参 (= 大数组名)**。另：常量未恢复时业务代码写成 `_0x0a9e(0x2c)`，很容易误判「这站没反爬」 |
| 105 | `52pojie-1441582-破解大众点评评论字体加密思路.md` | `156b30c1de42864d5b37de37e86dd911` | 2026-09-21 | `web-font-obfuscation` | evolve | **B 族（背景图网格）**：`行 = |y| - 1 + 图片高` 与 `<path d="M0 <row> H<宽>">` 的起点**逐字符相等**；`列 = |x| / 图片宽 + 1` 再到对应 `textPath` 取第 N 个字。**代入绝对值**（CSS 写 `-112.0px`，`d` 侧是 `2775`）——直接把 CSS 负号代进去会得 `-2729`，匹配不到任何 path |
| 106 | `52pojie-1677764-记一次实习僧雪碧图字体加密反爬.md` | `03c064b3338b05b0de186a62173c7c67` | 2026-09-21 | `web-font-obfuscation` | evolve | **B 族下子形态：偏移 → 真值的查表式**。站点下发 `300*(i+2) + (-30*(t-1) - 300*(i+2))`，内层相消后**与 i 无关**→ 只需对 300 取余再查表（正负两张表，同一真值出现两次）。**不能用 Python 的 `%`**：`-30 % 300 == 270`，会把 -30 错配到 +270 那一档 |
| 107 | `52pojie-2015241-【web逆向】优某愿 字体反混淆.md` | `c5b7bc0a43b4abfa3c85fa5c66c88cc7` | 2026-09-21 | `web-font-obfuscation` | evolve | **E 族（定长分组自定义进制）**：字典 `0-9A-Z`、分组 4、`((b1+b0*L)*L+b2)*L+b3` 合成码点。**可用 `【`/`】`（U+3010/3011）反查字典与分组长度**：它们编出来正是文章样本里的 `09HS`/`09HT`。**第二层映射不能混**：本步只得到字符，字符 → 真值还要另建表 |
| 108 | `52pojie-1631357-关于超星学习通网页版字体加密分析.md` | `d0d25ac311097a3f2c7acb78e061f81b` | 2026-09-21 | `web-font-obfuscation` | evolve | **F 族（同源字体换表）**：`cmap` 一字未改（原文明言「映射结果一致」），但 `glyf` 里 `uni6408` 装的是 `uni4E89`（争）的轮廓 → 屏幕上是 `争`、复制出来是 `搬`。**任何只 dump cmap 的做法 100% 失效且不报错**。解法：拿官方原版字体（如 SourceHanSansCN-Normal）建轮廓指纹模板库，反查真值 |
| 109 | `52pojie-1669861-记一次潇湘书院静态字体反爬.md` | `825faf5c26358d0701eedc8f4363ab99` | 2026-09-21 | `web-font-obfuscation` | evolve | **「恒等命名」的反例（本批最重要的修正）**：`cmap[0xE800]='uniE800'`（XXXX == 码位）但字体固定、用一次人工校准的静态字典 `{'uniE800':'的'}` 即可 —— `XXXX == 码位` **不能推出「图元被换」**，它只说明「名字不携带信息」。判 F 族要三条同时成立：**显示/源码字义不一致 + 字体每次刷新都变 + 存在官方原版字体** |
| 110 | `52pojie-1290997-快手解析作品 用户信息[字体反爬].md` | `6c9834a85d556c29e4f409dd7b007651` | 2026-09-21 | `web-font-obfuscation` | evolve | **gid 顺序表子形态**：字体子集化后按**固定顺序**排 gid，每次刷新只改 `cmap`。`getGlyphOrder()[1:]`（**必须切掉第 0 个 `.notdef`**，不切会静默错位一位）与固定明文顺序表 `['0'..'9','.','w','k','m','+']` 逐对应。出现 `w`/符号说明服务的是「粉丝数/播放量」复合数值 |
| 111 | `52pojie-1914310-【JavaScript 逆向】企某宝，header加密，字体反爬（内附源码）.md` | `016c9c52d05763e112ee3d02142afd5b` | 2026-09-21 | `web-font-obfuscation` | evolve | **`uniXXXX` 且 `XXXX != 码位` 时真值就在名字里**：`cmap {48:'uni4E66', ...}` → `chr(int(name[3:],16))` **一行解决，不需要 OCR、不需要人工校准**。另：这类站会**动态生成 woff**，每次请求都要重建映射，不能固定一份 |
| 112 | `52pojie-1780318-记一次字体反爬.md` | `a8c7eaf068085f15d6d81af0c70d0847` | 2026-09-21 | `web-font-obfuscation` | evolve | **字形名型态是真值的首要判据**：`value.replace('uni','\\u').encode().decode('unicode_escape')` 全量处理；与 `cmap` 用 `.getBestCmap()` 一致。强调「每次刷新都变」→ 必须动态解析、不能写死 |
| 113 | `52pojie-1576862-使用ddddocr解决某汽车论坛网站字体反爬.md` | `3351f38b473c10e405fa3113537c18ff` | 2026-09-21 | `web-font-obfuscation` | evolve | **渲染 + OCR 兜底的操作细节**：把 `ttf` 字形逐个渲染成图再识别；**字形居中且周边留白**能显著提高准确率；`ddddocr.DdddOcr().classification(img_bytes)` |
| 114 | `52pojie-1860909-论字体反爬通杀.md` | `1285ac3565841fb168491146570880a6` | 2026-09-21 | `web-font-obfuscation` | evolve | **OCR 兜底的另一条路（汉字用 cnocr） + 两条必备后处理**：(1) 识别得分分档（如 0.95），**低分不等于错**（`了`/`一`/`孩` 笔画少分数天然低）→ 低分落盘人眼复核；(2) 识别结果必须**与 cmap 项数相等**且抽 3 个与渲染图肉眼一致。与「不要用 OCR 代替解析 cmap」不矛盾：那条反对的是 cmap 可用时去 OCR |
| 115 | `52pojie-1721355-实战-某手H5字体反爬.md` | `88b3fad5f0dd6852d32d47548b3fb84f` | 2026-09-21 | `web-font-obfuscation` | evolve | **渲染路线的又一种实现（reportlab 画矢量路径再出图）**：跳过 `'.'` 开头的名字（`.notdef`/`.null`）；**OCR 后处理必备映射**：`十 → +`、`，/。 → .`。同文也是「每次返回的 ttf 都不一样」的典型例子 |
| 116 | `52pojie-1169827-尝试解决58同城数字加密.md` | `9d392885d996bb7a7d82534a502dcf3f` | 2026-09-21 | `web-font-obfuscation` | evolve | **58 同城早期形态的反面教材**：用 `{'闏':1,'鹣':2,...}` 硬编码字典 —— 作者自己注明「这个每次刷新都会有变化」。**正好是「不要硬编码映射表」的实例**：该站后续已升级为内嵌 base64 + 两层映射（见 `font-cmap-decode.md` §5 真实案例） |
| 117 | `52pojie-1656505-字体反爬——可视化字符匹配通用方案(浏览器版).md` | `1d3635a0c3f32ebfa5be03943d133238` | 2026-09-21 | `web-font-obfuscation` | evolve | **浏览器端可视化对照 + 识别接口批量识别的工程化路线**：把字体文件在前端渲染成逐字形 base64 图 → 批量丢识别接口 → 导出 JSON 映射表（错误项单独记录人工修复）。另给出**汽车之家「字体里没有 unicode 码」这类特殊情况**：页面仍能取到码位，只是字体占位空白 |
| 118 | `52pojie-914709-【吾爱破解】租房子被房东扣了一千五，发一个房产网站字体反反爬的研究过程。.md` | `0de6c907f08816711c7008f8ea6cb12e` | 2026-09-21 | `web-font-obfuscation` | evolve | **最原始的形态：只有 0-9 十个字形**，直接从 `ttf` 字节里看 `cmap` 就能建表；作者用 UE 看二进制定位码位与图形索引。对比今日形态可见该族的复杂度升级路径 |
| 119 | `52pojie-1786543-[爬虫--字体反爬] 爬取起点小说中文网的字数.md` | `f03a527cc1cde33f0022aae32b34e778` | 2026-09-21 | `web-font-obfuscation` | evolve | **字形名是英文语义名的子形态**：`one/two/.../zero/period` → 建 10+2 项字典（`period` = 小数点）。定位经典写法：正则从 `<style>` 后直取 `url('...') format('woff')`。与优某愿一样属「有明确语义名」这一类，优先级高于 OCR |
| 120 | `52pojie-1886624-某查查登录验证（滑块验证、图标验证、字体验证）.md` | `4aace6a11b2745fbf74a3c20cdd479d7` | 2026-09-21 | `web-verify-patcher` | skip | **边界判定：字体只出现在验证码里→跳出本技能**。本文主体是验证码协议（`captcha_type`: icon/word/slide、`process_token` 的 unicode 转码检索法、`w` 值构造）+ yolov8/siamese 模型（已在 B5 落库）。字体部分无新知识点 → **不建技能**，仅登记 |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-font-obfuscation` | **evolve（大幅）** | 新增 `references/css-and-sprite-obfuscation.md`（**B/C/D/E/F 五族的分流判据、还原算法、oracle 清单、排错速查**，本族划分的唯一权威源）；新增 `scripts/css_obfuscation_reverse.py`（六路规则 CLI：`offsets`(mod300/grid) · `order` · `pseudo` · `pack` · `sprite`，**201 项自检含拒绝路径**）；新增 `scripts/font_template_diff.py`（F 族：官方字体模板库 + 反查，**16 项自检**）；`references/font-cmap-decode.md` 新增 §7（glyphName 四形态 / 恒等命名两分支 / gid 顺序表 / OCR 兜底边界 / 同站多族分层）；`SKILL.md` 分流表重写为 8 行 30 秒分流 + description 触发词扩到雪碧图/CSS/伪元素/打包编码 |
| `ast-deobfuscation` | evolve | `references/string-array-and-minimal-eval.md` 新增「字符串表三点自动定位」（偏移量 / 左移次数 / 大数组名）——旧版 OB 把**业务常量（密钥、密文、CSS 片段）**藏在字符串表里，常量未恢复时业务代码全是 `_0x0a9e(0x2c)`，**极易误判「这站没有反爬」** |

### 本批新增的两级验证口径

1. **「看着对」不算验收**：这一族的产物**长得都像正常数字/汉字**，所以每族都配了机械 oracle ——
   B 族要求 `row_px` 与 HTML 里 `path d` 的起点**逐字符相等**；C 族要求还原后落在 `0..n-1` 的**严格排列**；
   D 族要求 `replaced == rule_count` + 抽样 3 处肉眼比对；E 族要求解码结果重新编码回去**逐字符相等**；
   F 族要求对**未改造的官方字体**跑一遍，结果必须等于 `cmap` 自报的字（**反向断言**）。
2. **反向断言是 F 族的命门**：如果脚本「什么都能认」，那它一定在瞎认。
   `--selftest` 里专门有一组用例造出「官方里两名字同形」的模板，验证脚本走 `ambiguous` 而**不是猜**；
   还有一组把指纹库清空，验证全部进 `unknown_fingerprint` 而不是硬凑。

### 本批次审计与修复（3 名独立 judge，分视角）

| judge | 视角 | 判定 | 提出的问题 | 本轮处置 |
| --- | --- | --- | --- | --- |
| A | 保真度（逐条回源 + 独立复算） | `needs-fix` → 修复后 keep | 2 major + 4 minor | **6/6 已修**。2 个 major 都是**会让人算出错数据**的：① `while(--b)` 的旋转次数口径 —— 原文是 `_0x19a768(++_0x36191f)`，**有效次数恰等于第二个实参**，文档原写「实际只旋转 b-1 次」会让常量数组整体错位一位（错位后 `fn(0x2c)` 仍返回一个字符串，**错误完全静默**）；② 「`uniXXXX` 且 `XXXX==码位`」被当作 F 族判据 —— 潇湘书院（`cmap[0xE800]='uniE800'`，静态字典即可解）是**同形态的反例**，已替换为「恒等命名 + 显示/源码字义不一致 + 存在官方原版字体」三条同时成立 |
| B | 新用户可用性（逐条命令实测） | `needs-fix` → 修复后 keep | 3 major + 4 minor | **7/7 已修**。① 命令入口有 3 条会因缺样本文件直接 `exit=1` → 拆成「可直接粘贴跑」5 条与「需要你的样本」3 条（占位符标注）；② `font_cmap_dump.py` / `font_glyph_fingerprint.py` 缺文件时抛**裸 traceback**（与同仓新增脚本行为不一致）→ 补 `OSError`/坏 JSON 的干净失败；③ F 族 `unknown_fingerprint` 非零后无自救路径 → 新增四步定位（看比例 → 抽 3 字渲染比对 → 轮廓扰动退路 → 复合字形字段区分） |
| C | 机械校验（跑命令 + 算术核对） | `needs-fix` → 修复后 all-clear | 0 阻断 + 2 告警 | **2/2 已修**。① `font-cmap-decode.md` 目录漏列新增的 §7 → 补齐；② 技能内 11 个文件 CRLF/LF 混用 → 统一为 LF 并同步镜像。另确认：**断言分母无虚报**（`css_obfuscation_reverse.py` 201 = 34+17+150 动态累加、`font_template_diff.py` 16 项）、引用全部可达、镜像逐字节一致、台账反引号口径 **0 条**非表格误包裹 |

**自检规模**：`css_obfuscation_reverse.py` **201 项**（六路规则 + 拒绝路径）/ `font_template_diff.py` **16 项** /
`font_cmap_dump.py` 四路容器往返 / `font_glyph_fingerprint.py` 字形定位，全部通过。
judge C 已独立做算术核对，无虚报。

**体积门禁**（改后 SKILL.md / 改前 ≤ 150%）：`web-font-obfuscation` **144.0%**（初版 171.4%，超门禁后
把重复的字体文件坑表收敛为指向 `font-cmap-decode.md §6` 的指针）、`ast-deobfuscation` **100.0%** —— 全部通过。

### B7 新增能力的复跑命令

```bash
cd D:/work/jsreverse

# 1) 四族还原 CLI —— 前四条可直接跑（用文章真实数值），后两条需自备样本
S=.claude/skills/web-font-obfuscation/scripts
python $S/css_obfuscation_reverse.py --selftest                                 # 201 项
python $S/css_obfuscation_reverse.py offsets --rule mod300 --offset -600        # -> value "1"
python $S/css_obfuscation_reverse.py sprite --x -112.0 --y -2752.0 --cell 14x24 # -> row_px 2775, col 9
python $S/css_obfuscation_reverse.py order --pairs "2,0;9,0;4,11.5;1,-11.5"    # -> "2914"
python $S/css_obfuscation_reverse.py pack --input "001H0039001H0032"            # -> "5u5n"

# 2) F 族：官方字体模板库 → 反推伪造字体
python $S/font_template_diff.py --selftest                                      # 16 项
python $S/font_template_diff.py template <官方原版.ttf> -o tmpl.json
python $S/font_template_diff.py apply <站点字体.ttf> --template tmpl.json -o map.json

# 3) 既有脚本回归（本次补了 IO 错误处理，行为不变）
python $S/font_cmap_dump.py --selftest
python $S/font_glyph_fingerprint.py --selftest
python $S/font_cmap_dump.py dump /nonexistent.ttf   # 期望：IO FAIL 一行，无 traceback

# 4) 整体机械校验（frontmatter / 引用可达 / 章节号 / 脚本自检 / 镜像逐字节 / 台账口径）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
```

---

## 四、待处理队列

| 项 | 值 |
| --- | --- |
| `docs/references/*.md` 总数 | 465 |
| 其中 `README.md` | 1 |
| 其中 `verified.md` | 1 |
| 其中 `*.验证报告.md` | 3 |
| 文章总数 | 460 |
| 已处理（本表登记） | 120 |
| **待处理** | **340** |

> **B7 后更新（2026-09-21 11:30）**：B6（27 篇）+ B7（18 篇）已登记，
> 目录文章数已增至 460。**B7 取材口径回顾**：`web-font-obfuscation` 从 B1 建库到 B6
> **一次都没被演化过**，而这一族积压 15+ 篇 —— 属于「技能名覆盖了、能力没覆盖」的隐性缺口。
>
> ⚠️ **本小节之后各批不再逐批改这张表**（改动集一多就必然漂移）。**权威口径一律以
> `node artifacts/skill-evolution/tools/scan-pending.js` 的实跑输出为准**。
> B35 收尾时实跑值：目录 `.md` **1167** / 文章 **1162** / 已登记 **679** / **待处理 483**。

下一批取材建议（按「同族聚簇、一次落一个技能」原则）。

> ⚠️ **本节刻意不使用反引号包裹文件名**：台账的幂等口径是"「文件」列出现过的条目视为已处理"，
> 而提取脚本通常用 `` `xxx.md` `` 反引号模式匹配。若在这里把候选文件名写成反引号形式，
> 下一轮扫描会**误判它们已处理**，导致永久漏做。候选清单一律用普通文本书写。

1. ~~**验证码图像识别系（体量最大）**~~ → **B5 已完成**（19 篇，落 `web-verify-patcher`：
   新增 `references/click-select-and-order.md` + `scripts/assign_by_similarity.py` + `scripts/order_restore.py`）。
   该簇**仍有剩余**，下一批优先补「真拼图与形状类」：
   1756692 某片滑块与点选、1857712 百某网数字九宫格、1888845 手势验证码、2051922 手势验证码纯算、
   2109685 已做但同族的 2088578 某雷云盘验证码、1901741/2085320/1715908 等 AST 系另计。
2. **新优先级①：真拼图 / 双缺口 / 旋转系（B5 只覆盖了「识别路线」，协议侧仍薄）**：
   2043678 已做（真假双滑块），仍可补 2111224 之外的 1892035 同族与 2038972 v5 滑块、2126956 qcloud 滑块、
   2097198 腾讯滑块纯算法、2054148 360 滑块。
3. **新优先级②：同盾 / 数美 / 易盾三家的「协议 + 图片还原」已成体系**，
   下一批若遇同族文章，直接往 `provider-execution-notes.md` 对应小节追加即可，不要再新建文件。
4. ~~**瑞数系（≥10 篇）**~~ → **B4 已完成**（12 篇，落 `web-js-env-patcher`；并额外引入独立实现做交叉验证）。
   B4 遗留：`web-js-env-patcher` 已不再是「最大知识空洞」，但**尚无自动化端到端 Cookie 对拍脚本**
   （`nsd` 正确性目前只能人工验）；若后续再遇瑞数样本，优先补这个对拍门禁。
   同族剩余未处理：**其它厂商标的的挑战页/风控 Cookie** 可复用本批的「三件套 + 多趟生成 + 原始字节」三件套方法论。
5. **Cloudflare 系**：1752891 cloudflare-turnstile-reverse、2116523 cloudflare-drop-reverse、
   2097555 论Cloudflare验证的自动化方案 → 与既有 `cloudflare/` 案例合并评估。
6. **反调试 / 动态 JS 系（可与 `07-antidebug-and-live-patching.md` 对拍）**：
   1337317 源码乱码、1339239 动态 Cookie、1513032 补环境到底在补什么、1495847 补环境踩坑。
7. **未覆盖的候选新技能**：`captcha-flow-orchestration`（整站过验证流程）——
   候选篇目 2098532、2097555、1808597、2062618，累计 ≥3 篇同类即可评估新建。
   **B3 新增观察**：极验的「失败重试链 + 换题」与瑞数的「异步方案」都属于流程编排层，
   若这两条线的文章累计到 ≥5 篇，该新技能的必要性会明显上升。
   **B5 更新**：本批再次确认**不新建**该技能 —— 百度旋转三接口链、数美两段式、易盾四接口链、
   真假双滑块的两段流程，都更适合作为 `web-verify-patcher` 的**厂商执行注意点**（渐进披露），
   而非另起一个流程编排技能。证据池仍为 2098532 / 2097555 / 1808597 / 2062618。

---

## 五、评审记录（darwin paired，原始票数）

> 格式：`技能 | better-worse-tie 票数 | margin 分布 | 裁定`

### 批次 B1（2026-09-20）

| 技能 | 票数 (better/worse/tie) | margin | 裁定 |
| --- | --- | --- | --- |
| `ast-deobfuscation` | 3 / 0 / 0 | clear×3 | **keep** |
| `wsam-reverse` | 3 / 0 / 0 | clear×3 | **keep** |
| `web-reverse-algorithm` | 3 / 0 / 0 | clear×3 | **keep** |
| `web-verify-patcher` | 3 / 0 / 0 | clear×3 | **keep** |

**说明**：本表由 2026-09-20 批次 B1 的 3 名独立 judge 产出；judge 只读文件、不写文件，各自在**同一轮内**同时读取改前与改后（within-judge cancellation，消除换尺污染）。若后续批次发现某技能被判 `worse`，按 darwin 规则从 `backup-<ts>/` 恢复该文件（等价于 `git revert`）。

**体积门禁**：`wsam-reverse` 首轮改动后 `SKILL.md` 达基线 164.2%，**超 darwin 150% 上限**，被门禁拦下；拆出 `references/wasm2c-and-memory-semantics.md` 做渐进披露后降至 **149.6%** 才允许提交。其余三个技能分别为 104.4% / 114.8% / 102.4%。

**原始评审日志**：`artifacts/skill-evolution/results-20260920-1635.tsv`（darwin 9 列格式）。

### 批次 B2（2026-09-20）

| 技能 | 票数 (better/worse/tie) | margin | 裁定 |
| --- | --- | --- | --- |
| `web-verify-patcher` | 3 / 0 / 0 | clear×2 + marginal×1 | **keep** |
| `ast-deobfuscation` | 3 / 0 / 0 | clear×2 + marginal×1 | **keep** |
| `web-reverse-algorithm` | 3 / 0 / 0 | clear×2 + marginal×1 | **keep** |

**体积门禁（B2）**：`web-verify-patcher` 105.0%、`ast-deobfuscation` 112.5%、`web-reverse-algorithm` 105.1%，均在 150% 以内。
所有新增能力均落在 `references/` 与 `scripts/`（渐进披露），`SKILL.md` 只增导航与触发词。

**原始评审日志**：`artifacts/skill-evolution/results-20260920-1807.tsv`。

### 批次 B3（2026-09-20）

| 技能 | 票数 (better/worse/tie) | margin | 裁定 |
| --- | --- | --- | --- |
| `web-verify-patcher` | 3 / 0 / 0 | clear×3 | **keep** |
| `ast-deobfuscation` | 3 / 0 / 0 | clear×3 | **keep** |
| `web-reverse-algorithm` | 3 / 0 / 0 | clear×3 | **keep** |

**体积门禁（B3）**：`web-verify-patcher` 107.2%、`ast-deobfuscation` 109.5%、`web-reverse-algorithm` 111.5%，均在 150% 以内。
本批新增全部落在 `references/` 与 `scripts/`，`SKILL.md` 只在导航、触发词、以及一处**删减**（移除写死的机器绝对路径）上有改动。

**原始评审日志**：`artifacts/skill-evolution/results-20260920-1939.tsv`；
缺陷明细：`artifacts/skill-evolution/judge-findings-20260920-1939.md`。

---

### 批次 B4（2026-09-20）

| 技能 | 票数 (better/worse/tie) | margin | 裁定 |
| --- | --- | --- | --- |
| `web-js-env-patcher` | 3 / 0 / 0 | clear×3 | **keep** |

> B4 只演化 1 个技能，3 个独立 judge 分别从「知识保真度」「新用户可用性」「机械校验」三个视角评审。
> **judge 提出的 20 项缺陷已在本轮内全部处理**，其中 **1 项被证据驳回**（详见 `artifacts/skill-evolution/judge-findings-20260920-2155.md`）：
> judge A 称 §4.4 的 `_$BW`/`_$o9`/`_$PO`/`_$0f`/`$_ts._$AX` 在全部来源中零命中，
> 实测**不成立** —— 这些标识符在来源文章 1846988 中分别出现 7 / 4 / 3 / 5 / 3 次，原文段落为「步骤 21」，
> 故保留原内容并追加「标识符随样本变化」的提醒。**judge 结论必须回源复核后才能落地。**

### 批次 B5（2026-09-20）

| 技能 | 票数 (better/worse/tie) | margin | 裁定 |
| --- | --- | --- | --- |
| `web-verify-patcher` | 3 / 0 / 0 | clear×3 | **keep** |

> B5 只演化 1 个技能（`web-verify-patcher`），3 个独立 judge 分「**来源保真度**」「**新用户可用性**」
> 「**机械校验**」三个视角评审，每个 judge 都在同一轮内同时读改前（`backup-20260920-2305/`）与改后。
> **judge 提出的 11 项缺陷本轮全部处理**，其中 **2 项经回源/实测复核后按事实改写**：
> ① `restore_slices.py` 对越界顺序**直接 `SystemExit` + JSON 报错退出**（不是"发 warning"）——
> 文档已改述，并实测复现确认；② 易盾 JSONP `callback` 后缀是**递增计数器**（不是固定 `1`）——
> 来源 2111224 的 `("_" + i++)` 与 1654390 的实测样本 `__JSONP_mvnvfob_6` 双证，已改述。
> 另 1 项 judge 的「遗漏」被**驳回**：judge A 称 `ddddocr.detection()`「检测即坐标」路线未落库，
> 实际已写入 `click-select-and-order.md` §二 与 §3.1（含"扣字→拼接→`text.index` 回查"全流程）。
> **judge 结论必须回源复核后才能落地**这条规则，B4/B5 各命中一次。
> 缺陷明细：`artifacts/skill-evolution/judge-findings-20260920-2305.md`。

**体积门禁（B5）**：`web-verify-patcher` 改后 `SKILL.md` 16141 字节 / 改前 14631 字节 = **110.3%**，在 150% 以内。
本批新增能力全部落在 `references/`（1 个新文件 + 7 个文件增量）与 `scripts/`（2 个新 CLI + 1 个既有 CLI 扩能），
`SKILL.md` 只增导航与触发词（`语序点选` / `GIF 动图` / `旋转滑块`）。

**原始评审日志**：`artifacts/skill-evolution/results-20260920-2305.tsv`。

---

### 批次 B6（2026-09-21，3 名 judge 分视角）

| judge | 视角 | 判定 | 提出 | 处置 |
| --- | --- | --- | --- | --- |
| A | 保真度 | needs-fix → keep | 2 | 2/2 已修（误把 protobufjs(full) 当 `read*` 映射来源；方言 D 把三个 message 的字段混编进一张表） |
| B | 新用户可用性 | needs-fix → keep | 5 阻断 | 5/5 已修（占位路径不存在、hex 被截断、`--b64` 双重解码、口径冲突、跨技能引用少 3 层 `../`） |
| C | 机械校验 | needs-fix（仅告警）→ all-clear | 4 告警 | 3/4 已修（裸 `binascii.Error`、0 字段默认 exit 0、CRLF）；第 4 项为历史遗留，已登记待办 |

### 批次 B7（2026-09-21，3 名 judge 分视角）

| judge | 视角 | 判定 | 提出 | 处置 |
| --- | --- | --- | --- | --- |
| A | 保真度（逐条回源 + 独立复算） | needs-fix → keep | 2 major + 4 minor | 6/6 已修。**两个 major 都会让人算出错数据**：① `while(--b)` 旋转次数（原文 `_0x19a768(++_0x36191f)`，有效次数**恰等于第二实参**，不是 b-1）；② 把「`uniXXXX` 且 `XXXX==码位`」当 F 族判据（潇湘书院是同形态反例） |
| B | 新用户可用性（逐条实测） | needs-fix → keep | 3 major + 4 minor | 7/7 已修（3 条命令缺样本直接 exit=1；两个既有脚本裸 traceback；`unknown_fingerprint` 无自救路径） |
| C | 机械校验（跑命令 + 算术核对） | needs-fix → all-clear | 0 阻断 + 2 告警 | 2/2 已修（目录漏列 §7；11 文件 CRLF/LF 混用）。另确认断言分母**无虚报**、引用全可达、镜像逐字节一致、台账反引号口径 0 条误包裹 |

> **B7 的 judge 复核留痕**：judge A 的 6 项意见**全部回源复核后成立**（本轮无驳回）。
> 其中「旋转次数」一项已用 `grep -n "function (_0x149720, _0x36191f)" -A14` 原文比对确认；
> 「恒等命名」一项已用潇湘书院原文的 `zd = {'uniE800':'的', …}` 与 `getEmBestCmap` 用法确认。

## 六、校验结果（2026-09-20 批次 B1）

| # | 校验项 | 方法 | 结果 |
| --- | --- | --- | --- |
| 1 | frontmatter 合法性 | 逐技能解析 YAML 头：`name` 必须等于目录名、`description` ≤ 1024 字符 | ✅ 13/13 通过 |
| 2 | 脚本语法 | `node --check`（.js）/ `python -m py_compile`（.py） | ✅ 全量通过 |
| 3 | 新技能脚本自检 | `font_cmap_dump.py --selftest`、`font_glyph_fingerprint.py --selftest` | ✅ 两条 PASS（sfnt/format4 + WOFF1/zlib + format12 + TTC 四路往返；glyf 点序列解析往返） |
| 4 | 脚本真实样本复验 | 对 `C:/Windows/Fonts` 下 arial.ttf / consola.ttf / calibri.ttf / simsun.ttc 实跑 `dump` 与 `fingerprint` | ✅ 分别解析出 3404 / 2488 / 3749 / 28849 个码位；TTC `--face` 与 `crosswalk` 均正常 |
| 5 | 引用可达性 | 扫描全部 `SKILL.md` 中 `references/*.md` 相对引用并 `stat` | ✅ 本技能内缺失引用 0（修复 8 处历史失效链接） |
| 6 | 镜像一致性 | `diff -rq .claude/skills .agents/skills` | ✅ `MIRROR_IDENTICAL`（13 对目录逐字节一致） |
| 7 | 体积门禁 | 改后 / 改前 SKILL.md 字节比 ≤ 150% | ✅ 104.4% / 149.6% / 114.8% / 102.4% |

---

## 七、校验结果（2026-09-20 批次 B2）

| # | 校验项 | 方法 | 结果 |
| --- | --- | --- | --- |
| 1 | frontmatter 合法性 | 逐技能解析 YAML 头：`name` == 目录名、`description` ≤ 1024 | ✅ 14/14 通过 |
| 2 | 脚本语法 | `node --check`（.js）/ `python -m py_compile`（.py）全量 | ✅ 通过 |
| 3 | 新脚本自检 | `restore_slices.py --selftest` | ✅ 8/8 PASS（PNG RGBA 往返、`_n` 派生为 0..31 排列、换名换序、`Cn` 中 `c` 覆盖 `sid`/`aid`、网格还原、两语义互逆等价、`seam_score` 判优、order 长度校验） |
| 4 | 新脚本强校验冒烟 | 构造合法 PNG 后跑非法输入 | ✅ `order` 长度不符 → `order_length_mismatch`；含重复 → `order_not_a_permutation`；非 PNG 输入 → 明确报错（不再静默截断） |
| 5 | **AST pass 语义等价性** | 4 个夹具（静态折叠 / 多入口嵌套 / 重赋值守卫 / fallthrough 守卫）分别 **用 node 实跑改前与改后代码并比对 stdout** | ✅ 4/4 `EQUIVALENT`（改前改后运行结果完全一致）+ 4/4 输出与基线 diff 一致 |
| 6 | 检测器与流水线接入 | `detect-patterns.js` 对 `__zp_stoken__` 样本 → `bestId=zhipin`；`run-pipeline.js <in> <out> zhipin` | ✅ `status: ok`，产出正确的单层 switch |
| 7 | 引用可达性 | 全技能 `.md` 内 `references/*.md` 与 `../` 相对引用逐条 `stat`（按 skill 根解析约定） | ✅ 173 条，缺失 0 |
| 8 | 镜像一致性 | `diff -rq .claude/skills .agents/skills` | ✅ `MIRROR_IDENTICAL` |
| 9 | 体积门禁 | 改后 / 改前 SKILL.md 字节比 ≤ 150% | ✅ 105.0% / 112.5% / 105.1% |

---

## 七·B、校验结果（2026-09-20 批次 B3）

| # | 校验项 | 方法 | 结果 |
| --- | --- | --- | --- |
| 1 | frontmatter 合法性 | 逐技能解析 YAML 头：`name` == 目录名、`description` ≤ 1024 | ✅ 14/14 通过（三个被改技能 desc 分别 451 / 549 / 876 字符） |
| 2 | 脚本语法 | `node --check`（.js）/ `python -m py_compile`（.py） | ✅ 通过（含改动过的 `geetest4-guarded-pass.js`） |
| 3 | 新脚本自检 | `restore_slices.py --selftest` | ✅ **16/16 PASS**（原 8 项 + 新增 8 项：gt3 SEQUENCE 复刻与公开硬编码表逐元素相等、换盐换序、换盐仍是 0..51 排列、盐越界拒绝、gt3 往返还原 312×160→260×160、gt3 排列校验、gt3 源图尺寸校验、gt3 CLI 端到端） |
| 4 | 新脚本强校验冒烟 | 构造合法 312×160 PNG 后跑 5 类非法输入 | ✅ `gt3_order_length_mismatch` / `gt3_restore_failed`（非排列）/ `gt3_salt_invalid`（盐越界）/ `gt3_restore_failed`（源图尺寸不符）均以**结构化 JSON + rc=1** 拒绝，不产出错位底图；合法输入 rc=0、输出 260×160 |
| 5 | **交叉验证（两条独立来源）** | 由 `SEQUENCE()` 公式展开的 52 元素置换 vs 另一篇公开文章直接给出的硬编码表 | ✅ **逐元素完全相同**（且均为 0..51 的排列）—— 两个独立来源互证，是本批最硬的证据 |
| 6 | **AST pass 语义等价性** | 夹具 `fixtures-20260920-1939/alias-and-next-statement.js` **用 node 实跑改前/改后并比对 stdout** | ✅ 改后 `S242` == 基线 `S242`；**改前抛 `ReferenceError: keep is not defined`**（证明旧版存在静默删代码缺陷） |
| 7 | AST pass 真实样本回归 | `geetest/gcaptcha4.js`（1647 组别名族）跑新旧 pass，统计 AST 节点数与解析错误 | ✅ 改前 91,832 节点 / 改后 100,928 节点、两者 `errors = 0` ⇒ 旧版静默丢失约 9,096 节点真实代码；产物留档 `geetest4-run-20260920-1939/` |
| 8 | 引用可达性（含跨技能） | 全技能 `.md` 内 `references/*.md` 与**任意深度 `../`** 相对引用逐条 `stat` | ✅ 186 条引用缺失 0；`../` 类 22 条中仅 8 条为 `protocol-reverse/SKILL.md` 的父级仓库路径（B2 已注明**不在本仓库**，属预期） |
| 9 | 章节编号与内部引用 | 检查被引用的 `§N` / `§N.M` 在被引文件里是否真实存在、章节是否重号 | ✅ 通过（本轮修掉 1 处重复标题、2 处指向不存在章节的引用） |
| 10 | 镜像一致性 | `diff -rq .claude/skills .agents/skills` | ✅ `MIRROR_IDENTICAL` |
| 11 | 体积门禁 | 改后 / 改前 SKILL.md 字节比 ≤ 150% | ✅ 107.2% / 109.5% / 111.5% |

---

## 七·C、校验结果（2026-09-20 批次 B5）

| # | 校验项 | 方法 | 结果 |
| --- | --- | --- | --- |
| 1 | frontmatter 合法性 | `SKILL.md` 的 `name` == 目录名；`description` ≤ 1024 字符 | ✅ 899 字符，通过 |
| 2 | 脚本语法 | `python -m py_compile scripts/*.py` | ✅ 13/13 通过 |
| 3 | 新增 CLI 自检 | `assign_by_similarity.py --selftest` | ✅ 107 项全过（含 100 组随机矩阵与暴力枚举最优对照） |
| 4 | 新增 CLI 自检 | `order_restore.py --selftest` | ✅ 8 项全过（含 `len²` 权重、`freq=0` 兜底、重复字排列去重、坐标回填、词表解析容错） |
| 5 | 既有 CLI 扩能回归 | `restore_slices.py --selftest` | ✅ 22 项全过（原 16 项 + hex 顺序解析/拒绝非法输入/hex CLI 端到端与十进制逐字节一致 6 项） |
| 6 | 引用可达性 | 逐条 stat（含跨技能 `../` 与任意深度） | ✅ 26 条引用 0 失联 |
| 7 | §章节号 | 被引用章节在被引用文件中存在、同文件无重号 | ✅ 通过（本轮顺带把 8 处「阿拉伯 §N ↔ 中文标题」统一成中文编号） |
| 8 | 镜像一致性 | `diff -rq .claude/skills/web-verify-patcher .agents/skills/web-verify-patcher` | ✅ 无差异、无 `__pycache__` |
| 9 | 体积门禁 | 改后 `SKILL.md` ÷ 改前 ≤ 150% | ✅ 110.3% |
| 10 | 仓库校验器 | `node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown` | ✅ 14 个技能 · 阻断 0 · 告警 0 |
| 11 | 台账口径自检 | 反引号包裹的候选文章名必须为 0 条 | ✅ 0 条（本批 19 篇全部登记入表） |
| 12 | 错误可读性 | 缺输入文件时的报错 | ✅ 已由裸 `FileNotFoundError` 栈帧改为 `SystemExit` + JSON `{"error":"input_not_found","hint":...}` |

> 新增回归夹具：`scripts/restore_slices.py --selftest` 的 hex 用例为**合成图往返**（不依赖外部样本），
> 与 B3 建立的「合成往返 + 真实样本」两级回归一致。

---

## 八、复跑命令（供下一批次复用）

```bash
# 1) 计算当前全部文章的哈希，与本文台账比对，得出待处理队列
cd docs/references && md5sum *.md | grep -v -e 'README.md' -e '验证报告' > /tmp/now.txt

# 2) 台账里已登记的文件名 → 差集即待处理
#    台账「文件」列可直接 grep：grep -o '`[^`]*\.md`' verified.md | tr -d '`' | sort -u

# 3) 新技能/脚本自检（无外部依赖）
python .claude/skills/web-font-obfuscation/scripts/font_cmap_dump.py --selftest
python .claude/skills/web-font-obfuscation/scripts/font_glyph_fingerprint.py --selftest
python .claude/skills/web-verify-patcher/scripts/restore_slices.py --selftest   # 16 项

# 3.1) 极验 v3 底图还原（专用几何，B3 新增）
python .claude/skills/web-verify-patcher/scripts/restore_slices.py \
    --model gt3 --input bg.png --out bg.restored.png --pretty
#      默认盐 6_11_7_10_4_12_3_1_0_5_2_9_8；换 SDK 版本后：--gt3-salt "<新盐>"
#      已有实测置换时：                                  --order "39,38,48,..."

# 3.2) 挑战页 / 瑞数类（B4 新增）
#      三件套抽取：meta.content + 内联 ts 脚本 + 外链 JS，含 sha256、格式体检、外链降级匹配告警、代际信号
node .claude/skills/web-js-env-patcher/scripts/extract_challenge_bundle.js --selftest          # 35 项
node .claude/skills/web-js-env-patcher/scripts/extract_challenge_bundle.js <412页面.html>     --status 412 --cookies <Set-Cookie串或文件> --out case/notes/challenge-bundle.json --markdown

#      变量名确定性重算（把「正则动态匹配」升级为「由 nsd 重算」）
node .claude/skills/web-js-env-patcher/scripts/ruishu_keynames.js --selftest                   # 37 项
node .claude/skills/web-js-env-patcher/scripts/ruishu_keynames.js --extract-keyname-num <vm.js>
node .claude/skills/web-js-env-patcher/scripts/ruishu_keynames.js --nsd 24296 --keyname-num 851 --limit 20
#      覆盖率校验（真实样本回归；注意：覆盖率**不能**验证 nsd，nsd 需端到端 Cookie 对拍）
node .claude/skills/web-js-env-patcher/scripts/ruishu_keynames.js     --verify "open-source/reverse-skill-old/项目资料/rs-reverse-main/example/codes/main.js"     --nsd 24296 --keyname-num 851
#      期望：反向覆盖率 68/69 = 98.6%（池外样例 _$uf）→ 达标 exit 0；池取 100 则 exit 3

# 3.3) 技能库机械校验（B4 新增，一把梭覆盖前几批零散检查）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
#      覆盖：frontmatter / 引用可达性（含任意深度 ../ 与 <占位符> 跳过）/ §章节号存在性与重号 /
#            全部脚本 node --check 与 --selftest / .claude↔.agents 镜像逐字节 / 台账反引号口径
#      期望：阻断项 0 · 告警 0

# 4) 镜像一致性（.claude/skills 与 .agents/skills 必须逐字节一致）
diff -rq .claude/skills .agents/skills && echo MIRROR_IDENTICAL

# 5) frontmatter 批量校验（name 与目录名一致、description ≤1024）
python - <<'PY'
import re, pathlib
for p in sorted(pathlib.Path('.claude/skills').glob('*/SKILL.md')):
    t = p.read_text(encoding='utf-8'); m = re.match(r'^---\n(.*?)\n---\n', t, re.S)
    name = re.search(r'^name:\s*(.+)$', m.group(1), re.M).group(1).strip()
    d = re.search(r'^description:\s*(.*)$', m.group(1), re.M).group(1).strip().strip('"')
    if name != p.parent.name or len(d) > 1024:
        print('FAIL', p.parent.name, name, len(d))
print('frontmatter OK')
PY

# 6) 引用可达性（约定：`references/x.md` 相对 skill 根解析；`../` 相对引用它的文件解析）
python - <<'PY'
import re, pathlib
missing=[]; total=0
pat = re.compile(r'`((?:\.\./)?(?:\.\./)?references/[^`]+\.md)`')
for p in pathlib.Path('.claude/skills').rglob('*.md'):
    skill = pathlib.Path('.claude/skills')/p.relative_to('.claude/skills').parts[0]
    for m in pat.finditer(p.read_text(encoding='utf-8')):
        rel=m.group(1); total+=1
        if '<' in rel or '*' in rel: continue
        tgt=(p.parent/rel).resolve() if rel.startswith('..') else (skill/rel).resolve()
        if not tgt.exists(): missing.append(f'{p.relative_to(".claude/skills")} -> {rel}')
print(f'{total} 条引用, 缺失 {len(missing)}')
for x in sorted(set(missing)): print('  ',x)
PY

# 7) 体积门禁：与 backup-<ts>/ 对比，改后 SKILL.md 不得超过改前 150%
python - <<'PY'
import os
base='artifacts/skill-evolution/backup-<ts>'
for s in ['web-verify-patcher','ast-deobfuscation','web-reverse-algorithm']:
    b=os.path.getsize(f'{base}/{s}/SKILL.md'); a=os.path.getsize(f'.claude/skills/{s}/SKILL.md')
    print(('OK  ' if a<=b*1.5 else 'OVER')+f' {s}: {a}/{b} = {a/b*100:.1f}%')
PY

# 8) ast-deobfuscation 专用 pass 的回归（本机无 git；skill 脚本不带 node_modules，
#    需把某个 case 自带的 @babel 注入模块解析路径 —— 复用现成 preload）
for f in basic-static-collapse multi-entry-nested guard-reassign-and-dynamic guard-fallthrough; do
  node -r D:/work/jsreverse/artifacts/skill-evolution/tools/node-resolve-preload.js \
    D:/work/jsreverse/.claude/skills/ast-deobfuscation/scripts/patterns/zhipin-switch-pass.js \
    "D:/work/jsreverse/artifacts/skill-evolution/fixtures-20260920-1807/$f.js" \
    "/tmp/$f.actual.js"
  diff -q "/tmp/$f.actual.js" "D:/work/jsreverse/artifacts/skill-evolution/fixtures-20260920-1807/$f.expected.js" \
    && echo "PASS $f"
done

# 9) 极验别名族 pass 的语义等价性回归（B3 新增；fixture 与真实样本两级）
PRE=D:/work/jsreverse/artifacts/skill-evolution/tools/node-resolve-preload.js
FIX=D:/work/jsreverse/artifacts/skill-evolution/fixtures-20260920-1939/alias-and-next-statement.js
node "$FIX"                                                     # 基线输出 S242
node -r "$PRE" D:/work/jsreverse/.claude/skills/ast-deobfuscation/scripts/patterns/geetest4-guarded-pass.js \
     "$FIX" /tmp/alias.after.js && node /tmp/alias.after.js      # 必须同为 S242（旧版会抛 ReferenceError）

# 10) 真实样本回归：对比新旧 pass 的 AST 节点数（新版不得少于旧版）
PRE=D:/work/jsreverse/artifacts/skill-evolution/tools/node-resolve-preload.js
node -r "$PRE" D:/work/jsreverse/.claude/skills/ast-deobfuscation/scripts/patterns/geetest4-guarded-pass.js \
     D:/work/jsreverse/geetest/gcaptcha4.js /tmp/gt4.after.js
node D:/work/jsreverse/artifacts/skill-evolution/tools/count-nodes.js /tmp/gt4.after.js
```

### B5 新增能力的复跑命令（`web-verify-patcher`）

```bash
cd D:/work/jsreverse

# 1) 点选类：相似度矩阵 → 行列不相交指派（贪心 / 匈牙利，零依赖；含 top1–top2 分差门槛）
python .claude/skills/web-verify-patcher/scripts/assign_by_similarity.py --selftest
python .claude/skills/web-verify-patcher/scripts/assign_by_similarity.py   --matrix "0.1,0.2,0.8,0.5;0.9,0.3,0.5,0.1;0.5,0.1,0.1,0.8;0.2,0.7,0.1,0.3" --pretty

# 2) 语序点选：语序还原（词频表 + len²×log(freq+1)，零依赖；--coords 可同时回填坐标）
python .claude/skills/web-verify-patcher/scripts/order_restore.py --selftest
python .claude/skills/web-verify-patcher/scripts/order_restore.py   --chars "地天冰雪" --coords "12,34;56,78;90,12;30,44" --pretty

# 3) 同盾 hex 顺序串还原（B5 新增 --order-hex；hex 串即 bgImageSplitSequence）
python .claude/skills/web-verify-patcher/scripts/restore_slices.py --selftest
python .claude/skills/web-verify-patcher/scripts/restore_slices.py   --input bg.jpg --out new_bg.jpg --rows 2 --cols 8   --order-hex "4F387A69D1C2B50E" --semantics source-to-target --pretty

# 4) 整体机械校验（frontmatter / 引用可达 / 章节号 / 脚本自检 / 镜像逐字节 / 台账口径）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
```

---

### B7 新增能力的复跑命令（`web-font-obfuscation`）

```bash
cd D:/work/jsreverse
S=.claude/skills/web-font-obfuscation/scripts

# 1) 四族还原 CLI（前四条用文章真实数值，可直接跑）
python $S/css_obfuscation_reverse.py --selftest                                 # 201 项（六路规则 + 拒绝路径）
python $S/css_obfuscation_reverse.py offsets --rule mod300 --offset -600        # -> value "1"
python $S/css_obfuscation_reverse.py sprite --x -112.0 --y -2752.0 --cell 14x24 # -> col 9 / row_px 2775
python $S/css_obfuscation_reverse.py order --pairs "2,0;9,0;4,11.5;1,-11.5"    # -> "2914"
python $S/css_obfuscation_reverse.py pack --input "001H0039001H0032"            # -> "5u5n"

# 2) F 族：官方字体模板库 → 反推被换图元的伪造字体
python $S/font_template_diff.py --selftest                                      # 16 项
python $S/font_template_diff.py template <官方原版.ttf> -o tmpl.json
python $S/font_template_diff.py apply <站点字体.ttf> --template tmpl.json -o map.json
# map.json 的 by_codepoint 可直接喂给替换：
python $S/font_cmap_dump.py text map.json <页面.html>

# 3) 既有脚本回归（B7 补了 IO 错误处理，行为不变；缺文件不再甩 traceback）
python $S/font_cmap_dump.py --selftest
python $S/font_glyph_fingerprint.py --selftest
python $S/font_cmap_dump.py dump /nonexistent.ttf   # 期望：一行 IO FAIL，exit 1

# 4) 整体机械校验（frontmatter / 引用可达 / 章节号 / 脚本自检 / 镜像逐字节 / 台账口径）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 5) 台账幂等复跑（应打印「已在台账中，跳过」）
python artifacts/skill-evolution/tools/append-b6-ledger.py
python artifacts/skill-evolution/tools/append-b7-ledger.py
```

---

## 三·G、批次 B8 · 2026-09-21（流媒体 / DRM / ts 分片加密链路）

取材口径：**单一能力族「流媒体内容保护」一次做全**，覆盖 F 层（wasm/白盒）、E 层（DRM 许可证）、
C 层（ES/NALU 逐帧）、B 层（播放器 JS）、D 层（接口字段）、A 层（m3u8 明文 KEY）六个层次，
外加 RPC 免扣兜底。选它的理由：`web-reverse-algorithm` 的 decision-tree 在「ts 分片 / m3u8 / DRM」
这条线上**指令缺失**，全库 15 个技能零覆盖 —— 这正是「能力缺口」而非「既有能力增强」，
按分流判据应**新建技能**。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 121 | `52pojie-1824337-挑战解密最强前端加密播放器.md` | `38091486ceb081c82828ed38e495ee62` | 2026-09-21 | `stream-drm-reverse` | create | RPC 免扣（sekiro 式）桥接：XHR 断点命中断下 → 页面注入 web client 脚本 → `registerAction` 直调页面已有的 `window.encrypt/decrypt` → 本地 HTTP invoke；**页面不能关**（关掉 oracle 即消失）；时间戳按秒 ⇒ 秒级时效，取即用；先用断点放行再放行请求 |
| 122 | `52pojie-1857670-某牛m3u8 key解密算法分析及实现.md` | `cb95d713e63744711e8354564aea4520` | 2026-09-21 | `stream-drm-reverse` | create | **B 层回溯链**：`decryptdata.key ← new Uint8Array(this.qiniuDRMKey) ← config.DRMKey ← 接口返回的 o/v`；key = `MD5(固定串)` 的**前 16 字符**当 IV、**后 16 字符**当 Key（切的是**字符**不是字节）；「先断点打出 key 并解一个分片」优先于追回溯链；抓包只勾 `Search In: Response Body` 找密文 |
| 123 | `52pojie-1900845-某视频解析网站js逆向分析——学会wasm文件类型逆向.md` | `6bc552a172ef07ff150b0736399c951f` | 2026-09-21 | `stream-drm-reverse` | create | wasm 三种初始化 API；`.jpg` 后缀伪装真 wasm；Go 编译产物需删掉底部「命令行自执行」块才能 `new Go()`；**`importObject` 是 wasm 读取环境的唯一入口**（Go 模块保留 `crypto/aes.NewCipher` / `crypto/cipher.newCBC` 符号名，入参里 **16 字节即 key**）；Proxy `global` 按报错顺序补 location/document/window + 业务回调桩（fingerprint 任意值即可） |
| 124 | `52pojie-1962421-西瓜视频最新解密链接.md` | `4f103c6dbcc032734351bdf6d45cb68e` | 2026-09-21 | `stream-drm-reverse` | create | AES-256-CBC：key = **32 字符 ASCII ptk**（不是 hex 解码结果）；IV = `md5(ptk + "_" + 完整 video_id, raw=true)`（`raw=true` ⇔ Python `.digest()`）。**本批唯一做了端到端真实样本复现**：用文中真实密文解出 `ixigua` 播放 URL（见 `b8-run-20260921-1330/`） |
| 125 | `52pojie-1992926-适合宝宝体质的wasm2js白盒AES.md` | `6628c49f3edec5bee50a5fe251e602b7` | 2026-09-21 | `stream-drm-reverse` | create | wasm2js 白盒 AES 定位四步：入口 `if (0 == parseInt(inMode))` 分模式 → IV 是直接常量（未处理）→ key 在「把常数写进变量」的调用处（看该地址的 16 字节）→ 填充函数 + 初始化为 0 ⇒ **PKCS7**；轮数恒为 10 的 `while` 即轮函数；sbox 顺序被打乱但**未魔改**；**`$39` 开头是 `break` 但后面整段是 memcpy**（「开头是 break」不足以判定整段无用）；DFA 注入 + phoenixAES + aes_keyschedule |
| 126 | `52pojie-2084041-某AppCDRM 直播m3u8 SM4-CBC解密分析.md` | `5c33e9108582d94ef69923bc5f3b3470` | 2026-09-21 | `stream-drm-reverse` | create | **E 层全貌**：Provision（`encrypt_info`→URL、`GetProvisionRequest` 用 `AES-ECB(s_drm_key)` 解内存常量 `DTA_SIGN_PKEY` 得私钥再 RSA-PSS 签名、响应多层 `RSA-OAEP → AES-GCM×3`）→ License（TLV `type/index/len16/data`；KeyType `0x20/0x21/0x01`；算法 `0x12/0x22/0x43`；`KeyProfile1` = SM4-CBC 内容 / SM4-ECB 无填充 CEK / SM2 SessionKey / HMAC-SM3 验签）→ 内容（按 KID 选 CEK 做 SM4-CBC）；**HMAC-SM3 的 msg = `license_data.split(b'\xFF\x0D')[0]`**；国密 Python 坑表（gmssl `mode=1` 且公私钥都要传、SM4 ECB `padding_mode=""`、SM2 密文去 `04` 前缀、`sm3` 算的是**公钥**不是证书）；**先找标准文件再逆向**（作者原话：纯逆 so 花掉大量时间，规范里全都有） |
| 127 | `52pojie-2091979-某iq drm v3 解密全流程.md` | `62df9c439113f32dab4cc057d3905f03` | 2026-09-21 | `stream-drm-reverse` | create | **盐值错位反推**：`vf = MD5(前缀 + 盐)`，利用 MD5 按 4 字节 word 运算的特性，用两个仅长度不同的输入（`/dasha` / `/dashaaa`）建立错位关系，逐级搜索追出盐；ticket 是自定义 TLV（`type(index)/len16/data`）；`service_name = mdcm\|s1:9:10\|a0\|v<hash32>\|e1\|f497006\|`；**`dcm` = 每 10 轮里 1 次 AES-CTR + 9 次与计数器异或，XOR 分支 `counter` 必须递增**；NALU **解密前后各校验一次 CRC16**（尾部 2 字节）；ffmpeg 走 `HLSContext → playlists[0]->ifmt_ctx` 拿真实 TS；IV 末 4 字节改写 `00 00 00 01`；**CTR 的 key/iv 写死时用一组明密文对差分反推**（换随机输入复验） |
| 128 | `52pojie-2122203-看球直播接口逆向分析：签名机制与 AES 解密实战.md` | `0ec51afc56dfe6dd0f7ad6e4161a7102` | 2026-09-21 | `stream-drm-reverse` | create | **D 层接口**：签名 = `MD5(字母序 key+value 无分隔拼接 + 84 字符长盐)`（`Object.keys().sort()`）；响应 AES-CBC `Pkcs7`，**key = `s0` 全串、IV = `s0` 前 16 字符**，编码是 **`Latin1.parse`**（⇔ Python `latin-1`）；`s0` 由混淆数组**运行时**生成 ⇒ 必须断点取，静态读数组拿不到 |
| 129 | `2094716-cctv-video-decrypt-wasm-vmp.md` | `f1018517b458ebc63af8f31d444cd9d5` | 2026-09-21 | `stream-drm-reverse` | create | **F 层 wasm VMP**：判据 = 导出函数都是短壳且都调用同一个巨型 dispatch（`f50`，553 行大循环 + 大量短 `case`）；字节码**不在 wasm 里**，JS 用长数组按基址写入（数组总长**恰等于**申请内存 682576）；做法 `wasm2c → .o → IDA 逐 case → 输出 IR 中间产物`（**不直接还原 JS**：运行时跳转太多，IR 只需回答每条指令做了什么）；用**旧版 wasm2js 产物比对结构**做交叉验证；加密在 **ES 层用 TEA**；总结「js 混淆 → jsvmp → wasm → wasm vmp」成本逐级上升 |
| 130 | `2102594-ai-replay-cctv-playback.md` | `62def7a90397cbcb43d6eeb4fddd0684` | 2026-09-21 | `stream-drm-reverse` | create | 链路 = wasm + `vmpTag` + worker **会话状态**；补环境清单（`mediaTagID` / `Date.now()` / `new Date()` / `performance.now()` / `pageHref` / `workerHref` / `location.origin` / blob worker 的 `href/pathname/protocol`）；**抓 worker 主线程 `postMessage` 序列在本地按序重放**；**验收标准是「本地可播放（允许局部花屏）」，不是「与浏览器逐字节一致」**；正确顺序：先补环境让本地能播 → 再 wasm2js 替换调用链 → 最后自动插桩逼近算法 |
| 131 | `52pojie-1908744-【JavaScript 逆向】某音滑块纯算，底图还原，captchaBody，轨迹算法，abogus.md` | `4d9eec8d7e7829a67a116a68a3e737bd` | 2026-09-21 | — | skip | 已精读。内容全部落在既有能力内：底图还原/轨迹 → `web-verify-patcher`（`tile-scramble-and-coordinate-mapping.md` / `motion-and-coordinate.md`，B2/B3 已落 `restore_slices.py --model gt3` 与轨迹字段表）；`captchaBody`/`abogus` 签名 → `web-reverse-algorithm`。**无新知识元**，按「避免滥建冗余技能」约束不新建、不演化，登记为已处理 |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `stream-drm-reverse` | **create** | 新技能：`SKILL.md`（六层判据 + 6 步工作流 + 失败模式 + 反例黑名单 + 命令入口 + RPC 兜底）+ `references/hls-and-ts-structure.md` + `references/license-and-key-hierarchy.md` + `references/whitebox-and-wasm-crypto.md` + `scripts/m3u8_probe.py`（27 项自检）+ `scripts/ts_probe.py`（42 项）+ `scripts/media_crypto.py`（95 项）+ `scripts/license_parse.py`（41 项） |
| `web-reverse-algorithm` | evolve | `SKILL.md`「Wasm / Protobuf / WebSocket / challenge 协议」后新增题型分流节「媒体流 / DRM / ts 分片」（明确本技能**不覆盖**该链路并给出切出条件）；资源导航新增同义指针 |
| `wsam-reverse` | evolve | `SKILL.md`「关联」段新增媒体流/DRM 场景路由：wasm 若在解密 ts/m3u8（导出名像 `decrypt`、入参是 PES/NALU、旁边有 `EXT-X-KEY`/`GetLicense`）先切 `stream-drm-reverse` 的 F 层四条路线 |
| `artifacts/skill-evolution/tools/check_skill_integrity.js` | 附带修复 | 新增 **Python 脚本语法 + `--selftest` 检查**（此前只查 `.js`，新增的 `.py` 长期处于「没人跑过」状态，语法错误要在运行时才暴露）；引用检查拆成「相对 skill 根」+「相对引用文件」两条规则并支持 `../<skill>/SKILL.md`；`§章节号` 检查支持**带子目录的文件名**与**中文序号**（`§6` 现可命中 `## 六、`）；新增行尾混用 / 裸 CR 检查；新增 `--skip-python`；Python 解释器缺失改为 `warn` 而非阻断；语法检查改用内建 `compile()`（**不再落盘 `__pycache__` 污染镜像**） |
| `protocol-reverse` | 附带修复 | 检查面扩大后暴露：3 处指向父级仓库的路径（`../tool-index.md` ×2、`../field-journal/precedent-reverse.md`）此前从未被检测。按既有约定改写为 `<parent-repo>/...` 占位形式，并在「路径说明」里写明该约定 |
| `ast-deobfuscation` | 附带修复 | `references/patterns/zhipin.md` 的 `references/ob-variant-taxonomy.md` §6 指针此前从未被检测（该文用中文序号分节）；校验器补齐中文序号支持后确认**指针本身正确**，无需改动内容 |

### B8 的四个方法论增量

1. **「层判错」比「算法算错」贵得多** —— 这一族 80% 的返工来自层判错。
   `m3u8_probe.py --only-layer` 一条命令就能把「A 层 / B-E 层 / C 层 / E 层」区分开，
   比先读 JS 快一个数量级。**层判据集中在 `references/hls-and-ts-structure.md` §1（唯一权威源）**。
2. **「解不报错但花屏」是 C 层的标志性症状** ——
   A 层做 C 层的活会得到「能解出字节、能过长度检查、就是没法播」的结果。
   判据写死为机械 oracle：**`ffmpeg -v error -i seg0.clear.ts -f null -` 必须 0 error**，
   并且解出来的每个 NALU 头必须仍是合法 `(nal_ref_idc, nal_unit_type)`。
3. **「明文 NAL 头是锚点」** —— ES/NALU 逐帧加密下，NAL 头不参与加密，
   于是**不需要能播放就能验证解密对错**；再叠加**尾部 2 字节 CRC16 的前后双校验**，
   本类目标拿到了「本地可判定的正确性信号」，不必等播放器说话。
4. **标准测试向量优先于「跑通一次」** ——
   `media_crypto.py` 的 AES S 盒由 GF(2^8) 逆元**程序化生成**（不抄表），
   SM4 的 `CK` 由 `(28i + 7j) & 0xFF` **程序化生成**，再用 FIPS-197 分组向量、
   **SP 800-38A 的 CBC/CTR 模式向量**、GB/T 32907 的 SM4 向量（含 `--slow-selftest` 的百万次迭代向量）钉死。
   `license_parse.py` 的 SM3 用 GB/T 32905 标准向量钉死。
   **凡是「抄表」的地方必有抄错一位的风险，而密码学抄错一位是 100% 静默失败。**
5. **「末块特例」是混合模式实现的高危点（本轮自审抓到的真缺陷）** ——
   `dcm` 的原始条件是 `if (remaining <= 16) || (rounds > xorBlksInCycl)`，
   即**最后一块无论轮次如何都走 CTR**。初版实现只按轮次判断（`rounds <= xor_blocks` 即 XOR），
   在「末块恰好落在 XOR 相位」时（192 字节的第 12 块、160 字节的第 10 块）会算错，
   **且解密不报任何错**。修复后加了三条**区分性断言**（末块必须是 AES(ctr) keystream、
   不能是裸 counter；XOR 相位的中间块必须是裸 counter、不能是 AES keystream）——
   **往返自检抓不到这类错（加解密同构，错得对称），只有「逐字节对照独立推导的期望值」才能抓到。**

### B8 新增能力的复跑命令（`stream-drm-reverse`）

```bash
cd D:/work/jsreverse
S=.claude/skills/stream-drm-reverse/scripts

# 1) 四个脚本的自检（标准测试向量 + 合成 TS 样本 + 拒绝路径）
#    可选：python $S/media_crypto.py --slow-selftest   # 追加 SM4 百万次迭代标准向量（约 38 秒）
python $S/media_crypto.py --selftest      # 95 项（FIPS-197 分组向量 + SP 800-38A 的 CBC/CTR 模式向量 + GB/T 32907 SM4 向量 + dcm 往返与末块语义 + CRC16 探针 + key 三形态）
python $S/m3u8_probe.py  --selftest      # 27 项（分层判据、缺省 IV 推导、畸形输入）
python $S/ts_probe.py    --selftest      # 42 项（PSI/service_name、NAL 切分、防竞争字节、TS 级端到端往返）
python $S/license_parse.py --selftest    # 41 项（SM3/HMAC-SM3 标准向量、TLV 骨架、mdcm 模式串）

# 2) 端到端真实样本：西瓜视频 AES-256-CBC（文章原文密文，key=ptk，iv=md5(ptk_video_id, raw)）
python $S/media_crypto.py aes-cbc   --input  artifacts/skill-evolution/b8-run-20260921-1330/watermelon.ct.b64 --input-b64   --out    artifacts/skill-evolution/b8-run-20260921-1330/watermelon.plain.bin   --key-utf8 ef84a15b-ffd0-4c4d-9d56-b652532f   --iv-hex 5519cfcd0d74e5a8a8b4c3cf3f5ff42d
head -c 200 artifacts/skill-evolution/b8-run-20260921-1330/watermelon.plain.bin   # 期望：可读的 ixigua 播放 URL

# 3) 判层与命令样例（不需样本）
python $S/m3u8_probe.py --selftest >/dev/null && python $S/m3u8_probe.py   artifacts/skill-evolution/b8-run-20260921-1330/demo.m3u8 --only-layer
python $S/license_parse.py mdcm   --service-name "mdcm|s1:9:10|a0|vd70b0e7a262f4cc52b667901eb2e8b9d|e1|f497006|" --apply-iv-rewrite --pretty

# 4) 整体机械校验（含本批新增的 Python 自检与行尾检查）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 5) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b8-ledger.py
```

> ⚠️ **机械校验对 Python 用 `python`（可用 `PYTHON` 环境变量覆盖）**：
> 命令入口里的 CLI 示例写的是 `python xxx.py`（面向使用者）；
> `check_skill_integrity.js` 的 Python 检查走 `process.env.PYTHON || 'python'`。

### B8 评审记录

3 名独立 judge 按**分视角**派发（保真度 / 新用户可用性 / 机械校验）。
本次遇到账号 5 小时额度用尽（429，预计 14:17 恢复）：Judge A / B **启动即失败**，
改用 `lite` 模型重试 **Judge C 成功**；A / B 两视角的必查项由主执行者**逐条自跑补位**，
不把「未完成」当成通过。完整记录见 `artifacts/skill-evolution/judge-findings-20260921-1330.md`。

| 视角 | 代理 | 结论 |
| --- | --- | --- |
| A 保真度（回源复算） | `judge-a-fidelity` | 未完成（429）→ 自跑补位：逐条回源核对 13 组断言 |
| B 新用户可用性（真跑命令） | `judge-b-usability` | 未完成（429）→ 自跑补位：真跑全部命令入口 |
| C 机械校验（跑命令找事实） | `judge-c-mechanical`（lite 重试） | **needs-fix：5 major + 7 minor** |

**处置：12 项意见全部回源复核后成立并当场修完，本轮无驳回。** 其中 3 项是**主执行者自审/自跑发现的自身缺陷**（不在 judge 意见内）：

1. **`dcm` 末块语义写错（会静默算错数据）** —— 原始条件是 `if (remaining <= 16) || (rounds > xorBlksInCycl)`，
   即**最后一块无论轮次如何都走 CTR**。初版只按轮次判断，在「末块恰好落在 XOR 相位」时算错
   （192 字节第 12 块、160 字节第 10 块），且解密不报错。已修，并加 3 条**区分性断言**
   （末块必须是 `AES(ctr)` keystream、不能是裸 counter；XOR 相位的中间块必须是裸 counter）。
   **往返自检抓不到这类错（加解密同构、错得对称），只有「逐字节对照独立推导的期望值」能抓到。**
2. **盐值长度笔误** 96 → 实测 **84** 字符（`52pojie-2122203`）。
3. **缺参数裸异常** —— `media_crypto.py aes-cbc` 不给 key 时抛 `AttributeError: 'NoneType' object has no attribute 'encode'`；
   已改为可读报错并加 2 项自检；`ts_probe.py --decrypt-nalu` 对非 TS 输入原为静默 exit 0，已改为明确报错 + exit 1。
4. **断言计数漂移**（Judge C 的 major）—— 三处两值。已全量对齐，并让 `append-b8-ledger.py`
   在写入前**实跑四个 `--selftest` 取回真实项数**（正文用 `@SC_MC@` 占位符），从此不可能漂移。

**加固（超出 judge 意见范围）**：AES 侧在原有 FIPS-197 分组向量之外补入
**NIST SP 800-38A 的 CBC-128/192/256 与 CTR-128 模式向量**（含解密可逆），
SM4 侧补入规范推荐的**百万次迭代向量**（`--slow-selftest`，实测 38.0s，结果 `595298c7c6fd271f0402f804c33d3f66` 命中）。
另做一次**真实样本端到端复现**：用 `52pojie-1962421` 原文的 base64 密文 + `ptk` + `md5(ptk_video_id, raw)`，
纯 Python 实现解出可读的 `ixigua` 播放 URL（产物在 `b8-run-20260921-1330/`）。

**落盘**：`verified.md`（131 条）、`backup-20260921-1330/`、`baseline-md5-20260921-1330.txt`、
`b8-brief-20260921-1330.md`、`judge-findings-20260921-1330.md`、`b8-run-20260921-1330/`、
`tools/append-b8-ledger.py`、`pending-B9.txt`。

**体积门禁**：`stream-drm-reverse/SKILL.md` 新建 12.0 KB；`web-reverse-algorithm` 107.5%、`wsam-reverse` 102.7%（≤150%）。

### B8 遗留 / 下一批建议

- 待处理 **329 篇**。下一批按簇取材，优先级：
  ① **WAF / 风控 Cookie 系（18 篇）**：加速乐 jsl、`acw_sc__v2`（5 篇）、Cloudflare（3 篇）、Akamai（3 篇）、
     Reese84 —— 与本仓 `cloudflare/` 案例合并评估，注意 `web-js-env-patcher` 已有 `ruishu-*` 的成熟范式可类比；
  ② **JSVMP 系（30+ 篇，仍是最大簇）**：B6 只落了「助记符表 + 反编译器设计」，插桩纯算与符号执行仍可交叉补强；
  ③ **webpack 扣取/改写系（16 篇）**：`ast-deobfuscation` 有 `webcrack-bundle-unpack.md`，
     但「半自动扣取 / 改写 / 在 node 里复用」这一套流程没有集中落点，**同类 ≥3 篇 ⇒ 评估新建**；
  ④ DRM / 流媒体剩余：`52pojie-2057046`（某视频平台 jsvmp 纯算）、`52pojie-1905842`（学习平台心跳刷进度，
     属协议自动化而非内容保护，宜落 `web-reverse-algorithm` 或 `protocol-reverse`）。
- **B8 新增遗留**：
  1. `media_crypto.py` **不实现 AES-GCM / SM2**（无 `cryptography`/`gmssl`）——文档已给 Hook 替代路线，
     但 `ProcessProvisionResponse` 的多层解密**没有可执行 fallback**。
  2. `ts_probe.py` 的 `--unescape` 会让 ES 长度变化 ⇒ 无法原样写回 TS，只能输出 annex-B ES；
     **「解密 → 重新 escape → 重新分封装 TS」的完整回写路径未实现**（文档指向 ffmpeg 接入点/独立 demuxer）。
  3. 密钥单元 `0x03` 的**字段偏移仍未知**（原文只给伪代码），脚本只输出骨架 + 标注 `heuristic: true` 的猜测。
  4. TS 样本只有**合成包**：`_selftest` 没有真实 `.ts` 分片做端到端回归（本机无真实样本）。
  5. 校验器：`compile()` 替代 `py_compile` 后不再检查「.py 能否被 import」；
     中文序号回退只覆盖整数节号（`§6.1` → `## 六.1` 不支持）；重复章节号检测仍只认阿拉伯数字。
- 候选新技能 `captcha-flow-orchestration`（整站过验证流程）—— B5/B6/B7/B8 四次确认**不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、**B8-131（某音滑块纯算，能力已被 `web-verify-patcher` + `web-reverse-algorithm` 覆盖）**。
- 遗留（跨批次，低优先级）：
  1. `web-js-env-patcher` 缺端到端 Cookie 对拍脚本。
  2. `_$uf` 落在 851 池外的原因未查明。
  3. `ast-deobfuscation/references/patterns/geetest4.md` 的「外部工具链」只有文字流程，没有可执行脚本。
  4. `web-verify-patcher` 的**类型清单仍是三处并行维护**（`SKILL.md` 分类标签 / `captcha-types.md` / `solution-playbooks.md`），结构性收敛仍未做。

---

## 三·H、批次 B9 · 2026-09-21（边缘 WAF / CDN 准入 Cookie 挑战）

取材口径：**单一能力族「边缘 WAF / CDN 准入 Cookie 挑战」一次做全**，覆盖
加速乐 jsl（两趟 521）、阿里 acw_sc__v2（旧版 `unsbox`+`hexXor` / 新版 LCG+洗牌）、
Cloudflare（5s 盾 / Turnstile / Drop）、Akamai Bot Manager（`_abck` / `sensor_data`）、
F5 Shape / Reese84、以及 Imperva / Kasada / DataDome / HUMAN / AWS WAF / Fastly / Anubis 的设卡层对照，
外加 Amazon 自研 BotCX 的「加密参数全还原 ≠ 能过」反例。

选它的理由：B8 台账把「WAF / 风控 Cookie 系（18 篇）」列为下一批**优先级 ①**，
并明确建议「与本仓 `cloudflare/` 案例合并评估，可类比 `web-js-env-patcher` 已有的 `ruishu-*` 范式」。

### 分流结论：**本批不新建技能**（第 4 次确认「captcha-flow-orchestration」不建）

按「同类 ≥3 篇」判据本批达标（17 篇），但按 B8 追加的「现有技能 decision-tree 里这条线是否存在」判据，
**这条线已经存在**：`web-verify-patcher` 有 `waf-challenge` 类型 + `provider-products.md` 里 11 个 WAF 厂商条目；
`web-js-env-patcher` 有瑞数 `ruishu-*` 的「挑战页 + 三件套 + 多趟 Cookie」成熟范式。
⇒ 按任务约束「能归到邻近模块 → 演化，避免滥建冗余技能」，本批**只演化不新建**，
新增知识全部落进既有技能的 `references/` 与 `scripts/`（渐进披露）。

**但**：本批同时发现两个**路线级缺口**，用「加分流 + 唯一权威源声明」补上，而不是靠新建技能：

1. `web-verify-patcher` 把这一族全部归成 `waf-challenge`，却没有区分「**准入 Cookie 链**（无图、无交互、
   无人工成功样本基线）」与「**可见验证码**（Turnstile checkbox / AWS `grid` / `px-captcha`）」——
   前者走它的 Phase-2（图片还原 / 坐标 / 打码平台）必然空转。已在 4 处补上形态分流表。
2. `web-reverse-algorithm` 的 decision-tree §6「验证码 / 风控题」把「阿里 v2」列在验证码代表里，
   而 `acw_sc__v2` 是准入 Cookie 链。已删掉该条并新增 §7「边缘 WAF / CDN 准入 Cookie 题」。

### 本批新增的真实 oracle（不是「读了一遍觉得对」）

| oracle | 内容 | 结果 |
| --- | --- | --- |
| 加速乐第二趟 | 4 组真实 `go({...})` 参数（`md5` / `sha1`×2 / `sha256`）双字符补位 | **4/4 命中** |
| 加速乐第一趟 | 2 组真实表达式的期望值由 `node -e "eval(expr)"` **独立求出**做差分 | **逐字符一致** |
| acw RC4 字符串表 | 13 组浏览器 Console 的「索引 + key → 明文」对照，标定旋转量 | 按字面量 347 次 `push(shift())`（表长 56 ⇒ 等价左移 11 位）→ **13/13**；左移 10 / 12 位 → **0/13**；**满命中的旋转量恰有 1 个**（写成自检断言） |
| Cloudflare 响应体 | `cloudflare/xai-cloudflare/artifacts/fo_stage1/2.txt` + rayId `a393f8784a8dce7a` | 与仓内 `.plain` **逐字节一致**；base64 字母表占比 **1.000**（错 rayId 0.79~0.84 / 全 0 0.35） |
| Cloudflare 字符串表 | `new_table_raw.txt`（2050 项）+ 脚本内恒等式 | 旋转 **434**；`table[1487-458]='document'`、`table[618-458]='BCkZA9'`、`table[1931-458]='_cf_chl_opt'` |
| Cloudflare 模数常量 | 文章 / 案例报告 / 真实脚本**三处逐字符一致** | 1024 bit，指数 65537 |

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 132 | `52pojie-1513028-某常见 cookie 加密逻辑分析 （加速乐 - jsl）.md` | `883d20539073d70859bbdcb9f8d0803f` | 2026-09-21 | `web-js-env-patcher`（判层/链路）+ `web-reverse-algorithm`（求解） | evolve | 加速乐两趟 521：第一趟 `document.cookie=...` 是**纯字面量拼接**（JSFuck 化算术），直接求值即可；第二趟 `go({bts,chars,ct,ha,tn,vt,wt})` 用 `chars` 双字符补位暴力匹配 `ct`（529 组）。**`bts[1]` 必须保持 URL 编码原样**（`%2F`/`%3D` 是哈希输入的一部分）。**跨文章结构常量（本批自己挖出来的）**：第一趟 cookie 结构是 `<unix_ts>.<ms>\|-1\|<urlenc-base64>`，第二趟 `bts[0]` 同结构但 flag 为 **0**，两次的 `<unix_ts>` 相同、毫秒不同 |
| 133 | `52pojie-2016235-【JS逆向】某加速乐分析解混淆.md` | `f5484525e5de9db5567b78496a401d1b` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | `go()` 精简（去掉 hash 方法与 setCookie）→ `bts[0]+chars[i]+chars[j]+bts[1]`；**`ha` 每次都可能换**（同站实测出现 md5/sha1/sha256），不要写死；`wt` 只是延时字段（`delay = wt > elapsed ? wt - elapsed : 500`）。**反自动化在 `go()` 之前**：`_0xdcae14()` 检查 `Phantom` / `callPhantom` / `_phantom` / `Headless` / `navigator.webdriver` / `__driver_evaluate` / `__webdriver_evaluate`，命中任一条直接 `return` 不写 cookie ⇒ 表现为「算出来是对的但页面还是 521」（本族最常见的假失败） |
| 134 | `52pojie-1625598-某acw_sc__v2 cookie逆向分析.md` | `8b0b3b4ad16252491c31192e53bcbc24` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | acw_sc__v2 旧版最小实现：`String.prototype.unsbox`（固定 **40 元置换表** `[15,35,29,...,36]`，`out[T[k]-1]=src[k]`）+ `String.prototype.hexXor(key="3000176000856006061501533003690027800375")`。`arg1` 是内联 `<textarea>` 里的 40 位 hex，**每次访问都变**。`unsbox` 是双射（长度保持、字符多重集不变）；`hexXor` 自逆 |
| 135 | `52pojie-1822807-阿里系cookie之acw_sc__v2 逆向分析.md` | `0cfd89797f62cbbd51d4cf520f60e636` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | 旧版 + **RC4 字符串表（`_0x55f3`）**：`rc4(decodeURIComponent(escape(atob(表[i]))), key)`；（**本批用 13 组 Console 对照做 oracle：按字面量做 347 次 `push(shift())` 命中 13/13，左移 10/12 位命中 0/13 ⇒ 再次确认「有效左移次数恰等于 IIFE 的第二个实参」**，调用点 `++` 与函数体 `--` 相互抵消；**注意 `push(shift())` 是绕环的，表长 56 时 347 ≡ 11，标定要枚举 `0..N-1`**）。还原套路：**不要读 RC4**，用已知索引反查 + 先用几组对照标定旋转量。另：`_0x55f3` 前四个分支实测为 false，只走 `data[idx]` 分支 |
| 136 | `2062618-ali-acw-sc-v2.md` | `075d414c9025394e27936cb4fad86afc` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | acw_sc__v2 **新版**：自定义 **LCG** 替换 `Math.random`（种子写死 ⇒ 序列可预测）+ 魔改 `Array.prototype.fill` + Fisher–Yates 式十六进制洗牌 + `ox` XOR 字符串常量表（表项是 XOR 加密后的字符串常量，带固定下标偏移）。**两个必错点**：① 主函数（实测名 `PxjRjE`）内部用**自己函数体的源码字符串**做索引（`indexOf('fc1e53')` 得 `oO`；另一偏移 `z` 实测浏览器里恒为 594），**本地格式化源码 ⇒ 索引错位 ⇒ 卡死在 `while` 里（不报错）**；② `debugger` 字符串**不能删**（它参与 `b.toString().indexOf('debugger')` 判断，删掉后 `indexOf` 变 -1、判断翻转 ⇒ 流程能过但值过不了校验；**正确做法是不改字符串**，用 DevTools「永不在此暂停」绕过，或把 `indexOf` 的实参也换成空串）；③ 第二段正则 `\{\[\s\S]*[/\*]{2}[\s\S]*\}` 检测的是**函数体里有没有注释符号**（`[/\*]{2}` = 连续两个字符都取自 `/` 或 `*`，`//` / `/*` / `*/` / `**` 都会命中）⇒ **这就是「格式化 JS 后提交必失败」的机制** |
| 137 | `52pojie-2085758-某waf的acw_sc__v2算法逆向.md` | `8924ef639ea1f7c6a584736ade69ae60` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | 新版另一站样本（交叉验证）：`ox` 表是 XOR 后的字符串常量、可批量还原，并带一个固定下标偏移（原文记为 `m(466) === ox[0]`）；`T` 表**决定末尾随机数的奇偶性**（`true`=奇 / `false`=偶），而 `T` 表通过读 `navigator`（含 `webdriver` 类判据）生成 ⇒ **处置：不要在本地重算 `T`，直接从浏览器取常量**；`y` 函数调用不存在的函数取指纹，同样浏览器取常量。**「ox 循环移位到满足某个 X 条件」不要去分析 X，直接在浏览器跑到位置上取结果** |
| 138 | `52pojie-2062929-Python爬虫进阶：acw_v2加密AST解混淆全流程.md` | `6ffb33f16177fa0765c883dca26d9c3d` | 2026-09-21 | `ast-deobfuscation` + `web-reverse-algorithm` | evolve | 新版 AST 还原三步：① `ObjectProperty` 型键值对（`oK.q` 这类）先内联成常量对象；② `y3 = m; yX = y3; yX(573)` **多层别名查找绑定**后调用解密函数；③ `t["CUMDW"]` 型对象内联。**关键口径：解密字符数组必须到浏览器取「最终生成的大数组」**，静态读源码拿不到。另证 `v2` 一个代理采 **5 页左右**就会出 `v3`（换 IP 可继续，换了就要重算） |
| 139 | `1752891-cloudflare-turnstile-reverse.md` | `a675cafa77d48ac240309f8babf0d47a` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | Turnstile 引擎全貌：**响应体 rayId 派生 XOR**（`key=32; key^=charCodeAt(rayId+"_0")`；`plain[i]=(bin[i]-key-i%65535+65535)%255`）→ 判分支 `startsWith("window._")`（明文）否则交**自定义字节码 VM**（VM 内部再 `atob` ⇒ **解密结果本身是 base64，不是明文 JS**）；**BigInt 模幂 PoW**（128 字节 seed、`seed[0]=0`、1024 bit 写死模数、指数 65537）；**LZW 变种压缩的遥测**（鼠标轨迹 ≥10ms 采样上限 250 点 / 点击含到 widget 中心距离与 `tapDuration` / `PerformanceObserver` 资源计时）；VM 操作码与寄存器的偏移混淆形态（`memory[opcode ^ xorKey]`） |
| 140 | `cloudflare 5s盾分析-CSDN博客.md` | `cf457918c20f546826585db3fb781e22` | 2026-09-21 | `web-js-env-patcher` | evolve | 5s 盾**五步链**：① 初始化页拿 `_cf_chl_opt`（`cRay`/`cHash`/`md`）→ ② `fo` 第一次 POST 提交遥测（加密体）→ ③ `normal` HTML + 第二次 POST（`chReq:"chl_api_m"` + `chlApi*`）返回十几万~二十几万字符长串 → ④ **环境校验：十几个~二十几个校验点，只有第一个固定、其余顺序随机** → ⑤ `sh/aw` 三参数 + 向初始化页 POST 四参数得 `cf_clearance`。**三条硬结论**：IP/TLS/UA 必须完全一致；**图片请求不发 100% 失败**；时间控制严格（页面挂起调试必超时）。响应体逐字段给出（`cRq` 的 `ru/ra/rm/d/t/cT/m/i1/i2/zh/uh/hh`、`ie` 的 7 项、`wPr`/`if`/`ffs`） |
| 141 | `2116523-cloudflare-drop-reverse.md` | `49a05b7e4e509f4b0c894002362c4e38` | 2026-09-21 | `web-js-env-patcher` + `web-reverse-algorithm` | evolve | Cloudflare Drop **时间锁 PoW（可完全离线）**：`state = SHA256(base64url_decode(seed))`，外层 `k=1000` 次 × 内层 `g=2000` 次**串行**哈希，检查点链 `base64(concat)` ⇒ `(k+1)×g = 2,002,000` 次 SHA-256（约 2s）；**`s=16` 未参与计算**；**检查点链可分段验证**（服务端每收一段验一段）；SHA-256 链天然串行 ⇒ GPU / 多线程无法加速。另有可迁移的工程结论：`cfat_*` 提交后得临时账户 + `claimToken`；`cfwau_*` Assets JWT 是 Ed25519 且**只发给浏览器来源**（纯 API 拿到 HS256(aud:"ewc") 受限 token ⇒ 上传 401），绕法是文件内联进 Worker 脚本（1MB 上限） |
| 142 | `52pojie-2097555-论Cloudflare验证的自动化方案.md` | `639004fc49932769b6d7d2620d60a201` | 2026-09-21 | `web-js-env-patcher` | evolve | Turnstile 的**交互**侧：widget 在 **closed shadow root**（`document.querySelectorAll` 查不到），要经隐藏 `input#cf-chl-widget-<id>_response` → `getRootNode().host` 反查宿主矩形，再在复选框中心构造完整 `MouseEvent` 序列；**CDP 驱动下原生 MouseEvent 的 `screenX/screenY` 与 `clientX/clientY` 不自洽** ⇒ 需要 `CDP-bug-MouseEvent-.screenX-.screenY-patcher` 一类补丁；**死循环重试会被封 IP**（实测教训）。另给出代理插件 + 多插件注入的工程模板 |
| 143 | `52pojie-1831827-浅逆某简单akamai(无风控部分).md` | `56aa6d7db06aa3a940a60a7feb5046b9` | 2026-09-21 | `web-js-env-patcher` + `web-verify-patcher` | evolve | Akamai **有效性判据**：`_abck` 里 `~-1~` → `~0~` 才算有效；**三次触发**（首屏自执行 + `setTimeout(500)` + `setTimeout(1000)`），简单档第 1 次就够、难档要第 3 次或等事件；**环境段号数组**（`-100` 固定值 / `-101` 三个 en / `-102`·`-103` input 属性 / **`-105` 最长的 UA+window+自动化+Screen 合并串** / `-106` `0,0` / `-112` 页面 URL / **`-115` cookie 快照 ⇒ 第一次 POST 前必须先 GET 一次页面** / `-116` / `-119` / `-122` XPathResult 能力位 / `-127` `8` / `-128`·`-129`·`-131` 逗号占位 / `-70`·`-80`·`-90`）；**定位技巧**：search 字面量 → 落 `switch/case` → 在**每个 `return` 处下断点** → 再进 `UJ.apply`。`curl_cffi` 的 `impersonate` 必须与 JS 环境的 UA/`appVersion` 一致 |
| 144 | `52pojie-2009699-Akamai某环境VMP算法分析.md` | `9123e3cd807d85fd820b02e8e7d73f71` | 2026-09-21 | `web-js-env-patcher` + `web-verify-patcher` | evolve | Akamai 把**环境指纹也塞进小 VM**：断 `wPz` → 追 `jsz` → `VQ()[AJ(xg)](FCz,lE,SL) === 'dvc'`，值是「按固定字段序（`l+h+f+b+i+j+k+a+c+g+e+d+`）拼接后的 hash」；入口入参形如 `[2,'16\|24',0,0]`。**可复用的一段（第一条 hash）**：`first = "0" + startTs + UA.slice(-32) + "0"`，`r = 5381; for c: r = (r*33) ^ c; r >>>= 0`（djb2 的 XOR 变体）。**诚实标注**：文章给的 `startTs` 与记录值 `2482411364` **对不上**（`startTs` 是会话相关的时间戳，文章放的是示意值）⇒ 只能当**算法形态**用，不要拿那个记录值当 oracle |
| 145 | `52pojie-2122060-Akamai最新js风控浅分析——指纹.md` | `299ab76a0d0ab598db8ca3f302c2e519` | 2026-09-21 | `web-js-env-patcher` + `web-verify-patcher` | evolve | Akamai **最新采集路线**（按需对齐，不是「都补一遍」）：**UA-CH 高熵 9 项异步接口**（改了同步 `navigator.userAgent` 却没处理它 ⇒ 两边对不上直接暴露）；**WebGL 三路冗余采集**（主线程 canvas / `OffscreenCanvas` / **Blob+Worker 里再采一次** ⇒ 只 hook 主线程必翻车）；WebAudio 用**经典配置**（`OfflineAudioContext(1,44100,44100)` + triangle 10000Hz + DynamicsCompressor）；**plugins 校验对象图完整性**（三层互相指向 + 改写 `plugins.refresh` 埋探针）；**webdriver 掩码（几十位）+ 原型链完整性校验**（描述符 / `[native code]` / getter 的 `hasOwnProperty` 分布 ⇒ 挂在实例上会被描述符检查抓）；**品牌特征位（存在即打标）**；`RTCPeerConnection` **只做 `typeof`、不调用不建连**。**两条与主流认知相反的反向结论**：字体指纹权重很低、Canvas 2D 不是主力 —— 因为**风控要一致性不要区分度** |
| 146 | `52pojie-2062377-某航司Reese84逆向分析-补环境篇.md` | `a7bc71639cb2b1010fd68b047cc2a35c` | 2026-09-21 | `web-js-env-patcher` + `web-verify-patcher` | evolve | Reese84：**动态路径 JS 每几小时轮换**（实测只有 3 条在轮换）；两条路线（动态链接 1GET+2POST，第 2 次 POST 载荷里的 `p` 是核心；固定链接 1GET+1POST，`old_token` 可为空 ⇒ **替换 JS 更方便**）；**加密结构 = 隐藏 iframe + push 22 个函数 + 遍历执行存进 `nt` + `p = 加密(nt)`**；**22 个函数采集清单**（4 个 canvas 链接**必须按顺序取用**、WebGL 扩展列表与着色器数值、`OfflineAudioContext`、`__selenium_evaluate`、`createEvent` 主动报错、`PERSISTENT/TEMPORARY`、`PerformanceObserver`、原型链 `Function.prototype.toString/call/apply/bind` …）；**两个必踩的坑**：① 替换本地 JS 后必须把脚本里写死的请求路径改成当前时段路径；② `reese84interrogatorconstructor` 的 `this["st"] = Math.floor(Date.now()/1000)` 会被**校验超时**，调试卡住先改它；动态链接断点断不住时在 JS **第一行加 `debugger;`** 最快。token 落点：cookie `reese84` 或请求头 `X-D-Token` |
| 147 | `52pojie-2107326-Amazon登录协议逆向分析.md` | `6083af2955660949af533811875b53b2` | 2026-09-21 | `web-js-env-patcher` + `web-verify-patcher` | evolve | **站点自研风控**（不在 CDN/WAF 厂商表里的那一类）：`metadata1` = `identifier:base64(XXTEA(CRC32hex + '#' + JSON 指纹))`，密钥可由 `fwcim.encryptor.keyProvider.provide()` 取出，XXTEA 是**标准 Corrected Block TEA**（`delta=0x9E3779B9`、轮数 `6+52/n`，无魔改）；`encryptedPwd` 是 **AWS Encryption SDK Message Format v1**（RSA-OAEP-SHA256 包 AES-128 密钥 → HMAC-SHA256 KDF → AES-128-GCM），但**实测只提交明文 `password` 也能登录** ⇒ 不是必须。**真正的拦截点是一个独立的 bot signal POST**（`unagi-na.amazon.com/1/events/com.amazon.BotCXPolicy...`，`additionalData` 是 2.5KB 加密 blob）。**两条可迁移结论**：① 「加密参数全部还原」≠「能过」——先找「浏览器多发了一个什么请求」；② 「服务端 200」≠「signal 有效」——**判据要看最终业务动作，不看 signal 接口的状态码** |
| 148 | `Cloudflare、Akamai、Kasada 等头部公司怎么做反爬？侧重点是什么，一篇文章给你说清楚！.md` | `ef1932de688c823a5249e7553401472f` | 2026-09-21 | `web-js-env-patcher` + `web-verify-patcher` | evolve | 8 家厂商**设卡层对照**（Akamai 盯浏览器内部 / Cloudflare 盯边缘网络与全网画像 / DataDome 盯单站行为模型 / HUMAN 盯跨站信誉 / Kasada 盯浏览器完整性与 PoW / F5 Shape 盯自定义 VM 与短 token / Fastly 盯 CDN 边缘 / Anubis 盯低成本 AI 爬虫）+ 各家可验证的量化特征（Akamai `sensor.js` ~512KB 且探测约 60 个 `chrome-extension://`（**太干净的浏览器反而像自动化**）；Turnstile 单次 POST 可达 79 个参数；DataDome 85,000 个单站模型、**IP 信誉占总分 25%~30%**；HUMAN **五向量统一评分**、覆盖 29,650+ 站点）。**核心结论**：反爬的本质是**对抗成本**（低级脚本直接拦 → 数据中心代理限掉 → 不执行 JS 的卡掉 → 自动化浏览器靠指纹与时序识别 → 复杂攻击再用挑战/信誉/业务行为消耗），不是单点检测 |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-js-env-patcher` | evolve（主） | 新增 `references/edge-waf-cookie-challenge.md`（**该族判层 / 链路 / 一致性绑定 / 排错清单的唯一权威源**：一页判层十二族 + 六族逐族 + 站点自研风控 + 五条跨族共性机制 + 一致性矩阵 + 14 条排错 + 相邻技能边界）；新增 `scripts/classify_edge_challenge.js`（定族器，零依赖，`--selftest` **32 项断言**含 5 条反例）；`SKILL.md` description 触发词扩展 + 路由新增该族行 + `captcha-flow-and-verify-handoff` 行补「先分两类」+ 命令段加定族命令 |
| `web-reverse-algorithm` | evolve | 新增 `references/10-waf-clearance-cookie.md`（**该族「可离线求解」部分的唯一权威源**）+ `scripts/waf_clearance_solver.py`（9 子命令，零依赖，`--selftest` **91 项断言**）；`SKILL.md` 新增题型分流节「边缘 WAF / CDN 准入 Cookie」+ 资源导航两条 |
| `web-reverse-algorithm/references/01-decision-tree.md` | evolve | §6 删掉误列的「阿里 v2」（它是本族不是验证码）+ 新增 §7「边缘 WAF / CDN 准入 Cookie 题」（信号 / 代表 / 三步路由） |
| `web-verify-patcher` | evolve | `provider-execution-notes.md` 的 `WAF / Bot Management` 段大扩（形态分流表 + 8 家设卡层表 + 加上「风控要一致性不要区分度」的设计取舍 + 加速乐 / acw_sc__v2 / Cloudflare 5s / Turnstile / Drop / Reese84 六节 + Akamai 有效性判据·三次触发·环境段号表·最新采集路线·`dvc` 段）；`provider-products.md` / `captcha-types.md` / `solution-playbooks.md` 各补「先分形态」与指针 |
| `ast-deobfuscation/references/string-array-and-minimal-eval.md` | evolve | 「旋转次数口径」补第二个数据点（`_0x52d57c = function(f,n){f(++n)}` 形态，有效次数 = IIFE 第二实参 347，附 13 组 oracle）+ 新增小节**「字符串表的『恒等式自校验』旋转」**（不读洗牌循环、直接枚举；四个静默失败点：`parseInt` 前导整数语义 / IEEE754 精确相等 / 旋转量基址 magic 每版本不同 / 不能用「像不像可读字符串」验收） |

### B9 的五个方法论增量

1. **「响应码 × 响应体形态 × Set-Cookie 名」三要素判层，任一条单独都不可靠。**
   本族最贵的错误是**判错族**（例如把 `acw_sc__v2` 当验证码走图片识别）。判层工具化：
   `node scripts/classify_edge_challenge.js`，**并且带 `unclassified` 出口与 `ambiguous` 标记**——
   「判不出来」必须是合法结果，否则探测器会退化成「什么都能认」。
2. **可离线 / 不可离线必须先切开，再动手。**
   本族一半以上是「响应体可离线解 + 环境校验必须真浏览器」的混合体。
   把可离线部分做净（本批 4 个族 6 个算法全部落成可执行 + 真实 oracle），
   剩下的环境校验才有干净的输入。**判据**：如果「同一份 JS 连跑两次，环境相关输出不同」，就不要继续做纯算。
3. **「常量表错位」是本族最典型的静默失败，必须用机械 oracle 守。**
   旋转量差 1 位 → 结果**仍然是一串可打印字符**；`parseInt` 用错（Python `float()` 抛错被 `try/except` 跳过）
   → **永远搜不到旋转量**；`===` 松弛成容差 → 假命中。
   ⇒ 每一条都要有「**非目标输入必须 0 命中**」的反例断言（本批两个脚本共 6 类算法反例，外加一组 **CLI 误用**反例：目录当文件传 / 坏 JSON / 缺参 / 歧义）。
4. **判据只能锚在「最终业务动作」上。**
   Akamai 的 `*_bm=Unknown Bot`、加速乐的「cookie 对了但还 521」、Cloudflare 的 base64 占比、
   Amazon 的「signal 接口 200 但密码提交被劫持」——四个独立来源都指向同一条：
   **中间接口的状态码不构成判据，要看到最终动作才算过。**
5. **同一站可能叠两家（边缘 WAF + 站点自研风控 SDK）。**
   本批第 17 篇（Amazon）就是「外层过不了也白搭」的反面教材：加密参数全还原、外层链路全通，
   仍然被自研 bot signal 拦下。**先找「浏览器多发了一个什么请求」，再谈参数还原。**

### 三 judge 独立评审与修复（保真度 / 新用户可用性 / 机械校验）

本批按 B7/B8 惯例派 3 个**独立 judge**（互不可见），每条意见都要求附「自己跑出来的命令与输出」：

| 视角 | 抓到的关键问题 | 处置 |
| --- | --- | --- |
| 可用性（judge B） | `jsl-first --html` 是**死代码**（`--expr/--expr-file` 之外的 else 先返回，文档让跑的命令永远报错）；`--text` 传文件路径会被静默当成正文、只剩 `--status` 打分 ⇒ 给出**看似结果的误判**；`web-verify-patcher/SKILL.md` **缺反向路由**（凭「WAF / 521 / Cloudflare」进来会被引向图片还原 / 打码平台）；命令未标注 cwd | 重写 `cmd_jsl_first` 为三选一入口 + 新增 `extract_document_cookie_expr()`（按**括号深度 + 引号状态**扫描，因为表达式里本身就含 `(';')`）；`--text` 命中「存在的文件路径」时**拒绝并指向 `--html`**；`web-verify-patcher/SKILL.md` 补反向路由（分类标签处 + References 路由处各一条）；所有命令块补 cwd 说明 |
| 机械校验（judge C） | 定族器 `--selftest` **失败时退出 1 而非 docstring 承诺的 2**（裸 Node 栈）；镜像 `.agents/skills` 未同步；新增文件行尾与同目录既有文件不一致；**未声明归属判据的唯一权威源**；文档里多条引用用**裸 basename** 解析不到 | 自检失败改为 `try/catch → 2` 并给可读原因（**在临时副本上改坏一处断言验证过**）；`.claude` ↔ `.agents` 全量重同步（`diff -rq` 无差异）；4 个新增文件统一转 CRLF（同目录既有文件 43/6、10/4 多数为 CRLF）；`captcha-types.md` 显式声明「归属判据以 `edge-waf-cookie-challenge.md` 为唯一权威源」；全部裸 basename 补 `references/` 前缀 |
| 保真度（judge A） | ① `edge-waf-cookie-challenge.md` 把 CF 模数写成 **512 bit**（兄弟文档 / REPORT / 求解器 / 原文四处都是 1024 bit）；② `waf_clearance_solver.py` 的 `acw-table` 自检是**死代码 + 真空通过** —— `for rot in range(len(arr))`（56）里断言 `rot == 347` 永不成立，于是「347 命中 13/13」这条文档赖以立身的验证**实际从没跑过**；同一处 `acw_decode_entry` 用 `text.encode("utf-8")` 喂 RC4（应走 `charCodeAt` 语义）⇒ 解出来是乱码 | ① 改为 **1024 bit**（并补「258 位 hex、首字节 0x00 填充」）；② 重写 `acw_decode_entry` 为 `charCodeAt` 语义（`latin-1`），**自检重写成四项**：满命中旋转量**恰有 1 个**、它必须 `== 347 % len`、**其它任何旋转量 0 命中**、「oracle 篡改一位后满命中必须消失」，并补 CLI 端到端断言（真写表文件跑 `acw-table --oracle`）；顺带修掉 `--lookup/--range` 缺 `--key` 时的 `ZeroDivisionError` 裸栈 |

**保真度回源核对（逐条回原文 + 独立复算，not「读了一遍觉得对」）**：

| 被核对的说法 | 回源 | 独立复算结果 |
| --- | --- | --- |
| 加速乐第一趟 cookie 的 `flag` 是 `-1`、第二趟 `bts[0]` 的 `flag` 是 `0`，且两趟 `<unix_ts>` 相同、毫秒不同 | `1513028`（第一趟表达式）+ 4 组真实 `go({...})`（第二趟） | 第一趟表达式用**自写的 JS 语义求值器**求值 = 文章记录值（逐字符一致）；4 组 `bts[0]` 的 `flag` 段全部为 `0`，`<unix_ts>` 与第一趟一致 |
| `bts[1]` 必须保持 URL 编码原样 | `1513028` | `unquote` 后枚举 529 组**零命中**（已写成自检反例） |
| RC4 字符串表「有效旋转次数恰等于 IIFE 第二实参」（347） | `1822807`（数组 + 13 组「索引 + key → 明文」对照） | 独立探针：347 次 `push(shift())` → **13/13**；左移 10 / 12 位 → **0/13**。**并发现原自检是死代码**（`range(56)` 里断言 `== 347`）⇒ 已重写为「满命中恰 1 个 + 等于 `347 % 56` + 其它 0 命中 + 篡改 oracle 后无命中」 |
| `unsbox` 置换表与 `hexXor` key | `1625598` + `1822807` 两处 | 两文逐元素一致；`hexXor` 的 key 是 **40 位 hex（20 字节）**（原写「32 字节」已改）；循环上界取两串较短者、单字节结果前补 `0`；样例 `F5552…` → `526117F4D34549082EF7C505E2AB50D5A252D1D3` → `62610094d3c0290e28e2c456d2a839d585d2d2a6`（长度 40，已复算） |
| 新版「格式化必失败」的因果链 | `2062618` + `2085758` | 回源确认三段：① 源码偏移（`indexOf('fc1e53')`、另一量恒 `594`）；② 正则 `\{[\s\S]*[/\*]{2}[\s\S]*\}` 检测函数体有无注释符号（**不是**只认 `/*`）；③ `debugger` 删除后 `indexOf` 变 `-1`、判断翻转 ⇒ 值过不了校验，原文给出的正解是 `b.toString()["indexOf"]("")` |
| Cloudflare 模数是 1024 bit（**不是** 512 bit） | `1752891` + `cloudflare/xai-cloudflare/REPORT.md` + 真实脚本三处 | 完整常量 `int(hex,16).bit_length() == 1024`；三处**逐字符一致**（曾因正则只截到拼接常量的第一段而误记 512 bit，已改） |
| rayId-XOR 解码与「base64 占比」判据 | 仓内 `fo_stage1/2.txt` + `.plain` | 两个样本**逐字节命中** `.plain`；真值占比 **1.000**，末位差 1 = **0.835 / 0.788**，全 0 = **0.346 / 0.293**（原先写的 0.47 无法复现，已换成实测值） |
| Cloudflare 字符串表旋转 434 | `new_table_raw.txt`（2050 项）+ 脚内恒等式 | 枚举命中 **434**；`table[1487-458]='document'`、`table[618-458]='BCkZA9'`、`table[1931-458]='_cf_chl_opt'`（与仓内 `new_strtable_decoded.txt` 一致） |
| Akamai 环境数组的「下标 → 注释」对应 | `1831827` 原文数组（**逐元素点名**） | 下标 0=`-100`、1=UA/Screen 合并串、3=input 属性、25=含 `_abck` 的 cookie 快照、31=`0,0,0,0,1,0,0`、38/39=`-127`/`8` … **全部对齐**；但原文**没有明说 tag 在值前还是值后** ⇒ 文档已改为「按下标列 + 配对方向必须现场 dump」，不再给可能误导的 tag→含义表 |
| Akamai 有效性判据与三次触发 | `1831827` | `~-1~` → `~0~` 才算有效 ✅；三次触发 = 首屏自执行 + `setTimeout` 500 + `setTimeout` 1000 ✅ |
| Cloudflare 5s 五步链与端点形态 | `cloudflare 5s盾分析` + `1752891` + 仓内案例报告 | `chReq` 由 `managed` → `chl_api_m` ✅；`/h/g/{managed\|flow}/…` ✅；`sh/aw` 三参数 ✅；`fo`/图片 `/h/g/i/…`/canvas `/h/g/ci/…` 来自仓内案例（已在文档里注明出处与「段名随版本变」） |
| Reese84 的 22 个函数采集清单 | `2062377` 原文逐一对照 | 22 项**逐条对上**（第 5 项生成 **4 个** canvas 链接、第 6/8/9/14 项分别处理其中一个且**顺序重要**、第 11 项含大量 WebGL 扩展与着色器数值、第 15 项最大一坨、第 22 项只生成 `p`） |
| Amazon：XXTEA 标准、明文密码可用、真正拦截点是 bot signal | `2107326` | `delta=0x9E3779B9` / 轮数 `6+52/n` / 无魔改 ✅；实测只提交明文 `password` 也能登录 ✅；Step3 被重定向到 `/ap/cvf/request` ✅；`additionalData` 填 placeholder 服务端仍 200 ✅ |
| Akamai `dvc` 段第一条 hash 的算法形态 | `2009699` | **诚实标注**：文章给的 `startTs` 与记录值 `2482411364` **对不上**（`startTs` 是会话相关时间戳，文中是示意值）⇒ 只当算法形态（`r = 5381; r = (r*33)^c; r >>>= 0`）使用，**不拿那个记录值当 oracle** |

`ox` 固定下标偏移 `m(466) === ox[0]` 的**出处已回源修正**：它来自 `2085758`（不是 `2062618`），
且原文是「样本值」而非普适常量 ⇒ 文档里改成「偏移量随版本变，别照抄 466」。

**自跑补位（judge 未覆盖处，主执行者逐条自验）**：

- `cf-decode` 的「base64 占比」参考值原先写的是**三个我复现不出来的数**（全 0 = 0.35 / 别的会话 ray = 0.47）。
  已改成**本仓两个真实样本的实测值**（真值 1.000；末位差 1 = 0.835 / 0.788；全 0 = 0.346 / 0.293），
  并把阈值口径写死为「**就是 1.0，不要放宽到 0.9**」。
- `Cloudflare 模数` 一度被误记为 512 bit（正则只截到 4 段拼接常量的第一段）⇒ 用完整常量复算确认为 **1024 bit**，
  自检里同时钉「位长 1024」与「文章 / 案例报告 / 真实脚本三处逐字符一致」。
- `10-waf-clearance-cookie.md` 的命令原写成 `python skills/web-reverse-algorithm/scripts/...`（**仓库根下不存在的路径**）
  ⇒ 统一为「相对本技能根」的 `python scripts/...`，并在文档里写明 cwd。
- `acw-table` 的 oracle 链**在 B9 内部就被证伪过一次**：judge A 复算出「自检断言 `rot == 347` 永不成立、解码出来是乱码」，修完后自检从「真空通过」变成**四项互相约束的真断言**（详见上表 judge A 行）。**教训：自检里出现「枚举范围与断言常量对不上」时，一定要先算 `常量 % 范围`，否则写出来的是死代码。**
- 新增 **CLI 误用与退出码** 自检组（15 项）：把「目录当文件传 / JSON 写坏 / 路径不存在 / 缺必填参数 /
  定族歧义」逐条钉成「可读中文报错 + 约定退出码 + **不得出现裸 traceback**」。
- 脚本内 `_next_step` 输出的下一步命令原为 `python waf_clearance_solver.py ...`（缺 `scripts/`）⇒ 补全为可执行路径；
  定族器 `next` 字段里的 `waf_clearance_solver.py` 也补成 `python ../../web-reverse-algorithm/scripts/...`。

### B9 新增能力的复跑命令

```bash
cd D:/work/jsreverse

# 1) 求解器全量自检（91 项断言，含真实样本 oracle 与反例）
python .claude/skills/web-reverse-algorithm/scripts/waf_clearance_solver.py --selftest

# 2) 定族器自检（32 项断言）
node .claude/skills/web-js-env-patcher/scripts/classify_edge_challenge.js --selftest

# 3) 真实 oracle 逐条复现
#    (a) 加速乐第二趟：4 组真实 go({...}) 参数
python .claude/skills/web-reverse-algorithm/scripts/waf_clearance_solver.py jsl \
  --json "{\"bts\":[\"1626918646.167|0|xcX\",\"rLB%2FdFGil%2FWSDtvv5CSWRc%3D\"],\"chars\":\"vyPzcSzkrMmFNwvtkEHtwG\",\"ct\":\"30ef50b82076b2284fa6ca90acbb5938\",\"ha\":\"md5\"}"
#    (b) 阿里 acw_sc__v2 旧版
python .claude/skills/web-reverse-algorithm/scripts/waf_clearance_solver.py acw-v2-old \
  --arg1 F5552FD53D7DEE57A54020812B92605A1D2314C4
#    (c) Cloudflare 响应体：与仓内 .plain 逐字节对拍（真实 rayId → base64 占比 1.000）
python .claude/skills/web-reverse-algorithm/scripts/waf_clearance_solver.py cf-decode \
  --body cloudflare/xai-cloudflare/artifacts/fo_stage2.txt --ray a393f8784a8dce7a
#    (d) Cloudflare 字符串表：枚举旋转量 434 + 已知索引反查
python .claude/skills/web-reverse-algorithm/scripts/waf_clearance_solver.py cf-strtable \
  --table cloudflare/xai-cloudflare/artifacts/new_table_raw.txt --base 458 --target 608776 \
  --verify 1487=document --verify 618=BCkZA9 --verify 1931=_cf_chl_opt

# 4) 定族实跑（十二族一页判层）
node .claude/skills/web-js-env-patcher/scripts/classify_edge_challenge.js \
  --status 521 --cookies "__jsluid_s=abc" --text "document.cookie=('_')" --markdown

# 5) 整体机械校验
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 6) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b9-ledger.py
```

**落盘**：`verified.md`（148 条）、`backup-20260921-1518/`、`baseline-md5-20260921-1518.txt`、
`b9-brief-20260921-1518.md`、`judge-findings-20260921-1518.md`、`b9-run-20260921-1518/`、
`tools/append-b9-ledger.py`。

**体积门禁**：`web-js-env-patcher` 110.1%、`web-reverse-algorithm` 131.7%、
`web-verify-patcher` 108.4%、`ast-deobfuscation` 100.0%（≤150%）。

## 三·I、批次 B10 · 2026-09-21（JSVMP 动态还原路线：插桩 / 日志取证 / CFG / 旁路 AST / 套娃）

取材口径：**单一能力族「JSVMP 的还原路线」一次做全**，覆盖
插桩三层（call·apply → 运算符 → 赋值）、AST 自动插桩与 AI 辅助插桩、日志采集与倒推、
标准算法识别与魔改常量取证、CFG 构建与异常表、PC 状态机与旁路 AST、
解释器改造为生成器、纯静态反编译器、补环境作 oracle、vmp 套 vmp。

选它的理由：B8/B9 台账连续两轮把「**JSVMP 系**」列为优先级 ② 并注明
「B6 只落了『助记符表 + 反编译器设计』，**插桩纯算与符号执行仍可交叉补强**」；
本批开工前打开 `ast-deobfuscation/references/` 核对，确认
`jsvmp-bytecode-and-decompiler.md`（B6）只覆盖**静态侧**，
而 `jsvmp-deobfuscation.md` 仅 2.2 KB、`vm-protection.md` 仅 2.0 KB ——
**「技能名覆盖了、能力没覆盖」**（这是 B7 总结出的最强新批次信号，本批再次验证有效）。
同族待处理 30+ 篇，是整个 `docs/references/` 里**最厚的簇**。

### 分流结论：**本批不新建技能**（第 5 次确认）

按 B8 追加的判据「现有技能的 decision-tree 里这条线是否存在」：
`ast-deobfuscation` 的 `SKILL.md` 工作流第 2-4 步已明确覆盖 JSVMP
（`detect-patterns.js` → 命中家族 → `run-pipeline.js`），且已有 3 个 jsvmp 专用脚本。
⇒ 这条线路口**已存在**，属**能力增强**而非能力缺口，
按任务约束「能归到邻近模块 → 演化，避免滥建冗余技能」，本批**只演化不新建**：
新增知识全部落进既有技能的 `references/` 与 `scripts/`（渐进披露）。

### 本批新增的真实 oracle（不是「读了一遍觉得对」）

| oracle | 内容 | 结果 |
| --- | --- | --- |
| 插桩器语义等价性 | 合成 mini-VM 夹具，**实跑插桩前/后产物并 diff 结果** | 逐字节一致（`F!13`）；19 项断言 |
| 插桩器「不许静默删代码」 | 插桩前后 **AST 节点数对比**（B3 事故：某 pass 静默删掉 9,096 个节点，产物仍 `errors = 0`） | 118 → 467（**只增不减**，门禁不过则拒绝写出，exit 4） |
| 插桩器短路语义 | `false && bump()` / `true \|\| bump()` 插桩后 `hit` 必须仍为 0 | **0 === 0**（逻辑运算符走「只记结果」路线，不捕获操作数） |
| 插桩器 `typeof` 边界 | `typeof` 一个未声明标识符，插桩后不得抛 `ReferenceError` | 仍返回 `undefined` |
| 插桩器幂等/重复插桩 | 同输入插两次产物必须完全相同；对已插桩产物再插必须被拒 | 产物相同；**拒绝**（哨兵 `__VMP_INSTRUMENTED__`） |
| 常量识别器 | `52pojie-2034891` 的 7 元实测数组 | 命中**魔改 MD5**，逐值 diff = **+8 / −2 / 0 / 0**，并报出 `[6] 0xD76AA478 = MD5 T[0]` |
| 常量识别器歧义 | 标准 SHA-1 IV（5 元） | 同时报出「SHA-1 精确命中 5/5」与「MD5 前缀命中 4/4 **且与 SHA-1 歧义**」 |
| 常量识别器反向断言 | 200 组随机数组不得被判为 exact/modified | **0 误报** |
| padding 公式 | 971 字节 → 补 44 个 0、总长 1024（可被 64 整除） | 38 项断言；并**证伪原文的 `42`**（按 42 补完总长 1022，1022 % 64 = 62） |
| 真实 VM 样本插桩 | 仓内 `artifacts/tiktok/webmssdk.js`（243 KB，真实混淆产物） | call 层插到 **251 处**，节点 64,548 → 69,270，产物 `node --check` 通过 |

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 149 | `2073641-jsvmp-pure-algo-tricks.md` | `2d9d988d8d6610d9890bd4607ae11f96` | 2026-09-21 | `ast-deobfuscation` | evolve | 插桩取巧「先打指令、再反问结果」：两种控制流形态（switch / if-else 链 / 三目嵌套）下都直接打印指令流；栈用 JSON.stringify 格式化（须防循环引用，否则打印直接抛错）；「同一指令值出现 9,520 次 ⇒ 在第 9,520 次打断点」的条件断点法；多打印几个指令应对嵌套多层 switch |
| 150 | `2079058-ast-jsvmp-instrument.md` | `8d51d702e6fffd6d2524b2ff57b6e13c` | 2026-09-21 | `ast-deobfuscation` | evolve | **AST 自动插桩**：定位特征 = 父节点 SwitchCase + 后兄弟 BreakStatement + 自身是赋值表达式（圈定 handler 不误伤业务）；console.log 不是单一节点（MemberExpression + CallExpression 两步构造）并封装复用；**动态 k 值两趟法**（先把 `k++` 改成 `k - index` 并在还原后改回，index 需 reverse 倒排）；**插桩代码二次调用被插桩函数 ⇒ 有状态变量多推进 ⇒ 后续分支整体错位**（故插桩只读不调用） |
| 151 | `2104849-qqmusic-sign-vmp-instrument-log.md` | `204c82aa300a57b26ca5860a260c0dc4` | 2026-09-21 | `ast-deobfuscation` | evolve | 插桩日志分析全流程：先在控制台装日志导出器（**拦截 console 必须保留原方法**、分批导出、txt/json/jsonl、可选保留调用栈），再扣 VM 到本地插桩；**密文固定化**（明文固定成最短可复现值）让日志可复现；从结果倒推生成逻辑 |
| 152 | `2106666-ctrip-token-vmp-trace-log.md` | `ad41031277c3e2d980a0276ca617c2e6` | 2026-09-21 | `ast-deobfuscation` | evolve | **魔改常量取证**（标准 MD5 IV vs 实测：A +8 / B −2 / C·D 未改 + 多一个非标准 H4 寄存器 ⇒ 只改 IV，T/S 表未动）；**噪声字符公式** `charCode = ceil(random()*94) + 36`（范围 37–130，**含不可见 128–130 ⇒ 文本复制必丢字符**）；22 字段无分隔符拼接（**字符范围与真实数据完全重叠 ⇒ 不能靠特征切字段**）；噪声的三重目的（防重放 / 防字段提取 / 不可见字符陷阱）；洗牌字母表演化 `salt = lottery + 域名 + alphabet[:33]`；基数拆位拼接 `长串[n/L] + 长串[n%L]`；klogg 分析大日志 |
| 153 | `2116112-qqmusic-vmp-init-sha1.md` | `3c53e42ffd5326673feef2027200f3f1` | 2026-09-21 | `ast-deobfuscation` | evolve | VM 初始化链：柯里化 IIFE `(function(){})()()()` → Base64 解码 → **VL-Base128 变长解码** →**ZigZag 解码** `n = (e>>1) ^ -(1&e)` → **查指令映射表** `real_opcode = table[byte_opcode]` → switch（83 个 case）；四种指令编码形态（定长 `[opcode][operand]` / 变长 / TLV `[opcode][argc][args]` / 寄存器式）；String Pool；**标准算法识别**（40 hex + 5 寄存器 + 每 20 轮换一个处理函数 + h0 迭代 ⇒ SHA-1）；**padding 用长度反推再回日志核对**（971 字节 → 残块 11 → 补 42/44 的口径与「实际日志里没有 0x80」这一反常发现） |
| 154 | `2123850-qqmusic-jsvmp.md` | `b811f46b25146bcdb6839f0e4a5243fb` | 2026-09-21 | `ast-deobfuscation` | evolve | AST 插桩 `.call()` 形态：定位 `AssignmentExpression.right` 为 `CallExpression` 且 `callee.property.name === "call"`；提取三要素（`callee.object` 被调函数 / `arguments[0]` 作 this / 其余打包成 args 数组）；固定 hook 模板 `hookCall` / `hookOp` 便于日志导出复用；检测点日志实证（`RegExp("Headless","i").test(ua) === false`、`indexOf` 域名、`some([域名表])`） |
| 155 | `2116186-douyin-a_bogus-jsvmp-decompile.md` | `6a15f3ca232b3503d4adb99dc56e7095` | 2026-09-21 | `ast-deobfuscation` | evolve | **栈式 VM 语义表模板**（76 个 handler，按「栈效果」而不按名字记）+ **CFG 构建四步**（Leader 识别 → 切基本块 → 解跳转建边 → Graphviz dot 出图）+ **异常表语义**（`stateFlag` 1/2/3 与 `[tryStart, catchStart, finallyStart, tryEnd]` 的跳转规则）+ 调用栈帧 8 项（bytecode/isStrict/exceptionTable/envArray/currentThis/pc/stateFlag/returnValue 少恢复一项就串味）；字节码解密链（atob → 变长 → XOR，密钥由 `charCodeAt(0) ^ (this + this % 10 * r) % 256` 派生）；**已知局限自述**：CFG 只解决块间关系，块内语义仍要靠插桩/语义表 |
| 156 | `2120914-douyin-jsvmp-bogus-pure-algo.md` | `355fb71f050f16f962732a6885485808` | 2026-09-21 | `ast-deobfuscation` | evolve | **旁路式 AST**：注入 AST SDK 后原逻辑一行不改、AST 栈另开一套（写错也不影响真实执行）；`__astBeginOpcode` / `__astRecordNormalExit` 双桩（**所有 opcode 都要加，漏一个留断边**）；**CFG bound 合并判据：一个 pc 有多个入口 ⇒ 存在控制流、不可合并；单入口 ⇒ 可并入前块**；建 CFG → 算支配树 → 找段内回边 → 拼回 `if/else`/`while`；递归 opcode（`case 63`）不展开只占位，需用执行记录回溯关联；AST 处理 VMP 三分类（纯静态生成器 / 解释器改造为生成器 / 旁路式） |
| 157 | `52pojie-2096887-某音乐jsvmp插桩纯算解析+响应数据加密绕过.md` | `34a1f9ace2fa7bc44fa269f581e75c46` | 2026-09-21 | `ast-deobfuscation` | evolve | **三层插桩的顺序硬约束**（1.0 只插 `.call`/`.apply` 看大致流程 → 2.0 再插运算符 → 3.0 最后插赋值定位常量表）；**只插真正走到的那个解释器**（VM 常有 `i()` / `a()` 两个重复解释器，两个都插等于日志翻倍）；索引数组语义 `"SHA1结果".charAt(索引)` 逐字符拼接；**长度跳变处就是算法边界**（1280 ← 1252 ← 明文）；**响应加密绕过**：`encoding: ag-1` 是加密标志，去掉即走明文；AES-GCM 密文 = IV + 密文 + tag（缺 16 位认证标签就凑不上长度） |
| 158 | `52pojie-1752755-如何使用AST还原某音的jsvmp.md` | `09e3c8b2ecd3e995e12bd4a81e8b9ed1` | 2026-09-21 | `ast-deobfuscation` | evolve | **解释器改造为生成器**路线：`if/else 混淆 → switch` 转换便于一步到位调试；**`throw Error("未更改")` 逐个定位未处理 case**（抛异常的就是还没处理的，跑通即覆盖完整）；**`june.push(case_num)` 运行时收集实际执行的 case**，再把枚举里没出现的死分支整体删掉；if/else 还原（进分支存现场 → 递归 → 以 else 分支起始指令值作为 if 的结束值）；循环识别（再次进入时指令值 == if 起始指令值即判定为循环，改写为 while）；变量区层级 `$0` 本函数 / `$1` 上一层；环境检测密集（DOM 操作 + 一堆异步对象取设备信息） |
| 159 | `52pojie-2040789-Web逆向之VMP还原全流程.md` | `e9709afc7180d8118db0eb8802441024` | 2026-09-21 | `ast-deobfuscation` | evolve | 自实现反编译器七步（初始化节点 → 建空 AST → 模拟 VM 执行环境 → 加载 base64 解码后的指令 → 指令处理循环 → 类型推断生成 AST → 挂进 program body）；虚拟寄存器 + 关键函数分工（写寄存器 / 读寄存器 / 解码指令分发 / 轮密钥取指解密 / 生成异或解密表）；操作码按产出分四类（数值 / 字符串 / 函数调用 / 属性访问）；产物是白盒 AES + 变异 base64 |
| 160 | `52pojie-2117124-一文读懂jsvmp之入门篇.md` | `1fc45b36021a0620775b1131f6b54ccd` | 2026-09-21 | `ast-deobfuscation` | evolve | JSVMP 结构教学（constPool / stack / regs / bytecode / ip / opcode handler 的逐条走读）；**「VM 怎么知道读出来的是操作码而不是参数」的答案就是指令格式约定**；栈操作基础清单（push/pop/栈顶只读/反转/移位/切片/深浅拷贝）——作为新人的第一份教材，也是「栈式 VM 的最小可运行模型」参考实现 |
| 161 | `52pojie-2023103-某q-深入浅出 JSVMP.md` | `0f1b2b3bccc6772db0e7c4c386f07b65` | 2026-09-21 | `ast-deobfuscation` | evolve | 还原思路六步（静态分析解释器结构 → 动态跟踪执行流程 → 逐条分析 opcode 语义 → 还原伪源码/构建语义树 → 生成近似原始 JS）；**插桩与反编译互为补充**（作者原话：「插桩最重要的是不知道插在哪里，但这种方法你很明确就知道要分析哪里」= CFG 定位插桩点）；**`case 1 --> return` 是最有价值断点**（直接在对应位置打断点看结果，本批实测 g=3319 处 sha1 完成）；指令替换法（把 `n[++g]` 替换掉即可，剩下都是重复性代码） |
| 162 | `52pojie-1983577-【JS逆向】某Q音乐VMP纯算.md` | `22384e4327c953de2c6f69ef66300e48` | 2026-09-21 | `ast-deobfuscation` + `web-reverse-algorithm` | evolve | **密文固定化**（明文固定为 `"1"`，日志显著变短、常量更易辨认）；**记标准 hash 密文以加速识别**（看到熟悉的 sha1 密文就不用再比对）；四段拼接结构（固定前缀 `zzc` + 固定索引数组取字符 + 一段位运算生成 + 再一个固定索引数组）；webpack 场景的前置工作（找加载器、补齐缺失模块、导出加密函数，先对拍密文一致再插桩） |
| 163 | `52pojie-2034891-某程token jsvmp算法分析.md` | `79501c53575329464051ef84ca0ed143` | 2026-09-21 | `ast-deobfuscation` | evolve | **特征值查表定族**：日志里 `[1732584201, 4023233415, 2562383102, 271733878, 942946097, 7, 3614090360]` 转 16 进制即命中 MD5 IV 特征 ⇒ 定性为 MD5 家族，只需改那几个魔改常量（**不读一行 VM 字节码**）；插桩 apply 时**先排除用于函数绑定的 apply**（真正要插的只有一处）；「返回数组末尾一个 1288 像长度 + 定长分组」作为 hash 算法的形态判据 |
| 164 | `52pojie-2057046-某视频平台jsvmp纯算还原.md` | `38a83d646644b361633a80ea27dd6397` | 2026-09-21 | `ast-deobfuscation` + `web-reverse-algorithm` | evolve | 媒体流 key 被加密时的插桩还原路径（m3u8 的 key/iv 直接用会失败 ⇒ 猜测 key 被加密 ⇒ 在 `decrypt` 处下断点定位解密函数）；确定为 **AES-CBC / ZeroPadding / 128 bit**；`btoa(String.fromCharCode.apply(null, e))` 取回原始 key 的 base64；**作者自述的方法论教训**：「即使我最后发现之前的部分分析没有必要」——先判层再动手，不要一上来就啃 VM |
| 165 | `52pojie-2053916-【js逆向】码上爬-题十二JSVMP入门逆向补环境.md` | `23fb7c1f05bed089243fe511e8be23bb` | 2026-09-21 | `ast-deobfuscation` | evolve | 补环境路线的可复用手法：先整体搬到本地跑 → 逐个报错补齐（ajax/`$` → Canvas → `document.createElement` → `navigator/location/history/screen/localStorage`）→ **挂代理看哪个属性是 undefined 再补**；关键补齐项 `$.extend` / `setAttribute` / `MockCanvasRenderingContext2D` / `toDataURL`；补完导出到全局即可出值 |
| 166 | `52pojie-1865940-[JSvmp] 某书最新webprofile之profileData逆向算法.md` | `f39c87241e035ef4f76e87dc10861b12` | 2026-09-21 | `ast-deobfuscation` + `web-reverse-algorithm` | evolve | **推荐组合顺序**：用 jsdom 补环境先跑出一致的签名当 oracle，再回头分析算法；「**执行 VM 消耗资源巨大，手上没点钱是顶不住业务机器的高并发的**」⇒ 补环境可作 oracle、不可作交付形态（交纯算）；同厂两个参数（`x-s` 与 `profileData`）共用同一套 VM 思路，**换 key 与字符串池即可复用前一次的还原经验**（base64 环境块 + 内存里的 key 数组） |
| 167 | `52pojie-2030247-vmp套vmp之探讨某d的_fingerprint参数生成.md` | `dabed884a4d6c5cb317eaf1c1f9a9c97` | 2026-09-21 | `ast-deobfuscation` | evolve | **vmp 套 vmp** 的处置顺序：只先还原外层、把内层当黑盒（插桩记它的入参/返回值）→ 对内层入参做**短串分析**（由哪几段拼成、哪些是常量哪些是环境值）→ 再确认内层是否与已知算法同构 → 确有必要才独立建工程展开内层；参数生成入口的快速定位（直接搜赋值点 `this._fingerprint = ...`，比跟栈快） |
| 168 | `52pojie-2027657-AI与JSVMP的初次结合-深入浅出的逆向JSVMP.md` | `77f72860c9b0e694524412e889376a9b` | 2026-09-21 | `ast-deobfuscation` | evolve | **AI 辅助插桩**：给模型「目标 + 要观察的变量 + 期望日志格式」产出插桩代码，但**产物仍须人工核对覆盖关键路径**；**分而治之**：把一个大的逆向流程不断拆成很多个小流程逐个交给模型；apply 插桩日志的读法（从 `[调用 apply]` / `[返回值]` 的成对记录还原数据流，本批实测可见 ua 先进 VM 出乱码、环境数组与小数组拼接后再进 VM、最后与字符串做运算出 a_bogus） |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `ast-deobfuscation` | evolve（主） | 新增 `references/jsvmp-dynamic-instrumentation.md`（**插桩路线唯一权威源**：三层插桩顺序 / 四种实现选型 / AST 自动插桩两个坑 / 日志采集与减量 / 倒推法 / 标准算法识别四层证据 / 魔改常量取证 / 噪声与字段边界 / 9 条反例）；新增 `references/jsvmp-cfg-and-symbolic-paths.md`（**反编译工程化路线唯一权威源**：三路线选型 / CFG 四步 / **栈式 VM 指令语义表模板** / 异常表 `stateFlag` 与栈帧 8 项 / PC 状态机与 CFG bound 合并 / 寄存器式 VM 差异 / AI 辅助 / vmp 套 vmp / 9 条反例）；新增 `scripts/jsvmp-instrument.js`（三层插桩器，**19 项断言**，含实跑对拍 + 节点数门禁 + 重复插桩守卫）；新增 `scripts/crypto-signature-id.js`（常量识别 + 魔改 diff + `--padding`，**38 项断言**）；`SKILL.md` 入口脚本 +2、导航 +2、路线判据 +1 |
| `ast-deobfuscation/references/jsvmp-bytecode-and-decompiler.md` | fix | 修正 1 处**悬空跨技能引用**（`web-js-env-patcher/references/...` 缺 `../../` 前缀）——由本轮新加的「裸跨技能路径」检查规则**翻出的历史遗留**（B6 时期写入） |
| `web-reverse-algorithm` | evolve | 新增 `references/11-jsvmp-restoration-routes.md`（**「JSVMP 该走哪条路」唯一权威源**：选路决策树 / 五条快速判据 / 三条路线的细节权威源指针 / 插桩纯算落地八步 / 真实密文当第一道 oracle 的对拍口径 / 媒体流与 `stream-drm-reverse` 的分工 / 「响应加密能不能直接绕过」判据 / 7 条反例）；`SKILL.md` JSVMP 题型节补「先定路」+ 资源导航 +1 |

### 工具链变更（`artifacts/skill-evolution/tools/`）

| 文件 | 变更 | 原因 |
| --- | --- | --- |
| `node-resolve-preload.js` | **补 ESM 解析链** | 原实现只打 CJS 的 `Module._resolveFilename` 补丁，**拦不住 ESM**；本仓 `analyze-jsvmp-vm.js` / `detect-crypto.js` 是原生 ESM，`-r` 后会 `ERR_MODULE_NOT_FOUND` |
| `esm-resolve-hook.mjs` | **新增** | ESM 侧 resolve 兜底（`module.register()`，Node ≥ 20.6）；先让 Node 自己解析，仅在 `ERR_MODULE_NOT_FOUND` 时回退到 case 自带 `node_modules` |
| `check_skill_integrity.js` | 新增「**裸跨技能路径**」检查 + **自给自足预加载** | ① 原引用检查只认 `` `references/…` `` 与 `` `../…` `` 两种前缀，`` `web-js-env-patcher/references/x.md` `` 这类**永远检查不到**（实测是悬空引用），新增规则锚定「首段是真实 skill 目录名」避免误伤 `docs/...` 仓库根路径；② 校验器现在自己往 selftest 子进程注入 `NODE_OPTIONS`，使台账第八节那条文档化的一行命令可**独立跑通** |

### B10 的六个方法论增量

1. **插桩解决「值是什么」，反编译器解决「结构是什么」，补环境解决「能不能跑」。**
   三者不是替代关系：多篇文章的共同结论是**先做 CFG 定位插桩点，再用插桩验证 CFG**
   （`52pojie-2023103` 原话：「插桩最重要的是不知道插在哪里，但这种方法你很明确就知道要分析哪里」）。
2. **魔改常量取证：不看代码，看数字。** 把日志里的定值数组逐值与标准实现 diff，
   差异就是「改了什么」。两个产品（`52pojie-2034891` 与 `2106666`）的 diff **完全一致**（`+8 / −2 / 0 / 0`）
   —— 同族复用是这条方法的副产品：找到一个等于找到一族。**可以完全不读 VM 字节码。**
3. **「文章里的数字一律自己算一遍」。** 本批抓到源文章**两类**数字错误：
   ① `52pojie-2034891` 把十进制 `942946097` 写成 `0x38514731`（实际 `0x38343731`）；
   ② `2116112` 的 padding 段把 SHA-1 分组说成 32 位、且写「`64 − 11 − 1 = 42`」（实际 52）。
   两条都已在技能文档里以「踩坑留痕」形式记录，并把**正确值用脚本断言兜住**。
4. **插桩必须是「只读」的，且必须有语义等价性门禁。** 插桩代码一旦二次调用被插桩函数，
   有状态变量（`k++` / `pc`）会被多推进 ⇒ 后续分支整体错位；而**错位后的产物仍是合法 JS**。
   因此插桩器必须过三关：实跑对拍 + **节点数只增不减** + 重复插桩守卫。
5. **CFG bound 的合并判据是「入口数」而不是「代码相似度」**：多入口 ⇒ 控制流汇合点、不可合并；
   单入口 ⇒ 可并入前块。旁路式还必须给**所有** opcode 加桩，漏一个就在 CFG 上留断边。
6. **「重复解析链」是会反复踩的坑**：CJS 补丁不覆盖 ESM。本批把预加载扩成
   「CJS 补丁 + ESM resolve hook」两条链，并在文档里写明症状（`ERR_MODULE_NOT_FOUND`）与版本要求
   （`module.register()` 需 Node ≥ 20.6）。

### 三 judge 独立评审与修复（保真度 / 新用户可用性 / 机械校验）

评审前**先 freeze**（记 md5，见 B9 教训「派 judge 前先 freeze，评审期间只做修复、不做顺手改」）：
`artifacts/skill-evolution/b10-freeze-20260921-1730.tsv`；
最终 md5：`artifacts/skill-evolution/b10-final-md5-20260921-1730.tsv`。

**三 judge 结论：needs-fix ×3 → 修复后 keep/all-clear。**

| 视角 | 抓到的问题（**全部回源复核后成立，无驳回**） |
| --- | --- |
| 保真度 | ① **padding 算术张冠李戴**：文档把自算的 `972 % 64 = 12 / 补 44` 当成文章口径，且漏掉文章真正的重点（推演出的 `0x80` 在日志里**根本没出现** ⇒ 该 VM 是非标准填充）；② **`IrJmp` 跳转条件写反**（真才跳、假不跳），照抄会让分支整体反转 |
| 新用户可用性 | ③ `-r artifacts/...` 缺 `./` ⇒ `MODULE_NOT_FOUND`；④ `jsvmp-instrument.js --selftest` 在无预加载时**裸甩错误**；⑤ **ESM 脚本用 `-r` 必失败**（`analyze-jsvmp-vm.js` / `detect-crypto.js`）；⑥ §10 示例对魔改数组写「期望 diff 全 0」（实际 `+8/−2`）；⑦ 示例写 `/tmp/` 路径（本机 node 会解析成 `D:\tmp\`）；⑧ 复跑命令写死带日期的中间目录 |
| 机械校验 | ⑨ `jsvmp-cfg-and-symbolic-paths.md` 里 **`§7.2` 悬空**（目标无该小节标题）；⑩ `detect-crypto.js` 路径缺 `.claude/`；⑪ 「safe-stringify」措辞像是技能有现成工具、实则没有；⑫ `§6.5` 把 `--file` 与 `--selftest` 混在一条命令里 |

**主执行者自审额外抓到 1 个 judge 没提的缺陷**：
⑬ `jsvmp-cfg-and-symbolic-paths.md` §2.4 声称 `envArray` 的层级约定与
`52pojie-1752755` 的 `$0/$1/$2` **「完全一致」**——实为**索引起点相反**
（`envArray[0]` 是最外层，`$0` 是当前函数；对应关系是 `$0` ↔ 当前 `envArray` 本身）。
已改为逐项对照表并加「不要把 `$0` 当成 `envArray[0]`」的显式警告。

### B10 遗留 / 下一批建议

- 待处理队列见台账末尾累计行。下一批按簇取材，优先级：
  1. **JSVMP 剩余（14 篇左右）**：`jsvmp-pure-algo` 系仍有余量（某乎 x96 三代 4 篇、某音 X-Bogus 2 篇、
     某讯 jsvmp 2 篇、某 q 音乐 3 篇）。**本批未做的两条线**：
     ① **符号执行 / 中间代码优化**（`2116186` 作者自述下一步方向：常量折叠、常量传播、CFG→JS）；
     ② **插桩日志的自动化折叠**（本批明确留白，见下）；
     均落既有文件，**不要新建技能**。
  2. **webpack 扣取/改写系（16 篇）**：`ast-deobfuscation` 有 `webcrack-bundle-unpack.md`，
     但「半自动扣取 / 改写 / 在 node 里复用」这套流程仍无集中落点（B8 起连续两轮挂账）。
  3. 验证码图像识别系剩余；真拼图/旋转系协议侧；Cloudflare 剩余。
- **B10 明确留白（写进文档而不是假装支持）**：
  1. **无通用插桩日志折叠器**。`2106666` / `2104849` 靠 klogg + 手工过滤；
     本批判断「各家日志格式差异过大，通用折叠器投入产出比不成立」，并已在文档里显式标注为缺口 +
     给出触发条件（「同一格式日志重复出现 ≥3 次」再补）。**建议把「在插桩阶段就只打一条合并记录」
     作为首选做法**，而不是事后写折叠器。
  2. **无 safe-stringify 实现**。文档原措辞会让人以为技能自带，已改为显式说明
     「本技能不提供，参考 `2104849` 的导出器配置或自己写」。
  3. `jsvmp-instrument.js` 对**动态 `k` 值**只做到「提示隐患 + 插桩只读不调用」，
     未实现 `52pojie-2079058` 的「先改后还原」两趟自动化（需要识别 `UpdateExpression` 在
     SwitchCase 内的分布）。目前靠文档指引人工处理。
  4. 插桩器在**真实大样本**上只验证了语法与节点数（`webmssdk.js`），
     未做「插桩后跑完整个 VM 并与原产物对拍」的端到端验证（缺可独立跑的夹具环境）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）。
- 候选新技能 `captcha-flow-orchestration`（整站过验证流程）—— B5/B6/B7/B8/B9/B10 六次确认**不新建**。

### B10 新增能力的复跑命令

```bash
cd D:/work/jsreverse

# 1) 三层插桩器自检（19 项：实跑对拍 + 节点数只增不减 + 重复插桩守卫 + 短路/typeof 边界）
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/ast-deobfuscation/scripts/jsvmp-instrument.js --selftest

# 2) 真实 VM 样本插桩（仓内 243 KB 真实产物；期望 call=251、节点 64548 -> 69270）
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/ast-deobfuscation/scripts/jsvmp-instrument.js \
  artifacts/tiktok/webmssdk.js artifacts/skill-evolution/b10-run-20260921-1730/webmssdk.instr.js \
  --tier call --stats

# 3) 常量识别器自检（38 项：标准 IV / 魔改 IV / 随机数反例 / padding 公式与反例）
node .claude/skills/ast-deobfuscation/scripts/crypto-signature-id.js --selftest

# 4) 复现 52pojie-2034891 的结论（期望：魔改 MD5，diff [+8,-2,0,0]，并报出 MD5 T[0]）
node .claude/skills/ast-deobfuscation/scripts/crypto-signature-id.js \
  --input "1732584201,4023233415,2562383102,271733878,942946097,7,3614090360"

# 5) padding 预期值（期望：r=11、补 44 个 0、总长 1024）
node .claude/skills/ast-deobfuscation/scripts/crypto-signature-id.js --padding 971

# 6) ESM 链回归（预加载新增 ESM hook 后，这两个原生 ESM 脚本应可跑通）
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/ast-deobfuscation/scripts/analyze-jsvmp-vm.js artifacts/tiktok/webmssdk.js --json
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/web-reverse-algorithm/scripts/detect-crypto.js --input artifacts/tiktok/webmssdk.js

# 7) 整体机械校验（现在可独立跑通：校验器自己注入 NODE_OPTIONS）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 8) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b10-ledger.py
```

**落盘**：`verified.md`（168 条）、`backup-20260921-1730/`、`baseline-md5-20260921-1730.txt`、
`b10-brief-20260921-1730.md`、`judge-findings-20260921-1730.md`、
`b10-freeze-20260921-1730.tsv`、`b10-final-md5-20260921-1730.tsv`、`pending-B10.txt`、
`b10-run-20260921-1730/`、`tools/append-b10-ledger.py`、`tools/esm-resolve-hook.mjs`。

**体积门禁**：`ast-deobfuscation` 11013 → 13828 字节 = **125.6%**、
`web-reverse-algorithm` 17035 → 18414 字节 = **108.1%**（均 ≤ 150%）。

---

## 批次 B11

**取材口径**：**单一能力族「打包产物的模块抠取与 node 复用」一次做全** ——
判族与结构模型 · 静态闭包 · 运行时半自动记录 · 手抠 · 生产模式定位 · 动态导出 · 异步 chunk ·
node 复用与环境交接 · 免抠（RPC / 无头 / WASM）· 有 `.map` 的另一条路。

**选它的理由**：B8 / B9 / B10 连续三轮把这一簇列为待办并注明
「`ast-deobfuscation` 有 `webcrack-bundle-unpack.md`，但『半自动扣取 / 改写 / 在 node 里复用』
没有集中落点」。开工前核对：`webcrack-bundle-unpack.md` 仅 1.6 KB（**技能名覆盖、能力没覆盖**），
且待处理队列里同族 **19 篇** —— 三条建新技能的判据同时成立。

**产出**：**新建技能 1 个**、演化既有技能 3 个、附带修复 1 项（工具链根因修复）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 169 | `52pojie-1723802-JS逆向之webpack 通用扣取思路.md` | `92bfe12f9aa5fb26d402849bf12169be` | 2026-09-21 | webpack-bundle-extraction | create | 「webpack 代码抠取」七步总纲（跟进目标模块 → 认模块入口出口 → 由第三形参定位加载器 → 下载 runtime 并全局导出 → 下载 chunk 只留目标模块 → 半自动补依赖 → 写 run 脚本）；三对象模型（__webpack_require__ / __webpack_module_cache__ / __webpack_modules__，strip 过也只改名不改骨架）；**半自动抠取的正宗做法**（清空模块缓存让轨迹触发更多依赖；在 `__webpack_modules__[id].call(...)` 行设日志断点而非在加载器入口，否则重复收集；收集串的 key 加不加引号视 case）；生产模式靠 F12 从第三形参点进去 + 静态搜 `120:function` / `,42:function` / `{3665:function`（不加空格）；静态/动态导出（`__webpack_require__.d`）；run 脚本框架与补环境只需 self/window/navigator/document |
| 170 | `52pojie-1902544-半自动快速扣取webpack.md` | `b5dd4c8fabb196edfcae09a393aa9ef9` | 2026-09-21 | webpack-bundle-extraction | create | 半自动抠取的**条件断点表达式**写法：`xxx[c] = e[c],false`（逗号表达式让条件为假 ⇒ 断点不停）；先在加载器上一帧把缓存对象置空，之后新增的 c 就是所需模块；收集串用 `Object.keys` 拼 JSON |
| 171 | `52pojie-1983924-【JS逆向】某建筑webpack逆向分析.md` | `526fa8a8417c7162dc91803c36850208` | 2026-09-21 | webpack-bundle-extraction | create | 响应解密题的定位顺序（响应加密 + xhr ⇒ 先看 `interceptors.response.use`）；半自动抠取的**八步操作单**（在目标模块加载处断住 → 挂 `window.module_str` → 在 `if(a[e])` 处下条件断点拼 `"模块名":模块函数.toString()` → 跳到目标对象后再补 `}` → copy → 替换进自执行函数空对象）；判据：模块函数由自执行函数的大对象提供，抠模块就是从该对象里取 |
| 172 | `52pojie-1906192-某云盘encryptMsg 加密之半自动化扣webpack.md` | `4f18a91f9f85992173ee40a5edbdec1c` | 2026-09-21 | webpack-bundle-extraction | create | 自定义半自动工具的四段式：拆「模块列表 / 加载器列表 / 运行文件」→ **重写加载器**（在原调度函数开头 `if(!modules_list.includes(e)) modules_list.push(e)` 记录）→ 遍历写键值 → 重新封装；前提是先手工找到加载器；产物不成熟但流程可复用 |
| 173 | `52pojie-1572529-ast自动扣webpack脚本实战.md` | `f748d87db27bfe4008c345c6014070b9` | 2026-09-21 | webpack-bundle-extraction | create | **AST 自动扣取**（webpack_mixer：`-l 加载器 -m 模块 -o 输出`）：加载器特征 = 自执行开头 + `return e[n].call(r.exports,r,r.exports,d),r.l=!0,r.exports` + 挂 `d.e/d.m/d.n` 等方法；模块文件特征 = 以 `webpackJsonp` 开头；漏模块时靠报错反复补 `-m`；复用期往代码里补 `window`（如 ASN1 未定义，实际是 `window.ASN1`） |
| 174 | `52pojie-1613466-某网站webpack逆向.md` | `ce6c62d9ed59249635dce415d280474a` | 2026-09-21 | webpack-bundle-extraction | create | 同一题的**两种姿势对照**（① 用 webpack_mixer；② 自己扣：加载器段 → 声明全局变量导出加载器 → 只留目标模块 → 缺啥补啥）；报错 `TypeError: Cannot read property "call" of undefined` **就是少模块**，不是环境问题；定位手法：在启动器 `r("854c")` 处打点，从堆栈进加载器 |
| 175 | `52pojie-1499238-某音乐网站查询参数加密逻辑分析（分离式的 webpack 加密代码扣取详解）.md` | `1ffc0faa549371a4c524355d4ed4c0ff` | 2026-09-21 | webpack-bundle-extraction | create | **加载器与模块表不在同一文件**的形态（本文件开头看不到分发器，单步 `n(109)` 才跳到另一个文件的 `d` 函数）；抠取步骤：只留 `d` 并补 `var t={}` → **在分发器里按 id 找模块**（不要从调用点单步进去，会偏）→ 递归扣 `109`/`202`/`203` → 把 `d` 赋给外部声明的全局变量（自执行函数执行完方法表就没了） |
| 176 | `52pojie-1469095-对某网站进行webpack改写.md` | `bce3748d1b2a7426c44f16dedaf75255` | 2026-09-21 | webpack-bundle-extraction | create | 「webpack 改写」路线（对付无限套函数的产物）：整段复制 runtime → 在单步 `call` 处确认加载器 → 扣下模块表与 runtime → **在代码最上面声明一个变量并在加载器处赋值**，把局部变量导出到外部；三种打法排序：抠函数（最麻烦）/ 直接调用（只适用标准算法）/ webpack 改写 |
| 177 | `52pojie-1489972-Webpack改写实战案例（二）.md` | `9726426eb6a1dfcc1a102f43796fbaa9` | 2026-09-21 | webpack-bundle-extraction | create | 改写实战之二：导出被调用的模块对象后再 `new` 出来调用其方法（`n.encode` 的 n 要显式导出）；注意「1 调用 2」的层级关系 —— 只导出最外层还不够，被依赖的那层也要导出 |
| 178 | `52pojie-1490174-Webpack改写实战案例（三）.md` | `c89bd4a4a3609a78b1bbca73c6324b3b` | 2026-09-21 | webpack-bundle-extraction | create | 改写实战之三：sign 参数在请求链路上「半路被塞进去」的定位法（对比不同层级的参数对象，锁定注入点）；`i = n.n(a)` / `a = n(156)` 的层层展开与逐个导出 |
| 179 | `52pojie-2031316-WEB前端逆向在nodejs环境中复用webpack代码.md` | `c44fdaec4f9e80c42cba0b1401070795` | 2026-09-21 | webpack-bundle-extraction | create | **本批最系统的一篇**：webpack 打包→配置→产物框架全解释；`__webpack_require__` 全局导出（在函数体后加 `globalThis.__exposedWebpackRequire = <加载器>`）；node 侧 `global.self = global` + require runtime/chunk + 用 `__webpack_require__(moduleId)` 取模块；生产模式 strip 后没有符号名，靠 F12 从第三形参定位；动态导出 `.d()` 的 getter 语义；异步 chunk `__webpack_require__.e("name").then(__webpack_require__.t.bind(...,23))` **只需关心 moduleId 无需关心 chunkId**；半自动收集依赖（先清缓存 → 在 `.call` 行日志断点 → 出口断点取结果）；抠取结果集成形式（runtime.js + one_bundle.js + run.js 三段）；「JS RPC」是抠取的反面路线 |
| 180 | `52pojie-2014743-【入门】webpack 补环境.md` | `32f6c7b383e9869cb970b177cd67648b` | 2026-09-21 | webpack-bundle-extraction | create | 扣完后**结果与浏览器不一致**时的处置：先怀疑有环境检测，再用 **Proxy 环境自吐**（对 window/document/location/navigator/history/screen 包裹 get/set 并打印访问），据此集中补环境；补的顺序是 `window = global` → navigator.userAgent → location.host；用条件断点 `t=350` 复用同一条加载路径反复观察 |
| 181 | `52pojie-2026911-一个可以练习webpack的站.md` | `790d2e8072e258ba1d8aaea5521497bb` | 2026-09-21 | webpack-bundle-extraction | create | 请求与响应**双向**加密的 webpack 站（encData / SM4 / SM2 字段名只是表象，重点在抠加载器）：在拦截器 `u = Object(u.a)(e)` 处进加载器 → 整包拷下来 → `u = window.ooo("7d92")` 调用；注释掉「加载 0 号模块」那一行；`execjs` 复用；经验判据：请求/响应都带加密字段时先找拦截器 |
| 182 | `52pojie-2012536-药某局 webpack js逆向扣代码.md` | `67c25039da8c8489b7362281bcc02df6` | 2026-09-21 | webpack-bundle-extraction | create | 把 webpack 讲给小白的那一篇：**模块表两种传参形态**（数组 `!function(e){[...]}([fn1,fn2])` 与键值对 `!function(e){「K1」:fn1}`）；加载器模板（`window.loader = n` 导出 + `window.loader(0)` / `window.loader("fun1")` 调用）；**「缺哪个补哪个」的最小闭环**（报错 → 定位 → 补 → 再跑）；注意文中的加载器示例把返回写成 `o.exports.exports`，属**笔误**，正确语义是返回 `o.exports` 本身 （写错的表现是「加载成功但取不到方法」） |
| 183 | `52pojie-2064583-某平台登录参数扣代码.md` | `02d54ca519b0725460fa6e010e766286` | 2026-09-21 | webpack-bundle-extraction | create | **扣代码稳住道心**的朴素流程（与 webpack 无关的那一档）：document 发出的请求不能用 xhr 断点 ⇒ 直接全局搜关键词；常量由接口下发（`/user/publicKey` 给 modulus/publicExponent/aesKey）；依赖链式导出（rsa.js 缺 BigInteger ⇒ 补 jsbn.js / rng.js / prng.js，缺环境就补 `envs.js`）；验证码用 ddddocr；**拿图片与 publicKey 时 cookie 会过期**要刷新 |
| 184 | `52pojie-1519694-js逆向之Rpc免扣代码.md` | `d3bc366e2fb381f9fb2089c3adf0efb7` | 2026-09-21 | webpack-bundle-extraction | create | **RPC 免抠**（JsRpc）：页面里注入 ws 客户端 + `regAction(name, fn(resolve,param))`，**`resolve(...)` 才是回传点**；`/list` `/ws` `/go` 三个接口；group/name 只是分组标识；HTTPS 页面连普通 ws 可能被拦（本机 127.0.0.1 通常放行，否则配 wss 证书）；页面不能关 |
| 185 | `52pojie-2072858-前端加密函数利用 RPC 调用实现自动化.md` | `050b52d096de6cd62c75b30d30caa949` | 2026-09-21 | webpack-bundle-extraction | create | RPC 作为「加密逻辑可调用化」三选一（无头浏览器 / WASM 导出 / ws-RPC 双向通道）；把 `window.__sign = (p) => realSign(p)` 挂出去由本地脚本拉起；强调「不改逻辑、不改页面，只监听并转发」；并明确其边界（适合持续调用与强混淆场景） |
| 186 | `52pojie-1619257-vue项目webpack逆向需有.map文件.md` | `806b08ce10c087aa34f01e82a02d1961` | 2026-09-21 | webpack-bundle-extraction | create | 有 `.map` 时**先别抠代码**：`shuji app.xxxx.js.map -o folder` 直接复原源码目录（vue-cli 产物常见）；这是与抠取并列的另一条路，判据是「站点是否发布了 sourcemap」 |
| 187 | `52pojie-1679174-js逆向-猿人学比赛14题-扣代码破解.md` | `cbb54bd6d68bfa6d2f2cf59f8682cf59` | 2026-09-21 | web-js-env-patcher | evolve | 扣代码期的高频坑：hook 失败先看 `Object.defineProperty` 是否被重写（用重写后的新变量再 hook）；`window.ASN1`（实际挂在 window 上）在 node 里找不到 ⇒ 补 window；**格式化后进入死循环**（源码自判「函数体是否含换行」）⇒ 不格式化或改为固定 false；**跨请求有状态变量必须回传**（形如 `this[「i」]`、`this[「j」]`、`this[「S」]` 的单字符字符串键属性，每页变化且需保持上页值，否则「第一页对、第二页错」）；定时器要置空才能退出 |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `webpack-bundle-extraction` | **create** | 新技能：`SKILL.md`（判族分流表 / 工作流 / 三条静默错误 / 命令入口 / 失败模式 / 反例黑名单）+ 4 个 reference（`bundler-identification.md` 判族与结构模型 · `harvest-routes.md` 三条抠取路线 · `node-reuse-and-env-handoff.md` 复用与补环境交接 · `no-harvest-routes.md` 免抠与「该不该抠」）+ 3 个零依赖脚本（`detect-bundler.js` 29 项断言 / `harvest-bundle.js` 36 项断言 / `env-shim.js` 17 项断言）+ 共用扫描库 `lib/bundle-scan.js` |
| `ast-deobfuscation` | evolve | `references/webcrack-bundle-unpack.md` 开头新增「与 `webpack-bundle-extraction` 的分工」唯一判据（读懂 vs 跑通）；`SKILL.md` 导航行同步 |
| `web-reverse-algorithm` | evolve | `references/01-decision-tree.md` 新增「### 8. 打包产物（webpack）题」（补上此前**缺失的路口**）；`references/06-engineering-maintenance.md` §11.3 路线表新增「打包产物抠取 + Node CLI」一档与 `Cannot read property 'call' of undefined` 的分流判据；`SKILL.md` 新增对应题型块 |
| `web-js-env-patcher` | evolve | `references/node-leakage-and-silent-failure.md`：宿主 `navigator` **直接赋值是静默失败、必须 defineProperty**（含一行自检）+ 静默失败清单新增第 13 项「跨请求有状态变量」+ 新增「打包产物抠出来的代码：交接约定」；`references/env-debug-loop.md` 进入条件补一条交接指针 |

### 本批次的方法论增量（可复用）

- **判「该不该新建技能」的第 4 条判据：看任务的目标动词。**
  B7 =「技能名覆盖 ≠ 能力覆盖」、B8 =「decision-tree 里这条线是否存在」、B10 =「打开 reference 看体量」，
  **B11 =「目标是『读懂』还是『跑通』」** —— `webcrack` 那条线解决的是「读懂」，
  而「把模块抠出来当黑盒调用」是完全不同的产出物与验收标准。
  两条线并存时**不要合并**：合并后「跑不出结果」的原因会不可判。
- **本批最强的验证手段是「生成器独立算期望值」**：220 模块随机依赖图夹具
  （`artifacts/skill-evolution/tools/make-webpack-fixture.js`）由生成器自己 BFS 出闭包，
  再与被测脚本的闭包结果逐元素比对；**6 个入口的产物值与原产物逐字节相同**，
  体积随入口收敛（19942 → 16547 / 9313 / 1826 / 143 字节）。
  小合成夹具只能验证「语法对不对」，**验证不了闭包算法**（入口恰好只依赖一个模块时，算错也看不出来）。
- **同一个「掩码串定位 + 原文取内容」的两段式里，三处都会静默给出空值**
  （chunk 名、模块 id / `r("+OK6")` 实参、`key:` 是否真代码）。
  **判据：偏移来自掩码串、文本来自原文**；搞反了不报错，只是「闭包永远只剩入口模块」。
- **真实样本立刻翻出两处静默失配**（本批最重要的实证）：
  在仓内真实产物 `project/dingxiang/sources/basic-captcha-js.js.orig` 上跑第一版脚本得 `unknown`，
  原因是 ① 全局名带后缀 `webpackJsonpdxCaptcha`，`\bwebpackJsonp\b` 一条都匹配不到；
  ② webpack 4 把 JSONP 数组替换成函数后是**直接调用注册** `webpackJsonp<名>(["chunk"],{...})`，
  根本没有 `.push(`。二者都改完后同一文件正确识别为 `webpack4-jsonp`。
  ⇒ **合成夹具全绿不等于能用**，必须拿真实产物过一遍。
- **空对象 / 假模块表的拦截（本批第二条实证）**：`project/dingxiang/sources/dx-captcha-index.js.orig`
  里被扫出 110 项「模块表」，键是 `+t5M` / `/8Uj` / `0`，其实是**二次混淆的字符串字典**。
  于是新增「第二条证据」判据：**必须有加载器或指向该表的注册语句**，
  否则 `detect-bundler.js` 标注 `tableCorroborated:false`、`harvest-bundle.js` 的 `closure`/`emit` **直接拒绝执行**（exit 2，可 `--force` 跳过）。
  **理由：不拦的后果是「闭包算得头头是道、产物生成成功，但 id 与源码整张都是错」且不报错。**
- **Node ≥ 21 的 `navigator` 是「只有 getter、没有 setter」的访问器属性，直接赋值不是静默失败就是抛错**（本机 Node v22.22.2 实测：
  描述符 `{get:[Function], set:undefined, enumerable:true, configurable:true}`、`userAgent === 'Node.js/22'`；
  非严格模式下赋值**静默失败**（读完仍是 `Node.js/22`），严格模式/ESM 下抛 `TypeError: ... which has only a getter`）。
  **机制写错会让「为什么赋值无效」的根因反过来**（有 setter 就该赋值成功），所以这一行必须与实测逐字一致。
  这条与本仓库反复出现的「静默失败」家族同源，已落 `web-js-env-patcher`。
- **`--selftest` 要覆盖三种「必须失败」**：非法输入必须被拒绝（普通脚本、未被佐证的模块表）、
  缺失模块必须被报出（`missing` / `null`）、产物必须能**实跑对拍**（不是「能加载」）。
- **工具链路径漂移会被机械校验器记成技能缺陷**：`node-resolve-preload.js` 与 `esm-resolve-hook.mjs`
  写死了 `geetest/node_modules`，而该目录已挪到 `project/geetest/node_modules` ⇒
  `jsvmp-instrument.js --selftest` 报「找不到 @babel/*」，校验器报成 ast-deobfuscation 的阻断项。
  **根因修复**：两个文件都改成「有界递归自动发现含 `@babel/parser` 的 node_modules」，
  不再写死路径（本机现在能同时发现 `project/geetest` 与 `project/xiaohongshu/xhs-ob` 两处）。
  ⇒ **判据：文档需要为工具写例外的地方，先怀疑工具。**
- **源文章的数字必须自己算（B10 结论再次应验）**：本批抓到 1 处，是**我自己**抄错台账里的 md5
  （`790d2e8072e258ba1d8aaea552147b` 少两位）——由「脚本内 md5 与文件实算逐条比对」抓出。
  ⇒ 台账脚本必须自带「md5 与文件名实算比对」，否则错哈希会让「内容变更后需重评」这条幂等规则永久失效。

### 复跑命令

```bash
# 1) 新建技能三个脚本的自检（detect 29 项 / harvest 36 项 / env-shim 17 项）
node .claude/skills/webpack-bundle-extraction/scripts/detect-bundler.js --selftest
node .claude/skills/webpack-bundle-extraction/scripts/harvest-bundle.js --selftest
node .claude/skills/webpack-bundle-extraction/scripts/env-shim.js --selftest

# 2) 真实产物判族（仓内样本，期望 webpack4-jsonp；第二个期望 unknown + tableCorroborated=false）
node .claude/skills/webpack-bundle-extraction/scripts/detect-bundler.js project/dingxiang/sources/basic-captcha-js.js.orig
node .claude/skills/webpack-bundle-extraction/scripts/detect-bundler.js project/dingxiang/sources/dx-captcha-index.js.orig

# 3) 220 模块随机依赖图夹具 + 端到端对拍
#    --verify 会真的跑：判族 / 模块数 / 闭包逐元素 / 每个入口的产物取值与体积；
#    任一不成立 ⇒ 退出码 1。实测：4 个入口（1001/1100/1200/1220）全部逐字节相同，共 15 项 PASS。
node artifacts/skill-evolution/tools/make-webpack-fixture.js --out artifacts/skill-evolution/b11-run-20260921-1930/wpfixture   --modules 220 --verify --entries 1001,1100,1200,1220
node .claude/skills/webpack-bundle-extraction/scripts/harvest-bundle.js closure   artifacts/skill-evolution/b11-run-20260921-1930/wpfixture/bundle.js --entry 1001   --runtime artifacts/skill-evolution/b11-run-20260921-1930/wpfixture/runtime.js
node .claude/skills/webpack-bundle-extraction/scripts/harvest-bundle.js emit   artifacts/skill-evolution/b11-run-20260921-1930/wpfixture/bundle.js --entry 1200   --runtime artifacts/skill-evolution/b11-run-20260921-1930/wpfixture/runtime.js   -o artifacts/skill-evolution/b11-run-20260921-1930/wpfixture/one_1200.js

# 4) 整体机械校验（0 阻断 / 0 告警 为通过）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 5) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b11-ledger.py
```

**落盘**：`verified.md`（187 条）、`backup-20260921-1930/`、`baseline-md5-20260921-1930.txt`、
`b11-freeze-20260921-1930.tsv`、`b11-final-md5-20260921-1930.tsv`、`judge-findings-20260921-1930.md`、
`pending-B11.txt`、`b11-run-20260921-1930/`、`tools/append-b11-ledger.py`、`tools/make-webpack-fixture.js`。

**体积门禁**：新建 `webpack-bundle-extraction/SKILL.md` = **15356 字节**；
`ast-deobfuscation` 101.6%、`web-reverse-algorithm` 103.4%、`web-js-env-patcher` 100.0%（均 ≤ 150%）。
---

## 三·J、批次 B12 · 2026-09-21（流媒体 / DRM 收尾：厂商 key 配方 + 容器型 DRM + wasm 内存取证）

> ⚠️ **补登说明**：本批次技能改动于 2026-09-21 21:28–21:35 落盘，
> 但该轮**未写台账、也未写 automation memory**（半成品）。补登时未凭记忆，
> 而是**逐篇回源**：16 篇每一篇都在 B12 新增/改写的技能文本里找到了**唯一性特征串**
> （固定盐 `bf5941f27ee14d9ba9ebb72d89de5dea`、固定 IV `3cccf88181408f19`、口令 `72Fhskjglp8qjpqx`、
> `dpbt`、`_emscripten_run_script`、文件头 IV `12,1,3,1` …）。
> 原候选 `52pojie-2057046` 经回查发现是 **B10 第 164 行**，已剔除。

**取材口径**：**「流媒体 / DRM 的协议侧收尾」一次做全** —— 厂商 key 方案 13 个配方 +
容器型（EPUB / 在线阅读器）三配方 + 直播源 URL 差值法 + wasm 媒体解密器的内存取证与文件头解密。

**选它的理由**：B11 遗留清单第 ④ 条点名「`stream-drm-reverse` 自 B8 建库后**一次都没演化过**」，
且 B8 遗留第 2 条明确记着「解密 → 重新封装 TS 的完整回写路径未实现」——
本批把这条路径补成可执行件（`ts_repack.py`），并把 B8 只给了方法论的 F 层补上**取证级**操作。

**产出**：**无新建技能**（第 6 次确认），演化既有技能 **3** 个，附带修复 3 项。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 188 | `52pojie-1664368-某hukem3u8解密简单分析.md` | `fe021e938d504ade1cf682c5baebaccc` | 2026-09-21 | stream-drm-reverse | evolve | 腾讯云点播 / TCPlayer 系「客户端自选临时密钥」形态：`overlayKey` / `overlayIv` 由本地 `Math.random` 生成 32 hex，再用 RSA 公钥加密成 `cipheredOverlayKey` / `cipheredOverlayIv`（各 256 hex）随播放 CGI 上送，服务端下发的 key 是「用这一对加密过的」⇒ **这一对可以写死成全 `0`（32 个字符）仍能解出正确 key**（服务端原样回环）；课程 id → 取 psign；DRM token 是 JWT，`~` 要换回 `.` 再解析 |
| 189 | `52pojie-1655529-某培训中心介绍页视频解密.md` | `21cc26e46ff73fe934a3761ceea584a8` | 2026-09-21 | stream-drm-reverse | evolve | 百度 BCE DRM：`tokenVideoKey` + `encryptedVideoKey` 成对出现；**「固定口令 + AES-ECB」家族的自制实现看着像魔改 AES**（`Kd` / `Ke`、`S` / `Si` / `T1..T8` / `U1..U4` 一堆表）**其实等价于标准 AES-ECB** ⇒ 先按标准跑，对不上再回去看 S 盒；`encryptedVideoKey` 每次请求可能轮换（服务端按会话换）⇒ 不要缓存上一次解出的明文 key；有的实现 `decrypt` 是手写的而 `encrypt` 是空函数 ⇒ 别指望反向验证 |
| 190 | `52pojie-1617087-某浪m3u8解密简单分析.md` | `798b6fdd4d436ea549484fbc3889bbb7` | 2026-09-21 | stream-drm-reverse | evolve | 某浪「V3 key」：`data` 字段里同时塞 key + iv + 密文。判据是「**一次响应里既给密文又给密钥**」⇒ 不需要逆任何算法，直接取用（本族最省力的一类） |
| 191 | `52pojie-1258605-【记录】某网站js逆向与m3u8解密.md` | `ddd211ae4289653debb9d2107dd2cd6d` | 2026-09-21 | stream-drm-reverse | evolve | m3u8 正文「整表替换字符」形态：响应体不是 `#EXTM3U` 开头、像 base64 但含 `! @ ( ) - _ *` 等 base64 非法字符、**末尾有 `==`** ⇒ 它仍然是 base64，只是**字母表被替换**了；定位手法命中率极高：在 JS 里搜 `replace(/\(/`（`(` 在正则里必须转义，而替换表里几乎必然出现 `(`），搜 `replace(/\//g` 也行；**边界**：这张表只作用于 m3u8 文本，**不要套到 ts 分片上**（套错的表现是「长度对但内容全错」） |
| 192 | `52pojie-1846708-某网课平台m3u8 key解密算法分析以及python实现.md` | `787d91aa0992d4e5398bed62d45da29c` | 2026-09-21 | stream-drm-reverse | evolve | `encryptedVideoKey`（32 hex）+ 固定口令 AES-ECB 家族：JS 侧 `utf8.toBytes(口令)` 后手动按两位切 hex → ECB 解密即得内容 key；**ECB + 固定口令 ⇒ 同一站点所有视频共用一把包装口令**（但被包装的 key 本身可能按会话轮换）；Python 侧复现只需标准 AES-ECB，不必还原 JS 那套自制查表实现 |
| 193 | `52pojie-2052533-Web视频解析接口解密.md` | `51ce038f0b8b5bafe73d3da37780eeef` | 2026-09-21 | stream-drm-reverse | evolve | 解析站 `params = SHA256(盐 + url + platform)`（盐是固定串 `bf5941f27ee14d9ba9ebb72d89de5dea`，64 hex ⇒ 第一个假设就是 SHA-256）；**通用做法**：把「盐」与「拼接顺序」当两组未知量，用 **2~3 个真实样本穷举**（盐在头/尾 × url 在前/在后 = 4 种，几分钟穷举完，比读 JS 快得多）；**穷举必须两个以上样本同时命中**，单样本命中是假阳性 |
| 194 | `52pojie-1885820-某视频解析网址加密接口分析.md` | `35424d62e0e4bb60ee711a58c21579f3` | 2026-09-21 | stream-drm-reverse | evolve | 「**响应自带密钥**」形态：请求侧 `key = base64(AES_CBC(时间戳+url, key=utf8(MD5HEX(时间戳+url)), iv=utf8(固定串 "3cccf88181408f19"), padding=Zeros))`；响应 JSON 里同时给 `aes_key` / `aes_iv` 与密文字段 ⇒ **直接拿响应里的密钥解，不要去找派生式**；🔴 坑：请求侧 padding 是 **Zeros 不是 PKCS7**，用 PKCS7 解会在末尾**静默多出或少掉字节** |
| 195 | `52pojie-2070601-某视频网站signter简要分析.md` | `578490f88938fd5045f60d6f5029008b` | 2026-09-21 | stream-drm-reverse | evolve | `signter = MD5(按 key 字典序拼接的 k=v& + ts + 盐) + "-" + ts`（请求头形如 `<32hex>-<10 位秒级时间戳>`）；判据：**值里自带 10 位时间戳** ⇒ 一定是「签名 + 时效」组合；把时间戳当第二段单独解出来对拍一次，能立刻确认签名口径对不对 |
| 196 | `52pojie-1706864-js逆向某视频VIP.md` | `dbe20693d4dbc8679980b3d9b9e669a6` | 2026-09-21 | stream-drm-reverse | evolve | 「**自描述密文**」形态（长度字段 + 尾部密钥）：请求侧 `AES_CBC(JSON, key=md5(k)[16:32], iv=md5(k)[0:16]) + reverse(k) + str(len(k))`，长度字段本身再 base64 单独放一个字段；响应侧更绕：`ciphertext = url.slice(0, -n)`（n = 尾部密钥解出 JSON 里的值）⇒ 二次解出 realKey 再解正文；🔴 坑：`md5(k)` 切成的两半**哪半当 key、哪半当 iv 是常见搞反点**，搞反的表现是「解出乱码但不报错」，验收必须用「解出的必须是合法 JSON / 可读 URL」 |
| 197 | `52pojie-957638-【直播源综合教程】斗鱼直播真实地址解析，直播源抓取方法，自抓直播源分享长期有效.md` | `4fa674051679d4480f1ef12dc72f91a8` | 2026-09-21 | stream-drm-reverse | evolve | 直播源「**URL 差值法**」：把两次抓包的播放地址逐段 diff，分离出「不变段」与「时效参数段」，据此推出真实地址的构造式（斗鱼标准格式）。已落成可执行件 `scripts/m3u8_rewrite.py --diff-url / --diff` |
| 198 | `52pojie-1533870-清风DJ网在线播放地址JS解密转MP3方法.md` | `4417631fb9463aa324ca02acabadc014` | 2026-09-21 | stream-drm-reverse | evolve | 清风DJ 系：**同一页面里内联两套 `DeCode`**（两段不同的解码逻辑，分别对应不同接口/资源），判据是「音频直链在 JS 里现算」而不是接口下发 ⇒ 直接抠那两段函数即可，不必找算法族 |
| 199 | `52pojie-2112556-央视 h5e 视频解密脚本.md` | `efdfc80d48ca21737c5cbb5309cc6020` | 2026-09-21 | stream-drm-reverse | evolve | 央视 h5e 的 **NALU 级 wasm 解密 + `vmpTag` 派发**：`InitPlayer()` → 每次解密前 `UpdatePlayer()` 取 `vmpTag`，`vmpTag` 中落在 `"0123456"` 的字符决定调 `_CNTV_jsdecVOD{7-i}(mediaTag, buf, len, hostLen)`；会话串：普通包 `mediaTagID`，特殊包 `"mediaTagID##<dts>##<seeked>"`；NALU type 25 的 `payload[0]` 决定 `shouldDecrypt`，只有 type 1/5 才解密（**既不是整片加密也不是全 NALU 加密**）；🔴 模块**有状态**：`InitPlayer` / `UpdatePlayer` / `UnInitPlayer` 必须成对，重复初始化会失败 —— 把它当 oracle 用时前提是「能稳定复现一次会话」 |
| 200 | `52pojie-1634927-某东和文泉在线阅读epub解密.md` | `19859cec90e87014686a251ef784a0f7` | 2026-09-21 | stream-drm-reverse | evolve | **容器型 DRM 三配方**（一章一份的加密正文，分层判据与 m3u8 完全不同）：A 某东 PC / H5-1（`read_chapter.action` 的 `k` 与响应解密是**成对自写函数**；🔴 `utf16ToBytes` **不是 UTF-8**，按 UTF-8 复现长度就对不上 ⇒ 直接 execjs 调原函数最省力；`chapterId` 不在任何明文里，藏在上一次请求的**解密结果**中且**名字不叫 chapterId**）；B 某东 H5-2（`enc=1` 家族，**AES / DES 由时间戳奇偶切换** ⇒ 把 `tm` 写死成偶数锁定 AES 分支，无脑按 AES 复现会在奇数请求上静默解出乱码；key = MD5(tm) 的 16 字节；`uuid` / `sign` 的派生与「`localStorage.clear()` 后观察是否回登录页」的定位法）；C 某学堂 EPUB（**双层 AES/ECB + 正文要先跳过定长前缀**，自写长度读取函数 `dpbt` 取**末 4 字节大端**）；另附 EPUB 最小结构（`mimetype` 必须第一个条目且 stored 不压缩）与「能被阅读器打开」的验收判据 |
| 201 | `52pojie-1837142-某视频网站wasm简要分析.md` | `a37cf02fecc1a0dc19a2449771e9fc99` | 2026-09-21 | stream-drm-reverse + wsam-reverse | evolve | wasm 媒体解密器的**内存取证**（补上 B8 遗留的「key 在哪」）：`new Blob([new Uint8Array(Module.HEAPU8)])` 把整块内存 dump 下来搜特征串（AES S 盒 `63 7c 77 7b`、写死的 key/IV、编码表）；**地址差法**（JS 胶水层取结果的地址 `p` 是现成锚点，key 常在 `p ± 固定偏移`，实测一例 `-304`；偏移是常量但不保证跨版本）；断点打不上先看是不是跑在 **Worker** 里（改对 `_malloc` 下断点，或插 `debugger`）；`_emscripten_run_script*` 打桩过环境检测（报错栈落在它上面就别读 wasm）；🔴 **输入不能置空**（后续处理失败会主动释放已算出的 key 内存 ⇒ 必须传一个真实的小分片）；**文件头解密**（头大小 `((序号 % 5) + 1) * 1024 | 16`、固定 IV、解密后还要异或还原 + 数据整体前移 16 字节，尾巴必须对齐 **188** 的整数倍） |
| 202 | `52pojie-1864441-某解析wasm逆向.md` | `5a61bb1078eb2c04872b7a9d9db8ad0b` | 2026-09-21 | wsam-reverse | evolve | **Go 编译的 wasm** 形态：符号名常保留 `$crypto/aes.NewCipher` / `$crypto/cipher.newCBC` / `$runtime.stringFromBytes`，断点看入参即可拿到 key 与 iv；🔴 `crypto/cipher` 的流对象**有状态** ⇒ 同一个实例第二次调用可能返回 `null` / 空，想多取样本要**每次重新加载模块**（或一次调用只取一组）；用 `decrypt` 反查明文里被塞的 `timeout` / `fingerprint` —— 这解释了「同一个输入每次结果不同」 |
| 203 | `52pojie-1162942-HTML5视频解密的方法（widevine的破解思路）.md` | `ee7cb2d5f0b85c83d2f70adb545108fb` | 2026-09-21 | stream-drm-reverse | evolve | Widevine / CDM 的**边界声明**：密钥由 CDM 内部（L3 软件实现）持有，**不在 JS 层**。已写进 `vendor-key-schemes.md` §2.13 与 SKILL 的「该停手」判据，避免在这一族无限投入 —— 把「明确做不到」也当成一条可复用的结论归档 |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `stream-drm-reverse` | evolve（大幅） | 新增 `references/vendor-key-schemes.md`（**厂商 key 方案与接口配方唯一权威源**：13 个实测配方 + 跨配方判据表 + 「不报错但结果错」坑表）；新增 `references/ebook-and-container-drm.md`（**容器型内容保护唯一权威源**）；新增 `scripts/m3u8_rewrite.py`（播放列表本地化 + 地址差值法，37 项自检）与 `scripts/ts_repack.py`（**解密后重新封装 TS**，保留 PES 头 / 按 NALU 起始码回填 / 补 adaptation field，35 项自检）—— 后者即 B8 遗留的「回写路径」；`references/hls-and-ts-structure.md` 新增 §10（交付前两个机械动作）并把排错表改号为 §11；`references/whitebox-and-wasm-crypto.md` 新增 §6（内存取证与文件头解密，emcc / Go 两类产物）；`SKILL.md` 分层表 +2 行、description 触发词扩展 |
| `wsam-reverse` | evolve | `references/wasm2c-and-memory-semantics.md` 新增 §7（内存取证：HEAPU8 dump 搜常量 / 地址差法 / `_emscripten_run_script` 打桩 / Go 符号名与流对象状态 / 结果内存生命周期），原 §7 反例黑名单改号 §8 并补 3 条；`SKILL.md` 正文加「读 WAT 之前先花 5 分钟取证」的分流、失败回退表 +4 行、关联段补指针、description 补取证关键词 |
| `web-reverse-algorithm` | evolve | `SKILL.md` 补「先认形态、再谈算法」（自描述密文 / 响应自带 key-iv / 算法按时间戳奇偶切换，三种只量体征即可判）；`references/08-mixed-crypto-segmentation.md` 同步 |
| 附带修复 | — | ① `ts_repack.py` 写补丁时 shell heredoc 把 `\x00` 降级成真实 NUL 字节（SyntaxError）⇒ 全部改 `bytes([...])` 形式并加「残留 NUL 必须为 0」的兜底断言；② 断点打不上先判 Worker；③ 「偏移不保证跨版本」写进坑表（防止把一次实测的 `-304` 当常量用） |

### 本批次的方法论增量（可复用）

1. **「客户端自选临时密钥」是本族最省力的一类**：`overlayKey` / `overlayIv` 由本地随机生成、
   服务端原样回环 ⇒ 可以**写死成全 `0`**。判据是「密文参数每次请求都不同，但解出来的东西稳定」。
2. **「看着像魔改，其实等价于标准」要先用标准算法验一次**：自制查表实现（`Kd` / `Ke` / `S` / `Si`）
   在 AES-ECB + 固定口令这一族里**实测等价于标准 AES-ECB**。先用标准跑，对上就不读代码。
3. **判据优先于算法**：本批 13 个配方里，**至少 5 个不需要逆任何算法**
   （响应自带 key/iv、URL 差值法、整表替换、客户端自选密钥、内联两套 DeCode）。
   先量「密文长度 / 字符集 / 响应里有没有 key」这三件事，能直接砍掉一半工作量。
4. **「不报错但结果错」的坑要单独成表**：本族最危险的错误全部是静默的
   （padding 口径错、md5 两半搞反、替换表套错对象、时间戳奇偶走错分支、
   末尾 16 字节没前移、尾巴没对齐 188）。**每一条都配一个「必须失败」的断言**。
5. **「回写」是独立的一层，不能并进「解密」**：只要 ES 长度变了，原 TS 包布局就失效。
   交付验收的唯一硬标准是 `ffmpeg -v error -i <out>.ts -f null -` 无输出。

### B12 新增能力的复跑命令

```bash
S=.claude/skills/stream-drm-reverse/scripts

# 1) 两个新脚本的自检（m3u8_rewrite 37 项 / ts_repack 35 项，均含拒绝路径）
python $S/m3u8_rewrite.py --selftest
python $S/ts_repack.py --selftest

# 2) 播放列表本地化（远程 KEY → 本地 key.key + 去时效 query）
python $S/m3u8_rewrite.py <播放列表.m3u8> -o local.m3u8 --key-file key.key --key-hex <32位hex>
python $S/m3u8_rewrite.py <播放列表.m3u8> --dump-urls segs.txt --pretty

# 3) 地址差值法（直播源：分离不变段与时效参数）
python $S/m3u8_rewrite.py --diff-url "<抓包A的URL>" "<抓包B的URL>"

# 4) 解密后重新封装 TS 并验收（B8 遗留的完整回写路径）
python $S/ts_repack.py <seg>.ts --pid 0x100 --extract-es <seg>.es
python $S/ts_repack.py <seg>.ts --pid 0x100 --es <seg>.clear.es -o <seg>.clear.ts
python $S/ts_repack.py <seg>.clear.ts --pid 0x100 --check --expect-es <seg>.clear.es
ffmpeg -v error -i <seg>.clear.ts -f null -        # 唯一算数的验收

# 5) 整体机械校验（0 阻断 / 0 告警 为通过）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 6) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b12-ledger.py
```

**落盘**：`verified.md`（203 条）、`backup-20260921-2130/`、`baseline-md5-20260921-2130.txt`、
`b12-run-20260921-2130/`（含 `integration_check.py` 与 TS 往返夹具）、`pending-B12.txt`、
`tools/append-b12-ledger.py`（本轮补登）。

**本批遗留**：① `ts_repack.py` 只有**合成包**夹具，没有真实 `.ts` 分片做端到端回归；
② 容器型三配方里 A / B / C 的「可执行件」只有 `media_crypto.py aes-ecb` 这一档，
某东的 `utf16ToBytes` 与 `dpbt` 只给了 JS 侧描述；
③ 地址差法只有 `--diff` 的机械 diff，没有「自动归纳出构造式」的一步。
---

## 三·K、批次 B13 · 2026-09-22（JSVMP 剩余：IR 优化 / CFG 回译 / 厂商字节码取证）

> ⚠️ **本轮开局先做了两件「半成品补救」**（沿用 B7 救回 B6 的做法）：
> 1. **B12**（2026-09-21 21:32）的技能改动与台账均已落盘，但 **automation memory 缺条目**（本轮补写）；
> 2. **B13**（2026-09-21 23:45）属**半成品**：`ast-deobfuscation/scripts/jsvmp-ir-optimize.js` 已写入，
>    但它声明的权威文档 `references/jsvmp-ir-and-optimization.md` **不存在**，
>    `SKILL.md` 未接线、`.agents` 未镜像、台账未登记、memory 未写。
>    ⇒ 本轮把这四项补齐，**才**把 B13 正式做完（台账口径：B13 = 本节 15 篇）。
>    另修：B12 遗留的 7 处失效跨技能引用（`stream-drm-reverse/references/` 下 `../<skill>/` 少退一级
>    + 1 处裸跨技能路径）与 `wsam-reverse/SKILL.md` 的行尾混用。

**取材口径**：**「JSVMP 反汇编产物之后那一步」一次做全** ——
IR 的常量折叠 / 死 case 消除 / 短路还原 / CFG 回译 · 两套真实 opcode 编码（12 位家族 / 3 字节家族）·
三厂商 opcode 语义骨架（某 Q 音寄存器式 82 handler / 某音 8 参数入口 / 某讯 chaos 随机分段）·
常量取证（bignum limb vs 哈希常量表）· 纯算落地（x96 轮转查表 / X-Bogus 七组四字符）·
插桩日志的读数与预算递进。

**选它的理由**：B11 起连续三轮把「JSVMP 剩余」列为优先级 ① 并注明
「B6 只落了助记符表 + 反编译器设计」；开工前核对 `jsvmp-bytecode-and-decompiler.md` 虽已 15.9 KB，
但**「拿到 IR 之后怎么优化」这一步完全没有落点** —— 而 `52pojie-2042090` 的原文正是以
「**下一步将继续学习中间代码优化相关知识，进行常量折叠、常量传播等优化，优化完毕后将控制流图转换成对应的 js 代码**」
结尾 ⇒ 这是**能力缺口**（第四条判据：现有 reference 里没有这条线），且 `2042090` 那轮已经把工具写了一半。

**产出**：**无新建技能**（第 6 次确认），演化既有技能 **3** 个（`ast-deobfuscation` / `forum-corpus-archival` /
`stream-drm-reverse` 引用修复），补做半成品 **1** 个（B13 的文档 / 接线 / 镜像 / 登记），附带修复 **9** 项。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 204 | `2079071-qqmusic-sign-param-vmp.md` | `910bfdc71e96fd524900c1d1bb6d39f4` | 2026-09-22 | ast-deobfuscation + web-reverse-algorithm | evolve | 某 Q 音 sign 的**可执行 JS 全文**（本批交叉验证的一极）：`sign = ("zzc" + 取索引表1 + base64后删「/+」 + 取索引表2).toLowerCase()`；四张常量表全部落地；「先只打 call → 1027 条衔接不上 → 补运算 2216 → 补索引取值 3289 才清晰」的**日志预算递进**；`++h` 自增实参打日志要减掉 `++`；`553B7D79` 这类**列表 join 出来的固定串**要先确认「是结果要用的」再往上追 |
| 205 | `2084662-tencent-jsvmp-part1.md` | `067fece3af1719a199408b553497139f` | 2026-09-22 | ast-deobfuscation | evolve | 某讯滑块 VMP 的**定位四步**（虚拟机初始化 / 指令调度 / 指令处理 / 循环执行）+ 「把文件里所有方法折叠后，只有一个是自执行的，重点看它」的判据；「环境检测少 ⇒ 直接扣算法」与 `getTdcData` 断点链 |
| 206 | `52pojie-1619464-【JS逆向系列】某乎x96参数与jsvmp初体验.md` | `8f5e2503c196d08f3e9e29dfae15c74f` | 2026-09-22 | ast-deobfuscation | evolve | x96 **12 位家族 opcode 位域**逐位实测值（`(opcode[pc] & 0xF000) >> 12` 定族；family 9 取 `4095>>10 / 1023>>8 / 1023 / 63`；family 10 取 `4095>>10 / 1023>>8 / 1023>>6`；family 14 取 `4095` 当函数下标）+ **独立 opstr 字符串表**（2 字节条数 + 2 字节/条 + 长度前缀表）；**三方案选型**（补环境 / 修改操作码 / 算法还原）；反编译器用 Babel 生成 AST 的骨架 |
| 207 | `52pojie-1631492-某音jsvmp下参数分析笔记.md` | `1ebfbb05e50e57b438db0138b0dac57e` | 2026-09-22 | ast-deobfuscation | evolve | 某音 **8 参数 VM 入口表**（字节码 / 函数基址 / 函数长度 / 本地变量 / 闭包变量 / 调用者 / 无意义 / 分支类型）⇒ 可做到**函数级按需反编译**（原文先拿基址 578 长度 71 的 `open` 试）；🔴 **自动生成的伪代码不可信**（原文自己说「逻辑上存在问题，代码并不可信」）——只能当辅助；同站多文件（`webmssdk.js` / `captcha.js`）**字节码魔数相同 ⇒ 一套解释器通吃** |
| 208 | `52pojie-1645300-某乎x96jsvmp算法还原新手初体验.md` | `0071310869b121b4194fc3960f93dd4f` | 2026-09-22 | ast-deobfuscation | evolve | x96 纯算的**已实测可复现形态**：倒着取明文、3 字符一组、`len%3` 补 `\u0000`、三条**随轮次回绕的常量表**（`A=[42,0,0,0]` 异或 / `B=[8,16,8,16]` 左移 / `C=[63,6,12,18]` 掩码与右移）、每轮出 4 字符；**64 元打乱字母表**（含 `_`/`-`，不是 base64）；本轮已把文章的输入/输出对做成 oracle 实跑通过（`jsvmp-oracles.js` A 段） |
| 209 | `52pojie-1686683-【JS逆向系列】某乎x96参数3.0版本与jsvmp进阶.md` | `150cef6d38cfe5843f369aa72cd683b4` | 2026-09-22 | ast-deobfuscation | evolve | **IR 优化五步的真实操作序列**（本批 `jsvmp-ir-optimize.js` 的来源）：去 try 反调试 → 删时间 case(300/360/368) → **全 case 下断点扫死 case**（23 个清单）→ `this.M[k]=v` 虚假指令表折叠（未出现的一律 null）→ `this.T ≡ case 号` 还原字面量 → `+=`/`-=` 归一到 `=` → 单前驱单后继块合并（352→300→368，改完**实跑结果一致**才算安全）；**3 字节家族**（`charCodeAt(0)<<16|…<<8|…` 条数 + 3 字节/条）与**链式异或字符串表解码**（`U=66` 回灌，`24 ^ byte ^ U`）；初始化段无时间/随机 ⇒ **可离线求真值** |
| 210 | `52pojie-1744197-【JS 逆向百例】某音 X-Bogus 逆向分析，JSVMP 纯算法还原.md` | `709e2b8ed6a7e32eda04e63d07aba85e` | 2026-09-22 | ast-deobfuscation + web-reverse-algorithm | evolve | X-Bogus **完整纯算**：28 字符 = 7 组 × 4 字符，掩码/移位 `16515072>>18 / 258048>>12 / 4032>>6 / 63` 四值可写死；乱码串 = `md5 → hex 转 Uint8Array → 再 md5 → 再转` + 时间戳/1000 + canvas 指纹，拼 19 元素 `p1` 后**按奇偶交错**成 `p2`，再经 **RC4 变体**（`_0x46fa4c`）打乱、前置 `\u0002` + `ÿ`（`_0x2b6720`）；**条件断点定位法**（结果串下一元素先是 null ⇒ 下一步就是生成点；三元组需再加限制条件收敛） |
| 211 | `52pojie-1865657-巨量算数response解密[jsvmp].md` | `ffeaf8393a71d1008cf83e5276251fb5` | 2026-09-22 | ast-deobfuscation | evolve | **「小 vmp」规模判据**：指令集很小但**执行量巨大**（原文「我的电脑跑崩了无数次」）⇒ 规模小 ≠ 好逆；调试要**主动清无用数据**。作为「按体量选路线」的反例入档 |
| 212 | `52pojie-1894606-某讯jsvmp还原.md` | `c346db03b89bd1b36d1629f173cc61af` | 2026-09-22 | ast-deobfuscation | evolve | **某讯 tencent_vm_chaos 脱壳器设计**：① 四件套输入（密文 / 起始 index / `SysObj` 原生对象表 / `name_array` 关键词数组），`name = name_array[x]; target = SysObj[name]` 把「五花八门的调用」统一成一类字节码；② **随机分段抗脱壳**（把多条 opcode 合并成 1 条新 opcode ⇒ 「程序 A 的脱壳器脱不了程序 B 的壳」，case 数 ≠ 语义 opcode 数 **不是 bug**）；③ `case_map` 必须**现解析 switch**，不能沿用上次；④ **短路还原的真实代价**：`a && b` 被拆成嵌套分支后两分支同一对后继，还原时要丢掉重复的花指令块，但**被合并的第二块若带副作用就改变语义** |
| 213 | `52pojie-1969992-某q音乐新版txjsvmp分析.md` | `bd45d9af55a86416b28f6a3acb659a64` | 2026-09-22 | ast-deobfuscation | evolve | 某 Q 音 sign 的**插桩日志视角**（交叉验证的第三极，奇数位被脱敏）：条件断点 + 日志采集的标准写法 `JSON.stringify(d, (k,v) => v === window || !v || v.length > 1000 ? undefined : v)`；结果四段拼接 `zzc + … + … + …` 与 `toLowerCase()`；**「检测环境较少就不讲补环境，直接扣算法」的选路记录** |
| 214 | `52pojie-1974900-某音新版jsvmp参数a_bogus分析.md` | `52b4c51bc31ecfbda4b97f85a556a964` | 2026-09-22 | ast-deobfuscation | evolve | 新版 `a_bogus`：**加密入口找不到 ⇒ 官方口径就是「暂且搁置、改走插桩」**；换到 `bdms_1.0.1.17.js`，加密在 `do-while` 里且**该 VM 内部也控制流平坦化** ⇒ **先解混淆再插桩**（原文「还原后非常清晰可观」）；插桩重点在 `T.apply(E, j)`；9 步加密流程概述（双重 SM3 / 轨迹转乱码 / 魔改 base64） |
| 215 | `52pojie-2042090-某q音乐jsvmp反编译.md` | `848a82c8e317b18e5abe2985699f2f4c` | 2026-09-22 | ast-deobfuscation + forum-corpus-archival | evolve | 🔧 **本文件本身是「部分乱码」事故**（正文被按 CP154 解码），本轮已就地修复（cyr 8277→3）；内容为**寄存器式 VM 完整反编译**：82 个 handler、8 个入口寄存器、`CreateVmFunction` 五参数（count/param_i/target/offset/length）与 `Object.defineProperty(fn,"length",…)` 必做动作；**IR 抽象类设计**（`IRInstruction` 基类 + 寄存器/立即数两类操作数）；**`PC += ++PC` 的语义陷阱**（`++pc` 在右值表达式里先自增 ⇒ 反汇编时必须按「先取自增值再加」还原）；`f_5329` 展开的 zzc sign（与 2079071/1969992/2096887 逐值一致）；🔴 该 IR 的 base64 字母表写作 `ABCDEDG…`（缺 `F`、`D` 重复）⇒ **单射性机械校验可独立证伪**；环境检测清单（window/document/navigator/location/history/screen + nodejs + Headless + 域名白名单 `qq.com/joox.com/tencentmusic.com/wavecommittee.com/kugou.com/kuwo.cn`） |
| 216 | `52pojie-2061802-千呼万唤始出来《WX小程序反编译教程》.md` | `0cf4d962f7f237c2a462f3c80d01111c` | 2026-09-22 | — | skip | **小程序反编译**（wxapkg 解包 + `wxappUnpacker`），属本技能库明确划出的边界外（`web-js-env-patcher` 明文排除小程序 ⇒ 与 B1-17 同口径）。仅记录两条环境事实以免重复调研：4.0+ 版小程序目录为 `C:\Users\<用户>\AppData\Roaming\Tencent\xwechat\radium\Applet`，旧版为 `WeChat Files\Applet`；主包/分包靠 `sub` 标识区分 |
| 217 | `52pojie-2076005-Python爬虫进阶：spiderdemo困难题JSVMP-T6题解.md` | `800c40d665960cead2300972f8d93f63` | 2026-09-22 | ast-deobfuscation | evolve | **插桩日志的「富矿」判据**：整个库对象会被打出来 ⇒ `{default_key_size:1024, default_public_exponent:"010001", key:{n:{…,t:37,s:0}, e:65537}}` 一眼定 RSA-1024，明文 = 时间戳 + 固定 salt 后 `btoa` 再 RSA；🔴 **一串「神秘整数」先判 limb 大整数再谈算法**（有 `t`/`s`、limb < 2³⁰ ⇒ jsbn 形式 bignum，还原后 1096 bit；`d/p/q` 全 null 是**库对象默认字段**而非「被擦的私钥」）；响应侧「数字按奇偶 -4/-2」的还原规律 |
| 218 | `52pojie-2086034-某讯jsvmp(二).md` | `a2d9a1534d5b16cd1b420abf4f41c9bc` | 2026-09-22 | ast-deobfuscation | evolve | 某讯滑块 `collect` 的**拼接形态**：结果 = **4 段**乱码串各自 `btoa` 后拼接再 `replace(/\+|\/|=/g,"")`，**顺序被打乱**；每段 = 明文每 4 位一组做 `charCodeAt` + 左移 + 或；**每段下面都直接打印了对应明文** ⇒ 「研究透一段，其余三段换明文即可」；🔴 **日志里存在故意误导的干扰项**（「生成结果值、未用到的值…都是干扰日志」）⇒ 判据是**对最终结果做数据流回溯**，圈外一律丢 |

### 本批次技能变更汇总（B13）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `ast-deobfuscation` | evolve（主） | 新增 `references/jsvmp-ir-and-optimization.md`（**「IR 优化 + CFG 回译」阶段唯一权威源**：五 pass 顺序与各自安全判据、两套 opcode 编码、三厂商语义骨架、常量取证、跨来源交叉验证、两套纯算形态、日志读数、反例黑名单、复跑）；补做 B13 遗留的 `scripts/jsvmp-ir-optimize.js` 接线；`SKILL.md` 新增脚本条目 + 导航 + 触发词（IR 优化 / 常量折叠 / 常量传播 / CFG 回译）；`references/jsvmp-dynamic-instrumentation.md` 新增 §4.4（**日志预算递进 1027→2216→3289**）/§4.5（**干扰日志的数据流回溯判据**）/§4.6（库对象富矿指针）；`scripts/crypto-signature-id.js` 新增 `analyzeBignum()` + 8 条断言（含「真哈希 IV 不得被判成 limb 大整数」反向断言） |
| `forum-corpus-archival` | evolve | 新增 `scripts/repair-encoding.py`（**「部分乱码」检测与修复**，50 项 `--selftest`：多码页自动判定 + **混表逐字符候选收敛** + **GB2312 越界率判优**（防静默错字）+ 中英混排拒绝执行 + 截断字节兜底 + 幂等）；`SKILL.md` 新增坑 30 |
| `stream-drm-reverse` | 附带修复 | `references/` 下 7 处失效跨技能引用（`../<skill>/` 从 `references/` 出发应退两级 `../../`）+ 1 处裸跨技能路径；`wsam-reverse/SKILL.md` 行尾统一 LF |

### 本批次的方法论增量（可复用）

1. **判「该不该新建技能」的第 5 条判据：看原文作者自己写的「下一步」**。
   `52pojie-2042090` 结尾原话是「下一步将继续学习中间代码优化相关知识，进行常量折叠、常量传播等优化，
   优化完毕后将控制流图转换成对应的 js 代码」—— 作者把**他知道但还没做的那一步**写出来了。
   这类句子是**最省力的缺口定位器**（比数 references 文件体量更早可判）。
2. **「反汇编产物里的常量」必须做机械校验，不能照抄**。实测某 IR 的 base64 字母表写作
   `ABCDEDGH…`（缺 `F`、`D` 出现在下标 3 与 5）。**两处独立来源一致也不能替代机械判据** ——
   这里靠的是「字母表必须单射」这一条数学约束：下标 3（`byte>>2==3`，如 `byte=12`）与
   下标 5（`byte=20`）都可达，同字符 ⇒ 服务端无法唯一解码 ⇒ 表必错。
   ⇒ **凡「字母表 / 映射表 / 置换表」类常量，先跑一次单射性检查。**
3. **「一串神秘整数」要先判 bignum limb，再谈算法**（本轮真实走过的弯路）：
   `{n:{0:192007799,…,36:34738}, t:37, s:0}` + 隔壁 `e:65537` 是 **jsbn 形式的 RSA 模数**
   （limb 基 2³⁰、低位在前，还原后 1096 bit），**不是**「魔改 MD5 的 T 表」。
   判据三条：有 `t`/`s`、所有 limb `< 2³⁰`、还原后 bit 长度落在 `30(t-1)..30t`；
   **反向断言**：真哈希 IV（MD5/SHA-256）的 limb ≥ 2³⁰ ⇒ 天然被排除。
4. **「往返自检」抓不到对称错误，「多路径产物对拍」可以**。`jsvmp-ir-optimize.js` 的
   `flat`（PC 逐块）与 `structured`（块合并 + 结构识别）是两条**完全不同的代码路径**，
   两者结果一致才算通过；另对每个优化步骤设**「真的做了优化」的下界断言**，
   否则「什么都没做」也会全绿（B8 / B11 教训的延续）。
5. **插桩日志的预算是递进的**：某 Q 音 sign 实测 `call` → 1027 条（衔接不上）→
   补运算 → 2216 条 → 补**索引取值** → 3289 条（清晰）。
   ⇒ **「日志衔接不上」通常不是理解问题，是桩打少了**；这一族大量靠索引查表，索引点不插桩日志永远是断的。
6. **日志里存在故意误导的干扰项**，但它是**可机械判定**的：
   对最终结果做一次数据流回溯，「生成过但没被后续用到」的值一律丢 —— 不要见运算就记。
7. **插桩日志常能整块捞出加密库对象**：`default_key_size` / `default_public_exponent` / `log`
   这类字段名一出现，就说明抓到了**整个库对象**，算法族、密钥材料、明文构造、盐往往直接可读，
   比逐层打运算日志快一个数量级（本轮 RSA 参数配方即由此直接定案）。
8. **语料缺陷可以是「无声的」**：`52pojie-2042090` 的文件统计（大小、行数、文件名、ID）
   全部正常，只有**打开正文**才发现整段是西里尔字母串。
   ⇒ 归档/抓取后必须跑一次 `repair-encoding.py --scan`；这类缺陷**不影响任何统计口径**。
   且修复时**不能用「整文件选一种编码」**（正常的中文头会被一起毁掉，且不报错），必须**逐行 + 逐字符判优**。
9. **「同一段乱码、两套码页都能编出合法 UTF-8」是真实存在的**：实测 `ptcp154` 优先会把
   cp1251 的事故解成 `倆析` / `帀傅`（合法、不报错、全错）。
   ⇒ **判优依据**：中文正文应落在常用字集里，用 **GB2312 越界字符数**当罚项。
   这条可平移到任何「多种解码都可能合法」的场景。
10. **半成品检查要扩到「跨轮」**：本轮开局发现**两轮**半成品（B12 缺 memory + B13 缺文档/接线/登记）。
    判据固化为四条：① 台账条数 vs `backup-<ts>/`；② `tools/` 里有没有 `append-b*-ledger.py`
    却没在台账里找到对应块；③ automation memory 末条是不是上一轮；
    ④ **新脚本声明的依赖文档是否存在**（`jsvmp-ir-optimize.js` 头部写了
    `references/jsvmp-ir-and-optimization.md`，而该文件当时不存在 —— 这条判据本轮新增）。
11. **修脚本时用「文件名 + 已有内容」锚定，不要用行号锚定**：本轮多支 judge 给的定位是行号，
    而文件在评审期间仍可能被改 ⇒ 落地前必须重新 grep 定位（行号会漂）。

### 台账维护（本轮一并修掉的既有缺陷，可追溯）

- 用新增的 `tools/verify-ledger-md5.py` 对**全量 218 条**逐条重算 md5，发现 **4 条录入错**
  （均在 B13 之前的批次，此前从未有脚本整份核过）：
  #25 `2112042`、#94 `2047827`、#168 `2027657` 是**末位抄错 1 个 hex**；
  #102 `2015243` **只有 31 位**。四个文件在工作区与 `HEAD` 一致（**未被改动**）⇒ 判定为录入错，
  已按实算值修正。**口径提醒**：台账头部写「哈希不匹配 ⇒ 视为新版本需重新评估」，
  哈希抄错会让这条规则**持续误报** —— 所以录入错必须修，不能当噪声。
- 修掉 B10 遗留的 **1 处 Markdown 表格断裂**（表头分隔行与首个数据行之间被插入空行，
  会让整张表退化成裸文本）。**该缺陷与 B13 本轮自己踩的是同一个坑**
  （`HEAD`/`FOOT` 多行字符串自带首尾换行，直接 `join` 就多出一个空行）
  ⇒ 已在 `tools/append-b13-ledger.py` 加**两条会失败的断言**兜住：
  「追加块必须是纯 CRLF」「表头分隔行之后必须紧跟数据行」。
- **台账口径**：全量 md5 一致 / 行号 `1..218` 连续 / 纯 CRLF（无裸 LF）/ 表格无断裂。
---

## 三·L、批次 B14 · 2026-09-22（流媒体 / 直播流：key 二次构造（W 族）+ 直播流捕获 / 播放器侧 / EME）

> ⚠️ **本节是「跨轮补救登记」**：B14（2026-09-22 15:21–15:46）的技能改动**已全部落盘**
> （`stream-drm-reverse`：新增 `references/key-wrapper-families.md`、`references/player-and-live-capture.md`、
> `scripts/key_wrapper.py`；改 `SKILL.md`、`hls-and-ts-structure.md`、`vendor-key-schemes.md`、`m3u8_probe.py`；
> `.agents` 已镜像），但**未登记台账、未写 automation memory**。
> 本轮（B15 开工前）先做闭环补救：重跑自检与对拍 → 机械校验 → 补登本节 21 条。
> 本节成员由「B14 交付物里可逐条回源复核的结论」反推，**逐篇 grep 字面量核对通过**
> （例：`1602878` 命中 `$0`/`wsSecret`/`wsTime`/`uuid`/`al.flv.huya`；`1688088` 命中 `AES-128-PES`/`AES-128-ECB`；
> `1833748` 命中 `Strdecode`/`appbgzjnopv1917`；`2021915` 命中 `TG:@XMFLV`/`signCoen`；
> `1943363` 命中 `MediaKeySession`/`addEventListener`/`requestMediaKeySystemAccess`）。

**取材口径**：**「m3u8 key 拿到的不是真 key」与「拿不到 / 抓不到流」两条线一次做全** ——
W 族五类 key 包装（重复 XOR 三段链 / 字符表滚动 + 噪声 / 定长正文 + hex 标记串 / 两半异或 / 字母表守卫）·
厂商扩展 METHOD（`AES-128-PES` / `AES-128-ECB` / `-CTR` / `-256` / `SM4-*` / `NONE`）·
播放器侧 MSE 源码注入与反录制（`<video>` vs `<canvas>`）· 移动端 UA 换发行版 ·
base64「基址」403 三步处置 · 接口层两种伪装 · EME/CDM 拦截与离线判 DRM 类型。

**选它的理由**：B11 起连续多轮把「流媒体剩余」列为待办，并注明
「`stream-drm-reverse` 自 B8 建库后**一次都没演化过** ⇒ 按 B7 判据值得优先」；
本轮开工前核对 `stream-drm-reverse/references/` 共 5 个文件、`scripts/` 6 个 ——
**缺的正是「key 拿到之后发现不是真 key」这一层**（W 族）与**「流根本没抓到」这一层**（播放器侧），
即 B7 判据的「技能名覆盖 ≠ 能力覆盖」。

**产出**：**无新建技能**（第 7 次确认不建 `captcha-flow-orchestration`），
演化既有技能 **1** 个（`stream-drm-reverse`，本批唯一），附带修复 **6** 项。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 219 | `52pojie-2061590-原创抖音网页版直播源FLV格式真实直播流web源码.md` | `cd89c5c786c9eb435bfff831e8708ad8` | 2026-09-22 | stream-drm-reverse | evolve | **FLV 与 m3u8 是两条不同的路**：FLV 没有「解分片」这一步，链路只有「URL 签名 → 拼参数 → 请求」；抖音网页版直播在**移动端页面源码**里直接给 FLV 直链（PC 端走签名接口）⇒ 入 `player-and-live-capture.md` §1 的「先判流对象是 m3u8 还是 flv」判据 |
| 220 | `52pojie-1888176-某平台m3u8视频js获取解密key过程分析.md` | `fc5fd8fdd54a73e8a843f23f0de27a32` | 2026-09-22 | stream-drm-reverse | evolve | **key URI 自带业务参数**的形态：`#EXT-X-KEY:METHOD=AES-128,URI="…/api/…?vod_id=…&app_id=…"`——直接访问该 URI 会失败，因为参数要由播放器补齐（与 §4.2 某鹅通 `uid` 同族） |
| 221 | `52pojie-1833748-某e通的m3u8文件解密.md` | `cf9208bcd40489c167db3988e366a041` | 2026-09-22 | stream-drm-reverse | evolve | **W2 字符表滚动族（xiaoe 式）唯一全码来源**：`e=hexMD5(salt)`（hex 字符串再参与 md5）/ `n=+t.substr(-3)[1]` 噪声间隔 / `s=表.indexOf(t[0])` / `c=hexMD5(e+t[0]).substr(s%8, s%8+7)`（**第二参数是长度 ⇒ 窗口长度 (s%8)+7 ∈ [7,14]**）/ 正文去首 1 去末 3 / `l=a[t[h]]-f-c[f++]; while(l<0) l+=65`（**模 65 不是 64**）；本族已用**文章原样 JS 当 oracle 与 Python 实现逐字节对拍 160/160** |
| 222 | `52pojie-1749546-中岩培训 某讯云 m3u8二次加密key分析.md` | `56235e4085d5f2670ff0524b8e665361` | 2026-09-22 | stream-drm-reverse | evolve | **「下载器提示 key 错误」= 拿到的是包装后 key** 的第二条独立来源（某讯云）：断点栈里能看到真 `key` / `iv` ⇒ 与 1734656 / 1635800 互证「长度不是 16 位 ⇒ 先怀疑包装层」 |
| 223 | `52pojie-1734656-破解某动漫m3u8加密.md` | `23d6c09cbc6a5aee0d4b5c8736ec43a2` | 2026-09-22 | stream-drm-reverse | evolve | **「返回的 `k` 不是 16 位」这一判据的最早实例**（2023-01）：`#EXT-X-KEY` 的 `URI` 是自定义格式（请求参数 `lt` 即 m3u8 里的 URI）；`k` 每次变但 m3u8 一直不变 ⇒ 包装是**会话相关**而不是内容相关；主 m3u8 里多档清晰度**只差一个参数**（对应 §7「不要一次性抓所有分辨率」） |
| 224 | `52pojie-1689801-某鹅通m3u8视频JS获取解密Key的过程分析.md` | `f87201c3ee9a751668769b4486cdbc54` | 2026-09-22 | stream-drm-reverse | evolve | **§4.2「key 接口少一个参数」的原始案例**：JS 请求时在 URL 后追加 `&uid=<页面浮动的用户ID>`；全局搜接口路径片段（`material-center…get`）定位拼 URL 的那一行，`window.USERID` 直接控制台打印；该站同时把真 key 做成**二次加密** ⇒ 是「接口层 + W 包装层」叠在一起的典型 |
| 225 | `52pojie-1688088-修改hls.js增加播放某CTO视频的方法.md` | `0647dd9960814e412045ed7005c0cade` | 2026-09-22 | stream-drm-reverse | evolve | **厂商扩展 METHOD 的实测来源**（某 CTO 阿里云播放器 m3u8 样本）：`METHOD=AES-128-PES`（只加密 **PES 载荷**，TS 包头/PES 头保持明文）与 `METHOD=AES-128-ECB`（**ECB 无 IV**，套 CBC 会静默解错）⇒ 落地为 `m3u8_probe.py` 的 `VENDOR_METHODS` 表（6 种：PES / ECB / AES-256 / CTR / SM4-CBC / SM4-ECB）+ 7 条新自检；改播放器（hls.js）本身也是这一族的一条路线 |
| 226 | `52pojie-1679546-可批量爬取某影视工厂 m3u8 文件.md` | `2e3616d499e0528a0a966b93f93a1084` | 2026-09-22 | stream-drm-reverse | evolve | **批量场景下的时效坑**：m3u8 地址带时效，下载器多线程跑几集后报「m3u8 文件失效」⇒ 必须**边取边下 / 每次重新获取列表**（对应 §7「把取 key → 解密 → 重封装串成一次执行」） |
| 227 | `52pojie-1635800-某医学网站的加密M3U8分析.md` | `1331a6c0c843ae849ec8580f21870229` | 2026-09-22 | stream-drm-reverse | evolve | **m3u8 三要素齐全的形态**：同一份列表里同时给出 `IV` + key 地址 + **key 二次加密方式（AES-128）**；key 地址直接访问无效 ⇒ 走 JS 断点取真 key（`2e4b4c125bd9b3c7034b8a6f700e6688`，恰 16 字节 = 真 key） |
| 228 | `52pojie-1624279-逆向某个vip视频解析,获取m3u8播放源,纯技术分享、研究.md` | `4797fb2a4ef3c99aede08bc749aa4166` | 2026-09-22 | stream-drm-reverse | evolve | **W1 重复密钥 XOR 三段链的实测来源**：`strdecode(a, token)` = `b64( xor( b64(明文), token ) )`，`token = md5(md5(格式化时间戳/1000 + key))`（32 位 hex 当字节用）；**少做/多做一次 base64 都得到「看着像乱码的合法字节」而不报错** ⇒ `key_wrapper.py` 成对提供 encode/decode + 反向断言（已与文章原样 JS 对拍 12/12） |
| 229 | `52pojie-1495421-以 aqistudy 为例的无限 debugger 反调试绕过演示（附视频）.md` | `700c9468023adc0fc67a496895827081` | 2026-09-22 | stream-drm-reverse | evolve | **无限 debugger 反调试的处置**：与 `web-reverse-algorithm/references/07-antidebug-and-live-patching.md` 同源，本批作为「播放器页面本身带反调试」的交叉指针入档（SKILL.md 资源段已指向该文件） |
| 230 | `52pojie-1362235-短视频去水印接口源码分析（今日头条第一弹）.md` | `7a18af43edf5786348993ce0d9b558f6` | 2026-09-22 | stream-drm-reverse | evolve | **D 接口层「与媒体流无关的密文」形态**：去水印接口返回加密串，属 `media_crypto.py` 的处置范围（SKILL.md 分层表 D 层），不要与 A/C 层混做 |
| 231 | `52pojie-1122675-[web]分析调试某qiyi直播源【未完成】.md` | `a36facaffd8b2e3d495abecbff67096c` | 2026-09-22 | stream-drm-reverse | evolve | **私有 scheme 实测案例**：PC 端抓到的是 `hcdnlive://…`，**不能直接下载**；移动端下发 `formatType=TS` 的 `hlslive…m3u8` ⇒ 入 `player-and-live-capture.md` §3（换发行版）与 §6（`blob:` / 私有 scheme 处置） |
| 232 | `52pojie-1056116-网易CC直播源抓取分析过程.md` | `b75a83a958cfdbc716bc8b71ba96ec3f` | 2026-09-22 | stream-drm-reverse | evolve | **直播源抓取的「页面源码直给」形态**（网易 CC）：与 864112 / 2061590 互证 「移动端页面源码里的 `liveLineUrl` / `streams[]` / `playUrl` 常是 base64 ⇒ 解出来就是地址」 |
| 233 | `52pojie-1602878-某牙直播flv地址解密.md` | `be7b6bc136eb79a2606cbc498928f702` | 2026-09-22 | stream-drm-reverse | evolve | **§3.1「base64 解出的地址 403 ⇒ 那是基址不是最终地址」的唯一权威来源**：地址里含 `$0 $1 $2 $3` 占位符；`wsSecret` / `wsTime` **先对不变的参数串求 md5** 再与 `uid`/`uuid`/`seqid` 拼进模板；`uuid` 动态派生（`Date.now()%1e10*1e3 + Math.random()*1e3`）但**同一场直播内可复用**；最后一步是**改域名与后缀**（`al.flv.huya.com`、`.m3u8 → .flv`） |
| 234 | `52pojie-2021915-【js逆向】虾m视频真实地址.md` | `74f01a07722216f04b9bed673e2adee5` | 2026-09-22 | stream-drm-reverse | evolve | **W3 定长正文 + hex 标记串族的全码来源**（含评论区完整复现）：`hex( 13 位随机数 + "TG:@XMFLV" + urlencode([首字符][定长正文]) + 13 位随机数 )`；窗口长度是**常量 7**（与 W2 的 `(s%8)+7` 不同）、取模 **64**（表 65 元含 `=`）、正文**硬编码 60** ⇒ 明文恰好 45 字节；🔴 两处录入错：`secret_key` 解出 `TG:XMFLV`（少 `@`）、字符表 `…789-=+` **缺 `/` 多 `-`** ⇒ 落地为 `key_wrapper.py` 的「矛盾直打」+ 单射/覆盖性守卫（已与文章原样 JS 对拍 30/30） |
| 235 | `52pojie-1943363-WEB前端逆向获取EME解密密钥.md` | `bf56aacdad56617f774cd0449ba7a2a0` | 2026-09-22 | stream-drm-reverse | evolve | **§5 EME / CDM 拦截打法**：拦 `MediaKeySession.prototype.addEventListener`，命中 `"message"` 时**上一层栈帧**里就有 `o.keys`（最终密钥）；另两个落点 `navigator.requestMediaKeySystemAccess`（拿 KID / key system）与 `MediaKeys.createSession`；油猴脚本要补 `toString` 防检测；**判 DRM 类型可离线**：`strings|grep Handler` / `exiftool -HandlerDescription` / `ffprobe … handler_name`（§5.2） |
| 236 | `52pojie-1752497-某音平台某浪新版key解密 play_licenses.md` | `c6e0691c7b181285ae3d3bb721b46fb2` | 2026-09-22 | stream-drm-reverse | evolve | **§5.1「拦 `atob` 拿密钥」什么时候会断**的原始案例（`play_licenses` 响应里是 base64 ⇒ 拦 `atob` 命中）：三种失效情况 —— ① JS 用**自实现 base64**（拦 `atob` 零命中）② 响应是 **hex/字节流十六进制** ③ 混淆到**搜不到特征字符串** ⇒ 一律换「拦 EME API + 栈帧回溯」 |
| 237 | `52pojie-971265-解密m3u8文件, ts文件解密, hls 解密.md` | `65e5baf957ec5816eb17ed21a7a6a611` | 2026-09-22 | stream-drm-reverse | evolve | **HLS/m3u8 + TS 解密的经典形态**（2019 老帖，60902 查看）：`#EXT-X-KEY` 语义 + ts 逐片解密的基础链路 ⇒ 作为 `hls-and-ts-structure.md` 的 A 层基线来源 |
| 238 | `52pojie-864112-【Fiddler为所欲为第四篇】直播源抓取与接口分析.md` | `729eb3dcc1c6375de78be05d6511a68c` | 2026-09-22 | stream-drm-reverse | evolve | **直播源抓取的「接口 + 播放列表」两步法**（2019 老帖）：先抓下发列表的接口，再取 m3u8；入 `player-and-live-capture.md` §1 的三条入口路线之一 |
| 239 | `52pojie-1616797-爬虫之巧用BurpSuite获取m3u8视频真实mp4地址.md` | `aad0375e22cf7b134c8a8c97640036d0` | 2026-09-22 | stream-drm-reverse | evolve | **抓包工具视角的 m3u8 → 真实媒体地址**：与 864112 / 971265 互证「先判层再动手」，并给出「同一份列表里的 `#EXT-X-STREAM-INF` 多档」的处置（§7 逐档取） |

### 本批次技能变更汇总（B14）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `stream-drm-reverse` | evolve（唯一） | 新增 `references/key-wrapper-families.md`（**key 二次构造 / 包装层 W 族唯一权威源**：五族总表 30 秒分流、W1 三段链、W2 xiaoe 全码 + **噪声字符三侧宽容度矩阵**、W3 定长正文 + hex 标记串（与 W2 的 4 处关键差异对照表）、W5 字母表守卫四条判据、§7「不报错但结果错」坑表、复跑命令）；新增 `references/player-and-live-capture.md`（**直播流捕获 / 播放器侧 / 反录制唯一权威源**：三条入口路线选路判据、MSE 源码注入四处落点与 `Uint8Array` 落盘陷阱、**反录制判据（`<video>`+MSE 可 dump vs `<canvas>` 自渲染失效 + wasm 体积猛增 / YUV 两个确证特征）**、移动端 UA 换发行版三例、**base64「基址」403 三步处置**、接口层两种伪装、EME/CDM 拦截与 §5.1「拦 `atob` 会断」三情况、§5.2 离线判 DRM、`blob:` / 私有 scheme 处置、§7 坑表）；新增 `scripts/key_wrapper.py`（**51 项 `--selftest`**：`alpha-check` 覆盖性 + 单射性 + 越界下标、`noise-check` 三侧宽容度矩阵、`xiaoe`/`xm` 两族正反双向、`xor`/`xor-halves`；所有静默路径一律**报错退出**）；`SKILL.md` 新增 W 层分层行 + **CHECKPOINT「key 是不是 16 字节」**（插在动手解分片之前）+ 5 条失败模式 + 5 条反例 + 命令段 + 资源段两条；`hls-and-ts-structure.md` 补「先做长度检查再往下读」指针 + 排错表 3 行；`vendor-key-schemes.md` 补 W 层判据 2 行 + 坑表 4 行 + 资源指针；`scripts/m3u8_probe.py` 新增 **PLAIN 层**（`METHOD=NONE` 单独出现不是「有加密」）+ **6 种厂商扩展 METHOD** + `vendor_method` 回填，自检 22 → **35 项** |

### 本批次的方法论增量（可复用）

1. **「长度就是判据」**：AES-128 的真 key **一定有且只有 16 字节** ⇒ 拿到的值长度不是 16，
   **100% 还有一层包装**，不要先去怀疑算法或 IV。这条判据**单向成立**
   （反过来「拿到 16 字节」**不能**推出「没有包装层」—— W 族的产物也可能是 16 字节）。
   本批 3 个独立来源（`1602878` 之外的 `1734656` / `1635800` / `1749546`）都在正文里写了同一现象。
2. **「三侧宽容度矩阵」是不可移植行为，必须实测**：同一份 JS 里 `u += 噪声` 依赖 `atob` 忽略非法字符，
   但 Python / Node / 浏览器对同一字符可分别为「忽略 / 静默改字节 / 抛错」。
   **三侧都忽略的字符只有 ASCII 空白**；`n == 0` 的样本永远暴露不出这个问题
   ⇒ 「原文代码能跑通」**不能**作为「噪声字符选得对」的证据。
3. **凡「字母表 / 映射表 / 置换表」类常量，先跑单射性 + 覆盖性检查**（B13 教训的第二次应验）：
   本轮实测字符表 `…789-=+` **缺 `/` 多 `-`**（与编码侧标准 `btoa` 不配套 ⇒ `indexOf` 返回 -1、
   `% 64` 落到一个看似合法的下标、**产物是错的不报错**）。数学约束强于「两篇文章都这么写」。
4. **`substr(x, y)` 的第二参数是「长度」不是「终点」**：误按 `substring` 语义实现，
   窗口长度会从「随首字符变化」变成常量，且**错位后解出的仍是一串合法 base64 字符**（静默）。
   ⇒ 自检里必须逐项核对 8 个 `s % 8` 的窗口长度。
5. **「403 不是被封，是拿到的不是最终地址」**：处置顺序固定为
   「解 base64 → 找 `$0..$3` 占位符 → 找 `md5(拼接串)` 的盐 → 补动态参数 → 改域名/后缀」。
   这条把「换 IP / 换 UA / 重抓包」这类无效劳动一次性砍掉。
6. **看 DOM 而不是看代码判「MSE 注入会不会失效」**：容器里是 `<video>` ⇒ 能 dump 明文分片；
   是 `<canvas>` ⇒ 一定失效（多路 canvas 叠加时连「删水印的那一路」都不存在）。
   两个**确证特征**（用来确证而不是猜）：wasm 体积突然猛增（内封装了解码库）+ JS 层出现 YUV 原始流。
7. **`METHOD=NONE` 是 HLS 标准值**：整份列表全是 `NONE` ⇒ 是 **PLAIN**（这份列表本身没加密），
   不是「未知 METHOD」。旧版 `m3u8_probe.py` 把它归进「非标准值 ⇒ A?」，会让「整份列表都不加密」被报成「有加密」。
8. **文档里的「断言数」一律不手抄**：本批 `m3u8_probe.py` 自检 22 → 35 项，
   文档里统一写「**以实跑输出为准**」（B8 教训复用）。

### 本轮（B15 开工前）对 B14 的闭环补救与验收

| 动作 | 结果 |
| --- | --- |
| `key_wrapper.py --selftest` | ✓ **PASS 51 / 51** |
| `m3u8_probe.py --selftest` | ✓ **35 项，失败 0 项** |
| `b14-run-20260922-1521/crosscheck.js`（文章原样 JS vs Python 逐字节对拍） | ✓ W2 `160/160` · W3 `30/30` · W1 `12/12` · W5 `3/3` ⇒ **三族 + 守卫全部逐字节一致** |
| `check_skill_integrity.js --root . --markdown` | ✓ **阻断 0 · 告警 0**（修复前为 5 阻断 + 1 告警，见下） |
| `.claude` ↔ `.agents` 镜像 | ✓ 逐字节一致 |
| 台账登记 | ✓ 本节 21 条（#219–#239） |

**本轮修掉的 3 类既有缺陷（可追溯）**：

1. **校验器不认识「`## §N` 形式的标题」**（B14 引入的标题风格）⇒ 5 条正确指针被误报成
   「目标文件没有该小节标题」（`player-and-live-capture.md` §2/§5、`key-wrapper-families.md` §2）。
   已改 `check_skill_integrity.js`：章节存在性正则与重复检测正则都**允许可选 `§` 前缀**
   （`^#{2,4}\s*§?\s*<n>`）。**这是校验器的能力缺口，不是文档缺陷** —— 若照报错去改文档，
   会把「`## §2` 这种与指针 `§2` 一致的排版」改成不一致的形式。
2. **`forum-corpus-archival/SKILL.md` 行尾混用**（351 CRLF + 33 LF）⇒ 已统一为纯 LF 并重新镜像。
3. **B14 未登记台账 / 未写 memory** ⇒ 本节 + automation memory 条目补齐。

> 口径提醒（沿用 B13）：**报告与台账本身也是产物**，本轮对 B14 的验收全部**实跑**，
> 不采信「B14 自己写的说明」。

### 本批次明确留白（写进文档而非假装支持）

1. **W4「两半异或」没有实测来源**：族表里保留（结构签名清晰、`key_wrapper.py xor-halves` 已实现并自检），
   但**本批 21 篇里没有一篇给出现成样本** ⇒ 标注为「结构已知、样本待补」。
2. **W5 字母表守卫只覆盖「自定义 base64 表」**：非 base64 类映射表（如整体替换表）仍需人工判。
3. **反录制的工程解法只到「改走 wasm 取证」**：canvas 路线的完整自动 dump 未实现（依赖 wasm 内存取证，见 B12）。
4. **§4.1「裂图」伪装只有判据没有可执行件**：需先按文本读、再交 `media_crypto.py`，中间没有专用解析器。

### 下一批（B15）取材建议（承接本节）

- 待处理 **457** 篇（台账 239 条后）。优先级：
  ① **签名 / 协议参数系（最大簇）**：与 `protocol-reverse` / `web-reverse-algorithm` 合并评估；
  ② **验证码图像识别系剩余**：真拼图 / 双缺口 / 旋转系的**协议侧**仍薄；
  ③ **WAF 剩余**：加速乐 / `acw_sc__v2` / Cloudflare / Akamai / Reese84 的收尾量级；
  ④ **`web-reverse-env` 等长期零演化的技能**：按 B7 判据先数 `references/` 文件体量再定批次。
- 候选新技能 `captcha-flow-orchestration` —— B5–B14 **八次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
---

## 三·M、批次 B15 · 2026-09-22（登录 / 账号体系：提交参数判族与复算）

> ⚠️ **本节是「跨轮补救登记」**：B15（2026-09-22 17:33–17:47）的技能改动**已落盘**
> （`web-reverse-algorithm`：新增 `references/12-login-and-account-params.md`、
> `scripts/login_param_probe.py`；改 `SKILL.md`、`02-algorithm-families.md`、
> `07-antidebug-and-live-patching.md`、`09-antidebug-and-automation-fingerprint.md`；
> `b15-run-20260922-1733/` 内有 3 个 JS oracle 与 DES 向量），
> 但**未登记台账、未写 automation memory、未镜像到 `.agents`**。
> 本轮（B16 开工前）先做闭环补救：① 与并行的「`proxycli` → `browsercli` 改名线」做**非破坏性并集镜像**；
> ② 重跑自检与本批 oracle；③ **逐篇 grep 字面量回源复核**（`tools/b15-verify-sources.py`，21/21 命中，
> 含 2 处因大小写/写法导致的假阴性被回源纠正：`1111948` 用 `key_to_encode` 而非 `publickey`、
> `1627217` 原文小写 `referer`）；④ 补登本节 21 条。

**取材口径**：**一条完整链路一次做全** —— 登录 / 注册 / 改密 / 单点登录（CAS / WebVPN）这条链路上
「**服务器下发什么** → **密码用什么族加密** → **提交的是哪个字段** → **怎么复算并验收**」四件事，
覆盖：服务器下发字段清单（页面内 / 前置接口两类）· 密码加密族判据表（MD5 链四形态 / base64 / AES / DES / RSA /
AES+RSA 混合）· 提交形态两段式（明文框 + 隐藏字段）· 会话与前置（Cookie / `execution` / `csrf` 绑定）·
扣 JS 的四处固定修改 · webpack 单文件两种打法 · 签名类 `md5(pathname+query+body)` 与百分号白名单。

**选它的理由**：B14 的「下一批建议」把「**签名 / 协议参数系（最大簇）**」列为优先级 ①，
而「登录提交参数」是其中**判据最集中、返工最贵**的一段；开工前核对
`web-reverse-algorithm/references/`（11 个文件）确认**没有任何一个文件讲「提交参数的判族」**——
`07-antidebug-and-live-patching.md` §6 只讲通用的「固定 / 上次返回 / JS 计算」三分类，
**登录专有的三件事（服务器下发字段清单 / 密码加密族判据表 / 提交形态）在库里是空白**，
即 B7 判据的「技能名覆盖 ≠ 能力覆盖」。

**产出**：**无新建技能**（第 8 次确认不建 `captcha-flow-orchestration`），
演化既有技能 **1** 个（`web-reverse-algorithm`）；
本轮收尾另做**镜像合流**（10 个技能，见下）与**附带修复 5 项**。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 240 | `52pojie-1108756-逆向分析青果教务系统的登录接口.md` | `37fa4c567b553cc9e3c391c28fa070bd` | 2026-09-22 | web-reverse-algorithm | evolve | **「盐在中间」的 MD5 链 + 本仓库首例 DES**：`hex_md5(hex_md5(password) + hex_md5(randnumber.toLowerCase()))`；同一站另一处是 `b64_encode(des_encode(params))` ⇒ 落地为 `md5-chain --preset pwd-then-salt` 与 `login_param_probe.py des`（默认解密；DES 期望值走 `node --openssl-legacy-provider` 独立实现） |
| 241 | `52pojie-1111948-JS逆向 房天下登录RSA.md` | `afc8f1d204040620bef0e9cc53e8eff1` | 2026-09-22 | web-reverse-algorithm | evolve | **「公钥硬编码在页面」形态的第一条实例**：全局搜 `key_to_encode` 直接复制；技术栈是 `RSA.min.js`（与 JSEncrypt 同族的另一份实现）⇒ §4.4「公钥从哪来」三分类之① |
| 242 | `52pojie-1217367-强智科技教务系统python爬虫模拟登录分析(湖南).md` | `b0a41cfe5049c534458d42bedc9d4407` | 2026-09-22 | web-reverse-algorithm | evolve | **「盐由前置接口下发、按 `#` 分割」+ 两段式提交**：登录前有一次独立请求返回带 `#` 的串；提交用 `encoded` 隐藏字段；第一次 GET 的 Cookie 必须保存并携带 ⇒ §1 表第 2 行 / §5 / §6 |
| 243 | `52pojie-1266540-超星学习通登入密码加密算法逆向.md` | `8c24e4f1aabb3d9792a5c0152080f3f9` | 2026-09-22 | web-reverse-algorithm | evolve | **base64 只当外层编码 + jQuery 插件式自实现的处置**：`$.base64.btoa(pwd,"UTF-8")`；扣 JS 要删文件首末行、把 `$.base64 = ` 挂载写法改写成普通调用 ⇒ §4.1 与 §7 第 3 行 |
| 244 | `52pojie-1316664-记一次猫眼电影登录POST参数分析.md` | `c96952c4768227cb9dddecb8e95e4280` | 2026-09-22 | web-reverse-algorithm | evolve | **风控字段不是加密**：`h5Fingerprint = utility.getH5fingerprint(window.location.origin + url)` —— 入参就是 POST 的完整 URL，换 URL 就得重算，但不需要「理解」它；另证 `uuid` / `token_id` **就在登录页 HTML 里**（去掉 cookie 单独 GET 再搜）⇒ §1.1 第 2 条 / §11 |
| 245 | `52pojie-1353766-记XX大学身份认证管理平台密码加密解密流程.md` | `b29123be19954810bcd51c76f85de206` | 2026-09-22 | web-reverse-algorithm | evolve | **CAS 系的 AES 链路与两段式落点**：盐读自 HTML 隐藏字段 `pwdDefaultEncryptSalt` → `_etd2(password, salt)` → 加密结果写进 `#passwordEnc`（明文框不提交）⇒ §4.2 第 2 行 / §6 |
| 246 | `52pojie-1421183-解析某网络教学平台登录时的明文加密方法并使用python实现代码复现.md` | `d0e8eccfd594568e69ac771011f417c8` | 2026-09-22 | web-reverse-algorithm | evolve | **`encoded` 隐藏字段两段式的第二条独立来源**（与 1217367 互证「提交的不是你看到的那个字段」），并给出「先复现再提交」的闭环顺序 ⇒ §6 / §11 第 3 条 |
| 247 | `52pojie-1522743-Python自学记录--steam密码加密逆向.md` | `1c404aafcb04653b2f5fcf3183f1ec33` | 2026-09-22 | web-reverse-algorithm | evolve | **steam 式：公钥由前置接口下发 `publickey_mod` / `publickey_exp`** ⇒ `rsa-pubkey --match-mod --match-exp` 逐值对拍（对拍不过 exit 1）；也是「抓包只抓登录那一个包不够」的实例 ⇒ §1 表第 2 行 / §4.4 / §5.3 |
| 248 | `52pojie-1607798-某网站登录参数加密js逆向.md` | `b6c1e10eb501fd7dc2e892bacac2bbf8` | 2026-09-22 | web-reverse-algorithm | evolve | **「少什么补什么」的抠 JS 节奏**：`o(r(e))` 这类链式调用一次抠不干净，必须「跑一次 → 补一个 → 再跑」（反例：一次抠完会陷在报错里定位不到符号）⇒ §7 第 4 行 |
| 249 | `52pojie-1626143-【JS逆向学习实践】某招标网站登录X-Sign逆向.md` | `7d72eb721a47773d5c6cd222ea0815c3` | 2026-09-22 | web-reverse-algorithm | evolve | **签名类最稳的一种 + 百分号白名单还原**：`md5(url.pathname + query + body)` 三段顺序不可换；`URLSearchParams` 会把 `,` `:` `(` `)` 编码，JS 侧做了一次白名单还原 ⇒ Python 必须显式 `unquote`（`quote(safe=",:()")`）且 `json.dumps(separators=(',',':'))`；多个登录入口可能共用同一套签名 ⇒ §9 |
| 250 | `52pojie-1627217-某贷登录加密破解思路及加密源码.md` | `c1d340f586f8f4be5449151ab59ae7a4` | 2026-09-22 | web-reverse-algorithm | evolve | **公钥地址藏在另一个请求的 body 里**：公钥地址在 `ajax.post` 的 `t.data` 中，请求那个地址能拿到公钥，但**必须带登录页的 referer**（原文小写「referer」）⇒ §4.4 第 3 行 |
| 251 | `52pojie-1723994-【JS逆向】某习通登录密码逆向.md` | `c1503664cb90dbfddac6d2f32d5498be` | 2026-09-22 | web-reverse-algorithm | evolve | **AES-CBC 且 key = iv = 固定串**（`u2oh6Vu^HWe4_AES`，16 字符）；更关键的是「**base64 解出来是乱码**」这条判据 —— 作者一开始以为解错，实际内层是 AES-CBC 密文⇒ §2 表「解出来是乱码」行 / §4.2 第 1 行 |
| 252 | `52pojie-1743808-某登录表单参数逆向分析.md` | `b08a404cb558d17960f8cff9e043c1c5` | 2026-09-22 | web-reverse-algorithm | evolve | **`Sign = md5(<某个参数>)` 的定位法**：先 `initiator` 下断点 → **堆栈回溯**找变量来源；判据是「断点那一层 scope 里没有目标参数 ⇒ 往上一层层跟」；另一个坑是抠出来的 `r` 本身是字符串（控制台打印后直接写死）⇒ §7 第 4 行 / §9 第二类 |
| 253 | `52pojie-1783614-今天分享一下某Bo的登录参数超简单获取方法.md` | `f21be0b44ab1e8bcd35cea47a9956200` | 2026-09-22 | web-reverse-algorithm | evolve | **webpack 单文件「外部拿不到局部变量」的注入打法**：用 DevTools `Overrides` / 替换 JS 在源码里加一行把函数挂到 `window`（原文 `window.weiboLX = makeRequest`），刷新后从控制台调用；⚠️ 该站 **JS 文件每小时重命名一次** ⇒ 注入突然失效时先看文件名变没变 ⇒ §8 第 1 行 |
| 254 | `52pojie-1815692-某卢小说网站登录密码逆向.md` | `ae9c231743f180b87a773471a2a6c15f` | 2026-09-22 | web-reverse-algorithm | evolve | **手写 MD5 的字节口径（本批最贵的一个坑）**：`x[i>>2] |= (str.charCodeAt(i) & 0xff) << …` 是 **latin-1 截断**，与 `CryptoJS.MD5` 的 UTF-8 口径**对含非 ASCII 的密码会算出不同结果**，而纯 ASCII 样本永远暴露不出来；另点出扣代码必须保留 `chrsz=8` / `hexcase=0` 两个常量；嵌套 `hex_md5(A + hex_md5(B + pwd + ts))` 链 ⇒ §3.2 / §3.3 / §3.4（自检含区分性断言） |
| 255 | `52pojie-1861004-某科网登录模块RSA加密分析.md` | `5d3d5fe92694f4be0fa187514f1f0963` | 2026-09-22 | web-reverse-algorithm | evolve | **「js 加密函数每次刷新都不一样」的原始案例** ⇒ 必须「先请求页面拿函数与密钥，再算」，不能把函数硬编码进脚本 ⇒ §4.4 第 2 行（与 §1 表第 2 行同源） |
| 256 | `52pojie-1904594-某二手房网站登录密码加密分析.md` | `d45d5a58bd9e8fe40278ef929982c486` | 2026-09-22 | web-reverse-algorithm | evolve | **webpack 单文件的第二条打法：遍历导出表找下标**：用替换 JS 拿到导出对象后遍历，实测解密函数在**下标 62**；然后**把加载器一起搬出来**在外部执行 + 补环境 ⇒ §8 第 2 行 |
| 257 | `52pojie-1980542-某校WebVPN登录接口分析.md` | `ce0d0fcc16f5da86b160e819818a4aae` | 2026-09-22 | web-reverse-algorithm | evolve | **CAS 的 `execution` 来自 `bridgeData`**，且**必须与本次会话的 Cookie 配套**（拿 A 会话的 token 配 B 会话的 cookie 一定失败）⇒ §5 第 2 条 / §10「盐/公钥是上一次刷新的」行 |
| 258 | `52pojie-1991268-【JS逆向】某手机厂商登录逆向分析.md` | `8b06783532df479b8ff062fbd8c19093` | 2026-09-22 | web-reverse-algorithm | evolve | **AES + RSA 混合（两段等长 base64）**：`encData` = AES(明文, **随机 key**)、`encKey` = 非对称封装该 key；key = 16 位随机 hex、iv = 固定 `16-Bytes--String` ⇒ 处置顺序「先解 `encKey` 再解 `encData`」⇒ §2 表混合行 / §4.2 第 3 行（与 `08-mixed-crypto-segmentation.md` 对接） |
| 259 | `52pojie-2063774-某店登录用户名与密码参数补环境.md` | `ee3446d2b68d41e6050debbd62ab1921` | 2026-09-22 | web-reverse-algorithm | evolve | **「抓两次包」这条判据的实测来源**：`credentials.username` 与 `credentials.password` 的**长度与内容都会变** ⇒ 直接判出 RSA，不必先读 JS ⇒ §0 第 1 步（本族最省力的一步）；同时是「必须与接口下发的 mod/exp 对拍」的实例 ⇒ §4.4 第 3 行 |
| 260 | `52pojie-536217-简单分析下吾爱POST登录MD5密码加密找法.md` | `00dcf7d9bc61a9b89f747b0771a7d06c` | 2026-09-22 | web-reverse-algorithm | evolve | **扣 JS 的两处固定修改**：函数一进去就 `return`（有「密码为空直接返回」的短路分支 ⇒ 删第一个 `if`）、满屏 `arguments` 报错（⇒ 改成显式形参）；另证 `formhash` 在登录页源码里、只有 password 一个字段会变 ⇒ §7 第 1/2 行 / §1 表第 1 行 / §3.1 |

### 本批次技能变更汇总（B15）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-reverse-algorithm` | evolve（唯一） | 新增 `references/12-login-and-account-params.md`（**登录 / 账号体系提交参数的唯一权威源**：§0 五步工作流（第 1 步「抓两次包」一刀砍掉对称/非对称分岔）、§1 服务器下发字段清单（页面内 / 前置接口两类 + §1.1 三条易错点）、§2 密码加密族 30 秒分流表（按**密文形态**判族，含「解出来是乱码 ⇒ 内层是分组密码」这条关键分岔）、§3 MD5 族四形态 + **`charCodeAt & 0xff` 与 `CryptoJS.MD5` 是两个口径**、§4 base64/AES/DES/RSA（AES 的三种 key/iv 来源、DES 三档填充、RSA 三条必查）、§5 会话与前置三件事、§6 提交形态两段式、§7 扣 JS 四处固定修改、§8 webpack 单文件两种打法、§9 签名类 `md5(pathname+query+body)`、§10「不报错但结果错」坑表 10 行、§11 反例 9 条、§12 复跑命令、§13 边界）；新增 `scripts/login_param_probe.py`（**零依赖，`--selftest` 57 项全绿**：`classify`（密文形态 → 加密族）/ `b64-probe`（内层是文本 / gzip / 分组密码密文）/ `md5-chain`（四种实测链 + `--encoding latin1\|utf8` 区分性断言）/ `rsa-pubkey`（纯 Python 解析 PEM / JSEncrypt base64 / 裸 DER，可与 `publickey_mod` / `publickey_exp` **逐值对拍**，不过即 exit 1）/ `des`（**本仓库此前没有 DES**，纯 Python DES/3DES ECB+CBC，默认解密、`--encrypt` 反向）；期望值来自三条**独立**来源：RFC 1321 / 文章原样 JS 实跑 / OpenSSL（`node --openssl-legacy-provider`））；`SKILL.md` 新增「登录 / 账号体系」分节（适用信号 5 条 + 四条一句话判据）+ 12-login 与 login_param_probe 两条资源导航 + description 触发词（登录密码加密 / 单点登录 / CAS / WebVPN / `publickey_mod` / DES / `encoded` 隐藏字段）；`02-algorithm-families.md` 补「登录参数不在此展开」的指针；`07-antidebug-and-live-patching.md` 补「登录体系另有专有清单」的上游指针 |
| 全库（10 个技能） | mirror-merge（本轮收尾） | **非破坏性并集**（详见下节）：`ast-deobfuscation`、`code-analysis`、`protocol-reverse`、`target-analysis`、`web-reverse-env`、`web-verify-patcher`、`websocket-reverse`、`wsam-reverse` 取并行改名线的新版；`web-reverse-algorithm` 的 `02` / `07` 取 B15 版；`web-reverse-algorithm` 的 `SKILL.md` 与 `09` 因**两侧各有真实新增**做人工并集（登录分节 + RPC 免扣分节；两套反例清单合为 14 条） |

### 本批次的方法论增量（可复用）

1. **「抓两次包」是登录族最高杠杆的一步**：只比对「哪些字段变了」，就能一刀砍掉
   「密码到底是不是对称加密」这个最大的分岔 —— **长度也变 ⇒ 非对称（RSA）**，只有值变 ⇒ 对称/哈希。
   把它放在工作流第 1 步（先于读任何 JS），是本族省时间最多的一条（`2063774` 实测）。
2. **「服务器下发字段」是这一族最大的一笔浪费**：`formhash` / `csrf` / `execution` / `token_id` /
   `uuid` / `lt` / `pwdDefaultEncryptSalt` **都在登录页 HTML 或前置接口里**，**不要去算**。
   处置顺序固定为「去掉 cookie 单独 GET 一次登录页 → 正则/XPath 抠 → 前置接口的 XHR 全留着」。
3. **「解出来是乱码」本身是判据，不是「我解错了」**（`1723994` 的原始心态）：
   base64 解出乱码且长度是 16 的倍数 ⇒ 内层是分组密码密文。`classify` 直接把这条判据打出来。
4. **字节口径是「静默错」的重灾区**：同一个非 ASCII 密码，`charCodeAt & 0xff`（latin-1 截断）与
   `CryptoJS.MD5`（UTF-8）算出**完全不同的哈希**，而**纯 ASCII 样本永远暴露不出来**；
   同一页面里两个库混用是实测存在的 ⇒ ①复算必须提供 `--encoding` 双口径；②自检里必须有
   **区分性断言**（两种口径结果必须不同），否则实现会把口径写死还全绿。
5. **「提交的可能不是你看到的那个字段」**：明文输入框 + 隐藏字段（`encoded` / `passwordEnc`）两段式极常见，
   「逆对了但服务端不认」多半栽在这里 ⇒ 验收必须比**提交字段名**与输入框 `name`，而不是只看密文算得对不对。
6. **会话配套是硬约束**：`execution` / `csrf` / `formhash` / 盐 / 公钥都必须与**本次会话**配套，
   拿 A 会话的 token 配 B 会话的 cookie 一定失败 ⇒ 用会话对象而不是每步新建客户端。
7. **RSA 的验收口径不是「密文相等」**：每次加密结果都不同（随机填充）⇒
   唯一验收是「**服务端能解密 / 真的登录成功**」；能机械对拍的是**公钥**（与接口下发的 mod/exp 逐值比），
   拿错公钥还在算是最隐蔽的错。
8. **签名类必查「百分号白名单」**：`URLSearchParams` 会把 `,` `:` `(` `)` 编码，JS 侧往往做了一次还原 ⇒
   Python 侧必须显式 `unquote`（`quote(safe=",:()")`）+ `json.dumps(separators=(',',':'))`，
   否则签名**永远不匹配**且不报错。
9. **扣 JS 不要一次抠完**：这一族的调用链深（`1815692` 的 md5 套了 6~7 层），
   「跑一次 → 补一个 → 再跑」比「一次抠全」快得多，且每次都能定位到具体缺哪个符号（`1607798`）。

### 本轮（B16 开工前）对 B15 的闭环补救与验收

| 动作 | 结果 |
| --- | --- |
| `login_param_probe.py --selftest` | ✓ **PASS 57 / 57** |
| `b15-verify-sources.py`（逐篇 grep 字面量回源） | ✓ **21/21 命中**（2 处假阴性经回源纠正：`key_to_encode` / 小写 `referer`） |
| 镜像并集（`mirror-merge.py` + `b15-manual-union.py`） | ✓ 10 个技能合流；`web-reverse-hook` 整技能补齐；`.claude` ↔ `.agents` **逐字节一致** |
| `check_skill_integrity.js --root . --markdown` | ✓ **阻断 0 · 告警 0**（修复前 8 阻断 + 4 告警，见下） |
| 台账登记 | ✓ 本节 21 条（#240–#260） |

**本轮修掉的 5 项既有缺陷（可追溯）**：

1. **镜像大面积失同步**：B15 未镜像，且**同时存在另一条并行改动线**把
   `proxycli` 全库改名为 `browsercli` 并新增 JSFuck / Sojson / Wasm2JS / 浏览器 RPC 桥接 / SPA 路由 / Hook 脚本
   —— 两条线**各写一侧镜像**，导致 23 个文件内容分歧、10 个文件单侧存在。
   处置：写 `tools/mirror-merge.py`（**非破坏性并集**：单侧文件互补复制，双侧差异按
   决策表取新版，两侧都有真实新增的走人工并集）+ `tools/mirror-verify.py`（合并后逐行校验「没有丢掉任何一侧的非空行」）。
   **教训：镜像同步不能默认「单向 rm -rf + cp -r」**——当仓库存在并行改动线时，那会静默删掉对方的新增。
2. **校验器的镜像判定在 `core.autocrlf=true` 下必然假红**：`.agents` 是 git 跟踪目录，
   checkout 后工作区是 CRLF，而 `.claude` 被 `.gitignore` 忽略、保持 LF。
   已改 `check_skill_integrity.js`：**内容判等先归一化 CRLF→LF**（仍为 block），
   仅行尾漂移降级为 warn 并打印两侧 CRLF 计数。
3. **`web-reverse-env/references/03-special-cases.md` 章节号重复**：并行线插入新 §6/§7/§8 后
   未重编号，出现两组 7/8/9（`tools/fix-special-cases-numbering.py` 已改为 1..12 连续并镜像）。
4. **`login_param_probe.py` 里的裸跨技能引用**：docstring 写
   `` `stream-drm-reverse/references/key-wrapper-families.md` `` 缺 `../` 前缀（B13 新增的
   「裸跨技能路径」规则抓到）⇒ 改为 `../../stream-drm-reverse/…`。
5. **B15 自身的三处未闭环**：未登记台账、未写 automation memory、未镜像 ⇒ 本节 + memory 条目 + 镜像补齐。

> 口径提醒（沿用 B13/B14）：**报告与台账本身也是产物**；本轮对 B15 的验收全部**实跑**，
> 不采信「B15 自己写的说明」；本批 21 条文章全部做过 **grep 字面量回源**。

### 本批次明确留白（写进文档而非假装支持）

1. **`login_param_probe.py` 不实现 AES / SM4**：显式改走相邻技能
   `stream-drm-reverse/scripts/media_crypto.py`，避免第四处重复实现（库内已有三处分组密码实现）。
2. **不实现 SM2 / 国密摘要**：本批 21 篇里没有需要 SM2 的样本，硬写一个没人验证的实现比不给更危险。
3. **`--verify` 只做「密文逐字节对拍」**：RSA 的随机填充无法对拍 ⇒ 文档明确写「RSA 的验收只能是服务端认」，
   但**没有可执行的真登录闭环脚本**（需要真实账号与授权）。
4. **webpack 单文件的两种打法只有文字流程**：`§8` 的「遍历导出表找下标」与「搬加载器」没有可执行脚本
   （相邻技能 `webpack-bundle-extraction` 承担这一层，本技能只保留判据与指针）。

### 下一批（B16）取材建议（承接本节）

- 待处理 **496** 篇（台账 260 条后；语料目录在这两轮里被并行线大幅新增）。
- 优先级：
  ① **签名 / 协议参数系剩余（最大簇）**：登录以外的 header / cookie / 接口签名与 API 协议，
     与 `protocol-reverse` / `web-reverse-algorithm` 合并评估；
  ② **验证码图像识别系剩余**：真拼图 / 双缺口 / 旋转系的**协议侧**仍薄；
  ③ **WAF 剩余**：加速乐 / `acw_sc__v2` / Cloudflare / Akamai / Reese84 的收尾量级；
  ④ 长期零演化技能：按 B7 判据先数 `references/` 体量再定批次
     （本批实测 `web-reverse-env` 已被并行线更新，不再是空洞）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B15 **九次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
---

## 三·N、批次 B16 · 2026-09-22（某验 / 极验全家桶：初代 → 二代 → 三代 → 四代 + 点选 + 五子棋 + 无感 + 深知 V2）

**取材口径**：**单一厂商的全代际 + 全题型一次做全** ——
初代（= 二代离线模式，**没有 `w`，只有本地算的 `validate`**）· 二代在线（多一次业务接口往返）·
三代（七步链路 + 三个 `w` + 52 片底图 + 轨迹 `aa`）· 四代（两接口 + `pow_detail` + 动态键值对）·
点选四子类 · 消消乐 / 五子棋 · 一键通过（无感 `ai`）· 深知 V2 业务风控。

**选它的理由**（B3 的「同厂商全代际可互相交叉验证」经验第三次复用）：
① B3 建过 `references/geetest-protocol-matrix.md`，但**这一族的专栏文章在库里积压了 15 篇**，
属于「技能名覆盖、能力没覆盖」的典型；
② 同一厂商的多篇文章可以**逐值互证**：本批用 1749808 与 B3 的 52 片几何**逐元素对上**（源 312×160 / stride 12 /
左偏移 1 / 260×160），用 1749803 + 1749808 + 1779592 **三处独立来源**对上 `rp` 公式与错误码文案；
③ 交叉验证直接**推翻了两条旧结论**（见下），这是单篇文章做不到的。

**产出**：**无新建技能**（第 9 次确认不建 `captcha-flow-orchestration`；本族信息全部落在
`web-verify-patcher` 的既有文件里，符合「避免滥建冗余技能」的判据），演化既有技能 **1** 个，附带修复 **2** 项。

**本批最重要的两条「改写级」结论（都是旧文档写错、照做必失败）**：

1. **§8.1 的 PoW 判据被推翻**：旧文写「`pow_sign = SHA256(pow_msg)`，判定用
   `int(pow_sign, 16) < 2 ** (256 - bits)`」。实测（`52pojie-1779592` 的原文 JS 逐行）：
   **哈希函数由 `load` 的 `pow_detail.hashfunc` 决定**（`md5` / `sha1` / `sha256` 三条分支），
   难度判据是「**前导零 `bits//4` 位 + 第 `bits//4` 位 hex ≤ 7/3/1**」。
   用 256 去套 md5（128 位）/ sha1（160 位）**永远不会成立**；且照抄官方 demo 的 md5 写法在别的站点失败，
   **症状是 `param decrypt error`**（看着像 `w` 算错了，实际是 PoW 没解出来）。
2. **无感模式要发两个 `w`**（`52pojie-1770958`）：三代 `get.php` 的 `w` **必须带** ——
   不带也能拿到 `s`，但那是**假值**，最终必挂，且**没有任何报错指向它**。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 261 | `52pojie-1749799-【验证码逆向专栏】某验“初代”滑块验证码逆向分析.md` | `8465e144959ca41181cb75c480111612` | 2026-09-22 | web-verify-patcher | evolve | **「初代」（实为二代离线模式）判据**：脚本是 `geetest.0.0.0.js` + `offline.*.0.js`，**全流程没有 `get.php` / `ajax.php`**，图片路径由本地 JS（两段 MD5）生成；`validate` 由**本地**算：`A(距离, challenge) + "_" + A(b("rand0", ts), challenge) + "_" + A(b("rand1", ts), challenge)`；**轨迹被采集但不校验**；图片乱序还原与三代同源但**图宽不同** ⇒ 落地为 §零.1「初代 / 二代（在线 / 离线）判据」 |
| 262 | `52pojie-1749803-【验证码逆向专栏】某验二代滑块验证码逆向分析.md` | `a8631f16901a61e854f941f6b1bd3f66` | 2026-09-22 | web-verify-patcher | evolve | **二代在线链路 = 「再回一次业务接口」**：`netWebServlet.json` → `get.php`（返回**新 challenge** + 乱序图 + `c`/`s`）→ `ajax.php`（`w` + 返 `validate`）→ **再回 `netWebServlet.json`** 带新 challenge + `validate` 拿业务字段；`H7z` = RSA(随机串)、`userresponse` 是「距离 + challenge」生成的 9 位串、`rp = md5(gt + challenge.slice(0,32) + passtime)`；并示范「控制流平坦化用 AST 还原后再读」 ⇒ §零.1 / §十八 |
| 263 | `52pojie-1749808-【验证码逆向专栏】某验三代滑块验证码逆向分析.md` | `084476a57959df7b13369fffb02468b2` | 2026-09-22 | web-verify-patcher | evolve | **v3 全链路的第二份独立实证（与 B3 的矩阵互证）**：`register-slide → gettype → get.php(w可空) → ajax.php(w可空) → get.php(出新 challenge + `c`/`s`) → ajax.php(真 w) → 业务接口`；`w = h + u`（`u` = RSA(16 位随机串)、`h` = 编码(AES(stringify(o), 同一随机串))，**iv 是字符串 `"0000000000000000"`**）；`aa = getAA(轨迹, c数组, s串)`；**52 片底图几何与 B3 的 `--model gt3` 逐值一致**（源 312×160、stride 12、左偏移 1、每块 10×80 → 260×160，Ut 数组 52 项）——**两处独立来源互证**；附 4 类错误码与 100 次 95% 成功率 |
| 264 | `52pojie-1749842-【验证码逆向专栏】某验四代滑块验证码逆向分析.md` | `f6c8f06fa5fe1866c07b8884bcb5a12c` | 2026-09-22 | web-verify-patcher | evolve | **v4 两接口的字段级实证**：`load` 返回 `bg`（**未混淆**）/`captcha_type`/`gct_path`/`lot_number`/`payload`/`datetime`/`process_token`/`slice`；`verify` 提交 `captcha_id/client_type/lot_number/risk_type/payload/`process_token/w/callback`；**`userresponse = setLeft / 1.0059466666666665 + 2`（定值常量）**；**`device_id = MD5(canvas.toDataURL().replace("data:image/png;base64,",""))`**；`w = ArrayToHex(AES(e, 同一16位随机串)) + RSA(同一16位随机串)`；`kqg5` 为 gct 生成的动态键值对 ⇒ §十七 / §十六 / §8.1 |
| 265 | `52pojie-1758943-【验证码逆向专栏】某验三代、四代点选类验证码逆向分析.md` | `a8a479d5e2ffac08cb8fee6663177b2a` | 2026-09-22 | web-verify-patcher | evolve | **点选类的四代同构关系**：三代 `register-click-official` → `get.php`（**w 可置空**）→ 两次 `ajax.php`（第一次只返类型但**不请求会报错**）；四代 `load` 的 `captcha_type` 直接给 `word`，`ques` = 各文字图链接；关键结论：**三代图标 / 语序只差 `a` 的写法；四代图标 / 语序 / 九宫格只差 `userresponse` 的写法**，其余逻辑完全一致 ⇒ §十七 题型写法表 |
| 266 | `52pojie-1758969-【验证码逆向专栏】某验四代五子棋、消消乐验证码逆向分析.md` | `ad7af90b9ae7263247685b114fce26be` | 2026-09-22 | web-verify-patcher | evolve | **消消乐 / 五子棋的题型判据与坐标语义**：`risk_type` = `match`（消消乐）/ `winlinze`（五子棋）；`load` 返回 `ques`（消消乐 **3×3**、五子棋 **5×5**，`0` 是空位）；`userresponse` = **要交换的两个坐标**（如 `[[0,1],[0,0]]`）；🔴 **`ques[0]/ques[1]/ques[2]` 对应第 0/1/2 列而不是行** —— 按行理解会整体转置、症状与「交换错了」相同；verify 额外带 `payload_protocol=1` / `pt=1`；坐标判对后**成功率 100%** ⇒ §十七 |
| 267 | `52pojie-1770958-【验证码逆向专栏】某验三代、四代一键通过模式逆向分析.md` | `8dbc0d55ebba0d1607670477ec46ae53` | 2026-09-22 | web-verify-patcher | evolve | **无感（一键通过）模式要发两个 `w`**：三代 `get.php` 的 `w` **必须带**（不带也能拿到 `s`，但那是**假值**，最终必挂且无任何报错指向它），且两次 `w` 生成方式**不同** —— 第二个 `w` 是「浏览器环境值（`ep.ven`/`ep.ren` 显卡、`ep.fp`/`ep.lp` 鼠标位置、`ep.tm`）+ `captcha_token` 拼成大字符串再 AES」；实测样例里环境值置空也能过，但**不能默认所有站点都能置空** ⇒ §十五 |
| 268 | `52pojie-1773476-【验证码逆向专栏】某验深知 V2 业务风控逆向分析.md` | `e99b9d8d4ac4f39c7a09d3f8b0007791` | 2026-09-22 | web-verify-patcher | evolve | **另一条产品线：深知 V2（业务风控，不是验证码）**：`v2.sense.js`（带 `id` = 请求里的 `app_id`）+ `gettype`（返回 `gct.js` 路径）+ `judge`（提交**无键名的超长 `Request Payload`**，通过后返回 `session_id`）+ 业务接口（带 `session_id`）；**无键名 ⇒ 全局搜关键字失效**，只能跟栈（`sense.*.js` 里 `e + h[...]` 拼接点）或直接下 XHR 断点；payload 由 `h`（环境）+ `e`（业务）两段加一个 `{olbo:"…"}` 动态键值对组成 ⇒ §二十 |
| 269 | `52pojie-1779592-【验证码逆向专栏】某验全家桶细节避坑总结.md` | `921bc0717fb923633148d280c29d3d7a` | 2026-09-22 | web-verify-patcher | evolve | **本批价值最高的一篇（PoW 真算法 + 报错码字典 + 时序要求）**：①**PoW 不是恒定 SHA256** —— 哈希由 `pow_detail.hashfunc` 决定（md5/sha1/sha256），难度判据是「前导零 `bits//4` 位 + 第 `bits//4` 位 hex ≤ 7/3/1」（**修正了本文档 §8.1 原先「`pow_sign = SHA256(pow_msg)` + `int(sign,16) < 2**(256-bits)`」的错误结论**）；② `16 位随机串` 在同一流程里必须**两次一致**（二/三代 `error_03`、四代 `-50002`）；③ `passtime` 滑块必须取轨迹末项时间（否则 `forbidden`），非滑块写随机；④ **流程太快会失败**：三代点选报 `success` 壳里的 `msg:["duration short"]`；⑤ 动态键值对由 gct.js 生成并给出一段可复用的「正则取方法名 + 注入 `window.gct=` 后调用」导出法；⑥ 补环境两件（`crypto.getRandomValues` 的 65536 上限与 Uint16/32 边界、`performance.timing` 20 字段单调递增）⇒ §8.1 / §十五 / §十六 / §十八 / §十九，并落地为 `scripts/geetest_pow.py`（41 项自检） |
| 270 | `52pojie-1631496-某验四代滑块参数学习.md` | `7012d43620a7ca0558092844440d428e` | 2026-09-22 | web-verify-patcher | evolve | **v4 的 `w` 明文里轨迹是明文**（作者原话「滑块的轨迹居然是明文，感觉还不如三代」）：`w = bytes_tohex(AES) + RSA`，AES key = 16 位随机串、iv = `0000000000000000`；**RSA 公钥与三代同一把**（`n` 以 `00C1E393…` 开头、`e = 010001`）；`e` 里还有 `setleft` / `track` / `passtime` / **动态参数 `svze`**（另一个 js 返回）/ `em`（鼠标操作判定）；100 次实测 89 次成功 ⇒ §十七 / §8.1 |
| 271 | `52pojie-2017394-【JS逆向】某验三代点选逆向分析.md` | `35922eb6dfa7538aa388cd52d9f7eeef` | 2026-09-22 | web-verify-patcher | evolve | **2025 年的 v3 点选现役样本**（跨 4 年版本回归）：`gettype.php` 链路与 `w` 生成方式**与 2023 年文章一致**，`o` 里仍是 `h9s9` / `rp` / `tt` 三个需要逆的字段 ⇒ 证明「v3 的字段级结论**没有随 SDK 版本漂移**」，可作为 §8.2 / §十六 的「老结论仍然有效」的回归证据 |
| 272 | `52pojie-1476911-某验滑块图片还原.md` | `db153ae04aece981e6ed463f1a10129e` | 2026-09-22 | web-verify-patcher | evolve | **底图还原的「纯 JS canvas 不可行、必须用 Python/离屏画布」结论**：52 份、每份 **10×80**、顺序表固定（**除非版本更新**）；作者实测「尽量不改原代码、纯 JS canvas 还原」一下午失败，最终改 Python ⇒ 与 §三 的「用 `restore_slices.py --model gt3` 离线还原」同源，并补充「顺序表是版本相关常量」这一口径 |
| 273 | `52pojie-1479607-某验滑块加密分析(上).md` | `39d3ce9947a2650688d00ad48ed0245d` | 2026-09-22 | web-verify-patcher | evolve | **扣 RSA 闭包的工程技巧（2021 年的老样本，仍是同一把公钥）**：`new Q()[...](...)` 是闭包内的 RSA 类，**在脚本开头 `var testRSA;` 再在类定义后 `testRSA = Q;`** 即可从外部 `new testRSA().encrypt(ue)`；并给出「扣出来的代码带 DOM/window 依赖 ⇒ 只能在浏览器跑，要在 Node 跑必须删代码」的边界；同时重申「扣 JS 能不改就别改」⇒ §8.1 的 RSA 段与 `webpack-bundle-extraction` 的注入打法同源 |
| 274 | `52pojie-1486705-某验滑块加密分析下.md` | `8d1bcd6b95ca277d62ae4af7c322e9de` | 2026-09-22 | web-verify-patcher | evolve | **v3 `aa` 与 `rp` 的实测参数**：`aa = slideGj["nStF"](t, [12,58,98,36,43,95,62,15,12], "696a3356")` （**轨迹串 + 9 项系数数组 + 6 位字符种子**三件套，与 §四 的 `getAA` 结构一致）；`rp = MD5(gt + challenge[0:32] + passtime)`；`userresponse = U(距离, challenge)` ⇒ §四 / §十八 |
| 275 | `52pojie-1756692-【验证码逆向专栏】某片滑块、点选验证码逆向分析.md` | `1694a5c7544698d6f482aca5a8a5bc91` | 2026-09-22 | web-verify-patcher | evolve | **「双接口 + 定值 APP_ID」的非极验同类形态（某片）**：图片接口 `cb`/`i`/`k`/`captchaId`（刷新时多带上次的 `token`）→ 滑块返 `bg`/`front`，点选返 `captchaImage`/`wordsImage`，都返 `token`；验证接口 `cb`/`i`/`k`/`token`/`captchaId`；**滑块与点选各有一个写死的 `captchaId`**、`cb`/`i`/`k` 由 `r`/`a.i`/`a.k` 拼 ⇒ 作为 §十七 题型表与「先分清图片接口 / 验证接口」的对照样本（避免把极验的两接口模型套到别家） |

### 本批次技能变更汇总（B16）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-verify-patcher` | evolve（唯一） | `references/geetest-protocol-matrix.md`：新增 **§零.1 初代 / 二代（在线 / 离线）判据**（离线形态没有 `w`、`validate` 是本地三段式、轨迹采集但不校验）；**重写 §8.1 PoW**（三种哈希 + `bits` 完整判据 + 两处旧错误结论的更正说明 + 脚本入口）；§十四 排错清单补 4 行；新增 **§十五 无感的两个 `w`**、**§十六 动态键值对与 gct 动态导出**（`h9s9`/`kqg5`/`f019`/`l0zs`/`xnbw`/`olbo` 的出处与「与 §五 的代码签名机制是同一件事的两面」口径）、**§十七 题型 → `userresponse` 写法表**（9 种题型 + 消消乐 `ques` 按列 + 滑块 `1.0059466666666665` 常数 + 各题型成功率）、**§十八 报错码 → 根因速查**（8 行，含「三代/四代失败信息有三种壳」的读法）、**§十九 补环境两件**、**§二十 深知 V2 的无键名 payload 定位法**、**§二十一 复跑命令**（26.1 KB → 38.2 KB）；新增 `scripts/geetest_pow.py`（**零依赖，`--selftest` 41 项全绿**：`solve` / `check` / `--from-load`，覆盖 md5·sha1·sha256 三条分支、全部 `bits % 4` 分支、拒绝路径与确定性回归）；`references/provider-execution-notes.md` 极验小节：常见类型补 `game-challenge`/`one-click`/`pow-challenge`、代际判据补初代与二代离线、「三条最容易忽略」补第 4 条（PoW）、协议细节指针补新章节；`references/captcha-types.md`：`pow-challenge` 补极验 v4 的 PoW 实例（含「不是整数比较」的判据）、`game-challenge` 补消消乐/五子棋实例（含 `ques` 按列）；`SKILL.md` 极验路由行扩写（覆盖全代际 + 无感 + PoW + 报错码表 + 新脚本） |

### 本批次的方法论增量（可复用）

1. **「同厂商全代际」是最高杠杆的取材方式（第三次验证）**：本批靠**逐值互证**得到 2 条改写级结论、
   并证伪 2 条旧判据。做法固定为：**先把待处理文章按「同一对象的同一参数」分组，再逐元素对照**，
   对上的写进 `--selftest`，对不上的回源再判。
2. **「哈希函数不是常量」这类错误必须靠「换站点」才能暴露**：PoW 的 `hashfunc` 在官方 demo 上恒为 md5，
   **只在别的站点才出现 sha1/sha256** ⇒ 凡是「从官方 demo 学来的写法」，都要问一句
   「这个值在别的站点会不会变」，变了就必须从响应里动态读。
3. **「静默失败」要单独建表，不要混进排错清单**：本批新立的 §十八 把 8 种返回分成
   **三种壳**（`status:error` / `success:0` / `success:true` 内嵌 `result:fail`）——
   只断言外层 `status` 会把「成功了但没通过」读成通过。判据：**先读壳，再读 code**。
4. **「没有报错指向它」的坑优先记**：无感模式 `get.php` 漏带 `w` 的唯一症状是「最终失败」，
   而报错码与「`w` 全错」完全相同 ⇒ 这类坑必须在文档里给出**检查顺序**（先查随机串是否同一个 → 再查 PoW → 再查无感 `w`）。
5. **文档里的「顺序语义」要写清是行还是列**：消消乐 `ques` 是**按列**给的，
   按行理解会整体转置，而**症状与「交换错了」完全相同**（永远 `fail`）——
   这类「语义维度」错误比算法错误更难发现，必须在题型表里显式标注。
6. **旧文档里的「数字结论」要能用脚本复算**：本批把 PoW 判据从「文档断言」变成
   **可执行 + 41 项自检**（含三条哈希、全部 `bits%4` 分支、以及「错的必须被拒绝」的反向断言）。
   判据：**凡是「照做会算错」的结论，都要配一条会失败的断言**，不能只写在文档里。

### 本批次明确留白（写进文档而非假装支持）

1. **`geetest_pow.py` 不做「网络重试 / 换题」编排**：它只解 PoW 与校验 PoW，
   失败换题（`pt=1`）仍由调用方按 §十八 处置。
2. **无感模式的「环境串构造」只有结构说明，没有生成器**：`ep.ven/ren/fp/lp/tm` 的取值口径已写明
   （实测可置空但不保证所有站点），未实现「按真实浏览器样本回放」的脚本
   （那一层归 `web-js-env-patcher`）。
3. **深知 V2 只有定位方法论**：无键名 payload 的字段级还原未落成脚本（本批只有 1 篇来源）。
4. **消消乐 / 五子棋只到「坐标怎么算」**：棋盘求解（凑 3 连 / 5 连的搜索）未实现
   （属图像/算法线，可归 `captcha-model-training.md`）。

### 下一批（B17）取材建议（承接本节）

- 待处理 **460** 篇（台账 275 条后）。
- 优先级：
  ① **验证码图像识别系剩余（仍有 ~85 篇）**：真拼图 / 双缺口 / 旋转系的**协议侧**仍薄
     （本批只覆盖极验一家的题型语义，别家厂商的题型表仍缺）；
  ② **签名 / 协议参数系剩余（最大簇）**：与 `protocol-reverse` / `web-reverse-algorithm` 合并评估；
  ③ **WAF 剩余**：加速乐 / `acw_sc__v2` / Cloudflare / Akamai / Reese84 的收尾量级；
  ④ 本批出现的**非极验同类样本**（如 1756692 某片、1995970 雷池 WAF 滑块、2042898 某天御滑块）
     可聚成「非极验滑块厂商对照表」，验证「极验的两接口模型不能套到别家」。
- 候选新技能 `captcha-flow-orchestration` —— B5–B16 **十次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

---

## 三·O、批次 B17 · 2026-09-22（成熟平台签名参数蓝图库落地：`reverse-knowledge`）

**取材口径**：单一能力族「成熟平台签名 / 加密参数」一次做全 —— 抖音/头条 `a_bogus`、京东 `h5st`（含第 8 段环境段
与 `request_algo` token）、知乎 `x-zse-96` / `__zse_ck`、小红书 `x-s`、B 站 `w_rid`、美团 `mtgsig`、
BOSS `__zp_stoken__`、淘宝 `isg`/`cna`、网易云 `weapi`、QQ 音乐 `sign`、酷狗 `signature`、百度翻译 `sign`、
同花顺 `hexin-v`、得物 `sign`、拉勾 `X-S-HEADER`、拼多多、CSDN `x-ca-signature`、问卷星、12306、羊了个羊。

**选它的理由（本批开局的发现）**：`reverse-knowledge` 的 `description` 声称提供「京东 h5st、抖音 a_bogus、快手 falcon」
的**算法蓝图库**，但 `scripts/query-blueprint.js` 指向的 `docs/knowledge/parameter-blueprints` **从未被创建**
（`git log --all -- docs/knowledge` 为空），且 `REPO_ROOT` 少算一级（`../../../` 从 `scripts/` 只到 `.claude/`）——
`--list` 必然 `ENOENT` 崩溃。这是 B13 闭环判据 ④「脚本声明的依赖是否存在」的**教科书式命中**：
**技能名覆盖、能力完全没覆盖**。同族待处理文章 175 篇（签名/参数类），远超建新技能的阈值。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取知识点 |
| --- | --- | --- | --- | --- | --- | --- |
| 276 | `2088330-douyin-ab-params.md` | `f58ed208759266fbb7c9b2a2230c20ac` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`douyin-a-bogus` |
| 277 | `2092635-h5st-ai-env-patching.md` | `04d1a1774b9d289f4f544e40a47a1407` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`jd-env-params`、`jd-h5st`、`jd-request-algo-token` |
| 278 | `2092806-douyin-a_bogus-50bytes.md` | `44fae2623df3eb8e36a7e19507cfdc75` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`douyin-a-bogus`；a_bogus 50 位数组全解 + 自定义 base64 表 + 魔改 RC4 + 尾部盐 `dhzx` |
| 279 | `52pojie-1269855-01-酷狗音乐搜索下载js解密附Python源码.md` | `ee3310e1afc26f1cd143269be52f127f` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`kugou-signature` |
| 280 | `52pojie-1271541-02-网易云音乐加密分析.md` | `74ad820a5b43ed72ca490a7b4ce4d787` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`netease-weapi` |
| 281 | `52pojie-1291943-关于CSDN获取博客内容接口的x-ca-signature签名算法研究.md` | `38ca6257feb21ca75f2a60e79ac389bb` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`csdn-x-ca-signature`；`query[:-1]` 裁末字符 + 3 个空行语义 + `x-ca-key` 双处出现 |
| 282 | `52pojie-1474990-python爬虫-最新破解百度翻译sign值.md` | `1911121691cb804b09d019edb19f6dbe` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`baidu-fanyi-sign` |
| 283 | `52pojie-1511380-CSDN爬虫signature加密算法破解.md` | `47012a79b70b1fdcbadbadb928633f96` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`csdn-x-ca-signature` |
| 284 | `52pojie-1625463-问卷星(答题)协议全参数分析.md` | `dffc5465fc3914be5f391a7083401e7d` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`wenjuanxing-params`；`abcdx()` 反调试门禁 + ktimes 作 XOR 密钥 |
| 285 | `52pojie-1631378-某乎x-zse-96签名算法python重写.md` | `399290df734584fc59c50494e14ec7db` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`zhihu-x-zse-96` |
| 286 | `52pojie-1669042-京东试用h5st参数.md` | `03928fe301246163acdfd0cac8d438ed` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`jd-env-params`、`jd-h5st`、`jd-request-algo-token`；h5st 8 段结构 + 环境变量白名单 + 远程 token |
| 287 | `52pojie-1692161-[2022.9.28]羊了个羊协议分析.md` | `f393ef8fc532fc146b37962b4cd5c8de` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`yanglegeyang-map` |
| 288 | `52pojie-1719655-酷狗音乐网页歌曲爬取优化.md` | `d0c6da664ecebee88b80ead3e856b631` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`kugou-signature` |
| 289 | `52pojie-1744074-记一次DE物后台请求sign加密算法过程.md` | `a7500ef80aa4a79e90e9bae3c573ac43` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`dewu-sign` |
| 290 | `52pojie-1773958-【JS 逆向百例】拉勾网爬虫，traceparent、__lg_stoken__、X-S-HEADER 等参数分析.md` | `c4615afe65d223e17ed17d698009b70d` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`lagou-lg-stoken`；aesKey 需 RSA+agreement 激活；混淆 JS 文件名每次变 |
| 291 | `52pojie-1856239-淘系浏览器请求验签isg和cna分享.md` | `2dc619e0845d900c62d8051c1c2f0e8a` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`taobao-isg-cna` |
| 292 | `52pojie-1897565-某度翻译的sign逆向.md` | `9fc56b9f5d22a8eb92e243ae02eef5cc` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`baidu-fanyi-sign` |
| 293 | `52pojie-1913553-利用 ast 解混淆某东 h5st js 文件并进行参数分析.md` | `6be8446491e521a751653c95524703e8` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`jd-env-params`、`jd-h5st`、`jd-request-algo-token` |
| 294 | `52pojie-1928860-某音a_bogus纯算分析.md` | `e999490abac7238c5b73bd624dcfdfaf` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`douyin-a-bogus`；旧版纯算链路（cus / post 分支） |
| 295 | `52pojie-1964578-某团新版Web mtgsig1.2 算法解析.md` | `48c33c5961a260b8e7d0c1459db40458` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`meituan-mtgsig`；VMP 插桩 + 动态数组；字节流公式由本批**独立重算并逐值验证** |
| 296 | `52pojie-1968832-【JS逆向系列】某乎__zse_ck参数js与wasm多重套娃地狱级（左篇）.md` | `7fe8662b95a9214b097d892bd0c79b08` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`zhihu-zse-ck`；ob+jsvmp → 内嵌 base64 wasm 的套娃定位 |
| 297 | `52pojie-1970885-【JS逆向系列】某乎__zse_ck参数js与wasm多重套娃地狱级（右篇）.md` | `3dc41ee2b6b28b2d2bcee6582b7c39db` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`zhihu-zse-ck` |
| 298 | `52pojie-2018113-网易云音乐逆向.md` | `944e9a523a604e1a206b6827e77230ec` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`netease-weapi` |
| 299 | `52pojie-2022463-某q音乐sign逆向-多角度.md` | `ed3be72a2993d378a5c106ebca0d72bf` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`qqmusic-sign` |
| 300 | `52pojie-2033704-某站w_rid加密参数分析.md` | `34424dcba1574eb1bde16df1c2bca0ad` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`bilibili-w-rid` |
| 301 | `52pojie-2048032-JS逆向实战案例之———x日头条【a-bogus】分析.md` | `fd0827f317e904e8add8ab4129553d69` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`toutiao-a-bogus` |
| 302 | `52pojie-2052845-某东最新5.2版本的第8段环境参数加密逆向解析.md` | `b86b9979f1bd16ab6d1d069b8a43f10b` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`jd-env-params` |
| 303 | `52pojie-2058603-[原创]boss直聘__zp_stoken__的控制平坦流纯算逆向思路.md` | `ba0ef1109331b2a3fa71219f515a84a9` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`boss-zp-stoken`；控制平坦化 be→分支 map 还原；`window["s"]` 执行时间检测；文件名每日变 |
| 304 | `52pojie-2092725-某red书最新'x-s'ai纯算+补环境.md` | `d2b1c5535d76d3063f1e2a7c3f118241` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`xhs-x-s`；XXTEA 密钥 `e6483ca2a1eed5e3` + 自定义 base64 表（统计归纳法） |
| 305 | `52pojie-2104039-新版小红书首页笔记获取及X-s参数解密.md` | `90b48fd742af17872fc239c54507c701` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`xhs-x-s` |
| 306 | `52pojie-2104180-京东搜索接口商品数据获取及h5st参数解析.md` | `0255a2541641748d4e5ef49b4e71b4ed` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`jd-h5st` |
| 307 | `52pojie-2104414-抖音详情页数据采集及a_bogus参数逆向分析.md` | `9efb6be2b55c12e0e86cb8936e64ca0b` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`douyin-a-bogus` |
| 308 | `52pojie-2128820-Ai逆向同花顺网站采集数据.md` | `7880b7f78cfd9d8b12ff54d1ad8ec637` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`10jqka-params` |
| 309 | `52pojie-2128911-手动补环境过同花顺网站.md` | `eb9c6ee8aebb1830c0a7f98443a084ae` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`10jqka-params` |
| 310 | `52pojie-819754-【原创】Python爬取12306登录.md` | `be720c0a422c2c951535f80fa0d420fe` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`12306-login` |
| 311 | `52pojie-858765-JS实战系列之解密-拼夕夕反爬虫算法.md` | `ceaf6072f1c205b61726ac528a3513e7` | 2026-09-22 | reverse-knowledge | evolve | 落 `reverse-knowledge` 蓝图：`pinduoduo-antispider` |

### 本批次技能变更汇总（B17）

| 技能 | 变更类型 | 变更内容 |
| --- | --- | --- |
| `reverse-knowledge` | evolve（**修复失效功能 + 从零落地蓝图库**） | 新增 `data/blueprints/`（24 个蓝图 / 388 条来源引用 / 36 篇来源文章）；新增 `references/blueprint-schema.md`（文件契约唯一权威源）、`references/platform-signature-patterns.md`（跨平台共性 12 节）；重写 `scripts/query-blueprint.js`（修路径 + 可读报错 + `--data/--where/--selftest`）、新增 `scripts/blueprint-lint.js`（结构与来源溯源校验，自检含失败分支）；`SKILL.md` 补蓝图库章节与四条质量红线 |

### 本批次的方法论增量（可复用）

1. **闭环判据 ④ 升级为「声明的依赖」而不只是「声明的文档」**：本轮命中项是一个**目录**（`docs/knowledge/parameter-blueprints`）从未存在，且脚本的路径推导本身也少一级。凡是「技能里有一个脚本会去读某处资源」的技能，都必须有一条机械断言证明该资源存在。
2. **资源要自包含**：蓝图库落在 `<skill>/data/blueprints/`，并用「显式 `--data` → 环境变量 → 技能内 → 仓库 `docs/`（历史兼容）→ cwd」的解析链 + `--where` 可观测。**技能被复制到任何位置都能跑**，不再依赖仓库布局。
3. **给数据加 lint 而不是只给代码加 lint**：`blueprint-lint.js` 校验的是**内容契约**——必填字段、枚举值、`index`↔`metadata` 的 id 一致性、parts 重名、空 mutations、**`sources[].file` 必须真实存在（来源溯源）**、行号必须为正整数、孤儿目录。数据类技能没有 lint，下一批必然漂移。
4. **抽取结果不直接入库，先过「构建器」**：`b17-build-blueprints.py` 把抽取 JSON 机械映射成蓝图文件，任何不合契约的条目（空 mutations / 来源不存在 / id 非法）**直接报错退出**，而不是由脚本补默认值。本批靠这道闸门抓到 3 个真问题（JSON 围栏被内嵌 ``` 截断、`platform-protocol` 分类缺失、`unknown` 算法族不在枚举内）。
5. **源文章的数字必须自己重算（B10 结论再次生效）**：美团 `mtgsig` 一文只给了 5 个「逐步演算」的中间值，本批把公式归纳为 `out[i] = (out[i-1] + i + key[i mod 16] + 31) mod 256` 后**逐值重算**，5 个检查点全部命中；同时发现原文第 17 个值的算式抄错（写成 `261 - 256 || 318 % 256`，实际应为 `261 % 256 = 5`）。
6. **多源交叉验证优先于单源**：知乎 `x-zse-96` 的抽取过程**证伪了任务书里的三条先验假设**（`x-zse-93` / `d_c0` 在三篇原文中零命中、无 HMAC-SHA256、无「MD5 后 substr 十六进制替换表」），真正的表是 64 字符 `fixed_str`。**假阴性会诱使人去改正确的内容（B4 已踩过），所以断言必须 grep 字面量。**
7. **同源矛盾要显式记录**：小红书两篇对 base64 字母表长度说法不一（一文说 65 字符），抽取侧**逐字符数了文章二的常量表 = 64 且去重后仍 64**，判定为 64 并把矛盾写进 `contradictions`。
8. **「如实标注 unknown」优于「补一个猜的算法」**：`toutiao-a-bogus` 源文章几乎全是截图，只给定位不给算法 —— 该蓝图 `status: unknown` + `family: unknown` + **不写 `mutations.json`**，由 lint 以 warn 形式暴露（可见的缺口好过不可见的编造）。

### 本批次明确留白（写进文档而非假装支持）

1. **`toutiao-a-bogus` 没有 mutations**：源文章（`2048032`）为截图型，未给出任何可复述的陷阱，蓝图只保留定位与补环境路线，`metadata.gaps` 已列明。
2. **知乎 `__zse_ck` 的 key_material 为空**：SM4 密钥/IV、魔改 base64 字母表、明文 6 段顺序均只在源文章的截图里。
3. **`jd-h5st` 的 8 段未逐段穷尽**：源文章只钉死第 3 段（`signAppId`）、第 5 段（HMAC-SHA256）、第 8 段（环境指纹），其余段在 `gaps` 中标注。
4. **百度翻译 `sign` 只到「固定常量 + 函数 n」层级**：源文章未给出完整函数体。
5. **蓝图库没有「自动从新文章抽取」的流水线**：本轮抽取是人工编排 + 子代理，抽取规范落在 `artifacts/skill-evolution/b17-run-20260922-2113/EXTRACT-SPEC.md`，尚未工具化。

### 复跑命令

```bash
# 1) 蓝图库结构 + 来源溯源校验（0 error 为通过；1 条 warn 来自 toutiao-a-bogus 无 mutations）
node .claude/skills/reverse-knowledge/scripts/blueprint-lint.js

# 2) 检索器与校验器的自检（断言数以实跑输出为准，勿手抄）
node .claude/skills/reverse-knowledge/scripts/query-blueprint.js --selftest
node .claude/skills/reverse-knowledge/scripts/blueprint-lint.js --selftest

# 3) 实际命中的数据目录（应为技能内 data/blueprints）
node .claude/skills/reverse-knowledge/scripts/query-blueprint.js --where

# 4) 自然语言检索端到端
node .claude/skills/reverse-knowledge/scripts/query-blueprint.js -q "抖音 resource list 签名"
node .claude/skills/reverse-knowledge/scripts/query-blueprint.js --id douyin-a-bogus --json | head -40

# 5) 从零重建蓝图库（幂等：会先删 data/blueprints 再按抽取结果重建）
python artifacts/skill-evolution/tools/b17-build-blueprints.py

# 6) 整体机械校验（0 阻断 / 0 告警 为通过）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 7) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b17-ledger.py
```

### 下一批（B18）取材建议（承接本节）

- 待处理 **457** 篇（台账 311 条后）。
- 优先级：
  ① **签名 / 协议参数系仍有大量剩余**：本轮只覆盖 24 个平台，待处理队列里仍有 爱奇艺 `cmd5x`、优酷、咪咕、网易云 eapi、快手、微博、得物之外的电商与 OTA 平台；**按「同一平台 ≥2 篇」聚簇继续补蓝图**（多源互证收益最高）；
  ② **验证码图像识别系剩余（~85 篇）**：真拼图 / 双缺口 / 旋转系的**协议侧**仍薄；
  ③ **Cloudflare 系（CSDN 24 篇同题水贴）**：与 B9 的 `edge-waf-cookie-challenge.md` 对拍，重点做**证伪**（这批 CSDN 文章多为同质转述，适合验证「哪些说法站不住」）；
  ④ **JSVMP 剩余**：符号执行 / 中间代码优化（落 `ast-deobfuscation` 既有文件）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B17 **十一次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

## 三·P、批次 B18 · 2026-09-23（wasm 逆向工具链 / 反 CFF / 运行期复现：`wsam-reverse` 三块权威源 + 2 个平台蓝图）

**取材口径**：单一能力族「WebAssembly 逆向」一次做全 —— 工具链与反编译选型 · `wasm2c → .o → IDA` ·
反 CFF（控制流平坦化还原）· Node/Python 运行期复现与胶水层补全 · 内存视图注入 · 平台签名（爱奇艺 `cmd5x` / 腾讯 `ckey`）·
语料侧安全（prompt-injection 载荷）。

**选它的理由（B7 / B10 / B11 三条建新技能判据同时命中、但结论是「不新建」）**：
`wsam-reverse` 自 B1 建库、B4 演化过一次后，`references/` **只有 2 个文件（11.9 KB + 4.6 KB）**，
而同族待处理文章 **23 篇**；`SKILL.md` 的「路线选择」表**有路口但极浅**（没有 `wasm2c → .o → IDA`、没有反 CFF、
没有「把 wasm 跑起来」的骨架）。因此按分流判据走**演化**而非新建 —— 把知识全部落进它的 `references/`（渐进披露）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取知识点 |
| --- | --- | --- | --- | --- | --- | --- |
| 312 | `52pojie-962068-【转帖】一种Wasm逆向静态分析方法.md` | `c57b9a7973a1bf5b1ee414985fc7ce8c` | 2026-09-23 | wsam-reverse | evolve | `wasm2c → gcc -c → .o → IDA` 路线的最早来源（2019，CTF）；「只编译不链接」绕开未实现导入；字符串/常量在数据段且非地址引用，需按数据段偏移反推 |
| 313 | `52pojie-1013338-爱奇艺视频cmd5x解析算法的移植分析和实现 Nodejs （2019-08）.md` | `136fe6000a04bb15a6166522e3a5718c` | 2026-09-23 | reverse-knowledge | evolve | 蓝图 `iqiyi-cmd5x`：`vf` = 加盐 MD5（32 位 hex）；**非浏览器识别开关 = `try/catch` 包住的 `eval('process;')` / `eval('require;')`**，改名法可绕；含黄金测试向量 |
| 314 | `52pojie-1461335-某网站字幕加密的wasm分析.md` | `0fc071bbadecdb7428a9ae4ece751924` | 2026-09-23 | wsam-reverse | evolve | 工具链 §3 第 2 个独立来源；**「JS 层函数名 ≠ wasm 导出名」**（`monalisa_get_line_number` → 导出 `v`，须回 JS 文件内搜索绑定）；IDA 参数类型需手工「设置项目类型」 |
| 315 | `52pojie-1487959-某网站心跳包参数加密的wasm分析.md` | `ee9d5c11acf0d8837d053256d8b35f70` | 2026-09-23 | wsam-reverse | evolve | 胶水层家族 cargo-web/stdweb：`__cargo_web_snippet_<40hex sha1>` 指纹 + 引用表桥（`to_js`/`from_js`/`acquire_js_reference`/`decrement_refcount`/`serialize_array`）+ 最小宿主对象 |
| 316 | `52pojie-1493082-执行wasm2c翻译出来的c代码二.md` | `7e487f06fda8e4207ff7db7fe87ef9b2` | 2026-09-23 | wsam-reverse | evolve | wasm-bindgen 导入补法与符号形状：`Z_<模块>Z_<字段>Z_<类型签名>` + 引用栈（`new`/`stack`）实现；VS 与 gcc 的方言冲突 |
| 317 | `52pojie-1535897-某网站视频加密的wasm略谈（二）.md` | `8b2a4738820e542123fe56055a21b3fb` | 2026-09-23 | stream-drm-reverse | evolve | canvas 自绘替代 MSE 的判据（wasm 体积暴涨 + JS 出现 YUV 流 ⇒ wasm 内同时封装解码器）；**经核对已由 `player-and-live-capture.md` §2.3 覆盖，本轮只登记不重复落地** |
| 318 | `52pojie-1549711-xx艺视频wasm转js分析，cmd5x算法脱离环境限制.md` | `0f5394bd80e6faf1ead02cc1a7d51ea3` | 2026-09-23 | reverse-knowledge | evolve | 蓝图 `iqiyi-cmd5x` 第 2 来源；Emscripten asm.js（无 .wasm 文件）判据 + `cmd5x → g(js) → f(wasm)` 调用链 + 「算长度 / malloc(+1) / 复制 / 调 / 读 / free」固定四步 |
| 319 | `52pojie-1556027-wasm转c调用与封装至dll案例.md` | `459c330b0d728086da4a747a1f54f810` | 2026-09-23 | wsam-reverse | evolve | wasm2c → C → exe → dll 的最短路径；**32/64 位 gcc 不匹配是 dll「找不到模块」的首位根因**；字符串参数需 `stackAlloc` + 手工 `free` |
| 320 | `52pojie-1581887-wasm转c调用实战.md` | `0f69a63a47b4b07ff9e4ce0509008003` | 2026-09-23 | wsam-reverse | evolve | §5 补导入三板斧（谁跑到补谁 / 从未执行的置 NULL / 按 JS 写死）+ **二级指针 retptr 小端取值** + §6.3 MinGW 缺 `libgcc_s_sjlj-1.dll` 与「先出 exe 再修 dll」逃生口；蓝图 `tencent-ckey` |
| 321 | `52pojie-1773515-某某电影网页wasm逆向思路.md` | `ea9181d946ff5cb654563fd8c6a818f1` | 2026-09-23 | wsam-reverse | evolve | 浏览器内 wasm 内存视图注入工具集（`viewDWORD` / `viewString` 遇 0 即止 / `search` 上限 1e7 / `memory.grow` 后 buffer 失效） |
| 322 | `52pojie-1836908-某网站wasm md5简单分析.md` | `76f710754c50acaaf93844e622eea078` | 2026-09-23 | wsam-reverse + reverse-knowledge | evolve | asm.js 判据 + `WASM_ASYNC_COMPILATION=0` 的 `reading 'apply'` 报错；**无源码还原 MD5 的三步法**（看 IV 是否魔改 / 统计出现 16 次的 case 画 4 段轮 / 对齐轮函数与左移 `((i%4)*5+7)`）；蓝图 `iqiyi-cmd5x` 第 3 来源 |
| 323 | `52pojie-1862975-绕过 AGE 动漫的 wasm 加密与解密函数.md` | `45b4c4359b2a54ba7d9edc7bc2b7dc3d` | 2026-09-23 | wsam-reverse | evolve | Go-wasm 复现标准姿势（复用 `wasm_exec.js` + `new Go()` + `go.run`）+ **Proxy 探针找 `window.Domain`** + **`global` 自身就是 `window`，不能自赋值，只能把 `global` 换成 Proxy** |
| 324 | `52pojie-1863743-某巴巴文档网站加密文件逆向，wasm直接获取文本.md` | `68f6cbeffd9e77a380848789b97bd9a2` | 2026-09-23 | wsam-reverse | evolve | 「不反编译、扣 JS + 把载入换成自己的本地 .wasm 直接取明文」的完整范例；`postMessage` 用 `console.log` 桩即可初始化 |
| 325 | `52pojie-2037819-[原创]Scrape spa14 wasm加密过程分析.md` | `85df2846100ece526dd91eaa83774e64` | 2026-09-23 | wsam-reverse + reverse-knowledge | evolve | **import 为 0 时 wasmer 两行调通** ⇒ 判据优先于工具；并暴露原文内部口径不一致（源码 `Math.round` vs 示例 `math.ceil`） |
| 326 | `52pojie-2044904-[原创] 崔大Scrape十四题, 入门级wasm加密分析.md` | `80a4267b99f1fba683c9e1d3f92ecf16` | 2026-09-23 | wsam-reverse | evolve | `.wasm → .o → IDA F5` 路线第 4 个独立来源 + WAT 逐条栈语义讲解；**与 2037819 的公式冲突（`i32.div_s` 截断 vs `math.ceil`）——以 WAT 为准并已实跑复核** |
| 327 | `52pojie-2062825-码上爬 8~13关js逆向代码.md` | `0340e09b8b5f6d83fd325d121eff40b7` | 2026-09-23 | wsam-reverse | evolve | pywasm 两行调用（`instance_from_file` + `invocate`）；解释器类「整段 copy + 缺啥补啥」带 Proxy 日志 |
| 328 | `52pojie-2063345-荔枝网wasm 逆向.md` | `95eca43990ea4122a8b4d0abc99a12c0` | 2026-09-23 | wsam-reverse | evolve | Node 宿主骨架（Window/Location/self/document）+ **`delete process`/`delete global` 的动机与代价**（删前须把 `fs`/`argv` 提到局部变量） |
| 329 | `52pojie-2094419-春节】解题领红包之九 {Web 中级题} 题解 - wasm逆向.md` | `e8afc545e090aedc0cc44dbdfa0de129` | 2026-09-23 | wsam-reverse + forum-corpus-archival | evolve | **`wasm-decompile` 才是要读伪代码时的首选、`wasm2c` 只当目录**；SHA-256 常量识别；**语料夹带 prompt-injection 载荷（既是防 AI 暗桩、又是题目完整性令牌）** → 落 archives 坑 43 |
| 330 | `52pojie-2103854-ai补环境(下).md` | `47ad07682421e56800589ef2b78ccaca` | 2026-09-23 | wsam-reverse | evolve | **VMP 场景三条路线的量化代价**（wasm2c 补导入 / wasm2js 补环境 / 不动 wasm 扣原 JS）与正确退路；`ffmpeg -v error -i out.mp4 -f null -` 作验收 oracle |
| 331 | `52pojie-2107193-针对wasm反CFF的尝试.md` | `df0f2ac1984c7726fb5c2aa0adc83b52` | 2026-09-23 | wsam-reverse | evolve | **wasm 反 CFF 全套（唯一权威源）**：四步法 / 有效块两类模板 / ihelp vs 非 ihelp 的 angr hook 策略 / **禁用 `angr.options.CALLLESS`** / 汇编 patch 空间坑 / 「结果不对先查 `get_real_block`」 |

### 本批次技能变更汇总（B18）

**新建技能 0 个**（B5–B18 **十二次**确认不新建 `captcha-flow-orchestration`）；**演化既有技能 3 个**；附带修复 3 项。

- **`wsam-reverse`（主，最大增量）**：新增 3 个「唯一权威源」参考文件 + 扩展 1 个脚本 + `SKILL.md` 接线。
  - 新增 `references/wasm-toolchain-and-decompilation.md`：开工先量三件事 / 工具选型矩阵（`wasm-objdump` /
    `wasm2wat` / `wasm2c` / `wasm-decompile` / `wasm2js` / IDA 的取舍）/ **`wasm2c → .o → IDA` 路线（4 篇独立来源互证，
    跨 2019–2026）**/ `wasm2c` 符号命名与「按可读尾部匹配」/ **补导入函数的三板斧** / `C → DLL/exe → Python`
    （含 MinGW 运行时缺失与「先出 exe 再修 dll」）/ Emscripten asm.js（`WASM=0`）/ **「JS 层函数名 ≠ wasm 导出名」** /
    排错表，以及 **§10「两篇来源公式冲突时以 WAT 为准」**（含实跑复核）。
  - 新增 `references/wasm-cff-restoration.md`：CFF 判据 / 四步法 / 有效块两类模板 / `state_var` / ihelp vs 非 ihelp 的
    angr hook 策略 / **`angr.options.CALLLESS` 为什么必须关** / 汇编级 patch 的三个代价 / 收尾清理 / AI 反 CFF 的定位 /
    排错顺序 / **§11 CFF vs VMP 判据 + VMP 的正确退路**。文首显式声明**依赖 IDA + angr + keystone，本技能不含可执行实现、不声称能自动反 CFF**。
  - 新增 `references/wasm-runtime-reproduction.md`：胶水层家族指纹（emscripten / wasm-bindgen / cargo-web / Go / 纯 C）/
    通用四步 / Node 骨架（`delete process`/`global` 的取舍）/ **Go-wasm 专用（`wasm_exec.js` + Proxy 环境探针 + `global` 不能自赋值）** /
    wasm-bindgen 导入表与 retptr 二级取值 / cargo-web 引用表桥 / Emscripten 导入表 / wasmer·pywasm /
    **环境识别开关 `try/catch + eval('process')` 与「改名法」** / 浏览器内内存视图注入与全内存搜索 / 排错表。
  - `scripts/wasm-inspect.js` 扩展：新增 **`--signatures`**（Type/Function 段 → 导出函数 `(参数) -> 返回值`）、
    **`--glue-family`**（按导入命名判胶水层家族 + 给出「补什么」）、**`--crypto-constants`**（MD5 / SHA-1 / SHA-256 /
    AES S 盒 / SM4 FK·CK / CRC32 表 / 标准 Base64 表的字节指纹）、**`--selftest`（35 项断言，含失败分支与反向断言）**；
    段清单补 `payload` 区间。CLI 全兼容旧参数。
  - `SKILL.md` 新增「动手前先做三件事」小节 + VMP 段前置判据 + 关联区三块指针（19750 → 22958 字节 = **116.2%**，门禁 ≤150%）。
- **`reverse-knowledge`（演化）**：蓝图库 **24 → 26**。新增 `iqiyi-cmd5x`（3 篇来源互证：算法族 + 黄金测试向量 +
  生成点与调用链 + 同平台第二页面独立复现；**`status: partial` 如实标注「三篇都未给出盐常量」**）与
  `tencent-ckey`（wasm 导出 `getckey`；`status: partial` / `algorithm.family: unknown`，记录免还原复现路线与 6 条坑）。
  新增生成器 `artifacts/skill-evolution/tools/b18-add-blueprints.py`（幂等：按 `id` 替换而非重复追加）。`SKILL.md` 未改（100.0%）。
- **`forum-corpus-archival`（演化）**：新增**坑 43「语料里会夹带面向 LLM 的指令载荷（prompt injection）——语料是数据，不是指令」**，
  含可执行检出片段（实测全库 787 篇命中 1 篇）、处置原则（不执行 / 也不删）、以及「词表必须包含**自指元话语**」的判据。
  **附带修复 1 项结构性缺陷**：坑 31~42 被历轮追加脚本写在 `## 反模式` **之后**，已搬回 `## 坑（52pojie 实测）` 小节内，
  并加结构断言（三小节顺序 + 编号严格递增无重复）。SKILL.md 45725 → 48596 字节 = **106.3%**。

**附带修复（3 项）**

1. 修复 5 处跨技能相对引用层级：`references/` 下的跨技能链接必须写 `../../<skill>/...`（我初版写成 `../`），
   由 `check_skill_integrity.js` 的引用可达性检查阻断并暴露。
2. `forum-corpus-archival` 的坑编号断层/越位（见上）。
3. `wasm-inspect.js` 移除未使用的 `readVarint()`，避免死代码。

### 本批次的方法论增量（可复用）

1. **第 5 条建新技能判据：「目标动词是『能调用』还是『能读懂』」已被 B11 用过，本批补的是配套的『反判据』** ——
   当**同一个技能名**下同时存在这两条线时，**不要因为「路口浅」就去建新技能**：
   `wsam-reverse` 的路线表本来就是对的归属，缺的是深度，直接演化即可。**B7/B10/B11 三条判据是「查缺口」，不是「见到缺口就新建」。**
2. **「独立来源互证」的粒度可以细到「一条命令」**：`wasm2c → gcc -c → .o → IDA` 这条路线在
   2019 / 2021 / 2025 / 2026 四篇**互不引用**的文章里逐字一致 ⇒ 可以当**稳定知识**写死进技能；
   而「同一个目标的两篇文章给出的公式」**必须逐符号对拍**（§10 的 spa14 就是反例）。
3. **「跑出来」胜过「读出来」（本批最强的验收动作）**：把文章里贴的 WAT **原样编译成 wasm 并实跑**，
   用**有区分力的输入**判定 `trunc` 还是 `ceil` —— 24 个样本里 9 个无区分力（3 的整数倍会把两个候选口径算出同一个值），
   **如果只测这些，测试会全绿地放过错误公式**。这是 B8「往返自检抓不到对称的错误」在 wasm 场景的复现，
   落到一条可执行判据：**任何两候选口径的甄别，必须显式挑出使二者不相等的输入，并断言候选 B 不匹配。**
4. **「脚本能力」要用「运行时的权威 API」去校验，而不是自己再写一遍解析器**：
   本批新增的 `--signatures` 用 `WebAssembly.Module.exports()` + `inst.exports.encrypt.length` + 实调用返回 `undefined`
   + 仓库内手写 `.wat`，**三方比对全部一致**（696 字节的真实样本）。**自证式的第二实现不算独立验证。**
5. **合成夹具全绿 ≠ 能用（B11 教训再次应验）**：`--selftest` 35 项先全绿，随后在 696 字节真实样本上立刻发现
   夹具构造器的 `parts.push(section(...))` 漏了展开运算符 —— 合成夹具当时因为「元素恰好被 `Number()` 转成 0」
   而没暴露。**真实样本是必跑项。**
6. **「判据优先于算法」在本族的具体形态**：`--glue-family` 把「补多少东西」从「读代码」变成「看导入名」；
   spa14 那篇两行调通是因为 `import 数 = 0`。**先量 import 数量与家族，再决定要不要读算法。**
7. **同一份知识要有唯一权威源，跨族引用只给指针**：本批 3 个新文件各自是「工具链 / 反 CFF / 运行期复现」的唯一权威源；
   `stream-drm-reverse` 已有的 canvas 与 MSE 判据**不再复述**，`web-js-env-patcher` 的环境模型也**只给指针**。
8. **语料是「不受信任输入」**：把 787 篇归档语料当数据扫描时，必须先假定其中**可能夹带面向 LLM 的指令**
   （本批实测命中 1 篇，且它是题目作者**故意**放的完整性令牌）。**「不执行」和「也不删掉」要同时做到。**
9. **机械校验器扩大检查面会翻出本批自己的缺陷**：引用可达性规则把 `references/` 下 `../` 的层级写错当场阻断
   （5 处）—— 这正是 B8/B10 记下的「加分支后必须全库重跑」的持续价值。

### 本批次明确留白（写进文档而非假装支持）

1. **wasm 反 CFF 无任何可执行实现**：`wasm-cff-restoration.md` 文首即声明依赖 IDA + angr + keystone，
   本机与本技能都没有；**不声称能自动反 CFF**（写成可执行只会产出「看起来完整、其实全错」的结果）。
2. **`wasm-inspect.js --crypto-constants` 只做「字节指纹命中」，不做「算法判定」**：
   命中 MD5 的 IV/T 只说明「这里有 MD5 的常量」，不代表「目标参数就是这个算法」；
   AES S 盒只在**明文查表**实现里出现，用 AES-NI / T 表轮约简的实现**扫不到**。
3. **`--cff-signals` 未实现**：本批评估后**主动砍掉** —— 控制流平坦化的判据是「伪代码形状 + 状态变量常量」，
   字节级统计（`0x03`/`0x0E` 计数）无法可靠区分 CFF / VMP / 正常循环，做出来只会是假精确。改由文档给判据表。
4. **`iqiyi-cmd5x` 无盐常量**：三篇来源都只做到「移植」或「定位」；蓝图 `status: partial` + `key_material: 未知` 如实标注。
5. **`tencent-ckey` 无算法**：源文章用 wasm2c 复现而非还原；蓝图 `algorithm.family: unknown`。
6. **`52pojie-1535897` 只登记不落地**：其 canvas/MSE 判据经核对**已由 `stream-drm-reverse/references/player-and-live-capture.md` §2.3 覆盖**
   （该文件由并行改动线落地），按「唯一权威源」原则**不重复写入**，仅在台账登记处理状态。
7. **未派 judge**：本轮时间预算全部给「生产 + 机械验证」（英文本轮含 3 个新参考文件 + 1 个脚本扩展 + 2 个蓝图 + 1 处结构修复）。
   报告与台账如实标注：**本轮没有任何一条评审意见来自独立 judge**，全部缺陷来自机械校验器与主执行者自跑。

### B18 新增能力的复跑命令

```bash
# 1) 扩展后的 wasm 解析器自检（35 项断言，含失败分支与「随机数据不得命中长指纹」的反向断言）
node .claude/skills/wsam-reverse/scripts/wasm-inspect.js --selftest

# 2) 真实样本上验签名解析（应与 Node 运行时 exports 与仓库内 .wat 三方一致）
node .claude/skills/wsam-reverse/scripts/wasm-inspect.js -i project/yuanrenxue/match30/core.wasm --glue-family --crypto-constants

# 3) 蓝图库结构 + 溯源校验（1 条 warn 来自历史遗留的 toutiao-a-bogus 无 mutations）
node .claude/skills/reverse-knowledge/scripts/blueprint-lint.js
node .claude/skills/reverse-knowledge/scripts/query-blueprint.js --id iqiyi-cmd5x

# 4) 由 WAT 实跑判定公式口径（会打印「有区分力的样本数」并断言候选 B 不匹配）
node artifacts/skill-evolution/b18-run-20260922/verify-spa14-wat.mjs

# 5) 语料 prompt-injection 检出（应只命中 1 篇）
python artifacts/skill-evolution/b18-run-20260922/pit43-inner.py

# 6) 整体机械校验（0 阻断 / 0 告警 为通过）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 7) 双镜像一致性（0 mismatch 为通过）
python artifacts/skill-evolution/tools/mirror-report.py

# 8) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b18-ledger.py
```

### 下一批（B19）取材建议（承接本节）

- 待处理 **451** 篇（台账 331 条后；候选 782）。
- 优先级：
  ① **验证码图像识别系仍是最大簇（~84 篇）**：真拼图 / 双缺口 / 旋转系的**协议侧**仍薄；
     `web-verify-patcher` 的**类型清单三处并行维护**的结构性收敛仍挂账（B5 起）。
  ② **Cloudflare 系（CSDN 24 篇同题）**：B17 起连续两轮列为候选。本批已确认这一簇**信息量极低**
     （24 篇里 22 篇在 39–85 行内被截断、0 个代码块，且多篇实为**第三方打码平台 API 调用**而非逆向）⇒
     正确的处置是**做工证伪 + 只登记不落地**，并把它当作「语料同质化」的案例写进 `forum-corpus-archival`。
  ③ **sign / 协议参数系剩余**：继续按「同一平台 ≥2 篇」聚簇补蓝图（B17/B18 两轮已验证收益最高）。
  ④ **JSVMP 剩余**：符号执行 / 中间代码优化，落 `ast-deobfuscation` 既有文件。
- 候选新技能 `captcha-flow-orchestration` —— B5–B18 **十二次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

## 三·Q、批次 B19 · 2026-09-23（非极验滑块厂商协议形态：`web-verify-patcher` 17 族厂商对照 + 判据器）

**取材口径**：单一能力族「**非极验滑块厂商的协议形态**」一次做全 —— 21 篇覆盖 **17 个指纹族**
（腾讯云 turing / 360 天御 / 数美 / 云片 / 螺丝帽 / 安居客 / 房天下 / 51.com / 乐某 / 当当 / 同花顺 /
东方财富 / v5(WS) / 雷池 / 阿里 227 / 快手 / 异型拼接），其中 **4 家拿到双源互证**。

**选它的理由（承接 B16 遗留④与 B18 优先级①）**：
B18 把「验证码图像识别系（~84 篇）」列为待处理最大簇，其中「**非极验厂商的滑块协议侧**」在技能库里只有零散碎片
（`provider-execution-notes.md` 里数美/云片各几行、`tencent-tcaptcha-protocol.md` 只覆盖 `cap_union_*` 老形态）。
本批按「同一厂商全代际/全题型」原则取材后进一步发现：**同一产品被两篇互不引用的文章描述时，
公式与结构可以逐字互证**（360 天御、云片、安居客、腾讯云 turing 四家）—— 这才是本批能写死常量、
并把「极验的两接口模型不能套到别家」从猜想变成结论的原因。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取知识点 |
| --- | --- | --- | --- | --- | --- | --- |
| 332 | `52pojie-2052187-某x滑块补环境分析.md` | `40ebc4d313dbfde5c197b6c03a902676` | 2026-09-23 | web-verify-patcher | evolve | 腾讯云 turing 第 1 来源（双源之一）：`cap_union_prehandle` 字段全表（`sess` / `pow_cfg` / `tdc_path` / `sprite_url` 含拖动条）、提交七参数（`collect` / `tlg`=`collect.length` / `eks` / `ans` / `pow_answer` / `pow_calc_time`）、`ans` 的 `DynAnswerType_POS` JSON 形状、jsvmp 补环境四条（Proxy 吐环境 / `[object Window]` / `safeFunction` 保 native / 原型链真补） |
| 333 | `52pojie-2126956-qcloud滑块验证.md` | `bdb35fc8866d04b125b045a215c07ad8` | 2026-09-23 | web-verify-patcher | evolve | 腾讯云 turing 第 2 来源（双源之一）：prehandle → tdc.js → collect → 本地 PoW → `cap_union_new_verify` → `ticket`+`randstr` 全链；**`pow_answer` 随机值能被接口"接受"但提交必挂**；quickjs 轻量补环境的可维护性取舍（版本升级要重做） |
| 334 | `52pojie-2054148-360滑块验证码逆向.md` | `3a3596fffdc3df56a647f5fce3fa44e0` | 2026-09-23 | web-verify-patcher | evolve | 360 天御第 1 来源（双源之一）：前置 14 参数 + `sign = MD5(按请求体顺序直拼 k+v)`、`report = RSA_long(轨迹) + MD5(captchaId+token)`、公钥 `atob(vConfig.k)` 为 PKCS#8、**背景切 32 条竖条**与 `charCodeAt(i)%32` 递增去重顺序表、544×284 / 条宽 17 还原、轨迹字段为「对象以 x 为 key」 |
| 335 | `52pojie-2042898-某天御滑块逆向分析.md` | `f9f2c2219476f248a0601efd35f4426e` | 2026-09-23 | web-verify-patcher | evolve | 360 天御第 2 来源（双源之一）：`sign` 遍历口径与字面串口径互证、`nonce = round(now_ms) + floor(1e8*random())`、`encryptLong` 分段长度 = `key_size_bytes − 11`、切图函数（32 上限 + 去重）与 Python 实现、**该篇 `sdkName` 被脱敏 ⇒ 该字段值只按单源对待** |
| 336 | `52pojie-2020008-【JS逆向】yun片滑块验证码分析.md` | `ff50107a5c4d7c73f2303ca7f1ef130d` | 2026-09-23 | web-verify-patcher | evolve | 云片第 1 来源（双源之一）：get/verify 两个 JSONP 接口、`i`=AES-CBC 与 `k`=RSA(key+iv)、明文结构（`browserInfo`/`fp`/`address`/`yp_`）、`distanceX = (imgWidth − 小图宽) × (offsetX/(imgWidth − 42)) / n` |
| 337 | `52pojie-2057170-逆向过云片滑动验证码.md` | `5a611f1e8bb3323ed3e11bc3dc44daef` | 2026-09-23 | web-verify-patcher | evolve | 云片第 2 来源（双源之一）：可运行 Python + 内联公钥 JS、**轨迹点数 > 50 必须抽稀**（`len//50` 保首尾）、两篇 `cb` 生成方式不一致 ⇒ 服务端不校验该字段 |
| 338 | `52pojie-1756696-【验证码逆向专栏】安某客滑块逆向.md` | `5809c59df10945d8d2c1bd17bf36f46a` | 2026-09-23 | web-verify-patcher | evolve | 安居客第 1 来源（双源之一）：三接口（首页 / `getInfoTp` / `checkInfoTp`）、**AES key = iv = sessionId 的奇数下标字符**、`dInfo` 需 `encodeURIComponent`、图片 480×270 → 渲染 280×158、样本轨迹缩放法 |
| 339 | `52pojie-1796423-某居客滑块逆向分析.md` | `7f0d06e2281145fa322bc918221dfd37` | 2026-09-23 | web-verify-patcher | evolve | 安居客第 2 来源（双源之一，硬扣路线）：`AESEncrypt` 实现逐行互证、**输出用 `JSON.stringify(ciphertext)` 而非 `toString()`**（Python 侧 = `base64.b64encode` + `quote_plus`）、写死的指纹字典与 `_taN()` 分支不执行的判据 |
| 340 | `52pojie-1846991-【验证码逆向专栏】螺丝帽人机验证逆向分析.md` | `478d8ca03de1baf87a4876010e8379ba` | 2026-09-23 | web-verify-patcher + ast-deobfuscation | evolve | 螺丝帽 Luosimao：五接口链（widget→request→frame→user_verify→submit）、**函数名叫 `SHA3` 实为 AES**、30 片（上下两半各 15，20×80）与 `l` 数组语义、`dots` **倒序且每点 x/y 互换**、**`frame` 校验 `Host`**；伪 OB 判据（有大数组但无数组移位/无解密函数）第 1 实例 |
| 341 | `52pojie-1846995-【验证码逆向专栏】房天下登录滑块逆向分析.md` | `4073a805b88969de656b200a070a9d97` | 2026-09-23 | web-verify-patcher | evolve | 房天下：三接口 + 状态码语义（`100` 成功 / `101` 参数校验失败 / `102` 缺口识别错误）、41 项环境指纹表、**自定义 6bit 位压缩**（`join('!!')` → `encodeURIComponent` → 二进制串 → `parseInt(bin6,2)` 索引固定字符表）与轨迹同套压缩 |
| 342 | `52pojie-2043649-某美官网案例滑块逆向.md` | `5478b5f8e2e402c5e5ee59ee7468e5e1` | 2026-09-23 | web-verify-patcher + ast-deobfuscation | evolve | 数美：**`isJsFormat` 自定义格式化检测 ⇒ 美化后 key 被换成「时间戳+域名」必失败**、`captchaUuid` 字母表（剔除 `I/L/O/U/V` 等易混字符）+ `yyyyMMddHHmmss` 前缀、`tm/tb/ly/fr` 字段、图片 600×300 → 渲染 300×150（距离 ÷2）；**「可读产物 ≠ 可替换产物」第 1 条实证** |
| 343 | `52pojie-2040415-乐某自研滑块逆向分析.md` | `c979c9313089edb4a8086d0bb1985a1d` | 2026-09-23 | web-verify-patcher | evolve | 乐某（LOFTER）自研：`passport = SHA256(密码)`、图片以 `data:image/png;base64,` 内联、AES-CBC 且 **key/iv 每次请求新生成并同时用于加解密**、请求头 RSA(key+"-"+iv)；**头名本身只在截图里（正文只有函数名 `x_encseckey_get`）⇒ 已标注待复核** |
| 344 | `52pojie-2025578-某当网登录滑块逆向.md` | `48f46f127ecfc1150c09d101b535d5c0` | 2026-09-23 | web-verify-patcher | evolve | 当当：四接口（`getSlidingVerifyCode` / `checkSlidingVerifyCode` / `accountLogin` / `getRankey`）、`permanent_id` 生成链（时间 + `MD5` 前 8 位转十进制取 6 位 + 双随机 + `DDClick521`）、`sign = AES(key=rankey)`（首轮密钥为空串）、**`requestId` 来自接口返回值**、`point_json` 用图片接口返回的 `encryptKey` |
| 345 | `52pojie-2035508-某花顺登录滑块逆向.md` | `2b5f6d9650806247c6779d3482a05c37` | 2026-09-23 | web-verify-patcher | evolve | 同花顺：`getGS` → `dologinreturnjson2` → `getPreHandle` → 校验 → 登录、`crnd` 生成（base36 后 8 位重复两次）、`passwdsalt` 三段链（SHA256 → XOR(base64(ssv), n1) → HMAC_SHA256(MD5(pwd)) → XOR(SHA256(dsv)) → RSA）、滑块 `phrase = x;inity;w;h` 与 `inity = data.inity/195*opt.height`、**该链错一环保现象是 `dsk/ssv` 全空** |
| 346 | `52pojie-1918745-[51]网站滑块验证码还原.md` | `ebabf76572969134d3df62462b492bea` | 2026-09-23 | web-verify-patcher | evolve | 51.com：**HTML 用极验早期同款 `gt_cut_fullbg_slice` 布局但协议完全不同**（13×25 片 → 260×100，`token = md5(challenge+times+point)`）⇒ 反例黑名单第 1 条「`gt_cut_*` 不等于极验」的判据来源 |
| 347 | `52pojie-2042937-某财富网滑块逆向.md` | `84843f17c7c133e5349611379ae529d2` | 2026-09-23 | web-verify-patcher | evolve | 东方财富：cookie `qgqp_b_id` → `browserid`（20 位数字，首位 1-9、后 19 位 0-8）、**`request = base64(XXTEA(明文))`（不是 AES/DES）**、pipe 分隔明文格式（含 `d=x,y,t:…` 轨迹串）、26×2 = 52 片 `background-position` 还原、距离 `int(box_x − 8)`、canvas 断不住要搜 `DecodeImg` |
| 348 | `52pojie-2038972-v5滑块验证逆向.md` | `9ae271b33cb8b2ced6a781d2f4f40e18` | 2026-09-23 | web-verify-patcher + websocket-reverse | evolve | v5（verify5）**唯一 WS 承载样本**：一次挑战 6 发 3 收、待发串按 1024 字节分片加消息头、**AES-CTR + NoPadding 且 `btoa(IV + 密文)`**、key 由 token 末字符 charCode%2 按奇偶下标拆分、轮间 key 用上轮返回值前 32 位；**`requestId` 时间戳若为过去时间必 false**；WS 层取证与拆帧落 `websocket-reverse` 新案例 |
| 349 | `52pojie-1995970-雷池WAF滑块版本逆向分析.md` | `384c4d6afbb10c876b048688b89fb129` | 2026-09-23 | web-verify-patcher | evolve | 雷池 WAF（SafeLine）滑块：五步链（首页 → `challenge.js` → `issue` → `calc.js`(Worker+Blob+wasm) → `verify`）、cookie `sl-session` / `sl-challenge-jwt`、**43 个检测点累计 ≥100 分即判"被检测"**、wasm 固定四步 `reset → arg → calc → ret`、轨迹不校验；**无图 ⇒ 应判 `waf-challenge` 不进 Phase-2** |
| 350 | `52pojie-1903141-浅逆某里227滑块.md` | `ce9d3b899c0966172f416ddf460f88e3` | 2026-09-23 | web-verify-patcher + ast-deobfuscation | evolve | 阿里 227（AWSC 无痕）：`nocaptcha/analyze.jsonp` 与 `n` 参数、脚本顺序 `awsc → et_f → fireyejs → nc`、`m.init` 后取 `__fy.getFYToken`、补环境三项（`getComputedStyle` 全属性 / `getEntriesByType` / font 指纹）、`s[]` 环境数组逐项含义（`s[5]`/`s[46]`/`s[26]`/`s[23]`/`s[90]` 轨迹且经过异或）；**「多层 switch → 单 switch」降层只能用于阅读、无法替换浏览器原代码** |
| 351 | `52pojie-1897823-快手滑块轨迹分析.md` | `459fcc7225d433ce5c5ad22564d5f51f` | 2026-09-23 | web-verify-patcher | evolve | 快手：配置接口 `/rest/zt/captcha/sliding/config` 返回 `a/q/d/sx/sy/ix/iy`、坐标换算站点常量（`/276*1000`、`−282.25`）、**轨迹点两类变异**（`x' = x*sx+ix`；含 `d` 时按 `a` 起隔 `d` 个点变异、只含 `q` 时第 `a+1` 点起）、**不做变异也能过**（200/500/1000 次实测 99.5% / 98.2% / 93.8%）⇒ 先跑基线再决定是否复刻变异 |
| 352 | `52pojie-1881668-异型滑块算法解决思路.md` | `df85db2008897cad3b40d58179b7e276` | 2026-09-23 | web-verify-patcher | evolve | 异型**拼接错位**滑块：同一站并存标准滑块与拼接滑块两种、纯算法路线（灰度 → 按 y 切 → 转置 → 归一化 → 相邻列余弦相似度取最低）、**准确率仅约 70%（颜色相近即判错）⇒ 批量任务优先走模型并报失败率** |

### 本批次技能变更汇总（B19）

**新建技能 0 个**（B5–B19 **十三次**确认不新建 `captcha-flow-orchestration`）；**演化既有技能 3 个**；附带修复 4 项。

- **`web-verify-patcher`（主，最大增量）**
  - 新增 `references/slider-vendor-matrix.md`（**41 KB，「厂商判据 + 链路 + 参数配方 + 该家专属坑」的唯一权威源**）：
    §1 30 秒分流 · §2 17 族速查矩阵 · §3 逐家形态（每族四段固定）· §4 跨厂商共性 8 条 · §5 判不出时的证据补齐表 ·
    §6 **反例与黑名单 10 条** · §7 来源与口径（21 篇 + 推导值声明 + 与其他文件的分工）。
    强度标注贯穿全文：`★双源` / `单源` / `待复核`，**单源结论不写成定律**。
  - 新增 `scripts/slider_vendor_identify.py`（零依赖判据器）：17 族规则 + **排他 veto**（360 天御 vs 腾讯云同名不同家）+
    **重叠信号去重**（否则 `yunpian` 被 `captcha.yunpian.com` 顺带重复计分、阈值形同虚设）+ 图片几何提示；
    `--fingerprint / --list / --explain / --markdown / --json / --min-score / --selftest`；
    **退出码 0 判出 / 2 输入错误 / 3 证据不足（`unknown` 是正常结果，不是失败）**；
    `--selftest` **71 项**，含 19 条正例（含"只靠 header 名"一条、**两条路由各一条**）、2 组判别对、
    **5 条反例（必须 `unknown`）**、阈值行为、分数单调性、确定性、路由项 `next_steps` 必须指向**别的文件**、
    以及 **「每条规则声明的小节必须在文档里真的存在」**（B13 判据④）。
  - 增量：`references/motion-and-coordinate.md` 新增「轨迹格式与变异」节（**六种容器形态**对照 + 快手变异 + 逐站坐标换算常量表 8 行）与
    轨迹字段对照表 9 行；`references/provider-execution-notes.md` 新增**唯一权威源声明** + 15 行厂商「最容易踩的一条」指针表 + 数美 `isJsFormat` 补充；
    `SKILL.md` 新增分流条目与 description 触发词（18760 → 20326 字节 = **108.4%**，门禁 ≤150%）。
- **`ast-deobfuscation`（演化）**：`references/ob-variant-taxonomy.md` 新增
  **§八「伪 OB —— 有大数组但没有数组移位与解密函数」**（三条判据 + 三个固定顺序的 pass + 「不要对浅壳走主动调用路线」）
  与 **§九「可读产物 ≠ 可替换产物」**（数美格式化 / 阿里 227 降层两条实测依据 + 双文件存放约定 + 4 条反例）；
  `SKILL.md` 导航行补两节指引（17305 → 17724 字节 = **102.4%**）。
- **`websocket-reverse`（演化，本轮第 3 个技能，首次因 B19 材料被触碰）**：
  新增 `references/cases/case-ws-carried-captcha.md`（**WS 承载验证码/风控挑战**的取证顺序：先记「发 N 收 M」时序形状再动加密、
  1024 分片与消息头、`btoa(IV+密文)` 的 AES-CTR、key 会话内滚动派生、时间戳新鲜度；**「不能重连」「不能 HTTP 重放」两条硬约束**；
  5 条反例）；`SKILL.md` 案例区与关联区各接一线（10422 → 11130 字节 = **106.8%**）。

**附带修复（7 项，其中 4 项由独立 judge 抓出）**

1. `slider-vendor-matrix.md` 初版把 WS 案例文件名写成 `verify5-ws-captcha.md`（实际文件名为 `case-ws-carried-captcha.md`），
   由 `check_skill_integrity.js` 的引用可达性检查**当场阻断**并暴露 —— 跨技能 `../../` 解析链工作正常。
2. 判据器初版存在**重叠信号重复计分**缺陷（`yunpian` 是 `captcha.yunpian.com` 的子串），
   导致 `--min-score 4` 阈值失效；由 `--selftest` 的阈值断言抓出，改为「同一规则内 needle 互为子串时只计更长的那个」。
3. 来源核对（`b19-verify-sources.py`，175 项字面量）抓出 3 处**需要降级或标注口径**的描述：
   360 天御的 `sdkName=360CaptchaSDK` 仅单源（另一篇该字段被脱敏）、乐某的请求头名只在截图里（正文只有 `x_encseckey_get`）、
   同花顺/v5/数美的厂商名是由原文 base64 域名解出的**推导值**。三处均已改为显式标注（单源 / 待复核 / 推导值声明）。
4. **Judge A（保真度）抓出 4 处描述过强/写错**（详见 §独立评审）：双源家数 5→4；腾讯云 §3.1 的 `ans`/`prehandle` 字段实为**单源**；
   `ob-variant-taxonomy` §八 把"某初滑块"当伪 OB 举例是**错的**（该篇明写三要素 ⇒ 它是真 OB，已改为反例）；
   安居客"两篇逐行一致 + `toString()` 会得到错值"的断言过强（两篇输出行不同但都实测通过 ⇒ 两种写法等价）。
5. **Judge B（可用性）抓出 4 处"照着办会错"**：判据器把腾讯**防水墙旧形态**（`vData`）误判成 §3.1 新形态（已加 `vData` 排他 veto + 新增一条路由规则）；
   `headers` 的 **key 没有进语料**，`x-encseckey` 这类"指纹在 header 名上"的规则永远匹配不到（已修 `build_corpus` 并加断言）；
   v5 的 `1|1|` 是**第二条**消息的头（首版写成第三条）、且 `a|b|` 并非来源内容（已降级为"按抓包实测"）；
   360 切图伪代码缺 `out = []` 初始化、"等价"的说法在 `len(s) < 32` 时不成立（已补初始化并收紧措辞）。
6. **Judge B 复审又抓出 6 项开放项**：`browsercli` 调用形式写错（本技能规定必须 `browsercli call <tool>`，
   案例文件写成 `browsercli list_network_requests`）、360 切图算法**缺样本与期望值**（已补自算示例 + 排列约束 oracle）、
   `--markdown` 对路由项仍打印本文件 §2（已改为打 `redirect`）、docstring 规则条数 18→19、
   `flat` 是死代码（已删）、§1「反之亦然」与实现不符（已改为"互斥方向单向"并说明为何反向不加 veto）。
   增量复核（Judge A/B）另指出：**两条路由只有一条进了自检** ⇒ 已补极验路由正例 + `next_steps` 必须指别的文件；
   `build_corpus` 的 `flat` 返回值从无使用者 ⇒ 已删（自检 **71 项**）。
7. **Judge C（机械）抓出 1 个即时崩溃**：修锚点正则时引入 `re` 未导入 ⇒ `--selftest` 直接抛 `NameError`（已修）。
8. Judge C 另抓出 2 处**断言弱化**并已加固：`ambiguous` 分支从未真正执行（新增"两家并列强信号"用例）、
   锚点检查用子串匹配（`### 3.1` 可被 `### 3.10` 蒙混）⇒ 改为带边界的正则并加反例断言。
   **另修正本表自身的口径错误**：`websocket-reverse` 的体积基线是 **10422** 而非 7169 ⇒ 实际 **106.8%**（首版报告写的 155.2% 是我算错基线）。
9. **增量复核（Judge A/B 第二轮）**：两条路由只有一条进了 `--selftest`（半覆盖）⇒ 补极验路由正例 3 项，
   并把「路由项 `next_steps` 必须指向**别的文件**」提成断言（自检 66 → **71 项**）。
10. **工具链静默失败（收尾时抓到）**：`b19-md5.py diff` 的加载器只认 `md5  path`（两空格）格式，
   而冻结/终态基线是 TSV ⇒ 两边都解析成空字典，**静默报告 `added=0 removed=0 changed=0`**
   （与 B18 的 `md5sum` `*` 前缀问题同型：症状都是「看起来什么都没变」）。已改为兼容 TSV 并复算：
   **真实差异 = 7 个文件被 judge 修复改动、2 个未再动**（`ast-deobfuscation/SKILL.md`、`websocket-reverse/SKILL.md`）。
11. **扩了校验器的检查面（Judge C 提出）**：`check_skill_integrity.js` 的「小节重号」检测正则只认半角 `.` / 空格，
   对**中文序号小节**（`## 1、xxx` —— 本批新矩阵正好全是这种）**完全不可见** ⇒ 补全角 `、` / `．`，
   并做**阳性验证**（`## 1、` 与 `### 3.1` 能解析、`## 反模式` 不解析）；全库重跑仍 **0 阻断 0 告警**。
12. **Judge C 的通道中途失效**（其自述「channel 掉了，无法复跑」）⇒ 按 B8/B11 既定规则**不以其未复跑的部分为准**：
   它提出的 3 条（冻结基线陈旧、缺终态快照、正则覆盖率盲点）由主执行者**逐条自跑补位** ——
   终态快照已生成（`b19-final-md5-20260923.tsv`）、差异已复算（见第 10 条）、校验器已扩面并阳性验证（见第 11 条）；
   它未能复算的「自检 71 项」也由主执行者重跑并留了输出（71/71）。

### 独立评审（Judge A / B / C）

评审前**先冻结**（`artifacts/skill-evolution/b19-freeze-20260923-1020.tsv`，9 个文件；评审期间只做修复、不做顺手改 —— B9 教训），
派 3 名独立 judge，分别按**保真度 / 新用户可用性 / 机械校验**三个视角评审，原始意见见
`artifacts/skill-evolution/judge-findings-20260923.md`。

| Judge | 视角 | 提出的问题 | 处置 |
| --- | --- | --- | --- |
| A | 来源保真度（逐字面量 grep） | 2 major + 9 minor（含双源家数、单源字段被当双源、伪 OB 举例错误、`toString()` 断言过强） | 全部回源复核后**成立**，当场修完 |
| B | 新用户可用性（真跑命令） | 4 major + 8 minor/nit（旧形态误判、headers key 未入语料、v5 消息头归位、伪代码缺初始化、命令 cwd/schema/误差提示） | 同上 |
| C | 机械校验（跑命令 + 算数字） | 1 major（`import re` 缺失致自检崩溃）+ 4 nit（2 处弱断言、体积口径、`--help` 元变量） | 同上 |

**合计 3 个 major / 27 个 minor+nits（含第二轮 O/N 共 6 项与增量复核 2 项），全部回源复核后成立，0 驳回**
（本轮无"judge 误判需驳回"的条目）。**唯一未采纳的一项**：Judge B 建议给旧形态路由也加反向 veto，
经复核**不采纳** —— 两代参数同时出现的异常样本会让双方都被清零、只能返回 `unknown`，
不如靠 `vData` 强信号单向入选（已在矩阵 §1 写明理由）。
**棘轮结论：keep** —— 三个视角都没有提出"应回滚本次演化"的意见，全部意见都是**可修复的局部缺陷**，
修复后正向断言（71 项自检 / 175 项来源字面量 / 机械校验 0 阻断 0 告警 / 镜像 0 mismatch / 切图顺序 oracle PASS）全绿。
judge 的三条**最有价值**发现：① `ob-variant-taxonomy` §八 的举例**自相矛盾**（真 OB 被当伪 OB）——
这类"文档内部逻辑错误"只有逐条回源才能发现；② 判据器把**同一家的新旧形态**混为一谈（`vData` 分水岭）；
③ `headers` 的 **key 侧信号**永远匹配不到（规则写了但设计上不可达）。

### 本批次的方法论增量（可复用）

1. **「单源 vs 双源」必须在文档里逐字段标注，不能整节标**：本批 4 家双源互证拿到的都是**公式与结构**，
   而个别**字段取值**仍只有一篇给出（360 的 `sdkName`）。把「双源」当整节标签，会让单源字段被误当稳定知识。
2. **来源核对要按"字面量"逐条 grep，并且要预设假阴性**：本批 7 处未命中里，5 处是我自己的核对清单写错
   （来源把 `yp_riddler_id` 缩写成 `yp_`、把请求头写成函数名 `x_encseckey_get`、厂商名在 base64 里），
   只有 **2 处是真问题**（单源字段被写成双源、头名只在截图里）。
   ⇒ **未命中先回源复核，再决定改内容还是改清单**（B16 教训的第二次应验）。
3. **判据器必须自带"排他 veto"与"反例断言"**：两家产品命名高度相似（360 天御 vs 腾讯云 turing）时，
   只有 veto 才能给出确定答案；而**只有反例断言才能防止判据器退化成"什么都能认"**——
   本批 5 条反例全部走 `unknown` 且返回退出码 3。
4. **阈值类逻辑必须配"能失败"的断言**：`--min-score` 的失效**不会**让任何正例测试变红（正例分数本来就高），
   只有专门构造"刚好在阈值边界"的输入才抓得到。这与 B8「往返自检抓不到对称的错误」是同一类问题。
5. **「同一份知识唯一权威源」在本批的落地方式**：厂商细节全部进新矩阵，
   `provider-execution-notes.md` 只留「该家最容易踩的一条 + 指针」并在文首声明权威源，
   轨迹编码统一放 `motion-and-coordinate.md`，WS 拆帧统一放 `websocket-reverse` 的案例文件 —— 三处互不复述。
6. **技能名覆盖 ≠ 能力覆盖（B7 判据第二次命中）**：`websocket-reverse` 自建库起只有 1 个案例文件，
   本批的 v5 是该技能第一次拿到"WS 承载的不是业务数据而是挑战协议"的样本；
   **归属正确但内容为空**时同样按演化处理，不新建技能。
7. **「冻结 → 终态」的差异必须自己算出来并留痕**：评审期间的修复会让冻结基线失效，
   而「哪些文件被改过」正是「评审到底有没有起作用」的证据（本批 7 改 2 不动）。
   **注意工具会静默骗你**：TSV 被当成空格分隔 → 解析为空 → 报「0 变更」。
   判据：**基线对比脚本必须在有差异时有差异，并对它做一次「已知有改动」的阳性验证**。
8. **给校验器扩检查面时，必须同时做「阳性验证」与「全库重跑」**：本批把重号检测的分隔符补上全角 `、` 后，
   先证明 `## 1、xxx` 能被解析（否则「0 告警」可能只是「新规则根本没生效」），再全库重跑确认没翻出历史遗留。
9. **文档里给了「自算示例」就必须配「机械判据 + 留痕路径」**：360 切图顺序的示例是本批自算的，
   因此同时写了先验约束（**输出必须是 `0..31` 的排列**）；一次性 oracle **只作流程留痕、不进技能库**
   **并与「双源结论」分级**（自算 ≠ 来源证据）。
10. **技能之间存在"跨语料族协作点"时，两边各写一半**：v5 的厂商参数在 `web-verify-patcher`、
   帧结构与取证顺序在 `websocket-reverse`，两处互放指针且明确"谁是权威源"——
   避免同一段知识在两处漂移（B4 教训）。

### 本批次明确留白（写进文档而非假装支持）

1. **`slider_vendor_identify.py` 的图像侧覆盖有限**：除「异型拼接」靠域名/文案线索外，
   **纯图片输入无法判厂商**（设计如此，返回 `unknown`），不假装能做图片分类。
2. **4 家之外的 13 家仍是单源**：螺丝帽 / 房天下 / 数美 / 乐某 / 当当 / 同花顺 / 51.com / 东方财富 / v5 / 雷池 / 阿里 227 / 快手 / 异型拼接，
   已逐篇标注 `单源`；其中快手变异点的触发条件来源自述「为多次测试归纳、未跟栈」。
3. **3 处「来源表述含糊」未强行补全，只给复核方法**：
   螺丝帽 `v = MD5(...)` 的入参、同花顺 `passwdsalt` 里"取等号后段作 HMAC key"、快手后续变异点的递推式 ——
   均已在文档里写明「落地前用浏览器怎么对齐」，**不给猜测值**（未知常量不猜，B8 口径的延续）。
4. **未做图像侧新增**：本批 21 篇全是协议侧，缺口识别/裁图/几何仍以
   `tile-scramble-and-coordinate-mapping.md` 与 `captcha-model-training.md` 为准，本轮不动。
5. **`web-verify-patcher` 的类型清单仍是三处并行维护**（`SKILL.md` 分类标签 / `captcha-types.md` / `solution-playbooks.md`），
   结构性收敛自 B5 挂账至今，本轮仍未做（本批只加了厂商触发词与分流条目）。
6. **`references/verification-workflow.md` 的"必须选一个厂家族"措辞与 `unknown` 路径冲突**（Judge B 提出）：
   本轮未触碰该文件故未改，**记入下一批**（改的时候要连带复核它引用的分类标签口径）。
7. **`ali-227` / `safeline` 的补环境规则未做成可执行件**：两者都是"环境数组/检测点 → 必须逐项实测"，
   本批只给判据与来源清单，**不提供通用补环境脚本**（通用补环境属 `web-js-env-patcher`，按分工不在这里重复实现）。
8. **360 切图顺序数组的示例是本文件自算的**（来源未给样本），已配机械 oracle（`verify-360-slice-order.py`
   断言「输出必须是 `0..31` 的排列」）——**自算示例不算来源证据**，故不与双源结论同级。

### B19 新增能力的复跑命令

```bash
# 1) 厂商判据器自检（71 项断言：19 条正例（含 2 条路由）+ 2 组判别对 + 5 条反例
#    + 阈值/单调性/确定性 + 路由 next_steps 必须指别的文件 + 文档锚点可达性）
python .claude/skills/web-verify-patcher/scripts/slider_vendor_identify.py --selftest

# 2) 厂商清单与文档锚点（应列出 17 族 + 极验路由）
python .claude/skills/web-verify-patcher/scripts/slider_vendor_identify.py --list

# 3) 用指纹判厂（正例：应判 tencent-turing，退出码 0）
python .claude/skills/web-verify-patcher/scripts/slider_vendor_identify.py -f artifacts/skill-evolution/b19-run-20260923-1020/fp-turing.json --explain

# 4) 反例：陌生指纹必须 unknown 且退出码 3（这是"没判出来"，不是失败）
python .claude/skills/web-verify-patcher/scripts/slider_vendor_identify.py -f artifacts/skill-evolution/b19-run-20260923-1020/fp-unknown.json --markdown

# 5) 腾讯防水墙旧形态必须被路由出去、不得判成 §3.1 新形态（应输出 tencent-tcaptcha-old）
python .claude/skills/web-verify-patcher/scripts/slider_vendor_identify.py -f artifacts/skill-evolution/b19-run-20260923-1020/fp-tencent-old.json --explain

# 6) 来源保真度核对（175 项字面量逐篇 grep，0 未命中为通过）
python artifacts/skill-evolution/tools/b19-verify-sources.py

# 7) 整体机械校验（0 阻断 / 0 告警 为通过）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown

# 8) 双镜像一致性（0 mismatch 为通过）
python artifacts/skill-evolution/tools/mirror-report.py .

# 9) 360 切图顺序的机械 oracle（**pipeline-only，不进技能库**；自算示例 + "必须是 0..31 的排列"约束，PASS 为通过）
python artifacts/skill-evolution/b19-run-20260923-1020/verify-360-slice-order.py

# 10) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b19-ledger.py
```

### 下一批（B20）取材建议（承接本节）

- 待处理 **452** 篇（台账 352 条后；候选 804）。
- 优先级：
  ① **验证码图像识别系剩余（~84 篇）**：真拼图 / 双缺口 / 旋转系的**协议侧**仍薄（本批只做了非极验滑块）；
     `web-verify-patcher` 的**类型清单三处并行维护**的结构性收敛仍在挂账（B5 起，已连续 14 轮）。
  ② **Cloudflare 系（CSDN 24 篇同题）**：B17 起连续三轮列为候选，B18 已实测确认信息量极低
     （22/24 截断、0 代码块）⇒ 正确处置是**做工证伪 + 只登记不落地**，并当作「语料同质化」案例写进 `forum-corpus-archival`。
  ③ **sign / 协议参数系剩余**：继续按「同一平台 ≥2 篇」聚簇补蓝图（B17/B18 两轮验证收益最高）。
  ④ **JSVMP 剩余**：符号执行 / 中间代码优化，落 `ast-deobfuscation` 既有文件。
- 候选新技能 `captcha-flow-orchestration` —— B5–B19 **十三次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

## 三·R、批次 B20 · 2026-09-23（验证码题型协议侧的稀疏区块：旋转系 / 手势系 / 数美三源 / 极验 v3 状态机）

**取材口径**：单一主题「**非滑块题型的协议侧补齐**」+ 两条既有能力增强 —— 13 篇覆盖
**旋转系（百度 v1/v2、小红书）+ 手势系（VAPTCHA）+ 数美（第三源固化）+ 极验 v3（AST 状态机与纯算）**，
其中 **VAPTCHA 拿到双源互证**（且互证的正是"一家认不出、一家认出是 murmurhash3_x64_128"这种只靠单篇拿不到的结论）。

**选它的理由（承接 B19 遗留①②）**：B19 的下一批建议里，
① 是「验证码图像识别系剩余（~84 篇）：**真拼图 / 双缺口 / 旋转系的协议侧仍薄**」，
本批直接把**旋转系与手势系**两条最薄的线一次做全；
② 是「`web-verify-patcher` 的**类型清单三处并行维护**的结构性收敛（B5 起挂账 15 轮）」，
本批不再继续挂账，改为**把它变成机械可校验的不变量**（见下）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取知识点 |
| --- | --- | --- | --- | --- | --- | --- |
| 353 | `52pojie-1806246-【验证码逆向专栏】某度滑块、点选、旋转验证码 v1、v2 逆向分析.md` | `6c57419e4035c8f9b6814f32932988b5` | 2026-09-23 | web-verify-patcher | evolve | 百度旋转/滑块/点选 **v1/v2 代际判据**（只看核心 JS 文件名 `mkd.js` / `mkd_v2.js`，不看接口名）；三接口链与**两套接口名**（`viewlog`/`getstyle`/`viewlog/c`）；`rzData` 两代结构（v2 的 `captchalist` 含 `spin-0`/`puzzle-0`/`click-0`）；**`ac_c` 四个口径**（v1 滑轨 212 在化简中被抵消、v2 旋转 238、v2 滑块分母 **290**、v2 点选为坐标+时间戳）；`fs` 的 AES 与 IV `as + appsapi0`(v1) / `appsapi2`(v2)；**三个报错码**（v1 `Unregistered Host` / `Invalid Request`、v2 `100600 Unauthorized Host`）；**收尾接口需 sleep 1~3 秒**（否则 `code 1 Verification Failed`）；`存在安全风险，请再次验证` 是正常态而非失败 |
| 354 | `52pojie-1792807-《某度旋转验证码逆向》（水贴冒泡）.md` | `8e6a334681219aa968bd31e7f9f51652` | 2026-09-23 | web-verify-patcher | evolve | 百度旋转：**互证「提交值 `fs = AES(rzData)`、可导库直接复刻」**与"该家存在两代形态"（本批唯一的字段级双源点；其余百度结论均为 1806246 单源） |
| 355 | `52pojie-1754224-简单聊聊旋转验证码攻防（24.03.19更新）.md` | `9922d448d42a7697023b1e3693d32b78` | 2026-09-23 | web-verify-patcher | evolve | 旋转系**通用方法论**（单源）：非 90° 倍数的旋转**必然引入插值伪影且会被网络学成特征**⇒ 高分辨率下应"先旋转再裁切缩放"；one-hot+交叉熵的**圆形距离失真**与圆形平滑标签；分类数不是越多越好；**鬼影**（明度/色相/饱和度涂抹 ⇒ imghash 攻法全挂、CNN 尚可）与**双旋转**的**互相关咬合法**（沿圆环展开成灰度序列求平移量）；回归损失改 SmoothL1Loss |
| 356 | `52pojie-1988302-xhs 某书 旋转验证码 图片识别+算法 纯协议.md` | `778a84d1030f43ee8ecfa5cc4cbef7a1` | 2026-09-23 | web-verify-patcher | evolve | 小红书**旋转**纯协议（单源）：`POST /api/redcaptcha/v2/captcha/register` → `/check`；`captchaInfo` 明密文**同一函数**；check 明文四件套 `mouseEnd`/`time`/`track`/`width`；**失败即重新取图重试**（识别 95%、协议 100% 靠的是循环而非单次识别率）；该来源用截图展示算法（未落到文字）⇒ 标为"需现场扣函数" |
| 357 | `52pojie-1888845-[验证码逆向]某手势验证码逆向分析.md` | `2b8d4f02e204889474104809b3bb6217` | 2026-09-23 | web-verify-patcher | evolve | VAPTCHA 手势（双源之一）：**四段链**（`{vid}` → `config`（返回 `knock`）→ `get` → `validate`（返回 `token`））；`en` 由 `GenerateFP`(canvas→base64→**CRC32**) 与 `hashComponents`(环境哈希) 等项构成；`secretC` 为固定值 `8549731620`；`globalMd5` 的 `splicing_obj` 拼接；图片 **5×2 = 10 片、源 400×230、每片 80×115**、顺序 `Decrypt(img_order, N)` 且**值 <5 贴下排语义**；**轨迹 +30 px 补偿**（canvas 230 vs 事件区 260）与**点间隔 <5 不入列**；`dt/ch/cw/v` 四件套 |
| 358 | `52pojie-2051922-某手势验证码纯算逆向分析.md` | `ed7da839d5b55be242af908d5fcfd89f` | 2026-09-23 | web-verify-patcher | evolve | VAPTCHA 手势纯算（双源之一，且给出**机制级算法识别**）：`en` 的 **11 项加和明细**与 `selectFrom(3,15)` 随机量；**`hashComponents` = murmurhash3_x64_128**（附完整 Python 实现 —— 另一篇只记为"没见过的哈希"）；**`Decrypt` 的公式 = `str(int(img_order) - N)` 左侧补零到 10 位**；`splicingObj` 与 validate 阶段"结尾多拼一个固定值"；渲染 **290×167**（与另一篇的 400×230 并存 ⇒ 画布尺寸现场量）；**`validate` 返回码表 12 项**（`0103` 成功 / `0108 Attack` 先怀疑轨迹 / `0109` 区分域名挂与 challenge 过期）；轨迹加密前存在一套清洗算法（细节未展开，标待复核） |
| 359 | `52pojie-1782883-【验证码逆向专栏】数美验证码全家桶逆向分析以及 AST 获取动态参数.md` | `da37c5fa5a131195027a02659e1006e0` | 2026-09-23 | web-verify-patcher + ast-deobfuscation | evolve | 数美全家桶 + **AST 直取动态参数**：`conf` 的 `model` **六题型枚举**（`slide`/`auto_slide`/`select`/`icon_select`/`seq_select`/`spatial_select`）+ `conf`/`register`/`fverify` 三接口；`captchaUuid = yyyyMMddHHmmss + 18 位`（正文写 17、代码 `range(18)` ⇒ 以代码为准）；`getEncryptContent` = **DES-ECB + ZeroPadding**，`appId`/`channel`/`lang`/`getSafeParams` 四个固定入参**可整段写死**；`this._data` **三套题型结构**（滑块 / 点选类坐标先归一化 / 无感）；`code` 枚举（`1100`/`1901`/`1902`/`1903`/`9101`）与 `riskLevel`；**多域名热备**（替换不生效的真因）；**AST 目标 = 12 个提交参数名 + DES key**（不是"还原所有混淆"），含适用版本区间与"结果有序未去重" |
| 360 | `52pojie-1881927-数美点选验证协议全面剖析.md` | `fe7a874912ba303b49ee9487b37316ba` | 2026-09-23 | web-verify-patcher + ast-deobfuscation | evolve | 数美点选**逐字段 DES key 对照表**（`mp/oc/xy/jo` 为固定入参可直接写死；坐标/轨迹/尺寸各带一把版本内 key）；**点选坐标的三段语义 `[x / 图宽, y / 图高, 时间戳]`**（不是 `[x, y, t]` 的顺序）；**动态 JS URL 导致断点只生效一次** ⇒ Charles `Map Local` / mitmproxy 回写固定文件；控制流平坦化的 **switch 执行顺序由数组给定**（`2,0,3,4,1`）；解混淆法：抠出解码函数 → node CLI → Python 正则批量替换 |
| 361 | `52pojie-2059636-数美滑动验证码逆向.md` | `749e1f8071afb113db0031d98d3e2439` | 2026-09-23 | web-verify-patcher | evolve | 数美 2025 版滑动（**第三源，用于证明"参数名与 key 随 SDK 版本变"**）：`register` 返回 JSONP 形态（**需先按文本正则取括号内再解析**）、提交量 `gg/hg/th` 与本版 key（`5129c2c2`/`be221ccf`/`231a540d`）、`protocol=185`（点选版为 `180`）、图片前缀 `castatic.fengkongcloud.cn`、滑块距离用 Canny 边缘模板匹配后 **÷2**、两种可运行轨迹生成实现 |
| 362 | `52pojie-2045347-[原创] 某验3底图还原python算法改写.md` | `ea9821b999ed466ecc9d65f62fa4eb54` | 2026-09-23 | web-verify-patcher | evolve | 极验 v3 **底图还原的 Python 改写**：52 片顺序数组 `Ut` 为固定值；取片坐标 `c = Ut[_] % 26 * 12 + 1`、`u = (25 < Ut[_]) ? a : 0`；每片 `10 × a`；画布 `260 × r` —— 与既有 `restore_slices.py --model gt3` 的几何互为独立互证 |
| 363 | `52pojie-2055730-某验3AST分析及实现.md` | `a708c8a32f14b6083a47eda3441002ed` | 2026-09-23 | ast-deobfuscation | evolve | 极验 v3 **AST 还原（一）**：文件名 `fullpage.9.2.0-guwyxh.js` / `slide.7.9.3.js`；结构 = 对象 `Vwtrj` 的四个方法（`$_CV` 字符解码 / `$_DD` 控制流状态表）+ 一个大自执行函数；**eval 前五条语句进内存**以获得解码器与状态表；**3-declarator 别名族**（`concat` + `shift`）还原；**`for (; S !== <下标表达式>;) switch(S)` 恒为真、按状态顺序执行**，展平时取 case 的 consequent 并去掉尾部 `break` |
| 364 | `52pojie-2058187-手把手带你AST还原某验三代(一).md` | `4003eb8163c55d2073a16625f702aa0d` | 2026-09-23 | ast-deobfuscation | evolve | 极验三代 **AST 还原（一）独立第二源**：三个混淆文件 `slide.7.9.3.js` / `fullpage.9.2.0-guwyxh.js` / `gct.js`；`lACSb.$_Ce` 的**两种字符还原形态**（直接 `$_DAGEI(n)` 与 `["$_DAHCK"].concat(...)` 别名间接）；状态值形如 `lACSb.$_DN()[6][16]`（**二维取数，不是裸数字**）；还原法 = **把所有取值写进 map 后循环判断**；用 `scope.getBinding` + `referencePaths` 处理别名、`VariableDeclarator` 拆分逗号表达式 |
| 365 | `52pojie-2063429-某验3纯算逆向分析.md` | `ea0034e0d35ed4011638a9d6ab8b0f05` | 2026-09-23 | web-verify-patcher + ast-deobfuscation | evolve | 极验 v3 **纯算全链**：六请求链与**三个 `w` 的分工**（第一次 `w = i + r`，`i` = 魔改 base64(AES)、`r` = RSA(aeskey) 的 **16 进制字符串**；第二次 `w` 无 RSA；第三次同第一次）；AES key = **16 位 16 进制随机**；**魔改 base64 的码表**（`=` 换成 `.`）；`tt` 由 4 段二进制串拼接后**每 6 位查 chars**；`userresponse` 由 challenge 末两位 **36→10 进制** + 前 32 位贪心生成；`rp = md5(gt + challenge[:32] + passtime)`；`ep` 的 `fp/lp/em/tm`；**AST 只解三步（OB / 合并 switch / unicode）就够**（可解一步替换验证一步） |

### 本批次技能变更汇总（B20）

**新建技能 0 个**（B5–B20 **十四次**确认不新建 `captcha-flow-orchestration`；
"旋转/手势"属既有 `rotate` / `trace-draw` 题型的协议侧，按"避免滥建冗余技能"约束**在最近邻模块扩展**）；
**演化既有技能 2 个**；**结构性收敛 1 项（挂账 15 轮）**；附带修复 12 项（5 项"整节贴 ★双源"的字段级降级由来源核对自查抓出，6 项由两个 judge 抓出，1 项为校验器自指缺陷）。

- **`web-verify-patcher`（主）**
  - 新增 `references/rotation-and-gesture-protocols.md`（**旋转系与手势系的协议唯一权威源**）：
    §1 分流（`rotate` / `trace-draw`+`gesture-draw` / `dual-ring` / 弧线滑块）·
    §2 旋转系（§2.1 通用方法论：插值伪影、鬼影、双旋互相关咬合；§2.2 百度 v1/v2 两代四口径与三个报错码；
    §2.3 小红书 `redcaptcha`）· §3 手势系 VAPTCHA（四段链 / `en` 11 项 / 图片 5×2 还原 / 轨迹两条坑 / 状态码表）·
    §4 两族共性 5 条 · §5 反例黑名单 6 条 · §6 来源与**字段级强度**声明（含 3 处明确挂账）。
  - 新增 `scripts/rotation_and_gesture_calc.py`（零依赖）：`baidu-ac-c`（v1/v2、旋转/滑块四个口径）、
    `vaptcha-order`（减法 + 补零 + **"必须是 0..9 的排列"**这一自检）、`vaptcha-restore`（PNG 5×2 还原，
    非排列顺序直接拒绝）、`murmur3`（murmurhash3_x64_128，**如实声明未与公开测试向量对齐**）；
    `--selftest` **27 项**。
  - 新增 `scripts/check_verify_docs_consistency.py`（**本轮的结构性收敛**，见下）：A~I 九组一致性断言（含"判断表 ↔ 类型说明""`captcha_variant` 取值封闭""厂商标签集合"三组新增面），`--selftest` **30 项**，另配 **10/10** 的故障注入阳性验证。
  - `references/slider-vendor-matrix.md`：§3.3 数美由 `单源` 升级为 **★三源**（并写下本批最重要的结论
    ——**提交参数名与 DES key 随 SDK 小版本变，不可当判据**：`tm/tb/ly/fr`、`qd/mu/en/kq`、`gg/hg/th`
    是同一家）；§2 矩阵第 3 行与 §7 来源表同步（新增 B20-1~B20-3 三行）。
  - `references/provider-execution-notes.md`：百度旋转小节改写为"最容易踩的三条 + 指向协议全文"
    （补齐 `mkd.js`/`mkd_v2.js` 代际判据、两套接口名、`fs` 二次加密的两派口径、三个报错码、sleep 坑、`cdnversion` 断点坑）；
    数美小节同步收敛为"判据 + 指针"并写入**参数名不可当判据**。
  - `references/captcha-types.md`：`rotate` 补协议指针与 `dual-ring` 子类；`trace-draw` 补
    **`gesture-draw` 子类**（手势 ≠ 滑块：提交量是轨迹而非距离）与两条轨迹坑。
  - `references/solution-playbooks.md`：`rotate` / `trace-draw` 两节加协议指针。
  - `references/motion-and-coordinate.md`：百度旋转行的 `ac_c` 四个口径与 `mv` 实测不校验的口径落到表里。
  - `references/verification-workflow.md`：**关闭 B19 遗留④** —— 明确"厂商允许是 `custom-or-unknown`，
    证据不足时如实写，不要为了填表硬凑"。
  - `scripts/slider_vendor_identify.py`：数美规则补**版本稳定信号**（`fengkongcloud`/`castatic`/三接口路径/
    `auto_slide` 等 model 枚举/`getEncryptContent`）与 recipe 警示；新增自检断言 **+3 条**
    （"域名 + model 枚举应判出"、"只给某一代参数名 `gg/hg/th` 必须判不出来"、**"数美小节必须写出参数名随版本变"**
    的文档一致性断言）⇒ 自检 71 → **74 项**（该文档一致性断言的作用：防止"脚本知道、文档没说"的漂移）。
- **`ast-deobfuscation`（演化）**
  - `references/patterns/geetest4.md` 新增 **「v3 顺序恒真状态机」**节：判据三条、
    **为什么不能只看源码顺序**（状态值由表函数给出且**同一数值落在多个下标上** ⇒ 必须按值比较）、
    **两种声明位置**（for-init / 前一条语句）、展平前的"别名归一 → 状态机展平 → 通用平坦化"顺序，
    以及与既有 `geetest4-guarded-pass.js` 的分工（后者是"按源码顺序展平"的快速路径，
    **两者结论不一致时以按值推导的为准**）。
  - 新增 `scripts/patterns/geetest3-state-machine-pass.js`（零依赖）：按键值链推导真实执行序并
    **断言"源码顺序 == 推导顺序"**（`--check` 不一致时退出码 2）；**默认不删链外不可达 case**（而是跳过并报错），
    确认死代码后才 `--drop-unreachable`；**只在"该名字全程序只剩声明本身"时才删掉残留声明**（防 `return S` 变 `ReferenceError`）；
    `--selftest` **32 项**，含一条**照抄真实样本**（同值多下标 + 末态 `return`）的 `--table` 回归夹具，以及两条**"状态变量逃逸出循环"**的语义等价夹具（改前/改后各跑一遍比对返回值）。

### 本轮的结构性收敛：把"类型清单三处并行维护"变成机械不变量（B5–B19 挂账 15 轮）

**问题**：`references/captcha-types.md`（判断表 + 类型说明）、`SKILL.md`（分类标签）、
`references/solution-playbooks.md`（类型小节）三处维护同一份清单，靠人眼同步，已挂账 15 轮。

**为什么不是"物理合并成一处"**：三处在渐进式披露里各有职责 ——
`SKILL.md` 需要一份**总是加载**的轻量索引、`solution-playbooks.md` 需要**按类型的方案小节**、
`captcha-types.md` 需要**判断表 + 证据要求**。删掉任意一处都会让读者多跳一层或失去随手可查的索引。

**落地方案**：新增 `scripts/check_verify_docs_consistency.py`，把**一致性本身**变成可执行断言（A~I 九组）：
A 三处集合一致 · B 三处顺序一致 · C 无重复项 · D/E 权威源声明齐全 · F 清单规模 ≥ 20
（**防止解析器失效后"校验通过"的假绿**）· G **判断表 ↔ 该文件自己的类型说明小节**一一对应 ·
H **`captcha_variant` 取值封闭**（本批新增取值表，扫描全技能文档/脚本的字面量用法）·
I **厂商标签集合一致**（`SKILL.md` ↔ `provider-products.md` 厂商信号表；厂商清单顺序无语义，只比集合）。
并用 `artifacts/skill-evolution/tools/b20-verify-consistency-checker.py` 做**阳性验证 10/10**：
在临时副本上分别注入"多一个类型 / 改名 / 顺序漂移 / 少一个小节 / 删权威源声明 / 删脚本指引 /
类型说明脱节 / 自造 `captcha_variant` / 厂商表脱节"九种漂移，逐条确认校验器变红，
并对**未改动副本**确认通过 —— 不注入故障就分不清"0 阻断"是"真的没问题"还是"新规则没生效"。

> **落地时抓到的两个自指缺陷（都已修，也是这条路的固有风险）**：
> ① 校验器**把自己扫了出来**：它的自检夹具里必须写"故意非法的 `captcha_variant`"，
> 于是 H 项把校验器自身判成违规 ⇒ 显式排除该文件（"校验器不是使用点"）；
> ② `captcha_variant` 取值表的**表头第一列写的就是** `` `captcha_variant` ``，
> 初版解析把表头也当成一个取值（取值表被数成 9 项、真实 8 项，且假取值混进允许集）
> ⇒ 改为"只收集 `| --- |` 分隔行之后的行"，并补一条"表头不得被当成取值"的回归断言。

### 独立评审（Judge A / B）

评审前**先冻结**（`artifacts/skill-evolution/b20-freeze-20260923-1154.tsv`）。
评审期间主执行者同步做了来源字面量核对（`b20-verify-sources.py`，13 篇 / 194 项），
并据此**主动改掉 5 处过度标注**；judge 按**磁盘当前内容**复核。

| Judge | 视角 | 提出的问题 | 处置 |
| --- | --- | --- | --- |
| A | 来源保真度（逐字面量 grep + 实跑复现） | **2 阻断（判 revert）+ 6 次要**：<br>① 数美点选坐标三段语义**自相矛盾**（写着"别按 `[x,y,t]` 读"，而两篇来源 `1782883:237-242`、`1881927:507-518` 都是 `co[0]/300; co[1]/150; co[2]=time_` 的 `[x,y,t]` 形状）<br>② `geetest3-state-machine-pass.js` 的**形态①（声明在 for-init）没有声明安全守卫**：`for (var S=…; …;){…} return S;` 展平后 `var S` 被一起删掉（judge 实测复现：产物 `A(); B(); return S;`、`flattened=1` 且无告警 ⇒ 静默 `ReferenceError`）<br>③ `--markdown` 在状态表未解析时打"否"（顺序其实未知）<br>④ `geetest4.md` 把**自建夹具**的表值写成"实测样本里…"<br>⑤ §6 漏了**带外来源** `52pojie-2057521`（`p` 由 Worker 的 `powMap` 算、`common.mv` 不校验、`getNewKey` 查表选哈希、`cdnversion` 后缀四条只有它支持）<br>⑥ `ww` 被写成"坐标与宽高"（实为常量 `28504615`）、`captchaUuid` 的 18 位/字母表被写成硬约束（第三源用 16 位 + 完整 base62 也过）、"hex 前 16 位"有歧义 | **全部成立、全部当轮修完**：① 改写为"就是 `[x,y,t]`，只是先按原图 300×150 归一化"；② 新增 `countExternalRefs`：**逃逸出循环时补终态赋值 `S = <终态表达式>`**（形态①另补回 `var S` 声明），无法保持语义时（靠 `return` 退出且外部仍读 `S`）**直接跳过并报 `state-var-escapes-loop`**；③ 改为"未知（状态表未解析）"；④ 改为"本技能回归夹具（照抄函数形状自建），来源未给出表的实际内容"；⑤ §6 增列该来源行并逐条注明"只有它支持"；⑥ 三处按来源改正/降级 |
| B | 文档一致性与集成（真跑命令 + 独立判断） | **0 阻断 + 6 次要**：<br>① 数美 **`★三源` 计数自相矛盾**（§3.3 列了四篇却写三源、§7 出现两条"三源之三"）<br>② `provider-execution-notes.md` 的参数名枚举是矩阵的**子集**（两处并存必然各自漂移）<br>③ 厂商标签清单**无任何校验**且已漂移（`SKILL.md` 有 `xiaohongshu`/`vaptcha`，`provider-products.md` 没登记）<br>④ 校验器三处盲区：判断表 ↔ 类型说明、`captcha_variant` 合法取值、厂商标签清单<br>⑤ `description` 只剩 13 字符余量<br>⑥ `geetest4.md` 文件名与内容范围（同时承载 v3/v4）不符 | **①~④、⑥ 当轮修完**：① 统一为 `★四源` 并写明"四篇"是哪四篇；② 降级为指针（"逐字段对照表见 §3.3，这里不复述"）；③ 补 `provider-products.md` 两行 + 两个产品小节；④ 落地为上面的 G/H/I 三组断言（含 10/10 阳性验证）；⑥ 在文件内加 v3 节交叉引用与脚本指针，**改名挂账到下一批**（改名要连带改三处以上引用）。⑤ **记录不改**：本批新增的触发词（手势验证码/手势/vaptcha）是必要的，宁可不加冗余词也不删已确认的触发词 |

**棘轮结论：keep** —— Judge A 判 `revert`，但两条阻断**都是可修复的局部缺陷**（不是"这次演化方向错了"），
且修复后**有强证据**：② 的回归夹具用「改前/改后各跑一遍、比对返回值」验证语义等价（`["ABC",0]` 一致），
并单跑 judge 的原始复现用例确认 `var S` 与终态赋值都在；① 的改写直接对齐两篇来源的字面代码。
Judge B 的 0 阻断 + 6 项次要亦已全部处置或明确挂账。
⇒ 按 B8/B19 既定口径（**能用修复解决的不回滚**）**保留本次演化**，并在本表逐条留痕。

**judge 的三条最有价值发现**：
① **"自相矛盾的句子"比"写错的常量"更危险**：常量写错会被来源核对抓住，
而"形状写对了却补一句'别那么读'"会让读者主动走错方向 —— 只有逐字回源 + 对照来源代码才能发现；
② **AST 改写 pass 的"声明安全"必须覆盖所有声明形态**：初版只给形态②（声明在循环前）加了守卫，
形态①被静默删掉，且**在 28 项自检全绿的情况下依然存在** —— 自检里没有"逃逸出循环"的夹具，
这就是"测不到的分支等于没写"；
③ **同一份知识写两处，即使当时一致也会分叉**（数美参数名枚举）：正确处置是把第二处降级成指针 ——
与本轮 G/H/I 三组断言同源，只不过前者靠人守、后者靠机器守。

### 本批次的方法论增量（可复用）

1. **"整节贴 `★双源`"是本流水线最容易犯的系统性错误（B19 提出，B20 抓到实例）**：
   本批初稿里 §2.2 百度、§3.1 四段链、§3.4 轨迹三处都整节贴了 `★双源`，
   而实际只有"其中一两条"是双源，其余是单源。
   ⇒ **强度标注必须落到字段级**，并且要**区分"直接读到 JS"与"作者用 Python 复刻能对上"** ——
   后者是复刻口径，必须标 `待复核`（本批 `splicing_obj` 的排序细则就是这一类）。
2. **"一家认不出、另一家认得出"是双源里价值最高的一类**：VAPTCHA 的 `hashComponents`，
   一篇（2024-02）明确写"我没见过这种加密"，另一篇（2025-08）给出完整实现并点名
   **murmurhash3_x64_128** ⇒ 双源不只互证"存在"，还能**补齐算法识别**。
   这类结论**单篇永远拿不到**，是本流水线取材时应当优先寻找的信号。
3. **"参数名随版本变"必须写进文档与判据器两侧**：数美三篇的参数名全不一样
   （`tm/tb/ly/fr` / `qd/mu/en/kq` / `gg/hg/th`），如果按参数名判厂就会**在版本升级当天全线误判**。
   ⇒ 判据只能锚在**域名、`captchaUuid`+`organization`、`model` 枚举**这类版本稳定的信号上；
   并配一条"只给某一代参数名必须判不出来"的**反例断言**。
4. **本批最值得复用的断言模式："顺序一致"**：
   `geetest3-state-machine-pass.js` 断言"源码顺序 == 按值推导的执行顺序"，
   `check_verify_docs_consistency.py` 断言"三处清单顺序一致"。
   两处都是同一件事 —— **顺序在语义上是有信息的（执行序 / 分类优先级），
   而"看起来对"的产物在顺序错时不会报任何错**。凡遇到"顺序即语义"的场景，都应把顺序提成断言。
5. **"阈值/边界类断言必须有专门的边界用例"（B19 提出，B20 第二次应验）**：
   一致性校验器自检初版把清单规模阈值写死在 `check()` 里，
   于是 5 项合成清单让"清单过小"分支**先触发**、把其余 5 条断言全遮住（7/12 通过，看起来像校验器坏了）。
   ⇒ 阈值必须参数化，并补一条"**正好等于阈值不得报错**"的边界用例（判据是 `<` 不是 `<=`）。
6. **故障注入式的"阳性验证"要连"注入是否成功"一起断言**：本轮第一次阳性验证失败，
   原因不是校验器失灵，而是**故障注入脚本只替换了第一处**，而 `唯一权威源` 在文档里出现两次
   ⇒ 校验器当然看不见。**"注入后必须变红"与"注入本身必须成功"是两条不同的断言**。
7. **"不知道就是不知道"要继续保持**：本批 3 处明确挂账
   （`encryFunc(a,b)` 入参顺序、VAPTCHA 图片顺序里 `ha`/`hb` 的归属、`splicing_obj` 的排序细则），
   文档一律只给**复核方法**、不给猜测值 —— 与 B8 起的口径一致。

### 本批次明确留白（写进文档而非假装支持）

1. **`murmur3` 未与公开测试向量对齐**：本机没有第二个参考实现，
   自己照抄实现第二遍不构成独立验证（B19 的"自证式第二实现"教训）。
   `--selftest` 只断言可自证性质（空串 → 32 个 0、长度 32、确定性、种子有效、四种输入长度分类互不相同），
   **脚本 docstring 与协议文档都如实标注**这一点。
2. **`vaptcha-restore` 不缩放**：保持源几何还原（`400×230`），
   渲染尺寸（`290×167`）是站点值、且两份来源给出的数值不同 ⇒ 不假装能"还原成渲染态"。
3. **旋转系的角度模型侧未新增训练资产**：本批只收方法论与判据
   （插值伪影、鬼影、双旋咬合），模型训练闭环仍以 `captcha-model-training.md` 为准。
4. **小红书 `captchaInfo` 的加解密算法未落到文字**：来源用截图展示 ⇒
   文档只给"两接口 + 字段 + 明密文同函数"的定位结论，**不给算法**。
5. **`geetest4.md` 文件名与内容范围已不匹配**（同时承载 v3 与 v4）：
   本批在文件内加了 v3 节的交叉引用与脚本指针，**但未改名**（改名要连带改 SKILL.md 导航、
   `obfuscation-detector.md` 分流表、`pattern-layering.md` 等多处引用，收益低于风险）；
   记入下一批，改的时候先跑 `check_skill_integrity.js` 的引用可达性检查。
6. **`websocket-reverse` 的文档/命令一致性（B19 判 worse）本轮未触碰** —— 仍留在待办。

### B20 新增能力的复跑命令

```bash
# 1) 旋转/手势换算器自检（27 项）
python .claude/skills/web-verify-patcher/scripts/rotation_and_gesture_calc.py --selftest

# 2) 百度 ac_c 四个口径（v1/v2 × 旋转/滑块；v2 滑块分母必须是 290）
python .claude/skills/web-verify-patcher/scripts/rotation_and_gesture_calc.py baidu-ac-c --version v2 --mode slide --distance 145 --pretty
python .claude/skills/web-verify-patcher/scripts/rotation_and_gesture_calc.py baidu-ac-c --version v1 --angle 90 --pretty

# 3) VAPTCHA 顺序（减法 + 补零；非 0..9 排列会给出 warning）
python .claude/skills/web-verify-patcher/scripts/rotation_and_gesture_calc.py vaptcha-order --img-order 1234567890 --n 123456780 --pretty

# 4) 类型清单三处一致性（本轮的"结构性收敛"）
python .claude/skills/web-verify-patcher/scripts/check_verify_docs_consistency.py --markdown
python .claude/skills/web-verify-patcher/scripts/check_verify_docs_consistency.py --selftest

# 5) 一致性校验器的阳性验证（临时副本注入 6 种漂移，必须逐条变红）
python artifacts/skill-evolution/tools/b20-verify-consistency-checker.py

# 6) 极验 v3 状态机展平（28 项自检 + 真实形态夹具的 CLI 端到端）
node --require ./artifacts/skill-evolution/tools/node-resolve-preload.js .agents/skills/ast-deobfuscation/scripts/patterns/geetest3-state-machine-pass.js --selftest
node --require ./artifacts/skill-evolution/tools/node-resolve-preload.js .agents/skills/ast-deobfuscation/scripts/patterns/geetest3-state-machine-pass.js \
  artifacts/skill-evolution/fixtures-20260923-1154/geetest3-real-sample.js /tmp/out.js \
  --table artifacts/skill-evolution/fixtures-20260923-1154/geetest3-real-sample.table.json --markdown

# 7) 厂商判据器自检（74 项，含数美三条新断言）
python .claude/skills/web-verify-patcher/scripts/slider_vendor_identify.py --selftest

# 8) 来源保真度核对（13 篇 / 194 项，0 未命中为通过）
python artifacts/skill-evolution/tools/b20-verify-sources.py

# 9) 整体机械校验（0 阻断 / 0 告警）与双镜像一致性（0 mismatch）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 10) 状态机 pass 的边界阳性验证（19 项：乱序 case / 缺表项不写盘 / 逃逸 / 幂等 / node --check）
python artifacts/skill-evolution/tools/b20-verify-pass-edges.py

# 11) 一键验收（把上面 1~10 全部跑一遍并留痕到 artifacts/skill-evolution/b20-run-20260923/）
bash artifacts/skill-evolution/tools/b20-acceptance.sh

# 12) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b20-ledger.py
```

### 下一批（B21）取材建议（承接本节）

- 待处理 **453** 篇（台账 365 条后）。
- 优先级：
  ① **验证码图像识别系剩余**：真拼图 / 双缺口 / 旋转**点选坐标侧**仍薄；
     另外本批证明"**同一家 ≥2 篇**"是最值钱的取材信号（VAPTCHA 的 murmur 识别就是这么拿到的），
     继续按"同平台聚簇"找下一组。
  ② **Cloudflare 系（CSDN 24 篇同题）**：B17 起连续五轮列为候选，B18 已实测确认信息量极低
     （22/24 截断、0 代码块）⇒ 正确处置仍是**做工证伪 + 只登记不落地**，
     并当作「语料同质化」案例写进 `forum-corpus-archival`。**本批再次跳过，若下批再跳应直接执行工证伪收口。**
  ③ **sign / 协议参数系剩余**：继续按「同一平台 ≥2 篇」聚簇补蓝图。
  ④ **JSVMP 剩余**：符号执行 / 中间代码优化，落 `ast-deobfuscation` 既有文件。
  ⑤ **本批两处结构债**：`geetest4.md` 改名（v3+v4 同名不符）与
     `websocket-reverse` 的文档/命令一致性（B19 判 worse 后未动）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B20 **十四次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

## 三·S、批次 B21 · 2026-09-23（CSDN 同题聚簇**工证伪收口** + ts 帧加密簇蒸馏）

取材口径：**先执行 B20 挂账的「工证伪」，再按「同一主题 ≥2 篇」聚簇蒸馏**。
① 「CSDN Cloudflare 同题」自 B17 起连续五轮列为候选、五轮跳过；B20 明确「若 B21 再跳，应直接工证伪收口」
⇒ 本批用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化，**推翻了历轮两条前提**：
「22/24 截断」未复现（实测 54%）、「语料同质化」不成立（两两 Jaccard 最大 **0.024**，不是同文）；
唯一站得住的判据是「**96% 无代码块**」。**处分单位因此降回单篇**，25 篇里 24 篇 `skip`、
1 篇例外单独处置（仍不落地，只摘走 2 条判据）。
② 主簇取 **ts 帧加密 / PES-NALU / m3u8 key（10 篇）**，落 `stream-drm-reverse`；
`52pojie-1671722` 的**双向控制字符**与三段式 AST 还原落 `ast-deobfuscation`。

| 366 | `52pojie-1875225-ts帧加密案例(一).md` | `de73a938f3166d256bad71cb1f4bcae2` | 2026-09-23 | stream-drm-reverse | evolve | 「ts 帧加密案例（一）」——本批 **C 层形态学的第一源**：ts 加密四分（整体 / 文件头 / 帧 / 混合）、**188 字节 `0x47` 判据**；帧加密再分 **PES 整体 / NALU 头 / NALU 内容**三档，各有可辨认的「残缺形态」（PES 整体⇒只剩 PES 头；NALU 头⇒缺 sps/sei、pps 长度离谱、关键帧不见；NALU 内容⇒有声音花屏）；**wasm2c + 手写 `imp.c`** 路线全流程（`_emscripten_asm_const_ii` 按 `i1` 常量返回字符串、`DYNAMICTOP_PTR` 手工 memcpy 4 字节、`wasm_rt_allocate_funcref_table`）；导出壳解密失败 → IDA 认出 **TEA** → 改调**未导出的 `func60`**且第 4 参是**自增计数器**；NAL 切分的 off-by-one（下一个起始码是 `00 00 00 01` 时 end−1）；建议**提码流合 mp4 而非重封 ts** |
| 367 | `52pojie-1882587-ts帧加密案例(二).md` | `f8955567d742cde28a9ffc409803544c` | 2026-09-23 | stream-drm-reverse | evolve | 「ts 帧加密案例（二）」——**SAMPLE-AES 粒度的唯一来源**：只加密 `nalu_type` 1 与 5，`encrypted_size = 16*((len-1)/16)` 且 **`len%16==0` 时再减 16**（末块留明文），**每 160 字节只加密 16 字节**，**IV 每个 NALU 重置**；**EBSP 替换表**（`000000→00000300` 等）；`hls.js` 解密点（`loadKeyHTTP` / `parsePES` / `parseAVCPES` / `getAvcEncryptedData` / `SampleAesDecrypter`）与**顺序陷阱**「解复用先于解密 ⇒ 改 SampleAesDecrypter 反而更糟」；只加密 1 / 5 / 7 的观感差异与「先写明文 sps/pps ⇒ 只加密 SPS 也能播」；**SDT 侧信道**（`free_CA_mode` + Service descriptor 自定义字符串可藏 IV/算法）；bento4 `mp4hls` 的 `Options.encryption_mode` / `WritePES` / 188 组装；调试基建（`Ctrl+F5` 强刷、清缓存重启） |
| 368 | `52pojie-1957747-WEB前端逆向TS PES NALU解密.md` | `f76a590eb13271f13b3857edb7fd7af4` | 2026-09-23 | stream-drm-reverse | evolve | 「WEB 前端逆向 TS PES NALU 解密」——**第二源，且给出更轻的路线**：`wasm2wat` → 导出表加一行 `(export "func60_TEA" (func 60))` → `wat2wasm` → 替换 js 内嵌 base64（`wasm-objdump -j Export -x` 校验），**不必碰 C**；**接口层四 URL 语义**（`hls_url` 明文但分辨率锁死 / `hls_enc_url` / `hls_h5e_url` / `hls_enc2_url`）；**导出壳 `func54_vodplay` 带环境检测** ⇒ 只解一部分 NALU ⇒ 「部分画面仍花屏」；**`func58_TEA` 与 `func60_TEA` 不等价**（每个 PES 有 8 字节差，用错只是「底部一条细花」）；「对候选函数全部设断、看环境正常/异常两次命中差」是选对入口的唯一可靠办法；最小 TS/PES/NALU 解析（`PUSI` 累积一个 PES、AFC 三分支、`FindNalUnitStart` 源自 H264.bt）与 **`Scatter_PES` 打散回填**路线；工具链（TSDuck `tsp -P pes ... --multiple-files`、010 Editor TS.bt/H264.bt、Elecard）；Node 加载 Emscripten 产物的 `onRuntimeInitialized` 套路；油猴对 blob+`importScripts` 的 worker 不生效 ⇒ 改用 Overrides |
| 369 | `52pojie-1772146-某猫视频加密响应从app到web端的分析.md` | `3ef47d4348b6328402face9ba93d9af0` | 2026-09-23 | stream-drm-reverse | evolve | 「某猫视频加密响应从 app 到 web 端」——**跨端密钥复用**：App 侧死磕不出解入口时，去**同站 Web 端**扣（本题 Web 端把 AES-**ECB** 明文 key 直接摆在代码里），拿到即解 App 响应；反面教训：**盲目 F11 会跑进「图片解密」处**，回退到断点用 F9 单步才找到真正的响应解密点（响应早在更早的拦截层就解过了） |
| 370 | `52pojie-1585958-破解某网课的m3u8文件的key加密.md` | `9bba2d979afc93fbc9a59d76df130761` | 2026-09-23 | stream-drm-reverse | evolve | 「破解某网课的 m3u8 文件的 key 加密」——**厂商双层派生的第一源（某利威 / polyv 系）**：第 1 层解配置：`key = MD5(vid)[:16]`、`iv = MD5(vid)[16:]`（同一串 MD5 前 16/后 16），解出后**再 base64 解码**才是 JSON，取 `seed_const`；第 2 层解 key 文件：**32 字节 ⇒ 不是 16 ⇒ 必有包装**，`key = MD5(seed_const)[:16]` + **固定 base64 IV**（`AQIDBQcLDRETFx0HBQMCAQ==`），解出**取前 16 字节**；`vid` 取视频链接后的参数；key URI 直连 403 ⇒ 链接另有 token 加固 |
| 371 | `52pojie-1988537-某网课平台m3u8 key分析以及脚本下载.md` | `b9231f03fee2894b494e161a3e76f137` | 2026-09-23 | stream-drm-reverse | evolve | 「某网课平台 m3u8 key 分析以及脚本下载」——**「名字像」的函数往往是壳**：断 `onkeyload` 拿不到，改断 `loadsuccess` 立刻拿到 16 字节明文 key；**`URI="base64:<b64>"` 内联 key** 的下载器约定（key 转 base64 直接写进 m3u8，省掉落地 key 文件）；**wasm 堆定址免扣**（从 `decoderModule.HEAPU8.buffer` 固定偏移取 16 字节，代价是偏移随版本变）；油猴 XHR hook + 本地 Flask 回写 m3u8 的「浏览器取证 → 本地回写」闭环；key 文件 33 字节（正常 16） |
| 372 | `52pojie-1915933-【前端甜点】某视频网站的m4s视频 音频下载方案（20240420）.md` | `a429d4b280456884a6eee700161ab288` | 2026-09-23 | stream-drm-reverse | evolve | 「某视频网站的 m4s 视频/音频下载方案」——**浏览器取证 → 本地落盘的通用小道**：Chrome 升级后 `createObjectURL(blob)` + `a.download` 会把域名拼坏（`https://www.example.comhttps://www.example.com/...`），改走`FileReader.readAsDataURL(blob)` 拿 base64 → 本地 `b64decode` 落盘；这属于**工具链退化**类坑：功能没了不代表路没了，换载体（base64）即可 |
| 373 | `52pojie-1671722-某影视站加密js的还原及自动化获取真实视频地址.md` | `778e8cef7c680daee267562388c469a6` | 2026-09-23 | ast-deobfuscation | evolve | 「某影视站加密 js 的还原及自动化获取真实视频地址」——**双向控制字符（Bidi）伪装**的唯一来源：「左括号高亮出来还是左括号、函数体看着没闭合、却**不报错**」= 编辑器显示被 `U+202E` 一族反转，**不改语义、只改显示**（照「看起来的样子」写 pass 会静默改坏程序）；配合「**WS 承载加密数据**（先 WS 一次再请求 m3u8）」：`decryptPackData` 收、AES-CBC 发，`hex.parse("05B1") ⇒ [0x05,0xb1]`、密文 hex 大写；`sign = HMAC-SHA256(url, key)`，且 **HMAC key 与 AES key/IV 明显同源**（`55ca5c4` 前缀一致、`d11424dcecfe16c0` 整段复现）⇒ 同站多密钥常由同一素材拼接；三段式 AST 还原（扣真函数求值 → `obj["prop"]` 取对象字面量 → `obj["Fn"](args)` 内联函数体）与**暗桩处置**（`getCookie`/`setCookie` 布尔短路 `return true`、死循环暗桩把调用注释掉） |
| 374 | `csdn-159429874-深入理解Cloudflare Turnstile：工作原理分析与Python自动化解决方案.md` | `e58e2f53a3ce7c8b4dcc80358cd2aabc` | 2026-09-23 | web-js-env-patcher | evolve | **工证伪的例外**：25 篇里**唯一**有代码块的（6 个 / 340 行），但 6 个块全是**打码平台 SDK（`passxapi`）与 Playwright 骨架**，无自实现算法且代码被采集器换行污染 ⇒ 仍不落地；仅摘走 2 条站点级判据（`siteverify` 端点、token ≈300s 且一次性）进 `web-js-env-patcher/references/edge-waf-cookie-challenge.md` §2.3。 |
| 375 | `csdn-100394056-JS逆向补环境实战：从原理到破解某验验证码.md` | `037222e6b731698e5ac83c48f6a4a6f8` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：属同题聚簇（某验验证码 + 补环境的综述），无代码块、无可复用生成式；补环境通用方法已在 `web-js-env-patcher` 成体系，本篇为 0 增量。**工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 376 | `csdn-101367856-网络爬虫-cloudflare五秒等待验证逆向破解.md` | `4737ebeb5064ec547b1b499df18e2ab7` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 377 | `csdn-147193430-Cloudflare五秒盾补环境分析.md` | `c18efd9b523ad28bbf8f9006d35238eb` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 378 | `csdn-149370076-JS逆向实战：免费版CloudFlare五秒盾的攻防解析.md` | `599b41783df9937131ae6acafd03af15` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 379 | `csdn-151996635-Cloudflare Turnstile企业级防护：5秒盾bypass与TLS指纹伪造技术解析.md` | `a91543cd835a5b6877565b80c2a94ce0` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 380 | `csdn-152127111-Cloudflare防护技术深度解析与Turnstile验证实战指南.md` | `3ef215c2ec4dbda8c1ceadedc2b908bb` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 381 | `csdn-152498871-Cloudflare 5秒盾逆向实战：13次请求背后的Python补环境框架搭建指南.md` | `2779ad220a56ed1ef9df622c76a3122f` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 382 | `csdn-153381316-Cloudflare 5秒盾全流程解析与Python补环境实战.md` | `518680503003e4cb41ea7f8151ca4327` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 383 | `csdn-158898877-Cloudflare 5秒盾逆向实战：从503到cf_clearance的全流程拆解（附避坑指南）.md` | `b57c1f6327e041653795b43cd7f40257` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 384 | `csdn-159297574-Cloudflare 5秒盾破解实战：Python补环境框架下的13次请求全解析.md` | `9bef34531aa942e12fde73464ca97a39` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 385 | `csdn-159629987-ChatGPT背后：Cloudflare Turnstile程序解密与机器人检测技术揭秘.md` | `0bbd17e957b2e8289a592f17b47c6d7e` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 386 | `csdn-159740614-JS逆向实战：免费版CloudFlare五秒盾核心逻辑剖析与自动化绕过.md` | `db18fa866b8bfcfd739d24ca413c2486` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 387 | `csdn-160099121-Cloudflare 5秒盾逆向实战：从503到cf_clearance的全流程解析.md` | `98f409e4b518bb161c9615b2621f69b7` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 388 | `csdn-161274429-Cloudflare五秒盾JS逆向实战：cf_clearance生成原理与工程化落地.md` | `74b9e509d2040d36435c3828a298f76a` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 389 | `csdn-161296793-Cloudflare最严验证的合规交互架构：从TLS指纹到Turnstile v3全链路对齐.md` | `a031699f9273f8b34596a5ddbd3831bf` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 390 | `csdn-161296797-Cloudflare Turnstile合规采集：指纹对齐、行为拟真与网络层融入.md` | `21acd803b2cffa2b52d0787cac584681` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 391 | `csdn-161406523-Cloudflare 5秒盾逆向实战：13次请求拆解与Playwright补环境框架.md` | `1d30cbe3dcb194e8afb56650478f47c9` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 392 | `csdn-163326626-Python补环境框架实战：13次请求深度解析Cloudflare 5秒盾绕过.md` | `4e45d7eac292060858e5db5279e1961b` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 393 | `csdn-163402696-CloudFlare JS加密逆向：从原理到实战的爬虫挑战应对指南.md` | `1355df02f967801c2ae14b1f38c1e369` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 394 | `csdn-94964551-Cloudflare 5秒盾逆向实战：从初始化到cf_clearance获取全流程拆解.md` | `20a18c452e023a9796f633d4c62e708a` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 395 | `csdn-97848186-Cloudflare 5秒盾逆向实战：13次请求背后的Python补环境框架搭建指南.md` | `9c4a41bcea7a37f8753acb86b4191a43` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 396 | `csdn-98274655-仿制Cloudflare盾逆向分析：从原理到实战的Web前端安全机制拆解.md` | `2bc30b4e264868a464cf9b1ad6f8db05` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 397 | `csdn-99026780-绕过Cloudflare 5秒盾的三种思路：补环境、模拟与第三方服务选型指南.md` | `eae2efcda68ae8617407e81e992ad2dc` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |
| 398 | `csdn-99171711-Cloudflare 5秒盾JS逆向实战：纯请求模拟获取cf_clearance.md` | `fc705a0b02d759647c77bccd8389d3bc` | 2026-09-23 | web-js-env-patcher | skip | **工证伪判废**：B21 用 `scripts/corpus-homogeneity-audit.py`（47 项自检）量化——本篇无任何代码块（`fences == 0`），只有综述/合规话术；25 篇同题实测两两 5-gram Jaccard 最大仅 0.024（**不是同文转载**，是「同题不同文且都不给代码」）。 |

### 本批次技能变更汇总（B21）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `stream-drm-reverse` | evolve | 新增 `references/frame-encryption-and-wasm-decryptors.md`（C 层形态学 + SAMPLE-AES 粒度 + EBSP + wasm 两条调用路线 + hls.js 五个 hook 点 + SDT 侧信道，9 节 + 12 行排错表）；新增 `scripts/nalu_frame_crypto.py`（EBSP 严格/宽松、SAMPLE-AES 覆盖范围与加解密、`split-derive`、`inline-key`，`--selftest` **52 项**）；`references/hls-and-ts-structure.md` 新增 §1.4 四 URL 语义、§4.5/§4.6 两条派生式、§2.3 补 EBSP 指针、§6 补两条旁路、§10.1 补内联 key、§11 补 5 行；`SKILL.md` 分层表 + 失败模式表 + 反例黑名单 + 命令入口 + description |
| `ast-deobfuscation` | evolve | `references/invisible-unicode.md` 新增「双向控制字符」整节（码位表 / 三条识别信号 / 定位命令 / 与零宽字符的顺序硬约束）；`scripts/strip-invisible-unicode.js` 新增 `detectBidiControls` / `stripBidiControls` 与 **19 项 `--selftest`**（含「注释外双向字符必须让 parse 失败」的对照组）；`SKILL.md` 补两条指针；**`references/patterns/geetest4.md` → `geetest.md`**（含 pass 脚本、路由 id、检测器类型、4 处文档指针），修掉 B20 挂账的「文件名 v4 / 内容 v3+v4」 |
| `web-js-env-patcher` | evolve | `references/edge-waf-cookie-challenge.md` §2.3 补 **`siteverify` 服务端二次校验端点**与「token ≈300s 且一次性 ⇒ 不能预取」两条判据（唯一从 CSDN 聚簇里摘出的可用碎片） |
| `forum-corpus-archival` | evolve | 新增 **坑 54**（「同题聚簇」≠「同文」：处分必须落单篇；整批统计只作体检；行级去重指标在「采集器压成单行」的语料上**假性满值**，必须与「平均行长度 / 代码块数」三联看）；新增 `scripts/corpus-homogeneity-audit.py`（通用化 `--glob` / `--name-filter`，`--selftest` **47 项**） |

### 本批对「已登记文章」的增量补注（B21）

> 幂等红线要求**不得重复编号**。以下 2 篇在 B8/B12 已按**更粗的粒度**登记过；
> 本批精读后拿到了**可落地的细节增量**，因此只在此补注，**不新增台账行**。

| 文章 | 既有登记 | 本批增量（已落 `stream-drm-reverse`） |
| --- | --- | --- |
| `52pojie-1617087-某浪m3u8解密简单分析.md` | #190（B8）：某浪 V3 key「一次响应里既给密文又给密钥 ⇒ 直接取用，不需逆算法」 | 既有口径**低估了它**：本批拿到**精确派生式**——`data = "<32字符>:<密文>"`、`iv = se.substring(16)`（后 16）、`key = iv + se.substring(0,16)`（后 16 + 前 16，32 字符 ASCII），且解出的 key 会被 `window.btoa()` **写回 `de.data`**；另有**旁路**（同响应里的 `blob:` 地址之一就是明文 key）。已升格为 `hls-and-ts-structure.md` §4.5「派生式四：`:` 分栏 + 前后半段互换」并配 `nalu_frame_crypto.py split-derive` |
| `52pojie-1635800-某医学网站的加密M3U8分析.md` | #227（B12）：m3u8 三要素齐全（IV + key 地址 + key 二次加密 AES-128）的形态判据 | 本批补**定位方法论**：「用播放器 js 里的**英文注释**当锚点」——搜 `convert` / `change; transform; switch` 命中 `Handle responses for key data and convert the key data to the correct format`，紧邻几行即是解密函数与秘钥 `72Fhskjglp8qjpqx` |

### 结构性收敛（B21）

| 项 | 处置 |
| --- | --- |
| `geetest4.md` 文件名与内容不符（B20 挂账） | **已改名**为 `geetest.md`，同步 pass 脚本名 / 路由 id / 检测器类型 / 检测器文档 / layering 示例 / SKILL.md 指针；`hintTokens` **有意保留** `geetest4` 作为检索词 |
| `websocket-reverse` 文档/命令一致性（B19 判 worse 后两轮未动） | 修复 5 处悬空指针（`dialect-matrix.md` 缺路径前缀、`docs/reference/reverse-workflow.md` 少一个 s 且文件不存在、`skills/browsercli-playbook/*` 整个技能不存在 ⇒ 改指**真实存在**的 `../web-reverse-env/references/08-browsercli.md` / `../ast-deobfuscation/references/browsercli-tools.md` / 项目根 `AGENTS.md` / 本文件「失败回退」表）；顺带消除「`ws-decode.js` 是技能自带脚本」的歧义 |
| 同类问题在 `wsam-reverse` 也有 | 同一批修掉（3 处） |
| **把该 bug 类变成机械不变量** | `check_skill_integrity.js` 新增规则 **2c**：`skills/<name>/...`（技能根相对）与 `docs/...`（仓库根相对）两种拼写**必须可达**，且 `<name>` 必须是真实技能目录。**故障注入阳性验证**：伪造技能目录注入 2 处悬空引用 ⇒ 逐条变红，合法引用放行；另验证「`--selftest` 失败必须被阻断」 |

### 证伪与审计留痕（B21）

```bash
# 1) 工证伪脚本自检（47 项，含阴性方向 / 阈值边界 / 压缩型语料陷阱）
python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py --selftest

# 2) CSDN 同题聚簇的量化证伪（默认口径即该簇）
python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py --markdown

# 3) ts/drm 簇体检（同一工具的通用化用法）
python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py   --glob '52pojie-*.md' --name-filter 'm3u8|ts帧|PES|NALU|DRM|m4s' --markdown

# 4) NALU 帧加密三件套自检（52 项）
python .agents/skills/stream-drm-reverse/scripts/nalu_frame_crypto.py --selftest

# 5) 不可见字符 / 双向控制字符清洗自检（19 项）
node --require ./artifacts/skill-evolution/tools/node-resolve-preload.js   .agents/skills/ast-deobfuscation/scripts/strip-invisible-unicode.js --selftest

# 6) 整体机械校验（0 阻断 / 0 告警）+ 双镜像一致性（0 mismatch）
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 7) 引用规则 2c 的故障注入阳性验证（伪造技能目录，2 处悬空必须逐条变红）
#    证据：artifacts/skill-evolution/b21-run-20260923/fp-positive-refs.txt

# 8) 来源保真度核对（12 篇 / 0 未命中为通过）
python artifacts/skill-evolution/tools/b21-verify-sources.py

# 9) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b21-ledger.py
```

### 下一批（B22）取材建议（承接本节）

- 待处理 **458** 篇（台账 398 条后）。
- 优先级：
  ① **Cloudflare / WAF 簇已收口**（本批工证伪），后续同题文一律走
     `corpus-homogeneity-audit.py` 先量化再决定，**不再整批跳**。
  ② **ts 帧加密簇剩余**：`52pojie-1616797`（BurpSuite 取 m3u8 真实 mp4）、
     `52pojie-1258605`、`52pojie-1624279` 等体检为 `keep`（有代码块），按同簇补 `stream-drm-reverse`。
  ③ **本批暴露的新薄区**：「**双源交叉验证**」在本批价值极高（案例一 vs 1957747
     给出了 wasm2c / wasm2wat **两条路线**、且**互证了 func58/func60 不等价**）⇒
     下一批应主动找「**同一平台 ≥2 篇**」的搭配，优先于单篇强文。
  ④ **小程序 / WebView / Electron/asar 簇**（本批新增语料里 6 篇）仍未建档，按「避免滥建」继续评估。
  ⑤ **JSVMP 剩余**：符号执行 / 中间代码优化，落 `ast-deobfuscation` 既有文件。
- 候选新技能 `captcha-flow-orchestration` —— B5–B21 **十五次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。



---

## 批次 B22 · 2026-09-23（第二十二次执行）

取材口径：待处理队列 **485 篇**中，取两个**成规模且互相独立**的主题簇 ——
**A 簇 14 篇**（ts / m3u8 / DRM，全部演化既有 `stream-drm-reverse`）与
**B 簇 35 篇**（小程序，全部落地**新技能 `miniprogram-reverse`**）。
两簇刻意选在同一批：A 簇验证"双源互证"的收益，B 簇验证"**技能库里没有最近邻模块时应当建新技能**"
（与 B5–B21 十五轮"不建 `captcha-flow-orchestration`"是**同类判据的两个方向**）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 399 | `52pojie-1475807-分析某视频网站将 HLS 流伪装成图片以隐藏视频源.md` | `cd9a261f067222b9224d00e1607f840c` | 2026-09-23 | stream-drm-reverse | evolve | **分片伪装层的唯一来源**：站点把 ts 分片前拼上**真图片头（212 字节）**让每个分片看起来是"只有中间一个白点"的 PNG，骗过对象存储**按文件头判类型**的校验（图床白嫖）；浏览器侧去掉头部再喂播放器 ⇒ **网络面板里没有 Media 请求、只有一堆 .png**。判据不靠硬编码 212，而是 **MPEG-TS 同步字节 0x47 + 188 步长的连中数** ⇒ 新增 `scripts/container_disguise.py`（`--selftest` 21 项，覆盖 0/1/7/100/188/213/1024 各前缀、随机数据无假阳性、多解时全部列出不静默取一个）。 |
| 400 | `52pojie-1479898-获取优酷视频真实m3u8播放链接，非vip也可得到原视频最高画质.md` | `cb20911e15ad3eb739e75bb71da3ed54` | 2026-09-23 | stream-drm-reverse | evolve | **优酷 mtop 系取播放地址的接口签名**（新增 `vendor-key-schemes.md` §2.14）：`sign = MD5(token + "&" + t + "&" + appKey + "&" + data)`；`token` 取 cookie `_m_h5_tk` 的**下划线前那一段**；`appKey` 固定 `24679788`；`data` 是请求体 JSON **原文**；`steal_params.client_ts` 用 **秒级**（`t[:10]`）而 `t` 是毫秒；`emb = base64(videoId + "www.youku.com/")`；响应是 **JSONP** 要去包裹；最高清晰度 = 按 `size` 排序后**最后一条**；**失败判据可直接定位错在哪**：`FAIL_SYS_ILLEGAL_ACCESS::非法请求`=sign 错、`FAIL_SYS_TOKEN_EXOIRED::令牌过期`=`_m_h5_tk` 过期。 |
| 401 | `52pojie-1640483-M3U8加密key计算.md` | `63c5f166f1cf8042dd5a0ae4e4f30ec3` | 2026-09-23 | stream-drm-reverse | evolve | **"缓存侧 key 与网页侧 key 不等价"的判据**：离线缓存目录里同样有 `.key`/m3u8/`.json`（seed 相同、json 只改了命名规则），但**缓存里的 `.key` 与网页抓的 `.key` 内容不同** ⇒ 算出的 key 不同；而**用网页抓的 `.key` 算出的 key 能解缓存的 ts** ⇒ 差异在 **IV**（缓存侧换了一组 IV）。配套取证顺序：三件套按 `.key` / `.m3u8` / `.json` 三个关键字过滤下载，注意多清晰度会有多份 m3u8。 |
| 402 | `52pojie-1686788-【在线M3U8音视频加密安全与技术防护】.md` | `22ea5f6a4e45aacdba0d326b80d82558` | 2026-09-23 | stream-drm-reverse | evolve | HLS/TS 的**教科书级全景**：m3u8 两级（master/media）与全部常用标签语义、TS 三层与 PAT/PMT 解包步骤、**"图床白嫖"的完整原理**（接口只校验开头几字节 ⇒ 拼真图片头骗过）；**厂商 key 位数表**（某威 32 位 / 某场景 21 位 / 腾某某 16 位但**是假的**、要先 JSVMP 随机 key+iv 再 AES 解 / 气某某 20 位且**二次请求返回假随机 key** / 某度云对 key 再做 AES / 阿某某走 JSVMP 且是 **ECB** 非 CBC / i某某是 **xxtea + canvas 指纹**）；**试看场景的"切片名自增盲猜"风险**与"随机命名"对策。 |
| 403 | `52pojie-1715277-HLS-M3U8流媒体视频加密KEY介绍以及平台案例！.md` | `5a11b54851095fcca33a9dc22d951dc7` | 2026-09-23 | stream-drm-reverse | evolve | **厂商 KEYFORMAT / METHOD 清单**（做判派表用）：Apple FairPlay `skd://` + `com.apple.streamingkeydelivery`、腾讯视频 Google Widevine `SAMPLE-AES-CTR` + `urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed`、阿里云/气球云（token）/保利威 的 `AES-128` + `IV` 形态；另：分片格式不止 ts（`m4s`/`bbts`/`mp4`），key 来源不止 URI（key 文件 / 网址 / **明文**）；AES 五种工作模式与六种填充的清单。 |
| 404 | `52pojie-1730445-M3U8 KEY解密探讨--已解决.md` | `ceea84437f58a7e5beecac2b8ff58055` | 2026-09-23 | stream-drm-reverse | evolve | 百度 BCE DRM 的**三级 token 链**取证顺序（与既有 §2.2 互证）：m3u8 里 `METHOD=AES-128` 且 **IV 已明写** ⇒ 难点全在 key；key 地址 `drm.media.baidubce.com/v1/tokenVideoKey?...&token=<a>_<b>_<ts>` 需要 token，token 来自 `api-*/v1/authex/.../valid?f=&m=&e=&k=` 返回的 JSON（`encryptedVideoKey`）；作者贴出的 JS 是**标准 AES 的 T 表实现**（`_tables`/`_key`/S 盒四表展开）⇒ 判据：**看到 `_tables[1]` / `o = e ^ s[0]` 这类结构即可确定是 AES，不必逐行读**。 |
| 405 | `52pojie-1769707-Google Widevine DRM 逆向破解原理.md` | `467b7277441befba3676a6ea3a42fdc6` | 2026-09-23 | stream-drm-reverse | evolve | **Widevine 原理源**：三级（L1 硬件 / L2 混合 / L3 纯软件）与"L3 破解工具最多"的结论；厂商用 Widevine 加密后产出 **mpd + 分片 + KID/key + 许可证代理服务器**，mpd 是 XML 且**内含请求所需的 PSSH**；播放时用 `device_client_id_blob` + `device_private_key` 建初始化信息、携 pssh 向代理服务器换 token 再转 Widevine 官方 ⇒ 浏览器请求 **代理许可证服务器**而不是 Google。 |
| 406 | `52pojie-1851955-某网课m3u8视频流hls.js算法逆向.md` | `6b60495c8ed77dacde106251b01f8e13` | 2026-09-23 | stream-drm-reverse | evolve | **W6 外部掩码异或族的唯一来源**（新增 `key-wrapper-families.md` §6.5 + `key_wrapper.py dataview-xor`）：`.key` 返回 **16 字节（长度完全正常）**、下载器却报"文件解码失败，请检查 key 是否正确"；JS 在 `DefaultConfig.loader` 的 `onSuccess` 里用 `DataView.setInt32(i, getInt32(i) ^ b[i])` 异或，而 `b`（4 个 int32）**不在 JS 里**——写在 HTML 的 `<div id="app-key" data-keys="3854078970,2917115795,3887476043,3350876132">`；真实 key `eMgqyypl7TGO7cAb`（hex `654d67717979706c3754474f37634162`）。**两个必须点破的坑**：① `DataView` 默认**大端**，与 `Uint32Array`（平台端序）不等价且都不报错；② 文章另给的 Python 助手 `n.to_bytes((n.bit_length()+7)//8,"big")` 对首字节为 0 的掩码**只产 3 字节**、整串错位。顺带落实：hls.js 定位靠 `aes-128` / `decryptdata.key` / `buffer` 三个关键词 + `softwareDecrypt(n, key.buffer, iv.buffer)` 断点。 |
| 407 | `52pojie-1892868-某鹅通M3U8分析.md` | `7445af2a046cba958396469ab2663267` | 2026-09-23 | stream-drm-reverse | evolve | **"key 长度正常但仍不对"的第二种成因**：m3u8 明文、key 响应**正好 16 字节**，下载器却报 KEY 无效 ⇒ key 被**二次加密**；解法是断 `decryptdata.key`（4 处全断）取 JS 里的真 key，`btoa(String.fromCharCode.apply(null, key))` 即可取出。**第二个坑**：分片地址比 m3u8 里多三个参数 `sign / t / us` 且 **BaseUrl 也不同** ⇒ 分片 403，必须从 ts 发包处跟栈找到 URL 重写点；接口响应体是"去掉 `__ba` 前缀 + 把 `@#$%` 换回 `1234` 再 base64"的自定义混淆 ⇒ **"看起来像 base64 但解不开"时先试"字符替换 + 前缀剥离"**。 |
| 408 | `52pojie-1939931-某OF网站的OB解密及DRM过校验思路(上).md` | `098df028708aff511180ee0785830d24` | 2026-09-23 | stream-drm-reverse | evolve | **OF 站（上）+ 国际派 E 层的入口**：OB 反混淆（两参调用链内联 + 正则抠解密函数 + 对象成员表内联）；`BCToken = SHA1( btoa(时间戳).btoa(随机).btoa(随机).btoa(UA) )`；`sign = [fixedPrefix, SHA1(前缀\n时间\nurl\nauth_id), hashFunc(token), signEnd].join(":")`；**HTTP/2 才是"Postman 成功 cmd 失败 powershell 成功"的真解**（改 cipher 顺序不够）；`.wvd` = RSA 私钥 + Client ID Blob；KeyDive（真机 root + MagiskFrida）与 AVD dumper（**必须 Pie**、frida-server 版本必须与 pip 一致、模拟器回环代理 `10.0.2.2`）两条提取路线；`pywidevine create-device -l 3`；`yt-dlp --allow-u` 只为拿到**加密**媒体。 |
| 409 | `52pojie-1939939-某OF网站的OB解密及DRM过校验思路(下).md` | `832494935c4b9a9dbaaa2898a053a508` | 2026-09-23 | stream-drm-reverse | evolve | **国际派 E 层的核心三源之一（本文最重要）**：`0804`（`\x08\x04` / base64 `CAQ=`）是 **`generateRequest()` 的固定返回值**、可直发许可证服务器换**服务证书** ⇒ **两步提交（先取证书再提 challenge）**，对应 `pywidevine.set_service_certificate`（Privacy Mode / **VMP 强制**）；**不设证书的后果是"请求 200 但 key 是假的"**；mpd 里两个 `cenc:pssh` —— **长的给 PlayReady、短的给 Widevine**；`get_keys` 返回多条 CONTENT key，**ffmpeg 全怼进去也能自己识别**；`mp4decrypt --key KID:KEY` 则必须按 KID 对齐；EME 的两个 hook 点（`generateRequest` / `addEventListener("message")`，且**不要顺 promise 跟栈**，只有 `license-request`/`license-renewal` 才要走 license）；`x-hash`/`x-of-rev` 过期 ⇒ **请求正常但 cookies 是假的**；**把 CDM 包成 flask + pyinstaller 的本地服务**（空闲端口 / `/ping` 心跳 / debounce 300s 自动销毁 / 端口占用检查）。 |
| 410 | `52pojie-1945555-m3u8视频问题，aes-128加密，找不到密钥.md` | `e0632e6dcd625df8567a30be7adda5b7` | 2026-09-23 | stream-drm-reverse | evolve | **厂商托管 key URI 的五参形态**（补进 `hls-and-ts-structure.md` §4.6 判据表）：`URI="…/xxx.key?pid=null&ts=<毫秒>&sign=<32hex>&ms=<32hex>&audit=&appId="` + `IV=0x…` ⇒ `ts/sign/ms` 是**时效鉴权四件套**，`sign`/`ms` 由页面接口下发、**不能自己算**，必须"取一次马上用"。本篇本身是求助帖（无代码块、130 行正文 + 一整段压缩后的 player.js），取证价值仅在"厂商托管的 key URI 长什么样"，故只做单条判据入库、不另立配方。 |
| 411 | `52pojie-2060041-某网站 DRM Clear Key 密钥获取.md` | `9423f705fda7265fdc63c9e4b7abf967` | 2026-09-23 | stream-drm-reverse | evolve | **ClearKey 完整链路源**：`mp4info` 显示 `[ENCRYPTED] Coding: enca` + `Scheme Type: cbcs` ⇒ 有 DRM；网络里有 **`bilidrm` 文件 + 公钥** ⇒ **明文 DRM、一定有解**；JS 里是带注释的 EME 三段 （`case 2` 公钥生成 SPC / `case 6` 请求许可 CKC / **`case 12` 的 return 处就是 kid 与 key**）；KID 可用 `mp4dump | findstr KID` 从媒体文件读，**但代码里已给出可省这一步**；key 是 base64 ⇒ 需 `atob` + `charCodeAt.toString(16)` 补零转 hex；**两种解密写法**：`mp4decrypt --key KID:KEY`（必须给 KID）与 `ffmpeg -decryption_key <KEY>`（**可省略找 KID**）。 |
| 412 | `52pojie-609243-Chrome CDM框架重大缺陷，DRM视频轻易复制.md` | `14c04ef49802390ecdcbe855f5b67447` | 2026-09-23 | stream-drm-reverse | evolve | **浏览器侧 CDM 取证的历史路线（保留为判据）**：老版 32 位 Chrome 的 Widevine 是**可代理的 DLL**（`widevinecdmadapter.dll` → `widevinecdm.dll`，`CreateCdmInstance` 建实例），关键接口是 `cdm::ContentDecryptionModule_8::Decrypt(encrypted_buffer, decrypted_buffer)` ⇒ **在两层 DLL 之间插代理就同时拿到密文与明文**；落地三要点：① DLL 在**沙盒进程**里（`ReadProcessMemory`/`CreateFile`/`OutputDebugString` 全被禁）；② 直接 patch `chrome.exe` 加载代理 DLL（**启动时沙盒尚未启用**）；③ 还需 `--no-sandbox` 才能写文件；日志形态 `Decrypt(IV:<hex>, encData(N), decData(N))`，**比对前 16 字节可见 CBC/CTR 的差异位置**。现代 Chrome 已不再是可代理形态 ⇒ 作判据而非操作保留。 |
| 413 | `52pojie-1050690-支付宝小程序抓包与源码获取.md` | `68a71bd5a576e52fed1f55bb2e600ca7` | 2026-09-23 | miniprogram-reverse | create | **支付宝小程序的两条路 + 抓包前提**：源码在 `/data/user/0/com.eg.android.AlipayGphone/files/nebulaInstallApps/<tinyAppId>/`，**是未加密的 tar**（`adb pull` 解压即得工程）；Frida hook **必须选中小程序进程**（如 `com.eg.android.AlipayGphone:lite1`，挂主进程"什么都没发生"）；证书校验点在 `org.apache.http.conn.ssl.AbstractVerifier`（hook 其 `verify(String,String[],String[],boolean)` 直接 return 即可放行），**而 `onReceivedSslError` 那条路实测调不到**。 |
| 414 | `52pojie-1214662-python 逆向某咖啡小程序接口.md` | `397d1171dbc6e55ca2188fae7587ca85` | 2026-09-23 | miniprogram-reverse | create | **AES-ECB + 自实现 MD5 的小程序范式**：`q = aes.en(JSON.stringify(data), key)` 后 `sign = md5([cid=…, q=…].sort().join(";") + key)`，响应再 `aes.de` ⇒ **"先解 body 再解 sign"的顺序**；key 是明文写死的 20 字符；**自实现 `md5()` 把 16 字节摘要按 4 个大端 int32 取 `Math.abs` 再拼十进制**（不是 hex！）⇒ **"长度/形态不像 md5"时的第三类成因**（不是加盐，是"摘要被二次编码成十进制"）；ECB 模式下 `iv: ""` 且**必须忽略 iv**。 |
| 415 | `52pojie-1336342-搜索编程的艺术之C#实现小程序包解密算法.md` | `01cdb37cfcfb9f216236489d1c259a2d` | 2026-09-23 | miniprogram-reverse | create | **PC 微信加密包（`V1MMWX`）解密算法的唯一来源**：文件布局 = `magic(6B "V1MMWX") + aes(1024B) + xorBody`；`key = PBKDF2-HMAC-SHA1(pass = wxid, salt = "saltiest", iter = 1000, dkLen = 32)`；`iv = "the iv: 16 bytes"`（字面量）；头部 `AES-256-CBC` 解密 1024 字节、**PKCS7 填充后恰好 1024 ⇒ 真头部是前 1023 字节**；体部从偏移 1024 起逐字节异或 **`wxid` 倒数第 2 个字符**，**`wxid` 长度 < 2 时兜底 `0x66`（'f'）**；安卓端包**本来就不加密**，别在安卓侧折腾解密。 |
| 416 | `52pojie-1464031-Python爬虫之社区团购某团、某心、某多、某马微信小程序商品数据.md` | `3768bc2259b8733faae48de7d562d674` | 2026-09-23 | miniprogram-reverse | create | **商品数据类小程序的采集侧判据**：接口直连 + **`t` 头承载 token**（`headers={"t": token, ...}`）；UA 必须是 `…MicroMessenger/… NetType/WIFI MiniProgramEnv/Windows WindowsWechat` 形态；多平台同一业态（某团/某心/某多/某马）接口结构高度同构 ⇒ **"换一家照抄结构"是有效策略**。 |
| 417 | `52pojie-1474964-某商超小程序加密算法解析.md` | `45f7dc102ab7996cabf10682db011099` | 2026-09-23 | miniprogram-reverse | create | **商超小程序：HmacSHA256 签名 + base64 输出 + 固定盐**（本技能 S3 族的最佳实例）：`n = JSON.stringify(data) + data.isSimulator + data.viewSize + data.networkType + data.time`；`sign = Base64.stringify(HmacSHA256(n, "@653yx#*^&HrTy99"))` ⇒ **签名是 base64 不是 hex**、盐是**三目表达式**按环境选（BETA 一套、线上另一套，**抄错环境就全错**）；经纬度只是**单纯 base64**（`MTIwLjE1NDc3NQ==` ⇄ `120.154775`）；工程侧：`regeneratorRuntime is not defined` 的修法（`npm i regenerator@0.13.1`、拷 `runtime.js`、把 `import` 改成 `require`）；**"破译"转为"利用"**：把 crypto-js + 自实现 `stringify` 拼成独立 JS 工具库，Java 侧用 `ScriptEngine`+`Invocable` 调用（比全量重写省几个数量级）。 |
| 418 | `52pojie-1482566-[另类方式破解]支付宝的小程序sign验签参数算法.md` | `d2f2a75ce0e4b63d1252dc99d0a5529b` | 2026-09-23 | miniprogram-reverse | create | **改包回写会失效，以及正确姿势**：把改过的 `index.worker.js` 放回 `.tar` 后小程序**重新加载了该文件**（目录里的 `cert.json` / `sign.json` 做完整性校验）；**正确做法是 Fiddler AutoResponder 返回改后的 JS**；顺带给出支付宝 `sign` 的完整派生式：`h = Σ(k+v)`（`Object.keys(p).sort()` 后 **key 与 value 直接相连**）→ `sign = hexMD5(Base64.encode(h))`，参与签名的 `p` 含 `appid/nonce/timestamp/os/v/token/_url`。 |
| 419 | `52pojie-1484716-某付宝APP之某加油小程序对称加解密算法解析.md` | `ae81552fbb7a5b0fd999335d992be915` | 2026-09-23 | miniprogram-reverse | create | **"转置表"型自定义编码**（不是标准 base64）：`U = A-Za-z1234567890`、`q = 打乱后的 50 字符表`，`X(map, str)` 把每个字符按其 UTF-8 字节逐个**查表替换**；`G()/Q()` 建双向 Map；**伪 base64 的判据**：表被换过，但**输出仍是合法 base64 字符集** ⇒ "直接 base64 解出来是乱码但长度对"；key/iv 由同一个长串切片（`key=q.substr(1,16)`、`iv=q.substr(16,16)`）；外层再套 AES-CBC/PKCS7/128。 |
| 420 | `52pojie-1684583-【逆向分析】抖音小程序逆向ttpkg.js文件解包记录.md` | `24aa31ff21ab17f30aeff4d09a18cbe9` | 2026-09-23 | miniprogram-reverse | create | **抖音 `TPKG` 包结构**（明文、可直接解析）：文件头 = 版本号 + 4 个空字节 + **文件个数** + 第一个文件名长度；**每条索引之间的空隙是 12（`0x0C` 即十进制的 18）字节**，其中**第 9–12 字节 = 文件名长度**；文件名之后紧跟 4 字节 = **文件内容起始偏移**；**索引里的整数一律大端**（`6F 25 00 00` 要读成 `00 00 25 6F`）；工具：`ttpkgUnpacker`（支持 `.pkg` 与 `.ttpkg.js`，可提 `ttss`/`ttml`）；**只覆盖小程序，不覆盖抖音小游戏（小游戏是 `asm` 格式）**。 |
| 421 | `52pojie-1708787-抓取微信小程序源码【附逆向工具wxappUnpacker使用方法】.md` | `39604376694f7a3b359c81aa34e40697` | 2026-09-23 | miniprogram-reverse | create | **解包后跑不起来的修复清单 + 分包命令**：缺 `app.json` = 站点做了**反编译加固**；`this package is a subPackage which should be unpacked with -s=<MainDir>` ⇒ 分包要用 `node ./wuWxapkg.js 分包路径 -s=主包路径`；`wxappUnpacker` 需 7 个 npm 依赖（`esprima`/`css-tree`/`cssbeautify`/`vm2`/`uglify-es`/`js-beautify`，**逐个装**）；PC 端包在 `Applet` 目录、**改默认存储位置**可避免 C 盘爆；操作习惯：先把目录清空再打开小程序，好区分包归属。 |
| 422 | `52pojie-1709344-PCVX小程序抓包分析.md` | `eddc92baa63077fc2e7a01b4bfac5bed` | 2026-09-23 | miniprogram-reverse | create | **PC 端抓小程序加密网络流的帧格式（原生层兜底）**：x64dbg 附加**标题里带小程序名的** `WeChatAppEx.exe`，断 `recv`；帧 = `状态位(1B) + 协议类型(2B, 小程序 = 03 03) + content 长度(2B 大端) + content`；**状态位 16/17 是业务正常数据、15 是失败**；解析顺序：读前 5 字节 → 取后 2 字节当长度 → 读 `buffer+5` 的 data → 再取前 8 字节当 head、其余当 body；**body 过一次 AES-128-GCM 解密**后才是明文 JSON。版本坐标：微信 `3.7.6.44` + `WMPFRuntime 1.9.4648.2`。 |
| 423 | `52pojie-1724382-WX小程序 喵桑活下去 破解--详细教程,提供思路,举一反三.md` | `6546505cbe807681d256ebc2cbf76806` | 2026-09-23 | miniprogram-reverse | create | **抓包四分类**（本技能 §1 的原型）：① 明文无签 ⇒ 直接改；② 加密无签 ⇒ 找加解密；③ 明文有签 ⇒ 找签名；④ 都加密 ⇒ 两个都找。**"两个等号"是第一判据**（base64 或 AES）；**"先用 base64 试一把"**（实测确有纯 base64 的站）；小游戏类目标（客户端数值）的落地思路：模拟请求 / 上传时注入。 |
| 424 | `52pojie-1738723-完整逆向某小程序破解签名算法过程记录.md` | `5d8fb158b418e68301ab72749d47a8b0` | 2026-09-23 | miniprogram-reverse | create | **"密钥是本地值 + 远端值拼接"**（本技能 §4 的关键一类）：按 ascii 序对参数 value 排序后做 HmacSHA256，密钥看起来是 `p.globalData.tk`，**但单用它算不对** ⇒ 真相是 **`getconfig` 接口返回的 tk 与本地 tk 拼接**才是真密钥（"单个值试不对"正是这类的典型症状）；配套链路：先取 token → 传七牛云 → 再把图片 URL 提交给服务端。 |
| 425 | `52pojie-1751688-洗衣小程序逆向.md` | `a463c1dc6d1edfd7fd600a511d8dfca6` | 2026-09-23 | miniprogram-reverse | create | **固定前缀 + 大写 + md5 的签名族**（本技能 S2 族）：`u = "SING=HLYF"` 起手 → 按 `i.sort()` 顺序 `u += "&" + k + "=" + v`，**显式剔除 `tokenId` / `ssid` / `sign`**，再去掉值为空/undefined 的项；`u = u.toUpperCase()`；**若 u 恰好等于前缀则补一个 `&`**；最后 `hex_md5(u)`。**排除名单是高频坑**：漏一个或错一个，sign 就是错的且**没有任何报错提示**。 |
| 426 | `52pojie-1764292-VX小程序逆向分析.md` | `e89fca180dc3629ddf790f60492d3f8a` | 2026-09-23 | miniprogram-reverse | create | **安卓原生层 hook `wx.*` 的原理与进程陷阱**：小程序由 WebView + JSBridge 承载，`wx.*` 由 `WxJsApiBridge` 提供 ⇒ **可以 hook Java 层**（不必 hook JS）；`wx.request` 在 Java 层**不叫 request**，正确定位入口是 `com.tencent.mm.appbrand.commonjni.AppBrandJsBridgeBinding`；**小程序以 `com.tencent.mm:appbrand0` … `:appbrand4` 独立进程运行、最多 5 个**（开第 6 个会顶掉最久未用的），所以 `frida -U com.tencent.mm` 或 `objection -g com.tencent.mm` **会挂到主进程、什么都看不到**，**必须指定 pid**。 |
| 427 | `52pojie-1774754-微信小程序签名逆向分析.md` | `ac922cfc986b63d1f1ac003bc756ecd3` | 2026-09-23 | miniprogram-reverse | create | **"先拿包再看算法"的最小闭环**：PC 端取 `__APP__` 主包 → `pc_wxapkg_decrypt` 解密 → wxUnpack 解包 → 全局搜 `enc` 或直接读路由附加逻辑；本例 `sign = MD5(参数名排序后拼接 + "cmscms")` ⇒ **"难度与 web 前端加密一致，关键在拿到源码"** 这一结论的最短实例。 |
| 428 | `52pojie-1795558-某台葫芦娃小程序系列协议开源C++,QT6,X-HMAC-SIGNATURE算法,X-HMAC-DIGEST学习研究.md` | `0f0fbda2496ce98ec7874e227a0b6c13` | 2026-09-23 | miniprogram-reverse | create | **`X-HMAC-SIGNATURE` / `X-HMAC-DIGEST` 双头**（本技能 §1 的"sign 在请求头"一类）：小程序配置信息里有这两个头；工程实现（C++/Qt6 导出 DLL）无算法细节 ⇒ **只登记头名与"这类站点用双头分别做签名与摘要"的判据**，具体派生式不臆造。 |
| 429 | `52pojie-1832406-windows下通杀wx小程序云函数实战.md` | `0c3d9f2404f3059e3a9a2acc135e4fec` | 2026-09-23 | miniprogram-reverse | create | **云函数（`wx.cloud.callFunction`）的完整 RPC 流水线**（本技能最有工程价值的一条）：云开发的数据不走普通 HTTPS ⇒ 抓包拿不到；解包 → 找入口（`app-service.js` 搜 `"app.js"`）→ **开 debug + 注入探针**（包一层 `wx.cloud.callFunction`，在 `config.success` 里 `console.log`）→ 重打包（`unveiler wx -wp`）→ **重打包会因完整性校验而加载失败** ⇒ frida 附加 `WeChatAppEx.exe`、**把"当前 MD5"覆盖成"原始 MD5"** ⇒ 注入生效并弹出 vConsole ⇒ 再接 websocket 把数据外发即得 RPC。**该 frida 脚本写死了 `RadiumWMPF = 6945` 的 RVA ⇒ 换版本必须重新定位**。 |
| 430 | `52pojie-1843617-某XX自考小程序的AES加密分析.md` | `ff338206ffbcc041bdb7c112d86002f0` | 2026-09-23 | miniprogram-reverse | create | **"返回密文带 `_`/`-`" 的 URL-safe base64 处置**：`c.replace(/_/g,"/").replace(/-/g,"+")` 后再 `Base64.parse` → `AES.decrypt(CBC, Pkcs7)`；key/iv 来自 `crpytoConfig.AES_KEY/AES_IV`；调试落点：搜 `decrypt`（而非 `encrypt`）下断更快命中。 |
| 431 | `52pojie-1856275-记一次纯小白对某去水印小程序的加密字段算法解析.md` | `291e70ef56e9bc05d0a9dbba1f430605` | 2026-09-23 | miniprogram-reverse | create | **`wx.login` 的 `code` 不可复现，但可以"解出来复用"**：token 由 `AES(md5(小程序id) 当 key, {appid, time, code, id})` 生成；`code`/`id` 无法伪造 ⇒ **但既然参数进了 AES，就"直接解抓到的 token"把它们读出来**（且这俩**不参与签名**时可直接复用）；另有 `updateCode` 类接口可自行刷新 ⇒ **"不可复现的参数"要分两步判：能不能解出来 / 参不参与签名**。 |
| 432 | `52pojie-1915411-微信小程序逆向之牛仔城游戏厅签到接口.md` | `26e30ac5d9f1b50aca1137208ac55ece` | 2026-09-23 | miniprogram-reverse | create | **"长度即判据" + 时间戳独立校验**：`sign` 是 32 位 ⇒ 猜 md5（**先上 CyberChef 验证是不是裸 md5**）；**只改 `time` 重放会失败**（说明 time 进了签名）；`member_no` 是会员号、`store_no` 是门店号等语义字段的判读。取证习惯：`everything` 搜 `.wxapkg` 按修改时间倒序取最新；PC 微信 `3.7.0.26` 时代可用 `wxapkg-convertor` 拖拽解包。 |
| 433 | `52pojie-1924937-小程序泡泡玛特小程序解包.md` | `42cb11e418f7b8d77cc0fd22224cb985` | 2026-09-23 | miniprogram-reverse | create | **`X-Sign` 与 `sign` 双签名的两种结构 + 开发者工具修复三连**：`x-sign = md5(ts + "," + client_key) + "," + ts`，其中 **`client_key` 明文走网络** ⇒ 抓包直接读；`sign = MD5(buildQueryString(params) + "&noceStr=<固定串>").toUpperCase()`，而 `buildQueryString` = **键值排序后 `k=v` 并用 `&` 连接、末尾留 `&`**；**参数在本地生成** ⇒ 即便"合法域名"校验把请求全拦下，仍能在生成处拿到 sign；工程修复：删 `plugins`、`componentFramework` 之类报错逐条处理、渲染层网络错误无解但**不影响本地参数**。 |
| 434 | `52pojie-1934003-某壁纸小程序sign逆向分析.md` | `3b49a36cf50d21ba8df712ebfdc5bb03` | 2026-09-23 | miniprogram-reverse | create | **"sign 的输入来自缓存" + 跨平台换赛道**：`sign = s(e.getToken())`，`getToken → getUserInfo → getCache → wx.getStorageSync("userInfo")`，**token/openid/unionid 就存在 storage 里**；token 由 `getOpenid` 接口下发并写缓存；**"同一 App 常在多平台上架（uni-app 等跨端方案）"⇒ 遇到不熟的平台（如抖音）就去微信搜同名小程序**；工具链：`proxypin` 抓包（可按进程转发）+ `Unveilr`/`wxappUnpacker` 解包；签名写法 `function a(b){return function(b){return b+"###"}(b)}` 这类"看着怪但等价于拼后缀"的读法。 |
| 435 | `52pojie-1934663-某迪汽车品牌小程序逆向.md` | `b36396156e88b8b7d8f0d046853ba51d` | 2026-09-23 | miniprogram-reverse | create | **A 簇双源之"2024 版"**：响应 `base64 + AES-CBC/Pkcs7`，`aes_key` 与 `aes_iv` 藏在 `constant-obfuscated.js` 的数组里；请求头四个非标准头 **`x-clienttraceid`（类 UUID）/ `Nonce` / `Curtime` / `Checksum`**；**`Checksum = sha256(appSecret + Nonce + 时间戳)`**（hex 小写）；`appSecret = %4_CA*U$GM6N#0EP`、`iv = uDEHPGzSIHIWBlNT`；**失败判据可直接定位**：`请在设置中将手机时间调成北京时间` = `Curtime` 不是当前真实时间；`checkSum error` = 签名错。另：路由型接口（`?s=…&serviceDir=…`）与"返回两个等号 ⇒ base64 或 AES，先试 base64"的起手式。 |
| 436 | `52pojie-1944883-php重写校友邦微信小程序签到加密逻辑.md` | `5140335cf28a4e39e92866c9d2d1fdb5` | 2026-09-23 | miniprogram-reverse | create | **"字符表乱序取字符"签名族**（本技能 S5 族）：62 字符表 `t` + `0..61` 数组 `n`，`r = shuffle(n).slice(-20)`，再 `s += t[e]` 拼出 20 字符的随机串；主体是**对参数字典排序后拼接 value + 秒级时间戳**，并**显式跳过一长串业务字段**（`content`/`file`/`openid`/`code`…）；落地方式：**PHP 重写**（跨语言重写的取证顺序：先照抄表与循环，再逐字符对拍）。 |
| 437 | `52pojie-1949927-某听书小程序升级了，分享破解思路.md` | `a457bda5abbfc6c5a75fdafc30acabb4` | 2026-09-23 | miniprogram-reverse | create | **业务层"客户端权限位"的适用边界**：把返回里的 `playInfo.userPermission` 置 `true` 即可静默通过；并给出"小程序转 App"的手段 —— **微信开发者工具的「多端应用模式」**（绕开模拟器/真机限制，拿到完整本地运行时）；播放地址解密用 `CryptoJS.AES.decrypt(Base64url.parse(link), Hex.parse(key), {mode: ECB, padding: Pkcs7})` ⇒ **注意是 `Base64url` + `Hex` key 的组合**。 |
| 438 | `52pojie-1975366-记录某小程序做任务伪造微博发帖.md` | `ddb9a8a967c6232885e1b2f1b3b1f93f` | 2026-09-23 | miniprogram-reverse | create | **"校验发生在客户端可控文本上"的判据**：任务只校验"提交的 URL 页面里含指定关键词" ⇒ 把正常页面 HTML 存到自建静态托管、提交这个自建 URL 即通过。价值在于**判据本身**：此类校验永远不可信（防守方应服务端直连抓取），而攻方只需"换一个能被自己控制的文本源"。 |
| 439 | `52pojie-1989465-修改某信小程序数值.md` | `1acd2d04909b896972ccad55e4d3e6b9` | 2026-09-23 | miniprogram-reverse | create | **MITM 改客户端数值（存档类小游戏）**：不需要碰包，直接在代理里改请求体/响应体的 JSON（`request()` 改上传存档、`response()` 改下载存档）；**前置硬约束：改之前先删掉小程序的本地缓存（`wxid_*/Applet/wx*`）**，否则改的是"旧版本"资源、改了没反应。 |
| 440 | `52pojie-2013121-【小程序】绝味鸭脖 xmSign参数逆向.md` | `3747dec809a7a3ded32ea7241ff4bfed` | 2026-09-23 | miniprogram-reverse | create | **真机小程序在线调试闭环**：真机微信打开 `http://debugxweb.qq.com/?inspector=true` → PC 端 `chrome://inspect/#devices`（或 `edge://inspect/#devices`）→ 刷新页面重取全部文件 → 断点调试。`xmSign = MD5(nonceStr + xmTimestamp + Base64.parse("dWgzJEhn…").toString(Utf8))`，**盐是"base64 字符串解出来的一段明文"**（`p.default.enc.Base64.parse(...).toString(enc.Utf8)` 只是编码转换、是写死值）；`nonceStr` 由 `Math.random()` 与位运算生成 32 位；`tokenSign` 同构但换成另一个盐；`getUrlParameter("li")` 是活动 id（固定）；**断点打不上时"打最后一处"** 的实证。 |
| 441 | `52pojie-2027025-记一次某电网e充电小程序逆向.md` | `9dd631afa872b1e0338ecdc173ef89d5` | 2026-09-23 | miniprogram-reverse | create | **国密 + 魔改**：请求头 `x-evone-signature` 用 **SM3（标准）+ 魔改 SM4**；设备 id 为固定值、请求 id 用随机函数生成；**判据：不要假设"名字叫 sm4 就是标准 sm4"** —— 拿浏览器真实值当 oracle 逐轮对拍；工具：`WeChatOpenDevTools`（打开小程序 devtools）。 |
| 442 | `52pojie-2038738-抖音小程序逆向工具重磅发布.md` | `33353bcc23f02135e81d0487dfbd6764` | 2026-09-23 | miniprogram-reverse | create | **抖音包的两个落点与导出流程**：`/data/data/com.ss.android.ugc.aweme/files/bdp/launchcache/<appid>_*/ver_*/`；用 MT 管理器**按时间倒序**排最新小程序；`.meta` 文件里能看到小程序名称（用于确认归属）；`/data/data/` 需 root 才能访问 ⇒ **先复制到 `/sdcard` 再分享**（或用 `adb` 导出）；**工具暂时不能解抖音小游戏（`asm` 格式）**。 |
| 443 | `52pojie-2055333-某Y院WX小程序挂号，算法还原.md` | `bd685fea772a6cc926d37f383c0c5584` | 2026-09-23 | miniprogram-reverse | create | **`uni-app` 工程 + RSA 私钥前端签名**：解包产物里页面都是 html（uni-app 特征）、能直接定位到 `wechatLogin.js`；签名是 **`SHA256withRSA`**：`KEYUTIL.getKey("-----BEGIN PRIVATE KEY-----\n" + priK + "\n-----END PRIVATE KEY-----")` → `new KJUR.crypto.Signature({alg:"SHA256withRSA"})` → `p.sign()` → **`hextob64`**；**私钥就写在包里**（`n.priK`）⇒ 纯算复现；请求体固定字段 `{app, charset, partner, plat, ticket, bizContent, timestamp, sign}`；`iv` + `encryptedData` 同现 ⇒ 大概率 AES（登录包）；**模拟器登录微信会封号** ⇒ 用 PC 版微信。 |
| 444 | `52pojie-2058182-某小程序修复及发送参数，header头和返回参数加解密逆向.md` | `54c94e4e1856cf751ca5ddc5e21a99fc` | 2026-09-23 | miniprogram-reverse | create | **双层自描述 AES + 开发者工具修复实操**：第一层解出 JSON，里面再取 **`UTS` / `UVER` 当第二层的 key/iv**（`teldAESDecrypt` 解两遍）；`getKI(aType)` 按类型取 key/iv，且 `key` 缺省时用 **`padEnd(x,16,"0")` 右补 `0` 到 16 位**；请求侧 `SVER` 是"固定文本 + 时间戳"再做 AES **取 0–16 位**、`STS` 是时间戳、`SSDI` 是设备 id（可伪造）、`Teld-RequestID` 由 SSDI + 时间戳 + 文本构成；修复清单：`componentFramework` → `"glass-easel"`、`setting` 加 `"ignoreUploadUnusedFiles": false` / `"ignoreDevUnusedFiles": false`；**调用栈里 `R` 就是 `XMLHttpRequest`，断 `R.response` 即可拿到加密返回值**。 |
| 445 | `52pojie-2063588-某迪汽车vx小程序逆向及每日签到--站在巨人的肩膀上确实可以少走弯路.md` | `1187213a76740c09e37179313080ff36` | 2026-09-23 | miniprogram-reverse | create | **A 簇双源之"2025 版"（本批最有价值的一对）**：同一个小程序升级后 —— `aes_key` **没变**（`3993014457161851`）、`aes_iv` **没变**（`PDVcDRWMrBlLHTqh`），但 **`appSecret` 从 `%4_CA*U$GM6N#0EP` 换成了 `Kfl%BOk6C5PwARw8`** ⇒ **"照抄文章里的常量必然失效，而遍历常量数组这一招跨版本依然有效"**；且 AI 读混淆数组给出的候选（`3917763gCFENO`）**是错的** ⇒ 爆破才是判据；**"同一把 key 换不同 iv 会解出部分相同明文"** 的实测记录（CBC 逐块独立 + 填充校验歪打正着）⇒ 这就是必须用 **JSON 可解析性**当判据的原因；`session_id` 由登录后服务端下发并存本地、**代码里不处理** ⇒ 签到流程的最后一个卡点。 |
| 446 | `52pojie-2088971-某安充电小程序js逆向.md` | `403458412852be010187bf5617c8c26d` | 2026-09-23 | miniprogram-reverse | create | **"参数排序 + 固定 key 拼 md5" 的最短实例**：`md5(排序后的 k=v 串 + "&key=8989898")`（小写）；定位路径：全局搜 `sign` → 看到 `MD5` → 搜 `MD5` 找加密点 → 让 AI 解释（"它会将 post 的参数加上 key 再 MD5"）；**"看不懂代码就让 AI 解释"** 的实操价值与边界（AI 能解释结构，但**常量/候选值必须自己验证**，见 2063588）。 |
| 447 | `52pojie-2122149-爬取某顺的业绩预告小程序，帮你避坑.md` | `7ffe034ebdd3eaf538dfa5380e82ae53` | 2026-09-23 | miniprogram-reverse | create | **"爬小程序数据"≠"逆小程序加密"的对照**：本篇其实是**网页端**（`data.10jqka.com.cn`）的表格抓取（DrissionPage + DOM 提取 + 翻页等待），小程序侧仅作为入口提及 ⇒ **判据：先确认目标是"小程序内的接口"还是"PC 网页版"** —— 后者根本不需要解包，本文登记为"边界用例"，避免后续同类文章被误当成小程序逆向任务。 |

### 本批次技能变更汇总（B22）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `miniprogram-reverse` | **create** | **新技能**：`SKILL.md`（分流判据表 / 工作流 7 步含 3 个 CHECKPOINT / 失败模式 18 行 / 反例黑名单 14 条 / 命令入口 / 与其它技能的边界）+ `references/unpack-and-decrypt.md`（平台↔格式↔是否加密对照、PC 包解密全参数、六个落点路径、`TPKG` 索引、支付宝 `nebula` 双路、**解包后修复清单 7 条**、改包失效处置、"解包后怎么读得动" 5 条）+ `references/request-crypto-and-sign.md`（抓包四分类、sign 五族、加密四类、key/iv/盐五来源+爆破法、**参数来源矩阵**、14 条坑表）+ `references/runtime-and-debug.md`（三条调试入口、断点五套路、**云函数 RPC 流水线**、原生层、MITM、权限位边界）+ `scripts/wxapkg_tool.py`（`--selftest` **29 项**）+ `scripts/const_bruteforce.py`（`--selftest` **11 项**） |
| `stream-drm-reverse` | evolve | 新增 `references/widevine-cdm-and-eme.md`（**国际派 E 层唯一权威源**：判派表、L1/L2/L3、**`0804` 三步链**、长短 pssh、`.wvd` 三路线、ClearKey、EME 两个 hook 点、HTTP/2、CDM DLL 代理历史、本地服务工程形态、坑表 12 条）；新增 `scripts/container_disguise.py`（**分片伪装成图片的定位与还原**，`--selftest` **21 项**）；`references/key-wrapper-families.md` 新增 **W6 外部掩码异或**整节（`DataView` 大端 vs `Uint32Array` 平台端序）+ §1 判据补"长度对 ≠ 没有包装"；`scripts/key_wrapper.py` 新增 `dataview-xor` 子命令（`--endian` / `--allow-search`），`--selftest` 52 → **66 项**；新增 `references/vendor-key-schemes.md` §2.14（优酷 mtop `sign` 派生式与失败判据）并**把 §2.13 从"边界/放弃"改写成指向新文档的指针**（原文与新文档自相矛盾，B20 教训型问题）；`references/hls-and-ts-structure.md` §4.6 判据表补"厂商托管 key URI 五参形态"；`SKILL.md` 分层表 +6 行、失败模式 +6 行、反例 +4 条、命令入口 +2 组、资源清单重写、description 补 20+ 触发词 |
| `web-js-env-patcher` | evolve | 边界声明由"**不处理**小程序"改为"**不处理小程序，请改走 `miniprogram-reverse`**；只有「把小程序 JS 搬进 Node 复现」这一步回到本 Skill"（description 同步加指针）—— 修掉"边界声明把用户指向空白"的问题 |
| `license-and-key-hierarchy.md` | evolve | 标题与导语明确限定为**国内派**，并加一段**国际派指针**（两派判据/工具/失败现象不通用；国际派没有 Provision 步骤） |
| `hls-and-ts-structure.md` | evolve | 导语补"容器伪装（分片被拼图片头）不在本文件、先用 `container_disguise.py` 还原再回来判层" |

### 结构性收敛（B22）

| 项 | 处置 |
| --- | --- |
| **同一份知识写两处且已经自相矛盾** | `vendor-key-schemes.md` §2.13 原写"Widevine 标注为边界，不做纯算实现"，与新建的 `widevine-cdm-and-eme.md`（给出完整可解链路）**直接冲突** ⇒ 把 §2.13 降级为**指针 + 判据表**，只保留"如何识别是哪一派"。这正是 B20 的结论「**自相矛盾的句子比写错的常量更危险**」的第二次实践：常量错会被来源核对抓住，这类句子不会。 |
| **"边界声明"不能只写"不做什么"** | `web-js-env-patcher` 原来只写"不处理小程序"，用户被推到空白。新技能落地后**同批**把边界改成"指向 `miniprogram-reverse`"，并保留"补环境这一步仍回到本 Skill"的分工。 |
| **新技能必须同时补"镜像 + 边界 + 台账"三处** | 双镜像 `b20-mirror-sync.py --sync`（14 文件）→ `0 mismatch`；边界改指针；台账登记 —— 三处缺一即为"半成品技能"。 |

### 证伪与审计留痕（B22）

```bash
# 1) 新技能脚本自检（29 + 11 项）
python .agents/skills/miniprogram-reverse/scripts/wxapkg_tool.py --selftest
python .agents/skills/miniprogram-reverse/scripts/const_bruteforce.py --selftest

# 2) stream-drm-reverse 全脚本回归（含新增 container_disguise 21 项、key_wrapper 66 项）
for f in .agents/skills/stream-drm-reverse/scripts/*.py; do python "$f" --selftest || echo "FAIL $f"; done

# 3) 故障注入阳性验证（每个新断言点都必须"变红"）
#    证据：artifacts/skill-evolution/b22-run-20260923/ 的注入记录
#    实测：wxapkg_tool 3/3 变红（xorKey 边界、索引截断分支 A、分支 B）、
#          const_bruteforce 1/1、key_wrapper 2/2、container_disguise 1/1

# 4) 来源保真度（138 条声称 / 35 篇源文件 / 0 未命中）
python artifacts/skill-evolution/tools/b22-verify-sources.py

# 5) 机械校验 + 双镜像
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 6) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b22-ledger.py
```

### 下一批（B23）取材建议（承接本节）

- 待处理 **436** 篇（台账 447 条后）。
- 优先级：
  ① **小程序簇仍有余量**：本批 35 篇已建技能，后续同簇**一律走 `miniprogram-reverse` 的 evolve**，
     重点补"**云函数/RPC**"与"**原生层**"两个薄区（本批各只有 1~2 源）。
  ② **WebView / Electron / asar / jsc / v8 字节码簇**（`forum-corpus-archival` 记录的覆盖盲区）仍未建档，
     同样按"有没有最近邻模块"判据评估。
  ③ **验证码图像识别系剩余**（真拼图 / 双缺口 / 旋转点选坐标侧）。
  ④ **Cloudflare / WAF 簇**：B21 已收口，后续一律先量化再决定。
  ⑤ **ts 帧加密簇剩余**（`keep` 状态的几篇）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B22 **十六次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
  **注**：B1-17 / B13-216 的"不建小程序技能"结论在 B22 被**推翻并取代**（见本节 B 簇）——
  当时的判据是"样本量不足以支撑独立技能"，而 B22 时该簇已积累到 **35 篇**且**连续 6 轮为最大单簇**，
  判据从"样本不足"变成了"**无最近邻模块 + 规模最大**" ⇒ **建**。旧结论保留可追溯，但不再作为处置依据。

---

## 批次 B23 · 2026-09-23（第二十三次执行）

取材口径：待处理队列 **454 篇**中取两个**互相独立**的簇 —— **A 簇 16 篇**（桌面客户端 / Electron / asar / `.jsc` / V8 字节码，全部落地**新技能 `desktop-client-reverse`**）与 **B 簇 15 篇**（无感/行为验证的请求链与签名头、验证码图像识别剩余，落地 `web-verify-patcher` 与 `web-js-env-patcher`）。两簇刻意同批：A 簇验证「**技能库里没有最近邻模块（`miniprogram-reverse` 是小程序、`web-js-env-patcher` 是浏览器补环境）时应当建新技能**」，B 簇验证「同一主题已有成熟技能时应当**只 evolve**」。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 448 | `2092084-web-js-rev-v8-ast-bytecode.md` | `0a3ca55625c4e9f1f2752c08fdc3ae39` | 2026-09-23 | desktop-client-reverse | create | **34 万字节的 V8 长文，只取「读懂反汇编」的部分**：词法/语法分析 → AST → 作用域与闭包 → Ignition 的**累加器模型**（`Lda…` 系列、`Star`、`CallProperty`）→ 二元表达式的求值顺序 → 常量池里的 `SharedFunctionInfo` 需要**递归**反汇编（d8 补丁里的 `visited` 集合就是防重/防爆栈）。**边界写进文档**：这些知识用来读反汇编与调试栈，**不用来「还原源码」**。 |
| 449 | `52pojie-1307664-半夜逆向一个Cocos2D-JS做的棋牌App,解密Jsc拿下Authorization算法.md` | `4588a277bab282d6e10aef04eaf9efdf` | 2026-09-23 | desktop-client-reverse | create | **Cocos2d-JS 的 `.jsc` = xxtea(+gzip)**：引擎里是 `ungzip(xxtea_decrypt(file, key))`（`ZipUtils::isGZipBuffer`）；密钥取证给了一条**可复用套路**——从原包搜报错串 `Can't decrypt code for %s`，密钥就在其邻近；亦可「自己用 cocos 打个 demo 再在产物里搜预设 key」。业务侧：`Authorization` 来自服务端下发（未登录也下发）。 |
| 450 | `52pojie-1362276-Cocos2DX-JS 加密逆向探究解密app实战.md` | `d8da99168c29f1896bf2181e4e03a89c` | 2026-09-23 | desktop-client-reverse | create | **同题的独立第二来源**（从 so 侧正向确认 key）：`armeabi-v7a/libcocos2djs.so` → `JNI_OnLoad` 链 → 搜 `decrypt`；明确「**按目标机型取对应架构的 so**」；并点破「网上文章你抄我我抄你」，以及 **cocos2d-x 与 cocos2d-html5 的 jsc 不是一回事**（后者才是真字节码）。 |
| 451 | `52pojie-1553861-asar unpack细节.md` | `a2fbee560e8ee4ad476822e707c73241` | 2026-09-23 | desktop-client-reverse | create | asar 的最小工作面：`asar e app.asar ../abc` 解包 / `asar p ../abc app.asar` 回包；口径「命令行在 Linux 上更稳」；附一段 AES-CBC + PKCS7 的解密脚本用于被二次加密的 js。 |
| 452 | `52pojie-1657066-PJ一个小游戏（js逆向）.md` | `641e372b7d240843425e5ef5d4f4dd8e` | 2026-09-23 | desktop-client-reverse | create | **WebView 类客户端 → 网页游戏**的标准开局：jadx 发现是 WebView → 去 `assets/` 解压 → 双击跑不起来 → `python3 -m http.server 8088` 起服务后**就是网页游戏**（源码全文可搜）。定位要改哪个值：**先确定「要什么」再搜业务名词**，命中展示变量后**必须跟到真正消费的那一层**；字典 key 反查三法（对照自己数值 / 查配置项 id / 继续跟解析）。 |
| 453 | `52pojie-1664417-Electron 逆向实战.md` | `3a92779926add21d6673e64f12c921cd` | 2026-09-23 | desktop-client-reverse | create | **信息量极低的视频帖（只有三句结论）**，登记它只为一条判据：**桌面端并不都存在混淆** —— 原文口径是「过程非常简单，没有混淆，没有 AST」 ⇒ **先解包读源码，再决定要不要上反混淆**；预设「必须反混淆」会把简单任务做成大工程（与本轮的 `desktop-client-reverse` 反例清单同源）。 |
| 454 | `52pojie-1859296-使用浏览器插件屏蔽小游戏网站的反调试.md` | `d32b24d85522c6d00fca7ad88f929fb2` | 2026-09-23 | desktop-client-reverse | create | **反调试的「网络层」解法**：DevTools 的本地 override **必失效**，因为脚本 URL 带**随机参数**、override 只能同名替换；改用浏览器插件 + `declarativeNetRequest` 按 URL 规则**把脚本替换成空文件**（`rules_1.json` 规则 + 替身脚本 + 后台脚本三件套）。判据价值：**随机参数打死静态替换，打不死请求层重定向**。 |
| 455 | `52pojie-1913191-某 xor + xxtea 加密 jsc 解密记录.md` | `9caf6a5db3610cb350d2eef1d6659df6` | 2026-09-23 | desktop-client-reverse | create | **网易系 `.jsc` 的第二层包装**：文件头 `netease` + `01 01 01 EF`（共 11 字节）先剥掉，再**重复密钥异或**，然后才是 xxtea（`cc::FileUtils::getDataFromFile` 的实现已逐行核对）。方法论最值钱的一条：作者**先用「两个 key 命名与格式对称 ⇒ 生成算法同源」的推理去 so 里枚举 16 位字符串爆破拿到 xor_key，再回 IDA 正向证实** —— 「先爆破拿结果、再静态证机制」是取证顺序上的最优解。 |
| 456 | `52pojie-1921927-对webview2 客户端资源爬取.md` | `3a2532e4bd890fc71fb08d3f5cbba911` | 2026-09-23 | desktop-client-reverse | create | **WebView2 的开工具路线**：目标只加载 `EmbeddedBrowserWebView.dll`（路径 `C:\Program Files (x86)\Microsoft\EdgeWebView\Application\<版本>\EBWebView\x64`，**不同版本不通用**）；`OpenDevToolsWindow` 与 `Navigate` 同属 `embedded_browser_webview_current` 虚表 ⇒ **把虚表里的 `Navigate` 指向 `OpenDevToolsWindow`** 即可弹出 DevTools；随后导出全部资源 + 记下**虚拟域名**，用官方 `Win32_GettingStarted` 的 `SetVirtualHostNameToFolderMapping` 本地复现（比 DevTools 本地覆盖更稳）。 |
| 457 | `52pojie-1926574-【Web逆向】基于Electron的CrackMe详细教程.md` | `36f0bb601e901a9e23245bb69134f036` | 2026-09-23 | desktop-client-reverse | create | **最便宜的入口是本地端口**：`netstat -na` 找 `127.0.0.1:<port>` 直接当网页调；Electron 是多进程 ⇒ 选「点开界面时新建的那个」，其他进程没反应；`F12`/`Ctrl+Shift+I` 被 `preventDefault` 挡掉但菜单仍可用；无限 debugger 的**正确改法是破坏表达式**（`'debu'+'gger'` → 去掉一个 g），删整行会让后续逻辑进奇怪分支。 |
| 458 | `52pojie-2005677-electron asar 加密包解压 偏移修复.md` | `014e15b0bf31b6614e9e14073d0973e7` | 2026-09-23 | desktop-client-reverse | create | **asar 「解压成功但内容全是垃圾」= 偏移错位，不是加密**：归档前多 25 字节（还要在数据段里再删同样一段），**因为 `package.json` 是第一个文件，改它的偏移会让后续所有文件同时归位**。本轮把这套手工流程工具化：`asar_offset_repair.py` 用「按扩展名的内容合理性」反推**单一 delta**，只改包头长度字段即可修复（`--selftest` 22 项，含前缀/后移/虚高/目录被改四类故障注入）。 |
| 459 | `52pojie-2054765-JSC字节码反编译初探——以Typora 1.10.8为例.md` | `96b342a9c1b77d5c3073aa4951db3035` | 2026-09-23 | desktop-client-reverse | create | **V8 字节码这条路要先看代价**：给 d8 加 `Disassemble`/`LoadJSC`（`CodeSerializer::Deserialize` + `AlignedCachedData`）、还必须**严格对齐 V8 版本**（Electron 32.1.2 ⇒ v8 `12.8.374.33`；自 v12 起 API 大改导致网上补丁失效）、连 `objects-printer.cc` 里的 `PrintSourceCode` 都要改。产出是**反汇编而非源码** ⇒ 本技能的处置是：**只有在目标无法在环境里运行时才值得**，否则一律走「当 Node 模块 `require` 进来 + 劫持 API」。 |
| 460 | `52pojie-2084047-Typora v1.12.4 安全分析：反反调试与激活劫持.md` | `8c6f07a4a357604acd6a8d33530fb9e0` | 2026-09-23 | desktop-client-reverse | create | **本批 A 簇的骨干来源**：① 入口 `launch.dist.js` 自定义 V8 环境并 `require` 字节码 ⇒ **`.jsc` 就是个 Node 模块**（决定了后续全走劫持）；② `OnlyLoadAppFromAsar` fuse 锁死加载优先级，用 `@electron/fuses` 的 `flipFuses` 关掉（会改 exe 哈希，先备份）；③ 完整性校验用 `fs/promises.readFile` 比对**四个文件**的 hash、失败即 `app.quit`，**同一个 `fs` 对象**决定了可以把 `resources\app\` 的读取重定向到 `app.bak\`；④ 入口注入骨架（拦 `app.quit` + `browser-window-created` 后等 `dom-ready` 开 DevTools + `ipcMain.handle` 日志 + `electron.net.request`/`protocol.handle` 伪造响应，转发必须 `bypassCustomProtocolHandlers`）；⑤ **黑盒推数据结构**：假 Buffer → `Proxy` 观察 `toString/length` → 再 `Proxy` `JSON.parse` 看读了哪些键 ⇒ 得到 `deviceId/fingerprint/email/license/version/date/type`；⑥ 界面 `Machine Code` 是 base64（`v`/`i`/`l` 三个键）。 |
| 461 | `52pojie-2085249-代码整理【Typora v1.12.4 安全分析：反反调试与激活劫持】.md` | `9be3c5f8ee44998e1adced4c853ae247` | 2026-09-23 | desktop-client-reverse | create | **同题的独立第二来源（可交叉验证）**：同一套 hook 的完整工程化版本（`@electron/fuses` + winreg/readlineSync 交互），验证「拦截 `app.quit` + `readFile` 重定向 + `crypto.publicDecrypt` 返回伪造明文」是一条**可复现**的路线，不是单篇孤证。 |
| 462 | `52pojie-2106643-秒盗账号钱包！伪装Electron程序暗藏后门窃取加密数据.md` | `3b499ce0776668306db56026b572fdc8` | 2026-09-23 | desktop-client-reverse | create | **防守侧（火绒）对同一技术栈的分析，用作「识别」判据**：入口 `main.js` 加载 **bytenode 编译的 `decrypted_payload.jsc`**、并在**运行时恢复**主 payload ⇒ 再次印证「字节码只是载体，行为在运行时通过 Node API 展开」（**行为/API 劫持比反编译字节码有效**）。窃取面画像（`Login Data`/`Web Data`/`Cookies`/`Local Storage` 的 leveldb + 从 `Local State` 恢复 Chromium 密钥 + `App-Bound` 第二阶段）**只登记为「这是不是恶意载荷」的判据，不提供任何提取实现**。 |
| 463 | `52pojie-2112074-某OpenClaw 一键部署包激活绕过思路分享（Node.js pkg 二进制 patch）.md` | `473c009aa18a863e30699fc6a9f95f9e` | 2026-09-23 | desktop-client-reverse | create | **Node.js pkg 单文件 exe：`strings` + 等长字节补丁**。判据与操作：`activated:!1`（false）→ `activated:!0`（true）是**等长替换**，原文共 patch **15 处**覆盖「在线校验 / 本地缓存 / 离线 fallback」三条返回路径 ⇒ **只改一处必然漏**（这就是 `byte_flag_patch.py` 的 `--expect` 前置断言的由来）。**⚠️ 溯源标注**：该原文无复现步骤、样本走网盘，本批只采纳其**方法论与「备份 + 断言 + 复检」操作契约**，不背书其数值。 |
| 464 | `52pojie-1978737-某云无感滑块逆向之“大爷，饶了我吧！”（上）.md` | `9cf816d50e830fc86059464b160b1e33` | 2026-09-23 | web-verify-patcher | evolve | **阿里云验证码 2.0 的前两个请求**：`Action=InitCaptchaV2`（`Version=2023-03-05`；`SignatureMethod=HMAC-SHA1`；真正要逆的只有 `SignatureNonce` + `Signature`，其余多为固定值或起始页下发）与 `Action=Log2`（**`Version=2020-10-15`，与前者不同**；`Data` = 两重 AES-CBC + base64，且必须先解响应里的 `deviceconfig`（同为 AES-CBC+base64）拿到 key/iv，而 key/iv 在 `AliyunCaptcha.js` 里）。**定位坑**：同站有 **6–8 份 `feilin*.js`**，断点可能落在不执行的那份上；**可复用判据**是「表单写了 `SignatureMethod: HMAC-SHA1` ⇒ 直接搜 `SHA1`」，以及基础数据**用 `#` 连接**这一特征串。 |
| 465 | `52pojie-1982617-某云无感滑块逆向之懵了几天（下）【修改一下有始有终】.md` | `8d18e7b262e110c474ccf2e549da9d45` | 2026-09-23 | web-verify-patcher | evolve | **同目标的第二会话（下篇）**：`Action=VerifyCaptchaV2` 的 `CaptchaVerifyParam` = `{sceneId, certifyId, deviceToken, data}`；轨迹明文是 **`TrackList`**（`mc` 起始点 + `mp`/`mm` 的 `x,y,t,1|…` + 7 个空串占位 + `si` + `startTime`，外层 `TrackStartTime`/`VerifyTime`/`arg`）。**判据**：断点处出现 **`TextEncoder`/`Uint8Array`** ⇒ 轨迹是「对象→数组→二进制→拼装」后才进 AES，**不是普通 AES/HMAC 路线**；并且那条代码里有 `prototype` ⇒ **必须整块扣，否则掉进补环境地狱**。`si` 语义未明 ⇒ 本批口径是**一律透传、不臆造公式**。参数时效性：两次会话 `AccessKeyId` 相同但 `CertifyId`/`deviceToken`/`SignatureNonce` 全换（**取一次马上用**）。 |
| 466 | `52pojie-1697353-快手滑块—逆向分析（web）.md` | `46519a526dfbcbe8f3b592f9a9fc1146` | 2026-09-23 | web-verify-patcher | evolve | **快手滑块的提交侧**：校验接口 `captcha.zt.kuaishou.com/rest/zt/captcha/sliding/kSecretApiVerify`，主参数 `verifyParam`（内含加密后的轨迹 `c`）。轨迹容器=`x|y|Δt` **逗号连接**，`Δt` 相对**整条轨迹起点**（`t.trajectory[0][2]`，且在 `slice(-100)` **之外**计算），浏览器里的原始 `c` 带**前导逗号**、提交前 `.slice(1)`。**断点位置的判据**：行 6374 时 `c` 仍是 `undefined`，F8 到 6394 才算出来 ⇒ 值不在第一次断下的那一层。 |
| 467 | `52pojie-1745678-抖音 滑块验证方案 s_v_web_id 参数分析.md` | `784eec05ae7f2a1a701e274e7c9257c6` | 2026-09-23 | web-verify-patcher | evolve | **抖音 `s_v_web_id`**：过滑块后的 `s_v_web_id` 可免 `signature` 验证；它本身就在**验证码中间页 HTML 的 `fp` 参数**里。可本地生成的形态=`verify_` + base36 毫秒时间戳 + `_` + **36 位 UUID v4 变体**（第 8/13/18/23 位固定 `_`、第 14 位固定 `4`）。**用途边界（关键）**：自造的那份**不能用于采集评论**，评论必须用页面取下来的那份 ⇒ **同一参数在不同接口的可复现性不同**。两个实测坑：下载图片报「当前网络不稳定」要补 `「app_name」: 「」`；2023 元旦后轨迹校验收紧，**selenium 基本过不了**。 |
| 468 | `52pojie-1857712-【验证码逆向专栏】百某网数字九宫格验证码逆向分析.md` | `d946725cfd865c4c72080be7e8e8d78c` | 2026-09-23 | web-verify-patcher | evolve | **九宫格类的难点在 cookie 状态机，不在算法**：冷启动必是 **307** → Set-Cookie `_trackId`/`__city` → **必须真实请求 `bf.js`**（否则一直 307）→ 两次 `s.webp`（带 `cf`/`s`/`f`）→ 第二次响应的 `sbxf`（值同 `bxf`）**激活 cookie** → 再请求主页才是验证码页。参数派生：`s = MD5(固定串 fc276cce08ba22dc + 35 位串)`、`f` = 那个 35 位串 = `MD5(canvas 图 base64)` 分 4 组 8 位后用 `1` 连接（三目判断恒 true ⇒ 直接写 `1`）；第二次把固定串换成「第一次响应的新 base64 的 MD5」。**三条可直接复用**：① 同设备同浏览器 canvas 结果固定 ⇒ **取一次写死，不必补 canvas 环境**；② header **只加 `Referer` + `User-Agent`**（多个 `Host` 都可能失败）；③ 「值对但不成功」有两个独立来源（cookie 状态机不全 + 坐标本身的坑）。 |
| 469 | `52pojie-1872638-某备案查询网站 汉字点选逆向分析.md` | `0cfd3600859494a936f7dcc20959a09d` | 2026-09-23 | web-verify-patcher | evolve | **点选类「验证通过只是拿到一个 header」的最清晰实例**：521(jsl) → `/auth`（`authKey`=MD5(时间戳+盐)、`timeStamp`）拿 `token` → `/getCheckImagePoint`（`clientUid`=设备 id，**存 localStorage**）返回 `bigImage`/`smallImage`/`secretKey`/`uuid`/`wordCount` → `/checkImage`（`clientUid`+`pointJson`+`secretKey`+`token`）通过后**多返回一个 `sign`** → `/queryByCondition` 需要 **`Cookie`/`Sign`/`Token`/`Uuid` 四头齐全**。定位技巧：设备 id 搜不到生成点就搜 **`localStorage.getItem`**。 |
| 470 | `52pojie-1903272-某东常用验证码逆向流程分析.md` | `c2c8349ae1a0b2ec89abb01b67c9edc7` | 2026-09-23 | web-verify-patcher | evolve | **站点自研滑块的 `g`/`s` 双接口形态**：`g` 取图 + 下发参数（`appId`/`scene`/`product`/`lang` 可写死、**`callback` 的随机数也能写死**，真正要跟的是 `e`/`j`，跟进去会进 VM），`s` 做校验（`c`≈challenge，**重点是 `d`**）。**同站多形态并存**（登录滑块 / `cfe` 链接滑块 / `cfe` 链接点选）⇒ 不要假设「一个站只有一套验证码」。风险提示（原文口径）：旋转验证码一旦触发基本等于高风险标记，手势验证码只出现在固定接口。 |
| 471 | `52pojie-2088578-某雷云盘验证码逆向思路总结.md` | `a69abc5def0454577bfdef775d6d84e2` | 2026-09-23 | web-verify-patcher | evolve | **`ck0.` 无感 token 的「只登记结构」案例**：`x-captcha-token = ck0.<Part1>.<Part2>`，`Part1` 是 **base64url**（用 `-`/`_`）的加密数据，`Part2` 解码后疑似 **protobuf**（`client_id`/`version=1.92.33`/`domain`/`device_id`/`signature`）；配套头 `x-device-id`/`x-client-id`。**⚠️ 原文对「生成原理」给的是明确推测（「根据结构推测」）** ⇒ 本批只登记**结构 + 判据**，并写明取证建议是「先判能否沿用现成 token / 设备一致性，再走浏览器侧 hook」，**不登记任何公式**。 |
| 472 | `52pojie-1882302-易盾点选踩坑.md` | `c9caf2c8fe913cae2b2d0351eb790235` | 2026-09-23 | web-verify-patcher | evolve | **正确率四因素（本批最有操作价值的一条）**：① **请求头完整性**（`Accept`/`Accept-Language`/`Cache-Control`/`Connection` 这些「平时懒得不加」的头是重要变量）；② **`callback` 随机范围不能大于 10**；③ **`fp` 必须与站点域名对应**（滑块写死域名仍有 ~80%+，**点选写死且站点不对只有 0–10%**）；④ **发送间隔**（轨迹耗时 1s 就别在 0.1s 后提交，点选有**时间一致性校验**）。配套分级：**无感 < 滑块 < 点选**（无感**不发 `d`/`b` 包**、防御最低；「能过无感」≠「能过点选」）。补充：点选对**轨迹形状本身**校验很松（直线也能过）⇒ 四因素没达标时换什么轨迹都没用。 |
| 473 | `52pojie-1868945-[补环境流]易盾智能无感逆向fp参数.md` | `1eab7bbf0e2fb2940876b4a021aa012c` | 2026-09-23 | web-js-env-patcher | evolve | **易盾无感 `fp`（cookie `gdxidpyhxdE`）的环境检测点**：`localstorage`/`body`/`openDatabase` 存在性检测 + canvas/DOM 检测；**最值钱的一条**是 `div.style.color='ActiveBorder'` 后 `getComputedStyle(div).getPropertyValue('color')` **必须返回 `rgb(...)`**（实测同一系统色在 Firefox 与 Edge 下 rgb 不同 ⇒ 判据是「**形态必须是 rgb**」而非某个值，随机色也能过）；**直接用 jsdom 的 `getComputedStyle` 会被立刻识破**。 |
| 474 | `52pojie-2074942-steam hcaptcha 一些环境监测点分享.md` | `83c825baccdc3f45425c7e135300859a` | 2026-09-23 | web-js-env-patcher | evolve | **hCaptcha 的环境检测点清单**（补环境流的对照表）：Math 精度（`cos(13*Math.E)`/`pow(PI,-100)`/`sin(39*Math.E)`/`tan(6*Math.LN2)` 与 Node 有**微小差异**）、`getImageData` 必须与本次 **`fillStyle` 自洽**（按 rgb 动态解析，不能写死）、`measureText` 字体 **7 个值 + 92 个 emoji**、`OfflineAudioContext` 求和、`toDataURL` **四次**、Worker/SharedWorker（**只要能触发 `message` 即可，不必新开 VM**）、**15 处描述符批量检测**（最容易出图的一项）。三条取证口径：**CSP 只删最后一处 script 校验**（`object-src 'none'; base-uri 'self'; worker-src blob:` 不能删）、**wasm 初始化那次可以不实现**（日志减半）、**先用「写死浏览器指纹数组」做二分**（写死能过 ⇒ 问题在你生成的数组上）。 |
| 475 | `52pojie-1606710-非深度学习非调用API过猿人学第八题点选验证.md` | `1208dab9ca6d2f71d05065e772b106b7` | 2026-09-23 | web-verify-patcher | evolve | **点选的第三条路线：不识别文字，只做相似度**（生僻字/繁体字九宫格的最优解）：用**同款字体（微软雅黑粗体，88pt）把题面渲成 85×85 单字图**，把九宫格按**估算分割坐标**切块（原文坐标表 + `block_list`），逐块用**像素相同数量或余弦距离**比对取最大（实测两者都准，「10 次基本无错」）。三个必须调对的细节：**干扰线判据是「同色像素 > 10」**、**分割坐标要估且最右侧补全居中**、**字体必须接近目标**。 |
| 476 | `52pojie-1606904-某网站captcha 机器人检测原理分析.md` | `5a835d8dfc8415429d67b2687d8544ad` | 2026-09-23 | web-verify-patcher | evolve | **「本地通过 ≠ 服务端认可」的机制级证据**：未混淆的 `captcha.js` 里 `options.onSuccess` 需要 `e.verified` 与 `e.spliced` 同时为真（`e` 来自 `n.verify()`）；而 `verified` 的判定**可配置为本地校验或把鼠标轨迹发服务器校验**（该站用本地）。⇒ 看到「通过」只能说明这一层过了，业务接口的返回才是判据。 |
| 477 | `52pojie-1634219-pyppeteer过某里纯滑块【通用】.md` | `03aa8262aeac46cb5effc7b8912ec782` | 2026-09-23 | web-verify-patcher | evolve | **两个与算法无关但极高频的坑**：① 自动化被检测的直接原因是 **pyppeteer 启动参数 `--enable-automation`**（在 `launcher` 源码里注释掉即过）⇒ **「被检测」有时在驱动层，不在 JS 指纹层**；② **验证结果的参数映射**：业务请求 `session_id`/`sig`/`token` 分别对应滑块成功返回的 **`csessionid`/`value`** 与请求自身的 `token` ⇒ 排查「过了验证却登录失败」第一步应**逐字段对表**。 |
| 478 | `52pojie-867169-小学数学破解滑动拼图验证码.md` | `4f523ba713c50832ca036e903d523157` | 2026-09-23 | web-verify-patcher | evolve | **零依赖缺口定位法（竖线灰度方差扫描）**：3×3 方块竖向扫描，比较「**第三列方差 B3**」与「三行方差 A1/A2/A3」（B3 大于其中两个即疑为缺口左边缘）；因单点噪声大，必须**按列聚合**——每列命中块数 **> 20** 才建分，得分 =「该列内**连续**命中块数之和」，取最高列。**适用前提（必须点破）**：缺口形状**每轮不变**（左边缘是一条 ~40px 竖线）；形状随机时立刻失效。 |

### 本批次技能变更汇总（B23）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `desktop-client-reverse` | **create** | **新技能**：`SKILL.md`（分流判据表 11 行 / 工作流 7 步含 2 个 🔴 CHECKPOINT / 失败模式 15 行 / 反例黑名单 11 条 / 命令入口 / 与 6 个技能的边界）+ `references/electron-asar-and-fuses.md`（asar 三段布局与 `data_start = 8 + header_size`、偏移错位两种成因与「只改长度字段」的修复原理、`integrity` 与 fuse 的关系、八个 fuse、完整性校验四文件与 `fs.promises.readFile` 重定向、入口注入顺序、IPC/`electron.net`/`protocol.handle` 接管、`Proxy(Buffer)`+`Proxy(JSON.parse)` 黑盒推字段、本地端口与反调试、12 条坑表、反例）+ `references/jsc-and-v8-bytecode.md`（`.jsc` 两类形态判据、Cocos `ungzip(xxtea_decrypt())`、网易 `netease`+`01 01 01 EF` 与重复密钥异或、密钥取证三落点、d8 打补丁的真实代价、**「字节码不进环境就别想调」**、pkg `strings`+等长补丁、V8 侧只读知识的用途边界、恶意载荷识别画像与边界）+ `references/desktop-runtime-surfaces.md`（WebView2 虚表开工具与虚拟域名复现、Cocos/WebView 资源包与 `http.server`、插件 `declarativeNetRequest` 覆盖反调试、本地端口、客户端数值目标五路线）+ `scripts/asar_offset_repair.py`（`--selftest` **22 项**）、`scripts/jsc_xxtea_tool.py`（**29 项**）、`scripts/byte_flag_patch.py`（**15 项**） |
| `web-verify-patcher` | evolve | 新增 `references/behavior-verify-and-sign-headers.md`（**无感/行为验证的请求链唯一权威源**：无感<滑块<点选分级、阿里云验证码 2.0 四请求链与 `deviceconfig`→`Data` 依赖、`CaptchaVerifyParam`/`TrackList`、快手 `verifyParam`、抖音 `s_v_web_id` 的用途边界、九宫格 cookie 状态机、点选 `sign` 与业务四头、站点自研 `g`/`s` 双接口、`ck0.` 只登记结构、正确率四因素、本地通过≠服务端认可、14 条坑表 + 反例）；`references/motion-and-coordinate.md` 新增两节（**轨迹容器与时间校验**、**竖线灰度方差零依赖缺口定位**）；`references/click-select-and-order.md` 新增**路线 0（渲染图相似度）**；新增 `scripts/trajectory_codec.py`（`--selftest` **24 项**，含快手真实轨迹夹具 `KUAISHOU_FIXTURE`）；`SKILL.md` 两处指针 + description **在加入 6 组新触发词的同时把同义堆叠压缩到上限内** |
| `web-js-env-patcher` | evolve | `references/webapi-env-detection-matrix.md` 新增整节「风控 / 验证码类目标的高频环境检测点（B23）」8 项探测点（Math 精度 / `getImageData`↔`fillStyle` / 系统色→rgb / 字体 7 值+92 emoji / `OfflineAudioContext` / `toDataURL`×4 / Worker 只需 `message` / 15 处描述符）**并显式声明「本节不新增触发类别」**（映射到既有枚举，避免与 `check_webapi_env_detection_matrix.js` 的闭集冲突）；`SKILL.md` 加指针 + description 触发词 |

### 结构性收敛（B23）

| 项 | 处置 |
| --- | --- |
| **description 已超出 1024 上限**（`web-verify-patcher` 实测 **1026**） | 借本轮新增触发词之机**压缩同义堆叠**（点选/旋转/切片乱序等 8 处重复说法、以及厂商长括号里的修饰语）⇒ **990 字符**，**新触发词进得来、总量回到上限内**。这是「不改功能只改表达」的结构性收敛，不是功能性删减。 |
| **新技能的「边界」不能只写「不做什么」** | `desktop-client-reverse` 一次性写清与 6 个技能的分工（Web 算法/补环境/WASM/WebSocket/流媒体/小程序的归属），并**反向不做修改**（避免把别人的能力面写坏）。 |
| **未明字段一律透传** | `TrackList.si`（阿里云）与 `ck0.` 的 `Part1` 生成公式**都不臆造**：文档写明「语义未明/原文是推测」，工具里做成**原样透传参数**（`--si`）。 |
| **语料 Markdown 转义会制造假未命中** | 保真度脚本新增 `norm()`（`\_`/`\*`/`\-`/`\|` 归一化）：本轮 269 条断言里 **8 条**假未命中全部由转义造成（`JNI\_OnLoad`/`vm\_data`/`app\_name`/`session\_id`/`rules\_1.json`…）。 |
| **只登记结构、留可追溯缺口** | `2088578`（`ck0.`）与 `1664417`（视频帖）都按「信息量不足」口径登记：**登记判据与边界，不写公式、不写实现**。 |

### 证伪与审计留痕（B23）

```bash
# 1) 本批新脚本自检（22 + 29 + 15 + 24 = 90 项）
python .agents/skills/desktop-client-reverse/scripts/asar_offset_repair.py --selftest
python .agents/skills/desktop-client-reverse/scripts/jsc_xxtea_tool.py --selftest
python .agents/skills/desktop-client-reverse/scripts/byte_flag_patch.py --selftest
python .agents/skills/web-verify-patcher/scripts/trajectory_codec.py --selftest

# 2) 既有脚本回归（web-verify-patcher 全部脚本）
for f in .agents/skills/web-verify-patcher/scripts/*.py; do python \「$f\」 --selftest || echo \「FAIL $f\」; done

# 3) 故障注入阳性验证（4/4 变红；证据见下方口径）
python artifacts/skill-evolution/tools/b23-fault-injection.py

# 4) 来源保真度（31 篇源文件 / 222 条事实 + 47 条产物断言 / 0 未命中）
python artifacts/skill-evolution/tools/b23-verify-sources.py

# 5) 机械校验 + 双镜像
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 6) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b23-ledger.py
```

**故障注入明细（基线绿 → 注入后红）**：

| 注入点 | 结果 |
| --- | --- |
| `asar_offset_repair.py`：把「所有抽样文件都命中」放宽成「允许少一个」 | rc 0 → 1，命中 `自检-L 目录被改必须报 inconsistent` ✓ |
| `jsc_xxtea_tool.py`：交换「剥签名头」与「异或」的顺序 | rc 0 → 1（以异常形式失败，**不是静默通过**）✓ |
| `byte_flag_patch.py`：`--expect` 只告警不中止 | rc 0 → 1，命中 `--expect 不符时不得落盘` ✓ |
| `trajectory_codec.py`：`Δt` 基准改成相邻点差 | rc 0 → 1，命中 `limit-last=2 … dt 仍相对全轨迹首点` ✓ |

**清点**：台账 **447 → 478**（本批登记 **31** 条，编号 **#448–#478**）；待处理 **454 → 423**；新建技能 **1**、演化技能 **2**。

### 下一批（B24）取材建议（承接本节）

- 待处理 **423** 篇（台账 478 条后）。
- 优先级：
  ① **桌面客户端簇的「下一步」**：`asar`/fuse 已收口，若再遇到同族，优先补「**Tauri / node:sea / NE 打包**」与「**原生模块（.node / .dll 加壳）**」这两个薄区；
  ② **验证码图像识别系的坐标侧**（真拼图 / 双缺口 / 旋转点选）仍有剩余，一律走 `web-verify-patcher` 的 evolve；
  ③ **无感/行为验证**剩余（更多厂商的「多请求链 + 签名头」形态）继续并入 `references/behavior-verify-and-sign-headers.md`，**不要为每家建新文件**；
  ④ **环境检测点**继续并入 `web-js-env-patcher` 的矩阵节（注意：新检测点必须映射到既有触发类别，枚举是闭集）；
  ⑤ 小程序 / ts 帧加密 / Cloudflare 三簇 **按已有结论走**（前者 evolve，后两者先量化再决定）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B23 **十七次确认不新建**（证据池仍未跨越「单站一流程」到「可复用编排协议」的门槛）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
  **注**：B1-17 / B13-216 的「不建小程序技能」结论在 B22 已被**推翻并取代**（改判为「无最近邻模块 + 规模最大 ⇒ 建」），旧结论只保留可追溯性。

---

## 批次 B24 · 2026-09-23（第二十四次执行）

取材口径：待处理队列 **429 篇**中取**一个自洽的能力簇 —— 边缘风控 / 站前挑战厂商带 10 篇**（加速乐 jsl 双变体 ×2、雷池 SafeLine、qrator、Cloudflare `jsd/oneshot`、Akamai VM2 特征、瑞数 5 代补环境实战 ×2、JS 盾 JSVMP、知乎 `x-zse-96` 补环境踩坑）。选它的理由有两条：① B23 记忆里「桌面客户端下一步」（Tauri / node:sea / NE 打包 / 原生模块）**在本队列里一篇都没有**（已按关键词扫过 429 篇，0 命中）⇒ 不能为了「按计划走」而硬凑；② `web-js-env-patcher` 的 `edge-waf-cookie-challenge.md` 自 B1 起从未做过**厂商扩容**（只有 B1 的 Akamai、B4 的瑞数），而本轮**两家新厂商各自带完整的纯算交付**（雷池的 PoW+AES、qrator 的 PoW），可同时检验一条此前没验证过的维护规则：**有成熟技能时只 evolve，但新增厂商必须同步「闭集判据器」的三处**。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 479 | `52pojie-2065287-某平台登录：加速乐.md` | `f20247bb68e849633558900bd8f3b332` | 2026-09-23 | web-js-env-patcher | evolve | **加速乐第三篇（与前两篇互证）**，最值钱的是三条**操作级判据**：① **`HttpOnly` 反过来就能分类 cookie** —— `HttpOnly=true` 的只有响应头 `Set-Cookie` 有值（服务端下发，如 `__jsluid_s`），`HttpOnly=false` 的响应头该字段**为空**，值只能由本地 JS 算出（即 clearance）⇒ **抓新站第一件事就是把 cookie 分成这两类**；② 对 `document.cookie` 做 hook 时实测两个反直觉现象 —— **第一趟响应里的赋值根本没触发 hook**、**放开断点会让第二趟重复请求**（关掉油猴脚本才正常）⇒ hook 不能作为本族唯一取证手段，改用「本地替换 + 本地/浏览器结果逐字段对比」；③ 第二趟 JS 的**混淆数组与变量名随请求变化**、`ha` 按趟随机（md5/sha1/sha256）⇒ 必须每次现抽 `go({...})` 并按 `ha` 分派，把不同 `ha` 的样本各留一份做 oracle。 |
| 480 | `52pojie-1983279-【JS逆向】某某经营网jsl逆向分析.md` | `e312cad072ac04f1ef4c1d1df763b006` | 2026-09-23 | web-js-env-patcher | evolve | **jsl 的第二个命名 / 状态码变体**：首访 **512**（不是 521）、第一趟 cookie 是 **`__jsluid_h`**、clearance 叫 **`__jsl_clearance`（不带 `_s`）**；三次请求里**前两次都是 512**、第三次 200。两条可直接复用的判据：① 中间态与终值有**形态差**（中间趟 clearance 的中间段是 `-1`，终值段变 `0`）⇒ 「算出来但中间段还是 -1」说明只走到中间态；② **生成点与使用点不在同一趟**（第二趟请求携带的值是在**第一趟响应**的内联脚本里生成的）⇒ 只在第二趟请求处 hook 只能拿到「被使用的值」，跟不到生成链。还原侧：AST 还原后**只剩约 240 行**、全文件 `document["cookie"]` **只有一处写入** ⇒ 从唯一 writer（`_0x5bef39[0]`）倒推，别从入口正着读。 |
| 481 | `52pojie-1930242-雷池WAF逆向思路.md` | `1788bf5e94ad1c2179f1360a35694fb9` | 2026-09-23 | web-js-env-patcher | evolve | **新厂商：雷池（SafeLine，长亭），首访不拦（200）⇒ 只看状态码发现不了，只能从页面里的 `/api/waf/sdk.js` 判。** 五趟链路 （`list` 拿 `once_id` + `sl-session` → 取 `sdk.js` → `seed`（`once_id` + 固定 `v`/`hints`）→ `inspect`（AES-CBC body）拿 jwt 写 `sl_waf_recap` → 重放 `list` 拿 `sl_jwt_session`）。四条参数级事实：① 控制台检测 `isDevToolOpened()` 的 `d`/`g` 初值 false、由事件监听器置真 ⇒ **本地替换 + 注释掉那一行赋值**即过；② `inspect` body = **AES-CBC**，`key = Utf8.parse(seed 右侧补 '0' 到 16 位)`、`iv` 固定 `1234567890123456`、`padding = Pkcs7`、**明文只有 `salt` 变**；③ **`salt` = 前导零比特 PoW**：枚举 r 取 `SHA256(seed + str(r))`，每遇 hex `0` 记 4 bit、首个非零字符按 `4 - bit_length(该位)` 补，达到阈值即返回 ⇒ **必须按 bit 实现**；常见近似「前导零 hex 位数 ≥ t/4」在 `t` 是 4 的倍数时**等价**、在 `t ∉ 4Z` 时**分叉**（实测 `seed=7NzPy5ID`：`t=16` 两口径都是 20702、`t=20` 都是 483624，但 **`t=18` 时 bit 口径是 154281、hex 位数口径是 483624**）；两种口径给出的都是**合法十进制数字**，是本族最典型的静默失败；④ **oracle**：`t=16 → 20702`（**原文唯一观测值**）+ `t=18 → 154281`、`t=20 → 483624`（**同口径外推**，均已独立复算）；⑤ **key 的补位方式是未明项**：原文只写「将 seed 后面补 0 填充到 16 位」，字符 `0`(0x30) 与字节 `0x00` 两种读法密文完全不同 ⇒ 本轮做成 `--pad char\|byte` 显式开关（默认 char），并在文档写明「密文对不上先换它」。外加性能事实：过了之后纯 Python 协程 20 并发不到 6 秒 ⇒ 本族是**准入**不是验证码。 |
| 482 | `52pojie-2049540-风控逆向之qrator.md` | `e12f75f360aafd3b834a23fe8bcf7696` | 2026-09-23 | web-js-env-patcher | evolve | **新厂商：qrator（`qrator_jsid2`）**。判据三件套 = 首访 **401** + 外链 **`qauth.js`** + cookie **`qrator_jsr`**；终值是 `qrator_jsid2`。参数对应关系明确：`param` 与 401 那趟下发的 `qrator_jsr` 有关，**`nonce` = param 按 `-` 切分的第 1 段、`qsessid` = 第 2 段**；**`pow` = 循环哈希到前两位为 `00` 的次数** —— ⚠️ 原文**没有写明每次迭代喂什么**（`md5(nonce+i)` 与哈希链两读法都自洽）⇒ 本轮口径是**两种都实现、用一条真实样本把语义钉死**，不许把默认值当结论。载荷：`POST validate`，40 个 json 字段里 `version`/`vx` 固定、**其余 38 个由 `qauth.js` 生成**（多为 MD5 + base64，基本都在读浏览器环境）；定位用**十六进制字符集数组**反查比逐行读混淆快；同一结果**只能复用约 5 次** ⇒ 不能「算一次跑一批」。 |
| 483 | `52pojie-2089394-某18+论坛CF盾验证扣代码.md` | `816ad5d3d3ed79c931c289dd31baba1a` | 2026-09-23 | web-js-env-patcher | evolve | **Cloudflare 的 `jsd/oneshot` 变体**（与既有 managed 形态区分）：路径是 `challenge-platform/h/b/**jsd**/oneshot/...`、**首访可能是 200**（不是 403）、参数对象换成 `window.__CF$cv$params{r,m}`、另有 `safeid`；五步链的第 5 步「进主页那次才把 `safeid` 写入 cookie」可当进度判据。最可迁移的一条是**加密调用点的通用形态**：`send( enc( JSON.stringify(d) ) )`（样本写作 `Q[gP(d2.X)](TX[gP(d2.y)](JSON[gP(d2.h)](d)))`），`d` 即环境检测对象 ⇒ 三条定位路线按效率排序为「xhr 断点（URL 带 challenge-platform）→ 调用栈回溯 → **hook `JSON.stringify` 从结果倒推**」。另有四个实操要点：`main.js` **每次请求都不同**（不本地替换 ⇒ **断点刷新后漂移**）、补环境最小集、**TLS 层要单独过**（requests 403 `Just a moment` 而 devtools 里什么都看不到 ⇒ `curl_cffi impersonate="chrome136"` 才过）、以及**请求侧与浏览器执行的 Turnstile 版本不同**（2025.9.1 vs 2024.11.0）⇒ 先确认「你算的是哪一份 JS」。 |
| 484 | `52pojie-1832611-关于akamai中VM2的检测特征.md` | `52a0f5fa76e58dc19b5e616be160dbfa` | 2026-09-23 | web-js-env-patcher | evolve | **机制级的排错结论（本轮最有迁移价值的一条）**：扣下来的 `sensor.js` 在本地补好环境还是不对，原因是**运行载体改写了代码文本** —— VM2 的 `transformer.js` 把 `INTERNAL_STATE_NAME`（`VM2_INTERNAL_STATE_DO_NOT_USE_OR_PROGRAM_WILL_FAIL`）**追加到每一个 `catch` 之后**（该样本 70 处）⇒ 目标 JS 的 `toString` 检测（对整个自执行函数）必然失败，进而**走进另一套分支**。判据链：异常栈落在 VM 内部 → 同一个表达式在浏览器与本地**返回值不同** → 正确值 `211627`、本地 `216917`、两串逐字符 diff **64 处**、本地多出一截。处置：改 VM2 源码，遇到控制节点不注入该标识符（注释掉那处调用）⇒ 长度与返回值同时归位。三条应用：反爬侧可主动检测该字符串「返回看似正确但差一个字符」的结果；把环境框架打包到 Linux 跑会在 `catch` 抛「VM2 变量语法错误」；**`toString` 检测没过的排查项要从两项（自写实现 / 是否被格式化）扩到三项（+ VM2 注入）**。 |
| 485 | `52pojie-1981831-佬儿，瑞数5补环境，麻了呀.md` | `bd176abf785506f223783b265e612fc1` | 2026-09-23 | web-js-env-patcher | evolve | **瑞数 5 代补环境求助帖（一）**：无算法增量，价值在**把「5 代补环境失败长什么样」固定下来**。可取的三点：① 该构建的代码形态 —— 多层嵌套 `if/else` + `_$` 变量族（`_$ri` 指令指针 71 次 / `_$0c` / `_$P4` 常量表 83 次 / `_$K_` 栈 55 次 / `_$TL(...)` 调度 10 次 / `_$Cz`），**尾部没有元数据数组**（与第二篇不同），且变量名每次刷新都变；② 起手式 `delete __dirname` / `delete __filename` —— 这两个变量在 CJS 包装函数里天然存在，`typeof` 一测即暴露；③ 该篇的 stub 集（`window.top` / `self`、`addEventListener`、`XMLHttpRequest`、`ActiveXObject`、`HTMLFontElement`、`setInterval`、裸 `localStorage`）说明**问题不在缺哪一项，而在「缺了之后靠肉眼猜」** ⇒ 正确姿势是先代理 / trace 记访问序列再补。判据（`console.log(get_cookie().length)`）**方向对但不充分**：长度过了必须立刻换成端到端对拍。 |
| 486 | `52pojie-1985027-瑞数5补环境.md` | `01ccddf85a8b6950dbee0eb305416f5d` | 2026-09-23 | web-js-env-patcher | evolve | **同作者的瑞数 5 代求助帖（二，体量更大）**：与第一篇**同一失败模式**（改一点试一点、长期不收敛），两篇合起来构成「**缺少访问序列取证**」的双样本证据。该篇独有且可复用的两点：① **尾部元数据数组** —— `)([], [[1, 2, 10, …], [19, 50, 42, …], [23, 38, 52, …], [28, 33, 22, …]])`（空数组 + 若干纯数字数组 = 跳转表 / 操作数表 / 常量索引），**随代际与站点变化**，可把「数组个数与长度」当作**同一代不同构建**的比对指纹；② **编码风格与第一篇不同** —— 该篇分支条件是**朴素等式**（`_$a1 === 0` / `=== 1` / `=== 2`，`if` 共 416 个），变量族是 `_$_obj`（29 次，作者自写的代理包装，**发帖时实现已删**）/ `_$dq` / `_$bJ` / `_$a1`，而第一篇是**算术恒等式**（`104+_$0c===113`、`_$0c-48===-40`、`-2===-12+_$0c`，`if` 共 724 个）⇒ **不能用变量名前缀或分支风格判代际**（与既有两条已证伪判据同型的坑）。stub 集比第一篇多出 `DOMParser` / `indexedDB` / `MutationObserver` / `Request` / `sessionStorage` / `chrome` / `open` / `name`。本轮据此在 `ruishu-botgate.md` 新增 §4.3.1（含两张**逐项回源**对照表）与两条排错项。 |
| 487 | `52pojie-2114241-JS 盾（JS DUN PROTECT）分析日记.md` | `f2091a23c6468087db9cc4640d85c994` | 2026-09-23 | ast-deobfuscation | evolve | **国产 JSVMP 加固壳的结构特征（本轮唯一进 `ast-deobfuscation` 的素材）**。三条可迁移结论：① **顺序表达式伪装**：整个函数体是一条 `return`，用短路串起顺序副作用，典型衔接片段 `]))) \|\| 1) && (T = 0) && 0 \|\| (V = p(Q, ...))` ≡「执行 A → 执行 B → 触发下一段」⇒ **严禁按布尔语义化简**（把 `X && 0 \|\| Y` 折叠成 `Y` 会丢掉 VM 的执行本身）；② **虚拟方法表 `X.$`**：先把真实函数引用挂到**字符串属性**下（`X.call["1.1"] = X.call`，`Object.keys` 遍历不到），再用 `X.$[1][X.$[0]](f, this, ...a)` 这层**双层 call 跳板**（＝`f.call(this, ...a)`）让 AST 完全失去调用目标，最后把原生方法编号成 opcode 收敛到**唯一入口** `X.$[8]`（`2`=apply/`3`=push/`4`=pop/`5`=concat/`6`=slice/`7`=多值 push）⇒ **还原顺序应当是「先解析 opcode 映射 → 把 `X.$[8](k,…)` 改写成直接调用 → 最后才碰字节码」**；③ 两轮 VM（第一轮解码并执行字节码、第二轮产出**真正要跑的目标代码**）＋ **格式化检测**（格式化后拒绝执行）⇒ 自动化处理要么不格式化直接补环境跑，要么自写反混淆器。规模事实：单文件 **13000+ 行 → 格式化后 24000 行**，原文结论是「强度靠膨胀而非精巧，没有业务需求不值得追」——本轮**只取结构判据与还原顺序，不背书深追**。 |
| 488 | `52pojie-1495847-某社区网站的 Header 加密参数分析补环境踩坑分析笔记.md` | `683d98ee7d1fa5d73d0176fd531fd812` | 2026-09-23 | web-js-env-patcher | evolve | **「单文件 IIFE 扣下来就能跑、缺的只有宿主最小件」这一形态的样板**（目标是知乎 `x-zse-96`）：签名链 = `"2.0_" + enc(encodeURIComponent(md5(拼接串)))`，拼接串按固定顺序由 **URL + Body + 固定版本值 + cookie 取值（`d_c0`）+ 一个正式环境为 null 的可选位**组成 ⇒ 还原时**必须先把这个 `null` 位钉死**（占位还是跳过会直接改变哈希）。补环境三件按序：`window`（`var window = {}` 或 `globalThis.window = globalThis`）→ 末尾 `exports` 改 `window.exports` → **`atob` 自实现**；并强调 **`atob` 的语义是「每字符一字节的 Latin-1 串」而不是 UTF-8 解码**，自实现要连 `_utf8_encode`/`_utf8_decode` 一起搬，否则含中文或二进制时**字节数对不上**。定位法：特殊参数名全局检索一次命中赋值点、在命中结果里再检索一次即落到生成函数。 |

### 本批次技能变更汇总（B24）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-js-env-patcher` | evolve | `references/edge-waf-cookie-challenge.md`：判层表 **+3 行**（jsl 512 变体 / 雷池 / qrator）、CF 行补 `jsd/oneshot` 形态；**新增 §2.1.1**（jsl 512 命名与状态码变体：`HttpOnly` 分类法、中间态 `-1` 判据、生成点与使用点跨趟、AST 240 行与唯一 writer 倒推、hook 失效两个现象）、**新增 §2.3.1**（Cloudflare `jsd/oneshot`：五步链、`send(enc(JSON.stringify(d)))` 通用形态与三条定位路线、本地替换防断点漂移、TLS 层与版本并存）、**新增 §2.4.1**（Akamai 侧 VM2 注入机制：判据链与处置）、**新增 §2.8 雷池**、**新增 §2.9 qrator**、**新增 §3.6「取证工具本身会被检测」**（三样本证据 + 三条固定手法）、§3.1 趟数表 +2 行、§4 一致性矩阵 +1 维（取证手段）、§5 排错清单 **+5 条**（#15–#19）、§6 边界表更新。`references/ruishu-botgate.md`：**新增 §4.3.1「5 代补环境实战：两份公开求助帖的共同失败模式」**（代码形态判据 / 尾部元数据数组 / 起手式 / stub 集特征 / 核心教训）+ 排错清单 **+2 条**（长度对了但值不对、改一点补一点长期不收敛）。`references/node-leakage-and-silent-failure.md`：静默失败清单 **+第 14 项**（运行载体注入物）、运行上下文隔离 **+1 条实战起手式**、**新增整节「VM2 注入：`toString` 长度对不上的机制级成因」**。`references/case-patterns.md`：**新增「单文件 IIFE 型」**（三件套补法 / `atob` 的 Latin-1 语义 / 版本化签名的拼接口径与那个 `null` 位）。`scripts/classify_edge_challenge.js`：`FAMILIES` **+3 族**（`jsl-2pass-512` / `safeline` / `jsid2`）、managed-challenge **+3 判据**（`jsd/oneshot` 路径、`__CF$cv$params`、`safeid`）、新增 `LAYER_NOTE` 与 `NEXT_SKILL` 的 `purecalc+envfit` 落层、自检用例 **+4**（三族各一 + `jsd/oneshot` 首访 200 一例）⇒ **32 → 39 项**。⚠️ **本轮踩到并撤掉的一个自伤**：我原以为自检只查 `NEXT_SKILL`，于是又补了一条 `LAYER_NOTE` 断言；**故障注入当场判它恒绿**（既有检查排在前面，新断言永远不可达）⇒ 已删除重复行，只保留注释。**闭集一致性断言（`FAMILIES` × `NEXT_SKILL` × `LAYER_NOTE`）在 B24 之前就已存在**，本轮的贡献是把它写进文档导语、并做了一次阳性验证。 |
| `web-reverse-algorithm` | evolve | `scripts/waf_clearance_solver.py`：**新增 `leichi` 子命令**（前导零**比特** PoW 的 `salt` + **纯标准库 AES-128-CBC**（含解密）请求体构造）与 **`qrator` 子命令**（两种迭代语义 + `--expect-pow` 机械校验）；`classify` 判据表 **+3 族**（`jsl-2pass-512` / `safeline` / `jsid2`）、`LAYER_NOTE` +1 种落层（`purecalc+envfit`）、`_next_step` +3 条；自检 **119 项**（本轮新增 `leichi` **29 项** + `qrator` **9 项**）。**新自检的 oracle 全是「外部可独立复算」的**：雷池 `salt` 的 `t=16 → 20702` 是**原文唯一观测值**、`t=18 → 154281` / `t=20 → 483624` 是**同口径外推**（`t=18` 同时充当「bit 口径 vs hex 位数口径」的单位判据）+ 独立实现核对（大整数 `bit_length`）；另断言 key 补位方式（`--pad char\|byte` 必须给出不同 key 与不同密文）；AES 用 **FIPS-197 附录 B** 与 **NIST SP 800-38A F.2.1 CBC** 官方向量（CBC 前缀稳定 ⇒ 取前 64 字节比对）；qrator 用**独立实现的候选枚举**（一遍列出所有命中，必须恰好 `[idx]`）+ **另一种写法独立重放哈希链**；反例覆盖「15 字节 key 必须拒绝」「错 key 解密必须因 PKCS7 不合法失败」「非法 prefix / 无法切段的 param / `--expect-pow` 给错值 / `--pad nope`」。`references/10-waf-clearance-cookie.md`：子命令表 +2 行；**新增 §1.4**（512/`__jsluid_h` 变体对照表）、**新增 §4 雷池**（PoW 口径与三组 oracle、AES 参数表与 `--pad` 未明项、官方向量自检口径）、**新增 §5 qrator**（两读法与「现场钉死」口径）；原 §4/§5 顺移为 **§6/§7**（已 grep 确认无外部锚点引用）。 |
| `ast-deobfuscation` | evolve | `references/control-flow-and-opcode-patterns.md`：**新增两节** —— 「顺序表达式伪装（`&& 0 \|\|` 链）」（含读法、两轮 VM 的衔接片段语义表、拆解顺序）与 「虚拟方法表（`X.$`）：数组索引 + 双层 call 跳板」（三层设计表、识别信号、三步还原顺序、两轮 VM 顶层结构、格式化检测告警）；误改写黑名单 **+2 行**（禁止把短路链按布尔语义化简、禁止把 `X.$[...]` 当普通数组就地替换成员）。`references/obfuscation-detector.md`：技术手段 +1（`sequential-shortcircuit-chain`）、产品标签 +1（`jsdun`）、分流表 **+2 行**。`scripts/detect-obfuscator-types.js`：**新增 2 个检测函数**（`detectSequentialShortCircuitChain`、`detectJsDun`）并注册；阳性 / 阴性夹具实跑验证（阳性命中 2 标签，阴性仍为 `unknown`）。 |

### 结构性收敛（B24）

| 项 | 处置 |
| --- | --- |
| **新厂商进入「闭集判据器」必须多处同改** | 定族器的闭环一共 **6 处**：Node `FAMILIES` / Node `NEXT_SKILL` / Node `LAYER_NOTE` /Python `CLUES` / Python `LAYER_NOTE` / Python `_next_step`。本轮把它们一次补齐，并把这条清单写进 `edge-waf-cookie-challenge.md` §2 的导语。**同时撤掉了一处自伤**：闭集一致性断言（`LAYER_NOTE` × `NEXT_SKILL`）在 B24 之前就已存在，我原以为只查了 `NEXT_SKILL`、又补了一条断言 —— 故障注入（注入 4）当场判定它是**不可达的恒绿断言**（老检查先命中）⇒ 已删除重复行。**教训**：加断言前先确认「这条路径是否已经有人守着」，否则新增的只是噪声（本轮正好被注入实验兜住）。 |
| **「厂商逐族」编号扩容** | 10-waf 求解文档原 §4/§5 顺移为 §6/§7，新厂商固定占 §4/§5。**前置检查**：先 grep 全仓确认这两节没有锚点级引用（只有文件级引用）⇒ 属于零风险重编号，且顺手把 §4.1 里一句含混的「不要跳过 1、2」改成「第 1、2 步」。 |
| **两份求助帖的处置：不建新文件** | 瑞数 5 代的两篇求助帖体量很大（391KB / 284KB）但**只有代码没有结论** ⇒按「避免滥建冗余技能」的口径，其可复用部分（尾部元数据数组形态、`delete __dirname` 起手式、「缺的是定位手段而不是某一项」这一失败模式）全部并入既有 `ruishu-botgate.md`，**新增一节 + 两条排错**，不新增 references 文件。 |
| **「把推断写成结论」是本轮最大的缺陷类** | 独立评审一次抓出 **5 处**：jsl 512「两篇样本一致」（实为一篇）、雷池「首访 200 / 不拦」（原文无状态码）、Turnstile 版本号（原文未指明组件、且该变体根本不是 Turnstile）、512 变体的 `go({...})` 结构（原文从未打印）、`chars` 长度 23/24（4 组真实 oracle 实测全为 22）。⇒ 全部改成「实测 N 组 / 同口径外推 / 按同族推断 / 原文未写明」的显式标注，并**在保真度脚本里为这些措辞加上断言**（否则下次改写又会把它们抹平）。**口径**：文档里每个数字要么能指到原文，要么必须自称推断。 |
| **「恒绿断言」与「死断言」** | 独立评审指出 `_selftest_qrator` 里 `if digest[:2] != '00'` 永不触发（`qrator_pow` 只在命中分支 return）⇒ 改成**独立实现的候选枚举**（一遍列出所有命中、必须恰好 `[idx]`）；同时把 `leichi` 的「最小性」断言从「重抄同一表达式」升级为**大整数 `bit_length` 独立实现**核对。 |
| **未明字段一律不臆造（延续 B23 口径）** | qrator `pow` 的迭代语义、阿里系 `TrackList.si` 式未明字段：一律**实现两种候选 + 提供机械校验入口**，文档写明「原文未写明」，**不写公式、不写默认值当结论**。 |

### 证伪与审计留痕（B24）

```bash
# 1) 新增子命令自检（leichi 29 项 + qrator 9 项；脚本总自检 119 项）
python .agents/skills/web-reverse-algorithm/scripts/waf_clearance_solver.py --selftest

# 2) 定族器自检（32 → 39 项；含新增族与闭集一致性断言）
node .agents/skills/web-js-env-patcher/scripts/classify_edge_challenge.js --selftest

# 3) 混淆检测器阳性 / 阴性夹具
node .agents/skills/ast-deobfuscation/scripts/detect-obfuscator-types.js artifacts/skill-evolution/b24-run-20260923-2000/fixtures/jsdun-pos.js
node .agents/skills/ast-deobfuscation/scripts/detect-obfuscator-types.js artifacts/skill-evolution/b24-run-20260923-2000/fixtures/normal-neg.js

# 4) 故障注入阳性验证（5/5 变红）
python artifacts/skill-evolution/tools/b24-fault-injection.py

# 5) 来源保真度（10 篇源文件逐条断言）
python artifacts/skill-evolution/tools/b24-verify-sources.py

# 6) 机械校验 + 双镜像
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 7) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b24-ledger.py
```

**故障注入明细（基线绿 → 注入后红）**：

| 注入点 | 结果 |
| --- | --- |
| `leichi_salt`：把「前导零**比特**」改成「前导零 hex 位数」 | 自检转红，命中 `t=18 的 salt 应为 154281，实际 20702` ✓（**这条注入反过来纠正了一处文档错误**：我最初写的是「两口径在 t=16 下差一个数量级」，实测 **t=16 两者等价**（都是 20702）、只有 **t ∉ 4Z** 时才分叉（t=18：154281 vs 483624）⇒ 三处文档已按实测改写，并把 t=18 做成正式自检断言）|
| `qrator_pow`：返回**第二个**命中下标（不再最小） | 自检转红，命中「前 N 个候选里应只有 i=… 命中」✓ |
| `AES_SBOX`：改坏 1 个字节 | 自检转红，命中 FIPS-197 单分组向量 ✓ |
| 定族器：把 `safeline` 的落层换成闭集外的值 | 自检转红（`族 safeline 的 layer=… 没有说明`）✓；该断言**先于**我新加的那条命中 ⇒ 暴露新断言不可达 |
| 检测器：给「无命中」兜一个假数组（阈值失效） | **阴性夹具被误报**（基线 `unknown`，注入后出现 `sequential-shortcircuit-chain`）✓ |

**清点**：台账 **478 → 488**（本批登记 **10** 条，编号 **#479–#488**）；待处理 **429 → 419**；新建技能 **0**、演化技能 **3**。

### 独立评审（B24）

**方式**：1 名**独立盲评审员**（只看产物与源文件，不给作者自评、不允许改文件），四个维度：事实保真度 / 可执行性 / 自检有效性 / 一致性。它自己实跑了两个 `--selftest`、`leichi` 与 `qrator` 的真实调用、以及三条 `node -e` 反例实验。**结论：needs-fix**，共 12 条，全部在本轮内修完：

| # | 严重度 | 缺陷 | 处置 |
| --- | --- | --- | --- |
| 1 | 高 | jsl §2.1.1 写成「两篇样本一致」，实为一篇；另一篇恰是 521/`_s` 形态 | 改为「**目前只有一篇样本**」并把「`HttpOnly` 分类法」「hook 失效」两条**通用**判据上移 §2.1 |
| 2 | 中 | 把「脚本版本号不同」写成「Turnstile 版本不同」（原文未指明组件，该变体是 `jsd/oneshot`） | 改为「请求侧与浏览器侧看到的**脚本版本号**不同；原文未说明是哪个组件」 |
| 3 | 中 | 雷池「首访 200 / 不拦」当事实写（原文无状态码） | 改为「正常页面（**原文未给状态码**，200 为推断）」；判层表与排错 #15 同步 |
| 4 | 中 | `_selftest_qrator` 的前缀断言是**死代码**；`leichi` 的最小性循环等于重抄同一表达式 | 换成独立实现的候选枚举 + 大整数 `bit_length` 核对（见「结构性收敛」） |
| 5 | 中 | 「真实 oracle 三组」只有 1 组是实测 | 全部改为「实测 1 组 + 同口径外推 2 组」并标出哪一组是原文观测 |
| 6 | 中 | AES key「用字符 `'0'` 补齐」是未标明的推断，且不可切换 | 新增 `--pad char\|byte`（默认 char）+ 文档写明两种读法密文不同、对不上先换它 + 自检断言两者必须不同 |
| 7 | 低 | `qrator` 的推荐命令三处不一致，且缺 `--expect-pow`（不触发机械校验） | 三处统一为 `--param … --expect-pow …`（`_next_step` 与文档同步） |
| 8 | 低 | `control-flow-and-opcode-patterns.md` 新节末的「同 §代码文本参与计算」是**死引用**（本文件无此节） | 换成跨技能显式路径（`edge-waf…§3.2` 与 `10-waf…§6.2`） |
| 9 | 低 | 两处技术陈述不成立：「`Object.keys` 遍历不到」（实测可枚举）、「模板字符串」（原文是普通字符串字面量） | 改为「挡住的是**静态分析不会去猜这个 key**」与「字符串字面量」 |
| 10 | 低 | `A && B && 0 \|\| C` 的「顺序执行」口诀在 A 为 falsy 时不成立 | 补前提「A、B 均为真值」，并点明它只是读法、不是可化简的等价式 |
| 11 | 低 | 判据写死「`-1` 后跟 3 字符」（同类样本是 4 字符）；512 变体「算法完全复用」未标推断 | 改为「2~4 字符」；512 变体加「按同族推断、`jsl` 无命中即不成立」 |
| 12 | 低（历史遗留） | 10-waf §1.3 写「chars 23 或 24 ⇒ 529/576」，而脚本 4 组真实 oracle 实测全为 22 | 顺手改成「22 ~ 24（oracle 实测 22 ⇒ 484；文章样本 23 ⇒ 529）」并注明无 24 样本 |

**评审留下、本轮未改（记入下一批）**：无阻断级遗留；12 条全部处置。

### 下一批（B25）取材建议（承接本节）

- 待处理 **419** 篇（台账 488 条后）。
- 优先级：
  ① **站前挑战厂商带可继续扩容**：本轮把厂商扩容的**操作清单**（6 处同改 + 闭集自检）写进了文档，下一批若再遇到 unclassified 的准入挑战，按同一清单补；**注意优先取「带完整纯算交付」的**（本次两家新厂商之所以值钱，正是因为各自给了可独立复算的 oracle）。
  ② **验证码图像识别系的坐标侧**（真拼图 / 双缺口 / 旋转点选）仍有剩余，一律走 `web-verify-patcher` 的 evolve；
  ③ **无感/行为验证**剩余（更多厂商的「多请求链 + 签名头」形态）继续并入 `references/behavior-verify-and-sign-headers.md`，**不要为每家建新文件**；
  ④ **环境检测点**继续并入 `web-js-env-patcher` 的矩阵节（注意：新检测点必须映射到既有触发类别，枚举是闭集）；
  ⑤ **桌面客户端薄区仍无取材**（Tauri / node:sea / 原生模块）—— 若下一批仍为 0 命中，应**改判为「本语料池不含该主题」并停止把这三项列为候选**，不要第六次重复列为优先项。
- 候选新技能 `captcha-flow-orchestration` —— B5–B24 **十八次确认不新建**（证据池仍未跨越「单站一流程」到「可复用编排协议」的门槛）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
  **注**：B1-17 / B13-216 的「不建小程序技能」结论在 B22 已被**推翻并取代**（改判为「无最近邻模块 + 规模最大 ⇒ 建」），旧结论只保留可追溯性。

## 批次 B25 · 2026-09-23（第二十五次执行）

取材口径：待处理队列 **438 篇**中取**一个新开的归档通道 + 一个被放了很多轮的邻近薄区**，共 **19 篇**：
① **网页恶意脚本 / 挂马 / 钓鱼 / 劫持取证 17 篇**（52pojie「病毒样本区 / 病毒分析区」与新开的 MAL2 通道）；
② **V8 JSC 反编译 1 篇**、**Uniapp/Weex 混合 App hook 1 篇**。

**为什么这次要新建技能**（三条判据与本库既有惯例对齐，且已做机械化取证）：

① **没有最近邻模块**：全库 20 个技能里，只有 `code-analysis` 的名字沾边，但它自己的 `SKILL.md` 写的是
「分析由调用方 Agent 自己完成，**本技能只负责采集证据、给出提示词模板、评分口径与产出结构**」——
它的产出是「结构 / 风险评分契约」，与本族的「攻击链重建 / IOC 提取 / 定性分档 / 处置加固」是**两套产出**；
其余 19 个技能的 description 与本轮主题零交集（全库 `grep` `恶意|钓鱼|挂马` 只命中**归档类技能**用于语料过滤的关键词，
不是分析能力）。
② **规模足够**：单批 17 篇同族文章，且上游归档线**专门为它开了一条通道**（持续供给）。
③ **目标动词不同**：既有技能的目标动词是「还原 / 提取 / 绕过」，本族是「**定性 / 取证 / 处置**」。

**产出**：**新建技能 1**、**演化 2**、**结构债结项 3**（含 1 项跨技能，详见「结构性收敛」）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 489 | `52pojie-20874-伪装GOOGLE广告的挂马方式.md` | `7a3f011b7611e721bc345bce7fbc7263` | 2026-09-23 | web-malware-forensics | create | **iframe 挂马链的结构模板（2009 年的样本，特征至今通用）**：同一 URL 连写 7 次（回源逐行计数） `document.write('<iframe … width=100 height=0>')` 再嵌一层；**cookie 去重标记** `document.cookie.indexOf('9B4A4C5EBF042C02') == -1` + `Then.setTime(Then.getTime() + 30*60*1000)` + `document.cookie = "A1="+ cookName +";expires="+ Then.toGMTString()`（⇒ 清掉这个 cookie 就能复现，它同时是「复现开关」与「封禁目标」）；**概率触发** `Math.floor(Math.random()*8000) > 6500`（约 19%）；**UA 分派**（`msie 7` 与否走不同分支）；**ActiveX CLSID 探测**（`GLIEDown.IEDown.1` / `snpvw.Snapshot Viewer Control.1` / `MPS.StormPlayer.1` / `IERPCtl.IERPCtl.1`，按结果加载不同 exploit 页）；**字符串拆分规避静态扫描**（`"GLI"+"EDown.I"+"EDown.1"`）。⇒ 本轮把这些提成「可机械识别的特征」写进 `injection-and-hijack-triage.md` §4。 |
| 490 | `52pojie-527897-六年前的遗留(某网马解密实例By是昔流芳).md` | `b365c47a10626619c57b5ece1a6ca930` | 2026-09-23 | web-malware-forensics | create | **`%u` 网马 shellcode 的解包口径（本批唯一有机器可判 oracle 的一条）**：作者把分隔符放进变量 `dvd="%u"`，再以 `dvd+"54EB"+dvd+"758B"+…` 拼成四字符组串，最后 `unescape(拼接结果)`；**拼接顺序与变量声明顺序无关**（`YuTian + yutianuc + YuTian1 + YUtian2 + …`）⇒ 必须按 `unescape(...)` 里的**实际表达式顺序**拼。**口径 = 组内两字节必须交换**（`%uXXYY → YY XX`）：实测原文那串解出 `urlmon.dll` 与 `D:\YTexe`（不交换则得到 `rumlnod.llD\0\:TYxe`，无意义）⇒ 已做成脚本默认口径 + 自检断言，并保留 `--mode esc-noswap` 开关（判对错的判据是「能否读出 ASCII 串」）。另有三类**作者手工噪声**必须洗（`+` 分隔符 / 空格 / 缺字，如 `d+vd`、`%u95 D0`），以及「两趟」的真实成因（输出里又出现一层转义 / 双层转义）—— 本批同时**证伪**了「两趟是固定要求」的写法（工具默认 1 趟，只在输出里还有 `%` 时再加）。 |
| 491 | `52pojie-1070300-简书网页劫持分析，使用 Chrome DevTools 调试 JavaScript 技巧，利用 CSP 预防劫持.md` | `6e1513ec1863eb23f30742bfc847b2b9` | 2026-09-23 | web-malware-forensics | create | **本批信息量最大的一篇**，贡献了整套「注入层判定 + 复现口径 + 加固」：① **三层排除法与分水岭**（源文件哈希 vs 响应体哈希；相等 ⇒ 运行时/扩展层；不等 ⇒ 传输层）；② **概率触发 / IP 限频的复现口径**（恶意分支「换 IP 之后才出现 1 次」、同 IP 每天首次触发；作者前后花了约两周）；③ **取证手法**：断点处直接打印被混淆函数的值、`acorn` + `acorn-walk` + `escodegen` 批量把 `d(<Literal>)` 就地替换、`jsnice.org` 反 uglify、**Local Overrides 改 `inspect.js` 强制出 `inspect fallback`**（只在 DevTools 开着时生效）、真机远程调试、Network 表头勾 Domain 排序（原文称为最省时间的技巧）；④ **完整指纹参数表**（`u`/`c` 两段共 40+ 项：系统版本、浏览器种类码 1–18、`history.length`、`navigator.hardwareConcurrency`、`gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)`、`document.title.length`、`getElementById(…).offsetLeft` 等，以及最后的综合 hash）；⑤ **假信息检测**（`platform` 与 UA 打架 ⇒ 建 iframe 打 `fk.html?fk=fakeOS`，**把 cnzz 当计数器用**，静态托管即可统计）；⑥ **CSP 的写法与取舍**（必须把自己所有域名列全，连内联代码都要显式声明）与「**JavaScript 不支持反射 ⇒ 同页第三方脚本无法被运行时检测挡住**」这条能力边界；⑦ **供应链定性判例**：作者结论是「**准确来说不算是网页劫持，而是简书自己的一个广告供应商的问题**」⇒ 定档为「业务失控（供应链）」而非「网站被黑」。 |
| 492 | `52pojie-865122-【转帖】对隐藏在图像文件中的 JavaScript 恶意代码的详细分析.md` | `bfc0e1f82e9986eacb16e6ab1cdcf358` | 2026-09-23 | web-malware-forensics | create | **隐写载荷的唯一权威源**：`canvas` + `getImageData` + `o['data'][p + 0x2]`（**B 通道**）+ 步长 4 + 上限 `q < 0x4b`（75 字符）+ `String.fromCharCode` 拼串 + `eval(rs)`；环境门槛是**字体探测** `isSupportFontFamily('-apple-system')` 与 `body.style.cssText != 'margin:\x200px;'`。三条纠正性结论：① **图片本身无害**（原文：「验证广告服务中单个图像文件的完整性是没有什么意义的」）；② 「图片看着正常」**不是证据**（载体是「一个白色的小条」）；③ **隐写是混淆手段的升级而非新漏洞** —— 同团伙早期版本用字符串拼接 + `WebKitPlaybackTargetAvailabilityEvent` 探测 + S3 外链。⇒ 本轮把四个参数（stride / 通道 / 上限 / 门槛）定成「从代码里读、不许猜」，并给了 DevTools 现取 `getImageData` 的一行 JS。 |
| 493 | `52pojie-1381839-某网页js挖矿木马的简单分析.md` | `7bf398b098a84d69eaf142c923371f48` | 2026-09-23 | web-malware-forensics | create | **挖矿样本（两层壳 + 可复算的密钥派生）**：入口是 `<script async src=//bmst.pw/5889336x50.js>`；壳是「自实现 base64 解码 + 重复密钥 XOR」（`tf.b64d` / `tf.atob` / `tf.d`），且**密钥由参数派生**：`key = tf.d(p, "p")`，其中 `p = "BxkeFB8H"` —— 本轮独立复算得 `base64_decode("BxkeFB8H") XOR "p" = "window"`，并**反向验证** `base64("window" XOR "p") == "BxkeFB8H"` ⇒ 已做成脚本自检断言（这是单篇也能拿到、但必须自己算的一条）。IOC 侧：`WSSS: [["ws://ws1.bmst.pw/ws", "ws://ws2.bmst.pw/ws"]]`、`throttle=0.5`、**文件名后缀语义**（`x50` = 占 50% 时间、`x100` = 全速）、与 `deepMiner` 高度相似，以及「很多 JS 挖矿脚本都含 `Miner`/`autoThreads`/`threads`/`throttle` 关键字 + WebSocket + 设备类型检测」这三条归纳。 |
| 494 | `52pojie-514804-关于最近QQ出现的网页盗号分析.md` | `1b562acbb6aa2d81ff9256aa1fbd5bde` | 2026-09-23 | web-malware-forensics | create | **定向投放 + 模板复用的样板**：`mobile.js` 里 UA 不含 iphone/ipad/android 就 `window.location.href = 'http://www.qq.com'`；`kr.js` 用正则 `^[1-9][0-9]{4,}$` 校验账号、空密码拦截后 `$.ajax` POST `/index/qq.php` `{q,p}`；返回 `1` 时**同时**跳 `user.qzone.qq.com/1064065158`（伪装成功 + 顺带刷人气）。归因侧：whois 反查同一注册人下多个站点，而原文作者自己也注明「也可能是盗号者买了他的网站」⇒ 本轮把「批量特征」（同模板 / 同字段名 / 同后缀批量注册）定为归因主判据，whois 只作辅助。 |
| 495 | `52pojie-1048166-一个QQ网页盗号希望能够有大佬进行分析.md` | `feaf11116dc994ac588f2ce73abc286d` | 2026-09-23 | web-malware-forensics | create | **「顺带采集环境」是模板指纹**：伪造 QQ 邮箱登录页，除账号密码外还收集 IP 与城市 —— `<script src="http://pv.sohu.com/cityjson">` 取 `returnCitySN.cip` 写隐藏字段 `ip`；百度地图 JSONP `api.map.baidu.com/?qt=dec&oue=1` 取城市名、用 `escape()` 编码写隐藏字段 `dlwz`；入站需伪装 UA（`micromessenger`）否则被强制跳百度。⇒ 本轮把「隐藏字段里出现与业务无关的环境项」定为**模板指纹判据**。 |
| 496 | `52pojie-239371-盗QQ网站的分析.md` | `ad595847ae6bc92d49399b831875adb0` | 2026-09-23 | web-malware-forensics | create | **批量域名随机化 + 回传字段名**：`url = new Array(16)`（16 个 `.tk` 主域）+ `urlx = Math.floor(Math.random() * url.length)` 随机选 + 拼 `h=".tk/"`；入口参数是 `?8270=<base64>`；回传 `POST /tool/c1/foom.asp?spmui=1098`，请求体字段名 `address=&addressb=&u=&p=&btnSubmit=`。⇒ 本轮把它作为「**同后缀批量注册**」与「**用字段名归因**」的实证（单个域名没有归因价值 —— 原文作者自己说了「换个网址就又可以继续蹦跶了」）。 |
| 497 | `52pojie-822344-记一次找钓鱼页面源码.md` | `f8a421007482c917493b37c78a46c6fa` | 2026-09-23 | web-malware-forensics | create | **多层 `eval`/`document.write` 拆套的通用手法**：去掉可执行的外套后丢控制台，但**必须先声明它依赖的解密函数**（`function decode()` / `base64_decode` / `arcfour`）再调用；本例共四层：`eval` → `document.write('<script src=…qqapicdn.js>')` → 判 cookie 有无 `login` 分叉 → `arcfour(key, base64_decode(payload))`。另一条**必须早于页面**的经验：`navigator.platform` 在跳转后会被重写 ⇒ 只能靠扩展在 `document_start` 持续保持（而作者自己提示「用完记得卸载」）⇒ 本轮把它归入「**取证工具本身会被检测**」（`injection-and-hijack-triage.md` §5）。 |
| 498 | `52pojie-961123-最近苹果CMS player.js文件挂马留后门的问题及解决.md` | `eb97e4f1c314ec9982299a781bb672f6` | 2026-09-23 | web-malware-forensics | create | **「被加密的第三方文件里藏加载语句」这一形态**：播放页 `player.js` 有一定概率加载 `//union.maccms.com/html/top10.js`。处置口径可直接复用：解密该文件 → 删掉加载那一行 → **重新加密回填**，并**连第二行 `base64EncodeChars` 后面的机密密文一起换**（只删加载语句不改键 = 等于没改）。⇒ 本轮把它落成「处置时必须连键一起换」的判据，归入 L1 源站。 |
| 499 | `52pojie-984308-一个从chrome自动下载的js文件.md` | `b8673a3933068a6d672e911717359dd1` | 2026-09-23 | web-malware-forensics | create | **`sojson` 混淆器会自证**：文件开头就是 `var __encode = 'sojson.com'` + `(function(w){ w[_0xb483[0]] = _0xb483[1] })(window)`（即 `window._decode = "http://www.sojson.com/javascriptobfuscator.html"`）⇒ 这是**工具自证**，不是自研加密。两条可复用判据：① **字符串数组索引化** `window[__Ox43240[3]][__Ox43240[2]] = __Ox43240[4]` 展开才是 `window.location.href = "http://222.186.129.41/a/1.html"` ⇒ **静态搜 URL 会漏，要先把下标还原再搜**；② **删改留下的语法痕迹** —— `//优化跳转` 后面跟着空表达式 `window.location.;`（**必然 SyntaxError**）⇒ 说明手上这份**不是原始版本**。另外该样本的投毒条件是 **referrer 命中搜索引擎白名单**（`sogou|soso|baidu|google|youdao|yahoo|bing|118114|…`）。 |
| 500 | `52pojie-1722593-刚查到一个疑似dns 劫持木马.md` | `d99f60bbdee598c4042d08a175745463` | 2026-09-23 | web-malware-forensics | create | **L2（传输层 / 中间层）注入的形态证据**：`js/jquery-3.5.1.min.js` 被换成了「加了一些代码的版本」，但**服务器上的文件是正常的**；无缓存刷新多次后**又恢复正常**；同一服务器上的另一个站也中招；多个 js（`jquery-3.1.0.js?1.0`、`bootstrap.js?1.0`、`popper.js?1.0`）被按同一模式追加 query。注入内容是 `document[_0x2551[9]](unescape(_0x2551[8]))` 解出 `hxxps://www.metamarket.quest/market.js`。⚠️ 原文给的三条归因（域名供应商 DNS / 宽带供应商 / 服务器被黑）**都没有留下可复核的哈希或解析记录** ⇒ 本轮把它当**反例**写进文档：本技能的产出要求就是补齐这些证据（§1.2 的五步排除法）。 |
| 501 | `52pojie-1341701-一个邮件钓鱼网页的分析.md` | `780841b99ea789110e64985c735b5cd6` | 2026-09-23 | web-malware-forensics | create | **「合法第三方服务被滥用」这一档处置**：三层 `unescape` 解出一段 HTML，引三个外链 —— `https://smtpjs.com/v3/smtp.js`（**借它的邮件 API 回传凭证**）、jquery CDN、`http://api.ipify.org?format=jsonp&callback=getIP`（取受害者 IP）。⇒ 关键结论：**不能封第三方**（它是合法服务），处置写「该服务的滥用行为」，封的是钓鱼页与 token。 |
| 502 | `52pojie-522902-简单分析芒果TV免费领取现金话费盗号网页.md` | `a1ce9cfd1e2fd9319c16c5c916d53b38` | 2026-09-23 | web-malware-forensics | create | **提高可信度的话术特征（只有一句话但很值钱）**：「第一次输入账号密码，无论正确与否，都会提示不对；第二次输入账号密码，无论正确与否，都会提示正确」⇒ 目的不是骗过验证，而是**让受害者以为第一次是手误，并保证服务器只收到格式正确的凭据**。⇒ 本轮把「第一次必错、第二次必对」提成凭证钓鱼的识别特征之一。 |
| 503 | `52pojie-2033695-篡改猴脚本“获取网盘直链”劫持京东商品详情页分析.md` | `2a0b6e0aab6763cab80a19b36ccdb87a` | 2026-09-23 | web-malware-forensics | create | **油猴 / 篡改猴劫持的实证形态**：脚本初始化即 `POST http://124.222.238.158/pan.php?ver=&a=&href=`，服务端返回 `{page:"search", wrapper:[".more2_list>li"], timer:200, splName:8, jumpUrl:"https://ts.azkou.cn/ts.html?url="}` ⇒ **选择器 / 轮询间隔 / 批大小 / 跳转前缀全部由服务端下发**，所以「静态审计手里那份脚本」**必然漏**；随后批量 `POST /search.php` 换返利链接，最后 `$(base.panList[item.md5]).find('a').bind("click", …)` **替换原始点击行为**。外加作者实测的一个反直觉现象：「**这个 POST 在浏览器调试工具里看不到**」⇒ 本轮落成「**网络面板看不到 ≠ 没有外联**」（要同时 hook `GM_xmlhttpRequest`/`fetch`/`XHR`，并做系统级抓包）。 |
| 504 | `52pojie-2112340-假飞书国际版钓鱼网站恶意脚本逆向分析报告.md` | `6593e8f5a48f5789d39dc4908779fa7f` | 2026-09-23 | web-malware-forensics | create | **「网页侧只是入口，真正载荷在主机侧」的完整链**：`Lark.bat` → PowerShell（`ShowWindow(0)` 隐藏窗口）→ 远程 `*.txt` → `script.php`（其实是 PS）内含 **AES-256-CBC** 载荷 → 再解一层 → 下载 `installer_*.exe` → 计划任务静默安装（`/VERYSILENT`）解压到 `C:\Users\Public\SVN\versions\<随机数>\` → 回传主机名 / 用户名 / 区域 / 时间到 `contar.php?id=mts` → 写标记 `%LocalAppData%\MachineCounter\executed.txt` → **自清理**（删 exe 与计划任务）。⇒ 本轮只取「四类持久化标记 + 回传端点 + 自清理行为」作为 IOC 口径，并在文档里**显式划定边界**：网页侧不执行、不解 AES，主机侧走 `desktop-client-reverse`。 |
| 505 | `52pojie-1734167-【嶺上開花】油猴实战劫持人脸识别.md` | `df755859296ced4a5d566ef21d01ec4f` | 2026-09-23 | web-malware-forensics | create | **油猴脚本的「能力面」清单（审计要问的问题）**：伪造 `window.WebViewJavascriptBridge`（含 `WVJBCallbacks` 数组 + 隐藏 iframe 指向 `wvjbscheme://__BRIDGE_LOADED__` 的宿主注入探测），再按事件名分派 `callHandler(事件名, 参数, 回调)` —— 对 `examPushSign` 直接「弹文件选择器，把图片转 base64 回调回去」，于是**摄像头上传被替换成任意图片**。页面侧还有「到时间没返回就抛异常」的**定时陷阱**。⇒ 本轮落成审计结论的写法：「**能力面 = 事件名 × 可替换的回调**，这两列列全了才算审完」。 |
| 506 | `52pojie-2115726-【原创】V8 JSC反编译成JS.md` | `a8998804d092d6a056fa07f91a4dcc04` | 2026-09-23 | desktop-client-reverse | evolve | **补上了「要看懂 V8 字节码」这条路的现成工具链**（原技能只有「给 d8 打补丁」的昂贵路线）：① **判据**：`.jsc` 首 4 字节 `0xC0DE0687` ⇒ V8 code cache，且「庆幸没有加壳」（头完整 ⇒ 外面没再包一层）；本轮**只把它当前缀判据**（`C0 DE`），并显式标注「低 16 位随版本变」是**推断**（来源只给了一个观测值）；② **前置条件**（原文点名「最重要的一点」）：**先拿到目标用的 V8 版本** —— 做法是「把 Electron 开调试，在 console 里读」；③ **三条路线**：`jsc2js`（基于 `view8`，内置一批 V8 版本，原文用到 `13.4.114.21`，零编译成本，产物「很像 IDA 的 F5」）/ `d8.exe -e "loadjsc('…/atom.jsc')" > disasm.txt` + `python view8.py --disassembled … out.js`（这条 d8 **就是原技能 §5.1 那个 `LoadJSC` 补丁的成品**）/ AI + CDP 动态调用（可读性最好，但**只覆盖被触发的函数**）；④ 作者判断付费服务「不值得特地给钱去弄」，并已把过程工具化为一个 skill。⇒ 本轮同时**改写了原技能「别解字节码」的绝对口径**：新增 §5.3，并明确「拿业务逻辑仍优先劫持；§5.3 只用于**看懂**；三条路都给不出完整源码，改回 `.jsc` 不可行」。 |
| 507 | `52pojie-2021863-某Uniapp框架App hook方法.md` | `d49eaf3f19ad3695ceddc96991c26958` | 2026-09-23 | miniprogram-reverse | evolve | **非微信混合 App（Uniapp / Weex）的 JS 入口落点**（原文称「适用于全部 uniapp 框架的 App」）：这类 App 的 JS 入口**也叫 `app-service.js`，但没有包可解** ⇒ 只能从**原生渲染入口**抠；抓手是 `com.taobao.weex.WXSDKInstance.render` 的**第 2 个参数**（有 `String` 与 `Script` 两个重载，后者内容在 `Script.mContent` 字段里）；**第 4 个参数是「JS 名」**（JSON，含 `Plus_InitURL`，`app-service.js` 就在里面）⇒ 用它做分流。流程：frida **只打日志**确认重载与参数 → Xposed `findAndHookMethod` + `getObjectField(p.args[1], "mContent")` 读、`setObjectField` 回写（**改完立即生效，不重打包、不碰签名校验**）。可迁移结论：**加固只保护 dex / 资源，宿主自己的公开方法照样可 hook**。⇒ 一并写进 `runtime-and-debug.md` §4.4 + 分流判据表 + 排错 2 条。 |

### 本批次技能变更汇总（B25）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-malware-forensics` | **create** | `SKILL.md`（三条硬约束 / 12 行分流判据 / 7 步工作流含 1 个 🔴 CHECKPOINT / 失败模式 10 行 / 反例 10 条 / 与 8 条技能边界）+ 三个 references：`injection-and-hijack-triage.md`（三层排除法 / 分水岭 / L2 五步排除 / `UA × referrer` 矩阵 / 运行时写入点 hook 表 / 概率与 IP 限频复现口径 / 真机远程调试 / 扩展与油猴审计清单 / 挂马链 8 类结构特征 / 取证工具自身风险 7 项检测点 / 排错 9 条）、`payload-and-obfuscation.md`（**五类壳三联表** + 网马 `%u` 口径与噪声 / `sojson` 自证 / packer / base64+XOR（含密钥派生）/ base64+RC4 / 隐写 / AES 落地链 / 拆壳顺序与停止条件 / 排错 11 条）、`indicators-and-response.md`（IOC 六类与「比 URL 更值钱的 5 条」/ 归因 8 类信号 / 凭证回传三条路径 / 定性四档与证据行 / 清理清单 / CSP 与 HttpOnly 与 HSTS 与第三方治理 / 报告模板 / 排错 7 条）+ 两个 scripts：`payload_unpack.py`（五子命令，`--selftest` **65 项**）、`ioc_extract.py`（`--selftest` **56 项**）。 |
| `desktop-client-reverse` | evolve | `references/jsc-and-v8-bytecode.md`：§1 的 V8 行**改写**（从「没有可依赖的公开 magic」改成 `C0 DE` **前缀**判据 + 「低 16 位随版本变」标注为推断）、**新增 §5.3**（V8 版本前置 / `jsc2js` 与 `view8` / `d8 … loadjsc` 两段式 / AI+CDP 的覆盖边界 / 路线选择三条）、坑表 **+3**（#11–#13）、反例 **+2**；`SKILL.md`：分流判据 **+1 行**（首 4 字节 `C0 DE`）、工作流第 6 步补「看懂时的顺序」、资源小节同步。 |
| `miniprogram-reverse` | evolve | `references/runtime-and-debug.md`：**新增 §4.4**（Uniapp / Weex 混合 App 从 `WXSDKInstance.render` 抠 `app-service.js`：两个重载的区分、frida 日志脚本、Xposed 读改回写、`Plus_InitURL` 分流、与小程序的关系），排错 **+2**；`SKILL.md`：分流判据 **+1 行**（拿不到包但出现 `app-service.js`）、资源小节同步。 |

### 结构性收敛（B25）

| 项 | 处置 |
| --- | --- |
| **`description` 超限（> 1024 字符）2 处** | 自算全库 21 个技能：`stream-drm-reverse` **2490**、`miniprogram-reverse` **1730** 超标（其余 ≤ 995）。⇒ 本轮把两者压到 **983 / 993**，做法是**删解释性散文、保留全部独有触发词**；被删的 5 个词里 4 个是第三方工具名（`wxapkg-convertor` / `UnpackMiniApp` / `getStorageSync` / `session_id`），**仍在 `references/` 里出现**（已逐条 grep 确认），知识未丢；第 5 个 `x-evone-signature` **在独立评审中被指出「删得不对」**（它是签名头触发词、`references/` 里没有）⇒ **已恢复**（description 973 → 993，仍在限内）。`desktop-client-reverse` 在**净增 5 组新触发词**（`jsc2js` / `view8` / `0xC0DE0687` / `loadjsc` / 「V8 版本对不上」）的同时 **1138 → 943**。⇒ 全库 21 个技能 description 现均 ≤ 1000（最长 `web-verify-patcher` 995）。 |
| **`miniprogram-reverse` 自检项数漂移** | `SKILL.md` 声称 `wxapkg_tool.py --selftest` **27 项**，实跑 **29 项** ⇒ 已改正（与 B23 修 description 同类的「文档与实际不符」）。 |
| **新技能与 `code-analysis` 的分工** | 在 `web-malware-forensics/SKILL.md` 的边界小节显式写死：`code-analysis` 输出「结构 / 风险评分契约」，本技能输出「攻击链 / IOC / 处置」三件；**避免两处各写一份「风险评分」**（B20「同一份知识写两处必然分叉」）。 |

### 证伪与审计留痕（B25）

```bash
# ⚠️ 以下命令均以**仓库根**为工作目录

# 1) 新脚本自检（65 + 56 项）
python .agents/skills/web-malware-forensics/scripts/payload_unpack.py --selftest
python .agents/skills/web-malware-forensics/scripts/ioc_extract.py --selftest

# 2) 既有脚本回归（22 + 29 + 15 + 29 + 11）
for s in asar_offset_repair jsc_xxtea_tool byte_flag_patch; do
  python .agents/skills/desktop-client-reverse/scripts/$s.py --selftest; done
python .agents/skills/miniprogram-reverse/scripts/wxapkg_tool.py --selftest
python .agents/skills/miniprogram-reverse/scripts/const_bruteforce.py --selftest

# 3) 真实样本实跑：网马 shellcode 解出 urlmon.dll / D:\YTexe
python .agents/skills/web-malware-forensics/scripts/payload_unpack.py esc \
  --in artifacts/skill-evolution/b25-run-20260923/esc-input-527897.txt --strip-noise --hexdump 512

# 4) 真实样本实跑：源文章的 IOC 提取（含「定性提示」）
python .agents/skills/web-malware-forensics/scripts/ioc_extract.py \
  --in "docs/references/52pojie-1381839-某网页js挖矿木马的简单分析.md" --format markdown

# 5) 来源保真度（19 篇源文件逐条断言）
python artifacts/skill-evolution/tools/b25-verify-sources.py

# 6) 故障注入阳性验证（7/7 变红）
python artifacts/skill-evolution/tools/b25-fault-injection.py

# 7) 机械校验 + 双镜像
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 8) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b25-ledger.py
```

**故障注入明细（基线绿 → 注入后红）**：

| 注入点 | 结果 |
| --- | --- |
| `payload_unpack`：esc 的组内字节序交换被改掉 | 自检 58/65 → 红 ✓（**说明那条 oracle 真的在守**） |
| `payload_unpack`：packer 的「词元缺失必须报错」守卫被关掉 | 自检 64/65 → 红 ✓（防「静默产出垃圾」） |
| `payload_unpack`：base64 的 URL-safe 替换被删 | 异常退出 → 红 ✓ |
| `ioc_extract`：凭证钓鱼的定性规则被关掉 | 自检 55/56 → 红 ✓ |
| `ioc_extract`：链式挂马的定性规则被关掉 | SyntaxError → 红 ✓（**异常形式失败也算通过**：判据是「非静默通过」） |
| `b25-verify-sources`：一条针改成不可能命中的串 | 「未命中 1 条」→ 红 ✓ |
| 校验器：`references/` 引用被改成悬空 | 阴性 `rc=0` / 阳性 `rc≠0` → 红 ✓ |

**⚠️ 本轮故障注入抓到 2 个「假阳性注入」（自身缺陷，已修）**：① 把保真度脚本复制到临时目录，会让它因 `__file__`
推不出仓库根而以 `FileNotFoundError` 变红 —— 那是**假红**（根本没测到那条针）⇒ 改成落在原目录，并在判据里加
「输出必须含『未命中』」；② 迷你仓里把 `references/*.md` 写成占位 `x`，会让校验器因**跨文件 §小节引用**缺失而先变红
⇒ 阴性对照自己就挂了（与 B20「注入是否成功要一起断言」同型）⇒ 改成拷真文件。

### 独立评审（B25）

**方式**：**2 名独立盲评审员**（A：事实保真度 + 可执行性；B：新技能必要性 + 集成一致性 + 结构债），
只看产物与源文件、不给作者自评、**不允许改文件**；两人都被要求**实跑**其引用的每条命令、并给出证据。
**合计 8 项缺陷（2 项阻断级 + 6 项次要），全部回源复核后处置完毕**；结论均为 **needs-fix**，无 revert。
逐条见下方「评审结论」。

### 评审结论（B25）

**结论：needs-fix** —— 合计 **2 项阻断级 + 4 项次要**，全部在本轮内回源复核后处置完毕（1 项确认属"已修过、评审看到的是旧状态"）。
**本轮没有任何一条意见来自作者自评**；下述每条都带证据（文件位置 + 实跑输出）。

#### 阻断级（2 项）

| # | 缺陷 | 证据 | 处置 |
| --- | --- | --- | --- |
| 1 | 技能双镜像内容不一致（`web-malware-forensics/references/payload-and-obfuscation.md`） | 评审视角下 `node check_skill_integrity.js` 报阻断项 1 | **确认成立但已过时**：该差异来自作者本轮用 `sed` 修文档引用后**未及时重新镜像**；评审快照早于作者的第二次 `b20-mirror-sync.py --sync`。现已复跑：`content diff: 0`、机械校验 **0 阻断 0 告警**。⇒ **教训记档**：改完技能文件要**立刻**镜像，别等到最后一起做（否则并行的评审会看到不一致的中间态）。 |
| 2 | `web-malware-forensics/SKILL.md` 分流判据表把 `sojson` 的落点写成「（§2.2）」，但 `payload-and-obfuscation.md` §2.2 是 `packer` 壳，`sojson` 在 §2.1 | 评审给的文件/小节 + 作者复核 | **成立，已改**为「直接还原，别当加密（`payload-and-obfuscation.md` §2.1）」。 |

#### 次要（4 项）

| # | 缺陷 | 证据 | 处置 |
| --- | --- | --- | --- |
| 3 | `SKILL.md` 失败模式表里「从写入点倒推（§2.1）」**没有说明是哪个文件的 §2.1** —— 指向的是 `injection-and-hijack-triage.md` 的 §2.2，SKILL.md 自己的 §2.1 是工作流第 1 步 | 评审指出 + 作者复核 | **成立，已改**为显式路径「（`injection-and-hijack-triage.md` §2.2）」。 |
| 4 | 压缩 `miniprogram-reverse` 的 `description` 时删掉了 `x-evone-signature`，而它**没有**在 `references/` 里出现 ⇒ 该触发词**真的丢了** | 评审 `grep -rl 'evone'` 为空；作者复核确认（备份里 `SKILL.md` 计数为 1、当前为 0） | **成立，已恢复**（`description` 973 → 993，仍在 1024 限内）。⇒ 修正了本批"删触发词都安全"的自我判断：**判据应是"删的词是否在正文里还有"**，`x-evone-signature` 恰好只活在 description 里。 |
| 5 | 证伪留痕的 `bash` 代码块里命令用相对路径，换目录照抄会失败 | 评审建议 | **部分采纳**：留痕块的用途是记录"跑过什么"，本轮在块首补了一句「以下命令均以仓库根为工作目录」；不改写成绝对路径（绝对路径会带本机用户名，反而不可复现）。 |
| 6 | `web-malware-forensics/SKILL.md` 边界小节把「浏览器扩展**安装包**」一并划给 `desktop-client-reverse`，措辞不准（安装包不是桌面壳） | 评审指出 | **成立，已改**：桌面壳一条改成「恶意代码被打包进桌面客户端 / 单文件 exe（asar / `.jsc` / pkg 打包产物）」；**另拆出一条**「恶意代码在浏览器扩展 / 油猴脚本里 ⇒ 本技能负责审计与定性（§3）」。 |

#### 评审员明确给出的"值得保留"（原文保留）

- `payload_unpack.py` 的 `esc` **双口径开关 + 自检里的正/负对照**（swap 必须能读出 `urlmon.dll`，noswap 必须读不出）——
  评审自行复算后确认与源文章一致（源文章的 `%u54EB` 组按 `YY XX` 落盘才是合法 x86 指令 `EB 54`）。
- `ioc_extract.py` 的「定性提示」**显式声明为机械判据组合、不是结论**，且每个判据都带命中的样例串。
- 保真度脚本先做 **markdown 转义归一化**再匹配（否则语料里的 `30\*60\*1000` 会假未命中）。

---

### 第二次评审（评审员 A：事实保真度 + 可执行性）—— **needs-fix，2 项，本轮全修**

评审方式：**45 条事实抽查 + 14 条命令实跑**（含两次 `--selftest`、
§3.1 的 `b64-xor --key-from BxkeFB8H --key-xor p` 真实调用、`esc` 真跑、`packer` 真跑、台账幂等复跑、
以真实源文件跑 `ioc_extract.py`），**无调用错误**。

| # | 严重度 | 缺陷 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| A1 | **高** | `payload-and-obfuscation.md` §3.1 把派生的 6 字节密钥写成 `"windows"`（应为 `"window"`），`SKILL.md` 资源小节同错 | 评审复算：`77 69 6E 64 6F 77` 只有 **6** 字节；评审以 `base64_decode("BxkeFB8H")` 与 `reverse` 双向复算，输出均无末尾 `s` | **成立，已修 3 处**（`payload-and-obfuscation.md` ×2 + `SKILL.md` ×1）。⇒ 这是本批**最该被自己抓到**的一类错：**自检断言写对了（`b"window"`），文档却写错** —— 判据是"断言与文档必须逐字同源"。 |
| A2 | 中 | `injection-and-hijack-triage.md` §4.1 写「同一 URL 连写 **8** 次」，回源逐行只有 **7** 次 | 评审给出行号 + 原文 7 行；本轮 `grep -c` 复算 = **7** | **成立，已修**：改成「连写了 **7 次**（回源逐行计数：`52pojie-20874` 第 21–27 行）」；台账里同一处表述同步改。 |

**评审提出、本轮的部分处置**：
- 「E2E 运行产出无落盘证据」⇒ 本轮已把 5 份真实产出留档在
  `artifacts/skill-evolution/b25-run-20260923/`（`esc-input/esc-output-527897.txt` + 4 份 `ioc-*.md`），
  并写进台账的证伪留痕块。
- 「`payload-and-obfuscation.md` §3.2 的 RC4 样本缺文章编号」⇒ 已补 `52pojie-822344`。
- 「`miniprogram-reverse` 排错表里 `RadiumWMPF` 的版本号与内容超出该文范围」⇒ **确认属实但非本轮引入**：
  该行在开工前备份 `backup-20260923-2124-skills/` 里已存在（`grep -c` = 2）⇒ 记入**B26 待办**，
  本轮不顺手改（避免在未回源的情况下动别批次的内容）。
- 「事实保真 A1–A7 与改前文档的差异均有来源依据」⇒ 评审确认无误，无需处置。

### 下一批（B26）取材建议（承接本节）

- 待处理 **419** 篇（台账 507 条后；本批登记 19 条）。
- 优先级：
  ① **验证码图像识别系的坐标侧**（真拼图 / 双缺口 / 旋转点选）—— 连续多轮列为候选却一直没吃到，下一批应**优先聚簇**；
  ② **站前挑战厂商带**继续按 B24 写进文档的操作清单扩容（**优先取带完整纯算交付的**）；
  ③ **无感 / 行为验证**剩余并入 `behavior-verify-and-sign-headers.md`，**不要为每家建新文件**；
  ④ **恶意脚本 / 钓鱼取证**这条线已建库，后续按「同类只 evolve、出现新壳型才动脚本」的口径收进 `web-malware-forensics`；
  ⑤ **桌面客户端薄区**（Tauri / node:sea / 原生模块）：本批**首次命中**（V8 JSC 那篇），
     上一轮定的「再 0 命中就停止列为候选」口径**暂缓执行**，按「有新素材就继续」处理。
- **B26 待办（评审带出，非本轮引入）**：`miniprogram-reverse` 排错表里的 `RadiumWMPF` 版本绑定条目在对应源文章里查不到（开工前备份里已存在）⇒ 下一批若碰该技能，**先回源复核或降级为「未证」标注**。
- 候选新技能 `captcha-flow-orchestration` —— B5–B25 **十九次确认不新建**
  （证据池仍未跨越「单站一流程」到「可复用编排协议」的门槛）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
  **注**：B1-17 / B13-216 的「不建小程序技能」结论在 B22 已被**推翻并取代**，旧结论只保留可追溯性。
## 批次 B26 · 2026-09-23（第二十六次执行）

取材口径：待处理队列 **441 篇**中取**一个整族 —— 网马时代（2008–2012）载荷族 18 篇**
（`52pojie-31072/31094/31097/31098/31100/31101/31103/31113/31114/31115` 十篇"网马解密大讲堂"
+ `32204/32826/36347/39140/41909` 五篇实战解密 + `125529` 心得 + `99643` 挂马手法 + `78966` 分析素质）。

选它的理由有三条，且**第一条是对上一批建议的证伪**：

① **B25 列的"优先级①（验证码图像识别的坐标侧）"经复核不成立**：把该簇候选
（`2014831` 某音滑块 `captchaBody`、`2108119` 易盾滑块、`2125447` 顶象滑块、`2058010` 某习通滑块全协议、
`2044075` 某程滑块、`2098532` 某防水墙 AI 全链路 等）逐篇回源后，它们给的是**单站协议链**
（易盾四包 `Getconf/up/get/check`、顶象 `aid/ak/_r` 四步链、某音 `sha512+salt` 四参数），
而 `web-verify-patcher` 的 `provider-execution-notes.md` 已按厂商收录同型链路 ⇒
**再收只会重复登记厂商参数**，不是新能力（按"避免滥建冗余"的约束，本轮不取）。
② **网马通道是 B25 新开的供给线**（上游专门开了 MAL2 通道），且这一族的**编码形态与技能库零交集**：
建库前全库 `grep` `alpha2` / `US-ASCII` / `charcodes` **0 命中**（只有 `forum-corpus-archival`
把它们当语料过滤关键词）。
③ **本批能拿到 8 组"机器可判"的 oracle**（全部带阴性对照）—— 这是选它而不是选"再讲一遍极验/瑞数"的决定性理由。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 508 | `52pojie-31072-网马解密大讲堂——网马解密初级篇.md` | `6656fb18c5e6488217bbf1b0a7d4bebe` | 2026-09-23 | web-malware-forensics | evolve | **挂马手法 11 类的结构清单**（框架 / JS 文件 / `JScript.Encode` / Flash / 不点即弹 / `top.document.body.innerHTML +=` / CSS `url(javascript:…)` / `window.open` / 图片伪装 / `frameset rows="444,0"` / 高级欺骗），以及一条可迁移判据：**iframe 的 src 最值得看，宽或高为 0/1 的可疑度最高**。工具链四件（Freshow / HTMLDecoder / Malzilla / MDecoder）首次落档。 |
| 509 | `52pojie-31094-网马解密大讲堂——网马解密中级篇001(Freshow工具使用方法).md` | `bf320c627ecf5324dbd2769a1dc8430d` | 2026-09-23 | web-malware-forensics | evolve | **Freshow 的功能面**（`Qeye` 提链 / `Connect` 连串 / `Nuls` 去空 / `Replace` / `Reverse`；`Esc` / `ASCII` / `US-ASCII` / `Alpha2` / `enumXOR` / `Base64` / `Winwebmail`）—— 其中 `US-ASCII` 与 `Alpha2` 是**技能库此前 0 命中的两个编码名**。另得一条**算法级线索**（原文对 alpha2 的唯一描述）："首先转换到 `\x` 形式，因为可能会经过异或操作"。 |
| 510 | `52pojie-31097-网马解密大讲堂——网马解密中级篇002(Eval篇).md` | `5582674c72484c2a7058d1865b2f1ff2` | 2026-09-23 | web-malware-forensics | evolve | **"把 `eval` 换成 `alert`"这条不执行载荷的取证姿势**的原始出处；同篇带一个 dean-edwards packer 实例（`62,62` 词表 + `Gameeeeex`/`983A`/`pif` 等词元），与本批 `39140` 的 `62,6` 实例构成**同族双样本**（都落进 `packer` 的 oracle）。 |
| 511 | `52pojie-31098-网马解密大讲堂——网马解密中级篇003(Document.write篇).md` | `f4797fbc81fd8488e9470dbc830e3212` | 2026-09-23 | web-malware-forensics | evolve | `document.write` 的**语义判据**（"里面必须有 HTML 脚本标签，脚本才可以执行，否则会当作字符串输出"）＋ 完整多级链实录：`3.htm` → `3.css` → `a.cdd1.com/m.css`，且**该样本用的正是 alpha2** ⇒ 与 `31100` 互证 alpha2 的落点。 |
| 512 | `52pojie-31100-网马解密大讲堂——网马解密中级篇004(Alpha2篇).md` | `cef73c3f0f0bdc5513de8645fad7da75` | 2026-09-23 | web-malware-forensics | evolve | **alpha2 的判据**：代码开头 `TYIIIIIIIIIIIIIIII`、RealPlayer 漏洞族；操作路径（alpha2 解一次 → `up` 上翻 → 再 `esc` 解一次）。**本批唯一没能离线复算的一类**：见下方"证伪与审计留痕"里的 4 条排除实验 ⇒ 登记为**工具依赖**，不做离线实现。 |
| 513 | `52pojie-31101-网马解密大讲堂——网马解密中级篇005(Shellcode篇).md` | `2495f8d72383214bd3cafe7b5543b538` | 2026-09-23 | web-malware-forensics | evolve | **分隔符可以不是 `%u`**：本例分隔符是单词 `Game`（`Game54EBGame758B…`）。实测口径 = **先把 `Game` 归一化成 `%u`、再按组内交换 unescape**，解出三串 `urlmon.dll` / `C:\U.exe` / `http://haoxia18.com/xia/f5.css` ⇒ 这条把 B25 的"组内交换"从**单样本观察**升级为**多样本互证**（本批共 4 处）。另：原文给出 shellcode 的正式定义（Aleph One 1996 论文）。 |
| 514 | `52pojie-31103-网马解密大讲堂——网马解密中级篇006(Base64篇).md` | `9324dd3f064d9bf27b13b66ab3cf69cd` | 2026-09-23 | web-malware-forensics | evolve | **base64 + UTF-16 这一变体**（`YgBlAGcAaQBu` = `b\0e\0g\0i\0n\0`）：识别特征是"解出来是成对字节"，工具此前只会按字节输出 ⇒ 新增 `b64-utf16` 子命令。实测 oracle：原文那串解出 `begin<br>…` 与 `http://www.cngg.org/ad/ad1.exe`（另有 msn074/qq23 与三条 `track.aspx` 回传）。 |
| 515 | `52pojie-31113-网马解密大讲堂——网马解密中级篇007(US-ASCII篇).md` | `ea5fe756c0bbe528ad2e2952165e828a` | 2026-09-23 | web-malware-forensics | evolve | `US-ASCII` 的判据（原文原话："**代码类似汉字**"，且代码里含 `<meta http-equiv="Content-Type" …/>`）。⚠️ 原文**未给可复算样本**（附件不在语料池）⇒ 文档只登记判据、算法栏写"**未证**"，**不写推测性算法**。 |
| 516 | `52pojie-31114-网马解密大讲堂——网马解密高级篇001(SWF解密).md` | `22b7ed8a5ba94ec46f58e68caf34e7bd` | 2026-09-23 | web-malware-forensics | evolve | **容器型载荷（SWF）**：判据是文件头 `CWS`（压缩）/`FWS`/`ZWS`，处置是**先 zlib 解压再找 `ActionScript` 里的 URL**；且原文明确 **SWF 与 PDF 共用同一套"结构拆分 + 数据流解压"** ⇒ 文档把两者合成一节，避免写成两件事。 |
| 517 | `52pojie-31115-网马解密大讲堂——网马解密高级篇002(PDF解密).md` | `3722f75402f5b671ce366b9e5c0b5811` | 2026-09-23 | web-malware-forensics | evolve | **PDF = 容器 + 内嵌 JS**（可用记事本直读）；两条硬事实：① 拼接表达式里夹着 `\x30`（原文写成字符间带空格的 `\ x 3 0`），`"%u9"+"\x30"+"90"` 必须**先折回 `%u9090`** 再切组，否则整串错位；② 这是**带 XOR 密钥的 shellcode**，原文口径是"**里面有很多的 21**……密钥就是 21"。实测：`%u` 组内交换 **再 XOR `0x21`** 解出 `http://5l2o8.com/web/3.exe`（换 `0x20` 不命中）。 |
| 518 | `52pojie-32204-一个网马解密实例 by 是昔流芳[LSG].md` | `957a90a2747a25d84c025ffa4b647562` | 2026-09-23 | web-malware-forensics | evolve | **"变量声明顺序 ≠ 拼接顺序"**这一反例（`Shell2` 先声明、`PayLoad = Padding + AdjESP + Shell + Shell2 + …` 里排第 4）⇒ 直接丢给工具解不出，必须先按**拼接表达式**手工合并；配一句可迁移结论："**不要依赖工具**，工具还没有智能到自动整理代码的地步"。 |
| 519 | `52pojie-32826-分析一个简单的shellcode网马.md` | `98099ec7128cc83e501e9e3f8ea8f5fc` | 2026-09-23 | web-malware-forensics | evolve | **整型数组 + 偏移**一族：`arr[i]=String.fromCharCode(sss[i]-80)`，随后 `,`→空格、`@`→`,`（**顺序是契约**）。实测 oracle：149 个元素解出 `var SC=unescape(spray.replace(/abcd/g,"%u"));…memory=new Array();`。同篇还有 `abcd` 当分隔符、`%u0808` NOP 填充、以及"静态解不出时丢 OD 动态跑"的边界。 |
| 520 | `52pojie-36347-[LCG作业]一个网马解密实例.md` | `aa248a983720dbfe000f37311c23933e` | 2026-09-23 | web-malware-forensics | evolve | **噪声字符过滤**一族：`'s#!c!$$r&$&&i#^!p@#t#'` + `.replace(/\$|\!|#|&|@|\(|\^|\)/ig,'')`。实测 oracle：395 字符噪声串过滤后还原出完整 URL `http://foxsports-com.narod.ru.dmm-co-jp.sugaryhome.ru:8080/…`（多层域名拼接也是该族特征）。作者结论"**解密网马不要太依赖工具，懂点脚本语言就好多了**"。 |
| 521 | `52pojie-39140-[LCG作业]function(p,a,c,k,e,d)解密.md` | `a6b605a6c651541da44b9a2845e5a374` | 2026-09-23 | web-malware-forensics | evolve | dean-edwards packer 的**最小可复算实例**：`'2.4("3://5.0.1")',62,6,'baidu|com|document|http|write|www'.split('|')` ⇒ `document.write("http://www.baidu.com")`。价值在于它把"**进制 `a` 与词表 `k` 必须回源核对**"做成断言（把 `c` 改成 3 必须报"词元缺失"）。 |
| 522 | `52pojie-41909-小小的例子，小小的网马(编辑完成) by 是昔流芳[LSG].md` | `17d6fa94e6e6351e7b0731f7881f11a0` | 2026-09-23 | web-malware-forensics | evolve | **两层结构 + 两处新编码**：① 外层是 `eval(sb(101)+sb(118)+…)`，`sb(m)=String.fromCharCode(m^3)` ⇒ 新增 `xorchain`（实测解出 `function replacestr(str){` 且 CRLF 对得上）；② 内层 `packcode`（`zC3z84z45zD4…`）是"**去 `/~?@` → 去 `z` → 每两字符交换 → `%XY` → unescape**"，实测解出 `<HTML>…classid="clsid:75108B29-202F-493C-86C5-1C182A485C4C"` ⇒ 这是"组内交换"口径的**第 4 处独立实证**。 |
| 523 | `52pojie-125529-浅谈关于网马解密的一些心得.md` | `b152b723106b04072a24f187c819a5f0` | 2026-09-23 | web-malware-forensics | evolve | **两条铁律**（"浏览器是最终解释机" / "解铃还需系铃人"）+ 本族定性口径（"这种变形更准确的来说是称为 **obfuscation**，并非真正意义上的加密与解密"）⇒ 直接决定本技能的处置姿势是**反混淆**而不是找密钥。另带三件可迁移事实：`eval` 被主动隐藏的写法（`(document.getElementsByTagName+'').substr(1,4)` 探测 + `Object.prototype.bt3223` 污染 + `-h*eval` 字符码表）、`Redoce` 的 `3>标出 Eval / 6>Eval() 清除`、以及十六进制串样本（实测解出 `document.write('<iframe src="http://doubleclicck.co.cc/forum.php?tp=…" width="1" height="1"…`）。 |
| 524 | `52pojie-99643-对某站挂马手法及网马加密方法的分析.md` | `c6481f9eb4d88470c16fa4ebaf154da0` | 2026-09-23 | web-malware-forensics | evolve | **定向投放 + 环境分派的老样本形态**：先判系统（`windows nt5.1` / `msie8` 命中就 `location.replace("about:blank")`）、再用 `new ActiveXObject("360SafeLive.Update")` **探测 360**（`catch` 里 `g=="[object Error]"` 判"没装"）；挂马链是多级 `?id=` 传递（`kbl.html?id=` → `load.html`），并用 cookie 去重标记 `IsGone` 控制只投一次；另有"随机数 `Math.random()*100 > 15` 才投"的概率闸门。 |
| 525 | `52pojie-78966-从一个简单的例子,谈谈分析网马的基本素质.md` | `b1ae3f677d68c9f12a7c2cd071816213` | 2026-09-23 | web-malware-forensics | evolve | 同一族（整型数组）的**变体**：偏移用的是**除法**（`arr[i] = String.fromCharCode(Ttodeol56523657[i56236897]/7)`），且变量名被写成 `arr895636532`/`eaknNK678upHPboKT` 这类"前缀 + 随机数字"⇒ 识别特征是**"同一前缀后跟不同随机后缀"的标识符族**（比逐个认变量名快）；内层仍是 dean-edwards packer，但词表是**纯数字表**（`134|170|66|…`）⇒ 印证"`k` 表内容无意义，只有位置有意义"。 |

### 本批次技能变更汇总（B26）

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-malware-forensics` | evolve | 新增 `references/legacy-web-malware-family.md`（10 节：挂马手法 11 类与 iframe 尺寸判据 / 两条铁律与四步法 / 容器型 SWF·PDF / **编码族三联表 11 行（其中 6 行是建库前 0 命中的新族）** / "组内交换"的 4 处实证 / XOR 密钥发现口径 / **8 组实测 oracle 表** / 老工具链与现代等价 / 排错 10 条 / 反例 6 条）；`payload-and-obfuscation.md` 三联表 **+6 行**（#9–#14：自定义分隔符 / 两字符交换 / 整型数组 / XOR 字符码链 / base64-UTF16 / `alpha2`）并升级 §1.2 为"4 处独立实证"；`SKILL.md` 分流判据 **+9 行**、工作流第 4 步补编码族入口、失败模式 **+6 行**、反例 **+2 条**、命令入口 **+7 组**、资源小节新增文件与自检项数；`scripts/payload_unpack.py` 新增 5 个子命令（`delim` / `charcodes` / `xorchain` / `b64-utf16` / `strip-noise`）与 `esc --xor`，自检 **65 → 102 项**。 |

### 结构性收敛（B26）

| 项 | 处置 |
| --- | --- |
| **`description` 长度** | 本批给 `web-malware-forensics` 的 description 增补 8 组触发词（`Game54EBGame758B` / `TYIIIIIIIIIIIIIIII` / `alpha2` / `fromCharCode(sss[i]-80)` / `sb(m)=fromCharCode(m^3)` / `b64 + UTF-16` / 噪声字符过滤 / SWF `CWS` / PDF 内嵌 JS / Freshow 时代），一度冲到 **1107** ⇒ 按"**删解释性散文、保留独有触发词**"压到 **1000**（限 1024）。压缩时删掉的 5 个词已逐条 `grep`：`Content-Security-Policy` / `剪贴板` / `远程配置下发` / `VeryMal` / `Coinhive` **仍在正文里**；`autoThreads`（挖矿 IOC 关键词）**只在 description 里**⇒ 已**恢复**。另 3 个描述性词（`基于图像的恶意软件` / `假浏览器安装包` / `页面跳转劫持`）语义已由"图片隐写 / 假 Flash 安装包 / 跳转劫持"承接，**不算能力词丢失**。 |
| **`esc` 的口径债** | B25 的"组内交换"当时只有 **1 个** oracle。本批新增 3 处独立实证后，文档与自检都升级为"**4 处**"，并把"**先交换再 XOR**"（顺序不可颠倒）做成**阴性断言**（换 `0x20`、或 `esc-noswap`+`0x21` 都必须读不出 URL）。 |
| **`alpha2` 的处理口径** | 新增一条**"工具依赖项"**的登记范式：判据写清楚、算法栏写"未证"、**并附证伪实验**（避免下一个人用"base64 + XOR"再撞一次墙）。`US-ASCII` 同法登记为"未证"。 |

### 证伪与审计留痕（B26）

```bash
# ⚠️ 以下命令均以**仓库根**为工作目录

# 1) 解包器自检（102 项，含本批 8 组新 oracle）
python .agents/skills/web-malware-forensics/scripts/payload_unpack.py --selftest
python .agents/skills/web-malware-forensics/scripts/ioc_extract.py --selftest

# 2) 真实样本实跑（8 条，输入由源文章现抽，见 artifacts/skill-evolution/b26-run-20260923/）
S=.agents/skills/web-malware-forensics/scripts/payload_unpack.py; O=artifacts/skill-evolution/b26-run-20260923
python $S delim    --in $O/in-31101-game.txt    --sep Game --out $O/out-31101.txt      # -> urlmon.dll / C:\U.exe / http://haoxia18.com/xia/f5.css
python $S esc      --in $O/in-31115-pdf.txt     --xor 21  --out $O/out-31115.bin       # -> http://5l2o8.com/web/3.exe
python $S b64-utf16 --in $O/in-31103-b64.txt    --out $O/out-31103.txt                 # -> begin<br>… / www.cngg.org/ad/ad1.exe
python $S charcodes --in $O/in-32826-sss.txt --offset 80 --remap ',: ' --remap '@:,'   # -> var SC=unescape(spray.replace(/abcd/g,"%u"))
python $S xorchain --in $O/in-41909-sb.txt --fn sb --key 3 --out $O/out-41909.js       # -> function replacestr(str){
python $S delim    --in $O/in-41909-packcode.txt --sep z --pairs --drop '/~?@' --out $O/out-41909-stage1.txt  # -> <HTML>
python $S strip-noise --in $O/in-36347-noise.txt --chars '!@#$^&()'                     # -> http://foxsports-com.narod.ru…
python $S packer   --in $O/in-39140-packer.txt  --out $O/out-39140.js                  # -> document.write("http://www.baidu.com")

# 3) alpha2 的证伪实验（4 条排除，全部否定）
python - <<'PY'
import base64, re
s = open("docs/references/52pojie-31100-网马解密大讲堂——网马解密中级篇004(Alpha2篇).md",
         encoding="utf-8").read()
full = ""                                   # 逐行抽；一行里可能有多个拼接字面量，必须全部接上
for line in s.splitlines():
    if "ShellCode=ShellCode" in line:
        seg = line.split("ShellCode=ShellCode", 1)[1].split(";")[0]
        full += "".join(re.findall(r'"([^"]*)"', seg))
raw = base64.b64decode(full + "=" * ((-len(full)) % 4))
print("字符数", len(full), "| 标准 base64 ->", len(raw), "字节 | 可读段",
| **台账追加脚本的编号校验口径（真实踩到）** | `append-b2x-ledger.py` 的"编号连续"检查原本用 `^\|\s*(\d+)\s*\|\s*`` —— 它会把**评审记录表**（`| 1 | 技能双镜像…`）也算成登记行。B25 当年能跑通只是因为那批的评审表是**本轮刚写进去**的；B26 追加时它们已在文件里，于是误报"编号不连续：[506, 507, 2, 3, 6]"。⇒ 口径收紧为"第 2 列是反引号包住的 `.md` 文件名"，**与台账的幂等口径同源**（`append-b26-ledger.py` 已改并留注）。 |
      re.findall(rb"[ -~]{6,}", raw))       # -> 794 | 595 字节 | [b'4Cg[B}']（无意义）
PY
#   ② 4 种常见字母表（标准/数字优先×2/URL-safe/crypt）③ 位反转 / 半字节交换 ④ 单字节 XOR 枚举 256 种
#   全部无 http / urlmon / .dll 命中 ⇒ alpha2 登记为"工具依赖"，不做离线实现

# 4) 来源保真度（表 A 72 条 / 18 源文件 + 表 B 29 条 / 3 落点文件）
python artifacts/skill-evolution/tools/b26-verify-sources.py

# 5) 故障注入阳性验证（9/9 变红）
python artifacts/skill-evolution/tools/b26-fault-injection.py

# 6) 机械校验 + 双镜像
node artifacts/skill-evolution/tools/check_skill_integrity.js --root . --markdown
python artifacts/skill-evolution/tools/b20-mirror-sync.py

# 7) 台账幂等复跑（应打印「已登记，跳过」）
python artifacts/skill-evolution/tools/append-b26-ledger.py
```

**故障注入明细（基线绿 → 注入后红）**：

| 注入点 | 结果 |
| --- | --- |
| `esc`：组内两字节交换被改掉 | 自检 88/99 → 红 ✓（4 处实证里至少 3 处同时命中） |
| `delim`：「每段必须 4 位十六进制」守卫被关掉 | 自检 97/99 → 红 ✓（防"静默拼错"） |
| `delim --pairs`：两字符交换被改回原序 | 自检 97/99 → 红 ✓（`packcode` 解不出 `<HTML>`） |
| `charcodes`：字符重映射改成**逆序**执行 | 自检 98/99 → 红 ✓（"顺序是契约"那条在守） |
| `b64-utf16`：「奇数长度必须报错」守卫被关掉 | 自检 98/99 → 红 ✓ |
| `strip-noise`：「空字符集必须报错」守卫被关掉 | 自检 98/99 → 红 ✓ |
| 保真度**表 A** 一条针改成不可能命中的串 | 「未命中 2 条」→ 红 ✓ |
| 保真度**表 B** 一条针改成不可能命中的串 | 「未命中 1 条」→ 红 ✓（表 B 真的在守"文档必须逐字含该字面量"） |
| 校验器：`references/` 引用被改成悬空 | 阴性 `rc=0` / 阳性 `rc≠0` → 红 ✓ |

**⚠️ 本轮注入过程中如实记录的一处发现**：最初把"`charcodes` 的越界守卫"当注入点，结果**不变红** ——
排查后确认是**守卫冗余**（`chr(-79)` 自己也会抛 `ValueError`，那条守卫只是为了把报错信息说得更具体），
**不是断言漏洞**；该注入已替换为"重映射逆序"。这条记档的意义在于：**注入不变红时，先分清"断言没守"与"这层本来就没有可观测差异"**。

### 独立评审（B26）

**方式**：**1 名独立盲评审员**（只看产物与源文件，不给作者自评、**不允许改文件**），四个维度：
事实保真度 / 可执行性 / 自检有效性 / 一致性；要求每条结论都带证据（文件 + 行号，或命令 + 实跑输出），
并**明确要求它自己写代码复算文档里的数字、拒绝采信文档自述**。

**结论：`pass`** —— 1 项低severity缺陷（措辞/语义精度），本轮已修并补上断言。

| # | 严重度 | 缺陷 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | 低 | `charcodes` 的口径被写成"等价于把 `,` 换成空格"，而**源里其实有两种写法**：恶意代码 JS 是 `arr.toString().replace(/,/g,"")`（**删逗号**），作者的解码工具 C 才是 `0x2c -> 0x20`（**逗号变空格**） | 评审给出源行号（`52pojie-32826` 的 JS 段与 C 段）；并指出该样本解码后**含 0 个 `0x2c`**、故两口径在它上面结果相同（所以 oracle 与命令仍然正确） | **成立，已修 3 处**：`payload_unpack.py` 的 `charcodes_decode` docstring 改写为"两种写法、只在载荷含 `0x2c` 时分叉"；`legacy-web-malware-family.md` §4 表下加注 + §6 oracle 4 加注 + 排错表加一行；`SKILL.md` 失败模式加一行。**并新增 3 条断言**把分叉钉死（C 口径 / JS 口径 / **二者必须不同**）⇒ 自检 **99 → 102 项** |

**评审自己实跑/复算的内容（节选，均为其原文）**：

- **8 条 oracle 命令逐字复跑**（`esc --xor 21` 含 `0x20` 阴性对照、`delim --sep Game`、
  `charcodes`、`b64-utf16`、`xorchain`、`strip-noise`、`packer`、`delim --pairs`）⇒ 全部按文档命中。
- **`alpha2` 证伪数字独立重算**：`字符数 794 | 标准 base64 -> 595 字节 | 可读段 [b'4Cg[B}']`，与文档**完全一致**。
- **"建库前全库 0 命中"独立复验**：在 `git bc6fe72` 版本上对 `alpha2|US-ASCII|charcodes|charcode` **0 命中**。
- **一致性**：`.agents` 与 `.claude` `diff -rq` ⇒ `TREES IDENTICAL`；§ 引用全部存在；
  `verified.md` B26 段 18 个 md5 抽验 9 个（含全部重点源）逐字节一致。
- **反向实验 2 组**：不交换组内字节 / 偏移用 81 / base64-UTF16 用大端 ⇒ 均解不出可读串，**未发现恒绿断言**。

**评审明确点名"值得保留"的 5 条（原文保留）**：

1. 挂马手法 11 类里"**iframe 的 `src` 最值得看、宽高 0/1 即可疑**"这条判据不随时代失效，可直接迁到现代运行时写入点。
2. "组内两字节交换"从**单样本观察**升级为 **4 处互证**，且把"不交换即读不出"做成断言 —— 把经验变规则的范本。
3. `alpha2` / `US-ASCII` **如实标"工具依赖 / 未证"**，不编伪算法；证伪实验可复跑、数字经其重算吻合。
4. **8 组 oracle 全带阴性对照**（`0x20` 不命中、packer `c=3` 报错），`--selftest 65 → 102`。
5. **编码族三联表 ↔ 命令入口 ↔ 源文章行号**三者一一对应，并用 `git` 证明了"建库前 0 命中"。

**评审如实声明的"未验证范围"**（记档，避免高估本轮证据强度）：

- 未跑 B25 既有的 `stego` / `ioc_extract` 入口（非本批新增、且缺对应输入）。
- 未实跑 `b26-verify-sources.py` / `b26-fault-injection.py` **这两个脚本本身**（以 `git` md5 抽验、
  `--selftest 102/102` 与手工反向实验替代）。
- 18 篇源文章**未逐篇全文通读**，只做了 25+ 条断言的定点抽查（重点项全覆盖）。
- 未核查 `.agents` / `.claude` 之外的其它镜像位置。

### 下一批（B27）取材建议（承接本节）

- 待处理 **423** 篇（台账 507 → 525 条；本批登记 18 条）。
- 优先级：
  ① **网马时代这条线继续收尾**：本批只吃到"编码族 + 容器型 + 手法"三块；池里还剩
     `52pojie-78966` 之外的 `31115` 同族（PDF/SWF 更深的利用侧）、`32826`/`41909` 之外的
     `shellcode` 变体，以及 `928225`/`2113952`/`2115802`/`2100101` 四篇钓鱼/挂马实战 ⇒
     **一律 evolve `web-malware-forensics`，只有出现"新壳型"才动脚本**。
  ② **验证码簇的取舍口径要写死**：B26 已论证"单站协议链不再逐篇收"（易盾/顶象/某音都有既有落点）。
     下一批若仍要碰该簇，**只取"新题型"或"带完整纯算交付"**的（例如真拼图坐标、双缺口几何）。
  ③ **站前挑战厂商带**按 B24 的 6 处同改清单扩容（优先带可独立复算的 oracle）。
  ④ **无感 / 行为验证**剩余并入 `behavior-verify-and-sign-headers.md`，不为每家建新文件。
  ⑤ **桌面客户端薄区**（Tauri / node:sea / 原生模块）：B25 首次命中后本批 0 命中，
     按 B25 暂缓的口径继续"有新素材就收，不再列为固定优先项"。
- 候选新技能 `captcha-flow-orchestration` —— B5–B26 **二十次确认不新建**（证据池仍未跨越"单站一流程"门槛）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。
  **注**：B1-17 / B13-216 的「不建小程序技能」结论在 B22 已被推翻并取代，旧结论只保留可追溯性。
- **B26 待办（评审带出、非本轮引入）**：`miniprogram-reverse` 排错表里的 `RadiumWMPF` 版本绑定条目
  在对应源文章里查不到（B25 已记，本批未碰该技能）⇒ 继续留到碰该技能的那一批回源复核。
---

## 批次 B27 · 2026-09-24（第二十七次执行）

**开局状态**：台账 B26 后 525 条 / 目录 `.md` 1005（文章 1000）/ 待处理 **475**。
三方对齐（台账最后一节 × `git log` × 自动化记忆最后一条）**均为 B26** ⇒ 上一轮已闭环。
⚠️ 但工作区里发现**上一轮未收口的在制品**：`web-malware-forensics` 与 `desktop-client-reverse` 有
**未提交、未登记、未评审**的改动（含两个新 references），最后修改时间 00:54–01:13。
本轮**先复核再续做**（`check_skill_integrity` / 双镜像 / 脚本自检 / 幂等扫描），确认内容完整后
**纳入本批一并收口**（这正是 B22「台账有、记忆无、git 无」的同一型问题）。

**取材口径**：两条簇一次蒸馏，均为 B26「下一批建议」的优先级 ① 与 ④ 的落地：

- **簇 A · 网马/钓鱼/劫持的收尾（10 篇）**：服务端宿主层后门 1（`2115802`）+ 钓鱼工具包与漏斗 5
  （`1251567` / `1252548` / `2100101` / `2113952` / `928225`）+ 挖矿防护 1（`784562`）+
  扩展劫持 1（`1066799`）+ 反调试绕过 1（`2044857`）+ 激活劫持 1（`2109138`）。
- **簇 B · 小游戏与帧协议（8 篇）**：Cocos 小游戏反编译 1（`2081826`）+ Unity IL2CPP→wasm 1（`1936819`）
  + WebSocket/MessagePack 帧 1（`1150098`）+ 小程序 sign/check 两族 2（`901994` / `965556`）
  + 未证字段定位范式 1（`1775370`）+ 响应体改写边界 1（`2058459`）+ **Mozjs 字节码第三形态** 1（`814217`）。
  选它的理由：`miniprogram-reverse` 自建库起（B22）只覆盖「小程序」这一入口形态，
  而语料里**小游戏**（`game.json` / `wasmcode` / Unity）与**帧协议**是**零覆盖**的空白区。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 526 | `52pojie-2115802-简单分析下网站出现的挂马.md` | `c5054b527e653cead1ecca67c27e8fbc` | 2026-09-24 | `web-malware-forensics` | evolve | 服务端宿主层后门（L1 之下的第二层）：源文件哈希==响应体哈希时分水岭失效；四层注入点（vhost `_.conf` → `/etc/init.d/nginx` → `/etc/ld.so.preload` → Lua 模块 `ngxd`）；下载器四手法（`curl -fsSLk -m 5` / `touch -r /etc/passwd` / `chown www:www` / `chattr +i`）；`libusranalyse` 被精准点杀；`verify_command_request_signature`（RCE）与 `refresh_machine_id`（定向下发）；`pc_ratio=0` 的设备概率分流与「按 UA×20 次报命中率」的复现口径；按依赖倒序的清理顺序 |
| 527 | `52pojie-1251567-【原创】记一次班级群的QQ钓鱼网站分析.md` | `22e32a1364b92738e87d85512c9efa36` | 2026-09-24 | `web-malware-forensics` | evolve | 钓鱼 kit 源码级指纹：`{DBQZ}_config/_url/_list` 表前缀、`21232f…` = `md5("admin")` 默认后台口令、`('syskey','1544422')`、`authcode("{user}\t{session}",'ENCODE',$SYS_KEY)` + `$ckey_length = 4`、`/wocaonima/` 后台目录、`/install/` 残留（同源批量发现）、`nvkp5.zgzmw.net/AcQuxM/loguce.ppt` 防红链接、`873` ⇒ rsync 实时迁移；**明确否定原文的"删库/刷垃圾数据"范式**（合规红线） |
| 528 | `52pojie-1252548-钓鱼网站深入挖掘分析.md` | `392d1a3e5b0137585a5a251f9831777c` | 2026-09-24 | `web-malware-forensics` | evolve | kit 后台与上报面：`/wocaonima/login.php`、`/save.php`、`u=…&p=…&submit=` 上报形态、`143.92.45.190:888/pma` 未授权 phpMyAdmin、多站同源库名列表；**"以暴制暴"不是操作范式**（污染证据、可能使己方成为加害方） |
| 529 | `52pojie-2113952-一个很低级的钓鱼网站分析报告.md` | `da81d9ce13bc3c906232185bcbc5880c` | 2026-09-24 | `web-malware-forensics` | evolve | 站点图与投诉链：随机三级子域 `4wz7709o03.g7k43v6.wzobn.cn`、共享 NS `a1.share-dns.com`/`b1.share-dns.net`（同族批量发现）、`/template/temp12/assets/index-pzAUEGSA.js` 模板指纹、`/checkbankcard`/`/notifytxt` 接口族、`HomeName` 类名族、RDAP `209.209.48.0/22` + `IIDCORP-GROUP-01`、abuse 邮箱；**只有 HTTP 443 失败**作为成本信号 |
| 530 | `52pojie-2100101-零基础小白初次尝试逆向钓鱼网站，但是不知道接下来可以做什么.md` | `a65a0dbec8cdde44a6118680fd3eb229` | 2026-09-24 | `web-malware-forensics` | evolve | **`/step_*` 后缀即状态机状态名**（直接读出字段清单与分支条件，比逐页截图快）；`/step_laod/` 与 `/step_load/` **原文并存**（kit 自身错拼 ⇒ grep 两种都要覆盖）；`EcCensus v11` / `_EcCensus` 统计面板自证；双 base64 上报体（首 4 字符 `ZXlK` 是判据）；`Math.random()` 做缓存穿透 ⇒ 按**路径**聚合日志；`localStorage.cess_day` 本地去重 |
| 531 | `52pojie-928225-发现一个很厉害的钓鱼，不知道怎么提交数据的大手子来分析一下.md` | `c5344adb515d63adf77eb8b5a5e0b36b` | 2026-09-24 | `web-malware-forensics` | evolve | **无 `input` 钓鱼页**（编辑框是 JS 画的、字体自制）⇒ 从**出网点**倒推，不从 DOM 找框；跨站回传要区分"攻击者自有域名"与"被利用的脆弱第三方接口"（`mboxzhaoge.kuwo.cn` 应作为"该接口无鉴权"提交给其运营方）；`atob` 载荷两级回传 `dt301.com/q.php` → `qq.php` |
| 532 | `52pojie-784562-如何避免网页被挖矿.md` | `1bebfb6305c0b6f07a81dc12e64f10c4` | 2026-09-24 | `web-malware-forensics` | evolve | 挖矿参数面：`coinhive.min.js` + 钱包地址 + `throttle: 0.7`（占用率，非错误）+ `didOptOut(14400)` + 矿池 `wss://ws001/ws012.coinhive.com/proxy`（共 12 个）+ `adjustEvery:1e4` + `IF_EXCLUSIVE_TAB` + `isMobile()` 不挖 |
| 533 | `52pojie-1066799-chrome插件gmail访问助手劫持主页.md` | `a74cf682dcf4b8d609967461d782a454` | 2026-09-24 | `web-malware-forensics` | evolve | 扩展劫持的**服务闸门判据**：`baidu.com!==-1`（检测到新标签页不是百度就停服）⇒ 解释了"为什么只有部分人受影响"；`transfer.html` + `Newtab` 触发点 |
| 534 | `52pojie-2044857-油猴脚本-通过Hook来禁用disable-devtool插件.md` | `32c6fa23c010d8726c0459905297d28f` | 2026-09-24 | `web-malware-forensics` | evolve | `disable-devtool` 反调试库：`detectors: [0,1,3,4,5,6,7]`、`clearIntervalWhenDevOpenTrigger: !1`、`ondevtoolopen` → `about:blank`；Hook `loadjs.d`；**事件监听器断点**（`beforeunload`/`unload`）停在跳转前再按调用栈找写入点 |
| 535 | `52pojie-2109138-代码整理【Typora激活劫持 支持到1.14.8】.md` | `95433b76d944b3a5c00401c7fcc767c4` | 2026-09-24 | `desktop-client-reverse` | evolve | 激活类请求**是一对端点**：`api/client/activate` + `api/client/renew`，只拦一个 ⇒ 当时成功、**下次续期又掉**；两端点**响应字段形状不同**（`{code,retry,msg}` vs `{success,code,retry,msg}`）⇒ 必须从消费方反推；**注入别碰业务状态文件**（删同目录 `id` 会导致激活失效）；要有回滚；依赖锁 `chalk@4` |
| 536 | `52pojie-1150098-小程序《胡莱三国》----websocket分析.md` | `fab8e5beb01ec208008fe31395c98b74` | 2026-09-24 | `miniprogram-reverse` | evolve | WS 帧"不是 JSON"⇒ 先猜 **MessagePack**（`msgpack.loads/dumps`）；**收帧要先去掉 mask**；mitmproxy 实时改包；**纯操作码协议的死路判据**——客户端帧只有动作码、无业务数值 ⇒ 本地改包**改不出收益**（当场停） |
| 537 | `52pojie-2081826-某wx小游戏反编译逆向分析.md` | `ca806d202b1ddeaea2ff156967a13789` | 2026-09-24 | `miniprogram-reverse` | evolve | 小游戏跑起来的 **6 个坑**（按顺序）：`app-config.json`→`game.json`、`gamePlugins`→`plugins`、补 `cocos2d-js-min.js`、**用报错里的 md5 覆盖 `signature.json`**、`ERROR 4930` 注释 `new Error`（权宜，会丢图）、登录 `openid` 走代理替换；搜**通用动词** `encrypt` 命中统一入口 `encryptStr`；AES-CBC + `this.ddd` 作 key |
| 538 | `52pojie-1936819-浅谈逆向Unity导出的vx小游戏的思路.md` | `61ba104513c560311c95affe2cf7f883` | 2026-09-24 | `miniprogram-reverse` + `wsam-reverse` | evolve | Unity IL2CPP→小游戏→wasm 全链路：`.br` brotli、`import/main/sub.wasm` 分工、`global-metadata.dat` **不在包里**（远程下发 ⇒ 去缓存找 + `unityweb.exe`）、Il2CppDumper；**`wasm_split` 符号重算**（`j${getRedirIndex(addr) & 0xFFFFFFF}`，索引函数在 `import.wasm`）——不重算**永远搜不到函数**；魔改 `ghidra_wasm.py`（`FuntionName` 当符号 + `getPlateComment` 幂等）；Ghidra 搜 `类名$$方法`；**WAT 补丁持久化（来源自述未测 + 可能有 md5 校验）⇒ 登记为未证** |
| 539 | `52pojie-901994-[教程]微信小程序【消灭病毒】相关修改算法说明.md` | `76713178d2653a243d307c16c257ed78` | 2026-09-24 | `miniprogram-reverse` | evolve | sign 族一：**参数名升序** `k=v&` 拼接去尾 `&` 后 MD5；**`wx_secret` 参与签名**（前端内置密钥，最易漏）；同站**两处签名**（`/api/archive/get` 与 `/api/archive/upload`）**键集合不同** ⇒ 必须按接口分别还原；`record` 自带**内层** `sign` 字段（改 `record` 时不要动它、外层要重算） |
| 540 | `52pojie-965556-××电影小程序check算法分析.md` | `38abfcb34b3c7d88f52e8b846cec2ce9` | 2026-09-24 | `miniprogram-reverse` | evolve | sign 族二：`check = MD5(sCode+cCode+key+ts+**完整请求 URL**)`；**`_mi_` 不参与**（由"算出的 check 与调试值逐字符相同"反证）；**弯道超车法**——导入微信开发者工具（测试号、删 `app.json` 报错项、勾"不校验 https"）后**整文件全行断点**，看"即将被 MD5 的那个变量"；**输出纯小写字母数字、无 `==` ⇒ 是 hex 不是 base64**；AES-ECB+Pkcs7，key = `clientKey.substr(0,16)`（**密钥二次复用**）；安卓 7.0+ 自签 CA 不被信任 ⇒ `ssl handshake error` |
| 541 | `52pojie-1775370-某商场微信小程序有效token构造问题.md` | `68b0506239af79027dc15104e44b7d40` | 2026-09-24 | `miniprogram-reverse` | evolve | **未证字段的登记范式**：token 结构与 `sign` 公式已确知（含固定盐 `bbd2b25e…`、`tenantId=13474`、`cid=…`、`v=20211030`），但 `t` **未解** ⇒ 登记为"未证"并写清**已排除的候选**（空值/1/0/20211030）与**下一步实验**（对 `app-service.js` 第 20733 行 `globalData` 定义处下断点）；定位手段 = **行号 + `globalData` 这类结构性关键字**（不要只搜被压成单字符的变量名） |
| 542 | `52pojie-2058459-闲来无事抓包修改VX小程序《欢乐麻将》里的“谁是菜王”游戏数据.md` | `fdf5b1cde54a5a1060d8490c4c1066fa` | 2026-09-24 | `miniprogram-reverse` | evolve | **响应体改写的三步边界判据**：改完立刻生效且无服务端写操作 ⇒ 纯显示层；**做一次服务端写操作后被覆盖**（原文"买完豪车又会重置成真实余额"）⇒ 服务端权威，要把每个回写状态的响应都改；客户端帧只有动作码 ⇒ 客户端无解。这条把"小游戏改数值"从一句话结论变成可判定的三步 |
| 543 | `52pojie-814217-JSC文件反编译及游戏小改.md` | `9072d55d02ee0e06e0af9addee4f10d1` | 2026-09-24 | `desktop-client-reverse` | evolve | `.jsc` **第三形态 Mozjs（SpiderMonkey 34）字节码**（Cocos 游戏里 xxtea 解不出东西 ⇒ 改判）；`jsc-decompile-mozjs-34`（PHP）+ **版本必须对齐**；**就地改字节码的指令表**（`3B..`取变量 / `D7`压 int8 / `58 10 10` int16 / `D8` int32 / `12`–`17` 比较族 / `44` 条件跳转 / `6E 00 00 00 CA 42\|43` 布尔 / `51` 弹栈）；`GAME_INFO_CHANNEL == 100` 的完整字节码对照；`43`→`42` 关掉 `IS_USE_HTTP_ENCRYPT` 的实例；**单源 + 来源未给样本 ⇒ 只作格式参考** |

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-malware-forensics` | evolve | 新增 `references/server-host-backdoor.md`（服务端宿主层唯一权威源）、`references/phishing-kit-and-funnel.md`（钓鱼 kit 与漏斗唯一权威源）；`payload-and-obfuscation.md` 三联表 +3（双 base64 / `authcode` / `kit-hash`）与 §3.4；`injection-and-hijack-triage.md` 补 L1 之后的第二层分流指针；`SKILL.md` 分流判据 +6 / 工作流插入 🔴 CHECKPOINT（L1 之后先问"文件被改还是进程被劫持"）/ 失败模式 +10 / 反例 +7 / 命令入口 +2 组 / 资源 +2；`scripts/payload_unpack.py` 新增 `b64 --layers/--auto`、`authcode`、`kit-hash`（自检 **102 → 154 项**）；`scripts/ioc_extract.py` 新增"服务端""工具包"两类与 nginx Lua / 双 base64 / `disable-devtool` 特征（自检 **56 → 86 项**）；description **1008 → 990**（压缩同义堆叠，净增触发词） |
| `miniprogram-reverse` | evolve | 新增 `references/minigame-and-unity-wasm.md`（小游戏入口层唯一权威源：栈分流 / 跑起来的 6 个坑 / Unity→wasm 全链路 / WS+MessagePack / sign 两族 / 弯道超车法 / 未证字段范式 / 响应体改写边界 / 排错 12 / 反例 11）；`SKILL.md` 分流判据 +4（含把"小游戏改数值"那条**降级为有前提**）/ 工作流补例外 / 失败模式 +4 / 反例 +6 / 命令入口 +1 组 / 资源 +1 / 边界 +2；description **993 → 991**（压缩 + 净增 `game.json`/`wasmcode`/`wasm_split`/`MessagePack` 触发词） |
| `wsam-reverse` | evolve | `references/wasm-toolchain-and-decompilation.md` 新增 **§11 拆分产物（`wasm_split`）**：三模块分工 / **符号名重算判据**（`j${getRedirIndex(addr) & 0xFFFFFFF}`，`& 0xFFFFFFF` 是索引掩码）/ 排查顺序（先认短名 → 找索引函数 → 重算，**不要拿 dump 的地址去搜**）/ 启发式符号恢复的四个要点 / WAT 级补丁（**标注未证**）；`SKILL.md`「动手前先做三件事」→ **四件事**（第 4 件就是"函数名是不是一串 `j<数字>`"）；description **679 → 844**（净增 `wasm_split` / `.unityweb` / `wasmcode` / IL2CPP / brotli 触发词） |
| `desktop-client-reverse` | evolve | `references/jsc-and-v8-bytecode.md`：标题与 §1 分类表由**两类改三类**，新增 **§10 Mozjs / SpiderMonkey 字节码**（判定动作 / `jsc-decompile-mozjs-34` / 就地改字节码指令表 / 完整对照 / 补丁实例 / **单源边界 5 条 + 反例 4 条**）；`references/electron-asar-and-fuses.md` 新增 **§5.2.1**（激活类请求是一对端点、字段形状按端点分别给、注入别碰业务状态文件、回滚与锁依赖），坑表 12 → **14 条**；`SKILL.md` 导航 +1 行判据 / 资源补 §10；description **943 → 984**（压缩 4 处 + 净增 Mozjs 触发词） |

### 验收（全部实跑）

| 项 | 结果 |
| --- | --- |
| `payload_unpack.py --selftest` | **154/154** |
| `ioc_extract.py --selftest` | **86/86** |
| 既有脚本回归（`wxapkg_tool` / `const_bruteforce` / `asar_offset_repair` / `jsc_xxtea_tool` / `byte_flag_patch` / 其它） | 全绿 |
| 保真度（**双向**）`b27-verify-sources.py` | 表 A（源→断言）**176** 条 + 表 B（落点→断言）**100** 条 = **276 条，未命中 0** |
| 故障注入 `b27-fault-injection.py` | **19/19 按要求变红**（含"只改 `.agents` 不改 `.claude` ⇒ 镜像不一致必须被抓"） |
| 双源字段级守卫 `b27-audit-attribution.py` | **0 阻断**（E1 无悬空断言 / E2 无死源）；**故障注入 2/2 变红**、还原后回绿 |
| description 规则阳性验证 `b27-verify-desc-len-rule.py` | **3/3**（1001 必报 / 恰好 1000 不报 / 还原后 0 阻断） |
| `browsercli` 技能契约校验（**真实 JS 引擎**，`evaluate_script`） | **13/13 PASS**（`b27-skill-js-contract-check.js`：restore.js 片段语法、`& 0xFFFFFFF` 掩码语义、§10.3 字节码解码、比较族/布尔族常量、§5.1 升序拼接、§5.2 check 拼接顺序）｜**当场抓出 1 处真缺陷**：原稿把 32 位操作数写成「小端」，与源文 `3B 00 00 00 11` = 下标 `0x11` 矛盾（小端会读成 `0x11000000`）⇒ 已改为「**高位在前**」并加 4 条断言钉住 |
| 机械校验 `check_skill_integrity.js` | **0 阻断 · 0 告警** |
| 双镜像 `.agents` ↔ `.claude` | **0 mismatch**（逐字节一致） |
| 全库 description 长度 | **21/21 ≤ 1000**（本批三处超限全部结项：`web-malware-forensics` 1008、`miniprogram-reverse` 993→991 净增触发词、`desktop-client-reverse` 943→984） |
| 台账 | 编号连续 / md5 逐条一致 / 幂等复跑（打印「已登记，跳过」） |
| 冻结 → 终态 | `b27-freeze-20260924-0951.tsv` 为基线，终态用 `b27-freeze.py --compare` 算出被改文件（评审生效证据） |

### 独立评审（B27）

**方式**：派 **2 名独立盲评审员**（约束：**只读、不许改文件**、不许采信文档自述、能跑就跑一遍），
维度分工 —— Judge A（**事实保真度**）与 Judge B（**集成与一致性**）；
要求每条结论带证据（文件 + 行号，或命令 + 实跑输出）。

**结论**：

| 评审员 | 总判 | 条数 | 处置 |
| --- | --- | --- | --- |
| Judge A（保真度） | **`needs-fix`** | 2 条（1 次要 + 1 低） | **两条均回源复核成立，当轮全部修完**（并据同类问题扩大排查，另发现 2 处，一并修完） |
| Judge B（集成） | **未在预算内返回完整结论** | — | **如实记录，本轮不计作通过**；其职责范围内的机械面已由 `check_skill_integrity`（0 阻断）与镜像比对（0 mismatch）覆盖 |

**Judge A 的 2 条（原文要点 + 我的复核）**：

| # | 严重度 | 缺陷 | 评审给的证据 | 我的复核（实跑） | 处置 |
| --- | --- | --- | --- | --- | --- |
| 1 | 次要 | `phishing-kit-and-funnel.md` §8 把「rsync 实时数据迁移（873）」整行标成 `1251567` / `1252548` 双源 | 评审指出 `1252548` 全文无 rsync / 873 / 同步 | `grep -nE "rsync\|873\|同步" 52pojie-1252548*.md` → **无输出**；`1251567` 第 **53 / 182** 行有 ⇒ **成立** | 收窄为 `1251567` 单源，并在行内写明「`1252548` 全文没有该字样」 |
| 2 | 低 | `BxkeFB8H` 这一常量**不在本批 18 篇源里**（实出自 `52pojie-1381839`，属 **B25** 批次），但 `SKILL.md` 与 `payload-and-obfuscation.md` 都没写出来源 | 评审指出该常量查不到本批来源 | `grep -rl "BxkeFB8H" docs/references/` → 只命中 `52pojie-1381839-某网页js挖矿木马的简单分析.md` ⇒ **成立** | `payload-and-obfuscation.md` 加「来源标注」引用块；`SKILL.md` 命令入口与资源小节各补一次出处 |

**据此扩大排查（同一类"整行贴多源"）—— 又发现 2 处，一并修完**：

| # | 位置 | 问题 | 实跑证据 | 处置 |
| --- | --- | --- | --- | --- |
| 3 | `phishing-kit-and-funnel.md` §8「概率 / UA 分流」 | 整行贴 `2115802` / `784562` | `784562` 对 `概率\|UA\|分流` **0 命中**；`2115802` 有 `pc_ratio`/`android_ratio`/`iphone_ratio`；`2100101` 有 `Math.random()` 分支 | 改为 `2115802`（`pc_ratio` 等三分支）/ `2100101`（`Math.random()` 分支），**并就字段级就近标注** |
| 4 | `phishing-kit-and-funnel.md` §2 指纹表「后台目录」 | 把 `/install/` 与 `/wocaonima/` 合在一行共挂 `1251567` / `1252548` | `grep -ci '/install/'` → `1251567`=**2**、`1252548`=**0**（`/wocaonima/` 两篇都有，故该行只对了一半） | **拆成两行**：`/wocaonima/` 保留双源；`/install/` 单列到 `1251567` |

> 🔴 **本批最有价值的一条工程化处置**：把评审的这条意见**做成了可复跑的机械守卫**
> `artifacts/skill-evolution/tools/b27-audit-attribution.py`（三条规则）：
> **E1 悬空断言**（行内字段在被列出的所有源里都找不到）、**E2 死源**（某篇源一个字段都支撑不了 ⇒ 出处被高估）、
> **W1 多源行未做字段级拆分或就近标注**。
> 并对它做了**故障注入**（2/2 变红、还原后回到绿）—— 否则"新增的守卫"很可能只是恒绿噪声。
> ⚠️ 该守卫**只认表格行**：第一版按整行扫，把「曾误挂 `784562`」这类**正文脚注**误判成死源（实测踩到后修正）。

**评审如实声明的"未验证范围"**：Judge A 未在结论里给出完整的"未覆盖范围"声明
（本轮只回了 2 条结论与证据）；**因此本批的保真度结论主要由可复跑门禁承担**：
`b27-verify-sources.py` 双向 **280 条 0 未命中** + 故障注入 **19/19** + 双源守卫 **E1/E2 0 阻断**。

**评审生效证据（冻结 → 终态）**：评审前冻结 `b27-freeze-20260924-0951.tsv`（34 个文件），
终态用 `b27-freeze.py --compare` 算出**被改动文件清单**（含评审修复与 browsercli 带出的端序修正）。
**Judge B（集成与一致性）→ `needs-fix`**：报 7 条（2 阻断 + 4 次要/低 + 1 信息）。
逐条回源复核后：**2 条成立并当轮修完**、**1 条部分成立（根因已消除）**、**3 条不成立（附实证）**、1 条为信息。

| # | 严重度 | Judge B 的缺陷 | 我的复核判定 | 处置 |
| --- | --- | --- | --- | --- |
| B1 | 阻断 | 校验器阻断数在 **0 / 5 / 7 / 9** 之间抖动；怀疑 `process.exit()` 截断 stdout | **部分成立**。抖动根因**不是**校验逻辑：是**自检夹具把临时文件写进了技能目录**（`__file__` 旁边），被打断即残留 ⇒ 镜像检查把"多出的临时文件"报成阻断；`process.exit()` 的截断风险也确实存在 | ① **根因修复**：`corpus-homogeneity-audit.py` 两处夹具改 `tempfile.mkdtemp()` + `shutil.rmtree()`，复跑后技能目录 **0 残留**；② `process.exit()` → **`process.exitCode`** |
| B2 | 阻断 | 三类"虚假阻断"：镜像内容不一致 / 镜像缺失 / 「裸跨技能路径」误报 | **不成立**（前两类是**评审窗口内的真实中间态**：我先改 `.agents`、`mirror-sync` 在评审之后）。第三类**经实证不成立**：直接 `node` 测 `REF_BARE_CROSS_RE` —— `` `desktop-client-reverse/references/x.md` `` **命中**，而 `` `../../desktop-client-reverse/references/x.md` `` 与 `` `../desktop-client-reverse/references/x.md` `` **均不命中**（正则要求反引号后紧跟 `[A-Za-z0-9_-]+/`）⇒ 不会把带 `../` 的合法引用误报 | 正则**不改**；「评审会看到中间态」记入本批可复用要点 |
| B3 | 次要 | **同一份知识写两处**：`getRedirIndex` 代码块在 `wsam` §11.2 与 `minigame` §3.3 **逐字重复** | **成立**（正是 B20 记下的反模式） | `minigame` 侧改为「**一行核心 + 指针**」，完整代码块与推导只在 `wsam` §11.2 保留 |
| B4 | 次要 | 校验器**不检查 description 长度**（本批三处超限全靠人肉量） | **成立** | 已补规则，并做**阳性验证 3/3**（1001 必报 / **恰好 1000 不报** / 还原后全库 0 阻断）—— 见 `b27-verify-desc-len-rule.py` |
| B5 | 低 | `web-malware-forensics/SKILL.md` 里大量**裸 `x.md`** 引用不被校验器覆盖，风格与其它技能不一致 | **成立但决定不改**：全库实测 **7 个技能**用这种裸名，其中大量指向**工作目录产物**（`todo.md` / `evidence.md` / `AGENTS.md` / `case-*.md` / `*.funcs.md`），加规则会产生**成片假阳性**（B21 教训：别把约定当 bug） | 登记为「**有意的技能本地约定**」，不建规则；实测数字写进校验器注释 |
| B6 | 低 | 既有脚本内 `references/...` 引用"断链"（说从 `scripts/` 解析失败） | **不成立**：校验器口径是「`references/...` **相对 skill 根**解析」（`base = skillDir`），而脚本在 `scripts/` 下 ⇒ `references/x.md` 与 `../references/x.md` **解析到同一个文件**，两种写法都通过 | **回滚**我一度按该意见做的 `../references/` 改动，避免制造与全库不一致的写法 |
| B7 | 信息 | `check_skill_integrity.js` 在其环境里 rc=0 | 与终态一致 | 无需处置 |

> 🔴 **B4 的补丁自己先踩了一次坑（值得记档）**：给校验器加规则的补丁脚本用了**无计数** `str.replace`，
> 被执行两遍 ⇒ 检查块**插了两遍** ⇒ JS 报 `Identifier 'dm' has already been declared`。
> **抓住它的正是"阳性验证"**：若只看 `rc=1` 就以为"新规则生效了"，实际是**整个校验器根本没跑起来**。
> ⇒ 结论：**"扩检查面"的阳性验证同时验证了"校验器自身可运行"**；且**给仓库文件打补丁的脚本一律要 `assert count==1`**。

> ⚠️ **B1 的另一个启示（与 B25 同型）**：**自检/夹具不得把产物写进被校验的目录**。
> 本轮它让"镜像一致性"这个本该最可靠的断言变成了**噪声源**。

### 附带修复（本批实跑带出，均已修复并留证）

| # | 文件 / 位置 | 问题（怎么发现的） | 处置 |
| --- | --- | --- | --- |
| 1 | `desktop-client-reverse/references/jsc-and-v8-bytecode.md` §10.3 | 原稿把 32 位操作数写成「**小端**」，与源文 `3B 00 00 00 11` = 下标 `0x11` 矛盾（小端会读成 `0x11000000`）。**由 `browsercli` 真实 JS 引擎实跑当场 FAIL 发现** | 改为「**高位在前**」+ 明写错误读法 + §10.5 增坑 1b + 4 条断言钉住 |
| 2 | `web-verify-patcher/scripts/inspect_assets.py` | `import imghdr` —— 该模块 **Python 3.13 已移除** ⇒ 脚本直接 `ModuleNotFoundError`，`verify_recipe_eval.py --selftest` 连带失败 | 改为零依赖 magic 嗅探 `_img_type_by_magic()`；配 **9/9** 阳性/阴性对照（`b27-verify-img-sniff.py`：6 种图片格式 + JS 载荷 + 空文件 + 不存在路径） |
| 3 | `forum-corpus-archival/scripts/corpus-homogeneity-audit.py` | 自检夹具写在**技能目录内**（`__file__` 旁边）⇒ 一旦被打断就留垃圾（本轮被并行评审的实际中断撞上），`check_skill_integrity.js` 立刻误报「镜像缺失」 | 两处夹具改到 `tempfile.mkdtemp()` + `shutil.rmtree()` 兜底；复跑后技能目录 **0 残留** |
| 4 | 跨技能相对路径 6 处（`miniprogram-reverse` ↔ `wsam-reverse` ↔ `desktop-client-reverse`） | `../` 少退一级 / 写成「裸跨技能路径」⇒ `check_skill_integrity.js` **一次抓出 7 个阻断项**（与 B23 同类） | 全部改为 `../../<skill>/references/x.md`（SKILL.md 在技能根 ⇒ `../`）；复跑 **0 阻断** |
| 5 | 三处技能 `description` 超限 | `web-malware-forensics` **1008**、`miniprogram-reverse` 待增词、`desktop-client-reverse` 待增词 | 压缩同义堆叠后：**990 / 991 / 984**（三处均**净增**触发词，删词前逐词 grep 确认仍活在正文里）；全库 21/21 ≤ 1000 |

> ⚠️ 第 3 项的性质值得记档：它**不是技能内容错**，而是「**工具把自己的中间态留在了被校验的目录里**」——
> 表现成"镜像不一致"这种"看起来像真缺陷"的阻断项。这与 B20「校验器自身成为自己的检查对象」同型。


### 下一批（B28）取材建议

- 待处理 **457** 篇（台账 525 → 543 条；本批登记 18 条）。
- 优先级：
  ① **网马时代线**：池里还剩 `32826`/`41909` 之外的 `shellcode` 变体与 `31115` 同族（PDF/SWF 更深利用侧）
     ⇒ **一律 evolve `web-malware-forensics`，只有出现"新壳型"才动脚本**；
  ② **小游戏线继续收**：本批只吃到 Cocos 与 Unity 两条；语料里还有 `JSC 反编译`（`814217` 的同类）、
     小游戏协议与存档侧 ⇒ 落 `miniprogram-reverse/references/minigame-and-unity-wasm.md`（同类只 evolve）；
  ③ **验证码簇只取"新题型或带完整纯算交付"**（B26 已论证单站协议链不再逐篇收）；
  ④ **站前挑战厂商带**按 B24 的 6 处同改清单扩容（优先带可独立复算的 oracle）；
  ⑤ **无感/行为验证**剩余并入 `behavior-verify-and-sign-headers.md`。
- **B27 遗留**：
  1. `52pojie-1775370` 的 `t` **未解**（已按范式登记"未证 + 已排除候选 + 下一步实验"），**不要**在后续批次里补一个猜测值；
  2. `52pojie-1936819` 的 WAT 补丁持久化 + md5 校验**来源未测**，文档已带两处限定；
  3. `52pojie-814217` 的 Mozjs 指令表**单源且来源未给样本** ⇒ §10.5 已列 5 条边界；
  4. `miniprogram-reverse` 排错表的 `RadiumWMPF` 版本绑定条目仍待回源复核（B25 记，连续三轮未碰该行）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B27 **二十一次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

## 批次 B28 · 2026-09-24（第二十八次执行）

**开局状态**：台账 B27 后 **543** 条 / 目录 `.md` **1040**（文章 **1035**）/ 待处理 **492**。
三方对齐（台账最后一节 = B27 × `git log` = `00a3af4`(B27) × 自动化记忆最后一条 = B27）**一致** ⇒
上一轮已闭环；工作区里的 `AGENTS.md` 与 `project/*` 是别会话在途改动，未纳入本批。

**取材口径**：本批的新供给是归档线第 28 轮（`bac0ad6`）新开的 **T8 网盘/文件站 + T9 扩展/油猴/Electron** 两条通道，
外加 09:13 那批未被上一轮扫描到的 21 篇。**先做了一次证伪**（B26 教训：上一批的「优先级」不能当指令照做）：
B27 列的「网马时代线继续 evolve」与「小游戏线继续收」在新增 56 篇里 **0 命中**，因此本批改取**新供给线**，
并按「同一主题 ≥2 篇且能聚成一个能力块」聚簇：

- **簇 A · 网盘/文件站直链族（12 篇）**：蓝奏云全代际 9（`713762` G2018 / `988145` G2019 / `1668489` G2022 /
  `1701084` 文件夹 / `1703600` 时效 / `1865269` 抓包 / `1901884` G2024 / `1904710` 含提取码 / `1908049` 优享版 /
  `2078178` G2025）+ 阿里云盘签名 1（`1745677`）+ 助手类脚本判型 1（`1828098`）。
  **选它的理由**：`grep 网盘|蓝奏|直链` 全库只命中归档类技能与 `stream-drm-reverse` 的媒体直链 ——
  **没有任何技能覆盖「文件托管站分享链接 → 可用直链」**（动词是「解析」，不是「解密/还原/取证」）。
- **簇 B · 打包型前端的另外三种壳（7 篇）**：浏览器扩展 2（`1215596` / `1225639`）+
  油猴运行时改写 2（`1669080` 注册表替换 / `1830072` Vuex 状态树）+ 扩展劫持 1（`1707613`）+
  nw.js 1（`1679769`）+ Electron 埋点法 1（`1847258`）。
  **选它的理由**：`desktop-client-reverse` 只覆盖 Electron / WebView2 / JSC 三类壳，
  **扩展（CRX）与 nw.js 是零覆盖**；而 `web-reverse-hook` 的 `spa-vue` 只做「路由提取」，**没有「状态改写」**。

**产出**：**新建技能 1**（`cloud-drive-direct-link`）、**演化技能 3**（`desktop-client-reverse` /
`web-reverse-hook` / `web-malware-forensics`）、**附带修复 1**（新建技能自查时发现的两处引用写法）。

### 新建判据（可复核，三条同时成立）

1. **无最近邻能力模块**：`grep -ril "lanzou|蓝奏|直链|网盘|filemoreajax|ajaxm" .agents/skills/`
   只命中 `stream-drm-reverse`（媒体直链，产出是「解密与 TS 重封装」）与归档类技能的语料过滤词；
   `code-analysis` 的自述产出是「结构 / 风险评分契约」，与本族「分享链接 → 直链」是两套产出。
2. **单簇规模足够 + 上游专门开通道**：12 篇同族，且归档线第 28 轮**新开 T8 通道**（蓝奏/城通/奶牛/123 云盘）。
3. **目标动词不同**：本族是**解析/取值**（拿一个能直接下的 URL + 门禁与时效），
   不是「还原算法」（`web-reverse-algorithm`）、不是「补环境」（`web-js-env-patcher`）、不是「取证定性」（`web-malware-forensics`）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 544 | `52pojie-713762-【原创】蓝奏盘的真实下载地址解析思路与过程及成品源码.md` | `5b9a544300e77be39d15cc1e41aec87f` | 2026-09-24 | `cloud-drive-direct-link` | create | G2018 六字段老链（`/fn?f=&t=&k=` → `action=down_process&file_id=&t=&k=` → `{zt,dom,url}` → `dom + "/file/" + url` → 302 `Location`）；`t`/`k` 是绑定 `file_id` 的签名对；`st/e/ip/fi/up/q` 参数语义（`ip` = **出口 IP** ⇒ 直链可能绑出口）；`.com` 后直接跟 `?` 不是合法 URL ⇒ **必须补 `/file/` 段** |
| 545 | `52pojie-988145-【原创】蓝奏云解析，抱歉，抓包抓得好真的可以为所欲为。.md` | `24c6e653181fc5988d655f922ab8463b` | 2026-09-24 | `cloud-drive-direct-link` | create | G2019 相对 G2018 的**唯一增量**：POST 必须带 Cookie / UA / Referer（原文自述「几次验证都过不去，后来发现是倒在这里」）；站方同时开始上验证码 |
| 546 | `52pojie-1668489-最新可用蓝奏云质量解析源码-PHP.md` | `40e61c00e83c2b7170850ccefbf17206` | 2026-09-24 | `cloud-drive-direct-link` | create | G2022 双链：**有码**走 `function down_p(){` + `var skdklds` + `p=<提取码>`（一跳）；**无码**走 `iframe` + `sign = '…'` + `action=downprocess&signs=?ctdf&sign=`（两跳）；判有码的三条独立判据（`<title>文件</title>` / 大量 `<style>` / 函数存在性）；最终直链必须带 `Referer` 与 `Cookie: down_ip=1` |
| 547 | `52pojie-1701084-蓝奏云分享文件夹解析-PHP.md` | `9b60cfd983bd025f84e2ea58a997168a` | 2026-09-24 | `cloud-drive-direct-link` | create | 文件夹分页 `filemoreajax.php` 七字段（`lx=2`/`fid`/`uid`/`pg`/`rep=0`/`t`/`k`/`up=1`/`ls=1`/`pwd`）；**`t`/`k` 是「变量名 → 值」两跳**（页面先出现变量名再出现赋值）；**翻页必须与取 T/K 同批**（直接请求 `pg=2` 会重新生成 T/K 且没访问第一页 ⇒ 取不到数据）；一页 50 条 |
| 548 | `52pojie-1703600-LanZouDown蓝奏云文件夹解析软件库后端+APP.md` | `4e0aa3521504bae3126faf578056ebc4` | 2026-09-24 | `cloud-drive-direct-link` | create | T/K 的**时效来源**：`T` 是时间戳、网页缓存约 **3 分钟**后失效 ⇒ 生产做法是「定时任务每 2 分钟刷新」或**每次现取**；这条决定「直链不落库、只在要下的时候现算」的设计 |
| 549 | `52pojie-1865269-蓝奏云直链抓包教程（手慢无）.md` | `841e3edbc19722a77b689ff64eb62937` | 2026-09-24 | `cloud-drive-direct-link` | create | 抓包视角的三会话链（分享页 → `fn?` → `ajaxm.php`）与「**直链失效时间很短**」；再次独立证实 `Referer` 必带（「有次没带所以就没获取到数据」）；把 `\` 删掉、`.com` 后必须加 `/file/` |
| 550 | `52pojie-1901884-取蓝奏云直链教程（附python源码）.md` | `ee78b87e945ee541f2e634ab06485c99` | 2026-09-24 | `cloud-drive-direct-link` | create | G2024 无码链五字段（`action=downprocess` / `signs=?ctdf` / `sign` / `websign` / `websignkey=bL27` / `ves=1`）；`iframe class="ifr2"` 抽取正则与 **`matches[1]` 索引口径**；最终地址需 `Referer` + `Cookie: down_ip=1` 且 `allow_redirects=False` 读 `Location`（否则 400） |
| 551 | `52pojie-1904710-取蓝奏云直链教程2（含密码）（附python源码）.md` | `5861d606a19dbf3e40d339b2fff0d1fa` | 2026-09-24 | `cloud-drive-direct-link` | create | 有码链（一跳）：`var skdklds` + `url : '/ajaxm.php?file=<id>'` + `p=<提取码>`；**有码/无码的三条区分法**；提取码传 str/int 皆可 |
| 552 | `52pojie-1908049-蓝奏云优享版js代码扣取.encryptHex.md` | `a3bda6663b9fa169fe80ef0669946939` | 2026-09-24 | `cloud-drive-direct-link` | create | 优享版 `ilanzou` 不走 `ajaxm.php`：把参数加密后拼进 URL 再 302。`downloadId = encryptHex(fileId\|userId)`、`auth = encryptHex(fileId\|timestamp)`、`×tamp = encryptHex(ts)`（同一明文拼法出现三次）、`devType`、`uuid` 取 `localStorage`；`encryptHex` 在 webpack 模块 `n(6686)` 里 ⇒ 按 webpack 抠模块而不是正则硬抠 |
| 553 | `52pojie-2078178-Python蓝奏云直链解析.md` | `4af4502af893db29e192652849613a5c` | 2026-09-24 | `cloud-drive-direct-link` | create | G2025 代际：站点前置 **Cloudflare JS 挑战**（`acw_sc__v2` / `_0x4818` / `arg1` / `posList`）⇒ 本技能只负责「判出来并转交 `web-js-env-patcher`」，不重造挑战求解 |
| 554 | `52pojie-1745677-阿里云盘签名算法探究及可用 PoC.md` | `2b63d13f5086b76d750bf9173c036c01` | 2026-09-24 | `cloud-drive-direct-link` | create | 签名型网盘：`x-device-id`（UUID，种子取 userId）+ `x-signature`。**判型关键**：能从私钥单独推出公钥 ⇒ 不是 RSA；断在 `getPublicKey` 看到**乘法**而不是模幂、且 `e` 从不是 65537 ⇒ 是 **ECDSA secp256k1**；签名体 `appId:deviceId:userId:nonce` → SHA-256 → 签名 → 末尾拼 `01`；公钥 `04\|\|x\|\|y` 需上报 `get_public_key`；**签名不可复用、必须原样透传**；nonce 初始 0 超时 +1；「列目录顺带返回下载链接」是**旁路（实现漏洞）不是契约**。本批已把源文给出的真实私钥 → 未压缩公钥做成**纯标准库 oracle**（逐字符命中） |
| 555 | `52pojie-1828098-某【网盘直链下载助手】验证码获取思路.md` | `2d2e1696c13085ea132da48bc19d977a` | 2026-09-24 | `cloud-drive-direct-link` | create | 助手类脚本的**判型只有一条**：点击后**有没有产生网络请求**。没有 ⇒ 本地校验（前端表演）：`if (pan.num === $('#init').val())` 改成 `if (true)` 即过；配置全在脚本内（`pan.num` / `pan.img` / `pan.init[]`），服务端从未参与 |
| 556 | `52pojie-1215596-【Chrome插件】Chrome插件修改教程（一款GitHub的插件为例，附样品）.md` | `86719ee90007f100572dd60a33d830b9` | 2026-09-24 | `desktop-client-reverse` | evolve | 浏览器扩展=**第四类壳**：`chrome://extensions/` 看 ID → `chrome://version` 拿个人资料路径 → `Extensions/<ID>/<版本号>/`；Chrome 74+ 禁止离线安装未认证插件（须开发者模式）；**定位四步：界面文案 → 语言文件 → 变量名 → 逻辑文件**（`remained` → `content.js`）；状态枚举 `SUBSCRIPTION_OK/EXPIRED/TRIAL_EXPIRED` + `_verifySubscription` + `_decodeTokenPayload` 的三种改法；三个调试面（popup / content script / service worker）与「异常前下断点」；**私钥即插件身份**（不同插件同私钥会互相覆盖）、解压版不带 `key` 重打包会新旧共存 |
| 557 | `52pojie-1225639-[交作业]记一次简单的chrome插件破解.md` | `c4d25fc179469f1dc5bace9450f966ad` | 2026-09-24 | `desktop-client-reverse` | evolve | 许可证校验函数的形态 `verifyAndSaveLicens()`：「第一个 `if` = 验证通过、其余 `if` = 试用/过期」⇒ 把第一个 `if` 的**内容搬到 `if` 之外**、其余分支注释掉；命中面 `background.js`/`options.js`/`prefs.js`；收尾改 `manifest.json` 的更新链接与版本号 |
| 558 | `52pojie-1669080-[油猴脚本开发指南]实战videojs极限注入.md` | `4f3562fb3e10dc6541f09889feae5278` | 2026-09-24 | `desktop-client-reverse` | evolve | **全局注册表替换范式**：`Component.getComponent(name)` 只认 `Component.components_[name]`；守卫判据是「`name === 'Player' && Player && Player.players` 且所有实例非空才禁止替换」⇒ **注入必须早于实例化**；三步替换 `Object.create(Origin.prototype)` + `registerComponent`；**本批实跑带出并修复**：直接 `Object.create` 会**静默丢弃**你自己写在 `prototype` 上的成员 ⇒ 工具改为「先搬运 own 成员再挂原型链」 |
| 559 | `52pojie-1830072-【油猴开发指南】实战破解Vue百度文库复制.md` | `e2b65a1e52caa837b2210d873da97f6c` | 2026-09-24 | `desktop-client-reverse` | evolve | **Vuex 状态树改写范式**：事件监听器 → Vue 分发 `n.fns` → render 模板 → 具名方法（`clickCopy`）→ `mapMutations` 包装 → `_mutations[type]` → 用户分发函数；读取侧 `mapState("visitUserInfo", ["isTaskUser","taskStatus"])` / `mapGetters("readerPlugin",["canCopy"])` 就是「本组件关心哪些字段」的清单；`watch: isCopyActivated` + `fetchCopyTimes` 才是跳付费页的真凶；最终写值 `document.querySelector('.header-wrapper').__vue__.$store.state.vipInfo.isVip = true`。**本批把它做成 `spa-state` 预设（带访问器「挡回写」）**——手敲一次会在重挂载后失效 |
| 560 | `52pojie-1707613-从吾爱破解弹广告到浏览器插件网页挟持行为分析.md` | `f8d14fc1e3e222224166e5adf792e54a` | 2026-09-24 | `web-malware-forensics` | evolve | 扩展劫持的完整链路：`manifest.json` 前置 js → 全局搜 `getonlinecode` **只命中一次**（`backg.img`）→ 后台页 XHR 断点 → `openDoor` **OpenSSL 加盐 AES**（口令 `softwarecenter`，密钥仅 14 字符是**误解**）→ `eval` 在线下发 JS → `createTxtJson` 反序列化策略表（`\n` 分行 + `\|\|` 分隔，type ∈ `list/rule/insertjs/special/biglist`，实测 44/12/2/4）→ `biglist` 按 version 枚举 `all1.json…allN.json` 取回 16 长度字符串（**域名 MD5**）→ `listorrule` 改写链接（`item.jd.com/10057674219694.html` → `http://a.anhg33.com/t2.php?<原URL>`）/ `special` 加返利参数；处置判据：目录里同时有 `image` 与 `backg*` 文件 |
| 561 | `52pojie-1679769-一款nw.js打包的steam游戏逆向.md` | `5a754295cfb755726ffe58767ccd64b0` | 2026-09-24 | `desktop-client-reverse` | evolve | nw.js + `nwjc`：`is_nwjc` 全局标记 + 加载 `mrd.min.bin` + 定时判断加载完成；**`nwjc` 是编译不是加密**；最快路线是「把加载二进制的代码换成源码」；换回后闪退 ⇒ **拦路虎是 MD5 摘要文件校验**（「MD5 不是加密」），改判断 `false` 且**必须恢复「加载完成」检测**；资源用 `decryptImg`（MD5 摘要 + XOR + 截取）⇒ **能跑就不要逆**：找调用点改输出目录跑一遍批量导出 |
| 562 | `52pojie-1847258-Electron编写的exe 逆向思路.md` | `f5e6549f4bc323fe1c0814bcd790878b` | 2026-09-24 | `desktop-client-reverse` | evolve | Electron **`console.log` 顺序埋点法**：压缩代码 + 格式化后无法重打包时，插 `console.log("1")…` 再重打包替换，用 **Debugtron** 强制打开调试看输出（顺序法优于二分法：每次只改一处、永远可回退）；**扣出来结果不对 ⇒ 先怀疑「还有一层编码/还有一次调用」，不要先怀疑扣错**（本例还执行了一次 base64） |


### 验收（B28，全部实跑）

| 门禁 | 结果 |
| --- | --- |
| `cloud-drive-direct-link/scripts/lanzou_parse.py --selftest` | **96/96** |
| `cloud-drive-direct-link/scripts/aliyun_ecc_sign.py --selftest` | **52/52** |
| `web-malware-forensics/scripts/salted_aes.py --selftest` | **51/51** |
| `web-reverse-hook` 新预设 `spa-state`（Node 真实引擎实跑） | **48/48**（`b28-check-hook-runtime.js`） |
| `browsercli` 真实浏览器（Chrome 153 + 真实 DOM）契约校验 | **37/37**（`b28-browsercli-contract.js`） |
| 既有脚本回归（`payload_unpack` / `ioc_extract` / `asar_offset_repair` / `jsc_xxtea_tool` / `byte_flag_patch` / `find-lost` / `restore_slices` / `m3u8_rewrite` …） | **全绿**（由 `check_skill_integrity.js` 统一跑 `--selftest`） |
| 双向来源保真度（表 A 源→断言 **131** + 表 B 落点→断言 **266**） | **397 条 0 未命中**（`b28-verify-sources.py`） |
| 故障注入 | **14/14**（12 项注入 + 2 项阴性对照；`b28-fault-injection.py`，临时目录 **0 残留**） |
| 机械校验 `check_skill_integrity.js` | **0 阻断 0 告警** |
| 双镜像 `.agents/skills` ↔ `.claude/skills` | **0 mismatch** |
| 台账 | **562 条**（本批 #544–#562）· `verify-ledger-md5.py` **逐条一致** · 追加脚本**幂等复跑**（打印「已登记，跳过」） |
| **外部工具交叉验证（本批最强的锚点）** | ① EVP_BytesToKey 与 `openssl enc -aes-256-cbc -md md5 -S … -P` 在 **4 组独立参数**下 key/iv **逐字符一致**；② 两段 **openssl 真实产物**（带头部 / 带 `-S` 无头部）端到端解回明文**逐字节一致**；③ AES 核心过 **FIPS-197 C.3** 与 **NIST SP 800-38A F.2.5** 官方向量；④ secp256k1 公钥由 **Python 与浏览器 BigInt 两套独立实现**对同一份源文私钥互证（逐字符命中源文常量） |

**本批真机跑出的两个"测试自身的缺陷"**（值得记档）：

1. **`lockState=false` 的阴性对照一开始失败**，根因不是 hook 有问题，而是
   `findRoot()` 取的是**文档里第一个**带 `__vue__` 的元素 —— 测试没有先撤掉前一个宿主节点，
   于是第二个 hook 又去 patch 第一个 store。**同一份断言在 Node 假环境里绿、在真浏览器里红**，
   差别就在"DOM 是真的"。⇒ 真机跑不是"再确认一遍"，它测的是**另一类事实**。
2. **加盐封装的长度断言写错了**（我按"8 头 + 8 salt + 48 密文"写成 64，真机实得 **80**：
   明文 54 字节经 PKCS#7 补到 64）⇒ 与 B25「断言对、文档错」同型：**凡是"我算出来的数"，
   都必须有一处外部来源或一次实跑钉住它**。

### 三条最有价值结论（B28）

① **「打包 ≠ 加密」是第四类壳的共同误判点。** `nwjc` 是**编译**成二进制、`.crx` 是**带签名的压缩包**、
   asar 是**归档** —— 三者都不是密码学意义上的加密，"解密"这条路本身就走错了。
   本批把它写成**跨壳六条通用纪律**（改判断不改字符串 / 改赋值处不改消费处 / 绕过校验要恢复检测 /
   勤备份 / 能跑就不要逆 / 解包成功 ≠ 拿到逻辑），落 `desktop-client-reverse/references/extension-and-nwjs.md`。

② **「挡回写」是运行时状态改写的核心价值，而它必须是「默认开启且被断言覆盖」的值。**
   故障注入 10 第一版**不变红**（把 hook 里的 `lockState ?? true` 改成 `?? false` 也不红），
   根因**不是断言漏洞**，而是 harness **显式传了 `lockState`** ⇒ 默认值**无人覆盖**。
   ⇒ 判据：**改了默认值却不红 ⇒ 先问"有没有人真的在用默认值"**，而不是去改断言。
   修法是把"默认值"补成正式断言（`b28-check-hook-runtime.js` 加了 3 条）。

③ **加密实现唯一可靠的验收口径是「能不能与外部工具对上」。**
   本技能自己写不出可信的加密断言 —— 所以本批的锚点全部来自**外部**：
   KDF 对 `openssl -P`、AES 核心对 FIPS/NIST 官方向量、公钥对源文常量 + **第二套独立实现**。
   这三条都做成了 `--selftest` 里的常量，任何一次改动都会立刻打出来。

### 附带修复（本批实跑带出）

| # | 位置 | 问题（怎么发现的） | 处置 |
| --- | --- | --- | --- |
| 1 | `web-reverse-hook/scripts/hooks/spa-state-patch.js` | `replaceComponent` 直接 `factory.prototype = Object.create(Origin.prototype)` 会**静默丢弃**调用方写在 `prototype` 上的成员（原文三步法本身就有这个坑） | 改为**先搬运 own 成员再挂原型链**，并打印搬运数量；`b28-check-hook-runtime.js` 加 2 条断言钉住 |
| 2 | `b28-verify-sources.py` 表 A | `up=1` / `ls=1` 被**归错源**（写在 `1703600` 名下，实际出自 `1701084` 的抓包表） | 移到正确来源；并把该抓包表**原样补进** `lanzou-protocol-generations.md` §4（既修错又增强） |
| 3 | `b28-append-ledger.py` 竖线校验 | 注释里的字面量竖线（`||`、`fileId|userId`、`04||x||y`）会**撑破表格列数**；`!= 6` 应为 `!= 8`（7 列 ⇒ 8 个竖线） | 断言改为 8，并让工具**自动转义**注释里的裸竖线（**工具要为自己的输出负责**），故障注入验证它真的会变红 |
| 4 | `cloud-drive-direct-link` 初稿 | 两处引用写法不合约定：`signed-api-and-helper-scripts.md` 里写了**裸跨技能路径**（缺 `../../`）、多处 §指针缺 `references/` 前缀 | `check_skill_integrity.js` 的规则 2/2b **当场抓出**并修正 |

### 下一批（B29）取材建议

- 待处理 **473** 篇。
- 优先级：
  ① **T10 媒体链路族（本批主动未取）** —— 理由是它与 `stream-drm-reverse` 的既有覆盖
     （`player-and-live-capture.md` / `vendor-key-schemes.md` / `hls-and-ts-structure.md`）高度重叠，
     需要先做一次**"是否只值 evolve"的证伪**再动手（B26 教训：上一批的"优先级"不能当指令照做）。
     其中 **`52pojie-2017001` 是第 27 轮被 `BLOCK_EXTRA27` 静默误杀的真阳性**，应**单独判族**。
  ② **T8 剩余**（城通 / 奶牛 / 123 云盘 / 百度盘等**非蓝奏云族**）继续落 `cloud-drive-direct-link`
     —— **只有出现"新形态"（新的签名方式 / 新的门禁）才动脚本**，同类只补 references。
  ③ **T9 剩余**（油猴 / 扩展 / Electron 变体）继续落 `desktop-client-reverse` 与 `web-reverse-hook`。
  ④ **网马时代线 + 小游戏线**（B27 列过，但在本批新增的 56 篇里 **0 命中**）仍待语料回流。
  ⑤ **验证码簇**只取"新题型或带完整纯算交付"（B26 已论证单站协议链不再逐篇收）。
- **B28 遗留**：
  1. `52pojie-1908049` 的 `encryptHex` **算法本体未还原**（只登记"它是算法型 + 在哪 + 怎么用"）；
  2. `52pojie-1745677` 的 `01` 后缀语义（`concat(u)` / `recovered`）**源文未展开**，文档已按"未证"标注；
  3. `52pojie-1865269` 的"验证码"只登记为现象，未拿到样本；
  4. `52pojie-1707613` 的 `pan.num` 配置对象是"脚本内联"还是"远端下发"**源文未明确**，
     文档按前者写并注明；后续若拿到样本需回源复核；
  5. `52pojie-2078178` 的 `acw_sc__v2` 只做"判出并转交"，未落实现（属 `web-js-env-patcher`）；
  6. `miniprogram-reverse` 排错表的 `RadiumWMPF` 版本绑定条目仍待回源复核（B25 记，**连续五轮未碰**）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B27 **二十一次确认不新建**；B28 **未出现新的同族簇**，
  **二十二次确认不新建**（本批反而把"状态改写 / 注册表替换"归入了 `web-reverse-hook` 的既有能力面）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

## 批次 B29 · 2026-09-24（第二十九次执行）

**开局状态**：台账 B28 后 **562** 条 / 目录 `.md` **1050**（文章 **1045**）/ 待处理 **483**。
三方对齐（台账最后一节 = B28 × `git log` = `f142129`(B28) + `7694e3d`(归档线第 29 轮) ×
自动化记忆最后一条 = B28）**一致** ⇒ 上一轮已闭环；工作区里的 `AGENTS.md` 与 `project/*` 是别会话在途改动，未纳入本批。

**取材口径（先做了一次证伪）**：上一批（B28）给的三条优先级里，
① **T10 媒体链路族**（B28 主动未取，理由是"与 `stream-drm-reverse` 高度重叠，需先证伪"）与
③ **T9 扩展/油猴剩余** —— 正好是归档线第 29 轮（`7694e3d`）新收的 10 篇的主题。
本轮先逐篇 grep 既有落点做证伪：**证伪结果是"值 evolve、不值新建"**，
但其中**有三处是既有覆盖之外的硬增量**（可复算/可对拍）：
爱奇艺 `authKey`（源文自带两条对拍向量）、蜻蜓FM HMAC-MD5（完整纯算）、
咪咕 `ddCalcu`（结构可断言 + 语料实体陷阱可机器判定）。
⇒ 按 B26 的口径「写不出新能力就不取」，把批次重组成**三个可交付能力块**，
并**扩到 15 篇**（含本轮新收 10 篇 + 队列里同族 5 篇：斗鱼 2、听书网 1（第 27 轮误杀回收）、
抖音直播 1、小红书直播回放 1）。

**产出**：**新建蓝图 3**（`migu-playurl` / `douyu-live` / `qingting-fm`）、
**更新蓝图 3**（`iqiyi-cmd5x` / `tencent-ckey` / `baidu-fanyi-sign`）、
**演化技能 4**（`stream-drm-reverse` / `web-reverse-hook` / `desktop-client-reverse` / `web-reverse-algorithm`）、
**新建技能 0**。

### 为什么是「更新蓝图」而不是「新建技能」

`reverse-knowledge` 的蓝图库本来就是「**平台配方**」的唯一权威源（见 `blueprint-schema.md`），
本轮 6 篇平台向语料（爱奇艺 / 腾讯 / 咪咕 / 斗鱼 / 蜻蜓FM / 百度翻译）里，
3 篇命中已有蓝图、3 篇建立新蓝图 —— 这正是蓝图库设计的**正常增长路径**，
不需要在技能层再造一个"视频站配方"技能（那会与 `stream-drm-reverse` 的 §0 层直接打架）。

### 本批三个「机器可判」的锚点（都不靠叙述）

| 锚点 | 外部来源 | 结论 |
| --- | --- | --- |
| 爱奇艺 `authKey` | **源文自带**两条样例 URL（line 92 / 136）里 `authKey`+`tm`+`tvid` 同时出现 | 实算逐字符命中（`c45e671c…` / `f39c6550…`），**这是唯一一条"源文给出期望值"的对拍** |
| 蜻蜓FM `sign` | 源文给出完整算式（易语言）但**未给示例 URL** | 只能做结构断言 + 负对照；十六进制大小写暴露成开关（**不悄悄选一个**） |
| 咪咕 `ddCalcu` | 源文给出完整实现但**未给期望输出** | 断言**结构**（长度 = len(puData)+4、插入位 4/7/10/13、正序/逆序落位规律）+ 本批实算基线（护栏，非证据） |

### 验收（全部实跑）

- `playback_address.py --selftest` **45 项**（含 5 条拒绝路径 + 1 个负对照）；
- `b29-check-mse-hook.js` **56/56**（真引擎：四个代理点 / 字节累计 / 扩展名派生 / 交付与释放 /
  四个开关正负对照 / **默认值断言** / 幂等 / 非 MSE 降级 / **blob 地址顺序回归**）；
- **browsercli 真机 Chrome 29/29**（真 `MediaSource` + 真 `Blob` + 真 URL 解析器 +
  **跨实现 ddCalcu：JS 版与 Python 版逐字符相同**）；
- 双向来源保真度 **表 A 106 条 / 表 B 107 条，0 未命中**；
- 故障注入 **14/14 变红**（含 2 条以异常形式失败的"非静默"判定）；
- **台账登记行规则做了阳性+阴性双验证**（`b29-verify-ledger-rule.py`：伪造 7 列行必须打红、
  5 列顺带表格不得误报、还原后 md5 与备份逐字节一致）；
- 机械校验 `check_skill_integrity.js` **0 阻断 0 告警**；双镜像 **0 mismatch**；
- 台账 **577** 条 / md5 逐条一致 / 幂等复跑；三方计数口径一致（`scan-pending` = `verify-ledger-md5` = 校验器 = 577，
  待处理 **468**）；全库 description **22/22 ≤1000**（本批改了 2 个：`stream-drm-reverse` 983→975、
  `web-reverse-hook` 468→578，均净增触发词）。

### 本批三条最有价值结论

① **「源文自带对拍向量」是最便宜也最被忽视的验收资源**。`52pojie-1480475` 的代码注释里躺着一整条
   样例 URL（`authKey`、`tm`、`tvid` 三值齐全），把公式实算一遍就完成了**端到端验收**——
   而 B27 之前的做法往往只做"公式抄对了没有"的自我核对。⇒ **凡是"源文出现过完整请求串"的参数，
   都要当成免费 oracle 去对拍一次。**

② **真机跑的不是"再确认一遍"，它测的是另一类事实**。`mse-capture` 在 Node 假环境 51/51 全绿，
   在真 Chrome 里立刻打红：站点顺序是 `URL.createObjectURL(ms)` **先于** `addSourceBuffer`，
   而我只在后者建记录 ⇒ **blob 地址被静默丢掉**。⇒ 与 B28 同型：
   **"顺序/时序"这一类事实，假环境天然测不出**（假环境总是按你写测试的顺序来）。

③ **故障注入不仅能打假断言，还能暴露"两层各写一份默认值"**。INJ3（把 hook 的 `autoDownload ?? false`
   改成 `?? true`）**不变红** —— 根因不是断言漏了，而是 `build-hook.js` 的 `resolveConfig` **也**写了一份默认值，
   把 hook 的那份**遮蔽**了。处置是**去掉重复的那份**（默认值只在 hook 内定义一处），
   然后 INJ3 立刻变红。⇒ 判据：**"改了默认值却不红"要先查"这个默认值是不是死的"**（承 B28 的同型结论）。

### 附带修复（本批实跑带出）

| # | 位置 | 问题（怎么发现的） | 处置 |
| --- | --- | --- | --- |
| 1 | `web-reverse-hook/scripts/hooks/mse-capture.js` | `URL.createObjectURL(ms)` 先于 `addSourceBuffer` 时 blob 地址被丢（**真机 Chrome 打红**） | 增加 `urlOfMedia` 映射（与 record 解耦），Node 侧补**顺序回归断言** |
| 2 | `web-reverse-hook/scripts/build-hook.js` | `mse-capture` 的默认值在 `resolveConfig` 与 hook 内**各写一份** ⇒ 改一层是静默无效（**故障注入 INJ3 打红**） | 删掉 `resolveConfig` 里的那份，默认值只在 hook 内定义一处（并写进注释） |
| 3 | `stream-drm-reverse/SKILL.md` | 新脚本的断言数被**手抄**成「41 项」（实为 45） | 按本仓既有约定改为「**以实跑输出为准**，勿手抄」（承 B28 的「断言对≠文档对」） |
| 4 | `reverse-knowledge/.../tencent-ckey/metadata.json` | 源文文件名 `终究` 被写成 `最终` ⇒ lint 报 8 条 `来源文件不存在` | 逐条改正；**"来源标注错"与"事实错"一样是缺陷**（承 B27） |
| 5 | `b29-verify-sources.py` 表 B | 直接与 JSON 原文比对必然误报（引号被转义） | 改为**解析 JSON 后拼接所有字符串值**再比对（口径写进脚本注释） |
| 6 | `scan-pending.js` + `check_skill_integrity.js` | 「台账登记行」的正则只判「第 1 列是数字 + 第 2 列是反引号 .md」⇒ **被本批自己的「附带修复」表骗到**（`\| 3 \| \`stream-drm-reverse/SKILL.md\` \| …` 被当成登记行，台账多数 1 条 / 待处理少数 1 条）。**同一个坑 B26 在追加脚本里踩过一次** | 两处口径都加「**≥ 8 个未转义竖线（≥7 列）**」判据（不能要求 `== 8`：B28 之前的行有未转义的字面量竖线）；改完三方口径一致（`scan-pending` / `verify-ledger-md5` / 校验器 全为 **577**） |
| 7 | `b29-append-ledger.py` | 「先落盘、后断言」⇒ 断言失败时文件**已经被改** | 改为**先断言再落盘**，并把计数抽成 `count_rows()`（含口径说明） |

### 下一批（B30）取材建议

- 待处理 **468** 篇。
- 优先级：① **T10 媒体链路族的剩余部分**（B28 列的"需先证伪"本轮已完成了一半：结论是
  `stream-drm-reverse` 的 §0 层 + `reverse-knowledge` 蓝图是正确落点，**继续按此收**，
  但**只收"带完整算式/完整链路"的**，单站截图式 walkthrough 不再逐篇收）；
  ② **T8 剩余**（城通/奶牛/123 云盘）落 `cloud-drive-direct-link`（**只有新形态才动脚本**）；
  ③ **T9 剩余**（油猴/扩展变体）落 `web-reverse-hook` 与 `desktop-client-reverse`；
  ④ 验证码簇只取"新题型或带完整纯算交付"；⑤ 网马时代线 + 小游戏线（新供给连续两轮 0 命中）**暂不再列**。
- **B29 遗留**：
  1. 蜻蜓FM 的**十六进制大小写**未证（源文无示例）⇒ 已有开关，但需一次真机抓包确认；
  2. 咪咕 `rateType` 取值表未给（只出现 3）；`&crossdomain=www` 是否必需未说明；
  3. 斗鱼 `time`/`auth` 是否有函数关系（源文说照抄、未证）；免签房间名单口径未给；
  4. 腾讯 `auth_refresh` 的 `vappid`/`vsecret` 取值口径（源文脱敏）—— 生产上仍需自备；
  5. `miniprogram-reverse` 排错表的 `RadiumWMPF` 版本绑定条目仍待回源复核（B25 记，**连续六轮未碰**）。
- 候选新技能 `captcha-flow-orchestration` —— B5–B29 **二十三次确认不新建**
  （本批的"接管播放器 / 改写请求头"同样归入既有能力面）。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 563 | `52pojie-1480475-爱奇艺视频m3u8地址解析来了，附成品和源码.md` | `14ed2ae41d52d9266092055f2d98ab02` | 2026-09-24 | `reverse-knowledge` | evolve | 爱奇艺 dash 的**第二个可纯算参数** `authKey = md5("d41d8cd98f00b204e9800998ecf8427e" + tm + tvid)`（tm 为 13 位毫秒）——那个"盐"就是 `md5("")`，不是保密常量；★ **源文自带两条对拍向量**（line 92 / line 136 的样例 URL 里 authKey 与 tm/tvid 同时出现），实算 `c45e671cc7f74b52f477dc8fb32e27ba` / `f39c6550d42daea8c13722e0351a789c` 逐字符命中；`vf` 的取用口径是「node 跑站点 JS 后取**尾部 33 字符**再 strip」（那份 asm.js 会额外打印噪声）；清晰度不是换接口而是**成套换参数**（`bid` 300/500/600 与 `ps` 1/0、`ost`/`ppt` undefined/0 必须一起改） |
| 564 | `52pojie-1481462-腾讯视频m3u8地址解析终究还是来了，顺便再更新一下爱奇艺的解析代码.md` | `95bcc2c66731d9af9125533dc2b8d2a5` | 2026-09-24 | `reverse-knowledge` | evolve | 腾讯取址的**上游会话自举**：`access.video.qq.com/user/auth_refresh`（`vappid`/`vsecret`/`g_vstk`/`g_actk`/`callback`/`_`）→ 响应 `access_token`/`vuserid`/`vusession`/`next_refresh_time` → 回写本地 cookie 文件（源文自述「间隔几天再用依旧有效」）；`cKey` 由 `node tx.js <vid> <guid>`（内部加载 `ckey.wasm`）产出，是**多行 k=v**，拼进 `vinfoparam` 前必须 `replace("\n", "&")`；取址走 `vd.l.qq.com/proxyhttp`，`platform=10201` / `appVer=3.5.57` / `encryptVer=9.1` 是成套的伴随常量 |
| 565 | `52pojie-1899689-咪咕直播源获取.md` | `7196b27591895e9105ba055f992f4a1f` | 2026-09-24 | `reverse-knowledge` | create | ★ 新建蓝图 `migu-playurl`：咪咕**三级链**（`tv-data/<topVomsID>` → `liveList[].vomsID` → `tv-data/<vomsID>` → `dataList[].pID` → `playurl/v3?contId=&rateType=3` → `body.urlInfo.url`）；`ddCalcu` **不是加密**：以 `s="2624"` 为索引表取 `userid[2]`/`timestamp[6]`/`ProgramID[2]`/`Channel_ID[len-4]`，把 puData 反转后与原串交替配对并在这 4 个位置插入单字符，结果长度恒为 `len(puData)+4`；★ 语料陷阱：源文样例 URL 里的 `&timestamp=` 被 Markdown 渲染成 `×tamp=`（`&times;` 实体），**不报错**、只让第 7 个字符由 `2` 退化成默认串的 `t`（已做成机器可判定的断言） |
| 566 | `52pojie-1112699-用python获取斗鱼直播真实地址的一个思路,另附java代码.md` | `6486335eae3dd5da26eba1f18b66c561` | 2026-09-24 | `reverse-knowledge` | create | ★ 新建蓝图 `douyu-live`：斗鱼存在**完全免签**的端点 `playweb.douyucdn.cn/lapi/live/hlsH5Preview/<rid>?rid=&did=`，只需带抓包拿到的 `rid`/`time`/`auth` 三个头（源文口径「不需要更改不需要重新计算」）；响应 `data.rtmp_live` 按 `_` 切开取第 0 段即 `<房间号><9位随机字母>`；免签只在部分房间可用（返回「不支持」就是另一条路线）；★ 源文**文内自相矛盾**：line 15 写 `/live/` 段、line 88 的可运行实现不带 —— 按实现为准并显式登记 contradictions |
| 567 | `52pojie-1577771-【Typescript】解析斗鱼直播源.md` | `3bf1c9b6a02b1185fee23f90d9bd85f5` | 2026-09-24 | `reverse-knowledge` | create | 斗鱼**动态签名路线**的判据与对策：房间页每次返回的 JS 都不同，签名只活「几秒到十几秒」，过期返回非法请求或 403 ⇒ **不要跨语言重写**（源文明确否定 pyexecjs 中转），正确工程形态是「用 Node/TS 直接执行站点函数」——与静态签名平台（酷狗/B站 wbi）的处置完全相反 |
| 568 | `52pojie-1957129-[TypeScript]斗鱼、虎牙直播源解析.md` | `df05d80af15ed2281e148ea7f599911a` | 2026-09-24 | `reverse-knowledge` | create | 选型判据：多平台直播源的混淆/加密**本身就是 JS 写的** ⇒ 「用 js/ts 解析」最短；工程形态是一条命令 `平台 + 房间号`（斗鱼/虎牙/B站/抖音），B站路线要带 cookie、用链接入参时注意引号包裹（否则 shell 吃掉 `?&` 后面的 query） |
| 569 | `52pojie-1942443-蜻蜓FM电台播放地址算法分享.md` | `e577959486ff812208973d32d23f8783` | 2026-09-24 | `reverse-knowledge` | create | ★ 新建蓝图 `qingting-fm`（**完整纯算**）：`sign = hex_hmac_md5("Lwrpu$K5oP", "app_id=web&path=/live/<id>/64k.mp3&ts=<hex(unix+3600)>")`，待签串是**纯 k=v 固定顺序直拼**（不排序、不 urlencode）；`ts` 是「当前时间 **+1 小时**」的十六进制（不是现在、不是毫秒）；源文**未给示例 URL** ⇒ 十六进制大小写未证，已暴露成 `--ts-case upper\|lower` 开关并做负对照 |
| 570 | `52pojie-2017001-记一次某免费音频听书网音频地址解析全过程.md` | `206465b869cfb40d1947046e6507ff5d` | 2026-09-24 | `stream-drm-reverse` | evolve | 字符码表族（「不是加密」）：`split("*")` 后**从下标 1 开始**逐段 `String.fromCharCode`；三个静默坑 —— 前导 `*` 留下的空段、`fromCharCode` 按 **UTF-16 码元**取值（`233/189/160` 三个码点不是 UTF-8 三字节）、分隔符连写/非整数/越界码点必须报错；源文把目标站名写成 base64（`tingzh.com` 可解）；已落成 `playback_address.py charcodes`（该篇是第 27 轮被 `BLOCK_EXTRA27` 静默误杀的真阳性，本轮回收） |
| 571 | `52pojie-1700831-Python 直接获取抖音直播的直播源.md` | `9c4c8f2516a57aabe7412b4bedc54f2b` | 2026-09-24 | `stream-drm-reverse` | evolve | 抖音直播间：一次 `webcast.amemv.com/webcast/room/reflow/info/?room_id=&verifyFp=&X-Bogus=` 就同时拿到 `rtmp_pull_url` 与 `hls_pull_url`；**`verifyFp` / `X-Bogus` 留空也能过**（先试空值，别一上来上 VMP）；`room_id` 是 19 位（短链要 `HEAD` 跟 302 取 Location 再正则）；cookie 只需一个 `_tea_utm_cache_1128` |
| 572 | `52pojie-2072743-使用书签脚本获取到小红书直播回放的M3U8地址.md` | `0f33925237a867cfe889b927f442cfd1` | 2026-09-24 | `stream-drm-reverse` | evolve | 「书签脚本一出地址」的判据：数据**早就在页面状态树里**（`__INITIAL_STATE__.liveStream.roomData._rawValue.roomInfo.pullConfig`），不必抓包也不必扣 JS；`pullConfig` 是**字符串形式的 JSON**（要再 `JSON.parse` 一次）—— 最常踩空的一步 |
| 573 | `52pojie-2103308-分享两个已上传到greasyfork上用来下载无直链视频的油猴脚本.md` | `366029536fde237e804fcaba08c6432b` | 2026-09-24 | `web-reverse-hook` | evolve | ★ `web-reverse-hook` 新增预设 `mse-capture`：代理 `MediaSource.prototype.addSourceBuffer` / `SourceBuffer.appendBuffer` / `endOfStream` / `URL.createObjectURL`（抓的是**播放器真正喂进去的字节流**，与分片走 fetch/XHR 无关）；mime⇒扩展名派生（`video/mp4`⇒`.m4v`、`audio/mp4`⇒`.m4a`）；`minBytes` 过滤 + `maxTotalBytes` 熔断防 OOM + 交付后立刻释放；★ 真机（Chrome）跑出一个假环境测不出的缺陷：站点顺序是 `URL.createObjectURL(ms)` **先于** `addSourceBuffer`，只在后者建记录会把 blob 地址丢掉 —— 已修并补顺序回归断言 |
| 574 | `52pojie-1768343-【扩展插件】绕过网页订阅付费的屏障.md` | `95e3b0dfd248567e56c9d7781017bb1d` | 2026-09-24 | `desktop-client-reverse` | evolve | 扩展的**能力面**（网页 JS 改不了的那一层）：门禁绕过三法分档 —— ① 头改写伪装来源站（删 `Referer` 再 push `https://t.co/`）；② 伪装搜索引擎爬虫（`User-Agent`→`Googlebot/2.1` 与 `X-Forwarded-For`→`66.249.66.1` **成对改**）；③ `chrome.contentSettings.cookies.set({setting:"block"})` 禁站内 Cookie（最强，但掉登录）；头改写的正确写法是「**先 filter 再 push**」（否则留下两个同名头）；三法是**按站点选一**不是叠加；③ 改的是**浏览器持久设置**，调试完必须还原 |
| 575 | `52pojie-2000514-[油猴脚本] 网页控制台反检测.md` | `6cb5efd0f53d46779994e6ecdb47cc03` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **注入时机本身就是判据**：会替换原生方法的 hook（MSE / 编解码 / 组件注册表）与「检测控制台是否打开」这类探针，**必须早于页面自身代码**；手段分档 `inject_hook`（注册后必须 reload）< 油猴 `@run-at document-start` < Tampermonkey「安全 → Content Script API = Userscript API Dynamic」（唯一稳定最早）；排错判据：勾 Disable cache + 限速 3G 刷新后就好了 ⇒ 是时机问题不是逻辑问题；边界：用户脚本只过滤 `Function("debugger")()` / `new Function("debugger")()` / `function(){}.constructor("debugger")()` 三种**动态构造**，页面内联的 `debugger` 只能靠「永不在此处暂停」 |
| 576 | `52pojie-1974598-百度翻译的免费接口.md` | `a35a14385e8774a399a3dcd24dfa0470` | 2026-09-24 | `reverse-knowledge` | evolve | `baidu-fanyi-sign` 由 `unknown` 升为 `partial`：补上**入口三步链** —— ① 不带 cookie GET 主页拿 `BAIDUID`（带上就不会再 Set-Cookie）；② **必须手机 UA**（手机与 PC 返回不同页面，源文推测在 nginx 路由层分流）；③ 带 `BAIDUID` 再 GET 一次，取 `page.common.token`（不带则空串，页面自己 `location.reload()`）；实测 cookie **只需保留 BAIDUID 与 UA**；**sign 的算法本体仍未还原**（不臆测）；另记工具选型坑：`translate.js` 里存在永远走不到的分支且调用未定义函数，浏览器与 python-js2py 都不报错而 **otto 直接报错** |
| 577 | `52pojie-2075870-新人偶然逛到坛友的网页,顺便解一个加密练手.md` | `1f5001daaba3575c5fc2a50ea0f6c81a` | 2026-09-24 | `web-reverse-algorithm` | evolve | `response-decrypt` 的**入口捷径**：解密函数名常常就写在**消费密文的那一行**（`JSON.parse(r2(a.data.data))` ⇒ `r2` 就是解密函数，**不必跟栈、不必先找混淆入口**）；三连确认（下断点 / 入参是密文而返回值能 `JSON.parse` / 全局搜定义认算法族）；落地前**先用现成工具对一次**，把「算法认错了」与「代码写错了」分开；边界：若调用点是内联的 `JSON.parse(data)`，解密发生在更早（响应拦截器 / `responseText` getter） |

## 批次 B30 · 2026-09-24（第三十次执行）

**开局状态**：台账 B29 后 **577** 条 / 目录 `.md` **1066**（文章 **1061**）/ 待处理 **484**。
三方对齐（台账最后一节 = B29 × `git log` = `08a24f0`(B29) + `8eed838`(归档线第 30 轮) ×
自动化记忆最后一条 = B29）**一致** ⇒ 上一轮已闭环；
工作区的 `AGENTS.md` 与 `project/*` 是别会话在途改动，未纳入本批。

**取材口径（先做了一次证伪）**：归档线第 30 轮（`8eed838`）新收 **16 篇**，
主题是「**T0 失联池全量复检**（334→6）+ **T8 网盘/文件站直链族成规模**」——
正好落在 B29 列的优先级 ②（T8 剩余落 `cloud-drive-direct-link`）。
回源逐篇 grep 既有落点后确认：**网盘族的五个厂商（百度 / 123 / 夸克 / 文叔叔 / 阿里云盘）在既有技能里是零覆盖**，
而失联池回收的 6 篇里有 3 篇（jQuery Hook / 条件断点 / MSE userscript）是 `web-reverse-hook` 的**硬增量**、
2 篇是既有技能的**真实缺口**（滑块图像侧、PHM 模式阶梯）、1 篇（webpack）是**概念澄清**。
⇒ **本批把 16 篇全取**，横跨 5 个技能。

> ⚠️ 本轮**未**新增任何技能 —— 16 篇全部有最近邻模块。候选新技能 `captcha-flow-orchestration`
> B5–B30 **二十四次确认不新建**（本批的多厂商协议面同样归入 `cloud-drive-direct-link` 的既有能力面）。

**产出**：**新建技能 0**、**演化技能 5**、**新增 reference 1**、**新增脚本 1**（75 项自检）、
**新增 hook 预设 1**、**附带修复 9**（另有盲评审带出的 8 项，见下方「独立盲评审」）。

### 本批的关键判据：`logid` 是「读源码才能得到、且可离线复算」的一类结论

`52pojie-1208082` 把 `logid` 说成"用 `baiduid` 算出来的"（代码里也确实是 `ctx.call("w", baiduid, "")`），
但**读源码可知入参被丢弃**（`m` 是零形参）。顺着读下去还得到三条更强的结论：

| # | 结论 | 怎么判 |
| --- | --- | --- |
| 1 | `logid` 只依赖 `Date.now()` + `Math.random()`，**与 `baiduid` 无关** | `m = function() { return p(f((new Date).getTime())) }` —— 零形参 |
| 2 | 那个 73 字符"自定义字母表"的**尾部 9 字符是死代码**，前 64 个恰好 = 标准 base64 表 ⇒ **`logid` 就是标准 base64** | 三字节块 24 位、四个 `charAt` 下标都 `& 63` ⇒ 最大索引 63 |
| 3 | padding **按块**算（`[0,2,1][块长%3]`），不是按整个输入算 | `p = e => e.replace(/[\s\S]{1,3}/g, g)`，`g` 内的 `t` 用的是**那一块**的长度 |

结论 3 是我**自己第一版实现写错、被自检断言抓出来**的（按总长算会把 `"1234"` 编成 `MT==NA==`）。
⇒ 本批把这三条做成了 `multi_vendor_parse.py logid` 的可复跑断言（含"输出绝不含字母表尾部字符"这条**死区证明**）。

### 本批第二个机器可判锚点：阿里云盘 `user_meta.hash` 的三取样点

`sha1(bytes[0:2048] + bytes[n//2 : n//2+1024] + bytes[n-1024:n] + str(n).encode())`，
边界是 **`size <= 20480`**。三条阴性对照全部做成断言：
漏掉 `str(size)` ⇒ 不同；三取样点换顺序 ⇒ 不同；与全文件 sha1 ⇒ 不同。

### 验收（全部实跑）

- 新脚本 `multi_vendor_parse.py --selftest` **75 项**（两条纯算 oracle + `pan123` 解包 + 厂商判据，
  每条带阴性对照；含"非法 base64 / 尾部垃圾必须报错"的静默失败回归）；
- 既有脚本回归全绿：`lanzou_parse` **96** · `aliyun_ecc_sign` **52** · `wxapkg_tool` **29** ·
  `const_bruteforce` **11** · `detect-bundler` **29** · `env-shim` **17** · `harvest-bundle` **36** ·
  `check_verify_docs_consistency` **30** 等；
- **jquery-handler 契约测试 42/42**（Node 真引擎 + 伪 jQuery）+ **browsercli 真机 Chrome 6 组绑定全绿**
  （真 jQuery 3.6.0：`fail: []`、`reportCount === 6`、`shorthandAttr === rjq_click_0`）；
- 双向来源保真度 **64 条 / 16 个源文件 / 5 个落点技能，0 未命中**，
  并做了**阳性验证**（把文档里的 `PHM 6` 改成 `PHM 7` ⇒ 立刻变红；还原 ⇒ 绿）；
- 故障注入 **8/8 变红**（含 1 条阴性对照：未注入的副本 rc=0；另有 JS 侧 1 条：
  把 `EVENT_SPEC_INDEX` 打空 ⇒ `.delegate` 三条断言立刻变红，还原即绿）；
- 机械校验 `check_skill_integrity.js` **0 阻断 0 告警**；双镜像 **0 mismatch**；
- 台账行数/编号/md5 逐条一致 + 幂等复跑；全库 description 全部 ≤1000。

### 本批三条最有价值结论

① **「同一条知识写在两处」在真机上会变成 bug，而不是冗余**。`jquery-handler` 的第一版在 Node 假环境
   39/39 全绿，真 Chrome 立刻打出 `reportCount = 7`（应为 6）—— 根因是**真 jQuery 的 `$.fn.click`
   内部就是转调 `this.on('click',…)`**，于是简写方法会穿过两层包装被登记两次。
   假环境里我自己写的 `.click` 不转调 `.on`，**这类"库内部转调"关系天然测不出**。
   ⇒ 与 B29「真机测的是顺序/时序这类事实」同型，本批又添一类：**库的内部转调链**。

② **契约测试抓"设计缺陷"，比抓"实现错误"更值钱**。测试里那条
   `.on("submit", fn)` 的断言，第一版期望属性按**方法名**命名（`…-jquery-on-…`），
   跑出来才发现这个设计**对使用者毫无信息量**（元素上写个 `on` 有什么用？）。
   ⇒ 处置是改**实现**（事件名从参数里读，并剥掉命名空间），而不是改断言。

③ **保真度检查里的"表 B"是本批最有效的一道门，且它抓的全是"文档侧"缺陷**：
   本轮 9 条未命中里有 **6 条是"文档没写/写法不可检索"**（`api.aliyundrive.com` 只写了相对路径、
   `PHM 2` 被加粗成 `PHM **2**` 导致字面量不可 grep、logid 字母表在脚本里被拆成两行字符串……），
   只有 1 条是**我自己把源文没有的字面量（`addSourceBuffer`）写进了断言**。
   ⇒ 表 B 的口径应该是「**落点文件必须逐字含该字面量**」——它同时守住了"数字口径"和"可检索性"。

### 附带修复（本批实跑带出）

| # | 位置 | 问题（怎么发现的） | 处置 |
| --- | --- | --- | --- |
| 1 | `cloud-drive-direct-link/scripts/multi_vendor_parse.py` | logid 的 padding **按总长算**（应**按块**）⇒ `"1234"` 编成 `MT==NA==` | 改为 `[0,2,1][len(chunk)%3]`，并把这条错误写进函数 docstring 与文档 |
| 2 | 同上 | `pan123` 的 shareId 正则**照抄源实现**的 `[^/.]+`（**不排除空白**）⇒ 粘贴"链接 提取码:xxx"时会把整段当 shareId | 加 `\s` 与全角冒号兼容，并补一条"源正则会吞空格"的**阴性对照**断言 |
| 3 | `web-reverse-hook/scripts/hooks/jquery-handler.js` | 简写方法经真 jQuery 内部转调 `.on` ⇒ 同一回调登记两次 | 按「回调 + 事件名」**幂等去重**（`Object.defineProperty` 挂 `__rjqVarNames`，不可扩展时放弃登记但不影响透传） |
| 4 | 同上（设计缺陷） | `.on("submit", fn)` 的属性按**方法名** `on` 命名 | 事件名改从**参数**读，并剥命名空间后缀；补多事件串与命名空间断言 |
| 5 | `web-reverse-hook/scripts/build-hook.js` | `jquery-handler` 缺 `--poll-interval` CLI 选项（契约测试报 `ERR_PARSE_ARGS_UNKNOWN_OPTION`） | 补选项 + 传参 + help 文案 |
| 6 | `cloud-drive-direct-link/references/multi-vendor-protocols.md` | 阿里云盘上传接口只写了相对路径 `/v2/file/create`，**不可检索** | 补全成 `https://api.aliyundrive.com/v2/file/create`（表 B 抓出） |
| 7 | `miniprogram-reverse/references/unpack-and-decrypt.md` | `PHM **2**` 加粗后字面量 `PHM 2` **不可 grep**，与源文 `修改PHM 2` 也对不上 | 去掉加粗（表 B 抓出） |
| 8 | `web-reverse-hook/SKILL.md` | 把源工具（`JSREI/jQuery-hook`）的属性前缀 `cc11001100-…` 泛化成 `data-rjq-…` 时**没留痕** | 在文档里保留原前缀（泛化必须可溯源）（表 B 抓出） |
| 9 | `b30-verify-sources.py` | 断言里写了源文**确实没有**的字面量 `addSourceBuffer`（那是 B29 的既有能力） | 从该行移除（表 A 抓出） |

### 独立盲评审（2 名）→ **两份都是 `needs-fix`，合计 12 条，本轮全修**

| 评审员 | 视角 | 结论 | 处置 |
| --- | --- | --- | --- |
| Judge A | **保真度**（逐条回源核对 16 篇） | `needs-fix`，12 条 | 全部成立，本轮全修 |
| Judge B | **集成一致性**（引用/命令/镜像/台账） | `needs-fix`，7 条（其中 5 条与 A 重叠） | 全部成立，本轮全修 |

最有价值的四条（都不是"措辞问题"，而是**会让使用者照抄出错**的缺陷）：

1. **`logid --audit` 这条文档命令根本跑不通**（两位评审各自独立实跑复现）：
   `--input` 被声明成 `required=True`，而 `--audit` 分支**根本不读它** ⇒ argparse 阶段就失败。
   ⇒ 修法是把 `--input` 改成非必填，并在缺参时给**明确**提示（而不是让它变成一条死命令）。
2. **阿里云盘主站的成功状态码是我"生成"的**：源文主站分支**只判 409**、成功分支没有任何状态码判断；
   `201` 实际来自**团队版**段。我把它写成 `→ 201 预上传成功`，等于让读者照抄一个源文没给的条件。
   ⇒ 已改为「**非 409 即视为成功**」并显式标注 `201` 的来源。
3. **文叔叔的分块判据被我写反了**：源文是 `ispart = True if file_size > 2097152 else False`，
   我写成"整数倍整块上传，否则分块" ⇒ 4MB（2 的整数倍）会被判成整块，与源实现相反。
4. **`pan123` 对非法 base64 会"静默返回错误结果"**：`b64decode` 默认 `validate=False` 会**丢弃**字母表外字符
   ⇒ `params=@@@` 解成空串后照样拼出 `?auto_redirect=0` 并 exit 0。
   ⇒ 改 `validate=True`；并在故障注入里**发现第一次注入不变红**（原因：后面那道"必须是 URL"的检查也拦得住，
   属**守卫冗余**而非断言漏洞）⇒ 补上"**合法 base64 + 尾部垃圾**"这一路（宽松解码会把垃圾悄悄丢掉、
   返回一个"正确的"URL，使用者完全看不出输入被污染），INJ8 这才真的变红。

**其余 8 条**（均已修）：`url_expire_sec` 的"默认 1800"属过度外推（源文是**显式传**）·
"来源声称 68 字符"是**错误归属**（源文原串就是 73）· `t=<随机小数>` 的语义源文未给（已标推测）·
"替换资源链头默认关"源文没说 · 夸克的"React 合成事件"是我补的因果（已标推测）·
滑块的"低一个数量级"与字段名列举是外推（已标推测）· `timestamp` 的"秒级"源文未给 ·
"同一个文件 MD5 会变"原文限定词是"**有些**文件" · §2 内部"四代链路"实为**三节** ·
同文档内 `errno:-20` / `error=-20` 漂移（源文是 `error`）· 台账"附带修复 5"与表 9 行不符 ·
`aliyun_ecc_sign.py signbody` 示例缺 `--priv`（且缺参时的报错会误导成"UUID 传错了"）·
`aliyun-hash` / `ws-hash` 缺输入抛 `TypeError`、`--fixture -1` 静默输出空文件 hash ·
`.delegate(selector, event, fn)` 的事件名在**第 2 个**参数（按第 1 个取会把方法名当事件名打进元素属性）·
`multi-vendor-protocols.md` §6.1 未指向 `signed-api-and-helper-scripts.md` §2（阿里云盘签名字段）。

### 下一批（B31）取材建议

- 待处理 **468** 篇（本批收 16 篇后）。
- 优先级：① **网盘族继续 evolve** `cloud-drive-direct-link`（**只有出现"新形态"才动脚本**；
  百度 §A 的 `42 小时`、`x-signature` 族与城通/奶牛仍未覆盖）；
  ② **T10 媒体链路族**按 `stream-drm-reverse` §0 层 + `reverse-knowledge` 蓝图收，
  **只收带完整算式/完整链路的**；
  ③ **T9 剩余**（油猴/扩展变体）落 `web-reverse-hook` 与 `desktop-client-reverse`；
  ④ 验证码簇只取"新题型或带完整纯算交付"（本批的"服务端给 Y"正属此类）；
  ⑤ 网马时代线 + 小游戏线（新供给连续三轮 0 命中）**继续不列**。
- **B30 遗留**：
  1. 百度 §A 的**直链有效期 `42 小时`** 与 `pcsett` 的取值口径只在单源出现，**未复核**；
  2. 阿里云盘 `user_meta.hash` 的三取样点**只有单篇来源**（已由实跑复算 + 三条阴性对照守住算法本体，
     但"服务端为何这样设计 / 是否所有版本一致"未证）；
  3. 文叔叔的 `16 位 / 11 位` 判据**单源**（两种长度与两种语义的对应关系未在真实链接上复核）；
  4. `jquery-handler` 的**事件映射对象**分支只在 Node 假环境覆盖，真机只跑了简写/通用/多事件/命名空间四条路径；
  5. `miniprogram-reverse` 排错表的 `RadiumWMPF` 版本绑定条目仍待回源复核（B25 记，**连续七轮未碰**）；
  6. **本轮新登记的"推测项"（盲评审逼出来的，已在文内显式标注，勿当结论用）**：
     百度 `t=<随机小数>` 的语义（未证是否参与校验）、夸克用 `cloneNode` 去监听的**动机**（源文只有一行注释）、
     滑块 Y 类字段名的**通用性**（只在 1 个样本上见过 `startY`）、百度 `timestamp` 的**单位**、
     "转存后 MD5 会变"的**适用范围**（原文限定词是"有些文件"）——这 5 条都需要一次真机/多源复核才能升级为结论。
- 候选新技能 `captcha-flow-orchestration` —— B5–B30 **二十四次确认不新建**。
- 已 `skip` 未建档：B1-17（小程序）、B7-18（某查查）、B8-131（某音滑块纯算）、B13-216（WX 小程序反编译）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 578 | `52pojie-443111-【原创源码】C#百度网盘直链地址分析带demo.md` | `c2c578986e7be9e69870d5edeb1ae458` | 2026-09-24 | `cloud-drive-direct-link` | evolve | 百度 §A 分享直链（2015 代）完整链：分享页抽 `fs_id` / `yunData.SHARE_UK` / `shareid` / `sign` / `timestamp` → `POST /api/sharedownload`（**必带 `Referer` 与 `X-Requested-With`**）→ `errno:0` 取 `dlink`（`\/` 要换 `/`）→ 再请求一次带 `pcsett`，遇 `error_code:302` 取 `Location`；`error=-20` = **需要验证码**、`isdir:1` = 文件夹不支持；★ 语料陷阱第二例：源码行里的 `&timestamp=` 被 Markdown 渲染成 **`×tamp=`**（`&times;` 实体）——与 `52pojie-1899689`（咪咕）同型，已升格为通用判据「抄请求串先搜 `×`（U+00D7）」 |
| 579 | `52pojie-572431-【教程】php实现百度网盘视频解析.md` | `1b2094abbd901f9a201080685df4376c` | 2026-09-24 | `cloud-drive-direct-link` | evolve | 百度 §B 云端转码 m3u8（2017 代）：`GET /api/streaming?path=<urlenc>&type=M3U8_FLV_264_480&app_id=250528&t=<随机小数>`，一个请求即得 m3u8；`errno:-6` = **缺 cookie**（补 `PANWEB=1; bdshare_firstime=…`）；**`t` 只是防缓存**、不参与校验；PC 端「拿到却播不了」是 `crossdomain.xml` 跨域问题（站点只允许自家域取流），**不是算法问题**——手机端拿 m3u8 可直接播 |
| 580 | `52pojie-703837-百度网盘分享解析器 【20180310更新】.md` | `88036bcc9c2a9dc912214e16c4b6ba70` | 2026-09-24 | `cloud-drive-direct-link` | evolve | 百度直链 **host 替换**（带宽调优、不是修复）：解析出的地址开头 `d.pcs.baidu.com` 可替换成 `yqall02.baidupcs.com`，用于对比带宽；源工具把它做成开关「替换资源链头」**默认关**；另记：直链有效期 42 小时、IDM 支持 24 小时断点续传、**不支持含 Unicode 字符的目录**（单源，工具类无算法） |
| 581 | `52pojie-789831-利用javascript代码实现自定义百度网盘分享密码.md` | `3b9ef447be5d44dc705b9792e4e50c6a` | 2026-09-24 | `cloud-drive-direct-link` | evolve | **AMD `require` 模块 + 原型方法替换**手法：`require(["function-widget-1:share/util/service/createLinkShare.js"]).prototype.makePrivatePassword = () => prompt(...)`；★ 前置动作是「**先点一次「分享」让 AMD 模块载入**」，否则 `require` 拿不到那个模块（最常见的踩空点）；密码必须 4 字符、含中文时首次访问报错需刷新（站点既有瑕疵）；该手法与「host 替换」「`video.pause=null`」同属**不改源码改运行时**一族 |
| 582 | `52pojie-1075330-【Python3】基于文叔叔网盘上传与下载的Python脚本.md` | `89c6531a06c61d198e5f80f50318d473` | 2026-09-24 | `cloud-drive-direct-link` | evolve | ★ 文叔叔全链：`POST /ap/login/anonymous {"dev_info":"{}"}` 拿 token → 之后所有请求带 `x-token`（游客态、每次重取）；**下载链五跳**（`ap/task/token` → `ap/task/mgrtask` → `ap/ufile/list` → `ap/dl/sign` → GET）；★ 第 1 跳的**长度判据**：分享 URL 尾段 **16 位 = token（要换 tid）、11 位 = 直接是 tid** ——两种长度形态完全一样，不判长度会走错分支；★ **秒传三件套**：`cm1 = md5(首块)`、`cs1 = sha1(同一首块)`、`cm = sha1(md5 的 hex 字符串)`（整块上传取整个文件；分块上传取**所有分块 md5 hex 首尾相接**再 sha1）——写成 `sha1(原始字节)` 不报错但秒传永远 `isCan:false`；分块阈值 `2097152`（2MB）；限流 `code 1021` |
| 583 | `52pojie-1208082-【原创源码】【Python】某云分享群资源同步到网盘.md` | `730dca31b412d226162be1f9684622dc` | 2026-09-24 | `cloud-drive-direct-link` | evolve | ★ 百度 §C 群分享转存（2020 代）四跳：`/disk/home` 正则抽 `bdstoken` → `mbox/msg/historysession`（`gid` 为空的行跳过）→ `mbox/group/listshare` → `mbox/msg/shareinfo` → `POST mbox/msg/transfer`（`ondup=newcopy&async=1&type=2`）；★ **判文件夹的双口径**：`shareinfo` 条目「**只有文件有 `md5` 字段**」（用来递归下钻），而 `sharedownload` 用 `"isdir":1`（用来直接拒绝）；★ **转存去重别用 MD5** —— 源文实测「同一个文件转存之后 MD5 会发生改变」⇒ 判重键必须用 `server_filename` + `size`；`errno:-9` = 没有这个文件夹；★★ **`logid` 三条机器可判结论（读源码 + 实跑复算得出，可独立复核）**：① 源码里 `m` 是**零形参**（`m = function() { return p(f((new Date).getTime())) }`），`w(baiduid, "")` 传进去的 `baiduid` **被丢弃** ⇒ logid 与账号无关；② 那个"自定义 base64 字母表"共 **73** 字符，但三字节块 `n` 是 24 位、四个 `charAt` 下标都 `& 63` ⇒ **尾部 9 个字符（`~！@#￥%……&`）永不取用**，而前 64 个**恰好就是标准 base64 表** ⇒ **`logid` 就是标准 `base64(毫秒时间戳 + Math.random())`**（写"自定义字母表 decoder"是白写）；③ `f` 的 UTF-8 转义分支（`d` 含 `[^\x00-\x7F]`）对纯 ASCII 输入**永不触发**；④ padding 必须**按块**算（`[0,2,1][块长%3]`）—— 按总长算会把 `"1234"` 编成 `MT==NA==`（错），这条是本批实现写错后被自检抓出并写进文档的 |
| 584 | `52pojie-1311697-某新网盘mp4文件上传协议.md` | `4fbbe89d87795c8e029eff2e358818b2` | 2026-09-24 | `cloud-drive-direct-link` | evolve | 阿里云盘上传协议 + 直链：`POST https://api.aliyundrive.com/v2/file/create` → `PUT <upload_url>`（每片 5MB）→ `/v2/file/complete`；直链走 `/v2/file/get` 带 `url_expire_sec`（样本 1800）；**`drive_id` / `authorization` 只能抓包**（本厂商无匿名路线）；★ **三个 hash 是三个不同算法**（别混）：`pre_hash = sha1(前 1024 字节)`、`content_hash = 全文件 sha1`（秒传用，**`create` 返回 409 即文件已存在**）、`user_meta.hash = 专有算法`：`size <= 20480` 时 = 全文件 sha1，否则 = `sha1(bytes[0:2048] + bytes[n//2 : n//2+1024] + bytes[n-1024:n] + str(n).encode())` ——**三取样点 + 十进制长度字符串，顺序敏感**，写成全文件 sha1 不报错但只会被判为重传；★ 团队版（Teambition）**五步**才拿到上传地址，且分片是 **10MB（10485760）** 而非 5MB（两处量纲易错） |
| 585 | `52pojie-1678828-【油猴脚本】夸克网盘直链下载.md` | `bb01b03d1404b5cd21d4081e539288de` | 2026-09-24 | `cloud-drive-direct-link` | evolve | 夸克网盘直链：`POST https://drive.quark.cn/1/clouddrive/file/download?pr=ucpro&fr=pc&ve=2.1.5` body `{"fids":[…]}` → `data[].download_url`；**前提是先保存到自己网盘**（端点吃自己空间的 `fid`）、文件夹不支持（`data` 为空）；★ DOM 侧可复用手法：**`btn.replaceWith(btn.cloneNode(true))` = 一次性摘掉该节点上全部监听器**（比 `removeEventListener` 实用得多——后者要求拿到同一个函数引用），然后重新取引用挂自己的 handler |
| 586 | `52pojie-1735138-绕过某网盘不保存只能观看30秒的限制.md` | `293b17c667debc6707e276f2ce344540` | 2026-09-24 | `cloud-drive-direct-link` | evolve | ★ **「只能看 30 秒」不是解析失败** —— 预览拿到的直链本身是**完整的**，限制在**播放器侧**：30 秒后站点主动 `pause()`；处置是「`video.pause=null`（把方法置空）+ 隐藏站点控制条 + 换回浏览器原生 controls + 干掉遮挡层 div」；边界：这是**前端绕过**、不产生新地址，与"取直链"是两件事（`cloud-drive-direct-link` 只登记判据） |
| 587 | `52pojie-1790540-123网盘解析PHP版本.md` | `f6867d831e932396fcf0bc1411a08e2d` | 2026-09-24 | `cloud-drive-direct-link` | evolve | ★ 123 云盘三步链：`GET /b/api/share/get`（`shareKey`/`SharePwd`/`ParentFileId=0`/`Page=1`）→ `data.InfoList[0]` 取 `Type`/`FileId`/`Size`/`S3KeyFlag`/`Etag` → `POST /b/api/share/download/info`（JSON `{ShareKey,FileID,S3keyFlag,Size,Etag}`）→ `data.DownloadURL` → GET 它取 `data.redirect_url`；★ **两个静默坑**：① `DownloadURL` **不是可直接请求的 URL**，要先对它做一次 `regex params=([^&]+)` + `base64_decode`；② 解出来的地址**要补 `auto_redirect=0`**，且判据必须在**解码后**的串上做（在原始 URL 上判会永远为假，因为它本来就不含这个参数）——这条已做成"在原始 URL 上判会误判"的**阴性对照**断言；★ **源实现的 shareId 正则 `(?<=\/s\/)[^\/.]+` 有个真实缺陷：不排除空白** —— 而"分享链接 + 提取码"最常见的粘贴形态是 `https://…/s/AbCd-1234 提取码:xyz9`（中间是空格）⇒ 源正则会把它整段当成 shareId；本技能加 `\s` 与全角冒号兼容，并断言"拿到后不含空格"；边界：`Type != 0` 是文件夹、源实现直接不支持 |
| 588 | `52pojie-1886004-jQuery Hook.md` | `51d42ec9de15d3ed69f3e880daf92be3` | 2026-09-24 | `web-reverse-hook` | evolve | ★ `web-reverse-hook` **新增预设 `jquery-handler`**：包住 `$.fn` 上的事件方法，把每次注册的**回调**挂到全局变量并在元素上打属性 `data-rjq-jquery-<事件>-event-function` ⇒ ① Elements 面板里直接看到"该元素有哪些 jQuery 事件"；② Console 粘贴属性值 → 打印函数内存地址 → **点进去直达业务代码**；解决问题：jQuery 自建事件机制使 DevTools 的 Event Listener 面板只能定位到 **jQuery 内部闭包**；★ 支持简写 / `.on("submit", fn)` / 事件映射对象 / 多事件串 / 命名空间后缀（`submit.myNS` ⇒ `submit`）；★★ **三个真机（Chrome + jQuery 3.6.0）才暴露的坑**：① **真 jQuery 的简写方法内部就是转调 `.on()`**（`$.fn.click` → `this.on("click",…)`），所以一次 `.click(fn)` 会穿过两层包装 ⇒ **登记两次**、属性被后写的覆盖（实测 6 次绑定产生 7 个变量）；已按「回调 + 事件名」做**幂等去重**（去重后恰好 6 个）；② **事件名要从参数里读**，不能取方法名（`.on("submit",fn)` 的事件是 `submit` 不是 `on`）——这一条是契约测试抓出来的设计缺陷；③ 写测试替身时 **`$.fn` 必须是集合对象的原型**（`Object.create($.fn)`），否则 `$(el).click` 走不到原型链；边界：jQuery 被 Webpack 闭包持有时不适用，会**明确打印**并给出 `dataflow` 替代路线 |
| 589 | `52pojie-1909547-文心一言绕过无限debugger（条件判断）.md` | `75ae20e9baa251bd09dabe3da3b237c9` | 2026-09-24 | `web-reverse-hook` | evolve | ★ 绕过无限 `debugger` 的**第三档手段：条件断点** —— 在 `debugger` 那一行右键加条件断点、条件填 `false`，放行一次后重进站点即生效（不动页面、不装脚本）；`web-reverse-hook` 据此把处置整理成**三档（从弱到强）**：① 条件断点（最便宜，刷新后可能丢）< ② `antidebug` 预设（治**动态构造**形态，覆盖面最广）< ③ *Never pause here*（治**内联** `debugger`）；★ **判据先分清 `debugger` 是内联写死还是动态构造**：内联 ⇒ 只能 ①/③；动态构造 ⇒ ② 最省事 —— 与 hook 法是**两条不同的路**，不是替代关系 |
| 590 | `52pojie-2115438-通过浏览器自带API 捕获常见视频流数据的userscript.md` | `f32106be275b9f0783810689a83bfcb3` | 2026-09-24 | `web-reverse-hook` | evolve | ★ MSE 捕获的关键补充：**MSE 是流式的，播放器喂进来的字节流 = 你能拿到的全部** ⇒ 「只播了开头就保存」只会得到开头那段（源文原话"要播放完才能下载"）；**推进进度的三个技巧（按性价比）**：① **智能跳播到缓冲区前沿**（把 `currentTime` 设到 `buffered.end(buffered.length-1)` 附近 ⇒ 播放器为保持前方有缓冲会**继续拉流**，比匀速播放快得多）；② 倍速播放（`playbackRate = 10`，**部分站点会报错或从头播**）；③ 先 `play()`（有些播放器**不播就不拉**）；判据：`__mse_capture.streams()` 里 `bytes` 不再增长 ⇒ 流喂完了；边界：三个技巧都是**催**不是**保证**，卡在广告/付费墙/DRM 前面时跳播也拿不到（属 `stream-drm-reverse`） |
| 591 | `52pojie-1795624-云外图形巧解滑块坐标.md` | `f1a12c07c257baee09cc1fd83a578a25` | 2026-09-24 | `web-verify-patcher` | evolve | ★ 滑块题的**顺序判据：先问服务端要 Y，再问图像要 X** —— ① **Y 可能根本不用找**（该样本响应里直接给 `data.startY`）⇒ 先看响应 JSON 有没有现成 Y；② X 用「**增强 → 只在已知 Y 那条水平线上扫**」求：取图片**左下角像素**判底图配色种类（三种配色各一组亮度/对比度参数 `(-350,550)` / `(-250,550)` / `(-100,200)`）→ 按该组做**亮度/对比度增强**（把淹没在背景里的缺口逼出来）→ 在 `y = 图片高 - startY - 20` 上从左往右扫，命中**纯黑**（`-16777216`）即 X；★ 第 ③ 步的 `-20` 偏移与"黑色"阈值是**该样本专用**，换站必须重标定；★ **原点与 Y 方向要先确认**：该库以左下角为原点、`startY` 从底部量（方向搞反的症状是"扫到的全是背景"）；成本判据：有 `startY` ⇒ 只做 **1 维搜索**；没有 ⇒ 才需 2 维，且优先几何法而非逐像素暴力 |
| 592 | `52pojie-1195871-自用的小程序反编译工具.md` | `d53fa98aa0e025a3c88ed5df662f3e95` | 2026-09-24 | `miniprogram-reverse` | evolve | ★ 解包工具的**「按产物类型换档」模式阶梯（PHM）**：`wxappUnpacker` 系把解包拆成 4 个**可单跑**的阶段（`wuConfig` / `wuJs` / `wuWxml` / `wuWxss`），每阶段带 PHM 开关 —— JSON 解不出（**插件项目尤其常见**）⇒ `wuConfig.js` 切 **PHM 2**；`.js` 解不出 ⇒ `wuJs.js` **PHM 3**；`.wxml` 解不出 ⇒ `wuWxml.js` **PHM 4**；`.wxss` **有报错** ⇒ `wuWxss.js` **PHM 5**；`.wxss` **不报错但也没产出** ⇒ **PHM 6**（5/6 的区分是这张表的关键）；两条纪律：① 分包要「**先解包、再按阶段单跑**」（一把梭中途失败会丢前序产物），② 解完**必须手动按同一相对路径拷回主包**（分包产物不会自动并入）；边界：PHM 是**该工具链的实现细节**，`unveilr`/`wxapkg_tool.py` 没有这个开关 ⇒ 别把"某工具解不出"当成"包有问题"（先按 §0 magic 判据确认包本身完好） |
| 593 | `52pojie-1682010-手写webpack核心原理，支持typescript的编译和循环依赖问题的解决.md` | `b44174798cde3afeff2cc3c2b1dbfa83` | 2026-09-24 | `webpack-bundle-extraction` | evolve | ★ **require 缓存表的语义**（源文里叫 `exportsInfo`，产物里叫 `__webpack_module_cache__`）：加载器形状是「查缓存 → 取模块表 → `.call` → 返回 exports」，而**缓存条目在模块体执行之前就写入**（`cache[id] = {exports:{}}` 先于 `modules[id].call(...)`）⇒ **循环依赖时先拿到的那一方看到的 exports 是「对象地址正确、属性还没填」**（同一引用，后续填的属性也会出现）——这正是"**记忆化搜索**"能解开循环依赖的原因；三条逆向结论：① **不能用"缓存表里有这个 id"判断模块已执行完**（它在执行前就存在）；② **模块初始化顺序决定字段可见性**，从入口 BFS 的到达顺序 ≠ 运行时执行顺序（循环边会让两者分叉）⇒ Node 里复用产物时字段为 `undefined` 常常是**顺序问题**而非"没抠到"；③ **静态抠取可安全忽略这一层**（依赖图与执行顺序无关），只有**动态复用**时才需关心 |

## 批次 B31 · 2026-09-24（第三十一次执行）

**开局状态**：台账 B30 后 **593** 条 / 目录 `.md` **1089**（文章 **1084**）/ 待处理 **491**。
三方对齐（台账最后一节 = B30 × `git log` = `7459df5`(B30) + `ed28288`(归档线第 31 轮) ×
自动化记忆最后一条 = B30）**一致** ⇒ 上一轮已闭环；工作区的 `AGENTS.md` 与 `project/*` 是别会话在途改动，未纳入本批。

**取材口径（按记忆里 B31 的优先级 ①②③ 就地取材）**：归档线第 31 轮（`ed28288`）新收 **23 篇**，
主题为「**「三不管」漏网体检**（捞回两个完整系列）+ 黑名单正文级体检」。逐篇回源 grep 既有落点后确认，
本轮取了其中 **16 篇**，正好横跨三簇：**① AST 教学系列 6 篇**（`AST` 遇中文不匹配导致整系列被历轮静默漏掉 ——
本轮把它一次收完，落 `ast-deobfuscation`）；**② 「小白讲解」系列 6 篇**（同一作者的服务网 / 房产 / 载荷 /
矿集团 / 猫投诉 / 车辆对比 —— 全篇都在讲「跟栈 + 断点 + 扣代码」，是既有技能里**没有独立成篇**的一族，
落 `web-reverse-algorithm` 新文档）；**③ 油猴 cookie hook 2 篇 + 百度一行油猴 1 篇 + 三站直播源 1 篇**
（分别落 `web-reverse-hook` / `cloud-drive-direct-link` / `stream-drm-reverse`）。
未被本批取用的 7 篇（newSign / 图床 sign / C# 正则替换 / JS 加解密速查 / 小程序教程 / 斗鱼解析 / 某站 sign）
**留给下一批**（都属既有技能能力面，无缺口）。

> ⚠️ 本轮**未**新增任何技能 —— 16 篇全部有最近邻模块。候选新技能 `captcha-flow-orchestration`
> B5–B31 **二十五次确认不新建**（本批的「跟栈定位」面同样归入 `web-reverse-algorithm` 的既有能力面，
> 已作为 `references/15-call-site-locating-playbook.md` 落成独立权威源，**但它是 reference 不是新技能**）。

**产出**：**新建技能 0**、**演化技能 5**、新增 reference **3**、附带修复 **8**。
  - `ast-deobfuscation`（evolve）：新增 `references/obfuscator-io-four-step-pipeline.md` ——
    **四步链的顺序依赖表**（每步漏做的症状：S2 漏做 ⇒ `test` 两侧不是字面量；S3 漏做 ⇒ 顺序串定位被同形 `split` 干扰）、
    S1「函数名不能写死」的顶层三节点结构、S2 的**5 类返回值替换表**、S3 **手写实现（Python / estraverse）的三个静默崩溃点**、
    S4 的三条件判据与空 block 守卫，以及**本批最高性价比的一招：用同一份配置自己生成混淆样本、拿原码做端到端 diff**
    （原码在手 ⇒ 失败必然是 pass 错，不是「站点变体」）；`obfuscation-detector.md` 分流表 +1 行；
    `ob-variant-taxonomy.md` §四 补「判据纠正 + 5 类返回值表指针」。
  - `web-reverse-algorithm`（evolve）：新增 `references/15-call-site-locating-playbook.md` ——
    **跟栈五判据**（J1「参数在某层消失」复用率最高 / J2 头部已带密文 / J3 头部没有尾部有 / J4 函数无形参 / J5 控制台是明文）、
    `send` 起点与 `Preserve log` 开场、三种生成形态、**唯一验收动作「断点处的值 vs 最终请求里的值逐字符对拍」**、
    三个隐藏依赖（**响应 Cookie 既是加密输入又是请求头** / 时间戳同源 / 表单格式一致）、`public` 密钥包 → 目标密文包、
    扣代码四要点（报错驱动补全 / `console.log(e)` 让加载器自报缺模块 / **原型方法必须补在 `new` 之前** /
    加载器头部「形参与 `e = {}` 冲突」）、条件断点定位器、八条静默陷阱；§2 阻塞点与资源导航接线。
  - `web-reverse-hook`（evolve）：新增两节 ——「**cookie hook 的三个真实坑**」与
    「**「断点暂停」= 最可靠的注入时机**」（第四个手段，比 `document-start` 更宽：不是抢跑，是把时间轴停住）；
    ★ 并附**真机（Chrome）A/B 实测**（`artifacts/skill-evolution/b31-run/`）：坏 hook 写一次后读回的**就是最后一次写入的原始串**
    ——`rj_a` / `rj_b` 在读取侧全部消失；`delete document.cookie` 后 `rj_a=1; rj_b=2` 完好 ⇒
    **cookie 没丢、是 `get` 在说谎**；好 hook 写一次后 `rj_a=1; rj_b=2; rj_d=4` 全在；
    另实测 **`document.cookie` 的描述符默认不在 `document` 自身**（`undefined`，在 `Document.prototype`）⇒
    先取自有描述符再 `defineProperty` 会抛 `Property description must be an object`。
  - `cloud-drive-direct-link`（evolve）：`multi-vendor-protocols.md` 新增 §2.6「客户端平台伪装」；
    SKILL.md 失败模式表 +1 行（**直链拿到了但行为仍被限制且 Network 无额外请求 ⇒ 限制在前端环境判断**）。
  - `stream-drm-reverse`（evolve）：新增 `references/live-source-longevity.md`（三站长期化配方 + asx 容器 +
    **机房 IP 黑名单** + 8 行排错表）；`SKILL.md` 资源 +1、失败模式表 +3 行；
    `playback-address-interfaces.md` §3 补「本节拿地址、那文变长期」的分工指针。
  - **附带修复 8 项**：① `obfuscation-detector.md` 分流表补「手工四步链」一行；
    ② `ob-variant-taxonomy.md` §四 纠正「键长恒为 5」的判据口径（它只是某一套配置的产物）；
    ③ `web-reverse-algorithm/SKILL.md` §2 阻塞点表新增「加密发生在哪一行还没钉死」；
    ④ `cloud-drive-direct-link/SKILL.md` 失败模式表新增「行为被限制」行；
    ⑤ `stream-drm-reverse/SKILL.md` 失败模式表新增 3 行（直播源看一会就断 / 本地能取服务器取不到 / HTML 实体残留）；
    ⑥ 三个 SKILL.md 的 description 补触发词（`ast-deobfuscation` / `web-reverse-algorithm` / `web-reverse-hook`，
    仍全部 ≤ 1000 字符）；⑦ 三个新文档里 3 处跨技能相对路径 `../` 写成 `../../`（**被校验器的「裸跨技能路径」规则抓出**）；
    ⑧ 新增文档里含省略号占位符的 4 个伪代码块由 ```js 改为 ```text（**避免「文档里的 js 代码块语法不通过」**）。

**验收（全部实跑）**：技能完整性 **0 阻断 0 告警**（含跨技能路径存在性、description 长度、镜像双份一致）·
双镜像 `b20-mirror-sync.py` **0 mismatch** · 自建 `b31-verify-docs.js` **0 阻断**
（frontmatter 契约 + 新增文档 JS 代码块语法 5 通过 / 6 跳过教学占位 + 编码体检）·
★ **browsercli 真机 Chrome 实跑 cookie hook A/B 全绿**（见上，产物 `artifacts/skill-evolution/b31-run/`：2 个脚本 + 2 份结果）·
台账登记 **609** 条 / `verify-ledger-md5.py` 逐条一致 / 幂等复跑。

**评审**：本轮沿用了 B30 的「自己造 oracle + 真机复跑」两条纪律，**未再引入独立盲评审**
（B30 的评审结论是「文档命令跑不通 / 常量串段」这类**跨源错配**，本轮已用 `b31-verify-docs.js`
把「代码块语法 + frontmatter 契约」机械化守住；真机 A/B 负责守住「行为断言」）。
⇒ **本批 3 个新文档的每条行为断言，都至少有一条实测或机械校验背书**。

**下一批建议**：归档线第 31 轮剩下的 **7 篇**（newSign / 图床 sign / C# 正则替换 / JS 加解密速查 /
小程序教程 / 斗鱼解析 / 某站 sign）优先收；之后回到 B30 列的优先级 ②（T10 媒体链路）与 ④（验证码新题型）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 594 | `52pojie-1332822-《JavaScript AST其实很简单》一、相关基础知识与环境配置.md` | `6bbe9ba901b876bb525a374c289f7be2` | 2026-09-24 | `ast-deobfuscation` | evolve | 工具链与环境：Python 3.7（递归 + 字典列表 + json）+ node `esprima`/`escodegen` + `execjs`；★ 已知坑：`execjs` 的 GBK 报错源自 `subprocess.Popen.__init__` 的 `encoding=None`，源文处置是改 `Lib/subprocess.py`（**本库口径：统一 UTF-8 + 显式 `encoding=`，不要动标准库**）；四步链的**环境准备只到这里**，算法本体见 1335042 / 1337494 / 1340194 / 1341603 |
| 595 | `52pojie-1335042-《JavaScript AST其实很简单》二、Step1-函数调用还原.md` | `aaad1c78daaa56ba1d547a33903a89c1` | 2026-09-24 | `ast-deobfuscation` | evolve | ★ S1 函数调用还原：obfuscator.io 默认输出**前三条语句形状固定**（大数组 / 洗牌 IIFE / 取值函数），**第 2、3 条的先后不固定** ⇒ 判据写成「在 `body[1]` 与 `body[2]` 之间找函数定义」，**绝不把随机 hex 函数名写死**；调用点判据 = `CallExpression` + `callee.name == 该函数名`；实参个数要容错（源文调用点有 1 参与 2 参两种，`len != 2` 时第二个补空串）；返回值为字符串 ⇒ 就地替换成 `Literal` 节点；**收尾必须删掉前 3 条语句**，否则 S4 的 `BlockStatement` 扫描会把它们当噪声；验证手法：只留前 3 条语句 generate 成小文件 + 一行 `console.log(fn("0x305"))` 先确认求值通路 |
| 596 | `52pojie-1337494-《JavaScript AST其实很简单》三、Step2-对象调用还原.md` | `a7a224461489b84313981d305e361ee6` | 2026-09-24 | `ast-deobfuscation` | evolve | ★ S2 字典对象调用还原（**本批最可复用的一张表**）：识别判据 = `VariableDeclaration` 且 `init` 是 `ObjectExpression` 且**所有键都是字符串字面量、键长一致**（源文样本恒 5 位 —— 但「5 位」是**该配置的产物**，稳定判据是「全字符串键 + 同文件内键长一致」）；调用点 = `CallExpression` + `callee` 是 `MemberExpression` 且 `object` 名 ∈ 已收集集合（漏掉最后一条会把 `JSON.stringify(...)` 一起吃掉）；★ **5 类返回值的替换表**：`Literal` / `MemberExpression` 直接替换；`BinaryExpression` 与 `LogicalExpression` 把第 1、2 实参按序放到符号左右；`CallExpression` **必须先比形参个数**（相等 ⇒ 只按序替换实参、函数名不变；不等 ⇒ 第 1 个实参充当返回函数的函数名）；替换与删定义要**分两趟**（同一趟既替又删会漏） |
| 597 | `52pojie-1340194-《JavaScript AST其实很简单》四、Step3-分支流程判断.md` | `7001d3afb8e8a6fd87b79bd69eed9717` | 2026-09-24 | `ast-deobfuscation` | evolve | S3 假分支剪除：`IfStatement` 的 `test` 是**两侧均为字面量**的 `BinaryExpression` ⇒ 按 operator 算真假后取 `consequent` / `alternate`；恒假形态（`"OWFLT" !== "OWFLT"`）取 `alternate`、恒真取 `consequent`，**不要写反**；源文自述这是「所有步骤里最简单的一步」—— 难的不是逻辑而是边界，三个静默崩溃点见下一条（1473162） |
| 598 | `52pojie-1341603-《JavaScript AST其实很简单》五、Step4-平坦化控制流.md` | `46779db064a0c109eaa3088a2d985d11` | 2026-09-24 | `ast-deobfuscation` | evolve | ★ S4 平坦化还原：判据**三个条件缺一不可** —— `BlockStatement` 的 `body[0]` 是 `VariableDeclaration`（**恰好 2 个 declarator**，且第 1 个 init 是 `CallExpression`）且 `body[1]` 是 `WhileStatement` （只判「body[0] 是 var」会命中遍地普通声明）；`"3\|4\|0\|5\|1\|2".split("\|")` 给出**执行顺序**、`cases` 数组是**书写顺序** ⇒ 按 split 顺序取 case 拼成新 block 替换整节点；★ 依赖 S3：假分支未剪时同形的 `"a\|b".split("\|")` 会干扰定位 ⇒ 取到顺序串后**先断言「split 出的每个元素都能在 `cases` 里找到」**，找不到就保留原样、**不要产出空 block**（同 `mba-and-dispatcher-reduction.md` §3 的守卫） |
| 599 | `52pojie-1473162-AST - 并没有想象中那么神秘.md` | `5c2c081ca296dbf0601ba5f4371f81e6` | 2026-09-24 | `ast-deobfuscation` | evolve | ★★ ① **手写剪假分支的三个静默崩溃点**（源文实现与 1340194 的片段都缺）：`node.alternate` 在**无 else 时为 `null`** ⇒ 直接读 `.body` 抛 `TypeError`（应先判存在性，不存在就丢弃整个节点）；父节点若是 `consequent` / `alternate` / 循环体 / `try` 块则**没有 `body`** ⇒ `splice` 崩（只对 `Program` / `BlockStatement` 父节点 splice，其余**就地替换节点**）；用 `==` 比较字面量会把 `"0" == 0`、`"" == false` 判成恒真 ⇒ **删掉活代码**（必须 `===`）。② ★ **「解密函数离线模块化」范式**：把混淆里的解密函数**单独粘成 `de.js` 并 `module.exports`**、执行体单独 `en.js`、AST 脚本 `require("./de")` 同步求值 ⇒ 解密器自包含时成本最低（依赖 `window` / 反调试 / 定时器时才上沙箱）；③ `estraverse.replace` 的 `enter` 返回新节点即替换，**替换后 AST 已变、不能再按旧节点引用做遍历决策**；④ 全链终点 = 一份十几行的原码，可做端到端验收 |
| 600 | `52pojie-1746432-油猴脚本hook不了指定名称的cookie.md` | `7e7ae3a4e0e6a654626cfa1f69603cf6` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **cookie hook 的三个真实坑**（来源是一篇**没人解答的提问帖**，反而把三坑同时暴露在一段代码里）：① **`@match https://host` 只匹配根路径** ⇒ 要写 `/*` 才覆盖全站（match pattern 的 path 不可省）；② ★★ **覆盖 `document.cookie` 时用变量累加 ⇒ 「读回来的就是最后一次写入的原始串」** ⇒ 站点其余 cookie 在**读取侧**全部消失、页面行为异常（症状是「hook 装完页面就不正常」而不是「cookie 没了」）；正确姿势是**转发原生描述符、只做观测** —— 本技能 `dataflow` 预设即此实现（沿 `document` → 原型 → `Document.prototype` → `HTMLDocument.prototype` 找描述符，找不到就跳过；`get` 走 `Reflect.apply(d.get,…)`、`set` 走 `Reflect.apply(d.set,…)`）；判据一句话：**装完页面还正常才叫观测**；③ `debugger` 放 setter 里必须配条件（`--cookie-match`），否则一次刷新断十几次；另记 cookie 名匹配是**子串包含**（`PHPSESSION` 能命中 `PHPSESSID`，但关键词太短等于没条件） |
| 601 | `52pojie-1900424-小白hook网站cookie步骤详解.md` | `ebe5a72d5edadfc511159f1d91410465` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **「断点暂停」= 最可靠的注入时机**（第四个手段，专治「没有任何注入设施」或「`document-start` 还不够早」）：Network 勾 `Preserve log` + 清站点 cookie → 刷新 → 找**第一个请求**（**内联 `<script>` 也算**）→ *Open in Sources panel* → 在脚本**顶端**打断点 → 再刷新 ⇒ 页面被停住（此刻页面 JS 一行没跑）→ Console 粘 hook → 放行 ⇒ hook 在所有页面代码之前生效；**原理上比 `document-start` 更宽**（不是抢跑，是把时间轴停住，窗口宽度由你决定）；三条纪律：断点必须在**第一个**脚本、内联脚本也算、**只解决「装得早」不解决「装得对」**；复现前置 = **先清 cookie** 让写入从零开始（否则分不清首次写入与更新） |
| 602 | `52pojie-742650-【转载】史上最短百度云盘直链油猴代码.md` | `2ea670fc5216f3c6f8563ccf60d3aaee` | 2026-09-24 | `cloud-drive-direct-link` | evolve | ★ **客户端平台伪装**（**整个脚本只有一行有效代码**）：`Object.defineProperty(navigator,"platform",{get:()=>'Maoger'})` + `@match http*://pan.baidu.com/*` + `@run-at document-start` —— 源文自述目的是「修改 `navigator.platform` 破解百度云下载限制」；三条要点：`http*` 是合法写法（等价 http + https 两条）、**`document-start` 是必须的**（站点在**页面脚本里**读该属性）、**必须用 `defineProperty` 覆盖 getter**（直接赋值在多数浏览器是只读、**静默失败**）；★★ **本条的长期价值是判据**：接口链路完全正确、直链也拿到了，但**行为仍被限制**（限速 / 要求装客户端 / 要求登录）**且 Network 无额外请求** ⇒ 限制在**前端环境判断**、不在协议里 ⇒ 去查「被读了但没影响请求」的属性；⚠️ 2018 年的手法（今天百度已换成服务端限速 + 客户端签名），**只登记判据与手法族**（与 host 替换 / 原型替换 / `video.pause=null` 同属「不改源码改运行时」） |
| 603 | `52pojie-1096152-[开源]斗鱼 虎牙 B站直播源获取分析（内附零基础也能看得懂的实现思路以及成品下载）.md` | `7984188f05af9b28f4b3cb29fd54a0a2` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ 三站直播源**长期化**（新文档 `references/live-source-longevity.md`）：**判据**「地址里带 `wsAuth` / `token` / `expire` / `did` ⇒ 必然短效；长期化 = 切「不变段 + 时效段」，丢时效段、把不变段拼到稳定 CDN 上」；斗鱼三步（二级域名 `hdl1a` → `tx2play1`、**从 `.flv?` 整段截断**、清清晰度后缀；**必须 HTTP 不能 HTTPS**、部分房间需保留 `_4000p`）、虎牙（页面内联 `var hyPlayerConfig = …`，用 `stristr` 截到 `};` 补 `}` 再 `json_decode`；开播判据 = 页面 HTML 里暴力搜唯一的 `"state":"ON"`；★ **`str_replace("amp;","")` = HTML 实体残留的第三例**，三例已升格为通用判据「抄页面串 / 请求串先搜 `amp;` / `&#` / `×`」；**手机 UA 访问 `m.huya.com` + 一条正则 `hasvedio: '([\s\S]*.m3u8)`** 由两个独立开源项目互证）、B 站三接口（③ = ① + ②；**② 未开播也有 `durl`、③ 为 `null`** ⇒ 接近永久源）；★★ **机房 IP 黑名单**：同一时刻同一直播间「本地家宽能拿、腾讯云 / 阿里云拿不到（关键字段为 `null`）」，改 UA / 假装 Postman / 换来源全无效 ⇒ **判据「本地能跑、服务器跑不动且失败点是关键字段为空⇒ 先怀疑 IP 段黑名单，不要继续改请求头」**（迁移性：采集脚本本地全绿、上线就挂 ⇒ 先做本地 vs 线上 A/B）；asx 容器（特化 XML，`<entry>` / `<title>` / `<ref>`）是长期源的**交付形态**；8 行排错表 + 已知缺陷（下播后的轮播状态会被误判为正在直播） |
| 604 | `52pojie-1985694-某某服务网逆向-小白讲解.md` | `8c1334c896db39305dccc5cedb1cc681` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★ 跟栈定位的第一手记录（新文档 `references/15-call-site-locating-playbook.md` 的来源之一）：源文口径「找数据包 → 跟栈 → 扣代码 → 数据对比」；**J5 判据**：断在参数生成处后，控制台打印得**明文**、全选得**密文** ⇒ 该变量就是加密的输入；**「先定义后使用」+ 关键字搜索**：把整段代码丢进 Notepad++ 搜标识符（该样本搜出 5 处同名 ⇒ 只需回到模块开头找定义处）；**「缺什么补什么」**：报 `A 未定义` 就补 `A`、报小写 `a` 未定义再补 `a`（**大小写是两个不同的东西**）；★ 三段链 `i()` → `S().encrypt(...)` → `i()`（**同一个密文被加密两次**）⇒ 混合加密分层是**局部形态**而非特例；★ 总结第 2 条：**明文不一致 ⇒ 密文必然不一致** |
| 605 | `52pojie-1998689-某某房产逆向-小白讲解04.md` | `eca2ed229b3609d98b274233bccca64c` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★★ **J1「参数在某层消失」判据的最佳样本**：多次调试发现 `sign` 到某个栈就**消失** ⇒ 推断加密在该层附近完成 ⇒ 只保留那一个断点；配套纪律「**第一个栈断不下来也无所谓**，目的只是找到参数」；两个定位手法：① `n = this` 的 `this` 指向 `c`、值又存在 `c` 里 ⇒ 猜测在 `c.prototype.__processRequest` 生成，**但未证实 ⇒ 继续向上跟栈**；② **作用域唯一性** —— `p` 在该作用域内只有一个 ⇒ 「sign 用的就是这个 `p`」，再断在 `p` 尾部把返回值与最终包的 `sign` **逐字符对拍一致**即可确认；★ **`token` 来自 cookie 正则提取**（`a` 里是正则、`return t[1]`，再切分赋给 `e.token`）；★ 待签串 = `token` + 时间戳 + **固定串** + 表单数据 + 页码，用 `&` 连接；★★ **响应 Cookie 既是加密输入、又是请求头**（清 cookie 后出现一个「没关注过的包①」，目标包⑤ **必须带上包① 的 `Set-Cookie`**，否则「响应里令牌为空」）⇒ **不能只复制最终请求**；两条一致性纪律：**时间戳必须同源**（算签名的与请求里的必须是同一个值）、**表单数据格式必须与浏览器完全一致**（源文总结第 2 条） |
| 606 | `52pojie-1999830-某某网站载荷逆向-小白讲解05.md` | `3e1600c70a4ae582942f0be6393384ba` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★★ **J3 判据**「断在头部没有该参数、而尾部 `return` 出的对象里有 ⇒ 参数在本函数体内**逐步生成**」；★ **「参数在上一层还有、往上一层就丢了」⇒ 参数就在这个拦截器里生成**（源文的推断路径）；★ **一次性函数表**：该站拦截器每次执行后会**删掉执行过的函数** ⇒ 在**每个函数的 `return` 处**下断、分页发包看命中哪个（**没断住 = 不经过这里**）；★ **加载器头部的隐蔽坑（源文自评「过于隐蔽」）**：本地报「模块错误」但模块全在 ⇒ 加载器自执行、参数从尾部直达头部，若**头部没有形参**则参数进不来；若头部有一句 `e = {}`（**存模块表的那个对象**）且形参也叫 `e`，则参数进来也会被置空 ⇒ 处置 = **给头部补形参 `e` + 注释掉那句 `e = {}`**；★ **`o()(x)` 与 `o(x)` 等价**（柯里化包装，源文口径「控制台打印试试，一样的效果」）；★ 单模块扣取时环境缺失直接置空（该样本报 `self 未定义`） |
| 607 | `52pojie-2010991-某某矿集团param逆向-小白讲解07.md` | `2fdc60dbd4ea8429cbc77f56d5184281` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★★ **原型追加的方法必须补在 `new` 之前**（本批最隐蔽的坑）：扣全模块与加载器后业务代码报 `t.encryptLong 不是方法` ⇒ 它在浏览器里是**模块被使用之后**才挂到 `d["a"].prototype` 上的；`new` 拿到的是**实例**、对已创建实例再加原型成员没有意义 ⇒ **本地必须把这段原型赋值插到 `new` 之前**（迁移性同 `web-reverse-hook` 的「替换必须早于实例化」）；★ **两包链**：一次交互发两个包 —— 包① 体积小、载荷只有一条长密文 ⇒ 那是**取 RSA 公钥**的包（`case0`：`t = new d["a"]` + `A.sent = 4` + `Q.a.post("/open/homepage/public")`），**跟栈时第一次断住的往往是它 ⇒ 跳过**；★ **让加载器自己报缺哪个模块**：在取模块函数里加 `console.log(e)`；`r(r.s = 429)` 与 `r(429)` 等价；模块是**空对象** ⇒ 浏览器什么也没做 ⇒ 本地**直接删掉那行**；模块属性是 `window` ⇒ 本地 `r(38)` **替换成 `window`**；★ 该站可以**把自带模块表清空、只放需要的**；★ 平摊流里的定位法：`case2` 的 `param: t` 来自 `A.sent`、不清晰 ⇒ **先在附近下断看有没有生成**，没有就单步；`var l = d(e, t, n)` 处打印 `l.arg`（异步）出密文，**但那不是最终写出点**，继续单步到 `case4` 才见最终密文；边界：公钥源文写死、签名段是 MD5 |
| 608 | `52pojie-2017218-某某猫投诉signature逆向-小白讲解08.md` | `ab462637298cf70fd1b3b91073e0ac54` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★ **J4 判据**「函数**没有形参** ⇒ 不接受传值 ⇒ 密文必然在本函数体内生成，或来自模块作用域」；★ **参数可能写在 URL 而不是 body 里**（`url: "".concat(n,"?ts=").concat(c,"&rs=").concat(h,"&signature=").concat(r)`）⇒ 断点处先确认参数位置；★ 待签串形态 `o([c,h,d,l,this.tabType,f,this.pageNum].sort().join(""))` —— **先 `sort()` 再 `join("")` 再哈希**（顺序是**字典序**不是书写序，漏 `sort()` 会得到一个稳定的错值）；★ **「模块只给一半」**：直接选中 `r(215)` 跳进去内容少得可怜、另一半是在里面加载别的模块拼出来的 ⇒ 必须在 `o = r(215)` 处**单步调试**、按浏览器实际加载顺序（先 216 再 215）扣；源文原话「**浏览器加载的模块没错，而是跳转的位置会使我们扣取错误（少扣）**」⇒ **凡 webpack 模块都以单步观察到的加载序列为准**；★ 三个「拿到就能改」的模块形态：空对象模块**直接删**、属性是 `window` 的**替换成 `window`**、报 `429` 就去加载器尾部找 `r.s = 429`；★ `h`（页面上叫 `rs`）是**每次刷新都变**的（自执行 + 随机数 + 字符表）⇒ **必须刷新才能断住** |
| 609 | `52pojie-2033662-某车辆对比信息X-sign-小白讲解10.md` | `70dfb6b2b77887d518d1777b8daca849` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★★ **条件断点作为定位器**（本批最具操作性的单点）：同一个 axios 拦截器 / 加密函数被页面里**几十个请求共用** ⇒ 普通断点每次请求都断、根本走不动；做法 = 在可疑行 *Add conditional breakpoint*，条件写 `e.url.includes("param/get_param_details")`（**先看当前帧有哪些变量再写条件，别照抄变量名**）；三条配套：① 进入**异步**后断点失效 ⇒ **把条件断点改到异步那一帧里面**；② 用 `e.data` / `e.url` 判断「目标包有没有经过这里」来决定继续向上还是换栈；③ **跟到「看不见 `x-sign`」或出现 `"x-sign": a(或变量)` 这种赋值形态为止**；★ 加密点定位链：`headers: clientAxios.getHeaders(e, t)` ⇒ 进入 `getHeaders` 尾部 `r["x-sign"] = s(e, t)`；待签串 `n = "cid=" + t.cid + "&#182;m=" + i + o + t.timestamp` ⇒ ★ **`&#182;`（= `¶`）是「HTML 实体残留」的第二个实例**（第三个是虎牙的 `amp;`）⇒ 抄串一律先搜实体；`md5` 是标准 MD5（可在线工具或自扣）；边界：条件断点依赖**当前帧的局部变量名**、换帧就要重写 ⇒ 它只是**定位阶段**的工具，要持久化就落 `web-reverse-hook` |

## 批次 B32 · 2026-09-24（第三十三次执行）

**开局状态**：台账 B31 后 **609** 条 / 目录 `.md` **1114**（文章 **1109**）/ 待处理 **500**。
三方对齐（台账最后一节 = B31 × `git log` = `f521621`(B31) + `628a59a`(归档线第 32 轮) ×
自动化记忆最后一条 = B31）**一致** ⇒ 上一轮已闭环。工作区的 `AGENTS.md` / `project/*` 是别会话在途改动，未纳入本批。

**取材口径（严格按记忆里「遗留 / 下一批（B32 更新）」的优先级 ① + ②③ 补位）**：
- **① 归档线第 31 轮剩下的 7 篇**（`f521621` 那轮刻意留下的）——**本批一次收完，7/7 命中**：
  newSign（`1708851`）· 图床 sign（`1735455`）· C# 正则替换（`1746095`）· JS 加解密速查（`1820070`）·
  小程序教程（`1237897`）· 某站 sign（`951589`）· 跟栈求助帖（`2046628`）。
- **② T10 媒体链路族**按记忆口径「**只收带完整算式 / 完整链路的**」取 **2 篇**：
  `2105967`（HLS AES-128 试看补齐，**从 10 秒到 143 片完整链路**）· `1163619`（腾讯旧版 `getinfo/getkey` 完整算式）。
- **③ 网盘族**继续 evolve `cloud-drive-direct-link`，取蓝奏云 **G2017 最早两代**（`635800` / `636373`）。
- **④ 新增第 4 簇（页面钩子与限制解除）3 篇**：`1650555`（反 hook 检测三指纹）· `1608506`（页面限制解除）·
  `1814333`（SSR 直出载体 + XHR 截获）。

> ⚠️ 本轮**未**新增任何技能 —— 14 篇全部有最近邻模块。候选新技能 `captcha-flow-orchestration`
> B5–B32 **二十六次确认不新建**（本批的「反 hook 检测」面归入 `web-reverse-hook` 既有能力面，
> 以 `references/anti-hook-detection-and-bypass.md` 落成独立权威源，**仍是 reference 不是新技能**）。

**技能变更汇总（6 个技能全部 evolve，0 新建）**

- `stream-drm-reverse`（evolve）：新增 `references/preview-gating-and-segment-enumeration.md` ——
  **「预览门控层」是既有 references 里完全空缺的一层**（现有文件只讲层判据与 key/IV 派生，**没讲「索引被截断时怎么办」**）：
  受控点二分判据（**URL 带 `_preview` 后缀 = 服务端侧**，且去掉后缀无效；试看 m3u8 里直接有 `#EXT-X-ENDLIST` ⇒ 列表本身被截断）、
  处置分叉（前端截断 vs 服务端侧）、**分片名可预测 ⇒ 编号枚举补齐**（`<年-月-日>68.ts` 里的 `68` 就是序号）、
  **枚举终止判据 = 连续 3 个 404**、key URI 相对路径的绝对化与 16 字节 `Content-Length`、
  以及 5 条安全缺陷的 **L0→L3 分级**（口径严格写成「该案例实测」而非行业普查）。
  另补 `playback-address-interfaces.md` §2.2b「腾讯旧版 `getinfo/getkey` 路线（2020 前）」——
  `QZOutputJson=` 剥壳 + `vl.vi[0].ul.ui[0].url` / `fvkey` / `fn` 组装 + `getkey` 二段取高清，
  并把「**响应以 `<回调名>(` 或 `xx=` 开头 ⇒ 先剥壳再 parse**」提炼为通用判据；
  `SKILL.md` 分流行 +1、失败模式 +2。
- `cloud-drive-direct-link`（evolve）：`lanzou-protocol-generations.md` 新增 **G2017 行**（手机 UA 打开分享页，
  源码里**直接内联**直链参数；手机端地址形如 `官网域名 + "tp/" + 文件ID`；**无第二跳、无 `ajaxm.php`**）与
  **§1.1「移动端 UA 分流」**（本族最早也最通用的定位技巧：**同一链接换手机 UA 会拿到另一套更简陋、暴露参数的页面**；
  `636373` 强调请求手机页**必须模拟手机 UA**）；来源表 +2 行；`SKILL.md` 资源描述同步年份范围 **2018→2025 改为 2017→2025**。
- `ast-deobfuscation`（evolve）：新增 `references/static-index-replacement-pitfalls.md` ——
  **「字符串表旋转未还原」时的三个静默失败指纹**（既有 references 只写了「四步顺序依赖」，
  **没写「漏做某一步之后产物长什么样」**）：① 自检算式退化成 `parseInt("active")` 这类把非数字串送进 `parseInt`；
  ② 出现**语法合法但语义荒谬**的调用（`$("projectcreation_error")["filter"](…)`、`document["innerText"]("response")`）；
  ③ **结构位**（`type:` / `url:` / `method:`）被替换成随机 token，或反之常量跑到了 URL/选择器位置。
  根因三条：漏做旋转 IIFE、注入的 `_getName` 里 `var _index = _index - 0x1d4`（**形参遮蔽 + 未定义**）、
  纯文本正则**无法区分「函数定义」与「函数调用」**（源文靠 `if (numberString == "index") return` 侥幸跳过）；
  正确路线三条（AST 工具 / 先求旋转偏移 / **只做命名还原不碰索引**）；
  ★ **验收判据：必须能跑通一个已知输入并对上浏览器里的同一输出 —— 「能 parse、能跑不报错」不是验收**（源文产物恰好能跑）。
  `SKILL.md` 导航 +1；`obfuscation-detector.md` 分流表 +1。
- `web-reverse-algorithm`（evolve）：新增 `references/16-ciphertext-structure-diagnostics.md` ——
  **「只有一段密文（或原文根本没解出来）时先读什么」**：三类不需密钥的客观信息（长度判块大小与填充 / 字符集判编码链 /
  **公共子串判「明文哪两段相同」**）、内置编解码函数的**形态指纹表**（`%uXXXX` 只有 `escape()` 会产生；
  base64url 必须先替换 `-`/`_`）、「形态像 ≠ 就是它」四陷阱（32 位 hex 未必是 MD5、末尾 `==` 未必是 AES、
  **前 16 字节乱是 IV 错不是算法错**），以及**求助帖式任务（原文无结论）的登记纪律**。
  ★ **本文件最有价值的一条是本批自己实测出来的**：**公共段长度不是块大小整数倍 ⇒ 直接反证「整块加密」**
  （`2046628` 的两个样本 base64 解码后**都是 40 字节**、公共尾 **12 字符 = 8 字节**、公共前缀 0 ⇒
  **40 不是 16 的倍数 ⇒ 可以排除 16 字节块 AES-CBC**；40 = 5×8 与「8 字节块 DES」或「多段拼接 + 固定尾段」
  两种读法都相容，**单凭长度无法二选一** ⇒ 只登记形态结论，不登记算法结论）。
  另补 `02-algorithm-families.md` 三节：**得物 `newSign`**（字段字典序 `k+v` 无分隔拼接 → AES-128-**ECB** → base64 → **md5**；
  ★ **so 导出函数名 `AES_128_ECB_PKCS5Padding_Encrypt` 直接写明了模式/填充/位宽 —— 先按名字直译**；
  ★ **hook 入参 + hook 返回值一次拿到「明文/密文」这一对，拼接顺序就不用猜**；`key == iv` 是实测值；
  **参与签名的字段集合随接口变化**（`scene` 换成 `source`））、**某图床 `sign`**（关键词搜不到 ≠ 没有 ⇒
  改搜「实参名 / 对象名」；★ **不要在静态文本上替换混淆代码，要在运行时用 `toString` 逐层照出来** ——
  与本批的 `static-index-replacement-pitfalls.md` 互为正反面）、
  **「请求头 Token 先查来源再查算法」**（`Bearer eyJ...` 是 JWT 可直解 payload；跨接口不变的 token 是**别的响应下发**的）；
  `SKILL.md` 导航 +1、description 补触发词（**压缩后仍 ≤ 1000**，本轮为此改了两稿）。
- `web-reverse-hook`（evolve）：新增 `references/anti-hook-detection-and-bypass.md` ——
  既有 `antidebug` 预设覆盖「无限 debugger / console / 尺寸 / 强退 / iframe」，**未覆盖「检测你 hook 了原生方法」**：
  ① **`Function.prototype.toString` 白名单比对**（智慧树把原生函数逐个过正则判 `function` / `native code`；
  检测入口还包括 `XMLHttpRequest.prototype.open`、`document.body.attachShadow` 存在性与 **`!window.OCS`（油猴管理器变量本身就是指纹）**）；
  ② ★ **用 `new Error().stack` 做「调用方过滤」**（源文只掐掉来自上报函数的定时器注册、其余一律放行 ⇒ 提炼为通用范式
  **「选择性劫持」**；代价：依赖**函数名**，压过混淆就失效）；
  ③ 劫持 `RegExp.prototype.test`（源文自评「没啥意义」，照实写并说明为什么）；
  ④ **closed shadow DOM 取证**：包装 `Element.prototype.attachShadow` 强制 `args[0].mode = "open"`；
  ⑤ **框架句柄逃逸**（`…__vue__.shadowDom.innerHTML` —— 组件把 `attachShadow` 返回值挂在了实例自有属性上）；
  ⑥ **页面限制解除**（行内 `user-select: text !important` 能压住作者样式表的 `!important`；
  **但只改样式时按钮仍会弹窗 ⇒ 要重写站点自己的函数**，配 `Range.selectNode` + `execCommand("copy")` 可运行片段）。
  `SKILL.md` 新增一小节（含选择性劫持 5 行片段）+ description 触发词 +9。
- `miniprogram-reverse`（evolve）：`request-crypto-and-sign.md` §2 sign 族 +2 行 ——
  **S6 整包 JSON 双校验**（内层：塞占位键 `t.s = "kunpo"` → `md5(JSON.stringify(t) + String.fromCharCode(100))` 回填；
  外层：`sort()` 键 → `k + "=" + v + "&"` 拼接去尾 `&` → md5；★ 注意实现细节是**第二个参数**（布尔）用于区分两处 sign）、
  **S7 固定 GUID 前缀 + 明文 JSON**（`md5("<固定 GUID 串>" + gamedata 序列化串)`，前缀是硬编码常量）；
  §5 坑表 +4 行（服务端 `code 1000` 别急着重查参数 / **同一份数据在不同接口要用不同密钥** /
  改到极限会被回滚成初始等级 / `json.dumps` 中文转义导致服务端不认 ⇒ `ensure_ascii=False`）；
  §6 下方补「**下载 → 改 → 上传**」闭环（判据：**改了数据不改 sign 上传失败 ⇒ sign 确实参与校验**）。
- `target-analysis`（evolve）：新增 `references/in-page-data-carriers.md` ——
  「**网络面板没有接口但页面有数据**」这一侧的权威源（该技能此前只有会话编排规则，无采集侧载体判据）：
  先分清「**没有接口**」还是「**没触发**」、直出载体清单（`RENDER_DATA` 要先 `decodeURIComponent` 再 parse /
  `__NEXT_DATA__` / `__INITIAL_STATE__` / JSON-LD / `data-*`）、增量靠「截获 + 驱动」，
  ★ 两个静默陷阱：**用 `this._url` 判断目标接口（该属性不存在 ⇒ 条件永不成立、一条都不收且不报错）** ⇒
  必须 `this.responseURL`；**覆盖 `onreadystatechange` 会顶掉页面自己的回调** ⇒ 用 `addEventListener("load")`；
  驱动性价比 **分页参数 > 点「加载更多」 > 滚屏**；CSV 导出的 BOM / 引号两条纪律。`SKILL.md` 新增 §D + description 补触发词。

**验收（全部实跑）**

- 技能完整性 `check_skill_integrity.js`（**全库 22 个技能**）：**0 阻断 0 告警**（含跨技能路径存在性、
  `§` 章节号引用、description 长度、脚本 `--selftest`、`.agents`/`.claude` 双镜像一致）。
- 本批新写的 `tools/b32-verify-docs.js`（**改动集从 `git status` 派生**）：**0 阻断** ——
  ① 全库 SKILL.md frontmatter/description 契约 22/22 通过；② 改动文档 JS 代码块语法 **19 通过 / 9 跳过教学占位**
  （**9 个跳过项已逐块人工看过**，见下「本批自曝缺陷」）；③ 编码体检（全库 248 文档 + 改动集 U+FFFD）；
  ④ 改动文档路径引用 208 可解析 / 1 不可解析（`references/patterns/<site>.md`，**占位符模式，历史既有，非本批引入**）。
- 台账登记 **609 → 623** 条 / `verify-ledger-md5.py` 逐条一致 / 幂等复跑。
- 本批**未新增技能脚本**（无新 `build-hook.js` 预设、无新 Python 工具）⇒ 不涉及新脚本的 `--selftest` 增量。
- ★ **browsercli 真机 Chrome 逐条验证文档断言：19/19 全绿**（browsercli attach 模式 + `new_page about:blank`
  + `evaluate_script --file`；产物 `artifacts/skill-evolution/b32-run/` = 1 个断言脚本 + 1 份结果 JSON）。
  覆盖 7 组（**每条都是本批新文档里写下的「可执行断言」，不是复述**）：
  - **① `escape` 形态**（`web-reverse-algorithm/16`）：`escape("始識")` = `%u59CB%u8B58`；
    `decodeURIComponent` 对它**抛异常**（返回值 `null`）；`unescape` 往返正确 ⇒ 面板三段的「`%uXXXX` 专属」
    判据成立。
  - **② ★ 行内 `!important`**（`web-reverse-hook/anti-hook`）：作者样式表 `user-select:none !important` 的
    对照组实测为 `none`（挡得住），目标节点拼上**行内** `user-select: text !important` 后实测为 `text`
    ⇒ 「**行内 `!important` 能压住作者样式表的 `!important`**」成立（这正是源文那句拼接写法的原理）。
  - **③ `attachShadow` 强制 `mode="open"`**（`web-reverse-hook/anti-hook`）：包装后对 `{mode:"closed"}`
    仍能拿到 `shadowRoot` 且 `innerHTML` = `<span>secret</span>`；还原原型后 closed **仍是 `null`**
    ⇒ 配方成立，且**不是环境残留造成的假阳性**。
  - **④ ★★ `Error.stack` 调用方过滤**（`web-reverse-hook/anti-hook` 的核心范式）：
    检测函数 `checkoutNotTrustScript` 内的 `setInterval` 注册**被抑制**（返回 `undefined`），
    正常调用方 `legitCaller` 的注册**原样放行**（返回数字 id）⇒ `suppressed=1 / passed=1`。
    **这是本批唯一一条「把源文的手法提炼成通用范式后再验证」的断言，真机成立。**
  - **⑤ `RENDER_DATA` 是 URL-encoded JSON**（`target-analysis/in-page-data-carriers`）：
    直接 `JSON.parse` **抛异常**，`decodeURIComponent` 之后再 parse **成功**
    ⇒ 「必须先 decode 再 parse」成立。
  - **⑥ ★ `xhr._url` 不是标准属性**（`target-analysis/in-page-data-carriers` 的静默陷阱）：
    `"_url" in XMLHttpRequest.prototype` = **false**、实例上 `_url === undefined`、
    而 `responseURL` 存在 ⇒ **源文脚本「一条都不收且不报错」的根因被真机证实**。
  - **⑦ 对照结论**：`Object.getOwnPropertyDescriptor(Element.prototype, "attachShadow")` = **true**
    （描述符**在**原型自身）—— 与 B31 实测的「`document.cookie` 描述符**不在** `document` 自身」形成**对照**
    ⇒ ★ **不能一律假设「描述符在不在自身」**，必须**沿原型链逐层找**（这条正好给 B31 的 cookie hook 坑 2 补上了反面样本）。

**本批自曝缺陷（含 3 个由「机械门禁」而非人工发现的，是本批方法论的收获）**

1. ★ **门禁自己抓出的第 1 个缺陷：`git status` 的「未跟踪新目录」只报一层目录名**。
   我第一版 `b32-verify-docs.js` 按 `endsWith('.md')` 过滤，于是 `?? .agents/skills/web-reverse-hook/references/`
   这种**整目录新增**被静默漏掉（改动集少了 2 个文档、却照样打印「0 阻断」）。
   ⇒ 已修：未跟踪目录**展开成其下全部 `.md`**。**教训与 B31「门禁自身也会假阳性/假阴性」同型。**
2. ★ **门禁抓出的第 2 个缺陷：`sed` 会把正则里的 `\u` / `\s` 反斜杠吃掉**。
   我用 `sed -i` 改 `PLACEHOLDER` 常量后，`/\u2026/` 变成 `/2026/`，于是**两个本来就合法的"教学占位"块被误判为语法错误**。
   ⇒ 改动校验器一律用编辑器/脚本写，不要用 `sed` 处理含反斜杠的正则字面量。
3. ★ **子代理报告「0 阻断」不等于过门禁**：两个子代理分别跑 `check_skill_integrity.js` 并报 0/0，
   但它在 `static-index-replacement-pitfalls.md` 里留下一个 `Unexpected token ':'` 的 ```js 代码块
   （一段**对象字面量片段**被标成 js）。`check_skill_integrity.js` **不做代码块语法校验**，
   是 `b32-verify-docs.js` 抓出来的。⇒ 已把该片段包成 `const broken = { … }` 恢复成合法 JS。
4. `web-reverse-algorithm/SKILL.md` 的 description **两次超限**（1110 → 1025 → 991）——
   B31 已记过同类教训（「description 有 1000 字上限」），本轮**又一次**踩到。
   ⇒ 判定：**加触发词之前先跑一次长度断言**，已写进下方「可复用要点」。
5. 一处**口径纠正由子代理主动提出**：我给它的 brief 里把 S6 的实现细节写成「第一个参数是布尔值」，
   子代理回源核对后按**源文**改为「第二个参数」（源文原话「第二个参数 e，实际上就是 True 和 False 的判断」）。
   ⇒ **子代理回源纠正上位指令时，以源文为准**（这条本身是流水线的正向收益）。
6. 子代理的**交叉引用文件签名核对**抓出镜像不一致（`static-index-replacement-pitfalls.md`），
   我复核后确认已由我自己同步 ⇒ **「镜像不一致」这类报告必须先自己 `cmp` 一次再改**（避免把刚同步好的又复制回去）。

**评审**：本轮**未引入独立盲评审**（沿用 B31 的「机械校验 + 实测」两条门禁，B31 已把该变化标注为「下一批应复核其效果」）。
**本轮对 B31 那次方法论变化的复核结论是：值得，但必须补一条** ——
B31 的 `b31-verify-docs.js` 用的是**硬编码文件清单**，于是「清单外的新文档」不受保护；
本批改为**从 `git status` 派生改动集**后立刻抓到上面第 1 条缺陷。
⇒ **下一批起，文档门禁一律用「派生改动集」而不是硬编码清单**（已写进「可复用要点」）。

**下一批建议**

- **① 「归档线第 32 轮」剩下的 11 篇**（`628a59a` 新收 25 篇，本批只取了其中 7 篇）：
  仍在既有能力面内，且**已能按簇归并** —— Fiddler 抓包教学系列 4 篇（`854434` / `858631` / `859813` / `962784`）、
  小游戏改包族 5 篇（`1018808` / `1076393` / `893603` / `927582` / `1115363`，**按记忆口径「小游戏线继续不列」**）、
  油猴杂项（`1598299` gitbookVIP / `1940437` Circle 阅读助手 / `2051222` flbook 导出 PDF）、
  媒体解析（`1159049` 某手去水印 / `1611177` 壁纸与音乐爬虫集 / `986243` X音批量下载 / `1430708` 某直播 websocket /
  `1379263` CCTV 手机电视直播源）。
- **② T10 媒体链路族**继续按 `stream-drm-reverse` 分层表 + `reverse-knowledge` 蓝图收，**只收带完整算式的**。
- **③ 网盘族** `cloud-drive-direct-link`（**只有「新形态」才动脚本**；百度 §A 的 `42 小时`、城通 / 奶牛仍未覆盖）。
- **④ 新增候选簇「页面钩子与限制解除」**：本批开了头（反 hook 检测 / 限制解除 / 直出载体），
  下一批可把 `web-reverse-hook` 的 `anti-hook-detect` **做成真的 `build-hook.js` 预设**
  （本批只落了文档，文末已用「未实现项」标注）。
- 验证码簇只取「新题型或带完整纯算交付」；网马时代线 **继续不列**。

**遗留（本批登记的「单源 / 未复核」项，文内已显式标注，勿当结论用）**

1. `2105967` 的 **5 条安全缺陷**（静态密钥长期不变 / key 接口无鉴权 / IV 跨视频复用 / 签名只保护索引 /
   试看版与完整版同源同密钥）是**对一个具体站点的实测归纳**，不是行业普查 —— 引用必须连「该案例」一起说。
2. `2105967` 的「**多个视频的 key 长期不变**」与「**其它视频试看版 IV 与该视频相同**」是源文自述的测试结论，
   **样本量未知** ⇒ 只有当次复现才能升级。
3. `1163619` 是 **2020 年**的腾讯旧路线，**今天站点已改用 `vd.l.qq.com/proxyhttp` + cKey**；
   文内已强制标注「引用必须连同年份」。
4. `951589` 明确自陈**校验方式不通用**（「不同渠道的游戏版本更迭不同……不通用的！！！」）⇒
   该篇只登记**结构形态**（双 sign 的作用域、`String.fromCharCode(100)` 盐、`s:'kunpo'` 占位），**不登记常量**。
5. `1237897` 的固定 GUID 前缀 `12D7D4DE-AEFA-4032-B796-EA80CD4A00EA` 是**该小程序当时的值**（2020）⇒ 抄结构不抄常量。
6. `2046628` 是**无结论的求助帖** ⇒ 只登记形态结论（见上「技能变更汇总」的实测数字），
   **不登记任何算法/明文结论**；其中「40 字节与 8 字节块 DES 相容」是**两种读法之一**，未二选一。
7. `1708851` 的 `key == iv` 与 `uuid` 生成逻辑是**单源单版本**（得物 5.3.1，2022）⇒ 站点改版即可能失效。
8. `1650555` 的 `checkoutNotTrustScript` / `window.OCS` / `ne` 正则都是**智慧树当时的内联实现细节**；
   「选择性劫持」范式本身可迁移，但**具体函数名/变量名不可迁移**。
9. `1814333` 的 `RENDER_DATA` 结构（`user.user.user` / `user.post.data`）是**抖音当时**的嵌套形态 ⇒ 取字段前先打第一层 key。
10. **B31 登记的 5 条单源项**（斗鱼长期化来源单篇 / B 站固定 CDN 前缀是当时实测值 / 虎牙 `sCdnType == "AL"` 口径 /
    B 站「接近永久」是源文推断 / 1998689 响应 Cookie 参与 sign 只单站观察）本轮**未碰**，继续挂着。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 610 | `52pojie-2105967-【网络逆向】TS到视频HLS加密简单逆向实录.md` | `9d11ad6a36f05aa1588dd3ad92fad3ce` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ **预览门控层**（既有 references 空缺的一层）：受控点二分判据 —— **URL 带 `_preview` 后缀 = 服务端侧**（去掉后缀无效，源文实测）、试看 m3u8 里**直接有 `#EXT-X-ENDLIST`** ⇒ 列表本身被截断；**分片名可预测**（`…/2024-08-0268.ts` 末尾 `68` = 第 68 片，改两位数字可下其它片）；★ **枚举终止判据 = 连续 3 个 404**（不是单个 404）；key URI 是**相对路径** `/keyhome/video.key` 要按 m3u8 目录拼绝对地址、响应 `Content-Length: 16` 且 body 就是 16 字节、IV 形如 `0x4ff43fb9…`（32 hex）；AES-128-**CBC** + PKCS7 的整片解密（解完 `unpad` 失败时手动按末字节去填充）；★ **5 条设计缺陷的 L0→L3 分级**（静态密钥长期不变 / key 接口可匿名下载 / IV 跨视频复用 / 签名只保护索引不保护分片与 key / 试看版与完整版同源同密钥 ⇒ 平台侧升级方向 = 静态密钥迁到动态鉴权 + 切片名换随机 UUID + 试看与完整版密钥隔离）；★ **纪律**：源文先用「套壳软件一般都…」的统计直觉猜「前端截断」，**实测落到服务端侧** ⇒ **判据必须用 URL / 索引证据，不能用统计直觉**；口径：该文是**一个站点的实测归纳**，引用要连年份 |
| 611 | `52pojie-1163619-腾讯视频真实地址解析.md` | `b10e1e8d89cde87703ea4e3d54ebb168` | 2026-09-24 | `stream-drm-reverse` | evolve | **腾讯旧版 `getinfo`/`getkey` 路线（2020 前）**：`vid` = 播放页 URL 的 `pathinfo()['filename']`；`vv.video.qq.com/getinfo?vids=<vid>&platform=101001&charge=0&otype=json&defn=s`；★ **响应是 JSONP 形态 —— 必须先剥掉 `QZOutputJson=` 前缀与结尾 `;` 再 parse**（提炼为通用判据：响应以 `<回调名>(` 或 `xx=` 开头一律先剥壳）；组装 `vl.vi[0].ul.ui[0].url`（基址）+ `fvkey` + `fn` ⇒ `基址 + fn + "?vkey=" + key`；高清另走 `getkey?format=2&…&vid=<vid>&filename=<vid>.mp4&platform=11` 取 `key`/`filename`；⚠️ **已强制标注「2020 年的旧路线，今天站点已改用 `vd.l.qq.com/proxyhttp` + cKey（见 §2.2），引用必须连同年份」** |
| 612 | `52pojie-635800-【带源码】新思路--蓝奏云直链解析.md` | `317830a1b750031d98f88d633d77ef5c` | 2026-09-24 | `cloud-drive-direct-link` | evolve | **蓝奏云 G2017 最早一代（比原表起点 G2018 更早）**：★ **换手机 UA 会拿到另一套页面** —— 手机端分享页源码里**直接内联**出直链参数（源文原话「网站的手机访问端的源代码竟然毫无保留的把下载链接的参数给贡献出来了」），按页面里 `submit.href` 那一串拼接即得下载链接；手机端地址形如 `蓝奏云官网网址 + "tp/" + 文件ID`；**无第二跳、无 `ajaxm.php`**；⇒ 提炼为 **§1.1「移动端 UA 分流」**（本族最早也最通用的定位技巧：PC 页找不到参数 ⇒ 换 UA 看另一套页面）；边界：2017 形态，今天已演化到 G2024/G2025，该判据只作**通用手法**保留 |
| 613 | `52pojie-636373-【网页源码】简单实现蓝奏云直链解析.md` | `45c682bf04f6cfdddf4e2b6791ba6f21` | 2026-09-24 | `cloud-drive-direct-link` | evolve | 同代的 **PHP 工程实现**，给「移动端 UA 分流」补上工程纪律：★ 源文原话「因为需要访问获取源码的是手机的下载页面，所以要注意使用 `curl_post` 函数**必须模拟手机 UA !!!**」⇒ **换 UA 不是可选优化而是前置条件**；流程四步（取 `link` → 存在性检查 → `curl_post` 手机页 → 从源码里取参数拼接）；失败态区分（文件已被删除要单独报错，不能与参数缺失混在一起） |
| 614 | `52pojie-1746095-解码 Javascript 文件之 C# 正则替换.md` | `d7b06d53ca8568daf6b5950b83a55d21` | 2026-09-24 | `ast-deobfuscation` | evolve | ★★ **「字符串表旋转未还原」的静默失败三指纹**（新增独立权威源）：① 自检算式退化成 `parseInt("active")` / `parseInt("6101864rlJFPI")` 这类**把非数字串送进 `parseInt``；② **语法合法但语义荒谬**的调用（`$("projectcreation_error")["filter"](…)` 选择器丢了 `#`、`document["innerText"]("response")` 把属性名当函数调）；③ **结构位**被换成随机 token（`type: "2774492jOaOCZ"`、`url: "435684KAJSHB"`）或反过来常量跑到 URL/选择器位置；根因三条：**漏做旋转 IIFE**（`array.push(array.shift())` 未执行 ⇒ 源码下标 ≠ 运行时下标）、注入的 `_getName` 里 `var _index = _index - 0x1d4`（形参遮蔽 + 未定义）、纯文本正则**无法区分定义与调用**（源文靠 `if (numberString == "index") return match.Value;` 侥幸跳过）；正确路线三条（AST 工具处理旋转 / 先求实际旋转偏移再替换 / **只做命名还原不碰索引**，零风险）；★ **验收判据 = 必须跑通一个已知输入并对上浏览器里的同一输出，「能 parse、能跑不报错」不算验收**（源文产物恰好能跑）；边界：与实现语言无关（C#/Python/Node 同样会踩） |
| 615 | `52pojie-1820070-Javascript 加密解密方法.md` | `b2e305538b458f120272b3ce5e8140fd` | 2026-09-24 | `web-reverse-algorithm` | evolve | 内置编解码函数的**形态指纹表**（价值在于**能从产物形状反查用了哪个函数**）：`escape("始識")` ⇒ `%u59CB%u8B58`（★ **`decodeURIComponent` 解不了 `%uXXXX`**，只能用 `unescape`）、`encodeURI` ⇒ `%E5%A7%8B…`、`btoa` ⇒ 标准 base64、`String.fromCharCode(101,118,97,108)` ⇒ `eval`；CryptoJS 侧：`enc.Base64.stringify(enc.Utf8.parse(t))` 是「先 UTF-8 再 base64」、`Base64.parse` 后必须 `toString(Utf8)` 否则拿到 `WordArray`、`PBKDF2(text, salt, {keySize: 128/32, iterations: 10})`；★ 判据：**先按形态选解码器，选错不报错只会给乱码 ⇒ 「解出来是乱码」永远先怀疑选错解码器**；边界：该文是**速查表**，已有 `web-reverse-hook` 的 `crypto-libs` 预设覆盖运行时拦截，**本文只收「从产物反查」这一面** |
| 616 | `52pojie-1708851-某物newSign分析.md` | `811a8e861a0c5784e15e14e98887e6e6` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★★ 三段链（顺序不能反）：**字段字典序拼接（`k+v` 无分隔符，空值也参与）→ AES-128-ECB(PKCS5Padding) → base64 → md5 = newSign**；五条硬判据：① **`key == iv`** = `d245a0ba8d678a61`（16 个 ASCII 字符，不是 hex 解码）；② ★ **so 导出函数名 `AES_128_ECB_PKCS5Padding_Encrypt` 直接写明了模式/填充/位宽 ⇒ 先按名字直译，不要先做符号还原**（`Module.findExportByName` 一句挂上）；③ ★ **hook 入参 + hook 返回值一次拿到「明文/密文」这一对 ⇒ 拼接顺序不用猜**；④ **参与签名的字段集合随接口变化**（另一接口把 `scene` 换成 `source`）；⑤ `uuid` 是客户端随机生成（`random.sample("0123456789ABCDEF",2)` 拼段）⇒ **随机值不必复现，但同一请求内必须一致**；另 ★ **请求头 Token 先查来源再查算法** —— `X-Auth-Token` 每次请求都一样 ⇒ 先在抓包里找到 `POST /api/v1/app/user_core/users/getVisitorUserId` 的**响应头**里带着同一个 token ⇒ 「逆向 JWT 算法」这件事直接不存在；`Bearer eyJ...` 是 JWT，第二段 base64url 解 payload 即得签发/过期时间（不需签名密钥）；边界：Android 5.3.1 单版本（2022），常量与 key 站点改版即失效 |
| 617 | `52pojie-1735455-某图床sign解密.md` | `3dae752d28f106a4e00db0db2aa31a81` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★ **难度不在算法（最后就是一句 md5），在「关键词搜不到」**：① **第一步不是搜索而是 XHR 断点** —— 断下来的那行必定是 `send(...)`，**实参就是要发出去的东西，先有「发送点」再往回找**；② **改搜「实参名 / 对象名」**（源文搜 `_0x568870` 命中 12 处，靠 `new FormData()` 与连续 `.append(…)` 认出形态，`sign` 就藏在其中一次 `append` 里 ⇒ **关键词搜不到 ≠ 没有**）；③ ★ **不要在静态文本上替换混淆代码，要在运行时把函数「照出来」** —— 打印那个混淆成员（`_0x25869b["UFsia"]`）、**双击结果直接看 `toString`**、发现是「缩略/包装」函数后**逐层替换逐层验证**（★ 与同批的 `static-index-replacement-pitfalls.md` **互为正反面**）；④ 还原出的 `sign` 是 `md5(token + "_" + ts + "_" + nonce)` 形态，⚠️ **未登录时 `token` 是 `undefined` ⇒ 拼接后变成字面量 `"undefined"`，登录前后规则不同，两个状态都要测** |
| 618 | `52pojie-2046628-寻一个会JS堆栈的大佬，帮我解密几个参数生成的代码.md` | `cde7b04ae36888f4fd0b739e7d462f46` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★ **无结论的求助帖 ⇒ 只登记可判定的形态结论**（新文档 `16-ciphertext-structure-diagnostics.md` 的诚实登记范例）：① **跨请求参数依赖** —— `session_id` 由第 1 个接口 `uc-gateway.ykt.eduyun.cn/v1.1/sessions` 下发（响应同时给 `session_id` / `session_key`），随后作为登录请求的字段参与加密 ⇒ 归入「参数溯源三分类」的「上一次响应返回的」，**判据：同一个值在两次请求里重复出现 ⇒ 先找来处，别当纯算输入**；② ★ **密文公共子串判据（本批实跑复核）**：两个样本 base64 解码后**都是 40 字节**、公共尾 **12 个 base64 字符 = 8 字节**、公共前缀 **0 字节** ⇒（CBC 前向扩散）公共尾 ⇒ 明文尾相同；★ **40 不是 16 的倍数 ⇒ 直接排除 16 字节块的 AES-CBC**；而 40 = 5×8 + 公共段恰 1 个 8 字节块 ⇒ 与「8 字节块 DES」或「多段拼接 + 固定尾段」**两种读法都相容，单凭长度无法二选一**；⚠️ **只登记形态结论，不登记任何明文/算法结论**（源文无明文、无验证）；要升级成结论必须补「构造两个已知明文尾部 + 候选 key/IV 逐字节对拍」的实测 |
| 619 | `52pojie-951589-XXXXXX sign算法分析.md` | `7be7c2854672b9986aae2ccba63bca5e` | 2026-09-24 | `miniprogram-reverse` | evolve | ★ **S6 整包 JSON 双校验**（两处 sign 的作用域不同）：内层给**单条记录**做校验 —— 塞占位键 `t.s = "kunpo"` → `md5(JSON.stringify(t) + String.fromCharCode(100))`（★ 末尾那个 `String.fromCharCode(100)` 就是字面量 `"d"`，**看起来像盐却不是盐**）→ 把结果填回 `s`；外层给**整个数据包**做校验 —— `for (var s in t) keys.push(s)` → `keys.sort()` → `k + "=" + t[k] + "&"` 拼接 → **去掉结尾 `&`** → md5（其它接口用这一处）；实现细节：第一处 sign 的**第二个参数是布尔值**，用来与第二处 sign 区分（源文原话「第二个参数 e，实际上就是 True 和 False 的判断」）；★ 三条工程纪律：**服务端返回 `code 1000`（非 0）⇒ 先确认 sign 是否算对，别急着怀疑参数**；**同一份数据在不同接口用不同密钥**（源文自陈「这个位置坑了我很长时间」）；**数值改到极限会被回滚成初始等级**（数据有上限且牵涉其它算法）；⚠️ 源文明确「**校验方式不通用**（不同渠道版本更迭不同）」⇒ **只登记结构形态，不登记常量** |
| 620 | `52pojie-1237897-vx小程序《王富贵的垃圾站》详细教程.md` | `25ddac055af6c16c3526d7cce94f0aee` | 2026-09-24 | `miniprogram-reverse` | evolve | ★ **S7 固定 GUID 前缀 + 明文 JSON**：`sign = md5("<固定 GUID 串>" + gamedata 序列化串)`，源文里的固定串是 `12D7D4DE-AEFA-4032-B796-EA80CD4A00EA`；★ **要区分「前缀硬编码常量」与「gamedata 是整份存档 JSON 的序列化串」**（不是字段拼接）；★ **「下载 → 改 → 上传」闭环**：拉取存档 → 改字段 → 带 sign 回传，**判据「改了数据不改 sign 上传失败 ⇒ sign 确实参与校验」**（与本批 951589 是同一个验证动作）；坑：**`json.dumps` 中文会转成 `\uXXXX` 导致服务端不认 ⇒ 必须 `ensure_ascii=False`**；**注意要改的数值在 JSON 里是字符串类型**（`"money":"2589626"` 这种，改完仍要是字符串）；边界：定位手法是「搜主文件最大 js 里的 `sign` / `getsign` / `saveuserdata` 等关键词」；固定 GUID 是 2020 年该小程序的常量 ⇒ **抄结构不抄常量** |
| 621 | `52pojie-1650555-[油猴脚本开发指南]实战智慧树shadowroot闭包问题.md` | `e621da63637494cb77fe0b0c4a971540` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **「反 hook 检测」这一类**（既有 `antidebug` 预设完全未覆盖）：① **`Function.prototype.toString` 白名单比对** —— 把若干原生函数逐个 `toString()` 过正则判含 `function` / `native code`，任一不匹配就异常上报；检测入口还包括 `window.XMLHttpRequest`、`XMLHttpRequest.prototype.open`、`document.body.attachShadow` 存在性，以及 ★ **`!window.OCS`（油猴管理器变量名本身就是指纹）**；② ★★ **用 `new Error().stack` 做「调用方过滤」** —— 在 `setInterval`/`setTimeout` 包装里 `new Error("大赦天下")` 后 `if (err.stack.indexOf("checkoutNotTrustScript") !== -1) return;` ⇒ **只掐掉来自上报函数的定时器注册、其余一律放行**（提炼为通用范式「**选择性劫持**」；代价：依赖**函数名**，压过混淆就失效）；③ 劫持 `RegExp.prototype.test` 让白名单正则一律返回 `true`（源文自评「那就没啥意义了」，照实写并说明为什么）；④ **closed shadow DOM 取证**：包装 `Element.prototype.attachShadow` 强制 `args[0].mode = "open"` 再 `old.call(this, ...args)`（判据：Elements 里看不到子节点 / `el.shadowRoot === null` / 有内容但 DOM 查不到）；⑤ **框架句柄逃逸**：`document.querySelector('.subject_describe > div > div').parentElement.__vue__.shadowDom.innerHTML` —— **组件把 `attachShadow` 的返回值挂在了 Vue 实例自有属性上** ⇒ DOM 层拦不到也能拿到；⚠️ 函数名/变量名/正则都是**智慧树当时的内联实现细节**，可迁移的是范式不是名字 |
| 622 | `52pojie-1608506-【油猴脚本】去除csdn登录才能复制代码的限制.md` | `036a0652a27ffbb626386009811a6c52` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **页面限制解除配方（先分清改样式还是改函数）**：① `user-select: none` 类限制 ⇒ 对目标节点设**行内** `user-select: text !important`（★ 源文用的是「把字符串拼到 `item.style` 上」的写法 ⇒ **行内 `!important` 能压住作者样式表里的 `!important`**，但也**只在行内生效**，`pointer-events` / `-webkit-touch-callout` 等其它限制词要逐个补）；② ★ **只改样式时按钮仍会弹窗 ⇒ 要重写站点自己的功能函数**（源文把 `window.hljs.signin` 从「弹登录框」改成「全选该 `<pre>` 并复制」），可运行片段走 `Range.selectNode` + `getSelection()` + `removeAllRanges`/`addRange` + `document.execCommand("copy", false, null)`；③ **判据：先看「点按钮时执行的是哪个函数」，再决定改样式还是改函数** |
| 623 | `52pojie-1814333-【油猴脚本】抖音用户主页数据下载.md` | `cd0ab91e838ab76226528af1090aa132` | 2026-09-24 | `target-analysis` | evolve | ★ **「网络面板没有接口但页面有数据」这一侧**（新文档 `in-page-data-carriers.md`）：① 先分清「**没有接口**（SSR 直出）」还是「**没触发**」；② 直出载体 `<script id="RENDER_DATA">` 里是 **URL-encoded JSON** ⇒ **必须先 `decodeURIComponent` 再 `JSON.parse`**（直接 parse 会失败且**不告诉你需要 decode**）；字段路径要**先打第一层 key**（该站点混着 `_location` / `app` 这类非业务键，用户信息在 `user.user.user`、作品列表在 `user.post.data`）；③ ★★ **两个静默陷阱**：源文脚本用 **`self._url` 判断目标接口 —— `_url` 不是标准属性 ⇒ 条件永不成立、一条都不收且不报错**，必须用 **`this.responseURL`**；**覆盖 `this.onreadystatechange` 会顶掉页面自己的回调** ⇒ 用 `addEventListener("load")`；④ 无限滚动驱动（`scrollTo(0, document.body.scrollHeight)` + 到底判据 + 间隔），★ 驱动性价比 **分页参数 > 点「加载更多」 > 滚屏**（滚屏最不可控）；⑤ CSV 导出的两条纪律（`\ufeff` BOM 让 Excel 认 UTF-8、字段含逗号/换行必须加引号）；⚠️ 源文的 `self._url` 与字段嵌套路径是**站点当时的形态**，已在文档里显式标为「源文缺陷写法，不要照抄」 |

## 批次 B33 · 2026-09-24（第三十四次执行）

**开局状态**：台账 B32 后 **623** 条 / 目录 `.md` **1128**（文章 **1123**）/ 待处理 **500**。
三方对齐（台账最后一节 = B32 × `git log` 最新 = `b3e2d98`（归档线第 33 轮）+ `827366c`（B32 收尾）×
自动化记忆最后一条 = B32）**一致** ⇒ 上一轮已闭环。工作区的 `AGENTS.md` / `project/*` 是别会话在途改动，未纳入本批。

**取材口径（严格按记忆里「遗留 / 下一批（B33 更新）」的优先级 ①）**：

- **① 归档线第 32 轮剩下的 11 篇 —— 本批 16 篇里收掉 11 篇（11/11 命中）**：
  抓包方法论系列 4（`854434` / `858631` / `859813` / `962784`）· 油猴杂项 3（`1598299` / `1940437` / `2051222`）
  · 媒体解析 4（`1032509` / `1056398` / `1379263` / `1159049`）。
- **② 归档线第 33 轮（`b3e2d98` 新收 14 篇）里顺手收掉 5 篇「同簇补位」**：
  Windows 抓包指南 ① ②（`976016` / `976142`，与 ① 的 Fiddler 系列同簇）
  · 油猴 3（`1625744` / `1774430` / `2099142`，与 ① 的油猴杂项同簇）。
- **未取**：小游戏改包族 5（**按既定口径继续不列**）；网马时代线（继续不列）；
  验证码簇（本轮无「新题型 / 完整纯算交付」供给）；网盘族（本批无新形态供给）。

> ⚠️ 本轮**未**新增任何技能 —— 16 篇全部有最近邻模块。候选新技能 `captcha-flow-orchestration`
> B5–B33 **二十七次确认不新建**。本批「页面解锁 / 油猴配方」面归入 `web-reverse-hook` 既有能力面
> （以 `references/page-unlock-and-userscript-recipes.md` 落成独立权威源），**仍是 reference 不是新技能**。

**技能变更汇总（4 个技能全部 evolve，0 新建）**

- `target-analysis`（evolve）：新增 `references/capture-layer-tooling.md`（347 行）——
  **「捕获层」是既有 references 完全空缺的一层**（`traffic-purifier.md` 只讲「已抓到的流量怎么提纯」，
  **没人回答「流量凭什么能被抓到、抓不到时是哪一层断的」**）：代理式抓包模型（`127.0.0.1:8888` + 中间人 + 信任根证书）、
  **FiddlerScript 5 类自动改包**（改响应体 / 改请求体 / 改 Cookie / `ui-color` 高亮 / `ActiveXObject` 落盘）、
  AutoResponder（两个勾必须同时具备，少勾 `Unmatched requests passthrough` 会把整站拦死且**极易被误判成反爬**）、
  命令调试（`urlreplace` / `bpu` / `bpafter` / `bps` / `bpv` / `bpm` / `select` / **`allbut` 的真实语义是「删掉非该类型」
  ⇒ 是一条不可逆的「手滑清空」路径** / `>size` / `=status` / `@host`）、
  ★ **两种欺骗路线对照表**（改 Request 骗服务器 vs 改 Response 骗客户端，优缺点逐条照抄源文；
  收束判据 = **「一次性加密的 key 无法靠改 Response 欺骗客户端」**）、
  强制代理（Proxifier 走 **WinSock LSP** 是正规军；SocksCap64 走 **API HOOK + DLL 注入**，
  **腾讯 TP 保护下注入不进去** ⇒ 判据「注入不进去先想到自保护，而不是配错」）、
  **抓不到三形态**：① 自带 HTTP 栈直连 socket（全局代理只对 IE/Chrome、WinInet、内嵌 WebBrowser 三类有效；
  VC/libcurl、Java/URLConnection/OkHttp、C#/System.Net.Http 都绕开系统代理；**例外是 Python `requests` 默认走系统代理**
  —— 源文自己强调「没法一一测试、需要大家反馈」⇒ **不许把这条例外推广成通则**）、
  ② **自带 CA bundle 的证书盲区**（`Tunnel to` 443 后没有下文 + `certificate verify failed` 的组合判据）、
  ③ **本地服务器中转**（源文只给方向、**未展开无验证** ⇒ 只登记形态，**不许补编方法**）、
  ★ **最容易漏的那一项设置 `Resolve hostnames through proxy`**（不勾 ⇒ 代理只收到 `CONNECT 180.97.33.108:443`，
  Fiddler 只能为 IP 颁伪造证书 ⇒ 做校验的客户端就报错；勾上才是 `CONNECT www.baidu.com:443`），
  以及封包字段 / 头部速查（含 **`Process` 列 = 进程 ID ⇒ 把包归因到目标进程的第一判据**、
  **304 响应体为空是逆向高频假象**、**401 + `WWW-Authenticate` 是认证握手第一跳而不是失败**）。`SKILL.md` 新增 §E。
- `web-reverse-hook`（evolve）：新增 `references/page-unlock-and-userscript-recipes.md`（590 行）——
  `anti-hook-detection-and-bypass.md`（B32）的**同族另一面**（那篇讲「怎么不被发现」，本文讲
  「**怎么把页面自己的限制按下去、把页面自己的资源捞出来**」）：★ **控制台断点条件注入法的「逗号表达式 + 恒假尾项」**
  （`d[s]===false&&(d[s]=true),false` ⇒ 永不停下但每次经过都改）、★ **原型/内置方法重写**（判断写在
  `Array.prototype.find` 之下就重写 `find`；**先备份再重写**，`||` 做幂等防二次覆盖）、
  ★ **Vue 路由钩子注入**（`#app.__vue__.$router.afterHooks.push(fn)` 的完整原理链 =
  `this.afterHooks = []` → `afterEach` = `registerHook` = `list.push(fn)` → `Vue.prototype.$router` getter 返回
  `this._routerRoot._router`；**原生层只有字符串、框架层才有 `to`/`from` 结构化对象**）、
  ★ **去水印三条路线的选型**（删标签 / 劫持生成都「改一下特征值就失效」；**在「获取时」改内容才「除非改接口，理论上通杀」**）、
  ★★ **媒体播放解锁完整套路**（**别拦 `pause()`** —— 会让播放器状态机错乱抛 `stalled`/`error.loader`；
  改从源头屏蔽失焦检测；倍速用「取原描述符 + 劫持 set + 锁定开关」丢弃平台轮询重置；
  **MSE 播放器直改 `currentTime` ⇒ `DOMException: aborted`，且 webpack 作用域隔离拿不到内部 API
  ⇒ 改为按进度条 DOM 物理尺寸算绝对坐标、派发 `mousedown→mouseup→click`、400ms 防抖**）、
  ★★ **资源捕获型油猴脚本**（F12 看 `https` 还是有 `blob:https://` 决定用哪个版本；
  三通道监控 vs `MutationObserver` + 生产者-消费者队列；**页码取元素 `data-page`**）、
  以及收束判据「**先分清限制在前端还是校验在服务端，前端解锁只在服务端不复核时有效**」。`SKILL.md` 新增一节。
  ★ 本批真机还实测到一条**源文没写的坑**并已回写：Vue 2 的 `$mount('#app')` 会**替换宿主元素**，
  自建最小复现时根元素不带 `id` 会让 `querySelector('#app')` 返回 `null`（表现为「文档那行明明对却报 null」）。
- `desktop-client-reverse`（evolve）：`references/extension-and-nwjs.md` 新增 **§1.7「直接改本地已安装扩展的 JS」**
  —— 扩展 ID → `Everything` 定位扩展目录 → 改 `controller/setting.js`：把 `return (0, t.useContext)(i);`
  改成先取 `temp`、塞 `temp.app.user = { roles: ["premium","member"] }` 再返回 ⇒ **改完刷新页面即解锁**。
  ★ 与 §1.3 的差别写清楚了：**§1.3 改的是「许可校验的判断」，§1.7 改的是「消费权限的那个对象」**
  （前者要找到赋值处，后者只需找到取用处）。`SKILL.md` 分流表 +1、参考描述同步。
- `stream-drm-reverse`（evolve）：三处增量 ——
  ① `references/playback-address-interfaces.md` 新增 **§2.2c 腾讯旧版 `getinfo` 变体二**（2019）：
  与既有 §2.2b **同一接口的另一种取参数写法**，差异集中在「文件名由 `cl.ci[0].keyid` **重建**」
  （`keyid[0] + ".p" + keyid[1][2:] + "." + keyid[2] + ".mp4"`）与「**CDN 基址取 `ul.ui[3]` 而不是 `[0]`**」；
  ★ 源文那句可疑的 `... + "?vkey=" + fvkey + "?type=mp4"`（第二个 `?`）**照原样保留并标注「源文如此，未做修正」**
  —— 并提炼出纪律「**先按源文跑一遍，把『跑不通』与『源文笔误』区分开，不要一上来就顺手修好**」。
  ② 新增 **§3A 移动 APP 直播源：CCTV 手机电视（2021）** ——
  ★ **判据：HTTP 200 ≠ 拿到可播地址**（`resultCode: "0000"` 而 `playurl` 仍是 base64 密文）；
  「**三段拼接**」密钥（`硬编码前缀 + strings.xml 资源 + JNI native 返回值`）与四个方法的拼接产物；
  `Play-Ua` = **DESede + base64**、`secretToken` = **HMacMD5 后转大写**；
  源文四处**自相矛盾**（`DES_KEY` 尾 `2!` vs `UA_DES_KEY` 尾 `3!`；正文 `cntv2018` vs 结果 `cntv201812`；
  `getUaDesUaKey()` 正文写法丢了 `$#SD&*`）**逐条登记为「源文未澄清」**，并给出「以反编译源码块完整串为准」的口径；
  ★ **审计判据：native 方法先判「参与计算」还是「只做校验」**（源文点开 `j_a`/`j_b` 发现只是 APP 签名校验，
  白花了时间）；**同 APP 双端参数差异**（`wdClientType` 1/2、iOS 的 uuid 全大写、`wdNumber` 范围）；
  **源文明确不公开的两处**（`Afas`/`Filter` 算法、`playUrl` 最终解密 —— 且自陈「本文列举的加解密方法
  依然不能解密 `PlayUrl`」）一律标「源文未公开」，**不补编**。
  ③ 新增 **§3B 短视频「去水印 / 无水印直链」三形态**（`srcNoMark` / `origin_video_download.url_list[0].url` /
  易语言 COM+WinHttp 对照）—— ★ 判据「**去水印的落点是响应里的另一个字段，不是把水印字段删掉**」；
  `did` 是客户端随机伪设备标识 ⇒ **同会话内一致即可，不必复现具体值**。
  ④ `references/hls-and-ts-structure.md` 新增 **§1.5 多候选 m3u8 的挑选判据**
  （`Counter(...).most_common(1)[0][0]` 取「重复出现次数最多」——★ **只当第一猜想、不当结论**：
  「出现次数最多」与「真正被加载」**没有因果关系**）与 **§5.1 整片 AES 的工程骨架**
  （`AES.new(key, MODE_CBC, key)` ⇒ **`key == IV` 整串复用**，与 W 族的「切片式」区分开；
  `zfill(5)` 序号；gevent 并发 **失败单独计数不静默吞掉**；`ffmpeg -f concat -safe 0 -i list.txt -c copy`
  并解释 `-safe 0` 为什么必要）。`SKILL.md` 分流行 +4、失败模式 +4、description 触发词 +3（去水印 / 无水印）。

**★ 本批「自己实跑出来的」增量（两条，都成了通用判据）**

1. **CCTV 两条签名链被独立复算对上**：`DESede + ECB + PKCS5 + base64` 复算源文 `secretToken`
   ⇒ 与源文密文**逐字节相同**；`HMacMD5(getParmasEasyPrivateKey(), secretToken)` 大写 hex
   ⇒ 与源文 `2B918F2C881C7DD2F314B7D6B9DB5382` **完全相同**。
   ⇒ **判据：源文同时给出「明文串 + 中间值 + 产物」时，一定要做一次异语言交叉复算** ——
   这是把「转述可信」升级为「算法可信」的最低成本动作，也让 DESede 的 `ECB`（无 IV）与「24 字节密钥」两件事
   从「源文没写」变成「复算必然如此」。
2. **HTTP 层的 304 / 401 判据被真实往返坐实**（本地临时服务器）：**304 的响应体长度确实为 0**
   （对照：`If-None-Match` 为陈旧值则回到 200 且有 body）；**401 确实带 `WWW-Authenticate`**，
   `Basic base64("alice:s3cr3t") == "YWxpY2U6czNjcjN0"` 可逆 ⇒ 「Basic 就是 base64(用户名:密码)」不再只是转述。

**验收（全部实跑）**

- `check_skill_integrity.js` **全库 0 阻断 0 告警**（台账 623 篇 / 候选 1123 / 待处理 500）。
- `tools/b33-verify-docs.js`（**改动集从 `git status` 派生**，工作区干净时沿 `git log` 回落到
  「最近一次改动了技能文档的提交」以保证提交后可复跑）**0 阻断**：
  完整脚本 **26** 通过 · **函数体片段 4**（包壳通过） · 教学占位 3 跳过 · 路径引用可解析 142 / 不可解析 0。
- ★ **browsercli 真机 Chrome 逐条验证本批文档里写下的「可执行断言」：33 项全绿**
  （`artifacts/skill-evolution/b33-run/`：断言脚本 + `RESULTS.md`）。10 组：逗号表达式恒假尾项 /
  `Array.prototype.find` 重写（含 `||` 幂等与「未命中不动」）/ 失焦事件拦截的**作用域**
  （`document` 丢、元素上同名仍生效）/ `hidden`·`visibilityState`·`hasFocus` 顶掉 /
  `playbackRate` accessor 劫持（平台重置被丢弃）/ 进度条坐标三连 `MouseEvent`（顺序 + `clientX`）/
  `\d{5,}` 命名 / `MutationObserver` **异步**送达（两步法：同步读 0 ⇒ 下一轮 1）/
  ★ **真 Vue 2.7.16 + vue-router 3.6.5 上的 `afterHooks` 注入**（`el.__vue__.$router === router` 同实例、
  `push` 后长度 1、`router.push('/b')` 后钩子**真的被调用**并拿到 `to=/b, from=/`）。
- ★ **Node 独立实跑 13 项全绿**：CCTV 加密链路交叉复算（`verify-cctv-crypto.js`）+
  捕获层 HTTP 判据真实往返（`verify-http-semantics.js`）。
- 台账 **623 → 639** 条 / `verify-ledger-md5.py` 逐条一致 / 幂等复跑 · 待处理 **500 → 484** ·
  双镜像 **9/9 逐字节一致**。

**遗留（本批登记的「单源 / 未复核 / 源文未公开」项，文内已显式标注，勿当结论用）**

1. `976016` 的「**Python `requests` 默认走系统代理**」是**源文明说的待汇集项**（原话「由于没法一一去测试，
   还需要大家的反馈」）⇒ **不许推广成通则**。
2. `976142` 的「反编译判定 HTTP Client 库 → 反编译/重编译、APIHook、Dll 注入、Shellcode」是**源文预告、
   无实例**；`854434` 的「本地服务器中转抓法」是**源文刻意只透露方向**（「只能透露几点」）
   ⇒ 两处都只登记方向，**不许补编步骤**。
3. `859813` 是**二手整理**（源文自述「部分转载」「部分收集于网络」）⇒ 只当**命名对照表**用，不作权威规范；
   其中「`if-Modified-since` ↔ `Last-Modified` 配对」是**源文推断**（源文只分别定义、未明说配对）。
4. `1940437` 是**转述**（源文首行点名原作者 `like御坂美琴` 的 `52pojie-1940297`）⇒ 引用必须连出处一起写。
5. `1774430` 的「**CSS 伪元素 `::part` 直接隐藏不好用**」是**源文未解现象**（源文自陈「不知道是什么原因」）
   ⇒ 照实转述，**不替它编原因**。
6. `2051222` 的两条边界是**源文自己列的**：**不覆盖「前端组装型」电子书**、
   **排序逻辑（截前 5 位以上数字）对部分书不适用**（源文给的手工解法是「手动调整顺序后再导出」）。
7. `1056398` 的「**取重复出现次数最多的 m3u8**」是 **2019 年源文的朴素启发式** ⇒ 只当第一猜想；
   `1000kb/hls/` 与 `key.key` 都是**该站点的目录/文件名形态**，**抄结构不抄常量**。
8. `1032509` 是 **2019 年**腾讯旧路线（今天已改用 `vd.l.qq.com/proxyhttp` + `cKey`）⇒ **引用必须连同年份**；
   列表页 vid 取法源文只说「有能力的自己来」⇒ **未给取法**。
9. `1379263` 的密钥常量与「双端差异」是**该 APP 3.5.3 单版本**的实测；源文**明确不公开** `Afas`/`Filter`
   与 `playUrl` 解密（且自陈「本文列举的加解密方法依然不能解密 `PlayUrl`」）⇒ 只登记结构，
   **缺的部分一律标「源文未公开」**。其中 `cntv2018` / `cntv201812` 等**源文自相矛盾处**已逐条登记。
10. `1159049` 的 `aid=1319` / `cell_type=1` / `app_name=super` 是**当时**取值 ⇒ 站点改版即失效；
    某手那条只给了「换 iPhone UA + 随机 `did` + 从 HTML 截字段」的形态。
11. **B32 遗留继续挂着**（本轮未碰）：`2105967` 的 5 条安全缺陷是单站实测归纳、
    `1163619` 是 2020 年旧路线、`951589` 源文自陈校验方式不通用、`1237897` 的固定 GUID 是 2020 年值、
    `2046628` 是无结论求助帖、`1708851` 的 `key == iv` 单源单版本、`1650555` 的内联实现细节不可迁移、
    `1814333` 的 `RENDER_DATA` 嵌套路径是当时形态。
12. **B31 / B30 遗留继续挂着**（本轮未碰）：斗鱼长期化来源单篇、B 站固定 CDN 前缀是当时实测值、
    虎牙 `sCdnType == "AL"` 口径、B 站「接近永久」是源文推断、`1998689` 响应 Cookie 参与 sign 单站观察；
    百度 §A 的 `42 小时`、阿里云盘三取样点 hash 单源、文叔叔 `16/11` 位单源、
    `jquery-handler` 事件映射对象分支只在 Node 假环境覆盖、`miniprogram-reverse` 排错表的 `RadiumWMPF` 行
    （**连续十轮未碰**）、B30 登记的 5 条「推测项」。
13. 候选新技能 `captcha-flow-orchestration` —— B5–B33 **二十七次确认不新建**；
    候选元技能「本流水线自身的批次作业」**仍待评估**（本批未建）。

**独立复核（如实记录）**

本轮采用**子代理并行蒸馏 + 主控逐条回源复核**的两段式，而非单一的「主控自产自审」：

1. **3 个子代理分工蒸馏**（`capture` / `userscript` / `media`），每份 brief 都带硬性纪律
   「严禁编造 · 常量逐字一致 · 源文推断处标注 · 源文未解处只登记不补解释 · 跨技能引用必须写 `../../`」。
   产出质量稳定：**0 编造**，并主动指出源文缺陷 2 处
   （`1379263` 的 `DES_KEY` 尾 `2!` vs `UA_DES_KEY` 尾 `3!`、正文 `cntv2018` vs 结果 `cntv201812`；
   `859813` 的二手转载属性）。
2. **主控逐条回源复核**：把子代理自报的「逐字引用常量清单」与源文逐条对照；
   发现并修掉 **5 处悬空跨技能引用**（3 处在 `capture-layer-tooling.md`、2 处在
   `page-unlock-and-userscript-recipes.md`：子代理写了 `../<skill>/…`，从 `references/` 目录内
   必须退两级 `../../<skill>/…`，否则会被 `check_skill_integrity.js` 判 BLOCK）——
   这三处若不自查，会以「子代理报 0 阻断」的姿态静默通过。
3. **机器侧独立证据（不是自证）**：33 项 browsercli 真机 Chrome 断言 + 13 项 Node 独立实跑
   （CCTV 加密链路异语言复算 2 条 + 捕获层 HTTP 判据真实往返 11 条）——
   其中 **CCTV 的两条签名链（DESede+base64 / HMacMD5）已被独立实现逐字节复现**，
   这是本批对源文可信度的**最强提升**。
4. **门禁不自证**：`b33-verify-docs.js` 的改动集从 `git status` 派生（工作区干净时沿 `git log` 回落），
   确保提交后仍可复跑；本批它**立刻抓到 4 处代码块语法问题**（3 新 + 1 历史遗留），
   随后把门禁升级为「完整脚本 / 函数体片段（包壳复验）/ 真错误」三态 ——
   **不是放宽标准，是把「片段」这一类从静默跳过改成可见通过**。

**残留不确定性（已在上方「遗留」逐条列出，不重复）**：源文未公开 2 处（`Afas`/`Filter`、`playUrl` 解密）、
源文未解 1 处（`::part` 隐藏水印不好用）、源文自相矛盾 3 处（DES 常量尾位、`cntv2018`/`cntv201812`、
`getUaDesUaKey()` 正文写法）、单源未复核 4 处（`requests` 走系统代理、`976142` 攻方落点无实例、
`854434` 本地中转无步骤、`1032509` 列表页 vid 取法未给）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 624 | `52pojie-854434-Fiddler大解析！抱歉，抓包抓得好真的可以为所欲为。.md` | `14f95f37f6a5f90fbe4c3a6d95785ad7` | 2026-09-24 | `target-analysis` | evolve | ★★ **「抓包 = 让流量经过代理」这条根**：Fiddler 以 web 代理形式工作（`127.0.0.1:8888`），HTTPS 解密 = **中间人**、前提是客户端信任根证书（`Actions → Trust Root Certificate`）；★ **FiddlerScript（`CustomRules.js`，JScript.NET）5 类自动改包**：`GetResponseBodyAsString()` + `Fiddler.WebFormats.JSON.JsonDecode` → 改 `responseJSON.JSONObject['付费']` → `JsonEncode` → `utilSetResponseBody`；`GetRequestBodyAsString()` → `replace` → `utilSetRequestBody`；`oSession.oRequest["Cookie"]`；`oSession["ui-color"]="red"`；`utilDecodeResponse()` + `ActiveXObject("Scripting.FileSystemObject")` 落盘 `D:\Sessions.txt`；★ 动机判据原话「每次下完断点，修改完再提交，总会网络超时或者 APP 超时。这该怎么办？难道只能靠手速？」⇒ **脚本化改包解决的是「抢手速」问题**；入口判断三种写法别混用语义（`fullUrl.Contains` / `uriContains` / `HostnameIs` **只比主机名**）；★ 两个**盲区形态**：① APP **检测 wifi 代理**（一开代理就无法正常使用 ⇒ 判据「一开代理就断网先怀疑代理检测，而不是"包没走到代理"」）；② **本地服务器中转**（点名麻花影视、电视家）—— **源文刻意只透露方向**（「这边只能透露几点，不能正大光明地公布」）⇒ 只登记形态、不补编方法 |
| 625 | `52pojie-858631-【Fiddler为所欲为第二篇】像OD一样调试.md` | `879c5600474c7a6e7de6eb17f05f3508` | 2026-09-24 | `target-analysis` | evolve | **Fiddler 的「调试器」面**（源文定位「可以说是抓包界的 OllyDbg 并不为过」）：★ **AutoResponder** 全流程（`Enable automatic responses` + `Unmatched requests passthrough` **两个勾必须同时具备** —— 少勾后者会把整站资源拦死、页面像坏了，**极易被误判成反爬**；`regex:` 是**首行前缀标记**；替换目标支持本地文件与另一线上地址）；★ **命令调试**：`urlreplace A B`（等价 `oSession.hostname='...'`，不带参数即复位）、断点 `bpu`（请求前）/ `bpafter`（响应后）/ `bps`（按状态码）/ `bpv`·`bpm`（按 method）；★ **过滤器命令的语义坑**：`allbut`（别名 `keeponly`）**真实语义是「删掉非该类型」** ⇒ `allbut <不存在的类型>` 等同 `cls` **清空全部会话**（不可逆，**用前先导出**）；另有 `select <type>` / `?text` / `>size` `<size` / `=status` / `@host`；★ 限速 `Rules → Performances → Simulate Modem Speeds`（由 `m_SimulateModem` 与 `request-trickle-delay=500` / `response-trickle-delay=150` 毫秒/KB 控制）；★ **「逆向」最小闭环**：用 `ctrl+F` 搜「下断点的那个网址」⇒ **反向定位是哪个接口/响应产生了这个地址** |
| 626 | `52pojie-859813-【Fiddler为所欲为第三篇】封包逆向必备知识.md` | `6c871a16b2e550aa8b88c4ab04083296` | 2026-09-24 | `target-analysis` | evolve | **读包时的命名对照表**（口径：源文自述「部分转载」「部分收集于网络」⇒ **二手整理，不作权威规范**）：Fiddler 列表十列（Result / Protocol / HOST / URL / Body / Caching / Content-Type / **Process = 发送此请求的进程 ID** ⇒ **把包归因到目标进程的第一判据** / Comments / Custom）；Request 头域六分组（Cache / Client / Cookies / Entity / Security / Transport / Miscellaneous）与 Response 头域分组；★ 三处**可迁移判据**：① `if-None-Match` ↔ `ETag` 配对（源文明示）且**命中缓存返回 304 ⇒ 响应体是空的** ⇒ 「接口明明正常过、现在响应体是空的」是高频假象，**先看 `Result` 是不是 304**；② `if-Modified-since` ↔ `Last-Modified` 的配对是**源文推断**（源文只分别定义、未明说配对）；③ **HTTP 认证四步**（无 `Authorization` ⇒ 401 + `www-Authenticate` ⇒ 客户端 `base64(用户名:密码)` 放 `Authorization` ⇒ 服务端校验），**OAuth 相对 HTTP 的差别就是 `Authorization` 里放 token 而不是用户名密码** ⇒ 判据「401 不是失败，是认证握手的第一跳；这一跳之后的那条请求里的 `Authorization` 才是要复现的凭据」 |
| 627 | `52pojie-962784-【Fiddler为所欲为第五篇】破解必备思路.md` | `f4d30f8bd19920bdf37b6777ecefe22b` | 2026-09-24 | `target-analysis` | evolve | ★★ **本簇迁移价值最高的判据表 —— 两种欺骗路线**（场景：A 已付费绑定设备 `123456`，B 想用同一 APP）：**欺骗服务器 = 改 Request**（下断点把 `udid:654321` 改成 `udid:123456` 再提交）vs **欺骗客户端 = 改 Response**（把 `staus:1` / `endtime:2019-05-23` 改成自己的值）；**优点/缺点逐条照抄源文** —— 欺骗服务器「后台只会显示小米 9 一直在换着地方登陆，而不会有过多的猜想」但「**必须已经有一台付费的设备**」；欺骗客户端「**无需付费的设备**、只看最后结果」但「**若为加密算法、绑定了其他的信息，则会破解失败**」；★ **收束判据（源文原话）：「若服务器返回的 key 是一次性加密的，则无法做到欺骗客户端」** ⇒ **一次性加密的 key 改 Response 也过不了校验**；两条路线落地位置：脚本侧（`utilSetRequestBody` / `oRequest["Cookie"]` vs `utilSetResponseBody`）与断点侧（`bpu` vs `bpafter`） |
| 628 | `52pojie-976016-Windows抓包指南①：Proxifier+Fiddler对第三方程序强制抓包.md` | `08d709848a313d6460011f22d7638f42` | 2026-09-24 | `target-analysis` | evolve | ★★ **「全局代理只对哪些程序有效」的条件表**（源文逐字三条）：IE/Chrome 等浏览器、程序使用 **WinInet** 库、程序**内嵌 WebBrowser 控件**；**反面根因**：VC/libcurl、Java/URLConnection/OkHttp、C#/`System.Net.Http` 这些库**自带 HTTP 封装与拆解 ⇒ 最终直接调 socket API**，操作系统给不了它代理；★ **例外最容易记反**：**Python `requests`** 不显式设代理时会**走系统全局代理**因此能抓到 —— 但源文明说「没法一一去测试，还需要大家的反馈」⇒ **不许推广成通则**；★ 两条判定动作：`Depends` 看是否依赖 **`WININET.DLL`**（源文例：招商银行专业版 PC 网银客户端）、`spy++` 看是否内嵌 WebBrowser；★ **强制代理两工具对照**：**Proxifier**（「正规军，使用了 Windows 提供的正规接口，通过安装 **WinSock LSP 模块**过滤/转发 TCP/UDP 包」，「稳定性和兼容性更好」）vs **SocksCap64**（「**API HOOK** + **DLL 注入**」，「但不是所有程序都随便给你注入的，比如**腾讯 TP 保护下的游戏客户端**」）⇒ 判据「**注入不进去先想到自保护，而不是配错**」；★ **最容易漏的那一项设置**：`Profile → Name Resolution → Resolve hostnames through proxy` —— 不勾时 Proxifier 自己解析域名，向 Fiddler 发 `CONNECT 180.97.33.108:443`，**Fiddler 只能为 IP 颁发伪造证书 ⇒ 做校验的客户端就报错**；勾上后发 `CONNECT www.baidu.com:443`，才能为正确域名颁证 |
| 629 | `52pojie-976142-Windows抓包指南②：Fiddler抓不到的包是怎么回事？.md` | `bc477103270282a525097abb3813a779` | 2026-09-24 | `target-analysis` | evolve | ★★ **证书盲区的组合判据**：现象 = Fiddler 里**只有 `Tunnel to` 443、之后没有下文** + 目标程序**表现为无法联网/功能异常**；根因 = 该程序所用 HTTP 库**自带一套可信任的 SSL 根证书、不读操作系统的**（Python `requests` 自证：官方文档原话「Requests bundled a set of root CAs that it trusted, **sourced from the Mozilla trust store**」），自然不信任我们装进系统的 Fiddler 根证书 ⇒ `OpenSSL.SSL.Error: … 'certificate verify failed'`；**两条解法**：① 客户端**禁用证书校验**（`requests.get(..., verify=False)`）；② 让客户端**信任 Fiddler 根证书**（`http://127.0.0.1:8888` 下载 `FiddlerRoot.cer` → `openssl x509 -inform der -in FiddlerRoot.cer -out fiddler.pem` → `verify="./fiddler.pem"`）；★ 源文的**复现方法论**值得单列：**自己写一个程序、自己抓自己的包**把「哪个环节出错」钉死；★ **攻方落点**（**源文只给方向、预告后续文章、无实例**）：先反编译判定目标用的是哪个 HTTP Client 库（「一般很少有程序会自行实现一个 HTTP Client」），再按该库的公开 API 用「反编译/重编译、APIHook、Dll 注入、Shellcode」让它禁用校验或信任证书 |
| 630 | `52pojie-1598299-【油猴脚本】gitbookVIP解锁.md` | `0a34c69853a53750955aabefb82d15b6` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **控制台断点条件注入法**（源文自述自创手法）：条件断点写 `d[s]===false&&(d[s]=true),false` —— **逗号表达式从左到右求值、返回最后一项**：前半段执行副作用（把 `false` 改成 `true`），**最后一项恒 `false` ⇒ 断点判定永假、永不停下，但每次经过都自动改值**；判据：手改一次内存**刷新即失效**，条件断点的价值正是「每次执行到这一行都改」；**边界：临时验证手段，正式产物走原型重写**。★ **原型/内置方法重写（从 native 层入手）**：判断写在 `let d = DDe.find(f=>f.key === e)` 之下 ⇒ 重写 `Array.prototype.find`，用**数组内容特征**（`JSON.stringify(this).includes('github-sync')`，源文原话「理论来说任意一个不会在数组里重复定义的都可以」）区分「该管的那次调用」，命中就把所有 `false` 改 `true` 再委托原函数；★ **纪律「先备份再重写」**：`[].constructor.prototype._find = [].constructor.prototype._find \|\| [].constructor.prototype.find;` —— **不备份就把原生 `find` 永久覆盖掉**，`\|\|` 做**幂等写入**防止二次注入把备份也换成自己的版本；`[].constructor` 与 `Array` 等价（源文原话「你要是愿意，直接用 `Array` 也行」）；★ 定位链条：从**界面文案**（`Upgrade!`）入手 → 向上找关键变量赋值 → 顺藤摸瓜找唯一定义（勾区分大小写）→ 看不懂就函数首行下断点动态调 |
| 631 | `52pojie-1940437-【教程】Circle 阅读助手付费功能解锁.md` | `f05045b5fe3dae18b54d9895b3a69f0b` | 2026-09-24 | `desktop-client-reverse` | evolve | ★ **浏览器扩展的第三条用途：直接改本地已安装扩展的 JS（不重打包、不签名）**：`chrome://extensions/` 找到目标扩展 → 详情 → 复制 ID（源文例 `dhpfcgilccfkodnhbllpiaabofjbjcbg`）→ 用 `Everything` 按 ID 搜到扩展目录 → 打开 `controller/setting.js` → `Ctrl+H` 把 `return (0, t.useContext)(i);` 改成「先取 `let temp = (0, t.useContext)(i);`，往上面**注入伪造的权限对象** `temp.app.user = { roles: ["premium","member"] }`，再 `return temp;`」⇒ **保存后刷新页面即解锁**；★ **与既有 §1.3 的分工写清楚了**：§1.3 改的是**许可校验的判断**（状态机 / 令牌 / 校验函数），本节改的是**消费权限的那个对象**（直接给 `app.user` 塞 `roles`）—— **前者要找到赋值处，后者只需找到取用处**；★ 三条纪律：① 这是**改本地文件、不碰服务器** ⇒ **只在扩展把权限判断放在前端时有效**；② 改完**必须刷新页面**（源文原话「如果已经缓存页面了的，重新刷新页面即可」，已缓存的页面不会生效）；③ 该篇是**转述**（源文首行点名原作者 `like御坂美琴` 的 `52pojie-1940297`「Circle 阅读助手 v3.1.2 逆向笔记」）⇒ **引用必须连出处一起写** |
| 632 | `52pojie-2051222-【油猴脚本】flbook 导出PDF插件.md` | `5ba560bf5a9ccab9bc3a53b30b5e3e5f` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **资源捕获型油猴脚本的两版本选型判据**：F12 网络面板刷新并翻页 —— **能看到完整 `https` 图片 URL 且含长数字 ⇒ 用「URL 截取版」**；**只能看到 `blob:https://…` ⇒ 必须用「图片捕获版」**（`blob:` = 数据经动态处理后才显示）。**URL 截取版**：三通道同时监控 `fetch` + `XMLHttpRequest.prototype.open` + `PerformanceObserver`（后者补 `<img>` 直接加载的资源）；文件名用 `url.match(/\d{5,}/g)` 提 **≥5 位连续数字**、`join('-')`，后缀从 `contentType.split('/')[1]` 取并 `jpeg→jpg`；URL 匹配模式可持久化。**图片捕获版**：`MutationObserver` 盯 `document.body` 的 `childList`（`subtree:true`），命中 `div.pdfimg.move.rendered` 才入队；★ **生产者-消费者下载队列**（`fetchQueue` + `processingUrls:Set` 去重 + `isWorkerRunning` 单飞，一次只下一个、`setTimeout(processFetchQueue,50)` 续跑）；**启动先扫一遍已存在节点**；★ **页码从元素的 `data-page` 属性取**（比按 URL 数字排序可靠 —— 数字可能只是资源 ID）；**两条工程纪律**：必须**完整翻页**（懒加载不翻就抓不全）、下载必须**队列化**（并发大批量会把浏览器卡死）；边界（源文自列）：**不覆盖「前端组装型」电子书**、排序逻辑对部分书不适用（手动调序） |
| 633 | `52pojie-1625744-[油猴脚本开发]监听Vue路由改变.md` | `6fe75a6f23ac9cb5ef8c6cdc50dbed8d` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **Vue 路由钩子注入的完整原理链**（源文逐条给出）：① vue-router 在**实例初始化**时建 `this.beforeHooks = []` / `this.resolveHooks = []` / `this.afterHooks = []`；② `VueRouter.prototype.afterEach` 的实现就是 `return registerHook(this.afterHooks, fn)`，而 `registerHook(list, fn)` 的实质是 **`list.push(fn)`**（返回一个「取消注册」闭包）；③ `Object.defineProperty(Vue.prototype, '$router', { get: function get () { return this._routerRoot._router } })` ⇒ **任何 vue 实例都能拿到 router**（一路向上取根实例的 `_router`）；④ 而 `#app` 上**通常就有 `__vue__`** ⇒ 源文一行 `document.querySelector('#app').__vue__.$router.afterHooks.push(()=>{console.log('路由发生改变')})`。★ **判据：监听路由的两条路，先选对层** —— **原生层**（history 模式拦 `history.pushState`；hash 模式听 `popstate`/`hashchange`）**只有字符串地址**；**框架层**（注入 `afterHooks`）**能拿 `to`/`from` 结构化路由对象**。三种模式：`history`（无 `#`）/ `hash`（带 `#`）/ `abstract`（源文原话「普通开发还不怎么常用」） |
| 634 | `52pojie-1774430-【油猴脚本】温馨遗言去水印——支持自定义水印文本.md` | `23212ca07035df8fad342ea077e9ed0e` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **去水印三条路线与选型**（源文原话逐条）：①「识别对应的标签，删掉」——「**但是只要改一下特征值就直接失效**」；②「修改水印生成时的代码，劫持掉不让他生成」——「**问题同上**」；③「**在获取时修改水印内容**」——「**除非改接口，理论上通杀**」。**源文选 ③**：①②都挂在「水印的模样」上（删标签依赖标签特征、劫持生成依赖生成代码位置），站点一改特征或换生成路径即失效；③挂在**数据流**上。源文自嘲「肯定选择最简单的办法：通过 MITM 实现供应链攻击（不是，其实就是第三个方案。。老劫持了）」；★ 交付形态：双击右上角头像输入框填内容即为自定义水印；★ 附带经验：「顺便还实现了自定义水印，还顺便去了图片的水印」「（为了分析顺便还去掉了断点检测）」；★ **源文未解现象（登记，不补解释）**：「尝试使用 css 伪元素 part 去直接隐藏的话好像不好用，**不知道是什么原因**」 |
| 635 | `52pojie-2099142-【油猴脚本】视频播放优化：B站 学堂在线 中国大学MOOC.md` | `ebe676c17249e197d0baa4bbcf26de68` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **媒体播放解锁的完整套路（本批技术密度最高）**：① **切屏/失焦秒暂停** —— **别拦 `pause()`**：源文实测拦底层 `HTMLVideoElement.prototype.pause` 或 jQuery `trigger('pause')` 会**导致播放器内部状态机错乱**、引发 `stalled` / `error.loader` 节流假死；正确做法是 `@run-at document-start` **从源头屏蔽失焦检测**（重写 `EventTarget.prototype.addEventListener`，对 `['visibilitychange','webkitvisibilitychange','blur','focusout','pagehide','mouseleave']` 且 **`this` 为 `document`/`window`** 的注册直接丢弃 —— **别把全局 `addEventListener` 打死**；`killSetter` 安置空 setter；`Object.defineProperties(document,{hidden/visibilityState/webkitHidden})`；`Document.prototype.hasFocus = () => true`）。② **倍速被轮询重置** —— 平台定时器轮询 `playbackRate` 比对 UI 后强制重置 ⇒ **先用 `Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'playbackRate')` 取原 setter**，再劫持 `set: function(v){ orig.set.call(this, isLocked ? mySpeed : v) }`，用 `isLocked` 开关**丢弃平台写入**。③ ★★ **`currentTime` 直改 ⇒ `DOMException: aborted`** —— 平台是 **MSE 播放器**，直改会**绕过内部缓冲管理器**导致状态机崩溃；且**webpack 作用域隔离**使外部拿不到其内部封装的 jQuery API ⇒ **解法：按进度条 DOM 物理尺寸算绝对坐标、派发原生 `MouseEvent`**，让播放器自己的缓冲逻辑跑。④ ★ **事件链路要派全**：中国大学 MOOC 的进度条监听的是 **`mousedown` 而非 `click`** ⇒ 依次派发 `mousedown → mouseup → click`（选择器：学堂在线 `.xt_video_player_progress`、中国大学 MOOC `progresswrap`，**是当时的类名**）。⑤ ★ **400ms 防抖**：高频连按会瞬间产生大量请求再次搞崩 MSE ⇒ 连按期间**只更新 OSD**，停手 400ms 后才做**唯一一次**坐标点击。⑥ 快捷键用 `e.code`、`preventDefault` + `stopImmediatePropagation`，且**先判焦点不在 `input`/`textarea`/`contentEditable`**（否则做笔记时按键全被吃）。★ **边界（源文自述）**：「有服务端强制校验的课程，过高倍速/拖拽可能**进度无效**」 |
| 636 | `52pojie-1032509-腾讯视频真实视频地址解析.md` | `c52171bbc08adadbcc0a5d2c02143515` | 2026-09-24 | `stream-drm-reverse` | evolve | 腾讯 `vv.video.qq.com/getinfo` 的**第二种取参数写法**（2019，与既有「2020 前旧路线」**同接口不同写法**）：`vid` = 播放页 URL 最后一段去扩展名；请求 `…?otype=json&platform=11&defnpayver=1&appver=3.2.19.333&defn=fhd&vid=<vid>`；★ 响应是 `QZOutputJson=…;` 形态 ⇒ `re.findall('QZOutputJson=(.+);$', …)[0]` **剥壳后再 `json.loads`**（与既有判据同一档，交叉引用不重复）；★ **本变体二的两个指纹**：① 文件名**由 `cl.ci[0].keyid` 重建**（`keyid` 按 `.` 分三段 ⇒ `keyid[0] + ".p" + keyid[1][2:] + "." + keyid[2] + ".mp4"`，**第二段要去掉前 2 个字符**）；② CDN 基址取 **`vl.vi[0].ul.ui[3].url`（下标 3，不是 0）**；★ **源文那句可疑的第二个 `?`**（`cdn + filename + "?vkey=" + fvkey + "?type=mp4"`）**照原样保留**并标注「源文如此，未做修正」⇒ **纪律：先按源文跑一遍，把「跑不通」与「源文笔误」区分开，不要一上来就顺手修好**；页面形态判据：`/x/page/<vid>.html` ⇒ 完整视频，`/x/cover/<cid>/<vid>.html` ⇒ **需逐个下载再合并**（列表页 vid 取法源文**未给**） |
| 637 | `52pojie-1056398-m3u8视频下载分享.md` | `d0440a4d002b9c4fe3e6816f0221fbd0` | 2026-09-24 | `stream-drm-reverse` | evolve | ★ **多候选 m3u8 的挑选判据**：`Counter(re.findall("http.*?index\.m3u8", r.text)).most_common(1)[0][0]` —— **取「重复出现次数最多」的那一条**（源文原话「找到提取内容重复次数最多的链接」）；★ **口径必须收紧**：这是 **2019 年源文的朴素启发式**，「出现次数最多」与「真正被加载」**没有因果关系**，只当**第一猜想**；路径归一 `index.m3u8 → 1000kb/hls/index.m3u8` 是**该站点目录形态，抄结构不抄常量**。★ **加密判据**：m3u8 文本含 `URI="key.key"` ⇒ 把 `index.m3u8` 替换成 `key.key` 取密钥；**`AES.new(key, AES.MODE_CBC, key)` ⇒ `key == IV` 整串复用**（与 W 族的「切片式（前 16/后 16）」区分开，同族另一样本）。★ **工程骨架**：`re.findall('(\w*?\.ts)', r.text)` + **序号 `str(index).zfill(5)` 补齐 5 位**（保顺序、便于排序与续传）；URL 用 `m3u8_url.replace("index.m3u8", ts)` ⇒ **相对分片名按 m3u8 目录拼绝对地址**；`gevent.pool.Pool(50)` 并发且**失败单独计数不静默吞掉**（否则「缺了几片」要到合成时才暴露）；合成 `(for %a in (*.ts) do @echo file '%a') > list.txt` + **`ffmpeg -f concat -safe 0 -i list.txt -c copy`**（`-c copy` 不重编码；★ **`-safe 0` 的必要性**：concat 默认走安全协议白名单，清单里是相对/特殊协议路径时会被拒（`Unsafe file name`）） |
| 638 | `52pojie-1379263-【吾爱首发】“CCTV手机电视” APP请求直播源地址分析.md` | `73db23cecb11cdec7fcd99633543aeb4` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ **APP 端直播源构造的完整解剖（本批最重的一篇）**：入口 **POST `http://m.cctv4g.com/cntv/clt/programAuthAndGetPlayUrl.msp`**（请求头 5 个、请求体 20 多个参数）；★ **判据：HTTP 200 ≠ 拿到可播地址** —— `resultCode: "0000"` 而 **`playUrls[0].playurl` 仍是 base64 密文**（源文原话「即使接口请求成功，发现 playUrl 也被加密了」）；★ **「三段拼接」密钥** = `硬编码前缀 + strings.xml 资源 + JNIUtils.NFromJNI 返回值`，四个方法产物：`getParmasEasyPrivateKey() = 72116AcB!94C4*4F89#k76BdB`、`getParmasEasyPublicKey() = cntv201812`、`getUaDesUaKey() = &*UJyui23DR%$#SD&*56HJ3!`、`getHeaderAesKey() = yichengtianxia12`；★ **两条签名链消费同一个明文串**：`secretToken 原文串` = `timestamp=…&wdVersionName=…&wdChannelName=…&wdClientType=1&wdAppId=3&publickey=…&wdNumber=<0..999>&uuid=…&userId=` ⇒ `Play-Ua` 头 = **`DES3.encryptMode(secretToken)`（`DESede` + base64，可逆）**，请求体 `secretToken` 字段 = **`HMacMD5(getParmasEasyPrivateKey(), secretToken)` 转大写（不可逆校验）**——★ **本批已用 Node 独立复算把两条链逐字节对上**（见批次小结）；★ **源文四处自相矛盾逐条登记**：`DES_KEY` 尾 `2!` vs `UA_DES_KEY` 尾 `3!`（只差 1 字符）、正文 `cntv2018` vs 结果 `cntv201812`、正文 `getUaDesUaKey()` 写法丢了 `$#SD&*`；★ **审计判据：native 方法先判「参与计算」还是「只做校验」**（源文点开 `j_a`/`j_b` 发现只校验 APP 签名 —— 原话「其实看到 `return` 也会发现，`j_a`、`j_b` 根本不需要分析」，起初白花时间）；★ **双端参数差异**（`wdClientType` 1/2、iOS 的 uuid **全大写**、`wdNumber` 范围 iOS 可能 `[0,1000000)`）；★ **源文明确不公开两处**（`Afas`/`Filter` 算法；`playUrl` 最终解密 —— 且自陈「**文章中列举的加解密方法依然不能解密 PlayUrl**」「解密 PlayUrl 方法被爱加密抽走了，即使脱壳反编译成功也无法找到源码」）⇒ 只登记结构，**缺的一律标「源文未公开」不补编**；附带 `nodeId=9000000000` 代表 cctv1 |
| 639 | `52pojie-1159049-【原创源码】某手视频去水印解析 易语言纯源码 没有使用模块.md` | `f3ad99a57d8d4f144ffde19083801ec6` | 2026-09-24 | `stream-drm-reverse` | evolve | ★ **短视频「无水印直链」的形态学**（易语言 + Python 双实现）：**某手分享短链** —— 带 `Cookie: did=web_<32 位随机小写字母数字>` + **iPhone UA**（原样抄）请求，`allow_redirects=True` 跟 302，从返回 HTML 按 `"srcNoMark":"` … `"},"user"` 之间截 mp4 直链；★ **判据：去水印的落点是响应里的「另一个字段」，不是把水印字段删掉**；★ **`did` 是客户端随机伪设备标识** ⇒ 与签名里的随机值一样，**同会话内一致即可、不必复现具体值**（源文两版生成方式不同：Python 是 32 位随机小写字母数字、易语言是 `取数据摘要(ToBin(rnd(1,50)))`，**都只是「随机」，不构成算法**）；**皮皮虾/抖音系 id 直取** —— `is.snssdk.com/bds/cell/detail/?cell_type=1&aid=1319&app_name=super&cell_id=<id>`，`allow_redirects=False`，取 `data.data.item.origin_video_download.url_list[0].url`（★ `aid`/`cell_type`/`app_name` 是**当时**取值 ⇒ 站点改版即失效）；★ **易语言（COM/WinHttp）写法** —— `CoInitialize(0)` **必须先调**（COM 线程初始化）→ `CreateObject("WinHttp.WinHttpRequest.5.1")` → `open`/`SetRequestHeader`/`send` → `GetProperty("ResponseText")`，并配自定义 `rightxm(起止串截取)` = 「找起始串 → 跳过它 → 找结束串 → 取中间」；★ **提炼：只要拿到「请求头 + 参数变换」，换语言只是语法翻译** —— 源文正是用「易语言源码 + 附 Python 对照实现」给出双语言等价 |

## 批次 B34 · 2026-09-24（第三十五次执行）

**开局状态**：台账 B33 后 **639** 条 / 目录 `.md` **1143**（文章 **1138**）/ 待处理 **499**。
三方对齐（台账最后一节 = B33 × `git log` 最新 = `5684948`（归档线第 34 轮）+ `f0fdbf7`（B33） ×
自动化记忆最后一条 = B33）**一致** ⇒ 上一轮已闭环。工作区的 `AGENTS.md` / `project/*` 是别会话在途改动，未纳入本批。

**取材口径（严格按记忆里「遗留 / 下一批（B34 更新）」的优先级 ①）**：

- **① 归档线第 34 轮（`5684948` 新收 15 篇）—— 本批 16 篇里收掉 15 篇（15/15 命中，全取）**：
  小游戏 / 小程序 4（`828363` / `832333` / `974827` / `1872067`）· 媒体与反混淆 3（`1637348` / `1749758` / `1471146`）
  · 内容门控 2（`1799911` / `1801614`）· 反调试与挑战 3（`1208999` / `1485179` / `1496350`）
  · 5 秒盾 1（`1500547`）· OB cookie 1（`1888223`）· 平台签名 1（`1638865`）。
- **② 归档线第 33 轮（`b3e2d98`）的残留 1 篇**：`1503959`（与 ① 的内容门控同簇，一次收完）。
- **未取**：网马时代线（继续不列）；验证码簇（本轮无「新题型 / 完整纯算交付」供给）；
  网盘族（本批无新形态供给）；`T10` 媒体链路族的**其余**条目（**只收带完整算式的**，本批收了 2 篇）。

> ⚠️ 本轮**未**新增任何技能 —— 16 篇全部有最近邻模块。候选新技能 `captcha-flow-orchestration`
> B5–B34 **二十八次确认不新建**；候选元技能「本流水线自身的批次作业」**仍待评估**（本批未建）。

**技能变更汇总（7 个技能全部 evolve，0 新建）**

- `miniprogram-reverse`（evolve）：`minigame-and-unity-wasm.md` 新增 **§2.1 引擎封装链（Laya：`HttpPost` → `LayaHttpRequest` → `wx.decrypt` → `RdWXBizDataCrypt.js`，"同名多处命中只认 `function` 定义"）**
  与 **§5.7 抓包定位自建服务器（排除 `qq.com`/微信域名 + 时间窗筛选 + Charles `SSL Proxying` 必配 `*`）**；
  §5.1 补「**按 `sign` 类型在 `secret`/`secret1` 间切换密钥**」的早期独立来源；§1 补「**加载到 100% 卡住也别死磕**」；
  `request-crypto-and-sign.md` 新增 **§3.1「拿 oracle：把方法体直接替换掉」（完全不需要知道 key/iv）** 与
  **§6 变体「无签名的明文存档」（版本字段 / 先关游戏 / 非 200 重取 三个时序坑）**；
  `unpack-and-decrypt.md` 修复清单 +2（`wx-scope`→`scope`、`VM2_INTERNAL_STATE_...handleException(e)`→`e`）
  与「**分享 → 删除 → 从分享卡片重进**」的强制重下载取包法；`SKILL.md` description 触发词 +3、排错表 +2、反例 +3。
- `stream-drm-reverse`（evolve）：`key-wrapper-families.md` **新增第七族 W7**（「许可接口下发 + 前缀剥离 + 隔 2 异或 + `popcount` 修正」，
  含**逐字节可复算片段**与 **§8 复跑命令**），§2 总表 +1 行、§7 坑表 +3 行；`hls-and-ts-structure.md` 新增 **§4.6.1 操作层**
  （`vid` 必须取**带后缀全名**、hex 输入、**「分片全下完只有合并报错」= key 解密密码不对** 这条假成功判据）；`SKILL.md` 分流表 +1、失败模式 +1。
- `ast-deobfuscation`（evolve）：`ob-variant-taxonomy.md` 新增 **§4.1 实测样本**——★ **「同一个字符串自比」`if ("X" !== "X")` 整块死代码 = 代理对象没还原的指纹**、
  ★ **解码函数识别启发式（名字长 2 + 以 `a`/`b` 开头 + 只接 1 参）**（并**指出源文那行条件的运算符优先级缺陷**）、两趟顺序与收尾、两条**源文未解决项**。
- `web-reverse-hook`（evolve）：`page-unlock-and-userscript-recipes.md` **新增 §7 内容门控三通路**（轮询接口搬本地 / 重写校验函数「先存原引用再同名顶掉」+ **函数提升陷阱** /
  找下发接口；★ 判据「**看着像 token 的参数其实是 base64**」，`b64DecodeUnicode` 固定写法），
  §1 补「赋值型条件断点**必须**补 `,false` 的因果」与 **§1.1 从判断点顺到真实副作用（搜赋值函数名 → 搜 `watch`）**、
  **§1.2 只读 getter 的 `defineProperty` 重定义**，§5.2 补**反面：平台先劫持宿主属性**（`playbackRate` 的 get 读自己 / set 空行为），
  来源表 +4、章节号顺延（§7→§8 / §8→§9 / §9→§10，**并修掉子代理漏改的一处重号**）。
- `web-js-env-patcher`（evolve）：`edge-waf-cookie-challenge.md` **§2.7 新增「未定名厂商：三层 JS 链 + 503 表单 + 概率性通过」**
  （★ **概率性通过**这条边界、两条**源文未解**项与移交边界）、排错清单 +3 行；
  `cookie-generation-analysis.md` 新增 **「链式下发（正则提外链 JS 逐级取 `Set-Cookie`，直取必 403）」** 与
  **「`substr(13)` ⇒ 时间戳 + 随机体」结构判据**、Cookie 分类 +1 行、不合格做法 +2 条；
  `ruishu-botgate.md` §3 入口定位 +1 条（**中间人改 `eval` 实参去 `debugger`** + **★「二级数组长度不变、位置语义固定」的静态点判据**）；
  `trace-runtime-conformance.md` 新增 **「轻量等价物：没有 Trace 基建时的人工执行路径对拍」**（降级手段，不替代正式闭环）。
- `web-reverse-algorithm`（evolve）：`07-antidebug-and-live-patching.md` 新增 **§3.1 FiddlerScript `OnBeforeResponse` 通道**
  （5 个 Session 处理函数的执行顺序 + **「所有请求都会进这个函数，必须自己筛选」**）、
  **§5.7 注入式反调试对抗四条**（★ **在 `eval(string)` 之前改它的实参 ⇒ 可完全跳过解密算法**；★ **`debugger` 不止一处且触发源不同**；
  ★ **以牙还牙注入 `debugger` 做动态断点**；**本地桩替换搭调试环境**及其验收判据；两份 eval diff）、
  **§5.8 扣代码阶段的运行期对拍与环境检测处置**（★ 浏览器↔Node 的 **`case` 号序列对拍**；把检测结果**改写成常量**的最小干预范式）、
  失败模式 +5 行、反例 +4 条。
- `reverse-knowledge`（evolve）：`data/blueprints/kugou-signature/` 补第 **3** 个来源（`1638865`）与 **★「伪多源」判定**
  （`1638865` 与在册的 `1719655` 是**同一份代码**，后者代码注释里自陈来源 `thread-1638865` ⇒ **不能互相印证**）、
  `gaps` +2、`mutations` +2、`self_check` +3（含**本流水线独立复算的结构断言与两个回归锚点**）。

### 本批「自己实跑出来」的增量（★ 全部有可复跑产物）

1. ★★ **W7 全链路被异语言逐字节复算坐实**：子代理用 Python 跑出的中间值（`atob` → **21 字节** → 掐头去尾 **18** →
   补种子数字 **20** → 输出 **18** → 取中 **16**）由主线用 **Node 独立重算**，`b21` / `qq20` / `out18` 三个中间数组**逐元素相同**，
   最终 key `abdef786c28046f5` 与**源文给出的值逐字符相同** ⇒ 该链是**真值**，不是转述误差。
   同时坐实「**漏掉 `popcount` 修正 ⇒ 解出的仍是可打印字符串、但那是另一把错 key**」（实测得 `` `abdd555a05.13b4 ``）⇒ **静默错**。
2. ★ **「差值 = popcount」的**位置语义**被钉死**：源文只说差值可由 `str(bin(index)).count('1')` 生成，**没写 `index` 是谁的下标**；
   实测差值 = `popcount(输出数组下标 j)`，按 qq 索引算会**整体错 2 位**（而产物照旧 16 字节 ⇒ 又一个静默错）。
   ⇒ 升格为通用判据「**凡『修正项 = popcount / 下标表』这类基于位置的项，落码前必须写清『位置是谁的位置』**」。
3. ★ **源文一处口径不精确 + 一处数组末位矛盾，均已登记（只登记、不判因）**：差值清单源文列 **15** 项、复算为 **16** 项；
   源文「浏览器 18 位数组」的**末位 `27`** 与公式算出的 **`49`** 不符（`27` 恰等于 `qq` 末元素）——「末位透传」与「源文录入误」**都无独立证据**。
4. ★★ **真机 Chrome 上 6 组 15 项 JS 语义断言全绿**（`browsercli`，`artifacts/skill-evolution/b34-run/`）：
   逗号表达式 `(x=1),false` ⇒ `false` 且副作用生效 / 不补尾巴 ⇒ 返回 `true`（**印证"必须补 `,false`"的因果**）/
   ★ **`const c = (d.x = 1), false;` 直接 `SyntaxError`**（**本批首次实跑踩到**：该写法只能出现在**表达式位置**）/
   只读 getter：非严格模式**静默失败**、严格模式抛 `TypeError`、`defineProperty` 重定义后恒真 /
   平台劫持访问器：**写入被静默吞掉**、`get` 读自己 ⇒ **`RangeError` 爆栈**、抢回访问器后写入生效 /
   `b64DecodeUnicode` 往返（含中文）/ **删 `debugger` 的正则只删第一条**（剩 1 处）/ ★ **`ret = fn.call(a,b)` 定位正则捕获组 = `_$8t`**。
5. ★ **酷狗 2022 版 signature 的两条结构断言被机械核对**：参数去盐值后 **18** 项、键序 `bitrate→uuid` **严格字典升序无重复**；
   并用 Node **独立复算**两个回归锚点（`cf5e1fed…` / `2e4bbd38…`）⇒ 以后「参数顺序被改过」可直接断言。

### 本批自曝缺陷与修正（**全部是流程缺陷，已在本轮内修完**）

| # | 缺陷 | 根因 | 处置 |
| --- | --- | --- | --- |
| 1 | `miniprogram-reverse` description 被触发词推到 **1113** 字（>1000 ⇒ 门禁 BLOCK） | 子代理只加触发词、未跑长度断言（**B31/B32 已记过两次，这是第三次**） | 按「删冗余不删能力面」压到 **973**（删重复覆盖项 + 缩短等价表述），并留下可复跑脚本 |
| 2 | 文档门禁报 **5 处 ```js 代码块语法错误** | ① 4 处是**历史遗留**（伪代码 / 配置样例 / 带 `<占位符>`、`[...]` 的摘录被标了 `js`）——**由「改动集派生」机制首次覆盖到该文件才暴露**；② 1 处是本批新引入（**照抄源文的缩写，源文自己少写一个 `)`**） | ① 4 处**去掉语言标签**（不是放宽门禁）；② 修正为合法 JS，并**把「源文缩写漏一个 `)`」登记进文档**（含「抄逐步压缩片段要每步过语法」的判据） |
| 3 | 两名子代理**并行写了同一个文件**（`key-wrapper-families.md` 出现两个 `§6.6` / 两行 W7） | 主线在子代理交付前**自己动手补了同一节**（我造成的） | 合并去重、保留更完整的一节；**记一条：主线不要与在跑的子代理写同一文件** |
| 4 | 子代理把「末位 = `qq` 末元素原样透传」写成**已复核结论** | 单样本巧合被当成机制 | 主线改为**只登记矛盾、不判因**（本仓硬规则） |
| 5 | 子代理在 `page-unlock` 里**漏改一处章节号**（出现两个 `## 9.`） | 顺延 §7→§8/§8→§9 时漏了最后一节 | 主线修正为 `## 10. 来源表` 并补齐 4 条来源 |

> ★ **流程层面的结论（可复用）**：本批 5 处缺陷里 **4 处来自「并行写者 + 长度/编号等跨文件不变量」**，
> **1 处来自"抄源文缩写不复算"**。⇒ ① 子代理 brief 必须显式要求**跑 description 长度断言与章节号连续性自检**；
> ② **主线在子代理在跑时不要写同一文件**；③ **凡"逐步压缩/缩写"的教学片段，每一步都要过一遍语法**（本批实测源文自己就漏了括号）。

### 验收（全部实跑）

- `check_skill_integrity.js` **全库 0 阻断 0 告警**（台账 639 → **655** / 候选 1138 / 待处理 499 → **483**）。
- `tools/b34-verify-docs.js`（**改动集从 `git status` 派生**，与 B32/B33 同口径）**0 阻断**：
  完整脚本 **34** · 函数体片段（包壳通过）**1** · 跳过教学占位 **0** · 路径引用可解析 **147** / 不可解析 **0**。
- ★ **`browsercli` 真机 Chrome 6 组 15 项断言全绿**（`artifacts/skill-evolution/b34-run/assert-js-semantics.js` + 结果原文）。
- ★ **Node 独立复算 24 项全绿**（`verify-doc-numbers.js`：酷狗结构 + 锚点、W7 全链路、源文差值口径）。
- 台账 **639 → 655** / `verify-ledger-md5.py` 逐条一致 / 幂等复跑 · 待处理 **499 → 483** ·
  双镜像 **17/17 逐字节一致**（含反向复核「同步后仍不一致 = 0」）· 提交后门禁**可复跑**。

本轮未派独立评审（如实记录）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 640 | `52pojie-828363-微信小游戏破解（一）：我要当皇上满级修改.md` | `710d8646618362710402623e9742db33` | 2026-09-24 | `miniprogram-reverse` | evolve | **明文存档改包闭环**：抓包定位自建服务器的**两条排除法**（① 连接是 `qq.com`/微信域名的「**一定不是目标**」——「那些都是腾讯官方的东西，小游戏或者小程序都是**自己的服务器**」；② 时间窗筛选两种：等请求稳定 → **扫帚清空** → 再开游戏只看新增 / 先开游戏 → **关闭前**清空 → 关闭后看剩下什么），**退出游戏必然走一次「保存」请求** ⇒ 靠时间窗就能挑出来（本样本 `h5.chiguawan.com:443`）；★ **工具必配项**：Charles **`SSL Proxying Settings` 里必须加 `*`（所有域名）**，源文原话「**这一步一定要有，否则就算信任了证书也全都是 unknown**」——**与"证书装没装"是两回事**；★ 改包三坑：**版本字段 `dbVersion` 必须一起改大**（源文原话「这个必须改（比原来的值大就行）」，但自注「这个我也不知道是什么，**版本号相关？**」⇒ 原因源文未给，登记为源文推断）、**改之前必须先关闭游戏**（否则游戏**自动保存**把数据刷回去）、**返回非 200 ⇒ 重新进出游戏取最新存档再改**（「直到返回结果是 200 的时候，就代表成功了」）；字段语义（3×4 `slots`、`id=37` 为满级、`pos` 为位置）⇒ **先搞清"哪个值代表什么"再动手** |
| 641 | `52pojie-832333-微信小游戏（二）：我要猫咪满级修改.md` | `5ab93e72db13f51738b29db1880c0264` | 2026-09-24 | `miniprogram-reverse` | evolve | ★ **引擎封装链的逐层搜法**（Laya）：`/user/save`（业务方法）→ `HttpPost(f,m,e,b)` → `LayaHttpRequest` → `wx.decrypt(a,b,c)` → `require("./js/utils/RdWXBizDataCrypt.js")` → 在该文件里搜 `decrypt`；**两条判据**：①「同名多处命中要分**调用**与**定义**」（`HttpPost` 搜出 30+ 处、**只有一处是 `function` 定义**）；②「**引擎封装是必经之路**」——业务层不直接写 `wx.request`，**不要停在业务层**；★ **交付手法：拿 oracle —— 把 `t.prototype.encrypt`/`decrypt` 的方法体直接替换掉**，把待处理 base64 写死进函数 + `console.log`，在控制台触发即可，**完全不需要知道 key/iv**（源文原话「直接替换的好处就是不在乎它的key和iv」）；代价是「**不理解实际加解密逻辑**」⇒ 适合取少量已知输入输出对，**规模化仍要回到抠 key/iv**；另给**强制重下载取包法**：**先分享 → 删除小程序 → 从分享卡片重进**，再按修改时间倒序锁定最新 `wxapkg` |
| 642 | `52pojie-974827-Wechat小游戏逆向修改数据——以【消灭病毒】为案例.md` | `40e5e7d7e970a84459a0294a5882026f` | 2026-09-24 | `miniprogram-reverse` | evolve | **§5.1「消灭病毒」的**更早独立来源**（2019-06）**，补两点（其余与在册的 `901994` 同构，**不重复登记**）：① **密钥按 `sign` 类型切换**——源文原话「根据参数的 key 升序排序，**根据 sign 类型，选择不同的密钥**，拼接起来，md5 加密」，两把密钥名为 **`secret` / `secret1`**（与既有「两处接口键集不同」是**两种口径**，是否同一机制**源文未说明**）；② **密钥不是明文常量**，是「**解密一段字符串**」得到的，但源文紧接着自陈「**算法原理不细究了**」⇒ **登记为"源文未展开"**，只记事实、不补算法；★ 另有**可迁移的"别死磕"判据**：解包工程进开发者工具后**加载到 100% 无报错也进不去**（真机同样卡 100%），源文「不是很懂在哪里卡住了」⇒ **目标是拿到算法、不是把游戏跑对**，直接全局搜 URL 片段静态定位（本样本核心逻辑在 **`code.js`**，**不叫 `game.js`**）；同时登记小游戏标准目录 `open/`（启动图音乐）与 `sd/`（音乐）**不要据此找逻辑** |
| 643 | `52pojie-1872067-某听书小程序之一家人要整整齐齐.md` | `0c824f8d689b431ac72e393ba668e143` | 2026-09-24 | `miniprogram-reverse` | evolve | **解包后工程修复清单 +3 条**：① 全局替换 **`wx-scope` → `scope`**；② `project.config.json` 的 `setting` 里 **`ignoreUploadUnusedFiles` / `ignoreDevUnusedFiles` 置 `false`**；③ ★ **全局替换 `VM2_INTERNAL_STATE_DO_NOT_USE_OR_PROGRAM_WILL_FAIL.handleException(e)` → `e`**（含 `(t)` 变体）——⚠️ **该标识是 `vm2` 沙箱的内部状态对象，本仓两处方向相反**：**小程序侧是「整段删掉让工程能跑」**，而 `web-js-env-patcher` 侧是「**识别并绕开它**，好让扣下来的代码在 Node（VM2 环境）里跑对」⇒ **同源不同用途，结论不要互相照搬**（源文未说明它为何出现在解包产物里）；分包解包命令形态 `node wuWxapkg.js <分包>.wxapkg -s=<主包目录>` |
| 644 | `52pojie-1749758-某浪新版key解密.md` | `d0d682dc1ec0841112d43e792b5fd079` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ **W 族第七族（W7）**：key **不从 `.key` URI 来**，来自**许可接口**（`play_licenses`）下发的**带 `1-` 前缀的 base64 文本**（本样本 30 字符）；链路 **剥前缀 → `atob` ⇒ 21 字节（不是 16 的倍数）→ 掐头去尾（去首 1 尾 2）⇒ 18 → 补两个「种子数字」`[250,85]` ⇒ 20 → 隔 2 异或 `(qq[j]^qq[j+2]) + 21 + popcount(j)` ⇒ 18 → 取中间 16**；★ **本流水线异语言逐字节复算**：`b21`/`qq20`/`out18` 三个中间数组与子代理 Python 侧**逐元素相同**，最终 key **`abdef786c28046f5` 与源文逐字符相同** ⇒ 链是真值；★ **静默错实测**：漏掉 `popcount` 修正后解出的**仍是可打印字符串**（`` `abdd555a05.13b4 ``）⇒ 只是**另一把错 key**，不报错；★★ **位置语义必须钉死**：源文只说差值可由 `str(bin(index)).count('1')` 生成、**没写 `index` 是谁的下标**，实测是**输出数组下标 `j`**，按 qq 索引算会**整体错 2 位**（产物照旧 16 字节 ⇒ 又一个静默错）⇒ 升格为通用判据「**凡『修正项 = popcount / 下标表』这类基于位置的项，落码前必须写清『位置是谁的位置』**」；两处**源文口径缺陷已登记（只登记、不判因）**：差值清单源文列 **15** 项而复算为 **16** 项；源文「浏览器 18 位数组」**末位 `27`** 与公式 `49` 不符（`27` 恰等于 `qq` 末元素，「透传」与「录入误」均无独立证据）；★ **取证前置坑**：该站**在页面加载时就把 `console` hook 掉了**（平台劫持 `console` 是为了不让你看它自己的日志）⇒ **必须在页面加载的极早期先存一份原生 `console`**；边界：两个种子数字**来源源文未解出**、`30 位数组` 用途未说明 ⇒ **跨站不可假设相同**，落地前先用「解出的 16 字节要能当可见 ASCII 读出来」这条判据验一次 |
| 645 | `52pojie-1637348-永久保存已购学习视频(更新修复图片).md` | `38c6d91de1f52abe6647f5e4c0287f0a` | 2026-09-24 | `stream-drm-reverse` | evolve | **双层族（某利威/polyv 系）的操作层手册**（源文自陈「**不介绍分析过程，只介绍如何去做**」⇒ **工具复现式，不是算法还原的依据**）：① ★ **`vid` 必须取带后缀的完整名**（`4adf37ccc0af24c6ab7f0ba0d3beadd1_4`），源文原话「有些人取值 `4adf37ccc0af24c6ab7f0ba0d3beadd1` 是**错误的**，一定是 `…_4`」——`vid` = **那个 JSON 响应体的文件名**（不是链接参数、也不是纯 md5）；② 这一层的 key/iv **只服务「解配置 JSON」**，源文原话「**注意和 m3u8 没有一点关系**」⇒ 别把它当成媒体 key；③ 配置密文**先按 hex 解释**（工具箱 raw→hex）、解出后**还要再走一次「编解码」**才是可读文本，文本里搜 `seed_const`（⚠️ 与 §4.6 既有口径「解出 → base64 解码」**两篇源文表述不同**，**登记为未复核**）；④ ★★ **「分片全部下完、只有合并那一步报错」= key 解密密码不对**（源文自陈）——本族最典型的**假成功**：分片能下、长度也对，只有合成炸 ⇒ 交付前必须拿 `ffmpeg` 试播一个分片收口 |
| 646 | `52pojie-1471146-通过ast初步还原某js.md` | `ed88409e36c182c9e3fead555c55f7ae` | 2026-09-24 | `ast-deobfuscation` | evolve | **OB「字典/代理对象」变体的实测样本（某东 `tak.js`）**，补三条此前未覆盖的：① ★★ **检测信号：「同一个字符串自比」的整块死代码 = 代理对象没还原的指纹**——未内联时是 `if (f['NjnDJ'](f['Ejtjg'], f["Ejtjg"]))`（**两个实参是同一个成员表达式**），内联后退化成 `if ("GjCQo" !== "GjCQo") { …死代码… } else { …活代码… }` ⇒ 处置与「剪假分支」相同（**恒假取 `else` 臂**）；② ★ **解码函数的识别启发式**（标识符不是 `_0x` 前缀时用它）：**函数名长度为 2 + 以 `a` 或 `b` 开头 + 只接 1 个参数**；⚠️ **源文那行条件有运算符优先级缺陷**——`…=='a') || (…=='b') && args.length === 1` 里 `&&` **只跟 `b` 那一支结合** ⇒ `a` 开头的**多参**调用会被一并替换，落地必须写成 `(len===2 && /^[ab]/) && args.length===1`；③ **两趟顺序**（先解码函数调用→字面量，再对象属性引用内联）与收尾（`!![]→true`、`![]→false`、别名先归一）；★ 两条**源文未解决项**（**不得写成"已能还原"**）：该样本最大的控制流是**多个函数合并、存在多个入口出口**，源文自陈还原不了；产物里仍留着**未被展开的 `eval(<源码字符串>)`**（由 `if (N == 'cca') … ? eval('…') : ''` 这类运行时条件选中）⇒ 反混淆后见到「`eval` + 带 `\n` 的源码串」属**预期残留**，不是 pass 出错 |
| 647 | `52pojie-1208999-中国商标网JS调试 - 动态代码注入.md` | `3c83f79a8b2e1715be55cbae6f06b478` | 2026-09-24 | `web-reverse-algorithm` + `web-js-env-patcher` | evolve | ★★ **在 `eval(string)` 之前改它的实参 ⇒ 可完全跳过解密算法**：瑞数的 `debugger` **不在静态外链 JS 里**，而在「解密后准备送进 `eval` 的字符串」里 ⇒ **在 `eval` 执行的前一瞬间那个字符串已经是明文**，在这一点上动手，**解密算法可以完全不管**；定位**不能靠变量名**（每次下发都变），要靠**语法特征** `/\bret\s*=\s*[\w\$]+\.call\([\w\$]+,\s*([\w\$]+)\)/`（第 1 捕获组即 `eval` 的实参变量名）；注入两步（先 `.replace(/\bdebugger\s*;/,'')` 只删第一条，再把另一处「赋值型反调试」整块换成 `<var>=false`）；⚠️ **`debugger` 不止一处且触发源不同**（本样本一处由**鼠标事件**、一处由 **`setInterval`** 触发，两处都用 `new Date().getTime()` 做时间差判定）⇒ **只按堆栈拆第一处不够**；★ **以牙还牙：注入 `debugger` 做动态断点**（动态脚本在 DevTools 里留不下断点位置 ⇒ 断点位置改由中间人规则决定）；★ **FiddlerScript `OnBeforeResponse` 通道**与 5 个 Session 处理函数的执行顺序（`OnPeekAtRequestHeaders` → `OnBeforeRequest` → `OnPeekAtResponseHeaders` → **`OnBeforeResponse`** → `OnReturningError`），**必踩坑：所有经过 Fiddler 的请求都会走这个函数，必须自己筛选**（本样本用**主机名 + `Content-Type` 含 `html` 双条件**）；★ **★ 静态点判据**：动态生成物里「**二级数组长度不变、位置语义固定**」（源文例：`[1][14]` 这个**位置**固定用于拼出动态字符串，而该字符串又用来构建静态外链脚本的**变量名**）⇒ 这正是「**静态脚本被动态化**」的机制，源文推论「**任何动态的事物都是基于静态产生的，只要找到静态点，动态就会坍缩为静态**」；边界：源文自陈该站反爬**更新频繁、不保证时效性**（2020-06 样本）⇒ **判据可迁移、具体形态不可迁移** |
| 648 | `52pojie-1496350-猿人学爬虫攻防赛 第10题.md` | `29ea774f0fc7928c7f0b0f8fd8fdcd57` | 2026-09-24 | `web-reverse-algorithm` + `web-js-env-patcher` | evolve | **壳的识别**：4 代瑞数的**低配静态版** + `jsjiami.com.v6` + obfuscator 三层叠加；★ **本地调试环境用 AutoResponder 搭**：`EXACT:<目标页>` → 本地桩、`regex:<站内 eval 脚本前缀>.*?` → 本地桩，**验收判据**「配好后重开首页**数据仍能正常加载**，且按 F12 **不再进入无限 debugger**」⇒ 环境搭好了（两条同时成立才算）；★ **浏览器 ↔ Node 的「`case` 号」对拍**：控制流平坦化的 VM 里**把依次执行的 `case` 编号打印出来**两边逐项比对，源文用途原话「**以免误入歧途**」——只看最终结果会把「过程完全不同但结果偶然一致」当成成功；★ **环境检测的最小干预范式：把检测结果改写成常量**（`userAgent` / `HeadlessChrome` 检测整行注释后紧跟 `_yrxTY4 = false;`；`function _yrxWxt()` 的 DOM 探针**函数体整段注释掉、只留 `var _yrxrqQ = 3`**）⇒ 与「只做最小干预、不要删整段反调试逻辑」同一条纪律；★ **参数入口的定位**：`console` 打印 XHR 的 `open` 发现**被重写** ⇒ 进该函数下断点、翻页即达入口（`_yrxBXT(779, …)`）；★ **两份 `eval` 字符串 diff 找变量名**；源文自陈**大型多入口控制流还原不了**（登记为未解决项） |
| 649 | `52pojie-1485179-震惊！他居然用控制台自动植入JS实现某度破解！.md` | `5f7108c936715e64ad19b528f1f00c37` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **赋值型条件断点「必须」补 `,false` 的因果**：赋值表达式的返回值就是被赋的值 ⇒ `d.userInfo.isSVip=true` 求值恒为 `true`，**不补尾巴则每次经过都断下**；补 `,false` 后「**就可以实现利用控制台不断进行自动注入**」⇒ **恒假尾项不是装饰，是这手法成立的前提**；★ **`③` 条件断点 vs `④` 日志断点**：用 ③（表达式为真才停），④ 是**每经过必打印**、量大到卡顿；★★ **真机实测的书写边界**：`,false` **只能出现在表达式位置**——写成 `const c = (d.x = 1), false;` 会被解析成 `const` 的**第二个声明符** ⇒ **直接 `SyntaxError`**（本批首次实跑踩到）；★ **只读 getter 的处置**：控制台赋属性报「**没有分配 setter**」（源文「isVip 定义了但是没有完全定义」）⇒ **别找 setter，用 `Object.defineProperty(this,"isVip",{get:()=>true})` 整体重定义**（源文一路压到 `…,{get:()=>true}),false` 一行；⚠️ **源文那步缩写漏了一个 `)`，照抄会语法错**）；★ **从「判断点」顺到「真实副作用」三步**：从界面文案搜到判断点 → **搜赋值函数名**（源文判据「**一般没有人会定义两个同样名称的函数**」）→ **赋值函数只有一行时去搜这个字段的 `watch`**，顺到真正的副作用（`cannotCopy` → `canCopy(t.length)`）⇒ **「赋值在哪」与「副作用在哪」常常不是一个地方**；边界：栈里 `[[FunctionLocation]]` **并非总能点过去**（源文遇到被编译成 native code）⇒ 替代手段就是直接搜函数名；★★ **反面：平台先用 `defineProperty` 劫持了宿主属性**——某盘非 SVIP 时对 `video.playbackRate` 做重写，**`get` 读自己（爆栈）、`set` 空行为（写入被吞）**⇒「**改了倍速没反应**」的真凶常常是这条，不是你改错了；判据：`getOwnPropertyDescriptor(...).get/set` 不是 `[native code]` ⇒ **已被重写**，处置是**先取平台当前描述符再包一层**；★ 历史做法登记（`setTimeout` 每 500ms 重置 + 更快的定时器对赌 / `for(let k=0;k<99999;clearTimeout(k++));` 清所有延时器）——**平台一改算法就全失效**，只作判据 |
| 650 | `52pojie-1500547-某5某秒分析笔记.md` | `7c0a6fb9e375aeddc5e08387291b16a2` | 2026-09-24 | `web-js-env-patcher` | evolve | **未定名厂商的三层 JS 链**（源文**未点名厂商**，只给了两个 base64 站点 ⇒ **不要往 jsl/5s 盾/CF 上套名字**）：首访 **503 且响应体里带待提交表单** → 第 1 层 JS（**OB 字符串混淆 + 控制流平坦化**，内容是**通用函数**含请求体加解密）→ 第 2 层 JS（**链接来自上一层**，「整个反爬框架**最核心**的部分，运行后获得后续请求的上下文」）→ 第 3 层 JS（提交上一层参数：**通过则激活第一次请求的表单**，不通过则**自动刷新从第一步重来**）→ 第 5 次访问 200；**处置路线（源文原话）**：`获取第二层 JS → AST 反混淆与函数前置 → JS 层运行拦截结果 → Python 修改拦截结果部分内容 → 发送请求`；**环境依赖必须先做**：第二层 JS **大量检测 `dom`、`nodejs` 以及其它自动化工具** ⇒ 源文要求「**需要自己补浏览器环境头**」；★★ **边界：这是概率性通过，不是确定性算法**——源文原话「通过的记录，**目前在 5 次内最少有一次成功**」⇒ 交付**必须**报成功率，**不要把"跑通一次"写成"稳定可复现"**；两条**源文未解的求助（原样登记，不得当结论）**：① 同一站在浏览器里是「纯 5 秒」、在 Python 里却出现「**带 hcaptcha** 的 5 秒」，且改成 `http` 则**必定**出现带 hcaptcha 的 5 秒（**引擎/协议侧行为差异，源文未解释**）⇒ 先确认拿到的是哪一种；② 另一站浏览器与 Python **均**出现带 hcaptcha 的 5 秒 ⇒ **该题型不在本技能能力面，移交 `web-verify-patcher`**，本技能只负责到「识别出它是 hcaptcha」为止 |
| 651 | `52pojie-1888223-【逆向】OB混淆cookie生成问题.md` | `02bd6a7a157613f68493cd900866c98a` | 2026-09-24 | `web-js-env-patcher` | evolve | ⚠️ **悬赏求助帖：源文作者自己没跑通** ⇒ **只登记结构与失败点，不是可用方案**。结构：该站要**三个 Cookie 齐备**才返回数据（定值 `csrfToken`，且请求头 **`x-csrf-token` 必须与该 Cookie 同名值绑定**；一个短 Cookie；一个长 Cookie）；★ **链式下发**：短 Cookie 不牵扯逆向但**不能直取**——`请求主页 → 正则提外链 JS → 请求它 → 再正则提另一个外链 JS → 请求它 → 拿 Set-Cookie`，源文明确实测**直取会拿到一个 403 无权访问页** ⇒ 判据「**拿不到 Cookie 时先确认"链路上游少走了没有"**，而不是先怀疑补环境」；★ **结构判据：`substr(13)` ⇒「时间戳 + 随机体」**——长 Cookie 生成函数里**两处**把 48 位/18 位「随机串」**切掉前 13 位**（= 摘掉 13 位毫秒时间戳）⇒ 见到**恰好 13** 的切片（`substr(13)` / `substr(0,13)`）先按这个结构读；其余形态（秒级时间戳**按 `timeArr` 位置表逐字符写回**、`base64` 解码模板串后**再补一段 `,"post_md5":"…"` 整体重编码**、按固定下标数组 `["3","7","10","12","15","18","20","23","35","40"]` **位置置换**）均**源文原样、未跑通**；★ **源文失败点**：作者自陈「**中间要传入 cookie 才能生成 cookie**，但是加了之后还是不对」⇒ **上游缺一环、未解决** ⇒ 遇到同型结构应把「生成时依赖已有 Cookie」当**已知条件**去回溯（与「四层链路」的 `source` 一问同一件事） |
| 652 | `52pojie-1503959-关注公众号cookie验证删除和请求接口获取.md` | `9797e09c46f261807f153012c41c5511` | 2026-09-24 | `web-reverse-hook` | evolve | **内容门控三通路之一二**：现象是 `followedCheck` → `showqrcode` → **一大堆重复的 `getFollowState`**（源文判断「看这架势，就是要知道你关注为止」）；★ **通路 1 · 把重复轮询的状态查询接口搬到本地**：用 **ReRes** 把这个轮询移到本地、用 flask 恒返 `{followState: 0}`——⚠️ **源文原样如此，返回体 `'{followState: 0}'` 不是合法 JSON**（key 无引号）⇒ **复现时按目标站真实响应结构返回，不要照抄去 `json.loads`**；★ **通路 2 · 重写校验函数**：`_followCheck = followCheck; function followCheck(callback){ callback(); }` ⇒ **口诀「先存原引用，再同名顶掉」**，且必须点破**函数提升陷阱**（`function` 声明会被提升到作用域顶部 ⇒「先赋值再声明」的书写顺序在运行时**并不成立**，稳妥做法是**在控制台分两步执行**或先确认两者不在同一作用域）；效果是**闭包内整串校验被短路**；★ **通路 3 · 直接拿下发接口**：从按钮监听的 Ajax 看到请求参数 ⇒ 搬进爬虫（`?url=&toFormat=` → 返回 `identification`，拼上站点前缀即下载地址）；★ **一行低成本站点指纹**：源文自陈「这个网站反爬真的不行，**连 ua 都没验证**」⇒ **首条请求就顺跑通时，先怀疑该站连 UA 都没校验**，不要一上来补全套指纹；**边界**：门控判定**在服务端**（`pass` 字段决定放行），前端只是渲染 ⇒ 三通路的实质是**取得服务端已认可的输入**，不是破解服务端校验 |
| 653 | `52pojie-1799911-一个菜鸡对关注公众号回复密码获取下载链接的分析.md` | `850d2ab8896b71651e344845decf6da8` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **核心教训：「看着像 token 的参数其实是 base64」**——提交参数末尾**有两个 `=`**，源文自陈「当时看到这边的时候只是觉得这个参数最后面有两个 `=` 很眼熟，**并没有认真看**，毕竟传一个 token 或者是加密的参数实在是太常见了」⇒ **错过了能快速解决问题的捷径**；页面里的解码函数是固定写法：`b64DecodeUnicode(a) = decodeURIComponent(atob(a).split("").map(b => "%" + ("00"+b.charCodeAt(0).toString(16)).slice(-2)).join(""))`（**`atob` → 逐字符拼 `%XX` → `decodeURIComponent`**）⇒ **判据：参数以 `=`/`==` 结尾 + 参数名看着像 token/加密串 ⇒ 先 `atob` 解一次看内容**，再决定要不要啃代码；另登记门控判定的服务端性（`shortcodeapi` **返回 1 才显示隐藏的下载链接**，否则弹「密码错误」）+ 从按钮点击事件顺到 `wxpass` / `wxshowyz` 两个 id 的定位法 |
| 654 | `52pojie-1801614-网站公众号引流-密码分析.md` | `7e67e422c2a1427c54ed72411865d9f9` | 2026-09-24 | `web-reverse-hook` | evolve | **内容门控三通路之「F12 搜界面文案 → 顺到下发接口 → 控制台直接调」**：F12 全局搜**界面文案**（`验证失败，请重试！`）命中校验分支 → 读到判断逻辑（`file.length > 10` 时调 `getlink(file)`，否则 `setTimeout` 1 秒后重跑 `down()`）→ 找到真正的「取下载地址」接口 → **复制该接口到控制台直接执行**，拿到下载链接；★ 判据（与同簇两篇合起来成一条）：**「先搜用户能看到的文案，再搜赋值函数名，最后才读代码」** —— 本样本正文极短（26 行）却直接给出结论，**恰好说明这条路比硬啃代码便宜**；边界与另两篇一致：门控判定在服务端，前端只是把隐藏内容显示出来 |
| 655 | `52pojie-1638865-酷狗音乐歌曲爬取.md` | `a09e097ebd5ad1fe23eb6ef842d4c9db` | 2026-09-24 | `reverse-knowledge` | evolve | ⚠️ **本批唯一「已在册」的条目**——`kugou-signature` 蓝图**已完整覆盖**本文的算法（`signature = MD5(固定盐值 + 18 项 `k=v` 按序无分隔拼接 + 同一固定盐值)`），故**不重复登记算法**，只补三件此前缺的：① ★ **结构断言（机械核对通过）**：`sign_params` 去掉首尾盐值后共 **18** 项，键序 `bitrate → callback → clienttime → clientver → dfid → inputtype → iscorrection → isfuzzy → keyword → mid → page → pagesize → platform → privilege_filter → srcappid → token → userid → uuid` **严格字典升序、无重复键** ⇒ 以后「顺序对不上」先怀疑站点改过参数；② ★★ **「伪多源」判定**：本文（2022-05-20）与在册的 `1719655`（2022-12）**是同一份代码的两个来源**——本文正文代码与后者代码块**逐字同构**，且后者在代码注释里**自陈来源 `thread-1638865`** ⇒ **不是两次独立观察、不能互相印证**（凡「两篇不同文章给同一段代码」，先查引用来源关系再当多源）；③ **两处存疑登记（源文未说明）**：`play/getdata` 的 **`_` 是硬编码 `'1653050047389'`**（既非当时时间、也不随请求变化，与同文 `clienttime/mid/uuid` 的实时值口径不同）、同文 `dfid`/`mid` 写成**固定值**（设备标识可复用还是会话值？未知）；★ 另附**本流水线独立复算的两个回归锚点**（`t=1653050047.389` + `keyword=一生所爱` + `page=1` ⇒ `cf5e1fed8199e46de6733a8df5a539f3`；整数秒 ⇒ `2e4bbd38f064b453485614b09fa5911d`）——**均为自算、源文无示例值，只作回归对拍锚点** |
## 批次 B35 · 2026-09-24（第三十六次执行）

**开局状态**：台账 B34 后 **655** 条 / 目录 `.md` **1167**（文章 **1162**）/ 待处理 **507**。
三方对齐（台账最后一节 = B34 × `git log` 最新 = `7b50e70`（B34）+ `a50ee33`（归档线第 35 轮） ×
自动化记忆最后一条 = B34）**一致** ⇒ 上一轮已闭环。`scan-pending.js` 反引号口径自检 **0**（没有"永久漏做"隐患）。
工作区的 `AGENTS.md` / `project/*`（cloudflare / tiktok 探针）是别会话在途改动，**未纳入本批**。

**取材口径（严格按记忆里「遗留 / 下一批（B34 更新）」的优先级 ①）**：

- **① 归档线第 35 轮（`a50ee33` 新收 24 篇）—— 本批 24 篇 = 全取（24/24 命中）**：
  在线文档 / PDF 载体 5（`1375791` / `1385134` / `1433013` / `1674294` / `2088383`）·
  猿人学攻防赛 3（`1288315` / `1469419` / `1487946`）·
  WAF / 风控 / 补环境 3（`1186703` / `1912763` / `1984407`）·
  Hook / 调试工具 4（`1722262` / `1492463` / `1477905` / `1851890`）·
  平台签名 / 打包产物 5（`2036327` / `2021569` / `1361387` / `1790893` / `1601414`）·
  媒体链路 3（`1490196` / `1843783` / `1917707`）· 字体反爬 1（`1911970`）。
  **命中率 24/24**（建档即定稿，无需二次筛）。
- **未取**：网马时代线（继续不列）；验证码簇（本轮无「新题型 / 完整纯算交付」供给）；
  网盘族（本轮无新形态供给，百度 §A 的 `42 小时`、城通/奶牛仍未覆盖 —— 继续挂）。

> ⚠️ 本轮**未**新增任何技能 —— 24 篇全部有最近邻模块，**能力缺口评估 = 0**（详见下文「新建技能评估」）。
> 候选新技能 `captcha-flow-orchestration` B5–B35 **二十九次确认不新建**；
> 候选元技能「本流水线自身的批次作业」**本次正式评估：暂不建**（理由见「新建技能评估」）。

### 材料 → 技能分流（含「为什么不是新建」的判据）

| 材料簇 | 最近邻模块 | 判据（为什么落这里 / 为什么不是新建） |
| --- | --- | --- |
| 在线文档 / PDF / 文库（5 篇） | `stream-drm-reverse`（**容器层**） | 该技能 `references/ebook-and-container-drm.md` 首段**已经写着**「在线阅读器、EPUB / **PDF** 平台、文档站」⇒ 这是**既有能力面的纵深**，不是新面。新建 `document-unlock` 会造成「容器型内容保护」一分为二 |
| 猿人学 1–9 / 16 题（3 篇） | `web-reverse-algorithm` | 该技能已有 `01-decision-tree` / `15-call-site-locating` / `16-ciphertext-structure-diagnostics` 三份「题型 → 定位」文档；本批补的是**第四种视角：跨题复用的判据索引** |
| reese84 / `___utmvc` / testab（3 篇） | `web-js-env-patcher` | 三者同一条流水线「接口下发 VM/混淆代码 → 补环境 → 跑出参数」，与该技能 `ruishu-botgate.md` / `case-patterns.md` 同族 |
| 百度云加速挑战页（1 篇） | `web-verify-patcher` | 已有 17 族厂商对照；百度云加速是第 18 族的**表单型 WAF 挑战** |
| ajaxHooker / cookie hook / `JSON.parse` 定位 / `apply` 掐 debugger（4 篇） | `web-reverse-hook` | 全部是「**非阻塞改写 + 定位钩子**」，与该技能 `anti-hook-detection-and-bypass.md` / `page-unlock-and-userscript-recipes.md` 同族 |
| 得物 webpack 包（1 篇） | `webpack-bundle-extraction` | 包形态 `!function sign(e){…}({…})` + `window.b = a` 暴露 require ⇒ 打包产物复用 |
| 闲鱼 mtop / 超星 pos（2 篇） | `reverse-knowledge`（**蓝图**） | 成熟平台签名参数 ⇒ 走蓝图契约（`blueprint-schema.md`） |
| 问卷星 jqParam（1 篇） | `reverse-knowledge`（**既有蓝图**） | `wenjuanxing-params` 蓝图**已在册**，本批是**更早的独立来源 + 两个静默错** |
| `ast_tools` 框架（1 篇） | `ast-deobfuscation` | 反混淆**框架形态与选型**，与 `pattern-layering.md` 互补 |
| m3u8 `z` 参数 / 小鹅通 ts URL 变形 / 西瓜直出载体（3 篇） | `stream-drm-reverse`（**§0 地址还原层**） | 与该技能 `playback-address-interfaces.md` 同族（「拿到一个能播/能下的地址」这一步） |
| 知乎盐选动态字体（1 篇） | `web-font-obfuscation` | 该技能 `css-and-sprite-obfuscation.md` 已覆盖字体反爬；本批补的是「**查表走不通 ⇒ 改走字形 OCR**」这条**路线分岔** |

### 新建技能评估（**结论：0 新建**）

- **唯一的候选**是「在线文档 / PDF / 文库载体解锁」。**不建的判据有两条**：
  ① `stream-drm-reverse` 的边界声明（`SKILL.md` 分层表 + `ebook-and-container-drm.md` 首段）**已经包含 PDF**，
     新建会造成同一能力面分裂成两个入口，违反本仓「同一份清单只在一处维护」的红线；
  ② 本批 5 篇的知识全部是**「容器层」的纵深**（载体形态分流 / 分段枚举 / key 解包 / 权限边界），
     没有出现新的**加密层**或新的**交付形态**。
  ⇒ 按「避免滥建冗余技能」与「优先在最邻近模块补充扩展」两条约束，落为 `stream-drm-reverse` 的新 references 文件。
- **候选元技能 `captcha-flow-orchestration`**：本轮验证码供给为 0 ⇒ 维持不建（**第 29 次确认**）。
- **候选元技能「本流水线自身的批次作业」**：本轮**首次正式评估**，结论 **暂不建**。
  判据：本批自曝缺陷 **6 处**，其中 **5 处是「并行写者 + 跨文件不变量」型**（引用路径前缀 / 代码块语言标签 / 描述长度），
  **1 处是「照抄上一批脚本」型**。这些**全部可以用可复跑的机械门禁覆盖**，而门禁**已经存在**
  （`check_skill_integrity.js` / `bNN-verify-docs.js`）——把它们写成「技能文档」不会比写成「门禁脚本」更有效。
  ⇒ **下一次若再现「门禁抓不到的流程缺陷」，才考虑建**。

**技能变更汇总（7 个技能全部 evolve，0 新建）**

- `stream-drm-reverse`（evolve，本批最大增量：**2 个新文件**）：
  **新增 `references/online-document-unlock.md`（749 行）** —— 在线文档 / PDF / 文库载体解锁：
  **载体形态五分流**（① Range 分段懒加载：`Range: bytes=0-327679` + `206` + `Content-Range`、
  **「先返回总长再收 Range」的两次请求语义**、**「小十个字节」实测坑 ⇒ 以 `total` 核对边界**；
  ② base64 内嵌（30MB 单文件 HTML / `data:application/pdf;base64,` / blob，**可能带密码**）；
  ③ 整体加密（XHR 追栈；wasm `_decodeData` **直接 hook 整份 PDF 出口**；
  `HCNO → Module._init → UTF8ToString` 解出「密钥 + IV + hcno」三元组，**`#` 段是 IV**）；
  ④ pdf.js 容器（`PDFViewerApplication.download()`「基本上通用」+ `.onPassword` 追码）；
  ⑤ 一次性 URL + 签名分页（**阻止请求域 / 跑两次**两个验证动作 + `MD5('123456'+nonce+stime)` 四参数按页循环）；
  ⑥ 逐页图片流（元数据 ECB + `canvas_info` **只重映射中间 10% 字节**））；
  另含 **PDF 文件头四种表示法**、**base36 两位一组解码**（原函数 + 可复算向量）、
  **postMessage 自动传密码链（`r0inab`/`r0inyk`）**、`@media print` 破除法与边界、内嵌 PDF 密码两条路线、blob 下载片段。
  **新增 `references/playback-url-shapes-and-page-carriers.md`** —— 地址还原层的三类新形态：
  **按日期算的自定义查询参数（`z` 参数 = `md5(md5(String((day+18)^10))[0:10])`）**、
  **ts 分片 URL 本身就是 m3u8 的伪装形态（改后缀 + 删 `start/end`）**、
  **页面直出载体 `window._SSR_HYDRATED_DATA`（AES-CBC/Pkcs7 → base64 → base64 → JSON）**。
  `references/ebook-and-container-drm.md` 顶部补分工指针；`SKILL.md` 分层表 **+1 行**（在线文档载体层）、资源段 **+2 条**。
- `web-reverse-algorithm`（evolve）：**新增 `references/17-yuanrenxue-match-playbook.md`（550 行）** ——
  「比赛题 / 靶场题」的**题型 → 定位手法 → 算法 → 可迁移判据**主表（覆盖第 1/2/3/4/5/6/7/8/9/16 题）与 §2 逐条判据：
  ★ **`m` 参数里的 `丨`（U+4E28 分隔符）⇒ 先按「拼接串」拆，别按整体加密读**（并点破 **`丨` ≠ ASCII `|`**，抄串必确认码位）、
  ★ **属性名拼接混淆（成员访问方括号里是加法表达式）**、★ **内联 RC4 字符串表「不要静态读、在控制台逐项调用」**、
  ★ **动态 cookie 的入口是「不带 cookie 时服务端返回的那段 script」而非 cookie 本身**、
  ★ **「接口本身没有反爬」时把注意力从请求侧转到响应侧**、
  ★ **累积历史参数 `q`（`a-b\|c-d\|…`）必须按请求顺序生成**、
  ★ **node 补环境「值对齐即止」与 express / execjs / `os.popen` 三种调用形态**、
  ★ **OB 三段 script（自检 / 保活 / 业务）**、★★ **蜜罐判据：一段代码只用自己产出的值做校验 ⇒ 先怀疑它是蜜罐**（处置是浏览器 vs node 逐字符回溯，而不是改算法）。
  `SKILL.md` 参考导航 **+13 行**。
- `web-reverse-hook`（evolve）：**新增 `references/response-rewrite-and-locating-hooks.md`（285 行）** ——
  §1 **`ajaxHooker` 改写响应体**（★ 判据：**改「响应体」比改「页面状态」稳**）+ 油猴头部三行；
  §2 **`document.cookie` 的 `defineProperty` hook 模板 + hook 时机三档**（控制台注入刷新即失效 / FD 替换响应 / 油猴 `document-start`）
  与 ⚠️ **源文写法的两个缺陷（裸 hook 会被 `getOwnPropertyDescriptor` 检出）**；
  §3 **`JSON.parse` 断点定位解密入口**（★ 判据：**解密入口 = 密文进入业务代码的第一个函数**）；
  §4 ★ **按 `this.toString()` 精确 hook `apply` 掐掉无限 debugger**（含**与既有「静态改文件」路线的区别**：
  本手法用于**代码在 JSVMP 里、文件不好改**的场景；并点破**字符串必须逐字符精确**与**劫持全局 `apply` 的影响面**）。
- `web-js-env-patcher`（evolve）：**新增 `references/vmp-verify-params-env-patching.md`（280 行）** ——
  reese84 / `___utmvc` / testab **三个样本归并为同一条流水线**「接口下发 VM/混淆代码 → 补环境 → 跑出参数」：
  ★ reese84 的**唯一定位抓手**（`invokeTask` → `e.callback.apply(n, r)` → **跳约 5 个栈**）+ 扣代码三条（**19 方法数组** / 字符串切片当属性名 / `JSON.stringify` 后再 base64）；
  ★ `___utmvc` 的 AST 两步；★ testab 的**补环境清单与顺序**（`self = top = window` → 删 `process`/`global`/`buffer` → `appendChild` → `createElement` → 原型链 + `toString`），
  **验收判据 = `args` 与浏览器逐值一致（源文为 64 位大数组）**；★ testab 纯算的**「插装打值 → 基于值分析」笨办法**与**沿指令集索引对栈**的定位法。
- `web-verify-patcher`（evolve）：**新增 `references/baidu-yunjiasu-safety-check.md`（199 行）** ——
  百度云加速「安全检查」挑战页的**完整可复算链路**（`cf-ray` 取 `ray` / 正则取 `posturl` 与 `r` /
  `captcha.su.baidu.com/session_cb?pub=` 取 `session` / 换验证码图 / 四字段表单提交）+
  ★ **参数固化判据（哪些能写死：`pub`；哪些必须每次取）** + ★ **厂商误判提醒（`cf-ray` 不是 Cloudflare 专属）** +
  **人工输码的边界（不是自动识别）与移交分工**。
- `ast-deobfuscation`（evolve）：**新增 `references/ast-toolchain-frameworks.md`** ——
  `sml2h3/ast_tools` 的**框架契约**（`main.js` 的 `common_fix.fix` 入口 → `./pro/demo1_fix.js` 导出 **15 个各自独立的 pass 函数 + 一个主函数集中声明执行顺序**）
  与 ★ **判据「反混淆框架的价值在『函数独立 + 顺序显式』」**（要改一个 pass 不动其它），
  含落地前提（`npm i iconv-lite @babel/core` / 输出到 `demos/demo1/output.js` / 10 秒级）与
  ⚠️ **登记：源文没有贴出那 15 个函数中的任何一个 ⇒ 不得编造函数名或实现**。
- `webpack-bundle-extraction`（evolve）：**新增 `references/webpack-runtime-export-and-host-reuse.md`** ——
  ★ 判据「**某些包会把 require 直接暴露到全局**（得物样本叫 `window.b`）⇒ 先看 IIFE 尾部有没有 `window.X = <loader>`」、
  ★ **宿主复用形态**（`execjs` 里 `ctx.call('cxx', data)`，**入参是对象不是字符串**）与其**代价**（耦合 JS 引擎 / 并发受限 / 要带全包），
  并与 `node-reuse-and-env-handoff.md` 划清分工。
- `web-font-obfuscation`（evolve）：**新增 `references/glyph-ocr-and-rotation.md`** ——
  ★ **路线判据（30 秒分流）**：`码位↔真值表稳定 ⇒ cmap 查表；不稳定 ⇒ 字形 OCR`，含源文的**三步判定**（先 F12 再禁 JS 再粘贴网址 / 对比源码与显示文字 / **刷新两次对比源码文字**）；
  ★★ **核心坑：按映射表逐条 `replace` 会「自我污染」**（`一二一二…` + `[("一","二"),("二","一")]`）与源文的 `replaced_positions` 修法，
  **并由主线补出源文没做的推演**：根因是「顺序 + 就地改写同一个串」，**通用解是单趟逐位置映射**（`''.join(map_table.get(ch, ch) for ch in text)`）；
  ★ OCR 选型三段弯路（Tesseract / easyocr / **CnOCR**）与「先用在线 demo 跑自己的字形图」这条判据。
- `reverse-knowledge`（evolve，**2 个新蓝图 + 1 个既有蓝图升级**）：
  **新建 `xianyu-mtop-h5-sign`**（`sign = md5(token + '&' + t + '&' + appKey + '&' + data)`，`token` 取 `_m_h5_tk` 的 `_` 前段）；
  **新建 `chaoxing-pos`**（⚠️ **title/summary 已如实标注「源文自称是练习站，非真实超星站点」**；
  `pos = (ceil(x)\|ceil(y))` 坐标串 + `enc` 的 **LCG（`seed = (k*seed + a) % (2^31-1)`）+ 逐字符异或 + 8 位 hex 尾**）；
  **升级既有 `dewu-sign`**（本批**唯一的「结论级升级」**，详见下节）；两个新蓝图均已登记进 `index.json`（**修复孤儿警告**）。
  蓝图库 **29 → 31 个**。

### ★ 本批唯一的「结论级升级」：`dewu-sign` 蓝图 · `family: unknown → hash(MD5)`

**怎么发生的**：本批的得物文章（`2036327`，web 端**首页推荐**面）**不是同一接口**（既有蓝图是 `stark.dewu.com` 商家后台面），
表面上只能各记一处。但**交叉核对发现两处结构常量完全同一**：

| 证据 | 内容 |
| --- | --- |
| 常量 | 两面都是 `048a9c4943398714b356a696503d2d36`（**逐字符相同**） |
| 拼法 | 两面都是「`Object.keys(t).sort()` 升序 → 键名+值无分隔符相连 → 空数组只留键名 → 接同一常量」 |
| 算法 | web 面的 `cxx()` **给出了完整函数体**：`u()("".concat(<升序拼串>, "<常量>"))`；而 `u()` 所在模块即 **blueimp-md5**（同包第 597/746 行出现其核心 IV 常量 `1732584193 / -271733879 / -1732584194 / 271733878`，函数签名 `bytesToWords(t)` + `8 * t.length` 也逐字一致） |

⇒ 升级为 **`return_sign(t) = MD5(升序拼接串 + 常量)`**，`family: unknown → hash`，`version 1.0.0 → 1.1.0`。
**但 `status` 只记 `partial`**（不是 `active`）：**两个面都没有服务端返回值可对拍**，
按本仓硬规则「只登记、不判因」，这一点必须在文档里说清。
`metadata.json` / `mutations.json` / `workflow.md` / `index.json` **四处同步**（避免"同一事实两处不一致"）。
`mutations` **+4 条**（常量位置 / 升序的字典序语义 / 空数组与对象值的拼法 / `undefined` 与 `NaN` 分支），每条都带 `symptom_if_wrong`。
★ 并**顺手把蓝图既有的 `self_check` 变成了可对拍的预测**：`MD5(拼接串 + 常量) = 71c9f7ef54ec3ab5bb233e48934222b3`
—— 该式的**三个中间值已由本流水线用 Node 逐字符复算通过**（见验收），后续只要拿到一次该接口真实响应即可 `partial → active`。

### 本批自曝缺陷与修正（**全部在本轮内修完**）

| # | 缺陷 | 根因 | 处置 |
| --- | --- | --- | --- |
| 1 | 子代理把跨技能引用写成 `../<skill>/…`（**17 处**），`check_skill_integrity.js` 全报 BLOCK | 该文件位于 `references/` 下，`../` 只到**技能根**，必须 `../../<skill>/…`；子代理**没有按要求 `ls` 逐个验证可达性** | 统一改为 `../../`，并把「写完后逐个 `ls` 验证」写进下一次的 brief **硬性门禁**（本轮已在 brief 里写过，但**没有要求它把 `ls` 结果贴回**⇒下次必须要求贴回） |
| 2 | 文档门禁 4 处 ```js 代码块语法错误 | ① 2 处**本批新引入**：「对象属性片段」`success: function(data){}` 与「`case` 片段」`case 1: … break;` 被标了 `js`；② 2 处是**历史遗留**（`ebook-and-container-drm.md` 的 `AESEncrypt(e,t){…}` 类方法简写、`online-document-unlock.md` 的 `decodeData(data){…}`）——**由「改动集派生」机制首次覆盖到该文件才暴露**（B34 同款现象） | 四处**一律去掉语言标签**（**不是放宽门禁**）；并按 B33 判据确认：去掉标签的块都是**片段**、不是真语法错 |
| 3 | 第三方项目路径被门禁误判为「仓库相对引用」（`./pro/demo1_fix.js` / `./demos/demo1/output.js` / `references/patterns/<site>.md` / `./scripts/login_param_probe.py`） | `ast_tools` 是**外部项目**，其内部路径写进文档时用了「仓库路径」的书写形态；门禁按「改动文档里的路径型引用必须可解析」一律拦截 | 去 `./` 前缀 / 把「目录」与「文件名」拆开写（`references/patterns/` 下的站点文件）⇒ 语义不变、不再形成路径形态；**未放宽门禁** |
| 4 | `reverse-knowledge` 新蓝图 `dewu-sign` 的 `family` 先写成 `md5`，被 `blueprint-lint.js` 判 error（**枚举不含 `md5`**） | **我（主线）**凭直觉写了算法名，没先读 `algorithm.family` 的枚举契约 | 改为 `hash`（算法名进 `detail`），并**对照 5 个既有蓝图的 family 取值**确认为仓库通行口径 |
| 5 | 主线在两条子代理**仍在跑**时就想同步镜像 | 与 B33 踩过的「并行写者」同族，但**触发点不同**：这次是「镜像同步与子代理写入竞争」 | **先 `TaskList` 确认 11 个任务全部 completed、再跑镜像**；并记一条「**同步前必须确认在跑的子代理数为 0**」（比 B33 的「看文件 mtime」更硬） |
| 6 | 本批 `b35-verify-numbers.js` 首跑 **1 项断言失败**（自写断言把密文长度写成 70，实际 72） | **我（主线）**写断言时凭记忆填数，没让断言自己算 | 把常数改成**从输入推导**（`enc.length % 2 === 0 && got.length === enc.length / 2`）⇒ 断言不再依赖人肉计数 |

> ★ **流程层面的结论（可复用）**：
> ① **6 处缺陷里 3 处是「跨文件不变量」**（引用路径前缀 / 语言标签 / 枚举取值）⇒ 全部**已能由门禁覆盖**，
> 这也正是「不新建元技能」的直接证据；
> ② **「改动集派生」机制连续两批（B34/B35）各抓出 2 处历史遗留** ⇒ **它已经是本仓最有效的"存量体检"通道**，
> 下一批应**主动扩大改动集**（例如把「本批引用到的邻近文件」也纳入门禁），而不是等它被动暴露；
> ③ **子代理 brief 里写过的硬性要求，若不要求"把验证结果贴回"，等于没写**（本轮缺陷 1 的直接原因）。

### 验收（全部实跑）

- `check_skill_integrity.js` **全库 0 阻断 0 告警**（台账 655 → **679** / 候选 1162 / 待处理 507 → **483**）。
- `tools/b35-verify-docs.js`（**改动集从 `git status` 派生**，与 B32–B34 同口径）**0 阻断**：
  完整脚本 **30** · 函数体片段（包壳通过）**2** · 跳过教学占位 **9** · 路径引用可解析 **337** / 不可解析 **0**。
  22 个技能的 frontmatter / description 契约**全部通过**（**本批无人改 description ⇒ 无长度回归**）。
- `blueprint-lint.js` **error 0 / warn 1**（= 基线的 `toutiao-a-bogus` 缺 `mutations.json`，历史遗留，未增未减）；
  `query-blueprint.js --selftest` **33/33**；`index.json` 与磁盘目录**无孤儿**（新蓝图已登记）。
- ★ **`browsercli` 真机 Chrome 7 组 12 项断言全绿**（`artifacts/skill-evolution/b35-run/assert-js-semantics.js` + 结果原文）：
  `new Function("debugger").toString()` 逐字节匹配 / **反证**带分号与带空格写法对不上 / **端到端**装上 `apply` hook 后该函数被静默吞掉且不影响正常 `apply` /
  `^` 优先级与 `getDate`≠`getDay` / **base36 解码命中源文密码** / testab 64 元数组 / `+` 的类型分派 /
  ★ **裸 `defineProperty` hook 后 `getOwnPropertyDescriptor().get` 不再是 `[native code]` ⇒ 真的可被检出**（坐实 `web-reverse-hook` 里登记的源文缺陷）/ 超星 `enc` 结构与「漏更新 seed 静默改变内容」。
- ★ **Node 独立复算 38 项全绿**（`tools/b35-verify-numbers.js`，原文见 `b35-run/verify-numbers.result.txt`）：
  base36 解码 **有源文 oracle**（`d28a17ea2415+f47a+8e11+d5af+3fb043f7` 逐字符命中）·
  testab 数组 → **64 位小写 hex**（与源文「64 位大数组」的表述互证）·
  `new Function('debugger')` 串逐字节 · `z` 参数三条回归锚点 + **两处静默错反证** ·
  问卷星「数字相加 vs 字符串拼接」· 超星 `enc` 结构 + **漏更新 seed 的静默错** ·
  闲鱼 `sign` 顺序敏感反证 · 百度云加速正则顺序敏感 · ★ **`dewu-sign` 升级式的三值 + 预测值 + 常量位置反证**。
- 台账 **655 → 679** / `verify-ledger-md5.py` 逐条一致 / 幂等复跑 · 待处理 **507 → 483** ·
  双镜像 **31/31 逐字节一致**（含反向复核「同步后仍不一致 = 0」）· 提交后门禁**可复跑**。

**评审**：本轮按自动化口径执行、未派独立评审（如实记录）。

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 核心萃取 |
| --- | --- | --- | --- | --- | --- | --- |
| 656 | `52pojie-1186703-python爬虫遇到【安全检查! 百度云加速】的解决方案.md` | `283f1437ea2c1ddfa9cab7f5ae480e49` | 2026-09-24 | `web-verify-patcher` | evolve | **表单型 WAF 挑战页的完整可复算链路**（百度云加速，判据三件套：标题含「安全检查」+ 响应头有 `cf-ray` + 响应体里一个待提交表单）：① `cookie = Set-Cookie` 首段；② `ray = cf-ray` 去掉 `-` 后缀；③ `posturl = 站点根 + html.unescape(action="…")`；④ `r = value="…"`；⑤ `session` 从 `captcha.su.baidu.com/session_cb?pub=<写死>` 的响应里按 `split('"')[-2]` 取；⑥ 验证码图 `captcha.su.baidu.com/image?session=&pub=`；⑦ 四字段表单 `r / id(ray) / captcha_challenge_field(session) / manual_captcha_challenge_field(人输)`；★ **可迁移判据：「`pub` 多次抓包不变 ⇒ 写死」——先分清哪些参数是站点级常量、哪些是每会话必换**；★★ **厂商误判提醒：`cf-ray` 头在非 Cloudflare 厂商（本样本是百度云加速）上也会出现 ⇒ 不要凭 `cf-*` 头反推厂商**；边界：源文是 **2020-05** 样本、`pub` 只对该站当时有效，且**验证码是人工输入**（非自动识别）⇒ 自动识别移交 `captcha-model-training.md` |
| 657 | `52pojie-1288315-某网站Web端爬虫攻防大赛题目交流.md` | `d90f9a347d4f80fc401126ae30a6afd0` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★ **猿人学 1–9 题逐题讲解（405 KB / 7468 行，正文到第 9 题、后段为回帖）**，本批把它蒸馏成**题型索引**而非流水账：★★ **第 1 题 `m` 参数里的分隔符是 `丨`（U+4E28，CJK 竖线）而不是 ASCII `|`** ⇒ 固化判据「**参数出现竖线类分隔符（`丨`/`|`/`｜`）时先按『拼接串』拆成 `[密文/哈希] + [分隔符] + [常为明文时间戳]`，而不是当整段密文解**」，并点破**抄串必须先确认码位**（字形相近、码位不同，写错服务端只回「参数错误」）；★★ **属性名拼接混淆**：`String[document.e + document.g](…)` / `window.a[i][document.f + document.h]()` —— **识别信号是「成员访问方括号里是加法表达式」**，处置是先把 `document.<x>`/`window.<y>` 常量还原；★ **内联 RC4 字符串表**（`U = ['W5r5…','WQ8C…']` + 按下标取 + 第二参加密）⇒ **不要静态读 RC4，直接在控制台逐项调用 `J('0x0','dQ')` 读出明文**；★ **动态 cookie 的入口不是 cookie 本身**——**不带 cookie 访问时服务端返回一段 script**，cookie 由这段 script 算出（第 2/9 题同构，第 9 题是 **OB 三段 script：反调试 / 字符串表 / 业务**）；★★ **第 4 题「接口本身没有反爬」**（源文原话「直接获取数据即可」）⇒ **难点全在响应侧**（`class` 里 32 位 hex 标记隐藏图 + `style:left` 定序 + base64 图）⇒ 判据「**参数平平无奇时，把注意力从请求侧转到响应侧**」；★ **第 6 题是「js 混淆 - 回溯」**（`m = encodeURIComponent(RSA(...))`、累积历史参数 `q` 必须按请求顺序生成）；★ **第 7 题动态字体每次换文件**、**第 8 题 30×30 个 `div` 对应点选序号**（均已在 §1 主表登记并指向 `web-font-obfuscation` / `web-verify-patcher`） |
| 658 | `52pojie-1361387-对问卷星参数jqparam的分析和探索.md` | `73866a865f3e927c5d49bda16823a366` | 2026-09-24 | `reverse-knowledge` | evolve | ⚠️ **「已在册」条目**——`wenjuanxing-params` 蓝图**已完整覆盖** `abcd1~abcd5` 全链，故**不重复登记算法**；本篇（**2021-01，比在册来源更早**）的独立价值是**两处静默错 + 一条定位手法**：① ★★ **「抠出来的函数与页面实际行为不一致」**——源文贴出的可复用 `get_jqParam()` **`return jqParam`（在 `abcd5` 之前）**，而页面内联代码是 `jqParam = _0x5d90fd`（**在 `abcd5` 之后**）⇒ **照抄可复用版本会少做一次循环左移**（长度对、内容错位、服务端判参数非法）⇒ 已作为 `mutations` 登记；② ★★ **`_0x3a5cf2 = _0xd16fcc + _0x4aaf4a + parseInt(activityId)` 是「数字相加」不是「字符串拼接」**（JS 左结合、三项都是 `number`）⇒ 写成 Python 字符串拼接会得到完全不同的值（本批真机实测 `1428901062` vs `123456789088888888105444284`）；③ ★ **定位手法：`ReRes` 把 `<混淆 js 地址>.*` 映射到 `http://localhost:9000/tool.js`**（`python -m http.server` 起本地服务，**问号及后面的参数用 `.*` 代掉**）⇒ **先把混淆文件换成本地反混淆版，再打断点**；④ 登记：参数生成**挂在鼠标移动事件上**（`$(document).bind('mousemove', …)` + `window.hdm1113` 1 秒后才为 `true` + `pageX > 0`）；⑤ 交叉验证：**62 字符表与 `3597397` 常量与在册来源逐字一致** ⇒ 该蓝图的常量可信度上升 |
| 659 | `52pojie-1375791-关于GB688文件下载的脚本讨论.md` | `a614b9857073b95fffcbcd5e08c65801` | 2026-09-24 | `stream-drm-reverse` | evolve | **openstd（GB688）在线预览的载体结构**（源文转述自 `lzghzr/TampermonkeyJS` issue #27 + gist）：★ **页内 `var HCNO="…"`（一段 base64）= 承载「密钥 + IV + hcno」三元组**，由 `pdf-work.wasm` 解密：`Module.onRuntimeInitialized → allocateUTF8(HCNO) → Module._init(ptr) → UTF8ToString(retPtr)`，**解出形如 `**********:################:CC68F6BFD3E104560914271598AFE8C8`**——**`#` 段即 IV**；★ **两次请求的语义区分**：同 URL 第一次**「没有发生文件传输」**（只是从 `Content-Range: bytes 0-2967096/2967097` 拿到**总长**），第二次才带 `Range: bytes=0-327679` 取块（**320 KiB 粒度**，`206 Partial Content`）；★ **懒加载**：用户下拉才继续请求，直到 `bytes=2949120-2967096` 收尾；★ 边界：源文自陈「太专业了实在看不懂，发出来大家一起研究」⇒ **只登记结构与抓包事实，未复算密钥/IV 的具体取值**；另登记两条**非逆向的替代路线**（打印成 PDF / 无头浏览器批量取），并注明后者对 pdf.js 在线预览同样适用 |
| 660 | `52pojie-1385134-记一次有限制的网页pdf破解.md` | `e4ff48fce7d423fc1d8d4b9c88beb03f` | 2026-09-24 | `stream-drm-reverse` | evolve | **单文件 HTML 内嵌 base64 PDF 的完整闭环**：① **识别**：一个 HTML 30+ MB ⇒ 数据都在本地，`010 Editor` 打开就能看到**一大段 base64**，读到 `application/pdf` + `;base64,` 定性；② **禁用控制台的 6 种绕法**（源文列的清单：本地 JS 直接编辑 / `ctrl+shift+I` / 菜单「更多工具→开发者工具」/ `ctrl+shift+C` / **FD 自动转发** / **先开控制台再开网页**）⇒ 判据「**只挡 F12 的前端手段一律不算"加密"**」；③ ★ **`convertDataURIToBinary` 的等价复现**（去 `data:` 头 → `atob` → 逐字节 `charCodeAt & 255` 填 `Uint8Array`）；④ ★ **PDF 带密码的两条路线**：**解密 JS 法**（`_0x4c77('0x2','V%DS')` 直接运行出密码）与 ★ **劫持事件法**（在「输入密码以打开此 PDF 文件」的**确定按钮监听处**下断点，刷新即断，鼠标悬停 `value` 看密码）；⑤ ★ **blob 下载片段（源码原样）**：`atob` → `Uint8Array` → `Blob({type:'application/pdf'})` → `a.download` + `click()` + `revokeObjectURL`；源文观察「**比 Python 解码还快**」（**只登记不判因**）；⑥ 边界：去密码用现成工具即可，**本文件只到「拿到明文 PDF」** |
| 661 | `52pojie-1433013-某度文库导出pdf格式的html.md` | `9c3eae06479ee46d5cbb03c4393fbd0c` | 2026-09-24 | `stream-drm-reverse` | evolve | ★ **「打印限制」的最小破除法**：文库类页面「`ctrl+P` 打印」失效时，保存页面后用 **filelocator 搜 `@media print`**（或在 console 里找到 `xreader` 文件 → `reveal in source panel` → 格式化），**把那段 `@media print` 删掉即可**；★ **判据**：「**打印/复制类限制大多写在 CSS 的 `@media print` 媒体查询里 ⇒ 先搜它，再怀疑 JS**」；★★ **边界（源文原话，必须连边界一起用）**：「**此方法只能获取看得到的页面**！！可以绕过复制等限制，**不能破解会员**」⇒ **它解决的是"输出"，不是"权限"**；与「关注公众号 / 回复密码」类**服务端门控**（`web-reverse-hook` 的 `page-unlock-and-userscript-recipes.md` §7）的分工须写清：**门控判定在服务端时，前端手段只能拿到已下发的内容** |
| 662 | `52pojie-1469419-猿人学爬虫攻防赛 第6题.md` | `e207424295ba04fade8634af0806564f` | 2026-09-24 | `web-reverse-algorithm` | evolve | **第 6 题的 node 补环境路线（177 KB）**，与同批 `1288315` 的浏览器断点路线**互为交叉验证**：★ **补环境的验收判据是「值对齐即止」**——把浏览器侧与 node 侧的中间值逐项打印对齐（而不是"能跑不报错"）；★★ **三种调用形态的实测差异**：`express 服务调用`（起 HTTP 服务）/ `execjs 调用`（Python 里 `ctx.call`）/ **`os.popen` 起 node 进程**（源文列了三者的取舍，落地时按「是否需要常驻/是否要传大对象/是否要并发」选，**不是随便挑一个**）；★ **JS 混淆 - 回溯**这条题型的关键：**同一个函数在浏览器与 node 里走的分支不同** ⇒ 必须**逐字符回溯**比对（与同批第 16 题的蜜罐判据同源）；★ 本流水线把它与 `1288315` 的对应用法固化为判据「**同一题有两种解法（浏览器断点 / node 补环境）时，两者的中间值必须能互相对上**」 |
| 663 | `52pojie-1477905-关于遇到加密数据怎么提取的一些案例.md` | `0338ce7b02bad85ffa74da78cc11c292` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **「定位 `JSON.parse`」这条最省事的解密入口找法**（源文全篇只讲这一件事，正文极短却直接给结论）：响应体是密文时**全局搜 `JSON.parse`**（本样本**两处都命中**，都下断点）→ 刷新 → **断下来时密文已经变成明文对象** ⇒ 顺着栈回看**函数名提示**（源文看到的右上角名字是 `des`）⇒ 判定 DES ⇒ 扣代码 + `execjs`；★★ **判据：「解密入口 = 密文进入业务代码的第一个函数」，而 `JSON.parse` 是绝大多数站点的那个点**（比从头读混淆代码便宜一个数量级）；⚠️ 边界：**该判据只在「站点解密后立刻解析成对象」时成立**——若站点先解密再 `eval`、或解密结果先落地到 `window` 变量，则入口分别是 `eval` 与**赋值点**（后者见 `web-js-env-patcher` 的 `crypto-entry-location.md`）；登记：**该样本只给出了"能拿到明文"，未给出 DES 的 key/iv 与模式** ⇒ 不得据本篇复算算法 |
| 664 | `52pojie-1487946-猿人学爬虫攻防赛 第16题.md` | `965b23088522c283f295cc8b270c90bb` | 2026-09-24 | `web-reverse-algorithm` | evolve | ★★ **蜜罐判据的样本来源**（第 16 题）：参数 `m = btoa(ms 时间戳)` 看似极简，但 `btoa` **被页面重写过**——重写后的实现**只用自己产出的值做自洽校验**（喂回服务端不认）；★★ **升格为通用判据**：「**一段代码只用它自己产出的值做校验、不依赖任何外部输入 ⇒ 先怀疑它是蜜罐/纯装饰**」，处置是**浏览器 vs node 逐字符回溯找出被改写的那个内置方法**（**不要试图"改算法"**——算法本身没错，错的是被替换的内置实现）；★ **定位**：XHR 断点关键词 `/api/match/16` → 往前追几个栈；★ 与同批 `1469419`（第 6 题 node 补环境）的关系：**两题都靠「两侧逐字符 diff」收口** ⇒ 本批把这条固化为「**凡『本地算得出、服务端不认』，第一动作是逐字符 diff 而不是改算法**」；⚠️ 登记：源文只给了结论与定位路径，**未给出 `btoa` 重写后的完整实现** |
| 665 | `52pojie-1490196-m3u8 获取 （js学习）.md` | `a1c4bf5f335e569792e5a00b12f35e7c` | 2026-09-24 | `stream-drm-reverse` | evolve | ★ **「按日期算的自定义查询参数」这一形态**：某 m1907 站接口 `GET /api/v/` 需 `z / jx / s1ig / g`，其中 **`z` 是双重 MD5 截断**——JS：`var slig = m.getDate() + 9 + 9 ^ 10; p = String(slig); p = Et(p).substring(0,10); p = Et(p)`（`Et(e)` 单参时等价于**小写 MD5 hex**）；Python：`slig = y.weekday() + 11397`（**这是另一个参数 `s1ig`，不是 `z`**）；★★ **两处静默错（本批真机 + Node 双重复算）**：① **`getDate()`（月内日）与 `getDay()`（星期）语义不同**——本样本 JS 用的是前者，误读成后者会让 `z` 全错（真机实测同日 `getDate=7 / getDay=6`，两条路径产出不同 `z`）；② **`^` 的优先级低于 `+`** ⇒ `getDate()+9+9^10` 是 `(day+18)^10`（**JS 与 Python 同**）；③ **源文给的 JS 片段只算 `z`、不算 `s1ig`** ⇒ 登记为「两版口径不同、非矛盾」；★ **本流水线给出的回归锚点**（源文无示例值）：`day=7 ⇒ z=15a40fd4c6c6019f8f3dba73ff9242f8`、`day=1 ⇒ z=7468d5aae4ba551a0069655a67105999`；请求侧登记 `g=vod.bun` + `referer` 带同一 `jx` |
| 666 | `52pojie-1492463-js hook初学笔记.md` | `f6f3eba9c494105f49ed067bddc4c861` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **hook 时机三档**（源文原话式的清单，本批已并入新文件 §2.2）：① **在控制台注入的 hook，刷新网页就失效** ⇒ 必须在**网页加载的第一个 JS 处下断点**、再手动注入（源文注：「有可能在注入有些站点的时候时机会晚一点」）；② **利用 FD 替换响应**（「FD 就是个代理，让网页数据都从 FD 过」，时机最靠前）⇒ **拦截 + 注入 + 放过**；③ 油猴 `@run-at document-start`；★ **模板（源文逐字）**：`Object.defineProperty(document,'cookie',{set(v){debugger;console.log(v);aaa=v;return v;},get(){return aaa;}})` —— 用**闭包变量 `aaa` 暂存**实现「写入可见、读取可还原」；⚠️ **本批把该模板的两个缺陷如实登记**：① 没有 `Object.getOwnPropertyDescriptor` 保护、② 没有 `toString` 伪装 ⇒ **裸 hook 会被页面检出**（★ 本批真机实测坐实：hook 后 `getOwnPropertyDescriptor(document,'cookie').get` **不再是 `[native code]`**）⇒ 指向 `anti-hook-detection-and-bypass.md`；★ `Object.defineProperty` 的三参数语义（obj / prop / descriptor）与「属性里存的可能是值，也可能是 setter+getter」这段源文注解一并保留为**新手入口** |
| 667 | `52pojie-1601414-ast框架一键还原某里140初体验.md` | `df4d70052af57aff13e513a6215deaa9` | 2026-09-24 | `ast-deobfuscation` | evolve | ★ **反混淆「框架形态」的选型样本**（`sml2h3/ast_tools`，基于 Babel）：入口 `main.js` 里的 **`common_fix.fix`** 是「源码 → 输出」的唯一门面；反混淆核心在 **`./pro/demo1_fix.js`**，其结构是「**官方函数导入区** + **15 个各自独立的功能函数** + **一个主函数集中声明执行顺序**」；★★ **判据：「反混淆框架的价值在『函数独立 + 顺序显式』」**——每个 pass 只干一件事、顺序由主函数集中声明 ⇒ **要改一个 pass 不动其它**（与本仓 `pattern-layering.md` 的「分层可回退管线」对照读）；★ **落地前提**：`npm i iconv-lite @babel/core`、默认输出到 `demos/demo1/output.js`、**10 秒级完成**；★ **验收标准**是「**控制流被还原 + 字符串被解出、可读性显著上升**」，**不是**「100% 去混淆」（源文原话只到「简单的一步操作，将代码的可读性大幅增加」）；⚠️ **登记：源文没有贴出那 15 个函数中的任何一个**（只有截图与文字描述）⇒ **不得编造函数名或实现**，本文件只写「框架形态 + 选型判据 + 使用前提」，具体 pass 内容指向 `decode-obfuscator.md` / `obfuscator-io-four-step-pipeline.md`；⚠️ 源文是 2022-03 的初体验、**未声称通用** |
| 668 | `52pojie-1674294-在线阅读文档解密.md` | `520e65b1e0c44d36f65dc54c2697fb8c` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ **本批「在线文档」簇的主干来源**（四种载体形态 + PDF 文件头）：① ★ **PDF 文件头四种表示法**（源文原话「这个很重要，至少要记住前两行」）：`%PDF-1.` / base64 `JVBERi0x` / hex `25 50 44 46 2D 31` / bytes `{37,80,68,70,45,49}`；② **形态一 · Range 分段**：请求头 `Range: bytes=0-0` 探长 → 改 `bytes=0-` 取全；★★ **实测坑**（源文自陈）：「我碰到过一个，如果直接按 `bytes=0-`，**会报错**，后来发现**直接翻到最后一页，请求头中的范围比响应头返回的要小十个字节左右**」⇒ **以响应头 `Content-Range` 的 total 为准核对边界，不要盲信一次 `0-` 拿全**（**单样本，只作该案例实测登记**）；③ **形态二 · base64 内嵌**（解 base64 写文件，或直接下 blob）——⚠️ 「**有可能 pdf 会有密码**，也有可能在生成 blob 时加上了密码」；④ **形态三 · AES 等整体加密**（`aHR0cDovL3d3dy5qdHlzYnouY246ODAwOS9wZGYvdmlld2VyLzA5NDY0MjcyNWJmOWE=`：XHR 断点 → 看堆栈 → 源文「人家注释都标上了，就是一个 AES」）；⑤ **形态四 · 一次性 URL + 签名分页**：`pinst / nonce / stime / sign` 四参数，`nonce = uuid.uuid4()`、`sign = MD5('123456' + nonce + stime).upper()`、页数参与循环；★ **两个验证动作**（本批提炼）：**右键「阻止请求域」→ 翻页 → 链接生成了但发不出去** ⇒ 拿到链接；**同一链接跑两次，第二次失败** ⇒ 坐实「一次性」；⑥ **附带形态 · 逐页图片流**：元数据整串 base64 + AES/ECB + JSON；图片本体**只重映射中间 10% 的字节**（走 `canvas_info` 索引表） |
| 669 | `52pojie-1722262-畅玩空间SVIP解锁（ajaxHooker应用）.md` | `862b669b4831059685988e841155ed1e` | 2026-09-24 | `web-reverse-hook` | evolve | ★ **「改响应体」这条最省事的解锁路线**（源文全文极短、核心代码就几行）：油猴里 `@require` 引 `ajaxHooker`，`ajaxHooker.hook(request => { if (request.url.endsWith('userinfo')) request.response = res => { const a = JSON.parse(res.responseText); a.info.LevelInfo.VipLevel = 10; a.info.LevelInfo.Svip = 1; res.responseText = JSON.stringify(a); }; })`；★★ **判据：「改『响应体』比改『页面状态』稳」**——页面自己会去读接口结果，**把接口结果改成"有权限"即可，不需要去找 UI 上的判断点**（对比 `page-unlock-and-userscript-recipes.md` §1 的「控制台条件断点注入法」：那条适合**找不到接口、只能改状态**时）；★ **油猴头部关键三行**：`@require`（引库）、`@grant unsafeWindow`、`@run-at document-start`（**时机必须最早**，否则页面先发请求就晚了）；⚠️ 边界：**只对"页面自己请求、自己渲染"的前端门控有效**；若服务端按权限裁剪了响应内容，改 `responseText` 也拿不到（与 §7 内容门控的服务端边界同一条） |
| 670 | `52pojie-1790893-超星考试pos参数破译.md` | `f31b376bcd8968da7f36182866dbddd3` | 2026-09-24 | `reverse-knowledge` | evolve | ⚠️ **源文作者自陈这是他自己造的练习站**（「并非通俗意义超星，请勿联想」）⇒ **新蓝图 `chaoxing-pos` 的 title/summary 已如实标注**，不得据它推断真实超星站。★ **`pos` 的四件套**：`pos = "(" + ceil(pageX \|\| clientX+scrollLeft) + "\|" + ceil(pageY \|\| clientY+scrollTop) + ")"`（鼠标坐标串）/ `qid = document.getElementById('questionId').value` / `rd = Math.random()` / `_edt`；★★ **`enc` 的完整算式（本批核心）**：`s = userId + "_" + questionId + "\|" + randomNum` → `d = 逐字符 charCodeAt().toString()` **首尾相接**（不是分隔）→ `m = floor(d.length/5)`、**`k = parseInt(d[m] + d[2m] + d[3m] + d[4m])`（四个位置拼成十进制数）** → `k < 2 ⇒ return null` → `r = round(1e9*rd) % 1e8`、`d += r`、若 `d.length > 10` 则 `d = parseInt(d.substring(0,10)).toString()` → ★ **LCG**：`M = 2^31-1`、`a = ceil(s.length/2)`、`seed = (k*d + a) % M` → 对 `posData` 逐字符 `x = charCodeAt ^ floor(seed/M*255)`（<16 补 `0` 转 16 进制），**每轮 `seed = (k*seed + a) % M`** → 最后把 `r` 转 16 进制**左侧补 `0` 到 8 位**追加；★ **本批真机 + Node 双重复算**：产出长度 = `2n+8`、全小写 hex，并**实测「漏更新 seed」的静默错**（长度仍对、内容全不同、不报错）；★ **OB 字符串表的「内存爆破」处置**（源文实测）：`RvZSqA` 里 `new RegExp(...).test(...)` 的三元分支跑出 `false` 会触发 `Math.random()` **死循环 push** ⇒ **先把三元强制成 `--this["pNCgln"][1]`**，再「把第一个分支设 `false`、第二个设 `true`」；环境检测（`navigator.webdriver` / `$cdc_` / `PhantomJS`）在还原时**直接 `return true`**；★ 两个通用手法也一并登记：`generator(ast,{minified:true, jsescOption:{minimal:true}})` 先做**字符串转义最小化**、`path.replaceInline(types.stringLiteral(...))` 批量替换 |
| 671 | `52pojie-1843783-小鹅通视频下载，猫爪密匙解析失败后的方法.md` | `84a0dea6781878a39bccb15a02b931db` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ **「下载器报密匙错误」的第一嫌疑不是 key，而是"拿到的 URL 是切片形态"**：网络面板里只有 `…_0.ts?start=0&end=132927`（猫爪提示「密匙无法解析」），**把 `_0.ts` 改成 `.m3u8`、把 `start=0&end=` 删掉**即可直接下载；★ **原理（本批提炼）**：`?start=&end=` 是**服务端按 Range 切片**的形态，**同一路径去掉 Range 参数即返回完整清单**；★★ **升格为通用判据**：「**下载器报 key / 密匙错误时，先确认手上是『切片 URL』还是『清单 URL』**」；⚠️ **边界（必须一起写）**：这只对「ts 与 m3u8 同路径、靠查询参数区分」的服务端成立，**不是所有站都能这么改**（改了仍不成 ⇒ 回 `preview-gating-and-segment-enumeration.md` 走分片枚举）；源文为 **2023-10 单案例实测**；★ 另登记源文提到的两条**当时的失败路线**（改 `_0.ts` 为其他名 / 只改后缀不删参数）与它们的现象，用于排错 |
| 672 | `52pojie-1851890-文心一言开发者控制台调试破解.md` | `6165b5c103375ddc654239f75ce354bd` | 2026-09-24 | `web-reverse-hook` | evolve | ★★ **按 `this.toString()` 精确 hook `apply` 掐掉无限 debugger**（本批真机端到端验证）：`const apply = Function.prototype.apply; Function.prototype.apply = function (thisArg, argsArray = []) { if (this.toString() === 'function anonymous(\\n) {\\ndebugger\\n}') return; return this.call(thisArg, ...argsArray); }`；★★ **与既有「静态改文件」路线的区别（必须写清）**：既有四招（函数级注释 / `return;` 前置 / 注释 `eval` 调用 / 中间人改 `eval` 实参）都要**改得到文件**；本手法是**动态、按函数源码文本精确匹配**，适用场景正是「**代码在 JSVMP 里、文件不好改**」（源文原话「往上一层可以发现是 jsvmp，这样替换文件相对来说就不太好搞」）；★ **前提观察**：「**卡在 debugger 就跳转页面、放行 debugger 就正常使用 ⇒ debugger 前后存在计时程序**」——**这条观察是选择该手法的依据**；★ **本批真机实测坐实三条**：① `new Function('debugger').toString()` 与源文写死串**逐字节相同**；② **反证**：带分号（`debugger;`）或带空格（` debugger `）的写法**对不上** ⇒ **匹配必须逐字符精确**；③ **端到端**：装上 hook 后该函数**被静默吞掉**、且**不影响正常 `apply`**（`fn.apply(null,[1,2])` 仍返回 3）；⚠️ **风险登记**：劫持**全局** `Function.prototype.apply` 影响面大（只适合调试期用），且需在页面脚本**最早**注入 |
| 673 | `52pojie-1911970-css字体反扒的尝试记录小说下载.md` | `2ba1b2f21d5e86a0430505ff2e50044c` | 2026-09-24 | `web-font-obfuscation` | evolve | ★ **「cmap 查表走不通 ⇒ 改走字形 OCR」这条路线分岔的样本**（知乎盐选付费专栏）：★ **三步判定（源文实测，务必按序）**：① 新开标签页**先 F12 再禁用 JS**、再粘贴网址（否则页面直接跳转，抓不到源码）；② **对比网页显示文字与 HTML 源码文字** ⇒ 不等即反爬；③ **刷新两次对比源码文字**——源文原话「发现是两次源代码的文字是不一样的，确认是动态加载」⇒ **这就是「映射每次都变」的判据**（真值表不稳定 ⇒ 查表法失效）；★ **主流程五步**：读源码 → 提取 base64 字体 → **从字体里取出「字形图片 + 真 Unicode」** → 识别字形 → 按规则替换正文；★★ **核心坑：「按映射表逐条 `replace` 会自我污染」**——源文例：原文 `一二一二…`，识别结果 `[("一","二"),("二","一")]` ⇒ 第一次把「一」全换成「二」、第二次又把「二」全换回「一」，**结果全错**（源文实测现象：`到 02 把"不"替换为"用"`、`到 31 又把"用"替换成"可"`）；源文修法是用 `replaced_positions = set()` 记录**已替换位置**；★ **本批由主线补出源文没做的推演**：根因是「**顺序 + 就地改写同一个串**」，**通用解是单趟逐位置映射**（`''.join(map_table.get(ch, ch) for ch in text)`），源文的 `set()` 方案能修好单字符映射，但**当「被混淆的字」与「本来就是真值」是同字符时仍依赖遍历顺序**；★ **OCR 选型三段弯路**：Tesseract（需装 exe，「一个都没识别出来」⇒ 放弃，**属源文环境/配置问题**）/ easyocr（「某些可以识别，某些不能识别」+ 包大 + 英文文档 ⇒ 放弃）/ **CnOCR**（**有中文文档 + 有在线测试站**⇒ 采用，★ 判据「**选 OCR 之前先用它自己的在线 demo 跑你的字形图**」）；⚠️ **落地坑**：CnOCR 需**单独下载「检测模型」与「识别模型」**（源文因网络原因需手动下载后放入指定目录）；★ 同族交叉验证：与 `1288315` 第 7 题「**每请求一次字体文件都换**」互为第二样本 |
| 674 | `52pojie-1912763-reese84 及_utmvc 逆向流程分析.md` | `c3edfda4eca14a7438222346b2766014` | 2026-09-24 | `web-js-env-patcher` | evolve | **reese84 cookie + `___utmvc` 两个样本**（源文作者自陈「自己也是一知半解的」，只登记可复现部分）：★ **reese84 的本质**：「其实就是个 cookie，**只有带着这个 cookie 才能去请求页面**」，而它**靠 hook 拿不到**——**值是从接口返回的**（判据：**刷新页面后两个带 `d=` 的链接**，负载里的 `p` 就是上一步请求生成的东西）；★★ **定位法（源文给的唯一抓手）**：`invokeTask` 方法入栈 ⇒ 全局搜 `return this._invokeTaskZS ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this._invokeTaskCurrZone, t, e, n, r) : e.callback.apply(n, r)` ⇒ 断在 `e.callback.apply(n, r)` ⇒ **跳大约 5 个栈**进到 `<computed>` 的下一个匿名栈 ⇒ 即算法生成处；★ **升格判据**：「**Zone.js 的 `invokeTask` 是 Angular 系站点里『回调链最后一跳』的通用入口**」；★ **扣代码三条**：① `NV` 是 **19 个方法**构成的数组；② `CN[wm.substr(1613,13)](wm.substr(234,1) + Dp9); Dp9 += 1;` 这类**「字符串切片当属性名」的调用**在循环填大数组；③ 最终 `window.JSON.stringify(Hw)` 后**再走一层 base64** ⇒ 生成 `p`；★ `___utmvc` 那条：服务端抛一段 **OB**，AST 两步（`delete path.node.extra` 去转义 + 对 `_0x…` 调用 `eval(path.toString())` 合并大数组）⇒ 「全部解混淆之后找到 cookie 生成的地方慢慢扣」；⚠️ 登记：源文**未给出 reese84 的完整算法**（只到「生成地方」）与 `___utmvc` 的最终公式 ⇒ 不得据本篇复算 |
| 675 | `52pojie-1917707-[2024-04-22] 西瓜视频的视频下载链接变动.md` | `b43b83403dca3d5f9623dfeed59b453b` | 2026-09-24 | `stream-drm-reverse` | evolve | ★ **页面直出（SSR）载体这条零请求入口**：`window._SSR_HYDRATED_DATA` 就在播放页 HTML 文档里，**不需要任何接口调用**；★ **演进事实（源文标题即结论）**：`2024-04-22` 起该字段里的下载链接**从「只 base64」升级为「先 AES 再 base64」** ⇒ 判据「**直出载体里的字段会单独升级，不要因为"以前只 base64"就跳过**」；★ **算法（源文给出的 Python，原样收录）**：`data = b64decode(密文)` → `key = key.encode()`、**`iv = key[:16]`（IV 取 key 前 16 字节）** → `AES-CBC` → `unpad` → **再 `b64decode`** → `decode()`；★ **识别信号**：「HTML 里有一个巨大的内联 JSON 赋值」⇒ **先看 HTML 有没有直出，再考虑抓接口**（与 `playback-address-interfaces.md` 的接口链路分工写清）；⚠️ **登记（只登记不判因）**：源文自陈「**测试时发现有两种情况**」（给了两张截图但**未说明差异**）⇒ 如实写「源文未说明第二种情况」；⚠️ 源文**只给了 key/iv 的截图、没有把 key 写成文本** ⇒ **不得编造 key/iv**，只写「从截图取值」；★ 边界：源文自陈「整个分析过程我觉得**运气**占了 90%」「本文只给出思路，不提供程序」 |
| 676 | `52pojie-1984407-testab 逆向流程分析.md` | `c3b2ee34e3116d7b088a75571569a943` | 2026-09-24 | `web-js-env-patcher` | evolve | ★ **「接口里返回 VM 代码」这条流水线的第三个样本**（与 reese84 / `___utmvc` 归并）：定位是「直接搜索参数名 → 下断点 → 发现进了 JSVMP」，且**VM 代码是某个请求里返回出来的**；★★ **补环境清单与顺序（源文实测顺序，务必按序）**：① **`self = top = window;` 且 `window.self = window.top = window;`**（源文原话「第一步就是要赋值」，**到这一步就能生成一个错误的值了**）→ ② **删 `process` / `global` / `buffer` 等 Node 检测**（`Process 检测`：「在开头也要删除掉 process，可以把 global buffer 的一些 Node 检测全部删除」）→ ③ `appendChild` 的**先后问题**（★ 源文原话「如果这个不会补，**可以不补**。你实现的乱七八糟可能不一定对，反正最后都是 `false`」）→ ④ `createElement` 拿 CSS 标签值（**要对比**）→ ⑤ **原型链检测 + `toString()` 检测**（含 `Image` / `Screen` / `HTML*` / `Window`）；★★ **验收判据**：在 `apply` 调用处打印 `args`，**与浏览器里的「64 位大数组」逐值一致 ⇒ 补 OK**（本批用 Node 把该数组复算成 **64 位小写 hex**，与源文「64 位大数组」的表述互证）；★ **纯算路线的「笨办法」（源文自陈，教学价值高）**：① 找出某个生成值 → ② 看逻辑 → ③ **在逻辑处持续插装打值** → ④ 基于值分析；**定位点**：沿「返回的指令集索引」逐个对栈；产物是一串 `String.fromCharCode` 的 char code 数组 ⇒ `map(String.fromCharCode).join('')`（本批自算得 `32b2827348643a73a081a1eed35fc86517d364460f5a4805a47c9fe69c150c1d`）；★ **工具建议**：`v-jstools` 吐环境后改 `process` 等值；⚠️ 登记：源文**没有给出生成该数组的完整算式** ⇒ 「源文未展开、不可直接复用」；★ 判据「**手补环境不能跑错，一步错步步错**」 |
| 677 | `52pojie-2021569-闲鱼数据的获取与下载.md` | `47b17fac4048e483aaf7877d82036789` | 2026-09-24 | `reverse-knowledge` | evolve | ★ **新建蓝图 `xianyu-mtop-h5-sign`**（淘宝系 mtop h5 这一支的固定形态，与在册 `taobao-isg-cna` **不同面**）：`POST https://h5api.m.goofish.com/h5/mtop.taobao.idlemtopsearch.pc.search/1.0/`；★ **固定 query**：`jsv=2.7.2` / `appKey=34839810` / `v=1.0` / `type=originaljson` / `accountSite=xianyu` / `dataType=json` / `timeout=20000` / `api=<api 名>` / `sessionOption=AutoLoginOnly` / `spm_cnt=spm_pre`；★★ **`token = _m_h5_tk` cookie 值的 `split('_')[0]`**（cookie 形如 `<token>_<过期毫秒>`）、**`t = round(time.time()*1000)` 毫秒串**、★★ **`sign = md5(token + "&" + t + "&" + appKey + "&" + data)`**，其中 **`data` 是那个**紧凑 JSON 字符串本身**（键序与空格都必须与浏览器一致）**；★ **本批 Node 复算四条**：sign 为 32 位小写 hex、**顺序敏感**（换顺序结果不同）、**`data` 不能用再序列化结果**、`_m_h5_tk` 切分口径；⚠️ **源文缺陷登记**：`shop_link` 里 `itemId=893424239322` **是写死的常量**、而 `categoryId={shop_id}` 实际塞的是 **itemId**（**字段名与实际值不符**）⇒ 不得照抄进「正确做法」；⚠️ 源文 `cookies`/`headers` 里的凭据是**已过期的示例值** ⇒ 蓝图只写「从浏览器取」 |
| 678 | `52pojie-2036327-得物网页端首页推荐物品信息获取.md` | `89b87de89404a4c8673ad4ccc1e41c1e` | 2026-09-24 | `webpack-bundle-extraction` + `reverse-knowledge` | evolve | ★★ **本批唯一的「结论级升级」来源**：整包是 `!function sign(e){…}({0:function(…){…}, …})`，★ **判据「某些包会把 require 直接暴露到全局」**——该包**尾部有 `window.b = a`**（`a` 即 `__webpack_require__`：`var n = {}` 缓存表 + `a.e` 懒加载 chunk 加载器）⇒ **先看 IIFE 尾部有没有 `window.X = <loader>`，有就直接用，不必自己造加载器**；★ **宿主复用形态**：Python `ctx = execjs.compile(整包)` → `ctx.call('cxx', data)` → 写回 `data['sign']` ⇒ **把一个薄调用壳交给 JS 引擎，而不是把算法翻译成 Python**（★ **入参是对象不是字符串**，复用时必须保持同样形态，不要自己先 `JSON.stringify`）；★ **代价登记**：耦合 JS 引擎 / 并发受限 / 必须带全包 ⇒ 与 `node-reuse-and-env-handoff.md` 分工；★★ **跨面互证导致既有蓝图升级**：该包的 `cxx(t)` 给出完整实现 `md5(升序拼串 + "048a9c4943398714b356a696503d2d36")`，而同包第 597/746 行即 **blueimp-md5** 的 IV 常量 ⇒ 与在册 `dewu-sign` 蓝图（`stark.dewu.com` 商家后台面）**同常量、同拼法** ⇒ **`dewu-sign` 的 `family` 由 `unknown` 升为 `hash`（MD5）**、`version → 1.1.0`，但 **`status` 只记 `partial`**（两面都没有服务端返回值可对拍）；★ 另登记源文的**业务枚举做法**（类目 id 用 0–10 编号映射到 `pickRuleId`）与 **`ctx.call('cxx', …)` 的两次调用**（首页与翻页各一次）；⚠️ 注册与翻页用的是**不同参数集**（`pickRuleId/pageNum/pageSize/filterUnbid/showCspu`）⇒ **不可与商家后台面的参数名互相照抄** |
| 679 | `52pojie-2088383-pdf.js 通用pdf下载教程.md` | `20330b6892fe92c202586a342b4f1ef3` | 2026-09-24 | `stream-drm-reverse` | evolve | ★★ **pdf.js 的两条通用抓手 + 一个可逐字符复算的算法**：① **通用下载**：F12 定位到 pdf 渲染层（页面嵌套）后**执行 `PDFViewerApplication.download()`**——源文原话「**基本上通用**」（除非服务器做了限制）；② ★ **追密码：在 pdf.js 里搜 `.onPassword`**（手速不够就刷新；有密码时会在此断下并报 `No password given`）——**偷懒做法是在 `e.onPassword` 的第一个回调参数（即 `s` 函数）下断点**；★★ **完整密码链（本批逐字符复算通过）**：外层页面把 `document.getElementById("r0inab").innerText`（**JSON**）通过 `postMessage` 发给内层，内层 `onPassword` 的 `window.addEventListener('message', …)` 收到后逐字符解码：`for (o = 1; o < n.length; o++) o % 2 && (s += String.fromCharCode(parseInt(n[o-1] + n[o], 36)))`（**两位一组按 base36 解析**）；★ **源文给出的密文与密码可对拍**：`2s1e1k2p1d1j2t2p1e1g1d1h172u1g1j2p171k2t1d1d172s1h2p2u171f2u2q1c1g1f2u1j` ⇒ **`d28a17ea2415+f47a+8e11+d5af+3fb043f7`**（本批 Node + 真机 Chrome **双重复算，逐字符命中**）⇒ 这是本批**唯一有源文 oracle 的算法**；★ 两个 `script` 标签 `r0inab` / `r0inyk` 分别承载密钥与密码；★★ **登记（只登记不判因）**：源文观察到「**同样是这个密码，Chrome / 2345pdf 说密码不对，而 Edge / 福昕 / ilovepdf 能正确打开**」⇒ 软件差异，源文未给原因；边界：**`download()` 拿到的可能仍是带密码的 PDF** ⇒ 两步都要做 |
## 批次 B36 · 2026-09-25（第三十七次执行）

**开局状态**：台账 B35 后 **679** 条 / 目录 `.md` **1183**（文章 **1178**）/ 待处理 **499**。
三方对齐（台账最后一节 = B35 × 自动化记忆最后一条 = B35 × `git log` 最新 = `78c9090`）**一致** ⇒ 上一轮已闭环。
`scan-pending.js` 反引号口径自检 **0**。

**取材口径（按记忆里「遗留 / 下一批（B35 更新）」的优先级 ①）**：

- **① 归档线第 36 轮新收 16 篇 —— 本批 16 篇 = 全取（16/16 命中）**：
  媒体链路 5（`2077700` / `1945942` / `1950455` / `1950086` / `1910333`）·
  文档 / 阅读器 3（`1960261` / `1912173` / `1757892`）·
  调用点与登录参数 3（`1853120` / `1829398` / `1829895`）·
  运行时与壳 1（`2082856`）· 数据载体 1（`747271`）· 账号链 1（`1689437`）·
  网页导出 1（`1923373`）· 换靶与自定义头 1（`1805527`）。
  **命中率 16/16**（建档即定稿，无需二次筛）。
- **未取**：网马时代线（继续不列，但本批的 PHP eval 壳按「载荷取证」口径收进 `web-malware-forensics`）；
  验证码簇（本轮无「新题型 / 完整纯算交付」供给）；网盘族（本轮无新形态供给）。

> ⚠️ 本轮**未**新增任何技能 —— 16 篇全部有最近邻模块，**能力缺口评估 = 0**（详见下文「新建技能评估」）。
> 候选新技能 `captcha-flow-orchestration` B5–B36 **三十次确认不新建**。

### 材料 → 技能分流（含「为什么不是新建」的判据）

| 材料簇 | 最近邻模块 | 判据（为什么落这里 / 为什么不是新建） |
| --- | --- | --- |
| 媒体链路 5 篇（MSE / pdx / `.ts`→`.m3u8` 第二样本 / 音乐站 / 字体乱码） | `stream-drm-reverse` + `web-reverse-hook` + `web-font-obfuscation` | 三处**都是既有文件的纵深**：MSE 工程层补 `player-and-live-capture.md` §2.5；pdx 补 `hls-and-ts-structure.md` §4.6.2；`.ts→.m3u8` 补 `playback-url-shapes-and-page-carriers.md` §4.4；字体补 `glyph-ocr-and-rotation.md` §9。**没有一条构成新能力面** |
| 文档 / 阅读器 3 篇（PBKDF2 容器 / PHP eval 壳 / 小鹅通同型） | `stream-drm-reverse` + `web-malware-forensics` | ①`1960261` 是**在线文档载体形态的第 7 种**（§5.4），落在既有「载体形态分流表」里；②`1912173` 是 **PHP 载荷壳**，与 `payload-and-obfuscation.md` 的「五类壳」同族 ⇒ 进取证技能，**不新建 `php-deobfuscation`**（一篇、且与既有壳同构） |
| 调用点 / 登录参数 3 篇 | `web-reverse-algorithm` | `1853120`（JSEncrypt + 拼音命名）/ `1829398`（响应解密出口 + 自定义头）/ `1829895`（双向加密同一对象）⇒ 全部是 `12-login-and-account-params.md` §4 与 `15-call-site-locating-playbook.md` 的**换靶动作**，属既有手册的方法面 |
| 运行时壳 1 篇（扩展 popup 当网页） | `desktop-client-reverse` | `extension-and-nwjs.md` §1.1–§1.7 已把「扩展 = 网页」这条判据写进 §1.1；本批补的是**§1.8「popup 当标签页 + 断 click 找 window.open」**这一层操作面 ⇒ 既有文件的纵深 |
| 数据载体 1 篇（随机资源名下发接口） | `target-analysis` | `in-page-data-carriers.md` 的定位就是「页面直出载体 + 列表采集驱动」；本批补 §3.4「随机名只随机一段 ⇒ 找下发接口」 |
| 账号链 1 篇（羊了个羊免抓包） | `reverse-knowledge` | 在册蓝图 `yanglegeyang-map` 的**同一平台**，补的是「账号链 user_info → login_oppo → token」与「更早的 `game_over` 非 `_ex` 端点」⇒ **升级既有蓝图**，不是新建 |
| 网页导出 1 篇（打印成 PDF） | `web-reverse-hook` | `page-unlock-and-userscript-recipes.md` 已有「资源捕获型油猴脚本」；本批补 §6.5「DOM 门控 + `window.print` + `matchMedia('print')`」 |

### 新增技能评估（结论：**0 新建**）

| 候选 | 评估 | 结论 |
| --- | --- | --- |
| `php-deobfuscation` | 只有 1 篇供给；且该壳与 `web-malware-forensics` 的「五类壳」**同构**（可逆编码壳 + 函数名拼装） | **不建**（避免滥建冗余技能；已作为 §3.6 落库） |
| `browser-extension-automation` | 只有 1 篇；`desktop-client-reverse` 已声明扩展族为其能力面 | **不建** |
| `captcha-flow-orchestration` | 本轮供给里**没有验证码簇** ⇒ 无新证据 | **第 30 次确认不建** |

### 本批自曝缺陷（全部在本轮内修完，并登记进台账表格）

1. **`browsercli call evaluate_script` 是「表达式求值」，不是「脚本执行」**：
   传 `(function(){…})();`（**带尾分号**）会报 `SyntaxError: Unexpected token ';'`；
   同理，以 `var x = …` 开头的多行脚本会报 `Unexpected token 'var'`。
   ⇒ **必须写成「单个表达式且不带尾分号」**（`(function(){…})()`）。
2. **`b35-parse-assert.js` 不适用于对象数组结果**：B35 的返回是「字符串」，B36 的返回是
   **对象数组**，browsercli 的 YAML 渲染随之变成 `value[11]{name,pass,detail}:`（带类型注解），
   原来的 `\n      value: ` 锚点直接 `NOT FOUND` ⇒ 本批新写 `b36-parse-assert.js`，
   改从 `result: "<被转义两次的 JSON>"` 取。
3. **`Function.prototype.toString.call` 的「源文写法」被真机证实无效**（源文把它当钩子）：
   实测 `String(fn)` **仍吐真实源码**，它只骗得过「显式 `.call`」这一种调用形态
   ⇒ 已作为**源文缺陷**登记进 `player-and-live-capture.md` §2.5。

### 验收（全部实跑）

`check_skill_integrity.js` **0 阻断 0 告警**（台账 679→**695** / 候选 1178 / 待处理 499→**483**）·
双镜像 **584 文件逐字节一致**（`md5` 全量比对，diff 0）·
`blueprint-lint.js` **error 0 / warn 1**（= 基线，warn 为 `toutiao-a-bogus` 缺 `mutations.json`，既有）·
`query-blueprint.js --selftest` **33/33** ·
`b36-verify-numbers.py` **30/30**（含 PBKDF2 逐字节对拍、JWT 载荷解出、PHP 下标拼名复算）·
★ **browsercli 真机 Chrome 11 项断言全绿**（`b36-browsercli-report.md`）·
台账 `verify-ledger-md5.py` 全量逐条一致 · 幂等复跑。

### 本批唯一的「结论级升级」

**`yanglegeyang-map` 蓝图从「单一端点」升级为「双端点 + 账号链」**：
`1692161`（2022-09-28）只给了 `game_over_ex`；
`1689437`（2022-09-18，**更早 10 天**）给的是 **GET `game_over` / `topic_game_over`**（**不需要对局记录**）
以及 **`user_info → login_oppo → token`** 这条「免抓包」账号链。
⇒ 两篇**不是同一件事的两份记录，而是同一个平台的两代端点**；
已在 `workflow.md` 里做成 A/B 双线对照表，并把「`t` 的两种口径**未对齐**」如实登记进 `gaps`
（**本库不裁决**：1692161 说 t 是「登录小程序得到的账号信息」，1689437 直接把登录返回的 token 当 t 用）。

**### 独立评审（第三视角 · 1 名，压窄到 6 条清单）

评审方式：独立 agent（`lite` 模型），**只给机械证据、不给评价**；清单压到 6 条
（承 B13 教训：清单越长越容易超时；超时 ≠ 通过）。

| # | 检查项 | 结论 | 评审给出的证据（摘） |
| --- | --- | --- | --- |
| 1 | 新增引用是否悬空（`references/*.md`、`../../<skill>/*`、`§N.N`） | **通过** | 逐文件 `grep -n "^#"` 核对：`online-document-unlock.md` §5.4/§9.9/§9.12、`hls-and-ts-structure.md` §4.6/§4.6.1/§4.6.2/§4.7、`player-and-live-capture.md` §2.2/§2.5/§3、`glyph-ocr-and-rotation.md` §5/§6/§9、`payload-and-obfuscation.md` §3.5/§3.6、`15-call-site-locating-playbook.md` §3/§8.5、`12-login-and-account-params.md` §4.4/§4.5 **全部真实存在**；文件引用解析 `missing = 0`、`§` 解析 `BAD = 0` |
| 2 | `references/` 下的跨技能引用层级（必须 `../../<skill>/`） | **通过** | 全批新增跨技能引用均为退两级；无 `../<skill>/` 错层 |
| 3 | 新增数字可复算 | **通过** | 7 条全部命中：PBKDF2 = `1f67c8caec75e3069c52e43e29555904`；`RleW2az0Y70z3eQ0CZFLJA==` → `465796d9acf463bd33dde43409914b24`（16 字节）；`MD5("215")[:16]`/`MD5("171")[:16]` **均不等于**源文 key；`V0hBVCBUSEUgRlVDSw==` = 13 字节；PHP 下标拼名 = `base64_decode` / `strtr` / `52`（源串 94 字节）；`0x18 = 24`；`98d2ea56…` 为 32 个合法 hex |
| 4 | 源文保真（抽查 6 篇 / 16 个面量） | **通过** | `h5vodLastPostion`=3、`captureFromStart`=6、`Function.prototype.toString.call`=1、`Polyv`=3、`seed-const`=3、`ddddocr`=3、`业k`=1、`action: window.print`=1、`matchMedia('print')`=2、`jiami`=2、`n.encrypt(password)`=1、`login_oppo`/`wx_open_id`/`topic_game_over` 各 1（已去 Markdown 转义后比对） |
| 5 | 蓝图四处一致性 | **通过** | `blueprint-lint.js` → **error 0 / warn 1**（warn 为既有 `toutiao-a-bogus`）；index 条目 vs metadata 的 title/summary/status/aliases/keywords **逐字段 EQUAL** |
| 6 | **口径冲突** | **❌ 不通过（1 项）** | `t` 的语义在**同一蓝图内被写成两种**：`metadata.json` summary 与 `workflow.md` 第 16 行**单方面定性为「token」**，而 `gaps` / `parts.json` / `mutations.json` / `workflow.md` 结尾四处写着「**两篇未对齐，本库不裁决**」⇒ 自相矛盾 |

### 评审缺陷处置（本轮内全部修完）

| 缺陷 | 处置 | 复核 |
| --- | --- | --- |
| **D1（major）`t` 语义在同一蓝图内自相矛盾** | 把「单方面定性」的四处全部改成**中性表述 + 指向 gaps**：`metadata.json` 的 `summary` / `entry.transport`、`index.json` 的 `summary`、`workflow.md` 的「入口与传输」与 A 线第 4 步（改为「**被当成**登录返回的 token 用 —— 口径未对齐，本库不裁决」） | `blueprint-lint.js` error 0；index↔metadata 逐字段 EQUAL 复跑通过；`grep 账号信息` 复核无残留单方面定性 |
| **D2（minor，评审附带指出）`payload-and-obfuscation.md` 小节号顺序被破坏** | 新 §3.6 原插在既有 `#### 3.5.5` **之前**（顺序成了 3.5.4 → 3.6 → 3.5.5）。**把 `#### 3.5.5` 移回 §3.5.4 之后**，再放 §3.6 | `grep -n "^#### 3\.\|^### 3\."` 复核为 3.1→3.6 单调，且 `3.5.5` 只出现 1 次（无重复块） |

> 评审**未通过**的只有 1 项（D1），已在本轮修完并复核；
> D2 由评审附带指出，一并修完。**评审其余 5 项全部通过**，且其中第 3、4 项是**独立复算**（不是转述本批自算结果）。**

### 处理清单

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 680 | `52pojie-2077700-对 cctv视频下载解密简化步骤 里失效的脚本做了更新.md` | `371afdab417415d02df60e2e765d3e43` | 2026-09-25 | `stream-drm-reverse` + `web-reverse-hook` | evolve | ★★ **本批最有价值的架构判据**：源文脚本原本**按 URL 抓**（先解析分片直链），**一遇 CDN 改域名就整体失效**；作者的处置不是「再解析一次新域名」，而是**把抓取层下移到 MSE 层**（`SourceBuffer.appendBuffer` 的字节流，**与域名无关**）⇒ **「过一阵就失效、每次都是地址变了」的抓取脚本都该做这次下移**；★ **落 `player-and-live-capture.md` §2.5「工程层」**：**从头捕获**（`currentTime=0` **且必须同时清站点进度记录**，源文站点是 `localStorage.h5vodLastPostion`，**只清 video 不清 storage 无效**；另需清缓存硬性重载）、**十倍速攒片**（`playbackRate=10`，纯工程优化）、**`iframe[sandbox]` 剥离**（克隆 → `removeAttribute('sandbox')` → 替换）、**流式落盘**（StreamSaver + mitm iframe，长视频不全缓存防 OOM）、**`addSourceBuffer.toString → [native code]`**（影响面比改全局原型小，**这条要照抄**）；★★ **两处真机复核**（`b36-browsercli-verify.js`）：① `iframe[sandbox]` 克隆去属性后**残留 0 个 sandbox iframe**；② 被替换的方法单独挂 `toString` **确实通过 `[native code]` 检测**；⚠️ **源文缺陷（真机证实）**：源文用 `Function.prototype.toString.call = function(caller){…}` 反检测 —— **实测无效**：`String(fn)` 仍吐真实源码，它只骗得过「显式 `.call`」这一种调用形态 ⇒ 已登记为缺陷；★ **落盘前两道过滤**：**有效缓冲区判据 `bytesWritten > 0`**（只判「有没有 `SourceBuffer`」不够，源文因此报「没有找到有效的媒体数据」）+ **多轨分别落盘**（`mime.split(';')[0]` → `video/*` 存 `.m4v`、其余 `.m4a`）；★ 判「流结束」= `endOfStream` 被调 **或** `readyState === 'ended'`；⚠️ **边界**：脚本基于开源 `media-source-extract`（Momo707577045）二次修改，**引用连出处一起写**；`streamSaver.mitm` 指向**第三方域名**（`upyun.luckly-mjw.cn`）⇒ 离线/内网失效；⚠️ 源文头部有代楼主编辑批注「**内容已失效**」⇒ **只取正文工程手法，不当成可照抄的成品**；`web-reverse-hook` 侧同步在 `page-unlock-and-userscript-recipes.md` **§6/§10 来源表**登记指针 |
| 681 | `52pojie-1945942-pdx下载和播放.md` | `49f556f28a288d4ae3bee6a6a643e693` | 2026-09-25 | `stream-drm-reverse` | evolve | ★ **某利威 / polyv 族的第三种来源形态：`.pdx` 容器**（既不是 `.m3u8` 也不是 `.ts`，`N_m3u8DL-RE` 默认处理会失败）⇒ **落 `hls-and-ts-structure.md` 新 §4.6.2**：`--custom-hls-method Polyv --custom-hls-key <16 字节> --seed-const <n> -H "Referer:…"`，**v13 另需 `--binary-merge`**；★★ **代次判据可机械判别**：**不加 `--binary-merge` 就能出可播 mp4 ⇒ v12**；**必须加、且产物要用专用播放器 ⇒ v13**；★★ **本库复算（`b36-verify-numbers.py` 已断言）**：`--custom-hls-key` 的两种**编码形态**都可（v12 `98d2ea568b5316a9eb9aae8596ef2241` 32 字符纯 hex / v13 `RleW2az0Y70z3eQ0CZFLJA==` 24 字符 base64），**解出均为 16 字节**（v13 → `465796d9acf463bd33dde43409914b24`）⇒ **判据「解出来必须是 16 字节」，两者不是两把 key**；⚠️⚠️ **两个必须登记的边界（源文未说明，本库只登记不判因）**：① **`--seed-const` 与 `--custom-hls-key` 是两个独立参数** —— 复算 `MD5("215")[:16]=3b8a614226a953a8 ≠ 98d2ea568b5316a9`、`MD5("171")[:16]=a4a042cf4fd6bfb4 ≠ 465796d9acf463bd` ⇒ **`custom-hls-key` 不是 `MD5(seed_const)` 的派生值**，**不要**把 §4.6 那句「`key = MD5(seed_const)[:16]`」（讲的是解 key 文件那一层）挪来解释命令行参数；② `seed-const` 的**取值来源**（215/171）源文没给 ⇒ **不得编造推导式**；★ 另两条纪律：**`Referer` 必需**（站点侧来源校验，与 §4.6「key URI 403 ⇒ 先补 token」同源）、本篇是**工具复现式**（源文自陈「不介绍分析过程」）⇒ **不得据此反推 §4.6 的双层结构**；坑表 +2 行 |
| 682 | `52pojie-1960261-某试读解密.md` | `7273cb56d7ca74461af0e811b8097cd6` | 2026-09-25 | `stream-drm-reverse` | evolve | ★★ **在线文档载体形态第 7 种：自描述容器（`salt ‖ IV ‖ 密文` + PBKDF2 派生）** ⇒ **落 `online-document-unlock.md` 新 §5.4**（分流表 +1 行）；★★ **判据不用猜，看三处**：① 有 **`window.crypto.subtle`**（WebCrypto 语义，全是 Promise）；② 出现 **`'name':'PBKDF2'` + `iterations` + `'hash':'SHA-256'`** —— **这一族唯一的指纹**；③ 切片下标是**十六进制字面量** `slice(0x0,0x8)` / `slice(0x8,0x18)` / `slice(0x18)`；★ **容器布局固定**：**salt 8 字节（`0x0..0x8`）‖ IV 16 字节（`0x8..0x18`）‖ 密文（`0x18..`）**，**`0x18 = 24`**；**KDF 参数**：`iterations = 0x10000`（**65536**）、**dkLen 128 bit = 16 字节**、**口令是明文 UTF-8 串**（不是 hex/base64）；★★ **源文给了可对拍样本 ⇒ 本库逐字节复算命中**（`b36-verify-numbers.py`）：`PBKDF2-SHA256("xSeZw1dY2HKAj3yk", salt=d6dcbfd00ec181f1, 65536, 16)` = **`1f67c8caec75e3069c52e43e29555904`**，与源文输出**完全一致** ⇒ **本族配方可用，不是截图推断**；★★ **真机双重验证**（`b36-browsercli-verify.js` 第 10/11 项）：真 Chrome 的 **WebCrypto `deriveBits`** 与 Python `hashlib.pbkdf2_hmac` **同一值逐字节一致**，且按 `salt ‖ iv ‖ ct` 布局加解密**自洽**（解出明文以 `%PDF-` 开头）⇒ **跨语言实现对拍通过**；★ 坑表 4 条：把 `slice` 当**字符串**切（`arrayBuffer()` 后是**字节**）、口令按 hex/base64 解、**少做一次 base64**（这一族 `fetch` 直接给二进制，**与 §5.2 的 wasm 路线不同，先看代码有没有 `atob` 再决定**）、把 `extractable=false` 当硬约束（**改成 `true` 只是调试技巧，不是算法的一部分**）；⚠️⚠️ **源文残留登记（不得据它推算法）**：该篇开头另挂 `RC4密文: 54f7d1b1…30cba` / `RC4KEY: V0hBVCBUSEUgRlVDSw==`，正文**再未回到 RC4**；**本库复算**该 `RC4KEY` 的 base64 解出是 **`WHAT THE FUCK`（13 字节）**、密文 94 个 hex 字符 = **47 字节** ⇒ 登记为「**与正文链路无对应关系**」，**不得**据此推断正文算法、**不得**当成同一目标的两层 |
| 683 | `52pojie-1912173-一个在线php加密文件的解密.md` | `d6c5f598cb52b4ac8f39d7dbad754e11` | 2026-09-25 | `web-malware-forensics` | evolve | ★★ **PHP 侧的新壳族进「载荷与混淆」**：`eval($A($B($C($D,$E*2),$C($D,$E,$E),$C($D,0,$E))))` ⇒ **落 `payload-and-obfuscation.md` 新 §3.6**（拆壳决策树 +1 条 PHP 分支）；★ **判据：函数名是被「按下标拼」出来的**；★★ **本库逐下标复算**（`b36-verify-numbers.py` 已断言）：`$EvRmzj` 解出 **94 字节**；`$Kyddly` = `base64_decode`（第一段 `$EvRmzj[3].$EvRmzj[6].$EvRmzj[33].$EvRmzj[30]` = `base`）、`$ltJjKV` = `strtr`、`$sCFCgN` = `substr`（**引用的是 `$ltJjKV[0]`，不是 `$EvRmzj` 的下标**）、`$dhGfsR` = **`52`** ⇒ 完整算式 **`base64_decode(strtr(substr($t,52*2), substr($t,52,52), substr($t,0,52)))`** = 「**用开头 52 字节当码表换后 2/3 的字符，再 base64 解码**」；★ **离线破解两步走**：① **原样 `echo` 掉那四个变量**，**让它自己吐出函数名与常量**（源文即此法：一次刷新得 `base64_decode strtr substr 52`）—— **不要人工数下标**；② 把 `eval` 改 `echo` 得到下一层；★★ **「递归」是源文没做、但很便宜的增量**：这一族**每层算式形状完全相同** ⇒ 可纯文本循环（抽出全部 `="…"` 长串 → `b64decode` → `translate` 置换 → `b64decode`）；**终止判据三条任一**：不再有 `eval(` / 输出已是可读 PHP/HTML / **连续两层逐字节相同**；★ 坑 4 条：`strtr` 方向搞反（**用开头的码表换后面的字符**）、用 `mb_substr` 按「字符」切（**PHP 的 `[]` 与 `substr` 都是字节语义**）、只看第一次 `echo` 以为乱码就放弃（**第二次 `echo` 才是正文**）、认为「外壳难看 ⇒ 要先还原混淆」（**解题不必先还原壳**）；★ 口径登记：源文自陈目标站是**通用在线 PHP 加密服务**产出 ⇒ **不是某站专有**；源文另注「用 `骨锅` 看不出啥，**得用 360 浏览器**」⇒ **环境/工具差异，只登记不判因**（与 `online-document-unlock.md` §9.12 同一口径）；边界：还原出的载荷若含外联/套 `eval`/回传凭据 ⇒ 转 `indicators-and-response.md` 提 IOC（**取证技能的三条硬约束照旧**） |
| 684 | `52pojie-2082856-欧易谷歌插件转换成网页.md` | `d2d55e9d5558ec8f297776c78a541d34` | 2026-09-25 | `desktop-client-reverse` | evolve | ★ **扩展族第四种用途：把 popup 当「网页」跑**（为「选中元素 / 自动化」铺路）⇒ **落 `extension-and-nwjs.md` 新 §1.8**（SKILL.md 分流表 +1 行）；★ **判据一句话**：**每个扩展界面本质都是一个网页** ⇒ `chrome-extension://<extension_id>/<default_popup>` 可**直接在标签页打开**，于是 F12 能选中元素、自动化工具也能点到；★ **四步**：① `chrome://extensions/` 拿 ID（与 §1.7 同一步）② 开 `chrome-extension://{id}/popup.html`（**路径以 `manifest.json` 的 `default_popup` 为准** —— MV3 在 `action.default_popup`、MV2 在 `browser_action.default_popup`，**名字不一定是 `popup.html`**）③ **点下去又变回弹窗时**，Sources → **Event Listener Breakpoints → Mouse → `click`** 在事件起点断下 → 跟栈找 `window.open` / `this.openwindow(...)` 的**调用点** ④ 直接访问它要打开的 URL（源文实测：单独访问**确实就是那个页面**）；★★ **可迁移判据**：**「点一下界面就换了一种窗口形态」= 有 JS 主动 `window.open`** ⇒ **不要去找「怎么让弹窗能 F12」，去断 `click`、找调用点、直接访问目标 URL** —— 这是把「不可调试的窗口」降级成「普通网页」的通用动作；⚠️ 三条坑与边界：① **`chrome.*` API 在普通标签页里不保证等价可用**（同源，但 `activeTab`/用户手势/`chrome.windows` 会**静默失败或行为不同**）⇒「元素选中了但按钮点了没反应」**先怀疑这一条**；② **不要为此重打包**（直接访问 URL 属**只读式使用**，与 §1.5 的重打包是两码事）；③ **边界**：本节只解决「能不能定位到元素」；目标若是**钱包助记词/私钥**这类凭据界面，**仅在自己拥有的账户与设备上做技术验证** |
| 685 | `52pojie-1923373-【JavaScript】csdn文章优化保存.md` | `2f84b6418a8bac26b81b99f02c7e4c0f` | 2026-09-25 | `web-reverse-hook` | evolve | ★ **网页长文 → PDF 的通用通道** ⇒ **落 `page-unlock-and-userscript-recipes.md` 新 §6.5**（分工表 +1 行、来源表 +1 行）；★ **三步配方**：① **解除正文折叠**（折叠就是内联 `style` 的 `max-height`）`document.getElementById('article_content').removeAttribute('style')` ② **删遮罩与关注引导**（`.hide-article-box`「关注后可阅读全文」浮层 / `document.querySelector('.follow-text').closest('[data-flag="follow"]')`）③ **展开被折叠的代码块/侧栏**（模拟点击 `.hide-preCode-bt` / `.sidecolumn-hide`）再 `window.print()`；★★ **判据「前端折叠」≠「服务端截断」**：先看**源码里有没有全文** —— 有 ⇒ 本节三步；没有 ⇒ 回 §7/§8 走接口，**不要在这里使劲**；★ **打印态钩子**：`window.matchMedia('print').addListener(mql => buttons.forEach(b => b.style.display = mql.matches ? 'none' : ''))` —— **比改站点 CSS 更可控**（只动自己的元素）；⇒ 与 `online-document-unlock.md` §9.9 的「删 `@media print`」是**反向**的两件事（那边**去掉站点加的限制**，这边**给自己的按钮加限制**）；★★ **源文缺陷登记（「AI 优化版」引入的真 bug，不要照抄）**：优化版把动作表写成 `{ name: '保存', action: window.print }` —— `window.print` **被当值传递**后 `this` 不再是 `window` ⇒ **真机实测抛 `TypeError: Illegal invocation`**（`b36-browsercli-verify.js` 第 3/4 项：裸传宿主方法必抛、`.bind(window)` 后正常；`window.print` 确认为 native）⇒ **可迁移判据：宿主方法当值传递（丢进数组、当回调）时必须包 `() => window.print()` 或 `.bind(window)`**，**「能读到这个方法名」≠「能这么调用它」** —— 这类错误**不报错在写的时候，只在点下去的时候**；★ 真机另复核：`matchMedia('print')` 返回 `MediaQueryList`（`matches` 为布尔、`addListener`/`addEventListener` 均在）且**监听可挂载并收到 `change` 事件**；`removeAttribute('style')` **确实清掉内联样式**（`after = null`）；⚠️ **边界**：本法**只解决「展示/复制限制」**；打印拿到的是**渲染后的页面**（≈长截图），**不是原始 PDF** |
| 686 | `52pojie-1689437-免抓包 羊了个羊过通关次数和话题.md` | `5206fc88e2ead199e7362a1a4bb286bf` | 2026-09-25 | `reverse-knowledge` | evolve | ★★ **本批唯一的「结论级升级」来源：`yanglegeyang-map` 蓝图从「单一端点」升级为「双端点 + 账号链」**；★ **1689437（2022-09-18）比在册主源 1692161（2022-09-28）更早 10 天**，给的是**另一代端点**：**GET `game_over` / `topic_game_over`**（`rank_*` 五参数走 **query**、**不需要对局记录**）⇒ 与 `game_over_ex`（`rank_*` 走 **body** + 必须带 `MatchPlayInfo`/`MapSeed2`/`Version`）做成 **A/B 双线对照表**；★★ **A 线的价值不在「羊了个羊」而在「免抓包」这条通用路线**：**参数能被推导出来时就不必先抓包** —— 从「**页面里已有的 uid**」出发（源文原话「在页面获取 uid 填写到下面代码中」），用 **`user_info(uid) → login_oppo(POST) → token`** 三段链把 header `t` 换出来，**与「先抓包再还原」成本差一个数量级**；★ 端点清单：`GET /sheep/v1/game/user_info?uid=&t=` → `data.wx_open_id/nick_name/avatar` → `POST /sheep/v1/user/login_oppo`（form：`uid=wx_open_id, nick_name, avatar, sex=1`）→ `data.token` ⇒ `headers['t'] = token`；★ **A 线另用微信小程序 UA**（`MicroMessenger/8.0.21…MiniProgramEnv/android`）；★ **本库复算**（`b36-verify-numbers.py`）：源文 `user_info` 里的 `t` 是**硬编码示例 JWT** —— `alg=HS256`、载荷键 `{exp,nbf,iat,jti,open_id,uid,debug,lang}`、`iat=1663301423`、**`exp-nbf=31102200` 秒** ⇒ **早已过期，不可直接复用**；⚠️⚠️ **如实登记、本库不裁决的两处未对齐**：① **「t 到底放账号信息还是放 token」** —— 1692161 说「登录小程序得到的账号信息」，1689437 直接把登录返回的 token 当 t（`headers['t'] = token`）⇒ **进 `gaps`**；② **`rank_role` 取值不同**（1689437 用 `1`、1692161 的 `_ex` 示例用 `2`）⇒ 登记进 `mutations.json`，**不裁决哪个是「过关」语义**；★ 落地改动：`metadata.json`（v1.0.0 → **1.1.0**、title/summary/aliases/keywords 扩、+7 条 sources、+6 条 gaps、+2 条 self_check）、`parts.json`（+7 项：uid / wx_open_id / nick_name·avatar·sex / token / login_oppo / GET 版五参数 / topic_game_over / 非 `_ex` 的 game_over / 微信 UA；`t` 的描述改为**两种口径并列**）、`mutations.json`（5 → 8 条：+「两条端点并存」+「rank_role 取值不同」+「header t 的两种口径」+「t 的时效」）、`workflow.md`（重写为 **A 线 / B 线** 双线 + 对照表）、`index.json` 同步 |
| 687 | `52pojie-1950455-音乐爬虫分析.md` | `0c8b8dba282016edd042020e9cbd3a1e` | 2026-09-25 | `target-analysis` | skip | 已精读。内容为**音乐站（`1nzb.com`）的常规列表采集**：`GET /search?ac=<关键词>` → `soup.select('ul.mul li')` → 取 `a[href]` 拼域名 → `li.find('a').text.split('-')[1]` 取歌名 → 详情页 `soup.find('input', class_='layui-input').attrs['value']` 拿 mp3 直链 → 下载。**无任何加密/签名/风控**，全部落在 `target-analysis` 的「页面直出 + 列表采集驱动」与本仓库既有的常规采集能力内；**无新知识元**（连「URL 拼接要注意 `/` 的数量」「名字前有 `-` 用 split 或正则」都属常识级）⇒ 按「避免滥建冗余技能」约束**不新建、不演化**，登记为已处理 |
| 688 | `52pojie-1950086-简单做个爬虫下点歌听.md` | `3d64d63dcc4701d7b9bf51d3842d9adf` | 2026-09-25 | `target-analysis` | skip | 已精读。同一作者的**上一篇**（`gequbao.com`）：`GET /s/<key>` → `div.row` 列表 → `div.col-5` 歌名 / `div.col-4` 歌手 / `div.col-3 a[href]` 详情 → **`GET /api/play_url?id=<id>&json=1`** → **`response['data']['url']`** 拿直链 → 落盘。**与 1950455 同型**（搜索页 → 详情页/接口 → 直链），**唯一与上篇的差别是「详情页解析」换成了「一个 JSON 接口」**，且源文自陈「主线程要卡死就不献丑了」（未做并发）⇒ **无新知识元**，**不新建、不演化**，登记为已处理 |
| 689 | `52pojie-747271-[Python]多线程爬去美女图片实战加抓包分析.md` | `b73ad02a9aafcdff1aa515d2863188f5` | 2026-09-25 | `target-analysis` | evolve | ★ **随机化资源名的下发接口（「只随机一段」）** ⇒ **落 `in-page-data-carriers.md` 新 §3.4**（排错表 +2 行、来源表 +1 行）；★ **现象**：图片 URL 看起来「随机化」了，常见做法是**每页都去访问一次页面**才拿得到完整地址；★★ **判据（本节增量）**：**一段资源名里通常只有「一小段」是随机的** —— 找到**那段随机名的下发接口**，其余部分**本地拼装**；源文实测形态：地址 = `{固定前缀}/{序号}i{随机名}.jpg`（**第 1 位是序号、第 2 位固定 `i`、后两位随机**），随机名由 `GET /data.php?id=<uid>&page=8999` **一次给全**（逗号分隔数组）⇒ **一次请求拿全部随机名，剩下本地拼**；★ **判据表 3 行**：资源名**有一段**每次变而其余固定 ⇒ 随机名是**接口下发**的（找下发那一个请求）；**整体**看不出规律 ⇒ 可能是哈希/签名（回 `web-reverse-algorithm` 找生成点，**别硬枚举**）；**面板里没有**那个接口 ⇒ 它可能在某**交互动作**时才发（源文是点「全部图片」）⇒ **先做一次触发动作，再看新出现的请求**；★★ **第二个可迁移判据：「浏览器直接打开不返回」= 校验了请求头** —— 源文实测 `data.php` 地址**粘进地址栏拿不到返回**，但代码里**带上 `Host` + `Referer`** 就正常 ⇒ **同一 URL「浏览器能开、脚本不能开」时，先补 `Referer`/`Host`/`UA` 三个头**，不要先怀疑参数或加密；**资源域名 ≠ 页面域名时 `Host` 是必需的**（源文下载请求带 `Host: img.mmjpg.com`，与页面域名不同）；⚠️ **边界**：源文是 2018 年老文（Python 2.7 语法）⇒ **只取上面两条判据**，并发/限速以本技能 §3.2 的性价比排序与 `web-reverse-algorithm` 为准 |
| 690 | `52pojie-1853120-某平台简单尝试一次密码逆向.md` | `8d5702ac775f64ce05f73f1efb8af464` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★ **RSA 登录参数的三个静默事实** ⇒ **落 `12-login-and-account-params.md` 新 §4.5**；★ **事实一 · 加密点可能被裹在一段「假循环」里**（源文原样）：`var e='password'; for (var s=0; s<e.length; s++) { var t = n.encrypt(password); } return t;` —— **循环变量没有出现在 `encrypt(...)` 的实参里** ⇒ **假循环**（每轮算同一个输入、结果取最后一次）⇒ **两面后果**：① **复现时不要照抄这个循环**（同一件事做 `e.length`=8 遍）；② **对拍时不要拿「密文是否相等」当判据** —— §4.4 已立「同一明文两次密文不同 ⇒ 真是 RSA」，这里再补：**PKCS#1 v1.5 填充带随机**，所以这 8 次结果**互不相同**，只有最后一次被用 ⇒ **「解出来对不上」先怀疑你复现的是第几次的结果**；★ **事实二 · 「公钥能对拍」不等于「这就是最终待提交的值」**：源文自述**下断处随便填账号密码登录失败** ⇒ 断点位置**不是生效路径** ⇒ **换关键词重搜**，直到断在「改了它、请求就变」的位置；★★ **事实三 · 关键字搜索要带「拼音 / 别名」候选（最省时间的一条）**：源文第一步搜 `password` 只找到一半，**第二步搜 `jiami` 才断成功** ⇒ 国内站点把函数命名为 **`jiami`/`jiemi`/`mima`/`yanzheng`** 是常态 ⇒ 给出**四级关键词搜索表**（业务语义 → 拼音 → 库名 → 公钥字面量 `-----BEGIN`）；⚠️ **口径**：拼音命名属**站点习惯不是通用规律**，只作「换一靶再试」的候选清单，**不要因为搜到了就认定它是生效路径**；★ 与 §4.4 的衔接：`JSEncrypt` + `setPublicKey` + 裸 base64 公钥 ⇒ `login_param_probe.py rsa-pubkey` 对拍 |
| 691 | `52pojie-1829398-某交易服务平台加密内容逆向.md` | `8d5c45c29dc4ad7f98a4fd86003fb0fc` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★ **「换靶」动作 ②③** ⇒ **落 `15-call-site-locating-playbook.md` 新 §8.5**；★ **动作 ② · 找「响应解密出口」而不是「请求加密入口」**（双向加密题的固定打法）：响应是密文 ⇒ **搜 `decrypt`**（**不是** `encrypt`）→ 在**搜索结果那一行**与**该函数的 `return`** 两处同时下断 → **反复试表达式**直到打印出可读文本（源文原话「多次输出 `a.toString(h.a.enc.Utf8)` 测试以后，发现该位置就是解密结果」）→ 确认后**直接扣这个函数**；★★ **`CryptoJS` 解密出口的机械指纹**：**`<wordArray>.toString(CryptoJS.enc.Utf8)`**，压缩后常写成 **`a.toString(h.a.enc.Utf8)`**（`h.a` 即 `CryptoJS` 别名）⇒ **见到 `.toString(<某个>.enc.Utf8)` 就基本可断定这是「WordArray → 明文字符串」的出口**，是「解密结果点」的第一候选；★★ **动作 ③ · 「第一次请求返回空」⇒ 先去比 header，别先怀疑参数**：源文形态是**不带 `Portal-Sign` 就没有数据返回**，且**翻页几次之后**才发现这个头必需 ⇒ **判据：「第一次请求返回空 / 没数据」时，第一步是比对「多次请求之间的 header 差异」**；★ **「头里的自定义名」（`Portal-Sign` 这类）通常既不叫 `sign` 也不叫 `token` ⇒ 搜「长得像签名的值」比搜「名字像签名的字段」更有效**；确认手法与 §3 的「唯一验收动作」一致：断点处**直接调用 `f.getSign(e)` 并与抓包值对拍** |
| 692 | `52pojie-1829895-某勾网加密数据逆向过程.md` | `392f92debf2c145a1b56329e40d55ad1` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★ **「换靶」动作 ④：请求加密与响应解密可能是同一个对象** ⇒ **同落 `15-call-site-locating-playbook.md` §8.5**；★ **源文原样**：接口 `positionAjax.json`，**请求体加密方法就是 `t.toString()`**（源文「经过测试发现是 `t.toString()` 即为加密方法」），**响应解密用的也是 `t`**（「经过测试解密内容为 `t`」）⇒ **一次扣一个 AES 就够**；★★ **可迁移判据**：在 `send` 断点处看到密文时，**调用栈里最近的那个「参数是对象、返回值是字符串」的函数**往往就是它；**不要默认请求加密与响应解密是两套算法** —— 一个 `.toString()` + 一个 `.parse()` 就够；反向也成立：**只扣了加密那一半**时，**先怀疑「解密那半用的是同一个对象」**；★ 与 §8.5 动作 ② 的区别：动作 ② 是「密文在**响应**里 ⇒ 搜 `decrypt`」；本条是「**请求与响应共用同一个变换对象**」⇒ 两者互补，**先试 ④（成本最低：只扣一个函数）** |
| 693 | `52pojie-1805527-《某查查》协议登陆.md` | `97a5947d7bc86e841e8f3acef88850fe` | 2026-09-25 | `stream-drm-reverse` + `webpack-bundle-extraction` | skip | 已精读。**该篇是纯截图帖**（正文仅 6 行 + 6 张图）：① 先过极验再抓包 ② 分析参数（**说「随机头加密逻辑之前文章有写」，本篇未给**）③ **搜 `epass` 参数**直接搜到、无混淆、打断点跟进去 ④ **判据「明显 webpack 打包的，加密点暴露」** ⑤ **「写个 webpack 加载器，扣代码」** ⑥ **登记「Cookie 有坑需要踩一下」**（**未展开是什么坑**）。逐条比对现有能力：③ 的「搜参数名 → 断点跟进去」= `web-reverse-algorithm/references/15-call-site-locating-playbook.md` §1；④ 的 webpack 判据与加载器扣取 = `webpack-bundle-extraction` 全篇；① 的「先过极验再抓包」= `web-verify-patcher`。⇒ **四条全部落在既有能力内，且源文一条都没展开**（无代码、无参数、无算法、无样本）⇒ **无新知识元**，按「避免滥建冗余技能」约束**不新建、不演化**，登记为已处理。★ 仅留一条**负向登记**以免下轮重复调研：**本篇没有任何可复用的算法信息，不要因为标题像「协议登陆」而重新精读** |
| 694 | `52pojie-1757892-小鹅通已购课程下载方案.md` | `d677e882a7151a6c8d1417db14617b5f` | 2026-09-25 | `stream-drm-reverse` | evolve | ★ **`.ts → .m3u8` 伪装形态的第二个独立样本** ⇒ **落 `playback-url-shapes-and-page-carriers.md` 新 §4.4**（来源表 +1 行、形态分流表补边界）；★★ **同型复现 ⇒ 形态稳定的证据**：本篇 2023-03-13、在册主源 `1843783` 是 2023-10-13，**两个独立年份、同一手法**（`_0.ts → .m3u8` + 删 `start=&end=`）；★ **两条补充判据（源文原样）**：① **怎么挑那一条** —— 「**通常第一个为 `.m3u8` 的文件，往后的是 `.ts` 文件，选择紧跟 `.m3u8` 后面的文件即可**」⇒「清单请求 → 紧随其后的第一个分片请求」是最省事的定位法；② **改写后连 `type`/`exper`/`sign` 一起保留**（源文替换后的 URL 只动了后缀与 `start/end`）⇒ **不要顺手删干净所有查询参数**：这一族里 `sign`/`exper` 是**时效鉴权**，删了就失败；★ 与 `preview-gating-and-segment-enumeration.md` 的**硬边界（本批新增）**：本形态**只解决「这一条 URL 是切片还是清单」**；若改写后**清单本身条目不全**（条目数远少于总时长对应分片数 / 清单路径带 `_preview`）才转枚举补齐；⚠️ **登记（源文未展开、不判因）**：`exper=180` 与 `sign=***` 的语义源文**没给**，只登记其存在与「**改写时不要删**」这一纪律，**不得**据此推断「有效期 180 秒」 |
| 695 | `52pojie-1910333-python 菜鸟第一次尝试盐选小说下载.md` | `f48e188cf00d3f0f31330aebc0fb6958` | 2026-09-25 | `web-font-obfuscation` | evolve | ★★ **多 `@font-face` 分片：一张字典装不下多款字体** ⇒ **落 `glyph-ocr-and-rotation.md` 新 §9**（目录 +1）；★ **现象（源文实测、且源文自陈失败）**：正文里 `@font-face { src: url(data:font/ttf;charset=utf-8;base64,…) }` **内嵌了多个字体文件**，作者用正则 `findall` 抓出全部但这**只取了其中一个**（`matches[2]`）建映射，替换后**仍有部分字不对** —— 源文如实记录「替换之后，依然会有部分出入……只能先到这里了」；★★ **根因（本文件增量）**：**`@font-face` 是按 `unicode-range` 分区**的 —— 一个页面用 N 个字体文件 = 把码位**切成 N 段**分别由不同字体渲染 ⇒ **每段码位必须用它自己那款字体的 cmap 去查**，**不能把 N 款字体的字形合并成一张字典**；★ **机械判据 3 行**（`findall` 长度 > 1 / 每块带 `unicode-range` / 只有一块则走单字体流程）；★★ **与 §5「逐条 `replace` 会自我污染」的差别（不要搞混）**：§5 是「**同一款字体**、按映射表一条条 replace」⇒ 先替换出的字**被后一条规则二次命中**；§9 是「**多款字体、把映射合并成一张字典**」⇒ 同一个「识别结果」在**不同段码位**上本来对应**不同原字** ⇒ 字典**互相覆盖**。**症状像、根因不同、处置也不同**：§5 用「**单趟逐位置映射**」、§9 用「**按 `unicode-range` 分表**」—— **两个都要做**；★★ **源文代码的真缺陷（本库指出）**：源文把字典建成 `recognition_to_original_dict[recognized_text] = char`（**以「识别结果」为主键**）—— 一旦某款字体里**两个码位被 OCR 认成同一个字**（OCR 必然有这种误判），后一个就**静默覆盖**前一个，而**替换阶段不会报错** ⇒ **判据：建表方向必须以「码位」为主键（`cp → 真字`）**，建表后断言 **`len(table) == len(cmap)`**，不等即说明发生了覆盖；★ **本库复算佐证「字典未经校验」**（`b36-verify-numbers.py`）：源文印出的 38 个键里有一个是 **2 字符的 `业k`**（OCR 噪声键）⇒ 凡以「识别结果」为主键的字典，**都要先跑一遍「键是否全是单字符」的断言**；⚠️ **边界与登记**：源文**自陈失败** ⇒ 本篇价值是**失败原因的判据**、**不是**可用成品；源文只取了 `matches[2]` 一个字体、且**未给出各字体各自的 `unicode-range`** ⇒ 「有 4 个字体」是源文叙述，**不据此推断它一定是 4 段划分** |

> ⚠️ 上表 md5 由 `append-b36-ledger.py` **从磁盘现算**（不手抄）；编号按行出现顺序自动生成。
## 批次 B37 · 2026-09-25（第三十八次执行）

**取材口径**：**归档线第 37 轮新收 12 篇全取（12/12 命中）** —— 承接上一批「按既有簇就地取材」的优先级 ①。
本批的簇结构与历轮不同：**「算法不在页面 JS 里」的载体簇**占 5 篇（so/native ×3、Java 层 ×1、APK 资源包 ×1），
其余为「运行时干预簇」3 篇（DOM 属性 hook / 埋点掐初始化 / 属性访问断点）、
「协议介质簇」1 篇（DLNA 投屏）、「授权校验簇」1 篇（软件许可证）、「算法族增量簇」2 篇（hashcash PoW、非标准 CRC32）。

**产出**：**0 新建技能**（能力缺口评估 = 0，逐簇给了「为什么不是新建」的判据），
**演化 7 个技能、新建 3 个参考文件、新建 1 个蓝图**。

### 本批唯一的「结论级发现」（方法论级，已反转一次）

★★★ **`52pojie-1294569` 附录那份 `hex_md5` 有 6 处常数抄错**（`idx = 0,12,31,42,49,53`），
其中 `11261161415` 已 **> 2^32**，不可能是任何 32 位常数。
源文**自己带了 `md5_vm_test()` 锚点**（`hex_md5("abc") == 900150983cd24fb0d6963f7d28e17f72`），
但**它贴的常数通不过自己的锚点**（源文常数版实测 = `215292d4f5aa7b84352e7c928c1dc7a6`）。
⇒ 可迁移动作：**拿到「源文附带的完整算法实现」，第一步先跑它自带的自检/样例**（成本为零，能直接判死活）。

### 本批自曝缺陷（全部在本轮内修完）

1. **★★ 我自己写的 hashcash 断言是「假绿」**：判定用了 `bin(...)[2:].zfill(256)`，
   而 SHA-1 只有 **160 位** ⇒ `zfill(256)` **人为补了 96 个前导 0** ⇒ `[:bits]` 恒为 0，
   断言退化成**恒真**，并据此得出**错误结论**「`counter` 取 0 也合法」。
   **真机 WebCrypto 复算**才抓出来（Python 与 Node 两侧都没发现）。
   ⇒ 修正后**结论反转**：源文给的 `4824` / `5126` **恰好就是最小解**（`4823` 不合法、`4824` 合法）。
   ⇒ ★★ **规则：凡是「前导零 / 位长」类断言，位长必须从摘要长度推导（`zfill(len(digest)*8)`），
   绝不能写死。** 这与 B35 记忆里「自写断言里的常数要从输入推导」是**同一类缺陷的第二次出现**，
   本批起升级为通用规则并写进对应文档。
2. **我在新文件里把蓝图目录名写错**（`douyin-x-gorgon` → 实际是 `tiktok-x-gorgon`），
   由**本批新建的 `b37-verify-docs.js`** 抓出。
3. **我引入了一处「跨技能裸名引用」**（`geetest-protocol-matrix.md` 未写路径），同上被门禁抓出。
4. **源文针清单里混进了别的源文的面量**（`0xEDB88320` / `isTrusted` / `canvas_info` / `captcha_id`），
   被 `b37-verify-sources.py` 抓出 5 处 ⇒ 已逐条核实后改正（**这恰好证明「针」机制在防「跨源串味」上是有效的**）。
5. **真机脚本 4 项断言写错**（detached 元素 `click()` 不触发、SHA-1 位长写成 256、
   「写入丢失」的判据写反），逐条修正后 **13/13 全绿**。
6. **评审另抓出 5 处**（D1 幻觉式 § 引用 / D2 蓝图裸名写错 / D3 蓝图来源行号 /
   D4 把源文十进制 `92533269` 写成十六进制 `0x92533269` / D5 既有 `§2.14` 悬空）
   —— ★ **评审抓出的缺陷多于自建门禁（2 处）**，其中 D2 暴露门禁正则对「裸名跨技能引用」的缺口、
   D4 暴露「门禁只查路径与节号、不查数字保真」的盲区。

### 处理清单

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 696 | `52pojie-2005163-某程 encode 算法分析.md` | `b2c3bad3313351c2660adf4502e4f241` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★★ **本批最重的一篇**（so 层 AES 的密钥派生全链）。**落 `08-mixed-crypto-segmentation.md` 新 §8.4「形态四：密钥先派生、再被插入密文」**（§八 标题由「另外三种」改「另外四种」，速查表 +2 行）⇒ ★★ **形态判据（零成本）**：**输出长度 = `ivlen + input_len` 且不是块对齐的整数倍** ⇒ 先怀疑尾部藏了东西；★ 六段链：`random_key`(时间派生) → `encrypt_one(random_key, IV_A)` → **真实 AES key** → `AES-CBC(明文, 真实key, IV_B)` → `encrypt_two` 把 `random_key` **逐字节插入密文并右移后续字节**；★ **三条分层判据**：① 长度层（`ivlen+input_len`）② 常量层（`aes_setkey_enc(CTX, X, 0x80)` ⇒ `X` 是真实 key、`0x80` = **128 位**；`xmmword_112C4` 的 `DCB` 列表恰好 **16 字节** ⇒ IV 候选，本库逐字节收录 `69 D2 55 B8 32 9E AC D4 0C 2A 9C 8B 68 75 87 05`）③ 部件层（S-box 256 项**逐字节对比**一致 ⇒ **标准部件复用当 KDF，不是魔改 AES**）；★ **PKCS7 的 C 语言等价形态**：`(len+16) & 0xFFFFFFF0` 与 `16-(len & 0xF)` 同时出现即判定，⚠️ **`len` 恰为 16 倍数时补 16 不是 0**（两个 `else` 分支就是为它写的）；★★★ **本批最值钱的手法**：源文**不读汇编**，而是在 `unidbg` 里对**同一缓冲区调用前后各打一次**，用**前后字节对应关系反推语义**（实测 `D4 3F 8B 24 \| 1A 5E 7E 9D \| 24 14 7E C6 \| 49 7F DB 9E` → `3F 8B 24 D4 \| 7E 9D 1A 5E \| C6 24 14 7E \| 49 7F DB 9E` ⇒ 四组分别循环左移 **1/2/3/4** 位 = 标准行移位；`v26 = 2` ⇒ 只跑两轮）⇒ **「名字像变换、代码一大坨」的函数先做前后差分，再决定要不要读代码**；⚠️ **边界**：`column_rotation` 源文**只给前后值、未给公式** ⇒ 本库照实转述、**不代写公式**；解密顺序必须反着来（先抽 `random_key` → 算真实 key → 再用 IV_B 解） |
| 697 | `52pojie-1843070-appleid 爬虫之 - X-APPLE-HC X-Apple-I-FD-Client-Info 算法 实现.md` | `b9d86a0e878b49e024faa470e3b56232` | 2026-09-25 | `web-verify-patcher` + `web-reverse-algorithm` | evolve | ★★ **hashcash 形态的 PoW 与「引擎能力指纹」** ⇒ **落 `behavior-verify-and-sign-headers.md` 新 §12**（§12.1 `X-APPLE-HC` / §12.2 `X-Apple-I-FD-Client-Info`）+ **坑表 +4 行**（15–18）；**同源结论同步进 `08-mixed-crypto-segmentation.md` §7.1「第二种模板：hashcash 原教旨」**；★★ **与极验的分工判据**：**提交的值里带一个自增整数 ⇒ hashcash 系（提交整串、服务端自己重算）；只有摘要 ⇒ 极验系**；★ 结构：`{version}:{bits}:{date}:{challenge}:{ext}:{counter}`（`ext` 空 ⇒ **出现连续 `::`，不是笔误**；`bits` 页面可取、源文实测 10–12；`challenge` 是 **32 位 hex**）；★★ **两种难度口径不可混**：本条是 **bit 语义**（二进制前 `bits` 位全 0），极验是 **hex 语义**（前导零 hex 位 + 半 nibble 上界，见 `geetest-protocol-matrix.md` §8.1）—— 本批已把「`bits` 非 4 倍数时会数错」这条写进 §7.1；★★★ **本批最值钱的复算**（三侧一致：Python / Node / **真机 WebCrypto**）：`bits=11` 的**最小** counter = **4824**、`bits=12` = **5126**，**与源文给的完全一致** ⇒ `counter` 是「从 0 顺序试出的第一个解」、**给定同一 `(version,bits,date,challenge)` 唯一确定、可复算**；**但 `date`/`challenge` 每次都变 ⇒ 抓包值复现不了** ⇒ **本库「逐字节对拍」纪律在这一族的明确例外**：验收 = 「服务端接受」+「本地独立校验前 `bits` 位为 0」+「结构一致」（⚠️ **`counter` 取 0 不合法**，实测前 11 位 = `11101111010`）；★ 指纹串 `{U,L,Z,V,F}` 五字段：★★ **`Z` 那段计算是「算了但没用」的死代码**（源文紧接着 `t = tmp.Z` 直接取硬编码 `GMT+08:00`）⇒ 登记为源文缺陷；★★ **`F` 由一段 IE/JScript 时代指纹 JS 产出**（探测 `ScriptEngineMajorVersion/MinorVersion/BuildVersion` 与 ActiveX CLSID `7790769C-0471-11D2-AF11-00C04FA35D02`）⇒ **最小补环境只需声明 `window` + `navigator` 两个对象**；★★★ **该族指纹把「探测不到的引擎能力」也编进去**（`catch` 分支返回 `escape(e.message)` ⇒ **指纹里含异常信息**）⇒ **不要为它补桩**；`navigator.plugins` 会被遍历 ⇒ 不能给 `undefined`；采集函数里带 `debugger`（反调试）；⚠️ 源文自陈「过程我就忽略了，只贴结果」⇒ **只登记调用形态与补环境要求，不推断 `F` 的算法** |
| 698 | `52pojie-712068-js破解&验证算法分析 CKFinder3.md` | `ec2f4dfab049a5d17a3be39f4b7aa3bb` | 2026-09-25 | `web-reverse-hook` + `ast-deobfuscation` + `web-reverse-algorithm` | evolve | ★★★ **本批第二重**（软件授权算法 + 通用破解方法论）。**三处落点**：① `web-reverse-hook/references/response-rewrite-and-locating-hooks.md` **新 §5「属性访问断点」**（原 §5/§6 顺延为 §6/§7；分工表 +1 行、来源表 +1 行）② `ast-deobfuscation/references/string-array-and-minimal-eval.md` **新节「原地解密函数（不是数组表）」** ③ `web-reverse-algorithm/references/02-algorithm-families.md` **新 §七「客户端授权 / 许可证校验题」**（原 §七 最小落地接口 → §八）；★ ① **Chrome 无内存断点 ⇒ 用描述符造一个**：源文完整贴出 `breakOn(obj, prop, mode, func)`（`getPropertyDescriptor` **沿原型链**找描述符；访问器走 `orig.set.call(this,val)`、值属性走 `writable` 分支；**`debugger` 写在委托之前 ⇒ 断在「修改之前」**）⇒ **★★ 三条判据**：断点断在改之前 / 值属性与访问器必须分开处理（⚠️ **源文值属性分支写的是「描述符副本」而非 `this`** ⇒ 给原型属性用会串，登记为源文缺陷）/ **这是「定位」不是「改写」**，比响应体改写安全；★★ 配套判据：**断点处的 Console 能直接访问局部变量** ⇒ **在任意调用解密函数的行上下断点，手敲同一表达式即可原地验证字符串解密**（不用扣代码、不用补环境）；★ ② **形态 A · 单密钥 + 位置相关 XOR**：`S(e)` = **首字节当密钥** + 下标参与 ⇒ ⚠️ **JS 里 `+` 先于 `&`、`&` 先于 `^`** ⇒ 实际是 `charCodeAt(i) ^ ((i + n) & 127)`，**移植 Python 必须照这个括号写**；同文件还有**常量密钥 `255` 的第二个变体** ⇒ 先分别识别再批量替换；★★ **AST 定向替换的完整可跑代码**（`acorn` + `acorn/dist/walk` + `escodegen`，`walk.simple` 匹配 `CallExpression` 且 `callee.name === 'S'`）⇒ **四条判据**：**替换的是整个 `CallExpression` 节点**（不是实参）/ **必须递归处理三元分支**（`cond ? S('a') : S('b')`）/ 非预期节点**打印 `node.start` 后跳过**（让脚本跑完）/ ⚠️ **替换前先确认 `S` 是纯函数**，否则**静默产出错误的合法 JS**；★ **「乱码字符串排查法」**：`console.log(node.value)` 把「解码后仍乱码」的全打出来人工扫（源文原话「反正才 6246 行，不到五分钟差不多就能看完」）⇒ **零成本的「解码器对不对」体检**；★ ③ **许可证 = 33 进制自校验串**：★★ **字母表 `123456789ABCDEFGHJKLMNPQRSTUVWXYZ` 长度 33 而不是 36**（相对大写 Base36 去掉 **`0`/`I`/`O`** 三个易混字符；⚠️ **`indexOf` 对表外字符返回 `-1` ⇒ 静默污染整条算式**，解析前先断言「每位都在表内」）；★★ **模数 = 字母表长度**（`+33` 与 `%33` 同时出现即坐实）；★★★ **本库复算的增量（源文没说）**：人可读模板 `*???-*?**-?**?-*?**-*?**-?*?*-?**?` 去横线 28 位、**有 12 个 `?`**，而 PHP 只下发 **11** 位 —— 差的正是**下标 2**，对照 `strpos(CKFinder::CHARS, $lc[2]) % 5` ⇒ **下标 2 是「域名类型」字符、由服务端独用、不下发前端** ⇒ **判据：模板里 `?` 的个数 ≥ 前端拿到的位数时，多出来的那一位属于「服务端私有的分类位」**；★ 四条约束（`u` 数位根校验位 / `a` 距离<4 / `l` 相邻 / `d` 绑域名 / `c` 六元同余不等式）；★★ **`c` 的 `Date` 是红鲱鱼**（源文一度以为限制日期，**化简后是同余问题**）⇒ **读这类算法要先化简再读数**；★ **解不唯一 ⇒ 不能当「还原正确」的验收标准，只能端到端验收**；★ **两个反分析小把戏**：`return o = void 0, i`（**一次性自毁，防控制台重复试探**）与 `window.opener \|\| window.top`（**许可证绑域名 ⇒ iframe/本地文件打开必然失败**）；★★ **社工捷径（性价比最高）**：**官网 demo 用的往往不是演示版** ⇒ 抓它的许可证 `8EB6AF82KAF` 再反推（源文实测不限域名）；⚠️ **边界**：`if (false)` **只在「校验全在自己机器上」时有效**（源文自己踩过：改了 `isDemo` 仍「根本就没断下来」）；本库**只给判据、不给绕过授权的成品** |
| 699 | `52pojie-1880044-逆向世界某读切块图片链接与Python还原切割图片.md` | `851e533f86461ca930f02c279d24bf8a` | 2026-09-25 | `stream-drm-reverse` | evolve | ★★ **在线文档载体第 8 种：不规则切块 + 哈希命名** ⇒ **落 `online-document-unlock.md` 新 §8.5「形态⑥-子」**（§2 载体分流表 +1 行、§10 排错表 +3 行、§11 来源表 +1 条）；★★ **两条机械判据**：① **切块几何不是整齐网格**（源文原话「与龙X期刊的整齐 `5*5` 方块，或是 XX 学堂 `5*1` 乱序不同……**不规则方块（乱序）**」）⇒ **位置必须从元数据 `{x,y}` 读，不能按「第 i 块放第 i 格」推**；② **资源名 = `baseURL + 非标准CRC32(bookId_level_pageNo_块索引) + ".jpg"`**；★★★ **非标准 CRC32 的判据（一句话）**：**与标准 CRC32 只差最后一句「再按位取反一次」**（`Crc ^= 0xFFFFFFFF; Crc = (Crc ^ (-1)) >>> 0;`）⇒ **机械判别：结果 == 标准值的按位取反**；**本库复算命中源文截图值**：`crc("491721607cf2ca_2_1_0")` 非标准 = **`f03e3a2f`** ✓、标准 = `0fc1c5d0`（⇒ 坐实那一步必需）；★ `>>> 0` 的作用是**把 32 位有符号无符号化**，Python 侧等价物是 `& 0xFFFFFFFF`；⚠️⚠️ **源文 Python 那行有优先级隐患**：`b = (b ^ (-1)) & 0xFFFFFFFF >> 0` —— Python 里 `>>` **优先于** `&`，实际算的是 `(b^-1) & (0xFFFFFFFF >> 0)`，**恰好等价** ⇒ **「靠巧合正确」，不要照抄**；★★ **源文自相矛盾（已登记，不裁决）**：JS 段用 `(level + 1)`，而其 Python 复现段**写死 `"_3_"`**、示例又用 `"_2_"` ⇒ 本库给出两个可复算值（`_2_` → `f03e3a2f` = 源文目标值、`_3_` → `cd5e139f`）；★ **坐标 JSON 的 AES 三判据**：**key = `(book_identifier + company_identifier)[:16]`**（两个业务 id 拼起来当密钥）/ **IV = key** / **`CryptoJS.enc.Latin1.parse` ⇒ Python 必须 `.encode('latin-1')` 而不是 `utf-8`**；模式 = **CBC + ZeroPadding**（⚠️ **源文用「过滤掉所有 `\x00`」代替去填充** ⇒ 文本 JSON 能用，**换到二进制载荷上会静默损坏数据**）；★ 拼图配方：`Image.new("RGB", (w, h))` + `paste(block, (x, y))`，⚠️ **`Image.open()` 只吃文件名/文件对象 ⇒ 网络流要先 `BytesIO`** |
| 700 | `52pojie-2038686-[Python Rust] 基于 投屏 的视频抓包.md` | `a36b9789a6d82b6d665ba2caec7b02cb` | 2026-09-25 | `stream-drm-reverse` | evolve | ★★ **新增第 8 个参考文件 `references/dlna-cast-capture.md`**（§0 地址还原层的**局域网介质**分支）+ SKILL 分流表 +1 行；★★ **本文解决的问题**：**网页端根本不提供播放（只能在 App 内看），但 App 有「投屏」按钮** ⇒ **不去破播放接口，而是扮演目标设备的「接收端」**，让 App 把**已经是明文的播放地址**交出来；★★ **判据（先分「投送」还是「镜像」）**：**点投屏后电视是「从头播这个视频」而不是「显示手机屏幕」⇒ 媒体投送 ⇒ 地址必然有一次明文传输**；★ DLNA 五角色（DMS/DMR/DMC/DMP/DMPr）中**我们要冒充的是 DMR**，因为**地址是 DMC（App）发给 DMR（我们）的**；★★ **DMR = SSDP 服务器（UDP）+ HTTP 服务器（TCP）两个，缺一不可**；★ SSDP：组播 `239.255.255.250:1900`（首字节 239 = `0xEF`，D 类），**报文结构与 HTTP 一模一样**，两条途径 = 主动 `NOTIFY`（`NTS: ssdp:alive`）/ 被动应答 `M-SEARCH`；★★ **两条可迁移判据**：**DMR 注册多个服务 ⇒ 必须分别广播多次**（`RenderingControl`/`AVTransport`/`ConnectionManager` + `rootdevice`/`uuid:<uuid>`/device type）、**`Location` 必须指向局域网可访问的 IP**（不能 `127.0.0.1`）；★ HTTP 三路由 `/DeviceSpec`（设备描述 XML，**定义后两个服务**）/`/AVTransport`/`/RenderingControl`；★★★ **地址就在 `SetAVTransportURI` 的 `CurrentURI` 里**（SOAP POST，`InstanceID` 固定 `0`，`CurrentURIMetaData` 通常为空）⇒ **不需要实现任何播放逻辑**，只要落盘 body + 取 `CurrentURI` + **做一次 XML 实体解码**（`&amp;` → `&`，源文特别提示「注意解码」）；★ **手工路线（零代码验证可行性）**：Windows Media Player 当 DMR（启用媒体流 → ⚠️ **错误 1068 要先起 5 个依赖服务**：Windows Search / Background Tasks Infrastructure Service / RPC / DCOM Server Process Launcher / RPC Endpoint Mapper → 勾「允许远程控制我的播放器」（**之后不能关 WMP**）→ 投屏 → 显示播放列表 → 属性 → 文件 URL）；★★ **「能播」就已经证明「地址拿到了」，不必再验证一遍** ⇒ 手工路线的价值是**先花 5 分钟确认这条路走得通**；★ **保活是硬要求**：源文 Rust 版 `KEEP_ALIVE_INTERVAL = 60s` / Python POC `Cache-Control: max-age=1800`，**不重播的后果是「一开始能发现，过几分钟设备列表里就没了」（静默）**；★ 排错表 6 行（看不到设备 / 过几分钟消失 / 点了没反应 / 取不到 URL / 地址打不开 / 看到的是镜像）；⚠️ 源文开源实现在 `PRO-2684/dlna-dmr`（GPL-3.0），自评 Python POC 的不足是「把所有 GET/POST 都打出来，还得自己翻日志」⇒ **落地时直接对 `CurrentURI` 做提取**；⚠️ **边界**：只在自己拥有的设备与局域网内做技术验证 |
| 701 | `52pojie-1781066-[JS] 监听 checkbox.checked 的变化.md` | `5ece3737892da7ffdda7c2c2cb8a1a6c` | 2026-09-25 | `web-reverse-hook` | evolve | ★★ **DOM「属性」hook 必须在原型描述符上转发** ⇒ **落 `page-unlock-and-userscript-recipes.md` 新 §2.1**（SKILL 导航 +「2a」条）；★ **问题**：`addEventListener('change')` **只覆盖用户点击**，脚本改 `checked` 不派发 `change`；★★ **源文第一版（错的）**：直接 `Object.defineProperty(checkbox, 'checked', {get,set})` **把原型上的原生访问器整条架空** ⇒ **症状（源文原话）**：「脚本更改了值后 checkbox 的**外观没有改变**，用户点击了 checkbox 后**脚本得到的值没有改变**」——**静默、不报错**；★★ **正解（源文第二版）**：先 `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')` 拿原生 get/set，再在**自己的 getter/setter 里 `get.call(this)` / `set.call(this, newVal)` 转发**；★★ **通用配适（源文最终版）**：**在 setter 里 `this.dispatchEvent(new Event("change"))`** ⇒ 让「用户点击」与「脚本改动」走**同一条通知路径**，老的 `addEventListener('change')` 直接可用；★★ **可迁移判据（本节核心）**：**凡是要 hook 的属性在「原型」上**（`HTMLInputElement.prototype.checked` / `HTMLVideoElement.prototype.playbackRate` / `Document.prototype.hasFocus`…），**都必须在原型描述符上转发**，否则静默坏掉（与 `anti-hook-detection-and-bypass.md` §2「从 native 层入手」同源）；★ **区分来源：`event.isTrusted`**（与 `web-js-env-patcher/references/trusted-input-and-isTrusted.md` 是同一件事的两面）；⚠️ 边界：源文 `patch()` **只作用于被传入的那一个元素实例**，要覆盖整页需自行遍历或改原型（影响面更大）；★★ **真机复核（本批 `b37-browsercli-verify.oneline.js` 断言 1–4）**：不转发的写法**写入被影子变量吃掉、浏览器真实状态仍为 `false`**（外观不更新）；转发写法读取值与真实状态一致；setter 内派发 `change` ⇒ 脚本改值触发 `isTrusted=false`、**用户点击（挂到文档后 `click()`）触发 `isTrusted=true`** |
| 702 | `52pojie-1969514-[JavaScript] GitHub 去跟踪原理.md` | `a13365a6ce80e55459be84f3629d742b` | 2026-09-25 | `web-reverse-hook` | evolve | ★★ **「掐初始化，不拦请求」** ⇒ **落 `page-unlock-and-userscript-recipes.md` 新 §2.2**（SKILL 导航 +「2b」条、来源表 +1 行）；★ **目标**：把埋点「**扼杀在摇篮里**」，而不是「等它要发的时候拦下来」；★ **定位动作**：网络面板找到请求 → **检视调用堆栈** → 进最顶部的调用者 → 找到发出请求的那一行 → 往上找**它的初始化位置**；★ 两条链：① `hydroAnalyticsClient` ← `getOptionsFromMeta('octolytics')` ← 从 `document.head` 读**名字以 `octolytics-` 开头的 `<meta>`**（缺 `octolytics-url` ⇒ `collectorUrl` 为 `undefined` ⇒ **抛错**，源文注释原话 `This most likely means analytics are disabled.`）⇒ `$$("meta[name^=octolytics-]").forEach(el => el.remove())`；② `safeSend` 的调用方写着 `const url = ...querySelector('meta[name="browser-stats-url"]')?.content; if (!url) { return }` ⇒ `$("meta[name=browser-stats-url]")?.remove()`；★★★ **可迁移判据（本节核心）**：**「配置缺失 ⇒ 静默不启用」是埋点/SDK 的通用设计**（几乎都有 `if (!url) return;` 这类早退分支，是设计者留的「未配置即关闭」口子）⇒ **要关掉它，去删「配置来源」（meta 标签 / 全局配置对象 / `data-*`），而不是覆盖它的发送 API**；★★ **为什么不要覆盖 `navigator.sendBeacon`**（源文专门点出的误区）：覆盖宿主方法**影响面大**（所有调用方都受影响）且**只挡住最后一步**，删配置**只影响这一个组件**且它在源头上就没启用；★ **时机是硬约束**：必须在**配置读取之前**运行，油猴要 `@run-at document-start`（源文两条链都重复写了这一句）；★ **与 §8 的边界**：若站点把上报当**风控前置**（不上报就不发数据），删掉会直接导致业务不可用 ⇒ 那是「风控校验」而不是「埋点」，回 `web-verify-patcher`；★★ **真机复核（断言 5–6）**：复刻 `getOptionsFromMeta` 后，未删 meta 时能取到 url；删掉后 **octolytics 走 `throw` 早退、`browser-stats-url` 查不到** |
| 703 | `52pojie-1294569-某网站Web端爬虫攻防大赛第一题详细题解.md` | `945eb41ddd7852c82e092b803646f726` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★ **猿人学第 1 题的第二个独立来源** ⇒ **落 `17-yuanrenxue-match-playbook.md` 新 §2.2b**（§4 登记纪律 +1 行、SKILL 导航补一句）；★ **与在册口径一致**：`m = MD5(ms时间戳) + '丨' + 秒时间戳`（`oo0O0` 返回空串，值全由 `window.f` 决定）⇒ **交叉验证通过**；★★ **两个实现细节（源文 §2.2 未展开）**：① **密文在进 RC4 之前先过「自定义 base64」+ 一次 `decodeURIComponent` 往返**（`%XX` 往返 = 「把每个字节重新按 UTF-8 解释一遍」）⇒ ⚠️ **移植 Python 时不能只做 base64 解码**，还要补 `unquote(...decode('latin-1'))`，**漏掉的症状是「RC4 解出来全是乱码、也不报错」**；② **`J` 的两个实参都是密钥**（`J('0x0', ']dQW')` / `J('0x1', 'GTu!')`）⇒ 同一个 `J` 能解出多组明文；★★★ **本批唯一的「结论级发现」：源文附录那份 `hex_md5` 有 6 处常数抄错**（`idx = 0,12,31,42,49,53`；`-680976936`↔`-680876936`、`1804660682`↔`1804603682`、`-1921207734`↔`-1926607734`、`-722881979`↔`-722521979`、**`11261161415`↔`1126891415`（前者 > 2^32，不可能是任何 32 位常数）**、`-1894446606`↔`-1894986606`）；★★ **源文自己带了自检锚点 `md5_vm_test()`（`hex_md5("abc") == 900150983cd24fb0d6963f7d28e17f72`），但它贴的常数通不过自己的锚点**（源文常数版实测 = `215292d4f5aa7b84352e7c928c1dc7a6`）⇒ **★★★ 可迁移动作：拿到「源文附带的完整算法实现」，第一步先跑它自带的自检/样例；没有自检就自己造一个已知输入**（本批脚本 `artifacts/skill-evolution/tools/b37-md5-const-check.js`，含**会失败**的断言）；★ 另一条判据：**标准常数表可按公式 `T[i] = floor(2^32 * \|sin(i+1)\|)` 重算，不要手抄 64 个常数**；⚠️ **登记口径**：本条**不改变第 1 题的结论**，只说明**源文附录那份实现不能直接用**（实际复现走 `hashlib.md5`） |
| 704 | `52pojie-1610506-海外某音x-gorgon算法原理分析及算法源码公布.md` | `f95173b8c83500c2e75928ff854537c9` | 2026-09-25 | `reverse-knowledge` + `web-reverse-algorithm` | evolve | ★★ **新增蓝图 `tiktok-x-gorgon`**（蓝图数 31 → **32**，`index.json` / `metadata.json` / `parts.json` / `mutations.json` / `workflow.md` **五处同步**）+ **落 `18-native-layer-algorithm-restore.md` §2.3**；★★★ **本文的结论级判据**：**签名结果由 `malloc` 出来的地址决定 ⇒ 每次都不一样、且不可纯算复现**（源文原话「一句话解释就是 xg 值的计算结果都是由 malloc 出来的地址来决定的，所以每次都不一样」）⇒ **可迁移判别动作**：同一明文两次结果不同时，先看**差异是否随进程/分配器变化**（地址派生）而不是随时间（时间戳）；★★ **第二条判据**：**这类签名服务端往往不做逐字节校验**（它自己都复现不出来），校验的是**结构与设备画像字段** ⇒ 源文原话「开头 4 字节都是固定的 `04010000`，**`0000` 是正常的设备，如果被检测到就是其他数字**」（源文实测自己的手机是 `1081`）⇒ **这几个字节是风控画像位，不是校验位，采集时要如实带上自己环境的真实值**；★ **本库复算的结构自洽性**：`4`(固定头 `0401`) + `2`(仅 `0401` 后两字节，取自地址低位与 `(地址>>8)` 最低位) + `20`(`0x14` 参数字节) = **26 = `0x1A`** ⇒ 三段恰好填满 `malloc` 的空间，源文的数字互不矛盾；★ 三轮运算（256 码表初始化+打乱 / 20 字节循环异或+相邻异或 / 重赋值含右移·异或·取反）；⚠️⚠️ **三条必须登记的边界**：① 源文是**原理叙述，源码在附件、正文没有代码** ② 源文自称「**海外版某音 1474 版本**」，与公开的其它代 x-gorgon 差异很大 ⇒ **不得用它解释国内版或其它版本** ③ `1081` 的**字节序未给**（`10 81` 还是 `81 10`）⇒ **只登记「它是 2 字节画像位」这一事实**；⇒ 蓝图 `status: partial` / `algorithm.family: custom`，`gaps` 列 6 条、`self_check` 含**可失败的**「同进程两次生成」判别动作 |
| 705 | `52pojie-1355674-实战某东so层算法sign分析.md` | `4bf90f83c1883102bf61963b22976d27` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★ **so 层的「签名版本选择器 `sv`」** ⇒ **落新文件 `18-native-layer-algorithm-restore.md` §2.1**；★ 链路（常规）：`字符串拼接 → sub_126AC(自定义字节处理) → sub_18B8(base64) → sub_227C(md5) → sign`；★★ **真正的坑在入参**：`sub_126AC` 的入参是 `(jni 指针, 明文, 明文长度, 随机数 v26, 随机数 v27)`，而 `v26/v27` 先经 `sub_12640` 得到 **`sv`（signVersion）**，再由 `sv` **决定走哪个 `case`** ⇒ **不同的版本号对应不同的签名算法**；★★★ **判据**：只要在 so 里看到「**用随机数算出一个版本号、再按版本号分支**」，就**不要试图还原所有分支** —— 把随机数**写死成一个已知值**，只跟一个分支（源文原话「故动态调试的时候，固定一种算法分析即可」；具体动作是在 `sub_126AC` 里把 `a5`/`a6` 改掉，固定走 `case 0`）；★ **两条配套判据**：① **`ida` 认不出函数 ≠ 没函数**（源文那段「此函数被加密过」的处置是**在调用点下断点跟着进去**，进去后手动 `p` 转代码再 `F5`）② **`unk_D02565AC` 这类名字是「未定义数据被当函数调用」**，它出现在高位地址段、与低位 `.text` 里的三个 `sub_` 不在同一区域 ⇒ **别在 `.text` 里找它**，要在动态调试时跟进去；⚠️ **本条边界**：源文是**纯截图帖**（正文 132 行含 20 张图），`sub_126AC`/`unk_D02565AC` 的**内部算法未给出** ⇒ 只立上述两条判据，**不得据此推断某东 sign 的具体算法** |
| 706 | `52pojie-729954-某App 接口数据 AES算法 实现.md` | `af173c541edc9dab6bcf6e88f48b90eb` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★ **Java 层算法还原的「最短路线」** ⇒ **落新文件 `18-native-layer-algorithm-restore.md` §3.1–§3.4**；★ 源文的定位顺序逐字：`抓包发现 responseBody 全是英文数字 → jadx 打开 apk → 搜接口名 getVersion → 找到这个 class → 搜索引用这个变量的地方 → 跟进去 → 果然，AES 加密`；★★ **判据**：**Java 层的入口是「业务接口名」，不是加密关键字**（`jadx` 里 `encrypt` 会被无数无关代码命中，而**接口名是唯一的**）⇒ 与 `15-call-site-locating-playbook.md` §1「搜参数名」是同一思路的客户端版本：**搜一个唯一的东西，而不是搜一个常见的东西**；★★ **能整类搬走就不要还原**：源文原话「因为 **android 跟 java 的互通性**，把 apk 中 `AesEncryptionUtil` 这个类**直接复制到 java 里，稍微改改就可以用了**」⇒ **判据：只要加密代码在 Java 层（不是 JNI 进 so），就先试「整类搬移」，失败再谈还原**（这是 Java 层最大的成本优势：不需要 unidbg、不需要符号还原）；★ **密钥与 IV 通常在 `Constant` 常量类里**（⚠️ 源文把 **key** 写成「密文」——「AES 加密所需要的密文跟偏移」，已在本文件 §3.3 显式指出，**不改写源文原话**）；★ **密文是「十六进制字符串」所以看起来「全是英文字母」**（源文原话「AES 之后将 byte 集合转换为 **16 进制** 然后 `toString()`」）⇒ **判据：`responseBody` 是纯 `[0-9a-f]` 且长度为偶数 ⇒ 先按 hex 解码再解；长度是 4 的倍数且含 `+/=` ⇒ 按 base64**（两者混淆的症状是「解密不报错但全是乱码」，见 `16-ciphertext-structure-diagnostics.md`）；⚠️ 源文是 2018 年老文，**只取上述判据** |
| 707 | `52pojie-1492740-记录一次有趣的某题库逆向破解.md` | `8c27cd7626f3ae65cd3bcefd7e73fed6` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★ **APK 内资源包 / 随包下发数据文件的处置** ⇒ **落新文件 `18-native-layer-algorithm-restore.md` §4.1–§4.2**；★ 链路：`选学科 → App 下载一个 zip（里面有 json，就是习题数据）→ 解压要密码 → jadx 反编译 → 发现 apk 里自带两个 zip（测试用）⇒ 代码里必有密码生成痕迹 → 按 zip 名在代码里搜 → 找到变量 → 搜调用方 → 找到方法 → MD5Util.m16624a() 就是解压密码`；★★★ **两条可迁移判据**：① **「apk 里自带测试样本」= 代码里留着密码生成痕迹** ⇒ 源文的定位动作就是「**按自带 zip 的名字去搜代码**」⇒ **拿到加密资源包时，第一步是去 apk 里找同名的测试文件，用它的名字当搜索词**；② **能调用就不要还原**：`frida` 里 `Java.use('<类>').<方法>(入参)` 一行拿到口令（源文用 `ActivityThread.currentApplication().getApplicationContext().getFilesDir()` 拿 App 内部路径构造文件名，再调 `Java.use('com.xxx.util.r').a(md5_data)`）⇒ 与页面侧的「浏览器 RPC」（`14-browser-rpc-bridge.md`）是同一思想，⚠️ **但最终交付仍要落到「能离线复算」的形式**；★ **口令构造（源文原样）**：`MD5( zip文件名.replace(".zip", ".json") + "zsalt" )` ⇒ **32 位小写 hex**（盐 `zsalt` 固定）；★★ **「接口给的数据是错的」时，先怀疑随包下发的样本**：源文自曝「解析 json 后与 App 数据对比，**发现有 20% 的数据是错误的**，抓请求也拿不到正确的数据」，后来**用两个 json 里的 `id` 做关联**，发现**正确的数据就在 App 自带的那个 zip 里** ⇒ **判据：接口返回的数据里有一部分对不上、且「对的那些」恰好能在另一个来源里找到 ⇒ 用主键做两份数据的关联 diff**；★ **第二条**：**自带 zip 里 json 的 key 是会变动的**（上一条是 `key1`，下一条变成 `keyN`）⇒ **字段名会变动时禁止按固定 key 取值**，要按「位置/结构」取值（症状是「大部分解析成功、个别字段静默为 `None`」，**不报错**）；⚠️ 边界：源文的「20%」是**单站单次实测**，**不得当成任何站点的先验**；`com.xxx.util.r` 是 `jadx` 反混淆后的重命名类，换包就不同 |

> ⚠️ 上表 md5 由 `append-b37-ledger.py` **从磁盘现算**（不手抄）；编号按行出现顺序自动生成。

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-reverse-algorithm` | evolve | **新增 `references/18-native-layer-algorithm-restore.md`**（349 行：§0 三十秒判据 / §1 五路分流表 / §2 so·native（`sv` 版本选择器、密钥派生+插入密文、`malloc` 地址派生）/ §3 Java 层（接口名入口、整类搬移、常量类、hex 密文）/ §4 APK 资源包（文件名派生口令、frida 直调、自带样本补数据）/ §5 通用排错表 / §6 源文缺陷登记 / §7 边界与分工 / §8 来源表）；`SKILL.md` 参考导航 +1 条（含 5 条最值钱动作）；`references/02-algorithm-families.md` **新增 §七「客户端授权 / 许可证校验题」**（原 §七 顺延为 §八）；`references/08-mixed-crypto-segmentation.md` **§7.1「第二种模板：hashcash 原教旨」+ §7.2「验收例外」+ §8.4「形态四」**（§八 标题「另外三种」→「另外四种」，速查表 +2 行）；`references/17-yuanrenxue-match-playbook.md` **§2.2b（6 处常数抄错）** + §4 登记纪律 +1 行 |
| `web-reverse-hook` | evolve | `references/response-rewrite-and-locating-hooks.md` **新增 §5「属性访问断点（`breakOn`）」**（原 §5/§6 顺延为 §6/§7；分工表 +1 行、来源表 +1 行）；`references/page-unlock-and-userscript-recipes.md` **新增 §2.1（DOM 属性 hook 必须转发原型描述符）+ §2.2（掐初始化，不拦请求）**、来源表 +2 行；`SKILL.md` 导航 +「2a」「2b」两条 |
| `stream-drm-reverse` | evolve | **新增 `references/dlna-cast-capture.md`**（207 行：投送 vs 镜像判据 / DLNA 五角色 / SSDP 两途径 / HTTP 三路由 / `CurrentURI` / WMP 手工路线 / 工程骨架 / 排错表 / 边界）；`SKILL.md` 分流表 +2 行；`references/online-document-unlock.md` **新增 §8.5「形态⑥-子：不规则切块 + 非标准 CRC32」**（§2 分流表 +1 行、§10 排错表 +3 行、§11 来源表 +1 条） |
| `ast-deobfuscation` | evolve | `references/string-array-and-minimal-eval.md` **新增「形态：原地解密函数（不是数组表）」**（形态 A 单密钥+位置相关 XOR / 形态 B RC4 变体+字符串表 / `acorn`+`escodegen` 定向替换的完整可跑代码与四条判据 / 「乱码字符串排查法」） |
| `web-verify-patcher` | evolve | `references/behavior-verify-and-sign-headers.md` **新增 §12（hashcash PoW + 引擎能力指纹）**、来源列表 +1、坑表 **+4 行**（15–18） |
| `reverse-knowledge` | evolve | **新增蓝图 `tiktok-x-gorgon`**（`index.json` / `metadata.json` / `parts.json` / `mutations.json` / `workflow.md` 五处同步；蓝图数 **31 → 32**）；蓝图 `status: partial`（源文只有原理、无代码），`algorithm.family: custom` |
| `web-reverse-algorithm`（附带修复） | 附带修复 | `scripts/login_param_probe.py` 的一处**裸跨技能引用**（`key-wrapper-families.md` §7）补全为 `../../stream-drm-reverse/references/key-wrapper-families.md`（由本批新建的 `b37-verify-docs.js` 在「一跳邻近」文件里抓出） |

### 本批验收（全部实跑）

- `check_skill_integrity.js`：**0 阻断 / 0 告警**（台账 695 → **707** / 候选 1190 / 待处理 495 → **483**）。
- **双镜像 590 文件逐字节一致**（`md5` 全量比对，diff 0）。
- `blueprint-lint.js`：**error 0 / warn 1**（= 基线，warn 为既有 `toutiao-a-bogus` 缺 `mutations.json`）。
- `query-blueprint.js --selftest`：**33/33**；`--id x-gorgon` 能命中新蓝图（别名检索生效）。
- **`b37-verify-docs.js`（本批新建）**：**0 阻断** —— 改动集 18 个文件 + **一跳邻近 47 个**（共 65 个），
  路径引用 **313 处 0 悬空**、§ 引用 **58 处 0 悬空**、小节号单调 **0 异常**、裸名跨技能命中 1 处（放行）。
- **`b37-verify-numbers.py`**：**87 项断言全绿**（hashcash 最小解 / 非标准 CRC32 命中源文值 /
  CKFinder 33 进制与模板 12 vs 11 位 / x-gorgon 26 字节结构 / 某程 PKCS7 与 IV / MD5 六处常数对照）。
- **`b37-md5-const-check.js`**：**6 项断言全绿**（逐位比对 64 个常数 + 源文自带锚点两版对照）。
- **`b37-verify-sources.py`**：**15/15 全绿**（12 篇源文共 **172 个针**全命中 + 3 条负面断言）。
- ★ **`b37-browsercli-verify.oneline.js` 真机 Chrome 13 项断言全绿**
  （DOM 属性 hook 转发与否的差异 / `change` 派发与 `isTrusted` / 删 meta 掐初始化 /
  `breakOn` 不改变读写语义 / 非标准 CRC32 与 Python 侧一致 / **WebCrypto SHA-1 前导零与最小解**）。
- 台账 `verify-ledger-md5.py` 全量逐条一致 / 幂等复跑。

### 独立评审（第三视角 · 1 名，压窄到 6 条清单）

评审方式：独立 agent，**只给机械证据、不给评价**；清单压到 6 条
（承 B13/B36 教训：清单越长越容易超时；超时 ≠ 通过）。**6 条全部跑完，无「未完成」项。**

| # | 检查项 | 结论 | 评审给出的证据（摘） |
| --- | --- | --- | --- |
| 1 | 新增/修改文件的引用是否悬空（路径 + `§N.N`） | **❌ 不通过（2 处）** | 路径层 20 个 `test -f` **全部 OK**；但 `§` 层抓到 2 处：① `web-reverse-algorithm/references/08-mixed-crypto-segmentation.md:220` 引用「**本文件的 §十二**」，而该文件标题最大只到 `## 九、边界`；② `web-reverse-algorithm/references/18-native-layer-algorithm-restore.md:346` 写蓝图 `douyin-x-gorgon`，实际目录是 `tiktok-x-gorgon`（`ls … \| grep -i gorgon` → `tiktok-x-gorgon`）。**另附一条既有悬空**：`17-yuanrenxue-match-playbook.md:60,375` 的 `§2.14` 在 HEAD 即悬空（该文件最大 §2.13） |
| 2 | `references/` 下的跨技能引用必须退两级（`../../<skill>/`） | **通过** | 新文件 `18-*` 的跨技能引用均为 `../../`；`dlna-cast-capture.md` 只用同目录裸名；本批全部改动文件的跨技能引用均 `../../`。**唯一单级违规**在 `12-login-and-account-params.md:378`（`git status` 未列出 ⇒ **不属本批改动**） |
| 3 | 新数字能否被独立复算（评审自算，不转述） | **通过（三项均复现）** | ① 自写位级 MD5 独立抽 64 个常数：**不符 6 处，下标 = `[0,12,31,42,49,53]`**；`hashlib.md5('abc')` = `900150983cd24fb0d6963f7d28e17f72`；自写标准常数版 = 同值；**源文常数版 = `215292d4f5aa7b84352e7c928c1dc7a6`（≠ 锚点）** ② `binascii.crc32('491721607cf2ca_2_1_0')` = `0fc1c5d0`，`~ & 0xFFFFFFFF` = **`f03e3a2f` 命中** ③ 用 `zfill(len(digest)*8)`（**未补到 256**）独立求解：`bits=11` 最小 counter = **4824**、`bits=12` = **5126**（均命中源文）；`counter=0` 前 11 位 = `11101111010` |
| 4 | 蓝图四处一致性 | **通过（1 处行号瑕疵）** | `blueprint-lint.js` → **error 0 / warn 1**（warn 为既有 `toutiao-a-bogus`）；`metadata.id` = 目录名 = `index` 条目 = `tiktok-x-gorgon`；`status=partial` 在允许集内；`parts[].name` **无重复**；6 条 `sources[].file` **全部 EXIST**。**瑕疵**：第 4 个 source 标 `"line": 9`，该 quote 实际在第 **11** 行 |
| 5 | 口径冲突（同一事实是否被写成矛盾说法） | **通过** | ① hashcash「最小解」在 `08-*` §7.2 与 `behavior-verify-and-sign-headers.md` §12.1 表述一致 ② 非标准 CRC32：源文 JS `Crc ^= 0xFFFFFFFF; Crc = (Crc ^ (-1)) >>> 0` 与 `online-document-unlock.md` §8.5 的 Python `(binascii.crc32(...) ^ 0xFFFFFFFF) & 0xFFFFFFFF` **等价**（实算命中） ③ `02-algorithm-families.md` §七（授权题）与 §一（得物 `newSign`）**内容不重叠** |
| 6 | 源文保真（4 篇各抽 5 项面量） | **通过（20 抽 19 命中）** | 归一化转义后逐项 `grep`：`ctrip_enc_internal`=3、`xmmword_112D4`=1（源文为转义写法）、`SetAVTransportURI`=3、`CurrentURI`=5、`dlna-dmr`=8、`123456789ABCDEFGHJKLMNPQRSTUVWXYZ`=5、`8EB6AF82KAF`=1、`strpos`=2、`octolytics`=5、`getOptionsFromMeta`=6。**不保真 1 项**：`02-algorithm-families.md:383` 把源文的十进制 `92533269` 写成十六进制 `0x92533269`（源文原文 `var h = 10000 * (225282658 ^ t.m);` + `m: 92533269`） |

### 评审缺陷处置（本轮内全部修完）

| 缺陷 | 严重度 | 处置 | 复核 |
| --- | --- | --- | --- |
| **D1** `08-mixed-crypto-segmentation.md:220` 引用「**本文件的 §十二**」，该文件无 §十二 | major | 改为**显式指向真实出处**：`../../reverse-knowledge/references/platform-signature-patterns.md` §十二（该文件第 128 行确有 `## 十二、本项目反复出现的一类"无声缺陷"`） | `grep -n "^## 十二"` 命中；`b37-verify-docs.js` § 引用 58 处 0 悬空 |
| **D2** `18-native-layer-algorithm-restore.md:346` 蓝图名写成 `douyin-x-gorgon` | major | 改为 `tiktok-x-gorgon`（⚠️ 这是**同一错误的第二处**：早前只修了带路径的那一处，**来源表里的裸名没被门禁的正则覆盖** ⇒ 已把「裸名引用」的判据缺口登记进下一批优先级） | `grep -rn "douyin-x-gorgon" .agents/skills/` → **0 命中** |
| **D3** 蓝图第 4 个 `source` 的 `line` 标成 `9`（实际 11） | minor | 改为 `11` | `blueprint-lint.js` error 0；`sources[].file` 全部存在 |
| **D4** `02-algorithm-families.md:383` 把十进制 `92533269` 写成 `0x92533269`（= 2455175785，**值差 26 倍**） | major（**保真类**） | 改写为 `new Date(10000 * (225282658 ^ t.m))`（其中 `m: 92533269`，**源文是十进制**） | 与源文 `52pojie-712068` 第 625/635 行逐字一致 |
| **D5**（评审附带指出的**既有**悬空）`17-yuanrenxue-match-playbook.md` 的 `§2.14` 应为 `§2.13` | minor | 2 处全部改为 `§2.13` | `grep -n "2.14"` → 0 命中；该文件最大节号为 §2.13 |

> 评审 6 条里 **2 条不通过（D1/D2）**、1 条通过但带瑕疵（D3）、1 条抽检抓出 1 项不保真（D4），
> 另附带指出 1 处既有悬空（D5）—— **5 处全部在本轮内修完并复核**。
> ★ 本批**首次**出现「评审抓出的缺陷多于自建门禁抓出的缺陷」（自建门禁抓到 2 处、评审抓到 5 处），
> 其中 **D2 暴露了门禁正则的真实缺口**（裸名跨技能引用不被 `PATH_RE` 覆盖）、
> **D4 暴露了「门禁只查路径与节号、不查数字保真」的盲区** ⇒ 两条都写进下一批优先级。

### 下一批优先级（B37 更新）

1. **归档线第 38 轮**（按既有簇就地取材）。
2. ★ **继续扩大文档门禁的「改动集」** —— 本批**首次主动**把一跳邻近纳入（65 个文件），
   立刻抓出 1 处历史遗留（`login_param_probe.py` 的裸跨技能名）与 2 处我自己新引入的缺陷
   ⇒ **下一批可再扩到「二跳」或「被引用频次 Top-N」**。
3. **本批新登记的「单源 / 未复核」项（勿当结论用）**：
   `52pojie-1610506` 的 20 字节参数位数分配与固定字节（源文未给）、`1081` 的字节序、
   `52pojie-2005163` 的 `column_rotation` 精确公式（源文只给前后值）、
   `52pojie-1355674` 的 `sub_126AC`/`unk_D02565AC` 内部算法、
   `52pojie-1843070` 的 `F` 值内部算法（源文自陈「过程我就忽略了」）与「服务端是否校验 `counter` 唯一性」、
   `52pojie-1492740` 的「20% 数据错误」为单站单次实测、
   `52pojie-1880044` 的 `level` 取值（源文 JS 段与其 Python 段自相矛盾）、
   `52pojie-712068` 的「服务端是否也有授权校验」（源文只证了前端）。
4. **`stream-drm-reverse` W7「无脚本入口」仍未消**（B34 遗留，已连续四批挂着）。
5. 候选新技能 `captcha-flow-orchestration` —— **第三十一次确认不新建**（本批 12 篇无验证码题）。
6. **候选新技能「native/so 层算法还原」** —— 本批**首次正式评估**：
   本批有 5 篇落在这个簇，但**判据是「载体层」而非「独立工作流」**，
   且既有 `02-algorithm-families.md` §一 已有得物 so 层样本 ⇒ **决定：并入 `web-reverse-algorithm`（新参考文件），不新建技能**。
   触发再评估的条件：**当「native/so 题」在本批占比 ≥ 1/3 且出现 2 个以上可独立成篇的工作流（如 unidbg 工程化 / IDA 脚本化）时再议**。
## 批次 B38 · 2026-09-25（第三十九次执行）

**取材口径**：**归档线第 38 轮新收 8 篇全取（8/8 命中）** —— 承接上一批「归档线第 38 轮」的优先级 ①。
本批**首次出现「归档线见底轮」**：第 38 轮归档自己在提交信息里写明「**全通道见底确认轮**」
（六条向内通道全部收口、`Thread` 逐页池外 web 逆向 = 0 已连续 ≥5 轮），
故本轮供给只有 8 篇；本批**如实按 8 篇蒸馏**，不为了数字去翻旧账。
簇结构：**「客户端载体层」5 篇**（Android/so/Java/APK ×4 + Electron 客户端 ×1）、
「风控触发条件」1 篇、碎片求助帖 2 篇。

**产出**：**0 新建技能**（能力缺口评估 = 0，逐篇给了「为什么不是新建」的判据），
**演化 6 个技能、新建 1 个参考文件 + 1 个脚本 + 4 个批次工具**；**未新建蓝图**。

### 本批的「结论级发现」（两条，均由真机/复算抓出）

1. ★★★ **源文 `52pojie-1803699` 的 RSA 签名长度算式**把 **bit 当成了 hex 字符数**：
   `em_len = k // 4`（1024 位 ⇒ 256）而正解是 `k // 8` = **128 字节**。
   源文靠 `[:s_len]`（= 232）截断，而 **232 > 128 ⇒ 截断是 no-op** ⇒ 「**结果对、算式错**」。
   本库复算三方对齐：hook 值 base64 解出 **128 字节** ✓ / `k/8 = 128` ✓ / 源文算式应产出 **312 字符** vs 实测 **172** ✗。
   ⇒ 可迁移判据：**`k` 的单位是 bit 时要先 `/8`；机械自检 = `len(b64decode(sign)) == k/8`**；
   ⚠️ **`[:s_len]` 这类「截断以对齐」的写法会让长度断言恒真**（与 B37 的 `zfill(256)` 假绿同族）。
2. ★★★ **「HTML 命名实体解码残留」是一族，不是 `×tamp=` 一个**（且机制被真机修正）：
   真机 Chrome 复算证明「被吃」**由「`&` 之后的串是否以某个 HTML 实体名开头（取最长匹配）」决定，
   与参数名无关** —— `&param2=`→`¶m2=`、`&sectional=`→`§ional=`、`&currencx=`→`¤cx=` 同样被吃；
   `&tamps=` / `&timeine=` / `&page=` / `&token=` / `&sig=` / `&ts=` 不被吃。
   ⇒ **判据是「前缀规则」而不是「一份名单」**（扫描器已按规则实现）。

### 本批自曝缺陷（全部在本轮内修完）

1. ★★ **我新写的文档门禁 `b38-verify-docs.js` 第一版是「恒红」的**：`NOUP_RE` 没排除 `docs/…`
   （仓库根相对路径，`check_skill_integrity.js` 规则 2c 明确放行）⇒ 一次报出 **17 条假悬空**。
   ⇒ **恒红的检查等于没有检查**（与 B37「恒亮」互为镜像，本批**两个方向都踩到**）。
2. ★ **蓝图裸名正则写宽了**：`蓝图[^\n]{0,40}?``([A-Za-z0-9._-]+)` 会把
   「`蓝图 \`元数据\` … \`metadata.sources\``」的**第二个**反引号段抓成蓝图名，
   还把**技能名**（`reverse-knowledge`）与**别名**（`a_bogus`）判成缺陷 ⇒ 改 `[^`\n]` 中段 + 别名/技能名放行。
3. ★★ **我的「源文针」第一版把「落点出现次数」写死**，30 条里 **27 条假红**（一改就红 = 过拟合）。
   ⇒ 改为「**源文必须有 ∧ 落点 ≥1**」，只对「该词在本批只会出现一处」的场景用精确次数。
4. ★★ **真机脚本第一次跑出 2 条失败，其中 1 条推翻了我的文档口径**：
   我写进了「交换两阶段 XOR 顺序 ⇒ 解不出原文」，真机证明**两阶段 XOR 可以互换**
   （XOR 可交换、每个字节在每阶段恰被同一密钥字节作用一次）。
   ⇒ 已把文档改为「**不可互换的是「置换」与「XOR」的相对位置**」，并新增一条**会失败**的断言（5e）。
   另一条失败是**我对实体机制的归纳太窄**（见上方结论级发现 2），同样已回灌。
5. ★★★ **我把「实体族命中数」写成了「精确串命中数」，两者差得离谱**：
   扫描器报的是**族口径**（`×` 后跟任意字母），而我在文档里写成 `×tamp= 42` / `§ion= 38` / `¬ify 16` ——
   实测**精确串**是 `×tamp=` **30**、`§ion=` **21**、`¬ify=` **0**（那 16 处全在二进制乱码段里）。
   ⇒ 判据从「一个数字」变成「**必须写明是哪种口径**」，两处已改为双栏对照表。
   ⚠️ 这类缺陷的特征：**数字本身能被复算，但口径对不上** —— 单看每一处都"对"，合起来才矛盾。
6. ★★ **我引入了一个「schema 里没有的野字段」**：给蓝图 `jd-h5st` 加了 `dependencies`，
   而 `blueprint-schema.md` 的字段表里**没有它**、`blueprint-lint.js` 也**不校验未知字段**
   ⇒ 这个字段会**静默生效、检索看不出来**。已在本轮把它**登记进 schema**（并写了一行「此前会静默生效」）。
   ⚠️ 这是「**新增结构必须先进权威源**」纪律的又一次踩线（与 B37 的「同一事实散落多处」同源）。
7. **门禁自己的误报又抓了两类**：① `blueprint-schema.md` 里的 `` `workflow.md` ``（蓝图四件套之一）
   被当成「裸名跨技能引用」；② 蓝图目录名 `migu-playurl/{mutations,workflow}` 的花括号简写被当成路径。
   ⇒ 已加两条最小排除（蓝图固定文件名 / 含 `{}` 的简写），并**复跑故障注入确认判据未因此变钝（**6/6 仍变红**）**。
8. ★★★ **「保真类」缺陷 2 处（由本批的「源文针」在自评阶段抓出，已在轮内修完）**：
   ① **擅自解开了源文的脱敏**：源文 `52pojie-1988994` 的域名与 Referer **都是 Base64 打码**
   （`aHR0cHM6Ly9wYXNzcG9ydC5iYWlkdS5jb20vdjIv`，源文自注 `//Base64`，标题亦写「某度」），
   而我首版直接把明文域名写进了落点 ⇒ **已改回 Base64 形态并加「保真纪律」提示**，
   同时把「明文域名不得出现」固化成**负面断言**；
   ② **逐字保真**：源文的 `min(len(e) - t, len(r))`（运算符两侧有空格）被我抄成了无空格版 ⇒ 已改回逐字。
   ⇒ ★★ **可迁移纪律：源文里凡是「自己做了脱敏/打码」的（Base64、`***`、`xxx`），
   落点必须保留其脱敏形态，不得擅自解码** —— 这是一条**新的保真维度**，
   B37 的针清单只查「面量是否来自源文」，**不查「源文的处理痕迹是否被抹掉」** ⇒ 本批已把两种都做成针。
9. **故障注入第一版 3/5**：两条是**夹具不唯一**（`old` 在文件里出现 4 次 / 2 次），
   一条是**判据级别搞错**（「裸名跨技能」本批是 **warn** 级、退出码本就为 0，不能用 rc≠0 判）。
   ⇒ 改为「唯一夹具 + `need_rc=False` 区分告警级判据」，复跑 **6/6 变红且阴性对照全过**。

10. ★★★ **门禁的第三个盲区：带引文的标题引用漂移（本批一次性暴露 4 处）** ——
    ① `18-*:147` 引 `08-mixed-crypto-segmentation.md` §8「密钥包装的**另外三种**形态」，
    而该标题在 **B37 已改成 §八「另外四种」**（**改了标题没改引用**）；
    ② `18-*` 两处引 `15-call-site-locating-playbook.md` **§1「搜参数名」**，
    该文件**根本没有这个措辞**，实际对应 **§0 的 `J1「消失点比出现点更好用」`**；
    ③ `page-unlock-and-userscript-recipes.md:276` 引 `anti-hook` §2「从 native 层入手」——
    那其实是**本文件自己**的 §2 标题（**把本文件的标题安到别的文件头上**），`anti-hook` 的 §2 是「通用范式：选择性劫持」。
    ⚠️ 共同特征：**节号存在 ⇒ 旧的「§ 是否悬空」判据恒绿，但引文与标题已经对不上**。
    ⇒ 已补成 `b38-verify-docs.js` **判据 ④b**（抽 `` §…「…」 `` 回原文件核对标题**逐字相等**，含汉字节号 `§八`）
    并配**故障注入第 6 组**；复跑 **7 处 0 漂移**。
    ★ 本条**由第三方评审与主进程新判据分别抓到** ⇒ 印证「**评审要压窄清单，但清单之外仍需自建判据**」。

### 处理清单

| # | 文件 | md5 | 处理时间 | 关联技能 | 变更类型 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 708 | `52pojie-1238131-快手7.5版本sig参数逆向分析.md` | `9663547d11bf2dbacac47eb726944d41` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★ **so 层「进 `ida` 的第一分钟」** ⇒ 落 `18-native-layer-algorithm-restore.md` **新 §2.5**（原 §2.5 不存在，§2.4 之后直接接新节）；★ **静态注册 vs 动态注册**：`Exports` 搜不到方法名 ⇒ **不是「函数不存在」，是动态注册**（`JNI_OnLoad` → `GetEnv` → `RegisterNatives`）；★ 源文的路径是 `jadx 搜 sig（结果太多）→ 改搜「带引号的 \"sig\"」⇒ 5 条 → 按语义剔除 4 条` ⇒ ★★ **可迁移判据：全局搜参数名命中过多时，改成搜「带引号的形式」**（业务代码里 `sign` 会作为子串出现在 `assign`/`design`/`signal` 中，**只有字符串字面量才是参数名**）；★ `ida` 侧：`Exports` 里 `Java_<包>_<类>_<方法>` 即静态注册的符号，源文实测 `CPU_getClock` 就是它；★★ **RVA + 基址**：伪代码里 `v12` 来自 **`6074`**（= `dword_6074`），frida 侧必须是 `so 基址 + 0x6074 → Memory.readByteArray`（**`loc_`/`dword_`/`byte_`/`off_` + 十六进制全是 RVA**）；★ `j_cpu_clock_start → j_cpu_clock_x → j_cpu_clock_end` 的 **`j_` 前缀 = `ida` 已识别为 JNI 函数**、`_start/_x/_end` 三件套本身就是「初始化 → 运算 → 收尾」的路标；★★ **「看着像某个标准算法」时最省的确认动作是「跑一遍标准实现做 diff」**（源文原话「有点 MD5 的感觉，**上代码验证下可发现**，确实是加 salt 之后的 md5」）；★★ **`sig` 的落地口径**：`TreeMap` 字典序 → 逐对 `key=value` **连写（不带 `&`）** → 追加固定盐 `FANS_SALT = "382700b563f4"` → `md5` → `toLowerCase()`；⚠️ **`sig` 与 `__NStokensig` 必须排除在签名串外**（自指参数）；⚠️ **`URLDecoder.decode(value, "UTF-8")` 是「先解码再签名」**（漏掉 `unquote` 的症状是「签名不对但看不出哪里不对」）；★ 与本文件 §3.8 的 `1724211`（**带 `&`**）**构成两种拼接形态**，是本节最常踩的坑；⚠️ **源文缺陷登记**：`SHA512/SHA` 两个方法**定义了但 `sig` 根本没用**（`genSigSignature` 用的是 `md5`）⇒ 死代码，**不把 SHA512 写进判据**；`getMapFromStr` 在 key 无 `=` 时 `itemArr[1]` 越界 |
| 709 | `52pojie-1463849-js逆向练手 starm ras 加密.md` | `62ea82c43fa247e7a37912b57df97224` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★ **`Base64.encode(Hex.decode(x.toString(16))) ≡ btoa(x)`** ⇒ 落 `18-*` **§3.8 模式 B**；★★★ **这是本批最干净的一条「删代码」判据**：源文那两行「`toString(16)` → 奇数长度补 `0` → `Hex.decode` → `Base64.encode`」**整体是一个 no-op**（本库对 1/8/16/17/32/64/128 字节逐一验证），Python 侧**直接 `b64encode(pow(m,e,n).to_bytes(k//8,'big'))` 即可**；⚠️ **唯一陷阱是「奇数长度补 0」**：`toString(16)` 丢前导零 ⇒ **Python 必须用定长 `k/8` 字节（`'big'`）而不是 `minimal` 长度**（与 §3.6 的 `/8` 是同一件事的第二次出现）；★ **模式 B = 挑战-应答两跳**：`POST getrsakey {donotcache: 毫秒时间戳, username}` → `{publickey_mod, publickey_exp}` → `RSA.getPublicKey(modulus_hex, exponent_hex)` → `RSA.encrypt(password, pubKey)`；★★ **判据：接口名里带 `rsakey`/`getpubkey`/`challenge` 的几乎必然是挑战-应答，不要去搜「密码怎么加密的」**（密码密文本来就是一次性的）；★ `pkcs1pad2` 的 `keysize = (modulus.bitLength() + 7) >> 3` ⇒ **`+7 >> 3` 就是「向上取整到字节」**（1024 位 → 128 字节，与 §3.6 同源）；★★ **扣代码的「缺什么补什么」三级成本顺序（源文原样）**：`BigInteger` 未定义 → 搜到 100+ 处调用 → **直接全文件复制**；`navigator` 未定义 → **`navigator = this`**；普通未定义参数 → **`i = {}`**；⚠️ 源文的 `navigator = this` 是**图省事的写法**，只适用于**不依赖指纹**的老站点（本条 `rsa.js` 恰好不依赖），需要指纹回放的走 `../../web-js-env-patcher/` |
| 710 | `52pojie-1724211-某免费小说APP sign参数逆向分析与实现.md` | `7b489ed1ac98d59fc37af35f196897e1` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★★ **`JNI_OnLoad` + `RegisterNatives` 动态注册的完整样本** ⇒ 落 `18-*` **§2.5 + §3.5**；★ `RegisterNatives(clazz, methods, nMethods)` 与 `JNINativeMethod{name, signature, fnPtr}` 的契约（**`fnPtr` 才是目标函数指针**，源文实测 `sub_877EC` = `hash`、`sub_87324` = `hash2`）；★★ **`JNIEnv*` / `JavaVM*` 类型判据**：`JNI_OnLoad` 第一个参数是 `JavaVM*`、`GetEnv` 输出是 `JNIEnv*`；⚠️ **不要凭「名字像」猜类型** —— 源文把 `sub_78EEC` 惯性改成 `JNIEnv*` 得到的是 **`FindClass`**（明显不对），**xref 到 `JNI_OnLoad` 才发现是 `JavaVM*`** ⇒ **改类型前先看 xref；得到的函数名与语义矛盾时，类型就是错的**；★★ **`methods` 数组可能是加密数据**：源文的三个字段静态全是空数据，要**先经 `sub_78F54` 解密**（**取三位一组转十进制 ↔ 与 `v12` 异或**；密钥 `key = [56, 48]` = `ord('8')/ord('0')` 循环，即源文 `v12 = "8080"` 的前两字节；`v8 - (v10 & 0xFFFFFFFC) ≡ v8 & 3` 本库已全量验证）⇒ **判据：`JNINativeMethod` 的三个字段静态全是 0 时，先找「谁在 `RegisterNatives` 之前解密了它」**；★★★ **多 ABI 选型（本批最省时间的一条）**：源文原话「一开始分析的是 `arm64`……反编译的结果不是很好分析，头脑有点迷糊没有对上哪个函数指针对应哪个函数……**后面换了 32 位的 so 文件才发现反编译效果好的太多了**」⇒ **落地动作：解开 `apk` 后先比 `lib/arm64-v8a` / `lib/armeabi-v7a` / `lib/x86` 的反编译质量，挑好的那份**；★ **JNI 回调 Java 标准库的四步骨架**（`FindClass` → `NewObjectV` → `GetMethodID` → `CallObjectMethodV`）⇒ **看到这四步就直接判「算法体在 Java 标准库」，不用读 `sub_`**，源文翻译回 Java 只有 8 行（`PKCS8EncodedKeySpec` → `KeyFactory("RSA")` → `Signature("SHA1WithRSA")` → `initSign/update/sign`）+ `Base64`；★ 私钥不是硬编码字符串而是 `off_3BFC50 + 1 = unk_2F5477`（长度 `0x279` = 633 字节，与 1024 位 PKCS#8 自洽）⇒ **判据：`PKCS8EncodedKeySpec(key)` 的 `key` 来自「常量偏移 + 1」时，`+1` 是在跳过 DER 首字节 `0x30`；取证动作是「dump 常量偏移处那一段、试 base64 / 试 latin-1」，不要去算私钥**；⚠️ 源文缺陷：`private_key = b""` 是**占位空值**，且 `RSA.importKey(private_key)` **未 `b64decode`** ⇒ 与 `1803699` 的写法**互相矛盾**（已登记为「两种写法二选一」） |
| 711 | `52pojie-1803699-小白入门，无壳app登录算法还原并实现发包（重发）.md` | `d6ea6cc40742453b72526380186d18c5` | 2026-09-25 | `web-reverse-algorithm` | evolve | ★★★ **「结果对、算式错」的教科书样本** ⇒ 落 `18-*` **§3.5–§3.7**；★★★ **`em_len = k // 4` 把 bit 当成 hex 字符数**：1024 位正解 `em_len = k/8 = 128` 字节、`s_len = 128-20-3-1 = 104`；源文的 232 **> 128 ⇒ `[:s_len]` 是 no-op** ⇒ **「能跑出与抓包一致的结果」不代表公式正确（只代表端点对齐）**；★ 本库三方复算：源文 hook 的 `sign` base64 长度 **172** / 解码 **128 字节** ✓、源文算式应产出 **312 字符** ✗；⇒ **机械自检：`len(b64decode(sign)) == k/8`**；⚠️ 并登记通则：**`[:s_len]` 这类「截断以对齐」的写法会让长度断言恒真**（与 B37 `zfill(256)` 同族）；★★★ **`frida` 双日志 = 现成的接口规格说明**：源文在**逆向之前**就打印出 `getRSAParams is called, params: {password=…, os=android, mobile=…, version=2.2.3}` 与 `ret value is {data=…, sign=…, timestamp=1687264102}` ⇒ 三条可直接抄的判据：① `data` 是 **`Base64(紧凑 JSON)`**（解开头即 `{"password":...}`）② **`sign` 的原文是 `data=<b64>&timestamp=<秒>`** ③ **`timestamp` 是秒级（10 位）**；★ **紧凑 JSON 判据**：JSON 里没有 `": "` / `, ` ⇒ 跨到 Python **必须 `separators=(',',':')`**（真机复算：`JSON.stringify` 默认就是紧凑的）；★★ **跨语言「同型双源互证」**：本篇（`SHA.new` + `pkcs1_15`）与 `1724211`（`SHA1WithRSA`）是**同一模式的两个站点实例** ⇒ **看到 `SHA1WithRSA`/`SHA256WithRSA` 在 Java 层，就按「拼串 → RSA 签 → Base64」三件套直接落地**；★ §3.7 三条 Python 对应（`pkcs1_15` ≠ `PKCS1_v1_5` 同名新旧 / `import_key` 先试 `b64decode` 再试直喂 / Java 默认 PKCS#1 v1.5 不是 PSS）；⚠️ 源文**只给了 Python 侧**，「`SHA1WithRSA`」是本库按 Java 语义归纳的（**已登记，不作针**） |
| 712 | `52pojie-1897373-谢谢大家，某次网站的js逆向.md` | `0aa2ad1bf88f357d92b4ffe1099bbb20` | 2026-09-25 | — | skip | **已精读，判「不登记判据」**。源文是一条 **34 行、729 字节的弃帖**：作者自己**主动撤题**（原话「想想 还是算了，谢谢大家了，或许还是用其他方式吧（毕竟属于 gov）」），正文只剩一条现状描述（「这个文件里面 混淆以后 还有大量 特殊字符」+ 一个搜索不到的关键词），**没有任何可迁移的结论**。⇒ 按「避免滥建冗余技能」与「未结论不登记」双重纪律，**不落任何落点**，仅登记为「已处理」。⚠️ 与 `52pojie-1988994`（求助帖但有**一条被实证的变量**）的区别在此：**弃帖 ≠ 求助帖**，前者连待验证的线索都没有 |
| 713 | `52pojie-1988994-【JS逆向】某度发送验证码接口总是报130049安全风险.md` | `27eca9ad20e757bd6b027ecdf08ed180` | 2026-09-25 | `web-verify-patcher` | evolve | ★★ **「触发条件不在参数上」的零成本排除法** ⇒ 落 `baidu-yunjiasu-safety-check.md` **新 §2.7**（文件定位一句话 +1 行、坑表 **+3 行**（19–21）、来源表 +1 行）；★★★ **判据（本节核心）：参数在浏览器里明明是对的、换到脚本里却稳定失败时，先做「拿到参数立刻发 vs 等一会再发」的对照** —— 源文补充原话「**把这些参数都先存起来，等一会再去发送**，立马就是 `50052`」⇒ **两者结果不同即证明触发条件与参数无关**（速率/画像类风控），**继续调参数是白费**；★★ **错误码是画像的读数**（源文实测：`130049` 直接拒 / `50052` **降级为滑块** / `0` 通过）⇒ **可以用它判断「改动是变好还是变坏」，而不是只看成功失败**；★ 源文另一个方法论级可迁移点：**「也往 tls 方向试了，发现没有 tls 指纹校验」是排除法产出的负结论**（把高成本怀疑项划掉，同样值得记）；⚠️⚠️ **登记纪律（本条是「求助帖式任务」的典型）**：源文是**悬赏问答帖、提问者自己还没解决**，且自陈「**8 成都是对的**，但总觉得可能少哪了或哪错了」⇒ **只登记被实证的那一条变量（时间差 ⇒ 速率触发）**，**不登记**帖子里 `dv`/`tk`/`ds`/`s`/`k`/`sig`/`shaOne`/`rinfo`/`gid` 中的任何一个为「必需参数」或「生成公式」；★ 同厂商不同链路的分工已在本文件开头写清（挑战页 §1–§6 / 注册链 §2.7） |
| 714 | `52pojie-2031462-音频网站逆向如何进行捞偏门.md` | `24be4d52d3c59b3afcb145cae9695c17` | 2026-09-25 | `stream-drm-reverse` + `desktop-client-reverse` | evolve | ★★★ **音频站地址还原的第三种形态：字符置换表 + 分块 XOR（自密钥）** ⇒ 落 `playback-address-interfaces.md` **新 §4.3**（§4.3 原「音频站排错」顺延为 §4.4、SKILL 分流表 +2 行、来源描述「两族」→「三族」）；★★★ **判据（一句话分辨「置换表」与「XOR 密钥」）：把那张表去重数一遍** —— 源文四张表本库实测：`inito`/`initr` **长度 256 且去重后 256（双射 ⇒ 置换表/S-box）**、`inita` **32 项去重后 30（⇒ XOR 密钥，不是置换表）**、`initn` 32 项去重 32；**二者在代码里长得一模一样（都是 `r[e] = u[r[e]]`），只有统计量能分开**；★★ **流程**：`base64`（先 `-`→`+`、`_`→`/` 并补 `=` 到 4 的倍数）→ 前段 = 密文、**末 16 字节 = 自密钥（既是密文尾巴又是密钥）** → 逐字节过置换表 → **每 16 字节 XOR 32 字节表** → **每 32 字节 XOR 32 字节表**；⚠️ **与常规 CBC 相反：IV 在尾部不在头部**；★★ **顺序判据（真机复算修正）**：**两阶段 XOR 之间可以互换**（XOR 可交换）⇒「16 先还是 32 先」**不是判据**；真正不可互换的是「**置换**」与「**XOR**」的相对位置（真机构造性复现：先 XOR 再置换 ⇒ 解不出原文）；★ `p()` 用 `min(len(e)-t, len(r))` ⇒ **尾部不足一块时只 XOR 剩余字节**；⚠️ 源文 `replaceBase64` 顺手 `re.sub('[^A-Za-z0-9\+/]','',s)` **会静默吞掉坏字符**（落地时应加自洽断言）；★★ **同站多端（Electron）三判据** ⇒ 另一落点 `electron-asar-and-fuses.md` **新 §9**（原 §9 反例顺延为 §10、坑表 **+3 行**（15–17）、SKILL 描述 +1 行）：① **同站 Web 与桌面共用同一接口、且 Web 更新频繁而桌面更新慢 ⇒ 先逆「更新慢」的那一端**（逆向产物的寿命 = 目标端更新周期）② **借壳判据：加密模块「不涉及 token 信息」时，直接 require 它的 JS 改调用方式，不要重写算法**（依赖 token/cookie/存储/指纹则转补环境或纯算）③ **指纹头先翻 cookie**（源文对 `wpf` 的处置原话「好在这个**就直接在 cookie 里面就有**，拿过来直接用」）；⚠️ 源文**没给完整代码**（只有调用截图）且未说明 `cid`/`kdf` 取值来源 ⇒ **只登记三条判据，不登记任何参数值** |
| 715 | `52pojie-2096902-某东的签名参数逆向.md` | `11b94cbce99fdde8b55f207727bb97cf` | 2026-09-25 | `reverse-knowledge` | evolve | ★★ **「能生成」≠「能通过」的成因边界** ⇒ 落蓝图 `jd-h5st` **`mutations.json` +1 条** 与 `metadata.json`（新增 `dependencies: ["jd-env-params"]`、`gaps` +1 条；`blueprint-lint` error 0 / warn 1 = 基线）；★★★ **源文的症状描述就是最有价值的部分**（原话「**经过环境补全后，肯定是顺利生成了参数，可是生成的却是无法通过校验的**」）：补环境只负责让 h5st 的**算法**跑通（能产出 8 段字符串），服务端还会看随登录态/业务下发的**业务态字段**（`jdtoken`、`extend` 里的 `bu1`..`bu12`，另见蓝图 `jd-env-params`）⇒ **这些字段不由 h5st 算法产出，缺了就表现为「格式正确但 403」**；★ 源文自陈的另一半「经过自己慢慢调试发现该参数生成过程涉及到 jdtoken，bu1-bu12，还有一些看起来像随机值的参数」与既有 5 篇源文的「环境变量白名单 = `sua/pp/extend/random/v/fp`」**互为补充**（**白名单管「算法内部用哪些环境量」，本条管「服务端还额外要哪些业务态字段」**）；⚠️⚠️ **该帖是求助帖、无最终结论** ⇒ **只登记这条症状-判据**，**不登记任何取值**，且 `gaps` 里明确「具体缺哪几个、取值形态如何仍是 gap」；★ 本文件是**本批唯一「编辑既有蓝图」而非新建**的落点（与 B37 新建 `tiktok-x-gorgon` 形成对照：**证据不足时不新建，挂到最近的既有蓝图**） |

> ⚠️ 上表 md5 由 `append-b38-ledger.py` **从磁盘现算**（不手抄）；编号按行出现顺序自动生成。

### 本批次技能变更汇总

| 技能 | 变更类型 | 主要落点 |
| --- | --- | --- |
| `web-reverse-algorithm` | evolve | `references/18-native-layer-algorithm-restore.md` **新增 §2.5「进 so 的第一分钟：静态注册还是动态注册」**（分流表 + 三条 `ida` 硬判据 + RVA/基址 + `j_` 三件套）、**§3.5（JNI 回调 Java 标准库四步骨架 + `frida` 双日志当规格 + 同型双源互证 + 私钥取证点）**、**§3.6（`k` 单位错 · 长度必须 `k/8` 现算）**、**§3.7（`SHA1WithRSA` 的 Python 三条对应）**、**§3.8（客户端 App 签名三种落地模式 + 带引号收窄 + 无分隔符拼接 + `Base64.encode(Hex.decode(x)) ≡ b64(x)` + 补环境三级顺序）**；§0 判据表 +1 行、§5 排错表 +5 行、§6 源文缺陷 +3 行、§8 来源表 +4 行；`SKILL.md` 该文件的导航句由「三条最值钱的动作」扩为「六条」（含动态注册、`frida` 双日志、`k/8`） |
| `stream-drm-reverse` | evolve | `references/playback-address-interfaces.md` **新增 §4.3「字符置换表 + 分块 XOR（自密钥）」**（原 §4.3 排错顺延为 §4.4；含去重法分辨置换表/密钥、末 16 字节自密钥、两阶段 XOR 可交换 vs 置换不可交换的顺序判据）；`SKILL.md` 分流表 +2 行、权威源描述「音频站两族」→「三族」 |
| `desktop-client-reverse` | evolve | `references/electron-asar-and-fuses.md` **新增 §9「同站多端：优先逆更新慢的那一端」**（原 §9 反例顺延为 §10；三条判据：选端/借壳/指纹先翻 cookie）；坑表 14 → **17 条**（15–17）；`SKILL.md` 权威源描述 +1 行（§9 三判据 + 坑表数更新） |
| `web-verify-patcher` | evolve | `references/baidu-yunjiasu-safety-check.md` **新增 §2.7「触发条件不总是参数算错」**（「立刻发 vs 等一会发」对照法、错误码分层作画像读数、求助帖登记纪律）、文件头部定位说明 +1 行、§6 登记表 +2 条、§7 来源表 +1 行；`references/behavior-verify-and-sign-headers.md` 坑表 18 → **21 条**（19–21）；`SKILL.md` 新增一条「同厂商挑战页与注册链分开读」的导航 |
| `reverse-knowledge` | evolve | 蓝图 `jd-h5st`：`mutations.json` 6 → **7 条**（业务态字段 `jdtoken`/`bu1..bu12` 不在补环境范围内）、`metadata.json` 新增 `dependencies: ["jd-env-params"]` 与 `gaps` 6 → **7 条**（`sources` 35 条全部存在）；**蓝图总数不变（32）**；★★ `references/blueprint-schema.md` **登记新增字段 `dependencies`**（此前该字段**不在 schema 里 ⇒ 写了也静默生效、检索看不出来**，lint 也不校验 ⇒ 本轮把它补进权威源） |
| `forum-corpus-archival` | evolve | **新增 `scripts/scan-entity-residue.py`**（HTML 命名实体「无分号 legacy 形态」扫描器，`--selftest` **19 项**含阳性 5 / 阴性 7 / 机制 5；`--json` / `--all` / `--min-suffix` / `--fail-on-hit`）；`SKILL.md` 坑表 **+1 条（坑 105）**；`references/filter-rules.md` **新增第十六层**（扫描器 + 三条硬约束 + 本轮基线表）；修正两处跨技能裸名引用 |
| （附带修复 · 跨 5 个技能） | 附带修复 | 由本批新建的 `b38-verify-docs.js` 在「改动集 + 一跳 + 二跳」共 **132 个文件**里抓出并修正 **5 处「裸名跨技能引用」**：`10-waf-clearance-cookie.md`（`edge-waf-cookie-challenge.md`）、`12-login-and-account-params.md`（`key-wrapper-families.md`）、`baidu-yunjiasu-safety-check.md` 与 `behavior-verify-and-sign-headers.md`（`16-ciphertext-structure-diagnostics.md`）、`geetest-protocol-matrix.md`（`03-special-cases.md`）⇒ 全部补成 `../../<skill>/references/<名>.md` |

### 本批验收（全部实跑）

- `check_skill_integrity.js`：**0 阻断 / 0 告警**（台账 707 → **715** / 候选 1198 / 待处理 491 → **483**）。
- `blueprint-lint.js`（改动 `jd-h5st` 与 `blueprint-schema.md` 后复跑）：**error 0 / warn 1**（= 基线）。
- **双镜像 591 文件逐字节一致**（`md5` 全量比对，不一致 0）。
- `blueprint-lint.js`：**error 0 / warn 1**（= 基线，warn 为既有 `toutiao-a-bogus` 缺 `mutations.json`）。
- `query-blueprint.js --selftest`：**33/33**。
- **`b38-verify-docs.js`（本批新建）**：**0 阻断 / 0 告警** —— 改动集 **18 个文件** + **一跳 83 + 二跳 31**（共 **132 个**），
  路径引用 **514 处 0 悬空**、§ 引用 **72 处 0 悬空**、小节号单调 **0 异常**、裸名跨技能 **0 处**、蓝图裸名 **0 处**、
  **带引文的标题引用 7 处 0 漂移**。
  ★ 本批**首次跑「二跳」**，并**补上了 B37 评审暴露的两个真实缺口**（裸名跨技能 / 蓝图裸名），
  又在轮内**补上第三个缺口「带引文的标题引用」**（见「自曝缺陷 10」）。
- **`b38-verify-numbers.py`（本批新建）**：**57 项断言全绿**（实体族机制 5 条 + 语料面量 7 条 + 音频站结构 8 条 +
  JNI/RSA/位运算 26 条 + 风控错误码 4 条 + 阴性对照若干）。
- **`b38-verify-sources.py`（本批新建）**：**61/61 全绿**（8 篇源文共 **55 个针**全命中 + **8 条负面断言**）。
  ★ 口径修正：**默认只要求「源文有 ∧ 落点 ≥1」**（写死落点次数会让断言**一改就红** —— 首版 30 条里 27 条假红）。
- **`scan-entity-residue.py --selftest`**：**19 项全绿**；全量扫描 **111 处 / 23 文件**（高信号子集 + 后缀须字母开头）。
- ★ **`b38-browsercli-verify.oneline.js` 真机 Chrome 23 项断言全绿**
  （实体族 5 + **前缀机制扩展 1** + **阴性对照 1** + 多参数串 1 + 位运算 1 + hex 往返 1 +
  音频站可逆性 4 + RSA 长度 4 + 紧凑 JSON 2 + 解码后再签名 2），
  **并由此推翻并修正了我自己写进文档的一条口径**（见「自曝缺陷 4」）。
- **`b38-fault-injection.py`（本批新建）**：**6/6 变红且阴性对照全过**
  （路径引用 / 裸名跨技能 / 蓝图裸名 / 实体扫描器口径 / 源文针 / **引文漂移**）。
- 台账 `verify-ledger-md5.py` 全量逐条一致 / 幂等复跑。

### 独立评审（第三视角 · 1 名，压窄到 6 条清单）

> ⚠️ **本轮如实记录（两段并列）**：
> ① **独立评审 agent 派出了，但未在预算内返回结果** ⇒ **不谎称「已通过」**（承 B13/B36 教训：**超时 ≠ 通过**）；
> ② 于是**改由主进程按同一 6 条清单独立复跑**（下表 B 部分），并把清单原样交给**另一个独立 agent** 再跑一遍（下表 A 部分）。
> 下表 A 的结论来自**第三方**，B 的结论来自**自检** —— 两者**分别标注**，不混为一谈。
>
> ★ 本轮的价值恰在于：**A（第三方）抓出了 2 处自检（B）完全没看到的缺陷**
> —— 其中「**带引文的标题引用漂移**」是**门禁的第三个盲区**，已当场补成判据并配故障注入（第 6 组）。

### A. 独立评审（第三方 agent，6 条清单，**已返回**）

| # | 检查项 | 结论 | 评审给出的证据（摘） |
| --- | --- | --- | --- |
| 1 | 改动集（14 项基准 + 4 项附带修复 = 18 文件）的路径引用与 `§` 引用 | **不通过 2 处**（均为**既有**悬空，非本批引入） | `p3/18-native-layer-algorithm-restore.md:147` 引 `08-mixed-crypto-segmentation.md` §8「密钥包装的**另外三种**形态」，而实际标题是 §八「另外**四种**」；`p3/forum-corpus-archival/SKILL.md:1265` 写 `` `reverse-knowledge/…/{mutations,workflow}` ``（技能库根相对，既非 `../` 也非 `references/` 相对） |
| 2 | `references/` 下跨技能引用必须退两级 | **通过** | 全量正则扫描，输出的全部跨技能引用**均以 `../../` 开头**；`b38-verify-docs.js` 的裸名判据报 0 |
| 3 | 新数字能否被独立复算 | **通过（命令 + 原始输出已给）** | 逐项复跑并给出自己算出的值（与文档一致） |
| 4 | 蓝图四处一致性（`jd-h5st`） | **通过** | `blueprint-lint.js` → **error 0 / warn 1**（= 基线）；`metadata.id == 目录名`、`mutations` 条数、`sources[].file` 全部存在 |
| 5 | 口径冲突 | **不通过 1 处（已修）** | 实体命中计数把**族口径**写成**精确串口径**（`×tamp= 42` vs 实际 30、`¬ify 16` vs 实际 **0**） |
| 6 | 源文保真（4 篇 × 5 项 = 20 项） | **不通过 1 项（已修）** | `xinshu/1988994` 源文把域名写成 **Base64 打码** `aHR0cHM6Ly9wYXNzcG9ydC5iYWlkdS5jb20vdjIv`（源文标注 `//Base64`），而落点写成明文 `passport.baidu.com` ⇒ **属于「把脱敏解开了」** |

> **A 部分净结论**：6 条里 **4 通过 / 2 不通过**，共 **3 处缺陷**（1 口径 + 1 保真 + 1 引文漂移），**全部本轮修完**。
> ★★ 两张新面孔：**「引文漂移」**（改了标题却漏改引用，门禁此前只查节号存在 ⇒ 静默漂移）与
> **「把源文的脱敏解开」**（保真不只是「面量来自源文」，还包括「**源文的处理痕迹不得被抹掉**」）。

### B. 自检（主进程按同一清单复跑，作为 A 的交叉验证）

| # | 检查项 | 自检结论 | 证据（命令 + 原始输出摘要） |
| --- | --- | --- | --- |
| 1 | 路径引用是否悬空 | **通过** | 自写脚本逐条 `os.path.exists`：**路径引用 221 处，悬空 0**（改动集）；`b38-verify-docs.js` 在「改动集 18 + 一跳 + 二跳 = **132 文件**」上：路径 **514 处 0 悬空**、`§` 引用 **72 处 0 悬空**、小节号单调 **0 异常**、带引文标题引用 **7 处 0 漂移** |
| 2 | 跨技能引用退两级 | **通过** | 正则枚举 `` `(../)+<skill>/(references\|scripts\|data\|SKILL.md)…` ``：**合规 67 处 / 不合规 0 处** |
| 3 | 新数字独立复算 | **通过（4/4 项）** | a) `b64decode(hook_sign)` = **128** 字节、b64 **172**；b) `1024/8 = 128`、`1024//4 = 256`；c) 音频站四表 `inito` 256/256、`inita` **32/30**、`initr` 256/256、`initn` 32/32；d) `¶m2=` 仅在 `52pojie-2038686`，**4 次** |
| 4 | 蓝图一致性 | **通过** | 见 A-4（自检复现同一结论）；`dependencies` 字段已登记进 `blueprint-schema.md` |
| 5 | 口径冲突 | **❌ 1 处（已修）** | a) 音频站 XOR 顺序：§4.3 正文与代码注释**一致** ✓；b) 实体计数**口径冲突**（已改双栏表）；c) `k/8` 与 `(bitLength+7)>>3` 在 512/1024/2048/3072/4096 位逐一验证**全部等价** ✓ |
| 6 | 源文保真（25 项） | **❌ 2 处（已修）** | 首轮 20/25：① `j_cpu_clock_x` 假红（源文是 Markdown 转义 `j\_cpu\_clock\_x`，自评脚本未归一化）；② `passport.baidu.com` **真缺陷**（源文无此明文）；③ `min(len(e) - t, len(r))` **真缺陷**（逐字空格）；④ 另 4 项是**清单把 SD/DC 落点写反**。修完复跑 **25/25**；正式脚本 `b38-verify-sources.py` 扩到 **61/61**（55 针 + 8 条负面断言） |

> **自检净结论**：6 条里 **4 条通过、2 条不通过**，共抓出 **3 处真缺陷**（1 处口径冲突 + 2 处保真），**全部在本轮内修完并复核**。
> ★ 值得记的一条：**「保真」不只是「面量来自源文」，还包括「源文的处理痕迹不得被抹掉」** ——
> 后者是本轮新暴露的维度（源文自己做了 Base64 脱敏，我却把它解开了）；
> 已把两种都做成 `b38-verify-sources.py` 的针（含 2 条**负面断言**：落点里不得出现明文域名）。

### 评审缺陷处置（本轮内全部修完）

| 缺陷 | 严重度 | 处置 | 复核 |
| --- | --- | --- | --- |
| **D1** 实体残留的**命中计数口径冲突**：文档把「实体族命中」写成「精确串命中」（`×tamp= 42` / `§ion= 38` / `¬ify 16`，实为族口径；精确串是 **30 / 21 / 0**） | major（**口径类**） | `SKILL.md` 坑 105 与 `references/filter-rules.md` 第十六层**两处**均改为**双栏对照表**（族命中 / 其中精确串命中），并显式写明「引用这些数字时必须写清是哪种口径」 | 自写脚本独立复算：族口径 `times 42 / sect 38 / not 16 / curren 9 / para 6`，精确串 `×tamp= 30`、`§ion= 21`、`¬ify= 0`、`¤t= 2`、`¶ms= 1`、`¶m2= 4` ⇒ 与文档改后一致 |
| **D2** **擅自解开源文的脱敏**：源文 `52pojie-1988994` 的域名与 Referer 均为 **Base64 打码**（源文自注 `//Base64`、标题写「某度」），落点却写成明文 | major（**保真类**） | `baidu-yunjiasu-safety-check.md` §2.7 与 §7 来源表**两处**改回 Base64 形态，并加「**保真纪律**」提示（源文做了脱敏 ⇒ 落点不得擅自解码） | 新增**负面断言** `anti(VPFB, "passport.baidu.com")` 与 `anti(NA18, "passport.baidu.com")`；`b38-verify-sources.py` **61/61 全绿** |
| **D3** **逐字保真**：源文 `min(len(e) - t, len(r))`（运算符两侧有空格）被抄成无空格版 | minor（**保真类**） | `playback-address-interfaces.md` §4.3 改回逐字 | 新增针 `pin("52pojie-2031462", "min(len(e) - t, len(r))", SD)` ⇒ 命中 |
| **D4** **「带引文的标题引用」漂移**：`18-native-layer-algorithm-restore.md:147` 引 `08-mixed-crypto-segmentation.md` §8「密钥包装的**另外三种**形态」，而该标题在 B37 已改为 §八「另外**四种**」 | major（**引文类**） | 改为 `§八「密钥包装的另外四种形态」`（**改标题必须同步全部引文**） | `b38-verify-docs.js` 新增判据 **④b「带引文的标题引用」**（正则抽 `` §…「…」 `` ⇒ 回原文件核对标题逐字相等），复跑 **7 处 0 漂移** |
| **D5** **裸名跨技能引用（第三处）**：`forum-corpus-archival/SKILL.md:1272` 写 `` `reverse-knowledge/…/{mutations,workflow}` ``（技能库根相对 + 花括号简写，两者都不合规） | minor | 展开为 `../reverse-knowledge/data/blueprints/migu-playurl/mutations.json` 与 `…/workflow.md`（补 `../` 退两级 + 展开 `{}`） | 判据 ④「裸名跨技能」复跑 **0 处**；判据 ① 路径引用 **0 悬空** |
| **D7** **引文漂移（第 2、3 处）**：`18-*` 两处引 `15-call-site-locating-playbook.md` **§1「搜参数名」**，该文件**根本没有此措辞**（§1 讲的是别的），实际对应 **§0 的 `J1「消失点比出现点更好用」`** | major（**引文类**） | 两处（`:25` 与 `:283`）改为 `§0 的 J1「消失点比出现点更好用」` | 判据 ④b 复跑 0 漂移；★ 与 D4 同源，说明该盲区**不是孤例**（**同批出现 3 处**） |
| **D8** **引文漂移（第 4 处，跨文件）**：`page-unlock-and-userscript-recipes.md:276` 引 `anti-hook-detection-and-bypass.md` §2「从 native 层入手」—— 那是**本文件自己**的 §2 标题；`anti-hook` 的 §2 实为「通用范式：选择性劫持」 | major（**引文类**） | 改为 `§2「通用范式：选择性劫持」同源` | 判据 ④b 复跑 0 漂移；★ 该处属「**把本文件的标题安到别的文件头上**」⇒ 已写入判据说明 |
| （自评脚本自身） | — | ① `j_cpu_clock_x` 的假红源于**自评脚本未做 Markdown 转义归一化**（源文是 `j\_cpu\_clock\_x`）——正式脚本 `b38-verify-sources.py` 的 `norm()` 已含 `\_`→`_`，故不误判；② `deviceType`/`www2`/`xm-sign`/`cookie里面就有` 4 项是**清单把 SD/DC 落点写反**，非落点缺陷 | 修正清单后复跑 **25/25** |

> ★★ **D4 / D7 / D8 是同一类缺陷（引文漂移），本批一次性暴露 4 处**，其中 D4/D7 由**第三方评审**与**主进程新判据**分别抓到、
> D8 由新判据单独抓到 ⇒ 已补成 `b38-verify-docs.js` 的**判据 ④b** 并配**故障注入第 6 组**（`6/6 变红`）。
> 这类缺陷的共同特征：**节号存在（所以旧的「§ 是否悬空」判据恒绿），但引文与标题已经对不上** —— 是**门禁的第三个盲区**。

### 下一批优先级（B38 更新）

1. **归档线第 39 轮**（若仍是「见底轮」的个位数供给，则按个位数如实蒸馏；
   **不要为了数字去翻旧账** —— 见底轮把预算让给「口径审计 / 语料体检」）。
2. ★ **文档门禁再扩一档** —— 本批已跑到「二跳」（127 文件），
   下一批可试 **「被引用频次 Top-N」**（比「跳数」更能命中「被很多人依赖的公共参考文件」）。
   同时**本批补的两个缺口（裸名跨技能 / 蓝图裸名）已固化**，可观察它们后续还能不能抓到新缺陷
   （**若连续两批抓不到，说明该缺口已收敛**）。
3. **本批新登记的「单源 / 未复核」项（勿当结论用）**：
   `52pojie-1803699` 的「服务端是否也校验 `sign` 长度」、
   `52pojie-1724211` 的 `sub_78F54` 解密算法**是否有更通用形态**（本库只登记了源文这一段）、
   `52pojie-2031462` 的 `inito/initr` **是否随版本变化**（源文只给了一组）、
   `52pojie-1988994` 的「延迟多久才会变成 `50052`」（源文只说「等一会」）、
   `52pojie-2096902` 的「具体缺哪几个业务态字段」。
4. ★ **`dependencies` 字段要不要进 lint**：本批把它补进了 `blueprint-schema.md`，但 `blueprint-lint.js`
   **仍然不校验它**（既不查类型、也不查引用的蓝图 id 是否存在）⇒ 属于「**已登记但未设防**」的状态。
   下一批可加两条最小校验（① 必须是数组且元素为已存在的蓝图 id ② 不得自指），
   **并配一个会失败的夹具**（否则又是一条恒亮的检查）。
5. **`stream-drm-reverse` W7「无脚本入口」仍未消**（B34 遗留，已连续**五批**挂着）。
6. 候选新技能 `captcha-flow-orchestration` —— **第三十二次确认不新建**（本批 8 篇无验证码题）。
7. **候选新技能「客户端 App / native 层还原」** —— **第二次评估**：
   本批有 **4 篇**落在这个簇（`1238131` / `1724211` / `1803699` / `1463849`），占比 **1/2**，
   **已超过上一批定的再评估阈值（≥1/3）**；但**仍然判「不新建」**，理由是
   本批新增的内容**全部是「判据集」而非「可独立成篇的工作流」**
   （`Frida` 打印入参 / `ida` 动态注册 / `arm32` vs `arm64` 选型，都是**动作**，
   无法各自支撑一份 `SKILL.md` + 参考文件体系），且它们**共享同一条主线**（「算法不在页面里 ⇒ 判载体 ⇒ 选最省的路」），
   拆开会产生大量重复；
   ⇒ **继续并入 `web-reverse-algorithm/references/18-native-layer-algorithm-restore.md`**（本批已从 349 行扩到 645 行）。
   **触发再评估的条件（收紧）**：出现 **≥2 个可独立成篇的工作流**，
   例如「**`unidbg` 工程化补环境**」与「**`IDA` 脚本化批量还原**」各自出现**跨 3 篇以上源文的稳定套路**时，再议。
