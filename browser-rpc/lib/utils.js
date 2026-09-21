/**
 * 工具函数库
 * 使用 IIFE 包裹以防止重复注入时声明冲突
 */

(function () {
  'use strict';

  // 防止重复注入
  if (typeof window !== 'undefined' && window.__crawler_utils_loaded) {
    return;
  }

/**
 * 从 URL 提取用户 ID
 * @param {string} url
 * @returns {string|null}
 */
function extractUserIdFromUrl(url) {
  const match = url.match(/\/user\/profile\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * 格式化文件大小
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * 验证是否为有效的 URL
 * @param {string} url
 * @param {string} domain
 * @returns {boolean}
 */
function isValidUrl(url, domain) {
  return url ? url.includes(domain) : false;
}

/**
 * MD5 哈希函数
 * @param {string} string
 * @returns {string}
 */
function MD5(string) {
  function RotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x80000000;
    const lY4 = lY & 0x80000000;
    const lX8 = lX & 0x40000000;
    const lY8 = lY & 0x40000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX8 & lY8) {
      return lResult ^ 0x80000000 ^ lX4 ^ lY4;
    }
    if (lX8 | lY8) {
      if (lResult & 0x40000000) {
        return lResult ^ 0xC0000000 ^ lX4 ^ lY4;
      } else {
        return lResult ^ 0x40000000 ^ lX4 ^ lY4;
      }
    } else {
      return lResult ^ lX4 ^ lY4;
    }
  }

  function F(x, y, z) {
    return (x & y) | ((~x) & z);
  }
  function G(x, y, z) {
    return (x & z) | (y & (~z));
  }
  function H(x, y, z) {
    return (x ^ y ^ z);
  }
  function I(x, y, z) {
    return (y ^ (x | (~z)));
  }

  function FF(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function GG(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function HH(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function II(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function ConvertToWordArray(str) {
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = new Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;

    while (lByteCount < lMessageLength) {
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }

    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function WordToHex(lValue) {
    let WordToHexValue = '';
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      let WordToHexValue_temp = lByte.toString(16);
      if (WordToHexValue_temp.length === 1) {
        WordToHexValue_temp = '0' + WordToHexValue_temp;
      }
      WordToHexValue += WordToHexValue_temp;
    }
    return WordToHexValue;
  }

  const x = ConvertToWordArray(string);
  let AA = 0x67452301;
  let BB = 0xEFCDAB89;
  let CC = 0x98BADCFE;
  let DD = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const oldA = AA, oldB = BB, oldC = CC, oldD = DD;

    AA = FF(AA, BB, CC, DD, x[k + 0], S11, 0xD76AA478);
    DD = FF(DD, AA, BB, CC, x[k + 1], S12, 0xE8C7B756);
    CC = FF(CC, DD, AA, BB, x[k + 2], S13, 0x242070DB);
    BB = FF(BB, CC, DD, AA, x[k + 3], S14, 0xC1BDCEEE);
    AA = FF(AA, BB, CC, DD, x[k + 4], S11, 0xF57C0FAF);
    DD = FF(DD, AA, BB, CC, x[k + 5], S12, 0x4787C62A);
    CC = FF(CC, DD, AA, BB, x[k + 6], S13, 0xA8304613);
    BB = FF(BB, CC, DD, AA, x[k + 7], S14, 0xFD469501);
    AA = FF(AA, BB, CC, DD, x[k + 8], S11, 0x698098D8);
    DD = FF(DD, AA, BB, CC, x[k + 9], S12, 0x8B44F7AF);
    CC = FF(CC, DD, AA, BB, x[k + 10], S13, 0xFFFF5BB1);
    BB = FF(BB, CC, DD, AA, x[k + 11], S14, 0x895CD7BE);
    AA = FF(AA, BB, CC, DD, x[k + 12], S11, 0x6B901122);
    DD = FF(DD, AA, BB, CC, x[k + 13], S12, 0xFD987193);
    CC = FF(CC, DD, AA, BB, x[k + 14], S13, 0xA679438E);
    BB = FF(BB, CC, DD, AA, x[k + 15], S14, 0x49B40821);

    AA = GG(AA, BB, CC, DD, x[k + 1], S21, 0xF61E2562);
    DD = GG(DD, AA, BB, CC, x[k + 6], S22, 0xC040B340);
    CC = GG(CC, DD, AA, BB, x[k + 11], S23, 0x265E5A51);
    BB = GG(BB, CC, DD, AA, x[k + 0], S24, 0xE9B6C7AA);
    AA = GG(AA, BB, CC, DD, x[k + 5], S21, 0xD62F105D);
    DD = GG(DD, AA, BB, CC, x[k + 10], S22, 0x02441453);
    CC = GG(CC, DD, AA, BB, x[k + 15], S23, 0xD8A1E681);
    BB = GG(BB, CC, DD, AA, x[k + 4], S24, 0xE7D3FBC8);
    AA = GG(AA, BB, CC, DD, x[k + 9], S21, 0x21E1CDE6);
    DD = GG(DD, AA, BB, CC, x[k + 14], S22, 0xC33707D6);
    CC = GG(CC, DD, AA, BB, x[k + 3], S23, 0xF4D50D87);
    BB = GG(BB, CC, DD, AA, x[k + 8], S24, 0x455A14ED);
    AA = GG(AA, BB, CC, DD, x[k + 13], S21, 0xA9E3E905);
    DD = GG(DD, AA, BB, CC, x[k + 2], S22, 0xFCEFA3F8);
    CC = GG(CC, DD, AA, BB, x[k + 7], S23, 0x676F02D9);
    BB = GG(BB, CC, DD, AA, x[k + 12], S24, 0x8D2A4C8A);

    AA = HH(AA, BB, CC, DD, x[k + 5], S31, 0xFFFA3942);
    DD = HH(DD, AA, BB, CC, x[k + 8], S32, 0x8771F681);
    CC = HH(CC, DD, AA, BB, x[k + 11], S33, 0x6D9D6122);
    BB = HH(BB, CC, DD, AA, x[k + 14], S34, 0xFDE5380C);
    AA = HH(AA, BB, CC, DD, x[k + 1], S31, 0xA4BEEA44);
    DD = HH(DD, AA, BB, CC, x[k + 4], S32, 0x4BDECFA9);
    CC = HH(CC, DD, AA, BB, x[k + 7], S33, 0xF6BB4B60);
    BB = HH(BB, CC, DD, AA, x[k + 10], S34, 0xBEBFBC70);
    AA = HH(AA, BB, CC, DD, x[k + 13], S31, 0x289B7EC6);
    DD = HH(DD, AA, BB, CC, x[k + 0], S32, 0xEAA127FA);
    CC = HH(CC, DD, AA, BB, x[k + 3], S33, 0xD4EF3085);
    BB = HH(BB, CC, DD, AA, x[k + 6], S34, 0x04881D05);
    AA = HH(AA, BB, CC, DD, x[k + 9], S31, 0xD9D4D039);
    DD = HH(DD, AA, BB, CC, x[k + 12], S32, 0xE6DB99E5);
    CC = HH(CC, DD, AA, BB, x[k + 15], S33, 0x1FA27CF8);
    BB = HH(BB, CC, DD, AA, x[k + 2], S34, 0xC4AC5665);

    AA = II(AA, BB, CC, DD, x[k + 0], S41, 0xF4292244);
    DD = II(DD, AA, BB, CC, x[k + 7], S42, 0x432AFF97);
    CC = II(CC, DD, AA, BB, x[k + 14], S43, 0xAB9423A7);
    BB = II(BB, CC, DD, AA, x[k + 5], S44, 0xFC93A039);
    AA = II(AA, BB, CC, DD, x[k + 12], S41, 0x655B59C3);
    DD = II(DD, AA, BB, CC, x[k + 3], S42, 0x8F0CCC92);
    CC = II(CC, DD, AA, BB, x[k + 10], S43, 0xFFEFF47D);
    BB = II(BB, CC, DD, AA, x[k + 1], S44, 0x85845DD1);
    AA = II(AA, BB, CC, DD, x[k + 8], S41, 0x6FA87E4F);
    DD = II(DD, AA, BB, CC, x[k + 15], S42, 0xFE2CE6E0);
    CC = II(CC, DD, AA, BB, x[k + 6], S43, 0xA3014314);
    BB = II(BB, CC, DD, AA, x[k + 13], S44, 0x4E0811A1);
    AA = II(AA, BB, CC, DD, x[k + 4], S41, 0xF7537E82);
    DD = II(DD, AA, BB, CC, x[k + 11], S42, 0xBD3AF235);
    CC = II(CC, DD, AA, BB, x[k + 2], S43, 0x2AD7D2BB);
    BB = II(BB, CC, DD, AA, x[k + 9], S44, 0xEB86D391);

    AA = AddUnsigned(AA, oldA);
    BB = AddUnsigned(BB, oldB);
    CC = AddUnsigned(CC, oldC);
    DD = AddUnsigned(DD, oldD);
  }

  return (WordToHex(AA) + WordToHex(BB) + WordToHex(CC) + WordToHex(DD)).toLowerCase();
}

/**
 * Base64 编码
 * @param {Uint8Array|number[]} data
 * @returns {string}
 */
function base64Encode(data) {
  let binary = '';
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 解码为字节数组
 * @param {string} base64String
 * @returns {number[]}
 */
function base64DecodeToBytes(base64String) {
  const binaryString = atob(base64String);
  const bytes = [];
  for (let i = 0; i < binaryString.length; i++) {
    bytes.push(binaryString.charCodeAt(i));
  }
  return bytes;
}

/**
 * Cookie 字符串转对象
 * @param {string} cookieStr
 * @returns {Record<string, string>}
 */
function cookieStr2Obj(cookieStr) {
  const cookies = cookieStr.split('; ');
  const cookieObj = {};
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key && value) {
      cookieObj[key] = decodeURIComponent(value);
    }
  }
  return cookieObj;
}

/**
 * 获取 Cookie 值
 * @param {string} name
 * @returns {string|null}
 */
function getCookieValue(name) {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * 获取浏览器名称和版本的正则表达式映射
 */
const BROWSER_PATTERNS = [
  { name: 'Edge', pattern: /Edge\/([\d.]+)/ },
  { name: 'Opera', pattern: /(?:Opera|OPR)\/([\d.]+)/ },
  { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
  { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
  { name: 'Safari', pattern: /Version\/([\d.]+)/ }
];

/**
 * 获取浏览器名称
 * @returns {string}
 */
function getBrowserName() {
  const userAgent = navigator.userAgent;
  for (const browser of BROWSER_PATTERNS) {
    if (userAgent.includes(browser.name === 'Edge' ? 'Edg' : browser.name) ||
        (browser.name === 'Opera' && userAgent.includes('OPR'))) {
      return browser.name;
    }
  }
  return 'Unknown';
}

/**
 * 获取浏览器版本
 * @returns {string}
 */
function getBrowserVersion() {
  const userAgent = navigator.userAgent;
  for (const browser of BROWSER_PATTERNS) {
    const match = userAgent.match(browser.pattern);
    if (match) {
      return match[1];
    }
  }
  return 'Unknown';
}

/**
 * 获取操作系统名称
 * @returns {string}
 */
function getOSName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

/**
 * 获取操作系统版本
 * @returns {string}
 */
function getOSVersion() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) {
    const match = userAgent.match(/Windows NT ([\d.]+)/);
    return match ? match[1] : '10';
  }
  if (userAgent.includes('Mac')) {
    const match = userAgent.match(/Mac OS X ([\d._]+)/);
    return match ? match[1].replace('_', '.') : 'Unknown';
  }
  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android ([\d.]+)/);
    return match ? match[1] : 'Unknown';
  }
  return 'Unknown';
}

/**
 * 生成随机字符串
 * @param {boolean} useRandomLength
 * @param {number} minLength
 * @param {number} maxLength
 * @returns {string}
 */
function generateRandomString(useRandomLength, minLength, maxLength) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let length = minLength;

  if (useRandomLength) {
    length = Math.round(Math.random() * (maxLength - minLength)) + minLength;
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * 从字符串解析整数
 * @param {string|null|undefined} value
 * @returns {number}
 */
function parseIntFromString(value) {
  if (!value) return 0;
  const cleaned = value.replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * 递归搜索 JSON 对象中的键值
 * @param {any} obj
 * @param {string} key
 * @returns {any}
 */
function SearchJsonKey(obj, key) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return null;

  if (obj.hasOwnProperty(key)) {
    return obj[key];
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = SearchJsonKey(item, key);
      if (result !== null) return result;
    }
  } else {
    for (const k of Object.keys(obj)) {
      const result = SearchJsonKey(obj[k], key);
      if (result !== null) return result;
    }
  }

  return null;
}

/**
 * 参数对象转 URL 查询字符串
 * @param {Record<string, any>} params
 * @returns {string}
 */
function paramsObjToString(params) {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * 获取浏览器信息
 * @returns {BrowserInfo}
 */
function getBrowserInfo() {
  const browserName = getBrowserName();
  let engineName = 'Blink';
  if (browserName === 'Firefox') {
    engineName = 'Gecko';
  } else if (browserName === 'Safari') {
    engineName = 'WebKit';
  }
  return {
    browserName: browserName,
    browserVersion: getBrowserVersion(),
    engineName: engineName,
    engineVersion: getBrowserVersion(),
    osName: getOSName(),
    osVersion: getOSVersion(),
    screenWidth: screen.width,
    screenHeight: screen.height,
    online: navigator.onLine,
    language: navigator.language,
    platform: navigator.platform
  };
}

/**
 * 日志输出到控制台
 * @param {string} message
 * @param {string} [prefix]
 */
function logToConsole(message, prefix) {
  prefix = prefix || '[Crawler]';
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${prefix} ${message}`);
}

// 导出到 window 对象（用于 Content Script）
if (typeof window !== 'undefined') {
  window.__crawler_utils_loaded = true;
  window.MD5 = MD5;
  window.base64Encode = base64Encode;
  window.base64DecodeToBytes = base64DecodeToBytes;
  window.cookieStr2Obj = cookieStr2Obj;
  window.getCookieValue = getCookieValue;
  window.getBrowserName = getBrowserName;
  window.getBrowserVersion = getBrowserVersion;
  window.getOSName = getOSName;
  window.getOSVersion = getOSVersion;
  window.generateRandomString = generateRandomString;
  window.parseIntFromString = parseIntFromString;
  window.SearchJsonKey = SearchJsonKey;
  window.paramsObjToString = paramsObjToString;
  window.logToConsole = logToConsole;
}

})();
