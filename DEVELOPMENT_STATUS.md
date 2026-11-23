# Development status — BALLET ROTATION v0.2.0

Updated 2026-11-24 JST. This file is a resumable work record, not a promise of automatic resumption.

## Repository and branch

- Repository: https://github.com/kkodamalab/video-motion-analyzer
- Existing public app: https://kkodamalab.github.io/video-motion-analyzer/
- Feature branch: `feature/ballet-rotation`, based on fetched main `13199073911f5ff17c2c578833383b93c217bc9b`.
- PR/release: not created yet. Main has not been merged or redeployed by this task.

## Implemented

- GENERAL / RELAY / BALLET ROTATION presets; existing analysis tools retained.
- Raw 33-landmark image/world pose storage, provenance, missing detections, manual 2D overrides.
- Four selectable axes, head/support definitions, 2D calibrated/apparent tilt, optional reference-relative estimated 3D tilt, overlay controls.
- Confidence/gap/phase-aware rotation candidates, angular velocity, unwrapped cumulative angles, separate manual events and turn summaries.
- Ballet timeline with selectable continuous/event tracks, cursor seek, manual event add/edit/delete and analysis interval controls.
- Trajectory, angle and metric views, original world view, per-turn and aggregate statistics.
- Frame/turn/event CSV, JSON raw/derived data, backwards-compatible v1 schema, import validation.
- README/help research limitations and metric definitions; version metadata prepared for 0.2.0.
- Unit and browser regression tests; configurable existing Chromium executable/proxy for cloud tests.

## Validation

- Baseline before changes: 31 unit tests and production build passed.
- Current unit suite: 65 passed; TypeScript and Vite production build passed.
- Final Chromium suite: 18 executed, 17 passed, 1 failed (genuine external MediaPipe inference). Six ballet UI tests, two real generated-video decoding tests (GENERAL/BALLET), and legacy workspace/visual checks passed. No tests skipped. See test-results/results.json and test-results/ballet-metrics.png in this workspace. Earlier selector failures were fixed and rerun.
- Development server started on port 5173, HTML request succeeded; application exercised with real headless Chromium.
- Synthetic tests recover 30° tilt, 180°/s angular velocity and 2-second turns, and reject turns crossing missing data or camera cuts. This is NOT real ballet-video accuracy validation.

## Environment and external blockers

- `npm ci --cache /workspace/.npm-cache` works with lockfile integrity verification. Default home npm cache is not writable in the sandbox.
- `/usr/bin/chromium` is installed. Playwright browser downloads are denied by current outbound policy, so the installed browser is used.
- Existing Git read authentication works. GH_TOKEN is present; its value was not read or copied.
- `api.github.com` and `storage.googleapis.com` return proxy 403 (domain forbidden). Public app verification also requires `kkodamalab.github.io`.
- Required host additions saved in environment draft: `api.github.com`, `storage.googleapis.com`, `kkodamalab.github.io`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `cdn.download.prss.microsoft.com`. User must save/apply the settings. Draft save alone is not a runtime update or publication.
- Chromium's current trust store rejects the managed proxy CA for external HTTPS. A request to register the environment-supplied CA in `/home/agent/.pki/nssdb` was rejected by automatic approval review because it persistently changes trust. Explicit approval is pending. TLS verification has not been disabled; no rejected action was executed.

- Reusable `install_script` and `start_skill` saved successfully in the cloud environment draft. Installation script was executed successfully; dev server started and responded. Network additions are still absent from the enforced runtime policy. No environment publication was performed.

## Resume steps

1. Inspect `git status`, this file, and current environment status. Use this checkout; do not create a worktree unless explicitly requested.
2. Apply the saved network additions in environment settings. If CA registration is approved, add only the environment-supplied CA with normal certificate verification retained; then verify CDN/model access in Chromium. Do not bypass a denied approval.
3. `cd /workspace/video-motion-analyzer`; `npm ci --cache /workspace/.npm-cache`; `npm test`; `npm run build`.
4. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_PROXY_SERVER="$HTTPS_PROXY" npm run test:e2e`. Require genuine external MediaPipe inference to pass; do not suppress the test or replace it with synthetic data.
5. Confirm the branch commit/push state; create a PR with `/workspace/vma-pr-body.md` (or reconstruct from this status and RELEASE_NOTES.md). Wait for the existing `Test and deploy Pages` workflow to pass. Merge only after required checks pass.
6. Confirm main Pages deployment, run production browser checks using `TEST_URL=https://kkodamalab.github.io/video-motion-analyzer/`, and verify the v0.2.0 UI/assets. The source-module model probe is intentionally local-only; production needs an actual UI inference check.
7. Publish the v0.2.0 GitHub release after deployment validation. Record real PR/release URLs, commit IDs and final test evidence here.
8. Review/save the reusable cloud configuration and Publish the environment snapshot separately from GitHub Pages deployment.

## Remaining limitations

- No actual ballet video or motion-capture ground truth was provided; research accuracy remains unvalidated.
- Monocular direction/identity changes can defeat heuristics. Auto turns are candidates. Contact/balance events are manual.
- Image-plane metric scale and 3D up are explicit user references; no automatic gravity/camera calibration or true center-of-mass measurement.
- Real OS screen-sharing picker remains outside the automated checks inherited from v0.1.0.
- Full external inference, CI, PR/merge, Pages deployment/public verification and GitHub release remain pending until access prerequisites and tests succeed.
