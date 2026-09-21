# 某AppCDRM 直播m3u8 SM4-CBC解密分析

> **作者**: 我是不会改名的 | **发布时间**: 2026-01-04 01:07:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4775 / 41
> **原文**: [https://www.52pojie.cn/thread-2084041-1-1.html](https://www.52pojie.cn/thread-2084041-1-1.html)

---

## 某 App CDRM 解密分析

元旦天天下雨，闲着没啥事做，就分析了下某 App 的 CDRM 加密保护机制，分享出来给大家参考。
建议先阅读标准
[视音频内容分发数字版权管理技术规范](https://www.nrta.gov.cn/module/download/downfile.jsp?spm=chekydwncf.0.0.1.naYR3X&classid=0&filename=07c105055efc4fb2b464782c5760bfac.pdf)。
我都分析完了才发现实际上这个标准都写的很清楚了，仔细阅读一下，估计一天不到就能还原。

### 一、OpenSSL 符号还原分析

#### 1.1 概述

分析so的时候发现，其实用的基本都是OpenSSL库，但是被strip掉了符号，导致分析非常困难。
而且安卓端里面有两套OpenSSL，分析的时候去hook有符号的，一直没反应，后面才发现是因为hook的库和实际运行的库不一样。
看了下OpenSSL源码发现可以利用ERR\_put\_error函数的参数唯一性来还原符号，经过测试发现准确率非常高，基本上能还原大部分核心的代码，其余的倒退就行。

---

#### 1.2 获取 OpenSSL 版本

##### 1.2.1 在 IDA 中查找版本字符串

在 Strings 窗口搜索 "OpenSSL"，可以找到版本信息：

```
OpenSSL 1.1.1g  21 Apr 2020
```

![](https://attach.52pojie.cn/forum/202601/04/005741guu3jk2c22qz5232.png)

##### 1.2.2 下载对应版本源码

```
wget https://www.openssl.org/source/old/1.1.1/openssl-1.1.1g.tar.gz
tar -xzf openssl-1.1.1g.tar.gz
```

##### 1.2.3 编译带符号的 ARM64 版本

```
cd openssl-1.1.1g
./Configure  -g -O0 --prefix=/usr/local/openssl-debug
make -j8
```

---

#### 1.3 分析原理

##### 1.3.1 ERR\_put\_error 函数

`ERR_put_error` 是 OpenSSL 的核心错误处理函数，几乎所有中间加密函数在出错时都会调用它：

```
void ERR_put_error(int lib, int func, int reason, const char *file, int line);
```

| 参数 | 寄存器 (ARM64) | 说明 | 示例 |
| --- | --- | --- | --- |
| `lib` | W0 | 库/模块 ID | 20 (SSL) |
| `func` | W1 | 函数 ID | 201 |
| `reason` | W2 | 错误原因 ID | 68 |
| `file` | X3 | 源文件路径 | "ssl/ssl\_rsa.c" |
| `line` | W4 | 行号 | 91 |

##### 1.3.2 核心思路

```
┌──────────────────────────────────────────────────────────────────┐
│                         符号还原流程                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   有符号文件                            去符号文件                  │
│   ┌──────────┐                        ┌──────────┐               │
│   │ SSL_read │                        │ sub_1234 │               │
│   └────┬─────┘                        └────┬─────┘               │
│        │                                   │                     │
│        ▼                                   ▼                     │
│   ┌─────────────────┐              ┌─────────────────┐           │
│   │ ERR_put_error(  │              │ ERR_put_error(  │           │
│   │   20,           │   ════════>  │   20,           │           │
│   │   201,          │              │   201,          │           │
│   │   .. .,         │              │   ...,          │           │
│   │   "ssl/ssl.c"   │              │   "ssl/ssl.c"   │           │
│   │ )               │              │ )               │           │
│   └─────────────────┘              └─────────────────┘           │
│                                                                  │
│   提取:  {20_201_ssl/ssl.c: SSL_read}                             │
│                                                                  │
│   还原:  sub_1234 → SSL_read                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

#### 1.4 ARM64 汇编分析

##### 1.4.1 ARM64 调用约定

| 寄存器 | 用途 |
| --- | --- |
| X0/W0 | 第1个参数 (lib) |
| X1/W1 | 第2个参数 (func) |
| X2/W2 | 第3个参数 (reason) |
| X3 | 第4个参数 (file 字符串指针) |
| X4/W4 | 第5个参数 (line) |

##### 1.4.2 典型汇编模式

```
__text: 000000000022C6D8    ADRL    X3, aSslTls13EncC   ; "ssl/tls13_enc.c"  ← arg3: 文件名
__text:000000000022C6E0    MOV     W0, #0x14           ; ← arg0: lib = 20
__text:000000000022C6E4    MOV     W1, #0x231          ; ← arg1: func = 561
__text:000000000022C6E8    MOV     W2, #0x44           ; arg2: reason
__text:000000000022C6EC    MOV     W4, #0x5B           ; arg4: line
__text:000000000022C6F0    BL      ERR_put_error       ; ← 调用点
```

##### 1.4.3 提取策略

```
          调用点 (BL ERR_put_error)
             │
             │ 向前搜索 指令
             ▼
    ┌─────────────────────────┐
    │     MOV W0, #imm        │ → arg0 (lib)
    │     MOV W1, #imm        │ → arg1 (func)
    │     ADRL/ADR X3, str    │ → arg3 (file)
    └─────────────────────────┘
```

---

#### 1.5 代码实现

1. 在有符号的 OpenSSL so 文件中运行 `get_symbols.py`，生成 `symbols_mapping.txt` 文件。
2. 在去符号的 OpenSSL so 文件中运行 `restore_symbols.py`，还原符号。
3. windows ==> output window 输入代码就能运行。

##### 1.5.1 提取符号脚本 (在有符号文件中运行)

```
python name=get_symbols.py
import ida_funcs
import ida_name
import ida_idaapi
import ida_xref
import idc
TARGET_NAME = "ERR_put_error"
OUTPUT_FILE = "symbols_mapping. txt"

def get_prev_instructions(ea, count):
    addrs = []
    current = ea
    for _ in range(count):
        current = idc.prev_head(current)
        if current == idc. BADADDR:
            break
        addrs.append(current)
    return addrs

def extract_args_from_asm(call_ea):
    arg0 = None  # lib
    arg1 = None  # func
    arg3 = None  # file

    prev_addrs = get_prev_instructions(call_ea, 10)

    for ea in prev_addrs:
        mnem = idc.print_insn_mnem(ea)      # 指令助记符
        op0 = idc.print_operand(ea, 0)      # 第一个操作数 (目标)

        if mnem == "MOV" and op0 == "W0" and arg0 is None:
            arg0 = idc.get_operand_value(ea, 1)
        elif mnem == "MOV" and op0 == "W1" and arg1 is None:
            arg1 = idc.get_operand_value(ea, 1)
        elif mnem in ("ADRL", "ADR") and op0 == "X3" and arg3 is None:
            str_ea = idc.get_operand_value(ea, 1)
            str_val = idc.get_strlit_contents(str_ea)
            if str_val:
                arg3 = str_val. decode('utf-8') if isinstance(str_val, bytes) else str_val

    return arg0, arg1, arg3

def main():
    target_ea = ida_name.get_name_ea(ida_idaapi.BADADDR, TARGET_NAME)
    if target_ea == ida_idaapi. BADADDR:
        print(f"[-] Target '{TARGET_NAME}' not found")
        return

    print(f"[+] Target found at {hex(target_ea)}")

    results = {}

    cref = ida_xref.get_first_cref_to(target_ea)
    while cref != ida_idaapi.BADADDR:
        func = ida_funcs.get_func(cref)

        if func and func.start_ea not in results:
            arg0, arg1, arg3 = extract_args_from_asm(cref)

            if arg0 is not None and arg1 is not None and arg3 is not None:
                func_name = ida_funcs.get_func_name(func. start_ea)
                results[func. start_ea] = (func_name, arg0, arg1, arg3)
                print(f"[+] {func_name}:  {arg0}, {arg1}, \"{arg3}\"")

        cref = ida_xref.get_next_cref_to(target_ea, cref)

    with open(OUTPUT_FILE, 'w') as f:
        for func_ea, (func_name, arg0, arg1, arg3) in results.items():
            f.write(f"{arg0}\t{arg1}\t{arg3}\t{func_name}\n")

    print(f"\n[+] Saved {len(results)} mappings to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
```

##### 1.5.2 还原符号脚本 (在去符号文件中运行)

```
python name=restore_symbols.py
import ida_funcs
import ida_name
import ida_idaapi
import ida_xref
import ida_kernwin
import ida_auto
import idc

TARGET_NAME = "_ERR_put_error"
INPUT_FILE = "symbols_mapping. txt"

def load_mappings(filepath):
    mappings = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split('\t')
                if len(parts) >= 4:
                    key = f"{parts[0]}_{parts[1]}_{parts[2]}"
                    mappings[key] = parts[3]
        print(f"[+] Loaded {len(mappings)} mappings")
    except Exception as e:
        print(f"[-] Error:  {e}")
    return mappings

def get_prev_instructions(ea, count):
    addrs = []
    current = ea
    for _ in range(count):
        current = idc.prev_head(current)
        if current == idc.BADADDR:
            break
        addrs.append(current)
    return addrs

def extract_args_from_asm(call_ea):
    arg0 = None
    arg1 = None
    arg3 = None

    prev_addrs = get_prev_instructions(call_ea, 10)

    for ea in prev_addrs:
        mnem = idc.print_insn_mnem(ea)
        op0 = idc. print_operand(ea, 0)

        if mnem == "MOV" and op0 == "W0" and arg0 is None:
            arg0 = idc.get_operand_value(ea, 1)

        elif mnem == "MOV" and op0 == "W1" and arg1 is None:
            arg1 = idc. get_operand_value(ea, 1)

        elif mnem in ("ADRL", "ADR") and op0 == "X3" and arg3 is None:
            str_ea = idc.get_operand_value(ea, 1)
            str_val = idc.get_strlit_contents(str_ea)
            if str_val:
                arg3 = str_val.decode('utf-8') if isinstance(str_val, bytes) else str_val

    return arg0, arg1, arg3

def rename_function(func_ea, new_name):
    old_name = ida_funcs.get_func_name(func_ea)

    if old_name == new_name:
        return False

    final_name = new_name
    if ida_name.get_name_ea(ida_idaapi.BADADDR, new_name) != ida_idaapi. BADADDR:
        suffix = 1
        while ida_name.get_name_ea(ida_idaapi.BADADDR, f"{new_name}_{suffix}") != ida_idaapi.BADADDR:
            suffix += 1
        final_name = f"{new_name}_{suffix}"

    if ida_name.set_name(func_ea, final_name, ida_name.SN_FORCE | ida_name.SN_NOWARN):
        print(f"[+] Renamed:  {old_name} -> {final_name}")
        return True

    print(f"[-] Failed:  {old_name}")
    return False

def main():
    mappings = load_mappings(INPUT_FILE)
    if not mappings:
        print("[-] No mappings loaded")
        return

    target_ea = ida_name.get_name_ea(ida_idaapi.BADADDR, TARGET_NAME)
    if target_ea == ida_idaapi.BADADDR:
        print(f"[-] Target '{TARGET_NAME}' not found")
        return

    print(f"[+] Target found at {hex(target_ea)}")

    renamed_funcs = set()
    not_found = []

    cref = ida_xref.get_first_cref_to(target_ea)
    while cref != ida_idaapi.BADADDR:
        func = ida_funcs.get_func(cref)

        if func and func.start_ea not in renamed_funcs:
            arg0, arg1, arg3 = extract_args_from_asm(cref)

            if arg0 is not None and arg1 is not None and arg3 is not None:
                key = f"{arg0}_{arg1}_{arg3}"

                if key in mappings:
                    new_name = mappings[key]
                    if rename_function(func.start_ea, new_name):
                        renamed_funcs.add(func.start_ea)
                else:
                    not_found. append((func.start_ea, key))

        cref = ida_xref.get_next_cref_to(target_ea, cref)

    ida_kernwin. refresh_idaview_anyway()
    ida_auto.auto_wait()
    print(f"\n{'='*50}")
    print(f"[+] Done!")
    print(f"    Renamed:  {len(renamed_funcs)} functions")
    print(f"    Not found in mapping: {len(not_found)}")

    if not_found and len(not_found) <= 10:
        print(f"\nUnmatched functions:")
        for ea, key in not_found:
            print(f"    {hex(ea)}: {key}")

if __name__ == "__main__":
    main()
```

![](https://attach.52pojie.cn/forum/202601/04/005739jmkbglugc2oczxlu.png)

---

#### 1.7 存在问题

* 某些函数可能没有调用 `ERR_put_error`，因此无法还原。
* 测试的时候发现有点函数名会重复，但不多
* 一开始使用的反编译整个函数，这样不用管指令，然后ast遍历，后面发现ollvm加的太多了太慢了，而且很多反编译存在问题。

### 二、frida hook

#### 2.1 概述

在逆向分析过程中，静态分析往往不够直观，需要结合动态调试来验证分析结果。Frida 是一个强大的动态插桩工具，可以在运行时 Hook 函数、打印参数、修改返回值等。

---

#### 2.2 技巧：自编译辅助 DLL

##### 2.2.1 为什么需要辅助 DLL？

在 Hook 过程中，某些参数是复杂的结构体指针（如 `EC_KEY*`、`EVP_CIPHER_CTX*`），直接在 Frida 中解析这些结构体非常困难。

**解决方案**：自行编译一个辅助 DLL，封装好解析函数，然后在 Frida 中加载并调用。

##### 2.2.2 辅助函数示例

```
c name=cdrm_helper. c
#include <openssl/ec.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <openssl/evp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/**
 * 获取 EC 私钥的 Base64 编码
 * @Param ec_key EC_KEY 指针
 * @Return Base64 编码的私钥字符串（调用者需要 free）
 */
char* get_priv_key_hex(const EC_KEY *ec_key) {
    char *priv_key_base64 = NULL;
    const BIGNUM *priv_bn = EC_KEY_get0_private_key(ec_key);

    if (priv_bn) {
        int priv_key_len = BN_num_bytes(priv_bn);
        uint8_t *priv_key_buf = (uint8_t *)malloc(priv_key_len);

        if (priv_key_buf) {
            BN_bn2bin(priv_bn, priv_key_buf);

            // Base64 编码
            BIO *b64 = BIO_new(BIO_f_base64());
            BIO *bio = BIO_new(BIO_s_mem());
            BIO_push(b64, bio);
            BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);  // 不要换行
            BIO_write(b64, priv_key_buf, priv_key_len);
            BIO_flush(b64);

            BUF_MEM *bptr;
            BIO_get_mem_ptr(b64, &bptr);

            priv_key_base64 = (char *)malloc(bptr->length + 1);
            if (priv_key_base64) {
                memcpy(priv_key_base64, bptr->data, bptr->length);
                priv_key_base64[bptr->length] = '\0';
                printf("[Helper] Private Key (Base64): %s\n", priv_key_base64);
            }

            BIO_free_all(b64);
            free(priv_key_buf);
        }
    }

    return priv_key_base64;
}

/**
 * 获取 EVP_CIPHER_CTX 的加密算法名称
 * @param ctx EVP_CIPHER_CTX 指针
 * @return 算法名称字符串
 */
const char* get_cipher_name(const EVP_CIPHER_CTX *ctx) {
    const EVP_CIPHER *cipher = EVP_CIPHER_CTX_cipher(ctx);
    if (cipher) {
        return EVP_CIPHER_name(cipher);
    }
    return "unknown";
}

/**
 * 获取 EVP_CIPHER_CTX 的密钥长度
 */
int get_cipher_key_length(const EVP_CIPHER_CTX *ctx) {
    return EVP_CIPHER_CTX_key_length(ctx);
}

/**
 * 获取 EVP_CIPHER_CTX 的 IV 长度
 */
int get_cipher_iv_length(const EVP_CIPHER_CTX *ctx) {
    return EVP_CIPHER_CTX_iv_length(ctx);
}
```

#### 2.3 计算非导出函数地址

##### 2.3.1 问题

IDA 分析的函数偏移有时候和实际运行时的地址不同，但：

* 每个函数的长度相同
* 函数之间的**相对偏移**相同

##### 2.3.2 解决方案

```
┌─────────────────────────────────────────────────────────────────┐
│                    计算非导出函数地址                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IDA 中:                           运行时:                       │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │ 导出函数 A           │         │ 导出函数 A           │         │
│  │ IDA地址: 0x101D81820 │        │ 实际地址: 0x102A00000 │        │
│  └─────────────────────┘         └─────────────────────┘        │
│           │                               │                     │
│           │ 偏移 0x112D74                 │ 偏移 0x112D74        │
│           ▼                               ▼                     │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │ 目标函数 B           │          │ 目标函数 B           │        │
│  │ IDA地址: 0x101E94594│          │ 实际地址: 0x102B12D74│        │
│  └─────────────────────┘         └─────────────────────┘        │
│                                                                 │
│  公式: 实际地址B = 实际地址A + (IDA地址B - IDA地址A)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### 2.3.3 代码实现

```
var exportedFunc = Module.findExportByName("", "_ZN12avs3renderer9KN3d2Sn3dEi");
var ida_exported_addr = 0x101D81820;
var base_offset = exportedFunc. sub(ida_exported_addr);
var ida_target_addr = 0x101E94594;
var actual_target_addr = base_offset. add(ida_target_addr);
console.log("目标函数实际地址: " + actual_target_addr);
```

### 三、Provision 分析

#### 3.1 概述

Provision（设备注册/配置）是 DRM 系统中的关键步骤，用于向 License Server 注册设备并获取设备证书。整个流程包括：

1. **liveinfo.ysp.cctv.cn encrypt\_info 解密** - 获取 Provision Server URL
2. **GetProvisionRequest** - 生成设备注册请求
3. **ProcessProvisionResponse** - 处理服务器返回的证书

```
┌─────────────────────────────────────────────────────────────────┐
│                     Provision 流程概览                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                               │
│  │ encrypt_info │ ──解密──> Provision Server URL                │
│  └──────────────┘           (目前为固定值)                       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                        │
│  │ GetProvisionRequest │ ──生成──> 设备注册请求数据              │
│  └─────────────────────┘                                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐      ┌─────────────────┐              │
│  │   HTTP POST 请求     │ ───> │ Provision Server │              │
│  └─────────────────────┘      └─────────────────┘              │
│         │                              │                        │
│         │                              ▼                        │
│         │                     ┌─────────────────┐              │
│         │ <────────────────── │  服务器响应数据   │              │
│         │                     └─────────────────┘              │
│         ▼                                                       │
│  ┌──────────────────────────┐                                   │
│  │ ProcessProvisionResponse │ ──处理──> 设备证书/密钥           │
│  └──────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 3.2 encrypt\_info 解密

`encrypt_info` 包含加密的配置信息，解密后可获取 Provision Server 的 URL。目前分析发现该 URL 为固定值。
获取播放地址时一起返回的。就一个aes java层没什么好分析的。

```
{
    "license_url": "https://drm-cau1.cctv.cn/cau_v2/GetLicense",
    "provision_url": "https://drm-kps1.cctv.cn/provision/v1",
    "isDrmEmergency": "https://drm-player-api1.cctv.cn/v1/drm1_config.json"
}
```

![](https://attach.52pojie.cn/forum/202601/04/005737jb6j036w3y836x9g.png)

#### 3.3 GetProvisionRequest

##### 3.3.1 功能说明

`GetProvisionRequest` 函数用于生成证书申请消息，该数据将发送到 provision\_url。

##### 3.3.3 请求数据结构

```
signedRequest:base64_encoded_string
{
    "clientInfo": {
        "appCertFingerprint": "MTIzNDU2Nzg5MDEyMzQ1Ng==",
        "appName": "com.zt.test",
        "appProvider": "zt",
        "appVersion": "1.0",
        "drmClientVersion": "SDK1.0",
        "deviceID": "" ,# 设备唯一标识
    },
    "drmClientSystemId": "STSDK-7953894cec2",
    "keyProfile": "KMSProfile1",
    "reqID": "",# 唯一请求 ID
    "sign": "",# 签名
    "timestamp": "",# 时间戳
    "version": "STSDK1"
}
```

代码有混淆，但是很标准，d810基本就够了，但是啊，函数很大，配置不行，分析1小时，40分钟都在等反编译。

![](https://attach.52pojie.cn/forum/202601/04/005735t6u4400qaopupqo7.png)

首先是reqID就一个md5，随机生成应该也行的

![](https://attach.52pojie.cn/forum/202601/04/005733tv8k2n0111650p7d.png)

然后是sign签名
先aes-ecb s\_drm\_key解密内存中的一个地址DTA\_SIGN\_PKEY，获取一个私钥,然后rsa签名（PKCS1\_PSS with SHA256）

![](https://attach.52pojie.cn/forum/202601/04/005730s700ac5adcztomzj.png)

#### 3.4 ProcessProvisionResponse

##### 3.4.1 功能说明

`ProcessProvisionResponse` 函数用于处理 Provision Server 返回的响应数据，提取并存储设备证书。

后面的加解密就不详细分析了，只要第一步还原了符号，然后hook常用加密、签名、哈希、摘要基本就能分析出来了。
在线测试可以用https://tools.huijusa.cn/#/home

##### 3.4.2 响应数据结构

```
{
    "resultCode":  "success",
    "reqID": "",
    "provisionData": "<Base64 加密数据>",
    "tempKey": "<RSA-OAEP 加密的临时密钥1>",
    "tempIV": "<Base64 编码的 IV>",
    "tempKey2": "<RSA-OAEP 加密的临时密钥2>",
    "timestamp": 1234567890,
    "stsdkPrvKeyInfo":  {
        "aesRandom": "",
        "prvKeyD0":  "",
        "prvKeyN":  ""
    },
    "minRetryInterval": "0",
    "signCerts": [
        "<Base64 DER 证书1>",
        "<Base64 DER 证书2>"
    ],
    "sign":  "<签名>"
}
```

| 字段 | 说明 |
| --- | --- |
| `provisionData` | 加密的核心数据，包含设备证书和密钥 |
| `tempKey` | RSA-OAEP 加密的 AES 密钥（第一层） |
| `tempIV` | 第一层解密的 IV |
| `tempKey2` | RSA-OAEP 加密的 AES 密钥（第二层） |
| `signCerts` | DRM 服务端证书链（不含根证书） |
| `sign` | 服务器签名 |

##### 3.4.3 多层解密流程

```
python
#部分代码
parts_4 = Struct(
    "version" / Int32ub,
    "dataLength" / Int32ub,
    "data" / Bytes(this.dataLength),#加密的公钥证书，证书链第一个
    "devCALength"/Int32ub,
    "devCA" / Bytes(this.devCALength)#证书链第二个
)
#DTA_DEC_PKEY

#DTA_DEC_PKEY同样是s_drm_key解密内存中的一个地址DTA_DEC_PKEY，获取一个私钥

def aes_decrypt_gcm(key: bytes, iv: bytes, ciphertext: bytes, tag: bytes = None) -> bytes:
if tag is None:
tag = ciphertext[-16:]
ciphertext = ciphertext[:-16]

        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        return cipher.decrypt_and_verify(ciphertext, tag)

#sm3计算的是公钥，不是公钥证书
pub_pem_full = pem.armor('PUBLIC KEY', spki_der).decode('utf-8')
pub_pem_body = "\n".join([line for line in pub_pem_full.splitlines() if "-----" not in line])
pub_key_sm3 = sm3_hash(base64.b64decode(pub_pem_body))
```

```
┌─────────────────────────────────────────────────────────────────┐
│              ProcessProvisionResponse 解密流程                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 第一层解密：解密 provisionData                             │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  DTA_DEC_PKEY ──aes-ecb解密──> DTA_DEC_PKEY              │    │
│  │  tempKey ──RSA-PKCS1_OAEP解密──> temp_key_1              │    │
│  │                    (使用 DTA_DEC_PKEY)                   │    │
│  │                                                         │    │
│  │  tempIV ──Base64解码──> temp_iv_1                        │    │
│  │                                                         │    │
│  │  provisionData ──Base64解码──> blob_bytes                │    │
│  │                                                         │    │
│  │  blob_bytes ──AES-GCM解密──> decrypted_str               │    │
│  │                (key=temp_key_1, iv=temp_iv_1)           │    │
│  │                                                         │    │
│  │  decrypted_str 格式:  "part0:part1:part2:part3:part4"    │    │
│  │                       ↓     ↓     ↓     ↓     ↓         │    │
│  │                      level algo  key   prk  cert        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 第二层解密：解密 temp_key_3                                │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  tempKey2 ──RSA-OAEP解密──> temp_key_2                   │    │
│  │                    (使用 DTA_DEC_PKEY)                   │    │
│  │                                                         │    │
│  │  parts[2] ──Base64解码──> blob_2                         │    │
│  │                                                         │    │
│  │  blob_2 = iv_2 (前12字节) + cipher_2 (剩余部分)           │    │
│  │                                                         │    │
│  │  cipher_2 ──AES-GCM解密──> temp_key_3                    │    │
│  │                (key=temp_key_2, iv=iv_2)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 第三层解密：解密设备私钥 (DevPrK)                           │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  parts[3] ──Base64解码──> blob_3                         │    │
│  │                                                         │    │
│  │  blob_3 = iv_3 (前12字节) + cipher_3 (剩余部分)           │    │
│  │                                                         │    │
│  │  cipher_3 ──AES-GCM解密──> DevPrK (设备私钥)              │    │
│  │                (key=temp_key_3, iv=iv_3)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 第四层解密：解密设备公钥证书 (DevPubK)                       │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  parts[4] ──Base64解码──> parts_4                       │    │
│  │                                                         │    │
│  │  parts_4 ──Proto*解析──> final_parsed                    │    │
│  │            ├─ data:  加密的证书数据                       │    │
│  │            └─ devCA: CA 证书                            │    │
│  │                                                         │    │
│  │  final_parsed.data = iv_4 (前12字节) + cipher_4           │    │
│  │                                                         │    │
│  │  cipher_4 ──AES-GCM解密──> DevPubK (设备公钥证书)          │    │
│  │                (key=temp_key_3, iv=iv_4)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 生成 Device ID                                           │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  DevPubK ──解析证书──> 公钥数据                            │    │
│  │                                                         │    │
│  │  公钥数据 ──SM3哈希──> fingerprint                         │    │
│  │                                                         │    │
│  │  fingerprint ──Base64编码──> deviceID                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.5 保存 ProvisionResponse到certchain.data

实际上就是把上面的数据加密保存到本地一个文件certchain.data里面，后面播放会读取这个文件。
certchain.data不存在才会调用申请流程，存在就直接读取。

```
┌─────────────────────────────────────────────────────────────────┐
│                  保存 ProvisionResponse 流程                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入:  provision_info (JSON 对象)                                │
│        device_id (设备ID字符串)                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. 生成随机 key_seed (16 字节)                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2. 加密 key_seed                                         │    │
│  │                                                         │    │
│  │    key_seed ──AES-ECB加密──> encrypted_seed (16字节)     │    │
│  │                  (key=s_drm_key)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3. 派生 SM4 密钥                                         │    │
│  │                                                         │    │
│  │    sm4_key = key_seed XOR device_id. encode()           │    │
│  │              (逐字节异或)                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 4. 序列化并加密 provision_info                            │    │
│  │                                                         │    │
│  │    provision_info ──JSON序列化──> provision_json         │    │
│  │                                                         │    │
│  │    provision_json ──SM4-ECB加密──> encrypted_data        │    │
│  │                       (key=sm4_key)                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 5. 拼接并写入文件                                         │    │
│  │                                                         │    │
│  │    certchain.data = encrypted_seed + encrypted_data     │    │
│  │                      (16字节)       (变长)               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.6 完整数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                    Provision 完整数据流                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client                                    Server               │
│    │                                          │                 │
│    │  1. GetProvisionRequest()                │                 │
│    │                                          │                 │
│    │ ──────── HTTP POST Request ────────────> │                 │
│    │                                          │                 │
│    │                                          │  2. 验证请求     │
│    │                                          │  3. 生成证书     │
│    │                                          │  4. 多层加密     │
│    │                                          │                 │
│    │ <─────── JSON Response ───────────────── │                 │
│    │          {                               │                 │
│    │            provisionData,                │                 │
│    │            tempKey,                      │                 │
│    │            tempKey2,                     │                 │
│    │            ...                           │                 │
│    │          }                               │                 │
│    │                                          │                 │
│    │  5. 保存 ProvisionResponse 到本地          │                 │
│    │     ├─ 生成随机 key_seed                   │                 │
│    │     ├─ AES-ECB 加密 key_seed              │                 │
│    │     ├─ XOR 派生 sm4_key                   │                 │
│    │     ├─ SM4-ECB 加密 ProvisionResponse     │                 │
│    │     └─ 写入 certchain.data                │                 │
│    │                                          │                 │
│    ▼                                          │                 │
│  ┌────────────────────────────────────┐       │                 │
│  │ certchain.data (本地加密存储)        │       │                 │
│  │ ├─ encrypted_seed (16 bytes)       │       │                 │
│  │ └─ encrypted_ProvisionResponse     │       │                 │
│  └────────────────────────────────────┘       │                 │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  后续使用 (离线):                                                 │
│                                                                 │
│  ┌────────────────────────────────────┐                         │
│  │ certchain.data                     │                         │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ▼                                                       │
│  ┌────────────────────────────────────┐                         │
│  │ ProvisionResponse_from_certchain() │                         │
│  │ ├─ AES-ECB 解密 key_seed            │                         │
│  │ ├─ XOR 派生 sm4_key                 │                         │
│  │ └─ SM4-ECB 解密 ProvisionResponse   │                         │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ▼                                                       │
│  ┌────────────────────────────────────┐                         │
│  │ ProvisionResponse (JSON)           │                         │
│  │ {                                  │                         │
│  │   provisionData,                   │                         │
│  │   tempKey,                         │                         │
│  │   tempKey2,                        │                         │
│  │   tempIV,                          │                         │
│  │   signCerts,                       │                         │
│  │   ...                              │                         │
│  │ }                                  │                         │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ▼                                                       │
│  ┌────────────────────────────────────┐                         │
│  │ ProcessProvisionResponse()         │                         │
│  │ ├─ RSA-OAEP 解密 tempKey           │                         │
│  │ ├─ AES-GCM 解密 provisionData      │                         │
│  │ ├─ RSA-OAEP 解密 tempKey2          │                         │
│  │ ├─ AES-GCM 解密 temp_key_3         │                         │
│  │ ├─ AES-GCM 解密 DevPrK             │                         │
│  │ ├─ AES-GCM 解密 DevPubK            │                         │
│  │ └─ SM3 计算 deviceID               │                         │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ▼                                                       │
│  ┌────────────────────────────────────┐                         │
│  │ provision_info (解析结果)           │                         │
│  │ ├─ deviceID                        │                         │
│  │ ├─ DevPrK (设备私钥)                │                         │
│  │ ├─ DevPubK (设备公钥)               │                         │
│  │ ├─ certificateChain                 │                         │
│  │ ├─ drm_level                       │                         │
│  │ └─ algorithms                      │                         │
│  └────────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 四、License 分析

#### 4.1 概述

License（许可证）是 DRM 系统中的核心组件，负责控制内容的访问权限。用于获取内容解密密钥。

> ⚠️ **重要提示**：这个环节可以说是最麻烦，也可以是最简单的。**一定要先看上面的标准文件**，不然就会浪费很多时间。下面分析就不走我的老路了，太累了。

整个 License 流程包括：

1. **GetLicenseRequest** - 构造许可证请求
2. **HTTP POST** - 发送请求到 License Server
3. **ProcessLicenseResponse** - 处理响应，提取内容密钥

```
┌─────────────────────────────────────────────────────────────────┐
│                     License 流程概览                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────┐                         │
│  │ Provision 阶段获取的数据            │                          │
│  │ ├─ deviceID                        │                         │
│  │ ├─ DevPrK (设备私钥)               │                          │
│  │ ├─ DevPubK (设备公钥)              │                          │
│  │ └─ certificateChain                │                          │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                        │
│  │ GetLicenseRequest   │ ──构造──> License 请求 JSON             │
│  └─────────────────────┘                                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐      ┌─────────────────┐               │
│  │   HTTP POST 请求     │ ───> │  License Server │               │
│  │   /cau_v2/GetLicense │      └─────────────────┘              │
│  └─────────────────────┘              │                         │
│         │                              ▼                        │
│         │                     ┌─────────────────┐               │
│         │ <────────────────── │  License 响应    │               │
│         │                     └─────────────────┘               │
│         ▼                                                       │
│  ┌──────────────────────────┐                                   │
│  │ ProcessLicenseResponse   │ ──解密──> 内容密钥 (Content Key)    │
│  └──────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 4.2 GetLicenseRequest

##### 4.2.1 请求接口

```
POST /cau_v2/GetLicense HTTP/1.1
Host: drm-cau1.cctv.cn
Accept: */*
Content-Type: application/json
Connection: close
```

##### 4.2.2 请求数据结构

```
{
    "certificateChain": ["<Base64 设备证书>", "<Base64 CA证书>"],
    "nonce": "<Base64 随机数>",
    "type": "licenseRequest",
    "version": "2.0",
    "requestTime": 1767272988,
    "deviceID": "<Base64 设备ID>",
    "supportedAlgorithms": ["KMSProfile1"],
    "contentIDs": ["<Base64 内容ID>"],
    "extensions": {
        "authenticationData": "<Base64 扩展数据>"
    },
    "signature": "<Base64 SM2签名>"
}
```

##### 4.2.3 字段说明

| 字段 | 类型 | 说明 | 来源 |
| --- | --- | --- | --- |
| `certificateChain` | string[] | 设备证书链 (Base64) | Provision 阶段获取 |
| `nonce` | string | 随机数 (Base64, 16字节) | 客户端生成 |
| `type` | string | 请求类型，固定 `"licenseRequest"` | 固定值 |
| `version` | string | 协议版本，固定 `"2.0"` | 固定值 |
| `requestTime` | number | 请求时间戳 (秒) | 当前时间 |
| `deviceID` | string | 设备ID (Base64) | Provision 阶段获取 |
| `supportedAlgorithms` | string[] | 支持的算法 | 固定 `["KMSProfile1"]` |
| `contentIDs` | string[] | 内容ID列表 (Base64编码) | 播放内容 |
| `extensions` | object | 扩展信息 | 应用信息 |
| `signature` | string | SM2 签名 (Base64) | 设备私钥签名 |

##### 4.2.4 extensions. authenticationData

```
{
    "appName": "UnKnown",
    "SdkVersion": "1.8.3"
}
```

Base64 编码后：`eyJhcHBOYW1lIjoiVW5Lbm93biIsIlNka1ZlcnNpb24iOiIxLjguMyJ9`

##### 4.2.5 签名流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    License Request 签名流程                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 构造请求 JSON (signature 字段为空)                           │
│                                                                 │
│     {                                                           │
│       "certificateChain": [... ],                                │
│       "nonce": ".. .",                                           │
│       "type": "licenseRequest",                                 │
│       ...                                                        │
│       "signature": ""        ← 签名前为空                       │
│     }                                                           │
│                                                                 │
│  2. JSON 序列化 (无空格)                                         │
│                                                                 │
│     data = json.dumps(request, separators=(',', ':'))           │
│                                                                 │
│  3. SM2 签名                                                    │
│                                                                 │
│     signature = SM2_Sign(data.encode(), DevPrK)                 │
│                                    ↑                            │
│                             设备私钥 (Provision获取)            │
│                                                                 │
│  4. 填充签名字段                                                 │
│                                                                 │
│     request["signature"] = Base64(signature)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### 4.2.6 contentID 编码

```
原始 contentID:   "20272495"
       │
       ▼
Base64 编码:      "MjAyNzI0OTU="
```

多个内容 ID 时，每个都需要 Base64 编码：

```
contentIDs = ["20272495"] #liveinfo.ysp.cctv.cn返回的
encoded = [base64.b64encode(cid.encode()).decode() for cid in contentIDs]
# ["MjAyNzI0OTU=", "MjAyNzI0OTY="]
```

---

##### 4.2.7 完整请求构造流程

```
┌─────────────────────────────────────────────────────────────────┐
│                 GetLicenseRequest 构造流程                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入:                                                           │
│  ├─ contentIDs: ["20272495"]        (要播放的内容ID)              │
│  ├─ deviceID: "9L6h8oK..."          (Provision获取)              │
│  ├─ certificateChain: [...]         (Provision获取)              │
│  ├─ DevPrK: "..."                   (Provision获取，用于签名)     │
│  └─ DevPubK: "..."                  (Provision获取)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. 初始化 SM2 密钥对                                      │    │
│  │                                                         │    │
│  │    set_sm2_crypt(DevPrK, DevPubK)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2. 构造请求 JSON 结构                                     │    │
│  │                                                         │    │
│  │    license_request = {                                  │    │
│  │      "certificateChain": certificateChain,                │    │
│  │      "nonce": Base64(random_16_bytes),                  │    │
│  │      "type":  "licenseRequest",                         │    │
│  │      "version": "2.0",                                  │    │
│  │      "requestTime": current_timestamp,                  │    │
│  │      "deviceID": deviceID,                              │    │
│  │      "supportedAlgorithms":  ["KMSProfile1"],            │    │
│  │      "contentIDs": [Base64(cid) for cid in contentIDs], │    │
│  │      "extensions": {                                    │    │
│  │        "authenticationData": "eyJhcHBO..."              │    │
│  │      },                                                 │    │
│  │      "signature":  ""                                   │    │
│  │    }                                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3. JSON 序列化                                           │    │
│  │                                                         │    │
│  │   json.dumps(license_request, separators=(',',':'))     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 4. SM2 签名                                              │    │
│  │                                                         │    │
│  │    signature = sm2_sign(data.encode())                  │    │
│  │                         ↑                               │    │
│  │                  使用 DevPrK 私钥                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 5. 填充签名                                              │    │
│  │                                                         │    │
│  │    license_request["signature"] = Base64(signature)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  输出:  license_request (完整的请求 JSON)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3 ProcessLicenseResponse

##### 4.3.1 概述

> ⚠️ **重要提示**：这部分主要是解析 `protectedLicenses` 字段。**强烈建议先参考标准文件**，里面定义了完整的许可证编码格式和密码算法规范。我一开始纯逆向分析 so 文件，分析完才发现标准文件里都有定义，浪费了大量时间。直接 Hook 相关函数就能获取关键数据。

##### 4.3.2 参考标准文件

**7.2 许可证编码**

![](https://attach.52pojie.cn/forum/202601/04/005728mtyttfe8tf42tt8h.png)

**附录 B 密码算法**

![](https://attach.52pojie.cn/forum/202601/04/005726v2d58ysycf11rlfs.png)

##### 4.3.3 许可证单元编码格式

根据标准文件，每个许可证单元的编码格式如下：

```
┌─────────┬─────────┬─────────┬─────────────┐
│  类型   │  索引     │  长度   │    数据      │
│  8bit   │  8bit   │  16bit  │   N×8bit    │
├─────────┴─────────┼─────────┼─────────────┤
│      标识          │  长度   │    数据      │
└───────────────────┴─────────┴─────────────┘
```

* **标识**：2 字节，包括类型和索引
  + 第 1 字节：类型
  + 第 2 字节：该单元在许可证中的索引（从 0 开始）
* **长度**：2 字节，该单元实际数据的长度
* **数据**：单元的实际数据

##### 4.3.4 单元类型定义

| 类型 | 编码 | 说明 |
| --- | --- | --- |
| 许可证索引 | 0x00 | 许可证基本信息 |
| 内容 | 0x01 | 内容 ID 和 CEK 关联 |
| 被授权对象 | 0x02 | 设备 ID 等 |
| 密钥 | 0x03 | 加密的密钥数据 |
| 密钥使用规则 | 0x04 | 时间限制等 |
| 数字签名 | 0xFF | HMAC 签名 |
| 保留 | 0x05~0xEF | - |

##### 4.3.5 密码算法规范 (KeyProfile1)

根据标准附录 B，KeyProfile1 定义如下：

| 项目 | 算法 | 模式 | 说明 |
| --- | --- | --- | --- |
| 内容加密 | SM4 | CBC | 视音频内容加密 |
| CEK 加密 | SM4 | ECB | 用 SessionKey 加密 CEK |
| SessionKey 加密 | SM2 | - | 用设备公钥加密 |
| 消息验证 | HMAC-SM3 | - | 32 字节密钥 |

##### 4.3.6 许可证结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      License 结构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LicenseIndex (0x00)                                     │    │
│  │ ├─ Version                                              │    │
│  │ ├─ LicenseID (8 bytes)                                  │    │
│  │ ├─ UnitsNumber (基本单元数量)                             │    │
│  │ └─ TimeStamp                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ BaseUnits (根据 UnitsNumber)                             │    │
│  │                                                         │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ ContentUnit (0x01)                                  │ │    │
│  │ │ ├─ ContentID                                        │ │    │
│  │ │ ├─ CEKCount                                         │ │    │
│  │ │ └─ KeyIdentifiers[]                                  │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ AuthorizedObjectUnit (0x02)                         │ │    │
│  │ │ ├─ ObjectType                                       │ │    │
│  │ │ └─ ObjectID (deviceID)                              │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ KeyUnit (0x03) - SessionKey                         │ │    │
│  │ │ ├─ KeyAlgorithm:  SM2_256                           │ │    │
│  │ │ ├─ KeyData:  SM2 加密的 SessionKey                   │ │    │
│  │ │ ├─ KeyType: SessionKey (0x20)                       │ │    │
│  │ │ └─ KeyIdentifier                                     │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ KeyUnit (0x03) - MACKey                             │ │    │
│  │ │ ├─ KeyAlgorithm: SM2_256                            │ │    │
│  │ │ ├─ KeyData:  SM2 加密的 MACKey                       │ │    │
│  │ │ ├─ KeyType: MACKey (0x21)                           │ │    │
│  │ │ └─ KeyIdentifier                                     │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ KeyUnit (0x03) - CEK (多个)                          │ │    │
│  │ │ ├─ KeyAlgorithm: SM4_128                            │ │    │
│  │ │ ├─ KeyData: SessionKey 加密的 CEK                    │ │    │
│  │ │ ├─ KeyType: ContentEncryptionKey (0x01)             │ │    │
│  │ │ ├─ KeyIdentifier                                     │ │    │
│  │ │ └─ UpperKeyIdentifier (指向 SessionKey)               │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ KeyUsageRulesUnit (0x04)                            │ │    │
│  │ │ ├─ KeyIdentifier                                     │ │    │
│  │ │ └─ KeyRules[] (时间限制等)                            │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DigitalSignature (0xFF)                                 │    │
│  │ ├─ Algorithm: HMAC_SM3 (0x43)                           │    │
│  │ ├─ KeyID (指向 MACKey)                                   │    │
│  │ └─ Signature (HMAC-SM3 签名)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### 4.3.7 密钥类型定义

| KeyType | 编码 | 说明 |
| --- | --- | --- |
| ContentEncryptionKey | 0x01 | 内容加密密钥 (CEK) |
| DeviceKey | 0x03 | 设备密钥 |
| SessionKey | 0x20 | 会话密钥 |
| MACKey | 0x21 | 消息验证码密钥 |

##### 4.3.8 解密流程

```
┌─────────────────────────────────────────────────────────────────┐
│                ProcessLicenseResponse 解密流程                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入:  protectedLicenses (Base64 编码的许可证数据)                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Base64 解码                                           │    │
│  │                                                         │    │
│  │    binary_data = base64.decode(protectedLicenses)       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2. 解析 License 结构                                     │    │
│  │                                                         │    │
│  │    lic = LicenseStruct.parse(binary_data)               │    │
│  │    ├─ LicenseIndex                                      │    │
│  │    ├─ BaseUnits[]                                       │    │
│  │    └─ DigitalSignature                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3. 遍历 BaseUnits，提取密钥                               │    │
│  │                                                         │    │
│  │    for unit in BaseUnits:                               │    │
│  │        if unit.tag == "KeyTag":                         │    │
│  │            处理密钥单元                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 4. 解密 SessionKey                                       │    │
│  │                                                         │    │
│  │    KeyType == SessionKey (0x20)                         │    │
│  │    KeyAlgorithm == SM2_256 (0x12)                       │    │
│  │                                                         │    │
│  │    SessionKey = SM2_Decrypt(KeyData, DevPrK)            │    │
│  │                                    ↑                    │    │
│  │                             设备私钥                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 5. 解密 MACKey 并验证签名                                 │    │
│  │                                                         │    │
│  │    KeyType == MACKey (0x21)                             │    │
│  │    KeyAlgorithm == SM2_256 (0x12)                       │    │
│  │                                                         │    │
│  │    MACKey = SM2_Decrypt(KeyData, DevPrK)                │    │
│  │                                                         │    │
│  │    // 验证数字签名                                        │    │
│  │    msg = binary_data. split(0xFF0D)[0]  // 签名前的数据   │    │
│  │    expected = HMAC_SM3(MACKey, msg)                     │    │
│  │    assert expected == DigitalSignature. Signature       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 6. 解密 CEK (内容加密密钥)                                 │    │
│  │                                                         │    │
│  │    KeyType == ContentEncryptionKey (0x01)               │    │
│  │    KeyAlgorithm == SM4_128 (0x22)                       │    │
│  │    UpperKeyType == SessionKey                           │    │
│  │                                                         │    │
│  │    CEK = SM4_ECB_Decrypt(KeyData, SessionKey)           │    │
│  │                                                         │    │
│  │    // CEK 用于解密实际的视频内容                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  输出:                                                           │
│  ├─ LicenseID                                                   │
│  ├─ ContentID                                                   │
│  ├─ SessionKey                                                  │
│  └─ CEK[] (内容加密密钥列表)                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### 4.3.9 密钥层级关系

```
┌─────────────────────────────────────────────────────────────────┐
│                      密钥层级关系                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DevPrK (设备私钥)                                               │
│  ├─ 来源:  Provision 阶段获取                                     │
│  └─ 用途: SM2 解密 SessionKey 和 MACKey                           │
│       │                                                         │
│       ├──────────────────┬──────────────────┐                   │
│       ▼                  ▼                  │                   │
│  SessionKey          MACKey                 │                   │
│  ├─ 算法: SM2        ├─ 算法: SM2            │                   │
│  └─ 用途:             └─ 用途:               │                   │
│      │                   │                  │                   │
│      │                   ▼                  │                   │
│      │             HMAC-SM3 验签             │                   │
│      │             (验证许可证完整性)          │                   │
│      │                                      │                   │
│      ▼                                      │                   │
│  CEK (内容加密密钥)                           │                   │
│  ├─ 算法: SM4-ECB (用 SessionKey 解密)        │                   │
│  └─ 用途:                                    │                   │
│      │                                      │                   │
│      ▼                                      │                   │
│  SM4-CBC 解密视频内容                         │                   │
│                                             │                   │
└─────────────────────────────────────────────────────────────────┘
```

##### 4.3.10 部分解析代码结构

```
# 单元类型枚举
UnitTagEnum = Enum(Int8ub,
    LicenseIndexTag = 0x00,
    ContentTag = 0x01,
    AuthorizedObjectTag = 0x02,
    KeyTag = 0x03,
    KeyUsageRulesTag = 0x04,
    DigitalSignatureTag = 0xFF
)

# 密钥类型枚举
KeyTypeEnum = Enum(Int8ub,
    ContentEncryptionKey = 0x01,
    DeviceKey = 0x03,
    SessionKey = 0x20,
    MACKey = 0x21
)

# 密码算法枚举 (附录 B)
CryptoAlgorithmEnum = Enum(Int8ub,
    SM3_256 = 0x02,
    SM2_256 = 0x12,
    SM4_128 = 0x22,
    HMAC_SM3 = 0x43,
    # ...  其他算法
)

# 许可证单元基本结构
LicenseUnit = Struct(
    "tag" / UnitTagEnum,
    "index" / Int8ub,
    "length" / Int16ub,
    # ... 根据 tag 解析不同的数据结构
)

# 完整许可证结构
LicenseStruct = Struct(
    "LicenseIndex" / LicenseUnit,
    "BaseUnits" / Array(... ),
    "DigitalSignature" / LicenseUnit,
)
```

##### 4.3.11 处理流程伪代码

```
def ProcessLicenseResponse(license_data:  bytes):
    # 1. 解析许可证结构
    lic = LicenseStruct.parse(license_data)

    # 2. 提取基本信息
    LicenseID = base64.b64encode(lic.LicenseIndex. LicenseID).decode()
    DigitalSignature = lic.DigitalSignature

    # 3. 获取签名前的消息 (用于验签)
    msg = license_data.split(b'\xFF\x0D')[0]

    # 4. 遍历单元，处理密钥
    SessionKey = None
    CEKs = []
    ContentID = None

    for unit in lic.BaseUnits:
        if unit.tag == "ContentTag":
            ContentID = unit.ContentID. decode()

        elif unit.tag == "KeyTag":
            KeyType = unit.KeyType
            KeyData = unit.KeyData. hex()

            if KeyType == "SessionKey":
                # SM2 解密 SessionKey
                SessionKey = sm2_decrypt(KeyData)

            elif KeyType == "MACKey":
                # SM2 解密 MACKey
                MACKey = sm2_decrypt(KeyData)
                # 验证签名
                expected_sig = hmac_sm3(MACKey, msg)
                assert expected_sig == DigitalSignature.Signature

            elif KeyType == "ContentEncryptionKey":
                # 先收集，等 SessionKey 解密后再处理
                CEKs.append(unit)

    # 5. 用 SessionKey 解密所有 CEK
    decrypted_CEKs = []
    for cek_unit in CEKs:
        cek = sm4_ecb_decrypt(SessionKey, cek_unit. KeyData)
        decrypted_CEKs.append({
            "KeyIdentifier": cek_unit.KeyIdentifier,
            "CEK": cek
        })

    return {
        "LicenseID":  LicenseID,
        "ContentID": ContentID,
        "CEKs": decrypted_CEKs
    }
```

---

#### 4.4 python实现一些坑

在实现过程中，可能会遇到以下坑：
sm2签名是sm2\_with\_sm3，如果用的gmssl
set\_sm2\_crypt函数时，注意传入的私钥和公钥是hex编码的字符串，而不是bytes
而且必须同时传入私钥和公钥，否则会出错，mode参数设置为1

```
sm2_crypt=sm2.CryptSM2(
public_key=public_key, private_key=private_key,mode=1)
```

sm4\_decrypt\_ecb是nopadding模式的
padding\_mode必须传，而且传空,不然默认的padding\_mode是PKCS7，会报错

```
crypt_sm4 = sm4.CryptSM4(padding_mode=""")
crypt_sm4.set_key(session_key, sm4.SM4_DECRYPT)
```

sm2\_decrypt是密文第一个字节是0x04，需要去掉

```
def sm2_decrypt(cipher_hex) -> bytes:
  if cipher_hex.startswith('04'):
    cipher_hex = cipher_hex[2:]
  cipher_bytes = bytes.fromhex(cipher_hex)
  plain_bytes = sm2_crypt.decrypt(cipher_bytes)
  return plain_bytes
```

#### 4.5 完整 License 流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    License 完整数据流                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client                                    Server               │
│    │                                          │                 │
│    │  准备数据 (来自 Provision)                 │                 │
│    │  ├─ deviceID                             │                 │
│    │  ├─ DevPrK (SM2 私钥)                     │                 │
│    │  └─ certificateChain                      │                 │
│    │                                          │                 │
│    │  1. GetLicenseRequest()                  │                 │
│    │     ├─ 构造请求 JSON                       │                 │
│    │     ├─ contentIDs Base64 编码             │                 │
│    │     └─ SM2 签名 (DevPrK)                  │                 │
│    │                                          │                 │
│    │ ──── POST /cau_v2/GetLicense ─────────>  │                 │
│    │                                          │                 │
│    │                                          │  2. 验证请求     │
│    │                                          │  3. 生成许可证   │
│    │                                          │  4. 加密密钥     │
│    │                                          │                 │
│    │ <─────── JSON Response ───────────────── │                 │
│    │          {                               │                 │
│    │            "protectedLicenses": ".. .",  │                 │
│    │            ...                           │                 │
│    │          }                               │                 │
│    │                                          │                 │
│    │  5. ProcessLicenseResponse()             │                 │
│    │     ├─ 解析 License 结构                   │                 │
│    │     ├─ SM2 解密 SessionKey                │                 │
│    │     ├─ SM2 解密 MACKey                    │                 │
│    │     ├─ HMAC-SM3 验签                      │                 │
│    │     └─ SM4-ECB 解密 CEK                   │                 │
│    │                                          │                 │
│    ▼                                          │                 │
│  ┌────────────────────────────────────┐       │                 │
│  │ 解密结果                            │       │                 │
│  │ ├─ LicenseID                       │       │                 │
│  │ ├─ ContentID                       │       │                 │
│  │ └─ CEK (内容加密密钥)                │       │                 │
│  └────────────────────────────────────┘       │                 │
│         │                                     │                 │
│         ▼                                     │                 │
│  ┌────────────────────────────────────┐       │                 │
│  │ SM4-CBC 解密视频流                   │       │                 │
│  │ Key = CEK                          │       │                 │
│  └────────────────────────────────────┘       │                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 五、DecryptNalUnit

#### 5.1 概述

这一部分是视频流的实际解密环节。个人感觉这部分太复杂了，涉及到修改解码器。

> **参考实现**：
>
> * FFmpeg 实现：<https://github.com/kantv-ai/FFmpeg/blob/8187ebd253021a54420eea9f3dd8e15790c0da9d/libavutil/hlsdecryptor.c>
> * 更方便的方案是直接写一个解复用器，这样不用重新编译 FFmpeg，可参考优酷开源的解密实现：<https://github.com/alibaba/CicadaPlayer/blob/release/0.4.4/framework/demuxer/sample_decrypt/sampleDecryptDec.c>

#### 5.2 核心流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    DecryptNalUnit 流程                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────┐                         │
│  │ License 阶段获取的数据                │                         │
│  │ └─ CEKs[] (多个内容加密密钥)          │                         │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ▼                                                       │
│  ┌────────────────────────────────────┐                         │
│  │ 解析 CEI 单元 (加密信息)              │                         │
│  │ ├─ KID (密钥标识符)                  │                         │
│  │ └─ IV  (初始化向量)                  │                         │
│  └────────────────────────────────────┘                         │
│         │                                                       │
│         ├─────────────────────────────────┐                     │
│         ▼                                 ▼                     │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │ 根据 KID 选择     │           │ 使用 CEI 中的     │            │
│  │ 对应的 CEK       │            │ IV 作为解密 IV   │             │
│  └─────────────────┘            └─────────────────┘             │
│         │                                 │                     │
│         └─────────────────┬───────────────┘                     │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │  SM4-CBC 解密    │                            │
│                  │  NAL Unit 数据   │                            │
│                  └─────────────────┘                            │
│                           │                                     │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │  解密后的视频流   │                            │
│                  └─────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 六、总结

总的来说不难，但工作量还是比较大的。
和同类型的sl2000、L3（android）等DRM方案相比，基本难度相当。
可能考虑到性能和适配，没有用白盒算法，混淆也不是很严重。
单纯拿key，直接hooksm4解密函数就行了，目前都是固定的。

#### 完整流程图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CDRM 解密完整流程                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        一、OpenSSL 符号还原                               │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                         │    │
│  │  1. 查找 OpenSSL 版本字符串 (如 "OpenSSL 1.1.1g")                          │    │
│  │  2. 下载对应版本源码并编译 ARM64 带符号版本                                   │    │
│  │  3. 利用 ERR_put_error 参数唯一性提取符号映射                                │    │
│  │  4. 在去符号文件中还原函数名                                                │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        二、Frida Hook 调试                               │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                         │    │
│  │  1. 编译辅助 DLL 封装复杂结构体解析函数                                      │    │
│  │  2. 利用导出函数计算非导出函数的实际地址                                      │    │
│  │  3. Hook EVP_CipherInit_ex、ECDSA_sign 等关键函数                         │    │
│  │  4. 打印加密参数和密钥信息                                                  │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        三、Provision 设备注册                             │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                         │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐         │    │
│  │  │GetProvision │───>│   Server    │───>│ProcessProvision      │         │    │
│  │  │Request      │    │   Response  │    │Response              │         │    │
│  │  └─────────────┘    └─────────────┘    └──────────────────────┘         │    │
│  │         │                                         │                     │    │
│  │         │                                         ▼                     │    │
│  │         │                              ┌──────────────────────┐         │    │
│  │         │                              │ 多层解密:              │        │    │
│  │         │                              │ RSA-OAEP → AES-GCM   │         │    │
│  │         │                              │ → AES-GCM → AES-GCM  │         │    │
│  │         │                              └──────────────────────┘         │    │
│  │         │                                         │                     │    │
│  │         │                                         ▼                     │    │
│  │         │                              ┌──────────────────────┐         │    │
│  │         │                              │ 输出:                 │         │    │
│  │         │                              │ ├─ deviceID          │         │    │
│  │         │                              │ ├─ DevPrK (私钥)      │         │    │
│  │         │                              │ ├─ DevPubK (公钥)     │         │    │
│  │         │                              │ └─ certificateChain   │         │    │
│  │         │                              └──────────────────────┘         │    │
│  │         │                                         │                     │    │
│  │         ▼                                         ▼                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐        │    │
│  │  │ 保存到本地 certchain. data                                    │        │    │
│  │  │ AES-ECB(key_seed) + SM4-ECB(ProvisionResponse)              │        │    │
│  │  └─────────────────────────────────────────────────────────────┘        │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        四、License 许可证获取                             │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                         │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐         │    │
│  │  │GetLicense   │───>│   Server    │───>│ProcessLicense        │         │    │
│  │  │Request      │    │   Response  │    │Response              │         │    │
│  │  └─────────────┘    └─────────────┘    └──────────────────────┘         │    │
│  │         │                                         │                     │    │
│  │         │ SM2 签名                                 │                     │    │
│  │         │ (DevPrK)                                ▼                     │    │
│  │         │                              ┌──────────────────────┐         │    │
│  │         │                              │ 解析 License 结构:     │        │    │
│  │         │                              │ ├─ SM2 解密 SessionKey│        │    │
│  │         │                              │ ├─ SM2 解密 MACKey    │        │    │
│  │         │                              │ ├─ HMAC-SM3 验签      │        │    │
│  │         │                              │ └─ SM4-ECB 解密 CEK   │        │    │
│  │         │                              └──────────────────────┘        │    │
│  │         │                                         │                    │    │
│  │         │                                         ▼                    │    │
│  │         │                              ┌──────────────────────┐        │    │
│  │         │                              │ 输出:                 │        │    │
│  │         │                              │ ├─ LicenseID         │        │    │
│  │         │                              │ ├─ ContentID         │        │    │
│  │         │                              │ └─ CEKs[] (多个)      │        │    │
│  │         │                              └──────────────────────┘         │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        五、DecryptNalUnit 视频解密                        │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                         │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐         │    │
│  │  │ 解析 CEI    │───>│ 选择 CEK    │───>│ SM4-CBC 解密           │         │    │
│  │  │ 获取 KID/IV │    │ (根据 KID)  │    │ NAL Unit              │         │    │
│  │  └─────────────┘    └─────────────┘    └──────────────────────┘         │    │
│  │                                                   │                     │    │
│  │                                                   ▼                     │    │
│  │                                        ┌──────────────────────┐         │    │
│  │                                        │ 解密后的视频流          │        │    │
│  │                                        └──────────────────────┘         │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```
