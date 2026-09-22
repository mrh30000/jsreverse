# WebAssembly 转 JavaScript (wasm2js / Asm.js) 纯算转译

这份文档介绍了使用 `binaryen` 将 WebAssembly 模块离线转译为纯 JavaScript / Asm.js 代码的轻量化路线。

---

## 一、四条 Wasm 逆向路线对比

| 路线 | 产物 | 适用场景 | 依赖条件 |
|---|---|---|---|
| **扣 JS 原生调用** | Node.js + `.wasm` 载入 | 依赖 WebAssembly 原生引擎，长期自动化调用 | Node.js / 浏览器原生支持 WebAssembly |
| **wasm2js 转译** | 纯 `.js` / `Asm.js` 文本 | **无 Wasm 引擎环境**（轻量嵌入式引擎、特定沙箱、低版本宿主），或希望将 Wasm 逻辑变为普通 JS 以便打断点/AST分析 | `binaryen` 工具库（零 C 编译工具链） |
| **wasm2c 编译** | C 代码 -> `.dll` / `.so` | 高性能原生调用、跨语言 FFI 绑定（Python/Go 直接加载动态库） | GCC / Clang / MSVC C 编译工具链 |
| **纯算逆向重写** | 纯 Python / JS 代码 | 算法简单（单轮加解密、简单异或、查表） | 人工逆向还原 |

---

## 二、使用 Binaryen 进行离线转译

### 1. Node.js 离线脚本实现

```javascript
import fs from 'node:fs';
import binaryen from 'binaryen';

/**
 * 将 .wasm 文件离线转译为 Asm.js / JavaScript 字符串
 * @param {string} wasmPath 输入 wasm 文件路径
 * @param {string} outJsPath 输出 js 文件路径
 */
export function transpileWasmToJs(wasmPath, outJsPath) {
  const wasmBuffer = fs.readFileSync(wasmPath);
  const mod = binaryen.readBinary(new Uint8Array(wasmBuffer));

  // 核心调用：由 Binaryen 编译器引擎直接发射 Asm.js 语法文本
  const jsText = mod.emitAsmjs();
  
  if (outJsPath) {
    fs.writeFileSync(outJsPath, jsText, 'utf8');
    console.log(`[+] 成功转译 Wasm 至 JavaScript: ${outJsPath}`);
  }

  mod.dispose();
  return jsText;
}

// CLI 快速使用示例
if (process.argv[1] && process.argv[1].endsWith('transpile-wasm.js')) {
  const input = process.argv[2];
  const output = process.argv[3] || input.replace(/\.wasm$/i, '.asm.js');
  if (!input) {
    console.error('用法: node transpile-wasm.js <input.wasm> [output.js]');
    process.exit(1);
  }
  transpileWasmToJs(input, output);
}
```

### 2. 浏览器内实时转译 (DevTools / 插件调试)

在浏览器环境（如无法通过外部工具抓包或需要即时测试时），可直接从 CDN 引入 `binaryen`：

```html
<script type="module">
  import binaryen from 'https://cdn.jsdelivr.net/npm/binaryen@118.0.0/index.js';

  async function convertWasm(file) {
    const buffer = await file.arrayBuffer();
    const mod = binaryen.readBinary(new Uint8Array(buffer));
    const jsCode = mod.emitAsmjs();
    console.log('[*] 转译完成，可直接在控制台执行:');
    console.log(jsCode);
    mod.dispose();
  }
</script>
```

---

## 三、转译产物的加载与调用范式

Binaryen 生成的 Asm.js 产物通常具有标准包装结构：

```javascript
function instantiateAsmJs(stdlib, foreign, heap) {
  'use asm';
  // ... 生成的 Asm.js 函数体 ...
  return {
    encrypt: encrypt,
    decrypt: decrypt,
  };
}

// 外部调用引导代码
const heap = new ArrayBuffer(0x10000); // 分配 64KB 初始线性内存
const stdlib = {
  Math: Math,
  Uint8Array: Uint8Array,
  Int32Array: Int32Array,
  // 注入基础全局对象
};
const foreign = {
  // 注入导入函数（如内存打印、外部环境依赖）
};

const instance = instantiateAsmJs(stdlib, foreign, heap);
// 直接像普通 JS 一样调用导出函数
const result = instance.encrypt(123);
```

---

## 四、优势与局限性

### 核心优势
1. **彻底摆脱 WebAssembly 运行时限制**：生成的 JavaScript 代码可以在任何纯 JS 解释器中运行（包括 Duktape、QuickJS、Android JSC、execjs 等）。
2. **便于动态断点与污点追踪**：相比二进制字节码，转译出的 JavaScript 代码可以直接通过 Chrome DevTools 下断点、单步步过，配合 `console.log` 快速观测算法中间态数据流。
3. **零 C 工具链门槛**：相比 `wasm2c` 需要配置 C 编译器和头文件路径，`binaryen` 仅需 npm 包即可跨平台运行。

### 局限性与适用边界
1. **体积膨胀**：对于动辄数 MB 的复杂 C++ / Rust 编译产物（如含有完整 OpenSSL 或 FFmpeg），生成的 JS 代码会非常庞大，执行效率低于原生 WebAssembly。
2. **多线程与 SIMD**：若原 Wasm 模块使用了高级 SIMD 指令或 SharedArrayBuffer 多线程特性，Asm.js 转译可能会降级或受限。适合于核心加解密签名、哈希计算、短小 VMP 算法等场景。
