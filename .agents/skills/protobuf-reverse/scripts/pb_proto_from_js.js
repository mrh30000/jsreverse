#!/usr/bin/env node
/**
 * pb_proto_from_js.js — 从「生成出来的 JS」反推 .proto 的离线抽取器。
 *
 * 为什么需要它：`.proto` 一般不会随页面下发，但**生成代码本身把 schema 完整暴露了**——
 * 字段号、基础类型、repeated、嵌套 message 全都在里面。手工一个个抄在
 * 100+ 字段的表（真实案例：某方数据单个 Resource 就有 80+ 字段）上必然出错，
 * 所以用脚本机械抽取。
 *
 * 支持两种最常见的方言（判据见 references/dialect-matrix.md）：
 *
 *   1) `jspb`（google-protobuf / protoc --js_out 生成）
 *      锚点：`proto.a.b.C.deserializeBinaryFromReader = function(msg, reader) { ... }`
 *      字段：`switch (reader.getFieldNumber()) { case 1: ... reader.readString() ... msg.setName(v) }`
 *      名字：`setXxx` → 单值，`addXxx` → repeated
 *      类型：`readString/readInt32/...`；嵌套看 `new s.Resource(...)` + `readMessage(...)`
 *
 *   2) `pbfull`（protobufjs reflection 版，带 encode/decode 函数）
 *      锚点：`X.decode = function (reader, length) { ... switch (tag >>> 3) { case 1: ... } }`
 *      字段名：`msg.fieldName = reader.int32()` —— **这里能拿到真实字段名**，保真度更高
 *      类型：`reader.xxx()`；repeated 看 `.push(`；嵌套看 `new pkg.Type()` / `pkg.Type.decode(`
 *
 * **不依赖任何 npm 包**，纯文本扫描 + 括号配平。生成代码高度规律，正则比 AST 更抗改名。
 * 被压缩/改名到 `reader.nextField()` 都不见了的场景，才需要转到
 * `ast-deobfuscation` 的 pass 框架做 AST 级抽取。
 *
 * 用法：
 *   node pb_proto_from_js.js --input bundle.js --out schema.proto
 *   node pb_proto_from_js.js --input bundle.js --mode jspb --pretty
 *   node pb_proto_from_js.js --input bundle.js --mode pbfull --field-case keep
 *   node pb_proto_from_js.js --selftest
 *
 * 退出码：0 成功（哪怕 0 个 message，也会在 stderr 提示）；1 断言失败/输入不可读；2 参数错误。
 * `--strict` 时"抽到 0 个 message"也算失败（退出 1），避免把空产物当成成功。
 */

'use strict';

const fs = require('fs');

// ------------------------------------------------------------ 类型映射表

// reader 方法名 → proto 基础类型。来源：52pojie-1737925（某音直播）给出的映射表。
// 注意：52pojie-1692444 是 protobufjs(full) 示例，**不含任何 read* 方法**，不是本表的第二来源；
//       它只提供方言 B 的 fixture（见 --selftest 的 fixture B）。
const READ_TYPE_MAP = {
  readString: 'string',
  readBytes: 'bytes',
  readBool: 'bool',
  readDouble: 'double',
  readFloat: 'float',
  readInt32: 'int32',
  readInt64: 'int64',
  readUint32: 'uint32',
  readUint64: 'uint64',
  readSint32: 'sint32',
  readSint64: 'sint64',
  readFixed32: 'fixed32',
  readFixed64: 'fixed64',
  readSfixed32: 'sfixed32',
  readSfixed64: 'sfixed64',
  readEnum: 'enum',
  // jspb 的 64 位"字符串承载"变体：语义是 int64/uint64，只是 JS 侧用 string 装
  readInt64String: 'int64',
  readUint64String: 'uint64',
  // packed 变体：类型不变，但**隐含 repeated**
  readPackedInt32: 'int32',
  readPackedInt64: 'int64',
  readPackedUint32: 'uint32',
  readPackedUint64: 'uint64',
  readPackedSint32: 'sint32',
  readPackedSint64: 'sint64',
  readPackedFixed32: 'fixed32',
  readPackedFixed64: 'fixed64',
  readPackedSfixed32: 'sfixed32',
  readPackedSfixed64: 'sfixed64',
  readPackedFloat: 'float',
  readPackedDouble: 'double',
  readPackedBool: 'bool',
  readPackedEnum: 'enum',
};

// protobufjs reader 方法名 → proto 基础类型（方法名已经不带 read 前缀）
const PBF_TYPE_MAP = {
  string: 'string',
  bytes: 'bytes',
  bool: 'bool',
  double: 'double',
  float: 'float',
  int32: 'int32',
  int64: 'int64',
  uint32: 'uint32',
  uint64: 'uint64',
  sint32: 'sint32',
  sint64: 'sint64',
  fixed32: 'fixed32',
  fixed64: 'fixed64',
  sfixed32: 'sfixed32',
  sfixed64: 'sfixed64',
  enum: 'enum',
};

function mapReadType(fn) {
  if (!fn) return 'unknown';
  if (Object.prototype.hasOwnProperty.call(READ_TYPE_MAP, fn)) return READ_TYPE_MAP[fn];
  if (Object.prototype.hasOwnProperty.call(PBF_TYPE_MAP, fn)) return PBF_TYPE_MAP[fn];
  if (fn.startsWith('read')) {
    // 未知但形如 readXxx：按首字母大写还原成 proto 名，标成 unknown-<Name> 让人一眼看出没覆盖
    return 'unknown_' + fn.slice(4);
  }
  return 'unknown_' + fn;
}

function isPacked(fn) {
  return typeof fn === 'string' && fn.startsWith('readPacked');
}

// ------------------------------------------------------------ 括号配平

/** 从 `open` 指向的 '{' 开始，返回匹配 '}' 的下标；不匹配返回 -1。会跳过字符串/注释/模板串。 */
function matchBrace(src, open) {
  if (src[open] !== '{') return -1;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 找到 `from` 之后第一个 '{' 与配对 '}'，返回 [bodyStart, bodyEnd]。 */
function bodyAfter(src, from) {
  const open = src.indexOf('{', from);
  if (open < 0) return null;
  const close = matchBrace(src, open);
  if (close < 0) return null;
  return [open + 1, close];
}

// ------------------------------------------------------------ jspb 抽取

/** 把 switch 体切成 {no, seg} 列表。`default:` 也是边界——否则最后一个 case 会吞掉 default 分支，
 *  把 `skipField()/skipType()` 当成字段内容（真实踩过的坑：case 4 因吞了 default 被整段跳过）。 */
function splitSwitchCases(text) {
  const boundary = /\b(?:case\s+(\d+)|default)\s*:/g;
  const marks = [];
  let m;
  while ((m = boundary.exec(text)) !== null) {
    marks.push({ no: m[1] === undefined ? null : Number(m[1]), start: m.index + m[0].length });
  }
  const out = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].no === null) continue; // default 分支不是字段
    const stop = i + 1 < marks.length ? marks[i + 1].start : text.length;
    out.push({ no: marks[i].no, seg: text.slice(marks[i].start, stop) });
  }
  return out;
}

/** 把嵌套类型名相对**父 message 路径**缩短：`proto.com.a.Resource.PeriodicalHistory` → `PeriodicalHistory` */
function relativeTypeName(fullPath, parentSegs) {
  const segs = fullPath.split('.').filter((s) => s && !/^(proto|goog|jspb)$/.test(s));
  const parent = parentSegs.slice(0, -1);
  let i = 0;
  while (i < parent.length && i < segs.length && segs[i] === parent[i]) i++;
  const tail = segs.slice(i);
  return (tail.length ? tail : segs).join('_') || fullPath.replace(/\./g, '_');
}

/**
 * 抽 jspb 方言。
 * 返回 [{ name, fields: [{no, name, type, repeated, note}], source }]
 */
function extractJspb(src, opts) {
  const messages = [];
  const anchor = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\.deserializeBinaryFromReader\s*=\s*function\s*\(/g;
  let m;
  while ((m = anchor.exec(src)) !== null) {
    const path = m[1];
    const body = bodyAfter(src, m.index + m[0].length - 1);
    if (!body) continue;
    const text = src.slice(body[0], body[1]);

    // 锚点前缀（proto、goog 之类）在 path 里只是命名空间，去掉首段更像真实 package
    const segs = path.split('.').filter((s) => !/^(proto|goog|jspb)$/.test(s));
    const name = segs.join('_') || path.replace(/\./g, '_');

    const fields = [];
    for (const { no, seg } of splitSwitchCases(text)) {
      if (/^\s*$/.test(seg)) continue;

      const readFn = (/\.(read[A-Za-z0-9_$]*)\s*\(/.exec(seg) || [])[1] || null;
      // 嵌套：`var r = new s.Resource;` 或 `new proto.a.b.C(`
      const newType = (/new\s+([A-Za-z_$][\w$.]*)\s*[;(]/.exec(seg) || [])[1] || null;
      const accessorMatch = /\.(set|add)([A-Za-z0-9_$]+)\s*\(/.exec(seg);
      const accessor = accessorMatch ? accessorMatch[2] : null;
      const verb = accessorMatch ? accessorMatch[1] : null;

      if (!accessor) continue; // map 字段 / default 分支 / 非字段 case

      let type;
      if (newType) {
        type = relativeTypeName(newType, segs);
      } else {
        type = mapReadType(readFn);
      }
      const repeated = verb === 'add' || isPacked(readFn) || /\.push\s*\(/.test(seg);
      fields.push({
        no,
        name: normalizeFieldName(accessor, opts.fieldCase),
        type,
        repeated,
        note: newType && !repeated ? '嵌套 message（singleton）' : '',
      });
    }
    fields.sort((a, b) => a.no - b.no);
    messages.push({ name, fields, source: 'jspb', path });
  }
  return messages;
}

// ------------------------------------------------------------ protobufjs(full) 抽取

/**
 * 抽 protobufjs reflection 方言（带 decode 函数）。
 * 优点：`msg.fieldName = reader.xxx()` 里**字段名就是真实字段名**，比 jspb 靠 setter 反解可靠。
 */
function extractPbfull(src, opts) {
  const messages = [];
  const anchor = /([A-Za-z_$][\w$.]*)\.decode\s*=\s*function\s*\(/g;
  let m;
  while ((m = anchor.exec(src)) !== null) {
    const holder = m[1];
    const body = bodyAfter(src, m.index + m[0].length - 1);
    if (!body) continue;
    const text = src.slice(body[0], body[1]);

    // 消息名：函数体里 new 出来的那个类型最可靠
    const newType = (/new\s+([A-Za-z_$][\w$.]*)\s*\(/.exec(text) || [])[1] || null;
    const name = (newType || holder).split('.').filter(Boolean).pop();

    const fields = [];
    for (const { no, seg } of splitSwitchCases(text)) {
      if (/^\s*$/.test(seg)) continue;
      if (/skipType\s*\(|skip\s*\(/.test(seg)) continue; // 防御：default 残留

      // 优先取 `msg.field = ...` 里的真实字段名
      const prop = (/\.([A-Za-z_$][\w$]*)\s*=\s*[^=]/.exec(seg) || [])[1] || null;
      // 嵌套：`new pkg.Type(` 或 `pkg.Type.decode(`
      const subType =
        (/new\s+([A-Za-z_$][\w$.]*)\s*\(/.exec(seg) || [])[1] ||
        (/\.([A-Za-z_$][\w$.]*?)\.decode\s*\(/.exec(seg) || [])[1] ||
        null;
      // reader 方法：取最后一个 `.<method>()` 调用（第一个往往是读 tag 的 uint32）
      const methods = [...seg.matchAll(/\.([A-Za-z_$][\w$]*)\s*\(\s*\)/g)].map((x) => x[1]);
      const readFn = methods.length ? methods[methods.length - 1] : null;

      if (!prop) continue;

      let type;
      if (subType) {
        type = subType.split('.').filter(Boolean).pop();
      } else if (readFn && Object.prototype.hasOwnProperty.call(PBF_TYPE_MAP, readFn)) {
        type = PBF_TYPE_MAP[readFn];
      } else {
        type = mapReadType(readFn);
      }
      const repeated = /\.push\s*\(/.test(seg) || /\.length\s*&&/.test(seg);
      fields.push({
        no,
        name: opts.fieldCase === 'keep' ? prop : normalizeFieldName(prop, opts.fieldCase),
        type,
        repeated,
        note: '',
      });
    }
    fields.sort((a, b) => a.no - b.no);
    messages.push({ name, fields, source: 'pbfull', path: holder });
  }
  return messages;
}

// ------------------------------------------------------------ 输出

function normalizeFieldName(raw, mode) {
  if (!raw) return 'field';
  if (mode === 'keep') return raw;
  if (mode === 'snake') {
    return raw
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^A-Za-z0-9_]/g, '_')
      .toLowerCase();
  }
  // flat（默认）：只把首字母小写，其余原样——与 jspb 生成器的 setter 反解结果一致
  return raw.charAt(0).toLowerCase() + raw.slice(1);
}

function renderProto(messages, opts) {
  const lines = ['syntax = "proto3";', ''];
  if (opts.packageName) {
    lines.push('package ' + opts.packageName + ';', '');
  }
  lines.push(
    '// 由 pb_proto_from_js.js 从生成 JS 机械抽取。要点：',
    '//   * 字段名来自 setter/属性名，可能被生成器改过（如 resourcetype 实为 resourceType）',
    '//   * enum 的**取值名不可还原**（生成 JS 里只剩数字），这里统一占位为 <字段>_0 = 0',
    '//   * 该文件只保证"能解析字节流"，字段语义仍需逐个回源确认'
  );
  for (const msg of messages) {
    lines.push('', 'message ' + msg.name + ' {');
    const enums = [];
    for (const f of msg.fields) {
      let type = f.type;
      if (type === 'enum') {
        const enumName = camelToPascal(f.name);
        enums.push(enumName);
        type = enumName;
      }
      lines.push('  ' + (f.repeated ? 'repeated ' : '') + type + ' ' + f.name + ' = ' + f.no + ';');
    }
    lines.push('}');
    for (const e of enums) {
      lines.push('', 'enum ' + e + ' {', '  ' + e + '_0 = 0;', '}');
    }
  }
  return lines.join('\n') + '\n';
}

function camelToPascal(name) {
  return name.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}

function extract(src, mode, opts) {
  const out = [];
  if (mode === 'jspb' || mode === 'auto') out.push(...extractJspb(src, opts));
  if (mode === 'pbfull' || mode === 'auto') out.push(...extractPbfull(src, opts));
  // 去重（同一 message 可能被两个抽取器各命中一次）
  const seen = new Map();
  for (const msg of out) {
    const key = msg.name + '|' + msg.fields.map((f) => f.no + ':' + f.name).join(',');
    if (!seen.has(key)) seen.set(key, msg);
  }
  const messages = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  return resolveAliases(messages);
}

/**
 * 别名消解。
 *
 * 真实 bundle 里嵌套 message 常常写成模块别名：`new n.Resource`、`c.protocol.MatchStepInfo`，
 * 于是抽出来的类型名是 `n_Resource` 这种"本地别名"，不是真实 message 名。
 * 这里用**尾段唯一匹配**把别名换回已抽出的完整 message 名。
 *
 * 匹配不到或**有歧义**时不做猜测，而是加上 `@alias:` 前缀原样保留 ——
 * 让使用者一眼看出"这个类型名还没解析"，而不是悄悄写进 .proto 里编译不到。
 */
function resolveAliases(messages) {
  const tailIndex = new Map();
  for (const msg of messages) {
    const tail = msg.name.split('_').pop();
    if (!tailIndex.has(tail)) tailIndex.set(tail, []);
    tailIndex.get(tail).push(msg.name);
  }
  const known = new Set(messages.map((m) => m.name));
  const BASIC = new Set([
    ...Object.values(READ_TYPE_MAP),
    ...Object.values(PBF_TYPE_MAP),
    'enum',
    'unknown',
  ]);
  // 只有"短首段 + 下划线"才像模块别名（n_Resource / s_Magazine / c_Periodical）。
  // 全路径抽出来的名字（com_example_resource_PeriodicalHistory）首段很长，不该被动。
  const looksAlias = (t) => /^[\w$]{1,3}_[A-Z]/.test(t);
  for (const msg of messages) {
    for (const f of msg.fields) {
      if (known.has(f.type) || BASIC.has(f.type) || f.type.startsWith('unknown_') || f.type.startsWith('@alias:')) {
        continue;
      }
      if (!looksAlias(f.type)) continue;
      const tail = f.type.split('_').pop();
      const hit = tailIndex.get(tail);
      if (hit && hit.length === 1 && hit[0] !== msg.name) {
        f.resolvedFrom = f.type;
        f.type = hit[0];
      } else {
        f.note = [f.note, '类型名 `' + f.type + '` 是模块别名，未能在本次输入内解析到唯一 message'].filter(Boolean).join('；');
      }
    }
  }
  return messages;
}

// ------------------------------------------------------------ 自检

function selftest() {
  const failures = [];
  let total = 0;
  const check = (name, cond, extra) => {
    total++;
    if (!cond) failures.push(name + (extra ? ' :: ' + extra : ''));
  };

  // ---- fixture A：jspb 方言（结构取自真实生成代码，已脱敏/改名）
  const fixtureJspb = `
proto.com.example.resource.Periodical.deserializeBinaryFromReader = function(e, t) {
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
        case 21:
            r = t.readInt32();
            e.setCitedcount(r);
            break;
        case 26:
            r = t.readBool();
            e.setIsoa(r);
            break;
        case 58:
            r = t.readUint64String();
            e.setScholaridauthor(r);
            break;
        case 155:
            r = new proto.com.example.resource.PeriodicalHistory;
            t.readMessage(r, proto.com.example.resource.PeriodicalHistory.deserializeBinaryFromReader),
            e.addHistory(r);
            break;
        case 156:
            r = e.getHighlightMap();
            t.readMessage(r, function(e, t) {
                a.Map.deserializeBinary(e, t, a.BinaryReader.prototype.readString, a.BinaryReader.prototype.readString);
            });
            break;
        case 6:
            var values = t.isDelimited() ? t.readPackedEnum() : [t.readEnum()];
            for (var i = 0; i < values.length; i++) e.addCity(values[i]);
            break;
        default:
            t.skipField()
        }
    }
    return e
}
proto.pushproto.PushHeader.deserializeBinaryFromReader = function(e, t) {
    for (; t.nextField() && !t.isEndGroup(); ) {
        switch (t.getFieldNumber()) {
        case 1:
            var i = t.readString();
            e.setKey(i);
            break;
        case 2:
            i = t.readString();
            e.setValue(i);
            break;
        default:
            t.skipField()
        }
    }
    return e
}
`;
  const A = extract(fixtureJspb, 'jspb', { fieldCase: 'flat' });
  check('jspb-message-count', A.length === 2, 'got ' + A.length);
  const periodical = A.find((x) => x.name === 'com_example_resource_Periodical');
  check('jspb-name', !!periodical, JSON.stringify(A.map((x) => x.name)));
  if (periodical) {
    const byNo = Object.fromEntries(periodical.fields.map((f) => [f.no, f]));
    check('jspb-string', byNo[1] && byNo[1].type === 'string' && !byNo[1].repeated, JSON.stringify(byNo[1]));
    check('jspb-repeated-str', byNo[2] && byNo[2].repeated === true && byNo[2].type === 'string');
    check('jspb-int32', byNo[21] && byNo[21].type === 'int32');
    check('jspb-bool', byNo[26] && byNo[26].type === 'bool');
    check('jspb-uint64string', byNo[58] && byNo[58].type === 'uint64' && byNo[58].repeated === false);
    check('jspb-nested-repeated', byNo[155] && byNo[155].type === 'PeriodicalHistory' && byNo[155].repeated === true, JSON.stringify(byNo[155]));
    check('jspb-packed-enum', byNo[6] && byNo[6].type === 'enum' && byNo[6].repeated === true, JSON.stringify(byNo[6]));
    // map 字段（case 156）在 jspb 里没有 setter，必须**被跳过而不是产生坏字段**
    check('jspb-map-skipped', !byNo[156], '出现无 setter 的 map 字段泄漏');
    check('jspb-sorted', periodical.fields.map((f) => f.no).join(',') === '1,2,6,21,26,58,155', periodical.fields.map((f) => f.no).join(','));
  }
  const header = A.find((x) => x.name === 'pushproto_PushHeader');
  check('jspb-second-message', header && header.fields.length === 2);

  // ---- fixture B：protobufjs(full) 方言（取自真实的 encode/decode 对）
  const fixturePbf = `
o.MatchPlayInfo = function () {
    function t(t) {
        if (this.stepInfoList = [], t) for (var e = Object.keys(t), o = 0; o < e.length; ++o) null != t[e[o]] && (this[e[o]] = t[e[o]]);
    }
    return t.prototype.gameType = 0, t.prototype.mapId = 0, t.prototype.mapSeed = 0,
        t.prototype.stepInfoList = r.emptyArray, t.create = function (e) {
            return new t(e);
        }, t.encode = function (t, e) {
            if (e || (e = a.create()), null != t.gameType && Object.hasOwnProperty.call(t, "gameType") && e.uint32(8).int32(t.gameType),
            null != t.mapId && Object.hasOwnProperty.call(t, "mapId") && e.uint32(16).int32(t.mapId),
            null != t.mapSeed && Object.hasOwnProperty.call(t, "mapSeed") && e.uint32(24).int32(t.mapSeed),
            null != t.stepInfoList && t.stepInfoList.length) for (var o = 0; o < t.stepInfoList.length; ++o) c.protocol.MatchStepInfo.encode(t.stepInfoList[o], e.uint32(34).fork()).ldelim();
            return e;
        }, t.decode = function (t, e) {
            t instanceof i || (t = i.create(t));
            for (var o = void 0 === e ? t.len : t.pos + e, n = new c.protocol.MatchPlayInfo(); t.pos < o;) {
                var a = t.uint32();
                switch (a >>> 3) {
                    case 1:
                        n.gameType = t.int32();
                        break;
                    case 2:
                        n.mapId = t.int32();
                        break;
                    case 3:
                        n.mapSeed = t.int32();
                        break;
                    case 4:
                        n.stepInfoList && n.stepInfoList.length || (n.stepInfoList = []), n.stepInfoList.push(c.protocol.MatchStepInfo.decode(t, t.uint32()));
                        break;
                    default:
                        t.skipType(7 & a);
                }
            }
            return n;
        }, t;
}()
`;
  const B = extract(fixturePbf, 'pbfull', { fieldCase: 'keep' });
  check('pbf-message-count', B.length === 1, 'got ' + B.length + ' ' + JSON.stringify(B.map((x) => x.name)));
  const mpi = B[0];
  if (mpi) {
    check('pbf-name', mpi.name === 'MatchPlayInfo', mpi.name);
    const byNo = Object.fromEntries(mpi.fields.map((f) => [f.no, f]));
    check('pbf-real-fieldname', byNo[1] && byNo[1].name === 'gameType' && byNo[1].type === 'int32', JSON.stringify(byNo[1]));
    check('pbf-field3', byNo[3] && byNo[3].name === 'mapSeed' && byNo[3].type === 'int32');
    check(
      'pbf-nested-repeated',
      byNo[4] && byNo[4].name === 'stepInfoList' && byNo[4].type === 'MatchStepInfo' && byNo[4].repeated === true,
      JSON.stringify(byNo[4])
    );
    check('pbf-no-default-case', mpi.fields.length === 4, 'default/skipType 分支被误当字段: ' + mpi.fields.length);
  }

  // ---- fixture C：渲染产物必须自洽
  const rendered = renderProto(A, { fieldCase: 'flat' });
  check('render-syntax', rendered.startsWith('syntax = "proto3";\n'));
  check('render-has-message', rendered.includes('message com_example_resource_Periodical {'));
  check('render-repeated', rendered.includes('repeated string title = 2;'));
  check('render-nested', rendered.includes('repeated PeriodicalHistory history = 155;'));
  check('render-enum-declared', /enum City \{/.test(rendered) && /repeated City city = 6;/.test(rendered), rendered.split('\n').filter((l) => /City/.test(l)).join(' | '));
  check('render-brace-balance', (rendered.match(/\{/g) || []).length === (rendered.match(/\}/g) || []).length);

  // ---- fixture D：字段名规范化
  check('fieldname-flat', normalizeFieldName('SetResourcetype'.slice(3), 'flat') === 'resourcetype');
  check('fieldname-snake', normalizeFieldName('resourceType', 'snake') === 'resource_type');
  check('fieldname-keep', normalizeFieldName('resourceType', 'keep') === 'resourceType');

  // ---- fixture E：matchBrace 必须跳过字符串/注释里的花括号
  const tricky = 'function f() { return "}{" + \'}{\' + `{}`; /* } */ }';
  const b = bodyAfter(tricky, 0);
  check('brace-strings', !!b && tricky.slice(b[0], b[1]).includes('return "}{"'), '字符串/注释内的花括号被误判');

  // ---- fixture F：空输入必须产出空结果，且 --strict 下应判失败
  check('empty-input', extract('var a = 1;', 'auto', {}).length === 0);

  // ---- fixture G：别名消解。`new n.Resource` 里的 `n` 是 webpack 模块别名，
  //      应当用尾段唯一匹配换回已抽出的完整 message 名；匹配不到时**不许瞎猜**。
  const fixtureAlias = `
proto.pkg.Resource.deserializeBinaryFromReader = function(e, t) {
  switch (t.getFieldNumber()) {
    case 1:
      var r = t.readString();
      e.setType(r);
      break;
    default:
      t.skipField()
  }
  return e
}
proto.pkg.DetailResponse.deserializeBinaryFromReader = function(e, t) {
  switch (t.getFieldNumber()) {
    case 1:
      var r = new n.Resource;
      t.readMessage(r, n.Resource.deserializeBinaryFromReader),
      e.addDetail(r);
      break;
    case 2:
      r = new s.Magazine;
      t.readMessage(r, s.Magazine.deserializeBinaryFromReader),
      e.addMagazine(r);
      break;
    default:
      t.skipField()
  }
  return e
}
`;
  const C = extract(fixtureAlias, 'jspb', { fieldCase: 'flat' });
  const detail = C.find((x) => x.name === 'pkg_DetailResponse');
  check('alias-message-found', !!detail, JSON.stringify(C.map((x) => x.name)));
  if (detail) {
    const f1 = detail.fields.find((f) => f.no === 1);
    const f2 = detail.fields.find((f) => f.no === 2);
    check('alias-resolved', f1 && f1.type === 'pkg_Resource' && f1.resolvedFrom === 'n_Resource', JSON.stringify(f1));
    check('alias-repeated-kept', f1 && f1.repeated === true);
    // 解析不到时保留原名 + 备注，不得臆造
    check('alias-unresolved-kept', f2 && f2.type === 's_Magazine', JSON.stringify(f2));
    check('alias-unresolved-noted', f2 && /模块别名/.test(f2.note || ''), JSON.stringify(f2));
  }
  // 全路径抽出的名字会被相对化（`proto.com.example.resource.PeriodicalHistory` → 同包兄弟名
  // `PeriodicalHistory`），相对化后的名字**不得**再被别名消解改写
  const A2 = extract(fixtureJspb, 'jspb', { fieldCase: 'flat' });
  const ph2 = A2.find((x) => x.name === 'com_example_resource_Periodical').fields.find((f) => f.no === 155);
  check('alias-not-applied-to-fullpath', ph2 && ph2.type === 'PeriodicalHistory' && !ph2.resolvedFrom, JSON.stringify(ph2));

  if (failures.length) {
    console.log('SELFTEST FAIL (' + failures.length + '/' + total + ')');
    failures.forEach((x) => console.log('  - ' + x));
    return 1;
  }
  console.log('SELFTEST PASS (' + total + '/' + total + ')');
  return 0;
}

// ------------------------------------------------------------ CLI

function parseArgs(argv) {
  const opts = {
    input: null,
    out: null,
    mode: 'auto',
    fieldCase: 'flat',
    packageName: '',
    pretty: false,
    strict: false,
    selftest: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') opts.input = argv[++i];
    else if (a === '--out' || a === '-o') opts.out = argv[++i];
    else if (a === '--mode') opts.mode = argv[++i];
    else if (a === '--field-case') opts.fieldCase = argv[++i];
    else if (a === '--package') opts.packageName = argv[++i];
    else if (a === '--pretty') opts.pretty = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--selftest') opts.selftest = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else {
      console.error('未知参数: ' + a);
      process.exit(2);
    }
  }
  return opts;
}

function usage() {
  console.log(
    [
      '用法: node pb_proto_from_js.js --input <bundle.js> [--out schema.proto] [选项]',
      '',
      '选项:',
      '  --mode jspb|pbfull|auto   抽取方言，默认 auto（两种都跑，按名字+字段去重）',
      '  --field-case flat|snake|keep  字段名风格，默认 flat',
      '  --package <name>          写入 package 声明',
      '  --pretty                  输出额外打印每个 message 的字段明细',
      '  --strict                  抽到 0 个 message 时以退出码 1 失败',
      '  --selftest                跑内置自检',
    ].join('\n')
  );
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.selftest) return selftest();
  if (opts.help || !opts.input) {
    usage();
    return opts.help ? 0 : 2;
  }
  if (!['jspb', 'pbfull', 'auto'].includes(opts.mode)) {
    console.error('--mode 只支持 jspb / pbfull / auto');
    return 2;
  }
  if (!['flat', 'snake', 'keep'].includes(opts.fieldCase)) {
    console.error('--field-case 只支持 flat / snake / keep');
    return 2;
  }

  let src;
  try {
    src = fs.readFileSync(opts.input, 'utf8');
  } catch (err) {
    console.error('读取失败: ' + err.message);
    return 2;
  }

  const messages = extract(src, opts.mode, opts);
  const proto = renderProto(messages, opts);

  if (opts.out) {
    fs.writeFileSync(opts.out, proto, 'utf8');
    console.log('已写入 ' + opts.out + '：' + messages.length + ' 个 message');
  } else {
    process.stdout.write(proto);
  }

  if (opts.pretty) {
    for (const msg of messages) {
      console.error('[' + msg.source + '] ' + msg.name + '  (' + msg.fields.length + ' 字段, 来自 ' + msg.path + ')');
      for (const f of msg.fields) {
        console.error('    ' + String(f.no).padStart(4) + '  ' + (f.repeated ? 'repeated ' : '') + f.type + ' ' + f.name);
      }
    }
  }

  if (messages.length === 0) {
    console.error('警告：没有抽到任何 message。可能原因：');
    console.error('  1) 输入不是生成的 protobuf 代码（先看 references/dialect-matrix.md 的判据）');
    console.error('  2) 标识符被混淆改名（换 ast-deobfuscation 的 AST 路线）');
    console.error('  3) 目标用的是本脚本未覆盖的方言（如 steam 的 {n,br,bw} 表）');
    if (opts.strict) return 1;
  }
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { extract, extractJspb, extractPbfull, renderProto, matchBrace, bodyAfter, normalizeFieldName, READ_TYPE_MAP };
