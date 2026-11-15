# Changes

## 4.1.0 — 15 November 2026

- Hardened the release through separate security/data-integrity, usability, and distribution agent reviews. These are internal reviews, not independent certification.
- Fixed maximum-size backup round trips, preserved legacy contextual labels, and split long imported care instructions without truncation.
- Added a lifetime single-editor lease. This prevents a reproduced Firefox lost-update race caused by stale per-process localStorage snapshots; secondary tabs are explicitly read-only and reload to take ownership after the original closes.
- Added protected unsaved forms, disabled controls during writes, focus restoration, cancellation-safe export/recovery operations, and previous-copy recovery that does not consume space needed for a working save.
- Added exact-household-name confirmation for deleting current, recovery, and legacy browser copies. Backups and other profiles remain separate.
- Improved 320px/200% reflow, larger text/targets, visible modal actions/errors, support/version details, and clean multi-page PDF output.
- Hardened loopback Host/Origin/resource handling and same-folder repeated launch detection; tested Windows launcher execution from a Unicode path with spaces.
- Added a reproducible release manifest with per-file SHA-256 hashes and a separate ZIP checksum. Package tests no longer overwrite the tracked download.
- Consolidated commercial drafts under docs and removed generated workspace artifacts after verification.

Release checks: 17 core tests; 29 browser scenarios across four targets (116 executions); 14 Python package/server/launcher tests with OS-specific skips. CI exercises Linux, Windows, and macOS. The actual ZIP was extracted to a Unicode path with spaces and passed offline save/review/encrypted-download/second-context restore and local-server checks. Four-page family and two-page caregiver PDF samples were text-checked and visually inspected using fictional data. Actual paper printing and Mac download/quarantine/default-browser behavior still require human hardware acceptance. External commercial decisions remain listed in RELEASE_CHECKLIST.md.

## 4.0.0 — 15 November 2026

Ark now focuses on a useful household handover instead of an automated family operating system.

- Replaced the UI with responsive workspace navigation, a guided overview, consistent local icons, accessible native dialogs, and readable selected-note packets.
- Removed runtime CDN scripts/fonts. Added restrictive Content Security Policy and loopback-only server binding.
- Replaced the verification percentage with seven explicit essentials, not-applicable items, drafts, review dates, and reviews due after 90 days. Editing clears review.
- Added passphrase-encrypted portable backups (AES-256-GCM / PBKDF2-SHA-256), schema validation, preview and explicit restore confirmation. Browser storage remains unencrypted.
- Preserve invalid saved data, report save errors, and detect ordinary multi-tab conflicts. Import legacy records without inheriting verification claims; retain the old storage key.
- Added temporary fictional examples, trusted-person/packet-location planning, a handover practice checklist, family/caregiver presets, and per-note sharing selection.
- Default browser printing reveals no notes until packet contents are selected. Long note text is rendered as full text rather than clipped form fields.
- Rewrote onboarding, privacy limits, emergency checklist, and commercial drafts to remove unsupported protection, security, setup-time, and sales claims.
- Added 12 core tests, 14 browser scenarios across four targets (56 executions), accessibility checks, three release tests, and GitHub CI.

Local verification: Chromium, Firefox, WebKit and Chromium mobile emulation. macOS launcher execution and physical printing have not been tested on native hardware. This version has not received an independent security audit, qualified legal/medical certification, or paid-customer validation.
