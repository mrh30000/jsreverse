# js hook 改进

> **作者**: roysue | **发布时间**: 2021-09-26 10:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10101 / 41
> **原文**: [https://www.52pojie.cn/thread-1519460-1-1.html](https://www.52pojie.cn/thread-1519460-1-1.html)

---

### js批量hook

#### 参考hook

我们可以更改上次的脚本，用来遍历所有的函数来找出其中是否有以加密命名的函数，来尝试找到js中的加密函数，参考自`http://bbs.nightteam.cn/thread-210.htm`
我们用它的代码测试一下,我们自己的网站

```
(function() {
    'use strict';
    !function () {
        'use strict';
        var source = ['alert','decodeData','String.fromCharCode',
            'fromCharCode','base64decode','md5','decode','btoa','JSON.stringify',
            'MD5','RSA','AES','CryptoJS','encrypt',
            'strdecode',"encode",'decodeURIComponent','_t'];
        console.log("开始测试是否有解密函数");
        let realCtx, realName;
        function getRealCtx(ctx, funcName) {
            let parts = funcName.split(".");
            let realCtx = ctx;
            for(let i = 0; i < parts.length - 1; i++) {
                realCtx = realCtx[parts[i]];
            }
            return realCtx;
        }
        function getRealName(funcName) {
            let parts = funcName.split(".");
            return parts[parts.length - 1];
        }
        function test(ctx) {
            for(let i = 0; i < source.length; i++) {
                let f = source[i];
                let realCtx = getRealCtx(ctx, f);
                let realName = getRealName(f);
                let chars = realCtx[realName];
                if (chars != undefined){
                    console.log("发现可疑函数：", f);
                    console.log(chars);
                    console.log("---------------------");
                }else{
                    console.log("未发现：", f);
                }
            }
        }
        test(window);
    }();
})();
```

![](https://attach.52pojie.cn/forum/202109/26/104631qt5o12pmmwt6qjzj.png)

#### 改进

但是这种方式无法找到局部变量或混淆之后的方法有一定的局限性,我们壳以根据这种思路进行一下小的改进，将系统底层的对象的所有函数都hook上，那么当任何调用的时候都会经过我们重写的函数，以String为例。首先我们遇到了第一个问题，就是一些有一些属性不可被遍历如下图，所以不能用循环的方式遍历，有一些属性不能被重写，哦我们同样也是不能hook它的。

![](https://attach.52pojie.cn/forum/202109/26/104635ib6lkmlqwk7fk7f5.png)

```
for (const stringHookArrayKey in String_hook_Array) {
    let value = String_hook_Array[stringHookArrayKey]
    if(value["writable"]
        && typeof value.value === "function"){
        console.log(stringHookArrayKey)
        value.value.hook(String)
    }
}
```

接着我们还要hook原形链中的方法,为了防止套娃调用爆栈，所以我们不处理toString方法，另外发现String中的concat方法一直在搞我们，所以把他也过滤掉。

![](https://attach.52pojie.cn/forum/202109/26/104638rlxhh6nrnknnauei.png)

```
for (const stringPrototypeHookArrayKey in String_prototype_hook_Array) {
    let value = String_prototype_hook_Array[stringPrototypeHookArrayKey]
    if(value["writable"]
        && typeof value.value === "function"
        && stringPrototypeHookArrayKey !== "toString"
        && stringPrototypeHookArrayKey !== "concat"
    ){
        console.log(stringPrototypeHookArrayKey)
        value.value.hook(String.prototype)
    }
}
```

最终成品如下,这样有一个小问题，就是虽然我们能把所有东西都hook到，但是会非常的卡顿，因为我们console.log了太多的内容

```
let String_hook_Array = Object.getOwnPropertyDescriptors(String)
let String_prototype_hook_Array = Object.getOwnPropertyDescriptors(String.prototype)

for (const stringHookArrayKey in String_hook_Array) {
    let value = String_hook_Array[stringHookArrayKey]
    if(value["writable"]
        && typeof value.value === "function"){
        console.log(stringHookArrayKey)
        value.value.hook(String)
    }
}

for (const stringPrototypeHookArrayKey in String_prototype_hook_Array) {
    let value = String_prototype_hook_Array[stringPrototypeHookArrayKey]
    if(value["writable"]
        && typeof value.value === "function"
        && stringPrototypeHookArrayKey !== "toString"
        && stringPrototypeHookArrayKey !== "concat"
    ){
        console.log(stringPrototypeHookArrayKey)
        value.value.hook(String.prototype)
    }
}
console.log("enum hook start")
```

![](https://attach.52pojie.cn/forum/202109/26/104640jvdzzuuuzfvgftu6.png)

#### js版r0trace

接下来终于进入了我们今天的正题，就是如何实现一个像r0trace一样的项目，能够将浏览器的所有操作的都hook上，这样能够更方便的使用hook功能，如果我们不知道具体参数在哪，可以把整个浏览器所有的对象都hook上定位目标参数。首先第一步就是模仿r0trace定义一个黑白名单

```
    if(!BlackList){
        BlackList = []
    }
    if(!WhiteList){
        WhiteList = []
    }
```

然后和上面一样，做2步就是将原型链和本身所有的属性都传入startHook函数

```
    let HookObjDescriptors = Object.getOwnPropertyDescriptors(HookObj)
    if(HookObj.prototype){
        let HookObjPrototypeDescriptors = Object.getOwnPropertyDescriptors(HookObj.prototype)
        startHook(HookObjPrototypeDescriptors, HookObj.prototype)
    }
    startHook(HookObjDescriptors, HookObj)
```

最后实现startHook函数，只要做一些小的过滤处理即可，最后成品如下，白名单为空就是hook这个对象的所有函数，黑名单中把爆栈的函数过滤掉即可

```
function batchHook(HookObj, BlackList, WhiteList){
    if(!BlackList){
        BlackList = []
    }
    if(!WhiteList){
        WhiteList = []
    }
    function startHook(Descriptors, HookObj){
        for (const descriptorsKey in Descriptors) {
            let value = Descriptors[descriptorsKey]
            let rawFunc = value["value"]
            if(typeof rawFunc === "function"
                && value["writable"]
                && !BlackList.includes(descriptorsKey)
                && (WhiteList.length ? WhiteList.includes(descriptorsKey) : true))
            {
                console.log(descriptorsKey)
                rawFunc.hook(HookObj)
            }
        }
    }

    let HookObjDescriptors = Object.getOwnPropertyDescriptors(HookObj)
    if(HookObj.prototype){
        let HookObjPrototypeDescriptors = Object.getOwnPropertyDescriptors(HookObj.prototype)
        startHook(HookObjPrototypeDescriptors, HookObj.prototype)
    }
    startHook(HookObjDescriptors, HookObj)

}

batchHook(String, ["toString", "concat"], [])
```

![](https://attach.52pojie.cn/forum/202109/26/104643jm93sdmv6h3z0mzm.png)

直接就把我们之前验证码的密钥输出出来了，十分的好用，当然由于它输出的数据太多我们在浏览器里面看着不是很舒服，可以把它输出到一个log文件中，右键直接点击`save as`即可，如下图成功定位到了我们密钥的位置，当让如果不怕卡死的话还可以将console.log改成console.trace，能够更轻松的通过调用栈。找到它的函数的位置

![](https://attach.52pojie.cn/forum/202109/26/104646s5itrn5aakzb05bz.png)

#### js版objection 内存漫游

最后介绍一下`https://github.com/CC11001100/ast-hook-for-js-RE`这个项目,借助这个工具我们可以检索浏览器中的任意数据。首先安装它，非常的简单，用git拉

```
git clone https://github.com/CC11001100/ast-hook-for-js-RE.git
```

然后用pycharm打开它，保证自己的nodejs版本大于14.0.0，然后在pycharm的命令行安装

```
npm install
```

然后用`anyproxy ca`命令去启动一个server,我们访问`127.0.0.1:8002/`去安装一个证书

![](https://attach.52pojie.cn/forum/202109/26/104648vjjmwmrxemrrjewe.png)

![](https://attach.52pojie.cn/forum/202109/26/104734zta6ynt9lz9ohj39.png)

![](https://attach.52pojie.cn/forum/202109/26/104744t1r1bq22kwq614mq.png)

![](https://attach.52pojie.cn/forum/202109/26/104747ei2909aaz5d50d7t.png)

然后启动proxy-serer，给浏览器配置一个代{过}{滤}理或者直接启动的时候就加代{过}{滤}理`google-chrome --proxy-server="127.0.0.1:10086" --no-sandbox`

![](https://attach.52pojie.cn/forum/202109/26/104749v8r2op1odf2p82rp.png)

pycharm中出现内容就说明代{过}{滤}理配置成功了

![](https://attach.52pojie.cn/forum/202109/26/104751aiz5zszhss8ssqlv.png)

然后打开我们的试题网站做一个测试，直接用`hook.search`传入我们的参数就好了,非常的牛逼所有出现这个参数的地方都打印出来了

![](https://attach.52pojie.cn/forum/202109/26/104753mrraa7222a7ddv02.png)
