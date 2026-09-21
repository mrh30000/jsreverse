(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CrawlerRpcManager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeWsHost(value, fallback) {
    try {
      const url = new URL(String(value || ''));
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return fallback || null;
      url.pathname = url.pathname.replace(/\/+$/, '');
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (_) {
      return fallback || null;
    }
  }

  function sanitizeCloudflareConfig(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    ['enabled', 'whitelist', 'blacklist', 'pollInterval', 'maxAttemptsPerPage', 'retries', 'timeout'].forEach(function (key) {
      if (source[key] !== undefined) result[key] = Array.isArray(source[key]) ? source[key].slice() : source[key];
    });
    return result;
  }

  function pickPublicConfig(config) {
    const cf = config && config.cf_autopilot;
    return {
      actionDelay: Number.isFinite(config && config.actionDelay) ? Math.max(0, config.actionDelay) : 0,
      cf_autopilot: sanitizeCloudflareConfig(cf)
    };
  }

  function encodeSuccess(seq, response) {
    let data = response;
    if (typeof response === 'string') {
      try { data = JSON.parse(response); } catch (_) {}
    }
    return JSON.stringify({ data: data, code: 0, status: 0, __sekiro_seq__: seq });
  }

  function encodeFailure(seq, message) {
    return JSON.stringify({ message: String(message), status: -1, __sekiro_seq__: seq });
  }

  function createRpcConnectionManager(dependencies) {
    const WebSocketCtor = dependencies.WebSocketCtor;
    const clock = dependencies.clock;
    const createId = dependencies.createId;
    const logger = dependencies.logger || {};
    const connection = {
      generation: 0,
      state: 'stopped',
      socket: null,
      reconnectTimer: null,
      heartbeatTimer: null,
      reconnectAttempt: 0,
      fallbackAttempted: false,
      stopped: true
    };
    let config = null;
    let registry = null;
    let started = false;
    const ports = new Map();

    function log(level, message) {
      if (typeof logger[level] === 'function') logger[level](message);
    }

    function isOpen(socket) {
      return socket && socket.readyState === WebSocketCtor.OPEN;
    }

    function buildRegisterUrl(host, group, clientId) {
      return host + '/business/register?group=' + encodeURIComponent(group) + '&clientId=' + encodeURIComponent(clientId);
    }

    function isLocalhostUrl(value) {
      try {
        const hostname = new URL(value).hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
      } catch (_) {
        return false;
      }
    }

    function rewriteHost(value, host) {
      const url = new URL(value);
      url.hostname = host;
      return url.toString();
    }

    function clearHeartbeat() {
      if (connection.heartbeatTimer !== null) {
        clock.clearInterval(connection.heartbeatTimer);
        connection.heartbeatTimer = null;
      }
    }

    function clearReconnect() {
      if (connection.reconnectTimer !== null) {
        clock.clearTimeout(connection.reconnectTimer);
        connection.reconnectTimer = null;
      }
    }

    function releaseSocket(socket) {
      const currentSocket = socket || connection.socket;
      if (!currentSocket) return;
      if (connection.socket === currentSocket) connection.socket = null;
      currentSocket.onopen = null;
      currentSocket.onmessage = null;
      currentSocket.onerror = null;
      currentSocket.onclose = null;
      if (currentSocket.readyState === WebSocketCtor.OPEN || currentSocket.readyState === WebSocketCtor.CONNECTING) {
        try { currentSocket.close(); } catch (_) {}
      }
    }

    function scheduleReconnect() {
      if (connection.stopped || connection.reconnectTimer !== null) return;
      connection.reconnectAttempt += 1;
      const exponent = Math.min(connection.reconnectAttempt - 1, 6);
      const delay = Math.min(1000 * Math.pow(2, exponent), 30000);
      connection.state = 'reconnecting';
      connection.reconnectTimer = clock.setTimeout(function () {
        connection.reconnectTimer = null;
        if (!connection.stopped) connect();
      }, delay);
    }

    function isCurrent(socket, generation) {
      return !connection.stopped && connection.socket === socket && connection.generation === generation;
    }

    function isCurrentGeneration(generation) {
      return !connection.stopped && connection.generation === generation;
    }

    function send(socket, generation, frame) {
      if (!isCurrent(socket, generation) || !isOpen(socket)) return;
      try { socket.send(frame); } catch (_) { log('warn', 'RPC send failed'); }
    }

    function handleMessage(socket, generation, data) {
      let request;
      try {
        request = JSON.parse(data);
      } catch (_) {
        log('warn', 'Invalid RPC message');
        return;
      }
      const type = typeof request.type === 'string' ? request.type : '';
      if (!request.action && (type === 'heartbeat' || type === 'error' || type === 'invoke_response')) return;
      const seq = request.__sekiro_seq__ || '';
      if (!request.action) {
        if (seq) send(socket, generation, encodeFailure(seq, '缺少 request 参数 {action}'));
        return;
      }
      Promise.resolve()
        .then(function () { return registry.execute(request.action, request.params); })
        .then(function (response) {
          try {
            send(socket, generation, encodeSuccess(seq, response));
          } catch (_) {
            send(socket, generation, encodeFailure(seq, '响应序列化失败'));
          }
        }, function (error) {
          send(socket, generation, encodeFailure(seq, error && error.message ? error.message : String(error)));
        });
    }

    function startHeartbeat(socket, generation, clientId) {
      clearHeartbeat();
      connection.heartbeatTimer = clock.setInterval(function () {
        send(socket, generation, JSON.stringify({
          type: 'heartbeat',
          group: 'browser',
          clientId: clientId,
          timestamp: clock.now()
        }));
      }, 20000);
    }

    function connect(registerUrl, clientId) {
      const host = normalizeWsHost(config && config.wsHost, 'ws://127.0.0.1:5612');
      if (!host || connection.stopped) return;
      const generation = ++connection.generation;
      const activeClientId = clientId || createId();
      const activeRegisterUrl = registerUrl || buildRegisterUrl(host, 'browser', activeClientId);
      clearHeartbeat();
      releaseSocket();
      let socket;
      try {
        socket = new WebSocketCtor(activeRegisterUrl);
      } catch (_) {
        scheduleReconnect();
        return;
      }
      connection.socket = socket;
      connection.state = 'connecting';
      socket.onopen = function () {
        if (connection.generation !== generation || connection.socket !== socket || connection.stopped) return;
        connection.state = 'connected';
        connection.reconnectAttempt = 0;
        connection.fallbackAttempted = false;
        connection.fallbackPending = false;
        send(socket, generation, JSON.stringify({
          type: 'bind',
          group: 'browser',
          clientId: activeClientId,
          actions: registry.listActions(),
          timestamp: clock.now()
        }));
        startHeartbeat(socket, generation, activeClientId);
      };
      socket.onmessage = function (event) {
        if (!isCurrent(socket, generation)) return;
        handleMessage(socket, generation, event.data);
      };
      socket.onerror = function () {
        if (!isCurrentGeneration(generation) || connection.fallbackPending || !isCurrent(socket, generation)) return;
        clearReconnect();
        clearHeartbeat();
        releaseSocket(socket);
        if (isLocalhostUrl(activeRegisterUrl) && !connection.fallbackAttempted) {
          connection.fallbackAttempted = true;
          connection.fallbackPending = true;
          Promise.resolve(dependencies.detectLocalIP(activeRegisterUrl)).then(function (localIP) {
            if (!isCurrentGeneration(generation) || !connection.fallbackPending) return;
            connection.fallbackPending = false;
            if (localIP) {
              clearReconnect();
              connect(rewriteHost(activeRegisterUrl, localIP), activeClientId);
            } else {
              scheduleReconnect();
            }
          }, function () {
            if (!isCurrentGeneration(generation) || !connection.fallbackPending) return;
            connection.fallbackPending = false;
            scheduleReconnect();
          });
          return;
        }
        scheduleReconnect();
      };
      socket.onclose = function () {
        if (!isCurrentGeneration(generation)) return;
        clearHeartbeat();
        const fallbackPending = connection.fallbackPending;
        releaseSocket(socket);
        if (!fallbackPending) scheduleReconnect();
      };
    }

    function safePost(portState, message) {
      if (portState.disconnected) return false;
      try {
        portState.port.postMessage(message);
        return true;
      } catch (_) {
        return false;
      }
    }

    function postPublicConfig(portState) {
      safePost(portState, { type: 'rpc.publicConfig', config: pickPublicConfig(config || {}) });
    }

    function postSessionState(session, state, reason) {
      session.connection.state = state;
      const message = { type: 'rpc.state', sessionId: session.sessionId, state: state };
      if (reason) message.reason = reason;
      safePost(session.portState, message);
    }

    function validName(value) {
      return typeof value === 'string' && value.length >= 1 && value.length <= 128;
    }

    function normalizeRegistration(message) {
      if (!message || !validName(message.sessionId) || !validName(message.group) ||
          !Array.isArray(message.actions) || message.actions.length > 256) return null;
      const seen = new Set();
      const actions = [];
      for (const item of message.actions) {
        if (!item || !validName(item.name)) return null;
        if (seen.has(item.name)) continue;
        seen.add(item.name);
        actions.push({ name: item.name, stream: Boolean(item.stream) });
      }
      return {
        sessionId: message.sessionId,
        group: message.group,
        actions: actions,
        key: JSON.stringify([message.group, actions])
      };
    }

    function clearSessionHeartbeat(session) {
      if (session.connection.heartbeatTimer !== null) {
        clock.clearInterval(session.connection.heartbeatTimer);
        session.connection.heartbeatTimer = null;
      }
    }

    function clearSessionReconnect(session) {
      if (session.connection.reconnectTimer !== null) {
        clock.clearTimeout(session.connection.reconnectTimer);
        session.connection.reconnectTimer = null;
      }
    }

    function releaseSessionSocket(session, socket) {
      const currentSocket = socket || session.connection.socket;
      if (!currentSocket) return;
      if (session.connection.socket === currentSocket) session.connection.socket = null;
      currentSocket.onopen = null;
      currentSocket.onmessage = null;
      currentSocket.onerror = null;
      currentSocket.onclose = null;
      if (currentSocket.readyState === WebSocketCtor.OPEN || currentSocket.readyState === WebSocketCtor.CONNECTING) {
        try { currentSocket.close(); } catch (_) {}
      }
    }

    function sessionIsCurrent(session, socket, generation) {
      return !session.connection.stopped && session.connection.socket === socket &&
        session.connection.generation === generation;
    }

    function sessionIsCurrentGeneration(session, generation) {
      return !session.connection.stopped && session.connection.generation === generation;
    }

    function sendSessionFrame(session, socket, generation, frame) {
      if (!sessionIsCurrent(session, socket, generation) || !isOpen(socket)) return;
      try { socket.send(frame); } catch (_) { log('warn', 'RPC send failed'); }
    }

    function encodeStreamChunk(seq, data) {
      return JSON.stringify({
        type: 'invoke_stream', __sekiro_seq__: seq, data: data, done: false
      });
    }

    function encodeStreamEnd(seq, error) {
      const frame = { type: 'invoke_stream', __sekiro_seq__: seq, done: true };
      if (error) {
        frame.error = String(error);
        frame.status = -1;
      }
      return JSON.stringify(frame);
    }

    function clearSessionPending(session, reason, reply) {
      const state = session.connection;
      session.pending.forEach(function (pending) {
        if (!reply || pending.generation !== state.generation || !isOpen(state.socket)) return;
        const frame = pending.mode === 'stream'
          ? encodeStreamEnd(pending.serverSeq, reason)
          : encodeFailure(pending.serverSeq, reason);
        sendSessionFrame(session, state.socket, pending.generation, frame);
      });
      session.pending.clear();
    }

    function scheduleSessionReconnect(session) {
      const state = session.connection;
      if (state.stopped || state.reconnectTimer !== null) return;
      state.reconnectAttempt += 1;
      const exponent = Math.min(state.reconnectAttempt - 1, 6);
      const delay = Math.min(1000 * Math.pow(2, exponent), 30000);
      postSessionState(session, 'reconnecting');
      state.reconnectTimer = clock.setTimeout(function () {
        state.reconnectTimer = null;
        if (!state.stopped) connectSession(session);
      }, delay);
    }

    function startSessionHeartbeat(session, socket, generation, clientId) {
      clearSessionHeartbeat(session);
      session.connection.heartbeatTimer = clock.setInterval(function () {
        sendSessionFrame(session, socket, generation, JSON.stringify({
          type: 'heartbeat',
          group: session.group,
          clientId: clientId,
          timestamp: clock.now()
        }));
      }, 20000);
    }

    function handleSessionMessage(session, socket, generation, data) {
      let request;
      try {
        request = JSON.parse(data);
      } catch (_) {
        log('warn', 'Invalid RPC message');
        return;
      }
      if (!request || typeof request.action !== 'string') return;
      const descriptor = session.actions.find(function (item) { return item.name === request.action; });
      if (!descriptor) {
        sendSessionFrame(session, socket, generation, encodeFailure(
          request.__sekiro_seq__ || '', 'Unknown RPC action'
        ));
        return;
      }
      const invocationId = createId();
      session.pending.set(invocationId, {
        serverSeq: request.__sekiro_seq__ || '',
        mode: descriptor.stream ? 'stream' : 'unary',
        generation: generation
      });
      if (!safePost(session.portState, {
        type: 'rpc.invoke',
        sessionId: session.sessionId,
        invocationId: invocationId,
        action: request.action,
        params: request.params
      })) session.pending.delete(invocationId);
    }

    function handleUnaryReply(portState, message) {
      if (!validName(message.sessionId) || !validName(message.invocationId)) return;
      const session = portState.sessions.get(message.sessionId);
      if (!session) return;
      const pending = session.pending.get(message.invocationId);
      const state = session.connection;
      if (!pending || pending.mode !== 'unary' || pending.generation !== state.generation ||
          !sessionIsCurrent(session, state.socket, pending.generation)) return;
      session.pending.delete(message.invocationId);
      let frame;
      if (message.ok === true) {
        try {
          frame = encodeSuccess(pending.serverSeq, message.data);
        } catch (_) {
          frame = encodeFailure(pending.serverSeq, '响应序列化失败');
        }
      } else {
        frame = encodeFailure(pending.serverSeq, message.error || 'RPC invocation failed');
      }
      sendSessionFrame(session, state.socket, pending.generation, frame);
    }

    function findPending(portState, message, mode) {
      if (!validName(message.sessionId) || !validName(message.invocationId)) return null;
      const session = portState.sessions.get(message.sessionId);
      if (!session) return null;
      const pending = session.pending.get(message.invocationId);
      const state = session.connection;
      if (!pending || pending.mode !== mode || pending.generation !== state.generation ||
          !sessionIsCurrent(session, state.socket, pending.generation)) return null;
      return { session: session, pending: pending, state: state };
    }

    function handleStreamChunk(portState, message) {
      const match = findPending(portState, message, 'stream');
      if (!match) return;
      let frame;
      try {
        frame = encodeStreamChunk(match.pending.serverSeq, message.data);
      } catch (_) {
        frame = encodeStreamEnd(match.pending.serverSeq, '响应序列化失败');
        match.session.pending.delete(message.invocationId);
      }
      sendSessionFrame(match.session, match.state.socket, match.pending.generation, frame);
    }

    function handleStreamEnd(portState, message) {
      const match = findPending(portState, message, 'stream');
      if (!match) return;
      match.session.pending.delete(message.invocationId);
      sendSessionFrame(
        match.session,
        match.state.socket,
        match.pending.generation,
        encodeStreamEnd(match.pending.serverSeq, message.error)
      );
    }

    function connectSession(session, registerUrl, existingClientId) {
      const host = normalizeWsHost(config && config.wsHost, 'ws://127.0.0.1:5612');
      const state = session.connection;
      if (!started || !host || state.stopped || session.portState.disconnected) return;
      const generation = ++state.generation;
      const clientId = existingClientId || createId();
      const activeRegisterUrl = registerUrl || buildRegisterUrl(host, session.group, clientId);
      clearSessionHeartbeat(session);
      releaseSessionSocket(session);
      let socket;
      try {
        socket = new WebSocketCtor(activeRegisterUrl);
      } catch (_) {
        scheduleSessionReconnect(session);
        return;
      }
      state.socket = socket;
      postSessionState(session, 'connecting');
      socket.onopen = function () {
        if (!sessionIsCurrent(session, socket, generation)) return;
        state.reconnectAttempt = 0;
        state.fallbackAttempted = false;
        state.fallbackPending = false;
        postSessionState(session, 'connected');
        sendSessionFrame(session, socket, generation, JSON.stringify({
          type: 'bind',
          group: session.group,
          clientId: clientId,
          actions: session.actions.map(function (item) { return item.name; }),
          timestamp: clock.now()
        }));
        startSessionHeartbeat(session, socket, generation, clientId);
      };
      socket.onmessage = function (event) {
        if (!sessionIsCurrent(session, socket, generation)) return;
        handleSessionMessage(session, socket, generation, event.data);
      };
      socket.onerror = function () {
        if (!sessionIsCurrent(session, socket, generation) || state.fallbackPending) return;
        clearSessionReconnect(session);
        clearSessionPending(session, '', false);
        clearSessionHeartbeat(session);
        releaseSessionSocket(session, socket);
        if (isLocalhostUrl(activeRegisterUrl) && !state.fallbackAttempted) {
          state.fallbackAttempted = true;
          state.fallbackPending = true;
          Promise.resolve(dependencies.detectLocalIP(activeRegisterUrl)).then(function (localIP) {
            if (!sessionIsCurrentGeneration(session, generation) || !state.fallbackPending) return;
            state.fallbackPending = false;
            if (localIP) {
              clearSessionReconnect(session);
              connectSession(session, rewriteHost(activeRegisterUrl, localIP), clientId);
            } else {
              scheduleSessionReconnect(session);
            }
          }, function () {
            if (!sessionIsCurrentGeneration(session, generation) || !state.fallbackPending) return;
            state.fallbackPending = false;
            scheduleSessionReconnect(session);
          });
          return;
        }
        scheduleSessionReconnect(session);
      };
      socket.onclose = function () {
        if (state.generation !== generation || state.stopped) return;
        clearSessionPending(session, '', false);
        clearSessionHeartbeat(session);
        const fallbackPending = state.fallbackPending;
        releaseSessionSocket(session, socket);
        if (!fallbackPending) scheduleSessionReconnect(session);
      };
    }

    function stopSession(session, notify, reason, replyPending) {
      const state = session.connection;
      if (state.stopped) return;
      clearSessionPending(session, reason || 'Page disconnected', replyPending === true);
      state.stopped = true;
      state.generation += 1;
      state.fallbackPending = false;
      clearSessionReconnect(session);
      clearSessionHeartbeat(session);
      releaseSessionSocket(session);
      state.reconnectAttempt = 0;
      state.state = 'stopped';
      if (notify) postSessionState(session, 'stopped');
    }

    function createSession(portState, registration) {
      return {
        portState: portState,
        sessionId: registration.sessionId,
        group: registration.group,
        actions: registration.actions,
        key: registration.key,
        pending: new Map(),
        connection: {
          generation: 0,
          state: 'stopped',
          socket: null,
          reconnectTimer: null,
          heartbeatTimer: null,
          reconnectAttempt: 0,
          fallbackAttempted: false,
          fallbackPending: false,
          stopped: !started
        }
      };
    }

    function handleRegistration(portState, message) {
      const registration = normalizeRegistration(message);
      const sessionId = validName(message && message.sessionId) ? message.sessionId : '';
      if (!registration) {
        safePost(portState, {
          type: 'rpc.state', sessionId: sessionId, state: 'error', reason: 'Invalid RPC registration'
        });
        return;
      }
      if (registration.group === 'browser') {
        safePost(portState, {
          type: 'rpc.state', sessionId: registration.sessionId, state: 'error', reason: 'Reserved RPC group'
        });
        return;
      }
      const existing = portState.sessions.get(registration.sessionId);
      if (existing && existing.key === registration.key) {
        postSessionState(existing, existing.connection.state);
        return;
      }
      if (existing) stopSession(existing, false, 'Page disconnected', true);
      const session = createSession(portState, registration);
      portState.sessions.set(session.sessionId, session);
      if (!started) {
        postSessionState(session, 'stopped');
        return;
      }
      session.connection.stopped = false;
      connectSession(session);
    }

    function handlePortDisconnect(portState) {
      if (portState.disconnected) return;
      portState.disconnected = true;
      portState.sessions.forEach(function (session) {
        stopSession(session, false, 'Page disconnected', true);
      });
      portState.sessions.clear();
      ports.delete(portState.port);
    }

    function handleUnregister(portState, message) {
      if (!validName(message.sessionId)) return;
      const session = portState.sessions.get(message.sessionId);
      if (!session) return;
      stopSession(session, true, 'Page disconnected', true);
      portState.sessions.delete(message.sessionId);
    }

    function restartSession(session) {
      const state = session.connection;
      clearSessionPending(session, '', false);
      state.generation += 1;
      state.fallbackAttempted = false;
      state.fallbackPending = false;
      clearSessionReconnect(session);
      clearSessionHeartbeat(session);
      releaseSessionSocket(session);
      state.reconnectAttempt = 0;
      state.stopped = false;
      connectSession(session);
    }

    function broadcastPublicConfig() {
      ports.forEach(function (portState) { postPublicConfig(portState); });
    }

    return {
      start: function (nextConfig, nextRegistry) {
        config = nextConfig || {};
        registry = nextRegistry;
        started = true;
        connection.stopped = false;
        connect();
        ports.forEach(function (portState) {
          postPublicConfig(portState);
          portState.sessions.forEach(function (session) {
            session.connection.stopped = false;
            connectSession(session);
          });
        });
      },
      updateConfig: function (nextConfig) {
        const previousHost = normalizeWsHost(config && config.wsHost, 'ws://127.0.0.1:5612');
        const nextHost = normalizeWsHost(nextConfig && nextConfig.wsHost, 'ws://127.0.0.1:5612');
        const previousPublic = JSON.stringify(pickPublicConfig(config || {}));
        const nextPublic = JSON.stringify(pickPublicConfig(nextConfig || {}));
        config = nextConfig || {};
        if (started && previousHost !== nextHost) {
          connection.generation += 1;
          connection.fallbackAttempted = false;
          connection.fallbackPending = false;
          clearReconnect();
          clearHeartbeat();
          releaseSocket();
          connection.reconnectAttempt = 0;
          connect();
          ports.forEach(function (portState) {
            portState.sessions.forEach(function (session) { restartSession(session); });
          });
        }
        if (started && previousPublic !== nextPublic) broadcastPublicConfig();
      },
      attachPort: function (port) {
        if (!port || ports.has(port)) return;
        const portState = { port: port, disconnected: false, sessions: new Map() };
        ports.set(port, portState);
        port.onMessage.addListener(function (message) {
          if (portState.disconnected || !message || typeof message !== 'object') return;
          if (message.type === 'rpc.register') handleRegistration(portState, message);
          if (message.type === 'rpc.reply') handleUnaryReply(portState, message);
          if (message.type === 'rpc.streamChunk') handleStreamChunk(portState, message);
          if (message.type === 'rpc.streamEnd') handleStreamEnd(portState, message);
          if (message.type === 'rpc.unregister') handleUnregister(portState, message);
        });
        port.onDisconnect.addListener(function () { handlePortDisconnect(portState); });
        if (started) postPublicConfig(portState);
      },
      stop: function () {
        started = false;
        connection.stopped = true;
        connection.generation += 1;
        connection.fallbackPending = false;
        clearReconnect();
        clearHeartbeat();
        releaseSocket();
        connection.reconnectAttempt = 0;
        connection.state = 'stopped';
        ports.forEach(function (portState) {
          portState.sessions.forEach(function (session) {
            stopSession(session, true, 'RPC manager stopped', true);
          });
        });
      },
      getState: function () {
        return { state: connection.state, reconnectAttempt: connection.reconnectAttempt };
      }
    };
  }

  return { createRpcConnectionManager, normalizeWsHost, pickPublicConfig };
});
