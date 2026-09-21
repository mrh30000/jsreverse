/**
 * 猿人学第 30 题 - 离线 Wasm 加载与执行器 (Node.js)
 * 直接调用从 30.js 字节码中提取的原始 core.wasm
 */

const fs = require("fs");
const path = require("path");

const wasmPath = path.join(__dirname, "core.wasm");
const wasmBuffer = fs.readFileSync(wasmPath);

let cachedInstance = null;

async function getWasmInstance(randomByte = 1) {
  const wasmModule = await WebAssembly.compile(wasmBuffer);
  const instance = await WebAssembly.instantiate(wasmModule, {
    env: {
      random_byte: () => randomByte
    }
  });
  return instance;
}

/**
 * 通过 WebAssembly.Instance 执行加密
 * @param {string} inputStr 明文字符串
 * @param {number} randomByte 随机字节 (固定为 1)
 */
async function wasmEncrypt(inputStr, randomByte = 1) {
  const instance = await getWasmInstance(randomByte);
  const { encrypt, memory } = instance.exports;

  const encoder = new TextEncoder();
  const encoded = encoder.encode(inputStr);
  const mem = new Uint8Array(memory.buffer);
  
  // 写入 offset = 0
  mem.set(encoded, 0);
  
  // 执行 Wasm 内部加密逻辑
  encrypt(0, encoded.length);
  
  // 取出 len + 1 个字节
  const slice = mem.slice(0, encoded.length + 1);
  let hex = "";
  for (const b of slice) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

module.exports = {
  wasmEncrypt,
  getWasmInstance
};

if (require.main === module) {
  (async () => {
    const testNow = "1789098542320";
    const testPage = 1;
    const expectedToken = "019e0dc022fd31a49d4bd034c6e2263156acc390f4b56c6b127e6761ece375982536e09f";
    const actualToken = await wasmEncrypt(`/api/question/30${testNow}30(!)${testPage}`, 1);
    console.log("Expected Token:", expectedToken);
    console.log("Actual Token:  ", actualToken);
    console.log("Verification:  ", actualToken === expectedToken ? "PASS" : "FAIL");
  })();
}
