# 抖音 滑块验证方案 s_v_web_id 参数分析

> **作者**: cenjy9 | **发布时间**: 2023-02-14 00:52:00 | **版块**: 『原创发布区』 | **查看/回复**: 8318 / 29
> **原文**: [https://www.52pojie.cn/thread-1745678-1-1.html](https://www.52pojie.cn/thread-1745678-1-1.html)

---

<table><tr><td bgcolor=orange>本文所有教程及源码、软件仅为技术研究。不涉及计算机信息系统功能的删除、修改、增加、干扰，更不会影响计算机信息系统的正常运行。不得将代码用于非法用途，如侵立删！</td></tr></table>

---

### 抖音web端 s\_v\_web\_id 参数生成分析与实现

#### 操作环境

* win10
* Python3.9

#### 更新：2023.2.14

今天web端改为了点选验证
![在这里插入图片描述](https://img-blog.csdnimg.cn/c5079e18b4794574bcdcf7d8f7b1be26.png)
分析了一波，效果如下
![在这里插入图片描述](https://img-blog.csdnimg.cn/d7722b254b05447db40459e95ab2c48b.png)

#### 分析

s\_v\_web\_id 作用：web端使用滑块后的s\_v\_web\_id 参数可以实现免signature验证
s\_v\_web\_id 生成：在验证码中间页的html中的fp参数就是s\_v\_web\_id
详细介绍这边就不在赘述，可以参考下玺佬的文章：[s\_v\_web\_id介绍](https://blog.csdn.net/weixin_43582101/article/details/120307681#comments_22543780)
生成方案：

* Python + selenium 自动化过滑块
* RPC远程调用自动，验证滑块

这两种方案有个前提是页面必须出现滑块才可以（之前搜素视频会强制滑块效验），具体过滑块的方法玺佬都已经分享过。
现在应该是web端有更新，现在搜索页面只有综合会出点选验证，视频和用户页面都没有强制滑块验证了，清cookie和开无痕都没办法触发滑块，经过几天的分析研究出以下方案
最新解决方案：

* 通过js生成滑块s\_v\_web\_id
* 识别滑块
* 生成验证参数并验证
* 验证通过后就可正常使用了

---

#### 2023.1.5 更新：滑块轨迹

元旦前抖音大更新，现在开始验证xb，轨迹验证也更严格了，selenium基本过不了，通过chazhuang手动采集滑动轨迹，现在通过率90%左右
![在这里插入图片描述](https://img-blog.csdnimg.cn/21a15e76bdbc4aae8009bdd91f74632a.png)

#### 2022-8-6 更新：报错当前网络不稳定，请稍后再试

问题：下载验证码图片报错：当前网络不稳定，请稍后再试![在这里插入图片描述](https://img-blog.csdnimg.cn/274097d1ebd54e89b3a5a346dad39358.png)
解决：在请求参数中增加参数 "app\_name": ""
![在这里插入图片描述](https://img-blog.csdnimg.cn/e05aa2c829a84c5786ed04abf206b300.png)

---

#### 通过js生成滑块s\_v\_web\_id

```
function create_s_v_web_id() {
    var e = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("")
      , t = e.length
      , n = (new Date).getTime().toString(36)
      , r = [];

    r[8] = r[13] = r[18] = r[23] = "_",
    r[14] = "4";
    for (var o, i = 0; i < 36; i++)
        r[i] || (o = 0 | Math.random() * t,
        r[i] = e[19 == i ? 3 & o | 8 : o]);
    return "verify_" + n + "_" + r.join("")
}
```

此方法生成的s\_v\_web\_id是不可以用来采集评论的，评论验证使用的s\_v\_web\_id需要从页面取下来，然后在拿着过滑块，此处再次感谢玺佬@李玺

---

#### 识别滑块

```
def calculate_distance(self, pic1_path, pic2_path):
    """
    计算滑块到缺口的距离
    """
    img1 = self.clear_white(pic1_path)
    img1 = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
    slide = cv2.Canny(img1, 100, 200)
    img2 = cv2.imread(pic2_path, 0)
    back = cv2.Canny(img2, 100, 200)
    slide_pic = cv2.cvtColor(slide, cv2.COLOR_GRAY2RGB)
    back_pic = cv2.cvtColor(back, cv2.COLOR_GRAY2RGB)
    x, y = self.template_match(slide_pic, back_pic)
    dis_x = int((x + 5) * (340 / 552))
    dis_y = int(y * (340 / 552))
    return dis_x, dis_y

def get_tracks(self, distance, _y):
    """
    获取轨迹参数
    """
    tracks = list()
    y, v, t, current = 0, 0, 1, 0
    mid = distance * 3 / 4
    exceed = random.randint(40, 90)
    z = random.randint(30, 150)
    while current < (distance + exceed):
        if current < mid / 2:
            a = 2
        elif current < mid:
            a = 3
        else:
            a = -3
        a /= 2
        v0 = v
        s = v0 * t + 0.5 * a * (t * t)
        current += int(s)
        v = v0 + a * t
        y += random.randint(-3, 3)
        z = z + random.randint(5, 10)
        tracks.append([min(current, (distance + exceed)), y, z])
    while exceed > 0:
        exceed -= random.randint(0, 5)
        y += random.randint(-3, 3)
        z = z + random.randint(5, 9)
        tracks.append([min(current, (distance + exceed)), y, z])
    tr = []
    for i, x in enumerate(tracks):
        tr.append({
            'x': x[0],
            'y': _y,
            'relative_time': x[2]
        })
    return tr
```

---

#### 生成验证参数并验证

captchaBody需要js生成

```
def captcha_verify(self, s_v_web_id, captchaBody):
    url = "aHR0cHM6Ly92ZXJpZnkuc25zc2RrLmNvbS9jYXB0Y2hhL3ZlcmlmeQ=="
    params = {
        "os_type": "2",
        "fp": s_v_web_id,
        "subtype": "slide",
    }
    data = {
        'captchaBody': captchaBody
    }
    r = self._parse_url(url=url, params=params, data=json.dumps(data))
    return r.json()
```

#### 效果

识别率成功率还是可以的
![请添加图片描述](https://img-blog.csdnimg.cn/baa5477f781c44afbed16f2109ca7b2a.gif)

---

<table><tr><td bgcolor=orange>本文仅供学习交流使用，如侵立删！</td></tr></table>

---
