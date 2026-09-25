# web逆向，遇到加密js。

> **作者**: Aerfa9527 | **发布时间**: 2025-04-09 11:54:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1328 / 3
> **原文**: [https://www.52pojie.cn/thread-2022671-1-1.html](https://www.52pojie.cn/thread-2022671-1-1.html)

---

[JavaScript] *纯文本查看*

```
function(e) {
            return new Promise((function(t, n) {
                var p, m = e.data, g = e.headers, v = e.responseType;
                function y() {
                    e.cancelToken && e.cancelToken.unsubscribe(p),
                    e.signal && e.signal.removeEventListener("abort", p)
                }
                r.isFormData(m) && r.isStandardBrowserEnv() && delete g["Content-Type"];
                var b = new XMLHttpRequest;
                if (e.auth) {
                    var w = e.auth.username || ""
                      , x = e.auth.password ? unescape(encodeURIComponent(e.auth.password)) : "";
                    g.Authorization = "Basic " + btoa(w + ":" + x)
                }
                var _ = s(e.baseURL, e.url);
                function C() {
                    if (b) {
                        var r = "getAllResponseHeaders"in b ? l(b.getAllResponseHeaders()) : null
                          , o = v && "text" !== v && "json" !== v ? b.response : b.responseText
                          , a = {
                            data: o,
                            status: b.status,
                            statusText: b.statusText,
                            headers: r,
                            config: e,
                            request: b
                        };
                        i((function(e) {
                            t(e),
                            y()
                        }
                        ), (function(e) {
                            n(e),
                            y()
                        }
                        ), a),
                        b = null
                    }
                }
                if (b.open(e.method.toUpperCase(), a(_, e.params, e.paramsSerializer), !0),
                b.timeout = e.timeout,
                "onloadend"in b ? b.onloadend = C : b.onreadystatechange = function() {
                    b && 4 === b.readyState && (0 !== b.status || b.responseURL && 0 === b.responseURL.indexOf("file:")) && setTimeout(C)
                }
                ,
                b.onabort = function() {
                    b && (n(new h("Request aborted",h.ECONNABORTED,e,b)),
                    b = null)
                }
                ,
                b.onerror = function() {
                    n(new h("Network Error",h.ERR_NETWORK,e,b,b)),
                    b = null
                }
                ,
                b.ontimeout = function() {
                    var t = e.timeout ? "timeout of " + e.timeout + "ms exceeded" : "timeout exceeded"
                      , r = e.transitional || u;
                    e.timeoutErrorMessage && (t = e.timeoutErrorMessage),
                    n(new h(t,r.clarifyTimeoutError ? h.ETIMEDOUT : h.ECONNABORTED,e,b)),
                    b = null
                }
                ,
                r.isStandardBrowserEnv()) {
                    var A = (e.withCredentials || c(_)) && e.xsrfCookieName ? o.read(e.xsrfCookieName) : void 0;
                    A && (g[e.xsrfHeaderName] = A)
                }
                "setRequestHeader"in b && r.forEach(g, (function(e, t) {
                    "undefined" === typeof m && "content-type" === t.toLowerCase() ? delete g[t] : b.setRequestHeader(t, e)
                }
                )),
                r.isUndefined(e.withCredentials) || (b.withCredentials = !!e.withCredentials),
                v && "json" !== v && (b.responseType = e.responseType),
                "function" === typeof e.onDownloadProgress && b.addEventListener("progress", e.onDownloadProgress),
                "function" === typeof e.onUploadProgress && b.upload && b.upload.addEventListener("progress", e.onUploadProgress),
                (e.cancelToken || e.signal) && (p = function(e) {
                    b && (n(!e || e && e.type ? new d : e),
                    b.abort(),
                    b = null)
                }
                ,
                e.cancelToken && e.cancelToken.subscribe(p),
                e.signal && (e.signal.aborted ? p() : e.signal.addEventListener("abort", p))),
                m || (m = null);
                var S = f(_);
                S && -1 === ["http", "https", "file"].indexOf(S) ? n(new h("Unsupported protocol " + S + ":",h.ERR_BAD_REQUEST,e)) : b.send(m)
            }
            ))
        }
```

请求接口的时候，会把请求参数转换为 字符串 例如 ‘a=&b=&c=&’ ，最终在最后一行代码，b.send(m) 发起请求，但是我更到send函数，是一个加密算法，看看各位大神是否有遇到过？
加密js太大了，上传不了
(function(\_$cT, \_$kd) {
........
)($\_ts.scj, $\_ts.aebi);
加密算法是这样的结构
