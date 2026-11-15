"""
Ark - The Family Operations & Continuity Black Box
Zero-dependency Python 3 standard library server.
Built for dual-career households and the 30-45 Sandwich Generation.
"""

import http.server
import socketserver
import os
import json
import urllib.parse

PORT = 5000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

class ArkServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "Ark Family OS"}).encode('utf-8'))
            return
        return super().do_GET()

if __name__ == '__main__':
    print(f"🛡️ Ark Family OS running locally at: http://localhost:{PORT}")
    with socketserver.TCPServer(("", PORT), ArkServerHandler) as httpd:
        httpd.serve_forever()
