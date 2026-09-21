(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CrawlerRpcPageTransport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const MAIN_SOURCE = 'crawler_rpc_main';
  const BRIDGE_SOURCE = 'crawler_rpc_bridge';
  let defaultTransport = null;

  function errorSummary(error) {
    return error && typeof error.message === 'string' ? error.message : String(error);
  }

  function createDefaultId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') {
      return root.crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function createRpcPageTransport(windowObject, createId) {
    const sessions = new Map();
    const nextId = createId || createDefaultId;

    function post(message) {
      windowObject.postMessage(message, '*');
    }

    function registrationMessage(session) {
      return {
        source: MAIN_SOURCE,
        action: 'rpcRegister',
        sessionId: session.sessionId,
        group: session.group,
        actions: session.actions.map(function (item) {
          return { name: item.name, stream: Boolean(item.stream) };
        })
      };
    }

    function postRegistration(session) {
      post(registrationMessage(session));
    }

    windowObject.addEventListener('message', function (event) {
      if (event.source !== windowObject || !event.data || event.data.source !== BRIDGE_SOURCE) return;
      const message = event.data;
      if (message.action === 'bridgeReady') {
        sessions.forEach(postRegistration);
        return;
      }
      if (message.action === 'rpcPublicConfig') {
        sessions.forEach(function (session) {
          if (typeof session.onPublicConfig === 'function') session.onPublicConfig(message.config);
        });
        return;
      }
      const session = sessions.get(message.sessionId);
      if (!session) return;
      if (message.action === 'rpcInvoke' && typeof session.onInvoke === 'function') {
        session.onInvoke({
          invocationId: message.invocationId,
          action: message.rpcAction,
          params: message.params || {}
        });
      }
      if (message.action === 'rpcState' && typeof session.onState === 'function') {
        const state = { state: message.state };
        if (message.reason !== undefined) state.reason = message.reason;
        session.onState(state);
      }
    });

    return {
      register: function (options) {
        const sessionId = nextId();
        const session = {
          sessionId: sessionId,
          group: options.group,
          actions: Array.isArray(options.actions) ? options.actions.map(function (item) {
            return { name: item.name, stream: Boolean(item.stream) };
          }) : [],
          onInvoke: options.onInvoke,
          onState: options.onState,
          onPublicConfig: options.onPublicConfig
        };
        sessions.set(sessionId, session);
        postRegistration(session);
        return {
          reply: function (invocationId, data) {
            post({
              source: MAIN_SOURCE, action: 'rpcReply', sessionId: sessionId,
              invocationId: invocationId, ok: true, data: data
            });
          },
          fail: function (invocationId, error) {
            post({
              source: MAIN_SOURCE, action: 'rpcReply', sessionId: sessionId,
              invocationId: invocationId, ok: false, error: errorSummary(error)
            });
          },
          streamChunk: function (invocationId, data) {
            post({
              source: MAIN_SOURCE, action: 'rpcStreamChunk', sessionId: sessionId,
              invocationId: invocationId, data: data
            });
          },
          streamEnd: function (invocationId, error) {
            const message = {
              source: MAIN_SOURCE, action: 'rpcStreamEnd', sessionId: sessionId,
              invocationId: invocationId
            };
            if (error !== undefined) message.error = errorSummary(error);
            post(message);
          },
          unregister: function () {
            if (!sessions.delete(sessionId)) return;
            post({ source: MAIN_SOURCE, action: 'rpcUnregister', sessionId: sessionId });
          }
        };
      }
    };
  }

  function getDefaultTransport() {
    if (!defaultTransport) {
      const windowObject = root.window || root;
      defaultTransport = createRpcPageTransport(windowObject, createDefaultId);
    }
    return defaultTransport;
  }

  return { createRpcPageTransport, getDefaultTransport };
});
