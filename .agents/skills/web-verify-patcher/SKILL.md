---
name: web-verify-patcher
description: "网页验证码识别、方案选择与授权验证流程分析技能。当用户询问验证码识别、验证码类型、这是什么验证码、验证码方案、风控验证、WAF challenge、captcha recognition/type，或提到滑块/拼图、点选/文字点选/九宫格/图标点选/语序点选、旋转滑块/手势验证码、数字/算术、GIF 动图、语音、拖放、轨迹绘制、刮刮卡、图像复原、切片/分块乱序、图片分割、瓦片重排、区域/面积选择、找茬、字体识别、空间语义、小游戏、PoW/工作量证明、无感/无痕/风险评分、一键/checkbox、多轮、问答、活体/人脸，或提到极验、易盾、腾讯云 turing、360 天御、阿里云、数美、顶象、百度、京东云、云片、螺丝帽、安居客、房天下、当当、同花顺、东方财富、快手滑块、v5/verify5、vaptcha、雷池 SafeLine、reCAPTCHA、hCaptcha、Turnstile、AWS WAF、DataDome、Arkose/FunCaptcha、Akamai、Imperva、PerimeterX/HUMAN、Kasada、ALTCHA/FriendlyCaptcha 等国内外验证码/风控厂商时使用。用于识别验证码产品、输出方案，并在用户确认后编排离线求解、坐标换算、用户手动成功样本基线采集、轨迹生成、模型训练、打码平台请求模板、失败复盘/方案切换和授权验证测试；打开真实网页时按 ruyiPage/Camoufox/CloakBrowser 取证模式。当需要拆解具体厂商的提交参数与交互链路（如极验 v3/v4 的 gt/challenge/w/td/td_sign/pow、易盾推理拼图 token/data.*、顶象 c1/a/v1、腾讯防水墙 cap_union 的 ua/sess/collect/eks/vData、Akamai sensor_data、阿里云验证码 2.0、快手 verifyParam/x|y|Δt 轨迹容器、九宫格 cookie 状态机（bf.js/s.webp/sbxf）、抖音 s_v_web_id、点选四头（authKey/pointJson/Sign/Token/Uuid）、ck0. 无感 token），或排查「底图还原正确但提交坐标对不上」「验证通过却登录失败」「以前能过现在过不去」这一类问题时，也必须使用本技能。"
---

# Web Verify Patcher（网页验证码识别与验证方案分析）

使用这个技能分析网页验证码或网页验证材料，输出安全、可落地的“识别 + 厂商判断 + 验证分析方案 + 授权验证流程”。第一阶段做类型/厂商识别和方案选择；真实网页取证时先建立用户手动成功样本基线；第二阶段只在用户明确选择方案并确认授权后，编排离线求解、坐标/轨迹生成、平台请求模板、失败复盘、方案切换或授权验证测试。

## 工作流程

1. 优先基于用户已提供的离线证据分析：HTML 片段、脚本 URL、iframe URL、页面可见提示文案、截图元信息、厂商参数名、网络接口名。
2. 如果必须打开真实网页取证，先读取 `references/browser-acquisition.md`，并按其中的取证模式执行；需要通过 browsercli / Worker 采集证据时，同时读取 `../ast-deobfuscation/references/browsercli-tools.md`。browsercli 只是已确认浏览器模式的控制面，不是新的取证模式。启动任何浏览器前先让用户确认模式：ruyiPage + RuyiTrace、仅 ruyiPage、Camoufox + camoufox-reverse-mcp、仅 Camoufox、CloakBrowser（browsercli / Worker 控制需单独确认能力差异）、用户手动取证或 AI 自行决定。用户未确认前，不要打开页面、截图、抓包、注入 Hook、读取 Cookie/Storage 或启动任何浏览器工具。
3. 打开网页时不要直接使用普通 Playwright、Puppeteer、系统浏览器或 CDP 路线；使用 browsercli 时，只能在用户已确认的 Worker 浏览器模式和连接状态下调用被动取证工具，不能用默认浏览器连接替代已选模式，也不能把 `browsercli browser connect --cloak true` 等同于 CloakBrowser 官方包装器的 `humanize` 路线。已选模式不可用时，暂停并让用户确认安装、提供路径、降级或切换，不要静默 fallback。验证码、登录、MFA 或设备验证出现时暂停，让用户手动完成或改为离线分析；授权取证时让用户多次手动完成验证码成功样本，用 `scripts/evaluate_success_baseline.py` 判断成功基线是否足够。
4. 用现有证据运行离线分类脚本：
   - `python scripts/classify_verify.py --html page.html --url "https://example.test/login" --text "拖动滑块完成拼图" --pretty`
   - `--html`、`--text`、`--screenshot-meta` 既可以传文件路径，也可以直接传字符串。
5. 得到初步分类后，再按需读取参考文件：
   - 需要判断厂商/产品特征时读 `references/provider-products.md`。
   - 需要判断验证码形态和证据要求时读 `references/captcha-types.md`。
   - 需要按类型给方案时读 `references/solution-playbooks.md`。
   - 初步判为点选类（`click-select`）时，**紧接着读 `references/click-select-and-order.md`**：
     子类判据（文字/图标/语序/图文/空间语义）、题目→坐标的匹配与指派、语序还原、坐标生成都在那里，
     配两个零依赖脚本 `scripts/assign_by_similarity.py`、`scripts/order_restore.py`。
   - 初步判为 `slider` / `image-restore` 时，**先跑 `references/slider-vendor-matrix.md` 的判据器定厂**：
     `python scripts/slider_vendor_identify.py --fingerprint <file|-> --markdown`（返回 `unknown` 时读该文件 §5 证据补齐表），
     再按命中的小节读该厂商的链路与配方。
   - 需要打开真实网页、截图、抓包或采集页面证据时读 `references/browser-acquisition.md`。
   - 已确认使用 browsercli / Worker 采集 CAPTCHA 状态、截图、DOM、网络或脚本证据时读 `../ast-deobfuscation/references/browsercli-tools.md`。
   - 如果 `image-restore` 命中 `captcha_variant: tile-scramble`，先用 `scripts/analyze_tile_restore.py` 判断是否是切片/分块乱序图，再分析 `tileOrder`、`pieceOrder`、`background-position`、`drawImage` 或纯图片边缘连续性。
6. 用户从 `solution_options` 中选择方案并明确确认后，进入第二阶段：
   - 总流程必须读 `references/verification-workflow.md`。
   - 使用开源/本地方案时读 `references/open-source-recipes.md`。
   - 使用打码平台时读 `references/solver-platform-recipes.md`。
   - 需要坐标换算、滑块/拖放/刮刮卡/轨迹绘制时读 `references/motion-and-coordinate.md`，优先用 `scripts/map_coordinates.py` 和 `scripts/generate_motion_track.py` 生成离线结果。**旋转/弧线滑块（`rotate = attrs × 视觉偏移`、轨迹点到缺口的最小距离选目标）、各厂商轨迹字段对照（`i/ud/wi` 距离、`gq/mv/th` 轨迹、`vs/gk` 时间）、以及「格式化或改写 JS 后提交必失败」也在该文件。B19 新增「轨迹格式与变异」节：各厂商的**容器形态**（对象以 x 为 key / 三元组数组需抽稀 / pipe 串 / `x,y,t:` 串）与**轨迹点变异**（快手 `sx/sy/ix/iy` 与 `q/a/d`）都在那里。**
   - **B23 新增「轨迹容器与时间校验」小节 + `scripts/trajectory_codec.py`（`--selftest` 24 项）：**
     已把两族容器做成可复现编解码 —— **快手 `x|y|Δt` 逗号串**（原始值带前导逗号、提交前 `.slice(1)`、
     `Δt` 相对**整条轨迹起点**而非相邻点、仅取最后 100 点）与 **阿里云 TrackList**（`mc`/`mp`/`mm`/`si`
     与 `TrackStartTime`/`VerifyTime`/`arg`，`si` 语义未明一律透传）。**服务端会做轨迹时间一致性校验**
     （轨迹耗时 1s 就不该在 0.1s 后提交）—— 容器对不上或时间对不上，症状都是"不报错只失败"。
   - **切片乱序底图还原、顺序数组语义判定（正/逆置换）、视觉坐标与提交坐标换算（固定偏移 / `speed` / CSS 缩放）时，必须读 `references/tile-scramble-and-coordinate-mapping.md`，并用 `scripts/restore_slices.py` 做还原与语义判优。`--model grid` 是均匀网格通用几何（顶象 / 接口下发数组）；带间隙的专用几何（如极验 v3 的 26×2 片、源 stride 12）用 `--model gt3`。**
   - **需要训练验证码识别模型（YOLO 标注训练闭环、自举标注、切片拼接、去噪、计算题按 x 排序求值、空间语义题保留全部候选再按题面筛）、用遗传算法还原真拼图，或用「特征提取 + 余弦相似度」做九宫格/图标点选这类**每轮内容都不同、无法分类**的题时，读 `references/captcha-model-training.md`（九宫格/图标点选的**特征相似度**路线见其 §八，**与 §四 的分类路线是两类不同的题**）。**
   - **点选类（文字 / 图标 / 语序 / 图文 / 空间语义）要判子类、把题目匹配到坐标、还原语序、生成点击坐标时，必须读 `references/click-select-and-order.md`，并用 `scripts/assign_by_similarity.py`（相似度矩阵的贪心/匈牙利指派，含 top1–top2 分差门槛）与 `scripts/order_restore.py`（词频表 + `len² × log(freq+1)` 打分做语序还原）。**语序点选把"题面顺序"当"提交顺序"会静默失败**；重复目标未从可用池移除会让同一坐标返回两遍。**
   - **拆解极验（某验）全家的提交参数与交互链路时，必须读 `references/geetest-protocol-matrix.md`。**覆盖：**初代 / 二代（在线 / 离线，没有 `w` 只有 `validate`）**、v3 三个 `w` 的分工与七步链路、v4 `load`/`verify` 两接口、`w`/`td`/`td_sign`/动态键名防篡改块、**无感（一键通过 `ai`）模式同一个流程里的两个 `w`**、v3 52 片底图几何与轨迹 `aa` 编码、九宫格协议、**消消乐 `match` / 五子棋 `winlinze` 的 `ques` 语义（按列不是按行）**、**PoW 的三种哈希与 `bits` 难度判据（写死 md5 会失败）**、**报错码 → 根因速查表**、深知 V2 业务风控。PoW 用 `scripts/geetest_pow.py`（`--selftest` 41 项，支持 `solve` / `check` / `--from-load`）。排查「验证通过却登录失败」「三个 `w` 有一个不对就 forbidden」「四代报 `param decrypt error`」时同样先读这一份。
   - **拆解腾讯防水墙/TCaptcha 的提交参数与链路时，必须读 `references/tencent-tcaptcha-protocol.md`**：
     `cap_union_*` 旧形态的五个参数（`ua` = base64(UA)、`sess` 来自 prehandle、`collect` = `TDC.getData()`、
     `eks`、`vData` 由 `XMLHttpRequest.prototype.send` 重写注入）、TDC 的 37 段拼接与魔改 TEA（`>>`→`>>>`）、
     `vData` 的「填充 → 打乱 → TEA → **自定义 base64 码表**」四步、以及站点适配层五请求链与 `csrf-token` 两步法。
     **「`collect` 明文的数组顺序一个滑块一个样，不要按固定下标伪造」与「`vData` 解出乱码先怀疑自定义 base64」
     是这一家最高频的两个坑。**
   - **判为 `slider` / `image-restore` 但既不是极验、也不是腾讯防水墙老形态（`cap_union_*` 五参数 + `vData`）时，必须读 `references/slider-vendor-matrix.md`**：
     21 篇来源蒸馏出的 **17 族厂商对照**（腾讯云 turing / 360 天御 / 数美 / 云片 / 螺丝帽 / 安居客 / 房天下 / 51.com /
     乐某 / 当当 / 同花顺 / 东方财富 / v5(WS) / 雷池 / 阿里 227 / 快手 / 异型拼接），每族固定四段：**链路 → 参数配方 → 图片几何 → 该家专属坑**，
     另含 §4 跨厂商共性 8 条、§5 证据补齐表、§6 反例黑名单。先用
     `python scripts/slider_vendor_identify.py --fingerprint <file|-> --markdown` 定厂（返回 `unknown` + 退出码 3 是**正常结果**，不是失败），
     再只读命中那一节。**站点自研一律按 `site-<域名>` 记名，不要硬套别家字段名。**
     三条最容易踩的：① `gt_cut_*` **不等于**极验（51.com 用同一套 HTML 布局，协议完全不同）；② **函数名不可信**（螺丝帽的 `SHA3` 实为 AES）；
     ③ **格式化 / 改写 JS 后提交必失败**（数美 `isJsFormat`、阿里 227、雷池）。
   - **判为 `rotate`，或判为 `trace-draw` 且交互是「在图上描一笔」（`captcha_variant: gesture-draw`）时，
     必须读 `references/rotation-and-gesture-protocols.md`**：
     旋转系（百度 `mkd.js`(v1) / `mkd_v2.js`(v2) 的代际判据与两套接口名、`rzData` 两代结构、
     `ac_c` 两代分母、小红书 `redcaptcha` 两接口）+ 手势系（VAPTCHA 四段链 `{vid}`→`config`→`get`→`validate`、
     `en` 的 11 项加和与 `splicingObj` 排序口径、图片 5×2 还原与 `Decrypt` 减法、
     轨迹 **+30 px 补偿**与 **间隔 < 5 不入列**、`validate` 返回码表）。
     角度识别侧（插值伪影 / 鬼影 / 双旋咬合互相关）在同文件 §2.1。
     换算与还原用 `scripts/rotation_and_gesture_calc.py`（`baidu-ac-c` / `vaptcha-order` /
     `vaptcha-restore` / `murmur3`，`--selftest` 27 项）。
   - **链路里出现「提交参数 + 签名头」形态（无感/无痕、`SignatureNonce`/`Signature`/`SignatureMethod=HMAC-SHA1`、
     `Action=InitCaptchaV2`/`Log2`/`VerifyCaptchaV2`、`deviceconfig`、`CaptchaVerifyParam`、`sbxf`/`bf.js`/`s.webp`、
     `s_v_web_id`、`verifyParam`、`authKey`、`pointJson`、`ck0.`/`x-captcha-token`/`x-device-id`、四头
     `Sign`+`Token`+`Uuid`+`Cookie`）时，必须读 `references/behavior-verify-and-sign-headers.md`**：
     无感/滑块/点选**防御等级不同**（无感不发 `d`/`b` 包、点选最严）、阿里云验证码 2.0 的四请求链与
     `deviceconfig`→`Data` 依赖、快手 `verifyParam`、抖音 `s_v_web_id` 的"能自造但不能用于评论"、
     九宫格 cookie 状态机（`_trackId`→`bf.js`→`s.webp`×2→`sbxf`）、点选 `sign` 与业务四头的关系、
     以及**正确率四因素（请求头完整性 / `callback` 随机范围 ≤10 / `fp` 必须对应站点域名 / 发送间隔）**。
     该文件同时明确"**只有结构是观测事实时只登记结构**"（`ck0.` 一例）与"本地 `verified=true` ≠ 服务端认可"。
   - 需要厂商执行注意点时读 `references/provider-execution-notes.md`（含百度旋转验证码的代际判据与三条高频坑、数美/树美的 DES-ECB 与格式化检测、同盾自有 base64 变体、aj-captcha 的 `pointJson`、腾讯六宫格 AI 图、GIF 动图验证码）。
   - **判为 `waf-challenge` 且「无图无交互、只有准入 Cookie 链」时，先分流再动手**：定族用 `node ../web-js-env-patcher/scripts/classify_edge_challenge.js --html <页面> --status <码> --cookies <Set-Cookie> --markdown`；判层与链路读 `../web-js-env-patcher/references/edge-waf-cookie-challenge.md`，可离线求解读 `../web-reverse-algorithm/references/10-waf-clearance-cookie.md`。**这类目标不属于本技能的 Phase-2 流程**（没有图片、没有人工成功样本基线）。
   - 进入真实网页验证前，先评估用户手动成功样本基线：默认同一授权目标至少 5 次成功样本；若观察到新的验证码类型，该类型至少 2 次成功样本。基线不足时输出强提示，但用户确认后仍可继续离线分析或受控验证。
   - 同一授权目标、同一验证码类型、同一用户选择方案出现连续失败时，用 `scripts/evaluate_verification_attempts.py` 复盘 attempts JSON；连续 5 次失败且图片/坐标/轨迹/切片还原/补环境/challenge 新鲜度均无明显异常时，主动建议 `recommended_next_route: platform-control`。
   - 真实页面点击、拖动、提交或抓取 Cookie/Storage 前必须再次让用户确认授权目标、执行模式和浏览器取证模式。
7. 输出报告时必须包含：
   - `captcha_type`
   - `provider`
   - 置信度和命中的信号
   - 为什么判断为该类型/厂商
   - 推荐方案：先给开源/本地方案，再给低通过率时的打码平台或人工/厂商备选，最后说明切换条件
   - 关键风险和缺失证据
   - 第二阶段执行时还必须包含：用户选择的方案、执行前检查结果、是否需要真实网页操作、需要用户确认的动作、产物路径或 JSON 结果
   - 真实网页取证或第二阶段执行前还必须包含：`success_baseline_status`、`success_baseline_summary`、`missing_success_samples`
   - 第二阶段失败复盘时还必须包含：`attempt_summary`、`diagnosis_status`、`switch_triggered`、`recommended_next_route`、`platform_control_plan`、`requires_user_confirmation`

## 分类标签

使用这些固定类型标签，便于脚本和报告保持一致：

> **本清单不是权威源，权威源是 `references/captcha-types.md`（判断表 + 类型说明），
> 本清单与 `references/solution-playbooks.md` 的类型小节都由它派生。**
> 三处清单必须保持一致——改任何一处后用
> `python scripts/check_verify_docs_consistency.py --markdown` 做机械校验
> （检查集合一致、顺序一致、无新增/缺失），不要靠人眼比对。

- `text`：文字、数字、字母数字混合或简单图片验证码。
- `math`：算术验证码，需要先 OCR 再解析表达式。
- `slider`：滑块/拼图验证码，需要识别缺口或目标偏移。
- `click-select`：点选文字、图标、物体或按顺序点击目标。
- `rotate`：旋转图片或物体，使其转正或对齐。协议见 `references/rotation-and-gesture-protocols.md` §2。
- `grid`：九宫格或多宫格图片分类验证码。
- `audio`：语音/音频验证码，需要识别播放内容。
- `drag-drop`：拖放物体到目标区域，不等同于单纯滑块。
- `trace-draw`：轨迹绘制、连线或画线验证；手势绘制（在图上描一笔）补 `captcha_variant: gesture-draw`，协议见 `references/rotation-and-gesture-protocols.md` §3。
- `scratch`：刮刮卡式验证，需要刮开或覆盖指定比例。
- `image-restore`：图片/图像复原、乱序拼图、滑动还原；切片/分块顺序打乱时保留主类型，并补充 `captcha_variant: tile-scramble`。
- `area-select`：框选、圈选或选择图片区域。
- `difference-click`：找不同、找茬或点击差异点。
- `font-identify`：选择相同/不同字体或字体样式识别。
- `semantic-reasoning`：空间语义、视觉关系或逻辑图片题。
- `game-challenge`：小游戏、3D、骰子或 Arkose/FunCaptcha 类交互题。
- `pow-challenge`：工作量证明/浏览器计算挑战，如 FriendlyCaptcha、ALTCHA、Cap.js、mCaptcha。
- `risk-score`：无感、无痕、隐形或风险评分验证，如 reCAPTCHA v3 类。
- `one-click`：一键、checkbox、按住或点击完成验证。
- `multi-step`：多轮、多步或分页挑战；优先同时记录具体子类型。
- `qa-logic`：问答、逻辑题或安全问题式验证码。
- `biometric-liveness`：活体、人脸或生物识别验证；只做边界清晰的识别和合规建议。
- `token-widget`：基于 `sitekey`、`pageurl`、`action` 的组件，如 reCAPTCHA、hCaptcha、Turnstile，当前未展示具体图片题。
- `waf-challenge`：反自动化/WAF 验证，常见输出是 clearance cookie、WAF token、PoW 结果或环境检查结果。

  **归入本类型后先分形态，再决定要不要留在本技能**：

  - **无图、无交互、无人工成功样本基线的准入 Cookie 链**（首访 403/412/429/503/521/202 + clearance cookie，
    形态是「JS challenge → 算出 cookie → 重新请求」）⇒ **不走本技能的 Phase-2 流程**，
    改读 `../web-js-env-patcher/references/edge-waf-cookie-challenge.md`（判层与链路）
    与 `../web-reverse-algorithm/references/10-waf-clearance-cookie.md`（可离线求解）。
  - **有图 / 有交互 / 需要人工基线的挑战**（Turnstile 的 checkbox、AWS WAF 的 `grid`、`px-captcha` 等）
    ⇒ 留在本技能，按 `one-click` / `grid` / `slider` 等对应子类型走 Phase-2。
  - **同一站可能叠两家**（边缘 WAF + 站点自研风控 SDK）：只过一层仍然失败，不要把「过了一层」当完成。
- `unknown-custom`：自研、未知或证据不足。

使用这些固定厂商标签：

- `recaptcha`、`hcaptcha`、`cloudflare-turnstile`、`cloudflare-waf`、`geetest`、`tencent-tcaptcha`、`netease-yidun`、`aliyun-captcha`、`shumei-captcha`、`dingxiang-captcha`、`baidu-captcha`、`xiaohongshu`、`vaptcha`、`jdcloud-captcha`、`yunpian-captcha`、`huawei-captcha`、`tongdun-risk`、`aws-waf`、`datadome`、`arkose-funcaptcha`、`mtcaptcha`、`keycaptcha`、`friendlycaptcha`、`altcha`、`yandex-smartcaptcha`、`captchafox`、`prosopo-procaptcha`、`trustcaptcha`、`private-captcha`、`capjs`、`mcaptcha`、`iconcaptcha`、`botdetect`、`securimage`、`visualcaptcha`、`amazon-captcha`、`cybersiara`、`aj-captcha`、`tianai-captcha`、`easycaptcha`、`happycaptcha`、`kaptcha`、`akamai-bot-manager`、`imperva-incapsula`、`perimeterx-human`、`kasada`、`netacea`、`radware-bot-manager`、`f5-bot-defense`、`custom-or-unknown`。

## 输出格式

面向用户输出时建议使用这个结构：

```json
{
  "captcha_type": "slider",
  "captcha_variant": null,
  "variant_confidence": null,
  "restore_strategy": null,
  "tile_restore_evidence": [],
  "provider": "geetest",
  "confidence": 0.91,
  "signals": ["命中 geetest 脚本 URL", "命中 captcha_id 参数", "页面文案包含滑块/拼图"],
  "recommended_playbook": "references/solution-playbooks.md#slider",
  "solution_options": {
    "open_source_first": ["ddddocr slide-match/slide-comparison", "OpenCV 模板/边缘/差分匹配", "轨迹模型与坐标校准"],
    "fallback_platforms": ["云码/JFBYM 滑块类型", "超级鹰滑块/坐标类型", "CapSolver", "2Captcha GeeTest/slider 类任务"],
    "when_to_switch": ["缺口弱边缘", "背景乱序/透明块", "厂商行为评分导致视觉偏移正确但验证失败"],
    "notes": "视觉偏移、DOM 坐标、拖动轨迹和厂商加密参数要分开分析。"
  },
  "summary": "疑似极验滑块验证。建议重点分析图片提取、缺口/偏移识别，以及授权测试流程中的参数绑定关系。",
  "missing_evidence": ["挑战区域 HTML", "背景图/滑块图 URL", "verify 接口名"]
}
```

默认优先建议开源/本地方案，例如 ddddocr、OpenCV、Tesseract、Whisper/faster-whisper、YOLO/CLIP/VLM；当开源方案样本通过率不足、题型过于复杂时，再建议用户自行选择打码平台或人工接管，例如云码/JFBYM、超级鹰、2Captcha、CapSolver、CapMonster Cloud、Anti-Captcha、YesCaptcha/NoCaptchaAI。不要替用户执行提交、token 注入或未授权绕过。

第二阶段执行计划建议使用这个结构：

```json
{
  "phase": "verification-flow",
  "chosen_solution": "open-source-slider",
  "authorization_scope": "用户确认的自有/授权测试目标",
  "preflight": ["证据足够", "依赖可用", "不需要真实网页操作"],
  "success_baseline_status": "insufficient",
  "success_baseline_summary": {
    "total_success_samples": 0,
    "min_total_success_samples": 5,
    "min_success_samples_per_type": 2,
    "observed_captcha_types": []
  },
  "missing_success_samples": [],
  "offline_steps": ["识别缺口偏移", "换算 DOM 坐标", "生成滑块轨迹 JSON"],
  "requires_live_browser": false,
  "attempt_summary": null,
  "diagnosis_status": null,
  "switch_triggered": false,
  "recommended_next_route": "continue-current-route-with-diagnostics",
  "platform_control_plan": {
    "role": "授权 QA 对照，不默认发送请求",
    "send_request": false
  },
  "requires_user_confirmation": ["如需在真实页面拖动并提交，必须再次确认"],
  "artifacts": ["offset/coordinates/track JSON"]
}
```
