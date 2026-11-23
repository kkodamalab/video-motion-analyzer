import { useState } from "react";
import { type Project, uid } from "./core";
import {
  aggregateTurns,
  allBalletEvents,
  balletEvents,
  balletSettings,
  balletTracks,
  editBalletEvent,
  finite,
  metrics,
  periodStats,
  positionNames,
  positionStats,
  rangeRows,
  seriesValue,
  turnSummaries,
  unitName,
  unitScale,
  type BalletFrame,
  type BalletSettings,
} from "./ballet";
type Props = {
  p: Project;
  rows: BalletFrame[];
  person: string;
  time: number;
  onSeek: (t: number) => void;
  onChange: (p: Project) => void;
};
export const researchWarning =
  "単眼MediaPipeの3D姿勢は推定値です。回転中の遮蔽・左右入れ替わりで精度が低下します。画像の傾斜と実空間の傾斜は異なり、軸位置変動は撮影方向に依存します。真の重心・力学的回転軸を直接測定しません。角速度にも誤差があるため、研究利用では手動注釈やモーションキャプチャとの妥当性検証が必要です。";
const fmt = (n: unknown) => (finite(n) ? n.toFixed(2) : "—");
export function changeBallet(
  p: Project,
  patch: Partial<BalletSettings>,
): Project {
  return {
    ...p,
    ballet: {
      poses: p.ballet?.poses || [],
      events: p.ballet?.events || [],
      settings: { ...balletSettings(p), ...patch },
    },
  };
}
export function BalletSettingsPanel({
  p,
  onChange,
}: {
  p: Project;
  onChange: (p: Project) => void;
}) {
  const s = balletSettings(p);
  const set = (patch: Partial<BalletSettings>) =>
    onChange(changeBallet(p, patch));
  const select = (
    label: string,
    key: keyof BalletSettings,
    values: string[],
    names = values,
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={String(s[key])}
        onChange={(e) => set({ [key]: e.target.value })}
      >
        {values.map((v, i) => (
          <option key={v} value={v}>
            {names[i]}
          </option>
        ))}
      </select>
    </label>
  );
  const num = (
    label: string,
    key: keyof BalletSettings,
    min: number,
    max: number,
    step = 0.1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={s[key] as number}
        onChange={(e) =>
          set({ [key]: Math.max(min, Math.min(max, +e.target.value)) })
        }
      />
    </label>
  );
  return (
    <section className="ballet-settings">
      <h3>BALLET ROTATION</h3>
      {select(
        "BODY AXIS",
        "axis",
        ["torso", "head", "support", "custom"],
        [
          "A · Shoulder – Pelvis",
          "B · Head – Pelvis",
          "C · Shoulder – Support foot",
          "D · Custom points",
        ],
      )}
      {s.axis === "custom" && (
        <>
          {select("CUSTOM TOP", "customTop", positionNames)}
          {select("CUSTOM BOTTOM", "customBottom", positionNames)}
        </>
      )}
      {select("HEAD DEFINITION", "head", ["ears", "nose"])}
      {select("ANALYSIS DIMENSION", "mode", ["2D", "3D"])}
      {select("SUPPORT FOOT", "support", ["auto", "left", "right"])}
      <p className="hint">
        AUTO支持足:
        画像内で低い足（差2px超）。接地確定ではありません。不明時は手動指定。
      </p>
      {select("SMOOTHING", "smoothing", ["none", "mean"])}
      {num("WINDOW (samples)", "window", 1, 31, 2)}
      {num("CONFIDENCE THRESHOLD", "confidence", 0, 1, 0.05)}
      {num("MAX VALID GAP (s)", "maxGap", 0.01, 5)}
      {num("MAX HEADING STEP (deg)", "threshold", 1, 179, 1)}
      {num("MIN TURN PERIOD (s)", "minPeriod", 0.1, 10)}
      {num("ROTATION SENSITIVITY (deg/s)", "sensitivity", 1, 720, 1)}
      {num("TRAJECTORY RANGE (s)", "trail", 0.1, 120)}
      <h4>VERTICAL REFERENCE</h4>
      <label>
        IMAGE UP angle (deg, blank = apparent)
        <input
          aria-label="Image vertical angle"
          type="number"
          min="-180"
          max="180"
          value={s.vertical2D ?? ""}
          onChange={(e) =>
            set({ vertical2D: e.target.value === "" ? null : +e.target.value })
          }
        />
      </label>
      <p className="hint">
        画像内で既知の鉛直線の上向きを、画像上方向から時計回りに入力。未校正:
        画像上の見かけの傾斜角。
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={!!s.vertical3D}
          onChange={(e) =>
            set({ vertical3D: e.target.checked ? { x: 0, y: -1, z: 0 } : null })
          }
        />{" "}
        DEFINE ESTIMATED 3D UP
      </label>
      {s.vertical3D && (
        <div className="three">
          {(["x", "y", "z"] as const).map((k) => (
            <label key={k}>
              UP {k}
              <input
                type="number"
                step=".1"
                value={s.vertical3D![k]}
                onChange={(e) =>
                  set({
                    vertical3D: { ...s.vertical3D!, [k]: +e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
      <p className="hint">
        3D基準はMediaPipe座標系内のユーザー定義ベクトル。初期値(0,−1,0)は仮定であり実測鉛直ではありません。未定義/ゼロベクトルは欠損。
      </p>
      {select("POSITION UNIT", "unit", ["px", "cm", "m"])}
      {s.unit !== "px" && (
        <label>
          IMAGE PLANE SCALE (m/px)
          <input
            type="number"
            min="0"
            step=".0001"
            value={s.metersPerPixel ?? ""}
            onChange={(e) =>
              set({
                metersPerPixel: e.target.value === "" ? null : +e.target.value,
              })
            }
          />
        </label>
      )}
      <p className="hint">
        同じ撮影平面内の既知距離からのみスケール指定。未校正はpx。地面ホモグラフィを頭部・骨盤に適用しません。
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={s.signed}
          onChange={(e) => set({ signed: e.target.checked })}
        />{" "}
        SIGNED 2D ANGLE
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={s.showAxis}
          onChange={(e) => set({ showAxis: e.target.checked })}
        />{" "}
        SHOW BODY AXIS
      </label>
      <label>
        AXIS COLOR
        <input
          type="color"
          value={s.color}
          onChange={(e) => set({ color: e.target.value })}
        />
      </label>
      {num("AXIS WIDTH", "width", 1, 12, 1)}
      {num("AXIS OPACITY", "opacity", 0, 1, 0.05)}
      <button className="wide" onClick={() => set({ ...s })}>
        RECALCULATE FROM RAW LANDMARKS
      </button>
      <p className="hint">
        設定変更時に自動再計算。元データを保持。SDは符号付き2D角/非負3D角の平均周り、RMSは0°基準、いずれも有効標本の母集団統計。欠損を0に置換しません。
      </p>
      <p className="warning">{researchWarning}</p>
    </section>
  );
}
export function BalletOverlay({
  rows,
  time,
  p,
  scale,
}: {
  rows: BalletFrame[];
  time: number;
  p: Project;
  scale: number;
}) {
  const s = balletSettings(p),
    row = rows.reduce<BalletFrame | undefined>(
      (best, r) =>
        Math.abs(r.time - time) < Math.abs((best?.time ?? Infinity) - time)
          ? r
          : best,
      undefined,
    );
  if (!s.showAxis) return null;
  const valid =
    row && Math.abs(row.time - time) <= 0.5 / p.fps && row.top && row.bottom;
  return valid ? (
    <g data-testid="body-axis" pointerEvents="none">
      <line
        x1={row.top!.x}
        y1={row.top!.y}
        x2={row.bottom!.x}
        y2={row.bottom!.y}
        stroke={s.color}
        strokeWidth={s.width / scale}
        opacity={s.opacity}
      />
      <text
        x={row.top!.x + 10 / scale}
        y={row.top!.y}
        fill={s.color}
        fontSize={12 / scale}
      >
        {fmt(
          s.mode === "3D"
            ? row.angle3D
            : s.signed
              ? row.angle2D
              : Math.abs(row.angle2D!),
        )}
        ° {s.mode}
      </text>
    </g>
  ) : (
    <text
      data-testid="axis-missing"
      x="20"
      y="35"
      fill="#ffcc80"
      fontSize={14 / scale}
    >
      AXIS — 欠損 / このフレームに観測なし
    </text>
  );
}
export function Graph({
  rows,
  name,
  p,
  time,
  onSeek,
  events = [],
}: {
  rows: BalletFrame[];
  name: string;
  p: Project;
  time: number;
  onSeek: (t: number) => void;
  events?: ReturnType<typeof allBalletEvents>;
}) {
  const s = balletSettings(p),
    values = rows.map((r) => seriesValue(r, name, s)),
    valid = values.filter(finite),
    min = valid.length ? Math.min(...valid) : 0,
    max = valid.length ? Math.max(...valid) : 1;
  let path = "",
    previous: BalletFrame | undefined;
  rows.forEach((r, i) => {
    const v = values[i];
    if (!finite(v)) {
      previous = undefined;
      return;
    }
    const command =
      !previous ||
      r.time - previous.time > s.maxGap ||
      (["BODY HEADING", "ANGULAR VELOCITY", "CUMULATIVE ANGLE"].includes(name)
        ? r.segment !== previous.segment
        : r.positionSegment !== previous.positionSegment)
        ? "M"
        : "L";
    path += `${command}${(r.time / p.duration) * 1000},${54 - ((v - min) / (max - min || 1)) * 44} `;
    previous = r;
  });
  return (
    <svg
      className="ballet-graph"
      data-series={name}
      viewBox="0 0 1000 64"
      preserveAspectRatio="none"
      onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - b.left) / b.width) * p.duration);
      }}
    >
      <rect
        x={(p.settings.loopStart / p.duration) * 1000}
        width={
          ((p.settings.loopEnd - p.settings.loopStart) / p.duration) * 1000
        }
        height="64"
        fill="#60d5c410"
      />
      <path
        d={path}
        fill="none"
        stroke="#60d5c4"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {events.map((e) => (
        <line
          key={e.id}
          x1={(e.time / p.duration) * 1000}
          x2={(e.time / p.duration) * 1000}
          y1="0"
          y2="64"
          stroke={e.method === "manual" ? "#ffcc80" : "#9c9af7"}
          strokeDasharray="3 3"
        />
      ))}
      <line
        x1={(time / p.duration) * 1000}
        x2={(time / p.duration) * 1000}
        y1="0"
        y2="64"
        stroke="#fff"
      />
      <text x="6" y="12" fill="#b6c8cf" fontSize="10">
        {valid.length ? `${fmt(min)} … ${fmt(max)}` : "NO VALID DATA"}
      </text>
    </svg>
  );
}
export function BalletTimeline(props: Props) {
  const { p, rows, person, time, onSeek, onChange } = props,
    s = balletSettings(p),
    events = allBalletEvents(p, person, rows);
  const [type, setType] = useState("TURN COMPLETED");
  const [custom, setCustom] = useState("CUSTOM EVENT");
  const add = (t: number) =>
    onChange({
      ...p,
      ballet: {
        settings: s,
        poses: p.ballet?.poses || [],
        events: editBalletEvent(p.ballet?.events || [], {
          id: uid(),
          type: type === "CUSTOM EVENT" ? custom || type : type,
          time: t,
          person,
          method: "manual",
          confidence: null,
        }),
      },
    });
  return (
    <div className="ballet-timeline" data-testid="ballet-timeline">
      <div className="ballet-toolbar">
        <strong>
          BALLET ROTATION · {p.runners.find((r) => r.id === person)?.name}
        </strong>
        <button
          onClick={() =>
            onChange({
              ...p,
              settings: {
                ...p.settings,
                loopStart: Math.min(time, p.settings.loopEnd - 0.001),
              },
            })
          }
        >
          RANGE START @ CURSOR
        </button>
        <button
          onClick={() =>
            onChange({
              ...p,
              settings: {
                ...p.settings,
                loopEnd: Math.max(time, p.settings.loopStart + 0.001),
              },
            })
          }
        >
          RANGE END @ CURSOR
        </button>
        <span>
          {fmt(p.settings.loopStart)}–{fmt(p.settings.loopEnd)} s
        </span>
      </div>
      <div className="ballet-toolbar">
        <label>
          ROTATION EVENT
          <select
            aria-label="ROTATION EVENT"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {balletEvents.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {type === "CUSTOM EVENT" && (
          <input
            aria-label="Custom ballet event"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
        <button onClick={() => add(time)}>＋ MANUAL EVENT @ CURSOR</button>
      </div>
      <details>
        <summary>VISIBLE BALLET TRACKS</summary>
        <div className="series-options">
          {[...balletTracks, ...balletEvents].map((track) => (
            <label className="check" key={track}>
              <input
                type="checkbox"
                checked={s.tracks.includes(track)}
                onChange={(e) =>
                  onChange(
                    changeBallet(p, {
                      tracks: e.target.checked
                        ? [...s.tracks, track]
                        : s.tracks.filter((t) => t !== track),
                    }),
                  )
                }
              />
              {track}
            </label>
          ))}
        </div>
      </details>
      {balletTracks
        .filter((n) => s.tracks.includes(n))
        .map((name) => (
          <div className="timeline-row ballet-row" key={name}>
            <div className="track-label">
              {name}
              <small>
                {name.includes("ANGLE") || name === "BODY HEADING"
                  ? "deg"
                  : name === "ANGULAR VELOCITY"
                    ? "deg/s"
                    : unitName(s)}
              </small>
            </div>
            <div className="track-lane">
              <Graph
                rows={rows}
                name={name}
                p={p}
                time={time}
                onSeek={onSeek}
              />
            </div>
          </div>
        ))}
      {balletEvents
        .filter((n) => s.tracks.includes(n))
        .map((name) => (
          <div className="timeline-row event-row" key={name}>
            <div className="track-label">{name}</div>
            <div
              className="track-lane"
              onDoubleClick={(e) => {
                const b = e.currentTarget.getBoundingClientRect();
                const t = ((e.clientX - b.left) / b.width) * p.duration;
                onSeek(t);
                onChange({
                  ...p,
                  ballet: {
                    settings: s,
                    poses: p.ballet?.poses || [],
                    events: editBalletEvent(p.ballet?.events || [], {
                      id: uid(),
                      type: name,
                      time: t,
                      person,
                      method: "manual",
                      confidence: null,
                    }),
                  },
                });
              }}
            >
              {events
                .filter((e) =>
                  name === "CUSTOM EVENT"
                    ? !balletEvents.slice(0, -1).includes(e.type)
                    : e.type === name,
                )
                .map((e) => (
                  <button
                    className="ballet-event"
                    key={e.id}
                    title={`${e.type} ${e.time.toFixed(3)}s ${e.method}`}
                    style={{
                      left: `${(e.time / p.duration) * 100}%`,
                      color: e.method === "manual" ? "#ffcc80" : "#9c9af7",
                    }}
                    onClick={() => onSeek(e.time)}
                  >
                    ◆
                  </button>
                ))}
            </div>
          </div>
        ))}
      <details>
        <summary>EDIT BALLET EVENTS ({events.length})</summary>
        <p className="hint">
          自動候補と手動確定を分離。自動候補を編集すると手動コピーとして保存。確定回転の集計にはSTARTとTURN
          COMPLETEDを指定。
        </p>
        {events.map((e) => (
          <div className="ballet-event-editor" key={e.id}>
            <span>
              {e.type} · {e.method}
            </span>
            <input
              aria-label={`Event time ${e.id}`}
              type="number"
              step={1 / p.fps}
              min="0"
              max={p.duration}
              value={e.time}
              onChange={(ev) => {
                const edited = {
                  ...e,
                  id: e.method === "auto" ? `review-${e.id}` : e.id,
                  time: Math.max(0, Math.min(p.duration, +ev.target.value)),
                };
                onChange({
                  ...p,
                  ballet: {
                    settings: s,
                    poses: p.ballet?.poses || [],
                    events: editBalletEvent(p.ballet?.events || [], edited),
                  },
                });
              }}
            />
            <button onClick={() => onSeek(e.time)}>SEEK</button>
            {e.method === "manual" && (
              <button
                onClick={() =>
                  onChange({
                    ...p,
                    ballet: {
                      settings: s,
                      poses: p.ballet?.poses || [],
                      events: (p.ballet?.events || []).filter(
                        (x) => x.id !== e.id,
                      ),
                    },
                  })
                }
              >
                DELETE
              </button>
            )}
          </div>
        ))}
      </details>
    </div>
  );
}
export function BalletView({ p, rows, person, time, onSeek, onChange }: Props) {
  const s = balletSettings(p),
    selected = rangeRows(p, rows),
    m = metrics(selected, s),
    events = allBalletEvents(p, person, rows),
    turns = turnSummaries(
      rows,
      events,
      s,
      p.settings.loopStart,
      p.settings.loopEnd,
    ),
    manual = turns.filter((t) => t.method === "manual"),
    auto = turns.filter((t) => t.method === "auto"),
    period = periodStats(
      (manual.length ? manual : auto).map((t) => t.duration),
    );
  const recent = selected.filter(
      (r) => r.time <= time && r.time >= time - s.trail,
    ),
    scale = unitScale(s),
    names = ["PELVIS CENTER", "HEAD", "SUPPORT FOOT"],
    pts = recent
      .flatMap((r) => names.map((n) => r.points[n]))
      .filter((pt): pt is { x: number; y: number } => !!pt),
    xs = pts.map((pt) => pt.x),
    ys = pts.map((pt) => pt.y),
    minX = pts.length ? Math.min(...xs) : 0,
    maxX = pts.length ? Math.max(...xs) : p.width,
    minY = pts.length ? Math.min(...ys) : 0,
    maxY = pts.length ? Math.max(...ys) : p.height;
  const range = Math.max(maxX - minX, maxY - minY, 1),
    px = (x: number) => 40 + ((x - minX) / range) * 250,
    py = (y: number) => 30 + ((y - minY) / range) * 250;
  return (
    <div className="ballet-view" data-testid="ballet-view">
      <div className="pane-heading">
        <select
          aria-label="Ballet analysis view"
          value={s.view}
          onChange={(e) =>
            onChange(
              changeBallet(p, {
                view: e.target.value as BalletSettings["view"],
              }),
            )
          }
        >
          {[
            "AXIS TRAJECTORY",
            "ANGLE PLOT",
            "ROTATION METRICS",
            "WORLD COORDINATES",
          ].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <span>
          {s.mode === "2D"
            ? s.vertical2D === null
              ? "画像上の見かけの傾斜"
              : "校正画像内の傾斜"
            : "推定3D・定義基準への角度"}
        </span>
      </div>
      {s.view === "AXIS TRAJECTORY" && (
        <>
          <svg viewBox="0 0 600 330" aria-label="Axis trajectory">
            <path d="M35 20V290H310" fill="none" stroke="#81999f" />
            {names.map((name, i) => {
              let path = "";
              let previous: BalletFrame | undefined;
              for (const row of recent) {
                const pt = row.points[name];
                if (!pt) {
                  previous = undefined;
                  continue;
                }
                path += `${previous && row.positionSegment === previous.positionSegment && row.time - previous.time <= s.maxGap ? "L" : "M"}${px(pt.x)},${py(pt.y)} `;
                previous = row;
              }
              const avg = positionStats(recent.map((r) => r.points[name])).mean;
              return (
                <g key={name} stroke={["#60d5c4", "#ffcc80", "#9c9af7"][i]}>
                  <path d={path} fill="none" strokeWidth="2" />
                  {avg && (
                    <circle cx={px(avg.x)} cy={py(avg.y)} r="4" fill="none" />
                  )}
                  <text
                    x="320"
                    y={50 + i * 25}
                    fill={["#60d5c4", "#ffcc80", "#9c9af7"][i]}
                    stroke="none"
                    fontSize="12"
                  >
                    {name} · ○ mean
                  </text>
                </g>
              );
            })}
            <text x="40" y="310" fill="#b6c8cf" fontSize="11">
              X {fmt(minX * scale)} … {fmt((minX + range) * scale)}{" "}
              {unitName(s)}
            </text>
            <text x="320" y="150" fill="#b6c8cf" fontSize="11">
              Y {fmt(minY * scale)} … {fmt((minY + range) * scale)}{" "}
              {unitName(s)} ↓
            </text>
            <text x="320" y="175" fill="#b6c8cf" fontSize="11">
              {fmt(Math.max(p.settings.loopStart, time - s.trail))}–{fmt(time)}{" "}
              s
            </text>
            {!pts.length && (
              <text x="120" y="170" fill="#b6c8cf">
                NO VALID DATA
              </text>
            )}
          </svg>
        </>
      )}
      {s.view === "ANGLE PLOT" && (
        <div className="ballet-angle">
          <Graph
            rows={rows}
            name={s.mode === "3D" ? "AXIS ANGLE 3D" : "AXIS ANGLE 2D"}
            p={p}
            time={time}
            onSeek={onSeek}
            events={events}
          />
          <p>deg · 白線: 再生ヘッド / 黄: 手動 / 紫: 自動候補</p>
        </div>
      )}
      {s.view === "ROTATION METRICS" && (
        <div className="ballet-metrics">
          {[
            ["Manual turns", manual.length || null],
            ["Auto turn candidates", auto.length || null],
            ["Mean |tilt| (deg)", m.meanAbs],
            ["Max |tilt| (deg)", m.maxAbs],
            ["Tilt SD (deg)", m.sd],
            ["Tilt RMS (deg)", m.rms],
            [`Axis position RMS (${unitName(s)})`, m.axisRMS],
            [`Axis path length (${unitName(s)})`, m.pathLength],
            [`Pelvis ΔX (${unitName(s)})`, m.pelvisDisplacement],
            [`Head ΔX (${unitName(s)})`, m.headDisplacement],
            ["Mean period (s)", period.mean],
            ["Period SD (s)", period.sd],
            ["Period CV (%)", period.cv],
          ].map(([name, n]) => (
            <div key={String(name)}>
              <small>{name}</small>
              <strong>{fmt(n)}</strong>
            </div>
          ))}
          <p className="hint">
            期間統計: {manual.length ? "手動確定" : "自動候補"}
            のみ。1回転ではCV/SDは算出不可。
          </p>
          <details>
            <summary>TURN SUMMARIES</summary>
            {aggregateTurns(turns)
              .filter((a) => a.count)
              .map((a) => (
                <p key={a.method}>
                  {a.method} all turns ({a.count}), mean ± population SD: tilt{" "}
                  {fmt(a.meanAxisAngle.mean)} ±{" "}
                  {a.count > 1 ? fmt(a.meanAxisAngle.sd) : "—"}° / max tilt{" "}
                  {fmt(a.maxAxisAngle.mean)} ±{" "}
                  {a.count > 1 ? fmt(a.maxAxisAngle.sd) : "—"}° / tilt SD{" "}
                  {fmt(a.axisAngleSD.mean)} ±{" "}
                  {a.count > 1 ? fmt(a.axisAngleSD.sd) : "—"}° / position RMS{" "}
                  {fmt(a.axisPositionRMS.mean)} ±{" "}
                  {a.count > 1 ? fmt(a.axisPositionRMS.sd) : "—"} {unitName(s)}
                </p>
              ))}
            {turns.map((t) => (
              <p key={`${t.method}-${t.turn}`}>
                {t.method} TURN {t.turn}: {fmt(t.start)}–{fmt(t.end)} s / T{" "}
                {fmt(t.duration)} s / mean |θ| {fmt(t.metrics.meanAbs)}° / max{" "}
                {fmt(t.metrics.maxAbs)}° / SD {fmt(t.metrics.sd)}° / position
                RMS {fmt(t.metrics.axisRMS)} {unitName(s)}
              </p>
            ))}
          </details>
        </div>
      )}
      <p className="hint ballet-note">
        {rows.some((r) => r.source.includes("synthetic"))
          ? "SYNTHETIC LANDMARKS · "
          : ""}
        {m.n} valid samples ·
        身体軸は幾何学的線分。見かけの移動を含みます。研究精度未検証。
      </p>
    </div>
  );
}
