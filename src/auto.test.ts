import { it, expect, vi, afterEach } from "vitest";
import { emptyProject } from "./core";
import type { PoseFrame, Landmark } from "./ballet";
const mocks = vi.hoisted(() => ({ detect: vi.fn(), close: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  PoseLandmarker: { createFromOptions: vi.fn(async () => mocks) },
}));
import { analyze } from "./auto";
afterEach(() => vi.unstubAllGlobals());
function canvas() {
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
    }),
  });
}
it("retains all raw landmarks in original image coordinates with 3D data and source", async () => {
  canvas();
  const p = emptyProject();
  p.roi = { x: 100, y: 50, w: 400, h: 300 };
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.25,
    z: -0.1,
    visibility: 0.9,
  }));
  mocks.detect.mockReturnValue({
    landmarks: [landmarks],
    worldLandmarks: [landmarks.map((l) => ({ ...l, x: 0.1, y: 0.2, z: 0.3 }))],
  });
  let frames: PoseFrame[] = [];
  await analyze(
    { duration: 1, currentTime: 0, readyState: 2 } as HTMLVideoElement,
    p,
    0,
    0,
    () => false,
    (_t, _points, _fps, poses) => {
      frames = poses;
    },
  );
  expect(frames[0].image).toHaveLength(33);
  expect(frames[0].image[0]).toMatchObject({ x: 300, y: 125, z: -0.1 });
  expect(frames[0].world![0]).toMatchObject({ x: 0.1, y: 0.2, z: 0.3 });
  expect(frames[0].source).toBe("mediapipe");
  expect(frames.slice(1).every((f) => f.image.length === 0)).toBe(true);
});
it("records explicit missing detections without overwriting locked/manual people", async () => {
  canvas();
  const p = emptyProject();
  p.runners[0].locked = true;
  p.runners[1].mode = "manual";
  mocks.detect.mockReturnValue({ landmarks: [], worldLandmarks: [] });
  let frames: PoseFrame[] = [];
  await analyze(
    { duration: 1, currentTime: 0, readyState: 2 } as HTMLVideoElement,
    p,
    0,
    0,
    () => false,
    (_t, _points, _fps, poses) => {
      frames = poses;
    },
  );
  expect(frames).toHaveLength(6);
  expect(
    frames.every(
      (f) => f.image.length === 0 && f.person !== "r1" && f.person !== "r2",
    ),
  ).toBe(true);
});
