# 【JavaScript 逆向】某音滑块纯算，底图还原，captchaBody，轨迹算法，abogus

> **作者**: Behind1 | **发布时间**: 2024-04-01 21:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13751 / 62
> **原文**: [https://www.52pojie.cn/thread-1908744-1-1.html](https://www.52pojie.cn/thread-1908744-1-1.html)

---

*本帖最后由 Behind1 于 2024-4-1 22:04 编辑*

### 前言

> **本案例中所有内容仅供个人学习交流，抓包内容、敏感网址、数据接口均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！**

### 一、抓包分析

![](https://attach.52pojie.cn/forum/202404/01/215423ifrufl889rf8f8bf.jpg)

`send_code` 触发验证码  将返回detail用于下个请求获取图片

`captcha/get`  通过detail获取图片， id  ， tip\_y（这个后面轨迹需要用到，最开始一直没找到这个值）

`captcha/verify` 通过轨迹生成的`captchaBody` 进行校验

流程比较简单，最头疼的是**jsvmp**，还有轨迹

### 二、mobile加密

直接进js抠出来就完事了，这里直接用Python改写

```
def mobile_encode(t):
    """
    异或运算（XOR）
    """
    t = '+86 ' + t

    def encode_char(c):
        code = ord(c)
        if 0 <= code <= 127:
            return [code]
        elif 128 <= code <= 2047:
            return [192 | 31 & code >> 6, 128 | 63 & code]
        else:
            return [224 | 15 & code >> 12, 128 | 63 & code >> 6, 128 | 63 & code]

    encoded = [encode_char(char) for char in str(t)]

    result = []
    for byte_list in encoded:
        for byte in byte_list:
            result.append(hex(5 ^ byte)[2:])

    return "".join(result)
```

### 三、底图还原

打开开发者工具可以算出 返回乱序图片和还原后的图片的**缩放比**

![](https://attach.52pojie.cn/forum/202404/01/215536iri4jzziam3m4rzj.jpg)

![](https://attach.52pojie.cn/forum/202404/01/215649h8prvbblw9zy5tkw.jpg)

图片还原可以通过`canvas`断点找到js还原图片的方法

这里仅竖着切割，我们可以不用去扣js   顺序固定的`[4, 0, 3, 5, 2, 1]`

直接改写Python实现还原

```
def parse_bg_captcha(img, save_path=None):
    """
    滑块乱序背景图还原
    还原前 h: 344, w: 552
    还原后 h: 212, w: 340
    :param img: 图片路径str/图片路径Path对象/图片二进制
        eg: 'assets/bg.webp'
            Path('assets/bg.webp')
    :param save_path: 保存路径, <type 'str'>/<type 'Path'>; default: None
    :return: 还原后背景图 RGB图片格式
    """
    if isinstance(img, (str, Path)):
        _img = Image.open(img)
    elif isinstance(img, bytes):
        _img = Image.open(io.BytesIO(img))
    else:
        raise ValueError(f'输入图片类型错误, 必须是<type str>/<type Path>/<type bytes>: {type(img)}')

    # 定义切割的参数
    cut_width = 92
    cut_height = 344
    k = [4, 0, 3, 5, 2, 1]

    # 创建新图像
    new_img = Image.new('RGB', (_img.width, _img.height))

    # 按照指定顺序进行切割和拼接
    for idx in range(len(k)):
        x = cut_width * k[idx]
        y = 0
        img_cut = _img.crop((x, y, x + cut_width, y + cut_height))  # 垂直切割
        new_x = idx * cut_width
        new_y = 0
        new_img.paste(img_cut, (new_x, new_y))

    # 调整图像大小
    # new_img = new_img.resize((340, 212))
    if save_path is not None:
        save_path = Path(save_path).resolve().__str__()
        new_img.save(save_path)

    img_byte_array = io.BytesIO()
    new_img.save(img_byte_array, format='PNG')
    img_byte_array = img_byte_array.getvalue()

    return img_byte_array
```

### 四、captchaBody

jsvmp 代码结构

![](https://attach.52pojie.cn/forum/202404/01/215809epaji2jge21gn212.jpg)

jsvmp一般采取补环境（是个webpack ）和插桩本文主要讲解插桩日志分析他的算法

#### 插桩分析

有很多个vmp 需要每个for循环处进行插桩，还有关键的运算位置需要单独打印出来

还有`fromCharCode`  `charAt`   `charCodeAt`都需要打印，有完整的日志才能更快更准的分析出。

```
console.log('待加密———>',m,'\n加密————>',b)
```

![](https://attach.52pojie.cn/forum/202404/01/215903vsbw1wfwsf91y4ww.jpg)

日志中你会看到aes 和 sha512算法

![](https://attach.52pojie.cn/forum/202404/01/215947yorg99t1ooyjbbog.jpg)

下面这段js你可能会需要用到

```
function hexStringToArrayBuffer(hexString) {
    // remove the leading 0x
    hexString = hexString.replace(/^0x/, '');

    // ensure even number of characters
    if (hexString.length % 2 != 0) {
        console.log('WARNING: expecting an even number of characters in the hexString');
    }

    // check for some non-hex characters
    var bad = hexString.match(/[G-Z\s]/i);
    if (bad) {
        console.log('WARNING: found non-hex characters', bad);
    }

    // split the string into pairs of octets
    var pairs = hexString.match(/[\dA-F]{2}/gi);

    // convert the octets to integers
    var integers = pairs.map(function(s) {
        return parseInt(s, 16);
    });

    var array = new Uint8Array(integers);
    console.log(array);

    return array.buffer;
}
```

![](https://attach.52pojie.cn/forum/202404/01/220016p31ghn9neb1bwzny.jpg)

#### 轨迹

轨迹这里可以自己打上log去看，鼠标，滚动条

这里说一下这个参数

> "drag":
>
> "x": 144,  //  边框20+滑动条64.5 也就是 x∈[20-84,20+滑块滑动距离-84+滑动距离]
> "y": 287,  // 整个滑块窗口到滑动条距离 y∈[285,325]

```
{
    "reply": "30h5Yr0hM",
    "models": "pD6zZEe4",
    "in_modal": "xCiAyhLse",
    "in_slide": "vi5C7jc",
    "move": "8uRj",
    "touch": "ljA42",
    "drag": "YuLFijT",
    "crypt_salt": "1b4d7416e175dc54380b876c721e4af5b406e7a1700ff3118beb029635ba2fe26c794112bb938d17517af1fc36db87b7f43db04ebdc305d5e30f2ba47a184366"
}
```

动态加密,目前还没有想到如何快速拿到映射。

```
code:500,msg:"VerifyErr" //滑块缺口距离错误
code:500,msg:"VerifyModelErr" //滑块位置正确轨迹有问题
```

### 五、结果展示

这里就不讲太多了，有问题可以私信我。

![](https://attach.52pojie.cn/forum/202404/01/220133pn77277b8xnx77b2.jpg)
