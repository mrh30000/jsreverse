# SPA (Vue / React) 动态路由提取与导航守卫解除

> 目录
> 1. 为什么现代 Web 逆向需要关注 SPA 前端路由
> 2. Vue 2 / Vue 3 路由实例探测与全量路由表抽取
> 3. 前端导航守卫（beforeEach / beforeResolve）的无感解除
> 4. 路由强退与重定向阻断
> 5. React Fiber 树与 Router 路由探测
> 6. 隐藏路由到数据接口的归因与批量采集闭环
> 7. 常见问题与踩坑指南

---

## 1. 为什么现代 Web 逆向需要关注 SPA 前端路由

在现代前后端分离应用（SPA）中：
1. **隐藏端点与敏感接口往往不在首屏**：后台管理面板、数据大屏、报表导出、测试控制台、未公开功能等前端页面代码早已打包在 `app.js` 或异步 chunk 中，但普通用户菜单未提供入口。
2. **前端路由映射数据接口**：每一个路由页面（如 `/admin/data-export`、`/tenant/:id/analytics`）背后都有特定的 XHR/Fetch API 请求逻辑。拿到全量路由表就能成倍扩大接口逆向与数据采集的面。
3. **前端守卫的伪拦截**：未登录用户在尝试访问受保护路径时，常被 Vue Router 的 `beforeEach` 守卫强制弹回 `/login`。如果能解除守卫，即可在无需真实高权限凭证的情况下直接渲染页面组件并触发背后的接口调用。

---

## 2. Vue 2 / Vue 3 路由实例探测与全量路由表抽取

### 2.1 DOM BFS 扫描识别挂载实例

Vue 在挂载到 DOM 元素（通常是 `<div id="app">` 或 `document.body`）时，会在 DOM 节点上挂载内部属性：
- **Vue 3**：`node.__vue_app__`（App 实例）
- **Vue 2**：`node.__vue__`（Vue 组件根实例）

通过对 `document.body` 执行广度优先搜索（BFS），即可稳定定位到 Vue 根节点。

### 2.2 定位 Router 实例

- **Vue 3 (Vue Router 4)**：
  ```js
  const app = node.__vue_app__;
  const router = app.config?.globalProperties?.$router ||
                 app._instance?.appContext?.config?.globalProperties?.$router ||
                 app._instance?.ctx?.$router;
  ```
- **Vue 2 (Vue Router 2/3)**：
  ```js
  const vue = node.__vue__;
  const router = vue.$router ||
                 vue.$root?.$router ||
                 vue.$root?.$options?.router ||
                 vue._router;
  ```

### 2.3 提取全量路由表

不同版本的 Vue Router 内部存储路由的数据结构不同，应按优先级多级降级：

1. **Vue Router 4**：调用原生 API `router.getRoutes()`，直接返回展平的完整路由对象数组。
2. **Vue Router 2/3**：递归遍历 `router.options.routes`，配合 `joinPath(basePath, route.path)` 拼接多层嵌套子路由 (`children`)。
3. **Matcher 备用**：读取 `router.matcher.getRoutes()`。
4. **提取路由元数据**：除了 `path` 之外，重点收集 `name`、`meta`（常含权限角色 `roles`、是否需要认证 `requiresAuth`、页面标题 `title`、权限码 `permission`）。

---

## 3. 前端导航守卫（beforeEach / beforeResolve）的无感解除

### 3.1 机制分析

在 Vue Router 内部，无论是 `router.beforeEach(guardFn)` 还是 `router.beforeResolve(guardFn)`，底层实现均是通过数组把守卫函数保存起来：
```js
// Vue Router 源码示意
router.beforeEach = function (fn) {
  return registerHook(this.beforeHooks, fn);
};
function registerHook(list, fn) {
  list.push(fn); // ← 核心动作：向内部数组 push 守卫回调函数
  return () => { ... };
}
```
当路由发生跳转时，Vue Router 会依次执行该数组中的守卫。如果守卫发现没有 token 或权限不足，便会调用 `next('/login')` 或返回 `false` 中断导航。

### 3.2 处置：基于调用栈特征的 `Array.prototype.push` 过滤

如果直接把整个 router 重置，会破坏路由的正常解析与组件加载。最佳实践是在守卫注册的源头将其剥离：

```js
const rawPush = Array.prototype.push;
Array.prototype.push = function (...args) {
  if (args.length > 0 && typeof args[0] === 'function') {
    const stack = new Error().stack || '';
    if (stack.includes('beforeEach') || stack.includes('beforeResolve')) {
      console.warn('[SPA-Guard] 🛡️ 拦截并剔除导航守卫:', stack.split('\n')[2]?.trim());
      // 静默调用原生 push 但不传入 guardFn，使其数组保持为空
      return rawPush.call(this);
    }
  }
  return Reflect.apply(rawPush, this, args);
};
```

**效果**：
- 守卫函数根本不会进入 Router 内部的调度队列。
- 页面在跳转到 `/admin`、`/vip/dashboard` 等受保护路由时，不再触发重定向或权限检查，页面直接渲染对应组件！

---

## 4. 路由强退与重定向阻断

某些页面在组件 `mounted` 或页面代码内部写死了跳转逻辑（如 `if (!user) this.$router.push('/login')`）。

针对这种情况，可在抽取到 `routerInstance` 后，将编程式导航方法置空：
```js
routerInstance.push = function () { console.warn('Blocked router.push'); };
routerInstance.replace = function () { console.warn('Blocked router.replace'); };
routerInstance.go = function () { console.warn('Blocked router.go'); };
```
配合 `window.history.go`、`history.back` 和 `window.close` 的防护，保证分析人员可以稳定停留在目标路由界面。

---

## 5. React Fiber 树与 Router 路由探测

### 5.1 探测 React 根挂载点

React 在 DOM 节点上注入内部属性：
- **React 18**：`__reactContainer$<randomId>` 或 `__reactContainere$<randomId>`
- **React 17 及以下**：`_reactRootContainer`

### 5.2 遍历 Fiber 节点提取路由

从 HostRoot Fiber（`container.current.child`）开始向下遍历 Fiber 树：
1. 检查各 Fiber 节点的 `memoizedProps`，提取 `props.routes`、`props.path`、`<Route path="...">` 组件配置。
2. 检查 React Router v6 的 `DataRouterContext` 与 `useRoutes` 状态：
   ```js
   if (cur.memoizedState?.element?.props?.matchPath) {
     discovered.push(cur.memoizedState.element.props.matchPath);
   }
   ```
3. 收集未在导航栏呈现的隐藏 Route 分支。

---

## 6. 隐藏路由到数据接口的归因与批量采集闭环

1. **生成 Hook 并注入**：
   ```bash
   node .agents/skills/web-reverse-hook/scripts/build-hook.js spa-vue --block-redirects --out hook-vue.js
   browsercli call evaluate_script --file hook-vue.js
   ```
2. **提取全量路由**：
   ```bash
   browsercli call evaluate_script --function "() => JSON.stringify(window.__spa_routes__)"
   ```
3. **逐个导航并监听 Network**：
   对收集到的路由逐一调用 `window.location.hash = route.path`（Hash 模式）或使用测试环境直接访问对应路径，监听 Network 发出的 XHR/Fetch 请求。
4. **归因接口与参数**：将捕获到的 API 与路由路径关联，快速锁定管理后台专用的统计、导出和增删改查接口。

---

## 7. 常见问题与踩坑指南

| 现象 | 原因 | 解决方案 |
|---|---|---|
| 执行扫描返回空数组 | Vue/React 尚未完成异步首屏挂载 | 使用带有轮询机制的 Hook（`pollInterval: 300, maxTries: 10`），或在 `DOMContentLoaded` 后触发 |
| 解除守卫后页面白屏报错 | 守卫函数中还承担了获取必要用户信息/字典数据的初始化责任 | 检查控制台报错，改用局部修改（通过 mitmproxy 只把 `next('/login')` 改为 `next()`，保留前置数据请求） |
| 路由为 `/users/:id` 等动态占位符 | 前端为参数化路由定义 | 在构建爬取列表时提取参数名，并结合历史接口返回的真实 ID 填充 |
| 异步路由 chunk 404 | 路由采用了 `() => import('./views/Admin.vue')`，打包资源路径失效 | 从 `scripts/` 中正则检索 chunk 命名规则或配置正确的 CDN Base URL |
