# 最新版安卓x信小程序抓包fiddler

> **作者**: turk | **发布时间**: 2022-09-19 22:20:00 | **版块**: 『移动安全区』 | **查看/回复**: 8271 / 39
> **原文**: [https://www.52pojie.cn/thread-1690097-1-1.html](https://www.52pojie.cn/thread-1690097-1-1.html)

---

*本帖最后由 turk 于 2022-9-19 22:30 编辑*

## 最新版x信小程序抓包fiddler

### 环境

x信：8.0.27

安卓（root）版本：12

### 前言

参考https://icode.best/i/44023036283895

原文作者的思路是：获取root->在android中安装根证书->突破ssl pinning->burp抓包

笔者采用fiddler抓包（相比原文不需要自己做一个root证书），在尝试原文“突破ssl pinning步骤”时，发现Xposed官网已炸，搜索发现Xposed是一个hook框架，考虑用frida替代，而JustTrustMe功能如此便利，肯定也有人用frida实现过，果然找到了写好的js脚本

为了回馈社会，特把自己的实现思路和踩坑填坑历程分享出来

### 思路

安卓7.0以上有了network-security-config选项，可以让app只信任系统级证书，x信7.0以上则只信任微信自己信任的证书（ssl pinning）。

所以要用fiddler实现对微信小程序的抓包（https），必须

1. 将fiddler证书加入系统证书中
2. 绕过x信的ssl pinning

要将fiddler证书加入系统证书，需要

1. 安卓有root权限
2. 转换并安装证书

要绕过x信的ssl pinning，需要

1. hook x信
2. 实现unpinning

### 遇到的问题和解决方法

#### adb与emulator相关

##### ~~无法打开shell~~

使用非发行版的模拟器（没有app store）

##### ~~模拟器无法联网~~

冷启动：

```
.\emulator.exe -avd [avd_name] -no-snapshot-load
```

##### ~~多设备下adb指定单个设备~~

获得设备列表，使用-s选项指定其中一个：

```
adb -devices
adb -s [device_name] ...
```

##### ~~只有一个设备但adb显示有多个设备~~

打开任务管理器，找到设备的残留进程（qemu\_system...），终止

#### frida相关

##### ~~pip安装frida失败~~

不用科学上网下载太慢而失败，用全局科学上网报错而失败

下载时指定proxy：

```
pip install frida --proxy='socks5://127.0.0.1:[kexue_port]'
```

##### ~~frida连接模拟器~~

将相应版本的frida\_server上传至模拟器并启动

端口映射：

```
adb forward tcp:27042 tcp:27042
```

显示模拟器进程：

```
frida-ps -R
```

#### 转换和安装

参考：<http://wiki.cacert.org/FAQ/ImportRootCert>

##### ~~安装失败~~

获取hash名：

```
openssl x509 -inform DER -subject_hash_old -in root_X0F.crt
```

先上传crt，添加crt为用户级证书，再用find找到/storage/emulated/0/cacert/root\_X0f.crt

**直接重命名，不用转换**

```
cp root_X0f.crt [hash].0
```

复制到/system/etc/security/cacerts/中

清除所有用户级证书

##### ~~无法使/system可写~~

`mount: '/system' not in /proc/mounts`：

```
> emulator -avd Pixel_3a_XL_API_30 -writable-system
> adb shell avbctl disable-verification
> adb disable-verity
> adb root
> adb remount
> adb shell "su 0 mount -o rw,remount /system
```

##### ~~重启后证书消失~~

打开模拟器时使用 `-writable-system`选项：

```
> emulator -avd Pixel_3a_XL_API_30 -writable-system -no-snapshot-load
```

#### fiddler相关

##### ~~https连接失败，错误：TimeOut(0x274c)~~

原因1：未把fiddler证书设置为系统证书

​        祥见证书的转换和安装部分

原因2：ssl问题

​        在所有使用CONNECT方法的请求中加上x-OverrideSslProtocols项，值设置为ssl3

#### 成功过程

确保代理证书存在于系统证书中，开启代理，使用bypass ssl pinning hook x信，成功打开小程序并抓到https的包

### 效果

证书加载成功：

![](https://attach.52pojie.cn/forum/202209/19/221320gv1j97ltvbnfv9sv.jpg)

ssl unpinning成功：

![](https://attach.52pojie.cn/forum/202209/19/221359euxz5l666qqfumsn.jpg)

用最近火热的某羊测试，https抓包成功：

![](https://attach.52pojie.cn/forum/202209/19/221755dg8g6waheje02ize.jpg)
