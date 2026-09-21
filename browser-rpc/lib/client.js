/**
 * BaseClient executes platform actions. Background owns RPC connections.
 */
(function (root) {
  'use strict';
  if (root.__crawler_baseclient_loaded) return;

  class BaseClient {
    static defaultConfig = {
      startDelay: 2000,
      autoStart: true,
      logPrefix: 'Client',
      actionDelay: 0,
      // 单次 unary action 的执行上限。页面内 fetch 挂住时，执行器若不回包，
      // go-rpc 只能等到自己的 invoke 超时（默认 30s），调用方看到的是"超时"而非真实原因。
      // 20s 保证先于服务端超时回错。长任务可用 actionTimeout 覆盖。
      // ponytail: 固定上限，不做按 action 配置；需要细粒度时再下沉到 platform.json。
      actionTimeout: 20000,
      antiDetect: true
    };

    static defaultActions = {};

    constructor(config) {
      this.config = config;
      this.platform = config.platform;
      this.group = config.group || config.platform;
      this.hostnames = Array.isArray(config.hostnames) ? config.hostnames : [config.hostnames];
      this.actions = config.actions || {};
      this.endpoints = config.endpoints || {};
      this.params = config.params || {};
      this.handlers = new Map();
      this.actionModes = new Map();
      this.rpcSession = null;
      this.rpcState = 'idle';
      this.isInitialized = false;
      this.actionDelay = config.actionDelay || 0;
      this.actionTimeout = Number.isFinite(config.actionTimeout) && config.actionTimeout >= 0
        ? config.actionTimeout : 0;
      this.transport = root.CrawlerRpcPageTransport.getDefaultTransport();
      if (!this.isCorrectDomain()) return;
      if (typeof config.onInit === 'function') config.onInit.call(this);
      if (config.autoStart !== false) setTimeout(() => this.start(), config.startDelay || 2000);
    }

    static create(config) {
      const actions = { ...this.defaultActions, ...((config && config.actions) || {}) };
      return new BaseClient({ ...this.defaultConfig, ...config, actions });
    }

    static registerDefaultActions(actions) {
      if (actions && typeof actions === 'object') this.defaultActions = { ...this.defaultActions, ...actions };
    }

    isCorrectDomain() {
      const hostname = root.location && root.location.hostname || '';
      return this.hostnames.some((host) => hostname.includes(host));
    }

    log(message, level = 'log') {
      const line = `[${this.config.logPrefix || this.platform}] ${message}`;
      if (typeof root.logToConsole === 'function') root.logToConsole(line);
      else if (root.console && typeof root.console[level] === 'function') root.console[level](line);
    }

    async start() {
      if (this.rpcSession) return;
      this.registerAllActions();
      this.rpcSession = this.transport.register({
        group: this.group,
        actions: Array.from(this.handlers.keys()).map((name) => ({
          name: name,
          stream: this.actionModes.get(name) === 'stream'
        })),
        onInvoke: (invocation) => this._handleRpcInvocation(invocation),
        onState: (state) => this._handleRpcState(state),
        onPublicConfig: (config) => this._applyPublicConfig(config)
      });
      this.isInitialized = true;
    }

    registerAllActions() {
      if (this.handlers.size) return;
      Object.entries(this.actions).forEach(([name, action]) => this.registerAction(name, action));
    }

    registerAction(actionName, actionConfig) {
      let handler;
      let mode = 'unary';
      if (typeof actionConfig === 'function') {
        handler = this.wrapHandler(actionConfig, actionConfig.actionTimeout);
      } else if (actionConfig && typeof actionConfig === 'object' && typeof actionConfig.method === 'function') {
        if (actionConfig.stream) {
          mode = 'stream';
          handler = this._buildStreamHandler(actionName, actionConfig.method).bind(this);
        } else {
          const configuredTimeout = Number.isFinite(actionConfig.actionTimeout || actionConfig.timeout || actionConfig.method?.actionTimeout)
            ? (actionConfig.actionTimeout || actionConfig.timeout || actionConfig.method?.actionTimeout)
            : this.actionTimeout;
          handler = (request, resolve, reject) => {
            const customTimeout = Number.isFinite(request.params?.timeout_ms)
              ? request.params.timeout_ms
              : (Number.isFinite(request.params?.timeout)
                ? (request.params.timeout > 1000 ? request.params.timeout : request.params.timeout * 1000)
                : configuredTimeout);
            const execute = () => this._withActionTimeout(
              Promise.resolve(actionConfig.method(request.params || {}))
                .then((response) => resolve(typeof actionConfig.transform === 'function'
                  ? actionConfig.transform(response) : response)),
              customTimeout
            ).catch((error) => reject(error instanceof Error ? error.message : String(error)));
            if (this.actionDelay > 0) setTimeout(execute, this.actionDelay); else execute();
          };
        }
      } else {
        return;
      }
      this.handlers.set(actionName, handler);
      this.actionModes.set(actionName, mode);
    }

    _handleRpcInvocation(invocation) {
      const request = {
        action: invocation.action,
        params: invocation.params || {},
        invocationId: invocation.invocationId
      };
      const handler = this.handlers.get(request.action);
      if (!handler) {
        this.rpcSession.fail(request.invocationId, '未定义 action 处理函数：' + request.action);
        return;
      }
      try {
        return handler(request,
          (response) => this.rpcSession.reply(request.invocationId, response),
          (error) => this.rpcSession.fail(request.invocationId, error));
      } catch (error) {
        this.rpcSession.fail(request.invocationId, error instanceof Error ? error.message : String(error));
      }
    }

    _handleRpcState(state) {
      this.rpcState = state.state || 'idle';
      this.log('RPC 状态：' + this.rpcState);
    }

    _applyPublicConfig(config) {
      if (Number.isFinite(config && config.actionDelay) && config.actionDelay >= 0) {
        this.actionDelay = config.actionDelay;
      }
    }

    _buildStreamHandler(actionName, method) {
      return async (request) => {
        const invocationId = request.invocationId;
        if (this.actionDelay > 0) await new Promise((resolve) => setTimeout(resolve, this.actionDelay));
        let response;
        try {
          response = await method(request.params || {});
        } catch (error) {
          this._sendStreamEnd(invocationId, error instanceof Error ? error.message : String(error));
          return;
        }
        if (!response || !response.body || typeof response.body.getReader !== 'function') {
          this._sendStreamEnd(invocationId, 'createStream method 必须返回 Response 对象（fetch 的原始 Response）');
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) this._sendStreamChunk(invocationId, chunk);
          }
          const tail = decoder.decode();
          if (tail) this._sendStreamChunk(invocationId, tail);
          this._sendStreamEnd(invocationId);
        } catch (error) {
          this._sendStreamEnd(invocationId,
            error && typeof error.message === 'string' ? error.message : String(error));
        } finally {
          try { reader.releaseLock(); } catch (_) {}
        }
      };
    }

    _sendStreamChunk(invocationId, data) {
      if (invocationId) this.rpcSession.streamChunk(invocationId, data);
    }

    _sendStreamEnd(invocationId, error) {
      if (invocationId) this.rpcSession.streamEnd(invocationId, error);
    }

    wrapHandler(handler, actionTimeout) {
      return async (request, resolve, reject) => {
        try {
          if (this.actionDelay > 0) await new Promise((done) => setTimeout(done, this.actionDelay));
          const customTimeout = Number.isFinite(request.params?.timeout_ms)
            ? request.params.timeout_ms
            : (Number.isFinite(request.params?.timeout)
              ? (request.params.timeout > 1000 ? request.params.timeout : request.params.timeout * 1000)
              : (Number.isFinite(actionTimeout || handler?.actionTimeout)
                ? (actionTimeout || handler.actionTimeout)
                : this.actionTimeout));
          resolve(await this._withActionTimeout(handler.call(this, request.params || {}), customTimeout));
        } catch (error) {
          reject(error instanceof Error ? error.message : String(error));
        }
      };
    }

    // _withActionTimeout 给单次 action 套上执行上限：超时即 reject，
    // 让页面侧快速回错，而不是让 go-rpc 干等满 invoke 超时。
    // actionTimeout <= 0 表示不限制。
    _withActionTimeout(promise, customTimeout) {
      const limit = Number.isFinite(customTimeout) && customTimeout >= 0 ? customTimeout : this.actionTimeout;
      if (!(limit > 0)) return Promise.resolve(promise);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('action timeout after ' + limit + 'ms'));
        }, limit);
        Promise.resolve(promise).then(
          (value) => { clearTimeout(timer); resolve(value); },
          (error) => { clearTimeout(timer); reject(error); }
        );
      });
    }

    getStatus() {
      return { isInitialized: this.isInitialized, isConnected: this.rpcState === 'connected', platform: this.platform };
    }
  }

  function createAction(method, transform = null) { return { method: method, transform: transform }; }
  function createStream(method, options = {}) { return Object.assign({ method: method, stream: true }, options); }
  function param(name, defaultValue = undefined) { return { name: name, default: defaultValue }; }

  root.__crawler_baseclient_loaded = true;
  root.BaseClient = BaseClient;
  root.createAction = createAction;
  root.createStream = createStream;
  root.param = param;
  if (typeof module === 'object' && module.exports) module.exports = { BaseClient, createAction, createStream, param };
})(typeof window !== 'undefined' ? window : globalThis);
