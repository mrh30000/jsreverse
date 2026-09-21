# [原创]boss直聘_zp_stoken_的控制平坦流纯算逆向思路

> **作者**: SuEmiya | **发布时间**: 2025-09-08 00:13:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 11286 / 57
> **原文**: [https://www.52pojie.cn/thread-2058603-1-1.html](https://www.52pojie.cn/thread-2058603-1-1.html)

---

先看该token哪里来的.

![](https://attach.52pojie.cn/forum/202509/08/000643u0mv6gsdjy0vjvhj.png)

注意到下面的请求cookie才第一次使用到\_\_zp\_stoken\_\_,推断出是在这个0f35c990.js里生成的.注意该文件以及文件名会在每天晚上0点-1点之间变动一次,固定为每天一次.
下面分析该js.

![](https://attach.52pojie.cn/forum/202509/08/000703sx5a8ta5ml8ln185.png)
该js分为两部分,上面是一小段自执行函数,如上图.这里关键控制变量是G,并且是常量16.

![](https://attach.52pojie.cn/forum/202509/08/000706d5h9zz5tb7555bbi.png)

下面部分依然大同小异,只是控制变量不再为常量,而是由传入的参数决定.

![](https://attach.52pojie.cn/forum/202509/08/000708ep88ba8cfrm6a51e.png)

可能的传入参数,即下图示例中的10768 诸如此类.
这是典型的控制平坦流.面对这种情况,我的思路是,首先要理解,它实际控制变量就一个,这里的be.后面的Ee,Ae,Ne这几个实际是由be经过固定算法得出的.
现在进行第一步,使用ast构建出一个map印射表,使每一个be值对应的执行内容印射出来.

![](https://attach.52pojie.cn/forum/202509/08/000710fvyavy81yvyz6vz6.png)

比如当be=10768时,Ee,Ae,Ne对应的值就分别是16 16 10.然后我们去对应的分支查看,可以看到

![](https://attach.52pojie.cn/forum/202509/08/000712h9vajve7apy95auu.png)

实际上执行的就是给be下一个赋值,然后循环,直到遇到return节点.
那第一步就是通过模拟这个流程,构建我们自己的map图.
流程就是be=10768,得到be=10410,然后继续...

![](https://attach.52pojie.cn/forum/202509/08/000715ujfljnl424g2jfkd.png)

去除掉无用的break部分,我们得到这样的有效数据.
下一步就是给定指定的入口参数,然后我们模拟这个流程,以return和be=undefined未界,标记一整个函数的执行过程.
我们把只关于be跳转的部分无效信息移除掉,以be=1616为入口为例,得到这样的结果.
[
  'be = 1616;r = "cha";p = arguments[1];\_ = "len";e = "gth";a = [];l = undefined;h = "At";o = "pus";q = 1;c = 0;u = "rCo";y = \_ + e;v = "h";f = "de";s = r + u;i = o + v;g = s + f;m = g + h;t = p[y];S = c;n = S < t;j = S + q;be =
n ? 14700 : 73;',
  'if(be===14700);be = 14700;d = a*;x = p[m];z = x["call"](p, S);w = d["call"](a, z);S = j;n = S < t;j = S + q;be = n ? 14700 : 73;be = n ? 14700 : 73;',
  'if(be===73);be = 73;return [a];'
]
继续进行转化并构造成这样的格式

![](https://attach.52pojie.cn/forum/202509/08/000717nh2ds5vvtjj133m3.png)

![](https://attach.52pojie.cn/forum/202509/08/000719kbigmmqz4lc4omqz.png)

然后进行常量合并,如观察到\_ = "len";e = "gth";y=\_ + e;那么自然y="length".当然这一步不是必须的,不过可以方便我们观察代码逻辑.

![](https://attach.52pojie.cn/forum/202509/08/000721cnr39y0tc21x0y9s.png)

![](https://attach.52pojie.cn/forum/202509/08/000723qkbsplkhaqt5rtrx.png)

最终形成这种样式.并以此类推还原出全部算法.

![](https://attach.52pojie.cn/forum/202509/08/000725mcqnlncp2vq2vvf2.png)

等等等等.

![](https://attach.52pojie.cn/forum/202509/08/000727tcz424bh0w5phhbc.png)

剩下的就是找到token生成的入口位置,然后使用我们自己构建的代码,依次调用即可.

![](https://attach.52pojie.cn/forum/202509/08/000729xi5akzkj255skf20.png)

可以看到第一个参数5553,即be=5553是关键入口,第二个第三个是前面请求或者token已过期时系统返回的种子参数.

![](https://attach.52pojie.cn/forum/202509/08/000731mld6yllz8y52yhly.png)

![](https://attach.52pojie.cn/forum/202509/08/000734o6zbjjt4pw063pqm.png)

值得一提的是,部分参数的构成方式,靠肉眼就能看出规律,没事背一下ascii码表是真的有用家人们,比如这里我当时就肉眼看出端倪,a=97总知道的吧,那b自然是98,包括后面俩一样的.这段长度50的代码计算逻辑是这样的.首先是字符串的长度,然后跟字符串对应的ascii码.

![](https://attach.52pojie.cn/forum/202509/08/000736xrbonb3snb0zon5u.png)

48, 98,  57,  50 是"0b92"对应的ascii码,4代表该字符串的长度.同理44代表'booubZKQSgODivfbCd8dHDdK8T7BITcNqfge/Jfh7Oo='这个种子的长度.
以此类推,扣出最终的核心代码即可.

![](https://attach.52pojie.cn/forum/202509/08/000738ehbyhrgh0rvuhac8.png)

实际的核心代表仅这一段,当然仍然需要一些耐心去仔细补全,不过剩下的确实也没什么难度了吧.
最后总结:
1构建map,还原全部执行流程.
2提炼出有效信息并自行构建易辨认的格式.这里的难点在于对于if语句的重构,逻辑比较绕.

![](https://attach.52pojie.cn/forum/202509/08/000740zsscibsd67s49944.png)

部分陷阱:比如这里的返回值f是undefined,是怎么回事呢?实际上因为v是数组,它是在函数内部对v进行了操作,最后没有返回任何东西,但实际上v已经变化了.对于这种,自己需要手动让它返回v的值.
测试

![](https://attach.52pojie.cn/forum/202509/08/000742mxjhuquka9kdx0di.png)

问:这个初始值是什么?

![](https://attach.52pojie.cn/forum/202509/08/001304d4k7brfguf1ssgdu.png)

答:这个是首次自执行该js时拿到的一个时间戳,会保存到window['s']中,后续计算会用到,作用我猜测是计算本js从开始执行到最后生成参数,相隔了多长时间.作用大概是判断你是正常用户(执行时间应该在1秒内)还是搞断点的.如果搞断点逆向的话,可能最后发生出去的时候这个时间已经过了几十分钟.不过实际上似乎并没有什么后果.

![](https://attach.52pojie.cn/forum/202509/08/000744xbtbkukh77b585q5.png)

可以观察到某部分数组明显是跟时间有关的.
问:怎么生成的结果会变,甚至长度都不是固定的?
答:还是由于上面的这个原因.*
