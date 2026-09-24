# 直播源「长期化」：三站配方、asx 容器与机房 IP 黑名单

> **来源**：`docs/references/52pojie-1096152`（斗鱼 / 虎牙 / B 站三站，2020-01，PowerShell 成品开源）
>
> **定位**：`playback-address-interfaces.md` §3 解决「**地址从哪取**」；本文只解决两件事 ——
> ① 取到的地址**带时效参数、看一会就断**，怎么改成长期可用；
> ② **取不到**的时候，怎么在「算法问题 / IP 问题 / 未开播」三者之间 30 秒分清。
>
> **不重复**：具体端点与签名路线见 `playback-address-interfaces.md` §3；MSE / 播放器侧见 `player-and-live-capture.md`。

---

## §0 一句话判据

**地址里带「时间 / 会话派生」的 query（`wsAuth` / `token` / `expire` / `did` / `sign`）⇒ 它必然短效。**

长期化的本质是**把地址切成「不变段」+「时效段」，丢掉时效段、把不变段拼到一个稳定 CDN 上**：

```text
短效地址  http://hdl1a.douyucdn.cn/live/<房间号><9位随机>_2000p.flv?wsAuth=…&token=…&expire=0&did=…
          └───────┬────────┘                       └──┬──┘└────────────┬────────────┘
            二级域名（会变）                      清晰度后缀        时效参数（全删）
                  ↓ 换成稳定 CDN            ↓ 删            ↓ 删
长期地址  http://tx2play1.douyucdn.cn/live/<房间号><9位随机>.m3u8
```

**两个必须记住的边界**：

1. 斗鱼这条链**必须是 HTTP，不能是 HTTPS**（源文明确：只有 B 站的源是 HTTPS）；
2. 部分房间**去掉清晰度后缀会播不了** ⇒ 统一补 `_4000p` 兜底。

---

## §1 斗鱼

**取地址**（源文用的第三方解析接口，返回 JSON）：
`web.sinsyth.com/lxapi/douyujx.x?roomid=<房间号>` → `Rendata.link` 就是短效地址。

- **未开播要先判**：返回 `state:"NO"` / `tname:"Unbroadcast"` ⇒ 抓了也没用，**不要浪费一次抓取**。
- 正常返回里值得留意的字段：`media_type:"live"`、`data.roomName/nickname/avatar/roomimg/roominfo`、`time`。

**长期化三步**：

| 步 | 动作 | 说明 |
| --- | --- | --- |
| 1 | 二级域名 `hdl1a` → `tx2play1` | 也可能是 `hl1a` 或别的，**总之要换掉**（不要只替换 `hdl1a` 这一个字面量） |
| 2 | 从 **`.flv?`** 处**截断**，后面全部删 | 时效参数（`wsAuth` / `token` / `expire` / `did` / `origin` / `vhost`）全在这一段 |
| 3 | 删掉清晰度后缀（`2000p`）或换成 `_4000p` | 见上「边界 2」 |

- **本质**：把 `.../live/<房间号+9位随机>` 这一段取出来，前面补 `http://tx2play1`，后面补 `.m3u8`。
- ⚠️ **与免签路线的关系**：本文是**地址改写**；`playback-address-interfaces.md` §3.1 的免签端点
  （`playweb.douyucdn.cn/lapi/live/hlsH5Preview/<rid>`）是**更稳的另一条路**，且它返回的 `rtmp_live`
  本身就是 `<房间号><9位随机>` —— **正好就是上面的「不变段」**。两条可叠加：先走免签拿不变段，再按本文改写成长期源。

---

## §2 虎牙

**取数据**：直播间页面里有一段内联 JSON —— `var hyPlayerConfig = {…}`。

- 开播判据（源文自评「简单粗暴、不优雅但有效」）：**在页面 HTML 里暴力搜唯一的 `"state":"ON"`**。
- 真实推流地址：`stream.data[0].gameStreamInfoList` —— **是数组**
  （为「同一直播间不同第一视角」准备；源文的实现是遍历后取最后一条，并注明「便于以后二次开发」）。
- 直播间信息在同级的 `stream.data[0].gameLiveInfo`（`roomName` / `nick` / `avatar180` / `screenshot` / `introduction`）。

**长期化（选 `sCdnType == "AL"` 的那条）**：

```php
$url = $stream['sFlvUrl'] . '/' . $stream['sStreamName'] . '.' . $stream['sFlvUrlSuffix'] . '?';
$url = str_replace('amp;', '', $url);                       // ★ 见下
$url = str_replace('backsrc', 'huyalive', $url);
$url = str_replace('al.flv', 'al.hls', $url);
$url = str_replace('aldirect.flv', 'aldirect.hls', $url);
$url = str_replace('tx.flv', 'tx.hls', $url);
$url = str_replace('.flv?', '.m3u8', $url);
```

> ★★ **`str_replace('amp;', '', $url)` 这一行是「HTML 实体残留」的第三个实例**。
> 同族已知：`&times;` → 被渲染成 `×`（B30，百度 `&timestamp=`）、`&#182;` → `¶`（B31，某站待签串分隔符）、
> 这里是 `&amp;` **被二次转义成了裸 `amp;`**。
> **通用判据（三例已足以升格）：抄来的页面串 / 请求串一律先搜 `amp;`、`&#`、`×`（U+00D7）三个模式。**

### ★ 更省事的一条路：手机版页面 + 一条正则

**伪装手机 UA 访问 `https://m.huya.com/<房间号>`**，然后在 HTML 里正则：

```python
pattern = r"hasvedio: '([\s\S]*.m3u8)"
# 命中后把清晰度段去掉：real_url = re.sub(r'_1200[\s\S]*.m3u8', '.m3u8', result[0])
# 未命中 ⇒ "未开播或直播间不存在"
```

- **两个独立开源项目（`real-url` / `live-real-url`）的做法完全一致**（一个 Python、一个 Java），
  差别只在语言 API ⇒ 这条路的**稳定性经过两处独立验证**。
- 源文的判断：手机版页面比电脑版小 ⇒ **响应更快**，批量抓（一整个分区前 100 个房间）时差异可感。
- **取舍**：源文自评「这个方法在这里不是最优解，换个问题未必也不是」——
  **先把两条路都留着**（`hyPlayerConfig` 路线字段全，正则路线成本低）。

---

## §3 B 站

**三个接口及其关系（源文已交叉验证）**：

| # | 路径 | 给什么 | 用途 |
| --- | --- | --- | --- |
| ① | `api.live.bilibili.com/room/v1/Room/room_init?id=<房间号>` | `data.live_status`（1 开播 / 0 未播） | **只做开播提醒 / 查询**用这个 |
| ② | `api.live.bilibili.com/room/v1/Room/playUrl?cid=<房间号>&platform=h5&otype=json&quality=4` | `data.durl`（**未开播也有值**） | 要地址用这个 |
| ③ | `api.live.bilibili.com/xlive/web-room/v1/index/getRoomPlayInfo?room_id=<房间号>&play_url=1&mask=1&qn=0&platform=web` | `live_status` + `play_url`（`durl` 在里面） | 一次拿全 ⇒ **③ = ① + ②** |

- **一条只有对比才知道的判据**：「② 未开播也能拿到 `durl`，③ 未开播 `durl` 为 `null`」
  ⇒ 源文据此推断 B 站的直播源**接近永久**（是长期源，不是临时源）。
- **手动路线**（页面里）：Network → 找 `live_` 开头的 XHR → 取 URL 里的 `live_xxx_xxxxxxx_xxxx` 段
  → 前面拼一个**可用 CDN 前缀** → 后面加 `.m3u8`。
  ⚠️ 源文给的固定前缀（`https://cn-hbxy-cmcc-live-01.live-play.acgvideo.com/live-bvc/`）是**当时**的实测值：
  **要当作「从任意一条当前可播地址里抽出来的前缀」，不要当常量写死**。

### ★★ 机房 IP 被拉黑：本地全绿、服务器全挂的典型

源文花了整节记录这件事，值得原样保留：

```text
同一时间、同一直播间：
  本地家宽（本地 PC / 本地软件）  → 接口 ②/③ 正常拿到 durl
  腾讯云 Windows 服务器           → 卡在某个阶段
  阿里云（网站所在）              → durl 取不到
尝试过的无效手段：改 UA（手机 / 浏览器 / 假装 Postman）、换来源、伪装 IP
```

- **判据（本节的长期价值）**：**「本地能跑、服务器跑不动，且失败点是某个关键字段为空」⇒ 先怀疑 IP 段黑名单**，
  不要继续在请求头 / 参数上打转。
- **处置**：代理 IP 池 / 换非机房出口。
- **迁移性**：这与「采集脚本本地全绿、上线就挂」是**同一族问题** ⇒
  **上服务器前先做一次同请求的 A/B（本地 vs 服务器）**，先分清是算法差异还是网络可达性，
  再决定花时间扣算法还是花时间搞出口。这也顺带解释了「大型爬虫为什么要上分布式」（源文原话：
  一是提高负载能力，二是反反爬）。

---

## §4 asx 容器：长期源的交付形态

`asx` 就是**特化过的 XML**，默认打开方式绑在播放器上（双击即播）：

```xml
<asx version="3.0">
  <entry><title>直播间1</title><ref href="http://…/room1.m3u8"/></entry>
  <entry><title>直播间2</title><ref href="http://…/room2.m3u8"/></entry>
  <entry><title>电台3</title><ref href="http://…/room3.m3u8"/></entry>
</asx>
```

- 每个 `<entry>` 一个独立源；`<title>` 自己改成可读名（播放器列表里显示的就是它）；
- 文件**扩展名改成 `.asx` 就能用**（源文原话：把 `新建文本文档.txt` 重命名成 `现在你是直播源了.asx` 也能用）；
- **这是「长期化」存在的理由之一**：短效地址进不了 asx（还没播就失效了），
  长期源才能「一个文件装一整套频道、打开就选」。

---

## §5 排错表

| 现象 | 判断 |
| --- | --- |
| 未开播时抓到的「地址」 | 无效（源文口径：`state:"NO"` ⇒ 抓了没法播也没用）⇒ **开播判据前置** |
| 斗鱼长期源播不了 | ① 用了 HTTPS（应 HTTP）；② 该房间需要保留清晰度后缀 ⇒ 补 `_4000p` |
| 斗鱼源看一会就断 | 时效参数没删干净：要**从 `.flv?` 整段截断**，只删 `?` 之后不够 |
| 虎牙拼出的地址里带 `amp;` | HTML 实体二次转义 ⇒ `str_replace('amp;','')` |
| 拿到的是 `flv`，浏览器打不开 | **不是错误**：浏览器无原生 flv 支持 ⇒ 用 mpv / VLC / PotPlayer，或改 `.m3u8` |
| 本地能取、服务器取不到（字段为空） | **机房 IP 黑名单**（§3），不是算法问题 |
| 「这个源是永久的吗」 | 斗鱼 / 虎牙是**改写成长期**（站点换 CDN 就失效）；B 站源文实测接近永久 —— **两者都要留一次可用性自检**，不要假设永不过期 |
| 直播间处于**下播后轮播**状态 | 会被误判成「正在直播」而做无效抓取（源文在 TODO 里点名的已知缺陷，如斗鱼暴雪直播间） |

---

## §6 与其它文档 / 技能的边界

- **地址从哪取 / 斗鱼免签 vs 动态签名 / 抖音一次拿 rtmp+hls / 小红书 `__INITIAL_STATE__`** →
  `playback-address-interfaces.md` §3。
- **页面里没有可播地址、只有 `blob:`** → `player-and-live-capture.md` §2（MSE 源码注入）。
- **地址到手但花屏 / key 错 / 下载器报 key** → 本技能 SKILL.md 的 A–F 层分层表。
- **批量抓取时的 IP / 风控 / 指纹** → `../../web-js-env-patcher/SKILL.md`；
  本文只保留它需要前置的那条判据：**本地绿、线上红 ⇒ 先怀疑 IP，再怀疑算法**。
