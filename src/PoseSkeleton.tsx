import type { Point, Runner } from './core';

const connections = [
  ['LEFT SHOULDER', 'RIGHT SHOULDER'],
  ['LEFT SHOULDER', 'LEFT ELBOW'], ['LEFT ELBOW', 'LEFT HAND'],
  ['RIGHT SHOULDER', 'RIGHT ELBOW'], ['RIGHT ELBOW', 'RIGHT HAND'],
  ['LEFT SHOULDER', 'LEFT HIP'], ['RIGHT SHOULDER', 'RIGHT HIP'],
  ['LEFT HIP', 'RIGHT HIP'],
  ['LEFT HIP', 'LEFT KNEE'], ['LEFT KNEE', 'LEFT ANKLE'],
  ['RIGHT HIP', 'RIGHT KNEE'], ['RIGHT KNEE', 'RIGHT ANKLE'],
  ['LEFT ANKLE', 'LEFT HEEL'], ['LEFT HEEL', 'LEFT TOE'],
  ['RIGHT ANKLE', 'RIGHT HEEL'], ['RIGHT HEEL', 'RIGHT TOE'],
];

/** Uses the same current-time observations/corrections as the joint overlay. */
export function PoseSkeleton({ points, runners, scale }: {
  points: Point[]; runners: Runner[]; scale: number;
}) {
  return <g data-testid="pose-skeleton" pointerEvents="none">
    {runners.filter(r => r.visible).map(r => {
      const byPart = new Map(points.filter(p => p.runner === r.id).map(p => [p.part, p]));
      return <g key={r.id} stroke={r.color} strokeWidth={1.5 / scale}>
        {connections.map(([a, b]) => {
          const start = byPart.get(a), end = byPart.get(b);
          if (!start || !end) return null;
          const estimated = start.method === 'interpolated' || end.method === 'interpolated';
          return <line key={`${a}-${b}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y}
            opacity={estimated ? .35 : .7} strokeDasharray={estimated ? `${3 / scale} ${3 / scale}` : undefined}/>;
        })}
      </g>;
    })}
  </g>;
}
