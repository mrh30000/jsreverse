# 原创抖音网页版直播源FLV格式真实直播流web源码

> **作者**: hackxl | **发布时间**: 2025-09-21 00:46:00 | **版块**: 『编程语言区』 | **查看/回复**: 1976 / 24
> **原文**: [https://www.52pojie.cn/thread-2061590-1-1.html](https://www.52pojie.cn/thread-2061590-1-1.html)

---

*本帖最后由 hackxl 于 2025-9-21 22:30 编辑*

前几天在论坛下了个直播源获取的工具。但只能pc端使用于是心血来潮弄了个web端

获取直播源来干什么？当然是为了只看主播。直播源观看是没有任何小黄车弹窗  弹幕  等等乱七八糟的东西的啦

前端vue  后端python

部署：

后端：

pip install -r requirements.txt

python app.py

前端：

npm install

npm run serve

仅本机测试，有问题下方留言。

![](https://attach.52pojie.cn/forum/202509/21/003845vg68aa8uaaagyayr.png)

**后端API：**

[Python] *纯文本查看*

```
gggfrom flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re

app = Flask(__name__)
CORS(app)

def get_real_stream_url(url):
    """
    解析抖音直播链接，获取真实的直播流地址
    :param url: 抖音直播链接
    :return: 直播流地址或 None
    """
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            # 启动浏览器
            browser = p.chromium.launch(headless=False)  # 设置为非无头模式以便观察
            page = browser.new_page()

            # 存储捕获到的直播流 URL
            stream_urls = []

            # 监听网络请求
            def handle_response(response):
                if response.url.endswith('.m3u8') or response.url.endswith('.flv') or response.url.endswith('.mp4'):
                    print(f"捕获到直播流请求: {response.url}")
                    stream_urls.append(response.url)

                try:
                    content_type = response.headers.get('content-type', '')
                    if 'video' in content_type or 'application/vnd.apple.mpegurl' in content_type:
                        print(f"捕获到直播流请求: {response.url}")
                        stream_urls.append(response.url)
                except Exception as e:
                    print(f"捕获响应头失败: {e}")

            page.on("response", handle_response)

            # 访问直播页面
            page.goto(url)

            # 等待页面加载完成
            page.wait_for_selector('video', timeout=10000)

            # 捕获动态加载的 JavaScript 内容
            def handle_console_message(msg):
                if "hls_pull_url" in msg.text or "play_url" in msg.text:
                    print(f"捕获到动态内容: {msg.text}")

            page.on("console", handle_console_message)

            # 获取页面内容
            content = page.content()

            # 调试：打印完整的页面内容
            with open('debug_page_content.html', 'w', encoding='utf-8') as f:
                f.write(content)
            print("页面内容已保存到 debug_page_content.html")

            # 关闭浏览器
            browser.close()

            # 返回捕获到的第一个直播流 URL
            if stream_urls:
                return stream_urls[0]

            print("未找到直播流地址")
            return None
    except Exception as e:
        print(f"解析直播流地址失败: {e}")
        return None

@app.route('/')
def home():
    return jsonify({
        'message': '抖音直播解析后端服务已启动',
        'api': '/api/parse'
    })

@app.route('/api/parse', methods=['POST'])
def parse_live_stream():
    data = request.get_json()
    url = data.get('url')

    # TODO: 实现抖音直播流解析逻辑
    # 这里需要调用抖音的 API 或模拟请求

    # 示例返回
    if url:
        # 调用抖音 API 或模拟请求获取真实直播流地址
        # 以下为示例代码，需替换为实际逻辑
        real_stream_url = get_real_stream_url(url)  # 假设 get_real_stream_url 是解析函数

        if real_stream_url:
            return jsonify({
                'success': True,
                'streamUrl': real_stream_url  # 替换为真实解析后的地址
            })
        else:
            return jsonify({
                'success': False,
                'message': '无法解析直播链接'
            })
    else:
        return jsonify({
            'success': False,
            'message': '无效的直播链接'
        })

if __name__ == '__main__':
    app.run(debug=True)
```

前端部分：

[HTML] *纯文本查看*

```
<template>
  <div class="app">
    <header>
      <div class="fixed-parser">
        <p>抖音直播解析工具</p>
        <form @submit.prevent="handleSubmit">
          <input
            v-model="url"
            type="text"
            placeholder="输入抖音直播链接或房间号"
            required
          />
          <button type="submit" :disabled="loading">
            {{ loading ? '解析中...' : '解析' }}
          </button>
        </form>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-if="streamUrl" class="stream-url">
          <div class="url-container">
            <pre>{{ streamUrl }}</pre>
            <button @click="copyStreamUrl">复制</button>
          </div>
        </div>
      </div>
      <iframe
        src="https://live.douyin.com/?from_nav=1"
        frameborder="0"
        class="douyin-iframe"
      ></iframe>
    </header>
  </div>
</template>

<script>
export default {
  data() {
    return {
      url: '',
      streamUrl: '',
      loading: false,
      error: ''
    };
  },
  methods: {
    async handleSubmit() {
      this.loading = true;
      this.error = '';
      try {
        const response = await fetch('http://localhost:5000/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: this.url })
        });
        const data = await response.json();
        if (data.success) {
          this.streamUrl = data.streamUrl;
        } else {
          this.error = data.message || '解析失败';
        }
      } catch (err) {
        this.error = '请求失败，请重试';
      } finally {
        this.loading = false;
      }
    },
    copyStreamUrl() {
      navigator.clipboard.writeText(this.streamUrl)
        .then(() => {
          alert('直播流地址已复制到剪贴板');
        })
        .catch(() => {
          alert('复制失败，请手动复制');
        });
    },
    openDouyin() {
      window.open('https://www.douyin.com', '_blank');
    }
  }
};
</script>

<style scoped>
.app {
  text-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #282c34;
  color: white;
}

header {
  width: 80%;
  max-width: 600px;
  position: relative;
}

.fixed-parser {
  position: fixed;
  top: 1%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #282c34;
  padding: 8px;
  border-radius: 0 0 10px 10px;
  z-index: 1000;
  width: 80%;
  max-width: 600px;
}

form {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 5px;
}

button {
  padding: 10px 20px;
  background-color: #61dafb;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: red;
}

.stream-url {
  margin-top: 20px;
  width: 100%;
}

.url-container {
  border: 1px solid #61dafb;
  border-radius: 5px;
  padding: 10px;
  margin-top: 10px;
  overflow-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
  max-width: 100%;
}

.url-container pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.douyin-iframe {
  width: 100%;
  height: calc(100vh - 200px);
  margin-top: 120px;
}

.url-container button {
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #61dafb;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.douyin-iframe {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
```

完整源码（前后端）：https://wwo.lanzouu.com/i88Y936nktsf
