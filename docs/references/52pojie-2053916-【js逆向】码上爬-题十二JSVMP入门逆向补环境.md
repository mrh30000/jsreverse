# 【js逆向】码上爬-题十二JSVMP入门逆向补环境

> **作者**: R44 | **发布时间**: 2025-08-17 12:42:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6794 / 30
> **原文**: [https://www.52pojie.cn/thread-2053916-1-1.html](https://www.52pojie.cn/thread-2053916-1-1.html)

---

*本帖最后由 R44 于 2025-8-18 14:22 编辑*

声明
本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责

站点：aHR0cHM6Ly9tYXNoYW5ncGEuY29tL3Byb2JsZW0tZGV0YWlsLzEyLw==

一、抓包

---

很明显可以看到接口需要生成m值，t是时间戳。
通过XHR断点，向上查找堆栈，找到m值生成的地方。

![](https://attach.52pojie.cn/forum/202508/17/225440whhyzbwed3ozushe.png)

观察整个js代码可以发现是经过混淆的jsvmp。我是通过补环境来逆向M值，直接开始。
二、补环境

---

将整个js代码直接拿到本地执行，看报错。

![](https://attach.52pojie.cn/forum/202508/17/115009v6ttyxsveh5g4oc3.png)

报错ajax方法未定义，浏览器环境中，ajax引入了JQuery，本地执行的话需要构造整个方法。将执行ajax方法引入到全局，构造ajax。

![](https://attach.52pojie.cn/forum/202508/17/115730sylm33hqm1uxh23z.png)

![](https://attach.52pojie.cn/forum/202508/17/115630af711j3ql27k6912.png)

再次执行

![](https://attach.52pojie.cn/forum/202508/17/115936bwwkjhjq0608mp0j.png)

直接挂代理看报错。（代理的代码可以百度搜一下）

![](https://attach.52pojie.cn/forum/202508/17/120636m37695z6cxo9cg8m.png)

这里报错并断住，观察报错位置，补对应的方法。

![](https://attach.52pojie.cn/forum/202508/17/120947gdeu9r0sdxro90ya.png)

继续运行，观察代理结果为undefined的日志。补上之后是这样的。

[JavaScript] *纯文本查看*

```
window = global;
$_ajax = {
       'ajax':function(){
        console.log(arguments)
    },
}
window['$'] = $_ajax;
class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;

    // 基本绘图属性
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;

    // 文本相关属性
    this.font = '10px sans-serif'; // 默认字体
    this.textAlign = 'start'; // 文本对齐方式: start, end, left, right, center
    this.textBaseline = 'alphabetic'; // 文本基线: top, hanging, middle, alphabetic, ideographic, bottom
    this.direction = 'ltr'; // 文本方向: ltr, rtl, inherit
    this.letterSpacing = '0px'; // 字间距
    this.wordSpacing = '0px'; // 词间距
  }

  // 文本绘制方法 - 填充文本
  fillText(text, x, y, maxWidth) {
    let logMessage = `填充文本: "${text}" 在位置 (${x}, ${y})`;
    logMessage += `, 字体: ${this.font}`;
    logMessage += `, 对齐: ${this.textAlign}`;
    logMessage += `, 基线: ${this.textBaseline}`;

    if (maxWidth) {
      logMessage += `, 最大宽度: ${maxWidth}`;
    }

    console.log(logMessage);
  }

  // 文本绘制方法 - 描边文本
  strokeText(text, x, y, maxWidth) {
    let logMessage = `描边文本: "${text}" 在位置 (${x}, ${y})`;
    logMessage += `, 字体: ${this.font}`;
    logMessage += `, 对齐: ${this.textAlign}`;
    logMessage += `, 基线: ${this.textBaseline}`;
    logMessage += `, 描边颜色: ${this.strokeStyle}`;

    if (maxWidth) {
      logMessage += `, 最大宽度: ${maxWidth}`;
    }

    console.log(logMessage);
  }

  // 测量文本宽度
  measureText(text) {
    // 模拟文本测量，实际实现会更复杂
    const avgCharWidth = parseInt(this.font) * 0.5; // 假设平均字符宽度是字体大小的一半
    const width = text.length * avgCharWidth;

    console.log(`测量文本 "${text}" 宽度: ${width}px`);

    return {
      width: width,
      // 模拟其他可能的测量属性
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: width,
      actualBoundingBoxAscent: parseInt(this.font),
      actualBoundingBoxDescent: 0
    };
  }

  // 原有绘图方法
  fillRect(x, y, width, height) {
    console.log(`填充矩形: x=${x}, y=${y}, width=${width}, height=${height}, 颜色=${this.fillStyle}`);
  }

  strokeRect(x, y, width, height) {
    console.log(`绘制矩形边框: x=${x}, y=${y}, width=${width}, height=${height}, 颜色=${this.strokeStyle}, 线宽=${this.lineWidth}`);
  }

  clearRect(x, y, width, height) {
    console.log(`清除矩形区域: x=${x}, y=${y}, width=${width}, height=${height}`);
  }

  beginPath() {
    console.log('开始新路径');
  }

  moveTo(x, y) {
    console.log(`移动到点: (${x}, ${y})`);
  }

  lineTo(x, y) {
    console.log(`绘制线段到点: (${x}, ${y})`);
  }

  stroke() {
    console.log(`绘制路径，颜色=${this.strokeStyle}, 线宽=${this.lineWidth}`);
  }

  fill() {
    console.log(`填充路径，颜色=${this.fillStyle}`);
  }
}

// 模拟HTMLCanvasElement构造函数
class HTMLCanvasElement {
  constructor() {
    this.width = 1463;
    this.height = 915;
    this.tagName = 'CANVAS';
    this.style = {
      width: '',
      height: '',
      border: '',
    };

    this._context2d = new MockCanvasRenderingContext2D(this);
  }

  getContext(contextType) {
    if (contextType === '2d') {
      return this._context2d;
    }
    console.warn(`不支持的上下文类型: ${contextType}`);
    return null;
  }

  toDataURL(type = 'image/png') {
    return `data:${type};base64,simulatedCanvasData`;
  }

  addEventListener(eventName, callback) {
    console.log(`添加事件监听器: ${eventName}`);
  }

  removeEventListener(eventName, callback) {
    console.log(`移除事件监听器: ${eventName}`);
  }
}
// 使用示例
canvas = new HTMLCanvasElement();
setAttribute = function (arg){
    console.log('setAttribute--->',arg)
}
div_dom = {
    setAttribute: setAttribute
}
createElement = function(tagName){
    console.log('createElement--->',arguments)
    if (tagName === 'canvas'){
        return canvas
    }
    if (tagName === 'div'){
        return div_dom
    }
}
document = {
  createElement:createElement
}

// navigator
navigator = {}

//location
location = {}

//history
history = {}

//screen
screen = {}

//localStorage
localStorage = {}
```

再次运行。发现不报错了。

![](https://attach.52pojie.cn/forum/202508/17/122725bpjvzuexyyjf4oyu.png)

将后面的翻页加载改造一下，打印对应的日志。

![](https://attach.52pojie.cn/forum/202508/17/122848kxz7ebzbbbepbezb.png)

执行发现报错。

![](https://attach.52pojie.cn/forum/202508/17/123040x4za2ansjx8hhk6j.png)

Debug调试一下。

![](https://attach.52pojie.cn/forum/202508/17/123228grzjqw03jsg3ffd3.png)

发现生成了m值，但是缺少extend方法。

![](https://attach.52pojie.cn/forum/202508/17/123630mweqk704weq4gfce.png)

补上之后，导出到全局。直接出值。

![](https://attach.52pojie.cn/forum/202508/17/123815u3c3qy3cgyqegjff.png)

结果验证

---

![](https://attach.52pojie.cn/forum/202508/17/123954lf4f7woiygytjq3x.png)
