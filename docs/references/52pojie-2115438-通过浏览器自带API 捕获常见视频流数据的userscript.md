# 通过浏览器自带API 捕获常见视频流数据的userscript

> **作者**: saobee | **发布时间**: 2026-07-03 00:11:00 | **版块**: 『编程语言区』 | **查看/回复**: 1103 / 19
> **原文**: [https://www.52pojie.cn/thread-2115438-1-1.html](https://www.52pojie.cn/thread-2115438-1-1.html)

---

*本帖最后由 saobee 于 2026-7-24 16:23 编辑*

2026.07.03 版本更新及答疑：
脚本的原理：和猫抓不一样，类似于从播放器元素中拷数据。要播放完才能下载，没播放完，也可以随时点击按钮合并保存。
为了让视频播放加快，有智能跳播和倍速播放，对于不限速缓冲快的，智能跳播更合适，相当于缓冲了多少，就让进度条跳过去接近的位置。
倍速播放点击后就是10倍速，我试过有些网站在这种情况下会报错，或者从头播放。
用cctv和yangshipin以及常见的视频网站测试过，可以直接保存并正常播放。

[Plain Text] *纯文本查看*

```
也可以直接安装脚本：
https://greasyfork.org/zh-CN/scripts/586254-media-source-extract-lite
```

更新的内容：之前看到有人问能不能下油管，我正好忘记测试了，一测试才发现有好多坑，不过还好gpt5.5确实够厉害，一次次的调试和调整，最终还是解决了。
先是把mp4box中的视频合并相关逻辑优化和搬了过来，这样就不用引用外部js
然后针对各种奇葩视频流进行测试调整，中间又是各种修复和调试。
本次js源码大小直接来到了185kb，于是也顺便生成了min版本，80多kb。

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[media-source-extract-lite-badge.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=Mjg2MTM4MHxhZTY2MGMwOHwxNzkwMTQwNTM1fDIzMjM3Mjd8MjExNTQzOA%3D%3D)
*(41.12 KB, 下载次数: 43)*

lanzou盘地址：
https://wwbhw.lanzouq.com/b0mcmnqqh
密码:52pj

最初灵感来源：

[Plain Text] *纯文本查看*

```
https://github.com/Momo707577045/media-source-extract
```

但是这个脚本缺点挺大，数据捕获完成之后，会有一个视频文件，一个音频文件，下载后要用ffmpeg合并，非常麻烦，一般情况下用不着。

最近买了一个chatgpt的plus，虽然codex的量每天很容易就用完，但是网页版是可以无限使用的，就花了几天时间进行讨论和测试，有了现在的版本，我觉得基本上已经够用了。

**脚本主要适用于：**
**1. 通用小视频抓取下载，没必要为一个小视频打开下载工具**
**2. 某些特殊加密的hls视频，通用的m3u8下载工具下载后无法正常播放**
**3. 捕获某些直连视频的url**

**测试截图：**

![](https://attach.52pojie.cn/forum/202607/03/000439evlw1vq449vsv9s9.png)

未展开时显示badge，
徽标颜色：
| 灰色 | 尚未发现媒体 |
| 绿色 | 已经捕获或识别到媒体 |
| 蓝色 | 完整面板已经展开 |

![](https://attach.52pojie.cn/forum/202607/03/000442lxbffansfzzo66b6.png)

点击标记展开面板

方法一：直接安装文件

1. 打开 Tampermonkey 管理面板。
2. 将 `media-source-extract-lite-badge.user.js` 拖入浏览器窗口，或使用 Tampermonkey 的“实用工具 / 导入文件”。
3. 确认安装。
4. 刷新已经打开的视频页面。

方法二：手动粘贴

1. 打开 Tampermonkey 管理面板。
2. 新建脚本。
3. 删除编辑器中的默认内容。
4. 粘贴 `media-source-extract-lite-badge.user.js` 的完整代码。
5. 保存并刷新网页。

主要功能
- 捕获 MSE/fMP4 媒体分片。
- 自动识别视频轨、音频轨和分离的 MediaSource 会话。
- 重建 MP4 时间轴并合并音视频。
- 识别 HTTP(S) 直连视频和独立音频。
- 下载直连媒体。
- 复制当前媒体 URL。
- 10 倍速播放。
- 智能跳播到缓冲区前沿附近，促进媒体继续加载。
- 显示加载进度和加载完成状态。
- 下载原始捕获轨道。
- 导出时间轴 JSON，便于排错。
- 默认折叠面板，只显示捕获数量徽标。

其它说明和缺陷、限制等请看附件内说明文档
