# 某acw_sc_v2 cookie逆向分析

> **作者**: 503671998 | **发布时间**: 2022-04-21 19:07:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4438 / 2
> **原文**: [https://www.52pojie.cn/thread-1625598-1-1.html](https://www.52pojie.cn/thread-1625598-1-1.html)

---

最近在学习js逆向，俗话说好记性不如烂笔头子，看视频不练习也是白扯，恰好在某论坛看到有人说某站访问需要到cookie，这个cookie还是动态生成的，那就来分析一下。PS：我之前没搞，边搞边写文章可能写到最后没搞出来哈哈
站点：aHR0cHM6Ly93d3cuY2R0LWVjLmNvbS9ob21lL21vcmUtenlnZy5odG1s

---

#### 第一步开始调试

打开F12访问网站，发现进入无限debugger，我们看一下引用，把前面的加密字符串都输出出来是constructor和bugger，所以这里可以通过hook constructor进行跳过这个debugger或者在debugger里直接永远不在这里断下，解决反调试。

![](https://attach.52pojie.cn/forum/202204/21/190207vzbwdcwacl4oddlm.png)

![](https://attach.52pojie.cn/forum/202204/21/190202xpxkdhq9gno5d8gz.png)

#### 第二步找到设置Cookie的位置

我的第一反应是hook cookie，直接用hook工具注入代码，之后就会在设置cookie这里断掉，当然这里我们直接搜索acw\_scv2也是可以的，果然reload调用了setcookie，再看是定时器调用了reload，那么第一感觉是直接把这里抠出来就行了是不是？扣一下。

![](https://attach.52pojie.cn/forum/202204/21/190212wlflc1rlz135llrz.png)

#### 第三步抠JS代码

我们先把用到的都抠出来试试，

```
var arg1 = 'F5552FD53D7DEE57A54020812B92605A1D2314C4';
var _0x55f3 = function(_0x4c97f0, _0x1742fd) {
            var _0x4c97f0 = parseInt(_0x4c97f0, 0x10);
            var _0x48181e = _0x4818[_0x4c97f0];
            if (!_0x55f3['\x61\x74\x6f\x62\x50\x6f\x6c\x79\x66\x69\x6c\x6c\x41\x70\x70\x65\x6e\x64\x65\x64']) {
                (function() {
                    var _0xdf49c6 = Function('\x72\x65\x74\x75\x72\x6e\x20\x28\x66\x75\x6e\x63\x74\x69\x6f\x6e\x20\x28\x29\x20' + '\x7b\x7d\x2e\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72\x28\x22\x72\x65\x74\x75\x72\x6e\x20\x74\x68\x69\x73\x22\x29\x28\x29' + '\x29\x3b');
                    var _0xb8360b = _0xdf49c6();
                    var _0x389f44 = '\x41\x42\x43\x44\x45\x46\x47\x48\x49\x4a\x4b\x4c\x4d\x4e\x4f\x50\x51\x52\x53\x54\x55\x56\x57\x58\x59\x5a\x61\x62\x63\x64\x65\x66\x67\x68\x69\x6a\x6b\x6c\x6d\x6e\x6f\x70\x71\x72\x73\x74\x75\x76\x77\x78\x79\x7a\x30\x31\x32\x33\x34\x35\x36\x37\x38\x39\x2b\x2f\x3d';
                    _0xb8360b['\x61\x74\x6f\x62'] || (_0xb8360b['\x61\x74\x6f\x62'] = function(_0xba82f0) {
                        var _0xec6bb4 = String(_0xba82f0)['\x72\x65\x70\x6c\x61\x63\x65'](/=+$/, '');
                        for (var _0x1a0f04 = 0x0, _0x18c94e, _0x41b2ff, _0xd79219 = 0x0, _0x5792f7 = ''; _0x41b2ff = _0xec6bb4['\x63\x68\x61\x72\x41\x74'](_0xd79219++); ~_0x41b2ff && (_0x18c94e = _0x1a0f04 % 0x4 ? _0x18c94e * 0x40 + _0x41b2ff : _0x41b2ff,
                        _0x1a0f04++ % 0x4) ? _0x5792f7 += String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](0xff & _0x18c94e >> (-0x2 * _0x1a0f04 & 0x6)) : 0x0) {
                            _0x41b2ff = _0x389f44['\x69\x6e\x64\x65\x78\x4f\x66'](_0x41b2ff);
                        }
                        return _0x5792f7;
                    }
                    );
                }());
                _0x55f3['\x61\x74\x6f\x62\x50\x6f\x6c\x79\x66\x69\x6c\x6c\x41\x70\x70\x65\x6e\x64\x65\x64'] = !![];
            }
            if (!_0x55f3['\x72\x63\x34']) {
                var _0x232678 = function(_0x401af1, _0x532ac0) {
                    var _0x45079a = [], _0x52d57c = 0x0, _0x105f59, _0x3fd789 = '', _0x4a2aed = '';
                    _0x401af1 = atob(_0x401af1);
                    for (var _0x124d17 = 0x0, _0x1b9115 = _0x401af1['\x6c\x65\x6e\x67\x74\x68']; _0x124d17 < _0x1b9115; _0x124d17++) {
                        _0x4a2aed += '\x25' + ('\x30\x30' + _0x401af1['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x124d17)['\x74\x6f\x53\x74\x72\x69\x6e\x67'](0x10))['\x73\x6c\x69\x63\x65'](-0x2);
                    }
                    _0x401af1 = decodeURIComponent(_0x4a2aed);
                    for (var _0x2d67ec = 0x0; _0x2d67ec < 0x100; _0x2d67ec++) {
                        _0x45079a[_0x2d67ec] = _0x2d67ec;
                    }
                    for (_0x2d67ec = 0x0; _0x2d67ec < 0x100; _0x2d67ec++) {
                        _0x52d57c = (_0x52d57c + _0x45079a[_0x2d67ec] + _0x532ac0['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x2d67ec % _0x532ac0['\x6c\x65\x6e\x67\x74\x68'])) % 0x100;
                        _0x105f59 = _0x45079a[_0x2d67ec];
                        _0x45079a[_0x2d67ec] = _0x45079a[_0x52d57c];
                        _0x45079a[_0x52d57c] = _0x105f59;
                    }
                    _0x2d67ec = 0x0;
                    _0x52d57c = 0x0;
                    for (var _0x4e5ce2 = 0x0; _0x4e5ce2 < _0x401af1['\x6c\x65\x6e\x67\x74\x68']; _0x4e5ce2++) {
                        _0x2d67ec = (_0x2d67ec + 0x1) % 0x100;
                        _0x52d57c = (_0x52d57c + _0x45079a[_0x2d67ec]) % 0x100;
                        _0x105f59 = _0x45079a[_0x2d67ec];
                        _0x45079a[_0x2d67ec] = _0x45079a[_0x52d57c];
                        _0x45079a[_0x52d57c] = _0x105f59;
                        _0x3fd789 += String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](_0x401af1['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x4e5ce2) ^ _0x45079a[(_0x45079a[_0x2d67ec] + _0x45079a[_0x52d57c]) % 0x100]);
                    }
                    return _0x3fd789;
                };
                _0x55f3['\x72\x63\x34'] = _0x232678;
            }
            if (!_0x55f3['\x64\x61\x74\x61']) {
                _0x55f3['\x64\x61\x74\x61'] = {};
            }
            if (_0x55f3['\x64\x61\x74\x61'][_0x4c97f0] === undefined) {
                if (!_0x55f3['\x6f\x6e\x63\x65']) {
                    var _0x5f325c = function(_0x23a392) {
                        this['\x72\x63\x34\x42\x79\x74\x65\x73'] = _0x23a392;
                        this['\x73\x74\x61\x74\x65\x73'] = [0x1, 0x0, 0x0];
                        this['\x6e\x65\x77\x53\x74\x61\x74\x65'] = function() {
                            return '\x6e\x65\x77\x53\x74\x61\x74\x65';
                        }
                        ;
                        this['\x66\x69\x72\x73\x74\x53\x74\x61\x74\x65'] = '\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a';
                        this['\x73\x65\x63\x6f\x6e\x64\x53\x74\x61\x74\x65'] = '\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d';
                    };
                    _0x5f325c['\x70\x72\x6f\x74\x6f\x74\x79\x70\x65']['\x63\x68\x65\x63\x6b\x53\x74\x61\x74\x65'] = function() {
                        var _0x19f809 = new RegExp(this['\x66\x69\x72\x73\x74\x53\x74\x61\x74\x65'] + this['\x73\x65\x63\x6f\x6e\x64\x53\x74\x61\x74\x65']);
                        return this['\x72\x75\x6e\x53\x74\x61\x74\x65'](_0x19f809['\x74\x65\x73\x74'](this['\x6e\x65\x77\x53\x74\x61\x74\x65']['\x74\x6f\x53\x74\x72\x69\x6e\x67']()) ? --this['\x73\x74\x61\x74\x65\x73'][0x1] : --this['\x73\x74\x61\x74\x65\x73'][0x0]);
                    }
                    ;
                    _0x5f325c['\x70\x72\x6f\x74\x6f\x74\x79\x70\x65']['\x72\x75\x6e\x53\x74\x61\x74\x65'] = function(_0x4380bd) {
                        if (!Boolean(~_0x4380bd)) {
                            return _0x4380bd;
                        }
                        return this['\x67\x65\x74\x53\x74\x61\x74\x65'](this['\x72\x63\x34\x42\x79\x74\x65\x73']);
                    }
                    ;
                    _0x5f325c['\x70\x72\x6f\x74\x6f\x74\x79\x70\x65']['\x67\x65\x74\x53\x74\x61\x74\x65'] = function(_0x58d85e) {
                        for (var _0x1c9f5b = 0x0, _0x1ce9e0 = this['\x73\x74\x61\x74\x65\x73']['\x6c\x65\x6e\x67\x74\x68']; _0x1c9f5b < _0x1ce9e0; _0x1c9f5b++) {
                            this['\x73\x74\x61\x74\x65\x73']['\x70\x75\x73\x68'](Math['\x72\x6f\x75\x6e\x64'](Math['\x72\x61\x6e\x64\x6f\x6d']()));
                            _0x1ce9e0 = this['\x73\x74\x61\x74\x65\x73']['\x6c\x65\x6e\x67\x74\x68'];
                        }
                        return _0x58d85e(this['\x73\x74\x61\x74\x65\x73'][0x0]);
                    }
                    ;
                    new _0x5f325c(_0x55f3)['\x63\x68\x65\x63\x6b\x53\x74\x61\x74\x65']();
                    _0x55f3['\x6f\x6e\x63\x65'] = !![];
                }
                _0x48181e = _0x55f3['\x72\x63\x34'](_0x48181e, _0x1742fd);
                _0x55f3['\x64\x61\x74\x61'][_0x4c97f0] = _0x48181e;
            } else {
                _0x48181e = _0x55f3['\x64\x61\x74\x61'][_0x4c97f0];
            }
            return _0x48181e;
        };

var _0x5e8b26 = _0x55f3('0x3', '\x6a\x53\x31\x59');
var _0x23a392 = arg1[_0x55f3('0x19', '\x50\x67\x35\x34')]();
var arg2 = _0x23a392[_0x55f3('0x1b', '\x7a\x35\x4f\x26')](_0x5e8b26);
```

运行一下，有个0x4818未定义，一看是个大数组，填进去运行卡死了.....我怀疑应该是有什么就检测那就算了。然后看看他都用了什么吧，对比发现他们每次通过0x55f3算出来的值都一样现在是如下：

![](https://attach.52pojie.cn/forum/202204/21/190210exkhhhk0hwhq7zq7.png)

![](https://attach.52pojie.cn/forum/202204/21/190220k9ouvrznv9921rvk.png)

```
var arg1 = 'F5552FD53D7DEE57A54020812B92605A1D2314C4';
var _0x5e8b26 = "3000176000856006061501533003690027800375";
var _0x23a392 = arg1["unsbox"]();
arg2 = _0x23a392["hexXor"](_0x5e8b26);
```

运行一看不支持这种写法，

![](https://attach.52pojie.cn/forum/202204/21/190230mw62wbbw60fw9lou.png)

看来还是不行下断点断到arg2处，发现这两个最终都是匿名函数，直接把arg2的匿名函数抠出来，把里面解密函数手动找出来

![](https://attach.52pojie.cn/forum/202204/21/190420hq7ge8gjuq5nujg8.png)

```
String["prototype"]["hexXor"] = function(_0x4e08d8) {
    var _0x5a5d3b = '';
    for (var _0xe89588 = 0x0; _0xe89588 < this["length"] && _0xe89588 < _0x4e08d8["length"]; _0xe89588 += 0x2) {
        var _0x401af1 = parseInt(this["slice"](_0xe89588, _0xe89588 + 0x2), 0x10);
        var _0x105f59 = parseInt(_0x4e08d8["slice"](_0xe89588, _0xe89588 + 0x2), 0x10);
        var _0x189e2c = (_0x401af1 ^ _0x105f59)["toString"](0x10);
        if (_0x189e2c["length"] == 0x1) {
            _0x189e2c = '\x30' + _0x189e2c;
        }
        _0x5a5d3b += _0x189e2c;
    }
    return _0x5a5d3b;
}

String["prototype"]["unsbox"] = function() {
    var _0x4b082b = [0xf, 0x23, 0x1d, 0x18, 0x21, 0x10, 0x1, 0x26, 0xa, 0x9, 0x13, 0x1f, 0x28, 0x1b, 0x16, 0x17, 0x19, 0xd, 0x6, 0xb, 0x27, 0x12, 0x14, 0x8, 0xe, 0x15, 0x20, 0x1a, 0x2, 0x1e, 0x7, 0x4, 0x11, 0x5, 0x3, 0x1c, 0x22, 0x25, 0xc, 0x24];
    var _0x4da0dc = [];
    var _0x12605e = '';
    for (var _0x20a7bf = 0x0; _0x20a7bf < this["length"]; _0x20a7bf++) {
        var _0x385ee3 = this[_0x20a7bf];
        for (var _0x217721 = 0x0; _0x217721 < _0x4b082b["length"]; _0x217721++) {
            if (_0x4b082b[_0x217721] == _0x20a7bf + 0x1) {
                _0x4da0dc[_0x217721] = _0x385ee3;
            }
        }
    }
    _0x12605e = _0x4da0dc["join"]('');
    return _0x12605e;
}

function main(){
    var arg1 = 'F5552FD53D7DEE57A54020812B92605A1D2314C4';
    var _0x5e8b26 = "3000176000856006061501533003690027800375";
    var _0x23a392 = arg1["unsbox"]();
    arg2 = _0x23a392["hexXor"](_0x5e8b26);

    return arg2;
}
```

这样就弄出来了，但是如果解密函数非常多怎么办，我们不可能一个一个去找吧，求大佬指点
