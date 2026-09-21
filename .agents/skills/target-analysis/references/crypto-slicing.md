# 加密切片规则

原 `src/modules/analyzer/ai/CryptoScriptExtractor.ts` 的确定性规则。从 Hook 记录的调用栈定位加密函数所在行，再取源码上下文。

## 调用栈解析

逐行找第一个匹配的 JS 帧：

```text
/^\s*at\s+(?:(.+?)\s+\()?([^()\s]+):(\d+):(\d+)\)?\s*$/
```

要求：文件以 `.js` 结尾，line/column 为正整数；`functionName` 可为空。

## 源码上下文

按 1-based 行号取 `max(1, line - radius)` 到 `line + radius`，默认 `radius = 10`，每行前缀行号便于引用。源码取不到时用 `"[source unavailable]"`。

源码来源：`get_script_source --scriptId <id>`，或按 URL 从已采集缓存取（原 `collector.getFileByUrl`）。

## 输出结构（CryptoSnippet）

```json
{
  "functionName": "encrypt",
  "hookType": "crypto",
  "file": "https://…/app.js",
  "line": 1234,
  "column": 8,
  "sourceSnippet": "1230| …\n…",
  "argsPreview": "…",
  "resultPreview": "…"
}
```

Hook 记录可由 `get_hook_data --view detail` 获取，其 `callStack` 字段即解析输入。
