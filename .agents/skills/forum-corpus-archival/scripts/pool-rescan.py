#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全池反向扫 · 四层门禁（forum-corpus-archival 技能脚本，见 SKILL.md 坑 113/114/116）。

在「未归档 ∧ 未黑名单」的全量池上做四层收窄：
  ① 强信号（签名/加密参数/响应解密/协议逆向/前端风控 的同义词全表）
  ② 载体词（App|接口|协议|小程序|风控|抓包|登录|请求|API|js|web|H5|前端|网页）
  ③ 动作词（逆向|分析|还原|解密|加密|定位|hook|复现|破解|校验|生成）
  ④ 否定词（求|求助|教程|安装|下载|工具|源码|成品|小白|入门|报错|注册机|脱壳|加固|ollvm|vmp|游戏|招聘）
并标注候选正文是否已在历轮 bodies* 本地缓存（零请求）。

⚠️ 一次性纪律（坑 116）：本脚本在「未归档 ∧ 未黑名单」池上跑过一轮后，
   下轮不要再重扫全池（会重复读到同一批已判噪声）；改按 score 排序取前 N，或只回扫新归档文章。

用法：
  python pool-rescan.py --pool artifacts/<p>/pool_v<N>.json       --block artifacts/<p>/blockunion<N>.json --ref docs/references       --bodies-glob "artifacts/<p>-fetch*/bodies*" --out artifacts/<p>/cand<N>.json
"""
# -*- coding: utf-8 -*-
"""R43 全池反向扫（口径穷举 · 同义表达第二轮）。

口径（第十八层 E + 坑 113/114）：
  收：接口签名 / 加密参数 / 响应解密 / 协议逆向 / 前端风控
  收窄门禁（必须同时满足）：
     载体词（App|接口|协议|小程序|风控|抓包|登录|请求|API|js|web|H5|前端|网页）
     ∧ 动作词（逆向|分析|还原|解密|加密|定位|hook|复现|破解|追踪|校验|生成）
     且 排除 求|教程|工具|安装|下载|源码|成品|小白|入门|报错|配置|注册机|脱壳|加固|VMP|游戏|招聘|求职
输出：未归档 ∧ 未黑名单 的候选，标注正文是否本地已有。
"""
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
REF = os.path.join(ROOT, "docs", "references")


def archived_ids():
    ids = set()
    for f in os.listdir(REF):
        m = re.search(r"(?:52pojie-)?(\d{5,})-?.*\.md$", f)
        if m:
            ids.add(m.group(1))
    return ids


def body_index():
    idx = {}
    for base in sorted(glob.glob(os.path.join(ROOT, "artifacts", "52pojie-fetch*", "bodies*"))):
        if not os.path.isdir(base):
            continue
        for f in os.listdir(base):
            if f.endswith(".md"):
                idx.setdefault(f[:-3], os.path.join(base, f))
    return idx


# 现口径强信号（类目 × 同义表达，第二轮穷举）
STRONG = re.compile(
    # 接口签名
    r"签名|sign|验签|X-Signature|X-Ca-Signature|request-sign|签名算法|请求签名"
    # 加密参数
    r"|加密参数|参数加密|参数校验|参数逆向|加密算法|加解密|加密分析|参数还原|参数生成|参数构造|密文|明文"
    # 响应解密
    r"|响应解密|响应加解密|抓包解密|封包解密|接口解密|接口加解密|解密|加密"
    # 协议逆向
    r"|协议逆向|协议分析|协议复现|协议还原|协议加密|登录协议|协议解析|握手|封包"
    # 前端风控
    r"|风控|指纹|反爬|风控算法|反爬算法|滑块|验证码|jsvmp|js逆向|补环境|扣代码|webpack|混淆|反混淆",
    re.I)

CARRIER = re.compile(r"app|接口|协议|小程序|风控|抓包|登录|请求|api|js|web|h5|前端|网页|浏览器|客户端|http|socket|websocket|网络|cookie|token", re.I)
ACTION = re.compile(r"逆向|分析|还原|解密|加密|定位|hook|复现|破解|追踪|校验|生成|构造|算法|解析|抓取|采集")
NEG = re.compile(
    r"求|求助|请教|如何|怎么|教程|安装|下载|工具|源码|成品|小白|入门|报错|配置|注册机|脱壳|加固|"
    r"ollvm|vmp|游戏|招聘|求职|诚聘|急招|招人|破解版|激活|注册表|破解软件|外挂|辅助|"
    r"指纹浏览器|指纹锁|指纹识别|指纹支付|指纹打卡|指纹考勤|指纹门|指纹仪|指纹模块|指纹验证器")


def main():
    pool = json.load(open(os.path.join(HERE, "pool_v43.json"), encoding="utf-8"))
    blk = json.load(open(os.path.join(HERE, "blockunion43.json"), encoding="utf-8"))
    arch = archived_ids()
    bidx = body_index()
    print("池 %d | 归档 %d | 黑名单 %d | 本地正文 %d" % (len(pool), len(arch), len(blk), len(bidx)))

    cand = {}
    for k, v in pool.items():
        if k in arch or k in blk:
            continue
        t = v.get("title", "") or ""
        if not STRONG.search(t):
            continue
        if not (CARRIER.search(t) and ACTION.search(t)):
            continue
        if NEG.search(t):
            continue
        cand[k] = {"id": k, "title": t, "forum": v.get("forum", ""),
                   "local": k in bidx, "body": bidx.get(k, "")}
    loc = sum(1 for c in cand.values() if c["local"])
    print("候选 %d | 本地正文已有 %d | 待抓 %d" % (len(cand), loc, len(cand) - loc))
    json.dump(cand, open(os.path.join(HERE, "cand43.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    for c in sorted(cand.values(), key=lambda x: (not x["local"], x["id"])):
        print("%s\t%s\t%s\t%s" % (c["id"], "LOCAL" if c["local"] else "REMOTE",
                                  c["forum"][:10], c["title"][:78]))


if __name__ == "__main__":
    main()
