"""Build a versioned, checksummed customer download from an explicit allowlist."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parent
DIST_NAME = 'Ark-Family-OS-Digital-Edition'
OUTPUT = ROOT / f'{DIST_NAME}.zip'
MANIFEST_NAME = 'RELEASE_MANIFEST.json'
FILES = ['Start-Ark.bat', 'Start-Ark.command', 'README_START_HERE.txt',
         'PRINTABLE_EMERGENCY_RUNBOOK_CHECKLIST.md', 'PRIVACY_AND_SECURITY.md',
         'SUPPORT.md', 'server.py', 'public/index.html', 'public/style.css',
         'public/core.js', 'public/app.js', 'public/icon.svg']


def release_version():
    value = json.loads((ROOT / 'package.json').read_text(encoding='utf-8-sig'))['version']
    if not isinstance(value, str) or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?', value):
        raise ValueError('package.json must contain a valid release version.')
    return value


def release_bytes(name):
    source = ROOT / name
    if source.is_symlink() or ROOT.resolve() not in source.resolve().parents:
        raise ValueError(f'Release source must be a regular file inside the project: {name}')
    content = source.read_bytes()
    # Normalize every text payload, so packaging is reproducible across hosts.
    content = content.replace(b'\r\n', b'\n')
    if name.endswith('.bat'):
        return content.replace(b'\n', b'\r\n')
    return content


def _write_entry(archive, name, content, executable=False):
    info = ZipInfo(f'{DIST_NAME}/{name}', date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.create_system = 3
    info.external_attr = (0o100755 if executable else 0o100644) << 16
    archive.writestr(info, content)


def create_package(output=None):
    output = Path(output) if output is not None else OUTPUT
    if output.suffix.lower() != '.zip':
        raise ValueError('Release output must end in .zip.')
    output.parent.mkdir(parents=True, exist_ok=True)
    # Preflight and snapshot all input before touching the previous artifact.
    version = release_version()
    payloads = {name: release_bytes(name) for name in FILES}
    manifest = {'format': 1, 'product': 'Ark household handover', 'version': version,
                'files': {name: {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
                          for name, content in payloads.items()}}
    manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode('utf-8')
    temporary = None
    checksum_temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=output.parent, prefix=output.name + '.', suffix='.tmp', delete=False) as handle:
            temporary = Path(handle.name)
        with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
            for name, content in payloads.items():
                _write_entry(archive, name, content, executable=name.endswith('.command'))
            _write_entry(archive, MANIFEST_NAME, manifest_bytes)
        with ZipFile(temporary) as archive:
            bad = archive.testzip()
            if bad:
                raise ValueError(f'Archive integrity check failed: {bad}')
        digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
        checksum = output.with_name(output.name + '.sha256')
        with tempfile.NamedTemporaryFile(dir=output.parent, prefix=checksum.name + '.', suffix='.tmp', delete=False) as handle:
            checksum_temporary = Path(handle.name)
            handle.write(f'{digest}  {output.name}\n'.encode('utf-8'))
        temporary.replace(output)
        checksum_temporary.replace(checksum)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        if checksum_temporary is not None:
            checksum_temporary.unlink(missing_ok=True)
    # Escaped display names also work in Windows consoles using a legacy encoding.
    print(f'Built Ark {version}: {output.name!a}, {output.stat().st_size:,} bytes, {len(FILES) + 1} files.')
    print(f'SHA-256: {digest}')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    create_package(parser.parse_args().output)
