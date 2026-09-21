/**
 * Bridge Script - ISOLATED world 桥接脚本
 * 在 MAIN world 与浏览器扩展 API 之间中转消息
 * 同时支持 Chrome 和 Firefox (Manifest V3)
 */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  root.CrawlerRpcBridge = api;
  api.createBridge({
    windowObject: root.window || root,
    chromeApi: root.chrome,
    clock: {
      setTimeout: root.setTimeout.bind(root),
      clearTimeout: root.clearTimeout.bind(root)
    },
    logger: root.console
  }).start();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAIN_SOURCE = 'crawler_rpc_main';
  const BRIDGE_SOURCE = 'crawler_rpc_bridge';
  const BG_TIMEOUT_MS = 30000;
  const FETCH_TIMEOUT_MS = 45000;
  const RPC_RECONNECT_MS = 1000;
  const CF_AUTOPILOT_FIELDS = [
    'enabled', 'whitelist', 'blacklist', 'pollInterval',
    'maxAttemptsPerPage', 'retries', 'timeout'
  ];

  function copyCloudflareConfig(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    CF_AUTOPILOT_FIELDS.forEach(function (field) {
      if (source[field] !== undefined) {
        result[field] = Array.isArray(source[field]) ? source[field].slice() : source[field];
      }
    });
    return result;
  }

  function pickPublicConfig(config) {
    const source = config && typeof config === 'object' ? config : {};
    return {
      actionDelay: Number.isFinite(source.actionDelay) && source.actionDelay >= 0
        ? source.actionDelay : 0,
      cf_autopilot: copyCloudflareConfig(source.cf_autopilot)
    };
  }

  function validName(value) {
    return typeof value === 'string' && value.length >= 1 && value.length <= 128;
  }

  function normalizeRegistration(data) {
    if (!data || !validName(data.sessionId) || !validName(data.group) ||
        !Array.isArray(data.actions) || data.actions.length > 256) return null;
    const seen = new Set();
    const actions = [];
    for (const item of data.actions) {
      if (!item || !validName(item.name)) return null;
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      actions.push({ name: item.name, stream: Boolean(item.stream) });
    }
    return {
      sessionId: data.sessionId,
      group: data.group,
      actions: actions
    };
  }

  function createBridge(options) {
    const windowObject = options.windowObject;
    const chromeApi = options.chromeApi;
    const clock = options.clock;
    const logger = options.logger || {};
    const rpcSessions = new Map();
    let rpcPort = null;
    let rpcReconnectTimer = null;
    let publicConfig = null;
    const pendingConfigRequests = [];
    let started = false;

    function log(level, message, detail) {
      if (typeof logger[level] === 'function') logger[level](message, detail);
    }

    function post(message) {
      windowObject.postMessage(message, '*');
    }

    function hasRuntimeAPI() {
      return Boolean(chromeApi && chromeApi.runtime);
    }

    function withTimeout(promise, timeoutMs, label) {
      const timeoutPromise = new Promise(function (_, reject) {
        clock.setTimeout(function () {
          reject(new Error(label + ' timeout after ' + timeoutMs + 'ms'));
        }, timeoutMs);
      });
      return Promise.race([promise, timeoutPromise]);
    }

    async function getConfig() {
      if (publicConfig) return publicConfig;
      return new Promise(function (resolve) { pendingConfigRequests.push(resolve); });
    }

    async function getSiteCookies() {
      if (!hasRuntimeAPI()) throw new Error('Chrome Runtime API not available');
      const request = chromeApi.runtime.sendMessage({ action: 'getSiteCookies' });
      const result = await withTimeout(request, BG_TIMEOUT_MS, 'Background action getSiteCookies');
      if (!result || !result.success) {
        throw new Error((result && result.error) || 'Background action getSiteCookies failed');
      }
      return { success: true, cookies: Array.isArray(result.cookies) ? result.cookies : [] };
    }

    async function proxyFetch(url, requestOptions) {
      if (!hasRuntimeAPI()) return { success: false, error: 'Chrome Runtime API not available' };
      const proxyOptions = requestOptions || {};
      const timeout = Math.min(proxyOptions.timeout || 10000, FETCH_TIMEOUT_MS);
      const request = chromeApi.runtime.sendMessage({
        action: 'proxyFetch', url: url, options: proxyOptions
      });
      try {
        const result = await withTimeout(request, timeout, 'proxyFetch');
        if (result && result.success) return { success: true, data: result.data };
        return { success: false, error: (result && result.error) || 'Unknown error' };
      } catch (error) {
        log('error', '[Bridge] proxyFetch error:', error);
        return { success: false, error: error.message || 'proxyFetch failed' };
      }
    }

    function postRpcState(sessionId, state, reason) {
      const message = {
        source: BRIDGE_SOURCE,
        action: 'rpcState',
        sessionId: validName(sessionId) ? sessionId : '',
        state: state
      };
      if (reason) message.reason = reason;
      post(message);
    }

    function rpcRegistrationMessage(session) {
      return {
        type: 'rpc.register',
        sessionId: session.sessionId,
        group: session.group,
        actions: session.actions.map(function (item) {
          return { name: item.name, stream: item.stream };
        })
      };
    }

    function postRpcRegistration(port, session) {
      try { port.postMessage(rpcRegistrationMessage(session)); } catch (_) {}
    }

    function clearRpcReconnect() {
      if (rpcReconnectTimer === null) return;
      clock.clearTimeout(rpcReconnectTimer);
      rpcReconnectTimer = null;
    }

    function scheduleRpcReconnect() {
      if (rpcReconnectTimer !== null || rpcSessions.size === 0) return;
      rpcSessions.forEach(function (session) {
        postRpcState(session.sessionId, 'reconnecting');
      });
      rpcReconnectTimer = clock.setTimeout(function () {
        rpcReconnectTimer = null;
        ensureRpcPort();
      }, RPC_RECONNECT_MS);
    }

    function forwardRpcMessage(message) {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'rpc.invoke') {
        post({
          source: BRIDGE_SOURCE,
          action: 'rpcInvoke',
          sessionId: message.sessionId,
          invocationId: message.invocationId,
          rpcAction: message.action,
          params: message.params || {}
        });
        return;
      }
      if (message.type === 'rpc.state') {
        const stateMessage = {
          source: BRIDGE_SOURCE,
          action: 'rpcState',
          sessionId: message.sessionId,
          state: message.state
        };
        if (typeof message.reason === 'string') stateMessage.reason = message.reason;
        post(stateMessage);
        return;
      }
      if (message.type === 'rpc.publicConfig') {
        const config = pickPublicConfig(message.config);
        publicConfig = config;
        post({ source: BRIDGE_SOURCE, action: 'rpcPublicConfig', config: config });
        post({ source: BRIDGE_SOURCE, action: 'cfConfigUpdate', config: config });
        while (pendingConfigRequests.length) pendingConfigRequests.shift()(config);
      }
    }

    function ensureRpcPort() {
      if (rpcPort || !hasRuntimeAPI()) return rpcPort;
      clearRpcReconnect();
      let port;
      try {
        port = chromeApi.runtime.connect({ name: 'rpc-bridge' });
      } catch (_) {
        scheduleRpcReconnect();
        return null;
      }
      rpcPort = port;
      port.onMessage.addListener(function (message) {
        if (rpcPort === port) forwardRpcMessage(message);
      });
      port.onDisconnect.addListener(function () {
        if (rpcPort !== port) return;
        rpcPort = null;
        scheduleRpcReconnect();
      });
      rpcSessions.forEach(function (session) { postRpcRegistration(port, session); });
      return port;
    }

    function handleRpcRegister(data) {
      const registration = normalizeRegistration(data);
      if (!registration) {
        postRpcState(data && data.sessionId, 'error', 'Invalid RPC registration');
        return;
      }
      if (registration.group === 'browser') {
        postRpcState(registration.sessionId, 'error', 'Reserved RPC group');
        return;
      }
      rpcSessions.set(registration.sessionId, registration);
      if (publicConfig) {
        post({ source: BRIDGE_SOURCE, action: 'rpcPublicConfig', config: publicConfig });
      }
      const existingPort = rpcPort;
      const port = ensureRpcPort();
      if (port && port === existingPort) postRpcRegistration(port, registration);
    }

    function handleRpcReply(data) {
      if (!rpcPort || !rpcSessions.has(data.sessionId) || !validName(data.invocationId)) return;
      const message = {
        type: 'rpc.reply',
        sessionId: data.sessionId,
        invocationId: data.invocationId,
        ok: data.ok === true
      };
      if (message.ok) message.data = data.data;
      else message.error = typeof data.error === 'string' ? data.error : String(data.error);
      try { rpcPort.postMessage(message); } catch (_) {}
    }

    function handleRpcStreamChunk(data) {
      if (!rpcPort || !rpcSessions.has(data.sessionId) || !validName(data.invocationId)) return;
      try {
        rpcPort.postMessage({
          type: 'rpc.streamChunk', sessionId: data.sessionId,
          invocationId: data.invocationId, data: data.data
        });
      } catch (_) {}
    }

    function handleRpcStreamEnd(data) {
      if (!rpcPort || !rpcSessions.has(data.sessionId) || !validName(data.invocationId)) return;
      const message = {
        type: 'rpc.streamEnd', sessionId: data.sessionId, invocationId: data.invocationId
      };
      if (data.error !== undefined) {
        message.error = typeof data.error === 'string' ? data.error : String(data.error);
      }
      try { rpcPort.postMessage(message); } catch (_) {}
    }

    function handleRpcUnregister(data) {
      if (!validName(data.sessionId) || !rpcSessions.delete(data.sessionId)) return;
      if (rpcPort) {
        try { rpcPort.postMessage({ type: 'rpc.unregister', sessionId: data.sessionId }); } catch (_) {}
      }
      if (rpcSessions.size === 0) clearRpcReconnect();
    }

    function handleRpcWindowMessage(data) {
      if (data.action === 'rpcRegister') handleRpcRegister(data);
      else if (data.action === 'rpcReply') handleRpcReply(data);
      else if (data.action === 'rpcStreamChunk') handleRpcStreamChunk(data);
      else if (data.action === 'rpcStreamEnd') handleRpcStreamEnd(data);
      else if (data.action === 'rpcUnregister') handleRpcUnregister(data);
      else return false;
      return true;
    }

    async function handleGetConfig() {
      return { success: true, config: await getConfig() };
    }

    async function handleProxyFetch(data) {
      return proxyFetch(data.url, data.options || {});
    }

    const actionHandlers = {
      getConfig: handleGetConfig,
      proxyFetch: handleProxyFetch,
      getSiteCookies: getSiteCookies
    };

    function sendResponse(requestId, payload) {
      post({ source: BRIDGE_SOURCE, requestId: requestId, ...payload });
    }

    async function handleLegacyMessage(data) {
      const handler = actionHandlers[data.action];
      if (!handler) throw new Error('Unknown action: ' + data.action);
      return handler(data);
    }

    async function onWindowMessage(event) {
      if (event.source !== windowObject) return;
      const data = event.data;
      if (!data || data.source !== MAIN_SOURCE) return;
      if (handleRpcWindowMessage(data)) return;
      try {
        sendResponse(data.requestId, await handleLegacyMessage(data));
      } catch (error) {
        log('error', '[Bridge] Error handling message:', error);
        sendResponse(data.requestId, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    function start() {
      if (started || windowObject.__crawler_bridge_loaded) return;
      started = true;
      windowObject.__crawler_bridge_loaded = true;
      windowObject.addEventListener('message', onWindowMessage);
      ensureRpcPort();
      post({ source: BRIDGE_SOURCE, action: 'bridgeReady' });
      log('log', '[Bridge] Initialized');
    }

    return { start: start };
  }

  return { createBridge: createBridge };
});
