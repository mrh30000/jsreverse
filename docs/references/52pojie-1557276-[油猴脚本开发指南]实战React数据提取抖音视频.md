# [油猴脚本开发指南]实战React数据提取抖音视频

> **作者**: 李恒道 | **发布时间**: 2021-12-07 15:17:00 | **版块**: 『编程语言区』 | **查看/回复**: 7789 / 13
> **原文**: [https://www.52pojie.cn/thread-1557276-1-1.html](https://www.52pojie.cn/thread-1557276-1-1.html)

---

*本帖最后由 李恒道 于 2021-12-7 15:21 编辑*

**前文**
之前我们研究过网页的校验如何解决，这节课我们可以实战一下提取react页面的数据
我发现抖音是react页面
本文基于cxxjackie提供的理论，再次感谢
**开始**依然以抖音页面为例https://www.douyin.com/user/MS4wLjABAAAA\_\_EF83GW-y2bDHV0jmune1pZFG1TRajSgvywS7KYGbQ

![](https://attach.52pojie.cn/forum/202112/07/151253l53t92ane6m83w3f.png)

如何判断是react页面？我们可以安装React Developer Tools
如果不是则显示

![](https://attach.52pojie.cn/forum/202112/07/151307obm3mhoup7ogj777.png)

如果是页面则显示

![](https://attach.52pojie.cn/forum/202112/07/151318pex4u34yt0x43suu.png)

但是注意，这个可能存在问题，最准确的还是打开页面进行调试
比如输出window.\_\_查看是否存在react属性

![](https://attach.52pojie.cn/forum/202112/07/151332oh6452th8lt6c52d.png)

确定是react页面后，我们可以安装插件，然后点击这里

![](https://attach.52pojie.cn/forum/202112/07/151345ge1cjbg9p9jgmfpl.png)

然后通过

![](https://attach.52pojie.cn/forum/202112/07/151401tpgiulkcgais8y5u.png)

选择到元素
注意，推荐选择到相应元素的最上级，然后一层一层往下找相关的数据以及事件
我们在这里找到了视频的信息

![](https://attach.52pojie.cn/forum/202112/07/151416zcldz111el88cctt.png)

这时候我们就可以开始写代码了
首先他第一页是没有post的，属于网页渲染出来的数据，但是这时候也可以使用react属性提取地址，相对之前的xhr劫持会好很多。
我们先获取第一页的内容，然后进行mutationobserve监听视频部分的绘制
并抽离一个函数，专门用于处理对象，我起名叫ControlShowCheckAndNew

[JavaScript] *纯文本查看*

```
let list=document.querySelectorAll('.knrjsN15 ul li')
const targetNode = document.querySelector('.knrjsN15 ul')
// 观察器的配置（需要观察什么变动）
const config = {
    childList: true, // 观察目标子节点的变化，添加或删除
    attributes: true, // 观察属性变动
    subtree: true, //默认是false，设置为true后可观察后代节点
};

// 当观察到变动时执行的回调函数
const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    console.log('mutationsList',mutationsList)
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((item)=>{
                ControlShowCheckAndNew(item)
            })
        }
    }
};
// 创建一个观察器实例并传入回调函数
const observer = new MutationObserver(callback);
// 以上述配置开始观察目标节点
observer.observe(targetNode, config);
unsafeWindow.onload=()=>{
    //处理循环
list.forEach((item)=>{
    ControlShowCheckAndNew(item)
})
}
```

然后我们还需要插入一个按钮，用于提取数据

![](https://attach.52pojie.cn/forum/202112/07/151446mwy8qnnyiqw3g1zm.png)

这里的innerHTML是直接改的网页按钮，然后复制粘贴的

[JavaScript] *纯文本查看*

```
let parenttagert=document.querySelector('.Z0NF3RWY')
let div=document.createElement("div");
div.innerHTML=`<div class="q6zgm94p k-vFWw3W FDOWibym BgSUKoKp"><span class="_891e9d38c00e1b78e2eae43ab8b92359-scss" style="cursor: pointer;">复制视频</span><div class="_421d3aff42f03ac25665dc94de7ceadb-scss _6e84962fcb7da3b1e8100d798c94fd0a-scss" style="display: none;"><div class="a508b8e520c4938b699e76f52758e1b5-scss"><div class="f34e96e88162611d7208f348d4f89234-scss"><img src="//p6.douyinpic.com/img/aweme-qrcode/HfLOWW6996335373702006541~c5_720x720.png?from=1247829622" alt="3.82 wfB:/ 这样子的小风车你们喜欢吗～%%夹子音 %%夹子音挑战 %%夹子音变装 @DOU+小助手 @抖音小助手  https://v.douyin.com/d1FgV77/ 复制此链接，打开Dou音搜索，直接观看视频！" class=""></div></div><div class="c970dfb43b7e68344f353625de339de0-scss"><div class="_6ed090956a2566bf4d47a648b75d87ef-scss">打开抖音扫码或复制口令粘贴给微信/QQ好友</div><div class="_5d025eb178c1c97d99eb9717cb4f0290-scss"><span class="_95cfb8df7d5be42fc93f8f4464a1c648-scss">3.82 wfB:/ 这样子的小风车你们喜欢吗～%%夹子音 %%夹子音挑战 %%夹子音变装 @DOU+小助手 @抖音小助手  https://v.douyin.com/d1FgV77/ 复制此链接，打开Dou音搜索，直接观看视频！</span><button class="abace09bde29f9d2077ba2a9e9e2b67d-scss _3c25ad295260cb707e35da1ec8d93a51-scss _14339689bca6b9eda19c146a14df625e-scss _047cfcad258573fad8a7513577bb9f75-scss"><span>复制</span></button></div></div></div></div>`
div.onclick=function(event){
    let size=Object.keys(saveurl)
    let text=size.join('\n')
    GM_setClipboard(text)
    alert('已设置到剪辑版共'+size.length+"个")
};
parenttagert.append(div);
```

接下来我们要开始写核心功能函数了
我对网页插入了一个单选框以及一个new的标签提示，这时候mutationobserver也会监听到，所以一旦检测到就不进行任何操作
然后判断是否存在prop属性，如果不存在也直接跳过
找到的话则直接根据targer的react属性的children.props.aweInfo提取出来数据
进行一些处理，然后插入一个new标签以及一个单选框

![](https://attach.52pojie.cn/forum/202112/07/151512zk545tr25bv5aumv.png)

NEW标签如下

![](https://attach.52pojie.cn/forum/202112/07/151527cg2wt37ci72o6eo2.png)

代码如下

[JavaScript] *纯文本查看*

```
function ControlShowCheckAndNew(target){
    if(target.className.indexOf('injectvideo')!=-1){
        return true;
    }
    if(target.className.indexOf('control-pos')!=-1){
        return true;
    }
    const prop = Object.keys(target).find(p => p.startsWith('__reactProps'));
    if(prop===undefined){
        return;
    }
    let info=target[prop].children.props.awemeInfo
    if(info===undefined){
        console.log('test')
    }
    let createTime=info.createTime*1000
    let videourl=info.video.playApi
    videourl='https://'+videourl.replace('https://','').replace('http://','').replace('//','')
    target.classList.add('injectvideo')
    var select=document.createElement('label')
    select.className='container control-pos'
    select.innerHTML=` <input  type="checkbox"><div class="checkmark"></div>`
    target.append(select)
    select.onclick=()=>{
        console.log('选中变化了',select.children[0].checked)
        if(select.children[0].checked){
            //选中
            saveurl[videourl]=true;
        }else{
            //未选中
            if(saveurl[videourl]){
                delete saveurl[videourl]
            }
        }
    }
    var getdate=new Date(createTime)
    if(fullyear===getdate.getFullYear()){
        if(currentmonth===getdate.getMonth()){
            if(currentday===getdate.getDate()){
                console.log('选中新的')
                let newbutton=document.createElement('button')
                newbutton.innerText='NEW'
                newbutton.classList.add('newbutton')
                target.append(newbutton)

            }
        }
    }
}
```

这里我设置了一个对象用于存储到底选中了哪个视频，一旦选中了，则设置到对象上，如果取消选中，则相应的删除对象
关于按钮的样式，我是从https://cssbuttons.io/找的

![](https://attach.52pojie.cn/forum/202112/07/151554g55w58gzpevm8vgb.png)

这里有很多好看的样式，我们可以直接对抄出来
设置CSS的时候可以通过GM函数设置，也可以创建CSS标签
这里为了演示，所以我这里选择创建了CSS标签，然后插入

[JavaScript] *纯文本查看*

```
let cssstyle = document.createElement("style");
cssstyle.innerHTML =(`
.injectvideo{
position: relative;
}
.control-pos{
bottom: 20.5px;
right: 12.1px;
     position: absolute;
}
.container input {
 position: absolute;
 opacity: 0;
 cursor: pointer;
 height: 0;
 width: 0;
}

.container {
 display: block;
 cursor: pointer;
 font-size: 20px;
 user-select: none;
}

/* Create a custom checkbox */
.checkmark {
 position: relative;
 top: 0;
 left: 0;
 height: 1.3em;
 width: 1.3em;
 background-color: #ccc;
 border-radius: 25px;
 transition: 0.15s;
}

/* When the checkbox is checked, add a blue background */
.container input:checked ~ .checkmark {
 background-color: #ff4242;
 border-radius: 25px;
 transition: 0.15s;
}

/* Create the checkmark/indicator (hidden when not checked) */
.checkmark:after {
 content: "";
 position: absolute;
 display: none;
}

/* Show the checkmark when checked */
.container input:checked ~ .checkmark:after {
 display: block;
}

/* Style the checkmark/indicator */
.container .checkmark:after {
 left: 0.45em;
 top: 0.25em;
 width: 0.25em;
 height: 0.5em;
 border: solid white;
 border-width: 0 0.15em 0.15em 0;
 transform: rotate(45deg);
}
.newbutton,
.newbutton::after {
 padding: 5px 4px;
 font-size: 18px;
 background: linear-gradient(45deg, transparent 5%, #ff013c 5%);
 border: 0;
 color: #fff;
 letter-spacing: 3px;
 line-height: 1;
 box-shadow: 6px 0px 0px #00e6f6;
 outline: transparent;
 position: relative;
}

.newbutton::after {
 --slice-0: inset(50% 50% 50% 50%);
 --slice-1: inset(80% -6px 0 0);
 --slice-2: inset(50% -6px 30% 0);
 --slice-3: inset(10% -6px 85% 0);
 --slice-4: inset(40% -6px 43% 0);
 --slice-5: inset(80% -6px 5% 0);
 content: "HOVER ME";
 display: block;
 position: absolute;
 top: 0;
 left: 0;
 right: 0;
 bottom: 0;
 background: linear-gradient(45deg, transparent 3%, #00e6f6 3%, #00e6f6 5%, #ff013c 5%);
 text-shadow: -3px -3px 0px #f8f005, 3px 3px 0px #00e6f6;
 clip-path: var(--slice-0);
}

.newbutton:hover::after {
 animation: 1s glitch;
 animation-timing-function: steps(2, end);
}
.newbutton{
position: absolute;
left: 15.5px;
top: 0;
}
`);
document.body.appendChild(cssstyle);
```

那么到这里我们就学会了如何提取react数据来实现提取抖音视频~**结语**
撒花~
完整代码

[JavaScript] *纯文本查看*

```
// ==UserScript==
// [url=home.php?mod=space&uid=170990]@name[/url]         抖音下载脚本V0.1
// [url=home.php?mod=space&uid=467642]@namespace[/url]    http://tampermonkey.net/
// [url=home.php?mod=space&uid=1248337]@version[/url]      0.1
// @description  try to take over the world!
// [url=home.php?mod=space&uid=686208]@AuThor[/url]       LHD
// [url=home.php?mod=space&uid=195849]@match[/url]        https://www.douyin.com/user/*
// [url=home.php?mod=space&uid=593100]@Icon[/url]         https://www.google.com/s2/favicons?domain=douyin.com
// [url=home.php?mod=space&uid=609072]@grant[/url]        unsafeWindow
// @grant        GM_setClipboard
// ==/UserScript==
let saveurl={}
var current=new Date()
let fullyear=current.getFullYear()
let currentmonth=current.getMonth()
let currentday=current.getDate()
function ControlShowCheckAndNew(target){
    if(target.className.indexOf('injectvideo')!=-1){
        return true;
    }
    if(target.className.indexOf('control-pos')!=-1){
        return true;
    }
    const prop = Object.keys(target).find(p => p.startsWith('__reactProps'));
    if(prop===undefined){
        return;
    }
    let info=target[prop].children.props.awemeInfo
    if(info===undefined){
        console.log('test')
    }
    let createTime=info.createTime*1000
    let videourl=info.video.playApi
    videourl='https://'+videourl.replace('https://','').replace('http://','').replace('//','')
    target.classList.add('injectvideo')
    var select=document.createElement('label')
    select.className='container control-pos'
    select.innerHTML=` <input  type="checkbox"><div class="checkmark"></div>`
    target.append(select)
    select.onclick=()=>{
        console.log('选中变化了',select.children[0].checked)
        if(select.children[0].checked){
            //选中
            saveurl[videourl]=true;
        }else{
            //未选中
            if(saveurl[videourl]){
                delete saveurl[videourl]
            }
        }
    }
    var getdate=new Date(createTime)
    if(fullyear===getdate.getFullYear()){
        if(currentmonth===getdate.getMonth()){
            if(currentday===getdate.getDate()){
                console.log('选中新的')
                let newbutton=document.createElement('button')
                newbutton.innerText='NEW'
                newbutton.classList.add('newbutton')
                target.append(newbutton)

            }
        }
    }
}

let list=document.querySelectorAll('.knrjsN15 ul li')
const targetNode = document.querySelector('.knrjsN15 ul')
// 观察器的配置（需要观察什么变动）
const config = {
    childList: true, // 观察目标子节点的变化，添加或删除
    attributes: true, // 观察属性变动
    subtree: true, //默认是false，设置为true后可观察后代节点
};

// 当观察到变动时执行的回调函数
const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    console.log('mutationsList',mutationsList)
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((item)=>{
                ControlShowCheckAndNew(item)
            })
        }
    }
};
// 创建一个观察器实例并传入回调函数
const observer = new MutationObserver(callback);
// 以上述配置开始观察目标节点
observer.observe(targetNode, config);
unsafeWindow.onload=()=>{
    //处理循环
list.forEach((item)=>{
    ControlShowCheckAndNew(item)
})
}

let parenttagert=document.querySelector('.Z0NF3RWY')
let div=document.createElement("div");
div.innerHTML=`<div class="q6zgm94p k-vFWw3W FDOWibym BgSUKoKp"><span style="cursor: pointer;">复制视频</span></div>`
div.onclick=function(event){
    let size=Object.keys(saveurl)
    let text=size.join('\n')
    GM_setClipboard(text)
    alert('已设置到剪辑版共'+size.length+"个")
};
parenttagert.append(div);
let cssstyle = document.createElement("style");
cssstyle.innerHTML =(`
.injectvideo{
position: relative;
}
.control-pos{
bottom: 20.5px;
right: 12.1px;
     position: absolute;
}
.container input {
 position: absolute;
 opacity: 0;
 cursor: pointer;
 height: 0;
 width: 0;
}

.container {
 display: block;
 cursor: pointer;
 font-size: 20px;
 user-select: none;
}

/* Create a custom checkbox */
.checkmark {
 position: relative;
 top: 0;
 left: 0;
 height: 1.3em;
 width: 1.3em;
 background-color: #ccc;
 border-radius: 25px;
 transition: 0.15s;
}

/* When the checkbox is checked, add a blue background */
.container input:checked ~ .checkmark {
 background-color: #ff4242;
 border-radius: 25px;
 transition: 0.15s;
}

/* Create the checkmark/indicator (hidden when not checked) */
.checkmark:after {
 content: "";
 position: absolute;
 display: none;
}

/* Show the checkmark when checked */
.container input:checked ~ .checkmark:after {
 display: block;
}

/* Style the checkmark/indicator */
.container .checkmark:after {
 left: 0.45em;
 top: 0.25em;
 width: 0.25em;
 height: 0.5em;
 border: solid white;
 border-width: 0 0.15em 0.15em 0;
 transform: rotate(45deg);
}
.newbutton,
.newbutton::after {
 padding: 5px 4px;
 font-size: 18px;
 background: linear-gradient(45deg, transparent 5%, #ff013c 5%);
 border: 0;
 color: #fff;
 letter-spacing: 3px;
 line-height: 1;
 box-shadow: 6px 0px 0px #00e6f6;
 outline: transparent;
 position: relative;
}

.newbutton::after {
 --slice-0: inset(50% 50% 50% 50%);
 --slice-1: inset(80% -6px 0 0);
 --slice-2: inset(50% -6px 30% 0);
 --slice-3: inset(10% -6px 85% 0);
 --slice-4: inset(40% -6px 43% 0);
 --slice-5: inset(80% -6px 5% 0);
 content: "HOVER ME";
 display: block;
 position: absolute;
 top: 0;
 left: 0;
 right: 0;
 bottom: 0;
 background: linear-gradient(45deg, transparent 3%, #00e6f6 3%, #00e6f6 5%, #ff013c 5%);
 text-shadow: -3px -3px 0px #f8f005, 3px 3px 0px #00e6f6;
 clip-path: var(--slice-0);
}

.newbutton:hover::after {
 animation: 1s glitch;
 animation-timing-function: steps(2, end);
}
.newbutton{
position: absolute;
left: 15.5px;
top: 0;
}
`);
document.body.appendChild(cssstyle);
```
