/**
 * HTTP 请求工具库
 * 提供 Fetch API 和 XMLHttpRequest 两种实现方式
 * 使用 IIFE 包裹以防止重复注入时声明冲突
 */

(function () {
  'use strict';

  // 防止重复注入
  if (typeof window !== 'undefined' && window.__crawler_http_loaded) {
    return;
  }

// ============ 全局配置 ============
const DEFAULT_CONFIG = {
  method: 'GET',
  timeout: 30000,
  responseType: 'text',
  credentials: 'include',
  bodyType: 'json',
  isParseResponse: true,
  params: {},
  headers: {
    'Accept': '*/*'
  },
  body: undefined
};

/**
 * 通过 bridge/background 代理请求，绕过页面 CORS 限制。
 * 仅在调用方显式设置 options.proxy=true 时启用。
 */
function proxyFetch(url, requestOptions, responseType) {
  return new Promise((resolve, reject) => {
    const requestId = 'http_proxy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    const timeout = Math.min(requestOptions.timeout || DEFAULT_CONFIG.timeout, 45000);
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error(`Proxy request timeout after ${timeout}ms (${url})`));
    }, timeout + 1000);

    function handler(event) {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.source !== 'crawler_rpc_bridge' || msg.requestId !== requestId) return;
      clearTimeout(timeoutId);
      window.removeEventListener('message', handler);
      if (!msg.success) {
        reject(new Error(msg.error || `Proxy request failed (${url})`));
        return;
      }
      if (responseType === 'json') {
        try {
          resolve(JSON.parse(msg.data));
        } catch (error) {
          reject(new Error(`Proxy JSON parse failed (${url}): ${error.message}`));
        }
        return;
      }
      resolve(msg.data);
    }

    window.addEventListener('message', handler);
    window.postMessage({
      source: 'crawler_rpc_main',
      action: 'proxyFetch',
      requestId,
      url,
      options: requestOptions
    }, '*');
  });
}

// ============ 辅助工具函数 ============

/**
 * 构建 Headers 对象
 * @param {Record<string, string>} [customHeaders]
 * @param {Record<string, string>} [defaultHeaders]
 * @returns {Headers}
 */
function buildHeaders(customHeaders, defaultHeaders) {
  const headers = new Headers(defaultHeaders);
  for (const key in customHeaders) {
    if (customHeaders[key] !== undefined) {
      headers.set(key, customHeaders[key]);
    }
  }
  return headers;
}

/**
 * 构建带查询参数的 URL
 * @param {string} url
 * @param {Record<string, any>} [params]
 * @returns {string}
 */
function buildUrlWithParams(url, params) {
  if (!params || typeof params !== 'object') return url;

  const entries = Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);

  if (entries.length === 0) return url;
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + new URLSearchParams(entries).toString();
}

/**
 * 安全解析 JSON，失败时回退到原始文本
 * @param {string} text
 * @returns {any}
 */
function safeParseJSON(text) {
  if (!text) return text;
  try {
    return JSON.parse(text);
  } catch {
    console.warn('[HTTP] Failed to parse JSON response, falling back to text');
    return text;
  }
}

/**
 * 解析响应内容
 * @param {Response|XMLHttpRequest} source
 * @param {'text'|'json'|'eventstream'} type
 * @returns {Promise<any>}
 */
async function parseResponse(source, type) {
  const isResponse = source instanceof Response;
  const text = isResponse ? await source.text() : source.responseText;

  if (type === 'json') {
    if (isResponse && !text && source.headers.get('bdturing-verify')) {
      throw new Error(`Anti-bot verification required (${source.url})`);
    }
    if (isResponse && !text) {
      throw new Error(`Empty response body (${source.url})`);
    }
    return safeParseJSON(text);
  }
  return text;
}

// ============ 底层实现逻辑 ============

/**
 * 解析请求配置，提取常用参数
 * @param {Object} opts
 * @returns {{ method: string, params: Object, headers: Object, options: Object, config: Object, isPost: boolean }}
 */
function parseRequestOpts(opts) {
  const method = (opts.method || 'GET').toUpperCase();
  const params = opts.params || {};
  const headers = opts.headers || {};
  const options = opts.options || {};
  const config = { ...DEFAULT_CONFIG, ...options };
  return { method, params, headers, options, config, isPost: method === 'POST' };
}

/**
 * 序列化 POST 请求体
 * @param {Object} params
 * @param {string} bodyType
 * @returns {string}
 */
function serializeBody(params, bodyType) {
  return bodyType === 'json' ? JSON.stringify(params) : new URLSearchParams(params).toString();
}

/**
 * 检查 headers 中是否包含指定键（忽略大小写）
 * @param {Object} headers
 * @param {string} key
 * @returns {boolean}
 */
function hasHeader(headers, key) {
  return headers[key] || headers[key.toLowerCase()];
}

/**
 * Fetch 底层封装
 * @param {string} url
 * @param {Object} opts
 * @returns {Promise<any>}
 */
async function _baseFetch(url, opts) {
  const { method, params, headers, options, config, isPost } = parseRequestOpts(opts);
  const { timeout, responseType, credentials, bodyType = 'json', isParseResponse = true } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const requestUrl = isPost ? url : buildUrlWithParams(url, params);
    const defaultContentType = bodyType === 'json' ? 'application/json' : 'application/x-www-form-urlencoded';

    const fetchHeaders = buildHeaders(
      headers,
      isPost ? { 'Content-Type': defaultContentType, ...DEFAULT_CONFIG.headers } : DEFAULT_CONFIG.headers
    );

    // 构建请求体：优先使用 options.body，否则序列化 params
    let body = options.body !== undefined ? options.body : (isPost ? serializeBody(params, bodyType) : undefined);

    // 二进制数据自动设置 octet-stream（除非已指定 Content-Type/Encoding）
    const isBinary = body instanceof Uint8Array || body instanceof ArrayBuffer;
    if (isBinary && !hasHeader(headers, 'Content-Type') && !hasHeader(headers, 'Content-Encoding')) {
      fetchHeaders.set('Content-Type', 'application/octet-stream');
    }

    if (options.proxy) {
      return await proxyFetch(requestUrl, {
        method,
        headers: Object.fromEntries(fetchHeaders.entries()),
        body,
        timeout,
        credentials
      }, responseType);
    }

    console.log('[HTTP] Request:', {
      url: requestUrl,
      method,
      headers: Object.fromEntries(fetchHeaders.entries()),
      bodyType: body?.constructor?.name || typeof body,
      bodySize: body?.length || body?.byteLength
    });

    const response = await fetch(requestUrl, {
      method,
      credentials,
      headers: fetchHeaders,
      body,
      signal: controller.signal
    });

    console.log('[HTTP] Response:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} (${url})`);
    }

    return isParseResponse ? await parseResponse(response, responseType) : response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms (${url})`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * XHR 底层封装
 * @param {string} url
 * @param {Object} opts
 * @returns {Promise<any>}
 */
function _baseXHR(url, opts) {
  const { method, params, headers, options, config, isPost } = parseRequestOpts(opts);
  const { timeout, responseType, credentials, bodyType = 'json' } = config;

  return new Promise((resolve, reject) => {
    const requestUrl = isPost ? url : buildUrlWithParams(url, params);

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = credentials === 'include';
    xhr.timeout = timeout;
    xhr.open(method, requestUrl);

    // 合并默认 headers，POST 时自动设置 Content-Type
    const mergedHeaders = { ...DEFAULT_CONFIG.headers, ...headers };
    if (isPost && !hasHeader(headers, 'Content-Type')) {
      mergedHeaders['Content-Type'] = bodyType === 'json' ? 'application/json' : 'application/x-www-form-urlencoded';
    }
    for (const key in mergedHeaders) {
      xhr.setRequestHeader(key, mergedHeaders[key]);
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(await parseResponse(xhr, responseType));
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status} ${xhr.statusText} (${url})`));
      }
    };
    xhr.onerror = () => reject(new Error(`Network error (${url})`));
    xhr.ontimeout = () => reject(new Error(`Request timeout after ${timeout}ms (${url})`));

    // 发送请求体
    const body = isPost ? (options.body !== undefined ? options.body : serializeBody(params, bodyType)) : undefined;
    xhr.send(body);
  });
}

// ============ 公开 API ============

/**
 * Fetch POST 请求
 * @param {string} url
 * @param {Record<string, any>} [params]
 * @param {Record<string, string>} [headers]
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
function fetchPost(url, params, headers, options) {
  return _baseFetch(url, { method: 'POST', params: params || {}, headers: headers || {}, options: options || {} });
}

/**
 * Fetch GET 请求
 * @param {string} url
 * @param {Record<string, any>} [params]
 * @param {Record<string, string>} [headers]
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
function fetchGet(url, params, headers, options) {
  return _baseFetch(url, { method: 'GET', params: params || {}, headers: headers || {}, options: options || {} });
}

/**
 * XMLHttpRequest POST 请求
 * @param {string} url
 * @param {Record<string, any>} [params]
 * @param {Record<string, string>} [headers]
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
function XMLHttpRequestPost(url, params, headers, options) {
  return _baseXHR(url, { method: 'POST', params, headers, options });
}

/**
 * XMLHttpRequest GET 请求
 * @param {string} url
 * @param {Record<string, any>} [params]
 * @param {Record<string, string>} [headers]
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
function XMLHttpRequestGet(url, params, headers, options) {
  return _baseXHR(url, { method: 'GET', params, headers, options });
}

/**
 * 通用请求方法
 * @param {string} method
 * @param {string} url
 * @param {Record<string, any>} [params]
 * @param {Record<string, string>} [headers]
 * @param {Object} [options]
 * @param {'fetch'|'xhr'} [impl]
 * @returns {Promise<any>}
 */
async function request(method, url, params, headers, options, impl) {
  impl = impl || 'fetch';
  const callArgs = { method, params, headers, options };
  return impl === 'fetch'
    ? _baseFetch(url, callArgs)
    : _baseXHR(url, callArgs);
}

// 导出到 window 对象（用于 Content Script）
if (typeof window !== 'undefined') {
  window.__crawler_http_loaded = true;
  window.fetchPost = fetchPost;
  window.fetchGet = fetchGet;
  window.XMLHttpRequestPost = XMLHttpRequestPost;
  window.XMLHttpRequestGet = XMLHttpRequestGet;
  window.request = request;
}

})();
