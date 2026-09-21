# 小白hook无限debugger

> **作者**: YIUA | **发布时间**: 2024-03-17 14:44:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8541 / 50
> **原文**: [https://www.52pojie.cn/thread-1901995-1-1.html](https://www.52pojie.cn/thread-1901995-1-1.html)

---

[md]## 常见debugger及如何Hook

#### 1、直接使用debugger

#### 2、**使用 eval() 函数**

```
eval("debugger;")
eval('(function() {var a = new Date(); debugger; return new Date() - a > 100;}())')
```

#### 3、定时器触发

```
setInterval(function (){debugger;},4000);
```

### 第一种：永不在此断点

在debugger左边，右键，选择永不在此断点或者编辑该断点改为false。

优点：简单，易上手

缺点：如果存在内存爆破，无限调用，该方法会使浏览器卡死

![image-20240317140546872.png](https://img2.imgtp.com/2024/03/17/Cv4j17ki.png)

### 第二种：Hook 无限 debugger 函数

通过定时器实现的debugger，必须要从根源进行hook，否则定时器会一直重复执行，也就是必须在定时器执行前将定时器给hook掉

```
setInterval(function () {
    debugger
}, 500)
```

猿人学第一题就是该类型，在不使用第一种方法的情况下我们可以这样做

![image-20240317141056319.png](https://img2.imgtp.com/2024/03/17/xam5TW0C.png)

首先在定时器还未运行前进行断点，然后进行hook，下面给一种最简单的hook方法

```
window.setInterval = function(){};
```

2.构造器类型debugger

特征点就是有constructor

```
Function.prototype.__constructor_back = Function.prototype.constructor;
Function.prototype.constructor = function() {
    if(arguments && typeof arguments[0]==='string'){
        if("debugger" === arguments[0]){
            return
        }
    }
   return Function.prototype.__constructor_back.apply(this,arguments);
}
```

### 第三种：本地替换

将网页js保存到本地，把debugger函数进行修改然后使用浏览器开发者工具替换修改js，或者通过FD工具替换。

### 方式五：**使用Fiddler、油猴等插件Hook**

1.首先打开想要过debugger的网页

2.点击油猴，选择添加新脚本

3.在下面的自调用函数中写hook方法

4.点击文件保存，然后刷新网页就可以用了

![image-20240317141636251.png](https://img2.imgtp.com/2024/03/17/i9FAmkUS.png)

Fiddler工具（如何安装证书的教程请百度，这里只讲如何hook）

1.打开工具，使用编程猫插件的注入hook

2.地址清空，然后勾选开启

3.进入调试的网页刷新即可

![image-20240317141859985.png](https://img2.imgtp.com/2024/03/17/6qv26gjq.png)

[/md]
