/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 反调试综合防御与绕过探针 (AntiDebug Breaker Suite).
 *
 * 序列化约束：函数体内不得引用模块级变量，配置通过 config 传入。
 *
 * config 支持的选项：
 * - hookId: string
 * - bypassDebugger: boolean (默认 true) 绕过 eval / Function / constructor 的 debugger
 * - consoleGuard: boolean (默认 true) 保护 console.log/trace/group 不被清空或覆写，阻断 console.clear 与 console.table 耗时探测
 * - windowDimensions: boolean (默认 true) 固定 innerWidth/innerHeight/outerWidth/outerHeight 伪造正常窗口尺寸
 * - navGuard: boolean (默认 true) 阻止 window.close、history.go/back 强退
 * - redirectTrap: boolean (默认 false) 在 onbeforeunload 处下断点定位跳转源码
 * - antiAntiHook: boolean (默认 true) 伪装 Function.prototype.toString 并拦截 iframe contentWindow 盗取未 hook 原生方法
 * - fixedWidth: number (默认 1366)
 * - fixedHeight: number (默认 660)
 * - fixedOuterWidth: number (默认 1400)
 * - fixedOuterHeight: number (默认 760)
 */
export function installAntidebugHook(config) {
  const hookId = config.hookId || 'antidebug_suite';
  const bypassDebugger = config.bypassDebugger ?? true;
  const consoleGuard = config.consoleGuard ?? true;
  const windowDimensions = config.windowDimensions ?? true;
  const navGuard = config.navGuard ?? true;
  const redirectTrap = config.redirectTrap ?? false;
  const antiAntiHook = config.antiAntiHook ?? true;

  const hookedFunctions = new Map();

  function markHooked(fn, name) {
    if (typeof fn === 'function' && name) {
      hookedFunctions.set(fn, name);
    }
  }

  // 1. 无限 Debugger 绕过：清空 eval / Function / constructor 中的 debugger 语句
  if (bypassDebugger) {
    const rawEval = window.eval;
    window.eval = function (...args) {
      if (typeof args[0] === 'string' && args[0].includes('debugger')) {
        args[0] = args[0].replaceAll(/\bdebugger\b;?/g, '');
      }
      return Reflect.apply(rawEval, this, args);
    };
    markHooked(window.eval, 'eval');

    const rawFunction = window.Function;
    const patchedFunction = function (...args) {
      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'string' && args[i].includes('debugger')) {
          args[i] = args[i].replaceAll(/\bdebugger\b;?/g, '');
        }
      }
      return Reflect.construct(rawFunction, args);
    };

    patchedFunction.prototype = rawFunction.prototype;
    patchedFunction.prototype.constructor = patchedFunction;
    window.Function = patchedFunction;
    markHooked(patchedFunction, 'Function');
    markHooked(patchedFunction.prototype.constructor, 'Function');
  }

  // 2. 控制台保护：防止 console 被覆写置空，消除 console.clear，抑制 console.table 耗时攻击
  if (consoleGuard && window.console) {
    const readonlyProps = ['log', 'trace', 'groupCollapsed', 'groupEnd', 'info', 'warn', 'error'];

    // 禁用 console.clear
    const rawClear = window.console.clear;
    window.console.clear = function () {};
    markHooked(window.console.clear, 'clear');

    // 禁用 console.table（防止利用大数组 table 渲染耗时差做 DevTools 开启检测）
    const rawTable = window.console.table;
    window.console.table = function () {};
    markHooked(window.console.table, 'table');

    // Proxy console 阻止覆写
    const readonlyConsole = new Proxy(window.console, {
      set(target, prop, value, receiver) {
        if (readonlyProps.includes(prop)) {
          return true; // 静默忽略篡改
        }
        return Reflect.set(target, prop, value, receiver);
      },
    });

    try {
      Object.defineProperty(window, 'console', {
        configurable: true,
        enumerable: false,
        get() {
          return readonlyConsole;
        },
        set() {
          // 静默忽略 window.console = null 等直接赋值
        },
      });
    } catch (_) {}
  }

  // 3. 窗口尺寸伪造：阻止 outerWidth - innerWidth > 160 等 DevTools 开启检测
  if (windowDimensions) {
    const innerW = config.fixedWidth || 1366;
    const innerH = config.fixedHeight || 660;
    const outerW = config.fixedOuterWidth || 1400;
    const outerH = config.fixedOuterHeight || 760;

    const props = [
      { name: 'innerWidth', val: innerW },
      { name: 'innerHeight', val: innerH },
      { name: 'outerWidth', val: outerW },
      { name: 'outerHeight', val: outerH },
    ];

    for (const { name, val } of props) {
      try {
        const desc = Object.getOwnPropertyDescriptor(window, name);
        const rawSetter = desc?.set;
        Object.defineProperty(window, name, {
          configurable: true,
          enumerable: true,
          get() {
            return val;
          },
          set(newVal) {
            if (rawSetter) Reflect.apply(rawSetter, window, [newVal]);
          },
        });
      } catch (_) {}
    }
  }

  // 4. 导航与关闭拦截
  if (navGuard) {
    if (window.close) {
      window.close = function () {
        console.warn('[' + hookId + '] Intercepted window.close()');
      };
      markHooked(window.close, 'close');
    }

    if (window.history) {
      const rawGo = window.history.go;
      const rawBack = window.history.back;
      window.history.go = function () {
        console.warn('[' + hookId + '] Intercepted history.go()');
      };
      window.history.back = function () {
        console.warn('[' + hookId + '] Intercepted history.back()');
      };
      markHooked(window.history.go, 'go');
      markHooked(window.history.back, 'back');
    }

    if (redirectTrap) {
      window.addEventListener('beforeunload', function () {
        debugger; // eslint-disable-line no-debugger
      });
    }
  }

  // 5. 反 Hook 检测与 iframe 原生借用阻断
  if (antiAntiHook) {
    // 伪装 Function.prototype.toString
    const rawToString = Function.prototype.toString;
    Function.prototype.toString = function () {
      if (this === Function.prototype.toString) {
        return 'function toString() { [native code] }';
      }
      if (this === Function.prototype.constructor && hookedFunctions.has(Function.prototype.constructor)) {
        return 'function Function() { [native code] }';
      }
      if (hookedFunctions.has(this)) {
        const name = hookedFunctions.get(this);
        return `function ${name}() { [native code] }`;
      }
      return Reflect.apply(rawToString, this, arguments);
    };

    // 拦截 HTMLIFrameElement.prototype.contentWindow 防止页面新建 iframe 盗取干净原生方法
    if (typeof HTMLIFrameElement !== 'undefined' && HTMLIFrameElement.prototype) {
      const desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (desc && desc.get) {
        const rawGet = desc.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          configurable: true,
          enumerable: true,
          get() {
            const win = Reflect.apply(rawGet, this, []);
            if (!win) return win;

            return new Proxy(win, {
              get(target, prop, receiver) {
                // 如果访问的是已 hook 的全局方法名，返回主 window 的保护版本
                if (typeof prop === 'string') {
                  if (bypassDebugger && (prop === 'eval' || prop === 'Function')) {
                    return window[prop];
                  }
                  if (consoleGuard && prop === 'console') {
                    return window.console;
                  }
                }
                const val = Reflect.get(target, prop, target);
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              },
            });
          },
        });
      }
    }
  }

  console.log('[' + hookId + '] ✅ AntiDebug suite installed (debugger, console, window size, nav guards, anti-anti-hook)');
}
