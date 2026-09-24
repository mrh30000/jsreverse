# 解码 Javascript 文件之 C# 正则替换

> **作者**: Broadm | **发布时间**: 2023-02-14 21:46:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3551 / 20
> **原文**: [https://www.52pojie.cn/thread-1746095-1-1.html](https://www.52pojie.cn/thread-1746095-1-1.html)

---

**在Web前端逆向时,经常会遇到混肴加密的JS,比如下面的原始JS**

[JavaScript] *纯文本查看*

```
var _0x1056b1=_0x195f;(function(_0x5d4e30,_0x48c9c6){var _0xc2c325=_0x195f,_0x50f292=_0x5d4e30();while(!![]){try{var _0x461dae=parseInt(_0xc2c325(0x1e7))/0x1+-parseInt(_0xc2c325(0x1d4))/0x2+-parseInt(_0xc2c325(0x1d6))/0x3+parseInt(_0xc2c325(0x1d7))/0x4+parseInt(_0xc2c325(0x1f3))/0x5*(parseInt(_0xc2c325(0x1f8))/0x6)+parseInt(_0xc2c325(0x1e8))/0x7+-parseInt(_0xc2c325(0x1df))/0x8;if(_0x461dae===_0x48c9c6)break;else _0x50f292['push'](_0x50f292['shift']());}catch(_0x436e53){_0x50f292['push'](_0x50f292['shift']());}}}(_0x4309,0x920ef),$(document)[_0x1056b1(0x1eb)](function(){var _0x11c06f=_0x1056b1,_0x284d4d=window[_0x11c06f(0x1d5)][_0x11c06f(0x1e9)];$(_0x11c06f(0x1f7))['filter'](function(){var _0x214f26=_0x11c06f;return this[_0x214f26(0x1e9)]==_0x284d4d;})[_0x11c06f(0x1da)](_0x11c06f(0x1f2)),$(_0x11c06f(0x1f7))[_0x11c06f(0x1de)](function(){var _0x1c5b20=_0x11c06f;return this[_0x1c5b20(0x1e9)]+'#'==_0x284d4d;})['addClass']('active');}));function _0x195f(_0x2630a3,_0x13a8ed){var _0x430959=_0x4309();return _0x195f=function(_0x195fba,_0x490f64){_0x195fba=_0x195fba-0x1d4;var _0x56a5ba=_0x430959[_0x195fba];return _0x56a5ba;},_0x195f(_0x2630a3,_0x13a8ed);}function switch_proj(_0x22df2b){var _0x52381c=_0x1056b1;$[_0x52381c(0x1e3)]({'url':_0x52381c(0x1ed),'type':'POST','data':{'project_id':_0x22df2b['id']},'dataType':'json','success':function(_0x5f5891){var _0x5cbb93=_0x52381c;response=_0x5f5891[_0x5cbb93(0x1f0)],_0x5f5891=_0x5f5891[_0x5cbb93(0x1e0)];if(response=='success'){active_project=document[_0x5cbb93(0x1e4)](_0x5cbb93(0x1e5));var _0x5e20bf=document['getElementById'](_0x22df2b['id'])[_0x5cbb93(0x1ef)];active_project[_0x5cbb93(0x1ef)]=_0x5e20bf,active_project=document['getElementById']('current_active_project2'),active_project['innerText']=_0x5e20bf;}else alert(_0x5f5891);}});}function _0x4309(){var _0x5cbed7=['6101864rlJFPI','data','textContent','hide','ajax','getElementById','current_active_project','reload','453406xKGppO','2619750tfYSkd','href','#projectcreation_error','ready','#projecttext','/switch-project','project_name','innerText','response','POST','active','35IfdNdC','#projectcreation_success','projectcreation_success','create','ul.nav\x20a','435684KAJSHB','498572KPcLCy','location','1257909VYUmQG','2774492jOaOCZ','#createProjectSpinner','/project-handling','addClass','content','show','projectcreation_error','filter'];_0x4309=function(){return _0x5cbed7;};return _0x4309();}function create_project(){var _0x447cef=_0x1056b1;$(_0x447cef(0x1ec))[_0x447cef(0x1e2)](),$(_0x447cef(0x1d8))[_0x447cef(0x1dc)](),project_name=document[_0x447cef(0x1e4)](_0x447cef(0x1ee))['value'],$[_0x447cef(0x1e3)]({'url':_0x447cef(0x1d9),'type':_0x447cef(0x1f1),'data':{'action':_0x447cef(0x1f6),'project_name':project_name},'success':function(_0x1fcfdb){var _0x3c6a45=_0x447cef;$(_0x3c6a45(0x1ec))[_0x3c6a45(0x1dc)](),$('#createProjectSpinner')['hide']();var _0x25fdf8=_0x1fcfdb[_0x3c6a45(0x1f0)],_0x190897=_0x1fcfdb[_0x3c6a45(0x1db)];_0x25fdf8=='success'?($(_0x3c6a45(0x1f4))[_0x3c6a45(0x1dc)](),document[_0x3c6a45(0x1e4)](_0x3c6a45(0x1f5))['textContent']=_0x190897,location[_0x3c6a45(0x1e6)]()):($(_0x3c6a45(0x1ea))[_0x3c6a45(0x1dc)](),document[_0x3c6a45(0x1e4)](_0x3c6a45(0x1dd))[_0x3c6a45(0x1e1)]=_0x190897);}});}
```

**上面的JS文件几乎无法阅读,这时候我们先要格式化它,比如拿到VSCode中使用格式化插件处理一下,然后再人工处理,把不容易理解的混肴变量重命名一下,之后可以得到如下的JS代码:**

[JavaScript] *纯文本查看*

```
function __getArray() {
    var array = [
        "6101864rlJFPI",
        "data",
        "textContent",
        "hide",
        "ajax",
        "getElementById",
        "current_active_project",
        "reload",
        "453406xKGppO",
        "2619750tfYSkd",
        "href",
        "#projectcreation_error",
        "ready",
        "#projecttext",
        "/switch-project",
        "project_name",
        "innerText",
        "response",
        "POST",
        "active",
        "35IfdNdC",
        "#projectcreation_success",
        "projectcreation_success",
        "create",
        "ul.nav a",
        "435684KAJSHB",
        "498572KPcLCy",
        "location",
        "1257909VYUmQG",
        "2774492jOaOCZ",
        "#createProjectSpinner",
        "/project-handling",
        "addClass",
        "content",
        "show",
        "projectcreation_error",
        "filter",
    ];
    return array;
}

function _getName(index) {
    var array = __getArray();
    var _index = _index - 0x1d4;
    var name = array[_index];
    return name;
}

(function (_getArray, _break_val) {
    var array = _getArray();
    while (true) {
        try {
            var result =
                parseInt(_getName(0x1e7)) / 0x1 +
                -parseInt(_getName(0x1d4)) / 0x2 +
                -parseInt(_getName(0x1d6)) / 0x3 +
                parseInt(_getName(0x1d7)) / 0x4 +
                (parseInt(_getName(0x1f3)) / 0x5) *
                (parseInt(_getName(0x1f8)) / 0x6) +
                parseInt(_getName(0x1e8)) / 0x7 +
                -parseInt(_getName(0x1df)) / 0x8;
            if (result === _break_val) break;
            else array["push"](array["shift"]());
        } catch (_0x436e53) {
            array["push"](array["shift"]());
        }
    }
})(__getArray, __break_val);

$(document)[_getName(0x1eb)](function () {
    var value = window[_getName(0x1d5)][_getName(0x1e9)];
    $(_getName(0x1f7))
    ["filter"](function () {
        return this[_getName(0x1e9)] == value;
    })
    [_getName(0x1da)](_getName(0x1f2));
    $(_getName(0x1f7))
    [_getName(0x1de)](function () {
        return this[_getName(0x1e9)] + "#" == value;
    })
    ["addClass"]("active");
});

function switch_proj(model) {
    $[_getName(0x1e3)]({
        url: _getName(0x1ed),
        type: "POST",
        data: { project_id: model["id"] },
        dataType: "json",
        success: function (data) {
            response = data[_getName(0x1f0)];
            data = data[_getName(0x1e0)];
            if (response == "success") {
                active_project = document[_getName(0x1e4)](_getName(0x1e5));
                var attr = document["getElementById"](model["id"])[_getName(0x1ef)];
                active_project[_getName(0x1ef)] = attr;
                active_project = document["getElementById"]("current_active_project2");
                active_project["innerText"] = attr;
            } else alert(data);
        },
    });
}

function create_project() {
    $(_getName(0x1ec))[_getName(0x1e2)]();
    $(_getName(0x1d8))[_getName(0x1dc)]();
    project_name = document[_getName(0x1e4)](_getName(0x1ee))["value"];
    $[_getName(0x1e3)]({
        url: _getName(0x1d9),
        type: _getName(0x1f1),
        data: { action: _getName(0x1f6), project_name: project_name },
        success: function (data) {
            $(_getName(0x1ec))[_getName(0x1dc)]();
            $("#createProjectSpinner")["hide"]();
            var value1 = data[_getName(0x1f0)];
            var value2 = data[_getName(0x1db)];

            if (value1 == "success") {
                $(_getName(0x1f4))[_getName(0x1dc)]();
                document[_getName(0x1e4)](_getName(0x1f5))["textContent"] = value2;
                location[_getName(0x1e6)]();
            } else {
                $(_getName(0x1ea))[_getName(0x1dc)]();
                document[_getName(0x1e4)](_getName(0x1dd))[_getName(0x1e1)] = value2;
            }
        },
    });
}
```

**我们可以看到,上面的代码已经很容易阅读了,但是还是有问题,很明显代码使用了一个数组,把部分参数混肴加密了,这时候我们需要替换掉这些地方 , 比如  \_getName(0x1e7)
由于本人比较收悉C#语言, 下面我使用C#编写的正则替换的代码, 把解码后的JS输出到一个新的文件**

[C#] *纯文本查看*

```

using System;
using System.Text.RegularExpressions;

var array = new string[]{
    "6101864rlJFPI",
    "data",
    "textContent",
    "hide",
    "ajax",
    "getElementById",
    "current_active_project",
    "reload",
    "453406xKGppO",
    "2619750tfYSkd",
    "href",
    "#projectcreation_error",
    "ready",
    "#projecttext",
    "/switch-project",
    "project_name",
    "innerText",
    "response",
    "POST",
    "active",
    "35IfdNdC",
    "#projectcreation_success",
    "projectcreation_success",
    "create",
    "ul.nav 20a",
    "435684KAJSHB",
    "498572KPcLCy",
    "location",
    "1257909VYUmQG",
    "2774492jOaOCZ",
    "#createProjectSpinner",
    "/project-handling",
    "addClass",
    "content",
    "show",
    "projectcreation_error",
    "filter"
};

string? _getName(int index)
{
    var _index = index - 0x1d4;
    string? funcName = array[_index];
    return funcName;
}

var originJSFileName = "1.js";
var decodeJSFileName = "1.decode.js";

using FileStream fs = new(decodeJSFileName, FileMode.Create, FileAccess.Write);
using StreamWriter writer = new(fs);

//正则,用来匹配每行的 _getName(0x111)
var regex = new Regex("_getName\\((.+?)\\)");

//读取原始加密的js文件的所有行
var lines = File.ReadAllLines(originJSFileName);

//遍历处理每一行
foreach (var line in lines)
{
    //处理每行匹配正则的所有字符串
    var decodeLine = regex.Replace(line, new MatchEvaluator(match =>
    {
        var numberString = match.Groups[1].Value;
        if (numberString == "index")
        {
            return match.Value;
        }

        //提取函数中的数字索引参数
        int number;
        if (numberString.StartsWith("0x"))
        {
            number = Convert.ToInt32(numberString, 16);
        }
        else
        {
            _ = int.TryParse(numberString, out number);
        }

        //获取实际的解密参数并返回
        return $"\"{_getName(number)}\"";
    }));
    global::System.Console.WriteLine(decodeLine);

    //写入解码后的每一行到新的文件中
    writer.WriteLine(decodeLine);
}

Console.WriteLine("完成解码");
```

**最终我得到的解码后的JS代码如下:**

[JavaScript] *纯文本查看*

```
function __getArray() {
    var array = [
        "6101864rlJFPI",
        "data",
        "textContent",
        "hide",
        "ajax",
        "getElementById",
        "current_active_project",
        "reload",
        "453406xKGppO",
        "2619750tfYSkd",
        "href",
        "#projectcreation_error",
        "ready",
        "#projecttext",
        "/switch-project",
        "project_name",
        "innerText",
        "response",
        "POST",
        "active",
        "35IfdNdC",
        "#projectcreation_success",
        "projectcreation_success",
        "create",
        "ul.nav a",
        "435684KAJSHB",
        "498572KPcLCy",
        "location",
        "1257909VYUmQG",
        "2774492jOaOCZ",
        "#createProjectSpinner",
        "/project-handling",
        "addClass",
        "content",
        "show",
        "projectcreation_error",
        "filter",
    ];
    return array;
}

function _getName(index) {
    var array = __getArray();
    var _index = _index - 0x1d4;
    var name = array[_index];
    return name;
}

(function (_getArray, _break_val) {
    var array = _getArray();
    while (true) {
        try {
            var result =
                parseInt("active") / 0x1 +
                -parseInt("6101864rlJFPI") / 0x2 +
                -parseInt("textContent") / 0x3 +
                parseInt("hide") / 0x4 +
                (parseInt("/project-handling") / 0x5) *
                (parseInt("filter") / 0x6) +
                parseInt("35IfdNdC") / 0x7 +
                -parseInt("#projectcreation_error") / 0x8;
            if (result === _break_val) break;
            else array["push"](array["shift"]());
        } catch (_0x436e53) {
            array["push"](array["shift"]());
        }
    }
})(__getArray, __break_val);

$(document)["create"](function () {
    var value = window["data"]["#projectcreation_success"];
    $("projectcreation_error")
    ["filter"](function () {
        return this["#projectcreation_success"] == value;
    })
    ["current_active_project"]("#createProjectSpinner");
    $("projectcreation_error")
    ["href"](function () {
        return this["#projectcreation_success"] + "#" == value;
    })
    ["addClass"]("active");
});

function switch_proj(model) {
    $["project_name"]({
        url: "435684KAJSHB",
        type: "POST",
        data: { project_id: model["id"] },
        dataType: "json",
        success: function (data) {
            response = data["1257909VYUmQG"];
            data = data["ready"];
            if (response == "success") {
                active_project = document["innerText"]("response");
                var attr = document["getElementById"](model["id"])["location"];
                active_project["location"] = attr;
                active_project = document["getElementById"]("current_active_project2");
                active_project["innerText"] = attr;
            } else alert(data);
        },
    });
}

function create_project() {
    $("ul.nav 20a")["/switch-project"]();
    $("ajax")["453406xKGppO"]();
    project_name = document["innerText"]("498572KPcLCy")["value"];
    $["project_name"]({
        url: "getElementById",
        type: "2774492jOaOCZ",
        data: { action: "show", project_name: project_name },
        success: function (data) {
            $("ul.nav 20a")["453406xKGppO"]();
            $("#createProjectSpinner")["hide"]();
            var value1 = data["1257909VYUmQG"];
            var value2 = data["reload"];

            if (value1 == "success") {
                $("addClass")["453406xKGppO"]();
                document["innerText"]("content")["textContent"] = value2;
                location["POST"]();
            } else {
                $("projectcreation_success")["453406xKGppO"]();
                document["innerText"]("2619750tfYSkd")["#projecttext"] = value2;
            }
        },
    });
}
```
