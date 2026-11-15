"""Serve Ark's bundled assets on loopback, without household-data APIs."""
import argparse
import functools
import hashlib
import http.client
import http.server
import json
import os
from pathlib import Path
import socket
from urllib.parse import unquote, urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
ASSETS = {'/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css',
          '/core.js': 'core.js', '/app.js': 'app.js', '/icon.svg': 'icon.svg'}
HEALTH_PATH = '/__ark_health'


def product_version():
    """Customer bundles use the manifest; developer checkouts use package.json."""
    for name in ('RELEASE_MANIFEST.json', 'package.json'):
        try:
            data = json.loads((ROOT / name).read_text(encoding='utf-8-sig'))
            value = data.get('version')
            if isinstance(value, str) and len(value) < 40:
                return value
        except (OSError, ValueError, TypeError):
            continue
    return 'unknown'


def installation_id():
    # Identify a second launch from the same folder without revealing its path.
    location = os.path.normcase(str(PUBLIC.resolve()))
    return hashlib.sha256(location.encode('utf-8')).hexdigest()


def health_payload():
    return {'app': 'ark-handover', 'protocol': 1, 'version': product_version(),
            'installation': installation_id()}


class LocalServer(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True
    # On Windows, address reuse can permit a second process to bind the same port.
    allow_reuse_address = os.name != 'nt'

    def server_bind(self):
        if os.name == 'nt' and hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = 'ArkLocal'
    sys_version = ''

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        super().end_headers()

    def _allowed_request(self):
        port = self.server.server_address[1]
        allowed = {f'localhost:{port}', f'127.0.0.1:{port}'}
        if port == 80:
            allowed.update({'localhost', '127.0.0.1'})
        hosts = self.headers.get_all('Host', [])
        if len(hosts) != 1 or hosts[0].strip().lower() not in allowed:
            self.send_error(403, 'Use the localhost address shown by the Ark launcher.')
            return False
        origin = self.headers.get('Origin')
        if origin and origin not in {f'http://{host}' for host in allowed}:
            self.send_error(403, 'Cross-origin requests are not allowed.')
            return False
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            self.send_error(403, 'Cross-site requests are not allowed.')
            return False
        return True

    def _serve(self, head=False):
        if not self._allowed_request():
            return
        try:
            path = unquote(urlsplit(self.path).path)
        except ValueError:
            self.send_error(400, 'Invalid request path.')
            return
        if path == HEALTH_PATH:
            payload = json.dumps(health_payload()).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            if not head:
                self.wfile.write(payload)
            return
        filename = ASSETS.get(path)
        if not filename:
            self.send_error(404, 'This resource is not part of Ark.')
            return
        target = (PUBLIC / filename).resolve()
        # A symlink accidentally added inside public must not expose other files.
        if PUBLIC.resolve() not in target.parents or not target.is_file():
            self.send_error(404, 'Ark asset not found. Extract the complete download again.')
            return
        self.path = '/' + filename
        if head:
            super().do_HEAD()
        else:
            super().do_GET()

    def do_GET(self):
        self._serve()

    def do_HEAD(self):
        self._serve(head=True)


def existing_instance_matches(port):
    """Only reuse an identified Ark instance from this exact installation."""
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=1.5)
    try:
        connection.request('GET', HEALTH_PATH, headers={'Host': f'localhost:{port}'})
        response = connection.getresponse()
        if response.status != 200:
            return False
        payload = response.read(4097)
        return len(payload) <= 4096 and json.loads(payload) == health_payload()
    except (OSError, ValueError, http.client.HTTPException):
        return False
    finally:
        connection.close()


def open_browser(url):
    try:
        if webbrowser.open(url):
            return
    except (webbrowser.Error, OSError):
        pass
    print(f'The browser could not be opened automatically. Open this address yourself: {url}')


def main():
    parser = argparse.ArgumentParser(description='Run Ark locally. No cloud connection.')
    parser.add_argument('--open', action='store_true', help='Open or safely reuse this Ark instance')
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535.')
    missing = [name for name in ASSETS.values() if not (PUBLIC / name).is_file()]
    if missing:
        parser.exit(1, 'Ark files are missing. Extract the entire ZIP before running the launcher.\n')
    handler = functools.partial(Handler, directory=str(PUBLIC))
    url = f'http://localhost:{args.port}/'
    try:
        server = LocalServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        if args.open and existing_instance_matches(args.port):
            print(f'Ark is already running from this folder. Reopening {url}')
            open_browser(url)
            return
        parser.exit(1, f'Cannot start Ark on port {args.port}: {error}\n'
                    'Another application or a different Ark copy may be using that port.\n'
                    'Close that application and try again. Ark will not silently open an unknown server or switch storage locations.\n'
                    'Advanced: --port NUMBER uses separate browser storage; transfer notes with backup/restore.\n')
    print(f'Ark {product_version()} is running at {url}\nKeep this window open. Press Ctrl+C to stop.')
    if args.open:
        open_browser(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
