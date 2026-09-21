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
| 百度旋转 | `ac_c` | `mv` | — | `ac_c = round(distance / (290 - 52), 2)` |
| 拼图类（多组四元组） | 首元素 | 每组 `[x, y, t, 1]` | 第 3 位 | 整组列表再套加密 |

> 经验映射：`i`/`ud`/`wi` 多半是距离、`gq`/`mv`/`th` 多半是轨迹、`vs`/`gk` 多半是时间。
> **但必须有实包对照**，别靠字段名猜——同名不同义已经出现过。

> ⚠️ **格式化 / 改写 JS 后提交必失败**：部分厂商（实测数美 `captcha-sdk`）会检测脚本是否被格式化或替换，
> 你把响应替换成本地格式化版本后，**即便滑块位置完全正确也过不去**。
> 检测点常在路径加密函数（`getEncryptContent` 一类）内部，形如 `obj[a][b]() && (x = y)` 的"检查通过就整体改写"。
> 做法：删掉/注释该检测，或把改完的代码**重新压缩**回去再替换。
> **先删检测、再谈识别**，否则会把技术问题误判成"识别不准"。

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
