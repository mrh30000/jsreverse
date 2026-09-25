## 入口与传输

- 生成位置: 小程序包 sheeps.js（wxapkg 解密 + wxappUnpacker 解包后可见）；**账号链不需要包**，从页面拿 uid 即可
- 触发时机: 地图加载（map_info_ex）/ 游戏结束（game_over_ex 或更早的 game_over）/ 每日话题（topic_game_over）
- 传输方式: 请求头 t（**登录态凭据；两篇口径未对齐**：1692161 称「账号信息」、1689437 直接填登录接口返回的 token，见「明确留白」）；GET query：matchType=3 或 rank_* 五参数；POST body：JSON（rank_score 等 + MatchPlayInfo + MapSeed2 + Version）

## 排查步骤

### A 线 · 账号与次数（「免抓包」路径，`52pojie-1689437`）

1. **拿 uid**：源文原话「在页面获取 uid 填写到下面代码中」⇒ **不需要抓包**，页面里就有 uid
2. **uid → 用户资料**：`GET https://cat-match.easygame2021.com/sheep/v1/game/user_info?uid=<uid>&t=<JWT>`
   ⇒ 取 `data.wx_open_id` / `data.nick_name` / `data.avatar`
3. **用户资料 → token**：`POST https://cat-match.easygame2021.com/sheep/v1/user/login_oppo`
   body（form）：`{uid: <wx_open_id>, nick_name, avatar, sex: 1}` ⇒ 取 `data.token`
4. **token 进 header**：`headers['t'] = token`
   （**这是 A 线的产物**；B 线一直说的「header t」在 A 线里被**当成**登录接口返回的 token 用 ——
   ⚠️ **口径未对齐，本库不裁决**：1692161 说 t 是「登录小程序得到的账号信息」，见下文「明确留白」）
5. **刷次数 / 加话题**（GET，5 个 query 参数，**不带 MatchPlayInfo**）：
   - `GET .../sheep/v1/game/topic_game_over?rank_score=1&rank_state=1&rank_time=1&rank_role=1&skin=1`（每日话题）
   - `GET .../sheep/v1/game/game_over?rank_score=1&rank_state=1&rank_time=1&rank_role=1&skin=1`（通关次数）
   - ⚠️ 源文用**微信小程序 UA**（`MicroMessenger/8.0.21…MiniProgramEnv/android`）作为 header

> ★ **A 线的价值不在「羊了个羊」**，而在**「免抓包」这条通用路线**：
> **参数能被推导出来时，就不必先抓包** —— 从「页面里已有的 uid」出发，
> 用「资料接口 → 登录接口 → 业务接口」三段链把 `t` 换出来。
> 这与「先抓包再还原」是两条不同的起点，**成本差一个数量级**。

### B 线 · 对局记录（原主路径，`52pojie-1692161`）

1. 抓包三件套：map_info_ex（拿 map_seed / map_md5 / map_seed_2）、静态关卡 txt（b5b742de….txt）、game_over_ex
2. 从 wxapkg 解包出的 sheeps.js 读 proto 定义与常量
3. 用 map_seed 作随机种子按与游戏相同方式初始化地图
4. 递归求解：把当前图状态 + 已消除块 id 作为状态空间，可消对优先，穷举/回溯
5. 生成 stepInfoList：chessIndex 按 -layerNum,type,moldType 升序编号，再把 type=0 的块按 blockTypeData 的类型与数量顺序改写
6. 组 MatchPlayInfo：{gameType:3, stepInfoList:[{chessIndex, timeTag}]} → protobuf 序列化 → base64
7. POST game_over_ex：{rank_score:1, rank_state:1, rank_time, rank_role:2, skin:1, MatchPlayInfo, MapSeed2, Version:"0.0.1"}

> **A 线 vs B 线的差别（本库整理，两篇源文各自只给了一半）**：
>
> | | A 线（1689437，2022-09-18） | B 线（1692161，2022-09-28） |
> | --- | --- | --- |
> | 端点 | `game_over` / `topic_game_over`（**无 `_ex`**） | `game_over_ex` |
> | 参数位置 | **GET query**（rank_* 五参数） | **POST body**（rank_* + MatchPlayInfo + MapSeed2 + Version） |
> | 要不要对局记录 | **不要**（直接调就加次数） | **要**（要构造 MatchPlayInfo） |
> | 何时失效 | 更早的简化版 | 25 号加 `Version` 后原思路失效 |
>
> ⇒ **两条路都属 `historical`**；`game_over` 那一支**参数面更小、不需要解包**，是**先试的那一支**。

## 算法口径

- 家族: `custom`
- 细节: 无哈希/签名/加密算法；唯一「编码」是 MatchPlayInfo = base64(protobuf 序列化)。protobuf 定义：message MatchPlayInfo { message MatchStepInfo { required int32 chessIndex = 1; required int32 timeTag = 2; } required int32 gameType = 1; optional int32 mapId = 2; optional int32 mapSeed = 3; repeated MatchStepInfo stepInfoList = 4; }，实际只用到 gameType 与 stepInfoList。gameType: 3 每日挑战 0 GAMEMAIN 1 GAMETOMB 2 过关挑战 4 话题挑战。timeTag：24 号前是操作间隔毫秒，24 号改成 type（方块初始化后的类型）。chessIndex 从第 1 层 0 开始编号。道具操作 id：-1 移出 道具 / -2 撤回道具 / -3 洗牌道具 / -4 复活道具。B36 补充：更早的简化版路径 game_over / topic_game_over 是 GET + 5 个 query 参数（rank_score / rank_state / rank_time / rank_role / skin），不带 MatchPlayInfo；header t 的获取链是 user_info(uid) → login_oppo(POST) → token。
- 输出编码: base64

## 自算核对（源文章数字重算结果）

- map_md5 两项均为 32 位十六进制（046ef1bab26e5b9bfe2473ded237b572 / b5b742de1506849f1c1cf2fd2d10dfce），与「两关配置数据 md5」表述吻合；第二项同时是静态关卡 txt 的文件名
- map_seed 为 4 个整数、map_seed_2 为字符串形式的整数，均为种子/透传值，无加密痕迹
- game_over_ex 的 9 个字段与 protobuf 定义核对：rank_* 走 JSON，只有 MatchPlayInfo 内含 binary 序列化
- B36 复算 1689437 里那个示例 JWT：`alg=HS256`，载荷键为 {exp, nbf, iat, jti, open_id, uid, debug, lang}，`iat=1663301423`；`exp-nbf=31102200` 秒 ⇒ 属**已过期的示例值**，不可直接复用
- B36 复算：`game_over` / `topic_game_over` 的 query 参数恰好 5 个（rank_score / rank_state / rank_time / rank_role / skin），与 `game_over_ex` 的 body 字段**同名但传输位置不同**（GET query vs POST body）

## 明确留白（原文未给出，不要臆测）

- header t 的**格式**两篇口径不同：1692161 说「登录小程序得到的账号信息」，1689437 直接把它当**登录接口返回的 token** 用（`headers['t'] = token`）；1689437 源码里 `user_info` 的 `t` 又是一个**硬编码 JWT 示例值**（已过期），⇒ 「t 到底放账号信息还是放 token」**两篇未对齐，本库不裁决**
- MatchPlayInfo 是否另有校验字段（如 mapId/mapSeed）文章说「只用到2个字段」
- blockTypeData 中 "15" 缺失、"17+" 为白板的编号规则未说明
- 作者未给出可复现的最终请求/响应示例（只说思路），因此 verified_in_article 以「有明确原文描述与 proto 定义」为准，未见对拍成功截图
- 1689437 未给出 `login_oppo` 的返回结构（只写了 `['data']['token']`），也未说明 `login_oppo` 这个渠道名（oppo）的语义
- 1689437 的 `user_info` 请求里 `t` 是写死的示例 JWT（本库已复算其载荷，见上），**不等于**真实可用的 t
