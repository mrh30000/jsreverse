# 记一次iOS的google admob ads 广告请求协议逆向

> **作者**: 猫大人 | **发布时间**: 2022-11-03 22:57:00 | **版块**: 『移动安全区』 | **查看/回复**: 6416 / 6
> **原文**: [https://www.52pojie.cn/thread-1707725-1-1.html](https://www.52pojie.cn/thread-1707725-1-1.html)

---

*本帖最后由 猫大人 于 2022-11-4 10:12 编辑*

题目描述:
已知  现在我们已经知道其中的ms参数为&#12032;个核&#12092;参数，其可能包含了与app、设备相关的指纹信息，请根据给定的demo app通过逆向&#12095;段探索其&#12131;成的过程。

[C] *纯文本查看*

```
curl -H "Host: googleads.g.doubleclick.net" -H "Cookie: id=22c0c87203ce0 00a||t=1661342046|et=730|cs=002213fd48d7942ada27d51626" -H "accept: */*" -H "user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) A ppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" -H "accept-langua ge: zh-cn" --compressed "https://googleads.g.doubleclick.net/mads/gma?os _version=12.2.0&ms=LiVmBSkwaW8MrH2sBf1n3ZgG2Kh24Pmlbadui2a7AwsvH9KP3sbOO iR75Nysw3i3jd6woio6LEJojotTNh7TqD9Itg65xmL4YCfqnFL8ywzq2GnoC8jGisT6iMEj8
_2myjTud_zkBkKGjOBaK_6PsYuE55Gb_-WccoYgtTqDxG8NV2eslijf6qYdKq649hqcXwM-I
bEcEObdg-_FaXs-AoSyzRGu1c8JNAOIUekbNXEI3NtSim7E1thgVsKsW6-sJ40fq9dEwABPT
Yz38D4ZvG90L3z6FRdDnkTxCQeCDin8SYGz5NgUOc8mbhzkcR_KxD1QnczN5hOt21vj2P9be
g&u_so=p&omid_v=1.3.3-google_20200427&hl=zh-CN&submodel=iPhone9%2C1&sys_
name=iOS&eid=318483349%2C318500618%2C318494274%2C318492496%2C318500237%2
C318505913%2C318504747&net=wi&u_sd=2&ios_jb=1&js=afma-sdk-i-v7.69.0&fbs_
aiid=FFF75D0FC3DD4ACEB78BF7AAD7E4227A&u_h=667&fbs_aeid=15763983678728821
65&u_w=375&guci=0.0.0.0.0.0.0.0&sdk_apis=7%2C8&omid_p=Google%2Fafma-sdk-
i-v7.69.0&rbv=1&format=interstitial_mb&an=1.0.0.iphone.com.google.ads.Re
wardedVideoExample.personal&kw=iOS%20App&u_audio=3&preqs=2&seq_num=5&tim
e_in_session=0&preqs_in_session=0&dload=4182&pcc=0&output=html&#174;ion=mo
bile_app&u_tz=-240&client=ca-app-pub-3940256099942544&slotname=171248531
3&adtest=on&kw_type=broad&gsb=wi&ogsb=wi&apm_app_id=ca-app-pub-394025609
9942544~1458002511&apm_app_type=2&app_wp_code=ca-app-pub-394025609994254
4&app_code=1458002511&num_ads=1&vpt=8&vfmt=18&vst=0&sdkv=o.7.69.0&sdmax=
0&dmax=1&sdki=3c4d&caps=interactiveVideo_inlineVideo_mraid1_mraid2_mraid
3_th_autoplay_mediation_av_sdkAdmobApiForAds_di_transparentBackground_sd
kVideo_aso_sfv_dinm_dim_nav_navc_ct_scroll_dinmo_gls_saiMacro_ipdof_omid
Enabled_gcache_aboi_xSeconds&mr=8744318498482049952&includeCookies=true&
session_idl=19&rdidl=36&idtypel=4&is_latl=1&blob=ABPQqLFchg2b-1Ynkr7_EA6
dN_Ojc-LRPs0ilGUiDPXEw1ITrR1XGxVplkxV3LkP7x4K8tMvCuiDGWph210veQ5xnP2B2XV
8XjFgjZAywjATOoFxPWeuOk6vSISvxu6TvmaFn0cSlHWX4fySr6YsLb-s5gJBtYN481MyHCU
F8HTXundyvQCD2UKvY2HvC-Y5zAujbJHQjG-NNwynUqFSJDHv-vIDP8pmbbIKvVm3Y0YnT2P
yhh8vDQ9h2imQM9JkTqaUOl1aHllZEn0lP92M6fjtAfGx5aadrez8HOZJgF52PsJwNphSvri
XN7s8LARwaC5F5Ie2bzDf8M8aMHDS6ubEvsS7Pv-6MhkqECmA&et=11&jsv=sdk_20190107 _RC02-production-sdk_20220829_RC00&tcar=30"
```

![](https://static.52pojie.cn/static/image/hrline/line2.png)

首先全局搜索,确定参数来源

![](https://attach.52pojie.cn/forum/202211/03/230524h1feey1ppe6fpo1g.png)

拼接组装待加密的参数:

[C] *纯文本查看*

```
2825b4500  0a 0b 69 50 68 6f 6e 65 20 31 33 2e 37 12 12 61  ..iPhone 13.7..a
2825b4510  66 6d 61 2d 73 64 6b 2d 69 2d 76 37 2e 36 39 2e  fma-sdk-i-v7.69.
2825b4520  30 c8 01 a4 c5 cd 98 06 18 1e 28 03 30 64 20 00  0.........(.0d .
2825b4530  88 01 00 b8 01 a4 c5 cd 98 06 58 01 60 01 b0 01  ..........X.`...
2825b4540  01 98 01 00 f8 01 da 09 80 02 a0 11 88 02 80 0f  ................
2825b4550  92 02 03 31 2e 30 a0 04 02 f2 02 0d 6d 64 72 2e  ...1.0......mdr.
2825b4560  7a 69 6e 67 66 72 6f 6e 74 c8 04 01 00 00 00 00  zingfront.......
```

数据格式为protobuf

[C] *纯文本查看*

```
{
    "0": [
        0,
        0
    ],
    "1": "iPhone 13.7",
    "2": {
        "12": 7380662212167495000,
        "13": 3275866450576355000 ///解析错误 应该为:afma-sdk-i-v7.69.0
    },
    "3": 55,
    "4": 1,
    "5": 3,
    "6": 100,
    "11": 1,//好像标识越狱状态,记不清了
    "12": 1,
    "17": 1,
    "19": 0,
    "22": 1,
    "23": 1662274211,
    "25": 1662274211,
    "31": 1242,
    "32": 2208,
    "33": 1920,
    "34": "1.0",
    "46": "mdr.zingfront",
    "68": 2,
    "73": 1
}
```

使用 frida 寻找加密入口
ggi\_ged 0x9C724 加密入口

[C] *纯文本查看*

```
call:=====funcation==0x9c724==========================
,arg0:      0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
2825b4500  0a 0b 69 50 68 6f 6e 65 20 31 33 2e 37 12 12 61  ..iPhone 13.7..a
2825b4510  66 6d 61 2d 73 64 6b 2d 69 2d 76 37 2e 36 39 2e  fma-sdk-i-v7.69.
2825b4520  30 c8 01 a4 c5 cd 98 06 18 1e 28 03 30 64 20 00  0.........(.0d .
2825b4530  88 01 00 b8 01 a4 c5 cd 98 06 58 01 60 01 b0 01  ..........X.`...
2825b4540  01 98 01 00 f8 01 da 09 80 02 a0 11 88 02 80 0f  ................
2825b4550  92 02 03 31 2e 30 a0 04 02 f2 02 0d 6d 64 72 2e  ...1.0......mdr.
2825b4560  7a 69 6e 67 66 72 6f 6e 74 c8 04 01 00 00 00 00  zingfront.......
,arg1:0x6c
,arg2:0x0

retval:fBiZAnYYId0YBTGaOa9sY4-Zqb-YQz-icux8Ra6G_b8aNrUnRDEMgJq5OXqDShD5QibOsQp-c345cXRoG9XhhpQoU8FDfMFU71lpYMyeWSHwBTHA_JMpAn7eJfy90A1RG7LFgTQSE_Iqxnm2f-cUS2IRFZC-D7ipMe-MFJR-69UA4pAKAdp_eSDGXM_VJeJ8_TkocFTwWzpeIHPvMRPv9S8opMBouDlBxLmQXszBX25Ci9k5LrJMvqUb3k_Satc-qv2itlVvyHgfD52MSNii0aTNQSb57Wt_x_KToBXPX84CBUxmJPigxe5BUVUNd6SKtZjZ6sUHKkkrgS7ViZQK5g
```

加密流程

1.开头插入字节码长度 0x6C
字节码结束的地方 0x6d之后使用rand生成随机数填充到0xF0长度

[C] *纯文本查看*

```
283b554a0  6c 0a 0b 69 50 68 6f 6e 65 20 31 33 2e 37 12 12  l..iPhone 13.7..
283b554b0  61 66 6d 61 2d 73 64 6b 2d 69 2d 76 37 2e 36 39  afma-sdk-i-v7.69
283b554c0  2e 30 c8 01 f9 c9 d0 98 06 18 11 28 03 30 64 20  .0.........(.0d
283b554d0  00 88 01 00 b8 01 f9 c9 d0 98 06 58 01 60 01 b0  ...........X.`..
283b554e0  01 01 98 01 00 f8 01 da 09 80 02 a0 11 88 02 80  ................
283b554f0  0f 92 02 03 31 2e 30 a0 04 02 f2 02 0d 6d 64 72  ....1.0......mdr
283b55500  2e 7a 69 6e 67 66 72 6f 6e 74 c8 04 01 55 64 81  .zingfront...Ud.
283b55510  d8 e9 2e ab d6 68 93 f4 c8 2c 50 76 a0 8f 63 1f  .....h...,Pv..c.
283b55520  66 83 42 9f 31 4a 6e 78 07 48 1f 4d 50 2e a6 95  f.B.1Jnx.H.MP...
283b55530  5f 13 c7 75 79 d0 f4 70 97 d8 78 d4 05 3e 68 63  _..uy..p..x..>hc
283b55540  54 d4 59 9d 9b b4 a7 be 48 1e 8b 6a e2 62 81 ec  T.Y.....H..j.b..
283b55550  58 77 09 97 1e 79 54 a5 04 07 f9 2d e2 24 02 e3  Xw...yT....-.$..
283b55560  a9 e1 85 2a 5f e5 ec 01 5a 63 3c 73 2c 61 65 df  ...*_...Zc<s,ae.
283b55570  76 37 6b c3 60 2f 02 69 70 60 26 87 f2 62 30 af  v7k.`/.ip`&..b0.
283b55580  02 30 80 d4 80 32 bc 3c 04 47 eb 00 09 82 a4 2f  .0...2.<.G...../
```

2.整体做 MD5 结果16个字节插入字节码起始位置

[C] *纯文本查看*

```
283883000  1c cd 55 06 5d 1a 23 5b f2 f6 96 3c 2c fc 42 c6  ..U.].#[...<,.B.
283883010  6c 0a 0b 69 50 68 6f 6e 65 20 31 33 2e 37 12 12  l..iPhone 13.7..
283883020  61 66 6d 61 2d 73 64 6b 2d 69 2d 76 37 2e 36 39  afma-sdk-i-v7.69
283883030  2e 30 c8 01 bd d3 cd 98 06 18 1d 28 03 30 64 20  .0.........(.0d
283883040  00 88 01 00 b8 01 bd d3 cd 98 06 58 01 60 01 b0  ...........X.`..
283883050  01 01 98 01 00 f8 01 da 09 80 02 a0 11 88 02 80  ................
283883060  0f 92 02 03 31 2e 30 a0 04 02 f2 02 0d 6d 64 72  ....1.0......mdr
283883070  2e 7a 69 6e 67 66 72 6f 6e 74 c8 04 01 38 0e c9  .zingfront...8..
283883080  9f 0a bf 08 f2 5b 25 c8 63 bb 5a a4 93 22 f9 eb  .....[%.c.Z.."..
283883090  37 f1 6f 3e 23 35 22 e0 43 5a d2 60 4c 57 dc e4  7.o>#5".CZ.`LW..
2838830a0  f7 67 05 61 f4 98 aa 82 0f 80 64 9a 7d 1c 88 b4  .g.a......d.}...
2838830b0  df 3b 65 78 f4 71 53 43 0e 4f 34 ce 8a b9 30 af  .;ex.qSC.O4...0.
2838830c0  f4 bc f1 fe e9 54 c8 07 f1 46 a8 cc 6f 23 7e 50  .....T...F..o#~P
2838830d0  2c 0d d1 e8 e9 ee f2 f2 a6 51 0f 45 34 16 90 78  ,........Q.E4..x
2838830e0  50 df e1 30 dc 1f ea ed b7 4b aa 88 e0 17 7e 6e  P..0.....K....~n
```

3.0x9CBE8 调用 gad\_bs 0x9E44C 12轮异或加密
进行到这里就基本结束了,剩下的都是纯体力工作

![](https://attach.52pojie.cn/forum/202211/03/231031wee9xliqtzt3lv7o.png)

![](https://attach.52pojie.cn/forum/202211/03/231033pr1p5pr60w1zhhri.png)

返回的结果结果为 \_ggu\_gad\_gwse

4.base64生成 A-Za-z0-9-\_格式

小结一下:
    时间过去的比较久,很多技术细节想不起来了
    一开始不知道里面用的标准算法,跟汇编走了好久.后面尝试一下发现走了很多冤枉路

还有就是谷歌的这个SDK里面并没有做很多混淆,就是传值的方式和平时见到的不太一样,难度较低,适合新手来学习逆向算法.大佬勿喷
样本有点大,就不放上来了
