# 顶象滑块纯算逆向 —— 按文章 2125447 实操记录

目标站点：`https://www.hb56.com/Login.aspx?type=pw`（`aHR0cHM6...` 解码所得）
验证码：`captcha.gdtspace.com`，SDK `v1.4.0(81)`，aid 前缀 `dx-`，ak `90762f230adee6af3957d9a029269461`
参考文章：`references/2125447-dingxiang-slider-pure-algo.md`

---

## 一、反调试：文章的思路在这版上是不成立的

文章说「vm 代码基本都是 string 代码载入运行的，所以去除 debugger 就不影响代码」。**本版实测不行**：

```js
// VM 运行时才拼出 debugger，源码里搜不到这个关键字
push("debu"); push("gger;");
```

- 对 `eval` / `new Function` 的入参做正则剥离 → 拼出来的串里确实有 `debugger;`，但剥离点太晚，
  且我的 preload 补丁（`Function`/`textContent`/`appendChild` 包装）会**直接把站方 VM 打坏**：
  `TypeError: _$hw[_$o3] is not a function at _$gX (eval at Login.aspx:16)`，
  页面卡在 `dx_captcha_basic_lang_smart_checking` 不再往下走。
- 唯一非侵入且有效的做法：**CDP 层面自动 resume**，让 `debugger` 停下来立刻被放行。
  → `scripts/resume-loop.js`（150ms 轮询 `proxycli call resume`）。

### 两个环境坑（Windows）

1. `bg_run` 走的是 **cmd.exe**，`$((SECONDS+1400))`、`seq`、`/d/...` 路径全部失效
   （报 `The syntax of the command is incorrect.`）。要么写 node 脚本，要么用 `D:\` 绝对路径。
2. Node 22 `execFile('proxycli.cmd')` → `spawn EINVAL`，必须 `exec(..., {shell:true})`。
3. pi-lens 的 autofix 会**改写下载下来的第三方 js**。所有原始 JS 证据一律存成 `.orig`。

---

## 二、4 步协议：实测映射（与文章一致）

| # | 文章说法 | 实测请求 |
| --- | --- | --- |
| 1 | 获取滑块参 o/sid/p1/p2/type/y | `GET /api/a?aid=&ak=&c=&de=0&h=150&jsv=&lf=0&m=&s=50&sid=&tpc=&uid=&w=300&wp=1&dt=1&wtf=false&_r=` |
| 2 | 造设备 lid | **JSONP**：`GET /udid/c1?Param=<urlsafe自定义b64>&callback=_<16位>`（不是 header，我之前记错了） |
| 3 | 认证设备拿 token `c` | 同一 endpoint，`Param` 更长（多了指纹字段）；**`status===2` 时 `data` 就是 `c`** |
| 4 | 过滑块拿认证 token | `GET /api/p1?imageType=0/1` 取图 + verify（带 `ac`） |

第 1 步响应（`artifacts/init-sample.json`）：

```json
{"p1":"/api/p1?sid=...&imageType=0&_r=...","p2":"...imageType=1...","o":"99bc827066787f66171f017c7321cf2f",
 "sid":"2d93dd2e4b953041621c887cc6a2d895","type":0,"y":74,"result":1,"sd":1,"ot":0,"redirectUrl":""}
```

---

## 三、已完成并验证的部分

### ✅ 协议 1 纯本地复现（`solver/proto1_init.js`、`solver/dx_samples.js`）

```
aid = "dx-" + Date.now() + "-" + 随机8位数字 + "-1"      // t 恒为 1
ak  = 死值 90762f230adee6af3957d9a029269461
_r  = String(Math.random())
```

脱离浏览器直接 HTTP 请求，**连续 4 次拿到新 sid/o/p1/p2**（`artifacts/s0..s3.json`）。
额外发现：`c`（设备 token）传空也能过第 1 步 —— 第 1 步不校验设备。

### ✅ 缺口定位（`solver/dx_find_gap.py`）—— 且不需要还原图片

用滑块 alpha 的轮廓环在背景上滑窗，环内梯度能量最大处即缺口：

```
s0  server y=48 -> 检出 (244, 48)  Δy=0    锁行 top1 55.5 / 次优 41.2
s1  server y=38 -> 检出 ( 74, 38)  Δy=0    锁行 top1 61.1 / 次优 40.3
s2  server y=35 -> 检出 ( 73, 35)  Δy=0    锁行 top1 91.7 / 次优 70.9   ← 目视确认，见 annot-s2.png
s3  server y=36 -> 检出 (229, 38)  Δy=2    锁行 top1 59.8 / 次优 52.4（背景复杂，需二次校验）
```

`artifacts/annot-s2.png` 里红框精确套住了缺口（能看清拼图轮廓和暗色抠除区）。

### 对文章的两处修正（本次实操最有价值的产出）

**1. `o` 不是「图片几何乱序」，而是 canvas 绘制顺序（防截图）。拼完的显示图 == 服务端交付图。**

三条独立证据：

| 证据 | 数据 |
| --- | --- |
| 交付图上缺口轮廓完整 | 50×50 拼图轮廓环在 (73,35) 处能量显著领先 → 缺口没被撕成竖条 |
| 按 `o` 重排后连贯度暴跌 | 边界代价：交付图(恒等) 1562.5 → 按 `o` 正向 4150.4 / 逆向 4549.5（越低越连贯） |
| 从图片反解真实置换 | 2-opt 最优 = `[24,6,7,...,22,25,...,31,0,3,4,5,1,2,23]`，与恒等序仅少数位移，和 `o` 表只有 4/32 位一致 |

作者是在 canvas 断点看到「还原图片的方法」，把**绘制顺序**误读成了**还原顺序**。
`dx_restore.py` 保留的是文章字面算法（`ord(ch)%32` + 冲突则 `+1` 重试），它的自检 `assert` 就是失败退出的——这就是证伪记录。
`dx_o_variants.py` 进一步扫了 `hex/ord/dec` × `direct/+1step` × 正逆向 × n∈{8,10,16,20,24,32}，**没有任何变体能打败恒等序**。

**2. 第 2/3 步的 `param` 不是「普通 base64 换个表」就能读出来的。**

自定义表已从 `greenseer.js` 提出（`solver/dx_b64.js`）：

```
XmYj3u1PnvisIZUF8ThR/a6DfO+kW4JHrCELycAzSxleoQp02MtwV9Nd57qGgbKB=
```

但用它解真实 `param` 得到的是二进制（可打印比例 ~30%）。文章那句「其实就是普通 base64，只是换了编码表」
只对**能看懂结构**成立（作者自己也是靠"构造明文再加密回去比对"反推字段，而不是解出来的）。
字段结构（文章 + 代码印证）：`lid` = 13 位时间戳 + `makeLocalID()`；`appKey` = ak；
`cpt/mts/rp/web` 走 `needHash` → `processValue` = **md5**；`ct` = 结束时间 − init 时间。
其中 `mimeTypes`/`canPlayType` 是死值，`webgl` 建议随机 32 位 hex。

### ✅ `ac` 的 `ua` 结构：已破解并字节级验证

不靠猜——用 Node 跑真 SDK（`dx_harness.js`）+ 插桩 `Ve`/`app`（`dx_blueprint.js`），现场抓出完整装配图：

```
_ua = Σ ( tag 1字节 + 密文长度 2字节大端 + 密文 )      # 每个采集器一帧
ua  = "s_v3#" + 自定义base64(_ua)                      # 288B -> 384+5=389 ✓
密文 = encrypt_XXX(明文字节串)                          # 每个 tag 用不同的 encrypt_*
```

**tag → encrypt_\* → 明文布局**（`artifacts/tag-encrypt-map.json`、`artifacts/ac-blueprint.txt`）：

| tag | 采集器 | encrypt_* | 明文字节（实测值） |
| --- | --- | --- | --- |
| 1 | getTM 时间戳 | `jrk7m86fvtabp7zcnwue` | 8B 大端：`0,0,1,160,121,129,23,183` |
| 2 | getBR 平台+版本 | `ludoj0512480ts7tf89b` | `1,1,0,3,49,51,49` = 平台,浏览器,0,len=3,"131" |
| 3 | getSC 屏幕 | `6yioqc6nzuwge5qbo8v5` | 20B：`7,128,4,56,7,128,4,16,0,0,0,0…` |
| 4 | getLO href+referrer | `4r4cerm4cpjc74vhznnh` | 64B：`0,39,"https://www…"` = 0,len,href,referrer |
| 5 | getCF js特征 | `mm8fyhuehlp6qgks4lni` | 12B：`0,25,0,8,"40"])p,"` |
| 6 | getDI devtools | `21wpc2mwfyi2t86t19qs` | 1B：`1` |
| 7 | getEM 自动化 | `fqe9088f8le6wmwaqvfn` | 4B：`0,0,0,1` |
| 8 | getJSV 版本 | `vmh0hi6mi3rzm89i85kk` | 4B：`0,0,0,1` |
| 9 | getTK sid | — | **`option.token` 为空则整帧不产生**（实测 uaDelta=0） |
| 11 | getMM 鼠标移动 | `bq43luqg9na140j97rkf` | 10B：`0,0,0,9,0,120,0,240,0,0` = seq,?,x,y,… |
| 13 | getKD 按键 | `xbixdok29qcj9o4hrwc3` | 8B：`0,0,0,10,0,13,0,0` |
| 14 | getFO 焦点 | `fkpqs8idvwour4xpw216` | 7B：`0,0,0,11,0,0,0` |

`option` 默认值（实测 dump）：`{token:"", form:"", inputName:"ua", maxMDLog:10, maxMMLog:20, maxSALog:250, maxKDLog:10, maxFocusLog:6, maxTCLog:10, maxTMVLog:20, MMInterval:50, TMVInterval:50}`

**已移植并验证的代码**：

- `solver/dx_encrypt.js` —— 18 个 `encrypt_*` 全部从 greenseer 模块 11 机械式移植（只把三张字符串表索引
  内联成字面量，标识符一个不改）。`dx_verify_encrypt.js` 对真 SDK 跑 5 组输入：**18/18 逐字节一致**。
  移植手法：给 webpack factory 末尾注入局部量快照（strict 模式同作用域能读到自己局部量），
  再把 `e[i]/n[i]/r[i]` 三张表索引全部内联。
- `solver/dx_ac.js` —— 帧拼接 + 自定义 base64。自检：用真 SDK 现场抓的 16 帧重建 `_ua` 与 `ua`，
  **两条都逐字节一致**（285B / 385 字符）。

### ✅ 第 4 步 verify 外层：已拆完（`solver/dx_verify.js`）

从 `basic-captcha-js.js.orig` @39700-41200 找到装配点，去混淆后：

```js
E = typeNum;                                   // = init 返回的 type
B = Math.round(disx) + (0 === E ? 10 : 0);      // x
T = Math.round(y || 0);                         // y
A.sendSA();                                     // 先交轨迹
A.sendTemp(t.sd ? JSON.stringify({x:B,y:T,speed:t.speed,dt:_dx.dt})
                : "x="+B+"&y="+T+(t.speed?"&speed="+t.speed:""));
if (!isDown()) {
  R = {ac: A.getUA(), ak, c: p(t), uid, jsv, sid, aid, x: B, y: T};   // 可选 code
  POST(api_verify /* server + "/api/v1" */, {body: R});
}
```

**最重要的结论：`ac` 就是 `getUA()` 本身，外层没有新算法。**
上一轮已字节验证的 `ua` 直接就是 `ac`。

其它实测发现：

| 项 | 结论 |
| --- | --- |
| 端点 | `api_apply=/api/a`、`api_verify=/api/v1`（另有 a2/v2、a3/v3 变体） |
| body 字段 | `ac, ak, c, uid, jsv, sid, aid, x, y`（+可选 `code`） |
| **`speed` 不在 verify body 里** | 只走 `sendTemp` 遥测；它参与的是**上游**：`disx = actual*speed` → `actual=(gapX-10)/speed` |
| 移动端分支 | `isDown()` 为真时**不 POST**，token = `getUA().replace(/#/,"=").replace(/\+/g,"-").replace(/\//g,"_")` |
| URL-safe 变换 | 就是标准 base64→urlsafe，这解释了第 2/3 步 `param` 头里为什么是 `-`/`_` |
| 失败响应 | 带 `{message, tp, vs, sid, o, retry, ot}` —— **重试会下发新的 `o` 和 `sid`** |

自检全绿（13 项），包括往返误差：`speed=0.9→上传80→反推73.0`、`1.0→73→73.0`、`1.2→62→72.4`（floor 丢精度，±1 内）。

### ✅ 第 2/3 步 `param`：请求格式已跑通并被服务端接受

`const-id.js`（v1.492.0）同样用 DOM stub 在 Node 跑起来（`solver/dx_constid.js`），
真正的构造链在 `mods.c[7].exports.default`（`ConstID`）：

```js
// lid = 13位时间戳 + makeLocalID()，而 makeLocalID 就是纯随机串（无校验位）
_getLid(): {type:"0", value: Date.now() + makeLocalID()}

detect(): Promise.all([指纹采集, _getLid()]).then(([fp, u]) => {
  const f = mergeOptions(mix({lid: u.value, lidType: parseInt(u.type)}, fp));
  request(options.server, XuRhstZ(f))          // XuRhstZ = 加密+自定义base64
    .then(e => e.status === 2 ? defer.resolve(e.data)   // ← data 就是 token c
                              : defer.reject(new Error('...status' + e.status)))
})
```

**真实发请求的结果**（`artifacts/c1-detect.txt`）：

```
GET https://captcha.gdtspace.com/udid/c1?Param=j6JTUvz2q2Be-…&callback=_9195315195557046
HTTP 200  {"data":"3805f7ba…2a36", "msg":"The lid is invalid.", "status":-4}
```

这是**结构化业务响应**，不是格式错误 —— 说明 `Param` 服务端能正确解密，
请求形状（JSONP / `Param` / `callback` / 自定义表）已全部对。

### 指纹字段已全量注入（真实浏览器采集）

用 `about:blank` 采了真指纹（`artifacts/fp-real.json`：canvas 3894B PNG、
`ANGLE (NVIDIA GeForce RTX 5060 Ti …)`、5 plugins、2 mimeTypes、canPlayType 全 `probably`），
灌进 stub（`dx_constid.js`：Proxy 自动桩 + `getParameter`/`toDataURL` 返真值，
GL 常量用双向表把名字接回去）。字段名映射也从源码抓到了：

```js
{mimeTypes:"mts", plugins:"rp", resolution:"res", devicePixelRatio:"pr",
 timezoneOffset:"to", language:"lug", languages:"lugs", userAgent:"ua", touch:"ts", …}
```

`mergeOptions` 入参现在齐了 30 个字段，param **176 → 1020 字符**：

```
rp :"386207752cb0f2afd038b54c8f2b1b29"   ← plugins md5   ✓
mts:"b2f0f0a1934eb1cd8e16d018a2c81051"   ← mimeTypes md5 ✓
cpt:"7199b2d0eba8ca5cfe80b568a073e5f4"   ← canvas md5    ✓
gi :"Google Inc. (NVIDIA);ANGLE (NVIDIA, NVIDIA GeForce RTX 5060 Ti …)" ✓
web:"unknown"                            ← webgl 渲染哈希仍缺（Proxy 桩没跑真着色器）
```

### 对照组推翻了上一版的判断：`c` 其实拿得到，是我的完整 param 被拒

关键实验：拿同一条真 param 做扰动对照（`solver/dx_c1_flags.js`）：

| 用例 | 响应 |
| --- | --- |
| 我的完整 param（1020 字符） | `status:-4` The lid is invalid. |
| 改 1 个字节 | **`status:2` The token has been generated successfully.** + token |
| `Param=` 空 | **`status:2`** + token |
| `Param=AAAA`（垃圾） | **`status:2`** + token |
| 截断一半 | **`status:2`** + token |

两件事同时成立：

1. **破损 param 走“解不开 → 宽容签发”路径**，只有我的能解密并进入 lid 校验 —— 这组对照恰好
   证明了 param 格式/加密/自定义表全对（上一版只是从“返回了业务错”推的，现在有对照组了）。
2. **`c` 不靠修 lid 也能拿到**：发个空/坏 `Param` 就能稳定换到 token（源码里 `2===status → resolve(e.data)`
   就是这个 `data`）。这是端点本身的行为，不是我的实现技巧。

⚠ 未验证：这个宽容路径签发的 token 能不能过后续 `/api/v1` verify。要确认必须真提交一次滑块，
而这被 hb56 自己的 JSVMP 卡住了。

### 已用实验证伪的 6 个假设

| 假设 | 验证 | 结果 |
| --- | --- | --- |
| 缺指纹字段 | 1020 字符全字段 param | ✗ 仍 -4 |
| 需先 step2 注册再 step3 认证 | 按 SDK 自己发两条的顺序（176→1020）依次复放 + cookie jar | ✗ 两条都 -4，Set-Cookie 0 条 |
| 本机时钟超前（沙箱是 2026） | 读服务端 `date` 头算偏移 | ✗ 偏移仅 **-60ms**，假设直接死 |
| `hlb:true`（Node 里 `eval.toString().length` 不像浏览器） | 强制 `hlb:false` | ✗ 仍 -4 |
| hlo/hlr/hll 全 false | 一并翻转 | ✗ 仍 -4 |
| `web:"unknown"`（webgl 哈希缺失） | 造一个 32 位值填进去 | ✗ 仍 -4 |
| lid 需绑定会话 | 先取真 `/api/a` 的 `sid`/`aid`，分别注入 + 合并注入（param 长到 1126） | ✗ 仍 -4 |

appKey 也没认错（文章明确：const-id 的 appKey 就是验证码的 ak），`makeLocalID` 是纯随机串、
无校验位，所以 lid 的字符串形式不可能错。

**剩下唯一没排掉的方向**：服务端拿 lid 去比对一个真实浏览器会话里才能产生的东西
（比如它自己下发并存在 cookie/localStorage 的 `_dx_uzZo5y` 记录，或 `window.name` 存储），
要证清它必须先仍活浏览器里拿到一条真 c1 请求 —— 本次被反调试卡住，没拿到。

另外两个实测修正：

- `mergeOptions` 会对 `appKey`/`userId`/`appId` 做 `encodeURIComponent`，并 `delete o.appId`、把 `appId` 改名为 `appKey`。
- `XuRhstZ` 内部留了一句 `console.log(t)`，且把结果挂到一个模块内变量（不是 `window._constID_param`）。

### ✅ `ac` 明文层：8 个 tag 全部破解，端到端逐字节相同

`solver/dx_plaintext.js` —— 同一个脚本里跑真 SDK 取现场明文当 oracle，再跟本文件构造器逐字节 diff：

| tag | 布局 | 验证 |
| --- | --- | --- |
| 1 getTM | 8B 大端时间戳（文章"高/低32位各转4字节大端"就是这个） | ✓ |
| 2 getBR | `[平台码, 浏览器码, 0, 版本长, ...版本]` | ✓ |
| 3 getSC | **10×u16 大端**：screen.w/h, avail.w/h, 0, 0, inner.w/h, outer.w/h | ✓ |
| 4 getLO | `[0, href长, href, 0, referrer长, referrer]` 截到 64B | ✓ |
| 5 getCF | `[u16 code][u16 len][len 字节 js 签名]` —— **跨版本会变，只能写死**（文章原话） | ✓ |
| 6 getDI | 1B devtools 探测值（Node 两 1、真浏览器通常 0） | ✓ 只校验布局 |
| 7 getEM | 4B 自动化探测位图 | ✓ |
| 8 getJSV | 4B jsv 版本标志 | ✓ |

**端到端结果**：明文构造器 → `dx_encrypt.js` → 帧拼接 → 自定义 base64，
输出 `ua` 与真 SDK **逐字节相同**（389 字符）。

新发现两个关键坑：

1. **设备块发了两遍**，帧序 `1,2,4,5,6,7,8,3` × 2（对应文章"`app` 里根据 `t` 做标记，
   后续通过 1-10 序列还原"）。而且**两遍的时间戳不同** —— 构造器必须按帧序号
   独立生成，不能复用第一遍的值（本文件第一版就踩了这个，长度对但尾部差）。
2. **`load()` 不能跑两次**：getCF 长度会跨运行漂移（实测见过 6/11/12B），
   任何拿 A 次明文比 B 次 `ua` 的自检都是假阴性。

### ⬜ 还差什么

1. **轨迹**：`recordSA`/`sendSA`/`spliceCA` 需要真实事件序列（文章说的两段轨迹），
   `counters` 里有 `sa/mm/md/kd/fo/tc/tmv` 计数与 `maxSALog:250` 上限。
   这是文章自己承认的最大坑（"随便找的一个 1/10 成功率很低"）。
   已知轨迹帧：tag11 getMM(`[u32 seq, u16 x, u16 y, u16 t]`)、tag13 getKD、tag14 getFO。
2. **宽容路径签发的 token 能否过 verify** —— 发空/坏 `Param` 已能稳定拿到 `status:2` + token，
   但未验证它在 `/api/v1` 是否可用（需真提交一次滑块）。
   同时完整 param 的 `status:-4` 已证伪 6 个假设，剩下的方向需要真浏览器里的原始 c1 请求。
3. **服务端是否接受**未验证 —— 见下条对浏览器路线的实测结论。

### 反调试卡点的根因：proxycli 内置绕过守卫条件写窄了（已修）

之前多轮被 hb56 的无限 `debugger` 卡住（`evaluate_script` 超时、轮询 resume 又会挤死 daemon）。
根因不是没工具，而是**工具自带的绕过从未触发**：

| 事实 | 位置 |
| --- | --- |
| proxycli 已实现 `Debugger.setSkipAllPauses{skip:true}` + resume + finally 还原 | `Reverser-CLI/src/tools/shared/browserRuntime.ts` `withDebuggerTrapBypass`，已接在 `evaluate_script`/`click`/`fill`/`fillForm`/`navigate`/`screenshot` 上 |
| 但守卫要求 `reason === 'debugCommand'` | 旧代码 `if (manager?.getPausedState()?.reason !== 'debugCommand') return await action()` |
| Chrome 对 **eval 里的 debugger 语句**报 `other` | 实测：本地受控探针 `eval('debugger;')` / `funcCtor` / `iframeEval` 三种路径均为 `reason: other`；连 `Debugger.pause`（工具的 `pause`）也报 `other` |
| 另一道机制也盖不到 | `#handlePotentialBreakpointLoop` 第一行 `if (!breakpointId) return;`，而 `debugger` 语句不带 hitBreakpoints |

⇒ eval 型无限 debugger（`reason:'other'` + 空 hitBreakpoints）**同时穿过两道守卫**，工具对它没有任何路径。

**修法**（已改并验证）：判据不看 reason 字符串，而看是否命中用户断点：

```ts
const isDebuggerTrap = !!paused && (
  paused.reason === 'debugCommand' ||
  (paused.reason === 'other' && !paused.hitBreakpoints?.length));
if (!isDebuggerTrap) return await action();
```

把 `'other'` 限定在“无命中断点”，所以真断点与异常暂停仍不受影响。
同步修了一条与新现实矛盾的旧用例（它把 `reason:'other'` 当作普通断点、却 mock 了空 hitBreakpoints），
并新增一条 eval 陷阱用例：`build/tests/unit/tools/shared/browserRuntime.test.js` **6/6 通过**，
连同 `fill` 等调用方共 **11/11 通过**，无回归。

**现场验证**：在 hb56 真实页面上，`get_paused_info` 报 `isPaused:true / reason:other` 的同时，
`evaluate_script` 已能直接返回结果（以前必超时）；并且成功驱动到密码表单、
抓到真实 `udid/c1` 请求与 `cdn.gdtspace.com/static/dx-captcha/libs/{const-id,greenseer}.js`。

顺带纠正两个我自己早先的错误判断：

- “param 在请求头”是对的：源码里 `export default (url,param)=> (context?.() || !xhrSupportsCredentials || isIE) ? jsonp({data:{Param}}) : xhr({headers:{Param}})`
  —— 真浏览器走 XHR+`Param` 请求头，我的 Node stub 落到 JSONP+`?Param=` 分支。
- 但通道不是 `-4` 的原因：header / query 两种形式重发都是 `-4`。

#### 真实 c1 现场数据（已拿到）

用 `inject_hook --persistent true` 把记录器注册到 BrowserContext（策略 `addInitScript`，
真真正正的 document-start）后抓到。注意返回体里 `registered:false / idempotent:true`
不是失败，而是“已注册过、本次跳过”（我一开始读错了）。

| 项 | 真实浏览器 | 我的 Node 复现 |
| --- | --- | --- |
| 通道 | `xhr` + `Param` **请求头**（`Accept` 同发） | JSONP `?Param=` |
| Param 长度 | **204 字符** → 153 字节 → 明文 ≈ **151 B** | 1020 字符 → 765 字节 → 明文 ≈ **763 B** |
| HTTP | 200 | 200 |
| 业务码 | `-6 Missing required params` | `-4 The lid is invalid` |

关键：**浏览器自己那条 c1 也没成功**（`-6`），所以之前拿到的 `c` 不是这条路径给的。

#### XuRhstZ 字节布局（受控输入探测，不靠猜）

用真模块加密已知长度的串（`artifacts/dx_probe_layout.js`）：

```
in=0  → 2B  ff 0f
in=1  → 3B  fd b3 70
in=12 → 14B fd bd af 9e cd … 5f
in=64 → 66B fd bd (af 9e cd)… c3 70
```

⇒ **密文字节数 = 明文字节数 + 2**（头 1 个 `fd`/`ff`，尾 1 个 `70`），
中间是周期二进的流变换（重复明文下呈 `af 9e cd` 三字节循环，且末位字节另变）。
这个公式把“密文长度”直接换算成“明文长度”， hence 上表 151 B vs 763 B 的对比。

#### 设备 token `c` 的真身：就是 `_dx_app_<appKey>` cookie

页面上 `document.cookie` 直读到：

```
_dx_app_90762f230adee6af3957d9a029269461 = 6a9d9c2agNsItl5bbeuTvdfVxyepRCdkUeNzVQP1
```

与 `/api/a?…&c=6a9d9c2agNsItl5bbeuTvdfVxyepRCdkUeNzVQP1` **逐字相同**。
配套：`_dx_captcha_vid`（vid，当前为空）、`_dx_uzZo5y`（40+ 十六进制，**本地生成且稳定**，
服务端响应不变它）。另注意：带 `_dx_app` cookie 复放我的 param，仍 `-4`，
所以会话/cookie 绑定也不是 `-4` 的原因。

#### `-4` 线索更正：我拿错了样本（已推翻上面的结论）

上面“浏览器只发 ≈151 B、我超 5 倍”的推论是**错的**：那条 204 字符的 param 是
退化请求（服务端回 `-6`），不是成功请求。拿到成功那条后重新量化：

| 样本 | param 长度 | 换算明文 | 服务端 |
| --- | --- | --- | --- |
| 真·c1 (reqid 176) | 204 字符 | ≈ 151 B | `-6 Missing required params` |
| **真·c1 (reqid 183)** | **1100 字符** | ≈ **825 B** | **`status:2` + token** |
| 我的 Node 复现 | 1020 字符 | ≈ 763 B | `-4 The lid is invalid` |

⇒ 我的 param 体量呎真成功值**同一量级**（只差 ≈60 B），“字段太多”假设作废。

#### 新发现：服务端有显式防重放（`-9`）

把真·成功 param（reqid 183 的 `param` 头）原样复放：

```
复放#1 -> { "msg":"接口防重放", "status":-9 }
复放#2 -> { "msg":"接口防重放", "status":-9 }
```

三个业务码是分开的关卡，所以我的 `-4` 是比 `-9` **更早**的一道门：
`-6` 参数缺失 → `-4` lid 无效 → `-9` 重放拦截。
能回 `-9` 同时证明：格式/通道/解密在服务端是可接受的，问题纯在 lid 内容。

#### 加密是确定性的，但不是固定密钥

- 两条真 param（176/183，长度差很大）**共同前缀 127 字符 + 共同后缀 62 字符**
  → 同明文必同密文，**确定性成立**，因此“密文前缀相等 ⇔ 明文前缀相等”可当判据用。
- 但密钥流不可提取：用已知明文对反推，300 字节入 → 309 字节出（**不是 +2**），
  且密钥流周期 > 64、非常数 → 是带反馈的流变换，黑盒解密是一项真正的 RE 工作。
  （`+2` 只在对明文字符不做 URI 转义时成立，我那个测试串含 `%`/`#` 所以膨胀了）

#### 当前定位：真 param 开头有 ≈95 字节静态区，我只对到 8 字节

我的 param 与真成功 param 的**密文**共同前缀只有 **11 字符**（≈ 8 字节明文），
而两条真 param 相同到 127 字符（≈ 95 字节）。即真值开头有一大段跨运行不变的字节，
我的从第 9 字节就偏离——**这就是 `-4` 要查的确切位置**（候选：mergeOptions 后的选项前缀、
字段顺序、或开头那个非-JSON 的定界头）。

#### 取明文这条路堵死了（实测）

document-start 包 `JSON.stringify`（按长度窗口 300–1600 筛，不猜字段名）在
真 c1 发生时 **0 命中**；唯一捕到的是 greenseer 的遥测缓存
（`{"fa0-13":[300,1788779695,[23]],"pfe0":[604800,…,[20 字节]],"pfc0":…, "pfd0":…, "pfb0":…, "pfb2_0":…, "pfa0":…}`）。
→ 设备 param 不由顶层 `JSON.stringify` 产生（内部拼接或另一 realm）。

#### 主线新收获：图片端点是 `/api/p1` 不是 `/api/a`

```
https://captcha.gdtspace.com/api/p1?sid=79c2531d4aa5af5fc1b5634b35a1588f
  &ak=90762f230adee6af3957d9a029269461&code=&wp=1&imageType=0
  &_r=ae94912b2ab6435eb29e683125cc68de&&_r=0.8024066432822454
```

要点：`resourceType: image`（用 `<img>` 取，不走 XHR）、`sid` 是 32 hex、
`code=` 先留空、`imageType=0`、**两个 `_r`**（一个 32 hex nonce + 一个 `Math.random()`）
且中间带一个空的 `&&`。

#### 工具用法备忘（本轮浪费了几次调用才想到）

- `get_network_request --reqid N --fullBody true` **直接返回 `requestHeaders`（含自定义 `param` 头）与 `responseBody`**，
  不需要注入任何 hook。（前几轮我拿它返回空是因为用了尚未发生的 reqid / 没加 `--fullBody`）
- 取真值的正确顺序：`list_network_requests` 找 reqid → `get_network_request --reqid --fullBody`。
- `_dx_uzZo5y` 是 **本地生成且稳定**的（服务端响应不变它），我早先当作服务端结果是错的。

### x 距离公式（文章结论，已按实测参数打印示例）

### x 距离公式（文章结论，已按实测参数打印示例）

```
type == 0  ->  有 10px 初始偏移；type != 0  ->  不加
disx   = 缺口 x（图片上 0 到缺口的距离，本次实测可直接从交付图取）
speed  = [0.9, 1.2] 之间随机
actual = (disx - 10) // speed        # 真实需要滑动的像素
x上传  = actual + 10                 # 轨迹里的 x 差值用 actual，不要用 disx
```

---

## 四、文件清单

```
artifacts/   init-sample.json init-urls.json        协议1 原始响应
             s{0..3}.{json,bg.bin,piece.bin}        4 组独立样本
             p-bg.* p-slider.* annot-s{0,2}.png     缺口标注图（目视验证）
             bg-solved.png                          2-opt 反解还原图
             paused-1.txt shot-*.png                反调试现场与截图
evidence/    proto-req-*.txt                        抓到的协议原文
sources/     *.js.orig                              4 个 SDK 原始文件（.orig 防 linter 改写）
scripts/     resume-loop.js                         CDP 自动 resume（反 debugger 唯一有效手段）
             preload-no-debugger.js                 反面教材：会打坏站方 VM
             probe5.js                              验证码 DOM 探针
solver/      proto1_init.js dx_samples.js            协议1 复现 + 取样
             dx_find_gap.py                          缺口定位（含 y 交叉验证）★可用
             dx_restore.py                           文章字面 o 算法（自检失败=证伪记录）
             dx_solve_order.py dx_o_variants.py      反解真实置换 + 穷举 o 解释
             dx_b64.js                               自定义 base64 表
             dx_harness.js                           ★DOM stub 跑真 SDK（离线，无需浏览器）
             dx_port_encrypt.js dx_encrypt.js        18 个 encrypt_* 移植 + 生成器
             dx_verify_encrypt.js                    移植保真自检（可重跑）
             dx_drive_ua.js dx_blueprint.js          ua 装配驱动 + 插桩吐蓝图
             dx_ac.js                                ★帧拼接 + 自定义base64，已字节验证
             dx_plaintext.js                         ★8 个 tag 明文构造器 + 端到端 ua 自检
             dx_verify.js                            ★verify 外层（ac=ua、x/y 公式、字段集）
             dx_constid.js                           DOM stub 跑 const-id（设备/param）
             dx_drive_lid.js                         驱动 ConstID 录 param
             dx_c1_flags.js                          ★param 扰动对照 + 6 假设证伪
             dx_c1_fixlid.js                           时钟偏移假设（证伪：-60ms）
```

复跑：

```bash
node dingxiang/solver/dx_samples.js 4                       # 取样
python dingxiang/solver/dx_find_gap.py <bg> <piece> <y>     # 定位缺口 + 算 x
node dingxiang/scripts/resume-loop.js &                     # 浏览器操作前先起
node dingxiang/solver/dx_verify_encrypt.js                  # encrypt_* 保真自检
node dingxiang/solver/dx_ac.js                              # ua 帧/base64 自检
node dingxiang/solver/dx_plaintext.js                       # 明文层 + 端到端 ua 自检
node dingxiang/solver/dx_verify.js                          # verify 外层 13 项自检
node dingxiang/solver/dx_constid.js                         # 跑 const-id harness
node dingxiang/solver/dx_drive_lid.js                       # 录 param / 发真实 c1
node dingxiang/solver/dx_c1_flags.js                        # 对照组 + 假设证伪（会真发请求）
node dingxiang/solver/dx_blueprint.js                       # 重新导出 ac 装配蓝图
```
