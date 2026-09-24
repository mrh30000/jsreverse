# 斗鱼直播源 workflow

> 算法侧结论与不确定性见 `metadata.json`；本文件只给可执行步骤。
> 对应 `skills/stream-drm-reverse/references/playback-address-interfaces.md` §3.1。

## 路线选择（第一步就分叉）

1. 打开 `https://www.douyu.com/<房间号>`，F12 → Network。**先找免签端点**：
   过滤 `hlsH5Preview`。鼠标划过任意直播缩略图也能触发同类 POST，响应 JSON 里有 `key` / `rtmp_live`。
2. 若能看到 `playweb.douyucdn.cn/lapi/live/hlsH5Preview/...` ⇒ 走**路线 A（免签）**。
   若只看到房间页内联的构造参数函数、且每次刷新页面 JS 都不同 ⇒ 走**路线 B（动态签名）**。

## 路线 A：免签 hlsH5Preview

1. 抓一条成功的 POST，原样抄下三个请求头：`rid`（房间号）、`time`（13 位毫秒）、`auth`（32 位 hex）。
   **不要重算**，源文明确这三个值照抄即可。
2. 请求：`POST http://playweb.douyucdn.cn/lapi/live/hlsH5Preview/<rid>?rid=<rid>&did=<did>`，
   `Content-Type: application/x-www-form-urlencoded`，`Referer: https://www.douyu.com/directory/myFollow`。
3. 取响应 `data.rtmp_live`，`split('_')[0]` 得到 `<房间号><9位随机字母>`。
4. 拼 `http://tx2play1.douyucdn.cn/<第 3 步的段>.flv`，丢给 mpv / VLC 验证。
5. 若响应是「不支持」⇒ 该房间不支持 h5preview，换房间或走路线 B（**不要**在参数上找原因）。

## 路线 B：动态签名（不要重写，直接跑 JS）

1. 把房间页返回的那段构造参数的 JS **原样**在 Node/TS 里执行（源文推荐的工程形态：
   工具直接 `import` / `eval` 站点函数，而不是 pyexecjs 之类的中转）。
2. **每次取地址都要重新拉一份 JS** —— 它只活几秒到十几秒，复用旧 JS 会返回非法请求或 403。
3. 工程化要点：把「拉 JS → 执行 → 取地址」串成**一次**调用，不要分两步（中间隔一次
   HTTP 往返就可能超窗口）。
4. 多平台（虎牙 / B 站 / 抖音）同理：源文工具是一条命令 `/ 平台 / 房间号`，
   内部各自走该平台的 JS；B 站路线要带 cookie，虎牙用链接时注意引号包裹。

## 验收

- 路线 A：同一房间连续取 3 次，地址里的随机段应完全一致（同一场直播），跨场次应变化。
- 路线 B：**立刻**用拿到的地址请求一次分片，HTTP 200 且首两字节为 FLV 头/TS 同步字节；
  过 30 秒再用同一地址应失效（这就是该路线的正常形态）。
