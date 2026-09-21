/**
 * Cloudflare 挑战自动求解器
 *
 * 参考自 Scrapling 的 _cloudflare_solver，针对浏览器扩展的 MAIN world 运行环境
 * 做了适配：当页面被 Cloudflare 拦截（Just a moment... / Turnstile / Interstitial）
 * 时自动检测并模拟点击验证。
 *
 * 适用场景：
 *   - 在 content script 中拿到当前页面的 window/document 后调用
 *   - 通过 RPC 暴露成 action（如 `cf.solve`），让外部调用方在拿不到页面 DOM
 *     的情况下也能让扩展帮忙过验证
 *
 * 使用方式：
 *   CloudflareSolver.solve({ retries: 2, timeout: 15000 }).then(result => { ... });
 *
 * 返回值（统一信封格式）：
 *   {
 *     success: boolean,
 *     challengeType: 'non-interactive' | 'managed' | 'interactive' | 'embedded' | null,
 *     elapsed: number,        // 毫秒
 *     attempts: number,
 *     error?: string
 *   }
 *
 * 注意：
 *   - 本脚本运行在 MAIN world，不能依赖 chrome.* API
 *   - 鼠标点击通过派发 PointerEvent / MouseEvent 模拟（与 Playwright mouse.click
 *     行为接近：先 mouseover，再 mousedown，再 mouseup，再 click）
 *   - 不修改页面 DOM，避免影响站点本身
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.__cloudflare_solver_loaded) return;
  window.__cloudflare_solver_loaded = true;

  // Cloudflare challenge iframe 的 src 正则，与 Scrapling 中 __CF_PATTERN__ 对齐
  var CF_IFRAME_PATTERN = /^https?:\/\/challenges\.cloudflare\.com\/cdn-cgi\/challenge-platform\//;

  // "Just a moment..." 等待页特征
  var WAIT_TITLE = '<title>Just a moment...</title>';
  // "Verifying you are human." 验证中提示
  var VERIFYING_HINT = 'Verifying you are human.';

  var LOG_PREFIX = '[CF-Solver]';

  // 简单日志，避免在生产代码里直接 console.log（参考 utils.js 中 logToConsole）
  function log(level, msg) {
    try {
      var ts = new Date().toISOString();
      var line = ts + ' ' + LOG_PREFIX + ' ' + level + ' ' + msg;
      if (level === 'error' && console && console.error) console.error(line);
      else if (console && console.log) console.log(line);
    } catch (e) { /* ignore */ }
  }

  /**
   * 生成 [min, max] 之间的随机整数
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 等待指定毫秒
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * 获取页面 HTML 字符串（近似 Scrapling 中 _get_page_content 的能力）。
   * 这里仅取 outerHTML 截断，避免 DOM 巨大时内存问题。
   * @returns {string}
   */
  function getPageContent() {
    try {
      if (!document.documentElement) return '';
      var html = document.documentElement.outerHTML || '';
      // 限制大小，超长截断（Cloudflare 验证的特征通常在前 200KB 内）
      return html.length > 200000 ? html.slice(0, 200000) : html;
    } catch (e) {
      return '';
    }
  }

  /**
   * 检测 Cloudflare 挑战类型
   * 参考 Scrapling _detect_cloudflare：
   *   - non-interactive: cType: 'non-interactive'
   *   - managed:        cType: 'managed'
   *   - interactive:    cType: 'interactive'
   *   - embedded:       script src 包含 challenges.cloudflare.com/turnstile/v
   * @returns {string|null}
   */
  function detectCloudflare() {
    var content = getPageContent();
    if (!content) return null;

    var types = ['non-interactive', 'managed', 'interactive'];
    for (var i = 0; i < types.length; i++) {
      if (content.indexOf("cType: '" + types[i] + "'") !== -1) {
        return types[i];
      }
    }

    // embedded: 检测 turnstile script
    try {
      var scripts = document.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile/v"]');
      if (scripts && scripts.length > 0) {
        return 'embedded';
      }
    } catch (e) { /* ignore */ }

    return null;
  }

  /**
   * 等待网络空闲
   * @param {number} timeout
   * @returns {Promise<void>}
   */
  function waitForNetworkIdle(timeout) {
    // MAIN world 里没有直接的网络空闲 API，这里退化为等待一小段时间。
    // Scrapling 在 Playwright 中能拿到真实 page 对象，本环境只能 best-effort。
    return sleep(Math.min(timeout || 5000, 5000));
  }

  /**
   * 等待页面稳定（多次轮询 content 不再变化）
   * @param {number} maxMs
   * @returns {Promise<void>}
   */
  function waitForPageStability(maxMs) {
    maxMs = maxMs || 5000;
    var lastContent = getPageContent();
    var stableCount = 0;
    var start = Date.now();
    return (async function loop() {
      while (Date.now() - start < maxMs) {
        await sleep(300);
        var cur = getPageContent();
        if (cur === lastContent) {
          stableCount++;
          if (stableCount >= 2) return;
        } else {
          stableCount = 0;
          lastContent = cur;
        }
      }
    })();
  }

  /**
   * 找到 Cloudflare challenge iframe 元素。
   * 与 Scrapling `page.frame(url=__CF_PATTERN__)` 对齐。
   * @returns {HTMLIFrameElement|null}
   */
  function findCFIframe() {
    try {
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        var src = iframes[i].src || '';
        if (CF_IFRAME_PATTERN.test(src)) {
          return iframes[i];
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  /**
   * 取元素在视口中的 bounding box（MAIN world 没有 Playwright 的 bounding_box，
   * 但 getBoundingClientRect 够用）。
   * @param {Element} el
   * @returns {{x:number,y:number,width:number,height:number}|null}
   */
  function getBoundingBox(el) {
    try {
      var rect = el.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  /**
   * 模拟一次鼠标点击（按坐标），尽量贴近 Playwright `mouse.click` 的事件序列。
   * Scrapling 使用 `page.mouse.click(x, y, delay=randint(100,200), button="left")`，
   * 浏览器里通过依次派发 mouseover -> mousemove -> mousedown -> mouseup -> click 复现。
   * @param {number} x
   * @param {number} y
   * @param {number} delay
   */
  function dispatchMouseClick(x, y, delay) {
    var target = document.elementFromPoint(x, y) || document.body;
    var common = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y
    };

    // 派发鼠标事件序列
    var events = ['mouseover', 'mousemove', 'mousedown'];
    for (var i = 0; i < events.length; i++) {
      try {
        target.dispatchEvent(new MouseEvent(events[i], common));
      } catch (e) { /* ignore */ }
    }

    return sleep(delay || randInt(100, 200)).then(function () {
      try {
        target.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, common, { buttons: 0 })));
        target.dispatchEvent(new MouseEvent('click', common));
      } catch (e) { /* ignore */ }
    });
  }

  /**
   * 检测当前是否还处于 "Just a moment..." 等待页
   * @returns {boolean}
   */
  function isStillChallengePage() {
    return getPageContent().indexOf(WAIT_TITLE) !== -1;
  }

  /**
   * 检测是否处于 "Verifying you are human." 中
   * @returns {boolean}
   */
  function isVerifying() {
    return getPageContent().indexOf(VERIFYING_HINT) !== -1;
  }

  /**
   * 求解 Cloudflare 挑战。逻辑与 Scrapling 同步版本一致：
   *   1. wait_for_networkidle
   *   2. _detect_cloudflare 决定 challenge_type
   *   3. non-interactive: 轮询等待 wait title 消失
   *   4. 其他：定位 iframe 或主页面内的验证框，计算坐标，模拟点击
   *   5. 失败则递归一次
   *
   * @param {object} [options]
   * @param {number} [options.retries=1]   失败后最大重试次数
   * @param {number} [options.timeout=5000] 等待网络空闲超时
   * @returns {Promise<{success:boolean,challengeType:(string|null),elapsed:number,attempts:number,error?:string}>}
   */
  async function solve(options) {
    var opts = options || {};
    var retries = typeof opts.retries === 'number' ? opts.retries : 1;
    var timeout = typeof opts.timeout === 'number' ? opts.timeout : 5000;
    var totalAttempts = 0;
    var startTime = Date.now();

    for (var attempt = 0; attempt <= retries; attempt++) {
      totalAttempts++;
      try {
        await waitForNetworkIdle(timeout);

        var challengeType = detectCloudflare();
        if (!challengeType) {
          log('info', 'No Cloudflare challenge found.');
          return {
            success: true,
            challengeType: null,
            elapsed: Date.now() - startTime,
            attempts: totalAttempts
          };
        }

        log('info', 'The turnstile version discovered is "' + challengeType + '"');

        // non-interactive: 只需轮询等待 wait title 消失
        if (challengeType === 'non-interactive') {
          var niAttempts = 0;
          while (isStillChallengePage()) {
            log('info', 'Waiting for Cloudflare wait page to disappear.');
            await sleep(1000);
            try { document.defaultView && document.defaultView.dispatchEvent(new Event('focus')); } catch (e) {}
            niAttempts++;
            if (niAttempts > 30) {
              log('error', 'non-interactive challenge did not disappear in time');
              break;
            }
          }
          if (!isStillChallengePage()) {
            log('info', 'Cloudflare captcha is solved');
            return {
              success: true,
              challengeType: challengeType,
              elapsed: Date.now() - startTime,
              attempts: totalAttempts
            };
          }
          // 没等到，进入下一轮重试
          continue;
        }

        // managed / interactive / embedded
        var boxSelector = '#cf_turnstile div, #cf-turnstile div, .turnstile>div>div';
        if (challengeType !== 'embedded') {
          boxSelector = '.main-content p+div>div>div';
          // 等 "Verifying you are human." 消失
          while (isVerifying()) {
            await sleep(500);
          }
        }

        var outerBox = null;
        var iframeEl = findCFIframe();
        if (iframeEl) {
          await waitForPageStability(3000);
          if (challengeType !== 'embedded') {
            // 双重检查 iframe 是否可见
            var visRetries = 0;
            while (iframeEl.offsetParent === null && visRetries < 10) {
              await sleep(500);
              visRetries++;
            }
          }
          outerBox = getBoundingBox(iframeEl);
        }

        if (!iframeEl || !outerBox) {
          if (!isStillChallengePage()) {
            log('info', 'Cloudflare captcha is solved');
            return {
              success: true,
              challengeType: challengeType,
              elapsed: Date.now() - startTime,
              attempts: totalAttempts
            };
          }
          // 退化到 box selector
          try {
            var nodes = document.querySelectorAll(boxSelector);
            if (nodes && nodes.length > 0) {
              outerBox = getBoundingBox(nodes[nodes.length - 1]);
            }
          } catch (e) { /* ignore */ }
        }

        if (!outerBox) {
          log('error', 'Could not locate captcha box; will retry if attempts remain');
          continue;
        }

        // 与 Scrapling 保持一致：在 viewport 内随机偏移，避免固定坐标
        var captchaX = outerBox.x + randInt(26, 28);
        var captchaY = outerBox.y + randInt(25, 27);
        await dispatchMouseClick(captchaX, captchaY, randInt(100, 200));

        await waitForNetworkIdle(timeout);

        if (challengeType !== 'embedded') {
          var waitRetries = 0;
          while (isStillChallengePage()) {
            if (waitRetries >= 100) {
              log('info', 'Cloudflare page didn\'t disappear after 10s, continuing...');
              break;
            }
            await sleep(100);
            waitRetries++;
          }
        }

        await waitForPageStability(3000);

        if (!isStillChallengePage()) {
          log('info', 'Cloudflare captcha is solved');
          return {
            success: true,
            challengeType: challengeType,
            elapsed: Date.now() - startTime,
            attempts: totalAttempts
          };
        }

        log('info', 'Looks like Cloudflare captcha is still present, solving again');
      } catch (err) {
        log('error', 'Solve attempt failed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    return {
      success: false,
      challengeType: detectCloudflare(),
      elapsed: Date.now() - startTime,
      attempts: totalAttempts,
      error: 'Cloudflare captcha did not clear after retries'
    };
  }

  // 暴露到 window
  window.CloudflareSolver = {
    solve: solve,
    detect: detectCloudflare,
    isChallenge: isStillChallengePage,
    version: '1.0.0'
  };

})();
