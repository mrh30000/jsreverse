// 最小化 eval/Function 剥离: 只删 debugger 语句, 不做 toString 伪装 / 不包装每个函数。
// 上一版把每个新建函数都 defineProperty('toString') 反而打坏了站方 JSVMP。
(() => {
  var strip = (s) =>
    typeof s === "string" ? s.replace(/\bdebugger\b[ \t]*;?/g, "") : s;
  try {
    var _eval = window.eval;
    var ev = (x) => _eval.call(window, strip(x));
    ev.toString = () => "" + _eval;
    Object.defineProperty(window, "eval", {
      value: ev,
      configurable: true,
      writable: true,
    });
  } catch (e) {}
  try {
    var _F = window.Function;
    var Fn = function () {
      var a = Array.prototype.slice.call(arguments);
      if (a.length) a[a.length - 1] = strip(a[a.length - 1]);
      return _F.apply(null, a);
    };
    Fn.prototype = _F.prototype;
    try {
      Object.setPrototypeOf(Fn, _F);
    } catch (e) {}
    Fn.toString = () => "" + _F;
    Object.defineProperty(window, "Function", {
      value: Fn,
      configurable: true,
      writable: true,
    });
  } catch (e) {}
})();
