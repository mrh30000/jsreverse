## 入口与传输

- 生成位置: webpack 模块 n(350).default，即函数 o；打包文件 vendor.chunk...
- 触发时机: 请求前：i = o(t.data)（非 GET 时），sign 的值即 i
- 传输方式: 随请求参数下发（文章定位为带 sign 参数的接口，未给 query/header 明细）

## 排查步骤

1. 打开 y.qq.com 歌曲详情页，抓带 sign 的请求，进 vendor.chunk... 搜 sign: 下断点
2. 定位 i = o(t.data)，o = n(350).default；多次运行确认输出稳定
3. 记录一组对拍值：o('12345')='zzca873dd41zwq69wr8hrqun6rvk1b5srwqncdc4c4d03'，sha1('12345')='8CB2237D0679CA88DB6464EAC60DA96345513964'
4. 插桩日志，还原：索引抽取(indices1) + hex 配对异或(key_list) + base64 去 /+= + 另一组索引抽取
5. 拼接 zzc + 三段，toLowerCase()

## 算法口径

- 家族: `custom`
- 细节: sha1(明文) 大写 hex → (a) 按索引数组抽取字符；(b) 每 2 个 hex 字符按 dict 拼成 1 字节（hi*16+lo），逐字节与 key_list[i] 异或得 20 字节，再 btoa 后 replace(/[\/+=]/g,'')；(c) 另按索引抽取尾段；最终 zzc + a + b + c 后 toLowerCase()
- 密钥/常量: `key_list=[89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179]; indices1=[23,14,6,36,16,40,7,19]; 固定前缀 'zzc'; dict={0-9,A-F}`
- 输出编码: hex(sha1) + 自定义字母表(索引抽取) + base64(去 /+=) → 最终小写
- 输出长度: 文章示例 o('12345') 结果长 45 字符

## 自算核对（源文章数字重算结果）

- 复算 sha1('12345') = 8CB2237D0679CA88DB6464EAC60DA96345513964，与文章 640 行一致
- 复算 indices1 抽取 = A873DD4，与文章 868/881 行一致
- 复算字节数组 → base64 = '1ZWQ69wr8HRqUN6Rvk1b5srwQNc='（去尾 = 得 '1ZWQ69wr8HRqUN6Rvk1b5srwQNc'），与文章 1289/1299 的 '1ZWQ691L...' 第 7、8 字符不符 → 文章该处为笔误
- 最终串长度实测 = 45（3+7+27+8），与文章示例 'zzca873dd41zwq69wr8hrqun6rvk1b5srwqncdc4c4d03' 一致

## 来源之间的矛盾

- docs/references/52pojie-2022463-某q音乐sign逆向-多角度.md:1289 vs docs/references/52pojie-2022463-某q音乐sign逆向-多角度.md:1287 —— 1289 行称 btoa 结果为 '1ZWQ691L8HRqUN6Rvk1b5srwQNc='，但同段 1287 行给出的字节数组 [213,149,144,235,220,43,...] 实际 btoa 结果应为 '1ZWQ69wr8HRqUN6Rvk1b5srwQNc='（第 7、8 字符为 w/r，非 1/L）（判定: 判定 1289 行（及 1299 行公式里的同段）的 '691L' 为笔误：1299 行给出的最终小写串 '...1zwq69wr...' 与该字节数组一致，可自洽）
- docs/references/52pojie-2022463-某q音乐sign逆向-多角度.md:1299 vs docs/references/52pojie-2022463-某q音乐sign逆向-多角度.md:1299 —— 1299 行同一行内自相矛盾：公式写 '1ZWQ691L8HRqUN6Rvk1b5srwQNc'，而同行结果串中段为 '1zwq69wr8hrqun6rvk1b5srwqnc'（判定: 以结果串与字节数组为准，公式中的 '691L' 为笔误）

## 明确留白（原文未给出，不要臆测）

- 尾段 DC4C4D03 所用的第二组索引数组文章未列出（原文：'自己去找找吧'）
- decodeKeyToNumberArray 里的 dict 与 key_list 正文被省略（原文：'看看日志你也可以做出来的'），key_list 系从日志 d[87] 推得
- 未给 sign 的传输位置（query/header）明细
- 本批文章未出现 zzb / zzcxxx 等参数，故记 null
- 1334257 仅给 'QQ=MD5' 结论并指向外部 PDF 附件，正文无算法细节
