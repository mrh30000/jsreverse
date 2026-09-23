# WebAssembly逆向工程简介

> **作者**: scz | **发布时间**: 2024-06-14 12:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6829 / 14
> **原文**: [https://www.52pojie.cn/thread-1934571-1-1.html](https://www.52pojie.cn/thread-1934571-1-1.html)

---

```
创建: 2024-05-21 10:56
更新: 2024-06-14 12:05

目录:

☆ 背景介绍
☆ 导出表Export[]
☆ wasm向js侧动态导出函数
☆ 定位由js发起的wasm函数调用
    1) Table[]/Elem[]
    2) elem[1]
    3) elem[2]
    4) 在胶水js中设断
☆ 结语
```

☆ 背景介绍

WEB前端逆向时越来越多遭遇"js+wasm"场景，部分算法从js移入wasm中实现，一方面提高执行效率，另一方面增加逆向工程难度。目前没有特别成熟好用的wasm逆向工具，少数几款各有利弊，参看

《WebAssembly入门简介》

```
https://scz.617.cn/web/202405140839.txt
```

本文介绍若干wasm逆向经验。

☆ 导出表Export[]

wasm初登场时，标准中定义了导出表，希望js侧以如下方式调用wasm函数:

```
instance.exports.wasm_func()
```

有若干工具查看wasm导出表，常用

```
wasm-objdump -j Export -x some.wasm | less
```

导出表中函数名是符号化的，一般具有字面意义。但导出时，可定制导出名，可以使之无字面意义。正常开发wasm不会出现后一种情况，有意识对抗逆向工程时则不一样。

☆ wasm向js侧动态导出函数

许多wasm用Go开发，此时导出表有特征:

```
Export[13]:
 - memory[0] -> "memory"
 - func[82] <malloc> -> "malloc"
 - func[83] <free> -> "free"
 - func[84] <calloc> -> "calloc"
 - func[85] <realloc> -> "realloc"
 - func[86] <_start> -> "_start"
 - func[87] <resume> -> "resume"
 - func[88] <go_scheduler> -> "go_scheduler"
 - func[89] <asyncify_start_unwind> -> "asyncify_start_unwind"
 - func[90] <asyncify_stop_rewind> -> "asyncify_stop_unwind"
 - func[91] <asyncify_start_rewind> -> "asyncify_start_rewind"
 - func[90] <asyncify_stop_rewind> -> "asyncify_stop_rewind"
 - func[92] <asyncify_get_state> -> "asyncify_get_state"
```

据此判断，这是Go开发的wasm。上述Export[]中只有若干标准函数，并无自定义函数，此情形大概率是wasm用js.Global().Set()向js动态导出函数，看导出表无助于逆向工程。

动态导出时，wasm必与js交互，存在go\_bridge.js、wasm\_exec.js之类的胶水js，在其中找"syscall/js.valueSet"之类的函数，对之设置条件断点，查看调用栈回溯，确认wasm动态导出了哪些函数。

☆ 定位由js发起的wasm函数调用

动态导出函数时，函数名相当随意，一般挂在window空间下，js侧全局可见。有些反逆向工程wasm会每隔一段时间动态导出经哈希算法处理过的动态函数名，另有一个相对固定的动态导出函数GetOtherExportFunc()，用后者取前者当前动态函数名，再调用前者。这种套路可任意定制，绕来绕去绕晕你。不过，毕竟wasm已在浏览器侧，属于尸体了，在鞭尸式逆向工程中，前述套路增加的逆向成本有限。

假设在F12中单步跟踪js发起的wasm函数调用，首先会进入go\_bridge.js之类的胶水js，一般有如下代码:

```
_resume() {
    if (this.exited) {
        throw new Error("Go program has already exited");
    }
    this._inst.exports.resume();
    if (this.exited) {
        this._resolveExitPromise();
    }
}

_makeFuncWrapper(id) {
    const go = this;
    return function () {
        const event = { id: id, this: this, args: arguments };
        go._pendingEvent = event;
        go._resume();
        return event.result;
    };
}
```

一般先进\_makeFuncWrapper，再进resume，再进wasm导出函数resume，到这儿就开始浆糊了。

1) Table[]/Elem[]

```
wasm-objdump -j Table -x some.wasm
wasm-objdump -j Elem -x some.wasm

Table[1]:
 - table[0] type=funcref initial=7 max=7
Elem[1]:
 - segment[0] flags=0 table=0 count=6 - init i32=1
  - elem[1] = ref.func:78   // main()
  - elem[2] = ref.func:80   // final_resume()
  - elem[3] = ref.func:106  // 动态导出
  - elem[4] = ref.func:108  // 动态导出
  - elem[5] = ref.func:70
  - elem[6] = ref.func:71
```

直接说经验吧，查看Table[]/Elem[]，elem[1]、elem[2]、elem[-2]、elem[-1]一般不用管，就管elem[2]与elem[-2]之间夹的函数，这些函数大概率是动态导出函数。动态导出函数不会太多，一只手数得过来，全部在入口设上断点，F8，命中哪个算哪个，再通过调用栈回溯确认js侧代码所在，反向验证。

2) elem[1]

Go开发wasm时，elem[1]很可能对应main()之类的函数，完成一些初始化工作，比如从wasm侧向js侧动态导出函数很可能在此函数中完成，值得分析。

3) elem[2]

Go开发wasm时，elem[2]很可能对应final\_resume()之类的函数，exports.resume()最终会调到final\_resume()，再由后者调用那些wasm动态导出函数。下面是个示例:

```
/*
 * 在IDA中查看"_pendingEvent"的交叉引用定位final_resume
 */
0000A9EE                         final_resume
...
0000AFA6 20 00                       get_local           $local0
0000AFA8 20 0D                       get_local           $local13
0000AFAA 20 13                       get_local           $local19
0000AFAC 20 07                       get_local           $local7
0000AFAE 20 08                       get_local           $local8
0000AFB0 20 08                       get_local           $local8
0000AFB2 20 12                       get_local           $local18
/*
 * var14是Table[]索引
 */
0000AFB4 20 0E                       get_local           $local14
/*
 * 从js调用wasm函数时一般过此处
 *
 * IDA中选中final_resume，Alt-T，选中Match case、Identifier，搜
 * call_indirect，定位此处。找到后，所有js调wasm的流程，均可在此设断，单步
 * 后即目标函数，也可从var14或stack[7]获取Table[]索引后定位目标函数
 */
0000AFB6 11 0C 00                    call_indirect
```

4) 在胶水js中设断

wasm动态导出函数不可避免地要与js侧交互，这些都通过胶水js中"gojs:"中的导出函数完成。比如AES解密在wasm中完成，但数据得通过"syscall/js.copyBytesToJS"送回js侧，对"syscall/js.copyBytesToJS"设断，调用栈回溯，定位wasm算法函数。"gojs:"中的函数，有些命中过于频繁，设条件断点即可。我们在鞭尸，只靠wasm玩不出花儿来。

☆ 结语

Chrome F12调试wasm，只有最基本的调试功能，远不能满足传统意义上的调试需求，连MS-DOS时代的debug命令都不如。

a. 调试wasm时，无法修改global、local、stack，只能修改线性内存memory
b. 调试wasm、js，均不支持数据断点，这真要了老命

怀疑有人魔改过Chrome，使之支持前述几点功能。

前述经验基于一个假设，就是你想分析清楚wasm中算法细节，而非黑盒式调用。若只是调用wasm算法函数，前述套路一个也用不着。那有没有必要非得分析wasm算法细节呢？这要看你的原始需求，不在本文讨论。
