# 【Web逆向】智慧酒店-滑块底图还原

> **作者**: epiphanyep | **发布时间**: 2026-03-05 16:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3444 / 28
> **原文**: [https://www.52pojie.cn/thread-2094667-1-1.html](https://www.52pojie.cn/thread-2094667-1-1.html)

---

*本帖最后由 epiphanyep 于 2026-3-22 16:52 编辑*

hello 大家！ 今天给大家带来滑块底图还原问题 目标网站 aHR0cHM6Ly9ob3RlbC5vY3l1YW4uY29tL2xvZ2lu

先来讲底图还原的思路吧：

当我们遇到滑块的背景图片是乱序的 如下图所示

![](https://i.postimg.cc/3rpkW5DN/image.png)

第一步应该在 开发者工具中找到事件断点 在canvas标签上打上断点 如下图

![](https://i.postimg.cc/MZbzhWQt/image.png)

然后刷新滑块图片，此时程序就会断住 canvas.getContext('2d',x)

![](https://i.postimg.cc/XJktDYzd/image.png)

第二步就是跟栈 找一个大数组 这个大数组存放着一堆数字 他是用来存储背景图还原小图片的正确还原顺序

所以我们只要找到能够生成大数组的关键函数 把函数扣到本地进行动态生成数组就行

第三步 观察乱序背景图被分割成多少小图片
例如本案例就是被分成了26x2组 也就是2行26列 然后再看一下正常背景图大小是长宽多少像素的
把这些照片信息喂给ai 让ai给我们生成还原算法 把本地乱序背景图还原。 例如：

![](https://i.postimg.cc/SR12tLsr/image.png)

因为这个网站他的数组是接口直接返回的 所以不用麻烦跟栈找产生的地方了
直接如上丢给ai生成就行了

底图还原思路就这些 接下来开始分析接口吧

主要是三个有用的 getVerify getQuestion collectData

![](https://i.postimg.cc/ydsx839g/image.png)

先分析verify吧

载荷没啥说的 来看响应：

![](https://i.postimg.cc/ZRwNkxgd/image.png)

verifyId：用于后面接口请求参数
challenge：用于后面接口请求参数

再看getQuestion

载荷：

![](https://i.postimg.cc/s2DSTL6w/image.png)

callback：verify+13位时间戳
verifyId：前面接口响应
challenge：前面接口响应

响应：

![](https://i.postimg.cc/NMRgms6z/image.png)

publicKey：像是RSA公钥 猜测后续可能用到了RSA加密
shuffle ：这个就是前面提到的大数组(不同网站名字不同)
bgUrl 和 sliceUrl ：背景图片 和 滑块图片 地址

最后看collectData

载荷

![](https://i.postimg.cc/Ls3nvz2x/image.png)

collectData 和 key 是今天的重中之重

响应

![](https://i.postimg.cc/hPQvNFKS/image.png)

滑块验证成功 success 为 true 失败为 false

接口分析完毕

开始逆向collectData 和 key

因为代码是混淆的 所以关键词搜搜不好使 我是通过跟栈的方式找到生成这两个参数的地方 见下图

![](https://i.postimg.cc/7YZdLD5Z/image.png)

生成参数的方式是 一个函数传递了两个参数

第一个参数如图 他的生成位置在上边

![](https://i.postimg.cc/JhrBfTTp/image.png)

第二个参数预执行发现他是之前接口返回的publicKey

![](https://i.postimg.cc/zfzdGYDS/image.png)

现在就可以只分析第一个参数了

双击参数\_0x45d877 后面我叫x1 发现参数x1是在上边生成的

![](https://i.postimg.cc/gctQnJ1B/image.png)

仔细观察就可以发现x1 是由一个函数传参生成的 第一个参数是window 和 第二个参数是一个函数f1

先看第二个参数吧  这个f1函数最后有一个return 我们先来看看return返回的值

![](https://i.postimg.cc/kGkB4CxS/image.png)

如果各位对这种数据足够敏感 应该能发现这其实就是把轨迹数据做了调整

x 与 y 多填了小数点后两个0    t还是t  然后整体数据变成字符串类型

每次return 一组数据 最终全部拼接到一起

![](https://i.postimg.cc/9XSpTq15/image.png)

window先不用管  再看外面的函数\_0x520183[\_0x2f6ef0(0x38a)]  打断点进去也全是混淆的

我觉得看的太麻烦了 于是直接把整个文件代码复制到 <https://webcrack.netlify.app/> 这个网站一键解混淆

解完混淆再分析比较好 看着比之前舒服

这是函数\_0x520183[\_0x2f6ef0(0x38a)] 进入之后

![](https://i.postimg.cc/HxkqJ7zx/image.png)

解混淆之后

![](https://i.postimg.cc/zXwYc5yG/image.png)

直接把这段丢给ai  再扣一些比较重要的函数 例如makeUserBrowInfro  更他更好的分析还原代码

再分析下面

![](https://i.postimg.cc/Tw45FF3D/image.png)

这个函数里面其实就实现了 collectData 和 key 的生成(其实通过解混淆后的代码 直接关键词搜索能直接出来)

![](https://i.postimg.cc/kgJ8VxzN/image.png)

collectData 也是有一个函数传递两个参数产生的 第一个参数是我们刚刚还原的函数返回值 第二个参数是getkey函数(在上边有)

getkey打断点进入后 扣代码给ai还原 这个逻辑还是比较简单的

![](https://i.postimg.cc/0Q8hFXBq/image.png)

最后就是\_0xf3a3a7[\_0x17ce5f(0x5a0)] 函数

看解混淆网站里的代码如下图

![](https://i.postimg.cc/j5w3pVhT/image.png)

这明显是AES加密 但是注意 这里 mode 是CTR模式 padding是 nopadding   但是我第一次做的时候没注意这还能有问题 在网上看大佬是这么说的，但是他也没解释为什么是这样的

如果有大佬会的话 请教教我！！！![](https://static.52pojie.cn/static/image/smiley/default/4.gif)![](https://static.52pojie.cn/static/image/smiley/default/17.gif)

AES做完 collectData 参数就完事了

剩下的key 比较简单 进入函数内部一个RSA算法 让ai 还原一下就可以了

到此 逆向部分结束了。

--------------------------------------------------------------------

滑块部分的话 我用的ddddocr 最后校验成功率非常低 大概五次能出一次  我换了opencv后成功率更低了 十次能有一次就不错了

我还不知道怎么能提升成功率 希望有大佬看见能点拨点拨我![](https://static.52pojie.cn/static/image/smiley/default/4.gif)![](https://static.52pojie.cn/static/image/smiley/default/40.gif)

下面是代码

[Asm] *纯文本查看*

```
import requests
import json
import time
import os
from PIL import Image
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import base64
import random
import ddddocr
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import zlib

ocr = ddddocr.DdddOcr()

def get_verifyId_Api():

    headers = {
        "accept": "*/*",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json; charset=utf-8",
        "csrf-token": "YFnyRfcr-p3W0PR7jvKKf5wKnESNmLWsLQ6c",
        "origin": "https://hotel.ocyuan.com",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "referer": "https://hotel.ocyuan.com/login",
        "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        "x-b3-flags;": "",
        "x-b3-parentspanid;": "",
        "x-b3-sampled;": "",
        "x-b3-spanid;": "",
        "x-b3-traceid;": "",
        "x-ot-span-context;": "",
        "x-request-id;": "",
        "x-requested-with": "XMLHttpRequest",
        "x-ty-referer": "/login"
    }
    cookies = {
        "gTyPlatLang": "zh",
        "locale": "zh",
        "_tpmGuid": "TY-0871fb7ffb49af45",
        "router-prefix": "",
        "fast-sid": "EDyWUu28AUElbspl2tl_bhGL3QvvsWWB",
        "_tpmSeqId": "seq_id_133e83dd48975b52",
        "csrf-token": "aNHbODyK-md7zx-7h6oeB8bY5RgJTA72zbXc",
        "csrf-token.sig": "fX70oPd98V__elO0LIZKAM0pK9Q"
    }
    url = "https://hotel.ocyuan.com/api/v2/geeVerify"
    data = {
        "clientType": "web_view",
        "lang": "zh",
        "user_id": "8ea39641-396c-4ed2-b4fe-e385d6f00edd"
    }
    data = json.dumps(data, separators=(',', ':'))
    response = requests.post(url, headers=headers, cookies=cookies, data=data).text
    verifyId = json.loads(response).get("result", {}).get("verifyId", "")
    challenge = json.loads(response).get("result", {}).get("challenge", "")
    return verifyId, challenge

def getQuestion_Api(verifyId,challenge):

    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "origin": "https://hotel.ocyuan.com",
        "priority": "u=1, i",
        "referer": "https://hotel.ocyuan.com/",
        "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    }
    url = "https://captcha.tuyacn.com/verify/v1/getQuestion"
    data = {
        "type": 1,
        "verifyId": verifyId,
        "challenge": challenge,
        "callback": f"verify_{int(time.time() * 1000)}"
    }
    print('callback____',data['callback'])
    data = json.dumps(data, separators=(',', ':'))
    response = requests.post(url, headers=headers, data=data).text
    print('response',response)
    result = json.loads(response).get("result", {})
    print('result++++',result)
    bgUrl = 'https://images.tuyacn.com/' + result.get('bgUrl', '')
    sliceUrl = 'https://images.tuyacn.com/' + result.get('sliceUrl', '')
    shuffle_str = result.get('shuffle', [])
    publicKey = result.get('publicKey', '')
    shuffle = json.loads(shuffle_str)
    return bgUrl, sliceUrl, shuffle, publicKey

def download_image(url, filename):
    response = requests.get(url)
    with open(filename, 'wb') as f:
        f.write(response.content)

def restore_bg(bg_path, shuffle_list, save_path="restored.png"):
    """
    根据 shuffle 数组还原滑块底图
    """
    if not os.path.exists(bg_path):
        print(f"&#10060; 文件不存在: {bg_path}")
        return None

    img_src = Image.open(bg_path)
    width, height = img_src.size

    total_slices = len(shuffle_list)
    slice_count_per_row = total_slices // 2
    slice_width = width // slice_count_per_row
    half_height = height // 2

    img_dest = Image.new('RGB', (width, height))

    for i in range(total_slices):
        src_x = (i % slice_count_per_row) * slice_width
        src_y = half_height if i >= slice_count_per_row else 0

        slice_img = img_src.crop((src_x, src_y, src_x + slice_width, src_y + half_height))

        # 转换为整数（此时 shuffle_list 已是纯数字列表）
        target_idx = int(shuffle_list[i])

        dest_x = (target_idx % slice_count_per_row) * slice_width
        dest_y = half_height if target_idx >= slice_count_per_row else 0

        img_dest.paste(slice_img, (dest_x, dest_y))

    img_dest.save(save_path)
    print(f"&#9989; 图片已还原并保存至: {save_path}")
    return img_dest

def get_x(restored_image_path, slice_image_path):
    with open(restored_image_path, 'rb') as f:
        bg_bytes = f.read()
    with open(slice_image_path, 'rb') as f:
        slice_bytes = f.read()
    res = ocr.slide_match(slice_bytes, bg_bytes)
    x_pos = res.get("target")
    return x_pos[0]

def generate_slider_track(distance):
    """
    生成仿真滑块轨迹
    :param distance: 需要移动的目标距离 (例如: 190)
    :return: 轨迹列表 [[x, y, t], ...]
    """
    track = []
    current = 0 # 当前位移 X
    mid = distance * 4 / 5 # 减速阈值，通常在总距离的 4/5 处开始减速
    t = random.randint(50, 80) # 起始时间戳（模拟从按下鼠标到开始移动的反应时间）
    v = 0 # 初始速度

    # Y轴起始位置 (参考数据，大多在 190-202 之间)
    start_y = random.randint(198, 202)
    current_y = start_y

    track.append([0, start_y, t])

    while current < distance:
        # 1. 计算加速度 a
        if current < mid:
            # 加速阶段：加速度为正 (参考数据：2 ~ 4 之间波动)
            a = 2 + random.random() * 2
        else:
            # 减速阶段：加速度为负
            a = -3 - random.random() * 2

        # 2. 物理运动学公式
        # v0: 初速度
        v0 = v
        # 当前移动是一个极短的时间片段，这里设定基础时间单位 T
        # 实际上我们通过调整 v 和 a 来计算位移
        v = v0 + a * 0.2 # 0.2 是一个经验系数，代表时间片

        # 位移公式 x = v0*t + 0.5*a*t^2
        move = v0 * 0.2 + 0.5 * a * (0.2 ** 2)

        # 3. 修正逻辑
        # 防止后退过多（虽然真实人手会后退，但简单算法通常限制非大幅回退）
        if move < 0.5 and current < mid:
             move = random.uniform(0.5, 1.5)

        current += move

        # 如果超出距离，则修正（避免大幅过冲）
        if current > distance + 2:
            current = distance + random.uniform(-1, 1)

        # 4. 生成 Y 轴抖动
        # 分析数据发现 Y 轴通常会微小浮动，且有一定向下漂移趋势
        # 随机选择 -1, 0, 1，稍微倾向于向下(-1)
        if random.random() < 0.3: # 30%的概率发生Y轴变动
            y_change = random.choice([-1, 0, 0, 1])
            current_y += y_change
            # 限制 Y 轴偏离幅度，避免画出太离谱的线
            if abs(current_y - start_y) > 5:
                current_y -= y_change

        # 5. 生成时间戳
        # 加速阶段时间间隔短，减速阶段时间间隔长
        if current < mid:
            t += random.randint(6, 12) # 快速滑动中
        else:
            t += random.randint(15, 25) # 接近终点，变慢

        # 取整并保存
        track.append([int(current), int(current_y), int(t)])

        # 到达目标附近停止循环
        if current >= distance:
            break

    # 6. 末端轨迹修正（模拟对准和松手延迟）
    # 参考数据：最后几个点经常 X 轴几乎不变，但 Time 大幅增加
    final_x = int(current)
    final_y = int(current_y)

    # 补充 2-3 个微调点，模拟停顿
    for _ in range(random.randint(2, 4)):
        t += random.randint(100, 200) # 大幅增加时间，模拟人眼确认和松手延迟
        # X 轴微动 0 或 1
        final_x += random.choice([0, 0, 1])
        # Y 轴微动
        final_y += random.choice([0, -1, 1])
        track.append([final_x, final_y, t])

    return track

def get_key(length: int) -> str:
    """
    生成指定长度的随机字符串
    字符池：数字0-9 + 大写字母A-Z，与原JS逻辑一致（排除索引0，不会生成字符'0'）
    :param length: 生成字符串的长度
    :return: 随机字符串
    """

    char_pool = [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
        "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
        "U", "V", "W", "X", "Y", "Z"
    ]
    result = ""

    for _ in range(length):

        random_index = random.randint(1, 35)
        result += char_pool[random_index]
    return result

def format_trajectory(trajectory_list):
    """
    将 [[x, y, t], ...] 格式的轨迹转换为 ["x.00,y.00,t", ...] 字符串列表
    """
    formatted_result = []

    for point in trajectory_list:
        x, y, t = point
        item_str = f"{x:.2f},{y:.2f},{t}"
        formatted_result.append(item_str)

    return formatted_result

class SliderPacketBuilder:
    def __init__(self):
        self.counts = 0
        self.maxlen = 251
        self.track_max_len_bytes = 252
        self.track_max_len_bits = self.track_max_len_bytes * 8

    def int_to_bit_list(self, num, bit_count=8):
        """数值转Bit数组，模拟JS intToByteList"""
        num = int(num)
        binary_str = bin(abs(num))[2:]
        bit_list = [int(b) for b in binary_str]
        if len(bit_list) < bit_count:
            padding = [0] * (bit_count - len(bit_list))
            bit_list = padding + bit_list
        return bit_list[:bit_count]

    def string_to_bit_list(self, s):
        """字符串转Bit数组"""
        bits = []
        for char in s:
            bits.extend(self.int_to_bit_list(ord(char), 8))
        return bits

    def byte_list_2_uint8_array(self, bit_list):
        """Bit数组转Bytes"""
        byte_array = bytearray()
        remainder = len(bit_list) % 8
        if remainder != 0:
            bit_list = bit_list + [0] * (8 - remainder)
        for i in range(0, len(bit_list), 8):
            chunk = bit_list[i:i+8]
            byte_val = 0
            for bit in chunk:
                byte_val = (byte_val << 1) | bit
            byte_array.append(byte_val)
        return bytes(byte_array)

    def buf_checksum(self, data_bytes):
        """CRC32校验"""
        return zlib.crc32(data_bytes) & 0xFFFFFFFF

    def list_composite(self, current_bits, tag, data_str):
        """
        [修正] 封装格式必须是: [Tag 1] [Length] [Tag 2] [Data]
        Length = DataLen + 3
        """
        # 1. Outer Tag (Tag 1)
        segment = self.int_to_bit_list(1, 8)

        # 2. Length Calculation
        # 公式推导：DataLen + 1(Tag2) + 2(HeaderOverhead) = DataLen + 3
        length_val = len(data_str) + 3
        segment.extend(self.int_to_bit_list(length_val, 8))

        # 3. Inner Tag (Tag 2, passed as arg)
        segment.extend(self.int_to_bit_list(tag, 8))

        # 4. Data
        segment.extend(self.string_to_bit_list(data_str))

        return current_bits + segment

    def make_user_browser_info(self, browser_data):
        bits = []
        # 顺序必须严格一致
        bits = self.list_composite(bits, 2, browser_data['userAgent'])
        bits = self.list_composite(bits, 2, browser_data['windowSize'])
        bits = self.list_composite(bits, 2, browser_data['url'])
        bits = self.list_composite(bits, 2, browser_data['isF12'])
        bits = self.list_composite(bits, 2, browser_data['isHeadless'])
        bits = self.list_composite(bits, 2, browser_data['timestamp'])

        self.counts += 6
        return bits

    def _pack_chunk(self, chunk_bits):
        """
        [修正] 轨迹分片也遵循同样的封装逻辑
        """
        packed = []
        # Tag 1
        packed.extend(self.int_to_bit_list(1, 8))

        # Length: Bytes of Chunk + 3
        chunk_byte_len = len(chunk_bits) // 8
        length_val = chunk_byte_len + 3
        packed.extend(self.int_to_bit_list(length_val, 8))

        # Tag 2
        packed.extend(self.int_to_bit_list(2, 8))

        # Data
        packed.extend(chunk_bits)

        self.counts += 1
        return packed

    def make_track(self, track_list):
        final_bits = []
        if not track_list:
            return final_bits

        current_chunk_bits = []
        bits_budget = self.track_max_len_bits

        for i, point_str in enumerate(track_list):
            point_bits = self.string_to_bit_list(point_str)
            point_len_bits = len(point_bits)

            if point_len_bits > self.track_max_len_bits:
                continue

            cost = point_len_bits
            if len(current_chunk_bits) > 0:
                cost += 8 # '|'

            if cost > bits_budget:
                final_bits.extend(self._pack_chunk(current_chunk_bits))
                current_chunk_bits = []
                bits_budget = self.track_max_len_bits
                current_chunk_bits.extend(point_bits)
                bits_budget -= point_len_bits
            else:
                if len(current_chunk_bits) > 0:
                    current_chunk_bits.extend(self.string_to_bit_list("|"))
                    bits_budget -= 8

                current_chunk_bits.extend(point_bits)
                bits_budget -= point_len_bits

                if i == len(track_list) - 1:
                    final_bits.extend(self._pack_chunk(current_chunk_bits))

        return final_bits

    def buffer_builder(self, browser_data, track_list):
        self.counts = 0

        # 生成 Payload
        payload_bits = []
        payload_bits.extend(self.make_user_browser_info(browser_data))
        payload_bits.extend(self.make_track(track_list))

        # 生成 Header
        header_bits = []
        header_bits.extend(self.int_to_bit_list(1, 8)) # Ver
        header_bits.extend(self.int_to_bit_list(min(self.counts, self.maxlen), 8)) # Counts

        # Checksum
        payload_bytes = self.byte_list_2_uint8_array(payload_bits)
        checksum_val = self.buf_checksum(payload_bytes)
        header_bits.extend(self.int_to_bit_list(checksum_val, 32))

        # 组合
        final_bits = header_bits + payload_bits

        final_byte_array = self.byte_list_2_uint8_array(final_bits)

        # Base64 编码
        return base64.b64encode(final_byte_array).decode('utf-8')

import base64
import random
import string
from Crypto.Cipher import AES
from Crypto.Util import Counter

def aes_encrypt(data_to_encrypt: str, secret_key_str: str) -> str:
    # 1. 密钥解析为 bytes (对应 _0x1e4ffe.default.parse(_0x5753eb))
    key_bytes = secret_key_str.encode('utf-8')

    # 2. 生成 16 位随机 IV 并解析为 bytes (对应 this.getKey(16) 和解析)
    iv_str = get_key(16)
    iv_bytes = iv_str.encode('utf-8')

    # 3. 配置 CTR 模式 (对应模式更改，CTR 天生 NoPadding，直接省略 Padding 配置)
    # 将 16 字节的 IV 转换为大端整数作为 CTR 的计数器初始值
    ctr = Counter.new(128, initial_value=int.from_bytes(iv_bytes, byteorder='big'))
    cipher = AES.new(key_bytes, AES.MODE_CTR, counter=ctr)

    # 4. 执行加密 (对应 _0x180b02.default.encrypt)
    ciphertext_bytes = cipher.encrypt(data_to_encrypt.encode('utf-8'))

    # 5. 拼接 IV 字节和密文字节，并转为 Base64 字符串返回 (对应最后一步的 concat 和 stringify)
    combined_bytes = iv_bytes + ciphertext_bytes
    return base64.b64encode(combined_bytes).decode('utf-8')

def rsa_encrypt(data_str, public_key_str):
    """
    还原 JS 中的 publicKeyEncrypt 函数
    :param data_str: 待加密的字符串 (_0x1b9ff2)
    :param public_key_str: 公钥字符串 (_0x347537)
    :return: Base64 编码的加密结果
    """
    try:
        # 1. 补全 PEM 格式 (对应 JS 中的 replace 操作)
        # JS 代码是直接把 key 塞进去，没有换行符处理，Python 的加载器通常能兼容
        pem_key = f"-----BEGIN PUBLIC KEY-----\n{public_key_str}\n-----END PUBLIC KEY-----"

        # 2. 加载公钥
        public_key = serialization.load_pem_public_key(
            pem_key.encode('utf-8'),
            backend=default_backend()
        )

        # 3. 数据转字节
        data_bytes = data_str.encode('utf-8')

        # 4. 加密
        # 重点：JSEncrypt 默认使用的是 PKCS1v15 填充，不是 OAEP！
        encrypted_bytes = public_key.encrypt(
            data_bytes,
            padding.PKCS1v15()
        )

        # 5. 转 Base64 字符串
        encrypted_base64 = base64.b64encode(encrypted_bytes).decode('utf-8')

        return encrypted_base64

    except Exception as e:
        print(f"加密失败: {e}")
        return None
def collectData_api(challenge,verifyId,collectData,key):
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "origin": "https://hotel.ocyuan.com",
        "priority": "u=1, i",
        "referer": "https://hotel.ocyuan.com/",
        "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    }
    url = "https://captcha.tuyacn.com/verify/v1/collectData"
    data = {
        "type": 1,
        "challenge": challenge,
        "verifyId": verifyId,
        "collectData": collectData,
        "key": key,
        "callback": f"verify_{int(time.time() * 1000)}"
    }
    data = json.dumps(data, separators=(',', ':'))
    response = requests.post(url, headers=headers, data=data)

    print(response.text)
    print(response)

if __name__ == '__main__':
    verifyId, challenge = get_verifyId_Api()
    print("verifyId:", verifyId,'\nchallenge:', challenge)
    bgUrl, sliceUrl, shuffle, publicKey = getQuestion_Api(verifyId,challenge)
    print("bgUrl:", bgUrl,'\nsliceUrl:', sliceUrl, '\nshuffle:', shuffle, '\npublicKey:', publicKey)
    download_image(bgUrl, './智慧酒店/bg_image.png')
    download_image(sliceUrl, './智慧酒店/slice_image.png')
    print("图片下载完成！")
     # 替换为你的乱序图片路径
    INPUT_IMAGE = './智慧酒店/bg_image.png'

    # 调用还原函数
    restore_bg(INPUT_IMAGE, shuffle, "./智慧酒店/restored_result.png")
    x = get_x("./智慧酒店/restored_result.png", "./智慧酒店/slice_image.png")
    print("最终滑块缺口位置 x:", x)
    # 对应原JS代码：let get_key_16 = getKey(0x10);
    # 0x10 是十六进制，等价于十进制 16
    get_key_16 = get_key(0x10)
    # 测试输出
    print("生成的16位随机字符串：", get_key_16)

    track_data = generate_slider_track(x)
    print("-----仿真滑块轨迹-----：", track_data)
    format_trajectory_result = format_trajectory(track_data)
    # --- 测试 ---
    # 准备数据
    browser_info = {
        "userAgent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        "windowSize": "1920,1080",
        "url": 'https://hotel.ocyuan.com/login',
        "isF12": "0",
        "isHeadless": "0",
        "timestamp": str(int(time.time()*1000))
    }

    # 2. 传入空轨迹 (因为样本Counts=6，说明没轨迹)
    track_data_empty = []

    builder = SliderPacketBuilder()
    result = builder.buffer_builder(browser_info, format_trajectory_result)

    # print(f"长度是 {len(result)}")
    collectData = aes_encrypt(result,get_key_16)
    print("collectData最终加密结果：", collectData,'\ncollectData长度为：', len(collectData))

    # 待加密的数据 (假设是一个随机字符串或者之前生成的 AES Key)
    # 注意：RSA 加密有长度限制。对于 2048 位密钥，PKCS1v1.5填充下最大只能加密 245 字节的数据。
    # 通常这里加密的是较短的字符串（如 AES 的 Key）。
    key = rsa_encrypt(get_key_16, publicKey)
    print("key最终加密结果：", key)
    collectData_api(challenge,verifyId,collectData,key)
```

贴一张校验成功的照片![](https://static.52pojie.cn/static/image/smiley/default/4.gif)

![](https://i.postimg.cc/XJyMWBgr/891754f50f40749d19549e66d8647501.png)

最后 我爱你们！！！![](https://static.52pojie.cn/static/image/smiley/default/40.gif)
