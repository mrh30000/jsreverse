# 某度文库导出pdf格式的html

> **作者**: Culaccino | **发布时间**: 2021-05-04 16:56:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 18268 / 264
> **原文**: [https://www.52pojie.cn/thread-1433013-1-1.html](https://www.52pojie.cn/thread-1433013-1-1.html)

---

*本帖最后由 Culaccino 于 2021-5-6 18:32 编辑*

附上@涛之雨 大佬的油猴脚本 <https://greasyfork.org/zh-CN/scripts/422847>

老方法用ctrl+p打印的方法用不了了，于是去谷歌了一下，找到以下一篇提问，就有了这篇水文
[Is it possible to print contents from a specific selector, using .print() function?](https://stackoverflow.com/questions/15442960/is-it-possible-to-print-contents-from-a-specific-selector-using-print-functi)

推测可能是**css**的原因

随便保存一个文库页面，用filelocator找了一下[@media](https://www.52pojie.cn/home.php?mod=space&uid=945662) print

![](https://attach.52pojie.cn/forum/202105/04/165120zrs7ss0h8ljsj5a5.png)

再到console中找到xreader文件，右键reveal in source panel，跳到源文件

![](https://attach.52pojie.cn/forum/202105/04/165221mpppcsggs5xrbews.png)

点击红框中的格式化按钮，搜索@media print，把这段删除即可

![](https://attach.52pojie.cn/forum/202105/04/165451o1iapkrqq7gge4ka.png)

最后效果

![](https://attach.52pojie.cn/forum/202105/04/165614tnag1jtkrmnby11b.png)

此方法只能获取看得到的页面！！！可以绕过复制等限制，不能[破解](https://www.52pojie.cn)会员
