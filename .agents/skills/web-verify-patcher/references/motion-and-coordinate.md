# 坐标、轨迹与本地模拟

本文件用于生成离线坐标和轨迹。默认只输出 JSON，不直接控制真实网页。真实页面点击、拖动、提交前必须让用户再次确认。

> **滑块类先读 `references/tile-scramble-and-coordinate-mapping.md` §四。** 该文件讲的是
> 「**视觉坐标 ≠ 提交坐标**」：站点可能在图片像素与提交距离之间夹了固定左偏移、
> 随机比例参数和 CSS 缩放。不先做这层换算，识别再准也过不去。
> 本文件只处理「**已知提交距离** → 生成轨迹点」，不重复那套换算公式与数值。

## 坐标体系

常见坐标有三种：

- 图片像素：截图或验证码图片中的像素坐标。
- 元素 CSS 像素：浏览器中验证码元素内的相对坐标。
- 页面坐标：考虑元素位置、滚动偏移后的页面坐标。

换算时记录：

- 原图尺寸：`image_width`、`image_height`。
- 显示尺寸：`display_width`、`display_height`。
- DPR：`device_pixel_ratio`。
- 元素位置：`element_left`、`element_top`。
- 滚动：`scroll_x`、`scroll_y`。

使用脚本：

```bash
python scripts/map_coordinates.py --image-size 300x150 --display-size 300x150 --point 120,75 --element-left 20 --element-top 80 --pretty
```

## 滑块轨迹

轨迹应包含：

- 起点、终点。
- 每个点的 `x`、`y`、`t`。
- 轻微纵向抖动和停顿。
- 总时长。

使用脚本：

```bash
python scripts/generate_motion_track.py --mode slider --distance 128 --duration-ms 1100 --pretty
```

输出只用于授权 QA 分析。厂商可能检查行为采集、浏览器状态和加密参数，不要假设轨迹自然就能通过。

## 轨迹字段对照（同一件事，各厂商叫法不同）

| 厂商 / 形态 | 距离 | 轨迹 | 时间 | 备注 |
| --- | --- | --- | --- | --- |
| 数美（SM）/ 树美类 | `ud` / `wi` / `i` | `th` / `gq` | `gk` / `vs` | 三个字段各自带一把**固定 key** 做 DES/AES |
| 极验 v3 | 底图内 `x` | `aa`（编码后） | — | 见 `references/geetest-protocol-matrix.md` §四 |
| 百度旋转 | `ac_c` | `mv`（**实测不校验，写死/置空都能过**） | — | `ac_c = round(distance / (290 - 52), 2)` 是 **v2 旋转**口径（`mkd_v2.js`）；**v1（`mkd.js`）滑轨是 212**，两者化简后同为 `angle / 360`。**v2 的滑块分支分母是 `290` 不是 `238`** —— 两代两题型四个口径见 `references/rotation-and-gesture-protocols.md` §2.2 |
| 拼图类（多组四元组） | 首元素 | 每组 `[x, y, t, 1]` | 第 3 位 | 整组列表再套加密 |
| 360 天御 | `report` 内 | `[{ "<x>": {"t": <ms>, "y": y} }]` **对象** | 每点 `t` | 与 turing 同名不同家，见 `slider-vendor-matrix.md` §3.2 |
| 腾讯云 turing | `ans` 里的 `x,y` | `collect` 内部（jsvmp，不透明） | — | `ans` 是**坐标**不是轨迹，见 §3.1 |
| 云片 | `distanceX` | `points = [[x, y, t], ...]` | 每组第 3 位 | **超 50 点必须抽稀**，见 §3.4 |
| 东方财富 | `u` | `d=x,y,t:x,y,t:...` | 每组第 3 位 | pipe 串整体再 XXTEA，见 §3.12 |
| v5（verify5） | 每 3 个一组的第 2 位 | 逗号串：**最前面两个值是时间戳**，其后每 3 个一组 | 每组第 1 位 | 走 WS 消息体，见 §3.13 |
| 螺丝帽 | — | `path` 两点 + `timePoint` 两点 | 两个**绝对**时间 | 两串各自 AES，见 §3.5 |
| 安居客 | `x` | `track`（`x,y,t` 串） | 第 3 位 | `p:[0,0]` 占位，见 §3.6 |
| 快手 | 由 `x` 换算 | `x,y,time` 逗号串 | 第 3 位 | 先按站点常量换算，再可能被**变异**，见 §3.16 |
| 51.com | `point` | — | `times` | `token = md5(challenge + times + point)`，见 §3.8 |

> 经验映射：`i`/`ud`/`wi` 多半是距离、`gq`/`mv`/`th` 多半是轨迹、`vs`/`gk` 多半是时间。
> **但必须有实包对照**，别靠字段名猜——同名不同义已经出现过。

> ⚠️ **格式化 / 改写 JS 后提交必失败**：部分厂商（实测数美 `captcha-sdk`）会检测脚本是否被格式化或替换，
> 你把响应替换成本地格式化版本后，**即便滑块位置完全正确也过不去**。
> 检测点常在路径加密函数（`getEncryptContent` 一类）内部，形如 `obj[a][b]() && (x = y)` 的"检查通过就整体改写"。
> 做法：删掉/注释该检测，或把改完的代码**重新压缩**回去再替换。
> **先删检测、再谈识别**，否则会把技术问题误判成"识别不准"。

## 轨迹格式与变异（B19）

### 先认容器，再谈内容

同一件事有六种容器形态，**按容器选生成器**，不要都当 `[x,y,t]` 数组处理：

| 容器形态 | 样子 | 出现于 |
| --- | --- | --- |
| 对象以 x 为 key | `[{ "34": {"t": 1699…, "y": 217}, … }]` | 360 天御 |
| 三元组数组（需抽稀） | `[[x, y, t], …]` | 云片（`len//50` 步长、保首尾） |
| pipe 串内嵌 | `…\|d=1,0,20:4,0,36:…\|…` | 东方财富 |
| 逗号串 + 前置两枚时间戳 | `ts, ts, t, x, y, t, x, y, …` | v5（verify5，走 WS） |
| 两点 + 两点（绝对时间） | `path0:time0\|\|path1:time1` | 螺丝帽 |
| 三元组串（分隔符混用） | `x,y,t\|x,y,t\|` | 安居客（`track`） |

### 轨迹点变异（目前只有快手实测到）

部分站点会**故意把个别轨迹点算成很大的数**（看起来像"乱数"），目的就是过滤掉直接上传原始鼠标轨迹的脚本。

- 触发：配置接口返回 `d` ⇒ 轨迹长度等于 `a` 时第一次变异，之后每隔 `d` 个点再变异；
  只返回 `q` ⇒ 第 `a+1` 个点起变异。
- 变异值：`x' = x × sx + ix`、`y' = y × sy + iy`（`sx/sy/ix/iy` 都来自配置接口）。
- **性价比判断（重要）**：来源实测**不做变异也能过**（200 次 99.5% / 500 次 98.2% / 1000 次 93.8%）。
  ⇒ 先跑「真实轨迹缩放 + 不变异」基线拿通过率，**再决定是否复刻变异**；一上来就逆变异逻辑是本族最低性价比的路线。
- 细节与来源口径见 `references/slider-vendor-matrix.md` §3.16。

### 坐标换算常量表（逐站，**不可跨站复用**）

| 站点 | 换算 | 说明 |
| --- | --- | --- |
| 东方财富 | `distance = int(box_x - 8)` | 固定偏移 `-8` |
| 云片 | `int(box_x / 480 * 304)` + `rand(1,2)` | 480/304 是该站渲染缩放 |
| 360 天御 | `int(box_x / 544 * 300)` | 544×284 画布、条宽 17 |
| 同花顺 | `inity = data.data.inity / 195 * opt.height` | `195`、`opt` 宽高为该站常量 |
| 快手 | `x = floor((clientX - clientX0) / 276 * 1000)`；`y = floor(clientY - 282.25)` | 两个常量均为该站值 |
| 安居客 | 识别距离 × `280/480`（或先缩放图片再识别） | 源 480×270 → 渲染 280×158 |
| 房天下 | 识别前把 320×160 → 300×150 | 滑块 60×158 → 57×150 |
| 数美 | 识别距离 `÷ 2` | 源 600×300 → 渲染 300×150 |

> ❌ 上表**只能逐站实测**填；把任何一行的常量套到别的站，症状是"识别看着对、就是过不去"。

## 缺口定位的零依赖法：竖线灰度方差扫描（B23）

不需要 OpenCV / 不训模型，也能定位**左侧边缘是一条 40px 左右竖直亮线**的滑块缺口
（`52pojie-867169` 的原始做法，纯灰度矩阵 + 方差比较）：

1. 转灰度（丢掉色彩信息）；
2. 用 **3×3 方块竖向扫描**整图；对每块求**三行的方差** A1/A2/A3 与**第三列（缺口边缘那一列）的方差** B3；
3. 若 **B3 比 A1/A2/A3 中至少两个大** ⇒ 该块**可能**在缺口左边缘
   （原理：缺口边缘是竖线 ⇒ 同一列内灰度稳定、跨列突变 ⇒ 列方差 > 行方差）；
4. 单点判据噪声很大（正常区域也会命中）⇒ 必须**按列聚合**：
   统计每列命中块数，**> 20 才给该列建分**；得分 = 「该列内**连续**命中块数之和」；
   得分最高的一列即缺口左边缘。

```python
# 逐列聚合（原文 scan_array 的语义）
score = {}
for x in range(start_x, w):
    runs, cur, hits = 0, 0, 0
    for y in range(start_y, h):
        if is_border(pixels(y, x)):      # 3×3 方差判据
            cur += 1; hits += 1
        else:
            runs += cur; cur = 0
    runs += cur
    if hits > 20:
        score[x] = runs
gap_x = max(score, key=score.get)
```

**适用边界（必须点破）**：这条路线的**唯一前提是「缺口形状每轮不变」**
（缺口左边是一条竖直线）。若缺口形状随机（星星/月亮/拼图轮换），
方差扫描立刻失效 ⇒ 换 §三 匹配与指派 / 图像相似度路线。

## 轨迹容器与时间校验（B23）

`scripts/trajectory_codec.py`（`--selftest` **24 项**）把下面两族容器做成可复现编解码，
用来"拿浏览器真实值当 oracle 对拍"，而不是凭印象拼字符串。

| 容器 | 形态（**逐字符口径**） | 来源 |
| --- | --- | --- |
| 快手 `kuaishou-comma` | `x\|y\|Δt` 用 `,` 连接；**原始值带前导逗号**（`"," + join`），提交前 `.slice(1)`；`Δt` 相对**整条轨迹的起点**（`t.trajectory[0][2]`），**不是相邻点差**；只取 `slice(-100)` | `52pojie-1697353` |
| 阿里云 `aliyun-tracklist` | 对象：`TrackList.mc`=`x,y,t, ,1`、`mp`/`mm`=`x,y,t,1\|…`（`mm` 是 `mp` 尾部子集）、`tc/mu/te/tmv/ks/fi` 空串占位、`si` 语义未明；外层 `TrackStartTime`/`VerifyTime`/`arg` | `52pojie-1982617` |

**三条容易踩的**：

1. **`Δt` 的基准点**：快手是"相对首点"，且**截断取点（`slice(-100)`）不改变基准** —— 基准在 `slice` 之外计算。
   写成"相邻点差"或不截断时重算基准，都会与服务端不一致（**不报错，只失败**）。
2. **前导逗号**：浏览器里 `c` 的值是 `"," + join`，**提交前 `slice(1)`**。对拍时拿到的到底是哪一个，
   要按"扣出来的代码里传的是 `c` 还是 `c.slice(1)`"判断，不要凭"看起来一样"。
3. **时间一致性校验**：点选类尤其明显 —— 轨迹自身耗时 1s，就别在 0.1s 后把 check 发出去
   （`52pojie-1882302` 实测；该文同时给出另外三条同样重要的因素：请求头完整性、
   `callback` 随机范围 ≤10、`fp` 必须对应站点域名）。详见
   `references/behavior-verify-and-sign-headers.md` §9。

```bash
S=.agents/skills/web-verify-patcher/scripts
python $S/trajectory_codec.py identify --value "<抓到的轨迹串>"
python $S/trajectory_codec.py decode --format kuaishou-comma --value "<c>" --t0 <首点时间戳>
python $S/trajectory_codec.py encode --format aliyun-tracklist --points points.json --si "<原样透传>"
```

> ⚠️ 不要把 `si` 这类**语义未明**的字段"补全"成公式：来源只给了观测值，本仓库一律透传。

## 旋转 / 弧线滑块（轨迹带旋转角度）

滑块沿**弧线**移动且自身**旋转**时，只有水平距离不够，要把角度一起算出来：

1. 接口通常多返回一个决定曲线的参数（实测字段名 `attrs`，浮点数，每次不同）。
2. 浏览器侧几何（反混淆后）大致是：

   ```js
   ratio  = (trackWidth / 2 - jigsawWidth) / trackWidth
   g1     = clamp(jigsawOffset, trackWidth - jigsawWidth) * ratio   // 视觉偏移
   rotate = attrs[0] * g1                                           // 角度 = 偏移 × attrs
   transformOrigin = attrs[0] > 0 ? 'bottom right' : 'top right'    // 旋转中心随符号切换
   ```

   ⇒ **角度不是独立参数**：先算偏移，再乘 `attrs` 就能复现，不用去猜角度范围。
3. 缺口候选多于一个、且两缺口**形状相同**时，纯模板匹配失效。识别方案按成本递增：

   | 方案 | 结果 |
   | --- | --- |
   | 旋转模板匹配（每转一个角度匹配一次） | 多缺口时置信度混乱，最差 |
   | YOLO 切出缺口 + 对切割图旋转模板匹配 | 准，但慢、算量大 |
   | **`attrs` 推轨迹 → YOLO 出全部缺口 → 比较轨迹点到各缺口的最小距离** | 推荐；距离接近时再用"该处角度"做旋转模板匹配比置信度 |

4. 轨迹点用三角函数算：先取**去掉透明背景**后的滑块中心
   （alpha 通道阈值 → `findContours` → `boundingRect`），再由 `β`、`α` 推 `γ`，
   最终轨迹点 ≈ `(滑块宽度 + x1 + x2, y)`。

## 拖放轨迹

拖放需要源点和目标点：

```bash
python scripts/generate_motion_track.py --mode drag-drop --start 40,60 --end 220,130 --duration-ms 1400 --pretty
```

注意目标区域可能有吸附、动画、释放点容错和拖拽事件差异。

## 刮刮卡轨迹

刮刮卡是覆盖区域，不是单一终点：

```bash
python scripts/generate_motion_track.py --mode scratch --box 10,10,220,90 --duration-ms 1800 --pretty
```

输出点列用于覆盖比例分析。移动端触摸事件和 canvas 状态变化需要真实环境复核。

## 轨迹绘制/连线

如果已有目标路径点：

```bash
python scripts/generate_motion_track.py --mode trace --points "10,10 80,30 120,90" --duration-ms 1000 --pretty
```

如果只有图片，需要先用 OpenCV 提取路径，再重采样。

## 点选坐标

点选/九宫格/区域选择优先输出元素相对坐标和截图坐标。多点题必须保留顺序。

- **"题目 → 坐标"的匹配与指派**（精确匹配 + 字形相似度兜底、相似度矩阵的贪心/匈牙利指派、
  语序还原）在 `references/click-select-and-order.md`；两个零依赖 CLI：
  `python scripts/assign_by_similarity.py --matrix "..." --pretty`、
  `python scripts/order_restore.py --chars "地天冰雪" --coords "12,34;56,78;90,12;30,44" --pretty`。
- ⚠️ **不要"每个题目各自取相似度最大的框"**：有重复目标时会返回同一个坐标两遍（不报错）。
  匹配命中后必须把该框从可用池移除。

输出格式建议：

```json
{
  "coordinate_space": "element-css",
  "points": [
    {"x": 120.0, "y": 75.0, "order": 1, "label": "天"}
  ],
  "source_image_size": [300, 150],
  "display_size": [300, 150]
}
```

## 真实网页执行前检查

执行前必须确认：

- 目标是否自有/授权。
- 浏览器模式是否按 `browser-acquisition.md`。
- 是否需要人工完成登录或验证码。
- 是否读取 Cookie/Storage。
- 是否提交业务表单。

任何一项不明确，都停留在离线产物。
