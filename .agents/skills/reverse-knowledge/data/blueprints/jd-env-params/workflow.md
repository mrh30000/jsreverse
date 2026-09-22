## 入口与传输

- 生成位置: (a) 2022 试用页：参数8 `g=v[t(0, 1269, 0, 1201)][t(0, 1121, 0, 1110)]()`；expandParams 为 `c = e[o(1191, 0, 1170)]`（即 e.env）。(b) 2024 js_security_v3_0.1.6：`t` 来自 `V = t["sent"]`，在 Promise case5→case8 区间最后一次 `t["abrupt"]("return", xxx)` 处。(c) 2025 v5.2.0：设备参数定位处 `_$Gy.parse(unescape(encodeURIComponent(_$Gd)))`
- 触发时机: 签名时（每次请求都重新采集/加密）
- 传输方式: 作为 h5st 的第 8 段嵌入 h5st 字符串；2022 版另有独立请求参数 `expandParams`

## 排查步骤

1. 全文搜 `sua`（1913553 提供的方法）或 `_$Gy.parse(unescape(encodeURIComponent(_$Gd)))`（2052845 提供的定位点）找到环境串的组装处。
2. 确认版本：看 v 字段（如 `h5_file_v5.2.0`）或 js 文件名（如 js_security_v3_0.1.6.js）。
3. 2025 v5.2 路线：断点取 `_$Gd`（明文 JSON）与最终 `device_data`，按 8 步流水线（parse → WordArray→uint8→普通数组 → pad 到 3 的倍数 → 每 3 个分组反转 → 回 WordArray → 自定义 base64(stringify1) → 每 4 字符反转）复现，逐步骤对拍。
4. 2024 路线：在 `__genSignParams` 附近找 `V = t["sent"]` 的生成处，读出 AES key "&d74&yWoV.EYbWbZ" 与 iv 0102030405060708，用 AES-CBC + hex 复现。
5. 2022 路线：断点 `g=v[t(0, 1269, 0, 1201)][t(0, 1121, 0, 1110)]()`，从 hex 解出 key/iv，再解参数8明文。
6. 采集字段时逐项对齐 extend 的原始逻辑（尤其 l、wk、bu2、bu4），不要按常识改写。

## 算法口径

- 家族: `symmetric`
- 细节: 三套版本各不相同：(1) 2022 试用页第8段与 expandParams = AES（key/iv 由 hex 解码得到），密文输出 hex；(2) 2024 js_security_v3_0.1.6 的 t = AES 加密环境串，key 为 "&d74&yWoV.EYbWbZ"，iv 为 ["01".."08"].join("")，密文输出 hex；(3) 2025 h5_file_v5.2.0 第8段 = CryptoJS WordArray → UTF-8 字节数组 → 填充到 3 的倍数 → 每 3 个元素一组并反转组顺序 → 自定义字符表 Base64 → 每 4 个字符反转
- 密钥/常量: `iv（三处一致）= `0102030405060708`；key（2022，原文逐字）= `wm0!@w_s#ll1flo(`（同篇另一处写作 `wm0!@w-s#ll1flo(`）；key（2024）= `&d74&yWoV.EYbWbZ`；自定义 base64 字符表（5.2，逐字）= `hgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA-_9876543210zyxwvutsrqponmlkji``
- 输出编码: hex（2022 第8段/expandParams、2024 t）或 自定义字符表 base64（2025 v5.2 第8段）
- 输出长度: 2025 v5.2 第8段实测 792 字符（对应 593 字节 JSON 填充到 594 字节后编码）；hex 版本长度文章未给

## 自算核对（源文章数字重算结果）

- 自定义字符表长度核算 = 64 字符（hgfedcba 8 + ZYXWVUTSRQPONMLKJIHGFEDCBA 26 + `-_` 2 + 9876543210 10 + zyxwvutsrqponmlkji 18），且无重复字符 → 是一张合法的一对一 6-bit 表
- 第7步输出长度 792，第8步输出长度 792，两者相等（每 4 字符反转不改变长度）
- 我独立验证 `rev4(第7步) == 第8步`（把第7步串每 4 个字符反转后与文章第8步输出逐字相同）→ 该文章第 7→8 步流水线可复现
- 第8步输出全部字符均落在自定义字符表内，且不含 `=` 填充符，与字符表长度 64 自洽
- 第0步 JSON 的 UTF-8 字节数实测 = 593，593 % 3 = 2 → 按第4步『填充到 3 的倍数』补 1 字节得 594；594/3*4 = 792，与第7步输出长度 792 完全吻合 → 整条流水线（含 pad 步骤）自洽
- 1669042 的 fp `4975599160384842` 为 16 位数字；2052845 的 fp `gta93wizm0httth5` 为 16 位字母数字 → 两版 fp 形态不同（长数字 vs 短随机串），属版本差异

## 来源之间的矛盾

- docs/references/52pojie-1669042-京东试用h5st参数.md:54 vs docs/references/52pojie-2052845-某东最新5.2版本的第8段环境参数加密逆向解析.md:80 —— 第8段是否固定：1669042（2022）称『判断参数8几乎为固定的』，明文只有 sua/pp/fp；2052845（2025-08，v5.2.0）第8段含 extend.random/顶层 random/canvas/webglFp 等每次都变的字段（判定: 版本差异 + 低置信。两篇不是同一版本（2022 4.x vs 2025 v5.2.0），无法判定 1669042 的结论在 5.2 是否成立；但从 5.2 的字段看不可能『固定』，使用时必须以当次采集值为准）
- docs/references/52pojie-1669042-京东试用h5st参数.md:48 vs docs/references/52pojie-1669042-京东试用h5st参数.md:106 —— 同篇环境段 AES key 出现 `wm0!@w_s#ll1flo(` 与 `wm0!@w-s#ll1flo(` 两种写法（判定: 无法判定（详见 jd-h5st 同名条目））

## 明确留白（原文未给出，不要臆测）

- 2022/2024 两版 AES 的密文 hex 长度与是否含 padding（PKCS7 等）文章未说明
- AES 是 CBC 还是 ECB 文章未逐字写（只给了 key 与 iv，按有 iv 推断为 CBC，但文章未明说，故 detail 中不写死模式）
- extend 中 bu5/bu6/bu7/bu8/bu10/bu11/bu12/bu13/ccn 的语义文章未说明
- 5.2 版第8段是否还有除明文 JSON 外的其他拼装（如前后缀、时间戳）文章未说明
- 5.2 版 `stringify1(device_init, 0)` 的第二个参数 0 的含义文章未说明
