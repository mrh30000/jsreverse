# 试看门控与分片枚举补齐（预览层 —— §0 与 A 层之间）

> **来源**：`docs/references/52pojie-2105967`（2026-05，Flutter 套壳 App，AES-128-CBC 的 HLS 加密，
> 实测从 10 秒试看补齐到 **23分52秒 / 143 个明文切片**）。
>
> **定位**：本文只解决一件事 —— **只拿到 N 秒试看 / 索引被截断时怎么办**。
> A–F 层判据见 `SKILL.md` 分层表；m3u8 字段语义、TS/PES/ES 分层、key/IV 四类来源见
> `references/hls-and-ts-structure.md`；「拿到一个能直接播的地址」（§0 层）见
> `references/playback-address-interfaces.md`。
>
> ⚠️ **口径**：本文 §6 的 5 条安全缺陷是**对一个具体站点的实测归纳**，不是行业普查；
> 引用时必须连同「该案例」一起说。

---

## §1 受控点二分判据（30 秒分流）

**现象**：进度条只有 N 秒（该案例 **10 秒**）且弹窗提示「预览 / 试看」。「N 秒」有两种完全不同的来源：

| 现象（先看 URL 与索引本身） | 受控点 | 结论 |
| --- | --- | --- |
| 接口返回**完整**播放列表，只有前端 `seek` / `maxTime` 被截断 | **前端只截断展示** | 改播放器时长上限 / 请求参数即可（§2 左列） |
| **URL 里带 `_preview` 后缀**（形如 `…_preview.m3u8`） | **服务端侧** | 服务端只下发试看切片 ⇒ 只能从索引/分片层绕，或放弃（§2 右列） |
| **去掉 `_preview` 后缀仍然只有试看** | **服务端侧（实测确认）** | 改 URL 不改授权 ⇒ 见 §3 |

> ★ **2105967 的判据**：该案例抓到的 m3u8 路径形如
> `…/9db974a1f1604e7192ece82052f8f227_preview.m3u8?t=69f62d81&us=2050613724956127235&sign=cf0c146e9ecafcebb86a16b537ed196102fb9955`。
> **`_preview` 后缀 = 服务端侧**。作者原话：把 `_preview` 去掉「这种方法我已经替你们试过了，**是没用的**」。

**为什么 `_preview` 是服务端侧的强信号**（两条可独立复核的证据）：

1. 该 URL 还挂着 **CDN 防盗链签名 `sign`**：没有正确 `sign`，CDN 直接返回 `403 Forbidden`
   ⇒ 地址是服务端签发的，不是前端自己拼的。
2. 试看 m3u8 里**直接写着 `#EXT-X-ENDLIST`**（且只有一条 `#EXTINF`）⇒ **列表本身就是被截断的**，
   不是前端隐藏了后半段。

> ⚠️ **不要用「套壳软件」这个先验下结论**。源文先说「套壳软件大多共用服务器资源，一般采取第 1 种（前端截断）」，
> 随后**实测落到第 2 种**。⇒ 判据必须以 `_preview` / `#EXT-X-ENDLIST` 这类 **URL 与索引证据**为准，
> 不能靠「这类软件一般都…」的统计直觉。

---

## §2 两种情况的处置分叉

| 受控点 | 能做什么 | 不能做什么（源文负面结论） |
| --- | --- | --- |
| **前端截断** | 直接改播放器时长上限 / 请求参数；或照抄播放器内部的请求（多半本来就是同一份完整列表） | —— |
| **服务端侧（`_preview`）** | 换一条**不受试看授权约束**的资源路径：① 分片直链（§3）；② 若试看版与完整版同源同 key，则试看版即泄露通道（§6 缺陷 5） | 改 URL 后缀 / 改请求头 / 重放抓包，都过不了服务端授权 |

- **服务端侧不要「改请求」，要「换入口」** —— 该案例唯一可用的入口就是 **分片名可预测**（§3）。
- 源文对第 2 种情况的直白判断：「平时遇到第 2 种情况，都会**直接放弃**，因为这种情况叫『服务器验证』，
  除非你是黑客、能黑进服务器改用户信息，要不然**几乎无解**」。⇒ 若连 §3 的可预测分片名也没有，
  这一条就是「放弃」而不是「继续抠」。

---

## §3 分片名可预测 ⇒ 枚举补齐

该案例的 TS 形状（源文原样）：

```text
https://xxx.com/video/<年-月-日>/18/<19位ID>/<年-月-日><两位序号>.ts
                 │             │  │        └─ 末尾两位就是分片序号（实测改它可下到别的切片）
                 │             │  └─ 类似视频 ID（该案例 19 位：1819323645960531968）
                 │             └─ 未知字段（源文标为“18(未知)”）
                 └─ 日期目录
实测样例：https://xxx.com/video/2024-08-02/18/1819323645960531968/2024-08-0268.ts
```

- **判据**：m3u8 只给了一条 `#EXTINF`，但 TS 文件名末段是**连续两位数字**（该案例 `68`）
  ⇒ 先假设它「按序号递增」，改一位数字试下一片。
- **验证动作（30 秒）**：在浏览器里把 `68` 改成别的两位数字，**能下到新 TS** ⇒ 猜想成立
  （该案例实测成立）。
- **文件名模板**：`<年-月-日><两位序号>.ts`（该案例 `2024-08-02` + `68` + `.ts`）。
  `#EXTINF` 只给了一条，其余分片是 `2024-08-02N.ts`（`N` 为递增序号）——**（源文推断，未复核）**。
- 时间目录里的 `18` 在源文被明确标为「**未知**」，**不要**把它当成序号。

> **反例（不要做的事）**：不要因为「只有一条 `#EXTINF`、`#EXT-X-ENDLIST` 已出现」就断定视频只有 10 秒。
> 该案例按序号枚举后下到 **143 个明文切片 / 23分52秒 / 300 多 MB**，比试看版**只多了 10 秒**
> —— 源文**推测**那多出来的 10 秒是**下集预告（源文推断，未复核）**；这属试看截断点与真实分片边界的正常错位。

---

## §4 枚举的终止判据

| 项 | 源文口径 |
| --- | --- |
| **起点** | **从编号 `0` 开始**遍历（不是从试看片给的 `68` 开始） |
| **步进** | 序号递增（`00, 01, 02, …`） |
| **停止条件** | **连续 3 个 404** ⇒ 认为分片已结束 |

> ⚠️ 是「**连续** 3 个 404」而不是「单个 404」。序号里可能有空洞 / 漏片，
> 单个 404 不代表结束；只有**连续三个都 404** 才判终止。
> 实现上要记「**最后一个有效序号**」，收尾自查时用得上。

---

## §5 配套的 key / IV 获取（A 层）

试看 m3u8 原文（该案例实测）：

```text
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:11
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-KEY:METHOD=AES-128,URI="/keyhome/video.key",IV=0x4ff43fb9b8921a8f12fb0f3a08570689
#EXTINF:10.759233,
https://xxx.com/.../xxx.ts
#EXT-X-ENDLIST
```

| 字段 | 取值 | 处置 |
| --- | --- | --- |
| `URI="/keyhome/video.key"` | **相对路径** | 按 m3u8 的目录拼绝对地址 ⇒ `https://xxx.com/keyhome/video.key` |
| key 响应头 | `Content-Length: 16` | Body 就是 **16 字节二进制**，直接当 AES-128 密钥 |
| key body | `sdj3nxuuw3koukvs` | 16 个可打印字符 = **16 字节 ASCII**（不是 hex、不是 base64） |
| 加密方式 | `METHOD=AES-128` | 算法 = **AES-128-CBC**（16 字节 key、16 字节块、**PKCS#7** 填充） |
| `IV=0x4ff43fb9b8921a8f12fb0f3a08570689` | `0x` + **32 个 hex 字符** | `bytes.fromhex("4ff4…")` ⇒ 16 字节 |

- **相对路径拼法判据**：`URI` 以 `/` 开头 ⇒ 相对**站点根**；否则相对 **m3u8 所在目录**。
  此例拼出来是 `https://xxx.com/keyhome/video.key`
  （**不是** `…/video/2024-08-02/18/<ID>/keyhome/video.key`）。
- `Content-Length` 不是 16 时先别当 key 用：可能是 hex 文本（32 字符）/ base64 —— 见
  `references/hls-and-ts-structure.md` §4.1。
- 机械动作（取 key → 定位分片 → 解一片验证）：
  ```bash
  S=.claude/skills/stream-drm-reverse/scripts
  python $S/m3u8_probe.py <playlist.m3u8> --pretty            # 判层 + 列出 EXT-X-KEY / IV
  python $S/m3u8_probe.py <playlist.m3u8> --fetch-keys -o keys.json
  python $S/media_crypto.py aes-cbc --input seg0.ts --out seg0.clear.ts \
    --key-utf8 sdj3nxuuw3koukvs --iv-hex 4ff43fb9b8921a8f12fb0f3a08570689
  ffmpeg -v error -i seg0.clear.ts -f null -                  # 0 error 才算过
  ```
  **先解通一片**，再去跑 §7 的整段枚举 —— 枚举几百片之后再发现 key/IV 错了会白跑一遍。

---

## §6 安全缺陷清单（该案例实测，L0 起点 → L3 目标）

> **分级口径**：源文只点名了 **L0**（静态密钥）与 **L3**（动态鉴权）两个档位名，
> **没有**给 L1 / L2 命名 ⇒ 本文**不自行补**中间档。下表把这 5 条缺陷按「源文描述」原样列出，
> 加固方向用源文自己给的那句。

| # | 缺陷 | 源文描述要点 | 加固方向 |
| --- | --- | --- | --- |
| 1 | 静态密钥 | Key 文件**长期不变**（经测试多个视频可知），一次泄露**永久失效** | 源文点名：把 **L0 的静态密钥**升级到 **L3 的动态鉴权** |
| 2 | 密钥无鉴权 | `video.key` 可以**匿名下载**，不校验请求者身份 | key 接口加热度/身份/时效校验 |
| 3 | IV 可能固定 | 试看版使用**固定 IV**，且其他视频试看版 IV 与该视频也相同；（源文推断，未复核）完整版**极大可能复用相同 IV** | 每片 / 每会话独立 IV |
| 4 | 签名仅保护索引 | TS 和 Key 直链**无签名**，绕过 M3U8 也能直接访问 | 签名覆盖**分片与 key**，不只覆盖索引 |
| 5 | 试看版参数泄露 | `xxx_preview.m3u8`（源文推断，未复核）**极有可能与完整版同源同密钥**，成为信息泄露通道（同上 IV 固定漏洞） | 试看版与完整版**密钥彻底隔离** |

**源文给出的升级方向（原话）**：平台方应把 **L0 的静态密钥**升级到 **L3 的动态鉴权**，
把可预测的切片名替换为**随机 UUID**，把试看版与完整版的**密钥彻底隔离**。

> ⚠️ **源文推断，未复核**：作者另称「理论上这种方法对涉及以上『未动态分链鉴权』漏洞的网站或 App 都有效果
> （其实 60~70% 的这类软件都存在这个漏洞）」。这是**作者的主观估计，未做抽样复核**，
> **不可当作统计结论**引用；只可复述为「该案例作者认为可推广」。

---

## §7 成品脚本形态

**骨架四步**：① 从 m3u8 取 IV + Key → ② 从编号 `0` 开始遍历编号 → ③ **连续 3 个 404** 停 →
④ `ffmpeg` 合并。（源文成品是 Termux 上的 Python 脚本，此处只给可运行骨架与参数面。）

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按分片序号枚举补齐被截断的试看（2105967 的形态）。
依赖：pip install pycryptodome（另有 ffmpeg 需在 PATH 中，仅用于最后合并）

用法：
  python enum_segments.py \
      --url-template "https://xxx.com/video/2024-08-02/18/1819323645960531968/2024-08-02{n:02d}.ts" \
      --outdir segs --key-file key.key --iv-hex 4ff43fb9b8921a8f12fb0f3a08570689
"""
import argparse
import os
import subprocess
import urllib.error
import urllib.request

from Crypto.Cipher import AES            # pycryptodome
from Crypto.Util.Padding import unpad


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read()


def decrypt_cbc(data, key, iv):
    pt = AES.new(key, AES.MODE_CBC, iv=iv).decrypt(data)
    try:
        return unpad(pt, AES.block_size)          # PKCS#7
    except ValueError:                            # 填充异常则原样返回
        return pt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url-template", required=True,
                    help="含 {n:02d} 占位符的分片地址模板")
    ap.add_argument("--outdir", default="segs")
    ap.add_argument("--key-file", default="key.key", help="16 字节二进制 key")
    ap.add_argument("--iv-hex", required=True, help="32 个 hex 字符（不含 0x）")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--max", type=int, default=2000)
    ap.add_argument("--miss", type=int, default=3,
                    help="连续 N 个 404 即停（源文口径 N=3）")
    args = ap.parse_args()

    key = open(args.key_file, "rb").read()
    iv = bytes.fromhex(args.iv_hex)
    os.makedirs(args.outdir, exist_ok=True)

    misses, saved = 0, []
    for n in range(args.start, args.start + args.max):
        url = args.url_template.format(n=n)
        try:
            enc = fetch(url)
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            misses += 1
            if misses >= args.miss:
                print(f"连续 {misses} 个 404，判定分片结束（最后一个有效序号 {n - misses}）")
                break
            continue
        misses = 0
        path = os.path.join(args.outdir, f"{n:02d}.ts")
        with open(path, "wb") as f:
            f.write(decrypt_cbc(enc, key, iv))
        saved.append(path)
        print(f"[+] {n:02d} -> {path}")

    if saved:
        listfile = os.path.join(args.outdir, "concat.txt")
        with open(listfile, "w", encoding="utf-8") as f:
            for p in saved:
                f.write("file '%s'\n" % os.path.abspath(p))
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
                        "-c", "copy", os.path.join(args.outdir, "out.mp4")], check=True)


if __name__ == "__main__":
    main()
```

- 参数面：`--url-template` 里放整个 URL，只把序号留成 `{n:02d}`（两位补零）——
  该案例的序号就是两位（`68`），改模板比改代码安全。
- `--miss 3` 默认即源文口径；**不要**图省事改成 1（见 §4）。
- 合并前若报 `dts non monotonically increasing`，那是**下载/合并顺序**问题，不是解密问题
  （`SKILL.md` 坑表有对应处置）。

---

## §8 排错速查

| 现象 | 判断 | 处置 |
| --- | --- | --- |
| m3u8 带 `_preview`，去掉后缀仍只有 N 秒 | 受控点在**服务端** | 走 §3 分片枚举；否则属 §2「放弃」档 |
| 枚举每一片都 404 | URL 模板与真实形状不符（序号位数 / 目录段 / 主机） | 先用浏览器**手改一位数字**确认形状，再写模板 |
| 枚举超出真实末尾 | 「单个 404 即停」把空洞当结尾 | 改回 §4 的「**连续 3 个 404**」 |
| 末尾多出十几秒（如下集预告） | 试看截断点与真实分片边界的正常错位 | **不是错误**：该案例实测多出 10 秒（下集预告） |
| 解出来 `0x47` 对不上 / 花屏 | 已不属本层 | 回 `SKILL.md` 分层表 → `references/hls-and-ts-structure.md` §3 加密覆盖范围判据 |
| key 不是 16 字节 | 还有一层包装（W 族） | `references/key-wrapper-families.md`（先跑 §6 字母表守卫） |

---

## §9 来源表（可复核）

| 主题 | 来源文章裸 id | 取证年份 | 关键字面量 |
| --- | --- | --- | --- |
| `_preview` 后缀 = 服务端侧门控 | `52pojie-2105967` | 2026-05 | `_preview.m3u8`、`sign=cf0c146e…`、`403 Forbidden`、`#EXT-X-ENDLIST` |
| 试看 m3u8 原文 / key / IV | `52pojie-2105967` | 2026-05 | `URI="/keyhome/video.key"`、`IV=0x4ff43fb9b8921a8f12fb0f3a08570689`、`Content-Length: 16`、`sdj3nxuuw3koukvs` |
| 分片名可预测与枚举 | `52pojie-2105967` | 2026-05 | `2024-08-0268.ts`、`连续遇到三个 404`、`143 个明文切片`、`23分52秒` |
| AES-128-CBC / TS 结构 | `52pojie-2105967` | 2026-05 | `188 字节`、`0x47`、`PKCS#7`、`PAT`/`PMT`/`PES` |
| 5 条安全缺陷与升级方向 | `52pojie-2105967` | 2026-05 | `L0`、`L3`、`随机 UUID`、`试看版与完整版的密钥彻底隔离` |

> 「取证年份」= 来源文章的发布时间（**不是**站点改版时间）。站点随时会换鉴权与切片命名
> ⇒ **引用本表时必须连同「取证年份」一起引用**。
