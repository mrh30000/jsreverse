# [Android 原创] 某app目录接口逆向解密分析过程

> **作者**: luoziyi | **发布时间**: 2024-03-13 16:39:00 | **版块**: 『移动安全区』 | **查看/回复**: 5422 / 23
> **原文**: [https://www.52pojie.cn/thread-1900055-1-1.html](https://www.52pojie.cn/thread-1900055-1-1.html)

---

### 某app目录接口逆向解密分析过程

1 使用Sunny工具抓包

使用Sunny对App进行抓包，发现响应加密，看起来像AES的CBC模式：

![](https://attach.52pojie.cn/forum/202403/13/163706ip67tlr3p8tjfrtt.png)

2 使用JADX定位加密位置 ，关键加密算法如图

![](https://attach.52pojie.cn/forum/202403/13/163729fcccdc3e340436mc.png)

4. 使用frida拦截明文

   ![](https://attach.52pojie.cn/forum/202403/13/163744jx6j7wwk2sqybwrp.png)

   ![在这里插入图片描述](https://img-blog.csdnimg.cn/direct/8924013f94c94f27b5a3bfda7163f3ae.png#pic_center)

```
#代码如下
function hook(){
    let OkHttpHelper = Java.use("com.wpyx.eduWp.common.util.http.OkHttpHelper");
    OkHttpHelper["requestPost"].implementation = function (str, hashMap, onOkHttpCallBack) {
        console.log('requestPost is called' + ', ' + 'str: ' + str + ', ' + 'hashMap: ' + hashMap + ', ' + 'onOkHttpCallBack: ' + onOkHttpCallBack);
        let ret = this.requestPost(str, hashMap, onOkHttpCallBack);
        console.log('requestPost ret value is ' + ret);
        return ret;
    };

}

function main(){
    Java.perform(function (){
        hook();
    })
}
setImmediate(main);
```

这个类名已经解密完了 ，代码里面已经很明显了 ，里面包含了一个解密的函数 AesUtils.decrypt()，标准系统库函数，我们继续跟进去看

![](https://attach.52pojie.cn/forum/202403/13/163805ja06c04b4zf4xcac.png)

这个类里面的函数已经写的很清楚了，使用WT工具进行解密：

![](https://attach.52pojie.cn/forum/202403/13/163825yfrslilfs44yjq6f.png)

使用javascript脚本解密：

![](https://attach.52pojie.cn/forum/202403/13/163852dtferhrbzbeilw38.png)

到这里已经分析结束了，本文章仅限交流学习

### 总结

本次APP逆向过程需要熟练各种工具的使用以及环境的配置，如使用frida等动态调试技术，而大部分人的手机都没有root，所以使用模拟器，JEB，GDA等环境
