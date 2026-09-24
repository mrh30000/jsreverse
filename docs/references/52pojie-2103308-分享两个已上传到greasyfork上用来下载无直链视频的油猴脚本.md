# 分享两个已上传到greasyfork上用来下载无直链视频的油猴脚本

> **作者**: zwb83925462 | **发布时间**: 2026-04-16 12:41:00 | **版块**: 『福利经验』 | **查看/回复**: 929 / 6
> **原文**: [https://www.52pojie.cn/thread-2103308-1-1.html](https://www.52pojie.cn/thread-2103308-1-1.html)

---

*本帖最后由 zwb83925462 于 2026-4-18 00:49 编辑*

首先解释下无直链视频,是指在video标签内的链接是blob协议的,且此链接无法直接在新标签页下载观看的视频
两个脚本在碰到兼容的网址时会自动加载,无需手动干预,建议在无直链视频的网址使用倍速播放加快缓存速度
PS:第2个脚本在下载直链视频时要手动点击"开始缓存",比如抖音视频详情页上的视频.
有魔法的兄弟姐妹可以去greasyfork上下载,后续修BUG等会在那边更新
为了没有魔法的兄弟姐妹的体验,特意将脚本内容放到帖子里,用来复制粘贴
-----------
下面是 https://greasyfork.org/scripts/500166 的脚本内容,这个脚本只支持下载MSE方式的无直链视频,不支持Webcodecs和有直链视频,主要是为了防止和已有其他视频下载功能的脚本或扩展产生冲突

[JavaScript] *纯文本查看*

```

// ==UserScript==
// @name         auto_mse_video_download
// @name:zh-CN   自动缓存MSE视频
// @namespace    https://greasyfork.org/zh-CN/users/135090
// @version      1.0.1
// @description  支持MSE视频缓存下载,包括央视网(以及12371等用了相同播放器的网站),A站,B站等
// @author       zwb
// @match        https://*.ipanda.com/*V*.shtml*
// @match        https://*.cctv.cn/*V*.shtml*
// @match        https://*.cctv.com/*V*.shtml*
// @match        https://*.bilibili.com/video/*
// @match        https://*.acfun.cn/v/ac*
// @license      LGPL
// @run-at       document-start
// @grant        GM_notification
// @downloadURL  https://update.greasyfork.org/scripts/500166/auto_mse_video_download.user.js
// @updateURL    https://update.greasyfork.org/scripts/500166/auto_mse_video_download.meta.js
// ==/UserScript==

(function() {
    'use strict';
    const DEBUG = false;
    function log(...args) {
        if (DEBUG) console.log('[MSE-Cache]', ...args);
    }
    function error(...args) {
        console.error('[MSE-Cache]', ...args);
    }
    // ==================== 保存原始函数 ====================
    const originalMethods = {
        addSourceBuffer: MediaSource.prototype.addSourceBuffer,
        endOfStream: MediaSource.prototype.endOfStream,
        createObjectURL: URL.createObjectURL
    };
    // ==================== 数据结构 ====================
    const mediaSourceMap = new Map();
    let currentMediaInfo = null;
    // ==================== 工具函数 ====================
    // 统一文件扩展名判断逻辑
    const mimeToExtension = {
        // 视频格式
        'video/mp4': 'm4v',
        'video/x-m4v': 'm4v',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi',
        'video/x-ms-wmv': 'wmv',
        'video/x-matroska': 'mkv',
        'video/webm': 'webm',
        'video/ogg': 'ogv',
        // 音频格式
        'audio/mpeg': 'mp3',
        'audio/mp4': 'm4a',
        'audio/x-m4a': 'm4a',
        'audio/aac': 'aac',
        'audio/flac': 'flac',
        'audio/ogg': 'oga',
        'audio/webm': 'weba',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        // 包含codecs的常见格式
        'video/mp4; codecs="avc1': 'mp4',
        'video/mp4; codecs="hvc1': 'mp4',
        'video/mp4; codecs="hev1': 'mp4',
        'video/mp4; codecs="vp09': 'mp4',
        'video/webm; codecs="vp8': 'webm',
        'video/webm; codecs="vp9': 'webm',
        'video/webm; codecs="av1': 'webm',
        'audio/mp4; codecs="mp4a': 'm4a',
        'audio/webm; codecs="opus': 'weba',
        'audio/webm; codecs="vorbis': 'weba',
    };
    // 获取文件扩展名
    function getFileExtension(mimeType) {
        if (!mimeType) return 'bin';
        // 转换为小写进行比较
        const mimeLower = mimeType.toLowerCase();
        // 精确匹配
        for (const [key, ext] of Object.entries(mimeToExtension)) {
            if (mimeLower.includes(key.toLowerCase())) {
                return ext;
            }
        }
        // 通过MIME类型提取扩展名
        const mimeMatch = mimeLower.match(/\/(?:x-)?([a-z0-9]+)/);
        if (mimeMatch) {
            return mimeMatch[1];
        }
        return 'bin';
    }
    // 解析媒体信息
    function parseMediaInfo(mimeCodecs) {
        const mediaInfo = {
            type: 'unknown',
            format: 'unknown',
            codecs: '',
            mimeCodecs: mimeCodecs
        };
        try {
            const tmpArr = mimeCodecs.split(';');
            const typeInfo = tmpArr[0].trim().split('/');
            if (typeInfo.length >= 2) {
                mediaInfo.type = typeInfo[0];
                mediaInfo.format = typeInfo[1];
            }
            if (tmpArr[1]) {
                const codecMatch = tmpArr[1].match(/codecs\s*=\s*["']?([^"']+)["']?/i);
                if (codecMatch) {
                    mediaInfo.codecs = codecMatch[1].trim();
                }
            }
        } catch (e) {
            error('解析媒体信息失败:', e);
        }
        return mediaInfo;
    }
    // 生成文件名
    function generateFilename(mediaInfo, title) {
        const baseTitle = title || document.title || 'mse_video';
        const cleanTitle = baseTitle.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
        const ext = getFileExtension(mediaInfo.mimeCodecs);
        // 根据媒体类型和格式确定最终扩展名
        let finalExt = ext;
        if (mediaInfo.type === 'video') {
            if  (ext === 'mp4' || mediaInfo.format === 'mp4') {
                finalExt = 'm4v';
            } else if (ext === 'webm') {
                finalExt = 'webm';
            } else if (ext === 'ogg') {
                finalExt = 'ogv';
            }
        } else if (mediaInfo.type === 'audio') {
            if (ext === 'mp4' || mediaInfo.format === 'mp4') {
                finalExt = 'm4a';
            } else if (ext === 'webm') {
                finalExt = 'weba';
            } else if (ext === 'ogg') {
                finalExt = 'oga';
            }
        }
        return `${cleanTitle}.${finalExt}`;
    }
    // 下载 Blob
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        log(`下载完成: ${filename}, 大小: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    }
    // ==================== MSE 代理 ====================
    // 代理 MediaSource 的 addSourceBuffer 方法
    function proxyAddSourceBuffer() {
        MediaSource.prototype.addSourceBuffer = new Proxy(originalMethods.addSourceBuffer, {
            apply(target, ctx, args) {
                const mimeCodecs = args[0] || '';
                log('addSourceBuffer 被调用:', mimeCodecs);
                // 获取或创建 MediaSource 信息
                let mediaSourceInfo = mediaSourceMap.get(ctx);
                if (!mediaSourceInfo) {
                    mediaSourceInfo = {
                        mediaSource: ctx,
                        createTime: Date.now(),
                        sourceBuffers: [],
                        endOfStream: false,
                        hasDownload: false,
                        autoDownload: true,
                        mediaUrl: ctx.__objURL__ || null
                    };
                    mediaSourceMap.set(ctx, mediaSourceInfo);
                }
                const sourceBuffer = target.apply(ctx, args);
                const mediaInfo = parseMediaInfo(mimeCodecs);
                // 存储 SourceBuffer 信息
                const sourceBufferItem = {
                    mimeCodecs: mimeCodecs,
                    mediaInfo: mediaInfo,
                    originAppendBuffer: sourceBuffer.appendBuffer,
                    bufferData: [],
                    hasData: false,
                    size: 0
                };
                mediaSourceInfo.sourceBuffers.push(sourceBufferItem);
                // 代理 appendBuffer 方法
                sourceBuffer.appendBuffer = new Proxy(sourceBufferItem.originAppendBuffer, {
                    apply(bufTarget, bufCtx, bufArgs) {
                        const buffer = bufArgs[0];
                        if (buffer && buffer.byteLength) {
                            // 存储数据
                            sourceBufferItem.bufferData.push(buffer);
                            sourceBufferItem.hasData = true;
                            sourceBufferItem.size += buffer.byteLength;
                        }
                        return bufTarget.apply(bufCtx, bufArgs);
                    }
                });
                return sourceBuffer;
            }
        });
    }
    // 代理 MediaSource 的 endOfStream 方法
    function proxyEndOfStream() {
        MediaSource.prototype.endOfStream = new Proxy(originalMethods.endOfStream, {
            apply(target, ctx, args) {
                const mediaSourceInfo = mediaSourceMap.get(ctx);
                if (mediaSourceInfo) {
                    mediaSourceInfo.endOfStream = true;
                    log('媒体流加载完成，可以下载了');
                    if (mediaSourceInfo.autoDownload && !mediaSourceInfo.hasDownload) {
                        setTimeout(() => downloadMediaSource(mediaSourceInfo), 500);
                    }
                }
                return target.apply(ctx, args);
            }
        });
    }
    // 代理 URL.createObjectURL
    function proxyCreateObjectURL() {
        URL.createObjectURL = new Proxy(originalMethods.createObjectURL, {
            apply(target, ctx, args) {
                const object = args[0];
                const objectURL = target.apply(ctx, args);
                if (object instanceof MediaSource) {
                    object.__objURL__ = objectURL;
                    const mediaSourceInfo = mediaSourceMap.get(object);
                    if (mediaSourceInfo) {
                        mediaSourceInfo.mediaUrl = objectURL;
                    }
                    log('创建 ObjectURL:', objectURL);
                }
                return objectURL;
            }
        });
    }
    // ==================== 下载功能 ====================
    function downloadMediaSource(mediaSourceInfo) {
        if (!mediaSourceInfo || mediaSourceInfo.hasDownload) return false;
        const hasValidData = mediaSourceInfo.sourceBuffers.some(sb => sb.hasData);
        if (!hasValidData) {
            error('没有捕获到媒体数据');
            alert('没有捕获到媒体数据，请确保视频已经播放');
            return false;
        }
        let successCount = 0;
        let totalSize = 0;
        for (const sourceBuffer of mediaSourceInfo.sourceBuffers) {
            if (!sourceBuffer.hasData || sourceBuffer.bufferData.length === 0) continue;
            const blob = new Blob(sourceBuffer.bufferData, { type: sourceBuffer.mimeCodecs });
            const filename = generateFilename(sourceBuffer.mediaInfo, currentMediaInfo?.title);
            log(`准备下载: ${filename}, 类型: ${sourceBuffer.mimeCodecs}, 大小: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            downloadBlob(blob, filename);
            successCount++;
            totalSize += blob.size;
            // 清理内存
            sourceBuffer.bufferData = [];
            sourceBuffer.size = 0;
        }
        if (successCount > 0) {
            mediaSourceInfo.hasDownload = true;
            if (location.hostname.includes("cctv")){
                const videos = document.querySelectorAll('video');
                for (const video of videos) {
                    if (!video.paused) {
                        video.pause();
                        log('暂停视频');
                    }
                }
            }
            log(`下载完成: ${successCount} 个文件`);
            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: 'MSE 视频缓存完成',
                    text: `已保存 ${successCount} 个文件，共 ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                    timeout: 5000
                });
            }
        } else {
            alert('下载失败，没有有效的媒体数据');
        }
        return successCount > 0;
    }
    // ==================== UI 界面 ====================
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'mse-cache-panel';
        panel.innerHTML = `
        <div style="
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            color: white; font-family: system-ui, -apple-system, sans-serif;
            overflow: hidden; transition: all 0.3s ease;
        ">
            <div id="mse-cache-header" style="
                padding: 12px 16px; cursor: pointer;
                display: flex; align-items: center; gap: 8px; user-select: none;
            ">
                <span style="font-size: 18px;">&#128190;</span>
                <span style="font-weight: 500;">MSE 缓存工具</span>
                <span id="mse-status" style="
                    background: rgba(255,255,255,0.2); border-radius: 20px;
                    padding: 2px 8px; font-size: 11px;
                ">未检测</span>
                <span style="margin-left: 8px;">▼</span>
            </div>
            <div id="mse-cache-content" style="
                padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.2);
                display: none; flex-direction: column; gap: 10px; min-width: 260px;
            ">
                <div style="font-size: 12px; color: rgba(255,255,255,0.8);">&#128202; 捕获的媒体流:</div>
                <div id="mse-stream-list" style="
                    max-height: 200px; overflow-y: auto; font-size: 12px;
                    background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px;
                ">
                    <div style="color: rgba(255,255,255,0.6);">暂无数据</div>
                </div>
                <button id="mse-download-btn" style="
                    background: #4CAF50; border: none; color: white;
                    padding: 8px 16px; border-radius: 6px; cursor: pointer;
                    font-weight: 500; transition: all 0.2s;
                ">&#11015;&#65039; 下载捕获的视频</button>
                <button id="mse-auto-download-btn" style="
                    background: #2196F3; border: none; color: white;
                    padding: 8px 16px; border-radius: 6px; cursor: pointer;
                    font-weight: 500; transition: all 0.2s;
                ">&#9989; 自动下载已开启</button>
                <button id="mse-clear-btn" style="
                    background: #f44336; border: none; color: white;
                    padding: 8px 16px; border-radius: 6px; cursor: pointer;
                    font-weight: 500; transition: all 0.2s;
                ">&#128465;&#65039; 清空缓存数据</button>
            </div>
        </div>
        `;
        document.body.appendChild(panel);
        const header = document.getElementById('mse-cache-header');
        const content = document.getElementById('mse-cache-content');
        const downloadBtn = document.getElementById('mse-download-btn');
        const autoDownloadBtn = document.getElementById('mse-auto-download-btn');
        const clearBtn = document.getElementById('mse-clear-btn');
        const statusSpan = document.getElementById('mse-status');
        const streamList = document.getElementById('mse-stream-list');
        let expanded = false;
        header.addEventListener('click', () => {
            expanded = !expanded;
            content.style.display = expanded ? 'flex' : 'none';
            header.querySelector('span:last-child').textContent = expanded ? '▲' : '▼';
        });
        let lastDisplayedSize = -1;
        function updateStatus() {
            let totalSize = 0;
            let streams = [];
            for (const info of mediaSourceMap.values()) {
                for (const sb of info.sourceBuffers) {
                    if (sb.size > 0) {
                        totalSize += sb.size;
                        streams.push({
                            type: sb.mediaInfo.type || 'unknown',
                            format: sb.mediaInfo.format || 'unknown',
                            size: sb.size
                        });
                    }
                }
            }
            if (totalSize > 0) {
                if (totalSize !== lastDisplayedSize) {
                    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
                    statusSpan.textContent = `已缓存 ${sizeMB} MB`;
                    statusSpan.style.background = '#4CAF50';
                    let listHtml = '';
                    streams.forEach(s => {
                        listHtml += `<div style="margin-bottom: 6px;">${s.type === 'video' ? '&#127916;' : '&#127925;'} ${s.type}/${s.format}: ${(s.size / 1024 / 1024).toFixed(2)} MB</div>`;
                    });
                    streamList.innerHTML = listHtml;
                    lastDisplayedSize = totalSize;
                }
            } else {
                if (lastDisplayedSize !== 0) {
                    statusSpan.textContent = '等待数据...';
                    statusSpan.style.background = 'rgba(255,255,255,0.2)';
                    streamList.innerHTML = '<div style="color: rgba(255,255,255,0.6);">暂无数据</div>';
                    lastDisplayedSize = 0;
                }
            }
        }
        downloadBtn.addEventListener('click', () => {
            let hasData = false;
            for (const info of mediaSourceMap.values()) {
                if (info.sourceBuffers.some(sb => sb.hasData)) {
                    hasData = true;
                    downloadMediaSource(info);
                }
            }
            if (!hasData) {
                alert('没有捕获到媒体数据，请确保视频已经开始播放');
            }
        });
        autoDownloadBtn.addEventListener('click', () => {
            for (const info of mediaSourceMap.values()) {
                info.autoDownload = !info.autoDownload;
            }
            const enabled = Array.from(mediaSourceMap.values())[0]?.autoDownload ?? false;
            autoDownloadBtn.textContent = enabled ? '&#9989; 自动下载已开启' : '&#10060; 自动下载已关闭';
            autoDownloadBtn.style.background = enabled ? '#4CAF50' : '#FF9800';
        });
        clearBtn.addEventListener('click', () => {
            for (const info of mediaSourceMap.values()) {
                for (const sb of info.sourceBuffers) {
                    sb.bufferData = [];
                    sb.size = 0;
                    sb.hasData = false;
                }
            }
            lastDisplayedSize = -1;
            updateStatus();
            alert('缓存数据已清空');
        });
        setInterval(updateStatus, 1000);
        return panel;
    }
    // ==================== 辅助功能 ====================
    function updateMediaTitle() {
        const video = document.querySelector('video');
        if (video && !video.paused && video.currentTime > 0) {
            const title = video.getAttribute('data-title') || video.getAttribute('title') || document.title;
            if (title && title !== currentMediaInfo?.title) {
                currentMediaInfo = { title };
                log('检测到播放中的视频:', title);
            }
        }
    }
    // ==================== 初始化 ====================
    function init() {
        log('MSE 缓存工具启动');
        proxyAddSourceBuffer();
        proxyEndOfStream();
        proxyCreateObjectURL();
        createControlPanel();
        setInterval(updateMediaTitle, 2000);
        log('MSE 缓存工具已就绪');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

----------
下面是 https://greasyfork.org/scripts/438368 的脚本内容,这个脚本相比上面的脚本增加了直链视频下载功能,此脚本支持的网站并未全部添加到match项,可自行尝试兼容性

[JavaScript] *纯文本查看*

```

// ==UserScript==
// @name         MSE_Video_Catcher
// @name:zh-CN   MSE视频缓存工具
// @namespace    https://greasyfork.org/zh-CN/users/135090
// @version      0.3.3
// @description  智能拦截MSE明文分片，缓存完自动下载,还支持直链下载,可自行添加match项测试兼容性
// @author       zwb
// @match        https://*.ipanda.com/*V*.shtml*
// @match        https://*.cctv.cn/*V*.shtml*
// @match        https://*.cctv.com/*V*.shtml*
// @match        https://*.bilibili.com/video/*
// @match        https://*.acfun.cn/v/ac*
// @match        https://www.douyin.com/video/*
// @grant        none
// @run-at       document-start
// @license      LGPL-3
// @downloadURL  https://update.greasyfork.org/scripts/438368/MSE_Video_Catcher.user.js
// @updateURL    https://update.greasyfork.org/scripts/438368/MSE_Video_Catcher.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const S = {
        mode: null,
        chunks: [],
        totalBytes: 0,
        isCaching: false,
        isDone: false,
        hasMSE: false,
        videoEl: null,
        audioSrcCreated: false,
        recorder: null,
        recChunks: [],
        startTime: 0,
        origRate: 1,
        origVol: 1,
        origMuted: false,
        hasAudioStream: false,
        audioChunks: [],
        audioTotalBytes: 0,
        audioMimeType: null,
    };

    const fmtB = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1073741824).toFixed(2) + ' GB';

    function bufPct(v) {
        if (!v || !isFinite(v.duration) || v.duration <= 0) return 0;
        try {
            const b = v.buffered;
            if (!b.length) return 0;
            let t = 0;
            for (let i = 0; i < b.length; i++) t += b.end(i) - b.start(i);
            return Math.min(100, t / v.duration * 100);
        } catch (e) {  console.info(e); return 0;}
    }

    function parseBoxesWithSidx(u8) {
        const out = [];
        let off = 0;
        const end = u8.length;
        while (off < end) {
            if (off + 8 > end) { out.push({ type: '_partial', data: u8.slice(off) }); break; }
            const dv = new DataView(u8.buffer, u8.byteOffset + off, Math.min(end - off, 16));
            let sz = dv.getUint32(0);
            const type = String.fromCharCode(u8[off + 4], u8[off + 5], u8[off + 6], u8[off + 7]);
            if (sz === 1) {
                if (off + 16 > end) { out.push({ type: '_partial', data: u8.slice(off) }); break; }
                sz = dv.getUint32(8) * 4294967296 + new DataView(u8.buffer, u8.byteOffset + off + 12, 4).getUint32(0);
            } else if (sz === 0) { sz = end - off; }
            if (sz < 8 || off + sz > end) { out.push({ type: '_partial', data: u8.slice(off) }); break; }
            out.push({ type, data: u8.slice(off, off + sz), offset: off, size: sz });
            off += sz;
        }
        return out;
    }

    function makeFtyp() {
        return new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6F,0x6D,0,0,0,0,0x69,0x73,0x6F,0x6D,0x69,0x73,0x6F,0x32,0x6D,0x70,0x34,0x31]);
    }

    function rebuildAudioFile(audioChunks, mimeType) {
        if (!audioChunks || !audioChunks.length) return null;
        let fileExtension = 'm4a', blobType = 'audio/mp4';
        if (mimeType.includes('mp3')) { fileExtension = 'mp3'; blobType = 'audio/mpeg'; }
        else if (mimeType.includes('aac')) { fileExtension = 'aac'; blobType = 'audio/aac'; }
        else if (mimeType.includes('webm')) { fileExtension = 'weba'; blobType = 'audio/webm'; }
        else if (mimeType.includes('ogg')) { fileExtension = 'ogg'; blobType = 'audio/ogg'; }
        const totalSize = audioChunks.reduce((s, c) => s + c.length, 0);
        const result = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of audioChunks) { result.set(chunk, offset); offset += chunk.length; }
        return { blob: new Blob([result], { type: blobType }), extension: fileExtension };
    }

    function rebuildAudioMP4WithSidx(audioChunks) { return rebuildAudioFile(audioChunks, 'audio/mp4'); }

    function rebuildMP4WithSidx(chunks) {
        let ftyp = null, moov = null, tail = null;
        const frags = [], sidxBoxes = [];
        for (let i = 0; i < chunks.length; i++) {
            let data = chunks[i];
            if (tail) { const m = new Uint8Array(tail.length + data.length); m.set(tail, 0); m.set(data, tail.length); data = m; tail = null; }
            const boxes = parseBoxesWithSidx(data);
            for (const b of boxes) {
                if (b.type === '_partial') { tail = b.data; continue; }
                switch (b.type) {
                    case 'ftyp': if (!ftyp) ftyp = b.data; break;
                    case 'moov': if (!moov) moov = b.data; break;
                    case 'moof': case 'mdat': case 'emsg': case 'styp': frags.push(b); break;
                    case 'sidx': sidxBoxes.push({ data: b.data }); break;
                }
            }
        }
        if (!ftyp) ftyp = makeFtyp();
        const parts = [ftyp];
        if (moov) parts.push(moov);
        for (const sidx of sidxBoxes) parts.push(sidx.data);
        for (const frag of frags) parts.push(frag.data);
        const total = parts.reduce((s, p) => s + p.length, 0);
        if (total < 1024) return null;
        return new Blob(parts, { type: 'video/mp4' });
    }

    // MSE拦截器
    try {
        const origAddSB = MediaSource.prototype.addSourceBuffer;
        MediaSource.prototype.addSourceBuffer = function (mime) {
            S.hasMSE = true;
            if (mime.includes('audio') || mime.includes('Audio')) {
                S.hasAudioStream = true;
                S.audioMimeType = mime;
                S.audioChunks = S.audioChunks || [];
                S.audioTotalBytes = S.audioTotalBytes || 0;
            }
            const sb = origAddSB.call(this, mime);
            const origEOS = MediaSource.prototype.endOfStream;
            this.endOfStream = function (arg) { schedDL('mse', 'MediaSource.endOfStream'); return origEOS.call(this, arg); };
            const origApp = sb.appendBuffer;
            const origAA = sb.appendBufferAsync;
            const isAudio = mime.includes('audio') || mime.includes('Audio');
            sb.appendBuffer = function (buf) {
                if (buf && buf.byteLength > 0) {
                    if (isAudio) { S.audioChunks.push(new Uint8Array(buf).slice(0)); S.audioTotalBytes += buf.byteLength; }
                    else { S.chunks.push(new Uint8Array(buf).slice(0)); S.totalBytes += buf.byteLength; }
                    S.isCaching = true;
                }
                return origApp.call(this, buf);
            };
            if (origAA) {
                sb.appendBufferAsync = function (buf) {
                    if (buf && buf.byteLength > 0) {
                        if (isAudio) { S.audioChunks.push(new Uint8Array(buf).slice(0)); S.audioTotalBytes += buf.byteLength; }
                        else { S.chunks.push(new Uint8Array(buf).slice(0)); S.totalBytes += buf.byteLength; }
                        S.isCaching = true;
                    }
                    return origAA.call(this, buf);
                };
            }
            return sb;
        };
    } catch (e) {
        console.info(e);
    }

    let _at = null;
    function schedDL(mode, reason) { if (S.isDone) return; clearTimeout(_at); _at = setTimeout(() => autoDL(mode, reason), 1000); }
    function autoDL(mode, reason) {
        if (S.isDone) return;
        S.isDone = true; S.isCaching = false;
        if (location.hostname.includes("cctv") || location.hostname.includes("12371") ){
            document.querySelectorAll("video").forEach(video => video.pause());
        }
        notify(reason+'.缓存完成，正在自动下载…');
        refreshUI();
        setTimeout(() => { finishDL(mode); restorePlay(); }, 400);
    }
    function bindEvents(v) {
        v.addEventListener('ended', () => { if (S.isCaching && !S.isDone) schedDL(S.mode || 'mse', '播放结束'); }, { once: true });
        let lp = 0;
        const pid = setInterval(() => {
            if (S.isDone || !S.isCaching) { clearInterval(pid); return; }
            const p = bufPct(v);
            if (p > lp) lp = p;
            if (p >= 99.5 && isFinite(v.duration) && v.duration > 0) {
                schedDL(S.mode || 'mse', '缓冲完成'); clearInterval(pid);
            }
        }, 1000);
    }
    function restorePlay() {
        const v = S.videoEl; if (!v) return;
        try { v.pause(); v.volume = S.origVol; v.muted = true; v.playbackRate = S.origRate; v.pause(); } catch (e) { v.pause();console.info(e); }
    }

    function createPanel() {
        if (document.getElementById('tm-p')) return;
        const d = document.createElement('div');
        d.id = 'tm-p';
        d.innerHTML = `<div id="tm-box" style="position:fixed;right:20px;top:20px;z-index:2147483647;background:#bababa;color:#333;border:1px solid #333;border-radius:8px;padding:14px 18px;width:220px;font-family:monospace;font-size:12px;">
            <div style="margin-bottom:10px;font-weight:bold;">视频缓存器</div>
            <div id="tm-mode" style="color:#555;margin-bottom:8px;font-size:11px;">点击按钮开始</div>
            <div style="display:flex;gap:12px;">
                <div><span style="color:#666;">切片</span><br><b id="tm-sc">0</b></div>
                <div><span style="color:#666;">体积</span><br><b id="tm-sb">0 B</b></div>
            </div>
            <div style="margin-top:10px;display:flex;gap:8px;">
                <button id="tm-go" style="flex:1;padding:6px 0;border:none;border-radius:4px;cursor:pointer;background:#333;color:#eee;font-size:12px;">开始缓存</button>
                <button id="tm-kill" style="padding:6px 12px;border:1px solid #444;border-radius:4px;cursor:pointer;background:transparent;color:#888;font-size:12px;display:none;">取消</button>
            </div>
        </div>`;
        document.body.appendChild(d);
        document.getElementById('tm-go').onclick = handleStart;
        document.getElementById('tm-kill').onclick = handleCancel;
        setInterval(refreshUI, 500);
    }

    function refreshUI() {
        const sc = document.getElementById('tm-sc'), sb = document.getElementById('tm-sb');
        const mode = document.getElementById('tm-mode'), go = document.getElementById('tm-go'), kill = document.getElementById('tm-kill');
        if (!sc) return;
        const totalChunks = S.chunks.length + (S.audioChunks?.length || 0);
        const totalSize = S.totalBytes + (S.audioTotalBytes || 0);
        sc.textContent = S.mode === 'record' ? S.recChunks.length : totalChunks;
        sb.textContent = fmtB(S.mode === 'record' ? S.recChunks.reduce((s, c) => s + c.size, 0) : totalSize);
        const modeMap = { direct: '直链下载', blob: 'Blob提取', mse: S.hasAudioStream ? '音视频分离' : 'MSE重组', record: '实时录制' };
        mode.textContent = modeMap[S.mode] || '点击按钮开始';
        if (S.isDone) { go.textContent = '已完成'; go.style.opacity = '.5'; go.style.pointerEvents = 'none'; kill.style.display = 'none'; }
        else if (S.isCaching) { go.textContent = '缓存中…'; go.style.opacity = '.5'; go.style.pointerEvents = 'none'; kill.style.display = 'block'; }
        else { go.textContent = '开始缓存'; go.style.opacity = '1'; go.style.pointerEvents = 'auto'; kill.style.display = 'none'; }
    }

    function handleStart() {
        const v = findV(); if (!v) { notify('未找到video标签'); return; }
        S.videoEl = v; S.chunks = []; S.totalBytes = 0; S.recChunks = []; S.isDone = false; S.mode = null; S.startTime = Date.now();
        let src = v.src || v.currentSrc;
        if (src && !src.startsWith('blob:')) {
            S.mode = 'direct'; S.isDone = true; notify('发现直链'); refreshUI(); dl(src, 'video_direct'); return;
        }
        if (src && src.startsWith('blob:') && !S.hasMSE) {
            S.mode = 'blob'; S.isCaching = true; refreshUI(); notify('提取Blob…');
            fetch(src).then(r => r.blob()).then(blob => {
                S.totalBytes = blob.size; S.isDone = true; S.isCaching = false; refreshUI(); dl(URL.createObjectURL(blob), 'video_blob');
            }).catch(() => { notify('Blob失败，尝试录制'); startRec(v); });
            return;
        }
        if (S.hasMSE || S.chunks.length > 0) {
            S.mode = 'mse'; S.isCaching = true; refreshUI(); v.muted = true; v.playbackRate = 8; return;
        }
        if (v.readyState >= 2) { notify('启动录制'); startRec(v); }
        else { notify('请先播放视频'); }
    }

    function handleCancel() {
        S.isCaching = false; S.isDone = false; S.chunks = []; S.recChunks = []; S.totalBytes = 0; S.startTime = 0; S.mode = null;
        if (S.recorder && S.recorder.state !== 'inactive') S.recorder.stop();
        restorePlay(); notify('已取消'); refreshUI();
    }

    function finishDL(mode) {
        const tt = document.title.replaceAll(" ", "_");
        if (mode === 'mse' && (S.chunks.length > 0 || S.audioChunks?.length > 0)) {
            if (S.chunks.length > 0) {
                const videoBlob = rebuildMP4WithSidx(S.chunks);
                if (videoBlob) dl(URL.createObjectURL(videoBlob), tt, 'm4v');
            }
            if (S.audioChunks?.length > 0) {
                setTimeout(() => {
                    const audioInfo = rebuildAudioMP4WithSidx(S.audioChunks);
                    if (audioInfo?.blob) dl(URL.createObjectURL(audioInfo.blob), tt, audioInfo.extension);
                    else {
                        const totalSize = S.audioChunks.reduce((s, c) => s + c.length, 0);
                        const combined = new Uint8Array(totalSize);
                        let offset = 0;
                        for (const chunk of S.audioChunks) { combined.set(chunk, offset); offset += chunk.length; }
                        dl(URL.createObjectURL(new Blob([combined], { type: S.audioMimeType || 'audio/mp4' })), tt, S.audioMimeType?.includes('webm') ? 'weba' : 'm4a');
                    }
                    S.audioChunks = []; S.audioTotalBytes = 0; S.audioMimeType = null;
                }, 1000);
            }
            S.chunks = []; S.totalBytes = 0; S.isCaching = false; S.hasAudioStream = false;
        }
    }

    async function startRec(v) {
        S.mode = 'record'; S.isCaching = true; S.videoEl = v; S.startTime = Date.now();
        try {
            let stream = v.captureStream ? v.captureStream() : v.mozCaptureStream();
            try {
                if (!S.audioSrcCreated) {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const src = audioCtx.createMediaElementSource(v);
                    const dest = audioCtx.createMediaStreamDestination();
                    src.connect(dest); src.connect(audioCtx.destination);
                    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
                    S.audioSrcCreated = true;
                }
            } catch (e) {console.info(e);}
            let mime = 'video/webm;codecs=vp9,opus';
            if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp8,opus';
            if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
            const rec = new MediaRecorder(stream, { mimeType: mime });
            S.recorder = rec;
            rec.ondataavailable = e => { if (e.data?.size > 0) S.recChunks.push(e.data); };
            rec.onstop = () => {
                const blob = new Blob(S.recChunks, { type: 'video/webm' });
                S.isDone = true; S.isCaching = false; refreshUI();
                dl(URL.createObjectURL(blob), 'video_recorded', 'webm');
                restorePlay();
            };
            rec.start(1000); v.muted = true; v.play().catch(() => {});
            bindEvents(v); notify('录制已开始');
        } catch (err) { notify('录制失败: ' + err.message); restorePlay(); S.isCaching = false; refreshUI(); }
    }

    function dl(url, prefix, ext = 'mp4') {
        const a = document.createElement('a');
        a.href = url; a.download = `${prefix}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    function notify(msg) {
        const n = document.createElement('div');
        n.textContent = msg;
        n.style.cssText = 'position:fixed;right:20px;bottom:30px;z-index:2147483647;padding:10px 16px;background:#bababa;color:#ccc;border:1px solid #333;border-radius:6px;font-size:12px;font-family:monospace;';
        document.body.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity .3s'; setTimeout(() => n.remove(), 400); }, 3000);
    }

    function findV() {
        const vs = document.querySelectorAll('video'); if (!vs.length) return null;
        let best = null, ba = 0;
        for (const v of vs) { const a = v.offsetWidth * v.offsetHeight; if (a > ba) { ba = a; best = v; } }
        return best || vs[0];
    }

    function init() { if (!document.getElementById('tm-p')) createPanel(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50));
    else setTimeout(init, 50);
    setTimeout(() => { if (!document.body) return; new MutationObserver(() => { if (!document.getElementById('tm-p')) init(); }).observe(document.body, { childList: true, subtree: true }); }, 0);
})();
```

-----------
总结陈词:
第一个脚本专注于video标签内是blob链接的视频,可以搭配猫抓这类扩展使用
第二个脚本除了支持第一个脚本的功能外,还支持直链视频,适合在未安装猫抓等嗅探扩展的浏览器上使用.(录制模式尚未在内置的网址上触发,可自行尝试其他网址)
