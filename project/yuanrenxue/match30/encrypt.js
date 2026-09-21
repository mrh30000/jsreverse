/**
 * 猿人学第 30 题 - 纯算法实现 (Pure JavaScript)
 * 无需 Wasm 运行时，无需补任何浏览器环境
 */

function rol8(val, shift) {
  const s = shift & 7;
  return ((val << s) | (val >>> (8 - s))) & 0xff;
}

const SBOX_TABLE = [55, 169, 92, 225, 130, 77, 22, 183];

function getTableByte(x) {
  return SBOX_TABLE[x % 8];
}

function transformByte(val, i, r) {
  let v = val ^ getTableByte(i + r);
  v = (v + 61 + i * 23 + r * 41) & 0xff;
  v = rol8(v, i + r + 3);
  v = (v ^ ((i * 49 + r * 71) & 0xff));
  v = (v + (i ^ r) * 19) & 0xff;
  return v;
}

/**
 * 还原自 core.wasm 的 encrypt 函数
 * @param {string} inputStr 明文字符串，格式: `/api/question/30${now}30(!)${page}`
 * @param {number} randomByte 默认为 1 (来自 window["рɡхDеЬսɡ"].vvv & 255)
 * @returns {string} 72 位的十六进制 token 字符串
 */
function encrypt(inputStr, randomByte = 1) {
  const bytes = Array.from(Buffer.from(inputStr, "utf8"));
  const len = bytes.length;
  const out = new Uint8Array(len + 1);
  out[0] = randomByte & 0xff;
  for (let i = 0; i < len; i++) {
    out[1 + i] = bytes[i];
  }

  // Pre-round XOR
  for (let i = 0; i < len; i++) {
    out[1 + i] ^= (i * 91 + 167) & 0xff;
  }

  // 4 rounds of transformation and conditional swap
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < len; i++) {
      out[1 + i] = transformByte(out[1 + i], i, round);
    }
    let left = 0;
    let right = len - 1;
    while (left < right) {
      if (((left + right + round) & 1) === 0) {
        const tmp = out[1 + left];
        out[1 + left] = out[1 + right];
        out[1 + right] = tmp;
      }
      left++;
      right--;
    }
  }

  // Post-round XOR with randomByte
  for (let i = 0; i < len; i++) {
    out[1 + i] ^= randomByte & 0xff;
  }

  return Buffer.from(out).toString("hex");
}

function generateToken(page, now) {
  const payload = `/api/question/30${now}30(!)${page}`;
  return encrypt(payload, 1);
}

module.exports = {
  encrypt,
  generateToken,
  rol8,
  transformByte
};

if (require.main === module) {
  const testNow = "1789098542320";
  const testPage = 1;
  const expectedToken = "019e0dc022fd31a49d4bd034c6e2263156acc390f4b56c6b127e6761ece375982536e09f";
  const actualToken = generateToken(testPage, testNow);
  console.log("Input:", `/api/question/30${testNow}30(!)${testPage}`);
  console.log("Expected Token:", expectedToken);
  console.log("Actual Token:  ", actualToken);
  console.log("Verification:  ", actualToken === expectedToken ? "PASS" : "FAIL");
}
