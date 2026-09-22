# 浏览器 WebSocket RPC 免扣调用方案 (RPC Bridge)

这份文档用于在目标算法存在极度复杂的 JSVMP 混淆、高频动态密钥变异、强浏览器原生 API 绑定或纯算还原成本过高时，建立轻量级全双工 WebSocket RPC 桥接，实现“免扣代码，直接调用浏览器内部加密函数”。

---

## 一、方案定位与选型准则

| 维度 | 纯算还原 | Node.js 补环境 | 浏览器 WebSocket RPC |
|---|---|---|---|
| **研发耗时** | 2~7 天（逆向核心算法） | 0.5~2 天（追踪补齐缺失 API） | **10~30 分钟**（直接暴露函数） |
| **稳定性** | 极高（不受外部环境变化影响） | 中等（易因站点版本升级检测失效） | **高**（运行在真实浏览器内，指纹 100% 真实） |
| **并发性能** | 极高（单机数万 QPS） | 高（单进程千级 QPS） | 视浏览器实例数而定（通常 10~50 QPS / Tab） |
| **推荐场景** | 稳定成熟接口、高并发爬虫 | 较复杂的 Cookie/Header 签名 | **重度 JSVMP、验证码轨迹签名、应急快速交付** |

---

## 二、浏览器端轻量注入脚本 (RPC Client)

将以下脚本通过 `browsercli` 的 `evaluate_script` 或 `inject_hook` 注入目标页面（或通过篡改猴 / 油猴插件加载）：

```javascript
/**
 * 浏览器端轻量 WebSocket RPC 注入脚本 (基于 v_jstools 蒸馏提炼)
 * 作用：连接本地自动化服务 ws://127.0.0.1:25000/browser，挂载全局导出函数
 */
(function initBrowserRpcBridge() {
  const SERVER_URL = 'ws://127.0.0.1:25000/browser';
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    if (location.protocol.startsWith('chrome') || location.host === '127.0.0.1:25000') {
      return;
    }

    ws = new WebSocket(SERVER_URL);

    ws.onopen = function () {
      console.log('[RPC Bridge] ✅ WebSocket RPC 已连接至服务端:', SERVER_URL);
      ws.send(JSON.stringify({
        action: 'register',
        url: location.href,
        userAgent: navigator.userAgent,
      }));
    };

    ws.onmessage = async function (event) {
      let req;
      try {
        req = JSON.parse(event.data);
      } catch (e) {
        console.error('[RPC Bridge] 消息 JSON 解析失败:', event.data);
        return;
      }

      const { idx, method, params } = req;
      const resp = { idx, status: 'success', data: null, error: null };

      try {
        // 在此处分发或调用挂载在页面 window 上的真实加密/签名函数
        // 例如：window.mySigner(params) 或 window.byted_encrypt(params)
        if (typeof window[method] === 'function') {
          const result = await Promise.resolve(window[method](...(Array.isArray(params) ? params : [params])));
          resp.data = result;
        } else if (method === 'eval') {
          // 提供应急动态执行入口
          resp.data = (0, eval)(params);
        } else {
          throw new Error(`未在全局 window 找到方法: ${method}`);
        }
      } catch (err) {
        resp.status = 'fail';
        resp.error = err.message || String(err);
      }

      ws.send(JSON.stringify(resp));
    };

    ws.onclose = function () {
      console.warn('[RPC Bridge] ⚠️ WebSocket 断开，3 秒后自动重连...');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = function (err) {
      console.error('[RPC Bridge] ❌ WebSocket 异常:', err);
      ws.close();
    };
  }

  connect();
})();
```

---

## 三、Python 服务端调用示例 (RPC Server)

使用轻量级 Python `websockets` 库接收浏览器连接并向外部提供同步调用接口：

```python
import asyncio
import json
import uuid
import websockets
from aiohttp import web

# 存储活体浏览器连接
BROWSER_CLIENTS = []
PENDING_FUTURES = {}

async def ws_handler(websocket):
    BROWSER_CLIENTS.append(websocket)
    print(f"[+] 浏览器客户端连接上线: {websocket.remote_address}")
    try:
        async for message in websocket:
            data = json.loads(message)
            idx = data.get("idx")
            if idx in PENDING_FUTURES:
                PENDING_FUTURES[idx].set_result(data)
    finally:
        BROWSER_CLIENTS.remove(websocket)
        print(f"[-] 浏览器客户端断开")

async def call_browser_rpc(method: str, params: any, timeout: float = 5.0):
    if not BROWSER_CLIENTS:
        raise RuntimeError("无可用浏览器客户端连接，请确保目标网页已注入 RPC 脚本")
    
    ws = BROWSER_CLIENTS[-1]
    req_id = str(uuid.uuid4())
    future = asyncio.get_running_loop().create_future()
    PENDING_FUTURES[req_id] = future

    payload = json.dumps({"idx": req_id, "method": method, "params": params})
    await ws.send(payload)

    try:
        res = await asyncio.wait_for(future, timeout=timeout)
        if res.get("status") != "success":
            raise RuntimeError(f"RPC 执行失败: {res.get('error')}")
        return res.get("data")
    finally:
        PENDING_FUTURES.pop(req_id, None)

# HTTP 代理接口供普通采集脚本调用
async def http_sign_handler(request):
    body = await request.json()
    params = body.get("params", {})
    sign_result = await call_browser_rpc("get_signature", params)
    return web.json_response({"sign": sign_result})

app = web.Application()
app.router.add_post("/api/sign", http_sign_handler)

async def main():
    server = await websockets.serve(ws_handler, "127.0.0.1", 25000)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 8080)
    await site.start()
    print("[*] RPC 服务启动: WS=25000, HTTP=8080")
    await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 四、生产运维与防封策略

1. **防页面假死 / 内存泄漏**：
   - 目标标签页长时间运行后，定时（如每 2 小时）刷新或重启标签页。
   - 监听网络状态，在标签页被 WAF 盾拦截或跳转时自动报警。
2. **标签页休眠防范**：
   - Chrome 在后台可能会限制非活动标签页的定时器与 WebSocket。启动 Chrome 时添加参数 `--disable-background-timer-throttling` 与 `--disable-renderer-backgrounding`。
3. **多 Tab 负载均衡**：
   - 当单 Tab 吞吐量受限时，开启 3~5 个无头或有头页面同时连接 RPC 服务端，服务端按 Round-Robin 方式分发请求。
