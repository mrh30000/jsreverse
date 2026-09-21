"""URL 级整包替换：只把 static.geetest.com 的 gcaptcha4.js 换成本地解混淆版，其余资源原样反代。
对照组：browsertest/mode.txt 写 orig 则回源原始混淆版。
"""

import http.client
import json
import pathlib
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).parent.resolve()
DEOBF = HERE / "output_local.js"
ORIG = HERE.parent / "gcaptcha4.js"
TARGET = re.compile(r"^/v4/static/[^/]+/js/gcaptcha4\.js")
API = re.compile(r"^/(load|verify)\b")
APILOG = HERE / "api_log.jsonl"
TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
}


def mode():
    f = HERE / "mode.txt"
    return f.read_text(encoding="utf-8").strip() if f.exists() else "local"


class Handler(BaseHTTPRequestHandler):
    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self, host, path, ctype_fallback="application/octet-stream"):
        conn = http.client.HTTPSConnection(host, timeout=20)
        conn.request(
            "GET", path, headers={"User-Agent": self.headers.get("User-Agent", "")}
        )
        resp = conn.getresponse()
        body = resp.read()
        ctype = resp.getheader("Content-Type") or ctype_fallback
        conn.close()
        return body, ctype

    def do_GET(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if TARGET.match(path):
            return self._send(
                (ORIG if mode() == "orig" else DEOBF).read_bytes(), TYPES[".js"]
            )
        local = (HERE / path.lstrip("/")).resolve()
        if (
            str(local).startswith(str(HERE)) and local.is_file()
        ):  # 仅本目录文件，挡掉路径穿越
            return self._send(
                local.read_bytes(), TYPES.get(local.suffix, "application/octet-stream")
            )
        api = API.match(path)
        if api:
            body, ctype = self._proxy("gcaptcha4.geetest.com", self.path)
            with APILOG.open("a", encoding="utf-8") as f:
                f.write(
                    json.dumps(
                        {
                            "kind": api.group(1),
                            "req": self.path,
                            "resp": body.decode("utf-8", "replace")[:4000],
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
            return self._send(body, ctype)
        body, ctype = self._proxy("static.geetest.com", path)
        return self._send(body, ctype)

    # pi-lens-ignore: no-unused-vars  (与 BaseHTTPRequestHandler 签名保持一致，用于静默访问日志)
    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8799), Handler).serve_forever()
