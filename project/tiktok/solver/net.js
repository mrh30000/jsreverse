/**
 * 极简 HTTP(S) 客户端：走本机代理（CONNECT 隧道），不依赖 Node 全局 fetch 的代理设置。
 *
 * 本机直连 tiktok.com 不通，必须经代理；浏览器自己可访问，Node 侧需显式走代理。
 *
 * @param {string} targetUrl 目标 URL
 * @param {object} [opts] { method, headers, body, userAgent, proxy, timeoutMs }
 * @returns {Promise<{status:number, headers:string, text:string}>}
 */
'use strict';
const net = require('net');
const tls = require('tls');

const DEFAULT_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

function requestViaProxy(targetUrl, opts = {}) {
  const proxy = opts.proxy || DEFAULT_PROXY;
  const timeoutMs = opts.timeoutMs || 25000;

  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const isHttps = u.protocol === 'https:';
    const port = u.port || (isHttps ? 443 : 80);
    const p = new URL(proxy);

    let settled = false;
    const done = (fn, v) => { if (!settled) { settled = true; fn(v); } };

    const sock = net.connect(Number(p.port), p.hostname, () => {
      sock.write(`CONNECT ${u.hostname}:${port} HTTP/1.1\r\nHost: ${u.hostname}:${port}\r\n\r\n`);
    });

    const timer = setTimeout(() => {
      try { sock.destroy(); } catch (e) {}
      done(reject, new Error('timeout ' + targetUrl.slice(0, 80)));
    }, timeoutMs);

    let buf = Buffer.alloc(0);
    let established = false;

    sock.on('data', (chunk) => {
      if (established) return;
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf('\r\n\r\n');
      if (idx === -1) return;
      const head = buf.slice(0, idx).toString();
      if (!/^HTTP\/1\.[01] 200/.test(head)) {
        clearTimeout(timer);
        try { sock.destroy(); } catch (e) {}
        done(reject, new Error('proxy CONNECT failed: ' + head.split('\r\n')[0]));
        return;
      }
      established = true;
      const leftover = buf.slice(idx + 4);

      const sock2 = isHttps ? tls.connect({ socket: sock, servername: u.hostname }) : sock;

      const send = () => {
        const headers = Object.assign({
          Host: u.hostname,
          'User-Agent': opts.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Connection: 'close',
        }, opts.headers || {});
        if (opts.body != null) headers['Content-Length'] = Buffer.byteLength(opts.body);
        let raw = `${opts.method || 'GET'} ${u.pathname}${u.search} HTTP/1.1\r\n`;
        for (const [k, v] of Object.entries(headers)) raw += `${k}: ${v}\r\n`;
        raw += '\r\n';
        if (opts.body != null) raw += opts.body;
        sock2.write(raw);
      };

      if (isHttps) sock2.on('secureConnect', send); else send();

      const chunks = leftover.length ? [leftover] : [];
      sock2.on('data', (d) => chunks.push(d));
      sock2.on('end', () => {
        clearTimeout(timer);
        const all = Buffer.concat(chunks);
        const hi = all.indexOf('\r\n\r\n');
        const headStr = all.slice(0, hi).toString();
        const status = Number((/^HTTP\/1\.[01] (\d+)/.exec(headStr) || [])[1] || 0);
        let body = all.slice(hi + 4).toString('utf8');
        if (/transfer-encoding:\s*chunked/i.test(headStr)) {
          let out = '', rest = body, guard = 0;
          while (rest.length && guard++ < 20000) {
            const eol = rest.indexOf('\r\n');
            if (eol === -1) break;
            const size = parseInt(rest.slice(0, eol), 16);
            if (!size) break;
            out += rest.slice(eol + 2, eol + 2 + size);
            rest = rest.slice(eol + 2 + size + 2);
          }
          body = out;
        }
        done(resolve, { status, headers: headStr, text: body });
      });
      sock2.on('error', (e) => { clearTimeout(timer); done(reject, e); });
    });

    sock.on('error', (e) => { clearTimeout(timer); done(reject, e); });
  });
}

/** 把 requestViaProxy 适配成 SDK 能用的 fetch 风格响应 */
async function fetchLike(url, init) {
  const r = await requestViaProxy(url, {
    method: (init && init.method) || 'GET',
    headers: (init && init.headers) || {},
    body: init && init.body,
  });
  return {
    ok: r.status >= 200 && r.status < 300,
    status: r.status,
    statusText: '',
    url,
    text: async () => r.text,
    json: async () => JSON.parse(r.text),
    headers: { get: (k) => (new RegExp('^' + k + ':\\s*(.*)$', 'im').exec(r.headers) || [])[1] || null },
  };
}

module.exports = { requestViaProxy, fetchLike, DEFAULT_PROXY };
