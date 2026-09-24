# LanZouDown蓝奏云文件夹解析软件库后端+APP

> **作者**: 全能小太阳 | **发布时间**: 2022-10-25 14:12:00 | **版块**: 『编程语言区』 | **查看/回复**: 7784 / 14
> **原文**: [https://www.52pojie.cn/thread-1703600-1-1.html](https://www.52pojie.cn/thread-1703600-1-1.html)

---

*本帖最后由 全能小太阳 于 2022-10-25 14:15 编辑*

此贴根据前几天写的蓝奏云文件夹解析制作而成，根据上贴思路，T、K的值是变化的，T是时间戳，于是就把T、K的值存在数据库，下面的是后台添加文件分类填写蓝奏云文件链接的操作：

[Asm] *纯文本查看*

```
//新增软件分类
    public function addsort(Request $request)
    {
        $data = $request->param();
        $validate = Validate::make([
            'classname'  => 'require',
            'classicon' => 'require',
            'classdetail' => 'require',
            'lanzouurl' => 'require',
            'lanzoupwd' => 'require',
        ]);
        if (!$validate->check($data)) {
            return Common::ReturnError($validate->getError());
        }
        $datas=null;
        $curl = curl_init(); // 启动一个CURL会话
        curl_setopt($curl, CURLOPT_URL, $data['lanzouurl']); // 要访问的地址
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0); // 对认证证书来源的检查
        curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36'); // 模拟用户使用的浏览器
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION, 1); // 使用自动跳转
        curl_setopt($curl, CURLOPT_AUTOREFERER, 1); // 自动设置Referer
        curl_setopt($curl, CURLOPT_POST, 1); // 发送一个常规的Post请求
        curl_setopt($curl, CURLOPT_POSTFIELDS, $datas); // Post提交的数据包
        curl_setopt($curl, CURLOPT_TIMEOUT, 30); // 设置超时限制防止死循环
        curl_setopt($curl, CURLOPT_HEADER, 0); // 显示返回的Header区域内容
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1); // 获取的信息以文件流的形式返回
        $tmpInfo = curl_exec($curl); // 执行操作
        if (curl_errno($curl)) {
            echo 'error';//捕抓异常
        }
        curl_close($curl);
        $content=$tmpInfo;
        preg_match("/t':(.*),/U", $content, $qt);
        preg_match("/k':(.*),/U", $content, $qk);
        preg_match("/$qt[1] = '(.*)\'/U", $content, $t);
        preg_match("/$qk[1] = '(.*)\'/U", $content, $k);
        $data['lanzout']=$t[1];
        $data['lanzouk']=$k[1];
        $appclass = Db::name('appclass')->where('classname', $data['classname'])->find();
        if(!$appclass){
            $data['classtime'] = date("Y-m-d H:i:s", time());
            $class = new Acs();
            $db = $class->save($data);
            if ($db > 0) {
                Common::adminLog('添加软件分类:' . $data['classname']);
                return Common::ReturnSuccess("添加成功");
            } else {
                return Common::ReturnError("添加失败");
            }
        }else{
            return Common::ReturnError("分类已存在");
        }
    }
```

以上代码在后台天剑分类时，会自动首次获取蓝奏云文件夹的T、K值存在数据库。

![](https://attach.52pojie.cn/forum/202210/25/140037czo4xotyx7tkkpqk.png)

然后我想的是T、K值不是固定的于是乎就有了，手动更新选项

![](https://attach.52pojie.cn/forum/202210/25/140139qgazfdtmffzxlafd.png)

然后是代码实现：

[Asm] *纯文本查看*

```
public function uplanzou(){
        $id = input('id');
        $apps =  Db::name('appclass')->where('id',$id)->find();
        $datas=null;
        $curl = curl_init(); // 启动一个CURL会话
        curl_setopt($curl, CURLOPT_URL, $apps['lanzouurl']); // 要访问的地址
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0); // 对认证证书来源的检查
        curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36'); // 模拟用户使用的浏览器
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION, 1); // 使用自动跳转
        curl_setopt($curl, CURLOPT_AUTOREFERER, 1); // 自动设置Referer
        curl_setopt($curl, CURLOPT_POST, 1); // 发送一个常规的Post请求
        curl_setopt($curl, CURLOPT_POSTFIELDS, $datas); // Post提交的数据包
        curl_setopt($curl, CURLOPT_TIMEOUT, 30); // 设置超时限制防止死循环
        curl_setopt($curl, CURLOPT_HEADER, 0); // 显示返回的Header区域内容
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1); // 获取的信息以文件流的形式返回
        $tmpInfo = curl_exec($curl); // 执行操作
        if (curl_errno($curl)) {
            echo 'error';//捕抓异常
        }
        curl_close($curl); // 关闭CURL会话
        $content=$tmpInfo;
        preg_match("/t':(.*),/U", $content, $qt);
        preg_match("/k':(.*),/U", $content, $qk);
        preg_match("/$qt[1] = '(.*)\'/U", $content, $t);
        preg_match("/$qk[1] = '(.*)\'/U", $content, $k);
        $data['lanzout']=$t[1];
        $data['lanzouk']=$k[1];
        $db = Acs::where('id', $id)->update($data);
        if ($db > 0) {
            Common::adminLog('更新：'. $apps['classname'].'蓝奏参数成功' );
            return Common::ReturnSuccess("更新成功");
        } else {
            return Common::ReturnError("更新成功");
        }
    }
```

PHP都是自学的，大家理解下，不是很会。

上面实现了更新，但是在开发前端过程中，发现突然无法获取T、K值了，经过排查发现是蓝奏的网页缓存时间是3分钟，三分钟后就会失效，这个问题就只能使用笨办法，于是就有了下面的前端接口：

[Asm] *纯文本查看*

```
//定时更新Tk
    public function UpTk()
    {
        $apkclass=Appclass::select();
        foreach ($apkclass as $k => $class){
            $datas=null;
            $curl = curl_init(); // 启动一个CURL会话
            curl_setopt($curl, CURLOPT_URL, $class['lanzouurl']); // 要访问的地址
            curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0); // 对认证证书来源的检查
            curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36'); // 模拟用户使用的浏览器
            curl_setopt($curl, CURLOPT_FOLLOWLOCATION, 1); // 使用自动跳转
            curl_setopt($curl, CURLOPT_AUTOREFERER, 1); // 自动设置Referer
            curl_setopt($curl, CURLOPT_POST, 1); // 发送一个常规的Post请求
            curl_setopt($curl, CURLOPT_POSTFIELDS, $datas); // Post提交的数据包
            curl_setopt($curl, CURLOPT_TIMEOUT, 30); // 设置超时限制防止死循环
            curl_setopt($curl, CURLOPT_HEADER, 0); // 显示返回的Header区域内容
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1); // 获取的信息以文件流的形式返回
            $tmpInfo = curl_exec($curl); // 执行操作
            if (curl_errno($curl)) {
                echo 'error';//捕抓异常
            }
            curl_close($curl);
            $content=$tmpInfo;
            preg_match("/t':(.*),/U", $content, $qt);
            preg_match("/k':(.*),/U", $content, $qk);
            preg_match("/$qt[1] = '(.*)\'/U", $content, $t);
            preg_match("/$qk[1] = '(.*)\'/U", $content, $k);
            $data['lanzout']=$t[1];
            $data['lanzouk']=$k[1];
            $db = Appclass::where('id', $class['id'])->update($data);
            if ($db > 0) {
                $result[]=$class['classname'].'：Tk更新成功';
            } else {
                $result[]=$class['classname'].'：Tk更新失败';
            }
        }
        return $this->returnSuccess('更新完成',$result);
    }
```

所以可以通过宝塔定时任务实现更新T、K值，然后设置2分钟访问一次就OK，这是这个软件库的麻烦。

为什么会开发这个玩意呢，因为我之前也开源的有，软件库系统，但是需要跟博客一样一个个发布，有人就反馈给我，太过麻烦，刚好这段时间PHP稍微有点进步，可以写出来，也不算是进步吧，我也没有系统学过，也没有网上学过，平常就是改改别人代码，就会了一部分，还请各位大佬手下留情，不要再说什么很简单了，我觉得我分享出来就是不错，也算是学习过程中的交流心得吧。

前端包括：会员、积分系统、在线商城、积分兑换、后台可自定义会员事件和积分事件，提高程序的可二开性质。

前端基于UNI-APP

前端预览：

![](https://attach.52pojie.cn/forum/202210/25/141042jovohqhppthljhho.jpg)

![](https://attach.52pojie.cn/forum/202210/25/141052cvpyq1oxhvtbx0ox.jpg)

![](https://attach.52pojie.cn/forum/202210/25/141100s2epmvzdver42ed4.jpg)

后台安装，请按照Thinkphp的安装方式安装。

前端+后端下载地址：
https://iebp.lanzouv.com/b08c52t4b
密码:58k2
