# 安卓协议逆向之frida hook百例二

> **作者**: xiaoc996 | **发布时间**: 2022-11-14 14:14:00 | **版块**: 『移动安全区』 | **查看/回复**: 10655 / 87
> **原文**: [https://www.52pojie.cn/thread-1712752-1-1.html](https://www.52pojie.cn/thread-1712752-1-1.html)

---

### 安卓协议逆向之frida hook百例二

各位大佬好 我是一位往Android安全方向走的小菜鸟一枚 目前也是很努力在学 这个系列也会一直更新 记录自己的学习过程 大佬多担待担待 有出错的地方也帮忙指出

### frida配置

```
1. pycharm（python,JavaScript）
2.安卓模拟器（觉得哪个好用就用哪个）
3.frida配置（frida是配置在python的）
```

### 分析工具

```
1.jadx-gui (反编译工具)
2.ApkScan-PKID(查壳工具)
3.反射大师（脱壳工具）
4.fiddler（抓包工具）
（这期就差不多这么多工具 后面用到其他工具会贴出来）
```

### 目标app

```
LS4tLi0tLi4uLi0tLS0tIC0uLS4tLS4uLi4tLS0tLSAtLS0uLi0uLi0uLS0uLS0=
(题目：base对莫尔斯的升华)
```

### 分析过程

#### 刨析内容

此处为fd抓的password login提交

![](https://s1.ax1x.com/2022/11/14/zkg8C8.png)

提交的data

```
Encrypt 就一个那好吧
```

这时可以想一下 我们是password登陆的 那他必然会提交username和password

#### encrypt分析

###### 该说不说 是骡子是马直接丢jadx

![](https://s1.ax1x.com/2022/11/14/zkgLqA.png)

###### 加壳是吧小伙子 那咋办嘛 反射他！

###### （这里提一嘴，使用反射大师先用xp激活----然后打开反射大师勾选要射的apk----进入软件----当前ACTIVITY----长按写出DEX----修复Magic----确定就行了----然后复制下文件路径自己找 ）

![](https://s1.ax1x.com/2022/11/14/zk2hLj.png)

###### 接下来 搜一波Encrypt先

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/%E5%8A%A0%E8%BF%87.png)

###### 其实你搜Encrypt有很多结果  我找hook点也找了10多分钟 接下来看图吧  把大概分析出来的hook点跟大家说

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/%E6%80%9D%E8%B7%AF1.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114104939.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114110733.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114111111.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114112809.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114113437.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114114200.png)

```
###    md5的hook方法
Java.perform(function (){
    Java.use('com.dodonew.online.util.Utils').md5.implementation=function (data){

        console.log(data);
        var res = this.md5(data)
        console.log(res)
       return res;///劫持完代码看一下怎么个事就给你反回去
             }
    );
 }
```

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114120329.png)

```
####    encodeDesMap的hook方法
Java.perform(function (){
          var RequestUtil=Java.use('com.dodonew.online.http.RequestUtil');
         RequestUtil.encodeDesMap.overload('java.lang.String','java.lang.String','java.lang.String').implementation=function (data,data2,data3){
        console.log('\ndata=',data,'\ndata2=',data2,'\ndata3=',data3);
       var ees =this.encodeDesMap(data,data2,data3)
        console.log(ees)
       return this.encodeDesMap(data,data2,data3);///劫持完代码看一下怎么个事就给你反回去
      return ees
     }
         }
    );
```

###### OK 此时 看到这里的各位下面的东西我嚼碎了给各位呈现 记得给评分 点赞 评论哦

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114133800.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114134352.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114134410.png)

###### 上面这张图是我搜来的 可以看一下 我们继续往下讲

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114135213.png)

###### 好了现在明文 key iv  加密方式都知道了 我们尝试一下看看是不是我们要的结果

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114135449.png)

###### 这是我们哪里错了 我们再回去看看

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114140652.png)

![](https://blogbed-1258463147.cos.ap-guangzhou.myqcloud.com/20221114140726.png)

###### OK 成功 至此分析过程已经完毕

---

### 结束语

###### 例子很难找  这个帖子的例子是一个比较经典的例子 也有其他人做过  但是之前这个apk还没加壳  这次加了个壳 我在昨天做完后 今天就写帖了

###### 感谢各位的阅读 学逆向很累 但是喜欢的事还是得坚持下去 后面还是输出更好的例子给大家学习 我个人也在很努力的学习 跟大家一共共进步
