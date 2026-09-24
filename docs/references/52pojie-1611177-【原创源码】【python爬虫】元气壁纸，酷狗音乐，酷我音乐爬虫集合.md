# 【原创源码】【python爬虫】元气壁纸，酷狗音乐，酷我音乐爬虫集合

> **作者**: TokeyJs | **发布时间**: 2022-03-26 13:12:00 | **版块**: 『编程语言区』 | **查看/回复**: 17363 / 68
> **原文**: [https://www.52pojie.cn/thread-1611177-1-1.html](https://www.52pojie.cn/thread-1611177-1-1.html)

---

*本帖最后由 TokeyJs 于 2022-3-26 17:11 编辑*

**元气壁纸，酷狗音乐，酷我音乐爬虫集合。**
下载各种壁纸，支持多页下载，多进程下载。
音乐搜索下载。
音乐品质都比较低。
**仅用做学习交流使用。**
使用前请安装相应模块。
pyexecjs:pip3 install PyExecJS

[Python] *纯文本查看*

```
# -*- coding:utf-8 -*-
import re
import requests
import execjs
import json
from lxml import etree
import time
import os
import multiprocessing
from bs4 import BeautifulSoup
"""
使用前请安装以下模块
requests :pip3 install requests
lxml :pip3 install lxml

BeautifulSoup:pip3 install beautifulsoup4
"""
class Spider_Tools:
    def __init__(self):
        self.Time1 = 0
        self.Time2 = 0
        self.SAVE_ROUTE_IMG = './Img_save/'
        self.SAVE_ROUTE_SONG = './Song_save/'
        self.PC_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
        }
        self.PE_headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        }
    def Main(self):
        """
        工具主驱动函数
        :return:
        """
        cmd = ''
        while cmd != '0':
            print('='*50)
            print("TokeyJs Spider Tools")
            print('功能菜单：')
            print("1. 元气壁纸  2. 酷狗音乐\n3. 酷我音乐   \n9. 使用说明!!!(必读)\n    0.退出")
            print('=' * 50)
            cmd = input('请选择：')
            if cmd == '1':
                self.YQ_img()
            elif cmd == '2':
                self.KG_song()
            elif cmd == '3':
                self.KW_song()
            elif cmd == '9':
                self.User_Help()
            else:
                exit()
    # 元气壁纸爬取函数
    def YQ_img(self):
        """元气壁纸爬取"""
        self.Make_dir(self.SAVE_ROUTE_IMG)
        print('*' * 20+'元气壁纸爬取'+'*' * 20)
        print('[1].风景  [2].动漫  [4].游戏  [6].明星  [7].动物  [8].小清新\n[9].科幻  [10].汽车  [12].体育  [13].其他\n       [0].返回')
        print('*' * 50)
        k = input('选择爬取的种类：')
        if k == '0':
            return
        right_ = ['1', '2', '4', '6', '7', '8', '9', '10', '12', '13', '0', '5']
        if k not in right_:
            print("输入错误！！\n输入举例：1")
            return
        else:
            # 什么种类的那页壁纸
            url_1 = 'https://bizhi.cheetahfun.com/{}/index_{}.shtml'
            # 获取总页码
            res1 = requests.get(url=url_1.format(k, 1), headers=self.PC_headers, timeout=2)
            res1.encoding = res1.apparent_encoding
            # print(res1.text)
            trr = etree.HTML(res1.text)
            all_page = trr.xpath('//li[@class="paging-item"]/a/@data-detail')[-1]
            # print(all_page)
            sum_n = 0
            kn = input('爬取几页(共{}页)：'.format(all_page))
            try:
                vv = int(kn)
            except:
                print('输入错误！')
                return
            if vv > int(all_page) or vv <= 0:
                print('输入错误！')
                return
            # 开始一页页爬取
            type_ = input("爬取方式：0.普通模式  1.多进程模式 &#9888;&#9888;&#9888;:")
            if type_ == '1':
                print('**多进程抓取中(启动较慢)...')
            else:
                print('**普通模式抓取中...')
            # 计时器1
            self.Time1 = time.time()
            url_all_name = []
            for n in range(1, int(kn) + 1):
                res1 = requests.get(url=url_1.format(k, n), headers=self.PC_headers, timeout=2)
                res1.encoding = res1.apparent_encoding
                # print(res1.text)
                trr = etree.HTML(res1.text)
                # 得到第n页每张图片详情页信息的url
                detail_img_html = trr.xpath(
                    '//div[@class="wallpaper-wrapper"]/div[@class="wallpaper-item "]/a/@href')
                if type_ != '1':
                    print("第{}/{}页......".format(n, vv))
                if type_ != '1':
                    time.sleep(1)
                else:
                    time.sleep(0.4)
                # 获取每张图片详情页中的大图片
                for img_html in detail_img_html:
                    res2 = requests.get(url=img_html, headers=self.PC_headers, timeout=2)
                    res2.encoding = res2.apparent_encoding
                    # 图片的url，名称name
                    url = re.compile('class="content-detail-wallpaper.*?src="(.*?)".*?', re.S).findall(res2.text)[0]
                    name = BeautifulSoup(res2.text, 'html.parser').find("div", class_='content-detail-wallpaper').find(
                        "img").get('alt')

                    if type_ != '1':
                        # 获取图片数据并存储
                        img = requests.get(url=url, headers=self.PC_headers, timeout=2).content

                        with open(self.SAVE_ROUTE_IMG + name + '.jpg', 'wb') as f:
                            f.write(img)
                        print('[', name, ']', '存储成功！')

                        sum_n += 1
                    else:
                        url_all_name.append([url, name])

                if type_ == '1':
                    print("第{}/{}页解析完成！".format(n, vv))

            if type_ == '1':
                self.Mpool(self.Get_jpg, url_all_name)
            else:
                self.Time2 = time.time()
                print(f"本次抓取耗时：{self.Time2-self.Time1} S")
                print("本次共抓取{}张图片！".format(sum_n))
    # 酷狗音乐爬取函数
    def KG_song(self):
        """酷狗音乐爬取"""
        print('*' * 20 + '酷狗音乐爬取' + '*' * 20)
        self.Make_dir(self.SAVE_ROUTE_SONG)
        url1 = 'https://mobiles.kugou.com/api/v3/search/song?'
        url2 = 'https://m.kugou.com/api/v1/song/get_song_info_v2?'
        word = input("输入歌曲名字：")
        jjj = '''function Get_callback() {return "kgJSONP" + Math.random().toString().substr(2, 9);}'''
        js_ = execjs.compile(jjj)
        callback = js_.call('Get_callback')
        params1 = {
            'format': 'jsonp',
            'keyword': word,
            'page': '1',
            'pagesize': '30',
            'showtype': '1',
            'callback': callback
        }
        res = requests.get(url=url1, params=params1, headers=self.PE_headers, timeout=2).text
        res = json.loads(res.replace(callback + '(', '').strip(')'))
        li_all = res['data']['info']
        # 所有歌曲
        song_all = []
        for li in li_all:
            data_ = {
                'songname': li['songname'],
                'songer': li['singername'],
                'hash': li['hash'].upper(),
                'album_id': li['album_id'],
                'album_audio_id': li['album_audio_id'],
            }
            song_all.append(data_)
        # print(song_all)
        print('****************查找成功**************')
        b = 0
        right_ = []
        for show_ in song_all:
            print('{}.{}--{}'.format(b, show_['songname'], show_['songer']))
            b += 1
            right_.append(b-1)
        print('*************************************')
        b = int(input('请选择：'))
        if b not in right_:
            print("====!选择错误！====")
            return
        params2 = {
            'cmd': 'playInfo',
            'hash': song_all[b]['hash'],
            'album_id': song_all[b]['album_id'],
            'album_audio_id': song_all[b]['album_audio_id'],
            'from': 'mkugou',
            'apiver': '2',
            'mid': '57bbcd78fcf958043bd143fe8a355082',  # 从cookie中获取可以固定
            'userid': '0',
            'platid': '4',
            'dfid': '4VPQ0s1lZf5m1Eozrj3YJlwl'  # 从cookie中获取可以固定
        }
        res2 = json.loads(requests.get(url=url2, params=params2, headers=self.PE_headers, timeout=2).text)
        url = res2['data']['url']
        is_ok = res2['data']['error']  # 空表示无需付费
        if not is_ok:
            list_url_name = [url, song_all[b]['songname']+'-'+song_all[b]['songer']]
            self.Get_mp3(list_url_name)
        else:
            print('获取失败，需要付费。')
    # 酷我音乐爬取函数
    def KW_song(self):
        """酷我音乐爬取"""
        print('*' * 20 + '酷我音乐爬取' + '*' * 20)
        self.Make_dir(self.SAVE_ROUTE_SONG)
        url1 = 'http://m.kuwo.cn/newh5app/api/mobile/v1/search/all?'
        url2 = 'http://m.kuwo.cn/newh5app/api/mobile/v2/music/src/{}'
        song = input("输入歌曲名字：")
        params = {
            'key': song
        }
        res = requests.get(url=url1, params=params, headers=self.PE_headers, timeout=2).json()
        res_list = res['data']['music']
        all_song = []
        for res in res_list:
            data_ = {'id': res['id'],'name': res['name'].replace(' ', ' '),'artist_name': res['artist_name'].replace(' ', ' ')}
            all_song.append(data_)
        if len(all_song) == 0:
            print('没有找到！')
            return
        b = 0
        rignt_ = []
        print('****************查找成功**************')
        for show_ in all_song:
            print("{}.{}---{}".format(b, show_['name'], show_['artist_name']))
            b += 1
            rignt_.append(b-1)
        print('*************************************')
        b = int(input('请选择：'))
        if b not in rignt_:
            print("====!选择错误！====")
            return
        url_ = url2.format(all_song[b]['id'])
        name = all_song[b]['name'] + '-' + all_song[b]['artist_name']
        try:
            url = requests.get(url=url_, headers=self.PE_headers, timeout=2).json()['data']['url']
        except:
            print('付费歌曲，不可获取。')
            return
        list_url_name = [url, name]
        self.Get_mp3(list_url_name)
    # 工具使用说明
    def User_Help(self):
        """
        使用说明
        :return:
        """
        print('*'*20+'使用说明'+'*'*20)
        mesg = "元气壁纸：存储在本文件同级目录下的Img_save文件夹内\n" \
               "元气壁纸爬取未完成时尽量不要关闭中止,会造成错误\n" \
               "元气壁纸爬取【尽量不要使用多进程,对网站手下留情！容易被封ip】\n" \
               "酷狗：存储在本文件同级目录下的Song_save文件夹内\n" \
               "酷我：存储在本文件同级目录下的Song_save文件夹内\n" \
               "文件开头的# -*- coding:utf-8 -*- 请不要删除！！！\n"\
               "部分音乐不可获取！\n"\
               "使用前请安装好requests,lxml,execjs,beautifulsoup4库\n" \
               "爬取的品质当然没有付费获取的高\n"\
               "!!!使用请联网!!!\n"\
               "                            作者：TokeyJs"

        print(mesg)
        print('*'*50)
    # 检查文件存储路径
    def Make_dir(self, path):
        """创建固定文件夹"""
        folder = os.path.exists(path)
        if not folder:  # 判断是否存在文件夹如果不存在则创建为文件夹
            os.makedirs(path)  # makedirs 创建文件时如果路径不存在会创建这个路径
    # 图片下载存储函数
    def Get_jpg(self, li_ur_name):
        """抓取单张图片li_ur_name: [url,name]"""
        url = li_ur_name[0]
        name = li_ur_name[1]
        img = requests.get(url=url, headers=self.PC_headers, timeout=2).content

        with open(self.SAVE_ROUTE_IMG + name + '.jpg', 'wb') as f:
            f.write(img)
        print('[', name, ']', '存储成功！')
    # 音乐下载存储函数
    def Get_mp3(self, li_ur_name):
        """音乐下载"""
        resp = requests.get(url=li_ur_name[0], headers=self.PE_headers, timeout=2).content
        with open('{}{}.mp3'.format(self.SAVE_ROUTE_SONG, li_ur_name[1]), 'wb') as f:
            f.write(resp)
        print(li_ur_name[1], '下载成功！')
    # 多进程加速函数
    def Mpool(self, get_jpg, url_all_name):
        """
        多进程加速
        :param get_jpg:爬取单张图片的函数
        :param url_all_name:【url,name】
        """
        # 多进程加速
        pool = multiprocessing.Pool()
        pool.map(get_jpg, url_all_name)
        pool.close()
        pool.join()
        self.Time2 = time.time()
        print(f"本次抓取耗时：{self.Time2 - self.Time1} S")
        print("本次共抓取{}张图片！".format(len(url_all_name)))
if __name__ == '__main__':
    spider = Spider_Tools()
    spider.Main()
```

****************效果图：****************
