# 咪咕播放地址（vomsID → pID → playurl → ddCalcu）workflow

> 算法侧结论与不确定性见 `metadata.json`；本文件只给可执行步骤。
> 参考实现：`skills/stream-drm-reverse/scripts/playback_address.py migu-ddcalcu`。

1. **第一级（拿频道 id）**：GET `https://program-sc.miguvideo.com/live/v2/tv-data/a5f78af9d160418eb679a6dd0429c920`，
   响应 `body.liveList[].vomsID` / `name`（栏目：热门/体育/央视/卫视/影视…）。源文只取了自己要的几个栏目。
2. **第二级（拿 pID）**：GET `https://program-sc.miguvideo.com/live/v2/tv-data/<上一步的 vomsID>`，
   响应 `body.dataList[].pID` / `name`（每行还带 `now`/`next` 的节目时间）。
3. **第三级（拿 h5 播放地址）**：GET
   `https://webapi.miguvideo.com/gateway/playurl/v3/play/playurl?contId=<pID>&rateType=3&startPlay=true`，
   取 `body.urlInfo.url`。`message != "SUCCESS"` 时是版权/区域限制（源文注释里出现过
   `TypeError: 'NoneType' 版权限制访问`）。
4. **⭐ 抄 URL 之前先做实体还原**：`url` 里的 `&times;` 在 Markdown/HTML 里会被渲染成 `×`，
   于是 `&timestamp=` 变成 `×tamp=`。**先把 `×tamp=` 换回 `&timestamp=`**，否则下一步会静默用默认串。
5. **第四级（ddCalcu）**：解析 h5 URL 的 query，取 `userid` / `timestamp` / `ProgramID` / `Channel_ID` / `puData`，
   按 `metadata.algorithm.detail` 的规则交织出 `v`，请求 `url + "&ddCalcu=" + v`（调用方再补 `&crossdomain=www`）。
   - 字段为空时用默认串（**不要**用空串冒烟）。
   - `puData` 为空时**直接返回原 URL**，不做任何拼接。
6. **验收**：用 `playback_address.py migu-ddcalcu --url "<h5 地址>" --json` 打印 `ddCalcu`，
   断言 `len(ddCalcu) == len(puData) + 4`、第 4/7/10/13 位分别是 u/l/c/f；
   再把结果交给播放器实播一次（源文实测地址时效「大概 4 小时或更长」）。
7. **批量场景**：三级链 + ddCalcu 串成一次执行（地址有时效），落成 TVBox 可用的 `lives/*.txt`
   时按 `名称,地址` 逐行写；`#genre#` 行做分类头。

## 排错顺序

1. 第三级返回 `message != SUCCESS` ⇒ 版权/区域限制，换频道，不要在 ddCalcu 上找原因。
2. 播放器不认但长度对 ⇒ **先查第 4 步的实体还原**（`×tamp=` 是否还留着）。
3. 长度不对（≠ len(puData)+4）⇒ 插入位漏了，检查 `p==1..4` 四个分支。
4. 只有第 4/7/10/13 位不对 ⇒ 四个字段的取值口径错（空值走了默认串 vs 真值）。
