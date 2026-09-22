/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * JSVMP 运行时探针（proxy / transparent）。
 *
 * 由已移除的 src/tools/jsvmp/hookScripts.ts 的编译产物原样迁出，行为不变。
 * 两个 install 函数由 build-hook.js 通过 Function.prototype.toString() 序列化成
 * 可注入脚本，因此函数体内**不得引用模块级变量**。探针把记录写入
 * window.__mcp_jsvmp_log，并暴露 window.__mcp_jsvmp_uninstall /
 * window.__mcp_transparent_uninstall 以便卸载。
 */

export function installJsvmpProxyHook(config) {
  const probeWindow = window;
  if (probeWindow.__mcp_jsvmp_installed) {
    try {
      console.log('[JSVMP] Already installed, skipping');
    } catch {}
    return;
  }
  probeWindow.__mcp_jsvmp_installed = true;
  probeWindow.__mcp_jsvmp_log = probeWindow.__mcp_jsvmp_log ?? [];
  probeWindow.__mcp_proxy_originals = probeWindow.__mcp_proxy_originals ?? {};
  const OriginalError = Error;
  const originalArrayFrom = Array.from;
  const originalJsonStringify = JSON.stringify;
  const originalDateNow = Date.now;
  const originalDefineProperty = Object.defineProperty;
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  const originalHasOwnProperty = Object.prototype.hasOwnProperty;
  const originalFunctionApply = Function.prototype.apply;
  const originalFunctionBind = Function.prototype.bind;
  const originalFunctionToString = Function.prototype.toString;
  const originalReflectApply = Reflect.apply;
  const originalReflectConstruct = Reflect.construct;
  const originalReflectGet = Reflect.get;
  const originalReflectSet = Reflect.set;
  const restoreActions = [];
  let active = false;
  let recording = false;
  function preview(value, maxLength = 200) {
    try {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'function') {
        let source = '';
        try {
          source = originalReflectApply(originalFunctionToString, value, []);
        } catch {}
        return `[Function ${value.name || 'anonymous'}${source.length < 80 ? `: ${source}` : ''}]`;
      }
      if (typeof value === 'object') {
        const serialized = originalJsonStringify(value);
        if (typeof serialized === 'string') {
          return serialized.length > maxLength
            ? `${serialized.substring(0, maxLength)}...`
            : serialized;
        }
      }
      const text = String(value);
      return text.length > maxLength
        ? `${text.substring(0, maxLength)}...`
        : text;
    } catch {
      try {
        return String(value).substring(0, maxLength);
      } catch {
        return '[unprintable]';
      }
    }
  }
  function shortStack() {
    try {
      const stack = new OriginalError().stack ?? '';
      return stack.split('\n').slice(2, 8).join('\n');
    } catch {
      return '';
    }
  }
  function inTargetScript(stack) {
    return !config.scriptUrl || stack.includes(config.scriptUrl);
  }
  function log(entry) {
    const entries = probeWindow.__mcp_jsvmp_log;
    if (entries.length >= config.maxEntries) return;
    entry.ts = originalReflectApply(originalDateNow, Date, []);
    entries.push(entry);
  }
  function record(createEntry) {
    if (!active || recording) return;
    recording = true;
    try {
      const entry = createEntry();
      if (entry) log(entry);
    } catch {
      // Observation must never alter target behavior.
    } finally {
      recording = false;
    }
  }
  function typeName(value) {
    if (value === null || value === undefined) return 'null';
    try {
      const constructor = value.constructor;
      return constructor?.name || typeof value;
    } catch {
      return typeof value;
    }
  }
  function replaceValue(owner, key, replacement, label) {
    const hadOwn = originalReflectApply(originalHasOwnProperty, owner, [key]);
    const descriptor = originalGetOwnPropertyDescriptor(owner, key);
    try {
      originalDefineProperty(owner, key, {
        value: replacement,
        writable: true,
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
      });
    } catch {
      try {
        owner[key] = replacement;
        if (owner[key] !== replacement) return false;
      } catch {
        return false;
      }
    }
    restoreActions.push(() => {
      try {
        if (hadOwn && descriptor) {
          originalDefineProperty(owner, key, descriptor);
        } else {
          delete owner[key];
        }
        return label;
      } catch {
        return null;
      }
    });
    return true;
  }
  function maskAsNative(fn, name) {
    try {
      originalDefineProperty(fn, 'toString', {
        value: () => `function ${name}() { [native code] }`,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    } catch {}
  }
  if (config.trackCalls) {
    const applyHook = function (thisArg, argsArray) {
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'fn_apply',
          name: this.name || 'anonymous',
          args: preview(argsArray ? originalArrayFrom(argsArray) : [], 300),
          thisType: typeName(thisArg),
          stack,
        };
      });
      return originalReflectApply(originalFunctionApply, this, [
        thisArg,
        argsArray,
      ]);
    };
    maskAsNative(applyHook, 'apply');
    replaceValue(
      Function.prototype,
      'apply',
      applyHook,
      'Function.prototype.apply',
    );
    const callHook = function (thisArg, ...args) {
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'fn_call',
          name: this.name || 'anonymous',
          args: preview(args, 300),
          thisType: typeName(thisArg),
          stack,
        };
      });
      return originalReflectApply(this, thisArg, args);
    };
    maskAsNative(callHook, 'call');
    replaceValue(
      Function.prototype,
      'call',
      callHook,
      'Function.prototype.call',
    );
    const bindHook = function (thisArg, ...args) {
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'fn_bind',
          name: this.name || 'anonymous',
          boundThisType: typeName(thisArg),
          stack,
        };
      });
      return originalReflectApply(originalFunctionBind, this, [
        thisArg,
        ...args,
      ]);
    };
    maskAsNative(bindHook, 'bind');
    replaceValue(
      Function.prototype,
      'bind',
      bindHook,
      'Function.prototype.bind',
    );
  }
  if (config.trackReflect) {
    const reflectApplyHook = function (target, thisArg, args) {
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'reflect_apply',
          name: target?.name || 'anonymous',
          args: preview(args, 300),
          stack,
        };
      });
      return originalReflectApply(target, thisArg, args);
    };
    replaceValue(Reflect, 'apply', reflectApplyHook, 'Reflect.apply');
    const reflectGetHook = function (target, key, receiver) {
      const value =
        arguments.length >= 3
          ? originalReflectGet(target, key, receiver)
          : originalReflectGet(target, key);
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'reflect_get',
          targetType: typeName(target),
          key: String(key),
          value: preview(value, 150),
          stack,
        };
      });
      return value;
    };
    replaceValue(Reflect, 'get', reflectGetHook, 'Reflect.get');
    const reflectSetHook = function (target, key, value, receiver) {
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'reflect_set',
          targetType: typeName(target),
          key: String(key),
          value: preview(value, 150),
          stack,
        };
      });
      return arguments.length >= 4
        ? originalReflectSet(target, key, value, receiver)
        : originalReflectSet(target, key, value);
    };
    replaceValue(Reflect, 'set', reflectSetHook, 'Reflect.set');
    const reflectConstructHook = function (target, args, newTarget) {
      record(() => {
        const stack = shortStack();
        if (!inTargetScript(stack)) return null;
        return {
          type: 'reflect_construct',
          name: target?.name || 'anonymous',
          args: preview(args, 300),
          stack,
        };
      });
      return arguments.length >= 3
        ? originalReflectConstruct(target, args, newTarget)
        : originalReflectConstruct(target, args);
    };
    replaceValue(
      Reflect,
      'construct',
      reflectConstructHook,
      'Reflect.construct',
    );
  }
  if (config.trackProps) {
    for (const propertyName of config.proxyObjects) {
      let original;
      try {
        original = probeWindow[propertyName];
      } catch {
        continue;
      }
      if (
        original === null ||
        (typeof original !== 'object' && typeof original !== 'function')
      ) {
        continue;
      }
      probeWindow.__mcp_proxy_originals[propertyName] = original;
      let reading = false;
      let writing = false;
      const proxy = new Proxy(original, {
        get(target, key) {
          if (reading) return originalReflectGet(target, key, target);
          reading = true;
          try {
            const value = originalReflectGet(target, key, target);
            if (typeof key === 'string' && !key.startsWith('__mcp_')) {
              record(() => {
                const stack = shortStack();
                if (!inTargetScript(stack)) return null;
                return {
                  type: 'proxy_get',
                  obj: propertyName,
                  key,
                  value: preview(value, 150),
                  stack,
                };
              });
            }
            return typeof value === 'function'
              ? originalReflectApply(originalFunctionBind, value, [target])
              : value;
          } finally {
            reading = false;
          }
        },
        set(target, key, value) {
          if (writing) return originalReflectSet(target, key, value, target);
          writing = true;
          try {
            if (typeof key === 'string' && !key.startsWith('__mcp_')) {
              record(() => {
                const stack = shortStack();
                if (!inTargetScript(stack)) return null;
                return {
                  type: 'proxy_set',
                  obj: propertyName,
                  key,
                  value: preview(value, 150),
                  stack,
                };
              });
            }
            return originalReflectSet(target, key, value, target);
          } finally {
            writing = false;
          }
        },
        has(target, key) {
          record(() => {
            const stack = shortStack();
            if (!inTargetScript(stack)) return null;
            return {
              type: 'proxy_has',
              obj: propertyName,
              key: String(key),
              stack,
            };
          });
          return key in target;
        },
      });
      replaceValue(probeWindow, propertyName, proxy, `window.${propertyName}`);
    }
  }
  if (config.trackCalls) {
    const sensitiveApis = [
      {
        owner: Date,
        name: 'now',
        label: 'Date.now',
      },
      {
        owner: performance,
        name: 'now',
        label: 'performance.now',
      },
      {
        owner: Math,
        name: 'random',
        label: 'Math.random',
      },
    ];
    for (const api of sensitiveApis) {
      const original = api.owner[api.name];
      if (typeof original !== 'function') continue;
      const wrapper = function (...args) {
        const result = originalReflectApply(original, this, args);
        record(() => {
          const stack = shortStack();
          if (!inTargetScript(stack)) return null;
          return {
            type: 'api_call',
            name: api.label,
            args: preview(args, 100),
            returnValue: preview(result, 100),
            stack,
          };
        });
        return result;
      };
      maskAsNative(wrapper, api.name);
      replaceValue(api.owner, api.name, wrapper, api.label);
    }
  }
  probeWindow.__mcp_jsvmp_uninstall = () => {
    active = false;
    const restored = [];
    for (let index = restoreActions.length - 1; index >= 0; index -= 1) {
      const label = restoreActions[index]();
      if (label) restored.push(label);
    }
    restoreActions.length = 0;
    probeWindow.__mcp_jsvmp_installed = false;
    probeWindow.__mcp_proxy_originals = {};
    return {
      restored,
    };
  };
  try {
    console.log(
      `[JSVMP] Probe installed. scriptUrl=${config.scriptUrl || '(all)'} ` +
        `calls=${config.trackCalls} props=${config.trackProps} ` +
        `reflect=${config.trackReflect} proxyObjects=${config.proxyObjects.length}`,
    );
  } catch {}
  active = true;
}
export function installJsvmpTransparentHook(config) {
  const probeWindow = window;
  if (probeWindow.__mcp_jsvmp_transparent_installed) {
    try {
      console.log('[JSVMP-T] Already installed, skipping');
    } catch {}
    return;
  }
  probeWindow.__mcp_jsvmp_transparent_installed = true;
  probeWindow.__mcp_jsvmp_log = probeWindow.__mcp_jsvmp_log ?? [];
  probeWindow.__mcp_transparent_originals = [];
  const OriginalError = Error;
  const originalJsonStringify = JSON.stringify;
  const originalDateNow = Date.now;
  const originalFunctionToString = Function.prototype.toString;
  const originalDefineProperty = Object.defineProperty;
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
  const originalGetPrototypeOf = Object.getPrototypeOf;
  const originalReflectApply = Reflect.apply;
  function preview(value, maxLength = 150) {
    try {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'function') {
        return `[Function ${value.name || ''}]`;
      }
      if (typeof value === 'object') {
        const serialized = originalJsonStringify(value);
        if (typeof serialized === 'string') {
          return serialized.length > maxLength
            ? `${serialized.substring(0, maxLength)}...`
            : serialized;
        }
      }
      const text = String(value);
      return text.length > maxLength
        ? `${text.substring(0, maxLength)}...`
        : text;
    } catch {
      try {
        return String(value).substring(0, maxLength);
      } catch {
        return '[unprintable]';
      }
    }
  }
  function shortStack() {
    try {
      const stack = new OriginalError().stack ?? '';
      return stack.split('\n').slice(2, 8).join('\n');
    } catch {
      return '';
    }
  }
  function inTargetScript(stack) {
    return !config.scriptUrl || stack.includes(config.scriptUrl);
  }
  function log(entry) {
    const entries = probeWindow.__mcp_jsvmp_log;
    if (entries.length >= config.maxEntries) return;
    entry.ts = originalReflectApply(originalDateNow, Date, []);
    entries.push(entry);
  }
  function tapGetter(ownerName, owner, prop) {
    try {
      const descriptor = originalGetOwnPropertyDescriptor(owner, prop);
      if (
        !descriptor ||
        descriptor.configurable === false ||
        typeof descriptor.get !== 'function'
      ) {
        return false;
      }
      const originalGetter = descriptor.get;
      let originalSource;
      try {
        originalSource = originalReflectApply(
          originalFunctionToString,
          originalGetter,
          [],
        );
      } catch {
        originalSource = `function ${prop}() { [native code] }`;
      }
      const tappedGetter = function () {
        const value = originalReflectApply(originalGetter, this, []);
        try {
          const stack = shortStack();
          if (inTargetScript(stack)) {
            log({
              type: 'transparent_get',
              owner: ownerName,
              key: prop,
              value: preview(value),
              stack,
            });
          }
        } catch {}
        return value;
      };
      try {
        originalDefineProperty(tappedGetter, 'toString', {
          value: () => originalSource,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      } catch {}
      try {
        originalDefineProperty(tappedGetter, 'name', {
          value: originalGetter.name || prop,
          writable: false,
          configurable: true,
        });
      } catch {}
      probeWindow.__mcp_transparent_originals.push({
        owner,
        prop,
        descriptor,
      });
      originalDefineProperty(owner, prop, {
        get: tappedGetter,
        set: descriptor.set,
        configurable: true,
        enumerable: descriptor.enumerable,
      });
      return true;
    } catch {
      return false;
    }
  }
  const targets = [];
  function addTarget(name, value) {
    if (value && typeof value === 'object') targets.push([name, value]);
  }
  try {
    addTarget('Navigator', originalGetPrototypeOf(navigator));
  } catch {}
  try {
    addTarget('Screen', originalGetPrototypeOf(screen));
  } catch {}
  try {
    addTarget('History', originalGetPrototypeOf(history));
  } catch {}
  try {
    addTarget('Performance', originalGetPrototypeOf(performance));
  } catch {}
  try {
    addTarget('Location', originalGetPrototypeOf(location));
  } catch {}
  try {
    const htmlDocumentPrototype = originalGetPrototypeOf(document);
    addTarget('HTMLDocument', htmlDocumentPrototype);
    addTarget('Document', originalGetPrototypeOf(htmlDocumentPrototype));
  } catch {}
  let total = 0;
  let tapped = 0;
  for (const [ownerName, owner] of targets) {
    let properties;
    try {
      properties = originalGetOwnPropertyNames(owner);
    } catch {
      continue;
    }
    for (const property of properties) {
      if (
        property === 'constructor' ||
        property === '__proto__' ||
        property === 'toString' ||
        property === 'valueOf'
      ) {
        continue;
      }
      total += 1;
      if (tapGetter(ownerName, owner, property)) tapped += 1;
    }
  }
  probeWindow.__mcp_transparent_uninstall = () => {
    const restored = [];
    const originals = probeWindow.__mcp_transparent_originals ?? [];
    for (let index = originals.length - 1; index >= 0; index -= 1) {
      const original = originals[index];
      try {
        originalDefineProperty(
          original.owner,
          original.prop,
          original.descriptor,
        );
        restored.push(original.prop);
      } catch {}
    }
    probeWindow.__mcp_jsvmp_transparent_installed = false;
    probeWindow.__mcp_transparent_originals = [];
    return {
      restored,
    };
  };
  try {
    console.log(
      `[JSVMP-T] Transparent probe installed. Tapped ${tapped}/${total} ` +
        `getters. scriptUrl=${config.scriptUrl || '(all)'}`,
    );
  } catch {}
}
