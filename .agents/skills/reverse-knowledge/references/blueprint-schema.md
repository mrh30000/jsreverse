# 蓝图库数据契约（blueprint schema）

> **本文件是蓝图库文件结构的唯一权威源。** 其它文档（`SKILL.md`、各蓝图 `workflow.md`）只引用本文件，不重复定义字段。
> 校验器：`node scripts/blueprint-lint.js`（结构与溯源），检索器：`node scripts/query-blueprint.js`。

## 1. 目录布局

蓝图库**必须自包含在技能目录内**（这样技能被复制到任何位置都能跑）：

```
<skill-root>/
├── data/blueprints/
│   ├── index.json                  # 唯一入口，列出全部蓝图
│   ├── douyin-a-bogus/
│   │   ├── metadata.json           # 必填
│   │   ├── parts.json              # 建议填
│   │   ├── mutations.json          # 建议填
│   │   └── workflow.md             # 建议填
│   └── jd-h5st/…
└── scripts/{query-blueprint.js, blueprint-lint.js}
```

数据目录解析顺序（`query-blueprint.js` 与 `blueprint-lint.js` 一致，命中第一个存在的）：

1. `--data <dir>`
2. 环境变量 `REVERSE_KNOWLEDGE_DATA`
3. `<skill-root>/data/blueprints` ← **推荐，自包含**
4. `<repo-root>/docs/knowledge/parameter-blueprints`（历史兼容路径，已废弃）
5. `<cwd>/docs/knowledge/parameter-blueprints`

用 `node scripts/query-blueprint.js --where` 可打印实际命中的目录与来源。

> **历史坑（B17 修复）**：早期版本把数据目录硬编码为 `<脚本目录>/../../../docs/knowledge/parameter-blueprints`，
> 而该目录**从未被创建**，且 `../../../` 从 `scripts/` 往上只到 `.claude/`（少一级），
> 于是 `--list` 必然 `ENOENT` 崩溃。任何"脚本引用了外部资源"的技能，都要有一条**"该资源真实存在"的机械断言**
> （本库由 `blueprint-lint.js` 的 index 存在性检查 + `--selftest` 的 S13/S14 兜住）。

## 2. `index.json`

```json
{
  "schemaVersion": 1,
  "blueprints": [
    {
      "id": "douyin-a-bogus",
      "path": "douyin-a-bogus",
      "title": "抖音 / 头条 a_bogus 签名",
      "category": "platform-signature",
      "status": "active",
      "summary": "≤60 字，一句话说清这是什么参数",
      "aliases": ["a_bogus", "ab"],
      "keywords": ["抖音", "douyin", "a_bogus"]
    }
  ]
}
```

- `id`：小写字母数字与 `. _ -`，**全库唯一**，同时作为 `--id` 的检索键。
- `path`：蓝图库内相对路径，**不得**是绝对路径或含 `..`。
- `aliases`：精确匹配（`--id` 可用别名）；`keywords`：模糊打分（`-q`）。
- 磁盘上存在但未被 `index.json` 引用的目录 = **孤儿**，lint 会 warn（防止"写了文档但没登记"）。

## 3. `metadata.json`

必填字符串字段：`id` `title` `category` `status` `version` `summary`。

| 字段 | 说明 |
| :--- | :--- |
| `id` | **必须与 index 条目一致**（lint 强校验，不一致直接 error） |
| `category` | `platform-signature` / `platform-token` / `platform-request-params` / `platform-protocol` / `platform-antibot` / `generic` |
| `status` | `active`（近期样本仍有效）/ `historical`（明确已失效）/ `unknown` / `partial`（只还原了一部分） |
| `aliases` | 字符串数组 |
| `algorithm` | 可选，`{family, detail, key_material, output_encoding, output_length}`；`family` ∈ `hash`/`hmac`/`symmetric`/`asymmetric`/`national`/`table`/`xor`/`custom`/`none`/`unknown`（`unknown` = 源文章只给定位不给算法，如实标注优于硬归类） |
| `sources` | **来源可追溯性**：`[{file, line, quote, verified_in_article}]`；`file` 是**仓库相对路径**（如 `docs/references/xxx.md`），lint 会逐个 `stat`；`line` 若给出必须是正整数 |
| `notes` | 可选自由文本 |

> `sources` 是本库的**溯源红线**：没有来源的蓝图等于"凭印象写的"，lint 会 warn。
> 若某个结论来自多篇文章，**逐篇列出**；若两篇冲突，用 `contradictions` 显式记录，不要悄悄选一个。

## 4. `parts.json`

```json
{ "parts": [ { "name": "wts", "role": "时间戳", "source": "Math.round(Date.now()/1e3)", "example": "1756000000" } ] }
```

- `parts[].name` **必填且不得重复**（lint 强校验）。
- 参数名要**逐字**抄：`X-s` 与 `x-s`、`a_bogus` 与 `a-bogus` 是不同字符串。

## 5. `mutations.json`

```json
{ "mutations": [ { "name": "时间戳单位", "rule": "秒，不是毫秒", "symptom_if_wrong": "签名恒错但无报错" } ] }
```

- `mutations` **必须是非空数组**；每项 `name` 必填。
- `symptom_if_wrong` 是本库最有价值的一栏：**"错在哪里、错成什么样"**。
  只写规则不写症状的条目，对排错没有帮助。

## 6. `workflow.md`

- 非空，且建议 ≥2 条**可执行**步骤（lint 会数编号/项目符号行）。
- 每条尽量带**具体动作**（下什么断点、搜什么字符串、跑什么命令），而不是"分析代码"这类空话。

## 7. 校验与检索

```bash
# 结构 + 溯源校验（exit 1 = 有 error）
node scripts/blueprint-lint.js
node scripts/blueprint-lint.js --json

# 检索
node scripts/query-blueprint.js --list
node scripts/query-blueprint.js --id jd-h5st
node scripts/query-blueprint.js -q "抖音 resource list 签名"
```

两个脚本都自带 `--selftest`，且**自检里包含"必须失败"的分支**（坏索引、悬空来源、空 mutations、非法行号、
孤儿目录…）。**新增蓝图后必须跑 lint，不允许只跑 `--list` 看着有输出就算过。**
