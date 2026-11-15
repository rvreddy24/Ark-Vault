"""Package contract tests: allowlist, content, and cross-platform launcher modes."""
import importlib.util
from pathlib import Path
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('package_release', ROOT / 'package_release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        release.create_package()

    def test_exact_allowlist_and_content(self):
        with ZipFile(release.OUTPUT) as archive:
            self.assertEqual(set(archive.namelist()), {f'{release.DIST_NAME}/{name}' for name in release.FILES})
            for name in release.FILES:
                self.assertEqual(archive.read(f'{release.DIST_NAME}/{name}'), release.release_bytes(name))

    def test_mac_launcher_is_executable_without_bom_or_crlf(self):
        with ZipFile(release.OUTPUT) as archive:
            item = archive.getinfo(f'{release.DIST_NAME}/Start-Ark.command')
            self.assertEqual((item.external_attr >> 16) & 0o777, 0o755)
            self.assertTrue(archive.read(item).startswith(b'#!/usr/bin/env bash\n'))
            self.assertNotIn(b'\r', archive.read(item))

    def test_runtime_has_no_remote_assets(self):
        html = (ROOT / 'public/index.html').read_text(encoding='utf-8-sig')
        self.assertNotIn('https://', html)
        self.assertIn("connect-src 'none'", html)
        with ZipFile(release.OUTPUT) as archive:
            launcher = archive.read(f'{release.DIST_NAME}/Start-Ark.bat')
            self.assertNotIn(b'\n', launcher.replace(b'\r\n', b''))

if __name__ == '__main__':
    unittest.main()
