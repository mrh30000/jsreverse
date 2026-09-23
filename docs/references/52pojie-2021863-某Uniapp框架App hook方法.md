# 某Uniapp框架App hook方法

> **作者**: KillLog | **发布时间**: 2025-04-06 16:05:00 | **版块**: 『移动安全区』 | **查看/回复**: 1544 / 16
> **原文**: [https://www.52pojie.cn/thread-2021863-1-1.html](https://www.52pojie.cn/thread-2021863-1-1.html)

---

看到其他大佬分析了该app，也知道了开发者在论坛，本帖只是为了技术交流

看到该App的结构是uniapp框架的，之前也没分析过

由于作者加固，所以我直接看的其他uniapp的java层代码

当然此帖hook方法适用于全部uniapp框架的App

示例app:爱琉璃

对于uniapp还是有点分析的经验，app的js都会放在app-service.js里

所以直接搜app-service.js字符串

![](https://attach.52pojie.cn/forum/202504/06/160348opou4pijiztb0x4b.png)

这几个结果一个一个查看

![](https://attach.52pojie.cn/forum/202504/06/160350gzvg5l295l6ysjli.png)

最终定位到这个函数

直接frida去hook

[JavaScript] *纯文本查看*

```
if (Java.available) {

    Java.perform(function () {

        let WXSDKInstance = Java.use("com.taobao.weex.WXSDKInstance");

        WXSDKInstance["render"].overload('java.lang.String', 'java.lang.String', 'java.util.Map', 'java.lang.String', 'com.taobao.weex.common.WXRenderStrategy').implementation = function (str, str2, map, str3, wXRenderStrategy) {

            console.log(`WXSDKInstance.render is called: str=${str}, str2=${str2}, map=${map}, str3=${str3}, wXRenderStrategy=${wXRenderStrategy}`);

            this["render"](str, str2, map, str3, wXRenderStrategy);

        };

    });
```

![](https://attach.52pojie.cn/forum/202504/06/160353ofl0kvh039hhnz10.png)

可以看到str2传过来的就是js内容了，str3传的是js名
那么就可以直接hook这个地方了

[Java] *纯文本查看*

```
Class<?> wxSDKInstance=XposedHelpers.findClass("com.taobao.weex.WXSDKInstance",classLoader);
Class<?> script=XposedHelpers.findClass("com.taobao.weex.Script",classLoader);
Class<?> wXRenderStrategy=XposedHelpers.findClass("com.taobao.weex.common.WXRenderStrategy",classLoader);
XposedHelpers.findAndHookMethod(wxSDKInstance, "render", String.class, script, Map.class, String.class, wXRenderStrategy, new XC_MethodHook() {
    [url=home.php?mod=space&uid=1892347]@Override[/url]
    protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
        XposedBridge.log("hook成功");
        dump();
        if (param.args[3] instanceof String){
            JSONObject json=new JSONObject((String) param.args[3]);
            String URL=json.getString("Plus_InitURL");
            XposedBridge.log("URL:"+URL);
            if (URL.contains("app-service.js")){
                String mContent=(String) XposedHelpers.getObjectField(param.args[1],"mContent");
                String newMContext=mContent.replace("t.replace(/\\[hide(([\\s\\S])*?)\\[\\/hide\\]/g,\"<div style='width:100%;padding:15px 15px;background:#cbffea;color:#3cc9a4;border:solid 1px #3cc9a4;box-sizing: border-box;border-radius: 20px;text-align: center;'>\\u8be5\\u5185\\u5bb9\\u8bc4\\u8bba\\u540e\\u663e\\u793a\\uff01</div>\"),","");
                XposedHelpers.setObjectField(param.args[1],"mContent",newMContext);
            }
        }
    }
});
```

直接用的replace去替换的字符串

也是达到[破解](https://www.52pojie.cn)效果的

修改前

![](https://attach.52pojie.cn/forum/202504/06/160355cdvxki06ib96paap.png)

修改后

![](https://attach.52pojie.cn/forum/202504/06/160358s8pphgo3ox37ovpo.png)
