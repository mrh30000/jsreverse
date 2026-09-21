#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import * as parser from '@babel/parser';
import traverseImport from '@babel/traverse';
import * as t from '@babel/types';

const traverse = traverseImport.default || traverseImport;

function printHelp() {
  console.log(`
detect-crypto.js - 基于 AST 模式与常量特征库快速扫描 JavaScript 源码中的加解密算法与密码学库

用法:
  node detect-crypto.js --input <file.js> [选项]

选项:
  -i, --input <path>      待扫描的 JavaScript 源码文件路径
  -c, --code <string>     待扫描的代码文本
      --json              以 JSON 格式输出匹配结果与特征详情
  -h, --help              显示帮助信息

示例:
  node detect-crypto.js --input ./bundle.js
  node detect-crypto.js --code "const hash = CryptoJS.MD5('test');" --json
`);
}

const ALGORITHMS = {
  symmetric: [
    {
      name: 'AES',
      patterns: [/\bAES\b/i, /Rijndael/i, /0x63,\s*0x7c,\s*0x77/],
      desc: '高级加密标准 (AES)',
    },
    {
      name: 'DES',
      patterns: [/\bDES\b/i, /TripleDES/i, /3DES/i],
      desc: '数据加密标准 (DES / 3DES)',
    },
    {name: 'RC4', patterns: [/\bRC4\b/i, /arcfour/i], desc: '流加密算法 RC4'},
    {
      name: 'ChaCha20',
      patterns: [/\bChaCha20\b/i, /expand 32-byte k/i],
      desc: '流加密算法 ChaCha20',
    },
    {
      name: 'SM4',
      patterns: [/\bSM4\b/i, /0xd6,\s*0x90,\s*0xe9/i],
      desc: '中国国密对称加密 SM4',
    },
  ],
  asymmetric: [
    {
      name: 'RSA',
      patterns: [
        /\bRSA\b/i,
        /JSEncrypt/i,
        /setPublicKey/i,
        /setPrivateKey/i,
        /-----BEGIN (PUBLIC|RSA PRIVATE) KEY-----/,
      ],
      desc: '非对称加密 RSA',
    },
    {
      name: 'ECC/ECDSA',
      patterns: [
        /\bECC\b/i,
        /\bECDSA\b/i,
        /\bsecp256k1\b/i,
        /\bsecp256r1\b/i,
        /\bCurve25519\b/i,
      ],
      desc: '椭圆曲线加密 (ECC/ECDSA)',
    },
    {
      name: 'SM2',
      patterns: [/\bSM2\b/i, /sm-crypto.*sm2/i],
      desc: '中国国密非对称加密 SM2',
    },
  ],
  hash: [
    {
      name: 'MD5',
      patterns: [
        /\bMD5\b/i,
        /0x67452301/i,
        /0xefcdab89/i,
        /0x98badcfe/i,
        /0x10325476/i,
      ],
      desc: 'MD5 消息摘要',
    },
    {
      name: 'SHA-1',
      patterns: [
        /\bSHA1\b/i,
        /\bSHA-1\b/i,
        /0x67452301.*0xefcdab89.*0x98badcfe.*0x10325476.*0xc3d2e1f0/is,
      ],
      desc: 'SHA-1 散列摘要',
    },
    {
      name: 'SHA-256',
      patterns: [
        /\bSHA256\b/i,
        /\bSHA-256\b/i,
        /0x428a2f98/i,
        /0x71374491/i,
        /0xb5c0fbcf/i,
      ],
      desc: 'SHA-256 哈希散列',
    },
    {
      name: 'SHA-512',
      patterns: [/\bSHA512\b/i, /\bSHA-512\b/i, /0x28ae22/i],
      desc: 'SHA-512 哈希散列',
    },
    {
      name: 'HMAC',
      patterns: [/\bHMAC\b/i, /HmacMD5/i, /HmacSHA256/i],
      desc: '哈希消息认证码 (HMAC)',
    },
    {
      name: 'SM3',
      patterns: [/\bSM3\b/i, /0x7380166f/i, /0x4914b2b9/i],
      desc: '中国国密哈希杂凑 SM3',
    },
  ],
  libraries: [
    {
      name: 'CryptoJS',
      patterns: [/\bCryptoJS\b/, /crypto-js/i],
      desc: '著名开源加密库 CryptoJS',
    },
    {
      name: 'JSEncrypt',
      patterns: [/\bJSEncrypt\b/],
      desc: 'RSA 前端加密库 JSEncrypt',
    },
    {
      name: 'node-forge',
      patterns: [/\bforge\b/, /forge\.util/],
      desc: '全功能密码学库 node-forge',
    },
    {
      name: 'sm-crypto',
      patterns: [/\bsm-crypto\b/i, /sm2\.(doEncrypt|generateKeyPairHex)/],
      desc: '国密算法库 sm-crypto',
    },
    {
      name: 'WebCrypto',
      patterns: [/crypto\.subtle/i, /crypto\.getRandomValues/i],
      desc: '浏览器原生 Web Cryptography API',
    },
  ],
};

const MODES_AND_PADDINGS = [
  'CBC',
  'ECB',
  'CFB',
  'OFB',
  'CTR',
  'GCM',
  'Pkcs7',
  'Iso97971',
  'AnsiX923',
  'ZeroPadding',
  'NoPadding',
];

export function detectCrypto(code) {
  const detectedAlgorithms = [];
  const detectedLibraries = [];
  const detectedModes = [];
  const magicConstants = [];

  // 1. 正则模式匹配
  for (const category of ['symmetric', 'asymmetric', 'hash']) {
    for (const algo of ALGORITHMS[category]) {
      const matchCount = algo.patterns.filter(p => p.test(code)).length;
      if (matchCount > 0) {
        detectedAlgorithms.push({
          category,
          name: algo.name,
          description: algo.desc,
          confidence: matchCount >= 2 ? 0.9 : 0.65,
        });
      }
    }
  }

  for (const lib of ALGORITHMS.libraries) {
    if (lib.patterns.some(p => p.test(code))) {
      detectedLibraries.push({
        name: lib.name,
        description: lib.desc,
        confidence: 0.95,
      });
    }
  }

  for (const item of MODES_AND_PADDINGS) {
    const reg = new RegExp(`\\b${item}\\b`, 'i');
    if (reg.test(code)) {
      detectedModes.push(item);
    }
  }

  // 2. 深入 AST 扫描特定十六进制魔数常量与 S-box
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'asyncGenerators', 'classProperties'],
      errorRecovery: true,
    });

    traverse(ast, {
      NumericLiteral(path) {
        const val = path.node.value;
        if (val === 0x67452301)
          magicConstants.push({value: '0x67452301', algo: 'MD5 / SHA-1 初值'});
        else if (val === 0xefcdab89)
          magicConstants.push({value: '0xefcdab89', algo: 'MD5 初值'});
        else if (val === 0x428a2f98)
          magicConstants.push({value: '0x428a2f98', algo: 'SHA-256 常数表'});
        else if (val === 0x7380166f)
          magicConstants.push({value: '0x7380166f', algo: 'SM3 IV 初值'});
      },
    });
  } catch {
    // AST 解析出错不影响正则结果
  }

  // 计算综合推荐题型与置信度
  let primaryRecommendation = '通用签名 / 自定义哈希';
  if (detectedLibraries.some(l => l.name === 'CryptoJS')) {
    primaryRecommendation = 'CryptoJS 标准加密库组合题';
  } else if (
    detectedAlgorithms.some(a => a.name === 'SM2' || a.name === 'SM4')
  ) {
    primaryRecommendation = '国密算法纯算题 (SM2/SM3/SM4)';
  } else if (
    detectedAlgorithms.some(a => a.name === 'AES' || a.name === 'DES')
  ) {
    primaryRecommendation = '标准对称加密题 (AES/DES)';
  } else if (detectedAlgorithms.some(a => a.name === 'RSA')) {
    primaryRecommendation = '非对称公钥加密题 (RSA)';
  } else if (detectedAlgorithms.some(a => a.category === 'hash')) {
    primaryRecommendation = '标准摘要/散列签名题 (MD5/SHA/HMAC)';
  }

  return {
    primaryRecommendation,
    algorithms: detectedAlgorithms,
    libraries: detectedLibraries,
    modesAndPaddings: detectedModes,
    magicConstants: [
      ...new Map(magicConstants.map(m => [m.value, m])).values(),
    ],
  };
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        code: {type: 'string', short: 'c'},
        json: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`参数解析错误: ${err.message}`);
    process.exit(1);
  }

  const {values, positionals} = parsed;
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  let code = values.code;
  const inputPath = values.input || positionals[0];

  if (inputPath) {
    try {
      code = await readFile(path.resolve(inputPath), 'utf-8');
    } catch (err) {
      console.error(`读取输入文件失败: ${err.message}`);
      process.exit(1);
    }
  }

  if (!code || code.trim().length === 0) {
    console.error(
      '错误: 请提供待检测的 JS 源码 (--input <file> 或 --code "...")',
    );
    printHelp();
    process.exit(1);
  }

  const isJson = Boolean(values.json);

  try {
    const res = detectCrypto(code);

    if (isJson) {
      console.log(JSON.stringify({success: true, data: res}, null, 2));
    } else {
      console.log('🛡️  JavaScript 密码学算法与特征探测报告');
      console.log(
        '============================================================',
      );
      console.log(`🎯 推荐题型分类: 【${res.primaryRecommendation}】\n`);

      if (res.libraries.length > 0) {
        console.log('📚 检测到的第三方加密库:');
        res.libraries.forEach(l =>
          console.log(`   - ${l.name}: ${l.description}`),
        );
        console.log('');
      }

      if (res.algorithms.length > 0) {
        console.log('🔐 匹配到的加密/哈希算法:');
        res.algorithms.forEach(a =>
          console.log(
            `   - [${a.category}] ${a.name} (置信度: ${(a.confidence * 100).toFixed(0)}%): ${a.description}`,
          ),
        );
        console.log('');
      }

      if (res.modesAndPaddings.length > 0) {
        console.log(
          `⚙️  加密模式与填充特征: ${res.modesAndPaddings.join(', ')}\n`,
        );
      }

      if (res.magicConstants.length > 0) {
        console.log('🧙 匹配到的关键魔数常量:');
        res.magicConstants.forEach(m =>
          console.log(`   * ${m.value} -> ${m.algo}`),
        );
        console.log('');
      }

      if (res.algorithms.length === 0 && res.libraries.length === 0) {
        console.log(
          'ℹ️  未能在源码中检出标准加解密特征，可能为自定义混淆算法、异或变换或纯 JSVMP 保护。',
        );
      }
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 检测失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
