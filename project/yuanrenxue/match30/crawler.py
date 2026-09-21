# -*- coding: utf-8 -*-
"""
猿人学第 30 题 - 完整采集脚本 (Python)
隐算 - 简单算法，复杂构建
"""

import sys
import os
import json
import time
import argparse
import urllib.request
import urllib.error
from encrypt import generate_token

BASE_URL = "https://match.yuanrenxue.cn"

def fetch_time(sessionid: str = None) -> str:
    headers = {
        "User-Agent": "yuanrenxue",
        "Referer": f"{BASE_URL}/match/30",
        "X-Requested-With": "XMLHttpRequest"
    }
    if sessionid:
        headers["Cookie"] = f"sessionid={sessionid}"
        
    req = urllib.request.Request(f"{BASE_URL}/api/getTime", headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8").strip()

def fetch_page(page: int, sessionid: str = None) -> list:
    now = fetch_time(sessionid)
    token = generate_token(page, now)
    
    url = f"{BASE_URL}/api/question/30?page={page}&pageSize=10&kw=&token={token}&now={now}"
    headers = {
        "User-Agent": "yuanrenxue",
        "Referer": f"{BASE_URL}/match/30",
        "X-Requested-With": "XMLHttpRequest"
    }
    if sessionid:
        headers["Cookie"] = f"sessionid={sessionid}"
        
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        res_json = json.loads(resp.read().decode("utf-8"))
        data = res_json.get("data", [])
        return data

def submit_answer(answer: int, sessionid: str) -> dict:
    url = f"{BASE_URL}/a/30"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"{BASE_URL}/match/30",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Cookie": f"sessionid={sessionid}"
    }
    data = urllib.parse.urlencode({"answer": answer}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"error": e.code, "msg": e.read().decode("utf-8")}

def run_challenge(sessionid: str = None, auto_submit: bool = False):
    print("=" * 60)
    print("  猿人学第 30 题: 隐算 - 简单算法，复杂构建")
    print("=" * 60)
    if sessionid:
        print(f"[*] 使用登录凭证 sessionid: {sessionid[:8]}***")
    else:
        print("[*] 未提供 sessionid，使用平台公共测试环境")
        
    total_sum = 0
    all_numbers = []

    for page in range(1, 6):
        data = fetch_page(page, sessionid)
        if not data:
            print(f"[-] 第 {page} 页获取数据为空！")
            continue
            
        # 检查是否包含非数字内容
        int_data = []
        for x in data:
            if isinstance(x, int):
                int_data.append(x)
            elif isinstance(x, str) and x.isdigit():
                int_data.append(int(x))
            else:
                print(f"[!] 警告：第 {page} 页包含非纯数值项: {x}")
                
        page_sum = sum(int_data)
        total_sum += page_sum
        all_numbers.extend(int_data)
        print(f"[+] 第 {page} 页数据 ({len(int_data)} 条): {int_data}")
        print(f"    当前页求和: {page_sum} | 累计总和: {total_sum}")
        time.sleep(0.3)

    print("-" * 60)
    print(f"[✓] 5 页数据采集完毕，共 {len(all_numbers)} 个有效数字")
    print(f"[★] 最终计算结果 (答案): {total_sum}")
    print("-" * 60)

    if auto_submit and sessionid:
        print(f"[*] 正在向 {BASE_URL}/a/30 提交答案: {total_sum} ...")
        res = submit_answer(total_sum, sessionid)
        print(f"[*] 提交结果: {res}")

    return total_sum

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Yuanrenxue Match 30 Solver")
    parser.add_argument("--sessionid", type=str, default=os.getenv("YRX_SESSIONID", None), help="User sessionid cookie")
    parser.add_argument("--submit", action="store_true", help="Auto submit answer after calculation")
    args = parser.parse_args()

    run_challenge(sessionid=args.sessionid, auto_submit=args.submit)
