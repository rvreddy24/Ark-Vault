"""
Ark Vault — Digital Download Release Packager
Generates a clean, customer-ready ZIP bundle for Gumroad, Etsy, Lemon Squeezy, or Shopify.
"""

import os
import zipfile
import datetime

DIST_NAME = "Ark-Family-OS-Digital-Edition"
VAULT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_ZIP = os.path.join(VAULT_ROOT, f"{DIST_NAME}.zip")

# Customer-facing deliverables to include in the ZIP package
INCLUDED_FILES = [
    "Start-Ark.bat",
    "Start-Ark.command",
    "README_START_HERE.txt",
    "PRINTABLE_EMERGENCY_RUNBOOK_CHECKLIST.md",
    "server.py",
]

INCLUDED_DIRS = [
    "public"
]

def create_package():
    print(f"📦 Packaging Ark Vault Digital Edition into: {OUTPUT_ZIP}")
    
    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)

    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add root files
        for fname in INCLUDED_FILES:
            fpath = os.path.join(VAULT_ROOT, fname)
            if os.path.exists(fpath):
                arcname = os.path.join(DIST_NAME, fname)
                zipf.write(fpath, arcname)
                print(f"  + Added: {fname}")
            else:
                print(f"  [!] Missing file: {fname}")

        # Add directories
        for dname in INCLUDED_DIRS:
            dpath = os.path.join(VAULT_ROOT, dname)
            if os.path.exists(dpath):
                for root, _, files in os.walk(dpath):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, VAULT_ROOT)
                        arcname = os.path.join(DIST_NAME, rel_path)
                        zipf.write(full_path, arcname)
                        print(f"  + Added: {rel_path}")

    size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    print(f"\n✅ Build Complete! Package created successfully:")
    print(f"   File: {OUTPUT_ZIP}")
    print(f"   Size: {size_kb:.1f} KB")
    print(f"   Ready to upload to Gumroad / Etsy / Lemon Squeezy.")

if __name__ == '__main__':
    create_package()
