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

Multiple-tab checks prevent ordinary stale overwrites, but localStorage is not a transactional multi-user database. Use one editing tab. Backup/restore is manual, with no merge or synchronization. Downloads must be confirmed by the user; preparing a file does not prove it was saved or stored safely.

## Shared copies and limits

Packets, PDFs, clipboard data, legacy files, and paper are unencrypted. A caregiver preset selects care notes and the first-call essential. Inspect every included note: section membership does not make information safe to share. Copies cannot expire or be revoked. Review timestamps are household assertions, not professional verification. Reviews are suggested after 90 days; circumstances may require earlier updates. No background reminders are sent.

Ark does not establish authority, generate legal documents, prescribe care, execute an estate plan, or contact emergency services. Content has not received professional certification. Use professional advice appropriate to your jurisdiction. Encryption changes should receive independent review before high-risk commercial use.

Report software issues through the repository without attaching household notes, backups, or passphrases. This repository has no monitoring service or guaranteed response time.
