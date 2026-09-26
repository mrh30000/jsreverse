# TX云Authorization签名算法，更详细的说明，请求改写JS

> **作者**: 随拾 | **发布时间**: 2020-05-14 09:58:00 | **版块**: 『编程语言区』 | **查看/回复**: 2139 / 3
> **原文**: [https://www.52pojie.cn/thread-1178741-1-1.html](https://www.52pojie.cn/thread-1178741-1-1.html)

---

**之前发过一个帖子，资料可能不全，这次找到了更完整的说明文档，甚至于还有在线测试：** https://cos5.cloud.tencent.com/static/cos-sign/
**在构造签名前，必须先获取TX云账号的 API 密钥对，其中包含 SecretID 和 SecretKey 这两个参数已经可以获取，但是还不会这个签名的算法，请求朋友帮忙写个JS生成下**
**我已经写了易语言获取** **SecretID 和 SecretKey的框架：**https://lanzouj.com/iciyl9e
**抓包数据也在这里，Fiddler抓包数据：**https://lanzouj.com/icf0ckj
**详细步骤原页面：**https://cloud.tencent.com/document/product/436/7778

签名步骤
步骤1：生成 KeyTime

    获取当前时间对应的 Unix 时间戳 StartTimestamp，Unix 时间戳是从 UTC（协调世界时，或 GMT 格林威治时间）1970年1月1日0时0分0秒（北京时间 1970年1月1日8时0分0秒）起至现在的总秒数。
    根据上述时间戳和期望的签名有效时长算出签名过期时间对应的 Unix 时间戳 EndTimestamp。
    拼接签名有效时间，格式为StartTimestamp;EndTimestamp，即为 KeyTime。
    示例：1557902800;1557910000

步骤2：生成 SignKey

使用 HMAC-SHA1 以 SecretKey 为密钥，以 KeyTime 为消息，计算消息摘要（哈希值），即为 SignKey。
示例：36bcd76dbb8c9f066472fec403df8a34cab34c77

步骤3：生成 UrlParamList 和 HttpParameters

    遍历 HTTP 请求参数，生成 key 到 value 的映射 Map 及 key 的列表 KeyList，其中 key 转换为小写形式，value 使用 UrlEncode 编码，没有 value 的参数，则认为 value 为空字符串。例如请求路径为/?acl，则认为是/?acl=。

        说明：

        HTTP 请求参数，即请求路径中?以后的部分，例如请求路径为/?versions&prefix=example-folder%2F&delimiter=%2F&max-keys=10，则请求参数为versions&prefix=example-folder%2F&delimiter=%2F&max-keys=10。

    将 KeyList 按照字典序排序。
    将 Map 和 KeyList 中的 key 使用 UrlEncode 编码，并再次转换为小写形式。
    按照 KeyList 的顺序拼接 Map 中的每一个键值对，格式为key1=value1&key2=value2&key3=value3，即为 HttpParameters。
    按照 KeyList 的顺序拼接 KeyList 中的每一项，格式为key1;key2;key3，即为 UrlParamList。

示例：

    示例一：
    请求路径:/?prefix=example-folder%2F&delimiter=%2F&max-keys=10
    UrlParamList: delimiter;max-keys;prefix
    HttpParameters: delimiter=%2F&max-keys=10&prefix=example-folder%2F

        注意：

       请求路径中的请求参数在实际发送请求时也会进行 UrlEncode，因此要注意不要重复执行 UrlEncode。

    示例二：
    请求路径:/exampleobject?acl
    UrlParamList: acl
    HttpParameters: acl=

步骤4：生成 HeaderList 和 HttpHeaders

    遍历 HTTP 请求头部，生成 key 到 value 的映射 Map 及 key 的列表 KeyList，其中 key 转换为小写形式，value 使用 UrlEncode 编码。
    将 KeyList 按照字典序排序。
    将 Map 和 KeyList 中的 key 使用 UrlEncode 编码，并再次转换为小写形式。
    按照 KeyList 的顺序拼接 Map 中的每一个键值对，格式为key1=value1&key2=value2&key3=value3，即为 HttpHeaders。
    按照 KeyList 的顺序拼接 KeyList 中的每一项，格式为key1;key2;key3，即为 HeaderList。

示例：
请求头：

Host: examplebucket-1250000000.cos.ap-shanghai.myqcloud.com
Date: Thu, 16 May 2019 03:15:06 GMT
x-cos-acl: private
x-cos-grant-read: uin="100000000011"

计算得到 HeaderList 为date;host;x-cos-acl;x-cos-grant-read，HttpHeaders 为date=Thu%2C%2016%20May%202019%2003%3A15%3A06%20GMT&host=examplebucket-1250000000.cos.ap-shanghai.myqcloud.com&x-cos-acl=private&x-cos-grant-read=uin%3D%22100000000011%22。
步骤5：生成 HttpString

根据 HTTP 方法、HTTP 请求路径、HttpParameters 和 HttpHeaders 生成 HttpString，格式为HttpMethod\nUriPathname\nHttpParameters\nHttpHeaders\n。

其中：

    HttpMethod 转换为小写，例如 get 或 put。
    UriPathname 为请求路径，例如/或/exampleobject。
    \n为换行符。如果其中有字符串为空，前后的换行符需要保留，例如get\n/exampleobject\n\n\n。

步骤6：生成 StringToSign

根据 KeyTime 和 HttpString 生成 StringToSign，格式为sha1\nKeyTime\nSHA1(HttpString)\n。
其中：

    sha1 为固定字符串。
    \n为换行符。
    SHA1(HttpString) 为使用 SHA1 对 HttpString 计算的消息摘要。

步骤7：生成 Signature

使用 HMAC-SHA1 以 SignKey 为密钥，以 StringToSign 为消息，计算消息摘要，即为 Signature。
步骤8：生成签名

根据 SecretId、KeyTime、HeaderList、UrlParamList 和 Signature 生成签名，格式为：

q-sign-algorithm=sha1
&q-ak=SecretId
&q-sign-time=KeyTime
&q-key-time=KeyTime
&q-header-list=HeaderList
&q-url-param-list=UrlParamList
&q-signature=Signature

    注意：

    上述格式中的换行仅用于更好的阅读，实际格式并不包含换行。

签名使用

通过 RESTful API 对 COS 发起的 HTTP 签名请求，可以通过以下几种方式传递签名：

    通过标准的 HTTP Authorization 头，例如Authorization: q-sign-algorithm=sha1&q-ak=...&q-sign-time=1557989753;1557996953&...&q-signature=...
    作为 HTTP 请求参数，请注意 UrlEncode，例如/exampleobject?q-sign-algorithm=sha1&q-ak=...&q-sign-time=1557989753%3B1557996953&...&q-signature=...

    说明：

    上述示例中使用...省略了部分具体签名内容。

代码示例
伪代码

KeyTime = [Now];[Expires]
SignKey = HMAC-SHA1([SecretKey], KeyTime)
HttpString = [HttpMethod]\n[HttpURI]\n[HttpParameters]\n[HttpHeaders]\n
StringToSign = sha1\nKeyTime\nSHA1(HttpString)\n
Signature = HMAC-SHA1(SignKey, StringToSign)
