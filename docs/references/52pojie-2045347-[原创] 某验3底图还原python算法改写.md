# [原创] 某验3底图还原python算法改写

> **作者**: ZenoMiao | **发布时间**: 2025-07-13 10:33:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2997 / 11
> **原文**: [https://www.52pojie.cn/thread-2045347-1-1.html](https://www.52pojie.cn/thread-2045347-1-1.html)

---

*本帖最后由 ZenoMiao 于 2025-7-13 10:35 编辑*

本次撸的网站为: aHR0cHM6Ly9kZW1vcy5nZWV0ZXN0LmNvbS9zbGlkZS1mbG9hdC5odG1s

刷新请求返回的是三张图片, 一张是乱序的原图, 一张是乱序的有缺口的底图, 一张是缺块图

![](https://attach.52pojie.cn/forum/202507/13/101155ir992h2wekkhlkfz.png)

通过打事件断点: Canvas -> Create canvas context 可以断到canvas还原底图的位置

![](https://attach.52pojie.cn/forum/202507/13/101332ovtygiipvv77qvcc.png)

某验3底图还原代码如下, 是利用canvas的图片截取, 图片覆盖来还原原图的

[JavaScript] *纯文本查看*

```

function $_BEN(t, e) {
            var $_DAHHz = lACSb.$_DN()[9][16];
            for (; $_DAHHz !== lACSb.$_DN()[9][15]; ) {
                switch ($_DAHHz) {
                case lACSb.$_DN()[9][16]:
                    t = t[$_CJFi(52)],
                    e = e[$_CJEB(52)];
                    var n = t[$_CJFi(78)]
                      , r = t[$_CJEB(5)]
                      , i = h[$_CJFi(45)]($_CJEB(1));
                    i[$_CJFi(78)] = n,
                    i[$_CJEB(5)] = r;
                    var o = i[$_CJFi(17)]($_CJFi(32));
                    o[$_CJFi(34)](t, 0, 0);
                    var s = e[$_CJFi(17)]($_CJEB(32));
                    e[$_CJEB(5)] = r,
                    e[$_CJFi(78)] = 260;
                    for (var a = r / 2, _ = 0; _ < 52; _ += 1) {
                        var c = Ut[_] % 26 * 12 + 1
                          , u = 25 < Ut[_] ? a : 0
                          , l = o[$_CJEB(48)](c, u, 10, a);
                        s[$_CJEB(23)](l, _ % 26 * 10, 25 < _ ? a : 0);
                    }
                    $_DAHHz = lACSb.$_DN()[0][15];
                    break;
                }
            }
        }
```

Ut是固定值为暂且认为他是打乱图片的顺序, n为长度, r为宽度, i是新建一个画板, 然后把"drawImage"把底图画进去
s是新建一个空的画板(以便后面截取后还原使用)

以下为python还原的代码

[Python] *纯文本查看*

```

def image_restore():
    Ut = [39, 38, 48, 49, 41, 40, 46, 47, 35, 34, 50, 51, 33, 32, 28, 29, 27, 26, 36, 37, 31, 30, 44, 45, 43, 42, 12, 13, 23, 22, 14, 15, 21, 20, 8, 9, 25, 24, 6, 7, 3, 2, 0, 1, 11, 10, 4, 5, 19, 18, 16, 17]
    img = Image.open('test.webp')
    n, r = img.size
    s = Image.new('RGB', (260, r))  # 创建一个空白图片
    a = r // 2
    for _, order in enumerate(Ut):
        c = Ut[_] % 26 * 12 + 1  # 列数
        u = a if 25 < Ut[_] else 0  # 行数
        l = img.crop((c, u, c + 10, u + a))
        s.paste(l, (_ % 26 * 10, a if 25 < _ else 0))  # 粘贴图片
    s.save('output.png')
    s.show()

if __name__ == "__main__":
    image_restore()
```
