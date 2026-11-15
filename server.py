"""Serve bundled Ark assets on loopback only. Python standard library."""
import argparse
import functools
import http.server
from pathlib import Path
import webbrowser

PUBLIC = Path(__file__).resolve().parent / 'public'

class LocalServer(http.server.ThreadingHTTPServer):
    # Cold starts can request several assets at once, especially with multiple tabs.
    request_queue_size = 128

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'DENY')
        super().end_headers()

def main():
    parser = argparse.ArgumentParser(description='Run Ark locally. No cloud connection.')
    parser.add_argument('--open', action='store_true')
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    handler = functools.partial(Handler, directory=str(PUBLIC))
    try:
        server = LocalServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        parser.exit(1, f'Cannot start Ark on port {args.port}: {error}\nClose the other server or choose --port NUMBER. A different port uses separate browser storage.\n')
    url = f'http://localhost:{args.port}/'
    print(f'Ark is running at {url}\nKeep this window open. Press Ctrl+C to stop.')
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
