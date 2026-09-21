# 药监局瑞数6补环境生成cookie

> **作者**: wipb30ybbui | **发布时间**: 2025-07-01 11:26:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5819 / 60
> **原文**: [https://www.52pojie.cn/thread-2042722-1-1.html](https://www.52pojie.cn/thread-2042722-1-1.html)

---

*本帖最后由 wipb30ybbui 于 2025-7-1 11:28 编辑*

URL：aHR0cHM6Ly93d3cubm1wYS5nb3YuY24veHhnay9nZ3RnL2luZGV4XzMuaHRtbA==

不带cookie请求，返回412及瑞数6相关逻辑

![](https://attach.52pojie.cn/forum/202507/01/112022e2soxld1al1a1pmp.png)

这个站点的meta没有id，只有一个content，因此补环境会略有不同，另外会有一些“检查属性存在性”的校验，关注一下日志尽量补一补：

[JavaScript] *纯文本查看*

```
/**
 * !!! rs6.js rs6_enter.js 复制时记得恢复成原始单行格式，逻辑中会校验代码格式 !!!
 */

// let meta_content = Buffer.from(process.argv[3], 'base64').toString('utf8');
// let enter_script = Buffer.from(process.argv[4], 'base64').toString('utf8');

// 第一次412返回的html中 meta.content的值
meta_content = 'n95Cqoi5wx7Fcwqgfz8duN83WM7suikYIkZ905Q7BaxPCRWr9BO9u7AE59GrboQzmqJqoYVihEP4DPfxKMNwpiuk8LhTDi9CnGl0gxT0SUHsOIgwrAXnzq';
// 第一次412返回的html中 script标签内的脚本 复制单行。生产环境作为参数传入，测试时可以放到rs6_enter.js中require进来
enter_script = ``;

// 代理
!(function () {
  var console_log = console.log
  watch = function (obj, name) {
    return new Proxy(obj, {
      get(target, p, receiver) {
        // 过滤没用的信息，不进行打印
        if (name !== 'contentWindow' && p === "Math" || p === "JSON" || p === "RegExp" || p === "atob" || p === "parseInt" || p === "String" || p === "Symbol" || p === "Proxy" || p === "Promise" || p === "Array" || p === "isNaN" || p === "encodeURI" || p === "Uint8Array" || p.toString().indexOf("Symbol(Symbol.") != -1 || p.toString().indexOf("Symbol(nodejs") != -1) {
          var val = Reflect.get(...arguments);
          return val
        }
        else {
          var val = Reflect.get(...arguments);
          if (typeof val === 'function') {
            console_log(`取值: ${name}.${p} => function`);
          } else {
            console_log(`取值: ${name}.${p} => ${val}`);
          }
          return val
        }
      },
      set(target, p, value, receiver) {
        var val = Reflect.set(...arguments)
        if (typeof value === 'function') {
          console_log(`设置值: ${name}.${p} => function`,);
        } else {
          console_log(`设置值: ${name}.${p} => ${value}`);
        }
        return val
      },
      has(target, key) {
        // 在检查属性存在性时输出一条消息
        console_log(`检查属性存在性: ${name}.${key.toString()}`);
        return key in target;
      },
      ownKeys(target) {
        console_log(`获取自有属性:${name}`)
        if (name === 'contentWindow_navigator') {
          return watch([], 'contentWindow_navigator自有属性')
        }
        return Reflect.ownKeys(target)
      }
    })
  }
})();
// (() => {
//   const $toString = Function.toString;
//   const myFunction_toString_symbol = Symbol('('.concat('', ')_'));
//   const myToString = function toString() {
//     return typeof this == 'function' && this[myFunction_toString_symbol] || $toString.call(this);
//   };
//
//   function set_native(func, key, value) {
//     Object.defineProperty(func, key, {
//       "enumerable": false,
//       "configurable": true,
//       "writable": true,
//       "value": value
//     })
//   }
//
//   delete Function.prototype['toString'];
//
//   set_native(Function.prototype, "toString", myToString);
//
//   set_native(Function.prototype.toString, myFunction_toString_symbol, "function toString() { [native code] }");
//
//   safeFunction = (func) => {
//     set_native(func, myFunction_toString_symbol, `function ${func.name}() { [native code] }`);
//   };
// }).call();
_null = function () {
  return {};
}

window = global;

window.top = window;
window.setTimeout = _null;
window.setInterval = _null;
window.ActiveXObject = undefined;
window.attachEvent = _null;
window.addEventListener = _null;
window.location = {
  "ancestorOrigins": {},
  "href": "https://www.nmpa.gov.cn/xxgk/ggtg/index_1.html",
  "origin": "https://www.nmpa.gov.cn",
  "protocol": "https:",
  "host": "www.nmpa.gov.cn",
  "hostname": "www.nmpa.gov.cn",
  "port": "",
  "pathname": "/xxgk/ggtg/index_1.html",
  "search": "",
  "hash": ""
}
window.navigator = watch({
  appCodeName: "Mozilla",
  appName: "Netscape",
  appVersion: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  connection: {
    downlink: 2.4,
    effectiveType: "4g",
    onchange: null,
    rtt: 50,
    saveData: false
  },
  cookieEnabled: true,
  deprecatedRunAdAuctionEnforcesKAnonymity: true,
  deviceMemory: 8,
  doNotTrack: null,
  hardwareConcurrency: 22,
  languages: ["zh-CN", "en", "zh"],
  language: "zh-CN",
  maxTouchPoints: 0,
  msMaxTouchPoints: null,
  onLine: true,
  platform: "Win32",
  product: "Gecko",
  productSub: '20030107',
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  vendor: "Google Inc.",
  vendorSub: "",
  webkitPersistentStorage: {},
  getBattery: function () {
    return {
      then() {
      }
    }
  }
}, 'navigator')

_div_i = watch([], '_div_i');
_div = watch({
  getElementsByTagName: function (args) {
    if (args === 'i') {
      return _div_i;
    }
    console.log(`div.getElementsByTagName, 需要补(${args})`);
    return null;
  }
}, 'div')

_a = watch({}, '_a')
_form = watch({}, '_form')

_scripts = watch([
  watch({
    getAttribute: function (args) {
      if (args === 'r') {
        return 'm';
      }
      console.log(`script0.getAttribute, 需要补(${args})`);
      return null;
    },
    parentElement: watch({
      getAttribute: function (args) {
        if (args == 'r') {
          return 'm';
        }
        console.log(`script0.parentElement.getAttribute, 需要补(${args})`);
        return null;
      },
      removeChild: function (args) {
        // console.log(`script0.parentElement.removeChild, 需要补(${args})`);
      },
    }, 'script0.parentElement'),
  }, 'script_0'),
], '_scripts');

_meta = watch([
  {
    'http-equiv': 'Content-Type',
    'content': 'text/html; charset=utf-8'
  },
  {
    content: meta_content,
    r: 'm',
    getAttribute: function (args) {
      if (args == 'r') {
        return 'm';
      }
      console.log(`meta.getAttribute, 需要补(${args})`);
    },
    parentNode: {
      removeChild: function (args) {
        return {};
      },
    }
  }
], '_meta');

document = {
  visibilityState: 'visible',
  createElement: function (tagName) {
    if (tagName==='div') {
      return _div;
    }
    if (tagName === 'a') {
      return _a;
    }
    if (tagName === 'form') {
      return _form;
    }
    console.log(`document.createElement, 需要补(${tagName})`);
    return null;
  },
  getElementsByTagName: function (args) {
    if (args === 'script') {
      return _scripts;
    }
    if (args === 'meta') {
      return _meta;
    }
    if (args === 'base') {
      return [];
    }
    console.log(`document.getElementsByTagName, 需要补(${args})`);
    return null;
  },
  getElementById: function (args) {
    if (args === 'a') {
      return null;
    }
    if (args === 'root-hammerhead-shadow-ui') {
      // 这里是关键 必须是null 不能返回visible 否则会400
      return null;
    }
    console.log(`document.getElementById, 需要补(${args})`);
    return null;
  },
  documentElement: {},
  addEventListener: _null,
}

window = watch(window, 'window');
document = watch(document, 'document');

// 第一次412返回的html中 script标签内的脚本 复制单行。生产环境作为参数传入，测试时可以放到rs6_enter.js中require进来
require("./rs6_enter.js");
// eval(enter_script);

// 第一次412返回的html中，script执行到if($_ts.lcd)$_ts.lcd();，跟进去那一大段vmp的逻辑，生产环境也可以直接贴到这里，但要注意恢复格式后复制，会有代码格式检测
require("./rs6.js");

function get_cookie() {
  return document.cookie
}

console.log(get_cookie());
```

成功生成cookie

![](https://attach.52pojie.cn/forum/202507/01/112516wboe4bbms59bd18b.png)

带cookie请求html

[Bash shell] *纯文本查看*

```
curl -i 'https://www.nmpa.gov.cn/xxgk/ggtg/index_1.html' \
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
  -H 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8' \
  -b 'NfBCSins2OywS=60lnrlx5Pel0ZpdnNBOS0upSYc7HLbc7ovg5nze1Lb0gq6w5hIZVc.xL8g0BC3FGLX49Ld1qhT6KuLr5sQWWpKma; NfBCSins2OywT=0fq1kTmHSR5ipL2cWCcLKJkxNbcfI6xYkQEKf3JCamlB7rpRai2OgpDe6gVVbyH0tpJEh3ybISiYWq1F60GBuE6sUOtHZNLGWUFkHSGDqO_.OtgZ26eSifXGQJqOA3qGpUgo1B6a5OEZOFg3HQ9dvccwBE61KW_T.Ghqsb2qOtEijJQsnm_TjMJT.NaoEo8OKccro7205clvEvWd8DxFx3ykIEM2M1XTo4TVeH8BBGpQ' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Pragma: no-cache' \
  -H 'Referer: https://www.nmpa.gov.cn/xxgk/ggtg/index_1.html' \
  -H 'Sec-Fetch-Dest: document' \
  -H 'Sec-Fetch-Mode: navigate' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'Sec-Fetch-User: ?1' \
  -H 'Upgrade-Insecure-Requests: 1' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"'
```

成功拿到结果

![](https://attach.52pojie.cn/forum/202507/01/112614sk0f5ko39sfujf1g.png)
