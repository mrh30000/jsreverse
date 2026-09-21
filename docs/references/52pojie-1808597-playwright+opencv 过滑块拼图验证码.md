# playwright+opencv 过滑块拼图验证码

> **作者**: 廿肆 | **发布时间**: 2023-07-14 17:10:00 | **版块**: 『编程语言区』 | **查看/回复**: 5521 / 13
> **原文**: [https://www.52pojie.cn/thread-1808597-1-1.html](https://www.52pojie.cn/thread-1808597-1-1.html)

---

*本帖最后由 廿肆 于 2024-7-1 16:30 编辑*

## 前言

最近看到浏览器自动化框架playwright，就使用了一下
在模拟登录掘金是通过密码登陆时遇到需要通过拼图验证码

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c709da48234e4a3985ffb80e7d87fa9b~tplv-k3u1fbpfcp-watermark.image?)
于是通过查找发现可以通过opencv库解决问题下面是解决过程

## 过程

### 1.首先需要获取到图片，通过查看html可以很容易找到需要的图片

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4016556f5b5342778d951bac7a5228aa~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4aaf5a1a06a94c25a20d1aabba21d184~tplv-k3u1fbpfcp-watermark.image?)

### 2.通过opencv进行图像处理来获取到拼图所处的位置

##### 1.通过查找搜索了解到可以通过边缘检测和形状匹配获取到拼图所处的位置，代码如下

```
import cv2

image1 = cv2.imread("resources/t4.jpeg")
image1_resize = cv2.resize(image1, (340, 212))
image2 = cv2.imread("resources/t4.png")
image2_resize = cv2.resize(image2, (68, 68))

# 背景图
# 处理图像，保留大部分白色
ret, thresholded_image = cv2.threshold(image1_resize, 220, 255, cv2.THRESH_BINARY)
# 灰度图像
gray_image1 = cv2.cvtColor(thresholded_image, cv2.COLOR_BGR2GRAY)
# 提高对比度
denoised_image1 = cv2.equalizeHist(gray_image1)
# 边缘检测
edges = cv2.Canny(denoised_image1, threshold1=500, threshold2=900)

# 滑块图片
gray_image2 = cv2.cvtColor(image2_resize, cv2.COLOR_BGR2GRAY)
denoised_image2 = cv2.equalizeHist(gray_image2)
edges2 = cv2.Canny(denoised_image2, threshold1=650, threshold2=900)

# 进行形状匹配
result = cv2.matchTemplate(edges, edges2, cv2.TM_CCOEFF_NORMED)
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
top_left2 = max_loc
bottom_right2 = (top_left2[0] + edges2.shape[1], top_left2[1] + edges2.shape[0])

# 在输入图像上绘制矩形标记
cv2.rectangle(image1_resize, top_left2, bottom_right2, (0, 0, 255), 2)

cv2.imshow("denoised_image2", denoised_image2)
cv2.imshow("edges2", edges2)
cv2.imshow("denoised_image1", denoised_image1)
cv2.imshow("edges", edges)
cv2.imshow('Target Image', image1_resize)

cv2.waitKey(0)
```

##### 2.分析过程

首先灰度处理图像
`cv2.cvtColor(thresholded_image, cv2.COLOR_BGR2GRAY)`

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df96596eec0f40ed917dd292262e6b92~tplv-k3u1fbpfcp-watermark.image?)
其次对图像进行边缘检测
`cv2.Canny(denoised_image1, threshold1=500, threshold2=900)`

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/28e4825f3c864d059f2dbe717faef580~tplv-k3u1fbpfcp-watermark.image?)
可以看到提取到了拼图的形状
最后通过`cv2.matchTemplate(edges, edges2, cv2.TM_CCOEFF_NORMED)`进行形状匹配

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f3f24282bb7f459a9020faec166a5c84~tplv-k3u1fbpfcp-watermark.image?)
通过上述操作就可以大致获取到拼图所处的位置
3.总结
感觉以上内容主要难点是如何提高边缘检测的准确度，更好的显示拼图形状，这方面是需要优化的

### 运行效果

![01ef35a1-4afe-4d94-83c6-547592f19765.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/feb5937099224f3b93e1d4b7b8a25b50~tplv-k3u1fbpfcp-watermark.image?)

### 完整代码

```
import random
import time

from playwright.sync_api import sync_playwright
import cv2
import requests

def get_move_x(image_path, template_path, image_height, image_width, template_height, template_width):
    # 背景图
    image = cv2.imread(image_path)
    image_resize = cv2.resize(image, (image_width, image_height))
    # 处理图像，保留大部分白色
    ret, thresholded_image = cv2.threshold(image_resize, 220, 255, cv2.THRESH_BINARY)
    # 灰度图像
    gray_image1 = cv2.cvtColor(thresholded_image, cv2.COLOR_BGR2GRAY)
    # 提高对比度
    denoised_image1 = cv2.equalizeHist(gray_image1)
    # 边缘检测
    image_canny = cv2.Canny(denoised_image1, threshold1=500, threshold2=900)

    # 滑动图
    template = cv2.imread(template_path)
    template_resize = cv2.resize(template, (template_width, template_height))
    template_gray = cv2.cvtColor(template_resize, cv2.COLOR_BGR2GRAY)
    denoised_image2 = cv2.equalizeHist(template_gray)
    template_canny = cv2.Canny(denoised_image2, threshold1=650, threshold2=900)

    # 进行模板匹配
    result = cv2.matchTemplate(image_canny, template_canny, cv2.TM_CCOEFF_NORMED)

    # 获取匹配结果的位置
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

    top_left2 = max_loc
    bottom_right2 = (top_left2[0] + template_resize.shape[1], top_left2[1] + template_resize.shape[0])
    # 在输入图像上绘制矩形标记
    cv2.rectangle(image_resize, top_left2, bottom_right2, (0, 0, 255), 2)
    cv2.imwrite('./test/Result'+str(int(time.time()))+'.jpg', image_resize)
    # x位置
    return max_loc[0]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context()
    page = browser.new_page()
    page.goto("https://juejin.cn/")
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="登录 注册").click()
    page.wait_for_timeout(1000)
    page.get_by_text("密码登录").click()
    page.wait_for_timeout(1000)
    page.get_by_placeholder("请输入邮箱/手机号（国际号码加区号）").click()
    page.wait_for_timeout(1000)
    page.get_by_placeholder("请输入邮箱/手机号（国际号码加区号）").fill("11111111111")
    page.wait_for_timeout(1000)
    page.get_by_placeholder("请输入密码").click()
    page.wait_for_timeout(1000)
    page.get_by_placeholder("请输入密码").fill("1933waH+")
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="登录", exact=True).click()

    login_flag = False
    count = 2
    while not login_flag and count>0:
        # 背景图的设置
        imageEL = page.locator("#captcha-verify-image")
        # 保存图片
        resp = requests.get(imageEL.get_attribute("src"))
        with open('bg.jpeg', 'wb') as f:
            f.write(resp.content)
        # 滑动图
        templateEl = page.locator("#captcha_container img").nth(1)
        # 保存图片
        resp = requests.get(templateEl.get_attribute("src"))
        with open('template.png', 'wb') as f:
            f.write(resp.content)
        #  获取滑动距离
        image_height = imageEL.bounding_box()["height"]
        image_width = imageEL.bounding_box()["width"]
        template_height = templateEl.bounding_box()["height"]
        template_width = templateEl.bounding_box()["width"]
        # print(image_height, image_width, template_height, template_width)
        x = get_move_x("bg.jpeg", "template.png", image_height, image_width, 68, 68)
        # x 加偏移量
        x = x + 33
        print(x)
        box = page.locator("div").filter(has_text="按住左边按钮拖动完成上方拼图").nth(4).bounding_box()
        page.locator("#secsdk-captcha-drag-wrapper div").nth(1).hover()
        page.mouse.down()
        # 移动鼠标
        #  生成30次移动x轴的坐标
        start = 1
        end = x
        step = (end - start) / 29  # 计算递增步长
        for i in range(30):
            if i == 29:
                number = x
            else:
                number = start + i * step
            page.mouse.move(box["x"] + number, box["y"] + random.randint(-10, 10), steps=4)
        page.mouse.up()

        page.wait_for_timeout(2000)
        try:
            page.locator("a").filter(has_text="刷新").wait_for(timeout=1000)
            count = count - 1
        except Exception as e:
            print("登录成功")
            login_flag = True

    # 签到
    # page.get_by_role("button", name="去签到").click()
    # page.get_by_role("button", name="立即签到").click()
    # page.get_by_role("button", name="去抽奖").click()
    # page.locator("#turntable-item-0").click()
    # page.get_by_role("button", name="收下奖励").click()
    # 已签到
    # page.get_by_role("button", name="已签到").click()
    # page.get_by_role("button", name="今日已签到").click()
    # page.get_by_role("button", name="去抽奖").click()
    # page.locator("#turntable-item-0").click()
    # page.get_by_role("button", name="收下奖励").click()
    page.pause()
    # page.close()
    # browser.close()
```

### 其他

模拟拖动时，拖拽轨迹不能一条直线会被检测的，最好接近人的拖拽

多次模拟看起来识别率还可以

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bbf6b68c5158459f94ddd2e3f2890486~tplv-k3u1fbpfcp-watermark.image?)
