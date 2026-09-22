## 入口与传输

- 生成位置: 无 JS 加密（纯 HTTP 流程；实现方式是 requests.Session 自动管 cookie）
- 触发时机: 登录时顺序调用
- 传输方式: cookie（session 自动携带）；GET query：login_site=E&module=login&rand=sjrand；POST form：appid=otn / username / password / tk

## 排查步骤

1. GET https://kyfw.12306.cn/otn/login/conf 拿 cookie（Session 自动保存）
2. GET /passport/captcha/captcha-image64?login_site=E&module=login&rand=sjrand&... 取 image 字段，base64 解码存 captcha.jpg
3. 看图输入序号 → get_point 映射坐标 → GET /passport/captcha/captcha-check?...&answer=<坐标>，取 result_code，为 '4' 才算成功
4. POST /passport/web/login，form: username/password/appid=otn，结果 result_code 需为 0
5. POST /passport/web/auth/uamtk，form: appid=otn，取 newapptk
6. POST /otn/uamauthclient，data: {'tk': res['newapptk']} 完成 token 校验

## 算法口径

- 家族: `custom`
- 细节: 无签名/加密算法，仅为 6 步流程编排，依赖 session cookie 与 JSON 里的 result_code 分支。验证码答案为坐标字符串（不是原图坐标，而是固定点位映射）。
- 密钥/常量: `验证码序号→坐标映射表：{'1':'37,46','2':'110,46','3':'181,46','4':'253,46','5':'37,116','6':'110,116','7':'181,116','8':'253,116'}`
- 输出编码: none

## 自算核对（源文章数字重算结果）

- 验证码点位核算：map 共 8 项，x ∈ {37,110,181,253}，y ∈ {46,116}；1~4 为第一行 y=46，5~8 为第二行 y=116，每列间隔 71~73 像素，排布合理
- 流程分支核算：共 3 处 result_code 判定（captcha 的 '4'、login 的 0、uamtk 的 0），文章代码逐层 if 嵌套，与 6 步流程一致

## 明确留白（原文未给出，不要臆测）

- 文章未说明 captcha-image64 的 callback/时间戳/_ 参数是否必须（示例里写死）
- 未说明验证码是否还有滑块/交验失败重试逻辑
- 未涉及登录后的业务接口（如查票）
- 2018-11 样本，接口可能已改版；文章未声明仍有效
