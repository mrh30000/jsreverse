# python实现蓝奏云文件夹内文件获取和文件直链获取

> **作者**: 无名 | **发布时间**: 2025-02-12 15:39:00 | **版块**: 『编程语言区』 | **查看/回复**: 4714 / 16
> **原文**: [https://www.52pojie.cn/thread-2005690-1-1.html](https://www.52pojie.cn/thread-2005690-1-1.html)

---

*本帖最后由 无名 于 2025-4-10 23:22 编辑*

###### 起因：zaxtyson/LanZouCloud-API过久没有更新，关于文件夹内文件信息的获取会失败，又没在网上找到相关可用的，反倒是单文件分享的直链获取网上挺多的，只好自己写一下。

## 简单说明：

### 1.`GetFileListByUrl(url,pwd,pg=1)`

没有做API速率限制，使用时一定要小心！！！

##### 参数：

必要参数：
url为文件夹分享链接
pwd为文件夹密码
非必要参数：
pg为页码，从1到xx,按照时间顺序（由新到旧，与网页上看到的一致）

##### 返回值：

成功：
一个列表
注：空列表就表示已经没有文件了
失败：
None
[b]注意:如果HTTP code为401，则会抛出异常（此文件夹已经暂时不可访问）
例如：

```
filelists=GetFileListByUrl("https://wwjn.lanzout.com/xxxxx",'xxxx')
filelists=GetAllFileListByUrl("https://wwjn.lanzout.com/xxxxx",'xxxx',2)
```

### 2.`GetAllFileListByUrl(url,pwd)`

参数意义和返回值同1
使用时最好加异常处理，可能会有Runtime Error的异常。
例如：

```
filelists=GetAllFileListByUrl("https://wwjn.lanzout.com/xxxxx",'xxxx')
```

### 3.`Get_final_link(_id)`

`_id`为函数`GetFileListByUrl`或者函数`GetAllFileListByUrl`返回的列表的字典的键为   "id"   的值。
注意：不能用于单文件直链获取
例如：

```
Get_final_link(
GetFileListByUrl("https://wwjn.lanzout.com/xxxxx",'xxxx')[0]["id"]
)
```

返回值：
成功：
获取到的直链
失败：
None

### 其它没有提及的函数仅为中间函数，一般不需使用。

### 可自行将这些函数封装成类。

### 注意：">注意：

1.此代码没有实现单文件分享的直链获取，一切都是关于文件夹的！！！
2.使用GetAllFileListByUrl()时，每获取一页会延时1秒(可自行修改,小于1秒我没试过)，因为文件夹访问过频繁，蓝奏云会ban掉所有访问，导致所有人都无法访问该文件夹。但是GetFileListByData(),没有做此API速率限制，使用时一定要小心！！！
3.GetAllFileListByUrl()和GetFileListByUrl()都只能获取文件夹内的文件，对于文件夹内嵌套的文件夹就无能为力了
4.暂时不支持文件夹无密码的情况（网上有第三方提供的API可以解决此情况）

#### 此代码维护随我的需要而定，若有任何问题欢迎反馈（我维护时会看的）并自行修改解决，同时也欢迎大家将其分享出来。

代码：

```
import re
import json
import requests
import time

class RateLimiter:
    def __init__(self, rate_limit):
        """
        初始化速率限制器
        :param rate_limit: 速率限制，单位是秒（例如，每秒最多调用 1 次 API）
        """
        self.rate_limit = rate_limit
        self.last_request_time = 0  # 上一次调用 API 的时间

    def wait_if_needed(self):
        """
        检查是否需要等待，并暂停程序直到满足速率限制
        """
        current_time = time.time()  # 获取当前时间
        time_since_last_request = current_time - self.last_request_time

        # 如果时间间隔小于速率限制，就暂停等待
        if time_since_last_request < self.rate_limit:
            time.sleep(self.rate_limit - time_since_last_request)  # 暂停等待

        # 更新上一次调用 API 的时间
        self.last_request_time = time.time()

rate_limiter = RateLimiter(rate_limit=1)  # 每秒最多调用 1 次 API

headers = {
  'User-Agent': "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
}

def PrepareData(url,pwd,pg=1):
    response = requests.get(url, headers=headers)
    # response = requests.get(url, headers=headers,verify=False)
    # script_content = '''
    # <script type="text/javascript">
            # var indwyr ='curl';
            # document.title = indwyr;
    # 　　        var pwd;
            # var pgs;
            # var ibh8v5 = '1739025066';
            # var _hfkwy = 'a74a9dfd4d87aacbfb613f957a4aa132';
            # pgs =1;
            # function file(){
                    # var pwd = document.getElementById('pwd').value;
            # $('#sub').val("提交中...");
                    # $.ajax({
                            # type : 'post',
                            # url : '/filemoreajax.php?file=10506909',
                            # data : {
                            # 'lx':2,
                            # 'fid':10506909,
                            # 'uid':'3499274',
                            # 'pg':pgs,
                            # 'rep':'0',
                            # 't':ibh8v5,
                            # 'k':_hfkwy,
                            # 'up':1,
                                                    # 'ls':1,
                            # 'pwd':pwd                        }
    # '''
    script_content=response.text
    # print(response.text)
    match = re.search(r"'t':([^,]+)", script_content)
    if match:
        t = match.group(1)
        # print(t)
        match = re.search(r"var "+t+r" = '([^']+)'", script_content)
        if match:
            t = match.group(1)
            # print(t)
        else:
            print("没有找到 t 的值")
    else:
        print("没有找到 t(raw) 的值")

    match = re.search(r"'k':([^,]+)", script_content)
    if match:
        k = match.group(1)
        # print(k)
        match = re.search(r"var "+k+r" = '([^']+)'", script_content)
        if match:
            k = match.group(1)
            # print(k)
        else:
            print("没有找到 k 的值")
    else:
        print("没有找到 k(raw) 的值")

    match = re.search(r"'fid':(\d+)", script_content)
    if match:
        fid = match.group(1)
        # print(fid)
    else:
        print("没有找到 fid 的值")

    match = re.search(r"'uid':'([^']+)'", script_content)
    if match:
        uid = match.group(1)
        # print(uid)
    else:
        print("没有找到 uid 的值")

    match = re.search(r"'lx':(\d+)", script_content)
    if match:
        lx = match.group(1)
        # print(lx)
    else:
        print("没有找到 lx 的值")

    match = re.search(r"'rep':'([^']+)'", script_content)
    if match:
        rep = match.group(1)
        # print(rep)
    else:
        print("没有找到 rep 的值")

    match = re.search(r"'up':(\d+)", script_content)
    if match:
        up = match.group(1)
        # print(up)
    else:
        print("没有找到 up 的值")

    match = re.search(r"'ls':(\d+)", script_content)
    if match:
        _is = match.group(1)
        # print(_is)
    else:
        print("没有找到 is 的值")

    # 模拟的请求数据
    data = {
        'lx': lx,
        'fid': int(fid),
        'uid': uid,
        'pg': pg,
        'rep': rep,
        't': t,
        'k': k,
        'up': up,
        'ls': _is,
        'pwd': pwd
    }
    return data

def Get_final_link(_id):
    response = requests.get("https://wwjn.lanzout.com/tp/"+_id,headers=headers)
    # response = requests.get("https://wwjn.lanzout.com/tp/"+_id,headers=headers,verify=False)
    # print("响应内容：", response.text)
    match = re.search(r"var vkjxld = '([^']+)';", response.text)
    if match:
        vkjxld = match.group(1)
        # print(vkjxld)
    else:
        print("没有找到 vkjxld 的值")

    match = re.search(r"var hyggid = '([^']+)';", response.text)
    if match:
        hyggid = match.group(1)
        # print(hyggid)
    else:
        print("没有找到 hyggid 的值")

    response = requests.get(vkjxld+hyggid,headers=headers)
    # response = requests.get(vkjxld+hyggid,headers=headers,verify=False)
    # print(response.text)

    match = re.search(r'<a href="(https?://[^"]+)"', response.text)

    if match:
        final_link = match.group(1)  # 提取捕获组的内容
        return final_link
        # print("提取到的链接为：")
        # print(final_link)
    else:
        print("没有找到链接")
        return None

def GetFileListByData(data,pg):
    url = 'https://wwjn.lanzout.com/filemoreajax.php?file='+str(data["fid"])
    data["pg"] = pg
    response = requests.post(url, data=data,headers=headers)
    if response.status_code==401:#因文件夹访问过频繁，蓝奏云会ban掉所有访问
        raise RuntimeError("401,请过段时间再试")
    j=json.loads(response.text)
    # print(response.text)
    if j["zt"]==1:
        return j["text"]
    elif j["zt"]==2:
        return []
    else:
        return None

def GetFileListByUrl(url,pwd='',pg=1):
    data=PrepareData(url, pwd,1)
    for i in range(1,pg+1):
        for retry in range(0,3):  # 最多重试3次
            rate_limiter.wait_if_needed()  # 检查是否需要等待
            l=GetFileListByData(data,pg)
            if l is not None:
                break
    return l

def GetAllFileListByUrl(url,pwd=''):
    lists=[]
    pg=1
    data=PrepareData(url, pwd)

    retry=0
    while retry<=3:
        rate_limiter.wait_if_needed()  # 检查是否需要等待
        l=GetFileListByData(data,pg)
        # print(f"pg={pg}")
        # print(f"API called at {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}")

        if isinstance(l, list) and not l:#空列表，已经遍历完了
            return lists
        if l is None:#失败
            retry+=1
            l=GetFileListByData(data,pg)
            continue
        else:#成功
            lists+=l
            retry=0
            pg+=1
if __name__ == "__main__":

    # filelists=GetFileListByUrl("https://wwjn.lanzout.com/xxx",'xxxx')
    # print(filelists)

    filelists=GetAllFileListByUrl("https://wwjn.lanzout.com/xxx",'xxxx')
    # filelists=GetAllFileListByUrl("https://wwjn.lanzout.com/xxxx",'xxxx')
    print(filelists)

    #测试直链获取
    link=Get_final_link(filelists[0]["id"])
    print(link)
```

2025.2.27修改，修复了GetFileListByUrl无法获取第2页以上的错误
2025.4.10修改，修复了因蓝奏云api变更带来的问题，代码详见17楼（已经置顶）

## 免责声明

此代码仅供个人学习使用，严禁用于商业用途和其它违法用途
此代码没有任何担保，如果您使用这些代码，您必需承担其带来的风险
