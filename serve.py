# Server statis untuk SimpanAja.
# Kenapa bukan `py -m http.server`: server bawaan tidak mengirim Cache-Control,
# sehingga Chrome di HP memakai JS lama dari cache berjam-jam (Simpan tampak mati
# walau file sudah diperbaiki). Skrip ini menyajikan folder `app/` dengan no-store.
import http.server
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


http.server.ThreadingHTTPServer.allow_reuse_address = True
with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"SimpanAja: http://localhost:{PORT}/  (LAN: http://<ip>:{PORT}/)")
    httpd.serve_forever()
