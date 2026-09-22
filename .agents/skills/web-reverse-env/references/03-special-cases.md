# 特殊检测点与高强度模块

优先用于这些场景：

- `document.all`
- native `toString`
- `toString.toString`
- 栈与异常检测
- `window.crypto.getRandomValues`
- `performance.timing`
- `RTCPeerConnection`
- `AudioContext` / `OfflineAudioContext`
- `Worker` / `SharedWorker`
- `Math` 精度差异

## 1. `document.all`

把它视为特殊对象，不要当普通属性补。

优先分成三条路线：

- `native-addon`
- `v8-api`
- `fallback`

验证至少包括：

- `== undefined`
- `=== undefined`
- `typeof`
- 调用行为

## 2. native `toString`

如果站点在这些点报错或暴露：

- `fn.toString()`
- `fn.toString.toString()`
- getter / setter `toString`

优先使用 [protect-native.js](../scripts/protect-native.js)。

## 3. 栈与异常检测

重点关注：

- `evalmachine.<anonymous>`
- Node 内部栈帧
- 包装函数名泄露
- 文件名不真实

如果只是“看起来像能跑”，但栈还露 Node 痕迹，不算补完。

## 4. `crypto-module`

至少考虑：

- `window.crypto`
- `window.msCrypto`
- `getRandomValues`
- typed array 类型校验
- 长度超限异常

## 5. `performance-module`

至少考虑：

- `performance.now`
- `performance.timeOrigin`
- `performance.timing` 全时序字段一致性基线（严格保证各时间戳单调递增）：
  `navigationStart` <= `redirectStart` <= `redirectEnd` <= `fetchStart` <= `domainLookupStart` <= `domainLookupEnd` <= `connectStart` <= `connectEnd` <= `requestStart` <= `responseStart` <= `responseEnd` <= `domLoading` <= `domInteractive` <= `domContentLoadedEventStart` <= `domContentLoadedEventEnd` <= `domComplete` <= `loadEventStart` <= `loadEventEnd`
- 字段时间顺序一致性

## 6. `location-href-reactive-module` (Location 动态联动解析)

许多 WAF 挑战（如 521、acw）或重定向逻辑会通过写入 `location.href = '...'` 来触发跳转。如果补环境中的 `location` 只是一个死对象，会导致后续基于 `location.search/pathname/origin` 的计算全部失效。

完备的响应式 `location.href` Setter 实现范式（源自 v_jstools 实践）：
```javascript
function hookLocationHref(locationObj, initialUrl) {
  const urlRegex = /([^:]+:)\/\/([^/:?#]+):?(\d+)?([^?#]*)?(\?[^#]*)?(#.*)?/;

  function parseAndUpdate(href) {
    href = String(href).trim();
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      if (href.startsWith('//')) {
        href = (locationObj.protocol || 'https:') + href;
      } else {
        const base = (locationObj.protocol || 'https:') + '//' + (locationObj.host || 'localhost');
        href = base + (href.startsWith('/') ? href : '/' + href);
      }
    }
    const match = href.match(urlRegex);
    if (match) {
      locationObj.protocol = match[1] || 'https:';
      locationObj.hostname = match[2] || '';
      locationObj.port = match[3] || '';
      locationObj.pathname = match[4] || '/';
      locationObj.search = match[5] || '';
      locationObj.hash = match[6] || '';
      locationObj.host = locationObj.hostname + (locationObj.port ? ':' + locationObj.port : '');
      locationObj.origin = locationObj.protocol + '//' + locationObj.host;
    }
  }

  Object.defineProperty(locationObj, 'href', {
    configurable: true,
    enumerable: true,
    get() {
      if (!this.protocol && !this.hostname) return '';
      return this.protocol + '//' + this.hostname + (this.port ? ':' + this.port : '') + (this.pathname || '/') + (this.search || '') + (this.hash || '');
    },
    set(newHref) {
      parseAndUpdate(newHref);
    },
  });

  if (initialUrl) parseAndUpdate(initialUrl);
}
```

## 7. `dom-token-list-module` (DOMTokenList / classList 规范)

风控脚本常读取元素 `el.classList.contains('active')` 或执行 `el.classList.add(...)`。缺失原型方法会导致环境被指纹探测打标。

必须实现的规范接口集：
- `DOMTokenList.prototype.add(...tokens)`
- `DOMTokenList.prototype.remove(...tokens)`
- `DOMTokenList.prototype.contains(token)`
- `DOMTokenList.prototype.toggle(token, force)`
- `DOMTokenList.prototype.item(index)`
- `DOMTokenList.prototype.supports(token)`
- `DOMTokenList.prototype.forEach` / `keys` / `entries`
- `length` 属性与属性索引器访问

## 8. `synthetic-event-trajectory` (拟人化事件与轨迹发生器)

滑块与点选验证码常在环境检测中校验 `MouseEvent`、`PointerEvent`、`TouchEvent` 上的内部属性（如 `isTrusted`、`sourceCapabilities.firesTouchEvents` 以及时间戳间距）。

贝塞尔拟人化轨迹合成核心算法（用于生成 x, y, timestamp 序列）：
```javascript
function generateBezierTrajectory(x1, y1, x2, y2, totalPoints = 30) {
  const points = [];
  // 构造二阶或三阶随机控制点
  const cx1 = x1 + (x2 - x1) * 0.25 + (Math.random() * 20 - 10);
  const cy1 = y1 + (y2 - y1) * 0.25 + (Math.random() * 20 - 10);
  let now = Date.now();

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / totalPoints;
    const x = Math.round((1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx1 + t * t * x2);
    const y = Math.round((1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy1 + t * t * y2);
    now += Math.floor(Math.random() * 15 + 10); // 10~25ms 拟人化时间间隔
    points.push({ x, y, time: now });
  }
  return points;
}
```

## 9. `webrtc-module`

至少考虑：

- `RTCPeerConnection`
- `RTCRtpSender`
- `RTCRtpReceiver`
- `createDataChannel`
- `createOffer`
- `onicecandidate`

## 10. `audio-fingerprint-module`

至少考虑：

- `AudioContext`
- `OfflineAudioContext`
- `AudioBuffer`
- `getChannelData`

## 11. `worker-module`

至少考虑：

- `Worker`
- `SharedWorker`
- `MessagePort`
- `postMessage`
- `onmessage`

## 12. `math-precision-module`

如果用户遇到 wasm、验证码或国外风控，额外警惕：

- 精度差异
- 浏览器 / Node 数值结果不一致

这类问题不是简单补对象能解决的。
