# wasm转c调用与封装至dll案例

> **作者**: 漁滒 | **发布时间**: 2021-12-05 10:59:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 12097 / 29
> **原文**: [https://www.52pojie.cn/thread-1556027-1-1.html](https://www.52pojie.cn/thread-1556027-1-1.html)

---

@[TOC](https://www.52pojie.cn/wasm%E8%BD%ACc%E8%B0%83%E7%94%A8%E4%B8%8E%E5%B0%81%E8%A3%85%E8%87%B3dll%E6%A1%88%E4%BE%8B)

### 准备工作

相关文档：
[1.某德地图矢量瓦片逆向(快速wasm逆向)，执行wasm2c翻译出来的c代码一](https://www.52pojie.cn/thread-1492577-1-1.html)

[2.执行wasm2c翻译出来的c代码二](https://www.52pojie.cn/thread-1493082-1-1.html)

相关工具

1. wabt工具包
2. gcc编译器

在文章 [某网站字幕加密的wasm分析](https://www.52pojie.cn/thread-1461335-1-1.html) 中均提到过

因为本篇文章主要讲wasm转c的使用，所以js层的逻辑会跳过

### 初级 猿人学练习题

新学习的知识：

1. 导出函数的调用

猿人学练习 15 题 <https://match.yuanrenxue.com/match/15>

![](https://attach.52pojie.cn/forum/202410/11/173335sopceu888pz3e0tc.jpg)

首先下载这个wasm到本地，然后使用wasm2c工具转为.c和.h文件

```
wasm2c yuanrenxue.wasm -o yuanrenxue.c
```

这时目录下就多了两个文件yuanrenxue.c和yuanrenxue.h

使用CLion创建一个C的控制台项目，把yuanrenxue.c和yuanrenxue.h复制进去，并且把wbat工具包目录下的wasm-rt.h、wasm-rt-impl.c、wasm-rt-impl.h三个文件复制进去

![](https://attach.52pojie.cn/forum/202410/11/173337gwof8o3rt93oa59a.jpg)

然后自己新建一个main.c，根据上面的文章知道，需要新初始化wasm，所以创建一个初始化函数

```
void init_wasm(){
    init_func_types();
    init_globals();
    init_memory();
    init_table();
    init_exports();
}
```

然后通过调试js，可以发现其调用的是导出函数的encode函数，所以创建一个用于加密的函数

```
u32 encode(u32 t1, u32 t2){
    return w2c_encode(t1, t2);
}
```

最后创建一个main函数作为测试

```
int main() {
    init_wasm();
    u32 t1 = 819334766;
    u32 t2 = 819334746;
    int out = (int)encode(t1, t2);
    printf("%d\n", out);
    return 0;
}
```

写好测试文件如下
!
![](https://attach.52pojie.cn/forum/202410/11/173340folvpgtvrgl3pklx.jpg)

然后使用gcc编译为exe文件

```
gcc -o yuanrenxue main.c wasm-rt-impl.c
```

此时目录下可以得到yuanrenxue.exe，在命令行下运行，可以得到结果，与网页中计算的是一致的

![](https://attach.52pojie.cn/forum/202410/11/173341soce554auabucco7.jpg)

接下来制作动态链接库，声明C中的导出函数

```
extern void init_wasm(void);
extern u32 encode(u32, u32);
```

然后使用gcc编译为dll

```
gcc -shared -o yuanrenxue.dll main.c wasm-rt-impl.c
```

此时可以得到一个yuanrenxue.dll，可以使用python的ctypes库进行加载与调用

```
import ctypes

def main():
    dll = ctypes.windll.LoadLibrary('yuanrenxue.dll')
    print(dll)
    dll.init_wasm()
    t = dll.encode(819334766, 819334746)
    print(t)

if __name__ == '__main__':
    main()
```

尝试调用dll得到结果

![](https://attach.52pojie.cn/forum/202410/11/173344fjlixdlljhejlelk.jpg)

但是没有成功，报错了。这是因为用来编译的gcc是32位的，编译出来的dll只能在32位下使用。64位的电脑必须使用64位的gcc进行编译，那么使用64位的gcc重新编译dll

```
"D:/MinGW64/bin/gcc" -shared -o yuanrenxue.dll main.c wasm-rt-impl.c
```

![](https://attach.52pojie.cn/forum/202410/11/173346qz9jb9a3xijzaqx1.jpg)

非常好，成功得到一致的结果

### 中级 崔大网习题

新学习的知识：

1. 处理导入函数
2. 处理字符串参数和返回值

练习 15 题 <https://spa15.scrape.center/>

下载文件，然后转c，复制到新项目一顿操作和上面初级的一样

```
#include <stdio.h>
#include <stdlib.h>
#include "spa15.c"

int main() {
    return 0;
}
```

创建空的main.c，仅仅导入了spa15.c文件，直接编译

![](https://attach.52pojie.cn/forum/202410/11/173348rrnj1okkf1qnjrkr.jpg)

这里提示文件里面有一个导入函数还没有定义，所以要去到spa15.c来补充函数的定义。根据前面的相关文章知道，如果这个导入函数没有用到，那么可以使它等于NULL，那么在spa15.c的最后面加上

```
void (*Z_wasi_snapshot_preview1Z_proc_exitZ_vi)(u32) = NULL;
```

这时发现编译通过了，这时可以补充初始化函数和加密函数了

通过调试js，发现调用的是导出函数encrypt，参数是两个字符串，返回值也是一个字符串，这个和初级的题目就不一样了

根据调试js知道，字符串参数需要先申请wasm的内存空间，然后把字符串放置到指定的偏移，然后当使用完毕后，需要手动释放内存。测试函数如下

```
#include <stdio.h>
#include <stdlib.h>
#include "spa15.c"

extern void init_wasm(void);
extern char* encode(char*, char*);

void init_wasm(){
    init_func_types();
    init_globals();
    init_memory();
    init_table();
    init_exports();
}

char* encode(char* a1, char* a2){
    u32 str_len1 = strlen(a1) + 1;
    u32 ptr1 = w2c_stackAlloc(str_len1);
    memcpy(w2c_memory.data + ptr1, a1, str_len1);

    u32 str_len2 = strlen(a2) + 1;
    u32 ptr2 = w2c_stackAlloc(str_len2);
    memcpy(w2c_memory.data + ptr2, a2, str_len2);

    u32 out_ptr = w2c_encrypt(ptr1, ptr2);
    char* out_str = (char *)malloc(128);
    memcpy(out_str, w2c_memory.data + out_ptr, 128);

    w2c_stackRestore(ptr1);
    w2c_stackRestore(ptr2);
    return out_str;
}

int main() {
    init_wasm();
    char* a1 = "/api/movie";
    printf("%s\n", a1);
    char* a2 = "1638462743";
    printf("%s\n", a2);
    char* c = encode(a1, a2);
    printf("%s\n", c);
    free(c);
    return 0;
}
```

尝试编译为exe测试

```
"D:/MinGW64/bin/gcc" -o spa15 main.c wasm-rt-impl.c
```

![](https://attach.52pojie.cn/forum/202410/11/173350s87duorbfdjluk8f.jpg)

非常好，出现的结果和网站上的一致。接下来编译为dll

```
"D:/MinGW64/bin/gcc" -shared -o spa15.dll main.c wasm-rt-impl.c
```

python中使用ctypes调用函数的时候，默认的参数和返回值都是int类型，但是这个函数是字符串，所以还需要在调用函数前修改参数列表的数据类型以及返回值的数据类型

```
import ctypes

def main():
    dll = ctypes.windll.LoadLibrary('spa15.dll')
    print(dll)
    dll.init_wasm()
    dll.encode.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
    dll.encode.restype = ctypes.c_char_p
    token = dll.encode(ctypes.c_char_p(b"/api/movie"), ctypes.c_char_p(b"1638462743"))
    print(token.decode())

if __name__ == '__main__':
    main()
```

![](https://attach.52pojie.cn/forum/202410/11/173352xp494l31vuvcjy4l.jpg)

调用成功，结果也是正确的

### 高级 某视频网站

新学习的知识：

1. 处理导入内存和导入表
2. 复现导入函数逻辑
3. 非导出函数调用

```
#include <stdio.h>
#include <stdlib.h>
#include "v1102.c"

int main() {
    return 0;
}
```

导入v1102.c后，直接编译，会出现下面报错

![](https://attach.52pojie.cn/forum/202410/11/173354o8igz6ww6wuwz86s.jpg)

可以看到，里面不单止有导入函数，还有导入了内存和表

导入函数和中级的一样，如果没有用到就直接给NULL
（有人可能会问怎么知道哪个函数用了，哪个没有用呢？答案是需要自己调试出来的）

处理导入内存和表相对麻烦一点，首先需要定义两个静态的全局变量

```
static wasm_rt_memory_t w2c_memory;
static wasm_rt_table_t w2c___indirect_function_table;
```

然后在init\_memory函数的一开始添加一行初始化内存的代码

![](https://attach.52pojie.cn/forum/202410/11/173356fjtifyi8fztxqyfy.jpg)

后面的1024数值可以在js代码中查看到，也可以在wasm中查看到。然后在init\_table函数的第二行添加一行初始化表的代码

![](https://attach.52pojie.cn/forum/202410/11/173358bvzkqwqop0e6nngv.jpg)

后面的4数值一样是从js或者wasm中查看，此时申明导入的内存和表

```
wasm_rt_memory_t (*Z_aZ_memory) = &w2c_memory;
wasm_rt_table_t (*Z_aZ_table) = &w2c___indirect_function_table;
```

aZ\_aZ\_ii函数是需要复现算法的，需要根据js的代码逻辑，改为C的代码，整体导入的代码如下

```
static wasm_rt_memory_t w2c_memory;
static wasm_rt_table_t w2c___indirect_function_table;

u32 aZ_aZ_ii(u32 a1){
    char out_str[24];
    memcpy(out_str, w2c_memory.data + a1, 24);
    if(out_str[0] == 'l'){
        return 1;
    }else{
        return ((int)strlen(out_str)) - 10;
    }
}

wasm_rt_memory_t (*Z_aZ_memory) = &w2c_memory;
wasm_rt_table_t (*Z_aZ_table) = &w2c___indirect_function_table;

u32 (*Z_aZ_aZ_ii)(u32) = *aZ_aZ_ii;
u32 (*Z_aZ_bZ_ii)(u32) = NULL;
u32 (*Z_aZ_cZ_iiii)(u32, u32, u32) = NULL;
void (*Z_aZ_dZ_vi)(u32) = NULL;
```

添加完成后，编译可以通过。接下来就一样了，编写初始化函数和需要的自定义函数。这里又遇到一个问题，需要的核心函数并不是导出函数。那么在直接调用wasm的情况下，是没有办法调用非导出函数的。但是在C里面，所有的函数都被定义为静态的全局函数，所有在C中可以随心所欲的调用所有函数。其他的东西和中级的一样，代码如下

```
#include <stdio.h>
#include <stdlib.h>
#include "v1102.c"

extern void init_wasm(void);
extern char* decode_key(char*, char*, int);

void init_wasm(){
    init_func_types();
    init_globals();
    init_memory();
    init_table();
    init_exports();
}

char* decode_key(char* token, char* key, int seed){
    int token_len = (int)strlen(token);
    u32 ptr_token = w2c_j( token_len + 1);
    memcpy(w2c_memory.data + ptr_token, token, token_len + 1);

    int key_len = (int)strlen(key);
    u32 ptr_key = w2c_j(key_len + 1);
    memcpy(w2c_memory.data + ptr_key, key, key_len + 1);

    u32 out_ptr = w2c_f48(ptr_key, key_len, seed, ptr_token, token_len);

    char* out_str = (char *)malloc(32);
    memcpy(out_str, w2c_memory.data + out_ptr, 32);

    w2c_h(ptr_token);
    w2c_h(ptr_key);
    return out_str;
}

int main() {
    init_wasm();
    u32 seed = 246;
    char* token = "0";
    char* key = "\xe5\x9d\x17\xd1\xc2\xf8\"\xdc\x11\x84{\xc9q\x03p\x96_\xa8n\x1f\xdd\x99\xacoP\xde\x84%{.\xd0\xb8";
    char* out_str =  decode_key(token, key, seed);
    printf("%s\n", out_str);
    return 0;
}
```

编译到exe测试

```
"D:/MinGW64/bin/gcc" -o v1102 main.c wasm-rt-impl.c
```

![](https://attach.52pojie.cn/forum/202410/11/173400hivzinuzrrqvrdc5.jpg)

调用非导出函数成功，得到结果，编译为dll测试

```
"D:/MinGW64/bin/gcc" -shared -o v1102.dll main.c wasm-rt-impl.c
```

![](https://attach.52pojie.cn/forum/202410/11/173402hap9ja8jea8ujybh.jpg)

调用成功，得到的结果可以使用，非常好。

![](https://attach.52pojie.cn/forum/202410/11/173404mo11e1kaessk1oaz.jpg)

但是这个得到的dll有点大，接近200kb。那么用gcc编译dll的时候可以使用优化器进行优化编译

```
"D:/MinGW64/bin/gcc" -shared -Os -o v1102.dll main.c wasm-rt-impl.c
```

![](https://attach.52pojie.cn/forum/202410/11/173406kp08q8dp9spkqk2p.jpg)

这时只剩下110kb了，体积少了差不多一半，一样可以得到正确的结果，完美结束。
