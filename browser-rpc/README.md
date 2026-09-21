# Crawler RPC

> 基于 Manifest V3 的浏览器扩展，通过 rpc WebSocket RPC 暴露页面侧能力，实现跨平台数据抓取和自动化操作。

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 简介

Crawler RPC 是一个原生 JavaScript 实现的 Manifest V3 浏览器扩展。Content Scripts 向页面注入平台 action，Background 与 rpc RPC 服务器维护 WebSocket 连接，将页面内部的 API 调用能力暴露为远程 RPC 接口，支持从社交媒体、招聘、电商、技术社区、AI 平台等多种类型的网站提取数据。

## 特性

- **多平台支持**：覆盖 60+ 网站平台，主要包括
  - **社交媒体**：抖音、小红书、TikTok、Instagram、Facebook、Threads、X(Twitter)、微博、Bilibili、快手、YouTube、Reddit、Bluesky
  - **招聘平台**：BOSS直聘、智联招聘、前程无忧、猎聘、拉勾网、Upwork
  - **技术社区**：GitHub、CSDN、掘金、Stack Overflow、V2EX、Hacker News、吾爱破解、看雪
  - **AI 平台**：DeepSeek、Gemini、通义千问、MiniMax、ModelScope
  - **电商**：京东、淘宝、1688、闲鱼(Goofish)
  - **新闻资讯**：知乎、36氪、今日头条、豆瓣、雪球、Reuters、BBC
  - **学术搜索**：Google Scholar、百度学术、arXiv、CNKI、万方
  - **其他**：Steam、Binance、ProductHunt、Apple Podcasts 等

- **RPC 架构**：基于 rpc 的 WebSocket RPC 通信
- **自动连接**：访问支持的平台页面时自动建立 rpc 连接
- **灵活配置**：支持自定义 WebSocket 服务器地址和 Action 延迟
- **跨域代理**：通过 Background Service Worker 代理跨域请求
- **实时状态**：插件弹窗显示连接状态和平台信息
- **反检测**：内置反检测模块，降低被平台识别为自动化的风险

## 快速开始

### 前置条件

1. **浏览器要求**
   - Chrome 88+ / Edge 88+ / 其他基于 Chromium 的浏览器

2. **rpc 服务器**
   - 需要先部署 rpc RPC 服务
   - 默认地址：`ws://127.0.0.1:5612`
   - 下载地址：[rpc](https://github.com/virjar/rpc)

### 安装步骤

1. 下载或克隆本项目
```bash
git clone https://github.com/yourusername/crawler-rpc.git
cd crawler-rpc
```

2. 打开浏览器扩展管理页面（`chrome://extensions/`）

3. 启用"开发者模式"

4. 点击"加载已解压的扩展程序"，选择项目文件夹

## 配置

### WebSocket 服务器配置

1. 点击浏览器工具栏中的扩展图标
2. 在弹出的配置面板中输入 WebSocket 服务器地址
3. 格式：`ws://host:port` 或 `wss://host:port`
4. 点击"保存"按钮

| 配置项 | 说明 |
|---|---|
| `wsHost` | rpc WebSocket 服务地址，格式为 `ws://host:port` 或 `wss://host:port`。 |
| `rpcToken` | 预留，当前不生效、不发送；可保存和清空，但不会进入 WebSocket URL、bind、heartbeat 或页面消息。 |
| `actionDelay` | 平台 action 的执行延迟（毫秒）。 |

### Action 延迟配置

为了防止被平台检测，可配置 Action 执行延迟：

1. 在配置面板中找到"操作延迟"设置
2. 输入延迟时间（毫秒）或使用预设按钮
3. 预设选项：0ms、500ms、1000ms、2000ms、3000ms、5000ms

## 项目结构

基于当前仓库真实文件布局：

```
crawler-rpc/
├── manifest.json              # 扩展入口与注入声明
├── background/
│   ├── rpc-manager.js         # Background 唯一的 RPC 连接生命周期所有者
│   ├── browser-actions.js     # 保留 browser 分组的固定浏览器动作
│   └── background.js          # 可信配置、代理请求与请求头捕获
├── bridge/
│   └── bridge.js              # ISOLATED world 桥接脚本，负责与扩展 API 通信
├── lib/
│   ├── http.js                # 页面侧请求工具
│   ├── utils.js               # 通用辅助函数
│   └── anti-detect.js         # 反检测相关逻辑
├── content/
│   ├── _template/             # 新增平台脚手架说明
│   ├── douyin/                # 抖音
│   ├── xiaohongshu/           # 小红书
│   ├── facebook/              # Facebook
│   ├── instagram/             # Instagram
│   ├── tiktok/                # TikTok
│   ├── threads/               # Threads
│   ├── twitter/               # X(Twitter)
│   ├── bilibili/              # B站
│   ├── kuaishou/              # 快手
│   ├── youtube/               # YouTube
│   ├── reddit/                # Reddit
│   ├── bluesky/               # Bluesky
│   ├── weibo/                 # 微博
│   ├── zhihu/                 # 知乎
│   ├── 36kr/                  # 36氪
│   ├── juejin/                # 掘金
│   ├── csdn/                  # CSDN
│   ├── github/                # GitHub
│   ├── zhipin/                # BOSS直聘
│   ├── zhaopin/               # 智联招聘
│   ├── job51/                 # 前程无忧
│   ├── liepin/                # 猎聘
│   ├── upwork/                # Upwork
│   ├── jd/                    # 京东
│   ├── taobao/                # 淘宝
│   ├── 1688/                  # 1688
│   ├── goofish/               # 闲鱼
│   ├── deepseek/              # DeepSeek
│   ├── geminiai/              # Gemini
│   ├── qwenai/                # 通义千问
│   ├── minimax/               # MiniMax
│   ├── modelscope/            # ModelScope
│   ├── google/                # Google
│   ├── google-scholar/        # Google Scholar
│   ├── baidu-scholar/         # 百度学术
│   ├── arxiv/                 # arXiv
│   ├── cnki/                  # 中国知网
│   ├── wanfang/               # 万方
│   ├── wikipedia/             # 维基百科
│   ├── reuters/               # Reuters
│   ├── toutiao/               # 今日头条
│   ├── medium/                # Medium
│   ├── devto/                 # Dev.to
│   ├── stackoverflow/         # Stack Overflow
│   ├── hackernews/            # Hacker News
│   ├── v2ex/                  # V2EX
│   ├── 52pojie/               # 吾爱破解
│   ├── kanxue/                # 看雪
│   ├── xueqiu/                # 雪球
│   ├── sinablog/              # 新浪博客
│   ├── producthunt/           # ProductHunt
│   ├── steam/                 # Steam
│   ├── binance/               # Binance
│   ├── apple-podcasts/        # Apple Podcasts
│   ├── gitee/                 # Gitee
│   ├── jike/                  # 即刻
│   ├── hupu/                  # 虎扑
│   ├── dyindex/               # 抖音创作者平台
│   ├── qizhidao/              # 智启道
│   ├── do22/                  # 22.do
│   └── skillsmp/              # skillsmp.com
├── server/                    # 历史平台脚本/兼容实现
├── popup/
│   ├── popup.html             # 弹窗界面
│   ├── popup.js               # 弹窗逻辑
│   └── popup.css              # 弹窗样式
├── data/                      # 平台数据或静态映射
├── docs/                      # 辅助文档
└── tests/                     # 测试文件
```

### 模块文件约定

每个 `content/<platform>/` 目录通常包含：

- `index.js`：平台入口，初始化 `BaseClient.create(...)`
- `endpoints.js`：平台接口地址
- `api.js`：对平台接口的抓取封装
- `utils.js`：参数组装、Cookie、签名、通用辅助
- `constants.js`：常量定义（部分平台）
- `crypto.js`：加密/签名逻辑（部分平台）
- `parser.js` / `parse.js`：数据解析（部分平台）
- `server.js`：服务端逻辑补充（部分平台）

## 技术架构

### 核心组件

#### 1. BaseClient

`lib/client.js` 只提供平台 action 的注册与执行：

- **Action 注册**：统一注册和管理 RPC Actions
- **延迟控制**：支持可配置的 Action 执行延迟
- **类型化会话**：通过 `lib/rpc-page-transport.js` 注册平台 action，并按 opaque invocation id 返回 unary 或 stream 结果

#### 2. Bridge

`bridge/bridge.js` 运行在 `ISOLATED` world，只在 MAIN world 与 Background 之间转发类型化 RPC 消息：

- **平台会话**：注册、调用、reply、stream chunk/end 和 unregister
- **受限兼容能力**：只读公开配置、`proxyFetch` 与 OpenAI 同站点 Cookie 请求
- **不提供**：页面侧 WebSocket、任意 `chrome.*` 分派、配置写入或浏览器高权限 action

#### 3. Background Script

`background/rpc-manager.js` 持有所有 WebSocket 生命周期；`background/browser-actions.js` 持有内部 `browser` 分组的八个浏览器 action；`background/background.js` 负责可信配置与其余 Background 适配：

- **连接生命周期**：注册、bind、heartbeat、重连和 localhost 回退均只在 Background 执行
- **浏览器权限**：`browser` 是保留分组，只由 Background 创建；页面注册同名分组会被拒绝
- **配置更新**：仅可信扩展页面可保存配置；`wsHost` 变化由 Manager 受控重连，`rpcToken` 单独变化不触发重连

### 注入层次与通信路径

```
外部调用方
  -> rpc HTTP invoke
  -> rpc WebSocket
  -> Background RpcConnectionManager
  -> Bridge 类型化消息 -> BaseClient / 平台 action
  -> 平台页面接口或 DOM
```

Content Scripts 注入策略：

1. **ISOLATED 世界**：`bridge/bridge.js`
   - 运行时机：`document_start`
   - 作用：与扩展 API 通信的消息桥接

2. **MAIN 世界**：`lib/utils.js`、`lib/http.js`、`lib/rpc-page-transport.js`、`lib/client.js`、`content/browser/index.js`
   - 运行时机：`document_start`
   - 作用：提供页面请求工具、类型化 RPC transport、平台 action 框架和四个 Cloudflare 默认 action

3. **MAIN 世界**：各平台实现（`content/<platform>/*.js`）
   - 运行时机：`document_idle`
   - 作用：实现平台特定的采集逻辑

Chrome 通过 `background/worker.js` 加载 `rpc-manager.js`、`browser-actions.js`、`background.js`；Firefox 128+ 通过 manifest 中相同顺序的 `background.scripts` 加载它们。

## 使用示例

### 通过 rpc 调用

安装扩展后，访问任意支持的平台页面，扩展会自动连接到 rpc 服务器。

#### 抖音示例

```bash
curl -X POST "http://127.0.0.1:5612/business/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "group": "douyin",
    "action": "getUserInfo",
    "username":"MS4wLjABAAAAVFKSxWhh1QJvhwhVJ8I97fGr94EPqXQCAauayzifMxE"
  }'
```

#### Facebook 示例

```bash
curl -X POST "http://127.0.0.1:5612/business/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "group": "facebook",
    "action": "getUserInfo",
    "username": "DonaldTrump"
  }'
```

#### 浏览器 action 示例

浏览器高权限 action 只能使用保留分组 `browser`：

```bash
curl -X POST "http://127.0.0.1:5612/business/invoke" \
  -H "Content-Type: application/json" \
  -d '{"group":"browser","action":"getTabs","params":{"query":{"currentWindow":true}}}'
```

### 配置动态更新

通过扩展 Popup 保存配置。修改 `wsHost` 后，Background Manager 会受控替换连接；只修改 `actionDelay` 或预留的 `rpcToken` 不会创建新的连接。

## 开发

### 添加新平台

先创建平台最小骨架：

```text
node scripts/platforms.mjs new <id>
```

`new` 只创建 `platform.json`、`endpoints.js` 和 `api.js`，绝不隐式同步生成文件。填写平台描述和实现后，再显式同步集成文件：

```text
node scripts/platforms.mjs sync
```

以下生成输出由平台描述统一管理，不得手工编辑：

- `manifest.json`
- `popup/platforms.generated.js`
- `generated/platforms/`
- `docs/generated/actions/`
- `tests/generated/platform-actions.json`

现有复杂或 custom 平台仍受支持，只应在触及该平台时渐进迁移；不应假定所有现有 Action 元数据均已完整。

### 检查与验证平台

```text
node scripts/platforms.mjs check
```

`check` 和 `node scripts/check-repo.mjs` 都是只读漂移门禁，不会修改或同步生成文件。在显式执行真实 RPC/浏览器验证前，先用元数据 runner 检查平台和 Action 参数：

```text
python tests/run_platform.py <platform> [action] --dry-run
```

### 调试技巧

1. **查看日志**
   - 扩展页面：`chrome://extensions/` → 检查视图 → Service Worker
   - 网页控制台：F12 → Console（Content Scripts 运行在页面上下文中）

2. **检查连接状态**
   - 打开扩展弹窗，查看连接状态指示灯
   - 绿色：已连接，红色：未连接

3. **测试 RPC 调用**
   - 使用 rpc Web UI 测试 Action
   - 确认分组名称（group）和 Action 名称正确

## API 文档

### 页面消息边界

页面不应直接调用 `chrome.runtime.sendMessage`。平台代码通过 `lib/http.js` 的现有请求能力和 `BaseClient` 的类型化 transport 工作；Bridge 只代理 `proxyFetch`、只读公开配置和受限的 OpenAI 同站点 Cookie 请求。配置写入只接受可信扩展页面，普通页面消息不能保存配置、选择 WebSocket 地址或调用任意浏览器 API。

## 注意事项

1. **合规使用**：使用本工具爬取数据时，请遵守各平台的用户协议和相关法律法规
2. **频率限制**：建议配置合理的延迟时间，避免对平台造成过大压力
3. **数据隐私**：不要爬取或传播他人的隐私数据
4. **rpc 版本**：确保使用兼容的 rpc 服务器版本
5. **浏览器兼容性**：部分功能可能在旧版本浏览器中不可用

## 常见问题

### Q: 扩展无法连接到 rpc 服务器？

A: 检查以下几点：
1. rpc 服务器是否正常运行
2. WebSocket 地址配置是否正确
3. 浏览器控制台是否有错误信息
4. 防火墙是否阻止了连接

### Q: 页面刷新后扩展失效？

A: Content Scripts 在页面刷新时会重新注册平台 session；Background Manager 按其受控生命周期维持或恢复连接。

### Q: 如何配置多个 rpc 服务器？

A: 当前版本仅支持配置一个服务器地址。如需使用多个服务器，可以创建多个扩展实例。

### Q: 支持哪些浏览器？

A: 支持 Chrome/Chromium 系浏览器，以及 Firefox 128+；两者使用同一 manifest，并按各自 Background 加载机制运行。

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

**免责声明**：本工具仅供学习和研究使用，使用者需自行承担使用本工具产生的所有法律后果。
