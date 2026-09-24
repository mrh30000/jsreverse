## 入口与传输

- 生成位置: 搜索页 JS：h.signature = faultylabs.MD5(o.join(""))（o 为参数数组，首尾 push/unshift 盐值）
- 触发时机: 搜索请求前（clienttime / mid / uuid 使用同一时间戳）
- 传输方式: query，参数名逐字为 signature（callback/keyword/page/pagesize/... 同放 query）

## 排查步骤

1. 抓 https://complexsearch.kugou.com/v2/search/song?...&signature=... 请求
2. 全局搜 signature，命中 h.signature = faultylabs.MD5(o.join(""))
3. watch o 数组，得到首尾盐值与参数顺序
4. 用同一时间戳填 clienttime/mid/uuid，MD5 后填 signature
5. 下载地址用 https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=...&album_id=...&dfid=...&mid=...&platid=4&_=...

## 算法口径

- 家族: `hash`
- 细节: MD5（2020 版 faultylabs.MD5 自实现，末尾 return l(r,q,o,m).toUpperCase() 输出大写；2022 版用 hashlib.md5(...).hexdigest() 输出小写）
- 密钥/常量: `固定盐值 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'（拼接串首尾各一次）`
- 输出编码: hex（32 位）
- 输出长度: 32

## 自算核对（源文章数字重算结果）

- 用 2020 版公式复算 t=1600307100792, keyword=许嵩 → AD72928A4E0B85FCDC9A34FF1C238AAB，与文章 line 260 完全一致
- 复算 t=1600304102390, keyword=许嵩 → 99B1C89A2402FFD00BA141EF34811A87，与文章 line 24 完全一致
- 2022 版（token=/userid=0/小写、t=time.time()）文章未给示例 signature，未能对拍；其 clienttime 用浮点秒与 2020 版 13 位毫秒不一致，存疑

### 2022 版：本流水线独立复算（B34 新增，源文无示例值）

- **结构断言（机械核对通过）**：1638865 的 `sign_params` 去掉首尾盐值后共 **18 项**，键序
  `bitrate → callback → clienttime → clientver → dfid → inputtype → iscorrection → isfuzzy → keyword → mid →
  page → pagesize → platform → privilege_filter → srcappid → token → userid → uuid` **严格字典升序**、无重复键。
  ⇒ 以后若发现顺序对不上，先怀疑"参数被站点改过"，再怀疑实现。
- **自算锚点（仅供回归对拍，不是"与源文一致"的证据）**：
  `t=1653050047.389`（取自 1638865 自身硬编码的 `'_'=1653050047389` 毫秒换算）、`keyword=一生所爱`、`page=1`
  ⇒ `cf5e1fed8199e46de6733a8df5a539f3`；`t=1653050047`（整数秒）⇒ `2e4bbd38f064b453485614b09fa5911d`。

## 来源之间的矛盾

- docs/references/52pojie-1269855-01-酷狗音乐搜索下载js解密附Python源码.md:238 vs docs/references/52pojie-1719655-酷狗音乐网页歌曲爬取优化.md:44 —— 2020 版拼接含 'tag=em'、'userid=-1' 且输出大写；2022 版无 tag，改为 'token='、'userid=0' 且输出小写（判定: 非矛盾而是参数集演进：两版各自内部自洽（2020 版已按文章示例复算通过）；2022 版无示例值，未能对拍）
- docs/references/52pojie-1269855-01-酷狗音乐搜索下载js解密附Python源码.md:253 vs docs/references/52pojie-1719655-酷狗音乐网页歌曲爬取优化.md:57 —— 2020 版用 str(round(time.time()*1000)) 即 13 位毫秒；2022 版用 t=time.time()（浮点秒，如 1669594325.12）直接 str 拼入 clienttime/mid/uuid（判定: 无法判定 2022 版是否可用：文章未给示例 signature，且浮点秒口径与 2020 版'13 位时间戳'说明矛盾）
- 🔴 **本批新登记的"伪多源"**：docs/references/52pojie-1638865-酷狗音乐歌曲爬取.md（2022-05-20）与
  docs/references/52pojie-1719655-酷狗音乐网页歌曲爬取优化.md（2022-12）**是同一份代码的两个来源** ——
  1638865 的正文代码与 1719655 的代码块逐字同构，且 1719655 在代码注释里自陈来源 `thread-1638865`。
  （判定: **不是两次独立观察**，不能互相印证。⇒ 凡"两篇不同文章给同一段代码"，先查引用来源关系再当多源。）
- docs/references/52pojie-1638865-酷狗音乐歌曲爬取.md:100 —— 同文 `play/getdata` 里 `_` 是**硬编码**的
  `'1653050047389'`（既非当时时间、也不随请求变化），而 `clienttime/mid/uuid` 用的是实时 `time.time()`；
  同文的 `dfid`/`mid` 也写成固定值（判定: 源文未说明，登记为存疑，不要照抄成"可固定"的结论）

## 明确留白（原文未给出，不要臆测）

- 2022 版未给示例 signature，无法确认是否真实可用
- 下载接口 play/getdata 是否必须带 cookie（文章给了 kg_mid/kg_dfid 等 cookie 但未说明是否必需）
- mid 取值口径不一致：2020 版=时间戳，2022 版下载接口用固定 hex 'c18aeb062e34929c6e90e3af8f7e2512'，两者关系未说明
- 2022 版 request 中 token 为空串，其作用文章未说明
- `_` 参数（play/getdata 的时间戳）是否需要实时值：1638865 是硬编码，源文未说明
- 1638865 的固定 `dfid`/`mid` 是设备标识（可复用）还是会话值（会过期）：源文未说明

