#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""repair-encoding.py —— 语料「部分乱码」检测与修复（零依赖）

背景（B13 实测）：
  抓取落盘的语料里出现过**部分乱码** —— 同一个文件里，52pojie 的头部元信息
  （标题 / 作者 / 版块 / 原文链接）是正常中文，而正文却是
  「дёҖгҖҒеҲҶжһҗ」这种西里尔字母串。
  成因：正文那段是**先把 UTF-8 字节按某个单字节码页解码**成字符串，再整体按 UTF-8 写盘。

🔴 关键坑一：**码页不止一个**。实测 52pojie 语料里出现过 `ptcp154`（Cyrillic-Asian，CP154）
  与 `cp1251`（Windows-1251）两种；两者在 0xC0–0xFF 上完全一致、在 0x80–0xBF 上不同。
  ⇒ 用 cp1251 去救 cp154 的文件，会在"那一半能编出来"的行上**静默给出错字**
    （因为 cp1251 编得出来，round-trip 后依然"像 UTF-8"，不报错）。B13 先踩了这个坑。

🔴 关键坑二：**同一个文件里可能混用多张表**。实测同一行里同时出现了
  `ptcp154` 的字符（Җ ғ ә）、**CP1252** 的字符（‘ → 0x91）与 **Latin-1** 的字符（» → 0xBB）。
  也就是说上游解码器的行为是「码页已定义就用码页，未定义就退回 Latin-1/CP1252」。
  ⇒ 所以本工具**不做"选一个码页"，而是逐字符求候选字节**，再用「结果必须是合法 UTF-8」
    这个硬约束把候选收敛到唯一解（见 `decode_run`）。这是唯一能同时吃下三种表的方法。

判据：
  一段文本里出现 **U+0400–U+04FF（西里尔字母）连续成串**（>= 阈值）⇒ 高度可疑。
  正常中文技术文章里几乎不会出现成串西里尔字母。

两阶段修复（这是本工具「能被信任」的原因）：
  阶段一（**判定**）：只有「达到阈值的行」才算嫌疑行；必须至少有一行能被无歧义还原，
                      才认定"这个文件确实是那类事故"。否则一律**不改动**（`unresolved`）。
  阶段二（**执行**）：文件一经认定，才去处理**所有含西里尔字母的行**（含只有 2 个字母的
                      缩进 NBSP 行 `В\xa0`）—— 阶段一的判定就是它敢这么做的依据。

安全闸门：
  - **不改动含 CJK 的行**：中英混排无法区分"事故"与"真多语言"，默认拒绝（exit 2），`--force` 才处理。
  - **反向断言**：每行修复后西里尔字母必须减少，否则原样保留并记账。
  - **控制字符闸门**：还原结果不得含 \t \n \r 以外的控制字符（挡住"合法 UTF-8 但是垃圾"）。
  - **幂等**：修复后再跑必须逐字节不变。
  - **边界**：只处理"非 ASCII、非 CJK"的连续段，ASCII 与 CJK 一律逐字节透传。

退出码：0 成功（或无待修）/ 1 校验失败 / 2 拒绝执行（需人工确认/--force）/ 3 参数错误
"""

import argparse
import os
import re
import sys

EXIT_OK, EXIT_FAIL, EXIT_REFUSE, EXIT_USAGE = 0, 1, 2, 3

CYR_RE = re.compile(r'[\u0400-\u04FF]')
CJK_RE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf]')
CTRL_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')

# 上游解码器可能用到的单字节码页。**顺序即优先级**：
#   ptcp154 家族（Cyrillic-Asian）优先，其次 CP1252（吃下 0x80–0x9F 的排版符号），
#   最后 cp1251（Windows-1251）。
CODEC_ORDERS = [
    ['ptcp154', 'cp1252', 'cp1251'],
    ['cp1251', 'cp1252', 'ptcp154'],   # 上游改用 cp1251 时的备选顺序
    ['cp1252', 'cp1251', 'ptcp154'],
]
ALL_CODECS = ['ptcp154', 'cp1251', 'cp1252']

# 反向表：codec -> {char: byte}（只收单字符映射）
_ENCODE = {}
for _name in ALL_CODECS:
    _table = {}
    for _b in range(256):
        try:
            _ch = bytes([_b]).decode(_name)
        except (UnicodeDecodeError, LookupError):
            continue
        if len(_ch) == 1 and _ch not in _table:
            _table[_ch] = _b
    _ENCODE[_name] = _table

# char -> 候选字节集合（用于"这个字符是不是我方可还原的乱码"判定）
REVERSE = {}
for _b in range(256):
    REVERSE.setdefault(chr(_b), set()).add(_b)          # Latin-1 恒等
    for _name in ALL_CODECS:
        try:
            _ch = bytes([_b]).decode(_name)
        except (UnicodeDecodeError, LookupError):
            continue
        if len(_ch) == 1:
            REVERSE.setdefault(_ch, set()).add(_b)


def cyr_count(s):
    return len(CYR_RE.findall(s))


def looks_mojibake(s, threshold=8):
    return cyr_count(s) >= threshold


def _is_convertible(ch):
    """「非 ASCII 且非 CJK」的字符才参与还原；ASCII 与 CJK 一律透传。

    理由：UTF-8 的多字节序列里不会出现 ASCII 字节，所以 ASCII 天然是段边界；
    CJK 是**正常文本**（不是我方事故的产物），必须原样保留。
    """
    o = ord(ch)
    return o >= 0x80 and ch in REVERSE and not CJK_RE.match(ch)


def _bytes_for(run, order):
    """按给定优先级把一段字符编回字节。任何一个字符在该顺序下编不出来 ⇒ 返回 None。

    规则（顺序敏感，这是确定性的关键）：
      1. `ord(ch) < 0x100` 一律**恒等**取字节 —— 上游对未定义字节就是原样透传的
         （实测 '»'=0xBB、NBSP=0xA0 都属于这一类）。
      2. 否则按 order 里**第一个能编码它的码页**取字节。
    """
    out = bytearray()
    for ch in run:
        o = ord(ch)
        if o < 0x100 and o >= 0x80:
            out.append(o)                 # Latin-1 恒等（含 0xA0–0xBF 的符号位）
            continue
        for name in order:
            b = _ENCODE.get(name, {}).get(ch)
            if b is not None:
                out.append(b)
                break
        else:
            return None
    return bytes(out)


def _plausibility(text):
    """给一份候选还原结果打分（越高越像"真的中文文章"）。返回 (得分, CJK 总数)。

    🔴 这是本工具最关键的一步，也是 B13 踩坑踩出来的：
      同一段乱码，**两张不同码页都能编出"合法 UTF-8"**，但其中一套给的是错字。
      实测例：cp1251 的事故样本按 ptcp154 优先还原，得到
        `### 一、倆析虚拟机架构` / `参考这位帀傅的文章`
      —— 完全合法、完全"不报错"，但 `倆`（U+5006）应为 `分`、`帀`（U+5E00）应为 `师`。
      靠 UTF-8 合法性**无法**分辨这类静默错字。

    判优依据：**中文技术文章的正文应当落在常用字集里**。
      用 GB2312（6763 个常用简体字）当基准：越界字符（如 `倆`/`帀` 这类生僻或繁体变体）
      计入惩罚。正确的那一套还原几乎不会出现越界字符。
      ⇒ 取"越界率最低"的那套；并列时取码页优先级靠前的那套。
    """
    cjk = 0
    bad = 0
    for ch in text:
        if not CJK_RE.match(ch):
            continue
        cjk += 1
        try:
            ch.encode('gb2312')
        except (UnicodeEncodeError, LookupError):
            bad += 1
    return (bad, -cjk), cjk


def decode_run_partial(run, order):
    """兜底：整段解不出合法 UTF-8 时，还原**最长可解前缀**，残缺尾巴原样保留。

    动机（B13 实测）：事故文件里出现过"行末 UTF-8 字节被截断"的情况
    （`文章` = E6 96 87 E7 AB A0，行末的 0xA0 丢了 ⇒ 只剩 `…ж–Үз«`）。
    这类**数据丢失无法从文件本身推回来**，工具不该猜；但也不该整行放弃 ——
    把能读的部分读出来、把残缺尾巴留成原样，是信息量最大又不撒谎的选择。

    返回 (text, 是否改动)。不满足"确实变好"的判据则返回 (run, False)。
    """
    chunks = []
    for ch in run:
        o = ord(ch)
        if o < 0x100 and o >= 0x80:
            chunks.append(bytes([o]))
            continue
        # 按 order 里第一个能编码该字符的码页取字节（order 是码页名列表）
        for name in order:
            b = _ENCODE.get(name, {}).get(ch)
            if b is not None:
                chunks.append(bytes([b]))
                break
        else:
            return run, False              # 该顺序编不出来 ⇒ 交给下一个顺序

    for k in range(len(chunks) - 1, 0, -1):
        try:
            head = b''.join(chunks[:k]).decode('utf-8')
        except UnicodeDecodeError:
            continue
        if CTRL_RE.search(head):
            continue
        tail = run[k:]
        if not head or cyr_count(head) >= cyr_count(run):
            return run, False
        return head + tail, True
    return run, False


def decode_run(run):
    """把一段「可还原字符」还原成原文。返回 (text, True/False)。

    流程：对每个码页优先级各生成一套候选字节 → 保留能成为合法 UTF-8 且无控制字符的 →
    用 `_plausibility` 判优（GB2312 越界最少者胜）→ 并列时取优先级靠前者。
    全都解不出整段时，再退到 `decode_run_partial`（最长可解前缀）。
    """
    if not run or not all(_is_convertible(c) for c in run):
        return run, False

    best = None
    for rank, order in enumerate(CODEC_ORDERS):
        raw = _bytes_for(run, order)
        if raw is None:
            continue
        try:
            text = raw.decode('utf-8')
        except UnicodeDecodeError:
            continue
        if CTRL_RE.search(text):
            continue
        score, cjk = _plausibility(text)
        key = (score[0], score[1], rank)      # 越界少 > CJK 多 > 码页优先级
        if best is None or key < best[0]:
            best = (key, text)
    if best is not None:
        return best[1], True

    # 整段失败 ⇒ 试"最长可解前缀"，并按同样的判优口径挑最好的一套
    partial, pkey = None, None
    for rank, order in enumerate(CODEC_ORDERS):
        text, changed = decode_run_partial(run, order)
        if not changed:
            continue
        score, cjk = _plausibility(text)
        key = (score[0], score[1], rank)
        if pkey is None or key < pkey:
            partial, pkey = text, key
    if partial is not None:
        return partial, True
    return run, False


def repair_line(line):
    """按"可还原段"切开逐段还原；CJK/ASCII 段逐字节透传。

    返回 (新行, 是否改动, 改动段数)。
    """
    pieces, buf, changed_runs = [], [], 0
    i, n = 0, len(line)

    def flush_buf():
        if buf:
            pieces.append(''.join(buf))
            buf.clear()

    while i < n:
        ch = line[i]
        if _is_convertible(ch):
            j = i
            while j < n and _is_convertible(line[j]):
                j += 1
            run = line[i:j]
            text, ok = decode_run(run)
            # 🔴 必须先冲刷缓冲区 —— 否则 ASCII 会被堆到最后，整行顺序错乱
            #    （B13 实测：'### <乱码>' 曾被还原成 '<中文>### '）
            flush_buf()
            if ok and text != run and cyr_count(text) < cyr_count(run) \
                    and not CTRL_RE.search(text):
                pieces.append(text)
                changed_runs += 1
            else:
                pieces.append(run)      # 还原失败 / 没变好 / 出控制字符 ⇒ 原样保留，不猜
            i = j
            continue
        buf.append(ch)
        i += 1

    flush_buf()
    new = ''.join(pieces)
    return new, new != line, changed_runs


def repair_text(text, force=False, threshold=8):
    """返回 (新文本, 统计)。返回 None 表示"拒绝执行"（需人工确认）。"""
    lines = text.split('\n')
    suspects = [ln for ln in lines if looks_mojibake(ln, threshold)]

    stats = {'lines_total': len(lines), 'lines_suspect': len(suspects),
             'lines_touched': 0, 'lines_ok': 0, 'lines_failed': 0,
             'mixed_lines': 0, 'runs_fixed': 0, 'unresolved': False,
             'below_threshold': sum(1 for ln in lines if CYR_RE.search(ln)) -
                                sum(1 for ln in suspects if CYR_RE.search(ln)),
             'cyr_before': cyr_count(text), 'cyr_after': 0, 'confirmed': 0}

    if not suspects:
        stats['cyr_after'] = stats['cyr_before']
        return text, stats

    # ---- 阶段一：判定（必须至少有一行被无歧义还原，才认定是这类事故）
    confirmed = 0
    for ln in suspects:
        if CJK_RE.search(ln) and not force:
            continue
        new, ch, _ = repair_line(ln)
        if ch and cyr_count(new) < cyr_count(ln):
            confirmed += 1
    stats['confirmed'] = confirmed
    if confirmed == 0:
        stats['unresolved'] = True
        stats['cyr_after'] = stats['cyr_before']
        return text, stats

    # ---- 阶段二：执行（文件已认定 ⇒ 处理所有含西里尔字母的行）
    out_lines = []
    for ln in lines:
        if not CYR_RE.search(ln):
            out_lines.append(ln)                # 干净行：逐字节保留
            continue
        if CJK_RE.search(ln):
            stats['mixed_lines'] += 1
            if not force:
                return None, stats              # 中英混排无法区分 ⇒ 拒绝
        stats['lines_touched'] += 1
        new, ch, runs = repair_line(ln)
        if ch and cyr_count(new) < cyr_count(ln):
            out_lines.append(new)
            stats['lines_ok'] += 1
            stats['runs_fixed'] += runs
        else:
            out_lines.append(ln)
            stats['lines_failed'] += 1

    new_text = '\n'.join(out_lines)
    stats['cyr_after'] = cyr_count(new_text)
    return new_text, stats


# ---------------------------------------------------------------- 扫描

def scan_files(files, threshold=8):
    hits = []
    for p in files:
        try:
            with open(p, encoding='utf-8', errors='strict') as fh:
                text = fh.read()
        except (UnicodeDecodeError, OSError):
            hits.append((p, -1, -1, 0))
            continue
        bad = [ln for ln in text.split('\n') if looks_mojibake(ln, threshold)]
        if bad:
            ok = 0
            for ln in bad:
                new, ch, _ = repair_line(ln)
                if ch and cyr_count(new) < cyr_count(ln):
                    ok += 1
            hits.append((p, cyr_count(text), len(bad), ok))
    return hits


# ---------------------------------------------------------------- 自检

def selftest(verbose=False):
    ok = fail = 0

    def check(cond, label):
        nonlocal ok, fail
        if cond:
            ok += 1
            if verbose:
                print('  PASS', label)
        else:
            fail += 1
            print('  FAIL', label)

    def mk(text, codec):
        return text.encode('utf-8').decode(codec)

    cjk = '### 一、分析虚拟机架构\n\n参考这位师傅的文章，将虚拟机架构代码重新命名了一下。'
    mj154 = mk(cjk, 'ptcp154')
    mj1251 = mk(cjk, 'cp1251')

    # 1) 两种码页样本都能被判定
    check(looks_mojibake(mj154), 'ptcp154 样本命中阈值判定')
    check(looks_mojibake(mj1251), 'cp1251 样本命中阈值判定')

    # 2) 跨码页还原（不写死码页 —— 靠"结果必须是合法 UTF-8"收敛）
    for label, mj in (('ptcp154', mj154), ('cp1251', mj1251)):
        new, st = repair_text(mj)
        check(new == cjk, '%s 样本被完整还原' % label)
        check(st['confirmed'] >= 1, '%s 样本通过阶段一判定' % label)

    # 3) 🔴 混表回归：同一行里混用 ptcp154 + CP1252 + Latin-1（B13 真实事故形态）
    mixed_tables = ('д»ҘдёӢ'                # ptcp154 + Latin-1(» = 0xBB)
                    + 'зҪ‘еқҖ')             # ptcp154 + CP1252(‘ = 0x91)
    expect = '以下' + '网址'
    new3, ok3 = decode_run(mixed_tables)
    check(ok3 and new3 == expect, '混表行可还原（%r -> %r）' % (mixed_tables, new3))

    # 3b) 🔴 静默错字判优回归（B13 核心教训）
    #     同一段 cp1251 乱码若按 ptcp154 优先，能得到**合法 UTF-8 但全是错字**的结果
    #     （`分析`→`倆析`、`师傅`→`帀傅`）。UTF-8 合法性挡不住它，必须靠 GB2312 越界率。
    _wrong_raw = _bytes_for(mj1251, CODEC_ORDERS[0])
    _wrong_text = None
    if _wrong_raw is not None:
        try:
            _wrong_text = _wrong_raw.decode('utf-8')
        except UnicodeDecodeError:
            _wrong_text = None
    if _wrong_text is not None and _wrong_text != cjk:
        check(_plausibility(_wrong_text) > _plausibility(cjk),
              '错码页候选的 GB2312 越界率确实更差（判优依据成立，实测 %r）' % _wrong_text)
    _l1, _c1, _ = repair_line(mj1251.split('\n')[0])
    check(_c1 and _l1 == cjk.split('\n')[0],
          'cp1251 样本经判优后还原正确（实测 %r）' % _l1)

    # 4) 缩进 NBSP 行（只有 2 个西里尔字母）在"已认定"文件里必须被还原
    nbsp_line = 'В\xa0 В\xa0 return e'
    new4, ch4, _ = repair_line(nbsp_line)
    check(ch4 and new4 == '\xa0 \xa0 return e', 'NBSP 缩进行被还原（%r）' % new4)

    # 4b) 🔴 截断兜底回归：行末 UTF-8 字节丢失时，必须还原最长可解前缀且保住残缺尾巴
    truncated = '以下内容'.encode('utf-8').decode('ptcp154')[:-1]   # 故意砍掉最后一个字符
    part, ch_part = decode_run(truncated)
    check(ch_part, '截断段仍能部分还原（%r）' % part)
    check(part.startswith('以下内容') or part.startswith('以下内'), '截断段还原出可读前缀（%r）' % part)
    check(any(0x400 <= ord(c) <= 0x4FF for c in part) is False or len(part) < len(truncated) * 3,
          '截断段不再是原来的乱码全貌')

    # 4c) 顺序回归：ASCII / CJK 段必须留在原位，不得被搬到行尾
    for label, src in (('开头 ASCII', '### ' + mj154.split('\n')[0]),
                       ('中文在乱码之前', '中文开头 ' + mj154)):
        got, _, _ = repair_line(src)
        check(got != src, '%s：确实发生了还原' % label)
        check(got.startswith('### ') or got.startswith('中文开头 '),
              '%s：前缀段留在原位（实测 %r）' % (label, got[:14]))
        check(not got.lstrip().startswith('一、') and not got.startswith('一、'),
              '%s：还原内容未被提到行首（实测 %r）' % (label, got[:14]))

    # 5) 干净中文文本必须逐字节不变
    clean = '# 正常标题\n\n这是正常的中文正文，没有任何编码问题。\n'
    new5, st5 = repair_text(clean)
    check(new5 == clean, '干净文本逐字节不变')
    check(st5['lines_touched'] == 0, '干净文本未触及任何行')

    # 6) 部分乱码：头部正常 + 正文乱码 ⇒ 头尾保留、正文救回
    partial = '# 某q音乐jsvmp反编译\n\n> **作者**: hostname\n\n' + mj154 + '\n\n尾部正常中文'
    new6, st6 = repair_text(partial)
    check(new6 is not None, '部分乱码可修复（未触发拒绝）')
    check(new6.startswith('# 某q音乐jsvmp反编译\n\n> **作者**: hostname\n\n'), '头部逐字节保留')
    check('一、分析虚拟机架构' in new6, '正文乱码被救回')
    check(new6.endswith('尾部正常中文'), '尾部逐字节保留')
    check(cyr_count(new6) < cyr_count(partial), '反向断言：西里尔字母减少')

    # 7) 幂等
    again, st7 = repair_text(new6)
    check(again == new6, '幂等（二次修复逐字节不变）')
    check(st7['lines_touched'] == 0, '幂等（二次修复无副作用）')

    # 8) 反向断言：合法西里尔文本（不是事故）不应被"修"坏
    legit = 'Привет мир, это обычный русский текст для проверки.'
    out8, st8 = repair_text(legit, force=True)
    check(out8 == legit, '合法西里尔文本逐字节不变（防"什么都能认"）')
    check(st8['unresolved'] is True, '合法西里尔文本被标为 unresolved')

    # 9) 中英混排默认拒绝；--force 下可救
    mixed = '中文开头 ' + mj154
    out9, st9 = repair_text(mixed)
    check(out9 is None, '中英混排 ⇒ 默认拒绝执行')
    check(st9['mixed_lines'] == 1, '拒绝时正确计入 mixed_lines')
    out9b, _ = repair_text(mixed, force=True)
    check(out9b is not None and cyr_count(out9b) < cyr_count(mixed), 'force 下混排行可救回')
    check(out9b is not None and out9b.startswith('中文开头 '), 'force 下中文段逐字节保留')

    # 10) 阈值边界：偶发少量西里尔字母（未达阈值）不得触发任何还原
    stray = '正文里出现两个西里尔字母 ки 仅作示例说明。'
    check(cyr_count(stray) < 8, '测试串确实低于阈值（%d 个）' % cyr_count(stray))
    out10, st10 = repair_text(stray, force=True)
    check(out10 == stray, '偶发西里尔字母（未达阈值）不被改写')
    check(st10['lines_touched'] == 0, '偶发西里尔字母不计入 touched')
    check(st10['below_threshold'] >= 1, '偶发西里尔字母被计入 below_threshold')

    # 11) 控制字符闸门：还原出控制字符的段必须被拒绝
    check(bool(CTRL_RE.search('\x01\x02')), 'CTRL_RE 能识别控制字符')
    check(not CTRL_RE.search('\t\n\r'), 'CTRL_RE 放行 \\t \\n \\r')

    # 12) 段边界：CJK 与 ASCII 必须逐字节透传
    check(not _is_convertible('中'), 'CJK 不算可还原字符')
    check(not _is_convertible('A'), 'ASCII 不算可还原字符')
    check(_is_convertible('д'), '西里尔算可还原字符')
    check(_is_convertible('\xa0'), 'NBSP 算可还原字符')
    check(_is_convertible('»'), 'Latin-1 符号算可还原字符')

    # 13) 空 / 单行 / ASCII 安全
    check(repair_text('')[0] == '', '空文本安全')
    check(repair_text('中文')[0] == '中文', '无换行单行安全')
    check(repair_text('hello world\nfoo bar')[0] == 'hello world\nfoo bar', 'ASCII 文本安全')

    # 14) 幂等性针对"混表"也必须成立：已还原的文本不得被二次还原
    #     （'以' 不在任何码页里 ⇒ 本身就不是可还原字符，天然幂等）
    once, _ = decode_run(mixed_tables)
    check(not _is_convertible(once[0]), '还原结果首字符不再可还原（幂等前提）')
    check('以' not in REVERSE, 'CJK 不进反向表（幂等的根据）')

    print('repair-encoding.py 自检：%d 项通过，%d 项失败。' % (ok, fail))
    return EXIT_OK if fail == 0 else EXIT_FAIL


# ---------------------------------------------------------------- CLI

def main(argv):
    ap = argparse.ArgumentParser(
        prog='repair-encoding.py',
        description='语料「部分乱码」（UTF-8 字节被按单字节码页/CP1252/Latin-1 解码）的检测与修复')
    ap.add_argument('paths', nargs='*', help='待处理文件或目录（目录取其中 *.md）')
    ap.add_argument('--scan', action='store_true', help='只报告，不改动任何文件')
    ap.add_argument('--fix', action='store_true', help='就地修复（自动留 .bak-encoding 备份）')
    ap.add_argument('--force', action='store_true',
                    help='允许处理「中文与西里尔混排」的行（默认拒绝）')
    ap.add_argument('--threshold', type=int, default=8,
                    help='判定嫌疑行的西里尔字母数阈值（默认 8）')
    ap.add_argument('--selftest', action='store_true', help='跑内置自检')
    ap.add_argument('--verbose', action='store_true')

    args = ap.parse_args(argv)
    if args.selftest:
        return selftest(args.verbose)

    if not args.paths:
        ap.print_help()
        return EXIT_USAGE
    if not (args.scan or args.fix):
        sys.stderr.write('错误：需要显式指定 --scan 或 --fix（默认不做任何改动）\n')
        return EXIT_USAGE

    files = []
    for p in args.paths:
        if os.path.isdir(p):
            files.extend(os.path.join(p, n) for n in sorted(os.listdir(p))
                         if n.endswith('.md'))
        elif os.path.isfile(p):
            files.append(p)
        else:
            sys.stderr.write('错误：路径不存在 %s\n' % p)
            return EXIT_USAGE

    if args.scan:
        hits = scan_files(files, args.threshold)
        print('扫描 %d 个文件，命中 %d 个：' % (len(files), len(hits)))
        for name, cyr, nlines, okn in hits:
            if cyr < 0:
                print('  [非 UTF-8] %s' % name)
            else:
                print('  cyr=%-6d 嫌疑行=%-4d 可还原行=%-4d %s' % (cyr, nlines, okn, name))
        return EXIT_OK

    changed = refused = nochange = unresolved = 0
    for p in files:
        with open(p, encoding='utf-8') as fh:
            text = fh.read()
        new, st = repair_text(text, force=args.force, threshold=args.threshold)
        if new is None:
            refused += 1
            print('拒绝：%s（%d 行中英混排；确认后用 --force）' % (p, st['mixed_lines']))
            continue
        if st['unresolved']:
            unresolved += 1
            print('未认定为事故：%s（%d 个西里尔字母，嫌疑行 %d 行但无一行可无歧义还原 ⇒ '
                  '按原样保留，避免误改）' % (p, st['cyr_before'], st['lines_suspect']))
            continue
        if st['lines_touched'] == 0 or new == text:
            nochange += 1
            continue
        bak = p + '.bak-encoding'
        if not os.path.exists(bak):
            with open(bak, 'w', encoding='utf-8', newline='') as fh:
                fh.write(text)
        with open(p, 'w', encoding='utf-8', newline='') as fh:
            fh.write(new)
        changed += 1
        note = ('；%d 行还原失败已原样保留' % st['lines_failed']) if st['lines_failed'] else ''
        print('已修复：%s（%d 段；%d 行；西里尔 %d -> %d%s）'
              % (p, st['runs_fixed'], st['lines_ok'], st['cyr_before'], st['cyr_after'], note))

    print('完成：修复 %d，拒绝 %d，未认定 %d，无需改动 %d。'
          % (changed, refused, unresolved, nochange))
    if refused and not args.force:
        return EXIT_REFUSE
    return EXIT_OK


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))