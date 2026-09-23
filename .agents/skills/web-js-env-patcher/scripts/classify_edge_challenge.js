#!/usr/bin/env node
'use strict';

/**
 * classify_edge_challenge.js — 边缘 WAF / CDN 准入 Cookie 挑战定族与判层（零依赖）
 *
 * 用途：把「首访非正常页面 + Set-Cookie 下发准 cookie + JS 算出 clearance 后 reload」
 *       这条链路定到具体厂商与族，并给出**下一步该走纯算还是环境拟合**。
 *
 * 与 web-verify-patcher 的关系：本族**不是验证码**。本脚本只在「需要先拿到一个准入 cookie
 * 才能进站」时使用；有图、有交互、需要人工成功样本基线的走 web-verify-patcher。
 *
 * 用法：
 *   node classify_edge_challenge.js --html page.html --status 521 --cookies "__jsluid_s=..." --markdown
 *   node classify_edge_challenge.js --headers resp.txt --text "Just a moment..."
 *   node classify_edge_challenge.js --selftest
 *
 * 退出码：0 成功；1 参数/IO 错误；2 自检失败；3 置信度不足（判不出或歧义）。
 */

const fs = require('fs');
const path = require('path');

const SCHEMA = 'edge-challenge/v1';

// ------------------------------------------------------------------ 判据表
// kind: body | cookie | header | status
// weight 只在「同族内部累加」，跨族比较的是总分。
const FAMILIES = [
  {
    vendor: 'jsl', family: 'jsl-2pass-521', layer: 'purecalc',
    label: '加速乐（jsl）两趟 521',
    clues: [
      ['status', '521', 3, '首访 521'],
      ['cookie', '__jsluid_s', 3, '第一趟会话标识'],
      ['cookie', '__jsl_clearance_s', 4, 'clearance cookie 名'],
      ['body', "document.cookie=('_')", 4, '第一趟表达式形态'],
      ['body', '__jsl_clearance_s', 3, '响应体出现 clearance 名'],
      ['body', 'location.href=location.pathname+location.search', 2, 'reload 语句'],
    ],
    next: 'python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py jsl-first --html <521页面>（第一趟）→ jsl --json <go 参数>（第二趟）',
  },
  {
    // 同厂商第二形态：首访 **512**、cookie 名**不带 `_s` 后缀**。
    // 必须单独成族：照 521 的 cookie 名取值会一直拿不到 clearance，且表现为「算得对但页面还是挑战页」。
    vendor: 'jsl', family: 'jsl-2pass-512', layer: 'purecalc',
    label: '加速乐（jsl）两趟 512（`__jsluid_h` 命名变体）',
    clues: [
      ['status', '512', 3, '首访 512（不是 521）'],
      ['cookie', '__jsluid_h', 4, '第一趟会话标识（后缀 _h）'],
      ['cookie', '__jsl_clearance', 3, 'clearance cookie 名（不带 _s）'],
      ['body', '__jsl_clearance', 2, '响应体出现 clearance 名'],
      ['body', 'document.cookie', 2, '内联 cookie 赋值'],
    ],
    next: '**按同族推断**两趟链路与 521 一致（jsl-first → jsl；该变体的 go({...}) 原文未打印，'
      + 'jsl 无命中即说明推断不成立），但 **cookie 名必须换成 __jsluid_h / __jsl_clearance**；'
      + '见 references/edge-waf-cookie-challenge.md §2.1.1',
  },
  {
    vendor: 'alibaba', family: 'acw-sc-v2-old', layer: 'purecalc',
    label: '阿里 acw_sc__v2 旧版（unsbox + hexXor）',
    clues: [
      ['cookie', 'acw_sc__v2', 5, 'cookie 名'],
      ['body', 'unsbox', 5, '置换表方法名'],
      ['body', 'hexXor', 5, '异或方法名'],
      ['body', 'arg1', 2, '种子变量'],
    ],
    next: 'python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py acw-v2-old --arg1 <40位hex>',
  },
  {
    vendor: 'alibaba', family: 'acw-sc-v2-new', layer: 'purecalc+browser-probe',
    label: '阿里 acw_sc__v2 新版（LCG + 洗牌）',
    clues: [
      ['cookie', 'acw_sc__v2', 5, 'cookie 名'],
      ['body', 'PxjRjE', 3, '主函数名（站点相关，仅作提示）'],
      ['body', "debugger;return s['charCodeAt'](0);", 4, '动态构造 Function 的 debugger 体'],
      ['body', 'Math.random.constructor', 3, '绕过 Function 关键字'],
      ['body', 'arg1', 2, '种子变量'],
    ],
    next: '先 acw-table 标定字符串表旋转量；再从浏览器取 oO / z / T 表 + 未格式化源码',
  },
  {
    vendor: 'cloudflare', family: 'managed-challenge-5s', layer: 'mixed',
    label: 'Cloudflare 5s 盾 / managed challenge',
    clues: [
      ['body', '_cf_chl_opt', 5, '挑战页全局配置对象'],
      ['body', '/cdn-cgi/challenge-platform/', 4, '挑战平台路径'],
      ['cookie', 'cf_clearance', 5, '最终准入 cookie'],
      ['cookie', '__cf_bm', 3, 'Bot Management cookie'],
      ['body', 'Just a moment', 4, '经典等待页文案'],
      ['body', '[[3,24],[4,32]]', 2, 'WASM 兼容探测'],
      // `jsd/oneshot` 是同一引擎的**非 managed** 形态：首访可能是 200（不是 403/503），
      // 参数对象换成 window.__CF$cv$params，且首次下发 safeid。不要因为「不是 403」就判不出。
      ['body', 'challenge-platform/h/b/jsd/oneshot', 4, 'jsd/oneshot 变体路径'],
      ['body', '__CF$cv$params', 4, 'jsd 变体的参数对象（r / m）'],
      ['body', 'safeid', 2, 'jsd 形态首次下发的 safeid'],
    ],
    next: 'cf-strtable（字符串表）→ cf-decode --body <fo响应> --ray <rayId>；环境校验必须真浏览器；' +
      'jsd/oneshot 变体见 references/edge-waf-cookie-challenge.md §2.3.1',
  },
  {
    vendor: 'cloudflare', family: 'turnstile', layer: 'mixed',
    label: 'Cloudflare Turnstile（managed/non-interactive）',
    clues: [
      ['body', 'challenges.cloudflare.com/turnstile/', 5, 'Turnstile 挑战页 URL'],
      ['body', 'cf-turnstile-response', 5, 'Token 落点'],
      ['body', 'turnstile.render', 3, '渲染入口'],
      ['body', '0x4AAAAAA', 3, 'sitekey 前缀'],
      ['cookie', 'cf_clearance', 2, '最终准入 cookie'],
    ],
    next: 'python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py cf-decode --body <fo响应> --ray <rayId>；交互走真实浏览器（closed shadow root + 坐标级 MouseEvent）',
  },
  {
    vendor: 'cloudflare', family: 'drop-pow', layer: 'purecalc',
    label: 'Cloudflare Drop（时间锁 PoW）',
    clues: [
      ['body', '/client/v4/provisioning/previews', 5, 'Provisioning API'],
      ['body', 'challengeToken', 3, 'JWT 挑战令牌'],
      ['body', 'checkpoints', 3, '检查点链字段'],
      ['body', 'pow.worker', 3, 'PoW Worker 文件名'],
    ],
    next: 'python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py pow-drop --challenge-json <challenge 响应>',
  },
  {
    vendor: 'akamai', family: 'bot-manager', layer: 'envfit',
    label: 'Akamai Bot Manager（sensor_data / _abck）',
    clues: [
      ['cookie', '_abck', 5, '信任分 cookie'],
      ['cookie', 'bm_sz', 4, '会话 cookie'],
      ['cookie', 'ak_bmsc', 3, '会话 cookie'],
      ['body', 'sensor_data', 4, '提交参数名'],
      ['body', 'bm_sv', 2, '补充 cookie 名'],
    ],
    next: '对齐环境数组（references/edge-waf-cookie-challenge.md §2.4）：重点是下标 1 的 UA/Screen 合并串与 WebGL 三路采集；tag 与值的配对方向必须现场 dump 确认',
  },
  {
    vendor: 'f5shape', family: 'reese84', layer: 'envfit',
    label: 'F5 Shape / Reese84',
    clues: [
      ['cookie', 'reese84', 5, 'token cookie 名'],
      ['header', 'x-d-token', 4, 'token 头名'],
      ['body', 'reese84interrogatorconstructor', 5, '构造函数名'],
      ['body', 'y-Almost-yet-know-Now-Son-ther-That-swearers-of-', 3, '动态路径关键字'],
      ['body', 'pplacked-bothe-right-eque-mine-in-him-aftend-Thi', 3, '固定路径关键字'],
    ],
    next: '按 references/edge-waf-cookie-challenge.md §2.5 的 22 函数采集清单补环境；先查 st 时间戳校验',
  },
  {
    vendor: 'imperva', family: 'incapsula', layer: 'envfit',
    label: 'Imperva / Incapsula（___utmvc）',
    clues: [
      ['cookie', 'visid_incap', 4, 'visid cookie'],
      ['cookie', 'incap_ses', 4, '会话 cookie'],
      ['body', '___utmvc', 4, '挑战脚本参数'],
      ['body', 'incap_ses', 2, '响应体出现会话名'],
    ],
    next: '共用 reese84 家族形态（Incapsula 亦下发 reese84）；按 references/edge-waf-cookie-challenge.md §2.5 处理',
  },
  {
    vendor: 'kasada', family: 'kpsdk', layer: 'envfit+pow',
    label: 'Kasada（x-kpsdk-*）',
    clues: [
      ['header', 'x-kpsdk-ct', 5, '客户端 token 头'],
      ['header', 'x-kpsdk-cd', 5, '客户端数据头'],
      ['cookie', 'KP_UID', 3, '会话标识'],
      ['body', 'ips.js', 3, '多态命名脚本'],
      ['status', '429', 2, '静默限流'],
    ],
    next: '完整性检测（被改过的原生函数）+ PoW：先确认 Function.prototype.toString 未被改写',
  },
  {
    vendor: 'datadome', family: 'datadome', layer: 'envfit',
    label: 'DataDome',
    clues: [
      ['cookie', 'datadome', 5, '准入 cookie 名'],
      ['header', 'x-datadome', 4, '响应头'],
      ['body', 'boring_challenge', 3, 'WASM 挑战'],
      ['body', 'ddcid', 2, '设备 id'],
    ],
    next: 'IP 信誉占总分 25%~30%：先确认出口 IP，再处理 WASM 与设备指纹',
  },
  {
    vendor: 'human', family: 'perimeterx', layer: 'envfit',
    label: 'HUMAN / PerimeterX（_px3）',
    clues: [
      ['cookie', '_px3', 5, '准入 cookie 名'],
      ['cookie', 'pxvid', 4, '访客 id'],
      ['body', 'px-captcha', 3, '可见验证码容器'],
      ['body', 'pxAppId', 2, '应用 id'],
    ],
    next: '五向量（TLS/IP/HTTP 头/JS 指纹/行为）必须同时成立，只修一个点无效',
  },
  {
    vendor: 'aws', family: 'waf-token', layer: 'pow',
    label: 'AWS WAF（aws-waf-token）',
    clues: [
      ['cookie', 'aws-waf-token', 5, '准入 token 名'],
      ['body', 'challenge.js', 3, '挑战脚本'],
      ['body', 'captcha.js', 3, '验证码脚本'],
      ['body', 'awswaf', 2, '厂商标识'],
    ],
    next: 'PoW 可离线；若展示 grid 题则同时走 web-verify-patcher',
  },
  {
    vendor: 'fastly', family: 'bot-management', layer: 'pow',
    label: 'Fastly Bot Management',
    clues: [
      ['cookie', 'fs_ch_st', 5, '挑战 cookie'],
      ['cookie', 'fs_ch_cp', 5, '挑战 cookie'],
      ['cookie', 'fs_cd_cp', 3, '高级客户端检测 cookie'],
    ],
    next: '轻量 JS PoW：验证 JA3/JA4 与 HTTP 头顺序后再谈求解',
  },
  {
    vendor: 'ruishu', family: 'botgate', layer: 'envfit',
    label: '瑞数 Botgate（挑战页三件套）',
    clues: [
      ['body', '$_ts', 4, '运行时对象'],
      ['status', '412', 2, '5/6 代首访'],
      ['status', '202', 2, '3/4 代首访'],
      ['body', 'meta.content', 3, '三件套之一'],
      ['body', 'debugger', 1, '反调试（弱信号）'],
    ],
    next: '切 web-js-env-patcher 的 ruishu-botgate.md（分代判据 + 三件套抽取）',
  },
  {
    vendor: 'leichi', family: 'safeline', layer: 'purecalc',
    label: '雷池（SafeLine）WAF 五趟准入',
    clues: [
      ['cookie', 'sl-session', 4, '第一趟会话 cookie'],
      ['cookie', 'sl_jwt_session', 5, '终值准入 cookie'],
      ['cookie', 'sl_waf_recap', 4, 'jwt 承载 cookie'],
      ['body', 'sdk.js', 3, '第一趟下发的 SDK（含控制台检测）'],
      ['body', 'once_id', 4, '从第一次 list 响应体里取的随机 id'],
      ['body', 'hints', 2, 'seed 请求的固定参数'],
    ],
    next: 'python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py leichi --seed <seed> --json <inspect 明文>；' +
      '链路与 salt 语义见 references/edge-waf-cookie-challenge.md §2.8',
  },
  {
    vendor: 'qrator', family: 'jsid2', layer: 'purecalc+envfit',
    label: 'qrator（qrator_jsid2）401 准入',
    clues: [
      ['status', '401', 3, '首访 401'],
      ['cookie', 'qrator_jsr', 5, '第一趟 cookie（param 的来源）'],
      ['cookie', 'qrator_jsid2', 5, '终值准入 cookie'],
      ['body', 'qauth.js', 4, '承载加密参数的外链 JS'],
      ['body', 'qsessid', 5, 'param 按 - 切分的第 2 段'],
      ['body', 'nonce', 3, 'param 按 - 切分的第 1 段'],
    ],
    next: 'python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py qrator --param <qrator_jsr>；' +
      '38 个环境派生字段见 references/edge-waf-cookie-challenge.md §2.9',
  },
];

const LAYER_NOTE = {
  purecalc: '全部可离线求解：直接用 web-reverse-algorithm 的求解器算，无需浏览器。',
  'purecalc+browser-probe':
    '骨架可离线，但要先一次性从浏览器取 3 个值（源码偏移 oO、偏移 z、奇偶表 T）与未格式化源码。',
  mixed: '响应体可离线解（cf-decode / cf-strtable）；环境校验必须真浏览器（校验点顺序随机）。',
  envfit: '环境拟合族：离线性极低，优先真实浏览器取证 + 环境数组逐字段对齐。',
  'purecalc+envfit':
    'PoW / 编码链可离线求解（走 web-reverse-algorithm 求解器子命令）；载荷里另有 N 个环境派生字段，' +
    '要么环境拟合、要么从浏览器取一次真实样本后逐字段对齐。',
  'envfit+pow': '环境完整性 + PoW 双门禁：PoW 可离线，完整性部分必须真浏览器。',
  pow: 'PoW 可离线求解（花 CPU），无需真实浏览器。',
};

const NEXT_SKILL = {
  purecalc: 'web-reverse-algorithm',
  'purecalc+browser-probe': 'web-reverse-algorithm + 一次浏览器取值',
  mixed: 'web-reverse-algorithm（响应体）+ 真实浏览器（环境）',
  envfit: 'web-js-env-patcher',
  'envfit+pow': 'web-js-env-patcher + web-reverse-algorithm（PoW 段）',
  'purecalc+envfit': 'web-reverse-algorithm（PoW / 编码链）+ web-js-env-patcher（环境字段）',
  pow: 'web-reverse-algorithm',
};

// ------------------------------------------------------------------ 解析
function parseArgs(argv) {
  const opts = { cookies: [], headers: [], text: [], verify: [], quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--html') opts.html = next();
    else if (a === '--headers') opts.headers.push(next());
    else if (a === '--cookies') opts.cookies.push(next());
    else if (a === '--text') opts.text.push(next());
    else if (a === '--status') opts.status = String(next());
    else if (a === '--markdown') opts.markdown = true;
    else if (a === '--json') opts.jsonOut = true;
    else if (a === '--verify') opts.verify.push(next());
    else if (a === '--min-score') opts.minScore = Number(next());
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--selftest') opts.selftest = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else fail(`未知参数：${a}`);
  }
  return opts;
}

function fail(msg) {
  const e = new Error(msg);
  e.cli = true;
  throw e;
}

function readMaybeFile(v) {
  // 既能传路径也能传原始串：存在同名的普通文件时读文件，否则当字符串
  try {
    if (fs.existsSync(v) && fs.statSync(v).isFile()) return fs.readFileSync(v, 'utf8');
  } catch (e) { /* 落到字符串分支 */ }
  return v;
}

function collect(opts) {
  const chunks = [];
  if (opts.html) chunks.push(readMaybeFile(opts.html));
  for (const h of opts.headers) chunks.push(readMaybeFile(h));
  for (const t of opts.text) chunks.push(t);
  const body = chunks.join('\n');
  const cookieText = opts.cookies.map(readMaybeFile).join('\n');
  return { body, cookieText };
}

// ------------------------------------------------------------------ 判定
function classify({ body, cookieText, status }) {
  const lowered = body.toLowerCase();
  const cookieLower = cookieText.toLowerCase();
  const statusStr = status === undefined ? null : String(status).trim();
  const ranked = [];

  for (const fam of FAMILIES) {
    let score = 0;
    const evidence = [];
    for (const [kind, needle, weight, why] of fam.clues) {
      let hit = false;
      if (kind === 'status') {
        hit = statusStr !== null && statusStr === needle;
      } else if (kind === 'cookie') {
        hit = cookieLower.includes(needle.toLowerCase()) || lowered.includes(needle.toLowerCase());
      } else if (kind === 'header') {
        hit = lowered.includes(needle.toLowerCase());
      } else {
        hit = body.includes(needle) || lowered.includes(needle.toLowerCase());
      }
      if (hit) {
        score += weight;
        evidence.push(`${kind}:${needle} (+${weight}) — ${why}`);
      }
    }
    if (score > 0) {
      ranked.push({ vendor: fam.vendor, family: fam.family, layer: fam.layer,
        label: fam.label, score, evidence, next: fam.next });
    }
  }
  ranked.sort((a, b) => b.score - a.score || a.vendor.localeCompare(b.vendor));
  return ranked;
}

function verdict(ranked, minScore) {
  if (ranked.length === 0) {
    return { status: 'unclassified', reason: '未命中任何族的判据。补充 --html / --cookies / --status 后重试；不要因为判不出就套一个族继续。' };
  }
  const top = ranked[0];
  const second = ranked[1];
  // 歧义：同分，或差距 <= 2 —— 这时**不要**硬判，先补证据
  const ambiguous = Boolean(second) && (top.score - second.score) <= 2;
  const lowScore = minScore !== undefined && top.score < minScore;
  const confidence = ambiguous ? 'low' : (top.score >= 8 ? 'high' : 'medium');
  return { top, ambiguous, lowScore, confidence,
    runnersUp: ranked.slice(1, 4) };
}

// ------------------------------------------------------------------ 输出
function render(result, opts) {
  if (opts.markdown) {
    const L = [];
    L.push('## 边缘挑战定族结果');
    L.push('');
    if (result.status === 'unclassified') {
      L.push('- **结果**：未定族');
      L.push(`- **原因**：${result.reason}`);
      return L.join('\n');
    }
    L.push(`- **厂商族**：\`${result.family}\`（${result.label}）`);
    L.push(`- **vendor**：\`${result.vendor}\``);
    L.push(`- **落层**：\`${result.layer}\` — ${result.layerNote}`);
    L.push(`- **置信度**：\`${result.confidence}\`（总分 ${result.score}，歧义=${result.ambiguous ? '是' : '否'}）`);
    L.push(`- **下一步技能**：${result.nextSkill}`);
    L.push(`- **下一步命令**：${result.next}`);
    L.push('');
    L.push('### 命中判据');
    for (const e of result.evidence) L.push(`- ${e}`);
    if (result.runnersUp.length) {
      L.push('');
      L.push('### 次优候选（若 top 判错，优先看这里）');
      for (const r of result.runnersUp) L.push(`- \`${r.family}\`（${r.label}）总分 ${r.score}`);
    }
    L.push('');
    L.push('### 提醒');
    for (const r of result.reminder) L.push(`- ${r}`);
    if (result.diagnosis) L.push(`- **诊断**：${result.diagnosis}`);
    return L.join('\n');
  }
  return JSON.stringify(result, null, 2);
}

// ------------------------------------------------------------------ 自检
function selftest() {
  const cases = [
    {
      name: 'jsl 两趟 521',
      input: { status: '521', cookieText: '__jsluid_s=abc; __jsl_clearance_s=def',
        body: "document.cookie=('_')+('_')+('j')+('s')+('l');location.href=location.pathname+location.search" },
      expectFamily: 'jsl-2pass-521',
    },
    {
      name: 'acw_sc__v2 旧版',
      input: { status: '200', cookieText: 'acw_sc__v2=abc',
        body: "String.prototype.unsbox=function(){...};String.prototype.hexXor=function(){};var arg1='F5552FD5'" },
      expectFamily: 'acw-sc-v2-old',
    },
    {
      name: 'acw_sc__v2 新版',
      input: { status: '200', cookieText: 'acw_sc__v2=abc',
        body: "function PxjRjE(){}(window.Math.random.constructor('s','i',\"0.1; debugger;return s['charCodeAt'](0);\"))" },
      expectFamily: 'acw-sc-v2-new',
    },
    {
      name: 'Cloudflare managed',
      input: { status: '403', cookieText: '__cf_bm=abc; cf_clearance=def',
        body: 'Just a moment... window._cf_chl_opt={}; /cdn-cgi/challenge-platform/h/g/' },
      expectFamily: 'managed-challenge-5s',
    },
    {
      name: 'Turnstile',
      input: { status: '200', cookieText: 'cf_clearance=x',
        body: 'https://challenges.cloudflare.com/turnstile/v0/api.js <input name="cf-turnstile-response"> turnstile.render' },
      expectFamily: 'turnstile',
    },
    {
      name: 'Cloudflare Drop',
      input: { status: '200', cookieText: '',
        body: 'api.cloudflare.com/client/v4/provisioning/previews/challenge {"challengeToken":"eyJ","checkpoints":"..."} pow.worker-XX.js' },
      expectFamily: 'drop-pow',
    },
    {
      name: 'Akamai',
      input: { status: '200', cookieText: '_abck=ABC~-1~; bm_sz=xyz',
        body: 'sensor_data=... bm_sv=1' },
      expectFamily: 'bot-manager',
    },
    {
      name: 'Reese84',
      input: { status: '200', cookieText: 'reese84=abc',
        body: 'reese84interrogatorconstructor y-Almost-yet-know-Now-Son-ther-That-swearers-of-x' },
      expectFamily: 'reese84',
    },
    {
      name: 'Kasada',
      input: { status: '429', cookieText: 'KP_UID=1',
        body: 'x-kpsdk-ct: abc x-kpsdk-cd: def <script src="/ips.js">' },
      expectFamily: 'kpsdk',
    },
    {
      name: 'DataDome',
      input: { status: '403', cookieText: 'datadome=abc', body: 'boring_challenge ddcid' },
      expectFamily: 'datadome',
    },
    {
      name: 'PerimeterX',
      input: { status: '403', cookieText: '_px3=abc; pxvid=1', body: 'px-captcha pxAppId' },
      expectFamily: 'perimeterx',
    },
    {
      name: 'AWS WAF',
      input: { status: '405', cookieText: 'aws-waf-token=abc', body: 'challenge.js awswaf' },
      expectFamily: 'waf-token',
    },
    {
      name: '瑞数 Botgate',
      input: { status: '412', cookieText: '', body: 'window.$_ts={} meta.content <script>x.y.js</script>' },
      expectFamily: 'botgate',
    },
    {
      name: 'jsl 两趟 512（__jsluid_h 变体）',
      input: { status: '512', cookieText: '__jsluid_h=abc; __jsl_clearance=1760151418.93|0|yoM',
        body: 'document.cookie=...; __jsl_clearance' },
      expectFamily: 'jsl-2pass-512',
    },
    {
      name: 'Cloudflare jsd/oneshot（首访 200）',
      input: { status: '200', cookieText: 'safeid=abc',
        body: '<script src="/cdn-cgi/challenge-platform/h/b/jsd/oneshot/abcd/1234"></script>window.__CF$cv$params={r:"a",m:"b"}' },
      expectFamily: 'managed-challenge-5s',
    },
    {
      name: '雷池 SafeLine',
      input: { status: '200', cookieText: 'sl-session=abc; sl_waf_recap=eyJ; sl_jwt_session=zzz',
        body: '<script src="/api/waf/sdk.js"></script> once_id hints' },
      expectFamily: 'safeline',
    },
    {
      name: 'qrator jsid2',
      input: { status: '401', cookieText: 'qrator_jsr=AAA-BBB',
        body: '<script src="/qauth.js"></script> nonce qsessid' },
      expectFamily: 'jsid2',
    },
  ];

  let n = 0;
  for (const c of cases) {
    const ranked = classify(c.input);
    const v = verdict(ranked, undefined);
    if (v.status === 'unclassified') throw new Error(`${c.name}: 未定族`);
    if (v.top.family !== c.expectFamily) {
      throw new Error(`${c.name}: 期望 ${c.expectFamily}，实际 ${v.top.family}（次优 ${v.runnersUp.map(r => r.family + ':' + r.score).join(',')}）`);
    }
    n++;
  }

  // 反例 1：空输入必须判为 unclassified（不允许「什么都能认」）
  const empty = verdict(classify({ body: '', cookieText: '', status: undefined }), undefined);
  if (empty.status !== 'unclassified') throw new Error('空输入应判为 unclassified');
  n++;
  // 反例 2：与验证码无关的普通页面必须判为 unclassified
  const plain = verdict(classify({
    body: '<html><body>hello world</body></html>', cookieText: 'sessionid=1', status: '200',
  }), undefined);
  if (plain.status !== 'unclassified') throw new Error('普通页面应判为 unclassified');
  n++;
  // 反例 3：歧义输入必须被标为 ambiguous（Incapsula 也下发 reese84，两家本就难分）
  const amb = verdict(classify({
    status: '200', cookieText: 'reese84=abc; visid_incap=1; incap_ses=2',
    body: 'reese84interrogatorconstructor ___utmvc',
  }), undefined);
  if (!amb.ambiguous) {
    throw new Error(`混合证据应被标为 ambiguous（实际 top=${amb.top.family}:${amb.top.score}，次优=${amb.runnersUp.map(r => r.family + ':' + r.score).join(',')}）`);
  }
  n++;
  // 反例 4：min-score 门禁必须生效
  const low = verdict(classify({ status: '200', cookieText: 'ak_bmsc=1', body: '' }), 9);
  if (!low.lowScore) throw new Error('--min-score 门禁未生效');
  n++;
  // 反例 5：--verify 用的候选族名必须都存在（防止引用漂移）
  const names = new Set(FAMILIES.map(f => f.family));
  for (const f of FAMILIES) {
    // 新增族时最容易漏的就是这两处：只补其中一个会让「落层」在输出里显示成 undefined，
    // 而 classify 结果看起来仍然正常 ⇒ 这里对 FAMILIES × NEXT_SKILL × LAYER_NOTE 做闭集一致性检查。
    if (!LAYER_NOTE[f.layer]) throw new Error(`族 ${f.family} 的 layer=${f.layer} 没有说明`);
    if (!NEXT_SKILL[f.layer]) throw new Error(`layer=${f.layer} 没有下一步技能`);
    if (!f.next) throw new Error(`族 ${f.family} 缺 next`);
    if (names.size !== FAMILIES.length) throw new Error('族名重复');
  }
  n += FAMILIES.length;

  console.log(`  [ok] classify_edge_challenge：${n} 项断言`);
  return 0;
}

// ------------------------------------------------------------------ 主流程
function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`[参数错误] ${e.message}`);
    return 1;
  }
  if (opts.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
    return 0;
  }
  if (opts.selftest) {
    // 自检失败必须返回 **2**（与 docstring 的退出码表一致），不能把异常抛到顶层变成
    // 「裸 Node 栈 + exit 1」——调用方会把它误当「参数错误」。
    try {
      return selftest();
    } catch (e) {
      console.error(`  [FAIL] classify_edge_challenge：${e.message}`);
      console.error('自检未通过，不要使用本脚本产出的定族结果。');
      return 2;
    }
  }

  const hasInput = opts.html || opts.headers.length || opts.cookies.length || opts.text.length ||
    opts.status !== undefined;
  if (!hasInput) {
    console.error('[参数错误] 至少要提供 --html / --headers / --cookies / --text / --status 之一');
    return 1;
  }

  let collected;
  try {
    collected = collect(opts);
  } catch (e) {
    console.error(`[IO 错误] ${e.message}`);
    return 1;
  }
  const ranked = classify({ ...collected, status: opts.status });
  const v = verdict(ranked, opts.minScore);

  let result;
  if (v.status === 'unclassified') {
    result = { schema: SCHEMA, status: 'unclassified', reason: v.reason };
  } else {
    result = {
      schema: SCHEMA,
      status: 'classified',
      vendor: v.top.vendor,
      family: v.top.family,
      label: v.top.label,
      layer: v.top.layer,
      layerNote: LAYER_NOTE[v.top.layer],
      nextSkill: NEXT_SKILL[v.top.layer],
      confidence: v.lowScore ? 'low' : v.confidence,
      ambiguous: v.ambiguous,
      score: v.top.score,
      evidence: v.top.evidence,
      runnersUp: v.runnersUp.map(r => ({ family: r.family, label: r.label, score: r.score })),
      next: v.top.next,
      isCaptcha: false,
      reminder: [
        '本族不是验证码：无图片、无人工成功样本基线，不要走 web-verify-patcher 的 Phase-2 流程。',
        '同一站可能叠两家（边缘 WAF + 站点自研风控 SDK）：只过一层仍然失败。',
        '响应码不是唯一判据：acw_sc__v2 首访 200；Akamai / Reese84 / Kasada 全程 200。',
      ],
    };
    if (v.ambiguous) {
      result.diagnosis = '与次优候选分差 <= 2，判层不可靠：请补齐 Set-Cookie 名 / 响应头 / 状态码后再动手。';
    }
    if (v.lowScore) {
      result.diagnosis = `总分 ${v.top.score} 低于 --min-score 门禁：证据不足。`;
    }
  }
  console.log(render(result, opts));
  if (result.status === 'unclassified') return 3;
  if (result.ambiguous || result.confidence === 'low') return 3;
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { classify, verdict, FAMILIES, LAYER_NOTE, NEXT_SKILL };