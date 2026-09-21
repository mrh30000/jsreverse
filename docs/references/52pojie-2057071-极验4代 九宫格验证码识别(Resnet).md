# 极验4代 九宫格验证码识别(Resnet)

> **作者**: Command | **发布时间**: 2025-08-31 22:38:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4905 / 19
> **原文**: [https://www.52pojie.cn/thread-2057071-1-1.html](https://www.52pojie.cn/thread-2057071-1-1.html)

---

*本帖最后由 Command 于 2025-8-31 22:37 编辑*

### 前言

![](https://attach.52pojie.cn/forum/202508/31/223409uqwnhqnms4aslv9g.png)

对于这种验证码, 第一眼看是不是毫无办法? 使用一般的轮廓识别/相似度比较已经不奏效了, 那怎么办呢? 经过长时间的搜索(~~Github~~), 我**找到(并非自创)**了这样一种解决办法(后续代码有一部分借鉴https://github.com/taisuii/ClassificationCaptchaOcr):

1. 首先将小图标和九宫格切分开, 统一进行resize和标准化
2. 使用**ResNet18**进行特征提取, 从每张图中提取出特征向量
3. 提取出特征之后再将九宫格中每张图片的特征与小图标进行比较, 选出前三个最相似的位置作为答案

### 准备数据集

#### 下载

数据集我们需要约500张图(分割后的大图与小图标)下载到一个文件夹中, 这里就不说怎么获取图了, 只说一下怎么把九宫格图片分割成九张小图

```
from io import BytesIO
from PIL import Image

# 切割顺序，这里是从左到右，从上到下[x,y]
coordinates = [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]]
def crop_image(image_bytes, coordinates):
   img = Image.open(BytesIO(image_bytes))
   width, height = img.size
   grid_width = width // 3
   grid_height = height // 3
   cropped_images = []
   for coord in coordinates:
       y, x = coord
       left = (x - 1) * grid_width
       upper = (y - 1) * grid_height
       right = left + grid_width
       lower = upper + grid_height
       box = (left, upper, right, lower)
       cropped_img = img.crop(box)
       cropped_images.append(cropped_img)
   return cropped_images
```

还需要对下载的小图进行去重 (部分下载的图片有重复)

```
import os
import hashlib

def file_md5(file_path):
    """计算文件的 MD5 值"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def deduplicate_by_content(folder_path):
    seen = {}
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            file_hash = file_md5(file_path)
            if file_hash in seen:
                print(f"删除重复文件: {file_path}")
                os.remove(file_path)
            else:
                seen[file_hash] = file_path

# 对xxx文件夹下的文件进行去重
deduplicate_by_content(r"xxx")
```

#### 标注

接下来新建一个文件夹, 这个文件夹应该为如下目录结构

```
datasets (当前文件夹)
├── images (此文件夹存储小图标)
├── outputs (此文件夹用于存放标注好的图标, 完成后内部会有很多文件夹)
├── Tool.py (我制作的标注工具, 一会给出代码)
```

其中`Tool.py`的内容如下:

```
import tkinter as tk
import os
from PIL import Image, ImageTk

def main():
    # 创建Tkinter窗口
    root = tk.Tk()
    root.title("显示图片")
    PC = [0]
    Ls = os.listdir('images')

    # 加载图片
    image1 = Image.open('images/' + Ls[PC[0]])
    image = ImageTk.PhotoImage(image1)

    # 创建Label小部件并显示图片
    label = tk.Label(image=image)
    label.pack()
    input_label = tk.Label(root, text="Input")
    input_label.pack()
    entry = tk.Entry(root)
    entry.pack()
    e = tk.Label(root, text="")
    e.pack()

    # submit
    def submit(*args):
        nonlocal image1
        P = entry.get()
        entry.delete(0, tk.END)
        if P:
            pass
        else:
            return
        if os.path.exists('outputs/' + P):
            pass
        else:
            os.mkdir('outputs/' + P)
        image1.save('outputs/' + P + '/' + Ls[PC[0]])
        PC[0] += 1
        image1 = Image.open('images/' + Ls[PC[0]])
        image = ImageTk.PhotoImage(image1)
        label.config(image=image)
        label.image = image
        e.config(text=Ls[PC[0]])

    submit_button = tk.Button(root, text="提交", command=submit)  # 创建按钮，点击时调用get_input函数
    entry.bind("<Return>", submit)
    submit_button.pack()
    # 进入Tkinter事件循环
    root.mainloop()

if __name__ == "__main__":
    main()
```

这个工具内部有一个输入框和一个按钮, 显示图片后你需要给同类图片给打上一样的标签, 然后按下回车或者按钮就会自动保存并接着下一张, 在全部标注完, 没有剩余图片时会报错

### 训练

使用**Python**安装上`torch, torchvision, tqdm, numpy, onnxruntime`, 这里的安装过程不再赘述, 在dateset文件夹的**同级目录**创建一个py文件和一个**model**文件夹, 写入如下内容并执行:

```
import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder
from tqdm import tqdm
import torch
import torchvision
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np

# 定义数据转换
data_transform = transforms.Compose(
   [
       transforms.Resize((224, 224)),  # 调整图像大小
       transforms.ToTensor(),  # 将图像转换为张量
       transforms.Normalize(
           (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)
       ),  # 标准化图像
   ]
)

# 定义数据集
class CustomDataset:
   def __init__(self, data_dir):
       self.dataset = ImageFolder(root=data_dir, transform=data_transform)

   def __len__(self):
       return len(self.dataset)

   def __getitem__(self, idx):
       image, label = self.dataset[idx]
       return image, label

class MyResNet18(torch.nn.Module):
   def __init__(self, num_classes):
       super(MyResNet18, self).__init__()
       self.resnet = torchvision.models.resnet18(pretrained=True)
       self.resnet.fc = nn.Linear(512, num_classes)  # 修改这里的输入大小为512

   def forward(self, x):
       return self.resnet(x)

def train(epoch):
   device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
   data_dir = "dataset"
   # 自定义数据集实例
   custom_dataset = CustomDataset(data_dir)
   # 数据加载器
   batch_size = 64
   data_loader = DataLoader(custom_dataset, batch_size=batch_size, shuffle=True)

   # 初始化模型 num_classes就是目录下的子文件夹数目，每个子文件夹对应一个分类，模型输出的向量长度也是这个长度
   model = MyResNet18(num_classes=91)
   model.to(device)

   # 损失函数
   criterion = torch.nn.CrossEntropyLoss()
   # 优化器
   optimizer = torch.optim.SGD(model.parameters(), lr=0.001, momentum=0.9)

   # 训练模型
   for i in range(epoch):
       losses = []

       # 迭代器进度条
       data_loader_tqdm = tqdm(data_loader)

       for inputs, labels in data_loader_tqdm:
           # 将输入数据和标签传输到指定的计算设备（如 GPU 或 CPU）
           inputs, labels = inputs.to(device), labels.to(device)

           # 梯度更新之前将所有模型参数的梯度置为零，防止梯度累积
           optimizer.zero_grad()

           # 前向传播：将输入数据传入模型，计算输出
           outputs = model(inputs)

           # 根据模型的输出和实际标签计算损失值
           loss = criterion(outputs, labels)

           # 将当前批次的损失值记录到 losses 列表中，以便后续计算平均损失
           losses.append(loss.item())
           epoch_loss = np.mean(losses)
           data_loader_tqdm.set_description(
               f"This epoch is {i} and it's loss is {loss.item()}, average loss {epoch_loss}"
           )
           # 反向传播：根据当前损失值计算模型参数的梯度
           loss.backward()
           # 使用优化器更新模型参数，根据梯度调整模型参数
           optimizer.step()
       # 每过一个batch就保存一次模型
       torch.save(model.state_dict(), f'model/my_resnet18_{epoch_loss}.pth')
   print(f"completed. Model saved.")
if __name__ == '__main__':
   train(50)
```

待提示`completed. Model saved.`时即为训练成功, **model**里**最近的**模型文件就是训练好的模型

#### pth转为onnx

执行如下代码

```
from resnet18 import MyResNet18
import torch

def convert():
    # 加载 PyTorch 模型
    model_path = "model/改成你模型的文件名.pth"
    model = MyResNet18(num_classes=91)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    # 生成一个示例输入
    dummy_input = torch.randn(10, 3, 224, 224)
    # 将模型转换为 ONNX 格式
    torch.onnx.export(model, dummy_input, "model/resnet18.onnx", verbose=True)

if __name__ == '__main__':
    convert()
```

#### 使用

```
from PIL import Image
from io import BytesIO
import onnxruntime as ort
import numpy as np
# Resnet
class Resnet:
    def __init__(self, ModelPath: str):
        self.Session = ort.InferenceSession(ModelPath)
        self.InputName = self.Session.get_inputs()[0].name

    def cosine_similarity(self, vec1, vec2):
        # 将输入转换为 NumPy 数组
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        # 计算点积
        dot_product = np.dot(vec1, vec2)
        # 计算向量的范数
        norm_vec1 = np.linalg.norm(vec1)
        norm_vec2 = np.linalg.norm(vec2)
        # 计算余弦相似度
        similarity = dot_product / (norm_vec1 * norm_vec2)
        return similarity

    def data_transforms(self, image):
        image = image.resize((224, 224))
        image_array = np.array(image)
        image_array = image_array.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        image_array = (image_array - mean) / std
        image_array = np.transpose(image_array, (2, 0, 1))
        return image_array

    # 识别
    def classification(self, BG: bytes, Icon: bytes):
        coordinates = [
            [1, 1],
            [1, 2],
            [1, 3],
            [2, 1],
            [2, 2],
            [2, 3],
            [3, 1],
            [3, 2],
            [3, 3],
        ]
        Icon = self.convert_png_to_jpg(Icon)
        target_images = []
        target_images.append(self.data_transforms(Image.open(BytesIO(Icon))))

        bg_images = self.crop_image(BG, coordinates)

        for bg_image in bg_images:
            target_images.append(self.data_transforms(bg_image))

        start = time.time()
        outputs = self.Session.run(None, {self.InputName: target_images})[0]

        scores = []
        for i, out_put in enumerate(outputs):
            if i == 0:
                target_output = out_put
            else:
                similarity = self.cosine_similarity(target_output, out_put)
                scores.append(similarity)
        # 从左到右，从上到下，依次为每张图片的置信度
        # print(scores)
        # 对数组进行排序，保持下标
        indexed_arr = list(enumerate(scores))
        sorted_arr = sorted(indexed_arr, key=lambda x: x[1], reverse=True)
        # 提取最大三个数及其下标
        largest_three = sorted_arr[:3]
        answer = [coordinates[i[0]] for i in largest_three]
        return answer

    def convert_png_to_jpg(self, png_bytes: bytes) -> bytes:
        # 将传入的 bytes 转换为图像对象
        png_image = Image.open(BytesIO(png_bytes))

        # 创建一个 BytesIO 对象，用于存储输出的 JPG 数据
        output_bytes = BytesIO()

        # 检查图像是否具有透明度通道 (RGBA)
        if png_image.mode == 'RGBA':
            # 创建白色背景
            white_bg = Image.new("RGB", png_image.size, (255, 255, 255))
            # 将 PNG 图像粘贴到白色背景上，透明部分用白色填充
            white_bg.paste(png_image, (0, 0), png_image)
            jpg_image = white_bg
        else:
            # 如果图像没有透明度，直接转换为 RGB 模式
            jpg_image = png_image.convert("RGB")

        # 将转换后的图像保存为 JPG 格式到 BytesIO 对象
        jpg_image.save(output_bytes, format="JPEG")

        # 返回保存后的 JPG 图像的 bytes
        return output_bytes.getvalue()

    def crop_image(self, image_bytes, coordinates):
        img = Image.open(BytesIO(image_bytes))
        width, height = img.size
        grid_width = width // 3
        grid_height = height // 3
        cropped_images = []
        for coord in coordinates:
            y, x = coord
            left = (x - 1) * grid_width
            upper = (y - 1) * grid_height
            right = left + grid_width
            lower = upper + grid_height
            box = (left, upper, right, lower)
            cropped_img = img.crop(box)
            cropped_images.append(cropped_img)
        return cropped_images

ResnetONNX = Resnet('我是模型.onnx')
ResnetONNX.classification(b'九宫格Bytes', b'小图标Bytes') # 返回结果即为图片位置, 例如: [[1, 2], [1, 3], [3, 1]]
```

#### 碎碎念

这个教程, 应该相当的简单易懂了 ...吧?

明天就要过上两周才放假一次的生活了...... 啊啊啊啊啊啊......
