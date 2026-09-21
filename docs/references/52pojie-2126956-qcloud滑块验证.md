# qcloud滑块验证

> **作者**: pzx521521 | **发布时间**: 2026-09-08 12:17:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1074 / 7
> **原文**: [https://www.52pojie.cn/thread-2126956-1-1.html](https://www.52pojie.cn/thread-2126956-1-1.html)

---

*本帖最后由 pzx521521 于 2026-9-10 14:05 编辑*

> 地址: <https://turing.captcha.qcloud.com>
> 有这个需求是因为某点读书频繁触发这个

我看论坛已经有做这个分析了,就不做具体内容分析了

流程:

prehandle -> 下载图/tdc.js -> CV识别缺口 -> Node沙箱注入轨迹生成collect
-> 本地pow -> cap\_union\_new\_verify -> ticket/randstr

就是传入一个图片`captcha_a_id`
返回对应的 `ticket` + `randstr`

用的 glm5.3 因为不容易触发 敏感词
流程的就是 抓包,保存为文本文件,让 ai 读抓包数据,然后分析,因为都是 ai 分析的,感觉没太大必要写进来了

补node环境都是 ai 自己补,用于轨迹生成,感觉没必要把 js 全部提出来,下次版本升级又要重新搞

难点在于
1.不使用专门`ddddocr`(太大了功耗太高了),直接使用 opencv 去做定位
2.使用 quickjs 轻量级补环境,不带入整个 node, 方便部署到服务器
源码:
<https://github.com/pzx521521/TencentSliderSolver>
网页示例:
<https://www.modelscope.ai/studios/parall/TencentSliderSolver>
