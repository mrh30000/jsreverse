# Typora v1.12.4 安全分析：反反调试与激活劫持

> **作者**: steven026 | **发布时间**: 2026-01-04 03:52:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 20713 / 307
> **原文**: [https://www.52pojie.cn/thread-2084047-1-1.html](https://www.52pojie.cn/thread-2084047-1-1.html)

---

*本帖最后由 steven026 于 2026-1-4 16:24 编辑*

## Typora v1.12.4 安全分析：反反调试与激活劫持

### 前言

本文旨在以 Typora v1.12.4 为例，探讨 Electron 应用的安全机制与逆向分析思路。
本文默认读者已熟悉 Node.js 及 Electron 的基础知识，故不再赘述相关概念。
本文JavaScript友好，主要从 Node.js/Electron 层面切入，无需具备任何二进制/C++ 层面知识。

> 提示：本篇文章及包含的代码含有经过 AI 润色/优化部分。

### 免责声明

本文内容仅用于**Electron应用安全研究与技术交流**，旨在帮助读者理解 Electron 应用在安全分析、被逆向调试、被攻击面识别与防护以及加固方面的常见思路与潜在的风险点。
本文所涉分析过程、截图、日志与结论均以**教育与防御**目的呈现，不构成对任何特定软件、服务或厂商的恶意攻击建议。
本文仅提供安全研究分析与思路，可能存在漏洞或不足之处，作者不提供任何保证，请勿尽信本文内容，任何读者/用户因使用、引用或传播本文内容造成的一切可能直接或间接后果均由读者/用户自行承担。
本文不会提供任何成品，相关技术的使用须严格遵守适用的法律法规与行业规范，严禁将本文内容用于任何未经授权的测试、商业化侵权、破坏他人系统或其他违法违规行为。
如无法遵守上述声明，请勿阅读或使用本文内容。

### 环境准备

从官网下载截至本文发布时的最新版本 Typora（v1.12.4）。

> 默认安装路径：`C:\Program Files\Typora`

#### 初步调试尝试

首先尝试通过 `--debug` 或 `--inspect` 参数启动 `Typora.exe`。
会发现程序设置了反调试机制，当检测到命令行包含调试选项时，程序会自动拒绝启动并抛出错误。

#### 定位入口文件

在 `resources` 目录下找到 `package.json`，其定义的入口文件为 `"main": "launch.dist.js"`，但该目录下并不存在此文件。
观察同目录下的 `app.asar` 文件，可以确定入口文件已被打包在 Electron 的 ASAR 归档中。
根据 Electron 默认的加载策略，`app` 文件夹的优先级高于 `app.asar` 文件。因此，我们可以通过解压 `app.asar` 并将其重命名为 `app` 目录来提高加载优先级。

#### 安装 `asar` 工具

```
npm i -g asar
```

#### 解压并备份资源

```
asar extract app.asar app
robocopy app app.bak /E
rename app.asar app.asar.bak
```

由于暂时无需对 `node_modules` 或其他依赖库进行操作，此处仅解压 `app.asar`。

> **提示**：Typora 对核心文件存在完整性校验机制。因此需要保留所有经过修改的原始文件的备份，以备后用。

#### 分析入口代码

进入解压后的 `app` 目录，格式化并保存 `launch.dist.js`。
阅读代码后发现，该入口文件自定义了一个 V8 环境，并将 `.jsc` 字节码文件作为 Node 模块进行 `require` 加载。
除了初始化V8环境外，该文件不包含任何具体业务逻辑。

**初步结论**：

核心逻辑被编译在 `atom.compiled.dist.jsc` 字节码中，该 `.jsc` 文件本质上仍是一个 Node 模块。
**坏消息**：我们无法直接阅读或修改 `.jsc` 字节码。
**好消息**：`.jsc` 的运行完全依赖 Node.js/Electron 环境，无法脱离 JavaScript 代码去直接执行 C++ 逻辑。

虽然代码开头看上去很吓人，又是 VM 虚拟机、又是 V8 引擎，以为我们需要手撕二进制 / C++ 了，但是最后的`require`暴露了`.jsc`的本质还是一个Node模块。
这意味着我们可以通过 Hook（劫持）Node.js 或 Electron 的底层 API，间接分析、调试并修改其行为逻辑。

### 调试准备与环境劫持

#### 修改 Electron Fuses 配置

基于上述简单入口分析后，我们准备开始进行调试。
首先直接运行`Typora.exe`，发现没有任何反应，回忆我们之前的操作，发现我们仅仅是将`app.asar`解压为了`app`
尝试还原 `app.asar`再次运行程序，发现恢复正常，这说明应用对`app`与`app.asar`加载优先级进行了限制。
查阅相关资料发现，Electron 应用可以通过 `@electron/fuses` 查询与配置应用配置。

Typora 的配置如下：

```
Fuse Version: v1
  RunAsNode is Disabled
  EnableCookieEncryption is Disabled
  EnableNodeOptionsEnvironmentVariable is Enabled
  EnableNodeCliInspectArguments is Disabled
  EnableEmbeddedAsarIntegrityValidation is Disabled
  OnlyLoadAppFromAsar is Enabled
  LoadBrowserProcessSpecificV8Snapshot is Disabled
  GrantFileProtocolExtraPrivileges is Enabled
```

配置项 `OnlyLoadAppFromAsar is Enabled` 限制了程序只能从 `app.asar` 启动。
我们需要修改此配置，使 Electron 恢复默认的文件加载策略（优先加载 `app` 文件夹）。

（创建一个临时 `.cjs` 文件运行以下代码）

```
const { flipFuses, FuseV1Options, FuseVersion } = require('@electron/fuses');
const fs = require('fs');

const fullPath = 'C:\\Program Files\\Typora\\Typora.exe';

// 修改前先备份
fs.copyFileSync(fullPath, `${fullPath}.bak`);
// 修改fuse配置（同时会修改程序hash）
flipFuses(fullPath, {
    version: FuseVersion.V1,
    [FuseV1Options.OnlyLoadAppFromAsar]: false,
});
```

再次将 `app.asar` 重命名备份，此时 `Typora.exe` 已能正常运行。
然而，一旦修改 `launch.dist.js`，程序虽然能启动，但几秒后会自动退出。这表明存在完整性校验。

#### 绕过完整性校验

校验逻辑显然位于 `atom.compiled.dist.jsc` 中。
（完整性校验代码位于`Typora.exe`可能性非常低，不利于维护；且如果位于，程序一般会立即退出而不是过了几秒才退出）
完整性校验显然分为两个部分，校验&退出
通过Node.js去检测一个文件的完整性，无非就是原生`fs/http/fetch`等模块，不管是哪个模块我们都有能力去劫持与欺骗
Electron应用的主动退出，无非是`app.quit() / app.exit()`或者`process.exit() / process.kill()`等，我们可以尝试将这几个函数全部拦截，就能做到即使完整性校验劫持失败也能使应用不主动退出，从而让我们有更多机会去调试

##### 完整性校验分析结论 (TL;DR)

经排查，校验逻辑调用了 `fs/promises` 模块的 `readFile` 函数，分别读取以下 4 个文件并一一比对 Hash 值。一旦有任何不匹配，立即调用 `app.quit()` 退出程序。

```
C:\Program Files\Typora\resources\app/package.json
C:\Program Files\Typora\resources\app/launch.dist.js
C:\Program Files\Typora\resources\app/../page-dist/license.html
C:\Program Files\Typora\resources\app/../page-dist/static/js/LicenseIndex.180dd4c7.5789633d.js
```

**绕过策略**：我们可以劫持 `fs.promises.readFile`，当检测到路径中含有 `resources\app/` 时，将其重定向到原始文件的备份目录 `resources/app.bak/`。

##### 注入调试与劫持代码

在 `launch.dist.js` 中，将以下代码插入到 `require` 基础模块之后、加载 `.jsc` 字节码之前，确保调试与劫持的代码优先于核心逻辑生效。

```
// 输出调试日志
const LOG_PATH = 'D:\\Typora_Log.txt';
//fs.rmSync(LOG_PATH, { force: true });
function writeLog(...data) {
    const log = `[${new Date().toLocaleString()}] [Log] ${data.join(' ')}\n------------------\n`;
    fs.appendFileSync(LOG_PATH, log);
}
```

```
// Node模块require后会进行缓存，即使再次require会指向同一个对象
const electron = require('electron');
Object.defineProperty(electron.app, 'quit', {
    value: function () {
        writeLog('[🛡️ 拦截] 程序试图调用 app.quit()，已阻止。');
    },
    writable: true,
    configurable: true,
});
electron.app.on('browser-window-created', (_event, win) => {
    writeLog('【👀 监控】检测到 BrowserWindow 实例化！');

    // 确保dom-ready后再打开DevTools 否则第一个窗口可能会无法打开
    win.webContents.once('dom-ready', () => {
        writeLog('【🔧】打开 DevTools...');
        win.webContents.openDevTools({ mode: 'detach' });
    });
});
```

> **提示**：劫持 `electron.app.quit` 会导致用户也无法正常关闭程序，需使用任务管理器强制结束。
> 当成功完成后续的文件校验劫持后，建议移除 `electron.app.quit` 劫持。

```
// resources/app/ → resources/app.bak/
const fsPathFrom = /resources[\\/]app[\\/]/i;
const fsPathTo = 'resources\\app.bak\\';
const fsHook = {};
['readFileSync', 'readFile', 'statSync', 'stat', 'Stats', 'StatsFs', 'open', 'openSync'].forEach((property) => {
    fsHook[property] = fs[property];
    fs[property] = function (filePath, ...args) {
        if (typeof filePath == 'string' && fsPathFrom.test(filePath)) {
            const redirectPath = filePath.replace(fsPathFrom, fsPathTo);
            writeLog(`[🛡️ fsHook] 程序试图 fs.${property} 重定向 ${filePath} --> ${redirectPath}`);
            return fsHook[property].call(this, redirectPath, ...args);
        }
        writeLog(`[🛡️ fsHook] 程序试图 fs.${property} ${filePath}`);
        return fsHook[property].call(this, filePath, ...args);
    };
});
const fsPromisesHook = {};
['readFile', 'open', 'stat'].forEach((property) => {
    fsPromisesHook[property] = fs.promises[property];
    fs.promises[property] = async function (filePath, ...args) {
        if (typeof filePath == 'string' && fsPathFrom.test(filePath)) {
            const redirectPath = filePath.replace(fsPathFrom, fsPathTo);
            writeLog(`[🛡️ fsHook/Promises] 程序试图 fs.promises.${property} 重定向 ${filePath} --> ${redirectPath}`);
            return fsPromisesHook[property].call(this, redirectPath, ...args);
        }
        writeLog(`[🛡️ fsHook/Promises] 程序试图 fs.promises.${property} ${filePath}`);
        return fsPromisesHook[property].call(this, filePath, ...args);
    };
});
```

### 离线激活逻辑分析

> 本节参考了文章：[Typora 1.10.8公钥替换](https://www.52pojie.cn/thread-2040749-1-1.html)

Typora激活分为在线激活以及离线激活，虽然作者有劫持在线激活思路，但由于缺少在线请求响应样本，故无法给出相应的代码。
作者通过上述参考文章中的离线激活样本，成功劫持了离线激活代码，故本文只对离线激活进行分析与调试。

#### 前端逻辑定位

通过上文[注入调试与劫持代码]开启 DevTools 后，进入“离线激活”页面。输入任意字符并点击激活，发现界面无任何响应，包括激活失败提示，说明存在前端格式校验。
利用 DevTools 的断点调试功能，监听激活按钮点击事件，我们定位到了 React 状态机中的关键逻辑：

![](https://attach.52pojie.cn/forum/202601/04/035136qhhzkn6hhzxdizhk.png)

代码未混淆，逻辑如下：

```
if ("+" == t[0] || "#" == t[t.length - 1])
// 激活码必须以 "+" 开头，或以 "#" 结尾

t = t.substr(1, t.length - 2)
// 去除激活码首&尾字符
// （注：Windows 环境下 window.webkit 为 false，后续逻辑可以忽略）

window.Setting.invokeWithCallback("offlineActivation", t);
// 核心：通过 Electron IPC 将处理后的激活码发送至主进程的 `offlineActivation` 频道
```

前端仅负责基础格式校验和 IPC 通信，真正的激活验证逻辑位于后端（主进程）。

为深入分析，我们对 IPC 通信进行监控：

```
// IPC通信监控: invoke <-> handle
const invokeFilter = ['document.addSnapAndLastSync', 'document.setContent'];
const originalIpcMainHandle = electron.ipcMain.handle;
electron.ipcMain.handle = function (channel, listener) {
    // writeLog(`[IPC 注册] .handle 监听频道: "${channel}"`);
    const filter = !invokeFilter.includes(channel);
    return originalIpcMainHandle.call(this, channel, async (event, ...args) => {
        filter && writeLog(`[👀IPC 请求] 收到 .invoke("${channel}") 参数:`, JSON.stringify(args));
        try {
            const result = await listener(event, ...args);
            filter && writeLog(`[👀IPC 响应] .handle("${channel}") 返回结果:`, JSON.stringify(result));
            return result;
        } catch (error) {
            filter && writeLog(`[👀IPC 错误] .handle("${channel}") 执行出错:`, error);
            throw error;
        }
    });
};
```

#### RSA 公钥解密分析

通过参考[Typora 1.10.8公钥替换](https://www.52pojie.cn/thread-2040749-1-1.html)这篇文章，可以得知 `.jsc` 内部预置了 RSA 公钥，用于解密传入的激活码。
由于缺乏私钥，我们无法生成合法的加密激活码。但只要能定位到解密函数，我们就能通过 **劫持返回值** 的方式，直接伪造解密后的明文数据，从而绕过解密过程。

经测试，v1.12.4 版本依旧使用 Node.js 原生 `crypto` 模块的 `publicDecrypt` 方法。我们可以对此进行劫持：

```
const crypto = require('crypto');

const originalPublicDecrypt = crypto.publicDecrypt;
crypto.publicDecrypt = function (key, buffer) {
    writeLog('-------------------------------------------');
    writeLog('【👀 监控】 crypto.publicDecrypt 被调用');
    writeLog('Key:', key);
    writeLog('Buffer (Hex):', buffer.toString('hex'));
    writeLog('-------------------------------------------');
    return originalPublicDecrypt.call(this, key, buffer);
};
```

![](https://attach.52pojie.cn/forum/202601/04/035138vbl4851gg158bg22.png)

输入符合前端规则的激活码（`+` 开头，`#` 结尾）后，日志显示 `crypto.publicDecrypt` 确实被调用。这验证了我们的切入点是正确的。

#### 黑盒调试：推导解密后数据结构

根据 `crypto.publicDecrypt` API类型发现，只有在公钥与密文匹配时才会返回 Buffer，否则会抛出错误。随便输入的激活码会导致程序返回 `Please input a valid license code`。
为了探究程序期望的解密结果，我们不再调用原始公钥解密函数，而是直接强制返回一个我们自己构造的 Buffer。

通过黑盒测试，我们尝试推断程序如何处理解密后的 Buffer：

1. **假设一**：直接比对 Buffer？（经测试，无 `Buffer.compare / Buffer.equals` 等调用）
2. **假设二**：二次哈希验证？（经测试，无 `crypto.verify / crypto.createHash` 等调用）
3. **假设三**：转换为字符串再处理？（**命中**，检测到 `Buffer.toString('utf-8')` 调用）

```
return new Proxy(Buffer.from('test'), {
        get(t, p, r) {
            writeLog('【👀 监控】 Buffer get', String(p));
            const result = Reflect.get(t, p, r);
            // 如果结果为函数，二次监控其函数传参
            if (typeof result == 'function') {
                return new Proxy(result, {
                    apply(fn, thisArg, args) {
                        writeLog(`【👀 监控】 Buffer.${String(p)} apply args=${JSON.stringify(args)}`);
                        try {
                            // 尝试先指向 Proxy
                            return Reflect.apply(fn, r, args);
                        } catch (e) {
                            // 再指向 Buffer
                            return Reflect.apply(fn, t, args);
                        }
                    },
                });
            } else {
                return result;
            }
        },
    });
```

日志显示 Buffer 被转为 UTF-8 字符串，并被读取了长度

```
[Log] 【👀 监控】 Buffer get toString
[Log] 【👀 监控】 Buffer.toString apply args=["utf8"]
[Log] 【👀 监控】 Buffer get length
[Log] [👀IPC 响应] .handle("offlineActivation") 返回结果: [false,"Please input a valid license code"]
```

尝试将字符串转变为Machine Code，发现结果仍不对，经过多轮尝试，剩余可能性已不多
进一步猜测，代码可能会将字符串通过`JSON.parse`解析为对象，然后对对象进行取值。
我们这次劫持 `JSON.parse` 去进行验证：

```
    const result = Buffer.from(JSON.stringify({ test: '123'.repeat(50) }));
    if (!JSON.originalParse) {
        JSON.originalParse = JSON.parse;
        JSON.parse = function (text, ...args) {
            const obj = JSON.originalParse.call(this, text, ...args);
            return new Proxy(obj, {
                get(t, p, r) {
                    writeLog(`【👀 JSON监控】 ${text.slice(0, 12)}..."} 被访问属性`, p);
                    return Reflect.get(t, p, r);
                },
            });
        };
    }
    return result;
```

通过日志发现，我们终于命中了方法，并成功提取出了激活所需的关键字段。

```
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 deviceId
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 fingerprint
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 email
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 license
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 version
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 date
[Log] 【👀 JSON监控】 {"test":"123..."} 被访问属性 type
```

### 离线激活劫持

#### 解码 Machine Code

离线激活界面显示的 `Machine Code` 显然是 Base64 编码。将其`atob`解密后得到以下内容：

```
{
    "v": "win|1.12.4",
    "i": "CaXXXXXXXJ",
    "l": "XXXXXXX | XXXXXXX | Windows"
}
```

推测：`v` 为 `version`，`i` 为 `fingerprint`，`l` 可能对应 `deviceId`。

#### 构造离线激活码

查阅相关文章后，我们大致确定了离线激活码可以是以下形式（部分字段可以随便填）:

```
{
  "deviceId": "XXXXXXX | XXXXXXX | Windows",
  "fingerprint": "CaXXXXXXXJ",
  "email": "DreamNya@Dream.Nya",
  "license": "Cracked_By_DreamNya",
  "version": "win|1.12.4",
  "date": "01/04/2026",
  "type": "DreamNya"
}
```

#### 劫持公钥解密函数返回值

修改 `crypto.publicDecrypt` 的 Hook 逻辑，直接返回上述 JSON 的 Buffer：

```
crypto.publicDecrypt = function (key, buffer) {
    writeLog('-------------------------------------------');
    writeLog('【👀 监控】 crypto.publicDecrypt 被调用');
    writeLog('Key:', key);
    writeLog('Buffer (Hex):', buffer.toString('hex'));
    // return originalPublicDecrypt.call(this, key, buffer);
    // 直接返回伪造的明文 Buffer
    return Buffer.from(
        JSON.stringify({
            deviceId: 'XXXXXXX | XXXXXXX | Windows',
            fingerprint: 'CaXXXXXXXJ',
            email: 'DreamNya@Dream.Nya',
            license: 'Cracked_By_DreamNya',
            version: 'win|1.12.4',
            date: '01/04/2026',
            type: 'DreamNya',
        }),
    );
};
```

![](https://attach.52pojie.cn/forum/202601/04/035141umwg9a7wkg3kk1zn.png)

![](https://attach.52pojie.cn/forum/202601/04/035132zt66ty4xlaltl0h0.png)

查看 IPC 日志，响应终于从 `false` 变为 `true` 了，同时主界面左下角的“未激活”图标消失。
说明我们劫持`crypto.publicDecrypt`的方法确实有效，初步激活成功。

#### 劫持联网验证

重启 Typora 后发现激活状态失效。分析日志发现，程序在启动时会再次调用公钥解密函数，由于该函数已被我们完全劫持，故本地校验仍通过了。
即使如此激活状态仍失效了，说明程序可能还存在远程验证。
我们可以通过抓包、劫持请求的方式去调试远程请求
经各种远程请求模块调试，最终发现 Typora 几乎均在用 `electron.net.request` 发送核心请求，
对此，我们可以利用 `electron.protocol.handle` 进行处理。

```
// 请求日志&拦截
electron.app.whenReady().then(() => {
    electron.protocol.handle('https', async (request) => {
        writeLog(`[👀electron.net Request] ${request.method} ${request.url}`);

        // 尝试打印 Request Body
        try {
            const reqClone = request.clone();
            const reqBody = await reqClone.text();
            if (reqBody) {
                writeLog('[electron.net Request Body]:', reqBody);
            }
        } catch {}

        const response = await electron.net.fetch(request, { bypassCustomProtocolHandlers: true });

        // 克隆响应用于劫持 原始响应后续直接转发
        const resClone = response.clone();
        resClone
            .text()
            .then((resText) => {
                writeLog(`[👀electron.net Response] ${response.status} ${request.url}`);
                writeLog('[electron.net Response Body]:', resText.substring(0, 500));
            })
            .catch((err) => {
                console.error('[electron.net Response Error]:', err);
            });

        // 转发原始响应
        return response;
    });
});
```

经调试后发现，Typora在离线激活状态时，运行程序会自动将离线注册信息POST给`https://store.typora.io/api/client/renew`进行联网验证，
当响应结果为`{success:false}`时则自动清除之前的激活信息。
故我们直接通过请求`url`判断，拦截该`url`的请求，直接立即响应`{success:true}`，即可骗过验证。

```
        // 拦截目标请求，伪造响应
        if (request.url == 'https://store.typora.io/api/client/renew') {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }
```

再次执行离线激活流程，更新代码、重启程序后，可以发现激活状态不会再掉了。
（建议在设置中关闭自动更新，并在最终成品中移除调试日志等不必要的代码）。

![](https://attach.52pojie.cn/forum/202601/04/035134b0t1v9ijgrrv9mmi.png)

### 完结撒花

至此，我们仅凭 JavaScript 技术，就完成了Electron应用的逆向安全分析与实战应用。
本文展示了从反转 Fuses 配置限制、绕过文件完整性校验，到黑盒推导数据结构及网络请求劫持的完整流程。
但本文的目的不是为了分析、破解、激活特定软件，更多是一种通用的 Electron 应用安全分析思路。
旨在通过逆向分析的手段，挖掘到平时可能注意不到的安全漏洞、盲区，以便未来更好的正向开发。
