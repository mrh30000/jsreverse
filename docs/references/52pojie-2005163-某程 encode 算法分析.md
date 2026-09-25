# 某程 encode 算法分析

> **作者**: Lychow | **发布时间**: 2025-02-10 19:48:00 | **版块**: 『移动安全区』 | **查看/回复**: 3033 / 8
> **原文**: [https://www.52pojie.cn/thread-2005163-1-1.html](https://www.52pojie.cn/thread-2005163-1-1.html)

---

*本帖最后由 Lychow 于 2025-2-11 09:52 编辑*

​ 样本与之前的魔改MD5是同一个so，就换了个方法，直接IDA梭哈

​ 第一个传参是明文，第二个传参是请求体的长度

![](https://attach.52pojie.cn/forum/202502/10/194613tihhagggflfzaiml.png)

​

​ 代码逻辑很清晰了，将明文，明文长度和输出都传进了 ctrip\_enc

​ 直接进入 ctrip\_enc

![](https://attach.52pojie.cn/forum/202502/10/194547blsilliil5i8sbtf.png)

#### 填充模式

​ 这里可以看到他对明文长度进行了计算，将受影响的算法提取出来

```
  if ( (input_len & 0xF) != 0 )
    input_len_10 = (input_len + 16) & 0xFFFFFFF0;
  else
    input_len_10 = input_len + 16;
// ============================== //
  if ( (input_len & 0xF) != 0 )
    v8 = 16 - (input_len & 0xF);
  else
    v8 = 16;
//===============================//
input_ = (char *)malloc(input_len_10);
memcpy(input_, input, (unsigned int)input_len);
memset(&input_[input_len], v8, (unsigned int)(v8 - 1) + 1LL);
```

​ 如果明文长度是 16的倍数，就+16，如果不是16的倍数就+16再向下对齐到16的倍数

​ 然后如果明文长度是16的倍数，v8赋值为16，如果不是16的倍数就v8赋值为 16 - (input\_len & 0xF);

​ 再申请长度对齐后的空间，将明文 和 v8 都 赋值过去

​ 以上，其实他实际上就是实现标准的 AES 的 pkcs7 填充模式，没有进行魔改

​ 而后将 填充后的明文和长度，进入方法 ctrip\_enc\_internal

```
v10 = ctrip_enc_internal((__int64)input_, input_len_10, &v12, 16, output);
```

​ v12的值上面可以看到赋值是， v12 = xmmword\_112D4; 直接点过去

![](https://attach.52pojie.cn/forum/202502/10/194550oc9o5j96ankgzkzs.png)

​ 看着啥也不像，长度正好为 16，暂且将这个当做一个 IV 吧

#### encrypt\_one 生成真实key

​ 进入方法 ctrip\_enc\_internal

![](https://attach.52pojie.cn/forum/202502/10/194552pne7fc9el6uenlaj.png)

​

​ 一步步来，首先random\_key，就是通过时间生成随机数，得到一个随机key

​ 然后将随机key和上面的iv，v20 传入 encrypt\_one

​ 通过下面v20的方法调用发现 `aes_setkey_enc(CTX, v20, 0x80u);`

​ 那么大胆猜测 v20 就是真实key，随机数+iv 通过 encrypt\_one方法计算得出真实的aes key

​ 看一下关键的 encrypt\_one 方法

```
void __fastcall encrypt_one(_OWORD *randomkey, _OWORD *iv, unsigned __int8 **a3)
{
  // [COLLAPSED LOCAL DECLARATIONS. PRESS NUMPAD "+" TO EXPAND]

  aes_gen_tables();
  v6 = (unsigned __int8 *)malloc(0x10uLL);
  *a3 = v6;
  v7 = v6;
  *(_OWORD *)v6 = *randomkey;
  v8 = (int8x8_t *)malloc(0x10uLL);
  *(_OWORD *)v8->n64_u64 = *iv;
  sbox = get_sbox();
  v10 = v7[1];
  v11 = v7[2];
  v12 = v7[3];
  v13 = *(_BYTE *)(sbox + *v7);
  v14 = v7[4];
  v15 = v7[5];
  v16 = v7[6];
  *v7 = v13;
  LOBYTE(v10) = *(_BYTE *)(sbox + v10);
  v17 = v7[7];
  v18 = v7[8];
  v19 = v7[9];
  v7[1] = v10;
  LOBYTE(v11) = *(_BYTE *)(sbox + v11);
  v20 = v7[10];
  v21 = v7[11];
  v22 = v7[12];
  v7[2] = v11;
  LOBYTE(v12) = *(_BYTE *)(sbox + v12);
  v27.n64_u8[0] = v13;
  v23 = v7[13];
  v27.n64_u8[1] = v10;
  v7[3] = v12;
  LOBYTE(v14) = *(_BYTE *)(sbox + v14);
  v24 = v7[14];
  v27.n64_u8[2] = v11;
  v25 = v7[15];
  v7[4] = v14;
  LOBYTE(v15) = *(_BYTE *)(sbox + v15);
  v27.n64_u8[3] = v12;
  v27.n64_u8[4] = v14;
  v26 = 2;
  v7[5] = v15;
  LOBYTE(v16) = *(_BYTE *)(sbox + v16);
  v27.n64_u8[5] = v15;
  v7[6] = v16;
  LOBYTE(v17) = *(_BYTE *)(sbox + v17);
  v27.n64_u8[6] = v16;
  v7[7] = v17;
  LOBYTE(v18) = *(_BYTE *)(sbox + v18);
  v27.n64_u8[7] = v17;
  v7[8] = v18;
  LOBYTE(v19) = *(_BYTE *)(sbox + v19);
  v29.n64_u8[0] = v18;
  v7[9] = v19;
  LOBYTE(v20) = *(_BYTE *)(sbox + v20);
  v29.n64_u8[1] = v19;
  v7[10] = v20;
  LOBYTE(v21) = *(_BYTE *)(sbox + v21);
  v29.n64_u8[2] = v20;
  v7[11] = v21;
  v28 = *(_BYTE *)(sbox + v22);
  v29.n64_u8[3] = v21;
  v7[12] = v28;
  LOBYTE(v10) = *(_BYTE *)(sbox + v23);
  v29.n64_u8[4] = v28;
  v7[13] = v10;
  LOBYTE(v11) = *(_BYTE *)(sbox + v24);
  v29.n64_u8[5] = v10;
  v7[14] = v11;
  v29.n64_u8[6] = v11;
  v29.n64_u8[7] = *(_BYTE *)(sbox + v25);
  v7[15] = v29.n64_u8[7];
  while ( 1 )
  {
    v30 = veor_s8(v29, v8[1]).n64_u64[0];
    *(int8x8_t *)v7 = veor_s8(v27, (int8x8_t)v8->n64_u64[0]);
    *((_QWORD *)v7 + 1) = v30;
    row_rotation(v7, 4LL, 1LL);
    if ( !v26 )
      break;
    column_rotation(v8, 4LL, 1LL);
    v31 = get_sbox();
    v32 = v8->n64_u8[1];
    v27.n64_u64[0] = *(unsigned __int64 *)v7;
    v29.n64_u64[0] = *(_QWORD *)(v7 + 8);
    --v26;
    v8->n64_u8[0] = *(_BYTE *)(v31 + v8->n64_u8[0]);
    v33 = *(_BYTE *)(v31 + v32);
    v34 = v8->n64_u8[2];
    v8->n64_u8[1] = v33;
    v35 = *(_BYTE *)(v31 + v34);
    v36 = v8->n64_u8[3];
    v8->n64_u8[2] = v35;
    v37 = *(_BYTE *)(v31 + v36);
    v38 = v8->n64_u8[4];
    v8->n64_u8[3] = v37;
    v39 = *(_BYTE *)(v31 + v38);
    v40 = v8->n64_u8[5];
    v8->n64_u8[4] = v39;
    v41 = *(_BYTE *)(v31 + v40);
    v42 = v8->n64_u8[6];
    v8->n64_u8[5] = v41;
    v43 = *(_BYTE *)(v31 + v42);
    v44 = v8->n64_u8[7];
    v8->n64_u8[6] = v43;
    v45 = *(_BYTE *)(v31 + v44);
    v46 = v8[1].n64_u8[0];
    v8->n64_u8[7] = v45;
    v47 = *(_BYTE *)(v31 + v46);
    v48 = v8[1].n64_u8[1];
    v8[1].n64_u8[0] = v47;
    v49 = *(_BYTE *)(v31 + v48);
    v50 = v8[1].n64_u8[2];
    v8[1].n64_u8[1] = v49;
    v51 = *(_BYTE *)(v31 + v50);
    v52 = v8[1].n64_u8[3];
    v8[1].n64_u8[2] = v51;
    v53 = *(_BYTE *)(v31 + v52);
    v54 = v8[1].n64_u8[4];
    v8[1].n64_u8[3] = v53;
    v55 = *(_BYTE *)(v31 + v54);
    v56 = v8[1].n64_u8[5];
    v8[1].n64_u8[4] = v55;
    v57 = *(_BYTE *)(v31 + v56);
    v58 = v8[1].n64_u8[6];
    v8[1].n64_u8[5] = v57;
    v59 = *(_BYTE *)(v31 + v58);
    v60 = v8[1].n64_u8[7];
    v8[1].n64_u8[6] = v59;
    v8[1].n64_u8[7] = *(_BYTE *)(v31 + v60);
  }
  free(v8);
}
```

​ 代码量还是比较小的，而且没有加混淆，感觉好处理，那就一步步看

##### s盒替换

​ 首先调用 aes\_gen\_tables();，但是这个方法没有入参也没有返回，就当是初始化方法，暂时先不管，遇到了再回来看

```
v7= v6 = *randomkey;
v8->n64_u64 = *iv;
sbox = get_sbox();
```

​ 这里然后将randomkey赋值给了v7，iv赋值给了v8， 以及获取了sbox

```
char *get_fbox()
{
  aes_gen_tables();
  return &byte_1D090;
}
```

​ 点过去 byte\_1D090 发现没有值，那么aes\_gen\_tables 实际上就是为了给这个sbox赋值

![](https://attach.52pojie.cn/forum/202502/10/194554p9htlzslhzhmt9ii.png)

​

​ unidbg 看下返回结果

![](https://attach.52pojie.cn/forum/202502/10/194556xgfzs7czz4vrfcq4.png)

​ 对比标准的sbox

```
Sbox = (
    0x63, 0x7C, 0x77, 0x7B, 0xF2, 0x6B, 0x6F, 0xC5, 0x30, 0x01, 0x67, 0x2B, 0xFE, 0xD7, 0xAB, 0x76,
    0xCA, 0x82, 0xC9, 0x7D, 0xFA, 0x59, 0x47, 0xF0, 0xAD, 0xD4, 0xA2, 0xAF, 0x9C, 0xA4, 0x72, 0xC0,
    。。。。。。
)
```

​ 从头到尾，一个个对比过了，没毛病，一个字没动

​ 后面的代码非常长，而且有点不太好看逻辑

​ 但是如果我们细心观察，我们就可以发现，他的从v7中取值和赋值是可以 一 一对应上的

​ 将代码整理一下：

```
  v10 = v7[1];
  LOBYTE(v10) = *(_BYTE *)(sbox + v10);
  v11 = v7[2];
  LOBYTE(v11) = *(_BYTE *)(sbox + v11);
```

​ 不就是取值然后把取的值当成索引嘛，直接使用 java 进行还原

```
    private static void take_sbox(byte[] data) {
        for (int i = 0; i < data.length; i++) {
            int byte_data = data[i] & 0xFF;
            data[i] = SBOX[byte_data];
        }
    }
```

​ 所以，这个方法前面的那么大一串，实际上6行就能解决，实际上就是做了s盒替换

##### **行移位**+列混淆

​ 然后就进入了一个while循环

![](https://attach.52pojie.cn/forum/202502/10/194559fiatmczwqggapztt.png)

​

​ 里面其实就调用了两个方法

```
row_rotation(v7, 4LL, 1LL);
column_rotation(v8, 4LL, 1LL);
```

​ 至于后面的一大串代码就很熟悉了，get\_sbox()，v33 = *(\_BYTE* )(sbox\_1 + v32);

​ 就是上面刚说过的s盒替换，不过是这里换成了 iv 去替换

​ 现在的问题就是这个 row\_rotation 和 column\_rotation 到底做了啥

​ unidbg在 row\_rotation 执行前和执行后分别打印入参的值

![](https://attach.52pojie.cn/forum/202502/10/194602mw0mzofi9woqqmfi.png)

​ 可以发现值的变换情况

```
执行前：
D4 3F 8B 24 1A 5E 7E 9D 24 14 7E C6 49 7F DB 9E
执行后：
3F 8B 24 D4 7E 9D 1A 5E C6 24 14 7E 49 7F DB 9E
```

​ 注意观察不难发现，他是四个字节分组，然后第一组循环左移一位，第二组循环左移两位，第三组循环左移三位，第四组循环左移四位（等于没动）

​ 就是标准AES的 行移位

```
D4 3F 8B 24 ---> 3F 8B 24 D4 //左移一位
1A 5E 7E 9D ---> 7E 9D 1A 5E //左移两位
24 14 7E C6 ---> C6 24 14 7E //左移三位
49 7F DB 9E ---> 49 7F DB 9E //左移四位（等于没动）
```

​ java 还原，懒得写逻辑，直接强行换位

![](https://attach.52pojie.cn/forum/202502/10/194604iglrli4ss4ssqw4p.png)

​

​ ok，开始看那个列混淆

​ 同样unidbg打断点，查看执行前后的值

![](https://attach.52pojie.cn/forum/202502/10/194606kk50mllbgo05yr6c.png)

```
执行前：
C0 B4 07 51 A4 A2 62 B3 30 7E 3C 81 46 C5 F2 75
执行后：
A4 7E F2 51 30 C5 07 B3 46 B4 62 81 C0 A2 3C 75
```

​ 再次尝试找到规律

```
C0 B4 07 51     A4 7E F2 51
A4 A2 62 B3     30 C5 07 B3
30 7E 3C 81     46 B4 62 81
46 C5 F2 75     C0 A2 3C 75
```

![](https://attach.52pojie.cn/forum/202502/10/194608be6d8p6szqed5lq3.png)

​ 同样，直接 java写替换代码就行，不复杂

​ 然后执行了 --v26;，但是v26在前文中固定赋值 v26 = 2;

​ 所以会执行两次行 行移位+类混淆， sbox替换 IV

​ encrypt\_one 这就结束了，最后的结果就是真实的aes key

#### AES 校验

​ 前面说了，aes\_setkey\_enc(CTX, v20, 0x80u); 大胆猜测 v20是真实key

​ 既然加密方法是aes\_crypt\_cbc，那肯定还有IV

![](https://attach.52pojie.cn/forum/202502/10/194610tvooewbxquv9m4be.png)

​

​ 而方法传入都很明了，只有一个v22未知，那就v22基本就是IV了

​ IDA点过去查看v22的值

```
 xmmword_112C4   DCB 0x69, 0xD2, 0x55, 0xB8, 0x32, 0x9E, 0xAC, 0xD4, 0xC, 0x2A, 0x9C, 0x8B, 0x68, 0x75, 0x87, 5
```

​ 通过验证，是标准AES没有魔改，Key和IV也是对的

#### encrypt\_two 随机key插入密文

```
encrypt_two(input, input_len_10, (__int64)&randomkey, iv_len, output);
```

​ input 经过前面的AES加密后，已经变成了密文，所以这里传入的实际上是密文 + 密文长度 + 随机key（非真实key）+iv\_len+输出结果

​ encrypt\_two 方法就没有啥技巧了，也没有标准方法调用，里面就纯计算

​ 所以，老老实实还原咯

​ 众所周知 input\_len 最少都是16位的，所以直接刨去 `if ( (int)input_len < 1 )`和 `if ( input_len == 1 )`判断的部分

​ 代码段开始的部分应该在这里

```
  v10 = input_len & 0xFFFFFFFE;
  v12 = 0;
  v13 = 0;
  v14 = input + 1;
  v15 = v10;
  do
  {
    v16 = *(v14 - 1);
    v17 = *v14;
    v14 += 2;
    v15 -= 2LL;
    v12 += v16;
    v13 += v17;
  }
  while ( v15 );
```

​ v10 是 输入长度对齐到偶数长度，然后 v15=v10，并且每次循环-2直到等于0

​ 每次循环都依次往后取两位值，分别累加在v12和v13上

​ v10和v15 已经减到0，所以以下的判断全部跳过

```
  if ( v10 != input_len )
    goto LABEL_9;
LABEL_11:
  if ( ivlen < 1 )
    goto LABEL_19;
LABEL_12:
  if ( ivlen == 1 )
  {
    v21 = 0LL;
  }
  else
```

​ 然后开始执行对 randomKey 的操作

```
    v21 = ivlen & 0xFFFFFFFE;
    v22 = 0;
    v23 = (unsigned __int8 *)(randomkey + 1);
    v24 = v21;
    do
    {
      v25 = *(v23 - 1);
      v26 = *v23;
      v23 += 2;
      v24 -= 2LL;
      v11 += v25;
      v22 += v26;
    }
    while ( v24 );
```

​ 同理，和input的处理是一样的，每次循环都依次往后取两位值，分别累加在v11和v22上

```
*output = malloc((int)(ivlen + input_len));
result = memcpy(output, input, (int)input_len);
  if ( ivlen >= 1 )
  {
    v32 = 0LL;
    LODWORD(i) = 0;
    do
    {
      v34 = v32 + (int)input_len;
      v35 = *output;
      v36 = *(_BYTE *)(randomkey + v32);
      for ( i = ((int)i + v11) % (int)(v32 + input_len) + 1LL; v34 > i; *v37 = v38 )
      {
        v37 = (_BYTE *)(v35 + v34);
        v38 = *(_BYTE *)(v35 + v34-- - 1);
      }
      ++v32;
      *(_BYTE *)(v35 + i) = v36;
    }
    while ( v32 != ivlen );
  }
```

​ 首先为 output 申请 ivlen + input\_len 个长度的空间（这里应该是keylen）

​ 然后将 input 赋值给 output

​ 然后循环key\_len次，遍历randomKey 赋值给 v36

```
      for ( i = ((int)i + v11) % (int)(v32 + input_len) + 1LL; v34 > i; *v37 = v38 )
      {
        v37 = (_BYTE *)(v35 + v34);
        v38 = *(_BYTE *)(v35 + v34-- - 1);
      }
```

​ 这里v37 = v38，所以逻辑应该是移位，给后面的 `*(_BYTE *)(v35 + i) = v36;`腾出位置

​ 然后不断计算i值，将密钥插入进密文中，得到最后结果

#### 总结

1. 随机数生成随机key；
2. 随机key加上iv通过运算得到真实aes\_key;
3. 真实aes\_key+固定IV 进行AES CBC加密生成密文；
4. 最后将随机key通过运算插入到密文中。

​ 解密的话也很简单，从密文中抽取随机key出来，然后通过encryptOne与IV计算得到真实AES\_KEY，再加上另一个固定IV通过 AES CBC解密得到明文。
