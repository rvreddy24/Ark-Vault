# Changes

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
