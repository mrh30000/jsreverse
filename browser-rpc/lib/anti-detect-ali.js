/**
 * Ali Anti-Detect Module - 阿里系特定反检测与指纹混淆脚本
 *
 * 针对阿里安全组件（霸下 Baxia、AWSC、Fireye、Fourier 等）的运行时检测特性进行定向伪装。
 * 主要解决以下检测：
 *   1. webdriver、cdc_ 等爬虫特征（通过统一防检测层覆盖）
 *   2. getUA(), getFYToken() 等指纹采集方法的过度收集
 *   3. 核心滑块 NC (No-Captchas) 的主动监控与容错
 *   4. AWSC 动态加载模块时的特征检测绕过
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // 防止重复注入
  if (window.__anti_detect_ali_loaded) return;
  window.__anti_detect_ali_loaded = true;

  var LOG_PREFIX = '[Ali-Anti-Detect]';

  function log() {
    // 默认关闭，如需调试可设为 true
    if (window.__ali_anti_detect_debug__) {
      console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // 1. 防御 navigator.webdriver 检测（阿里安全组件的重点关注项）
  function bypassWebDriver() {
    try {
      if (Object.defineProperty) {
        Object.defineProperty(navigator, 'webdriver', {
          get: function () { return undefined; },
          configurable: true
        });
      } else if (navigator.__proto__) {
        delete navigator.__proto__.webdriver;
      }
    } catch (e) {
      log('Failed to bypass webdriver:', e);
    }
  }

  // 2. 伪装 Chrome 运行时环境以避开对 Puppeteer / Playwright 的检测
  function mockChromeEnvironment() {
    // 阿里有些安全 JS 会检测 window.chrome 上的属性
    if (!window.chrome) {
      window.chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', RUNNING: 'running', CAN_RUN: 'can_run' }
        },
        runtime: {
          OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
          PlatformArch: { ARM: 'arm', ARM64: 'arm64', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
          PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
          PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
          RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' }
        }
      };
    }
  }

  // 3. 监控和防御全局 hook 逃逸，拦截/伪装安全特征
  function setupBaxiaAndAWSCWatcher() {
    // Baxia 与 AWSC 经常在 document 挂载后动态加载，我们需要在它们加载时进行安全拦截
    // 这里 hook Object.defineProperty 以便随时拦截 baxiaCommon 或 AWSC 的定义

    var _baxiaCommon = undefined;
    var _AWSC = undefined;

    Object.defineProperty(window, 'baxiaCommon', {
      get: function () {
        return _baxiaCommon;
      },
      set: function (val) {
        log('Intercepted baxiaCommon set');
        if (val && typeof val === 'object') {
          // 保护 getUA 方法，防止其报错或传出非法堆栈
          if (typeof val.getUA === 'function') {
            var rawGetUA = val.getUA;
            val.getUA = function () {
              log('baxiaCommon.getUA called');
              try {
                return rawGetUA.apply(this, arguments);
              } catch (err) {
                // 如果原始 getUA 因沙箱等环境差异报错，返回标准降级 UA token
                return "231!/+zmPAmUdD/+jwUDJVtKeAho2shMCyj7hSDLY+3v84eWI4RlXRn996QquuV0SsyUA81z1ZxFP7vpLOxYmMbSCZz++hSVda6zN1FR3kjG0Q3oyE+jrhthb4jucVNGHkE+++3+qCS4+ItNk+Qju8eAo+4o7W9EGyJ5YX8QBQ0vBsi9s2jKmjLXV8EC5q+JFxijKd0eJ95IMKxCSH3/3UQ8J";
              }
            };
          }
        }
        _baxiaCommon = val;
      },
      configurable: true
    });

    Object.defineProperty(window, 'AWSC', {
      get: function () {
        return _AWSC;
      },
      set: function (val) {
        log('Intercepted AWSC set');
        if (val && typeof val === 'object') {
          // hook AWSC.use 来拦截和监控具体模块（如 fy, nc 等）的实例化
          if (typeof val.use === 'function') {
            var rawUse = val.use;
            val.use = function (name, callback, options) {
              log('AWSC.use called for module:', name);
              var wrappedCallback = callback;
              if (typeof callback === 'function') {
                wrappedCallback = function (state, module) {
                  if (state === 'ok' && module) {
                    // 1. 如果是 fireyejs 或者是 getFYToken 模块
                    if (typeof module.getFYToken === 'function') {
                      var rawGetFYToken = module.getFYToken;
                      module.getFYToken = function () {
                        log('FYToken requested');
                        try {
                          return rawGetFYToken.apply(this, arguments);
                        } catch (err) {
                          // 返回一份假的或缓存的 Token 绕过崩溃/反爬
                          return "231!HJ+mfkmU68k+jyXBJi4feAho2shMCyj7hSDLY+3v84eWI4RlX4sjCC5tyZF3Y0uVse/QX5IFrnP9erqXOoyFSn15g9kilW04Arce9iD+Fw8e+Zd++R52r2p+L9vKHJBh";
                        }
                      };
                    }
                  }
                  return callback(state, module);
                };
              }
              return rawUse.call(this, name, wrappedCallback, options);
            };
          }
        }
        _AWSC = val;
      },
      configurable: true
    });
  }

  // 4. 执行反检测初始化
  bypassWebDriver();
  mockChromeEnvironment();
  setupBaxiaAndAWSCWatcher();
  log('Ali Anti-Detect extensions initialized');
})();
