/**
 * Cloudflare Autopilot - 自动检测并绕过 Cloudflare 挑战的触发器
 *
 * 设计目标:
 *   - 监听 DOM 变化,自动识别 "Just a moment..." / Turnstile / Interstitial 挑战
 *   - 命中后自动调用 window.CloudflareSolver.solve() 求解
 *   - 通过 chrome.storage(经 bridge)持久化配置与统计
 *   - 通过 postMessage 把事件报告给 ISOLATED bridge 供 popup / 外部 RPC 消费
 *
 * 依赖:
 *   - window.CloudflareSolver  (由 lib/cloudflare_solver.js 提供)
 *   - window.CloudflareConfig  (经由 bridge 同步的运行时配置)
 *
 * 注入时机: document_idle (MAIN world)
 *
 * 配置 storage key: crawler_rpc_config.cf_autopilot = {
 *   enabled: boolean,
 *   whitelist: string[],   // 域名白名单,只对列表中的 host 生效
 *   blacklist: string[],   // 域名黑名单,优先于白名单
 *   pollInterval: number,  // 轮询兜底间隔(ms),默认 2000
 *   maxAttemptsPerPage: number, // 单页最大触发次数,默认 3
 *   retries: number,       // 单次 solve 重试次数,默认 1
 *   timeout: number,       // 单次 solve timeout(ms),默认 5000
 * }
 *
 * 统计 storage key: crawler_rpc_stats.cf_autopilot = {
 *   [host]: { hits: number, solved: number, failed: number, lastSeen: ts }
 * }
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.__cloudflare_autopilot_loaded) return;
  window.__cloudflare_autopilot_loaded = true;

  // ==================== 常量 ====================
  var CF_STORAGE_CONFIG_KEY = 'crawler_rpc_config';          // 与 bridge.js 对齐
  var CF_CONFIG_PATH = 'cf_autopilot';                       // 配置在 storage 中的路径
  var CF_STATS_KEY = 'crawler_rpc_stats';                    // 统计 storage key
  var CF_STATS_PATH = 'cf_autopilot';                        // 统计在 storage 中的路径
  var CF_BRIDGE_SOURCE = 'crawler_rpc_bridge';
  var CF_MAIN_SOURCE = 'crawler_rpc_main';

  var DEFAULT_CONFIG = {
    enabled: false,                  // 默认关闭,需要用户/外部 RPC 显式开启
    whitelist: [],                   // 空数组 = 不限域名
    blacklist: [],                   // 优先于白名单
    pollInterval: 2000,
    maxAttemptsPerPage: 3,
    retries: 1,
    timeout: 5000
  };

  var LOG_PREFIX = '[CF-Autopilot]';

  // ==================== 工具 ====================
  function log(level, msg) {
    try {
      var line = new Date().toISOString() + ' ' + LOG_PREFIX + ' ' + level + ' ' + msg;
      if (level === 'error' && console && console.error) console.error(line);
      else if (level === 'warn' && console && console.warn) console.warn(line);
      else if (console && console.log) console.log(line);
    } catch (e) {}
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function merge(target, source) {
    var out = {};
    var k;
    for (k in target) if (Object.prototype.hasOwnProperty.call(target, k)) out[k] = target[k];
    for (k in source) if (Object.prototype.hasOwnProperty.call(source, k)) out[k] = source[k];
    return out;
  }

  function hostnameMatches(host, list) {
    if (!Array.isArray(list) || list.length === 0) return false;
    for (var i = 0; i < list.length; i++) {
      var item = String(list[i] || '').toLowerCase().trim();
      if (!item) continue;
      if (host === item) return true;
      if (host.endsWith('.' + item)) return true;
    }
    return false;
  }

  // ==================== 配置同步 ====================
  var runtimeConfig = merge({}, DEFAULT_CONFIG);

  // 监听来自 bridge 的配置推送
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    var msg = event.data;
    if (!msg || msg.source !== CF_BRIDGE_SOURCE) return;
    if (msg.action === 'cfConfigUpdate' && msg.config && msg.config.cf_autopilot) {
      runtimeConfig = merge(runtimeConfig, msg.config.cf_autopilot);
      log('info', 'config updated: enabled=' + runtimeConfig.enabled);
    }
  });

  // 主动向 bridge 拉取最新配置
  function fetchConfig() {
    return new Promise(function (resolve) {
      var requestId = 'cf_cfg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var done = false;
      function onMessage(event) {
        if (event.source !== window) return;
        var msg = event.data;
        if (!msg || msg.source !== CF_BRIDGE_SOURCE || msg.requestId !== requestId) return;
        done = true;
        window.removeEventListener('message', onMessage);
        clearTimeout(timer);
        if (msg.success && msg.config && msg.config.cf_autopilot) {
          resolve(msg.config.cf_autopilot);
        } else {
          resolve(null);
        }
      }
      window.addEventListener('message', onMessage);
      var timer = setTimeout(function () {
        if (done) return;
        window.removeEventListener('message', onMessage);
        resolve(null);
      }, 1500);
      window.postMessage({
        source: CF_MAIN_SOURCE,
        action: 'getConfig',
        requestId: requestId
      }, '*');
    });
  }

  // 上报事件给 bridge
  function reportEvent(type, payload) {
    try {
      window.postMessage(Object.assign({
        source: CF_MAIN_SOURCE,
        action: 'cfAutopilotEvent',
        type: type,
        ts: Date.now()
      }, payload || {}), '*');
    } catch (e) { /* ignore */ }
  }

  // 更新统计(走 storage 异步,不阻塞主流程)
  function bumpStat(host, field, delta) {
    try {
      window.postMessage({
        source: CF_MAIN_SOURCE,
        action: 'cfStatBump',
        host: host,
        path: CF_STATS_PATH,
        field: field,
        delta: typeof delta === 'number' ? delta : 1,
        ts: Date.now()
      }, '*');
    } catch (e) { /* ignore */ }
  }

  // ==================== 决策 ====================
  function decideRun(config) {
    if (!config || !config.enabled) return { run: false, reason: 'disabled' };
    var host = location.hostname.toLowerCase();
    if (hostnameMatches(host, config.blacklist)) return { run: false, reason: 'blacklisted:' + host };
    if (Array.isArray(config.whitelist) && config.whitelist.length > 0) {
      if (!hostnameMatches(host, config.whitelist)) return { run: false, reason: 'not-in-whitelist:' + host };
    }
    return { run: true, host: host };
  }

  // ==================== 触发器主体 ====================
  function start() {
    if (!window.CloudflareSolver || typeof window.CloudflareSolver.solve !== 'function') {
      log('warn', 'window.CloudflareSolver not available, autopilot disabled');
      return;
    }

    var attempts = 0;            // 本页触发次数
    var busy = false;            // 防止重入
    var lastDetectedTs = 0;
    var stopped = false;

    function detectHit() {
      if (typeof window.CloudflareSolver.detect === 'function') {
        return window.CloudflareSolver.detect();
      }
      // 兜底:仅看 "Just a moment..." 标题
      var t = document.title || '';
      return t.indexOf('Just a moment') !== -1 ? 'non-interactive' : null;
    }

    async function trySolve(cfg) {
      if (busy || stopped) return;
      if (attempts >= (cfg.maxAttemptsPerPage || DEFAULT_CONFIG.maxAttemptsPerPage)) {
        log('warn', 'max attempts reached, giving up on this page');
        stopped = true;
        return;
      }
      var challenge = detectHit();
      if (!challenge) return;
      attempts++;
      lastDetectedTs = Date.now();
      busy = true;
      log('info', 'detected challenge: ' + challenge + ' (attempt ' + attempts + ')');
      reportEvent('detected', { challenge: challenge, host: location.hostname });
      bumpStat(location.hostname, 'hits', 1);

      try {
        var result = await window.CloudflareSolver.solve({
          retries: cfg.retries || DEFAULT_CONFIG.retries,
          timeout: cfg.timeout || DEFAULT_CONFIG.timeout
        });
        if (result && result.success) {
          log('info', 'solved in ' + result.elapsed + 'ms');
          bumpStat(location.hostname, 'solved', 1);
          reportEvent('solved', { challenge: result.challengeType, elapsed: result.elapsed });
        } else {
          log('warn', 'solve failed: ' + (result && result.error ? result.error : 'unknown'));
          bumpStat(location.hostname, 'failed', 1);
          reportEvent('failed', { error: result && result.error, attempts: result && result.attempts });
        }
      } catch (err) {
        log('error', 'solve threw: ' + (err && err.message ? err.message : String(err)));
        bumpStat(location.hostname, 'failed', 1);
        reportEvent('error', { error: err && err.message });
      } finally {
        busy = false;
      }
    }

    // MutationObserver 监听 DOM 变化,CF 改 DOM 立即触发
    var moScheduled = false;
    function scheduleSolve() {
      if (moScheduled) return;
      moScheduled = true;
      // debounce 500ms,避免连续插入
      setTimeout(function () {
        moScheduled = false;
        var cfg = runtimeConfig;
        var d = decideRun(cfg);
        if (d.run) trySolve(cfg);
      }, 500);
    }

    var observer = null;
    function ensureObserver() {
      if (observer || !document.documentElement) return;
      try {
        observer = new MutationObserver(function () { scheduleSolve(); });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: false
        });
      } catch (e) { /* ignore */ }
    }

    // 兜底轮询
    var pollTimer = null;
    function ensurePoller() {
      if (pollTimer) return;
      var interval = Math.max(1000, runtimeConfig.pollInterval || DEFAULT_CONFIG.pollInterval);
      pollTimer = setInterval(function () {
        var cfg = runtimeConfig;
        var d = decideRun(cfg);
        if (d.run) trySolve(cfg);
      }, interval);
    }

    // 页面隐藏时停止轮询,显示时恢复(MO 继续)
    function onVisibility() {
      if (document.hidden) {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      } else {
        ensurePoller();
        ensureObserver();
        // 重新触发一次检测
        var cfg = runtimeConfig;
        if (decideRun(cfg).run) trySolve(cfg);
      }
    }

    // 配置变化后重新决策
    function watchConfig() {
      setInterval(function () {
        var d = decideRun(runtimeConfig);
        if (d.run) {
          ensurePoller();
          ensureObserver();
        } else {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          if (observer) { try { observer.disconnect(); } catch (e) {} observer = null; }
        }
      }, 5000);
    }

    // 初始化
    fetchConfig().then(function (cfg) {
      if (cfg) runtimeConfig = merge(runtimeConfig, cfg);
      log('info', 'initial config: enabled=' + runtimeConfig.enabled);
      var d = decideRun(runtimeConfig);
      if (!d.run) {
        log('info', 'autopilot not active: ' + d.reason);
        // 仍然观察配置变化,开了就启动
        watchConfig();
        return;
      }
      ensureObserver();
      ensurePoller();
      watchConfig();
      document.addEventListener('visibilitychange', onVisibility);
      // 首屏检测
      trySolve(runtimeConfig);
    });
  }

  // 暴露给外部
  window.CloudflareAutopilot = {
    start: start,
    getConfig: function () { return merge({}, runtimeConfig); },
    refreshConfig: fetchConfig,
    version: '1.0.0'
  };

  // 在 CloudflareSolver 加载完成后启动
  // 由于 manifest 加载顺序保证 cloudflare_solver.js 在前,这里可以同步启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
