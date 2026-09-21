#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = { python: '', json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--python') args.python = argv[++i] || '';
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
  node scripts/check_tls_clients.js --markdown
  node scripts/check_tls_clients.js --python python --json

说明：检测最终请求阶段可选的 TLS 指纹兼容客户端：Node.js CycleTLS / impers / curl-cffi-node、Python curl_cffi / cffi_curl / cyCronet；真实请求交付时必须再封装为 Session 模式。`;
}

function run(cmd, args, timeout = 12000) {
  const ret = spawnSync(cmd, args, { encoding: 'utf8', timeout, windowsHide: true });
  return {
    ok: ret.status === 0,
    status: ret.status,
    stdout: (ret.stdout || '').trim(),
    stderr: (ret.stderr || '').trim(),
    error: ret.error ? ret.error.message : '',
    command: [cmd].concat(args).join(' '),
  };
}

function nodeRequire(name) {
  const code = `
(async()=>{
  const name=${JSON.stringify(name)};
  try {
    const m=require(name);
    console.log(JSON.stringify({ok:true, loader:"require", keys:Object.keys(m).slice(0,20)}));
  } catch (e1) {
    try {
      const m=await import(name);
      console.log(JSON.stringify({ok:true, loader:"import", keys:Object.keys(m).slice(0,20)}));
    } catch (e2) {
      console.log(JSON.stringify({ok:false,error:e1.message + " / " + e2.message}));
      process.exit(2);
    }
  }
})();`;
  const ret = run(process.execPath, ['-e', code]);
  try {
    const parsed = JSON.parse(ret.stdout.replace(/^\uFEFF/, ''));
    return { name, installed: !!parsed.ok, loader: parsed.loader || '', keys: parsed.keys || [], error: parsed.error || '' };
  } catch {
    return { name, installed: false, loader: '', keys: [], error: ret.stderr || ret.error || '检测失败' };
  }
}

function pythonCandidates(explicit) {
  const out = [];
  if (explicit) out.push({ cmd: explicit, prefix: [] });
  out.push({ cmd: 'python', prefix: [] });
  out.push({ cmd: 'python3', prefix: [] });
  out.push({ cmd: 'py', prefix: ['-3'] });
  const seen = new Set();
  return out.filter(x => {
    const k = x.cmd + ' ' + x.prefix.join(' ');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function detectPythonModules(explicitPython) {
  const modules = ['curl_cffi', 'cffi_curl', 'cycronet', 'cyCronet'];
  const code = [
    'import importlib, json',
    `mods=${JSON.stringify(modules)}`,
    'out={}',
    'for name in mods:',
    '    try:',
    '        m=importlib.import_module(name)',
    '        out[name]={"installed": True, "version": getattr(m, "__version__", "")}',
    '    except Exception as e:',
    '        out[name]={"installed": False, "error": str(e)}',
    'print(json.dumps(out, ensure_ascii=False))',
  ].join('\n');
  for (const c of pythonCandidates(explicitPython)) {
    const ret = run(c.cmd, c.prefix.concat(['-c', code]));
    if (!ret.ok && !ret.stdout) continue;
    try {
      const parsed = JSON.parse(ret.stdout.replace(/^\uFEFF/, ''));
      return { python: c.cmd, pythonArgsPrefix: c.prefix, modules: parsed };
    } catch {}
  }
  return {
    python: '',
    pythonArgsPrefix: [],
    modules: Object.fromEntries(modules.map(m => [m, { installed: false, error: '未找到可用 Python 或检测失败' }])),
  };
}

function detect(args) {
  const nodePackages = ['cycletls', '@luminati-io/cycletls', 'cycle-tls', 'cycleTls', 'impers', 'curl-cffi', 'curl-cffi-node'].map(nodeRequire);
  const python = detectPythonModules(args.python);
  const cycleTlsAvailable = nodePackages.some(p => p.installed && /cycle/i.test(p.name));
  const impersAvailable = nodePackages.some(p => p.installed && p.name === 'impers');
  const curlCffiNodeAvailable = nodePackages.some(p => p.installed && p.name === 'curl-cffi');
  return {
    node: {
      executable: process.execPath,
      packages: nodePackages,
      cycleTlsAvailable,
      impersAvailable,
      curlCffiNodeAvailable,
      nodeTlsAvailable: cycleTlsAvailable || impersAvailable || curlCffiNodeAvailable,
    },
    python,
    pythonTlsAvailable: Object.values(python.modules).some(v => v && v.installed),
    note: '这些客户端只用于授权范围内的最终低频请求验证；如果本 case 需要最终发送真实请求，应在前置阶段先选择 Node.js CycleTLS/impers/curl-cffi-node 或 Python curl_cffi/cyCronet，并在最终项目中封装为 Session 模式，不要等普通客户端失败后才考虑。',
  };
}

function renderMarkdown(result) {
  const lines = ['# TLS 指纹兼容客户端检测结果', '', `说明：${result.note}`, '', '## Node.js / CycleTLS / impers'];
  lines.push(`- Node.js：${result.node.executable}`);
  lines.push(`- 是否检测到 CycleTLS：${result.node.cycleTlsAvailable ? '是' : '否'}`);
  lines.push(`- 是否检测到 impers：${result.node.impersAvailable ? '是' : '否'}`);
  lines.push(`- 是否检测到 Node.js TLS 指纹兼容客户端：${result.node.nodeTlsAvailable ? '是' : '否'}`);
  for (const p of result.node.packages) {
    lines.push(`- ${p.name}：${p.installed ? '已安装' : '未安装'}${p.loader ? `（${p.loader}）` : ''}${p.error ? `（${p.error}）` : ''}`);
  }
  lines.push('', '## Python / curl_cffi / cffi_curl / cyCronet');
  lines.push(`- Python：${result.python.python ? `${result.python.python} ${result.python.pythonArgsPrefix.join(' ')}`.trim() : '未检测到'}`);
  lines.push(`- 是否检测到 Python TLS 客户端：${result.pythonTlsAvailable ? '是' : '否'}`);
  for (const [name, info] of Object.entries(result.python.modules)) {
    lines.push(`- ${name}：${info.installed ? '已安装' : '未安装'}${info.version ? `（版本 ${info.version}）` : ''}${info.error && !info.installed ? `（${info.error}）` : ''}`);
  }
  lines.push('', '## 下一步');
  if (!result.node.nodeTlsAvailable && !result.pythonTlsAvailable) {
    lines.push('- 未检测到可用 TLS 指纹兼容客户端；如果本 case 需要最终发送真实请求，需在前置阶段询问用户安装 CycleTLS / impers / curl_cffi / cyCronet，或改为只输出本地 sign 结果。');
  } else {
    lines.push('- 在任务确认阶段选择一个最终请求客户端，并限制为少量授权验证请求；最终项目中只保留所选客户端的 Session 请求逻辑。');
  }
  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); process.exit(0); }
  const result = detect(args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
