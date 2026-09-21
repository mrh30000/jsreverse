# 【Web逆向】yolo深度学习识别——计算题验证码

> **作者**: epiphanyep | **发布时间**: 2026-03-23 20:13:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3602 / 50
> **原文**: [https://www.52pojie.cn/thread-2098921-1-1.html](https://www.52pojie.cn/thread-2098921-1-1.html)

---

*本帖最后由 epiphanyep 于 2026-3-24 20:03 编辑*

hello 大家！

今天给大家带来计算题验证码的验证  用yolo训练模型 然后识别文字  先看一下什么叫计算题验证码吧 如下图

![](https://ps.ssl.qhimg.com/t02033ac7170dc45668.jpg)

计算出验证码的简单数字的加减乘 得出结果 用结果验证。

目标网站：[https://www.spiderdemo.cn/captch ... type=cap3\_challenge](https://www.spiderdemo.cn/captcha/cap3_challenge/?challenge_type=cap3_challenge)

先说一下整体思路吧 免得大家看到一半忘记自己在做什么为什么要这么做：

遇到较难识别的验证码 普通的识别库 如ddddocr 和opencv 不能很好的识别目标 。那怎么办呢？这就用到本次的主角了 yolo ！这个深度学习框架 它可以在这个画面里找出它认识的东西，并标出目标的位置。

思路：

1. 收集大量数据

2. 打标签供yolo学习

3. 用yolo进行训练

4. 用训练结果进行识别

大致就分为这几步 好了 开始分析吧

进入网站 打开开发者工具 点击翻页进行抓包：

![](https://ps.ssl.qhimg.com/t02f489057b543be214.jpg)

可以看到返回了一个 xhr 和 一堆图片的接口

先来看图片接口的吧 点preview 可以看出 这个小照片其实就是原验证码图片进行切割得到的：

![](https://ps.ssl.qhimg.com/t0235adf21f9d7b7703.jpg)

那么我们的目标就是把照片下载到本地 进行拼接。

再看xhr接口：

载荷没啥说的 直接看响应：

![](https://ps.ssl.qhimg.com/t0269968b89250998b5.jpg)

返回的就是照片的地址 到本地解一下base64就行了

所有小图片下载到本地后 进行拼接 这里拼接让ai生成算法就行了 还原后如下图：

![](https://ps.ssl.qhimg.com/t02abf279b502616620.jpg)

图片拼接后我们得批量下载了 但是下载之前有个问题

大家可以注意到 这个验证码 有很多噪声 也就是干扰项 各种点 各种线

这里处理这个噪声 我是用的opencv进行去噪 效果图如下：

![](https://ps.ssl.qhimg.com/t0269821b4e407cab20.jpg)

目的就是为了后续 让yolo更好的识别

然后我们就可以批量下载数据 拼接  再进行图片清洗

至于要下载多少 数据量多少 一是得看验证码难度了 越难的验证码最好多准备一点
二是后续训练效果 数据越多 你标注的越多 后期yolo识别的就越准确 越聪明

我这里是准备了200张完整的清晰过的图片

然后就开始标注打标签   这里最为经典的 大多数人最为了解的 应该是LabelImg 但是我这里用的 Label Studio 见下图

![](https://ps.ssl.qhimg.com/t0298727afcb9dfd848.jpg)

这个得自己额外下载 然后 在终端里 用命令 start label-studio 进行启动

![](https://ps.ssl.qhimg.com/t02f93ba4d2051e7a18.jpg)

然后就会自动启动浏览器打开界面(label studio具体怎么下载 我就不教了)

打开界面后 点create project

![](https://ps.ssl.qhimg.com/t02745b8dc3aaa038d5.jpg)

项目名字随便起一个 然后

![](https://ps.ssl.qhimg.com/t021bc7fd5e54ad0a83.jpg)

点击labeling setup 进入界面后：

![](https://ps.ssl.qhimg.com/t024ac881173a9be33f.jpg)

再点击 data import 把改成清洗后的200张的上传

之后应该会到这个界面

![](https://ps.ssl.qhimg.com/t0270a2a5d0ebb5f6fa.jpg)

点击第一个项目 就可以开始打标签了 如下图

![](https://ps.ssl.qhimg.com/t028b1c670683348afb.jpg)

这里因为是识别数字运算 所以我添加了 0-9 '+'     '-'     '\*'  这些标签

打标签的过程 十分无聊 可以选择听听歌来打发时间 比如王力宏的《爱错》薛之谦的《认真的雪》 等等     两百张也够你一两个小时了hhhhh

当然你也可以打个七八十张 一百张    万一七十张就可以了  那没必要多打标签浪费时间 (我是先打了100张后来模型训练50轮出来效果比较差 训练了300轮也不太好 最后还是打了180+才好)

标签打完了点击你的项目名称

![](https://ps.ssl.qhimg.com/t02ff984dfc7cf6094f.jpg)

退到上一级界面后 右上角有一个export导出

![](https://ps.ssl.qhimg.com/t0202a2229037aed81d.jpg)

选择yolov8 with image  导出 然后是一个压缩包 把他解压到一个你项目下的文件夹下 我这里叫做dataset

![](https://ps.ssl.qhimg.com/t02144af2582d540ee6.jpg)

这个数据集一般会分为8：2 。百分之80为训练集 百分之20为验证集  下面为解释：

![](https://ps.ssl.qhimg.com/t02ccf9a5e4370064ff.jpg)

这是分配脚本：

[Asm] *纯文本查看*

```
import os
import random
import shutil
import sys
import io

# &#127775; 修复 Windows 终端 GBK 报错和乱码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

def auto_split_dataset(base_path, val_ratio=0.2):
    # 源文件夹（Label Studio 解压出来的原始位置）
    img_source_dir = os.path.join(base_path, 'images')
    lbl_source_dir = os.path.join(base_path, 'labels')

    # 目标文件夹
    img_train_dir = os.path.join(base_path, 'images', 'train')
    img_val_dir = os.path.join(base_path, 'images', 'val')
    lbl_train_dir = os.path.join(base_path, 'labels', 'train')
    lbl_val_dir = os.path.join(base_path, 'labels', 'val')

    # 1. 自动创建好所有的 train 和 val 子文件夹
    for directory in [img_train_dir, img_val_dir, lbl_train_dir, lbl_val_dir]:
        os.makedirs(directory, exist_ok=True)

    if not os.path.exists(img_source_dir) or not os.path.exists(lbl_source_dir):
        print(f"&#10060; 找不到基础的 images 或 labels 目录，请检查解压位置！")
        return

    # 2. 获取所有的图片文件（排除掉文件夹）
    all_images = [f for f in os.listdir(img_source_dir) if os.path.isfile(os.path.join(img_source_dir, f)) and f.endswith(('.png', '.jpg'))]
    total_count = len(all_images)

    if total_count == 0:
        print("&#10060; images 文件夹里没有找到图片！")
        return

    # 3. 打乱顺序
    random.shuffle(all_images)

    # 4. 计算切分点
    val_count = int(total_count * val_ratio)
    val_images = all_images[:val_count]       # 前 20% 给 val
    train_images = all_images[val_count:]     # 剩下 80% 给 train

    print(f"&#128230; 总共有 {total_count} 张图片。")
    print(f"   --> {len(train_images)} 张分配给训练集 (train)")
    print(f"   --> {len(val_images)} 张分配给验证集 (val)\n&#9203; 正在自动分类移动文件...")

    success_count = 0

    # 5. 定义一个移动文件的内部函数
    def move_files(image_list, target_img_dir, target_lbl_dir):
        nonlocal success_count
        for img_name in image_list:
            # 根据图片名推断出 txt 名（不管 Label Studio 加了什么前缀都能匹配）
            txt_name = img_name.replace('.png', '.txt').replace('.jpg', '.txt')

            src_img = os.path.join(img_source_dir, img_name)
            src_lbl = os.path.join(lbl_source_dir, txt_name)

            dst_img = os.path.join(target_img_dir, img_name)
            dst_lbl = os.path.join(target_lbl_dir, txt_name)

            # 确保对应的 txt 文件真的存在
            if os.path.exists(src_lbl):
                shutil.move(src_img, dst_img)
                shutil.move(src_lbl, dst_lbl)
                success_count += 1
            else:
                print(f"&#9888;&#65039; 警告：找不到图片 {img_name} 对应的标签文件 {txt_name}！")

    # 执行移动
    move_files(train_images, img_train_dir, lbl_train_dir)
    move_files(val_images, img_val_dir, lbl_val_dir)

    print(f"&#127881; 搞定！成功将 {success_count} 套图片和标签整理到了 train 和 val 文件夹。")
    print("&#128640; 目录整理完毕，可以直接去运行 train了！")

if __name__ == '__main__':
    DATASET_PATH = r'D:\practise_spider\spiderDemo(calculate_captcha)\dataset'
    auto_split_dataset(DATASET_PATH)
```

你还得创建一个yaml文件 yaml的作用就是负责给 yolo指路。如下

[Asm] *纯文本查看*

```
path: D:/practise_spider/spiderDemo(calculate_captcha)/dataset
train: images/train
val: images/val

nc: 13

# &#9888;&#65039; 必须与 classes.txt 的行号对应 (从 0 开始计数)
names: ['*', '+', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
```

上边所有的准备工作完事了之后 就可以开始训练了

[Asm] *纯文本查看*

```
from ultralytics import YOLO

if __name__ == '__main__':

    model = YOLO('yolov8n.pt')

    results = model.train(
        data='D:/practise_spider/spiderDemo(calculate_captcha)/dataset/data.yaml',
        epochs=300,
        imgsz=320,

        # &#127775; 核心救命参数：绝对不能左右翻转验证码！
        fliplr=0.0,

        # &#127775; 合法的抗噪增强（专治各种孤立噪点）
        erasing=0.4, # 随机在图片上挖掉小色块，逼迫模型不要死记硬背局部特征
        hsv_h=0.015, # 轻微的色彩扰动
        hsv_s=0.7,
        hsv_v=0.4,

        project='D:/practise_spider/spiderDemo(calculate_captcha)',
        name='runs/train_result_scratch',
        workers=0
    )
```

然后 你就会看到控制台会不断的打印训练日志

![](https://ps.ssl.qhimg.com/t02bb3adef0d681c7b9.jpg)

现在你就可以等着 他训练结束了

当然有几个指标比较重要 loss越小越好(小于0.3 或者0.2)  mAP50-95越大越好(0.9+)  如果你的指标正好都符合 那模型训练的差不多了

具体的调用模型识别 yolo识别字 还有字的坐标 和整体的demo 我都放在一个文件了 如下

[Asm] *纯文本查看*

```
import requests
import time
import json
import base64
import os
import sys
import io
import re
from PIL import Image
import shutil
from ultralytics import YOLO
import os
import cv2
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

def get_img_Api():
    headers = {
        "accept": "*/*",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "referer": "https://www.spiderdemo.cn/captcha/cap3_challenge/?challenge_type=cap3_challenge",
        "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
    }
    cookies = {
        "sessionid": "jitlmeznodbjh707v7y3uwqqpz23zm7d"
    }
    url = "https://www.spiderdemo.cn/captcha/api/cap3_challenge/captcha_image/"
    params = {
        "t": int(time.time() * 1000)
    }
    try:
        response = requests.get(url, headers=headers, cookies=cookies, params=params, timeout=10).text
        res = json.loads(response)
        data = res.get('data')
        return data
    except Exception as e:
        print(f"&#10060; 获取接口数据异常: {e}")
        return None

def download_and_save_images(data):
    folder_path = os.path.dirname(os.path.abspath(__file__))
    img_folder_path = os.path.join(folder_path, 'img')

    # 每次获取新的切片前清空旧切片
    if os.path.exists(img_folder_path):
        shutil.rmtree(img_folder_path)
    os.makedirs(img_folder_path, exist_ok=True)

    for index, base64_str in enumerate(data):
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]

        img_name = f'slice_{index + 1}.png'
        img_path = os.path.join(img_folder_path, img_name)

        try:
            img_byte = base64.b64decode(base64_str)
            with open(img_path, "wb") as f:
                f.write(img_byte)
        except Exception as e:
            print(f"&#10060; 第 {index + 1} 张切片保存失败：{e}")

def stitch_images(source_folder, output_path):
    if not os.path.exists(source_folder):
        return False

    all_files = [f for f in os.listdir(source_folder) if f.endswith('.png')]
    if not all_files:
        return False

    def extract_index(filename):
        match = re.search(r'slice_(\d+)\.png$', filename)
        if match:
            return int(match.group(1))
        return 0

    all_files.sort(key=extract_index)

    first_img_path = os.path.join(source_folder, all_files[0])
    try:
        first_img = Image.open(first_img_path)
    except Exception as e:
        return False

    slice_width, slice_height = first_img.size
    first_img.close()

    total_slices = len(all_files)
    total_width = slice_width * total_slices
    total_height = slice_height

    result_canvas = Image.new("RGB", (total_width, total_height), (255, 255, 255))
    current_x_offset = 0

    for filename in all_files:
        img_path = os.path.join(source_folder, filename)
        try:
            with Image.open(img_path) as current_img:
                result_canvas.paste(current_img, (current_x_offset, 0))
                current_x_offset += slice_width
        except Exception:
            pass

    try:
        result_canvas.save(output_path)
        return True
    except Exception:
        return False

def clean_and_save_for_yolo(stitched_image_path, save_path):
    """完全使用你原版的 OpenCV 预处理逻辑，不做任何额外修改"""
    if not os.path.exists(stitched_image_path):
        return False

    img = cv2.imread(stitched_image_path)
    if img is None:
        return False

    # 转为灰度图
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 二值化
    _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)

    # 连通域分析
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh, connectivity=8)
    clean_thresh = np.zeros_like(thresh)

    # 遍历并过滤
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area > 1.8:  # 还原你代码里的过滤参数
            clean_thresh[labels == i] = 255

    # 颜色反转回白底黑字
    clean_img = cv2.bitwise_not(clean_thresh)

    # 直接保存，不再进行放大和膨胀
    cv2.imwrite(save_path, clean_img)
    return True

def get_final_result(model_path, img_path):
    # 1. 加载模型
    model = YOLO(model_path)

    # 2. 推理（设置 verbose=False 让控制台干净点）
    results = model.predict(source=img_path, conf=0.25, verbose=False)

    # 用于存放 (x坐标, 字符内容) 的临时列表
    temp_list = []

    # 3. 提取每个框的 x 坐标和对应的类名
    for box in results[0].boxes:
        # box.xyxy[0][0] 就是该目标的左上角 x 坐标
        x_min = float(box.xyxy[0][0])
        # 获取类别 ID
        cls_id = int(box.cls[0])
        # 获取对应的字符（比如 '2', '0', '*', '5'）
        char = model.names[cls_id]

        temp_list.append((x_min, char))

    # &#127775; 4. 最关键的一步：按照 x 坐标从小到大排序
    # 这样 [ (5.2, '2'), (20.1, '0'), (35.5, '*'), (50.8, '5') ] 就会排好序
    temp_list.sort(key=lambda x: x[0])

    # 5. 拼接成最终的算式字符串
    equation = "".join([item[1] for item in temp_list])

    print(f"&#9989; 排序后的算式: {equation}")

    # 6. 计算结果
    try:
        # 处理可能的乘号替换（如果你的标签是 x 就换成 *）
        final_formula = equation.replace('x', '*')
        ans = eval(final_formula)
        print(f"&#127881; 最终计算结果: {final_formula} = {ans}")
        return ans
    except Exception as e:
        print(f"&#10060; 算式拼接有误，无法计算: {equation}")
        return None

if __name__ == "__main__":
    folder_path = os.path.dirname(os.path.abspath(__file__))
    img_src_folder = os.path.join(folder_path, 'img')
    temp_whole_image = os.path.join(folder_path, 'temp_whole_captcha.png')

    # &#127775; 每次运行前清空并重新创建 clean_whole_img 文件
    clean_folder = os.path.join(folder_path, 'clean_whole_img')
    if os.path.exists(clean_folder):
        shutil.rmtree(clean_folder)
        print("&#129529; 已彻底清空旧的 clean_whole_img 文件夹及内部数据...")
    os.makedirs(clean_folder, exist_ok=True)
    print("&#128193; 创建全新的 clean_whole_img 文件夹成功...")

    data = get_img_Api()
    if data:
        download_and_save_images(data)

        if stitch_images(img_src_folder, temp_whole_image):
            unique_filename = f"clean_{int(time.time() * 1000)}.png"
            final_save_path = os.path.join(clean_folder, unique_filename)

        clean_and_save_for_yolo(temp_whole_image, final_save_path)

    print(f"&#128193; 请前往文件夹查看：{clean_folder}")

    # 1. 找到你刚训练的大脑 (best.pt 的绝对路径)
    # 注意：请根据你实际生成的路径核对一下，一般在 runs/train_result/weights/best.pt
    model_path = r'D:\practise_spider\spiderDemo(calculate_captcha)\runs\train_result_scratch3\weights\best.pt'

    # 2. 从验证集里随便挑一张图来测试 (填入一张 val 文件夹里的图片路径)
    # 把这里的图片名换成你 val 文件夹里真实存在的一张图片
    test_image_path = clean_folder

    if not os.path.exists(model_path):
        print(f"&#10060; 找不到权重文件，请检查路径: {model_path}")
        exit()

    print("&#9203; 正在加载模型并预测...")
    model = YOLO(model_path)

    # 3. 进行预测
    # save=True 表示会把画好框的图片保存下来
    # conf=0.25 表示只显示置信度大于 25% 的预测结果
    results = model.predict(source=test_image_path, save=True, conf=0.25)

    print("&#127881; 预测完成！")
    # 打印模型认出来的字符
    for result in results:
        boxes = result.boxes
        for box in boxes:
            # 获取类别索引并转成具体的字符名字
            cls_id = int(box.cls[0])
            char_name = model.names[cls_id]
            print(f"发现目标: {char_name}, 置信度: {float(box.conf[0]):.2f}")

    # 调用示例
    get_final_result(model_path, test_image_path)
```

最后贴一下识别成功的照片

![](https://ps.ssl.qhimg.com/t029cfce91ff7eca54b.jpg)

![](https://ps.ssl.qhimg.com/t0228cdf3dc4279ef8e.jpg)

拜拜大家
最后祝大家不要爱错o~

我爱你们！！！
