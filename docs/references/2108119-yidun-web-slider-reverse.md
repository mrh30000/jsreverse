# 最新易盾web滑块逆向分析。

> **作者**: 小亮丶1 | **发布时间**: 2026-05-17 12:58:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5044 / 31
> **原文**: [https://www.52pojie.cn/thread-2108119-1-1.html](https://www.52pojie.cn/thread-2108119-1-1.html)

---

*本帖最后由 小亮丶1 于 2026-5-17 13:29 编辑*

以下内容主要作为学习使用，如有侵权请联系删除。
网址：aHR0cHM6Ly9pZC4xNjMuY29tL21haWwvcmV0cmlldmVwYXNzd29yZD9wZD1tYWlsMTYzJnBraWQ9Q3ZWaUh6bCMvdmVyaWZ5QWNjb3VudA==

易盾一共需要发送的数据包一共有4个
分别为下图所标记出的请求，请求顺序为
1：Getconf
2：up
3：get
4：check

![](https://attach.52pojie.cn/forum/202605/17/123759kwzn42x2ueh4zbn2.png)

我们先从第一个包开始看
**1：Getconf包**

![](https://attach.52pojie.cn/forum/202605/17/123802vaqaa2p4aauvpiaa.png)

分析发现里面只有一个id值有用这个是站点固定的，不同站点为不同的id。开发时需要注意留出来自定义方便后续扩展多个站点。
其他的参数则都是固定值 其中callback的生成可使用以下js代码生成即可

function callback(){
    return '\_\_JSONP\_'+Math.random().toString(36).slice(2, 9)+'\_0'
}
其他则没有什么需要注意的地方了 在返回值中 我们需要取回2个参数供后续功能使用
data[‘"ir"]["pn"]
data["ir"]["token"]
**2：up(主要的环境效验请求，最难的一部分)**
先看他的请求参数

![](https://attach.52pojie.cn/forum/202605/17/123804v32o92otq47ontfo.png)

发现这里的P就是第一次请求时返回的data[‘"ir"]["pn"]具体也就是这样

    data={
        "p":ir\_pn,#上面data内的pn
        "v":"2.0.13\_yanzhengma",
        "vk":"d44593ca",
        "n":n,
        "d":d
    }
那么现在知道了提交参数中有2个加密  n与d那么接下来我们去代码中找到n与d的实现

![](https://attach.52pojie.cn/forum/202605/17/123806rsx9c5bhu9z1xrz6.png)

发现了n与d的生成位置 我们一个个分析 先看n 发现n很简单就一个随机生成字符串并没有什么环境之类的算法在里面，所以我们直接拿下这一段代码直接使用即可。

![](https://attach.52pojie.cn/forum/202605/17/123808nvvqz00b6biqmqk5.png)

接下来就是重头戏d了，进入d我们看见是这样的很乱，但是别急我们一点点分析

![](https://attach.52pojie.cn/forum/202605/17/123811pn7f4anbhkcb0nk4.png)

这个v的执行就是return 了一个方法执行后的结果，那么我们看他的执行方法时传了什么参数

![](https://attach.52pojie.cn/forum/202605/17/123812mf17ms868tyxsmqa.png)

通过我们断点发现其中的n是代码加载时就已经初始化的一些值，并不是现在生成的那么我们就需要去看n是如何生成的。过程比较痛苦因为生成是通过异步的，避免看的迷糊就不把这段很绕的分析放出来了，这里就直接说分析结果。我们最终分析到的初始化位置是在这里上面执行的代码为初始化时就调用完成了不是单独调用的方法，也就是我们只需要初始化那么他会帮我们把所有的参数加密都搞定

![](https://attach.52pojie.cn/forum/202605/17/123815zbskyoxl14yd1dkd.png)

传入的参数为

{
        "productId": "YD00192283058223",
        "apiServer": ["https://ir-sdk.dun.163.com", "https://ir-sdk.dun.163yun.com"],
        "timeout": 6000
    }
现在知道他是如何初始化环境以及调用了，那么我们就需要找到他的环境生成位置去分析，这样我们才能实现补出来的环境与他需要的环境一致，我们只需要随便找一处调用window取值的地方断点那么他异步执行的取环境方法就会调用过来，通过断点我们最终定位在了

![](https://attach.52pojie.cn/forum/202605/17/123817af2e5nc2n25ppdq5.png)

找到他取环境的方法了那么接下来就是一个一个补出来让本地环境一致即可。当我们补完环境后，需要在js中进行一些修改来实现调用js生成我们需要的代码

![](https://attach.52pojie.cn/forum/202605/17/123819jazt4221tqafi7i9.png)

我们已知这里是初始化会执行到的地方，我们让他初始化时就向我们的window对象写出结果，具体调用代码如下

function getVResult() {
    // 初始化
    test = {
        "productId": "YD00192283058223",
        "apiServer": ["https://ir-sdk.dun.163.com", "https://ir-sdk.dun.163yun.com"],
        "timeout": 6000
    };

    aaa = window.createNECaptchaGuardian(test);
    aaa.getToken(); // 触发流程
}
getVResult()
因为这里初始化是异步的 所以返回结果是没有用的 需要通过代理捕捉上面修改的window.v\_result写入的值就是我们需要的加密结果当结果出来后，再进行请求则会返回如下内容

![](https://attach.52pojie.cn/forum/202605/17/123821i44x6rrlwa422wqr.png)

返回结果中我们需要的是 data[“tk”] 到此第二个包分析就结束了 接下来是第三个数据包
**3：get(功能为获取图片，涉及部分环境加密，非常简单)**
还是一样先看请求提交内容

![](https://attach.52pojie.cn/forum/202605/17/123823zilcnwppccl9xlzb.png)

上层传入的参数有(dt,irToken,id)需要加密的参数有(fp,cb)我们先解决简单的cb这个没有环境相关的东西只需要扣出来代码即可通过搜索 定位到生成位置 会发现有好几个一样的生成位置应该是分别对应不同的类型 如点选等等 所以我们需要在每一个搜到的地方都打上断点让他断下

![](https://attach.52pojie.cn/forum/202605/17/123825p3rvatxvsgnvox4t.png)

断下后进入这个方法内，根据缺啥扣啥的方式将这个代码扣出来即可，没什么好讲的，能运行出结果了就是正确的了。

接下来是fp，稍微比cb要麻烦点 我们跟到最上层后发现最后值是给了window.gdxidpyhxde那么就直接用油猴插件进行定位了
(function() {
    console.log('拦截启动')
    Object.defineProperty(window, 'gdxidpyhxde', {
        set: function(v) {
            console.log('拦截到值:', v);
            debugger;
        },
        configurable: true
    });
})();
找到了就简单了 我们直接把这个方法扣下来即可，这个方法会有取环境的一些动作 具体是否效验环境没做太多研究，直接将第二个包的环境复制过来就行了。然后就是返回数据

![](https://attach.52pojie.cn/forum/202605/17/123827z778347666f3o3z6.png)

返回数据中bg为背景图，front为滑块图，token是最后一步需要的需要的参数总结(bg,front,token)
**4：check(提交结果，比较简单)**先看提交信息

![](https://attach.52pojie.cn/forum/202605/17/123830qylzztysllwru9ro.png)

分析结果 需要传入的参数(dt，id，token)需要加密的参数(cb，data)cb就是第三步我们扣出来的方法执行出来的结果，这个就不再讲了主要讲data参数Data看着很长实际我们将他分开后会发现参数并不多

    data={
        'd': d,
        'm': '',
        'p': p,
        'f': f,
        'ext': ext
        }
一共就4个参数 我们一个个分析 首先是d 通过跟栈发现d的参数是执行的\_0x1b7568["sample"](this["traceData"], \_0x27edd5)

![](https://attach.52pojie.cn/forum/202605/17/123832nt1gr0rgfrcqkfcq.png)

但是在这方法内没看见traceData的赋值 所以我们向上找 发现在这里赋值

![](https://attach.52pojie.cn/forum/202605/17/123834zocdzoongmecooop.png)

我们打上断点看看他是怎么操作的

![](https://attach.52pojie.cn/forum/202605/17/123836b2s5yns8wpqeaneu.png)

看来是先生成了一个数组x,y,time,1一共4个参数
然后经过加密再push进traceData数组内也就是说我们需要扣出来\_0x564a9f这个加密方法 参数1为第三步取回的结果token，参数2为上面数组的文本型，也就是7,0,71,1 那么第一步的加密我们就分析清楚了\_0x4a4a62 = \_0x1b7568["sample"](this["traceData"], \_0x27edd5)现在traceData有了然后再扣出来\_0x1b7568["sample"]这个方法就取到最终加密所需要的参数了 接下来回到\_0xa8a0c6(\_0x4a4a62['join'](':'))这个位置现在就需要抠出来\_0xa8a0c6的加密即可 这里都没有环境效验 只需要扣出来能执行出结果即为正确加密。这里就是最终加密 到此d结束

接下来是p，p比较简单0xa8a0c6(\_0x564a9f(\_0x319bb4, parseInt(this['$jigsaw']["style"]['left'], 0xa) / this["width"] \* 0x64 + ''))进去将parseInt(this['$jigsaw']["style"]['left'], 0xa)这个方法扣出来即可加密方式也和d一样 是2层 方法也一样，先用token加密一遍后面的计算出来的结果 再进行最终加密

接下来是f，f则是将d的轨迹 先用方法进行了处理 扣出方法即可没什么特别好讲的 他们加密都是一样的 2层

接下来是ext，\_0xa8a0c6(\_0x564a9f(\_0x319bb4, this['mouseDownCounts'] + ',' + this['traceData']['length'])) \_0x319bb4=token，this['mouseDownCounts']=鼠标按下次数这里是1+“，”+轨迹数量  然后通过上面一样的2层加密 。到此易盾最新版就结束了。
**第四步需要注意的点****拿到的底图是480宽度的，但是在代码内实际计算滑动距离却是420 所以我们需要对图片进行处理 要缩放到420，210 代码如下**

    res=requests.get(imgurl,headers=headers)
    img=res.content
    img\_data = io.BytesIO(res.content)
    img = Image.open(img\_data)
    img = img.resize((420, 210), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90)
    image\_data=base64.b64encode(buffer.getvalue()).decode('utf-8')
    meta = 'True'
    secret\_key = ''
    type\_id = '2000'
    # 准备请求数据
    data = {
        'secret\_key': secret\_key,
        'type\_id': type\_id,
        'image': image\_data,
        'meta':meta
    }

    # 发送请求
    response = requests.post(
        'http://api.yydsocr.com/verify\_api',
        json=data,
        headers={'Content-Type': 'application/json'}
    )

    # 处理响应
    if response.status\_code == 200:
        result = response.json()
        print('识别结果:', result)
        print('data内容:', result['data']['data'])
        return True,result['data']['data']
    else:
        print('请求失败:', response.text)
        return False,None

运行结果展示：

![](https://attach.52pojie.cn/forum/202605/17/123838pd07t3cgcj2xg300.png)

我这里使用的是识别平台进行识别，因为后台有结果预览方便判断坐标是否正确，我这里用的是元识AI平台进行识别，目前正在做活动，每个人免费可得50元额度，反正能白嫖就懒得写识别代码了。

下面是我的轨迹算法

def generate\_trajectory\_fixed(target\_x):
    num\_points = max(45, int(target\_x / 1.5) + 20)
    trajectory = []
    current\_x = current\_y = 0
    current\_time = 67

    current\_time += random.randint(20, 50)

    overshoot = target\_x \* random.uniform(0.08, 0.18)
    max\_x = target\_x + overshoot

    for i in range(num\_points):
        progress = i / (num\_points - 1)

        if progress < 0.7:
            speed\_factor = 1.0 - (progress \* 0.3)
            time\_inc = random.uniform(7, 9)
        else:
            speed\_factor = 0.3 + ((progress - 0.7) \* 0.5)
            time\_inc = random.uniform(12, 20)

        if random.random() < 0.05:
            time\_inc += random.uniform(15, 40)

        if progress < 0.75:
            target\_x\_now = max\_x \* (progress / 0.75)
        else:
            retreat\_progress = (progress - 0.75) / 0.25
            target\_x\_now = max\_x - (overshoot \* retreat\_progress)

        x\_offset = random.uniform(-2, 2) \* (1 - abs(progress - 0.5))
        current\_x = target\_x\_now + x\_offset

        y\_base = math.sin(progress \* 10) \* 2
        y\_noise = random.uniform(-1.5, 1.5) \* (0.5 + 0.5 \* progress)
        current\_y = y\_base + y\_noise

        current\_time += time\_inc

        trajectory.append([
            int(round(current\_x)),
            int(round(current\_y)),
            int(round(current\_time)),
            1
        ])

    trajectory[-1][0] = target\_x
    trajectory[-1][1] = int(round(current\_y))

    return trajectory

只需要将识别结果+20像素，然后通过我的轨迹生成代码生成轨迹即可。至于为什么要+20像素，因为每个平台识别出来位置都不同。所以不是用同一个识别平台就不要乱加了。
