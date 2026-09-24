/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSE（MediaSource Extensions）流捕获探针 —— 「无直链视频」的落盘入口。
 *
 * 适用判据（缺一不可）：
 *   1. `<video>` 的 src 是 `blob:`，或者网络面板里只有一堆分片、没有可播的单一地址；
 *   2. 页面**确实**走 MSE（会调 `MediaSource.prototype.addSourceBuffer`）。
 *   —— 若页面用 WebCodecs / `VideoDecoder`（不走 MSE），本探针抓不到，见 SKILL.md 的边界。
 *
 * 序列化约束：函数体内不得引用模块级变量，配置通过 config 传入。
 *
 * config 支持的选项：
 * - hookId: string
 * - autoDownload: boolean（默认 false；`endOfStream` 到达时自动交付）
 * - minBytes: number（默认 0；单次 appendBuffer 小于该值不记录）
 * - maxTotalBytes: number（默认 256MB；超过后停止累积并一次性告警，避免 OOM）
 * - pauseOnFinish: boolean（默认 false；交付后暂停页面上正在播放的 <video>）
 * - trackObjectURL: boolean（默认 true；同时代理 URL.createObjectURL 记下 blob 地址）
 * - sinkVar: string（默认 `__mse_capture_sink`；若该全局是函数，交付走它而不是 <a download>）
 *
 * 挂载：`window.__mse_capture`
 *   - `streams()`  列出捕获到的流（mime / 字节数 / 分片数 / 是否结束 / blob 地址）
 *   - `save(i)`    交付第 i 条（省略则全部）；返回 [{filename, bytes}]
 *   - `clear()`    丢弃所有已缓存分片（释放内存）
 *   - `raw`        底层 Map（调试用）
 *
 * 为什么是「代理 appendBuffer」而不是「hook fetch/XHR」：
 * 分片可能来自 `fetch`、`XHR`、甚至页面自己拼的若干段；但无论怎么来，最终**一定**会走过
 * `SourceBuffer.appendBuffer`。抓这一层等价于抓「播放器真正喂进去的字节流」，
 * 而且拿到的已经是解复用前的原始分片（无需关心网络层伪装）。
 */
export function installMseCaptureHook(config) {
  const hookId = config.hookId || 'mse_capture';
  const autoDownload = config.autoDownload ?? false;
  const minBytes = typeof config.minBytes === 'number' ? config.minBytes : 0;
  const maxTotalBytes = typeof config.maxTotalBytes === 'number' ? config.maxTotalBytes : 268435456;
  const pauseOnFinish = config.pauseOnFinish ?? false;
  const trackObjectURL = config.trackObjectURL ?? true;
  const sinkVar = config.sinkVar || '__mse_capture_sink';

  const MIME_EXT = {
    'video/mp4': 'mp4',
    'video/x-m4v': 'm4v',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-ms-wmv': 'wmv',
    'video/x-matroska': 'mkv',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/ogg': 'oga',
    'audio/webm': 'weba',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
  };

  // 注意：一段 mime 可以带 `; codecs="…"`，因此必须用「前缀包含」而不是全等。
  function mimeToExtension(mime) {
    if (!mime) return 'bin';
    const lower = String(mime).toLowerCase();
    const keys = Object.keys(MIME_EXT);
    for (let i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) === 0) return MIME_EXT[keys[i]];
    }
    const m = lower.match(/\/(?:x-)?([a-z0-9]+)/);
    return m ? m[1] : 'bin';
  }

  function describeMime(mime) {
    const out = {type: 'unknown', format: 'unknown', codecs: ''};
    if (!mime) return out;
    const parts = String(mime).split(';');
    const kinds = parts[0].trim().split('/');
    if (kinds.length >= 2) {
      out.type = kinds[0];
      out.format = kinds[1];
    }
    if (parts[1]) {
      const cm = parts[1].match(/codecs\s*=\s*["']?([^"']+)["']?/i);
      if (cm) out.codecs = cm[1].trim();
    }
    return out;
  }

  function safeName(mime) {
    let title = 'mse_capture';
    try {
      title = document.title || title;
    } catch (_) {}
    let ext = mimeToExtension(mime);
    const info = describeMime(mime);
    // 与站点播放器一致的习惯：mp4/webm/ogg 家族按音/视频分别落到 m4v|m4a / webm|weba / ogv|oga
    if (info.type === 'video' && (ext === 'mp4' || info.format === 'mp4')) ext = 'm4v';
    else if (info.type === 'audio' && (ext === 'mp4' || info.format === 'mp4')) ext = 'm4a';
    else if (info.type === 'video' && ext === 'ogg') ext = 'ogv';
    else if (info.type === 'audio' && ext === 'ogg') ext = 'oga';
    else if (info.type === 'audio' && ext === 'webm') ext = 'weba';
    return String(title).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_') + '.' + ext;
  }

  if (typeof window === 'undefined' || typeof window.MediaSource !== 'function') {
    console.warn('[' + hookId + '] 当前环境没有 MediaSource（非 MSE 播放器？）⇒ 未安装。');
    return;
  }
  if (window.__mse_capture && window.__mse_capture._installed) {
    console.warn('[' + hookId + '] 已安装，跳过重复安装。');
    return;
  }

  const rawAddSourceBuffer = window.MediaSource.prototype.addSourceBuffer;
  const rawEndOfStream = window.MediaSource.prototype.endOfStream;
  const rawCreateObjectURL = (typeof window.URL === 'function' && window.URL.createObjectURL)
    ? window.URL.createObjectURL
    : null;

  const mediaRegistry = new Map();   // MediaSource -> record
  // ★ 站点真实顺序是「new MediaSource() → URL.createObjectURL(ms) → video.src → **之后**才 addSourceBuffer」，
  //   所以 blob 地址必须在**还没有 record** 的时候也能存下来（B29 真机跑出来的缺陷）。
  const urlOfMedia = new Map();      // MediaSource -> blob 地址
  let seq = 0;

  function newMediaRecord(ms) {
    const rec = {
      key: seq++,
      mediaSource: ms,
      objectURL: ms.__objURL__ || urlOfMedia.get(ms) || null,
      finished: false,
      delivered: false,
      buffers: [],
      droppedBytes: 0,
    };
    mediaRegistry.set(ms, rec);
    return rec;
  }

  function totalBytes() {
    let sum = 0;
    mediaRegistry.forEach(function (rec) {
      for (let i = 0; i < rec.buffers.length; i++) sum += rec.buffers[i].bytes;
    });
    return sum;
  }

  function deliver(blob, filename) {
    const sink = window[sinkVar];
    if (typeof sink === 'function') {
      // 交付给宿主（浏览器端调试、headless、browsercli evaluate 都能接管）
      sink(blob, filename);
      return true;
    }
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (_) {}
      }, 100);
      return true;
    } catch (e) {
      console.error('[' + hookId + '] 交付失败：', e);
      return false;
    }
  }

  function pauseVideos() {
    try {
      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        if (!videos[i].paused && typeof videos[i].pause === 'function') videos[i].pause();
      }
    } catch (_) {}
  }

  // ---------------------------------------------------------------- 代理 addSourceBuffer
  window.MediaSource.prototype.addSourceBuffer = new Proxy(rawAddSourceBuffer, {
    apply: function (target, ctx, args) {
      const mime = args && args[0] ? String(args[0]) : '';
      let rec = mediaRegistry.get(ctx);
      if (!rec) rec = newMediaRecord(ctx);
      const sb = Reflect.apply(target, ctx, args);
      const slot = {
        sourceBuffer: sb,
        mime: mime,
        info: describeMime(mime),
        bytes: 0,
        chunks: [],
        overflowed: false,
        hadOverflow: false,
      };
      rec.buffers.push(slot);
      // 代理 appendBuffer：这是「播放器真正喂进去的字节流」唯一必经之路
      const rawAppend = sb.appendBuffer;
      sb.appendBuffer = new Proxy(rawAppend, {
        apply: function (bufTarget, bufCtx, bufArgs) {
          const data = bufArgs && bufArgs[0];
          if (data && typeof data.byteLength === 'number' && data.byteLength > 0) {
            if (data.byteLength >= minBytes && !slot.overflowed) {
              if (totalBytes() + data.byteLength > maxTotalBytes) {
                slot.overflowed = true;
                if (!slot.hadOverflow) {
                  slot.hadOverflow = true;
                  console.warn('[' + hookId + '] 累计已超过 maxTotalBytes=' + maxTotalBytes +
                    '，停止累积（已捕获 ' + totalBytes() + ' 字节）。用 __mse_capture.clear() 先清一批。');
                }
              } else {
                slot.chunks.push(data);
                slot.bytes += data.byteLength;
              }
            } else if (data.byteLength < minBytes) {
              slot.skippedBytes = (slot.skippedBytes || 0) + data.byteLength;
            }
          }
          return Reflect.apply(bufTarget, bufCtx, bufArgs);
        },
      });
      console.log('[' + hookId + '] addSourceBuffer: ' + mime + ' ⇒ ' + slot.info.type + '/' + slot.info.format);
      return sb;
    },
  });

  // ---------------------------------------------------------------- 代理 endOfStream
  window.MediaSource.prototype.endOfStream = new Proxy(rawEndOfStream, {
    apply: function (target, ctx, args) {
      const rec = mediaRegistry.get(ctx);
      if (rec) {
        rec.finished = true;
        console.log('[' + hookId + '] endOfStream：' + rec.buffers.length + ' 条流，共 ' + totalBytes() + ' 字节');
        if (autoDownload && !rec.delivered) {
          rec.delivered = true;
          setTimeout(function () {
            api.save();
            if (pauseOnFinish) pauseVideos();
          }, 300);
        }
      }
      return Reflect.apply(target, ctx, args);
    },
  });

  // ---------------------------------------------------------------- 代理 URL.createObjectURL
  if (trackObjectURL && rawCreateObjectURL) {
    window.URL.createObjectURL = new Proxy(rawCreateObjectURL, {
      apply: function (target, ctx, args) {
        const url = Reflect.apply(target, ctx, args);
        const obj = args && args[0];
        if (obj instanceof window.MediaSource) {
          // 先无条件下存（此时可能还没有 record），再回填到 record（如果有）
          urlOfMedia.set(obj, url);
          const rec = mediaRegistry.get(obj);
          if (rec) rec.objectURL = url;
          try {
            obj.__objURL__ = url;
          } catch (_) {}
          console.log('[' + hookId + '] blob 地址: ' + url);
        }
        return url;
      },
    });
  }

  // ---------------------------------------------------------------- 对外 API
  const api = {
    _installed: true,
    hookId: hookId,

    streams: function () {
      const out = [];
      mediaRegistry.forEach(function (rec) {
        for (let i = 0; i < rec.buffers.length; i++) {
          const slot = rec.buffers[i];
          out.push({
            key: rec.key,
            mime: slot.mime,
            type: slot.info.type,
            format: slot.info.format,
            codecs: slot.info.codecs,
            bytes: slot.bytes,
            chunks: slot.chunks.length,
            skippedBytes: slot.skippedBytes || 0,
            overflowed: slot.overflowed,
            finished: rec.finished,
            objectURL: rec.objectURL || urlOfMedia.get(rec.mediaSource) || null,
          });
        }
      });
      return out;
    },

    save: function (index) {
      const sinks = [];
      mediaRegistry.forEach(function (rec) {
        for (let i = 0; i < rec.buffers.length; i++) {
          const slot = rec.buffers[i];
          if (slot.chunks.length === 0) continue;
          sinks.push({rec: rec, slot: slot});
        }
      });
      const picked = (typeof index === 'number' && index >= 0) ? [sinks[index]].filter(Boolean) : sinks;
      const results = [];
      picked.forEach(function (item) {
        const parts = item.slot.chunks.slice();
        const blob = new Blob(parts, {type: item.slot.mime});
        const filename = safeName(item.slot.mime);
        results.push({filename: filename, bytes: blob.size, ok: deliver(blob, filename)});
        // 交付后立刻释放本地引用（网页还在播时内存很容易爆）
        item.slot.chunks = [];
        item.slot.bytes = 0;
      });
      if (results.length === 0) console.warn('[' + hookId + '] 没有可交付的数据（还没缓存到分片？）');
      return results;
    },

    clear: function () {
      let freed = 0;
      mediaRegistry.forEach(function (rec) {
        for (let i = 0; i < rec.buffers.length; i++) {
          freed += rec.buffers[i].bytes;
          rec.buffers[i].chunks = [];
          rec.buffers[i].bytes = 0;
        }
      });
      console.log('[' + hookId + '] 已释放 ' + freed + ' 字节');
      return freed;
    },

    raw: mediaRegistry,
  };

  window.__mse_capture = api;
  console.log('[' + hookId + '] ✅ MSE 捕获已安装（autoDownload=' + autoDownload + '）' +
    '：播一遍就会缓存；window.__mse_capture.streams() 看清单，.save() 落盘。');
}
