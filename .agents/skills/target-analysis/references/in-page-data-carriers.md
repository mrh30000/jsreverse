# 页面直出数据载体与列表采集驱动

> **本文回答一件事**：**「网络面板里没有数据接口，但页面上明明有数据」时，数据藏在哪、怎么取。**
>
> 适用信号：
> - 列表页首屏就有数据，Network 里却只有一个文档请求（SSR / 直出）；
> - 数据接口确实有，但要「滚动到底 / 点分页」才发出来（**驱动**问题，不是**解密**问题）；
> - 你已经拿到了接口响应，需要把它**批量落盘**（导出 CSV）。
>
> **不在本文范围**：接口返回的字段是密文（那是 `../../web-reverse-algorithm/SKILL.md`）、
> 分片流媒体（`../../stream-drm-reverse/SKILL.md`）。

---

## 1. 判据：先分清「没有接口」还是「没触发」

| 现象 | 结论 | 去哪 |
| --- | --- | --- |
| 首屏数据在，Network 里**只有一个文档请求** | **SSR / 直出**：数据被嵌在 HTML 里 | §2 |
| 首屏数据在，Network 里有一个文档请求 + 几个 `_next` / `.js` | SSR + 水合（Next.js 系） | §2（先看 `__NEXT_DATA__`） |
| 滚动 / 点分页**之后**才出现 XHR | 数据接口存在，只是**没被触发** | §3 |
| XHR 出现但响应体是乱码 | 不是本文范围 | 转 `../../web-reverse-algorithm/SKILL.md` |

> **纪律**：**先分清是「没有接口」还是「没触发」。** 把「没触发」当成「没接口」去翻 DOM，
> 会在一个只有 20 条数据的首屏上耗掉一整轮；把「没接口」当成「没触发」去写滚动脚本，
> 会一直滚到页面底部发现一条请求都没有。

## 2. 直出载体清单（按命中率排序）

| 载体 | 形态 | 提取 | 备注 |
| --- | --- | --- | --- |
| `<script id="RENDER_DATA">` | **URL-encoded JSON** 整段塞在 script 标签里 | `JSON.parse(decodeURIComponent(el.innerHTML))` | 抖音系（来源 `52pojie-1814333`） |
| `<script id="__NEXT_DATA__" type="application/json">` | 明文 JSON | `JSON.parse(el.textContent)` | Next.js；数据在 `props.pageProps` 下 |
| `window.__INITIAL_STATE__` / `window.__NUXT__` | 页面内联 JS 赋值 | 控制台直接读，或正则抠 | 服务端注入，通常已是对象 |
| `<script type="application/ld+json">` | schema.org JSON-LD | `JSON.parse` | 常见于商品页/文章页，字段名是**通用词**（`name` / `offers`） |
| `data-*` 属性 / `<textarea>` / HTML 注释 | 零散字段 | 选择器 + `dataset` | 只有少量字段时用 |

**动作顺序**：

```js
// ① 先枚举候选载体（别一上来就写解析）
[...document.querySelectorAll("script[id],script[type='application/json'],script[type='application/ld+json']")]
  .map(s => ({ id: s.id, type: s.type, len: s.textContent.length }))
```

```bash
# ② 拿到那一坨之后，务必先试 decodeURIComponent 再 parse
browsercli call evaluate_script --function "() => { const s=document.getElementById('RENDER_DATA'); if(!s) return 'none'; let t=s.innerHTML; try { return JSON.stringify(JSON.parse(decodeURIComponent(t))).slice(0,200); } catch(e) { try { return JSON.stringify(JSON.parse(t)).slice(0,200); } catch(e2) { return 'decode failed: '+e2.message; } } }"
```

> **判据（一句话）**：**`decodeURIComponent` 先试，parse 失败再试原样**。
> URL-encoded 的那一坨直接 `JSON.parse` 会失败，而**失败信息不会告诉你「其实需要 decode」**。

**从直出载体里取字段的三条纪律**：

1. **字段路径要打印整棵树的第一层**（`Object.keys(data)`），不要按记忆猜路径；
   抖音这例的第一层 key 里混着 `_location` / `app` 这类**非业务键**，必须先剔除再遍历。
2. **同一份数据里，用户信息在 `user.user.user`、作品列表在 `user.post.data`** ——
   **嵌套层级是站点自己的，不要按通用模型假设**。
3. **直出数据可能是"首屏快照"**：滚动之后新增的内容**不会**回到这个载体里
   ⇒ 载体负责首屏，`§3` 负责增量。

## 3. 增量：接口截获 + 滚动驱动

### 3.1 XHR 响应截获（★ 两个静默陷阱）

```js
const originSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (...args) {
  this.addEventListener("load", function () {          // ← 用 addEventListener，不要覆盖 onreadystatechange
    if (this.responseURL && this.responseURL.includes("/aweme/v1/web/aweme/post")) {
      try { window.__collected = (window.__collected || []).concat(JSON.parse(this.response).aweme_list || []); } catch (e) {}
    }
  });
  return originSend.apply(this, args);
};
```

| 陷阱 | 现象 | 原因 |
| --- | --- | --- |
| **★ 用了 `this._url` 判断目标接口** | 条件**永远不成立**、静默一条都不收；看起来"截获装好了" | **`_url` 不是标准属性**（来源 `52pojie-1814333` 的脚本里就是 `self._url`）⇒ 必须用 **`this.responseURL`**（或 `this.open` 时自己记下的 URL） |
| **覆盖 `this.onreadystatechange`** | 页面自己的回调被顶掉、页面行为异常 | 那是**页面在用的**属性；只加监听，不要抢。用 `addEventListener("load")` 或 `onloadend` |

> **自检方法**：截获装好后**先打印一次命中的 URL**。
> 一条都不打印 ⇒ 先怀疑判断条件写错（`_url` 那一类），而不是怀疑请求没发生。
> 这与 `../../web-reverse-hook/SKILL.md` 里 cookie hook 的教训同型：
> **「装完之后页面还正常、且能打印出预期的东西才算装对」**。

### 3.2 滚动驱动（无限列表）

```js
const SCROLL_DELAY = 1000;
const t = setInterval(() => {
  const atBottom = (window.scrollY || document.documentElement.scrollTop || 0)
                 >= (document.body.scrollHeight - window.innerHeight);
  if (atBottom) { console.log("reached bottom"); clearInterval(t); return; }
  window.scrollTo(0, document.body.scrollHeight);
}, SCROLL_DELAY);
```

**三条判据**：

| 现象 | 结论 |
| --- | --- |
| 到底了、也 `clearInterval` 了，但数据条数不再增长 | **滚动不是唯一触发条件**：可能要**点"加载更多"按钮**、要**切 tab**、或有**分页参数** |
| 滚动后请求又发了一次同一个"第 1 页" | 站点用的是**页码/游标**而不是无限滚动 ⇒ 直接驱动那个参数（比滚屏稳定得多） |
| 滚到底后页面高度**又变长了** | 正常（"假到底"）⇒ `atBottom` 的判断要在**每次滚完的下一轮**再算（上面的写法天然如此） |

> **性价比排序**：**能直接驱动分页参数 > 能点击"加载更多" > 滚屏**。
> 滚屏是**最不可控**的一种（渲染节流、懒加载、动画都会影响），只是"不用找参数"。

### 3.3 落盘

浏览器侧导出用 Blob + `<a download>`（不需要后端）：

```js
function saveText(text, filename) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename.replace(/[\\/:*?"<>|]/g, "");
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- **CSV 的次序**：先写「表头行」，再写每行数据；**字段里含逗号/换行时必须加引号**（否则列会串）。
- `\ufeff`（BOM）是给 Excel 认 UTF-8 的，**别丢**（否则中文表头乱码）。
- 大量数据别拼一个巨大字符串，**分片落盘**（`Blob` 数组 + `new Blob(parts)`）。

## 4. 排错速查

| 现象 | 首查 | 次查 |
| --- | --- | --- |
| `document.getElementById('RENDER_DATA')` 是 `null` | 是不是**换了域名/端**（`m.` / 小程序 / App 内嵌页） | 抓包里看文档响应原文里有没有这个 id |
| `decodeURIComponent` 抛 `URIError` | 那一坨其实是**明文 JSON**（反过来试） | 或者它是**双重编码**（decode 两次） |
| 直出载体里字段名和页面上看到的不一致 | 页面显示的是**渲染后的**值（格式化/映射/脱敏） | 以**载体里的原始字段**为准 |
| XHR 截获一条都不打印 | ★ `this._url`（不存在） | 目标接口路径判断写错（query 里有变量） |
| 装了截获后页面异常 | 抢了 `onreadystatechange` | 改成 `addEventListener` |
| 滚动脚本跑完数据没多 | 不是滚动触发（见 §3.2 判据表） | 页面有虚拟列表 ⇒ 只能靠接口而不是 DOM |

## 5. 来源表

| 主题 | 来源文章 | 年份 | 关键字面量 |
| --- | --- | --- | --- |
| `RENDER_DATA`（URL-encoded 直出）+ XHR 截获 + 滚动驱动 + CSV 导出 | `52pojie-1814333` | 2023-07 | `id="RENDER_DATA"`、`decodeURIComponent`、`/aweme/v1/web/aweme/post`、`self._url`、`playAddr`、`diggCount`、`scrollTo(0, document.body.scrollHeight)` |

> 本表是**保真度锚点**：文中每条断言都应能指回这里的某一行。
> ⚠️ `self._url` 是**源文脚本里的缺陷写法**（见 §3.1 陷阱表），**不要照抄**。
