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

### §2.2b 腾讯旧版 `getinfo` / `getkey` 路线（2020 前）

> ⚠️ **这是 2020-04 的旧路线**（源文 `52pojie-1163619`）。今天腾讯已改用 §2.2 的
> `vd.l.qq.com/proxyhttp` + `cKey`。**引用本节必须连同「2020 年」一起引用**，
> 不要把它当成当前可用链路。

**链路（三步）**：

```text
① 播放页 URL → pathinfo()['filename'] 取 vid
② http://vv.video.qq.com/getinfo?vids=<vid>&platform=101001&charge=0&otype=json&defn=s
   → 基址 url + vkey(fvkey) + 文件名(fn)  ⇒ 普通画质地址 = url + fn + '?vkey=' + vkey
③ http://vv.video.qq.com/getkey?format=2&otype=json&vt=150&vid=<vid>&ran=0%2E9477521511726081&charge=0&filename=<vid>.mp4&platform=11
   → key + filename                      ⇒ 高清地址   = url + filename + '?vkey=' + key
```

| 步 | 取值字段（源文原样） | 说明 |
| --- | --- | --- |
| 提 id | `pathinfo($url)['filename']` | 从**播放页 URL** 的文件名段取 `vid` |
| 基址 | `vl.vi[0].ul.ui[0].url` | **基址**，不是最终地址 |
| vkey（普通） | `vl.vi[0].fvkey` | 普通画质的 `vkey` |
| 文件名（普通） | `vl.vi[0].fn` | ⇒ `url + fn + '?vkey=' + vkey` |
| key（高清） | `key`（`getkey` 响应） | 高清画质的 `key` |
| 文件名（高清） | `filename`（`getkey` 响应） | ⇒ `url + filename + '?vkey=' + key` |

**两个坑**：

1. **JSONP / `变量名=` 剥壳（两个响应用同一处理）**：`getinfo` / `getkey` 返回的**不是裸 JSON**，
   而是 `QZOutputJson={…};`。**必须先剥掉 `QZOutputJson=` 前缀与结尾的 `;`，再 `json.loads`**，
   否则 parse 直接失败。源文 PHP 就是 `str_replace(['QZOutputJson=', ';'], ['', ''], $res)`。
2. **高清地址不是换接口，是同一基址换 `filename` / `key`**：`getkey` 只补 `key + filename`，
   真正可播地址仍是 `基址 url + filename + '?vkey=' + key`；**两个画质共用同一个 `url` 基址**。

> ⚠️ 源文 PHP 里 `getkey` 那行写作 `…&ran=0\%2E9477521511726081\\&charge=0…` ——
> 那两个 `\` 是 **PHP 双引号串里的转义残留**（`\%` 原样保留、`\\` 折叠成一个 `\`）。
> 上表按「可读形态」去掉了这两个反斜杠；**若复现失败，先怀疑是源文的转义残留**，不要先怀疑参数值。

> **通用判据（可跨族复用）**：**凡响应以 `<回调名>(` 或 `xx=` 开头 ⇒ 先剥壳再 parse。**
> 视频 / HLS 接口这族里 JSONP（`cb(...)`）与「`变量名=` 赋值」两种形态都常见；
> `QZOutputJson=` 是「`变量名=`」这一档的实例。

### §2.2c 腾讯旧版 `getinfo` **变体二**（2019 · 另一篇源文，同一接口的另一种取参数写法）

> ⚠️ **同为 2019/2020 前后的旧路线**（源文 `52pojie-1032509`，2019-10）。与 §2.2b 是**同一个接口的两种写法**，
> 差异集中在「vid 怎么取」「文件名怎么拼」「CDN 取哪个下标」。**引用必须带年份**；
> 今天腾讯已改用 §2.2 的 `vd.l.qq.com/proxyhttp` + `cKey`。

**请求（★ 这是 2019 年该文的参数组合，不是通用配方）**：

```text
http://vv.video.qq.com/getinfo?otype=json&platform=11&defnpayver=1&appver=3.2.19.333&defn=fhd&vid=<vid>
```

**与 §2.2b（变体一）的差异 —— 本节最有价值处**：

| 项 | §2.2b 变体一 | 本节 变体二 | 是否同一判据 |
| --- | --- | --- | --- |
| vid 取法 | `pathinfo(url)['filename']` | `url.split('/')[-1].split('.')[0]` | ✅ **同一判据**（都从播放页 URL 的文件名段取），仅写法不同 |
| 文件名 | 取响应字段 `fn` | **由 `cl.ci[0].keyid` 重建**（见下） | ❌ 不同 |
| CDN 基址 | `vl.vi[0].ul.ui[0].url` | `vl.vi[0].ul.ui[3].url` | ❌ **下标是 3，不是 0** |
| 最终地址 | `url + fn + '?vkey=' + vkey` | `cdn + filename + "?vkey=" + fvkey + "?type=mp4"` | 形态同、尾部多一段 |

- **文件名重建（变体二的指纹）**：`keyid = json_data['vl']['vi'][0]['cl']['ci'][0]['keyid'].split(".")`
  拿到三段后
  `filename = keyid[0] + ".p" + keyid[1][2:] + "." + keyid[2] + ".mp4"`
  —— 即**第二段要去掉前 2 个字符**再拼回去（源文原样）。
- **★ 最终地址里那个可疑的第二个 `?`**：源文写的是
  `downloadurl = cdn + filename + "?vkey=" + fvkey + "?type=mp4"`（`?type=mp4` 前面是 **`?` 而不是 `&`**）。
  **源文如此，未做修正** —— 复现时先按原样打；若播放器 / 下载器只认 `&`，再把它改掉，
  **不要一上来就「顺手修好」**（先按源文跑一遍，把「跑不通」与「源文笔误」区分开）。
- **剥壳判据同 §2.2b**：`jsonstr = re.findall('QZOutputJson=(.+);$', html_text, re.S)[0]` 剥掉前缀与结尾 `;`
  后再 `json.loads` —— 与变体一「先剥 `QZOutputJson=` 与结尾 `;`」**同一判据**，见 §2.2b 坑 1（交叉引用，不重复）。
- 清晰度：`defn=fhd`；源文口径「**有高清获取高清、有蓝光取蓝光，简单粗暴**」。
- **页面形态判据**（源文补充，与变体一无关）：
  - `v.qq.com/x/page/<vid>.html` ⇒ 解析出的是**完整视频**；
  - `v.qq.com/x/cover/<cid>/<vid>.html` ⇒ **需要拿到 vid 逐个下载再合并**才是完整视频；
  - 列表页需**另行获取 vid**（源文只说「有能力的自己来」，**未给取法**）。

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

### §2.5 哔哩哔哩：`playurl` 响应里的 **DASH m4s 直链**（视频/音频分流）

> 源文 `52pojie-1177888`（2020-05，**原理课**，作者明说「下一步才是自动化」）。
> 本文把它收在这里的原因是：它给出了 **`playurl` 响应 → `.m4s` 直链** 这条最省事的路线，
> 以及**两条必须提前知道的结构判据**（分流、以及「搜到 4K 不等于拿到 4K」）。

**链路形状**（§2 三段式的直连变体：**不需要算签名**，抄 URL 即可）：

```text
① 播放页 HTML / BV 号        → ② 抓 playurl 的响应（不是请求）
③ 响应里搜清晰度关键字        → ④ 拿 `upgcxcode/.../<avid>-<流序号>-<qn>.m4s`
⑤ 请求时只补 `Referer: https://www.bilibili.com/`
```

**★★ 判据一：`.m4s` 是 DASH 分片 ⇒ 视频流与音频流是两条，下载少了那一条就没有声音。**
文件名里的**流序号**就是这条判据：

| 文件名片段 | 含义 |
| --- | --- |
| `<数>-1-<qn>.m4s` / `<数>-1-<qn>.flv` | **视频**流 |
| `<数>-2-<qn>.m4s` | **音频**流（必须再拿一条，然后 `ffmpeg` 合并） |

源文自己在结尾补了一句「**下载视频没有声音**，非常感谢大佬发现这个问题，并且给出了解决方案。
我下一课详细讲解」⇒ **源文没解决、只登记了**；本篇按「判据」收录，不给方案。
（`-1-` 里那个「1」是**流序号**，不是清晰度；清晰度在第三段。）

**★★ 判据二：「响应里出现 4K 字样」≠「服务端给了你 4K」。**
源文的实测序列本身就是这条判据的证据：

| 步骤 | 拿到的文件名片段 | 实测分辨率 |
| --- | --- | --- |
| 抄第三方工具给的链接 | `<数>-1-32.flv` | 480P |
| 「在 playurl 响应里搜 4K、找到标记的那条链接」，手工拼 | `<数>-1-30080.m4s` | **1080P**（源文原话「果不其然，我在想桃子」） |
| 充值大会员后重新抓同一个响应 | `<数>-1-30120.m4s` | **4K** ✅ |

⇒ **可迁移判据**：**可用码流由「账号权益」决定**，搜索关键字只能帮你**定位**，
不能帮你**提权**。要判「到底给了哪几档」，去看响应里**实际列出的流表**
（`dash.video[].id` / `accept_quality` 这类**枚举字段**），不要看 `Ctrl+F` 的命中数。
⚠️ 源文只给了现象与截图，**没给这两个接口名与字段名** ⇒ 上表记的是「文件名的 `qn` 码段」这一层，
具体字段名**本文不替它补**（登记为未复核）。

**★ 判据三：同站同类 URL 可能并存两套签名方案，别混用。**

| 方案 | 参数形态 | 出现场合（本篇样本） |
| --- | --- | --- |
| `expires` + **`ssig`** | 单值签名 | 源文抄来的那条 `.m4s` |
| `e` + **`upsig` + `uparams`** | **白名单 + 摘要** | 源文从 `gen=playurl` 响应里捞的两条 |

第二套的结构不变量（本批用源文给的 3 条 URL 逐条复算，2/2 成立）：

```
uparams = 被签名参数名的逗号分隔白名单   （本例恒为 e,uipk,nbs,deadline,gen,os,oi,trid,platform）
upsig   = 这些参数值算出的摘要（32 位 hex）
不在白名单里的参数 = upsig、uparams 自身、mid、logo
```

⇒ **判据**：改白名单内的任何一个值都要重算 `upsig`；改 `mid` / `logo` **不用**。
（`upsig` 的算式与密钥**源文未给** ⇒ 登记为未复核，不要编造。）

**★ 路径段的一个可复算规律**（本批 Node + 真机两条路径同值）：

```
upgcxcode/<数 % 100>/<数 // 100 % 100>/<数>/<数>-<流序号>-<qn>.<ext>
源文样本：数 = 185221286 ⇒ 86 / 12 / 185221286 / 185221286-1-30080.m4s   ✅ 成立
```

⚠️ **一处未解的不一致（登记，不判因）**：源文同时给出页面 `BV1Yk4y1r7jM` 与这个 `185221286`，
但**公开的 av↔BV 互转算法**（本批用 3 组公开对照对双向自证：`av170001 ↔ BV17x411w7KC` 等）
算出 `bv2av("BV1Yk4y1r7jM") = 752883075` —— **与 185221286 不是同一个数**。
⇒ `185221286` **不是该 BV 的 avid**（很可能是 cid 之类的内部 id）；**单样本，不下结论**。
**可迁移的教训**：**不要把「同一篇帖子里出现的两个 id」默认当成同一个对象**；
拿 `av↔BV` 这类有公开算法的映射先验一次，成本几行代码。

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

## §3A 移动 APP 直播源：请求体签名 + 「三段拼接」密钥（CCTV 手机电视 · 2021）

> **放哪一层**：本节归 **§0 地址还原层**（APP 接口链路）。其中「密钥由**多段拼接**而成」是**构造**（拼），
> 与 `key-wrapper-families.md` 的 W 族（拿到的是包装、要做**还原/解包**）方向相反 —— 别把两者混为一谈。
> 源文 `52pojie-1379263`；APP 是**爱加密加固**，源文**不分析脱壳**，**只做请求体构造分析**（边界照实写）。

**入口与形态**：

```text
POST http://m.cctv4g.com/cntv/clt/programAuthAndGetPlayUrl.msp
请求头 5 个；请求体 20 多个参数
```

- ★ **判据：HTTP 200 ≠ 拿到可播地址**。源文明确「**即使接口请求成功，响应里的 `playUrl` 仍是加密的**」。
  响应结构（源文示例，`playurl` 已被作者改动几个字母）：

  ```json
  { "resultMsg": "处理成功", "systemTime": "0001112223334",
    "vedioPlayUrls": [], "status": "01", "audioPlayUrls": [],
    "resultCode": "0000",
    "playUrls": [ { "definition": "", "errorinfo": "", "isvideo": "", "overstep": "",
                    "playurl": "vUMlVPNVGWHT0CCRmQWNYbQcrWP1ONBBvRTiPVtFWE4p72i0Es4G8wbSPBt/56nUYO0MbsMDGe9zZxxxxxQT0xz5Bxxom0OeNsH9c0WnckNcnNzxGqtY6Il+qVRzqf7WMRM5FRR3naiHva5egdBs8w==",
                    "resultcode": "0" } ],
    "isMemberProgram": "false" }
  ```

  ⇒ **先看响应字段是不是密文**（这里是 base64 形态、尾部 `==`），再看状态码。
  ⚠️ 源文响应里的 `vedioPlayUrls` / `playurl` / `resultcode` 都是**源文原样的拼写**（`vedio` 不是笔误，照抄）。

### §3A.1 「三段拼接」密钥：硬编码前缀 + `strings.xml` + native 返回值

`SecretUtils` 每个方法都是同一形状：**`硬编码前缀` + `appContext.getString(R.string.…)` + `JNIUtils.NFromJNI(appContext)`**。
源文给出的常量（**逐个回源核对**）：

| 常量（源文原样） | 值 |
| --- | --- |
| `UA_DES_KEY` | `&*UJyu` |
| `BuildConfig.UADES_KEY` | `$#SD&*` |
| `VIDEO_HTTP_PARMAS_PRIVATE_KEY` | `72116A` |
| `VIDEO_HTTP_PARMAS_PUBLIC_KEY` | `cn` |
| `VIDEO_HTTP_URL_AES_KEY` | `yich` |
| `strings.xml` `…easy_private_key` | `4*4F89` |
| `strings.xml` `…easy_public_key` | `20` |
| `strings.xml` `…header_des_key` | `i23DR%` |
| `strings.xml` `…video_url_aes_key` | `ianx` |

方法里的**硬编码前缀**另有三个：`72116AcB!94C`、`cntv`、`yichengt`。
`JNIUtils` 侧四个 native 方法：`oneFromJNI` / `twoFromJNI` / `threeFromJNI` / `fourFromJNI`。

> ⚠️ **别把「声明的常量」都当成已确认的算法输入**：源文给出的四个方法里，
> 只有 `UA_DES_KEY` 与 `BuildConfig.UADES_KEY` 被真正引用（在 `getUaDesUaKey()` 里）；
> `VIDEO_HTTP_PARMAS_PRIVATE_KEY` / `VIDEO_HTTP_PARMAS_PUBLIC_KEY` / `VIDEO_HTTP_URL_AES_KEY`
> 三个**声明了但在这四个方法里未被引用**（方法里用的是字面量前缀）—— **源文如此**。

**源文给出的四个「结果」（拼接产物）**：

```text
getParmasEasyPrivateKey() = 72116AcB!94C4*4F89#k76BdB
getParmasEasyPublicKey()  = cntv201812
getUaDesUaKey()           = &*UJyui23DR%$#SD&*56HJ3!
getHeaderAesKey()         = yichengtianxia12
```

> ⚠️ **源文自身有两处渲染不一致，必须逐字核对，不要照抄某一处**：
> 1. `DES3` 类里同时出现 `DES_KEY = "&*UJyui23DR%$#SD&*56HJ2!"`（尾 `2!`）与
>    `UA_DES_KEY = "&*UJyui23DR%$#SD&*56HJ3!"`（尾 `3!`）——**两个常量只差 1 个字符**；
>    而正文里又把 `getUaDesUaKey()` 写成 `&*UJyui23DR%56HJ3!`（**丢了 `$#SD&*`**）。
>    以**反编译源码块里的完整串**为准，并保留这处矛盾（源文未澄清）。
> 2. 0x05 正文把 `publickey` 写成 `"cntv2018"`，而 0x01 结果与 `getSecretToken()` 用的是 `cntv201812`。
>    **两处不一致，源文未澄清**；按 `cntv201812` 走，但复现失败时先回头查这一位。
>
> ★ **源文明确「不会公开所有的加密」** ⇒ 本节只到「结构」层；**缺的部分一律标「源文未公开」**，不补编。

### §3A.2 请求侧两条签名：`Play-Ua`（DESede+base64）与 `secretToken`（HMacMD5）

- **`secretToken` 原文串（字段顺序逐字）**：

  ```text
  timestamp=<ms>&wdVersionName=<ver>&wdChannelName=<market>&wdClientType=1&wdAppId=3&publickey=<pub>&wdNumber=<0..999>&uuid=<uuid>&userId=<uid>
  ```

  源文示例值：

  ```text
  timestamp=1614387718000&wdVersionName=3.5.3&wdChannelName=xiaomi&wdClientType=1&wdAppId=3&publickey=cntv201812&wdNumber=115&uuid=3709dd1f-1560-3745-896d-8503f7560487&userId=
  ```

- **`Play-Ua` 头** = `DES3.encryptMode(secretToken)`（`DESede` + base64）；密钥就是 `getUaDesUaKey()`。
  源文示例（**抄结构不抄值**，每次请求都变）：`V/1c7v9PQ8qM8jymc7FNCHPxXeXETxsw6qMvF617qTeLpBqWArVQp+a+CYAcR7FIjN4/SivHIvjjJXr56s6mwZCHENT5G0OddovSf/ZhGzPg3HV0/oiLJ9TL/Isi5GM4V+BNssZjY/GQJSPoifyo0hsRbFeuzKw5j1g/uJVDIA/TFQ8KnVC0wa96LVlI0JPRHUYNk/zrkBAYlpllvdK6xnguTWkgoW2WkNtlxgNbKHg=`
- **`secretToken` 字段（请求体里的那个）** = `HMacMD5(getParmasEasyPrivateKey(), secretToken原文串)`，**结果转大写**。
  源文示例：`2B918F2C881C7DD2F314B7D6B9DB5382`。
- `Content-Type: application/x-www-form-urlencoded`（`HttpRequest.CONTENT_TYPE` 静态变量）。
- **请求体（POST params）** 分两批：
  1. `RequestParameter.PostParams` 基础 7 项，字段名与值（源文示例）：
     `wdChannelName=xiaomi` / `wdVersionName=3.5.3` / `wdClientType=1` / `wdAppId=3` /
     `wdNetType=WiFi` / `uuid=3709dd1f-1560-3745-896d-8503f7560487` / `channel=cctv`；
     同序拼成 `PARAMS`（以 `?` 起）与 `OTHER_PARAMS`（以 `&` 起）——**两者只差首个分隔符**。
  2. `addSecretParmas` 再追加 6 项：`secretToken` / `publickey` / `timestamp` / `wdNumber` / `uuid` / `userId`。
- 频道信息字段：`nodeId` / `programId` / `contId`；**源文注明 `nodeId=9000000000` 代表 cctv1**。
- **`PostParameter` 接口的 20 个参数名（源文原样，来源即「请求体 20 多个参数」）**：
  `wdAppId`(`APPID`) / `appointmentTime` / `aptid` / `channel` / `wdChannelName` /
  `clientId` / `wdClientInfo` / `wdClientType` / `contName` / `createTime` / `endTime` /
  `imageurl` / `InfoList` / `wdNetType` / `objectId` / `objectType` / `pushProvider` /
  `wdToken` / `uuid` / `wdVersionName`。
  ⚠️ 源文明说这个接口类「**仅仅是变量声明**」⇒ 它**列出的是全量可能性**，
  本次直播取址链路**实际只用上面那两批字段**（其余属预约 / 推送 / 内容类，别当成必填）。
- `getUUID()` = `UUID.nameUUIDFromBytes((System.currentTimeMillis() + getRandom()).getBytes("UTF-8"))`，
  存 SP 字段 `userid`；`getRandom()` = `new Random().nextInt(1000)`。
- `getMarketId()`：读 meta-data `UMENG_CHANNEL`，缺省 `none`（小米商店为 `xiaomi`）；`channel` = 资源里写死的 `cctv`。

### §3A.3 ★ 可迁移的审计判据与边界

- ★ **native 方法先判它是「参与计算」还是「只做校验」**：源文点开 `j_a` / `j_b` 发现它们
  **只起校验 APP 签名的作用**（「其实看到 `return` 也会发现，`j_a`、`j_b` 根本不需要分析」），
  起初白花了时间 ⇒ **先看 `return` 形态再决定要不要逆，别急着上 IDA**。
- **同一 APP 的双端参数差异**（源文注明，以 Android 为例、部分参数有 iOS 对比）：

  | 项 | Android | iOS |
  | --- | --- | --- |
  | `wdClientType` | `1` | `2` |
  | `uuid` 字母 | 小写 | **全大写** |
  | `wdNumber` 随机范围 | `[0,1000)` | **可能是 `[0,1000000)`**（源文用「可能」） |
  | `channel` | `cctv` | `cctv`（同样写死） |
- **源文未公开的部分**（照实记录，不补编）：
  1. 请求头里的 **`Afas` 与 `Filter` 两个字段的算法**——源文明确「为了 APP 的安全起见，我不会公开这俩字段的算法」；
  2. **`playUrl` 的最终解密方法**——源文明确不公开，且给出三条理由：
     ① `Afas`/`Filter` 脱壳后容易算出；② **解密 `PlayUrl` 的方法被爱加密抽走了，即使脱壳反编译成功也找不到源码**；
     ③ **「文章中列举的加解密方法依然不能解密 `PlayUrl`，`PlayUrl` 是用另外的算法加密的」**。
- 边界：APP 为**爱加密加固**，源文**不分析脱壳**；本文只做请求体构造分析。

---

## §3B 短视频「去水印 / 无水印直链」的四种形态

> **放哪一层**：本节归 **§0 地址还原层**（目标是「拿到一个能直接播的 mp4 直链」）。
> 源文 `52pojie-1159049`（易语言 + Python 双实现）。

### §3B.1 分享短链：请求一次、从 HTML 里截字段（某手 `v.kuaishou.com/s/<id>`）

```python
did = ''.join(random.sample(string.ascii_lowercase + string.digits, 32))
headers = {
    'Cookie': 'did=web_' + did,
    'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
}
html = requests.get(url, headers=headers, allow_redirects=True)   # url 例：https://v.kuaishou.com/s/zeKwaYfN
mp4 = html.text.split('"srcNoMark":"')[1].split('"},"user')[0]
```

- **iPhone UA 串原样抄**（上面那条）；`allow_redirects=True`（短链要跟 302）。
- ★ **判据：去水印的落点是响应里的另一个字段，不是把水印字段删掉**。
  这里是无水印直链字段 `srcNoMark`；同族还有 `origin_video_download`（见 §3B.2）。
  ⇒ 找「**另一个字段名**」，不要去找「水印字段再抠掉」。
- ★ **`did` 是客户端随机生成的伪设备标识**：判据 —— 这类「随机 `did`」与签名里的随机值一样，
  **同一次会话内一致即可，不必复现某个具体值**。
  （源文两版生成方式不同：Python 版是 32 位随机小写字母数字；易语言版是 `取数据摘要(ToBin(rnd(1,50)))` ——
  **都只是「随机」，不构成算法**。）
- **易语言版用自定义子程序做同一件事**（`rightxm(起止串截取)`）：
  ```text
  fi = InStr(srt, ft) + len(ft) ; bi = InStr(srt, bt, fi) ; return mid(srt, fi, bi - fi)
  ```
  即「**找起始串 → 跳过它 → 找结束串 → 取中间**」。源文另有一行被注释掉的备用路线
  （`GetAllResponseHeaders` 里读 `Location`），说明**短链也可直接读跳转头**。

### §3B.2 id 直取接口（皮皮虾 / 抖音系）

```python
url = 'https://is.snssdk.com/bds/cell/detail/?cell_type=1&aid=1319&app_name=super&cell_id=' + id
r = requests.get(url, headers={'User-Agent': <同上 iPhone UA>}, allow_redirects=False)
mp4 = json.loads(r.text)['data']['data']['item']['origin_video_download']['url_list'][0]['url']
```

- 源文示例 id：`6757615695728482574`。
- `allow_redirects=False`（直接吃 JSON）。
- ★ `cell_type=1` / `aid=1319` / `app_name=super` 是**当时**的取值 ⇒ **站点改版即失效**，抄结构不抄常量。
- 无痕直链字段是 `origin_video_download.url_list[0].url` —— 与 §3B.1 的 `srcNoMark` 是**同一类「另一个字段」**。

### §3B.3 易语言（COM / WinHttp）写法 —— 换语言只是语法翻译

```text
CoInitialize (0)                                       ' ★ COM 线程初始化，必须先调
http.CreateObject ("WinHttp.WinHttpRequest.5.1", )
http.RunMethod ("open", "GET", Text1.context, 假)      ' 假 = 不异步
http.RunMethod ("SetRequestHeader", "Cookie", "did=web_" + 取数据摘要 (ToBin (rnd (1, 50))))
http.RunMethod ("SetRequestHeader", "User-Agent", <同上 iPhone UA>)
http.RunMethod ("send", )
mp4 = rightxm (http.GetProperty ("ResponseText", ).取文本 (), 'srcNoMark":"', '"},"user":')
http.Clear ()
```

- ★ 提炼：**只要拿到「请求头 + 参数变换」，换语言只是语法翻译** —— 源文正是用
  「**易语言源码 + 附 Python 对照实现**」的方式给出双语言等价，与本技能的工程化目标一致。
- `CoInitialize(0)` **必须先调**（COM 线程初始化）；`GetProperty("ResponseText")` 取文本，
  响应头走 `文本方法("GetAllResponseHeaders")`。

### §3B.4 抖音系（APP 协议路线）：分享页内联 `itemId` → `aweme/detail` → `play_addr.url_list`

> **来源**：`52pojie-968123`（2019-05-30，PHP）与 `52pojie-1022592`（2019-09-11，Java）——
> **同一作者、同一手法、相隔 3.5 个月**。两篇互为交叉验证：PHP 版给**响应字段全集**，
> Java 版给**版本迭代的 delta**（正文里保留了 7 条历史 API 串并标注「以上接口已经失效」）。

**与 §3B.2 的关系**：§3B.2 是**第三方 id 直取接口**（`is.snssdk.com/bds/cell/detail`，皮皮虾/抖音系通用），
本节是**抖音自己的 APP 协议接口**（`aweme/v1/aweme/detail`）。两者都属 §0 层，
**但依赖方不同**：本节的接口要一串**客户端设备参数**，站点改版即失效。

**链路（五步，一步都别跳）**：

```text
① 分享文本 → 抽出 URL        （源文两版都有这一步：去掉「复制此链接，…」之类的尾巴）
② 请求该短链，跟 302 到分享页（v.douyin.com/<短码>）
③ 分享页 HTML 的内联 <script> 里取 itemId  → 这就是 aweme_id
④ GET aweme/v1/aweme/detail/?<客户端设备参数串>&aweme_id=<id>
⑤ 从 aweme_detail 里取 play_addr.url_list[0] → 请求它、跟重定向 → 截掉 query
```

**① 分享文本 → URL（两版口径一致）**

| 版 | 写法 |
| --- | --- |
| PHP | `$url = "http".explode("http", $share)[1];` 再 `explode("复制此链接，", $url)[0]` |
| Java | 先判「含不含中文」，含中文则 `substring(indexOf("http"), lastIndexOf("/"))` |

> ★ **可迁移判据**：**分享文本是「人话 + URL」的混合体，抽取规则永远是「找 URL 起止锚点」**，
> 不存在通用正则；两版都在**用中文提示语或最后一个 `/` 当结束锚点**。
> ⇒ 抓样本时**把分享文本原样存下来**，别只存 URL（否则没法回推锚点）。

**③ 分享页里的 `itemId`（两版口径一致）**

```php
$str = explode("itemId: \"", $html)[1];
$str = explode("\",", $str)[0];                 // PHP 版
```
```java
int start = url1.indexOf("itemId: \"");
int end   = url1.indexOf("\",\n            test_group");   // Java 版：结束锚点带上了下一个字段名
String itemId = url1.substring(start, end).replaceAll("itemId: \"", "");
```

> ⚠️ **Java 版这一处很脆**：结束锚点写成了 `",\n            test_group`（**含缩进与换行**）。
> 站点改一次缩进就失效。**判据**：锚点只应包含**语义稳定的部分**（`itemId: "` … `",`），
> 空白与缩进**交给「去空白后再匹配」处理**。
> 更稳的做法是**按结构取**（内联 JSON / `window.__INITIAL_STATE__` 一类载体，见
> `playback-url-shapes-and-page-carriers.md` §5），而不是按字面锚点切。

**④ 接口串：两版的差异就是「版本迭代 delta」**（同一作者相隔 3.5 个月）

| 维度 | `52pojie-968123`（2019-05） | `52pojie-1022592`（2019-09） |
| --- | --- | --- |
| Host | `api-hl.amemv.com` | `aweme.snssdk.com`（历史串）/ 模板化（在用） |
| `version_code` | `251` 写死 | `$version_code` 模板（历史串里出现 `140 / 251 / 650`） |
| `manifest_version_code` | `251`（**与 version_code 相同**） | `660`（历史串里**与 `version_code=650` 不同**） |
| `_rticket` | **有**（`1559206461097`） | **无** |
| `ts` | `1559206460` | `1561136204`（且是**模板串里的残留常量**） |
| `as` / `cp` | `a115996edcf39c7adf4355` / `9038c058c7f6e4ace1IcQg` | `a1e500706c54fd8c8d` / `004ad55fc8d60ac4e1` |

**★★ 三条可直接落地的判据**：

1. **`ts` 与 `_rticket` 是同一次请求的同一时刻，一个秒级一个毫秒级**。
   本批复算（PHP 版样本）：`ts = 1559206460`，`_rticket = 1559206461097`，
   且 `floor(_rticket / 1000) == ts + 1` ⇒ **两者配对生成、不可跨请求复用**。
2. **`as` / `cp` 是「设备指纹对」，不是算法**。证据：两篇的取值不同、**长度也不同**
   （18 位 vs 22 位）⇒ **不要试图复算它，也不要跨样本抄常量**；照抄源文常量 = 必失败。
3. **`version_code` 与 `manifest_version_code` 可以不一致**（历史串里 `650` vs `660`）⇒
   别用「两者必然相等」去校验参数串是否抄全。

**⑤ 取地址：`play_addr.url_list` → 跟重定向 → 截掉 query**

```java
url = aweme_detail.long_video[0].video.play_addr.url_list[0];   // 长视频分支
url = aweme_detail.video.play_addr.url_list[0];                 // 普通视频分支（PHP 版用这条）
// 请求 url（不下载 body），取「最终 URL」，再截到 '?' 之前
```

- **两条分支要都判**：源文 Java 版走 `long_video[0].video.play_addr`，PHP 版走 `video.play_addr`。
  ⇒ 判据：**先试 `long_video`，取不到再回落 `video`**。
- ⚠️ **Java 版的截断写法有个健壮性缺陷**：`url.substring(url.indexOf("http"), url.lastIndexOf("?"))`
  —— 若最终 URL **不含 `?`**，`lastIndexOf` 返回 `-1`，`substring(0, -1)` **直接抛
  `StringIndexOutOfBoundsException`**。⇒ 自己实现时写成 `int q = url.indexOf('?'); url = q < 0 ? url : url.substring(0, q);`。
  （这是**源文缺陷**，登记在此，不要照抄。）

**响应字段全集（PHP 版给全了，按用途归类）**

| 用途 | 字段路径 |
| --- | --- |
| **无水印视频** | `aweme_detail.video.play_addr.url_list`（**4 条**：两条 `*-dy.ixigua.com`、两条 `*-hl.amemv.com/aweme/v1/play/?video_id=…`） |
| 封面 | `aweme_detail.video.origin_cover.url_list[0]` |
| 音频 | `aweme_detail.music.play_url.url_list` |
| 作者 | `aweme_detail.author.nickname` / `author.avatar_medium.url_list[0]` |
| 描述 | `aweme_detail.share_info`（`share_weibo_desc` / `share_title` / `share_url` …） |

**请求头（两版给的不是同一个，都要记）**

| 场合 | UA / Header |
| --- | --- |
| 分享页（HTML） | 移动端浏览器 UA（PHP 版给了完整串）+ cookie `tt_webid=…; _ga=…; _gid=…; _ba=…` |
| detail 接口 | Java 版：`Aweme/79025 CFNetwork/978.0.7 Darwin/18.7.0`（**iOS 客户端 UA**）；PHP 版：`okhttp/3.10.0.1` + `Host: api-hl.amemv.com` |

> ⚠️ **PHP 版的 cookie 被作者自己脱敏成 `##`**（原话「涉及个人隐私，故不放出来」）
> ⇒ **本库保留脱敏形态，不代为还原**；只登记「这条链路需要 cookie，且作者未公开其内容」。

**边界**：本节的接口串是 **2019 年**的；`aid=1128`、`as`/`cp`、`version_code` 全部是**当时值**。
**抄结构、不抄常量**；遇到同一族的新样本，按「④ 的 delta 表」逐参数 diff 一遍再动手。

---

## §3C 解析接口族：「页面不给地址，解析 API 给」的整条链（2025 免费影视站 · 两篇互证）

**边界（先读这句）**：§2 是**平台自己**的地址接口（提 id → 算签名 → 换地址），
§3B 是**短视频去水印直链**，本节是**第三方「解析」站** —— 地址由一个**跟你目标站无关的解析 API** 给出。
三者都是「§0 地址还原层」，**但签名/密钥的归属方不同**：本节里 **key/iv 是解析站自己的常量**，
与目标视频站（某 TX）**无关**。

**来源** `52pojie-2016709`（日番动漫网）+ `52pojie-2033927`（免费影视站）——
★ 两篇**同一作者、同一套手法**，互为交叉验证；本文所有数字均经本批**异语言（Node）逐字节复算**，
详见 `artifacts/skill-evolution/tools/b39-media-crypto-check.js`（**24 项断言全绿**）。

### §3C.1 三层串接：一个「搜索命中」就能定型整条链

判据链（每一层失败都有自己的特征，**别跳层**）：

| 层 | 找什么 | 命不中时的动作 |
| --- | --- | --- |
| ① | `view-source:` 里 `Ctrl+F` 搜 `.m3u8` / `.mp4` | 搜 `aaa=` —— **免费影视站的通用变量名**（源文原话「为什么？问就是见多了」） |
| ② | HTML 里形如 `var player_aaaa=` / `url:"JTY4..."` 的串 | 那就是**密文**，进 ③ |
| ③ | 页面自己的 `player.js` 里的**解密函数** | 若页面明文的只是「平台页地址」（不是真实媒体地址），**转解析 API 路线** |

★ **`player_aaaa` 是一个可搜索的「家族名」**：见到 `aaa=` / `player_aaaa` / `player_xxx`
先按本节形态试，**不要先怀疑是 VMP**。

### §3C.2 第一层：自定义「全字节 percent-encode」+ Base64

两篇的密文都是 `JTY4JTc0JTc0JTcwJTcz...`，解出来是 `%68%74%74%70%73%3A...`。

★★★ **本层最值钱的一条（源文两篇都只给了「先 base64 再 unquote/unescape」，
但没告诉你那层 encode 不是标准库函数）**：本库实测

```
一层长度 == 3 × 二层字符数   （294 == 3×98；171 == 3×57）
```

⇒ **连字母数字都被 `%XX` 编码了**。对照：`encodeURIComponent("https://…")` 只产出 **118** 字符
（因为标准版**放过** `A-Za-z0-9` 与 `-_.!~*'()`）⇒ **标准库里没有任何函数产出这一层**（已断言 C1b）。

⇒ **落地写法**：解码 `decodeURIComponent` / `urllib.parse.unquote` 都能吃（它们容忍全编码形态）；
**造密文时必须逐字节编码**，用标准 encode 会造出**长度对不上、且服务端不认**的串。
⚠️ 这类「**形态一样、长度不同**」的静默差异是本族最容易埋雷的地方 —— 判据就是那个 `3 ×` 等式。

| 环节 | 写法（本库复算通过） |
| --- | --- |
| Base64 补齐 | `missing = 4 - len % 4; if missing != 4: += '=' * missing`（源文两篇一致，**本批两个样本恰好 `missing == 4` ⇒ 补位分支未被执行**，登记为未复核） |
| 一层 → 二层 | `decodeURIComponent(l1)` |
| 判据① | `l1 === 全字节percentEncode(l2)` |
| 判据② | `len(l1) === 3 * len(l2)` |
| 判据③（反证） | `len(encodeURIComponent(l2)) < len(l1)` ⇒ **不是标准函数** |

★★ **第二层反编码函数有分叉，且源文两篇各写了一个（互不一致）**：
`52pojie-2016709` 用 `urllib.parse.unquote`、`52pojie-2033927` 用 JS 的 `unescape`。
本库实测：

- `unescape('%E4%B8%AD%E6%96%87')` = **`ä¸æ`（3 个 Latin-1 字符）**，而 `decodeURIComponent` = **`中文`**；
- `unescape` 不认 UTF-8 多字节，**一旦明文含非 ASCII 就解成乱码**。

⇒ **判据：第二层统一用 `decodeURIComponent` / `urllib.parse.unquote`**。
本批两个样本**全为 ASCII ⇒ 两者结果恰好相同**，**这个「都对」是巧合，不是等价**
（★ 与 B37 的「假绿」同族：样本恰好落在两函数的重合域里）。
另：`+` 在 `decodeURIComponent` / `unquote` 里**不**变空格（只有 `unquote_plus` / 表单解码才变）。

### §3C.3 第二层：解析 API 的两跳 + AES-CBC 常量

**第一跳 —— 拿 `key` / `time`**（源文用的是解析站的**同名页面接口**，不是 api.php）：

```
GET https://<解析站>/?url=<上一步还原出的平台页地址>       # 带 Referer: https://<解析站>/
→ 从 HTML 里正则抓 key / time / vkey
```

依托：`"key":"(.*?)"` / `"time":"(.*?)"` / `"vkey":"(.*?)"`（源文三处正则，逐字保留）。

**第二跳 —— 换真实地址**：

```
POST https://<解析站>:<port>/api.php
Content-Type: application/x-www-form-urlencoded
body: url=<平台页地址>&time=<第一跳的 time>&key=<第一跳的 key>
→ {"code":200,"msg":"请求成功","url":"<AES 密文>","type":"m3u8","success":1,...}
```

★ **`key`/`time` 是「一次性负载」不是「固定值」**：本库实测两跳取回的 `time`
（`1748108226`）与首次响应里的 `time`（`1748103938`）**不同** ⇒ **必须现取现用，不要缓存**。

**第三层 —— AES-CBC 解密**（源文的 `decrypt()` / `start` 调用栈直接给出）：

```python
from Crypto.Cipher import AES
import base64

def decrypt_aes_cbc_base64(text: str) -> str:
    key = b'ARTPLAYERliUlanG'   # 16 位
    iv  = b'ArtplayerliUlanG'   # 16 位
    ct  = base64.b64decode(text)
    padded = AES.new(key, AES.MODE_CBC, iv).decrypt(ct)
    return padded[:-padded[-1]].decode('utf-8')
```

**本库独立复算（Node `crypto`，源文未做）**：

| 断言 | 结果 |
| --- | --- |
| `len(key)` / `len(iv)` | **16 / 16** ⇒ AES-128（`b\'ARTPLAYERliUlanG\'` 正好 16 字符） |
| ★★ key 与 iv 的**字节相同吗** | **不相同**，但**只差大小写**（`ARTPLAYER…` vs `Artplayer…`）⇒ **不要看到「像同一个词」就当成相等**；若真相等则 CBC 退化为 ECB 语义 |
| 密文长度 | **240 字节**，16 的倍数 ✓ |
| PKCS7 填充 | 末字节 `6`、最后 6 字节逐字节一致 ✓（源文手写 `padded[:-padded[-1]]`，**本批两个样本都切对了**） |
| 明文 | `https://ts.key.<解析站>:4433/vod/<长串>.m3u8` ✓ |

★★★ **`key`/`iv` 是否跨请求固定 —— 本篇给出两条独立证据（源文只解了一次）**：

1. **同一份响应里**，`52pojie-2033927` 给了**两个不同时点**的密文（正文 line110 的首个响应
   与 line213 的实解样本），**用同一组 key/iv 都能解出合法 URL**（本库断言 C7）；
2. 跨两篇：**两个不同域名、相隔两个月**的解析站，**同一组 `ARTPLAYERliUlanG` / `ArtplayerliUlanG`**
   —— 同一个 `player.js` 家族。

⇒ **判据升级：这类「解析站全家桶」的 AES key/iv 大概率是开源播放器模板里的固定常量**
（`key` 与 `iv` 只差大小写是**手工改模板留下的痕迹**）。
⇒ **排查顺序：先在已知常量表里试 `ARTPLAYER…`，再考虑扣代码。**

★ **`key` 不是视频站下发的**：它是**解析站自己**的对称密钥（常量），
所以**换任何目标视频站都不用重新逆** —— 这是「解析接口族」相对 §2 平台接口的最大差别。

### §3C.4 引擎与「抗调试」的真实强度

| 现象 | 源文口径 | 判据 |
| --- | --- | --- |
| `Ctrl+U` 遇反调试 | 两篇都遇到 | ★ **`view-source:` 不受页面 JS 干扰** ⇒ **反调试挡不住源码查看**，第一动作永远是 `view-source:` |
| `F12` 打不开 | `52pojie-2033927` 实测 | **反调试 `debugger` 硬编码在 HTML 里** ⇒ 注释掉/删掉那几行即可跳过（源文原话「很幸运跳过反调试，没有进一步保护机制」）⇒ ★ 判据：**先试「直接改 HTML」这个零成本动作**，再考虑 hook |
| 解析站自身几乎无防护 | 源文原话「加密防护手段实在是太『高级』了，生怕别人不知道」 | **`Ctrl+F` 搜 `decrypt` 直接命中函数名** ⇒ 判据：**第三方解析站的变量名往往不混淆**，先在网络面板看**发起程序调用栈**（源文正是从「匿名」栈拿到 key/time、从上一级 `start` 拿到 `decrypt`） |

★★ **「响应数据包由谁发出的」比「字段叫什么」更快**：源文的整条定位靠**「发起程序」调用栈**
（`start` → `decrypt(stray.url)`），而不是靠猜字段名。这是可迁移的第一动作。

### §3C.5 排错表

| 现象 | 原因 |
| --- | --- |
| 一层解出「像 URL 但全是 `%`」 | 正常 —— **还没做第二层**（本族是**双层**，漏一层就停在 `%68%74…`） |
| 一层长度对不上 | 造密文时用了标准 `encodeURIComponent`（**必须逐字节编码**，见 §3C.2 的 `3 ×` 判据） |
| 第二层解出乱码 | 用了 `unescape` 且明文含非 ASCII ⇒ 改用 `decodeURIComponent` |
| AES 解出乱码 | key/iv 抄错（**注意只差大小写**）/ 密文没 base64 解码 / 忘了剥 PKCS7 |
| 解出的地址 403 | 地址本身对，缺 `Referer`（源文实测播放要带解析站的 Referer —— **源文未明说是否必须，登记为未复核**） |
| `key`/`time` 复用时失败 | 是**一次性负载**（本库已实测两次时间戳不同） |
| 换目标站就崩 | 不可能 —— key/iv 是**解析站常量**；崩说明你混进了 §2 平台接口的假设 |

### §3C.6 源文缺陷登记（**照抄跑不起来**，务必先看这条）

★★★ `52pojie-2033927` 正文的 Python 代码里有一处**非法字面量**（本库断言 C9 已定位）：

```python
headers = {"Referer": "https://jiexi.789jiexi.com/", "User-Agent": "User-Agent": "Mozilla/5.0 …"}
#                                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 键重复且被写成 "k": "k": "v"
```

⇒ **直接 `SyntaxError`**。这是本仓第二次抓到「源文代码语法错」（首次见 B34 的
`52pojie-1485179` 少括号）⇒ **纪律：照抄源文代码前一律先过一遍语法**。

另：源文两篇的 IP 字段都是 `192.168.1.1` / `XXXX`（**源文自己打的码**）
⇒ 本节登记**保留该脱敏形态**。

> ★ 与 §3B 的关系：§3B 是「**短视频 App/页面的去水印直链**」（落点是**另一个字段**）；
> 本节是「**第三方解析 API**」（地址由**解析站**算出）。两者都属 §0 层，**但取证对象不同**。

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

### §4.3 ★★ 字符「置换表」+ 分块 XOR：`link` 是自定义流密码（2025 音频站）

**来源** `52pojie-2031462`（音频站，源文自陈「算是捞了一次偏门」）。这一类**不是**标准 base64 + AES，
而是**「URL-safe base64 → 256 项置换表 → 两轮定长 XOR」**，表在源文里被**整段贴出**
（`inito` / `inita` / `initr` / `initn`），所以可以**离线复算、不需要再抓包**。

源文算法（逐字归纳，`r` = 前段、`n` = 末 16 字节）：

```text
link        = "..."                       # 请求返回的压缩串（URL-safe base64 变体）
linkbytes   = base64_decode( link 把 '-'→'+'，'_'→'/' )      # ← 先做字母表替换
r           = linkbytes[0 : len-16]       # 前段 = 密文
n           = linkbytes[len-16 : ]        # ★ 末 16 字节 = 既是密文尾巴、又是密钥
u, c        = (inito, inita)  若 deviceType ∈ {www2, mweb2}
              (initr, initn)  否则
for e in range(len(r)):            r[e] = u[r[e]]            # ① 逐字节过置换表
for e in range(0, len(r), 16):     r[e..] ^= n               # ② 每 16 字节与 n 异或
for e in range(0, len(r), 32):     r[e..] ^= c               # ③ 每 32 字节与 c 异或
url = r.decode('utf-8')
```

**本库机械复算（本批新增，源文未做）**：

| 表 | 长度 | 去重后 | 结论 |
| --- | --- | --- | --- |
| `inito` | **256** | **256** | **双射 ⇒ 置换表（S-box）**，`u[r[e]]` 是「查表替换」不是「算术」 |
| `initr` | **256** | **256** | 同上（另一组：非 `www2`/`mweb2` 的端） |
| `inita` | 32 | **30** | **32 字节 XOR 密钥**（有 2 个重复值 ⇒ **不是置换表**，别当成 S-box） |
| `initn` | 32 | 32 | 32 字节 XOR 密钥 |

> ★★★ **判据（一句话分辨「置换表」与「XOR 密钥」）：把那张表去重数一遍。**
> **长度 256 且去重后仍是 256 ⇒ 置换表**（每个下标恰好用一次，是双射）；
> **长度 32 / 64 且有重复值 ⇒ 就是 XOR 密钥**。二者在代码里长得一模一样
> （都是 `r[e] = u[r[e]]` 或 `r[e] ^= k[e % len(k)]`），**只有统计量能分开**。

> ★★ **判据：末 16 字节同时是「密文」与「密钥」** ⇒ 这是**自密钥（self-keyed）**形态。
> 判别动作：看长度是否可以写成 `len(密文) + 16`，且**解密时先切下尾部再参与运算**。
> ⚠️ **与常规 CBC 相反：IV 在尾部，不在头部**（很多实现把 IV 放前面，抄错位置必然全乱）。
> ★ 两轮 XOR 的**块大小不同**（16 与 32），且 `p()` 内部用 `min(len(e) - t, len(r))`
> ⇒ **尾部不足一块时只 XOR 剩余字节**（不是补 0、不是跳过）。
>
> ★★ **顺序判据（真机复算修正，`b38-browsercli-verify.oneline.js` 断言 5d/5e）**：
> **两阶段 XOR 之间可以互换**（XOR 自身可交换，且每个字节在每阶段恰好被同一个密钥字节作用一次）
> ⇒ 「16 先还是 32 先」**不构成判据**，不要把它写成硬约束；
> 真正**不可**互换的是「**① 置换**」与「**②③ XOR**」的**相对位置** ——
> 把「先 XOR 再置换」当成解密顺序会**解不出原文**（真机已复现）⇒ **置换必须最先做（解密）/最后做（加密）**。

> ★★ **判据：链接是「URL-safe base64」时，先做 `-`→`+`、`_`→`/` 再解码**，
> 并在解码前**补 `=` 到 4 的倍数**（源文 `missing_padding = 4 - len % 4`）。
> ⚠️ 源文 `replaceBase64` 里还顺手 `re.sub(r'[^A-Za-z0-9\+/]', '', s)` 偷懒过滤非表字符
> ——**这会静默吞掉真的坏字符**，落地时应改成「过滤后长度必须与补位规则自洽，否则报错」。

> ★ **可迁移到「地址在 URL 里且长度是块对齐 + 尾巴」的一切站**：
> 先量 `len(解码后) - 16`，再问「末 16 字节是 IV 还是签名」。
> 本形态与 §4.1（字符码表）、§4.2（HMAC 签名）并列，构成音频站地址还原的**第三种形态**。

### §4.4 音频站排错

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
