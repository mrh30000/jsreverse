# 04 · 不可还原 ⇒ RPC 化：四条路线与边界

> **定位**：当算法**确认不可还原**（白盒 SM4 / VMP 壳 / 运行时自解密 / 依赖真实设备状态）时，
> **不要再硬还原**。这一族的正解是「**让 App 自己算**」。本文件给四条已实测路线、选路判据与边界。

---

## §1 什么时候该走这条路（准入判据）

命中**任意一条**就该考虑 RPC 化：

| 判据 | 样本 | 说明 |
| --- | --- | --- |
| 算法依赖**白盒密钥表**（`WbSm4().encode(len, bytes)` 不传密钥） | `1964051` | 密钥嵌在白盒表里，提取成本极高 |
| so 的代码**运行时才动态解密**，静态 dump 出来无成果 | `2107752` | 原话：「使用 ai 来 dump 动态文件然后静态分析，但是没什么成果」 |
| 签名**依赖真实设备状态**（`Context` / 设备指纹 / 会话） | `2127692` | 需要 `Context` 已建立、正确 `ClassLoader`、native handle 已初始化、deviceID/installID/settings 已同步 |
| 只需要**少量调用**（自动化任务，不是批量生产） | `583158` | 原话：效率低 ⇒ 「只能当做**下下策**」 |
| 参数**每三个月才换一次**（如 `openid` / `access_token` 有有效期） | `1897636` | 抓一次用三个月 ⇒ 手工成本可接受 |

> ★★ **反向判据（先做这个）**：**能整类搬到 Java 工程、能用 Python 复现的，不要 RPC 化。**
> RPC 化的代价是「必须有一台真机/模拟器常驻 + 有状态」。

---

## §2 四条路线（按侵入性排序）

### §2.1 路线一：**frida RPC**（最轻）

```python
import frida
rpc_sign = """
rpc.exports = {
    getsign: function(function_id, body_string, uuid){
      var sig = "";
      Java.perform(function(){
        var app = Java.use('android.app.ActivityThread').currentApplication();
        var ctx = app.getApplicationContext();
        var U = Java.use('com.jingdong.common.utils.BitmapkitUtils');
        sig = U.getSignFromJni(ctx, function_id, body_string, uuid, 'android', '9.2.0');
      });
      return sig;
    }
};"""
def get_sign(function_id, body_string, u):
    p = frida.get_remote_device().attach('com.jingdong.app.mall')
    s = p.create_script(rpc_sign); s.load()
    return s.exports.getsign(function_id, body_string, u)
```

**来源** `52pojie-1445251`（京东 `sign`）。要点：

- 直接调**原生的那个 `native` 方法**（`getSignFromJni(context, functionId, bodyString, uuid, …)`）；
- ★★ **三个参数必须都对**：`function_id`（路由/功能名）、`body_string`（POST 的 `data['body']`，
  **传错 sign 必失败**）、`uuid`（query 里的 `uuid`）；
- ★ 返回值形如 `st=…&sign=…&sv=102`；
- ★ **`sign` 每次都不一样**（正常，不要当 bug）；
- ★★ **前置条件**：模拟器装 `frida-server`，**版本与 Python 侧 frida 尽量一致**；
  App 版本要选**检测较弱**的（京东选 9.2.0：高版本检测 frida，版本过低功能不全）。

### §2.2 路线二：**Xposed / LSPosed + 内嵌 HTTP 服务**（frida 被检测时）

**来源** `52pojie-1964051`（金融 App，爱加密企业版）。要点：

```text
App 内起一个 HTTP 服务器（NanoHTTPD）：
  /encrypt  → 返回加密数据 + 签名
  /decrypt  → 返回解密数据
外部：adb forward tcp:50000 tcp:50000
```

- ★★ **为什么选 Xposed 而不是 frida**：原话「**Xposed 框架没有检测，但 frida 有检测**」；
- ★ 参考模板：`github.com/yinsel/XposedProjectTemplate`（源文给了完整可运行代码）；
- ★ 配套 **BurpGuard**（`github.com/yinsel/BurpGuard`）：`mitmproxy` 两个 handler
  （`ClientProxyHandler` 解密 / `BurpProxyHandler` 加密），
  **模拟器代理 8081 → Burp 上游代理 8082** ⇒ **让 Burp 里直接看到明文并可改包**。

> ★★ **这是「不可还原算法」的完整工程范式**：**RPC 生成参数 + 代理链解密回显**，
> 从而把「改包测试」这件事恢复出来。

### §2.3 路线三：**unidbg 挂成 HTTP 服务**（不想碰真机时）

**来源** `52pojie-2107752`（饰品交易平台）。原话：so 混淆 + 运行时解密 ⇒
「选择使用 unidbg 挂载这个 so 文件的服务，然后在 py 里面访问这个服务，传入参数然后模拟运行，
**直接生成签名结果**」。

```java
import com.sun.net.httpserver.HttpServer;
// unidbg 里起 HttpServer，收到请求 → callFunction → 返回签名
```

> ★ **适用**：native 算法**可离线跑**（unidbg 能跑起来），但**还原成本高于调用成本**。
> ★ **不适用**：算法依赖真实设备状态（那就回到 §2.2）。

### §2.4 路线四：**自建 Android 工程 + 把 so 放进 `jniLibs`**（最土但最稳）

**来源** `52pojie-583158`（2017，原话称之为「**曲线救国**」）。步骤：

```text
① 从 so 导出表 / Java 反编译里拿到 native 方法声明
② Android Studio 新建项目
③ main 下新建 jniLibs/<abi>/，把 so 放进去
④ 新建与 so 里注册的**包名路径完全相同**的包
⑤ 写一个类，方法声明照搬反编译出来的签名
⑥ static { System.loadLibrary("encode"); }
⑦ onCreate 里调用，debug 打印结果
```

> ★★ **判据**：源文原话「看了很久不是很明白他的算法到底是怎么实现的，
> **他修改了 MD5 的算法**，并不是一般的（数据 + key）再进行原生的 MD5 加密」
> ⇒ **这正是该走 RPC 路线的信号**。
> ★ 局限（源文自陈）：「**效率相对来说低一点，对模拟器的兼容也不太好** ⇒ 只能当做**下下策**」。

#### §2.4.1 ★★★ 「调不动 / 结果是空 / 结果不对」的第一嫌疑：**缺 `set` 前置**

**来源** `52pojie-654477`（直播 App 的 `s_sg`）。源文先按 §2.4 建好工程、直接调 native 加密方法
⇒ **调用成功但拿不到加密字段**。真因不是签名/注册，而是**缺一步"配置注入"**：

```text
① 先请求 `/user/account/token_v2` 之类接口，拿到三个值：
   serverTime / startCode / runCode
② 调 native 的 `set(Context, serverTime, startCode, runCode)` 把配置灌进去
③ 再调 `encryptUrl(拼好的参数)` ⇒ 这次才返回带签名的 URL
```

> ★★★ **判据（可迁移）**：`native` 方法能调通、**返回空/原样返回/结果明显不完整**时，
> 先去找同类里有没有 **`setXxx` / `init` / `updateConfig` 形态的方法**，
> 以及它依赖的那份"**从服务端拉下来的配置**"。
> ⇒ 这是 `02` §2.5「初始化依赖」在 **RPC 侧**的等价坑：**不是环境缺，是状态缺**。
> ★ 配套：**用 Xposed/frida 拦配置类的构造函数并打印堆栈**，
> 可直接找出"配置从哪个 URL 来、字段叫什么"（源文正是这么定位到那个接口的）。

---

## §3 选路判据表

| 条件 | 选哪条 |
| --- | --- |
| frida 可用 + 只要少量调用 | **路线一（frida RPC）** |
| **frida 被检测**，但 Xposed/LSPosed 可用 | **路线二（Xposed + 内嵌 HTTP）** |
| 不想碰真机 + native 可离线跑 | **路线三（unidbg + HTTP 服务）** |
| 只想手工验证一次算法 + 有 Android 开发环境 | **路线四（自建工程）** |
| **需要改包测试**（渗透/协议研究） | **路线二 + BurpGuard 代理链** |

> ★★ **共同前置条件清单**（`52pojie-2127692` 整理，任何一条不满足都会「调不通」）：
> `Context` 已建立 · 正确的 `ClassLoader` 可用 · 目标 `.so` 已加载 ·
> native handle 已初始化 · device ID / install ID / settings / 会话状态已同步。

---

## §4 边界与伦理（必须落盘，不是可选）

> ★★★ **不要实现「接受任意 URL / body 并返回签名的通用 Oracle」。**
> `52pojie-2127692` 原话：「不应实现接受任意 URL/body 并返回 `x-gorgon/x-argus/x-ladon` 和设备指纹的
> 通用签名 Oracle。它会把平台防滥用和设备证明能力**暴露为可自动化调用的服务**。」
>
> ⇒ **落地口径**：
> 1. RPC 服务**只绑定本机/内网**，不对外暴露；
> 2. **只服务当前任务所需的接口**，不做「任意 URL 通用签名」；
> 3. 源文**自己脱敏**的字段（如 cookie 被打成 `##`）**保留脱敏形态，不代为还原**（台账已立纪律）；
> 4. 结论中**区分「客户端能读」与「客户端能生成」** ——
>    播放授权 / 临时 URL Token 主要由服务端生成，**不要把「客户端能读」写成「客户端能生成」**
>    （`52pojie-2121591` 原话）。

---

## §5 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-1445251` 京东 sign | §2.1 frida RPC 全套与三参数 |
| `52pojie-1964051` 金融 APP | §2.2 Xposed + NanoHTTPD + BurpGuard、§1 白盒 SM4 准入 |
| `52pojie-2107752` 饰品交易 | §2.3 unidbg HTTP 服务、§1 运行时自解密准入 |
| `52pojie-583158` APP 签名提取之曲线救国 | §2.4 自建工程路线、§1 「下下策」定位 |
| `52pojie-2127692` 海外社交签名链 | §3 前置条件清单、§4 伦理边界 |
| `52pojie-1897636` sDjcSign | §1 长有效期参数准入 |
| `52pojie-654477` 直播 App `s_sg` | §2.4.1 缺 `set` 前置（调通但结果不对的真因）+ 拦配置类构造函数找接口 |
| `52pojie-2121591` 一次 Android 逆向记录 | §4 「能读 ≠ 能生成」 |
