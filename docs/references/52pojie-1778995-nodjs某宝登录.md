# nodjs某宝登录

> **作者**: 小呆呆喵喵喵 | **发布时间**: 2023-04-26 20:40:00 | **版块**: 『编程语言区』 | **查看/回复**: 2695 / 11
> **原文**: [https://www.52pojie.cn/thread-1778995-1-1.html](https://www.52pojie.cn/thread-1778995-1-1.html)

---

*本帖最后由 小呆呆喵喵喵 于 2023-4-27 09:35 编辑*

记录一下

[JavaScript] *纯文本查看*

```
const puppeteer = require('puppeteer-core');
const fs = require('fs');

function log_in(zh, pwd) {

    (async function () {
        const browser = await puppeteer.launch({
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',  // 设置浏览器路径
            headless: false,  // 是否启用无头
            devtools: false, //  调试启动
            ignoreDefaultArgs: ["--enable-automation"], //去掉webDriver标识

            args: ['--disable-features=site-per-process'], //  抓取 iframe
            defaultViewport: {width: 0, height: 0}, // 页面大小

        });
        const page = await browser.newPage()
        await page.evaluateOnNewDocument('const newProto = navigator.__proto__;delete newProto.webdriver;navigator.__proto__ = newProto;');
        await page.goto('')
        const text = await page.waitForXPath('//*[@id="fm-login-id"]')
        console.log(text)
        await text.type(zh); // 输入数据

        await (await page.waitForXPath('//*[@id="fm-login-password"]')).type(pwd
        );
        await new Promise(function (r) {
            setTimeout(r, 5000)
        });
        const iframeHandle = await page.$('#baxia-dialog-content')
        if (iframeHandle) {
            console.log('出现滑块');

            const frame = await iframeHandle.contentFrame(); // 切换iframe
            const handles = await frame.waitForSelector('#nc_1_n1z');

            const kd = await (await frame.waitForSelector('#nc_1__scale_text > span')).boundingBox();  // 获取坐标

            const handle = await handles.boundingBox();
            console.log(handle);
            console.log(kd);

            await page.mouse.move(
                handle.x + handle.width / 2,
                handle.y + handle.height / 2
            );
            await page.mouse.down();
            await page.mouse.move(handle.x + handle.width / 2 + kd.width - handle.width,
                handle.y + handle.height / 2, {steps: 50});
            await page.mouse.up();
        } else {
            console.log('没有滑块');
        }
        await new Promise(function (r) {
            setTimeout(r, 3000)
        });

        await (await page.waitForXPath('//*[@id="login-form"]/div[4]/button')).click();

        await new Promise(function (r) {
            setTimeout(r, 3000)
        });
        if (await page.$('#login-form > div.fm-btn > button')) {
            const error = await page.$('#login-error > div')
            if (error) {
                const prop = await error.getProperty('innerText');
                const text_ = await prop.jsonValue(); // 获取组键文字
                console.log(text_)
            } else {
                console.log('登录异常')
            }
        } else {
            console.log('登录成功')
            fs.writeFile('cookies.json', JSON.stringify(await page.cookies()), function () {
                console.log('cookie写入本地完成')
            })
        }

        await page.close();
        await browser.close();

    })();
}

log_in('11111', '22222')
```
