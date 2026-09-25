# 某生鲜电商mfsig加密算法解析

> **作者**: lixiaolevae | **发布时间**: 2021-07-06 16:44:00 | **版块**: 『移动安全区』 | **查看/回复**: 6445 / 86
> **原文**: [https://www.52pojie.cn/thread-1471424-1-1.html](https://www.52pojie.cn/thread-1471424-1-1.html)

---

## 初入道途

### 抓包分析

##### 工具

###### 抓包工具-charles

<https://www.charlesproxy.com/>

前提：手机和电脑均安装好charles证书

![image-20210706151936444](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706151936.png)

###### 接口调试分析-postman

![image-20210706152105634](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706152105.png)

###### 小程序包导出工具-android rootexplorer文件浏览器

(需要root权限)

#### ![image-20210706152537702](https://www.52pojie.cn/Library/Application%20Support/typora-user-images/image-20210706152537702.png)

##### 运行环境

华为p9 android 6.0

(7.0以上版本抓包工具默认抓不到https请求，解决方式：可将charles证书升级为系统证书，安装到系统证书目录下)

##### 接口分析

###### 商品类目获取接口

`cURL`

```
curl -H 'Host: as-vip.missfresh.cn' -H 'platform: weixin_app' -H 'charset: utf-8' -H 'request-id: 0649cacd90ffb932864517168199fa5a' -H 'content-type: application/json' -H 'mfsig: mfswaD2ZNKZTnrhVmrlTn43Ol3vT4uV46Q7hmuVf4iV72u4554JRnQzkmQ3V3J+PnGJU44Rk34QUiKC6Qry3niy2iRaWnrdPmiJ2mhzfROhQlFRSQiy3mhzQSJqrk3RWSryTl439m3vTRHFuQum4QvKihGyOk3RPSizhQQr2PvG6' -H 'User-Agent: Mozilla/5.0 (Linux; Android 7.0; EVA-AL10 Build/HUAWEIEVA-AL10; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2852 MMWEBSDK/20210501 Mobile Safari/537.36 MMWEBID/1318 MicroMessenger/8.0.6.1900(0x2800063A) Process/appbrand2 WeChat/arm32 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android' -H 'x-region: {"address_code":330110,"station_code":"MRYX|mryx_celshd","delivery_type":1,"bigWarehouse":"MRYXSHD","type":0}' -H 'Referer: https://servicewechat.com/wxebf773691904eee9/821/page-frame.html' --data-binary '{"param":{"firstCategoryCode":"","secondCategoryCode":"","categoryIndex":0,"onlyClassify":1,"bizFingerprintType":3},"common":{"accessToken":"","retailType":"","fromSource":"","sourceDeviceId":"0649cacd-90ff-b932-8645-17168199fa5a","deviceId":"0649cacd-90ff-b932-8645-17168199fa5a","deviceCenterId":"8590201085835345922","env":"weixin_app","platform":"weixin_app","model":"EVA-AL10","screenHeight":611,"screenWidth":360,"version":"9.9.36.3","addressCode":330110,"stationCode":"MRYX|mryx_celshd","bigWarehouse":"MRYXSHD","deliveryType":1,"chromeType":0,"currentLng":120.024811,"currentLat":30.28203,"sellerId":13646,"mfplatform":"weixin_app","mfenv":"wxapp","sellerInfoList":[{"sellerId":13646,"sellerType":1},{"sellerId":678894,"sellerType":2},{"sellerId":2386422,"sellerType":6}]}}' --compressed 'https://as-vip.missfresh.cn/as/home/classify'
```

`请求体`

```
{
        "param": {
                "firstCategoryCode": "",
                "secondCategoryCode": "",
                "categoryIndex": 0,
                "onlyClassify": 1,
                "bizFingerprintType": 3
        },
        "common": {
                "accessToken": "",
                "retailType": "",
                "fromSource": "",
                "sourceDeviceId": "0649cacd-90ff-b932-8645-17168199fa5a",
                "deviceId": "0649cacd-90ff-b932-8645-17168199fa5a",
                "deviceCenterId": "8590201085835345922",
                "env": "weixin_app",
                "platform": "weixin_app",
                "model": "EVA-AL10",
                "screenHeight": 611,
                "screenWidth": 360,
                "version": "9.9.36.3",
                "addressCode": 330110,
                "stationCode": "MRYX|mryx_celshd",
                "bigWarehouse": "MRYXSHD",
                "deliveryType": 1,
                "chromeType": 0,
                "currentLng": 120.024811,
                "currentLat": 30.28203,
                "sellerId": 13646,
                "mfplatform": "weixin_app",
                "mfenv": "wxapp",
                "sellerInfoList": [{
                        "sellerId": 13646,
                        "sellerType": 1
                }, {
                        "sellerId": 678894,
                        "sellerType": 2
                }, {
                        "sellerId": 2386422,
                        "sellerType": 6
                }]
        }
}
```

`返回值`

```
{
    "data": {
        "bizFingerprintType": 3,
        "tabInfo": [],
        "classifyStyle": 1,
        "categories": [
            {
                "internalId": "3127",
                "secondList": [
                    {
                        "internalId": "3513",
                        "categoryImage": "https://image.missfresh.cn/567284b5c37f4c5a815ffe36fda1b445.png",
                        "icon": "热",
                        "name": "推荐",
                        "parentId": "3127"
                    },
                    {
                        "internalId": "3514",
                        "categoryImage": "https://image.missfresh.cn/32ed06cc30394b0895e771bb3a79e59e.png",
                        "icon": "惠",
                        "name": "会员特惠",
                        "parentId": "3127"
                    },
                    {
                        "internalId": "3129",
                        "categoryImage": "https://image.missfresh.cn/1971c2db09384038864fddc8b2497141.png",
                        "icon": "新",
                        "name": "时令上新",
                        "parentId": "3127"
                    },
                    ......
```

##### 加密参数确定

通过postman调试可知，mfsig不传或错传后不能正确请求数据，确认mfsig为核心加密签名

![image-20210706153005140](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706153005.png)

![image-20210706153036359](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706153036.png)

### 初领妙道

#### 小程序包反编译

##### 工具

###### wxUnpacker

小程序反编译工具github地址：<https://github.com/qwerty472123/wxappUnpacker>

运行前提需要安装node环境

该工具运行需要一些node依赖库，安装指引在github中README.md文档中有

##### 小程序包拉取

通过re文件管理器App直捣微信小程序包路径：

/data/data/com.tencent.mm/MicroMsg/${用户MD5}/appbrand/pkg/\_\*\_xxx.wxapkg

利用re文件管理器打成zip包，点击右上角按钮找到`发送`，通过QQ、钉钉或者蓝牙等方式传送到个人电脑接收

##### 小程序主子包判断

如今微信小程序单包体积不能超过4M（小程序基础依赖包除外），如果项目内容过大，开发者会使用分包模式

拿该电商来说，打开小程序一顿操作后，文件目录下发现四个包

![image-20210706154412251](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154412.png)

其中：

\_2124598774\_821.wxapkg           3.3M  主包

\_-588782754\_76.wxapkg                  1.5M  子包

\_152740959\_13.wxapkg                        89k    子包

\_1123949441\_552.wxapkg            14M   基础依赖包

##### 反编译执行

先反编译主包

```
# 主包反编译
node wxWxapkg.js /Users/toretto/crack/wxapkg/missfresh_v3/_2124598774_821.wxapkg
```

再反编译子包，通过-s=指定主包的路径，使子包反编译的内容复制到主包

```
# 子包反编译
node wxWxapkg.js  -s=/Users/toretto/crack/wxapkg/missfresh_v3/_2124598774_821  ../../wxapkg/missfresh_v3/_152740959_13.wxapkg
node wxWxapkg.js  -s=/Users/toretto/crack/wxapkg/missfresh_v3/_2124598774_821  ../../wxapkg/missfresh_v3/_-588782754_76.wxapkg
```

![image-20210706154720473](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154720.png)

看到File done即反编译成功

![image-20210706154734258](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154734.png)

用小程序开发工具打开

![image-20210706154836938](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154837.png)

先在右上角详情中点击本地设置，勾选不校验合法域名、webview、tls及https证书

![image-20210706155122944](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706155123.png)

完成上述操作后，一个简单代码分析环境就搭建好了

### 渐入佳境

#### 静态分析

经过抓包分析后，得知加密参数为mfsig，开发工具中全局搜索mfsig，发现并没有匹配的结果。

![image-20210706155415889](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706155416.png)

转换思路，我们看到mfsig的取值均为mfsw开头，于是全局搜索这个，发现mfsw也无匹配结果，可以得出个结论：

该小程序的加密相关函数是特殊对待混淆过的，静态分析明文无法定位到。算是一个安全性比较好的case。

小程序的代码一般发布时都会做混淆，一般而言单靠静态分析代码中的加密逻辑是很费时费力的，借助调试反而易于理解代码逻辑

既然静态分析无果，这时就要体现动态调试分析的重要性了。

#### 动态分析

##### 小程序编译

打开模拟器，并点击编译按钮，观察模拟器窗户和调试器的Console窗口中的报错提示

期间会遇到几个很小的报错，逐步解决后成功看到主界面，接下来就可以调试了

![image-20210706162859382](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706162859.png)

##### 动态分析过程

找到对应接口，打好断点后一步步调试分析

定位到核心代码，反编译的代码格式比较乱，多行代码挤在同一行，不利于追步调试，可以点击左下角的{}按钮进行格式化

![image-20210706160107480](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706160107.png)

通过调试器右侧的调试功能按键进行追踪调试

![image-20210706160201085](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706160201.png)

加密函数混淆过，需要些耐心一步步调试，纸上记录下加密过程。

大体上来看其实就是编码游戏，字符串转数组，数组转为字符串，再利用索引进行字符编码生成最后的mfsig

### 元神初具

#### 加密翻译

经过上述动态解析，将纸上记录下的加密流程进行整理，利用java或python进行翻译，实现一遍

拿一个真实抓包接口的请求体参数进行测试验证加密函数的正确性

![image-20210706160955448](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706160955.png)

得到的mfsig与接口中的完全一致，那么大功告成

### 妙领天机

#### 总结

1. 逆向需要耐心也需要大胆的猜想和假设去不断尝试，混淆的代码笔者调试追溯了好几天，算是比较笨的；
2. 逆向工作会用到的很多好用的工具，平时注意多收集一些好用的工具或者好博文，以事半功倍；
3. 本文旨在分享一些逆向技巧和思路，读者不可利用本文所述内容进行非法商业获取利益，若执意带来的法律责任由读者自行承担。

## 初入道途

### 抓包分析

##### 工具

###### 抓包工具-charles

<https://www.charlesproxy.com/>

前提：手机和电脑均安装好charles证书

![image-20210706151936444](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706151936.png)

###### 接口调试分析-postman

![image-20210706152105634](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706152105.png)

###### 小程序包导出工具-android rootexplorer文件浏览器

(需要root权限)

#### ![image-20210706152537702](https://www.52pojie.cn/Library/Application%20Support/typora-user-images/image-20210706152537702.png)

##### 运行环境

华为p9 android 6.0

(7.0以上版本抓包工具默认抓不到https请求，解决方式：可将charles证书升级为系统证书，安装到系统证书目录下)

##### 接口分析

###### 商品类目获取接口

`cURL`

```
curl -H 'Host: as-vip.missfresh.cn' -H 'platform: weixin_app' -H 'charset: utf-8' -H 'request-id: 0649cacd90ffb932864517168199fa5a' -H 'content-type: application/json' -H 'mfsig: mfswaD2ZNKZTnrhVmrlTn43Ol3vT4uV46Q7hmuVf4iV72u4554JRnQzkmQ3V3J+PnGJU44Rk34QUiKC6Qry3niy2iRaWnrdPmiJ2mhzfROhQlFRSQiy3mhzQSJqrk3RWSryTl439m3vTRHFuQum4QvKihGyOk3RPSizhQQr2PvG6' -H 'User-Agent: Mozilla/5.0 (Linux; Android 7.0; EVA-AL10 Build/HUAWEIEVA-AL10; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2852 MMWEBSDK/20210501 Mobile Safari/537.36 MMWEBID/1318 MicroMessenger/8.0.6.1900(0x2800063A) Process/appbrand2 WeChat/arm32 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android' -H 'x-region: {"address_code":330110,"station_code":"MRYX|mryx_celshd","delivery_type":1,"bigWarehouse":"MRYXSHD","type":0}' -H 'Referer: https://servicewechat.com/wxebf773691904eee9/821/page-frame.html' --data-binary '{"param":{"firstCategoryCode":"","secondCategoryCode":"","categoryIndex":0,"onlyClassify":1,"bizFingerprintType":3},"common":{"accessToken":"","retailType":"","fromSource":"","sourceDeviceId":"0649cacd-90ff-b932-8645-17168199fa5a","deviceId":"0649cacd-90ff-b932-8645-17168199fa5a","deviceCenterId":"8590201085835345922","env":"weixin_app","platform":"weixin_app","model":"EVA-AL10","screenHeight":611,"screenWidth":360,"version":"9.9.36.3","addressCode":330110,"stationCode":"MRYX|mryx_celshd","bigWarehouse":"MRYXSHD","deliveryType":1,"chromeType":0,"currentLng":120.024811,"currentLat":30.28203,"sellerId":13646,"mfplatform":"weixin_app","mfenv":"wxapp","sellerInfoList":[{"sellerId":13646,"sellerType":1},{"sellerId":678894,"sellerType":2},{"sellerId":2386422,"sellerType":6}]}}' --compressed 'https://as-vip.missfresh.cn/as/home/classify'
```

`请求体`

```
{
    "param": {
        "firstCategoryCode": "",
        "secondCategoryCode": "",
        "categoryIndex": 0,
        "onlyClassify": 1,
        "bizFingerprintType": 3
    },
    "common": {
        "accessToken": "",
        "retailType": "",
        "fromSource": "",
        "sourceDeviceId": "0649cacd-90ff-b932-8645-17168199fa5a",
        "deviceId": "0649cacd-90ff-b932-8645-17168199fa5a",
        "deviceCenterId": "8590201085835345922",
        "env": "weixin_app",
        "platform": "weixin_app",
        "model": "EVA-AL10",
        "screenHeight": 611,
        "screenWidth": 360,
        "version": "9.9.36.3",
        "addressCode": 330110,
        "stationCode": "MRYX|mryx_celshd",
        "bigWarehouse": "MRYXSHD",
        "deliveryType": 1,
        "chromeType": 0,
        "currentLng": 120.024811,
        "currentLat": 30.28203,
        "sellerId": 13646,
        "mfplatform": "weixin_app",
        "mfenv": "wxapp",
        "sellerInfoList": [{
            "sellerId": 13646,
            "sellerType": 1
        }, {
            "sellerId": 678894,
            "sellerType": 2
        }, {
            "sellerId": 2386422,
            "sellerType": 6
        }]
    }
}
```

`返回值`

```
{
    "data": {
        "bizFingerprintType": 3,
        "tabInfo": [],
        "classifyStyle": 1,
        "categories": [
            {
                "internalId": "3127",
                "secondList": [
                    {
                        "internalId": "3513",
                        "categoryImage": "https://image.missfresh.cn/567284b5c37f4c5a815ffe36fda1b445.png",
                        "icon": "热",
                        "name": "推荐",
                        "parentId": "3127"
                    },
                    {
                        "internalId": "3514",
                        "categoryImage": "https://image.missfresh.cn/32ed06cc30394b0895e771bb3a79e59e.png",
                        "icon": "惠",
                        "name": "会员特惠",
                        "parentId": "3127"
                    },
                    {
                        "internalId": "3129",
                        "categoryImage": "https://image.missfresh.cn/1971c2db09384038864fddc8b2497141.png",
                        "icon": "新",
                        "name": "时令上新",
                        "parentId": "3127"
                    },
                    ......
```

##### 加密参数确定

通过postman调试可知，mfsig不传或错传后不能正确请求数据，确认mfsig为核心加密签名

![image-20210706153005140](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706153005.png)

![image-20210706153036359](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706153036.png)

### 初领妙道

#### 小程序包反编译

##### 工具

###### wxUnpacker

小程序反编译工具github地址：<https://github.com/qwerty472123/wxappUnpacker>

运行前提需要安装node环境

该工具运行需要一些node依赖库，安装指引在github中README.md文档中有

##### 小程序包拉取

通过re文件管理器App直捣微信小程序包路径：

/data/data/com.tencent.mm/MicroMsg/${用户MD5}/appbrand/pkg/\_\*\_xxx.wxapkg

利用re文件管理器打成zip包，点击右上角按钮找到`发送`，通过QQ、钉钉或者蓝牙等方式传送到个人电脑接收

##### 小程序主子包判断

如今微信小程序单包体积不能超过4M（小程序基础依赖包除外），如果项目内容过大，开发者会使用分包模式

拿该电商来说，打开小程序一顿操作后，文件目录下发现四个包

![image-20210706154412251](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154412.png)

其中：

\_2124598774\_821.wxapkg      3.3M  主包

\_-588782754\_76.wxapkg        1.5M  子包

\_152740959\_13.wxapkg            89k    子包

\_1123949441\_552.wxapkg      14M   基础依赖包

##### 反编译执行

先反编译主包

```
# 主包反编译
node wxWxapkg.js /Users/toretto/crack/wxapkg/missfresh_v3/_2124598774_821.wxapkg
```

再反编译子包，通过-s=指定主包的路径，使子包反编译的内容复制到主包

```
# 子包反编译
node wxWxapkg.js  -s=/Users/toretto/crack/wxapkg/missfresh_v3/_2124598774_821  ../../wxapkg/missfresh_v3/_152740959_13.wxapkg
node wxWxapkg.js  -s=/Users/toretto/crack/wxapkg/missfresh_v3/_2124598774_821  ../../wxapkg/missfresh_v3/_-588782754_76.wxapkg
```

![image-20210706154720473](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154720.png)

看到File done即反编译成功

![image-20210706154734258](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154734.png)

用小程序开发工具打开

![image-20210706154836938](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706154837.png)

先在右上角详情中点击本地设置，勾选不校验合法域名、webview、tls及https证书

![image-20210706155122944](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706155123.png)

完成上述操作后，一个简单代码分析环境就搭建好了

### 渐入佳境

#### 静态分析

经过抓包分析后，得知加密参数为mfsig，开发工具中全局搜索mfsig，发现并没有匹配的结果。

![image-20210706155415889](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706155416.png)

转换思路，我们看到mfsig的取值均为mfsw开头，于是全局搜索这个，发现mfsw也无匹配结果，可以得出个结论：

该小程序的加密相关函数是特殊对待混淆过的，静态分析明文无法定位到。算是一个安全性比较好的case。

小程序的代码一般发布时都会做混淆，一般而言单靠静态分析代码中的加密逻辑是很费时费力的，借助调试反而易于理解代码逻辑

既然静态分析无果，这时就要体现动态调试分析的重要性了。

#### 动态分析

##### 小程序编译

打开模拟器，并点击编译按钮，观察模拟器窗户和调试器的Console窗口中的报错提示

期间会遇到几个很小的报错，逐步解决后成功看到主界面，接下来就可以调试了

![image-20210706162859382](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706162859.png)

##### 动态分析过程

找到对应接口，打好断点后一步步调试分析

定位到核心代码，反编译的代码格式比较乱，多行代码挤在同一行，不利于追步调试，可以点击左下角的{}按钮进行格式化

![image-20210706160107480](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706160107.png)

通过调试器右侧的调试功能按键进行追踪调试

![image-20210706160201085](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706160201.png)

加密函数混淆过，需要些耐心一步步调试，纸上记录下加密过程。

大体上来看其实就是编码游戏，字符串转数组，数组转为字符串，再利用索引进行字符编码生成最后的mfsig

### 元神初具

#### 加密翻译

经过上述动态解析，将纸上记录下的加密流程进行整理，利用java或python进行翻译，实现一遍

拿一个真实抓包接口的请求体参数进行测试验证加密函数的正确性

![image-20210706160955448](https://gitee.com/lixiaolevae/tuchuang/raw/master/20210706160955.png)

得到的mfsig与接口中的完全一致，那么大功告成

### 妙领天机

#### 总结

1. 逆向需要耐心也需要大胆的猜想和假设去不断尝试，混淆的代码笔者调试追溯了好几天，算是比较笨的；
2. 逆向工作会用到的很多好用的工具，平时注意多收集一些好用的工具或者好博文，以事半功倍；
3. 本文旨在分享一些逆向技巧和思路，读者不可利用本文所述内容进行非法商业获取利益，若执意带来的法律责任由读者自行承担。
