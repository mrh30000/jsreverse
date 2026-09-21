/**
 * Universal Anti-Detect Module - 通用反检测模块
 *
 * 拦截常见反爬虫检测手段，支持配置化启用/禁用各项防护。
 * 本脚本必须在站点安全脚本加载之前运行（document_start, MAIN world）。
 *
 * 支持的检测类型：
 *   1. WebSocket 本地端口探测（如 127.0.0.1:9222, 18789 等）
 *   2. 浏览器扩展检测（chrome-extension:// 和 moz-extension:// 请求）
 *   3. Canvas 指纹检测
 *   4. WebGL 指纹检测
 *   5. Navigator 属性检测（插件、语言等）
 *   6. 自动化特征检测（webdriver、cdc_ 属性等）
 *
 * 使用方式：
 *   // 默认配置（全部启用）
 *   AntiDetect.init();
 *
 *   // 自定义配置
 *   AntiDetect.init({
 *     wsLocalProbe: true,
 *     chromeExtension: true,
 *     canvas: false,
 *     webgl: false,
 *     navigator: true,
 *     automation: true
 *   });
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // 防止重复注入
  if (window.__anti_detect_loaded) return;
  window.__anti_detect_loaded = true;

  var LOG_PREFIX = '[Anti-Detect]';

  // 默认配置
  var DEFAULT_CONFIG = {
    // WebSocket 本地端口探测拦截
    wsLocalProbe: true,
    // WebSocket 探测白名单（包含这些路径的不拦截）
    wsProbeWhitelist: ['/business/register'],
    // Chrome 扩展检测拦截
    chromeExtension: true,
    // Canvas 指纹保护
    canvas: true,
    // WebGL 指纹保护
    webgl: true,
    // Navigator 属性伪装
    navigator: true,
    // 自动化特征清除
    automation: true,
    // 调试模式（输出日志）
    debug: false
  };

  var config = {};

  // 工具函数：日志输出
  function log() {
    if (config.debug) {
      console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  /**
   * 判断一个 WebSocket URL 是否为本地探测请求
   * @param {string} url - WebSocket URL
   * @returns {boolean}
   */
  function isLocalProbe(url) {
    if (!config.wsLocalProbe) return false;
    if (!url || typeof url !== 'string') return false;
    try {
      var u = new URL(url);
      var host = u.hostname;
      var isLocal = (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0');
      if (!isLocal) return false;
      // 检查白名单
      for (var i = 0; i < config.wsProbeWhitelist.length; i++) {
        if (u.pathname.indexOf(config.wsProbeWhitelist[i]) !== -1) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * A. 拦截本地 WebSocket 端口探测
   */
  function setupWebSocketInterceptor() {
    if (!config.wsLocalProbe) return;

    var OriginalWebSocket = window.WebSocket;
    // 保存原始 WebSocket 到 window 上，供合法组件使用
    if (typeof window.__OriginalWebSocket__ === 'undefined') {
      window.__OriginalWebSocket__ = OriginalWebSocket;
    }
    if (!OriginalWebSocket) return;

    var FakeWebSocket = function (url, protocols) {
      if (isLocalProbe(url)) {
        log('Blocked local WebSocket probe:', url);

        // 返回一个仿真 WebSocket 对象，让探测逻辑正常回调但结果为"端口未开放"
        var fake = {
          readyState: 3, // CLOSED
          bufferedAmount: 0,
          url: url,
          protocol: '',
          extensions: '',
          binaryType: 'blob',
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null,
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3,
          send: function () { throw new DOMException('WebSocket is already in CLOSING or CLOSED state.'); },
          close: function () {},
          addEventListener: function () {},
          removeEventListener: function () {},
          dispatchEvent: function () { return true; }
        };

        // 异步触发 onerror 回调（模拟连接失败）
        setTimeout(function () {
          if (typeof fake.onerror === 'function') {
            try { fake.onerror({ type: 'error' }); } catch (e) {}
          }
        }, 0);

        return fake;
      }

      // 非本地探测请求 → 使用原始 WebSocket
      if (protocols !== undefined) {
        return new OriginalWebSocket(url, protocols);
      }
      return new OriginalWebSocket(url);
    };

    // 继承静态属性
    FakeWebSocket.CONNECTING = 0;
    FakeWebSocket.OPEN = 1;
    FakeWebSocket.CLOSING = 2;
    FakeWebSocket.CLOSED = 3;
    FakeWebSocket.prototype = OriginalWebSocket.prototype;

    // 替换全局 WebSocket
    Object.defineProperty(window, 'WebSocket', {
      value: FakeWebSocket,
      writable: true,
      configurable: true
    });

    log('WebSocket probe interceptor installed');
  }

  /**
   * B. 拦截浏览器扩展检测
   * 同时支持 Chrome (chrome-extension://) 和 Firefox (moz-extension://)
   */
  function setupChromeExtensionInterceptor() {
    if (!config.chromeExtension) return;

    var originalFetch = window.fetch;
    if (!originalFetch) return;

    window.fetch = function (input, init) {
      var url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
      }

      // 拦截 chrome-extension:// 和 moz-extension:// 协议的 fetch 请求
      if (url.indexOf('chrome-extension://') === 0 || url.indexOf('moz-extension://') === 0) {
        log('Blocked extension fetch probe:', url);
        return Promise.reject(new TypeError('Failed to fetch'));
      }

      return originalFetch.apply(this, arguments);
    };

    // 同时拦截 XMLHttpRequest 对扩展协议的请求
    var OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      window.XMLHttpRequest = function () {
        var xhr = new OriginalXHR();
        var originalOpen = xhr.open;
        xhr.open = function (method, url, async, user, password) {
          if (typeof url === 'string' && (url.indexOf('chrome-extension://') === 0 || url.indexOf('moz-extension://') === 0)) {
            log('Blocked extension XHR probe:', url);
            throw new DOMException('Network Error');
          }
          return originalOpen.apply(this, arguments);
        };
        return xhr;
      };
      window.XMLHttpRequest.prototype = OriginalXHR.prototype;
    }

    log('Browser extension probe interceptor installed');
  }

  /**
   * C. Canvas 指纹保护
   * 通过添加微小噪声来防止 Canvas 指纹追踪
   */
  function setupCanvasProtection() {
    if (!config.canvas) return;

    var originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    var originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attributes) {
        if (type === '2d') {
            attributes = Object.assign({}, attributes, { willReadFrequently: true });
        }
        return originalGetContext.call(this, type, attributes);
    };

    // 不再劫持 toDataURL 主动修改像素：
    // 对已有 WebGL 上下文的 canvas 调用 getContext('2d') 会导致 WebGL 上下文丢失，
    // 触发页面不断重建 WebGL，最终超出浏览器 "Too many active WebGL contexts" 限制。
    // getImageData 的 hook 已能拦截主流 Canvas 指纹读取。

    // 拦截 getImageData
    CanvasRenderingContext2D.prototype.getImageData = function () {
      var imageData = originalGetImageData.apply(this, arguments);
      // 复制并返回修改后的数据
      var copy = new ImageData(imageData.width, imageData.height);
      for (var i = 0; i < imageData.data.length; i++) {
        copy.data[i] = (imageData.data[i] + 1) % 256;
      }
      return copy;
    };

    log('Canvas fingerprint protection installed');
  }

  /**
   * D. WebGL 指纹保护
   */
  function setupWebGLProtection() {
    if (!config.webgl) return;

    // 拦截 WebGL 参数查询
    var protectedParams = {
      37445: 'Google Inc.', // RENDERER
      37446: 'ANGLE (Intel(R) HD Graphics Direct3D11 vs_5_0 ps_5_0)', // VENDOR
      7936: 'WebKit' // VERSION
    };

    var hookGetParameter = function (original) {
      return function (param) {
        if (protectedParams[param]) {
          return protectedParams[param];
        }
        return original.apply(this, arguments);
      };
    };

    if (WebGLRenderingContext.prototype.getParameter) {
      WebGLRenderingContext.prototype.getParameter = hookGetParameter(
        WebGLRenderingContext.prototype.getParameter
      );
    }
    if (WebGL2RenderingContext.prototype.getParameter) {
      WebGL2RenderingContext.prototype.getParameter = hookGetParameter(
        WebGL2RenderingContext.prototype.getParameter
      );
    }

    log('WebGL fingerprint protection installed');
  }

  /**
   * E. Navigator 属性伪装
   */
  function setupNavigatorSpoofing() {
    if (!config.navigator) return;

    // 伪装 plugins
    try {
      Object.defineProperty(navigator, 'plugins', {
        get: function () {
          return [
            {
              name: 'Chrome PDF Plugin',
              filename: 'internal-pdf-viewer',
              description: 'Portable Document Format',
              length: 1
            }
          ];
        },
        configurable: true
      });
    } catch (e) {}

    // 伪装 languages
    try {
      Object.defineProperty(navigator, 'languages', {
        get: function () {
          return ['en-US', 'en'];
        },
        configurable: true
      });
    } catch (e) {}

    log('Navigator spoofing installed');
  }

  /**
   * F. 清除自动化特征
   */
  function setupAutomationRemoval() {
    if (!config.automation) return;

    // 移除 webdriver 属性
    try {
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: function () { return undefined; },
        configurable: true
      });
    } catch (e) {}

    // 移除 Chrome 扩展检测相关的属性
    var cdcProperties = ['cdc_adoQpoasnfa76pfcZLmcfl_', 'cdc_devToolsAdoption_'];
    cdcProperties.forEach(function (prop) {
      try {
        delete window[prop];
      } catch (e) {}
    });

    log('Automation features removed');
  }

  /**
   * 初始化反检测模块
   * @param {Object} userConfig - 用户配置
   */
  function init(userConfig) {
    // 合并配置
    config = {};
    for (var key in DEFAULT_CONFIG) {
      if (DEFAULT_CONFIG.hasOwnProperty(key)) {
        config[key] = DEFAULT_CONFIG[key];
      }
    }
    if (userConfig) {
      for (var key2 in userConfig) {
        if (userConfig.hasOwnProperty(key2)) {
          config[key2] = userConfig[key2];
        }
      }
    }

    log('Initializing with config:', config);

    // 安装各个拦截器
    setupWebSocketInterceptor();
    setupChromeExtensionInterceptor();
    setupCanvasProtection();
    setupWebGLProtection();
    setupNavigatorSpoofing();
    setupAutomationRemoval();

    log('Anti-detect module initialized successfully');
  }

  // 导出公共接口
  window.AntiDetect = {
    init: init,
    version: '2.0.0'
  };

  // 自动初始化（使用默认配置）
  init();

})();
