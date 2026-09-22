/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CryptoJS / JSEncrypt / SM-crypto 三个加密库拦截探针。
 *
 * 增强点（源自 AntiDebug_Breaker 核心成果）：
 * 1. CryptoJS：补充 Hash / HMAC 的 finalize 钩子，捕获 MD5/SHA/HMAC 输入与输出哈希值。
 * 2. JSEncrypt：支持从 Webpack 闭包实例（Function.prototype.call 原型特征 hasRSAProp）中自动捕获 RSA，脱离 window.JSEncrypt 全局依赖。
 * 3. SM-crypto：支持从 Webpack 模块加载中通过特征试算（SM2/SM3/SM4 试算向量）捕获闭包导出。
 *
 * 每个 install 函数都会被 `build-hook.js` 通过 `Function.prototype.toString()`
 * 序列化成可直接注入的脚本，因此函数体内**不得引用本模块的任何外部变量**。
 * 配置统一从唯一入参 `config` 读取。
 */

/**
 * CryptoJS：拦截 AES/DES/MD5/SHA/HMAC 等算法的加解密入参与密文。
 */
export function installCryptoJSHook(config) {
  const hookId = config.hookId;
  const logFormat = config.logFormat;

  function hasEncryptProp(obj) {
    const requiredProps = [
      'ciphertext',
      'key',
      'iv',
      'algorithm',
      'mode',
      'padding',
      'blockSize',
      'formatter',
    ];
    if (!obj || typeof obj !== 'object') return false;
    return requiredProps.every(prop => prop in obj);
  }

  function hasDecryptProp(obj) {
    const requiredProps = ['sigBytes', 'words'];
    if (!obj || typeof obj !== 'object') return false;
    return requiredProps.every(prop => prop in obj);
  }

  function log(data) {
    if (logFormat === 'json') {
      console.log(JSON.stringify(data));
    } else if (logFormat === 'full') {
      console.group('[CryptoJS Hook]');
      console.log(data);
      console.groupEnd();
    } else {
      console.log('[CryptoJS]', data);
    }
  }

  const temp_apply = Function.prototype.apply;
  Function.prototype.apply = function () {
    // 1. 对称加密
    if (
      arguments.length === 2 &&
      arguments[0] &&
      arguments[1] &&
      typeof arguments[1] === 'object' &&
      arguments[1].length === 1 &&
      hasEncryptProp(arguments[1][0])
    ) {
      if (
        Object.hasOwn(arguments[0], '$super') &&
        Object.hasOwn(arguments[1], 'callee')
      ) {
        const data = {
          type: 'encrypt',
          timestamp: Date.now(),
          algorithm: arguments[1][0].algorithm?.toString() || 'Unknown',
          mode: arguments[1][0].mode?.toString() || 'Unknown',
          padding: arguments[1][0].padding?.toString() || 'Unknown',
          key: arguments[1][0].key?.toString() || 'N/A',
          iv: arguments[1][0].iv?.toString() || 'N/A',
        };

        const encryptText = arguments[0].$super.toString.call(arguments[1][0]);
        if (encryptText !== '[object Object]') {
          data.ciphertext = encryptText;
        }

        log(data);
      }
    // 2. 对称解密
    } else if (
      arguments.length === 2 &&
      arguments[0] &&
      arguments[1] &&
      typeof arguments[1] === 'object' &&
      arguments[1].length === 3 &&
      hasDecryptProp(arguments[1][1])
    ) {
      if (
        Object.hasOwn(arguments[0], '$super') &&
        Object.hasOwn(arguments[1], 'callee')
      ) {
        const data = {
          type: 'decrypt',
          timestamp: Date.now(),
          key: arguments[1][1].toString() || 'N/A',
          iv: arguments[1][2]?.iv?.toString() || 'N/A',
        };

        log(data);
      }
    // 3. 哈希 / HMAC finalize 捕获
    } else if (
      arguments.length === 2 &&
      arguments[0] &&
      arguments[1] &&
      typeof arguments[0] === 'object' &&
      typeof arguments[1] === 'object'
    ) {
      if (
        arguments[0].__proto__ &&
        Object.hasOwn(arguments[0].__proto__, '$super') &&
        Object.hasOwn(arguments[0].__proto__, '_doFinalize') &&
        arguments[0].__proto__.__proto__ &&
        Object.hasOwn(arguments[0].__proto__.__proto__, 'finalize')
      ) {
        const marker = Symbol.for('browsercli.cryptojs.finalize');
        if (!arguments[0].__proto__.__proto__.finalize[marker]) {
          const rawFinalize = arguments[0].__proto__.__proto__.finalize;
          arguments[0].__proto__.__proto__.finalize = function (...fArgs) {
            if (!Object.hasOwn(this, 'init')) {
              const hashRes = Reflect.apply(rawFinalize, this, fArgs);
              log({
                type: 'hash_or_hmac',
                timestamp: Date.now(),
                input: fArgs[0] ? String(fArgs[0]).slice(0, 200) : '(stream/internal)',
                output: hashRes ? hashRes.toString() : 'N/A',
                outputLength: hashRes ? hashRes.toString().length : 0,
              });
              return hashRes;
            }
            return Reflect.apply(rawFinalize, this, fArgs);
          };
          Object.defineProperty(arguments[0].__proto__.__proto__.finalize, marker, { value: true });
        }
      }
    }

    return Reflect.apply(temp_apply, this, arguments);
  };

  console.log('[' + hookId + '] ✅ CryptoJS hook installed (symmetric & hash/HMAC)');
}

/**
 * JSEncrypt：拦截 RSA 的 encrypt/decrypt，记录公钥/私钥、明文与密文。
 * 兼容全局 window.JSEncrypt 与 Webpack 内部闭包导出的 JSEncrypt 实例。
 */
export function installJSEncryptHook(config) {
  const hookId = config.hookId;
  const logFormat = config.logFormat;

  function log(data) {
    if (logFormat === 'json') {
      console.log(JSON.stringify(data));
    } else {
      console.log('[JSEncrypt Hook]', data);
    }
  }

  function hexToBase64(hex) {
    if (!hex || typeof hex !== 'string') return '';
    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let res = '';
    let i, val;
    for (i = 0; i + 3 <= hex.length; i += 3) {
      val = parseInt(hex.substring(i, i + 3), 16);
      res += b64chars.charAt(val >> 6) + b64chars.charAt(63 & val);
    }
    if (i + 1 === hex.length) {
      val = parseInt(hex.substring(i, i + 1), 16);
      res += b64chars.charAt(val << 2) + '==';
    } else if (i + 2 === hex.length) {
      val = parseInt(hex.substring(i, i + 2), 16);
      res += b64chars.charAt(val >> 2) + b64chars.charAt((3 & val) << 4) + '=';
    }
    return res;
  }

  function hasRSAProp(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const required = [
      'getPrivateKey',
      'getPublicKey',
      'parseKey',
    ];
    return required.every(prop => prop in obj);
  }

  // 1. 全局 window.JSEncrypt 挂钩
  if (typeof window.JSEncrypt !== 'undefined' && window.JSEncrypt.prototype) {
    const originalEncrypt = window.JSEncrypt.prototype.encrypt;
    window.JSEncrypt.prototype.encrypt = function (plaintext) {
      const result = originalEncrypt.call(this, plaintext);
      log({
        type: 'encrypt',
        timestamp: Date.now(),
        publicKey: this.pubKey?.n?.toString(16)?.slice(0, 64) + '...' || 'N/A',
        plaintext: plaintext ? String(plaintext).slice(0, 100) : '',
        ciphertext: result ? String(result).slice(0, 200) : '',
      });
      return result;
    };

    const originalDecrypt = window.JSEncrypt.prototype.decrypt;
    window.JSEncrypt.prototype.decrypt = function (ciphertext) {
      const result = originalDecrypt.call(this, ciphertext);
      log({
        type: 'decrypt',
        timestamp: Date.now(),
        privateKey: this.privKey?.n?.toString(16)?.slice(0, 64) + '...' || 'N/A',
        ciphertext: ciphertext ? String(ciphertext).slice(0, 100) : '',
        plaintext: result ? String(result).slice(0, 100) : '',
      });
      return result;
    };
  }

  // 2. 原型特征侦听（解决打包进 Webpack 闭包未挂载全局的场景）
  const encMarker = Symbol.for('browsercli.rsa.enc');
  const decMarker = Symbol.for('browsercli.rsa.dec');
  const rawCall = Function.prototype.call;

  Function.prototype.call = function (...args) {
    if (
      args.length >= 1 &&
      args[0] &&
      args[0].__proto__ &&
      typeof args[0].__proto__ === 'object' &&
      hasRSAProp(args[0].__proto__)
    ) {
      let proto = null;
      let cur = args[0];
      while (cur && cur !== Object.prototype) {
        if (typeof cur.encrypt === 'function' && typeof cur.decrypt === 'function') {
          proto = cur;
          break;
        }
        cur = Object.getPrototypeOf(cur);
      }
      if (proto && typeof proto.encrypt === 'function' && !proto.encrypt[encMarker]) {
        const rawEnc = proto.encrypt;
        proto.encrypt = function (...encArgs) {
          const res = Reflect.apply(rawEnc, this, encArgs);
          const pubKey = typeof this.getPublicKey === 'function' ? this.getPublicKey() : 'N/A';
          log({
            type: 'encrypt',
            timestamp: Date.now(),
            publicKey: pubKey,
            plaintext: encArgs[0] ? String(encArgs[0]).slice(0, 200) : '',
            ciphertextHex: res,
            ciphertextBase64: hexToBase64(res),
          });
          return res;
        };
        Object.defineProperty(proto.encrypt, encMarker, { value: true });
      }

      if (proto && typeof proto.decrypt === 'function' && !proto.decrypt[decMarker]) {
        const rawDec = proto.decrypt;
        proto.decrypt = function (...decArgs) {
          const res = Reflect.apply(rawDec, this, decArgs);
          const privKey = typeof this.getPrivateKey === 'function' ? this.getPrivateKey() : 'N/A';
          log({
            type: 'decrypt',
            timestamp: Date.now(),
            privateKey: privKey,
            ciphertext: decArgs[0] ? String(decArgs[0]).slice(0, 200) : '',
            plaintext: res,
          });
          return res;
        };
        Object.defineProperty(proto.decrypt, decMarker, { value: true });
      }
    }
    return Reflect.apply(rawCall, this, args);
  };

  console.log('[' + hookId + '] ✅ JSEncrypt RSA hook installed (global & closure sniffing)');
}

/**
 * SM-crypto：拦截国密 SM2/SM3/SM4。
 * 兼容全局 window.sm2/sm3/sm4 以及 Webpack 模块加载导出的闭包对象。
 */
export function installSMCryptoHook(config) {
  const hookId = config.hookId;
  const algorithms = config.algorithms || ['all'];
  const logFormat = config.logFormat;

  function log(data) {
    if (logFormat === 'json') {
      console.log(JSON.stringify(data));
    } else {
      console.log('[SM-Crypto Hook]', data);
    }
  }

  function wrapSM2(sm2Obj) {
    if (!sm2Obj) return;
    if (sm2Obj.doEncrypt) {
      const rawEnc = sm2Obj.doEncrypt;
      sm2Obj.doEncrypt = function (msg, publicKey, cipherMode) {
        const res = Reflect.apply(rawEnc, this, arguments);
        log({
          algorithm: 'SM2',
          type: 'encrypt',
          timestamp: Date.now(),
          plaintext: typeof msg === 'string' ? msg.slice(0, 100) : '[object]',
          publicKey: String(publicKey),
          cipherMode: cipherMode,
          ciphertext: typeof res === 'string' ? res.slice(0, 200) : '[object]',
        });
        return res;
      };
    }
    if (sm2Obj.doDecrypt) {
      const rawDec = sm2Obj.doDecrypt;
      sm2Obj.doDecrypt = function (encryptData, privateKey, cipherMode) {
        const res = Reflect.apply(rawDec, this, arguments);
        log({
          algorithm: 'SM2',
          type: 'decrypt',
          timestamp: Date.now(),
          ciphertext: typeof encryptData === 'string' ? encryptData.slice(0, 200) : '[object]',
          privateKey: String(privateKey),
          cipherMode: cipherMode,
          plaintext: typeof res === 'string' ? res.slice(0, 100) : '[object]',
        });
        return res;
      };
    }
  }

  function wrapSM4(sm4Obj) {
    if (!sm4Obj) return;
    if (sm4Obj.encrypt) {
      const rawEnc = sm4Obj.encrypt;
      sm4Obj.encrypt = function (inData, key, options) {
        const res = Reflect.apply(rawEnc, this, arguments);
        log({
          algorithm: 'SM4',
          type: 'encrypt',
          timestamp: Date.now(),
          plaintext: typeof inData === 'string' ? inData.slice(0, 100) : '[object]',
          key: typeof key === 'string' ? key.slice(0, 64) : '[object]',
          options: options,
          ciphertext: typeof res === 'string' ? res.slice(0, 200) : '[object]',
        });
        return res;
      };
    }
    if (sm4Obj.decrypt) {
      const rawDec = sm4Obj.decrypt;
      sm4Obj.decrypt = function (inData, key, options) {
        const res = Reflect.apply(rawDec, this, arguments);
        log({
          algorithm: 'SM4',
          type: 'decrypt',
          timestamp: Date.now(),
          ciphertext: typeof inData === 'string' ? inData.slice(0, 200) : '[object]',
          key: typeof key === 'string' ? key.slice(0, 64) : '[object]',
          options: options,
          plaintext: typeof res === 'string' ? res.slice(0, 100) : '[object]',
        });
        return res;
      };
    }
  }

  function wrapSM3(sm3Fn) {
    if (typeof sm3Fn !== 'function') return sm3Fn;
    return function (msg, options) {
      const res = Reflect.apply(sm3Fn, this, arguments);
      log({
        algorithm: 'SM3',
        type: 'hash',
        timestamp: Date.now(),
        input: typeof msg === 'string' ? msg.slice(0, 100) : '[object]',
        output: typeof res === 'string' ? res : '[object]',
      });
      return res;
    };
  }

  // 1. 全局 window.sm2/sm3/sm4 对象拦截
  const sm = window.sm2 || window.sm3 || window.sm4 || window;
  if (algorithms.includes('SM2') || algorithms.includes('all')) {
    if (sm.sm2) wrapSM2(sm.sm2);
  }
  if (algorithms.includes('SM4') || algorithms.includes('all')) {
    if (sm.sm4) wrapSM4(sm.sm4);
  }
  if (algorithms.includes('SM3') || algorithms.includes('all')) {
    if (sm.sm3 && typeof sm.sm3 === 'function') {
      sm.sm3 = wrapSM3(sm.sm3);
    }
  }

  // 2. Webpack 模块加载自动拦截与试算识别
  const rawCall = Function.prototype.call;
  Function.prototype.call = function (...args) {
    const res = Reflect.apply(rawCall, this, args);
    try {
      if (args.length === 4 && args[1]?.exports) {
        const exp = args[1].exports;
        // 探测 SM2 导出
        if (exp.doEncrypt && exp.generateKeyPairHex) {
          wrapSM2(exp);
        }
        // 探测 SM4 导出 (以 32 hex key 快速试算)
        if (exp.encrypt && typeof exp.encrypt === 'function') {
          try {
            const testRes = exp.encrypt('123456', '0123456789abcdeffedcba9876543210', { mode: 'cbc', iv: '000102030405060708090a0b0c0d0e0f', cipherType: 'hex' });
            if (testRes === '1b96f27b7f523118539b416810c91d4d') {
              wrapSM4(exp);
            }
          } catch (_) {}
        }
        // 探测 SM3 导出
        if (typeof exp === 'function' && exp.toString().includes('invalid mode')) {
          try {
            if (exp('123456') === '207cf410532f92a47dee245ce9b11ff71f578ebd763eb3bbea44ebd043d018fb') {
              args[1].exports = wrapSM3(exp);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
    return res;
  };

  console.log('[' + hookId + '] ✅ SM-Crypto hook installed (global & webpack loader sniffing)');
}
