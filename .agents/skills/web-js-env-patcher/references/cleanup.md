# 临时产物清理规范

当创建临时文件、测试文件、浏览器产物、缓存文件、中间产物或 case 目录时，使用本文件约束清理行为。

## 总原则

- **测试完成立即清理**：每次脚本测试、功能验证、浏览器取证小步骤完成后，第一时间清理本步骤产生的测试文件、临时文件、缓存文件、中间产物和空目录，不要等整个项目结束。
- **产物先沉淀再删除**：删除前先把有价值结论写入 `notes/`、`result/` 或最终报告；确认无价值的原始临时文件再清理。
- **临时内容集中存放**：测试文件必须放入系统临时目录或 `case/tmp/` / `case/.tmp/` / `case/cache/` 等可清理目录；不要把 throwaway 文件散落在项目根目录。
- **脚本测试使用 finally**：编写测试命令时使用 `try/finally` 或等价逻辑，确保失败时也删除临时目录。
- **每次交付前复查**：最终回复用户前，必须执行一次清理 dry-run 或说明未执行原因；若 dry-run 发现普通临时产物，应立即 `--force` 清理并再次 dry-run。最终交付还必须运行 `check_env_realism.js` 和 `check_final_artifact.js`，确认补环境真实性 / RuyiTrace 证据完整，且 `result/` 是规范项目目录、只有一个执行入口、没有多余测试文件、临时文件或自动化代码。
- **敏感材料例外**：登录态 Profile、Cookie、localStorage、IndexedDB、Authorization 等敏感材料不自动删除或交付；删除前必须确认用户意图。

## 目录约定

建议 case 结构：

```text
case/
├── js/
│   ├── original/
│   ├── pretty/
│   └── extracted/
├── requests/
├── fixtures/
├── notes/
└── tmp/
```

默认 `tmp/`、`.tmp/`、`temp/`、`.temp/`、`cache/`、`.cache/`、`browser-temp/`、`downloads/failed/`、`__pycache__/`、`.pytest_cache/` 等都是可清理目录。最终产物应尽量简洁，只保留必要内容。

最终 `result/` 目录应是规范项目目录，可以包含必要源码模块和配置模板，但只能有一个执行入口：

```text
result/
├── final.js
├── package.json
├── config.example.json
└── src/
```

或用户明确选择 Python 请求客户端时：

```text
result/
├── final.py
├── requirements.txt
├── config.example.json
└── src/
```

不要把临时 runner、测试脚本、trace、HAR、hook、截图、浏览器 Profile、`server.js`、`bridge.py` 留在最终交付目录。`env`、`signer`、`request` 等代码可以作为 `src/` 下的被调用模块保留，但不得成为第二执行入口。

## 应清理的临时文件

| 类型 | 清理时机 |
|---|---|
| 测试用输入 / 输出文件 | 单个测试命令完成后立即清理 |
| 失败的 JS 下载文件 | JS 文件收集阶段结束后立即清理 |
| 临时格式化文件 | 正式 pretty 文件生成后立即清理 |
| hook 脚本 / 指纹采样 Hook | 调用栈或指纹终端 API 返回值确认并沉淀到 notes / fixtures 后立即清理 |
| 临时 trace / JSONL / 调试日志 | 关键结论写入 notes 后立即清理 |
| 临时 runner / scratch 脚本 | 正式 runner 生成或测试完成后立即清理 |
| 重复样本副本 | fixtures 整理完成后立即清理 |
| cache / `.cache` / `__pycache__` / `.pytest_cache` | 对应测试或脚本执行后立即清理 |
| 空文件 / 空目录 | 每个测试或阶段结束时立即清理 |
| 无登录态浏览器 Profile | 浏览器取证阶段结束后清理 |

## 敏感文件

以下文件按敏感材料处理：

- 包含登录态的浏览器 Profile。
- Cookie / localStorage / sessionStorage 导出。
- Authorization 请求头。
- 含真实 Cookie 或账号标识的 HAR。
- 包含隐私账号信息的截图。

默认不要把这些内容放入最终交付物，除非用户明确要求。优先做脱敏处理。

## 清理检查表

```markdown
## 清理检查

- [ ] 本次测试是否使用系统临时目录或 `case/tmp/`？
- [ ] 单个测试完成后是否立即清理测试文件？
- [ ] 是否删除临时失败下载文件？
- [ ] 是否删除临时 hook 脚本？
- [ ] 是否删除指纹采样 Hook，且只保留必要 fingerprint fixture？
- [ ] 是否删除无用日志？
- [ ] 是否删除缓存目录和中间产物？
- [ ] 是否删除空目录？
- [ ] 是否只保留必要请求样本？
- [ ] 是否只保留必要 JS 文件？
- [ ] 是否已将关键结论写入 notes？
- [ ] 是否确认登录态 Profile 的处理方式？
- [ ] 是否避免 Cookie / token 明文进入最终报告？
- [ ] `result/` 是否是规范项目目录，且只有 `final.js` 或 `final.py` 一个执行入口？
- [ ] 最终项目所有源码是否不包含 ruyiPage / Playwright / Puppeteer / Selenium / CloakBrowser 等自动化代码？
- [ ] 最终请求是否由 Node.js / Python HTTP 客户端实现？
- [ ] 是否已运行 `check_env_realism.js` 检查补环境真实性和 RuyiTrace 证据？
- [ ] 是否已运行 `check_final_artifact.js`？
- [ ] 最终回复前是否重新运行 dry-run 确认无普通临时产物残留？
```

## 脚本用法

先预览：

```bash
node scripts/clean_case.js --case-dir case --dry-run --markdown
```

清理普通临时文件：

```bash
node scripts/clean_case.js --case-dir case --force --markdown
```

只有用户明确确认后，才删除 Profile：

```bash
node scripts/clean_case.js --case-dir case --force --include-profiles --markdown
```

清理后复查：

```bash
node scripts/clean_case.js --case-dir case --dry-run --json
```

期望 `remainingTempLike` 为空；如果不为空，说明仍有普通临时 / 缓存 / 中间产物残留，需要继续处理。

补环境真实性复查：

```bash
node scripts/check_env_realism.js --case-dir case --markdown
```

最终产物复查：

```bash
node scripts/check_final_artifact.js --case-dir case --markdown
```
