# 猿人学第二题 js混淆-动态cookie1

> **作者**: thesky123 | **发布时间**: 2026-09-15 04:11:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 800 / 7
> **原文**: [https://www.52pojie.cn/thread-2128072-1-1.html](https://www.52pojie.cn/thread-2128072-1-1.html)

---

## h1 猿人学第二题 js混淆-动态cookie1

刚进入网页遇见无限debugger，

使用油猴脚本

```
// ==UserScript==
// @name         Leave-debugger
// @namespace    https://github.com/SherryBX/Leave-debugger
// @version      v2.2.0
// @description  用于破解网页无限debugger，支持多种调试方式拦截
// @AuThor       Sherry
// @match        *://*/*
// @include      *://*/*
// @run-at       document-start
// @license      MIT
// @Icon         https://mms0.baidu.com/it/u=2886239489,318124131&fm=253&app=138&f=JPEG?w=800&h=800
// @downloadURL  https://update.greasyfork.org/scripts/524858/Leave-debugger.user.js
// @updateURL    https://update.greasyfork.org/scripts/524858/Leave-debugger.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // 配置项
    const CONFIG = {
        version: 'v2.2.0',
        debugMode: false, // 调试模式开关
        checkPatterns: ['debugger', 'debug', 'DevTools'], // 检查的关键字模式
    };

    // 统一的日志输出
    const Logger = {
        styles: {
            main: 'color: #43bb88; font-size: 14px; font-weight: bold;',
            info: 'color: #666; font-size: 12px;',
            hook: 'color: #43bb88;'
        },
        print(message, style = 'main') {
            console.log(`%c ${message}`, this.styles[style]);
        },
        debug(...args) {
            if (CONFIG.debugMode) {
                console.log('[Debug]', ...args);
            }
        }
    };

    // Hook 状态管理
    const HookManager = {
        notified: new Set(),
        markNotified(type) {
            if (!this.notified.has(type)) {
                this.notified.add(type);
                Logger.print(`🎯 Hook ${type} debugger!`, 'hook');
            }
        }
    };

    // 工具函数
    const Utils = {
        // 安全地检查函数字符串
        safeToString(func) {
            try {
                const str = Function.prototype.toString.call(func);
                return typeof str === 'string' ? str.replace(/\s+/g, '') : '';
            } catch (e) {
                Logger.debug('toString error:', e);
                return '';
            }
        },
        // 检查是否包含调试相关代码
        containsDebugger(content) {
            if (!content) return false;
            return CONFIG.checkPatterns.some(pattern => content.includes(pattern));
        },
        // 创建空函数
        createEmptyFunction() {
            return function () { return -1; };
        }
    };

    // Hook 实现
    const Hooks = {
        // Hook Function constructor
        hookConstructor() {
            const original = Function.prototype.constructor;
            Function.prototype.constructor = function (string) {
                if (Utils.containsDebugger(string)) {
                    HookManager.markNotified('constructor');
                    return Utils.createEmptyFunction();
                }
                return original.apply(this, arguments);
            };
        },

        // Hook setInterval
        hookSetInterval() {
            const original = window.setInterval;
            window.setInterval = function (func, delay) {
                if (typeof func === 'function' && Utils.containsDebugger(Utils.safeToString(func))) {
                    HookManager.markNotified('setInterval');
                    return Utils.createEmptyFunction();
                }
                return original.apply(this, arguments);
            };
        },

        // Hook setTimeout
        hookSetTimeout() {
            const original = window.setTimeout;
            window.setTimeout = function (func, delay) {
                if (typeof func === 'function' && Utils.containsDebugger(Utils.safeToString(func))) {
                    HookManager.markNotified('setTimeout');
                    return Utils.createEmptyFunction();
                }
                return original.apply(this, arguments);
            };
        },

        // Hook eval
        hookEval() {
            const original = window.eval;
            window.eval = function (string) {
                if (Utils.containsDebugger(string)) {
                    HookManager.markNotified('eval');
                    string = string.replace(/debugger\s*;?/g, '');
                }
                return original.call(this, string);
            };
            // 保持 toString 的原始行为
            Object.defineProperty(window.eval, 'toString', {
                value: function() { return original.toString(); },
                configurable: false,
                writable: false
            });
        }
    };

    // 错误处理
    const ErrorHandler = {
        setup() {
            window.addEventListener('error', function (event) {
                if (event.error?.message?.includes('Cannot read properties') ||
                    event.error?.message?.includes('Cannot set property')) {
                    event.preventDefault();
                    Logger.debug('Prevented error:', event.error.message);
                    return false;
                }
            }, true);
        }
    };

    // 初始化
    function initialize() {
        Logger.print('Leave-debugger 已启动 🚀');
        Logger.print(`Version: ${CONFIG.version} 📦`, 'info');
        Logger.print('Author: Sherry 🛡️', 'info');

        // 应用所有 hooks
        Object.values(Hooks).forEach(hook => {
            try {
                hook();
            } catch (e) {
                Logger.debug('Hook error:', e);
            }
        });

        // 设置错误处理
        ErrorHandler.setup();
    }

    // 启动脚本
    initialize();
})();
```

成功过掉debugger，

打开F12,观察请求数据包，发现要逆向的是cookie中的m参数，使用Hook代码进行hook

```
(function get_cookie(){
    var cookie_temp =''
    Object.defineProperty(document,"cookie",{
        set : function(val){
            if (val.indexOf('m') !=-1){
                debugger;
            }
            console.log('Hook捕获到m设置->',val);
            cookie_temp = val;
            return val;

        },
        get : function(){
            return cookie_temp;
        }
    });
})();
```

hook成功如下
[![pnnu6pV.png](https://s41.ax1x.com/2026/09/15/pnnu6pV.png)](https://imgchr.com/i/pnnu6pV)
向上跟栈
[![pnnusf0.png](https://s41.ax1x.com/2026/09/15/pnnusf0.png)](https://imgchr.com/i/pnnusf0)

```
document[$dbsm_0x17c7('\x30\x78\x39\x36', '\x72\x26\x50\x55') + $dbsm_0x17c7('\x30\x78\x34\x65\x33', '\x50\x21\x5a\x40')] = _0x2528b8['\x43\x78\x6a' + '\x4b\x44'](_0x2528b8['\x6b\x78\x50' + '\x5a\x4c'](_0x2528b8['\x65\x42\x74' + '\x51\x49'](_0x2528b8['\x64\x53\x4c' + '\x51\x51'](_0x2528b8[$dbsm_0x17c7('\x30\x78\x32\x64\x37', '\x58\x73\x6f\x38') + '\x51\x51'](_0x2528b8[$dbsm_0x17c7('\x30\x78\x64\x37', '\x74\x6a\x55\x58') + '\x47\x75']('\x6d', _0x2528b8[$dbsm_0x17c7('\x30\x78\x33\x63\x33', '\x38\x29\x36\x5b') + '\x4c\x5a'](_0x37bc5d)), '\x3d'), _0x2528b8['\x54\x63\x58' + '\x42\x47'](_0xd59548, _0x2fa5cc)), '\x7c'), _0x2fa5cc), _0x2528b8[$dbsm_0x17c7('\x30\x78\x31\x38', '\x68\x7a\x32\x76') + '\x41\x5a']);
```

发现hook跟栈断住的是这里，document[]里面的肯定是"cookie"不用想，经过验证确实是这样
[![pnnurYq.png](https://s41.ax1x.com/2026/09/15/pnnurYq.png)](https://imgchr.com/i/pnnurYq)
这么一看结构就很清晰了=左边的可以不用要，=号右边的保留，这样的话 ，

```
m = _0x2528b8['\x54\x63\x58' + '\x42\x47'](_0xd59548, _0x2fa5cc) + '|' + _0x2fa5cc;
```

其中\_0x2528b8是个对象，\_0x2528b8['\x54\x63\x58' + '\x42\x47']是个函数跟过去查看是

```
_0x16ad56[$dbsm_0x17c7('\x30\x78\x34\x61\x61', '\x57\x24\x42\x61') + '\x42\x47'] = function(_0xe39150, _0x27d0fc) {
        return _0xe39150(_0x27d0fc);
    }
```

因此可以继续对m进行改写，其中\_0x2fa5cc是13位时间戳，可以自己生成，那么剩下来的就是扣代码了，重点是 \_0xd59548这个函数

```
m = _0xd59548(_0x2fa5cc) + '|' + _0x2fa5cc;
```

扣代码时会遇见反调试，扣代码时遇见的问题，可以丢给AI进行分析

## h3 1.`$dbsm_0x17c7` 里的反调试

```
var _0x89d3a3 = function(_0x3e259d) {
    this['lYIPmV'] = _0x3e259d;
    this['TWAexT'] = [0x1, 0x0, 0x0];
    this['VvPjIw'] = function() { return 'newState'; };
    this['ecEyCl'] = '\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';
    this['ypByWx'] = '[\x27|\x22].+[\x27|\x22];?\x20*}';
};
_0x89d3a3['prototype']['IoDeMC'] = function() {
    var _0x383f0b = new RegExp(this['ecEyCl'] + this['ypByWx']);
    var _0x197f1f = _0x383f0b['test'](this['VvPjIw']['toString']()) ? --this['TWAexT'][0x1] : --this['TWAexT'][0x0];
    return this['zFlzrQ'](_0x197f1f);
};
_0x89d3a3['prototype']['zFlzrQ'] = function(_0x358e5b) {
    if (!Boolean(~_0x358e5b)) return _0x358e5b;
    return this['xEYmTx'](this['lYIPmV']);
};
_0x89d3a3['prototype']['xEYmTx'] = function(_0x28831c) {
    for (var _0x4e3e26 = 0x0, _0x165d64 = this['TWAexT']['length']; _0x4e3e26 < _0x165d64; _0x4e3e26++) {
        this['TWAexT']['push'](Math['round'](Math['random']()));
        _0x165d64 = this['TWAexT']['length'];   // 每次循环都更新长度，导致永远循环
    }
    return _0x28831c(this['TWAexT'][0x0]);
};
new _0x89d3a3($dbsm_0x17c7)['IoDeMC']();
```

原理：

* +正则 `\w+ *\(\) *{\w+ *['|"].+['|"];? *}` 用来检测 `VvPjIw.toString()` 是否保持原始格式（即 `function() { return 'newState'; }` 这种单行形式）。
* 如果代码被格式化（比如有换行、缩进），正则匹配失败，则 `_0x197f1f = --this['TWAexT'][0x0]`，`TWAexT` 初始为 `[1,0,0]`，`--` 后 `TWAexT[0]` 变成 `0`。
* 然后 `zFlzrQ` 中 `~0 = -1` 为真，进入 `xEYmTx`。
* `xEYmTx` 里的 `for` 循环条件 `_0x4e3e26 < _0x165d64`，而 `_0x165d64` 在循环体内被更新为 `this['TWAexT'].length`，每次 `push` 后长度增加，条件永远成立，数组无限膨胀，最终抛出 `RangeError: Invalid array length`，浏览器卡死。

去除方法：
直接注释掉最后一行

```
// new _0x89d3a3($dbsm_0x17c7)['IoDeMC']();
```

## h3 2. `_0xf0a64d` 检测 `$dbsm_0x3db563` 与正则篡改

```
if (_0x2528b8['\x71\x4d\x4c' + '\x53\x41'] === _0x2528b8['\x31\x39\x35' + '\x66\x62']) {
    var _0x284d57 = new RegExp(YSjRgp['\x30\x33' + '\x54\x6c']);
    var _0x11be10 = new RegExp(YSjRgp['\x64\x66' + '\x4c\x61'], 'i');
    var _0x267fad = YSjRgp['\x63\x74\x74' + '\x59\x50']($dbsm_0x3db563, YSjRgp['\x33\x30' + '\x69\x59']);
    if (!_0x284d57['\x74\x65\x73\x74'](YSjRgp['\x68\x71\x7a' + '\x6d\x49'](_0x267fad, YSjRgp['\x31\x62\x37' + '\x64\x63'])) ||
        !_0x11be10['\x74\x65\x73\x74'](YSjRgp['\x32\x39\x61' + '\x6d\x49'](_0x267fad, YSjRgp['\x33\x30\x66' + '\x57\x55']))) {
        YSjRgp['\x33\x37\x35' + '\x6e\x5a'](_0x267fad, '0');   // 篡改 toString
    } else {
        YSjRgp['\x34\x31\x34' + '\x46\x78']($dbsm_0x3db563);    // 调用死循环函数
    }
} else {
    var _0x350b74 = !![];
    return function(_0x2d6199, _0x88c083) { ... };
}
```

原理：

* `$dbsm_0x3db563` 是源代码末尾定义的一个全局函数，内部包含死循环 + `debugger`。
* 这里用两个正则检查 `$dbsm_0x3db563.toString()` 是否被 Hook 或篡改。如果检测到异常，会执行 `_0x267fad('0')` 修改 `Function.prototype.toString`；如果正常，则直接调用 `$dbsm_0x3db563()`，从而触发死循环。
* 条件 `_0x2528b8['\x71\x4d\x4c' + '\x53\x41'] === _0x2528b8['\x31\x39\x35' + '\x66\x62']` 在正常环境下可能为假，从而走 `else` 分支返回一个无害函数。但为了保险，扣代码时最好直接修改。

去除方法：

* 将整个 `if` 条件改为 `if (false)`，或者直接删除 `_0xf0a64d` 的立即执行。
* 或者将 `$dbsm_0x3db563` 函数体清空，让它什么都不做。

## h3 3.`_0x2fc380` 中的 `console.log` 检测与死循环

原理：

* `_0x2fc380` 返回一个函数，该函数内部会检测 `console.log` 是否被改写。如果发现 `console.log` 被 Hook，会进入 `while(1){ console.log(...); debugger; }` 死循环。
* 同时还会检测一些字符串比较，决定是否执行 `_0x112ece` 等加密函数。

去除方法：

* 在扣代码时，直接注释掉 `_0x2fc380` 的调用，或者修改其内部条件，使其永远返回无害函数。

## h3 4. `_0x13168f` —— 纯粹的死循环 + `debugger`

```
function _0x13168f(_0x109608, _0x338448) {
    if (_0x2528b8['\x34\x65' + '\x48\x42'](_0x2528b8['\x34\x61\x64' + '\x56\x53'], _0x2528b8['\x37\x62' + '\x56\x53'])) {
        while (0x1) {
            console['\x6c\x6f\x67'](_0x2528b8['\x6a\x55\x6e' + '\x4d\x57']);
            debugger ;
        }
    } else {
        ...
    }
}
```

原理：

* 当两个字符串比较相等时，进入 `while(1)`，不断输出日志并触发 `debugger`，让调试者无法继续。

去除方法：

* 修改条件为 `if (false)`，或者直接让函数返回。

## h3 5. `qz` + `eval` 注入：重写 `console.log` 进行爆破

```
qz = [0xa, 0x63, 0x6f, 0x6e, 0x73, 0x6f, 0x6c, 0x65, ...]; // 一段编码的 JS
_0x2528b8['\x79\x4f\x75' + '\x61\x51'](eval, _0x2528b8['\x31\x31\x34' + '\x61\x51'](_0x1c1e7a, qz));
```

原理:

* `qz` 是一个字节数组，通过 `_0x1c1e7a` 解码成字符串，然后 `eval` 执行。
* 解码后的代码会重写 `console.log`，让它变成：

```
console.log = function(s) {
    while (1) {
        for (i = 0; i < 11000000; i++) {
            history.pushState(0, 0, i);
        }
    }
}
```

这样一旦调用 `console.log`，就会疯狂 `pushState`，导致浏览器卡死。
去除方法：

* 直接不执行这段 `eval`。在扣代码时，将 `_0x37bc5d` 整体替换为一个空函数或直接 `return`。

## h3 6. `setInterval` 定时自检

```
setInterval(function() {
    var _0x16d82d = {};
    _0x16d82d[...] = function(_0x451cb5) { return _0x451cb5(); };
    var _0x4a97db = _0x16d82d;
    _0x4a97db[...]($dbsm_0x3db563);
}, 0xfa0);
```

`$dbsm_0x102537` 内部:

```
_0x2528b8[...](setInterval, _0x2528b8[...](_0x37bc5d), 0x1f4);
```

原理：

* 每 500ms 或 4000ms 执行一次 `_0x37bc5d` 或 `$dbsm_0x3db563`，进行环境检测。如果发现 `console.log` 被改写、`debugger` 被禁用等，就触发死循环。

去除方法：
注释掉这些 `setInterval` 调用。

## h3 7. `$dbsm_0x3db563` 自身的死循环

```
function $dbsm_0x3db563(_0x44d65f) {
    var _0xb52b3b = {};
    ...
    try {
        if (_0x44d65f) {
            return _0x2e4a16;
        } else {
            _0xe0f8ba[...](_0x2e4a16, 0x0);
        }
    } catch (_0x360549) {}
}
```

原理：
该函数内部包含大量反调试检测，例如检查 `console.log`、`debugger` 等。当参数为假时，会执行 `_0x2e4a16(0)`，最终可能进入死循环。
去除方法:

* 不调用它，或者将其函数体清空。

## h3 8.`$dbsm_0x17c7` 开头的 `_0x220a58` 中的 `removeCookie.toString()` 检测

```
var _0x1bdccb = function() {
    var _0x464f3f = new RegExp('\\w+ *\\(\\) *{\\w+ *[\'|"].+[\'|"];? *}');
    return _0x464f3f['test'](_0x5e1b08['removeCookie']['toString']());
};
_0x5e1b08['updateCookie'] = _0x1bdccb;
var _0x81818a = _0x5e1b08['updateCookie']();
if (!_0x81818a) {
    _0x5e1b08['setCookie'](['*'], 'counter', 0x1);
} else if (_0x81818a) {
    _0x12a868 = _0x5e1b08['getCookie'](null, 'counter');
} else {
    _0x5e1b08['removeCookie']();
}
```

原理：

* 用正则检测 `removeCookie.toString()` 是否被格式化。如果被格式化，正则匹配失败，`_0x81818a` 为 `false`，然后执行 `setCookie(['*'], 'counter', 0x1)`。
* 这看起来是正常的 cookie 初始化，但它的存在是为了检测 `removeCookie` 是否被 Hook 或修改。如果被修改，可能会影响后续 `$dbsm_0x17c7` 的解密（因为 `_0x220a58` 内部调用了 `_0x3aaf1f` 来旋转数组）。

去除方法：

* 通常不需要特别处理，因为即使走了 `setCookie` 分支，也不影响 `$dbsm_0x17c7` 的解密。但如果发现数组旋转次数不对，可以检查这里。
* 在我扣代码中，这个 IIFE 被保留，但数组旋转逻辑被用 `(function(arr, n) { while (--n) { arr.push(arr.shift()); } })($dbsm_0xde03, 0x1d1);` 手动实现了，所以不受影响。

## h3 9. `_0x5e9e66` 和 `_0x5aa3d8` 的调用

```
_0x2528b8[...](_0x5e9e66, _0x2528b8[...](_0x5aa3d8));
```

原理：
这两个函数内部包含 `debuggerProtection` 等反调试逻辑，一旦执行会触发死循环或 `debugger`。

想要让扣的代码，真正的跑起来，就需要干掉反检测点，可以把扣的代码，丢给ai，ai是知道在哪些地方做了检测，应该如何处
理去过掉反检测。

好家伙，当我用Python去调用m的生成逻辑代码去请求时发现失败了，这题居然升级了，ai分析说升级重要的点在

m 的有效性取决于"是否用当次下发的挑战体计算"，与算法实现是否正确无关。
ex.js (我本地生成m的js文件)作为静态文件，无法获取"当次挑战"，因此***无论用什么语言去调用它，都拿不到有效 m***。

下面放一下过这题的js脚本,记得替换为你自己的sessionid

```
/**
 * 猿人学第2题 - js混淆 动态cookie 1（纯 Node.js 协议采集，无浏览器参与）
 *
 * 接口链路：
 *   1. GET https://match.yuanrenxue.cn/api/question/2?page=N&pageSize=10&kw=
 *      未携带有效动态 Cookie 时返回 202，响应体 JSON.data 为该次下发的挑战 JS
 *      （OB 混淆，每次下发内容不同：变量名/数组轮转/嵌入的大常数均会变化）
 *   2. 挑战 JS 执行后写入 document.cookie：
 *          m = _0xd59548(timestamp) + '|' + timestamp   // MD5 链 + 13位毫秒时间戳
 *      哈希与挑战体内容绑定，因此必须用"当次下发的挑战"计算 m
 *   3. 携带 m=<hash>|<ts> Cookie 重试同一接口 → 200，返回页面数据
 *
 * 实现方式：vm 沙箱最小补环境执行挑战 JS，捕获 document.cookie 写入取 m。
 * 补环境项：console / navigator / location / document.cookie（仅捕获）/
 *          定时器置空（防反调试死循环）。均为最小必需，无真实浏览器。
 */
const https = require('https');
const vm = require('vm');

/* ---------------- 配置 ---------------- */
const CONFIG = {
    host: 'match.yuanrenxue.cn',
    apiPath: '/api/question/2',
    pages: 5,
    pageSize: 10,
    sessionid: '替换为你自己的sessionid',
    // 服务端校验 UA：必须为 yuanrenxue，否则返回占位字符串而非真实数据
    ua: 'yuanrenxue',
};

/* ---------------- HTTP（原生 https + keep-alive） ---------------- */
const agent = new https.Agent({ keepAlive: true, maxSockets: 1 });

function request(page, cookie) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            host: CONFIG.host,
            path: `${CONFIG.apiPath}?page=${page}&pageSize=${CONFIG.pageSize}&kw=`,
            method: 'GET',
            agent,
            headers: {
                'User-Agent': CONFIG.ua,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://match.yuanrenxue.cn/match/2',
                'Cookie': cookie,
            },
        }, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

/* ---------------- 挑战 JS 求解：vm 最小补环境，捕获 m ---------------- */
function solveChallenge(challengeJs) {
    const captured = [];
    const sandbox = {
        console: { log: () => {}, warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
        navigator: { userAgent: CONFIG.ua, appName: 'Netscape', platform: 'Win32' },
        location: {
            href: 'https://match.yuanrenxue.cn/match/2',
            protocol: 'https:',
            host: CONFIG.host,
            hostname: CONFIG.host,
        },
        setInterval: () => 0, clearInterval: () => {},
        setTimeout: () => 0, clearTimeout: () => {},
        Date,
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    Object.defineProperty(sandbox.document || (sandbox.document = {}), 'cookie', {
        get: () => captured.join('; '),
        set: (v) => captured.push(v),
        configurable: true,
    });
    vm.createContext(sandbox);
    try {
        vm.runInContext(challengeJs, sandbox, { timeout: 8000, displayErrors: true });
    } catch (e) {
        throw new Error('挑战 JS 执行失败: ' + e.message.slice(0, 120));
    }
    // 捕获形如 "m<suffix>=<32hex>|<13位ts>; path=/"，取等号后的值
    const joined = captured.join(';');
    const m = joined.match(/=([0-9a-f]{32}\|\d{13})/);
    if (!m) throw new Error('未捕获到 m 值, captured=' + joined.slice(0, 100));
    return m[1];
}

/* ---------------- 主流程 ---------------- */
(async () => {
    console.log('- 题目：第2题 - js混淆 动态cookie 1');
      console.log('
- 目标：采集 5 页数据并计算总和');

      const all = [];
      for (let page = 1; page <= CONFIG.pages; page++) {
          let cookie = `sessionid=${CONFIG.sessionid}`;
          let res = await request(page, cookie);

          // 202 = 下发动态挑战，沙箱执行取 m 后重试
          if (res.status === 202) {
              const challengeJs = JSON.parse(res.body).data;
              const m = solveChallenge(challengeJs);
              res = await request(page, `${cookie}; m=${m}`);
          }
          if (res.status !== 200) {
              throw new Error(`第 ${page} 页请求失败：HTTP ${res.status}`);
          }

          const rows = JSON.parse(res.body).data || [];
          all.push(...rows);
          console.log(`[+] 正在采集第 ${page}/${CONFIG.pages} 页... ✓ 获取 ${rows.length} 条数据`);
      }

      console.log(`[+] 采集完成，共 ${all.length} 条数据`);

      const answer = all.reduce((s, x) => s + x, 0);
      console.log('');
      console.log('========== 计算结果 ==========');
      console.log(`答案：${answer}`);
      console.log('==============================');
  })().catch((e) => {
      console.error('[x] 失败：', e.message);
      process.exit(1);
  });
```
