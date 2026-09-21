# 慢脚ai全链路js分析补环境

> **作者**: 过往233 | **发布时间**: 2026-03-18 00:15:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4067 / 34
> **原文**: [https://www.52pojie.cn/thread-2097554-1-1.html](https://www.52pojie.cn/thread-2097554-1-1.html)

---

*本帖最后由 过往233 于 2026-3-18 00:16 编辑*

个人感悟：我不清楚本次平台的加密属于哪一种（我甚至连js都懒得看一眼），可能对于某些大佬来说也就一两个小时的事？但是对于一些新人，尤其是我这种刚学会补环境的小白来说，属于是有点吓人了。
全程我就开始说了让他自己逆向整个商品链接的js，他就自己工作打点，收集信息，补环境运行js，调试测试，打点收集。
以至于我第二句话回复ai是因为他没登陆？！需要登陆才能确认是否成功
剩下的大家慢慢看吧，这是我让ai对于全部上下文做的总结以及一些踩坑点

最后说一下我对目前行业的焦虑点，希望各位大佬能够指点一下:
1.随着ai功能的越来越强大，skill，mcp的越来越多，可能暂时还是不会被替代，但是随着大模型的进一步更新又会出现啥呢？
2.安全厂商会不会也使用大模型进行加固，最后变成token战争呢？
3.ai会不会朝向网络安全方面走呢？会不会逆向工程师最后也会和前端一样呢？
4.以后会不会变成风控对抗+ai加固js格式
5.现在会不会是整个行业的绝唱呢？

## 记录美好生活

### 目标

逆向慢脚小店（）的签名机制，在 Node.js 中生成 `__NS_hxfalcon` 签名，
配合 Python 请求获取店铺全部商品数据。不使用浏览器自动化，纯 JS 补环境 + Python 桥接。

### 最终成果

```
快手小店/
├── env.js          # 浏览器环境补全
├── jose_404.js     # Jose 签名虚拟机（从 CDN 下载的原始 JS）
├── bridge.js       # Node.js 桥接，生成全部签名参数
├── request.py      # Python 请求脚本，调用 bridge.js 签名后请求 API
└── shop_goods_result.json  # 输出的商品数据
```

---

### 第一阶段：信息收集与接口分析

#### 1.1 使用 Agent 子代理并行分析

一开始面对的是一个 URL：`手动打码`

我同时启动了 3 个 Agent 子代理并行工作：

```
Agent 1 (general-purpose): 用 WebFetch 获取页面 HTML，分析 JS 资源、API 端点、反爬机制
Agent 2 (Explore):         扫描本地代码库，找到已有的快手逆向代码（ks_did.js、rpc/1.py 等）
Agent 3 (general-purpose): 分析商品列表 API、分页参数、请求签名方式
```

**关键发现：**

* 页面加载了两类安全 JS：
  + `kwf-0.0.2.js` — 设备指纹采集 SDK
  + `kws-11-0.0.1-obfuscated.js` — 混淆后的安全 SDK
* 反爬有三层：
  + URL 参数级：`__NS_hxfalcon` 签名
  + Header 级：`kww`（AES-CBC 加密的指纹）
  + Cookie 级：`kwssectoken` + `kwscode`
* 本地已有 `ks_did.js` 实现了 `kww` 的生成逻辑

#### 1.2 使用 Chrome DevTools MCP 抓包

用 `mcp__chrome-devtools` 工具直接操控浏览器：

```
mcp__chrome-devtools__navigate_page  → 打开慢脚小店页面
mcp__chrome-devtools__list_network_requests → 抓取 XHR/Fetch 请求
mcp__chrome-devtools__get_network_request   → 查看请求详情（headers、body、response）
```

**遇到的问题：** HeadlessChrome 被慢脚检测，主站的 XHR 请求完全不发出。
但 `kwaixiaodian.com` 域名下的请求正常，抓到了关键接口和 Cookie 结构。

#### 1.3 Python 直接探测接口

放弃浏览器抓包后，改用 Python requests 直接探测：

```
# 测试各种可能的 URL 和接口
urls = [
    '手动打码',  # 域名不存在
    '手动打码',  # result:109 需要登录
]
```

**关键结论：**

* `app.kwaixiaodian.com` 的商品接口需要登录（result:109）
* `/gateway/` 开头的接口返回"服务异常"而非 404，说明接口存在但缺少签名
* 快手主站 GraphQL 不支持商品查询

---

### 第二阶段：前端 JS 逆向分析

#### 2.1 下载并分析商品详情页 JS

先获取商品详情页的 HTML，提取所有 JS 资源：

```
r = requests.get('手动打码')
# 提取 <script src="..."> 标签
```

得到关键 JS 文件列表：

```
kwaishop-goods-detail-page-app/
├── polyfill.841e8fb4.js
├── lodash.1babe60e.js
├── axios_qs.b9db7422.js
├── vendor.f0d8f45b.js      ← 包含签名模块 23121
├── lib-es.484b64a2.js      ← 包含请求拦截器和 hxfalcon 逻辑
├── kmi.40a4c80e.js          ← 主入口 bundle，包含 API 路径
└── 404.e9ee8b33.async.js    ← Jose 虚拟机（异步加载）
```

#### 2.2 分析 kmi.js — 找到 API 路径和签名入口

用 Python 下载 `kmi.js`（220KB），用正则搜索 API 路径：

```
api_patterns = re.findall(r'["\']([^"\']*(?:componentized|detail|goods|product)[^"\']*)["\']', kmi_js)
```

**找到的关键接口：**

```
/rest/app/kwaishop/product/c/detail/h5/componentized   ← C端商品详情
/rest/pc/product/c/internal/detail/h5/componentized     ← PC端内部详情
/rest/app/kwaishop/product/c/snapshot/detail             ← 快照详情
/rest/app/kwaishop/product/c/activity/progress           ← 活动进度
```

**找到签名拦截器入口：**

```
// kmi.js 中的关键代码
var fr = f(23121);  // 签名模块
var gr = t.request.create({
    businessName: "web_merchant",
    useSig4: !!location.hostname.includes("app.kwaixiaodian.com")
});
gr.interceptors.request.use(fr.z$);  // z$ 就是签名拦截器
```

这告诉我们：

* 模块 `23121`（在 vendor.js 中）导出了 `z$`（kww 签名拦截器）和 `n5`（初始化函数）
* `useSig4: true` 表示会启用 `__NS_hxfalcon` 签名

#### 2.3 分析 vendor.js 模块 23121 — 找到 kwfv1/kwscode 生成逻辑

下载 `vendor.js`（915KB），提取模块 23121（27KB）：

```
idx = vendor.index('23121:function')
rest = vendor[idx:]
module_end = re.search(r'},\d{3,6}:function', rest)
module_code = rest[:module_end.start()+1]
```

在模块中搜索关键常量和函数：

```
// 找到的关键常量
var st = {FINGERPRINT: "kwfv1"};       // Cookie 名
var be = "/s/w/c";                      // 指纹上报路径
var mt = "kwscode";                     // 安全码 Cookie 名
var Me = "kwssectoken";                 // 安全 token Cookie 名
var St = "手动打码";            // 默认 IV
var kt = "手动打码";          // 指纹加密密钥
var Dt = "手动打码";          // 签名加密密钥
```

**找到 `getDefaultData` 函数 — 核心签名生成逻辑：**

```
this.getDefaultData = function() {
    var B = Date.now();
    var K = localStorage.getItem(st.FINGERPRINT);  // kwfv1
    var Z = ke(mt);   // kwscode (从 cookie 读取)
    var ve = ke(Me);  // kwssectoken (从 cookie 读取)
    var je = location.href.slice(0, 80);

    // 生成 kwfv1（指纹）
    if (!K) {
        var yt = encodeURI(je) + "|" + Re(ie.options) + "|" + ie.options.productName + "|" + B + "|" + A(8);
        var ht = G(yt, kt);  // AES-CBC 加密，key = 手动打码
        K = "K" + ht.slice(0,4) + "W" + ht.slice(4,-2) + "F" + ht.slice(-2);
        localStorage.setItem(st.FINGERPRINT, K);
    }

    // 生成 kwscode + kwssectoken
    if (!Z || !ve) {
        ve = A(64);  // 64位随机字符串
        var bt = encodeURI(je) + "|" + Re(ie.options) + "|" + ie.options.productName + "|" + B + "|" + ve.slice(0,8);
        var dr = G(bt, Dt);  // AES-CBC 加密，key = H4tL6rNd3vB9xM5k
        Z = "K" + dr.slice(0,4) + "W" + dr.slice(4,-2) + "S" + dr.slice(-2);
        // 注意：kwscode 格式是 K...W...S..（末尾是S不是F）
    }

    return {encryptedFp: K, encryptedToken: Z, secToken: ve};
};
```

**找到 `z$` 拦截器 — kww header 设置：**

```
var ut = function(se) {
    // 从 localStorage 或 cookie 读取 kwfv1
    var ie = localStorage.getItem(st.FINGERPRINT) || ke(st.FINGERPRINT) || "";
    if (ie) {
        se.headers.kww = ie;  // 设置到请求 header
    }
    return se;
};
```

#### 2.4 分析 lib-es.js — 找到 \_\_NS\_hxfalcon 签名逻辑

下载 `lib-es.js`（329KB），搜索 `hxfalcon`：

```
// lib-es.js 中的 sig4 拦截器
case 2:
    it = yn.sent().Jose;  // 异步加载 Jose 虚拟机
    ct = function(Bn) {
        return new Promise(function($n, Wn) {
            it.call("$encode", [Bn, {
                suc: function(ln, Bt) {
                    $n({signResult: ln, signInput: Bt});
                },
                err: function(ln) { Wn(ln); },
                report: function(ln) { /* 忽略 */ }
            }]);
        });
    };
    // ...
case 3:
    Pn = yn.sent().signResult;
    j.params = {caver: zt, __NS_hxfalcon: Pn};  // 签名结果放到 URL 参数
```

**关键发现：**

* `__NS_hxfalcon` 由 `Jose.call("$encode", ...)` 生成
* Jose 虚拟机通过 `g.e("404").then(g.bind(g, 32986))` 异步加载
* 对应的文件就是 `404.e9ee8b33.async.js`，模块 ID 是 32986
* 输入是 `{url, query, form, requestBody}`，输出通过 `suc` 回调返回签名字符串

#### 2.5 下载 Jose 虚拟机

```
r = requests.get('https://p2-ec.eckwai.com/kos/nlav12333/web-assets/'
                 'kwaishop-goods-detail-page-app/404.e9ee8b33.async.js')
# 54KB，webpack chunk 格式，包含混淆的 VMP 代码
```

Jose 的结构：

```
// 外层：webpack chunk
(self.webpackChunkkwaishop_goods_detail_page_app = ...).push([["404"], {
    32986: function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        // 内层：Jose 自己的 webpack bundle
        var Jose = function(e) {
            var u = {};
            function n(r) { /* 内部模块加载器 */ }
            return n;
        }([ /* 内部模块数组，包含混淆的 VMP 代码 */ ]);

        const __WEBPACK_DEFAULT_EXPORT__ = Jose;
    }
}]);
```

---

### 第三阶段：使用 js-env-vmp-completion Skill 构建补环境

#### 3.1 调用 Skill

这是整个流程中最关键的一步。使用了 `js-env-vmp-completion` skill：

```
Skill(js-env-vmp-completion)
```

这个 skill 专门用于为浏览器侧 JS 或 VMP 混淆代码构建 Node.js 补环境。
它会按照标准化的阶段流程来推进：分析 → 构建环境 → 插桩 → 测试 → 迭代。

**判断模式：** 这是一个 **拦截驱动（intercept-driven）** 任务：

* VMP 文件：`jose_404.js`
* 拦截目标：`Jose.call("$encode", ...)` 的 `suc` 回调返回值
* 需要桥接给 Python 使用

#### 3.2 构建 env.js — 浏览器环境补全

Jose 虚拟机在运行时会访问大量浏览器 API，需要在 Node.js 中模拟。
按优先级依次补全：

```
// 1. 全局对象引用
_window.self = _window;
_window.top = _window;
_window.window = _window;

// 2. location（Jose 会读取 href 用于签名计算）
_window.location = {
    href: 'https://app.kwaixiaodian.com/merchant/shop/detail?id=180434697812',
    origin: 'https://app.kwaixiaodian.com',
    hostname: 'app.kwaixiaodian.com',
    // ...
};

// 3. navigator（设备指纹采集）
_window.navigator = {
    userAgent: 'Mozilla/5.0 ...',
    platform: 'Win32',
    webdriver: false,  // 关键！必须为 false
    // ...
};

// 4. document（DOM 操作桩）
_window.document = {
    cookie: '',
    createElement: function(tag) { /* 返回桩元素 */ },
    // canvas 和 WebGL 桩（指纹采集用）
};

// 5. localStorage / sessionStorage（Jose 会存取 kwfv1）
_window.localStorage = _makeStorage();

// 6. performance（时间探针）
_window.performance = {
    now: function() { return Date.now() - _startTime; },
    timing: { /* 各种时间戳 */ },
};

// 7. crypto（随机数生成）
_window.crypto = {
    getRandomValues: function(arr) {
        const bytes = crypto.randomBytes(arr.length);
        for (let i = 0; i < arr.length; i++) arr[i] = bytes[i];
        return arr;
    },
};

// 8. btoa / atob（Base64 编解码）
_window.btoa = function(s) { return Buffer.from(s, 'binary').toString('base64'); };
_window.atob = function(s) { return Buffer.from(s, 'base64').toString('binary'); };

// 9. Canvas 2D / WebGL 桩（指纹采集）
function _make2dContext() { /* 返回桩对象 */ }
function _makeWebGLContext() {
    return {
        getParameter: function(p) {
            if (p === 37445) return 'Google Inc. (NVIDIA)';
            if (p === 37446) return 'ANGLE (NVIDIA, ...)';
            // ...
        },
        getExtension: function(name) {
            if (name === 'WEBGL_debug_renderer_info')
                return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
        },
    };
}

// 10. 原生函数伪装（反检测）
const _nativeFuncs = new Set();
Function.prototype.toString = function() {
    if (_nativeFuncs.has(this))
        return 'function ' + (this.name || '') + '() { [native code] }';
    return _origToString.call(this);
};

// 11. webpack chunk 容器（Jose 加载时需要）
_window.webpackChunkkwaishop_goods_detail_page_app = [];
```

#### 3.3 构建 bridge.js — 解包 Jose 并桥接 Python

bridge.js 是核心桥接文件，负责：

1. 纯算生成 kwfv1 / kwscode / kwssectoken（AES-CBC）
2. 解包 webpack chunk，提取 Jose 虚拟机
3. 调用 Jose.$encode 生成 \_\_NS\_hxfalcon
4. 通过 stdin/stdout JSON 与 Python 通信

**AES 纯算部分（不需要 Jose）：**

```
const KEY_FP = '手动打码';    // kwfv1 加密密钥
const KEY_SIGN = '手动打码';   // kwscode 加密密钥

function aesEncrypt(plaintext, key) {
    const keyBuf = Buffer.from(key, 'utf-8');
    // AES-128-CBC，key 同时作为 IV
    const cipher = crypto.createCipheriv('aes-128-cbc', keyBuf, keyBuf);
    let encrypted = cipher.update(plaintext, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

// kwfv1 = AES(encodeURI(url)|did|productName|timestamp|random8, KEY_FP)
// 格式：K{前4字符}W{中间}F{末2字符}
const fpPlain = `${encodeURI(href)}|${did}|${productName}|${ts}|${rand8}`;
const fpEnc = aesEncrypt(fpPlain, KEY_FP);
```

**Jose 解包 — 这是最关键的技术难点：**

Jose 被包裹在两层 webpack 中：

* 外层：快手页面的 webpack chunk（通过 `self.webpackChunk...push` 注册）
* 内层：Jose 自己的 webpack bundle（自包含模块系统）

解包策略：

```
function loadJose() {
    const joseCode = fs.readFileSync('jose_404.js', 'utf-8');

    // 步骤1：模拟外层 webpack 依赖
    // Jose 内部依赖两个外部模块：instanceof 和 typeof 的 polyfill
    const externalModules = {
        43816: { _: function(left, right) { return left instanceof right; } },
        52159: { _: function(obj) { return typeof obj; } },
    };

    const fakeRequire = function(id) {
        if (externalModules[id]) return externalModules[id];
        return {};
    };
    // 模拟 webpack 的 r/d 方法
    fakeRequire.r = function(exports) {
        Object.defineProperty(exports, '__esModule', { value: true });
    };
    fakeRequire.d = function(exports, nameOrDef, getter) {
        // 兼容两种调用格式
        if (typeof nameOrDef === 'string') {
            Object.defineProperty(exports, nameOrDef, { enumerable: true, get: getter });
        } else {
            for (const key in nameOrDef) {
                Object.defineProperty(exports, key, { enumerable: true, get: nameOrDef[key] });
            }
        }
    };

    // 步骤2：拦截 webpackChunk push，捕获模块工厂函数
    let moduleFactory = null;
    self.webpackChunkkwaishop_goods_detail_page_app = [];
    self.webpackChunkkwaishop_goods_detail_page_app.push = function(chunk) {
        const modules = chunk[1];
        if (modules && modules[32986]) {
            moduleFactory = modules[32986];
        }
    };

    // 步骤3：执行 jose 代码，触发 push
    const vm = require('vm');
    const script = new vm.Script(joseCode, { filename: 'jose_404.js' });
    script.runInThisContext();

    // 步骤4：执行模块工厂，获取 Jose 类
    // 工厂函数内部会定义 Jose 变量，并通过 fakeRequire.d 挂到 exports 上
    const moduleExports = {};
    moduleFactory({}, moduleExports, fakeRequire);

    return moduleExports.Jose || moduleExports.default;
}
```

**第一次运行遇到的坑：**

```
错误：Jose is not defined
```

原因：最初我在 `fakeRequire.d` 中写了 `{ Jose: () => Jose }`，
但 Jose 是模块工厂内部的局部变量，在 `fakeRequire.d` 执行时还未定义。

**解决方案：** 不要预先注册 getter，让模块工厂自己通过 `fakeRequire.d` 把 Jose 挂到 exports 上。
只需要传入空的 `moduleExports`，工厂函数会自动调用 `__webpack_require__.d(exports, {Jose: () => Jose})`。

**调用 Jose.$encode 生成 hxfalcon：**

```
function generateHxfalcon(Jose, signInput) {
    return new Promise((resolve, reject) => {
        Jose.call('$encode', [signInput, {
            suc: function(signResult, signInputStr) {
                resolve(signResult);  // 签名字符串，格式：HUDR_sFnX-...$HE_...
            },
            err: function(error) {
                reject(new Error('Jose $encode error: ' + error));
            },
            report: function(info) { /* 忽略 */ }
        }]);
    });
}

// signInput 格式
const signInput = {
    url: '/rest/app/kwaishop/product/c/detail/h5/componentized',
    query: {},
    form: {},
    requestBody: { sourceType: 'web', id: '180434697812', itemId: '180434697812' }
};
```

**stdin/stdout 桥接协议：**

```
# Python 调用方式
echo '{"url":"/rest/app/...", "query":{}, "form":{}, "requestBody":{...}}' | node bridge.js

# 输出 JSON
{
    "did": "web_xxx",
    "kwfv1": "KdpNY...",
    "kwscode": "K8Quh...",
    "kwssectoken": "FRSaF...",
    "kwpsecproductname": "goods-detail",
    "caver": "2",
    "hxfalcon": "HUDR_sFnX-...$HE_..."
}
```

---

### 第四阶段：接口验证与数据获取

#### 4.1 验证签名有效性

第一次测试，不带登录 Cookie：

```
# componentized 接口
r = requests.post(url + '?caver=2&__NS_hxfalcon=' + sign['hxfalcon'], ...)
# 返回 result: 109 — 需要登录
# 但签名本身是有效的（没有返回签名错误）
```

加上从浏览器复制的登录 Cookie 后：

```
cookies.update({
    哥哥们cookie就别看了.
})
# 返回 result: 1 — 成功！
```

#### 4.2 发现店铺商品列表接口

从商品详情响应中提取到 `sellerId: 1433840812`，然后探测店铺接口：

```
# 尝试了多种接口和参数格式
# 关键发现：globalParam 用嵌套对象格式（不是 JSON 字符串）时才能成功

# 成功的请求
POST 手动打码
Body: {
    "globalParam": {
        "sellerId": "1433840812",
        "entrance": "moren"
    }
}
# 返回 result: 1，包含 10 个商品的完整数据
```

#### 4.3 商品数据结构

每个商品是一个 `itemCardSwitch` 组件，数据在 `fields.data.itemList[0]` 中：

```
{
    "itemId": 180434697812,
    "titleInfo": {"itemTitle": "蓝月亮薰衣草深层洁净洗衣液4斤套装..."},
    "priceInfo": {
        "itemPrice": "32.9",
        "originalPrice": "",
        "itemSalesDesc": "已售2.4W件"
    },
    "imageInfo": {"imgUrl": "https://p5-ec.ecukwai.com/..."},
    "sellingPointList": [{"content": "去污/去渍"}, {"content": "评价2.3万+条"}],
    "sellingTagList": [{"content": "破损包退"}, {"content": "假一赔十"}],
    "isSoldOut": false,
    "jumpUrl": "https://app.kwaixiaodian.com/merchant/shop/detail?id=..."
}
```

---

### 第五阶段：构建 Python 请求脚本

#### 5.1 request.py 核心流程

```
def get_sign(url_path, request_body):
    """调用 Node.js 生成签名"""
    input_data = json.dumps({"url": url_path, "query": {}, "form": {}, "requestBody": request_body})
    result = subprocess.run(['node', 'bridge.js'], input=input_data, ...)
    return json.loads(result.stdout.strip())

def _make_request(url_path, body):
    """通用签名请求"""
    sign = get_sign(url_path, body)
    full_url = f'https://app.kwaixiaodian.com{url_path}?caver={sign["caver"]}&__NS_hxfalcon={sign["hxfalcon"]}'
    headers = {'kww': sign['kwfv1'], 'kpf': 'PC_WEB', 'kpn': 'unknown', ...}
    cookies = {**sign_cookies, **LOGIN_COOKIE}
    return requests.post(full_url, headers=headers, cookies=cookies, json=body)

def get_shop_goods_list(seller_id):
    """获取店铺全部商品"""
    # 第1页：不带 asyncLoadParam
    data = _make_request('/gateway/app/shop/page/trinity/product/render',
                         {'globalParam': {'sellerId': seller_id, 'entrance': 'moren'}})
    # 第2页：带 asyncLoadParam，limit=100 一次性获取剩余
    data2 = _make_request(url_path, {
        'globalParam': {...},
        'asyncLoadParam': {"cursor": 10, "limit": 100, "sortType": 1, ...}
    })
    # 合并去重
    return list(all_goods.values())
```

---

### 使用的工具和技术总结

#### Claude Code 工具

| 工具 | 用途 |
| --- | --- |
| `Agent (general-purpose)` | 并行分析网站结构、搜索逆向资料 |
| `Agent (Explore)` | 扫描本地代码库，找到已有的快手逆向代码 |
| `Skill (js-env-vmp-completion)` | 按标准化流程构建 JS 补环境 |
| `Bash` | 运行 Python/Node.js 测试脚本 |
| `Read / Write / Edit` | 读写代码文件 |
| `Grep / Glob` | 搜索代码中的关键字和文件 |
| `WebFetch / WebSearch` | 获取网页内容、搜索技术资料 |

#### Chrome DevTools MCP

| 工具 | 用途 |
| --- | --- |
| `navigate_page` | 打开快手小店页面 |
| `list_network_requests` | 抓取 XHR/Fetch 请求列表 |
| `get_network_request` | 查看请求详情（headers、body、response） |
| `take_screenshot` | 截图查看页面状态 |
| `list_pages / select_page` | 管理浏览器标签页 |

#### 关键技术点

1. **webpack chunk 解包**：拦截 `self.webpackChunk...push`，捕获模块工厂函数
2. **AES-128-CBC 纯算**：key 同时作为 IV，生成 kwfv1（K...W...F..）和 kwscode（K...W...S..）
3. **Jose VMP 虚拟机**：通过 `$encode` 方法生成 `__NS_hxfalcon` 签名
4. **浏览器环境补全**：window/document/navigator/canvas/WebGL/crypto/localStorage 等
5. **原生函数伪装**：重写 `Function.prototype.toString` 返回 `[native code]`
6. **stdin/stdout 桥接**：Node.js 和 Python 通过 JSON 管道通信

---

### 踩坑记录

1. **HeadlessChrome 被检测**：慢脚主站对 HeadlessChrome 做了检测，XHR 请求完全不发出。
   解决：放弃浏览器抓包，改用 Python 直接探测接口。
2. **Jose is not defined**：在 `fakeRequire.d` 中预先引用了 Jose 变量，但它是模块工厂内部的局部变量。
   解决：让模块工厂自己把 Jose 挂到 exports 上。
3. **componentized 接口需要登录**：签名正确但返回 result:109。
   解决：从浏览器复制登录 Cookie（kuaishou.shop.b\_st 等）。
4. **trinity/product/render 参数格式**：globalParam 用 JSON 字符串格式返回错误，用嵌套对象格式才成功。
   解决：反复测试不同的参数格式。
5. **分页 cursor 不生效**：filteredList 排除已有商品的方式不起作用。
   解决：用 limit=100 一次性获取全部，配合去重。
6. **180434697812 不是 sellerId**：最初以为 URL 中的 id 是店铺 ID，实际是商品 ID。
   解决：先获取商品详情，从中提取 sellerId，再请求店铺商品列表。
