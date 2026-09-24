# [TypeScript]斗鱼、虎牙直播源解析

> **作者**: thepoy | **发布时间**: 2024-08-22 17:40:00 | **版块**: 『编程语言区』 | **查看/回复**: 11517 / 42
> **原文**: [https://www.52pojie.cn/thread-1957129-1-1.html](https://www.52pojie.cn/thread-1957129-1-1.html)

---

*本帖最后由 thepoy 于 2024-8-24 20:08 编辑*

以为发52发过，原来并没有。

很多源解析的项目我觉得都挺蛋疼的，要么用python、要么用go，但多个直播平台的混淆、加密完全是用 js 写的，所以实际上使用 js 或 ts 解析直播源才是最佳方式。

仓库：<https://github.com/thep0y/lsar>

https://gitee.com/thepoy/lsar

### 安装

```
npm i -g lsar
yarn add global lsar
pnpm i -g lsar
```

### 使用说明

各直播平台的命令见下面示例。

* 斗鱼

  ```
  lasr douyu 100
  ```
* 虎牙。
  使用链接`-u`时一定要用**英文**单引号或双引号将链接包裹住，否则可能报错。

  ```
  lsar huya -r 100
  lsar huya -u 'https://www.huya.com/06016sask?&curpage=%E9%BB%91%E7%A5%9E%E8%AF%9D%EF%BC%9A%E6%82%9F%E7%A9%BA%E5%93%81%E7%B1%BB%E9%A1%B5&curlocation=%E5%85%A8%E9%83%A8%2F1'
  ```
* B 站
  使入 cookie 和使用链接`-u`时一定要用**英文**单引号或双引号将链接包裹住，否则可能报错。

  ```
  lsar bili -r 100 'buvid3=9E0E75DA-AB78-00DC-B72A-9D56282337A829879infoc; b_nut=1723464629; ... theme_style=light'
  lsar bili -u 'https://live.bilibili.com/30632872?session_id=44ed74815a4f65086b14a6472566c873_DBCADB56-218B-4E43-872D-39ECFCF95BAD&launch_id=1000216&live_from=71001' 'buvid3=9E0E75DA-AB78-00DC-B72A-9D56282337A829879infoc; b_nut=1723464629; ... theme_style=light'
  ```
* 抖音

  ```
  lsar douyin 100
  ```

必须贴点代码（代码是无用的，只是发帖必须有代码）：

```
import { Command, InvalidArgumentError } from "commander";
import { Douyu, Bilibili } from "./apis";
import { Huya } from "./apis/huya";
import { fatal } from "./logger";

const program = new Command();

program
  .name("lsar")
  .description("能够获取斗鱼、B站直播源的命令行工具")
  .version("<<<<>>>>");

const myParseInt = (value: string) => {
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw new InvalidArgumentError("不是一个整数");
  }
  return parsedValue;
};

program
  .command("douyu")
  .argument("<roomID>", "目标房间号（支持靓号）", myParseInt)
  .description("解析斗鱼直播源（支持靓号）")
  .action((roomID: number) => {
    const c = new Douyu(roomID);
    c.printLiveLink()
      .then()
      .catch((e) => {
        console.log(e);
      });
  });

interface BiliArg {
  roomID: number;
  url?: string;
}

program
  .command("bili")
  .description("解析B站直播源。\n可以使用房间ID或房间链接作为传入参数。")
  .option("-r, --roomID <roomID>", "目标房间号", myParseInt, 0)
  .option("-u, --url <pageURL>", "房间页面链接")
  .action((arg: BiliArg) => {
    const c = new Bilibili(arg.roomID, arg.url);
    c.printLiveLink().catch((e) => {
      console.log(e);
    });
  });

type HuyaArg = BiliArg;

program
  .command("huya")
  .description("解析虎牙直播源。")
  .option("-r, --roomID <roomID>", "目标房间号", myParseInt)
  .option("-u, --url <pageURL>", "房间页面链接")
  .action((arg: HuyaArg) => {
    if (arg.roomID === undefined && arg.url === undefined) {
      fatal("参数错误，请查阅 -h/--help 以正确传递参数");
    }
    const h = new Huya(arg.roomID, arg.url);
    h.printLiveLink().catch((e) => {
      console.log(e);
    });
  });

program.parse(process.argv);
```
