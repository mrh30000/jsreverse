# 某OF网站的OB解密及DRM过校验思路(上)

> **作者**: 李恒道 | **发布时间**: 2024-07-01 19:51:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13718 / 67
> **原文**: [https://www.52pojie.cn/thread-1939931-1-1.html](https://www.52pojie.cn/thread-1939931-1-1.html)

---

*本帖最后由 李恒道 于 2024-7-4 18:34 编辑*

## 前言

感谢videohelp论坛larley大神的解答！
感谢吾爱破解论坛@涛之雨大神的帮助

## 正文

![](https://attach.52pojie.cn/forum/202407/04/180320fjy6l06y6m66zzlc.png)

首先第一层是标准的OB加密
我们先大概规整一下代码

```
    traverse(ast, {
        CallExpression(path) {
            if (path.node.arguments.length === 2) {
                const type0 = path.node.arguments[0].type
                const type1 = path.node.arguments[1].type
                const isLikelyNumber = (type) => {
                    return type === 'UnaryExpression' || type === 'NumericLiteral'
                }
                if ((type0 === 'StringLiteral' && isLikelyNumber(type1)) || (type1 === 'StringLiteral' && isLikelyNumber(type0))) {
                    const funcBinding = path.scope.getBinding(path.node.callee.name)
                    const funcNode = funcBinding.path.node
                    if (funcNode?.params?.length !== 2) {
                        return
                    }
                    if (funcNode.body.body.length !== 1) {
                        return
                    }
                    if (funcNode.body.body[0].type !== 'ReturnStatement') {
                        return
                    }
                    const funcArgs0 = funcNode.params[0].name
                    const funcArgs1 = funcNode.params[1].name
                    const bodyCallArgs = funcNode.body.body[0].argument.arguments
                    let isSwap = false
                    for (let index = 0; index < bodyCallArgs.length; index++) {
                        const item = bodyCallArgs[index];
                        if (item.type === 'Identifier') {

                            if (item.name === funcArgs0 && index === 1) {
                                isSwap = true
                            } else if (item.name === funcArgs1 && index === 0) {
                                isSwap = true
                            }
                            break;
                        }
                    }
                    const handleExpression = (bodyExpress, argsIdentifier) => {
                        if (bodyExpress.type !== 'BinaryExpression') {
                            return argsIdentifier
                        }
                        const handleIdentifier = (item) => {
                            if (item.type !== 'Identifier') {
                                return item
                            } else {
                                return argsIdentifier
                            }
                        }
                        const numAst = types.binaryExpression(bodyExpress.operator, handleIdentifier(bodyExpress.left), handleIdentifier(bodyExpress.right))
                        const numResult = eval(generator(numAst).code)
                        return types.numericLiteral(numResult)
                    }
                    const firstIdentifier = path.node.arguments[0]
                    const secondIdentifier = path.node.arguments[1]
                    let newCalleeArgs = [handleExpression(bodyCallArgs[0], isSwap ? secondIdentifier : firstIdentifier), handleExpression(bodyCallArgs[1], isSwap ? firstIdentifier : secondIdentifier)]
                    let newNode = types.callExpression(funcNode.body.body[0].argument.callee, newCalleeArgs);
                    path.replaceInline(newNode)
                }
            }
        },
    });
```

然后获取解密的函数，这里因为比较偷懒，所以直接使用了正则表达式计算关键函数

```
function generatorHandleCrackStringFunc(text) {
    const matchResult = text.match(/\d{4,}\);\s?(function.*),\s?[A-Za-z].[A-Za-z]\s?=\s?[A-Za-z]/)
    if (matchResult.length !== 2) {
        throw new Error('代码解析失败！')
    }
    const funcName = matchResult[1].match(/function ([A-Za-z])\([A-Za-z],\s?[A-Za-z]\).*(?=abc)/)[1]
    return {
        crackName: funcName,
        crackCharFunc: new Function([], matchResult[1] + ';return function(num,char){return ' + funcName + '(num, char)}')()
    }
}
```

然后调用解密函数

```
    traverse(ast, {
        CallExpression(path) {
            if (path.node.arguments.length === 2) {
                if (path.node.callee.name !== name) {
                    return
                }
                if (path.node.arguments[0].type !== 'NumericLiteral') {
                    return;
                }
                if (path.node.arguments[1].type !== 'StringLiteral') {
                    return;
                }
                const nodeResult = handleStringFunc(path.node.arguments[0].value, path.node.arguments[1].value)
                path.replaceInline(types.stringLiteral(nodeResult))
            }
        },
    });
```

然后对解密后的字符串和数字等做一下合并

```
    const handleObfs = {
        CallExpression: {
            exit(outerPath) {
                const node = outerPath.node.callee
                const parentPath = outerPath
                if (node?.object?.type === 'Identifier' && node?.property?.type === 'StringLiteral') {
                    const objBinding = outerPath.scope.getBinding(node.object.name)
                    if (objBinding === undefined) {
                        return;
                    }
                    const objNode = objBinding.path.node
                    const funcList = objNode.init?.properties ?? []
                    const funcInstance = funcList.find((item) => {
                        const keyName = item.key.name
                        return keyName === node.property.value
                    })
                    if (funcInstance) {
                        const parentNode = parentPath.node

                        let replaceAst = null
                        if (funcInstance.value.type === 'FunctionExpression') {
                            const originNode = funcInstance.value.body.body[0].argument
                            //函数
                            if (originNode.type === 'CallExpression') {
                                replaceAst = types.callExpression(parentNode.arguments[0], [...parentNode.arguments].splice(1))
                            } else if (originNode.type === 'BinaryExpression') {
                                replaceAst = types.binaryExpression(originNode.operator, parentNode.arguments[0], parentNode.arguments[1])
                            }
                        } else {
                            //字符串
                            debugger
                            replaceAst = types.stringLiteral(funcInstance.value.value)
                        }
                        if (replaceAst) {
                            parentPath.replaceWith(replaceAst)

                        }

                    }
                }
            }
        },
        MemberExpression: {
            enter(path) {
                const node = path.node
                if (node?.object?.type === 'Identifier' && node?.property?.type === 'StringLiteral') {
                    const objBinding = path.scope.getBinding(node.object.name)
                    if (objBinding === undefined) {
                        return;
                    }
                    const objNode = objBinding.path.node
                    const funcList = objNode.init?.properties ?? []
                    const funcInstance = funcList.find((item) => {
                        const keyName = item.key.name
                        return keyName === node.property.value
                    })
                    if (funcInstance) {
                        let replaceAst = null
                        if (funcInstance.value.type === 'StringLiteral') {
                            replaceAst = types.stringLiteral(funcInstance.value.value)
                        }
                        if (replaceAst) {
                            path.replaceWith(replaceAst)
                        }

                    }
                }
            }
        }
    }

    traverse(ast, handleObfs);
```

我们可以从已经解密的文件里提取一些关键字符串

```
    const mathRsult = code.match(/\[\"(.*)\", [a-zA-Z]\[\"time\"\][\s\S]*\[\"sign\"\] = \[\"([0-9]*)\".*function \(([a-zA-Z])\) {([\s\S]*)}\([a-zA-Z]\)\,.*?"([a-zA-Z0-9]{3,})"/)
    if (mathRsult.length !== 6) {
        throw new Error('密钥解析失败！')
    }
    const signPrefix = mathRsult[2]
    const signEnd = mathRsult[5]
    const prefixToken = mathRsult[1]
    const hashFunc = new Function(mathRsult[3], mathRsult[4])
```

接下来直接调试可以解出来BCToken的算法

```
    function generateBcToken() {
        if (bcToken !== "") {
            return bcToken
        }
        const V = () => 1e12 * Math.random()
        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
        const hash = sha1.create();
        const text = [(new Date).getTime(), V(), V(), UA].map(btoa).join(".")
        console.log(text)
        hash.update(text);
        bcToken = hash.hex()
        return bcToken
    }
```

Sign加密算法也可以解出来了

```
    function generateSha({ url, auth_id }) {
        const fixPrefix = prefixToken;
        let time = +new Date();
        const toeknURL = [fixPrefix, time, url, auth_id || 0].join(`\n`);
        const hash = sha1.create();
        hash.update(toeknURL);
        return {
            token: hash.hex(),
            time: time
        }
    }
       function  getSign({ url, auth_id }) {
            const { time, token } = generateSha({ url, auth_id })
            return {
                sign: [signPrefix, token, hashFunc(token), signEnd].join(':'),
                time: time
            }
        }
```

那基本的算法解密就搞定了，但是最近还更新了DRM

![](https://attach.52pojie.cn/forum/202407/04/180322iffhsd603cjyhx5y.png)

其中给了一个mpt和m3u8
分别有不同的密钥
根据测试DRM的密钥是需要写在Cookies里的
但是诡异的事情来了
postman可以测试成功，cmd测试失败，代码测试失败，powershell测试成功
ffmpeg测试也失败

我的第一反应可能是TLS指纹校验了
**这部分事后发现1.1也可以了，只要同ip就行，我也不确定到底是我测试错误还是后期改了**
**所以这部分可以直接忽略，但是因为我自己觉得补上HTTP2的代码有利于思路的连贯性分析和大家下次直接抄轮子**
**思虑之后决定保留了下来**
于是在<https://github.com/nodejs/undici/issues/1983>
抄了一段，改成OF网站的，这里就按下不表了

```
const undici = require("undici")
const tls = require("tls")

// From https://httptoolkit.com/blog/tls-fingerprinting-node-js/
const defaultCiphers = tls.DEFAULT_CIPHERS.split(':');
const shuffledCiphers = [
    defaultCiphers[1],
    defaultCiphers[2],
    defaultCiphers[0],
    ...defaultCiphers.slice(3)
].join(':');

const connector = undici.buildConnector({ ciphers: shuffledCiphers })
const client = new undici.Client("https://en.zalando.de", { connect: connector })

undici.request("https://en.zalando.de/api/navigation", {
    dispatcher: client,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
}).then(async (res) => {
    const body = await res.body.json()
    console.log(body)
})
```

依然没有成功，这个时候还跟无头苍蝇一样打转，我认为可能是TLS因为Node修改的不彻底导致的，决定切换Go技术栈试试
于是找到了<https://juejin.cn/post/7073264626506399751#heading-4>
测试惊觉发现竟然是HTTTP2
于是返回抓包看了一眼
发现确实都是HTTP2！

![](https://attach.52pojie.cn/forum/202407/04/180325mkkrsb78gsere7w8.png)

那果断切一下HTTP2的通信协议试一下

```
js
const http2 = require("http2");
const client = http2.connect("https://cdn3.OF网站.com");

const req = client.request({
  ":method": "GET",
  ":path": "/dash/files/3/3f/XXX/XXX.mpd",
  "accept": "*/*",
  "accept-language": "zh-CN,zh;q=0.9",
  "cache-control": "no-cache",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "cookie": "保护隐私",
  "Referer": "https://OF网站.com/",
  "Referrer-Policy": "strict-origin-when-cross-origin"
});

let data = "";

req.on("response", (headers, flags) => {
  for (const name in headers) {
    console.log(`${name}: ${headers[name]}`);
  }

});

req.on("data", chunk => {
  data += chunk;
});
req.on("end", () => {
  console.log(data);
  client.close();
});
req.end();
```

果然成功读取到数据！

![](https://attach.52pojie.cn/forum/202407/04/180327wpsw8oqxq144qwp2.png)

根据查看同类库OF-DRM (这个库真的帮助了我很多思路)
可以发现使用了一个yt-dlp
我们可以找一个nodejs版本的
测试代码如下

```
const path = require('path');

const YTDlpWrap = require('yt-dlp-wrap').default;

const ytDlpWrap = new YTDlpWrap(path.join('./yt-dlp_x86.exe'));
let ytDlpEventEmitter = ytDlpWrap
    .exec([
        'https://cdn3.OF网站.com/hls/files/a/a2/xxx/xxx.m3u8',
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best[ext=m4a]",
        "--allow-u",
        "--no-part",
        "--restrict-filenames",
        "-N 4",
        '--add-headers',
        `Cookie:"个人隐私"`,
        '-o',
        'F:/vmware/output2.mp4',
    ])
    .on('progress', (progress) =>
        console.log(
            progress.percent,
            progress.totalSize,
            progress.currentSpeed,
            progress.eta
        )
    )
    .on('ytDlpEvent', (eventType, eventData) =>
        console.log(eventType, eventData)
    )
    .on('error', (error) => console.error(error))
    .on('close', () => console.log('all done'));

console.log(ytDlpEventEmitter.ytDlpProcess.pid);
```

我也是刚接触，不一定参数描述的正确，-f表示格式，allow-u表示允许无法格式化的视频下载，no-part不要使用分割部分文件，restrict-filenames貌似是控制短标题和特殊字符的，-N应该是多线程
只有使用这套能绕过DRM的版权下载问题

下载完成后发现依然没法播放
根据研究是视频使用了加密
这个时候可以根据技术栈下手
根据搜索drm找到了`"DRM encrypted source cannot be decrypted without a DRM plugin`
根据上下文找到videojs字样

![](https://attach.52pojie.cn/forum/202407/04/180329nhhgurht19c0uuuh.png)

所以怀疑是videojs
于是找videojs的DRM库，找到了
<https://github.com/videojs/videojs-contrib-eme?tab=readme-ov-file#using>
使用例子是

```
player.eme();
player.src({
  src: '<your url here>',
  type: 'application/dash+xml',
  keySystems: {
    'com.widevine.alpha': '<YOUR URL HERE>'
  }
});
```

在网页中搜索eme，发现也能找到，下一个断点之后调试打印src的o内容

![](https://attach.52pojie.cn/forum/202407/04/180331gqt2r512z22ozzs5.png)

根据文档getLicense()- 允许异步检索许可证。
所以我们目前应该主攻getLicense(）函数了
其中代码为

```
                    getLicense: (e,s,o)=>{
                        j.vM.xhr({
                            url: i,
                            method: "POST",
                            responseType: "arraybuffer",
                            body: new Uint8Array(s),
                            headers: {
                                "Content-type": "application/octet-stream",
                                ...t
                            },
                            withCredentials: !0
                        }, ((e,i,t)=>{
                            e ? o(e) : o(null, t)
                        }
                        ))
                    }
```

往上一层看
这里可以看到创建了一个promise，当调用获取许可时会回调y，而y会把数据触发调用promise的Resolve出去，导致普通人很容易跟丢

![](https://attach.52pojie.cn/forum/202407/04/180334zcwusmpdpyua8zl8.png)

实际上接下来的流程处理在

![](https://attach.52pojie.cn/forum/202407/04/180336cud1lvld44xdd71s.png)

其中u是MediaKeySession，读取了我们的密钥，而MediaKeySession的接口代表与内容解密模块 (CDM) 进行消息交换的上下文。

以CDM为关键词，可以搜到https://www.freebuf.com/articles/database/375523.html

```
全球现有三大实现方案，分别为谷歌的Widevine、苹果的FairPlay和微软的PlayReady。其中Widevine实现简单，免费，市场占有率最高，应用最广泛。Widevine客户端主要内置于手机、电视、各大浏览器、播放器等，用于解密被保护的视频。

Widevine拥有三个安全级别——L1、L2和L3。L1是最高的安全级别，解密全过程在硬件中完成，需要设备支持。L3的安全级别最低，解密全程在CDM（Content Decryption Module ）软件中完成。L2介于两者之间， 核心解密过程在硬件完成，视频处理阶段在软件中完成。本文只讨论L3级视频的解密方式。
```

既然我们是谷歌浏览器，那我们大概率是Widevine的DRM保护了
那接下来的目标就是如何解密CDM
既然已经确定了是wvd l3
我们需要获取解密mp4的密钥
需要ppsh和License URL
找到的wvd代码来自https://forum.videohelp.com/threads/414040-Need-some-help-to-download-drm-protected-video-from-this-free-service
这里我截取片段

```
WVD_FILE = "device_wvd_file.wvd"

PLAYER_URL = 'https://aloula.faulio.com/api/v1/video/{video_id}/player'
ORIGIN = "https://www.aloula.sa"

def get_keys(pssh_value, license_url):
    if pssh_value is None:
        return []
    try:
        device = Device.load(WVD_FILE)
    except:
        return []

    pssh_value = PSSH(pssh_value)
    cdm = Cdm.from_device(device)
    cdm_session_id = cdm.open()

    challenge = cdm.get_license_challenge(cdm_session_id, pssh_value)
    licence = requests.post(
        license_url, data=challenge,
        headers={"Origin": ORIGIN}
    )
    licence.raise_for_status()
    cdm.parse_license(cdm_session_id, licence.content)

    keys = []
    for key in cdm.get_keys(cdm_session_id):
        if "CONTENT" in key.type:
            keys += [f"{key.kid.hex}:{key.key.hex()}"]
    cdm.close(cdm_session_id)
    return keys
```

ppsh和licence属于网站提取的内容，那wvd是什么？
Create a Widevine Device (.wvd) file from an RSA Private Key (PEM or DER) and Client ID Blob.
wvd是Widevine Device ，是根据一个RSA私钥和Client IDBlob生成的
其提取的方法我在
<https://forum.videohelp.com/threads/404994-Decryption-and-the-Temple-of-Doom>
找到了，当然也可以使用现有的，但是本着苏格拉底式学习的思想，决定尝试手动提取WVD
另外也找到了一个疑似可以在线处理的网站
<https://cdrm-project.com/>
同时这个网站也提供了大量的WVD DRM分析的文章和工具
<https://cdm-project.com/>

## 安卓root提取WVD

注意！！！根据测试模拟器没有WVD，不要尝试在模拟器搞
首先需要root和安装magisk
然后在magisk的设置的超级用户访问选择用户和ADB，重启

![](https://attach.52pojie.cn/forum/202407/04/180338hwjebezrzrr4d3tw.png)

![](https://attach.52pojie.cn/forum/202407/04/180340le1vfjvvtqm0m1s0.png)

然后安装MagiskFrida
<https://github.com/ViRb3/magisk-frida/releases>
下载出来在magisk导入模块
最好也装上L1回退模块
<https://github.com/hzy132/liboemcryptodisabler/releases/tag/v1.5.1>
全部搞定之后安装adb，为了图方便可以直接把adb的目录塞到path里
这样就有adb命令了
输入adb查看有没有手机
确定有之后拉取https://github.com/hyugogirubato/KeyDive的代码
输入`pip install -r requirements.txt`安装依赖
因为adb devices找到了

```
List of devices attached
emulator-5554   device
```

输入`python keydive.py -a -d ‘emulator-5554’ -w`即可导出

就是这样，你现在应该有一个以 ClientId 和 Private\_key.pem 形式存在的 CDM，它们藏在 Keydive 文件夹根目录中的设备中（因为我本机没root，模拟器又复现失败了...所以这步要靠自己了，不过应该大差不差，因为我AVD提取成功了~）

## AVD提取WVD

因为模拟器不支持wvd DRM
所以根据https://forum.videohelp.com/threads/408031-Dumping-Your-own-L3-CDM-with-Android-Studio
尝试andirod Studio获取DRM

![](https://attach.52pojie.cn/forum/202407/04/180343drehssq9rjh9z94h.png)

安装pixel 6 (系统一定要选Pie，不然frida-server会不成功)

![](https://attach.52pojie.cn/forum/202407/04/180524wbl62ydvllalmcca.png)

![](https://attach.52pojie.cn/forum/202407/04/180347netmmptmote44e6t.png)

然后启动

![](https://attach.52pojie.cn/forum/202407/04/180350sbhraxr90gvt2arg.png)

启动成功后在Window安装脚本`pip install frida`和`pip install frida-tools`
接下来输入`pip list`查看包版本

![](https://attach.52pojie.cn/forum/202407/04/180352pca36a6cjza33vzc.png)

然后下载对应版本的frida-server
`https://github.com/frida/frida/releases`
我的是16.2.5则去下`frida-server-16.2.5-android-x86.xz`然后解压得到frida-server-16.2.5-android-x86
然后输入
`adb push C:\Users\lihengdao\Downloads\frida-server-16.2.5-android-x86 /sdcard`
移动之后输入

```
adb.exe shell
su
mv /sdcard/frida-server-16.2.5-android-x86 /data/local/tmp
chmod +x /data/local/tmp/frida-server-16.2.5-android-x86
/data/local/tmp/frida-server-16.2.5-android-x86
```

运行有点报错很正常，直接继续
拉取项目`https://github.com/wvdumper/dumper`
安装依赖`pip3 install -r requirements.txt`
然后降级一下protobuf `pip install protobuf==3.20.*`
输入`python .\dump_keys.py`运行，注意运行frida-server的窗口不要关
显示Hook completed就成功了

![](https://attach.52pojie.cn/forum/202407/04/180526d8bkt3zhvayfdhhk.png)

接下来在Andriod Studio的Pixel模拟器访问https://bitmovin.com/demos/drm
小提示，这里建议设置代{过}{滤}理，模拟器的回环代{过}{滤}理是10.0.2.2
将wifi的设置里proxy设置上相应的回环地址和端口即可
如果网络不好加载不出来视频会存在bin和pem文件的！
<https://developer.android.com/studio/run/emulator-networking?hl=zh-cn>
视频没刷出来就多试试
大陆网有点卡
当出现视频进度点播放
就会在dumper-main目录里生成劫持到的文件

![](https://attach.52pojie.cn/forum/202407/04/180357v3csgqjud4q7ooaa.png)

然后去生成的文件目录输入`pywidevine create-device -k private_key.pem -c client_id.bin -t "CHROME" -l 3 -o wvd`
wvd驱动文件生成成功！

![](https://attach.52pojie.cn/forum/202407/04/180359bj2yae10mj08pyz9.png)
