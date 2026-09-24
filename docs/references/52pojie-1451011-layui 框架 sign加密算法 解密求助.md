# layui 框架 sign加密算法 解密求助

> **作者**: zhairy | **发布时间**: 2021-06-01 03:12:00 | **版块**: 『悬赏问答区』 | **查看/回复**: 2301 / 4
> **原文**: [https://www.52pojie.cn/thread-1451011-1-1.html](https://www.52pojie.cn/thread-1451011-1-1.html)

---

*本帖最后由 zhairy 于 2021-6-1 03:20 编辑*

本人在学习post 填表，遇到一个完整
这个网站 每次post 需要提交sign 和windowno

然后分析到 是在下面代码中加密的

var jsonSort = function (jsonObj) {
var arr = [];
for (var key in jsonObj) {
arr.push(key)
}
arr.sort();
var str = '';
for (var i in arr) {
var arr\_type = typeof jsonObj[arr[i]];
if(jsonObj[arr[i]] == null || jsonObj[arr[i]] === undefined) jsonObj[arr[i]] = '';

```
    if (jsonObj[arr[i]] && (arr_type === 'object' || arr_type === 'array') )
        str += arr[i] + "=[" + this.jsonSort(jsonObj[arr[i]]) + ']';
    else
        str += arr[i] + "=" + jsonObj[arr[i]];
}
return str.replace(/[^a-zA-Z0-9]/ig,"");
```

};
var webInit = (function ($) {
//p,g 为算法固定值，需要前后端同时进行更改
var g = "2";
var p = "1060250871334882992391293512479216326438167258746469805890028339770628303789813787064911279666129";
var bigIntObj = window.BigInt;
var big\_a = bigIntObj.randBigInt(100);
var big\_p = bigIntObj.str2bigInt(p, 10, 0);
var big\_g = bigIntObj.str2bigInt(g, 10, 0);
var A = bigIntObj.powMod(big\_g, big\_a, big\_p);
var str\_A = bigIntObj.bigInt2str(A, 10);
var B;
var secret;
var timestamp = (new Date()).getTime();
var windowNo = md5(timestamp);
layui.setter.windowNo = windowNo;
var webhost = window.location.protocol + '//' + window.location.host;
//axios响应拦截器
layui.jquery.ajax({
url: layui.setter.preurl + '/index.php/bas/Sign/server',
data: {A: str\_A, windowNo: windowNo},
type: 'POST',
async: false,
success: function (res) {
B = bigIntObj.str2bigInt(res.B, 10, 0);
secret = bigIntObj.powMod(B, big\_a, big\_p);
secret = bigIntObj.bigInt2str(secret, 10);
secret +=  ',';
layui.setter.secret = secret;   //设置全局secret，用于部分特殊加密
//axios前置钩子
axios.interceptors.request.use(function (config) {
if(!layui.setter.secret) return window.location.reload();
// 在发送请求之前做些什么
config.data.windowNo = layui.setter.windowNo;
if(layui.router().path && layui.router().path.length > 0) config.data.path = layui.router().path || [];

```
            if (config.data['sign']) delete config.data['sign'];

            var sign = md5(layui.setter.secret + jsonSort(config.data) + layui.setter.secret);

            config.data.sign = sign;//设置前面
            if (config.url.indexOf("http") === -1) config.url = layui.setter.preurl + config.url;//设置请求前缀
            return config;
        }, function (error) {
            // 对请求错误做些什么
            return Promise.reject(error);
        });

        //添加响应拦截器
        axios.interceptors.response.use(function (response) {
            // 对响应数据做点什么
            if (response.data.code === -99) {
                location.hash = layui.setter.loginUrl;
                return false;
            } else if (response.data.code === -100) {
                layer.open({
                    title: '提示'
                    , btn: ['刷新']
                    , content: response.data.msg || '登录超时，请刷新页面'
                    , yes: function (index, layero) {
                        window.location.reload();
                    }
                });
                return false;
            } else if(response.data.code === -98) {
                layer.msg(response.data.msg);
            } else if (response.code === -999) {
                window.location.reload();
                return false;
            }
            return response;
        }, function (error) {
            // 对响应错误做点什么
            layer.closeAll();
            layer.msg('服务繁忙，请稍后再试', {icon: 6}, function () {

            });
            //location.hash=layui.setter.loginUrl;
            return Promise.reject(error);
        });
        //ajax前置
        layui.$.ajaxSetup({
            processData: false,
            beforeSend(xhr, options) {
                if(!layui.setter.secret) return window.location.reload();
                //过滤上传文件情况
                var data = options.data;
                if (options.data && options.data.toString() != '[object FormData]') {
                    if (data['sign']) delete data['sign'];

                    data.windowNo = layui.setter.windowNo;

                    if(layui.router().path && layui.router().path.length > 0) data.path = layui.router().path;

                    var sign = md5(layui.setter.secret + jsonSort(data) + layui.setter.secret);

                    options.data = layui.$.param(data) + '&sign=' + sign;
                }
            }
        });

        layui.$(document).ajaxSuccess(function (event, xhr) {
            //console.log('ajaxSuccess',xhr)
            var response = xhr.responseJSON || {};//eval("("+xhr.responseText+")");
            if (response.code === -99) {
                location.href = webhost + '/yutang/index.html#/system/login';
                return false;
            }
            if (response.code === -999) {
                window.location.reload();
                return false;
            }
            if (response.code === -98) {
                layer.msg(response.msg);
            }
            if (response.code === -100) {
                layer.open({
                    title: '提示'
                    , btn: ['刷新']
                    , content: response.msg || '登录超时，请刷新页面'
                    , yes: function (index, layero) {
                        window.location.reload();
                    }
                });
            }
        });
    }
});
```

});

这个加密中windowNo 加密我是看的懂的 是 时间戳的md5加密
sign的MD5加密 我就有点看不懂了，好像意思是  layui框架的 全局设置的加密 再取jsonSort这段开头代码的 时间戳 进行加密 是不是这个意思！

求大佬们帮忙解答下谢谢!

额。。附上  layui.ayui.setter.secret 在网页中的值 503348477858381041010094378840404146003786441025933885739161688526580733508877303719791937365649

jsonSort(config.data)的值：filteriaddordermode0ishopidsearchpath0job1desktopJobwindowNofff678e822bb2a2679d261889b5c6831
jsonSort(data)的值是 ：biqoqianqrcode2524cardhome2824jiangquan1424tkorderbig8wangwang524wangwangall1524wwtags824
sign的值 ：[color=var(--css-string)  !important]455506192a44c42063422e4d3e5819ca"
