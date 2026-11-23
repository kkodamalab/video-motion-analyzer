# Development status — BALLET ROTATION v0.2.0

Updated 2026-11-24 JST. Resume record, not a guarantee of automatic resumption.

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
