# 【JavaScript】csdn文章优化保存

> **作者**: hualy | **发布时间**: 2024-05-12 21:48:00 | **版块**: 『编程语言区』 | **查看/回复**: 2965 / 21
> **原文**: [https://www.52pojie.cn/thread-1923373-1-1.html](https://www.52pojie.cn/thread-1923373-1-1.html)

---

*本帖最后由 hualy 于 2024-5-13 11:55 编辑*

**关联拓展教程：**基于csdn文章优化保存的拓展教程【https://www.52pojie.cn/thread-1923542-1-1.html】

**原理  1、删除不必要的元素****2、通过浏览器自带的打印功能实现另存为PDF****3、展开文章、代码 使得能够完整保存**
**功能**  不用关注博主即可阅读全文、界面优化、保存文章（没有登录就无目录，登录了就有目录）
**使用**  油猴脚本：CSDN 文章保存  进入csdn文章页面，会显示三个按钮
![](https://attach.52pojie.cn/forum/202405/12/214110kdalvuykxrqbrzml.png)
**优化：删除不必要元素、代码展开****保存：打印当前页面****优化保存：优化页面后保存****原页面**

![](https://attach.52pojie.cn/forum/202405/12/214113r04ppepoo4rp1up0.png)

![](https://attach.52pojie.cn/forum/202405/12/214116ohsa268rs5l7mm8r.png)

![](https://attach.52pojie.cn/forum/202405/12/214119xie6wzzuia464keu.png)

**优化页面**

![](https://attach.52pojie.cn/forum/202405/12/214055z91l6y1lcv6ddcdl.png)

![](https://attach.52pojie.cn/forum/202405/12/214058qbga7g1bzh11thdb.png)

**原代码**

[JavaScript] *纯文本查看*

```

// ==UserScript==
// @name         CSDN 文章优化保存
// @version     2024-05-12
// @description csdn文章优化保存
// @author      hualy13
// @match       *://blog.csdn.net/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=csdn.net
// ==/UserScript==
(function() {
    'use strict';
    //不用关注博主即可阅读全文
    window.addEventListener('load', function() {
        // 移除 article_content 元素的内联样式
        var articleContent = document.getElementById("article_content");
        if (articleContent) {
            articleContent.removeAttribute("style");
        }

        // 移除特定的元素
        var followTextParent = document.querySelector('.follow-text')?.closest('[data-flag="follow"]');
        if (followTextParent) {
            followTextParent.remove();
        }

        var hideArticleBox = document.querySelector('.hide-article-box');
        if (hideArticleBox) {
            hideArticleBox.remove();
        }
    });
    //模拟点击
    window.addEventListener('load', function() {
    var selectors = ['.sidecolumn-hide', '.hide-preCode-bt','sidecolumn-show'];
    selectors.forEach(function(selector) {
        var element = document.querySelector(selector);
        if (element) {
            element.click();
        }
    });
});
    // 定义要删除的ID数组和类名数组
    var idsToRemove = ['csdn-toolbar', 'toolBarBox', 'recommendNps', 'toolbarBox','treeSkill'];
    var classesToRemove = ['blog_container_aside', 'recommend-box', 'comment-box', 'blog-footer-bottom', 'csdn-side-toolbar','passport-login-container'];

    // 删除指定ID和类名的元素
    function removeElements() {
        // var hideElement = document.querySelector('.sidecolumn-hide');
        // if (hideElement) {
        //     hideElement.click();
        // }
        removeElementsById(idsToRemove);
        removeElementsByClass(classesToRemove);
    }

    // 删除指定ID的元素
    function removeElementsById(ids) {
        ids.forEach(function(id) {
            var element = document.getElementById(id);
            if (element) element.parentNode.removeChild(element);
        });
    }

    // 删除指定类名的元素
    function removeElementsByClass(classes) {
        classes.forEach(function(className) {
            var elements = document.getElementsByClassName(className);
            while(elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        });
    }

    // 监听打印事件并在打印时隐藏按钮
    function setupPrintListener(buttons) {
        window.matchMedia('print').addListener(function(mql) {
            if (mql.matches) {
                // 打印开始，隐藏按钮
                buttons.forEach(function(button) {
                    button.style.display = 'none';
                });
            } else {
                // 打印结束，显示按钮
                buttons.forEach(function(button) {
                    button.style.display = '';
                });
            }
        });
    }

    // 创建按钮并添加点击事件
    var buttons = [];
    var buttonNames = ['优化', '保存', '优化保存'];

    var buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexDirection = 'column';
    buttonsContainer.style.alignItems = 'flex-end';
    buttonsContainer.style.position = 'fixed';
    buttonsContainer.style.top = '100px';
    buttonsContainer.style.right = '10px';
    buttonsContainer.style.zIndex = '1000';

    buttonNames.forEach(function(name) {
        var button = document.createElement('button');
        button.textContent = name;
        button.style.margin = '5px 0';
        button.style.padding = '10px 20px';

        // 分配点击事件
        button.onclick = function() {
            if (name === '优化保存') {
                removeElements(); // 删除元素
                window.print(); // 触发打印
            }
            else if (name === '保存') {
                window.print(); // 触发打印
            }
            else if (name === '优化') {
                removeElements(); // 删除元素
            }
        };

        buttons.push(button); // 添加按钮到数组
        buttonsContainer.appendChild(button); // 添加按钮到容器
    });

    document.body.appendChild(buttonsContainer); // 将按钮容器添加到页面

    // 设置打印事件监听器
    setupPrintListener(buttons);
})();
```

**ai优化后的主代码（减少了几行）：**

[JavaScript] *纯文本查看*

```
(function() {
    'use strict';

    // 移除 article_content 元素的内联样式
    var articleContent = document.getElementById("article_content");
    if (articleContent) {
        articleContent.removeAttribute("style");
    }

    // 移除特定的元素
    var followTextParent = document.querySelector('.follow-text')?.closest('[data-flag="follow"]');
    if (followTextParent) {
        followTextParent.remove();
    }

    var hideArticleBox = document.querySelector('.hide-article-box');
    if (hideArticleBox) {
        hideArticleBox.remove();
    }

    // 模拟点击
    function simulateClick() {
        var selectors = ['.sidecolumn-hide', '.hide-preCode-bt'];
        selectors.forEach(function(selector) {
            var elements = document.querySelectorAll(selector);
            elements.forEach(function(element) {
                if (element) {
                    element.click();
                }
            });
        });
    }

    // 删除指定ID和类名的元素
    function removeElements() {
        simulateClick();
        removeElementsById(['csdn-toolbar', 'toolBarBox', 'recommendNps', 'toolbarBox','treeSkill']);
        removeElementsByClass(['blog_container_aside', 'recommend-box', 'comment-box', 'blog-footer-bottom', 'csdn-side-toolbar','passport-login-container']);
    }

    // 删除指定ID的元素
    function removeElementsById(ids) {
        ids.forEach(function(id) {
            var element = document.getElementById(id);
            if (element) element.parentNode.removeChild(element);
        });
    }

    // 删除指定类名的元素
    function removeElementsByClass(classes) {
        classes.forEach(function(className) {
            var elements = document.getElementsByClassName(className);
            while(elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        });
    }

    // 监听打印事件并在打印时隐藏按钮
    function setupPrintListener(buttons) {
        window.matchMedia('print').addListener(function(mql) {
            buttons.forEach(function(button) {
                button.style.display = mql.matches ? 'none' : '';
            });
        });
    }

    // 创建按钮并添加点击事件
    var buttonActions = [
        { name: '优化', action: removeElements },
        { name: '保存', action: window.print },
        { name: '优化保存', action: function() { removeElements(); window.print(); } }
    ];

    var buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; position: fixed; top: 100px; right: 10px; z-index: 1000;';

    var buttons = buttonActions.map(function(action) {
        var button = document.createElement('button');
        button.textContent = action.name;
        button.style.cssText = 'margin: 5px 0; padding: 10px 20px;';

        button.onclick = action.action;

        buttonsContainer.appendChild(button);
        return button;
    });

    document.body.appendChild(buttonsContainer);

    // 设置打印事件监听器
    setupPrintListener(buttons);
})();
```

**遇到的小问题：****1、打印不全**

![](https://attach.52pojie.cn/forum/202405/12/214100cqtxhxk9h3zqhkxp.png)

![](https://attach.52pojie.cn/forum/202405/12/214103zkwkg7ycilg99yl7.png)

**2、目录显示问题【没有登录账号不显示目录,有的文章不设置目录】**

![](https://attach.52pojie.cn/forum/202405/12/214105nhah1phlz6us16zh.png)

![](https://attach.52pojie.cn/forum/202405/12/214108etwjdpdpjzu0kj70.png)

求好评呐
