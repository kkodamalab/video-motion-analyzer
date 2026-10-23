# Verification record

## Local validation, 2026-10-23 (Asia/Tokyo)

- `npm test`: **31/31 passed** (26 core + 5 analysis).
- `npm run build`: **passed**, strict TypeScript and production Vite build.
- `npm run test:e2e`: **11/11 passed**, real Chromium 141, Windows, 1600×1000 viewport.
- `npm audit --omit=dev --audit-level=high`: **0 production vulnerabilities** at check time.
- Local preview HTTP **200**.
- Desktop screenshot inspected: source/world panes, timeline and inspector visible, labels/readouts usable.

Browser cases: real browser-generated WebM file decode; zoom-invariant manual click; timeline/video seek; actual model load/inference; synthetic labeling; manual point/undo/redo; ROI corner resize and keyboard movement; event interval edit/delete/visibility; JSON/CSV download; IndexedDB save/restore; four manually placed calibration points; synchronized analysis graph; no browser page errors in visual scenario.

Model evidence: **WebGL GPU**, **1 detected person**, **33 landmarks**, head visibility **0.9999842643737793**, on the external MediaPipe `pose.jpg` fixture. No mock model or synthetic inference output. This does not validate multi-runner identity stability, occlusion robustness, clinical/sport accuracy, or inference on user footage.

The capture-denial case explicitly replaces `getDisplayMedia` with a rejecting mock. Browser-generated WebM tests exercise real encoding/decoding but **do not validate the operating system share picker or real shared-screen recording**. Those require manual testing on the target browser/device.

The synthetic demo tests validate data plumbing, not real motion-analysis accuracy. Dynamic homography is tested for correspondence interpolation/refitting, not background feature tracking (not implemented).

CI and public deployment results are recorded after publication below or in GitHub Actions/release links.
