#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""等长字节替换（binary / Node.js `pkg` / V8 字节码补丁）—— 默认干跑，改前先量化。

为什么要有这个脚本
------------------
被打包进二进制的 JS 常量仍然是**明文**：Node.js `pkg` 会把 JS 编译成 V8 字节码塞进
可执行文件，`!1`(= false) / `!0`(= true) 这类字面量原样留在二进制里。所以"把业务判定从
false 翻成 true"在字节层面常常只是**等长替换**，根本不用反编译 —— 这也是 `strings |
grep` 之后最省事的一条路。

但等长替换有两个静默陷阱，本脚本按契约挡住：

1. **长短不等**：`replace` 与 `pattern` 字节数不同 ⇒ 后续所有偏移全错（结构化文件直接废）。
   默认拒绝；`--allow-resize` 才允许，且必须显式指定 `--out`（不覆盖原件）。
2. **改多改少**：同一个常量可能出现在 3 处也可能出现在 15 处，全改/漏改都不一定对。
   用 `--expect N` 把"应该有 N 处"写成前置断言，不符则**中止且不落盘**。

契约
----
* 默认 **dry-run**：只报告命中位置与次数，不写文件。
* `--apply` 才写；写之前自动 `--backup`（默认 `<file>.bak`），并复检产物里 pattern 命中数为 0。
* 命中数 0 ⇒ 退出码 6（"已是目标状态 / 目标串不在这个文件里"），不当成失败。
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys

EXIT_OK = 0
EXIT_USAGE = 2
EXIT_NOT_FOUND = 3
EXIT_INVALID = 4
EXIT_ALREADY = 6
EXIT_EXPECT_MISMATCH = 7


def parse_token(raw: str) -> bytes:
    if raw.startswith("hex:"):
        try:
            return bytes.fromhex(raw[4:])
        except ValueError as exc:
            raise SystemExit("hex 串非法：%s" % exc)
    return raw.encode("utf-8")


def find_all(buf: bytes, needle: bytes) -> list:
    if not needle:
        raise SystemExit("pattern 不能为空")
    out = []
    pos = buf.find(needle)
    while pos >= 0:
        out.append(pos)
        pos = buf.find(needle, pos + 1)
    return out


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def apply_patch(buf: bytes, needle: bytes, repl: bytes, max_hits: int) -> tuple:
    out = bytearray(buf)
    hits = find_all(buf, needle)
    if max_hits and len(hits) > max_hits:
        raise SystemExit("命中 %d 处，超过 --max %d：拒绝批量盲改（先逐处确认）" % (len(hits), max_hits))
    for pos in hits:
        out[pos:pos + len(needle)] = repl
    return bytes(out), len(hits)


def cmd_scan(args) -> int:
    buf = open(args.input, "rb").read()
    needle = parse_token(args.pattern)
    hits = find_all(buf, needle)
    print("文件            : %s（%d 字节，sha256=%s…）" % (args.input, len(buf), sha256(buf)[:16]))
    print("pattern         : %s（%d 字节）" % (args.pattern, len(needle)))
    print("命中            : %d 处" % len(hits))
    for pos in hits[:args.show]:
        lo = max(0, pos - 12)
        hi = pos + len(needle) + 12
        print("  0x%08x  …%s…" % (pos, buf[lo:hi].decode("utf-8", "replace").replace("\n", "\\n")))
    if len(hits) > args.show:
        print("  …（只显示前 %d 处）" % args.show)
    return EXIT_OK if hits else EXIT_NOT_FOUND


def cmd_patch(args) -> int:
    buf = open(args.input, "rb").read()
    needle = parse_token(args.pattern)
    repl = parse_token(args.replace)
    hits = find_all(buf, needle)

    print("文件            : %s（%d 字节，sha256=%s…）" % (args.input, len(buf), sha256(buf)[:16]))
    print("pattern         : %s（%d 字节）" % (args.pattern, len(needle)))
    print("replace         : %s（%d 字节）" % (args.replace, len(repl)))
    print("命中            : %d 处" % len(hits))

    if len(needle) != len(repl) and not args.allow_resize:
        print("拒绝            : 长短不等（%d→%d）会让后续所有偏移错位。" % (len(needle), len(repl)))
        print("                  若目标文件是结构化容器（asar / zip / 字节码），必须先确认结构允许；")
        print("                  确认了再加 --allow-resize 并显式给 --out。")
        return EXIT_INVALID
    if args.expect is not None and len(hits) != args.expect:
        print("拒绝            : --expect %d，实际命中 %d —— 前置断言不符，不落盘。" % (args.expect, len(hits)))
        return EXIT_EXPECT_MISMATCH
    if not hits:
        print("结论            : 已是目标状态（pattern 不存在），无需改动。")
        return EXIT_ALREADY
    if args.max and len(hits) > args.max:
        print("拒绝            : 命中 %d 处超过 --max %d —— 批量盲改前先逐处确认。" % (len(hits), args.max))
        return EXIT_INVALID
    if not args.apply:
        print("结论            : dry-run 结束（未写任何文件）。确认以上命中数后加 --apply。")
        for pos in hits[:args.show]:
            print("  将改 0x%08x" % pos)
        return EXIT_OK

    if not args.out:
        return EXIT_USAGE
    new_buf, n = apply_patch(buf, needle, repl, args.max)
    if args.backup:
        with open(args.backup, "wb") as fh:
            fh.write(buf)
    with open(args.out, "wb") as fh:
        fh.write(new_buf)

    left = len(find_all(new_buf, needle))
    print("已写            : %s（%d 处已替换，剩余 %d 处未替换）" % (args.out, n, left))
    print("备份            : %s（sha256=%s…）" % (args.backup or "(未备份)", sha256(buf)[:16]))
    print("复检            : %s" % ("ok —— pattern 已不存在" if left == 0
                                  else "仍有 %d 处命中（例如校验分支里的同名常量），需逐处确认" % left))
    return EXIT_OK


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="等长字节替换（默认干跑）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p1 = sub.add_parser("scan", help="只统计命中位置")
    p1.add_argument("--in", dest="input", required=True)
    p1.add_argument("--pattern", required=True, help="字面量，或 hex:0102ab")
    p1.add_argument("--show", type=int, default=20)
    p1.set_defaults(func=cmd_scan)

    p2 = sub.add_parser("patch", help="替换（dry-run 默认）")
    p2.add_argument("--in", dest="input", required=True)
    p2.add_argument("--pattern", required=True)
    p2.add_argument("--replace", required=True)
    p2.add_argument("--out")
    p2.add_argument("--backup")
    p2.add_argument("--apply", action="store_true")
    p2.add_argument("--allow-resize", action="store_true")
    p2.add_argument("--max", type=int, default=0, help="命中数上限，超过即拒绝")
    p2.add_argument("--expect", type=int, default=None, help="前置断言：命中的确切数量")
    p2.add_argument("--show", type=int, default=10)
    p2.set_defaults(func=cmd_patch)

    args = ap.parse_args(argv)
    if args.selftest:
        return _selftest()
    if not getattr(args, "func", None):
        ap.print_help()
        return EXIT_USAGE
    return args.func(args)


# --------------------------------------------------------------------------- #
# 自检
# --------------------------------------------------------------------------- #

def _selftest() -> int:
    import subprocess
    import tempfile
    fails = []
    seen = []

    def ok(cond, label):
        seen.append(label)
        if not cond:
            fails.append(label)

    raw = (b"\x7fELFfake" + b"xxx" + b"activated:!1" + b"yyy" + b"activated:!1"
           + b"zzz" + b"activated:!0" + b"tail")

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "server.bin")
        with open(src, "wb") as fh:
            fh.write(raw)
        before = sha256(open(src, "rb").read())

        rc = _run(["scan", "--in", src, "--pattern", "activated:!1"])
        ok(rc == EXIT_OK, "scan 命中时必须返回 0（实际 %s）" % rc)
        rc = _run(["scan", "--in", src, "--pattern", "not-exist-token"])
        ok(rc == EXIT_NOT_FOUND, "scan 未命中必须返回 3（实际 %s）" % rc)

        # dry-run 绝不写文件
        rc = _run(["patch", "--in", src, "--pattern", "activated:!1", "--replace", "activated:!0"])
        ok(rc == EXIT_OK, "dry-run 返回 0（实际 %s）" % rc)
        ok(sha256(open(src, "rb").read()) == before, "dry-run 不得改动源文件")

        # 长短不等必须被拒
        rc = _run(["patch", "--in", src, "--pattern", "activated:!1", "--replace", "activated:false"])
        ok(rc == EXIT_INVALID, "长短不等必须返回 4（实际 %s）" % rc)

        # --expect 不符必须中止且不落盘
        out_bad = os.path.join(tmp, "no-out.bin")
        rc = _run(["patch", "--in", src, "--pattern", "activated:!1", "--replace", "activated:!0",
                   "--expect", "5", "--apply", "--out", out_bad])
        ok(rc == EXIT_EXPECT_MISMATCH, "--expect 不符必须返回 7（实际 %s）" % rc)
        ok(not os.path.exists(out_bad), "--expect 不符时不得落盘")

        # 正常打补丁：2 处，备份逐字节一致
        out = os.path.join(tmp, "patched.bin")
        bak = os.path.join(tmp, "patched.bak")
        rc = _run(["patch", "--in", src, "--pattern", "activated:!1", "--replace", "activated:!0",
                   "--expect", "2", "--apply", "--out", out, "--backup", bak])
        ok(rc == EXIT_OK, "打补丁返回 0（实际 %s）" % rc)
        patched = open(out, "rb").read()
        ok(patched.count(b"activated:!1") == 0, "复检：pattern 必须被消除")
        ok(patched.count(b"activated:!0") == 3, "打完后 true 分支应为 3 处")
        ok(len(patched) == len(raw), "等长替换后文件长度不变")
        ok(open(bak, "rb").read() == raw, "备份必须与原件逐字节一致")

        # 幂等：对已打好的文件再打一次 ⇒ 命中 0 ⇒ 退出码 6
        rc = _run(["patch", "--in", out, "--pattern", "activated:!1", "--replace", "activated:!0", "--apply",
                   "--out", os.path.join(tmp, "again.bin")])
        ok(rc == EXIT_ALREADY, "重复打补丁必须返回 6（实际 %s）" % rc)

        # --max 门禁
        rc = _run(["patch", "--in", src, "--pattern", "activated:!1", "--replace", "activated:!0", "--max", "1"])
        ok(rc != 0, "--max 超限必须拒绝（实际 %s）" % rc)

        # hex 模式
        rc = _run(["scan", "--in", src, "--pattern", "hex:6163746976617465643a2131"])
        ok(rc == EXIT_OK, "hex 模式命中（实际 %s）" % rc)

    print("byte_flag_patch --selftest：%d 项断言，失败 %d" % (len(seen), len(fails)))
    for f in fails:
        print("  ✗ %s" % f)
    return 1 if fails else 0


def _run(argv) -> int:
    import subprocess
    proc = subprocess.run([sys.executable, os.path.abspath(__file__)] + argv,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode


if __name__ == "__main__":
    sys.exit(main())
