# browsercli 工具引用

**REQUIRED SUB-SKILL:** 使用 `browsercli` 获取完整、最新的命令契约。本页只保留 AST 反混淆所需的最小工具链。

## 采集目标脚本

先确认 Worker 和页面状态，再定位脚本。优先搜索特征，避免无条件导出全部源码。

```bash
browsercli status
browsercli call list_pages
browsercli call list_scripts --filter <url-or-name>
browsercli call search_in_sources --query <pattern> [--urlFilter <pattern>]
browsercli call get_script_source --scriptId <id> --filePath <artifacts/tasks/task-id/input.js>
```

只读取局部源码时，给 `get_script_source` 同时传 `--startLine` 和 `--endLine`。需要按页面聚合保存脚本时使用：

```bash
browsercli call collect_code --url <url> --smartMode priority --returnMode summary
```

## 补充 Target 脚本

常规脚本列表没有覆盖 Worker 或其他 Chromium Target 时：

```bash
browsercli call list_targets
browsercli call dump_target_scripts --targetId <target-id>
```

`targetId` 必须来自同一会话中的 `list_targets` 结果。

## 运行时验证

在原页面观察关键函数的输入输出，用证据校验静态改写；不要把未经审查的流水线输出直接注入页面执行。

```bash
browsercli call hook_function --target <function-path> --hookId <hook-id>
browsercli call get_hook_data --hookId <hook-id> --view detail
browsercli call list_network_requests --urlFilter <pattern>
browsercli call get_request_initiator --requestId <request-id>
```

验证目标是确认关键参数、返回值和请求行为保持一致，而不是仅比较格式化后的源码文本。

## 记录证据

`record_reverse_evidence` 已随 `src/tools/analyzer` 下线。证据改为由 Agent 直接写入任务目录 `artifacts/tasks/<task-id>/`（结构化 JSON/Markdown 均可），不要依赖工具落盘：

```bash
mkdir -p artifacts/tasks/<task-id>
# 用编辑器/脚本把脚本 ID、URL、检测结果、流水线产物与运行时差异写进
# artifacts/tasks/<task-id>/evidence.md（或 evidence.json）
```

不要记录真实 Cookie、Storage、生产凭证或未脱敏的请求数据。
