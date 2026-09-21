# 站点规则：BOSS 直聘（`__zp_stoken__`）

**归属**：`ast-deobfuscation`（结构反混淆）为主，算法线转 `web-reverse-algorithm`，
补环境转 `web-js-env-patcher`，滑块/验证码转 `web-verify-patcher`。

---

## 一、抓包前置（普通 Chrome 抓不到包）

`security-check.html` 里调用 ABC 生成 cookie `__zp_stoken__`。
**该站用 Chrome DevTools 抓不到包，必须先用 Fiddler。**

流程：

1. 开 Fiddler；
2. 打开页面，找 `security-check.html` —— 这是生成 `__zp_stoken__` 的地方；
3. 用 Fiddler **替换该文件**，并在调用处插入 `debugger`；
4. 从 `debugger` 跟栈进入真正干活的脚本。

## 二、两个关键文件

| 文件 | 说明 |
| --- | --- |
| `security-check.html` | 入口，调用 ABC |
| `security-js/` 下的 js | 真正的混淆体；**文件名是随机串，每天变** |

⇒ 脚本路径**不能写死**，要按「同目录下最新/唯一 js」动态定位。

## 三、混淆形态：四层 switch

- 结构：`switch` 嵌套四层，**起始 index 由调用时传参决定**（多入口结构）；
- 每个入口执行"同一段逻辑的不同片段"；
- 特征：最内层 case 跑完**逐层 `break` 返到最外层**；有 `return` 时也逐层返回；
- 变量**靠 switch 层级隔离**。

完整的判据、三步还原法与两个致命坑（case index 藏在调用点、还原后变量污染）见
`references/multi-entry-switch-reduction.md`。

## 四、与本技能其他文档的关系

| 需要 | 去读 |
| --- | --- |
| 多层 switch 的还原配方 | `references/multi-entry-switch-reduction.md` |
| CFF / MBA / dispatcher 归约的先决条件 | `references/mba-and-dispatcher-reduction.md` |
| OB 变体（数组/字典/分身/外衣）分类 | `references/ob-variant-taxonomy.md` |
| 主动调用 + 字典对象还原的具体代码 | `references/ob-variant-taxonomy.md` §6 |
| 结构还原后的算法还原与参数分析 | 转 `web-reverse-algorithm` |
| 补环境跑通 `__zp_stoken__` | 转 `web-js-env-patcher` |

## 五、实操提示

> 该站滑块/验证线在 `web-verify-patcher`；本文件只管"怎么把四层 switch 拆干净"。
> 别一上手就逐个 case 硬调 —— 硬着头皮调试会比先还原结构更慢，
> 这是 CFF 类目标的通用经验。