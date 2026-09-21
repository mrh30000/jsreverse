# js逆向某视频VIP

> **作者**: odmin | **发布时间**: 2022-11-02 09:19:00 | **版块**: 『编程语言区』 | **查看/回复**: 6038 / 39
> **原文**: [https://www.52pojie.cn/thread-1706864-1-1.html](https://www.52pojie.cn/thread-1706864-1-1.html)

---

[Asm] *纯文本查看*

```
环境：
python 3.9
nodejs 18.12
```

[Asm] *纯文本查看*

```
开发工具：
pycharm
```

[Asm] *纯文本查看*

```
流程：
1. 过debug
2. 分析
3. 抠代码
4. 解析m3u8
5. 下载
```

[Asm] *纯文本查看*

```
url:
aHR0cHM6Ly9qeC5ib3pyYy5jb206NDQzMy9wbGF5ZXIvP3VybD1odHRwczovL3YucXEuY29tL3gvY292ZXIvbXpjMDAyMDBrcjhuMzFpL3MwMDQ0aTNidTJiLmh0bWw=
```

[JavaScript] *纯文本查看*

```
function _0x3d38b4(_0xaf0521){
		let _0xfe4b29='abcdefghijklmnopqrstuvwxyz9876543210';
		let _0x473192='',_0x2715b9=0,_0x4b86ce=_0xfe4b29.length;
		for(_0x2715b9=0;_0x2715b9<_0xaf0521;_0x2715b9++){
			_0x473192+=_0xfe4b29.charAt(Math.floor(Math.random()*_0x4b86ce));
		}
		return _0x473192;
	}
function _0x46c9ca(_0x56b67e,_0x5523a9){
		return Math.floor(Math.random()*(_0x5523a9+1-_0x56b67e))+_0x56b67e;
	}
function _0x522c25(){
		_keyStr='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		this.encode=function(_0x2a3435){
			var _0x1772d2={'shmAY':function(_0x5bd14e,_0x54153a){
				return _0x5bd14e(_0x54153a);
			}};
			var _0xb3b21c='';
			var _0x271dcd,_0x4de8b7,_0x233f5b,_0x25bca6,_0x3476bf,_0x2548ae,_0x2a5ccd;
			var _0xe359fc=0;
			_0x2a3435=_utf8_encode(_0x2a3435);
			while(_0xe359fc<_0x2a3435.length){
				_0x271dcd=_0x2a3435.charCodeAt(_0xe359fc++);
				_0x4de8b7=_0x2a3435.charCodeAt(_0xe359fc++);
				_0x233f5b=_0x2a3435.charCodeAt(_0xe359fc++);
				_0x25bca6=_0x271dcd>>0x2;
				_0x3476bf=(_0x271dcd&0x3)<<0x4|_0x4de8b7>>0x4;
				_0x2548ae=(_0x4de8b7&0xf)<<0x2|_0x233f5b>>0x6;
				_0x2a5ccd=_0x233f5b&0x3f;
				if(isNaN(_0x4de8b7)){
					_0x2548ae=_0x2a5ccd=64;
				}else if(isNaN(_0x233f5b)){
					_0x2a5ccd=64;
				}
				_0xb3b21c=_0xb3b21c+_keyStr.charAt(_0x25bca6)+_keyStr.charAt(_0x3476bf)+_keyStr.charAt(_0x2548ae)+_keyStr.charAt(_0x2a5ccd);
			}
			return _0xb3b21c;
		};
		this.decode=function(_0xfb19ef){
			var _0x462b86='';
			var _0x15defb,_0x3d585f,_0x50b56d;
			var _0x1659a2,_0x1a932c,_0xee6c97,_0x1b2405;
			var _0x3de4d4=0;
			_0xfb19ef=_0xfb19ef.replace(/[^A-Za-z0-9\+\/\=]/g,'');
			while(_0x3de4d4<_0xfb19ef.length){
				_0x1659a2=_keyStr.indexOf(_0xfb19ef.charAt(_0x3de4d4++));
				_0x1a932c=_keyStr.indexOf(_0xfb19ef.charAt(_0x3de4d4++));
				_0xee6c97=_keyStr.indexOf(_0xfb19ef.charAt(_0x3de4d4++));
				_0x1b2405=_keyStr.indexOf(_0xfb19ef.charAt(_0x3de4d4++));
				_0x15defb=_0x1659a2<<0x2|_0x1a932c>>0x4;
				_0x3d585f=(_0x1a932c&0xf)<<0x4|_0xee6c97>>0x2;
				_0x50b56d=(_0xee6c97&0x3)<<0x6|_0x1b2405;
				_0x462b86=_0x462b86+String.fromCharCode(_0x15defb);
				if(_0xee6c97!=64){
					_0x462b86=_0x462b86+String.fromCharCode(_0x3d585f);
				}
				if(_0x1b2405!=64){
					_0x462b86=_0x462b86+String.fromCharCode(_0x50b56d);
				}
			}
			_0x462b86=_utf8_decode(_0x462b86);
			return _0x462b86;
		};
		_utf8_encode=function(_0x2f4dc5){
			_0x2f4dc5=_0x2f4dc5.replace(/\r\n/g,'\n');
			var _0x58b823='';
			for(var _0x3ab16c=0;_0x3ab16c<_0x2f4dc5.length;_0x3ab16c++){
				var _0xcf99ac=_0x2f4dc5.charCodeAt(_0x3ab16c);
				if(_0xcf99ac<128){
					_0x58b823+=String.fromCharCode(_0xcf99ac);
				}else if(_0xcf99ac>127&&_0xcf99ac<2048){
					_0x58b823+=String.fromCharCode(_0xcf99ac>>0x6|0xc0);
					_0x58b823+=String.fromCharCode(_0xcf99ac&0x3f|0x80);
				}else{
					_0x58b823+=String.fromCharCode(_0xcf99ac>>0xc|0xe0);
					_0x58b823+=String.fromCharCode(_0xcf99ac>>0x6&0x3f|0x80);
					_0x58b823+=String.fromCharCode(_0xcf99ac&0x3f|0x80);
				}
			}
			return _0x58b823;
		};
		_utf8_decode=function(_0x567571){
			var _0x2c22cb='';
			var _0xf0adb0=0;
			var _0x5c70f4=c1=c2=0;
			while(_0xf0adb0<_0x567571.length){
				_0x5c70f4=_0x567571.charCodeAt(_0xf0adb0);
				if(_0x5c70f4<128){
					_0x2c22cb+=String.fromCharCode(_0x5c70f4);
					_0xf0adb0++;
				}else if(_0x5c70f4>191&&_0x5c70f4<224){
					c2=_0x567571.charCodeAt(_0xf0adb0+1);
					_0x2c22cb+=String.fromCharCode((_0x5c70f4&0x1f)<<0x6|c2&0x3f);
					_0xf0adb0+=2;
				}else{
					c2=_0x567571.charCodeAt(_0xf0adb0+1);
					c3=_0x567571.charCodeAt(_0xf0adb0+2);
					_0x2c22cb+=String.fromCharCode((_0x5c70f4&0xf)<<0xc|(c2&0x3f)<<0x6|c3&0x3f);
					_0xf0adb0+=3;
				}
			}
			return _0x2c22cb;
		};
	}
function _0x3d38f8(_0x535b29,_0x4bb6ff,_0x54f9f3){
		var _0x25a3b2=parseInt(_0x535b29.decode(_0x54f9f3));
		return _0x4bb6ff.slice(0,-_0x25a3b2);
}
function _0x16755c(_0x3fb941,_0x3962ee,_0x3c91f1,_0x1bdd9e){
		var _0x460ebb=parseInt(_0x3fb941.decode(_0x1bdd9e));
		var _0x194268=_0x3962ee.substring(_0x3962ee.length-_0x460ebb);
		var _0x340e80=_0x425fb1(_0x194268,_0x3c91f1,true);
		var _0x3674bc='';
		_0x340e80=_0x340e80.split('').reverse().join('');
		_0x340e80=_0x3fb941.decode(_0x340e80);
		_0x340e80=JSON.parse(_0x340e80);
		for(var _0x2715cb=0;_0x2715cb<_0x340e80.length;_0x2715cb++){
			if(_0x2715cb!==0){
				_0x3674bc+='_';
			}
			_0x3674bc+=_0x340e80[_0x2715cb].split('').reverse().join('');
		}
		return _0x3674bc;
	}
function _0x425fb1(_0x139a72,_0x387b6c,_0x3dd579){
		_0x387b6c=CryptoJS.MD5(_0x387b6c).toString();
		var _0x1d4217=CryptoJS.enc.Utf8.parse(_0x387b6c.substring(0,16));
		var _0x294cf8=CryptoJS.enc.Utf8.parse(_0x387b6c.substring(16));
		if(_0x3dd579){
			return CryptoJS.AES.decrypt(_0x139a72,_0x294cf8,{'iv':_0x1d4217,'padding':CryptoJS.pad.Pkcs7}).toString(CryptoJS.enc.Utf8);
		}
		return CryptoJS.AES.encrypt(_0x139a72,_0x294cf8,{'iv':_0x1d4217,'mode':CryptoJS.mode.CBC,'padding':CryptoJS.pad.Pkcs7}).toString();
	}

function enparams(url) {
    //参数加密算法
    var _0x27f346=_0x46c9ca(7,9);
    var _0x4d01ae=_0x3d38b4(_0x27f346);
    var _0x1f2b5b={'domain':'https://jx.bozrc.com:4433/','url':url,'referrer':''};
    _0x1f2b5b=_0x425fb1(JSON.stringify(_0x1f2b5b),_0x4d01ae);
    _0x1f2b5b+=_0x4d01ae.split('').reverse().join('');
    _0x1f2b5b+=_0x27f346;
    return encodeURIComponent(_0x1f2b5b)
}

function deurl(endata) {
    //解密URL
    var _0x165d62=new _0x522c25();
    var _0x14a536 = JSON.parse(endata)
    var _0x2ebeb2=_0x425fb1(_0x3d38f8(_0x165d62,_0x14a536.url,_0x14a536.v),_0x16755c(_0x165d62,_0x14a536.url,_0x14a536.key,_0x14a536.v),true);
    return _0x2ebeb2
}
```

[Python] *纯文本查看*

```

import requests
import execjs

ctx = execjs.compile(open('js.js', mode='r', encoding='utf-8').read())

def js(js_path):
    return (str(ctx.eval(js_path)))

def m3u8(url):
    cmd = 'enparams("'+url+'")'
    params = js(cmd)
    pdat = '{"params": "'+params+'"}'
    print(pdat)
    resp = requests.post('https://110.42.2.115:9090/player/api.php', data=pdat)
    cmd = "deurl('"+resp.text+"')"
    deurl = js(cmd)
    print(deurl)

if __name__ == '__main__':
   url = 'aHR0cHM6Ly92LnFxLmNvbS94L2NvdmVyL216YzAwMjAwa3I4bjMxaS9zMDA0NGkzYnUyYi5odG1s'
   m3u8(url)
```
