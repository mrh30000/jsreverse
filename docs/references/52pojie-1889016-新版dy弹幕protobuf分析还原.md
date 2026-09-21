# 新版dy弹幕protobuf分析还原

> **作者**: prince_cool | **发布时间**: 2024-02-08 23:59:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 11667 / 44
> **原文**: [https://www.52pojie.cn/thread-1889016-1-1.html](https://www.52pojie.cn/thread-1889016-1-1.html)

---

*本帖最后由 prince\_cool 于 2024-2-9 00:12 编辑*

## 声明

​    **本文章中所有内容仅供学习交流，相关链接做了脱敏处理，若有侵权，请联系我立即删除！**

#### 一、前言

​        没想到毕业即失业了，本以为不会再接触逆向了，没想到还是回来了，还是喜欢的。偶然间发现dy弹幕js好像改版了，我根据相似的代码编写了新的还原工具，接下来是分析和工具使用介绍。

#### 二.确定目标

​        之前的帖子有具体讲过什么是protobuf，现在我们先找到我们需要的wss请求，新版本的多了几个其他wss链接，目前不太清楚目的和作用是什么，这篇帖子关注的是弹幕的wss链接。

![](https://attach.52pojie.cn/forum/202402/09/000606irh7phx6bpkf7cmb.png)

#### 三、跟栈分析

​        到熟悉的跟栈环节，从最后一个开始分析

![](https://attach.52pojie.cn/forum/202402/09/000608y25okgyy5m0w7d5o.png)

​        点进去就可以看到好多关键的东西了

![](https://attach.52pojie.cn/forum/202402/09/000610l0lifzu7i70i7ono.png)

​        从字面上就能看出来具体是什么作用了，我们可以下断点，send的地方因为一开始连接后，我们会首先发一个hb数据包，从之前的文章可以知道，事实也确实如此。

![](https://attach.52pojie.cn/forum/202402/09/000613nnh1zwgm7qlk057j.png)

​        然后就可以看堆栈，看谁调用的这个send方法了

![](https://attach.52pojie.cn/forum/202402/09/000615szjjtkfetutuckgb.png)

​        具体内容做了什么，实际和之前文章的类似，可以找回之前的文章部分查看理解，我们现在要找的核心就是它发送的内容是怎么构造的,发现是异步的，新版本就是很多这种异步，耐心分析。
​                                                           this.transport.ping()
​        跟进函数，其实就很明显的知道使用了什么函数，传入参数是什么了，虽然是异步，也不需要慌。

![](https://attach.52pojie.cn/forum/202402/09/000617njhz9gt3y3qqqg7g.png)

​        我下断点，重新刷新一下。

![](https://attach.52pojie.cn/forum/202402/09/000619eyh82vacpniunncr.png)

​        就能看到和之前类似的东西了，接下来我们看看函数里面做了什么吧。

![](https://attach.52pojie.cn/forum/202402/09/000621txzxbgeif3wfpeex.png)

​        到这里可能会慌，不知道是哪个函数，都是一堆异步，其实我们根据字段名可以猜一下，下个断点看看，发现this.\_encode才是处理的函数，我们要再进一步啦。

![](https://attach.52pojie.cn/forum/202402/09/000623r3eheh3aj1eahhu1.png)

​        跟到这里，渐渐有了信心吧，传入参数也是我们刚刚最开始传的，然后类似log的地方也有提示是"encoded success"。那我们开始分析这段代码吧。

```
//et={"payload_type": "hb"}  ei="PushFrame"
let en = this.getType(ei)    //通过名称拿encode函数对象
if (!en)
    return; //拿不到就返回空
let eo = en.encode(et).finish();  //拿到了就encode一下，拿到结果
```

​        我们可以根据分析在return出下断点，然后就能看到encode的编码了

![](https://attach.52pojie.cn/forum/202402/09/000625fgy56c62cz6yh3c6.png)

那逻辑其实相对比较清晰了，我们分析一下getType的逻辑是什么吧。我们刷新。

#### 四、关键函数分析

##### 1.getType分析

![](https://attach.52pojie.cn/forum/202402/09/000742ymwg7ye5boso1jvq.png)

里面其实蛮巧妙的，核心是中间几段代码

```
//通过正则替换类型字符串中Webcast或者OpenWebcast为空，保留剩下部分
eu.nl="/(^|\.)Webcast(Open)?/"
let en = ei.replace(eu.nl, "")

//取类型字符串关联的一些字符成数组eo
let eo = [et.relation[ei], et.relation[en], en, ei].filter(et=>et)

//这里et.typeHintPrefix固定为["webcast.im"]，然后和前面的eo拼接一些可能的对象调用关系
, eA = eo.map(ei=>et.typeHintPrefix.map(et=>`${et}.${ei}`)).reduce((et,ei)=>et.concat(ei)).concat(eo);
//eA=["webcast.im.PushFrame","webcast.im.PushFrame","PushFrame","PushFrame"]

//三元运算符不太好看，使用chatgpt我们转成if else更好分析
let ec = eA.reduce((et,ei)=>et && "function" == typeof et ? et : ei.split(".").reduce((et,ei)=>null == et ? void 0 : et[ei], this.root),void 0);
let ec = eA.reduce((et, ei) => {
  if (typeof et === "function") {
    return et;
  } else {
    let keys = ei.split(".");
    return keys.reduce((et, ei) => {
      if (et === null) {
        return undefined;
      } else {
        return et[ei];
      }
    }, this.root);
  }
}, undefined);
```

​        以下是gpt给的解释：

![](https://attach.52pojie.cn/forum/202402/09/000744vnzbhb5k2w0uwvkv.png)

​        我的一句话概括就是，拼接对象字符串，不断查找，直到查找到有符合的对象就返回此对象。

##### 2.this.root对象获取

​        可以注意到这里有个关键的对象：

​                                                     this.root

​        所需的加解密对象都是在this.root里面找的，所以我们看看this.root在哪里赋值的吧，其实我们到这里，是不是漏点了一个函数没看，我们直接点进了encode，漏掉的是 yield this.\_loadSchema()

![](https://attach.52pojie.cn/forum/202402/09/000746owlyzyvx99hvhuyx.png)

​        我们跟进去看看：

![](https://attach.52pojie.cn/forum/202402/09/000748q4fdeeeythmchtgh.png)

​        到这里，这个对象其实我们也就可以拿到了。拿到之后就相对简单了。那么怎么拿呢？

​        经过测试，其实刷新页面，会在下方这里被赋值，不再需要每次都赋值。

![](https://attach.52pojie.cn/forum/202402/09/000750p7s103xufanx032y.png)

​        我们放行到this.root赋值的地方：

![](https://attach.52pojie.cn/forum/202402/09/000753hm2c1b7udn7zrsi1.png)

​        点进去可以发现进入的js是一个webpack，包含了发送对象（webcast.im.PushFrame）的定义。我们全部复制出来到一个文件里面，然后折叠，慢慢展开一些主次部分。

![](https://attach.52pojie.cn/forum/202402/09/000755gnxnifnswjj3pw8f.png)

​        我们看看它用的是什么pb解析库的吧，在n出下断点。

![](https://attach.52pojie.cn/forum/202402/09/000757oaz3cezi5qzwy361.png)

​        通过关键词minimal protobuf 可以查到，其实它用的是protobufjs/minimal版本。

![](https://attach.52pojie.cn/forum/202402/09/000759smtkkezsmpsvfmdm.png)

​        我们直接npm install protobufjs就可以直接安装下来了。

![](https://attach.52pojie.cn/forum/202402/09/000801hoix8vmm6ymk577c.png)

​        和网页上是一致的，然后把中间自执行部分拿出来，就可以拿到this.root对象了

![](https://attach.52pojie.cn/forum/202402/09/000931wsh6n43n6hc4u7be.png)

​        是不是很容易还原了，当然这个js是可以直接调用的。

![](https://attach.52pojie.cn/forum/202402/09/000933lwx3m67wkfhwp12p.png)

​        可以发现和网页是一致的，当然如果你想js调用，这样已经完成了。但本次文章想还原proto文件。

#### 五、利用自写ast工具还原proto文件

​        以下是代码：

```
//babel库及文件模块导入
const fs = require('fs');

//babel库相关，解析，转换，构建，生产
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const generator = require("@babel/generator").default;

function get_jsonObjet(text){
    // 去除花括号和空格，只留下内部内容
    text = text.replace(/{|}/g, '').trim();
    // 使用正则表达式匹配键值对
    var regex = /(\d+):\s*\[["']([^"']+)["'],\s*([^,]+),\s*(\d+)\]/g;
    var jsonObject = {};
    var match;
    while ((match = regex.exec(text)) !== null) {
      var key = match[1];
      var name = match[2];
      var decodeFunction = match[3];
      var value = match[4];
      jsonObject[key] = [name, decodeFunction, parseInt(value)];
    }
    return jsonObject
}

function get_id_type(id_type){
    switch(id_type){
        case "int64String":
            id_type ="string";
            break;
        case "string":
            id_type ="string";
            break;
        case "int32":
            id_type = "int32";
            break;
        case "bool":
            id_type = "bool";
            break;
        case "uint64String":
            id_type ="string";
            break;
        case "bytes":
            id_type="bytes";
            break;
    }
    return id_type
}

function cut_type_text(input){
    // 使用split()将字符串分割成数组
    var parts = input.split('.');

    // 如果数组长度大于1，去掉结尾的'decode'，然后取中间部分；否则保留原始字符串
    var result = parts.length > 1 ? parts.slice(1).join('.') : input;

    // 如果结尾是'decode'，去掉它
    if (input.endsWith('decode')) {
      result = result.slice(0, -7); // 去掉最后的6个字符，即'.decode'
    }
    return result
}

function findDifferentElements(arr1, arr2) {
  // 找出在 arr1 中存在但在 arr2 中不存在的元素
  const differentInArr1 = arr1.filter(item => !arr2.includes(item));

  // 找出在 arr2 中存在但在 arr1 中不存在的元素
  const differentInArr2 = arr2.filter(item => !arr1.includes(item));

  // 将这两组不同的元素合并成一个数组
  const differentElements = differentInArr1.concat(differentInArr2);

  return differentElements;
}

const common_visitor={
    ObjectExpression(path,scope){
        text=path.toString()
        if (text!='{}'){
            jsonObject=get_jsonObjet(text)
        // key_data=JSON.parse(path.toString())
        referenceKeys = []
        for(i in jsonObject){
            id_st=''
            location=i
            id_name=jsonObject[i][0]
            id_type=get_id_type(cut_type_text(jsonObject[i][1]))
            if(msg_type_list[id_name] == 'Array'){
                id_st='repeated'
            }
            referenceKeys.push(id_name)
            // console.log(msg_name,'====>',`${id_st} ${id_type} ${id_name} = ${location}`)
            middle_str+=`            ${id_st} ${id_type} ${toSnakeCase(id_name)} = ${location};\n`
        }
        providedKeys = Object.keys(msg_type_list); // 获取提及的键
        differentElements = findDifferentElements(referenceKeys, providedKeys)
        }
    }
}

const map_msg_visitor={
    IfStatement(path,scope){
        if(path.node.test.type=='BinaryExpression' && path.node.test.operator =='==='){
            location=path.node.test.left.value
            id_name=path.node.consequent.body[0].expression.right.left.property.name
            // id_name=differentElements[0]
            id_type='map'
            id_type_list=[]
            path.traverse({
                SwitchCase(path2){
                    if(types.isLiteral(path2.node.test)){
                        temp=path2.node.consequent[0]
                        if(types.isExpressionStatement(temp)){
                            if(types.isCallExpression(temp.expression.right)){
                                id_type_code=generator(temp.expression.right.callee).code
                                id_type=get_id_type(cut_type_text(id_type_code))
                                // console.log(id_type)
                                id_type_list.push(id_type)
                            }
                        }

                    }
                }
            })
            middle_str+=`            map<${id_type_list.join(', ')}>`+` ${toSnakeCase(id_name)} = ${location};\n`
            // console.log(`map<${id_type_list.join(', ')}>`+` ${id_name} = ${location}`)
        }
    }
}

const mul_map_msg_visitor={
    SwitchStatement(path,scope){
        if (types.isIdentifier(path.node.discriminant)){
            // console.log(path.node.discriminant.name)
            switch_cases=path.node.cases
            for(sw of switch_cases){
                if(types.isLiteral(sw.test)){
                   // console.log(generator(ca).code)
                    consequent_list=sw.consequent
                    exp=consequent_list[0]
                    id_name=exp.expression.right.left.property.name
                    location=sw.test.value
                    // console.log(id_name,location)
                    //构造可解析的AST语法树才能traverse
                    sw_code='switch(x){'+generator(sw).code+'}'
                    // console.log(sw_code)
                    let sw_code_ast = parser.parse(sw_code);
                    traverse(sw_code_ast,{
                        SwitchStatement(path2,score){
                            if(types.isIdentifier(path2.node.discriminant))return;
                            //沿用上面的处理就可以了
                            id_type_list=[]
                            path2.traverse({
                                SwitchCase(path3){
                                    if(types.isLiteral(path3.node.test)){
                                        temp=path3.node.consequent[0]
                                        if(types.isExpressionStatement(temp)){
                                            if(types.isCallExpression(temp.expression.right)){
                                                id_type_code=generator(temp.expression.right.callee).code
                                                id_type=get_id_type(cut_type_text(id_type_code))
                                                // console.log(id_type)
                                                id_type_list.push(id_type)
                                            }
                                        }

                                    }
                                }
                            })
                        }
                    })
                    middle_str+=`            map<${id_type_list.join(', ')}>`+` ${toSnakeCase(id_name)} = ${location};\n`
                    // console.log(`map<${id_type_list.join(', ')}>`+` ${id_name} = ${location}`)
                }
            }
        }
    }
}

function toPascalCase(name) {
  return name.replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase());
}
function toSnakeCase(name) {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase();
}
//解决递归
function recursion(re_constructors,re_path){
  let elementToRemove = 'decode';
  let constructors_new = re_constructors.filter(item => item !== elementToRemove);
  // console.log(msg_name2,'=====>',constructors_new2)
  for(key_name of  constructors_new){
      // console.log(second_name)
      if(re_path.prototype){
          key_path=re_path.prototype.constructor[key_name]
      }
      else {
          key_path=re_path[key_name]
      }
      key_constructors=Object.keys(key_path.prototype.constructor)
      msg_type_list3={}
      msg_name3=toPascalCase(key_name)
      middle_str+=`            message ${msg_name3} {\n`
      result3=JSON.parse(JSON.stringify(key_path.prototype))
      // console.log(result)
      for(i in result3){
          if (Array.isArray(result3[i])) {
              msg_type_list[i]='Array'
              continue;
          }
          msg_type_list[i]= typeof result3[i]
      }
      // third_constructors=Object.keys(second_path.prototype.constructor)
      jscode3='!'+key_path.prototype.constructor.decode.toString()
      let ast3 = parser.parse(jscode3);
      traverse(ast3, common_visitor);
      if (differentElements.length > 0){
          if (differentElements.length ==1)
          {
              // console.log(msg_name, '====>', differentElements)
              traverse(ast3, map_msg_visitor);
          }else{
            // console.log(msg_name, '====>', differentElements)
            traverse(ast3,mul_map_msg_visitor);
          }
      }
      if(key_constructors.length>1 && !key_constructors.includes("encode")){
          recursion(key_constructors,key_path)
      }
      middle_str+='            }\n'
  }
}

//读取文件
let js_code = fs.readFileSync('code.js', {encoding: "utf-8"});
eval(js_code)
proto_str='syntax = "proto3";\n'
word="biz.webcast.im"
key_path_word_list=word.split('.')
repeact_num=key_path_word_list.length
path=protobuf.roots
for(key_path_word of key_path_word_list){
    path=path[key_path_word]
    proto_str+=`message ${key_path_word} {\n`
}
middle_str=''
msg_type_list={}
kk_path=path
rre_constructors=Object.keys(kk_path)
recursion(rre_constructors,kk_path)
proto_str+=`${middle_str}\n\n`
proto_str+='}\n'.repeat(repeact_num)
// console.log(proto_str)
fs.writeFile(`${word.replaceAll('.','_')}.proto`, proto_str, (err) => {});
```

​        然后核心就是对三种类型的js代码段进行了还原操作：common\_visitor，map\_msg\_visitor，mul\_map\_msg\_visitor

###### common\_visitor：这种列表类型的

![](https://attach.52pojie.cn/forum/202402/09/000936yfvff775og7qfc9g.png)

###### map\_msg\_visitor：（单个switch的）

![](https://attach.52pojie.cn/forum/202402/09/000938togfgetdefqqgtgz.png)

###### mul\_map\_msg\_visitor:(多个switch嵌套的)

![](https://attach.52pojie.cn/forum/202402/09/000940z1qqa9crdz000r31.png)

​        目前解决了这几种，比之前版本更完善了吧，map类型也可以解析出来了。

![](https://attach.52pojie.cn/forum/202402/09/000942j2p3pliz43at2vi2.png)

​        运行之后，就可以直接拿到相对还原的proto文件了。

![](https://attach.52pojie.cn/forum/202402/09/000944dz55q0qvlnbqvmnq.png)

​        基本上和网页一致，发送这部分可能会漏一些map类型，基本上是有的。

​        response中message部分，也是相同的方式处理，我不再继续分析了，如果评论呼声较高我会出一期视频讲解一下。

#### 六、代码地址及总结

​        代码地址：<https://github.com/Prince-cool/dy_protobuf>

​        改版后的dy弹幕相对更规整，每一个解析模块都是放在一个webpack里面的，之前是错综复杂很乱的。然后基本上proto文件内容基本不变，所以之前的也可继续使用。

​        希望这篇文章对你有益，希望我能重新回归正轨吧，祝大家新年快乐~

​
