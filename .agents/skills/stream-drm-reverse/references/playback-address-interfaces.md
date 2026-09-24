# 播放地址还原层（§0 层）—— 视频 / 直播 / 音频站的「地址接口链路」

> **本文是「拿到一个能直接播的地址」这条线的唯一权威源。**
> 平台配方（含签名参数逐项分解）**不写在这里**，写在 `../../reverse-knowledge/SKILL.md` 的蓝图库里
> （`iqiyi-cmd5x` / `tencent-ckey` / `migu-playurl` / `douyu-live` / `qingting-fm`）；
> 本文只给**层判据 + 链路形状 + 排错**。A–F 层（内容加密）见 `SKILL.md` 的分层判据表。

---

## §1 定层：这是 §0 层，不是 A–F 层

**判据（30 秒）**：目标是「拿到一个 `http(s)` 地址，播放器打开就能播」⇒ 你在 §0 层。
一旦地址到手但**画面不对 / 花屏 / 只有前几帧 / 下载器报 key 错**，才回落到 A–F 层。

| 现象 | 结论 | 去哪 |
| --- | --- | --- |
| 页面 `src` 是 `blob:`，网络面板没有 m3u8/flv | 走 §0.4「页面里本来就有数据」或 `player-and-live-capture.md` §2 | 本节 §3 |
| 拿到地址 **403**，或含 `$0 $1 $2 $3` | 那不是最终地址（「基址」） | `player-and-live-capture.md` §3.1 |
| 拿到地址能下但**解出来是垃圾** | §0 已经做完了，问题在 A 层 | `SKILL.md` 分层表 |
| 地址里带 `authKey` / `sign` / `vf` / `ckey` / `ddCalcu` | §0 层 + 签名参数 | 本节 §2，配方查蓝图库 |

**最容易走错的两种**：

1. 把 §0 当成「加密」去扣算法 —— 其实多数时候要的是**接口替换**（一个 fetch 换掉一串参数），
   不是算法还原。先问「这一串能不能整段抄下来复用」。
2. 把 §0 的失败当成 A 层的失败 —— 地址没对齐时去调解密，**任何解密都不会报错，只会一直不对**。

---

## §2 长视频平台：三段式链路（提 id → 算签名 → 换地址）

这一族**形状高度一致**，差别只在「签名怎么来」：

```
① 播放页 HTML        →  提取 tvid/vid（爱奇艺）· vid（腾讯）· 频道 id（咪咕）
② 签名（可选）        →  md5 加盐 / node 跑站点 JS / wasm 导出函数
③ 取地址接口          →  返回 JSON，里面才有真正可播的 URL（常带时效 query）
```

### §2.1 爱奇艺 `cache.video.iqiyi.com/dash`

- ①②③：`param['tvid']` / `param['vid']` 从播放页正则取出；
  `authKey = md5("d41d8cd98f00b204e9800998ecf8427e" + tm + tvid)`（`tm` 是 **13 位毫秒**）；
  `vf = cmd5x(入参串)` 由**站点 JS**产出（Emscripten/asm.js，见蓝图 `iqiyi-cmd5x`）。
- **`authKey` 是本批唯一拿到「源文自带对拍向量」的参数**：源文两条样例 URL 里的
  `authKey`、`tm`、`tvid` 三值同时出现，复算逐字符命中（`scripts/playback_address.py iqiyi-authkey`）。
- 清晰度不是「请求哪个接口」而是**同一接口换参数**：`bid=300/500/600`（高清/超清/1080P）
  与 `ps=1/0`、`ost`/`ppt=undefined/0` 必须**成套改**；只改 `bid` 会拿到与预期不符的清晰度。

### §2.2 腾讯 `vd.l.qq.com/proxyhttp`

- 链路比爱奇艺多一段**会话自举**：`access.video.qq.com/user/auth_refresh`
  （`vappid`/`vsecret`/`g_vstk`/`g_actk`/`callback`）→ 回写
  `main_login` / `vqq_access_token` / `vqq_vuserid` / `vqq_vusession` / `vqq_next_refresh_time` 到本地 cookie 文件。
  ⇒ 这条链把「每次手动贴 cookie」变成**一次配置长期可用**（源文自述「间隔几天再用依旧有效」）。
- `cKey` 来自 `node tx.js <vid> <guid>`（**内部加载 `ckey.wasm`**），返回值是**多行 `k=v`**，
  拼进 `vinfoparam` 之前必须 `replace("\n", "&")` —— 忘了会得到一个「看着有值但不通过」的串。
- `encryptVer=9.1` 与 `platform=10201` / `appVer=3.5.57` 是**伴随常量**，改版本号要一起改。
- 见蓝图 `tencent-ckey`（wasm 之外的两条路：wasm2c 复现、或直接把 JS 侧包装层抄下来）。

### §2.3 咪咕 `playurl/v3` + `ddCalcu`

三级链，**每一级都只给下一级的 id**：

```
program-sc.miguvideo.com/live/v2/tv-data/<topVomsID>   → liveList[].vomsID / name
program-sc.miguvideo.com/live/v2/tv-data/<vomsID>      → dataList[].pID / name
webapi.miguvideo.com/gateway/playurl/v3/play/playurl?contId=<pID>&rateType=3  → body.urlInfo.url
h5live.gslb.cmvideo.cn/...index.m3u8?...&ddCalcu=<交织串>&crossdomain=www
```

- **`ddCalcu` 不是加密**：没有任何密钥，只是把 `puData` 反转后与原串交替配对，
  再在固定位置（4 / 7 / 10 / 13）插入从 `userid[2]`、`timestamp[6]`、`ProgramID[2]`、`Channel_ID[len-4]`
  取来的 4 个字符。索引表 `s = "2624"` 是常量。
- 四个字段为空时用**定长默认串**兜底（`e`×9 / `t`×14 / `c`×9 / `n`×16）——
  这几个长度**不是随手写的**，它们必须覆盖 2 / 6 / 2 / len-4 这几个索引；
  自己改短就会 `undefined`（Python 侧直接越界报错）。
- `scripts/playback_address.py migu-ddcalcu --url "<完整 h5 地址>"` 直接给交织串。
  ⚠️ 源文**未给 `ddCalcu` 的期望输出**，因此自检断言的是**结构**（长度 = `len(puData)+4`、四个插入位固定、
  正序侧 `v[2k+5] == o[k]`、逆序侧 `v[2k+4] == o[n-1-k]`），不是某个具体值。
- 见蓝图 `migu-playurl`。

### §2.4 判据表

| 现象 | 先做什么 |
| --- | --- |
| 接口返回 200 但字段是空 / 无 `m3u8` 字段 | 分辨率或登录态**没成套**（爱奇艺 `bid`/`ps`/`ost`；腾讯 `defn`+`logintoken`） |
| 地址随时间失效 | `tm`/`ts`/`ts_hex` 与签名**必须同一趟生成**，不要复用上一轮 |
| node 跑出来的值尾巴带换行或噪声 | 「取尾部 N 字符再 strip」是**源文口径**，不是技巧；先看源文给的切片长度 |
| 会话 cookie 过期 | 别重走登录，先找 `auth_refresh` 这类**续期端点** |

---

## §3 直播源：两条路线（免签 / 动态签名）

**先问一句**：这个平台**有没有免签端点**？有就走免签，它比签名路线稳一个数量级。

> **本节只解决「地址从哪取」。** 取到的地址**带时效参数、看一会就断**要怎么改成长期可用，
> 以及「取不到时是算法问题还是 IP 问题」怎么分流，写在
> **`live-source-longevity.md`**（斗鱼三步改写 + 必须 HTTP、虎牙 `hyPlayerConfig` 与手机 UA 正则、
> B 站三接口关系、**机房 IP 黑名单**、asx 容器）。两文配合使用：**本节拿地址，那文把它变长期**。

### §3.1 斗鱼：两条路线的判别

| 路线 | 端点 | 特征 | 什么时候失效 |
| --- | --- | --- | --- |
| **免签** | `playweb.douyucdn.cn/lapi/live/hlsH5Preview/<rid>?rid=&did=` | 只需带抓包拿到的 `rid` / `time` / `auth` 三个头（源文明确「**不需要更改不需要重新计算**」），响应里 `data.rtmp_live` 就是 `<房间号><9位随机>_…` | **只有部分房间支持**；不支持时接口会直接说「不支持 h5preview」 |
| **动态签名** | 房间页内联 JS | **每次请求房间页生成的 JS 不同**，签名只活几秒到十几秒，过期返回非法请求或 403 | 必然失效 ⇒ **不要重写成另一种语言**，直接跑站点 JS |

- 免签路线的产物形态：`http://tx2play1.douyucdn.cn/<房间号 + 9位随机字母>.flv`
  （把 `rtmp_live` 按 `_` 切开取第 0 段）。
- 动态签名路线的**工程形态**是「用一个 Node/TS 工具直接 `import` 站点函数」，
  而不是 pyexecjs 之类的中转；见蓝图 `douyu-live`。

### §3.2 抖音直播间：一次请求拿两条流

`webcast.amemv.com/webcast/room/reflow/info/?room_id=<19位>&verifyFp=&X-Bogus=` →
`data.room.stream_url.rtmp_pull_url` 与 `hls_pull_url`。

- **`verifyFp` / `X-Bogus` 留空也能过**（源文实测）⇒ 先试空值，别一上来就上 VMP。
- `room_id` 是 **19 位**：短链要 `HEAD` 跟一次 302 拿 `Location`，再从里面正则出 19 位数字。
- cookie 只需要一个 `_tea_utm_cache_1128`（值里是 URL-encoded 的 JSON）。

### §3.3 小红书直播回放：数据本来就在页面里

```js
JSON.parse(__INITIAL_STATE__.liveStream.roomData._rawValue.roomInfo.pullConfig).streams.at(1).master_url
```

- **判据**：平台没给下载入口，但「书签脚本」一跑就能出地址 ⇒ 数据**早就在页面状态树里**，
  只是没渲染。这时不要抓包、不要扣 JS，去翻 `__INITIAL_STATE__` / `__NUXT__` / `window.__DATA__`。
- `pullConfig` 是**字符串形式的 JSON**（要再 `JSON.parse` 一次），这是最常见的踩空点。

### §3.4 直播源排错

| 现象 | 原因 |
| --- | --- |
| 免签端点返回「不支持」 | 该房间不在免签名单 ⇒ 换签名路线（不是参数写错） |
| 地址能开但几秒后断流 | 时效参数没跟着刷新；直播地址**本来就短效**，要按播放器节奏重取 |
| 同一房间偶尔成功偶尔 403 | 走了动态签名路线且命中了「JS 已换」的窗口 |
| `flv` 浏览器打不开 | 不是错误：浏览器对 `flv` 无原生支持，用 mpv/VLC/支持网络的播放器 |
| 拿到的地址是 `blob:` | 见 `player-and-live-capture.md` §2（MSE 源码注入） |

---

## §4 音频站：地址藏在「字符码表」或「一个签名」里

### §4.1 字符码表族（`*104*116*116*112…`）

```js
function FonHen_JieMa(u) { var a = u.split("*"); var b = '';
  for (var i = 1, n = a.length; i < n; i++) b += String.fromCharCode(a[i]); return b; }
```

- **不是加密**：没有任何密钥，就是把每个码点写成十进制、用 `*` 连起来。
- 三个静默坑：① 循环**从下标 1 开始**（下标 0 是前导 `*` 留下的空串）；
  ② `String.fromCharCode` 按 **UTF-16 码元**取值（`233` 单独成 `é`），不是按字节；
  ③ 分隔符连写、非十进制段、越界码点都要**报错**，不能静默跳过。
- `scripts/playback_address.py charcodes --input "*104*116*116*112"` 一条命令还原。
- 批量场景：章节列表页 → 正则抓每章的加密串 → 逐个解码 → `yt-dlp`/`mpv` 直接吃。

### §4.2 蜻蜓FM：一个 HMAC-MD5 就够

```
path  = "/live/" + id + "/64k.mp3"
ts    = 十六进制文本( Unix时间戳( 当前时间 + 1 小时 ) )
sign  = hex_hmac_md5("Lwrpu$K5oP", "app_id=web&path=" + path + "&ts=" + ts)
url   = "https://lhttp.qtfm.cn" + path + "?app_id=web&ts=" + ts + "&sign=" + sign
```

- `scripts/playback_address.py qingting --id <id>`（`--ts-unix` 可复现到固定时间点）。
- ⚠️ **源文未给示例 URL** ⇒ 自检只做结构断言；**「十六进制是大写还是小写」源文未证**，
  已暴露成 `--ts-case upper|lower`（默认 `upper`）。这条不确定性必须留着，不要悄悄选一个。
- 判据：`ts` 是**未来一小时**的十六进制值（不是当前时间、不是毫秒），
  给「现在」会签出一个当时不可用的地址。

### §4.3 音频站排错

| 现象 | 原因 |
| --- | --- |
| 码表解出来是乱码 | 用了「按字节」而不是「按 UTF-16 码元」（`233/189/160` 三个码点不是 UTF-8 三字节） |
| 码表解出来少一段 | `split` 后没跳过前导空串，或分隔符与源文不一致（`*` 与 `|` 混用） |
| 签名算出来对不上 | 待签串的**字段顺序与是否 urlencode**；本族是纯 `k=v` 按固定顺序直拼 |
| 隔天就失效 | 看签名里是否含时间戳；含就必须现算（本族 `ts` 有 +1h 的偏移，不是现在） |

---

## §5 「地址拿到了但播不了」总表

| 现象 | 落在哪一层 | 去哪 |
| --- | --- | --- |
| 403 / 需要 `Referer` / 需要 Cookie | §0（门禁） | 补 Referer 与 Cookie；见 `SKILL.md` 坑表 |
| 地址含 `$0 $1 $2 $3` | §0（占位符基址） | `player-and-live-capture.md` §3.1 |
| 能下但花屏 / 只有前几帧 | A vs C 层判错 | `SKILL.md` 分层表 + `frame-encryption-and-wasm-decryptors.md` |
| key 不是 16 字节 / 下载器报 key 错 | W 层 | `key-wrapper-families.md` |
| 请求 200 但 key 是空的 | E 层（缺 service certificate） | `widevine-cdm-and-eme.md` §2 |
| 只有声音没画面 | 音视频用了不同 KID/IV | `SKILL.md` 坑表 |
| 页面能播、网络面板看不到媒体请求 | 播放器侧 | `player-and-live-capture.md` §2 |

---

## §6 与其它文档 / 技能的边界

- **平台签名配方** → `../../reverse-knowledge/SKILL.md` 蓝图库（`iqiyi-cmd5x` / `tencent-ckey` /
  `migu-playurl` / `douyu-live` / `qingting-fm` / `baidu-fanyi-sign`）。
  用 `node .claude/skills/reverse-knowledge/scripts/query-blueprint.js --id <id>` 取详情（在仓库根执行）。
- **内容加密（A–F 层）** → `SKILL.md` 分层表 + `references/` 各文。
- **播放器侧接管 / MSE 注入 / 反录制** → `player-and-live-capture.md`（本文不重复）。
- **请求头改写、禁用 Cookie 之类的「门禁绕过 」** → 扩展侧能力面见
  `../../desktop-client-reverse/references/extension-and-nwjs.md`。
- **一整个平台的接口签名（含风控）** → `../../web-reverse-algorithm/SKILL.md`；
  **补环境 / Cookie 挑战** → `../../web-js-env-patcher/SKILL.md`。
