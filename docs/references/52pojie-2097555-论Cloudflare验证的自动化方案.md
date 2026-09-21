# 论Cloudflare验证的自动化方案

> **作者**: 仿佛_一念成佛 | **发布时间**: 2026-03-18 00:20:00 | **版块**: 『编程语言区』 | **查看/回复**: 2922 / 36
> **原文**: [https://www.52pojie.cn/thread-2097555-1-1.html](https://www.52pojie.cn/thread-2097555-1-1.html)

---

最近又开始了爬虫，写爬虫很快乐，但是有验证码就不快乐了。一个很有名的验证服务商就是Cloudflare，简称cf盾，又叫五秒盾

最开始的时候，我尝试不知死活的去逆向一下js，一天过去，一点进展都没有，这条路还是太难了。

第二天，我打算用DrissionPage来进行过这个五秒盾。这个库文档都写的很全，马上就上手了，我就着手准备去过盾了。

既然要过盾那么肯定要先定位到盾在哪里吧？审查元素了半天，发现TM的根本就定位不到，什么Div啥的根本就定位不到，我日啊。不过功夫不负有心人，网上有现成的，那我这么辛苦来定位这么几个元素到底是为了什么啊？？我日您

```
def cf_click(page):
    challengeSolution = page.ele("@name=cf-turnstile-response")
    challengeWrapper = challengeSolution.parent()
    challengeIframe = challengeWrapper.shadow_root.ele("tag:iframe")
    challengeIframeBody = challengeIframe.ele("tag:body").shadow_root
    challengeButton = challengeIframeBody.ele("tag:input")
    challengeButton.click()
```

定位到了是吧？那我是不是可以开始点击了，欸你猜怎么着？虽然点击了，但是根本过不去啊哈哈哈哈哈哈哈哈哈哈

我不信邪，写了个死循环去无限点击，哈哈哈哈哈哈哈哈哈哈哈IP被封掉了，我日您。

IP被封掉难道就能拦得住我吗？怎么可能，我可是爬虫小能手，上一点小钱，整个代理！

有了代理后我还怕你封我？你封我啊来啊哈哈哈哈哈哈哈，封了我就换一个。

回到五秒盾上，既然自动点击不成，那我模拟鼠标不久好了，欸很快啊，我用pyautogui来模拟鼠标，定位盾的那个box框框上，我点击一下不久好了，事实证明，还真可以啊。直接叫claude帮我的代码优化一下，最后就变成了这样子，只需要传入x和y就好了，其他的交给天意！

唯一美中不足的就是浏览器需要在前台，不然点击不到框框啊！！

而且每隔几分钟就控制我的鼠标去干框框，我受不了啊！！

```
def human_like_mouse_click(
    target_x, target_y, control_points=1, steps=50, base_duration=0.00001
):
    """
    模拟人类鼠标移动并点击指定位置

    参数:
        target_x: 目标x坐标
        target_y: 目标y坐标
        control_points: 贝塞尔曲线控制点数量
        steps: 移动路径点数
        base_duration: 基础移动时间
    """
    # 获取当前鼠标位置
    current_x, current_y = pyautogui.position()
    print(f"当前鼠标位置: {current_x}, {current_y}")
    print(f"目标位置: {target_x}, {target_y}")

    def generate_bezier_points(start_x, start_y, end_x, end_y, control_points=2):
        points = []
        # 生成控制点
        control_x = [start_x]
        control_y = [start_y]
        for i in range(control_points):
            # 在起点和终点之间随机生成控制点
            control_x.append(
                start_x
                + (end_x - start_x) * (i + 1) / (control_points + 1)
                + random.randint(-100, 100)
            )
            control_y.append(
                start_y
                + (end_y - start_y) * (i + 1) / (control_points + 1)
                + random.randint(-100, 100)
            )
        control_x.append(end_x)
        control_y.append(end_y)

        # 生成贝塞尔曲线上的点
        for t in range(steps + 1):
            t = t / steps
            x = y = 0
            n = len(control_x) - 1
            for i in range(n + 1):
                binomial = math.comb(n, i)
                x += binomial * (1 - t) ** (n - i) * t**i * control_x[i]
                y += binomial * (1 - t) ** (n - i) * t**i * control_y[i]
            points.append((x, y))
        return points

    # 生成路径点
    path_points = generate_bezier_points(current_x, current_y, target_x, target_y)

    # 计算总距离
    total_distance = math.sqrt(
        (target_x - current_x) ** 2 + (target_y - current_y) ** 2
    )
    # 根据距离调整移动速度
    duration = min(0.001, base_duration * (total_distance / 1000))

    # 沿着路径移动鼠标
    for point in path_points:
        # 添加更小的随机偏移，使移动更平滑
        offset_x = random.uniform(-1, 1)
        offset_y = random.uniform(-1, 1)
        pyautogui.moveTo(point[0] + offset_x, point[1] + offset_y, duration=duration)

    # 短暂等待以确保窗口准备就绪
    time.sleep(0.5)

    # 点击
    pyautogui.click()

    # 短暂等待以确保点击完成
    time.sleep(0.1)

    # 将鼠标移回初始位置
    pyautogui.moveTo(current_x, current_y, duration=base_duration)
```

到这里就结束了吗？难道就要燃尽了吗？可恶啊，别小看我和Claude之间的羁绊啊！！

很快啊，我又找到了一个神奇的玩意，靠他我居然可以自动点击，而不用去操纵鼠标，呜呜呜老天有眼啊

<https://github.com/TheFalloutOf76/CDP-bug-MouseEvent-.screenX-.screenY-patcher>

通过它我成功的去点击了五秒盾，并且成功的过去了，虽然我也不知道是什么原理，但就是这么神奇的事啊，啊！多么美化啊

回到开头的那个函数（其实我是直接复制过来的），咱们将它恢复原样。欸，可以了，五秒盾还拦得住我吗？区区小盾，不过如此

```
def getTurnstileToken():
    page.run_js("try { turnstile.reset() } catch(e) { }")

    turnstileResponse = None

    for i in range(0, 5):
        try:
            turnstileResponse = page.run_js(
                "try { return turnstile.getResponse() } catch(e) { return null }"
            )
            if turnstileResponse:
                return turnstileResponse

            challengeSolution = page.ele("@name=cf-turnstile-response")
            challengeWrapper = challengeSolution.parent()
            challengeIframe = challengeWrapper.shadow_root.ele("tag:iframe")
            challengeIframeBody = challengeIframe.ele("tag:body").shadow_root
            challengeButton = challengeIframeBody.ele("tag:input")
            challengeButton.click()
        except:
            pass
        time.sleep(1)
```

这里的函数里的turnstileResponse变量不知道为啥获取不了，我研究了大半天也不知道这个是干啥的，本着能用就不去修改的情况下，就不改了。

有没有大佬知道这个是干啥的？

比起这个turnstile，另外一个cookie是cf\_clearance，有了这个后，我直接一个requests，谁还拦得住我？还有谁？

最后附上几个函数，用来给Chrome添加插件。

```
def extract_zip_extension(zip_path: str) -> str:
    """
    解压zip格式的插件文件
    :param zip_path: zip文件的路径
    :return: 解压后的目录路径
    """
    # 创建临时目录
    temp_dir = tempfile.mkdtemp()

    # 解压文件
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(temp_dir)

    return temp_dir
```

这里我添加了一个Proxy插件，用来和代理进行连接

```
def create_proxy_auth_extension(
    proxy_host,
    proxy_port,
    proxy_username,
    proxy_password,
    scheme="http",
    plugin_path=None,
):
    # 创建Chrome插件的manifest.json文件内容
    manifest_json = """
    {
        "version": "1.0.0",
        "manifest_version": 2,
        "name": "16YUN Proxy",
        "permissions": [
            "proxy",
            "tabs",
            "unlimitedStorage",
            "storage",
            "<all_urls>",
            "webRequest",
            "webRequestBlocking"
        ],
        "background": {
            "scripts": ["background.js"]
        },
        "minimum_chrome_version":"22.0.0"
    }
    """

    # 创建Chrome插件的background.js文件内容
    background_js = string.Template(
        """
        var config = {
            mode: "fixed_servers",
            rules: {
                singleProxy: {
                    scheme: "${scheme}",
                    host: "${host}",
                    port: parseInt(${port})
                },
                bypassList: ["localhost"]
            }
        };

        chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});

        function callbackFn(details) {
            return {
                authCredentials: {
                    username: "${username}",
                    password: "${password}"
                }
            };
        }

        chrome.webRequest.onAuthRequired.addListener(
            callbackFn,
            {urls: ["<all_urls>"]},
            ['blocking']
        );
        """
    ).substitute(
        host=proxy_host,
        port=proxy_port,
        username=proxy_username,
        password=proxy_password,
        scheme=scheme,
    )

    # 创建插件目录并写入manifest.json和background.js文件
    os.makedirs(plugin_path, exist_ok=True)
    with open(os.path.join(plugin_path, "manifest.json"), "w+") as f:
        f.write(manifest_json)
    with open(os.path.join(plugin_path, "background.js"), "w+") as f:
        f.write(background_js)

    return os.path.join(plugin_path)
```

```
def setup_browser(extensions: List[str] = None):
    """
    设置浏览器配置，支持添加多个插件
    :param extensions: 插件路径列表，支持.crx文件、解压后的目录或.zip文件
    :return: ChromiumPage实例
    """
    co = ChromiumOptions()

    # 添加代理插件
    proxy_auth_plugin_path = create_proxy_auth_extension(
        plugin_path="/tmp/111",
        proxy_host=proxyHost,
        proxy_port=proxyPort,
        proxy_username=proxyUser,
        proxy_password=proxyPass,
    )
    turnstilePatch = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "turnstilePatch")
    )
    co.add_extension(path=proxy_auth_plugin_path)
    co.add_extension(path=turnstilePatch)

    # 添加其他插件
    if extensions:
        for extension_path in extensions:
            if extension_path.lower().endswith(".zip"):
                # 如果是zip文件，先解压
                extension_path = extract_zip_extension(extension_path)
            co.add_extension(path=extension_path)

    return ChromiumPage(co)
```

这是用法，比如我添加了一个去广告的和上面的proxy插件

```
extensions = ["uBlock0.chromium"]  # 解压后的目录
page = setup_browser(extensions)
```
