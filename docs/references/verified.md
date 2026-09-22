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