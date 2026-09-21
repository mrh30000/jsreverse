(function () {
  'use strict';

  // ==================== 配置项 ====================
  const CONFIG = {
    blockSuspiciousTimers: true,  // 是否拦截可疑定时器
    blockRedirects: true,         // 是否拦截跳转
    blockDomDestruction: true,    // 是否拦截DOM破坏
    spoofPerformance: false,      // 是否伪造性能指标（默认关闭：修改 Date.now 会破坏原生 [native code] 特征，导致风控识别为异常环境）
    blockDebugger: true,          // 是否尝试绕过debugger
    logBlocked: true,             // 是否打印拦截日志
  };

  // ==================== 常量定义 ====================
  const prefix = '[ANTI-DEBUG-BOSS]';

  // 反调试相关函数名特征（来自文档 hook.js:25-26）
  const STACK_FLAG = /onDevToolOpen|XCID|noDebug|(?:^|\W)abFn(?:\W|$)|(?:^|\W)ot(?:\W|$)/i;
  const CALLBACK_FLAG = /new Array\(1e4\)\.fill\(['"]x['"]\)|['"]x['"]\.repeat\(1e4\)|nested_/i;

  // 可疑跳转URL特征
  const SUSPICIOUS_URL = /^(about:blank|javascript:|data:)/i;

  // ==================== 性能伪造 ====================
  let lastNow = Date.now();

  /**
   * 伪造 performance.now() 和 Date.now()
   * 防止通过时间差检测调试器
   */
  function spoofPerformanceAPIs() {
    if (!CONFIG.spoofPerformance) return;

    // 保存原始方法
    const originalDateNow = Date.now;
    const originalPerformanceNow = performance.now;
    const originalToString = Function.prototype.toString;

    // 伪造 Date.now()
    Date.now = function () {
      const realNow = originalDateNow.call(Date);
      // 确保时间单调递增，且增量正常（防止检测）
      if (realNow < lastNow) {
        lastNow = lastNow + Math.random() * 10;
      } else {
        lastNow = realNow;
      }
      return lastNow;
    };

    // 伪造 performance.now()
    let perfStart = originalPerformanceNow.call(performance);
    performance.now = function () {
      const elapsed = originalPerformanceNow.call(performance) - perfStart;
      // 返回合理的时间增量
      return elapsed + Math.random();
    };

    // 防止通过 Function.prototype.toString 检测
    Function.prototype.toString = function () {
      const str = originalToString.call(this);
      // 如果函数是被 hook 的，返回原始函数的字符串表示
      if (this._originalToString) {
        return this._originalToString;
      }
      return str;
    };

    console.log(prefix, 'Performance APIs spoofed');
  }

  // ==================== Function 构造函数 Hook ====================
  /**
   * Hook Function 构造函数
   * 防止通过 new Function() 执行反调试代码
   */
  function hookFunctionConstructor() {
    const OriginalFunction = Function;

    // 保存原始 Function
    window._originalFunction = OriginalFunction;

    // Hook Function.prototype.constructor
    const originalConstructor = Function.prototype.constructor;
    Function.prototype.constructor = function (...args) {
      const code = args[args.length - 1] || '';

      // 检测可疑代码模式
      if (typeof code === 'string') {
        const suspiciousPatterns = [
          /debugger/,
          /console\.log\(.*devtools/i,
          /performance\.now\(\)/,
          /Date\.now\(\)/i,
          /new\s+Date\(\)/i,
          /eval\(/,
          /Function\(/,
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(code));
        if (isSuspicious) {
          console.log(prefix, 'Blocked suspicious Function constructor call:', code.substring(0, 100));
          // 返回一个空函数
          return function () { return undefined; };
        }
      }

      return originalConstructor.apply(this, args);
    };

    // Hook eval
    const originalEval = window.eval;
    window.eval = function (code) {
      if (typeof code === 'string' && /debugger/.test(code)) {
        console.log(prefix, 'Blocked eval with debugger');
        return undefined;
      }
      return originalEval.call(window, code);
    };

    console.log(prefix, 'Function constructor hooked');
  }

  // ==================== Function 构造函数 Hook ====================
  /**
   * 尝试处理 debugger 语句
   * 注意：无法完全阻止 debugger，但可以通过一些技巧降低其影响
   */
  function handleDebugger() {
    if (!CONFIG.blockDebugger) return;

    // 方法1：通过 empty debugger 语句覆盖
    // 这不能完全阻止，但可以干扰检测
    setInterval(() => {
      // 空操作，用于干扰 debugger 检测
    }, 100);

    // 方法2：Hook Error 对象创建，干扰栈检测
    const originalError = Error;
    window.Error = function (...args) {
      const error = new originalError(...args);
      // 可以修改 stack 属性来干扰检测
      return error;
    };

    console.log(prefix, 'Debugger handler installed');
  }

  // ==================== 工具函数 ====================

  /**
   * 获取调用栈
   */
  function getStack(tag) {
    try {
      return new Error(tag).stack || '';
    } catch (e) {
      return '';
    }
  }

  /**
   * 检查栈是否匹配反调试特征
   */
  function stackMatched(stack) {
    return STACK_FLAG.test(stack);
  }

  /**
   * 检查回调函数是否匹配可疑特征
   */
  function callbackMatched(callback) {
    if (!callback) return false;
    const str = typeof callback === 'function' ? callback.toString() : String(callback);
    return CALLBACK_FLAG.test(str);
  }

  /**
   * 打印拦截日志
   */
  function log(action, detail, stack) {
    if (!CONFIG.logBlocked) return;
    console.groupCollapsed(`${prefix} ${action}`);
    console.log('from:', location.href);
    if (detail) console.log('detail:', detail);
    if (stack) console.log('stack:', stack);
    console.groupEnd();
  }

  // ==================== 核心补丁函数 ====================

  /**
   * 通用方法补丁
   * @param {object} obj - 目标对象
   * @param {string} methodName - 方法名
   * @param {function} getTarget - 获取目标值的函数
   * @param {object} options - 配置项
   */
  function patchMethod(obj, methodName, getTarget, options = {}) {
    const { lock = false, tag = '' } = options;
    const original = obj[methodName];
    if (!original || typeof original !== 'function') return;

    obj[methodName] = function (...args) {
      const target = getTarget(args);
      const stack = getStack(`${tag} ${methodName}`);

      // 如果锁定或栈匹配反调试特征，则拦截
      if (lock || stackMatched(stack)) {
        log(`blocked ${methodName}()`, target, stack);
        return;
      }

      return original.apply(this, args);
    };

    // 保持原型链
    obj[methodName].prototype = original.prototype;
  }

  /**
   * 补丁 location.href setter
   */
  function patchWindowLocationSetter(win, tag) {
    try {
      const proto = Object.getPrototypeOf(win.location);
      const hrefDesc = Object.getOwnPropertyDescriptor(proto, 'href');
      if (!hrefDesc || !hrefDesc.set) return;
      if (!hrefDesc.configurable) {
        console.debug(prefix, 'location.href is not configurable, skipping patch');
        return;
      }

      Object.defineProperty(proto, 'href', {
        configurable: true,
        get: hrefDesc.get,
        set(url) {
          const stack = getStack(`${tag} location.href setter`);

          // 检查是否为可疑URL或反调试触发
          if (CONFIG.blockRedirects && (SUSPICIOUS_URL.test(url) || stackMatched(stack))) {
            log('blocked location.href =', url, stack);
            return;
          }

          return hrefDesc.set.call(this, url);
        }
      });
    } catch (e) {
      console.debug(prefix, 'failed to patch location.href setter:', e);
    }
  }

  /**
   * 补丁 document.location setter
   */
  function patchDocumentLocationSetter(doc, tag) {
    try {
      const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'location') ||
                   Object.getOwnPropertyDescriptor(doc, 'location');
      if (!desc || !desc.set) return;
      // 某些浏览器（如 Chrome）中 document.location 不可配置，跳过而非报错
      if (!desc.configurable) {
        console.debug(prefix, 'document.location is not configurable, skipping patch');
        return;
      }

      Object.defineProperty(doc, 'location', {
        configurable: true,
        get: desc.get,
        set(url) {
          const stack = getStack(`${tag} document.location setter`);

          if (CONFIG.blockRedirects && (SUSPICIOUS_URL.test(url) || stackMatched(stack))) {
            log('blocked document.location =', url, stack);
            return;
          }

          return desc.set.call(this, url);
        }
      });
    } catch (e) {
      console.debug(prefix, 'failed to patch document.location setter:', e);
    }
  }

  // ==================== 定时器补丁 ====================

  /**
   * 判断是否应该拦截定时器
   */
  function shouldBlockTimer(callback) {
    if (!CONFIG.blockSuspiciousTimers) return false;

    // 检查调用栈
    const timerStack = getStack(`${prefix} timer stack`);
    if (stackMatched(timerStack)) return true;

    // 检查回调函数内容
    if (callback && typeof callback === 'function') {
      const str = callback.toString();
      // 检测 debugger 语句
      if (/debugger/.test(str)) {
        console.log(prefix, 'Blocked timer with debugger');
        return true;
      }
      // 检测性能检测代码
      if (/Date\.now|performance\.now|new\s+Date\(\)/.test(str)) {
        console.log(prefix, 'Blocked timer with performance detection');
        return true;
      }
    }

    return callbackMatched(callback);
  }

  /**
   * 补丁 setTimeout
   */
  function patchSetTimeout(win) {
    const original = win.setTimeout;
    if (!original) return;

    win.setTimeout = function (callback, delay, ...args) {
      if (shouldBlockTimer(callback)) {
        log('blocked setTimeout', `${delay}ms`, getStack('timer'));
        return -1;  // 返回无效ID
      }
      return original.call(this, callback, delay, ...args);
    };
  }

  /**
   * 补丁 setInterval
   */
  function patchSetInterval(win) {
    const original = win.setInterval;
    if (!original) return;

    win.setInterval = function (callback, delay, ...args) {
      if (shouldBlockTimer(callback)) {
        log('blocked setInterval', `${delay}ms`, getStack('timer'));
        return -1;  // 返回无效ID
      }
      return original.call(this, callback, delay, ...args);
    };
  }

  // ==================== DOM 保护 ====================

  /**
   * 补丁 innerHTML setter（防止清空body）
   */
  function patchInnerHTML(win) {
    try {
      const proto = Element.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'innerHTML');
      if (!desc || !desc.set) return;
      if (!desc.configurable) {
        console.debug(prefix, 'innerHTML is not configurable, skipping patch');
        return;
      }

      Object.defineProperty(proto, 'innerHTML', {
        configurable: true,
        get: desc.get,
        set(value) {
          const stack = getStack('innerHTML setter');

          // 检查是否在反调试上下文中操作 document.body
          if (CONFIG.blockDomDestruction && this === document.body && stackMatched(stack)) {
            log('blocked body.innerHTML overwrite', null, stack);
            return;
          }

          return desc.set.call(this, value);
        }
      });
    } catch (e) {
      console.debug(prefix, 'failed to patch innerHTML:', e);
    }
  }

  /**
   * 补丁 appendChild（防止注入可疑样式）
   */
  function patchAppendChild(win) {
    const original = Node.prototype.appendChild;
    if (!original) return;

    Node.prototype.appendChild = function (node) {
      const stack = getStack('appendChild');

      // 检查是否为可疑样式表
      if (CONFIG.blockDomDestruction && node && node.tagName === 'STYLE') {
        const css = node.textContent || node.innerText || '';
        const suspiciousStyle = /blur\(20px\)|display:\s*none\s*!important|visibility:\s*hidden\s*!important|opacity:\s*0\s*!important/i.test(css);

        if (suspiciousStyle && stackMatched(stack)) {
          log('blocked suspicious STYLE append', css.substring(0, 100), stack);
          return node;  // 返回节点但不添加
        }
      }

      const result = original.call(this, node);

      // 如果添加的是iframe，对其contentWindow注入防护
      patchIframeNode(node, 'appendChild');

      return result;
    };
  }

  /**
   * 补丁 insertBefore
   */
  function patchInsertBefore(win) {
    const original = Node.prototype.insertBefore;
    if (!original) return;

    Node.prototype.insertBefore = function (newNode, referenceNode) {
      const result = original.call(this, newNode, referenceNode);
      patchIframeNode(newNode, 'insertBefore');
      return result;
    };
  }

  // ==================== iframe 防护 ====================

  /**
   * 为 iframe 的 contentWindow 注入防护
   * 解决"隐藏 iframe 绕过 hook"问题
   */
  function patchIframeNode(node, reason) {
    if (!node || node.tagName !== 'IFRAME') return;

    const install = () => {
      try {
        if (node.contentWindow) {
          installWindowGuards(node.contentWindow, `iframe(${reason})`);
        }
      } catch (e) {
        // 跨域iframe会报错，忽略
      }
    };

    // 立即尝试
    install();

    // 延迟再试（iframe加载可能延迟）
    setTimeout(install, 0);
    setTimeout(install, 100);
  }

  /**
   * 为指定window注入所有防护
   */
  function installWindowGuards(win, tag) {
    try {
      // 跳转/刷新/窗口动作拦截
      patchMethod(win.Location.prototype, 'assign', (args) => args[0], { lock: true, tag });
      patchMethod(win.Location.prototype, 'replace', (args) => args[0], { lock: true, tag });
      patchMethod(win.Location.prototype, 'reload', () => '[reload]', { lock: true, tag });

      patchWindowLocationSetter(win, tag);
      patchDocumentLocationSetter(win.document, tag);

      patchMethod(win, 'open', (args) => args[0], { lock: true, tag });
      patchMethod(win, 'stop', () => '[stop]', { lock: true, tag });
      patchMethod(win, 'close', () => '[close]', { lock: true, tag });

      // history 操作
      patchMethod(win.History.prototype, 'back', () => '[back]', { tag });
      patchMethod(win.History.prototype, 'forward', () => '[forward]', { tag });
      patchMethod(win.History.prototype, 'go', (args) => args[0], { tag });

      // 定时器
      patchSetTimeout(win);
      patchSetInterval(win);

      // DOM 操作
      patchInnerHTML(win);
      patchAppendChild(win);
      patchInsertBefore(win);

      console.log(prefix, `guards installed for ${tag}`);
    } catch (e) {
      console.warn(prefix, 'failed to install guards:', e);
    }
  }

  // ==================== 快捷键保护 ====================

  /**
   * 恢复被拦截的快捷键
   * 重新绑定事件，优先级更高
   */
  function restoreShortcuts() {
    document.addEventListener('keydown', function (e) {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.stopPropagation();
        return;
      }

      // Ctrl+Shift+I / Ctrl+Shift+J (开发者工具)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) {
        e.stopPropagation();
        return;
      }

      // Ctrl+U (查看源码)
      if (e.ctrlKey && (e.key === 'u' || e.keyCode === 85)) {
        e.stopPropagation();
        return;
      }

      // Ctrl+S (保存)
      if (e.ctrlKey && (e.key === 's' || e.keyCode === 83)) {
        e.stopPropagation();
        return;
      }

      // Mac: Cmd+Alt+I / Cmd+Alt+J
      if (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J')) {
        e.stopPropagation();
        return;
      }

      // Mac: Cmd+U / Cmd+S
      if (e.metaKey && (e.key === 'u' || e.key === 's' || e.keyCode === 85 || e.keyCode === 83)) {
        e.stopPropagation();
        return;
      }
    }, true);  // capture阶段优先执行
  }

  // ==================== 反检测 ====================

  /**
   * 伪造 devtools 检测结果
   */
  function spoofDevToolsDetection() {
    // 常见的 devtools 检测变量
    const devToolsFlags = [
      '__REACT_DEVTOOLS_GLOBAL_HOOK__',
      '__VUE_DEVTOOLS_GLOBAL_HOOK__',
      '__REDUX_DEVTOOLS_EXTENSION__',
      'devtools',
      'Firebug',
      '__firebug__'
    ];

    devToolsFlags.forEach(flag => {
      try {
        Object.defineProperty(window, flag, {
          configurable: true,
          get: () => undefined
        });
      } catch (e) {}
    });

    // 覆盖 console 检测（某些站点通过 console.log 输出时机检测）
    // 如果需要，可以在这里对 console 进行包装
    // 但大多数情况下保持原样即可
  }

  /**
   * 干扰 window.outerWidth/outerHeight 检测
   * 某些站点通过比较 innerWidth 和 outerWidth 检测 devtools
   */
  function spoofWindowSize() {
    try {
      const descW = Object.getOwnPropertyDescriptor(window, 'outerWidth');
      const descH = Object.getOwnPropertyDescriptor(window, 'outerHeight');

      if (!descW || descW.configurable !== false) {
        Object.defineProperty(window, 'outerWidth', {
          get: () => window.innerWidth
        });
      }
      if (!descH || descH.configurable !== false) {
        Object.defineProperty(window, 'outerHeight', {
          get: () => window.innerHeight
        });
      }
    } catch (e) {
      console.debug(prefix, 'spoofWindowSize failed:', e);
    }
  }

  // ==================== MutationObserver 监控 ====================

  /**
   * 监控 DOM 变化，防止动态注入的恶意脚本
   */
  function observeDomChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // 检查新添加的 iframe
          if (node.tagName === 'IFRAME') {
            patchIframeNode(node, 'MutationObserver');
          }

          // 检查新添加的 style 标签
          if (node.tagName === 'STYLE' && CONFIG.blockDomDestruction) {
            const css = node.textContent || '';
            if (/blur\(20px\)|display:\s*none\s*!important/i.test(css)) {
              const stack = getStack('style injection');
              if (stackMatched(stack)) {
                log('blocked dynamic style injection', css.substring(0, 100), stack);
                node.remove();
              }
            }
          }
        });
      });
    });

    // 等待 document.body 存在
    const startObserving = () => {
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } else {
        setTimeout(startObserving, 100);
      }
    };
    startObserving();
  }

  // ==================== 初始化 ====================

  function init() {
    console.log(prefix, 'initializing...');

    // 1. 伪造性能指标（必须在最前面，防止被检测）
    if (CONFIG.spoofPerformance) {
      spoofPerformanceAPIs();
    }

    // 2. Hook Function 构造函数（防止动态执行反调试代码）
    hookFunctionConstructor();

    // 3. 处理 debugger 语句
    if (CONFIG.blockDebugger) {
      handleDebugger();
    }

    // 5. 为主窗口注入防护
    installWindowGuards(window, 'main');

    // 6. 恢复快捷键
    restoreShortcuts();

    // 7. 反检测
    spoofDevToolsDetection();
    spoofWindowSize();

    // 8. DOM 监控
    observeDomChanges();

    console.log(prefix, 'initialized successfully');
  }

  // 立即执行（document-start）
  init();

})();