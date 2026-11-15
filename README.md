# Ark — a household handover your family can use

Ark is an offline browser workspace for the people, documents, routines, and practical instructions a trusted person needs when you are unavailable. No account, analytics, remote scripts, external fonts, or cloud sync. All runtime assets are bundled.

## Run locally

Python 3.9+ is recommended for a consistent browser origin:

```sh
python server.py --open
```

Open http://localhost:5000/ in a current browser. The server listens only on loopback. Keep the terminal open. Windows users can double-click `Start-Ark.bat`; macOS users can run `bash Start-Ark.command`. A downloaded macOS launcher may require executable permission or an OS security approval. Python is required for local-server mode.

You can also open `public/index.html` directly. File-URL storage behavior varies by browser. Use the same browser, profile, file location, and launch method. File mode and localhost have separate storage; transfer through an encrypted backup. Never rely on a browser copy alone.

## Included

- Seven guided essentials with a fixed applicable-item count; no safety score.
- Drafts, explicit household review dates, and reviews due after 90 days. Editing resets review status. Not-applicable essentials remain visible separately.
- People, money, home, care, and document/access notes.
- Family and caregiver packet presets, per-note selection, full-text print/PDF output, and clipboard briefing.
- Passphrase-encrypted backup files, validation before restore, a replacement preview, and import of the prior Ark JSON format.
- A trusted-person plan, a practice checklist, and a fictional example that never overwrites personal records.
- Responsive layouts, keyboard-accessible native dialogs, reduced-motion support, and local illustration.

## Privacy and limits

**The working browser copy is not encrypted. Only exported encrypted backups are.** Anyone with access to the browser profile may read it. Ark is a locator and handover organizer, not a password manager, legal document generator, medical record, or source of authority to act. Do not enter passwords, PINs, safe combinations, or complete identity numbers. Review legal and medical instructions with qualified professionals.

Browser storage can be deleted or unavailable. Save failures remain visible and do not show success. Keep separate backups and test restore on another browser. Passphrases cannot be recovered. Printed/copied packets are unencrypted and cannot be revoked. See [PRIVACY_AND_SECURITY.md](PRIVACY_AND_SECURITY.md).

Older same-origin records, contextual labels, and long care instructions are migrated into unreviewed notes; they are not assumed to fulfill the new essentials. Original legacy storage is retained. Invalid saved data is preserved and blocks normal writes until a valid restore. Browser Web Locks allow one editing tab; secondary tabs are explicitly read-only snapshots. Close the editing tab and reload a secondary tab to transfer ownership. Stale tabs refuse saves and exports. Forms are protected from accidental dismissal and temporarily disabled while saving. No automatic multi-device sync.

Backup & restore also offers a preview of the previous browser copy and explicit deletion of current, previous, and legacy Ark data. Previous-copy recovery is unencrypted, best-effort when storage space permits, and does not replace an external backup. Backup imports accept up to 32 MiB, including every schema-valid encrypted export. See [SUPPORT.md](SUPPORT.md) for recovery, supported launch methods, and the public support channel.

## Development checks

Node 20+ and Python 3 are needed for development only. The application has no npm runtime dependencies.

```sh
npm ci
npm test
npm run check
npx playwright install chromium firefox webkit
npm run test:browser
python package_release.py
```

Browser tests use fictional data only. See `playwright.config.cjs` for browser targets. Cryptography has automated tests but has not received an independent security audit.

## Release

`python package_release.py` creates `Ark-Family-OS-Digital-Edition.zip` from an explicit allowlist. Customer data, development dependencies, and tests are excluded. The historic ZIP filename is retained for compatibility; the product is now positioned as a household handover.

The [commercial validation notes](docs/COMMERCIAL_VALIDATION.md) describe hypotheses, not promised sales. The [release checklist](RELEASE_CHECKLIST.md) separates verified software gates from human, hardware, and seller-owned launch decisions.
