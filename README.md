# Video Motion Analyzer

Browser-local research workspace for manual motion measurement, multi-person pose estimation, planar calibration and synchronized annotation.

**App:** https://kkodamalab.github.io/video-motion-analyzer/

**v0.1.0 is an experimental research baseline, not a completed implementation of every requested feature.** See the explicit capability/limitation table below. No synthetic data are presented as measured data or successful inference.

## Quick start / 操作方法

1. Choose **VIDEO FILE** (MP4/WebM) or drag a local video into the source pane. No video upload occurs. Browser codec support determines accepted encodings; convert unsupported files to H.264 MP4 or VP8/VP9 WebM.
2. **SCREEN CAPTURE** opens the browser permission picker. Stop recording before analysis. The application cannot choose a shared window, bypass permissions or DRM, or recover protected black video. Audio depends on browser/source support. Respect recording rights and site terms.
3. Set nominal FPS in **SETUP**. Observed frames retain `requestVideoFrameCallback.mediaTime`; unobserved steps and automatic-analysis stride use nominal FPS. This is not a frame-accurate demuxer for arbitrary VFR files.
4. Select **ROI** on the source toolbar. Drag inside to move; resize using eight handles. Edit X/Y/W/H numerically. Arrow keys move 1 px, Shift+arrow 10 px. Confirm or reset at the bottom of TRACK. ROI does not modify image coordinates or calibration.
5. In **CALIBRATE**, create a calibration keyframe and click four or more non-collinear image positions. Enter corresponding world X/Y in meters. Use additional points and independent validation checkboxes to assess error. Drag anchors or edit their coordinates.
6. Choose runner and body part, then **MANUAL TRACK**. Click to store a point at the current time. Drag points to correct; Shift-select and Delete for multiple points. Corrected/manual samples are protected from automatic overwrite. **GROUND** must be an explicitly chosen ground-plane representative point.
7. For **AUTO TRACK START**, select analysis range in SETUP, confidence and stride in TRACK. The browser fetches MediaPipe WASM and its real model. Failed loading/inference shows an error, never a success substitute. Verify identities after crossings and occlusions.
8. Click timeline to seek; P to play/pause; left/right to step. Wheel zooms around cursor; Space+drag pans; Ctrl+Z / Ctrl+Shift+Z undo/redo. Drag pane separators to resize.
9. EVENTS adds instants or contact intervals. Candidate detection is a heuristic; manually approve/reject each. Baton exchange events are manual.
10. PLOTS shows selectable image coordinates, world coordinates, 2D joint angles, speed, acceleration and relative runner measures on synchronized graphs. Missing/invalid regions remain missing.
11. Save stores project and optional video in IndexedDB. Restore with the folder icon. EXPORT downloads JSON; SETUP offers tidy UTF-8 BOM CSV. JSON references video by filename and requires reselecting the original file. Export before clearing browser storage.

**DEMO DATA** creates an original synthetic eight-runner scene with known planar geometry. It contains no third-party video, does not load a model, and is labeled synthetic throughout.

## Architecture

- React 19, TypeScript, Vite, SVG overlays/timeline, IndexedDB (`idb`). Static GitHub Pages; no application backend or video upload.
- Normalized least-squares projective homography in TypeScript, deterministic RANSAC consensus for overdetermined inputs (0.2 m residual threshold), hold-out validation errors. No OpenCV runtime is necessary for this implementation.
- Fixed/CUT phases use one homography. PAN/TILT/ZOOM phases interpolate matched anchor image positions between keys and **refit H**; matrix elements are not simply interpolated. No extrapolation outside dynamic keys. This is an estimate, not measured background optical flow.
- MediaPipe Tasks Vision **0.10.22-rc.20250304**, Pose Landmarker **lite float16 version 1**, up to eight poses, WebGL GPU with WASM CPU fallback. Model: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`. Model/runtime downloads require internet; frames remain local.
- Automatic identities use nearest pelvis with displacement/time gating and manual pelvis anchors. This is not ByteTrack and is not robust re-identification.
- Full-resolution image coordinates are independent of display transforms and ROI.
- Interpolation: linear or cubic Hermite, explicit max-gap restriction, no phase-crossing interpolation. Source measurements remain unchanged.
- Derivatives: central/forward differences or local quadratic least-squares fit on actual sample timestamps. Polynomial mode generalizes Savitzky–Golay to irregular samples. No derivatives through phase boundaries, long gaps, missing ground samples or invalid calibration.

## Coordinate and angle definitions

Image X right, Y down, in pixels. World XY in meters defined by user anchors. A ground homography is applied **only to GROUND**, never automatically to head, pelvis or other elevated body points. Perspective-projected airborne points are not true planar positions.

HEAD is MediaPipe nose (#0); PELVIS is midpoint of hips; TORSO is midpoint of HEAD/PELVIS. Hand uses wrist. Foot selects heel, toe or ankle. Shoulder/elbow/hip/knee/ankle image landmarks are preserved. Not all 33 raw landmarks are retained in project points.

Joint angles are unsigned **2D projected interior angles [0,180] degrees**. Shoulder: elbow–shoulder–hip; elbow: shoulder–elbow–wrist; hip: shoulder–hip–knee; knee: hip–knee–ankle; ankle: knee–ankle–toe. Trunk is clockwise from image-up vertical using head/pelvis. These are not anatomical 3D joint angles.

Straight preset: s = world X. Curve preset: s = radius × atan2(Y,X), with origin at circle center, wrapping at ±π. Custom plane exports XY without inventing s. Complete stadium centerline projection is not implemented.

CSV contains `NaN` for missing derived numeric values. Raw manual/auto/interpolated/corrected methods remain separate; synthetic samples are marked by project/video naming and interpolated provenance. JSON includes model/version, timestamps, units, filters, phases, ROI, landmarks, event provenance and calibration matrices/errors. CSV frame number is nominal, not a decoded frame index.

## Capability status and limitations

| Area | Implemented | Remaining limitations / alternative |
| --- | --- | --- |
| Input | Local video, capture permission UI, MediaRecorder, preview, stop | Real OS share-picker recording not manually validated; browser-generated video and permission denial are separately tested. No live inference. Black-frame/DRM diagnosis and capture dropped-frame accounting are not implemented. |
| Display | Resizable panes, zoom/pan/FIT, original coordinate inverse, fullscreen, local layout persistence | Small screens prioritize source and inspector; world pane hidden. |
| ROI | Eight handles, move, numeric entry, aspect lock, keyboard, reset/confirm | Draw new rectangle by dragging outside existing ROI. |
| Manual | Arbitrary runners, names, lanes, visibility/lock, parts, edit/delete, undo/redo, interpolation | Explicit occlusion interval labels and ID-swap editor absent; missing detections remain gaps. |
| Calibration | 4+ points, overdetermined fit, RANSAC, independent validation, phase split/edit/delete, keyframes | No background optical-flow H estimation. Anchor interpolation can be inaccurate for camera rotation or perspective changes. Add dense manual keys and validate independently. Phase editing is numeric, not direct timeline dragging. |
| Auto | Real multi-person MediaPipe inference and near-neighbor IDs, confidence, progress/stop/retry, manual protection | No YOLO/ONNX/ByteTrack, WebGPU, worker processing or reliable occlusion re-ID. At most eight model poses even with more manual runners. Model processes synchronously per image and may momentarily block UI. |
| Timeline | Camera/runner groups, source-position lines, events, collapse, scrolling, zoom, click seek | Full per-body-part ELAN subtrack hierarchy and range dragging absent. Detailed series live in PLOTS, synced to the same time. |
| Analytics | Image position, ground XY, velocities/acceleration, 2D joint angles, plots, runner distance/relative speed | Full segment-angle set, shoulder-based peak detection, multiple graph overlays and full stadium s absent. |
| Events | Custom names, instants/intervals, candidates, approve/reject, provenance | Candidates currently foot Y local maxima and hand X local maxima only. Toe-off/backward peaks can be manually annotated. No automatic baton exchange confirmation. |
| Exports | JSON, IndexedDB with video, per-frame nominal/observed tidy positions+angles CSV, event CSV, anchor CSV | Calibration matrices/errors in JSON, not calibration CSV. No wide CSV. Large videos may exceed browser quota. |
| Language | Japanese guidance and bilingual technical labels, partial English toggle | Complete English localization not yet provided. |
| Performance | Indexed lookup and calibration caching | Main-thread processing; no claim of real-time throughput on long videos. |

## Development and tests

Requires Node 22+, npm, and Chromium for E2E.

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Set `TEST_URL` to test an already running server or the public Pages URL. The standalone source-module model probe runs locally; public URL smoke tests use the compiled UI. `tests/media.spec.ts` performs a genuine external-model load and inference on Google's MediaPipe test human image (`mediapipe-assets/pose.jpg`); this fixture is fetched only during testing and is not shipped. This checks inference execution, not sport-specific accuracy or multi-person ID stability.

Unit tests cover calibration/degeneracy/outliers, inverse coordinates/ROI independence, interpolation, velocity/angle/missing values, CUT/dynamic phases, schema round-trip and CSV. Browser tests cover real generated WebM decoding, zoom coordinate invariance, ROI resize/move, anchors, manual editing, timeline seek, event editing/visibility, JSON/CSV, IndexedDB, permission rejection (mock), plots and real model inference. See `VERIFICATION.md` for actual results, not just configured checks.

GitHub Actions runs tests and production build on PR/main, uploads evidence, and deploys main through GitHub Pages only after checks pass.

## Research use

Validate lens distortion, planar assumptions, scale, synchronization and landmark definitions before deriving scientific conclusions. Reprojection fit error is not independent accuracy. Automatic confidence is model visibility, not a calibrated measurement error. Review identity continuity and occlusion gaps. Preserve raw observations and original video alongside exported metadata. This is an experimental tool; do not interpret synthetic trajectories or heuristic event candidates as measured evidence.

## Next priorities

1. VFR demuxed frame index and observed timestamp based batch analysis.
2. Background feature tracking with per-frame calibration uncertainty and independent validation.
3. Detector + robust multi-object tracker, explicit ID reassignment/occlusion intervals, worker inference.
4. Complete per-series ELAN hierarchy, range dragging, event thresholds/definitions validation.
5. Real capture picker tests on supported browsers and full bilingual accessibility review.

API reference: [MediaPipe Pose Landmarker Web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
