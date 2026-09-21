#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    caseDir: null,
    dryRun: false,
    force: false,
    includeProfiles: false,
    json: false,
    markdown: false,
    pruneEmpty: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--case-dir' || a === '--dir' || a === '-d') args.caseDir = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--include-profiles') args.includeProfiles = true;
    else if (a === '--no-prune-empty') args.pruneEmpty = false;
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
  node scripts/clean_case.js --case-dir case --dry-run --markdown
  node scripts/clean_case.js --case-dir case --force --markdown
  node scripts/clean_case.js --case-dir case --force --include-profiles --markdown
  node scripts/clean_case.js --case-dir case --force --no-prune-empty --json

说明：清理 case 内测试文件、临时文件、缓存文件、中间产物和空目录。默认不删除疑似登录态 Profile / Cookie / IndexedDB。`;
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function stat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function isDangerousDir(p) {
  const root = path.parse(p).root;
  const normalized = path.resolve(p);
  return normalized === root || normalized.length <= root.length + 2;
}

function normalizeSlash(p) {
  return String(p).replace(/\\/g, '/');
}

function relPath(caseDir, p) {
  const rel = path.relative(caseDir, p) || '.';
  return normalizeSlash(rel);
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function isFirefoxProfileDir(p) {
  const st = stat(p);
  if (!st || !st.isDirectory()) return false;
  let names = [];
  try { names = fs.readdirSync(p).map(name => name.toLowerCase()); } catch { return false; }
  const nameSet = new Set(names);
  const markerHits = [
    'prefs.js',
    'cookies.sqlite',
    'places.sqlite',
    'storage',
    'cache2',
    'cert9.db',
    'key4.db',
    'logins.db',
    'webappsstore.sqlite',
    'parent.lock',
    'sessionstore-backups',
  ].filter(name => nameSet.has(name)).length;
  return markerHits >= 2;
}

function isProfilePath(p) {
  const lower = normalizeSlash(p).toLowerCase();
  if (/(^|\/)(cloak-profile|camoufox-profile|camoufox-user-data|browser-profile|user-data-dir|user-data|firefox-profile|chrome-profile|ruyipage-profile|profile)(\/|$)/.test(lower)
    || /(^|\/)[^/]*profile[^/]*(\/|$)/.test(lower)
    || /(^|\/)(cookies|local storage|indexeddb|session storage)(\/|$)/.test(lower)
    || /\b(cookie|localstorage|sessionstorage|authorization|token)\b/i.test(lower)) return true;

  let cur = path.resolve(p);
  const st = stat(cur);
  if (!st || !st.isDirectory()) cur = path.dirname(cur);
  while (true) {
    if (isFirefoxProfileDir(cur)) return true;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return false;
}

function isDisposableDirName(name) {
  const n = name.toLowerCase();
  return [
    'tmp', '.tmp', 'temp', '.temp', 'cache', '.cache',
    '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
    'browser-temp', 'camoufox-trace', 'camoufox-values', 'failed', '.downloads', '.tmp-downloads',
  ].includes(n);
}

function isDisposableFileName(name) {
  const n = name.toLowerCase();
  if (['.ds_store', 'thumbs.db', 'desktop.ini'].includes(n)) return true;
  if (/\.(tmp|temp|bak|old|orig|retry|partial|download|crdownload|cache)$/i.test(n)) return true;
  if (/^(env-trace\.jsonl|missing-env\.json|node-output\.json|run-output\.json)$/i.test(n)) return true;
  if (/^(fingerprint-hook|.*-fingerprint-hook|hook-fingerprint).*\.(js|mjs|cjs)$/i.test(n)) return true;
  if (/^(test-|tmp-|temp-|debug-|scratch-).+\.(js|mjs|cjs|json|jsonl|log|txt|md|html|png|jpg|jpeg|webp|har)$/i.test(n)) return true;
  if (/(\.test-output|\.debug-output|\.tmp-output)\./i.test(n)) return true;
  return false;
}

function listTree(p, out = []) {
  if (!exists(p)) return out;
  const st = stat(p);
  if (!st) return out;
  if (st.isDirectory()) {
    let names = [];
    try { names = fs.readdirSync(p); } catch { names = []; }
    for (const name of names) listTree(path.join(p, name), out);
  }
  out.push(p);
  return out;
}

function listDirsDeepFirst(p) {
  const out = [];
  function visit(dir) {
    if (!exists(dir)) return;
    let names = [];
    try { names = fs.readdirSync(dir); } catch { names = []; }
    for (const name of names) {
      const child = path.join(dir, name);
      const st = stat(child);
      if (st && st.isDirectory()) visit(child);
    }
    out.push(dir);
  }
  visit(p);
  return out.sort((a, b) => b.length - a.length);
}

function hasProfileInside(p) {
  return listTree(p).some(isProfilePath);
}

function isProfileProtectedContainer(p, includeProfiles) {
  if (includeProfiles) return false;
  const st = stat(p);
  return !!st && st.isDirectory() && !isProfilePath(p) && hasProfileInside(p);
}

function hasOnlyProfileChildren(dir) {
  const st = stat(dir);
  if (!st || !st.isDirectory()) return false;
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return false; }
  if (names.length === 0) return false;
  return names.every(name => {
    const child = path.join(dir, name);
    return isProfilePath(child) || hasProfileInside(child);
  });
}

function addAction(actions, action, target, reason) {
  actions.push({ action, path: target, reason: reason || '' });
}

function removePath(target, dryRun, recursive = true) {
  if (dryRun) return;
  const st = stat(target);
  if (!st) return;
  if (st.isDirectory() && recursive) fs.rmSync(target, { recursive: true, force: true });
  else if (st.isDirectory()) fs.rmdirSync(target);
  else fs.rmSync(target, { force: true });
}

function cleanDisposableDir(caseDir, dir, args, actions) {
  if (!exists(dir)) return;
  const st = stat(dir);
  if (!st || !st.isDirectory()) return;

  if (isProfilePath(dir) && !args.includeProfiles) {
    addAction(actions, 'skip-profile', dir, '疑似登录态或浏览器 Profile，默认保留');
    return;
  }

  if (isProfileProtectedContainer(dir, args.includeProfiles)) {
    addAction(actions, 'keep-profile-container', dir, '目录内包含疑似 Profile，仅清理非敏感子项');
    let names = [];
    try { names = fs.readdirSync(dir); } catch { names = []; }
    for (const name of names) {
      const child = path.join(dir, name);
      if (isProfilePath(child) || hasProfileInside(child)) {
        addAction(actions, 'skip-profile', child, '疑似登录态或浏览器 Profile，默认保留');
        continue;
      }
      addAction(actions, args.dryRun ? 'would-delete' : 'delete', child, '清理临时目录中的非敏感子项');
      removePath(child, args.dryRun, true);
    }
    return;
  }

  addAction(actions, args.dryRun ? 'would-delete' : 'delete', dir, '清理临时 / 缓存 / 中间产物目录');
  removePath(dir, args.dryRun, true);
}

function isTempLikePath(caseDir, p, includeProfiles) {
  if (p === caseDir) return false;
  if (!includeProfiles && isProfilePath(p)) return false;
  const rel = relPath(caseDir, p).toLowerCase();
  const base = path.basename(p).toLowerCase();
  const tempLike = rel.split('/').some(part => isDisposableDirName(part)) || isDisposableFileName(base);
  if (!tempLike) return false;

  const st = stat(p);
  if (!includeProfiles && st && st.isDirectory() && isProfileProtectedContainer(p, includeProfiles) && hasOnlyProfileChildren(p)) {
    return false;
  }
  return true;
}

function collectRemainingTempLike(caseDir, includeProfiles) {
  return listTree(caseDir).filter(p => exists(p) && isTempLikePath(caseDir, p, includeProfiles));
}

function retryRemainingCleanup(caseDir, args, actions) {
  if (args.dryRun) return;
  for (let round = 0; round < 2; round++) {
    const remaining = collectRemainingTempLike(caseDir, args.includeProfiles);
    if (!remaining.length) return;
    for (const p of remaining.sort((a, b) => b.length - a.length)) {
      if (!exists(p) || p === caseDir || !isInside(caseDir, p)) continue;
      const st = stat(p);
      if (!st) continue;
      if (!args.includeProfiles && isProfilePath(p)) continue;
      if (!args.includeProfiles && st.isDirectory() && isProfileProtectedContainer(p, args.includeProfiles)) {
        cleanDisposableDir(caseDir, p, args, actions);
        continue;
      }
      if (st.isDirectory()) {
        addAction(actions, 'delete', p, '二次清理残留临时目录');
        removePath(p, false, true);
      } else if (isDisposableFileName(path.basename(p)) || relPath(caseDir, p).toLowerCase().split('/').some(part => isDisposableDirName(part))) {
        addAction(actions, 'delete', p, '二次清理残留临时文件');
        removePath(p, false, false);
      }
    }
    pruneEmptyDirs(caseDir, args, actions);
  }
}

function collectDisposableDirs(caseDir) {
  const dirs = [];
  const direct = [
    'tmp', '.tmp', 'temp', '.temp', 'browser-temp', 'cache', '.cache',
    'downloads/failed', 'downloads/.tmp', 'downloads/.cache',
    'logs/tmp', 'logs/.tmp', 'trace/tmp', 'trace/.tmp',
    'ruyi-trace/tmp', 'ruyi-trace/.tmp', 'camoufox-trace', 'camoufox-values',
    'camoufox-trace/tmp', 'camoufox-values/tmp', 'screenshots/tmp', 'screenshots/.tmp',
  ];
  for (const rel of direct) dirs.push(path.join(caseDir, rel));

  for (const p of listTree(caseDir)) {
    const st = stat(p);
    if (!st || !st.isDirectory()) continue;
    if (p === caseDir) continue;
    if (isDisposableDirName(path.basename(p))) dirs.push(p);
  }

  return Array.from(new Set(dirs.map(p => path.resolve(p)))).sort((a, b) => b.length - a.length);
}

function cleanDisposableFiles(caseDir, args, actions) {
  for (const p of listTree(caseDir)) {
    if (!exists(p)) continue;
    const st = stat(p);
    if (!st || !st.isFile()) continue;
    if (isProfilePath(p) && !args.includeProfiles) {
      addAction(actions, 'skip-sensitive-file', p, '疑似 Cookie / token / 登录态文件，默认保留');
      continue;
    }
    const rel = relPath(caseDir, p).toLowerCase();
    const inTempLikeDir = rel.split('/').some(part => isDisposableDirName(part));
    const shouldDelete = isDisposableFileName(path.basename(p)) || (st.size === 0 && inTempLikeDir);
    if (!shouldDelete) continue;
    addAction(actions, args.dryRun ? 'would-delete' : 'delete', p, st.size === 0 ? '清理空临时文件' : '清理临时 / 测试 / 缓存文件');
    removePath(p, args.dryRun, false);
  }
}

function pruneEmptyDirs(caseDir, args, actions) {
  if (!args.pruneEmpty) return;
  for (const dir of listDirsDeepFirst(caseDir)) {
    if (dir === caseDir) continue;
    if (!exists(dir)) continue;
    if (isProfilePath(dir) && !args.includeProfiles) continue;
    let names = [];
    try { names = fs.readdirSync(dir); } catch { continue; }
    if (names.length !== 0) continue;
    addAction(actions, args.dryRun ? 'would-remove-empty-dir' : 'remove-empty-dir', dir, '清理空目录');
    removePath(dir, args.dryRun, false);
  }
}

function cleanup(args) {
  if (!args.caseDir) throw new Error('必须提供 --case-dir');
  const caseDir = path.resolve(args.caseDir);
  if (!exists(caseDir)) throw new Error(`case 目录不存在：${caseDir}`);
  const caseStat = stat(caseDir);
  if (!caseStat || !caseStat.isDirectory()) throw new Error(`case 路径不是目录：${caseDir}`);
  if (isDangerousDir(caseDir)) throw new Error(`拒绝清理危险目录：${caseDir}`);
  if (!args.dryRun && !args.force) throw new Error('未提供 --force，拒绝删除；请先使用 --dry-run 预览');

  const actions = [];
  const disposableDirs = collectDisposableDirs(caseDir);
  for (const dir of disposableDirs) {
    if (!exists(dir)) continue;
    if (dir === caseDir || !isInside(caseDir, dir)) continue;
    cleanDisposableDir(caseDir, dir, args, actions);
  }

  cleanDisposableFiles(caseDir, args, actions);
  pruneEmptyDirs(caseDir, args, actions);
  retryRemainingCleanup(caseDir, args, actions);

  const remainingTempLike = collectRemainingTempLike(caseDir, args.includeProfiles);

  return {
    caseDir,
    dryRun: args.dryRun,
    includeProfiles: args.includeProfiles,
    pruneEmpty: args.pruneEmpty,
    actions,
    remainingTempLike,
    clean: remainingTempLike.length === 0,
  };
}

function renderMarkdown(result) {
  const label = {
    'skip-profile': '跳过 Profile',
    'skip-sensitive-file': '跳过敏感文件',
    'keep-profile-container': '保留 Profile 容器目录',
    'would-delete': '将删除',
    'delete': '已删除',
    'would-remove-empty-dir': '将删除空目录',
    'remove-empty-dir': '已删除空目录',
  };
  const lines = ['# 清理结果', '', `case 目录：${result.caseDir}`, `dry-run：${result.dryRun ? '是' : '否'}`, `是否包含 Profile：${result.includeProfiles ? '是' : '否'}`, `是否清理空目录：${result.pruneEmpty ? '是' : '否'}`, ''];
  if (result.actions.length) {
    lines.push('## 操作列表');
    for (const a of result.actions) {
      lines.push(`- ${label[a.action] || a.action}：${a.path}${a.reason ? `（${a.reason}）` : ''}`);
    }
  } else {
    lines.push('## 操作列表', '- 没有需要清理的内容');
  }
  lines.push('', '## 清理后检查');
  lines.push(`- 是否仍存在普通临时 / 缓存 / 中间产物：${result.clean ? '否' : '是'}`);
  if (result.remainingTempLike.length) {
    for (const p of result.remainingTempLike) lines.push(`  - ${p}`);
  }
  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); process.exit(0); }
  const result = cleanup(args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
