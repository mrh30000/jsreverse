# Python实例记录-CSS位置偏移反爬案例与爬取实战

> **作者**: BoBuo | **发布时间**: 2022-03-14 15:05:00 | **版块**: 『编程语言区』 | **查看/回复**: 9134 / 11
> **原文**: [https://www.52pojie.cn/thread-1602777-1-1.html](https://www.52pojie.cn/thread-1602777-1-1.html)

---

*本帖最后由 BoBuo 于 2022-3-14 15:10 编辑*

网页利用CSS控制文字的偏移位置，或者通过一些特殊的方式隐藏关键信息，对数据爬取造成影响。 **1.案例

[Python] *纯文本查看*

```
from selenium import webdriver
from pyquery import PyQuery as pq
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait
browser = webdriver.Chrome()
browser.get('https://antispider3.scrape.center/')  # 打开浏览器
WebDriverWait(browser,10).until(EC.presence_of_all_elements_located((By.CSS_SELECTOR,'.item')))  # 指定等待加载内容
html = browser.page_source
doc = pq(html)  # 解析
names = doc('.item .name')
for name in names.items():
    print(name.text())
browser.close()

'''
运行结果：  很多标题的文字顺序是乱的
Wonder
白 清 风 家
结 ） 终 （ 妃 上 下 宠 的 老 册 法 篇
士 为 知 己 （ 全 二 册 ）
那 些 年 ， 我 们 一 起 追 的 女 孩
三 我 ） 册 非 （ 城 倾 全
些 儿 朝 那 明 事
我 和 你 的 笑 忘 书
集 王 小 卷 一 波 全 第
怦 然 心 动
龙枪编年史（全3册）
枪 奇 ） 传 龙 全 册 （ 三
黎 明 之 街
认 示 知 启 理 学 及 心 其
银河帝国2：基地与帝国
银 河 帝 国 ： 基 地
小 - 语 文 材 学 四 教 全 解 级 年 下
越界言论（第3卷）
'''
```**

2.排查
![](https://attach.52pojie.cn//forum/202203/14/150359om5155mp9g8ebp1m.jpg?l)
在网页源代码中可以看到，一个字对应一个节点，这个节点本身的顺序就是乱的，所以用pyquery提取出来的标题内容乱序。源代码中的文字本身是乱的，网页利用CSS控制了文字的偏移位置，所以在网页显示中，标题是正确的每个span节点中都有一个style属性，表示CSS样式，left的取值各不相同。left:0px代表不偏移；left:16px代表从左边算起向右偏移16像素，于是就到了右边；以此类推，最终标题的视觉效果就变成了“明朝那些事儿”。

**3.爬取**
接下来只需要获取每个span节点的style属性，提取出偏移值，然后排序就可以得到最终结果了。

[Python] *纯文本查看*

```
import re
from selenium import webdriver
from pyquery import PyQuery as pq
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

def parse_name(name_html):
  has_whole = name_html('.whole')
    if has_whole:
        return name_html.text()
    else:
        chars = name_html('.char')  # 先选取.char节点，将其赋值为变量chars，然后遍历chars变量，其中每个条目各自对应一个span节点，
        # 其内容类似于：<span data-v-7f1a77ef="" class="char" style="left: 48px;">些</span>
        items = []
        for char in chars.items():   # items() 函数作用：以列表返回可遍历的(键, 值) 元组数组。
            items.append({
                'text':char.text().strip(),  # 提取文本；strip()参数为空，删除首位空格
                'left':int(re.search('(\d+)px',char.attr('style')).group(1))
            })
        items = sorted(items,key=lambda x: x['left'],reverse=False)
        # sorted(iterable, key=None, reverse=False)
        # iterable -- 可迭代对象。
        # key -- 主要是用来进行比较的元素，只有一个参数，具体的函数的参数就是取自于可迭代对象中，指定可迭代对象中的一个元素来进行排序。
        # reverse -- 排序规则，reverse = True 降序 ， reverse = False 升序（默认）。
        return ''.join([item.get('text') for item in items])  # 进行拼接，并返回

browser = webdriver.Chrome()
browser.get('https://antispider3.scrape.center/')  # 打开浏览器
WebDriverWait(browser,10).until(EC.presence_of_all_elements_located((By.CSS_SELECTOR,'.item')))  # 指定等待加载内容
html = browser.page_source
doc = pq(html)  # 解析
names = doc('.item .name')
for name_html in names.items():
    name = parse_name(name_html)
    print(name)
browser.close()
```

这里定义parse\_name方法，用来解析页面源代码得到最终的标题，它接收一个参数name\_html，就是标题的HTML文本，类似：

[HTML] *纯文本查看*

```
<h3 data-v-7f1a77ef="" class="m-b-sm name">
<span data-v-7f1a77ef="" class="char" style="left: 48px;">些</span>
<span data-v-7f1a77ef="" class="char" style="left: 0px;">明</span>
<span data-v-7f1a77ef="" class="char" style="left: 64px;">事</span>
<span data-v-7f1a77ef="" class="char" style="left: 16px;">朝</span>
<span data-v-7f1a77ef="" class="char" style="left: 32px;">那</span>
<span data-v-7f1a77ef="" class="char" style="left: 80px;">儿</span>
</h3>
```
