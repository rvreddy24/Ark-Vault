# Release acceptance checklist

This checklist is a release procedure, not a statement that external checks have already happened. Record the tested release version, commit, operating systems, browser versions, date, and tester alongside the resulting artifact.

## Recorded candidate: 4.1.0, 15 November 2026

Internal agent-assisted verification on Windows: 17 core tests and 116 browser executions passed across bundled Chromium, Firefox, WebKit, and mobile Chromium emulation. The Python suite has 14 tests with platform-specific skips; CI adds Linux, Windows, and macOS jobs. Native launcher tests use a stub server to record invocation without opening a GUI browser. These are automated checks, not customer trials or independent certification.

Candidate ZIP SHA-256: `ac3a2d6b80c93dfbb63c9e7dca5a090729943b82a56de0444195c1bccaf092bf`. Its 13 entries and all 12 payload hashes/sizes matched the version 4.1.0 manifest. The actual ZIP was extracted into a path containing spaces and Ω. Offline portable note/review/reload, encrypted download, independent-context restore, actual local-server startup/health, matching-instance reuse, different-install collision refusal, and foreign Host/unlisted-file rejection all passed. All smoke data was fictional and the temporary extraction was removed.

PDF acceptance: a four-page family sample and two-page caregiver sample were text-checked and all pages visually inspected. Long care instructions survived completely; the caregiver sample excluded the unselected financial marker. This does not verify a physical printer or the real recipient's ability to use a packet.

## Reproducible software gates

- [ ] `npm ci`, syntax checks, formatter checks, core tests, and browser tests pass.
- [ ] `python -m unittest discover -s tests -p "test_*.py"` passes without rewriting the published ZIP.
- [ ] Generate the customer ZIP with `python package_release.py` after the final source changes.
- [ ] Verify the manifest version matches the app/package version; verify every payload hash and the external ZIP hash.
- [ ] Extract the actual candidate into a folder whose path contains spaces. Test portable HTML mode, local-server mode, and reopening a running same-folder instance.
- [ ] Verify an unrelated occupied port is not opened and no alternate port is silently chosen.
- [ ] Verify the local server rejects foreign Host/Origin requests, unknown files, traversal, and outside-public symlinks.
- [ ] No customer data, backups, credentials, dependencies, source-control metadata, or test output appear in the allowlisted package.
- [ ] Review the release's complete-content manifest and publish the ZIP checksum beside the artifact.

## Human and hardware acceptance

- [ ] A nontechnical tester can extract the package, open Ark, complete one useful note, download a backup, and find the saved file without coaching.
- [ ] The intended second person can find the packet and understand the instructions without the author present.
- [ ] Restore an actual downloaded encrypted backup into a different browser profile, then compare the notes. Keep the original copy until this succeeds.
- [ ] Check Windows launcher behavior with Python, without Python, and with blocked browser storage. Check folder paths with spaces/non-ASCII characters.
- [ ] Check native macOS download permissions, launcher execution, portable opening, and default-browser behavior on physical Mac hardware.
- [ ] Print a representative multi-page family packet and caregiver packet on paper. Confirm selected contents, full long notes, review dates, readable type, and no unselected financial or access information.
- [ ] Make no broader platform compatibility claim than the recorded hardware and browser testing supports.

## Commercial launch decisions owned by the seller

- [ ] Publish a real support contact/channel, support scope, purchase terms, refund policy, and clear delivery/compatibility requirements before charging buyers.
- [ ] Confirm the seller's jurisdiction, platform eligibility, payment/tax arrangements, and the provenance of instructional content. A software test does not establish these.
- [ ] Review every privacy, encryption, safety, setup-time, and protection claim against actual behavior. Browser data remains unencrypted unless the application explicitly implements a different model.
- [ ] Obtain qualified review for any jurisdiction-specific legal, medical, financial, or utility instructions you choose to distribute. Locator notes do not create legal authority.
- [ ] Obtain independent security review before making audited-security claims or targeting higher-risk sensitive-data use. Agent review and automated tests are not independent certification.
- [ ] Run a small, honestly described paid pilot; measure completion, successful recipient use, support burden, refunds, and willingness to pay. Do not turn revenue targets into forecasts without evidence.

The software can be a production release candidate while some commercial acceptance items remain open. Do not describe an unchecked item as verified.
