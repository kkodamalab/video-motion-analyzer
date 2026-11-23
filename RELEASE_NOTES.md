# v0.2.0 — BALLET ROTATION

Prepared release notes; this file does not mean the release has been published.

- Adds selectable ballet body axes, apparent/calibrated image tilt and reference-relative estimated 3D tilt.
- Preserves raw MediaPipe pose observations and manual corrections for recalculation.
- Adds synchronized trajectory/angle/metric views, configurable timeline tracks and manual rotation/contact/balance events.
- Provides confidence-aware automatic turn candidates, separate manual summaries, per-turn and aggregate statistics, CSV exports and JSON persistence.
- Keeps existing GENERAL/RELAY input, tracking, calibration, plots and exports.
- Moves MediaPipe runtime/model loading to same-origin build assets; rejects incomplete production builds and separates genuine inference from synthetic functional tests and upstream diagnostics. Asset acquisition remains blocked in the current cloud task; these prepared notes do not claim a completed deployment.

Monocular 3D, heading and contact heuristics are not validated biomechanical measurements. Review identities and occlusions, calibrate references, and validate against annotation/motion capture before research use. Synthetic tests demonstrate arithmetic and UI behavior, not accuracy on real ballet videos.

Publication checklist and actual verification results: DEVELOPMENT_STATUS.md.
