# 01 · 侦察、载体与取证纪律

> **定位**：拿到一个 App，**在打开 jadx 之前**该做的事。本文件只解决三件事：
> ① 把搜索范围从「几百个类」压到「十几个文件」；② 判载体；③ 判「版本变了没有」。
> 算法本身不在这里 —— 去 `02-native-dynamic-tracing.md` 与 `03-signature-and-packet-families.md`。

---

## §1 ★★★ 第一轮静态分析只做三件事

**来源** `52pojie-2121591`（抖音客户端 39.5.0 / 39.7.0，作者原话：第一次导出完整 JADX 后
「搜索 AES、RSA、MD5 之类的词会出来一片结果……那次搜索给了我很多文件，**几乎没给我结论**」）。

把第一轮压成 **Manifest + DEX 清单 + Native 清单**：

```bash
unzip -t app/base.apk                       # 包完整性
apkanalyzer manifest print app/base.apk     # 包名 / 版本 / SDK / 入口组件 / 多进程
apksigner verify --verbose --print-certs app/base.apk   # 签名摘要
unzip -Z1 app/base.apk | rg '^classes[0-9]*\.dex$'      # DEX 清单
unzip -Z1 app/base.apk | rg '^lib/arm64-v8a/.*\.so$' | sort   # Native 清单
```

> ★ **判据**：**先有清单，再有搜索**。没有清单时，「搜 `sign` 出来一大堆」不是信息，是噪声。
> 清单里出现 `libmetasec_ml.so` / `libsscronet.so` / `libEncryptor.so` / `libshield.so`
> 这类名字，本身就是「签名/加密在哪」的强提示。

### §1.1 单文件静态体检（进 IDA 之前）

```bash
file libtarget.so
shasum -a 256 libtarget.so
readelf -h  libtarget.so     # 架构 / 入口
readelf -Ws libtarget.so     # 导出符号（找 Java_… 静态注册）
readelf -d  libtarget.so
strings -a  libtarget.so
objdump -d  libtarget.so
```

> ★★ **`readelf -Ws` 里没有 `Java_...` 不是「函数不存在」**，而是「动态注册」——
> 下一跳是 `JNI_OnLoad` + `RegisterNatives`，见 `02-native-dynamic-tracing.md` §1。

---

## §2 载体判据表

| 现象 | 载体 | 证据强度 |
| --- | --- | --- |
| `jadx` 里逐字搜参数名（**不是**搜 `sign` 这个词）能搜到，且函数是 `native` | Java 包装 + native 实现 | 强 |
| 页面里搜不到、`jadx` 里搜不到，只有 `.so` 里能搜到 | 纯 native | 强 |
| 请求体是一长串 **hex**，解出来是 JSON | Java 层 AES → hex | 强 |
| 请求体 / 响应体是 **base64** 且长度是 16 的倍数 | 分组密码（AES/3DES 候选） | 中（需形状诊断） |
| 类目录少得异常、`jadx` 反编译出来全是 `a()` / `b()` | **加固** | 强 |
| `libapp.so` + `libflutter.so` 同时存在 | **Flutter**（Dart AOT 快照） | 强 |
| `Exports` 搜不到方法名但 `.so` 存在 | 动态注册 | 强 |
| 抓包里同一参数**每次都不同** | 有随机源（真随机 / 秒级种子 / 缓存） | 中 |

> ★★ **反向判据（省时间）**：先在页面/Java 里**逐字搜那个参数名**。
> 搜得到 ⇒ 至少有一层在高层；搜不到 ⇒ 大概率整条链在客户端。
> ⚠️ **但「搜不到」不能作为终判**：`52pojie-1915954` 搜 `sign` 无结果，**换搜业务名
> `UserLogin` 才命中**；`52pojie-676712` 搜 `sign` 命中太多，**改从业务入口
> （`LoginActivity` → 登录函数）顺流而下**才定位到。⇒ **参数名只是候选清单，不是唯一入口。**

---

## §3 加固与脱壳

### §3.1 查壳与「伪壳」

- 工具：`APK Messenger`（拖进去即判壳）、`DITOR`、`fart`、`算法助手`、`dump_so.py`。
- ★★ **`52pojie-1915954` 实测：查壳报「百度壳」，但 `mt` 一看是「伪百度」⇒ 直接用黑盒脱壳顺利脱掉。**
  ⇒ **判据：查壳工具的结论是「候选」，不是「结论」；换一个工具看类结构再确认。**

### §3.2 脱壳路线（按成本递增）

| 路线 | 适用 | 备注 |
| --- | --- | --- |
| `DITOR` 通用模式 | 部分企业壳 | `52pojie-1737837`：梆梆企业版**通用模式直接脱掉** |
| `Inspeckage` **免脱壳**看 API 调用 | 只想看加密前原文 | `52pojie-1737837`：看到了，但**全是乱码**，仍需脱壳 |
| `fart` / 在线脱壳 | 常规 | `52pojie-2070898` |
| `算法助手 Plus` + frida 脚本 | 爱加密企业版 | `52pojie-1964051`：**脱不完整**（代码被抽到 native）⇒ 求助他人补脱 |
| **so 层加固**：`dump_so.py`（yang 神项目） | so 被加固 | `52pojie-2070898`：**so 加固的视觉判据 = 正常 so 代码段在 IDA 里是蓝色，目标 so 不是** |

> ★★ **判据（so 加固）**：`ida` 里 `.text` **不是蓝色** ⇒ 先怀疑 so 被加固，别先怀疑自己看错。

### §3.3 反调试 / 反 frida 的处置顺序

1. **换工具**：frida 有检测但 Xposed 没有（`52pojie-1964051`）⇒ 优先试 `Xposed` / `LSPosed`。
2. **换版本**：`52pojie-1445251` 京东——**高版本检测 frida，版本过低功能不全 ⇒ 选 9.2.0**。
3. **换魔改 frida**：`52pojie-2070898` / `52pojie-2107248` 都用魔改版 frida。
4. **记录负结论**：`52pojie-2127692` 实测 **frida 17.9.1 / 17.6.1 × spawn / attach × 空脚本**
   全部触发 `SIGABRT`（`Unsupported Android linker` / `libnpth.so`）⇒
   ★★ **「不要在相同设备和版本上重复 frida 方案，除非环境已经变化」**（负结论也要落盘，否则下一批重踩）。
5. **抓包层绕过**：`算法助手` / `JustTrustMe` / `Postern` / `Reqable` / `小黄鸟` / `httpcanary`
   （★ 模拟器要 **Android 5.1** 才信任用户证书，6.0+ 不行 —— `52pojie-1262453`）。

---

## §4 ★★★ 版本 delta：库级哈希差分

**来源** `52pojie-2121591`。**同一 App 两个版本，先算哈希再动手。**

```python
def native_inventory(apk: Path) -> dict[str, dict[str, object]]:
    result = {}
    with zipfile.ZipFile(apk) as archive:
        for info in archive.infolist():
            if not (info.filename.startswith("lib/arm64-v8a/")
                    and info.filename.endswith(".so")):
                continue
            data = archive.read(info.filename)
            result[info.filename] = {
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
    return result
```

实测结果（39.5.0 vs 39.7.0，各 54 个 DEX / 274 个 `arm64` so）：

```text
216 个逐字节相同   58 个变化   无新增 / 无删除
libEncryptor.so / libdelta.so / libropaencrypt.so / libfileprotect.so → 完全相同
libmetasec_ml.so  → 5,657,800 bytes  →  4,505,440 bytes（体积 + 哈希都变了）
```

> ★★★ **两条落地判据**：
> 1. **逐字节相同的库 ⇒ 旧版结论可以低成本回归**（不用重做）；
> 2. **体积/哈希变了的库 ⇒ 旧函数地址继续 Hook 没有意义，甚至可能打到一段完全无关的代码上**
>    ⇒ 标 `rebaseline_required`，**不因为旧版做完就顺手写「已验证」**。
>
> 配套：`.rodata` 里的字符串地址（如 `x-gorgon` 在 `libsscronet.so` 的 RVA）**严格绑定当前版本**，
> 升级后不得复用（`52pojie-2127692` 原话：「这些地址严格绑定 45.5.3 的当前 `libsscronet.so`，
> 升级版本后不得复用」）。

---

## §5 split APK / xapk：`lib/` 里一个 so 都没有时

**来源** `52pojie-2094241`（作者原话：「不是，我 `lib` 文件夹呐？我 so 文件呐？一个都没有（天塌了！）」）。

Google Play 下发的 **split APK** 把资源拆开了：

| 包 | 内容 |
| --- | --- |
| `base.apk` | 核心代码、资源 |
| `split_config.arm64_v8a.apk` | **只含 arm64 的 so** |
| `split_config.armeabi_v7a.apk` | 只含 arm 的 so |
| `split_config.en.apk` | 英文资源 |
| `split_config.xxhdpi.apk` | 对应分辨率资源 |

> ★★★ **判据**：`base.apk` 里没有 `lib/**/*.so` ⇒ **先去同目录找 `split_config.<abi>.apk`**，
> 不要先怀疑「这个 App 没有 native 层」。
> ★ `xapk` 同理：**后缀改 `zip` 解压**，`com.*.apk` 是核心包（`52pojie-2047651`）。

---

## §6 ★★★ 证据纪律（比混淆名更麻烦的东西）

### §6.1 「字段名 ≠ 结论」，必须找**消费点**

**来源** `52pojie-2121591`（抖音直播人数）。同一个语义有一堆相似字段：
`user_count` / `getAudienceCount()` / `stats.total_user` / `room_view_stats.display_value` /
`display_short|middle|long` / `display_type`。

> ★★ **动作**：字段名只用于**列候选**；结论必须来自**消费点**——
> `rg -n 'user_count|total_user|display_type' <decompiled>` +
> `rg -n 'getUserCount|getAudienceCount' <decompiled>`，
> 看「UI 拼了什么文案、在哪种 `display_type` 下允许点击、缓存怎么合并、旧版本怎么丢弃」。

> ★★★ **反例比相等记录更有用**：实测 `当前在线 28 / 累计用户 5998` ——
> 这一条反例**直接证明 `total_user` 不是在线人数的另一份拷贝**，比几十条相等记录都有用。
> ⇒ **采样时专门去找反例**（`getAudienceCount() != user_count` / `display_value != user_count` /
> `is_hidden=true` 时控件是否真的隐藏）。

`display_type` 实测语义表（`52pojie-2121591`）：

| 值 | 解释 | 客户端处理 |
| --- | --- | --- |
| 1 | PCU，当前同时在线 | 进入「在线人数」显示与点击分支 |
| 2 | 含预览 PV | 用服务端文案 |
| 3 | 含预览 UV | 用服务端文案 |
| 4 | PV | 用服务端文案 |
| 5 | VS 场景 PV | 用服务端文案 |
| 6 | 隐藏 | 不展示人数 |

> ★ 同文另一条：`room_auth` 枚举到 **129 个具名字段，其中 119 个是长整型状态**，
> 且规则**不统一**（有的 `1` 表示开启、有的 `2` 表示关闭、有的 `0` 和 `1` 都算已识别）
> ⇒ **只写有业务消费点的 29 条，剩下没有消费点的只在调试页显示原值，不强行翻译。**

### §6.2 ★★★ Presence：区分「服务端下发 0」与「Java 默认值 0」

**来源** `52pojie-2121591`。最大的误判来源**不是混淆，而是 Java 默认值**：

```text
allow_download = false
follower_count = 0
```

可能是服务端明确下发，也可能是**响应里根本没有这个键**，Gson 建对象后留下 `false/0`。
（Feed 里的精简 `User` 对象尤其明显：粉丝数、关注数一起为 0 **不代表**这个账号真没粉丝。）

⇒ 在**响应转换边界**记录 **Presence（某键是否真实出现）**，落成四态：

| 状态 | 含义 |
| --- | --- |
| 响应确认 | 服务端确实下发了 `0` / `false` |
| 对象默认值 | 只在 Java 对象里看到，响应层没确认 |
| 跨场景补齐 | 同一 ID 的另一份对象提供了这个字段 |
| 本次未下发 | 当前证据里没有 |

> ★★ 配套：同一实体在 Feed / 搜索 / 详情 / 主页列表里完整度不同 ⇒
> **按 `aweme_id` / UID 对齐后做「字段级并集」**，冲突时**保留来源与冲突状态**，
> 不要用「最后一次捕获」静默覆盖。

### §6.3 探针先脱敏，不把清理工作留到最后

**来源** `52pojie-2121591`。原话：「如果原值先落盘，再想办法清洗，**原始文件本身已经成了风险**。」

```js
function maskOpaque(key, value) {
  const name = String(key || '').toLowerCase();
  if (!/(token|ticket|sign|secret|cookie|session|request.?id)/.test(name)) return null;
  return { kind: 'opaque', length: String(value).length,
           sha256_12: sha256Text(String(value)).slice(0, 12) };
}
```

> ★★ **短指纹的用途只有一个**：判断两次看到的值**是不是同一形态 / 有没有变化**。
> **它不是原值，也不能拿去重放。**
> ★ URL 只留结构：`{scheme, host, path, query_keys}`，**query value 不进轨迹**。
> ★ 反射遍历要有上限：递归 4~6 层 / 集合 ≤80 项 / 对象 ≤80~180 字段 / 长字符串只留长度 + 短前缀 + 短指纹。
> ★★ 限制看起来「丢信息」，实际上更容易得到可用证据 —— **探针的任务是回答当前问题，不是复制一份进程内存。**

### §6.4 ★★ 日志先定格式，再开始采

```js
let seq = 0;
function emit(type, data) {
  console.log('LIVE_EVENT=' + JSON.stringify({
    schema: 'app.live.semantic.trace.v1', seq: ++seq, at_ms: Date.now(),
    type: type, data: data || {}
  }));
}
```

> ★ **一行一个 JSON 事件 + `seq` + `at_ms` + `schema`** ⇒ 离线聚合可去重（相同状态用
> `json.dumps(sort_keys=True, separators=(",",":"))` 规范化后去重）、可比对、可回放。
> ★ 房间/会话类对象**有缓存副本**：上下滑后旧对象不会立刻消失（实测堆里可能同时十几个房间）
> ⇒ **采样只承认与前台 `current_room_id` 对齐的当前对象**，旧对象仍可保存但必须标成**缓存证据**。

---

## §7 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-2121591` 一次 Android 逆向记录(DY) | §1 三件套侦察、§4 库级哈希差分、§6 证据纪律全套、§6.4 日志格式 |
| `52pojie-2094241` flutter 逆向-某影视 app | §5 split APK |
| `52pojie-2047651` 某海外运营商 app | §5 xapk |
| `52pojie-2070898` 某消费金融 | §3.2 so 加固视觉判据、§3.3 魔改 frida |
| `52pojie-1964051` 金融 APP（Xposed RPC） | §3.2 爱加密脱壳不完整、§3.3 Xposed 优于 frida |
| `52pojie-1737837` 洞见者 | §3.2 DITOR 通用模式、Inspeckage 免脱壳的局限 |
| `52pojie-1915954` 某练通 | §2 反向判据（换搜业务名）、§3.1 伪壳 |
| `52pojie-676712` 某快药 | §2 反向判据（从业务入口顺流而下） |
| `52pojie-1445251` 京东 sign | §3.3 版本选择（避开 frida 检测） |
| `52pojie-2127692` 海外社交签名链 | §3.3 frida 负结论落盘、§4 `.rodata` 地址绑定版本 |
| `52pojie-1262453` 豆瓣 app | §3.3 模拟器 Android 5.1 才信任用户证书 |
