// preload v2: strip `debugger` from every runtime-generated code path
// (eval / new Function / inline <script> injection used by JSVMP loaders)
(() => {
  const strip = (s) =>
    typeof s === "string" && s.indexOf("debugger") !== -1
      ? s.replace(/\bdebugger\b/g, ";")
      : s;
  const native = (fn, name) => {
    try {
      Object.defineProperty(fn, "toString", {
        value: () => `function ${name}() { [native code] }`,
        configurable: true,
        writable: true,
        enumerable: false,
      });
    } catch {}
    return fn;
  };

  // 1. eval
  const _eval = window.eval;
  window.eval = native(function (code) {
    return _eval.call(this, strip(code));
  }, "eval");

  // 2. new Function / Function('...')
  const _Function = Function;
  const FunctionProto = _Function.prototype;
  function FunctionPatched(...args) {
    return native(_Function.apply(this, args.map(strip)), "anonymous");
  }
  FunctionPatched.prototype = FunctionProto;
  Object.setPrototypeOf(FunctionPatched, _Function);
  Object.defineProperty(window, "Function", {
    value: FunctionPatched,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(FunctionProto, "constructor", {
    value: FunctionPatched,
    writable: true,
    configurable: true,
  });

  // 3. inline <script> injection (createElement + textContent/appendChild)
  const descText = Object.getOwnPropertyDescriptor(
    HTMLScriptElement.prototype,
    "text",
  );
  if (descText && descText.set) {
    Object.defineProperty(HTMLScriptElement.prototype, "text", {
      ...descText,
      set(v) {
        descText.set.call(this, strip(v));
      },
    });
  }
  for (const proto of [Node.prototype, Element.prototype]) {
    const d = Object.getOwnPropertyDescriptor(proto, "textContent");
    if (d && d.set) {
      Object.defineProperty(proto, "textContent", {
        ...d,
        set(v) {
          if (this && this.tagName === "SCRIPT") d.set.call(this, strip(v));
          else d.set.call(this, v);
        },
      });
    }
  }
  const _append = Node.prototype.appendChild;
  Node.prototype.appendChild = native(function (node) {
    try {
      if (
        node &&
        node.tagName === "SCRIPT" &&
        typeof node.textContent === "string"
      ) {
        const s = strip(node.textContent);
        if (s !== node.textContent) node.textContent = s;
      }
    } catch {}
    return _append.call(this, node);
  }, "appendChild");
  const _insert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = native(function (node, ref) {
    try {
      if (
        node &&
        node.tagName === "SCRIPT" &&
        typeof node.textContent === "string"
      ) {
        const s = strip(node.textContent);
        if (s !== node.textContent) node.textContent = s;
      }
    } catch {}
    return _insert.call(this, node, ref);
  }, "insertBefore");

  // 4. timers that re-fire debugger
  const _setInterval = window.setInterval;
  window.setInterval = native(function (fn, ms, ...rest) {
    if (typeof fn === "function") {
      try {
        const src = _Function.prototype.toString.call(fn);
        if (src.indexOf("debugger") !== -1)
          fn = FunctionPatched("return " + src)();
      } catch {}
    }
    return _setInterval.call(
      this,
      typeof fn === "string" ? strip(fn) : fn,
      ms,
      ...rest,
    );
  }, "setInterval");
})();
