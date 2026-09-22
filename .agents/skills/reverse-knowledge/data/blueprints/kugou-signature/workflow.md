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

## 来源之间的矛盾

- docs/references/52pojie-1269855-01-酷狗音乐搜索下载js解密附Python源码.md:238 vs docs/references/52pojie-1719655-酷狗音乐网页歌曲爬取优化.md:44 —— 2020 版拼接含 'tag=em'、'userid=-1' 且输出大写；2022 版无 tag，改为 'token='、'userid=0' 且输出小写（判定: 非矛盾而是参数集演进：两版各自内部自洽（2020 版已按文章示例复算通过）；2022 版无示例值，未能对拍）
- docs/references/52pojie-1269855-01-酷狗音乐搜索下载js解密附Python源码.md:253 vs docs/references/52pojie-1719655-酷狗音乐网页歌曲爬取优化.md:57 —— 2020 版用 str(round(time.time()*1000)) 即 13 位毫秒；2022 版用 t=time.time()（浮点秒，如 1669594325.12）直接 str 拼入 clienttime/mid/uuid（判定: 无法判定 2022 版是否可用：文章未给示例 signature，且浮点秒口径与 2020 版'13 位时间戳'说明矛盾）

## 明确留白（原文未给出，不要臆测）

- 2022 版未给示例 signature，无法确认是否真实可用
- 下载接口 play/getdata 是否必须带 cookie（文章给了 kg_mid/kg_dfid 等 cookie 但未说明是否必需）
- mid 取值口径不一致：2020 版=时间戳，2022 版下载接口用固定 hex 'c18aeb062e34929c6e90e3af8f7e2512'，两者关系未说明
- 2022 版 request 中 token 为空串，其作用文章未说明
