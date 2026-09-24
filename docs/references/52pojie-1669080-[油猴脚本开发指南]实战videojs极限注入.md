# [油猴脚本开发指南]实战videojs极限注入

> **作者**: 李恒道 | **发布时间**: 2022-07-31 00:35:00 | **版块**: 『编程语言区』 | **查看/回复**: 7513 / 139
> **原文**: [https://www.52pojie.cn/thread-1669080-1-1.html](https://www.52pojie.cn/thread-1669080-1-1.html)

---

*本帖最后由 李恒道 于 2022-7-31 00:39 编辑*

**前文**
超星更新后的网页
在beforesetup和setup的钩都给强制return了
导致无法再次使用钩子
所以我观察源码搞了一个注入的操作
感谢 [@涛之雨](https://www.52pojie.cn/home.php?mod=space&uid=879080) 在我迷茫的时候每天对我喊精神语录
在此对涛之雨大佬致以最崇高的敬意
涛，这是什么时代！
**开始**
之前的hooks已经失效了，那我们在初始化阶段几乎没有什么可以插手的地方了

[JavaScript] *纯文本查看*

```

  hooks('beforesetup').forEach(function (hookFunction) {
        var opts = hookFunction(el, mergeOptions$3(options));

        if (!isObject$1(opts) || Array.isArray(opts)) {
          log$1.error('please return an object in beforesetup hooks');
          return;
        }

        options = mergeOptions$3(options, opts);
      }); // We get the current "Player" component here in case an integration has
      // replaced it with a custom player.

      var PlayerComponent = Component$1.getComponent('Player');
      player = new PlayerComponent(el, options, ready);
      hooks('setup').forEach(function (hookFunction) {
        return hookFunction(player);
      });
```

hooks钩的地方可以全部排除了
那我们唯一能下手的地方就是更核心的地方
也就是Component$1.getComponent函数
我们先观察一下他的源码

[JavaScript] *纯文本查看*

```

 Component.getComponent = function getComponent(name) {
        if (!name || !Component.components_) {
          return;
        }

        return Component.components_[name];
      };
```

这里判断是否为空，或者保存组件的位置是否为空，如果都不为空，则返回对应的名字
也就是说Player保存在Component.components\_['Player']中
那我们需要设置的，就是对components\_进行设置
全局搜索Component.components\_以及查阅官方文档
可以找到这里

![](https://attach.52pojie.cn/forum/202207/31/003359df8he1q28rdtjd7t.png)

查阅官方文档可以发现，这里是注册组件的地方
那么思路来了，我们可不可以注册Player函数？
阅读源码开始！

[JavaScript] *纯文本查看*

```

if (typeof name !== 'string' || !name) {

     throw new Error("Illegal component name, \"" + name + "\"; must be a non-empty string.");

}
```

判断名字异常，可以跳过

[JavaScript] *纯文本查看*

```

         var Tech = Component.getComponent('Tech'); // We need to make sure this check is only done if Tech has been registered.

        var isTech = Tech && Tech.isTech(ComponentToRegister);
        var isComp = Component === ComponentToRegister || Component.prototype.isPrototypeOf(ComponentToRegister.prototype);

        if (isTech || !isComp) {
          var reason;

          if (isTech) {
            reason = 'techs must be registered using Tech.registerTech()';
          } else {
            reason = 'must be a Component subclass';
          }

          throw new Error("Illegal component, \"" + name + "\"; " + reason + ".");
        }
```

这里通过原型链判断是否继承与Comp组件或者继承于Tech组件

[JavaScript] *纯文本查看*

```

  name = toTitleCase$1(name);

 if (!Component.components_) {

       Component.components_ = {};

 }
```

name函数经过某些处理，然后对components\_如果不存在则进行初始化

[JavaScript] *纯文本查看*

```

var Player = Component.getComponent('Player');
```

获取Player组件

[JavaScript] *纯文本查看*

```

        if (name === 'Player' && Player && Player.players) {
          var players = Player.players;
          var playerNames = Object.keys(players); // If we have players that were disposed, then their name will still be
          // in Players.players. So, we must loop through and verify that the value
          // for each item is not null. This allows registration of the Player component
          // after all players have been disposed or before any were created.

          if (players && playerNames.length > 0 && playerNames.map(function (pname) {
            return players[pname];
          }).every(Boolean)) {
            throw new Error('Can not register Player component after player has been created.');
          }
        }
```

这里判断了Player地方进行了处理，可以看到首先判断名字是否是Player
然后判断Player是否为空，如果不为空，则继续判断players是否存在
三者都存在的时候才禁止替换Player组件
也就是说我们可以对其进行组件替换
这里可以看出来Vidoejs的设计非常优秀，对大部分的功能做了一个组件化的抽离和替换。

[JavaScript] *纯文本查看*

```

        Component.components_[name] = ComponentToRegister;

        Component.components_[toLowerCase(name)] = ComponentToRegister;

        return ComponentToRegister;
```

然后非常简单，对其组件进行赋值了
理论建立完毕，开始实战

[JavaScript] *纯文本查看*

```

let OriginPlayer = _videojs.getComponent('Player')
let woailiyinhe=function(tag, options, ready){这里做原OriginPlayer的对象生成，返回，处理}
woailiyinhe.prototype=Object.create(OriginPlayer.prototype)
videojs.registerComponent('Player',woailiyinhe)
```

这里因为是tm脚本，所以我直接上了一个prototype替换，按道理其实官方更推荐用class类，但是那就要做语法转换了，所以hook偷了个懒
劫持完毕之后我们就可以完美的劫持Player初始化前后的操作了！
