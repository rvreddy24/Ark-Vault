"""Build the customer download from an explicit allowlist."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parent
DIST_NAME = 'Ark-Family-OS-Digital-Edition'
OUTPUT = ROOT / f'{DIST_NAME}.zip'
FILES = ['Start-Ark.bat', 'Start-Ark.command', 'README_START_HERE.txt',
         'PRINTABLE_EMERGENCY_RUNBOOK_CHECKLIST.md', 'PRIVACY_AND_SECURITY.md',
         'server.py', 'public/index.html', 'public/style.css', 'public/core.js',
         'public/app.js', 'public/icon.svg']

def release_bytes(name):
    content = (ROOT / name).read_bytes()
    # Launchers must work regardless of the packager host's checkout settings.
    if name.endswith('.bat'):
        return content.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
    if name.endswith('.command'):
        return content.replace(b'\r\n', b'\n')
    return content

def create_package():
    for name in FILES:
        if not (ROOT / name).is_file():
            raise FileNotFoundError(name)
    temporary = OUTPUT.with_suffix('.zip.tmp')
    with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
        for name in FILES:
            info = ZipInfo(f'{DIST_NAME}/{name}', date_time=(2026, 11, 15, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (0o100755 if name.endswith('.command') else 0o100644) << 16
            archive.writestr(info, release_bytes(name))
    temporary.replace(OUTPUT)
    print(f'Built {OUTPUT.name}: {OUTPUT.stat().st_size:,} bytes, {len(FILES)} files.')

if __name__ == '__main__':
    create_package()
