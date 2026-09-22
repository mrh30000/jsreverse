# 腾讯视频 ckey（wasm）复现 workflow

> 本蓝图**不给出算法**，只给出「免还原地拿到参数」的已验证路线与坑位。通用路线见
> `skills/wsam-reverse/references/wasm-toolchain-and-decompilation.md`。

1. XHR 断点 → 追到生成 ckey 的 JS 包装层，确认它调的是 wasm 导出函数 `getckey`；记下实参顺序（platform, appVer, vid, empty_str, guid, tm）。
2. 在 Network 里过滤 `.wasm` 并下载到本地，然后 `wasm2c target.wasm -o target.c`，同时把 wabt 的 `wasm-rt.h` / `wasm-rt-impl.c` / `wasm-rt-impl.h` 拷到同目录。
3. `gcc -c target.c -o target.o` 只编译不链接，先让它过；报错的导入符号按「先 NULL、再按报错补」处理。
4. 只真实现两个导入：`getTotalMemory`（返回 16777216）与 `_get_unicode_str`（用全局 `char *url` + `set_url()` 曲线赋值，其余段写死 UA / platform）。
5. 写 `init_wasm()`（`init_func_types → init_globals → init_memory → init_table → init_exports`，顺序不要改）与 `get_ckey(...)` 包装函数。
6. 包装函数里：每个字符串参数都 `w2c__malloc(strlen+1)` + `memcpy`（含结尾 `\0`），调用后用 `w2c__free` 释放；返回值按 512 字节从 `w2c_memory.data + 返回值` 读出。
7. 先用 `gcc -o target main.c wasm-rt-impl.c` 出 exe 验证算法正确性（`printf` + `argv` 传参，Python 用 `os.popen` 读回）；确认与浏览器结果一致后再做 dll。
8. 做 dll：`"D:/MinGW64/bin/gcc" -shared -Os -s -o txckey.dll main.c wasm-rt-impl.c`；若 `LoadLibrary` 报找不到模块，先用 Depends 查依赖（实测缺 `libgcc_s_sjlj-1.dll`），必要时换 64 位 gcc 重编。
9. Python 侧用 ctypes：`dll.init_wasm()` 后设置 `argtypes` / `restype` 再调用；每次调用前都要 `set_url()`。
