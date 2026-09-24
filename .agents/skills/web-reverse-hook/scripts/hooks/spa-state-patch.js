/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vue / Vuex 运行时状态固化 + 组件注册表替换（页面侧"改写运行时"的通用注入范式）.
 *
 * 来源：`52pojie-1830072`（Vuex 状态树改写解锁百度文库复制）、
 *      `52pojie-1669080`（替换 video.js `Player` 组件注册表）。
 *
 * 序列化约束：函数体内不得引用模块级变量，配置通过 config 传入。
 *
 * config 支持的选项：
 * - hookId: string
 * - statePaths: string[]  —— 形如 `vipInfo.isVip=true` / `visitUserInfo.taskStatus=1` /
 *                            `readerPlugin.canCopy=true`；路径相对 **store 的 state 根**，
 *                            值支持 true / false / 数字 / 带引号字符串
 * - lockState: boolean（默认 true）—— 用访问器把叶子**锁住**，后续再被写回也会被强制改回
 * - traceMutations: boolean（默认 true）—— 包装 Vuex `store.subscribe` 打印每次 mutation
 * - registry: {root, method, names}|null —— 观察/替换组件注册表。
 *                            例：`{root:'window.videojs', method:'registerComponent', names:['Player']}`
 * - pollInterval: number（默认 500ms）
 * - maxTries: number（默认 20）
 *
 * 会挂到 window 上：
 * - `__mcp_vue_hook__`：`{ install, findRoot, getStore, apply, replaceComponent, registry, mutations }`
 *
 * ⚠️ 为什么需要"锁"：SPA 会**重新初始化**（路由切换、组件重挂载、`history.go(0)`）。
 *    只赋一次值的写法在刷新/重挂载后会被冲掉 —— 与 `52pojie-1828098` 那次
 *    "改完 `if(true)` 后又 `history.go(0)`"是同一类现象。
 */

export function installSpaStatePatchHook(config) {
  const hookId = config.hookId || 'spa_state_patch';
  const statePaths = config.statePaths || [];
  const lockState = config.lockState ?? true;
  const traceMutations = config.traceMutations ?? true;
  const registry = config.registry && config.registry.root
    ? {
        root: config.registry.root,
        method: config.registry.method || 'registerComponent',
        names: config.registry.names || [],
      }
    : null;

  const store = {
    vue: null,
    store: null,
    mutations: [],
    registry: {},
    applied: {},
  };
  window.__mcp_vue_hook__ = store;

  const log = function () {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[' + hookId + ']');
    console.log.apply(console, args);
  };

  // ---------------------------------------------------------------- 1. 找 Vue 根实例

  function findRoot() {
    if (store.vue && store.vue.$store) return store.vue;
    const all = document.querySelectorAll('body *');
    const limit = Math.min(all.length, 4000);
    for (let i = 0; i < limit; i++) {
      const el = all[i];
      // Vue 2：实例直接挂在 DOM 元素的 __vue__ 上（`document.querySelector('.header-wrapper').__vue__`）
      if (el.__vue__) return el.__vue__;
      // Vue 3：应用实例挂在容器的 __vue_app__ 上
      if (el.__vue_app__) {
        store.vueApp = el.__vue_app__;
        return el.__vue_app__;
      }
    }
    return null;
  }

  function getStore(root) {
    if (!root) return null;
    // Vue 2 + Vuex：$store.state；Vue 3：globalProperties.$store
    if (root.$store) return root.$store;
    const gp = root.config && root.config.globalProperties;
    if (gp && gp.$store) return gp.$store;
    // Pinia：state 直接挂在 store 上（没有 .state 这一层）
    if (root.$pinia) return root.$pinia;
    return null;
  }

  function stateRoot(st) {
    if (!st) return null;
    // Vuex：store.state；Pinia：store 自身
    return st.state ? st.state : st;
  }

  // ---------------------------------------------------------------- 2. 解析与固化状态路径

  function parseValue(raw) {
    const v = String(raw).trim();
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^'.*'$/.test(v) || /^".*"$/.test(v)) return v.slice(1, -1);
    return v;   // 兜底当字符串
  }

  function parsePaths(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const s = String(list[i]);
      const eq = s.lastIndexOf('=');
      if (eq < 1) {
        out.push({ path: s, value: true, original: s });
        continue;
      }
      out.push({ path: s.slice(0, eq).trim(), value: parseValue(s.slice(eq + 1)), original: s });
    }
    return out;
  }

  function applyOne(root, item) {
    const segs = item.path.split('.');
    let obj = root;
    for (let i = 0; i < segs.length - 1; i++) {
      obj = obj && obj[segs[i]];
      if (obj === undefined || obj === null) return false;
    }
    const leaf = segs[segs.length - 1];
    if (!obj) return false;
    const before = obj[leaf];
    if (!lockState) {
      obj[leaf] = item.value;
      store.applied[item.path] = { before: before, after: obj[leaf], locked: false };
      return true;
    }
    // 锁：访问器同时负责"初值"与"挡回写"
    try {
      let forced = item.value;
      Object.defineProperty(obj, leaf, {
        configurable: true,
        enumerable: true,
        get: function () { return forced; },
        set: function (nv) {
          if (nv !== forced) {
            log('↩️ 挡回一次对 ' + item.path + ' 的写回（原值 ' + JSON.stringify(nv) + ' ⇒ 强制 ' + JSON.stringify(forced) + '）');
          }
          forced = item.value;
        },
      });
      store.applied[item.path] = { before: before, after: item.value, locked: true };
      return true;
    } catch (e) {
      obj[leaf] = item.value;
      store.applied[item.path] = { before: before, after: obj[leaf], locked: false, error: String(e) };
      return true;
    }
  }

  function apply() {
    installRegistry();   // 注册表探针必须"早于页面注册"，所以每次 apply 都顺带尝试安装
    const root = findRoot();
    const st = getStore(root);
    const sr = stateRoot(st);
    if (!sr) return 0;
    store.vue = root;
    store.store = st;
    if (traceMutations && st && typeof st.subscribe === 'function' && !st.__mcp_traced) {
      st.__mcp_traced = true;
      st.subscribe(function (mutation, state) {
        const rec = { type: mutation && mutation.type, payload: mutation && mutation.payload };
        store.mutations.push(rec);
        if (store.mutations.length <= 200) {
          log('🧬 mutation', rec.type, '=>', JSON.stringify(rec.payload));
        }
      });
      log('✅ 已挂 Vuex subscribe（可打印每次 mutation 的 type 与 payload）');
    }
    let n = 0;
    const items = store.__items || (store.__items = parsePaths(statePaths));
    for (let i = 0; i < items.length; i++) {
      if (applyOne(sr, items[i])) n++;
      else log('⚠️ 路径不可达：' + items[i].path + '（此时 state 里还没这个键？用 __mcp_vue_hook__.store 看一眼）');
    }
    if (n > 0) {
      log('✅ 已固化 ' + n + ' 条状态：', Object.keys(store.applied).join(', '));
    }
    return n;
  }

  // ---------------------------------------------------------------- 3. 组件注册表替换

  function resolveRoot(expr) {
    // 只支持 `window.xxx` / `window.xxx.yyy` 这类面量路径，避免 eval
    const segs = String(expr).split('.').filter(Boolean);
    let obj = window;
    if (segs[0] === 'window') segs.shift();
    for (let i = 0; i < segs.length; i++) {
      obj = obj && obj[segs[i]];
    }
    return obj;
  }

  function installRegistry() {
    if (!registry || store.__registryInstalled) return false;
    const rootObj = resolveRoot(registry.root);
    if (!rootObj || typeof rootObj[registry.method] !== 'function') return false;
    const orig = rootObj[registry.method];
    rootObj[registry.method] = function (name) {
      const args = Array.prototype.slice.call(arguments);
      store.registry[name] = { factory: args[1], seenAt: Date.now() };
      if (registry.names.indexOf(name) >= 0) {
        log('🎯 注册表命中：' + name, '（已记录原工厂，可调用 __mcp_vue_hook__.replaceComponent("' + name + '", fn) 替换）');
      }
      return orig.apply(this, args);
    };
    store.__registryRoot = rootObj;
    store.__registryOrig = orig;
    store.__registryInstalled = true;
    log('✅ 已挂注册表探针：' + registry.root + '.' + registry.method);
    return true;
  }

  /**
   * 用原型链继承替换已注册组件 —— 与原文三步等价：
   *   const Origin = X.getComponent('Player');
   *   f.prototype = Object.create(Origin.prototype);
   *   X.registerComponent('Player', f);
   * 这样既能拿到"初始化前后"的两个时机，又不会丢掉原有全部行为。
   *
   * ⚠️ 比原文多一步（B28 实跑带出）：直接 `factory.prototype = Object.create(...)`
   *    会**静默丢掉**你自己写在 prototype 上的成员。这里先把原有 own 成员搬过去再挂原型链。
   */
  function replaceComponent(name, factory) {
    const rec = store.registry[name];
    if (!rec) {
      log('❌ 注册表里还没有 ' + name + '（先让页面完成一次注册）');
      return false;
    }
    const Origin = rec.factory;
    if (Origin && Origin.prototype && factory.prototype && !factory.prototype.__mcp_chained) {
      const ownProto = factory.prototype;
      const chained = Object.create(Origin.prototype);
      let carried = 0;
      const keys = Object.getOwnPropertyNames(ownProto);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k === 'constructor') continue;
        const desc = Object.getOwnPropertyDescriptor(ownProto, k);
        if (desc) { Object.defineProperty(chained, k, desc); carried++; }
      }
      chained.constructor = factory;
      chained.__mcp_chained = true;
      factory.prototype = chained;
      store.lastReplace = { name: name, carriedOwnMembers: carried };
      log('🔗 ' + name + '：原型链已接上，并搬运了 ' + carried + ' 个自有成员（避免静默丢代码）');
    }
    const rootObj = store.__registryRoot;
    if (rootObj && store.__registryOrig) {
      rootObj[registry.method] = store.__registryOrig;   // 临时还原，避免被自己的探针再记一次
    }
    try {
      rootObj[registry.method].call(rootObj, name, factory);
      store.registry[name] = { factory: factory, replaced: true };
      log('✅ 已替换 ' + name + '（prototype 继承自原工厂）');
      return true;
    } finally {
      rootObj[registry.method] = function () {
        const args = Array.prototype.slice.call(arguments);
        store.registry[args[0]] = { factory: args[1], seenAt: Date.now() };
        return store.__registryOrig.apply(this, args);
      };
    }
  }

  store.findRoot = findRoot;
  store.getStore = getStore;
  store.apply = apply;
  store.replaceComponent = replaceComponent;
  store.install = installRegistry;

  // ---------------------------------------------------------------- 4. 轮询安装

  installRegistry();   // 注入时机早时 `window.videojs` 可能还不存在 ⇒ 下面轮询会重试

  let attempts = config.maxTries ?? 20;
  const timer = setInterval(function () {
    attempts--;
    installRegistry();
    const n = apply();
    if (n > 0 && statePaths.length > 0 && attempts <= (config.maxTries ?? 20) - ((config.maxTries ?? 20) / 2)) {
      // 前一半时间反复安装（SPA 会重挂载）；后一半退化为低频保活
    }
    if (attempts <= 0) {
      clearInterval(timer);
      log('⏹️ 轮询结束；累计 patch ' + Object.keys(store.applied).length + ' 条，mutation ' + store.mutations.length + ' 条');
    }
  }, config.pollInterval ?? 500);

  log('✅ spa-state-patch 已安装' + (statePaths.length ? '（目标：' + statePaths.join(' | ') + '）' : ''));
  log('   用法：__mcp_vue_hook__.apply() 重放；__mcp_vue_hook__.store 看 store；'
    + '__mcp_vue_hook__.mutations 看 mutation 流水');
}
