# 一次 Android 逆向记录(DY)

> **作者**: bu^shan | **发布时间**: 2026-08-06 11:55:00 | **版块**: 『移动安全区』 | **查看/回复**: 1164 / 6
> **原文**: [https://www.52pojie.cn/thread-2121591-1-1.html](https://www.52pojie.cn/thread-2121591-1-1.html)

---

## 一次 Android 逆向记录

这个项目一开始并没有现在这么完整。

最早我只是想确认，抖音客户端内存里的 `Aweme`、`User` 和直播 `Room` 对象，
到底比界面上多带了哪些信息。后来顺着字段往下追，碰到了响应 Presence、Native
算法、版本迁移和插件性能问题。

分析对象固定在 Android 客户端 39.5.0 和 39.7.0。设备是 Android 13、arm64，
有 root 和 LSPosed 环境。

这篇不是“装好 JADX，搜索关键词，结束”的工具教程。我更想把中间的判断过程写
下来。

### 静态分析：先筛，不要一上来全量读 JADX

两个 APK 都很大。第一次导出完整 JADX 后，类太多、混淆名太密，搜索 AES、RSA、
MD5 之类的词会出来一片结果，TLS、RTC、播放器、第三方 SDK 全混在里面。那次
搜索给了我很多文件，几乎没给我结论。

后来我把第一轮静态分析压缩成三件事：Manifest、DEX 清单、Native 清单。

#### Manifest 和签名

```
unzip -t app_reverse_39.5.0_20260725/apk/base.apk

apkanalyzer manifest print \
  app_reverse_39.5.0_20260725/apk/base.apk

apksigner verify --verbose --print-certs \
  app_reverse_39.5.0_20260725/apk/base.apk
```

这里主要记录包名、版本号、SDK、签名摘要、入口组件和多进程情况。

#### DEX 和 Native 库

```
unzip -Z1 app_reverse_39.5.0_20260725/apk/base.apk \
  | rg '^classes[0-9]*\.dex$'

unzip -Z1 app_reverse_39.5.0_20260725/apk/base.apk \
  | rg '^lib/arm64-v8a/.*\.so$' \
  | sort
```

39.5.0 和 39.7.0 都是 54 个 DEX、274 个 arm64 `.so`。数量没变不代表内容没
变，所以接着做库级哈希差分。

#### 先用哈希把 274 个库分成两堆

我写的脚本只读取 APK 里的 `lib/arm64-v8a/*.so`，不用把两个包全部展开：

```
from __future__ import annotations

import hashlib
import zipfile
from pathlib import Path

def native_inventory(apk: Path) -> dict[str, dict[str, object]]:
    result = {}
    with zipfile.ZipFile(apk) as archive:
        for info in archive.infolist():
            if not (
                info.filename.startswith("lib/arm64-v8a/")
                and info.filename.endswith(".so")
            ):
                continue

            digest = hashlib.sha256()
            with archive.open(info) as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)

            result[Path(info.filename).name] = {
                "size": info.file_size,
                "sha256": digest.hexdigest(),
            }
    return result

old = native_inventory(
    Path("app_reverse_39.5.0_20260725/apk/base.apk")
)
new = native_inventory(
    Path("app_meta_inspector_20260725/build/app_39.7.0_base.apk")
)

unchanged = sorted(
    name
    for name in old.keys() & new.keys()
    if old[name]["sha256"] == new[name]["sha256"]
)
changed = sorted(
    name
    for name in old.keys() & new.keys()
    if old[name]["sha256"] != new[name]["sha256"]
)
added = sorted(new.keys() - old.keys())
removed = sorted(old.keys() - new.keys())

print("unchanged", len(unchanged))
print("changed", len(changed))
print("added", len(added))
print("removed", len(removed))
```

跑出来是 216 个完全相同、58 个变化，没有新增和删除。

这个结果一下把范围缩小了。像 `libEncryptor.so`、`libdelta.so`、
`libropaencrypt.so`、`libfileprotect.so` 这几项，两版逐字节相同，旧版结论可以
先做低成本回归。

`libmetasec_ml.so` 则完全不是这种情况：

```
39.5.0：5,657,800 bytes
39.7.0：4,505,440 bytes
```

体积和哈希都变了。旧函数地址继续拿来 Hook 没有意义，甚至可能打到一段完全无关
的代码上。所以 39.7.0 的 MetaSec 在 Profile 里一直标成
`rebaseline_required`，没有因为 39.5.0 做完了就顺手写成“已验证”。

这里的 Profile 是项目里的版本记录文件，用来保存 APK 哈希、重点 Native 库信息
和当前验证状态。

#### JADX 只围绕具体问题看

静态范围缩小后，我才回到 Java 模型。最先看的不是混淆工具类，而是业务对象：

```
Aweme
User
Video
Room
RoomStats
RoomViewStats
RoomAuthStatus
StreamUrl
LiveCoreSDKData
```

模型类里的 `@SerializedName` 很有用。例如：

```
@SerializedName("user_count")
public long userCount;

@SerializedName("total_user")
public long totalUser;

@SerializedName("display_type")
public int displayType;
```

但不能只凭字段名下结论。`total_user` 看起来像“总用户”，到底是累计进房、累计
独立用户，还是服务端某个中间计数，名字本身说不清。

那就继续找消费点：

```
JADX_OUT=app_reverse_39.5.0_20260725/decompiled
rg -n 'user_count|total_user|display_type' "$JADX_OUT"
rg -n 'getUserCount|getAudienceCount' "$JADX_OUT"
```

UI 拼了什么文案、在哪种 `display_type` 下允许点击、缓存怎样合并、旧版本怎样
丢弃，这些比字段定义更接近真实语义。

### 直播人数：这条线是怎么做实的

直播人数是整个项目里最适合说明“字段名不等于结论”的一条线。

一开始看到 `user_count`，我也觉得它大概就是在线人数。问题是旁边还有：

```
getAudienceCount()
stats.total_user
room_view_stats.display_value
display_short / display_middle / display_long
display_type
```

如果它们都是人数，为什么需要这么多份？

#### 先抓当前 Room，不扫整个堆

最小探针可以从稳定 getter 入手：

```
Java.perform(function () {
  const Room = Java.use(
    'com.bytedance.android.livesdkapi.depend.model.live.Room'
  );

  const original = Room.getUserCount.overload();
  original.implementation = function () {
    const result = original.call(this);
    emit('room_user_count', {
      user_count: Number(String(result))
    });
    return result;
  };
});
```

实际探针多做了几层保护：处理重载、捕获异常、限制反射深度、同状态去重，并把
Room、RoomStats、RoomViewStats 分开记录。

这里还有个不太显眼的坑。直播间上下滑后，旧 Room 对象不会立刻消失，堆里可能
同时有十几个房间。Activity 最初拿到的 `room_id` 也未必还是当前房间。第一次
用堆扫描时，我见过 `status=2` 但 `finish_time>0` 的对象，差点把它当成状态逻辑
异常。后来把对象和前台 `current_room_id` 对齐，才确认那只是离房后的缓存副本。

所以最终采样只承认当前房间。旧对象仍然可以保存，但必须标成缓存证据。

#### 日志先定格式，再开始采

我没有直接 `console.log(room)`。Frida 输出固定成一行一个 JSON 事件：

```
let seq = 0;

function emit(type, data) {
  console.log('LIVE_EVENT=' + JSON.stringify({
    schema: 'app.live.semantic.trace.v1',
    seq: ++seq,
    at_ms: Date.now(),
    type: type,
    data: data || {}
  }));
}
```

#### 样本对比

我没有只盯着一场直播。主轨迹跑了两轮，共 538 个事件、480 个 Room 快照和
29 个去重房间。后面又单独跑了显示状态、权限对象、入口码和消息对象。

离线聚合时，真实房间 ID 会先换成别名：

```
aliases = {
    room_id: f"ROOM_{index:02d}"
    for index, room_id in enumerate(first_seen_room_ids, start=1)
}
```

相同状态再做规范化去重：

```
def stable(value):
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )

unique = {stable(row): row for row in rows}
```

重点找的不是“多数时候相等”，而是反例：

* 有没有 `getAudienceCount() != user_count`；
* 有没有 `display_value != user_count`；
* `total_user` 是否会明显大于在线数；
* `display_type` 改变后，UI 文案和点击行为是否一起变化；
* `is_hidden=true` 时，人数控件是不是真的隐藏；
* 同一房间的多个缓存副本是否会给出不同显示版本。

#### 最后确认的几组关系

普通直播场景中，`user_count` 是当前同时在线，也就是 PCU。主样本里 59/59 个
去重状态满足：

```
getAudienceCount() == user_count
display_value == user_count
```

我仍然没有把这个写成所有房型的硬规则，因为静态代码里确实有按房型切换口径的
分支。

`total_user` 则是累计进入或累计用户口径。样本里出现过这样的组合：

```
当前在线：28
累计用户：5998
```

这个反例比几十条相等记录更有用，它直接证明 `total_user` 不是在线人数的另一份
拷贝。

`display_type` 最终整理成下面这样：

| 值 | 当前版本中的解释 | 客户端怎么处理 |
| --- | --- | --- |
| 1 | PCU，当前同时在线 | 进入“在线人数”显示和点击分支 |
| 2 | 含预览 PV | 使用服务端文案 |
| 3 | 含预览 UV | 使用服务端文案 |
| 4 | PV | 使用服务端文案 |
| 5 | VS 场景 PV | 使用服务端文案 |
| 6 | 隐藏 | 不展示人数 |

type=3 的运行时样本里出现了“2432人看过”“3.3万人看过”等文案，同时
`incremental=true`、`hidden=false`。它和静态消费分支能对上，所以才把它写成
“含预览 UV”。

#### `room_auth` 的判断

权限对象也绕过一次弯路。它里面有大量 0、1、2，第一眼很像统一枚举或位图。
继续看消费代码后才发现不是。

一共枚举到 129 个具名字段，其中 119 个是长整型状态。不同字段的规则并不统一：
有的 1 表示开启，有的 2 表示关闭，还有的把 0 和 1 都当作已识别状态。

最后通过静态分支和运行时样本确认了 29 条精确消费规则。剩下没有业务消费点的
字段，只在调试页面显示原值，不强行翻译。

流媒体字段也按同样思路处理。`BufferDataMs`、`ABRCheckInterval` 这类值是播放
策略参数，我没有把它们写成“实测延迟”；分辨率、FPS、编码、码率、GOP 和协议
可用性则分别展示，避免混成一个“画质”标签。

### 探针先脱敏，不把清理工作留到最后

运行时对象里会碰到 Token、Ticket、Cookie、请求 ID 和带签名的媒体 URL。如果
原值先落盘，再想办法清洗，原始文件本身已经成了风险。

所以敏感值在探针里就被替换：

```
function maskOpaque(key, value) {
  const name = String(key || '').toLowerCase();
  if (!/(token|ticket|sign|secret|cookie|session|request.?id)/.test(name)) {
    return null;
  }
  return {
    kind: 'opaque',
    length: String(value).length,
    sha256_12: sha256Text(String(value)).slice(0, 12)
  };
}
```

短指纹的用途只有一个：判断两次看到的值是不是同一形态、是否发生变化。它不是
原值，也不能拿去重放。

URL 只留结构：

```
{
  "kind": "url",
  "scheme": "https",
  "host": "example.invalid",
  "path": "/media/path",
  "query_keys": ["expires", "quality", "signature"]
}
```

query value 不进入轨迹。

反射遍历也有限制。业务对象经常互相引用，放开递归会很快碰到循环引用和巨型
日志。我使用的范围大致是：递归 4～6 层、集合最多 80 项、对象最多 80～180 个
字段。长字符串只保留长度、短前缀和短指纹。

限制看起来会“丢信息”，实际上更容易得到可用证据。探针的任务是回答当前问题，
不是复制一份进程内存。

### 默认值问题，比混淆名更麻烦

做视频和用户字段时，我遇到的最大误判来源不是混淆，而是 Java 默认值。

比如对象里出现：

```
allow_download = false
follower_count = 0
```

这可能是服务端明确下发，也可能是当前响应根本没有对应键，Gson 创建对象后留下了
`false/0`。Feed 里的精简 User 对象尤其明显：粉丝数、关注数一起为 0，并不代表
这个账号真的没有粉丝。

后来我在响应转换边界增加了 Presence 记录。它不保存正文，只记某个键是否真实
出现。面板里因此有了几种不同状态：

```
响应确认      服务端确实下发了 0 或 false
对象默认值    当前只在 Java 对象中看到，响应层没确认
跨场景补齐    同一 ID 的另一份对象提供了这个字段
本次未下发    当前证据里没有
```

同一个用户或视频，在 Feed、搜索、详情、主页作品列表里往往有不同完整度。我没有
用“最后一次捕获”覆盖前面对象，而是先按 `aweme_id` 或 UID 对齐，再做字段级并集。

例如 Feed 对象保留推荐上下文，Profile 对象补主页资料，Detail 对象补详情权限。
如果两个场景给出不同值，面板会保留来源和冲突状态，不静默选一个看起来更顺眼的
结果。

这部分代码后来分别落在 `ViewedVideoClosure` 和 `ViewedUserClosure` 里。它们
名字里虽然有 Closure，做的事其实很朴素：同一实体、多个对象、逐字段找证据。

### Native 分析：最容易高估进度的地方

Native 报告里最容易写出漂亮但站不住的结论。

看到 AES、RSA、SHA 字符串，不等于发现 APP 自研算法。看到某个 `.so` 出现在
`/proc/<pid>/maps`，也只说明库进了地址空间，不说明目标函数执行过。

我后来固定按这个顺序走：

```
库存在
  → 进程加载
  → Java/JNI 入口
  → 真实调用命中
  → 输入输出形态
  → 中间阶段
  → 离线固定向量
```

基础静态检查还是这些工具：

```
file libtarget.so
shasum -a 256 libtarget.so
readelf -h libtarget.so
readelf -Ws libtarget.so
readelf -d libtarget.so
strings -a libtarget.so
objdump -d libtarget.so
```

如果库使用动态注册，我先找 `JNI_OnLoad` 和 `RegisterNatives`，恢复
`JNINativeMethod` 表，把 Java 方法名、签名和 Native 地址对上。这个阶段只能说
入口找到了，还不能说算法完成了。

真正开始跑以后，我不只 Hook 最终返回值，而是拆阶段：

```
输入规范化
记录构造
摘要或校验
块变换
IV / nonce 生命周期
配置侧链
最终封装
```

离线回归只放合成数据。下面用 SHA-256 写一个自包含的固定向量示例；实际工程里，
我会把摘要调用换成已经复现的本地函数：

```
import hashlib

def test_synthetic_vector():
    payload = b"tutorial-fixture"
    key = bytes.fromhex("00112233445566778899aabbccddeeff")

    actual = hashlib.sha256(payload + key).hexdigest()
    assert actual == (
        "e29353d9c340aa82203dec1644a4b943"
        "6a9b334111dd6f5f8a7de9b7e6ba346d"
    )
```

播放授权、临时 URL Token 主要由服务端生成。我可以分析客户端如何解析和消费，
但不会把“客户端能读”写成“客户端能生成”。

### 为什么后来做了一个 LSPosed 模块

做到中后期，JSON 报告已经不少。每验证一个字段都要在反编译代码、轨迹和报告
之间来回切，效率很低。我想要一个随手能看的只读面板，于是把已经确认的部分做成
一个 LSPosed 模块。

它的边界比较明确：只读当前进程已经持有的 Java 对象，不主动请求接口，不保存
响应正文，敏感字段不显示原值。服务端没有下发的内容，面板就写“本次未下发”。

#### 先拦住多进程重复安装

早期版本只判断包名，结果目标 APP 的多个子进程都装了一遍 Feed、UI 和 getter
钩子。日志重复不说，反射和对象队列也会增加没必要的开销。

现在入口先判断主进程：

```
static boolean isMainProcess(String packageName, String processName) {
    if (packageName == null || packageName.length() == 0) return false;
    return processName == null
            || processName.length() == 0
            || packageName.equals(processName);
}
```

```
if (!TARGET_PACKAGE.equals(lpparam.packageName)) return;

if (!ProcessRouter.isMainProcess(
        lpparam.packageName, lpparam.processName)) {
    log("跳过非主进程钩子: " + lpparam.processName);
    return;
}
```

#### 每组 Hook 都有安装状态

功能安装由 `HookRegistry` 去重：

```
private static void installFeature(String feature, Installer installer) {
    if (!HookRegistry.begin(feature)) {
        log("跳过重复功能钩子: " + feature);
        return;
    }
    try {
        installer.install();
        HookRegistry.complete(feature);
    } catch (Throwable error) {
        HookRegistry.fail(feature);
        log("功能钩子安装异常: " + feature);
    }
}
```

这样某个版本里直播类名变了，只会让直播功能标成 failed，不至于整个模块一起
失效。

#### 高频 getter 只做轻量记录

以 `Aweme` 为例，只选了几个稳定方法：

```
String[] hotMethods = new String[]{
    "getAid", "getVideo", "getAuthor", "getStatistics", "getStatus"
};
```

回调里不展开整棵对象树，只把对象交给有界观察队列。详情页真正打开时，才做较重
的字段读取。

连续命中同一个对象也没有必要重复入队，所以加了 100 ms 防抖：

```
private static final long SAME_OBJECT_DEBOUNCE_NS = 100_000_000L;

if (lastAweme.get() == candidate
        && now - lastAwemeAt < SAME_OBJECT_DEBOUNCE_NS) {
    return;
}
```

队列保存的是 `WeakReference<Object>`，长度有上限。Activity 销毁、APP 进入后台
或系统报告低内存时，模块会清掉最近视频、用户、直播和协议观察缓存。

#### UI 层再脱敏一次

即使采集层已经处理过，我仍然在显示层检查字段名：

```
private static boolean isSensitiveField(String jsonName, String javaName) {
    String value = (jsonName + " " + javaName).toLowerCase(Locale.US);
    return value.contains("token")
            || value.contains("ticket")
            || value.contains("cookie")
            || value.contains("session")
            || value.contains("password")
            || value.contains("secret")
            || value.contains("client_key")
            || value.contains("access_key")
            || value.contains("private_key");
}
```

敏感内容最后只会显示类似：

```
已脱敏 · type=text · len=248 · fp=2e45c0a918f1
```

URL 也是 host、path、query key，query value 不显示。

面板中的字段会标来源：`SERVER` 是服务端原值，`LOCAL` 是客户端映射，
`DERIVED` 是本地推导，`CAPTURE` 是当前捕获状态。之前有一版把这些混在一起，
看起来信息很多，实际上很难判断哪一项能信。加上来源和置信度后，页面才真正能
用于复核。

### 几个确实浪费过时间的地方

第一个是全库搜密码学关键词。结果太多，绝大部分只是通用库。后来改成从业务字段、
Java/JNI 边界和实际加载模块出发，噪声才降下来。

第二个是相信对象当前值。`0` 和 `false` 看着最明确，实际最容易错，因为 Java
默认值和服务端真实下发长得一模一样。Presence 是在吃过这个亏以后补的。

第三个是扫堆时不管对象新旧。直播上下滑后，旧 Room 对象还活着。没有前台房间
对齐时，任何状态结论都可能引用错对象。

第四个是把 Hook 写得太重。高频 getter 里做同步遍历和完整反射，短时间看不出
问题，页面滑久了就会积累开销。现在回调只记弱引用，重活推迟到用户真正打开
面板时。

最后一个是低估版本迁移。库名没变、Java 模型没变，不代表内部偏移和分支没变。
39.7.0 的 MetaSec 就是最直接的例子。以后升级版本，我会先跑哈希差分，再决定
哪些探针能搬，哪些必须重找入口。

### 现在做到哪了

39.5.0 的客户端本地算法主干已经有比较完整的证据和离线回归。39.7.0 中几个
逐字节相同的重点库可以继承旧基线，TicketGuard 的 Java 混淆边界也重新适配过。

视频、用户和直播这三条语义线，已经能从模型、响应 Presence、运行时对象一路走
到 LSPosed 面板。直播部分包括人数、累计量、权限、流媒体、状态时间和入口来源。

回头看，这个项目留下来的不只是一次尝试，更重要的是一套可以重复使用的经验：
字段为什么这样解释、结论在哪个版本成立、下次升级应该从哪里重新验证。

对我来说，这些比记住几个混淆类名或 Native 偏移有用得多。
