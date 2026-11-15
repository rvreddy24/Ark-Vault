"""The local launcher serves only bundled assets and safely handles repeated launches."""
import functools
import http.client
import http.server
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import subprocess
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ark_server', ROOT / 'server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.public = Path(cls.temporary.name) / 'public'
        cls.public.mkdir()
        for name in set(server.ASSETS.values()):
            (cls.public / name).write_text('bundled asset', encoding='utf-8')
        (cls.public / 'personal-backup.json').write_text('must not be served', encoding='utf-8')
        cls.public_patch = patch.object(server, 'PUBLIC', cls.public)
        cls.public_patch.start()
        handler = functools.partial(server.Handler, directory=str(cls.public))
        cls.httpd = server.LocalServer(('127.0.0.1', 0), handler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=3)
        cls.public_patch.stop()
        cls.temporary.cleanup()

    def request(self, path='/', method='GET', headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=3)
        supplied = {'Host': f'localhost:{self.port}'}
        supplied.update(headers or {})
        connection.request(method, path, headers=supplied)
        response = connection.getresponse()
        result = (response.status, dict(response.getheaders()), response.read())
        connection.close()
        return result

    def test_bundled_assets_and_head_headers(self):
        for path in server.ASSETS:
            status, headers, content = self.request(path)
            self.assertEqual(status, 200, path)
            self.assertEqual(content, b'bundled asset')
            self.assertEqual(headers['Cache-Control'], 'no-store')
            self.assertEqual(headers['X-Frame-Options'], 'DENY')
            self.assertEqual(headers['Cross-Origin-Resource-Policy'], 'same-origin')
        status, _, body = self.request('/index.html', method='HEAD')
        self.assertEqual(status, 200)
        self.assertEqual(body, b'')

    def test_arbitrary_host_origin_and_cross_site_requests_are_denied(self):
        for headers in ({'Host': f'attacker.example:{self.port}'},
                        {'Host': f'localhost:{self.port}.attacker.example'},
                        {'Origin': 'https://attacker.example'},
                        {'Sec-Fetch-Site': 'cross-site'}):
            self.assertEqual(self.request(headers=headers)[0], 403)

    def test_unknown_files_directories_and_traversal_are_denied(self):
        for path in ('/personal-backup.json', '/folder/', '/../server.py', '/%2e%2e/server.py', '/.git/config'):
            status, _, content = self.request(path)
            self.assertEqual(status, 404, path)
            self.assertNotIn(b'must not be served', content)

    def test_health_exposes_no_paths_and_matches_same_installation(self):
        status, _, content = self.request(server.HEALTH_PATH)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(content), server.health_payload())
        self.assertNotIn(str(self.public).encode(), content)
        self.assertTrue(server.existing_instance_matches(self.port))

    def test_symlink_outside_public_cannot_be_served(self):
        link = self.public / 'style.css'
        original = link.read_bytes()
        outside = Path(self.temporary.name) / 'private.txt'
        outside.write_text('outside-secret', encoding='utf-8')
        link.unlink()
        try:
            try:
                link.symlink_to(outside)
            except OSError:
                self.skipTest('This host does not permit test symlinks.')
            status, _, body = self.request('/style.css')
            self.assertEqual(status, 404)
            self.assertNotIn(b'outside-secret', body)
        finally:
            if link.is_symlink():
                link.unlink()
            link.write_bytes(original)

    def test_port_collision_only_reuses_verified_same_install(self):
        with patch('sys.argv', ['server.py', '--open']), \
                patch.object(server, 'LocalServer', side_effect=OSError('occupied')), \
                patch.object(server, 'existing_instance_matches', return_value=True), \
                patch.object(server, 'open_browser') as browser:
            server.main()
            browser.assert_called_once_with('http://localhost:5000/')
        with patch('sys.argv', ['server.py', '--open']), \
                patch.object(server, 'LocalServer', side_effect=OSError('occupied')), \
                patch.object(server, 'existing_instance_matches', return_value=False), \
                patch.object(server, 'open_browser') as browser:
            with self.assertRaises(SystemExit) as error:
                server.main()
            self.assertEqual(error.exception.code, 1)
            browser.assert_not_called()

    def test_invalid_port_fails_before_server_creation(self):
        with patch('sys.argv', ['server.py', '--port', '0']), patch.object(server, 'LocalServer') as local:
            with self.assertRaises(SystemExit):
                server.main()
            local.assert_not_called()

    @unittest.skipUnless(os.name == 'nt', 'Windows batch execution requires cmd.exe.')
    def test_windows_launcher_handles_spaces_and_unicode_paths(self):
        # A stub server records invocation without opening a real browser.
        with tempfile.TemporaryDirectory(prefix='Ark launch Ω ') as folder:
            location = Path(folder)
            (location / 'public').mkdir()
            (location / 'public/index.html').write_text('fixture', encoding='utf-8')
            (location / 'Start-Ark.bat').write_bytes((ROOT / 'Start-Ark.bat').read_bytes())
            (location / 'server.py').write_text(
                'import json,sys\nfrom pathlib import Path\n'
                'Path(__file__).with_name("invocation.json").write_text(json.dumps(sys.argv[1:]))\n',
                encoding='utf-8')
            result = subprocess.run(['cmd.exe', '/d', '/c', str(location / 'Start-Ark.bat')],
                                    cwd=folder, capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(json.loads((location / 'invocation.json').read_text()), ['--open'])

    @unittest.skipUnless(sys.platform == 'darwin', 'macOS launcher execution requires a Mac runner.')
    def test_mac_launcher_handles_spaces_and_unicode_paths(self):
        with tempfile.TemporaryDirectory(prefix='Ark launch Ω ') as folder:
            location = Path(folder)
            (location / 'public').mkdir()
            (location / 'public/index.html').write_text('fixture', encoding='utf-8')
            (location / 'Start-Ark.command').write_bytes((ROOT / 'Start-Ark.command').read_bytes().replace(b'\r\n', b'\n'))
            (location / 'server.py').write_text(
                'import json,sys\nfrom pathlib import Path\n'
                'Path(__file__).with_name("invocation.json").write_text(json.dumps(sys.argv[1:]))\n', encoding='utf-8')
            result = subprocess.run(['bash', str(location / 'Start-Ark.command')], cwd=folder, capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(json.loads((location / 'invocation.json').read_text()), ['--open'])


if __name__ == '__main__':
    unittest.main()
