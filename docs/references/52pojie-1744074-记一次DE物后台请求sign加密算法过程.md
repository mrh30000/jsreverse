# 记一次DE物后台请求sign加密算法过程

> **作者**: ab19950220 | **发布时间**: 2023-02-09 22:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2992 / 6
> **原文**: [https://www.52pojie.cn/thread-1744074-1-1.html](https://www.52pojie.cn/thread-1744074-1-1.html)

---

*本帖最后由 ab19950220 于 2023-2-12 17:56 编辑*

**事件前要：某一个小伙伴需要商家后台管理每日统计数据 就是下图圈起来这块数据**

废话不多说，直接开始分析，登陆上去先找到对应接口

![](https://attach.52pojie.cn/forum/202302/09/213743doddjd5ebzctcatn.png)

1.观察返回数据可以看出 这是我们的目标接口

找到关键位置 进行断点调试

![](https://attach.52pojie.cn/forum/202302/09/214840lve4yya9o4a41198.png)

![](https://attach.52pojie.cn/forum/202302/09/215131ycufa3co7caic3cc.png)

![](https://attach.52pojie.cn/forum/202302/09/215633zg47mb17gue88e5h.png)

![](https://attach.52pojie.cn/forum/202302/09/215912t1s5w5vcgsy9pszc.png)

![](https://attach.52pojie.cn/forum/202302/09/220432kycfyfoylwtp2orl.png)

![](https://attach.52pojie.cn/forum/202302/09/220916fo1rmobdul6e9ldm.png)

![](https://attach.52pojie.cn/forum/202302/09/221052q1l4bqqmbzbbb4yy.png)

![](https://attach.52pojie.cn/forum/202302/09/221341fzcehnxrrk6q448k.png)

![](https://attach.52pojie.cn/forum/202302/09/221719xo3dt8l9visket69.png)

[Python] *纯文本查看*

```
headers = {
    'Host': "stark.dewu.com",
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
    'appid': "h5",
    'channel': "pc",
    'clientId': "stark",
    'content-type': "application/json",
    'Accept-Encoding': "gzip, deflate",
    'platform': "h5",
    'Accept': "*/*",
    }
   post_data = dict()
   post_data['bizChannelId'] = '-1'
   post_data['brandIds'] = []
   post_data['categoryLv3Ids'] = []
   post_data['endDate'] = "20230205"
   post_data['startDate'] = "20230130"
   post_data['sign'] = return_sign('bizChannelId-1brandIdscategoryLv3IdsendDate20230205startDate20230130timeSpanType2timeType2048a9c4943398714b356a696503d2d36')
   post_data['timeSpanType'] = "2"
   post_data['timeType'] = "2"
#    print(headers)
#    print(post_data)
   post_data = str(post_data).encode('utf-8')
   res_data = requests.post(index_load_list_url, headers=headers, data=post_data).text
```

最终结果：
{"code":200,"msg":"success","data":{"tradeOutline":[{"title":"提交订单金额","tips":"","value":70931600,"dataType":2,"chainRatio":3747},{"title":"提交订单笔单价","tips":"","value":17921,"dataType":2,"chainRatio":437},{"title":"支付订单金额","tips":"","value":60511600,"dataType":2,"chainRatio":3771},{"title":"支付订单笔单价","tips":"","value":17882,"dataType":2,"chainRatio":418},{"title":"交易成功金额","tips":"","value":32452900,"dataType":2,"chainRatio":0},{"title":"交易成功笔单价","tips":"","value":18294,"dataType":2,"chainRatio":694}],"submitOrderCnt":{"value":3958,"chainRatio":3171},"submitPaidRate":8550,"paidOrderCnt":{"value":3384,"chainRatio":3219},"paidSuccessRate":5242,"successOrderCnt":{"value":1774,"chainRatio":-648},"submitSuccessRate":4482,"returnOrderCnt":0,"returnReasonList":[{"number":0,"contrastRate":"0","reasonTypeName":"质检不通过"},{"number":0,"contrastRate":"0","reasonTypeName":"鉴定不通过"},{"number":0,"contrastRate":"0","reasonTypeName":"虚假发货"}],"returnOutline":[{"title":"未支付订单数","tips":"","value":574,"dataType":1,"chainRatio":2899},{"title":"未支 付订单金额","tips":"","value":10420000,"dataType":2,"chainRatio":3608},{"title":"未发货取消订单数","tips":"","value":910,"dataType":1,"chainRatio":3725},{"title":"未发货取消订单金额","tips":"","value":15959500,"dataType":2,"chainRatio":3892},{"title":"卖家未履约订单数","tips":"","value":0,"dataType":1,"chainRatio":0},{"title":"卖家未履约订单金额","tips":"","value":0,"dataType":2,"chainRatio":0}],"paidOrderCntTrend":[{"statTime":202245,"value":17471,"dataType":1},{"statTime":202246,"value":21246,"dataType":1},{"statTime":202247,"value":15991,"dataType":1},{"statTime":202248,"value":33409,"dataType":1},{"statTime":202249,"value":19832,"dataType":1},{"statTime":202250,"value":18112,"dataType":1},{"statTime":202251,"value":14225,"dataType":1},{"statTime":202252,"value":11514,"dataType":1},{"statTime":202301,"value":12469,"dataType":1},{"statTime":202302,"value":8488,"dataType":1},{"statTime":202303,"value":2604,"dataType":1},{"statTime":202304,"value":2560,"dataType":1},{"statTime":202305,"value":3384,"dataType":1}],"paidAmountTrend":[{"statTime":202245,"value":326449500,"dataType":2},{"statTime":202246,"value":402394700,"dataType":2},{"statTime":202247,"value":306081100,"dataType":2},{"statTime":202248,"value":666986000,"dataType":2},{"statTime":202249,"value":402780200,"dataType":2},{"statTime":202250,"value":363504000,"dataType":2},{"statTime":202251,"value":290578500,"dataType":2},{"statTime":202252,"value":238319500,"dataType":2},{"statTime":202301,"value":256257900,"dataType":2},{"statTime":202302,"value":179337300,"dataType":2},{"statTime":202303,"value":49506700,"dataType":2},{"statTime":202304,"value":43940200,"dataType":2},{"statTime":202305,"value":60511600,"dataType":2}],"paidAvePriceTrend":[{"statTime":202245,"value":18685,"dataType":2},{"statTime":202246,"value":18940,"dataType":2},{"statTime":202247,"value":19141,"dataType":2},{"statTime":202248,"value":19964,"dataType":2},{"statTime":202249,"value":20310,"dataType":2},{"statTime":202250,"value":20070,"dataType":2},{"statTime":202251,"value":20427,"dataType":2},{"statTime":202252,"value":20698,"dataType":2},{"statTime":202301,"value":20552,"dataType":2},{"statTime":202302,"value":21128,"dataType":2},{"statTime":202303,"value":19012,"dataType":2},{"statTime":202304,"value":17164,"dataType":2},{"statTime":202305,"value":17882,"dataType":2}],"submitPaidRateTrend":[{"statTime":202245,"value":8380,"dataType":3},{"statTime":202246,"value":8351,"dataType":3},{"statTime":202247,"value":8434,"dataType":3},{"statTime":202248,"value":8534,"dataType":3},{"statTime":202249,"value":8433,"dataType":3},{"statTime":202250,"value":8458,"dataType":3},{"statTime":202251,"value":8574,"dataType":3},{"statTime":202252,"value":8593,"dataType":3},{"statTime":202301,"value":8609,"dataType":3},{"statTime":202302,"value":8616,"dataType":3},{"statTime":202303,"value":8217,"dataType":3},{"statTime":202304,"value":8519,"dataType":3},{"statTime":202305,"value":8550,"dataType":3}],"submitSuccessRateTrend":[{"statTime":202245,"value":7500,"dataType":3},{"statTime":202246,"value":7384,"dataType":3},{"statTime":202247,"value":7507,"dataType":3},{"statTime":202248,"value":7350,"dataType":3},{"statTime":202249,"value":7299,"dataType":3},{"statTime":202250,"value":7277,"dataType":3},{"statTime":202251,"value":7506,"dataType":3},{"statTime":202252,"value":7310,"dataType":3},{"statTime":202301,"value":7470,"dataType":3},{"statTime":202302,"value":7518,"dataType":3},{"statTime":202303,"value":6762,"dataType":3},{"statTime":202304,"value":6313,"dataType":3},{"statTime":202305,"value":4482,"dataType":3}]},"status":200}
完美！！！
