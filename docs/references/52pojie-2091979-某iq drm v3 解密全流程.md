# 某iq drm v3 解密全流程

> **作者**: 我是不会改名的 | **发布时间**: 2026-02-13 22:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3727 / 15
> **原文**: [https://www.52pojie.cn/thread-2091979-1-1.html](https://www.52pojie.cn/thread-2091979-1-1.html)

---

[ 本帖最后由 我是不会改名的 于 2026-2-13 22:51 编辑 ]

需要强调的是，本文的研究内容仅用于学术和教育目的。任何未经授权解密或分发受保护内容的行为可能违反版权法和相关法律法规。研究人员应当遵守相关法律，尊重内容创作者的知识产权。

## iq drm v3解密全流程

很久之前写的了，最近git上开源了很多，都有现成的了，那就简单分享一下。

### vf

某网站wasm md5简单分析https://www.52pojie.cn/thread-1836908-1-1.html  这篇文章已经提到一种方式，主要是js比较方便，app实现起来比较麻烦。

上面已经提到了，md5是标准的，只不过加了盐，所以需要把盐找到。

刚好写这篇文章的时候，奥本海默上映了，就想到原子弹的基本原理。只需要一个中子轰击U原子，就可以生成三个中子，中子在继续轰击，达到一定程度就可以在持续下去，最终释放巨大能量。

![](https://attach.52pojie.cn/forum/202602/13/222755cjlnbzej3v2l2jze.png)

在看看MD5流程，以CryptoJS.md5为例，传入dash ，先初始化，然后将字符串转为word

![](https://attach.52pojie.cn/forum/202602/13/222758qv7euouhu0m60mvm.png)

其次填充数据

![](https://attach.52pojie.cn/forum/202602/13/222800y35vauu5r3hv73ia.png)

然后进行运算

![](https://attach.52pojie.cn/forum/202602/13/222802eegr4dyae7obfx4r.png)

在这个过程中，最小的运算单元是一个 word（4 个字节），而我们传入的数据长度往往不是 4 的倍数。
利用这个特性：第一次传入 4 个字节：运算区块包含 4 字节输入 + 4 字节盐 + 4 字节盐...第二次传入 6 个字节：运算区块包含 4 字节输入 + (2 字节输入+2 字节盐) + 4 字节盐.

```
def srt_2_dword(s: bytes):
    s += b"abcdefgh"
    d = []
    s += b'\x00' *(len(s) % 4)
    for i in range(0, len(s), 4):
        d.append(hex(struct.unpack('<I', s[i:i + 4])[0]))
    return d

if __name__ == '__main__':
    datas = b"1234"
    d = srt_2_dword(datas)
    print(d)
    datas2 = b"123456"
    d2 = srt_2_dword(datas2)
    print(d2)
```

![](https://attach.52pojie.cn/forum/202602/13/222804hyskysy4t99vjssm.png)

通过这种错位，只需要 Hook 两次指令或内存读取，就能逆推出盐值。
以iq TV版为例  <https://apkpure.com/cn/iqiyi-video-for-tv-dramas-movies/com.iqiyi.i18n.tv/download>

在 里面 libmcto\_media\_player.so （其他 so里面也有，都是一样的）（APP TV IQ app都是一样的 只是需要注意TV的 "qd\_v": "1" ）

根据关键词vf=很容易定位到4D36E，大致长这样

![](https://attach.52pojie.cn/forum/202602/13/222806xrv23a0izvc7zkqh.png)

简单hook 一下

```
var libmcto_media_player ="libmcto_media_player.so";
var libmcto_media_player_addr = Module.findBaseAddress(libmcto_media_player);
var addr = libmcto_media_player_addr.add(0x4D36E8+1);
Interceptor.attach(addr, {
    onEnter: function(args) {
        console.log("libmcto_media_player.so - string", args[0].readCString());
    },
    onLeave: function(retval) {
        console.log("libmcto_media_player.so - retval", retval.readCString());
    }
});
```

![](https://attach.52pojie.cn/forum/202602/13/222809ottemctge2t5lclw.png)

然后用unibdg跑一下

```
package com.iq;

import com.github.unidbg.AndroidEmulator;
import com.github.unidbg.Module;
import com.github.unidbg.linux.android.AndroidEmulatorBuilder;
import com.github.unidbg.linux.android.AndroidResolver;
import com.github.unidbg.linux.android.dvm.AbstractJni;
import com.github.unidbg.linux.android.dvm.DalvikModule;
import com.github.unidbg.linux.android.dvm.VM;
import com.github.unidbg.memory.Memory;
import com.github.unidbg.pointer.UnidbgPointer;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Paths;

public class VF extends AbstractJni {
    private static AndroidEmulator emulator = null;
    private static VM vm = null;
    private static Module module = null;

    VF() {
        emulator = AndroidEmulatorBuilder.for32Bit()
                .build();
        Memory memory = emulator.getMemory();
        memory.setLibraryResolver(new AndroidResolver(23));
        vm = emulator.createDalvikVM(new File("unidbg-android/src/main/resources/android/apk/iQIYI Video.apk"));
        DalvikModule dm = vm.loadLibrary("mcto_media_player", false);
        module = dm.getModule();
        String traceWFile = "unidbg-android/src/test/java/com/iq/tracewrite.txt";
        PrintStream traceWStream;
        try {
            traceWStream = new PrintStream(Files.newOutputStream(Paths.get(traceWFile)), true);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        emulator.traceWrite().setRedirect(traceWStream);
    }

    public static void main(String[] args) throws Exception {
        VF vf = new VF();
        System.out.println("getVf");
        vf.getVf("/dash?");//自行修改
    }

    public String getVf(String s) {
        Number pointer = module.callFunction(emulator, 0x4D36E8 + 1, s);
        UnidbgPointer ret = UnidbgPointer.pointer(emulator, pointer.intValue() & 0xffffffffL);
        String string = ret.getString(0);
        System.out.println("vf: " + string);
        return "getVm";
    }
}
```

![](https://attach.52pojie.cn/forum/202602/13/222811qu914zq4bgo4vk1q.png)

直接就能跑，结果也能对上，那么直接修改输入，运行两次。

分别传入 /dashaaa /dasha

```
    vf.getVf("/dasha");
    vf.getVf("/dashaaa");
}
```

根据上面的推论开始实践

目前已知

```
['0x7361642f', '0x61616168']
['0x7361642f', '0x****6168']
```

那么直接搜索0x....6168,

![](https://attach.52pojie.cn/forum/202602/13/222813p6nsg6an6mcmvnzu.png)

现在就知道

```
['0x7361642f', '0x61616168','0x....316f']
['0x7361642f', '0x316f6168']
```

再在另一个文件里面搜索

![](https://attach.52pojie.cn/forum/202602/13/222815vufvgtuwyfxyuuvd.png)

又进一步，可以说和原子弹的原理，不能说一模一样，只能说是完全不一样

```
['0x7361642f', '0x61616168','0x6d63316f']
['0x7361642f', '0x316f6168','0x....6d63']
```

就这样一直推，直到搜不到，直接尝试搜索0x....,如果没有多半出错了

![](https://attach.52pojie.cn/forum/202602/13/222817ep2wx85hx2l2z2tk.png)

### ticket解密

获取key就需要解密ticket，目前我看到有两个版本，3和5，响应里面有写"licenseVersion":"5|3",3和都能用，解密后结果都一样。

解密ticket同样在这里面，不过不建议分析这个so，在libmonalisa.so这里，函数monalisa\_set\_license        000052D8

首先是新建结构体，然后解析

```
  v10 = license_alloc();
  v11 = license_parse(v10, license_base64ed, license_base64ed_len);
```

然后base64，解析结构体

```
  simple_base64_decode((unsigned __int8 *)dst, 0x1000, &olen, license_base64ed, license_base64ed_len);
  v4 = (unsigned __int16 *)calloc(1u, 0xCu);
  *(_DWORD *)v4 = 0xFFFFFFFF;
  *((_DWORD *)v4 + 1) = 0xFFFFFFFF;
  v5 = calloc(0x1000u, 1u);
  v6 = olen;
  v7 = v5;
  *((_DWORD *)v4 + 2) = v5;
  if ( v6 > 4 )
```

这里是自定义的 TLV (Type-Length-Value) 结构。用 Go 语言重写解析逻辑非常清晰：第 1 个字节是 Type，第 3、4 字节是 Data Length。

```
func licenseReadUnit(lunit *LicenseUnit, buf []byte, bufPos int, bufLen int) int {
    if bufLen <= 4 {
       return 0
    }

    lunit.Type = uint16(buf[bufPos])
    lunit.Index = uint16(buf[bufPos+1])
    dataSize := uint32(buf[bufPos+2])<<8 + uint32(buf[bufPos+3])
    lunit.DataSize = dataSize

    if bufLen < int(dataSize)+4 {
       return 0
    }

    lunit.Data = make([]byte, dataSize)
    copy(lunit.Data, buf[bufPos+4:bufPos+4+int(dataSize)])

    return int(dataSize) + 4
}
```

按照不同 Type 映射数据（提取 Version、Uid、CkeyCipherData、KekData 等）：

```
for {
    unit = &LicenseUnit{}
    i := licenseReadUnit(unit, licenseBinary, licenseBinaryPos, certLength)
    if i <= 3 {
       break
    }
    typeVal = unit.Type
    switch typeVal {
    case 0:
       l.Version = unit.Data[0]
    case 1:
       l.UidData = append([]byte{}, unit.Data[1:unit.DataSize]...)
       l.UidSize = int(unit.DataSize - 1)
    case 2:
       data := unit.Data
       if data[0] == 1 {
          l.UidData = append([]byte{}, data[1:unit.DataSize]...)
          l.UidSize = int(unit.DataSize - 1)
       }
    case 3:
       data := unit.Data
       v10 := int(data[0])
       v11 := int(data[1])<<8 + int(data[2])
       v12 := int(data[v11+3])
       if v12 == 1 {
          l.CkeyCipherSize = v11
          l.CkeyCipherData = append([]byte{}, data[3:v11+3]...)
          if v10 != 1 {
             continue
          }
          l.CkeySize = 32
       } else if v12 == 2 {
          l.KekSize = v11
          l.KekData = append([]byte{}, data[3:v11+3]...)
       }
    case 255:
       v14 := unit.Data
       certLengtha := int(v14[1])
       v16 := int(v14[certLengtha+2])
       v17 := int(v14[certLengtha+3])

       if v14[0] == 1 {
          hashCalculated := sha256.Sum256(licenseBinary[:licenseBinaryPos])
          hashInLicense := append([]byte{}, v14[certLengtha+4:certLengtha+4+(v16<<8)+v17]...)
          v15 := bytesEqual(hashCalculated[:], hashInLicense)
          if !v15 {
             return 1, nil
          }
       }
    }
    licenseBinaryPos += i
    certLength -= i
}
```

然后aes解密

```
l.CkeyData, err = aesDec(l.CkeyCipherData, l.KekData)//        iv := "0000000000000000"
```

最核心的部分是基于 VMP（虚拟机保护）的白盒 AES (DCM)。这实际上是标准的 CTR 模式配合 XOR 操作。
这里选择的dcm，实际上就是解密ctr加异或
![](https://attach.52pojie.cn/forum/202602/13/222819jq1qxqq5mefufeee.png)

常规做法肯定直接dfa，但是呢他这里的ctr，key和iv是写死的，
根据ctr模式特点，只需要拿到一组明文和一组密文异或。再那密文和上述结果异或就拿到key了。

![](https://attach.52pojie.cn/forum/202602/13/222821ipa7zhjib66kxh3k.png)

这里的key就是解密ts的key了
这里贴几张图感兴趣的自己分析

sub\_9298

![](https://attach.52pojie.cn/forum/202602/13/222823cq7h2h0llv4bzhb7.png)

sub\_8F08

![](https://attach.52pojie.cn/forum/202602/13/222826o9zi76od9e00d99e.png)

sub\_9988

![](https://attach.52pojie.cn/forum/202602/13/222828g5awz2a8856b1ava.png)

vm\_call\_func\_by\_id(vm, func\_id, argcount, args, rv, 0);

sub\_9ADC

![](https://attach.52pojie.cn/forum/202602/13/222830jk33l3l6ehroro48.png)

### TS

对应函数

```
int __fastcall monalisa_decrypt_data(
void *monalisa_ctx,
unsigned __int8 *out_buf_ptr,
uint32_t *out_buf_size,
const unsigned __int8 *in_buf_ptr,
int in_buf_size,
int in_buf_format)
```

先解析ts,提取pes,sdt等
拿到其中的service\_name

然后就是解析它
mdcm|s1:9:10|a0|vd70b0e7a262f4cc52b667901eb2e8b9d|e1|f497006|
按|分割
m 后面是加密模式
s 后面1：9：10 表示十次一轮，一次ctr，9次异或
a 后面0表示只加密关键帧
v 后面 1-25 + "00000001"ctr的iv
其余的没啥用，通样在一个so里面，函数如下

```
int __fastcall parse_cipher_mode(mtsEncArgs *decrypt_info, const unsigned __int8 *service_str, unsigned __int8 *key)
{
  if ( key )
    qmemcpy(decrypt_info->key, key, sizeof(decrypt_info->key));
  v5 = strlen((const char *)service_str);
  v6 = (char *)calloc(1u, v5 + 1);
  strcpy(v6, (const char *)service_str);
  v7 = 0;
  v31 = decrypt_info;
  if ( v5 >= 1 )
  {
    iv = decrypt_info->iv;
    v9 = 0;
    v10 = 0;
    dst = iv;
    v28 = service_str;
    while ( 1 )
    {
      while ( 1 )
      {
        v11 = (unsigned __int8)v6[v10] - 97;
        if ( (unsigned __int8)v11 <= 0x19u )
          break;
LABEL_15:
        v10 = strlen((const char *)service_str);
LABEL_7:
        if ( v5 <= v10 )
          goto LABEL_37;
      }
      v12 = &v6[v10];
      v13 = &v6[v10 + 1];
      if ( *v13 == 124 )
      {
        v14 = 2;
        v15 = &v6[v10 + 1];
      }
      else
      {
        v16 = 0;
        do
          v17 = &v12[v16++];
        while ( v17[2] != 124 );
        v15 = &v12[v16 + 1];
        v14 = v16 + 2;
      }
      *v15 = 0;
      v10 += v14;
      switch ( v11 )
      {
        case '\0':
          ++v9;
          v31->isKeyframesOnly = atoi(v13) != 0;
          if ( v5 > v10 )
            continue;
          goto LABEL_37;
        case '\x04':
          goto LABEL_7;
        case '\f':
          if ( !strcmp(v13, (const char *)sub_5948) )
          {
            v18 = 1;
          }
          else
          {
            if ( strcmp(v13, (const char *)&loc_594C) )
              goto LABEL_7;
            v18 = 0;
          }
          ++v9;
          v31->cryptoMode = v18;
          if ( v5 <= v10 )
            goto LABEL_37;
          continue;
        case '\x12':
          v30 = v9;
          v19 = strlen(v13);
          v20 = (char *)calloc(1u, v19 + 1);
          strcpy(v20, v13);
          v21 = strchr(v20, 58);
          if ( !v21 )
            goto LABEL_25;
          *v21 = 0;
          v22 = v21 + 1;
          v23 = atoi(v20);
          v31->dcmCryptoBlks = v23;
          if ( v23 <= 0 )
            goto LABEL_25;
          v24 = strchr(v22, 58);
          if ( v24
            && (*v24 = 0,
                v31->dcmXorBlks = atoi(v22),
                v25 = atoi(v24 + 1),
                v31->dcmTotalRounds = v25,
                (unsigned int)(v25 - 2) < 9) )
          {
            free(v20);
            service_str = v28;
            v9 = v30 + 1;
            if ( v5 <= v10 )
              goto LABEL_37;
          }
          else
          {
LABEL_25:
            free(v20);
            service_str = v28;
            v9 = v30;
            if ( v5 <= v10 )
              goto LABEL_37;
          }
          break;
        case '\x15':
          if ( ost_hexstring_to_binary(dst, 0x10u, (unsigned __int8 *)v13) == 16 )
            ++v9;
          if ( v5 > v10 )
            continue;
          goto LABEL_37;
        default:
          goto LABEL_15;
      }
    }
  }
  v9 = 0;
LABEL_37:
  free(v6);
  v26 = 0xFFFF;
  if ( !v31->cryptoMode )
    v26 = 3;
  if ( v31->cryptoMode == 1 )
    v26 = 4;
  if ( v9 != v26 )
    return -1;
  return v7;
}
```

然后就是提取出pes，判断是视频就解密，音频不用，然后遍历所有nal类型，目前是全加密了

提取出nal内容后
先nal\_unescape
然后进行crc效验，最后两位用于效验

```
if (crc16(buffer, size - 2) != *(uint16_t *) (buffer + size - 2)) {
    return 0;
}
```

然后就是dcm解密

按16字节分组，根据前面解析出的进行轮换，目前全是1次ctr然后9次与计数器（iv）异或

```
int32_t dcm_block(uint8_t *in, int32_t len, uint8_t *iv, uint8_t *key,int32_t) {
    int32_t xorBlksInCycl = 9;
    int32_t numOfTotalRounds = 10;
    uint8_t state[0x10];
    uint8_t xord[0x10];
    uint8_t dec_len = 0;
    struct AVAESCTR *aes_ctr = av_aes_ctr_alloc();
    av_aes_ctr_init(aes_ctr, key);
    av_aes_ctr_set_full_iv(aes_ctr, iv);
    do {
        dec_len = len;
        if (len >= 0x10) {
            dec_len = 0x10;
        }
        if (len <= 0x10 || numOfTotalRounds > xorBlksInCycl) {
            av_aes_ctr_crypt(aes_ctr, in, in, dec_len);
        } else {
            memcpy(xord,aes_ctr->counter,0x10);
            for (int32_t i = 0; i < dec_len; i++) {
                xord[i] ^= in[i];
            }
            addOne(aes_ctr->counter,0x10);
            memcpy(in, xord, dec_len);
        }
        in += dec_len;
        len -= dec_len;
        numOfTotalRounds--;
        if (numOfTotalRounds == 0) {
            numOfTotalRounds = 10;
        }
    } while (len > 0);
    return 1;

}
```

然后效验解密后的nal

```
if (crc16(buffer, size - 2) != *(uint16_t *) (buffer + size - 2)) {
    return 0;
}
*pInt = size - 2;
memcpy(buffer1, buffer, *pInt);
int32_t ret2 = dcm_block(buffer1, *pInt, iv, key);
if (ret2 != 1) {
    return 0;
}
if (crc16(buffer1, *pInt-2) != *(uint16_t *) (buffer1 + *pInt - 2)) {
        return 0;
}
return 1;
```

然后重新组包就行了。

### 利用ffmpeg，重封装解密

将这套逻辑直接挂载到 FFmpeg 的底层处理流中是最高效的做法。参考 FFmpeg 官方示例 doc/examples/remuxing.c。直接在循环 av\_read\_frame(ifmt\_ctx, pkt) 截获 pkt 即可拿到 PES 包：pkt->data -> 包含底层视频 ES 数据pkt->size -> 数据长度视频 ES 数据位于该 buffer 中，后续对其进行解密。
然后就是获取解密的iv，需要注意的是如果直接传的m3u8链接的话
ifmt\_ctx指向的hls，而数据在ts里面，需要获取内部 TS 的 format context：

HLSContext
└── playlists[]
└── ifmt\_ctx  (真实 TS)
HLSContext需要自己从ffmpeg的源码里面找，ffmpeg的版本不同，结构体可能也不太一样，自己找一下就行了。

```
    if (!strcmp(ifmt_ctx->iformat->name, "hls")) {
        HLSContext *avt = ifmt_ctx->priv_data;
        p_metadata(avt->playlists[0]->ifmt_ctx,c)
    }
    static int  p_metadata(AVFormatContext *ctx,DRMInfo *cenc_info) {
        if (ctx->nb_programs > 0) {
        for (int i = 0; i < ctx->nb_programs; i++) {
            AVProgram *p = ctx->programs[i];
            AVDictionaryEntry *tag;
            av_log(NULL, AV_LOG_INFO, "Program %d has %d streams\n", i, p->nb_stream_indexes);
            while ((tag = av_dict_get(p->metadata, "", tag, AV_DICT_IGNORE_SUFFIX))) {
                av_log(NULL, AV_LOG_INFO, " Program metadata: %s=%s\n", tag->key, tag->value);
                if (!strcmp(tag->key, "service_name")) {
                    if (strncmp(tag->value, "mdcm", 4) == 0) {
                        cenc_info->drm_type = DRM_TYPE_IQIYI;
                        char *service_name_copy = av_strdup(tag->value);
                        if (!service_name_copy) {;
                            av_log(NULL, AV_LOG_ERROR, "Failed to allocate memory for service_name_copy\n");
                            continue;
                        }
                        char *saveptr = NULL;
                        char *token = strtok_r(service_name_copy, "|", &saveptr);
                        while (token != NULL) {
                            if (token[0] == 'v' && strlen(token) == 33) {
                                char *key_str = token + 1;
                                if (cenc_info) {
                                    if (ff_hex_to_data(cenc_info->iv, key_str) >= 0) {
                                        memset(cenc_info->iv + 12, 0, 3);
                                        cenc_info->iv[15] = 1;
                                        cenc_info->has_key = 1;
                                        av_log(NULL, AV_LOG_DEBUG, "Extracted IQIYI IV: %s\n", key_str);
                                    }
                                }
                                break;
                            }
                            token = strtok_r(NULL, "|", &saveptr);
                        }
                        av_free(service_name_copy);
                    }
                }

            }
        }
    }

}
```

后面就很简单了，解密pkt->data就行了，还是上面的流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. 校验入参 (cenc_info, data, size, iv 等)               │
│ 2. 分配临时缓冲区 temp_buf 存放最终数据                     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼ (Loop 循环查找)
┌─────────────────────────────────────────────────────────┐
│ 3. 从 PES 中查找 NAL 单元 (cgts_find_nal_unit)             │
│    起始码: 00 00 01 / 00 00 00 01                       │
│    获取 NAL 起始与结束地址: nalu_start ~ nalu_end          │
└────────────────────────────┬────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
     未找到 NAL 单元                       找到 NAL 单元
          │                                     │
          ▼                                     ▼
┌──────────────────────┐  ┌──────────────────────────────────────────┐
│ 结束循环，将 temp_buf  │  │ 4. 根据编码类型 (H264/HEVC) 获取 NAL头长    │
│ 中的数据覆写回原 data   │  │ 5. 将 NAL Header 明文拷贝至 temp_buf       │
└──────────────────────┘  │    (NAL 头不参与解密)                      │
                          └─────────────────────┬────────────────────┘
                                                │
                                                ▼
                          ┌──────────────────────────────────────────┐
                          │ 6. 提取待解密的 Payload (减去头长度)        │
                          │    若 Payload 长度 <= 0 则直接跳到下个NAL   │
                          └─────────────────────┬────────────────────┘
                                                │
                                                ▼
                          ┌──────────────────────────────────────────┐
                          │ 7. 去除防竞争字节 00 00 03 (nalUnescape)   │
                          │    提取转义后的密文数据                     │
                          └─────────────────────┬────────────────────┘
                                                │
                                                ▼ (monalisa_decrypt_data)
                          ┌──────────────────────────────────────────┐
                          │ 8. 提取密文尾部 2 字节作为 Expected CRC     │
                          │    对剩余密文计算 CRC16 校验值              │
                          └─────────────────────┬────────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │  CRC16 是否匹配?  │
                                      └────┬────────┬────┘
                                           │        │
                                         否│        │是
                                           ▼        ▼
                                      ┌────────┐ ┌───────────────────────────┐
                                      │解密失败 │ │ 9. 分块解密 (dcm_block)     │
                                      └────────┘ │  - 10 轮为一个循环周期       │
                                                 │  - 交替使用 AES-CTR 与 XOR  │
                                                 └──────────┬────────────────┘
                                                            │
                                                            ▼
                                                 ┌───────────────────────────┐
                                                 │ 10. 解密后二次 CRC 校验     │
                                                 │     (长度 > 2 时触发)       │
                                                 └──────────┬────────────────┘
                                                            │
                                         ┌──────────────────┴──────────────────┐
                                       校验失败                              校验成功
                                         │                                     │
                                         ▼                                     ▼
                                      ┌────────┐                 ┌───────────────────────────┐
                                      │解密失败 │                 │ 11. 将解密后的 Payload 拷   │
                                      └────────┘                 │     贝并追加到 temp_buf     │
                                                                 └─────────────┬─────────────┘
                                                                               │
                                                                               ▼
                                                        (跳回步骤 3，更新 payload_pos 继续处理下一个 NAL)
```
