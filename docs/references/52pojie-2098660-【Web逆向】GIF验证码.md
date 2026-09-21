# 【Web逆向】GIF验证码

> **作者**: epiphanyep | **发布时间**: 2026-03-22 16:18:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1059 / 10
> **原文**: [https://www.52pojie.cn/thread-2098660-1-1.html](https://www.52pojie.cn/thread-2098660-1-1.html)

---

hello 大家！

好久没有发帖子了 1 是因为因为开学了 每天基本上都有课 所以连续学习的时间少了 比较琐碎。(我又不太喜欢上学校里的课，所以能逃的课都逃了,想赶紧提升提升自己.)
2 是搞了两个验证码都失败了 一个腾讯天域 一个kgcaptcha  这两个都是点选 腾讯天域最后加密是vmp，我没搞过vmp 抱着试一试的态度搞了一个星期 纯算搞不出来 补环境最后加密参数的长度也不够，最后还是放弃了

kgcaptcha  那个点选背景图文字 识别太困难了 最开始打标签十多张图 后来发现文字没有重复的 果断放弃标文字，方向改成标文字的位置 然后训练yolo学着框文字并把文字裁剪成小图 与目标文字小图用ResNet进行对比 识别效果特别不好。。。。捣鼓三四天搞不了 又只能无奈放弃了。。。。

如果有大佬会的可以教教我 指点我嘛![](https://static.52pojie.cn/static/image/smiley/default/44.gif)

不知道是两个太难了 还是我太菜了 只能从简单的验证码开始了 GIF验证码

目标网址 [https://www.spiderdemo.cn/captch ... type=cap2\_challenge](https://www.spiderdemo.cn/captcha/cap2_challenge/?challenge_type=cap2_challenge)

打开网址如图

![](https://ps.ssl.qhimg.com/t0266157483d579af66.jpg)

打开开发者工具 点击下一页进行抓包

[![](https://ps.ssl.qhimg.com/t0278d78891fb03edef.jpg)](https://i.postimg.cc/sXf0nzkM/image.png)

可以看到是有两个接口

先分析第一个接口

载荷没啥说的，直接看响应吧

[![](https://ps.ssl.qhimg.com/t021b21f95c01e1d470.jpg)](https://i.postimg.cc/W4T93jb0/image.png)

一个F 一个 T 暂时不知道有什么用 可以先放下

再来看第二个接口 他是返回图片的

点一下请求头发现url这么长，而且有点眼熟

[![](https://ps.ssl.qhimg.com/t02ff9de9deadd9f56b.jpg)](https://i.postimg.cc/15D25vcc/image.png)

没错 仔细观察其实就是 上一个接口返回的F 或者是 T 他俩是随机换的

当时做的时候没有经验 后来才知道  IVB.....开头的一般都是图片 ROLGO....开头的一般都是GIF动图

[![](https://ps.ssl.qhimg.com/t025758f5683f48fa69.jpg)](https://i.postimg.cc/PrHKKT1j/image.png)

我当时直接请求的图片接口怎么验证也不行  后来把鼠标放到 验证码上会有提示：

![](https://ps.ssl.qhimg.com/t02c2c5f4f14d2feb65.jpg)

所以直接点一下抓包分析就行了

主要的思路就是 用图像标准差这个算法 遍历动图每一帧 然后找出像素最高的图片(这里用ai写就行了) 用ddddocr 进行识别就行了 这个我认为当个模板就写死就行了 应该是个gif都行

比较简单

贴一张运行成功的图片

[![](https://ps.ssl.qhimg.com/t024721269da48f17d7.jpg)](https://i.postimg.cc/FR933s2L/bd438279394e0b676679ef202004bb1c.png)

代码如下

[Asm] *纯文本查看*

```
import requests
import time
import base64
import os
import sys
import io
import shutil  # 彻底清理文件夹
import json
from PIL import Image, ImageStat # 引入清晰度计算模块
import ddddocr

# 终端输出防乱码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# 初始化 OCR
ocr = ddddocr.DdddOcr(show_ad=False)
# 保持会话
session = requests.Session()

# ==========================================
# 获取当前 demo.py 所在的真实目录路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 动态拼接子文件夹路径
TEST_DIR = os.path.join(BASE_DIR, "test")
BG_IMG_DIR = os.path.join(BASE_DIR, "bg_img")

def dissect_and_recognize(gif_bytes):
    """
    既清空文件夹、保存每一帧，又自动评分锁定最清晰帧！
    """
    img = Image.open(io.BytesIO(gif_bytes))

    # &#127775; 使用 os.path 动态路径
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
        print("&#129529; 已彻底清空旧的切片文件...")
    os.makedirs(TEST_DIR, exist_ok=True)

    print(f"&#128298; 开始解剖 GIF 并进行清晰度扫描... 共发现 {img.n_frames} 帧！")

    best_frame = None
    max_stddev = 0
    best_index = 0

    # 遍历每一帧：保存 + 打分
    for i in range(img.n_frames):
        img.seek(i)

        # 1. 提取当前这一帧的真实面目 (白底防黑块)
        raw_frame = img.copy().convert('RGBA')
        white_bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
        white_bg.paste(raw_frame, (0, 0), mask=raw_frame)
        final_frame = white_bg.convert('RGB')

        # &#127775; 下载功能：用 os.path.join 拼接文件名
        final_frame.save(os.path.join(TEST_DIR, f"raw_frame_{i}.png"))

        # 2. 核心算法：计算“像素标准差”作为清晰度评分
        stat = ImageStat.Stat(final_frame.convert('L'))
        stddev = stat.stddev[0]

        print(f"  &#9989; 已保存第 {i} 帧切片, 清晰度评分: {stddev:.2f}")

        # 3. 记录目前为止得分最高的那一帧
        if stddev > max_stddev:
            max_stddev = stddev
            best_frame = final_frame
            best_index = i

    print(f"&#127919; 自动锁定最清晰的 [第 {best_index} 帧] 送给 OCR！")

    # 贴心小功能：单独存一个特别的名字，方便你直接看！
    best_frame.save(os.path.join(TEST_DIR, f"00_BEST_FRAME_is_{best_index}.png"))

    # 转成二进制喂给 ddddocr
    img_byte_arr = io.BytesIO()
    best_frame.save(img_byte_arr, format='PNG')

    text = ocr.classification(img_byte_arr.getvalue())

    # 防误判逻辑：如果没认出或者太短，返回 None 触发重试
    if not text or len(text) < 3:
        print(f"&#9888;&#65039; 抓到了最佳帧，但 OCR 没看懂 (结果: '{text}')，准备重新请求...")
        return None

    return text

def get_and_clean_captcha():
    headers = {
        "accept": "*/*",
        "referer": "https://www.spiderdemo.cn/captcha/cap2_challenge/?challenge_type=cap2_challenge",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    cookies = {
        "sessionid": "jitlmeznodbjh707v7y3uwqqpz23zm7d" # <-- 如果总是识别失败，记得去网页换个新的
    }

    url = "https://www.spiderdemo.cn/captcha/api/cap2_challenge/captcha_image/"
    params = {"t": str(int(time.time() * 1000))}

    response = session.get(url, headers=headers, cookies=cookies, params=params)
    data = response.json()

    t_raw = data.get('T', '')
    f_raw = data.get('F', '')

    t_b64 = t_raw.split(',')[-1] if ',' in t_raw else t_raw
    f_b64 = f_raw.split(',')[-1] if ',' in f_raw else f_raw

    # 挑出体积更大的真图
    if len(t_b64) > len(f_b64):
        real_base64 = t_b64
    else:
        real_base64 = f_b64

    img_bytes = base64.b64decode(real_base64)

    # [调试用] &#127775; 使用动态路径保存原始动图
    os.makedirs(BG_IMG_DIR, exist_ok=True)
    with open(os.path.join(BG_IMG_DIR, "original.gif"), "wb") as f:
        f.write(img_bytes)

    return dissect_and_recognize(img_bytes)

def get_verify_Api(page, code):
    headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "origin": "https://www.spiderdemo.cn",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "referer": "https://www.spiderdemo.cn/captcha/cap2_challenge/?challenge_type=cap2_challenge",
        "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
    }
    cookies = {
        "sessionid": "jitlmeznodbjh707v7y3uwqqpz23zm7d"
    }
    url = "https://www.spiderdemo.cn/captcha/api/cap2_challenge/page/"
    data = {
        "captcha_input": code,
        "page_num": page,
        "challenge_type": "cap2_challenge"
    }
    data = json.dumps(data, separators=(',', ':'))
    response = requests.post(url, headers=headers, cookies=cookies, data=data).text
    return json.loads(response)

if __name__ == '__main__':
    total_num = 0

    for page in range(1, 101):
        max_retries = 10
        final_code = None

        # --- 验证码识别环节 ---
        for i in range(max_retries):
            print(f"\n--- &#128640; [第 {page} 页] 第 {i+1} 次尝试获取并识别验证码 ---")
            code = get_and_clean_captcha()

            if code:
                final_code = code
                break
            else:
                print("&#128260; 识别不佳，休息 1 秒后重试...")
                time.sleep(1)

        # --- 数据抓取环节 (只有拿到 final_code 才进来) ---
        if final_code:
            print("\n" + "=" * 40)
            print(f"&#127942; 验证码通过: {final_code}")
            print("=" * 40)

            api_res = get_verify_Api(page, final_code)

            if api_res and 'page_data' in api_res:
                page_data = api_res.get('page_data')

                # 进行求和
                once_sum = sum(page_data)
                total_num += once_sum

                print(f"&#9989; 第 {page} 页抓取成功！本页和: {once_sum}")
                print(f"&#128176; 目前累计总分: {total_num}")
            else:
                print(f"&#10060; 第 {page} 页数据获取失败，服务器返回: {api_res}")

        else:
            # 走到这里说明 10 次都没认出来，为了不崩溃，我们只能跳过这一页
            print(f"\n严重警告: 第 {page} 页连续 10 次识别失败，已跳过。")
            continue

        time.sleep(1)

    print("\n" + "★" * 50)
    print(f"&#127937; 100页全自动化收割完毕！")
    print(f"&#128293; 最终全站总得分: {total_num}")
    print("★" * 50)
```

再见大家  最后我爱你们
