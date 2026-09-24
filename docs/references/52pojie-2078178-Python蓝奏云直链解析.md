# Python蓝奏云直链解析

> **作者**: pipicat613 | **发布时间**: 2025-12-06 22:24:00 | **版块**: 『编程语言区』 | **查看/回复**: 1334 / 20
> **原文**: [https://www.52pojie.cn/thread-2078178-1-1.html](https://www.52pojie.cn/thread-2078178-1-1.html)

---

本来是在网上找工具的，一直没有能用的，蓝奏在今年后半年更新了Cloudflare的反爬，导致全部都失效了
已经写了绕过Cloudflare部分，亲测可以成功，但是获取直链后半段一直是有点问题
使用Py3.12.10
调用
code.py -d -https://wwanu.lanzoue.com/iYonc2lzlw1i

测试链接
https://wwanu.lanzoue.com/iYonc2lzlw1i

import os
import re
import json
import time
import base64
import argparse
import traceback
import requests
import execjs  # PyExecJS
from tqdm import tqdm
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional, Dict, Tuple, Any
from urllib.parse import urlparse, parse\_qs, unquote
from html import unescape
class LanzouDownloader:

    def \_\_init\_\_(self, timeout: int = 30, debug: bool = False):
        """
        初始化下载器

        Args:
            timeout: 请求超时时间
            debug: 是否启用调试模式
        """
        self.timeout = timeout
        self.debug = debug
        self.session = self.\_create\_session()
        self.cookies = {}
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,\*/\*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        }

        if self.debug:
            print(f"[DEBUG] 初始化下载器，超时时间: {timeout}秒")
            print("[DEBUG] 注意：此版本专门处理蓝奏云的反爬虫机制")

    def \_create\_session(self) -> requests.Session:
        """创建带重试机制的session"""
        if self.debug:
            print("[DEBUG] 创建带重试机制的session")

        session = requests.Session()
        retry = Retry(
            total=5,
            read=5,
            connect=5,
            backoff\_factor=0.5,
            status\_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max\_retries=retry, pool\_connections=50, pool\_maxsize=50)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session

    def \_request(self, url: str, method: str = 'GET', data: Optional[Dict] = None,
                 headers: Optional[Dict] = None, allow\_redirects: bool = True,
                 stream: bool = False) -> requests.Response:
        """发送请求"""
        if self.debug:
            print(f"[DEBUG] 发送请求: {method} {url}")
            if data:
                print(f"[DEBUG] 请求数据: {data}")

        request\_headers = self.headers.copy()
        if headers:
            request\_headers.update(headers)

        try:
            if method.upper() == 'GET':
                response = self.session.get(
                    url,
                    headers=request\_headers,
                    cookies=self.cookies,
                    timeout=self.timeout,
                    allow\_redirects=allow\_redirects,
                    stream=stream
                )
            else:
                response = self.session.post(
                    url,
                    headers=request\_headers,
                    cookies=self.cookies,
                    data=data,
                    timeout=self.timeout,
                    allow\_redirects=allow\_redirects,
                    stream=stream
                )

            if self.debug:
                print(f"[DEBUG] 响应状态码: {response.status\_code}")
                print(f"[DEBUG] 响应URL: {response.url}")
                print(f"[DEBUG] 响应头: {dict(response.headers)}")
                if self.debug and len(response.text) < 500:
                    print(f"[DEBUG] 响应预览: {response.text[:300]}...")

            # 更新cookies
            self.cookies.update(response.cookies.get\_dict())
            if self.debug and self.cookies:
                print(f"[DEBUG] 更新cookies: {self.cookies}")

            return response

        except Exception as e:
            if self.debug:
                print(f"[DEBUG] 请求异常: {e}")
                traceback.print\_exc()
            raise

    def parse\_acw\_sc\_v2\_javascript(self, html\_content: str) -> Optional[str]:
        """
        解析并执行 acw\_sc\_\_v2 的 JavaScript 代码
        这是蓝奏云的反爬虫机制
        """
        if self.debug:
            print("[DEBUG] 尝试解析 acw\_sc\_\_v2 JavaScript 代码")

        # 查找 JavaScript 代码
        script\_pattern = r'<script[^>\*>([\s\S\*?)</script>'
        scripts = re.findall(script\_pattern, html\_content)

        if not scripts:
            if self.debug:
                print("[DEBUG] 未找到 JavaScript 代码")
            return None

        # 找到包含 acw\_sc\_\_v2 的脚本
        target\_script = None
        for script in scripts:
            if 'acw\_sc\_\_v2' in script or '\_0x4818' in script:
                target\_script = script
                break

        if not target\_script:
            if self.debug:
                print("[DEBUG] 未找到 acw\_sc\_\_v2 相关代码")
            return None

        if self.debug:
            print("[DEBUG] 找到 acw\_sc\_\_v2 JavaScript 代码")
            print(f"[DEBUG] 脚本长度: {len(target\_script)} 字符")

        # 提取 arg1
        arg1\_pattern = r"var\s+arg1\s\*=\s\*'([^'+)'"
        arg1\_match = re.search(arg1\_pattern, target\_script)

        if not arg1\_match:
            if self.debug:
                print("[DEBUG] 未找到 arg1 参数")
            return None

        arg1 = arg1\_match.group(1)

        if self.debug:
            print(f"[DEBUG] 提取到 arg1: {arg1}")

        try:
            # 提取 posList - 修复：手动解析十六进制数组
            pos\_pattern = r'var\s+posList\s\*=\s\*\[([^+)'
            pos\_match = re.search(pos\_pattern, target\_script)

            if not pos\_match:
                if self.debug:
                    print("[DEBUG] 未找到 posList")
                return None

            # 手动解析包含十六进制数的数组
            pos\_list\_str = pos\_match.group(1)
            # 分割字符串并转换十六进制为十进制
            pos\_list = []
            for item in pos\_list\_str.split(','):
                item = item.strip()
                if item.startswith('0x'):
                    # 十六进制转换为十进制
                    pos\_list.append(int(item, 16))
                else:
                    # 十进制直接转换
                    pos\_list.append(int(item))

            if self.debug:
                print(f"[DEBUG] 位置列表: {pos\_list}")
                print(f"[DEBUG] 位置列表长度: {len(pos\_list)}")

            # 提取 mask - 从 \_0x3e9e 数组中提取
            # 查找 \_0x3e9e 数组
            str\_array\_pattern = r"var\s+\_0x3e9e\s\*=\s\*(\[[^)"
            str\_array\_match = re.search(str\_array\_pattern, target\_script)

            if str\_array\_match:
                str\_array\_str = str\_array\_match.group(1)
                # 手动解析数组，处理引号问题
                str\_array = []
                in\_quotes = False
                current\_str = ""
                for i, char in enumerate(str\_array\_str):
                    if char == "'" or char == '"':
                        if in\_quotes:
                            if current\_str:
                                str\_array.append(current\_str)
                                current\_str = ""
                            in\_quotes = False
                        else:
                            in\_quotes = True
                    elif in\_quotes:
                        current\_str += char

                if self.debug:
                    print(f"[DEBUG] 找到字符串数组，长度: {len(str\_array)}")
                    print(f"[DEBUG] 字符串数组: {str\_array}")

                # 解码 base64 字符串
                decoded\_strings = []
                for s in str\_array:
                    try:
                        # 确保字符串是有效的base64
                        s = s.strip()
                        if s:
                            # 添加必要的填充
                            missing\_padding = len(s) % 4
                            if missing\_padding:
                                s += '=' \* (4 - missing\_padding)
                            decoded = base64.b64decode(s).decode('utf-8')
                            decoded\_strings.append(decoded)
                    except Exception as e:
                        if self.debug:
                            print(f"[DEBUG] 解码失败: {s}, 错误: {e}")
                        decoded\_strings.append(s)

                if self.debug:
                    print(f"[DEBUG] 解码后的字符串: {decoded\_strings}")

                # 根据代码逻辑，mask 应该是最后一个元素之前的某个
                # 通常 mask 是类似 "3000176000856006061501533003690027800375" 的字符串
                mask = None
                for s in decoded\_strings:
                    if len(s) == 40 and all(c in '0123456789abcdefABCDEF' for c in s):
                        mask = s
                        break

                if not mask:
                    # 如果找不到，使用默认值
                    mask = "3000176000856006061501533003690027800375"
            else:
                # 如果找不到字符串数组，使用默认值
                mask = "3000176000856006061501533003690027800375"

            if self.debug:
                print(f"[DEBUG] 使用的 mask: {mask}")

            # 重新排列 arg1 - 根据 posList 重新排列字符
            out\_put\_list = [''] \* len(pos\_list)

            for i, char in enumerate(arg1):
                target\_pos = i + 1  # JavaScript 中索引从1开始
                if target\_pos in pos\_list:
                    idx = pos\_list.index(target\_pos)
                    out\_put\_list[idx] = char

            arg2 = ''.join(out\_put\_list)

            if self.debug:
                print(f"[DEBUG] 重新排列后的 arg2: {arg2}")
                print(f"[DEBUG] arg2 长度: {len(arg2)}, mask 长度: {len(mask)}")

            # XOR 操作
            arg3 = ''
            # 确保我们只处理有效长度
            min\_len = min(len(arg2), len(mask))
            # 确保是偶数长度
            if min\_len % 2 != 0:
                min\_len -= 1

            for i in range(0, min\_len, 2):
                if i + 2 <= len(arg2) and i + 2 <= len(mask):
                    try:
                        str\_char = int(arg2[i:i+2], 16)
                        mask\_char = int(mask[i:i+2], 16)
                        xor\_char = str\_char ^ mask\_char
                        hex\_str = hex(xor\_char)[2:]  # 去掉 '0x' 前缀
                        if len(hex\_str) == 1:
                            hex\_str = '0' + hex\_str
                        arg3 += hex\_str
                    except ValueError:
                        if self.debug:
                            print(f"[DEBUG] XOR 错误在位置 {i}: arg2={arg2[i:i+2]}, mask={mask[i:i+2]}")

            if self.debug:
                print(f"[DEBUG] XOR 后的 arg3: {arg3}")
                print(f"[DEBUG] arg3 长度: {len(arg3)}")

            # 构建 cookie 值
            return arg3

        except Exception as e:
            if self.debug:
                print(f"[DEBUG] 解析 JavaScript 失败: {e}")
                traceback.print\_exc()
            return None

    def bypass\_cloudflare(self, url: str) -> bool:
        """
        尝试绕过 Cloudflare 保护
        """
        if self.debug:
            print(f"[DEBUG] 尝试绕过 Cloudflare 保护: {url}")

        try:
            # 第一次请求，获取 JavaScript 挑战
            response = self.\_request(url, allow\_redirects=False)

            # 检查是否被重定向或返回了挑战页面
            if response.status\_code in [301, 302, 303, 307, 308]:
                location = response.headers.get('Location')
                if location:
                    if self.debug:
                        print(f"[DEBUG] 被重定向到: {location}")
                    return True

            # 检查响应内容
            content = response.text

            # 检查是否是 JavaScript 挑战
            if 'acw\_sc\_\_v2' in content or 'cloudflare' in content.lower() or 'challenge' in content.lower():
                if self.debug:
                    print("[DEBUG] 检测到 Cloudflare/反爬虫挑战")

                # 尝试解析 JavaScript 并获取 cookie
                arg3 = self.parse\_acw\_sc\_v2\_javascript(content)

                if arg3:
                    if self.debug:
                        print(f"[DEBUG] 成功获取 acw\_sc\_\_v2 值: {arg3}")

                    # 设置 cookie
                    self.cookies['acw\_sc\_\_v2'] = arg3
                    self.session.cookies.set('acw\_sc\_\_v2', arg3)

                    # 等待一段时间，模拟浏览器
                    time.sleep(3)

                    # 重新请求
                    response2 = self.\_request(url)

                    # 检查是否成功
                    if response2.status\_code == 200 and 'acw\_sc\_\_v2' not in response2.text:
                        if self.debug:
                            print("[DEBUG] 成功绕过 Cloudflare 保护")
                        return True
                    else:
                        if self.debug:
                            print("[DEBUG] 绕过失败，响应可能仍然包含挑战")
                            if len(response2.text) < 500:
                                print(f"[DEBUG] 响应内容: {response2.text}")

                # 尝试使用 execjs 执行 JavaScript
                if self.debug:
                    print("[DEBUG] 尝试使用 execjs 执行 JavaScript...")

                try:
                    # 提取 JavaScript 代码
                    script\_pattern = r'<script[^>\*>([\s\S\*?)</script>'
                    scripts = re.findall(script\_pattern, content)
                    js\_code = None
                    for script in scripts:
                        if 'acw\_sc\_\_v2' in script or '\_0x4818' in script:
                            js\_code = script
                            break

                    if js\_code:
                        # 使用 execjs 执行
                        ctx = execjs.compile(js\_code)

                        # 尝试获取 cookie
                        try:
                            # 在 JavaScript 代码后面添加获取 cookie 的代码
                            js\_code += """
                            function getCookie() {
                                var expiredate = new Date();
                                expiredate.setTime(expiredate.getTime() + 1000 \* 3600);
                                var theHost = location.host;
                                var theHostSplit = theHost.split(".");
                                var theHostSplitLength = theHostSplit.length;
                                if (!/^(\\d+\\.)\*\\d+$/.test(theHost) && theHostSplitLength > 2 && ("com.cn" != (theHost = theHostSplit[theHostSplitLength-2] + "." + theHostSplit[theHostSplitLength-1]) && "gov.cn" != theHost && "org.cn" != theHost && "net.cn" != theHost && "com.my" != theHost || (theHost = theHostSplit[theHostSplitLength-3] + "." + theHost))) {}
                                return 'acw\_sc\_\_v2=' + arg3 + '; expires=' + expiredate.toGMTString() + '; max-age=3600; path=/; domain=' + theHost;
                            }
                            getCookie();
                            """

                            ctx = execjs.compile(js\_code)
                            cookie\_str = ctx.call('getCookie')

                            # 解析 cookie
                            match = re.search(r'acw\_sc\_\_v2=([^;+)', cookie\_str)
                            if match:
                                arg3 = match.group(1)
                                self.cookies['acw\_sc\_\_v2'] = arg3
                                self.session.cookies.set('acw\_sc\_\_v2', arg3)

                                time.sleep(2)
                                response3 = self.\_request(url)

                                if response3.status\_code == 200 and 'acw\_sc\_\_v2' not in response3.text:
                                    if self.debug:
                                        print("[DEBUG] 通过 execjs 成功绕过保护")
                                    return True
                        except Exception as e:
                            if self.debug:
                                print(f"[DEBUG] execjs 执行失败: {e}")
                except Exception as e:
                    if self.debug:
                        print(f"[DEBUG] 使用 execjs 异常: {e}")

                # 尝试其他方法：模拟浏览器等待
                if self.debug:
                    print("[DEBUG] 尝试模拟浏览器等待...")

                time.sleep(5)

                # 再次请求
                response3 = self.\_request(url)

                if response3.status\_code == 200 and 'acw\_sc\_\_v2' not in response3.text:
                    if self.debug:
                        print("[DEBUG] 通过等待绕过保护")
                    return True

            # 如果状态码是 200 且没有挑战，直接成功
            if response.status\_code == 200:
                return True

            return False

        except Exception as e:
            if self.debug:
                print(f"[DEBUG] 绕过 Cloudflare 失败: {e}")
            return False

    def parse\_share\_url(self, url: str) -> Tuple[str, Optional[str]]:
        """
        解析分享链接

        Args:
            url: 分享链接

        Returns:
            (文件ID, 密码)
        """
        if self.debug:
            print(f"[DEBUG] 解析分享URL: {url}")

        # 提取文件ID
        pattern = r'(?:lanzou[a-z?\.com|woozooo\.com)/(?:i|s|b)?([a-zA-Z0-9+)'
        match = re.search(pattern, url)

        if not match:
            if self.debug:
                print("[DEBUG] 正则匹配失败，尝试从路径中提取")

            # 尝试从路径中提取
            path = urlparse(url).path
            file\_id = path.strip('/').split('/')[-1]
            if len(file\_id) >= 6:
                if self.debug:
                    print(f"[DEBUG] 从路径提取文件ID: {file\_id}")
                return file\_id, None
            else:
                raise ValueError(f"无法从URL中提取文件ID: {url}")

        file\_id = match.group(1)

        if self.debug:
            print(f"[DEBUG] 正则提取文件ID: {file\_id}")

        # 提取密码
        password = None
        if '?pwd=' in url or '?password=' in url or '?passwd=' in url:
            query = urlparse(url).query
            params = parse\_qs(query)
            for key in ['pwd', 'password', 'passwd']:
                if key in params:
                    password = params[key][0]
                    if self.debug:
                        print(f"[DEBUG] 从URL提取密码: {password}")
                    break

        return file\_id, password

    def get\_file\_info(self, share\_url: str) -> Dict:
        """
        获取文件信息 - 新版方法
        """
        if self.debug:
            print(f"[DEBUG] 开始获取文件信息: {share\_url}")

        file\_id, password = self.parse\_share\_url(share\_url)
        info = {'id': file\_id, 'password': password}

        if self.debug:
            print(f"[DEBUG] 文件ID: {file\_id}, 密码: {password or '无'}")

        # 先尝试绕过 Cloudflare
        if not self.bypass\_cloudflare(share\_url):
            raise Exception("无法绕过 Cloudflare 保护，请稍后重试")

        # 获取页面内容
        headers = {
            'Referer': 'https://www.lanzou.com/',
            'Origin': 'https://www.lanzou.com',
        }

        response = self.\_request(share\_url, headers=headers)

        if response.status\_code != 200:
            raise Exception(f"无法访问分享页面: {share\_url}")

        soup = BeautifulSoup(response.text, 'html.parser')

        # 检查是否需要密码
        password\_indicators = ['输入密码', 'pwdload', '请输入提取码', '提取码', 'password', '输入访问码']
        needs\_password = any(indicator in response.text for indicator in password\_indicators)

        if needs\_password:
            if self.debug:
                print("[DEBUG] 检测到需要密码")

            if not password:
                password = input(f"文件 {file\_id} 需要密码，请输入: ")
                info['password'] = password

            # 尝试提交密码
            # 查找密码表单
            form = soup.find('form', {'id': 'pwdload'})
            if form:
                action = form.get('action', '')
                if not action.startswith('http'):
                    # 构建完整URL
                    base\_url = urlparse(share\_url)
                    action = f"{base\_url.scheme}://{base\_url.netloc}{action}"

                # 提取表单字段
                form\_data = {}
                for input\_tag in form.find\_all('input'):
                    name = input\_tag.get('name')
                    value = input\_tag.get('value', '')
                    if name and name != 'pwd':
                        form\_data[name] = value

                form\_data['pwd'] = password

                if self.debug:
                    print(f"[DEBUG] 提交密码表单到: {action}")
                    print(f"[DEBUG] 表单数据: {form\_data}")

                response = self.\_request(action, method='POST', data=form\_data, headers=headers)

                if response.status\_code != 200:
                    if self.debug:
                        print(f"[DEBUG] 密码验证失败，响应: {response.text[:200]}")
                    raise Exception("密码错误或验证失败")
                else:
                    if self.debug:
                        print("[DEBUG] 密码验证成功")

                    # 更新soup
                    soup = BeautifulSoup(response.text, 'html.parser')

        # 保存原始页面内容用于分析
        page\_content = response.text

        # 从页面中提取所有隐藏的表单字段
        form\_fields = {}
        forms = soup.find\_all('form')
        for form in forms:
            inputs = form.find\_all('input')
            for input\_tag in inputs:
                name = input\_tag.get('name')
                value = input\_tag.get('value', '')
                if name:
                    form\_fields[name] = value

        if self.debug and form\_fields:
            print(f"[DEBUG] 找到的表单字段: {form\_fields}")

        # 从页面中提取 sign 参数
        sign = None
        # 查找 sign input
        sign\_input = soup.find('input', {'name': 'sign'})
        if sign\_input:
            sign = sign\_input.get('value')
        else:
            # 尝试从 JavaScript 中提取 sign
            script\_tags = soup.find\_all('script')
            for script in script\_tags:
                if script.string and 'sign' in script.string:
                    # 尝试匹配 sign: 'xxx' 或 sign = 'xxx'
                    sign\_match = re.search(r"sign\s\*[:=\s\*['\"]([^'\"+)['\"", script.string)
                    if sign\_match:
                        sign = sign\_match.group(1)
                        break

            if not sign:
                # 如果没有找到，使用文件ID
                sign = file\_id

        # 尝试从页面中提取 ajaxdata
        ajax\_data = None
        # 查找包含 ajaxdata 的脚本
        for script in soup.find\_all('script'):
            if script.string and 'ajaxdata' in script.string:
                # 尝试匹配 ajaxdata = 'xxx'
                ajax\_match = re.search(r"ajaxdata\s\*=\s\*['\"]([^'\"+)['\"", script.string)
                if ajax\_match:
                    ajax\_data = ajax\_match.group(1)
                    break

        info['sign'] = sign
        info['ajax\_data'] = ajax\_data
        info['form\_fields'] = form\_fields
        info['page\_content'] = page\_content

        # 提取文件信息
        if self.debug:
            print(f"[DEBUG] 页面标题: {soup.title.string if soup.title else '无'}")
            print(f"[DEBUG] 提取到的 sign: {sign}")
            print(f"[DEBUG] 提取到的 ajax\_data: {ajax\_data}")

        # 提取文件名
        title\_tag = soup.find('title')
        if title\_tag:
            filename = title\_tag.text.strip()
            if ' - 蓝奏云' in filename:
                filename = filename.replace(' - 蓝奏云', '')
            elif ' - 蓝奏网盘' in filename:
                filename = filename.replace(' - 蓝奏网盘', '')
            info['filename'] = filename

            if self.debug:
                print(f"[DEBUG] 提取文件名: {filename}")
        else:
            # 尝试从其他位置提取文件名
            filename\_selectors = [
                ('meta', {'property': 'og:title'}),
                ('meta', {'name': 'description'}),
                ('div', {'class': 'md'}),
                ('h3', {}),
                ('h4', {}),
                ('span', {'class': 'file-name'}),
            ]

            for tag\_name, attrs in filename\_selectors:
                element = soup.find(tag\_name, attrs)
                if element and element.get\_text().strip():
                    filename = element.get\_text().strip()
                    info['filename'] = filename
                    if self.debug:
                        print(f"[DEBUG] 从{tag\_name}提取文件名: {filename}")
                    break

            if 'filename' not in info:
                # 使用文件ID作为文件名
                info['filename'] = f'file\_{file\_id}'
                if self.debug:
                    print(f"[DEBUG] 未找到文件名，使用默认: {info['filename']}")

        # 提取文件大小
        size\_patterns = [
            r'文件大小[：:\s\*([\d\.+\s\*[BKMGT?)',
            r'size[：:\s\*([\d\.+\s\*[BKMGT?)',
            r'文件大小\s\*</span>\s\*<span[^>\*>([^<+)</span>',
            r'大小\s\*</span>\s\*<span[^>\*>([^<+)</span>',
        ]

        for pattern in size\_patterns:
            size\_match = re.search(pattern, response.text)
            if size\_match:
                info['size'] = size\_match.group(1).strip()
                if self.debug:
                    print(f"[DEBUG] 提取文件大小: {info['size']}")
                break
        else:
            info['size'] = '未知'
            if self.debug:
                print("[DEBUG] 未找到文件大小信息")

        # 保存页面内容用于调试
        if self.debug:
            debug\_dir = "debug\_pages"
            os.makedirs(debug\_dir, exist\_ok=True)
            debug\_file = os.path.join(debug\_dir, f"{file\_id}\_page\_final.html")
            with open(debug\_file, 'w', encoding='utf-8') as f:
                f.write(response.text)
            print(f"[DEBUG] 最终页面已保存到: {debug\_file}")

            # 也保存清理后的HTML用于分析
            debug\_file\_clean = os.path.join(debug\_dir, f"{file\_id}\_clean\_final.html")
            with open(debug\_file\_clean, 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            print(f"[DEBUG] 格式化最终页面已保存到: {debug\_file\_clean}")

        return info

    def get\_direct\_url(self, file\_info: Dict) -> str:
        """
        获取直接下载链接 - 新版方法
        """
        if self.debug:
            print(f"[DEBUG] 开始获取直接下载链接")
            print(f"[DEBUG] 文件信息: {file\_info}")

        file\_id = file\_info['id']
        sign = file\_info.get('sign', file\_id)
        ajax\_data = file\_info.get('ajax\_data')

        # 如果页面中没有提供ajaxdata，我们需要分析页面内容来获取
        if not ajax\_data:
            # 从页面内容中提取ajaxdata
            page\_content = file\_info.get('page\_content', '')
            if page\_content:
                # 尝试从页面中提取ajaxdata
                ajax\_patterns = [
                    r'ajaxdata\s\*=\s\*["\']([^"\'+)["\'',
                    r'data\s\*:\s\*["\']([^"\'+)["\'',
                ]

                for pattern in ajax\_patterns:
                    match = re.search(pattern, page\_content)
                    if match:
                        ajax\_data = match.group(1)
                        break

        # 尝试使用不同的API端点
        endpoints = [
            f"https://wwa.lanzoue.com/ajaxm.php",
            f"https://wwa.lanzoui.com/ajaxm.php",
        ]

        # 尝试不同的请求数据组合
        data\_templates = []

        # 模板1: 使用 sign 和 ves
        data\_templates.append({
            'action': 'downprocess',
            'sign': sign,
            'ves': '1',
        })

        # 模板2: 如果页面中有ajaxdata，尝试使用
        if ajax\_data:
            data\_templates.append({
                'action': 'downprocess',
                'sign': sign,
                'ves': '1',
                'websign': ajax\_data,
            })

            # 模板3: 只使用ajaxdata作为sign
            data\_templates.append({
                'action': 'downprocess',
                'sign': ajax\_data,
                'ves': '1',
            })

        # 模板4: 使用页面中的表单字段
        form\_fields = file\_info.get('form\_fields', {})
        if form\_fields:
            data\_templates.append(form\_fields)

        headers = {
            'Referer': f'https://wwa.lanzoue.com/{file\_id}',
            'Origin': 'https://wwa.lanzoue.com',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        }

        for endpoint in endpoints:
            for data\_template in data\_templates:
                try:
                    if self.debug:
                        print(f"[DEBUG] 尝试API请求: {endpoint}")
                        print(f"[DEBUG] 请求数据: {data\_template}")

                    response = self.\_request(endpoint, method='POST', data=data\_template, headers=headers)

                    if response.status\_code != 200:
                        if self.debug:
                            print(f"[DEBUG] API请求失败: {response.status\_code}")
                        continue

                    # 解析响应
                    try:
                        result = response.json()

                        if self.debug:
                            print(f"[DEBUG] API响应: {result}")

                        if result.get('zt') == 1:
                            dom = result.get('dom', '').replace('\\', '')
                            url = result.get('url', '')

                            if dom and url:
                                download\_url = f"{dom}/file/{url}"
                                if self.debug:
                                    print(f"[DEBUG] 从API获取下载链接: {download\_url}")
                                return download\_url
                            else:
                                continue  # 尝试下一个数据模板
                        else:
                            error\_msg = result.get('inf', '未知错误')
                            if self.debug:
                                print(f"[DEBUG] API返回错误: {error\_msg}")
                            continue  # 尝试下一个数据模板

                    except json.JSONDecodeError:
                        if self.debug:
                            print(f"[DEBUG] 响应不是JSON: {response.text[:200]}")
                        continue  # 尝试下一个数据模板

                except Exception as e:
                    if self.debug:
                        print(f"[DEBUG] API请求异常: {e}")
                    continue  # 尝试下一个端点或数据模板

        # 如果所有方法都失败，尝试从页面中直接提取下载链接
        return self.\_extract\_direct\_url\_from\_page(file\_info)

    def \_extract\_direct\_url\_from\_page(self, file\_info: Dict) -> str:
        """
        从页面中直接提取下载链接
        """
        if self.debug:
            print("[DEBUG] 尝试从页面中提取下载链接")

        file\_id = file\_info['id']
        page\_content = file\_info.get('page\_content', '')

        if not page\_content:
            raise Exception("没有页面内容可用于分析")

        # 尝试从页面中提取直接下载链接
        # 蓝奏云通常会将下载链接放在JavaScript中

        # 模式1: 查找包含文件ID和域名的URL
        patterns = [
            r'https?://[^/+/file/[^\'"+',
            r'https?://[^/+/tp/[^\'"+',
            r'https?://[^/+/\?[^\'"+',
            r'downprocess[^}+dom["\':\s\*["\']([^"\'+)["\'][^}+url["\':\s\*["\']([^"\'+)["\'',
            r'\"dom\"\s\*:\s\*\"([^\"+)\"[^}+"url\"\s\*:\s\*\"([^\"+)\"',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, page\_content)
            for match in matches:
                if isinstance(match, tuple) and len(match) == 2:
                    dom, url = match
                    download\_url = f"{dom}/file/{url}"
                    if self.debug:
                        print(f"[DEBUG] 从页面提取下载链接: {download\_url}")
                    return download\_url
                elif isinstance(match, str):
                    download\_url = match
                    if '/file/' in download\_url or '/tp/' in download\_url:
                        if self.debug:
                            print(f"[DEBUG] 从页面提取下载链接: {download\_url}")
                        return download\_url

        # 如果页面中没有直接链接，尝试使用备用方法
        # 重新请求页面，查看是否有跳转
        share\_url = f"https://wwa.lanzoue.com/{file\_id}"

        # 设置特殊的headers模拟浏览器点击下载按钮
        headers = {
            'Referer': share\_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,\*/\*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

        # 尝试直接访问一个可能的下载端点
        download\_endpoints = [
            f"https://wwa.lanzoue.com/tp/{file\_id}",
            f"https://wwa.lanzoui.com/tp/{file\_id}",
            f"https://developer-oss.lanrar.com/file/{file\_id}",
        ]

        for endpoint in download\_endpoints:
            try:
                if self.debug:
                    print(f"[DEBUG] 尝试直接访问下载端点: {endpoint}")

                response = self.\_request(endpoint, headers=headers, allow\_redirects=False)

                if response.status\_code in [301, 302, 303, 307, 308]:
                    location = response.headers.get('Location')
                    if location:
                        if self.debug:
                            print(f"[DEBUG] 从重定向获取下载链接: {location}")
                        return location

                if response.status\_code == 200:
                    # 检查响应内容是否包含下载链接
                    content = response.text
                    url\_patterns = [
                        r'https?://[^"\'>+',
                        r'location\.href\s\*=\s\*["\']([^"\'+)["\'',
                        r'window\.open\(["\']([^"\'+)["\'',
                    ]

                    for pattern in url\_patterns:
                        matches = re.findall(pattern, content)
                        for match in matches:
                            if '/file/' in match or 'http' in match:
                                if self.debug:
                                    print(f"[DEBUG] 从响应内容提取下载链接: {match}")
                                return match
            except Exception as e:
                if self.debug:
                    print(f"[DEBUG] 访问端点 {endpoint} 失败: {e}")
                continue

        # 如果所有方法都失败
        raise Exception("无法获取下载链接，页面可能已过期或需要重新加载")

    def download\_file(self, url: str, output\_path: Optional[str] = None,
                     chunk\_size: int = 8192, resume: bool = True) -> str:
        """
        下载文件
        """
        if self.debug:
            print(f"[DEBUG] 开始下载流程")
            print(f"[DEBUG] 输入URL: {url}")
            print(f"[DEBUG] 输出路径: {output\_path}")
            print(f"[DEBUG] 分块大小: {chunk\_size}")
            print(f"[DEBUG] 断点续传: {resume}")

        # 获取文件信息
        print("正在解析文件信息...")
        try:
            file\_info = self.get\_file\_info(url)
        except Exception as e:
            print(f"获取文件信息失败: {e}")
            if self.debug:
                traceback.print\_exc()
            raise

        print(f"文件信息:")
        for key, value in file\_info.items():
            if key not in ['ajax\_data', 'form\_fields', 'page\_content']:  # 不显示敏感数据
                print(f"  {key}: {value}")

        # 获取直接下载链接
        print("正在获取下载链接...")
        try:
            direct\_url = self.get\_direct\_url(file\_info)
            print(f"下载链接已获取")
            if self.debug:
                print(f"[DEBUG] 下载链接: {direct\_url}")
        except Exception as e:
            print(f"获取下载链接失败: {e}")
            if self.debug:
                traceback.print\_exc()

            debug\_dir = "debug\_pages"
            if os.path.exists(debug\_dir):
                print(f"调试HTML文件目录 '{debug\_dir}'")

            raise

        # 确定输出路径
        if not output\_path:
            filename = file\_info.get('filename', f'file\_{file\_info["id"]}')
            output\_path = filename
        elif os.path.isdir(output\_path):
            filename = file\_info.get('filename', f'file\_{file\_info["id"]}')
            output\_path = os.path.join(output\_path, filename)

        if self.debug:
            print(f"[DEBUG] 最终输出路径: {output\_path}")

        # 检查文件是否已存在
        if os.path.exists(output\_path) and resume:
            file\_size = os.path.getsize(output\_path)
            if self.debug:
                print(f"[DEBUG] 文件已存在，大小: {file\_size} 字节")

            headers = {'Range': f'bytes={file\_size}-'}
            mode = 'ab'
        else:
            file\_size = 0
            headers = {}
            mode = 'wb'
            if self.debug and os.path.exists(output\_path):
                print(f"[DEBUG] 文件已存在，但断点续传未启用，将覆盖")

        # 设置请求头
        headers.update({
            'User-Agent': self.headers['User-Agent'],
            'Referer': f'https://wwa.lanzoue.com/{file\_info["id"]}',
            'Accept-Encoding': 'identity',
        })

        if self.debug:
            print(f"[DEBUG] 下载请求头: {headers}")

        # 发送请求
        try:
            if self.debug:
                print(f"[DEBUG] 发送下载请求到: {direct\_url}")

            response = self.session.get(
                direct\_url,
                headers=headers,
                stream=True,
                timeout=self.timeout,
                cookies=self.cookies
            )

            if self.debug:
                print(f"[DEBUG] 下载响应状态码: {response.status\_code}")
                print(f"[DEBUG] 下载响应头: {dict(response.headers)}")

            if response.status\_code not in [200, 206]:
                if self.debug:
                    print(f"[DEBUG] 下载失败，响应内容: {response.text[:500]}")
                raise Exception(f"下载失败: HTTP {response.status\_code}")

            # 获取文件总大小
            content\_length = response.headers.get('content-length')
            if content\_length:
                content\_length = int(content\_length)
                total\_size = content\_length + file\_size
                if self.debug:
                    print(f"[DEBUG] 服务器返回的文件大小: {content\_length} 字节")
                    print(f"[DEBUG] 断点续传已下载: {file\_size} 字节")
                    print(f"[DEBUG] 总下载大小: {total\_size} 字节")
            else:
                total\_size = 0
                if self.debug:
                    print("[DEBUG] 服务器未返回content-length")

            # 下载文件
            print(f"开始下载: {os.path.basename(output\_path)}")

            with open(output\_path, mode) as f:
                with tqdm(
                    total=total\_size,
                    unit='B',
                    unit\_scale=True,
                    unit\_divisor=1024,
                    initial=file\_size,
                    desc=os.path.basename(output\_path)
                ) as pbar:
                    for chunk in response.iter\_content(chunk\_size=chunk\_size):
                        if chunk:
                            f.write(chunk)
                            pbar.update(len(chunk))

            final\_size = os.path.getsize(output\_path)
            if self.debug:
                print(f"[DEBUG] 下载完成，文件最终大小: {final\_size} 字节")

            print(f"下载完成: {output\_path}")
            return output\_path

        except Exception as e:
            if self.debug:
                print(f"[DEBUG] 下载过程异常: {e}")
                traceback.print\_exc()

            # 检查文件是否部分下载
            if os.path.exists(output\_path):
                partial\_size = os.path.getsize(output\_path)
                print(f"下载中断，已下载 {partial\_size} 字节")

            raise
def main():
    parser = argparse.ArgumentParser(description='蓝奏云下载工具 - 反爬虫版本')
    parser.add\_argument('url', help='分享链接')
    parser.add\_argument('-o', '--output', help='输出路径（文件或目录）')
    parser.add\_argument('-t', '--timeout', type=int, default=30, help='请求超时时间（秒）')
    parser.add\_argument('-r', '--resume', action='store\_true', help='断点续传')
    parser.add\_argument('-d', '--debug', action='store\_true', help='启用调试模式')
    parser.add\_argument('-p', '--password', help='文件密码（如果需要）')

    args = parser.parse\_args()

    if not args.url:
        parser.print\_help()
        return

    try:
        if args.debug:
            print(f"[DEBUG] 命令行参数: {args}")

        # 创建下载器
        downloader = LanzouDownloader(timeout=args.timeout, debug=args.debug)

        # 如果提供了密码，将其添加到URL中
        url = args.url
        if args.password:
            if '?' in url:
                url += f'&pwd={args.password}'
            else:
                url += f'?pwd={args.password}'

        # 下载文件
        downloader.download\_file(
            url=url,
            output\_path=args.output,
            resume=args.resume
        )

    except KeyboardInterrupt:
        print("\n用户中断下载")
    except Exception as e:
        print(f"错误: {e}")
        if args.debug:
            traceback.print\_exc()
if \_\_name\_\_ == '\_\_main\_\_':
    main()
