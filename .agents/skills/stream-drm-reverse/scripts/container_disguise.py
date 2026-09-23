#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""container_disguise.py —— 「分片被伪装成图片 / 加了文件头」的定位与还原

实测形态（`52pojie-1475807`）：站点把 TS 分片前**拼上一段真图片的头部（PNG 头 + 填充）**，
让每个分片看起来是一张"只有中间一个像素白点"的 PNG，从而骗过图床/对象存储的
**按文件头判类型**的校验，达到"白嫖第三方图床存视频"的目的。
浏览器侧拿到后**去掉开头 N 字节**再喂给播放器，所以：
**网络面板里没有 Media 请求，只有一堆 `.png`**。

还原只需找到「真正的 TS 起点」，不需要知道 N 是多少：**MPEG-TS 包的同步字节恒为 `0x47`，
且相邻包头间隔恒为 188 字节**。于是判据是机械的：

    offset 处满足 bytes[offset + 188*k] == 0x47（k = 0..N-1，N 越大越可信）

用法：
  python container_disguise.py locate <伪图片或伪分片> [--max-scan 4096] [--min-hits 8]
  python container_disguise.py strip  <伪分片> -o <真.ts> [--offset N]
  python container_disguise.py --selftest
"""

import argparse
import sys

TS_SYNC = 0x47
TS_PACKET = 188
# 常见"真图片头"，用于判断"这是不是伪装"（只看前 16 字节，不做完整解码）
IMAGE_MAGIC = {
    b"\x89PNG\r\n\x1a\n": "PNG",
    b"\xff\xd8\xff": "JPEG",
    b"GIF87a": "GIF",
    b"GIF89a": "GIF",
    b"BM": "BMP",
    b"RIFF": "WEBP/RIFF",
    b"II*\x00": "TIFF(LE)",
    b"MM\x00*": "TIFF(BE)",
}


def sniff_image(head):
    for magic, name in IMAGE_MAGIC.items():
        if head.startswith(magic):
            return name
    if head[:4] == b"\x00\x00\x01\x00":
        return "ICO"
    return None


def score_offset(data, offset, limit=64):
    """从 offset 起按 188 步长数「同步字节连中」的次数（连中即止）。

    ⚠️ 只数**连续**命中：TS 载荷里 0x47 很常见，要求"连续 N 个 188 间隔都命中"
    才能把假阳性压到可忽略；用"总共命中多少个"来打分会被随机数据骗到。
    """
    if offset >= len(data) or data[offset] != TS_SYNC:
        return 0
    n = 1
    while n < limit and offset + TS_PACKET * n < len(data):
        if data[offset + TS_PACKET * n] != TS_SYNC:
            break
        n += 1
    return n


def locate(data, max_scan=4096, min_hits=8):
    """扫描 [0, max_scan) 找最佳同步偏移。返回 (best_offset, best_hits, all_hits[])"""
    allhits = []
    best_o, best_n = None, 0
    for o in range(min(max_scan, len(data))):
        if data[o] != TS_SYNC:
            continue
        n = score_offset(data, o)
        if n >= 2:
            allhits.append((o, n))
        if n > best_n:
            best_o, best_n = o, n
    if best_n < min_hits:
        return None, best_n, allhits
    return best_o, best_n, allhits


def strip_prefix(data, offset):
    return data[offset:]


# --------------------------------------------------------------------------- 自检

def _build_ts(n_packets, seed=0x11):
    """构造合成 TS：每包 [0x47, pid(2), 0x10(adaptation), 其余填充]"""
    out = bytearray()
    for i in range(n_packets):
        pkt = bytearray([TS_SYNC, 0x01, (i + seed) & 0xFF, 0x10])
        pkt += bytes(((i * 7 + j) & 0xFF) for j in range(TS_PACKET - 4))
        assert len(pkt) == TS_PACKET
        out += pkt
    return bytes(out)


def selftest():
    checks = []

    def ck(name, cond, extra=""):
        checks.append((name, bool(cond), extra))

    ts = _build_ts(40)
    ck("合成 TS 每 188 字节一个同步字节", all(ts[188 * k] == TS_SYNC for k in range(40)))

    # ① 文章原样：212 字节伪 PNG 头（dd bs=4 skip=53 ⇒ 212）
    fake_png_head = b"\x89PNG\r\n\x1a\n" + b"\x00" * (212 - 8)
    disguised = fake_png_head + ts
    ck("伪装件前 212 字节是 PNG magic（会被图床判成图片）",
        len(fake_png_head) == 212 and sniff_image(disguised) == "PNG")
    off, hits, _ = locate(disguised)
    ck("locate 找到 212（不靠硬编码，靠 188 步长同步）", off == 212 and hits >= 8, f"off={off} hits={hits}")
    ck("strip 后与原始 TS 逐字节相同", strip_prefix(disguised, off) == ts)

    # ② 任意非 188 倍数的偏移也必须能找到（"212"只是这一个站点的取值）
    for pad in (0, 1, 7, 100, 188, 213, 1024):
        head = bytes([(0x30 + (pad % 10))] * pad)
        d = head + ts
        o, h, _ = locate(d)
        ck(f"任意前缀 {pad}B 均能正确定位", o == pad and strip_prefix(d, o) == ts, f"o={o}")

    # ③ 未加头时 offset 0 命中
    o2, h2, _ = locate(ts)
    ck("未加头时 offset 0 命中", o2 == 0 and h2 == 40)
    #    歧义必须"可见"：当头部本身也满足 188 步长的 0x47 规律时，locate 不能只报一个 ——
    #    allhits 里两个偏移都要在，由调用方判断该用哪个（本工具不替人做这个决定）。
    amb = b"\x47" * 188 + ts
    _, _, ah = locate(amb)
    amb_off = sorted(o for o, n in ah if n >= 8)
    ck("存在多解时全部列出（不静默只报一个）", amb_off[:2] == [0, 188] and len(amb_off) >= 2, str(amb_off[:4]))

    # ④ 判据是"连续命中"：在随机数据里就不该有 ≥8 连中
    import random
    rnd = random.Random(20260923)
    noise = bytes(rnd.randrange(256) for _ in range(4096))
    o3, h3, _ = locate(noise, min_hits=8)
    ck("随机数据不产生 ≥8 连中的假阳性", o3 is None, f"off={o3} hits={h3}")

    # ⑤ 载荷里偶现 0x47 不足以通过 min_hits
    sparse = bytearray(b"\x00" * 4000)
    for k in range(3):
        sparse[500 + 188 * k] = TS_SYNC  # 只 3 连
    ck("仅 3 连中 < min_hits ⇒ 不误判", locate(bytes(sparse), min_hits=8)[0] is None)

    # ⑥ 截断/过短输入不得崩
    ck("空输入不崩且返回 None", locate(b"", min_hits=8)[0] is None)
    ck("短于 188 字节不崩", locate(b"\x47" + b"\x00" * 100, min_hits=8)[0] is None)
    ck("max_scan 限制生效（只在窗口内找）",
        locate(b"\x00" * 3000 + ts, max_scan=1024, min_hits=8)[0] is None)

    # ⑦ 图片 magic 识别
    ck("sniff: PNG", sniff_image(fake_png_head) == "PNG")
    ck("sniff: JPEG", sniff_image(b"\xff\xd8\xff\xe0" + b"\x00" * 10) == "JPEG")
    ck("sniff: 纯 TS 不是图片", sniff_image(ts) is None)

    ok = sum(1 for _, c, _ in checks if c)
    for name, cond, extra in checks:
        print(("  ✓ " if cond else "  ✗ ") + name + (("   [" + extra + "]") if (extra and not cond) else ""))
    print(f"\n自检 {ok}/{len(checks)} 通过")
    return 0 if ok == len(checks) else 1


# --------------------------------------------------------------------------- CLI

def main(argv=None):
    ap = argparse.ArgumentParser(description="分片被伪装成图片 / 加文件头时的定位与还原")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("locate", help="找出真正的 TS 起点偏移")
    p.add_argument("path")
    p.add_argument("--max-scan", type=int, default=4096)
    p.add_argument("--min-hits", type=int, default=8)

    p = sub.add_parser("strip", help="去掉前缀，写出真分片")
    p.add_argument("path")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--offset", type=int, help="已知偏移时直接指定；省略则自动 locate")
    p.add_argument("--max-scan", type=int, default=4096)
    p.add_argument("--min-hits", type=int, default=8)

    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()

    if args.cmd == "locate":
        data = open(args.path, "rb").read()
        img = sniff_image(data[:16])
        off, hits, allhits = locate(data, args.max_scan, args.min_hits)
        print(f"{args.path}  {len(data)}B")
        if img:
            print(f"  前 16 字节像真图片：{img}  ⇒ 典型的「分片伪装成图片」")
        if off is None:
            print(f"  ✗ 未找到同步点（最多连中 {hits}，阈值 {args.min_hits}）")
            print("    可能：① 文件头 > --max-scan；② 不是 TS 而是 fMP4/m4s（走 stream-drm-reverse 的 A 层判据）；"
                  "③ 分片本身还加过密")
            return 1
        print(f"  ✓ TS 起点 = {off} 字节（连续命中 {hits} 个 188 间隔）")
        if allhits:
            near = [f"0x{o:X}({n})" for o, n in allhits[:6]]
            print(f"    候选（偏移(连中数)）：{', '.join(near)}")
        print(f"    python container_disguise.py strip \"{args.path}\" -o out.ts --offset {off}")
        return 0

    if args.cmd == "strip":
        data = open(args.path, "rb").read()
        off = args.offset
        if off is None:
            off, hits, _ = locate(data, args.max_scan, args.min_hits)
            if off is None:
                print(f"✗ 未能自动定位（最多连中 {hits}）⇒ 用 --offset 手工指定", file=sys.stderr)
                return 1
            print(f"自动定位：offset={off}（连中 {hits}）")
        out = strip_prefix(data, off)
        open(args.out, "wb").write(out)
        print(f"去掉前 {off} 字节 → {args.out}（{len(out)}B，"
              f"{len(out) // TS_PACKET} 个完整包 + {len(out) % TS_PACKET} 字节余数）")
        if len(out) % TS_PACKET:
            print("  ⚠️ 余数不为 0：分片可能被截断，或 offset 差一点点", file=sys.stderr)
        return 0

    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
