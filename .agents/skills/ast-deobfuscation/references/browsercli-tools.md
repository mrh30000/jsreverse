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
browsercli call get_hook_data --hookId <hook-id> --view timeline
browsercli call list_network_requests --urlFilter <pattern>
browsercli call get_request_initiator --requestId <request-id>
```

验证目标是确认关键参数、返回值和请求行为保持一致，而不是仅比较格式化后的源码文本。

## 记录证据

把脚本 ID、URL、检测结果、流水线产物和运行时差异记录到任务目录：

```bash
browsercli call record_reverse_evidence --taskId <task-id> --taskSlug <slug> --targetUrl <url> --goal <goal> --entry <entries>
```

不要记录真实 Cookie、Storage、生产凭证或未脱敏的请求数据。
