# 切片乱序底图还原 与 视觉/提交坐标换算

本文件补充 `references/solution-playbooks.md` 的 `image-restore` 章节，解决两个高频失分点：

1. **顺序数组拿到了，图还原了，缺口却对不上** —— 顺序语义（正/逆置换）搞反。
2. **缺口位置肉眼看着对，提交却失败** —— 视觉坐标 ≠ 提交坐标（存在固定偏移与缩放系数）。

两者都属于"离线可判定"的问题：不需要再开浏览器，用一次真实成功样本就能反解。

---

## 一、顺序来源只有三类，先分类再动手

| 类别 | 特征 | 典型站点 | 获取方式 |
| --- | --- | --- | --- |
| **A. 前端派生式** | 没有独立数组，顺序由背景图 URL 的文件名/query **算**出来 | 顶象（`sn` / `En`+`_n`+`Cn`） | 把派生函数扣成本地纯算（见 §二） |
| **B. 接口下发式** | `getQuestion` / `verify` 之类的响应里直接给数组 | 智慧酒店/Tuya（`shuffle`）、多数自研站 | 直接读响应字段，无需逆向 |
| **C. 前端常量数组** | JS 里写死的数组，或由 `sid`/`y` 等参数索引 | 顶象旧版、**极验 v3（`SEQUENCE()`）**、部分自研站 | 断点跟栈找到生成位置，扣函数或直接抄数组 |

**判据**：如果换一张图（刷新页面）数组**跟着变**，就是 A 或由参数派生的 C；如果数组固定不变，是 C。

> **切片几何不一定是均匀网格。** 本文件 §二/§三 的通用还原（以及 `restore_slices.py` 的默认
> `--model grid`）假设「宽高能被行列整除、切片之间无间隙」。
> 一旦站点的切片带**间隙或固定偏移**（例如极验 v3：26 列 × 2 行、块 10×80、
> 源 stride 12、源左偏移 +1），必须换用专用几何：
> `python scripts/restore_slices.py --model gt3 --input bg.png --out bg.restored.png --pretty`。
> 极验 v3 的几何与 `SEQUENCE()` 展开见 `references/geetest-protocol-matrix.md` §三。

---

## 二、A 类：顶象派生算法（实测可复刻）

顶象把「图片 URL 的文件名」当种子，用字符位移产生一个 `0..31` 的排列。还原要点：

```python
def derive_order_from_name(name, alphabet=32):
    """顶象 _n()：逐字符 ord(c) % 32，冲突则自增直到未被占用。"""
    order = []
    for i, ch in enumerate(name):
        if i == 32:                      # 只取前 32 个字符
            break
        o = ord(ch)
        while (o % alphabet) in order:   # 关键：冲突时 +1，不是重取
            o += 1
        order.append(o % alphabet)
    return order
```

入口选择（顶象 `En(n, e, r)`）：

- `e = true`（最常见）：取 URL **文件名去扩展名**再派生。
  `.../78bBXvCGvU/zib3/4ac41ecfd57b44c1b62fa07c9c843ed4.webp` → 种子 `4ac41ecfd57b44c1b62fa07c9c843ed4`
- `e = false`：走 `Cn(r)` 解析 query —— **`c` 参数存在则整体覆盖**，
  否则用 `sid`（拼接在前）+ `aid`（拼接在后）组合成种子。

> **易错**：`c` 的优先级高于 `sid`/`aid`，且代码里判断的是 `'null' !== e[1]`，
> 字符串 `"null"` 要当作"没有这一项"处理，不能当成种子。

**顺序语义（顶象）**：`pathList[r] = 来源槽位`，第 `r` 次绘制把来源搬去 `r`。
即 `target-to-source`（`order[目标] = 来源`）。对应 `drawImage` 调用形如：

```js
var c = Math.floor(width / o.length);     // 单块宽度
// 循环 r = 0..N-1（注意：循环被逗号表达式 + switch 扁平化过）
a.drawImage(img, o[r] * c, 0, c, h,     /* 来源 */  r * c, 0, c, h /* 目标 */);
```

用本技能的 `scripts/restore_slices.py` 直接跑（**派生式必须用 `--order-from-name`**，
种子是文件名去扩展名；`--order-from-url` 只在 `e = false` 的 query 派生分支才用得到）：

```bash
# e = true（最常见）：种子 = URL 文件名去扩展名
python scripts/restore_slices.py --input bg.png --rows 1 --cols 32 \
    --order-from-name 4ac41ecfd57b44c1b62fa07c9c843ed4 \
    --out restored.png --pretty

# e = false：种子来自 query（c 优先，否则 sid+aid）
python scripts/restore_slices.py --input bg.png --rows 1 --cols 32 \
    --order-from-url "https://static.dingxiang-inc.com/picture/dx/xxx/a.webp?sid=12&aid=34" \
    --out restored.png --pretty
```

> 顶象 5.x 换用 `sn(imgUrl)`，是把 `_n` 的内联版，语义不变（32 元素、`ord%32` 去重递增）。
> 其切片几何是**宽 12px、高 200px、共 32 列**，`r = order[i] * 12` 是来源 x。
>
> `restore_slices.py` 对「`order` 长度 ≠ `rows*cols`」和「`order` 不是 0..N-1 排列」
> **直接报错退出**（`SystemExit` + JSON `error` / `hint`），不写报告也不产出图 —— 这是有意的：
> 静默截断会产出一张"看不出问题"的错图。报这个错就说明派生假设（alphabet 大小、冲突自增策略）
> 与该站不符，别硬跑。
> （图片侧的 `analyze_tile_restore.py` 才用 `warnings` 字段：它只做判据分析、不还原图。）

---

## 三、B 类：接口下发数组（含逆置换陷阱）

以智慧酒店（`captcha.tuyacn.com`）为例，链路 `geeVerify → getQuestion → collectData`：

- `getQuestion` 响应里 `shuffle` 是 **JSON 字符串**，要先 `json.loads` 一次；
- 图被切成 **2 行 × N 列**（`N = len(shuffle) // 2`），先左后右：索引 `i < N` 在第一行。

**语义与顶象相反**。站点代码是从 `i` 取、往 `shuffle[i]` 放：

```python
# source-to-target：order[来源] = 目标
for i in range(total):
    src_x = (i % cols) * sw
    src_y = 0 if i < cols else sh_          # sh_ = height // 2
    dst = int(shuffle[i])
    dst_x = (dst % cols) * sw
    dst_y = 0 if dst < cols else sh_
    dest.paste(src.crop((src_x, src_y, src_x + sw, src_y + sh_)), (dst_x, dst_y))
```

**这两类语义互为逆置换。** 判错的表现是：图看起来"也像一张图"（因为切块都还在），
但缺口形状/纹理接缝明显错位，模板匹配分数异常低。

判优办法（`restore_slices.py --semantics auto` 已内置）：比较切片**接缝处的边缘连续性**。
只比每个切片右边界列与右邻居左边界列、下边界行与下邻居上边界行的像素差，均值越小越连续。

```bash
# order 未知语义时：两种都试，自动选接缝更连续的那个
python scripts/restore_slices.py --input bg.png --rows 2 --cols 26 \
    --order-file shuffle.json --semantics auto --out restored.png --pretty
```

**更强的验证手段**（接缝得分接近、无法判优时）：拿**一次真实成功样本**反查。
拖动成功时站点前端一定记录了 `x`，用 `x` 反推视觉缺口位置的正确坐标，
再比对两种语义下模板匹配给出的位置 —— 只有一种能对上。

### 3.1 变体：hex 字符串下发 + 跨层扁平索引（同盾 `bgImageSplitSequence`）

同盾的背景图还原把顺序**塞在一个 hex 字符串里**，每个字符 `parseInt(c, 16)` 得到一个 0~15 的目标槽位：

```text
sequence = "4F387A69D1C2B50E"       # 16 个 hex 字符 = 2 层 × 8 片，每片 40×90（源图 320×180）
i = parseInt(sequence[x], 16)      # 目标槽位（0..15）
来源槽位 x： x < 8 取「第 0 层第 x 片」，x >= 8 取「第 1 层第 (x-8) 片」
目标槽位 i： i < 8 放「第 0 层第 i 片」，i >= 8 放「第 1 层第 (i-8) 片」
```

**三个容易写错的点**：

1. 这是 **source-to-target**（`order[来源] = 目标`），不是顶象那套 target-to-source。
2. **来源索引是"扁平"的**：`x >= 8` 时必须从**第 1 层**取片，而不是从第 0 层绕回去。
   （站点 JS 里表现为分支里引用了另一层的切片数组，照抄 `x>=8 → layer1[x-8]` 即可。）
3. 切片数**不能按 `len(sequence)` 之外的方式推算**：先确认 `层数 × 每层片数 == len(sequence)`，
   不一致说明几何假设错了（层数/片宽高要重新从 `getImageData` 的调用参数反推）。

对应校验命令（`--order-hex` 直接吃 hex 串，空格/逗号会被忽略）：

```bash
python scripts/restore_slices.py --input bg.jpg --out new_bg.jpg \
    --rows 2 --cols 8 --order-hex "4F387A69D1C2B50E" \
    --semantics source-to-target --pretty
```

> 同盾的提交侧字段：`requestType=3`、`validateCodeObj`（首包返回）、`userAnswer`（需还原）、
> `mouseInfo`（轨迹，重点校验项）、`usedTime`（非 0 即可）。

---

## 四、视觉坐标 ≠ 提交坐标

这是"图还原对了、识别也对了、就是过不去"的第一大原因。

### 4.1 顶象：固定左偏移 + `speed` 比例

```
图上缺口视觉位置 = leftOffset + dx × speed
dx = (图上缺口视觉位置 − leftOffset) ÷ speed
```

- `leftOffset`：滑块小图在图内的固定初始偏移，实测 **10px**。
- `speed`：**每次刷新随机**取 `{0.9, 1.1, 1.2}` 之一，且**会上报进轨迹**
  （轨迹点结构里带 `speed` 字段）。它不是纯展示细节，是有效参数。

实例：本地识别出 `165`，站点提交 `128`。反解得 `(165−10)/1.2 ≈ 129.17 ≈ 128`。
所以 `165` vs `128` 不是识别错误，是**坐标系不同**。

**反解 `speed` 的方法**：拦截一次真实成功拖动（或让站点自己算一次），
读上报轨迹里的 `speed`，或由 `(visual − 10) / submitted` 反推并就近取 `{0.9, 1.1, 1.2}`。

### 4.2 显示缩放：canvas/图片被 CSS 缩放过

站点常见 `canvas` 原图 400×200，却用 CSS 压到 300×150 显示。截图量出来的像素必须先乘缩放比：

```
提交距离 = (截图识别位置 − leftOffset) × (显示宽 / 原图宽)
```

顶象无感 demo 就是这个形态：识别结果先 `(result − 10) * 0.75` 再拖动（300/400 = 0.75）。

### 4.3 通用换算清单

| 量 | 含义 | 拿法 |
| --- | --- | --- |
| `natural_width/height` | 图片原始像素尺寸 | `img.naturalWidth` 或服务端图片头 |
| `display_width/height` | 实际显示尺寸 | `getBoundingClientRect().width` |
| `left_offset` | 滑块图在图内的固定偏移 | 断点看 `style.left` 初值，或反解 |
| `speed` / `scale` | 站点自有的比例参数 | 断点找 `speed` 字段；反解验证 |
| `dpr` | 设备像素比 | `window.devicePixelRatio`（截图坐标换算要用） |

**推荐的工程顺序**：先还原底图 → 再模板匹配拿**视觉像素**位置 → 再按本表换算成**提交坐标** → 再生成轨迹。
不要跳过换算直接拖，也不要在没确认坐标系前反复换识别算法。

### 4.4 轨迹侧注意

- 顶象的轨迹加密有**三处**：①点击验证前的点击轨迹 ②出现滑块前的移动轨迹 ③拖动滑块的轨迹。
  其中 **① 和 ② 不是强校验**，纯算时可省略不追加；③ 必做。
- 拖动距离要带**偏移计算**：`recordSA` 里 `pageX/pageY` 与轨迹点时间一起加密，注意减去元素起点。
- 顶象该校验"不严格"的站可以退化用物理模型轨迹；但 `speed` 必须与上报一致。

---

## 五、匹配算法选择（按可用依赖递进）

| 级别 | 方法 | 适用 |
| --- | --- | --- |
| 1 | `cv2.matchTemplate` + `TM_CCOEFF_NORMED`，滑块图**先反相**、背景与模板分别高斯模糊（3×3 / 7×7） | 顶象滑块，实测 ~92% |
| 2 | 边缘特征 + **alpha 掩码** + NCC：灰度 → 高斯 → Sobel 垂向边缘 → 掩码内归一化互相关 | 滑块图带透明通道、形状不规则 |
| 3 | **FFT 加速 NCC**：`fftconvolve` 一次算全部位置（O(N·logN)），配合**亚像素高斯拟合**（三邻点二次插值，offset 限幅 ±0.5） | 需要 10× 提速或用整数位置精度不够时 |
| 4 | ddddocr `slide_match` / 语义分割 / YOLO | 无边缘、缺口与背景同色 |

**教训**：多尺度金字塔不一定更好。实测"单纯 FFT 加速"与原始方法**准确度完全一致**，
而加入多尺度反而降低准确度 —— 优先解决坐标系问题，别先上多尺度。

**图片格式坑**：扩展名 `.png` 但实际内容是 WebP 很常见（顶象底图就是 `.webp`）。
读取要走能嗅探格式的库，或以服务端返回的 Content-Type 为准。

---

## 六、边界

- 纯色块/重复纹理/随机裁剪的顺序无法靠接缝判优，只能靠顺序来源本身（A/B/C 分类）。
- 顺序字段加密、或顺序由服务端在会话里二次置乱时，本地还原不可靠 ⇒ 切人工/平台或厂商授权测试环境。
- 本文件只做离线还原与坐标换算，不控制浏览器。真实页面拖动与提交前必须回到
  `references/verification-workflow.md` 做授权确认。
