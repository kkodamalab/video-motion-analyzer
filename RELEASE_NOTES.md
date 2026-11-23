# v0.2.0 — BALLET ROTATION

Prepared release notes; this file does not mean the release has been published.

- Adds selectable ballet body axes, apparent/calibrated image tilt and reference-relative estimated 3D tilt.
- Preserves raw MediaPipe pose observations and manual corrections for recalculation.
- Draws synchronized ballet skeleton lines from the same current-time measurements as the joint overlay; interpolated connections are dashed.
- Adds synchronized trajectory/angle/metric views, configurable timeline tracks and manual rotation/contact/balance events.
- Provides confidence-aware automatic turn candidates, separate manual summaries, per-turn and aggregate statistics, CSV exports and JSON persistence.
- Keeps existing GENERAL/RELAY input, tracking, calibration, plots and exports.
- Moves MediaPipe runtime/model loading to same-origin build assets; rejects incomplete production builds and separates genuine inference from synthetic functional tests and upstream diagnostics.
- Adds verified native HTTPS acquisition on Windows, retaining archive validation, SHA-256 provenance receipts and installed-package WASM verification. No TLS bypass, CDN fallback or persistent CA registration.
- Windows validation: 65 unit tests, explicit TypeScript check, production build, and 19 required Chromium E2E tests passed without skips (18 functional + 1 genuine MediaPipe UI inference). The genuine test checks all 33 image/world landmarks, stored 2D points, axis overlay, tilt timeline, numeric CSV content and JSON restoration, blocking external browser requests.

Monocular 3D, heading and contact heuristics are not validated biomechanical measurements. Review identities and occlusions, calibrate references, and validate against annotation/motion capture before research use. Synthetic tests demonstrate arithmetic and UI behavior, not accuracy on real ballet videos.

Publication checklist and actual verification results: DEVELOPMENT_STATUS.md.
