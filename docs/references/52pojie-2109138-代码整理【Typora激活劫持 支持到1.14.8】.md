# 代码整理【Typora激活劫持 支持到1.14.8】

> **作者**: 1389739946 | **发布时间**: 2026-05-23 11:40:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4401 / 93
> **原文**: [https://www.52pojie.cn/thread-2109138-1-1.html](https://www.52pojie.cn/thread-2109138-1-1.html)

---

*本帖最后由 1389739946 于 2026-8-3 12:58 编辑*

拜读了站内**[@steven026](https://www.52pojie.cn/home.php?mod=space&uid=1911585)** 大佬的【Typora v1.12.4 安全分析：反反调试与激活劫持】这篇文章
综合了站内**@studied** 大佬整理的代码以及评论区各位兄弟提供的思路和代码片段
我借助AI，重新整理制作了一个比较完美的版本，给大家参考交流。

基于@studied整理的代码，我做了以下修改：
Version 2.0：
1.去除了对iconv-lite库的依赖
2.激活拦截更加可靠
3.修复了回滚还原潜在的报错
4.修复了进程关闭偶尔失败的问题
5.优化了脚本交互体验
另外用GO语言重写了一份，方便运行。

Version 1.0：
**1.修复了一段时间后掉激活的问题**
2.解决了[DEP0190] 的警告信息
3.加入了全局缓存机制，可以缓存Typora目录路径、机器码和邮箱信息
4.加入了机器码和邮箱输入内容的非空校验
5.加入了自动回滚机制，若检测到已激活或者激活过程中出错，可以进行回滚操作。
6.优化了脚本的视觉效果
7.删除了没必要的脚本配置(默认开启备份、默认无调试信息)
8.优化launch.dist.js的注入代码，去除了在.md文件同目录下，生成调试日志文件，生成id文件的行为，以及删除id文件导致激活失效的问题！
9.新增激活判断，解决了Typora更新后脚本激活报错的问题
10.加入手动安装目录选择窗口，提高便利性。
11.支持从注册表直接读取Typora安装目录，更加便利
12.修复了图床图片无法加载的问题

现在整个脚本应该是非常健壮了，我自己的使用体验非常好！
根据评论区反馈，脚本目前可以支持到 1.14.8版本，依旧有效！更新之后，重新执行一下文件激活即可！

![](https://attach.52pojie.cn/forum/202605/23/112159mgrb9r99zbb9agya.png)

![](https://attach.52pojie.cn/forum/202605/23/112201vztrgj5givbrrzfg.png)

![](https://attach.52pojie.cn/forum/202605/23/112203ynffcznurnh2nqjo.png)

我有个疑问是
[color=rgb(6

```
electron.app.whenReady().then(() => {
    electron.protocol.handle("https", async (request) => {
        if (request.url.includes('api/client/activate')) {
            const fakeActivateResponse = {
                code: 0,
                retry: true,
                msg: "${StandardLicenseMsg}"
            };
            return new Response(
                JSON.stringify(fakeActivateResponse),
                {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                }
            );
        }

        if (request.url.includes('api/client/renew')) {
            const fakeRenewResponse = {
                success: true,
                code: 0,
                retry: true,
                msg: "${StandardLicenseMsg}"
            };
            return new Response(
                JSON.stringify(fakeRenewResponse),
                {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                }
            );
        }

        return electron.net.fetch(request, { bypassCustomProtocolHandlers: true });
    });
```

和

```
electron.app.whenReady().then(() => {
    electron.protocol.handle("https", async (request) => {
        if (request.url.includes('api/client/activate') || request.url.includes('api/client/renew')) {
            return new Response(JSON.stringify({
                success: true, code: 0, retry: true, msg: "${StandardLicenseMsg}"
            }), { status: 200 });
        }
        return electron.net.fetch(request, { bypassCustomProtocolHandlers: true });
    });
```

3, 63, 63)]

我提供的下载文件是用的下面这段比较简短的代码，但是比较完善的是上面这段长的，我不知道影不影响效果。
**注：本代码片段仅供站内学习交流使用，请勿随意向站外传播**
下载地址
https://wwbcy.lanzouu.com/b007ukg8jc
密码:52pj
经评论区反馈，截至今日，该脚本能够支持到1.14.8版本
提醒：Nodejs版，自己安装依赖的时候，chalk包一定要指定chalk@4，最新的版本不行哦
经评论区反馈，GO版比较稳定，推荐大家优先使用GO版，编译也更加方便。
