# Drissionpage焦点伪造检测点

> **作者**: wolfSpicy | **发布时间**: 2026-09-16 00:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1127 / 9
> **原文**: [https://www.52pojie.cn/thread-2128269-1-1.html](https://www.52pojie.cn/thread-2128269-1-1.html)

---

DrissionPage 焦点伪装检测点：Emulation.setFocusEmulationEnabled

实测版本：DrissionPage 4.1.1.4（当前 PyPI 最新）

结论：该检测点仍在，且可稳定复现。

打开一个本该已经掉到后台的页面，它却继续汇报：

```
document.hasFocus()      === true
document.visibilityState === "visible"
```

真人浏览器一般不会这么干。DrissionPage 默认会通过 CDP 打开「焦点伪装」，于是页面状态和真实前台发生错位——这就是本文要拆的检测点。

---

1. 检测点从哪来

DrissionPage 在初始化每个 Chromium 页面驱动时，会无条件打出三条 CDP：

```
# DrissionPage/_pages/chromium_base.py  →  _driver_init()
self._driver.run('Page.enable')
self._driver.run('DOM.enable')
self._driver.run('Emulation.setFocusEmulationEnabled', enabled=True)
```

本机 site-packages 路径（4.1.1.4）：

```
...\site-packages\DrissionPage\_pages\chromium_base.py
```

对应大约在 121 行。GitHub master 同样保留，只是写法变成了 self.\_run\_cdp(...)，命令没变。

也就是说：不是业务代码手滑加的，是框架默认行为。

---

2. 这条 CDP 到底在干什么

Chrome DevTools Protocol 的：

```
Emulation.setFocusEmulationEnabled({ enabled: true })
```

作用是：模拟页面始终处于 focused / active。

自动化很爱它——后台跑脚本时，页面仍可当作「有焦点」处理，减少因失焦导致的奇怪行为。副作用也很直接：

真实世界                          页面 JS 读到的世界（伪装开启时）
标签页已切走 / 弹窗抢走前台               hasFocus() 仍可能是 true
页面已进入后台                       visibilityState 仍可能是 "visible"
本该有 blur / visibilitychange   可能迟迟不来

检测逻辑就建立在这个错位上：先制造“真实失焦”，再看页面还敢不敢说自己在前台。

---

3. 最小复现思路

3.1 页面侧检测（文档原始思路）

```
// 建议放在用户手势回调里（click 等），否则 window.open 可能被拦截
async function detectFocusEmulation() {
  const w = window.open('about:blank', '_blank');
  if (!w) {
    return { skipped: true, reason: 'popup_blocked' };
  }

  await new Promise(r => setTimeout(r, 600));

  const report = {
    hasFocus: document.hasFocus(),
    visibilityState: document.visibilityState,
    hidden: document.hidden,
  };

  w.close();

  // 正常浏览器：通常 false + hidden
  // 焦点伪装开启：常见 true + visible  ← 矛盾
  const suspicious =
    report.hasFocus === true &&
    report.visibilityState === 'visible';

  return { suspicious, report };
}
```

判断别写成「只要 hasFocus()===true 就是机器人」。

关键是：你已经把页面挤到后台了，它还坚持说自己 focused + visible。

3.2 不依赖手势的对照（自动化侧验证）

若只是验证框架行为，可用 CDP 新开标签抢前台：

```
page.run_cdp('Target.createTarget', url='about:blank')
# 再读原页面的 hasFocus / visibilityState
```

关闭伪装做 A/B：

```
page.run_cdp('Emulation.setFocusEmulationEnabled', enabled=False)
```

---

4. 实测结果（4.1.1.4）

环境：Windows + Chrome（本机路径启动）+ DrissionPage 4.1.1.4。

场景                            抢前台之后 hasFocus  visibilityState 是否命中「伪装痕迹」
默认（emulation ON）+ window.open True            visible         ✅
默认（emulation ON）+ CDP 新标签     True            visible         ✅
手动关闭 emulation 后              False           hidden          ❌（表现正常）
再次打开 emulation                True            visible         ✅

和文档描述一致：

* 正常浏览器：后台页汇报 false / hidden
* 伪装开启：后台页仍汇报 true / visible
* 小窗口场景同样能打出矛盾（文档结论；本机主路径已复现核心现象）

补充观察：

1. window.open 在自动化里不一定总成功，可能被弹窗策略拦住；CDP 开标签可作为对照实验。
2. 关伪装之后，若页面本来就在后台，读数会直接是 hidden——这反而说明 API 在说真话。
3. 单靠一次采样不够稳，站点侧更合理的做法是：失焦操作 + 状态抽样 +（可选）事件是否触发 组合判断。

---

5. 为什么这能当成“指纹”

浏览器安全模型里，前台/后台是硬状态：

```
前台标签  →  focused, visible
后台标签  →  blur, hidden
```

setFocusEmulationEnabled(true) 相当于在中间插了一层「剧本」：

真实调度已经切走了，DOM/Page 对外汇报却还按“我还在前台”演。

于是风控不用找 navigator.webdriver，也能抓到一类自动化框架的默认癖好——状态撒谎。

可观测信号不止这两个字段，常见还有：

* visibilitychange 迟迟不到
* blur / focusout 缺失
* document.hidden 与真实窗口层级不一致

字段矛盾已经够用；事件缺失适合做加强项。

---

6. 站点侧怎么用（务实版）

不要做成「一票否决」的唯一规则，建议降权特征：

```
1. 用户点击后触发检测（满足 window.open 手势）
2. 打开 about:blank 抢前台，等待 500~800ms
3. 采样 hasFocus / visibilityState / hidden
4. 若仍 focused+visible → 记一条 automation_focus_emulation 风险分
5. 关掉弹窗，避免影响体验
```

可一起加权的邻近信号：

* CDP/自动化常见痕迹（视业务合规边界而定）
* 输入时序、指针轨迹是否过“干净”
* 无头/渲染异常类特征

单点容易误伤：某些辅助功能、嵌入场景、特殊 Broswer 策略也可能让焦点表现怪异。当分，不直接一刀切。

---

7. 使用 DrissionPage 时怎么规避

如果你是自动化开发者，只是不想被这个点打到：

```
# 页面创建完成后立刻关掉
page.run_cdp('Emulation.setFocusEmulationEnabled', enabled=False)
```

注意：

* 框架在 \_driver\_init 里默认打开；每个新 tab/frame 初始化后都可能需要再关一次
* 关掉后，后台运行时页面会真实失焦，部分依赖 focus 的前端逻辑可能变脆
* 改 site-packages 能一劳永逸，但升级会被覆盖；更稳的是封装自己的启动函数统一关闭

从防御视角看：关掉它只是摘掉这一枚指纹，并不等于“隐身”。

---

8. 和“无头检测”不是同一类东西

   类型                例子                  本文这个点
   UA / webdriver 字段 navigator.webdriver 不是
   渲染/WebGL 指纹       画布哈希、字体集            不是
   运行时状态一致性          焦点、可见性、事件序          ✅ 正是

它打的是：CDP 仿真开关导致的“自我汇报”与真实窗口状态不一致。

所以即便你换成有头模式、换 UA、关 webdriver，只要这句 emulation 还在，矛盾仍可能被抓。

---

9. 结论
10. 最新 DrissionPage（4.1.1.4）仍默认调用 Emulation.setFocusEmulationEnabled(true)。
11. 文档中的检测思路可复现：先抢前台，再读 hasFocus / visibilityState，能打出 true + visible 的矛盾。
12. 手动关闭该 emulation 后，汇报恢复正常，A/B 对照成立。
13. 站点侧适合作为风险分特征；自动化侧若在意，启动后显式 enabled=False。

一句话：

不是页面“看起来像机器人”，而是页面在该说自己掉后台的时候，还在硬说自己在前台。

---

附录：快速自检脚本骨架

```
import time
from DrissionPage import ChromiumPage, ChromiumOptions

def page_state(page):
    return page.run_cdp(
        'Runtime.evaluate',
        expression='({hasFocus: document.hasFocus(), visibilityState: document.visibilityState, hidden: document.hidden})',
        returnByValue=True,
    )['result']['value']

co = ChromiumOptions()
co.set_local_port(9333)
page = ChromiumPage(co)
page.get('https://example.com')
time.sleep(0.5)

print('before:', page_state(page))
page.run_js('return !!window.open("about:blank", "_blank")')
time.sleep(0.7)
print('after :', page_state(page))
# 默认 DP：常见 {'hasFocus': True, 'visibilityState': 'visible', 'hidden': False}
```

跑完看 after：若页面分明已经不是前台，却仍是 True/visible，检测点就成立。
