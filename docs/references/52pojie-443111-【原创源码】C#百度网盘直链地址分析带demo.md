# 【原创源码】C#百度网盘直链地址分析带demo

> **作者**: 明月几时有~ | **发布时间**: 2015-12-07 10:06:00 | **版块**: 『编程语言区』 | **查看/回复**: 13412 / 25
> **原文**: [https://www.52pojie.cn/thread-443111-1-1.html](https://www.52pojie.cn/thread-443111-1-1.html)

---

*本帖最后由 明月几时有~ 于 2015-12-7 19:13 编辑*

之前写网盘搜索器时写的，现在免费开源分享给大家，适合C#新手学习，老鸟就飘过吧~
支持不加密的单文件解析，格式可以如下：
http://pan.baidu.com/s/1bn5Woer
http://yun.baidu.com/s/1bn5Woer
http://pan.baidu.com/share/link?uk=2031761125&shareid=181404
http://pan.baidu.com/share/link?shareid=114640445&uk=352971845&fid=622684349
目前依然有效哦！
此外程序需要用到苏飞的HttpHelper类，可自行百度下载，然后添加到工程中即可！

[C#] *纯文本查看*

```

using System;
using System.Collections.Generic;
using DotNet.Utilities;
using System.Text;
using System.Threading;
using System.Text.RegularExpressions;

namespace yunso
{
    class baiduYun
    {
        /// <summary>
        /// 查找s1和s2之间的字符串
        /// </summary>
        /// <param name="s"></param>
        /// <param name="s1"></param>
        /// <param name="s2"></param>
        /// <returns>string</returns>
        public string Search_string(string s, string s1, string s2)
        {
            int n1, n2;
            n1 = s.IndexOf(s1, 0) + s1.Length;   //开始位置  .
            n2 = s.IndexOf(s2, n1);               //结束位置
            if (n2 - n1 > 0)
                return s.Substring(n1, n2 - n1);   //取搜索的条数，用结束的位置-开始的位置,并返回
            else
                return "";
        }
        //将字节大小转换成B K M G形式的字符串
        public string sizeToB(ulong si)
        {
            string ss = "";
            if (si < 1024)
                ss = si.ToString() + "B";
            else if (si / 1024 < 1024)
            {
                decimal r = (decimal)si / 1024; // (decimal)x/ y 表示把 x 转换成decimal再做除法运算，int 除 int 是会丢失小数点的。
                ss = Math.Round(r, 2, MidpointRounding.AwayFromZero).ToString() + "K";//45.37
            }
            else if (si / 1024 / 1024 < 1024)
            {
                decimal r = (decimal)si / (1024 * 1024);
                int len = 2;
                if (r >= 10) len = 1;
                ss = Math.Round(r, len, MidpointRounding.AwayFromZero).ToString() + "M";//45.37
            }
            else
            {
                decimal r = (decimal)si / (1024 * 1024 * 1024);
                int len = 2;
                if (r >= 10) len = 1;
                ss = Math.Round(r, len, MidpointRounding.AwayFromZero).ToString() + "G";//45.37
            }
            return ss;
        }
        /// <summary>
        /// 时间戳转为C#格式时间 13位
        /// </summary>
        /// <param name=”timeStamp”></param>
        /// <returns></returns>
        private DateTime ConvertStringToDateTime(string timeStamp)
        {
            DateTime dtStart = TimeZone.CurrentTimeZone.ToLocalTime(new DateTime(1970, 1, 1));
            long lTime = long.Parse(timeStamp + "0000");
            TimeSpan toNow = new TimeSpan(lTime);
            return dtStart.Add(toNow);
        }
        public class BDRes
        {
            public bool success;//获取直链是否成功
            public string reason;//失败原因
            public string name;//文件名
            public string size;//大小
            public string dlink;//直链地址
        }
        public BDRes jiexi(string url)
        {
            //string bdcookie = "BAIDUID=46D45EBC40584E57D3DAAE3CB227749A:FG=1";
            BDRes bdr = new BDRes();
            bdr.success = false;
            string murl = url;
            HttpHelper http = new HttpHelper();
            HttpItem item = new HttpItem()
            {
                URL = murl,//URL     必需项
                Cookie = "BAIDUID=897A635A1750FD37B5D90FAC1DC9A76F:FG=1",//字符串Cookie     可选项
                //UserAgent = "Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",//用户的浏览器类型，版本，操作系统     可选项有默认值
                ContentType = "text/html",//返回类型    可选项有默认值
                ResultType = ResultType.String,
                Timeout=5000
            };
            HttpResult result = http.GetHtml(item);
            string html = result.Html;
            //string cookie = result.Cookie;
            string cookie = "BAIDUID=897A635A1750FD37B5D90FAC1DC9A76F:FG=1";
            if (html.Contains("网盘-链接不存在"))
            {
                bdr.reason = "此链接分享内容可能因为涉及侵权、色情、反动、低俗等信息，无法访问!";
            }
            else if (html.Contains("fs_id\":"))
            {
                //string jsons = Search_string(html, "list=JSON.parse(", ";</script>");
                string isdir = Search_string(html, "\"isdir\":", ",");
                if (isdir == "1")
                {
                    bdr.reason = "目前暂不支持对文件夹的解析！";
                    return bdr;
                }
                string fs_id = Search_string(html, "fs_id\":", ",");
                string uk = Search_string(html, "yunData.SHARE_UK = \"", "\"");
                string shareid = Search_string(html, "\"shareid\":", ",");
                string sign = Search_string(html, "sign\":\"", "\"");
                string timestamp = Search_string(html, "\"timestamp\":", ",");
                string durl = "http://pan.baidu.com/api/sharedownload?sign=" + sign + "×tamp=" + timestamp + "&bdstoken=&channel=chunlei&clienttype=0&web=1&app_id=250528";
                string postdata = "encrypt=0&fid_list=" + System.Web.HttpUtility.UrlEncode("[" + fs_id + "]") + "&primaryid=" + shareid + "&product=share&uk=" + uk;
                item = new HttpItem()
                {
                    URL = durl,
                    Method = "post",
                    Postdata = postdata,
                    Referer = murl,//一定要有Referer
                    ContentType = "application/x-www-form-urlencoded; charset=UTF-8",
                    Accept = "*/*",
                    Cookie = cookie,
                    Timeout=5000
                };
                item.Header.Add("X-Requested-With", "XMLHttpRequest");
                string jsons = http.GetHtml(item).Html;//error=-20说明该链接需要验证码了
                if (jsons.Contains("{\"errno\":0"))//成功的
                {
                    bdr.success = true;
                    string name = Regex.Unescape(Search_string(jsons, "server_filename\":\"", "\""));
                    string size = Search_string(jsons, "\"size\":", ",");
                    size = sizeToB(Convert.ToUInt64(size));
                    string dlink = Search_string(jsons, "\"dlink\":\"", "\"").Replace("\\/", "/");
                    item.URL = dlink;
                    //item.Allowautoredirect = true;
                    item.Referer = url;
                    item.Cookie = "pcsett=1446202103-546d49b7c4a9feba01341b8eddcc7379";
                    item.Timeout = 3000;//3秒
                    HttpResult res = http.GetHtml(item);
                    string hh = res.Html;
                    if (hh.Contains("{\"error_code\":302"))
                    {
                        dlink = res.Header["Location"];
                    }
                    bdr.name = name;
                    bdr.size = size;
                    bdr.dlink = dlink;
                }
                else
                {
                    bdr.reason = jsons;
                }
            }
            else
            {
                bdr.reason = html;
            }
            return bdr;
        }
    }
}
```

调用方法

[C#] *纯文本查看*

```

string url="http://pan.baidu.com/s/1bn5Woer";
baiduYun bdy = new baiduYun();
baiduYun.BDRes res = new baiduYun.BDRes();
res = bdy.jiexi(url);
if (res.success)
{
    Trace.WriteLine("解析成功！");
    Trace.WriteLine("文件名：" + res.name);
    Trace.WriteLine("大小：" + res.size);
    Trace.WriteLine("直链地址：" + res.dlink);
}
else
{
    Trace.WriteLine("直链获取失败，错误如下：");
    Trace.WriteLine(res.reason);
}
```

好吧，就这样，如果有什么问题或者好的改进，欢迎留言！
**最后，觉得有所帮助的话，别忘了评分！！！**
**-----2015-12-07 18:43 更新-------**
根据版主的要求，同时也为了新手学习，我又花了点时间编写了个demo程序，demo程序自带HttpHelper类，下载后直接编译即可运行，截图如下：

![](https://attach.52pojie.cn/forum/201512/07/184703jxgtwtf3tvh2hzwh.jpg)

关于收费，HttpHelper类一直都是免费开源的，至于那个什么万能框架才收费，而且我用HttpHelper类时作者还没有推出收费版的，我用HttpHelper类纯粹是时间久了，用习惯了，而且对我而言，HttpHelper也足够用了。当然如果你喜欢HttpCode或其他的开源类，稍微修改下就可以了，思路是关键，跟用什么类没有关系

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[demo.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=NTcxMzY1fDgyZDY3Zjg2fDE3OTAyMzAzMDl8MjMyMzcyN3w0NDMxMTE%3D)
*(61.15 KB, 下载次数: 185)*
