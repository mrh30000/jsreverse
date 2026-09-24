## 入口与传输

- 生成位置: JS 中生成 sign 的 export 函数（1474990 称函数 L，1897565 未命名），另有函数 n 参与
- 触发时机: 请求前（接口 https://fanyi.baidu.com/v2transapi?from=en&to=zh）
- 传输方式: 未明确（接口 query 中含 sign）

## 入口三步链（B29 追加，源文 52pojie-1974598）

1. `GET https://fanyi.baidu.com/`（**不带 cookie**，**手机 UA**）→ 从 `Set-Cookie` 取 `BAIDUID`。
2. 带 `BAIDUID` **再** GET 一次主页 → 从 HTML 里取 `page.common.token`（形如 `token: '3079487e…'`）。
   不带 BAIDUID 时该字段是空串，页面自己会 `location.reload()`。
3. `POST https://fanyi.baidu.com/basetrans`，form body：`query=<待译词>&from=en&to=zh&token=<上一步>&sign=<现算>`。
   实测 cookie **只需保留 `BAIDUID` 与 UA** 两项（源文：逐条删 cookie 看返回结果验证过）。

> ⚠️ 第 1/2 步的 UA 必须是**手机 UA**：手机与 PC 返回的是不同页面（源文推测是 nginx 路由层分流）。

## 排查步骤

1. 打开 fanyi.baidu.com，抓 https://fanyi.baidu.com/v2transapi?from=en&to=zh
2. 确认只有 sign 随翻译词变化，全局搜 sign
3. 在 sign:xx() 处下断点，进入生成函数（参数 t 为待翻译词）
4. 扣出 export 函数与依赖函数 n，补固定常量 r='320305.131321201' 后运行得到 sign

## 算法口径

- 家族: `null`
- 细节: unknown（两篇文章均以截图/描述为主，未给出 sign 的算法公式或拼接规则）
- 密钥/常量: `固定常量 r = "320305.131321201"（1897565:42）`
- 输出编码: unknown

## 自算核对（源文章数字重算结果）

- 两篇文章都未给出 sign 的算法公式（1474990 正文几乎全为截图，仅描述函数 L/i/n/r；1897565 只给固定常量 r 与函数名），故 family/detail 置 null/unknown

## 明确留白（原文未给出，不要臆测）

- sign 的算法族（是否 MD5）文章未提及 → 团队要求的 md5(appid+query+salt+key) 口径在本批 8 篇中无任何依据，故不写
- appid / salt / token 等参数名两篇文章均未出现
- sign 的输出编码与长度未知
- 1474990 关键步骤为截图，无正文可引（evidence: screenshot-only）

## 工具选型坑（B29 追加）

- `translate.js` 里存在**永远走不到**的分支，其中调用了未定义函数：
  浏览器与 python-js2py 都不报错，**otto 会直接报错**（源文因此放弃 otto，改用原生 JS 跑）。
- 判据：把 JS 引擎换成 otto 后报 `undefined function` 之类的错误，**先别改算法**，
  那是引擎对「未定义函数」的严格程度差异。
