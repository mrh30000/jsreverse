#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = { python: 'python', installDir: '', install: false, installPackage: false, json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--python') args.python = argv[++i] || 'python';
    else if (a === '--install-dir') args.installDir = argv[++i] || '';
    else if (a === '--install') args.install = true;
    else if (a === '--install-package') args.installPackage = true;
    else if (a === '--json') args.json = true;
    else if (a === '--markdown') args.markdown = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  if (!args.json && !args.markdown) args.markdown = true;
  return args;
}

function usage() {
  return `用法：
  node scripts/install_ruyipage_runtime.js --python python --install-dir <ruyipage-browsers-dir> --markdown
  node scripts/install_ruyipage_runtime.js --python python --install-dir <ruyipage-browsers-dir> --install --markdown
  node scripts/install_ruyipage_runtime.js --python python --install-dir <ruyipage-browsers-dir> --install-package --install --markdown

说明：默认只输出安装计划，不执行下载 / 安装。只有用户明确确认并提供安装目录后，才添加 --install。
注意：--install-package 会修改当前 Python 环境，必须先获得用户确认。`;
}

function run(cmd, args, timeout = 120000) {
  const ret = spawnSync(cmd, args, { encoding: 'utf8', timeout, windowsHide: true });
  return {
    ok: ret.status === 0,
    status: ret.status,
    stdout: (ret.stdout || '').trim(),
    stderr: (ret.stderr || '').trim(),
    error: ret.error ? ret.error.message : '',
    command: [cmd].concat(args.map(quoteIfNeeded)).join(' '),
  };
}

function quoteIfNeeded(s) {
  s = String(s);
  return /\s/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function exists(p) {
  try { return !!p && fs.existsSync(p); } catch { return false; }
}

function checkPackage(python) {
  const code = 'import ruyipage, json; print(json.dumps({"ok": True, "version": getattr(ruyipage, "__version__", "")}, ensure_ascii=False))';
  const ret = run(python, ['-c', code], 20000);
  if (!ret.ok) return { ok: false, version: '', error: ret.stderr || ret.error || ret.stdout };
  try {
    const parsed = JSON.parse(ret.stdout.replace(/^\uFEFF/, ''));
    return { ok: true, version: parsed.version || '', error: '' };
  } catch (err) {
    return { ok: false, version: '', error: err.message || String(err) };
  }
}

function assertInstallDir(dir) {
  if (!dir) throw new Error('必须提供 --install-dir；不要在未确认目录时安装 ruyiPage 定制 Firefox runtime。');
  const resolved = path.resolve(dir);
  const parsed = path.parse(resolved);
  if (resolved === parsed.root) throw new Error('安装目录不能是磁盘根目录。请提供专用目录，例如 <工作目录>/tools/ruyipage-browsers。');
  return resolved;
}

function verifyAfterInstall(python, installDir) {
  const script = path.join(__dirname, 'check_external_tools.js');
  const ret = run(process.execPath, [script, '--python', python, '--ruyipage-install-dir', installDir, '--json'], 60000);
  let parsed = null;
  try { parsed = JSON.parse(ret.stdout.replace(/^\uFEFF/, '')); } catch { parsed = null; }
  return { command: ret.command, ok: ret.ok, stdout: ret.stdout, stderr: ret.stderr || ret.error, parsed };
}

function commandPlan(args, installDir, pkg) {
  const commands = [];
  if (!pkg.ok) commands.push(`${args.python} -m pip install ruyiPage requests --upgrade`);
  else commands.push(`${args.python} -m pip install requests --upgrade`);
  commands.push(`${args.python} -m ruyipage install --install-dir "${installDir}"`);
  commands.push(`node scripts/check_external_tools.js --python ${args.python} --ruyipage-install-dir "${installDir}" --markdown`);
  return commands;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) return { help: usage() };
  const installDir = assertInstallDir(args.installDir);
  const pkgBefore = checkPackage(args.python);
  const result = {
    dryRun: !args.install,
    python: args.python,
    installDir,
    packageBefore: pkgBefore,
    packageInstallAttempted: false,
    runtimeInstallAttempted: false,
    commands: commandPlan(args, installDir, pkgBefore),
    steps: [],
    verify: null,
    success: false,
  };

  if (!args.install) {
    result.steps.push('当前为安装计划，不执行下载或安装。请用户确认后再添加 --install。');
    result.success = true;
    return result;
  }

  fs.mkdirSync(installDir, { recursive: true });

  let pkg = pkgBefore;
  if (!pkg.ok && args.installPackage) {
    result.packageInstallAttempted = true;
    const pip = run(args.python, ['-m', 'pip', 'install', 'ruyiPage', 'requests', '--upgrade'], 180000);
    result.steps.push(`安装 ruyiPage Python 包与 requests 依赖：${pip.ok ? '成功' : '失败'}\n${pip.stdout || pip.stderr || pip.error}`.trim());
    pkg = checkPackage(args.python);
  } else if (pkg.ok && args.installPackage) {
    result.packageInstallAttempted = true;
    const pip = run(args.python, ['-m', 'pip', 'install', 'requests', '--upgrade'], 180000);
    result.steps.push(`安装 / 更新 smart_fingerprint requests 依赖：${pip.ok ? '成功' : '失败'}\n${pip.stdout || pip.stderr || pip.error}`.trim());
  }

  if (!pkg.ok) {
    result.steps.push('未安装 ruyiPage Python 包，已停止 runtime 安装。若用户确认允许修改 Python 环境，请重新添加 --install-package。');
    result.verify = verifyAfterInstall(args.python, installDir);
    result.success = false;
    return result;
  }

  result.runtimeInstallAttempted = true;
  const install = run(args.python, ['-m', 'ruyipage', 'install', '--install-dir', installDir], 900000);
  result.steps.push(`安装 ruyiPage 定制 Firefox runtime：${install.ok ? '成功' : '失败'}\n${install.stdout || install.stderr || install.error}`.trim());
  result.verify = verifyAfterInstall(args.python, installDir);
  result.success = !!(result.verify && result.verify.parsed && result.verify.parsed.ruyiPage && result.verify.parsed.ruyiPage.managedRuntimeVerified);
  return result;
}

function renderMarkdown(result) {
  if (result.help) return result.help + '\n';
  const lines = ['# ruyiPage 定制 Firefox runtime 安装流程', ''];
  lines.push(`- dry-run：${result.dryRun ? '是' : '否'}`);
  lines.push(`- Python：${result.python}`);
  lines.push(`- 安装目录：${result.installDir}`);
  lines.push(`- ruyiPage Python 包：${result.packageBefore.ok ? '已安装' : '未检测到'}`);
  if (result.packageBefore.version) lines.push(`- ruyiPage 版本：${result.packageBefore.version}`);
  lines.push('', '## 将执行 / 已执行的命令');
  for (const cmd of result.commands) lines.push('- `' + cmd + '`');
  if (result.steps.length) {
    lines.push('', '## 执行记录');
    for (const step of result.steps) lines.push(`- ${step.replace(/\n/g, '\n  ')}`);
  }
  if (result.verify) {
    lines.push('', '## 安装后验证');
    lines.push('- 验证命令：`' + result.verify.command + '`');
    lines.push(`- 验证命令是否成功：${result.verify.ok ? '是' : '否'}`);
    const rp = result.verify.parsed && result.verify.parsed.ruyiPage;
    if (rp) {
      lines.push(`- 定制 Firefox runtime 是否通过验证：${rp.managedRuntimeVerified ? '是' : '否'}`);
      if (rp.runtimeExecutable) lines.push(`- 已验证 Firefox：${rp.runtimeExecutable}`);
      if (rp.conclusion) lines.push(`- 结论：${rp.conclusion}`);
    } else if (result.verify.stderr) {
      lines.push(`- 验证错误：${result.verify.stderr}`);
    }
  }
  lines.push('', `## 结果：${result.success ? '通过' : '未通过 / 待用户确认'}`);
  if (result.dryRun) lines.push('- 当前仅输出计划；若用户确认未安装并提供该目录，再运行带 --install 的命令。');
  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  const result = args.help ? { help: usage() } : main();
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
