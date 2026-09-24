# PHP+js本地化哔哩哔哩直播间弹幕礼物获取

> **作者**: zhshazi523 | **发布时间**: 2022-05-05 17:57:00 | **版块**: 『编程语言区』 | **查看/回复**: 4024 / 9
> **原文**: [https://www.52pojie.cn/thread-1631899-1-1.html](https://www.52pojie.cn/thread-1631899-1-1.html)

---

起初这个本来是要做接口用的，后来发现unity那边有开源的，就发出来吧。web版本的。一个读取直播间信息，一个展示
写的比较乱。
![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[哔哩哔哩直播间弹幕礼物.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjUxOTgwMXw5MzBlNTVkOHwxNzkwMTc5NTc2fDIzMjM3Mjd8MTYzMTg5OQ%3D%3D)
*(51.53 KB, 下载次数: 40)*

[JavaScript] *纯文本查看*

```
<?php
$id =$_REQUEST['id'];
$arr =roomid($_REQUEST['id']);
$room = $arr['data']['room_id'];//直播间id
$roomuid = $arr['data']['uid'];
$token = room($id)['data']['token'];//直播间token
$file_path = 'json/'.$id."_xiaorui.json";
if(!file_exists($file_path)){
file_put_contents($file_path,'{}');
}
if(file_exists($file_path)){
$str = file_get_contents($file_path);//将整个&#12098;件内容读&#12042;到&#12032;个字符串中
$str = str_replace("\r\n","",$str);
}
function curl($url){//获取方法

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $output = curl_exec($ch);
        curl_close($ch);
        $output = json_decode($output,true);
        return $output;
}
function roomid($id){//真实房间id
    //$roomid = curl("https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=$id");
    $ok = 0;
    do{
    $roomid = curl("https://api.live.bilibili.com/room/v1/Room/room_init?id=$id");
    if(isset($roomid)){$ok=1;}
    }while($ok==0);
    return $roomid;
}
function room($id){
    $ok = 0;
    do{
    $room = curl("https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?id=$id");
    if(isset($room)){$ok=1;}
    }while($ok==0);
    return $room;

}
?>
<script type="text/javascript" src="js/jquery-1.9.0.min.js"></script>
<script type="text/javascript" src="js/pako.min.js"></script>
<script>
    var ws = new WebSocket("ws://broadcastlv.chat.bilibili.com:2244/sub");//这里如果失效了 就要去token那个模块里面取拿webket的地址和端口 拼接ws和sub
    var room_id = <?php echo $room;?>;//上面获取到的room_id
    var uid =<?php echo $roomuid;?>;
    var token = "<?php echo $token;?>";
    var json = {
    "uid": uid,
    "roomid": room_id, //上面获取到的room_id
    "protover": 1,
    "platform": "web",
   // "clientver": "1.4.0",
    "token": token,
}

//组合认证数据包
function getCertification(json) {
    var bytes = str2bytes(json);  //字符串转bytes
    var n1 = new ArrayBuffer(bytes.length + 16)
    var i = new DataView(n1);
    i.setUint32(0, bytes.length + 16), //封包总大小
        i.setUint16(4, 16), //头部长度
        i.setUint16(6, 1), //协议版本
        i.setUint32(8, 7),  //操作码 7表示认证并加入房间
        i.setUint32(12, 1); //就1
    for (var r = 0; r < bytes.length; r++){
        i.setUint8(16 + r, bytes[r]); //把要认证的数据添加进去
    }
    return i; //返回
}

//字符串转bytes //这个方法是从网上找的QAQ
function str2bytes(str) {
    const bytes = []
    let c
    const len = str.length
    for (let i = 0; i < len; i++) {
        c = str.charCodeAt(i)
        if (c >= 0x010000 && c <= 0x10FFFF) {
            bytes.push(((c >> 18) & 0x07) | 0xF0)
            bytes.push(((c >> 12) & 0x3F) | 0x80)
            bytes.push(((c >> 6) & 0x3F) | 0x80)
            bytes.push((c & 0x3F) | 0x80)
        } else if (c >= 0x000800 && c <= 0x00FFFF) {
            bytes.push(((c >> 12) & 0x0F) | 0xE0)
            bytes.push(((c >> 6) & 0x3F) | 0x80)
            bytes.push((c & 0x3F) | 0x80)
        } else if (c >= 0x000080 && c <= 0x0007FF) {
            bytes.push(((c >> 6) & 0x1F) | 0xC0)
            bytes.push((c & 0x3F) | 0x80)
        } else {
            bytes.push(c & 0xFF)
        }
    }
    return bytes
}
ws.onclose = function () {
    console.log("连接已关闭");
    document.write("连接已关闭请刷新");
};
// WebSocket连接成功回调
ws.onopen = function () {
    console.log("WebSocket 已连接上");
    document.write("已连接");
    //组合认证数据包 并发送
    ws.send(getCertification(JSON.stringify(json)).buffer);
    //心跳包的定时器
    timer = setInterval(function () { //定时器 注意声明timer变量
        var n1 = new ArrayBuffer(16)
        var i = new DataView(n1);
            i.setUint32(0, 0),  //封包总大小
            i.setUint16(4, 16), //头部长度
            i.setUint16(6, 1), //协议版本
            i.setUint32(8, 2),  // 操作码 2 心跳包
            i.setUint32(12, 1); //就1
        ws.send(i.buffer); //发送
    }, 30000)   //30秒
};

// WebSocket连接关闭回调
ws.onclose = function () {
    console.log("连接已关闭");
     //要在连接关闭的时候停止 心跳包的 定时器
    if (timer != null)
        clearInterval(timer);
};
 //WebSocket接收数据回调
ws.onmessage = function (evt) {
    var blob = evt.data;

    console.log(blob);
    //对数据进行解码 decode方法
    decode(blob, function (packet) {
        //解码成功回调
        if (packet.op == 5) {
            //会同时有多个 数发过来 所以要循环
            var list = JSON.parse(fileopen("<?php echo $file_path;?>"));
            console.log(list);
            // if(list == '[]'){
            //     var list =[];
            // }
            for (let i = 0; i < packet.body.length; i++) {
                var element = packet.body[i];
                //做一下简单的打印
                console.log(element);//数据格式从打印中就可以分析出来啦

                //cmd = DANMU_MSG 是弹幕
                if (element.cmd == "DANMU_MSG") {
                    var uid = element.info[2][0];
                    var user = element.info[2][1];
                    var text = element.info[1];
                    var arr = {type:1,uid:uid,user:user,text:text};
                        list.push(arr);
                    //var arr = JSON.stringify(arr);
                    postcurl("<?php echo $file_path;?>",JSON.stringify(list))
                    console.log(JSON.stringify(list));
                    //console.log(arr);
                    console.log("uid: " + element.info[2][0]
                        + " 用户: " + element.info[2][1]
                        + " \n内容: " + element.info[1]);

                }
                //cmd = INTERACT_WORD 有人进入直播了
                else if (element.cmd == "INTERACT_WORD") {
                    console.log("进入直播: " + element.data.uname);
                }
                //还有其他的
            }

        }
    });
};

// 文本解码器
var textDecoder = new TextDecoder('utf-8');
// 从buffer中读取int
const readInt = function (buffer, start, len) {
    let result = 0
    for (let i = len - 1; i >= 0; i--) {
        result += Math.pow(256, len - i - 1) * buffer[start + i]
    }
    return result
}

function fileopen(roomid){

     $.ajax({
                   type:'POST',
                   url:'ajax_xiaorui.php?type=open',
                   data:{roomid:roomid},
                   //dataType:'json',
                   async:false,    //同步
                   success:function(data){
                       result = data;
                      // console.log(result);
                   }
              // });

           });
    return result;
}
function postcurl(roomid,listarr){
    $.post("ajax_xiaorui.php",
    {
      roomid:roomid,
      listarr:listarr
    },
    function(data,status){
      //无需回执，默认肯定成功
    });

}
/**
* blob blob数据
* call 回调 解析数据会通过回调返回数据
*/
function decode(blob, call) {
    let reader = new FileReader();
    reader.onload = function (e) {
        let buffer = new Uint8Array(e.target.result)
        let result = {}
        result.packetLen = readInt(buffer, 0, 4)
        result.headerLen = readInt(buffer, 4, 2)
        result.ver = readInt(buffer, 6, 2)
        result.op = readInt(buffer, 8, 4)
        result.seq = readInt(buffer, 12, 4)
        if (result.op == 5) {
            result.body = []
            let offset = 0;
            while (offset < buffer.length) {
                let packetLen = readInt(buffer, offset + 0, 4)
                let headerLen = 16// readInt(buffer,offset + 4,4)
                let data = buffer.slice(offset + headerLen, offset + packetLen);

                let body = "{}"
                if (result.ver == 2) {
                    //协议版本为 2 时  数据有进行压缩 通过pako.js 进行解压
                    body = textDecoder.decode(pako.inflate(data));
                }else {
                    //协议版本为 0 时  数据没有进行压缩
                    body = textDecoder.decode(data);
                }
                if (body) {
                    // 同一条消息中可能存在多条信息，用正则筛出来
                    const group = body.split(/[\x00-\x1f]+/);
                    group.forEach(item => {
                        try {
                            result.body.push(JSON.parse(item));
                        }catch (e) {
                            // 忽略非JSON字符串，通常情况下为分隔符
                        }
                    });
                }
                offset += packetLen;
            }
        }
        //回调
        call(result);
    }
    reader.readAsArrayBuffer(blob);
}

</script>
```
