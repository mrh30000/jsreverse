# [JS] 监听 checkbox.checked 的变化

> **作者**: 三滑稽甲苯 | **发布时间**: 2023-05-03 21:30:00 | **版块**: 『编程语言区』 | **查看/回复**: 3409 / 4
> **原文**: [https://www.52pojie.cn/thread-1781066-1-1.html](https://www.52pojie.cn/thread-1781066-1-1.html)

---

*本帖最后由 三滑稽甲苯 于 2023-5-3 21:32 编辑*

## 问题

看到这个标题，可能有的观众会问了：“这不是添加一个 `change` 的 EventListener 就好了吗？”

让我先叙述一下完整的问题：

> 有一个形如 `<input type="checkbox" id="checkbox">` 的 checkbox，我想要在 `checkbox.checked` 改变时被通知，包括被用户勾选以及被脚本改变时。

在这种情况下，`checkbox.addEventListener("change", () => {console.log(checkbox.checked);})` 设置的 EventListener 只会在点击 checkbox 时被调用，并不会在脚本更改它的值时被调用。

## 解决过程

我第一个想到的解法也是 EventListener，但是直接监听 `change` 事件没法监听脚本的改动。那么自然想到了 `Object.defineProperty`。

```
var _val = checkbox.checked;
Object.defineProperty(checkbox, "checked", {
    get: () => {
        return _val;
    },
    set: (val) => {
        _val = val;
        console.log(_val);
    }
})
```

这么干应该可以解决这个问题。但是实际上脚本更改了值后 checkbox 的外观没有改变，用户点击了 checkbox 后脚本得到的值没有改变。于是上 stackoverflow 上查找解决方案。经提示后找到了[这个回答](https://stackoverflow.com/a/68426166/16468609)：

![](https://attach.52pojie.cn/forum/202305/03/212922d6xdz2sghysu71yc.jpg)

于是我稍作改动，得到了可行的代码：

```
const { get, set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
Object.defineProperty(checkbox, 'checked', {
    get() {
        return get.call(this);
    },
    set(newVal) {
        console.log(`Setting "checked" property to "${newVal}"...`);
        return set.call(this, newVal);
    }
});
```

只能说我的思路没错，还是欠了点火候。

## 通用适配

高端的解决方案往往采用最简单的调用方式。还记得开头的 EventListener 吗？如果我们在得知 checkbox.checked 被更改后发送事件 "change"，那么添加的 EventListener 不就可以同时得知脚本更改事件了吗？于是有了以下代码：

```
function patch(checkbox) {
    const { get, set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
    Object.defineProperty(checkbox, 'checked', {
        get() {
            // If you want to monitor the retrieval of the `checked` property, uncomment the line below and do whatever you like...
            // console.log('Getting "checked" property...');
            return get.call(this);
        },
        set(newVal) {
            // console.log(`Setting "checked" property to "${newVal}"...`); // Debug
            this.dispatchEvent(new Event("change"));
            return set.call(this, newVal);
        }
    });
}
```

这样子，当我们想要监听某个 checkbox.checked 的更改（包括用户勾选以及脚本更改）时，只需调用 `patch(checkbox)`，随后正常 `addEventListener` 即可。若想要区分是用户更改还是脚本更改，只需检查 Event 的 `isTrusted` 即可。

## MWE 最小工作示例

```
<!DOCTYPE html>
<html>
    <head>
        <title>Checkbox patch test</title>
    </head>
    <body>
        <p><a href="https://github.com/PRO-2684/gadgets/tree/main/checkbox_patch">Github repo</a>, licensed under gpl 3.0.</p>
        <p>Checkbox -> <input type="checkbox"></p>
        <p>Click to set value <code>checked</code> via script -> <button>CLICK ME</button></p>
        <p>You will be able to see below when <code>change</code> event is detected.</p>
        <div id="result"></div>
        <script>
            function patch(checkbox) {
                const { get, set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
                Object.defineProperty(checkbox, 'checked', {
                    get() {
                        return get.call(this);
                    },
                    set(newVal) {
                        this.dispatchEvent(new Event("change"));
                        return set.call(this, newVal);
                    }
                });
            }
        </script>
        <script>
            let checkbox = document.querySelector('input[type="checkbox"]');
            patch(checkbox);
            function setChecked() {
                checkbox.checked = !checkbox.checked;
            }
            checkbox.addEventListener("change", (e) => {
                console.log(e);
                let ele = document.createElement("p");
                ele.innerText = `Change event detected! isTrusted: ${e.isTrusted}; Timestamp: ${e.timeStamp};`;
                result.appendChild(ele);
            })
        </script>
    </body>
</html>
```

![](https://attach.52pojie.cn/forum/202305/03/213234zzlz597xvn8tf40l.jpg)

## 开源地址

<https://github.com/PRO-2684/gadgets/blob/main/checkbox_patch>
