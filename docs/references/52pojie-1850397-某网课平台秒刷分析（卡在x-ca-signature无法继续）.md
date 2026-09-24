# 某网课平台秒刷分析（卡在x-ca-signature无法继续）

> **作者**: 蒋阿君 | **发布时间**: 2023-10-30 15:58:00 | **版块**: 『编程语言区』 | **查看/回复**: 3417 / 8
> **原文**: [https://www.52pojie.cn/thread-1850397-1-1.html](https://www.52pojie.cn/thread-1850397-1-1.html)

---

一、使用视频加速插件对网课加速，但结果视频进度不增加
二、抓包分析找到了视频进度记录
有两条数据包时进行视频进度记录的（progress和progress2）

![](https://attach.52pojie.cn/forum/202310/30/154237tzo3c2y5fjiytgid.jpg)

![](https://attach.52pojie.cn/forum/202310/30/154245u10iz03a1200qz2a.jpg)

POST提交测试

![](https://attach.52pojie.cn/forum/202310/30/154303t51bbzctykcg3lha.png)

![](https://attach.52pojie.cn/forum/202310/30/154312dggq9naelg0e9noc.png)

结果对比

![](https://attach.52pojie.cn/forum/202310/30/154448behzuh3gll0hrrrh.png)

![](https://attach.52pojie.cn/forum/202310/30/154514gxq3xcxbu3zjbe7q.png)

此时视频进度已达到100%，但是学时未增加，点击视频重新进入课程后发现视频进度变成了0。
猜测视频被重置是受到了请求标头中X-CA-TIMESTAMP值的影响，修改X-CA-TIMESTAMP的值重新提交，返回提示【无效签名，签名不一致】。
经搜索相关资料得知X-CA-TIMESTAMP与X-CA-SIGNATURE、X-CA-NONCE有对应的值才可以正常提交。
后边就不会了。。有大佬继续分析下吗？
附相关JS

[JavaScript] *纯文本查看*

```
!
function() {
	"use strict";
	var ERROR = "input is invalid type",
	WINDOW = "object" == typeof window,
	root = WINDOW ? window: {};
	root.JS_MD5_NO_WINDOW && (WINDOW = !1);
	var WEB_WORKER = !WINDOW && "object" == typeof self,
	NODE_JS = !root.JS_MD5_NO_NODE_JS && "object" == typeof process && process.versions && process.versions.node;
	NODE_JS ? root = global: WEB_WORKER && (root = self);
	var COMMON_JS = !root.JS_MD5_NO_COMMON_JS && "object" == typeof module && module.exports,
	AMD = __webpack_require__("PDX0"),
	ARRAY_BUFFER = !root.JS_MD5_NO_ARRAY_BUFFER && "undefined" != typeof ArrayBuffer,
	HEX_CHARS = "0123456789abcdef".split(""),
	EXTRA = [128, 32768, 8388608, -2147483648],
	SHIFT = [0, 8, 16, 24],
	OUTPUT_TYPES = ["hex", "array", "digest", "buffer", "arrayBuffer", "base64"],
	BASE64_ENCODE_CHAR = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""),
	blocks = [],
	buffer8;
	if (ARRAY_BUFFER) {
		var buffer = new ArrayBuffer(68);
		buffer8 = new Uint8Array(buffer),
		blocks = new Uint32Array(buffer)
	} ! root.JS_MD5_NO_NODE_JS && Array.isArray || (Array.isArray = function(t) {
		return "[object Array]" === Object.prototype.toString.call(t)
	}),
	!ARRAY_BUFFER || !root.JS_MD5_NO_ARRAY_BUFFER_IS_VIEW && ArrayBuffer.isView || (ArrayBuffer.isView = function(t) {
		return "object" == typeof t && t.buffer && t.buffer.constructor === ArrayBuffer
	});
	var createOutputMethod = function(t) {
		return function(e) {
			return new Md5(!0).update(e)[t]()
		}
	},
	createMethod = function() {
		var t = createOutputMethod("hex");
		NODE_JS && (t = nodeWrap(t)),
		t.create = function() {
			return new Md5
		},
		t.update = function(e) {
			return t.create().update(e)
		};
		for (var e = 0; e < OUTPUT_TYPES.length; ++e) {
			var r = OUTPUT_TYPES[e];
			t[r] = createOutputMethod(r)
		}
		return t
	},
	nodeWrap = function(method) {
		var crypto = eval("require('crypto')"),
		Buffer = eval("require('buffer').Buffer"),
		nodeMethod = function(t) {
			if ("string" == typeof t) return crypto.createHash("md5").update(t, "utf8").digest("hex");
			if (null === t || void 0 === t) throw ERROR;
			return t.constructor === ArrayBuffer && (t = new Uint8Array(t)),
			Array.isArray(t) || ArrayBuffer.isView(t) || t.constructor === Buffer ? crypto.createHash("md5").update(new Buffer(t)).digest("hex") : method(t)
		};
		return nodeMethod
	};
	function Md5(t) {
		if (t) blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0,
		this.blocks = blocks,
		this.buffer8 = buffer8;
		else if (ARRAY_BUFFER) {
			var e = new ArrayBuffer(68);
			this.buffer8 = new Uint8Array(e),
			this.blocks = new Uint32Array(e)
		} else this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		this.h0 = this.h1 = this.h2 = this.h3 = this.start = this.bytes = this.hBytes = 0,
		this.finalized = this.hashed = !1,
		this.first = !0
	}
	Md5.prototype.update = function(t) {
		if (!this.finalized) {
			var e, r = typeof t;
			if ("string" !== r) {
				if ("object" !== r) throw ERROR;
				if (null === t) throw ERROR;
				if (ARRAY_BUFFER && t.constructor === ArrayBuffer) t = new Uint8Array(t);
				else if (! (Array.isArray(t) || ARRAY_BUFFER && ArrayBuffer.isView(t))) throw ERROR;
				e = !0
			}
			for (var o, i, n = 0,
			s = t.length,
			a = this.blocks,
			h = this.buffer8; n < s;) {
				if (this.hashed && (this.hashed = !1, a[0] = a[16], a[16] = a[1] = a[2] = a[3] = a[4] = a[5] = a[6] = a[7] = a[8] = a[9] = a[10] = a[11] = a[12] = a[13] = a[14] = a[15] = 0), e) if (ARRAY_BUFFER) for (i = this.start; n < s && i < 64; ++n) h[i++] = t[n];
				else for (i = this.start; n < s && i < 64; ++n) a[i >> 2] |= t[n] << SHIFT[3 & i++];
				else if (ARRAY_BUFFER) for (i = this.start; n < s && i < 64; ++n)(o = t.charCodeAt(n)) < 128 ? h[i++] = o: o < 2048 ? (h[i++] = 192 | o >> 6, h[i++] = 128 | 63 & o) : o < 55296 || o >= 57344 ? (h[i++] = 224 | o >> 12, h[i++] = 128 | o >> 6 & 63, h[i++] = 128 | 63 & o) : (o = 65536 + ((1023 & o) << 10 | 1023 & t.charCodeAt(++n)), h[i++] = 240 | o >> 18, h[i++] = 128 | o >> 12 & 63, h[i++] = 128 | o >> 6 & 63, h[i++] = 128 | 63 & o);
				else for (i = this.start; n < s && i < 64; ++n)(o = t.charCodeAt(n)) < 128 ? a[i >> 2] |= o << SHIFT[3 & i++] : o < 2048 ? (a[i >> 2] |= (192 | o >> 6) << SHIFT[3 & i++], a[i >> 2] |= (128 | 63 & o) << SHIFT[3 & i++]) : o < 55296 || o >= 57344 ? (a[i >> 2] |= (224 | o >> 12) << SHIFT[3 & i++], a[i >> 2] |= (128 | o >> 6 & 63) << SHIFT[3 & i++], a[i >> 2] |= (128 | 63 & o) << SHIFT[3 & i++]) : (o = 65536 + ((1023 & o) << 10 | 1023 & t.charCodeAt(++n)), a[i >> 2] |= (240 | o >> 18) << SHIFT[3 & i++], a[i >> 2] |= (128 | o >> 12 & 63) << SHIFT[3 & i++], a[i >> 2] |= (128 | o >> 6 & 63) << SHIFT[3 & i++], a[i >> 2] |= (128 | 63 & o) << SHIFT[3 & i++]);
				this.lastByteIndex = i,
				this.bytes += i - this.start,
				i >= 64 ? (this.start = i - 64, this.hash(), this.hashed = !0) : this.start = i
			}
			return this.bytes > 4294967295 && (this.hBytes += this.bytes / 4294967296 << 0, this.bytes = this.bytes % 4294967296),
			this
		}
	},
	Md5.prototype.finalize = function() {
		if (!this.finalized) {
			this.finalized = !0;
			var t = this.blocks,
			e = this.lastByteIndex;
			t[e >> 2] |= EXTRA[3 & e],
			e >= 56 && (this.hashed || this.hash(), t[0] = t[16], t[16] = t[1] = t[2] = t[3] = t[4] = t[5] = t[6] = t[7] = t[8] = t[9] = t[10] = t[11] = t[12] = t[13] = t[14] = t[15] = 0),
			t[14] = this.bytes << 3,
			t[15] = this.hBytes << 3 | this.bytes >>> 29,
			this.hash()
		}
	},
	Md5.prototype.hash = function() {
		var t, e, r, o, i, n, s = this.blocks;
		this.first ? e = ((e = ((t = ((t = s[0] - 680876937) << 7 | t >>> 25) - 271733879 << 0) ^ (r = ((r = ( - 271733879 ^ (o = ((o = ( - 1732584194 ^ 2004318071 & t) + s[1] - 117830708) << 12 | o >>> 20) + t << 0) & ( - 271733879 ^ t)) + s[2] - 1126478375) << 17 | r >>> 15) + o << 0) & (o ^ t)) + s[3] - 1316259209) << 22 | e >>> 10) + r << 0 : (t = this.h0, e = this.h1, r = this.h2, e = ((e += ((t = ((t += ((o = this.h3) ^ e & (r ^ o)) + s[0] - 680876936) << 7 | t >>> 25) + e << 0) ^ (r = ((r += (e ^ (o = ((o += (r ^ t & (e ^ r)) + s[1] - 389564586) << 12 | o >>> 20) + t << 0) & (t ^ e)) + s[2] + 606105819) << 17 | r >>> 15) + o << 0) & (o ^ t)) + s[3] - 1044525330) << 22 | e >>> 10) + r << 0),
		e = ((e += ((t = ((t += (o ^ e & (r ^ o)) + s[4] - 176418897) << 7 | t >>> 25) + e << 0) ^ (r = ((r += (e ^ (o = ((o += (r ^ t & (e ^ r)) + s[5] + 1200080426) << 12 | o >>> 20) + t << 0) & (t ^ e)) + s[6] - 1473231341) << 17 | r >>> 15) + o << 0) & (o ^ t)) + s[7] - 45705983) << 22 | e >>> 10) + r << 0,
		e = ((e += ((t = ((t += (o ^ e & (r ^ o)) + s[8] + 1770035416) << 7 | t >>> 25) + e << 0) ^ (r = ((r += (e ^ (o = ((o += (r ^ t & (e ^ r)) + s[9] - 1958414417) << 12 | o >>> 20) + t << 0) & (t ^ e)) + s[10] - 42063) << 17 | r >>> 15) + o << 0) & (o ^ t)) + s[11] - 1990404162) << 22 | e >>> 10) + r << 0,
		e = ((e += ((t = ((t += (o ^ e & (r ^ o)) + s[12] + 1804603682) << 7 | t >>> 25) + e << 0) ^ (r = ((r += (e ^ (o = ((o += (r ^ t & (e ^ r)) + s[13] - 40341101) << 12 | o >>> 20) + t << 0) & (t ^ e)) + s[14] - 1502002290) << 17 | r >>> 15) + o << 0) & (o ^ t)) + s[15] + 1236535329) << 22 | e >>> 10) + r << 0,
		e = ((e += ((o = ((o += (e ^ r & ((t = ((t += (r ^ o & (e ^ r)) + s[1] - 165796510) << 5 | t >>> 27) + e << 0) ^ e)) + s[6] - 1069501632) << 9 | o >>> 23) + t << 0) ^ t & ((r = ((r += (t ^ e & (o ^ t)) + s[11] + 643717713) << 14 | r >>> 18) + o << 0) ^ o)) + s[0] - 373897302) << 20 | e >>> 12) + r << 0,
		e = ((e += ((o = ((o += (e ^ r & ((t = ((t += (r ^ o & (e ^ r)) + s[5] - 701558691) << 5 | t >>> 27) + e << 0) ^ e)) + s[10] + 38016083) << 9 | o >>> 23) + t << 0) ^ t & ((r = ((r += (t ^ e & (o ^ t)) + s[15] - 660478335) << 14 | r >>> 18) + o << 0) ^ o)) + s[4] - 405537848) << 20 | e >>> 12) + r << 0,
		e = ((e += ((o = ((o += (e ^ r & ((t = ((t += (r ^ o & (e ^ r)) + s[9] + 568446438) << 5 | t >>> 27) + e << 0) ^ e)) + s[14] - 1019803690) << 9 | o >>> 23) + t << 0) ^ t & ((r = ((r += (t ^ e & (o ^ t)) + s[3] - 187363961) << 14 | r >>> 18) + o << 0) ^ o)) + s[8] + 1163531501) << 20 | e >>> 12) + r << 0,
		e = ((e += ((o = ((o += (e ^ r & ((t = ((t += (r ^ o & (e ^ r)) + s[13] - 1444681467) << 5 | t >>> 27) + e << 0) ^ e)) + s[2] - 51403784) << 9 | o >>> 23) + t << 0) ^ t & ((r = ((r += (t ^ e & (o ^ t)) + s[7] + 1735328473) << 14 | r >>> 18) + o << 0) ^ o)) + s[12] - 1926607734) << 20 | e >>> 12) + r << 0,
		e = ((e += ((n = (o = ((o += ((i = e ^ r) ^ (t = ((t += (i ^ o) + s[5] - 378558) << 4 | t >>> 28) + e << 0)) + s[8] - 2022574463) << 11 | o >>> 21) + t << 0) ^ t) ^ (r = ((r += (n ^ e) + s[11] + 1839030562) << 16 | r >>> 16) + o << 0)) + s[14] - 35309556) << 23 | e >>> 9) + r << 0,
		e = ((e += ((n = (o = ((o += ((i = e ^ r) ^ (t = ((t += (i ^ o) + s[1] - 1530992060) << 4 | t >>> 28) + e << 0)) + s[4] + 1272893353) << 11 | o >>> 21) + t << 0) ^ t) ^ (r = ((r += (n ^ e) + s[7] - 155497632) << 16 | r >>> 16) + o << 0)) + s[10] - 1094730640) << 23 | e >>> 9) + r << 0,
		e = ((e += ((n = (o = ((o += ((i = e ^ r) ^ (t = ((t += (i ^ o) + s[13] + 681279174) << 4 | t >>> 28) + e << 0)) + s[0] - 358537222) << 11 | o >>> 21) + t << 0) ^ t) ^ (r = ((r += (n ^ e) + s[3] - 722521979) << 16 | r >>> 16) + o << 0)) + s[6] + 76029189) << 23 | e >>> 9) + r << 0,
		e = ((e += ((n = (o = ((o += ((i = e ^ r) ^ (t = ((t += (i ^ o) + s[9] - 640364487) << 4 | t >>> 28) + e << 0)) + s[12] - 421815835) << 11 | o >>> 21) + t << 0) ^ t) ^ (r = ((r += (n ^ e) + s[15] + 530742520) << 16 | r >>> 16) + o << 0)) + s[2] - 995338651) << 23 | e >>> 9) + r << 0,
		e = ((e += ((o = ((o += (e ^ ((t = ((t += (r ^ (e | ~o)) + s[0] - 198630844) << 6 | t >>> 26) + e << 0) | ~r)) + s[7] + 1126891415) << 10 | o >>> 22) + t << 0) ^ ((r = ((r += (t ^ (o | ~e)) + s[14] - 1416354905) << 15 | r >>> 17) + o << 0) | ~t)) + s[5] - 57434055) << 21 | e >>> 11) + r << 0,
		e = ((e += ((o = ((o += (e ^ ((t = ((t += (r ^ (e | ~o)) + s[12] + 1700485571) << 6 | t >>> 26) + e << 0) | ~r)) + s[3] - 1894986606) << 10 | o >>> 22) + t << 0) ^ ((r = ((r += (t ^ (o | ~e)) + s[10] - 1051523) << 15 | r >>> 17) + o << 0) | ~t)) + s[1] - 2054922799) << 21 | e >>> 11) + r << 0,
		e = ((e += ((o = ((o += (e ^ ((t = ((t += (r ^ (e | ~o)) + s[8] + 1873313359) << 6 | t >>> 26) + e << 0) | ~r)) + s[15] - 30611744) << 10 | o >>> 22) + t << 0) ^ ((r = ((r += (t ^ (o | ~e)) + s[6] - 1560198380) << 15 | r >>> 17) + o << 0) | ~t)) + s[13] + 1309151649) << 21 | e >>> 11) + r << 0,
		e = ((e += ((o = ((o += (e ^ ((t = ((t += (r ^ (e | ~o)) + s[4] - 145523070) << 6 | t >>> 26) + e << 0) | ~r)) + s[11] - 1120210379) << 10 | o >>> 22) + t << 0) ^ ((r = ((r += (t ^ (o | ~e)) + s[2] + 718787259) << 15 | r >>> 17) + o << 0) | ~t)) + s[9] - 343485551) << 21 | e >>> 11) + r << 0,
		this.first ? (this.h0 = t + 1732584193 << 0, this.h1 = e - 271733879 << 0, this.h2 = r - 1732584194 << 0, this.h3 = o + 271733878 << 0, this.first = !1) : (this.h0 = this.h0 + t << 0, this.h1 = this.h1 + e << 0, this.h2 = this.h2 + r << 0, this.h3 = this.h3 + o << 0)
	},
	Md5.prototype.hex = function() {
		this.finalize();
		var t = this.h0,
		e = this.h1,
		r = this.h2,
		o = this.h3;
		return HEX_CHARS[t >> 4 & 15] + HEX_CHARS[15 & t] + HEX_CHARS[t >> 12 & 15] + HEX_CHARS[t >> 8 & 15] + HEX_CHARS[t >> 20 & 15] + HEX_CHARS[t >> 16 & 15] + HEX_CHARS[t >> 28 & 15] + HEX_CHARS[t >> 24 & 15] + HEX_CHARS[e >> 4 & 15] + HEX_CHARS[15 & e] + HEX_CHARS[e >> 12 & 15] + HEX_CHARS[e >> 8 & 15] + HEX_CHARS[e >> 20 & 15] + HEX_CHARS[e >> 16 & 15] + HEX_CHARS[e >> 28 & 15] + HEX_CHARS[e >> 24 & 15] + HEX_CHARS[r >> 4 & 15] + HEX_CHARS[15 & r] + HEX_CHARS[r >> 12 & 15] + HEX_CHARS[r >> 8 & 15] + HEX_CHARS[r >> 20 & 15] + HEX_CHARS[r >> 16 & 15] + HEX_CHARS[r >> 28 & 15] + HEX_CHARS[r >> 24 & 15] + HEX_CHARS[o >> 4 & 15] + HEX_CHARS[15 & o] + HEX_CHARS[o >> 12 & 15] + HEX_CHARS[o >> 8 & 15] + HEX_CHARS[o >> 20 & 15] + HEX_CHARS[o >> 16 & 15] + HEX_CHARS[o >> 28 & 15] + HEX_CHARS[o >> 24 & 15]
	},
	Md5.prototype.toString = Md5.prototype.hex,
	Md5.prototype.digest = function() {
		this.finalize();
		var t = this.h0,
		e = this.h1,
		r = this.h2,
		o = this.h3;
		return [255 & t, t >> 8 & 255, t >> 16 & 255, t >> 24 & 255, 255 & e, e >> 8 & 255, e >> 16 & 255, e >> 24 & 255, 255 & r, r >> 8 & 255, r >> 16 & 255, r >> 24 & 255, 255 & o, o >> 8 & 255, o >> 16 & 255, o >> 24 & 255]
	},
	Md5.prototype.array = Md5.prototype.digest,
	Md5.prototype.arrayBuffer = function() {
		this.finalize();
		var t = new ArrayBuffer(16),
		e = new Uint32Array(t);
		return e[0] = this.h0,
		e[1] = this.h1,
		e[2] = this.h2,
		e[3] = this.h3,
		t
	},
	Md5.prototype.buffer = Md5.prototype.arrayBuffer,
	Md5.prototype.base64 = function() {
		for (var t, e, r, o = "",
		i = this.array(), n = 0; n < 15;) t = i[n++],
		e = i[n++],
		r = i[n++],
		o += BASE64_ENCODE_CHAR[t >>> 2] + BASE64_ENCODE_CHAR[63 & (t << 4 | e >>> 4)] + BASE64_ENCODE_CHAR[63 & (e << 2 | r >>> 6)] + BASE64_ENCODE_CHAR[63 & r];
		return t = i[n],
		o += BASE64_ENCODE_CHAR[t >>> 2] + BASE64_ENCODE_CHAR[t << 4 & 63] + "=="
	};
	var exports = createMethod();
	COMMON_JS ? module.exports = exports: (root.md5 = exports, AMD && (__WEBPACK_AMD_DEFINE_RESULT__ = function() {
		return exports
	}.call(exports, __webpack_require__, exports, module), void 0 === __WEBPACK_AMD_DEFINE_RESULT__ || (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)))
} ()
}).call(this, __webpack_require__("8oxB"), __webpack_require__("yLpj"))
},
"8Owp": function(t, e, s) {},
"9/Il": function(t, e, s) {
	"use strict";
	var a = s("MMlT");
	s.n(a).a
},
"JXzA": function(t, e, s) {},
"MMlT": function(t, e, s) {},
"RuAA": function(t, e, s) {},
"SRhJ": function(t, e, s) {
	"use strict";
	var a, i = s("YEIV"),
	r = s.n(i),
	n = s("QbLZ"),
	o = s.n(n),
	c = s("xHg6"),
	l = s("L2JU"),
	u = (s("DG18"), s("Ucl2")),
	d = (s("/aIJ"), s("RR9+"), s("1tPa")),
	p = s("TsPW"),
	v = s("gjeX"),
	g = s.n(v),
	m = r()({
		name: "VideoPlayer",
		props: ["videosrc", "screenshotPath", "videoPlayCourse", "courseType", "isShare", "playFlag"],
		components: {
			videoPlayer: d.videoPlayer
		},
		data: function() {
			return {
				studyStatus: "",
				studyTimes: "",
				oUrl: p.a.oUrl(),
				timer: null,
				oldTime: 0,
				courseDuration: 0,
				isFirstStart: !0,
				isStart: !1,
				isPlayed: !1,
				isEnd: !1,
				hasPlay: !1,
				playerOptions: {
					autoplay: !1,
					muted: !1,
					loop: !1,
					preload: "auto",
					language: "zh-CN",
					aspectRatio: "16:9",
					fluid: !0,
					sources: [{
						type: "",
						src: this.videoPlayCourse.resourcePath
					}],
					poster: this.videoPlayCourse.courseCover,
					notSupportedMessage: "此视频暂无法播放，请稍后再试",
					controlBar: {
						timeDivider: !0,
						durationDisplay: !0,
						remainingTimeDisplay: !1,
						fullscreenToggle: !0
					}
				},
				coursePlayData: {
					userId: "",
					courseId: "",
					orgId: "",
					orgCode: "",
					orgName: "",
					courseType: this.courseType
				}
			}
		},
		computed: o()({
			player: function() {
				return this.$refs.videoPlayer.player
			}
		},
		Object(l.b)(["userInfo", "configure"])),
		watch: {
			videoPlayCourse: function(t) {
				clearInterval(this.timer),
				this.timer = null,
				this.playerOptions.sources[0].src = t.resourcePath,
				this.isFirstStart = !0,
				this.hasPlay = !1,
				this.oldTime = 0,
				this.courseDuration = 0,
				this.isStart = !1,
				this.isEnd = !1
			},
			screenshotPath: function(t) {
				this.playerOptions.poster = t
			},
			isStart: function(t) {
				if (!0 === this.isShare) console.log("分享播放");
				else if (!0 === this.hasPlay);
				else if (!0 === t) {
					var e = this.getSetLearnTime(this.courseDuration); (e < 10 || !e) && (e = 1e5),
					this.timer = setInterval(this.recordProgress, 6e4)
				} else clearInterval(this.timer),
				this.timer = null
			},
			isEnd: function(t) { ! 0 === this.isShare || (this.hasPlay ? this.$emit("videoEnd") : !0 === t && (clearInterval(this.timer), this.hasPlay = !0, this.updateStudyRecordEnd()))
			}
		},
		mounted: function() {
			var t = this;
			window.addEventListener("beforeunload",
			function(e) {
				return t.beforeunloadHandler(e)
			})
		},
		created: function() {
			console.log("this.videoPlayCoursethis.videoPlayCoursethis.videoPlayCourse", this.videoPlayCourse),
			this.isFirstStart = "2" != this.videoPlayCourse.studyStatus && "1" != this.videoPlayCourse.recordStatus,
			console.log(">>>>>>>>>>>>>>>>>>>>>>>>--------------===>", this.videoPlayCourse)
		},
		beforeDestroy: function() {
			clearInterval(this.timer),
			this.timer = null
		},
		destroyed: function() {
			var t = this;
			window.removeEventListener("beforeunload",
			function(e) {
				return t.beforeunloadHandler(e)
			})
		},
		methods: (a = {
			videoPlay: function() {
				this.$refs.videoPlayer.player.play()
			},
			beforeunloadHandler: function(t) {
				this.isPlayed && !this.hasPlay && this.recordProgress()
			},
			recordProgress: function(t) {
				var e = this,
				s = Math.ceil(this.oldTime),
				a = {
					courseId: this.videoPlayCourse.id,
					idCardHash: this.userInfo.idCardHash,
					studyTimes: s
				};
				u.a.studyProgress(a).then(function(t) {
					if (!t.data.success && t.data.plagFlag) return e.$message({
						message: t.data.message,
						type: "warning"
					}),
					void e.player.pause()
				}),
				this.unifiedClassHours()
			},
			unifiedClassHours: function() {
				var t = this,
				e = this.guid(),
				s = (new Date).getTime(),
				a = {
					"X-CA-NONCE": e,
					"X-CA-SIGNATURE": this.sign("e8f5e56d7b67b997", e, s),
					"X-CA-TIMESTAMP": s,
					"X-CA-KEY": "ac620187e5b8d7af"
				},
				i = {
					userId: this.userInfo.idCardHash,
					courseCode: this.videoPlayCourse.id,
					studyTimes: Math.ceil(this.oldTime)
				};
				u.a.studyProgress2(i, a).then(function(e) {
					if (!e.data.success && e.data.plagFlag) return t.$message({
						message: e.data.message,
						type: "warning"
					}),
					void t.player.pause()
				})
			},
			guid: function() {
				function t() {
					return (65536 * (1 + Math.random()) | 0).toString(16).substring(1)
				}
				return t() + t().slice(0, 2)
			},
			sign: function(t, e, s) {
				return ("V1" + g()(s + e + t)).toUpperCase()
			},
			updateStudyRecordEnd: function() {
				var t = this,
				e = {
					courseId: this.videoPlayCourse.id,
					idCardHash: this.userInfo.idCardHash
				};
				u.a.studyEnd(e).then(function(e) {
					e.data.success && (t.studyTimes = 0, t.isFirstStart = !1),
					t.$emit("videoEnd")
				}).
				catch(function(t) {})
			},
			getSetLearnTime: function(t) {
				return t > 0 && t <= 300 ? t / 2 * 1e3: t > 300 && t <= 600 ? 18e4: t > 600 && t <= 1800 ? 3e5: t > 1800 ? 3e5: void 0
			}
		},
		r()(a, "guid",
		function() {
			function t() {
				return (65536 * (1 + Math.random()) | 0).toString(16).substring(1)
			}
			return t() + t() + "-" + t() + "-" + t() + "-" + t() + "-" + t() + t() + t()
		}), r()(a, "close",
		function() {
			window.location.href = "about:blank ",
			navigator.userAgent.indexOf("MSIE") > 0 ? navigator.userAgent.indexOf("MSIE 6.0") > 0 ? (window.opener = null, window.close()) : (window.open(" ", "_top"), window.top.close()) : (window.opener = null, window.open(" ", "_self", ""), window.close())
		}), r()(a, "onPlayerPlay",
		function(t) {
			var e = this;
			if (Object(c.a)(), this.studyStatus = this.videoPlayCourse.studyStatus || "", this.studyTimes = this.videoPlayCourse.studyTimes || 0, !this.userInfo) return this.player.pause(),
			this.isStart = !1,
			this.isEnd = !1,
			window.location.href = this.oUrl.loginUrl,
			!1;
			if (this.courseDuration = t.cache_.duration, !this.isStart && this.isFirstStart) {
				var s = {
					courseId: this.videoPlayCourse.id,
					idCardHash: this.userInfo.idCardHash,
					studyType: this.videoPlayCourse.resourceType
				};
				u.a.studyStart(s).then(function(t) {
					t.data.success ? (e.oldTime < Number(e.studyTimes) && (e.oldTime = Number(e.studyTimes) > 1 ? e.studyTimes - .5 : e.studyTimes), e.$refs.videoPlayer.player.currentTime(e.oldTime), e.isStart = !0, e.isPlayed = !0) : e.$message({
						message: "当前用户登录状态不正确，请联系客服人员（400-690-7927）",
						type: "warning"
					})
				}).
				catch(function(t) {
					e.$message({
						message: "当前用户登录状态不正确，请联系客服人员（400-690-7927）",
						type: "warning"
					})
				})
			} else this.isStart = !1,
			this.isEnd = !1
		}), r()(a, "onPlayerPause",
		function(t) {
			this.isStart = !1,
			this.isEnd = !1
		}), r()(a, "onPlayerEnded",
		function(t) {
			this.isStart = !1,
			this.isEnd = !0
		}), r()(a, "onPlayerTimeupdate",
		function(t) {
			var e = t.cache_.currentTime;
			e - this.oldTime > 1 && this.isFirstStart && !0 !== this.isShare ? this.$refs.videoPlayer.player.currentTime(this.oldTime) : this.oldTime = e
		}), r()(a, "playerReadied",
		function(t) {}), a)
	},
	"destroyed",
	function() {
		this.isPlayed && !this.hasPlay && this.recordProgress()
	}),
	h = (s("bZfp"), s("KHd+")),
	b = Object(h.a)(m,
	function() {
		var t = this,
		e = t.$createElement,
		s = t._self._c || e;
		return s("div", {
			on: {
				contextmenu: function(t) {
					t.preventDefault()
				}
			}
		},
		[s("video-player", {
			ref: "videoPlayer",
			staticClass: "video-player-box detailVideo",
			attrs: {
				options: t.playerOptions,
				playsinline: !0,
				customEventName: "customstatechangedeventname"
			},
			on: {
				play: function(e) {
					t.onPlayerPlay(e)
				},
				pause: function(e) {
					t.onPlayerPause(e)
				},
				ended: function(e) {
					t.onPlayerEnded(e)
				},
				timeupdate: function(e) {
					t.onPlayerTimeupdate(e)
				},
				ready: t.playerReadied
			}
		})], 1)
	},
	[], !1, null, null, null);
	b.options.__file = "index.vue";
	e.a = b.exports
},
"Ucl2": function(t, e, s) {
	"use strict";
	var a = s("P2sY"),
	i = s.n(a),
	r = s("DG18"),
	n = s("4d7F"),
	o = s.n(n),
	c = s("vDqi"),
	l = s.n(c);
	function u(t, e, s) {
		return function(t, e, s) {
			return new o.a(function(a, r) {
				l()({
					method: "POST",
					url: t,
					data: e,
					headers: i()({},
					{
						"Content-Type": "application/json;",
						"X-Requested-With": "XMLHttpRequest"
					},
					s)
				}).then(function(t) {
					a(t)
				}).
				catch(function(t) {
					r(t)
				})
			})
		} ("" + t, e, s)
	}
	l.a.defaults.withCredentials = !0,
	l.a.defaults.baseURL = "/apiStudy/";
	var d = "/api/study";
	e.a = {
		getmycourses: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(d + "/my/courses", e)
		},
		studyStart: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(d + "/start", e)
		},
		studyProgress: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(d + "/progress", e)
		},
		studyProgress2: function(t, e) {
			return u("/gwapi/us/api/study/progress2", i()({},
			t), e)
		},
		studyEnd: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(d + "/v2/end", e)
		},
		studyTimesNew: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(d + "/times/new", e)
		},
		studyRecord: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(d + "/v2/record", e)
		},
		getExam: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/myExam/web/getExam", e)
		},
		submitExam: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/myExam/web/v2/submitExam", e)
		},
		getMyExamList: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/myExam/web/getMyTestByHashNew", e)
		},
		getHonorBook: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/certificate/queryByUser", e)
		},
		getFinallistExam: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/final/listExam", e)
		},
		getFinalgetExam: function(t) {
			return Object(r.a)("/api/exam/final/getExam/" + t)
		},
		saveFinal: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/final/save", e)
		},
		startRecord: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/final/startRecord", e)
		},
		getFormallistExam: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/consolidate/formal/listExam", e)
		},
		getFormalgetExam: function(t) {
			return Object(r.a)("/api/exam/consolidate/formal/getExam/" + t)
		},
		startFormalRecord: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/consolidate/formal/startRecord", e)
		},
		saveFormalFinal: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/consolidate/formal/save", e)
		},
		getInterestlistExam: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/interest/listExam", e)
		},
		getInterestgetExam: function(t) {
			return Object(r.a)("/api/exam/interest/getExam/" + t)
		},
		startInterestSave: function(t) {
			var e = i()({},
			t);
			return Object(r.b)("/api/exam/interest/save", e)
		}
	}
},
"YJl1": function(t, e, s) {
	"use strict";
	var a = s("JXzA");
	s.n(a).a
},
"a97X": function(t, e, s) {
	"use strict";
	var a = s("RuAA");
	s.n(a).a
},
"bN1i": function(t, e, s) {
	"use strict";
	var a = s("P2sY"),
	i = s.n(a),
	r = s("DG18"),
	n = "/api/portal/";
	e.a = {
		queryProjrctList: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "tbtp/queryTbtpList", e)
		},
		queryOrgList: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "tbtp/queryOrgList", e)
		},
		queryProjectGet: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "tbtp/get", e)
		},
		getClassStaff: function(t) {
			return Object(r.b)("/api/portal/message/queryList", t)
		},
		queryClassNoticeList: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "message/queryClassNotice", e)
		},
		queryIsCompulsoryList: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "course/getPageByCategory", e)
		},
		enrollmentSave: function(t) {
			return i()({},
			t),
			Object(r.b)("/api/tbtpenrollment/web/save", t)
		},
		queryTbtpMenmber: function(t) {
			return i()({},
			t),
			Object(r.b)("/api/tbtpenrollment/web/queryTbtpMenmber", t)
		},
		queryTotalTimes: function(t) {
			return i()({},
			t),
			Object(r.b)("/api/study/times/tbtp", t)
		},
		queryCoursesList: function(t) {
			return i()({},
			t),
			Object(r.b)("/api/study/my/courses", t)
		},
		queryCertificate: function(t) {
			return i()({},
			t),
			Object(r.b)("/api/certificate/queryByUser", t)
		},
		ztbSignUp: function(t) {
			return Object(r.b)("/api/tbtpenrollment/web/save", t)
		},
		queryUserOrg: function(t) {
			return Object(r.b)("/api/getTrainee", t)
		},
		getTbtpData: function(t) {
			return Object(r.b)("/api/study/times/v2/tbtp", t)
		},
		querySignCode: function(t) {
			return Object(r.b)("/api/tbtp/web/verifyCode", t)
		},
		getPageByCategory: function(t) {
			return Object(r.b)("/api/portal/course/v2/getPageByCategory", t)
		},
		getPageByCategoryV2: function(t) {
			return Object(r.b)("/api/portal/course/getPageByCategoryV2", t)
		},
		getQueryUserJob: function(t) {
			return Object(r.b)("/api/tbtp/jobUser/web/queryUserJob", t)
		},
		jobUserSave: function(t) {
			return Object(r.b)("/api/tbtp/jobUser/web/save", t)
		},
		getExam: function(t) {
			return Object(r.b)("/api/tbtp/exam/getExam", t)
		},
		openGetExam: function(t) {
			return Object(r.a)("/api/tbtp/exam/getExamByTbtpId/" + t.tbtpId)
		},
		getExamPaper: function(t) {
			return Object(r.b)("/api/tbtp/exam/getPaper", t)
		},
		examSave: function(t) {
			return Object(r.b)("/api/tbtp/exam/save", t)
		},
		establishClassGroup: function(t) {
			return Object(r.b)("/api/im/create", t)
		},
		beforeExam: function(t) {
			return Object(r.b)("/api/tbtp/exam/beforeExam", t)
		},
		disbandExam: function(t) {
			return Object(r.b)("/api/im/disband", t)
		},
		getIMtoken: function(t) {
			return Object(r.b)("/api/im/getToken", t)
		},
		getMyExam: function(t) {
			return Object(r.b)("/api/tbtp/exam/getMyExam", t)
		}
	}
},
"bZfp": function(t, e, s) {
	"use strict";
	var a = s("8Owp");
	s.n(a).a
},
"dP1n": function(t, e, s) {
	"use strict";
	s.r(e);
	var a = s("gDS+"),
	i = s.n(a),
	r = s("QbLZ"),
	n = s.n(r),
	o = s("L2JU"),
	c = s("f33F"),
	l = (s("vAjT"), s("SRhJ")),
	u = s("7Qib"),
	d = (s("DG18"), s("0ERz")),
	p = s.n(d),
	v = s("gTh6"),
	g = {
		data: function() {
			return {
				pageNum: Number(sessionStorage.getItem("listPageNum")) || 0,
				courseList: [],
				page: {}
			}
		},
		computed: n()({},
		Object(o.b)(["userInfo"]), {
			noLeftClick: function() {
				return this.pageNum <= 0
			},
			noRightClick: function() {
				return this.page.totalelements / 5 - 1 <= this.pageNum
			}
		}),
		mounted: function() {
			this.getCourseList()
		},
		beforeDestroy: function() {
			sessionStorage.removeItem("listPageNum")
		},
		methods: {
			getCourseList: function() {
				var t = this;
				Object(v.a)({
					subjectId: this.$route.query.courseListId,
					pagesize: 5,
					pagenum: this.pageNum,
					idCardHash: this.userInfo.idCardHash
				}).then(function(e) {
					t.page = e.data,
					t.courseList = e.data.datalist
				})
			},
			handleSwitch: function(t) {
				"left" === t ? (this.pageNum--, this.pageNum <= 0 && (this.pageNum = 0)) : (this.pageNum++, this.page.totalelements / 5 - 1 <= this.pageNum && this.pageNum),
				sessionStorage.setItem("listPageNum", this.pageNum),
				this.getCourseList()
			},
			handlePlay: function(t) {
				this.$router.push({
					name: "coursedetail",
					query: {
						courseId: t.id,
						courseListId: this.$route.query.courseListId,
						flag: "zt"
					}
				}),
				location.reload()
			}
		}
	},
	m = (s("YJl1"), s("KHd+")),
	h = Object(m.a)(g,
	function() {
		var t = this,
		e = t.$createElement,
		a = t._self._c || e;
		return 0 != t.page.datalist ? a("div", {
			staticClass: "ztCourceList-wrap"
		},
		[a("div", {
			staticClass: "title-warp"
		},
		[t._v("播放列表")]), t._v(" "), a("div", {
			staticClass: "left-right"
		},
		[a("div", {
			staticClass: "left"
		},
		[a("el-button", {
			attrs: {
				disabled: t.noLeftClick,
				type: "info"
			},
			on: {
				click: function(e) {
					t.handleSwitch("left")
				}
			}
		},
		[a("i", {
			staticClass: "el-icon-arrow-left el-icon--left"
		})])], 1), t._v(" "), a("div", {
			staticClass: "course-list-warp"
		},
		t._l(t.page.datalist,
		function(e, i) {
			return a("div", {
				key: i,
				staticClass: "course-list-item",
				on: {
					click: function(s) {
						t.handlePlay(e)
					}
				}
			},
			[a("div", {
				staticClass: "img"
			},
			["ARTICLE" === e.resourceType ? a("lt-img", {
				attrs: {
					src: e.courseCover,
					"default-img": "twkcnull",
					alt: ""
				}
			}) : a("lt-img", {
				attrs: {
					src: e.courseCover,
					alt: ""
				}
			}), t._v(" "), a("div", {
				class: [e.id == t.$route.query.courseId ? "suspended": "play"]
			},
			[a("img", {
				attrs: {
					src: s("2Aw9"),
					alt: ""
				}
			})]), t._v(" "), "VIDEO" == e.resourceType ? a("div", {
				staticClass: "play-num-wrap"
			},
			[a("img", {
				attrs: {
					src: s("Y2GY"),
					alt: ""
				}
			}), t._v(" "), a("span", [t._v(t._s(e.courseVisitor || 0) + "次")])]) : t._e()], 1), t._v(" "), a("div", {
				staticClass: "info"
			},
			[a("div", {
				staticClass: "title-warp"
			},
			[a("div", {
				staticClass: "top-title"
			},
			[t._v(t._s(e.name))]), t._v(" "), a("span", {
				staticClass: "state-paused",
				on: {
					click: function(s) {
						t.getdetailStaty(e)
					}
				}
			},
			[t._v(t._s(e.showStatusMsg || "未学习"))])]), t._v(" "), a("p", {
				staticClass: "user",
				staticStyle: {
					display: "flex"
				}
			},
			[a("span", {
				staticClass: "teacher",
				attrs: {
					title: t.$emptyHandle(e.teacher)
				}
			},
			[t._v("授课教师：" + t._s(t.$emptyHandle(e.teacher)))]), "VIDEO" == e.resourceType ? a("span", [t._v("评分：" + t._s(e.score || 0))]) : t._e()]), t._v(" "), a("el-row", {
				staticClass: "study"
			},
			["ARTICLE" != e.resourceType ? a("el-col", {
				attrs: {
					span: 16
				}
			},
			[t._v("时长："), a("span", {
				staticClass: "study-min"
			},
			[t._v(t._s(e.showCourseDuration || "0"))])]) : t._e(), t._v(" "), a("el-col", {
				attrs: {
					span: 8
				}
			},
			[t._v("学时："), a("span", {
				staticClass: "study-time"
			},
			[t._v(t._s(e.creditHour || 0))])])], 1)], 1)])
		})), t._v(" "), a("div", {
			staticClass: "right"
		},
		[a("el-button", {
			attrs: {
				disabled: t.noRightClick,
				type: "info"
			},
			on: {
				click: function(e) {
					t.handleSwitch("right")
				}
			}
		},
		[a("i", {
			staticClass: "el-icon-arrow-right el-icon--right"
		})])], 1)])]) : t._e()
	},
	[], !1, null, null, null);
	h.options.__file = "ztCourseList.vue";
	var b = h.exports,
	f = s("bN1i"),
	y = {
		data: function() {
			return {
				pageNum: Number(sessionStorage.getItem("listPageNum")) || 0,
				courseList: [],
				page: {}
			}
		},
		computed: n()({},
		Object(o.b)(["userInfo"]), {
			noLeftClick: function() {
				return this.pageNum <= 0
			},
			noRightClick: function() {
				return this.page.totalelements / 5 - 1 <= this.pageNum
			}
		}),
		mounted: function() {
			this.getCourseList()
		},
		beforeDestroy: function() {
			sessionStorage.removeItem("listPageNum")
		},
		methods: {
			getCourseList: function() {
				var t = this;
				f.a.queryIsCompulsoryList({
					pagesize: 5,
					pagenum: this.pageNum,
					tbtpId: this.$route.query.courseListId,
					idCardHash: this.userInfo.idCardHash
				}).then(function(e) {
					t.page = e.data
				})
			},
			handleSwitch: function(t) {
				"left" === t ? (this.pageNum--, this.pageNum <= 0 && (this.pageNum = 0)) : (this.pageNum++, this.page.totalelements / 5 - 1 <= this.pageNum && this.pageNum),
				sessionStorage.setItem("listPageNum", this.pageNum),
				this.getCourseList()
			},
			handlePlay: function(t) {
				this.$router.push({
					name: "coursedetail",
					query: {
						courseId: t.id,
						courseListId: this.$route.query.courseListId,
						flag: "bj",
						compulsory: this.$route.query.compulsory
					}
				}),
				location.reload()
			}
		}
	},
	_ = (s("a97X"), Object(m.a)(y,
	function() {
		var t = this,
		e = t.$createElement,
		a = t._self._c || e;
		return 0 != t.page.datalist ? a("div", {
			staticClass: "bjCourceList-wrap"
		},
		[a("div", {
			staticClass: "title-warp"
		},
		[t._v("播放列表")]), t._v(" "), a("div", {
			staticClass: "left-right"
		},
		[a("div", {
			staticClass: "left"
		},
		[a("el-button", {
			attrs: {
				disabled: t.noLeftClick,
				type: "info"
			},
			on: {
				click: function(e) {
					t.handleSwitch("left")
				}
			}
		},
		[a("i", {
			staticClass: "el-icon-arrow-left el-icon--left"
		})])], 1), t._v(" "), a("div", {
			staticClass: "course-list-warp"
		},
		t._l(t.page.datalist,
		function(e, i) {
			return a("div", {
				key: i,
				staticClass: "course-list-item",
				on: {
					click: function(s) {
						t.handlePlay(e)
					}
				}
			},
			[a("div", {
				staticClass: "img"
			},
			["ARTICLE" === e.resourceType ? a("lt-img", {
				attrs: {
					src: e.courseCover,
					"default-img": "twkcnull",
					alt: ""
				}
			}) : a("lt-img", {
				attrs: {
					src: e.courseCover,
					alt: ""
				}
			}), t._v(" "), a("div", {
				class: [e.id == t.$route.query.courseId ? "suspended": "play"]
			},
			[a("img", {
				attrs: {
					src: s("2Aw9"),
					alt: ""
				}
			})]), t._v(" "), "VIDEO" == e.resourceType ? a("div", {
				staticClass: "play-num-wrap"
			},
			[a("img", {
				attrs: {
					src: s("Y2GY"),
					alt: ""
				}
			}), t._v(" "), a("span", [t._v(t._s(e.courseVisitor || 0) + "次")])]) : t._e()], 1), t._v(" "), a("div", {
				staticClass: "info"
			},
			[a("div", {
				staticClass: "title-warp"
			},
			[a("div", {
				staticClass: "top-title"
			},
			[t._v(t._s(e.name))]), t._v(" "), a("span", {
				staticClass: "state-paused",
				on: {
					click: function(s) {
						t.getdetailStaty(e)
					}
				}
			},
			[t._v(t._s(e.showStatusMsg || "未学习"))])]), t._v(" "), a("p", {
				staticClass: "user",
				staticStyle: {
					display: "flex"
				}
			},
			[a("span", {
				staticClass: "teacher",
				attrs: {
					title: t.$emptyHandle(e.teacher)
				}
			},
			[t._v("授课教师：" + t._s(t.$emptyHandle(e.teacher)))]), "VIDEO" == e.resourceType ? a("span", [t._v("评分：" + t._s(e.score || 0))]) : t._e()]), t._v(" "), a("el-row", {
				staticClass: "study"
			},
			["ARTICLE" != e.resourceType ? a("el-col", {
				attrs: {
					span: 16
				}
			},
			[t._v("时长："), a("span", {
				staticClass: "study-min"
			},
			[t._v(t._s(e.showCourseDuration || "0"))])]) : t._e(), t._v(" "), a("el-col", {
				attrs: {
					span: 8
				}
			},
			[t._v("学时："), a("span", {
				staticClass: "study-time"
			},
			[t._v(t._s(e.creditHour || 0))])])], 1)], 1)])
		})), t._v(" "), a("div", {
			staticClass: "right"
		},
		[a("el-button", {
			attrs: {
				disabled: t.noRightClick,
				type: "info"
			},
			on: {
				click: function(e) {
					t.handleSwitch("right")
				}
			}
		},
		[a("i", {
			staticClass: "el-icon-arrow-right el-icon--right"
		})])], 1)])]) : t._e()
	},
	[], !1, null, null, null));
	_.options.__file = "bjCourseList.vue";
	var C = _.exports,
	w = {
		data: function() {
			return {
				pageNum: 0,
				page: {},
				loading: !0
			}
		},
		mounted: function() {
			this.getCourseList()
		},
		methods: {
			handlePlay: function(t) {
				this.$router.push({
					name: "coursedetail",
					query: {
						courseId: t.id,
						flag: "kc"
					}
				}),
				location.reload()
			},
			getCourseList: function() {
				var t = this;
				this.loading = !0,
				c.a.getCoursesByKeyword({
					courseId: this.$route.query.courseId,
					pagenum: this.pageNum,
					pagesize: 5
				}).then(function(e) {
					t.loading = !1,
					t.$set(t, "page", e.data)
				})
			},
			handleReplace: function() {
				this.pageNum++,
				this.pageNum > 3 && (this.pageNum = 0),
				this.getCourseList()
			}
		}
	},
	S = (s("poEU"), Object(m.a)(w,
	function() {
		var t = this,
		e = t.$createElement,
		a = t._self._c || e;
		return 0 != t.page.datalist ? a("div", {
			staticClass: "kcCourceList-wrap"
		},
		[a("div", {
			staticClass: "title-warp"
		},
		[a("span", [t._v("课程推荐")]), t._v(" "), a("span", {
			on: {
				click: t.handleReplace
			}
		},
		[a("img", {
			attrs: {
				src: s("Bgxx"),
				alt: ""
			}
		}), t._v("\n            换一换\n        ")])]), t._v(" "), a("div", {
			directives: [{
				name: "loading",
				rawName: "v-loading",
				value: t.loading,
				expression: "loading"
			}],
			staticClass: "course-list-warp"
		},
		t._l(t.page.datalist,
		function(e, i) {
			return a("div", {
				key: i,
				staticClass: "course-list-item",
				on: {
					click: function(s) {
						t.handlePlay(e)
					}
				}
			},
			[a("div", {
				staticClass: "img"
			},
			["ARTICLE" === e.resourceType ? a("lt-img", {
				attrs: {
					src: e.courseCover,
					"default-img": "twkcnull",
					alt: ""
				}
			}) : a("lt-img", {
				attrs: {
					src: e.courseCover,
					alt: ""
				}
			}), t._v(" "), a("div", {
				class: [e.id == t.$route.query.courseId ? "suspended": "play"]
			},
			[a("img", {
				attrs: {
					src: s("2Aw9"),
					alt: ""
				}
			})]), t._v(" "), "VIDEO" == e.resourceType ? a("div", {
				staticClass: "play-num-wrap"
			},
			[a("img", {
				attrs: {
					src: s("Y2GY"),
					alt: ""
				}
			}), t._v(" "), a("span", [t._v(t._s(e.courseVisitor || 0) + "次")])]) : t._e()], 1), t._v(" "), a("div", {
				staticClass: "info"
			},
			[a("div", {
				staticClass: "title-warp"
			},
			[a("div", {
				staticClass: "top-title"
			},
			[t._v(t._s(e.name))]), t._v(" "), a("span", {
				staticClass: "state-paused",
				on: {
					click: function(s) {
						t.getdetailStaty(e)
					}
				}
			},
			[t._v(t._s(e.showStatusMsg || "未学习"))])]), t._v(" "), a("p", {
				staticClass: "user",
				staticStyle: {
					display: "flex"
				}
			},
			[a("span", {
				staticClass: "teacher",
				attrs: {
					title: t.$emptyHandle(e.teacher)
				}
			},
			[t._v("授课教师：" + t._s(t.$emptyHandle(e.teacher)))]), "VIDEO" == e.resourceType ? a("span", [t._v("评分：" + t._s(e.score || 0))]) : t._e()]), t._v(" "), a("el-row", {
				staticClass: "study"
			},
			["ARTICLE" != e.resourceType ? a("el-col", {
				attrs: {
					span: 15
				}
			},
			[t._v("时长："), a("span", {
				staticClass: "study-min"
			},
			[t._v(t._s(e.showCourseDuration || "0"))])]) : t._e(), t._v(" "), a("el-col", {
				attrs: {
					span: 8
				}
			},
			[t._v("学时："), a("span", {
				staticClass: "study-time"
			},
			[t._v(t._s(e.creditHour || 0))])])], 1)], 1)])
		}))]) : t._e()
	},
	[], !1, null, null, null));
	S.options.__file = "kcCourseList.vue";
	var x = S.exports,
	P = {
		components: {
			VideoPlayer: l.a,
			zt: b,
			bj: C,
			kc: x
		},
		data: function() {
			return {
				defaultimg1: s("5J0s"),
				loading: !0,
				subcourse: {},
				currentClass: {},
				searchForm: {
					publishMonth: this.$route.params.publishMonth
				},
				subCourseLists: {
					datalist: [],
					pagenum: this.$route.params.pagenum,
					totalelements: 0,
					pagesize: 12
				},
				dzStatus: !0,
				scStatus: !0,
				num: 1002,
				value: 3.7,
				kcmyNum: 0,
				lsmyNum: 0,
				wtmyNum: 0,
				shNum: 0,
				scoreArr: [{
					name: "rattingType0",
					score: 0
				},
				{
					name: "rattingType1",
					score: 0
				},
				{
					name: "rattingType2",
					score: 0
				},
				{
					name: "rattingType3",
					score: 0
				},
				{
					name: "rattingType4",
					score: 0
				}],
				allScoreArr: [{
					name: "rattingType0",
					score: 0
				},
				{
					name: "rattingType1",
					score: 0
				},
				{
					name: "rattingType2",
					score: 0
				},
				{
					name: "rattingType3",
					score: 0
				},
				{
					name: "rattingType4",
					score: 0
				}],
				allScore: {
					average: 0,
					num: 0
				},
				dialogVisible: !1,
				codeimg: "https://www.cnblogs.com/linjiangxian/p/11457576.html",
				tabDetail: {},
				formDate: {
					tabName: ""
				},
				marginTopbytype: "",
				hightBytype: "",
				paddingBytype: "",
				disabledFalse: !1,
				lineHeight: ""
			}
		},
		watch: {},
		computed: n()({},
		Object(o.b)(["userInfo"]), {
			currentFlag: function() {
				return this.$route.query.flag || "zt"
			}
		}),
		created: function() {
			var t = this,
			e = {};
			e.courseId = this.$route.query.courseId,
			e.idCardHash = this.userInfo.idCardHash,
			c.a.getListDeatil(e).then(function(e) {
				t.tabDetail = e.data.data,
				t.tabDetail.name && (console.log(t.tabDetail.name.length), t.tabDetail.name.length > 15 ? (t.lineHeight = "30px", console.log(t.lineHeight)) : t.lineHeight = "35px", console.log(t.tabDetail.name)),
				t.tabDetail.isZan ? t.dzStatus = !1 : t.dzStatus = !0,
				t.tabDetail.isFine ? t.dzStatus = !1 : t.dzStatus = !0,
				"1" == t.tabDetail.assessementType && (t.marginTopbytype = "70px", t.hightBytype = "calc(480px - 60px)", t.paddingBytype = "25px 0px")
			}),
			c.a.getAllCommentScore({
				courseId: this.$route.query.courseId
			}).then(function(e) {
				e.data && e.data.data && e.data.data.ratings && e.data.data.ratings.length > 0 && (t.allScoreArr.forEach(function(t, s) {
					return t.score = Number(e.data.data.ratings[s])
				}), t.allScore = {
					average: e.data.data.average,
					num: e.data.data.num
				})
			}),
			c.a.getCommentScore(e).then(function(e) {
				e.data && e.data.data && e.data.data.ratings && e.data.data.ratings.length > 0 && (e.data.data.ratings.forEach(function(t) {
					return t.score = Number(t.score) / 2
				}), t.scoreArr = e.data.data.ratings, t.disabledFalse = !0)
			})
		},
		mounted: function() {
			this.subcourse.id = this.$route.query.id || "",
			this.currentClass = JSON.parse(sessionStorage.getItem("currentClass"))
		},
		methods: {
			formatName: function(t) {
				return t.substring(0, t.lastIndexOf("."))
			},
			openPdf: function(t) {
				window.open(t.attaPath)
			},
			goIndex: function() {
				window.location.href = "/index"
			},
			goClass: function() {
				this.$router.push({
					name: "commendIndex"
				})
			},
			videoEnd: function() {
				"0" == this.tabDetail.assessementType && this.tomyExam()
			},
			parseVideoSrc: function(t) {
				if (t) return "http://v.dtdjzx.gov.cn/dyjy/video/" + t
			},
			parseImgSrc: function(t) {
				return "http://s.dtdjzx.gov.cn/dyjy/img1024/video-img/" + t
			},
			parseDate: function(t) {
				return Object(u.c)(t)
			},
			handelMainCourseListClick: function(t) {
				var e = this,
				s = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
				return t.id !== this.subcourse.id && (this.$refs.videoPlayer.isStart && !this.$refs.videoPlayer.hasPlay ? (this.$message({
					showClose: !0,
					message: "当前视频正在播放，不能切换！",
					type: "warning"
				}), !1) : (this.subcourse = t, sessionStorage.setItem("subcourseId", t.id), this.subcourse.resourcePath = t.resourcePath.indexOf("//") > -1 ? t.resourcePath: this.parseVideoSrc(t.resourcePath), this.subcourse.courseCover = t.courseCover.indexOf("//") > -1 ? t.courseCover: this.defaultimg1, void(s && setTimeout(function() {
					e.$refs.videoPlayer.videoPlay()
				},
				300))))
			},
			tomyExam: function() {
				var t = this.tabDetail.assessementId || "";
				this.$router.push({
					name: "startExam",
					query: {
						examId: t,
						courseId: this.$route.query.courseId,
						studyStatus: this.tabDetail.studyStatus,
						examStatus: this.tabDetail.examStatus,
						recordStatus: this.tabDetail.recordStatus
					}
				})
			},
			clickSc: function() {
				var t = this,
				e = {};
				e.userHash = this.userInfo.idCardHash,
				e.courseId = this.$route.query.courseId,
				e.type = "collect",
				c.a.toggleCollect(e).then(function(e) {
					t.tabDetail.isCollected = !t.tabDetail.isCollected
				})
			},
			clickDz: function() {
				var t = this,
				e = {};
				e.userHash = this.userInfo.idCardHash,
				e.courseId = this.$route.query.courseId,
				e.type = "zan",
				c.a.toggleCollect(e).then(function(e) {
					t.tabDetail.zanNum = e.data.data.count,
					t.tabDetail.isZan = e.data.data.typeStatus
				})
			},
			clickFx: function() {
				this.dialogVisible = !0,
				this.$nextTick(function() {
					this.qrcode()
				})
			},
			qrcode: function() {
				var t = window.location.href.match(/(\S*)#/)[1];
				new p.a("qrcode", {
					width: 150,
					height: 150,
					text: t + "#/contentShare?id=" + this.$route.query.courseId
				})
			},
			sumbitRate: function() {
				var t = this;
				if (this.scoreArr[0].score && this.scoreArr[1].score && this.scoreArr[2].score && this.scoreArr[3].score && this.scoreArr[4].score) {
					var e = {};
					e.idCardHash = this.userInfo.idCardHash,
					e.courseId = this.$route.query.courseId,
					e.ratings = JSON.parse(i()(this.scoreArr)),
					e.ratings.forEach(function(t) {
						return t.score = 2 * Number(t.score)
					}),
					c.a.saveComment(e).then(function(e) {
						e.data.success ? (t.disabledFalse = !0, t.$message({
							type: "success",
							message: "提交成功"
						})) : t.$message({
							type: "warning",
							message: e.data.message
						})
					})
				} else this.$message({
					type: "warning",
					message: "请选择评价得分"
				})
			}
		}
	},
	j = (s("9/Il"), Object(m.a)(P,
	function() {
		var t = this,
		e = t.$createElement,
		a = t._self._c || e;
		return a("div", {
			staticClass: "course-detail-warp"
		},
		[[a("div", {
			staticStyle: {
				width: "100%",
				height: "45px",
				float: "left",
				"margin-top": "5px"
			}
		},
		[a("span", {
			staticStyle: {
				float: "left"
			}
		},
		[a("span", {
			staticStyle: {
				float: "left",
				"margin-left": "10px"
			}
		},
		[a("el-breadcrumb", {
			attrs: {
				separator: "/"
			}
		},
		[a("i", {
			staticClass: "el-icon-s-operation",
			staticStyle: {
				float: "left",
				"font-size": "14px",
				color: "#999",
				"margin-top": "13px",
				"margin-right": "5px"
			}
		}), t._v(" "), a("el-breadcrumb-item", [a("span", {
			staticClass: "gbwlxu",
			on: {
				click: t.goIndex
			}
		},
		[t._v("山东干部网络学院首页")])]), t._v(" "), a("el-breadcrumb-item", [a("span", {
			staticClass: "tabtitletj",
			on: {
				click: t.goClass
			}
		},
		[t._v("课程列表")])]), t._v(" "), a("el-breadcrumb-item", [a("span", {
			staticClass: "tabtitle"
		},
		[t._v("课程详情")])])], 1)], 1)])]), t._v(" "), a("div", {
			staticStyle: {
				float: "left",
				width: "100%"
			}
		},
		[a("el-row", {
			staticClass: "MainVideo",
			attrs: {
				gutter: 20
			}
		},
		[a("el-col", {
			attrs: {
				span: 24
			}
		},
		[a("div", {
			staticClass: "path",
			attrs: {
				title: t.tabDetail.name
			}
		},
		[t._v(t._s(t.tabDetail.name || "暂无标题"))])]), t._v(" "), a("div", {
			staticClass: "videoPlay"
		},
		[t.tabDetail.resourcePath ? a("video-player", {
			ref: "videoPlayer",
			staticClass: "videoplayer",
			attrs: {
				videosrc: t.tabDetail.resourcePath ? t.subcourse.resourcePath: "",
				screenshotPath: t.tabDetail.courseCover,
				videoPlayCourse: t.tabDetail,
				courseType: "1"
			},
			on: {
				videoEnd: t.videoEnd
			}
		}) : a("div", {
			staticClass: "videoplayer"
		})], 1), t._v(" "), a("div", {
			staticClass: "top-right-warp"
		},
		[a("div", {
			staticClass: "title-list"
		},
		[a("div", {
			staticStyle: {
				"min-height": "260px"
			}
		},
		[a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("课程名称：")]), t._v(" "), a("div", {
			staticClass: "titleContent",
			attrs: {
				title: t.tabDetail.name
			}
		},
		[t._v(t._s(t.$emptyHandle(t.tabDetail.name)))])]), t._v(" "), a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("授课教师：")]), t._v(" "), a("div", {
			staticClass: "titleContent",
			attrs: {
				title: t.tabDetail.teacher
			}
		},
		[t._v(t._s(t.$emptyHandle(t.tabDetail.teacher)))])]), t._v(" "), a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("发布时间：")]), t._v(" "), a("div", {
			staticClass: "titleContent",
			attrs: {
				title: t.tabDetail.publishDate ? t.tabDetail.publishDate.substring(0, 10) : ""
			}
		},
		[t._v(t._s(t.tabDetail.publishDate ? t.tabDetail.publishDate.substring(0, 10) : ""))])]), t._v(" "), a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("课件时长：")]), t._v(" "), a("div", {
			staticClass: "titleContent",
			attrs: {
				title: t.tabDetail.showCourseDuration
			}
		},
		[t._v(t._s(t.tabDetail.showCourseDuration || 0))])]), t._v(" "), a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("学      时：")]), t._v(" "), a("div", {
			staticClass: "titleContent",
			attrs: {
				title: t.tabDetail.creditHour
			}
		},
		[t._v(t._s(t.tabDetail.creditHour || 0) + "学时")])]), t._v(" "), a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("播放次数：")]), t._v(" "), a("div", {
			staticClass: "titleContent",
			attrs: {
				title: t.tabDetail.courseVisitor
			}
		},
		[t._v(t._s(t.tabDetail.courseVisitor || 0) + "次")])]), t._v(" "), a("div", {
			staticClass: "list-warp",
			style: {
				lineHeight: this.lineHeight
			}
		},
		[a("div", {
			staticClass: "titleName"
		},
		[t._v("随堂测试：")]), t._v(" "), a("div", {
			staticClass: "titleContent"
		},
		["0" == t.tabDetail.assessementType ? a("span", [t._v("\n                是\n              ")]) : t._e(), t._v(" "), "1" == t.tabDetail.assessementType ? a("span", [t._v("\n                否\n              ")]) : t._e()])])]), t._v(" "), a("div", {
			staticClass: "dz-list-warp"
		},
		[a("el-row", {
			attrs: {
				gutter: 20
			}
		},
		[a("el-col", {
			attrs: {
				span: 8
			}
		},
		[a("div", {
			staticClass: "grid-content bg-purple",
			style: {
				padding: this.paddingBytype
			}
		},
		[a("img", {
			directives: [{
				name: "show",
				rawName: "v-show",
				value: !t.tabDetail.isCollected,
				expression: "!tabDetail.isCollected"
			}],
			staticClass: "iconStyle",
			attrs: {
				src: s("wyHe")
			},
			on: {
				click: t.clickSc
			}
		}), t._v(" "), a("img", {
			directives: [{
				name: "show",
				rawName: "v-show",
				value: t.tabDetail.isCollected,
				expression: "tabDetail.isCollected"
			}],
			staticClass: "iconStyle",
			attrs: {
				src: s("Ui7f")
			},
			on: {
				click: t.clickSc
			}
		}), t._v(" "), a("p", {
			staticClass: "fontStyle"
		},
		[t._v(t._s(t.tabDetail.isCollected ? "已收藏": "未收藏"))])])]), t._v(" "), a("el-col", {
			attrs: {
				span: 8
			}
		},
		[a("div", {
			staticClass: "grid-content bg-purple",
			style: {
				padding: this.paddingBytype
			}
		},
		[a("img", {
			directives: [{
				name: "show",
				rawName: "v-show",
				value: !t.tabDetail.isZan,
				expression: "!tabDetail.isZan"
			}],
			staticClass: "iconStyle",
			attrs: {
				src: s("8Duy")
			},
			on: {
				click: t.clickDz
			}
		}), t._v(" "), a("img", {
			directives: [{
				name: "show",
				rawName: "v-show",
				value: t.tabDetail.isZan,
				expression: "tabDetail.isZan"
			}],
			staticClass: "iconStyle",
			attrs: {
				src: s("OMrv")
			},
			on: {
				click: t.clickDz
			}
		}), t._v(" "), a("p", {
			staticClass: "fontStyle",
			staticStyle: {
				"max-width": "120px",
				"white-space": "nowrap"
			}
		},
		[t._v(t._s(t.tabDetail.isZan ? "已点赞(": "去点赞(") + t._s( + t.tabDetail.zanNum || 0) + ")")])])]), t._v(" "), a("el-col", {
			attrs: {
				span: 8
			}
		},
		[a("div", {
			staticClass: "grid-content bg-purple",
			style: {
				padding: this.paddingBytype
			}
		},
		[a("img", {
			staticClass: "iconStyle",
			attrs: {
				src: s("fdKd")
			},
			on: {
				click: t.clickFx
			}
		}), t._v(" "), a("p", {
			staticClass: "fontStyle"
		},
		[t._v("分享")])])])], 1)], 1)]), t._v(" "), "0" == t.tabDetail.assessementType ? a("img", {
			staticClass: "rightBottom",
			attrs: {
				src: s("bbMc")
			},
			on: {
				click: t.tomyExam
			}
		}) : t._e()])], 1), t._v(" "), a("div", {
			staticClass: "bottom-list-warp"
		},
		[a("div", {
			staticClass: "list-warp myEvaluate"
		},
		[a("div", {
			staticClass: "bottom-list-title-warp",
			staticStyle: {
				display: "flex",
				"padding-top": "3px"
			}
		},
		[t._v("所有课程评价"), a("div", {
			staticStyle: {
				color: "#999999"
			}
		},
		[t._v("（已有"), a("span", {
			staticStyle: {
				color: "#333333",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScore.num))]), t._v("人评价，总评分"), a("span", {
			staticStyle: {
				color: "#333333",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScore.average))]), t._v("分）")])]), t._v(" "), a("div", {
			staticClass: "bottom-list-content-warp"
		},
		[a("div", {
			staticClass: "kcpj-wrap"
		},
		[a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("span", [t._v("立场观点正确：")]), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "#E84D4D",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScoreArr[0].score))]), t._v("分\n              ")])]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("span", [t._v("注重问题导向：")]), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "#E84D4D",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScoreArr[1].score))]), t._v("分\n              ")])]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("span", [t._v("内容丰富全面：")]), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "#E84D4D",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScoreArr[2].score))]), t._v("分\n              ")])]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("div", [a("span", [t._v("课程生动形象：")]), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "#E84D4D",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScoreArr[3].score))]), t._v("分\n                ")])])]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("div", [a("span", [t._v("教学切实有效：")]), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "#E84D4D",
				"font-weight": "bolder"
			}
		},
		[t._v(t._s(t.allScoreArr[4].score))]), t._v("分\n                ")])])])])])]), t._v(" "), a("div", {
			staticClass: "list-warp myEvaluate"
		},
		[a("div", {
			staticStyle: {
				display: "flex",
				"align-items": "center",
				"justify-content": "space-between"
			}
		},
		[a("div", {
			staticClass: "bottom-list-title-warp"
		},
		[t._v("我的评价")]), t._v(" "), a("el-button", {
			staticStyle: {
				color: "red",
				"font-weight": "bolder"
			},
			attrs: {
				size: "mini",
				disabled: t.disabledFalse
			},
			on: {
				click: t.sumbitRate
			}
		},
		[t._v(t._s(t.disabledFalse ? "已评价": "提交评价"))])], 1), t._v(" "), a("div", {
			staticClass: "bottom-list-content-warp"
		},
		[a("div", {
			staticClass: "kcpj-wrap"
		},
		[a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("span", [t._v("立场观点正确：")]), t._v(" "), a("el-rate", {
			attrs: {
				"allow-half": "",
				"disabled-void-icon-class": "el-icon-star-off",
				disabled: t.disabledFalse,
				"text-color": "#707070"
			},
			model: {
				value: t.scoreArr[0].score,
				callback: function(e) {
					t.$set(t.scoreArr[0], "score", e)
				},
				expression: "scoreArr[0].score"
			}
		}), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "rgb(112, 112, 112)"
			}
		},
		[t._v(t._s(2 * t.scoreArr[0].score) + "分")])], 1)]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("span", [t._v("注重问题导向：")]), t._v(" "), a("el-rate", {
			attrs: {
				"allow-half": "",
				"disabled-void-icon-class": "el-icon-star-off",
				disabled: t.disabledFalse,
				"text-color": "#707070"
			},
			model: {
				value: t.scoreArr[1].score,
				callback: function(e) {
					t.$set(t.scoreArr[1], "score", e)
				},
				expression: "scoreArr[1].score"
			}
		}), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "rgb(112, 112, 112)"
			}
		},
		[t._v(t._s(2 * t.scoreArr[1].score) + "分")])], 1)]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("span", [t._v("内容丰富全面：")]), t._v(" "), a("el-rate", {
			attrs: {
				"allow-half": "",
				"disabled-void-icon-class": "el-icon-star-off",
				disabled: t.disabledFalse,
				"text-color": "#707070"
			},
			model: {
				value: t.scoreArr[2].score,
				callback: function(e) {
					t.$set(t.scoreArr[2], "score", e)
				},
				expression: "scoreArr[2].score"
			}
		}), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "rgb(112, 112, 112)"
			}
		},
		[t._v(t._s(2 * t.scoreArr[2].score) + "分")])], 1)]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("div", [a("span", [t._v("课程生动形象：")]), t._v(" "), a("el-rate", {
			attrs: {
				"allow-half": "",
				"disabled-void-icon-class": "el-icon-star-off",
				disabled: t.disabledFalse,
				"text-color": "#707070"
			},
			model: {
				value: t.scoreArr[3].score,
				callback: function(e) {
					t.$set(t.scoreArr[3], "score", e)
				},
				expression: "scoreArr[3].score"
			}
		}), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "rgb(112, 112, 112)"
			}
		},
		[t._v(t._s(2 * t.scoreArr[3].score) + "分")])], 1)])]), t._v(" "), a("div", [a("div", {
			staticClass: "grid-content bg-purple"
		},
		[a("div", [a("span", [t._v("教学切实有效：")]), t._v(" "), a("el-rate", {
			attrs: {
				"allow-half": "",
				"disabled-void-icon-class": "el-icon-star-off",
				disabled: t.disabledFalse,
				"text-color": "#707070"
			},
			model: {
				value: t.scoreArr[4].score,
				callback: function(e) {
					t.$set(t.scoreArr[4], "score", e)
				},
				expression: "scoreArr[4].score"
			}
		}), t._v(" "), a("span", {
			staticClass: "el-rate__text",
			staticStyle: {
				color: "rgb(112, 112, 112)"
			}
		},
		[t._v(t._s(2 * t.scoreArr[4].score) + "分")])], 1)])])])])]), t._v(" "), a("div", {
			staticClass: "list-warp"
		},
		[a("div", {
			staticClass: "bottom-list-title-warp"
		},
		[t._v("课程简介")]), t._v(" "), a("div", {
			staticClass: "bottom-list-content-warp"
		},
		[t._v(t._s(t.$emptyHandle(t.tabDetail.introduction)))])]), t._v(" "), a("div", {
			staticClass: "list-warp"
		},
		[a("div", {
			staticClass: "bottom-list-title-warp"
		},
		[t._v("教师简介")]), t._v(" "), t.tabDetail.listTeacherInfo ? t._e() : a("div", {
			staticClass: "bottom-list-content-warp"
		},
		[t._v(t._s(t.$emptyHandle(t.tabDetail.teacherProfile)))]), t._v(" "), t._l(t.tabDetail.listTeacherInfo,
		function(e, s) {
			return a("div", {
				key: s,
				staticClass: "bottom-list-content-warp teater-box"
			},
			[a("div", {
				staticClass: "teater-box-one"
			},
			[a("div", {
				staticClass: "demo-basic--circle"
			},
			[a("div", {
				staticClass: "block"
			},
			[a("img", {
				attrs: {
					src: e.picture,
					alt: "",
					srcset: ""
				}
			})]), t._v(" "), a("div", {
				staticClass: "name-teacher"
			},
			[a("p", [t._v(t._s(e.teacher))]), t._v(" "), a("p", [t._v(t._s(e.teacherPosition))])])]), t._v(" "), a("p", [a("span", [t._v(t._s(t.$emptyHandle(e.teacherProfile)))])])])])
		})], 2), t._v(" "), t.tabDetail.attachmentList ? a("div", {
			staticClass: "list-warp"
		},
		[a("div", {
			staticClass: "bottom-list-title-warp",
			staticStyle: {
				"font-weight": "bold"
			}
		},
		[t._v("课程教材")]), t._v(" "), a("div", {
			staticClass: "bottom-list-content-warp jiaocaiBox"
		},
		t._l(t.tabDetail.attachmentList,
		function(e, i) {
			return a("div", {
				key: i,
				staticClass: "jiaocai",
				on: {
					click: function(s) {
						t.openPdf(e)
					}
				}
			},
			[a("img", {
				attrs: {
					src: s("nwZP")
				}
			}), t._v(" "), a("p", [t._v(t._s(t.formatName(e.attaName)))])])
		}))]) : t._e(), t._v(" "), a(t.currentFlag, {
			tag: "component"
		})], 1)], 1), t._v(" "), a("el-dialog", {
			attrs: {
				title: "分享课程",
				visible: t.dialogVisible,
				width: "30%",
				center: ""
			},
			on: {
				"update:visible": function(e) {
					t.dialogVisible = e
				}
			}
		},
		[a("div", {
			staticClass: "qrcode"
		},
		[a("div", {
			ref: "qrcode",
			staticStyle: {
				magrin: "0 auto"
			},
			attrs: {
				id: "qrcode"
			}
		})]), t._v(" "), a("p", {
			staticClass: "prompt",
			staticStyle: {
				"font-size": "18px !important",
				"line-height": "24px",
				color: "#303133"
			}
		},
		[t._v("使用微信或QQ扫码查看分享")])])]], 2)
	},
	[], !1, null, null, null));
	j.options.__file = "coursedetail.vue";
	e.
default = j.exports
},
"f33F": function(t, e, s) {
	"use strict";
	var a = s("P2sY"),
	i = s.n(a),
	r = s("DG18"),
	n = "/api";
	e.a = {
		queryNewList: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/portal/course/recommend", e)
		},
		getListDeatil: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/course/web/get", e)
		},
		saveComment: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/course/web/comment/save", e)
		},
		toggleCollect: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/portal/collect/toggleCollect", e)
		},
		queryTreeAll: function() {
			return Object(r.a)(n + "/course/web/getCategoryTreeAll")
		},
		queryListByTree: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/portal/course/getPageByCategory", e)
		},
		getCommentScore: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/course/web/comment/get", e)
		},
		getAllCommentScore: function(t) {
			var e = i()({},
			t);
			return Object(r.a)(n + "/course/web/comment/getByCourseId/" + e.courseId)
		},
		getCommentRecord: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/study/v2/record ", e)
		},
		getCoursesByKeyword: function(t) {
			var e = i()({},
			t);
			return Object(r.b)(n + "/course/web/getCoursesByKeyword ", e)
		}
	}
},
"gTh6": function(t, e, s) {
	"use strict";
	s.d(e, "b",
	function() {
		return r
	}),
	s.d(e, "c",
	function() {
		return n
	}),
	s.d(e, "e",
	function() {
		return o
	}),
	s.d(e, "a",
	function() {
		return c
	}),
	s.d(e, "d",
	function() {
		return l
	}),
	s.d(e, "f",
	function() {
		return u
	});
	var a = s("DG18"),
	i = "";
	function r(t) {
		return Object(a.b)(i + "/api/subject/query", t)
	}
	function n(t) {
		return Object(a.b)("/api/subject/get?id=" + t.id, t)
	}
	function o(t) {
		return Object(a.b)("/api/subject/openGet?id=" + t.id, t)
	}
	function c(t) {
		return Object(a.b)(i + "/api/subject/queryCourse", t)
	}
	function l(t) {
		return Object(a.b)(i + "/api/subject/queryCourseV2", t)
	}
	function u(t) {
		return Object(a.b)("/api/subject/openQueryCourse", t)
	}
},
"poEU": function(t, e, s) {
	"use strict";
	var a = s("u4+f");
	s.n(a).a
},
"u4+f": function(t, e, s) {},
"vAjT": function(t, e, s) {
	"use strict";
	var a = s("P2sY"),
	i = s.n(a),
	r = s("4d7F"),
	n = s.n(r),
	o = s("DG18"),
	c = "/api";
	e.a = {
		findByPublishMonth: function(t) {
			return Object(o.b)(c + "/findByPublishMonth?publishMonth=" + t)
		},
		findMainCourseById: function(t) {
			return Object(o.b)(c + "/findCourseById?id=" + t)
		},
		findCourseById: function(t) {
			return Object(o.b)("/subcourse/findCourseById?id=" + t)
		},
		findLive: function() {
			return Object(o.b)("/live/findLive")
		},
		subCoursePage: function(t) {
			var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0,
			s = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 10;
			return (isNaN(e) || Number(e) < 1) && (e = 0),
			Object(o.b)("/subcourse/subCoursePage?pagenum=" + e + "&pagesize=" + s, t).then(function(t) {
				var e = {};
				if (!0 === t.data.success) {
					var s = t.data;
					e.datalist = s.data,
					e.pagenum = Number(s.pagenum) + 1,
					e.totalelements = Number(s.totalelements),
					e.pagesize = Number(s.pagesize)
				}
				return e.success = t.data.success,
				n.a.resolve(e)
			})
		},
		imageTextPage: function(t) {
			var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0,
			s = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 10,
			a = i()({},
			t, {
				pageNo: e,
				pageSize: s
			});
			return (isNaN(a.pageNo) || Number(a.pageNo) < 1) && (a.pageNo = 1),
			Object(o.b)("/resource/imageTextPage", a).then(function(t) {
				var e = {};
				if (!0 === t.data.success) {
					var s = t.data.data;
					e.datalist = s.data,
					e.pagenum = Number(s.pageNo),
					e.totalelements = Number(s.count),
					e.pagesize = Number(s.pageSize)
				}
				return e.success = t.data.success,
				n.a.resolve(e)
			})
		},
		peopleRankPage: function(t) {
			var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0,
			s = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 10;
			return (isNaN(e) || Number(e) < 1) && (e = 0),
			Object(o.b)("/peopleRank/findPage?pagenum=" + e + "&pagesize=" + s, t).then(function(t) {
				var e = {};
				if (!0 === t.data.success) {
					var s = t.data;
					e.datalist = s.data,
					e.pagenum = Number(s.pagenum) + 1,
					e.totalelements = Number(s.totalelements),
					e.pagesize = Number(s.pagesize)
				}
				return e.success = t.data.success,
				n.a.resolve(e)
			})
		},
		branchRankPage: function(t) {
			var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0,
			s = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 10;
			return (isNaN(e) || Number(e) < 1) && (e = 0),
			Object(o.b)("/branchRank/findPage?pagenum=" + e + "&pagesize=" + s, t).then(function(t) {
				var e = {};
				if (!0 === t.data.success) {
					var s = t.data;
					e.datalist = s.data,
					e.pagenum = Number(s.pagenum) + 1,
					e.totalelements = Number(s.totalelements),
					e.pagesize = Number(s.pagesize)
				}
				return e.success = t.data.success,
				n.a.resolve(e)
			})
		},
		findByClass: function() {
			return Object(o.b)(c + "/tbtp/web/queryTbtp", {})
		},
		findCourseware: function(t) {
			var e = i()({
				pagenum: 0,
				pagesize: 10
			},
			t);
			return Object(o.b)(c + "/course/web/query", e)
		},
		getCourseDetail: function(t) {
			var e = i()({},
			t);
			return Object(o.b)(c + "/course/web/get", e)
		},
		applyClass: function(t) {
			var e = i()({},
			t);
			return Object(o.b)("/api/tbtpenrollment/web/save", e)
		},
		checkEnrollment: function(t) {
			var e = i()({},
			t);
			return Object(o.b)("/api/tbtpenrollment/web/checkEnrollment", e)
		},
		getqueryInfoShare: function(t, e) {
			return Object(o.b)("/api/course/web/get", {
				courseId: t,
				tbtpid: e
			})
		},
		getShareCode: function(t) {
			return Object(o.a)("/api/tbtp/web/getqrCode/" + t)
		}
	}
},
"xHg6": function(t, e, s) {
	"use strict";
	s.d(e, "a",
	function() {
		return n
	});
	var a = s("gDS+"),
	i = s.n(a),
	r = s("Q2AE");
	function n(t) {
		var e = this,
		s = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
		a = JSON.parse(sessionStorage.getItem("configure")) || {};
		if ("{}" == i()(a) && r.a.dispatch("GetConfigure").then(function(t) {
			a = t.data
		}), t) {
			if (!t.roleList || !t.roleList.length) return this.$message({
				message: "没有权限访问此系统",
				type: "warning"
			}),
			void this.$router.push({
				name: "public"
			});
			t.roleList.forEach(function(t) {
				if ("ROLE_NC_WEB" != t.roleName && "SPECIAL_COURSES" != t.roleName) throw e.$message({
					message: "没有权限访问此系统",
					type: "warning"
				}),
				Error("没有权限访问此系统!")
			}),
			s && s()
		} else r.a.dispatch("GetInfo").then(function(t) {
			if (t.success) {
				if (!t.data.roleList || !t.data.roleList.length) return e.$message({
					message: "没有权限访问此系统",
					type: "warning"
				}),
				void e.$router.push({
					name: "public"
				});
				t.data.roleList.forEach(function(t) {
					if ("ROLE_NC_WEB" != t.roleName && "SPECIAL_COURSES" != t.roleName) throw e.$message({
						message: "没有权限访问此系统",
						type: "warning"
					}),
					Error("没有权限访问此系统!")
				}),
				s && s()
			} else window.location.href = a.loginUrl ? a.loginUrl: "https://gbwlxy.dtdjzx.gov.cn/oauth2/login/pro"
		},
		function(t) {
			window.location.href = a.loginUrl ? a.loginUrl: "https://gbwlxy.dtdjzx.gov.cn/oauth2/login/pro"
		}).
		catch(function(t) {
			window.location.href = a.loginUrl ? a.loginUrl: "https://gbwlxy.dtdjzx.gov.cn/oauth2/login/pro"
		})
	}
}
}); (typeof fn === "function") && fn(self);
```
