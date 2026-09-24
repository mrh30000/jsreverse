# 【油猴脚本】视频播放优化：B站/学堂在线/中国大学MOOC

> **作者**: Chehil | **发布时间**: 2026-03-25 00:43:00 | **版块**: 『福利经验』 | **查看/回复**: 1667 / 11
> **原文**: [https://www.52pojie.cn/thread-2099142-1-1.html](https://www.52pojie.cn/thread-2099142-1-1.html)

---

*本帖最后由 Chehil 于 2026-3-27 00:51 编辑*

最近在观看网课（学堂在线、中国大学 MOOC）时，被平台各种“霸王条款”折磨得心力交瘁：

1. **切屏/画中画秒暂停**：哪怕是用分屏做笔记，页面失去焦点时，视频会自动暂停。
2. **锁死最高 2.0x 倍速**：老师语速慢时简直煎熬，通过控制台强制修改底层 `playbackRate` 会被定时器重置。
3. **调整进度条疯狂卡死**：一旦用脚本直接修改 `currentTime` 时，播放器极易抛出 `DOMException` 异常并锁死 UI。

为了实现“左手 WSAD 盲操控制，右手安心做笔记”的沉浸式体验，我花了一些时间对这两个平台的前端机制进行了分析，并编写了对应的 Tampermonkey 优化脚本。在此记录一下解决思路，供大家参考。

---

### 核心问题分析与解决思路

#### 1. 突破切屏与画中画的自动暂停

**现象**：切换标签页或使用浏览器原生画中画时，视频会自动触发暂停。此前尝试拦截底层 `HTMLVideoElement.prototype.pause` 或 jQuery 的 `trigger('pause')`，但这会导致播放器内部状态机错乱，引发网络请求节流相关的假死报错（`stalled` / `error.loader`）。

**解法**：从源头屏蔽平台的失焦检测。通过拦截原生的 `addEventListener`，并在 `document-start` 阶段重写相关 DOM 属性，使网页代码无法感知页面状态的变化。

```
// 拦截现代事件监听与旧版 DOM 属性赋值
const blockEvents = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout', 'pagehide', 'mouseleave'];
// ... (拦截逻辑)
Object.defineProperties(document, {
    'hidden': { get: () => false, configurable: true },
    'visibilityState': { get: () => 'visible', configurable: true }
});
```

#### 2. 绕过前端倍速轮询重置

**现象**：平台前端存在定时器，会不断轮询底层的 `playbackRate`，若与 UI 菜单的值不符则强制重置。

**解法**：通过 `Object.defineProperty` 劫持 `HTMLMediaElement.prototype.playbackRate` 的 `setter`。设置一个“锁定”状态，开启自定义倍速时，拦截并丢弃平台发出的重置指令。

#### 3. 解决脚本寻址导致的 DOMException 卡死

**现象**：为了绑定自定义快进/后退快捷键，最初直接使用了 `video.currentTime += 5`。但由于平台使用的是 MSE (Media Source Extensions) 架构的播放器，直接修改时间会绕过其内部的缓冲管理器，导致状态机崩溃并抛出 `DOMException: aborted`。此外，由于 Webpack 的作用域隔离，外部脚本无法直接调用其内部封装的 jQuery API 发送合规指令。

**解法**：放弃代码层面的 API 调用，转而通过计算进度条的 DOM 物理尺寸和目标时间的百分比，在特定的绝对坐标点生成并派发原生的 `MouseEvent`，以此触发播放器自带的缓冲逻辑。

#### 4. 兼容多平台与高频防抖 (Debounce)

**现象**：中国大学 MOOC 的进度条拖拽逻辑监听的是 `mousedown` 而非 `click`。同时，如果用户高频连续按键快进，会瞬间产生大量网络请求，再次导致 MSE 底层崩溃。

**解法**：

1. 完善事件派发链路，依次触发 `mousedown` -> `mouseup` -> `click`，以兼容不同平台的监听方式。
2. 引入 400ms 的防抖机制。连续按键期间只更新 OSD 视觉提示，停止按键 400ms 后才执行唯一一次坐标点击运算。

---

### 最终代码实现

基于以上思路，最终整合了一版支持双平台的优化脚本。去除了所有具有侵入性的冲突拦截，保持了播放器原有的请求逻辑，稳定性较好。

**主要功能：**

* **稳定画中画**：彻底屏蔽失焦检测，分屏/后台不暂停，正常记录时长。
* **独立键位盲操 (WSAD)**：分离平台原生方向键。
  + `W` / `S`：控制音量。
  + `A` / `D`：后退 / 快进 5 秒（带 400ms 防抖处理）。
  + `C` / `X`：加速 / 减速（可突破 2.0x 限制）。
  + `Z`：恢复 1.0x 原速并解除底层锁定。
  + `Space`：原生底层播放/暂停。

**源代码：**

JavaScript

```
// ==UserScript==
// @name         网课播放优化
// @namespace    http://tampermonkey.net/
// @version      14.9
// @description  视频播放时用快捷键操控。
// @author       Chehil
// @match        *://*.xuetangx.com/*
// @match        *://*.icourse163.org/*
// @match        *://*.bilibili.com/*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 模块一：屏蔽失焦检测机制
    // ==========================================
    const blockEvents = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout', 'pagehide', 'mouseleave'];
    const origAddEventListener = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (blockEvents.includes(type) && (this === document || this === window)) {
            return;
        }
        return origAddEventListener.apply(this, arguments);
    };

    const killSetter = (obj, prop) => {
        try {
            Object.defineProperty(obj, prop, { get: () => null, set: () => {}, configurable: true });
        } catch (e) {}
    };

    killSetter(window, 'onblur');
    killSetter(window, 'onpagehide');
    killSetter(window, 'onfocusout');
    killSetter(window, 'onmouseleave');
    killSetter(document, 'onvisibilitychange');

    Object.defineProperties(document, {
        'hidden': { get: () => false, configurable: true },
        'visibilityState': { get: () => 'visible', configurable: true },
        'webkitHidden': { get: () => false, configurable: true },
    });
    Document.prototype.hasFocus = () => true;

    // ==========================================
    // 模块二：劫持媒体属性拦截平台重置
    // ==========================================
    const origPlaybackRate = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
    const origVolume = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

    let isLocked = false;
    let mySpeed = 1.0;
    let myVolume = 1.0;

    if (origPlaybackRate && origPlaybackRate.set) {
        Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
            get: function() { return origPlaybackRate.get.call(this); },
            set: function(val) { origPlaybackRate.set.call(this, isLocked ? mySpeed : val); }
        });
    }

    if (origVolume && origVolume.set) {
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: function() { return origVolume.get.call(this); },
            set: function(val) { origVolume.set.call(this, isLocked ? myVolume : val); }
        });
    }

    // ==========================================
    // 模块三：UI反馈与事件防抖模拟
    // ==========================================
    window.addEventListener('DOMContentLoaded', () => {
        const osd = document.createElement('div');
        osd.style.cssText = `
            position: fixed;
            top: 12%;
            left: 50%;
            transform: translate(-50%, -8px);

            min-width: max-content;
            max-width: min(80vw, 520px);
            padding: 10px 20px;
            border-radius: 999px;

            z-index: 2147483647;
            pointer-events: none;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            opacity: 0;
            visibility: hidden;

            background:
                linear-gradient(135deg,
                    rgba(24, 26, 38, 0.72) 0%,
                    rgba(32, 35, 52, 0.62) 100%
                );

            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);

            border: 1px solid rgba(255, 255, 255, 0.12);

            box-shadow:
                0 10px 30px rgba(0, 0, 0, 0.22),
                inset 0 1px 0 rgba(255, 255, 255, 0.08);

            color: rgba(255, 255, 255, 0.95);
            font-size: 16px;
            font-weight: 500;
            line-height: 1.2;
            letter-spacing: 0.02em;

            font-family: "Segoe UI Symbol", Arial, sans-serif;
            font-variant-numeric: tabular-nums;
            font-variant-emoji: text;

            transition:
                opacity 0.22s ease,
                transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                visibility 0.22s ease;
        `;
        document.body.appendChild(osd);

        let osdTimer;
        const showOSD = (text) => {
            osd.textContent = text;
            osd.style.visibility = 'visible';
            osd.style.opacity = '1';
            osd.style.transform = 'translate(-50%, 0)';

            clearTimeout(osdTimer);
            osdTimer = setTimeout(() => {
                osd.style.opacity = '0';
                osd.style.transform = 'translate(-50%, -8px)';
                osd.style.visibility = 'hidden';
            }, 1500);
        };

        const formatTime = (seconds) => {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        let seekTargetTime = null;
        let seekTimer = null;

        document.addEventListener('keydown', function(e) {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (['input', 'textarea'].includes(activeTag) || document.activeElement.isContentEditable) return;

            const video = document.querySelector('video');
            if (!video) return;

            const hotkeys = ['Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyX', 'KeyC', 'KeyZ'];
            if (hotkeys.includes(e.code)) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            switch (e.code) {
                case 'Space': {
                    if (video.paused) {
                        video.play().catch(()=>{});
                        showOSD('▶ 播放');
                    } else {
                        video.pause();
                        showOSD('❚❚ 暂停');
                    }
                    break;
                }
                case 'KeyD': // D键：快进
                case 'KeyA': { // A键：后退
                    const delta = e.code === 'KeyD' ? 5 : -5;

                    if (seekTargetTime === null) {
                        seekTargetTime = video.currentTime;
                    }

                    seekTargetTime = Math.max(0.1, Math.min(seekTargetTime + delta, video.duration - 0.1));
                    showOSD(delta > 0 ? `快进至 ${formatTime(seekTargetTime)} 🡆` : `🡄 后退至 ${formatTime(seekTargetTime)}`);

                    clearTimeout(seekTimer);
                    seekTimer = setTimeout(() => {
                        // 进度条模拟点击查找
                        const progressBar = document.querySelector('.xt_video_player_progress') || // 学堂在线
                                            document.querySelector('.progresswrap'); // 中国大学MOOC
                        if (progressBar) {
                            const rect = progressBar.getBoundingClientRect();
                            if (rect.width > 0) {
                                const percentage = seekTargetTime / video.duration;
                                const targetX = rect.left + (rect.width * percentage);
                                const targetY = rect.top + (rect.height / 2);

                                const dispatchMouse = (type) => {
                                    progressBar.dispatchEvent(new MouseEvent(type, {
                                        bubbles: true, cancelable: true, view: window,
                                        clientX: targetX, clientY: targetY
                                    }));
                                };

                                dispatchMouse('mousedown');
                                dispatchMouse('mouseup');
                                dispatchMouse('click');
                            } else {
                                video.currentTime = seekTargetTime;
                            }
                        } else {
                            // 保底方案：如果没有找到进度条，直接走原生时间修改
                            video.currentTime = seekTargetTime;
                        }

                        seekTargetTime = null;
                    }, 400);

                    break;
                }
                case 'KeyW': // W键：音量加大
                    isLocked = true;
                    myVolume = Math.min(video.volume + 0.1, 1);
                    video.volume = myVolume;
                    showOSD(`🔊 音量: ${Math.round(myVolume * 100)}%`);
                    break;
                case 'KeyS': // S键：音量减小
                    isLocked = true;
                    myVolume = Math.max(video.volume - 0.1, 0);
                    video.volume = myVolume;
                    showOSD(`🔉 音量: ${Math.round(myVolume * 100)}%`);
                    break;
                case 'KeyC': // C键：加速
                    isLocked = true;
                    mySpeed = Math.min(video.playbackRate + 0.25, 4.0);
                    video.playbackRate = mySpeed;
                    showOSD(`🚀 速度: ${mySpeed.toFixed(2)}x`);
                    break;
                case 'KeyX': // X键：减速
                    isLocked = true;
                    mySpeed = Math.max(video.playbackRate - 0.25, 0.25);
                    video.playbackRate = mySpeed;
                    showOSD(`🐢 速度: ${mySpeed.toFixed(2)}x`);
                    break;
                case 'KeyZ': // Z键：恢复原速并解锁
                    isLocked = false;
                    video.playbackRate = 1.0;
                    showOSD(`🔘 恢复默认控制`);
                    break;
            }
        }, true);
    });

})();
```

**提示：**

* 初次观看某些有服务端强制校验的课程时，建议谨慎使用过高倍速或拖拽功能，以免进度无效。复习时可正常使用。
* 代码供学习交流探讨，欢迎提出优化建议。
