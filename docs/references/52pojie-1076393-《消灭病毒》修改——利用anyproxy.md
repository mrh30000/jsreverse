# 《消灭病毒》修改——利用anyproxy

> **作者**: wjmtgg | **发布时间**: 2019-12-19 11:12:00 | **版块**: 『移动安全区』 | **查看/回复**: 11054 / 24
> **原文**: [https://www.52pojie.cn/thread-1076393-1-1.html](https://www.52pojie.cn/thread-1076393-1-1.html)

---

*本帖最后由 wjmtgg 于 2019-12-19 12:12 编辑*

消灭病毒利用openid修改方法虽然方便简单
但是要抓包获取openid 和[破解](https://www.52pojie.cn)获取sign 比较麻烦
我这个方法自己用 很方便
这个方法同样适用于动物餐厅，之后会发教程
-------------------------------------------------------------------------------------------------
抓包发现服务器返回的数据里并没有sign验证
于是可以改返回的数据
利用这个思路
python里有mixproxy nodejs里可以用anyproxy
由于我的mixproxy证书一直有问题  就用anyproxy了
--------------------------------------------------------------------------------------------------
首先安装nodejs   然后npm install anyproxy
然后anyproxy --ca 生成证书   在手机端安装证书就可以了
我将修改内容放到简单web端了  这样修改比较方便
把下面代码保存成一个1.js文件   直接node 1.js就可以运行了
-------------------------------------------------------------------------------------------------
使用方法：
1、手机端和电脑端一个wifi。手机或pad都可以。
2、手机端设置代{过}{滤}理，在wifi连接那块手动设置代{过}{滤}理，设置成你电脑端ip，用cmd->ipconfig查看，端口选择8001。
3、电脑端运行1.js，打开127.0.0.1:8003 可以看到设置端的web，一个简单的界面，设置自己的参数。
4、手机端打开微信，在小程序里把消灭病毒先移除，然后搜索消灭病毒再打开。
5、这时候修改已经成功了的，把代{过}{滤}理关掉就好了。

------------------------------------------------------------------------------------------------
直接上代码（代码很乱哈哈哈）：

var http = require('http');
var querystring = require('querystring');
const AnyProxy = require('anyproxy');
var gq, zs, jb, tl, zss, zwl, fhl, fqd, jbjz, rcsy;
var postHTML =
    '<html><head><meta charset="utf-8"><title>消灭病毒修改</title></head>' +
    '<body>' +
    '<form method="post">' +
    '关卡:<input name="gq"><br>' +
    '钻石(最好99999):<input name="zs"><br>' +
    '金币:<input name="jb"><br>' +
    '体力:<input name="tl"><br>' +
    '主武器射速(最高360):<input name="zss"><br>' +
    '主武器威力(最高2020):<input name="zwl"><br>' +
    '副武器火力(最高36):<input name="fhl"><br>' +
    '副武器强度(最高2020):<input name="fqd"><br>' +
    '金币价值(最高2020):<input name="jbjz"><br>' +
    '日常收益(最高2020):<input name="rcsy"><br>' +
    '不修改填-1       不能有空<br>' +
    '<input type="submit">' +
    '</form>' +
    '</body></html>';
http.createServer(function (req, res) {
    var body = "";
    console.log(req.url);
    req.on('data', function (chunk) {
        body += chunk;
        //console.log("chunk:",chunk);
    });
    req.on('end', function () {
        body = querystring.parse(body);
        console.log("body:", body);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
        if (body.gq) {
            gq = parseInt(body.gq);
        }
        if (body.zs) {
            zs = parseInt(body.zs)
        };
        if (body.jb) {
            jb = body.jb;
        };
        if (body.tl) {
            tl = parseInt(body.tl)
        };
        if (body.zss) {
            zss = parseInt(body.zss)
        };
        if (body.zwl) {
            zwl = parseInt(body.zwl)
        };
        if (body.fhl) {
            fhl = parseInt(body.fhl)
        };
        if (body.fqd) {
            fqd = parseInt(body.fqd)
        };
        if (body.jbjz) {
            jbjz = parseInt(body.jbjz)
        };
        if (body.rcsy) {
            rcsy = parseInt(body.rcsy)
        };
        console.log(gq, zs, jb, tl, zss, zwl, fhl, fqd, jbjz, rcsy);
        if (body.gq && body.zs && body.jb && body.tl && body.zss && body.zwl && body.fhl && body.fqd && body.jbjz && body.rcsy) { res.write('修改成功！') } else { res.write(postHTML); };
        res.end();
    });
}).listen(8003);

const options = {
    port: 8001,
    rule: {
        summary: 'Rule to modify request data',
        \* beforeSendResponse(requestDetail, responseDetail) {
            if ((requestDetail.url.indexOf('api/archive/get') != -1) && (requestDetail.url.indexOf('api/archive/get\_id') == -1)) {
                var newResponse = Object.assign({}, responseDetail.response);
                var zzqstr = newResponse.body.toString();
                var zzq = JSON.parse(zzqstr);
                var mm = JSON.parse(zzq.data.record);
                if (jb != -1) {
                    mm.money = jb;
                };
                if (gq != -1) {
                    mm.level = gq;
                };
                if (zs != -1) {
                    mm.zuanShi = zs;
                };
                if (tl != -1) {
                    mm.tiLi = tl;
                }
                if (zss != -1) {
                    mm.lCount = zss;
                }
                if (zwl != -1) {
                    mm.lDamage = zwl;
                }
                if (fhl != -1) {
                    mm.levelFuCount = [fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl, fhl];
                }
                if (fqd != -1) {
                    mm.levelFuDamage = [fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd, fqd];
                }
                if (jbjz != -1) {
                    mm.lJiaZhi = jbjz;
                }
                if (rcsy != -1) {
                    mm.lRiChang = rcsy;
                }
                console.log(mm);
                zzq.data.record = JSON.stringify(mm);
                newResponse.body = JSON.stringify(zzq);
                return {
                    response: newResponse
                };
            }
        }
    },
    webInterface: {
        enable: true,
        webPort: 8002
    },
    throttle: 10000,
    forceProxyHttps: true,
    wsIntercept: false,
    silent: false
};
const proxyServer = new AnyProxy.ProxyServer(options);
proxyServer.start();

---------------------------------------------------------
