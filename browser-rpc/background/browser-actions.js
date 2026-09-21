(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CrawlerBrowserActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BROWSER_ACTION_NAMES = Object.freeze([
    'getTabs',
    'getCurrentTab',
    'createTab',
    'updateTab',
    'closeTab',
    'navigate',
    'getCookies',
    'screenshot',
    'activateTab',
    'reloadTab',
    'executeScript',
    'getContent'
  ]);
  const CREATE_FIELDS = ['url', 'active', 'pinned', 'index', 'windowId', 'openerTabId'];
  const UPDATE_FIELDS = ['url', 'active', 'pinned', 'highlighted', 'selected', 'muted', 'autoDiscardable'];

  function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function paramsObject(params) {
    if (params === undefined) return {};
    if (!isPlainObject(params)) throw new Error('params must be a plain object');
    return params;
  }

  function positiveTabId(value, name) {
    if (!Number.isInteger(value) || value <= 0) throw new Error((name || 'tabId') + ' must be a positive integer');
  }

  function httpUrl(value) {
    if (typeof value !== 'string') throw new Error('url must use http or https');
    let parsed;
    try { parsed = new URL(value); } catch (_) { throw new Error('url must use http or https'); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('url must use http or https');
  }

  function pick(source, fields) {
    const result = {};
    fields.forEach(function (field) {
      if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = source[field];
    });
    return result;
  }

  function callChrome(chromeApi, method, args, errorMessage) {
    return new Promise(function (resolve, reject) {
      try {
        method.apply(null, args.concat(function (result) {
          const lastError = chromeApi.runtime && chromeApi.runtime.lastError;
          if (lastError) reject(new Error(errorMessage || 'Browser API call failed'));
          else resolve(result);
        }));
      } catch (error) {
        reject(error);
      }
    });
  }

  function createBrowserActionRegistry(chromeApi) {
    if (!chromeApi || !chromeApi.tabs || !chromeApi.cookies) throw new Error('chromeApi is required');
    const tabs = chromeApi.tabs;
    const handlers = new Map();
    handlers.set('getTabs', function (params) {
      params = paramsObject(params);
      if (params.query !== undefined && !isPlainObject(params.query)) throw new Error('query must be a plain object');
      return callChrome(chromeApi, tabs.query, [params.query || {}], 'Browser tabs.query failed');
    });
    handlers.set('getCurrentTab', function () {
      return callChrome(chromeApi, tabs.query, [{ active: true, currentWindow: true }], 'Browser tabs.query failed').then(function (result) { return result && result[0] || null; });
    });
    handlers.set('createTab', function (params) {
      params = paramsObject(params);
      const properties = pick(params, CREATE_FIELDS);
      if (properties.url !== undefined) httpUrl(properties.url);
      return callChrome(chromeApi, tabs.create, [properties], 'Browser tabs.create failed').then(function (tab) { return { tabId: tab && tab.id, tab: tab }; });
    });
    handlers.set('updateTab', function (params) {
      params = paramsObject(params);
      if (params.tabId === undefined || params.tabId === 0) throw new Error('tabId is required');
      positiveTabId(params.tabId);
      const updateProps = params.updateProps === undefined ? {} : params.updateProps;
      if (!isPlainObject(updateProps)) throw new Error('updateProps must be a plain object');
      const properties = pick(updateProps, UPDATE_FIELDS);
      if (properties.url !== undefined) httpUrl(properties.url);
      return callChrome(chromeApi, tabs.update, [params.tabId, properties], 'Browser tabs.update failed');
    });
    handlers.set('closeTab', function (params) {
      params = paramsObject(params);
      if (params.tabIds === undefined || (Array.isArray(params.tabIds) && params.tabIds.length === 0)) throw new Error('tabIds is required');
      const ids = Array.isArray(params.tabIds) ? params.tabIds : [params.tabIds];
      ids.forEach(function (id) { positiveTabId(id, 'tabIds'); });
      return callChrome(chromeApi, tabs.remove, [params.tabIds], 'Browser tabs.remove failed').then(function () { return { success: true }; });
    });
    handlers.set('navigate', function (params) {
      params = paramsObject(params);
      if (!params.url) throw new Error('url is required');
      httpUrl(params.url);
      if (params.tabId !== undefined) positiveTabId(params.tabId);
      if (params.newTab) return callChrome(chromeApi, tabs.create, [{ url: params.url }], 'Browser tabs.create failed').then(function (tab) { return { tabId: tab.id, title: tab.title || '', url: tab.url || params.url }; });
      const update = function (tabId) { return callChrome(chromeApi, tabs.update, [tabId, { url: params.url }], 'Browser tabs.update failed').then(function (tab) { return { tabId: tab.id, title: tab.title || '', url: tab.url || params.url }; }); };
      if (params.tabId !== undefined) return update(params.tabId);
      return callChrome(chromeApi, tabs.query, [{ active: true, currentWindow: true }], 'Browser tabs.query failed').then(function (result) {
        if (!result || !result[0]) throw new Error('No active tab found');
        return update(result[0].id);
      });
    });
    handlers.set('getCookies', function (params) {
      params = paramsObject(params);
      const filter = {};
      if (params.url !== undefined) { httpUrl(params.url); filter.url = params.url; }
      if (params.name !== undefined) filter.name = params.name;
      return callChrome(chromeApi, chromeApi.cookies.getAll, [filter], 'Browser cookies.getAll failed').then(function (cookies) { return cookies || []; });
    });
    handlers.set('screenshot', function (params) {
      params = paramsObject(params);
      const capture = function (windowId) { return callChrome(chromeApi, tabs.captureVisibleTab, [windowId, {}], 'Browser tabs.captureVisibleTab failed'); };
      if (params.tabId === undefined) return capture(null);
      positiveTabId(params.tabId);
      return callChrome(chromeApi, tabs.get, [params.tabId], 'Browser tabs.get failed').then(function (tab) { return capture(tab.windowId); });
    });
    handlers.set('activateTab', function (params) {
      params = paramsObject(params);
      if (params.tabId === undefined || params.tabId === 0) throw new Error('tabId is required');
      positiveTabId(params.tabId);
      return callChrome(chromeApi, tabs.update, [params.tabId, { active: true }], 'Browser tabs.update failed').then(function (tab) {
        return { tabId: tab.id, active: tab.active, title: tab.title || '', url: tab.url || '' };
      });
    });
    handlers.set('reloadTab', function (params) {
      params = paramsObject(params);
      if (params.tabId !== undefined) positiveTabId(params.tabId);
      const reloadOptions = params.bypassCache ? { bypassCache: true } : {};
      const doReload = function (targetId) {
        return callChrome(chromeApi, tabs.reload, [targetId, reloadOptions], 'Browser tabs.reload failed').then(function () {
          return { success: true, tabId: targetId };
        });
      };
      if (params.tabId !== undefined) return doReload(params.tabId);
      return callChrome(chromeApi, tabs.query, [{ active: true, currentWindow: true }], 'Browser tabs.query failed').then(function (result) {
        if (!result || !result[0]) throw new Error('No active tab found');
        return doReload(result[0].id);
      });
    });
    handlers.set('executeScript', function (params) {
      params = paramsObject(params);
      if (typeof params.code !== 'string' || !params.code.trim()) throw new Error('code is required');
      if (params.tabId !== undefined) positiveTabId(params.tabId);
      if (!chromeApi.scripting || typeof chromeApi.scripting.executeScript !== 'function') {
        throw new Error('chrome.scripting API is not available');
      }
      const executeOnTab = function (targetId) {
        return callChrome(
          chromeApi,
          chromeApi.scripting.executeScript,
          [{
            target: { tabId: targetId },
            world: 'MAIN',
            func: function (codeStr) {
              try {
                return { success: true, value: (0, eval)(codeStr) };
              } catch (err) {
                return { success: false, error: err && err.message ? err.message : String(err) };
              }
            },
            args: [params.code]
          }],
          'Browser scripting.executeScript failed'
        ).then(function (injectionResults) {
          if (!injectionResults || !injectionResults[0]) return { tabId: targetId, result: null };
          const execRes = injectionResults[0].result;
          if (execRes && execRes.success === false) {
            throw new Error('Script execution error: ' + execRes.error);
          }
          return { tabId: targetId, result: execRes ? execRes.value : null };
        });
      };
      if (params.tabId !== undefined) return executeOnTab(params.tabId);
      return callChrome(chromeApi, tabs.query, [{ active: true, currentWindow: true }], 'Browser tabs.query failed').then(function (result) {
        if (!result || !result[0]) throw new Error('No active tab found');
        return executeOnTab(result[0].id);
      });
    });
    handlers.set('getContent', function (params) {
      params = paramsObject(params);
      if (params.tabId !== undefined) positiveTabId(params.tabId);
      const format = params.format === 'html' ? 'html' : 'text';
      if (!chromeApi.scripting || typeof chromeApi.scripting.executeScript !== 'function') {
        throw new Error('chrome.scripting API is not available');
      }
      const extractContent = function (targetId) {
        return callChrome(
          chromeApi,
          chromeApi.scripting.executeScript,
          [{
            target: { tabId: targetId },
            func: function (fmt) {
              var doc = typeof document !== 'undefined' ? document : null;
              var loc = typeof location !== 'undefined' ? location : null;
              return {
                title: (doc && doc.title) || '',
                url: (loc && loc.href) || '',
                content: fmt === 'html'
                  ? (doc && doc.documentElement ? doc.documentElement.outerHTML : '')
                  : (doc && doc.body ? doc.body.innerText : '')
              };
            },
            args: [format]
          }],
          'Browser scripting.executeScript failed'
        ).then(function (injectionResults) {
          if (!injectionResults || !injectionResults[0] || !injectionResults[0].result) {
            return { tabId: targetId, format: format, content: '', title: '', url: '' };
          }
          const data = injectionResults[0].result;
          return {
            tabId: targetId,
            format: format,
            content: data.content || '',
            title: data.title || '',
            url: data.url || ''
          };
        });
      };
      if (params.tabId !== undefined) return extractContent(params.tabId);
      return callChrome(chromeApi, tabs.query, [{ active: true, currentWindow: true }], 'Browser tabs.query failed').then(function (result) {
        if (!result || !result[0]) throw new Error('No active tab found');
        return extractContent(result[0].id);
      });
    });
    return {
      listActions: function () { return BROWSER_ACTION_NAMES.slice(); },
      execute: function (action, params) {
        const handler = handlers.get(action);
        if (!handler) return Promise.reject(new Error('Unknown browser action: ' + action));
        try { return Promise.resolve(handler(params)); } catch (error) { return Promise.reject(error); }
      }
    };
  }

  function isAllowedChatGPTHost(hostname) {
    return hostname === 'chatgpt.com' || hostname.endsWith('.chatgpt.com');
  }

  function getSiteCookiesForSender(chromeApi, sender) {
    const senderUrl = sender && sender.tab && sender.tab.url;
    let parsed;
    try { parsed = new URL(senderUrl); } catch (_) {}
    if (!parsed || parsed.protocol !== 'https:' || !isAllowedChatGPTHost(parsed.hostname)) {
      return Promise.reject(new Error('Sender tab is not an allowed ChatGPT HTTPS site'));
    }
    return callChrome(
      chromeApi,
      chromeApi.cookies.getAll,
      [{ url: senderUrl }],
      'Browser cookies.getAll failed'
    ).then(function (cookies) { return cookies || []; });
  }

  return { BROWSER_ACTION_NAMES, createBrowserActionRegistry, getSiteCookiesForSender };
});
