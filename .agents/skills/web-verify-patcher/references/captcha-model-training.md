# 验证码图像模型训练闭环（YOLO / 遗传算法）

当 ddddocr、OpenCV 模板匹配在**复杂验证码**上通过率过低（常见实测：滑块 5 次才成 1 次、
OpenCV 比 ddddocr 还差）时，升级到自训练模型。本文件给出可复刻的施工顺序与踩坑点。

> **本文件只讲训练。** 训练之外的"点哪几个、按什么顺序点"（检测框→题目匹配、指派、
> 语序还原、坐标生成）在 `references/click-select-and-order.md`，先读那一份判路线再回来训练。

---

## 一、什么时候值得训练

| 条件 | 判断 |
| --- | --- |
| 题型固定、长期复用 | ✅ 值得（训练成本一次性，收益持续） |
| 通过率 < 30% 且题型不变化 | ✅ 值得 |
| 只有几十张样本 | ⚠️ 可先小样本训练 + 自举标注（见 §五） |
| 题型轮换快 / 多形态混合 | ❌ 不值得，切平台或人工 |
| 需要精确坐标（不只是"是哪个"） | ✅ YOLO 的强项，OCR 做不到 |

> **先判路线**：类别集合**可枚举**（字母数字、算术符号、固定图库）⇒ 走 §四 的**分类**路线；
> 每轮内容都换、但"问题图标与九宫格中某几格相同" ⇒ 走 §八 的**特征相似度**路线。
> 两条路线不是训练量级差异，是**两类不同的题**，选错方向无法靠调参补救。

---

## 二、数据来源：先把切片拼回完整图

很多站点不下发完整验证码，而是返回**一堆 base64 切片**（按 index 前端拼）：

```python
# 顺序就是下标，别去猜排列（切片拼接 ≠ 切片乱序还原，这里没有置换）
for index, b64 in enumerate(data):
    if "," in b64:                 # 记得剥掉 "data:image/png;base64," 前缀
        b64 = b64.split(",")[1]
    open(f"slice_{index+1}.png", "wb").write(base64.b64decode(b64))
# 按文件名里的数字排序后水平拼接
```

**判据**：`slice_order` 若为 `1,2,3...` 递增，就是**拼接**不是**置换**。
置换场景走 `references/tile-scramble-and-coordinate-mapping.md`。

---

## 三、数据清洗：去噪是为了让标注和训练都省事

噪声（随机点、干扰线）会显著拉低标注效率和 mAP。用连通域面积阈值过滤最省事：

```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)   # 反相：前景为白
num, labels, stats, _ = cv2.connectedComponentsWithStats(thresh, connectivity=8)
clean = np.zeros_like(thresh)
for i in range(1, num):                     # 跳过 0（背景）
    if stats[i, cv2.CC_STAT_AREA] > 1.8:    # 面积阈值：小点全丢
        clean[labels == i] = 255
clean = cv2.bitwise_not(clean)              # 反回白底黑字，符合 YOLO 习惯
```

> 面积阈值是**唯一需要调的参数**，按噪点尺寸分布定（越小越保守）。别叠膨胀/放大，
> 会把干扰线也留下，反而更差。

---

## 四、标注与训练

### 4.1 标注工具二选一

| 工具 | 导出 | 适用 |
| --- | --- | --- |
| **Label Studio** | `YOLOv8 with image`（含 images/ + labels/） | 从零标注，Web UI |
| **X-AnyLabeling** | JSON → 需自写转换脚本 | 已有小模型时可**自动标注**（见 §五） |
| **labelme + labelme2yolo** | `labelme2yolo --json_dir <images_dir> --val_size 0.1 --test_size 0.1` | 一条命令得到 train/val/test 三份（8:1:1），适合快速起步 |

标注标签就是**类别集合**，三类常见规模：

| 题型 | 类别数 | 类别集合 |
| --- | --- | --- |
| 计算题验证码 | 13 | `['*','+','-','0'..'9']` |
| 算术式（含等号/问号） | 15 | `['0'..'9', '+', '-', 'x', '=', '?']` |
| 空间语义（几何体） | 5 | `["圆柱体","正方体","球体","圆锥体","多面体"]` |
| 滑块拼图 | 1 | 拼图块 |

> **算术类的额外注意点**：运算符（`+ - x = ?`）类别少但**形状相近**（`+` 与 `x`、`-` 与 `=` 易混），
> 标注时必须**逐个字符单独框**（不要把 `12+3` 框成一个整体），且 `x` 表示乘号要统一写成 `x` 而不是 `*`
> 或 `×`，否则推理侧 `replace('x','*')` 会漏替换。数字与运算符**用同一套标签**，类别数就是上表的 13 或 15。
>
> `labelme2yolo` 自动生成的 `names` 顺序**不可改**（索引即 `class_id`），
> 手改顺序会让标签与模型输出错位；`dataset.yaml` 里的 train/val/test 必须换成**绝对路径**。

### 4.2 数据集结构与切分

```
dataset/
  images/{train,val}/  labels/{train,val}/
  data.yaml  classes.txt
```

```yaml
path: /abs/path/to/dataset          # ← 换成你的数据集绝对路径
train: images/train
val: images/val
nc: 13
names: ['*','+','-','0','1','2','3','4','5','6','7','8','9']   # 必须与 classes.txt 行号一致（从 0 起）
```

切分 8:2，用文件名匹配 txt（Label Studio 会加前缀，用 `replace('.png','.txt')` 推断，别硬拼路径）。

### 4.3 训练参数（关键项）

```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')          # 或 yolo26x.pt 等更大 backbone
model.train(
    data='/abs/path/to/dataset/data.yaml',
    epochs=300, imgsz=320, workers=0,     # workers=0 避免 Windows 多进程报错
    fliplr=0.0,        # ★ 绝对不能左右翻转：验证码翻转后语义/算式全变
    erasing=0.4,       # 随机挖块，抗噪点过拟合
    hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,    # 轻微色彩扰动
    project='/abs/path/to/run_output', name='train_result',
)
```

> **最重要的一条**：`fliplr=0.0`。默认增强会左右翻转，对 OCR/算式类验证码是**标签污染**，
> 训练 loss 会一直下不去。
>
> **`imgsz` 必须取 32 的倍数**（原图 300 → 用 320，原图 220 → 用 224），且**导出 ONNX 时要用同一个值**
> （`model.export(format="onnx", imgsz=[320,320])`），推理时也要传同一个 `imgsz`，三处不一致会静默降精度。
> `workers=0`、`device='cpu'` 是无 GPU 环境的稳定组合。

### 4.4 收敛判据

| 指标 | 达标线 |
| --- | --- |
| `loss` | < 0.2 ~ 0.3 |
| `mAP50-95` | ≥ 0.9 |

样本量经验值：**纯手标 180~200 张**才稳定；100 张（无论 50 还是 300 轮）效果都差。
先打 70~100 张试水，不行再补。

**CPU 训练成本实测**（用于估时间，不必因为"没显卡"就放弃这条路）：
同类几何体题 120 张图 / 200 epoch / `imgsz=320` / `device='cpu'` ≈ **80 分钟**，
第 165 epoch 达到最优，`mAP50-95` ≈ 0.988。小样本 + 固定题型时 CPU 完全够用。

产物解读（`runs/.../weights/`）：

| 文件 | 含义 |
| --- | --- |
| `best.pt` / `best.onnx` | 训练中**最优** epoch 的权重，实际部署用这个 |
| `last.pt` | 最后一个 epoch 的权重，通常不用 |
| `results.csv` / `results.png` | 逐 epoch 的训练日志与曲线 |

---

## 五、自举闭环：小模型帮标注（省 80% 人力）

```
少量手标(30~50 张) → 训练小模型 → 导出 ONNX → X-AnyLabeling 自动标注
   → 人工修正漏标/错标 → 得到几百张数据集 → 重训 → 最终模型
```

导出与配置：

```bash
yolo export model=path/to/best.pt format=onnx     # X-AnyLabeling 自动标注需 onnx
```

小模型**本来就不该很准**，它的唯一职责是"把框先画出来"，质量靠后续人工修正拉起来。

### 5.1 替代法：文字类直接用多模态 OCR 分桶（更快，但人工审查不可省）

文字点选的二级分类数据集不必人工分桶，可以先让多模态 OCR 打标：

```text
① 用检测模型把所有单字抠成小图（统一 resize，如 64×64）
② 逐张送多模态 OCR（提示词写清："只提取图像中的单个汉字；图像经过混淆，字体可能有 ±30° 旋转"）
③ 按识别结果把图片 move 到 <汉字>/ 目录（文件名用 uuid，防覆盖）
④ 人工审查错分桶 —— 类别常达 1000+，这一步不能省
⑤ 生成 class_map.json（{汉字: idx}，按目录名排序）+ dataset.csv（image_path, label_idx）
⑥ 按类分组做**过采样**补齐到 min_samples，再切 train/val
```

三条硬要求：
- 识别为空或长度 > 1 的**一律丢进 `unknown`**，不要让长文本变成目录名。
- 目录/文件名要剔掉文件系统非法字符 `\ / : * ? " < > |`。
- `class_map.json` 的索引必须由**排序后的目录名**决定，否则两次运行标签错位，
  训练集和推理时的字典对不上（这条错起来完全不报错）。

---

## 六、推理与结果拼装

### 6.1 滑块拼图：只要左下角 x

```python
results = model(image, conf=0.1, max_det=1)       # max_det=1：只要最可信那个
box = results[0].boxes[0].xyxy[0].cpu().numpy()
x1, y1, x2, y2 = box
return x1                                          # 拼图框左下角 x = 拖动距离基准
```

拿到的是**视觉像素 x**，仍需按坐标换算公式变成提交坐标。

### 6.2 计算题：按 x 排序再求值

YOLO 输出是无序的检测框，**必须按 x 坐标排序**才能拼出正确算式：

```python
items = []
for box in results[0].boxes:
    items.append((float(box.xyxy[0][0]), model.names[int(box.cls[0])]))
items.sort(key=lambda t: t[0])                        # ★ 核心一步
expr = "".join(c for _, c in items).replace('x', '*')
ans = eval(expr, {"__builtins__": {}}, {})            # 只允许纯数字表达式，禁用 builtins
```

排序错 → 算式错 → 答案错，且**不会报异常**。这是最容易静默失败的一步。

### 6.3 空间语义题：先检测出**全部**候选，再按题面规则筛

「点击最大的/最小的 X」「点击与参考图相同的那几个」这类题**不能只做一次 top-1 检测**：

```python
results = model(image, conf=0.25)            # ★ 全部候选都拿出来，不要 max_det=1
items   = [(类别, box, 面积) for box in results[0].boxes]
cands   = [it for it in items if it.类别 == 题面指定类别]     # 例：只要"多面体"
ans     = max(cands, key=lambda it: it.面积)                 # 或 min(...)
```

- `conf` 要放宽到 0.25 量级：阈值太高会先把小目标滤掉，
  于是"最小的那个"永远选不出来，而且**不会报错**。
- 面积是"最大/最小"的代理量；题面说的是"体积"时，只在你确实知道几何类型的前提下才换算，
  否则用面积近似并在报告里写明这是近似。
- ⚠️ 反例：对这类题用 `max_det=1`，等于直接取消筛选逻辑。

---

## 七、替代路线：拼图还原用遗传算法（不训练）

> **外部工具指针，不是本技能内置流程。** 本节只说明"为什么这类题可以不解算法"和"要导出什么数据"，
> 具体安装与二开请自行按该项目的文档走；不要把本节当成本技能提供的可运行能力。

易盾「推理拼图」这类**真·拼图**（把打乱的图像块拼回原图）不必训练模型，用遗传算法直接解：

**为什么能解**：拼图块之间"不该有突变"。把图二值化后观察，错误拼缝处**边缘趋于直线且突变明显**，
而正常图像不会有这种突变 —— 这个"接缝代价"就是遗传算法的适应度函数。

工具链（`gaps`，开源拼图还原）：

```bash
pip install -r requirements.txt      # 报错时：逐包单独装最新版，再改 requirements.txt 版本号
pip install -e .
python gaps --image=puzzle.jpg --size=60 --generations=20 --population=600 --save
```

拿**索引映射**（而不是图片）需要在 `individual.py` 上二开（下面只是要改的三处要点，
**具体行号/API 随上游版本变化，需按你安装到的版本核对**）：

1. 初始化加 `self.pieceMapping = None`
2. `to_image()` 里 `self.pieceMapping = self._piece_mapping` 后返回
3. 加 `getPieceMapping()` 暴露出来

拿到 `{位置: 原块索引}` 映射后，再映射回站点要求的顺序格式。
**注意**：极度复杂/低对比的原图，遗传算法还原误差会明显变大，此时应切平台或人工。

---

## 八、九宫格 / 图标点选：走"特征相似度"，不是分类

上面 §四 的**分类**路线（`nc = 完整类别集合`）只适用于**类别集合固定**的题
（字母数字、算术符号、固定图库）。**九宫格 / 图标点选属于另一类**：题目内容每轮都换，
"分类"没有意义 —— 训练的目标不是"认出这是什么图标"，而是
**"学一个能把同类图标聚在一起的特征空间"**。

**判据**：如果同一类目标在不同轮次反复出现（可枚举标签）⇒ 分类；
如果每轮都是新图、但**问题图标与九宫格中的某几格内容相同** ⇒ 相似度。

> 本节只覆盖"怎么把同类聚在一起"。**题目→坐标的匹配与指派、语序还原、坐标生成**
> 见 `references/click-select-and-order.md`（含 `scripts/assign_by_similarity.py`
> 与 `scripts/order_restore.py` 两个零依赖 CLI）。

### 8.1 施工顺序

```text
① 切图：九宫格按 3×3 切开（顺序从左到右、从上到下）；问题小图标单独处理
② 统一：resize(224,224) + ImageNet 标准化 ((0.485,0.456,0.406),(0.229,0.224,0.225))
③ 特征：用 ResNet18 backbone（把 fc 换成新的 Linear 也行，取 512 维特征即可）
④ 匹配：问题图标的特征向量与 9 张子图逐一算**余弦相似度** → 得到相似度矩阵 →
   用 `scripts/assign_by_similarity.py` 解**行列不相交的指派**
   （⚠️ 不要"每个题目各自取 top-1"，有相近图标时会撞到同一格）
```

```python
def cosine_similarity(v1, v2):
    v1, v2 = np.array(v1), np.array(v2)
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
```

- **答案顺序**：站点一般要求按语序/位置提交，返回的坐标要用原始 `[行, 列]` 表示
  （`coordinates = [[1,1],[1,2],[1,3],[2,1],...]` 这种 1 起的索引，别用 0 起再去猜）。
- 训练到"能把同类聚在一起"即可，**不需要高分类准确率**；500 张左右样本 + 50 epoch 是够的。

### 8.2 数据集与标注

- **先去重**：按文件 md5 去重（同一批下载里重复图很常见，重复会明显拉偏特征空间）。
- **切图顺序固定**：先切 3×3 存成独立文件，再连同小图标一起进 `images/` 目录。
- **标注工具**：做一个几十行的 Tkinter 小工具（显示图片 → 输入同类标签 → 回车归档到
  `outputs/<标签>/`），比通用标注工具快；同类打同一个标签即可。
- 目录结构喂给 `ImageFolder` 时，**子目录名就是类别**，所以标签要规范化（统一大小写/别名）。

### 8.3 导出 ONNX 与推理

```python
torch.onnx.export(model, torch.randn(10, 3, 224, 224), "model/resnet18.onnx", verbose=True)
```

推理只依赖 `onnxruntime`，不需要装 torch：

```python
session = ort.InferenceSession(model_path)
outputs = session.run(None, {session.get_inputs()[0].name: batch})[0]   # 小图标 + 9 张子图一起送
```

- 一次把 10 张图（1 图标 + 9 格）打包成一个 batch 送进去，比循环单张快得多。
- PNG 带 alpha 的要**先合成到白底再转 RGB**，否则透明区域会被当成黑色，特征被污染。

### 8.4 边界

- 相似度路线对**图标本身低对比、或九宫格中有多格内容相近**的题会误判 top-1；
  取 top-3 提交前若站点允许重试，要按分数差做置信度门槛。
- 如果站点要求的是**语序点选**（先点 A 再点 B），相似度只能给出"是哪几格"，
  **顺序信息需要额外一步** → 走 `references/click-select-and-order.md` §四
  （语言模型/词频表打分，脚本 `scripts/order_restore.py`）。
  顺序错了不会报异常，只会静默失败。
- 协议侧（题目下发字段名、提交参数）见 `references/geetest-protocol-matrix.md` §九。

---

## 九、边界

- 本文件只覆盖离线识别与训练。真实页面提交前的授权确认见 `references/verification-workflow.md`。
- 训练产物（权重、数据集）属于案例中间产物，落 `artifacts/`，不要写进技能目录。
- 过验证 ≠ 过风控：识别准确率再高，坐标换算、参数绑定、环境指纹不对仍然失败。
  排查顺序见 `references/tile-scramble-and-coordinate-mapping.md` §四。
- §四 的**分类**路线与 §八 的**相似度**路线不是升级关系，是**两类不同的题**：
  先按「类别是否可枚举」判据选路线，选错方向比参数没调好更致命。
