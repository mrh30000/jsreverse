## 入口与传输

- 生成位置: 小程序包 sheeps.js（wxapkg 解密 + wxappUnpacker 解包后可见）
- 触发时机: 地图加载（map_info_ex）/ 游戏结束（game_over_ex）
- 传输方式: 请求头 t（账号信息）；GET query：matchType=3；POST body：JSON（rank_score 等 + MatchPlayInfo + MapSeed2 + Version）

## 排查步骤

1. 抓包三件套：map_info_ex（拿 map_seed / map_md5 / map_seed_2）、静态关卡 txt（b5b742de….txt）、game_over_ex
2. 从 wxapkg 解包出的 sheeps.js 读 proto 定义与常量
3. 用 map_seed 作随机种子按与游戏相同方式初始化地图
4. 递归求解：把当前图状态 + 已消除块 id 作为状态空间，可消对优先，穷举/回溯
5. 生成 stepInfoList：chessIndex 按 -layerNum,type,moldType 升序编号，再把 type=0 的块按 blockTypeData 的类型与数量顺序改写
6. 组 MatchPlayInfo：{gameType:3, stepInfoList:[{chessIndex, timeTag}]} → protobuf 序列化 → base64
7. POST game_over_ex：{rank_score:1, rank_state:1, rank_time, rank_role:2, skin:1, MatchPlayInfo, MapSeed2, Version:"0.0.1"}

## 算法口径

- 家族: `custom`
- 细节: 无哈希/签名/加密算法；唯一「编码」是 MatchPlayInfo = base64(protobuf 序列化)。protobuf 定义：message MatchPlayInfo { message MatchStepInfo { required int32 chessIndex = 1; required int32 timeTag = 2; } required int32 gameType = 1; optional int32 mapId = 2; optional int32 mapSeed = 3; repeated MatchStepInfo stepInfoList = 4; }，实际只用到 gameType 与 stepInfoList。gameType: 3 每日挑战 0 GAMEMAIN 1 GAMETOMB 2 过关挑战 4 话题挑战。timeTag：24 号前是操作间隔毫秒，24 号改成 type（方块初始化后的类型）。chessIndex 从第 1 层 0 开始编号。道具操作 id：-1 移出 道具 / -2 撤回道具 / -3 洗牌道具 / -4 复活道具。
- 输出编码: base64

## 自算核对（源文章数字重算结果）

- map_md5 两项均为 32 位十六进制（046ef1bab26e5b9bfe2473ded237b572 / b5b742de1506849f1c1cf2fd2d10dfce），与「两关配置数据 md5」表述吻合；第二项同时是静态关卡 txt 的文件名
- map_seed 为 4 个整数、map_seed_2 为字符串形式的整数，均为种子/透传值，无加密痕迹
- game_over_ex 的 9 个字段与 protobuf 定义核对：rank_* 走 JSON，只有 MatchPlayInfo 内含 binary 序列化

## 明确留白（原文未给出，不要臆测）

- header t 的具体格式与获取流程文章未给（只说「登录小程序得到的账号信息」）
- MatchPlayInfo 是否另有校验字段（如 mapId/mapSeed）文章说「只用到2个字段」
- blockTypeData 中 "15" 缺失、"17+" 为白板的编号规则未说明
- 作者未给出可复现的最终请求/响应示例（只说思路），因此 verified_in_article 以「有明确原文描述与 proto 定义」为准，未见对拍成功截图
