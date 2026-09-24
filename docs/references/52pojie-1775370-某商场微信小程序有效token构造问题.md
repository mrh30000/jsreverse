# 某商场微信小程序有效token构造问题

> **作者**: Drzad | **发布时间**: 2023-04-18 12:48:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2985 / 15
> **原文**: [https://www.52pojie.cn/thread-1775370-1-1.html](https://www.52pojie.cn/thread-1775370-1-1.html)

---

小程序wxapkg包下载：**https://musetransfer.com/s/12zvofsql**
wxid是**wx3484805679bf714f**

我使用GitHub上的r3x5ur/**unveilr**工具对主包\_\_APP\_\_.wxapkg进行提取，但我只能提取其中的文件，无法反编译（问题已提交Issue）
提取出的文件下载：**https://musetransfer.com/s/z2fvfqsts**

提取出的“**app-service.js**”文件中，第**20676行**是我关注的点，其中包含token的构造命令

以下是一些valid的token：

* consumer=188880000002&**timestamp=1681783203579&nonce=51036257a4504d6c91e1cb787974fad0&sign=77b078caf103a48244fa8f6b7c45b327**&tenantId=13474&cid=ca975b725998428480600f1baf3bda18&openId=o5oC55QBHtF\_862zWbo5F5JC-iiI&v=20211030
* consumer=188880000002&**timestamp=1681785145822&nonce=b7ed4368654d46b1a5415aea6ebe52f3&sign=0b9561b9fdb666743f4ed6230b6af49e**&tenantId=13474&cid=ca975b725998428480600f1baf3bda18&openId=o5oC55QBHtF\_862zWbo5F5JC-iiI&v=20211030
* consumer=188880000002&**timestamp=1681785146695&nonce=645f592121ad410c99f35fe0716ef263&sign=b6b14b9dad57867f0c2035c61f77e84b**&tenantId=13474&cid=ca975b725998428480600f1baf3bda18&openId=o5oC55QBHtF\_862zWbo5F5JC-iiI&v=20211030
* consumer=188880000002&**timestamp=1681785131439&nonce=c66d5689a1a947108596e17b23f8621d&sign=1ea1c86eaf2b809546ff296827723559**&tenantId=13474&cid=ca975b725998428480600f1baf3bda18&openId=o5oC55QBHtF\_862zWbo5F5JC-iiI&v=20211030

token中的timestamp、nonce、sign为主要变量，其主要功能是防重放。且经过多次测试，每次提交toekn时，以上参数缺一不可。并且token的结构为

> "consumer=".concat("188880000002", "&timestamp=").concat(**u**, "&nonce=").concat(**c**, "&sign=").concat(**a**, "&tenantId=").concat(o, "&cid=").concat(e, "&openId=").concat(r, "&v=20211030")

搜索常用防重放攻击方法后，得知其timestamp为当前时间戳，nonce为随机生成的32位字符串，sign是计算出的校验。
审计其第20676行的代码后，sign应该是

> "188880000002" + c + u + "bbd2b25e7a8b4d94a8cc167ba2f27edd" + o + e + r + t

的MD5值，其中c为随机生成的nonce，u为当前时间戳timestamp，o为tenantId固定值13474，e为cid固定值ca975b725998428480600f1baf3bda18，r为用户openid固定值o5oC55QBHtF\_862zWbo5F5JC-iiI，**t目前未知**。

请问各位大佬能否看出t是什么参数？我尝试过简单的空值、1、0、20211030，都不对。
但我看到“**app-service.js**”文件中第**20733行**里有使用globalData定义t的，是一大长串的结构，我不确定是不是真的这么复杂。
或者有什么方法可以让我们修改小程序的某些地方让它在前台输出给我们看想看的变量，我可以用Fillder抓包抓到小程序的网络流，上面的token就是抓包抓到的。
