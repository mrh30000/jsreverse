// Background script for XHS Post Extractor

const STORAGE_KEY = 'crawler_rpc_config';

// SW 保活 alarm。MV3 SW 空闲 30s 即被回收，所有 chrome.runtime.Port 一并断开。
// 用 chrome.alarms 周期性唤醒 SW（最小 0.5 分钟），结合 ws/心跳活动一起保活。
const SW_KEEPALIVE_ALARM = 'sekiro-sw-keepalive';

if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.create(SW_KEEPALIVE_ALARM, { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    // 处理函数留空：alarm 触发本身即唤醒 SW，足以重置空闲计时。
    if (alarm.name === SW_KEEPALIVE_ALARM) return;
  });
}

// ── 侧边栏唤起绑定 (Chrome SidePanel API) ──
if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[Background] Failed to set side panel behavior:', err);
  });
}

let hasCapturedXClientData = false;
let hasCapturedXBrowserValidation = false;

// ── 浏览器环境检测 ──
// Firefox 在全局暴露 browser 对象（且 browser !== chrome），Chrome 不暴露
const isFirefox = (function () {
  try {
    return typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL('').indexOf('moz-extension:') === 0;
  } catch (e) {
    return false;
  }
})();

// ── APM 上报拦截（zhipin.com DEVICE_ACTION 反检测） ──
// 拦截发往 apm-fe.zhipin.com 的 DEVICE_ACTION 上报请求，
// 阻止服务端获知本地 WebSocket 代理和 Chrome 扩展检测结果。
(function installApmBlockRule() {
  var dnr = (typeof chrome !== 'undefined' && chrome.declarativeNetRequest) ||
            (typeof browser !== 'undefined' && browser.declarativeNetRequest);
  if (!dnr) return;

  // 细粒度功能检测：确保动态规则 API 可用
  if (typeof dnr.addDynamicRules !== 'function' || typeof dnr.getDynamicRules !== 'function') {
    console.warn('[Background] declarativeNetRequest dynamic rules API not available');
    return;
  }

  var RULE_ID_ZHIPIN_APM = 1;

  try {
    dnr.getDynamicRules().then(function (existingRules) {
      var hasRule = existingRules.some(function (r) { return r.id === RULE_ID_ZHIPIN_APM; });
      if (hasRule) return; // 规则已存在，不重复添加

      return dnr.addDynamicRules([{
        id: RULE_ID_ZHIPIN_APM,
        priority: 1,
        action: {
          type: 'block'
        },
        condition: {
          urlFilter: '||apm-fe.zhipin.com/wapi/zpApm/actionLog',
          resourceTypes: ['xmlhttprequest']
        }
      }]);
    }).then(function () {
      console.log('[Background] APM DEVICE_ACTION block rule installed for zhipin.com');
    }).catch(function (e) {
      console.warn('[Background] Failed to install APM block rule:', e.message || e);
    });
  } catch (e) {
    console.warn('[Background] declarativeNetRequest error:', e);
  }
})();

// ── 允许跨域访问 api.openai.com 的 CORS 规则 ──
(function installOpenaiCorsRule() {
  var dnr = (typeof chrome !== 'undefined' && chrome.declarativeNetRequest) ||
            (typeof browser !== 'undefined' && browser.declarativeNetRequest);
  if (!dnr) return;

  if (typeof dnr.addDynamicRules !== 'function' || typeof dnr.getDynamicRules !== 'function') {
    return;
  }

  var RULE_ID_OPENAI_CORS = 2;

  try {
    dnr.getDynamicRules().then(function (existingRules) {
      var removePromise = typeof dnr.removeDynamicRules === 'function'
        ? dnr.removeDynamicRules([RULE_ID_OPENAI_CORS])
        : Promise.resolve();

      return removePromise.then(function () {
        return dnr.addDynamicRules([{
          id: RULE_ID_OPENAI_CORS,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              { header: 'Access-Control-Allow-Origin', operation: 'set', value: '*' },
              { header: 'Access-Control-Allow-Methods', operation: 'set', value: 'GET, POST, PUT, DELETE, OPTIONS' },
              { header: 'Access-Control-Allow-Headers', operation: 'set', value: '*' }
            ]
          },
          condition: {
            urlFilter: '||api.openai.com'
          }
        }]);
      });
    }).then(function () {
      console.log('[Background] CORS modifyHeaders rule installed for api.openai.com');
    }).catch(function (e) {
      console.warn('[Background] Failed to install OpenAI CORS rule:', e.message || e);
    });
  } catch (e) {
    console.warn('[Background] declarativeNetRequest error for OpenAI:', e);
  }
})();

// ── webRequest 拦截 YouTube 请求头 ──
// Firefox 不支持 extraHeaders 选项，需要做兼容处理
var webRequestExtraInfoSpec = ["requestHeaders"];
if (!isFirefox) {
  // Chrome 需要 extraHeaders 才能获取 X-Client-Data 等自定义头
  webRequestExtraInfoSpec.push("extraHeaders");
}

// 需要捕获并注入页面的请求头配置：headerName -> { flag, windowProp }
const CAPTURED_HEADERS = [
  { name: 'x-client-data', getFlag: () => hasCapturedXClientData, setFlag: () => { hasCapturedXClientData = true; }, windowProp: 'x_client_data' },
  { name: 'x-browser-validation', getFlag: () => hasCapturedXBrowserValidation, setFlag: () => { hasCapturedXBrowserValidation = true; }, windowProp: 'x_browser_validation' }
];

chrome.webRequest.onBeforeSendHeaders.addListener(
    async (details) => {
        for (const header of details.requestHeaders) {
            const headerKey = header.name.toLowerCase();
            const config = CAPTURED_HEADERS.find(h => h.name === headerKey);
            if (!config || config.getFlag()) continue;

            config.setFlag();

            // 注入到网页的真实 window 对象 (MAIN world)
            chrome.scripting.executeScript({
                target: { tabId: details.tabId },
                world: "MAIN",
                func: (prop, val) => {
                    window[prop] = val;
                    console.log(`YouTube ${prop} 已更新至 window.${prop}`);
                },
                args: [config.windowProp, header.value]
            }).catch(err => console.debug(`注入 ${headerKey} 失败:`, err));
        }
    },
    { urls: ["*://*.youtube.com/*"] },
    webRequestExtraInfoSpec
);

function isTrustedExtensionPageSender(sender) {
    const root = chrome.runtime.getURL('');
    return Boolean(
        sender &&
        sender.id === chrome.runtime.id &&
        typeof sender.url === 'string' &&
        sender.url.startsWith(root)
    );
}

function configObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 使用安全的响应函数，防止在通道关闭后尝试发送响应
    let isResponseSent = false;
    const safeSendResponse = (response) => {
        if (isResponseSent) {
            console.log('[Background] Response already sent, ignoring duplicate');
            return;
        }
        try {
            sendResponse(response);
            isResponseSent = true;
        } catch (error) {
            // 消息通道可能已关闭（页面被刷新或关闭）
            console.log('[Background] Could not send response (channel may be closed):', error.message);
        }
    };

    if (request.action === 'saveConfig') {
        if (!isTrustedExtensionPageSender(sender)) {
            safeSendResponse({ success: false, error: 'Unauthorized config save' });
            return false;
        }
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
                safeSendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            const currentConfig = configObject(result[STORAGE_KEY]);
            const candidate = configObject(request.config);
            const nextConfig = Object.assign({}, currentConfig);
            if (Object.prototype.hasOwnProperty.call(candidate, 'wsHost')) {
                const wsHost = CrawlerRpcManager.normalizeWsHost(candidate.wsHost);
                if (!wsHost) {
                    safeSendResponse({ success: false, error: 'Invalid WebSocket host' });
                    return;
                }
                nextConfig.wsHost = wsHost;
            }
            if (typeof candidate.rpcToken === 'string') nextConfig.rpcToken = candidate.rpcToken;
            nextConfig.actionDelay = Number.isFinite(candidate.actionDelay) && candidate.actionDelay >= 0
                ? candidate.actionDelay
                : (Number.isFinite(currentConfig.actionDelay) && currentConfig.actionDelay >= 0
                    ? currentConfig.actionDelay : 0);
            if (Object.prototype.hasOwnProperty.call(candidate, 'cf_autopilot')) {
                nextConfig.cf_autopilot = candidate.cf_autopilot;
            }
            chrome.storage.local.set({ [STORAGE_KEY]: nextConfig }, () => {
                if (chrome.runtime.lastError) {
                    safeSendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    safeSendResponse({ success: true });
                }
            });
        });
        return true; // 保持消息通道打开以进行异步响应
    }
    else if (request.action === 'getSiteCookies') {
        if (Object.prototype.hasOwnProperty.call(request, 'url')) {
            safeSendResponse({ success: false, error: 'Caller URL is not allowed' });
            return false;
        }
        CrawlerBrowserActions.getSiteCookiesForSender(chrome, sender)
            .then((cookies) => safeSendResponse({ success: true, cookies }))
            .catch((error) => safeSendResponse({
                success: false,
                error: error.message
            }));
        return true;
    }
    else if (request.action === 'proxyFetch') {
        // 代理跨域 fetch 请求
        const { url, options = {} } = request;
        console.log('[Background] Proxy fetch:', url);

        // 设置较短的超时时间，避免超过消息通道的超时限制（约 60 秒）
        const timeout = Math.min(options.timeout || 10000, 50000);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);

        // 确保一定会发送响应，避免消息通道超时错误
        fetch(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body,
            credentials: options.credentials || 'omit',
            signal: controller.signal
        })
            .then(async response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const text = await response.text();
                console.log('[Background] Proxy fetch success, length:', text.length);
                safeSendResponse({ success: true, data: text });
            })
            .catch(error => {
                clearTimeout(timeoutId);
                const errorMsg = error.name === 'AbortError'
                    ? `Request timeout after ${timeout}ms`
                    : error.message;
                console.error('[Background] Proxy fetch error:', errorMsg);
                safeSendResponse({ success: false, error: errorMsg });
            })
            .finally(() => {
                // 确保超时被清除
                clearTimeout(timeoutId);
            });
        return true; // 保持消息通道打开以进行异步响应
    }
    else {
        // 未知的 action，同步返回错误
        console.warn('[Background] Unknown action:', request.action);
        safeSendResponse({ success: false, error: `Unknown action: ${request.action}` });
        return false; // 同步响应
    }
});

let _cachedLocalIP = null;

/**
 * 探测本机局域网 IP 地址。
 * 在 MV3 Service Worker 中通过 fetch 探测哪个本地 IP 可以访问 WS 服务器。
 * 结果缓存，后续调用直接返回缓存值。
 * @returns {Promise<string|null>}
 */
async function detectLocalIP(wsURL) {
  if (_cachedLocalIP) return _cachedLocalIP;

  // 从 WS URL 提取端口号用于探测
  let probePort = 5612;
  if (wsURL) {
    try { probePort = new URL(wsURL).port || 5612; } catch (_) {}
  }

  // 方式 1：chrome.system.network.getNetworkInterfaces（部分 MV3 环境可用）
  if (typeof chrome !== 'undefined' && chrome.system && chrome.system.network &&
      typeof chrome.system.network.getNetworkInterfaces === 'function') {
    try {
      const interfaces = await chrome.system.network.getNetworkInterfaces();
      for (const iface of interfaces) {
        const addr = iface.address;
        if (addr && !addr.startsWith('127.') && !addr.startsWith('0.') && addr !== '0.0.0.0' && addr.includes('.')) {
          _cachedLocalIP = addr;
          console.log('[Background] Detected local IP via system.network:', addr);
          return addr;
        }
      }
    } catch (e) {
      console.warn('[Background] system.network failed:', e.message || e);
    }
  }

  // 方式 2：通过 fetch 探测 — 尝试常见本地 IP
  // 服务端监听 0.0.0.0，任何本机网卡 IP 都应该可达

  // 方式 3：WebRTC（如果 RTCPeerConnection 在 SW 中可用）
  if (typeof RTCPeerConnection !== 'undefined') {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try { pc.close(); } catch (_) {}
        resolve(_cachedLocalIP || null);
      }, 3000);

      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const match = event.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          const ip = match[1];
          if (!ip.startsWith('127.') && !ip.startsWith('0.') && ip !== '0.0.0.0') {
            _cachedLocalIP = ip;
            clearTimeout(timeout);
            try { pc.close(); } catch (_) {}
            console.log('[Background] Detected local IP via WebRTC:', ip);
            resolve(ip);
          }
        }
      };

      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => {
        clearTimeout(timeout);
        resolve(_cachedLocalIP || null);
      });
    });
  }

  // 方式 4：暴力探测常见本机 IP（最后手段）
  // 只探测最常见的子网前 10 个地址，500ms 超时
  const commonIPs = [];
  for (const subnet of ['192.168.1', '192.168.0', '192.168.2', '192.168.31', '10.0.0', '172.16.0']) {
    for (let host = 1; host <= 10; host++) {
      commonIPs.push(`${subnet}.${host}`);
    }
  }

  const probeResults = await Promise.allSettled(
    commonIPs.map(ip =>
      Promise.race([
        fetch(`http://${ip}:${probePort}/`, { mode: 'no-cors' }).then(() => ip),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 300))
      ])
    )
  );

  for (const result of probeResults) {
    if (result.status === 'fulfilled' && result.value && !result.value.startsWith('127.')) {
      _cachedLocalIP = result.value;
      console.log('[Background] Detected local IP via probe:', result.value);
      return result.value;
    }
  }

  console.warn('[Background] Could not detect local IP');
  return null;
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'rpc-bridge') {
    rpcConnectionManager.attachPort(port);
  }
});

function createRpcId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

const browserActionRegistry =
  CrawlerBrowserActions.createBrowserActionRegistry(chrome);
const rpcConnectionManager =
  CrawlerRpcManager.createRpcConnectionManager({
    WebSocketCtor: WebSocket,
    clock: {
      setTimeout: (...args) => setTimeout(...args),
      clearTimeout: (...args) => clearTimeout(...args),
      setInterval: (...args) => setInterval(...args),
      clearInterval: (...args) => clearInterval(...args),
      now: Date.now
    },
    createId: createRpcId,
    detectLocalIP,
    logger: console
  });

chrome.storage.local.get([STORAGE_KEY], function (result) {
  rpcConnectionManager.start(result[STORAGE_KEY] || {}, browserActionRegistry);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
  rpcConnectionManager.updateConfig(changes[STORAGE_KEY].newValue || {});
});
