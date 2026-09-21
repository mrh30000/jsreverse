#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const REPOS = {
  ruyitrace: { owner: 'LoseNine', repo: 'Firefox-FingerPrint-Analyzer', asset: /RuyiTrace\.zip$/i },
  'ruyipage-firefox': { owner: 'LoseNine', repo: 'ruyipage', asset: null },
};

function parseArgs(argv) {
  const args = { tool: '', dest: '', dryRun: false, json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tool') args.tool = argv[++i] || '';
    else if (a === '--dest') args.dest = argv[++i] || '';
    else if (a === '--dry-run') args.dryRun = true;
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
  node scripts/download_ruyi_tool.js --tool ruyitrace --dest <download-dir> --dry-run --markdown
  node scripts/download_ruyi_tool.js --tool ruyitrace --dest <download-dir> --markdown
  node scripts/download_ruyi_tool.js --tool ruyipage-firefox --dest <download-dir> --dry-run --markdown

说明：仅在用户确认后下载。下载后仍需要用户解压 / 安装或确认可执行文件路径。`;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'web-js-env-patcher-skill' } }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          getJson(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) reject(new Error(`请求失败 ${res.statusCode}: ${url}`));
        else {
          try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('请求超时')));
  });
}

function pickRuyiPageAsset(assets) {
  if (process.platform === 'win32') return assets.find(a => /win64\.zip$/i.test(a.name));
  if (process.platform === 'linux' && process.arch === 'x64') return assets.find(a => /linux.*x86_64.*\.tar\.xz$/i.test(a.name));
  return assets.find(a => /firefox/i.test(a.name));
}

function selectAsset(tool, assets) {
  if (tool === 'ruyipage-firefox') return pickRuyiPageAsset(assets);
  const rule = REPOS[tool].asset;
  return assets.find(a => rule.test(a.name));
}

function downloadFile(url, file) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = fs.createWriteStream(file);
    function request(u) {
      https.get(u, { headers: { 'User-Agent': 'web-js-env-patcher-skill' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          out.close();
          reject(new Error(`下载失败 ${res.statusCode}: ${u}`));
          return;
        }
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve(file)));
      }).on('error', err => {
        out.close();
        reject(err);
      });
    }
    request(url);
  });
}

async function plan(args) {
  if (!args.tool || !REPOS[args.tool]) throw new Error(`必须提供 --tool，可选：${Object.keys(REPOS).join(', ')}`);
  if (!args.dest) throw new Error('必须提供 --dest');
  const repo = REPOS[args.tool];
  const release = await getJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`);
  const asset = selectAsset(args.tool, release.assets || []);
  if (!asset) throw new Error(`未找到适合当前工具 / 平台的 release asset：${args.tool}`);
  const destDir = path.resolve(args.dest);
  const file = path.join(destDir, asset.name);
  const result = {
    tool: args.tool,
    repo: `${repo.owner}/${repo.repo}`,
    releaseName: release.name || '',
    tagName: release.tag_name || '',
    releaseUrl: release.html_url || '',
    assetName: asset.name,
    assetSize: asset.size,
    downloadUrl: asset.browser_download_url,
    destFile: file,
    dryRun: args.dryRun,
    downloaded: false,
  };
  if (!args.dryRun) {
    await downloadFile(asset.browser_download_url, file);
    result.downloaded = true;
  }
  return result;
}

function renderMarkdown(result) {
  const lines = ['# Ruyi 工具下载结果', '', `- 工具：${result.tool}`, `- 仓库：${result.repo}`, `- Release：${result.releaseName || result.tagName}`, `- Release URL：${result.releaseUrl}`, `- 资产：${result.assetName}`, `- 大小：${result.assetSize}`, `- 目标文件：${result.destFile}`, `- dry-run：${result.dryRun ? '是' : '否'}`, `- 是否已下载：${result.downloaded ? '是' : '否'}`];
  lines.push('', '## 下一步');
  if (result.dryRun) lines.push('- 当前只是下载计划；只有用户确认后再去掉 `--dry-run` 下载。');
  else lines.push('- 下载完成。请用户解压 / 安装后，提供工具目录并重新运行检测脚本。');
  return lines.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); return; }
  const result = await plan(args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
}

main().catch(err => {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
});
