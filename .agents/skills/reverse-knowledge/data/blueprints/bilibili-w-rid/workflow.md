## 入口与传输

- 生成位置: 函数 lt(e)（内部生成 mixinKey a，再 return {w_rid: at(v + a), wts: u.toString()}）；at 为标准 MD5
- 触发时机: 请求前（刷新/下拉评论接口时触发）
- 传输方式: query，参数名逐字："w_rid"、"wts"

## 排查步骤

1. 确认平台：文章给的 base64 网址解出 https://www.bilibili.com/bangumi/play/ep1633643 与 https://api.bilibili.com/x/v2/reply/wbi/main（确为 B 站）
2. 在 JS 里搜 w_rid，共 6 处出现，全部下断点，缩小到 lt(e) 的 return {w_rid: at(v + a), wts: ...}
3. 确认 at = 标准 MD5（文章用控制台测试 MD5(v+a) 与接口值一致）
4. 取 imgKey/subKey（常量或 localStorage[ct]），用索引表算出 32 位 mixinKey
5. 拼 v：加入 wts → 排序 → encodeURIComponent 过滤 → '&' 连接
6. w_rid = md5(v + mixinKey)（hex 小写），wts 用秒级时间戳

## 算法口径

- 家族: `hash`
- 细节: w_rid = MD5(v + a)。v = 把参数对象 e 加 wts 后用 Object.keys().sort() 排序，逐项 encodeURIComponent(key)+'='+encodeURIComponent(value)，末尾 join('&')；值为字符串时先 replace(/[!'()*]/g,'')；null/undefined 不入串。a = mixinKey = (imgKey+subKey) 按固定索引表取字符后取前 32 位。
- 密钥/常量: `imgKey = "7cd084941338484aae1ad9425b84077c"; subKey = "4932caff0ff746eab6f01bf08b70ac45"; 索引数组（逐字）= [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52]`
- 输出编码: hex
- 输出长度: 32（MD5 hex）

## 自算核对（源文章数字重算结果）

- t = imgKey+subKey 长度 = 64，索引数组长度 = 64，最大索引 = 63（全部落在 t 内，t.charAt(e) 恒真）。
- 用文章给的 o/i 与索引表重算 mixinKey a = 'ea1db124af3c7062474693fa704f4ff8'（32 位 hex，符合 slice(0,32)）。
- base64 解码两个网址，得到 bilibili.com/bangumi/play/ep1633643 与 api.bilibili.com/x/v2/reply/wbi/main —— 确认参数属 B 站（蓝图 ID 保持 bilibili-w-rid，无需改名）。

## 来源之间的矛盾

- 52pojie-2033704:81-88（代码 t=o+i 后按索引取字符） vs 52pojie-2033704:137（正文'o和i的值是固定的'） —— 代码里 o/i 来自 localStorage[ct]（运行时取值），正文却说 o/i 固定（判定: 两者不冲突：作者在自己的会话里观察到 o/i 为固定常量。运行时仍应从 localStorage 或接口取，常量只对该样本会话有效。）

## 明确留白（原文未给出，不要臆测）

- ft() 的实现（Key 还原）。
- localStorage 键名 ct 的字面值。
- useAssignKey / wbiImgKey / wbiSubKey 分支（代码里有但文章没解释）。
- 文章中未给出 w_rid 的完整真实示例值（只有对拍截图）。
