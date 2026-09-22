## 入口与传输

- 生成位置: chameleon 反爬脚本 main（jsvmp 字节码），初始化 W()/Init；文中的 main 内写有 var TOKEN_SERVER_TIME；生成后由 setCookie 写入 document.cookie(name=v)，同时写 localStorage(hexin-v)
- 触发时机: 页面加载初始化（chameleon 初始化末尾 setInterval(getServerTime, 1200000) 每 20 分钟刷新）
- 传输方式: cookie：hexin-v 与 v（2128820 的 requests 里同时带 cookies={"hexin-v": token, "v": token}）；2128911 的请求头里也放了 "hexin-v": v

## 排查步骤

1. 补环境清单（按 2128820 的 env.js 结构）：0.location（host/href 必须与目标页一致）；1.native 函数保护（hook Function.prototype.toString 返回 [native code]）；2.EventTarget / Node / Element 原型链；3.伪 canvas 2D context（document.createElement('canvas').getContext）；4.document（含 cookie 访问器 set/get、documentElement、createElement、getElementsByTagName、appendChild/insertBefore/removeChild/setAttribute/getAttribute）；5.navigator（userAgent/plugins:{length:0}/webdriver:false/languages:['zh-CN']/platform:'Win32'/vendor:'Google Inc.'/vendorSub:''）；6.location / history / screen；7.Storage（localStorage / sessionStorage 需挂 Storage.prototype，setItem/getItem/removeItem/clear）；8.XMLHttpRequest / fetch / Headers / Request；9.window 常用属性与构造器；10.定时器（setInterval 包一层 unref，避免进程常驻）
2. 隐藏 Node 痕迹：delete global/process/require/module/exports/__dirname/__filename，再 require('./env')
3. 读取 chameleon main 源码，用正则把 var TOKEN_SERVER_TIME = <数字>; 替换成当前秒级时间
4. vm.runInThisContext(src) 触发 Init→W()，token 写入 cookie(v) 与 localStorage(hexin-v)
5. 提取 token：cookie 解析 /(?:^|;\s*)v=([^;]+)/ 优先，失败再读 localStorage['hexin-v'] 兜底；stdout 只打印 token 一行，供 Python 解析
6. Python 侧：subprocess.run(['node','run.js'], encoding='utf-8', errors='ignore', timeout=30) 取首行 token；按时间缓存（示例 max_age=60s），失败或 200 无数据时强制换新 token 重试
7. 请求行情页 https://q.10jqka.com.cn/index/index/board/all/field/{field}/order/{order}/page/{page}/ajax/1/，带 cookies={'hexin-v': token, 'v': token} 与与 env 一致的 UA
8. 解析 table.m-table → thead th / tbody tr td，从 span.page_info 的 "1/279" 取总页数

## 算法口径

- 家族: `custom`
- 细节: 签名算法本文未给出：两篇都只有 chameleon 的 JSVMP 字节码（一篇作为压缩包附件、一篇把 jsvmp 源码内联贴在正文），未还原为可读的哈希/编码步骤。文章明确可知的算法特征：① 内部编码了 strhash(navigator.userAgent)，UA 不一致即被判异常；② token 编码了 TOKEN_SERVER_TIME，过期被服务端拒绝；③ jsvmp 字符串表里出现 URL-safe base64 字母表 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_、32 个 '1' 的掩码、常量 9527 / 2333 / 1200000 等；④ 初始化流程为 Init → W()。
- 密钥/常量: `URL-safe base64 字母表 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"（出现在 jsvmp 字符串表中，用途文章未说明）；'11111111111111111111111111111111'；9527；2333；1200000`
- 输出编码: unknown

## 自算核对（源文章数字重算结果）

- jsvmp 字符串表核算：'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' 共 64 个字符 → URL-safe base64 字母表（- 和 _ 代替 + 和 /），说明 token 可能用 base64url 编码
- cookie 提取正则核算：/(?:^|;\s*)v=([^;]+)/ 与 chameleon 写 cookie 的形态 'v=<token>; domain=…; path=/; expires=…' 匹配，能正确取到 token；不会误匹配 hexin-v（因要求 v 前是行首或 '; '）
- TOKEN_SERVER_TIME 示例 1789789000.668 换算为 2026-09-19 附近（秒级 Unix 时间戳），与文章发布时间 2026-09-19 吻合
- setInterval(getServerTime, 1200000) 的 1200000ms = 20 分钟，与注释「20 分钟的定时器」一致

## 来源之间的矛盾

- docs/references/52pojie-2128820-Ai逆向同花顺网站采集数据.md:539 vs docs/references/52pojie-2128911-手动补环境过同花顺网站.md:1774 —— token 落点表述不一：2128820 的 getHexinV() 同时读 cookieJar['hexin-v'] 与 cookieJar['v']；2128911 明确说「token 已写入 document.cookie(name=v) 与 localStorage(hexin-v)」。（判定: 不矛盾，可合并理解：cookie 名为 v，localStorage 键为 hexin-v；2128820 为兼容两种写法做了双读。以 2128911 的内联 jsvmp 导出代码为准。）
- docs/references/52pojie-2128820-Ai逆向同花顺网站采集数据.md:53 vs docs/references/52pojie-2128911-手动补环境过同花顺网站.md:345 —— 两篇补环境里的 UA 不同：Chrome/140.0.0.0 vs Chrome/153.0.0.0（含 Edg/153.0.0.0）。（判定: 不是矛盾，是两次不同时间的样本；由「必须与自身 env 一致」的规则可知只要 UA 与所选 env 匹配即可，UA 本身不是固定值。）

## 明确留白（原文未给出，不要臆测）

- 签名算法本文未给出：hexin-v 的生成算法（哈希/编码/字段构成）两篇都未还原，只有 JSVMP 字节码（一篇是压缩包附件、一篇内联贴出 jsvmp 源码）
- X-Antispider-Message 头的取值规则与是否需要携带未说明
- hexin-v 的长度与字符集文章未给示例值（只提到 jsvmp 里有 base64url 字母表，属间接证据）
- cookie 的 domain/path/expires 具体值未给出（只给匹配正则）
- 行情接口是否需要额外 header（如 Referer 之外的风控头）未说明
