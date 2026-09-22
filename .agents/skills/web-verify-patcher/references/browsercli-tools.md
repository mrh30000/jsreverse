# browsercli 工具引用

**REQUIRED SUB-SKILL:** 使用 `browsercli` 获取完整、最新的命令契约。本页只保留网页验证码取证所需的最小工具链；任何签名冲突都以 `browsercli list-tools --json` 为准。

## 定位与门禁

browsercli 是 JSReverser Worker 的 HTTP 控制面，不是独立的反检测浏览器。先按 `browser-acquisition.md` 让用户确认目标、授权范围和浏览器模式；这里只承接用户已确认的 **CloakBrowser + browsercli / Worker** 路线，不能静默连接默认 Chrome、普通 Playwright 或其他 CDP 浏览器。

确认前只做不启动浏览器的能力检查：

```bash
browsercli status
browsercli browser status
browsercli list-tools --json
```

Worker 离线或当前连接模式不符时，说明缺口并暂停。browsercli 不管理 Worker 进程，不要自行启动 Worker、修改配置或切换浏览器模式。当前 CLI 可能把 `list-tools --json` 渲染成非 JSON 文本；它仍是权威清单，但不要未经校验就交给 JSON 解析器。

## 连接与页面选择

优先复用已经确认模式且状态匹配的 Worker 浏览器连接：

```bash
browsercli call check_browser_health
```

已有连接时不要重连，先核对 `browsercli browser status`。如果当前未连接，`browsercli browser connect --cloak true --headless false` 使用 Worker 的 Patchright + Cloak 二进制路线，但没有 `humanize` 参数，并可能在二进制缺失时自动下载约 200 MB 文件。只有用户单独确认接受这两项差异后才能执行：

```bash
browsercli browser connect --cloak true --headless false
browsercli call check_browser_health
```

该命令不等同于 `browser-acquisition.md` 中 CloakBrowser 官方包装器 + `humanize` 的硬约束；用户坚持该硬约束时，暂停并改用官方包装器路线。只有用户明确选择持久化 profile 时才追加 `--user-data-dir <authorized-cloak-profile-dir>`；默认不要追加 `--js-stealth`、`--viewport` 或 `--full-stealth-args`。

导航属于真实网页操作，必须在模式和目标确认后执行：

```bash
browsercli call list_pages
browsercli call select_page --pageIdx <page-index>
browsercli call new_page --url <authorized-target-url> --timeout <milliseconds>
```

已有目标页时只选择页面，不要重复导航。

## CAPTCHA 状态与人工等待

`detect_captcha` 是只读检测工具，不求解、不点击页面：

```bash
browsercli call detect_captcha
browsercli call detect_captcha --action wait_for_clear --timeout 300000
```

第二条命令只用于等待用户手动完成挑战。返回结果作为页面证据，仍需结合 `classify_verify.py`、HTML、截图和网络信号判断类型与厂商。

## DOM、iframe 与截图

优先读取最小范围；DOM 文本可能含个人或账号信息，默认不取文本：

```bash
browsercli call list_frames
browsercli call select_frame --frameIdx <frame-index>
browsercli call query_dom --selector <captcha-selector> --all false
browsercli call get_dom_structure --maxDepth 4 --includeText false
browsercli call take_screenshot --filePath <artifacts/tasks/task-id/captcha.png> --fullPage false
```

`frame-index` 必须来自同一会话的 `list_frames`。截图路径使用任务产物目录，不写入 Skill 目录；保存前确认画面不包含不必要的账号、消息或支付信息。

## 网络与调用栈

先过滤列表，再按返回的数值 ID 读取 initiator；这组命令不读取完整请求头和响应体：

```bash
browsercli call list_network_requests --urlFilter <captcha-or-verify-pattern> --pageSize 50
browsercli call get_request_initiator --requestId <request-id>
```

列表中的完整 URL 也可能在查询参数中携带 token；禁止查看 token 时不要调用网络工具，其他场景在持久化前先脱敏查询参数。

`get_network_request` 会返回原始请求头、响应头、POST 数据和响应体，可能直接暴露 Cookie、Authorization 或可复用 token。用户禁止读取这些数据时不得调用；确需详情时先单独确认敏感数据读取范围，再限定到一个请求：

```bash
# 高敏读取：仅在用户另行确认范围后执行；禁止读取 Cookie、Authorization 或 token 时不要运行。
browsercli call get_network_request --reqid <request-id> --maxBodyLength 20000
```

只保留 URL、方法、状态、必要字段名、脱敏摘要和调用栈。不要记录 Cookie、Authorization、账号材料、API key、可复用 token 或完整敏感响应体。

## 脚本定位与导出

先搜索特征，避免无条件导出所有源码：

```bash
browsercli call list_scripts --filter <provider-or-widget-pattern>
browsercli call search_in_sources --query <sitekey-or-provider-pattern> --urlFilter <script-pattern>
browsercli call get_script_source --scriptId <script-id> --filePath <artifacts/tasks/task-id/scripts/input.js>
```

只读局部源码时，给 `get_script_source` 同时传 `--startLine` 和 `--endLine`。

## 禁止自动升级动作

上述命令集用于被动取证，本页的窄场景门禁优先于通用 `browsercli` skill 对 Hook 等工具的推荐。不要自动调用 `click*`、`drag`、`fill*`、`press_key`、`evaluate_script`、Hook / 断点、请求重放、`get_storage` 或会话导入导出工具。确需 Hook 时先回到 `browser-acquisition.md` 确认最小注入范围；点击、拖动、提交、Cookie / Storage 读取或其他验证动作必须按主技能再次取得用户确认。验证码答案、登录、MFA 和设备验证始终由用户手动完成。
