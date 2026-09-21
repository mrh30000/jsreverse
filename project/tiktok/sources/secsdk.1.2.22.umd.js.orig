/*!
* @byted/secsdk v1.2.22
* (c) 2024
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.secsdk = {}));
})(this, (function (exports) { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var _typeof_1$1 = createCommonjsModule(function (module) {
	  function _typeof(o) {
	    "@babel/helpers - typeof";

	    return (module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
	      return typeof o;
	    } : function (o) {
	      return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	    }, module.exports.__esModule = true, module.exports["default"] = module.exports), _typeof(o);
	  }
	  module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	var _typeof$1 = unwrapExports(_typeof_1$1);

	var check = function check(it) {
	  return it && it.Math === Math && it;
	};

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	var global_1 =
	// eslint-disable-next-line es/no-global-this -- safe
	check((typeof globalThis === "undefined" ? "undefined" : _typeof$1(globalThis)) == 'object' && globalThis) || check((typeof window === "undefined" ? "undefined" : _typeof$1(window)) == 'object' && window) ||
	// eslint-disable-next-line no-restricted-globals -- safe
	check((typeof self === "undefined" ? "undefined" : _typeof$1(self)) == 'object' && self) || check(_typeof$1(commonjsGlobal) == 'object' && commonjsGlobal) || check(_typeof$1(commonjsGlobal) == 'object' && commonjsGlobal) ||
	// eslint-disable-next-line no-new-func -- fallback
	function () {
	  return this;
	}() || Function('return this')();

	var fails = function fails(exec) {
	  try {
	    return !!exec();
	  } catch (error) {
	    return true;
	  }
	};

	// Detect IE8's incomplete defineProperty implementation
	var descriptors = !fails(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty({}, 1, {
	    get: function get() {
	      return 7;
	    }
	  })[1] !== 7;
	});

	var functionBindNative = !fails(function () {
	  // eslint-disable-next-line es/no-function-prototype-bind -- safe
	  var test = function () {/* empty */}.bind();
	  // eslint-disable-next-line no-prototype-builtins -- safe
	  return typeof test != 'function' || test.hasOwnProperty('prototype');
	});

	var call$2 = Function.prototype.call;
	var functionCall = functionBindNative ? call$2.bind(call$2) : function () {
	  return call$2.apply(call$2, arguments);
	};

	var $propertyIsEnumerable = {}.propertyIsEnumerable;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor$2 = Object.getOwnPropertyDescriptor;

	// Nashorn ~ JDK8 bug
	var NASHORN_BUG = getOwnPropertyDescriptor$2 && !$propertyIsEnumerable.call({
	  1: 2
	}, 1);

	// `Object.prototype.propertyIsEnumerable` method implementation
	// https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
	var f$6 = NASHORN_BUG ? function propertyIsEnumerable(V) {
	  var descriptor = getOwnPropertyDescriptor$2(this, V);
	  return !!descriptor && descriptor.enumerable;
	} : $propertyIsEnumerable;
	var objectPropertyIsEnumerable = {
	  f: f$6
	};

	var createPropertyDescriptor = function createPropertyDescriptor(bitmap, value) {
	  return {
	    enumerable: !(bitmap & 1),
	    configurable: !(bitmap & 2),
	    writable: !(bitmap & 4),
	    value: value
	  };
	};

	var FunctionPrototype$2 = Function.prototype;
	var call$1 = FunctionPrototype$2.call;
	var uncurryThisWithBind = functionBindNative && FunctionPrototype$2.bind.bind(call$1, call$1);
	var functionUncurryThis = functionBindNative ? uncurryThisWithBind : function (fn) {
	  return function () {
	    return call$1.apply(fn, arguments);
	  };
	};

	var toString$1 = functionUncurryThis({}.toString);
	var stringSlice$3 = functionUncurryThis(''.slice);
	var classofRaw = function classofRaw(it) {
	  return stringSlice$3(toString$1(it), 8, -1);
	};

	var $Object$4 = Object;
	var split$3 = functionUncurryThis(''.split);

	// fallback for non-array-like ES3 and non-enumerable old V8 strings
	var indexedObject = fails(function () {
	  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
	  // eslint-disable-next-line no-prototype-builtins -- safe
	  return !$Object$4('z').propertyIsEnumerable(0);
	}) ? function (it) {
	  return classofRaw(it) === 'String' ? split$3(it, '') : $Object$4(it);
	} : $Object$4;

	// we can't use just `it == null` since of `document.all` special case
	// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot-aec
	var isNullOrUndefined = function isNullOrUndefined(it) {
	  return it === null || it === undefined;
	};

	var $TypeError$c = TypeError;

	// `RequireObjectCoercible` abstract operation
	// https://tc39.es/ecma262/#sec-requireobjectcoercible
	var requireObjectCoercible = function requireObjectCoercible(it) {
	  if (isNullOrUndefined(it)) throw new $TypeError$c("Can't call method on " + it);
	  return it;
	};

	// toObject with fallback for non-array-like ES3 strings

	var toIndexedObject = function toIndexedObject(it) {
	  return indexedObject(requireObjectCoercible(it));
	};

	var documentAll = (typeof document === "undefined" ? "undefined" : _typeof$1(document)) == 'object' && document.all;

	// `IsCallable` abstract operation
	// https://tc39.es/ecma262/#sec-iscallable
	// eslint-disable-next-line unicorn/no-typeof-undefined -- required for testing
	var isCallable = typeof documentAll == 'undefined' && documentAll !== undefined ? function (argument) {
	  return typeof argument == 'function' || argument === documentAll;
	} : function (argument) {
	  return typeof argument == 'function';
	};

	var isObject = function isObject(it) {
	  return _typeof$1(it) == 'object' ? it !== null : isCallable(it);
	};

	var aFunction = function aFunction(argument) {
	  return isCallable(argument) ? argument : undefined;
	};
	var getBuiltIn = function getBuiltIn(namespace, method) {
	  return arguments.length < 2 ? aFunction(global_1[namespace]) : global_1[namespace] && global_1[namespace][method];
	};

	var objectIsPrototypeOf = functionUncurryThis({}.isPrototypeOf);

	var engineUserAgent = typeof navigator != 'undefined' && String(navigator.userAgent) || '';

	var process$3 = global_1.process;
	var Deno$1 = global_1.Deno;
	var versions = process$3 && process$3.versions || Deno$1 && Deno$1.version;
	var v8 = versions && versions.v8;
	var match, version$1;
	if (v8) {
	  match = v8.split('.');
	  // in old Chrome, versions of V8 isn't V8 = Chrome / 10
	  // but their correct versions are not interesting for us
	  version$1 = match[0] > 0 && match[0] < 4 ? 1 : +(match[0] + match[1]);
	}

	// BrowserFS NodeJS `process` polyfill incorrectly set `.v8` to `0.0`
	// so check `userAgent` even if `.v8` exists, but 0
	if (!version$1 && engineUserAgent) {
	  match = engineUserAgent.match(/Edge\/(\d+)/);
	  if (!match || match[1] >= 74) {
	    match = engineUserAgent.match(/Chrome\/(\d+)/);
	    if (match) version$1 = +match[1];
	  }
	}
	var engineV8Version = version$1;

	/* eslint-disable es/no-symbol -- required for testing */

	var $String$4 = global_1.String;

	// eslint-disable-next-line es/no-object-getownpropertysymbols -- required for testing
	var symbolConstructorDetection = !!Object.getOwnPropertySymbols && !fails(function () {
	  var symbol = Symbol('symbol detection');
	  // Chrome 38 Symbol has incorrect toString conversion
	  // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
	  // nb: Do not call `String` directly to avoid this being optimized out to `symbol+''` which will,
	  // of course, fail.
	  return !$String$4(symbol) || !(Object(symbol) instanceof Symbol) ||
	  // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
	  !Symbol.sham && engineV8Version && engineV8Version < 41;
	});

	/* eslint-disable es/no-symbol -- required for testing */

	var useSymbolAsUid = symbolConstructorDetection && !Symbol.sham && _typeof$1(Symbol.iterator) == 'symbol';

	var $Object$3 = Object;
	var isSymbol = useSymbolAsUid ? function (it) {
	  return _typeof$1(it) == 'symbol';
	} : function (it) {
	  var $Symbol = getBuiltIn('Symbol');
	  return isCallable($Symbol) && objectIsPrototypeOf($Symbol.prototype, $Object$3(it));
	};

	var $String$3 = String;
	var tryToString = function tryToString(argument) {
	  try {
	    return $String$3(argument);
	  } catch (error) {
	    return 'Object';
	  }
	};

	var $TypeError$b = TypeError;

	// `Assert: IsCallable(argument) is true`
	var aCallable = function aCallable(argument) {
	  if (isCallable(argument)) return argument;
	  throw new $TypeError$b(tryToString(argument) + ' is not a function');
	};

	// `GetMethod` abstract operation
	// https://tc39.es/ecma262/#sec-getmethod
	var getMethod = function getMethod(V, P) {
	  var func = V[P];
	  return isNullOrUndefined(func) ? undefined : aCallable(func);
	};

	var $TypeError$a = TypeError;

	// `OrdinaryToPrimitive` abstract operation
	// https://tc39.es/ecma262/#sec-ordinarytoprimitive
	var ordinaryToPrimitive = function ordinaryToPrimitive(input, pref) {
	  var fn, val;
	  if (pref === 'string' && isCallable(fn = input.toString) && !isObject(val = functionCall(fn, input))) return val;
	  if (isCallable(fn = input.valueOf) && !isObject(val = functionCall(fn, input))) return val;
	  if (pref !== 'string' && isCallable(fn = input.toString) && !isObject(val = functionCall(fn, input))) return val;
	  throw new $TypeError$a("Can't convert object to primitive value");
	};

	var isPure = false;

	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var defineProperty$5 = Object.defineProperty;
	var defineGlobalProperty = function defineGlobalProperty(key, value) {
	  try {
	    defineProperty$5(global_1, key, {
	      value: value,
	      configurable: true,
	      writable: true
	    });
	  } catch (error) {
	    global_1[key] = value;
	  }
	  return value;
	};

	var SHARED = '__core-js_shared__';
	var store$1 = global_1[SHARED] || defineGlobalProperty(SHARED, {});
	var sharedStore = store$1;

	var shared = createCommonjsModule(function (module) {

	  (module.exports = function (key, value) {
	    return sharedStore[key] || (sharedStore[key] = value !== undefined ? value : {});
	  })('versions', []).push({
	    version: '3.35.0',
	    mode: 'global',
	    copyright: '© 2014-2023 Denis Pushkarev (zloirock.ru)',
	    license: 'https://github.com/zloirock/core-js/blob/v3.35.0/LICENSE',
	    source: 'https://github.com/zloirock/core-js'
	  });
	});

	var $Object$2 = Object;

	// `ToObject` abstract operation
	// https://tc39.es/ecma262/#sec-toobject
	var toObject = function toObject(argument) {
	  return $Object$2(requireObjectCoercible(argument));
	};

	var hasOwnProperty = functionUncurryThis({}.hasOwnProperty);

	// `HasOwnProperty` abstract operation
	// https://tc39.es/ecma262/#sec-hasownproperty
	// eslint-disable-next-line es/no-object-hasown -- safe
	var hasOwnProperty_1 = Object.hasOwn || function hasOwn(it, key) {
	  return hasOwnProperty(toObject(it), key);
	};

	var id = 0;
	var postfix = Math.random();
	var toString = functionUncurryThis(1.0.toString);
	var uid = function uid(key) {
	  return 'Symbol(' + (key === undefined ? '' : key) + ')_' + toString(++id + postfix, 36);
	};

	var _Symbol = global_1.Symbol;
	var WellKnownSymbolsStore = shared('wks');
	var createWellKnownSymbol = useSymbolAsUid ? _Symbol['for'] || _Symbol : _Symbol && _Symbol.withoutSetter || uid;
	var wellKnownSymbol = function wellKnownSymbol(name) {
	  if (!hasOwnProperty_1(WellKnownSymbolsStore, name)) {
	    WellKnownSymbolsStore[name] = symbolConstructorDetection && hasOwnProperty_1(_Symbol, name) ? _Symbol[name] : createWellKnownSymbol('Symbol.' + name);
	  }
	  return WellKnownSymbolsStore[name];
	};

	var $TypeError$9 = TypeError;
	var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');

	// `ToPrimitive` abstract operation
	// https://tc39.es/ecma262/#sec-toprimitive
	var toPrimitive = function toPrimitive(input, pref) {
	  if (!isObject(input) || isSymbol(input)) return input;
	  var exoticToPrim = getMethod(input, TO_PRIMITIVE);
	  var result;
	  if (exoticToPrim) {
	    if (pref === undefined) pref = 'default';
	    result = functionCall(exoticToPrim, input, pref);
	    if (!isObject(result) || isSymbol(result)) return result;
	    throw new $TypeError$9("Can't convert object to primitive value");
	  }
	  if (pref === undefined) pref = 'number';
	  return ordinaryToPrimitive(input, pref);
	};

	// `ToPropertyKey` abstract operation
	// https://tc39.es/ecma262/#sec-topropertykey
	var toPropertyKey = function toPropertyKey(argument) {
	  var key = toPrimitive(argument, 'string');
	  return isSymbol(key) ? key : key + '';
	};

	var document$3 = global_1.document;
	// typeof document.createElement is 'object' in old IE
	var EXISTS$1 = isObject(document$3) && isObject(document$3.createElement);
	var documentCreateElement = function documentCreateElement(it) {
	  return EXISTS$1 ? document$3.createElement(it) : {};
	};

	// Thanks to IE8 for its funny defineProperty
	var ie8DomDefine = !descriptors && !fails(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty(documentCreateElement('div'), 'a', {
	    get: function get() {
	      return 7;
	    }
	  }).a !== 7;
	});

	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var $getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

	// `Object.getOwnPropertyDescriptor` method
	// https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
	var f$5 = descriptors ? $getOwnPropertyDescriptor$1 : function getOwnPropertyDescriptor(O, P) {
	  O = toIndexedObject(O);
	  P = toPropertyKey(P);
	  if (ie8DomDefine) try {
	    return $getOwnPropertyDescriptor$1(O, P);
	  } catch (error) {/* empty */}
	  if (hasOwnProperty_1(O, P)) return createPropertyDescriptor(!functionCall(objectPropertyIsEnumerable.f, O, P), O[P]);
	};
	var objectGetOwnPropertyDescriptor = {
	  f: f$5
	};

	// V8 ~ Chrome 36-
	// https://bugs.chromium.org/p/v8/issues/detail?id=3334
	var v8PrototypeDefineBug = descriptors && fails(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty(function () {/* empty */}, 'prototype', {
	    value: 42,
	    writable: false
	  }).prototype !== 42;
	});

	var $String$2 = String;
	var $TypeError$8 = TypeError;

	// `Assert: Type(argument) is Object`
	var anObject = function anObject(argument) {
	  if (isObject(argument)) return argument;
	  throw new $TypeError$8($String$2(argument) + ' is not an object');
	};

	var $TypeError$7 = TypeError;
	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var $defineProperty = Object.defineProperty;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	var ENUMERABLE = 'enumerable';
	var CONFIGURABLE$1 = 'configurable';
	var WRITABLE = 'writable';

	// `Object.defineProperty` method
	// https://tc39.es/ecma262/#sec-object.defineproperty
	var f$4 = descriptors ? v8PrototypeDefineBug ? function defineProperty(O, P, Attributes) {
	  anObject(O);
	  P = toPropertyKey(P);
	  anObject(Attributes);
	  if (typeof O === 'function' && P === 'prototype' && 'value' in Attributes && WRITABLE in Attributes && !Attributes[WRITABLE]) {
	    var current = $getOwnPropertyDescriptor(O, P);
	    if (current && current[WRITABLE]) {
	      O[P] = Attributes.value;
	      Attributes = {
	        configurable: CONFIGURABLE$1 in Attributes ? Attributes[CONFIGURABLE$1] : current[CONFIGURABLE$1],
	        enumerable: ENUMERABLE in Attributes ? Attributes[ENUMERABLE] : current[ENUMERABLE],
	        writable: false
	      };
	    }
	  }
	  return $defineProperty(O, P, Attributes);
	} : $defineProperty : function defineProperty(O, P, Attributes) {
	  anObject(O);
	  P = toPropertyKey(P);
	  anObject(Attributes);
	  if (ie8DomDefine) try {
	    return $defineProperty(O, P, Attributes);
	  } catch (error) {/* empty */}
	  if ('get' in Attributes || 'set' in Attributes) throw new $TypeError$7('Accessors not supported');
	  if ('value' in Attributes) O[P] = Attributes.value;
	  return O;
	};
	var objectDefineProperty = {
	  f: f$4
	};

	var createNonEnumerableProperty = descriptors ? function (object, key, value) {
	  return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
	} : function (object, key, value) {
	  object[key] = value;
	  return object;
	};

	var FunctionPrototype$1 = Function.prototype;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getDescriptor = descriptors && Object.getOwnPropertyDescriptor;
	var EXISTS = hasOwnProperty_1(FunctionPrototype$1, 'name');
	// additional protection from minified / mangled / dropped function names
	var PROPER = EXISTS && function something() {/* empty */}.name === 'something';
	var CONFIGURABLE = EXISTS && (!descriptors || descriptors && getDescriptor(FunctionPrototype$1, 'name').configurable);
	var functionName = {
	  EXISTS: EXISTS,
	  PROPER: PROPER,
	  CONFIGURABLE: CONFIGURABLE
	};

	var functionToString = functionUncurryThis(Function.toString);

	// this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
	if (!isCallable(sharedStore.inspectSource)) {
	  sharedStore.inspectSource = function (it) {
	    return functionToString(it);
	  };
	}
	var inspectSource = sharedStore.inspectSource;

	var WeakMap$1 = global_1.WeakMap;
	var weakMapBasicDetection = isCallable(WeakMap$1) && /native code/.test(String(WeakMap$1));

	var keys = shared('keys');
	var sharedKey = function sharedKey(key) {
	  return keys[key] || (keys[key] = uid(key));
	};

	var hiddenKeys$1 = {};

	var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
	var TypeError$4 = global_1.TypeError;
	var WeakMap = global_1.WeakMap;
	var set$1, get, has;
	var enforce = function enforce(it) {
	  return has(it) ? get(it) : set$1(it, {});
	};
	var getterFor = function getterFor(TYPE) {
	  return function (it) {
	    var state;
	    if (!isObject(it) || (state = get(it)).type !== TYPE) {
	      throw new TypeError$4('Incompatible receiver, ' + TYPE + ' required');
	    }
	    return state;
	  };
	};
	if (weakMapBasicDetection || sharedStore.state) {
	  var store = sharedStore.state || (sharedStore.state = new WeakMap());
	  /* eslint-disable no-self-assign -- prototype methods protection */
	  store.get = store.get;
	  store.has = store.has;
	  store.set = store.set;
	  /* eslint-enable no-self-assign -- prototype methods protection */
	  set$1 = function set(it, metadata) {
	    if (store.has(it)) throw new TypeError$4(OBJECT_ALREADY_INITIALIZED);
	    metadata.facade = it;
	    store.set(it, metadata);
	    return metadata;
	  };
	  get = function get(it) {
	    return store.get(it) || {};
	  };
	  has = function has(it) {
	    return store.has(it);
	  };
	} else {
	  var STATE = sharedKey('state');
	  hiddenKeys$1[STATE] = true;
	  set$1 = function set(it, metadata) {
	    if (hasOwnProperty_1(it, STATE)) throw new TypeError$4(OBJECT_ALREADY_INITIALIZED);
	    metadata.facade = it;
	    createNonEnumerableProperty(it, STATE, metadata);
	    return metadata;
	  };
	  get = function get(it) {
	    return hasOwnProperty_1(it, STATE) ? it[STATE] : {};
	  };
	  has = function has(it) {
	    return hasOwnProperty_1(it, STATE);
	  };
	}
	var internalState = {
	  set: set$1,
	  get: get,
	  has: has,
	  enforce: enforce,
	  getterFor: getterFor
	};

	var makeBuiltIn_1 = createCommonjsModule(function (module) {

	  var CONFIGURABLE_FUNCTION_NAME = functionName.CONFIGURABLE;
	  var enforceInternalState = internalState.enforce;
	  var getInternalState = internalState.get;
	  var $String = String;
	  // eslint-disable-next-line es/no-object-defineproperty -- safe
	  var defineProperty = Object.defineProperty;
	  var stringSlice = functionUncurryThis(''.slice);
	  var replace = functionUncurryThis(''.replace);
	  var join = functionUncurryThis([].join);
	  var CONFIGURABLE_LENGTH = descriptors && !fails(function () {
	    return defineProperty(function () {/* empty */}, 'length', {
	      value: 8
	    }).length !== 8;
	  });
	  var TEMPLATE = String(String).split('String');
	  var makeBuiltIn = module.exports = function (value, name, options) {
	    if (stringSlice($String(name), 0, 7) === 'Symbol(') {
	      name = '[' + replace($String(name), /^Symbol\(([^)]*)\)/, '$1') + ']';
	    }
	    if (options && options.getter) name = 'get ' + name;
	    if (options && options.setter) name = 'set ' + name;
	    if (!hasOwnProperty_1(value, 'name') || CONFIGURABLE_FUNCTION_NAME && value.name !== name) {
	      if (descriptors) defineProperty(value, 'name', {
	        value: name,
	        configurable: true
	      });else value.name = name;
	    }
	    if (CONFIGURABLE_LENGTH && options && hasOwnProperty_1(options, 'arity') && value.length !== options.arity) {
	      defineProperty(value, 'length', {
	        value: options.arity
	      });
	    }
	    try {
	      if (options && hasOwnProperty_1(options, 'constructor') && options.constructor) {
	        if (descriptors) defineProperty(value, 'prototype', {
	          writable: false
	        });
	        // in V8 ~ Chrome 53, prototypes of some methods, like `Array.prototype.values`, are non-writable
	      } else if (value.prototype) value.prototype = undefined;
	    } catch (error) {/* empty */}
	    var state = enforceInternalState(value);
	    if (!hasOwnProperty_1(state, 'source')) {
	      state.source = join(TEMPLATE, typeof name == 'string' ? name : '');
	    }
	    return value;
	  };

	  // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
	  // eslint-disable-next-line no-extend-native -- required
	  Function.prototype.toString = makeBuiltIn(function toString() {
	    return isCallable(this) && getInternalState(this).source || inspectSource(this);
	  }, 'toString');
	});

	var defineBuiltIn = function defineBuiltIn(O, key, value, options) {
	  if (!options) options = {};
	  var simple = options.enumerable;
	  var name = options.name !== undefined ? options.name : key;
	  if (isCallable(value)) makeBuiltIn_1(value, name, options);
	  if (options.global) {
	    if (simple) O[key] = value;else defineGlobalProperty(key, value);
	  } else {
	    try {
	      if (!options.unsafe) delete O[key];else if (O[key]) simple = true;
	    } catch (error) {/* empty */}
	    if (simple) O[key] = value;else objectDefineProperty.f(O, key, {
	      value: value,
	      enumerable: false,
	      configurable: !options.nonConfigurable,
	      writable: !options.nonWritable
	    });
	  }
	  return O;
	};

	var ceil = Math.ceil;
	var floor$3 = Math.floor;

	// `Math.trunc` method
	// https://tc39.es/ecma262/#sec-math.trunc
	// eslint-disable-next-line es/no-math-trunc -- safe
	var mathTrunc = Math.trunc || function trunc(x) {
	  var n = +x;
	  return (n > 0 ? floor$3 : ceil)(n);
	};

	// `ToIntegerOrInfinity` abstract operation
	// https://tc39.es/ecma262/#sec-tointegerorinfinity
	var toIntegerOrInfinity = function toIntegerOrInfinity(argument) {
	  var number = +argument;
	  // eslint-disable-next-line no-self-compare -- NaN check
	  return number !== number || number === 0 ? 0 : mathTrunc(number);
	};

	var max = Math.max;
	var min$1 = Math.min;

	// Helper for a popular repeating case of the spec:
	// Let integer be ? ToInteger(index).
	// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
	var toAbsoluteIndex = function toAbsoluteIndex(index, length) {
	  var integer = toIntegerOrInfinity(index);
	  return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
	};

	var min = Math.min;

	// `ToLength` abstract operation
	// https://tc39.es/ecma262/#sec-tolength
	var toLength = function toLength(argument) {
	  return argument > 0 ? min(toIntegerOrInfinity(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
	};

	// `LengthOfArrayLike` abstract operation
	// https://tc39.es/ecma262/#sec-lengthofarraylike
	var lengthOfArrayLike = function lengthOfArrayLike(obj) {
	  return toLength(obj.length);
	};

	// `Array.prototype.{ indexOf, includes }` methods implementation
	var createMethod$2 = function createMethod(IS_INCLUDES) {
	  return function ($this, el, fromIndex) {
	    var O = toIndexedObject($this);
	    var length = lengthOfArrayLike(O);
	    var index = toAbsoluteIndex(fromIndex, length);
	    var value;
	    // Array#includes uses SameValueZero equality algorithm
	    // eslint-disable-next-line no-self-compare -- NaN check
	    if (IS_INCLUDES && el !== el) while (length > index) {
	      value = O[index++];
	      // eslint-disable-next-line no-self-compare -- NaN check
	      if (value !== value) return true;
	      // Array#indexOf ignores holes, Array#includes - not
	    } else for (; length > index; index++) {
	      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
	    }
	    return !IS_INCLUDES && -1;
	  };
	};
	var arrayIncludes = {
	  // `Array.prototype.includes` method
	  // https://tc39.es/ecma262/#sec-array.prototype.includes
	  includes: createMethod$2(true),
	  // `Array.prototype.indexOf` method
	  // https://tc39.es/ecma262/#sec-array.prototype.indexof
	  indexOf: createMethod$2(false)
	};

	var indexOf = arrayIncludes.indexOf;
	var push$6 = functionUncurryThis([].push);
	var objectKeysInternal = function objectKeysInternal(object, names) {
	  var O = toIndexedObject(object);
	  var i = 0;
	  var result = [];
	  var key;
	  for (key in O) !hasOwnProperty_1(hiddenKeys$1, key) && hasOwnProperty_1(O, key) && push$6(result, key);
	  // Don't enum bug & hidden keys
	  while (names.length > i) if (hasOwnProperty_1(O, key = names[i++])) {
	    ~indexOf(result, key) || push$6(result, key);
	  }
	  return result;
	};

	// IE8- don't enum bug keys
	var enumBugKeys = ['constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf'];

	var hiddenKeys = enumBugKeys.concat('length', 'prototype');

	// `Object.getOwnPropertyNames` method
	// https://tc39.es/ecma262/#sec-object.getownpropertynames
	// eslint-disable-next-line es/no-object-getownpropertynames -- safe
	var f$3 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
	  return objectKeysInternal(O, hiddenKeys);
	};
	var objectGetOwnPropertyNames = {
	  f: f$3
	};

	// eslint-disable-next-line es/no-object-getownpropertysymbols -- safe
	var f$2 = Object.getOwnPropertySymbols;
	var objectGetOwnPropertySymbols = {
	  f: f$2
	};

	var concat$1 = functionUncurryThis([].concat);

	// all object keys, includes non-enumerable and symbols
	var ownKeys = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
	  var keys = objectGetOwnPropertyNames.f(anObject(it));
	  var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
	  return getOwnPropertySymbols ? concat$1(keys, getOwnPropertySymbols(it)) : keys;
	};

	var copyConstructorProperties = function copyConstructorProperties(target, source, exceptions) {
	  var keys = ownKeys(source);
	  var defineProperty = objectDefineProperty.f;
	  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
	  for (var i = 0; i < keys.length; i++) {
	    var key = keys[i];
	    if (!hasOwnProperty_1(target, key) && !(exceptions && hasOwnProperty_1(exceptions, key))) {
	      defineProperty(target, key, getOwnPropertyDescriptor(source, key));
	    }
	  }
	};

	var replacement = /#|\.prototype\./;
	var isForced = function isForced(feature, detection) {
	  var value = data[normalize(feature)];
	  return value === POLYFILL ? true : value === NATIVE ? false : isCallable(detection) ? fails(detection) : !!detection;
	};
	var normalize = isForced.normalize = function (string) {
	  return String(string).replace(replacement, '.').toLowerCase();
	};
	var data = isForced.data = {};
	var NATIVE = isForced.NATIVE = 'N';
	var POLYFILL = isForced.POLYFILL = 'P';
	var isForced_1 = isForced;

	var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;

	/*
	  options.target         - name of the target object
	  options.global         - target is the global object
	  options.stat           - export as static methods of target
	  options.proto          - export as prototype methods of target
	  options.real           - real prototype method for the `pure` version
	  options.forced         - export even if the native feature is available
	  options.bind           - bind methods to the target, required for the `pure` version
	  options.wrap           - wrap constructors to preventing global pollution, required for the `pure` version
	  options.unsafe         - use the simple assignment of property instead of delete + defineProperty
	  options.sham           - add a flag to not completely full polyfills
	  options.enumerable     - export as enumerable property
	  options.dontCallGetSet - prevent calling a getter on target
	  options.name           - the .name of the function if it does not match the key
	*/
	var _export = function _export(options, source) {
	  var TARGET = options.target;
	  var GLOBAL = options.global;
	  var STATIC = options.stat;
	  var FORCED, target, key, targetProperty, sourceProperty, descriptor;
	  if (GLOBAL) {
	    target = global_1;
	  } else if (STATIC) {
	    target = global_1[TARGET] || defineGlobalProperty(TARGET, {});
	  } else {
	    target = (global_1[TARGET] || {}).prototype;
	  }
	  if (target) for (key in source) {
	    sourceProperty = source[key];
	    if (options.dontCallGetSet) {
	      descriptor = getOwnPropertyDescriptor$1(target, key);
	      targetProperty = descriptor && descriptor.value;
	    } else targetProperty = target[key];
	    FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
	    // contained in target
	    if (!FORCED && targetProperty !== undefined) {
	      if (_typeof$1(sourceProperty) == _typeof$1(targetProperty)) continue;
	      copyConstructorProperties(sourceProperty, targetProperty);
	    }
	    // add a flag to not completely full polyfills
	    if (options.sham || targetProperty && targetProperty.sham) {
	      createNonEnumerableProperty(sourceProperty, 'sham', true);
	    }
	    defineBuiltIn(target, key, sourceProperty, options);
	  }
	};

	var correctPrototypeGetter = !fails(function () {
	  function F() {/* empty */}
	  F.prototype.constructor = null;
	  // eslint-disable-next-line es/no-object-getprototypeof -- required for testing
	  return Object.getPrototypeOf(new F()) !== F.prototype;
	});

	var IE_PROTO$1 = sharedKey('IE_PROTO');
	var $Object$1 = Object;
	var ObjectPrototype = $Object$1.prototype;

	// `Object.getPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.getprototypeof
	// eslint-disable-next-line es/no-object-getprototypeof -- safe
	var objectGetPrototypeOf = correctPrototypeGetter ? $Object$1.getPrototypeOf : function (O) {
	  var object = toObject(O);
	  if (hasOwnProperty_1(object, IE_PROTO$1)) return object[IE_PROTO$1];
	  var constructor = object.constructor;
	  if (isCallable(constructor) && object instanceof constructor) {
	    return constructor.prototype;
	  }
	  return object instanceof $Object$1 ? ObjectPrototype : null;
	};

	var functionUncurryThisAccessor = function functionUncurryThisAccessor(object, key, method) {
	  try {
	    // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	    return functionUncurryThis(aCallable(Object.getOwnPropertyDescriptor(object, key)[method]));
	  } catch (error) {/* empty */}
	};

	var isPossiblePrototype = function isPossiblePrototype(argument) {
	  return isObject(argument) || argument === null;
	};

	var $String$1 = String;
	var $TypeError$6 = TypeError;
	var aPossiblePrototype = function aPossiblePrototype(argument) {
	  if (isPossiblePrototype(argument)) return argument;
	  throw new $TypeError$6("Can't set " + $String$1(argument) + ' as a prototype');
	};

	/* eslint-disable no-proto -- safe */

	// `Object.setPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.setprototypeof
	// Works with __proto__ only. Old v8 can't work with null proto objects.
	// eslint-disable-next-line es/no-object-setprototypeof -- safe
	var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
	  var CORRECT_SETTER = false;
	  var test = {};
	  var setter;
	  try {
	    setter = functionUncurryThisAccessor(Object.prototype, '__proto__', 'set');
	    setter(test, []);
	    CORRECT_SETTER = test instanceof Array;
	  } catch (error) {/* empty */}
	  return function setPrototypeOf(O, proto) {
	    anObject(O);
	    aPossiblePrototype(proto);
	    if (CORRECT_SETTER) setter(O, proto);else O.__proto__ = proto;
	    return O;
	  };
	}() : undefined);

	// `Object.keys` method
	// https://tc39.es/ecma262/#sec-object.keys
	// eslint-disable-next-line es/no-object-keys -- safe
	var objectKeys = Object.keys || function keys(O) {
	  return objectKeysInternal(O, enumBugKeys);
	};

	// `Object.defineProperties` method
	// https://tc39.es/ecma262/#sec-object.defineproperties
	// eslint-disable-next-line es/no-object-defineproperties -- safe
	var f$1 = descriptors && !v8PrototypeDefineBug ? Object.defineProperties : function defineProperties(O, Properties) {
	  anObject(O);
	  var props = toIndexedObject(Properties);
	  var keys = objectKeys(Properties);
	  var length = keys.length;
	  var index = 0;
	  var key;
	  while (length > index) objectDefineProperty.f(O, key = keys[index++], props[key]);
	  return O;
	};
	var objectDefineProperties = {
	  f: f$1
	};

	var html = getBuiltIn('document', 'documentElement');

	/* global ActiveXObject -- old IE, WSH */

	var GT = '>';
	var LT = '<';
	var PROTOTYPE = 'prototype';
	var SCRIPT = 'script';
	var IE_PROTO = sharedKey('IE_PROTO');
	var EmptyConstructor = function EmptyConstructor() {/* empty */};
	var scriptTag = function scriptTag(content) {
	  return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
	};

	// Create object with fake `null` prototype: use ActiveX Object with cleared prototype
	var NullProtoObjectViaActiveX = function NullProtoObjectViaActiveX(activeXDocument) {
	  activeXDocument.write(scriptTag(''));
	  activeXDocument.close();
	  var temp = activeXDocument.parentWindow.Object;
	  activeXDocument = null; // avoid memory leak
	  return temp;
	};

	// Create object with fake `null` prototype: use iframe Object with cleared prototype
	var NullProtoObjectViaIFrame = function NullProtoObjectViaIFrame() {
	  // Thrash, waste and sodomy: IE GC bug
	  var iframe = documentCreateElement('iframe');
	  var JS = 'java' + SCRIPT + ':';
	  var iframeDocument;
	  iframe.style.display = 'none';
	  html.appendChild(iframe);
	  // https://github.com/zloirock/core-js/issues/475
	  iframe.src = String(JS);
	  iframeDocument = iframe.contentWindow.document;
	  iframeDocument.open();
	  iframeDocument.write(scriptTag('document.F=Object'));
	  iframeDocument.close();
	  return iframeDocument.F;
	};

	// Check for document.domain and active x support
	// No need to use active x approach when document.domain is not set
	// see https://github.com/es-shims/es5-shim/issues/150
	// variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
	// avoid IE GC bug
	var activeXDocument;
	var _NullProtoObject = function NullProtoObject() {
	  try {
	    activeXDocument = new ActiveXObject('htmlfile');
	  } catch (error) {/* ignore */}
	  _NullProtoObject = typeof document != 'undefined' ? document.domain && activeXDocument ? NullProtoObjectViaActiveX(activeXDocument) // old IE
	  : NullProtoObjectViaIFrame() : NullProtoObjectViaActiveX(activeXDocument); // WSH
	  var length = enumBugKeys.length;
	  while (length--) delete _NullProtoObject[PROTOTYPE][enumBugKeys[length]];
	  return _NullProtoObject();
	};
	hiddenKeys$1[IE_PROTO] = true;

	// `Object.create` method
	// https://tc39.es/ecma262/#sec-object.create
	// eslint-disable-next-line es/no-object-create -- safe
	var objectCreate = Object.create || function create(O, Properties) {
	  var result;
	  if (O !== null) {
	    EmptyConstructor[PROTOTYPE] = anObject(O);
	    result = new EmptyConstructor();
	    EmptyConstructor[PROTOTYPE] = null;
	    // add "__proto__" for Object.getPrototypeOf polyfill
	    result[IE_PROTO] = O;
	  } else result = _NullProtoObject();
	  return Properties === undefined ? result : objectDefineProperties.f(result, Properties);
	};

	// `InstallErrorCause` abstract operation
	// https://tc39.es/proposal-error-cause/#sec-errorobjects-install-error-cause
	var installErrorCause = function installErrorCause(O, options) {
	  if (isObject(options) && 'cause' in options) {
	    createNonEnumerableProperty(O, 'cause', options.cause);
	  }
	};

	var $Error$1 = Error;
	var replace$3 = functionUncurryThis(''.replace);
	var TEST = function (arg) {
	  return String(new $Error$1(arg).stack);
	}('zxcasd');
	// eslint-disable-next-line redos/no-vulnerable -- safe
	var V8_OR_CHAKRA_STACK_ENTRY = /\n\s*at [^:]*:[^\n]*/;
	var IS_V8_OR_CHAKRA_STACK = V8_OR_CHAKRA_STACK_ENTRY.test(TEST);
	var errorStackClear = function errorStackClear(stack, dropEntries) {
	  if (IS_V8_OR_CHAKRA_STACK && typeof stack == 'string' && !$Error$1.prepareStackTrace) {
	    while (dropEntries--) stack = replace$3(stack, V8_OR_CHAKRA_STACK_ENTRY, '');
	  }
	  return stack;
	};

	var errorStackInstallable = !fails(function () {
	  var error = new Error('a');
	  if (!('stack' in error)) return true;
	  // eslint-disable-next-line es/no-object-defineproperty -- safe
	  Object.defineProperty(error, 'stack', createPropertyDescriptor(1, 7));
	  return error.stack !== 7;
	});

	// non-standard V8
	var captureStackTrace = Error.captureStackTrace;
	var errorStackInstall = function errorStackInstall(error, C, stack, dropEntries) {
	  if (errorStackInstallable) {
	    if (captureStackTrace) captureStackTrace(error, C);else createNonEnumerableProperty(error, 'stack', errorStackClear(stack, dropEntries));
	  }
	};

	var functionUncurryThisClause = function functionUncurryThisClause(fn) {
	  // Nashorn bug:
	  //   https://github.com/zloirock/core-js/issues/1128
	  //   https://github.com/zloirock/core-js/issues/1130
	  if (classofRaw(fn) === 'Function') return functionUncurryThis(fn);
	};

	var bind$1 = functionUncurryThisClause(functionUncurryThisClause.bind);

	// optional / simple context binding
	var functionBindContext = function functionBindContext(fn, that) {
	  aCallable(fn);
	  return that === undefined ? fn : functionBindNative ? bind$1(fn, that) : function /* ...args */
	  () {
	    return fn.apply(that, arguments);
	  };
	};

	var iterators = {};

	var ITERATOR$7 = wellKnownSymbol('iterator');
	var ArrayPrototype$1 = Array.prototype;

	// check on default Array iterator
	var isArrayIteratorMethod = function isArrayIteratorMethod(it) {
	  return it !== undefined && (iterators.Array === it || ArrayPrototype$1[ITERATOR$7] === it);
	};

	var TO_STRING_TAG$3 = wellKnownSymbol('toStringTag');
	var test = {};
	test[TO_STRING_TAG$3] = 'z';
	var toStringTagSupport = String(test) === '[object z]';

	var TO_STRING_TAG$2 = wellKnownSymbol('toStringTag');
	var $Object = Object;

	// ES3 wrong here
	var CORRECT_ARGUMENTS = classofRaw(function () {
	  return arguments;
	}()) === 'Arguments';

	// fallback for IE11 Script Access Denied error
	var tryGet = function tryGet(it, key) {
	  try {
	    return it[key];
	  } catch (error) {/* empty */}
	};

	// getting tag from ES6+ `Object.prototype.toString`
	var classof = toStringTagSupport ? classofRaw : function (it) {
	  var O, tag, result;
	  return it === undefined ? 'Undefined' : it === null ? 'Null'
	  // @@toStringTag case
	  : typeof (tag = tryGet(O = $Object(it), TO_STRING_TAG$2)) == 'string' ? tag
	  // builtinTag case
	  : CORRECT_ARGUMENTS ? classofRaw(O)
	  // ES3 arguments fallback
	  : (result = classofRaw(O)) === 'Object' && isCallable(O.callee) ? 'Arguments' : result;
	};

	var ITERATOR$6 = wellKnownSymbol('iterator');
	var getIteratorMethod = function getIteratorMethod(it) {
	  if (!isNullOrUndefined(it)) return getMethod(it, ITERATOR$6) || getMethod(it, '@@iterator') || iterators[classof(it)];
	};

	var $TypeError$5 = TypeError;
	var getIterator = function getIterator(argument, usingIterator) {
	  var iteratorMethod = arguments.length < 2 ? getIteratorMethod(argument) : usingIterator;
	  if (aCallable(iteratorMethod)) return anObject(functionCall(iteratorMethod, argument));
	  throw new $TypeError$5(tryToString(argument) + ' is not iterable');
	};

	var iteratorClose = function iteratorClose(iterator, kind, value) {
	  var innerResult, innerError;
	  anObject(iterator);
	  try {
	    innerResult = getMethod(iterator, 'return');
	    if (!innerResult) {
	      if (kind === 'throw') throw value;
	      return value;
	    }
	    innerResult = functionCall(innerResult, iterator);
	  } catch (error) {
	    innerError = true;
	    innerResult = error;
	  }
	  if (kind === 'throw') throw value;
	  if (innerError) throw innerResult;
	  anObject(innerResult);
	  return value;
	};

	var $TypeError$4 = TypeError;
	var Result = function Result(stopped, result) {
	  this.stopped = stopped;
	  this.result = result;
	};
	var ResultPrototype = Result.prototype;
	var iterate = function iterate(iterable, unboundFunction, options) {
	  var that = options && options.that;
	  var AS_ENTRIES = !!(options && options.AS_ENTRIES);
	  var IS_RECORD = !!(options && options.IS_RECORD);
	  var IS_ITERATOR = !!(options && options.IS_ITERATOR);
	  var INTERRUPTED = !!(options && options.INTERRUPTED);
	  var fn = functionBindContext(unboundFunction, that);
	  var iterator, iterFn, index, length, result, next, step;
	  var stop = function stop(condition) {
	    if (iterator) iteratorClose(iterator, 'normal', condition);
	    return new Result(true, condition);
	  };
	  var callFn = function callFn(value) {
	    if (AS_ENTRIES) {
	      anObject(value);
	      return INTERRUPTED ? fn(value[0], value[1], stop) : fn(value[0], value[1]);
	    }
	    return INTERRUPTED ? fn(value, stop) : fn(value);
	  };
	  if (IS_RECORD) {
	    iterator = iterable.iterator;
	  } else if (IS_ITERATOR) {
	    iterator = iterable;
	  } else {
	    iterFn = getIteratorMethod(iterable);
	    if (!iterFn) throw new $TypeError$4(tryToString(iterable) + ' is not iterable');
	    // optimisation for array iterators
	    if (isArrayIteratorMethod(iterFn)) {
	      for (index = 0, length = lengthOfArrayLike(iterable); length > index; index++) {
	        result = callFn(iterable[index]);
	        if (result && objectIsPrototypeOf(ResultPrototype, result)) return result;
	      }
	      return new Result(false);
	    }
	    iterator = getIterator(iterable, iterFn);
	  }
	  next = IS_RECORD ? iterable.next : iterator.next;
	  while (!(step = functionCall(next, iterator)).done) {
	    try {
	      result = callFn(step.value);
	    } catch (error) {
	      iteratorClose(iterator, 'throw', error);
	    }
	    if (_typeof$1(result) == 'object' && result && objectIsPrototypeOf(ResultPrototype, result)) return result;
	  }
	  return new Result(false);
	};

	var $String = String;
	var toString_1 = function toString_1(argument) {
	  if (classof(argument) === 'Symbol') throw new TypeError('Cannot convert a Symbol value to a string');
	  return $String(argument);
	};

	var normalizeStringArgument = function normalizeStringArgument(argument, $default) {
	  return argument === undefined ? arguments.length < 2 ? '' : $default : toString_1(argument);
	};

	var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag');
	var $Error = Error;
	var push$5 = [].push;
	var $AggregateError = function AggregateError(errors, message /* , options */) {
	  var isInstance = objectIsPrototypeOf(AggregateErrorPrototype, this);
	  var that;
	  if (objectSetPrototypeOf) {
	    that = objectSetPrototypeOf(new $Error(), isInstance ? objectGetPrototypeOf(this) : AggregateErrorPrototype);
	  } else {
	    that = isInstance ? this : objectCreate(AggregateErrorPrototype);
	    createNonEnumerableProperty(that, TO_STRING_TAG$1, 'Error');
	  }
	  if (message !== undefined) createNonEnumerableProperty(that, 'message', normalizeStringArgument(message));
	  errorStackInstall(that, $AggregateError, that.stack, 1);
	  if (arguments.length > 2) installErrorCause(that, arguments[2]);
	  var errorsArray = [];
	  iterate(errors, push$5, {
	    that: errorsArray
	  });
	  createNonEnumerableProperty(that, 'errors', errorsArray);
	  return that;
	};
	if (objectSetPrototypeOf) objectSetPrototypeOf($AggregateError, $Error);else copyConstructorProperties($AggregateError, $Error, {
	  name: true
	});
	var AggregateErrorPrototype = $AggregateError.prototype = objectCreate($Error.prototype, {
	  constructor: createPropertyDescriptor(1, $AggregateError),
	  message: createPropertyDescriptor(1, ''),
	  name: createPropertyDescriptor(1, 'AggregateError')
	});

	// `AggregateError` constructor
	// https://tc39.es/ecma262/#sec-aggregate-error-constructor
	_export({
	  global: true,
	  constructor: true,
	  arity: 2
	}, {
	  AggregateError: $AggregateError
	});

	var defineProperty$4 = objectDefineProperty.f;
	var UNSCOPABLES = wellKnownSymbol('unscopables');
	var ArrayPrototype = Array.prototype;

	// Array.prototype[@@unscopables]
	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	if (ArrayPrototype[UNSCOPABLES] === undefined) {
	  defineProperty$4(ArrayPrototype, UNSCOPABLES, {
	    configurable: true,
	    value: objectCreate(null)
	  });
	}

	// add a key to Array.prototype[@@unscopables]
	var addToUnscopables = function addToUnscopables(key) {
	  ArrayPrototype[UNSCOPABLES][key] = true;
	};

	var ITERATOR$5 = wellKnownSymbol('iterator');
	var BUGGY_SAFARI_ITERATORS$1 = false;

	// `%IteratorPrototype%` object
	// https://tc39.es/ecma262/#sec-%iteratorprototype%-object
	var IteratorPrototype$2, PrototypeOfArrayIteratorPrototype, arrayIterator;

	/* eslint-disable es/no-array-prototype-keys -- safe */
	if ([].keys) {
	  arrayIterator = [].keys();
	  // Safari 8 has buggy iterators w/o `next`
	  if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS$1 = true;else {
	    PrototypeOfArrayIteratorPrototype = objectGetPrototypeOf(objectGetPrototypeOf(arrayIterator));
	    if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype$2 = PrototypeOfArrayIteratorPrototype;
	  }
	}
	var NEW_ITERATOR_PROTOTYPE = !isObject(IteratorPrototype$2) || fails(function () {
	  var test = {};
	  // FF44- legacy iterators case
	  return IteratorPrototype$2[ITERATOR$5].call(test) !== test;
	});
	if (NEW_ITERATOR_PROTOTYPE) IteratorPrototype$2 = {};

	// `%IteratorPrototype%[@@iterator]()` method
	// https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
	if (!isCallable(IteratorPrototype$2[ITERATOR$5])) {
	  defineBuiltIn(IteratorPrototype$2, ITERATOR$5, function () {
	    return this;
	  });
	}
	var iteratorsCore = {
	  IteratorPrototype: IteratorPrototype$2,
	  BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS$1
	};

	var defineProperty$3 = objectDefineProperty.f;
	var TO_STRING_TAG = wellKnownSymbol('toStringTag');
	var setToStringTag = function setToStringTag(target, TAG, STATIC) {
	  if (target && !STATIC) target = target.prototype;
	  if (target && !hasOwnProperty_1(target, TO_STRING_TAG)) {
	    defineProperty$3(target, TO_STRING_TAG, {
	      configurable: true,
	      value: TAG
	    });
	  }
	};

	var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;
	var returnThis$1 = function returnThis() {
	  return this;
	};
	var iteratorCreateConstructor = function iteratorCreateConstructor(IteratorConstructor, NAME, next, ENUMERABLE_NEXT) {
	  var TO_STRING_TAG = NAME + ' Iterator';
	  IteratorConstructor.prototype = objectCreate(IteratorPrototype$1, {
	    next: createPropertyDescriptor(+!ENUMERABLE_NEXT, next)
	  });
	  setToStringTag(IteratorConstructor, TO_STRING_TAG, false);
	  iterators[TO_STRING_TAG] = returnThis$1;
	  return IteratorConstructor;
	};

	var PROPER_FUNCTION_NAME = functionName.PROPER;
	var CONFIGURABLE_FUNCTION_NAME = functionName.CONFIGURABLE;
	var IteratorPrototype = iteratorsCore.IteratorPrototype;
	var BUGGY_SAFARI_ITERATORS = iteratorsCore.BUGGY_SAFARI_ITERATORS;
	var ITERATOR$4 = wellKnownSymbol('iterator');
	var KEYS = 'keys';
	var VALUES = 'values';
	var ENTRIES = 'entries';
	var returnThis = function returnThis() {
	  return this;
	};
	var iteratorDefine = function iteratorDefine(Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
	  iteratorCreateConstructor(IteratorConstructor, NAME, next);
	  var getIterationMethod = function getIterationMethod(KIND) {
	    if (KIND === DEFAULT && defaultIterator) return defaultIterator;
	    if (!BUGGY_SAFARI_ITERATORS && KIND && KIND in IterablePrototype) return IterablePrototype[KIND];
	    switch (KIND) {
	      case KEYS:
	        return function keys() {
	          return new IteratorConstructor(this, KIND);
	        };
	      case VALUES:
	        return function values() {
	          return new IteratorConstructor(this, KIND);
	        };
	      case ENTRIES:
	        return function entries() {
	          return new IteratorConstructor(this, KIND);
	        };
	    }
	    return function () {
	      return new IteratorConstructor(this);
	    };
	  };
	  var TO_STRING_TAG = NAME + ' Iterator';
	  var INCORRECT_VALUES_NAME = false;
	  var IterablePrototype = Iterable.prototype;
	  var nativeIterator = IterablePrototype[ITERATOR$4] || IterablePrototype['@@iterator'] || DEFAULT && IterablePrototype[DEFAULT];
	  var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
	  var anyNativeIterator = NAME === 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
	  var CurrentIteratorPrototype, methods, KEY;

	  // fix native
	  if (anyNativeIterator) {
	    CurrentIteratorPrototype = objectGetPrototypeOf(anyNativeIterator.call(new Iterable()));
	    if (CurrentIteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
	      if (objectGetPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
	        if (objectSetPrototypeOf) {
	          objectSetPrototypeOf(CurrentIteratorPrototype, IteratorPrototype);
	        } else if (!isCallable(CurrentIteratorPrototype[ITERATOR$4])) {
	          defineBuiltIn(CurrentIteratorPrototype, ITERATOR$4, returnThis);
	        }
	      }
	      // Set @@toStringTag to native iterators
	      setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true);
	    }
	  }

	  // fix Array.prototype.{ values, @@iterator }.name in V8 / FF
	  if (PROPER_FUNCTION_NAME && DEFAULT === VALUES && nativeIterator && nativeIterator.name !== VALUES) {
	    if (CONFIGURABLE_FUNCTION_NAME) {
	      createNonEnumerableProperty(IterablePrototype, 'name', VALUES);
	    } else {
	      INCORRECT_VALUES_NAME = true;
	      defaultIterator = function values() {
	        return functionCall(nativeIterator, this);
	      };
	    }
	  }

	  // export additional methods
	  if (DEFAULT) {
	    methods = {
	      values: getIterationMethod(VALUES),
	      keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
	      entries: getIterationMethod(ENTRIES)
	    };
	    if (FORCED) for (KEY in methods) {
	      if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
	        defineBuiltIn(IterablePrototype, KEY, methods[KEY]);
	      }
	    } else _export({
	      target: NAME,
	      proto: true,
	      forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME
	    }, methods);
	  }

	  // define iterator
	  if (IterablePrototype[ITERATOR$4] !== defaultIterator) {
	    defineBuiltIn(IterablePrototype, ITERATOR$4, defaultIterator, {
	      name: DEFAULT
	    });
	  }
	  iterators[NAME] = defaultIterator;
	  return methods;
	};

	// `CreateIterResultObject` abstract operation
	// https://tc39.es/ecma262/#sec-createiterresultobject
	var createIterResultObject = function createIterResultObject(value, done) {
	  return {
	    value: value,
	    done: done
	  };
	};

	var defineProperty$2 = objectDefineProperty.f;
	var ARRAY_ITERATOR = 'Array Iterator';
	var setInternalState$4 = internalState.set;
	var getInternalState$1 = internalState.getterFor(ARRAY_ITERATOR);

	// `Array.prototype.entries` method
	// https://tc39.es/ecma262/#sec-array.prototype.entries
	// `Array.prototype.keys` method
	// https://tc39.es/ecma262/#sec-array.prototype.keys
	// `Array.prototype.values` method
	// https://tc39.es/ecma262/#sec-array.prototype.values
	// `Array.prototype[@@iterator]` method
	// https://tc39.es/ecma262/#sec-array.prototype-@@iterator
	// `CreateArrayIterator` internal method
	// https://tc39.es/ecma262/#sec-createarrayiterator
	var es_array_iterator = iteratorDefine(Array, 'Array', function (iterated, kind) {
	  setInternalState$4(this, {
	    type: ARRAY_ITERATOR,
	    target: toIndexedObject(iterated),
	    // target
	    index: 0,
	    // next index
	    kind: kind // kind
	  });
	  // `%ArrayIteratorPrototype%.next` method
	  // https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
	}, function () {
	  var state = getInternalState$1(this);
	  var target = state.target;
	  var index = state.index++;
	  if (!target || index >= target.length) {
	    state.target = undefined;
	    return createIterResultObject(undefined, true);
	  }
	  switch (state.kind) {
	    case 'keys':
	      return createIterResultObject(index, false);
	    case 'values':
	      return createIterResultObject(target[index], false);
	  }
	  return createIterResultObject([index, target[index]], false);
	}, 'values');

	// argumentsList[@@iterator] is %ArrayProto_values%
	// https://tc39.es/ecma262/#sec-createunmappedargumentsobject
	// https://tc39.es/ecma262/#sec-createmappedargumentsobject
	var values = iterators.Arguments = iterators.Array;

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables('keys');
	addToUnscopables('values');
	addToUnscopables('entries');

	// V8 ~ Chrome 45- bug
	if (descriptors && values.name !== 'values') try {
	  defineProperty$2(values, 'name', {
	    value: 'values'
	  });
	} catch (error) {/* empty */}

	// `Object.prototype.toString` method implementation
	// https://tc39.es/ecma262/#sec-object.prototype.tostring
	var objectToString = toStringTagSupport ? {}.toString : function toString() {
	  return '[object ' + classof(this) + ']';
	};

	// `Object.prototype.toString` method
	// https://tc39.es/ecma262/#sec-object.prototype.tostring
	if (!toStringTagSupport) {
	  defineBuiltIn(Object.prototype, 'toString', objectToString, {
	    unsafe: true
	  });
	}

	var engineIsNode = classofRaw(global_1.process) === 'process';

	var defineBuiltInAccessor = function defineBuiltInAccessor(target, name, descriptor) {
	  if (descriptor.get) makeBuiltIn_1(descriptor.get, name, {
	    getter: true
	  });
	  if (descriptor.set) makeBuiltIn_1(descriptor.set, name, {
	    setter: true
	  });
	  return objectDefineProperty.f(target, name, descriptor);
	};

	var SPECIES$4 = wellKnownSymbol('species');
	var setSpecies = function setSpecies(CONSTRUCTOR_NAME) {
	  var Constructor = getBuiltIn(CONSTRUCTOR_NAME);
	  if (descriptors && Constructor && !Constructor[SPECIES$4]) {
	    defineBuiltInAccessor(Constructor, SPECIES$4, {
	      configurable: true,
	      get: function get() {
	        return this;
	      }
	    });
	  }
	};

	var $TypeError$3 = TypeError;
	var anInstance = function anInstance(it, Prototype) {
	  if (objectIsPrototypeOf(Prototype, it)) return it;
	  throw new $TypeError$3('Incorrect invocation');
	};

	var noop = function noop() {/* empty */};
	var empty = [];
	var construct = getBuiltIn('Reflect', 'construct');
	var constructorRegExp = /^\s*(?:class|function)\b/;
	var exec$2 = functionUncurryThis(constructorRegExp.exec);
	var INCORRECT_TO_STRING = !constructorRegExp.test(noop);
	var isConstructorModern = function isConstructor(argument) {
	  if (!isCallable(argument)) return false;
	  try {
	    construct(noop, empty, argument);
	    return true;
	  } catch (error) {
	    return false;
	  }
	};
	var isConstructorLegacy = function isConstructor(argument) {
	  if (!isCallable(argument)) return false;
	  switch (classof(argument)) {
	    case 'AsyncFunction':
	    case 'GeneratorFunction':
	    case 'AsyncGeneratorFunction':
	      return false;
	  }
	  try {
	    // we can't check .prototype since constructors produced by .bind haven't it
	    // `Function#toString` throws on some built-it function in some legacy engines
	    // (for example, `DOMQuad` and similar in FF41-)
	    return INCORRECT_TO_STRING || !!exec$2(constructorRegExp, inspectSource(argument));
	  } catch (error) {
	    return true;
	  }
	};
	isConstructorLegacy.sham = true;

	// `IsConstructor` abstract operation
	// https://tc39.es/ecma262/#sec-isconstructor
	var isConstructor = !construct || fails(function () {
	  var called;
	  return isConstructorModern(isConstructorModern.call) || !isConstructorModern(Object) || !isConstructorModern(function () {
	    called = true;
	  }) || called;
	}) ? isConstructorLegacy : isConstructorModern;

	var $TypeError$2 = TypeError;

	// `Assert: IsConstructor(argument) is true`
	var aConstructor = function aConstructor(argument) {
	  if (isConstructor(argument)) return argument;
	  throw new $TypeError$2(tryToString(argument) + ' is not a constructor');
	};

	var SPECIES$3 = wellKnownSymbol('species');

	// `SpeciesConstructor` abstract operation
	// https://tc39.es/ecma262/#sec-speciesconstructor
	var speciesConstructor = function speciesConstructor(O, defaultConstructor) {
	  var C = anObject(O).constructor;
	  var S;
	  return C === undefined || isNullOrUndefined(S = anObject(C)[SPECIES$3]) ? defaultConstructor : aConstructor(S);
	};

	var FunctionPrototype = Function.prototype;
	var apply = FunctionPrototype.apply;
	var call = FunctionPrototype.call;

	// eslint-disable-next-line es/no-reflect -- safe
	var functionApply = (typeof Reflect === "undefined" ? "undefined" : _typeof$1(Reflect)) == 'object' && Reflect.apply || (functionBindNative ? call.bind(apply) : function () {
	  return call.apply(apply, arguments);
	});

	var arraySlice = functionUncurryThis([].slice);

	var $TypeError$1 = TypeError;
	var validateArgumentsLength = function validateArgumentsLength(passed, required) {
	  if (passed < required) throw new $TypeError$1('Not enough arguments');
	  return passed;
	};

	// eslint-disable-next-line redos/no-vulnerable -- safe
	var engineIsIos = /(?:ipad|iphone|ipod).*applewebkit/i.test(engineUserAgent);

	var set = global_1.setImmediate;
	var clear = global_1.clearImmediate;
	var process$2 = global_1.process;
	var Dispatch = global_1.Dispatch;
	var Function$1 = global_1.Function;
	var MessageChannel = global_1.MessageChannel;
	var String$1 = global_1.String;
	var counter = 0;
	var queue$2 = {};
	var ONREADYSTATECHANGE = 'onreadystatechange';
	var $location, defer, channel, port;
	fails(function () {
	  // Deno throws a ReferenceError on `location` access without `--location` flag
	  $location = global_1.location;
	});
	var run = function run(id) {
	  if (hasOwnProperty_1(queue$2, id)) {
	    var fn = queue$2[id];
	    delete queue$2[id];
	    fn();
	  }
	};
	var runner = function runner(id) {
	  return function () {
	    run(id);
	  };
	};
	var eventListener = function eventListener(event) {
	  run(event.data);
	};
	var globalPostMessageDefer = function globalPostMessageDefer(id) {
	  // old engines have not location.origin
	  global_1.postMessage(String$1(id), $location.protocol + '//' + $location.host);
	};

	// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
	if (!set || !clear) {
	  set = function setImmediate(handler) {
	    validateArgumentsLength(arguments.length, 1);
	    var fn = isCallable(handler) ? handler : Function$1(handler);
	    var args = arraySlice(arguments, 1);
	    queue$2[++counter] = function () {
	      functionApply(fn, undefined, args);
	    };
	    defer(counter);
	    return counter;
	  };
	  clear = function clearImmediate(id) {
	    delete queue$2[id];
	  };
	  // Node.js 0.8-
	  if (engineIsNode) {
	    defer = function defer(id) {
	      process$2.nextTick(runner(id));
	    };
	    // Sphere (JS game engine) Dispatch API
	  } else if (Dispatch && Dispatch.now) {
	    defer = function defer(id) {
	      Dispatch.now(runner(id));
	    };
	    // Browsers with MessageChannel, includes WebWorkers
	    // except iOS - https://github.com/zloirock/core-js/issues/624
	  } else if (MessageChannel && !engineIsIos) {
	    channel = new MessageChannel();
	    port = channel.port2;
	    channel.port1.onmessage = eventListener;
	    defer = functionBindContext(port.postMessage, port);
	    // Browsers with postMessage, skip WebWorkers
	    // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
	  } else if (global_1.addEventListener && isCallable(global_1.postMessage) && !global_1.importScripts && $location && $location.protocol !== 'file:' && !fails(globalPostMessageDefer)) {
	    defer = globalPostMessageDefer;
	    global_1.addEventListener('message', eventListener, false);
	    // IE8-
	  } else if (ONREADYSTATECHANGE in documentCreateElement('script')) {
	    defer = function defer(id) {
	      html.appendChild(documentCreateElement('script'))[ONREADYSTATECHANGE] = function () {
	        html.removeChild(this);
	        run(id);
	      };
	    };
	    // Rest old browsers
	  } else {
	    defer = function defer(id) {
	      setTimeout(runner(id), 0);
	    };
	  }
	}
	var task$1 = {
	  set: set,
	  clear: clear
	};

	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

	// Avoid NodeJS experimental warning
	var safeGetBuiltIn = function safeGetBuiltIn(name) {
	  if (!descriptors) return global_1[name];
	  var descriptor = getOwnPropertyDescriptor(global_1, name);
	  return descriptor && descriptor.value;
	};

	var Queue = function Queue() {
	  this.head = null;
	  this.tail = null;
	};
	Queue.prototype = {
	  add: function add(item) {
	    var entry = {
	      item: item,
	      next: null
	    };
	    var tail = this.tail;
	    if (tail) tail.next = entry;else this.head = entry;
	    this.tail = entry;
	  },
	  get: function get() {
	    var entry = this.head;
	    if (entry) {
	      var next = this.head = entry.next;
	      if (next === null) this.tail = null;
	      return entry.item;
	    }
	  }
	};
	var queue$1 = Queue;

	var engineIsIosPebble = /ipad|iphone|ipod/i.test(engineUserAgent) && typeof Pebble != 'undefined';

	var engineIsWebosWebkit = /web0s(?!.*chrome)/i.test(engineUserAgent);

	var macrotask = task$1.set;
	var MutationObserver = global_1.MutationObserver || global_1.WebKitMutationObserver;
	var document$2 = global_1.document;
	var process$1 = global_1.process;
	var Promise$1 = global_1.Promise;
	var microtask = safeGetBuiltIn('queueMicrotask');
	var notify$1, toggle, node, promise, then;

	// modern engines have queueMicrotask method
	if (!microtask) {
	  var queue = new queue$1();
	  var flush = function flush() {
	    var parent, fn;
	    if (engineIsNode && (parent = process$1.domain)) parent.exit();
	    while (fn = queue.get()) try {
	      fn();
	    } catch (error) {
	      if (queue.head) notify$1();
	      throw error;
	    }
	    if (parent) parent.enter();
	  };

	  // browsers with MutationObserver, except iOS - https://github.com/zloirock/core-js/issues/339
	  // also except WebOS Webkit https://github.com/zloirock/core-js/issues/898
	  if (!engineIsIos && !engineIsNode && !engineIsWebosWebkit && MutationObserver && document$2) {
	    toggle = true;
	    node = document$2.createTextNode('');
	    new MutationObserver(flush).observe(node, {
	      characterData: true
	    });
	    notify$1 = function notify() {
	      node.data = toggle = !toggle;
	    };
	    // environments with maybe non-completely correct, but existent Promise
	  } else if (!engineIsIosPebble && Promise$1 && Promise$1.resolve) {
	    // Promise.resolve without an argument throws an error in LG WebOS 2
	    promise = Promise$1.resolve(undefined);
	    // workaround of WebKit ~ iOS Safari 10.1 bug
	    promise.constructor = Promise$1;
	    then = functionBindContext(promise.then, promise);
	    notify$1 = function notify() {
	      then(flush);
	    };
	    // Node.js without promises
	  } else if (engineIsNode) {
	    notify$1 = function notify() {
	      process$1.nextTick(flush);
	    };
	    // for other environments - macrotask based on:
	    // - setImmediate
	    // - MessageChannel
	    // - window.postMessage
	    // - onreadystatechange
	    // - setTimeout
	  } else {
	    // `webpack` dev server bug on IE global methods - use bind(fn, global)
	    macrotask = functionBindContext(macrotask, global_1);
	    notify$1 = function notify() {
	      macrotask(flush);
	    };
	  }
	  microtask = function microtask(fn) {
	    if (!queue.head) notify$1();
	    queue.add(fn);
	  };
	}
	var microtask_1 = microtask;

	var hostReportErrors = function hostReportErrors(a, b) {
	  try {
	    // eslint-disable-next-line no-console -- safe
	    arguments.length === 1 ? console.error(a) : console.error(a, b);
	  } catch (error) {/* empty */}
	};

	var perform = function perform(exec) {
	  try {
	    return {
	      error: false,
	      value: exec()
	    };
	  } catch (error) {
	    return {
	      error: true,
	      value: error
	    };
	  }
	};

	var promiseNativeConstructor = global_1.Promise;

	var engineIsDeno = (typeof Deno === "undefined" ? "undefined" : _typeof$1(Deno)) == 'object' && Deno && _typeof$1(Deno.version) == 'object';

	var engineIsBrowser = !engineIsDeno && !engineIsNode && (typeof window === "undefined" ? "undefined" : _typeof$1(window)) == 'object' && (typeof document === "undefined" ? "undefined" : _typeof$1(document)) == 'object';

	promiseNativeConstructor && promiseNativeConstructor.prototype;
	var SPECIES$2 = wellKnownSymbol('species');
	var SUBCLASSING = false;
	var NATIVE_PROMISE_REJECTION_EVENT$1 = isCallable(global_1.PromiseRejectionEvent);
	var FORCED_PROMISE_CONSTRUCTOR$5 = isForced_1('Promise', function () {
	  var PROMISE_CONSTRUCTOR_SOURCE = inspectSource(promiseNativeConstructor);
	  var GLOBAL_CORE_JS_PROMISE = PROMISE_CONSTRUCTOR_SOURCE !== String(promiseNativeConstructor);
	  // V8 6.6 (Node 10 and Chrome 66) have a bug with resolving custom thenables
	  // https://bugs.chromium.org/p/chromium/issues/detail?id=830565
	  // We can't detect it synchronously, so just check versions
	  if (!GLOBAL_CORE_JS_PROMISE && engineV8Version === 66) return true;
	  // We can't use @@species feature detection in V8 since it causes
	  // deoptimization and performance degradation
	  // https://github.com/zloirock/core-js/issues/679
	  if (!engineV8Version || engineV8Version < 51 || !/native code/.test(PROMISE_CONSTRUCTOR_SOURCE)) {
	    // Detect correctness of subclassing with @@species support
	    var promise = new promiseNativeConstructor(function (resolve) {
	      resolve(1);
	    });
	    var FakePromise = function FakePromise(exec) {
	      exec(function () {/* empty */}, function () {/* empty */});
	    };
	    var constructor = promise.constructor = {};
	    constructor[SPECIES$2] = FakePromise;
	    SUBCLASSING = promise.then(function () {/* empty */}) instanceof FakePromise;
	    if (!SUBCLASSING) return true;
	    // Unhandled rejections tracking support, NodeJS Promise without it fails @@species test
	  }
	  return !GLOBAL_CORE_JS_PROMISE && (engineIsBrowser || engineIsDeno) && !NATIVE_PROMISE_REJECTION_EVENT$1;
	});
	var promiseConstructorDetection = {
	  CONSTRUCTOR: FORCED_PROMISE_CONSTRUCTOR$5,
	  REJECTION_EVENT: NATIVE_PROMISE_REJECTION_EVENT$1,
	  SUBCLASSING: SUBCLASSING
	};

	var $TypeError = TypeError;
	var PromiseCapability = function PromiseCapability(C) {
	  var resolve, reject;
	  this.promise = new C(function ($$resolve, $$reject) {
	    if (resolve !== undefined || reject !== undefined) throw new $TypeError('Bad Promise constructor');
	    resolve = $$resolve;
	    reject = $$reject;
	  });
	  this.resolve = aCallable(resolve);
	  this.reject = aCallable(reject);
	};

	// `NewPromiseCapability` abstract operation
	// https://tc39.es/ecma262/#sec-newpromisecapability
	var f = function f(C) {
	  return new PromiseCapability(C);
	};
	var newPromiseCapability$1 = {
	  f: f
	};

	var task = task$1.set;
	var PROMISE = 'Promise';
	var FORCED_PROMISE_CONSTRUCTOR$4 = promiseConstructorDetection.CONSTRUCTOR;
	var NATIVE_PROMISE_REJECTION_EVENT = promiseConstructorDetection.REJECTION_EVENT;
	var NATIVE_PROMISE_SUBCLASSING = promiseConstructorDetection.SUBCLASSING;
	var getInternalPromiseState = internalState.getterFor(PROMISE);
	var setInternalState$3 = internalState.set;
	var NativePromisePrototype$2 = promiseNativeConstructor && promiseNativeConstructor.prototype;
	var PromiseConstructor = promiseNativeConstructor;
	var PromisePrototype = NativePromisePrototype$2;
	var TypeError$3 = global_1.TypeError;
	var document$1 = global_1.document;
	var process = global_1.process;
	var newPromiseCapability = newPromiseCapability$1.f;
	var newGenericPromiseCapability = newPromiseCapability;
	var DISPATCH_EVENT = !!(document$1 && document$1.createEvent && global_1.dispatchEvent);
	var UNHANDLED_REJECTION = 'unhandledrejection';
	var REJECTION_HANDLED = 'rejectionhandled';
	var PENDING = 0;
	var FULFILLED = 1;
	var REJECTED = 2;
	var HANDLED = 1;
	var UNHANDLED = 2;
	var Internal, OwnPromiseCapability, PromiseWrapper, nativeThen;

	// helpers
	var isThenable = function isThenable(it) {
	  var then;
	  return isObject(it) && isCallable(then = it.then) ? then : false;
	};
	var callReaction = function callReaction(reaction, state) {
	  var value = state.value;
	  var ok = state.state === FULFILLED;
	  var handler = ok ? reaction.ok : reaction.fail;
	  var resolve = reaction.resolve;
	  var reject = reaction.reject;
	  var domain = reaction.domain;
	  var result, then, exited;
	  try {
	    if (handler) {
	      if (!ok) {
	        if (state.rejection === UNHANDLED) onHandleUnhandled(state);
	        state.rejection = HANDLED;
	      }
	      if (handler === true) result = value;else {
	        if (domain) domain.enter();
	        result = handler(value); // can throw
	        if (domain) {
	          domain.exit();
	          exited = true;
	        }
	      }
	      if (result === reaction.promise) {
	        reject(new TypeError$3('Promise-chain cycle'));
	      } else if (then = isThenable(result)) {
	        functionCall(then, result, resolve, reject);
	      } else resolve(result);
	    } else reject(value);
	  } catch (error) {
	    if (domain && !exited) domain.exit();
	    reject(error);
	  }
	};
	var notify = function notify(state, isReject) {
	  if (state.notified) return;
	  state.notified = true;
	  microtask_1(function () {
	    var reactions = state.reactions;
	    var reaction;
	    while (reaction = reactions.get()) {
	      callReaction(reaction, state);
	    }
	    state.notified = false;
	    if (isReject && !state.rejection) onUnhandled(state);
	  });
	};
	var dispatchEvent = function dispatchEvent(name, promise, reason) {
	  var event, handler;
	  if (DISPATCH_EVENT) {
	    event = document$1.createEvent('Event');
	    event.promise = promise;
	    event.reason = reason;
	    event.initEvent(name, false, true);
	    global_1.dispatchEvent(event);
	  } else event = {
	    promise: promise,
	    reason: reason
	  };
	  if (!NATIVE_PROMISE_REJECTION_EVENT && (handler = global_1['on' + name])) handler(event);else if (name === UNHANDLED_REJECTION) hostReportErrors('Unhandled promise rejection', reason);
	};
	var onUnhandled = function onUnhandled(state) {
	  functionCall(task, global_1, function () {
	    var promise = state.facade;
	    var value = state.value;
	    var IS_UNHANDLED = isUnhandled(state);
	    var result;
	    if (IS_UNHANDLED) {
	      result = perform(function () {
	        if (engineIsNode) {
	          process.emit('unhandledRejection', value, promise);
	        } else dispatchEvent(UNHANDLED_REJECTION, promise, value);
	      });
	      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
	      state.rejection = engineIsNode || isUnhandled(state) ? UNHANDLED : HANDLED;
	      if (result.error) throw result.value;
	    }
	  });
	};
	var isUnhandled = function isUnhandled(state) {
	  return state.rejection !== HANDLED && !state.parent;
	};
	var onHandleUnhandled = function onHandleUnhandled(state) {
	  functionCall(task, global_1, function () {
	    var promise = state.facade;
	    if (engineIsNode) {
	      process.emit('rejectionHandled', promise);
	    } else dispatchEvent(REJECTION_HANDLED, promise, state.value);
	  });
	};
	var bind = function bind(fn, state, unwrap) {
	  return function (value) {
	    fn(state, value, unwrap);
	  };
	};
	var internalReject = function internalReject(state, value, unwrap) {
	  if (state.done) return;
	  state.done = true;
	  if (unwrap) state = unwrap;
	  state.value = value;
	  state.state = REJECTED;
	  notify(state, true);
	};
	var internalResolve = function internalResolve(state, value, unwrap) {
	  if (state.done) return;
	  state.done = true;
	  if (unwrap) state = unwrap;
	  try {
	    if (state.facade === value) throw new TypeError$3("Promise can't be resolved itself");
	    var then = isThenable(value);
	    if (then) {
	      microtask_1(function () {
	        var wrapper = {
	          done: false
	        };
	        try {
	          functionCall(then, value, bind(internalResolve, wrapper, state), bind(internalReject, wrapper, state));
	        } catch (error) {
	          internalReject(wrapper, error, state);
	        }
	      });
	    } else {
	      state.value = value;
	      state.state = FULFILLED;
	      notify(state, false);
	    }
	  } catch (error) {
	    internalReject({
	      done: false
	    }, error, state);
	  }
	};

	// constructor polyfill
	if (FORCED_PROMISE_CONSTRUCTOR$4) {
	  // 25.4.3.1 Promise(executor)
	  PromiseConstructor = function Promise(executor) {
	    anInstance(this, PromisePrototype);
	    aCallable(executor);
	    functionCall(Internal, this);
	    var state = getInternalPromiseState(this);
	    try {
	      executor(bind(internalResolve, state), bind(internalReject, state));
	    } catch (error) {
	      internalReject(state, error);
	    }
	  };
	  PromisePrototype = PromiseConstructor.prototype;

	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  Internal = function Promise(executor) {
	    setInternalState$3(this, {
	      type: PROMISE,
	      done: false,
	      notified: false,
	      parent: false,
	      reactions: new queue$1(),
	      rejection: false,
	      state: PENDING,
	      value: undefined
	    });
	  };

	  // `Promise.prototype.then` method
	  // https://tc39.es/ecma262/#sec-promise.prototype.then
	  Internal.prototype = defineBuiltIn(PromisePrototype, 'then', function then(onFulfilled, onRejected) {
	    var state = getInternalPromiseState(this);
	    var reaction = newPromiseCapability(speciesConstructor(this, PromiseConstructor));
	    state.parent = true;
	    reaction.ok = isCallable(onFulfilled) ? onFulfilled : true;
	    reaction.fail = isCallable(onRejected) && onRejected;
	    reaction.domain = engineIsNode ? process.domain : undefined;
	    if (state.state === PENDING) state.reactions.add(reaction);else microtask_1(function () {
	      callReaction(reaction, state);
	    });
	    return reaction.promise;
	  });
	  OwnPromiseCapability = function OwnPromiseCapability() {
	    var promise = new Internal();
	    var state = getInternalPromiseState(promise);
	    this.promise = promise;
	    this.resolve = bind(internalResolve, state);
	    this.reject = bind(internalReject, state);
	  };
	  newPromiseCapability$1.f = newPromiseCapability = function newPromiseCapability(C) {
	    return C === PromiseConstructor || C === PromiseWrapper ? new OwnPromiseCapability(C) : newGenericPromiseCapability(C);
	  };
	  if (isCallable(promiseNativeConstructor) && NativePromisePrototype$2 !== Object.prototype) {
	    nativeThen = NativePromisePrototype$2.then;
	    if (!NATIVE_PROMISE_SUBCLASSING) {
	      // make `Promise#then` return a polyfilled `Promise` for native promise-based APIs
	      defineBuiltIn(NativePromisePrototype$2, 'then', function then(onFulfilled, onRejected) {
	        var that = this;
	        return new PromiseConstructor(function (resolve, reject) {
	          functionCall(nativeThen, that, resolve, reject);
	        }).then(onFulfilled, onRejected);
	        // https://github.com/zloirock/core-js/issues/640
	      }, {
	        unsafe: true
	      });
	    }

	    // make `.constructor === Promise` work for native promise-based APIs
	    try {
	      delete NativePromisePrototype$2.constructor;
	    } catch (error) {/* empty */}

	    // make `instanceof Promise` work for native promise-based APIs
	    if (objectSetPrototypeOf) {
	      objectSetPrototypeOf(NativePromisePrototype$2, PromisePrototype);
	    }
	  }
	}
	_export({
	  global: true,
	  constructor: true,
	  wrap: true,
	  forced: FORCED_PROMISE_CONSTRUCTOR$4
	}, {
	  Promise: PromiseConstructor
	});
	setToStringTag(PromiseConstructor, PROMISE, false);
	setSpecies(PROMISE);

	var ITERATOR$3 = wellKnownSymbol('iterator');
	var SAFE_CLOSING = false;
	try {
	  var called = 0;
	  var iteratorWithReturn = {
	    next: function next() {
	      return {
	        done: !!called++
	      };
	    },
	    'return': function _return() {
	      SAFE_CLOSING = true;
	    }
	  };
	  iteratorWithReturn[ITERATOR$3] = function () {
	    return this;
	  };
	  // eslint-disable-next-line es/no-array-from, no-throw-literal -- required for testing
	  Array.from(iteratorWithReturn, function () {
	    throw 2;
	  });
	} catch (error) {/* empty */}
	var checkCorrectnessOfIteration = function checkCorrectnessOfIteration(exec, SKIP_CLOSING) {
	  try {
	    if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
	  } catch (error) {
	    return false;
	  } // workaround of old WebKit + `eval` bug
	  var ITERATION_SUPPORT = false;
	  try {
	    var object = {};
	    object[ITERATOR$3] = function () {
	      return {
	        next: function next() {
	          return {
	            done: ITERATION_SUPPORT = true
	          };
	        }
	      };
	    };
	    exec(object);
	  } catch (error) {/* empty */}
	  return ITERATION_SUPPORT;
	};

	var FORCED_PROMISE_CONSTRUCTOR$3 = promiseConstructorDetection.CONSTRUCTOR;
	var promiseStaticsIncorrectIteration = FORCED_PROMISE_CONSTRUCTOR$3 || !checkCorrectnessOfIteration(function (iterable) {
	  promiseNativeConstructor.all(iterable).then(undefined, function () {/* empty */});
	});

	// `Promise.all` method
	// https://tc39.es/ecma262/#sec-promise.all
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: promiseStaticsIncorrectIteration
	}, {
	  all: function all(iterable) {
	    var C = this;
	    var capability = newPromiseCapability$1.f(C);
	    var resolve = capability.resolve;
	    var reject = capability.reject;
	    var result = perform(function () {
	      var $promiseResolve = aCallable(C.resolve);
	      var values = [];
	      var counter = 0;
	      var remaining = 1;
	      iterate(iterable, function (promise) {
	        var index = counter++;
	        var alreadyCalled = false;
	        remaining++;
	        functionCall($promiseResolve, C, promise).then(function (value) {
	          if (alreadyCalled) return;
	          alreadyCalled = true;
	          values[index] = value;
	          --remaining || resolve(values);
	        }, reject);
	      });
	      --remaining || resolve(values);
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var FORCED_PROMISE_CONSTRUCTOR$2 = promiseConstructorDetection.CONSTRUCTOR;
	var NativePromisePrototype$1 = promiseNativeConstructor && promiseNativeConstructor.prototype;

	// `Promise.prototype.catch` method
	// https://tc39.es/ecma262/#sec-promise.prototype.catch
	_export({
	  target: 'Promise',
	  proto: true,
	  forced: FORCED_PROMISE_CONSTRUCTOR$2,
	  real: true
	}, {
	  'catch': function _catch(onRejected) {
	    return this.then(undefined, onRejected);
	  }
	});

	// makes sure that native promise-based APIs `Promise#catch` properly works with patched `Promise#then`
	if (isCallable(promiseNativeConstructor)) {
	  var method$1 = getBuiltIn('Promise').prototype['catch'];
	  if (NativePromisePrototype$1['catch'] !== method$1) {
	    defineBuiltIn(NativePromisePrototype$1, 'catch', method$1, {
	      unsafe: true
	    });
	  }
	}

	// `Promise.race` method
	// https://tc39.es/ecma262/#sec-promise.race
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: promiseStaticsIncorrectIteration
	}, {
	  race: function race(iterable) {
	    var C = this;
	    var capability = newPromiseCapability$1.f(C);
	    var reject = capability.reject;
	    var result = perform(function () {
	      var $promiseResolve = aCallable(C.resolve);
	      iterate(iterable, function (promise) {
	        functionCall($promiseResolve, C, promise).then(capability.resolve, reject);
	      });
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var FORCED_PROMISE_CONSTRUCTOR$1 = promiseConstructorDetection.CONSTRUCTOR;

	// `Promise.reject` method
	// https://tc39.es/ecma262/#sec-promise.reject
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: FORCED_PROMISE_CONSTRUCTOR$1
	}, {
	  reject: function reject(r) {
	    var capability = newPromiseCapability$1.f(this);
	    var capabilityReject = capability.reject;
	    capabilityReject(r);
	    return capability.promise;
	  }
	});

	var promiseResolve = function promiseResolve(C, x) {
	  anObject(C);
	  if (isObject(x) && x.constructor === C) return x;
	  var promiseCapability = newPromiseCapability$1.f(C);
	  var resolve = promiseCapability.resolve;
	  resolve(x);
	  return promiseCapability.promise;
	};

	var FORCED_PROMISE_CONSTRUCTOR = promiseConstructorDetection.CONSTRUCTOR;
	getBuiltIn('Promise');

	// `Promise.resolve` method
	// https://tc39.es/ecma262/#sec-promise.resolve
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: FORCED_PROMISE_CONSTRUCTOR
	}, {
	  resolve: function resolve(x) {
	    return promiseResolve(this, x);
	  }
	});

	// `Promise.allSettled` method
	// https://tc39.es/ecma262/#sec-promise.allsettled
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: promiseStaticsIncorrectIteration
	}, {
	  allSettled: function allSettled(iterable) {
	    var C = this;
	    var capability = newPromiseCapability$1.f(C);
	    var resolve = capability.resolve;
	    var reject = capability.reject;
	    var result = perform(function () {
	      var promiseResolve = aCallable(C.resolve);
	      var values = [];
	      var counter = 0;
	      var remaining = 1;
	      iterate(iterable, function (promise) {
	        var index = counter++;
	        var alreadyCalled = false;
	        remaining++;
	        functionCall(promiseResolve, C, promise).then(function (value) {
	          if (alreadyCalled) return;
	          alreadyCalled = true;
	          values[index] = {
	            status: 'fulfilled',
	            value: value
	          };
	          --remaining || resolve(values);
	        }, function (error) {
	          if (alreadyCalled) return;
	          alreadyCalled = true;
	          values[index] = {
	            status: 'rejected',
	            reason: error
	          };
	          --remaining || resolve(values);
	        });
	      });
	      --remaining || resolve(values);
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var PROMISE_ANY_ERROR = 'No one promise resolved';

	// `Promise.any` method
	// https://tc39.es/ecma262/#sec-promise.any
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: promiseStaticsIncorrectIteration
	}, {
	  any: function any(iterable) {
	    var C = this;
	    var AggregateError = getBuiltIn('AggregateError');
	    var capability = newPromiseCapability$1.f(C);
	    var resolve = capability.resolve;
	    var reject = capability.reject;
	    var result = perform(function () {
	      var promiseResolve = aCallable(C.resolve);
	      var errors = [];
	      var counter = 0;
	      var remaining = 1;
	      var alreadyResolved = false;
	      iterate(iterable, function (promise) {
	        var index = counter++;
	        var alreadyRejected = false;
	        remaining++;
	        functionCall(promiseResolve, C, promise).then(function (value) {
	          if (alreadyRejected || alreadyResolved) return;
	          alreadyResolved = true;
	          resolve(value);
	        }, function (error) {
	          if (alreadyRejected || alreadyResolved) return;
	          alreadyRejected = true;
	          errors[index] = error;
	          --remaining || reject(new AggregateError(errors, PROMISE_ANY_ERROR));
	        });
	      });
	      --remaining || reject(new AggregateError(errors, PROMISE_ANY_ERROR));
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	// `Promise.withResolvers` method
	// https://github.com/tc39/proposal-promise-with-resolvers
	_export({
	  target: 'Promise',
	  stat: true
	}, {
	  withResolvers: function withResolvers() {
	    var promiseCapability = newPromiseCapability$1.f(this);
	    return {
	      promise: promiseCapability.promise,
	      resolve: promiseCapability.resolve,
	      reject: promiseCapability.reject
	    };
	  }
	});

	var NativePromisePrototype = promiseNativeConstructor && promiseNativeConstructor.prototype;

	// Safari bug https://bugs.webkit.org/show_bug.cgi?id=200829
	var NON_GENERIC = !!promiseNativeConstructor && fails(function () {
	  // eslint-disable-next-line unicorn/no-thenable -- required for testing
	  NativePromisePrototype['finally'].call({
	    then: function then() {/* empty */}
	  }, function () {/* empty */});
	});

	// `Promise.prototype.finally` method
	// https://tc39.es/ecma262/#sec-promise.prototype.finally
	_export({
	  target: 'Promise',
	  proto: true,
	  real: true,
	  forced: NON_GENERIC
	}, {
	  'finally': function _finally(onFinally) {
	    var C = speciesConstructor(this, getBuiltIn('Promise'));
	    var isFunction = isCallable(onFinally);
	    return this.then(isFunction ? function (x) {
	      return promiseResolve(C, onFinally()).then(function () {
	        return x;
	      });
	    } : onFinally, isFunction ? function (e) {
	      return promiseResolve(C, onFinally()).then(function () {
	        throw e;
	      });
	    } : onFinally);
	  }
	});

	// makes sure that native promise-based APIs `Promise#finally` properly works with patched `Promise#then`
	if (isCallable(promiseNativeConstructor)) {
	  var method = getBuiltIn('Promise').prototype['finally'];
	  if (NativePromisePrototype['finally'] !== method) {
	    defineBuiltIn(NativePromisePrototype, 'finally', method, {
	      unsafe: true
	    });
	  }
	}

	var charAt$3 = functionUncurryThis(''.charAt);
	var charCodeAt$1 = functionUncurryThis(''.charCodeAt);
	var stringSlice$2 = functionUncurryThis(''.slice);
	var createMethod$1 = function createMethod(CONVERT_TO_STRING) {
	  return function ($this, pos) {
	    var S = toString_1(requireObjectCoercible($this));
	    var position = toIntegerOrInfinity(pos);
	    var size = S.length;
	    var first, second;
	    if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
	    first = charCodeAt$1(S, position);
	    return first < 0xD800 || first > 0xDBFF || position + 1 === size || (second = charCodeAt$1(S, position + 1)) < 0xDC00 || second > 0xDFFF ? CONVERT_TO_STRING ? charAt$3(S, position) : first : CONVERT_TO_STRING ? stringSlice$2(S, position, position + 2) : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
	  };
	};
	var stringMultibyte = {
	  // `String.prototype.codePointAt` method
	  // https://tc39.es/ecma262/#sec-string.prototype.codepointat
	  codeAt: createMethod$1(false),
	  // `String.prototype.at` method
	  // https://github.com/mathiasbynens/String.prototype.at
	  charAt: createMethod$1(true)
	};

	var charAt$2 = stringMultibyte.charAt;
	var STRING_ITERATOR = 'String Iterator';
	var setInternalState$2 = internalState.set;
	var getInternalState = internalState.getterFor(STRING_ITERATOR);

	// `String.prototype[@@iterator]` method
	// https://tc39.es/ecma262/#sec-string.prototype-@@iterator
	iteratorDefine(String, 'String', function (iterated) {
	  setInternalState$2(this, {
	    type: STRING_ITERATOR,
	    string: toString_1(iterated),
	    index: 0
	  });
	  // `%StringIteratorPrototype%.next` method
	  // https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next
	}, function next() {
	  var state = getInternalState(this);
	  var string = state.string;
	  var index = state.index;
	  var point;
	  if (index >= string.length) return createIterResultObject(undefined, true);
	  point = charAt$2(string, index);
	  state.index += point.length;
	  return createIterResultObject(point, false);
	});

	var path = global_1;

	path.Promise;

	// iterable DOM collections
	// flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
	var domIterables = {
	  CSSRuleList: 0,
	  CSSStyleDeclaration: 0,
	  CSSValueList: 0,
	  ClientRectList: 0,
	  DOMRectList: 0,
	  DOMStringList: 0,
	  DOMTokenList: 1,
	  DataTransferItemList: 0,
	  FileList: 0,
	  HTMLAllCollection: 0,
	  HTMLCollection: 0,
	  HTMLFormElement: 0,
	  HTMLSelectElement: 0,
	  MediaList: 0,
	  MimeTypeArray: 0,
	  NamedNodeMap: 0,
	  NodeList: 1,
	  PaintRequestList: 0,
	  Plugin: 0,
	  PluginArray: 0,
	  SVGLengthList: 0,
	  SVGNumberList: 0,
	  SVGPathSegList: 0,
	  SVGPointList: 0,
	  SVGStringList: 0,
	  SVGTransformList: 0,
	  SourceBufferList: 0,
	  StyleSheetList: 0,
	  TextTrackCueList: 0,
	  TextTrackList: 0,
	  TouchList: 0
	};

	// in old WebKit versions, `element.classList` is not an instance of global `DOMTokenList`

	var classList = documentCreateElement('span').classList;
	var DOMTokenListPrototype = classList && classList.constructor && classList.constructor.prototype;
	var domTokenListPrototype = DOMTokenListPrototype === Object.prototype ? undefined : DOMTokenListPrototype;

	var ITERATOR$2 = wellKnownSymbol('iterator');
	var ArrayValues = es_array_iterator.values;
	var handlePrototype = function handlePrototype(CollectionPrototype, COLLECTION_NAME) {
	  if (CollectionPrototype) {
	    // some Chrome versions have non-configurable methods on DOMTokenList
	    if (CollectionPrototype[ITERATOR$2] !== ArrayValues) try {
	      createNonEnumerableProperty(CollectionPrototype, ITERATOR$2, ArrayValues);
	    } catch (error) {
	      CollectionPrototype[ITERATOR$2] = ArrayValues;
	    }
	    setToStringTag(CollectionPrototype, COLLECTION_NAME, true);
	    if (domIterables[COLLECTION_NAME]) for (var METHOD_NAME in es_array_iterator) {
	      // some Chrome versions have non-configurable methods on DOMTokenList
	      if (CollectionPrototype[METHOD_NAME] !== es_array_iterator[METHOD_NAME]) try {
	        createNonEnumerableProperty(CollectionPrototype, METHOD_NAME, es_array_iterator[METHOD_NAME]);
	      } catch (error) {
	        CollectionPrototype[METHOD_NAME] = es_array_iterator[METHOD_NAME];
	      }
	    }
	  }
	};
	for (var COLLECTION_NAME in domIterables) {
	  handlePrototype(global_1[COLLECTION_NAME] && global_1[COLLECTION_NAME].prototype, COLLECTION_NAME);
	}
	handlePrototype(domTokenListPrototype, 'DOMTokenList');

	// TODO: Remove from `core-js@4`

	// `Promise.try` method
	// https://github.com/tc39/proposal-promise-try
	_export({
	  target: 'Promise',
	  stat: true,
	  forced: true
	}, {
	  'try': function _try(callbackfn) {
	    var promiseCapability = newPromiseCapability$1.f(this);
	    var result = perform(callbackfn);
	    (result.error ? promiseCapability.reject : promiseCapability.resolve)(result.value);
	    return promiseCapability.promise;
	  }
	});

	// `IsArray` abstract operation
	// https://tc39.es/ecma262/#sec-isarray
	// eslint-disable-next-line es/no-array-isarray -- safe
	var isArray = Array.isArray || function isArray(argument) {
	  return classofRaw(argument) === 'Array';
	};

	var SPECIES$1 = wellKnownSymbol('species');
	var $Array$1 = Array;

	// a part of `ArraySpeciesCreate` abstract operation
	// https://tc39.es/ecma262/#sec-arrayspeciescreate
	var arraySpeciesConstructor = function arraySpeciesConstructor(originalArray) {
	  var C;
	  if (isArray(originalArray)) {
	    C = originalArray.constructor;
	    // cross-realm fallback
	    if (isConstructor(C) && (C === $Array$1 || isArray(C.prototype))) C = undefined;else if (isObject(C)) {
	      C = C[SPECIES$1];
	      if (C === null) C = undefined;
	    }
	  }
	  return C === undefined ? $Array$1 : C;
	};

	// `ArraySpeciesCreate` abstract operation
	// https://tc39.es/ecma262/#sec-arrayspeciescreate
	var arraySpeciesCreate = function arraySpeciesCreate(originalArray, length) {
	  return new (arraySpeciesConstructor(originalArray))(length === 0 ? 0 : length);
	};

	var push$4 = functionUncurryThis([].push);

	// `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterReject }` methods implementation
	var createMethod = function createMethod(TYPE) {
	  var IS_MAP = TYPE === 1;
	  var IS_FILTER = TYPE === 2;
	  var IS_SOME = TYPE === 3;
	  var IS_EVERY = TYPE === 4;
	  var IS_FIND_INDEX = TYPE === 6;
	  var IS_FILTER_REJECT = TYPE === 7;
	  var NO_HOLES = TYPE === 5 || IS_FIND_INDEX;
	  return function ($this, callbackfn, that, specificCreate) {
	    var O = toObject($this);
	    var self = indexedObject(O);
	    var length = lengthOfArrayLike(self);
	    var boundFunction = functionBindContext(callbackfn, that);
	    var index = 0;
	    var create = specificCreate || arraySpeciesCreate;
	    var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_REJECT ? create($this, 0) : undefined;
	    var value, result;
	    for (; length > index; index++) if (NO_HOLES || index in self) {
	      value = self[index];
	      result = boundFunction(value, index, O);
	      if (TYPE) {
	        if (IS_MAP) target[index] = result; // map
	        else if (result) switch (TYPE) {
	          case 3:
	            return true;
	          // some
	          case 5:
	            return value;
	          // find
	          case 6:
	            return index;
	          // findIndex
	          case 2:
	            push$4(target, value);
	          // filter
	        } else switch (TYPE) {
	          case 4:
	            return false;
	          // every
	          case 7:
	            push$4(target, value);
	          // filterReject
	        }
	      }
	    }
	    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
	  };
	};
	var arrayIteration = {
	  // `Array.prototype.forEach` method
	  // https://tc39.es/ecma262/#sec-array.prototype.foreach
	  forEach: createMethod(0),
	  // `Array.prototype.map` method
	  // https://tc39.es/ecma262/#sec-array.prototype.map
	  map: createMethod(1),
	  // `Array.prototype.filter` method
	  // https://tc39.es/ecma262/#sec-array.prototype.filter
	  filter: createMethod(2),
	  // `Array.prototype.some` method
	  // https://tc39.es/ecma262/#sec-array.prototype.some
	  some: createMethod(3),
	  // `Array.prototype.every` method
	  // https://tc39.es/ecma262/#sec-array.prototype.every
	  every: createMethod(4),
	  // `Array.prototype.find` method
	  // https://tc39.es/ecma262/#sec-array.prototype.find
	  find: createMethod(5),
	  // `Array.prototype.findIndex` method
	  // https://tc39.es/ecma262/#sec-array.prototype.findIndex
	  findIndex: createMethod(6),
	  // `Array.prototype.filterReject` method
	  // https://github.com/tc39/proposal-array-filtering
	  filterReject: createMethod(7)
	};

	var arrayMethodIsStrict = function arrayMethodIsStrict(METHOD_NAME, argument) {
	  var method = [][METHOD_NAME];
	  return !!method && fails(function () {
	    // eslint-disable-next-line no-useless-call -- required for testing
	    method.call(null, argument || function () {
	      return 1;
	    }, 1);
	  });
	};

	var $forEach = arrayIteration.forEach;
	var STRICT_METHOD$1 = arrayMethodIsStrict('forEach');

	// `Array.prototype.forEach` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.foreach
	var arrayForEach = !STRICT_METHOD$1 ? function forEach(callbackfn /* , thisArg */) {
	  return $forEach(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  // eslint-disable-next-line es/no-array-prototype-foreach -- safe
	} : [].forEach;

	// `Array.prototype.forEach` method
	// https://tc39.es/ecma262/#sec-array.prototype.foreach
	// eslint-disable-next-line es/no-array-prototype-foreach -- safe
	_export({
	  target: 'Array',
	  proto: true,
	  forced: [].forEach !== arrayForEach
	}, {
	  forEach: arrayForEach
	});

	var entryUnbind = function entryUnbind(CONSTRUCTOR, METHOD) {
	  return functionUncurryThis(global_1[CONSTRUCTOR].prototype[METHOD]);
	};

	entryUnbind('Array', 'forEach');

	var SPECIES = wellKnownSymbol('species');
	var arrayMethodHasSpeciesSupport = function arrayMethodHasSpeciesSupport(METHOD_NAME) {
	  // We can't use this feature detection in V8 since it causes
	  // deoptimization and serious performance degradation
	  // https://github.com/zloirock/core-js/issues/677
	  return engineV8Version >= 51 || !fails(function () {
	    var array = [];
	    var constructor = array.constructor = {};
	    constructor[SPECIES] = function () {
	      return {
	        foo: 1
	      };
	    };
	    return array[METHOD_NAME](Boolean).foo !== 1;
	  });
	};

	var $map = arrayIteration.map;
	var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('map');

	// `Array.prototype.map` method
	// https://tc39.es/ecma262/#sec-array.prototype.map
	// with adding support of @@species
	_export({
	  target: 'Array',
	  proto: true,
	  forced: !HAS_SPECIES_SUPPORT
	}, {
	  map: function map(callbackfn /* , thisArg */) {
	    return $map(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	entryUnbind('Array', 'map');

	var $some = arrayIteration.some;
	var STRICT_METHOD = arrayMethodIsStrict('some');

	// `Array.prototype.some` method
	// https://tc39.es/ecma262/#sec-array.prototype.some
	_export({
	  target: 'Array',
	  proto: true,
	  forced: !STRICT_METHOD
	}, {
	  some: function some(callbackfn /* , thisArg */) {
	    return $some(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	entryUnbind('Array', 'some');

	var $includes = arrayIncludes.includes;

	// FF99+ bug
	var BROKEN_ON_SPARSE = fails(function () {
	  // eslint-disable-next-line es/no-array-prototype-includes -- detection
	  return !Array(1).includes();
	});

	// `Array.prototype.includes` method
	// https://tc39.es/ecma262/#sec-array.prototype.includes
	_export({
	  target: 'Array',
	  proto: true,
	  forced: BROKEN_ON_SPARSE
	}, {
	  includes: function includes(el /* , fromIndex = 0 */) {
	    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables('includes');

	entryUnbind('Array', 'includes');

	// eslint-disable-next-line es/no-object-assign -- safe
	var $assign = Object.assign;
	// eslint-disable-next-line es/no-object-defineproperty -- required for testing
	var defineProperty$1 = Object.defineProperty;
	var concat = functionUncurryThis([].concat);

	// `Object.assign` method
	// https://tc39.es/ecma262/#sec-object.assign
	var objectAssign = !$assign || fails(function () {
	  // should have correct order of operations (Edge bug)
	  if (descriptors && $assign({
	    b: 1
	  }, $assign(defineProperty$1({}, 'a', {
	    enumerable: true,
	    get: function get() {
	      defineProperty$1(this, 'b', {
	        value: 3,
	        enumerable: false
	      });
	    }
	  }), {
	    b: 2
	  })).b !== 1) return true;
	  // should work with symbols and should have deterministic property order (V8 bug)
	  var A = {};
	  var B = {};
	  // eslint-disable-next-line es/no-symbol -- safe
	  var symbol = Symbol('assign detection');
	  var alphabet = 'abcdefghijklmnopqrst';
	  A[symbol] = 7;
	  alphabet.split('').forEach(function (chr) {
	    B[chr] = chr;
	  });
	  return $assign({}, A)[symbol] !== 7 || objectKeys($assign({}, B)).join('') !== alphabet;
	}) ? function assign(target, source) {
	  // eslint-disable-line no-unused-vars -- required for `.length`
	  var T = toObject(target);
	  var argumentsLength = arguments.length;
	  var index = 1;
	  var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
	  var propertyIsEnumerable = objectPropertyIsEnumerable.f;
	  while (argumentsLength > index) {
	    var S = indexedObject(arguments[index++]);
	    var keys = getOwnPropertySymbols ? concat(objectKeys(S), getOwnPropertySymbols(S)) : objectKeys(S);
	    var length = keys.length;
	    var j = 0;
	    var key;
	    while (length > j) {
	      key = keys[j++];
	      if (!descriptors || functionCall(propertyIsEnumerable, S, key)) T[key] = S[key];
	    }
	  }
	  return T;
	} : $assign;

	// `Object.assign` method
	// https://tc39.es/ecma262/#sec-object.assign
	// eslint-disable-next-line es/no-object-assign -- required for testing
	_export({
	  target: 'Object',
	  stat: true,
	  arity: 2,
	  forced: Object.assign !== objectAssign
	}, {
	  assign: objectAssign
	});

	path.Object.assign;

	var ITERATOR$1 = wellKnownSymbol('iterator');
	var urlConstructorDetection = !fails(function () {
	  // eslint-disable-next-line unicorn/relative-url-style -- required for testing
	  var url = new URL('b?a=1&b=2&c=3', 'http://a');
	  var params = url.searchParams;
	  var params2 = new URLSearchParams('a=1&a=2&b=3');
	  var result = '';
	  url.pathname = 'c%20d';
	  params.forEach(function (value, key) {
	    params['delete']('b');
	    result += key + value;
	  });
	  params2['delete']('a', 2);
	  // `undefined` case is a Chromium 117 bug
	  // https://bugs.chromium.org/p/v8/issues/detail?id=14222
	  params2['delete']('b', undefined);
	  return isPure && (!url.toJSON || !params2.has('a', 1) || params2.has('a', 2) || !params2.has('a', undefined) || params2.has('b')) || !params.size && (isPure || !descriptors) || !params.sort || url.href !== 'http://a/c%20d?a=1&c=3' || params.get('c') !== '3' || String(new URLSearchParams('?a=1')) !== 'a=1' || !params[ITERATOR$1]
	  // throws in Edge
	  || new URL('https://a@b').username !== 'a' || new URLSearchParams(new URLSearchParams('a=b')).get('a') !== 'b'
	  // not punycoded in Edge
	  || new URL('http://тест').host !== 'xn--e1aybc'
	  // not escaped in Chrome 62-
	  || new URL('http://a#б').hash !== '#%D0%B1'
	  // fails in Chrome 66-
	  || result !== 'a1c3'
	  // throws in Safari
	  || new URL('http://x', undefined).host !== 'x';
	});

	var defineBuiltIns = function defineBuiltIns(target, src, options) {
	  for (var key in src) defineBuiltIn(target, key, src[key], options);
	  return target;
	};

	var floor$2 = Math.floor;
	var sort = function sort(array, comparefn) {
	  var length = array.length;
	  if (length < 8) {
	    // insertion sort
	    var i = 1;
	    var element, j;
	    while (i < length) {
	      j = i;
	      element = array[i];
	      while (j && comparefn(array[j - 1], element) > 0) {
	        array[j] = array[--j];
	      }
	      if (j !== i++) array[j] = element;
	    }
	  } else {
	    // merge sort
	    var middle = floor$2(length / 2);
	    var left = sort(arraySlice(array, 0, middle), comparefn);
	    var right = sort(arraySlice(array, middle), comparefn);
	    var llength = left.length;
	    var rlength = right.length;
	    var lindex = 0;
	    var rindex = 0;
	    while (lindex < llength || rindex < rlength) {
	      array[lindex + rindex] = lindex < llength && rindex < rlength ? comparefn(left[lindex], right[rindex]) <= 0 ? left[lindex++] : right[rindex++] : lindex < llength ? left[lindex++] : right[rindex++];
	    }
	  }
	  return array;
	};
	var arraySort = sort;

	// TODO: in core-js@4, move /modules/ dependencies to public entries for better optimization by tools like `preset-env`

	var ITERATOR = wellKnownSymbol('iterator');
	var URL_SEARCH_PARAMS = 'URLSearchParams';
	var URL_SEARCH_PARAMS_ITERATOR = URL_SEARCH_PARAMS + 'Iterator';
	var setInternalState$1 = internalState.set;
	var getInternalParamsState = internalState.getterFor(URL_SEARCH_PARAMS);
	var getInternalIteratorState = internalState.getterFor(URL_SEARCH_PARAMS_ITERATOR);
	var nativeFetch = safeGetBuiltIn('fetch');
	var NativeRequest = safeGetBuiltIn('Request');
	var Headers$1 = safeGetBuiltIn('Headers');
	var RequestPrototype = NativeRequest && NativeRequest.prototype;
	var HeadersPrototype = Headers$1 && Headers$1.prototype;
	var RegExp$1 = global_1.RegExp;
	var TypeError$2 = global_1.TypeError;
	var decodeURIComponent = global_1.decodeURIComponent;
	var encodeURIComponent$1 = global_1.encodeURIComponent;
	var charAt$1 = functionUncurryThis(''.charAt);
	var join$2 = functionUncurryThis([].join);
	var push$3 = functionUncurryThis([].push);
	var replace$2 = functionUncurryThis(''.replace);
	var shift$1 = functionUncurryThis([].shift);
	var splice = functionUncurryThis([].splice);
	var split$2 = functionUncurryThis(''.split);
	var stringSlice$1 = functionUncurryThis(''.slice);
	var plus = /\+/g;
	var sequences = Array(4);
	var percentSequence = function percentSequence(bytes) {
	  return sequences[bytes - 1] || (sequences[bytes - 1] = RegExp$1('((?:%[\\da-f]{2}){' + bytes + '})', 'gi'));
	};
	var percentDecode = function percentDecode(sequence) {
	  try {
	    return decodeURIComponent(sequence);
	  } catch (error) {
	    return sequence;
	  }
	};
	var deserialize = function deserialize(it) {
	  var result = replace$2(it, plus, ' ');
	  var bytes = 4;
	  try {
	    return decodeURIComponent(result);
	  } catch (error) {
	    while (bytes) {
	      result = replace$2(result, percentSequence(bytes--), percentDecode);
	    }
	    return result;
	  }
	};
	var find = /[!'()~]|%20/g;
	var replacements = {
	  '!': '%21',
	  "'": '%27',
	  '(': '%28',
	  ')': '%29',
	  '~': '%7E',
	  '%20': '+'
	};
	var replacer = function replacer(match) {
	  return replacements[match];
	};
	var _serialize = function serialize(it) {
	  return replace$2(encodeURIComponent$1(it), find, replacer);
	};
	var URLSearchParamsIterator = iteratorCreateConstructor(function Iterator(params, kind) {
	  setInternalState$1(this, {
	    type: URL_SEARCH_PARAMS_ITERATOR,
	    target: getInternalParamsState(params).entries,
	    index: 0,
	    kind: kind
	  });
	}, URL_SEARCH_PARAMS, function next() {
	  var state = getInternalIteratorState(this);
	  var target = state.target;
	  var index = state.index++;
	  if (!target || index >= target.length) {
	    state.target = undefined;
	    return createIterResultObject(undefined, true);
	  }
	  var entry = target[index];
	  switch (state.kind) {
	    case 'keys':
	      return createIterResultObject(entry.key, false);
	    case 'values':
	      return createIterResultObject(entry.value, false);
	  }
	  return createIterResultObject([entry.key, entry.value], false);
	}, true);
	var URLSearchParamsState = function URLSearchParamsState(init) {
	  this.entries = [];
	  this.url = null;
	  if (init !== undefined) {
	    if (isObject(init)) this.parseObject(init);else this.parseQuery(typeof init == 'string' ? charAt$1(init, 0) === '?' ? stringSlice$1(init, 1) : init : toString_1(init));
	  }
	};
	URLSearchParamsState.prototype = {
	  type: URL_SEARCH_PARAMS,
	  bindURL: function bindURL(url) {
	    this.url = url;
	    this.update();
	  },
	  parseObject: function parseObject(object) {
	    var entries = this.entries;
	    var iteratorMethod = getIteratorMethod(object);
	    var iterator, next, step, entryIterator, entryNext, first, second;
	    if (iteratorMethod) {
	      iterator = getIterator(object, iteratorMethod);
	      next = iterator.next;
	      while (!(step = functionCall(next, iterator)).done) {
	        entryIterator = getIterator(anObject(step.value));
	        entryNext = entryIterator.next;
	        if ((first = functionCall(entryNext, entryIterator)).done || (second = functionCall(entryNext, entryIterator)).done || !functionCall(entryNext, entryIterator).done) throw new TypeError$2('Expected sequence with length 2');
	        push$3(entries, {
	          key: toString_1(first.value),
	          value: toString_1(second.value)
	        });
	      }
	    } else for (var key in object) if (hasOwnProperty_1(object, key)) {
	      push$3(entries, {
	        key: key,
	        value: toString_1(object[key])
	      });
	    }
	  },
	  parseQuery: function parseQuery(query) {
	    if (query) {
	      var entries = this.entries;
	      var attributes = split$2(query, '&');
	      var index = 0;
	      var attribute, entry;
	      while (index < attributes.length) {
	        attribute = attributes[index++];
	        if (attribute.length) {
	          entry = split$2(attribute, '=');
	          push$3(entries, {
	            key: deserialize(shift$1(entry)),
	            value: deserialize(join$2(entry, '='))
	          });
	        }
	      }
	    }
	  },
	  serialize: function serialize() {
	    var entries = this.entries;
	    var result = [];
	    var index = 0;
	    var entry;
	    while (index < entries.length) {
	      entry = entries[index++];
	      push$3(result, _serialize(entry.key) + '=' + _serialize(entry.value));
	    }
	    return join$2(result, '&');
	  },
	  update: function update() {
	    this.entries.length = 0;
	    this.parseQuery(this.url.query);
	  },
	  updateURL: function updateURL() {
	    if (this.url) this.url.update();
	  }
	};

	// `URLSearchParams` constructor
	// https://url.spec.whatwg.org/#interface-urlsearchparams
	var URLSearchParamsConstructor = function URLSearchParams( /* init */
	) {
	  anInstance(this, URLSearchParamsPrototype$3);
	  var init = arguments.length > 0 ? arguments[0] : undefined;
	  var state = setInternalState$1(this, new URLSearchParamsState(init));
	  if (!descriptors) this.size = state.entries.length;
	};
	var URLSearchParamsPrototype$3 = URLSearchParamsConstructor.prototype;
	defineBuiltIns(URLSearchParamsPrototype$3, {
	  // `URLSearchParams.prototype.append` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-append
	  append: function append(name, value) {
	    var state = getInternalParamsState(this);
	    validateArgumentsLength(arguments.length, 2);
	    push$3(state.entries, {
	      key: toString_1(name),
	      value: toString_1(value)
	    });
	    if (!descriptors) this.length++;
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.delete` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-delete
	  'delete': function _delete(name /* , value */) {
	    var state = getInternalParamsState(this);
	    var length = validateArgumentsLength(arguments.length, 1);
	    var entries = state.entries;
	    var key = toString_1(name);
	    var $value = length < 2 ? undefined : arguments[1];
	    var value = $value === undefined ? $value : toString_1($value);
	    var index = 0;
	    while (index < entries.length) {
	      var entry = entries[index];
	      if (entry.key === key && (value === undefined || entry.value === value)) {
	        splice(entries, index, 1);
	        if (value !== undefined) break;
	      } else index++;
	    }
	    if (!descriptors) this.size = entries.length;
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.get` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-get
	  get: function get(name) {
	    var entries = getInternalParamsState(this).entries;
	    validateArgumentsLength(arguments.length, 1);
	    var key = toString_1(name);
	    var index = 0;
	    for (; index < entries.length; index++) {
	      if (entries[index].key === key) return entries[index].value;
	    }
	    return null;
	  },
	  // `URLSearchParams.prototype.getAll` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-getall
	  getAll: function getAll(name) {
	    var entries = getInternalParamsState(this).entries;
	    validateArgumentsLength(arguments.length, 1);
	    var key = toString_1(name);
	    var result = [];
	    var index = 0;
	    for (; index < entries.length; index++) {
	      if (entries[index].key === key) push$3(result, entries[index].value);
	    }
	    return result;
	  },
	  // `URLSearchParams.prototype.has` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-has
	  has: function has(name /* , value */) {
	    var entries = getInternalParamsState(this).entries;
	    var length = validateArgumentsLength(arguments.length, 1);
	    var key = toString_1(name);
	    var $value = length < 2 ? undefined : arguments[1];
	    var value = $value === undefined ? $value : toString_1($value);
	    var index = 0;
	    while (index < entries.length) {
	      var entry = entries[index++];
	      if (entry.key === key && (value === undefined || entry.value === value)) return true;
	    }
	    return false;
	  },
	  // `URLSearchParams.prototype.set` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-set
	  set: function set(name, value) {
	    var state = getInternalParamsState(this);
	    validateArgumentsLength(arguments.length, 1);
	    var entries = state.entries;
	    var found = false;
	    var key = toString_1(name);
	    var val = toString_1(value);
	    var index = 0;
	    var entry;
	    for (; index < entries.length; index++) {
	      entry = entries[index];
	      if (entry.key === key) {
	        if (found) splice(entries, index--, 1);else {
	          found = true;
	          entry.value = val;
	        }
	      }
	    }
	    if (!found) push$3(entries, {
	      key: key,
	      value: val
	    });
	    if (!descriptors) this.size = entries.length;
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.sort` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-sort
	  sort: function sort() {
	    var state = getInternalParamsState(this);
	    arraySort(state.entries, function (a, b) {
	      return a.key > b.key ? 1 : -1;
	    });
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.forEach` method
	  forEach: function forEach(callback /* , thisArg */) {
	    var entries = getInternalParamsState(this).entries;
	    var boundFunction = functionBindContext(callback, arguments.length > 1 ? arguments[1] : undefined);
	    var index = 0;
	    var entry;
	    while (index < entries.length) {
	      entry = entries[index++];
	      boundFunction(entry.value, entry.key, this);
	    }
	  },
	  // `URLSearchParams.prototype.keys` method
	  keys: function keys() {
	    return new URLSearchParamsIterator(this, 'keys');
	  },
	  // `URLSearchParams.prototype.values` method
	  values: function values() {
	    return new URLSearchParamsIterator(this, 'values');
	  },
	  // `URLSearchParams.prototype.entries` method
	  entries: function entries() {
	    return new URLSearchParamsIterator(this, 'entries');
	  }
	}, {
	  enumerable: true
	});

	// `URLSearchParams.prototype[@@iterator]` method
	defineBuiltIn(URLSearchParamsPrototype$3, ITERATOR, URLSearchParamsPrototype$3.entries, {
	  name: 'entries'
	});

	// `URLSearchParams.prototype.toString` method
	// https://url.spec.whatwg.org/#urlsearchparams-stringification-behavior
	defineBuiltIn(URLSearchParamsPrototype$3, 'toString', function toString() {
	  return getInternalParamsState(this).serialize();
	}, {
	  enumerable: true
	});

	// `URLSearchParams.prototype.size` getter
	// https://github.com/whatwg/url/pull/734
	if (descriptors) defineBuiltInAccessor(URLSearchParamsPrototype$3, 'size', {
	  get: function size() {
	    return getInternalParamsState(this).entries.length;
	  },
	  configurable: true,
	  enumerable: true
	});
	setToStringTag(URLSearchParamsConstructor, URL_SEARCH_PARAMS);
	_export({
	  global: true,
	  constructor: true,
	  forced: !urlConstructorDetection
	}, {
	  URLSearchParams: URLSearchParamsConstructor
	});

	// Wrap `fetch` and `Request` for correct work with polyfilled `URLSearchParams`
	if (!urlConstructorDetection && isCallable(Headers$1)) {
	  var headersHas = functionUncurryThis(HeadersPrototype.has);
	  var headersSet = functionUncurryThis(HeadersPrototype.set);
	  var wrapRequestOptions = function wrapRequestOptions(init) {
	    if (isObject(init)) {
	      var body = init.body;
	      var headers;
	      if (classof(body) === URL_SEARCH_PARAMS) {
	        headers = init.headers ? new Headers$1(init.headers) : new Headers$1();
	        if (!headersHas(headers, 'content-type')) {
	          headersSet(headers, 'content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
	        }
	        return objectCreate(init, {
	          body: createPropertyDescriptor(0, toString_1(body)),
	          headers: createPropertyDescriptor(0, headers)
	        });
	      }
	    }
	    return init;
	  };
	  if (isCallable(nativeFetch)) {
	    _export({
	      global: true,
	      enumerable: true,
	      dontCallGetSet: true,
	      forced: true
	    }, {
	      fetch: function fetch(input /* , init */) {
	        return nativeFetch(input, arguments.length > 1 ? wrapRequestOptions(arguments[1]) : {});
	      }
	    });
	  }
	  if (isCallable(NativeRequest)) {
	    var RequestConstructor = function Request(input /* , init */) {
	      anInstance(this, RequestPrototype);
	      return new NativeRequest(input, arguments.length > 1 ? wrapRequestOptions(arguments[1]) : {});
	    };
	    RequestPrototype.constructor = RequestConstructor;
	    RequestConstructor.prototype = RequestPrototype;
	    _export({
	      global: true,
	      constructor: true,
	      dontCallGetSet: true,
	      forced: true
	    }, {
	      Request: RequestConstructor
	    });
	  }
	}
	var web_urlSearchParams_constructor = {
	  URLSearchParams: URLSearchParamsConstructor,
	  getState: getInternalParamsState
	};

	var $URLSearchParams$1 = URLSearchParams;
	var URLSearchParamsPrototype$2 = $URLSearchParams$1.prototype;
	var append = functionUncurryThis(URLSearchParamsPrototype$2.append);
	var $delete = functionUncurryThis(URLSearchParamsPrototype$2['delete']);
	var forEach$1 = functionUncurryThis(URLSearchParamsPrototype$2.forEach);
	var push$2 = functionUncurryThis([].push);
	var params$1 = new $URLSearchParams$1('a=1&a=2&b=3');
	params$1['delete']('a', 1);
	// `undefined` case is a Chromium 117 bug
	// https://bugs.chromium.org/p/v8/issues/detail?id=14222
	params$1['delete']('b', undefined);
	if (params$1 + '' !== 'a=2') {
	  defineBuiltIn(URLSearchParamsPrototype$2, 'delete', function (name /* , value */) {
	    var length = arguments.length;
	    var $value = length < 2 ? undefined : arguments[1];
	    if (length && $value === undefined) return $delete(this, name);
	    var entries = [];
	    forEach$1(this, function (v, k) {
	      // also validates `this`
	      push$2(entries, {
	        key: k,
	        value: v
	      });
	    });
	    validateArgumentsLength(length, 1);
	    var key = toString_1(name);
	    var value = toString_1($value);
	    var index = 0;
	    var dindex = 0;
	    var found = false;
	    var entriesLength = entries.length;
	    var entry;
	    while (index < entriesLength) {
	      entry = entries[index++];
	      if (found || entry.key === key) {
	        found = true;
	        $delete(this, entry.key);
	      } else dindex++;
	    }
	    while (dindex < entriesLength) {
	      entry = entries[dindex++];
	      if (!(entry.key === key && entry.value === value)) append(this, entry.key, entry.value);
	    }
	  }, {
	    enumerable: true,
	    unsafe: true
	  });
	}

	var $URLSearchParams = URLSearchParams;
	var URLSearchParamsPrototype$1 = $URLSearchParams.prototype;
	var getAll = functionUncurryThis(URLSearchParamsPrototype$1.getAll);
	var $has = functionUncurryThis(URLSearchParamsPrototype$1.has);
	var params = new $URLSearchParams('a=1');

	// `undefined` case is a Chromium 117 bug
	// https://bugs.chromium.org/p/v8/issues/detail?id=14222
	if (params.has('a', 2) || !params.has('a', undefined)) {
	  defineBuiltIn(URLSearchParamsPrototype$1, 'has', function has(name /* , value */) {
	    var length = arguments.length;
	    var $value = length < 2 ? undefined : arguments[1];
	    if (length && $value === undefined) return $has(this, name);
	    var values = getAll(this, name); // also validates `this`
	    validateArgumentsLength(length, 1);
	    var value = toString_1($value);
	    var index = 0;
	    while (index < values.length) {
	      if (values[index++] === value) return true;
	    }
	    return false;
	  }, {
	    enumerable: true,
	    unsafe: true
	  });
	}

	var URLSearchParamsPrototype = URLSearchParams.prototype;
	var forEach = functionUncurryThis(URLSearchParamsPrototype.forEach);

	// `URLSearchParams.prototype.size` getter
	// https://github.com/whatwg/url/pull/734
	if (descriptors && !('size' in URLSearchParamsPrototype)) {
	  defineBuiltInAccessor(URLSearchParamsPrototype, 'size', {
	    get: function size() {
	      var count = 0;
	      forEach(this, function () {
	        count++;
	      });
	      return count;
	    },
	    configurable: true,
	    enumerable: true
	  });
	}

	path.URLSearchParams;

	// call something on iterator step with safe closing on error
	var callWithSafeIterationClosing = function callWithSafeIterationClosing(iterator, fn, value, ENTRIES) {
	  try {
	    return ENTRIES ? fn(anObject(value)[0], value[1]) : fn(value);
	  } catch (error) {
	    iteratorClose(iterator, 'throw', error);
	  }
	};

	var createProperty = function createProperty(object, key, value) {
	  var propertyKey = toPropertyKey(key);
	  if (propertyKey in object) objectDefineProperty.f(object, propertyKey, createPropertyDescriptor(0, value));else object[propertyKey] = value;
	};

	var $Array = Array;

	// `Array.from` method implementation
	// https://tc39.es/ecma262/#sec-array.from
	var arrayFrom = function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
	  var O = toObject(arrayLike);
	  var IS_CONSTRUCTOR = isConstructor(this);
	  var argumentsLength = arguments.length;
	  var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
	  var mapping = mapfn !== undefined;
	  if (mapping) mapfn = functionBindContext(mapfn, argumentsLength > 2 ? arguments[2] : undefined);
	  var iteratorMethod = getIteratorMethod(O);
	  var index = 0;
	  var length, result, step, iterator, next, value;
	  // if the target is not iterable or it's an array with the default iterator - use a simple case
	  if (iteratorMethod && !(this === $Array && isArrayIteratorMethod(iteratorMethod))) {
	    iterator = getIterator(O, iteratorMethod);
	    next = iterator.next;
	    result = IS_CONSTRUCTOR ? new this() : [];
	    for (; !(step = functionCall(next, iterator)).done; index++) {
	      value = mapping ? callWithSafeIterationClosing(iterator, mapfn, [step.value, index], true) : step.value;
	      createProperty(result, index, value);
	    }
	  } else {
	    length = lengthOfArrayLike(O);
	    result = IS_CONSTRUCTOR ? new this(length) : $Array(length);
	    for (; length > index; index++) {
	      value = mapping ? mapfn(O[index], index) : O[index];
	      createProperty(result, index, value);
	    }
	  }
	  result.length = index;
	  return result;
	};

	// based on https://github.com/bestiejs/punycode.js/blob/master/punycode.js

	var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1
	var base = 36;
	var tMin = 1;
	var tMax = 26;
	var skew = 38;
	var damp = 700;
	var initialBias = 72;
	var initialN = 128; // 0x80
	var delimiter = '-'; // '\x2D'
	var regexNonASCII = /[^\0-\u007E]/; // non-ASCII chars
	var regexSeparators = /[.\u3002\uFF0E\uFF61]/g; // RFC 3490 separators
	var OVERFLOW_ERROR = 'Overflow: input needs wider integers to process';
	var baseMinusTMin = base - tMin;
	var $RangeError = RangeError;
	var exec$1 = functionUncurryThis(regexSeparators.exec);
	var floor$1 = Math.floor;
	var fromCharCode = String.fromCharCode;
	var charCodeAt = functionUncurryThis(''.charCodeAt);
	var join$1 = functionUncurryThis([].join);
	var push$1 = functionUncurryThis([].push);
	var replace$1 = functionUncurryThis(''.replace);
	var split$1 = functionUncurryThis(''.split);
	var toLowerCase$1 = functionUncurryThis(''.toLowerCase);

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 */
	var ucs2decode = function ucs2decode(string) {
	  var output = [];
	  var counter = 0;
	  var length = string.length;
	  while (counter < length) {
	    var value = charCodeAt(string, counter++);
	    if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
	      // It's a high surrogate, and there is a next character.
	      var extra = charCodeAt(string, counter++);
	      if ((extra & 0xFC00) === 0xDC00) {
	        // Low surrogate.
	        push$1(output, ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
	      } else {
	        // It's an unmatched surrogate; only append this code unit, in case the
	        // next code unit is the high surrogate of a surrogate pair.
	        push$1(output, value);
	        counter--;
	      }
	    } else {
	      push$1(output, value);
	    }
	  }
	  return output;
	};

	/**
	 * Converts a digit/integer into a basic code point.
	 */
	var digitToBasic = function digitToBasic(digit) {
	  //  0..25 map to ASCII a..z or A..Z
	  // 26..35 map to ASCII 0..9
	  return digit + 22 + 75 * (digit < 26);
	};

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 */
	var adapt = function adapt(delta, numPoints, firstTime) {
	  var k = 0;
	  delta = firstTime ? floor$1(delta / damp) : delta >> 1;
	  delta += floor$1(delta / numPoints);
	  while (delta > baseMinusTMin * tMax >> 1) {
	    delta = floor$1(delta / baseMinusTMin);
	    k += base;
	  }
	  return floor$1(k + (baseMinusTMin + 1) * delta / (delta + skew));
	};

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 */
	var encode = function encode(input) {
	  var output = [];

	  // Convert the input in UCS-2 to an array of Unicode code points.
	  input = ucs2decode(input);

	  // Cache the length.
	  var inputLength = input.length;

	  // Initialize the state.
	  var n = initialN;
	  var delta = 0;
	  var bias = initialBias;
	  var i, currentValue;

	  // Handle the basic code points.
	  for (i = 0; i < input.length; i++) {
	    currentValue = input[i];
	    if (currentValue < 0x80) {
	      push$1(output, fromCharCode(currentValue));
	    }
	  }
	  var basicLength = output.length; // number of basic code points.
	  var handledCPCount = basicLength; // number of code points that have been handled;

	  // Finish the basic string with a delimiter unless it's empty.
	  if (basicLength) {
	    push$1(output, delimiter);
	  }

	  // Main encoding loop:
	  while (handledCPCount < inputLength) {
	    // All non-basic code points < n have been handled already. Find the next larger one:
	    var m = maxInt;
	    for (i = 0; i < input.length; i++) {
	      currentValue = input[i];
	      if (currentValue >= n && currentValue < m) {
	        m = currentValue;
	      }
	    }

	    // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>, but guard against overflow.
	    var handledCPCountPlusOne = handledCPCount + 1;
	    if (m - n > floor$1((maxInt - delta) / handledCPCountPlusOne)) {
	      throw new $RangeError(OVERFLOW_ERROR);
	    }
	    delta += (m - n) * handledCPCountPlusOne;
	    n = m;
	    for (i = 0; i < input.length; i++) {
	      currentValue = input[i];
	      if (currentValue < n && ++delta > maxInt) {
	        throw new $RangeError(OVERFLOW_ERROR);
	      }
	      if (currentValue === n) {
	        // Represent delta as a generalized variable-length integer.
	        var q = delta;
	        var k = base;
	        while (true) {
	          var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
	          if (q < t) break;
	          var qMinusT = q - t;
	          var baseMinusT = base - t;
	          push$1(output, fromCharCode(digitToBasic(t + qMinusT % baseMinusT)));
	          q = floor$1(qMinusT / baseMinusT);
	          k += base;
	        }
	        push$1(output, fromCharCode(digitToBasic(q)));
	        bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength);
	        delta = 0;
	        handledCPCount++;
	      }
	    }
	    delta++;
	    n++;
	  }
	  return join$1(output, '');
	};
	var stringPunycodeToAscii = function stringPunycodeToAscii(input) {
	  var encoded = [];
	  var labels = split$1(replace$1(toLowerCase$1(input), regexSeparators, "."), '.');
	  var i, label;
	  for (i = 0; i < labels.length; i++) {
	    label = labels[i];
	    push$1(encoded, exec$1(regexNonASCII, label) ? 'xn--' + encode(label) : label);
	  }
	  return join$1(encoded, '.');
	};

	// TODO: in core-js@4, move /modules/ dependencies to public entries for better optimization by tools like `preset-env`

	var codeAt = stringMultibyte.codeAt;
	var setInternalState = internalState.set;
	var getInternalURLState = internalState.getterFor('URL');
	var URLSearchParams$1 = web_urlSearchParams_constructor.URLSearchParams;
	var getInternalSearchParamsState = web_urlSearchParams_constructor.getState;
	var NativeURL = global_1.URL;
	var TypeError$1 = global_1.TypeError;
	var parseInt$1 = global_1.parseInt;
	var floor = Math.floor;
	var pow = Math.pow;
	var charAt = functionUncurryThis(''.charAt);
	var exec = functionUncurryThis(/./.exec);
	var join = functionUncurryThis([].join);
	var numberToString = functionUncurryThis(1.0.toString);
	var pop = functionUncurryThis([].pop);
	var push = functionUncurryThis([].push);
	var replace = functionUncurryThis(''.replace);
	var shift = functionUncurryThis([].shift);
	var split = functionUncurryThis(''.split);
	var stringSlice = functionUncurryThis(''.slice);
	var toLowerCase = functionUncurryThis(''.toLowerCase);
	var unshift = functionUncurryThis([].unshift);
	var INVALID_AUTHORITY = 'Invalid authority';
	var INVALID_SCHEME = 'Invalid scheme';
	var INVALID_HOST = 'Invalid host';
	var INVALID_PORT = 'Invalid port';
	var ALPHA = /[a-z]/i;
	// eslint-disable-next-line regexp/no-obscure-range -- safe
	var ALPHANUMERIC = /[\d+-.a-z]/i;
	var DIGIT = /\d/;
	var HEX_START = /^0x/i;
	var OCT = /^[0-7]+$/;
	var DEC = /^\d+$/;
	var HEX = /^[\da-f]+$/i;
	/* eslint-disable regexp/no-control-character -- safe */
	var FORBIDDEN_HOST_CODE_POINT = /[\0\t\n\r #%/:<>?@[\\\]^|]/;
	var FORBIDDEN_HOST_CODE_POINT_EXCLUDING_PERCENT = /[\0\t\n\r #/:<>?@[\\\]^|]/;
	var LEADING_C0_CONTROL_OR_SPACE = /^[\u0000-\u0020]+/;
	var TRAILING_C0_CONTROL_OR_SPACE = /(^|[^\u0000-\u0020])[\u0000-\u0020]+$/;
	var TAB_AND_NEW_LINE = /[\t\n\r]/g;
	/* eslint-enable regexp/no-control-character -- safe */
	var EOF;

	// https://url.spec.whatwg.org/#ipv4-number-parser
	var parseIPv4 = function parseIPv4(input) {
	  var parts = split(input, '.');
	  var partsLength, numbers, index, part, radix, number, ipv4;
	  if (parts.length && parts[parts.length - 1] === '') {
	    parts.length--;
	  }
	  partsLength = parts.length;
	  if (partsLength > 4) return input;
	  numbers = [];
	  for (index = 0; index < partsLength; index++) {
	    part = parts[index];
	    if (part === '') return input;
	    radix = 10;
	    if (part.length > 1 && charAt(part, 0) === '0') {
	      radix = exec(HEX_START, part) ? 16 : 8;
	      part = stringSlice(part, radix === 8 ? 1 : 2);
	    }
	    if (part === '') {
	      number = 0;
	    } else {
	      if (!exec(radix === 10 ? DEC : radix === 8 ? OCT : HEX, part)) return input;
	      number = parseInt$1(part, radix);
	    }
	    push(numbers, number);
	  }
	  for (index = 0; index < partsLength; index++) {
	    number = numbers[index];
	    if (index === partsLength - 1) {
	      if (number >= pow(256, 5 - partsLength)) return null;
	    } else if (number > 255) return null;
	  }
	  ipv4 = pop(numbers);
	  for (index = 0; index < numbers.length; index++) {
	    ipv4 += numbers[index] * pow(256, 3 - index);
	  }
	  return ipv4;
	};

	// https://url.spec.whatwg.org/#concept-ipv6-parser
	// eslint-disable-next-line max-statements -- TODO
	var parseIPv6 = function parseIPv6(input) {
	  var address = [0, 0, 0, 0, 0, 0, 0, 0];
	  var pieceIndex = 0;
	  var compress = null;
	  var pointer = 0;
	  var value, length, numbersSeen, ipv4Piece, number, swaps, swap;
	  var chr = function chr() {
	    return charAt(input, pointer);
	  };
	  if (chr() === ':') {
	    if (charAt(input, 1) !== ':') return;
	    pointer += 2;
	    pieceIndex++;
	    compress = pieceIndex;
	  }
	  while (chr()) {
	    if (pieceIndex === 8) return;
	    if (chr() === ':') {
	      if (compress !== null) return;
	      pointer++;
	      pieceIndex++;
	      compress = pieceIndex;
	      continue;
	    }
	    value = length = 0;
	    while (length < 4 && exec(HEX, chr())) {
	      value = value * 16 + parseInt$1(chr(), 16);
	      pointer++;
	      length++;
	    }
	    if (chr() === '.') {
	      if (length === 0) return;
	      pointer -= length;
	      if (pieceIndex > 6) return;
	      numbersSeen = 0;
	      while (chr()) {
	        ipv4Piece = null;
	        if (numbersSeen > 0) {
	          if (chr() === '.' && numbersSeen < 4) pointer++;else return;
	        }
	        if (!exec(DIGIT, chr())) return;
	        while (exec(DIGIT, chr())) {
	          number = parseInt$1(chr(), 10);
	          if (ipv4Piece === null) ipv4Piece = number;else if (ipv4Piece === 0) return;else ipv4Piece = ipv4Piece * 10 + number;
	          if (ipv4Piece > 255) return;
	          pointer++;
	        }
	        address[pieceIndex] = address[pieceIndex] * 256 + ipv4Piece;
	        numbersSeen++;
	        if (numbersSeen === 2 || numbersSeen === 4) pieceIndex++;
	      }
	      if (numbersSeen !== 4) return;
	      break;
	    } else if (chr() === ':') {
	      pointer++;
	      if (!chr()) return;
	    } else if (chr()) return;
	    address[pieceIndex++] = value;
	  }
	  if (compress !== null) {
	    swaps = pieceIndex - compress;
	    pieceIndex = 7;
	    while (pieceIndex !== 0 && swaps > 0) {
	      swap = address[pieceIndex];
	      address[pieceIndex--] = address[compress + swaps - 1];
	      address[compress + --swaps] = swap;
	    }
	  } else if (pieceIndex !== 8) return;
	  return address;
	};
	var findLongestZeroSequence = function findLongestZeroSequence(ipv6) {
	  var maxIndex = null;
	  var maxLength = 1;
	  var currStart = null;
	  var currLength = 0;
	  var index = 0;
	  for (; index < 8; index++) {
	    if (ipv6[index] !== 0) {
	      if (currLength > maxLength) {
	        maxIndex = currStart;
	        maxLength = currLength;
	      }
	      currStart = null;
	      currLength = 0;
	    } else {
	      if (currStart === null) currStart = index;
	      ++currLength;
	    }
	  }
	  if (currLength > maxLength) {
	    maxIndex = currStart;
	    maxLength = currLength;
	  }
	  return maxIndex;
	};

	// https://url.spec.whatwg.org/#host-serializing
	var serializeHost = function serializeHost(host) {
	  var result, index, compress, ignore0;
	  // ipv4
	  if (typeof host == 'number') {
	    result = [];
	    for (index = 0; index < 4; index++) {
	      unshift(result, host % 256);
	      host = floor(host / 256);
	    }
	    return join(result, '.');
	    // ipv6
	  } else if (_typeof$1(host) == 'object') {
	    result = '';
	    compress = findLongestZeroSequence(host);
	    for (index = 0; index < 8; index++) {
	      if (ignore0 && host[index] === 0) continue;
	      if (ignore0) ignore0 = false;
	      if (compress === index) {
	        result += index ? ':' : '::';
	        ignore0 = true;
	      } else {
	        result += numberToString(host[index], 16);
	        if (index < 7) result += ':';
	      }
	    }
	    return '[' + result + ']';
	  }
	  return host;
	};
	var C0ControlPercentEncodeSet = {};
	var fragmentPercentEncodeSet = objectAssign({}, C0ControlPercentEncodeSet, {
	  ' ': 1,
	  '"': 1,
	  '<': 1,
	  '>': 1,
	  '`': 1
	});
	var pathPercentEncodeSet = objectAssign({}, fragmentPercentEncodeSet, {
	  '#': 1,
	  '?': 1,
	  '{': 1,
	  '}': 1
	});
	var userinfoPercentEncodeSet = objectAssign({}, pathPercentEncodeSet, {
	  '/': 1,
	  ':': 1,
	  ';': 1,
	  '=': 1,
	  '@': 1,
	  '[': 1,
	  '\\': 1,
	  ']': 1,
	  '^': 1,
	  '|': 1
	});
	var percentEncode = function percentEncode(chr, set) {
	  var code = codeAt(chr, 0);
	  return code > 0x20 && code < 0x7F && !hasOwnProperty_1(set, chr) ? chr : encodeURIComponent(chr);
	};

	// https://url.spec.whatwg.org/#special-scheme
	var specialSchemes = {
	  ftp: 21,
	  file: null,
	  http: 80,
	  https: 443,
	  ws: 80,
	  wss: 443
	};

	// https://url.spec.whatwg.org/#windows-drive-letter
	var isWindowsDriveLetter = function isWindowsDriveLetter(string, normalized) {
	  var second;
	  return string.length === 2 && exec(ALPHA, charAt(string, 0)) && ((second = charAt(string, 1)) === ':' || !normalized && second === '|');
	};

	// https://url.spec.whatwg.org/#start-with-a-windows-drive-letter
	var startsWithWindowsDriveLetter = function startsWithWindowsDriveLetter(string) {
	  var third;
	  return string.length > 1 && isWindowsDriveLetter(stringSlice(string, 0, 2)) && (string.length === 2 || (third = charAt(string, 2)) === '/' || third === '\\' || third === '?' || third === '#');
	};

	// https://url.spec.whatwg.org/#single-dot-path-segment
	var isSingleDot = function isSingleDot(segment) {
	  return segment === '.' || toLowerCase(segment) === '%2e';
	};

	// https://url.spec.whatwg.org/#double-dot-path-segment
	var isDoubleDot = function isDoubleDot(segment) {
	  segment = toLowerCase(segment);
	  return segment === '..' || segment === '%2e.' || segment === '.%2e' || segment === '%2e%2e';
	};

	// States:
	var SCHEME_START = {};
	var SCHEME = {};
	var NO_SCHEME = {};
	var SPECIAL_RELATIVE_OR_AUTHORITY = {};
	var PATH_OR_AUTHORITY = {};
	var RELATIVE = {};
	var RELATIVE_SLASH = {};
	var SPECIAL_AUTHORITY_SLASHES = {};
	var SPECIAL_AUTHORITY_IGNORE_SLASHES = {};
	var AUTHORITY = {};
	var HOST = {};
	var HOSTNAME = {};
	var PORT = {};
	var FILE = {};
	var FILE_SLASH = {};
	var FILE_HOST = {};
	var PATH_START = {};
	var PATH = {};
	var CANNOT_BE_A_BASE_URL_PATH = {};
	var QUERY = {};
	var FRAGMENT = {};
	var URLState = function URLState(url, isBase, base) {
	  var urlString = toString_1(url);
	  var baseState, failure, searchParams;
	  if (isBase) {
	    failure = this.parse(urlString);
	    if (failure) throw new TypeError$1(failure);
	    this.searchParams = null;
	  } else {
	    if (base !== undefined) baseState = new URLState(base, true);
	    failure = this.parse(urlString, null, baseState);
	    if (failure) throw new TypeError$1(failure);
	    searchParams = getInternalSearchParamsState(new URLSearchParams$1());
	    searchParams.bindURL(this);
	    this.searchParams = searchParams;
	  }
	};
	URLState.prototype = {
	  type: 'URL',
	  // https://url.spec.whatwg.org/#url-parsing
	  // eslint-disable-next-line max-statements -- TODO
	  parse: function parse(input, stateOverride, base) {
	    var url = this;
	    var state = stateOverride || SCHEME_START;
	    var pointer = 0;
	    var buffer = '';
	    var seenAt = false;
	    var seenBracket = false;
	    var seenPasswordToken = false;
	    var codePoints, chr, bufferCodePoints, failure;
	    input = toString_1(input);
	    if (!stateOverride) {
	      url.scheme = '';
	      url.username = '';
	      url.password = '';
	      url.host = null;
	      url.port = null;
	      url.path = [];
	      url.query = null;
	      url.fragment = null;
	      url.cannotBeABaseURL = false;
	      input = replace(input, LEADING_C0_CONTROL_OR_SPACE, '');
	      input = replace(input, TRAILING_C0_CONTROL_OR_SPACE, '$1');
	    }
	    input = replace(input, TAB_AND_NEW_LINE, '');
	    codePoints = arrayFrom(input);
	    while (pointer <= codePoints.length) {
	      chr = codePoints[pointer];
	      switch (state) {
	        case SCHEME_START:
	          if (chr && exec(ALPHA, chr)) {
	            buffer += toLowerCase(chr);
	            state = SCHEME;
	          } else if (!stateOverride) {
	            state = NO_SCHEME;
	            continue;
	          } else return INVALID_SCHEME;
	          break;
	        case SCHEME:
	          if (chr && (exec(ALPHANUMERIC, chr) || chr === '+' || chr === '-' || chr === '.')) {
	            buffer += toLowerCase(chr);
	          } else if (chr === ':') {
	            if (stateOverride && (url.isSpecial() !== hasOwnProperty_1(specialSchemes, buffer) || buffer === 'file' && (url.includesCredentials() || url.port !== null) || url.scheme === 'file' && !url.host)) return;
	            url.scheme = buffer;
	            if (stateOverride) {
	              if (url.isSpecial() && specialSchemes[url.scheme] === url.port) url.port = null;
	              return;
	            }
	            buffer = '';
	            if (url.scheme === 'file') {
	              state = FILE;
	            } else if (url.isSpecial() && base && base.scheme === url.scheme) {
	              state = SPECIAL_RELATIVE_OR_AUTHORITY;
	            } else if (url.isSpecial()) {
	              state = SPECIAL_AUTHORITY_SLASHES;
	            } else if (codePoints[pointer + 1] === '/') {
	              state = PATH_OR_AUTHORITY;
	              pointer++;
	            } else {
	              url.cannotBeABaseURL = true;
	              push(url.path, '');
	              state = CANNOT_BE_A_BASE_URL_PATH;
	            }
	          } else if (!stateOverride) {
	            buffer = '';
	            state = NO_SCHEME;
	            pointer = 0;
	            continue;
	          } else return INVALID_SCHEME;
	          break;
	        case NO_SCHEME:
	          if (!base || base.cannotBeABaseURL && chr !== '#') return INVALID_SCHEME;
	          if (base.cannotBeABaseURL && chr === '#') {
	            url.scheme = base.scheme;
	            url.path = arraySlice(base.path);
	            url.query = base.query;
	            url.fragment = '';
	            url.cannotBeABaseURL = true;
	            state = FRAGMENT;
	            break;
	          }
	          state = base.scheme === 'file' ? FILE : RELATIVE;
	          continue;
	        case SPECIAL_RELATIVE_OR_AUTHORITY:
	          if (chr === '/' && codePoints[pointer + 1] === '/') {
	            state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
	            pointer++;
	          } else {
	            state = RELATIVE;
	            continue;
	          }
	          break;
	        case PATH_OR_AUTHORITY:
	          if (chr === '/') {
	            state = AUTHORITY;
	            break;
	          } else {
	            state = PATH;
	            continue;
	          }
	        case RELATIVE:
	          url.scheme = base.scheme;
	          if (chr === EOF) {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.query = base.query;
	          } else if (chr === '/' || chr === '\\' && url.isSpecial()) {
	            state = RELATIVE_SLASH;
	          } else if (chr === '?') {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.query = '';
	            state = QUERY;
	          } else if (chr === '#') {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.query = base.query;
	            url.fragment = '';
	            state = FRAGMENT;
	          } else {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.path.length--;
	            state = PATH;
	            continue;
	          }
	          break;
	        case RELATIVE_SLASH:
	          if (url.isSpecial() && (chr === '/' || chr === '\\')) {
	            state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
	          } else if (chr === '/') {
	            state = AUTHORITY;
	          } else {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            state = PATH;
	            continue;
	          }
	          break;
	        case SPECIAL_AUTHORITY_SLASHES:
	          state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
	          if (chr !== '/' || charAt(buffer, pointer + 1) !== '/') continue;
	          pointer++;
	          break;
	        case SPECIAL_AUTHORITY_IGNORE_SLASHES:
	          if (chr !== '/' && chr !== '\\') {
	            state = AUTHORITY;
	            continue;
	          }
	          break;
	        case AUTHORITY:
	          if (chr === '@') {
	            if (seenAt) buffer = '%40' + buffer;
	            seenAt = true;
	            bufferCodePoints = arrayFrom(buffer);
	            for (var i = 0; i < bufferCodePoints.length; i++) {
	              var codePoint = bufferCodePoints[i];
	              if (codePoint === ':' && !seenPasswordToken) {
	                seenPasswordToken = true;
	                continue;
	              }
	              var encodedCodePoints = percentEncode(codePoint, userinfoPercentEncodeSet);
	              if (seenPasswordToken) url.password += encodedCodePoints;else url.username += encodedCodePoints;
	            }
	            buffer = '';
	          } else if (chr === EOF || chr === '/' || chr === '?' || chr === '#' || chr === '\\' && url.isSpecial()) {
	            if (seenAt && buffer === '') return INVALID_AUTHORITY;
	            pointer -= arrayFrom(buffer).length + 1;
	            buffer = '';
	            state = HOST;
	          } else buffer += chr;
	          break;
	        case HOST:
	        case HOSTNAME:
	          if (stateOverride && url.scheme === 'file') {
	            state = FILE_HOST;
	            continue;
	          } else if (chr === ':' && !seenBracket) {
	            if (buffer === '') return INVALID_HOST;
	            failure = url.parseHost(buffer);
	            if (failure) return failure;
	            buffer = '';
	            state = PORT;
	            if (stateOverride === HOSTNAME) return;
	          } else if (chr === EOF || chr === '/' || chr === '?' || chr === '#' || chr === '\\' && url.isSpecial()) {
	            if (url.isSpecial() && buffer === '') return INVALID_HOST;
	            if (stateOverride && buffer === '' && (url.includesCredentials() || url.port !== null)) return;
	            failure = url.parseHost(buffer);
	            if (failure) return failure;
	            buffer = '';
	            state = PATH_START;
	            if (stateOverride) return;
	            continue;
	          } else {
	            if (chr === '[') seenBracket = true;else if (chr === ']') seenBracket = false;
	            buffer += chr;
	          }
	          break;
	        case PORT:
	          if (exec(DIGIT, chr)) {
	            buffer += chr;
	          } else if (chr === EOF || chr === '/' || chr === '?' || chr === '#' || chr === '\\' && url.isSpecial() || stateOverride) {
	            if (buffer !== '') {
	              var port = parseInt$1(buffer, 10);
	              if (port > 0xFFFF) return INVALID_PORT;
	              url.port = url.isSpecial() && port === specialSchemes[url.scheme] ? null : port;
	              buffer = '';
	            }
	            if (stateOverride) return;
	            state = PATH_START;
	            continue;
	          } else return INVALID_PORT;
	          break;
	        case FILE:
	          url.scheme = 'file';
	          if (chr === '/' || chr === '\\') state = FILE_SLASH;else if (base && base.scheme === 'file') {
	            switch (chr) {
	              case EOF:
	                url.host = base.host;
	                url.path = arraySlice(base.path);
	                url.query = base.query;
	                break;
	              case '?':
	                url.host = base.host;
	                url.path = arraySlice(base.path);
	                url.query = '';
	                state = QUERY;
	                break;
	              case '#':
	                url.host = base.host;
	                url.path = arraySlice(base.path);
	                url.query = base.query;
	                url.fragment = '';
	                state = FRAGMENT;
	                break;
	              default:
	                if (!startsWithWindowsDriveLetter(join(arraySlice(codePoints, pointer), ''))) {
	                  url.host = base.host;
	                  url.path = arraySlice(base.path);
	                  url.shortenPath();
	                }
	                state = PATH;
	                continue;
	            }
	          } else {
	            state = PATH;
	            continue;
	          }
	          break;
	        case FILE_SLASH:
	          if (chr === '/' || chr === '\\') {
	            state = FILE_HOST;
	            break;
	          }
	          if (base && base.scheme === 'file' && !startsWithWindowsDriveLetter(join(arraySlice(codePoints, pointer), ''))) {
	            if (isWindowsDriveLetter(base.path[0], true)) push(url.path, base.path[0]);else url.host = base.host;
	          }
	          state = PATH;
	          continue;
	        case FILE_HOST:
	          if (chr === EOF || chr === '/' || chr === '\\' || chr === '?' || chr === '#') {
	            if (!stateOverride && isWindowsDriveLetter(buffer)) {
	              state = PATH;
	            } else if (buffer === '') {
	              url.host = '';
	              if (stateOverride) return;
	              state = PATH_START;
	            } else {
	              failure = url.parseHost(buffer);
	              if (failure) return failure;
	              if (url.host === 'localhost') url.host = '';
	              if (stateOverride) return;
	              buffer = '';
	              state = PATH_START;
	            }
	            continue;
	          } else buffer += chr;
	          break;
	        case PATH_START:
	          if (url.isSpecial()) {
	            state = PATH;
	            if (chr !== '/' && chr !== '\\') continue;
	          } else if (!stateOverride && chr === '?') {
	            url.query = '';
	            state = QUERY;
	          } else if (!stateOverride && chr === '#') {
	            url.fragment = '';
	            state = FRAGMENT;
	          } else if (chr !== EOF) {
	            state = PATH;
	            if (chr !== '/') continue;
	          }
	          break;
	        case PATH:
	          if (chr === EOF || chr === '/' || chr === '\\' && url.isSpecial() || !stateOverride && (chr === '?' || chr === '#')) {
	            if (isDoubleDot(buffer)) {
	              url.shortenPath();
	              if (chr !== '/' && !(chr === '\\' && url.isSpecial())) {
	                push(url.path, '');
	              }
	            } else if (isSingleDot(buffer)) {
	              if (chr !== '/' && !(chr === '\\' && url.isSpecial())) {
	                push(url.path, '');
	              }
	            } else {
	              if (url.scheme === 'file' && !url.path.length && isWindowsDriveLetter(buffer)) {
	                if (url.host) url.host = '';
	                buffer = charAt(buffer, 0) + ':'; // normalize windows drive letter
	              }
	              push(url.path, buffer);
	            }
	            buffer = '';
	            if (url.scheme === 'file' && (chr === EOF || chr === '?' || chr === '#')) {
	              while (url.path.length > 1 && url.path[0] === '') {
	                shift(url.path);
	              }
	            }
	            if (chr === '?') {
	              url.query = '';
	              state = QUERY;
	            } else if (chr === '#') {
	              url.fragment = '';
	              state = FRAGMENT;
	            }
	          } else {
	            buffer += percentEncode(chr, pathPercentEncodeSet);
	          }
	          break;
	        case CANNOT_BE_A_BASE_URL_PATH:
	          if (chr === '?') {
	            url.query = '';
	            state = QUERY;
	          } else if (chr === '#') {
	            url.fragment = '';
	            state = FRAGMENT;
	          } else if (chr !== EOF) {
	            url.path[0] += percentEncode(chr, C0ControlPercentEncodeSet);
	          }
	          break;
	        case QUERY:
	          if (!stateOverride && chr === '#') {
	            url.fragment = '';
	            state = FRAGMENT;
	          } else if (chr !== EOF) {
	            if (chr === "'" && url.isSpecial()) url.query += '%27';else if (chr === '#') url.query += '%23';else url.query += percentEncode(chr, C0ControlPercentEncodeSet);
	          }
	          break;
	        case FRAGMENT:
	          if (chr !== EOF) url.fragment += percentEncode(chr, fragmentPercentEncodeSet);
	          break;
	      }
	      pointer++;
	    }
	  },
	  // https://url.spec.whatwg.org/#host-parsing
	  parseHost: function parseHost(input) {
	    var result, codePoints, index;
	    if (charAt(input, 0) === '[') {
	      if (charAt(input, input.length - 1) !== ']') return INVALID_HOST;
	      result = parseIPv6(stringSlice(input, 1, -1));
	      if (!result) return INVALID_HOST;
	      this.host = result;
	      // opaque host
	    } else if (!this.isSpecial()) {
	      if (exec(FORBIDDEN_HOST_CODE_POINT_EXCLUDING_PERCENT, input)) return INVALID_HOST;
	      result = '';
	      codePoints = arrayFrom(input);
	      for (index = 0; index < codePoints.length; index++) {
	        result += percentEncode(codePoints[index], C0ControlPercentEncodeSet);
	      }
	      this.host = result;
	    } else {
	      input = stringPunycodeToAscii(input);
	      if (exec(FORBIDDEN_HOST_CODE_POINT, input)) return INVALID_HOST;
	      result = parseIPv4(input);
	      if (result === null) return INVALID_HOST;
	      this.host = result;
	    }
	  },
	  // https://url.spec.whatwg.org/#cannot-have-a-username-password-port
	  cannotHaveUsernamePasswordPort: function cannotHaveUsernamePasswordPort() {
	    return !this.host || this.cannotBeABaseURL || this.scheme === 'file';
	  },
	  // https://url.spec.whatwg.org/#include-credentials
	  includesCredentials: function includesCredentials() {
	    return this.username !== '' || this.password !== '';
	  },
	  // https://url.spec.whatwg.org/#is-special
	  isSpecial: function isSpecial() {
	    return hasOwnProperty_1(specialSchemes, this.scheme);
	  },
	  // https://url.spec.whatwg.org/#shorten-a-urls-path
	  shortenPath: function shortenPath() {
	    var path = this.path;
	    var pathSize = path.length;
	    if (pathSize && (this.scheme !== 'file' || pathSize !== 1 || !isWindowsDriveLetter(path[0], true))) {
	      path.length--;
	    }
	  },
	  // https://url.spec.whatwg.org/#concept-url-serializer
	  serialize: function serialize() {
	    var url = this;
	    var scheme = url.scheme;
	    var username = url.username;
	    var password = url.password;
	    var host = url.host;
	    var port = url.port;
	    var path = url.path;
	    var query = url.query;
	    var fragment = url.fragment;
	    var output = scheme + ':';
	    if (host !== null) {
	      output += '//';
	      if (url.includesCredentials()) {
	        output += username + (password ? ':' + password : '') + '@';
	      }
	      output += serializeHost(host);
	      if (port !== null) output += ':' + port;
	    } else if (scheme === 'file') output += '//';
	    output += url.cannotBeABaseURL ? path[0] : path.length ? '/' + join(path, '/') : '';
	    if (query !== null) output += '?' + query;
	    if (fragment !== null) output += '#' + fragment;
	    return output;
	  },
	  // https://url.spec.whatwg.org/#dom-url-href
	  setHref: function setHref(href) {
	    var failure = this.parse(href);
	    if (failure) throw new TypeError$1(failure);
	    this.searchParams.update();
	  },
	  // https://url.spec.whatwg.org/#dom-url-origin
	  getOrigin: function getOrigin() {
	    var scheme = this.scheme;
	    var port = this.port;
	    if (scheme === 'blob') try {
	      return new URLConstructor(scheme.path[0]).origin;
	    } catch (error) {
	      return 'null';
	    }
	    if (scheme === 'file' || !this.isSpecial()) return 'null';
	    return scheme + '://' + serializeHost(this.host) + (port !== null ? ':' + port : '');
	  },
	  // https://url.spec.whatwg.org/#dom-url-protocol
	  getProtocol: function getProtocol() {
	    return this.scheme + ':';
	  },
	  setProtocol: function setProtocol(protocol) {
	    this.parse(toString_1(protocol) + ':', SCHEME_START);
	  },
	  // https://url.spec.whatwg.org/#dom-url-username
	  getUsername: function getUsername() {
	    return this.username;
	  },
	  setUsername: function setUsername(username) {
	    var codePoints = arrayFrom(toString_1(username));
	    if (this.cannotHaveUsernamePasswordPort()) return;
	    this.username = '';
	    for (var i = 0; i < codePoints.length; i++) {
	      this.username += percentEncode(codePoints[i], userinfoPercentEncodeSet);
	    }
	  },
	  // https://url.spec.whatwg.org/#dom-url-password
	  getPassword: function getPassword() {
	    return this.password;
	  },
	  setPassword: function setPassword(password) {
	    var codePoints = arrayFrom(toString_1(password));
	    if (this.cannotHaveUsernamePasswordPort()) return;
	    this.password = '';
	    for (var i = 0; i < codePoints.length; i++) {
	      this.password += percentEncode(codePoints[i], userinfoPercentEncodeSet);
	    }
	  },
	  // https://url.spec.whatwg.org/#dom-url-host
	  getHost: function getHost() {
	    var host = this.host;
	    var port = this.port;
	    return host === null ? '' : port === null ? serializeHost(host) : serializeHost(host) + ':' + port;
	  },
	  setHost: function setHost(host) {
	    if (this.cannotBeABaseURL) return;
	    this.parse(host, HOST);
	  },
	  // https://url.spec.whatwg.org/#dom-url-hostname
	  getHostname: function getHostname() {
	    var host = this.host;
	    return host === null ? '' : serializeHost(host);
	  },
	  setHostname: function setHostname(hostname) {
	    if (this.cannotBeABaseURL) return;
	    this.parse(hostname, HOSTNAME);
	  },
	  // https://url.spec.whatwg.org/#dom-url-port
	  getPort: function getPort() {
	    var port = this.port;
	    return port === null ? '' : toString_1(port);
	  },
	  setPort: function setPort(port) {
	    if (this.cannotHaveUsernamePasswordPort()) return;
	    port = toString_1(port);
	    if (port === '') this.port = null;else this.parse(port, PORT);
	  },
	  // https://url.spec.whatwg.org/#dom-url-pathname
	  getPathname: function getPathname() {
	    var path = this.path;
	    return this.cannotBeABaseURL ? path[0] : path.length ? '/' + join(path, '/') : '';
	  },
	  setPathname: function setPathname(pathname) {
	    if (this.cannotBeABaseURL) return;
	    this.path = [];
	    this.parse(pathname, PATH_START);
	  },
	  // https://url.spec.whatwg.org/#dom-url-search
	  getSearch: function getSearch() {
	    var query = this.query;
	    return query ? '?' + query : '';
	  },
	  setSearch: function setSearch(search) {
	    search = toString_1(search);
	    if (search === '') {
	      this.query = null;
	    } else {
	      if (charAt(search, 0) === '?') search = stringSlice(search, 1);
	      this.query = '';
	      this.parse(search, QUERY);
	    }
	    this.searchParams.update();
	  },
	  // https://url.spec.whatwg.org/#dom-url-searchparams
	  getSearchParams: function getSearchParams() {
	    return this.searchParams.facade;
	  },
	  // https://url.spec.whatwg.org/#dom-url-hash
	  getHash: function getHash() {
	    var fragment = this.fragment;
	    return fragment ? '#' + fragment : '';
	  },
	  setHash: function setHash(hash) {
	    hash = toString_1(hash);
	    if (hash === '') {
	      this.fragment = null;
	      return;
	    }
	    if (charAt(hash, 0) === '#') hash = stringSlice(hash, 1);
	    this.fragment = '';
	    this.parse(hash, FRAGMENT);
	  },
	  update: function update() {
	    this.query = this.searchParams.serialize() || null;
	  }
	};

	// `URL` constructor
	// https://url.spec.whatwg.org/#url-class
	var URLConstructor = function URL(url /* , base */) {
	  var that = anInstance(this, URLPrototype);
	  var base = validateArgumentsLength(arguments.length, 1) > 1 ? arguments[1] : undefined;
	  var state = setInternalState(that, new URLState(url, false, base));
	  if (!descriptors) {
	    that.href = state.serialize();
	    that.origin = state.getOrigin();
	    that.protocol = state.getProtocol();
	    that.username = state.getUsername();
	    that.password = state.getPassword();
	    that.host = state.getHost();
	    that.hostname = state.getHostname();
	    that.port = state.getPort();
	    that.pathname = state.getPathname();
	    that.search = state.getSearch();
	    that.searchParams = state.getSearchParams();
	    that.hash = state.getHash();
	  }
	};
	var URLPrototype = URLConstructor.prototype;
	var accessorDescriptor = function accessorDescriptor(getter, setter) {
	  return {
	    get: function get() {
	      return getInternalURLState(this)[getter]();
	    },
	    set: setter && function (value) {
	      return getInternalURLState(this)[setter](value);
	    },
	    configurable: true,
	    enumerable: true
	  };
	};
	if (descriptors) {
	  // `URL.prototype.href` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-href
	  defineBuiltInAccessor(URLPrototype, 'href', accessorDescriptor('serialize', 'setHref'));
	  // `URL.prototype.origin` getter
	  // https://url.spec.whatwg.org/#dom-url-origin
	  defineBuiltInAccessor(URLPrototype, 'origin', accessorDescriptor('getOrigin'));
	  // `URL.prototype.protocol` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-protocol
	  defineBuiltInAccessor(URLPrototype, 'protocol', accessorDescriptor('getProtocol', 'setProtocol'));
	  // `URL.prototype.username` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-username
	  defineBuiltInAccessor(URLPrototype, 'username', accessorDescriptor('getUsername', 'setUsername'));
	  // `URL.prototype.password` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-password
	  defineBuiltInAccessor(URLPrototype, 'password', accessorDescriptor('getPassword', 'setPassword'));
	  // `URL.prototype.host` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-host
	  defineBuiltInAccessor(URLPrototype, 'host', accessorDescriptor('getHost', 'setHost'));
	  // `URL.prototype.hostname` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-hostname
	  defineBuiltInAccessor(URLPrototype, 'hostname', accessorDescriptor('getHostname', 'setHostname'));
	  // `URL.prototype.port` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-port
	  defineBuiltInAccessor(URLPrototype, 'port', accessorDescriptor('getPort', 'setPort'));
	  // `URL.prototype.pathname` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-pathname
	  defineBuiltInAccessor(URLPrototype, 'pathname', accessorDescriptor('getPathname', 'setPathname'));
	  // `URL.prototype.search` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-search
	  defineBuiltInAccessor(URLPrototype, 'search', accessorDescriptor('getSearch', 'setSearch'));
	  // `URL.prototype.searchParams` getter
	  // https://url.spec.whatwg.org/#dom-url-searchparams
	  defineBuiltInAccessor(URLPrototype, 'searchParams', accessorDescriptor('getSearchParams'));
	  // `URL.prototype.hash` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-hash
	  defineBuiltInAccessor(URLPrototype, 'hash', accessorDescriptor('getHash', 'setHash'));
	}

	// `URL.prototype.toJSON` method
	// https://url.spec.whatwg.org/#dom-url-tojson
	defineBuiltIn(URLPrototype, 'toJSON', function toJSON() {
	  return getInternalURLState(this).serialize();
	}, {
	  enumerable: true
	});

	// `URL.prototype.toString` method
	// https://url.spec.whatwg.org/#URL-stringification-behavior
	defineBuiltIn(URLPrototype, 'toString', function toString() {
	  return getInternalURLState(this).serialize();
	}, {
	  enumerable: true
	});
	if (NativeURL) {
	  var nativeCreateObjectURL = NativeURL.createObjectURL;
	  var nativeRevokeObjectURL = NativeURL.revokeObjectURL;
	  // `URL.createObjectURL` method
	  // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
	  if (nativeCreateObjectURL) defineBuiltIn(URLConstructor, 'createObjectURL', functionBindContext(nativeCreateObjectURL, NativeURL));
	  // `URL.revokeObjectURL` method
	  // https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
	  if (nativeRevokeObjectURL) defineBuiltIn(URLConstructor, 'revokeObjectURL', functionBindContext(nativeRevokeObjectURL, NativeURL));
	}
	setToStringTag(URLConstructor, 'URL');
	_export({
	  global: true,
	  constructor: true,
	  forced: !urlConstructorDetection,
	  sham: !descriptors
	}, {
	  URL: URLConstructor
	});

	var URL$1 = getBuiltIn('URL');

	// https://github.com/nodejs/node/issues/47505
	// https://github.com/denoland/deno/issues/18893
	var THROWS_WITHOUT_ARGUMENTS = urlConstructorDetection && fails(function () {
	  URL$1.canParse();
	});

	// `URL.canParse` method
	// https://url.spec.whatwg.org/#dom-url-canparse
	_export({
	  target: 'URL',
	  stat: true,
	  forced: !THROWS_WITHOUT_ARGUMENTS
	}, {
	  canParse: function canParse(url) {
	    var length = validateArgumentsLength(arguments.length, 1);
	    var urlString = toString_1(url);
	    var base = length < 2 || arguments[1] === undefined ? undefined : toString_1(arguments[1]);
	    try {
	      return !!new URL$1(urlString, base);
	    } catch (error) {
	      return false;
	    }
	  }
	});

	// `URL.prototype.toJSON` method
	// https://url.spec.whatwg.org/#dom-url-tojson
	_export({
	  target: 'URL',
	  proto: true,
	  enumerable: true
	}, {
	  toJSON: function toJSON() {
	    return functionCall(URL.prototype.toString, this);
	  }
	});

	path.URL;

	var _typeof_1 = createCommonjsModule(function (module) {
	  function _typeof(o) {
	    "@babel/helpers - typeof";

	    return (module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
	      return typeof o;
	    } : function (o) {
	      return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	    }, module.exports.__esModule = true, module.exports["default"] = module.exports), _typeof(o);
	  }
	  module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	var _typeof = unwrapExports(_typeof_1);

	var toPrimitive_1 = createCommonjsModule(function (module) {
	  var _typeof = _typeof_1["default"];
	  function toPrimitive(t, r) {
	    if ("object" != _typeof(t) || !t) return t;
	    var e = t[Symbol.toPrimitive];
	    if (void 0 !== e) {
	      var i = e.call(t, r || "default");
	      if ("object" != _typeof(i)) return i;
	      throw new TypeError("@@toPrimitive must return a primitive value.");
	    }
	    return ("string" === r ? String : Number)(t);
	  }
	  module.exports = toPrimitive, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	unwrapExports(toPrimitive_1);

	var toPropertyKey_1 = createCommonjsModule(function (module) {
	  var _typeof = _typeof_1["default"];
	  function toPropertyKey(t) {
	    var i = toPrimitive_1(t, "string");
	    return "symbol" == _typeof(i) ? i : String(i);
	  }
	  module.exports = toPropertyKey, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	unwrapExports(toPropertyKey_1);

	var defineProperty = createCommonjsModule(function (module) {
	  function _defineProperty(obj, key, value) {
	    key = toPropertyKey_1(key);
	    if (key in obj) {
	      Object.defineProperty(obj, key, {
	        value: value,
	        enumerable: true,
	        configurable: true,
	        writable: true
	      });
	    } else {
	      obj[key] = value;
	    }
	    return obj;
	  }
	  module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	var _defineProperty = unwrapExports(defineProperty);

	var classCallCheck = createCommonjsModule(function (module) {
	  function _classCallCheck(instance, Constructor) {
	    if (!(instance instanceof Constructor)) {
	      throw new TypeError("Cannot call a class as a function");
	    }
	  }
	  module.exports = _classCallCheck, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	var _classCallCheck = unwrapExports(classCallCheck);

	var createClass = createCommonjsModule(function (module) {
	  function _defineProperties(target, props) {
	    for (var i = 0; i < props.length; i++) {
	      var descriptor = props[i];
	      descriptor.enumerable = descriptor.enumerable || false;
	      descriptor.configurable = true;
	      if ("value" in descriptor) descriptor.writable = true;
	      Object.defineProperty(target, toPropertyKey_1(descriptor.key), descriptor);
	    }
	  }
	  function _createClass(Constructor, protoProps, staticProps) {
	    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
	    if (staticProps) _defineProperties(Constructor, staticProps);
	    Object.defineProperty(Constructor, "prototype", {
	      writable: false
	    });
	    return Constructor;
	  }
	  module.exports = _createClass, module.exports.__esModule = true, module.exports["default"] = module.exports;
	});
	var _createClass = unwrapExports(createClass);

	var version = "1.2.22";

	var IS_FETCH_API_SUPPORTED = ('fetch' in window);
	var IS_REQUEST_API_SUPPORTED = ('Request' in window);
	var IS_HEADERS_API_SUPPORTED = ('Headers' in window);
	var DOWNGRADE_FLAG = 'DOWNGRADE';
	var DEFAULT_HOST_PROTECTION_CONFIG = {
	  POST: '*',
	  PUT: '*',
	  PATCH: '*',
	  DELETE: '*'
	};
	var DEFAULT_NORMAL_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;
	var DEFAULT_DOWNGRADE_TOKEN_MAX_AGE = 1000;
	var TOKEN_PATH_KEY = 'TOKEN_PATH';
	var CSRFDefenser = /*#__PURE__*/function () {
	  function CSRFDefenser() {
	    _classCallCheck(this, CSRFDefenser);
	    this.tokenHeaderName = 'x-secsdk-csrf-token';
	    this.tokenFetchTimeout = 10000;
	    this.secsdkVersionHeaderName = 'x-secsdk-csrf-version';
	    this.secsdkSessionName = 'x-secsdk-csrf-session';
	    this.defaultSessionVal = '1';
	    this.nativeXMLHttpRequest = window.XMLHttpRequest.prototype.constructor;
	    this.nativeXMLHttpRequestOpen = window.XMLHttpRequest.prototype.open;
	    this.nativeXMLHttpRequestSend = window.XMLHttpRequest.prototype.send;
	    this.nativeXMLHttpRequestSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
	    this.nativeFetch = window.fetch;
	    this.tokenMap = {};
	    this.protectionConfig = {};
	    this.whiteListConfig = {};
	    this.secsdkVersion = version;
	    this.downgradeMaxAge = DEFAULT_DOWNGRADE_TOKEN_MAX_AGE;
	    this.downgradeLimit = -1;
	    this.downgradeLimitMap = {};
	    this.monkeyPatchXMLHttpRequest();
	    this.monkeyPatchFetch();
	  }
	  _createClass(CSRFDefenser, [{
	    key: "setProtectedHost",
	    value: function setProtectedHost() {
	      var _this = this;
	      var host = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.location.host;
	      this.protectionConfig = {};
	      if (typeof host === 'string') {
	        this.protectionConfig[host] = Object.assign({}, DEFAULT_HOST_PROTECTION_CONFIG);
	      } else if (Array.isArray(host)) {
	        host.forEach(function (h) {
	          _this.protectionConfig[h] = Object.assign({}, DEFAULT_HOST_PROTECTION_CONFIG);
	        });
	      } else if (Object.prototype.toString.call(host) === '[object Object]') {
	        Object.keys(host).forEach(function (h) {
	          _this.protectionConfig[h] = Object.assign({}, DEFAULT_HOST_PROTECTION_CONFIG);
	          var hostProtectionConfig = host[h];
	          if (Object.prototype.toString.call(hostProtectionConfig) === '[object Object]') {
	            Object.keys(hostProtectionConfig).forEach(function (m) {
	              _this.protectionConfig[h][m.toUpperCase()] = hostProtectionConfig[m];
	            });
	          }
	        });
	      }
	    }
	  }, {
	    key: "setAllowedHost",
	    value: function setAllowedHost(host) {
	      var _this2 = this;
	      Object.keys(host).forEach(function (h) {
	        _this2.whiteListConfig[h] = {};
	        var hostProtectionConfig = host[h];
	        Object.keys(hostProtectionConfig).forEach(function (m) {
	          _this2.whiteListConfig[h][m.toUpperCase()] = hostProtectionConfig[m];
	        });
	      });
	    }
	  }, {
	    key: "setOptions",
	    value: function setOptions() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	      if (_typeof(options) !== 'object') {
	        return;
	      }
	      var isGlueOptions = Object.keys(options).includes('protect');
	      if (isGlueOptions) {
	        var _options$protect = options.protect,
	          protect = _options$protect === void 0 ? {} : _options$protect,
	          _options$allow = options.allow,
	          allow = _options$allow === void 0 ? {} : _options$allow,
	          _options$downgradeLim = options.downgradeLimit,
	          downgradeLimit = _options$downgradeLim === void 0 ? -1 : _options$downgradeLim,
	          _options$downgradeMax = options.downgradeMaxAge,
	          downgradeMaxAge = _options$downgradeMax === void 0 ? 1000 : _options$downgradeMax,
	          _options$tokenFetchTi = options.tokenFetchTimeout,
	          tokenFetchTimeout = _options$tokenFetchTi === void 0 ? 10000 : _options$tokenFetchTi;
	        this.setProtectedHost(protect);
	        this.setAllowedHost(allow);
	        this.setDowngradeLimit(downgradeLimit);
	        this.setDowngradeMaxAge(downgradeMaxAge);
	        this.setTokenFetchTimeout(tokenFetchTimeout);
	        return;
	      }
	      this.setProtectedHost(options);
	    }
	  }, {
	    key: "setDowngradeMaxAge",
	    value: function setDowngradeMaxAge() {
	      var downgradeMaxAge = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1000;
	      this.downgradeMaxAge = downgradeMaxAge;
	    }
	  }, {
	    key: "setDowngradeLimit",
	    value: function setDowngradeLimit() {
	      var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;
	      this.downgradeLimit = limit;
	    }
	  }, {
	    key: "setTokenFetchTimeout",
	    value: function setTokenFetchTimeout() {
	      var tokenFetchTimeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10000;
	      this.tokenFetchTimeout = tokenFetchTimeout;
	    }
	    // eslint-disable-next-line max-len
	  }, {
	    key: "fetchToken",
	    value: function fetchToken() {
	      var _this3 = this;
	      var host = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.location.host;
	      var pathname = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window.location.pathname;
	      if (Array.isArray(host)) {
	        return Promise.all(host.map(function (h) {
	          return _this3.fetchToken(h);
	        }));
	      }
	      if (!this.tokenMap[host]) {
	        this.tokenMap[host] = this.fetchTokenFromServer(host, this.getTokenPath(host, pathname)).then(function (token) {
	          // replace token fetching promise with token
	          _this3.tokenMap[host] = token;
	          return token;
	        });
	      }
	      return Promise.resolve(this.tokenMap[host]).then(function (token) {
	        if (token.expiredAt < Date.now()) {
	          // 1. fix fetch token timeout recursion
	          // 2. check custom timeout downgrade limit
	          if (_this3.downgradeLimit === -1 && !token.timeout || !_this3.checkDowngradeLimit(host)) {
	            delete _this3.tokenMap[host];
	            _this3.removeCrossSiteSessionFromStorage(host);
	            return _this3.fetchToken(host, pathname);
	          }
	        }
	        // cache
	        return token;
	      });
	    }
	  }, {
	    key: "fetchTokenFromLocal",
	    value: function fetchTokenFromLocal(host) {
	      var token = this.tokenMap[host];
	      if (token && !(token instanceof Promise)) {
	        return token.value;
	      }
	      return DOWNGRADE_FLAG;
	    }
	  }, {
	    key: "incrementDowngradeLimitCount",
	    value: function incrementDowngradeLimitCount(host) {
	      if (this.downgradeLimit === -1) {
	        return;
	      }
	      var limit = this.downgradeLimitMap[host] || 0;
	      this.downgradeLimitMap[host] = limit + 1;
	    }
	  }, {
	    key: "checkDowngradeLimit",
	    value: function checkDowngradeLimit(host) {
	      if (this.downgradeLimit === -1) {
	        return false;
	      }
	      var limit = this.downgradeLimitMap[host] || 0;
	      return limit >= this.downgradeLimit;
	    }
	  }, {
	    key: "isCrossSite",
	    value: function isCrossSite(sourceUrl) {
	      var _a, _b;
	      var _URL = new URL(window.location.href),
	        p1 = _URL.protocol,
	        h1 = _URL.host;
	      var _URL2 = new URL(sourceUrl, window.location.href),
	        p2 = _URL2.protocol,
	        h2 = _URL2.host;
	      if (!(p1 === p2 && h1 === h2)) {
	        // iframe 本身跨站
	        return true;
	      }
	      // iframe本身同站，则判断top是否跨站
	      try {
	        var _url = (_b = (_a = window.top) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.href; // 访问该对象属性，可能存在跨域报错
	        if (!_url) {
	          return true;
	        }
	        var _URL3 = new URL(_url),
	          p0 = _URL3.protocol,
	          h0 = _URL3.host;
	        return !(p0 === p2 && h0 === h2);
	      } catch (e) {
	        return true;
	      }
	    }
	  }, {
	    key: "getCrossSiteSessionMapFromStorage",
	    value: function getCrossSiteSessionMapFromStorage() {
	      return JSON.parse(window.localStorage.getItem(this.secsdkSessionName) || '{}');
	    }
	  }, {
	    key: "removeCrossSiteSessionFromStorage",
	    value: function removeCrossSiteSessionFromStorage(host) {
	      var sessionMap = this.getCrossSiteSessionMapFromStorage();
	      delete sessionMap[host];
	      window.localStorage.setItem(this.secsdkSessionName, JSON.stringify(sessionMap));
	    }
	  }, {
	    key: "fetchTokenFromServer",
	    value: function fetchTokenFromServer(host, pathname) {
	      var _this4 = this;
	      var defenser = this;
	      return new Promise(function (resolve) {
	        var XMLHttpRequest = _this4.nativeXMLHttpRequest;
	        var xhr = new XMLHttpRequest();
	        var downgradeToken = {
	          value: DOWNGRADE_FLAG,
	          expiredAt: Date.now() + _this4.downgradeMaxAge,
	          timeout: false
	        };
	        var protocol = ['http:', 'https:'].includes(window.location.protocol) ? window.location.protocol : 'https:';
	        if (_this4.checkDowngradeLimit(host)) {
	          console.error(new Error("Failed to fetch csrf token: host=".concat(host, " downgradeLimit: ").concat(_this4.downgradeLimit)));
	          resolve(downgradeToken);
	          return;
	        }
	        xhr.addEventListener('load', function () {
	          if (xhr.status !== 200) {
	            console.error(new Error("Failed to fetch csrf token: host=".concat(host, " status=").concat(xhr.status, " statusText=").concat(xhr.statusText)));
	            resolve(downgradeToken);
	            _this4.incrementDowngradeLimitCount(host);
	            return;
	          }
	          var tokenInfo = [];
	          var csrfHeaderValue = xhr.getResponseHeader('x-ware-csrf-token');
	          if (csrfHeaderValue) {
	            // [statusCode,token,maxAge,message,sessionId] = tokenInfo;
	            tokenInfo = csrfHeaderValue.split(',');
	          } else {
	            console.warn("Failed to get csrf token: host=".concat(host, " xWareCsrfToken=").concat(csrfHeaderValue));
	            resolve(downgradeToken);
	            _this4.incrementDowngradeLimitCount(host);
	            return;
	          }
	          if (!(tokenInfo[0] === '0')) {
	            console.warn("Failed to fetch csrf token: host=".concat(host, " status_code=").concat(tokenInfo[0], " message=").concat(tokenInfo[3]));
	            resolve(downgradeToken);
	            _this4.incrementDowngradeLimitCount(host);
	            return;
	          }
	          if (!tokenInfo[1]) {
	            console.warn("Failed to fetch csrf token, empty token: host=".concat(host, " data=").concat(tokenInfo));
	            resolve(downgradeToken);
	            _this4.incrementDowngradeLimitCount(host);
	            return;
	          }
	          if (defenser.isCrossSite("".concat(protocol, "//").concat(host).concat(pathname))) {
	            // 跨站Cookie写入localStorage，区分domain
	            var sessionMap = defenser.getCrossSiteSessionMapFromStorage();
	            window.localStorage.setItem(defenser.secsdkSessionName, JSON.stringify(Object.assign(Object.assign({}, sessionMap), _defineProperty({}, host, tokenInfo[4]))));
	          }
	          var maxAge = parseInt(tokenInfo[2], 10) || DEFAULT_NORMAL_TOKEN_MAX_AGE;
	          resolve({
	            value: tokenInfo[1],
	            expiredAt: Date.now() + maxAge,
	            timeout: false
	          });
	        });
	        xhr.addEventListener('error', function () {
	          console.error(new Error("Failed to fetch csrf token: host=".concat(host, " error=network request failed")));
	          resolve(downgradeToken);
	          _this4.incrementDowngradeLimitCount(host);
	        });
	        xhr.addEventListener('abort', function () {
	          console.error(new Error("Failed to fetch csrf token: host=".concat(host, " error=network request aborted")));
	          resolve(downgradeToken);
	          _this4.incrementDowngradeLimitCount(host);
	        });
	        xhr.addEventListener('timeout', function () {
	          console.error(new Error("Failed to fetch csrf token: host=".concat(host, " error=timeout")));
	          downgradeToken.timeout = true;
	          resolve(downgradeToken);
	          _this4.incrementDowngradeLimitCount(host);
	        });
	        _this4.nativeXMLHttpRequestOpen.call(xhr, 'HEAD', "".concat(protocol, "//").concat(host).concat(pathname));
	        var sessionId = defenser.defaultSessionVal;
	        _this4.nativeXMLHttpRequestSetRequestHeader.call(xhr, 'x-secsdk-csrf-request', sessionId);
	        _this4.nativeXMLHttpRequestSetRequestHeader.call(xhr, _this4.secsdkVersionHeaderName, _this4.secsdkVersion);
	        xhr.withCredentials = true;
	        xhr.timeout = _this4.tokenFetchTimeout;
	        _this4.nativeXMLHttpRequestSend.call(xhr);
	      });
	    }
	  }, {
	    key: "matchConfig",
	    value: function matchConfig(config, host, method, pathname) {
	      method = method.toUpperCase();
	      var pc = config;
	      if (!pc[host]) {
	        return false;
	      }
	      if (!pc[host][method]) {
	        return false;
	      }
	      var mpc = pc[host][method];
	      if (mpc instanceof RegExp) {
	        return mpc.test(pathname);
	      } else if (Array.isArray(mpc)) {
	        return mpc.some(function (item) {
	          if (item instanceof RegExp) {
	            return item.test(pathname);
	          }
	          return item === pathname;
	        });
	      }
	      return mpc === '*' || mpc === pathname;
	    }
	  }, {
	    key: "shouldAllowRequest",
	    value: function shouldAllowRequest(host, method, pathname) {
	      return this.matchConfig(this.whiteListConfig, host, method, pathname);
	    }
	  }, {
	    key: "shouldProtectRequest",
	    value: function shouldProtectRequest(host, method, pathname) {
	      return this.matchConfig(this.protectionConfig, host, method, pathname);
	    }
	  }, {
	    key: "getTokenPath",
	    value: function getTokenPath(host, pathname) {
	      var pc = this.protectionConfig;
	      if (!pc[host]) {
	        return pathname;
	      }
	      if (pc[host][TOKEN_PATH_KEY]) {
	        return pc[host][TOKEN_PATH_KEY];
	      }
	      return pathname;
	    }
	  }, {
	    key: "monkeyPatchXMLHttpRequest",
	    value: function monkeyPatchXMLHttpRequest() {
	      var defenser = this;
	      XMLHttpRequest.prototype.open = function () {
	        // Save open arguments, we use it in `send` method.
	        this.openArgs = arguments;
	        defenser.nativeXMLHttpRequestOpen.apply(this, arguments);
	      };
	      XMLHttpRequest.prototype.send = function () {
	        var _this5 = this;
	        var openArgs = this.openArgs;
	        var sendArgs = arguments;
	        var method = openArgs[0] || 'GET';
	        var u = new URL(openArgs[1], window.location.href);
	        // Send request immediately if current request in the whitelist
	        if (defenser.shouldAllowRequest(u.hostname, method, u.pathname)) {
	          return defenser.nativeXMLHttpRequestSend.apply(this, sendArgs);
	        }
	        // Send request immediately if current request is safe.
	        if (!defenser.shouldProtectRequest(u.host, method, u.pathname)) {
	          return defenser.nativeXMLHttpRequestSend.apply(this, sendArgs);
	        }
	        // Set csrf token synchronously and send request immediately if current request is not async.
	        if (openArgs.length >= 3 && !openArgs[2]) {
	          var token = defenser.fetchTokenFromLocal(u.host);
	          if (defenser.isCrossSite("".concat(u.protocol, "//").concat(u.host).concat(u.pathname))) {
	            var sessionId = defenser.getCrossSiteSessionMapFromStorage()[u.host];
	            //跨站请求，sessionId以 req header传送
	            sessionId && (token = "".concat(token, ",").concat(sessionId));
	          }
	          defenser.nativeXMLHttpRequestSetRequestHeader.call(this, defenser.tokenHeaderName, token);
	          return defenser.nativeXMLHttpRequestSend.apply(this, sendArgs);
	        }
	        // Set csrf token and send request asynchronously
	        defenser.fetchToken(u.host, u.pathname).then(function (token) {
	          var tokenVal = token.value;
	          if (defenser.isCrossSite("".concat(u.protocol, "//").concat(u.host).concat(u.pathname))) {
	            var _sessionId = defenser.getCrossSiteSessionMapFromStorage()[u.host];
	            //跨站请求，sessionId以 req header传送
	            _sessionId && (tokenVal = "".concat(tokenVal, ",").concat(_sessionId));
	          }
	          defenser.nativeXMLHttpRequestSetRequestHeader.call(_this5, defenser.tokenHeaderName, tokenVal);
	          defenser.nativeXMLHttpRequestSend.apply(_this5, sendArgs);
	        });
	      };
	    }
	  }, {
	    key: "monkeyPatchFetch",
	    value: function monkeyPatchFetch() {
	      if (!IS_FETCH_API_SUPPORTED) {
	        return;
	      }
	      var defenser = this;
	      window.fetch = function (input, init) {
	        var _this6 = this;
	        var url, method;
	        if (IS_REQUEST_API_SUPPORTED && input instanceof Request) {
	          url = input.url;
	          method = input.method;
	        } else {
	          url = input;
	          method = init && init.method ? init.method : 'GET';
	        }
	        var u = new URL(url, window.location.href);
	        // Send request immediately if current request in the whitelist
	        if (defenser.shouldAllowRequest(u.hostname, method, u.pathname)) {
	          return defenser.nativeFetch.apply(this, [input, init]);
	        }
	        // Send request immediately if current request is safe.
	        if (!defenser.shouldProtectRequest(u.host, method, u.pathname)) {
	          return defenser.nativeFetch.apply(this, [input, init]);
	        }
	        // Set csrf token header before sending request.
	        return defenser.fetchToken(u.host, u.pathname).then(function (token) {
	          var tokenVal = token.value;
	          var sessionId = defenser.getCrossSiteSessionMapFromStorage()[u.host];
	          if (defenser.isCrossSite("".concat(u.protocol, "//").concat(u.host).concat(u.pathname))) {
	            //跨站请求，sessionId以 req header传送
	            sessionId && (tokenVal = "".concat(tokenVal, ",").concat(sessionId));
	          }
	          if (IS_REQUEST_API_SUPPORTED && input instanceof Request) {
	            input.headers.set(defenser.tokenHeaderName, tokenVal);
	          } else {
	            init = init || {};
	            init.headers = init.headers || {};
	            if (IS_HEADERS_API_SUPPORTED && init.headers instanceof Headers) {
	              init.headers.set(defenser.tokenHeaderName, tokenVal);
	            } else if (Array.isArray(init.headers)) {
	              var flag = false;
	              init.headers.forEach(function (item) {
	                if (item[0] === defenser.tokenHeaderName) {
	                  item[1] = tokenVal;
	                  flag = true;
	                }
	              });
	              if (!flag) {
	                init.headers.push([defenser.tokenHeaderName, tokenVal]);
	              }
	            } else {
	              init.headers[defenser.tokenHeaderName] = tokenVal;
	            }
	          }
	          return defenser.nativeFetch.apply(_this6, [input, init]);
	        });
	      };
	    }
	  }]);
	  return CSRFDefenser;
	}();
	var csrf = new CSRFDefenser();

	exports.csrf = csrf;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.js.map
