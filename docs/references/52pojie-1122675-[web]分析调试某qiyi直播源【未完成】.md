# [web]分析调试某qiyi直播源【未完成】

> **作者**: niebaohua | **发布时间**: 2020-03-04 15:52:00 | **版块**: 『编程语言区』 | **查看/回复**: 4869 / 4
> **原文**: [https://www.52pojie.cn/thread-1122675-1-1.html](https://www.52pojie.cn/thread-1122675-1-1.html)

---

*本帖最后由 wushaominkk 于 2020-3-5 10:34 编辑*

`直播间例子`：<https://live.iqiyi.com/w/58000>

### 前言

我尝试过在手机上抓包，由于他们做了防护，就只抓到了真实的直播源。

例如这个：
`http://flv-bdplay.inter.71edge.com/liveugc/rqy_nxp2ojex.flv`

### 正文

在web端上找到了一个入口。

<https://live.video.iqiyi.com/jp/live?lp=2933586523&src=01010031010000000000&uid=&rateVers=PC_QIYI_3&k_uid=20zq3hg5wv8xd3vspwm4n99x&qdx=n&qdv=3&dfp=a10de47f9444ff4721a65dce58660d32c76693a7e61db070ff895f36f7449ed6bd&qd_v=1&k_ft2=0&ve=67965680cca7327e62b1e051e071e20b&k_ft1=1126999418470400&k_ft4=224&v=1&k_err_retries=0&callback=Qc19d39f63e6c1365ae4e4c92e8826d40&tm=1583293581&vf=f1f68d81f04e7f70e4c0c9384e54bf03>

网页内容

```
try{Qc19d39f63e6c1365ae4e4c92e8826d40({"_login_rate":false,"_pf":"14","code":"A00000","data":{"enable":true,"name":"【MZ】蜡笔小新。菲菲","cbUpdateType":"from live-api-server","id":2933586523,"pano":{"viewAngleY":0,"zoomRate":1,"viewAngleX":0},"liveEpisodeType":[5],"timestamp":"1583306184751","ctl":{"timestamp":"1583306184756","formatconfigs":{},"configs":{},"vip":{"types":[],"formats":{},"bids":[]}},"type":0,"epgUrl":"https://live.video.iqiyi.com\/live\/epg\/2933586523\/?endtime=0","isReplayReady":false,"duration":0,"maxPlayTime":"1582981870000","provider":1,"updateAt":"1583306118265","program":{"startTime":1582981870000,"exclusiveStatusIqiyi":false,"id":2933586523,"chatRoomEnable":true,"chatRights":1,"allowPopups":false,"sendFake":true,"progress":2,"qiyiProduced":false,"vipTypes":[0],"qitanId":0,"isProduced":false,"waterMarkFlag":false,"chatRoomShouldDisplay":true,"endTime":0,"shouldDisplay":false,"showPopups":true,"exclusive":false,"payMark":0,"logoHidden":[1,2,3],"vodList":[],"publicLevel":0,"type":4,"streamEnd":0,"name":"【MZ】蜡笔小新。菲菲","streamStart":0},"cbUpdateIP":"10.16.83.124","channelId":-1,"streams":[{"screenSize":"1600:900","steamType":"SMOOTH","chunkSize":10,"formatType":"TS","bid":200,"codeFormat":2,"bitrate":"1280","url":"http:\/\/hlslive.video.iqiyi.com\/tslive\/liveugc\/rqy_nxp2ojex\/rqy_nxp2ojex.m3u8?pv=0.2&atype=qiyi&qd_tvid=2933586523&qd_vipres=0&qd_scc=d741293eb423f8b44482c07a72a6919a&qd_sc=70afa89fc84be8ad9d56b3f73312e9cf&qd_src=01010031010000000000&qd_ip=df59a55f&qd_uid=&qd_tm=1583306184751&qd_vip=1","streamName":"rqy_nxp2ojex","aspectRatio":"16:9"},{"screenSize":"1600:900","steamType":"SMOOTH","chunkSize":10,"formatType":"HLFLV","bid":200,"codeFormat":2,"bitrate":"1280","url":"hcdnlive:\/\/BEAAAADZBRWEQQI7O5KE4Y2BD52NHPEPIEPWLYYOF5AR6635OUOUCH3QCEAQYQI7PDOQQZCBD5Z3M4OAIEPQAAAAAAAAAAQAAAAG7TQNCYXBMZPDBYWS4FQ?hl_nm=6&hl_cid=G3CMV6AP3TZPPAMZVHOML6EXTF66JA42&hl_cp=3&hl_slid=c35_rqy_nxp2ojex_s10&hl_slst=10&hl_dl=0&hl_dls=40&hl_dle=60&hl_p2ps=0&hl_apptp=qlive&hl_stapp=liveugc&hl_stid=rqy_nxp2ojex&hl_sttp=flv&hl_stft=flv&hl_pltp=1&hl_stpr=http&hl_stpt=1935&hl_dp=NB2HI4B2F4XWM3DWNRUXMZJOOZUWIZLPFZUXC2LZNEXGG33NF4&hl_force=0&qd_tvid=2933586523&qd_vipres=0&qd_scc=0ff2655e3dd5480600e25999bfe49aaa&qd_sc=70afa89fc84be8ad9d56b3f73312e9cf&qd_src=01010031010000000000&qd_ip=df59a55f&qd_uid=&qd_tm=1583306184751&qd_vip=1","streamName":"c35_rqy_nxp2ojex_s10","aspectRatio":"16:9"}],"boss":0,"pfInfo":{"platform":"PC_QIYI","delayTime":0},"liveType":4}});}catch(e){};
```

我们只需要这个数据就行

```
{"streamName": "rqy_nxp2ojex"}
```

我们只要找到每个房间的streamName, 就可以获取每个房间的真实的直播源了。
`http://flv-bdplay.inter.71edge.com/liveugc/%s.flv`

**经过多次分析之后得知**

<https://live.video.iqiyi.com/jp/live>?
lp=2926787723》》》》》》》》》》》》不一样
&src=01010031010000000000&uid=&rateVers=PC\_QIYI\_3&k\_uid=20zq3hg5wv8xd3vspwm4n99x&qdx=n&qdv=3&dfp=a10de47f9444ff4721a65dce58660d32c76693a7e61db070ff895f36f7449ed6bd&qd\_v=1&k\_ft2=0
&ve=12427ff1f79c9d951f07bbf93b7171f4》》》》》》》》》》不一样
&k\_ft1=1126999418470400&k\_ft4=224&v=1&k\_err\_retries=0&callback=Q0255524d123c650088ffc58cdbdb986a&
tm=1583293841  **十位的时间戳 。。。Math.floor((new Date).getTime() / 1e3)**
&vf=3a89bb964591a64fcd586823b762fad7》》》》》》》》》》》不一样

`参数：lp、ve、vf不一样。`

然后对网页上的js文件进行查找对应的参数

找到js文件 <https://static.iqiyi.com/js/qlive/plugin/player/uniplayer/livePlayer.js?v=20200214095107>
由于本人的js水平实在太差，就分析了一点，进行不下去了。

![UTOOLS1583307439072.png](http://yanxuan.nosdn.127.net/530ee3b3150cd0cec2218f2379bd1325.png)

在这一行找到了请求api的链接和参数

往上看看，找到了第一个参数lp

```
 _md2["default"])(this._parmas.qpId + (new Date).getTime() + _uuid2["default"].getJsuid())
                  , u = ["lp=" + this._parmas.qpId, "src=" + t, "uid=" + this.getUserInfo().uid, "rateVers=" + e, "k_uid=" + _uuid2["default"].getJsuid(), "qdx=n", "qdv=3", "dfp=" + _dfp2["default"].get(), "qd_v=" + i, "k_ft2=0", "ve=" + c];
                _ProgramType2["default"].isPGC() ? (u.push("k_ft1=1126999418470400"),
                u.push("k_ft4=224")) : _ProgramType2["default"].isPPC() && (u.push("k_ft1=141287244169216"),
                u.push("k_ft4=1")),
                0 < parseInt(this._parmas.channelId) && u.push("lc=" + this._parmas.channelId),
                _LiveSettings2["default"].isBoss() && u.push("vv=821d3c731e374feaa629dcdaab7c394b");
```

看到lp是`this._parmas.qpId`

经过调试
![UTOOLS1583307788154.png](http://yanxuan.nosdn.127.net/748cb1e41789d5e6a3563001657d3783.png)
找到了

```
 return VrsRequest.prototype.getQPId = function() {
                var n = this
                  , o = this
                  , r = function r(e) {
                    var t = o._player.getConfig().getEnvConfig("api").secKey
                      , i = e;
                    return i.sort(),
                    (0,
                    _md2["default"])(i.join("|") + "|" + t)
                }
                  , e = {
                    liveId: this._parmas.roomId,
                    tl: "player",
                    deviceId: _uuid2["default"].getFluid(),
                    platform: "1_10_101_1021",
                    liveType: 1
                }
                  , t = [];
                for (var i in e)
                    e.hasOwnProperty(i) && t.push(i + "=" + e[i]);
                e.sn = r(t);
                var a = "//apis-live.iqiyi.com/v1/live/initial";
                _apiStat.apiStat.getStat(_apiStat.apiType.initial).reqStart(a),
                _http2["default"].ajax({
                    "url": a,
                    "method": "POST",
                    "dataType": "json",
                    "withCredentials": !1,
                    "params": e,
                    "success": function(e) {
                        _apiStat.apiStat.getStat(_apiStat.apiType.initial).reqSucc(e),
                        e && "A00000" == e.code && e.data && e.data.programInfo ? (_apiStat.apiStat.getStat(_apiStat.apiType.initial).pingbackQos(),
                        n._parmas.qpId = e.data.programInfo.qipuId,
                        window.QYP.qpId = n._parmas.qpId,
                        window.QYP.showPopups = e.data.chatInfo.showPopups,
                        n.request()) : (_apiStat.apiStat.getStat(_apiStat.apiType.initial).parseFail(e && e.code || "invalid code"),
                        _apiStat.apiStat.getStat(_apiStat.apiType.initial).pingbackQos(),
                        n._complete({
                            error: !0,
                            code: _ErrorCode2["default"].ASK_QPID_DEFAULT_ERROR,
                            realCode: "askQpIds." + (e && e.code || ""),
                            message: "request for qipu id fail " + (e ? e.code : "no data")
                        }))
                    },
                    "failure": function(e, t, i) {
                        _apiStat.apiStat.getStat(_apiStat.apiType.initial).reqFail(i, e),
                        _apiStat.apiStat.getStat(_apiStat.apiType.initial).pingbackQos(),
                        n._complete({
                            error: !0,
                            code: _ErrorCode2["default"].ASK_QPID_DEFAULT_ERROR,
                            message: "request for qipu id fail " + n._parmas.roomId
                        })
                    }
                })
            }
```

又是一个请求，，有好几个参数

```
 e = {
                    liveId: this._parmas.roomId,
                    tl: "player",
                    deviceId: _uuid2["default"].getFluid(),
                    platform: "1_10_101_1021",
                    liveType: 1
                }
                  , t = [];
                for (var i in e)
                    e.hasOwnProperty(i) && t.push(i + "=" + e[i]);
                e.sn = r(t);
```

参数：deviceId、sn
需要找到这两个参数

```
                getFluid: function h() {
                    var e = n.get("QC005");
                    return e || (a = !0,
                    e = u(),
                    f("QC005", e)),
                    e
                },
```

![UTOOLS1583308002124.png](http://yanxuan.nosdn.127.net/242a659ec45adbc1e855da93de0fff19.png)
实在搞不懂。deviceId我就跳过了。
对于sn

```
r = function r(e) {
                    var t = o._player.getConfig().getEnvConfig("api").secKey
                      , i = e;
                    return i.sort(),
                    (0,
                    _md2["default"])(i.join("|") + "|" + t)
                }
```

我更是一脸懵逼。

#### 不玩了，太难了。我还是学好我的后端吧！剩下的交给各位大佬了。。。。。。。
