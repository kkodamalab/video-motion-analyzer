import { describe, it, expect } from "vitest";
import { emptyProject, parseProject, type Project } from "./core";
import {
  balletDefaults,
  representative,
  signedTilt,
  tilt3D,
  stats,
  positionStats,
  unwrap,
  calculateBallet,
  automaticEvents,
  turnSummaries,
  periodStats,
  editBalletEvent,
  balletExport,
  balletSnapshot,
  unitName,
  unitScale,
  type Landmark,
  type BalletSettings,
  type BalletEvent,
} from "./ballet";
export function fixture(seconds = 4): Project {
  const p = emptyProject();
  p.analysisPreset = "BALLET ROTATION";
  p.ballet = { settings: { ...balletDefaults }, poses: [], events: [] };
  for (let i = 0; i <= seconds * 20; i++) {
    const time = i / 20,
      heading = time * Math.PI;
    const image: Landmark[] = Array.from({ length: 33 }, () => ({
      x: 320,
      y: 100,
      z: 0,
      visibility: 1,
    }));
    image[11] = { x: 300, y: 200, z: 0, visibility: 1 };
    image[12] = { x: 340, y: 200, z: 0, visibility: 1 };
    image[23] = { x: 300, y: 400, z: 0, visibility: 1 };
    image[24] = { x: 340, y: 400, z: 0, visibility: 1 };
    image[29] = { x: 315, y: 600, z: 0, visibility: 1 };
    image[30] = { x: 350, y: 550, z: 0, visibility: 1 };
    const world = image.map((x) => ({ ...x, x: 0, y: 0, z: 0 }));
    for (const [left, right] of [
      [11, 12],
      [23, 24],
    ]) {
      world[left] = {
        x: -0.2 * Math.cos(heading),
        y: left === 11 ? -0.5 : 0,
        z: -0.2 * Math.sin(heading),
        visibility: 1,
      };
      world[right] = {
        x: 0.2 * Math.cos(heading),
        y: left === 11 ? -0.5 : 0,
        z: 0.2 * Math.sin(heading),
        visibility: 1,
      };
    }
    p.ballet.poses.push({
      time,
      person: "r1",
      image,
      world,
      source: "synthetic",
    });
  }
  return p;
}
describe("representatives and angles", () => {
  it("uses shoulder/hip midpoints and true torso midpoint", () => {
    const p = fixture(),
      v = representative(p.ballet!.poses[0].image, balletDefaults);
    expect(v["SHOULDER CENTER"]).toMatchObject({ x: 320, y: 200 });
    expect(v["PELVIS CENTER"]).toMatchObject({ x: 320, y: 400 });
    expect(v["TORSO CENTER"]).toMatchObject({ x: 320, y: 300 });
  });
  it("supports selectable nose or ears", () => {
    const lm = fixture().ballet!.poses[0].image;
    lm[0].x = 1;
    lm[7].x = 10;
    lm[8].x = 20;
    expect(representative(lm, balletDefaults).HEAD!.x).toBe(15);
    expect(
      representative(lm, { ...balletDefaults, head: "nose" }).HEAD!.x,
    ).toBe(1);
  });
  it("does not replace missing/low-confidence representatives with zero", () => {
    expect(representative([], balletDefaults).HEAD).toBeUndefined();
    const lm = fixture().ballet!.poses[0].image;
    lm[11].visibility = 0.1;
    expect(
      representative(lm, balletDefaults)["SHOULDER CENTER"],
    ).toBeUndefined();
  });
  it("computes signed 2D tilt relative to image up", () => {
    expect(signedTilt({ x: 1, y: -1 }, { x: 0, y: 0 })).toBeCloseTo(45);
    expect(signedTilt({ x: -1, y: -1 }, { x: 0, y: 0 })).toBeCloseTo(-45);
    expect(signedTilt({ x: 1, y: -1 }, { x: 0, y: 0 }, 45)).toBeCloseTo(0);
  });
  it("handles degenerate 2D axes", () =>
    expect(signedTilt({ x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull());
  it("requires explicit nonzero 3D up", () => {
    expect(
      tilt3D({ x: 1, y: -1, z: 0 }, { x: 0, y: 0, z: 0 }, null),
    ).toBeNull();
    expect(
      tilt3D({ x: 1, y: -1, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
    ).toBeNull();
    expect(
      tilt3D(
        { x: 1, y: -1, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 },
      ),
    ).toBeCloseTo(45);
  });
  it("retains missing 3D angles even with 2D observations", () =>
    expect(calculateBallet(fixture(), "r1")[0].angle3D).toBeNull());
  it("calculates 3D angle using a user reference", () => {
    const p = fixture();
    p.ballet!.settings.vertical3D = { x: 0, y: -1, z: 0 };
    expect(calculateBallet(p, "r1")[0].angle3D).toBeCloseTo(0);
  });
});
describe("statistics and units", () => {
  it("population SD and zero-referenced RMS differ", () => {
    expect(stats([1, 3, null, NaN])).toMatchObject({
      mean: 2,
      meanAbs: 2,
      sd: 1,
      n: 2,
    });
    expect(stats([1, 3]).rms).toBeCloseTo(Math.sqrt(5));
  });
  it("reports missing statistics as null", () =>
    expect(stats([null, NaN])).toMatchObject({
      mean: null,
      sd: null,
      rms: null,
      n: 0,
    }));
  it("computes 2D position RMS about centroid", () =>
    expect(
      positionStats([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ]).rms,
    ).toBeCloseTo(1));
  it("does not label uncalibrated positions meters", () => {
    const s = { ...balletDefaults, unit: "m" as const };
    expect(unitName(s)).toBe("px");
    expect(unitScale(s)).toBe(1);
    expect(unitScale({ ...s, metersPerPixel: 0.01 })).toBe(0.01);
  });
  it("single turn has no period CV", () =>
    expect(periodStats([2])).toEqual({ mean: 2, sd: null, cv: null }));
  it("period CV requires at least two turns", () =>
    expect(periodStats([1, 3])).toEqual({ mean: 2, sd: 1, cv: 50 }));
});
describe("rotation confidence and raw data", () => {
  it("unwraps in both directions and resets after missing samples", () =>
    expect(unwrap([170, -170, -150, null, -170, 170])).toEqual([
      170,
      190,
      210,
      null,
      -170,
      -190,
    ]));
  it("recovers synthetic 2-second turns and angular velocity", () => {
    const p = fixture(),
      rows = calculateBallet(p, "r1"),
      events = automaticEvents(rows, balletDefaults);
    expect(rows[10].velocity).toBeCloseTo(180);
    expect(events.filter((e) => e.type === "TURN COMPLETED")).toHaveLength(2);
    const turns = turnSummaries(rows, events, balletDefaults, 0, 4);
    expect(turns).toHaveLength(2);
    expect(turns[0].duration).toBeCloseTo(2);
    expect(turns[1].duration).toBeCloseTo(2);
  });
  it("cannot auto-confirm a turn across a missing pose", () => {
    const p = fixture(2);
    p.ballet!.poses[20].image = [];
    p.ballet!.poses[20].world = [];
    const rows = calculateBallet(p, "r1");
    expect(rows[20].angle2D).toBeNull();
    expect(
      automaticEvents(rows, balletDefaults).filter(
        (e) => e.type === "TURN COMPLETED",
      ),
    ).toHaveLength(0);
  });
  it("resets on long gaps and camera changes", () => {
    const p = fixture(2);
    p.ballet!.poses = p.ballet!.poses.filter(
      (f) => f.time < 0.8 || f.time > 1.2,
    );
    expect(
      automaticEvents(calculateBallet(p, "r1"), balletDefaults).filter(
        (e) => e.type === "TURN COMPLETED",
      ),
    ).toHaveLength(0);
    const q = fixture(2);
    q.phases = [
      { ...q.phases[0], end: 1 },
      { ...q.phases[0], id: "cut", start: 1, kind: "CUT" },
    ];
    expect(
      automaticEvents(calculateBallet(q, "r1"), balletDefaults).filter(
        (e) => e.type === "TURN COMPLETED",
      ),
    ).toHaveLength(0);
  });
  it("rejects shoulder/hip disagreement", () => {
    const p = fixture();
    p.ballet!.poses[10].world![12].x = -2;
    expect(calculateBallet(p, "r1")[10].heading).toBeNull();
  });
  it("keeps 2D series continuous without 3D headings", () => {
    const p = fixture();
    p.ballet!.poses.forEach((f) => delete f.world);
    const rows = calculateBallet(p, "r1");
    expect(rows[0].positionSegment).toBe(rows[1].positionSegment);
    expect(rows[1].velocity).toBeNull();
  });
  it("preserves raw landmarks on smoothing/recalculation", () => {
    const p = fixture();
    const before = JSON.stringify(p.ballet!.poses);
    p.ballet!.settings.smoothing = "mean";
    calculateBallet(p, "r1");
    expect(JSON.stringify(p.ballet!.poses)).toBe(before);
  });
  it("supports manual shoulder/hip observations without MediaPipe", () => {
    const p = emptyProject();
    for (const [part, x, y] of [
      ["LEFT SHOULDER", 10, 10],
      ["RIGHT SHOULDER", 30, 10],
      ["PELVIS", 20, 30],
    ] as const)
      p.points.push({
        id: part,
        part,
        x,
        y,
        time: 0,
        runner: "r1",
        confidence: 1,
        method: "manual",
      });
    expect(calculateBallet(p, "r1")[0].angle2D).toBeCloseTo(0);
  });
  it("does not apply ground homography to elevated landmarks", () => {
    const p = fixture();
    p.phases[0].keys = [];
    expect(calculateBallet(p, "r1")[0].points["PELVIS CENTER"]).toMatchObject({
      x: 320,
      y: 400,
    });
  });
});
describe("manual events and persistence", () => {
  const ev: BalletEvent = {
    id: "e",
    person: "r1",
    time: 1,
    type: "TURN COMPLETED",
    method: "manual",
    confidence: null,
  };
  it("adds and edits the same event without duplicates", () => {
    let events = editBalletEvent([], ev);
    events = editBalletEvent(events, { ...ev, time: 2 });
    expect(events).toHaveLength(1);
    expect(events[0].time).toBe(2);
  });
  it("separates manual and auto turn summaries", () => {
    const p = fixture(),
      rows = calculateBallet(p, "r1");
    const events = [
      ...automaticEvents(rows, balletDefaults),
      { ...ev, id: "s", type: "ROTATION START", time: 0 },
      { ...ev, time: 2 },
    ];
    const summaries = turnSummaries(rows, events, balletDefaults, 0, 4);
    expect(summaries.filter((t) => t.method === "manual")).toHaveLength(1);
    expect(summaries.filter((t) => t.method === "auto")).toHaveLength(2);
  });
  it("does not count an unbounded first completion or bridge an END", () => {
    expect(turnSummaries([], [ev], balletDefaults, 0, 4)).toHaveLength(0);
    expect(
      turnSummaries(
        [],
        [
          { ...ev, id: "s", type: "ROTATION START", time: 0 },
          { ...ev, id: "end", type: "ROTATION END", time: 0.5 },
          ev,
        ],
        balletDefaults,
        0,
        4,
      ),
    ).toHaveLength(0);
  });
  it("exports frame, summary and event CSV with provenance", () => {
    const p = fixture();
    expect(balletExport(p, "frames")).toContain('"axis_angle_3d"');
    expect(balletExport(p, "frames")).toContain('"synthetic"');
    expect(balletExport(p, "turns")).toContain('"rotation_period"');
    expect(balletExport(p, "events")).toContain('"TURN COMPLETED"');
  });
  it("round-trips raw data, settings and events in project JSON", () => {
    const p = fixture();
    p.ballet!.events = [ev];
    const q = parseProject(JSON.stringify({ ...p, ballet: balletSnapshot(p) }));
    expect(JSON.stringify(q.ballet!.poses)).toEqual(
      JSON.stringify(p.ballet!.poses),
    );
    expect(q.ballet!.events).toEqual([ev]);
    expect(q.ballet!.settings).toEqual(p.ballet!.settings);
  });
  it("still loads old v1 projects", () =>
    expect(
      parseProject(JSON.stringify(emptyProject())).ballet,
    ).toBeUndefined());
});

it("rejects malformed ballet extension on import", () => {
  const p = fixture();
  (p.ballet!.poses as unknown) = null;
  expect(() => parseProject(JSON.stringify(p))).toThrow("BALLET");
  const q = fixture();
  q.ballet!.settings.threshold = NaN;
  expect(() => parseProject(JSON.stringify(q))).toThrow("BALLET");
});
it("recovers a known 30 degree tilt from synthetic landmarks", () => {
  const p = fixture();
  for (const f of p.ballet!.poses)
    for (const i of [11, 12]) f.image[i].x += 200 * Math.tan(Math.PI / 6);
  expect(
    calculateBallet(p, "r1").every((r) => Math.abs(r.angle2D! - 30) < 1e-8),
  ).toBe(true);
});

it("applies a single corrected shoulder before deriving the axis", () => {
  const p = fixture();
  p.points.push({
    id: "correct",
    runner: "r1",
    part: "LEFT SHOULDER",
    time: 0,
    x: 320,
    y: 200,
    method: "corrected",
    confidence: 1,
  });
  const row = calculateBallet(p, "r1")[0];
  expect(row.top!.x).toBe(330);
  expect(row.angle2D).toBeCloseTo((Math.atan2(10, 200) * 180) / Math.PI);
  expect(row.source).toBe("manual/corrected+synthetic");
});
