# WEB前端逆向TS PES NALU解密

> **作者**: scz | **发布时间**: 2024-08-24 18:16:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13359 / 75
> **原文**: [https://www.52pojie.cn/thread-1957747-1-1.html](https://www.52pojie.cn/thread-1957747-1-1.html)

---

创建: 2024-08-23 15:18
更新: 2024-08-24 17:43

```
目录:

    ☆ 背景介绍
    ☆ getHttpVideoInfo.do接口
    ☆ TS/PES/NALU
        1) 理论简介
        2) 相关工具
            2.1) MPEG TS Utils
            2.2) TSDuck
            2.3) 010 Editor
    ☆ 核心js
        1) vhs_drm2.min.js
        2) h5.worker.js
    ☆ NALU解密
        1) 思路
        2) Patch wasm
        3) 加载h5.worker_patch.js
        4) ts_decrypt.js
    ☆ 其它
```

☆ 背景介绍

逆向目标

```
aHR0cHM6Ly9zcG9ydHMuY2N0di5jbi8yMDIwLzA5LzI3L1ZJREVHd3ZzZm9DbzhRbnplVFE5ZTUwbDIwMDkyNy5zaHRtbA==
```

当时想下这个视频，用了个啥插件下回来947MB，播放时花屏；后来在渣浪找7GB高清看的。出于好奇心，探究一下前者。

☆ getHttpVideoInfo.do接口

F12，Network中看到

```
https://FQDN/api/getHttpVideoInfo.do?pid=c0...bb
```

用curl直接请求该URL，返回的json中有:

```
{
  ...
  "hls_url": "https://FQDN/asp/hls/main/0303000a/3/default/c0...bb/main.m3u8?...",
  "asp_error_code": "0",
  "manifest": {
    ...
    "hls_enc_url": "https://FQDN_1/asp/enc/hls/main/0303000a/3/default/c0...bb/main.m3u8?...",
    "hls_h5e_url": "https://FQDN_2/asp/h5e/hls/main/0303000a/3/default/c0...bb/main.m3u8?...",
    "hls_enc2_url": "https://FQDN_3/asp/enc2/hls/main/0303000a/3/default/c0...bb/main.m3u8?..."
  },
  ...
}
```

---

```
hls_url         明文地址
hls_enc_url     客户端在线播放加密地址
hls_h5e_url     网页播放加密地址
hls_enc2_url    客户端下载加密视频地址
```

hls\_url所得m3u8、ts直接是明文，但锁死在450分辨率，即使手工替换450成1200，实际获取的仍是450；换句话说，明文url无法获取高分辨率ts。其余几个url获取加密视频，需要解密播放，否则花屏。

☆ TS/PES/NALU

1) 理论简介

主要看这几篇

```
m3u8的ts文件的PES加解密分析以及示例 - billsmiless [2022-05-03]
https://www.52pojie.cn/thread-1630846-1-1.html (彻底被删了)

ts帧加密案例(一) - [2023-12-31]
https://www.52pojie.cn/thread-1875225-1-1.html

ts帧加密案例(二) - [2024-01-19]
https://www.52pojie.cn/thread-1882587-1-1.html
(提及wasm环境检测)
```

第一篇详解TS、PES解码。本文目标URL是NALU数据区加密，适合看第二篇。大致意思是，TS解码，根据PID找出视频流所在的TS Packet，有很多。从这些视频TS Packet中析取数据组装PES[]，每个PES[i]对应一帧画面，多帧连续播放时出现动态视效。

第一篇的目标对PES[i]数据区加解密。本文目标是另一种情形，不对PES[i]进行PES解码，而是进行NALU解码，形成NALArray\_i[]，这个数组里有两个NALArray\_i[j]需要解密，即每个PES[i]有两个NALArray\_i[j]需要解密。

第一篇的目标需对每个PES[i]分离PES Header、PES Body，本文不涉及此操作，要将PES[i]视作NALArray\_i[]，进行NALU解码。

2) 相关工具

2.1) MPEG TS Utils

```
MPEG TS Utils - The MPEG Transport Stream Revealed
https://www.jongbel.com/manual-analysis/mpeg-ts-utils/
https://www.jongbel.com/download/MPEGTSUtilsUserGuide.pdf
https://www.jongbel.com/download/MPEGTSUtilsULTIMATE_Trial.msi
```

这是GUI工具，可直观感受TS解码、PES解码，但没有NALU解码。用此工具很容易看出目标ts视频流对应PID 0x100。

MPEGTSUtils只能析取指定PID的整体PES，不能析取单个PES[i]，也无法析取NALU。

我已剁过该工具，参看

```
《MPEGTSUtils逆向工程》
https://scz.617.cn/misc/202408031931.txt
https://www.52pojie.cn/thread-1952043-1-1.html
```

2.2) TSDuck

```
TSDuck - The MPEG Transport Stream Toolkit
https://github.com/tsduck/tsduck
```

这是CLI工具，想用起来，需要看点文档，支持NALU解码，可析取NALArray\_i[j]

```
tsp -I file 0_450.ts -P pes -p 0x100 --multiple-files --save-pes 0_450_base.pes -O drop
```

0\_450.ts是450的加密ts:

```
https://FQDN/asp/h5e/hls/450/0303000a/3/default/c0...bb/0.ts
```

假设0\_450.ts是分辨率450的第0号ts，第N号ts处理方式相同。上述命令从ts中析取PID 0x100的所有PES[i]，生成一堆独立文件:

0\_450\_base-000000.pes
...
0\_450\_base-000249.pes

每个文件对应一个PES[i]，也即NALArray\_i[]。

2.3) 010 Editor

010 Editor有两个模板，TS.bt、H264.bt。TS.bt可看0\_450.ts，进行TS、PES解码。H264.bt可看0\_450\_base-000000.pes，进行NALU解码。

在H264.bt中可看到，每个PES[i]对应一批NALArray\_i[j]，j有多个，但本例中只有最后两个j的数据区涉及加解密，后面vhs\_drm2.min.js会再次提到这点。

☆ 核心js

1) vhs\_drm2.min.js

```
aHR0cHM6Ly9wbGF5ZXIuY250di5jbi9oNXZvZC92aHNfZHJtMi5taW4uanM=
```

---

```
o.on("data", (function(s) {
    var o = {
        trackId: t,
        pts: i,
        dts: n,
        data: s,
        nalUnitTypeCode: 31 & s[0]
    };
    /*
     * 调用XOR
     */
    switch (5 !== o.nalUnitTypeCode && 1 !== o.nalUnitTypeCode || u && "object" == typeof CNTVH5PlayerModule && (o.data = e.XOR(o.data, 1)),
    o.nalUnitTypeCode) {
    case 1:
        break;
    case 5:
        o.nalUnitType = "slice_layer_without_partitioning_rbsp_idr";
        break;
    ...
    case 25:
        /*
         * 调用XOR
         */
        u = 1 === s[1],
        "undefined" != typeof CNTVH5PlayerModule && (o.data = e.XOR(o.data, 1))
    }
    25 != o.nalUnitTypeCode && e.trigger("data", o)
}
)),
```

上述代码片段针对不同的NALU类型进行处理，只对1/5/25调用解密函数XOR()

```
/*
 * XOR函数会进blob再生效
 */
(e = this).XOR = function(e, t) {
    if ("object" != typeof CNTVH5PlayerModule)
        return e;
    var i = 0
      , n = 0
      , r = new Uint8Array
      , a = 0;
    try {
        /*
         * 该函数在h5.worker.js定义
         */
        i = CNTVH5PlayerModule._jsmalloc(e.byteLength + 1024);
        for (var s = 0; s < e.byteLength; s++)
            CNTVH5PlayerModule.HEAP8[i + s] = e[s];
        if (!rt) {
            a = nt.length;
            for (var o = 0; o < a; o++)
                CNTVH5PlayerModule.HEAP8[i + e.byteLength + o] = nt.charCodeAt(o);
            rt = !0
        }
        /*
         * i=out (这是个wasm内存偏移)
         * e=in
         *
         * 会进入h5.worker.js，会调用asm._vodplay，最终涉及wasm
         *
         * 设断观察，基本上过此数据有三种，即"--nal-unit-type 1/5/25"
         *
         * e.byteLength是NALArray_i[j]数据区的长度，即H264.bt显示的类型字
         * 段(1字节)加上数据区
         */
        console.log( e.byteLength );
        debugger;
        1 == t && (n = CNTVH5PlayerModule._vodplay(i, e.byteLength, a)),
        r = new Uint8Array(n);
        /*
         * e经CNTVH5PlayerModule._vodplay处理后赋给r，完成解密
         */
        for (var u = 0; u < r.byteLength; u++)
            r[u] = CNTVH5PlayerModule.HEAP8[i + u];
        CNTVH5PlayerModule._jsfree(i)
    } catch (t) {
        return e
    }
    /*
     * 二次释放？这什么垃圾代码
     */
    return CNTVH5PlayerModule._jsfree(i),
    i = null,
    r
}
```

虽然XOR()在vhs\_drm2.min.js中定义，但实际放到Worker中执行，所以Overrides时手工加了句debugger，方便调试。

2) h5.worker.js

```
aHR0cHM6Ly9wbGF5ZXIuY250di5jbi9oNXZvZC9oNS53b3JrZXIuanM=
```

这是简单混淆过的Emscripten生成的加载wasm的js，研究时可用Babel反混淆，整个框架就是Emscripten那种框架。

wasm经BASE64编码后内嵌在h5.worker.js中，一开始有个

```
wb = "data:application/octet-stream;base64,A..==";
```

此即wasm所在，静态分析wasm前，可自行析取这段内容，BASE64解码后保存。这个行为不是标准Emscripten框架行为，可能是反逆向工程目的。也可能Emscripten有参数支持这种行为，反正我没这样干过。

☆ NALU解密

1) 思路

就是billsmiless的法子，只不过不是对PES Body解密，而是对NALU解密。用js完成TS、PES、NALU解析，无需处理所有细节，只关心如何析取NALU，可借鉴H264.bt代码。

析取NALU之后，对NALU解密，只解密具有指定类型的NALU数据区，具体是1/5/25这三种。

解密调用wasm相关函数完成。这里有个坑，"ts帧加密案例"作者写了，缺省导出func54\_vodplay()，但这个函数有一些环境检测，估计是反逆向工程目的，使得只有部分PES[i]的NALArray\_i[j]被解密，另一部分则原样返回，效果就是有些画面正常，有些画面仍然花屏。未调试如何反环境检测，图省事，就用"ts帧加密案例"作者的法子，设法调用原本未被导出的func60\_TEA()。

他是wasm转c，我对ffmpeg完全不了解，他这个思路我理解，具体实施我干不了。我是这么干的，将wasm转wat，修改wat，导出func60，从wat生成wasm，再更新到h5.worker.js里面。

NALU解密完成后，"ts帧加密案例"作者说他直接用H264的数据，这个我也实施不了，对音频、视频那一堆知识一窍不通，我只能将解密数据打散后装回ts中。

2) Patch wasm

参看

```
WABT: The WebAssembly Binary Toolkit
https://github.com/WebAssembly/wabt

wat2wasm
https://webassembly.github.io/wabt/doc/wat2wasm.1.html

wasm2wat
https://webassembly.github.io/wabt/doc/wasm2wat.1.html

WebAssembly入门简介
https://scz.617.cn/web/202405140839.txt
```

从wasm生成wat

```
wasm2wat -o h5_worker_patch.wat h5.worker.wasm
```

修改wat，在其导出表增加一行

```
(export "func60_TEA" (func 60))
```

就这么简单，将func60从内部函数变成导出函数，再从wat生成新的wasm

```
wat2wasm -o h5_worker_patch.wasm h5_worker_patch.wat
```

检查确认导出表相应变化

```
wasm-objdump -j Export -x h5_worker_patch.wasm | less
```

用CyberChef/To Base64处理h5\_worker\_patch.wasm，修改h5.worker\_patch.js，替换那段BASE64编码。

3) 加载h5.worker\_patch.js

h5.worker\_patch.js是Emscripten框架代码，node加载这种js有套路，具体到本例

```
let CNTVModule          = require( './h5.worker_patch.js' );
let CNTVH5PlayerModule  = CNTVModule();

CNTVH5PlayerModule.onRuntimeInitialized = () => {

let buf = get_binary_from_file( ifile );
Parse_TS( buf );
save_binary ( buf, ofile );

};
```

在onRuntimeInitialized回调中已能访问wasm导出函数、memory等。

4) ts\_decrypt.js

这是最终PoC代码，用法是

```
node ts_decrypt.js <src> <dst>
node ts_decrypt.js 0_450.ts 0_450_dec.ts
```

0\_450.ts是加密ts，0\_450\_dec.ts是明文ts，后者可正常播放。

```
//
// 依赖当前目录下这些文件
//
// h5.worker_patch.js
//

'use strict';

//
//////////////////////////////////////////////////////////////////////////
//

let argv    = process.argv;
let ifile   = argv[2];
let ofile   = argv[3];
let fs      = require( 'fs' );

//
//////////////////////////////////////////////////////////////////////////
//

function get_binary_from_file ( file ) {
    try {
        let data    = fs.readFileSync( file );
        return Uint8Array.from( data );
    }
    catch ( error ) {
        console.error( error );
        throw error;
    }
}

function save_binary ( buf, file ) {
    try {
        fs.writeFileSync( file, buf );
        console.log( '\nsave_binary succeeded' );
    }
    catch ( error ) {
        console.error( error );
        throw error;
    }
}

//
//////////////////////////////////////////////////////////////////////////
//

let CNTVModule          = require( './h5.worker_patch.js' );
let CNTVH5PlayerModule  = CNTVModule();

function XOR ( e ) {
    let i   = 0,
        j   = 0,
        n   = 0,
        r   = new Uint8Array,
        a   = 0;
    try {
        i = CNTVH5PlayerModule._jsmalloc( e.byteLength + 1024 );
        j = CNTVH5PlayerModule._jsmalloc( e.byteLength + 1024 );
        for ( let s = 0; s < e.byteLength; s++ ) {
            CNTVH5PlayerModule.HEAP8[i+s]   = e[s];
        }
        n   = CNTVH5PlayerModule.asm.func60_TEA( e.byteLength, i, j, 0n );
        r   = new Uint8Array( n );
        for ( let u = 0; u < r.byteLength; u++ ) {
            r[u]    = CNTVH5PlayerModule.HEAP8[j+u];
        }
    }
    catch ( err ) {
        return e
    }
    CNTVH5PlayerModule._jsfree( i );
    i   = null;
    CNTVH5PlayerModule._jsfree( j );
    j   = null;
    return r;
}

//
//////////////////////////////////////////////////////////////////////////
//

function FindNalUnitStart ( buf, pos, total ) {
    while ( pos+2 < total ) {
        switch ( buf[pos+2] ) {
        case 0 :
            if ( pos+3 < total && buf[pos+1] === 0 && buf[pos+3] === 1 ) {
                return pos+1;
            }
            pos    += 2;
            break;
        case 1 :
            if ( buf[pos] === 0 && buf[pos+1] === 0 ) {
                return pos;
            }
        default:
            pos    += 3;
            break;
        }
    }
    return total;
}

function Parse_NALArray ( buf ) {
    let begin   = 0,
        end,
        size;
    let total   = buf.length;
    let nal_unit_type;
    while ( begin < total ) {
        begin  += 3;
        end     = FindNalUnitStart( buf, begin+1, total );
        size    = end - begin;
        nal_unit_type
                = buf[begin] & 0x1f;
        if ( nal_unit_type === 1 || nal_unit_type === 5 || nal_unit_type === 25 ) {
            let e   = new Uint8Array( buf.slice( begin, begin+size ) );
            let r   = XOR( e );
            for ( let i = 0; i < r.length; i++ ) {
                buf[begin+i]    = r[i];
            }
        }
        begin   = end;
    }
}

function Scatter_PES ( buf, ctx ) {
    let k   = 0;
    for ( let i = 0; i < ctx.offarray.length; i++ ) {
        for ( let j = ctx.offarray[i]; j < ctx.indexarray[i]+188; j++ ) {
            buf[j]  = ctx.PES[k++];
        }
    }
}

function Parse_TS_Packet ( buf, index, ctx ) {
    let PID     = ( ( buf[index+1] & 0x1f ) << 8 ) + buf[index+2];
    let PUSI    = ( buf[index+1] & 0x40 ) >>> 6;
    if ( PID !== 0x100 ) {
        return;
    }
    let AdaptationFieldControl
                = ( buf[index+3] & 0x30 ) >>> 4;
    if ( PUSI === 1 ) {
        if ( ctx.tscount > 0 ) {
            let begin   = ~~(ctx.indexarray[0] / 188);
            let end     = ~~(ctx.indexarray.at(-1) / 188);
            Parse_NALArray( ctx.PES );
            Scatter_PES( buf, ctx );
            ctx.tscount = 0;
        }
    }
    let AdaptationFieldLength;
    let payload_index;
    let payload;
    switch ( AdaptationFieldControl ) {
    case 1 :
        payload_index   = index + 4;
        payload         = buf.slice( payload_index, index+188 );
        break;
    case 2 :
        AdaptationFieldLength
                        = buf[index+4];
        process.exit( 0 );
        break;
    case 3 :
        AdaptationFieldLength
                        = buf[index+4];
        payload_index   = index + 4 + 1 + AdaptationFieldLength;
        payload         = buf.slice( payload_index, index+188 );
        break;
    default :
        process.exit( 0 );
        break;
    }
    if ( PUSI === 1 ) {
        ctx.indexarray  = [index];
        ctx.PES         = [...payload];
        ctx.offarray    = [payload_index];
        ctx.tscount++;
    }
    else {
        ctx.indexarray.push( index );
        ctx.PES.push( ...payload );
        ctx.offarray.push( payload_index );
        ctx.tscount++;
    }
}

function Parse_TS ( buf ) {
    let ctx     = {
        indexarray  : undefined,
        PES         : undefined,
        offarray    : undefined,
        tscount     : 0,
    }
    for ( let index = 0; index < buf.length; index += 188 ) {
        if ( buf[index] === 0x47 ) {
            Parse_TS_Packet( buf, index, ctx );
        }
        else {
            process.exit( 0 );
        }
    }
    if ( ctx.tscount > 0 ) {
        let begin   = ~~(ctx.indexarray[0] / 188);
        let end     = ~~(ctx.indexarray.at(-1) / 188);
        Parse_NALArray( ctx.PES );
        Scatter_PES( buf, ctx );
        ctx.tscount = 0;
    }
}

//
//////////////////////////////////////////////////////////////////////////
//

CNTVH5PlayerModule.onRuntimeInitialized = () => {

(async() => {

let buf = get_binary_from_file( ifile );

Parse_TS( buf );
save_binary ( buf, ofile );

})();

};
```

Parse\_TS、Parse\_TS\_Packet解析TS，Parse\_NALArray解析PES[i]，顺便调用XOR解密某些NALArray\_i[j]，Scatter\_PES将解密后的数据打散回TS。FindNalUnitStart源自H264.bt，我并不理解H264，只是看010 Editor模板解析效果不错，所有数据都有字段对应。

CNTVH5PlayerModule.asm.func60\_TEA即可调用Patch后导出的func60。

PoC假设PID 0x100对应视频流，根据实际情况修改，PoC未对之参数化。实测了1200分辨率的1号ts、450分辨率的0号ts，未做更多测试，展现原理足矣。

完整测试用例打包:

```
https://scz.617.cn/web/202408231518.txt
https://scz.617.cn/web/202408231518.7z
```

☆ 其它

到ts\_decrypt.js就算完事了。后面是一些有的没的，不看也罢。

看到过另一个TS/PES解析工具

```
Elecard Stream Analyzer
https://www.elecard.com/products/video-analysis/stream-analyzer
```

同要需要破解，未测、未剁。自实现Parse\_TS时已满足原始需求，不可能吃撑了剁一个已经不需要的软件。

油猴脚本对h5.worker.js未生效，可能与blob中importScripts相关，而我调试wasm时需要一些类似wasm\_hexdump的辅助函数，只好Overrides时在h5.worker.js最前面插入各种辅助函数。

vhs\_drm2.min.js情形类似，我在被弄进blob的代码中插入辅助函数，方便blob调试。

```
wasm-objdump -j Import -x h5.worker.wasm | less

Import[27]:
 - func[0] sig=3 <env.abort> <- env.abort
 - func[1] sig=7 <env.jsCall_ii> <- env.jsCall_ii
 - func[2] sig=8 <env.jsCall_iidiiii> <- env.jsCall_iidiiii
 - func[3] sig=9 <env.jsCall_iiii> <- env.jsCall_iiii
 - func[4] sig=3 <env.jsCall_v> <- env.jsCall_v
 - func[5] sig=1 <env.jsCall_vi> <- env.jsCall_vi
 - func[6] sig=10 <env.jsCall_vii> <- env.jsCall_vii
 - func[7] sig=3 <env.___setErrNo> <- env.___setErrNo
 - func[8] sig=7 <env.___syscall140> <- env.___syscall140
 - func[9] sig=7 <env.___syscall146> <- env.___syscall146
 - func[10] sig=7 <env.___syscall54> <- env.___syscall54
 - func[11] sig=7 <env.___syscall6> <- env.___syscall6
 - func[12] sig=3 <env.__emscripten_fetch_free> <- env.__emscripten_fetch_free
 - func[13] sig=7 <env._emscripten_asm_const_ii> <- env._emscripten_asm_const_ii    // 可能含有环境检测
 - func[14] sig=11 <env._emscripten_get_heap_size> <- env._emscripten_get_heap_size
 - func[15] sig=11 <env._emscripten_is_main_browser_thread> <- env._emscripten_is_main_browser_thread
 - func[16] sig=0 <env._emscripten_memcpy_big> <- env._emscripten_memcpy_big
 - func[17] sig=5 <env._emscripten_resize_heap> <- env._emscripten_resize_heap
 - func[18] sig=3 <env._emscripten_start_fetch> <- env._emscripten_start_fetch
 - func[19] sig=5 <env.abortOnCannotGrowMemory> <- env.abortOnCannotGrowMemory
 - func[20] sig=3 <env.setTempRet0> <- env.setTempRet0
 - func[21] sig=11 <env.getTempRet0> <- env.getTempRet0
 - func[22] sig=12 <env.jsCall_jiji> <- env.jsCall_jiji
 - global[0] i32 mutable=0 <- env.__table_base
 - global[1] i32 mutable=0 <- env.DYNAMICTOP_PTR
 - memory[0] pages: initial=256 <- env.memory
 - table[0] type=funcref initial=160 <- env.table
```

从上述输出看出，该wasm用Emscripten开发所得。

```
wasm2c -o h5_worker.c h5.worker.wasm
```

---

```
gcc -pipe -O0 -g3 -c \
-I/<path>/wabt-1.0.34/include \
-o h5_worker.o \
h5_worker.c
```

用IDA分析h5\_worker.o

```
/*
 * func $func57 (param $var0 i32) (param $var1 i32)
 *
 * IDA中用Findcrypt或Signsrch插件搜算法特征值，识别出func57与TEA相关。对之
 * 设断，查看调用栈回溯。
 */
0002975F             $func57_TEA
```

func54\_vodplay内部可能调用

```
func30
func40
func52
func58_TEA
func59
func60_TEA
func77
func114
```

在没有其他更好调试手段的情况下，不妨对这些函数全部设断，看每次解密会调哪些；我靠此法看出环境正常、异常两种情形下的不同命中。

func58\_TEA与func60\_TEA不等价，对PES[0]的5类型(长24411)，偏移24352处共8字节出现不同。每个PES[i]都有8字节不同，未深究。若用func58\_TEA，解密结果也能看，毕竟每帧图像只有靠近尾部的8字节差异，播放时底部有一丢丢花。

视频资源本身可忽略，纯粹是从WEB前端逆向以及wasm逆向工程实战角度实践了一下。
