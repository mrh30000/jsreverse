# 【原创源码】【python】网易云音乐缓存.uc转化MP3

> **作者**: tp522022 | **发布时间**: 2023-08-18 09:30:00 | **版块**: 『编程语言区』 | **查看/回复**: 4417 / 29
> **原文**: [https://www.52pojie.cn/thread-1822588-1-1.html](https://www.52pojie.cn/thread-1822588-1-1.html)

---

如题，Python实现的将网易云的缓存文件.uc转化为MP3格式，解密.uc格式的方法是将每个字节跟0xA3异或。

[Python] *纯文本查看*

```
import os

def get_path_dfs_helper(path_collect_list: list, input_path: str, deep: int):
    if not os.path.exists(input_path):
        print(f'目录不存在:{input_path}')
        return
    if deep > 10:
        return
    if os.path.isfile(input_path):
        path_collect_list.append(input_path)
        return
    files = os.listdir(input_path)
    for file in files:
        f_abs = os.path.join(input_path, file)
        get_path_dfs_helper(path_collect_list, f_abs, deep + 1)
    pass

def convert_uc_to_mp3(input_dir: str, output_dir: str):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    cache_file_list = []
    get_path_dfs_helper(cache_file_list, input_dir, 0)
    for f in cache_file_list:
        if not f.endswith('.uc'):
            continue
        file_name = os.path.basename(f)
        print(f'文件:{os.path.basename(f)}-->{os.path.getsize(f)}字节')
        with open(f, mode='rb+') as fr:
            data_bytes = fr.read()
            file_name = file_name[:-3] + '.mp3'
            output_file_abs_path = os.path.join(output_dir, file_name)
            if os.path.exists(output_file_abs_path):
                continue
            with open(output_file_abs_path, 'wb+') as fw:
                convert_list = list()
                for data in data_bytes:
                    result = data ^ 0xA3
                    convert_list.append(result)
                fw.write(bytes(convert_list))
    pass

def test_function():
    input_cache_dir = r'F:\99.OtherSoftwareCache\Netease\CloudmusicCache\Cache'
    output_dir = r'F:\99.OtherSoftwareCache\ConvertToMp3'
    convert_uc_to_mp3(input_cache_dir, output_dir)
    pass

if __name__ == '__main__':
    test_function()
    pass
```
