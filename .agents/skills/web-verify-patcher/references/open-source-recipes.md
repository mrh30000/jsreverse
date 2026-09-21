# 开源/本地方案示例

本文件只给授权场景下的离线求解和诊断示例。真实网页点击、拖动、提交前必须回到 `references/verification-workflow.md` 做确认。

## 通用准备

建议先把证据整理成文件：

- 图片验证码：精确裁剪后的图片。
- 滑块：背景图、滑块图、轨道宽度、元素显示尺寸。
- 点选/九宫格/区域：完整截图、题面文本、元素边界。
- 音频：音频文件、语言、答案格式。

依赖示例：

```bash
python -m pip install ddddocr opencv-python pillow numpy
```

只在需要时安装对应库，不要把依赖路径写进 skill。

## `text`

开源优先：

1. 用 OpenCV 做灰度、二值化、降噪、去干扰线。
2. 用 ddddocr 或 Tesseract 识别。
3. 用字符集、长度、大小写规则约束结果。

示例思路：

```python
import ddddocr

ocr = ddddocr.DdddOcr(show_ad=False)
with open("captcha.png", "rb") as f:
    text = ocr.classification(f.read())
print(text)
```

适合切到平台的情况：扭曲强、背景噪声强、字符粘连、样本通过率低。

## `math`

流程：

1. 按 `text` 识别表达式。
2. 归一化 `x/X/×` 为 `*`，`÷` 为 `/`。
3. 只允许数字、括号和基础运算符进入安全求值。

输出必须包含原始 OCR、归一化表达式和结果。遇到歧义时不要猜。

## `slider`

开源优先：

1. 先确认图片模式：双图、单图、canvas。
2. 双图优先用 ddddocr `slide_match` 或 OpenCV 模板/边缘匹配。
3. 单图用缺口边缘、局部对比、差分或 VLM 辅助。
4. 用 `scripts/map_coordinates.py` 把图片偏移换算成 DOM/CSS 坐标。
5. 用 `scripts/generate_motion_track.py` 生成滑块轨迹 JSON。

示例思路：

```python
import ddddocr

det = ddddocr.DdddOcr(det=False, ocr=False, show_ad=False)
with open("target.png", "rb") as f:
    target = f.read()
with open("background.png", "rb") as f:
    background = f.read()
print(det.slide_match(target, background))
```

注意：视觉偏移正确不等于验证一定成功；厂商可能绑定行为采集、challenge id、浏览器状态或加密参数。

## `click-select`

开源优先：

1. OCR/VLM 解析题面，保留原始顺序词；**先判子类**（文字/图标/语序/图文/空间语义）——
   子类判据与完整施工顺序见 `references/click-select-and-order.md`。
2. 文字点选**先用 `ddddocr` 的 `detection()`**（1.3.0+，零训练）：
   检测框 → 抠图拼接成一行 → `classification()` 一次识别 → `assert len(text) == len(boxes)`。
3. 图标题每轮换内容时用**特征相似度**（ResNet/CLIP 提特征 + 余弦相似度），
   不要训分类模型；同色同形且图库稳定时可直接用 **SIFT/SURF 特征匹配**（5~10 ms/对，免数据集）。
4. 物体点选用 YOLO/目标检测、CLIP/VLM 或模板匹配；空间语义题要**保留全部候选**再按题面筛
   （`conf` 放宽到 0.25 量级，不要 `max_det=1`）。
5. **题目 → 坐标用指派求解**：
   ```bash
   python scripts/assign_by_similarity.py --matrix "0.1,0.2,0.8,0.5;0.9,0.3,0.5,0.1;..." --pretty
   ```
   精确匹配命中后必须把该框从可用池移除，否则重复目标会返回同一坐标两遍。
6. **语序点选多做一步顺序还原**：
   ```bash
   python scripts/order_restore.py --chars "地天冰雪" --coords "12,34;56,78;90,12;30,44" --pretty
   ```
7. 输出截图坐标和元素相对坐标，多点题保留顺序。

需要多轮时，每轮单独保存题面和截图。

## `rotate`

开源优先：

1. 用 OpenCV 主方向、特征匹配或边缘方向估计角度。
2. 用 VLM 做正向判断复核；百度旋转类可直接用开源角度识别项目。
3. 按轨道宽度和角度范围换算拖动距离（注意 `(distance - 固定偏移) / 有效行程` 这类非线性映射）。
4. 旋转滑块（弧线 + 自转）先按 `attrs × 偏移` 算角度，再用轨迹到缺口的最小距离选目标，
   见 `references/motion-and-coordinate.md`「旋转 / 弧线滑块」。

输出角度、轨道宽度、换算公式、固定偏移和置信度。

## `grid`

开源优先：

1. 分割格子，记录每格边界和中心点。
2. 用题面选择分类器：YOLO、CLIP、VLM 或专用图片分类模型。
3. 返回格子编号、中心坐标和每格置信度。

reCAPTCHA/hCaptcha/AWS WAF 可能多轮，不要只保存最后一轮。

## `audio`

开源优先：

1. 提取音频文件。
2. 做降噪、音量归一化和静音裁剪。
3. 用 Whisper/faster-whisper 转写。
4. 用答案格式做数字/字符纠错。

示例依赖：

```bash
python -m pip install faster-whisper
```

不要处理电话语音 OTP、短信、邮箱或 MFA。

## 图像/坐标类组合

这些类型通常共享一组能力：

- `drag-drop`：目标检测源对象和目标区域，再生成拖放轨迹。
- `trace-draw`：OpenCV 提取路径，骨架化后重采样成点列。
- `scratch`：生成覆盖轨迹，观察刮开前后状态。
- `image-restore`：先判断是否为切片乱序；页面顺序优先，图片边缘/纹理匹配次之。
- `area-select`：检测/分割/SAM/YOLO/VLM 输出框或多边形。
- `difference-click`：图像配准后差分定位。
- `font-identify`：OCR 内容 + 字形特征或 VLM 字体关系判断。
- `semantic-reasoning`：目标检测 + 关系推理或 VLM。

优先输出离线坐标和置信度；真实页面操作前必须确认。

## `image-restore` 切片乱序

当图片被分割成多块后顺序打乱时，保持主类型 `image-restore`，补充 `captcha_variant: tile-scramble`。

两个脚本分工不同，**按顺序用**：

```bash
# ① 先分类：判断到底是不是切片乱序（不写图，只给判据）
python scripts/analyze_tile_restore.py --image scrambled.png --rows 3 --cols 3 \
    --order-source-by-target "1,2,0,4,5,3,7,8,6" --output-image restored.png --pretty

# ② 再还原：处理「顺序来自派生算法 / 接口下发数组 / 语义正逆待定」的情况
python scripts/restore_slices.py --input scrambled.png --rows 2 --cols 26 \
    --order-file shuffle.json --semantics auto --out restored.png --pretty
```

`restore_slices.py` 的独有能力（`analyze_tile_restore.py` 不具备）：

- **顺序语义自动判定**：`--semantics auto` 对 `target-to-source` / `source-to-target` 两种互为
  逆置换的解释都试一遍，按切片接缝边缘连续性判优（判反了会得到"像图但缺口错位"的底图）；
- **顺序来源派生**：`--order-from-name`（顶象从 URL 文件名 `ord%32` 去重递增）、
  `--order-from-url`（从 query 取 `c`，否则 `sid`+`aid`）；
- **零依赖**：只用标准库 `zlib` 手写 PNG 读写，本机没有 Pillow/OpenCV/numpy 也能跑。

> 顺序数组长度 ≠ `rows*cols`、或不是 0..N-1 的排列时，`restore_slices.py` **直接报错退出**
> 并给出 `hint`。这是有意的：静默截断会产出一张看不出问题的错图。
> 完整判据与坐标换算见 `references/tile-scramble-and-coordinate-mapping.md`。

处理顺序：

1. 页面逻辑优先：从 `tileOrder`、`pieceOrder`、`sliceOrder`、CSS `background-position`、sprite、canvas `drawImage` 或接口字段还原每个目标位置对应的来源切片。
2. 只有图片时：按 `rows/cols` 或 `tile-width/tile-height` 切片，用左右/上下边缘连续性、颜色/纹理连续性、特征点匹配或 VLM 得到候选顺序。
3. 输出 `order_source_by_target`、`confidence`、`restore_strategy` 和还原图；低置信度时不要硬猜。
4. 如果还原结果还要换算拖动距离或交换动作，再回到 `references/motion-and-coordinate.md` 处理坐标和轨迹。

边界：

- 普通九宫格选择题是 `grid`，不是切片乱序。
- 普通缺口滑块是 `slider`，不是切片乱序。
- 纯色块、重复纹理、随机裁剪或顺序字段加密时，本地边缘匹配通过率会低，应切人工/平台复核或厂商授权测试环境。

## `pow-challenge`

PoW 类不是图片识别题。对 ALTCHA、FriendlyCaptcha、Cap.js、mCaptcha 等：

1. 阅读官方接入方式。
2. 检查 challenge、payload、difficulty、nonce、TTL、防重放和服务端签名。
3. 自有系统优先修正集成和校验逻辑。

不要把 PoW 当成 OCR 或滑块任务。
