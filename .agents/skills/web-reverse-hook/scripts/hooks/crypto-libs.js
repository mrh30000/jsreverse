/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CryptoJS / JSEncrypt / SM-crypto 三个加密库拦截探针。
 *
 * 每个 install 函数都会被 `build-hook.js` 通过 `Function.prototype.toString()`
 * 序列化成可直接注入的脚本，因此函数体内**不得引用本模块的任何变量**。
 * 配置统一从唯一入参 `config` 读取。
 */

/**
 * CryptoJS：拦截 AES/DES/MD5/SHA/HMAC 等算法的加解密入参与密文。
 *
 * 走 `Function.prototype.apply` 是因为 CryptoJS 4 的加解密最终都经它分发；
 * 调用 `$super` 而不是重写 `Cipher` 方法，避免改动原型链上的可枚举形状。
 *
 * config: {hookId: string, algorithms: string[], logFormat: 'compact'|'json'|'full'}
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
    }

    return Reflect.apply(temp_apply, this, arguments);
  };

  console.log('[' + hookId + '] ✅ CryptoJS hook installed');
}

/**
 * JSEncrypt：拦截 RSA 的 encrypt/decrypt，记录公钥/私钥、明文与密文。
 *
 * config: {hookId: string, logFormat: 'compact'|'json'}
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

  if (typeof window.JSEncrypt === 'undefined') {
    console.log('[' + hookId + '] ⚠️ JSEncrypt not found on this page');
    return;
  }

  const originalEncrypt = window.JSEncrypt.prototype.encrypt;
  window.JSEncrypt.prototype.encrypt = function (plaintext) {
    const result = originalEncrypt.call(this, plaintext);

    log({
      type: 'encrypt',
      timestamp: Date.now(),
      publicKey: this.pubKey?.n?.toString(16)?.slice(0, 64) + '...' || 'N/A',
      plaintext: plaintext?.slice(0, 100),
      ciphertext: result?.slice(0, 200),
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
      ciphertext: ciphertext?.slice(0, 100),
      plaintext: result?.slice(0, 100),
    });

    return result;
  };

  console.log('[' + hookId + '] ✅ JSEncrypt hook installed');
}

/**
 * SM-crypto：拦截国密 SM2/SM3/SM4。
 *
 * 库以 `window.sm2` / `sm3` / `sm4` 或聚合对象的形式挂载，因此先做一次
 * 根对象探测；缺失的算法静默跳过，避免在只用了其中一个的页面上报错。
 *
 * config: {hookId: string, algorithms: string[], logFormat: 'compact'|'json'}
 */
export function installSMCryptoHook(config) {
  const hookId = config.hookId;
  const algorithms = config.algorithms;
  const logFormat = config.logFormat;

  function log(data) {
    if (logFormat === 'json') {
      console.log(JSON.stringify(data));
    } else {
      console.log('[SM-Crypto Hook]', data);
    }
  }

  // ponytail: 根对象取第一个存在的全局，因此同时挂载 sm2+sm3 时只会命中 sm2 的成员。
  // 这是原 hook_smcrypto 工具的行为，迁移时原样保留；要支持多根共存需改成逐个探测。
  const sm = window.sm2 || window.sm3 || window.sm4 || window;

  if (algorithms.includes('SM2') || algorithms.includes('all')) {
    if (sm.sm2) {
      const originalSm2Encrypt = sm.sm2.encrypt;
      if (originalSm2Encrypt) {
        sm.sm2.encrypt = function (data, ...args) {
          const result = originalSm2Encrypt.call(this, data, ...args);
          log({
            algorithm: 'SM2',
            type: 'encrypt',
            timestamp: Date.now(),
            plaintext: data?.slice(0, 50),
            ciphertext:
              typeof result === 'string' ? result.slice(0, 100) : '[object]',
          });
          return result;
        };
      }

      const originalSm2Decrypt = sm.sm2.decrypt;
      if (originalSm2Decrypt) {
        sm.sm2.decrypt = function (cipher, ...args) {
          const result = originalSm2Decrypt.call(this, cipher, ...args);
          log({
            algorithm: 'SM2',
            type: 'decrypt',
            timestamp: Date.now(),
            ciphertext:
              typeof cipher === 'string' ? cipher.slice(0, 50) : '[object]',
            plaintext:
              typeof result === 'string' ? result.slice(0, 50) : '[object]',
          });
          return result;
        };
      }
    }
  }

  if (algorithms.includes('SM3') || algorithms.includes('all')) {
    if (sm.sm3) {
      const originalSm3 = sm.sm3;
      sm.sm3 = function (data, ...args) {
        const result = originalSm3.call(this, data, ...args);
        log({
          algorithm: 'SM3',
          type: 'hash',
          timestamp: Date.now(),
          input: typeof data === 'string' ? data.slice(0, 50) : '[object]',
          hash: typeof result === 'string' ? result : '[object]',
        });
        return result;
      };
    }
  }

  if (algorithms.includes('SM4') || algorithms.includes('all')) {
    if (sm.sm4) {
      const originalSm4Encrypt = sm.sm4.encrypt;
      if (originalSm4Encrypt) {
        sm.sm4.encrypt = function (data, key, ...args) {
          const result = originalSm4Encrypt.call(this, data, key, ...args);
          log({
            algorithm: 'SM4',
            type: 'encrypt',
            timestamp: Date.now(),
            key: typeof key === 'string' ? key.slice(0, 32) : '[object]',
            plaintext:
              typeof data === 'string' ? data.slice(0, 50) : '[object]',
            ciphertext:
              typeof result === 'string' ? result.slice(0, 100) : '[object]',
          });
          return result;
        };
      }
    }
  }

  console.log('[' + hookId + '] ✅ SM-Crypto hook installed');
}
