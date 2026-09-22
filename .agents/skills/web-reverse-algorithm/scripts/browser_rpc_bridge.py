#!/usr/bin/env python3
"""
@license
Copyright 2026 Browser-CLI
SPDX-License-Identifier: Apache-2.0

浏览器 WebSocket RPC 桥接服务与注入生成器
蒸馏自 v_jstools 核心 RPC 方案 (rpc_inject_js.js)。
用于在极度复杂 JSVMP、动态密钥或重度环境绑定下，直接暴露浏览器内的真实签名函数，免扣代码实现自动化调用。

用法:
  # 1. 打印浏览器注入代码 (可直接在控制台执行或注入)
  python browser_rpc_bridge.py --emit-inject

  # 2. 启动 RPC 双向中继服务 (默认 WS: 25000, HTTP: 8080)
  python browser_rpc_bridge.py --serve

  # 3. 连通性测试 (向已连接的浏览器发送方法调用测试)
  python browser_rpc_bridge.py --call eval --args "document.title"
"""

import argparse
import asyncio
import json
import sys
import uuid
from typing import Any, Dict, List

CLIENT_INJECT_TEMPLATE = r"""/**
 * 浏览器端 WebSocket RPC 桥接脚本
 * 自动连接本地服务 ws://127.0.0.1:{port}/browser 并挂载调用接口
 */
(function() {
  const WS_URL = 'ws://127.0.0.1:{port}/browser';
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    if (location.protocol.startsWith('chrome') || location.host === '127.0.0.1:{port}') return;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      return;
    }

    ws.onopen = function() {
      console.log('[RPC Bridge] ✅ WebSocket RPC 已连接至中继服务:', WS_URL);
      ws.send(JSON.stringify({
        action: 'register',
        url: location.href,
        title: document.title,
        ua: navigator.userAgent
      }));
    };

    ws.onmessage = async function(event) {
      let req;
      try {
        req = JSON.parse(event.data);
      } catch (e) {
        console.error('[RPC Bridge] JSON 解析失败:', event.data);
        return;
      }

      const { idx, method, params } = req;
      const resp = { idx: idx, status: 'success', data: null, error: null };

      try {
        if (typeof window[method] === 'function') {
          const args = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
          resp.data = await Promise.resolve(window[method](...args));
        } else if (method === 'eval') {
          resp.data = (0, eval)(params);
        } else {
          throw new Error('未在 window 全局作用域找到方法: ' + method);
        }
      } catch (err) {
        resp.status = 'fail';
        resp.error = err.message || String(err);
      }

      ws.send(JSON.stringify(resp));
    };

    ws.onclose = function() {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = function() {
      try { ws.close(); } catch (_) {}
    };
  }

  connect();
})();
"""

CONNECTED_CLIENTS: List[Any] = []
PENDING_FUTURES: Dict[str, asyncio.Future] = {}


async def ws_handler(websocket):
    CONNECTED_CLIENTS.append(websocket)
    remote = getattr(websocket, 'remote_address', 'browser')
    print(f"[+] 浏览器客户端已上线: {remote}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
            except Exception:
                continue

            if data.get("action") == "register":
                print(f"[*] 客户端注册成功: URL={data.get('url')} | 标题={data.get('title')}")
                continue

            idx = data.get("idx")
            if idx and idx in PENDING_FUTURES:
                PENDING_FUTURES[idx].set_result(data)
    finally:
        if websocket in CONNECTED_CLIENTS:
            CONNECTED_CLIENTS.remove(websocket)
        print(f"[-] 浏览器客户端已断开: {remote}")


async def call_browser_rpc(method: str, params: Any = None, timeout: float = 10.0) -> Any:
    if not CONNECTED_CLIENTS:
        raise RuntimeError("无在线浏览器客户端连接，请先在目标网页中注入并运行 RPC 脚本")

    client = CONNECTED_CLIENTS[-1]
    req_id = str(uuid.uuid4())
    loop = asyncio.get_running_loop()
    future = loop.create_future()
    PENDING_FUTURES[req_id] = future

    payload = json.dumps({"idx": req_id, "method": method, "params": params})
    await client.send(payload)

    try:
        resp = await asyncio.wait_for(future, timeout=timeout)
        if resp.get("status") != "success":
            raise RuntimeError(f"RPC 执行失败: {resp.get('error')}")
        return resp.get("data")
    finally:
        PENDING_FUTURES.pop(req_id, None)


async def run_server(host: str, ws_port: int, http_port: int):
    try:
        import websockets
        from aiohttp import web
    except ImportError:
        print("[-] 缺少 websockets 或 aiohttp，请运行: pip install websockets aiohttp")
        sys.exit(1)

    async def http_handler(request):
        try:
            body = await request.json()
        except Exception:
            body = {}

        method = body.get("method") or request.query.get("method")
        params = body.get("params", request.query.get("params"))
        if not method:
            return web.json_response({"status": "fail", "error": "缺少 method 参数"}, status=400)

        try:
            result = await call_browser_rpc(method, params)
            return web.json_response({"status": "success", "data": result})
        except Exception as e:
            return web.json_response({"status": "fail", "error": str(e)}, status=500)

    app = web.Application()
    app.router.add_post("/rpc", http_handler)
    app.router.add_get("/rpc", http_handler)

    ws_server = await websockets.serve(ws_handler, host, ws_port)
    runner = web.AppRunner(app)
    await runner.setup()
    http_site = web.TCPSite(runner, host, http_port)
    await http_site.start()

    print(f"======================================================")
    print(f"[*] 🚀 Browser WebSocket RPC Bridge 已启动")
    print(f"[*] WebSocket 接入地址: ws://{host}:{ws_port}/browser")
    print(f"[*] HTTP API 调用入口:  http://{host}:{http_port}/rpc")
    print(f"[*] 提示: 复制注入代码到浏览器 Console: python browser_rpc_bridge.py --emit-inject")
    print(f"======================================================")

    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        pass
    finally:
        ws_server.close()
        await ws_server.wait_closed()
        await runner.cleanup()


def main():
    parser = argparse.ArgumentParser(description="浏览器 WebSocket RPC 桥接服务")
    parser.add_argument("--emit-inject", action="store_true", help="打印浏览器端注入 JavaScript 脚本")
    parser.add_argument("--serve", action="store_true", help="启动 RPC 中继服务端")
    parser.add_argument("--host", default="127.0.0.1", help="绑定监听 IP (默认: 127.0.0.1)")
    parser.add_argument("--ws-port", type=int, default=25000, help="WebSocket 端口 (默认: 25000)")
    parser.add_argument("--http-port", type=int, default=8080, help="HTTP API 端口 (默认: 8080)")
    parser.add_argument("--call", type=str, help="向已连接的浏览器发起单次方法调用测试")
    parser.add_argument("--args", type=str, help="调用参数 (字符串或 JSON 格式)")

    args = parser.parse_args()

    if args.emit_inject:
        script = CLIENT_INJECT_TEMPLATE.replace("{port}", str(args.ws_port))
        print(script)
        return

    if args.call:
        async def do_call():
            call_param = args.args
            if call_param:
                try:
                    call_param = json.loads(call_param)
                except Exception:
                    pass
            try:
                import websockets
            except ImportError:
                print("[-] 缺少 websockets 模块")
                sys.exit(1)

            async with websockets.connect(f"ws://{args.host}:{args.ws_port}/browser") as ws:
                req_id = str(uuid.uuid4())
                payload = json.dumps({"idx": req_id, "method": args.call, "params": call_param})
                await ws.send(payload)
                resp = await ws.recv()
                print(f"[+] 响应结果: {resp}")

        asyncio.run(do_call())
        return

    # 默认启动服务
    asyncio.run(run_server(args.host, args.ws_port, args.http_port))


if __name__ == "__main__":
    main()
