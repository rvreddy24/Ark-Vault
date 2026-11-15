# Ark support and recovery

## Open the complete download

Extract the entire ZIP first. Keep the extracted folder in one stable location. Do not run files from inside the ZIP preview.

**Portable mode — no Python or installation required:** open the `public` folder, then double-click `index.html` in a current desktop browser. Use that same browser profile and file location every time. File-based storage varies between browsers; keep an encrypted backup and a current printed packet. Private/incognito mode is unsuitable for keeping the only copy of your notes.

**Local-server mode — consistent browser origin:** install Python 3.9 or later, then open `Start-Ark.bat` on Windows. On macOS, open Terminal in the extracted folder and run `bash Start-Ark.command`. Keep the server window open and use `http://localhost:5000/`. The launchers fall back to portable mode only when a suitable Python is unavailable; they do not silently switch to portable mode after a server error.

A downloaded command launcher may trigger an operating-system warning. You can use portable mode without executing a shell launcher. Do not disable operating-system security protections simply to open Ark. Native macOS launcher execution has not been verified on physical Mac hardware.

## A second click says the port is occupied

The launcher reopens an existing Ark server only when it identifies the same version from the same folder. It refuses an unrelated server or a different extracted copy. Find the existing server window and stop it with Ctrl+C, then run the launcher from your intended folder.

Do not solve an occupied port by randomly switching ports. Different ports and `localhost` versus `127.0.0.1` are different browser storage origins. Advanced users can choose `python server.py --port NUMBER`, but should transfer notes using encrypted backup/restore.

## The household looks empty

Stop before adding replacement information. Check whether you changed browser, browser profile, file location, computer, or launch method. A browser copy does not travel inside the app folder. Opening portable mode and opening localhost use separate copies.

Return to the original browser/profile/location and export an encrypted backup. In the new copy, choose Backup & restore, check the backup, review the preview, and explicitly confirm replacement. Back up any existing notes in that browser first. If the old browser data was deleted, an existing backup or printed packet may be the only remaining copy; Ark has no server-side recovery.

## Saving failed or the copy cannot be read

Keep any unsaved form open and copy your own entered text to a suitable secure place before closing it. Check browser storage permissions and available disk space. Do not clear browser storage to troubleshoot without first securing a readable backup.

If Ark offers **Save unreadable copy**, download it privately before making changes. It may contain plaintext household information. Do not attach that file to a public issue. Restoring a valid backup requires explicit confirmation. Try **Recover previous copy** in Backup & restore if a local recovery candidate exists. It is unencrypted, optional when space is limited, and is not a replacement for a separate backup.

To remove Ark information from this browser, use **Delete browser data** and type the exact household name. This removes the current, previous, and old legacy copies from this browser profile. It leaves downloaded backups, PDF/paper copies, clipboard contents, and other browsers unchanged. Deleting an individual note can leave it in older copies until those are replaced or explicitly removed.

## Another tab owns editing

Only one Ark tab may edit a browser-origin copy. Additional tabs show a read-only snapshot and cannot save, delete, or export a normal backup. Close the editing tab, then reload the tab you want to use. Reloading after transfer refreshes the saved copy. Do not edit from two different Ark versions on the same origin. Different browsers/profiles still have separate copies and no synchronization.

## A backup will not restore

Use the passphrase for that particular file, including capitalization and spaces. An incorrect passphrase and a damaged encrypted file can produce the same failure. Ark cannot reset a forgotten passphrase. A successful download is not proof of recovery: test restoring the saved file in a different browser before relying on it.

Keep another copy of a known-good encrypted backup, along with a separate way for your trusted person to obtain its passphrase. Imported unencrypted legacy JSON files remain sensitive plaintext outside Ark.

## Print or clipboard problems

Use **Create handover** and review the selected notes. Choose **Print / save PDF** and use the browser's printer/PDF controls. Browser printing without a prepared packet intentionally prints instructions instead of all household notes. If the clipboard is unavailable, select and copy the preview text manually, or print the packet. Printed pages, PDFs, and copied text are unencrypted and cannot be revoked.

## Check the download and report a software problem

The bundle's `RELEASE_MANIFEST.json` identifies its version and SHA-256 checksums for the included files. The published ZIP also has a `.zip.sha256` checksum. Checksums detect mismatches and corruption; they are not a digital signature or a substitute for obtaining the release from a trusted source.

On Windows, `Get-FileHash .\Ark-Family-OS-Digital-Edition.zip -Algorithm SHA256` shows the ZIP hash. On macOS/Linux, use `shasum -a 256 Ark-Family-OS-Digital-Edition.zip`. Compare the result with the checksum published alongside the same release.

Report reproducible software issues at [the Ark issue tracker](https://github.com/rvreddy24/Ark-Vault/issues). Opening this link uses your browser and an internet connection. Include the version from the release manifest, operating system, browser version, launch method, and steps using fictional data. Never post household records, backups, passphrases, screenshots containing private information, or payment information. The public issue tracker is not an emergency channel and has no guaranteed response time.

Purchase, refund, tax, and delivery questions belong to the storefront where you purchased the product. This software package does not define a seller's refund policy or replace that storefront's terms.
