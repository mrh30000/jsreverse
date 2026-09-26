# 腾讯云 COS Authorization 签名 · workflow

> 算法侧结论见 `metadata.json`；本文件只给可执行步骤。
> 官方在线对拍页（源文给出）：https://cos5.cloud.tencent.com/static/cos-sign/

1. 在控制台拿到 **API 密钥对**：`SecretID`（公开，进 `q-ak`）+ `SecretKey`（保密，只当 HMAC 的 key）。
   抓一条成功请求，确认 `Authorization` 形如
   `q-sign-algorithm=sha1&q-ak=...&q-sign-time=<t0>;<t1>&q-key-time=<t0>;<t1>&q-header-list=...&q-url-param-list=...&q-signature=<40hex>`。

2. 量 **KeyTime**：`t0` 是当前 Unix 秒、`t1 - t0` 是签名有效期（源文示例 `1557902800;1557910000` ⇒ 7200 秒）。
   只取**秒**，不要毫秒。

3. 派生 **SignKey**（这一步最容易漏）：

   ```python
   import hmac, hashlib
   def hmac_sha1_hex(key: bytes, msg: bytes) -> str:
       return hmac.new(key, msg, hashlib.sha1).hexdigest()
   key_time = f"{start_ts};{end_ts}"
   sign_key = hmac_sha1_hex(secret_key.encode(), key_time.encode())
   ```

4. 构造 **UrlParamList / HttpParameters**：

   ```text
   ① 取请求路径 ? 之后的参数，解析成 (key, value) 对；无 value 的按空串算
   ② key 转小写 -> UrlEncode -> 再转小写
   ③ 按 key 字典序排序
   ④ UrlParamList  = ";".join(keys)
      HttpParameters = "&".join(f"{k}={urlencode(v)}")
   ```

   注意：请求行里已经编码过的参数**不要重复编码**（源文原话，见 `metadata.json` 的 sources line 49）。

5. 构造 **HeaderList / HttpHeaders**：规则与第 4 步完全相同。源文示例
   （`Host` / `Date` / `x-cos-acl` / `x-cos-grant-read`）：

   ```text
   HeaderList  = date;host;x-cos-acl;x-cos-grant-read
   HttpHeaders = date=Thu%2C%2016%20May%202019%2003%3A15%3A06%20GMT&host=examplebucket-1250000000.cos.ap-shanghai.myqcloud.com&x-cos-acl=private&x-cos-grant-read=uin%3D%22100000000011%22
   ```

6. 拼 **HttpString**（方法小写；**结尾必须有一个换行**；空段也要留换行）：

   ```python
   http_string = f"{method.lower()}\n{uri_pathname}\n{http_parameters}\n{http_headers}\n"
   ```

   自检用例：`get\n/exampleobject\n\n\n` 是合法形态。

7. 拼 **StringToSign** 并算 Signature：

   ```python
   string_to_sign = f"sha1\n{key_time}\n{hashlib.sha1(http_string.encode()).hexdigest()}\n"
   signature = hmac_sha1_hex(sign_key.encode(), string_to_sign.encode())
   ```

8. 组装 `Authorization`（**无换行**），按需放进头或 query：

   ```text
   q-sign-algorithm=sha1&q-ak=<SecretID>&q-sign-time=<KeyTime>&q-key-time=<KeyTime>&q-header-list=<HeaderList>&q-url-param-list=<UrlParamList>&q-signature=<Signature>
   ```

   作为 query 传递时整串要 UrlEncode（`;` -> `%3B`）。

## 验收

1. 用第 8 步的串发一次请求，期望 **200**（不是 403）。
2. 或把 SecretID / SecretKey / KeyTime / HttpString 喂官方在线对拍页，与本机 `Signature` 逐字符对比。

## 排错顺序

1. 403 `SignatureDoesNotMatch`，且**不带任何 query 的请求能过** ⇒ 先查「URL 参数被重复编码」（第 4 步）。
2. 403，且 HttpString 与官方示例形态不同 ⇒ 查结尾的换行（第 6 步）。
3. 403，且 `sign_key` 与源文示例 `36bcd76dbb8c9f066472fec403df8a34cab34c77` 对不上 ⇒ 查 KeyTime 的秒/毫秒（第 2 步）。
4. 报参数缺失 ⇒ 查 `q-key-time` 是否漏填（第 8 步）。
5. 报签名过期 ⇒ KeyTime 取的是**绝对秒**，不是相对时长（第 2 步）。

## 明确留白（源文未给出，不要臆测）

- 源文只给了 `SignKey` 一个示例值（`36bcd76dbb8c9f066472fec403df8a34cab34c77`），
  **未给 `Signature` / `HttpString` / `StringToSign` 的完整示例** ⇒ 首次落地必须靠官方在线页或真实抓包对拍。
- 本蓝图只覆盖 COS 的 sha1 版。若目标出现别的 `q-sign-algorithm`，先按「同骨架换哈希」处理，并回写本蓝图。
