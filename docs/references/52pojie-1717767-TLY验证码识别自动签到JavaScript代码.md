# TLY验证码识别自动签到JavaScript代码

> **作者**: cgbsmy | **发布时间**: 2022-11-23 22:47:00 | **版块**: 『编程语言区』 | **查看/回复**: 4959 / 23
> **原文**: [https://www.52pojie.cn/thread-1717767-1-1.html](https://www.52pojie.cn/thread-1717767-1-1.html)

---

首先申请到阿里验证码识别API
然后每隔一小时调用 win32 c++调用JavaScript代码

[C++] *纯文本查看*

```
                                    Sleep(1111);
									webviewWindow3->ExecuteScript(L"document.body.outerText;", Callback<ICoreWebView2ExecuteScriptCompletedHandler>(
										[hWnd](HRESULT error3, PCWSTR result3) -> HRESULT
										{
                                            if (lstrstr(result3, L"不能签到") == NULL)
                                            {
                                                WCHAR wScript[4096] = { 0 };
												HANDLE hFile = CreateFile(L"tly.txt", GENERIC_READ, 0, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_ARCHIVE, NULL);
												if (hFile != INVALID_HANDLE_VALUE)
												{
													WORD unicode_identifier = 0xfeff;
													DWORD dSize;
													ReadFile(hFile, &unicode_identifier, sizeof(WORD), &dSize, NULL);
													ReadFile(hFile, wScript, 4096*2, &dSize, NULL);
													CloseHandle(hFile);
												}
                                                webviewWindow3->ExecuteScript(wScript, Callback<ICoreWebView2ExecuteScriptCompletedHandler>(
                                                    [hWnd](HRESULT error3, PCWSTR result3) -> HRESULT
                                                    {														return S_OK;
													}).Get());
                                            }
											return S_OK;
										}).Get());
```

[JavaScript] *纯文本查看*

```
function urlencode (str){
    str = (str + '').toString();
    return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
    replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}
function drawBase64Image (img){
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);
    var dataURL = canvas.toDataURL('image/');
    return dataURL;
}
let image = new Image();
image.src = '/other/captcha.php';
image.crossOrigin = '*';
var base64;
image.onload = function(){
    base64 = drawBase64Image(image);
    var xml = new XMLHttpRequest();
    xml.open("POST", "https://codevirify.market.alicloudapi.com/icredit_ai_image/verify_code/v1");
    xml.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
    xml.setRequestHeader("Authorization","APPCODE 你的APPCODE");
    xml.onreadystatechange=function(){
        if(xml.readyState==4){
            if(xml.status==200){
                var obj = JSON.parse(xml.responseText);
                document.getElementsByTagName("input")[0].value = obj.VERIFY_CODE_ENTITY.VERIFY_CODE;
                document.getElementsByTagName("input")[1].click();
            }
        }
    }
    xml.send('IMAGE_TYPE=0&IMAGE='+urlencode(base64));
}
```
