# 对问卷星参数jqparam的分析和探索

> **作者**: frankyxu | **发布时间**: 2021-01-29 11:16:00 | **版块**: 『编程语言区』 | **查看/回复**: 7576 / 14
> **原文**: [https://www.52pojie.cn/thread-1361387-1-1.html](https://www.52pojie.cn/thread-1361387-1-1.html)

---

*本帖最后由 frankyxu 于 2021-1-29 11:29 编辑*

## 在悬赏帖子里面看到有人发布关于jqparam参数的分析悬赏，抽时间研究了一下，于是有了这篇文章

### 首先讲一下思路

#### 打开浏览器调试模式后会自动进入debugger模式，这应该是网站反调试的一种，在debugger处右键选择never pause here，即可跳过反调试，如下图所示

<br />
![debugger调试](https://attach.52pojie.cn//forum/202101/29/105215dhlng9l4r6e9nyun.png)
再进行全局搜素jdparam参数，如图所示
<br />
![search](https://attach.52pojie.cn//forum/202101/29/110719zou5ce0ax09lc9y5.png)
<br />
会发现该参数位于[这里](https://image.wjx.com/joinnew/js/cktoole.js?v=5)，但是很快你会发现这里进行了ob混淆，很难分析，在这里，我们可以借助第三方工具进行解析，解析后的代码如下所示

```
var _0x7106a6 = function () {
  var _0x6a2f9e = true;
  return function (_0x41f5c2, _0xa2699c) {
    var _0x185292 = _0x6a2f9e ? function () {
      if (_0xa2699c) {
        var _0x4ebf6c = _0xa2699c["apply"](_0x41f5c2, arguments);

        _0xa2699c = null;
        return _0x4ebf6c;
      }
    } : function () {};

    _0x6a2f9e = false;
    return _0x185292;
  };
}();

(function () {
  _0x7106a6(this, function () {
    var _0x5d1dc8 = new RegExp("function *\\( *\\)");

    var _0x30c3a5 = new RegExp("\\+\\+ *(?:_0x(?:[a-f0-9]){4,6}|(?:\\b|\\d)[a-z0-9]{1,4}(?:\\b|\\d))", "i");

    var _0x2b378a = _0x24b04e("init");

    if (!_0x5d1dc8["test"](_0x2b378a + "chain") || !_0x30c3a5["test"](_0x2b378a + "input")) {
      _0x2b378a("0");
    } else {
      _0x24b04e();
    }
  })();
})();

function abcd1(_0x17164c) {
  return abcd2(_0x17164c, 3597397);
}

function abcd2(_0x1b1e02, _0x23f273) {
  if (!abcdx()) {
    return;
  }

  var _0x1f9ba1 = 2147483648;
  var _0x3b83ae = 2147483647;

  var _0x4ad458 = ~~(_0x1b1e02 / _0x1f9ba1);

  var _0x470088 = ~~(_0x23f273 / _0x1f9ba1);

  var _0x5bc159 = _0x1b1e02 & _0x3b83ae;

  var _0x35dfa5 = _0x23f273 & _0x3b83ae;

  var _0x353774 = _0x4ad458 ^ _0x470088;

  var _0x4a742c = _0x5bc159 ^ _0x35dfa5;

  return _0x353774 * _0x1f9ba1 + _0x4a742c;
}

setInterval(function () {
  _0x24b04e();
}, 4000);

function abcd3(_0x420610, _0x1b425f) {
  if (_0x420610 - 62 < 0) {
    var _0xea36a8 = _0x1b425f["substr"](_0x420610, 1);

    return _0xea36a8;
  }

  var _0x45571c = _0x420610 % 62;

  var _0x4e6181 = parseInt(_0x420610 / 62);

  return abcd3(_0x4e6181, _0x1b425f) + _0x1b425f["substr"](_0x45571c, 1);
}

function abcd4(_0x11dbf0, _0x1558df) {
  if (!abcdx()) {
    return;
  }

  var _0x556c7b = _0x1558df["split"]("");

  var _0x27312b = _0x1558df["length"];

  for (var _0x107cfb = 0; _0x107cfb < _0x11dbf0["length"]; _0x107cfb++) {
    var _0x410c33 = parseInt(_0x11dbf0[_0x107cfb]);

    var _0x43a652 = _0x556c7b[_0x410c33];
    var _0x433a77 = _0x556c7b[_0x27312b - 1 - _0x410c33];
    _0x556c7b[_0x410c33] = _0x433a77;
    _0x556c7b[_0x27312b - 1 - _0x410c33] = _0x43a652;
  }

  _0x1558df = _0x556c7b["join"]("");
  return _0x1558df;
}

function abcd5(_0x5565b6) {
  if (!abcdx()) {
    return;
  }

  var _0x546e81 = 0;

  var _0x5ed7b1 = _0x5565b6["split"]("");

  for (var _0x28a6c3 = 0; _0x28a6c3 < _0x5ed7b1["length"]; _0x28a6c3++) {
    _0x546e81 += _0x5ed7b1[_0x28a6c3]["charCodeAt"]();
  }

  var _0x5af006 = _0x5565b6["length"];

  var _0x5258e0 = _0x546e81 % _0x5af006;

  var _0x2b24c5 = [];

  for (var _0x28a6c3 = _0x5258e0; _0x28a6c3 < _0x5af006; _0x28a6c3++) {
    _0x2b24c5["push"](_0x5ed7b1[_0x28a6c3]);
  }

  for (var _0x28a6c3 = 0; _0x28a6c3 < _0x5258e0; _0x28a6c3++) {
    _0x2b24c5["push"](_0x5ed7b1[_0x28a6c3]);
  }

  return _0x2b24c5["join"]("");
}

function abcdu(_0x92722d) {
  var _0x2eb3ad = -480;

  var _0x3a4ef4 = new Date()["getTimezoneOffset"]();

  var _0x58cdae = _0x2eb3ad - _0x3a4ef4;

  return _0x92722d["getTime"]() / 1000 + _0x58cdae * 60;
}

function abcdx() {
  if (navigator["webdriver"]) {
    return false;
  }

  if (document["$cdc_asdjflasutopfhvcZLmcfl_"]) {
    return false;
  }

  if (/PhantomJS/["test"](window["navigator"]["userAgent"])) {
    return false;
  }

  if (window["callPhantom"] || window["_phantom"]) {
    return false;
  }

  return true;
}

$(function () {
  setTimeout(function () {
    window["hdm1113"] = true;
  }, 1000);

  function _0x3ef545(_0x151a89) {
    if (_0x151a89["pageX"] > 0 && abcdx() && window["hdm1113"]) {
      var _0x3098bf = rndnum["split"](".")[0];

      var _0x4aaf4a = abcd1(parseInt(_0x3098bf));

      var _0x149db2 = (_0x4aaf4a + "")["split"]("");

      var _0x5b9ae2 = $("#starttime")["val"]() || window["initstime"];

      var _0x4eae39 = abcdu(new Date(_0x5b9ae2["replace"](new RegExp("-", "gm"), "/")));

      var _0x5050a2 = _0x4eae39 + "";

      if (_0x4eae39 % 10 > 0) {
        _0x5050a2 = _0x5050a2["split"]("")["reverse"]()["join"]("");
      }

      var _0xd16fcc = parseInt(_0x5050a2 + "89123");

      var _0x149db2 = (_0xd16fcc + "" + (_0x4aaf4a + ""))["split"]("");

      var _0x1b3de6 = abcd4(_0x149db2, "kgESOLJUbB2fCteoQdYmXvF8j9IZs3K0i6w75VcDnG14WAyaxNqPuRlpTHMrhz");

      var _0x3a5cf2 = _0xd16fcc + _0x4aaf4a + parseInt(activityId);

      jqParam = abcd3(_0x3a5cf2, _0x1b3de6);

      var _0x5d90fd = abcd5(jqParam);

      jqParam = _0x5d90fd;
      $(document)["unbind"]("mousemove", _0x3ef545);
    }
  }

  $(document)["bind"]("mousemove", _0x3ef545);
});

function _0x24b04e(_0x3cc20b) {
  function _0x26d44e(_0x543113) {
    if (typeof _0x543113 === "string") {
      return function (_0x5a0480) {}["constructor"]("while (true) {}")["apply"]("counter");
    } else {
      if (("" + _0x543113 / _0x543113)["length"] !== 1 || _0x543113 % 20 === 0) {
        (function () {
          return true;
        })["constructor"]("debugger")["call"]("action");
      } else {
        (function () {
          return false;
        })["constructor"]("debugger")["apply"]("stateObject");
      }
    }

    _0x26d44e(++_0x543113);
  }

  try {
    if (_0x3cc20b) {
      return _0x26d44e;
    } else {
      _0x26d44e(0);
    }
  } catch (_0x136355) {}
}
```

这里，我们可以看到分析难度降低了很多，解析网站在[这里](http://tool.yuanrenxue.com/decode_obfuscator)，接着就是展现插件的时候到了，利用reres这个浏览器插件，可以把服务器请求的文件映射到本地,映射规则如图所示
<https://image.wjx.com/joinnew/js/cktoole.js>.\*   ---> <http://localhost:9000/tool.js>
<br />
![规则](https://attach.52pojie.cn//forum/202101/29/110820duznp101k3j3976z.png)

js映射时去调问号及后面的参数用.\*代替即可,再次刷新网站，发现浏览器所请求js已经映射到了本地js，本地js可以到该js所在目录用该命令构造一个ftp服务
`python -m http.server`

接着打断点就可以进行完整分析了，如图所示![调试](https://attach.52pojie.cn//forum/202101/29/110829ujuvau4u0vz40xzv.png)
到这里思路是不是清晰了很多

### jqparam生成代码分享

```
function abcd1(_0x17164c) {
  return abcd2(_0x17164c, 3597397);
}

function abcd2(_0x1b1e02, _0x23f273) {
  if (!abcdx()) {
    return;
  }

  var _0x1f9ba1 = 2147483648;
  var _0x3b83ae = 2147483647;

  var _0x4ad458 = ~~(_0x1b1e02 / _0x1f9ba1);

  var _0x470088 = ~~(_0x23f273 / _0x1f9ba1);

  var _0x5bc159 = _0x1b1e02 & _0x3b83ae;

  var _0x35dfa5 = _0x23f273 & _0x3b83ae;

  var _0x353774 = _0x4ad458 ^ _0x470088;

  var _0x4a742c = _0x5bc159 ^ _0x35dfa5;

  return _0x353774 * _0x1f9ba1 + _0x4a742c;
}

function abcd3(_0x420610, _0x1b425f) {
  if (_0x420610 - 62 < 0) {
    var _0xea36a8 = _0x1b425f["substr"](_0x420610, 1);

    return _0xea36a8;
  }

  var _0x45571c = _0x420610 % 62;

  var _0x4e6181 = parseInt(_0x420610 / 62);

  return abcd3(_0x4e6181, _0x1b425f) + _0x1b425f["substr"](_0x45571c, 1);
}

function abcd4(_0x11dbf0, _0x1558df) {
  if (!abcdx()) {
    return;
  }

  var _0x556c7b = _0x1558df["split"]("");

  var _0x27312b = _0x1558df["length"];

  for (var _0x107cfb = 0; _0x107cfb < _0x11dbf0["length"]; _0x107cfb++) {
    var _0x410c33 = parseInt(_0x11dbf0[_0x107cfb]);

    var _0x43a652 = _0x556c7b[_0x410c33];
    var _0x433a77 = _0x556c7b[_0x27312b - 1 - _0x410c33];
    _0x556c7b[_0x410c33] = _0x433a77;
    _0x556c7b[_0x27312b - 1 - _0x410c33] = _0x43a652;
  }

  _0x1558df = _0x556c7b["join"]("");
  return _0x1558df;
}

function abcd5(_0x5565b6) {
  if (!abcdx()) {
    return;
  }

  var _0x546e81 = 0;

  var _0x5ed7b1 = _0x5565b6["split"]("");

  for (var _0x28a6c3 = 0; _0x28a6c3 < _0x5ed7b1["length"]; _0x28a6c3++) {
    _0x546e81 += _0x5ed7b1[_0x28a6c3]["charCodeAt"]();
  }

  var _0x5af006 = _0x5565b6["length"];

  var _0x5258e0 = _0x546e81 % _0x5af006;

  var _0x2b24c5 = [];

  for (var _0x28a6c3 = _0x5258e0; _0x28a6c3 < _0x5af006; _0x28a6c3++) {
    _0x2b24c5["push"](_0x5ed7b1[_0x28a6c3]);
  }

  for (var _0x28a6c3 = 0; _0x28a6c3 < _0x5258e0; _0x28a6c3++) {
    _0x2b24c5["push"](_0x5ed7b1[_0x28a6c3]);
  }

  return _0x2b24c5["join"]("");
}

function abcdu(_0x92722d) {
  var _0x2eb3ad = -480;

  var _0x3a4ef4 = new Date()["getTimezoneOffset"]();

  var _0x58cdae = _0x2eb3ad - _0x3a4ef4;

  return _0x92722d["getTime"]() / 1000 + _0x58cdae * 60;
}

function abcdx() {

  return true;
}

function get_jqParam(rndnum, initstime, activityId) {
  var _0x3098bf = rndnum["split"](".")[0]; // rndnum from html

  var _0x4aaf4a = abcd1(parseInt(_0x3098bf));

  var _0x149db2 = (_0x4aaf4a + "")["split"]("");

  var _0x5b9ae2 = initstime; //"2021/1/28 17:36:28"

  var _0x4eae39 = abcdu(new Date(_0x5b9ae2["replace"](new RegExp("-", "gm"), "/")));

  var _0x5050a2 = _0x4eae39 + "";

  if (_0x4eae39 % 10 > 0) {
    _0x5050a2 = _0x5050a2["split"]("")["reverse"]()["join"]("");
  }

  var _0xd16fcc = parseInt(_0x5050a2 + "89123");

  var _0x149db2 = (_0xd16fcc + "" + (_0x4aaf4a + ""))["split"]("");

  var _0x1b3de6 = abcd4(_0x149db2, "kgESOLJUbB2fCteoQdYmXvF8j9IZs3K0i6w75VcDnG14WAyaxNqPuRlpTHMrhz");

  var _0x3a5cf2 = _0xd16fcc + _0x4aaf4a + parseInt(activityId);

  jqParam = abcd3(_0x3a5cf2, _0x1b3de6);

  var _0x5d90fd = abcd5(jqParam);

  return jqParam

}

var  rndnum = '2008883437.96038739';
var  initstime = "2021/1/28 16:55:06";
var  activityId = '105444284';
var result = get_jqParam(rndnum, initstime, activityId);
console.log(result)
```

### end

学无止境，实践出真知
