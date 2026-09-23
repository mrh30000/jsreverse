# `.jsc` 的两类形态：Cocos xxtea 与 V8 字节码

> **来源**：`52pojie-1307664`（Cocos2D-JS 棋牌 App，解 jsc 拿 Authorization）、
> `52pojie-1362276`（Cocos2DX-JS 加密逆向，**独立第二来源**：从 so 里找密钥）、
> `52pojie-1913191`（xor + xxtea 的 .jsc，**第三个来源**：网易定制加密）、
> `52pojie-2054765`（JSC 字节码反编译初探，Typora 1.10.8）、
> `52pojie-2084047` + `52pojie-2085249`（Typora v1.12.4，`.jsc` 作为 Node 模块被 `require`）、
> `52pojie-2112074`（Node.js pkg 单文件 exe 的等长补丁）、
> `52pojie-2092084`（V8 / AST / 字节码长文，**只用于"读懂"**）。

## 1. 先分类：两种完全不同的 `.jsc`

| 形态 | 来源家族 | 判据 | 出路 |
| --- | --- | --- | --- |
| **Cocos2d-JS 加密脚本** | cocos2d-x / cocos2d-x-lite 游戏 | 无固定 magic；文件长度多为 4 的倍数；`xxtea_decrypt` 能出 gzip 或 JS 文本 | 本文件 §2/§3，用 `jsc_xxtea_tool.py` |
| **V8 字节码 / code cache** | Node/Electron 的 `bytenode`、`vm.Script({cachedData})`、`CodeSerializer` | 头部是 V8 私有格式，**没有可依赖的公开 magic**；权威判据是"交给 V8 反序列化" | 本文件 §5：**不要解字节码**，改劫持运行时 |

**铁律**：拿 xxtea 去试 V8 字节码、或拿字节码去猜 xxtea 密钥，都是浪费时间；
先按上表定性，再选路线。

## 2. Cocos2d-JS：`ungzip(xxtea_decrypt(file, key))`

引擎里是写死的两步（`1362276` 引 `cocos2d-x-lite` 的 `jsb_global.cpp`）：

```c
uint8_t* data = xxtea_decrypt((uint8_t*)fileData.getBytes(), fileData.getSize(),
                              (uint8_t*)xxteaKey.c_str(), xxteaKey.size(), &dataLen);
// 紧接着下三行还有：
ZipUtils::isGZipBuffer(data, dataLen)
```

⇒ 明文 = `un?gzip(xxtea_decrypt(密文, xxtea_key))`。

**操作顺序**（`jsc_xxtea_tool.py decrypt` 已实现）：

```bash
python .agents/skills/desktop-client-reverse/scripts/jsc_xxtea_tool.py identify assets/src/main.jsc
python .agents/skills/desktop-client-reverse/scripts/jsc_xxtea_tool.py decrypt assets/src/main.jsc \
    --key "<xxtea_key>" --out main.js --show-head
```

**判据只有一条**：解出来**像 JS**（可打印率高 + 命中 `function/var/return/window.` 等）。
**错误密钥也能"成功返回"一段随机字节** —— 所以工具会在产物不像 JS 时直接返回退出码 5 并**删掉产物**，
不允许"没报错就算成功"。

## 3. 网易系：签名头 + 重复密钥异或 + xxtea（`1913191` 实测）

`cc::FileUtils::getDataFromFile` 的伪代码（原文节选，语义已核对）：

```c
if (memcmp(Bytes, "netease", 7) == 0 && Bytes[7]==1 && Bytes[8]==1 && Bytes[9]==1 && Bytes[10]==0xEF) {
    size = getSize() - 11;
    memcpy(buf, Bytes + 11, size);            // 跳过 11 字节签名头
    i = 0;
    while (size--) { buf[i] ^= neteaseKey[i % strlen(neteaseKey)]; i++; }   // 重复密钥异或
}
```

⇒ 顺序是 **剥离 11 字节 → 异或 → xxtea → (可选 gzip)**：

```bash
python …/jsc_xxtea_tool.py decrypt assets/xx.jsc \
    --key "Za810xwef83lsa0A" --xor-key "Wa810xwef83lsa0A" --out xx.js
```

**该帖最值钱的一条推理**（可复用的取证套路）：
作者手上只有一个 GitHub 公开仓库的**用法示例**，里面有 xxtea_key 与 xor_sign，但缺 xor_key。
他的推理是"**两个 key 的**命名与格式**对称（同为 16 位随机字母数字）⇒ 生成算法大概率相同**"，
于是直接在 `libcocos.so` 里**枚举长度为 16 的字符串**做爆破，一次命中。
随后才回到 IDA 正向验证（构造函数里 `this->neteaseKey = "XOR_KEY"` + `getDataFromFile` 的异或循环），
**先爆破拿结果、再静态证实机制** —— 这是"时间成本优先"的正确顺序。

## 4. 密钥取证：三处落点（**双源**）

| 落点 | 具体做法 | 来源 |
| --- | --- | --- |
| **so 字符串 + 交叉引用** | IDA 打开 `armeabi-v7a/libcocos2djs.so` → 搜 `decrypt` 符号 / 搜报错串 | `1362276` |
| **报错串反向定位** | 原包搜 `Can't decrypt code for %s`，其**上一行/邻近**就是 key 的赋值 | `1307664` |
| **构造对照样本** | 自己用 cocos 打一个 demo，`build → encrypt[&gzip] → createApp`，在产物里 **搜自己预设的 key**，看它出现在哪 | `1307664` |

补充口径（`1362276`）：**不同 CPU 架构的 so 不是同一份**（`armeabi-v7a` / `arm64-v8a`），
按目标机型取对应目录；`JNI_OnLoad` →（`cocos_jni_env_init` 之类）这条链**不一定**放着密钥，
不要在初始化链上死磕，直接"搜字符串 + 看 xref"更快。

> **版本忠告**：`1307664` 与 `1362276` 都提到"网上文章千篇一律、你抄我我抄你"，
> 且 **cocos2d-x 与 cocos2d-html5 的 jsc 不是一回事**（后者才是"真字节码"）。
> 遇到解不开的 `.jsc`，先确认是哪个引擎代际，再谈算法。

## 5. V8 字节码 / bytenode：**换赛道，不解字节码**

### 5.1 为什么不该硬解

`2054765` 给的路线是"**给 d8 引擎打补丁，加 `Disassemble` 与 `LoadJSC` 两个函数**"，
让 V8 自己反序列化后打印字节码。做法（节选，仅用于理解代价）：

```cpp
// src/d8/d8.cpp
static void Disassemble(v8::internal::Isolate* isolate,
                        v8::internal::Tagged<v8::internal::BytecodeArray> bytecode,
                        std::unordered_set<uintptr_t>& visited, int depth) { … }
void v8::Shell::LoadJSC(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::internal::AlignedCachedData cached_data(filedata, length);
  auto maybe_fun = v8::internal::CodeSerializer::Deserialize(isolate, &cached_data, source, script_details);
  …
}
```

代价清单（原文实测）：**必须检出与目标完全一致的 V8 版本**（Typora 1.10.8 的 Electron 32.1.2 ⇒
v8 `12.8.374.33`）、**自建 V8 编译环境**、**自 v12 起 API 大改，网上教程的补丁直接不能用**、
还得改 `objects-printer.cc`（注释掉 `PrintSourceCode`、在 `SharedFunctionInfo` 打印处插入
`GetActiveBytecodeArray()->Disassemble(os)`）。产出是**反汇编**而不是源码。

**结论**：这条路的收益是"看懂关键分支"，成本是"一个下午起步"。**只有在目标无法在环境里运行时才值得**。

### 5.2 优先方案：把它当 Node 模块，劫持 API

`2084047` 的入口分析给出了决定性事实：

> `launch.dist.js` 自定义了一个 V8 环境、把 `.jsc` 当 Node 模块 `require` 进来，
> 除初始化外**没有任何业务逻辑** ⇒ **`.jsc` 就是一个 Node 模块**（`require` 是证据）。
> "坏消息：读不了字节码；好消息：它的运行**完全依赖 Node/Electron 环境**，
> 不可能脱离 JS 去执行纯 C++ 逻辑。"

所以正确顺序是：
1. 在**目标自己的环境里**（打包好的应用 / Electron）让它跑起来；
2. 用 §2 的注入骨架接管它**调用的 API**：`fs` / `crypto` / `electron.net.request` / `ipcMain`；
3. 需要"看它内部在算什么"时，用 `Proxy` 包住关键对象观察属性访问（见
   `references/electron-asar-and-fuses.md` §6）。

`2106643`（火绒对伪装 Electron 木马 `SeanPalia` 的分析）从**防守侧**印证了同一事实：
`main.js` 加载 `bytenode` 编译的 `decrypted_payload.jsc`，并在**运行时恢复**出主 payload ——
即"字节码只是载体，真正的行为在运行时通过 Node API 展开"，**行为分析/API 劫持比反编译字节码更有效**。

**边界（防守侧画像，不作为操作路线）**：该样本的窃取面是
**浏览器/钱包本地数据**（`Login Data` / `Web Data` / `Cookies` / `History` / `Bookmarks` /
`Local Storage` 的 leveldb，外加从 `Local State` 恢复 Chromium 密钥），
并对更强保护（`App-Bound`）另拉第二阶段 payload2。本技能**只登记这条画像用于识别
「我拿到的 `.jsc` 是不是恶意载荷」**（判据：入口脚本加载 bytenode 编译的 `.jsc` + 运行时恢复 +
结束抓包/调试进程），**不提供任何数据提取实现**。

## 6. Node.js pkg 单文件 exe：`strings` + 等长字节补丁

`2112074` 的路线（Tauri + Node.js 的桌面程序，`server.exe` 93 MB，pkg 内嵌 V8 字节码）：

```bash
strings server.exe | grep -i "activation.gate\|/api/claw/verify\|activated"
```
⇒ 定位到 `activated:!1`（= false）这类**明文常量**，然后**等长替换** `!1`→`!0`。

```bash
S=.agents/skills/desktop-client-reverse/scripts
python $S/byte_flag_patch.py scan  --in server.exe --pattern "activated:!1"
python $S/byte_flag_patch.py patch --in server.exe --pattern "activated:!1" \
    --replace "activated:!0" --expect 15 --apply --out server-patched.exe --backup server.exe.bak
```

**要点**：
* 原文 patch 了 **15 处**，覆盖"在线校验 / 本地缓存 / 离线 fallback"三条返回路径 ⇒
  **只改一处必然漏**，这就是 `--expect` 存在的理由；
* 该样本**没有强签名校验**，patch 后可直接运行（**不要默认所有目标都这样**，先确认签名机制）；
* 同类可 `--allow-resize` 的场景极少（结构化容器一律拒绝长短不等）。

**⚠️ 溯源提醒（本条的可靠性低于本文件其它条目）**：该原文的样本获取方式为网盘、
且未给出可复现的校验步骤；本文只采纳其**方法论**（`strings` 定位 → 等长补丁 → 多路径覆盖）
与"等长替换 + 备份 + 复检"的操作契约，**不背书其具体数值**。

## 7. V8 侧知识：只读到"能看懂反汇编"为止

`2092084`（34 万字节长文）里有价值的部分与**用途边界**：

| 知识点 | 具体内容 | 用途 |
| --- | --- | --- |
| 累加器模型 | 字节码是**累加器式**（`Lda…` = Load Accumulator，后面跟数据来源如 `LdaSmi`/`LdaConstant`/`LdaUndefined`/`Ldar`） | 看懂"这段在算什么" |
| 常见指令 | `LdaSmi [1]`（加载 1）、`Star`（存槽位）、`CallProperty` | 定位关键常量与调用 |
| 求值顺序 | 二元表达式：先左、再右、最后本体 | 反推参数拼接顺序 |
| 常量池与嵌套 | `BytecodeArray.constant_pool()` 里会出现 `SharedFunctionInfo` ⇒ **嵌套函数要递归反汇编**（d8 补丁里的 `visited` 集合就是防重复/防爆栈） | 用 `Disassemble` 时别漏嵌套函数 |
| 作用域 | 词法作用域由书写位置决定；闭包 = 捕获外层槽位 | 理解"变量从哪来" |

**用途边界（重要）**：这些知识用来**读懂反汇编与调试栈**，**不用来"还原源码"**。
真要拿业务逻辑，§5.2 的劫持路线永远更快、更可靠。

## 8. 坑表

| # | 坑 | 判据 / 处置 |
| --- | --- | --- |
| 1 | 用 xxtea 解 V8 字节码 | 先分类（§1）；字节码交给环境运行 |
| 2 | "解出来有输出"就当成功 | 判据是**像 JS**；错密钥也会产出随机字节（工具会删产物并返回 5） |
| 3 | 拿网上文章里的 key 硬解 | 密钥各站不同；去 so / 报错串 / demo 对照里取 |
| 4 | 只在 `arm64-v8a` 找、目标却装 `armeabi-v7a` | 按目标机型取对应 so |
| 5 | `.jsc` 里搜不到 key，就在初始化链上死磕 | 换"搜报错串 + xref"（§4） |
| 6 | 用 d8 反汇编却版本不一致 | `Deserialize` 失败 = 版本不匹配，必须严格对齐 V8 版本 |
| 7 | pkg exe 只 patch 一处 | 多返回路径 ⇒ 用 `--expect` 定数量 |
| 8 | 直接改短/改长常量 | 等长替换；长短不等默认拒绝（会破坏偏移） |
| 9 | 没备份就 patch exe | 一律 `--backup`，并留 sha256 |
| 10 | 把 `.jsc` 当"加密"而忽略"它就是个 Node 模块" | `require` 出现 ⇒ 走劫持路线 |

## 9. 反例（不要做）

* ❌ 不要一上来就"反编译字节码"。**`.jsc` 能 `require` ⇒ 一定能劫持**。
* ❌ 不要因为"解不出明文"就断言目标被强加密 —— 先确认自己**key 对不对**（判据是产物像 JS）。
* ❌ 不要照抄任何文章里的密钥常量（含本文件里的示例串）——它们只用于演示格式。
* ❌ 不要在没确认签名机制前 patch 别人的商业程序并直接运行（可能触发完整性/签名检查）。
* ❌ 不要把 `2092084` 那类长文当"操作手册"读：**它的价值是读懂反汇编**，不是"照着做能出源码"。
