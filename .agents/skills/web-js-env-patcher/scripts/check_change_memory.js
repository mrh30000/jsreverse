#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = [
  '修改前逻辑',
  '问题证据',
  '本次修改',
  '修改理由',
  '已失败尝试',
  '禁止回退',
  '验证命令',
  '验证结果',
  '当前验证范围',
  '遗留风险',
  '当前状态',
];

function parseArgs(argv) {
  const args = {
    caseDir: 'case',
    changed: [],
    init: false,
    requireEntry: false,
    json: false,
    markdown: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--case-dir' || a === '--dir' || a === '-d') args.caseDir = argv[++i] || '';
    else if (a === '--changed' || a === '--file') args.changed.push(argv[++i] || '');
    else if (a === '--init') args.init = true;
    else if (a === '--require-entry') args.requireEntry = true;
    else if (a === '--json') args.json = true;
    else if (a === '--markdown') args.markdown = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  return args;
}

function usage() {
  return `用法：
  node scripts/check_change_memory.js --case-dir case --init --markdown
  node scripts/check_change_memory.js --case-dir case --markdown
  node scripts/check_change_memory.js --case-dir case --changed result/src/env/install-env.js --require-entry --markdown
  node scripts/check_change_memory.js --case-dir case --changed result/src/signer/index.js --json

说明：检查复杂 case 是否维护 case/notes/代码变更记忆.md，并确认关键源码修改后记录了修改原因、失败尝试、禁止回退、验证范围和遗留风险。`;
}

function normalizeSlash(v) {
  return String(v || '').replace(/\\/g, '/');
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function memoryPath(caseDir) {
  return path.join(path.resolve(caseDir), 'notes', '代码变更记忆.md');
}

function createTemplate() {
  return `# 代码变更记忆

本文件由通用代码变更记忆机制维护，用于记录复杂 case 中关键源码修改的事实、原因、失败尝试、禁止回退、验证范围和遗留风险。不要把“当前报错消失”直接写成永久结论。

## 使用规则

- 修改关键源码前先读取本文件，并搜索文件名、函数名、错误关键词和参数名。
- 修改关键源码后立即追加一条“变更”记录。
- 不删除失败记录；如历史记录被新证据替代，新增记录说明替代原因。
- 状态只能使用：临时修复 / 当前验证通过 / 已失败 / 被替代 / 稳定基线。

## 变更 001 - 待填写

- 时间：YYYY-MM-DD HH:mm
- 涉及文件：
- 涉及函数 / 模块：
- 当前状态：临时修复

### 修改前逻辑

待填写。

### 问题证据

待填写。

### 本次修改

待填写。

### 修改理由

待填写。

### 已失败尝试

待填写。

### 禁止回退

待填写。

### 验证命令

\`\`\`bash
# 待填写
\`\`\`

### 验证结果

待填写。

### 当前验证范围

待填写。

### 遗留风险

待填写。
`;
}

function initMemory(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!exists(file)) {
    fs.writeFileSync(file, createTemplate(), 'utf8');
    return 'created';
  }
  return 'kept';
}

function hasEntry(text) {
  return /^##\s+变更\s+\d+/m.test(text);
}

function fieldMissing(text) {
  return REQUIRED_FIELDS.filter(field => !text.includes(field));
}

function changedMatched(text, changedFile) {
  const normalized = normalizeSlash(changedFile).replace(/^\.\//, '');
  const basename = path.basename(normalized);
  const textSlash = normalizeSlash(text);
  if (normalized && textSlash.includes(normalized)) return true;
  if (basename && textSlash.includes(basename)) return true;
  return false;
}

function check(args) {
  const caseDir = path.resolve(args.caseDir || 'case');
  const file = memoryPath(caseDir);
  const problems = [];
  const warnings = [];
  const actions = [];

  if (args.init) actions.push({ action: initMemory(file), path: file });

  if (!exists(file)) {
    problems.push(`未找到通用代码变更记忆文件：${file}`);
    return {
      caseDir,
      memoryFile: file,
      exists: false,
      clean: false,
      actions,
      requiredFields: REQUIRED_FIELDS,
      missingFields: REQUIRED_FIELDS.slice(),
      changed: args.changed,
      matchedChanged: [],
      problems,
      warnings,
    };
  }

  const text = fs.readFileSync(file, 'utf8');
  const missingFields = fieldMissing(text);
  if (missingFields.length) problems.push(`代码变更记忆缺少必要字段：${missingFields.join('、')}`);

  const entryExists = hasEntry(text);
  if (args.requireEntry && !entryExists) problems.push('已要求至少一条变更记录，但未发现 “## 变更 001” 这类记录。');
  if (!entryExists) warnings.push('尚未发现正式变更记录；如果已经修改关键源码，请立即追加记录。');

  const matchedChanged = [];
  for (const changed of args.changed.filter(Boolean)) {
    const matched = changedMatched(text, changed);
    matchedChanged.push({ file: changed, matched });
    if (args.requireEntry && !matched) {
      problems.push(`已修改关键文件但代码变更记忆中未提到该文件：${changed}`);
    } else if (!matched) {
      warnings.push(`代码变更记忆中未提到变更文件：${changed}`);
    }
  }

  if (/正确方案/.test(text)) {
    warnings.push('发现“正确方案”表述；建议改为“当前验证通过 / 稳定基线”，并写明验证范围和遗留风险。');
  }

  return {
    caseDir,
    memoryFile: file,
    exists: true,
    clean: problems.length === 0,
    actions,
    requiredFields: REQUIRED_FIELDS,
    missingFields,
    hasEntry: entryExists,
    changed: args.changed,
    matchedChanged,
    problems,
    warnings,
  };
}

function renderMarkdown(result) {
  const lines = [
    '# 通用代码变更记忆检查',
    '',
    `- case 目录：${result.caseDir}`,
    `- 记忆文件：${result.memoryFile}`,
    `- 文件存在：${result.exists ? '是' : '否'}`,
    `- 是否通过：${result.clean ? '是' : '否'}`,
    '',
  ];

  if (result.actions.length) {
    lines.push('## 初始化动作');
    for (const item of result.actions) {
      lines.push(`- ${item.action === 'created' ? '已创建' : '已存在'}：${item.path}`);
    }
    lines.push('');
  }

  lines.push('## 必要字段');
  for (const field of result.requiredFields) {
    lines.push(`- ${field}：${result.missingFields.includes(field) ? '缺失' : '存在'}`);
  }
  lines.push('');

  if (result.matchedChanged && result.matchedChanged.length) {
    lines.push('## 变更文件命中');
    for (const item of result.matchedChanged) {
      lines.push(`- ${item.file}：${item.matched ? '已记录' : '未记录'}`);
    }
    lines.push('');
  }

  if (result.problems.length) {
    lines.push('## 问题');
    for (const p of result.problems) lines.push(`- ${p}`);
    lines.push('');
  }

  if (result.warnings.length) {
    lines.push('## 提醒');
    for (const w of result.warnings) lines.push(`- ${w}`);
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    process.exit(0);
  }
  const result = check(args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown || !args.json) process.stdout.write(renderMarkdown(result));
  process.exit(result.clean ? 0 : 1);
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
