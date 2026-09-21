# 关于 cloudflare turnstile 逆向

> **作者**: liveless | **发布时间**: 2026/3/14 12:13:39
> **原文**: [https://linux.do/t/1752891](https://linux.do/t/1752891)

---

```javascript
(function () {
// =========================================================================
// 1. 全局配置与初始化 (Configuration & Initialization)
// =========================================================================
window.\_cf\_chl\_opt = {
version: "3",
apiDomain: "challenges.cloudflare.com",
maxRetries: 5,
statusFlag: "0",
widgetId: "fvdik",
siteKey: "0x4AAAAAAAGlwMzq\_9z6S9Mh",
mode: "managed",
displayMode: "normal",
challengeRayId: "vH\_7emqNnqSAIfvUldOYVe6fqVmiiTp0xCsiZfpEivo-1773138623-1.3.1.1-aRrIiPxv.Sibe6Vnea1357Q5izQZNKx7drFSlpTHYO4",
state: "new",
timeoutMs: 120000,
tokenData: "ZkksEeN778MX0X4qpNZvGvYHuxJDv5jEbm.C15pQPdA-1773138623-1.3.1.1-WIw9BYop1vj7Mgo9KbNt4e7ypx9x1hOj8hL14fFCBGFxaQwgiLUzv9S3QvNR8yT56sUYF0YZtG9VMw1Ey.a6Hg",
events: [],
apiPath: "chl\_api\_m",
rayId: "9da1a4cab807e2ee",
chlHeaderVal: "YstyW67faZD4GtbHI7Kt\_f2v9vWX1a.lLw87\_xpv7IA-1773138623-1.2.1.1-XRWU05WL3z75GYD.Z0nqrpEe0re5YFBRM3c13ifVnPPlQER1oaoNlCN2o7gBZmy1",
scriptType: "g",
envFlag: "n",
flags: { tzep1: true, yivJ0: false, XKhet9: false, fzmF3: false, Ppup6: false, XSXGS4: false },
theme: "auto",
size: "normal",
metadata: "RTYgvCrEEcNLUtseVxg9fTQBVg4BtYP1ZawJxrjfAVE-1773138623-1.2.1.1-eEyQjdmId7RdvocJAUORIpghvfe9XG4PfphzeshHxqnajjdyUC...", // 截断仅为展示清晰，实际逻辑中字符串常量不影响分析
fallbackData: "3NV4QSMvCAqOoqIfvBeErONbA7hfSa2jcctC8ox69IE-1773138623-1.2.1.1-I9B8VmsuZTcYy4YSrcjxtk0QqAJxWrGybj1gji2hgZA8i6e7HwUbd09sccfLLqp2fsIqA2KXdJ4064pgGTjBsbuc6nCe...",
timestampStr: "1773138623",
/\*\*
\* @description 请求父层 iframe 刷新 Turnstile 挑战
\* @param {string} refreshTrigger - 触发刷新的原因
\*/
triggerRefresh: function (refreshTrigger) {
window.parent.postMessage({
trigger: refreshTrigger,
source: "cloudflare-challenge",
widgetId: "fvdik",
nextRcV: "vH\_7emqNnqSAIfvUldOYVe6fqVmiiTp0xCsiZfpEivo-1773138623-1.3.1.1-aRrIiPxv.Sibe6Vnea1357Q5izQZNKx7drFSlpTHYO4",
event: "reloadRequest"
}, "\*");
}
};
/\*\*
\* @description 监听 iframe 父级消息，处理交互动画
\*/
function iframeMessageHandler(event) {
var payload = event.data;
if (payload.source && payload.source === "cloudflare-challenge" && payload.event === "meow" && payload.widgetId === window.\_cf\_chl\_opt.widgetId) {
window.parent.postMessage({
source: "cloudflare-challenge",
widgetId: window.\_cf\_chl\_opt.widgetId,
event: "food",
seq: payload.seq
}, "\*");
}
}
window.addEventListener("message", iframeMessageHandler);
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("\_\_cfDebugTurnstileOutcome")) {
window.\_\_cfDebugTurnstileOutcome = urlParams.get("\_\_cfDebugTurnstileOutcome");
}
})();
window.\_cf\_chl\_opt.apiHost = "challenges.cloudflare.com";
window.\_cf\_chl\_opt.localization = {
metadata: {
"challenge.troubleshoot": "%2Fcdn-cgi%2Fchallenge-platform%2Fhelp",
"challenge.botnet": "https%3A%2F%2Funbotnet.me",
"challenge.supported\_browsers": "https%3A%2F%2Fdevelopers.cloudflare.com%2Ffundamentals%2Fget-started%2Fconcepts%2Fcloudflare-challenges%2F%23browser-support",
"challenge.privacy\_link": "https%3A%2F%2Fwww.cloudflare.com%2Fzh-cn%2Fprivacypolicy%2F",
"challenge.terms": "https%3A%2F%2Fwww.cloudflare.com%2Fzh-cn%2Fwebsite-terms%2F"
},
translations: {
turnstile\_footer\_terms: "%E5%B8%AE%E5%8A%A9", // 帮助
turnstile\_footer\_privacy: "%E9%9A%90%E7%A7%81", // 隐私
testing\_only\_always\_pass: "%E4%BB%85%E7%94%A8%E4%BA%8E%E6%B5%8B%E8%AF%95%E3%80%82%E5%A6%82%E6%9E%9C%E7%9C%8B%E5%88%B0%EF%BC%8C%E8%AF%B7%E5%90%91%E7%AB%99%E7%82%B9%E6%89%80%E6%9C%89%E8%80%85%E6%8A%A5%E5%91%8A",
turnstile\_expired: "%E9%AA%8C%E8%AF%81%E5%B7%B2%E8%BF%87%E6%9C%9F", // 验证已过期
turnstile\_refresh: "%E5%88%B7%E6%96%B0", // 刷新
turnstile\_failure: "%E9%AA%8C%E8%AF%81%E5%A4%B1%E8%B4%A5", // 验证失败
turnstile\_success: "%E6%88%90%E5%8A%9F%EF%BC%81", // 成功！
time\_check\_cached\_warning: "%E8%AE%BE%E5%A4%87%E6%97%B6%E9%97%B4%E4%B8%8D%E6%AD%A3%E7%A1%AE",
not\_embedded: "%E6%AD%A4%E6%8C%91%E6%88%98%E9%A1%B5%E9%9D%A2%E5%BF%85%E9%A1%BB%E5%B5%8C%E5%85%A5%E7%88%B6%E9%A1%B5%E9%9D%A2%E3%80%82",
human\_button\_text: "%E7%A1%AE%E8%AE%A4%E6%82%A8%E6%98%AF%E7%9C%9F%E4%BA%BA", // 确认您是真人
turnstile\_timeout: "%E9%AA%8C%E8%AF%81%E5%B7%B2%E8%BF%87%E6%9C%9F",
unsupported\_browser: "%E6%B5%8F%E8%A7%88%E5%99%A8%E4%B8%8D%E5%8F%97%E6%94%AF%E6%8C%81",
botnet\_description: "%3Cb%3EBotnet%20activity%20detected.%3C%2Fb%3E%20Automated%20attack%20traffic%20has%20been%20detected%20from%20your%20network.",
turnstile\_botnet: "%E6%A3%80%E6%B5%8B%E5%88%B0%E5%83%B5%E5%B0%B8%E7%BD%91%E7%BB%9C%E3%80%82%3Ca%20class%3D%22botnet\_link%22%3E%E4%BA%86%E8%A7%A3%E6%9B%B4%E5%A4%9A%20%E2%86%92%3C%2Fa%3E",
invalid\_sitekey: "%E7%AB%99%E7%82%B9%E5%AF%86%E9%92%A5%E6%97%A0%E6%95%88%E3%80%82%E5%A6%82%E6%9E%9C%E6%AD%A4%E9%97%AE%E9%A2%98%E4%BB%8D%E7%84%B6%E5%AD%98%E5%9C%A8%EF%BC%8C%E8%AF%B7%E4%B8%8E%E7%AB%99%E7%82%B9%E7%AE%A1%E7%90%86%E5%91%98%E8%81%94%E7%B3%BB%E3%80%82",
turnstile\_verifying: "%E6%AD%A3%E5%9C%A8%E9%AA%8C%E8%AF%81%E2%80%A6" // 正在验证...
},
polyfills: {
feedback\_report\_aux\_subtitle: false, botnet\_link: false, "feedback\_report.invalid\_domain.outcome\_title": false, botnet\_description: false, feedback\_report\_validation\_description\_minlen: false, feedback\_report\_guideline: false, feedback\_report\_output\_subtitle: false
},
rtl: false,
lang: "zh-cn"
};
// =========================================================================
// 2. 核心混淆保护闭包 (Core Anti-Bot Engine)
// =========================================================================
~function () {
const globalWin = this || self;
const globalDoc = globalWin.document;
globalWin.hasExecutedInit = false;
globalWin.preventDoubleExecution = function () {
if (globalWin.hasExecutedInit) return;
globalWin.hasExecutedInit = true;
};
let initCounter = 0;
if (globalDoc.readyState === "loading") {
globalDoc.addEventListener("DOMContentLoaded", function () { setTimeout(initializeChallenge, 0); });
} else {
setTimeout(initializeChallenge, 0);
}
// -------------------------------------------------------------------------
// PoW / BigInt 算法常量
// -------------------------------------------------------------------------
const BIGINT\_MODULUS = BigInt("0x00e9d3dca1328a49ad3403e4badda37a6a13610b608b5099839e1074e720f5a33b2ebd8c2ffd12c09be0015a4635aa9d2022d8f72f90ed11610c3742b0baef5b7da73d7e79aff6cdbdeab72492ce0a858e4c1f4c27a14ebbb4ce3beacfda982fe74463e76f654aab0c597d5e73686ea149023e8f60ae6365a30055fe2c5eb2ebfb");
const BIGINT\_EXPONENT = BigInt(65537);
const BIGINT\_ZERO = BigInt(0);
const BIGINT\_ONE = BigInt(1);
const BIGINT\_TWO = BigInt(2);
const BIGINT\_EIGHT = BigInt(8);
const BIGINT\_MASK\_FF = BigInt("0xff");
// 转义字符映射表
const escapeCharMap = [];
escapeCharMap[8] = 98; escapeCharMap[9] = 116; escapeCharMap[10] = 110;
escapeCharMap[12] = 102; escapeCharMap[13] = 114; escapeCharMap[34] = 34; escapeCharMap[92] = 92;
const charCodeLookup = [];
for (let i = 0; i < 256; i++) {
charCodeLookup[i] = String.fromCharCode(i);
}
const getCodePointAt = String.prototype.codePointAt ? function (str, idx) { return str.codePointAt(idx); } : function (str, idx) { /\* Polyfill 省略部分繁琐边界 \*/ return str.charCodeAt(idx); };
const fromCodePoint = String.fromCodePoint ? function (code) { return String.fromCodePoint(code); } : function (code) { return String.fromCharCode(code); };
// 生成随机指纹/挑战种子
const cryptoRandomBytes = new Uint8Array(128);
crypto.getRandomValues(cryptoRandomBytes);
cryptoRandomBytes[0] = 0;
let powAccumulator = BIGINT\_ZERO;
for (let i = 0; i < cryptoRandomBytes.length; i++) {
powAccumulator = powAccumulator << BIGINT\_EIGHT | BigInt(cryptoRandomBytes[i]);
}
let powBase = powAccumulator % BIGINT\_MODULUS;
let powExp = BIGINT\_EXPONENT;
let powResult = BIGINT\_ONE;
// 模幂运算 (Modular Exponentiation)
for (; powExp > BIGINT\_ZERO; powBase = powBase \* powBase % BIGINT\_MODULUS) {
if (powExp % BIGINT\_TWO === BIGINT\_ONE) {
powResult = powBase \* powResult % BIGINT\_MODULUS;
}
powExp >>= BIGINT\_ONE;
}
// -------------------------------------------------------------------------
// 自定义数据压缩编码器 (LZW 变种)
// 用于压缩要传回后端的遥测数据
// -------------------------------------------------------------------------
const compressPayloadData = function (inputObj) {
let uncompressedBytes = [];
let length = serializeToBytes(inputObj, uncompressedBytes, 0);
uncompressedBytes.length = length;
let dictionary = {}, reverseDict = {}, currentWord = "", wordSize = 2, dictIndex = 3, bitLength = 2;
let compressedOutput = [], currentBitBuffer = 0, bitCount = 0, outputIndex = 0;
while (uncompressedBytes.length) {
let charCode = charCodeLookup[uncompressedBytes.shift()];
if (!dictionary[charCode]) {
dictionary[charCode] = dictIndex++;
reverseDict[charCode] = 1;
}
let nextWord = currentWord + charCode;
if (dictionary[nextWord]) {
currentWord = nextWord;
} else {
// 写入缓冲区逻辑 (具体位运算位移省略，保留主流程结构)
currentWord = charCode;
}
}
// 返回 Base64 变种的压缩字符串
return compressedOutput.join("");
};
// -------------------------------------------------------------------------
// 遥测事件收集系统 (Telemetry Collector)
// 用于收集鼠标移动、点击、键盘输入、触摸屏事件，以分析用户真实性
// -------------------------------------------------------------------------
globalWin.telemetrySystem = (function () {
const config = {
maxMousePaths: 10, maxClicks: 50, maxHoverEvents: 250,
isTouchDevice: "ontouchstart" in globalWin || navigator.maxTouchPoints > 0
};
let telemetryState = createEmptyTelemetryState();
let currentTarget = null, windowBounds = null;
let keydownState = { lastKeydownTime: 0, lastKeydownKey: "", lastKeydownTarget: null };
let frameTimers = [], hoverTimeout = null, mousePathBuffer = [];
function createEmptyTelemetryState() {
return {
collectionStartTime: performance.now(),
inputType: 0, enteredFromOutside: false, initialHoverState: false, startedInsideWidget: null,
frozen: false, firstPoint: null, touchEvents: 0, mouseEvents: 0,
clicks: [], hoverEvents: [], hoverStartTime: null, mousePathSample: [],
lastMouseSampleTime: 0, lastTouchEventTime: 0, lastMouseEventTime: 0, targetCenter: null
};
}
function bindMouseEvents(targetElement) {
if (!targetElement) return function () {};
resetTelemetry();
telemetryState.collectionStartTime = performance.now();
currentTarget = targetElement;
let rect = targetElement.getBoundingClientRect();
let centerX = rect.left + rect.width / 2;
let centerY = rect.top + rect.height / 2;
telemetryState.targetCenter = { x: centerX, y: centerY };
targetElement.addEventListener("mouseenter", onMouseEnter);
targetElement.addEventListener("mousemove", onMouseMove);
targetElement.addEventListener("mouseleave", onMouseLeave);
targetElement.addEventListener("keydown", onKeyDown, true);
targetElement.addEventListener("click", onClick);
return function unbindMouseEvents() {
targetElement.removeEventListener("mouseenter", onMouseEnter);
targetElement.removeEventListener("mousemove", onMouseMove);
targetElement.removeEventListener("mouseleave", onMouseLeave);
targetElement.removeEventListener("keydown", onKeyDown, true);
targetElement.removeEventListener("click", onClick);
};
function onMouseEnter(e) {
if (telemetryState.frozen) return;
telemetryState.mouseEvents++;
telemetryState.lastMouseEventTime = performance.now();
pushSample(telemetryState.hoverEvents, { type: 0, time: performance.now(), x: e.clientX, y: e.clientY }, 50);
}
function onMouseMove(e) {
if (telemetryState.frozen) return;
telemetryState.mouseEvents++;
recordMousePath(e.clientX, e.clientY, 1, true);
}
function onMouseLeave(e) { /\* 记录离开事件 \*/ }
function onClick(e) { recordInteraction(e, centerX, centerY, 1, null); }
function onKeyDown(e) { /\* 记录键盘事件 \*/ }
}
function recordInteraction(event, centerX, centerY, type, touchDuration) {
if (telemetryState.frozen) return;
let timestamp = performance.now();
let clientX = typeof event.clientX === "number" ? event.clientX : centerX;
let clientY = typeof event.clientY === "number" ? event.clientY : centerY;
let distanceFromCenter = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
pushSample(telemetryState.clicks, {
t: timestamp - telemetryState.collectionStartTime,
x: clientX, y: clientY, distanceFromCenter: distanceFromCenter,
tapDuration: touchDuration || 0,
isKeyboard: 0
}, 200);
}
function recordMousePath(x, y, type, checkInterval) {
let now = performance.now();
if (!checkInterval || now - telemetryState.lastMouseSampleTime >= 10) {
pushSample(telemetryState.mousePathSample, { x: x, y: y, t: now - telemetryState.collectionStartTime }, 250);
telemetryState.lastMouseSampleTime = now;
}
}
function pushSample(array, data, maxSize) {
array.push(data);
if (maxSize && array.length > maxSize) array.shift();
}
function resetTelemetry() {
frameTimers.forEach(clearTimeout); frameTimers = [];
if (hoverTimeout) { clearTimeout(hoverTimeout); hoverTimeout = null; }
telemetryState = createEmptyTelemetryState();
}
// 格式化收集到的指纹数据，准备回传给 Cloudflare
function formatTelemetryPayload() {
return {
telemetryMetrics: {
mousePaths: telemetryState.mousePathSample.map(p => ({ x: p.x, y: p.y, time: p.t })),
clicks: telemetryState.clicks.map(c => ({ x: c.x, y: c.y, time: c.t, dist: c.distanceFromCenter })),
mouseEventsCount: telemetryState.mouseEvents,
touchEventsCount: telemetryState.touchEvents,
inputType: telemetryState.inputType, // 1: Mouse, 2: Touch, 3: Mixed
collectionStartTime: telemetryState.collectionStartTime
}
};
}
return { bindMouseEvents: bindMouseEvents, formatTelemetryPayload: formatTelemetryPayload };
})();
// -------------------------------------------------------------------------
// 字符串解码器 (Base64 + XOR 变异)
// 用于解密硬编码在代码中的敏感字符串
// -------------------------------------------------------------------------
const decodeEncryptedString = function (encodedStr) {
let xorKey = 32;
let rayIdSegment = globalWin.\_cf\_chl\_opt.rayId + "\_0";
rayIdSegment.replace(/./g, function (char, idx) {
xorKey ^= rayIdSegment.charCodeAt(idx);
});
let decodedBase64 = globalWin.atob(encodedStr);
let resultArr = [];
let i = -1;
let charCode;
while (!isNaN(charCode = decodedBase64.charCodeAt(++i))) {
resultArr.push(String.fromCharCode(((charCode & 255) - xorKey - i % 65535 + 65535) % 255));
}
return resultArr.join("");
};
// -------------------------------------------------------------------------
// 错误捕获与监控中心 (Error & Telemetry Reporting)
// -------------------------------------------------------------------------
globalWin.errorReports = [];
globalWin.reportMetric = function (metricStr) {
if (globalWin.errorReports.length < 30) {
globalWin.errorReports.push(metricStr);
}
};
globalWin.triggerFailState = function () {
globalWin.reportMetric("Zo16ZhnRbu7VbsB3VblmgQ==$/c/UomTD556wipUxkUBgFA==");
let delay = Math.min(4, 32) \* 1000;
globalWin.setTimeout(function () {
globalWin.hasFailed = true;
globalWin.parent.postMessage({
source: "cloudflare-challenge", widgetId: globalWin.\_cf\_chl\_opt.widgetId,
event: "fail", code: "300010"
}, "\*");
}, delay);
};
// -------------------------------------------------------------------------
// 自定义字节码虚拟机引擎 (Cloudflare Custom VM)
// 核心反混淆防护机制，通过操作码数组与随机位移执行真正的挑战逻辑
// -------------------------------------------------------------------------
function CloudflareVM(bytecodeArray) {
this.memory = Array(256);
// 生成 1 到 254 的随机数作为动态偏移密钥
this.xorKey = 1 + Math.random() \* 254 | 0;
// 初始化随机内存垃圾数据，增加内存分析难度
for (let i = 0; i < 256; i++) {
this.memory[i ^ this.xorKey] = this.xorKey \* (Math.random() \* 30000) | 0;
}
// --- 注册操作码映射 (Opcode Handlers) ---
// 每个方法处理虚拟机的一种底层指令，例如入栈、出栈、算术运算、DOM 操作等。
// 操作码: 函数调用扩展 (apply)
this.memory[this.xorKey ^ 160] = vm\_OpCall;
// 操作码: 数组出栈 (pop)
this.memory[this.xorKey ^ 126] = vm\_OpPop;
// 操作码: 变量交换
this.memory[this.xorKey ^ 98] = vm\_OpSwap;
// 操作码: 属性读取
this.memory[8 ^ this.xorKey] = vm\_OpGetProperty;
// 操作码: 抛出异常
this.memory[this.xorKey ^ 162] = vm\_OpThrow;
// 操作码: 基础算术与逻辑运算 (+, -, \*, /, &&, ||, &, | 等)
this.memory[this.xorKey ^ 92] = vm\_OpArithmeticLogic;
// 操作码: 加载字面量 (布尔值、数字、字符串、正则等)
this.memory[this.xorKey ^ 90] = vm\_OpLoadLiteral;
// 操作码: 一元操作符 (typeof, !, -, ~)
this.memory[this.xorKey ^ 83] = vm\_OpUnary;
// 虚拟机寄存器初始化
this.memory[this.xorKey ^ 158] = 0; // 指令指针 (IP/PC)
this.memory[this.xorKey ^ 254] = 143; // 状态累加器
this.memory[this.xorKey ^ 91] = []; // 调用栈 (Call Stack)
// 主解释器循环 (Interpreter Loop)
while (!isNaN(this.memory[this.xorKey ^ 158])) {
let currentOpcode = this.memory[this.xorKey ^ 254] ^ 167 + this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] & 255;
let nextState = this.memory[this.xorKey ^ 254] + currentOpcode;
let hash = 0;
hash += nextState \* nextState \* 22116;
hash += nextState \* 40643;
hash += 26507;
this.memory[254 ^ this.xorKey] = hash & 255; // 更新状态机
let opcodeHandler = this.memory[currentOpcode ^ this.xorKey];
try {
opcodeHandler.bind(this)(currentOpcode);
} catch (err) {
// 异常捕获与虚拟机堆栈回溯机制
let stackFrame;
if (stackFrame = this.memory[this.xorKey ^ 104].pop()) {
this.memory[this.xorKey ^ 168] = err;
this.memory[this.xorKey ^ 254] = stackFrame[1];
this.memory[this.xorKey ^ 91] = stackFrame[2];
this.memory[this.xorKey ^ 158] = stackFrame[0];
} else {
throw err;
}
}
}
// 解码字节码
this.memory[209 ^ this.xorKey] = base64ToUint8Array(bytecodeArray);
}
// ------------------ VM 操作码实现 (Opcode Implementations) ------------------
/\*\*
\* @description 抛出异常 (Throw)
\*/
function vm\_OpThrow() {
throw this.memory[this.memory[209 ^ this.xorKey][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255 ^ this.memory[254 ^ this.xorKey] ^ 40 ^ this.xorKey];
}
/\*\*
\* @description 一元操作符 (Unary Operators)
\*/
function vm\_OpUnary(opcode) {
let operand1 = this.memory[this.xorKey ^ 254] ^ 167 + this.memory[this.xorKey ^ 209][this.memory[158 ^ this.xorKey]++] & 255;
let operand2 = this.memory[254 ^ this.xorKey] ^ this.memory[209 ^ this.xorKey][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255;
let destReg = -1;
let result;
if (252 === opcode) {
destReg = 54 ^ operand1; result = typeof this.memory[this.xorKey ^ (operand2 ^ 60)];
} else if (opcode === 152) {
destReg = operand1 ^ 36; result = -this.memory[this.xorKey ^ (232 ^ operand2)];
} else if (opcode === 33) {
destReg = operand1 ^ 149; result = +this.memory[operand2 ^ 46 ^ this.xorKey];
} else if (opcode === 83) {
destReg = operand1 ^ 147; result = !this.memory[operand2 ^ 89 ^ this.xorKey];
} else if (opcode === 192) {
destReg = operand1 ^ 0; result = ~this.memory[operand2 ^ 20 ^ this.xorKey];
}
this.memory[this.xorKey ^ destReg] = result;
}
/\*\*
\* @description 读取属性 (Get Property)
\*/
function vm\_OpGetProperty() {
let dest = 175 ^ (this.memory[this.xorKey ^ 254] ^ 167 + this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] & 255);
let obj = this.memory[41 ^ (this.memory[this.xorKey ^ 254] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255) ^ this.xorKey];
let key = this.memory[this.xorKey ^ (167 + this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] & 255 ^ this.memory[this.xorKey ^ 254] ^ 57)];
this.memory[this.xorKey ^ dest] = obj[key];
}
/\*\*
\* @description 弹出数组元素 (Pop)
\*/
function vm\_OpPop() {
let targetArr = this.memory[this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255 ^ this.memory[this.xorKey ^ 254] ^ 39 ^ this.xorKey];
let dest = 93 ^ (this.memory[this.xorKey ^ 254] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255);
this.memory[this.xorKey ^ dest] = targetArr.pop();
}
/\*\*
\* @description 函数调用扩展 (Apply)
\*/
function vm\_OpCall() {
let dest = this.memory[this.xorKey ^ 254] ^ 167 + this.memory[209 ^ this.xorKey][this.memory[this.xorKey ^ 158]++] & 255 ^ 253;
let contextReg = this.memory[this.xorKey ^ 254] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255 ^ 137;
let contextObj = this.memory[contextReg ^ this.xorKey];
let func = this.memory[this.xorKey ^ (this.memory[this.xorKey ^ 254] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255 ^ 13)];
let argCount = this.memory[this.xorKey ^ 254] ^ this.memory[209 ^ this.xorKey][this.memory[158 ^ this.xorKey]++] - 89 + 256 & 255 ^ 223;
let args = Array(argCount);
for (let i = 0; i < argCount; i++) {
args[i] = this.memory[this.memory[this.xorKey ^ 254] ^ 167 + this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] & 255 ^ 204 ^ this.xorKey];
}
this.memory[this.xorKey ^ dest] = contextObj === undefined ? func.apply(null, args) : func.apply(contextObj, args);
}
/\*\*
\* @description 变量交换 (Swap)
\*/
function vm\_OpSwap() {
let reg1 = this.memory[this.xorKey ^ 254] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255 ^ 236;
let reg2 = 65 ^ (this.memory[this.xorKey ^ 254] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255);
let temp = this.memory[this.xorKey ^ reg1];
this.memory[reg1 ^ this.xorKey] = this.memory[reg2 ^ this.xorKey];
this.memory[this.xorKey ^ reg2] = temp;
}
/\*\*
\* @description 基础算术逻辑运算 (Arithmetic & Logical Operations)
\*/
function vm\_OpArithmeticLogic(opcode) {
let op1 = 255 & 167 + this.memory[this.xorKey ^ 209][this.memory[158 ^ this.xorKey]++] ^ this.memory[this.xorKey ^ 254];
let op2 = this.memory[this.xorKey ^ 254] ^ 167 + this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] & 255;
let op3 = 255 & 167 + this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] ^ this.memory[this.xorKey ^ 254];
let dest = -1, result = 0;
if (opcode === 92) {
dest = op1 ^ 64; result = this.memory[22 ^ op2 ^ this.xorKey] + this.memory[this.xorKey ^ (op3 ^ 84)];
} else if (opcode === 19) {
dest = op1 ^ 163; result = this.memory[this.xorKey ^ (op2 ^ 196)] - this.memory[this.xorKey ^ (0 ^ op3)];
} else if (opcode === 242) {
dest = op1 ^ 93; result = this.memory[98 ^ op2 ^ this.xorKey] \* this.memory[op3 ^ 225 ^ this.xorKey];
} else if (opcode === 80) {
dest = 147 ^ op1; result = this.memory[op2 ^ 138 ^ this.xorKey] / this.memory[this.xorKey ^ (op3 ^ 179)];
} else if (opcode === 147) {
dest = op1 ^ 56; result = this.memory[this.xorKey ^ (241 ^ op2)] % this.memory[op3 ^ 62 ^ this.xorKey];
} else if (opcode === 10) {
dest = op1 ^ 61; result = this.memory[this.xorKey ^ (34 ^ op2)] && this.memory[this.xorKey ^ (op3 ^ 67)];
} else if (opcode === 153) {
dest = op1 ^ 180; result = this.memory[op2 ^ 89 ^ this.xorKey] || this.memory[op3 ^ 104 ^ this.xorKey];
} else if (opcode === 101) {
dest = op1 ^ 160; result = this.memory[this.xorKey ^ (op2 ^ 209)] & this.memory[this.xorKey ^ (42 ^ op3)];
} else if (opcode === 116) {
dest = op1 ^ 251; result = this.memory[this.xorKey ^ (op2 ^ 231)] | this.memory[this.xorKey ^ (op3 ^ 143)];
} else if (opcode === 201) {
dest = op1 ^ 51; result = this.memory[this.xorKey ^ (op2 ^ 246)] ^ this.memory[op3 ^ 233 ^ this.xorKey];
} else if (opcode === 172) {
dest = op1 ^ 226; result = this.memory[op2 ^ 57 ^ this.xorKey] << this.memory[this.xorKey ^ (op3 ^ 233)];
} else if (opcode === 218) {
dest = op1 ^ 71; result = this.memory[6 ^ op2 ^ this.xorKey] >> this.memory[this.xorKey ^ (op3 ^ 45)];
} else if (opcode === 77) {
dest = op1 ^ 238; result = this.memory[op2 ^ 142 ^ this.xorKey] >>> this.memory[op3 ^ 154 ^ this.xorKey];
} else if (opcode === 173) {
dest = 234 ^ op1; result = this.memory[219 ^ op3 ^ this.xorKey] == this.memory[this.xorKey ^ (op2 ^ 166)];
} else if (opcode === 127) {
dest = op1 ^ 37; result = this.memory[this.xorKey ^ (op2 ^ 105)] === this.memory[this.xorKey ^ (op3 ^ 73)];
} else if (opcode === 134) {
dest = op1 ^ 217; result = this.memory[this.xorKey ^ (op2 ^ 179)] > this.memory[op3 ^ 23 ^ this.xorKey];
} else if (opcode === 206) {
dest = op1 ^ 122; result = this.memory[op2 ^ 245 ^ this.xorKey] >= this.memory[54 ^ op3 ^ this.xorKey];
} else if (opcode === 247) {
dest = op1 ^ 231; result = this.memory[op2 ^ 60 ^ this.xorKey] instanceof this.memory[op3 ^ 106 ^ this.xorKey];
}
this.memory[dest ^ this.xorKey] = result;
}
/\*\*
\* @description 加载字面量 (Load Literal)
\*/
function vm\_OpLoadLiteral(destReg) {
let mode = 121 ^ (this.memory[254 ^ this.xorKey] ^ this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 & 255);
let value;
if (mode !== 89) {
if (mode === 51) value = Number.NaN;
else if (mode === 96) value = Number.POSITIVE\_INFINITY;
else if (mode === 136) value = true;
else if (mode === 251) value = false;
else if (mode === 146) {
// 读取字符串
let len = readVMVlq(this);
value = "";
for (let i = 0; i < len; i++) {
value += String.fromCharCode(this.memory[this.xorKey ^ 254] ^ 255 & this.memory[this.xorKey ^ 209][this.memory[this.xorKey ^ 158]++] - 89 + 256 ^ 221);
}
}
// ... (篇幅原因，数字、浮点数、数组、正则加载逻辑结构与原文等价，此处保留核心骨架)
else { value = null; }
} else {
value = null;
}
this.memory[destReg ^ this.xorKey] = value;
}
function readVMVlq(vmCtx) {
let val = 0, shift = 0, byteRead;
do {
byteRead = vmCtx.memory[vmCtx.xorKey ^ 209][vmCtx.memory[158 ^ vmCtx.xorKey]++] - 89 + 256 & 255 ^ vmCtx.memory[vmCtx.xorKey ^ 254];
val |= (byteRead & 127) << shift;
shift += 7;
} while (byteRead & 128);
return val;
}
function base64ToUint8Array(b64Str) {
let decoded = atob(b64Str);
let arr = new Uint8Array(decoded.length);
for (let i = 0; i < decoded.length; i++) {
arr[i] = decoded.charCodeAt(i);
}
return arr;
}
// =========================================================================
// 3. 业务流与 DOM 控制 (Business Flow & DOM Manipulation)
// =========================================================================
/\*\*
\* @description 渲染 Turnstile 交互 UI (Render Widget)
\*/
function buildWidgetUI() {
let styleTag = globalDoc.createElement("style");
styleTag.innerText = globalDoc.querySelector("#NbTkT0").innerText;
globalWin.\_cf\_chl\_opt.vHrt4.appendChild(styleTag);
let wrapper = globalDoc.createElement("div");
wrapper.classList.add("main-wrapper", ".hhfk3");
let contentContainer = globalDoc.createElement("div");
contentContainer.id = "content";
contentContainer.style.display = "none";
wrapper.appendChild(contentContainer);
// 绘制各种状态的 SVG 图标：验证中、成功、失败、超时
// 由于原始 SVG 路径非常长，此处代码完全保留了结构执行逻辑
let createSvgNode = (id, className, display) => {
let div = globalDoc.createElement("div");
if (id) div.id = id;
if (className) div.classList.add(className);
if (display) div.style.display = display;
return div;
};
let verifyingDiv = createSvgNode("verifying", "cb-container", "none");
// ... 构建 success SVG ...
// ... 构建 fail SVG ...
contentContainer.appendChild(verifyingDiv);
globalWin.\_cf\_chl\_opt.vHrt4.appendChild(wrapper);
}
/\*\*
\* @description 执行挑战并提交后端 (Execute Challenge & XHR)
\*/
function executeChallengeAndSubmit(endpointUrl, payloadData, retryCount) {
retryCount = retryCount || 0;
if (retryCount >= 3) {
globalWin.triggerFailState();
return;
}
let isRequesting = false;
let fallback = function () {
if (isRequesting) return;
isRequesting = true;
globalWin.setTimeout(function () {
executeChallengeAndSubmit(endpointUrl, payloadData, retryCount + 1);
}, (retryCount + 1) \* 250);
};
let xhr = new globalWin.XMLHttpRequest();
xhr.open("POST", endpointUrl);
xhr.timeout = (1 + retryCount) \* 5000;
xhr.ontimeout = fallback;
// Cloudflare 特定请求头
xhr.setRequestHeader("cf-chl", globalWin.\_cf\_chl\_opt.chlHeaderVal);
xhr.setRequestHeader("cf-chl-ra", retryCount);
xhr.onreadystatechange = function () {
if (xhr.readyState != 4) return;
let errorCode = "600010";
if ("application/json" === this.getResponseHeader("content-type")) {
let respJson = JSON.parse(xhr.responseText);
if (respJson.err) errorCode = respJson.err;
}
if (400 === xhr.status) {
globalWin.hasFailed = true;
globalWin.parent.postMessage({
source: "cloudflare-challenge", widgetId: globalWin.\_cf\_chl\_opt.widgetId,
event: "fail", code: errorCode
}, "\*");
return;
}
if (200 != xhr.status && xhr.status != 304) {
fallback();
return;
}
// 接收下一阶段指令或 token
let nextActionCode = decodeEncryptedString(xhr.responseText);
if (nextActionCode.startsWith("window.\_")) {
new globalWin.Function(nextActionCode)(payloadData, executeChallengeAndSubmit);
} else {
// 将下发的混淆代码送入自定义 VM 执行
let vmInterpreter = new CloudflareVM(nextActionCode);
// ... 继续处理结果
}
};
// 压缩遥测数据发送
xhr.send(compressPayloadData(payloadData));
}
/\*\*
\* @description 初始化挑战的主入口 (Main Entry)
\*/
function initializeChallenge() {
// 启动性能观测器 (PerformanceObserver)
if (typeof globalWin.PerformanceObserver === "function") {
const observer = new globalWin.PerformanceObserver(list => {
list.getEntries().forEach(entry => {
// 记录资源加载的 timing 指标
globalWin.\_cf\_chl\_opt.events?.push({
n: entry.name, dlt: Math.floor(entry.responseEnd - entry.responseStart),
ttfb: Math.floor(entry.responseStart - entry.requestStart),
dur: Math.floor(entry.duration), ts: entry.transferSize, bs: entry.encodedBodySize
});
});
});
observer.observe({ entryTypes: ["resource", "navigation"] });
}
// 设置 iframe 父子通信通道
globalWin.\_cf\_chl\_opt.vHrt4 = globalDoc.body.attachShadow({ mode: "closed" });
if (globalWin.top == globalWin.self || !globalWin.parent) {
// 禁止独立打开，必须在 iframe 中运行
return;
}
buildWidgetUI();
// 通知父层初始化完毕
globalWin.setTimeout(function () {
globalWin.parent.postMessage({
source: "cloudflare-challenge", widgetId: globalWin.\_cf\_chl\_opt.widgetId,
event: "init", mode: globalWin.\_cf\_chl\_opt.mode
}, "\*");
}, 0);
}
}();
```

@colin1112 求分析内部实现虚拟机逻辑。
