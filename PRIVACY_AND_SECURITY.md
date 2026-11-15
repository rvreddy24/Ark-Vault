# Privacy and security

Ark makes no application-initiated external network requests. Runtime assets are local; Content Security Policy blocks connections, external scripts, plugins, and form submission. The optional server binds to 127.0.0.1 only. These controls do not protect a compromised device, malicious browser extension, or modified download.

## Working copy

Household notes are **unencrypted** JSON in this browser's localStorage (`ark_handover_v4`). Device/profile access may expose them. No application lock is provided. Use a screen lock and appropriate device encryption. Do not store credentials, recovery codes, safe combinations, or complete identity numbers. Browser settings and private mode affect persistence. File-URL storage is browser dependent; use localhost consistently where possible.

## Portable backup format v1

- UTF-8 JSON plaintext validated against the version 4 application schema.
- PBKDF2 with HMAC-SHA-256, 600,000 iterations, random 16-byte salt.
- AES-256-GCM, random 12-byte IV, default 128-bit authentication tag.
- Salt, IV, and ciphertext/tag encoded as base64. No passphrase or key is written to the file or browser storage.
- Minimum passphrase: 12 characters; use a longer, unpredictable phrase.
- The envelope records only format, version, cipher, KDF parameters, salt, IV, and ciphertext. No cleartext household name.
- Import rejects unsupported parameters, malformed/oversized files, invalid records, duplicate IDs/templates, and unknown sections before replacement. Wrong passphrases and altered ciphertext fail authentication.

This uses browser Web Crypto. Automated encryption and validation tests are **not an independent security audit**. Export encryption does not encrypt the browser copy or displayed content. Passphrases exist temporarily in browser memory and form fields while in use; fields are cleared on completion/close. Forgotten passphrases cannot be recovered.

## Persistence, restore, and recovery

A write is reported successful only after localStorage accepts it. Failures leave the previous in-memory and saved copy unchanged and keep the form open. Invalid saved data is not silently reset or overwritten. An unreadable-copy download is offered for recovery; it may contain sensitive plaintext. Keep it private. Restore requires explicit replacement confirmation. Original legacy storage remains for recovery and must be cleared separately if you intend to remove it.

The browser Web Locks API grants one tab an editing lease for its lifetime. Additional tabs are explicitly read-only snapshots: close the editing tab and reload a secondary tab to transfer editing. This avoids relying on immediate cross-process localStorage cache propagation (which is not guaranteed in Firefox). Writes also serialize mutation and recheck the saved copy. A stale or read-only tab refuses to save, delete data, or export a normal backup. A browser without coordination support must be upgraded before editing. There is no merge or synchronization. A page restored from the browser's back/forward cache reloads to reacquire ownership and refresh data.

Forms are temporarily disabled during a write, and changed drafts require explicit dismissal. Page-close warnings depend on browser support and are not crash recovery. Another application or older Ark version does not participate in this lease; do not edit one origin using different Ark versions simultaneously.

Before a change, Ark tries to retain one previous browser copy under `ark_handover_previous_v1`. This recovery copy is **also unencrypted**. If quota prevents keeping it, saving can still succeed with an explicit warning. A failed working-copy write rolls back the previous-copy snapshot. Recover previous copy previews the candidate before replacement; swapping makes the replaced copy the next recovery candidate. This is not a separate-device backup and does not survive clearing browser data.

Backup & restore > Delete browser data requires typing the household name and removes Ark's current, previous, and legacy storage keys from this profile. It does not remove downloaded files, clipboard contents, printouts, other browser profiles, or other devices. Individual note deletion can leave that note in previous/legacy copies until they are replaced or explicitly removed.

Downloads must be confirmed by the user; preparing a file does not prove it was saved or stored safely. Closing the backup dialog cancels a pending export, and cancelled or superseded restore checks cannot replace the current preview. Backups up to 32 MiB are accepted; this bound accommodates every schema-valid encrypted export, including Unicode and escaped characters.

## Shared copies and limits

Packets, PDFs, clipboard data, legacy files, and paper are unencrypted. A caregiver preset selects care notes and the first-call essential. Inspect every included note: section membership does not make information safe to share. Copies cannot expire or be revoked. Review timestamps are household assertions, not professional verification. Reviews are suggested after 90 days; circumstances may require earlier updates. No background reminders are sent.

Ark does not establish authority, generate legal documents, prescribe care, execute an estate plan, or contact emergency services. Content has not received professional certification. Use professional advice appropriate to your jurisdiction. Encryption changes should receive independent review before high-risk commercial use.

Report software issues through the repository without attaching household notes, backups, or passphrases. This repository has no monitoring service or guaranteed response time.
