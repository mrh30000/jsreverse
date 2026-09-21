# protobuf 逆向学习笔记

> **作者**: utf8 | **发布时间**: 2025-04-15 15:57:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3310 / 6
> **原文**: [https://www.52pojie.cn/thread-2024402-1-1.html](https://www.52pojie.cn/thread-2024402-1-1.html)

---

## protobuf 笔记

### 什么是protobuf

简单来说，就是一直数据存储传输协议，但是它可以把数据压缩的很小，相对传输速度就会快很多。但是他的这个数据人类是很难看懂的，所以就有了反序列化。

详细语法：<https://colobu.com/2017/03/16/Protobuf3-language-guide/>

### 正向开发基本流程(这里是重点，了解正向开发，你才知道怎么反向)

1. 编写proto文件
2. 通过编译器生成，编程语言对应的开发包
3. 数据通过开发包序列化为二进制

简单尝试一下：

> 下载地址:<https://github.com/protocolbuffers/protobuf/releases/>

找到对应版本下载下来，会找到`protoc.exe`,这里你可以把它放到环境变量里面(我懒就没放)。

为了了解js，还要下载js的适配：`npm install -g protoc-gen-js`

手动写一个`test.proto`文件,代码如下：

```
syntax = "proto3";

package example;

message TestMessage {
  string name = 1;
  int32 age = 2;
}
```

执行：`protoc -I=C:\Users\admin\test --js_out=import_style=commonjs,binary:. C:\Users\admin\test\test.proto`

解释如下：

* `-I=C:\Users\admin\test`：指定 `.proto` 文件的搜索路径，让 `protoc` 在这个目录下查找 `.proto` 文件及其依赖。
* `--js_out=import_style=commonjs,binary:.`：指定输出 `JavaScript` 代码的选项，生成支持 `CommonJS` 模块和二进制格式的代码，并将生成的文件放在当前目录`（.）`。
* `C:\Users\admin\test\test.proto`：指定要编译的 `.proto` 文件路径。

得到如下代码，我稍微翻译了一下：

```
// source: test.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} 报告对隐式类型用法的错误。
 * @suppress {messageConventions} JS 编译器如果变量或字段以 'MSG_' 开头且不是可翻译的消息，会报错。
 * @public
 */
// 生成的代码——请勿编辑！
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof window !== 'undefined' && window) ||
    (typeof global !== 'undefined' && global) ||
    (typeof self !== 'undefined' && self) ||
    (function () { return this; }).call(null) ||
    Function('return this')();

goog.exportSymbol('proto.example.TestMessage', null, global);
/**
 * 由 JsPbCodeGenerator 生成。
 * @Param {Array=} opt_data 可选的初始数据数组，通常来自服务器响应，或者直接在 JavaScript 中构造。该数组被直接使用，并成为构造对象的一部分。它不会被克隆。
 * 如果未提供数据，则构造的对象将为空，但仍然是有效的。
 * @extends {jspb.Message}
 * @constructor
 */
proto.example.TestMessage = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.example.TestMessage, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.example.TestMessage.displayName = 'proto.example.TestMessage';
}

if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * 创建此 proto 的对象表示形式。
 * 在 JavaScript 中保留的字段名称将被重命名为 pb_name。
 * 未设置的可选字段将被设置为 undefined。
 * 要访问保留字段，请使用 foo.pb_<name>，例如，foo.pb_default。
 * 有关保留名称的列表，请参见：
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword。
 * @param {boolean=} opt_includeInstance 已废弃。是否包括用于过渡性 soy proto 支持的 JSPB 实例：
 *     http://goto/soy-param-migration
 * @Return {!Object}
 */
proto.example.TestMessage.prototype.toObject = function(opt_includeInstance) {
  return proto.example.TestMessage.toObject(opt_includeInstance, this);
};

/**
 * 静态版本的 {@see toObject} 方法。
 * @param {boolean|undefined} includeInstance 已废弃。是否包括用于过渡性 soy proto 支持的 JSPB 实例：
 *     http://goto/soy-param-migration
 * @param {!proto.example.TestMessage} msg 要转换的消息实例。
 * @return {!Object}
 * @suppress {unusedLocalVariables} f 仅用于嵌套消息
 */
proto.example.TestMessage.toObject = function(includeInstance, msg) {
  var f, obj = {
name: jspb.Message.getFieldWithDefault(msg, 1, ""),
age: jspb.Message.getFieldWithDefault(msg, 2, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}

/**
 * 反序列化二进制数据（以 protobuf 线格式）。
 * @param {jspb.ByteSource} bytes 要反序列化的字节。
 * @return {!proto.example.TestMessage}
 */
proto.example.TestMessage.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.example.TestMessage;
  return proto.example.TestMessage.deserializeBinaryFromReader(msg, reader);
};

/**
 * 从给定的读取器中将二进制数据（以 protobuf 线格式）反序列化到给定的消息对象中。
 * @param {!proto.example.TestMessage} msg 要反序列化到的消息对象。
 * @param {!jspb.BinaryReader} reader 要使用的 BinaryReader。
 * @return {!proto.example.TestMessage}
 */
proto.example.TestMessage.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setAge(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};

/**
 * 将消息序列化为二进制数据（以 protobuf 线格式）。
 * @return {!Uint8Array}
 */
proto.example.TestMessage.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.example.TestMessage.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};

/**
 * 将给定的消息序列化为二进制数据（以 protobuf 线格式），写入给定的 BinaryWriter。
 * @param {!proto.example.TestMessage} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f 仅用于嵌套消息
 */
proto.example.TestMessage.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getAge();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
};

/**
 * optional string name = 1;
 * @return {string}
 */
proto.example.TestMessage.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};

/**
 * @param {string} value
 * @return {!proto.example.TestMessage} 返回 this
 */
proto.example.TestMessage.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};

/**
 * optional int32 age = 2;
 * @return {number}
 */
proto.example.TestMessage.prototype.getAge = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};

/**
 * @param {number} value
 * @return {!proto.example.TestMessage} 返回 this
 */
proto.example.TestMessage.prototype.setAge = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};

goog.object.extend(exports, proto.example);
```

### 逆向手段

> 媒体类型是 `proto，content-type: application/grpc-web+proto`

我们首先要观察的就是`getFieldWithDefault`和`setProto3StringField`这两个函数可以让我们基本推断出字段类型和编号。

根据`exportSymbol`可以推断出`package`和`message`名称,当然这个你可以根据类似这种来推测`proto.example.TestMessage.prototype`。

`serializeBinary` 和 `serializeBinaryToWriter` (对象序列化为二进制与从二进制反序列化回对象)是明显推断点。

我简单总结一下：

| JS 表现形式 | 推断的 .proto 类型 | 说明 |
| --- | --- | --- |
| `setProto3StringField(...)` | `string name = 1;` | Proto3StringField 对应 string |
| `setProto3IntField(...)` | `int32 age = 2;` | Int 类型字段 |
| `proto.xxx.YYY` | `package xxx; message YYY` | 包名 + 消息名 |
| `jspb.Message.getFieldWithDefault(...)` | 字段编号、类型默认值 | 用于辅助确认类型 |
| `deserializeBinaryFromReader / serializeBinaryToWriter` | 标准二进制序列化逻辑 | 符合 proto3 规范 |

#### 逆向实战

> 目标网站：aHR0cHM6Ly9kLndhbmZhbmdkYXRhLmNvbS5jbi9wZXJpb2RpY2FsL3dseGIyMDIzMDEwMDE=

根据上面说的特征，你定位一下接口吧。简单调试，你会找到如下代码：

```
proto.Detail.DetailInfoRequest.serializeBinaryToWriter = function(e, t) {
            var r = void 0;
            (r = e.getResourcetype()).length > 0 && t.writeString(1, r),
            (r = e.getId()).length > 0 && t.writeString(2, r),
            (r = e.getReferer()).length > 0 && t.writeString(3, r),
            (r = e.getMd5id()).length > 0 && t.writeString(4, r),
            (r = e.getTransaction()).length > 0 && t.writeString(5, r),
            (r = e.getIsFetchAccountField()) && t.writeBool(6, r)
        }
// 这里就很清晰，这个proto文件的package = Detail，message = DetailInfoRequest
// r肯定就是里面的参数
// 控制台逐个输出知道
// message DetailInfoRequest {
//   string resourcetype = 1;
//   string id = 2;
//   string referer = 3;
//   string md5id = 4;
//   string transaction = 5;
//   bool isFetchAccountField = 6;
// }
// 并且只有两个有值，验证一下我们的猜想。看看这个结构是否正确
```

打开花瓶抓一下包，结果如下：

```
00000000  00 00 00 00 1b 0a 0a 50 65 72 69 6f 64 69 63 61          Periodica
00000010  6c 12 0d 77 6c 78 62 32 30 32 33 30 31 30 30 31   l  wlxb202301001
```

| 简单分析一下： | Offset | 十六进制 | 含义 (ASCII) |
| --- | --- | --- | --- |
| 00-03 | `00 00 00 00` | 可能是 TCP 或协议头（不是 protobuf） |
| 04 | `1b` | 后续 protobuf 数据长度（27 字节）或字段信息 |
| 05 | `0a` | Field 1, wire type 2 (length-delimited) |
| 06 | `0a` | 长度 = 10 |
| 07-10 | `50 65 72 69 6f 64 69 63 61 6c` | "Periodical" (字段1内容) |
| 11 | `12` | Field 2, wire type 2 (length-delimited) |
| 12 | `0d` | 长度 = 13 |
| 13-1f | `77 6c 78 62 32 30 32 33 30 31 30 30 31` | "wlxb202301001" (字段2内容) |

你也可以使用`protoc.exe --decode_raw < post.bin(你的二进制文件)`,可以反解 `protobuf`。要注意你的二进制文件要去除非`protobuf`部分。什么协议头什么的。

`out.proto`如下：

```
syntax = "proto3";

package Detail;

message DetailInfoRequest {
  string resourcetype = 1;
  string id = 2;
}
```

这里弄清楚了，就可以使用`protoc.exe --python_out=. out.proto`转化为py代码。

```
# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# NO CHECKED-IN PROTOBUF GENCODE
# source: out.proto
# Protobuf Python Version: 6.30.2
"""Generated protocol buffer code."""
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import runtime_version as _runtime_version
from google.protobuf import symbol_database as _symbol_database
from google.protobuf.internal import builder as _builder
_runtime_version.ValidateProtobufRuntimeVersion(
    _runtime_version.Domain.PUBLIC,
    6,
    30,
    2,
    '',
    'out.proto'
)
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()

DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\tout.proto\x12\x06\x44\x65tail\"5\n\x11\x44\x65tailInfoRequest\x12\x14\n\x0cresourcetype\x18\x01 \x01(\t\x12\n\n\x02id\x18\x02 \x01(\tb\x06proto3')

_globals = globals()
_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, _globals)
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'out_pb2', _globals)
if not _descriptor._USE_C_DESCRIPTORS:
  DESCRIPTOR._loaded_options = None
  _globals['_DETAILINFOREQUEST']._serialized_start=21
  _globals['_DETAILINFOREQUEST']._serialized_end=74
# @@protoc_insertion_point(module_scope)
```

然后调用即可

```
from out_pb2 import DetailInfoRequest

# 创建对象
msg = DetailInfoRequest()
msg.resourcetype = "Periodical"
msg.id = "wlxb202301001"

# 序列化成二进制
binary_data = msg.SerializeToString()
print("序列化为二进制:", binary_data)

# 模拟传输后反序列化
msg2 = DetailInfoRequest()
msg2.ParseFromString(binary_data)

print("反序列化结果:")
print("resourcetype:", msg2.resourcetype)
print("id:", msg2.id)
```

请求构造逻辑源代码如下：

```
o = (t = (0,
                o.a)(t.getRequestMessage())).length,
                p = [0, 0, 0, 0],
                a = new Uint8Array(5 + o),
                s = 3; 0 <= s; s--)
                    p[s] = o % 256,
                    o >>>= 8;
                if (a.set(new Uint8Array(p), 1),
                a.set(t, 5),
                t = a,
```

解析如下：

```
// t 是 protobuf 编码后的 Uint8Array 数据
o = (t = o.a(t.getRequestMessage())).length;

p = [0, 0, 0, 0];                     // 长度字段，准备构造 4 字节长度前缀
a = new Uint8Array(5 + o);           // 创建新 Uint8Array，首字节 + 长度 + 数据

for (s = 3; 0 <= s; s--) {
    p[s] = o % 256;                  // 将长度 o 拆成 4 字节
    o >>>= 8;
}

a.set(new Uint8Array(p), 1);        // 设置 4 字节长度，从偏移 1 开始
a.set(t, 5);                         // 设置实际 protobuf 数据，从偏移 5 开始

t = a;                               // t 现在是带长度前缀的新数据
```

#### 处理响应

处理响应一般可以搜索关键字符`getResponseMessage`等，而反序列化处理二进制就很可能用到这个函数`deserializeBinaryFromReader`。这里讲一个跟栈技巧，一般来说，是不会对官方库进行修改的，像什么`jquery`这种，我们调试的核心观察点在于他们自写的js文件里面。把重心放在`deserializeBinaryFromReader`,还有相应的字节数组，一步步调试。

我们前面分析的包是`proto.Detail.DetailInfoRequest`,那么是不是响应是`Response`呢，可以大胆猜测。这不你搜一下找到了这个`proto.Detail.DetailResponse.deserializeBinaryFromReader`。

定位到如下,这个e就是响应体的数组(去掉前五位)：

```
proto.Detail.DetailResponse.deserializeBinary = function(e) {
            var t = new a.BinaryReader(e)
              , r = new proto.Detail.DetailResponse;
            return proto.Detail.DetailResponse.deserializeBinaryFromReader(r, t)
        }

proto.Detail.DetailResponse.deserializeBinaryFromReader = function(e, t) {
    // 循环读取字段，直到没有更多字段或到达消息结束
    for (; t.nextField() && !t.isEndGroup(); ) {
        // 根据字段编号进行不同的处理
        switch (t.getFieldNumber()) {
            case 1:
                // 如果字段编号为1，创建一个新的 Resource 对象
                var r = new n.Resource;
                // 读取二进制数据并填充到 Resource 对象中
                t.readMessage(r, n.Resource.deserializeBinaryFromReader),
                // 将填充好的 Resource 对象添加到 DetailResponse 对象的 detailList 中
                e.addDetail(r);
                break;
            case 2:
                // 如果字段编号为2，获取 DetailResponse 对象的 extradataMap 字段
                r = e.getExtradataMap();
                // 读取二进制数据并填充到 extradataMap 字段中
                t.readMessage(r, (function(e, t) {
                    // 使用 Map 的 deserializeBinary 方法，以及 BinaryReader 的 readString 方法来读取键和值
                    a.Map.deserializeBinary(e, t, a.BinaryReader.prototype.readString, a.BinaryReader.prototype.readString)
                }
                ));
                break;
            case 3:
                // 如果字段编号为3，读取一个 int64 类型的值
                r = t.readInt64();
                // 将读取的值设置到 DetailResponse 对象的 total 字段中
                e.setTotal(r);
                break;
            default:
                // 如果字段编号不匹配任何已知字段，跳过该字段
                t.skipField()
        }
    }
    // 返回填充好的 DetailResponse 对象
    return e
}
```

这不是一眼看出来关键点在`n.Resource.deserializeBinaryFromReader`,进去，代码如下：

```
proto.com.wanfangdata.resource.Resource.deserializeBinaryFromReader = function(e, t) {
            for (; t.nextField() && !t.isEndGroup(); ) {
                switch (t.getFieldNumber()) {
                case 1:
                    var r = t.readString();
                    e.setType(r);
                    break;
                case 2:
                    r = new proto.com.wanfangdata.resource.OriginButton;
                    t.readMessage(r, proto.com.wanfangdata.resource.OriginButton.deserializeBinaryFromReader),
                    e.addOriginbuttons(r);
                    break;
                case 3:
                    r = t.readString();
                    e.setUid(r);
                    break;
                case 101:
                    r = new s.Magazine;
                    t.readMessage(r, s.Magazine.deserializeBinaryFromReader),
                    e.setMagazine(r);
                    break;
                case 102:
                    r = new n.Meeting;
                    t.readMessage(r, n.Meeting.deserializeBinaryFromReader),
                    e.setMeeting(r);
                    break;
                case 103:
                    r = new c.Periodical;
                    t.readMessage(r, c.Periodical.deserializeBinaryFromReader),
                    e.setPeriodical(r);
                    break;
                case 104:
                    r = new p.Thesis;
                    t.readMessage(r, p.Thesis.deserializeBinaryFromReader),
                    e.setThesis(r);
                    break;
                case 105:
                    r = new g.Patent;
                    t.readMessage(r, g.Patent.deserializeBinaryFromReader),
                    e.setPatent(r);
                    break;
                case 106:
                    r = new S.Blob;
                    t.readMessage(r, S.Blob.deserializeBinaryFromReader),
                    e.setBlob(r);
                    break;
                case 107:
                    r = new w.Video;
                    t.readMessage(r, w.Video.deserializeBinaryFromReader),
                    e.setVideo(r);
                    break;
                case 108:
                    r = new y.Neo4J;
                    t.readMessage(r, y.Neo4J.deserializeBinaryFromReader),
                    e.setNeo4j(r);
                    break;
                case 109:
                    r = new d.Conference;
                    t.readMessage(r, d.Conference.deserializeBinaryFromReader),
                    e.setConference(r);
                    break;
                case 110:
                    r = new u.Standard;
                    t.readMessage(r, u.Standard.deserializeBinaryFromReader),
                    e.setStandard(r);
                    break;
                case 111:
                    r = new l.Nstr;
                    t.readMessage(r, l.Nstr.deserializeBinaryFromReader),
                    e.setNstr(r);
                    break;
                case 112:
                    r = new h.Cstad;
                    t.readMessage(r, h.Cstad.deserializeBinaryFromReader),
                    e.setCstad(r);
                    break;
                case 113:
                    r = new f.Claw;
                    t.readMessage(r, f.Claw.deserializeBinaryFromReader),
                    e.setClaw(r);
                    break;
                case 114:
                    r = new m.Book;
                    t.readMessage(r, m.Book.deserializeBinaryFromReader),
                    e.setBook(r);
                    break;
                case 115:
                    r = new F.PatentLegalStatus;
                    t.readMessage(r, F.PatentLegalStatus.deserializeBinaryFromReader),
                    e.setPatentlegalstatus(r);
                    break;
                case 116:
                    r = new R.Newspaper;
                    t.readMessage(r, R.Newspaper.deserializeBinaryFromReader),
                    e.setNewspaper(r);
                    break;
                case 150:
                    r = new M.ThesisCatalogue;
                    t.readMessage(r, M.ThesisCatalogue.deserializeBinaryFromReader),
                    e.setThesiscatalogue(r);
                    break;
                default:
                    t.skipField()
                }
            }
            return e
        }
```

这里其实还不是结果，断点打在`return e`，输出发现关键点在`case 103`,进入`c.Periodical.deserializeBinaryFromReader`,刷新重新来一遍，进入到这个函数，代码如下：

```
proto.com.wanfangdata.resource.Periodical.deserializeBinaryFromReader = function(e, t) {
            for (; t.nextField() && !t.isEndGroup(); ) {
                switch (t.getFieldNumber()) {
                case 1:
                    var r = t.readString();
                    e.setId(r);
                    break;
                case 2:
                    r = t.readString();
                    e.addTitle(r);
                    break;
                case 3:
                    r = t.readString();
                    e.addCreator(r);
                    break;
                case 4:
                    r = t.readString();
                    e.setFirstcreator(r);
                    break;
                case 58:
                    r = t.readString();
                    e.addScholaridauthor(r);
                    break;
                case 5:
                    r = t.readString();
                    e.addScholarid(r);
                    break;
                case 6:
                    r = t.readString();
                    e.addForeigncreator(r);
                    break;
                case 7:
                    r = t.readString();
                    e.addCreatorforsearch(r);
                    break;
                case 8:
                    r = t.readString();
                    e.addOrganizationnorm(r);
                    break;
                case 9:
                    r = t.readString();
                    e.addOrganizationnew(r);
                    break;
                case 10:
                    r = t.readString();
                    e.addOriginalorganization(r);
                    break;
                case 11:
                    r = t.readString();
                    e.addOrganizationforsearch(r);
                    break;
                case 12:
                    r = t.readString();
                    e.addOriginalclasscode(r);
                    break;
                case 13:
                    r = t.readString();
                    e.addMachinedclasscode(r);
                    break;
                case 14:
                    r = t.readString();
                    e.addClasscodeforsearch(r);
                    break;
                case 57:
                    r = t.readString();
                    e.addPeriodicalclasscode(r);
                    break;
                case 15:
                    r = t.readString();
                    e.addContentsearch(r);
                    break;
                case 16:
                    r = t.readString();
                    e.addKeywords(r);
                    break;
                case 17:
                    r = t.readString();
                    e.addForeignkeywords(r);
                    break;
                case 18:
                    r = t.readString();
                    e.addMachinedkeywords(r);
                    break;
                case 19:
                    r = t.readString();
                    e.addKeywordforsearch(r);
                    break;
                case 20:
                    r = t.readString();
                    e.addAbstract(r);
                    break;
                case 21:
                    r = t.readInt32();
                    e.setCitedcount(r);
                    break;
                case 22:
                    r = t.readString();
                    e.setPeriodicalid(r);
                    break;
                case 23:
                    r = t.readString();
                    e.addPeriodicaltitleforsearch(r);
                    break;
                case 24:
                    r = t.readString();
                    e.addPeriodicaltitle(r);
                    break;
                case 25:
                    r = t.readString();
                    e.addSourcedb(r);
                    break;
                case 55:
                    r = t.readString();
                    e.addSinglesourcedb(r);
                    break;
                case 26:
                    r = t.readBool();
                    e.setIsoa(r);
                    break;
                case 27:
                    r = t.readString();
                    e.addFund(r);
                    break;
                case 28:
                    r = t.readString();
                    e.setPublishdate(r);
                    break;
                case 29:
                    r = t.readString();
                    e.setMetadataonlinedate(r);
                    break;
                case 30:
                    r = t.readString();
                    e.setFulltextonlinedate(r);
                    break;
                case 31:
                    r = t.readInt32();
                    e.setServicemode(r);
                    break;
                case 32:
                    r = t.readBool();
                    e.setHasfulltext(r);
                    break;
                case 33:
                    r = t.readInt32();
                    e.setPublishyear(r);
                    break;
                case 34:
                    r = t.readString();
                    e.setIssue(r);
                    break;
                case 35:
                    r = t.readString();
                    e.setVolum(r);
                    break;
                case 36:
                    r = t.readString();
                    e.setPage(r);
                    break;
                case 37:
                    r = t.readString();
                    e.setPageno(r);
                    break;
                case 38:
                    r = t.readString();
                    e.addColumn(r);
                    break;
                case 39:
                    r = t.readString();
                    e.addCoreperiodical(r);
                    break;
                case 40:
                    r = t.readString();
                    e.setFulltextpath(r);
                    break;
                case 41:
                    r = t.readString();
                    e.setDoi(r);
                    break;
                case 42:
                    r = t.readString();
                    e.addAuthororg(r);
                    break;
                case 43:
                    r = t.readString();
                    e.addThirdpartyurl(r);
                    break;
                case 44:
                    r = t.readString();
                    e.setLanguage(r);
                    break;
                case 45:
                    r = t.readString();
                    e.setIssn(r);
                    break;
                case 46:
                    r = t.readString();
                    e.setCn(r);
                    break;
                case 47:
                    r = t.readInt32();
                    e.setSequenceinissue(r);
                    break;
                case 48:
                    r = t.readInt32();
                    e.setMetadataviewcount(r);
                    break;
                case 49:
                    r = t.readInt32();
                    e.setThirdpartylinkclickcount(r);
                    break;
                case 50:
                    r = t.readInt32();
                    e.setDownloadcount(r);
                    break;
                case 56:
                    r = t.readInt32();
                    e.setExportcount(r);
                    break;
                case 70:
                    r = t.readInt32();
                    e.setDelivercount(r);
                    break;
                case 51:
                    r = t.readString();
                    e.setPrepublishversion(r);
                    break;
                case 52:
                    r = t.readString();
                    e.setPrepublishgroupid(r);
                    break;
                case 53:
                    r = t.readString();
                    e.setPublishstatus(r);
                    break;
                case 54:
                    r = t.readString();
                    e.setType(r);
                    break;
                case 63:
                    r = t.readString();
                    e.addProjectid(r);
                    break;
                case 64:
                    r = t.readString();
                    e.addFundgroupname(r);
                    break;
                case 65:
                    r = t.readString();
                    e.addProjectgrantno(r);
                    break;
                case 71:
                    r = t.readString();
                    e.addCreatorwithorgsequence(r);
                    break;
                case 72:
                    r = t.readString();
                    e.addProjecttitleoriginal(r);
                    break;
                case 76:
                    r = t.readString();
                    e.addLeadtitle(r);
                    break;
                case 77:
                    r = t.readString();
                    e.addSubtitle(r);
                    break;
                case 155:
                    r = new proto.com.wanfangdata.resource.PeriodicalHistory;
                    t.readMessage(r, proto.com.wanfangdata.resource.PeriodicalHistory.deserializeBinaryFromReader),
                    e.addHistory(r);
                    break;
                case 156:
                    r = e.getHighlightMap();
                    t.readMessage(r, (function(e, t) {
                        a.Map.deserializeBinary(e, t, a.BinaryReader.prototype.readString, a.BinaryReader.prototype.readMessage, proto.com.wanfangdata.resource.Arrays.deserializeBinaryFromReader)
                    }
                    ));
                    break;
                case 157:
                    r = t.readString();
                    e.setResourcetype(r);
                    break;
                case 158:
                    r = new s.ThirdParty;
                    t.readMessage(r, s.ThirdParty.deserializeBinaryFromReader),
                    e.addOriginal(r);
                    break;
                case 159:
                    r = e.getButtonstatusMap();
                    t.readMessage(r, (function(e, t) {
                        a.Map.deserializeBinary(e, t, a.BinaryReader.prototype.readString, a.BinaryReader.prototype.readString)
                    }
                    ));
                    break;
                default:
                    t.skipField()
                }
            }
            return e
        }
```

断点调试输出t,你会发现他和响应体的数组是一致的(抛开前5位),那么关键点就在这块。配置和之前讲的负载一样`serializeBinaryToWriter`,那么重点就到了`proto.com.wanfangdata.resource.Periodical.deserializeBinaryFromReader`或者`proto.com.wanfangdata.resource.Periodical.serializeBinaryToWriter`。后面的你还有补不少东西。这里还原说实话很费时间。油管的万把行更恐怖。如果你会ast分析结构之后，把代码补齐倒是做的出来。这里我还是不推荐大家手动补。

之前分析的，数据去除前5位之后才是真实的响应数据。那么将真实的字节数据保存为`asb.bin`,通过工具`protoc --decode_raw < abs.bin`你可以得到大致结果了。

我贴一下我手动还原的proto文件吧：

```
syntax = "proto3";

package com.wanfangdata.resource;

message DetailResponse {
  repeated Resource detail = 1;
  map<string, string> extradata = 2;
}

message Resource {
  repeated OriginButton originbuttons = 2;
  Periodical periodical = 103;
}

message OriginButton {
  int32 number = 1;
}

message Periodical {
  string id = 1;
  repeated string title = 2;
  repeated string creator = 3;
  string firstcreator = 4;
  string organizationnorm = 8;
  string organizationnew = 9;
  string originalorganization = 10;
  repeated string machinedclasscode = 13;
  repeated string keywords = 16;
  repeated string machinedkeywords = 18;
  string abstract = 20;
  int32 citedcount = 21;
  string periodicalid = 22;
  repeated string periodicaltitleforsearch = 23;
  repeated string periodicaltitle = 24;
  repeated string sourcedb = 25;
  repeated string fund = 27;
  string publishdate = 28;
  string metadataonlinedate = 29;
  string fulltextonlinedate = 30;
  int32 servicemode = 31;
  bool hasfulltext = 32;
  int32 publishyear = 33;
  string issue = 34;
  string volum = 35;
  string page = 36;
  string pageno = 37;
  repeated string column = 38;
  repeated string coreperiodical = 39;
  string fulltextpath = 40;
  string doi = 41;
  repeated string authororg = 42;
  string language = 44;
  Issn issn = 45;
  string cn = 46;
  int32 sequenceinissue = 47;
  int32 metadataviewcount = 48;
  int32 downloadcount = 50;
  string publishstatus = 53;
  string type = 54;
  string singlesourcedb = 55;
  int32 exportcount = 56;
  string periodicalclasscode = 57;
  string scholaridauthor = 58;
  int32 field59 = 59;
  int32 field61 = 61;
  int32 field62 = 62;
  int32 field66 = 66;
  string field67 = 67;
  float field68 = 68;
  float field69 = 69;
  repeated string field71 = 71;
  string field73 = 73;
  string field74 = 74;
  repeated string field78 = 78;
}

message Issn {
  string code = 6;
}
```

配合代码：

```
import output_pb2
from google.protobuf.json_format import MessageToJson
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
def decode_protobuf():
    if response.status_code != 200:
        raise Exception("请求失败")

    raw = response.content
    body = raw[5:]  # 跳过 gRPC-Web 的 5 字节头部

    detail_response = output_pb2.DetailResponse()
    detail_response.ParseFromString(body)

    # 反序列化为 Protobuf 对象
    detail_response = output_pb2.DetailResponse()
    detail_response.ParseFromString(body)

    # 转为 JSON 字符串，保留中文和结构
    json_str = MessageToJson(detail_response, ensure_ascii=False, indent=2)

    print("解析结果如下：\n")
    print(json_str)

    # 写入文件
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(json_str)

    print("\n已写入 output.txt (UTF-8 编码)")  # 这个挺烦人的

    return detail_response

if __name__ == "__main__":
    periodical = decode_protobuf()
```

可以得到结果如下：

```
{
  "detail": [
    {
      "originbuttons": [
        {
          "number": 1
        },
        {
          "number": 2
        }
      ],
      "periodical": {
        "id": "wlxb202301001",
        "title": [
          "基于矢量光场空间调制的光波偏振方向解算方法研究",
          "Algorithms for calculating polarization direction based on spatial modulation of vector optical field"
        ],
        "creator": [
          "王富杰",
          "曹晓昱",
          "高超",
          "文雪可",
          "雷兵"
        ],
        "firstcreator": "王富杰",
        "organizationnorm": "中国人民解放军国防科技大学",
        "organizationnew": "中国人民解放军国防科技大学",
        "originalorganization": "国防科技大学前沿交叉学科学院,长沙 410073",
        "machinedclasscode": [
          "TP391",
          "TP212",
          "TN957.51"
        ],
        "keywords": [
          "偏振方向解算",
          "矢量光场",
          "空间调制",
          "图像处理"
        ],
        "machinedkeywords": [
          "方向检测",
          "快速高精度",
          "radon变换",
          "相关检测",
          "光强调制",
          "曲线检测",
          "径向积分法",
          "检测技术",
          "偏振调制",
          "调制曲线"
        ],
        "abstract": "基于矢量光场调制与图像处理的偏振测量技术是一种新型的空间调制型偏振检测技术,快速高精度的偏振解算方法是该技术走向实用的关键.为探索快速高精度的偏振方向解算方法,在简要介绍基于矢量光场空间调制的偏振方向检测技术原理的基础上,分析了空间偏振调制型光强分布图像的基本特征,设计并实现了Radon变换、光强调制曲线检测、径向积分和图像相关检测四种偏振方向解算方法,详细阐述了他们的工作原理和物理思想.为进行算法性能对比,搭建实验系统并采集图像进行了实验验证,分别对四种解算方法的稳定性、速度和精度等进行了对比研究,结果表明,四种方法均可实现稳定可靠的偏振方向检测,光强调制曲线检测、径向积分和图像相关检测三种方法可获得优于0.01度的角度检测精度,光强调制曲线检测和径向积分法的检测速度较快,综合性能最优,是最有潜力实现实时高精度偏振方向检测的两种方法.",
        "citedcount": 1,
        "periodicalid": "wlxb",
        "periodicaltitleforsearch": [
          "物理学报",
          "Acta Physica Sinica"
        ],
        "periodicaltitle": [
          "物理学报",
          "Acta Physica Sinica"
        ],
        "sourcedb": [
          "WF"
        ],
        "fund": [
          "61975235:国家自然科学基金",
          "2019JJ40342:湖南省自然科学基金项目",
          ":资助的课题"
        ],
        "publishdate": "2023-01-15 00:00:00",
        "metadataonlinedate": "2023-02-15 00:00:00",
        "fulltextonlinedate": "2023-02-15 00:00:00",
        "servicemode": 1,
        "hasfulltext": true,
        "publishyear": 2023,
        "issue": "1",
        "volum": "72",
        "page": "1-8",
        "pageno": "8",
        "column": [
          "总论",
          "GENERAL"
        ],
        "coreperiodical": [
          "EI",
          "ISTIC",
          "PKU",
          "SCI"
        ],
        "fulltextpath": "wlxb/wlxb2023/2301pdf/230101.pdf",
        "doi": "10.7498/aps.72.20221745",
        "authororg": [
          "雷兵:中国人民解放军国防科技大学",
          "高超:中国人民解放军国防科技大学",
          "曹晓昱:中国人民解放军国防科技大学",
          "文雪可:中国人民解放军国防科技大学",
          "王富杰:中国人民解放军国防科技大学"
        ],
        "language": "chi",
        "issn": {},
        "cn": "11-1958/O4",
        "sequenceinissue": 1,
        "metadataviewcount": 323,
        "downloadcount": 152,
        "publishstatus": "Regular",
        "type": "Periodical",
        "singlesourcedb": "WF",
        "exportcount": 28,
        "periodicalclasscode": "N04",
        "scholaridauthor": "a0012994956:雷兵",
        "field62": 100,
        "field67": "2023-07-06 00:00:00",
        "field68": 60.0,
        "field69": 100.0,
        "field71": [
          "王富杰:|",
          "曹晓昱:|",
          "高超:|",
          "文雪可:|",
          "雷兵:|"
        ],
        "field73": "基于矢量光场空间调制的光波偏振方向解算方法研究",
        "field74": "FULLTEXT",
        "field78": [
          "国防科技大学前沿交叉学科学院,长沙 410073",
          "中国人民解放军国防科技大学"
        ]
      }
    }
  ],
  "extradata": {
    "Status": "SUCCESS",
    "machinedclasscodeList": "T^工业技术>TP^自动化技术、计算机技术>TP3^计算技术、计算机技术$$$T^工业技术>TP^自动化技术、计算机技术>TP2^自动化技术及设备$$$T^工业技术>TN^电子技术、通信技术>TN95^雷达$$$"
  }
}
```

#### 写在后面

如果有大佬有好方法欢迎带带我这个菜鸡。一步步还原挺麻烦的。

我手动还原的我感觉八成不太对(其实我还搞了一版那个有很多空值)，毕竟确实有点多，这个玩意确实不好做。有秒杀方法的大佬，可以教一下。这个网站难点就是这个数据转化，还有跟栈，这个入口确实不好找。
