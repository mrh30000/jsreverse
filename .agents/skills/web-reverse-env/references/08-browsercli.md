# proxycli 命令参考（补环境专用）

这份文档把补环境的每个阶段映射到具体的 `proxycli call` 命令。参数名以 `src/tools` 下各工具的 zod schema 为准（可通过 `proxycli list-tools` 查签名）。

## 0. 前提与通用 flag

`proxycli` 只通过 worker 的 `/api/v1` HTTP 契约通信，调用前 worker 需在线：

```bash
proxycli status            # 查看 worker 运行状态与统计
proxycli browser connect   # 连接/启动 worker 浏览器
proxycli list-tools        # 列出所有工具与参数签名
```

通用控制 flag（不属于工具参数本身）：

- `--session <id>`：指定 session
- `--watch`：订阅本次调用产生的事件流
- `--file <path>`：从文件加载参数。`.json` 解析为参数对象；`.js/.mjs/.ts` 读取内容作为 `{function: content}`（适配 `evaluate_script`）
- `--data '<json>'`：行内 JSON 参数包
- `--stdin`：从 stdin 读取 JSON 参数

参数类型规则：

- `string[]`：`--properties '["a","b"]'` 或 `--properties a,b`
- `object`：`--capture '{"stack":true,"args":true}'`
- kebab-case flag 自动转 camelCase 对齐 schema（`--hook-id` → `hookId`）
- 个别工具的 schema 本身就是 snake_case（如 `hook_jsvmp_interpreter`），flag 用下划线原样传：`--script_url`

## 1. 页面与导航

```bash
proxycli call navigate_page --url "https://example.com" --type url
proxycli call navigate_page --type reload --ignore-cache true
proxycli call list_pages
proxycli call select_page        # 切换活动页
proxycli call new_page           # 新开页面
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--type` | enum `url`/`back`/`forward`/`reload` | 导航类型，默认 `url` |
| `--url` | string | `type=url` 时必填 |
| `--ignore-cache` | boolean | 仅 `reload` 生效 |
| `--timeout` | number | 导航超时，默认 10000 |

## 2. 采集真实浏览器环境（Observe-first）

这是补环境的第一手数据来源：先用真实浏览器把对象结构、描述符、原型链、存储态抓下来，再据此补本地环境。

### 2.1 `compare_env` — 环境基准采集

```bash
proxycli call compare_env
proxycli call compare_env --properties '["navigator.userAgent","navigator.webdriver","navigator.plugins.length","document.all","document.cookie"]'
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--properties` | string[] | 额外读取的点分隔属性路径，不执行表达式 |

采集 `navigator`/`screen`/`canvas`/`webgl`/`audio`/`timing`/`misc`/`custom` 分组基准，用于与 Node/jsdom 环境对比。

### 2.2 `evaluate_script` — 任意 JS 精确采集

```bash
proxycli call evaluate_script --function "(() => JSON.stringify({ua:navigator.userAgent, wd:navigator.webdriver, p:navigator.plugins}))()"
proxycli call evaluate_script --function "(() => Object.getOwnPropertyDescriptor(Navigator.prototype,'userAgent'))()"
proxycli call evaluate_script --function "(() => Object.getPrototypeOf(navigator).constructor.name)()"
proxycli call evaluate_script --file collect-env.js      # .js 文件内容作为 function
proxycli call evaluate_script --function "..." --file-path out.json --timeout-ms 60000
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--function` | string（必填） | 完整可执行 JS 表达式；函数表达式会被调用 |
| `--context` | enum `page`/`content-script` | 执行上下文，默认 `page` |
| `--frame-id` | string | 多 iframe（跨域登录/Cookie 检测）时显式指定 |
| `--allow-any-frame` | boolean | 多上下文歧义时回退到首个可用上下文 |
| `--file-path` | string | 大结果保存到文件 |
| `--timeout-ms` | number | 超时，默认 30000 |

也可用位置参数写法：`proxycli call evaluate_script "() => document.title"`。

### 2.3 `inspect_object` — 深查对象结构

```bash
proxycli call inspect_object --expression "navigator" --depth 3
proxycli call inspect_object --expression "document.all" --depth 2 --show-prototype true
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--expression` | string（必填） | 对象表达式，如 `window.app`、`document.body` |
| `--depth` | number | 嵌套深度，默认 2 |
| `--show-methods` | boolean | 是否展示方法，默认 true |
| `--show-prototype` | boolean | 是否展示原型链，默认 true |

### 2.4 `get_storage` — 存储运行态

```bash
proxycli call get_storage --type all
proxycli call get_storage --type cookies --filter "token"
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--type` | enum `all`/`cookies`/`localStorage`/`sessionStorage` | 默认 `all` |
| `--filter` | string | 按键名过滤，不区分大小写 |

返回 HttpOnly cookies、可复制 Cookie 请求头、localStorage 与 sessionStorage。

## 3. Hook 定位入口（Hook-preferred）

Hook 不暂停页面执行，比断点更适合自动化工作流。优先用它找回 `document.cookie` / `fetch` / `xhr` / `WebSocket` 的真实调用链。

### 3.1 `create_hook` → `inject_hook` → `get_hook_data`

```bash
# 1. 创建 hook 脚本（不注入）
proxycli call create_hook --type cookie --action log --hook-id hook_cookie
proxycli call create_hook --type fetch --action log --hook-id hook_fetch --capture '{"args":true,"returnValue":true,"stack":true}'

# 2. 注入页面（persistent=true 注册到当前 BrowserContext，跨导航保留）
proxycli call inject_hook --hook-id hook_cookie --script "<hook script>" --persistent true

# 3. 触发目标业务动作后读取采样
proxycli call get_hook_data --hook-id hook_cookie --view summary
proxycli call get_hook_data --hook-id hook_cookie --view detail --max-records 20
```

| 工具 | 关键参数 | 说明 |
| --- | --- | --- |
| `create_hook` | `--type`（fetch/xhr/cookie/websocket/localStorage/console/timer/eval/cryptojs/jsencrypt/smcrypto）、`--action`（log/block/modify/passthrough）、`--hook-id`、`--capture`、`--condition` | 生成 hook 脚本与 hookId |
| `inject_hook` | `--hook-id`、`--script`（必填）、`--persistent`、`--world`（main/isolated） | 注入页面 |
| `get_hook_data` | `--hook-id`、`--view`（raw/summary/detail）、`--max-records`、`--type`、`--event`、`--phase` | 读采样数据 |

`get_hook_data` 的 `detail` 视图会附带 `candidateEnvNeeds`（候选环境需求），直接可用作补环境缺口清单。

### 3.2 `hook_function` — 直接 Hook 单个函数

```bash
proxycli call hook_function --target "XMLHttpRequest.prototype.open" --log-args true --log-stack true
proxycli call hook_function --target "window.app.api.request"
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--target` | string（必填） | 全局函数名 / 对象方法 / 路径 |
| `--log-args` | boolean | 记录参数，默认 true |
| `--log-result` | boolean | 记录返回值，默认 true |
| `--log-stack` | boolean | 记录调用栈，默认 false |
| `--hook-id` | string | 自定义标识，默认取 target |

记录落到控制台，配合 `proxycli call list_console_messages` 查看。

### 3.3 `inject_preload_script` — 页面加载前注入

```bash
proxycli call inject_preload_script --preset log-cookies
proxycli call inject_preload_script --preset capture-all-fetch
proxycli call inject_preload_script --script "<自定义脚本>"
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--script` | string | 自定义预加载脚本 |
| `--preset` | enum `capture-all-fetch`/`capture-all-xhr`/`capture-all-requests`/`log-cookies` | 预设模板，与 `--script` 互斥 |

用于同步加载的 SDK 已持有原生引用、事后 Hook 太晚的场景；配合 `navigate_page --type reload` 重新初始化。

### 3.4 `hook_jsvmp_interpreter` — JSVMP 站点专用

```bash
proxycli call hook_jsvmp_interpreter --mode transparent --script_url "app.js" --persistent true
proxycli call hook_jsvmp_interpreter --mode proxy --track_props true --proxy_objects '["navigator","screen","performance"]'
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--script_url` | string | 用于调用栈过滤的目标脚本 URL 子串 |
| `--mode` | enum `proxy`/`transparent` | proxy 覆盖全但可检测；transparent 仅观察原型 getter |
| `--persistent` | boolean | 跨导航保留，默认 true |
| `--track_calls` / `--track_props` / `--track_reflect` | boolean | proxy 模式下追踪开关 |
| `--proxy_objects` | string[] | proxy 模式下要代理的 window 属性名 |
| `--max_entries` | number | `window.__mcp_jsvmp_log` 最大记录数 |

## 4. 差异分析与补丁建议

把本地运行时报错映射成缺失能力与下一步补丁：

```bash
proxycli call diff_env_requirements --runtime-error "navigator is not defined" --observed-capabilities '["navigator","document","localStorage"]'
proxycli call diagnose_environment
```

| 工具 | 参数 | 说明 |
| --- | --- | --- |
| `diff_env_requirements` | `--runtime-error`（string 必填）、`--observed-capabilities`（string[]） | 分析运行时错误 vs 浏览器能力差异，建议 nextPatches |
| `diagnose_environment` | `--checks`（string[]） | 检查 Node 版本、构建产物、AI 配置、artifacts 目录 |

## 5. 导出重建 bundle

把采集到的代码、环境补丁、入口文件打包为可独立运行的 Node 重建包：

```bash
proxycli call export_rebuild_bundle --auto-generate true --task-id t1 --target-url "https://example.com" --goal "还原签名参数"
proxycli call export_rebuild_bundle --task-id t1 --entry-code "<entry>" --env-code "<env>" --polyfills-code "<poly>" --capture '{"ua":"..."}'
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--auto-generate` | boolean | 自动从浏览器收集代码与运行时证据生成重建包 |
| `--task-id` / `--task-slug` | string | 任务标识，默认 `default` |
| `--target-url` / `--goal` | string | 目标 URL 与目标描述 |
| `--target-keywords` / `--target-url-patterns` / `--target-function-names` | string[] | 自动生成时的目标过滤 |
| `--target-action-description` | string | 目标业务动作描述 |
| `--max-evidence-items` | number | 证据条数上限，默认 20 |
| `--entry-code` / `--env-code` / `--polyfills-code` | string | 手动模式必填 |
| `--capture` | object | 采集数据快照 |
| `--notes` | string[] | 备注 |

产物写入 `artifacts/tasks/<task-id>/env/{entry.js,env.js,polyfills.js,capture.json}` 与 `report.md`。

## 6. 源码搜索与脚本源码

定位目标参数生成逻辑时用：

```bash
proxycli call list_scripts
proxycli call search_in_sources --query "webdriver" --file-path ./out
proxycli call search_in_sources --query "getRandomValues" --is-regex true --max-results 50
proxycli call get_script_source --script-id 42 --file-path ./out/target.js
proxycli call get_script_source --script-id 42 --start-line 100 --end-line 200
```

| 工具 | 参数 | 说明 |
| --- | --- | --- |
| `list_scripts` | - | 列出已加载脚本 |
| `search_in_sources` | `--query`、`--case-sensitive`、`--is-regex`、`--max-results`、`--exclude-minified`、`--file-path` | 源码全文搜索 |
| `get_script_source` | `--script-id`、`--file-path`、`--start-line`、`--end-line` | 取脚本源码到本地 |

`get_script_source` / `search_in_sources` 不传 `--file-path` 时默认把源码写到当前工作目录（`<pwd>/<scriptId>.js`）。

## 7. 反检测（可选，先 Observe 再决定）

只有确认目标站点需要时才用，不要默认全开（代理本身可能成为检测信号）：

```bash
proxycli call list_stealth_features
proxycli call list_stealth_presets
proxycli call inject_stealth --preset "<preset>"
proxycli call set_user_agent --user-agent "<UA string>"
```

| 工具 | 参数 | 说明 |
| --- | --- | --- |
| `list_stealth_features` | - | 列出隐身特性开关 |
| `list_stealth_presets` | - | 列出隐身预设 |
| `inject_stealth` | `--preset` | 注入反检测脚本（隐藏 webdriver、伪装 chrome、canvas 噪点等） |
| `set_user_agent` | `--user-agent`（string 必填） | 通过 CDP 覆盖 UA |

## 8. 网络与 WebSocket（配合观察）

补环境常需确认参数最终写到请求头/请求体还是 WebSocket：

```bash
proxycli call list_network_requests
proxycli call get_network_request --request-id "<id>"
proxycli call list_websocket_connections
proxycli call get_websocket_messages --connection-id "<id>"
```

## 9. 端到端最小流程

```bash
# 0. 确认 worker 在线
proxycli status

# 1. 打开目标站
proxycli call navigate_page --url "https://example.com" --type url

# 2. 采集真实环境基准
proxycli call compare_env --properties '["navigator.userAgent","navigator.webdriver","document.all"]'
proxycli call get_storage --type all

# 3. Hook 定位参数生成入口
proxycli call create_hook --type cookie --action log --hook-id hk_cookie
proxycli call inject_hook --hook-id hk_cookie --script "<script>" --persistent true
proxycli call navigate_page --type reload          # 让 hook 覆盖同步初始化
proxycli call get_hook_data --hook-id hk_cookie --view detail

# 4. 差异分析 → 补丁建议
proxycli call diff_env_requirements --runtime-error "..." --observed-capabilities '["navigator","document"]'

# 5. 导出重建 bundle
proxycli call export_rebuild_bundle --auto-generate true --task-id t1 --target-url "https://example.com" --goal "还原签名"
```

补环境仍然遵循 `Observe-first` → `Hook-preferred` → `Breakpoint-last`：先用上面的采集/Hook 命令拿到真实证据，再决定补哪些模块；只有 Hook 不够时才下沉到断点（`set_breakpoint` 等 debugger 工具）。
