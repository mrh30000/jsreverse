# 【反反调试】破解匿名函数的构造函数执行的debugger

> **作者**: evlon | **发布时间**: 2025-07-23 11:46:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2216 / 3
> **原文**: [https://www.52pojie.cn/thread-2047827-1-1.html](https://www.52pojie.cn/thread-2047827-1-1.html)

---

## 背景

码上爬【[https://www.mashangpa.com/problem-detail/3/】代码中有一行代码，在打开](https://www.mashangpa.com/problem-detail/3/%E3%80%91%E4%BB%A3%E7%A0%81%E4%B8%AD%E6%9C%89%E4%B8%80%E8%A1%8C%E4%BB%A3%E7%A0%81%EF%BC%8C%E5%9C%A8%E6%89%93%E5%BC%80) devtool的时候，反复断点，影响调试。 核心代码如下：

```
   let handler = setInterval(() => {
            // ....

            (function () {
            }
                ["constructor"]("debugger")());

            ///...
```

这里，先创建了匿名函数 function(){}，然后访问该函数的构造函数，得到构造函数后，构造函数执行 debugger

## 解决方案（一）通过改写setInternal，在执行期间，替换里面的 debugger

源码实现方式，提思路，让AI帮你写完。

源码：<https://github.com/evlon/hook-loadjs-disable-disable-devtool/raw/refs/heads/main/disable-debugger.js>

```
// ==UserScript==
// @name         执行时拦截debugger - 保护闭包
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  在setInterval/setTimeout执行时动态替换debugger，保护闭包变量
// @AuThor       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 方案1: Hook setInterval/setTimeout，动态处理函数字符串
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    const originalFunction = window.Function;

    // 创建安全的函数执行环境
    function createSafeFunction(originalFunc, context = null) {
        if (typeof originalFunc === 'string') {
            // 如果传入的是字符串，先清理debugger
            const cleanCode = originalFunc.replace(/debugger\s*;?/gi, '/* debugger removed */');
            console.log('🛡️ 清理字符串函数中的debugger');
            return new originalFunction(cleanCode);
        } else if (typeof originalFunc === 'function') {
            // 如果是函数，创建包装器在执行时拦截debugger
            return function(...args) {
                try {
                    // 临时替换Function构造函数
                    const tempFunction = window.Function;
                    window.Function = function(...funcArgs) {
                        const code = funcArgs[funcArgs.length - 1] || '';
                        if (typeof code === 'string' && /debugger/i.test(code)) {
                            console.log('🛡️ 执行时拦截debugger:', code);
                            funcArgs[funcArgs.length - 1] = code.replace(/debugger\s*;?/gi, '/* blocked */');
                        }
                        return tempFunction.apply(this, funcArgs);
                    };

                    // 执行原始函数
                    const result = originalFunc.apply(context || this, args);

                    // 恢复Function构造函数
                    window.Function = tempFunction;

                    return result;
                } catch (error) {
                    // 恢复Function构造函数（错误情况）
                    window.Function = originalFunction;

                    // 如果错误是由debugger引起的，忽略它
                    if (error.toString().includes('debugger') || error.name === 'Error') {
                        console.log('🛡️ 已阻止debugger执行');
                        return;
                    }
                    throw error;
                }
            };
        }
        return originalFunc;
    }

    // Hook setInterval
    window.setInterval = function(callback, delay, ...args) {
        console.log('🔍 拦截setInterval调用');
        const safeCallback = createSafeFunction(callback);
        return originalSetInterval.call(this, safeCallback, delay, ...args);
    };

    // Hook setTimeout
    window.setTimeout = function(callback, delay, ...args) {
        console.log('🔍 拦截setTimeout调用');
        const safeCallback = createSafeFunction(callback);
        return originalSetTimeout.call(this, safeCallback, delay, ...args);
    };

    // 方案2: 更激进的方式 - 运行时eval拦截
    const originalEval = window.eval;
    window.eval = function(code) {
        if (typeof code === 'string' && /debugger/i.test(code)) {
            console.log('🛡️ eval中拦截debugger');
            code = code.replace(/debugger\s*;?/gi, '/* debugger blocked in eval */');
        }
        return originalEval.call(this, code);
    };

    // 方案3: 全局Function构造函数拦截（保留原有逻辑）
    window.Function = function(...args) {
        const code = args[args.length - 1] || '';
        if (typeof code === 'string' && /debugger/i.test(code)) {
            console.log('🛡️ Function构造函数拦截debugger');
            args[args.length - 1] = code.replace(/debugger\s*;?/gi, '/* debugger blocked */');
        }
        return originalFunction.apply(this, args);
    };

    // 保持Function的原型链
    window.Function.prototype = originalFunction.prototype;

    // 方案4: 最后防线 - 重写Function.prototype.constructor
    Object.defineProperty(Function.prototype, 'constructor', {
        get: function() {
            return window.Function;
        },
        enumerable: false,
        configurable: true
    });

    // 方案5: 处理可能的异常情况 - 全局错误处理
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        // 如果错误与debugger相关，静默处理
        if (message && message.toString().toLowerCase().includes('debugger')) {
            console.log('🛡️ 已静默处理debugger相关错误');
            return true; // 阻止错误冒泡
        }

        // 其他错误正常处理
        if (originalErrorHandler) {
            return originalErrorHandler.call(this, message, source, lineno, colno, error);
        }
        return false;
    };

    // 方案6: 特殊情况 - 处理通过字符串创建的定时器
    // 重写原生方法，确保字符串参数被清理
    const createTimerHook = (originalMethod, methodName) => {
        return function(callback, delay, ...args) {
            if (typeof callback === 'string') {
                console.log(`🔍 发现${methodName}中的字符串回调，检查debugger`);
                if (/debugger/i.test(callback)) {
                    console.log(`🛡️ ${methodName}字符串回调中发现debugger，已清理`);
                    callback = callback.replace(/debugger\s*;?/gi, '/* debugger removed */');
                }
            }
            return originalMethod.call(this, callback, delay, ...args);
        };
    };

    // 应用到更多定时器方法
    window.setInterval = createTimerHook(originalSetInterval, 'setInterval');
    window.setTimeout = createTimerHook(originalSetTimeout, 'setTimeout');

    // 方案7: requestAnimationFrame也可能被利用
    if (window.requestAnimationFrame) {
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            const safeCallback = createSafeFunction(callback);
            return originalRAF.call(this, safeCallback);
        };
    }

    // 测试我们的保护是否有效
    console.log('🛡️ 全方位debugger保护已激活');

    // 延迟测试，确保页面加载后进行
    setTimeout(() => {
        console.log('🧪 开始测试保护效果...');

        // 测试1: setInterval + Function构造函数
        try {
            const testInterval = setInterval(() => {
                (function(){}["constructor"]("console.log('测试通过，debugger已被阻止')"))();
            }, 1000);

            setTimeout(() => clearInterval(testInterval), 2000);
            console.log('✅ setInterval + constructor 测试启动');
        } catch(e) {
            console.log('❌ setInterval测试失败:', e);
        }

        // 测试2: setTimeout + 字符串回调
        try {
            setTimeout('console.log("字符串回调测试通过")', 500);
            console.log('✅ setTimeout字符串回调测试启动');
        } catch(e) {
            console.log('❌ setTimeout字符串测试失败:', e);
        }

    }, 1000);

})();
```

## 解决方案（二）通过改写构造函数，替换debugger

提思路，让AI写

源码路径：<https://github.com/evlon/hook-loadjs-disable-disable-devtool/raw/refs/heads/main/disable-function-constructor-debugger.js>

```
// ==UserScript==
// @name         精确拦截Function构造函数调用
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  专门处理 (function(){}["constructor"]("debugger")) 这种调用
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 保存原始Function构造函数
    const OriginalFunction = Function;

    // 创建我们的代理Function
    function ProxyFunction(...args) {
        const code = args.length > 0 ? args[args.length - 1] : '';

        if (typeof code === 'string' && /debugger/i.test(code)) {
            console.log('🛡️ 拦截到debugger调用:', code);
            // 替换debugger为空操作或注释
            args[args.length - 1] = code.replace(/debugger\s*;?/gi, '/* debugger blocked */');
        }

        // 使用原始Function构造函数创建函数
        return OriginalFunction.apply(this, args);
    }

    // 重要：保持原型链和属性
    ProxyFunction.prototype = OriginalFunction.prototype;
    ProxyFunction.constructor = OriginalFunction.constructor;

    // 复制所有静态属性和方法
    Object.getOwnPropertyNames(OriginalFunction).forEach(prop => {
        if (prop !== 'length' && prop !== 'name' && prop !== 'prototype') {
            try {
                ProxyFunction[prop] = OriginalFunction[prop];
            } catch (e) {
                // 某些属性可能不可写
            }
        }
    });

    // 关键：替换全局Function
    window.Function = ProxyFunction;

    // 更关键：替换Function.prototype.constructor
    // 这是处理 (function(){}["constructor"]) 的核心
    // 这是处理 (function(){}["constructor"]) 的核心
    Object.defineProperty(Function.prototype, 'constructor', {
        get: function() {
            return ProxyFunction;
        },
        set: function(value) {
            // 可以选择忽略设置，或者允许设置
        },
        enumerable: false,
        configurable: true
    });

    // 额外保护：处理可能的绕过尝试
    // 防止通过 Object.getPrototypeOf 等方式获取原始constructor
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = function(obj, prop) {
        const desc = originalGetOwnPropertyDescriptor.call(this, obj, prop);
        if (obj === Function.prototype && prop === 'constructor' && desc) {
            desc.value = ProxyFunction;
        }
        return desc;
    };

    // 测试代码 - 验证我们的拦截是否有效
    console.log('🛡️ 反调试保护已激活');

    // 测试1: 直接调用
    try {
        Function('debugger');
        console.log('✅ 直接Function调用已被处理');
    } catch(e) {
        console.log('❌ 直接Function调用失败:', e);
    }

    // 测试2: 通过constructor调用 - 这是关键测试
    try {
        (function(){}["constructor"]("debugger"))();
        console.log('✅ constructor方式调用已被处理');
    } catch(e) {
        console.log('❌ constructor方式调用失败:', e);
    }

    // 测试3: 其他可能的调用方式
    try {
        (function(){}).constructor("debugger")();
        console.log('✅ 点号访问constructor已被处理');
    } catch(e) {
        console.log('❌ 点号访问constructor失败:', e);
    }

    // 额外的保护层：如果网站尝试还原Function
    const interval = setInterval(() => {
        if (window.Function !== ProxyFunction) {
            console.log('🔄 检测到Function被还原，重新应用保护');
            window.Function = ProxyFunction;
        }
        if (Function.prototype.constructor !== ProxyFunction) {
            console.log('🔄 检测到constructor被还原，重新应用保护');
            Object.defineProperty(Function.prototype, 'constructor', {
                get: function() { return ProxyFunction; },
                enumerable: false,
                configurable: true
            });
        }
    }, 100);

    // 清理定时器（可选，5秒后停止检查）
    setTimeout(() => {
        clearInterval(interval);
        console.log('🛡️ 保护监控已停止');
    }, 5000);

})();
```

需要注意的关键点，在注释中：这是处理 (function(){}["constructor"]) 的核心
