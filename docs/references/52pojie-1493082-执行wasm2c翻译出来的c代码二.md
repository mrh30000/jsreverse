# 执行wasm2c翻译出来的c代码二

> **作者**: Frhvjhhv | **发布时间**: 2021-08-13 01:35:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7614 / 12
> **原文**: [https://www.52pojie.cn/thread-1493082-1-1.html](https://www.52pojie.cn/thread-1493082-1-1.html)

---

*本帖最后由 Frhvjhhv 于 2022-10-3 11:25 编辑*

承接上回，我们把wasm文件下载下来，然后执行wasm2c   www.wasm  -o   www.c  命令得到   www.c   和www.h文件

然后把wabt工具包里面的wasm-rt.h,wasm-rt-impl.c,wasm-rt-impl.h文件也拿出来

![](https://attach.52pojie.cn/forum/202108/12/144048j6fcate870ss8sxf.png)

打开visualstudio，新建c++控制台项目（或者dll均可，为了方便演示我就建立=控制台项目了），然后把 www.c   和www.h，wasm-rt.h,wasm-rt-impl.c,wasm-rt-impl.h拷贝进去

![](https://attach.52pojie.cn/forum/202108/12/145134ubkwggz1vg8bgomj.png)

组成工程文件，在主文件中导入www.h头文件，如下图所示：

然后编译一下：

![](https://attach.52pojie.cn/forum/202108/12/145323sbegtxiii35eur03.png)

发现抱错了。其中抱错的原因是我们加载wasm的过程中有导入函数，这些导入函数被反编译成了导入符号
www.h中的符号，分为导入 (import) 符号，和导出（export）符号。js 和 wasm 交互时，import 符号是 js 提供给 wasm 使用的。而 export 符号是 wasm 提供给 js 使用的。

![](https://attach.52pojie.cn/forum/202108/12/150729dgd6hhuu6166z6xx.png)

其中导入符号是未定义的。就是我们要自己参考js中的导入函数去在www.c文件中实现

[JavaScript] *纯文本查看*

```
function initSync(A) {
        var i = {
            wbg: {}
        };
        return i.wbg.__wbg_new_59cb74e423758ede = function() {
            return addHeapObject(new Error)
        }
        ,
        i.wbg.__wbg_stack_558ba5917b466edd = function(A, i) {
            var g = passStringToWasm0(getObject(i).stack, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
              , i = WASM_VECTOR_LEN;
            getInt32Memory0()[A / 4 + 1] = i,
            getInt32Memory0()[A / 4 + 0] = g
        }
        ,
        i.wbg.__wbg_error_4bb6c2a97407129a = function(A, i) {
            try {
                console.error(getStringFromWasm0(A, i))
            } finally {
                wasm.__wbindgen_free(A, i)
            }
        }
        ,
        i.wbg.__wbindgen_object_drop_ref = function(A) {
            takeObject(A)
        }
        ,
        i.wbg.__wbindgen_throw = function(A, i) {
            throw new Error(getStringFromWasm0(A, i))
        }
        ,
        i = loadSync(A, i).instance,
        wasm = i.export
```

参考上面的js代码，
\_\_wbg\_new\_59cb74e423758ede是维护一个栈结构，并将err元素入栈

\_wbg\_stack\_558ba5917b466edd 中的getObject(i).stack是取出栈里面的err元素

其中throw error的直接赋值为NULL即可

[C] *纯文本查看*

```
void _558ba5917b466eddZ_vii(u32 a, u32 b);

u32(*Z_wbgZ___wbg_new_59cb74e423758edeZ_iv)(void) = NULL;
void (*Z_wbgZ___wbg_stack_558ba5917b466eddZ_vii)(u32, u32) = *_558ba5917b466eddZ_vii;
void (*Z_wbgZ___wbg_error_4bb6c2a97407129aZ_vii)(u32, u32) = NULL;
void (*Z_wbgZ___wbindgen_object_drop_refZ_vi)(u32) = NULL;
void (*Z_wbgZ___wbindgen_throwZ_vii)(u32, u32) = NULL;
```

其中\_558ba5917b466eddZ\_vii函数的定义如下：

[C++] *纯文本查看*

```

typedef u32* wbindgen_malloc(u32 w2c_p0);
typedef u32* wbindgen_realloc(u32 w2c_p0, u32 w2c_p1, u32 w2c_p2);
int WASM_VECTOR_LEN;
int passStringToWasm0(char* A, wbindgen_malloc i, wbindgen_realloc g) {
    int B = strlen(A);
    u32  Q = i(B);
    int e = 0;
    for (e; e < B; e++) {
        int o = (int)e;
        if (127 < o)
            break;
        w2c_memory.data[Q + e] = o;
    }
    u32 Qq = g(Q, B, e);
    WASM_VECTOR_LEN = e;
    return Qq;
}
void _558ba5917b466eddZ_vii(u32 a, u32 b)
{
    int g = passStringToWasm0("error", w2c___wbindgen_malloc, w2c___wbindgen_realloc);
    int  i = WASM_VECTOR_LEN;
    (w2c_memory.data)[a + 1] = i;
    (w2c_memory).data[a + 0] = g;
}

u32(*Z_wbgZ___wbg_new_59cb74e423758edeZ_iv)(void) = NULL;
void (*Z_wbgZ___wbg_stack_558ba5917b466eddZ_vii)(u32, u32) = *_558ba5917b466eddZ_vii;
void (*Z_wbgZ___wbg_error_4bb6c2a97407129aZ_vii)(u32, u32) = NULL;
void (*Z_wbgZ___wbindgen_object_drop_refZ_vi)(u32) = NULL;
void (*Z_wbgZ___wbindgen_throwZ_vii)(u32, u32) = NULL;
```

其中w2c\_memory.data，w2c\_\_\_wbindgen\_malloc，u32等等均在www.c文件中已经定义。
对于build\_in符号不用管他，因为wasm2c是用gcc编译的所以我们也要用gcc来编译和调试(不要用vs，会报一大堆错)
此时已经把环境补好了，然后我们把主文件即包含main入口点的c文件引入www.h

![](https://attach.52pojie.cn/forum/202108/12/231953tw6xmmxx44440hmm.png)

编译一下：

[Asm] *纯文本查看*

```
gcc -o www ConsoleApplication5.c  wasm-rt-impl.c
```

![](https://attach.52pojie.cn/forum/202108/12/232507ofnmo0s8sgrwxffs.png)

编译通过，表明环境已经补完

接下来我们来分析一下如何调用：
我们转到www.c文件：

![](https://attach.52pojie.cn/forum/202108/12/233107zg985iar98hyhh6a.png)

可以看到两个静态全局变量static wasm\_rt\_memory\_t w2c\_memory;   static wasm\_rt\_table\_t w2c\_T0;  其中 w2c\_memory即相当于web里面WebAssembly.Memory,w2c\_T0相当于 js 中的 WebAssembly.Table.
转到wasm\_rt\_memory\_t这个结构体的定义可以看到：

[C++] *纯文本查看*

```
typedef struct {
  /** The linear memory data, with a byte length of `size`. */
  uint8_t* data;
  /** The current and maximum page count for this Memory object. If there is no
   * maximum, `max_pages` is 0xffffffffu (i.e. UINT32_MAX). */
  uint32_t pages, max_pages;
  /** The current size of the linear memory, in bytes. */
  uint32_t size;
} wasm_rt_memory_t;
```

其中data就相当于

WebAssembly.Memory.buffer的uint8array形式。wasm\_rt\_memory\_t还定义了其线性内存空间的大小和页数

然后我们在转到整个wasm的入口点：

[C++] *纯文本查看*

```
void WASM_RT_ADD_PREFIX(init)(void) {
  init_func_types();
  init_globals();
  init_memory();
  init_table();
  init_exports();
}
```

即调用上面这四个函数，即可实现wasm环境的初始化。这四个函数的定义均在www.c文件中。（本次直接调用即可。但是如果外部对wasm的初始化有导入函数，就要分析了，下面是对四个函数的分析）

![](https://attach.52pojie.cn/forum/202108/12/234940znzqbdkqekekd48d.png)

init\_func\_types的作用是注册函数原型。

[C++] *纯文本查看*

```
static void init_globals(void) {
  w2c_g0 = 1048576u;
}
```

init\_globals初始化全局变量

[C] *纯文本查看*

```
static void init_memory(void) {
  wasm_rt_allocate_memory((&w2c_memory), 17, 65536);
  LOAD_DATA(w2c_memory, 1048576u, data_segment_data_0, 8009);
  LOAD_DATA(w2c_memory, 1057704u, data_segment_data_1, 1);
}
```

init\_memory及其重要。allocate\_memory就是为wasm环境分配页数为17，最大大小为65536的内存空间

LOAD\_DATA就是加载一些字符串或者常量向wasm的内存中。

其中data\_segment\_data\_0的定义如下：

![](https://attach.52pojie.cn/forum/202108/13/000601jaq279677rq0ya60.png)

他就相当于wat 的 S 表达式形式的下面字符串常量

![](https://attach.52pojie.cn/forum/202108/13/000803ity1gykk9bdxg5yg.png)

我们来看一下 load\_data的定义：

[Asm] *纯文本查看*

```
static inline void load_data(void *dest, const void *src, size_t n) {
  memcpy(dest, src, n);
}
#define LOAD_DATA(m, o, i, s) load_data(&(m.data[o]), i, s)
#define DEFINE_LOAD(name, t1, t2, t3)
```

其四个参数分别是w2c\_memory，要写入w2c\_memory.data处的内存地址（注意，不是真实的内存地址，而是相对与w2c\_memory.data这个uint8\_t\*的地址，即相对地址，也可以理解为w2c\_memory.data=[1,2,3,4,4,,5,5,5],a[5]就是w2c\_memory.data相对地址5处的数据） ,要写入的数据，数据长度。最终调用memcpy来把数据拷贝到内存空间中。

![](https://attach.52pojie.cn/forum/202108/13/002601jnb8bo577h56o73d.png)

init\_table初始化函数指针数组。Table 可以看成函数指针的数组，数组的每一项存放着函数的签名和函数的地址。这个数组可以放任何不同类型的函数指针，有了函数签名这信息，在函数调用的时候就可动态检查参数是否对应。wasm 可以往 Table 中放函数，js 也可以往 Table 中放函数。放置好函数之后，就可以通过 Table 的索引去间接调用。于是 wasm 和 js，只需要知道 Table 的函数索引，没有必要使用函数指针。

然后我们可以看到导出函数init\_exports的定义：

[C] *纯文本查看*

```
static void init_exports(void) {
  /* export: 'memory' */
  WASM_RT_ADD_PREFIX(Z_memory) = (&w2c_memory);
  /* export: '__wbg_rsapublickeypair_free' */
  WASM_RT_ADD_PREFIX(Z___wbg_rsapublickeypair_freeZ_vi) = (&w2c___wbg_rsapublickeypair_free);
  /* export: 'rsapublickeypair_new' */
  WASM_RT_ADD_PREFIX(Z_rsapublickeypair_newZ_iv) = (&w2c_rsapublickeypair_new);
  /* export: 'rsapublickeypair_init' */
  WASM_RT_ADD_PREFIX(Z_rsapublickeypair_initZ_vi) = (&w2c_rsapublickeypair_init);
  /* export: 'rsapublickeypair_encode' */
  WASM_RT_ADD_PREFIX(Z_rsapublickeypair_encodeZ_viiii) = (&w2c_rsapublickeypair_encode);
  /* export: '__wbindgen_malloc' */
  WASM_RT_ADD_PREFIX(Z___wbindgen_mallocZ_ii) = (&w2c___wbindgen_malloc);
  /* export: '__wbindgen_realloc' */
  WASM_RT_ADD_PREFIX(Z___wbindgen_reallocZ_iiii) = (&w2c___wbindgen_realloc);
  /* export: '__wbindgen_free' */

  WASM_RT_ADD_PREFIX(Z___wbindgen_freeZ_vii) = (&w2c___wbindgen_free);
```

这里面实现了在www.h头文件中申明的导出函数。

分析之后。我们开始调用：

[C] *纯文本查看*

```
char gccc[1000];void Yyyyyyy() {
    init_func_types();
    init_globals();
    init_memory();
    init_table();
    init_exports();
}char* Gou(u32* text, int length)
{
    Yyyyyyy();}
```

首先在www.c文件中定义一个返回值为char\*的函数返回加密的字符串。函数参数为待加密字符串，字符串长度，然后调用Yyyyyyy函数初始化wasm环境

[C] *纯文本查看*

```
    u32 aa = w2c_rsapublickeypair_new();//1176460
    w2c_rsapublickeypair_init(aa);
    u32 nei = w2c___wbindgen_malloc(length);//1176428
    int le = 0;
    for (le; le < length; le++)
    {
        w2c_memory.data[nei + le] = text[le];
    }
    //LOAD_DATA(w2c_memory, nei, text, length);
    // memcpy(&w2c_memory, text, length);
    w2c_rsapublickeypair_encode(8, aa, nei, length);
```

然后加密流程与js一样：rsapublickeypair\_new初始化，rsapublickeypair\_init初始化公钥。然后直接用w2c\_memory.data[nei + le] = text[le];向wasm的内存空间中赋值。

[C] *纯文本查看*

```
 u32 bbb = i32_load(&w2c_memory, 8);
    u32 bb = i32_load(&w2c_memory, 12);
      #include <stdio.h>
    printf("%d\n", bbb);
    printf("%d\n", i32_load(&w2c_memory, 12));
    // char* src;

     //src= (char*)malloc((int)bb);
    for (int i = 0; i < (int)bb; i++)
    {
        //printf("%c", w2c_memory.data[bbb + i]);
        gccc[i] = w2c_memory.data[bbb + i];
       // src[i] = (char)(w2c_memory.data[bbb + i]);
    }
    w2c___wbindgen_free(bbb, bb);

    return gccc;
```

这里用i32\_load(&w2c\_memory, 12);直接取出内存处12的值。同样取出内存处为8的值，然后打印出这两个值然后取出内存处bbb，长度为bb的字符串即可。。在www.h头文件中导出函数 extern char\* Gou(char\*, int);然后在主程序mian函数中调用Gou函数：

[C] *纯文本查看*

```

int main()
{
    const int length = 12;
    char* str = "666666890ftt";
    u32 cc[12];
    for (int i = 0; i < length; i++)
    {
        cc[i] = (u32)(str[i]);
    }
    //Gou(cc, 6);
   // printf("%s\n", cc);
    char* ccc;
    //int ccc;
    ccc = Gou(cc, length);
    printf("%s", ccc);
    //free(ccc);
    getch();
}
```

我们输入字符串666666890ftt,返回加密结果

现在来编译一下：

[Asm] *纯文本查看*

```
gcc -o www ConsoleApplication5.c wasm-rt-impl.c  www.c
```

![](https://attach.52pojie.cn/forum/202108/13/012400swrgkk0gpenb1nji.png)

编译成功，然后运行一下，返回了字符串fb32ca7c2863964f2438fa50a50d8e3f

![](https://attach.52pojie.cn/forum/202108/13/012554kf0koa058omq07zw.png)

返回了加密结果
打开之前爬取的html，输入加密字符串，验证一下：

![](https://attach.52pojie.cn/forum/202108/13/012813e9aqiwxrn9ll93yr.png)

正确。至此就结束了。我们可以写出c++   dll供其他语言调用。
参考：执行wasm转换出来的c代码<https://zhuanlan.zhihu.com/p/43986042>
