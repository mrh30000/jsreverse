/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * jQuery 事件定位探针（jQuery handler locator）。
 *
 * 解决什么问题：jQuery 在原生 DOM 事件机制之上自建了一套事件管理（`$.fn.on/click/…`），
 * 于是 Chrome DevTools 的 Event Listener 面板只能定位到 **jQuery 内部的闭包**，
 * 看不到"真正处理这个点击的那段业务代码"。
 *
 * 本探针的做法：包住 `$.fn` 上的事件方法，把每次注册的**回调函数**挂到一个全局变量上，
 * 并在 **DOM 元素上打一个属性**指向该变量名。于是：
 *
 *   1. Elements 面板里直接就能看到元素有哪些 jQuery 事件（属性即事件表）；
 *   2. Console 里粘贴属性值 ⇒ 打印函数的内存地址 ⇒ 点进去就是真实代码位置。
 *
 * 属性形态（默认）：
 *   data-rjq-jquery-click-event-function="rjq_click_3"
 * 其中 `rjq_click_3` 是 `window` 上的全局变量名，值就是那个回调函数。
 *
 * 序列化约束：函数体内不得引用模块级变量，配置通过 config 传入。
 *
 * config 支持的选项：
 * - hookId: string
 * - attrPrefix: string        元素属性前缀（默认 'data-rjq'）
 * - globalPrefix: string      全局变量前缀（默认 'rjq_'）
 * - events: string[]          只挂这些事件方法；空数组 = 全部（默认 []）
 * - pollInterval: number      等待 window.jQuery 出现的轮询间隔（默认 200）
 * - maxTries: number          最多轮询次数（默认 50 ⇒ 约 10 秒）
 * - tagOnBind: boolean        注册时立刻给当时已存在的元素打属性（默认 true）
 * - maxEntries: number        全局变量上限，防长页面无限增长（默认 2000）
 */
export function installJqueryHandlerHook(config) {
  const hookId = config.hookId || 'jquery_handler';
  const attrPrefix = config.attrPrefix ?? 'data-rjq';
  const globalPrefix = config.globalPrefix ?? 'rjq_';
  const onlyEvents = Array.isArray(config.events) ? config.events : [];
  const pollInterval = config.pollInterval ?? 200;
  const maxTries = config.maxTries ?? 50;
  const tagOnBind = config.tagOnBind ?? true;
  const maxEntries = config.maxEntries ?? 2000;

  // jQuery 支持的事件方法（来源：52pojie-1886004 的受支持列表 + 常用的 on/off 家族）
  const EVENT_METHODS = [
    'click', 'dblclick', 'blur', 'change', 'contextmenu', 'error', 'focus',
    'focusin', 'focusout', 'hover', 'keydown', 'keypress', 'keyup', 'live',
    'load', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout',
    'mouseover', 'mouseup', 'on', 'one', 'bind', 'delegate', 'submit', 'scroll',
    'resize', 'select', 'unload', 'ready', 'holdReady', 'proxy',
  ];

  const picked = onlyEvents.length
    ? EVENT_METHODS.filter(name => onlyEvents.indexOf(name) !== -1)
    : EVENT_METHODS;

  const registry = Object.create(null);   // 全局变量名 -> 回调
  let counter = 0;
  let installed = false;

  const log = (...args) => console.log('[' + hookId + ']', ...args);

  /** 同一个回调 + 同一个事件 ⇒ 复用同一个变量名（幂等）。
   *
   * 为什么必须去重：**真 jQuery 的简写方法内部就是转调 `.on()`**
   *   $.fn.click = function(data, fn) { return arguments.length > 0 ? this.on('click', null, data, fn) : this.trigger('click') }
   * 于是一次 `$(el).click(fn)` 会先后穿过我包装的 `click` 与 `on` 两层，登记两次。
   * 真机实测（Chrome + jQuery 3.6.0）：不去重时 6 次绑定产生 7 个变量、简写那次的元素属性
   * 被后写的 `rjq_click_1` 覆盖。Node 假 jQuery 的 `.click` 不转调 `.on`，**测不出这一条**。 */
  function remember(fn, eventName) {
    if (typeof fn !== 'function') return null;
    let cache = fn.__rjqVarNames;
    if (!cache) {
      cache = Object.create(null);
      try {
        Object.defineProperty(fn, '__rjqVarNames', {
          value: cache, enumerable: false, writable: false, configurable: false,
        });
      } catch (e) {
        return null;   // 冻结/不可扩展的函数，放弃登记（不影响透传）
      }
    }
    if (cache[eventName]) return cache[eventName];

    if (counter >= maxEntries) {
      if (counter === maxEntries) {
        log('已到 maxEntries 上限（' + maxEntries + '），后续回调不再登记到全局变量。');
        counter += 1;
      }
      return null;
    }
    const varName = globalPrefix + eventName + '_' + counter;
    counter += 1;
    registry[varName] = fn;
    try {
      window[varName] = fn;
    } catch (e) {
      /* 某些环境下 window 属性不可写，忽略 */
    }
    cache[eventName] = varName;
    return varName;
  }

  /** 把「事件名 -> 全局变量名」写进元素属性，供 Elements 面板直读。 */
  function tagElements(collection, eventName, varName) {
    if (!varName || !tagOnBind) return;
    const attr = attrPrefix + '-jquery-' + eventName + '-event-function';
    let tagged = 0;
    for (let i = 0; i < collection.length; i += 1) {
      const node = collection[i];
      if (!node || node.nodeType !== 1) continue;
      try {
        node.setAttribute(attr, varName);
        tagged += 1;
      } catch (e) {
        /* 只读元素，忽略 */
      }
    }
    if (tagged > 0) {
      log('#' + eventName + ' → ' + varName + '（已标记 ' + tagged + ' 个元素）');
    } else {
      log('#' + eventName + ' → ' + varName + '（无可标记元素，函数仍可在 Console 里用变量名访问）');
    }
  }

  /**
   * 从一份参数表里挑出回调：jQuery 的签名是
   *   .on(events, [selector], [data], handler)
   *   .click([data], handler)
   * 取「最后一个函数参数」是两种签名都成立的判据。
   */
  function pickHandler(args) {
    for (let i = args.length - 1; i >= 0; i -= 1) {
      if (typeof args[i] === 'function') return {index: i, fn: args[i]};
    }
    return null;
  }

  /**
   * 决定"这次注册的是哪个事件"。
   *
   * 简写方法（`.click(fn)`）⇒ 方法名即事件名；
   * 通用方法（`.on('submit', fn)`）⇒ **事件名在第一个字符串参数里**，方法名（`on`）不是事件名。
   * 这一条最初被我写成"一律用方法名"，契约测试立刻报
   * `.on("submit", fn)` 打出来的属性是 `…-jquery-on-event-function`（对使用者毫无信息量）。
   *
   * 还要处理两种 jQuery 写法：
   *   - 空白分隔的多事件：`.on('click mouseover', fn)` ⇒ 两个事件
   *   - 命名空间后缀：`.on('click.myPlugin', fn)` ⇒ 事件名是 `click`
   */
  const GENERIC_METHODS = ['on', 'one', 'bind', 'delegate', 'live'];

  /** 事件名在第几个参数里 —— 取决于方法签名：
   *   `.on(events, [sel], [data], fn)`   → args[0]
   *   `.one(events, [sel], [data], fn)`  → args[0]
   *   `.bind(events, [data], fn)`        → args[0]
   *   `.live(events, fn)`                → args[0]
   *   `.delegate(selector, events, fn)`  → **args[1]**   ← 最容易写错的一个
   *
   * 这一条是 B30 盲评审用伪 jQuery 实跑抓出来的：把 `delegate` 也按 args[0] 取，
   * 会把**方法名** `delegate` 当成事件名打进元素属性（`data-rjq-jquery-delegate-…`），
   * 而这个预设的卖点正是「属性名即事件名」⇒ 错标会让 Elements 面板直接误导人。
   */
  const EVENT_SPEC_INDEX = {delegate: 1};

  function namesFromSpec(spec, fallback) {
    if (typeof spec !== 'string') return [fallback];
    const names = [];
    for (const raw of spec.split(/\s+/)) {
      const bare = raw.split('.')[0];        // 去掉命名空间
      if (bare && names.indexOf(bare) === -1) names.push(bare);
    }
    return names.length ? names : [fallback];
  }

  function eventNamesFor(methodName, args) {
    if (GENERIC_METHODS.indexOf(methodName) === -1) return [methodName];
    return namesFromSpec(args[EVENT_SPEC_INDEX[methodName] ?? 0], methodName);
  }

  function wrapEventMethod(jq, name) {
    const raw = jq.fn[name];
    if (typeof raw !== 'function' || raw.__rjqWrapped) return;

    const wrapper = function (...args) {
      // 形态 A：$(el).on({click: fn, mouseover: fn2})
      if (args.length && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
        const map = args[0];
        for (const key of Object.keys(map)) {
          if (typeof map[key] !== 'function') continue;
          const varName = remember(map[key], key.split('.')[0]);
          if (varName) tagElements(this, key.split('.')[0], varName);
        }
        return raw.apply(this, args);
      }

      // 形态 B/C：取"最后一个函数参数"作为回调（.on(ev, [sel], [data], fn) 与 .click([data], fn) 都成立）
      const picked = pickHandler(args);
      if (picked) {
        for (const eventName of eventNamesFor(name, args)) {
          const varName = remember(picked.fn, eventName);
          if (varName) tagElements(this, eventName, varName);
        }
      }
      return raw.apply(this, args);
    };
    wrapper.__rjqWrapped = true;
    wrapper.__rjqRaw = raw;
    jq.fn[name] = wrapper;
  }

  function install(jq) {
    if (installed) return true;
    if (!jq || !jq.fn) return false;
    installed = true;
    for (const name of picked) wrapEventMethod(jq, name);
    window['__' + hookId + '_registry'] = registry;
    window['__' + hookId + '_report'] = function report() {
      return Object.keys(registry).map(function (k) {
        const fn = registry[k];
        return {
          varName: k,
          name: fn && fn.name,
          source: fn ? String(fn).replace(/\s+/g, ' ').slice(0, 160) : null,
        };
      });
    };
    log('已挂 ' + picked.length + ' 个事件方法。'
      + ' 在 Elements 面板看属性 `' + attrPrefix + '-jquery-<事件>-event-function`，'
      + ' 或在 Console 里执行 __' + hookId + '_report() 列表。');
    return true;
  }

  // jQuery 可能比本脚本晚到（油猴 document-start 注入），也可能已经在了。
  let tries = 0;
  const tick = function () {
    const jq = window.jQuery || window.$;
    if (install(jq)) return;
    tries += 1;
    if (tries < maxTries) {
      setTimeout(tick, pollInterval);
    } else {
      log('等了 ' + maxTries + ' 次仍未拿到 window.jQuery —— 该页面可能不用 jQuery，'
        + '或 jQuery 被 Webpack 闭包持有（此时改用 dataflow 预设按选择器/关键字追）。');
    }
  };
  tick();
}
