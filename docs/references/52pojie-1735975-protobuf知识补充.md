# protobuf知识补充

> **作者**: prince_cool | **发布时间**: 2023-01-13 13:16:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5951 / 9
> **原文**: [https://www.52pojie.cn/thread-1735975-1-1.html](https://www.52pojie.cn/thread-1735975-1-1.html)

---

*本帖最后由 prince\_cool 于 2023-5-20 17:51 编辑*

## protobuf知识补充

### 前言

​ 前面两篇文章讲了protobuf的逆向，有些人对protobuf一些基本认识还不够，这里我将补充一点protobuf知识。

我将从proto文件转javascript文件入手，看看我们上一期所见到的一些关键词，希望能让你对protobuf网站逆向更深刻，有新的认识。

### 一、前期准备

下载低于3.21.0 的protoc版本，因为原项目已将它独立出来，下载最新版本的protoc，运行js\_out会缺少插件，如下图。

![image-20230112163724910](https://s2.loli.net/2023/05/20/6UJt1hi7SlPvQBV.png)

下载地址：<https://github.com/protocolbuffers/protobuf/releases/>

![image-20230112163952324](https://s2.loli.net/2023/05/20/TwnE19MAytjPcg8.png)

下载对应版本，可以添加到环境变量（之前添加过的记得删除原来的），也可以把proto文件移到bin目录下执行。

### 二、将proto文件编译成javascript文件

我们先看一下proto文件有什么数据类型吧。

参考文章: <https://www.jianshu.com/p/362a6cdb63c5>

#### 基础类型

| .proto类型 | java类型 | C++类型 | 备注 |
| --- | --- | --- | --- |
| double | double | double |  |
| float | float | float |  |
| int32 | int | int32 | 使用可变长编码方式。编码负数时不够高效——如果你的字段可能含有负数，那么请使用sint32。 |
| int64 | long | int64 | 使用可变长编码方式。编码负数时不够高效——如果你的字段可能含有负数，那么请使用sint64。 |
| unit32 | int[1] | unit32 | 总是4个字节。如果数值总是比总是比228大的话，这个类型会比uint32高效。 |
| unit64 | long[1] | unit64 | 总是8个字节。如果数值总是比总是比256大的话，这个类型会比uint64高效。 |
| sint32 | int | int32 | 使用可变长编码方式。有符号的整型值。编码时比通常的int32高效。 |
| sint64 | long | int64 | 使用可变长编码方式。有符号的整型值。编码时比通常的int64高效。 |
| fixed32 | int[1] | unit32 |  |
| fixed64 | long[1] | unit64 | 总是8个字节。如果数值总是比总是比256大的话，这个类型会比uint64高效。 |
| sfixed32 | int | int32 | 总是4个字节。 |
| sfixed64 | long | int64 | 总是8个字节。 |
| bool | boolean | bool |  |
| string | String | string | 一个字符串必须是UTF-8编码或者7-bit ASCII编码的文本。 |
| bytes | ByteString | string | 可能包含任意顺序的字节数据 |

#### 特殊字段

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| enum | 枚举(数字从零开始) 作用是为字段指定某”预定义值序列” | enum Type {MAN = 0;WOMAN = 1; OTHER= 3;} |
| message | 消息体 | message User{} |
| repeated | 数组/集合 | repeated User users  = 1 |
| import | 导入定义 | import "protos/other\_protos.proto" |
| // | 注释 | //用于注释 |
| extend | 扩展 | extend User {} |
| package | 包名 | 相当于命名空间，用来防止不同消息类型的明明冲突 |

然后我们随便写一个proto文件的demo吧，把常见的类型都囊括进去：

```
syntax = "proto3";  //一定要有，可以是2也可以是3

enum Gender{
  man=0;
  woman=1;
}
message Person{
  int32 age=1; //年龄
  float height=2; //身高
  string name=3; //名字
  repeated string character=4; //性格，可多个
  Gender gender=5; //性别
  repeated City city=6; //人去过的城市，可以多个，有选择
}

enum City{
  guangzhou=0;
  beijing=1;
  shanghai=2;
  shenzhen=3;
  hangzhou=4;
}

message Get_persons{
  repeated Person person=1;
}
```

写好后，我们转化一下：

```
protoc --js_out=import_style=commonjs,binary:. 你的proto文件名.proto
```

转化成功，我们看看。

![image-20230112174433673](https://s2.loli.net/2023/05/20/zKQCxLkbGSJjoZl.png)

​ 其实我们打开之前逆向的网站，搜索jspb或者是goog，我们也能找到他们的身影，其实他们也是用的我们一样的处理方式，只是他们webpack打包了，我们看着觉得复杂了，但是核心api还是没变的。

看回我们的js文件：

​ 我们从我们自己转化的js文件看，也能发现，前面这两个是处理我们proto文件中对象用的，我们核心应该放在那些对象上面即proto对象上，proto.的后面代表的是我们写的那几个对象。

我们打印输出proto对象看看（先安装好 google-protobuf模块）：

![image-20230112175956646](https://s2.loli.net/2023/05/20/AhRGicP9jutlNUv.png)

可以看到正是我们proto文件中写的那几个对象。

我们继续往下看吧，先是对message类型数据做处理：

```
proto.Person.repeatedFields_ = [4,6];
```

Person对象中第几个是repeated的，我们写的demo是第4个和第6个。

```
/**
 * Static version of the {@See toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Person} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.Person.toObject = function(includeInstance, msg) {
  var f, obj = {
    age: jspb.Message.getFieldWithDefault(msg, 1, 0),
    height: jspb.Message.getFloatingPointFieldWithDefault(msg, 2, 0.0),
    name: jspb.Message.getFieldWithDefault(msg, 3, ""),
    characterList: (f = jspb.Message.getRepeatedField(msg, 4)) == null ? undefined : f,
    gender: jspb.Message.getFieldWithDefault(msg, 5, 0),
    cityList: (f = jspb.Message.getRepeatedField(msg, 6)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}

/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Person}
 */
proto.Person.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Person;
  return proto.Person.deserializeBinaryFromReader(msg, reader);
};

/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Person} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Person}
 */
proto.Person.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setAge(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readFloat());
      msg.setHeight(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.addCharacter(value);
      break;
    case 5:
      var value = /** @type {!proto.Gender} */ (reader.readEnum());
      msg.setGender(value);
      break;
    case 6:
      var values = /** @type {!Array<!proto.City>} */ (reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]);
      for (var i = 0; i < values.length; i++) {
        msg.addCity(values[i]);
      }
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};

/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Person.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Person.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};

/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Person} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.Person.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAge();
  if (f !== 0) {
    writer.writeInt32(1,f);
  }
  f = message.getHeight();
  if (f !== 0.0) {
    writer.writeFloat(2,f);
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(3,f);
  }
  f = message.getCharacterList();
  if (f.length > 0) {
    writer.writeRepeatedString(4,f);
  }
  f = message.getGender();
  if (f !== 0.0) {
    writer.writeEnum(5,f);
  }
  f = message.getCityList();
  if (f.length > 0) {
    writer.writePackedEnum(6,f);
  }
};
```

​ 这是Person的api函数，可以看到，有我之前文章提到的那几个关键函数，其实把每个注释翻译一下，就是每个api的功能，和要传的参数。

**toObject 将获取到的数据转成结构化数据**

**deserializeBinary 二进制数据转换成数组结构（反序列化 | 获取到的数据需要Uint8Array转成二进制）**

**deserializeBinaryFromReader 根据规则，将二进制数据转换成数组结构**

**serializeBinary 将数据转成二进制（序列化）**

**serializeBinaryToWriter 根据规则，将数据转换成二进制数据（序列化）**

所以之前两篇文章的核心也就体现在了这里，这几个api就能定位到地方。

我们继续往下看：

```
/**
 * optional int32 age = 1;
 * @return {number}
 */
proto.Person.prototype.getAge = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};

/**
 * @param {number} value
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.setAge = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};

/**
 * optional float height = 2;
 * @return {number}
 */
proto.Person.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFloatingPointFieldWithDefault(this, 2, 0.0));
};

/**
 * @param {number} value
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.setHeight = function(value) {
  return jspb.Message.setProto3FloatField(this, 2, value);
};

/**
 * optional string name = 3;
 * @return {string}
 */
proto.Person.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};

/**
 * @param {string} value
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};

/**
 * repeated string character = 4;
 * @return {!Array<string>}
 */
proto.Person.prototype.getCharacterList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 4));
};

/**
 * @param {!Array<string>} value
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.setCharacterList = function(value) {
  return jspb.Message.setField(this, 4, value || []);
};

/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.addCharacter = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 4, value, opt_index);
};

/**
 * Clears the list making it empty but non-null.
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.clearCharacterList = function() {
  return this.setCharacterList([]);
};

/**
 * optional Gender gender = 5;
 * @return {!proto.Gender}
 */
proto.Person.prototype.getGender = function() {
  return /** @type {!proto.Gender} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};

/**
 * @param {!proto.Gender} value
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.setGender = function(value) {
  return jspb.Message.setProto3EnumField(this, 5, value);
};

/**
 * repeated City city = 6;
 * @return {!Array<!proto.City>}
 */
proto.Person.prototype.getCityList = function() {
  return /** @type {!Array<!proto.City>} */ (jspb.Message.getRepeatedField(this, 6));
};

/**
 * @param {!Array<!proto.City>} value
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.setCityList = function(value) {
  return jspb.Message.setField(this, 6, value || []);
};

/**
 * @param {!proto.City} value
 * @param {number=} opt_index
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.addCity = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 6, value, opt_index);
};

/**
 * Clears the list making it empty but non-null.
 * @return {!proto.Person} returns this
 */
proto.Person.prototype.clearCityList = function() {
  return this.setCityList([]);
};
```

**get是取值，后面是对应的变量(首字母大写)**

**set是设置值，后面是对应的变量(首字母大写)**

**注意：**

​     **如果proto文件中是repeated的变量，在js中显示的是**

​                 **get+变量名+List**

​                 **set+变量名+List  // 可直接赋值一个数组，只能是数组Array**

**还多两个：add +变量名    //向数组中添加一个值，向后添加**

​                 **clear+变量名+List   //清空数组数据**

如果还是不懂，我们写一个demo看看，效果：

```
const proto=require("./test_pb.js"); //引入文件，导出对象
Person=new proto.Person() //实例化我们想要的Person对象

characterlist=['humorous','independent','optimistic'] //创建一个数组，填写我们赋予的性格
Person.setCharacterList(characterlist) //使用set 直接赋数组，只能为数组
data=Person.serializeBinary() //序列化，二进制化
//console.log(data)
data2=proto.Person.deserializeBinary(data).toObject()//反序列化，得到我们容易理解的对象
console.log(data2)

Person.addCharacter('sincere') //在character的列表后单独添加一个性格 （一个值）
data3=Person.serializeBinary() //序列化，二进制化
data4=proto.Person.deserializeBinary(data3).toObject()//反序列化，得到我们容易理解的对象
console.log(data4)

Person.clearCharacterList() //清除操作
//下面同上操作，主要为了看效果
data5=Person.serializeBinary()
//console.log(data5)
data6=proto.Person.deserializeBinary(data5).toObject()
console.log(data6)
```

​ ![image-20230113120859799](https://s2.loli.net/2023/05/20/tJIcVak7yMW8j6x.png)

现在应该更好理解了吧，枚举的repeated关键词也是一样的。

在这里有点搞不懂，为什么不能取出最开始我们枚举设置的值。

我们再观察一下枚举类型enum。

```
/**
 * @enum {number}
 */
proto.Gender = {
  MAN: 0,
  WOMAN: 1
};

/**
 * @enum {number}
 */
proto.City = {
  GUANGZHOU: 0,
  BEIJING: 1,
  SHANGHAI: 2,
  SHENZHEN: 3,
  HANGZHOU: 4
};
```

没什么特别的，主要就是你设置的那几个值，注意一定要设序号为0的内容。

以上基本上是对proto文件转JavaScript文件的分析，希望大家能有所收获吧。

### 三、下面写几个在python中可能需要处理的点吧：

先将proto文件转py文件

```
protoc --python_out=. proto名.proto
```

主要是repeated关键字的处理，我在前面文章也提过一点，我们以这次的例子来说一下吧：

```
import test_pb2 as proto

Get_persons=proto.Get_persons()
person1=Get_persons.person.add()
person1.age=18
person1.height=175.5
person1.name='张三'
person1.character.extend(['humorous','independent','optimistic'])
person1.character.append('sincere')
person1.gender=0
person1.city.extend([0,1,2])

person2=Get_persons.person.add()
person2.age=25
person2.height=160.5
person2.name='小红'
person2.character.extend(['independent','optimistic'])
person2.character.append('humorous')
person2.gender=1
person2.city.append(3)
person2.city.append(4)
person2.city.append(5)

data_bytes=Get_persons.SerializeToString()
print(data_bytes)
Get_persons.ParseFromString(data_bytes)
print(Get_persons)
```

![image-20230113122003660](https://s2.loli.net/2023/05/20/2CnxoMijaTkqG7b.png)

**可以看到，如果是repeated类型：**

·**对于message：**

​             ·**我们要先.add()创建对象，然后在给这个新对象赋值**

**对于其他类型：**

​             **我们可以有两个函数接口赋值：**

​                         **extend(列表数组)**

​                         **append(单个元素)**

​             **特别的对enum：**

​                         **extend和append后必须为int类型的数组或数字。**

​                         **如果赋值超出我们设定的默认枚举选项，就会赋值我们的数字，如果是在枚举内的选项，就会输出枚举内的选项。**

在这里其实我对js为什么枚举里面不能输出我预设的选项，我有点困惑，有大佬知道的可以留言解答一下，谢谢了。

想表达的基本上已经写完了，如果还有疑问，可以留言反馈，也可以自己编译，根据英文自己慢慢理解，你们的点赞是我继续写文章的动力，希望多多转发，感谢！

### 四、相关资料参考

<https://developers.google.cn/protocol-buffers>  protobuf官方文档

<https://github.com/protocolbuffers/protobuf>    protobuf官方github

​
