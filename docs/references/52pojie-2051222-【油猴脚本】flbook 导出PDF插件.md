# 【油猴脚本】flbook 导出PDF插件

> **作者**: Cristy | **发布时间**: 2025-08-05 18:04:00 | **版块**: 『编程语言区』 | **查看/回复**: 4009 / 16
> **原文**: [https://www.52pojie.cn/thread-2051222-1-1.html](https://www.52pojie.cn/thread-2051222-1-1.html)

---

*本帖最后由 Cristy 于 2025-8-7 01:05 编辑*

---

### aliases: tags: author: Aura Service created: 2025-08-05T18:01:52 updated: 2025-08-05T18:01:52

#### 【油猴脚本】flbook 导出PDF插件

---

#### 更新已知问题

* 20250806 22:19
  12# 坛友提到 无效，该文章为获取图片资源后由前端组装成的电子书，这一类不在这个脚本的覆盖范围（脚本仅做了整页为图片的获取和拼接工作）
* 20250807 1:00
  补充问题2 ： 测试的新的电子书中出现 有的书的图片名称不为排序标准 。解决方法：手动调整顺序后再导出PDF（排序逻辑是：截取jpg前面的数字 从左到右依次比数字，相同过、不同比大小停止。因为自己需要的书是这个排序逻辑。）

---

#### 前言

脚本和文章均在 AI 辅助下完成，旨在为您提供更智能、更贴合实际需求的网页内容捕获工具。

#### 脚本介绍

**图片捕获与PDF合成工具** 是一套专为电子书、在线漫画等网站设计的油猴脚本，它提供了两个不同技术核心的版本，以应对不同的网站架构。

* **URL截取版**：通过监控网络请求，直接捕获图片的URL。它最适用于那些图片URL规律性强、直接暴露在网络请求中的网站。其核心优势是**智能提取URL中的数字作为文件名**，实现自动化、有序的命名。
* **图片捕获版**：通过监控页面元素（DOM）的变化来发现并捕获图片。它专为那些图片URL是动态生成（如 `blob:` 链接）或难以直接通过网络请求捕获的网站设计。其核心优势是**精准定位页面上最终显示的图片**，并采用高效队列机制下载，保证捕获的成功率。

无论使用哪个版本，您都将获得一个强大的浮动控制面板，用于启动/停止捕获、实时预览、排序图片，并最终一键合成为PDF或打包为ZIP。

![](https://iili.io/F6Q7qSS.png)![](https://iili.io/F6Q7OOX.png)

#### 如何选择合适的版本？

选择哪个脚本的关键在于目标网站加载图片的方式。请按以下步骤判断：

1. 在浏览器中按 `F12` 键打开开发者工具，切换到 **“网络 (Network)”** 选项卡。
2. 刷新电子书页面，并随意翻几页。
3. 观察网络请求列表，检查图片的URL格式：

* **情况一：使用“URL截取版”**
  如果列表中出现了完整的、包含 `https` 开头的图片请求（如下图），并且URL看起来有规律（如包含一长串数字），那么“URL截取版”是最佳选择。
  ![](https://iili.io/F6Qalna.png)
* **情况二：使用“图片捕获版”**
  如果列表中找不到清晰的图片URL，或者只看到了以 `blob:https://` 开头的请求（如下图），这说明图片数据是经过动态处理后才显示的。此时，必须使用“图片捕获版”。
  ![](https://iili.io/F6QGatI.png)

---

#### 版本一：URL截取版

此版本是通过网络监控，截取浏览器和网站之间的通信来捕获图片。

##### 主要功能与特色

1. **智能URL命名**：自动从图片URL中提取长度超过五位的数字序列作为文件名。例如，从 `https://.../1234567/page.jpg` 中提取出 `1234567.jpg`。
2. **备用命名方案**：在无法提取到长数字时，会智能地使用URL的最后一部分或时间戳作为备用名称。
3. **URL模式匹配**：用户可以自定义URL匹配规则（如 `https://*.flbook.com.cn/*`），脚本将只捕获符合该规则的图片，精确度高。
4. **规则持久化**：您自定义的URL匹配模式会被自动保存，无需每次重新设置。
5. **全面监控**：同时监控 `Fetch`、`XHR` 和 `Performance API`，确保不遗漏任何一种网络请求方式加载的图片。

##### 关键代码解析

###### 1. 文件名提取：`getNumericFilename` 函数

这是此版本的“灵魂”功能，它让文件名变得有意义且易于排序。

```
// --- 新增：从URL提取数字作为文件名的函数 ---
function getNumericFilename(url, contentType = 'image/jpeg') {
    // 查找所有长度超过5的数字序列
    const numberMatches = url.match(/\d{5,}/g);

    // 从contentType获取真实的文件后缀
    const extension = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');

    if (numberMatches && numberMatches.length > 0) {
        // 用连字符连接找到的数字，并附上后缀
        return `${numberMatches.join('-')}.${extension}`;
    }

    // --- 备用方案 ---
    // ...
}
```

* **说明**：这段代码使用正则表达式 `\d{5,}` 来查找URL中所有连续出现5次以上的数字。如果找到了，就将这些数字用连字符 `-` 连接起来，并附上正确的图片后缀（如 `.jpg`），生成一个独一无二的文件名。这对于URL中包含书籍ID或页面ID的网站非常有效。

###### 2. 网络监控：`startRequestMonitoring` 函数

为了确保捕获所有图片，脚本“劫持”了浏览器多种发起网络请求的方式。

```
function startRequestMonitoring() {
    // 劫持 window.fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) { /* ... */ };

    // 劫持 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) { /* ... */ };

    // 启动 PerformanceObserver
    startPerformanceObserver();

    return () => { /* ... 恢复原始函数 ... */ };
}
```

* **说明**：此函数通过替换浏览器内置的 `fetch` 和 `XMLHttpRequest` 函数，创建了一个“中间人”。每当网站尝试通过这些方式请求数据时，脚本会先检查这个请求的URL是否是我们想要的图片，如果是，就进行捕获。同时，`PerformanceObserver` 作为补充，可以捕获到一些通过 `<img>` 标签直接加载的资源，构成了严密的监控网络。

---

#### 版本二：图片捕获版

此版本是页面元素提取，它不关心图片如何加载，只关心图片何时出现在页面上。

##### 主要功能与特色

1. **DOM监控捕获**：使用 `MutationObserver` 实时监控页面的变化，一旦发现符合特定规则（如 class 为 `pdfimg move rendered`）的图片元素被添加到页面上，立即进行捕获。
2. **高效下载队列**：所有发现的图片都会被加入一个“待办”队列，由一个后台工作器（worker）逐一下载。这避免了因瞬间发起大量下载请求而导致浏览器卡顿或崩溃的问题。
3. **精准页码排序**：直接从图片所在的页面元素（`div`）的 `data-page` 属性中获取页码，并以此为依据进行默认排序，确保图片顺序100%正确。
4. **初始扫描**：脚本启动时，会首先扫描一次页面，将已经存在的图片直接加入捕获队列，不会错过任何内容。

##### 关键代码解析

###### 1. DOM变化监控器：`startDomMonitoring` 与 `MutationObserver`

这是此版本捕获图片的核心技术，用于监听页面元素变化。

```
function startDomMonitoring() {
    if (domObserver) return;

    const observerCallback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') { // 监视新添加的节点
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.matches('div.pdfimg.move.rendered')) {
                        discoverAndQueueImage(node);
                    }
                });
            }
        }
    };

    domObserver = new MutationObserver(observerCallback);
    domObserver.observe(document.body, { childList: true, subtree: true });
}
```

* **说明**：脚本创建了一个 `MutationObserver` 实例，并让它观察整个 `document.body` 的子节点变化 (`childList: true`)。当用户翻页，网站将新的图片元素（一个 `div`，class包含 `pdfimg move rendered`）插入到页面中时，`observerCallback` 函数就会被触发，然后调用 `discoverAndQueueImage` 函数将这个新发现的图片加入处理队列。

###### 2. 高效下载队列：`processFetchQueue` 函数

为了稳定性和流畅性，脚本没有在发现图片后立即下载，而是采用了一个有序的队列机制。

```
let fetchQueue = [];           // 待办队列
let processingUrls = new Set();  // 防止重复处理
let isWorkerRunning = false;     // 工作状态

async function processFetchQueue() {
    if (isWorkerRunning || fetchQueue.length === 0) return;

    isWorkerRunning = true;
    const item = fetchQueue.shift(); // 从队列头部取出一个任务
    statusDiv.textContent = `队列剩余: ${fetchQueue.length + 1} | 正在加载...`;

    try {
        // ...使用fetch下载图片...
        const blob = await response.blob();
        addCapturedItem({ /* ... 图片数据 ... */ });
    } catch (error) { /* ... 错误处理 ... */ }
    finally {
        isWorkerRunning = false;
        setTimeout(processFetchQueue, 50); // 处理下一个
    }
}
```

* **说明**：这是一个经典的生产者-消费者模型。`discoverAndQueueImage` 是生产者，负责往 `fetchQueue` 数组中添加任务。`processFetchQueue` 则是消费者，它一次只从队列中取出一个任务进行 `fetch` 下载。`isWorkerRunning` 标志确保了在任何时候只有一个下载任务在执行。下载完成后，它会通过 `setTimeout` 短暂延迟后再次调用自己，处理下一个任务，直到队列清空。这种机制极大地提升了脚本在处理大量图片时的稳定性和用户体验。

---

#### 通用功能与使用说明

以下功能在两个版本中都提供：

* **强大的图片处理与导出**：
  + **生成PDF**：支持“单页模式”和“两页合并”模式，并可设置封面独占一页。
  + **打包下载ZIP**：将所有选中的图片打包成一个ZIP文件，方便批量保存。
* **实时预览与排序**：
  + 在控制面板中实时显示已捕获图片的缩略图和文件名/页码。
  + 支持手动拖拽、点击上下箭头或直接输入序号来精确调整图片顺序。
* **可视化操作界面**：所有操作均通过一个直观的浮动窗口完成，并提供实时状态反馈。

##### 使用步骤

1. **安装脚本**：首先，您的浏览器需要安装 [Tampermonkey](https://www.tampermonkey.net/) (篡改猴) 或类似的脚本管理器扩展。然后根据上文 **“如何选择合适的版本？”** 的指导，安装对应的脚本。
2. **访问目标页面**：打开您需要下载的电子书或漫画页面。
3. **配置与捕获**：
   * **（URL截取版专属）检查URL模式**：确认“URL匹配模式”是否正确。
   * **自动开始**：默认勾选“自动开始捕获”，脚本加载后会立即工作。
   * **手动开始**：如未自动开始，点击 **“开始捕获”**。
   * **翻页**：像正常阅读一样，**将电子书从头到尾翻一遍**，以确保所有页面的图片都被脚本加载和捕获。
   * **停止**：所有图片加载完毕后，点击 **“停止捕获”**。
4. **整理与导出**：
   * 在捕获列表中检查图片是否完整，并根据需要进行手动排序。
   * 选择PDF或ZIP的导出选项，点击相应按钮，等待文件生成和下载。

#### 注意事项

* **适用性**：脚本主要针对特定类型的网站结构进行开发，可能存在不适用的情况。
* **必须翻页**：对于需要手动翻页才能加载新内容的网站，您必须完整翻阅一遍，否则脚本无法捕获到未加载的图片。
* **网络与性能**：捕获和生成文件的速度取决于您的网络状况和图片数量/大小。处理大量高清图片时请耐心等待。
* **跨域问题**：脚本已内置方案尝试解决跨域（CORS）限制，这能显著提高成功率，但不能保证100%成功。

#### 已知问题

* **PDF空白**：在“两页合并”模式下，书籍的最后一页如果是单数，可能会在PDF中产生多余的空白页。此问题待优化。
* **页面刷新**：在某些网站上，脚本启动后可能会导致书籍内容加载不出来（一直转圈）。通常按 `F5` 多次刷新页面可以解决。

#### 免责声明

* 本脚本仅供个人学习和技术研究使用，请勿用于任何商业或非法用途。
* 用户通过本脚本下载的任何内容，请在遵守相关法律法规和版权政策的前提下使用。
* 对于因使用本脚本而可能产生的任何版权纠纷或法律问题，脚本作者概不负责。
* 脚本作者不保证脚本的永久有效性。如果目标网站更新，本脚本可能会失效。

#### 下载

* **图片捕获与PDF合成工具 (图片捕获版 - 推荐用于 blob:https 链接)**

  + 下载: `https://wwcy.lanzouq.com/iZxvW32pewbi` 密码: `1meh`
* **图片捕获与PDF合成工具 (URL截取版 - 推荐用于标准 https 链接)**

  + 下载: `https://wwcy.lanzouq.com/ibhYb32pew9g` 密码: `5wzp`
