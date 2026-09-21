# 解析某网络教学平台登录时的明文加密方法并使用python实现代码复现

> **作者**: we37 | **发布时间**: 2021-04-18 22:13:00 | **版块**: 『编程语言区』 | **查看/回复**: 3597 / 8
> **原文**: [https://www.52pojie.cn/thread-1421183-1-1.html](https://www.52pojie.cn/thread-1421183-1-1.html)

---

不知道标题说清楚了没（^\_^）。
上学期考完试，因为成绩是一门一门的出来，经常都要去网络教学平台登录查看成绩出没出（那种不知道自己是否挂科的煎熬感），我嫌烦而且刚好学完爬虫，就想着看能不能写个脚本实现一键查成绩的功能，当时没有具体的学过前端代码，但因为有c的基础也算是能看出来一点，然后抓包解析，一顿瞎操作，明文具体怎么加密的没看懂，但是找到了加密完的密文和发送的url（嘿嘿）,然后数据清洗，功能这不就实现了吗，然后，就没有然后了，功能都实现了，那还然后个屁。
但是最近我自己的网站因为是http明文传输，也不好加证书实现https，所以我就想，用户数据安全肯定得保证啊，得想办法搞一套加密方法回来，这样就又记起了我学校的这套当时没看懂的加密。
通过打断点，看代码解析完之后，我发现其实还蛮简单的。所以想将这个加密方法分享给大家。好了，废话说了这么多了(不是)，直接上源码。
-----------------------------------------------------------------------------------------------
以下解析实属小白的我玩玩，有问题希望大神指出来（^\_^）感激不尽。
本文适合有一点前端知识的同学阅读,大家加油学啊！！！！

![](https://static.52pojie.cn/static/image/hrline/4.gif)
![](https://static.52pojie.cn/static/image/hrline/4.gif)

form表单

[HTML] *纯文本查看*

```
<form id="loginForm" name="loginForm" action="/Logon.do?method=logon" method="post">

	<ul id="ul1" >

		<li class="box_bt"><img class="img-responsive" src="/css/images/user_icon.png"  style="float:left;margin:8px 8px 0 0">用户登录</li>

		<li class="input-group input_li">

			  <span class="input-group-addon"><i class="glyphicon glyphicon-user"></i></span>

			  <input type="text" class="form-control" id="userAccount" name="userAccount" placeholder="请输入账号" value="123" autofocus>

		</li>

		<li class="input-group input_li">

			  <span class="input-group-addon" id="basic-addon1"><i class="glyphicon glyphicon-lock"></i></span>

			  <input type="password" class="form-control" id="userPassword" name="userPassword" placeholder="请输入密码" value="">

		</li>

		<li class="input_li">

			<button type="button" class="btn btn-primary login_btn">登   录</button>

		</li>

	</ul>

	<input name="encoded" id="encoded" type="hidden" value=""/>

</form>
```

js代码

[JavaScript] *纯文本查看*

```

function login() {

	if($("#userAccount").val() == "") {

		$("#showMsg").text("请输入账号");

		$("#userAccount").focus();

		return false;

	}

	if($("#userPassword").val() == "") {

		$("#showMsg").text("请输入密码");

		$("#userPassword").focus();

		return false;

	}

		var strUrl = "/Logon.do?method=logon&flag=sess";

	$.ajax( {

		url:strUrl,

  		type:"post",

  		cache:false,

		dataType:"text",

		success:function(dataStr) {

			if(dataStr=="no"){

				return false;

	 		}else{

	 			var scode=dataStr.split("#")[0];

		     	var sxh=dataStr.split("#")[1];

		     	var code=document.getElementById("userAccount").value+"%%%"+document.getElementById("userPassword").value;

			 	var encoded="";

				for(var i=0;i<code.length;i++){

					if(i<20){

						encoded=encoded+code.substring(i,i+1)+scode.substring(0,parseInt(sxh.substring(i,i+1)));

					    scode = scode.substring(parseInt(sxh.substring(i,i+1)),scode.length);

					}else{

					    encoded=encoded+code.substring(i,code.length);

					    i=code.length;

					}

				}

				document.getElementById("encoded").value=encoded;

				if("logon"!="logonLdap"){

					document.getElementById("userPassword").value="";

				}

				document.getElementById("loginForm").submit();

	 		}

		},

		error:function() {

	 		alert("计算异常！");

		}

  	});

}

```

form表单我过滤了一遍，将一些与本文无关的代码剔除。看着很简单，两个输入框，一个提交按钮，最下面还有个隐藏的输入框，不知道是干什么用的，不用纠结，后面肯定有用到，接着往下看。

js代码中，上面两个if判断都是做输入框非空处理的，不用关注，接着看有个strUrl，然后使用ajax异步提交了一个post请求，但是： 可以看到该请求体中没有data字段，也就是没有将我们的账号密码提交上去，说明提交还在后面，接着往下看，请求success之后，从服务器拿到了一个dataStr，然后做了一步判断，不用说，这里返回no的几率很小，所以不用管，接着看，到了下面，我们发现它将dataStr通过’#‘分开了,那么这里就有点疑问了，**dataStr到底是个啥？？**不解决这个问题我们再往下看也没用。所以怎么办才能拿到dataStr呢？

         **打断点**

打断点可以说是一个基础而且十分有用的技能了，至少我写爬虫是经常需要打断点的。

![](https://attach.52pojie.cn/forum/202104/18/220609cx34qbrnq66xsegk.png)

通过打断点，我们可以看到dataStr很清晰的展现在我们面前，

[JavaScript] *纯文本查看*

```

	dataStr = "8321akd3k0013M7cQ0Dv1Y749315N3f2Sxy762W213#13122313321123323321"

	scode = "321akd3k0013M7cQ0Dv1Y749315N3f2Sxy762W213"

	sxh = "13122313321123323321"

	code = "123%%%123"    # code就是我们的  账号+"%%%"+密码

```

看到这里，一些基本的变量已经知道了**，强烈推荐大家自己试着解一下。**

然后又定义了一个encoded，我们应该能猜到encoded应该是用来存放加密完之后的密文的。

接下来看for循环里的if体内，

[JavaScript] *纯文本查看*

```
encoded=encoded+code.substring(i,i+1)+scode.substring(0,parseInt(sxh.substring(i,i+1)));
```

* substring ?? 没见过，没关系，百度一下，百度到结果是字符串截取，括号内是字符串下标，不包括后边的下标。
* parseInt ?? 没见过，没关系，百度一下，字符串转为数值类型。

-----------------------------------------------------------------------------------------
那么第一次for循环就清楚了：

code.substring(i, i + 1)   就是将code取第一个字符
scode.substring(0,parseInt(sxh.substring(i,i+1)))  就是先取sxh的第一个字符，然后将他转成数值，再从scode中取到0-这个数字范围内的字符，在第一次循环中表现为scode.substring(0, 1) 也就是取scode的第一个字符。

接下来的这个语句：

[JavaScript] *纯文本查看*

```
scode = scode.substring(parseInt(sxh.substring(i,i+1)),scode.length);
```

很简单的置换，**将scode中“已经使用了的字符”进行删除。**

那下面的else是什么意思啊？

[JavaScript] *纯文本查看*

```
encoded=encoded+code.substring(i,code.length);
	i=code.length;
```

意思就是将code中大于20的之后的字符一口气全部加到encoded后面，然后直接退出for循环(即第二条语句的意思，换了一种写法，但是和break意思一样)

for循环完成之后有这样一条语句：

[JavaScript] *纯文本查看*

```
document.getElementById("encoded").value=encoded;
```

奥，原来是**将加密后的密文encoded赋值给form表单中的被隐藏的那个输入框**啊，

[JavaScript] *纯文本查看*

```
document.getElementById("userPassword").value="";
```

**将密码框的文本清空，最后将form表单submit提交。**
这就很好解释了在传输过程中如何保证数据安全，以及后端如何拿到密文。

这样整个过程就全部分析完成了。

接下来的python代码复现也是很好完成了，

[Python] *纯文本查看*

```

scode = "321akd3k0013M7cQ0Dv1Y749315N3f2Sxy762W213"

sxh = "13122313321123323321"

account = input('账号：')

password = input('密码：')

encoded = ''

code = f'{account}%%%{password}'

for i in range(len(code)):

	if i < 20:

		// encoded=encoded+code.substring(i,i+1)+scode.substring(0,parseInt(sxh.substring(i,i+1)));

		encoded = encoded + code[i] + scode[0:int(sxh[i])]

		// scode = scode.substring(parseInt(sxh.substring(i,i+1)),scode.length);

		scode = scode[int(sxh[i]):]

	else:

		// encoded=encoded+code.substring(i,code.length);

		encoded = encoded + code[20:]

		break

data = {

	'userAccount': accouont,

	'encoded': encoded,

}

res = requests.post(url='...',data=data,headers=header)

```

好了，完成！（从这里也能看出我们python代码的简洁,python之禅）

**但是仅仅这样就够了吗？**
\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*
**我们在分析ajax异步请求的时候，知道了异步请求会返回一个dataStr，既然不是本地变量，那肯定会根据后端的变化而变化，所以这个变量我们肯定是要单独请求一次的。**
\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*
我们在程序前面添上：

[Python] *纯文本查看*

```
	dataStr = request.post(url='/Logon.do?method=logon&flag=sess',headers=header).text

	scode = dataStr.split("#")[0]

	sxh = dataStr.split("#")[1]
```

这样差不多就完成了。
这应该算是一个非常简单的逆向，但是我还是蛮有收获的。
学习永无止境，*人生苦短，我用python*(嘻)
