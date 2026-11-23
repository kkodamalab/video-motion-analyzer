import { csv, phaseAt, type Project, type XY } from "./core";

export type Vec3 = XY & { z: number };
export type Landmark = Vec3 & { visibility?: number };
export type PoseFrame = {
  person: string;
  time: number;
  image: Landmark[];
  world?: Landmark[];
  source: "mediapipe" | "synthetic";
};
export type BalletSettings = {
  axis: "torso" | "head" | "support" | "custom";
  head: "ears" | "nose";
  support: "auto" | "left" | "right";
  customTop: string;
  customBottom: string;
  mode: "2D" | "3D";
  smoothing: "none" | "mean";
  window: number;
  confidence: number;
  maxGap: number;
  minPeriod: number;
  threshold: number;
  sensitivity: number;
  vertical2D: number | null;
  vertical3D: Vec3 | null;
  unit: "px" | "cm" | "m";
  metersPerPixel: number | null;
  signed: boolean;
  trail: number;
  showAxis: boolean;
  color: string;
  width: number;
  opacity: number;
  tracks: string[];
  view:
    | "AXIS TRAJECTORY"
    | "ANGLE PLOT"
    | "ROTATION METRICS"
    | "WORLD COORDINATES";
};
export const balletEvents = [
  "ROTATION START",
  "ROTATION END",
  "TURN COMPLETED",
  "LEFT FOOT CONTACT",
  "RIGHT FOOT CONTACT",
  "BALANCE LOSS",
  "CUSTOM EVENT",
];
export const positionNames = [
  "HEAD",
  "SHOULDER CENTER",
  "PELVIS CENTER",
  "TORSO CENTER",
  "LEFT FOOT",
  "RIGHT FOOT",
  "SUPPORT FOOT",
];
export const balletTracks = [
  "AXIS ANGLE 2D",
  "AXIS ANGLE 3D",
  "ABS AXIS ANGLE",
  ...positionNames.flatMap((n) => [n + " X", n + " Y"]),
  "PELVIS RELATIVE X",
  "PELVIS RELATIVE Y",
  "BODY HEADING",
  "ANGULAR VELOCITY",
  "CUMULATIVE ANGLE",
];
export const balletDefaults: BalletSettings = {
  axis: "torso",
  head: "ears",
  support: "auto",
  customTop: "HEAD",
  customBottom: "PELVIS CENTER",
  mode: "2D",
  smoothing: "none",
  window: 3,
  confidence: 0.6,
  maxGap: 0.25,
  minPeriod: 0.3,
  threshold: 90,
  sensitivity: 30,
  vertical2D: null,
  vertical3D: null,
  unit: "px",
  metersPerPixel: null,
  signed: true,
  trail: 5,
  showAxis: true,
  color: "#ffcc80",
  width: 3,
  opacity: 0.9,
  tracks: ["AXIS ANGLE 2D", "PELVIS CENTER X", "TURN COMPLETED"],
  view: "AXIS TRAJECTORY",
};
export function balletSettings(p: Project): BalletSettings {
  return { ...balletDefaults, ...p.ballet?.settings };
}
export type BalletEvent = {
  id: string;
  type: string;
  time: number;
  person: string;
  method: "manual" | "auto";
  confidence: number | null;
  segment?: number;
};
export type BalletData = {
  settings: BalletSettings;
  poses: PoseFrame[];
  events: BalletEvent[];
};
export type BalletFrame = {
  time: number;
  person: string;
  points: Record<string, XY | undefined>;
  top?: XY;
  bottom?: XY;
  angle2D: number | null;
  angle3D: number | null;
  heading: number | null;
  velocity: number | null;
  cumulative: number | null;
  confidence: number;
  source: string;
  segment: number;
  positionSegment: number;
  warning: string;
  relative?: XY;
};
const rad = 180 / Math.PI;
export const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
export function signedTilt(top: XY, bottom: XY, vertical = 0) {
  const dx = top.x - bottom.x,
    dy = top.y - bottom.y;
  if (!Math.hypot(dx, dy)) return null;
  return wrap(Math.atan2(dx, -dy) * rad - vertical);
}
export function tilt3D(top: Vec3, bottom: Vec3, up: Vec3 | null) {
  if (!up) return null;
  const a = { x: top.x - bottom.x, y: top.y - bottom.y, z: top.z - bottom.z };
  const norm = Math.hypot(a.x, a.y, a.z) * Math.hypot(up.x, up.y, up.z);
  return norm
    ? Math.acos(
        Math.max(
          -1,
          Math.min(1, (a.x * up.x + a.y * up.y + a.z * up.z) / norm),
        ),
      ) * rad
    : null;
}
export const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
export function unwrap(values: (number | null)[]) {
  let last: number | null = null,
    total = 0;
  return values.map((v) => {
    if (!finite(v)) {
      last = null;
      return null;
    }
    total = last === null ? v : total + wrap(v - last);
    last = v;
    return total;
  });
}
export function stats(values: (number | null)[]) {
  const v = values.filter(finite);
  if (!v.length)
    return {
      mean: null,
      meanAbs: null,
      maxAbs: null,
      sd: null,
      rms: null,
      n: 0,
    };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return {
    mean,
    meanAbs: v.reduce((a, b) => a + Math.abs(b), 0) / v.length,
    maxAbs: v.reduce((m, n) => Math.max(m, Math.abs(n)), 0),
    sd: Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length),
    rms: Math.sqrt(v.reduce((a, b) => a + b * b, 0) / v.length),
    n: v.length,
  };
}
export function positionStats(points: (XY | undefined)[]) {
  const v = points.filter((p): p is XY => !!p && finite(p.x) && finite(p.y));
  if (!v.length) return { rms: null, mean: undefined as XY | undefined };
  const mean = {
    x: v.reduce((s, p) => s + p.x, 0) / v.length,
    y: v.reduce((s, p) => s + p.y, 0) / v.length,
  };
  return {
    mean,
    rms: Math.sqrt(
      v.reduce((s, p) => s + (p.x - mean.x) ** 2 + (p.y - mean.y) ** 2, 0) /
        v.length,
    ),
  };
}
function mid(
  a: Landmark | undefined,
  b: Landmark | undefined,
): Landmark | undefined {
  return a && b
    ? {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
        visibility: Math.min(a.visibility ?? 0, b.visibility ?? 0),
      }
    : undefined;
}
export function representative(
  lm: Landmark[],
  s: BalletSettings,
  foot: "left" | "right" = "left",
  footIndex = 29,
) {
  const get = (i: number) => {
    const l = lm[i];
    return l &&
      [l.x, l.y, l.z].every(finite) &&
      (l.visibility ?? 0) >= s.confidence
      ? l
      : undefined;
  };
  const shoulder = mid(get(11), get(12)),
    pelvis = mid(get(23), get(24));
  return {
    HEAD: s.head === "ears" ? mid(get(7), get(8)) : get(0),
    "SHOULDER CENTER": shoulder,
    "PELVIS CENTER": pelvis,
    "TORSO CENTER": mid(shoulder, pelvis),
    "LEFT FOOT": get(footIndex),
    "RIGHT FOOT": get(footIndex + 1),
    "SUPPORT FOOT": get(footIndex + (foot === "right" ? 1 : 0)),
  } as Record<string, Landmark | undefined>;
}
function ends<T>(points: Record<string, T | undefined>, s: BalletSettings) {
  const names =
    s.axis === "torso"
      ? ["SHOULDER CENTER", "PELVIS CENTER"]
      : s.axis === "head"
        ? ["HEAD", "PELVIS CENTER"]
        : s.axis === "support"
          ? ["SHOULDER CENTER", "SUPPORT FOOT"]
          : [s.customTop, s.customBottom];
  return names.map((n) => points[n]);
}
export function unitScale(s: BalletSettings) {
  return s.unit === "px" || !finite(s.metersPerPixel) || s.metersPerPixel <= 0
    ? 1
    : s.metersPerPixel * (s.unit === "cm" ? 100 : 1);
}
export function unitName(s: BalletSettings) {
  return s.unit !== "px" && finite(s.metersPerPixel) && s.metersPerPixel > 0
    ? s.unit
    : "px";
}
function poseFrames(p: Project, person: string, s: BalletSettings) {
  const raw = (p.ballet?.poses || []).filter((f) => f.person === person);
  const times = [
    ...new Set([
      ...raw.map((f) => f.time),
      ...p.points
        .filter(
          (f) =>
            f.runner === person && ["manual", "corrected"].includes(f.method),
        )
        .map((f) => f.time),
    ]),
  ].sort((a, b) => a - b);
  const index = new Map(raw.map((f) => [f.time, f]));
  const manualIndex = new Map<number, Project["points"]>();
  for (const point of p.points)
    if (
      point.runner === person &&
      ["manual", "corrected"].includes(point.method)
    ) {
      const group = manualIndex.get(point.time) || [];
      group.push(point);
      manualIndex.set(point.time, group);
    }
  return times.map((time) => {
    const frame = index.get(time);
    const footIndex =
      p.settings.foot === "toe" ? 31 : p.settings.foot === "ankle" ? 27 : 29;
    const l = frame?.image[footIndex],
      r = frame?.image[footIndex + 1];
    let foot =
      s.support === "auto"
        ? l && r && Math.abs(l.y - r.y) > 2
          ? l.y > r.y
            ? "left"
            : "right"
          : null
        : s.support;
    const image = representative(
        frame?.image || [],
        s,
        foot || "left",
        footIndex,
      ),
      world = representative(frame?.world || [], s, foot || "left", footIndex);
    if (!foot) {
      image["SUPPORT FOOT"] = undefined;
      world["SUPPORT FOOT"] = undefined;
    }
    for (const [name, index] of [
      ["LEFT SHOULDER", 11],
      ["RIGHT SHOULDER", 12],
      ["LEFT HIP", 23],
      ["RIGHT HIP", 24],
    ] as const) {
      const l = frame?.image[index];
      image[name] = l && (l.visibility ?? 0) >= s.confidence ? l : undefined;
    }
    // Exact manual/corrected observations take precedence; no interpolation across missing poses.
    const manual = manualIndex.get(time) || [];
    const aliases: Record<string, string> = {
      PELVIS: "PELVIS CENTER",
      TORSO: "TORSO CENTER",
    };
    for (const pt of manual) {
      image[aliases[pt.part] || pt.part] = {
        x: pt.x,
        y: pt.y,
        z: 0,
        visibility: pt.confidence,
      };
    }
    image["SHOULDER CENTER"] = mid(
      image["LEFT SHOULDER"],
      image["RIGHT SHOULDER"],
    );
    if (!manual.some((pt) => pt.part === "PELVIS"))
      image["PELVIS CENTER"] = mid(image["LEFT HIP"], image["RIGHT HIP"]);
    if (s.support === "auto") {
      const left = image["LEFT FOOT"],
        right = image["RIGHT FOOT"];
      foot =
        left && right && Math.abs(left.y - right.y) > 2
          ? left.y > right.y
            ? "left"
            : "right"
          : null;
    }
    world["SUPPORT FOOT"] = foot
      ? world[foot === "left" ? "LEFT FOOT" : "RIGHT FOOT"]
      : undefined;
    image["TORSO CENTER"] = mid(
      image["SHOULDER CENTER"],
      image["PELVIS CENTER"],
    );
    if (foot)
      image["SUPPORT FOOT"] =
        image[foot === "left" ? "LEFT FOOT" : "RIGHT FOOT"];
    return {
      time,
      image,
      world,
      frame,
      source: manual.length
        ? `manual/corrected${frame ? "+" + frame.source : ""}`
        : frame?.source || "missing",
    };
  });
}
export function calculateBallet(p: Project, person: string): BalletFrame[] {
  const s = balletSettings(p),
    inputs = poseFrames(p, person, s);
  let segment = 0,
    positionSegment = 0;
  let prev: BalletFrame | undefined;
  const output = inputs.map(({ time, image, world, frame, source }) => {
    const [top, bottom] = ends(image, s),
      [wtop, wbottom] = ends(world, s);
    let angle2D =
      top && bottom ? signedTilt(top, bottom, s.vertical2D ?? 0) : null;
    const confidence =
      top && bottom ? Math.min(top.visibility ?? 0, bottom.visibility ?? 0) : 0;
    if (confidence < s.confidence) angle2D = null;
    const angle3D =
      wtop && wbottom ? tilt3D(wtop, wbottom, s.vertical3D) : null;
    let heading: number | null = null;
    const lm = frame?.world;
    if (lm) {
      const ids = [11, 12, 23, 24];
      if (
        ids.every(
          (i) =>
            lm[i] &&
            [lm[i].x, lm[i].y, lm[i].z].every(finite) &&
            (lm[i].visibility ?? frame?.image[i]?.visibility ?? 0) >=
              s.confidence,
        )
      ) {
        const sx = lm[12].x - lm[11].x,
          sz = lm[12].z - lm[11].z,
          hx = lm[24].x - lm[23].x,
          hz = lm[24].z - lm[23].z;
        if (
          Math.hypot(sx, sz) > 0.05 &&
          Math.hypot(hx, hz) > 0.05 &&
          Math.abs(wrap(Math.atan2(sz, sx) * rad - Math.atan2(hz, hx) * rad)) <
            45
        )
          heading = Math.atan2(sz + hz, sx + hx) * rad;
      }
    }
    const dt = prev ? time - prev.time : Infinity,
      delta =
        finite(heading) && finite(prev?.heading)
          ? wrap(heading - prev!.heading!)
          : null;
    const continuous =
      prev &&
      dt > 0 &&
      dt <= s.maxGap &&
      phaseAt(p, time)?.id === phaseAt(p, prev.time)?.id &&
      finite(delta) &&
      Math.abs(delta) <= s.threshold &&
      finite(angle2D) &&
      finite(prev.angle2D);
    if (!continuous) segment++;
    if (
      !prev ||
      dt > s.maxGap ||
      phaseAt(p, time)?.id !== phaseAt(p, prev.time)?.id ||
      !finite(angle2D) ||
      !finite(prev.angle2D)
    )
      positionSegment++;
    const pelvis = image["PELVIS CENTER"],
      support = image["SUPPORT FOOT"];
    const row: BalletFrame = {
      time,
      person,
      points: image,
      top: finite(angle2D) ? top : undefined,
      bottom: finite(angle2D) ? bottom : undefined,
      angle2D,
      angle3D,
      heading,
      velocity: continuous ? delta! / dt : null,
      cumulative: finite(heading)
        ? continuous
          ? (prev!.cumulative ?? 0) + delta!
          : 0
        : null,
      confidence,
      source,
      segment,
      positionSegment,
      warning: !finite(angle2D)
        ? "身体軸欠損 / confidence"
        : !finite(heading)
          ? "方位角不確実 / manual events recommended"
          : !footAvailable(image, s)
            ? "支持足不確実"
            : "",
      relative:
        pelvis && support
          ? { x: pelvis.x - support.x, y: pelvis.y - support.y }
          : undefined,
    };
    prev = row;
    return row;
  });
  if (s.smoothing === "mean") {
    const half = Math.floor(Math.max(1, Math.min(31, s.window)) / 2);
    return output.map((row, i) => {
      if (!finite(row.angle2D)) return row;
      const neighbors = output
        .slice(Math.max(0, i - half), i + half + 1)
        .filter((x) => x.positionSegment === row.positionSegment);
      return {
        ...row,
        angle2D: stats(
          neighbors.map((x) =>
            finite(x.angle2D)
              ? row.angle2D! + wrap(x.angle2D - row.angle2D!)
              : null,
          ),
        ).mean,
        angle3D: finite(row.angle3D)
          ? stats(neighbors.map((x) => x.angle3D)).mean
          : null,
      };
    });
  }
  return output;
}
function footAvailable(points: Record<string, unknown>, s: BalletSettings) {
  return s.axis !== "support" || !!points["SUPPORT FOOT"];
}
export function automaticEvents(
  rows: BalletFrame[],
  s: BalletSettings,
): BalletEvent[] {
  const out: BalletEvent[] = [];
  let start: BalletFrame | undefined,
    lastTurn = 0,
    lastTime = 0;
  const event = (type: string, row: BalletFrame, time = row.time) =>
    out.push({
      id: `auto-${row.person}-${row.segment}-${type}-${time}`,
      type,
      time,
      person: row.person,
      method: "auto",
      confidence: row.confidence,
      segment: row.segment,
    });
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i],
      prev = rows[i - 1];
    if (
      start &&
      (row.segment !== prev.segment ||
        !finite(row.velocity) ||
        Math.abs(row.velocity) < s.sensitivity)
    ) {
      event("ROTATION END", prev);
      start = undefined;
    }
    if (finite(row.velocity) && Math.abs(row.velocity) >= s.sensitivity) {
      if (!start) {
        start = prev;
        lastTurn = prev.cumulative ?? 0;
        lastTime = prev.time;
        event("ROTATION START", prev);
      }
      const a = prev.cumulative,
        b = row.cumulative;
      if (finite(a) && finite(b) && Math.abs(b - lastTurn) >= 360) {
        const target = lastTurn + Math.sign(b - lastTurn) * 360;
        const t = prev.time + ((row.time - prev.time) * (target - a)) / (b - a);
        if (t - lastTime >= s.minPeriod) {
          event("TURN COMPLETED", row, t);
          lastTurn = target;
          lastTime = t;
        }
      }
    }
  } // Do not invent an END when acquisition stops while still rotating.
  return out;
}
export function editBalletEvent(events: BalletEvent[], event: BalletEvent) {
  return [
    ...events.filter((e) => e.id !== event.id),
    { ...event, method: "manual" as const },
  ].sort((a, b) => a.time - b.time);
}
export function allBalletEvents(
  p: Project,
  person: string,
  rows = calculateBallet(p, person),
) {
  return [
    ...automaticEvents(rows, balletSettings(p)),
    ...(p.ballet?.events || []).filter((e) => e.person === person),
  ].sort((a, b) => a.time - b.time);
}
export function rangeRows(p: Project, rows: BalletFrame[]) {
  return rows.filter(
    (r) => r.time >= p.settings.loopStart && r.time <= p.settings.loopEnd,
  );
}
export function metrics(rows: BalletFrame[], s: BalletSettings) {
  const angles = stats(
    rows.map((r) => (s.mode === "3D" ? r.angle3D : r.angle2D)),
  );
  const position = positionStats(rows.map((r) => r.points["PELVIS CENTER"]));
  let length = 0,
    edges = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1],
      b = rows[i],
      pa = a.points["PELVIS CENTER"],
      pb = b.points["PELVIS CENTER"];
    if (
      pa &&
      pb &&
      b.time - a.time <= s.maxGap &&
      a.positionSegment === b.positionSegment
    ) {
      length += Math.hypot(pb.x - pa.x, pb.y - pa.y);
      edges++;
    }
  }
  const first = rows.find((r) => r.points["PELVIS CENTER"])?.points[
      "PELVIS CENTER"
    ],
    last = [...rows].reverse().find((r) => r.points["PELVIS CENTER"])?.points[
      "PELVIS CENTER"
    ];
  const headFirst = rows.find((r) => r.points.HEAD)?.points.HEAD,
    headLast = [...rows].reverse().find((r) => r.points.HEAD)?.points.HEAD;
  const scale = unitScale(s);
  return {
    ...angles,
    axisRMS: position.rms === null ? null : position.rms * scale,
    pathLength: edges ? length * scale : null,
    pelvisDisplacement: first && last ? (last.x - first.x) * scale : null,
    headDisplacement:
      headFirst && headLast ? (headLast.x - headFirst.x) * scale : null,
  };
}
export function turnSummaries(
  rows: BalletFrame[],
  events: BalletEvent[],
  s: BalletSettings,
  from: number,
  to: number,
) {
  const result: {
    turn: number;
    start: number;
    end: number;
    duration: number;
    method: string;
    metrics: ReturnType<typeof metrics>;
  }[] = [];
  for (const method of ["manual", "auto"] as const) {
    let start: BalletEvent | undefined;
    for (const event of events
      .filter((e) => e.method === method && e.time >= from && e.time <= to)
      .sort((a, b) => a.time - b.time)) {
      if (event.type === "ROTATION START") start = event;
      else if (event.type === "ROTATION END") start = undefined;
      else if (event.type === "TURN COMPLETED") {
        if (
          start &&
          event.time > start.time &&
          (method === "manual" || event.segment === start.segment)
        ) {
          const selected = rows.filter(
            (r) => r.time >= start!.time && r.time <= event.time,
          );
          result.push({
            turn: result.filter((t) => t.method === method).length + 1,
            start: start.time,
            end: event.time,
            duration: event.time - start.time,
            method,
            metrics: metrics(selected, s),
          });
        }
        start = event;
      }
    }
  }
  return result;
}
export function periodStats(periods: number[]) {
  const st = stats(periods);
  return {
    mean: st.mean,
    sd: periods.length >= 2 ? st.sd : null,
    cv: periods.length >= 2 && st.mean ? (st.sd! / st.mean) * 100 : null,
  };
}
export function seriesValue(
  row: BalletFrame,
  name: string,
  s: BalletSettings,
): number | null {
  if (name === "AXIS ANGLE 2D")
    return row.angle2D === null
      ? null
      : s.signed
        ? row.angle2D
        : Math.abs(row.angle2D);
  if (name === "AXIS ANGLE 3D") return row.angle3D;
  if (name === "ABS AXIS ANGLE") {
    const a = s.mode === "3D" ? row.angle3D : row.angle2D;
    return a === null ? null : Math.abs(a);
  }
  if (name === "BODY HEADING") return row.heading;
  if (name === "ANGULAR VELOCITY") return row.velocity;
  if (name === "CUMULATIVE ANGLE") return row.cumulative;
  const axis = name.endsWith(" X") ? "x" : "y",
    key = name.slice(0, -2),
    point = key === "PELVIS RELATIVE" ? row.relative : row.points[key];
  return point ? point[axis] * unitScale(s) : null;
}
export function balletExport(p: Project, kind: "frames" | "turns" | "events") {
  const s = balletSettings(p);
  const rows: unknown[][] = [];
  if (kind === "frames") {
    rows.push([
      "frame",
      "timestamp",
      "person_id",
      ...positionNames.flatMap((n) => [
        n.toLowerCase().replaceAll(" ", "_") + "_x",
        n.toLowerCase().replaceAll(" ", "_") + "_y",
      ]),
      "axis_angle_2d",
      "axis_angle_3d",
      "axis_position_x",
      "axis_position_y",
      "body_heading",
      "angular_velocity",
      "cumulative_angle",
      "confidence",
      "measurement_source",
      "position_unit",
      "segment",
      "warning",
    ]);
    for (const person of p.runners)
      for (const r of rangeRows(p, calculateBallet(p, person.id)))
        rows.push([
          Math.round(r.time * p.fps),
          r.time,
          person.id,
          ...positionNames
            .flatMap((n) => [r.points[n]?.x, r.points[n]?.y])
            .map((n) => (finite(n) ? n * unitScale(s) : null)),
          r.angle2D,
          r.angle3D,
          finite(r.points["PELVIS CENTER"]?.x)
            ? r.points["PELVIS CENTER"]!.x * unitScale(s)
            : null,
          finite(r.points["PELVIS CENTER"]?.y)
            ? r.points["PELVIS CENTER"]!.y * unitScale(s)
            : null,
          r.heading,
          r.velocity,
          r.cumulative,
          r.confidence,
          r.source,
          unitName(s),
          r.segment,
          r.warning,
        ]);
  } else if (kind === "events") {
    rows.push([
      "event_type",
      "timestamp",
      "frame",
      "person_id",
      "manual_or_auto",
      "confidence",
    ]);
    for (const person of p.runners)
      for (const e of allBalletEvents(p, person.id).filter(
        (e) => e.time >= p.settings.loopStart && e.time <= p.settings.loopEnd,
      ))
        rows.push([
          e.type,
          e.time,
          Math.round(e.time * p.fps),
          e.person,
          e.method,
          e.confidence,
        ]);
  } else {
    rows.push([
      "turn_id",
      "person_id",
      "start_time",
      "end_time",
      "duration",
      "mean_axis_angle",
      "max_axis_angle",
      "axis_angle_sd",
      "axis_position_rms",
      "rotation_period",
      "manual_or_auto",
      "position_unit",
    ]);
    for (const person of p.runners) {
      const frames = calculateBallet(p, person.id);
      for (const t of turnSummaries(
        frames,
        allBalletEvents(p, person.id, frames),
        s,
        p.settings.loopStart,
        p.settings.loopEnd,
      ))
        rows.push([
          t.turn,
          person.id,
          t.start,
          t.end,
          t.duration,
          t.metrics.meanAbs,
          t.metrics.maxAbs,
          t.metrics.sd,
          t.metrics.axisRMS,
          t.duration,
          t.method,
          unitName(s),
        ]);
    }
  }
  return csv(rows);
}
export function balletSnapshot(p: Project) {
  return {
    settings: balletSettings(p),
    poses: p.ballet?.poses || [],
    events: p.ballet?.events || [],
    derived: p.runners.map((r) => {
      const frames = calculateBallet(p, r.id);
      return {
        person: r.id,
        aggregate: aggregateTurns(
          turnSummaries(
            frames,
            allBalletEvents(p, r.id, frames),
            balletSettings(p),
            p.settings.loopStart,
            p.settings.loopEnd,
          ),
        ),
        frames,
        events: allBalletEvents(p, r.id, frames),
        turns: turnSummaries(
          frames,
          allBalletEvents(p, r.id, frames),
          balletSettings(p),
          p.settings.loopStart,
          p.settings.loopEnd,
        ),
      };
    }),
  };
}

export function aggregateTurns(turns: ReturnType<typeof turnSummaries>) {
  return (["manual", "auto"] as const).map((method) => {
    const selected = turns.filter((t) => t.method === method);
    return {
      method,
      count: selected.length,
      duration: stats(selected.map((t) => t.duration)),
      meanAxisAngle: stats(selected.map((t) => t.metrics.meanAbs)),
      maxAxisAngle: stats(selected.map((t) => t.metrics.maxAbs)),
      axisAngleSD: stats(selected.map((t) => t.metrics.sd)),
      axisPositionRMS: stats(selected.map((t) => t.metrics.axisRMS)),
    };
  });
}

/** Validate imported extension data before any graph or calculation consumes it. */
export function parseBalletData(value: unknown): BalletData {
  const d = value as BalletData;
  const fail = () => {
    throw Error("無効なBALLET ROTATIONデータ");
  };
  if (
    !d ||
    typeof d !== "object" ||
    !d.settings ||
    typeof d.settings !== "object" ||
    !Array.isArray(d.poses) ||
    !Array.isArray(d.events)
  )
    return fail();
  const s = { ...balletDefaults, ...d.settings };
  const choices: Partial<Record<keyof BalletSettings, readonly string[]>> = {
    axis: ["torso", "head", "support", "custom"],
    head: ["ears", "nose"],
    support: ["auto", "left", "right"],
    mode: ["2D", "3D"],
    smoothing: ["none", "mean"],
    unit: ["px", "cm", "m"],
    view: [
      "AXIS TRAJECTORY",
      "ANGLE PLOT",
      "ROTATION METRICS",
      "WORLD COORDINATES",
    ],
    customTop: positionNames,
    customBottom: positionNames,
  };
  for (const [key, values] of Object.entries(choices))
    if (!values.includes(s[key as keyof BalletSettings] as string))
      return fail();
  for (const [key, min, max] of [
    ["window", 1, 31],
    ["confidence", 0, 1],
    ["maxGap", 0.01, 5],
    ["minPeriod", 0.1, 10],
    ["threshold", 1, 179],
    ["sensitivity", 1, 720],
    ["trail", 0.1, 120],
    ["width", 1, 12],
    ["opacity", 0, 1],
  ] as const) {
    const n = s[key];
    if (!finite(n) || n < min || n > max) return fail();
  }
  if (
    !Array.isArray(s.tracks) ||
    !s.tracks.every((x) => typeof x === "string") ||
    typeof s.signed !== "boolean" ||
    typeof s.showAxis !== "boolean" ||
    typeof s.color !== "string"
  )
    return fail();
  if (
    (s.vertical2D !== null && !finite(s.vertical2D)) ||
    (s.metersPerPixel !== null &&
      (!finite(s.metersPerPixel) || s.metersPerPixel < 0))
  )
    return fail();
  if (
    s.vertical3D !== null &&
    (!s.vertical3D ||
      ![s.vertical3D.x, s.vertical3D.y, s.vertical3D.z].every(finite))
  )
    return fail();
  const landmarks = (ls: Landmark[]) =>
    Array.isArray(ls) &&
    (ls.length === 0 || ls.length === 33) &&
    ls.every(
      (l) =>
        l &&
        [l.x, l.y, l.z].every(finite) &&
        (l.visibility === undefined || finite(l.visibility)),
    );
  for (const f of d.poses)
    if (
      !f ||
      !finite(f.time) ||
      f.time < 0 ||
      typeof f.person !== "string" ||
      !["mediapipe", "synthetic"].includes(f.source) ||
      !landmarks(f.image) ||
      (f.world !== undefined && !landmarks(f.world))
    )
      return fail();
  for (const e of d.events)
    if (
      !e ||
      typeof e.id !== "string" ||
      typeof e.person !== "string" ||
      typeof e.type !== "string" ||
      !finite(e.time) ||
      e.time < 0 ||
      !["manual", "auto"].includes(e.method) ||
      (e.confidence !== null && !finite(e.confidence))
    )
      return fail();
  return { settings: s, poses: d.poses, events: d.events };
}
