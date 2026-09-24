# 用python获取斗鱼直播真实地址的一个思路,另附java代码

> **作者**: huhus123 | **发布时间**: 2020-02-22 10:14:00 | **版块**: 『编程语言区』 | **查看/回复**: 7510 / 20
> **原文**: [https://www.52pojie.cn/thread-1112699-1-1.html](https://www.52pojie.cn/thread-1112699-1-1.html)

---

*本帖最后由 huhus123 于 2020-2-22 10:25 编辑*

首先，斗鱼的真实地址是

[] *纯文本查看*

```
http://tx2play1.douyucdn.cn/live/”+房间号+9位随机字母+".flv"
```

所以问题的关键是如何获得“房间号+9位随机字母”
这个是主播每次开播都会变得。

如何获取呢？
在这里提供一种思路，不需要计算sign

打开斗鱼直播，按F12，随便用鼠标指向一个直播缩略图

![](https://attach.52pojie.cn/forum/202002/22/093944cl7ytyuv7plz6ol6.png)

可以看到一个post请求，查看响应结果有一个json数据，里面有一个key记录了我们想要的东西

![](https://attach.52pojie.cn/forum/202002/22/093947icg0mspzl3mmzg6c.png)

于是，只需要把这个信息过滤出来就可以了
首先构造请求头

![](https://attach.52pojie.cn/forum/202002/22/095333hn1n9wn1z93h1hjy.png)

这三个数据很重要，记得一定要带上，不需要更改不需要重新计算
请求头如下

[Python] *纯文本查看*

```
headers = {
    "Host": "playweb.douyucdn.cn",
    "Referer": "https://www.douyu.com/directory/myFollow",
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML: like Gecko) Chrome/68.0.3440.84 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "rid": "7032776",
    "time": "1582335104602",
    "auth": "55e455300a056206949e12459524e81b",
}
```

现在的url和之前的不太一样的，用原来抓的api

[Python] *纯文本查看*

```
requests.post("http://playweb.douyucdn.cn/lapi/live/hlsH5Preview/11579?rid=11579&did=2dfd02149496030e407b1e3900031501",headers=headers)
```

rid后面的和问号之前的都是你想获取的直播间房间号，前提是这些房间号支持h5preview的功能，如果不支持就会返回不支持。
接着就提取我们要的信息就可以了。
直接上代码吧

[Python] *纯文本查看*

```
import requests

def header():
    headers = {
        "Host": "playweb.douyucdn.cn",
        "Referer": "https://www.douyu.com/directory/myFollow",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML: like Gecko) Chrome/68.0.3440.84 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "rid": "7032776",
        "time": "1582335104602",
        "auth": "55e455300a056206949e12459524e81b",
    }
    return headers

def get_addr(rid):
    ret = requests.post(
        "http://playweb.douyucdn.cn/lapi/live/hlsH5Preview/{}?rid={}&did=2dfd02149496030e407b1e3900031501"
            .format(rid, rid),headers=header())
    try:
        addr = "http://tx2play1.douyucdn.cn/" + ret.json()['data']['rtmp_live'].split("_")[0] + ".flv"
        return addr
    except:
        return ret.json()['msg']

print(get_addr(312212))
```

运行结果

[Asm] *纯文本查看*

```
http://tx2play1.douyucdn.cn/312212rvVNjjBLWk.flv
```

把这个地址添加到potplayer，vlc，video.js等播放器器可以直接播放

写到最后：
       有人说为什么要抓取直播源呢？从我个人的角度来说，我的显示器是带鱼屏，在斗鱼直播看的时候全屏观看支持不是很好，原来的插件也
不能用了，另外就是广告比较多，不喜欢开弹幕，所以不如自己爬取一些直播地址在播放器上看，我自己也写了一个基于vlc的观看斗鱼直播的播放器
直接可以观看，还不是很完善，暂时不放出来了。

再次申明一点，这个方法不是所有直播都支持！还有一个可以获取的方法是通过计算sign获取，这个sign的算法在网页的js里，需要解析js脚本里面的function
后续再讲吧。

忘记说了，之前还用java写了一个gui，输入房间号直接获取。我就不另开贴了

[Java] *纯文本查看*

```
package getLiveInfo;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;

import java.lang.String;

public class GetLiveInfo {

	public static String sendPost(String url, String param){
		OutputStreamWriter out = null;
		BufferedReader reader = null;
		String res = "";
		try {
			URL httpUrl = new URL(url);
			HttpURLConnection conn = (HttpURLConnection) httpUrl.openConnection();
			conn.setRequestProperty("Host", "playweb.douyucdn.cn");
			conn.setRequestProperty("Referer", "https://www.douyu.com/directory/myFollow");
			conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.84 Safari/537.36");
			conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
			conn.setRequestProperty("rid", "这里改成抓包获取的数据和time，auth关联");
			conn.setRequestProperty("time", "同上");
			conn.setRequestProperty("auth", "同上");
			conn.setUseCaches(false);
			conn.setInstanceFollowRedirects(true);
			conn.setDoOutput(true);
			conn.setDoInput(true);
			conn.connect();

			out = new OutputStreamWriter(conn.getOutputStream());
			out.flush();
			reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
			String line;
			while ((line = reader.readLine()) != null) {
				res += line;
			}
			reader.close();
			conn.disconnect();
		}catch (Exception e) {
			System.out.println("发送 POST 请求出现异常！" +e);
			e.printStackTrace();
		}
		finally {
			try {
				if(out!=null) {
					out.close();
				}

				if(reader!= null) {
					reader.close();
				}
			}
			catch(IOException ex) {
				ex.printStackTrace();
			}
		}
		return res;
	}
	public static String main(String roomid){
		String ret = GetLiveInfo.sendPost("http://playweb.douyucdn.cn/lapi/live/hlsH5Preview/"+roomid+"?rid="+roomid+"&did=", "");
		try {
			String[] strarray = ret.split(":")[8].split("_")[0].split("\"");
			ret = "http://tx2play1.douyucdn.cn/"+strarray[1]+".flv";
		}catch(ArrayIndexOutOfBoundsException e) {
			String[] strarray = ret.split(":")[2].split("\"");
			ret = strarray[1];
		}
		return ret;
	}
}
```
