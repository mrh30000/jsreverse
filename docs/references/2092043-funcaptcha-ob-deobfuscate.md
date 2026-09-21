# funcaptcha类ob逆向解混淆处理

> **作者**: buluo533 | **发布时间**: 2026-02-14 12:50:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2225 / 1
> **原文**: [https://www.52pojie.cn/thread-2092043-1-1.html](https://www.52pojie.cn/thread-2092043-1-1.html)

---

本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责

demo 站点：aHR0cHM6Ly9zcGlkZXJhcGkuY24vY2FwdGNoYS9mdW5jYXB0Y2hhLw==
推荐验证码训练文章：aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2JvZW5kZWlkL2FydGljbGUvZGV0YWlscy8xNTY2MDY4Njk/c3BtPTEwMDEuMjAxNC4zMDAxLjU1MDE=

**本文主要做 ast 解混淆讲解，为开发通用 ob 解混淆器做准备，只涉及一些基础的逆向，方便定位分析**

**一、基础逆向**

![](https://attach.52pojie.cn/forum/202602/14/123018uu68utq9u9ncu9n1.png)

![](https://attach.52pojie.cn/forum/202602/14/123035ak1wwqkvggjzpzvv.png)

           这是一个验证码的盾，所以第一步我们得先看看他验证码图片的来源。最简单的方式就是加载出来后刷新图片，主动让他加载

![](https://attach.52pojie.cn/forum/202602/14/123116ya8hpgz1vgi8hi7m.png)

           可以看到加载的就是这一个接口<https://client-api.arkoselabs.com/fc/gfct/> ，这个就是验证码的来源

![](https://attach.52pojie.cn/forum/202602/14/123212x42q3qq3xo2qrgee.png)

          他有一个参数，刷新几次发现是动态更新的，这里可以复制 curl 本地去测试，直接搜搜先看看这个是怎么来的，是服务器返回或者是其他情况

![](https://attach.52pojie.cn/forum/202602/14/123411rbtbq2o82o29qli2.png)

![](https://attach.52pojie.cn/forum/202602/14/123423rzpqpakkefxepu1f.png)

         能看出来这是另一个接口的返回值，<https://client-api.arkoselabs.com/fc/gt2/public_key/3EE79F8D-13A6-474B-9278-448EA19F79B3>
       接下来就是分析这个接口的加密参数 bda，解混淆也是用于这个文件，跟栈很简单，加密逻辑在enforcement.cdeb82f474225dff1677448c6bc82e87.js 的文件中

![](https://attach.52pojie.cn/forum/202602/14/123508jv626jo5rfbtpznn.png)

**二、代码预处理**
       将代码取下来，观察整体的结构，整体就是一个类 ob，主要是多组特征

![](https://attach.52pojie.cn/forum/202602/14/123701w8g5ziikkxz7u8kb.png)

![](https://attach.52pojie.cn/forum/202602/14/123715yvs4q4safdpa44tp.png)

          会发现有很多这样先赋值，再去用变量名调用函数，这个会影响到我们后面解密函数的调用，所以我们需要在这里先去处理掉这个，这里的核心就是 scope 和 binding。首先理解这两个的一个概念。 **Scope (作用域):** 代表代码的一个区域（如函数、块级作用域），它负责收集该区域内定义的所有变量。
            **Binding (绑定):** 代表一个特定变量的“声明”与该变量在作用域内所有“引用”之间的连接。
**简单来说：**              Scope 是容器，装着所有的 Binding。Binding 记录了变量在哪里被定义，以及在哪里被使用。
               假设有代码：let a = 1; a = 2; console.log(a);，对于变量 a 的 Binding 对象：
                **binding.path**: 变量声明的 AST 路径（指向 let a = 1）。
                **binding.referenced**: true 或 false。变量是否被使用过？
                **binding.referencePaths**: 一个数组，包含所有使用该变量的 AST 路径（指向 console.log(a) 中的 a）。
                **binding.constant**: true 或 false。变量是否从未被重新赋值？
                **binding.constantViolations**: 一个数组，包含所有修改该变量的 AST 路径（指向 a = 2）。
         首先，ast 最重要的思路，也就是怎么去定位，怎么去处理。这里的话，我们可以看到，都是 var 的变量声明语句，同时右边，对应的语句的 init 节点都是数字，也就是NumericLiteral类型，同时可以看到他都被包裹在一个函数里面。

![](https://attach.52pojie.cn/forum/202602/14/124054no38hkzktrfcr83w.png)

          这样可以去定位到，然后再用绑定查找他被引用，也就是**binding.referencePaths**的方法，再进行一层替换。在替换时还需要去匹配调用的特征，也就是CallExpression 类型

![](https://attach.52pojie.cn/forum/202602/14/124130uglbxkhljxxgpg5b.png)

```
// 还原的基本框架在之前的一篇文章中
traverse(ast, {
  VariableDeclarator: function (path) {
    let {node, parentPath, scope} = path;
    // 判断是不是辅助语句
    if (!types.isVariableDeclaration(parentPath)) return;
    // 同时满足一边是Identifier类型，一般是NumericLiteral类型
    if (!types.isIdentifier(node.id) || !types.isNumericLiteral(node.init)) return;
    let name = node.id.name;
    let value = node.init.value;
    // 获取绑定
    let bindings = scope.getBinding(name);
    if (!bindings) return;
    bindings.referencePaths.forEach(function (re_path) {
      // 可以在这里去打印看看，这里的其实还是name的值，没有拿到函数函数调用
      let {parentPath} = re_path;
      // 我们知道这是在一个函数里面
      if (!types.isCallExpression(parentPath)) return
      // 他的值本身是一个Identifier，或者是等于name
      if (!types.isIdentifier(parentPath.node.callee)) return;
      // 直接替换
      parentPath.node.arguments[0] = types.numericLiteral(value);
      re_path.skip();
    })
    path.remove()
  }
})
```

         这样就可以实现基础的还原，看看效果

![](https://attach.52pojie.cn/forum/202602/14/124317dna1yzyvv16z14zy.png)

![](https://attach.52pojie.cn/forum/202602/14/124329e6t1xszsjoihshoc.png)

**三、ob 混淆特征处理**

```
function l() {
  var t = ["orted", "hesSel", "apply", "undefi", "matche", "9gmWyLK", "(((.+)", "8472CchwhG", "640232giirHG", "uctor", "toStri", "unknow", "search", "msMatc", "53350DLKijk", "1043Rkhvwx", "+)+)+$", "length", "765nORZzx", "ned", "509240FbRROQ", "ector", "constr", "86794nJKbSs", "unsupp", "29644JQRcdH", "33889BOoZEr"];
  return (l = function () {
    return t;
  })();
}
function p(t, e) {
  var r = l();
  return p = function (t, e) {
    return r[t -= 420];
  }, p(t, e);
}
!function (t, e) {
  for (var r = 441, n = 438, o = 420, i = 440, a = 435, c = 422, u = 430, s = 423, f = 433, l = 429, h = p, v = t();;) try {
    if (161193 === parseInt(h(r)) / 1 + parseInt(h(n)) / 2 * (-parseInt(h(o)) / 3) + -parseInt(h(i)) / 4 + parseInt(h(a)) / 5 + -parseInt(h(c)) / 6 * (parseInt(h(u)) / 7) + -parseInt(h(s)) / 8 + -parseInt(h(f)) / 9 * (-parseInt(h(l)) / 10)) break;
    v.push(v.shift());
  } catch (t) {
    v.push(v.shift());
  }
}(l)
```

          这是提取的一组funcaptcha 的混淆特征，包含了大数组，解密函数以及自执行的数组移位，还是先观察特征。我们发现，大数组的函数在数组移位和解密函数都有引用，是不是可以从大数组定位开始，去找他的绑定来定位其他两个函数的特征，从而存进内存，用于执行解密操作。

![](https://attach.52pojie.cn/forum/202602/14/124425ve4xx4bvx2l4o4lz.png)

      还是定位，直接上代码梭哈。

```
let array_string = ""
traverse(ast, {
    VariableDeclarator: function (path) {
        let {node, scope} = path;
        if (!types.isIdentifier(node.id) || !types.isArrayExpression(node.init)) return;
        // 大数组对象 判断是不是在函数内部
        let black_func = path.find(p => types.isFunctionDeclaration(p))
        if (!black_func) return;
        // 数组长度超过20
        if (node.init.elements.length < 20) return;
        array_string += black_func.toString() + "\r\n"
        let obj_name = black_func.node.id.name;
        // 获取绑定
        let bindings = scope.getBinding(obj_name);
        if (!bindings) return;
        bindings.referencePaths.forEach(function (re_path) {
            let expath = re_path.parentPath;
            // 判断是不是移位自执行函数
            if (types.isUnaryExpression(expath.parentPath)) {
                let shift_func = expath.parentPath;
                array_string += shift_func.toString() + "\r\n"
                // 解密函数定位
            } else if (types.isVariableDeclarator(expath.parentPath)) {
                let de_func = expath.find(p => types.isFunctionDeclaration(p));
                array_string += de_func.toString() + "\r\n"
            }
        })
    }
})
// 写入看看情况
fs.writeFileSync("./funcaptcha混淆特征.js", array_string)
```

![](https://attach.52pojie.cn/forum/202602/14/124502vpw6mqmz07p1dzu1.png)

    没毛病，应该把所有的 ob 混淆特征都成功的拿到了。接下来就是收藏所有的解密函数名称，用于去查找还原。还是在这个基础上去优化代码。
    这样就实现了最基本的字符串还原脚本。

```
let defunc_name
// ob特征写入内存
traverse(ast, {
  VariableDeclarator: function (path) {
    let array_string = ""
    let {node, scope} = path;
    if (!types.isIdentifier(node.id) || !types.isArrayExpression(node.init)) return;
    // 大数组对象
    let black_func = path.find(p => types.isFunctionDeclaration(p))
    if (!black_func) return;
    if (node.init.elements.length < 20) return;
    array_string += black_func.toString() + "\r\n"
    let obj_name = black_func.node.id.name;
    let bindings = scope.getBinding(obj_name);
    if (!bindings) return;
    bindings.referencePaths.forEach(function (re_path) {
      let expath = re_path.parentPath;
      // 判断是不是移位自执行函数
      if (types.isUnaryExpression(expath.parentPath)) {
        let shift_func = expath.parentPath;
        array_string += shift_func.toString() + "\r\n"
        // 解密函数定位
      } else if (types.isVariableDeclarator(expath.parentPath)) {
        let de_func = expath.find(p => types.isFunctionDeclaration(p));
        array_string += de_func.toString() + "\r\n"
        defunc_name = de_func.node.id.name;
      }
    })
    // 将ob特征存进内存
    eval(array_string)
    // 解密函数的绑定
    let binding = bindings.scope.getBinding(defunc_name);
    if (!binding) return;
    binding.referencePaths.forEach(function (re_path) {
      let expath = re_path.parentPath;
      if (!types.isVariableDeclarator(expath)) return;
      let other_name = expath.node.id.name;
      let func_binding = re_path.scope.getBinding(other_name)
      if (!func_binding) return;
      func_binding.referencePaths.forEach(function (ref_path) {
        let pa_path = ref_path.parentPath;
        // 这里过滤掉的可能就有另一层赋值
        if (!types.isCallExpression(pa_path)) return
        let args = pa_path.node.arguments[0].value;
        // 计算结果
        let value = eval(defunc_name).apply(null, [args])
        console.log(pa_path.toString(), "----->", value)
        pa_path.replaceWith(types.valueToNode(value))
      })
    })
  }
})
```

![](https://attach.52pojie.cn/forum/202602/14/124550rmtlesxulqus811v.png)

       酷酷输出，但是结果一看还是有一点小问题。这里的代码只有一层的赋值，代码中解密函数存在不停的去嵌套赋值，我们还需要一个函数，去深层获取所有的赋值操作

```
function traceAndReplace(currentName, scope, decryptFn) {
  let binding = scope.getBinding(currentName);
  if (!binding) return;
  binding.referencePaths.forEach(refPath => {
    let parentPath = refPath.parentPath;
    // 递归追踪
    if (types.isVariableDeclarator(parentPath) && types.isIdentifier(parentPath.node.id)) {
      let nextName = parentPath.node.id.name;
      traceAndReplace(nextName, parentPath.scope, decryptFn);
      parentPath.remove();
    } else if (types.isCallExpression(parentPath) && parentPath.node.callee === refPath.node) {
      try {
        // 仅处理参数为常量的调用，避免执行出错
        if (parentPath.node.arguments.length == 1) {
          let args = parentPath.get('arguments').map(arg => arg.evaluate().value);
          let result = decryptFn.apply(null, args);
          console.log(`${parentPath.toString()} ----> ${result}`);
          parentPath.replaceWith(types.valueToNode(result));
        }
      } catch (e) {
      }
    }
  });
}
```

      这样我们就搞定了funcaptcha 的字符串类 ob 混淆，先看看目前的成品吧

![](https://attach.52pojie.cn/forum/202602/14/124707cbttz4b22knnbq22.png)

![](https://attach.52pojie.cn/forum/202602/14/124720uff47df46h5zzb5r.png)

**四、总结**
 funcaptcha的混淆难度整体不大，算法也不算太难，大佬们可以尝试继续还原剩下的两个点，一个是还原后字符串的拼接和ob特征的垃圾代码删除。这里也祝所有论坛的大佬，小伙伴们新年快乐，马到成功{:1\_932:}
