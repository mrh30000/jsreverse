# 某音web端signature nodejs版本 不依赖浏览器

> **作者**: 天空宫阙 | **发布时间**: 2021-04-05 16:23:00 | **版块**: 『编程语言区』 | **查看/回复**: 4171 / 7
> **原文**: [https://www.52pojie.cn/thread-1410357-1-1.html](https://www.52pojie.cn/thread-1410357-1-1.html)

---

*本帖最后由 天空宫阙 于 2021-4-5 16:26 编辑*

## douyin web signature

此项目仅用于科研学习，请勿用于商业用途否则造成的后果与作者无关

## 使用方法

### 克隆代码或下载代码

```
git clone https://github.com/skygongque/douyin_signature.git
```

```
https://github.com/skygongque/douyin_signature
```

### 安装依赖

```
npm install
```

### 获取数据

```
node get_data.js
```

### 示例

![](https://attach.52pojie.cn/forum/202104/05/161459xece9s99d99gfqj9.png)

## others

1. 使用`sec_uid`代替`uid`来区分用户，需要得到用户的`sec_id`以获取该用户的所有作品
2. `uid` `useragent` `sec_uid` 和`signature`并没有绑定
3. 这个版本校验较弱可能只是过渡版本，可能很快失效

## canvas相关的浏览器环境的补充相关思路

对这部分感兴趣的人应该不多，感兴趣的就去我的github看吧，以下链接

```
https://github.com/skygongque/douyin_signature/tree/master/canvas%E7%9B%B8%E5%85%B3%E7%8E%AF%E5%A2%83%E8%A1%A5%E5%85%85
```

## 彩蛋 canvas最后画的图

![](https://attach.52pojie.cn/forum/202104/05/162628qbj2cemu144bs4bz.png)
