# 某视频网站,不但检测adblock,而且加入了F12调试检测

> **作者**: y376694236 | **发布时间**: 2020-12-31 16:25:00 | **版块**: 『编程语言区』 | **查看/回复**: 3687 / 5
> **原文**: [https://www.52pojie.cn/thread-1341422-1-1.html](https://www.52pojie.cn/thread-1341422-1-1.html)

---

[Asm] *纯文本查看*

```
/**
 * 检测到调试时进行的操作
 */
let onDebug = function () {
    //提示
    document.write('检测到非法调试！请停止调试后刷新本页面！');
    /*卡死*/
    // while (true) {
    //     console.log('hi');
    //     console.clear();
    // }

};

/*通过 debugger 时间检测*/
setInterval(function () {
    let st, et;
    st = new Date().getTime();
    debugger;
    et = new Date().getTime();
    if ((et - st) > 1000) {
        onDebug();
    }
}, 1000);

/*检测 console.log() 在不同环境（F12执行时间久一些）下的运行时间不同*/
/*不要这段代码了，因为执行时间还和电脑配置有关，具有不确定性*/
// setInterval(function(){
//     let startTime = performance.now(),
//         check, diff;
//     for (check = 0; check < 1000; check++) {
//         console.log(check);
//         console.clear();
//     }
//     diff = performance.now() - startTime;
//     if (diff > 200) {
//         onDebug();
//     }
// },1000);

/*监控 F12的按下*/
document.onkeydown = document.onkeyup = document.onkeypress = function (event) {
    const e = event || window.event || arguments.callee.caller.arguments[0];

    if (e && e.keyCode == 123) {
        onDebug();
    }
};

/*调试相关的函数重定义*/
// window['console']['log']= function(){};

/**
 * 当dom被发送至控制台时(例如console.log)
 * 浏览器会自动通过该dom的getter()获取该 dom 的id
 * 所以我们可以创建一个dom，然后发送到控制台，并且重定义其getter()
 */
let div = document.createElement('div');
Object.defineProperty(div, "id", {
    get: () => {
        clearInterval(loop);
        onDebug();
    }
});
let loop = setInterval(() => {
    console.log(div);
    console.clear();
});
```
