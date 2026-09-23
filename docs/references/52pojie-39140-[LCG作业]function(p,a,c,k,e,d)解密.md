# [LCG作业]function(p,a,c,k,e,d)解密

> **作者**: frozenrain | **发布时间**: 2010-02-09 11:27:00 | **版块**: 『病毒样本区』 | **查看/回复**: 3025 / 8
> **原文**: [https://www.52pojie.cn/thread-39140-1-1.html](https://www.52pojie.cn/thread-39140-1-1.html)

---

*本帖最后由 frozenrain 于 2010-2-9 21:23 编辑*

几个月前写的东西，现在没时间写东西了，还差一篇文章，拿来凑数。

上个月分析一网马（这个代码是我加的）时候碰到的一脚本：

eval(function(p,a,c,k,e,d){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)d[e(c)]=k[c]||e(c);k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('2.4("3://5.0.1")',62,6,'baidu|com|document|http|write|www'.split('|'),0,{}))

百度了一下，没有分析结果，有解密和加密代码，自己研究了一下，就写了这篇文章。

下面是详细分析。

先展开一下，这样写在一起不便于分析。

function(p,a,c,k,e,d)

{

   e=function(c)   {   return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))

};

if(!''.replace(/^/,String))

{

  while(c--)

   d[e(c)]=k[c]||e(c);

   k=[function(e){returnd[e]}];

     e=function()

     {

      return'\\w+'

     };

   c=1

};

while(c--)

if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);

return p

}('2.4("3://5.0.1")',62,6,'baidu|com|document|http|write|www'.split('|'),0,{}))

这样就比较清晰了，下面开始分析(为了让大家更好理解，修改了程序在firebug里截了几张图放在上面了)。

function(p,a,c,k,e,d)是一个匿名函数，最后面括号里的内容是他的6个参数，('2.4("3://5.0.1")',62,6,'baidu|com|document|http|write|www'.split('|'),0,{})，最后一个参数传递的是一个花括号，在js里这是允许的，表示传递的是一个空的对象。String.split('|')表示以这个符号将单词隔开，其实也可以换成其他符号来分隔。

e=function(c)

{

return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))

};

这个函数实际上是一个62进制转换函数。e=function(c){…}函数一开始就给参数e赋值成一个函数，故参数e的原始值是无意义的,前面已经说了参数e，一个空对象。另外，这里的参数名也是c，不要与(p,a,c,k,e,d)中的c混淆，二者作用域是不同的。函数返回值由2部分相加组成，

第1部分：(c<a? '' : e(parseInt(c/a)) )  如果c小于a，返回空串；否则返回e(c/a)

第2部分：((c=c%a)>35?         c=c%a，即保存余数。

String.fromCharCode(c+29)        返回余数加29后对应的字符；

:                              否则

c.toString(36))                   返回余数的36进制字符串

从整体上看，返回值是c对应的a(a=62)进制字符串，每个数位上可能的62个字符是'0','1','2'...'9','a','b'...'z','A','B',...'Z'，正好是62个。有兴趣的可以自己多用几个数字测试一下。

继续看下面一部分。

if(!''.replace(/^/,String))

{

}

摘自MSDN：

function replace(rgExp : RegExp, replaceText : String) : String

参数

rgExp

必选。包含正则表达式模式和适用标志的 Regular Expression 对象的实例。也可以是 String 对象或文本。如果 rgExp 不是 Regular Expression 对象的实例，它将被转换为字符串，并对结果进行精确的搜索；字符串将不会被试图转化为正则表达式。

replaceText

必选。一个 String 对象或字符串文本，包含用于替换当前字符串对象中 rgExp 的每个成功匹配的文本。在 Jscript 5.5 或更高版本中，replaceText 参数也可是返回替换文本的函数。

if(!''.replace(/^/,String)) 所以对于JScript 5.5以后，该判断总是为True，对于浏览器版本比较低的可能会返回FALSE，不过即使返回FALSE程序照样可以正常解码，后面再说。

while(c--)

   d[e(c)]=k[c]||e(c);  while循环填充了字典d的内容，d的原始值是空对象{}。

c是字典项数，原始值为8，k是字典单词列表，在本例中为['baidu','com','document','http', 'write','www']，

d[e(5)] = k[5]||e(5) -> d['5'] = 'www' || '5' -> d['5'] = 'www'

while循环结束后：

   d['5']='www'

   d['4']='write'

   d['3']='http'

   d['2']='document'

   d['1']='com'

   d['0']='baidu'

d类似于stl的set容器的键值对，说类似于python中的dictionary可能更恰当点，即 d = { '0':'baidu', '1':'com', '2':'document', '3':'http', '4':'write', '5':'www' }。

k=[function(e){returnd[e]}];

e=function()

  {

      return'\\w+'                                  返回单词

  };

   c=1

这里给k赋值成一个数组, 只有一个元素k[0]。k[0]是个查字典函数，把参数作为索引，返回单词。如k[0]('2')返回d['2']，即'document'。

while(c--)                                   由于c=1，循环体只执行1次

if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);             查字典替换

return p

最后就得到还原后的字符串了。

这里提一下上面为什么最后有句c=1，前面已经提过，这里解释一下里面的玄机if(!''.replace(/^/,String)) 这句无论执行成功失败，都能成功解码。这就是作者设计的巧妙的地方。考虑到现在大家的浏览器版本都比较高，不会出现返回FALSE的情况。代码还可以进一步优化。

至于解码，就非常简单了，下面是解码代码：

function decode()

{

var code = document.getElementById('code').value;

code = code.replace(/^eval/, '');

document.getElementById('code').value = eval(code);

}

这段js加密代码运用比较广泛，不仅网马喜欢用它。正常网页也喜欢用，比如百度空间统计访问数量就用了他，搜狗云输入法里有它的影子。

最后感谢某个人指点。

附：

下面一段是加密代码，摘自网上，作者不知道是谁了。不要追究我版权~~。

a=62; //加密标记

function encode()

{

var code = document.getElementById('code').value;

code = code.replace(/[\r\n]+/g, '');//去掉回车换行

code = code.replace(/'/g, "\\'"); //单引号转义

var tmp = code.match(/\b(\w+)\b/g); //匹配单词

tmp.sort(); //排序，后面处理单词会去掉重复的

var dict = [];

var i, t = '';

for(var i=0; i<tmp.length; i++){

   if(tmp *!= t)

   dict.push(t = tmp*); //加到数组尾部

}

var len = dict.length; //数组长度，即项数

var ch;

for(i=0; i<len; i++)

{

   ch = num(i);

   code = code.replace(new RegExp('\\b'+dict*+'\\b','g'), ch);//将字典中的单词用字符62进制数字代替

   if(ch == dict*) dict *= '';

}*****
