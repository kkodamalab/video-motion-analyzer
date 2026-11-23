# Development status — BALLET ROTATION v0.2.0

Updated 2026-11-24 JST. Resume record, not a guarantee of automatic resumption.

## Windows continuation — current status (supersedes historical cloud blockers below)

**Public app verified on 2026-11-24 JST.** PR #2 was merged as `8d9188a278cf1c9ce0def759289dd99ad06a2485`. [Main test/build/Pages deployment](https://github.com/kkodamalab/video-motion-analyzer/actions/runs/45281893536) succeeded. The actual [public URL](https://kkodamalab.github.io/video-motion-analyzer/) passed **19/19 required E2E tests, zero skips**, including genuine same-origin MediaPipe video inference. That public run retained **12 observed poses × 33 image and 33 world landmarks**, 12 valid tilt angles, axis/skeleton overlay, tilt timeline, CSV numeric values and JSON restoration. CSV has 96 rows across the initial eight runners; the seven undetected runners remain missing rather than fabricated.

Public HTML, JS, CSS, manifest, model, and both WASM loader/binary variants returned HTTP 200 with expected MIME types and SHA-256 matching the exact CI Pages artifact. Model hash is recorded below. The first comparison to Windows-local HTML differed in line endings; the authoritative CI artifact matched byte-for-byte. No TLS exceptions or CA registrations were used. v0.2.0 release readiness is complete; GitHub Releases is the authoritative publication record.

- Checkout: `C:\Users\kkoda\Documents\Codex\2026-10-22\files-pasted-by-the-user-web\outputs\video-motion-analyzer`.
- Started from existing `origin/feature/ballet-rotation` at `63d9e1f`; working tree was clean. No repository was recreated and no user changes were discarded.
- Windows tools: Git 2.55.0, Node 24.21.0, npm 11.19.0, authenticated gh, curl 8.23.0 (Schannel), FFmpeg 9.0.1, Playwright 1.56.1 / managed Chromium 141 build 1194. No cloud executable-path override required.
- `npm ci`: passed. `npm run assets:fetch`: passed using native Windows HTTPS acquisition; same integrity/receipt checks retained. Model 5,777,746 bytes, SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`. Both WASM variants match pinned installed package bytes. `npm run test:inference:prepare`: passed.
- Unit tests **65 passed**; explicit `npx tsc -b` passed; verified-asset production build passed. Required E2E **19 passed / 0 skipped** (18 functional + 1 genuine inference) including the final skeleton-line addition.
- Genuine inference retained 33 image and 33 world landmarks, stored automatic 2D points, generated body-axis/tilt timeline and numeric CSV, and restored real inference JSON through the UI. All browser model/WASM requests were same-origin; external browser hosts were blocked. The fixture is a real-human **still image converted to video**, not real ballet-motion accuracy validation.
- Small Windows continuation changes: native verified HTTPS download instead of the synchronous curl child that exited -1 without diagnostics; enhanced real inference assertions and evidence; ballet skeleton lines from the same current-time manual/automatic/interpolated joints (interpolation is dashed). No feature rewrite.
- `npm audit --omit=dev`: 0 vulnerabilities. Full audit reports 5 findings in existing development dependencies (Vite/Vitest/esbuild/tinypool chain); dependencies have not been force-upgraded as part of this feature continuation. These tools are not shipped in the static bundle. Development server binds loopback only.
- PR: https://github.com/kkodamalab/video-motion-analyzer/pull/2 (merged). Final Windows gate passed, including skeleton lines: 65 unit tests, typecheck, build, 19 required E2E / 0 skipped. First CI passed model/fixture acquisition, unit tests and build, but its Playwright install failed because `ubuntu-latest` selected unsupported Ubuntu 26.04. Workflow now pins supported Ubuntu 24.04; mandatory tests remain unchanged. Corrected PR CI, main CI and live public verification succeeded.

### Reproduce validation / future continuation

1. `Set-Location` to the checkout above; inspect `git status` and preserve the feature branch edits.
2. Run `npm run assets:fetch` (verifies retained receipts), `npm run test:inference:prepare`, `npm test`, `npx tsc -b`, `npm run build`, `npm run test:e2e`. Do not disable TLS or register a CA.
3. Commit/push `feature/ballet-rotation`, create/reuse its PR, and wait for CI before merging.
4. After main Pages deployment, set `$env:TEST_URL='https://kkodamalab.github.io/video-motion-analyzer/'` and run the **same** `npm run test:e2e`, including real inference. Verify HTTP/MIME/SHA-256 of HTML/JS/CSS/model/both WASM variants against the built assets.
5. Only after public verification, create v0.2.0 tag/release using RELEASE_NOTES.md and record actual links. Do not mistake historical cloud failures below for current Windows results.

## Historical cloud handoff (retained for provenance)

## Repository / delivery

- Repository: https://github.com/kkodamalab/video-motion-analyzer
- Existing public app: https://kkodamalab.github.io/video-motion-analyzer/
- Working branch: `feature/ballet-rotation` (existing isolated checkout, no worktree).
- Earlier implementation/status commits `418bb8c` and `4ea18ac` were pushed. See `git log` for the continuation commit containing this file.
- PR URL: **not created**. Release URL: **not created**. Main merge, Pages redeployment and live public verification are **not completed**.

## Implemented

BALLET ROTATION preset; retained image/world raw landmarks; manual 2D corrections; four selectable body axes; 2D/estimated-3D tilt and uncertainty; position stability; segmented heading/rotation candidates; manual event editing; synchronized selectable timeline; trajectory/angle/metric views; interval and per-turn/aggregate summaries; CSV/JSON; research caveats and tests. GENERAL/RELAY workflows remain available.

Continuation changes:

- Same-origin MediaPipe WASM/model paths; no CDN fallback.
- Build-time asset preparation and verified HTTPS model acquisition with retained integrity receipts. Both actual WASM variants copied successfully. Model acquisition is still blocked.
- Production build checks completeness/integrity before Vite can publish.
- Genuine UI inference test uses a finite-duration video generated from Google's real human test image, checks 33-point/world persistence, axis overlay and CSV, and rejects external browser requests. It is distinct from synthetic feature tests and from real ballet accuracy validation.
- Separate functional, genuine-inference and optional external-network E2E projects.
- Removed the unrelated external Google Fonts request; retained system font fallbacks.
- CI prepares runtime/test assets and keeps genuine inference as a deployment prerequisite.

## Latest verification (current revision, not the earlier baseline)

| Check | Result |
| --- | --- |
| Unit tests | **65 passed** |
| TypeScript `npx tsc -b` | **Passed** |
| Functional Chromium E2E | **18 passed**, none skipped; includes ballet/legacy UI, generated-video decoding in GENERAL/BALLET, and real SIMD/non-SIMD WASM compilation without external requests |
| Genuine same-origin inference E2E | **1 failed at prerequisite check**: human fixture video unavailable because its source fetch is denied; no genuine inference executed |
| Optional external-network browser diagnostics | **3 failed**: CDN JS/WASM certificate trust, model proxy denial |
| `npm run assets:fetch` / fixture preparation | **Blocked, HTTP 403** on `storage.googleapis.com` |
| `npm run build` | **Blocked by prebuild asset verification**: missing model/provenance receipt. Not a successful current production build |
| Real ballet-video accuracy | **Not validated**; no ground truth/video provided |

Evidence: `test-results/functional-results.json`, `test-results/inference-results.json`, `test-results/network-results.json`, and [NETWORK_DIAGNOSIS.md](NETWORK_DIAGNOSIS.md). Previous baseline builds passed before the mandatory model-bundling gate was added; those results do not establish deployability of the current revision.

## Constraints / blockers

The user expressly declined persistent Chromium CA registration. Do not register it, disable TLS, use `ignoreHTTPSErrors`, or bypass certificate errors. No such change was performed. Browser and curl have different trust behavior for the managed HTTPS proxy; see the diagnostic report.

Enforced runtime custom network hosts remain empty. `storage.googleapis.com`, `api.github.com`, `kkodamalab.github.io` (plus optional Playwright download domains) were saved to the environment draft previously, but have not been applied. Git read/push work through existing platform authentication. GH_TOKEN is present; its value was not inspected. API permission cannot be assessed until the API route works.

The environment `install_script` and `start_skill` were updated and saved to the same-origin workflow and explicit no-CA constraint. The installer still cannot complete until the model destination is allowed; saving instructions did not apply network policy or publish the environment.

## Next steps

1. Inspect current `git status`, instructions and environment status; preserve edits and continue in `/workspace/video-motion-analyzer`.
2. Apply the saved necessary domain additions in environment settings. **No CA registration is authorized.**
3. `npm ci --cache /workspace/.npm-cache`; `npm run assets:fetch`; `npm run test:inference:prepare` (requires curl and FFmpeg). If verified acquisition fails, stop publication and record the actual response.
4. `npm test`; `npm run build`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Verify real inference, not just successful WASM compilation. The dedicated optional diagnostic command is `npm run test:e2e:network`.
5. Confirm feature-branch push state. Create a PR with a fresh description of the final implementation; wait for required GitHub Actions checks before merging main.
6. Confirm Pages deployment. Test the actual public app with `TEST_URL=https://kkodamalab.github.io/video-motion-analyzer/` using the functional and genuine UI-inference suites. Do not bypass certificate errors if this environment cannot open public HTTPS.
7. Publish v0.2.0 using RELEASE_NOTES.md only after validation. Record actual PR/release URLs and deployed commit. No release URL should be invented in advance.
8. Environment configuration publication is separate from Pages deployment. Installation/startup draft updates do not themselves execute or publish anything.

## Research limitations

Monocular MediaPipe 3D/heading estimates can fail under occlusion and identity/left-right swaps. Image-plane motion is not measured physical axis motion; the geometrical axis is not the true center of mass or mechanical axis. Manual contact/balance events are annotations. Synthetic 30°/2-second fixtures test arithmetic and UI, not real-video accuracy. Genuine model execution on a still-image-derived test video will also not establish ballet measurement accuracy.

