# 【原创源码】【Python】某云分享群资源同步到网盘

> **作者**: 熊猫拍板砖 | **发布时间**: 2020-06-27 12:58:00 | **版块**: 『编程语言区』 | **查看/回复**: 4886 / 9
> **原文**: [https://www.52pojie.cn/thread-1208082-1-1.html](https://www.52pojie.cn/thread-1208082-1-1.html)

---

因为自己有些资源需要同步，找了网上的某些同步大师软件，都是付费的，所以搞了这个，如果违反版规了，麻烦管理删除
基本功能是把某云分享群的资源同步到自己的网盘，
有检测更新并且同步的功能，
想要其他功能的有能力的同学自己修改
我没有其他功能要求，本着能跑就行的原则，就懒得重构了

Python代码

```
#! /bin/usr/env python3
# -*- coding:utf-8 -*-
import re
import requests
import execjs
import urllib
import time
import random
from datetime import datetime

session = requests.Session()
# 在这里读入，不管运行多少次，，内存中只加载这一次
with open("logid.js", "r")as f:
    js = f.read()

# 获取bdtoken
def get_config(cookies):
    url = "https://pan.baidu.com/disk/home"

    session.headers = {
        "Cookie": cookies,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
    }
    response = session.get(url,timeout=20)
    response.encoding = "utf-8"
    # print(response.text)

    bdstoken = re.search(r'"bdstoken":"([0-9a-z]+)","is_vip"', response.text).group(1)
    print(bdstoken)
    baiduid = ""
    for i in session.headers.get("Cookie").split(";"):
        if "BAIDUID" in i:
            baiduid = i.replace("BAIDUID=", "").strip()
            break

    return bdstoken, baiduid

# 生成logid参数
def get_logid(baiduid):
    ctx = execjs.compile(js)
    logid = ctx.call("w", baiduid, "")
    return logid

# 获取分享群列表
def get_share(bdstoken, logid):
    nowTime = datetime.now()
    url = f"https://pan.baidu.com/mbox/msg/historysession?t={nowTime}&bdstoken={bdstoken}&channel=chunlei&web=1&app_id=250528&logid={logid}&clienttype=0"
    response = session.get(url,timeout=20)
    # print(response.json())
    grop_dict = {}
    count = 0
    for i in response.json().get("records"):
        if not i.get("gid"):
            continue
        grop_dict[str(count)] = {"name": i.get("name"), "gid": i.get("gid"), "from_uk": i.get("uk")}
        count += 1
    return grop_dict

# 查看群分享文件目录
def get_share_file_directory(gid, bdstoken, logid):
    url = f"https://pan.baidu.com/mbox/group/listshare?gid={gid}&limit=50&desc=1&type=2&bdstoken={bdstoken}&channel=chunlei&web=1&app_id=250528&logid={logid}&clienttype=0"
    response = session.get(url,timeout=20,verify=False)
    # print(response.json())
    msg_list = response.json().get("records").get("msg_list")
    msg_dict = {}
    count = 0
    for i in msg_list:
        for j in i.get("file_list"):
            msg_dict[str(count)] = {"server_filename": j.get("server_filename"), "msg_id": i.get("msg_id"),
                                    "fs_id": j.get("fs_id")}
            count += 1
    return msg_dict

# 获取群分享文件
def get_share_file(msg_id, from_uk, gid, fs_id, bdstoken, logid):
    url = f"https://pan.baidu.com/mbox/msg/shareinfo?msg_id={msg_id}&page=1&from_uk={from_uk}&gid={gid}&type=2&fs_id={fs_id}&num=1000&bdstoken={bdstoken}&channel=chunlei&web=1&app_id=250528&logid={logid}&clienttype=0"
    response = session.get(url,timeout=20,verify=False)
    # print(response.json())
    # print(response.json().get("records"))
    files = []
    # count = 0
    md5_list,filename_list,size_list,zhuangtai=[],[],[],0
    for i in response.json().get("records"):
        item = {}
        # print(i)
        # 在这里有个问题，涉及到多层文件夹(目录)迭代问题，怎么确定到最后一层了，怎么区分文件夹(目录)和文件？
        # 这里的解决思路是利用了百度网盘提供的文件 MD5 校验的方式来区分的，只有文件才会有MD5这个参数，文件夹(目录)是没有的
        if not i.get("md5"):
            fs_id = i.get("fs_id")
            get_share_file(msg_id, from_uk, gid, fs_id, bdstoken, logid)

        item["server_filename"] = i.get("server_filename")
        item["path"] = i.get("path")
        item["md5"] = i.get("md5")
        item["fs_id"] = i.get("fs_id")
        item["size"] = i.get("size")
        # files.append(item)
        # 可以在这里直接开始转存
        print(item.get("md5"))
        if not item.get("md5"):
            continue

        # time.sleep(random.uniform(0.3, 2))
        print(item["path"])

        # 验证文件是否存在
        if zhuangtai == 0:
            if not filename_list and not size_list:
                print("------------------server_filename 为空，获取------------------------")

                md5_list,filename_list,size_list,zhuangtai=get_file_verify(item, bdstoken, logid)

        if item.get("server_filename") in filename_list and item.get("size") in size_list:
        # if get_file_verify(item, bdstoken, logid):
            print("当前文件存在，跳过")
            continue

        print("当前文件不存在，开始转存")

        # 拷贝文件
        get_copy_file(bdstoken, logid, from_uk, msg_id, r"/".join(item["path"].split("/")[:-1]), gid, [item["fs_id"]])

    # print(files)
    # return files

# 开始转存
def get_copy_file(bdstoken, logid, from_uk, msg_id, path, gid, fs_ids):
    url = f"https://pan.baidu.com/mbox/msg/transfer?bdstoken={bdstoken}&channel=chunlei&web=1&app_id=250528&logid={logid}&clienttype=0"
    # data = '''"{""from_uk":"%s","msg_id":"%s","path":"%s","ondup":"newcopy","async":"1","type":"2","gid":"%s","fs_ids":"%s""}"'''%(from_uk,msg_id,path,gid,fs_ids)

    data = f'''from_uk={from_uk}&msg_id={msg_id}&path={urllib.parse.quote(path)}&ondup=newcopy&async=1&type=2&gid={gid}&fs_ids={fs_ids}'''
    print(url)
    print(data)
    print(len(data))
    count = 0
    while count <= 5:
        try:
            response = session.post(url, data=data,timeout=20,verify=False)

            print(response.json())
            if response.json().get("errno") != 0:
                time.sleep(random.uniform(1,3))
                continue
            return response.json().get("errno")
        except Exception as e:
            print(e)
            time.sleep(random.uniform(1,3))
            count += 1
            if count == 6:
                return 0

# 文件校验是否存在  用了md5，size，文件名 来确定文件是否存在，这里用md5会出问题，所以我们用文件名和文件大小来判断文件是否存在
# 这里实测，同一个有些文件转存之后MD5会发生改变
def get_file_verify(item, bdstoken, logid):
    path = r"/".join(item["path"].split("/")[:-1])
    md5 = item.get("md5")
    server_filename = item.get("server_filename")
    size = item.get("size")
    url = f"https://pan.baidu.com/api/list?order=time&desc=1&showempty=0&web=1&page=1&num=1000&dir={urllib.parse.quote(path)}&t=0.5226565519419937&channel=chunlei&web=1&app_id=250528&bdstoken={bdstoken}&logid={logid}&clienttype=0&startLogTime={int(datetime.now().timestamp() * 1000)}"
    print(url)
    count = 0
    while count <= 5:
        try:
            response = session.get(url,timeout=20,verify=False)
            print(response.json())
            if response.json().get("errno") == 0:

                md5_dict = {}
                md5_list = []
                filename_list = []
                size_list = []
                for i in response.json().get("list"):
                    md5_list.append(i.get("md5"))
                    filename_list.append(i.get("server_filename"))
                    size_list.append(i.get("size"))
                    md5_dict["md5"] = i.get("md5")
                    md5_dict["size"] = i.get("size")
                    md5_dict["server_filename"] = i.get("server_filename")
                print(md5_list)
                # if md5 in md5_list:
                #     return True
                # else:
                #     if server_filename in filename_list and size in size_list:
                #         return True
                #     return [],[],[]
                return md5_list,filename_list,size_list,response.json().get("errno")
            # -9 是没有文件夹
            if response.json().get("errno") == -9:
                return [],[],[],response.json().get("errno")
        except Exception as e:
            print(e)
            time.sleep(random.uniform(0.5,2))
            count += 1
            if count == 6:
                return [],[],[],-9

if __name__ == '__main__':
        # 没有写登陆，这里填充Cookies
    cookies = ""

    # 获取bdtoken和baiduid
    bdstoken, baiduid = get_config(cookies)

    # 解析出 logid
    logid = get_logid(baiduid)

    # 从分享群列表
    grop_dict = get_share(bdstoken, logid)
    print(grop_dict)
    print("序号：群名")
    for i in grop_dict:
        print(i, grop_dict.get(i).get("name"))
    number = input("请输入要转存的群编号：")
    # number = "4"
    print(grop_dict.get(number).get("name"))

    # 解析获取gid
    gid = grop_dict.get(number).get("gid")
    from_uk = grop_dict.get(number).get("from_uk")

    # 获取群文件目录
    msg_dict = get_share_file_directory(gid, bdstoken, logid)
    print("序号：文件目录名")
    for i in msg_dict:
        print(i, msg_dict.get(i).get("server_filename"))
    file_number = input("请选择要转存的文件目录序号:")
    # file_number = "0"
    print(msg_dict.get(file_number).get("server_filename"))
    msg_id = msg_dict.get(file_number).get("msg_id")
    fs_id = msg_dict.get(file_number).get("fs_id")
    get_share_file(msg_id, from_uk, gid, fs_id, bdstoken, logid)
    # print(files)
```

logid.js

```
var s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/~！@#￥%……&"
    , u = String.fromCharCode
    , l = function(e) {
    if (e.length < 2) {
        var t = e.charCodeAt(0);
        return 128 > t ? e : 2048 > t ? u(192 | t >>> 6) + u(128 | 63 & t) : u(224 | t >>> 12 & 15) + u(128 | t >>> 6 & 63) + u(128 | 63 & t)
    }
    var t = 65536 + 1024 * (e.charCodeAt(0) - 55296) + (e.charCodeAt(1) - 56320);
    return u(240 | t >>> 18 & 7) + u(128 | t >>> 12 & 63) + u(128 | t >>> 6 & 63) + u(128 | 63 & t)
}
    , d = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g
    , f = function(e) {
    return (e + "" + Math.random()).replace(d, l)
}
    , g = function(e) {
    var t = [0, 2, 1][e.length % 3]
        , n = e.charCodeAt(0) << 16 | (e.length > 1 ? e.charCodeAt(1) : 0) << 8 | (e.length > 2 ? e.charCodeAt(2) : 0)
        , o = [s.charAt(n >>> 18), s.charAt(n >>> 12 & 63), t >= 2 ? "=" : s.charAt(n >>> 6 & 63), t >= 1 ? "=" : s.charAt(63 & n)];
    return o.join("")
}
    , p = function(e) {
    return e.replace(/[\s\S]{1,3}/g, g)
}
    , m = function() {
    return p(f((new Date).getTime()))
}
    , w = function(e, t) {
    return t ? m(String(e)).replace(/[+\/]/g, function(e) {
        return "+" == e ? "-" : "_"
    }).replace(/=/g, "") : m(String(e))
};
```
