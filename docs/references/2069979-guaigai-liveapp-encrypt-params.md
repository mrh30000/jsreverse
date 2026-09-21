# 某乖生活app桶自洁接口加密参数分析

> **作者**: fryant | **发布时间**: 2025-11-04 20:46:00 | **版块**: 『移动安全区』 | **查看/回复**: 3286 / 51
> **原文**: [https://www.52pojie.cn/thread-2069979-1-1.html](https://www.52pojie.cn/thread-2069979-1-1.html)

---

## **[Android逆向] 某乖生活app桶自洁接口加密参数分析**

## **0x00 概述**

针对某乖生活桶自洁下单问题，本文研究了app的下单接口并编写了自动在每日早上6:00批量对洗衣房机器桶自洁的实现。阅读本文你将会学习到如何抓包，脱壳，反编译，加密还原等逆向技术。本文仅用于学习交流，严禁用于非法用途。

**关键词**： frida, 360加固, jadx, 脱壳, reqable, Android逆向

## 0x01 缘起

在上海实习三个多月，回学校宿舍后，闻到柜子里一股霉味，于是将衣服拿出，走进宿舍的洗衣房发现，稍微干净一点的洗衣机都在工作中，只剩下脏乱差的洗衣机敞开着门，经过两遍桶自洁效果依旧微乎其微，心里反问，为什么供应商不在每日固定时间实现以下桶自洁，这样不是更干净吗？于是一怒之下，供应商不干的，我来干。

## 0x02 环境

* frida 16.2.1
* jadx-gui 1.5.3
* 某乖生活 1.96.1
* 红米note9 (root+magisk+lsposed)

其中，frida网上的教程很多，不再赘述，只需要注意的是，使用魔改过的frida，以便绕过检测，例如https://github.com/taisuii/rusda

## 0x03 抓包

工具 ： reqable      官网地址 <https://reqable.com/zh-CN/>

![](https://attach.52pojie.cn/forum/202511/05/122039hmmw7spwpp8p8wr9.png)

使用方法也相对简单，采用电脑端+手机端结合的方式，方便分析，手机端需要刷入面具模块，如下

![](https://attach.52pojie.cn/forum/202511/05/122128ufol5gxhzgjweomr.png)

直接开始抓包

![](https://attach.52pojie.cn/forum/202511/05/122146pfsigvk22v591v3r.png)

有如下结果

`/goods/scan/v2`：扫描机器上的二维码，获取设备信息

`/goods/normal/details`：获取洗衣机详细信息

`/goods/normal/skus`：获取洗衣方式（包括桶自洁

`/trade/create`：订单创建，待支付状态

`/pay/unify/pay`：订单支付，启动洗衣机桶自洁

再看请求头，Authorization为登录的账号token，imei为接口返回，cookie不带即可，其中sign和orderRiskSign是检验参数

![](https://attach.52pojie.cn/forum/202511/05/122158kbntrgkgnnn2alpl.png)

再看请求体，goodsId为设备id，skuId为洗衣方式的id，orgId可能是学校id

![](https://attach.52pojie.cn/forum/202511/05/122210rh252hh2l6mm522j.png)

对此，对app的逆向任务也有了小小的收获，接下来就是脱壳，反编译，还原加密参数。

## 0x04 脱壳 反编译

说到脱壳，首先想到的一定是大名鼎鼎的frida-dexdump，他的核心逻辑是

​        `attach 到目标进程` → `hook dex2oat 或 LoadDex` → `从内存中读取 DEX 数据` → `保存到本地`。

使用也相对简单，直接 `pip install frida-dexdump`即可

### 手机端启动frida-server

在终端执行`adb shell`，

再执行`su`提权，

把刚才下载的魔改frida放到`/data/local/tmp`下，

执行`chmod 777 ./fida`授权，

再执行`./fida`，这里终端阻塞就是在运行

![](https://attach.52pojie.cn/forum/202511/05/122245kgj0n1s7yt0001yw.png)

### frida-dexdump脱壳

#### 安装

终端执行`pip install frida-dexdump`，即可安装（推荐使用conda创建完虚拟环境，在虚拟环境中安装，因为在逆向任务中，可能会使用到不同版本的frida）

#### 脱壳

执行`frida-dexdump -U -f com.qiekj.user`

这里就遇到问题了，报错

![](https://attach.52pojie.cn/forum/202511/05/122256ejj6sb1ee15bjeza.png)

经分析，发现目标app采用360加固，而这种加固方式，通过反调试、内存保护、动态解密与映射机制阻止 Frida 或内存读访问，进而使逆向人员难以达到拿到关键dex。

```
Error: access violation accessing 0x7140a2d000
```

这个意思是：

> Frida 尝试读取该地址的内存区域（被认为是 DEX 起始地址）时，被内核拒绝访问（即访问无效页或被 360 自定义 mmap/unmap 掉的区域）。

360 加固使用了动态内存保护 / mmap 解密：360 会把 DEX 文件放在一个加密的内存段中，并在使用时才临时 `mmap` 或 `memcpy` 解密到一块区域，调用完后立即释放或替换为不可读页。
因此，`frida-dexdump` 在扫描时能识别地址，但读的时候就 **已经被卸载或保护掉**，从而报 access violation。

这里卡了笔者一段时间，因为也测试了别的dexdump工具，均未果，最终终于找到了一款神器：DITOR

### DITOR脱壳

DITOR是一款用于 Android 应用程序逆向分析的脱壳工具。其核心功能是动态解密（脱壳）被加固保护的 App，从而使其代码可被常规的逆向分析工具（如 Jadx、GDA 等）读取。乐享网黑鹰分享的v3.5适配版是基于MT论坛大神 @Kill\_Log 的教程进行修改版本。该修改版的主要改进在于将 empty.jar 文件属性设置为只读，从而成功解决了原版在 Android 14 及以上系统中运行时出现的兼容性问题。因此，此版本是少数能有效支持 Android 14+ 系统的脱壳工具之一，对于从事最新版本安卓应用安全研究和逆向分析的工作者来说非常实用的。

[[DITOR v3.5 适配版-支持Android14+ 强大逆向脱壳工具](https://www.lxapk.com/6861.html)](https://www.lxapk.com/6861.html)

使用方法也相对简单，安装完成后，在lsposed中启用模块并勾选目标app

![](https://attach.52pojie.cn/forum/202511/05/122326epnymefq2pfss44x.png)

点击右下角设置图标打开DITOR，依次点击`360加固模式`，搜索`生活`，点击目标app

![](https://attach.52pojie.cn/forum/202511/05/122346mparj16pdtojgpzp.png)

完成后会在本地`/data/data/com.qiekj.user/files/`下生成`cookie_dump`目录，即脱出来的dex目录，将dex打包，通过adb pull拉到电脑端

读者在这里会不会有一个疑问，为什么frida-dexdump脱壳不成功的（无论是是否加-f），DITOR却可以脱壳成功？

这里就不得不提及一下Frida-dexdump 与 DITOR 在脱壳原理上的差异，借助万能的GPT，如下

![](https://attach.52pojie.cn/forum/202511/05/122400lh3pcsixepcxqhhx.png)

简短一句话总结：**360 加固通过检测注入/调试、将 dex 以原生加密 blob 或自定义 ClassLoader 的方式在短时窗口内解密并碎片化/映射内存、并在 native 层实施拦截与完整性校验，导致基于 Frida 的 frida-dexdump 很难在合适时机或可见位置找到完整 dex；而 DITOR 成功率高通常是因为它采用了更低层（native/内存重建）和多路径的取证策略，不完全依赖单一的 Frida hook。**

## 反编译

反编译采用的工具是jadx-gui，版本为1.5.3（老版本也可以，新版本功能多一些，我个人比较喜欢）

将拿到的dex使用jadx打开，会报错

![](https://attach.52pojie.cn/forum/202511/05/122412cyvnvxwzwbfcbyx9.png)

这是因为jadx默认会校验dex的checksum，解决方法如下

点击`文件`→`首选项`→`插件`→`dex input` 取消勾选，就可以正常打开了

![](https://attach.52pojie.cn/forum/202511/05/122422pw22yevccncn4228.png)

## 0x05还原加密参数sign

左下角进度条加载完之后，不妨直接用搜索大法，`sign`结果肯定很多，搜索`orderRiskSign`

![](https://attach.52pojie.cn/forum/202511/05/122435hhxjjuhqcrtjhjhu.png)

只有一个结果，根据类名也很容易判断出，是请求头的拦截器

```
public class HeadInterceptor implements Interceptor {
    private static final String LOCATION_SECRET = "nFU9pbG8YQoAe1kFh+E7eyrdlSLglwEJeA0wwHB1j5o=";
    private static final String secret = new String(Base64.decode("bkZVOXBiRzhZUW9BZTFrRmgrRTdleXJkbFNMZ2x3RUplQTB3d0hCMWo1bz0=", 0));

    @Override // okhttp3.Interceptor
    public Response intercept(Interceptor.Chain chain) throws NoSuchAlgorithmException, IOException {
        String strByte2HexSHA;
        Request request = chain.request();
        String str = "";
        String token = !TextUtils.isEmpty(CacheUtil.INSTANCE.getToken()) ? CacheUtil.INSTANCE.getToken() : "";
        String strValueOf = String.valueOf(System.currentTimeMillis());
        try {
            MessageDigest messageDigest = MessageDigest.getInstance(MessageDigestAlgorithms.SHA_256);
            messageDigest.update(("appSecret=" + secret + "&channel=android_app×tamp=" + strValueOf + "&token=" + token + "&version=" + AppUtils.getAppVersionName() + "&" + request.url().encodedPath()).getBytes(StandardCharsets.UTF_8));
            strByte2HexSHA = byte2HexSHA(messageDigest.digest());
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
            strByte2HexSHA = "";
        }
        Request.Builder builderHeader = request.newBuilder().header(HttpHeaders.AUTHORIZATION, token).header(e.g, AppUtils.getAppVersionName()).header("channel", PgAdSdk.APP_CHANNEL).header("phoneBrand", BrandUtils.INSTANCE.getDeviceBrand()).header(a.k, strValueOf).header("sign", strByte2HexSHA);
        if ("/goods/shower/unlock".equals(request.url().encodedPath()) || "/goods/water/unlock".equals(request.url().encodedPath()) || "/trade/create".equals(request.url().encodedPath())) {
            String strHeader = request.header("categoryCode");
            String strHeader2 = request.header("imei");
            String strHeader3 = request.header(UContent.C);
            String strHeader4 = request.header(UContent.D);
            try {
                MessageDigest messageDigest2 = MessageDigest.getInstance(MessageDigestAlgorithms.SHA_256);
                messageDigest2.update(("appSecret=nFU9pbG8YQoAe1kFh+E7eyrdlSLglwEJeA0wwHB1j5o=&categoryCode=" + strHeader + "&channel=android_app&imei=" + strHeader2 + "&lat=" + strHeader3 + "&lng=" + strHeader4 + "×tamp=" + strValueOf + "&token=" + token + "&version=" + AppUtils.getAppVersionName() + "&" + request.url().encodedPath()).getBytes(StandardCharsets.UTF_8));
                builderHeader.header("orderRiskSign", byte2HexSHA(messageDigest2.digest()));
                builderHeader.header("orderRiskTimestamp", strValueOf);
            } catch (NoSuchAlgorithmException e2) {
                e2.printStackTrace();
            }
        }
        if ((request.body() instanceof FormBody) || (request.body() instanceof RequestBody)) {
            FormBody.Builder builder = new FormBody.Builder();
            if (!token.isEmpty()) {
                builder.add("token", token);
            }
            FormBody formBodyBuild = builder.build();
            String strBodyToString = bodyToString(request.body());
            StringBuilder sb = new StringBuilder();
            sb.append(strBodyToString);
            if (strBodyToString.length() > 0 && !token.isEmpty()) {
                str = "&";
            }
            sb.append(str);
            sb.append(bodyToString(formBodyBuild));
            builderHeader.method(request.method(), RequestBody.create(MediaType.parse("application/x-www-form-urlencoded;charset=UTF-8"), sb.toString()));
        }
        return chain.proceed(builderHeader.build());
    }

    private static String bodyToString(RequestBody requestBody) {
        try {
            Buffer buffer = new Buffer();
            if (requestBody != null) {
                requestBody.writeTo(buffer);
                return buffer.readUtf8();
            }
            return "";
        } catch (IOException unused) {
            return "did not work";
        }
    }

    private static String byte2HexSHA(byte[] bArr) {
        StringBuffer stringBuffer = new StringBuffer();
        for (byte b : bArr) {
            String hexString = Integer.toHexString(b & 255);
            if (hexString.length() == 1) {
                stringBuffer.append("0");
            }
            stringBuffer.append(hexString);
        }
        return stringBuffer.toString();
    }
}
```

这个加密只在java层，也没有混淆，比较简单，就不做过多介绍。

## 0x06桶自洁代码实现

首先可以实现一下接口的还原

```
import time
import requests
from urllib.parse import urlparse, parse_qs
import hashlib

class PGSH():
    def __init__(self):

        self.header = {
            'User-Agent': 'okhttp/4.12.0',
            'Connection': 'Keep-Alive',
            # 'Accept-Encoding': 'gzip',
            'Content-Type': 'application/x-www-form-urlencoded; application/x-www-form-urlencoded;charset=UTF-8',
            'imei': '869994065248209',
            'categoryCode': '00',
            'lat': '39.903179',
            'lng': '116.397755',
            'Authorization': '05b72a4c54d8365aae7c468585d4d03a',
            'Version': '1.96.1',
            'channel': 'android_app',
            'phoneBrand': 'Redmi',
            # 'timestamp': '1761915763320',
            # 'sign': 'b080e158b897dda109be4dbb6582a534ed5e5cbaf488657d239088e4f0dbde83',
            # 'orderRiskSign': 'c131a38a8bfd36199d195bfda75cfb82e4af586598687c0fe2f5c5a35ed20a65',
            # 'orderRiskTimestamp': '1761915763320',
            # 'Cookie': 'acw_tc=1a0c39dd17619142307134439e379965ea7b9e8fbb977ae12b7107982a9634',
        }
        self.token = '05b72a4c54d8365aae7c468585d4d03a'

        self.create_url = 'https://userapi.qiekj.com/trade/create'
        self.pay_url = 'https://userapi.qiekj.com/pay/unify/pay'
        self.scan_url = 'https://userapi.qiekj.com/goods/scan/v2'

    # 签名
    def sg(self, y):
        timestamp = str(int(time.time() * 1000))
        parsed_url = urlparse(y)
        path = parsed_url.path
        data = f"appSecret=nFU9pbG8YQoAe1kFh+E7eyrdlSLglwEJeA0wwHB1j5o=&channel=android_app×tamp={timestamp}&token={self.token}&version=1.96.1&{path}"
        data1 = f"appSecret=Ew+ZSuppXZoA9YzBHgHmRvzt0Bw1CpwlQQtSl49QNhY=&channel=alipay×tamp={timestamp}&token={self.token}&{path}"
        sign = hashlib.sha256(data.encode()).hexdigest()
        sign1 = hashlib.sha256(data1.encode()).hexdigest()
        return sign, sign1, timestamp

    def order_create(self,goodsId,skuId):
        # print(type(goodsId),type(skuId))
        data = {
            'promotions': '[{"assetId":"0","oldPromotionId":"3482","orgId":"200110186","promotionId":"0","promotionType":"4"}]',
            'items': '[{"amount":"1","goodsId":"'+goodsId+'","num":"1","skuId":"'+str(skuId)+'","soldType":"1"}]',
            'token': '05b72a4c54d8365aae7c468585d4d03a',
        }
        sign, sign1, timestamp = self.sg(self.create_url)
        self.header['sign'] = sign
        self.header['timestamp'] = timestamp

        re = requests.post(self.create_url, data=data, headers=self.header).json()
        return re

    def order_pay(self,orderNo):
        data = {
            'orderNo': orderNo,
            'payType': '2',
            'token': '05b72a4c54d8365aae7c468585d4d03a',
        }
        sign, sign1, timestamp = self.sg(self.pay_url)
        self.header['sign'] = sign
        self.header['timestamp'] = timestamp

        re = requests.post(self.pay_url, data=data, headers=self.header).json()
        return re

    def machine_skus(self, goodsId):
        data = {
            'goodsId': goodsId,
            'token': '05b72a4c54d8365aae7c468585d4d03a',
        }
        url = 'https://userapi.qiekj.com/goods/normal/skus'
        sign, sign1, timestamp = self.sg(url)
        self.header['sign'] = sign
        self.header['timestamp'] = timestamp

        re = requests.post(url, data=data, headers=self.header).json()
        print(re)
        return re

    def qr_scan(self,nqt):
        data = {
            'NQT': nqt,
            'token': '05b72a4c54d8365aae7c468585d4d03a',
        }

        sign, sign1, timestamp = self.sg(self.scan_url)
        self.header['sign'] = sign
        self.header['timestamp'] = timestamp

        re = requests.post(self.scan_url, data=data, headers=self.header).json()
        return re

    def qr_details(self,goodsId):
        data = {
            'goodsId': goodsId,
            'token': '05b72a4c54d8365aae7c468585d4d03a',
        }
        url = 'https://userapi.qiekj.com/goods/normal/details'
        sign, sign1, timestamp = self.sg(url)
        self.header['sign'] = sign
        self.header['timestamp'] = timestamp

        re = requests.post(url, data=data, headers=self.header).json()
        return re

    def self_clean(self,goodsId):

        skuid_data = self.machine_skus(goodsId)

        sku_id = next((item["skuId"] for item in skuid_data["data"] if item["name"] == "桶自洁"), None)

        if sku_id is None:
            return {"code": 1, "msg": "自洁启动失败"}

        # print(sku_id)
        # return {"code": 0, "msg": "自洁启动成功"}

        order_create_data = self.order_create(goodsId,sku_id)
        print(order_create_data)
        if order_create_data['code'] == 0:

            orderId = order_create_data['data']['orderId']
            # return {"code": 0, "msg": "自洁启动成功"}

            pay_data = self.order_pay(orderId)
            if pay_data['code'] == 0:

                return {"code": 0, "msg": "自洁启动成功"}
                print('桶自洁启动成功 ===>', pay_data)

        else:
            # Todo 这里传入设备id
            print(f'订单创建失败')
            return {"code": 1, "msg": "订单创建失败"}

if __name__ == '__main__':
    s = PGSH()
    print(s.machine_skus(''))
    # # 洗衣机上的二维码
    # washing_machine = {
    #     "1": "https://h5.qiekj.com/skip?NQT=e8958f4f-f182-4c45-8dcf-349ed40adc9d",
    #     "2": "https://h5.qiekj.com/skip?NQT=1c4f04a4-536f-4924-9a3d-734701fcc1bc",
    #     "3": "https://h5.qiekj.com/skip?NQT=6db2215a-661b-4c03-810f-31864fec24d8",
    #     "5": "https://h5.qiekj.com/skip?NQT=c7ebf746-548b-4d73-88c4-27b5145a7598",
    #     "8": "https://h5.qiekj.com/skip?NQT=91a506c8-7772-4601-a868-8e50a858d8de",
    #     "6": "https://h5.qiekj.com/skip?NQT=cd2e9ea1-f0bb-48c1-8c0e-d02d528b4b13"
    # }
    # nqt_list = ["e8958f4f-f182-4c45-8dcf-349ed40adc9d","1c4f04a4-536f-4924-9a3d-734701fcc1bc","6db2215a-661b-4c03-810f-31864fec24d8","c7ebf746-548b-4d73-88c4-27b5145a7598","91a506c8-7772-4601-a868-8e50a858d8de","cd2e9ea1-f0bb-48c1-8c0e-d02d528b4b13"]
    #
    # for mach in washing_machine:
    #     url = washing_machine[mach]
    #     parsed_url = urlparse(url)
    #     query_params = parse_qs(parsed_url.query)
    #     nqt_value = query_params.get("NQT", [None])[0]
    #     # print(nqt_value)
    #     scan_data = s.qr_scan(nqt_value)
    #     print(scan_data)
    #
```

可以配合flask+html，实现对所有洗衣机工作状态的可视化，如下

![](https://attach.52pojie.cn/forum/202511/05/122510ttbfbzwjowg9ydb3.png)

代码实现如下：

html部分：

```
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <title>二维码上传 & 设备列表</title>
    <script src="https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js"></script>
    <style>
        body {
            font-family: sans-serif;
            padding: 40px;
        }

        h2 {
            margin-top: 40px;
        }

        /* 上传二维码样式 */
        #dropZone {
            border: 3px dashed #ccc;
            border-radius: 15px;
            padding: 50px;
            cursor: pointer;
            transition: 0.3s;
            text-align: center;
        }

        #dropZone.dragover {
            border-color: #4caf50;
            background: #f9fff9;
        }

        #preview {
            margin-top: 20px;
            max-width: 300px;
            display: none;
        }

        #message {
            margin-top: 15px;
            font-weight: bold;
        }

        /* 设备列表样式 */
        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
        }

        th,
        td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        .working {
            color: red;
            font-weight: bold;
        }

        .idle {
            color: green;
            font-weight: bold;
        }
    </style>
</head>

<body>

    <!-- 二维码上传 -->
    <h2>上传二维码图片</h2>
    <div id="dropZone">拖拽二维码图片到这里，或点击选择文件</div>
    <input type="file" id="fileInput" accept="image/*" style="display:none;">
    <img id="preview" alt="二维码预览">
    <p id="message"></p>

    <!-- 设备列表 -->
    <h2>设备列表</h2>
    <table>
        <thead>
            <tr>
                <th>序号</th>
                <th>组织名称</th>
                <th>设备名称</th>
                <th>类别</th>
                <th>状态</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody id="machinesBody">
            <!-- JS动态填充 -->
        </tbody>
    </table>

    <script>
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const preview = document.getElementById('preview');
        const message = document.getElementById('message');
        const machinesBody = document.getElementById('machinesBody');

        // 点击上传
        dropZone.addEventListener('click', () => fileInput.click());

        // 拖拽上传
        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFile(e.dataTransfer.files[0]);
        });

        // 选择文件上传
        fileInput.addEventListener('change', e => {
            handleFile(e.target.files[0]);
        });

        // 处理二维码
        function handleFile(file) {
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                message.textContent = "❌ 请选择图片文件";
                return;
            }

            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, img.width, img.height);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    const code = jsQR(imageData.data, img.width, img.height);

                    if (code) {
                        const qrText = code.data;
                        message.textContent = "✅ 识别结果: " + qrText;

                        try {
                            const url = new URL(qrText);
                            const nqt = url.searchParams.get("NQT");
                            if (!nqt) {
                                message.textContent = "❌ 非法二维码（未找到 NQT）";
                                return;
                            }

                            message.textContent = "✅ 二维码合法，正在上传...";
                            fetch("/scan", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ nqt })
                            })
                                .then(res => res.json())
                                .then(data => {
                                    message.textContent = data.msg || JSON.stringify(data);
                                    loadMachines(); // 上传成功后刷新设备列表
                                })
                                .catch(err => {
                                    console.error(err);
                                    message.textContent = "❌ 上传失败";
                                });
                        } catch (e) {
                            message.textContent = "❌ 非法二维码内容";
                        }

                    } else {
                        message.textContent = "❌ 未识别到二维码";
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        // 加载设备列表
        function loadMachines() {
            fetch("/api/machines")
                .then(res => res.json())
                .then(data => {
                    machinesBody.innerHTML = "";
                    data.forEach((m, idx) => {
                        const tr = document.createElement("tr");

                        let actionBtn = "";
                        if (m.status !== '工作中') {
                            actionBtn = `<button>桶自洁</button>`;
                        }

                        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${m.orgName}</td>
          <td>${m.name}</td>
          <td>${m.categoryName || ''}</td>
          <td class="${m.status === '工作中' ? 'working' : 'idle'}">${m.status}</td>
          <td>${actionBtn}</td>
        `;
                        machinesBody.appendChild(tr);
                    });
                });
        }

        // 桶自洁操作
        function startSelfClean(machine_id, btn) {
            btn.disabled = true;
            btn.textContent = "启动中...";
            fetch("/self_clean", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ machine_id })
            })
                .then(res => res.json())
                .then(data => {
                    alert(data.msg || "操作完成");
                    btn.disabled = false;
                    btn.textContent = "桶自洁";
                })
                .catch(err => {
                    console.error(err);
                    alert("启动失败");
                    btn.disabled = false;
                    btn.textContent = "桶自洁";
                });
        }

        // 页面加载时获取设备列表
        loadMachines();
    </script>
</body>

</html>
```

flask部分：

```
import requests
from flask import Flask, request, jsonify, render_template
import pymysql
from utils import PGSH

app = Flask(__name__)

# ------------------ MySQL 配置 ------------------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456",
    "database": "pangguai_life",
    "charset": "utf8mb4"
}

# ------------------ 数据库操作工具 ------------------
def get_conn():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG)

def ensure_table_exists():
    """初始化表结构"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS washing_machine (
            machine_id CHAR(255) PRIMARY KEY,
            id CHAR(10),
            shopId CHAR(9),
            categoryCode CHAR(2),
            categoryName VARCHAR(255),
            name VARCHAR(255),
            orgName VARCHAR(255),
            imei VARCHAR(255)
        ) CHARACTER SET utf8mb4;
    """)
    conn.commit()
    conn.close()

# ------------------ 前端页面 ------------------
@app.route("/")
def index():
    return render_template("index.html")

# ------------------ 扫码接口 ------------------
@app.route("/scan", methods=["POST"])
def scan_qr():
    data = request.get_json()
    nqt_value = data.get("nqt")

    if not nqt_value:
        return jsonify({"code": 400, "msg": "缺少NQT参数"})

    scan_data = pgsh.qr_scan(nqt_value)

    if scan_data.get("code") != 0:
        return jsonify({"code": 500, "msg": "扫码失败"})

    d = scan_data["data"]

    detail = pgsh.qr_details(d["id"])

    t = detail['data']

    machine_id = nqt_value

    conn = get_conn()
    cur = conn.cursor()

    # 检查是否存在
    cur.execute("SELECT 1 FROM washing_machine WHERE machine_id=%s", (machine_id,))
    if cur.fetchone():
        conn.close()
        return jsonify({"code": 200, "msg": "该机器已存在"})

    # 插入新数据
    cur.execute("""
        INSERT INTO washing_machine (machine_id, id, shopId, categoryCode, categoryName, name, orgName, imei)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (machine_id, d["id"], str(d["shopId"]), d["categoryCode"], d["categoryName"], t["name"], t["orgName"], t["imei"]))
    conn.commit()
    conn.close()

    return jsonify({"code": 0, "msg": "保存成功"})

# ------------------ 设备列表接口 ------------------
@app.route("/api/machines")
def api_machines():
    conn = get_conn()
    cur = conn.cursor(pymysql.cursors.DictCursor)
    cur.execute("SELECT * FROM washing_machine")
    machines = cur.fetchall()
    conn.close()

    # 判断是否工作
    for m in machines:
        try:
            detail = pgsh.qr_details(m["id"])
            t = detail['data']
            m["status"] = "工作中" if t.get("deviceErrorCode") == 2 else "空闲"
        except:
            m["status"] = "未知"

    return jsonify(machines)

# ------------------ 桶自洁接口 ------------------
@app.route("/self_clean", methods=["POST"])
def self_clean():
    data = request.get_json()
    machine_id = data.get("machine_id")
    if not machine_id:
        return jsonify({"code": 400, "msg": "缺少machine_id"})

    try:
        result = pgsh.self_clean(machine_id)
        # 假设 pgsh.self_clean 返回 {"code": 0, "msg": "..."}
        if result.get("code") == 0:
            return jsonify({"code": 0, "msg": "自洁启动成功"})
        else:
            return jsonify({"code": 500, "msg": result.get("msg", "启动失败")})
    except Exception as e:
        return jsonify({"code": 500, "msg": f"启动异常: {str(e)}"})

if __name__ == "__main__":
    ensure_table_exists()
    pgsh = PGSH()
    app.run(host='0.0.0.0', debug=True)
```

数据库构建的也比较简单，如下

![](https://attach.52pojie.cn/forum/202511/05/122527ydmm8dvcq6mzowa6.png)

![](https://attach.52pojie.cn/forum/202511/05/122535e4gpz54u25vzvu54.png)

由于接下来一段时间事情会有点多，所以定时任务就不再实现，原理实际上很容易，有兴趣的可以自己实现一下
