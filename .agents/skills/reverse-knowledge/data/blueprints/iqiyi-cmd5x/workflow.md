# 爱奇艺 vf（cmd5x）逆向 workflow

> 算法侧结论与其不确定性见 `metadata.json`；本文件只给可执行步骤。

1. 打开播放页，Network 过滤视频信息接口（`/dash?…`），确认目标参数是 `vf=`，复制一条完整请求作为对拍基线。
2. 全局搜 `vf=`（只命中一处）；在赋值前下断点，确认右值由 `cmd5x(...)` 产出，并记录**入参字符串**（原文口径：视频 url 的一部分，「链接去头去尾」）。
3. 搜 `cmd5x` 定义处：会看到是 webpack 打包（模块 295）。先把该 JS 下载到本地，删掉 webpack 前面的自举片段，用「一键扣 webpack」跑一次导出函数。
4. 若本地跑出的值与浏览器不一致，**先查环境识别开关**：搜被 `try`/`catch` 包住的 `eval('process;')`、`eval('require;')`，以及 `document.domain` / `window.screen.clientWidth|clientHeight`。首选处置是改名法：`process`→`process1`、`require`→`require1`（让两边都抛异常）。
5. 若报 `document is not defined`，先上 `jsdom` 把它跑通；跑通后再逐步去掉 jsdom 依赖（算法本身不需要真 DOM，只用到少数字段）。
6. 确认「没有 .wasm 文件」是**正常的**：产物是 Emscripten 的 asm.js（`-s WASM=0`，常见伴生 `WASM_ASYNC_COMPILATION=0`）。不要去找 `.wasm`。
7. 如仍需读算法：先 AST 反混淆（大数组字符串还原 → 恒真假分支 → `break`/`return` 后死代码），再读 `cmd5x` → `g`（js 层）→ `f`（wasm 层）的调用链；`g` 内部固定四步：算长度 → `malloc(长度+1)` → 复制进内存并调 `f` → 读出结果并 `free`。
8. 用 `wsam-reverse` 的 `wasm-inspect.js --crypto-constants` 扫产物里的 MD5 IV 与 T 表指纹，判断是否魔改、盐是否以明文字节形式存在。
9. 用第 1 步记下的黄金向量做回归：`cmd5x(入参) == 8f2b8b04a29e5e8d0f10b8e7a7bc7668`（该向量出自 2019-08 版本；站点版本已变，仅用于校验算法族与移植正确性，**不可**作为线上通过判据）。
