# 某OpenClaw 一键部署包激活绕过思路分享（Node.js pkg 二进制 patch）

> **作者**: 16887988 | **发布时间**: 2026-06-10 02:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3123 / 18
> **原文**: [https://www.52pojie.cn/thread-2112074-1-1.html](https://www.52pojie.cn/thread-2112074-1-1.html)

---

### 前言

OpenClaw 是一个 AI 网关桌面客户端，Tauri + Node.js 架构。
安装包采用 Node.js pkg 打包成单个 `server.exe`（93MB），
初次启动需要联网激活才能下载主程序。

目标是：分析激活流程并绕过。

### 激活流程分析

#### 启动日志

首次运行 `Openclaw Windows.exe` 后查看日志：

```
[activation-gate] Local activation token is inactive; trying startup recovery
[server] Activation status: not activated
[server] Warning: Application is not activated
```

关键信息：启动时调用 `activation gate` 检查本地 token，
发现无效后进入 `startup recovery`（尝试服务端验证）。

#### 定位核心代码

`server.exe` 是 pkg 打包的 Node.js 应用，内嵌了 V8 编译后的 JS。
用 `strings` 搜索关键词定位激活逻辑：

```
strings server.exe | grep -i "activation. gate\|claw/verify\|activated"
```

通过字符串交叉引用，找到以下关键函数（已反混淆）：

```
TP() → 启动入口
  └─ Gd(machineId) → 激活状态检查
       ├─ Ua() → 读取本地 token
       ├─ Ud() → 启动恢复（无本地 token 时）
       │   ├─ VU() → 在线验证 /api/claw/verify
       │   └─ 离线 fallback
       └─ JU() → 在线验证接口调用
```

核心验证接口：`https://xxxxxxx.xxxxxx.top/api/claw/verify`

#### 验证逻辑特征

代码中存在多处分级判定：

```
activated: true  → 已激活（在线验证通过 / 本地缓存有效）
activated: false → 未激活（需重新验证）
```

离线模式有宽限期（`Pv = 1440*60*1000` ≈ 24h），
超过宽限期后返回 `activated: false`。

### Patch 思路

最简单的绕过方式：**二进制字节修改**。

在 JS 中 `!1` = false，`!0` = true。
替换所有 `activated:!1` → `activated:!0`。

```
target = b'activated:!1'    # false
replace = b'activated:!0'    # true

with open('server.exe', 'rb') as f:
    data = f.read()

count = 0
pos = 0
while True:
    pos = data.find(target, pos)
    if pos < 0: break
    data = data[:pos] + replace + data[pos+len(target):]
    count += 1
    pos += len(target)

with open('server.exe', 'wb') as f:
    f.write(data)

print(f'Patched {count} locations')
```

共 patch 15 处，覆盖所有 `activated: false` 返回路径（包括在线、缓存、离线 fallback）。

### 补充

* 也可以用 hosts + 本地伪造 API 服务器的方式绕过（更优雅但配置复杂）
* `server.exe` 中有 `/api/token/initial` 等额外验证接口，patch 后一并绕过
* 签名校验：安装包无强签名验证，patch 后直接运行即可

### 总结

对于 Node.js pkg 打包的应用，strings 搜索关键词 + 字节 patch 是最快速的绕过方式。
关键是理解应用的激活 fallback 机制——在线不行就走本地，
本地判定是 false 我们就把它改成 true。

### 免责声明

本文内容仅供学习交流和技术研究，请勿用于商业或非法用途。
请在下载后 24 小时内删除，支持正版软件。

主程序已经上传为网盘，需要学习的自取https://wwboc.lanzouu.com/iCoG83rip3kh
