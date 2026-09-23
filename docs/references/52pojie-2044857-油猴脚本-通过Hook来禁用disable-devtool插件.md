# 油猴脚本-通过Hook来禁用disable-devtool插件

> **作者**: evlon | **发布时间**: 2025-07-10 18:53:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8017 / 95
> **原文**: [https://www.52pojie.cn/thread-2044857-1-1.html](https://www.52pojie.cn/thread-2044857-1-1.html)

---

*本帖最后由 evlon 于 2025-7-10 18:55 编辑*

### 01. 背景

项目中，习惯看网站的浏览器源码，但是这次只要一打开开发者工具(devtool)，浏览器就跳转到了“about:blank"。于是，有了这个文章。

### 02. 破解思路

1. 打开百度
2. 打开开发者工具(devtool),点击源代码标签，找到“事件监听器断电”，选中“加载”，勾选“beforunload","unload"。这个意思是在跳转到 ”about:blank"之前，中断
3. 保持开发者工具打开，在地址栏输入目标网址，打开，等待中断。
4. 通过堆栈，找到目标代码。

   ```
   loadjs.d("./app/study/course/detail/index", function(e, n, a) {
   var t, l, i, s, o = e("lodash/collection"), r = e("./app/util/aes"), c = e("./app/util/business/fsearch-view-util"), d = e("disable-devtool"), u = function() {
       d({
           clearIntervalWhenDevOpenTrigger: !1,
           ondevtoolopen: function() {
               window.open("about:blank", "_self")
           },
           detectors: [0, 1, 3, 4, 5, 6, 7]
       })
   },
   ```
5. 发现是loadjs 来加载disable-devtool, 那就想办法，在 d({})的时候，修改设置就行。

### 03 最终成果，油猴脚本

<https://github.com/evlon/hook-loadjs-disable-disable-devtool/blob/main/hook-loadjs-disable-disable-devtool>

```
// ==UserScript==
// @name         hook-loadjs-disable-disable-devtool
// @namespace    http://tampermonkey.net/
// @version      2025-07-09
// @description  try to take over the world!
// @AuThor       You
// @match        *://*/*
// @Icon         https://www.google.com/s2/favicons?sz=64&domain=chinamobile.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.clear = ()=>{
console.log('console.clear()');
    };

    Object.defineProperty(window, 'loadjs', {
        set(val_loadjs) {
            // 检查是不是你要拦截的对象
            //debugger;
            console.log('set loadjs = ',val_loadjs);

            Object.defineProperty(val_loadjs, 'd', {
                set(val_d) {
                    // 检查是不是你要拦截的对象
                    //debugger;
                    console.log('set loadjs.d = ',val_d);

                    let hook_val_d = new Proxy(val_d, {
                        apply(target, thisArg, argumentsList) {
                            // 显示参数

                            console.log('loadjs.d args:', argumentsList);
                            let oldargfn = argumentsList[1];
                            argumentsList[1] = (fnLoadModule,b,c)=>{

                                let hookfn_loadmodule = new Proxy(fnLoadModule,{
                                    apply(target2, thisArg2,[moduleName,...rest]){
                                        console.log('load module:',moduleName);

                                        const result2 = Reflect.apply(target2, thisArg2, [moduleName,...rest]);
                                        console.log('loaded module:',moduleName, result2);
                                        // 修改返回值
                                        if(moduleName == "disable-devtool"){
                                            //debugger;
                                            let disable_devtool = result2;
                                            const hook_result2 = (conf)=>{
                                                console.log('disable_devtool:(',conf,')');
                                                conf = {
                                                    clearIntervalWhenDevOpenTrigger: true,
                                                    ondevtoolopen: function() {
                                                        console.log("about:blank", "_self")
                                                    },
                                                    detectors: []
                                                }

                                                return disable_devtool(conf);
                                            };

                                            return hook_result2;
                                        }
                                        return result2;
                                    }

                                });

                                let ret = oldargfn(hookfn_loadmodule,b,c);
                                console.log('define module:',ret);
                                return ret;
                            };

                            // 调用原函数
                            const result = Reflect.apply(target, thisArg, argumentsList);

                            // 修改返回值
                            return result;
                        }
                    });

                    // 真正赋值
                    Object.defineProperty(val_loadjs, 'd', {
                        value: hook_val_d,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                },
                configurable: true
            });

            // 真正赋值
            Object.defineProperty(window, 'loadjs', {
                value: val_loadjs,
                writable: true,
                configurable: true,
                enumerable: true
            });
        },
        configurable: true
    });

})();
```

![](https://attach.52pojie.cn/forum/202507/10/185442yop00kx0ccpoh4az.png)
