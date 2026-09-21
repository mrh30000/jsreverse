# Python爬虫之社区团购某团、某心、某多、某马微信小程序商品数据

> **作者**: airen001 | **发布时间**: 2021-06-23 18:26:00 | **版块**: 『编程语言区』 | **查看/回复**: 9276 / 24
> **原文**: [https://www.52pojie.cn/thread-1464031-1-1.html](https://www.52pojie.cn/thread-1464031-1-1.html)

---

代码仅供学习交流，请勿用于非法用途

[Python] *纯文本查看*

```
# -*- coding: utf-8 -*-
# !/usr/bin/env python
# [url=home.php?mod=space&uid=686208]@AuThor[/url]  : 好东西来分享
# [url=home.php?mod=space&uid=267492]@file[/url]    : 美团.py
import warnings
from spider import utils as ut
import datetime
from copy import deepcopy
import json
import time
from urllib.parse import quote
warnings.filterwarnings("ignore")

def GetCity(token):
    headers = {
        "t": token,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
    }
    url = "https://grocery-gh.meituan.com/api/g/grouphead/gw/mini/exclusiveGroupChat"
    content = ut.parse_url(url=url,headers=headers,method="get")
    data = content.get("data")
    city_df = ut.get_city_info()
    if data is not None:
        name = data["cityName"]
        city_df = city_df.loc[city_df["city_name"].str.contains(name)]
        num = city_df.shape[0]
        if num == 1:
            return city_df
        else:
            return "=========城市没判断准确！========="
    else:
        return "=======获取城市信息失败！=========="

def extract_father_info(token):
    """获取大类信息"""
    # todo 这里可能需要修改
    headers = {
        "t": token,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
    }
    url = "https://grocery-gh.meituan.com/api/g/grouphead/service/market/products/tabs"
    content = ut.parse_url(url=url, headers=headers, method="get")
    print(content)
    tabs = content.get("data").get("tabs")
    data_list = list()
    for i in tabs:
        text = i["text"]
        href = "https://grocery-gh.meituan.com" + i["href"]
        data_list.append((text,href))
    return data_list

def extract_data(token,url,item):
    res = deepcopy(item)
    headers = {
        "t": token,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
    }
    i = 0
    while 1:
        print("开始获取【%s-%s】商品第【%s】页" % (res["app_name"], res["column"],i+1))
        if res["column"] == "今日推荐":
            newurl = url + "?pageSize=20&pageNo=%s&lastCachePosition=%s&sortType=0"%(i,20*i)
        elif res["column"] == "附近热卖":
            newurl = url + "?pageSize=20&pageNo=%s&scene=0&utm_medium"%i
        else:
            newurl = url + "?pageSize=20&pageNo=%s&utm_medium"%i

        content = ut.parse_url(url=newurl, headers=headers, method="get")
        data = content["data"]
        productList = data["productList"]
        if productList:
            # 有数据 转化存储
            insert_item(res, productList)
            # 翻页
            i += 1
        else:
            break

def insert_item(res,productList):
    item = deepcopy(res)
    data_list = list()

    for product in productList:
        print(product)
        item["app_sku_id"] = product["skuBaseId"]
        item["app_sku"] = product["skuName"]
        item["share_rate"] = format(float(product["rate"]),'.2f')
        item["sell_price"] = format(float(product["promotionPrice"]),'.2f')
        if product["originPrice"] == "":
            item["origin_price"] = 0.00
        else:
            item["origin_price"] = format(float(product["originPrice"]),'.2f')
        item["price"] = format(float(product["promotionPrice"]) * (1 - (float(product["rate"]) / 100)),'.2f')
        item["pic_url"] = product["picture"]
        item["limitcount"] = product["promotionLimitCount"]
        if "start_time" in item.keys():
            item["start_time"] = item["start_time"]
        else:
            item["start_time"] = item["update_date"] + " 00:00:00"
        item["stop_time"] = item["update_date"] + " 23:00:00"
        item["share_path"] = "pages/skuDetail/index.html?__RST=xxxxxxxxxxxxx&skuCardPicUrl=%s&need_preload=1&skuId=%s&originalPoiId=142932237183389" % (quote(product["picture"], "utf-8"), product["skuBaseId"])
        item["data_source"] = json.dumps(product, ensure_ascii=False)

        sql_data = eval('("""{}""","""{}""","""{}""","""{}""","""{}""","""{}""","""{}""","""{}""","""{}""","""{}""","""{}""","""{}""",None,None,None,"""{}""", None,{},"""{}""","""{}""","""{}""","""{}""")'.format(
            str(item["app_id"]), item["app_name"], str(item["app_sku_id"]), item["app_sku"], item["column"],
            str(item["city_id"]),item["city_name"],item["update_date"],item["share_rate"], item["sell_price"],
            item["origin_price"],item["price"], item["pic_url"],
            int(item["limitcount"]), item["start_time"], item["stop_time"], item["share_path"], item["data_source"]))
        data_list.append(sql_data)
    ut.insert_data(data_list)

def second_kill(token, info_url, item):
    res = deepcopy(item)
    url = info_url + "?utm_term=2.91.1&sysName=Windows&sysVersion=10&business=gh&debug=false&utm_medium=wxapp&bizId=4&fulfillmentOrderGrayScale=false&batchPickupV0=false&orderListSearchOptGrayScale=true"
    headers = {
        "t": token,
        "mp-mtgsig":'{"a1":"1.0","a2":1621323513286,"a3":"589z9ywx28y65vw8y75u56835w5yxz238212xx310xx989884wzu4xx5","a4":"8ac7a91c334ad77d1ab78c7fcd4b50a998a67bc6dbf69400","a5":"sf1beiELhz+Xyg7Bjrt4WiBfaY5vpkGrCD+xaMHm/GCzgF68kRlDwseX15HeKmD427O8RPN/0//e0hrVLpmTQyIrFn4KfC7lgSnpz1mkANwQ/S+bsOushq0ovjgnpcc7ODCBkY6lOAMLRsx5ZfUQXRXhZLYjrVTEbmWCXbVzNuTvB/KN52FJ/l4oT9rj2aPoSrBeTjLl6JNCJ9bvGyObkkIiL1rFJ6fwNG5uOrr2i+xtucj8jhhjDRraXxuoZVot3quW8FjADvzE6nizxtyrr+KQgll01XLKbSWZM3OFYoI9eOQEeHSGKX69","a6":"w1.0wZD6pex7gKE7BSbNaRNg2mxDIZYZmtB0FRfg0HOH4zk1TGYNLhg3u4NCzb7d+/FIUF4/QGJAVn/svXkS0YDatsFqXQX7AqpLWEtmR3kq0zhwh12faHtXFe7OV79vZn1S4xSS6vPWFQy6tM9gfoG71uAC2r2Y5Z8RiTssEFYvtU3CK8+Js5FxQiO/Ukdu3aqNerp0kItkY14/5EqOTdPwoNDepRAMvzrPCgHuEtOTlIMkWsugTC+DZmDQPoUkETBkopzxIR6eRnA0dg+NKNxNAPHefxOtK7zZyzhOwG7MW7OsrmKZonoLjdy8+f8Ka71eIl1LYLUHibVssomM4TulG1vG0SXEHezm5sQZ5RcsA2DN3IMia21gAT96owpRI48tzvWQadsr+1B66xgBRlAbosGuBLWiSaCbUkCKkkxb8B+aWerlHsHVReGCtz2tHt9aHpx0fO4eEHGN3Nk1sF6ak9PWhk/rzHi61Sav59KUFl4=","a7":"wx4474ed752dbe0955"}',
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
    }
    content = ut.parse_url(url=url, headers=headers, method="get")

    data_list = content["data"]
    for i in data_list:
        productList = i["productList"]
        startTime = i["startTime"]/1000
        timeValue = time.localtime(startTime)
        res["start_time"] = time.strftime("%Y-%m-%d %H:%M:%S", timeValue)
        insert_item(res, productList)
    print("【%s-%s】插入成功"%(res["app_name"], res["column"]))

def main():
    # todo 可能需要修改的
    token = "xxxxxxxxx"
    # 1 数据详情
    item = dict()
    # # 2 日期和app

    item["update_date"] = str(datetime.datetime.today())[0:10]
    item["app_id"] = 101
    item["app_name"] = "美团优选"
    # # 3 城市
    city_df = GetCity(token)
    item["city_id"] = city_df["city_id"].values[0]
    item["city_name"] = city_df["city_name"].values[0]
    # 分类信息
    father_list = extract_father_info(token)

    if father_list:
        for i in father_list:
            item["column"],info_url = i

            if item["column"] == "限时秒杀":
                # 秒杀单独提出来
                second_kill(token, info_url, item)
            elif item["column"] == "拉新有奖":
                continue
            else:
                extract_data(token, info_url, item)

    else:
        print("========大类信息获取失败，应该需要调整参数")

    print("====================【%s %s】商品信息获取完毕"%(item["update_date"],item["app_name"]))

if __name__ == '__main__':
    main()
```
