#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {parseArgs} from 'node:util';

const STAGES = {
  Observe: {
    stage: 'Observe',
    name: '观察与边界确认 (Observe)',
    goal: '确认目标请求、关键脚本、触发动作和任务边界。',
    entryCriteria: [
      '新逆向任务启动',
      '尚未确认生成目标签名的网络请求',
      '尚未确认关键脚本或触发动作',
    ],
    exitCriteria: [
      '明确了目标请求的 URL、Method、以及待逆向的目标参数名',
      '定位了发起请求的 Initiator 堆栈或候选脚本文件',
    ],
    avoid: [
      '在未确认目标请求前直接盲目补环境',
      '过早打断点或手翻数万行混淆代码',
    ],
    recommendedActions: [
      '抓取网络请求并分析 Query / Headers / Body',
      '定位请求 initiator 调用栈',
      '分析 HTML 中内联或外联的入口脚本',
    ],
  },
  Capture: {
    stage: 'Capture',
    name: '样本与插桩采集 (Capture)',
    goal: '用最小侵入方式拿到运行时真值样本、参数、中间值和调用顺序。',
    entryCriteria: [
      '已确认目标请求',
      '已定位候选脚本或函数',
      '需要获取真实的加密前原始参数与中间变量',
    ],
    exitCriteria: [
      '至少截获一组输入参数（明文、时间戳、随机数）与输出签名对应的完整真值',
      '搞清了签名函数的执行时机与上下文对象',
    ],
    avoid: [
      '无真值样本直接进入本地手写补环境',
      '刚开始就全量快照 window 对象导致卡死',
    ],
    recommendedActions: [
      '针对关键方法下轻量级 Hook（如 Function prototype、JSON.stringify、btoa 等）',
      '导出入参明文与返回值真值',
      '记录函数调用顺序与堆栈指纹',
    ],
  },
  Rebuild: {
    stage: 'Rebuild',
    name: '本地脚手架构建 (Rebuild)',
    goal: '把页面证据导出为本地可运行的独立 Node.js 复现入口。',
    entryCriteria: [
      '已有可复用的一组运行时真值样本',
      '已导出目标算法的核心 JS 代码',
    ],
    exitCriteria: [
      '本地生成包含 entry.js, env.js, polyfills.js, target.js 的独立运行环境',
      'Node.js 执行能加载 target.js 并开始调用入口函数',
    ],
    avoid: [
      '没有页面证据就在本地纯手写假环境',
      '直接跳过 Node.js 去用 Python/Go 重写算法',
    ],
    recommendedActions: [
      '使用 export-rebuild-bundle 脚本生成标准独立脚手架',
      '把提取出的混淆 JS 放入 target.js',
      '在 entry.js 中注入捕获到的真值入参进行试跑',
    ],
  },
  Patch: {
    stage: 'Patch',
    name: '最小因果补环境 (Patch)',
    goal: '围绕 first divergence 做最小补环境，直到本地链路稳定产出一致结果。',
    entryCriteria: [
      '已有本地 Node.js 运行入口',
      '运行遇到报错（ReferenceError/TypeError）或产出的签名与浏览器真值不一致',
    ],
    exitCriteria: [
      '输入相同的真实参数，本地 Node.js 产出的签名与浏览器真值 100% 一致',
      '脱离浏览器环境能在 Node.js 中独立稳定批量运行',
    ],
    avoid: [
      '没有报错日志盲目挂载大量无关的假对象',
      '一次性补几十个属性导致污染调用链路',
      '未对齐浏览器真值就宣称完成',
    ],
    recommendedActions: [
      '利用 diff-env-requirements 脚本分析报错日志并推断缺失对象',
      '使用 Object.defineProperty 代理挂载属性并打印访问日志',
      '对照浏览器真值逐步消除 first divergence',
    ],
  },
  DeepDive: {
    stage: 'DeepDive',
    name: '深度结构剖析 (DeepDive)',
    goal: '对复杂混淆、JSVMP 虚拟机、Wasm 模块或高风险路径做深入理解。',
    entryCriteria: [
      '基础链路已跑通但由于强混淆/JSVMP 导致体积过大或无法迁移',
      '算法中嵌套 Wasm 字节码或私有指令集',
    ],
    exitCriteria: [
      '理清 JSVMP 分派结构、Opcode 表或 Wasm 导出函数接口',
      '完成必要的 AST 反混淆或常量折叠',
    ],
    avoid: [
      '没有基础真值证据就纯靠静态猜测逻辑',
      '陷入混淆代码死循环而脱离逆向目标',
    ],
    recommendedActions: [
      '运行 analyze-jsvmp-vm.js 分析虚拟机分派器结构',
      '运行 wasm-decompile / wasm-inspect 分析 Wasm 节区与导出函数',
      '利用 ast-deobfuscation 工具集做常量还原与控制流平坦化消除',
    ],
  },
  PureExtraction: {
    stage: 'PureExtraction',
    name: '纯算法提取与提纯 (PureExtraction)',
    goal: '在环境补齐验证通过后，剥离冗余 DOM 补丁，提炼纯 JS/Python 纯算实现。',
    entryCriteria: [
      '本地环境已能 100% 稳定生成与浏览器一致的签名',
      '服务端接口使用该签名验收通过',
    ],
    exitCriteria: [
      '代码零依赖任何 window/document/navigator 伪造环境',
      '提炼为纯函数（Pure Function），具备跨语言迁移条件',
    ],
    avoid: [
      '本地链路还没跑通就过早开始纯算提纯',
      '提纯后没有回归校验真值一致性',
    ],
    recommendedActions: [
      '运行 detect-crypto 脚本识别是否使用了标准 AES/MD5/SHA/SM 库',
      '精简未执行的无效分支代码',
      '剥离 globalThis 上的环境依赖，收敛入参',
    ],
  },
  Port: {
    stage: 'Port',
    name: '工程化迁移与交付 (Port)',
    goal: '将逆向成果打包为生产可用的 SDK、RPC 服务或 Python/Go 模块。',
    entryCriteria: [
      '算法已提纯或封装为稳定的纯 Node.js 服务模块',
      '通过了边界测试与稳定性测试',
    ],
    exitCriteria: [
      '完成交付产物（Python wheel, Go 绑定, 或本地 CLI 脚本）',
      '配套调用示例与持续验证脚本',
    ],
    avoid: ['未做异常捕获与版本探测直接交付上线'],
    recommendedActions: [
      '打包为标准库或编写 Python subprocess / node-vm 调用封装',
      '编写自动化回归测试脚本',
    ],
  },
};

function printHelp() {
  console.log(`
stage-advisor.js - 逆向工程 6 大阶段决策向导与状态机推断

用法:
  node stage-advisor.js [选项]

选项:
      --explain <stage|all>         详细展示某个阶段（或全部阶段）的准入/准出/目标与避坑原则
                                    可选: Observe | Capture | Rebuild | Patch | DeepDive | PureExtraction | Port | all
      --stage <stage>               当前所处阶段 (默认: 根据传入状态自动推断)
      --has-target <true|false>     是否已确定目标请求
      --hook-records <number>       已采集到的 hook 运行时样本数量
      --has-rebuild <true|false>    是否已导出本地 rebuild 脚手架
      --passing <true|false>        本地 Node.js 运行结果是否已通过且与真值对齐
      --first-divergence <true|false> 是否已识别到本地与浏览器的第一分叉点
      --json                        以 JSON 格式输出结果
  -h, --help                        显示帮助信息

示例:
  node stage-advisor.js --explain Observe
  node stage-advisor.js --explain all
  node stage-advisor.js --has-target true --hook-records 0
  node stage-advisor.js --stage Patch --passing false --json
`);
}

function recommendNext(opts) {
  const {
    currentStage,
    hasTarget = false,
    hookRecords = 0,
    hasRebuild = false,
    passing = false,
    firstDivergenceKnown = false,
  } = opts;

  if (currentStage === 'PureExtraction' && passing) {
    return {
      stage: 'PureExtraction',
      confidence: 0.9,
      action: '运行 detect-crypto 识别算法库并剔除剩余环境代码',
      why: '当前任务在 PureExtraction 且本地链路已稳定通过，应尽快提取纯函数并消除 DOM 伪造依赖。',
      avoid: ['过早进入断点', '未对比真值直接重写'],
    };
  }

  if (currentStage === 'Patch' && !passing) {
    return {
      stage: 'Patch',
      confidence: 0.92,
      action: '运行 diff-env-requirements 分析错误日志并最小补环境',
      why: '当前处于 Patch 阶段且本地运行未通过，必须根据真实报错针对性补齐环境，消除分叉点。',
      avoid: ['盲目补入大量无关全局对象', '跳过报错直接猜测算法'],
    };
  }

  if (!hasTarget) {
    return {
      stage: 'Observe',
      confidence: 0.95,
      action: '在网络流量中定位目标请求，分析 Initiator 堆栈与参数名',
      why: '尚未锁定目标请求与参数边界，切勿盲目开始分析混淆脚本。',
      avoid: ['过早补环境', '盲目反混淆整站 JS'],
    };
  }

  if (hookRecords <= 0) {
    return {
      stage: 'Capture',
      confidence: 0.93,
      action: '对候选签名函数或数据写出点注入 Hook 采集入参明文与真值样本',
      why: '已确认目标请求但尚无真实执行样本，需用最小侵入 Hook 采下上下文证据。',
      avoid: ['无真值样本直接本地跑脚本', '过早下断点卡死网页'],
    };
  }

  if (!hasRebuild) {
    return {
      stage: 'Rebuild',
      confidence: 0.88,
      action: '使用 export-rebuild-bundle 导出本地 Node.js 复现脚手架',
      why: '已有真值样本与候选代码，应固化为本地可独立运行的工程，方便自动化调试。',
      avoid: ['只在浏览器控制台手工调试', '直接用 Python 重写'],
    };
  }

  if (!passing || !firstDivergenceKnown) {
    return {
      stage: 'Patch',
      confidence: 0.85,
      action:
        '在本地运行 entry.js，观察报错并用 diff-env-requirements 针对性修复',
      why: '已建立本地脚手架但尚未完全跑通，需沿着报错链条逐步对齐浏览器环境真值。',
      avoid: ['无日志盲补', '一次性修改过多代码'],
    };
  }

  return {
    stage: 'PureExtraction',
    confidence: 0.8,
    action: '验证多组入参一致性，提炼纯函数并准备迁移交付',
    why: '本地复现已跑通且真值对齐，可以进入纯算提取阶段。',
    avoid: ['不测试边界直接交付'],
  };
}

function parseBool(val) {
  if (val === undefined) return undefined;
  if (val === true || val === 'true' || val === '1') return true;
  if (val === false || val === 'false' || val === '0') return false;
  return undefined;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        explain: {type: 'string'},
        stage: {type: 'string'},
        'has-target': {type: 'string'},
        'hook-records': {type: 'string'},
        'has-rebuild': {type: 'string'},
        passing: {type: 'string'},
        'first-divergence': {type: 'string'},
        json: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`参数解析错误: ${err.message}`);
    process.exit(1);
  }

  const {values} = parsed;
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const isJson = Boolean(values.json);

  if (values.explain) {
    const target = values.explain.trim();
    if (target.toLowerCase() === 'all') {
      if (isJson) {
        console.log(JSON.stringify({success: true, stages: STAGES}, null, 2));
      } else {
        console.log('🧭 逆向工程 6 大阶段决策向导与标准手册');
        console.log(
          '============================================================\n',
        );
        for (const [key, s] of Object.entries(STAGES)) {
          console.log(`📌 [${key}] ${s.name}`);
          console.log(`   🎯 阶段目标: ${s.goal}`);
          console.log(`   🚪 准入条件: ${s.entryCriteria.join('；')}`);
          console.log(`   🏁 准出条件: ${s.exitCriteria.join('；')}`);
          console.log(`   🚫 核心避坑: ${s.avoid.join('；')}`);
          console.log(`   🛠️  推荐动作: ${s.recommendedActions.join('；')}\n`);
        }
      }
      return;
    }

    const matchedKey = Object.keys(STAGES).find(
      k => k.toLowerCase() === target.toLowerCase(),
    );
    if (!matchedKey) {
      console.error(
        `错误: 未知阶段 "${target}"。可选: ${Object.keys(STAGES).join(', ')}, all`,
      );
      process.exit(1);
    }

    const s = STAGES[matchedKey];
    if (isJson) {
      console.log(JSON.stringify({success: true, stage: s}, null, 2));
    } else {
      console.log(`📌 阶段详情: ${s.name}`);
      console.log(`🎯 阶段目标: ${s.goal}`);
      console.log('\n🚪 准入条件 (Entry Criteria):');
      s.entryCriteria.forEach(c => console.log(`   - ${c}`));
      console.log('\n🏁 准出条件 (Exit Criteria):');
      s.exitCriteria.forEach(c => console.log(`   - ${c}`));
      console.log('\n🚫 核心避坑 (Avoid):');
      s.avoid.forEach(a => console.log(`   * ${a}`));
      console.log('\n🛠️ 推荐操作与动作 (Actions):');
      s.recommendedActions.forEach(a => console.log(`   > ${a}`));
    }
    return;
  }

  // 状态机推荐下一步
  const hasTarget = parseBool(values['has-target']);
  const hookRecords =
    values['hook-records'] !== undefined
      ? parseInt(values['hook-records'], 10)
      : undefined;
  const hasRebuild = parseBool(values['has-rebuild']);
  const passing = parseBool(values.passing);
  const firstDivergenceKnown = parseBool(values['first-divergence']);

  const advice = recommendNext({
    currentStage: values.stage,
    hasTarget,
    hookRecords: hookRecords ?? (hasRebuild || passing ? 5 : 0),
    hasRebuild: hasRebuild ?? passing,
    passing,
    firstDivergenceKnown,
  });

  if (isJson) {
    console.log(JSON.stringify({success: true, advice}, null, 2));
  } else {
    console.log('🤖 逆向工作流决策向导建议:');
    console.log('------------------------------------------------------------');
    console.log(
      `   当前推荐阶段: [${advice.stage}] (置信度: ${(advice.confidence * 100).toFixed(0)}%)`,
    );
    console.log(`   👉 推荐动作: ${advice.action}`);
    console.log(`   💡 推荐原因: ${advice.why}`);
    if (advice.avoid && advice.avoid.length > 0) {
      console.log(`   ⚠️  当前切忌: ${advice.avoid.join('，')}`);
    }
  }
}

main();
