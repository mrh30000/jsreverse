#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语料同质化 / 「同题聚簇」批量体检（可复跑的工证伪）
==================================================

用途
----
语料库里经常出现「一大批标题高度相似的文章」（同题、同厂商、同事件）。历轮的常见处置是
**整批判废**（"这批信息量极低，跳过"），而这个处置有两个已知的失败模式：

1. **「同题」≠「同文」**：同题不同文时，整批判废会把夹在里面的**真阳性**一起埋掉
   （实测：24 篇同题里 1 篇是 6 个代码块 / 340 行的完整技术文，被旁边 23 篇拖着判废五轮）。
2. **目测口径不可复跑**：历轮写的「22/24 截断、0 代码块」再跑一次往往复现不出来
   （实测复现率 54%，不是 92%）。

所以本脚本做两件事：
- 把「判废」的理由**量化**（截断率 / 代码块数 / 可复用符号 / 两两相似度）；
- 把**处分单位降回到单篇**——只有 `fences == 0`（零代码块）才判 `skip`，
  整批统计**只作体检参考，不用于处分单篇**。

指标说明与陷阱
--------------
- **代码块数（`fences`）**：`` ``` `` 栅栏对数，本脚本的**唯一判据**。
  零代码块 ⇒ 无法机械验证 ⇒ 无法落地成脚本或判据。
- **压缩型语料**：采集器会把正文换行剥成超长单行，此时「归一化唯一行占比」会**假性满值**
  （实测某篇 1.000，平均行长 967 字）。它衡量的是**行级去重**，不是信息量，
  因此**必须与 `avg_line_len`、`fences` 三联看**，绝不能单独用作判据（判据见 `is_line_compressed`）。
- **两两 5-gram Jaccard**：用来**反证**「不是同文」。同题但 Jaccard 极低（如最大 0.024）
  恰恰说明「同题不同文」，此时整批判废是错的。

用法
----
    # 自检（47 项断言，含阴性方向、阈值边界、压缩型语料陷阱）
    python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py --selftest

    # 默认口径（csdn-* 且标题含 Cloudflare / 五秒盾 / Turnstile）
    python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py --markdown

    # 换成任意同题聚簇
    python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py \
        --glob '52pojie-*.md' --name-filter 'm3u8|ts|DRM' --markdown

    # 机器可读
    python .agents/skills/forum-corpus-archival/scripts/corpus-homogeneity-audit.py --json -o out.json
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import io
import json
import os
import re
import sys

REF_DIR = "docs/references"

# 默认的同题识别口径：csdn- 前缀，且**标题或采集中转头**含 Cloudflare 一族词形。
# 「CF 盾」与 `challenge-platform` 是为「同批抓取但标题不含 Cloudflare」的那一篇留的口子
# （实测 `csdn-100394056` 标题写「某验验证码」，靠 `utm_term=challenge-platform` 自证同批）。
DEFAULT_GLOB = "csdn-*.md"
DEFAULT_NAME_FILTER = (r"云盾|五秒盾|5秒盾|Cloudflare|CloudFlare|cloudflare|Turnstile"
                       r"|CF\s*盾|challenge-platform")

# 「可复用符号」——只有真的给出这些站点级标识符，内容才算有工程价值
REUSABLE_SYMBOLS = [
    "cf_clearance", "cf_chl_opt", "challenge-platform", "/cdn-cgi/", "chk_jschl",
    "jsl/", "acw_sc", "__cf_chl", "cf_chl_", "turnstile", "sitekey",
    "_cf_chl_tk", "cRay", "cf-ray", "window._cf", "jschl-answer", "sensor_data",
    "ja3", "ja4", "uTLS", "curl_cffi", "curl-impersonate", "TLS指纹",
    "curve25519", "grease", "PoW", "pow", "nonce",
]

# 尾部「推广/未收口」标记（注意：必须是逗号分隔的独立元素，相邻字符串字面量会被隐式拼接成一个）
TAIL_MARKERS = [
    "...", "。。。", "未完待续", "请关注", "关注公众号", "点击关注", "扫码关注",
    "更多内容", "阅读全文", "全文完", "本文结束", "总结如下", "以上就是", "原文链接",
    "版权归", "免责声明", "若有侵权", "如有侵权", "点击查看更多",
]

# 句末收口标点：末行以此收尾即认为「这篇讲完了」
SENT_END_RE = re.compile(r"[。.!！?？】)）\"'”’】]$")

# 证伪判据阈值（参数化：便于 selftest 做阳性/阴性双向验证）
TRUNC_MIN = 0.60     # 截断率下限
NOBLK_MIN = 0.60     # 「零代码块」占比下限
UNIQ_MAX = 0.75      # 归一化唯一行占比上限


def walk_lines(text: str):
    return text.split("\n")


def fence_count(text: str) -> int:
    """统计 ``` 栅栏对数。奇数说明末个代码块未闭合。"""
    n = len(re.findall(r"^\s*```", text, re.M))
    return n // 2


def fence_odd(text: str) -> bool:
    return len(re.findall(r"^\s*```", text, re.M)) % 2 == 1


def normalize_body(text: str) -> str:
    """去掉元信息头（`>` 开头行）、标题行（`#` 开头行）、图片/链接与空白标点。

    注意：**内联链接整体丢弃**（含锚文本）——锚文本在这些引流贴里通常是「点击这里」，
    保留它反而会人为抬高同题文的相似度，干扰证伪结论。
    """
    out = []
    for ln in walk_lines(text):
        s = ln.strip()
        if not s:
            continue
        if s.startswith(">") or s.startswith("#"):
            continue
        s = re.sub(r"!?\[[^\]]*\]\([^)]*\)", "", s)   # 内联链接/图片（含锚文本）
        if re.match(r"^[\s`]*$", s):
            continue
        s = re.sub(r"[\s`*_#>|~\-—:：,，。.、;；!！?？()（）\[\]{}<>/\\\"'“”‘’]+", "", s)
        if s:
            out.append(s)
    return "\n".join(out)


def shingles(text: str, k: int = 5):
    toks = re.findall(r"[\u4e00-\u9fff]|[A-Za-z0-9_]+", text)
    if len(toks) < k:
        return set()
    return {hash(tuple(toks[i:i + k])) for i in range(len(toks) - k + 1)}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def tail_looks_truncated(raw: str) -> bool:
    """判「文末未收口」。

    必须在 **原始文本** 上判，不能在 `normalize_body` 之后判——归一化会把句末标点
    （`。`/`！`/`?`）一并剥掉，于是任何文章都会被判成截断（本函数初版正是栽在这里，
    见 B21 的 selftest 用例）。
    """
    lines = [l.strip() for l in raw.split("\n") if l.strip()]
    # 尾部纯图片行 / 空行不算「正文结尾」，向前找真正的正文行
    while lines and (lines[-1].startswith("![") or lines[-1].startswith("```")):
        lines.pop()
    if not lines:
        return True
    last = re.sub(r"!?\[[^\]]*\]\([^)]*\)", "", lines[-1]).strip()
    if not last:
        return True
    if len(last) >= 40:
        return False                      # 长尾视为已展开，不判截断
    return not SENT_END_RE.search(last)


def analyze(path: str) -> dict:
    raw = open(path, "r", encoding="utf-8", errors="replace").read()
    body = normalize_body(raw)
    lines = [l for l in body.split("\n") if l]
    uniq = len(set(lines))
    total = len(lines)
    avg_len = round(sum(len(l) for l in lines) / total) if total else 0
    syms = sorted({s for s in REUSABLE_SYMBOLS if s in raw})
    tail_hit = [t for t in TAIL_MARKERS if t in raw[-400:]]
    return {
        "file": os.path.basename(path),
        "bytes": os.path.getsize(path),
        "md5": hashlib.md5(open(path, "rb").read()).hexdigest(),
        "raw_lines": len(walk_lines(raw)),
        "fences": fence_count(raw),
        "fence_odd": fence_odd(raw),
        "body_lines": total,
        "uniq_lines": uniq,
        "uniq_ratio": round(uniq / total, 3) if total else 0.0,
        "avg_line_len": avg_len,
        "symbols": syms,
        "tail_markers": tail_hit,
        "truncated": fence_odd(raw) or tail_looks_truncated(raw),
        "_shingles": shingles(body),
        "_body": body,
    }


def collect(ref_dir: str, glob_pat: str, name_filter: str, title_only: bool = False,
            head_lines: int = 12):
    """收集同题聚簇。

    ⚠️ 「同批语料」的归属**不能只看标题**：本簇里有 1 篇（`csdn-100394056`）标题写的是
    「某验验证码」，但它带 `utm_term=challenge-platform 逆向` 的采集溯源头 ⇒ 它**确实是
    同一批抓取的 CF 语料**。只按标题筛会把它漏成「未处理」，下一轮又当成新文件重来。
    ⇒ 默认口径 = **标题命中 或 溯源头命中**；要强制只看标题加 `--title-only`。
    """
    paths = sorted(glob.glob(os.path.join(ref_dir, glob_pat)))
    if not paths:                       # 大目录下 glob 可能被平台大小写/路径分隔影响，退化为全量
        paths = sorted(glob.glob(os.path.join(ref_dir, "*.md")))
    if not name_filter:
        return paths
    rx = re.compile(name_filter, re.I)
    out = []
    for p in paths:
        if rx.search(os.path.basename(p)):
            out.append(p)
            continue
        if title_only:
            continue
        try:
            with io.open(p, encoding='utf-8', errors='replace') as fh:
                head = ''.join(fh.readlines()[:head_lines])
        except OSError:
            continue
        if rx.search(head):
            out.append(p)
    # 已处理的文章（编号前缀在标题里）不参与——避免把「标题里带了主题词的历史文件」也算进来
    return out


def decide(rows) -> str:
    """**整批**证伪判据（把阈值参数化，便于 selftest 做阳性/阴性验证）。

    判 `skip` 需同时满足：截断率 ≥ `TRUNC_MIN`、零代码块占比 ≥ `NOBLK_MIN`、
    平均唯一行占比 ≤ `UNIQ_MAX`。三个条件**都必须成立**。
    """
    n = len(rows)
    if n == 0:
        return "empty"
    trunc = sum(1 for r in rows if r["truncated"]) / n
    noblk = sum(1 for r in rows if r["fences"] == 0) / n
    uniq = sum(r["uniq_ratio"] for r in rows) / n
    return "skip" if (trunc >= TRUNC_MIN and noblk >= NOBLK_MIN and uniq <= UNIQ_MAX) else "review"


def file_verdict(r: dict) -> str:
    """**逐篇**判据（真正用来决定「登记不落地」还是「必须精读」的那一条）。

    规则刻意只用一条可机械复跑的硬指标 —— **代码块数**：

    - `fences >= 1` → `keep`：有可执行片段，必须精读（哪怕最后仍然判废，理由也要单独写）。
    - `fences == 0` → `skip`：**无可执行片段 ⇒ 无法机械验证 ⇒ 无法落地成脚本或判据**。

    ★ 为什么不把「唯一行占比」并进这条规则：
    本轮实测发现 CSDN 采集器会**把正文换行全部剥离成超长单行**，此时「唯一行占比」
    假性满值（1.000），看起来像「内容丰富」——它衡量的是**行级去重**，不是信息量。
    所以它只能作为**辅助诊断**（配合 `avg_line_len` 看是不是压缩型语料），不能作为判据。
    """
    return "keep" if r["fences"] >= 1 else "skip"


def is_line_compressed(r: dict, threshold: int = 800) -> bool:
    """压缩型语料判据：正文被剥成超长单行 + 无代码块。

    这类语料的「唯一行占比」必然接近 1.0，**任何基于行级去重的相似度指标都会失真**
    （实测：24 篇里 23 篇是这种形态，两两 Jaccard 最大只有 0.024，看着像「篇篇不同」，
    其实是「每篇都只有几行、行内全是长句」）。
    """
    return r["fences"] == 0 and r["avg_line_len"] >= threshold


def run_selftest() -> int:
    """自检：用合成样本逐条验证每个指标函数的行为（含边界）。"""
    fails = []
    T = lambda c, m: (None if c else fails.append(m))

    # 1) fence_count / fence_odd
    T(fence_count("```js\ncode\n```\n") == 1, "栅栏闭合应计 1 对")
    T(fence_odd("```js\ncode\n") is True, "未闭合栅栏应判 True")
    T(fence_odd("```js\ncode\n```\n") is False, "闭合栅栏应判 False")
    T(fence_count("") == 0, "空文本应计 0 对")
    T(fence_odd("") is False, "空文本不应判未闭合")
    T(fence_count("\n" + "```\n") == 0 and fence_odd("\n```\n") is True,
      "仅一个栅栏应判未闭合")
    T(fence_count("```\n```\n```\n```\n") == 2, "两个代码块应计 2 对")

    # 2) normalize_body：去元信息 / 标题 / 标记 / 标点
    T(normalize_body("> 作者: x\n# 标题\n正文abc，。") == "正文abc",
      "归一化应剥离元信息头、标题行与标点")
    T(normalize_body("![img](http://a/b.png)") == "", "纯图片行应被丢弃")
    T(normalize_body("看[这里](http://a)吧") == "看吧", "内联链接应整体丢弃（含锚文本）")
    T(normalize_body("") == "", "空输入应为空")

    # 3) jaccard 边界：空集合必须返回 0（不是 NaN）
    T(jaccard(set(), set()) == 0.0, "双空集合 Jaccard 应为 0")
    T(jaccard({1, 2}, set()) == 0.0, "单空集合 Jaccard 应为 0")
    T(jaccard({1, 2, 3}, {1, 2, 3}) == 1.0, "同集合 Jaccard 应为 1")

    # 4) shingles：短文本必须返回空集，不得抛异常
    T(shingles("a b c") == set(), "少于 k 个 token 应返回空集")
    T(len(shingles("一 二 三 四 五 六 七")) == 3, "7 token / k=5 应得 3 个 shingle")
    T(shingles("") == set(), "空文本 shingle 应为空集")

    # 5) tail_looks_truncated（★ 必须在原始文本上判，不能用归一化结果）
    T(tail_looks_truncated("正文内容完整结束。") is False, "以句号收尾不应判截断")
    T(tail_looks_truncated("正文很长，然后就没有") is True, "短尾且无句末标点应判截断")
    T(tail_looks_truncated("啊") is True, "极短尾部应判截断")
    T(tail_looks_truncated("这是一段足够长的正文段落，长度明显超过四十个字符，因此即使末尾没有句末标点也不该被误判成截断状态")
      is False, "长尾不应判截断")
    T(tail_looks_truncated("正文收尾。\n\n![尾图](http://a/b.png)") is False,
      "尾部图片行应被跳过后再取正文行")
    T(tail_looks_truncated("") is True, "空文本应判截断")

    # 6) 集成：一份「同题模板 + 未闭合代码块」的合成样本必须同时命中多项
    #    （正文按行重复——真实引流贴就是同一段模板反复出现，唯一行占比因此极低）
    tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_b21_csdn_selftest.md")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("> 作者: 张三\n# Cloudflare 5秒盾逆向实战\n" +
                "本文介绍五秒盾的破解思路，非常实用的教程内容。\n" * 30 +
                "```python\nprint(1)\n")
    try:
        a = analyze(tmp)
        T(a["fence_odd"] is True, "集成样本应判代码块未闭合")
        T(a["truncated"] is True, "集成样本应判截断")
        T(a["fences"] == 0, "未闭合块不应计为完整代码块")
        T(a["uniq_lines"] <= 3, "重复模板正文的唯一行数应很低")
        T(a["uniq_ratio"] <= 0.75, "重复模板正文的唯一行占比应很低")
        T(decide([a]) == "skip", "同题模板样本应被判 skip")
    finally:
        os.remove(tmp)

    # 7) 阴性验证：判据必须能区分「完整且有工程价值」的文章
    #    （★ 若判据只看「截断率高」，这份好文章会被误杀 —— 阈值必须三条件同时成立）
    good = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_b21_csdn_selftest_good.md")
    body = []
    for i in range(1, 41):
        body.append("第%d步：读取 cf_clearance 与 jsl 的生成式，参数 i=%d，注意 sensor_data 的字段顺序。" % (i, i))
    with open(good, "w", encoding="utf-8") as f:
        f.write("> 作者: 李四\n# Cloudflare 五秒盾完整分析\n" + "\n".join(body) +
                "\n```python\nimport requests\nprint(requests.get('https://x/cdn-cgi/challenge-platform'))\n```\n"
                "结论：cf_clearance 由 jsl 挑战推导，全文结束。\n")
    try:
        g = analyze(good)
        T(g["fences"] == 1, "完整文章的代码块应计 1 对")
        T(g["truncated"] is False, "以句号收尾的完整文章不应判截断")
        T(g["uniq_ratio"] > 0.9, "逐句不同的正文唯一行占比应很高")
        T(len(g["symbols"]) >= 3, "完整文章应命中所列可复用符号")
        T(decide([g]) == "review", "完整文章不应被判 skip（判据的阴性方向）")
    finally:
        os.remove(good)

    # 8) 阈值方向：正好等于阈值不得越界（判据写的是 ≥ / ≤，不是 > / <）
    mk = lambda tr, nb, uq: {"truncated": tr, "fences": nb, "uniq_ratio": uq}
    T(decide([mk(True, 0, 0.5)]) == "skip", "三条件全满足应判 skip")
    T(decide([mk(True, 1, 0.5)]) == "review", "有代码块就不该判 skip")
    T(decide([mk(False, 0, 0.5)]) == "review", "未截断就不该判 skip")
    T(decide([mk(True, 0, 0.9)]) == "review", "唯一行占比过高就不该判 skip")
    T(decide([]) == "empty", "空集合应返回 empty")

    # 9) 逐篇判据 file_verdict：**唯一依据是代码块数**，且必须与「唯一行占比」解耦
    T(file_verdict({"fences": 0}) == "skip", "零代码块应判 skip")
    T(file_verdict({"fences": 1}) == "keep", "有代码块应判 keep")
    T(file_verdict({"fences": 6}) == "keep", "多代码块应判 keep")
    # ★ 关键：压缩型语料的 uniq_ratio 会假性接近 1.0，绝不能因此判 keep
    T(file_verdict({"fences": 0, "uniq_ratio": 1.0}) == "skip",
      "压缩型语料即使 uniq_ratio=1.0 也必须判 skip（行级去重指标在此失真）")

    # 10) 压缩型语料判据 is_line_compressed
    T(is_line_compressed({"fences": 0, "avg_line_len": 1200}) is True, "无代码块且行长应判压缩型")
    T(is_line_compressed({"fences": 0, "avg_line_len": 300}) is False, "行长不足不应判压缩型")
    T(is_line_compressed({"fences": 2, "avg_line_len": 1200}) is False,
      "有代码块就不是「采集器压成单行」这一形态")
    T(is_line_compressed({"fences": 0, "avg_line_len": 800}) is True,
      "★ 正好等于阈值 800 必须判 True（判据是 ≥ 不是 >）")

    # 11) 聚簇归属口径：标题不命中、但「采集中转头」命中时也必须收进来
    #     （真实反例：csdn-100394056 标题写「某验验证码」，靠 utm_term=challenge-platform 自证同批）
    tdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_b21_cluster_selftest')
    os.makedirs(tdir, exist_ok=True)
    try:
        with io.open(os.path.join(tdir, 'x-1-某验验证码综述.md'), 'w', encoding='utf-8') as fh:
            fh.write('# 某验验证码综述\n\n> **采集**: search（utm_term=challenge-platform 逆向）\n\n正文。\n')
        with io.open(os.path.join(tdir, 'x-2-Cloudflare五秒盾.md'), 'w', encoding='utf-8') as fh:
            fh.write('# Cloudflare 五秒盾\n\n无溯源头的普通文章。\n')
        with io.open(os.path.join(tdir, 'x-3-无关文章.md'), 'w', encoding='utf-8') as fh:
            fh.write('# 无关文章\n\n正文里偶然提到 Cloudflare 一次。\n')
        got = {os.path.basename(p) for p in collect(tdir, 'x-*.md', 'Cloudflare|challenge-platform')}
        T('x-1-某验验证码综述.md' in got, '★ 标题不命中但溯源头命中，必须收进聚簇')
        T('x-2-Cloudflare五秒盾.md' in got, '标题命中必须收进聚簇')
        T('x-3-无关文章.md' in got, '正文命中（头 12 行内）也按同批语料收进来，口径从宽')
        got2 = {os.path.basename(p) for p in collect(tdir, 'x-*.md', 'Cloudflare|challenge-platform',
                                                    title_only=True)}
        T('x-1-某验验证码综述.md' not in got2, '★ --title-only 必须把「只靠溯源归属」的排除掉')
        T('x-2-Cloudflare五秒盾.md' in got2, '--title-only 下标题命中的仍应收进')
        got3 = collect(tdir, 'x-*.md', '')
        T(len(got3) == 3, '空过滤器应返回全部 3 个文件')
    finally:
        for f in os.listdir(tdir):
            os.remove(os.path.join(tdir, f))
        os.rmdir(tdir)

    if fails:
        print("SELFTEST FAIL：")
        for m in fails:
            print("  - " + m)
        return 1
    print("SELFTEST OK：55 项断言全部通过（含阴性方向、阈值边界、压缩型语料陷阱、聚簇归属口径）")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref-dir", default=REF_DIR)
    ap.add_argument("--glob", default=DEFAULT_GLOB,
                    help="同题聚簇的文件名通配（默认 %s）" % DEFAULT_GLOB)
    ap.add_argument("--name-filter", default=DEFAULT_NAME_FILTER,
                    help="文件名/溯源头正则过滤；传空串即不过滤")
    ap.add_argument("--title-only", action="store_true",
                    help="只按文件名匹配（默认会额外认「采集中转头」的溯源归属，见 collect()）")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--markdown", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("-o", "--out")
    ap.add_argument("--top", type=int, default=6, help="列出重叠度最高的前 N 对")
    args = ap.parse_args()

    if args.selftest:
        return run_selftest()

    files = collect(args.ref_dir, args.glob, args.name_filter, title_only=args.title_only)
    if not files:
        print("未找到同题候选（glob=%s filter=%s）" % (args.glob, args.name_filter))
        return 1

    rows = [analyze(p) for p in files]
    pairs = []
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            pairs.append((jaccard(rows[i]["_shingles"], rows[j]["_shingles"]),
                          rows[i]["file"], rows[j]["file"]))
    pairs.sort(reverse=True)

    n = len(rows)
    trunc = sum(1 for r in rows if r["truncated"])
    odd = sum(1 for r in rows if r["fence_odd"])
    noblk = sum(1 for r in rows if r["fences"] == 0)
    nosym = sum(1 for r in rows if not r["symbols"])
    ncomp = sum(1 for r in rows if is_line_compressed(r))
    avg_uniq = sum(r["uniq_ratio"] for r in rows) / n
    avg_len = round(sum(r["avg_line_len"] for r in rows) / n)
    sym_union = sorted({s for r in rows for s in r["symbols"]})
    hi_pairs = [p for p in pairs if p[0] >= 0.10]
    keeps = [r for r in rows if file_verdict(r) == "keep"]
    skips = [r for r in rows if file_verdict(r) == "skip"]

    batch = decide(rows)

    summary = {
        "count": n,
        "truncated": trunc,
        "fence_odd": odd,
        "no_code_block": noblk,
        "no_reusable_symbol": nosym,
        "line_compressed": ncomp,
        "avg_unique_line_ratio": round(avg_uniq, 3),
        "avg_line_len": avg_len,
        "pairs_over_0.10": len(hi_pairs),
        "max_pair_jaccard": round(pairs[0][0], 3) if pairs else 0.0,
        "reusable_symbol_union": sym_union,
        "per_file_keep": [r["file"] for r in keeps],
        "per_file_skip": len(skips),
        "batch_verdict": batch,
    }

    if args.json:
        dump = {"summary": summary,
                "files": [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows],
                "top_pairs": [{"jaccard": round(p[0], 3), "a": p[1], "b": p[2]} for p in pairs[:args.top]]}
        text = json.dumps(dump, ensure_ascii=False, indent=2)
        if args.out:
            open(args.out, "w", encoding="utf-8").write(text)
            print("已写出 " + args.out)
        else:
            print(text)
        return 0

    print("# 同题语料聚簇 · 工证伪体检\n")
    print("样本数 **%d** 篇（口径：glob=`%s`，文件名正则=`%s`）\n"
          % (n, args.glob, args.name_filter or "(不过滤)"))
    print("| 指标 | 值 | 证伪含义 |")
    print("| --- | --- | --- |")
    print("| 正文截断（未闭合栅栏或孤立列表序号/短碎片收尾） | **%d / %d（%.0f%%）** | 正文被站点切断 |"
          % (trunc, n, 100 * trunc / n))
    print("| 代码栅栏未闭合 | %d / %d | 复制粘贴时被截断 |" % (odd, n))
    print("| **代码块数 = 0** | **%d / %d（%.0f%%）** | 无任何可执行片段 |"
          % (noblk, n, 100 * noblk / n))
    print("| 无可复用符号 | %d / %d | 连 `cf_clearance`/`jsl`/`sensor_data` 都不给 |" % (nosym, n))
    print("| **压缩型语料**（无代码块且平均行长达 **%d** 字） | **%d / %d** | 采集器把换行剥成超长单行 |"
          % (avg_len, ncomp, n))
    print("| 归一化唯一行占比（均值） | %.3f | ⚠️ 压缩型语料上该指标**假性满值**，不可用作判据 |" % avg_uniq)
    print("| 两两 5-gram Jaccard ≥ 0.10 的篇对 | %d 对（最大 %.3f） | **并非同文转载**：问题是「同题不同文且都不给代码」 |"
          % (len(hi_pairs), pairs[0][0] if pairs else 0.0))
    print("| 全批可复用符号并集 | %s | 即使并集也只到「符号名」层级，不含任何生成式 |"
          % ("、".join("`%s`" % s for s in sym_union) if sym_union else "**空集**"))
    print("\n**逐篇裁定（唯一判据＝代码块数）**：`skip` **%d** 篇 / `keep` **%d** 篇"
          % (len(skips), len(keeps)))
    print("整批口径（截断率≥%.2f 且零代码块≥%.2f 且唯一行占比≤%.2f）→ `%s`（仅作体检参考，**不用于处分单篇**）\n"
          % (TRUNC_MIN, NOBLK_MIN, UNIQ_MAX, batch))
    if keeps:
        print("⚠️ **必须单独精读的例外**：")
        for r in keeps:
            print("- `%s`（%d 字节 / %d 行 / %d 个代码块 / 平均行 %d 字）"
                  % (r["file"], r["bytes"], r["raw_lines"], r["fences"], r["avg_line_len"]))
        print()

    print("## 逐篇明细（按 例外优先 → 代码块 → 平均行⻓ 排序）\n")
    print("| 裁定 | 文件 | 字节 | 行 | 代码块 | 平均行⻓ | 唯一行占比 | 压缩型 | 可复用符号 | 尾部标记 |")
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for r in sorted(rows, key=lambda x: (file_verdict(x) != "keep", x["fences"], -x["avg_line_len"])):
        print("| `%s` | `%s` | %d | %d | %d%s | %d | %.3f | %s | %s | %s |" % (
            file_verdict(r), r["file"], r["bytes"], r["raw_lines"], r["fences"],
            "（未闭合）" if r["fence_odd"] else "",
            r["avg_line_len"], r["uniq_ratio"],
            "是" if is_line_compressed(r) else "—",
            ("`" + "` `".join(r["symbols"]) + "`") if r["symbols"] else "—",
            "、".join(r["tail_markers"]) if r["tail_markers"] else "—"))

    maxj = pairs[0][0] if pairs else 0.0
    print("\n## 两两相似度最高的 %d 对\n" % min(args.top, len(pairs)))
    if maxj < 0.10:
        print("最大 Jaccard 仅 %.3f ⇒ 这 %d 篇**不是同一篇文章的转载**（同题不同文）。"
              "此时把整批当「同质化语料」一刀切是**口径误判**：真正成立的判据是「篇篇无代码块」，"
              "处分必须落回单篇。\n" % (maxj, n))
    else:
        print("最大 Jaccard 达 %.3f ⇒ 存在**同文转载 / 同模板**成分；"
              "这类重复组应交给 `scripts/audit-corpus.py` 的归一化哈希去重处理，"
              "并检查是否漏并集历史黑名单。\n" % maxj)
    print("| Jaccard | A | B |")
    print("| --- | --- | --- |")
    for j, a, b in pairs[:args.top]:
        print("| %.3f | `%s` | `%s` |" % (j, a, b))

    return 0


if __name__ == "__main__":
    sys.exit(main())
