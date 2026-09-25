# de到app算法分析

> **作者**: xiayutianz | **发布时间**: 2025-11-18 18:04:00 | **版块**: 『移动安全区』 | **查看/回复**: 5313 / 31
> **原文**: [https://www.52pojie.cn/thread-2073893-1-1.html](https://www.52pojie.cn/thread-2073893-1-1.html)

---

### de到app算法分析

#### 1. 概述

> 版本：12.18.0
>
> 接口：搜索接口
>
> 加固：未加固

* 目标是 G-Auth-Sign 这个字段，版本的话应该是最新版；
* 样本来源是我在网上冲浪偶然发现的，感觉是一个不错的样本；
* 样本涉及一个简单的hmacsha1算法，需要你有基本了解，默认你有；

#### 2. 抓包与定位

* 抓包没有什么阻拦，正常抓就行；

![image-20251117152141385](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251117152141385.png)

* 随便输入关键词就行，G-Auth-Token是个jwt，这个不管；
* 具体的定位我这里不说了，定位不是难题，后续如果还有文章这种java层的东西我应该不会特别提了；

![image-20251117153933197](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251117153933197.png)

* calcSignature这个函数就是目标函数，返回值就是sign；

#### 3. 算法分析

* 先hook看看参数吧，这里抓包先不停，后续留一组测试数据；这里的打印参数我折腾了很久，始终打印不出满意的效果；最终依靠我一个朋友[xiaofeng]的代码打印出了满意的效果，在此表达感谢；

```
function iterateMap(map) {
    if (map == null) {
        console.error("Map is null");
        return;
    }
    var keyset = map.keySet();
    var it = keyset.iterator();
    console.log("Map contents:");
    while (it.hasNext()) {
        var key = it.next();
        var value = map.get(key);
        // 处理 key 和 value 可能为 null 的情况
        var ByteString = Java.use("com.android.okhttp.okio.ByteString");
        let value_str = ByteString.of.overload('[B').call(ByteString, value).utf8();
        var keystr = key ? key.toString() : "null";
        console.log(keystr + " = " + value_str);
    }

}

function hook_java() {
    Java.perform(function () {
        let BaseApi = Java.use("com.iget.baselib.BaseApi");
        BaseApi["calcSignature"].implementation = function (map, map2) {
            iterateMap(map)
            iterateMap(map2)
            let result = this["calcSignature"](map, map2);
            console.log(`BaseApi.calcSignature result=${result}`);
            return result;
        };

    })
}

hook_java()
```

* 打印结果：

```
Map1 contents:
path = /search/v3/tophits
method = POST
content-type = application/x-www-form-urlencoded
secret = eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJpZ2V0Z2V0LmNvbSIsImV4cCI6MTc2NjAyMjkyNCwiaWF0IjoxNzYzNDMwOTI0LCJpc3MiOiJEREdXIEpXVCBNSURETEVXQVJFIiwibmJmIjoxNzYzNDMwOTI0LCJzdWIiOiI2MjA3MzI3OTMiLCJkZXZpY2VfaWQiOiIiLCJkZXZpY2VfdHlwZSI6IiJ9.Td8pPXzGA3a450wrO7pD_86WTW89mJzCb11aDHCW0LfeTbRdZMaRW0ifPVS_4BurKKyhdyzoLdErBMj5d1l0Ew
body = tab_type=0&h=%7B%22u%22%3A%22620732793%22%2C%22thumb%22%3A%22xl%22%2C%22dt%22%3A%22phone%22%2C%22ov%22%3A%2212%22%2C%22net%22%3A%22wifi%22%2C%22os%22%3A%22ANDROID%22%2C%22d%22%3A%22ce286af9961ca0fc%22%2C%22dv%22%3A%22Pixel%206%22%2C%22t%22%3A%22json%22%2C%22chil%22%3A%2213%22%2C%22v%22%3A%222%22%2C%22av%22%3A%2212.18.0%22%2C%22scr%22%3A%221080*2240%22%2C%22scale%22%3A%222.625%22%2C%22adv%22%3A%221%22%2C%22ts%22%3A%221763430939%22%2C%22s%22%3A%225e705cd00d5400b8%22%2C%22seid%22%3A%22ce286af9961ca0fc%22%7D&page=1&is_ebook_vip=0&search_type=0&request_id=&content=qqqq&page_size=20
nonce = 1a2999d76d887600d30481b39ab06295
query_string =
timestamp = 1763430939

Map2 contents:
Xi-D = ce286af9961ca0fc
Xi-Scr = 1080*2240
Xi-Dt = phone
Xi-SSID = 92ed5f57-0ed1-42fc-a8c0-ad25957a4ae9
Xi-Net = wifi
Xi-Dv = Pixel 6
Xi-Os = ANDROID
Xi-Thumb = xl
Xi-Trace-Id = 4a8de30118309213
Xi-Ov = 12
Xi-App-Key = android-12.18.0
Xi-Chil = 13
Xi-B = google
Xi-Adv = 1
Xi-Span-Id = 0
Xi-T = json
Xi-Scale = 2.625
Xi-Uid = 620732793
Xi-V = 2
Xi-ddd-version = 2
Xi-M = Google
Xi-Av = 12.18.0
Xi-Seid = ce286af9961ca0fc
Xi-Parent-Id = 27be68114729b908
BaseApi.calcSignature result=b30c7e6fb6505ed6cfd4c050ee7afcd5ec3a9dcc
```

* 这里记得开抓包，方便对比数据来源，后续算法还原就以这一组为标准；这些参数基本上都是带着的，其中的nonce可能需要看看，但估计也是随机的而已；
* 开始模拟执行，unidbg辅助算法还原的体验真是太好了；

```
package com.sana.dedao;

import com.github.unidbg.AndroidEmulator;
import com.github.unidbg.Module;
import com.github.unidbg.arm.backend.Unicorn2Factory;
import com.github.unidbg.linux.android.AndroidEmulatorBuilder;
import com.github.unidbg.linux.android.AndroidResolver;
import com.github.unidbg.linux.android.dvm.AbstractJni;
import com.github.unidbg.linux.android.dvm.DalvikModule;
import com.github.unidbg.linux.android.dvm.VM;
import com.github.unidbg.memory.Memory;

import java.io.File;

public class Dedao extends AbstractJni {

    public static AndroidEmulator emulator;
    public static Memory memory;
    public static VM vm;
    public static Module module;

    public Dedao() {
        emulator = AndroidEmulatorBuilder
                .for64Bit()
                .addBackendFactory(new Unicorn2Factory(true))
                .build();

        memory = emulator.getMemory();
        memory.setLibraryResolver(new AndroidResolver(23));

        vm = emulator.createDalvikVM(new File("src/test/java/com/sana/dedao/file/得到v12.18.0.apk"));
        vm.setJni(this);
        vm.setVerbose(true);
        DalvikModule dm = vm.loadLibrary(new File("src/test/java/com/sana/dedao/file/libbase-lib.so"), true);
        module = dm.getModule();
        dm.callJNI_OnLoad(emulator);

    }

    public static void main(String[] args) {
        Dedao MainActivity = new Dedao();
    }
}
```

* 直接能跑出结果，不需要补环境；

![image-20251118100632173](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118100632173.png)

* 目标函数的偏移是：0x63518，这里函数很多，还有我们后续用的上的，去ida看看；

![image-20251118100749710](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118100749710.png)

* 非常良好，没有混淆，这里的入参少了，稍微改一下，加上3个；

![image-20251118102040813](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118102040813.png)

* 下面开始call目标函数，这里重点就在于类型的传递；

```
private void call_calcSignature() {
    HashMap map1 = new HashMap();
    map1.put("path", "/search/v3/tophits".getBytes());
    map1.put("method", "POST".getBytes());
    map1.put("content-type", "application/x-www-form-urlencoded".getBytes());
    map1.put("secret", "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJpZ2V0Z2V0LmNvbSIsImV4cCI6MTc2NjAyMjkyNCwiaWF0IjoxNzYzNDMwOTI0LCJpc3MiOiJEREdXIEpXVCBNSURETEVXQVJFIiwibmJmIjoxNzYzNDMwOTI0LCJzdWIiOiI2MjA3MzI3OTMiLCJkZXZpY2VfaWQiOiIiLCJkZXZpY2VfdHlwZSI6IiJ9.Td8pPXzGA3a450wrO7pD_86WTW89mJzCb11aDHCW0LfeTbRdZMaRW0ifPVS_4BurKKyhdyzoLdErBMj5d1l0Ew".getBytes());
    map1.put("body", "tab_type=0&h=%7B%22u%22%3A%22620732793%22%2C%22thumb%22%3A%22xl%22%2C%22dt%22%3A%22phone%22%2C%22ov%22%3A%2212%22%2C%22net%22%3A%22wifi%22%2C%22os%22%3A%22ANDROID%22%2C%22d%22%3A%22ce286af9961ca0fc%22%2C%22dv%22%3A%22Pixel%206%22%2C%22t%22%3A%22json%22%2C%22chil%22%3A%2213%22%2C%22v%22%3A%222%22%2C%22av%22%3A%2212.18.0%22%2C%22scr%22%3A%221080*2240%22%2C%22scale%22%3A%222.625%22%2C%22adv%22%3A%221%22%2C%22ts%22%3A%221763430939%22%2C%22s%22%3A%225e705cd00d5400b8%22%2C%22seid%22%3A%22ce286af9961ca0fc%22%7D&page=1&is_ebook_vip=0&search_type=0&request_id=&content=qqqq&page_size=20".getBytes());
    map1.put("nonce", "1a2999d76d887600d30481b39ab06295".getBytes());
    map1.put("query_string", "".getBytes());
    map1.put("timestamp", "1763430939".getBytes());

    HashMap map2 = new HashMap();
    map2.put("Xi-D", "ce286af9961ca0fc".getBytes());
    map2.put("Xi-Scr", "1080*2240".getBytes());
    map2.put("Xi-Dt", "phone".getBytes());
    map2.put("Xi-SSID", "92ed5f57-0ed1-42fc-a8c0-ad25957a4ae9".getBytes());
    map2.put("Xi-Net", "wifi".getBytes());
    map2.put("Xi-Dv", "Pixel 6".getBytes());
    map2.put("Xi-Os", "ANDROID".getBytes());
    map2.put("Xi-Thumb", "xl".getBytes());
    map2.put("Xi-Trace-Id", "4a8de30118309213".getBytes());
    map2.put("Xi-Ov", "12".getBytes());
    map2.put("Xi-App-Key", "android-12.18.0".getBytes());
    map2.put("Xi-Chil", "13".getBytes());
    map2.put("Xi-B", "google".getBytes());
    map2.put("Xi-Adv", "1".getBytes());
    map2.put("Xi-Span-Id", "0".getBytes());
    map2.put("Xi-T", "json".getBytes());
    map2.put("Xi-Scale", "2.625".getBytes());
    map2.put("Xi-Uid", "620732793".getBytes());
    map2.put("Xi-V", "2".getBytes());
    map2.put("Xi-ddd-version", "2".getBytes());
    map2.put("Xi-M", "Google".getBytes());
    map2.put("Xi-Av", "12.18.0".getBytes());
    map2.put("Xi-Seid", "ce286af9961ca0fc".getBytes());
    map2.put("Xi-Parent-Id", "27be68114729b908".getBytes());
    List<Object> list = new ArrayList<>();
    list.add(vm.getJNIEnv());
    list.add(0);
    list.add(vm.addLocalObject(vm.resolveClass("java/util/Map").newObject(map1)));
    list.add(vm.addLocalObject(vm.resolveClass("java/util/Map").newObject(map2)));

    Number number = module.callFunction(emulator, 0x63518, list.toArray());
    String result = vm.getObject(number.intValue()).getValue().toString();
    System.out.println("[+]call_calcSignature 结果-->>" + result);
}
```

* 键值对的顺序也要和hook的一致，避免出现问题；这里会有几个简单的环境需要补，我不提了，都是基础，直接给出，不懂的话建议多多google；

```
@Override
public DvmObject<?> callObjectMethodV(BaseVM vm, DvmObject<?> dvmObject, String signature, VaList vaList) {
    switch (signature) {
        case "java/util/Iterator->next()Ljava/lang/Object;": {
            Iterator iterator = (Iterator) dvmObject.getValue();
            return ProxyDvmObject.createObject(vm, iterator.next());
        }
        case "java/util/Map$Entry->getKey()Ljava/lang/Object;": {
            Map.Entry entry = (Map.Entry) dvmObject.getValue();
            Object getKey_obj = entry.getKey();
            return ProxyDvmObject.createObject(vm, getKey_obj);
        }
        case "java/util/Map$Entry->getValue()Ljava/lang/Object;": {
            Map.Entry entry = (Map.Entry) dvmObject.getValue();
            Object getKey_obj = entry.getValue();
            return ProxyDvmObject.createObject(vm, getKey_obj);
        }
    }
    return super.callObjectMethodV(vm, dvmObject, signature, vaList);
}
```

* 执行结果出来了；

![image-20251118110329800](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118110329800.png)

* 但是，结果不一致，多次运行依旧是这个值，说明没有随机数在影响结果；难道是值的顺序不对？我检查后并不是，顺序很合理，这里有个验证方式，使用frida来主动调用，看看结果如何；

```
function call_java() {
    Java.perform(function () {
        try {
            let BaseApi = Java.use("com.iget.baselib.BaseApi");
            let HashMap = Java.use("java.util.HashMap");
            let map1 = HashMap.$new();
            let map1Data = {
                "path": "/search/v3/tophits",
                // 省略部分
                "timestamp": "1763430939"
            };
            let map2 = HashMap.$new();
            let map2Data = {
                "Xi-D": "ce286af9961ca0fc",
                // 省略部分
                "Xi-Seid": "ce286af9961ca0fc",
                "Xi-Parent-Id": "27be68114729b908"
            };
             // 填充Map1
            for (let key in map1Data) {
                if (map1Data.hasOwnProperty(key)) {
                    let bytesValue = stringToBytes(map1Data[key]);
                    map1.put(key, bytesValue);
                }
            }
            // 填充Map2
            for (let key in map2Data) {
                if (map2Data.hasOwnProperty(key)) {
                    let bytesValue = stringToBytes(map2Data[key]);
                    map2.put(key, bytesValue);
                }
            }
            let baseApiInstance = BaseApi.$new();
            let result = baseApiInstance.calcSignature(map1, map2);
            console.log("主动调用结果: " + result);
            return result;

        } catch (error) {
            console.log("主动调用出错: " + error);
            console.log(error.stack);
        }
    });
}
```

* 数据的顺序记得一致，接下来主动调用；

![image-20251118112100275](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118112100275.png)

* 和目标结果是可以匹配的，那应该是有初始化的过程了，打开jadx去看看；

![image-20251118112335492](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118112335492.png)

* initImp这个native函数被执行了，它应该就是初始化函数了，看看参数返回值；

```
public static native void initImp(Context context, String str);
```

* 需要hook一下，有个字符串需要确定；

```
function hook_dlopen() {
    var android_dlopen_ext = Module.findExportByName(null, "android_dlopen_ext");
    Interceptor.attach(android_dlopen_ext, {
            onEnter: function (args) {
                var path_ptr = args[0];
                var path = ptr(path_ptr).readCString();
                if (path && path.indexOf("libbase-lib.so") !== -1) {
                    console.log("[android_dlopen_ext:]", path);
                    this.flag = true;
                }
            },
            onLeave: function (retval) {
                if (this.flag) {
                    const module = Process.findModuleByName("libbase-lib.so");
                    let jni_onload = module.findExportByName("JNI_OnLoad")
                    console.log("JNI_OnLoad--->>>" + jni_onload);
                    Interceptor.attach(jni_onload, {
                        onEnter: function (args) {
                            console.log("JNI_OnLoad onEnter")
                        },
                        onLeave: function (retval) {
                            console.log("JNI_OnLoad onLeave")
                            hook_init()
                        }
                    })
                }
            }
        }
    )
}

setImmediate(hook_dlopen)
```

* 这里需要注意时机，老生常谈了，前几篇文章已经多次提到了；

```
BaseApi.initImp is called: context=com.luojilab.base.application.LuojiLabApplication@c433e59, str=463ceba202a9f6f9ac4cd98d0f2f2876204ea85c
```

* 在目标函数执行前执行这个init函数，地址是0x62690；

```
public void call_init(){
    // 0x62688
    List<Object> list = new ArrayList<>(10);
    list.add(vm.getJNIEnv());
    list.add(0);
    list.add(vm.addLocalObject(vm.resolveClass("android/content/Context").newObject(null)));
    list.add(vm.addLocalObject(new StringObject(vm, "463ceba202a9f6f9ac4cd98d0f2f2876204ea85c")));
    module.callFunction(emulator, 0x62690, list.toArray());
}
```

* 此时结果对得上了；

![image-20251118140510586](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118140510586.png)

* 后续就可以开始分析了，还记得之前我在某篇文章说过，在开始分析之前把memcpy给hook上是一个良好的习惯，在这个样本就会有所体现，代码如下：

```
public void hook_memcpy(){

    emulator.attach().addBreakPoint(module.findSymbolByName("memcpy").getAddress(), new BreakPointCallback() {
        @Override
        public boolean onHit(Emulator<?> emulator, long address) {
            RegisterContext context = emulator.getContext();
            int len = context.getIntArg(2);
            UnidbgPointer pointer1 = context.getPointerArg(0);
            UnidbgPointer pointer2 = context.getPointerArg(1);
            Inspector.inspect(pointer2.getByteArray(0, len), "src " + Long.toHexString(pointer1.peer) + " memcpy " + Long.toHexString(pointer2.peer));
            return true;
        }
    });
}
```

* 首先，hook一下目标函数，看看参数、返回值之类的；

```
emulator.attach().addBreakPoint(module.base + 0x63518);
```

* 参数1、2是jnienv和jobject，后续就是我们传进来的两个map，但是问题来了；

![image-20251118163605012](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118163605012.png)

* x2、x3根本不是地址，这就怪了，按c继续执行发现只执行了这一次，这种情况确实不多见；最多是遇到那种需要偏移几个字节去读的情况；
* 那我们转而去hook它的下一步函数，sub\_63874(v11, env, a3)，看起来v11应该是map1进行了一些转换；

![image-20251118175507537](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118175507537.png)

![image-20251118164649275](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118164649275.png)

* 这里也没有什么线索，那就不管了，换种方式来追溯结果；
* 首先把之前说的memcpy hook打开；

```
public void hook_memcpy(){

    emulator.attach().addBreakPoint(module.findSymbolByName("memcpy").getAddress(), new BreakPointCallback() {
        @Override
        public boolean onHit(Emulator<?> emulator, long address) {
            RegisterContext context = emulator.getContext();
            int len = context.getIntArg(2);
            UnidbgPointer pointer1 = context.getPointerArg(0);
            UnidbgPointer pointer2 = context.getPointerArg(1);
            Inspector.inspect(pointer2.getByteArray(0, len), "src " + Long.toHexString(pointer1.peer) + " memcpy " + Long.toHexString(pointer2.peer));
            return true;
        }
    });
}
```

* 日志非常多；

![image-20251118165135740](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118165135740.png)

* 在看日志之前，借用龙哥的一句话：在逆向分析中，通常可以将分析步骤简化为三个部分：固定数据流、追溯数据来源和分析生成算法或逻辑；我们现在要做的就是追溯数据来源，在日常的分析中，我们往往是通过伪代码来逐步分析，遇到问题后就没有办法了，虽然这个样本没有什么复杂的点，但拿来引入另外的分析方式也是一个非常好的契机；
* 有这些日志那应该怎么分析呢？先看结果，既然是追溯数据来源，那肯定得看有没有想过的日志；

![image-20251118165554977](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118165554977.png)

* 有的，这个日志来源于我们的hook memcpy；来源是bffff624，去tracewrite看看；

```
emulator.traceWrite(0xbffff624L, 0xbffff624L + 0x20);
```

* 这个api后续分析会大量用到，用处就是内存读写监控，非常好用；这里给地址和往后多少就行，地址过大就需要加上L；

![image-20251118165825130](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118165825130.png)

* 仔细对比我们的结果，从右往前读，小端序的，四个字节一组，别读多了；它的来源是libc，这个偏移点进去是memcpy函数，那我们去它返回地址看看；就是最后的LR地址0x6e4f4；

![image-20251118170100005](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118170100005.png)

* 位置是：

![image-20251118170120363](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118170120363.png)

* 这个hmac是我提前分析的时候改的，这里有很直接的证据；但这需要你了解hmac算法；

![image-20251118170221380](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118170221380.png)

* 这是非常明显的特征，在内存里会是大片的36 36 36 36 和5C 5C 5C 5C，如果再遇到了就可以往hmac上靠，这里如果是hmac的话那就是sha1吧，因为结果是40位的；有没有办法能佐证？
* 这里说两个常用的方式：
* 方式1：使用Findcrypt插件，这个插件有时候还是挺有用的；

![image-20251118171051853](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118171051853.png)

* 有不少相关的，点一个进去找交叉引用；

![image-20251118171157350](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118171157350.png)

* 再去找它的交叉引用；

![image-20251118171223731](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118171223731.png)

* 就在hmac里，那它是hmac-sha1无疑，这个算法需要找明文和key，以及算法是否魔改；
* 方式2：我这里提前trace了一份日志，由于这篇文章没怎么用到，这里就不展开说了；
* 一般分辨这种加密算法的时候，都是在看特征，前面看0x36就是在看特征；众所周知sha1的特征就是那几个常量，去搜一下看看是否有出现在日志中；

![image-20251118172013593](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118172013593.png)

* 一般是5个都去搜一下，还有k表，也可以搜一下；

![image-20251118172111065](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118172111065.png)

* 也一样，这样可以暂且认为它是一个标准的sha1，但不排除魔改运算细节，只是大多数开发也并不熟悉这种算法细节，且也不敢随便改算法；这两种方式比较常见；
* 回到正题，它是什么算法算是确定了，去hook这个函数；

```
emulator.attach().addBreakPoint(module.base + 0x6E274);
```

* 参数不少，看几个关键的；

![image-20251118172352906](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118172352906.png)

* x0不知道是什么，但是x1是它对应的长度；

![image-20251118172415645](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118172415645.png)

* 到这里我们才算是第一次看到入参，x3也是对应的长度，我们打印全一点；

![image-20251118172525200](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118172525200.png)

* 实际上就是入参，但是拼接方式需要看看；稍微看了一下，应该是按照顺序来的，除了secret，它拼接在最后；

![image-20251118173055586](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118173055586.png)

* 第二行是空字符串，也就是入参的query\_string，加密的时候不要忘了还有换行；
* key应该就是第一个参数，接下来尝试去加密一下；

![image-20251118173240677](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118173240677.png)

* 结果很合理，这里的key非常长，但不影响，hmac的key就是不限制长度的，具体可以去自行了解；
* 到这里算法基本就没什么了，本身就很简单，但是key也还是未知的，接下来看看来源是怎样的；

![image-20251118173409974](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118173409974.png)

* 看样子大概是sub\_6F90C，hook一下看看；

![image-20251118174152509](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118174152509.png)

* 这里也很奇怪，实际上这是由于std::string 结构导致的，0x31应该是标志位，0x28就是实际的大小，后续就是对应的地址；所以这里应该读m0x402d3030；

![image-20251118174404509](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118174404509.png)

* 这个有点眼熟，它是init函数那个入参，也就是说这个key与它有关，如果没设置可能就是会用另一个key，也会导致结果不同；
* 那它的生成规则呢？

![image-20251118174607742](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118174607742.png)

* 非常简单，大致就是从byte\_49B12这个位置取值，byte\_49B12是固定的，它是一张表，复现一下；

```
table = [0x51, 0x10, 0x6B, 0xD6, 0x31, 0x37, 0xA6, 0x39, 0xBF, 0x40, 0xA3, 0x9E, 0x81, 0xF3, 0xD7, 0xFB, 0x7D, 0xE4, 0x40, 0x83, 0x9C, 0x30, 0x0F, 0x88, 0x34, 0x8E, 0x43, 0x44, 0xC4, 0xDE, 0xE9, 0xCB, 0x55, 0x7C, 0x96, 0x33, 0xA7, 0xC3, 0x24, 0x3E, 0xEE, 0x4C, 0x95, 0x0B, 0x42, 0xFA, 0xC3, 0x4E, 0x09, 0x2F, 0xA2, 0x67, 0x29, 0xDA, 0x25, 0xB3, 0x76, 0x5B, 0xA2, 0x49, 0x6D, 0x8B, 0xD1, 0x25, 0x73, 0xF9, 0xF7, 0x65, 0x87, 0x69, 0x99, 0x17, 0xD4, 0xA4, 0x5C, 0xCC, 0x5D, 0x65, 0xB6, 0x92, 0x6D, 0x71, 0x49, 0x51, 0xFE, 0xEE, 0xBA, 0xDB, 0x5E, 0x15, 0x46, 0x57, 0xA7, 0x8D, 0x9D, 0x84, 0x91, 0xD9, 0xAC, 0x01, 0x8D, 0xBE, 0xD4, 0x0B, 0xF7, 0xE4, 0x58, 0x05, 0xB8, 0xB3, 0x45, 0x06, 0xD1, 0x2D, 0x1F, 0x90, 0xCB, 0x40, 0x10, 0x03, 0xC1, 0xAF, 0xBD, 0x03, 0x01, 0x13, 0x8A, 0x6B, 0x3B, 0x92, 0x12, 0x42, 0x50, 0x68, 0xDD, 0xEB, 0x97, 0xF2, 0xCF, 0xCE, 0xF0, 0xB4, 0xE6, 0x73, 0x97, 0xAD, 0x75, 0x23, 0xE8, 0xAE, 0x36, 0x86, 0xE2, 0xF9, 0x37, 0xE8, 0x1C, 0x75, 0xDF, 0x6E, 0x48, 0xF2, 0x1B, 0x72, 0x1E, 0x2A, 0xC6, 0x8A, 0x6F, 0xB7, 0x62, 0x0E, 0xAA, 0x18, 0xBE, 0x1B, 0xFD, 0x57, 0x3F, 0x4C, 0xC7, 0xD3, 0x7A, 0x21, 0x9A, 0xDB, 0xC0, 0xFE, 0x78, 0xCD, 0x5A, 0xF4, 0x20, 0xDE, 0xA9, 0x34, 0x89, 0x08, 0xC8, 0x32, 0xB1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xEC, 0x5F, 0x61, 0x52, 0x8A, 0xAA, 0x1A, 0xB6, 0x4B, 0x0E, 0x2D, 0xE5, 0x7A, 0x9F, 0x93, 0xC9, 0x9C, 0xEF, 0xA1, 0xE1, 0x3C, 0x4E, 0xAF, 0x2B, 0xF6, 0xB1, 0xC8, 0xEB, 0xBB, 0x3C, 0x83, 0x53, 0x99, 0x61, 0x18, 0x2C, 0x05, 0x7F, 0xBB, 0x78, 0xD7, 0x27, 0xE1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0C, 0x7D]

def transform_bytes(data_bytes):
    """处理字节输入"""
    result = []

    for byte in data_bytes:
        index = (~byte) & 0xFF
        new_byte = table[index]
        result.append(new_byte)

    return bytes(result).hex()

print(transform_bytes("463ceba202a9f6f9ac4cd98d0f2f2876204ea85c".encode()))
```

* 结果是一样的，key的来源整明白了，与463ceba202a9f6f9ac4cd98d0f2f2876204ea85c有关；这个数据实际上是固定值，jadx追一下；

![image-20251118174749785](https://www.xiayutian.xyz/usr/assets/android/%E5%BE%97%E5%88%B0%E7%AE%97%E6%B3%95%E5%88%86%E6%9E%90_img/image-20251118174749785.png)

* 到这里就基本上说完了，没混淆算法也简单，但依旧不失为一个好样本；

#### 4. 总结

* 虽然总体目前的样本都很简单，但是我写文章的目的是分享思路和一些浅显的经验，希望能帮到各位读者；
* 另外，关于上面的参数问题希望有大佬可以赐教，我确实第一次遇到；
* by：2025-11-18
