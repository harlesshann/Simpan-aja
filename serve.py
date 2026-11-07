# Server statis untuk SimpanAja (pengembangan lokal).
#
# Kenapa bukan `py -m http.server`:
#   Server bawaan tak mengirim Cache-Control, jadi browser (terutama Chrome di HP)
#   memakai modul JS lama dari cache walau file sudah diperbaiki — Simpan tampak mati.
#   Skrip ini mengirim `no-store` DAN menambahkan versi `?v=<start>` pada setiap
#   referensi modul, sehingga URL berubah tiap server dijalankan ulang dan cache lama
#   tak pernah terpakai lagi. Tidak perlu clear cache di HP.
import http.server
import os
import re
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
PORT = 8000
VERSION = str(int(time.time()))

# import ... from './x.js'  |  import('./x.js')  |  src="src/x.js"
JS_FROM = re.compile(rb"(\bfrom\s*['\"])(\.{1,2}/[^'\"]+?\.js)(['\"])")
JS_DYN = re.compile(rb"(\bimport\s*\(\s*['\"])([^'\"]+?\.js)(['\"]\s*\))")
HTML_REF = re.compile(rb"((?:src|href)=\")((?:\./)?src/[A-Za-z0-9_.-]+\.js)(\")")


def version_js(body: bytes) -> bytes:
    marker = b"?v=" + VERSION.encode()
    body = JS_FROM.sub(lambda m: m.group(1) + m.group(2) + marker + m.group(3), body)
    body = JS_DYN.sub(lambda m: m.group(1) + m.group(2) + marker + m.group(3), body)
    return body


def version_html(body: bytes) -> bytes:
    marker = b"?v=" + VERSION.encode()
    return HTML_REF.sub(lambda m: m.group(1) + m.group(2) + marker + m.group(3), body)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.isfile(index):
                path = index
        if os.path.isfile(path) and path.endswith(".js"):
            return self._send(self._read(path), version_js, "text/javascript; charset=utf-8")
        if os.path.isfile(path) and path.endswith(".html"):
            return self._send(self._read(path), version_html, "text/html; charset=utf-8")
        return super().do_GET()

    @staticmethod
    def _read(path: str) -> bytes:
        with open(path, "rb") as f:
            return f.read()

    def _send(self, body: bytes, transform, content_type: str):
        body = transform(body)
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


http.server.ThreadingHTTPServer.allow_reuse_address = True
with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"SimpanAja: http://localhost:{PORT}/  (LAN: http://<ip>:{PORT}/)  versi={VERSION}")
    httpd.serve_forever()
