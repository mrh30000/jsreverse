## 入口与传输

- 生成位置: 内部方法 `_onRequestTokenRemotely`（补环境时是空函数，必须自行实现）与 `_$rds`（获取 token）；2022 版对应 `test` 函数
- 触发时机: 首次签名/清空 cookie 后（文章：『每次清空cookie之后的算法都是不一样的』）
- 传输方式: 内部 HTTP 请求到 https://cactus.jd.com/request_algo（2022 版文中写作 `*.*.com/request_algo?g_ty=ajax`）；结果落到 localStorage

## 排查步骤

1. hook `_$rds`（或搜 `_onRequestTokenRemotely`）确认 token 是否真的走了远端请求。
2. 检查 localStorage 里 `WQ_dy_algo_s_f06cc_4.3`（算法体）与 `WQ_dy_tk_s_f06cc_4.3`（token）是否存在；清空后刷新，抓 `request_algo` 响应。
3. 比对生成的 h5st 中 token 前缀：tk05 说明走了本地兜底，tk03 才是远端值。
4. 用 Proxy 监控 `_$clt` 读到的属性，确认环境补全没有破坏 token 请求（如 navigator.userAgent 被 Node 内置对象覆盖）。

## 算法口径

- 家族: `custom`
- 细节: 不是本地算法：token 与签名算法体（VM 代码）由服务端下发，本地无法推导。补环境时必须实现可真正发 HTTP 的 XMLHttpRequest，否则 `_onRequestTokenRemotely` 为空函数、token 走本地兜底路径
- 密钥/常量: `null（远端下发，无固定盐值）`
- 输出编码: none

## 自算核对（源文章数字重算结果）

- 2092635 的 token 来源路径闭环核对：`_$rds` 获取 token → `_onRequestTokenRemotely` 为空 → 未发请求 → token=tk05 → 403；实现 XHR 后 token=tk03，与文章叙述一致（但文章最终仍未成功，见 gaps）

## 来源之间的矛盾

- docs/references/52pojie-1669042-京东试用h5st参数.md:80 vs docs/references/2092635-h5st-ai-env-patching.md:332 —— 同一接口两个写法：2022 版写作 `*.*.com/request_algo?g_ty=ajax`（域名被脱敏），2025 版写作 `https://cactus.jd.com/request_algo`（无 `?g_ty=ajax`）（判定: 判定为同一接口的不同时期/不同脱敏写法，不能据 2022 的脱敏串判定域名；以 2092635 的完整 URL 为准（高置信），`?g_ty=ajax` 是否仍需保留无法判定）

## 明确留白（原文未给出，不要臆测）

- request_algo 的请求体/签名/返回 JSON 结构文章未给出
- `WQ_dy_algo_s_f06cc_4.3` 中 `f06cc` 段含义未说明（可能是站点/业务标识）
- 2092635 全文**没有验证成功**：修好 token 后依然 403，文章在『第七轮』排查 navigator 的表格中途截断（文件最后一行即 `navigator.userAgent`），结论缺失
- tk03/tk05 前缀的具体编码含义文章未说明
