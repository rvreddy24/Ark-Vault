"""Release contract checks, isolated from the tracked customer artifact."""
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('package_release', ROOT / 'package_release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class RuntimeAssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.remote_assets = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        # A user-initiated support anchor is not an automatically loaded asset.
        address = values.get('src') if tag in {'script', 'img', 'iframe', 'audio', 'video', 'source'} else None
        if tag == 'link':
            address = values.get('href')
        if address and (address.startswith(('http:', 'https:', '//'))):
            self.remote_assets.append(address)


class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.output = Path(cls.temporary.name) / release.OUTPUT.name
        release.create_package(cls.output)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_exact_allowlist_content_and_manifest_hashes(self):
        with ZipFile(self.output) as archive:
            expected = {f'{release.DIST_NAME}/{name}' for name in release.FILES + [release.MANIFEST_NAME]}
            self.assertEqual(set(archive.namelist()), expected)
            manifest = json.loads(archive.read(f'{release.DIST_NAME}/{release.MANIFEST_NAME}'))
            self.assertEqual(manifest['version'], release.release_version())
            self.assertEqual(set(manifest['files']), set(release.FILES))
            for name in release.FILES:
                content = archive.read(f'{release.DIST_NAME}/{name}')
                self.assertEqual(content, release.release_bytes(name))
                self.assertEqual(manifest['files'][name], {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
            self.assertIsNone(archive.testzip())

    def test_launchers_have_correct_modes_and_newlines(self):
        with ZipFile(self.output) as archive:
            item = archive.getinfo(f'{release.DIST_NAME}/Start-Ark.command')
            self.assertEqual((item.external_attr >> 16) & 0o777, 0o755)
            self.assertTrue(archive.read(item).startswith(b'#!/usr/bin/env bash\n'))
            self.assertNotIn(b'\r', archive.read(item))
            launcher = archive.read(f'{release.DIST_NAME}/Start-Ark.bat')
            self.assertNotIn(b'\n', launcher.replace(b'\r\n', b''))

    def test_runtime_has_no_remote_assets(self):
        html = (ROOT / 'public/index.html').read_text(encoding='utf-8-sig')
        parser = RuntimeAssetParser()
        parser.feed(html)
        self.assertEqual(parser.remote_assets, [])
        self.assertIn("connect-src 'none'", html)

    def test_checksum_and_reproducibility(self):
        expected = hashlib.sha256(self.output.read_bytes()).hexdigest()
        checksum = self.output.with_name(self.output.name + '.sha256').read_text()
        self.assertEqual(checksum, f'{expected}  {self.output.name}\n')
        other = Path(self.temporary.name) / 'second Ω.zip'
        release.create_package(other)
        self.assertEqual(other.read_bytes(), self.output.read_bytes())

    def test_missing_payload_does_not_destroy_previous_release(self):
        previous = self.output.read_bytes()
        with patch.object(release, 'FILES', release.FILES + ['does-not-exist.txt']):
            with self.assertRaises(FileNotFoundError):
                release.create_package(self.output)
        self.assertEqual(self.output.read_bytes(), previous)
        self.assertEqual(list(Path(self.temporary.name).glob('*.tmp')), [])


if __name__ == '__main__':
    unittest.main()
