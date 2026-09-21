# BOSS直聘 - browser-check-v2.js 脚本分析

## 1. 概述

- **目标文件**：`https://img.bosszhipin.com/static/zhipin/geek/sdk/browser-check-v2.js`
- **本地归档**：`sources/browser-check-v2.js.orig`
- **脚本性质**：前端现代浏览器特性兼容性拦截脚本（非风控/非反爬/非指纹 SDK）。
- **脚本大小**：~1.2 KB

---

## 2. 核心源码结构与还原

原始脚本经过压缩混淆，格式化并还原变量名后的完整逻辑如下：

```javascript
"use strict";
!function() {
    try {
        // 1. 浏览器厂商判定
        function getBrowserName() {
            var ua = navigator.userAgent.toLowerCase();
            return -1 !== ua.indexOf("msie") || -1 !== ua.indexOf("trident") ? "ie" :
                   -1 !== ua.indexOf("edge") || -1 !== ua.indexOf("edg/") ? "edge" :
                   -1 !== ua.indexOf("firefox") ? "firefox" :
                   -1 !== ua.indexOf("opr") || -1 !== ua.indexOf("opera") ? "opera" :
                   -1 !== ua.indexOf("chrome") ? "chrome" :
                   -1 !== ua.indexOf("safari") ? "safari" : "unknown";
        }

        // 2. 现代 JavaScript 特性检测 (ES6 ~ ES2018)
        function checkModernFeatures() {
            try {
                return new Function(`
                    "use strict";
                    const fn = (x) => x; 
                    let a = \`\${fn(1)}\`; 
                    class C {};
                    async function af() { return await Promise.resolve(1); }
                    const obj = { x: 1, y: 2 }; 
                    const { x, ...rest } = obj; 
                    const merged = { ...obj };
                    const re = /(?<year>\\d{4})/; 
                    re.exec("2018");
                    if (typeof Promise.prototype.finally !== "function") throw new Error();
                    return true;
                `)(), !0;
            } catch (e) {
                return !1;
            }
        }

        // 3. 拦截检测与重定向分流
        function runCheck() {
            try {
                var ua = navigator.userAgent.toLowerCase();
                // 非 IE 且通过现代特性检测 -> 放行，不执行任何拦截
                if (-1 === ua.indexOf("msie") && -1 === ua.indexOf("trident") && checkModernFeatures()) {
                    return;
                }

                var browser = getBrowserName(),
                    param = "&browserName=" + encodeURIComponent(browser || "unknown"),
                    page = "ie" === browser ? "nonsupport.html" : "nonsupport2.html",
                    isDev = -1 !== ["boss-m-qa.weizhipin.com", "pre-www.zhipin.com"].indexOf(window.location.hostname);

                window.location.href = isDev 
                    ? "/web/common/" + page + "?from=geek-pc" + param 
                    : "https://www.zhipin.com/web/common/" + page + "?from=geek-pc" + param;
            } catch (err) {
                console.log(err);
            }
        }

        runCheck();
    } catch (e) {}
}();
```

---

## 3. 检测机制详解

### 3.1 UA 排除层
通过 `navigator.userAgent` 强行排查老旧 IE：
- 检测关键词：`msie`、`trident`
- 命中处理：直接判定为淘汰浏览器，后续重定向至 `nonsupport.html`。

### 3.2 动态语法与 API 门槛 (ES2018 基线)
使用 `new Function(...)` 动态编译执行一段涵盖 ES6 到 ES2018 特性的代码片段，若编译或执行报错则返回 `false`：

| 特性 | 代码片段 | 语言标准 |
| :--- | :--- | :--- |
| **箭头函数** | `const fn = (x) => x;` | ES6 (ES2015) |
| **模板字符串** | ``let a = `${fn(1)}`;`` | ES6 (ES2015) |
| **类声明** | `class C {};` | ES6 (ES2015) |
| **异步函数** | `async function af() { return await Promise.resolve(1); }` | ES8 (ES2017) |
| **对象 Rest / 展开** | `const { x, ...rest } = obj; const merged = { ...obj };` | ES9 (ES2018) |
| **正则命名捕获组** | `/(?<year>\d{4})/.exec("2018");` | ES9 (ES2018) |
| **Promise.prototype.finally** | `typeof Promise.prototype.finally !== "function"` | ES9 (ES2018) |

### 3.3 重定向策略
- **IE 浏览器**：跳转至 `/web/common/nonsupport.html?from=geek-pc&browserName=ie`（提示彻底不受支持）。
- **缺少现代特性的低版本浏览器**：跳转至 `/web/common/nonsupport2.html?from=geek-pc&browserName={name}`（提示升级现代浏览器）。
- **环境识别**：区分了 QA (`boss-m-qa.weizhipin.com`)、预发 (`pre-www.zhipin.com`) 和线上生产域名。

---

## 4. 逆向与爬虫环境注意事项

1. **Headless / 补环境**：
   - 只要使用 Node v10+ 或现代 Chromium / Firefox / WebKit 内核，均默认支持 ES2018，可直接放行。
   - 自定义注入的 `navigator.userAgent` 切勿携带 `MSIE` 或 `Trident` 字符串，否则会触发拦截重定向。
2. **非风控脚本**：
   - 此脚本不涉及指纹上报、Cookie 加密（如 `__zp_stoken__`）、滑块验证码或设备指纹生成。
