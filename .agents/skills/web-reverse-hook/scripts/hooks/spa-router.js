/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SPA (Vue / React) 动态路由提取与导航守卫清除探针.
 *
 * 序列化约束：函数体内不得引用模块级变量，配置通过 config 传入。
 *
 * config 支持的选项：
 * - hookId: string
 * - clearGuards: boolean (默认 true，清除 beforeEach / beforeResolve 守卫)
 * - blockRedirects: boolean (默认 false，清空 router.push / replace / go 阻止跳出)
 * - pollInterval: number (默认 300ms)
 * - maxTries: number (默认 10)
 */

export function installSpaVueHook(config) {
  const hookId = config.hookId || 'spa_vue_router';
  const clearGuards = config.clearGuards ?? true;
  const blockRedirects = config.blockRedirects ?? false;

  window.__spa_routes__ = window.__spa_routes__ || { vue: [], react: [] };

  // 1. 守卫清除（拦截 Vue Router 内部存储守卫的数组 push）
  if (clearGuards) {
    const rawPush = Array.prototype.push;
    Array.prototype.push = function (...args) {
      if (args.length > 0 && typeof args[0] === 'function') {
        const stack = new Error().stack || '';
        if (stack.includes('beforeEach') || stack.includes('beforeResolve')) {
          console.warn('[' + hookId + '] 🛡️ Disarmed Vue navigation guard from stack:', stack.split('\n')[2]?.trim());
          return rawPush.call(this); // 不把守卫压入数组，静默剥离
        }
      }
      return Reflect.apply(rawPush, this, args);
    };
  }

  function joinPath(base, path) {
    if (!path) return base || '/';
    if (path.startsWith('/')) return path;
    if (!base || base === '/') return '/' + path;
    return (base.endsWith('/') ? base.slice(0, -1) : base) + '/' + path;
  }

  function listAllRoutes(router) {
    const list = [];
    try {
      // Vue Router 4 (Vue 3)
      if (typeof router.getRoutes === 'function') {
        const rList = router.getRoutes();
        for (let i = 0; i < rList.length; i++) {
          const r = rList[i];
          list.push({ path: r.path, name: r.name, meta: r.meta });
        }
        return list;
      }

      // Vue Router 2/3 (Vue 2)
      if (router.options && Array.isArray(router.options.routes)) {
        function traverse(routes, basePath) {
          for (let i = 0; i < routes.length; i++) {
            const r = routes[i];
            const fullPath = joinPath(basePath, r.path);
            list.push({ path: fullPath, name: r.name, meta: r.meta });
            if (Array.isArray(r.children) && r.children.length > 0) {
              traverse(r.children, fullPath);
            }
          }
        }
        traverse(router.options.routes, '');
        return list;
      }

      // Matcher 兜底
      if (router.matcher && typeof router.matcher.getRoutes === 'function') {
        const mRoutes = router.matcher.getRoutes();
        for (let i = 0; i < mRoutes.length; i++) {
          list.push({ path: mRoutes[i].path, name: mRoutes[i].name, meta: mRoutes[i].meta });
        }
        return list;
      }
    } catch (e) {
      console.warn('[' + hookId + '] Error listing routes:', e);
    }
    return list;
  }

  function findVueRouter(node) {
    try {
      if (node.__vue_app__) {
        const app = node.__vue_app__;
        return app.config?.globalProperties?.$router ||
          app._instance?.appContext?.config?.globalProperties?.$router ||
          app._instance?.ctx?.$router ||
          null;
      }
      if (node.__vue__) {
        const vue = node.__vue__;
        return vue.$router ||
          vue.$root?.$router ||
          vue.$root?.$options?.router ||
          vue._router ||
          null;
      }
    } catch (_) {}
    return null;
  }

  function scanDOMForVue() {
    if (!document.body) return null;
    const queue = [document.body];
    const visited = new Set();
    const foundRouters = [];

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || visited.has(node) || node.nodeType !== 1) continue;
      visited.add(node);

      const router = findVueRouter(node);
      if (router && !foundRouters.includes(router)) {
        foundRouters.push(router);

        if (blockRedirects) {
          router.push = function () { console.warn('[' + hookId + '] Blocked router.push'); };
          router.replace = function () { console.warn('[' + hookId + '] Blocked router.replace'); };
          router.go = function () { console.warn('[' + hookId + '] Blocked router.go'); };
        }

        const routes = listAllRoutes(router);
        const version = node.__vue_app__ ? 'Vue 3' : 'Vue 2';
        const mode = router.mode || router.options?.mode || (router.history ? 'html5/hash' : 'unknown');

        window.__spa_routes__.vue.push({
          version,
          mode,
          count: routes.length,
          routes,
        });

        console.log(`[${hookId}] 🚀 Discovered ${version} Router with ${routes.length} routes:`);
        console.table(routes.slice(0, 30).map(r => ({ Path: r.path, Name: r.name || '(anonymous)' })));
        if (routes.length > 30) {
          console.log(`[${hookId}] ... and ${routes.length - 30} more routes. Full list in window.__spa_routes__.vue`);
        }
      }

      for (let i = 0; i < node.childNodes.length; i++) {
        queue.push(node.childNodes[i]);
      }
    }

    return foundRouters.length > 0;
  }

  // 轮询与观察
  let attempts = config.maxTries || 12;
  const timer = setInterval(() => {
    attempts--;
    if (scanDOMForVue() || attempts <= 0) {
      clearInterval(timer);
    }
  }, config.pollInterval || 300);

  console.log('[' + hookId + '] ✅ Vue router harvester & guard patcher installed');
}

export function installSpaReactHook(config) {
  const hookId = config.hookId || 'spa_react_router';

  window.__spa_routes__ = window.__spa_routes__ || { vue: [], react: [] };

  function findReactContainers() {
    if (!document.body) return [];
    const queue = [document.body];
    const visited = new Set();
    const roots = [];

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || visited.has(node) || node.nodeType !== 1) continue;
      visited.add(node);

      const keys = Object.keys(node);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k.startsWith('__reactContainer$') || k === '_reactRootContainer') {
          roots.push({ node, key: k, value: node[k] });
        }
      }

      for (let i = 0; i < node.childNodes.length; i++) {
        queue.push(node.childNodes[i]);
      }
    }
    return roots;
  }

  function extractRoutesFromFiber(fiber) {
    const discovered = [];
    const visitedFibers = new Set();
    const fiberQueue = [fiber];

    while (fiberQueue.length > 0 && fiberQueue.length < 5000) {
      const cur = fiberQueue.shift();
      if (!cur || visitedFibers.has(cur)) continue;
      visitedFibers.add(cur);

      // 检查 props 中的 routes / children
      const props = cur.memoizedProps;
      if (props && typeof props === 'object') {
        if (Array.isArray(props.routes)) {
          for (let i = 0; i < props.routes.length; i++) {
            const r = props.routes[i];
            if (r && (r.path || r.element)) {
              discovered.push({ path: r.path || '(index/layout)', children: Array.isArray(r.children) ? r.children.length : 0 });
            }
          }
        }
        if (props.path && typeof props.path === 'string') {
          discovered.push({ path: props.path, component: cur.type?.name || 'Route' });
        }
      }

      // 检查 React Router v6 DataRouter context
      const state = cur.memoizedState;
      if (state && typeof state === 'object' && state.element?.props?.matchPath) {
        discovered.push({ path: state.element.props.matchPath });
      }

      if (cur.child) fiberQueue.push(cur.child);
      if (cur.sibling) fiberQueue.push(cur.sibling);
    }

    return discovered;
  }

  function scanReact() {
    const containers = findReactContainers();
    let total = 0;
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      let startFiber = null;
      if (container.key.startsWith('__reactContainer$')) {
        startFiber = container.value?.current?.child || container.value?.child;
      } else if (container.value?._internalRoot?.current) {
        startFiber = container.value._internalRoot.current.child;
      }

      if (startFiber) {
        const routes = extractRoutesFromFiber(startFiber);
        if (routes.length > 0) {
          total += routes.length;
          window.__spa_routes__.react.push({ routes });
          console.log(`[${hookId}] ⚛️ Discovered React routes (${routes.length} entries):`);
          console.table(routes.slice(0, 30));
        }
      }
    }
    return total > 0;
  }

  let attempts = 10;
  const timer = setInterval(() => {
    attempts--;
    if (scanReact() || attempts <= 0) {
      clearInterval(timer);
    }
  }, 400);

  console.log('[' + hookId + '] ✅ React router & fiber harvester installed');
}
