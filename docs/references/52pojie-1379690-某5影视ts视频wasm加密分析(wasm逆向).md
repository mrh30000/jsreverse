# 某5影视ts视频wasm加密分析(wasm逆向)

> **作者**: Frhvjhhv | **发布时间**: 2021-02-28 17:18:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 18638 / 76
> **原文**: [https://www.52pojie.cn/thread-1379690-1-1.html](https://www.52pojie.cn/thread-1379690-1-1.html)

---

首先,f12，可以看到网站很卡。是因为这个网站有脏代码，监听了f12，然后pushstate，即疯狂的向地址栏中写入数据，把内存占满。解决办法是hook pushstate。
然后就可以跟踪了。

跟踪的一个关键地方：

[JavaScript] *纯文本查看*

```
d.prototype.processSegment = function(e, t, i, n) {
                        var r = d.nup.Module;
                        this.mem || (this.mem = r._malloc(131072));//1
                        for (var a = 0; a < n; ) {
                            var o = Math.min(n - a, 131072);//2
                            r.HEAPU8.set(t.slice(a, a + o), this.mem),//3
                            this._processSegment(e, this.mem, i + a, o),//4
                            t.set(r.HEAPU8.slice(this.mem, this.mem + o), a),
                            a += o
                        }
                    }
```

上述代码1处是分配131072大小的内存，返回的数据就是分配的内存的起始地址（这个网站默认地址为6472960），3处是把视频数据分割成131072大小，然后塞入之前已经实例化的wasm内存中，视频的起始指针就是之前分配的内存的起始地址。
4处的参数就两个关键的地方：即视频在wasm的起始地址和视频在wasm的内存中的长度。
跟进4处，他往wasm的内存中又写了一些数据，这里先按下不表，然后就进入了关键的函数：

[Asm] *纯文本查看*

```
 (func $_nup2p_process_segment (;236;) (export "_nup2p_process_segment") (param $var0 i32) (param $var1 i32) (param $var2 i32) (param $var3 i32)
    (local $var4 i32) (local $var5 i32)
    global.get $global9
    local.set $var4
    global.get $global9
    i32.const 16
    i32.add
    global.set $global9
    global.get $global9
    global.get $global10
    i32.ge_s
    if
      i32.const 16
      call $abortStackOverflow
    end
    local.get $var4
    i32.const 4
    i32.add
    local.tee $var5
    local.get $var0
    i32.store
    local.get $var4
    local.get $var1
    i32.store
    local.get $var0
    if
      local.get $var5
      call $__ZNSt3__26__treeINS_12__value_typeIi14nup2p_secret_tEENS_19__map_value_compareIiS3_NS_4lessIiEELb1EEENS_9allocatorIS3_EEE4findIiEENS_15__tree_iteratorIS3_PNS_11__tree_nodeIS3_PvEElEERKT_
      local.tee $var0
      i32.const 104472
      i32.ne
      if
        local.get $var0
        i32.load8_s offset=44
        if
          local.get $var1
          local.get $var3
          local.get $var4
          local.get $var0
          i32.const 20
          i32.add
          local.get $var2
          call $_decode_bcrypto_buf
          drop
        end
      end
    end
    local.get $var4
    global.set $global9
  )
```

在上面的wasm代码中，\_\_ZNSt3\_\_26\_\_treeINS\_12\_\_value\_typeIi14nup2p\_secret\_tEENS\_19\_\_map\_value\_compareIiS3\_NS\_4lessIiEELb1EEENS\_9allocatorIS3\_EEE4findIiEENS\_15\_\_tree\_iteratorIS3\_PNS\_11\_\_tree\_nodeIS3\_PvEElEERKT\_和\_decode\_bcrypto\_buf很重要
wasm代码肯定是要跟着走一遍的，然后配合jeb和ida分析。首选jeb。因为jeb对wasm的反汇编代码质量很高，阅读性好。但是这个例子中因为导入了很多函数，而且频繁的操作内存，所以jeb会报错。只能用ida了。关键还是看懂wam的汇编代码，走一遍。
wasm很简单，不懂的指令查官网就行了  https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md
在这里我要说的指令就两个：i32.load。和i32,store。wasm要想操作内存，就只能用这两个指令。(i32.load8,i64.load8,i32.load16，offset=7等等原理都是一样的)。i32.load就是加载一个四个字节的数，注意wasm的字节都是以小端存储的

![](https://attach.52pojie.cn/forum/202102/28/162023c8l1ld00o8w7k11a.png)

在这里，执行i32.load之前，堆栈里的数是104472.那么我们就要去找内存地址104472，然后加载四个字节

![](https://attach.52pojie.cn/forum/202102/28/162324rmel6czczzyyyet4.png)

可以看到这四个数分为152，196，98，0
我们把他们转化为二进制：
152：10011000
196：11000100
98  :   1100010
0    :    0
由于是小端存储，所以低地址在前，高地址在后
所以加载的数的二进制表示形式是：0|1100010|11000100|10011000(|为分隔符)
转换为十进制为6472856
检验一下：

![](https://attach.52pojie.cn/forum/202102/28/163225upprrpnnvpkncve8.png)

可以看到是正确的。

然后继续跟踪下去。这里放上我跟踪一遍之后的伪代码：

[JavaScript] *纯文本查看*

```
int memory[134217728]={}
nup2p_process_segment(int var0, int var1,int var2,int var3)
int var4,var5;
var4=global9=107696
global9+=16
global10=5350544
if(global9>globa110)
{
  $abortStackOverflow(16);
}
var 5=var4+4   //var 0=11,,var 5=10770x
var0=memory[var5]
var1=memory[var4]//var1=6472960
if(var0!=undefined)
{
     var0=$__ZNSt3__26__treeINS_12__value_typeIi14nup2(var5)//6468856
	 if (var0!=104472)
	 {
	     if(memory[var0+44]!=undefined)
		     {       //var2=786432;var0+20=6468820;var3=131072;var1=6472960;var4=107696
			     decode_bcrypto_buf(var1,var3,var4,var0+20,var2)

			 }
	 }
}

           //                         6468876
           //6472960  131072  107696  6468820  786432
decode_bcrypto_buf(var0,var1,var2,var3,var4)
int var6,var7,var8,var9=0;
if(var3)
{
    if(memory[var3+4])
	   {
	       var5=memory[var3+6]  //8
		   var8=65535&&var5     //8
	       if(var5)
		   {
		       var5=memory[var2];  //8
			   if(var5)
			   {
			      var2=var5      //8

			   }  //647290  71
			   else
			   {
			     cc=var2
			     var2=call $__Znam(var1)
			     memory[var2]=cc;

			   }
			   var10=var1>>3;//131072>>3=16384
			   var5=var4;
			      for()
				      {  //  6468884: 80   98
					     if(var9!=var10)
						 {
[color=red]						    memory[var2+var7]= //6472960
							 memory[var0+var7]^memory[(var3+8)+(var5%var8)] ;  35^memory[6468876+0](80) //(1)[/color]
							memory[ var2+(var6=var7|1)]=//6472960+(0|1)
							 (memory[var0+var6])^memory[(var3+8)+(var5+1)%8]   //6468885

							memory[ var2+(var6=var7|2)]
							(memory[var0+var6]) ^memory[(var3+8)+(var5+2)%8]     memory[6468876+8+(2)](89)
						 }
					  }
		   }
	   }
}

$__ZNSt3__26__treeINS_12__value_typeIi14nup2(var0)//107700
int var1,var2;
block1;
{
var1=104472;
//memory[var1];//6468800
var2=$__ZNSt3__26__treeINS_12__value_typeIi14nup2p_secret_tEEN(var0,memory[var1],var1)//var2=648856
if(var2==104472)
{goto block1; }
if(memory[var2+16]<memory[var0])
{goto block1;}
var1=var2;
}
return var1;

$__ZNSt3__26__treeINS_12__value_typeIi14nup2p_secret_tEEN(var0,var1,var2)//107700  6468800  104472
[color=red]int var3=memory[var0];//12 （2）[/color]
for (var1>0)
{
	    var2=memory[var1+16]<var3? var2:var1;//11<12     12==12     6468856
		var0=memory[var1+16]<var3;//1       0
		var1=memory[var0? var1+4:var1]//6468856
}
return var2//6468800
		//6468856

```

跟踪一遍可以发现在decode\_bcrypto\_buf函数的1处，他对于原来的视频数据每隔8个字节为一组。分别对这一组的每个字节进行了一次异或，然后覆盖了原来的字节，其中关键的参数是var3+8这个内存地址的数据。var5能被8整除。所以异或的第二个参数就是0,1,2一直到8。所以原来的视频数据每隔8个字节为一组，这一组的每个字节分别与var3+8,var3+8+1,var3+8+2等等一直到vae3+8+7的地址处的数据进行异或。
，var3var3最终是在
$\_\_ZNSt3\_\_26\_\_treeINS\_12\_\_value\_typeIi14nup2p\_secret\_tEEN(var0,var1,var2)这个函数的2处进行调用的。

![](https://attach.52pojie.cn/forum/202102/28/164841c9cjd0cn9hrs9akd.png)

多次跟踪可以发现，内存地址不固定，而且内存地址的值不固定。
所以，内存地址的值就是在最前面按下不表那里写入的。
跟踪可以发现

[JavaScript] *纯文本查看*

```
           string: function(e) {
                var t = 0;
                if (null != e && 0 !== e) {
                    var i = 1 + (e.length << 2);
                    stringToUTF8(e, t = stackAlloc(i), i)
                }
                return t
            },
```

其中，e = "http://0.0.0.0“，stringToUTF8首先是望wasm的前14个字节写入了一些数据stackAlloc函数调用的是wasm代码：

[Asm] *纯文本查看*

```
 (func $stackAlloc (;165;) (export "stackAlloc") (param $var0 i32) (result i32)
    (local $var1 i32)
    global.get $global9
    local.set $var1
    local.get $var0
    global.get $global9
    i32.add
    global.set $global9
    global.get $global9
    i32.const 15
    i32.add
    i32.const -16
    i32.and
    global.set $global9
    global.get $global9
    global.get $global10
    i32.ge_s
    if
      local.get $var0
      call $abortStackOverflow
    end
    local.get $var1
  )
```

翻译成伪代码为：
stackAlloc(var0) //  57
global9=107696
var1=107696
global9=var0+global9
global9=(global9+15)^(-16)
globa110=5350544
if(global9>globa110)
{
   abortStackOverflow(var0);
}
return var1

最终可以发现是调用的这句话填充数据的：

[Asm] *纯文本查看*

```
(func $_nup2p_start (;179;) (export "_nup2p_start") (param $var0 i32) (param $var1 i32)
    (local $var2 i32)
    i32.const 104424
    i32.load
    i32.eqz
    if
      i32.const 128
      call $__Znwm
      local.set $var2
      i32.const 0
      global.set $global5
      i32.const 65
      local.get $var2
      local.get $var0
      local.get $var1
      call $invoke_viii
      global.get $global5
      local.set $var0
      i32.const 0
      global.set $global5
      local.get $var0
      i32.const 1
      i32.and
      if
        call $___cxa_find_matching_catch_2
        local.set $var0
        call $getTempRet0
        drop
        local.get $var2
        call $__ZN8CryptoPP19UnalignedDeallocateEPv
        local.get $var0
        call $___resumeException
      else
        i32.const 104424
        local.get $var2
        i32.store
        i32.const 44
        call $__Znwm
        local.tee $var0
        i64.const 0
        i64.store
        local.get $var0
        i64.const 0
        i64.store offset=8
        local.get $var0
        i64.const 0
        i64.store offset=16
        local.get $var0
        i64.const 0
        i64.store offset=24
        local.get $var0
        i64.const 0
        i64.store offset=32
        local.get $var0
        i32.const 0
        i32.store offset=40
        local.get $var0
        call $__ZN2nu5FilesC2Ev
        i32.const 104428
        local.get $var0
        i32.store
        i32.const 104424
        i32.load
        local.get $var0
        call $__ZN2nu6Engine9addPluginEPNS_6PluginE
      end
    end
  )
```

而这里面又调用了其他的函数，所以慢慢分析是最终是可以解出他是如何填充数据的，但是太慢了。我们跳出来看看他解密前后的数据：

![](https://attach.52pojie.cn/forum/202102/28/171123ej11dx8x4nk9x0z0.png)

可以看到解密后的数据中从第22个开始就是255.已知视频是每八个一组进行解密。那么我们从第24个开始分别让原来的视频数据与155进行异或，往后推8个，不就得到了那8个异或的参数？
说干就干
，在上图第一个断点处拦截一下，然后console处运行：

[JavaScript] *纯文本查看*

```
var array = Array.from(t)
arr=[array[24]^255,array[25]^255,array[26]^255,array[27]^255,array[28]^255,array[29]^255,array[30]^255,array[31]^255]
arra=new Uint8Array(array.length)
for (var ii=0; ii<array.length;ii+=8)
{
for(var j=0;j<8;j++)
{arra[ii+j]=(array[ii+j]^arr[j]);}

}

var blob2 = new Blob([arra]);var aaaa = document.createElement('a');
var url2 = window.URL.createObjectURL(blob2);
var filename ="vv.mp4";
aaaa.href = url2;
aaaa.download = filename;
aaaa.click();
```

视频下载下来了，打开一下：

![](https://attach.52pojie.cn/forum/202102/28/171720j3blad382uhfa3j8.png)

成功！
