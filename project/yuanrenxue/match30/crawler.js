/**
 * 猿人学第 30 题 - 完整采集脚本 (Node.js)
 * 隐算 - 简单算法，复杂构建
 */

const https = require("https");
const { generateToken } = require("./encrypt");

const BASE_URL = "https://match.yuanrenxue.cn";

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function fetchTime(sessionid = null) {
  const headers = {
    "User-Agent": "yuanrenxue",
    Referer: `${BASE_URL}/match/30`,
    "X-Requested-With": "XMLHttpRequest"
  };
  if (sessionid) headers["Cookie"] = `sessionid=${sessionid}`;
  const res = await httpGet(`${BASE_URL}/api/getTime`, headers);
  return res.trim();
}

async function fetchPage(page, sessionid = null) {
  const now = await fetchTime(sessionid);
  const token = generateToken(page, now);
  const url = `${BASE_URL}/api/question/30?page=${page}&pageSize=10&kw=&token=${token}&now=${now}`;

  const headers = {
    "User-Agent": "yuanrenxue",
    Referer: `${BASE_URL}/match/30`,
    "X-Requested-With": "XMLHttpRequest"
  };
  if (sessionid) headers["Cookie"] = `sessionid=${sessionid}`;

  const text = await httpGet(url, headers);
  const json = JSON.parse(text);
  return json.data || [];
}

async function run() {
  console.log("=".repeat(60));
  console.log("  猿人学第 30 题: 隐算 - 简单算法，复杂构建 (Node.js)");
  console.log("=".repeat(60));

  const sessionid = process.env.YRX_SESSIONID || null;
  if (sessionid) {
    console.log(`[*] 使用登录凭证 sessionid: ${sessionid.slice(0, 8)}***`);
  } else {
    console.log("[*] 未提供 sessionid，使用平台公共测试环境");
  }

  let totalSum = 0;
  const allNumbers = [];

  for (let page = 1; page <= 5; page++) {
    const data = await fetchPage(page, sessionid);
    const intData = data.filter((x) => typeof x === "number");
    const pageSum = intData.reduce((a, b) => a + b, 0);
    totalSum += pageSum;
    allNumbers.push(...intData);

    console.log(`[+] 第 ${page} 页数据 (${intData.length} 条):`, intData);
    console.log(`    当前页求和: ${pageSum} | 累计总和: ${totalSum}`);

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("-".repeat(60));
  console.log(`[✓] 5 页数据采集完毕，共 ${allNumbers.length} 个有效数字`);
  console.log(`[★] 最终计算结果 (答案): ${totalSum}`);
  console.log("-".repeat(60));

  return totalSum;
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = {
  fetchPage,
  run
};
