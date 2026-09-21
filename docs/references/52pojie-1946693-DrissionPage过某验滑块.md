# DrissionPage过某验滑块

> **作者**: weiback | **发布时间**: 2024-07-22 22:46:00 | **版块**: 『编程语言区』 | **查看/回复**: 4619 / 7
> **原文**: [https://www.52pojie.cn/thread-1946693-1-1.html](https://www.52pojie.cn/thread-1946693-1-1.html)

---

*本帖最后由 weiback 于 2024-7-22 22:53 编辑*

如果此文和其他作者发布有重复，或者有其他侵权问题，请留言，将会删除此文，谢谢。DrissionPage过滑块流程：
1.首先需要先打开滑块所在网站，这里用的是atob('aHR0cHM6Ly93d3cuZ2VldGVzdC5jb20vZGVtby9zbGlkZS1mbG9hdC5odG1s')
page = ChromiumPage()
page.get(atob('aHR0cHM6Ly93d3cuZ2VldGVzdC5jb20vZGVtby9zbGlkZS1mbG9hdC5odG1s'))
2.点击触发滑块按钮，获取滑块图片
这里需要注意的是，该网站的滑块图片不能在html页面获取，所以这里需要采用DrissionPage的监听功能来捕获返回的滑块数据信息
page.listen.start(atob('YXBpLmdlZXZpc2l0LmNvbQ=='))
page.ele('.geetest\_radar\_tip\_content').click()
res = page.listen.wait(count=2, timeout=3)
3.由2获取得到的滑块图片是乱序的，需要进行还原，还原的代码已经有很多人分享过了，这里不再赘述。
4.获取到滑块原图之后即可对滑块所在位置进行定位，这里选用的是ddddocr来进行获取滑块距离
det = ddddocr.DdddOcr(det=False, ocr=False, show\_ad=False)
slide = open('./img/slice\_img.jpg', 'rb').read()
bg = open('./img/bg\_img.jpg', 'rb').read()
distance = det.slide\_match(slide, bg, simple\_target=True)['target'][0]
5.滑块距离得到后，要根据他的距离来设计出滑块的移动轨迹，js逆向的话会需要考虑x,y和时间的值；这里只需要考虑x（即水平方向）的移动速度即可
这里用的是在网上看到的一个缓动函数，用来模拟人的行为来进行生成轨迹。
缓动函数：
def ease\_out\_expo(sep)
    if sep == 1:
        return 1
    else:
        return 1 - pow(2, -10 \* sep)
这里需要注意的是，缓动函数生成的轨迹是逐渐增大的，如果是js逆向的话直接使用即可，如果是自动化需要依次用后一个值减去前一个值，否则移动距离和实际滑块位置不符。
获取移动轨迹：
def get\_tracks(distance):
    plus = []
    # 记录count次滑块位置信息
    count = int(distance / 4)
    for i in range(count):
        s = round(\_\_ease\_out\_expo(i / count) \* distance)
        plus.append(round(s))
    return plus
6.获得滑块轨迹之后即可滑块进行移动
     page.actions.hold('.geetest\_slider\_button')
    # 获取轨迹
    index = 0
    for x in get\_tracks(distance)[:-5]:
        if index == 0:
            page.actions.move(offset\_x=x, duration=.1)
        else:
            page.actions.move(offset\_x=x - get\_tracks(distance)[index - 1], duration=.1)
        index += 1
    page.actions.release('.geetest\_slider\_button')
7.检查是否成功
    result = page.listen.wait(count=1, timeout=3)
    print(result.response.body)
如果返回类似geetest\_1721656914244({"success": 1, "message": "success", "validate": "0fc57cff06c02cbfd9d5dead5acaa3c8", "score": "9"})，则代表成功。

注意：轨迹有待优化，测试的时候是可以成功的，但不同电脑上运行是否成功可能有一定的差别。
