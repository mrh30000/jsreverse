# 奇思淫巧之某APP加密sign逆向分析

> **作者**: 宝明软件作者 | **发布时间**: 2021-07-21 23:48:00 | **版块**: 『移动安全区』 | **查看/回复**: 7356 / 28
> **原文**: [https://www.52pojie.cn/thread-1479871-1-1.html](https://www.52pojie.cn/thread-1479871-1-1.html)

---

Ps 仅供学习交流 否则后果自负
APP来自论坛 一个求助帖 主要学习看看思路

1.下载app:aHR0cDovL2xhYXBwLmd4aGhza2ouY29tLzV4eXY=，随手拖入查壳：无壳  模拟器安装后运行，直奔登录抓包

[PHP] *纯文本查看*

```
POST http://lianai.gxhhskj.com/index.php/Login/login HTTP/1.1
{"telphone":"15252661111","password":"baoming520","clientid":"","uuid":"60d01177c501303e","timestamp":1626877068,"sign":"6faaa2c276b6d8c485502d75f66c81b6"}
```

2.直接根据经验目测md5无疑，接着一套工具hook走起此处省略，肯定是hook不出的，毛都没有，不在java难道是so？看着app这么烂理论不是，所以我打开了压缩包观察，
  随手点了点文件夹。原来如此，好家伙，就是个Android WebView H5的网页，问题不大，又没壳，那就简单多了

![](https://attach.52pojie.cn/forum/202107/21/233819i0lk3cyuxwq0c0gc.png)

3.打开login.html的网页双击本地浏览器打开，搜索加密sign，基础东西不解释，找到关键点，发现就是传入个时间戳，调用myEncrypt加密

![](https://attach.52pojie.cn/forum/202107/21/233821iscbwg0icwfwssxs.png)

搜myEncrypt，跟到js部分  发现还被混淆过，但是可以大致知道加密方式

![](https://attach.52pojie.cn/forum/202107/21/233823y2scf6ndcinfs6w6.png)

[JavaScript] *纯文本查看*

```
    function _0x7e3643(_0x462407) {
return hex_md5(KEY + hex_md5(_0x2223ce[_0x54d4('0', 'UDEP')](hex_md5, _0x462407) + KEY));
}
```

就是传了个时间戳，各种拼接md5，那过程到底如何拼接的才是重点，可这对于我们这种新手，实属看不懂啊，so我们奇特的思路开始了
-------------------------------------------表演开始-------------------------------

4.既然是h5,又调用了hex\_md5，那我们去文件夹找找加载的js静态文件试试，果不然，在\assets\apps\\_\_UNI\_\_BA8A8D9\www\static\js 下发现，一家子都在这儿

![](https://attach.52pojie.cn/forum/202107/21/233826nuabx887kknx78fg.png)

我们直接把md5这个js拖出来，编辑，搜索找到hex\_md5()函数进行修改，直捣黄龙

[JavaScript] *纯文本查看*

```
原数据：先
function hex_md5(s){
return binl2hex(core_md5(str2binl(s), s.length * chrsz));}
修改成：
function hex_md5(s){
alert(s  + "  md5结果:"+ binl2hex(core_md5(str2binl(s), s.length * chrsz))); //弹出信息框 明文s和加密结果
return binl2hex(core_md5(str2binl(s), s.length * chrsz));}
```

完事之后保存文档，拖进去压缩包替换掉原先的js文件，然后模拟器卸载app，重新安装我们修改过的
至此基本结束，下面可以看看我们的成果了，哈哈哈哈哈哈哈！！！！先脑补一下吧
运行app后就已经有窗口开始弹出，我们确定，到登录后输入，和我们预想的结果一样

![](https://attach.52pojie.cn/forum/202107/21/233828xskfeigetfg0e8ft.png)

![](https://attach.52pojie.cn/forum/202107/21/233833uwy8gzdyj4wwkwpk.png)

[Python] *纯文本查看*

```
{"telphone":"15251111111","password":"baoming520","clientid":"","uuid":"60d01177c501303e","timestamp":1626879640,"sign":"5c5761d259f4b7b44e583724a0c3d11b"}
```

分析弹出参数，明白了加密方式了，我们可以开始敲代码啦

![](https://static.52pojie.cn/static/image/filetype/rar.gif)

[某sign算法源码学习.rar](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjMxMzUxOXxmYTMyOGIwOXwxNzkwMTI2NTg3fDIzMjM3Mjd8MTQ3OTg3MQ%3D%3D)
*(211.01 KB, 下载次数: 48)*

至此我们的任务全部完成，其实我们也可以在myEncrypt下的加密函数添加弹窗或者输出console.log()都可以，看个人喜好
