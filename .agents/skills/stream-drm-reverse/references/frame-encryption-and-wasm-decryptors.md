# C 层帧加密的形态学与「调 wasm 解密器」两条路线

> 本文件是 **C 层（ES/NALU 帧加密）的形态判据 + wasm 解密器调用路线**的权威源。
> 分层总表与 A~D 层配方见 `hls-and-ts-structure.md`；白盒/wasm 加解密算法本身见 `whitebox-and-wasm-crypto.md`。
> 机械工具：`scripts/nalu_frame_crypto.py`（`--selftest` 52 项）、`scripts/ts_probe.py`、`scripts/ts_repack.py`。

**目录**

- [1. 帧加密的五种形态与 30 秒判据](#1-帧加密的五种形态与-30-秒判据)
- [2. 覆盖粒度：SAMPLE-AES 到底加密了哪几个字节](#2-覆盖粒度sample-aes-到底加密了哪几个字节)
- [3. EBSP 防竞争字节：顺序与严格度](#3-ebsp-防竞争字节顺序与严格度)
- [4. 调 wasm 解密器：两条路线](#4-调-wasm-解密器两条路线)
- [5. 环境检测壳与「多变体 TEA」——只解一半的两个陷阱](#5-环境检测壳与多变体-tea只解一半的两个陷阱)
- [6. hls.js 侧的五个 hook 点与顺序陷阱](#6-hlsjs-侧的五个-hook-点与顺序陷阱)
- [7. 解密后怎么落地：提码流合 mp4 vs 打散回填 TS](#7-解密后怎么落地提码流合-mp4-vs-打散回填-ts)
- [8. 自定义帧加密的元数据藏点（SDT 侧信道）](#8-自定义帧加密的元数据藏点sdt-侧信道)
- [9. 排错速查（本层专属）](#9-排错速查本层专属)

---

## 1. 帧加密的五种形态与 30 秒判据

**第一个动作永远是「按 188 字节切，看每包首字节还是不是 `0x47`」**——这一步就能把「整体加密」与
「帧加密」分开，成本 3 秒：

| 形态 | 判据（`xxd -l 64` + 188 对齐检查） | 观感 / 后果 | 处置 |
| --- | --- | --- | --- |
| **整体加密** | 连 `0x47` 都不是；188 对齐处也不是 `0x47` | 下载器直接报「不是 ts」 | A 层：整片 AES-CBC 一遍 |
| **文件头加密** | 前 N 字节乱，之后 188 对齐处**恢复**有 `0x47` | 播放器卡首帧 / 要等一秒 | 只解文件头，长度可能变 ⇒ §7 回填 |
| **PES 整体加密** | `0x47` 在、`00 00 01` 起始码在，**PES 头之后全乱**；NAL 单元「少了很多」（010 Editor 的 H264.bt 里只剩 PES 头） | 有容器无画面 | 解 **PES payload**（不含 PES 头） |
| **NALU 头加密** | 能认出 NAL 起始码，但 `sps` / `sei` 缺失、`pps` 长度离谱、关键帧不见 | 花屏 / 绿屏 | 解 NAL 头（`sps`/`pps` 参与解析 ⇒ 顺序极敏感，见 §6） |
| **NALU 内容加密** | `00 00 01` 与 NAL 头**都是明文**，头后面乱 | **有声音、花屏**（最常见） | `ts_probe.py --nalu` 定位后逐 NALU 解 |

> 判据级别的一条经验：**「有声音没画面」几乎一定落在 NALU 内容层**；音频通常不加密，
> 而视频以「只加密 NAL payload」的形式覆盖最多（本层是高级形态）。

**形态之外的第三个维度——覆盖了哪些 NAL 类型**。厂商常见三档，且观感可直接反推：

| 只加密 | 观感 | 说明 |
| --- | --- | --- |
| `nal_unit_type=5`（IDR） | 画面**基本完整但不连续** | I 帧是完整画面，P/B 帧只记变化 |
| `nal_unit_type=1`（P/B） | 画面**基本不完整** | 相对 I 帧的变化全丢了 |
| `nal_unit_type=7`（SPS） | 甚至**可能照常播放** | 关键在于「文件里是否另有一份明文 SPS」——见下 |

> **实测反直觉结论**：某些实现（Bento4 `mp4hls`）写文件时**先写一份明文 `sps/pps`**，
> 再写加密后的 NALU。于是「只加密 SPS」的样本在 Stream Analyzer 里会看到
> **两个 SPS/PPS，第一个能解出分辨率、第二个不能**，播放器用第一个照样播。
> ⇒ **别用「居然还能播」推翻「SPS 被加密」的判断**，要去看流里是不是有重复的 SPS/PPS。

---

## 2. 覆盖粒度：SAMPLE-AES 到底加密了哪几个字节

`METHOD=SAMPLE-AES` 是苹果提的方案，**视频帧和音频帧都加密**，但**只动一小部分字节**。
实测实现（Bento4 `mp4hls` 加密侧 / hls.js `getAvcEncryptedData` 解密侧同构）：

```c
// 1) 加密长度：总是保留最后一个整块为明文
encrypted_size = 16 * ((nalu_length - 1) / 16);    // 整数除法
if (nalu_length % 16 == 0) encrypted_size -= 16;

// 2) 实际加密的块：每 160 字节只动前 16 字节
for (i = 0; i < encrypted_size; i += 10 * 16) {
    ProcessBuffer(nalu + hdr + i, 16, ...);        // 只处理 1 个块
}
// 3) NAL 类型过滤（苹果规范）
nalu_type = nalu[nalu_length_size] & 0x1F;
if (nalu_length > 16 && (nalu_type == 1 || nalu_type == 5)) { ... }
```

**三条硬结论（都会导致「能解但花屏」）**：

1. **不是从头连续加密**：160 字节窗口里只有前 16 字节是密文，后 144 字节是明文。
   把它当 CBC 连续解 ⇒ 90% 的字节被解成垃圾。
2. **长度 ≤ 32 的 NALU 一个字节都不加密**（`16/32` 代入上式均得 0）；
   长度整除 16 时**再减 16**，末块留明文（给解码器留锚点）。
3. **IV 每个 NALU 重置一次**（`m_StreamCipher->SetIV(m_IV)`），不是整片一个 IV。

机械计算（不要手算）：

```bash
S=.agents/skills/stream-drm-reverse/scripts
python $S/nalu_frame_crypto.py sample-aes-range --len 24411 --nalu-type 5 --pretty
# 24411 → 加密 24400 字节（100%）→ 实际 153 个 16 字节块，偏移 0,160,320,…,24320
python $S/nalu_frame_crypto.py sample-aes --input nal.bin -o nal.clear.bin \
    --key-hex <32位hex> --iv-hex <32位hex> --decrypt
```

---

## 3. EBSP 防竞争字节：顺序与严格度

NALU 起始码是 `00 00 01`；若 payload 里**本来就**出现 `00 00 0x`，解析器会误以为遇到了新 NALU。
编码器用**防竞争字节（emulation prevention byte）** 把第三个字节前插一个 `03`：

| 原始 | 编码后 |
| --- | --- |
| `00 00 00` | `00 00 03 00` |
| `00 00 01` | `00 00 03 01` |
| `00 00 02` | `00 00 03 02` |
| `00 00 03` | `00 00 03 03` |

**两个必须记住的边界**：

- `00 00` 出现在**末尾**（没有第三个字节）时**不插** `03`。「多插一位」是这类实现最常见的 off-by-one。
- **escape 不幂等**：对已编码数据再 escape 会让数据继续膨胀。所以
  **「必须先 unescape 再 decrypt，decrypt 完再 escape」的顺序不可交换、且每步只能做一次**。

**严格 vs 宽松（站点差异，选错方向会静默丢字节）**：

| 实现 | 行为 | 风险 |
| --- | --- | --- |
| 严格（标准） | 只在 `00 00 03` 的**第四字节 ≤ 0x03**（或恰好到结尾）时删 `03` | 无 |
| 宽松（部分站点/自研） | 见 `00 00 03` **就删**，不看下一字节 | payload 里合法的 `00 00 03 04+` 会被误删 |

> 实测来源：某站的 wasm 解密函数里就写着「判断是否存在 `000003` 就替换为 `0000`」，
> 属宽松实现；同一作者在**直播**部分的另一份代码里又是标准实现。
> ⇒ **同一站点两处实现可能不一致，要按「你正在解的那条链」选严格度**，
> 不要按「这站是谁」选。

```bash
python $S/nalu_frame_crypto.py ebsp-unescape payload.bin -o payload.clear.bin          # 严格
python $S/nalu_frame_crypto.py ebsp-unescape payload.bin -o payload.clear.bin --loose  # 宽松
```

---

## 4. 调 wasm 解密器：两条路线

帧解密的算法常常**不在 JS 里**，而在一个 Emscripten 产出的 wasm 里，且

- 导出函数（如 `func54_vodplay`）**带环境检测**（见 §5）；
- 真正干活的函数（`func60_TEA`）**根本没导出**。

于是「把内部函数变成可调用」有两条路线，**按你的工具链选**：

| | 路线甲：wasm2c + 手写 imports | 路线乙：wasm2wat 改导出表 ⭐ |
| --- | --- | --- |
| 命令 | `wasm2c int.wasm -o out.c` 后自己写 `imp.c` | `wasm2wat -o x.wat x.wasm` → 加一行 → `wat2wasm -o x_patch.wasm x.wat` |
| 关键动作 | 实现 `env` 的 func/table/memory/global 四类导入 | 在导出表加 `(export "func60_TEA" (func 60))` |
| 工作量 | 大（`out.c` 极大，要新建 `imp.c` 只复制要调试的函数，否则编译卡死） | **极小**（改一行 + 重新编码 + 替换 js 内嵌 base64） |
| 校验 | 编译 + 链接 ffmpeg | `wasm-objdump -j Export -x x_patch.wasm \| less` |
| 适合 | 需要 C/IDA 侧继续反编译（找算法） | **只想拿到「能解密」的能力，算法可以不管** |
| 调用 | `w2c_cctv_f60(&cctv, len, in, out, num)` | `Module.asm.func60_TEA(len, inPtr, outPtr, 0n)` |

**路线甲里最容易踩的三处（实测记录）**：

1. **`_emscripten_asm_const_ii` 要按 `i1` 常量返回字符串**：`28352 → ""`、`28384 → <站点 URL>`、
   `28480 → "blob:"`、`28512 → <站点 URL>`。返回 `NULL` 会让 wasm 内部逻辑走错分支。
2. **`DYNAMICTOP_PTR` 是「外部导入的内存」**，必须在实例化后**手工 `memcpy` 4 字节**写进去
   （`wasm_rt_allocate_memory` + `wasm_rt_allocate_funcref_table` 之后）。
   漏了这一步的典型表现是「malloc 返回 0 / 越界崩」，而不是「解错」。
3. **`func60` 的第 4 个参数是一个自增计数器**（每次调用 `num++`），不能固定传 0 ——
   同一片内多次调用要递增，否则部分 NALU 解错。

**Emscripten 判定（静态，一条命令）**：

```bash
wasm-objdump -j Import -x x.wasm | less
# 命中 env.___syscall140/146/54/6、env._emscripten_asm_const_ii、env.jsCall_ii/iiii/vii、
#      global __table_base / DYNAMICTOP_PTR、memory pages initial=256、table funcref initial=160
#      ⇒ 确定为 Emscripten 产物
```

**wasm 本体怎么拿到**：多数站点不直接给 `.wasm` 请求，而是**内嵌 base64**：

- 在加载 js 里搜 `data:application/octet-stream;base64,` 或 wasm 魔数的 base64 前缀 `AGFzbQEAAAABm`；
- 也有以 **brotli（`.br`）** 形式内嵌的，先解压；
- 都不行就 hook `WebAssembly.instantiate` / `instantiateStreaming` 取参数。

> 内嵌 base64 不是标准 Emscripten 行为，**属反逆向举措**——但也正因此，改完 wasm 后
> 「重新 base64 编码 + 原地替换」就能生效，不必处理文件加载路径。

---

## 5. 环境检测壳与「多变体 TEA」——只解一半的两个陷阱

这两个陷阱的**共同现象是「部分画面正常、部分仍花屏」**，且**都不报错**。

### 5.1 导出壳函数带环境检测

导出函数（`func54_vodplay` 一类）内部会**检查环境**，不满足时**把输入原样返回**。
于是同一片里「有些 NALU 被解了、有些没解」，观感是**局部花屏**。

- 判据：**同一分片内花屏位置不固定、且与 NALU 长度/类型无相关** ⇒ 先怀疑壳函数的检测分支。
- 处置：**绕过壳函数，直接调内部实现**（§4 的两条路线）。
- 反向操作（调试时很有用）：**对入口下方所有候选函数一起设断**，看「环境正常」与「环境异常」
  两次运行分别命中哪些函数——命中差异就是检测分支的分叉点。

### 5.2 同一 wasm 里存在多个近似实现，且不等价

实测：`func58_TEA` 与 `func60_TEA` **不等价**——对每个 PES 的解密结果**有 8 字节不同**
（某样本 PES[0] 长 24411，差异集中在靠近尾部的偏移 24352 处）。

- 用错变体的表现是**「能看，但底部有一条细细的花」**——极易被当成「解对了」。
- ⇒ **只要"还有点花"，就不要收工**：换另一个候选变体再试一次，逐字节 diff 两次结果。
- 别指望从名字判断谁对（`TEA` 是算法族，不是函数身份）；**用「解密后能过 `ffmpeg` + 画面无花纹」验收**。

---

## 6. hls.js 侧的五个 hook 点与顺序陷阱

很多样本的播放器就是 `hls.js`（或 `vhs_drm2.min.js` 这类同构改写版）。它把**帧解密**放在
**解复用之后**，于是 hook 点很集中：

| 次序 | 位置（hls.js） | 这里能拿到什么 |
| --- | --- | --- |
| 1 | `loadKeyHTTP` 的 `onSuccess` | **key 的明文**（`keyInfo.decryptdata.key = frag.decryptdata.key = new Uint8Array(response.data)`） |
| 2 | `getEncryptionType(uintData, decryptdata)` | 判当前分片是不是「整片 AES-128」 |
| 3 | `transmux`：`transmuxSampleAes` vs `transmuxUnencrypted` | 判是否为 SAMPLE-AES 路线 |
| 4 | `parsePES` | `{data, pts, dts, len}`——**`data` 已去 PES 头**，是 NAL 数组 |
| 5 | `parseAVCPES` → `parseAVCNALu` → `getAvcEncryptedData` / `getAvcDecryptedUnit` | 逐 NALU 的**加密区间**，解密后就地写回 |

> **key 解密的最省事落点就是第 1 个**：`loadKeyHTTP` 一次解密、全局只用一次。
> 代价也很明显——**一眼就能被逆向者看到**（把断点放这里，key 明文直接到手）。

### 🔴 顺序陷阱：解复用**先于**解密

`parseAVCPES` 的 `case 7`（SPS）里会**立刻解析分辨率并设置解码器**。
如果你把解密写在「解复用之后」（例如改写 `SampleAesDecrypter` / `getAvcDecryptedUnit`），
**SPS 已经被当成明文解析过了** ⇒ 报 `解码器不支持` / 分辨率识别不出来。

- 症状：改了 `SampleAesDecrypter` 之后**反而更糟**（原本还能播，改完直接不出画）。
- 处置：把解密**提前到 `parseAVCPES` 的 `case 7` 内部、`new ExpGolomb(sps)` 之前**
  （用调用栈判上下文：`if (stack.includes('SampleAes'))`）。
- ⇒ 通用原则：**凡是参与「结构解析」的 NAL（`sps`/`pps`/`sei`）被加密，
  解密就必须发生在解析之前**；写在解析之后一定失败。

---

## 7. 解密后怎么落地：提码流合 mp4 vs 打散回填 TS

两种都行，但**验收标准不同**：

| 路线 | 做法 | 优点 | 代价 |
| --- | --- | --- | --- |
| **提码流** | 用 ffmpeg 解复用出 H264/AAC 裸码流 → 直接合成 mp4 | 简单；**不受 TS 包布局约束** | 丢时间戳/包结构；音视频同步要自己处理 |
| **打散回填** | 记住每个 NALU 在原 TS 里的 `(包偏移, payload 偏移)`，解密后**原地写回** | 保留原 TS 结构，可继续用下载器/播放器链路 | 长度一变就得重排（见 `hls-and-ts-structure.md` §10.2） |

回填路线的最小解析实现（PES 的边界靠 `PUSI` 而不是 PES 长度）：

```
for index in range(0, len(buf), 188):
    assert buf[index] == 0x47
    PID  = ((buf[index+1] & 0x1F) << 8) | buf[index+2]
    PUSI = (buf[index+1] & 0x40) >> 6
    if PID != <视频 PID>: 跳过
    AFC  = (buf[index+3] & 0x30) >> 4        # 1=仅载荷 2=仅自适应 3=两者
    payload_start = index + 4 + (1 + buf[index+4] if AFC == 3 else 0)
    if PUSI == 1:  # 上一个 PES 到此结束 → 解它 → 回填 → 开新 PES
        ...
```

- **NALU 切分**别自己从零写：`FindNalUnitStart` 这类逻辑直接照搬 010 Editor 的 `H264.bt` 模板，
  它把每个字段都标出来了，比凭印象写可靠。
- **PID 要参数化**：视频流常见 `0x100`，但**必须从 PMT 读**，不要写死（脚本里写死 PID 是
  「本地能跑、换个站就废」的第一大来源）。

---

## 8. 自定义帧加密的元数据藏点（SDT 侧信道）

做**自定义**帧加密时（不是复现站点，而是自己设计），有个现成的「合法藏点」：

TS 在 `PAT`/`PMT` **之前**可以有一张 **SDT（Service Description Table）**，
常规播放/解密流程**都不会读它**。它有两个位置可放任意数据：

1. **`free_CA_mode` 标志位**——天然语义就是「本服务是否加扰」，用来标记「这一片是否加密」最自然；
2. **Service descriptor 里的两个「可自定义长度的字符串」字段**——可以放
   **该分片的 IV**（⇒ 实现「一片一个 IV」）、甚至算法模式（CBC/CTR 切换）与加密/异或块大小。

> 这条不是为了复现，而是为了「**看懂别人为什么这么设计**」：遇到「每片一个 IV / 每片换算法」
> 的样本时，先去 TS 头部的非标准表里找，而不是只盯 payload。

---

## 9. 排错速查（本层专属）

| 现象 | 首查 | 次查 |
| --- | --- | --- |
| **有声音、花屏** | 确认是 NALU 内容层（§1） | 覆盖的 NAL 类型（1 / 5 / 1+5） |
| 画面完整但**不连续** | 只加密了 `type=5` | 换 `type=1` 再试 |
| **部分 NALU 解对了、部分没解** | 壳函数的环境检测（§5.1） | 绕过导出壳，直接调内部实现 |
| 能看但**底部一条细花** | 用错了 wasm 里的 TEA 变体（§5.2） | 逐字节 diff `func58` vs `func60` 的结果 |
| 改完「解密器」**反而更糟** | 解密写在了解复用之后（§6） | 把解密提到 SPS 解析之前 |
| `Invalid NAL unit size` | EBSP 顺序反了（§3） | 严格/宽松选错方向 |
| 长度对但花屏 | SAMPLE-AES 当成连续块解了（§2） | 末块留明文没留 / IV 没按 NALU 重置 |
| 只加密 SPS 却**还能播** | 流里有重复的明文 SPS/PPS（§1） | 别据此推翻「SPS 被加密」 |
| 解密输出里 **`malloc` 返回 0 / 越界崩** | `wasm2c` 路线漏了 `DYNAMICTOP_PTR` 手工写入（§4） | `_emscripten_asm_const_ii` 没按常量返回字符串 |
| `func60` 解一部分对、一部分错 | **第 4 个计数器参数没自增**（§4） | — |
| 本地能跑、换站就废 | **PID 写死**（§7） | 音视频 PID 未从 PMT 读 |
| 油猴脚本对 worker 内的代码**不生效** | worker 由 **blob + `importScripts`** 装载 | 改用 DevTools **Overrides**，在 js 最前面插辅助函数 |
| 调试时反复失败但代码看着没问题 | 浏览器缓存（旧 ts/旧 js） | **`Ctrl+F5` 强刷**；仍不行就 `chrome://settings/clearBrowserData` 清「缓存的图像和文件」后重启 |
