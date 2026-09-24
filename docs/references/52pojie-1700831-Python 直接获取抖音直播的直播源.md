# Python 直接获取抖音直播的直播源

> **作者**: 扛刀萝莉 | **发布时间**: 2022-10-18 16:16:00 | **版块**: 『编程语言区』 | **查看/回复**: 7738 / 8
> **原文**: [https://www.52pojie.cn/thread-1700831-1-1.html](https://www.52pojie.cn/thread-1700831-1-1.html)

---

分析过程请参考   <https://www.52pojie.cn/thread-1700738-1-1.html>
鉴于有些朋友不会抓包或者有问题 附上自己写的代码
可以直接获取flv和m3u8的直播源链接

import re
import sys

import requests

DEBUG = False

headers = {
    'authority': 'v.douyin.com',
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10\_3\_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
}

url = input('请输入抖音直播链接或19位room\_id：')
if re.match(r'\d{19}', url):
    room\_id = url
else:
    try:
        url = re.search(r'(https.\*)', url).group(1)
        response = requests.head(url, headers=headers)
        url = response.headers['location']
        room\_id = re.search(r'\d{19}', url).group(0)
    except Exception as e:
        if DEBUG:
            print(e)
        print('获取room\_id失败')
        sys.exit(1)
print('room\_id', room\_id)

try:
    headers.update({
        'authority': 'webcast.amemv.com',
        'cookie': '\_tea\_utm\_cache\_1128={%22utm\_source%22:%22copy%22%2C%22utm\_medium%22:%22android%22%2C%22utm\_campaign%22:%22client\_share%22}',
    })

    response = requests.get('https://webcast.amemv.com/webcast/room/reflow/info/?verifyFp=&type\_id=0&live\_id=1&room\_id={}&sec\_user\_id=&app\_id=1128&msToken=&X-Bogus='.format(room\_id), headers=headers,).json()
    print(response)
    rtmp\_pull\_url = response['data']['room']['stream\_url']['rtmp\_pull\_url']
    hls\_pull\_url = response['data']['room']['stream\_url']['hls\_pull\_url']
    print(rtmp\_pull\_url)
    print(hls\_pull\_url)
except Exception as e:
    if DEBUG:
        print(e)
    print('获取real url失败')
