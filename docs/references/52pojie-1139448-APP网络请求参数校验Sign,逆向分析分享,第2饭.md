# APP网络请求参数校验Sign,逆向分析分享,第2饭

> **作者**: wxyzyou | **发布时间**: 2020-03-24 16:17:00 | **版块**: 『移动安全区』 | **查看/回复**: 6783 / 9
> **原文**: [https://www.52pojie.cn/thread-1139448-1-1.html](https://www.52pojie.cn/thread-1139448-1-1.html)

---

*本帖最后由 wxyzyou 于 2020-3-24 16:17 编辑*

第2个下饭的操作来了
本次APP post参数验签校验Sign逆向分析
老规矩,仅分享逆向分析过程,关键代码都有,还有截图,就不发APP了

APP的每次网络请求都带有Sign参数校验值
Fiddler抓到的包文

![](https://attach.52pojie.cn/forum/202003/24/151950xnoo39sd0m7okz2d.jpg)

老规矩使用ApkToolAid,对APP进行查壳,反编译
查到结果,未加壳,反编译正常,分析文件结构,正常的安卓APP (并非第1饭的ReactNative+NodeJS结构)

![](https://attach.52pojie.cn/forum/202003/24/152314rrnmwwdisdtbyvts.jpg)

用ApkToolAid再次生成app的jar包,方便我们使用 jd-gui 工具,查看JAVA明文代码 (反编译的文件是dex类型,需要再次转为jar查看)
第1饭里有人求 ApkToolAid工具,该工具在吾爱的爱盘里,自行下载

![](https://attach.52pojie.cn/forum/202003/24/161737jwbvbw7vc47cyc73.jpg)

在jar包里搜索全局对象里的关键字 post的参数名 sign pwd  mobile 随便一个,会定位到多个结果,对比结果找到目标 onLoginClick 函数
在代码中可以看出函数添加了mobile和pwd参数,唯独没有 sign
经过代码分析,sign是在EcpGenerateSign类里的build函数内生成
pwd密码是123456
在onLoginClick函数内可以看到 pwd是把密码123456转为MD5值了

![](https://attach.52pojie.cn/forum/202003/24/153058wjstt0fs070trbls.jpg)

![](https://attach.52pojie.cn/forum/202003/24/153101n6zigr9gbsksz2d6.jpg)

在build函数内可以看到关键的一行代码
String str = ParamsSortUtils.formatUrlMap(this.paramMap, false, false);
把传递来的参数,通过ParamsSortUtils类的 formatUrlMap 函数,做了处理,返回给 str
然后 str+v2020global 生成MD5,就是Sign了
所以这个str的生成很重要
查看 formatUrlMap函数,可以看到是吧参数名和参数值做了一个拼接返回
拼接模式 从onLoginClick函数可以看到先传入了mobile,后传入pwd
所以从代码上的拼接方式,拼接的最终结果是
mobile=14709236399&pwd=e10adc3949ba59abbe56e057f20f883e
赋值给str
然后 str+v2020global
最终结果
mobile=14709236399&pwd=e10adc3949ba59abbe56e057f20f883ev2020global
再次把结果生成MD5,就是Sign了

在下面的代码里,加入了分析结果和注释

![](https://attach.52pojie.cn/forum/202003/24/153103ain9rwo4nasln9na.jpg)

[Java] *纯文本查看*

```
package com.globalspot.mall.http.base;

import com.globalspot.mall.activity.person.UserInfo;
import com.globalspot.mall.activity.person.UserInfo.UserInfoBean;
import com.globalspot.mall.http.rest.EmptyUtils;
import com.globalspot.mall.utils.Logger;
import com.globalspot.mall.utils.MD5Util;
import com.globalspot.mall.utils.ParamsSortUtils;
import com.globalspot.mall.utils.UserInfoHelper;
import com.google.gson.Gson;
import java.util.HashMap;
import java.util.Map;
import okhttp3.MediaType;
import okhttp3.RequestBody;

public class EcpGenerateSign
{
  private static ReqBodyBuilder builder;
  private static UserInfo user;

  public static ReqBodyBuilder put()
  {
    if (builder == null) {
      builder = new ReqBodyBuilder();
    }
    return builder;
  }

  public static ReqBodyBuilder put(String paramString, Object paramObject)
  {
    if (builder == null) {
      builder = new ReqBodyBuilder();
    }
    builder.put(paramString, paramObject);
    return builder;
  }

  public static class ReqBodyBuilder
  {
    private Map<String, Object> paramMap = new HashMap();

    public RequestBody build()
    {
      EcpGenerateSign.access$002(UserInfoHelper.getInstance().getUser());
      HashMap localHashMap = new HashMap();
      System.currentTimeMillis();
//判断是否已经登录,已登录就在参数里加入token和userSn参数
      if (UserInfoHelper.getInstance().isLogined())
      {
        Map localMap = this.paramMap;
        localObject = EcpGenerateSign.user.getToken();
        str = "";
        if (localObject == null) {
          localObject = "";
        } else {
          localObject = EcpGenerateSign.user.getToken();
        }
        localMap.put("token", localObject);
        localMap = this.paramMap;
        localObject = new StringBuilder();
        ((StringBuilder)localObject).append(EcpGenerateSign.user.getUserInfo().getUserSn());
        ((StringBuilder)localObject).append("");
        if (((StringBuilder)localObject).toString() == null) {
          localObject = str;
        } else {
          localObject = EcpGenerateSign.user.getUserInfo().getUserSn();
        }
        localMap.put("userSn", localObject);
      }
//关键代码
//对参数集合 this.paramMap 做处理返回给 str
      String str = ParamsSortUtils.formatUrlMap(this.paramMap, false, false);
      Object localObject = new StringBuilder();
//处理后的str 拼接
      ((StringBuilder)localObject).append(str);
//拼接 v2020global
      ((StringBuilder)localObject).append("v2020global");
//把拼接结果生成MD5,赋值给sign
      localObject = MD5Util.lowerCaseMD5(((StringBuilder)localObject).toString());
      this.paramMap.put("sign", localObject);

      localHashMap.putAll(this.paramMap);
      this.paramMap.clear();
      localObject = new StringBuilder();
      ((StringBuilder)localObject).append("参数 : ");
      ((StringBuilder)localObject).append(new Gson().toJson(localHashMap));
      Logger.eLong(((StringBuilder)localObject).toString());
      return RequestBody.create(MediaType.parse("application/json; charset=utf-8"), new Gson().toJson(localHashMap));
    }

    public ReqBodyBuilder put(String paramString, Object paramObject)
    {
      if (EmptyUtils.isEmpty(paramString)) {
        return this;
      }
      Object localObject = paramObject;
      if (EmptyUtils.isEmpty(paramObject)) {
        localObject = "";
      }
      this.paramMap.put(paramString, localObject);
      return this;
    }
  }
}
```

ParamsSortUtils类的 formatUrlMap函数

[Java] *纯文本查看*

```
public static String formatUrlMap(Map<String, Object> paramMap, boolean paramBoolean1, boolean paramBoolean2)
  {
    try
    {
      Object localObject = new java/util/ArrayList;
      ((ArrayList)localObject).<init>(paramMap.entrySet());
      paramMap = new com/globalspot/mall/utils/ParamsSortUtils$1;
      paramMap.<init>();
      Collections.sort((List)localObject, paramMap);
      StringBuilder localStringBuilder = new java/lang/StringBuilder;
      localStringBuilder.<init>();
      Iterator localIterator = ((List)localObject).iterator();

      while (localIterator.hasNext())
      {
//循环获取每个参数键名和键值 的map集合
        paramMap = (Map.Entry)localIterator.next();
        if (EmptyUtils.isNotBlank((String)paramMap.getKey()))
        {
//获取键名 案例 mobile
          String str = (String)paramMap.getKey();
//获取键值 案例 14709236399
          localObject = String.valueOf(paramMap.getValue());
          paramMap = (Map<String, Object>)localObject;
//判断参数2是否true
//true 对参键值进行URL编码
//这里是POST和GET类型参数的区别对待
//我们当前分析的模式为POST,调用函数时,参数2和3都是false,不做处理
          if (paramBoolean1) {
            paramMap = URLEncoder.encode((String)localObject, "utf-8").replace("+", "%20").replace("%3A", ":");
          }
//参数3为true时,把键名转为小写
          if (paramBoolean2)
          {
            localObject = new java/lang/StringBuilder;
            ((StringBuilder)localObject).<init>();
//参数名转为小写
            ((StringBuilder)localObject).append(str.toLowerCase());
            ((StringBuilder)localObject).append("=");
            ((StringBuilder)localObject).append(paramMap);
            localStringBuilder.append(((StringBuilder)localObject).toString());
          }
          else
          {
// false,不做参数名转小写处理
//拼接键名和键值,中间加个=号  mobile=14709236399
            localObject = new java/lang/StringBuilder;
            ((StringBuilder)localObject).<init>();
            ((StringBuilder)localObject).append(str);
            ((StringBuilder)localObject).append("=");
            ((StringBuilder)localObject).append(paramMap);
            localStringBuilder.append(((StringBuilder)localObject).toString());
          }
//在拼接结果尾部拼接 & 案例 mobile=14709236399&
          localStringBuilder.append("&");
        }
      }
//把整个参数map拼接完的结果,赋值给localObject
//案例 mobile=14709236399&pwd=e10adc3949ba59abbe56e057f20f883e&
      localObject = localStringBuilder.toString();
      paramMap = (Map<String, Object>)localObject;
//判断 localObject 不为空字符串
      if (!((String)localObject).isEmpty()) {
//删除掉尾部最后1个字符,也就是多拼接的1个 &
//案例 mobile=14709236399&pwd=e10adc3949ba59abbe56e057f20f883e
        paramMap = ((String)localObject).substring(0, ((String)localObject).length() - 1);
      }
      return paramMap;
    }
    catch (Exception paramMap) {}
    return null;
  }
```
