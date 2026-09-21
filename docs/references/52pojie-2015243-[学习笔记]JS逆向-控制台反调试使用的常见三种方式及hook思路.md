# [学习笔记]JS逆向-控制台反调试使用的常见三种方式及hook思路

> **作者**: joekerr47 | **发布时间**: 2025-03-16 15:19:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4543 / 34
> **原文**: [https://www.52pojie.cn/thread-2015243-1-1.html](https://www.52pojie.cn/thread-2015243-1-1.html)

---

*本帖最后由 joekerr47 于 2025-3-16 16:33 编辑*

#### 一、JS逆向反调试技术-阻碍浏览器控制台使用的常见三种方式：

1. 窗口大小检测：通过检测当前浏览器实际窗口大小来执行关闭页面操作。

   * ```
     <script>
     function resize() {
      var target = 400;
      var heigth = window.outerHeight - window.innerHeight > target;
      if(heigth){
          window.close()
          debugger
      }
      setInterval(resize, 100)
     }
     </script>
     ```
2. 使用构造器断点：使用无限递归循环自执行函数进入无限断点。

   * ```
     <script>
     function check() {
     function docheck(a) {
      (function () {}['constructor']('debugger')())
      docheck(++a)
     }
     docheck(0)
     }
     check()
     </script>
     ```
3. 定时器：每隔 200 毫秒触发浏览器的debugger功能。

   * ```
     <script>
      function clock(){
          debugger
      };
      setInterval(clock, 500)
     </script>
     ```

提示：函数定义也会使用`fun1 = Function('debugger')`定义。

零时解决办法：

1. 可以在 `debugger` 对应行号右键点击 `一律不在此处暂停` 或点击 `添加条件断点`填加一个false条件。
2. 在进入方法前，改写执行 `debugger` 方法的逻辑。
3. 将debugger位置的文件替换为本地文件。

二、使用hook解决

调用constructor时判断传参是否为 `debugger` ，如果是就重写，如果不是就返回原方法。

* ```
  var _constructor = constructor;
  Function.prototype.constructor = function(d) {

  if (  d == "debugger") {
  console.log(d);
  return null;
  }
  return _constructor(d);
  }
  ```

  （在控制台使用时需注意当前栈是否为出现`debugger`位置）
