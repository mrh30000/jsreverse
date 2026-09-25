# workflow · 快手 `__NS_sig3`（partial）

> 抽象自 `52pojie-1512064`（2021-09）。**status = partial**：源文只给「哪几段怎么拼」，未给常量与完整公式。
> 本文件按「**执行顺序**」写，可当作同类 native 签名题的通用骨架。

## 1. 定位入口

```text
① JNI_OnLoad → RegisterNatives（源文位置 sub_88F4）
② 取 doCommandNative 的地址 = sub_c060
③ 调用链：sub_c060 → sub_26BB8 → sub_3AE54 → sub_3AAF8 → sub_3F920 → sub_3E550
   （ollvm 混淆下不要硬读，逐层 hook 收敛）
```

## 2. 收敛（本条的**核心方法**）

```text
① frida hook sub_3E550 ⇒ 它的返回值是 sig3 的**一部分**
   ★ 该函数被调用两次：第一次是要加密的内容，第二次是一个 base64 值
② 看到 dword_9e338 是 **sha256 常量表** ⇒ 判定「sha256 的变形」
③ 断点/trace：a3 来自 a2.a 方法；str2 是 sig 签名结果
④ ★ ida trace 之外再上 **unicorn trace**（源文：unicorn 的结果更好分析）
```

## 3. 结构（已还原的部分）

```text
sig3 = [前半段：与当前时间戳异或一个值后加密（sub_24404）]
     + [中段：sha256 变形(sub_3E550) → sub_3FDA4 变换 → base64 → base64]
     + [两处来自图片数据的常量值（同版本不变 ⇒ dump）]
```

## 4. 验证

```text
① 用 fiddler 模拟请求，返回正常数据 ⇒ 认为 sig3 正确
② 源文称同批把 sig / __NStokensig 也转成了 python 与 java 源码
```

## 5. 与其它技能的分工

| 场景 | 去哪 |
| --- | --- |
| 定位/还原 App native 签名（通用工作流） | `../../../../android-app-reverse/SKILL.md` |
| sha256/自定义 hash 的逐层 diff 方法 | `../../../../android-app-reverse/references/03-signature-and-packet-families.md` §3.1 |
| 混淆下 hook 收敛与 trace | `../../../../android-app-reverse/references/02-native-dynamic-tracing.md` §4 |

## 6. 可执行步骤（机械可数清单）

1. `unzip` 出 `lib/arm64-v8a/*.so`，按 `../../../../android-app-reverse/references/01-recon-and-carriers.md` §1 做三件套侦察。
2. `readelf -Ws` 找 `Java_..._doCommandNative`；找不到就找 `JNI_OnLoad` → `RegisterNatives`（源文位置 `sub_88F4`）。
3. 在 IDA 里定位 `doCommandNative = sub_c060`，**不要**先读它的 F5（ollvm 会让它又慢又乱）。
4. frida `hook sub_3E550`，观察它的**返回值**与**被调用两次**的事实（一次被加密内容、一次 base64 值）。
5. 顺着 `dword_9e338` 确认该函数是 **sha256 的变形**；用标准 sha256 跑同一输入做第一次 diff。
6. 断到把拼接结果写入寄存器的指令处（源文做法），读 `x0` 得到拼接形态。
7. 上 **unicorn trace**（源文：比 ida trace 好分析），把 `sub_24404` 与 `sub_3FDA4` 两段收敛出来。
8. 两处「图片数据派生值」直接 **dump**，不追生成链（同版本内不变）。
9. 用 `fiddler` 模拟请求验证；失败就回到第 4 步换 hook 层。
10. 结果按 `../../../../android-app-reverse/references/03-signature-and-packet-families.md` §3.1 的「标准实现对拍 + 逐项 diff」口径落盘。
