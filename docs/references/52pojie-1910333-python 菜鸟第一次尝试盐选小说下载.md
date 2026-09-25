# python 菜鸟第一次尝试盐选小说下载

> **作者**: jing99 | **发布时间**: 2024-04-06 19:40:00 | **版块**: 『编程语言区』 | **查看/回复**: 1429 / 41
> **原文**: [https://www.52pojie.cn/thread-1910333-1-1.html](https://www.52pojie.cn/thread-1910333-1-1.html)

---

*本帖最后由 jing99 于 2024-4-10 15:24 编辑*

2024.4.10  在两位佬[@743567274](https://www.52pojie.cn/home.php?mod=space&uid=444720) 以及 [@anchovy126](https://www.52pojie.cn/home.php?mod=space&uid=2200464)  的指导下，基本确定了知乎盐选小说的下载，感谢吾爱提供的平台，仅供学习交流。

![](https://static.52pojie.cn/static/image/hrline/1.gif)

看到论坛有好多人求助盐选小说的，也看到有大佬帮忙下造成 txt 的，一时手痒痒，正好也没事情，就来试试。
结果成功下载了盐选小说的完整页面（html）

最后想下载 txt 的时候，发现有字体反爬这东西。

折腾了好久的字典映射，找不到规律，于是在论坛发现大佬的字体反爬通杀字体反爬通杀，试了一下 ddddocr 识别。总算是找到了字典映射。

```
{'个': '一', '了': '上', '就': '不', '大': '业', '要': '个', '多': '中', '上': '为', '是': '了', '作': '于', '来': '人', '和': '以', '展': '作', '于': '出', '的': '分', '国': '到', '分': '发', '时': '和', '业k': '国', '对': '在', '发': '多', '我': '大', '出': '学', '在': '对', '生': '就', '不': '展', '以': '我', '这': '教', '能': '时', '学': '是', '为': '有', '有': '来', '到': '理', '理': '生', '人': '的', '过': '能', '一': '要', '中': '过', '教': '这'}
```

但是替换之后，依然会有部分出入，一一按照四个 base64 的字体文件替换之后，还是没能还原。我特地对比了一下，确实是按照字典替换了文字

![](https://img2.imgtp.com/2024/04/06/ek8EvvQ9.png)

接下来不知道咋搞了。只能先到这里了。

后续的有大佬感兴趣的话，可以接着试试。

这是下载的一次完整 html、txt 文件

https://wwi.lanzoup.com/b02a7mo2dc
密码:2km6

这是写的代码，可能格式不太清晰

```
# 导入所需的库
import requests
import time
from bs4 import BeautifulSoup
import re
import re
import base64
import re
from fontTools.ttLib import TTFont
import ddddocr
from PIL import ImageFont, Image, ImageDraw
# 目标 URL
def getcontent():
    url = 'https://www.zhihu.com/market/paid_column/1730607810226688000/section/1730181148968325120'

    # 请求头
    headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'User-Agent: com.zhihu.android/9.30.0 (Android 10; Mobile;)',
    }

    # Cookies 字符串转换为字典
    cookies_raw = ''
    cookies_dict = {cookie.split('=')[0]: '='.join(cookie.split('=')[1:]) for cookie in cookies_raw.split('; ')}

    # 获取字体文件链接
    # 发送 GET 请求并等待响应
    response = requests.get(url, headers=headers, cookies=cookies_dict)
    time.sleep(5)  # 等待一段时间，以确保所有处理都已完成

    # 解析响应内容
    soup = BeautifulSoup(response.text, 'html.parser')
    title_tag = soup.find('h1', class_='ManuscriptTitle-root-gcmVk')

        # 提取并打印标题文本
    if title_tag:
            print(title_tag.text)
    else:
            print("Title not found.")
    filename = f"{title_tag.text}.txt"
    # 提取并保存 <p> 标签的文本内容，保存为txt文档
    with open(filename, 'w', encoding='utf-8') as file:
        for tag in soup.find_all('p'):
            file.write(tag.get_text() + '\n')

    ##保存为html文件
    filename = f"{title_tag.text}.html"
    with open(filename, 'w', encoding='utf-8') as file:
        file.write(str(soup))
    print(f"文件已保存到：{filename}")

    ####保存字体文件
    pattern = r"@font-face\s*\{[^\}]*?src:\s*url\(data:font/ttf;charset=utf-8;base64,([A-Za-z0-9+/=]+)\)"

        # Find all matches
    matches = re.findall(pattern, response.text)

    for match in matches:
            print("Base64 Encoded String:", match)

    if matches:
            base64_font_data = matches[2]
            decoded_font_data = base64.b64decode(base64_font_data)
            font_file_path = "font_file.ttf"
            with open(font_file_path, "wb") as font_file:
                font_file.write(decoded_font_data)
            print(f"字体文件已成功保存到：{font_file_path}")

    else:
            print("未找到匹配的Base64字体数据。")

##对字体文件进行解码并替换原来的text

def font_to_img_and_recognize(code_list, filename, ocr_engine):
    """
    将字体中的字符绘制到图像上并使用OCR识别，返回识别结果到原始字符的映射字典。
    """
    recognition_to_original_dict = {}
    for unicode_code in code_list:
        char = chr(unicode_code)  # Unicode编码转字符
        img_size = 128  # 图像大小可以适当调整
        img = Image.new('RGB', (img_size, img_size), 'white')
        draw = ImageDraw.Draw(img)
        font = ImageFont.truetype(filename, int(img_size * 0.8))
        text_width, text_height = draw.textsize(char, font=font)
        draw.text(((img_size - text_width) / 2, (img_size - text_height) / 2), char, fill='black', font=font)

        # OCR识别
        recognized_text = ocr_engine.classification(img)
        recognition_to_original_dict[recognized_text] = char  # 将识别结果映射到原始字符

    return recognition_to_original_dict
def replace_text_and_report(input_file, output_file, replace_dict):
    """
    读取输入文件中的文本，根据替换字典进行文字替换，然后保存到输出文件，并报告替换情况。

    :param input_file: 输入文件的路径。
    :param output_file: 输出文件的路径。
    :param replace_dict: 替换字典，格式为{错误文字: 正确文字}。
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 用于记录替换情况的字典
        replace_report = {}

        # 遍历替换字典，对文本中的每个符合条件的文字进行替换
        for wrong_text, correct_text in replace_dict.items():
            # 统计当前字符在文本中的出现次数
            occur_count = content.count(wrong_text)
            if occur_count > 0:
                replace_report[wrong_text] = {'correct_text': correct_text, 'count': occur_count}
                content = content.replace(wrong_text, correct_text)

        # 将替换后的文本保存到输出文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print("文本替换完成，结果已保存至：", output_file)

        # 打印替换报告
        print("替换报告：")
        for wrong_text, info in replace_report.items():
            print(f"'{wrong_text}' 替换为 '{info['correct_text']}'，共替换 {info['count']} 次。")
    except Exception as e:
        print("处理过程中发生错误：", str(e))
def ttf_parse_and_recognize(ttf_name):
    """
    解析TTF文件，识别其中的字符，并建立从识别结果到原始字符的映射字典。
    """
    ocr_engine = ddddocr.DdddOcr()
    with open(ttf_name, 'rb') as f:
        font = TTFont(f)
        cmap = font.getBestCmap()
        unicode_list = list(cmap.keys())

    # 将字形转换为图像并识别
    recognition_dict = font_to_img_and_recognize(unicode_list, ttf_name, ocr_engine)

    # 打印映射字典
    print("Recognition to Original Mapping:")
    print(recognition_dict)
    return recognition_dict

if __name__ == '__main__':
    #得到文件以及内容
    getcontent()
    #对字体文件解码，得到替换的字典
    mapping_dict = ttf_parse_and_recognize("font_file.ttf")
    #inputfile为之前保存的txt文档
    input_file = '炮灰郡主反杀了.txt'
    #outputfile为替换后的txt文档
    output_file = '炮灰郡主反杀了_t.txt'
   #替换文字并保存
    replace_text_and_report(input_file, output_file, mapping_dict)
```
