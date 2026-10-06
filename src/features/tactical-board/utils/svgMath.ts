import { Point } from '../../../types';

/**
 * Smoothing algorithm to turn a set of points into a smooth quadratic Bezier SVG path string.
 */
export function getSmoothBezierPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }

  // Curve to the last point
  d += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}

/**
 * Removes micro-jitter points at the end of a drawn path.
 *
 * When the user releases the pointer, the last registered point can be
 * 1-3px away from the penultimate point in an arbitrary direction due to
 * hand tremor. SVG's orient="auto" uses that micro-segment to compute the
 * arrowhead angle, causing random 180° flips.
 *
 * Fix: if the distance between the last two points is below `minDistPct`
 * (in % field coordinates), discard the last point so the arrowhead
 * inherits the direction of the actual stroke instead.
 *
 * @param points - Array of points in % field coordinates
 * @param minDistPct - Minimum distance threshold in % units (default 0.5)
 */
export function stabilizePath(points: Point[], minDistPct = 0.5): Point[] {
  if (points.length < 3) return points;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const dist = Math.hypot(last.x - prev.x, last.y - prev.y);
  return dist < minDistPct ? points.slice(0, -1) : points;
}


/**
 * Generate a wavy path for the dribbling (conduccion) semantic line.
 */
export function getWavyPath(points: Point[], amplitude: number = 0.5, frequency: number = 3): string {
  if (points.length < 2) return getSmoothBezierPath(points);

  let d = `M ${points[0].x} ${points[0].y}`;
  let isUp = true;
  
  let currentDist = 0;
  let targetDist = frequency;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segmentLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    
    if (segmentLen === 0) continue;
    
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    while (currentDist + segmentLen >= targetDist) {
      const overshoot = targetDist - currentDist;
      const x = p1.x + Math.cos(angle) * overshoot;
      const y = p1.y + Math.sin(angle) * overshoot;
      
      const perpAngle = angle + (isUp ? Math.PI / 2 : -Math.PI / 2);
      const waveX = x + Math.cos(perpAngle) * amplitude;
      const waveY = y + Math.sin(perpAngle) * amplitude;
      
      d += ` L ${waveX} ${waveY}`;
      
      isUp = !isUp;
      targetDist += frequency;
    }
    currentDist += segmentLen;
  }
  
  const last = points[points.length - 1];
  const secondLast = points.length > 1 ? points[points.length - 2] : points[0];
  const finalAngle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x);
  
  const preLastX = last.x - Math.cos(finalAngle) * 8;
  const preLastY = last.y - Math.sin(finalAngle) * 8;
  
  d += ` L ${preLastX} ${preLastY} L ${last.x} ${last.y}`;
  
  return d;
}

// ─────────────────────────────────────────────────────────────
// Arrow geometry (pixel space)
// ─────────────────────────────────────────────────────────────

export interface PathVisual {
  strokeWidth: number;
  dash?: string;
  /** Arrowhead length in px. 0 = no arrowhead. */
  headSize: number;
}

/** Visual spec per path type. Head size is a FIXED pixel value → strict proportions. */
export function getPathVisual(type: string): PathVisual {
  switch (type) {
    case 'shot':    return { strokeWidth: 3.5, headSize: 17 };
    case 'run':     return { strokeWidth: 2, dash: '8 6', headSize: 13 };
    case 'dashed':  return { strokeWidth: 2, dash: '8 6', headSize: 0 };
    case 'freehand':
    case 'block':   return { strokeWidth: 2, headSize: 0 };
    default:        return { strokeWidth: 2, headSize: 13 }; // pass, dribble, arrow
  }
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Builds a notched arrowhead whose direction is taken from a point located
 * `1.5 × size` back along the polyline (not from the last micro-segment), so
 * hand jitter at release can neither rotate nor skew the tip.
 * Returns the polygon and the path trimmed so the stroke ends inside the head.
 */
export function computeArrowHead(pts: Point[], size: number): { polygon: string; trimmed: Point[] } | null {
  if (pts.length < 2 || size <= 0) return null;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i], pts[i - 1]);
  if (total < 2) return null;

  const s = Math.min(size, total * 0.6);
  const tip = pts[pts.length - 1];

  // Walk backwards to find a stable reference point
  const lookBack = s * 1.5;
  let acc = 0;
  let ref = pts[0];
  for (let i = pts.length - 1; i > 0; i--) {
    const a = pts[i], b = pts[i - 1];
    const seg = dist(a, b);
    if (acc + seg >= lookBack) {
      const t = (lookBack - acc) / seg;
      ref = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      break;
    }
    acc += seg;
    ref = b;
  }

  const len = dist(tip, ref);
  if (len < 1e-6) return null;
  const ux = (tip.x - ref.x) / len, uy = (tip.y - ref.y) / len;
  const nx = -uy, ny = ux;
  const half = s * 0.5;
  const bx = tip.x - ux * s, by = tip.y - uy * s;
  const notch = { x: tip.x - ux * s * 0.7, y: tip.y - uy * s * 0.7 };

  const polygon =
    `${tip.x},${tip.y} ${bx + nx * half},${by + ny * half} ` +
    `${notch.x},${notch.y} ${bx - nx * half},${by - ny * half}`;

  // Trim trailing points that fall inside the head, then end the stroke at the notch
  let end = pts.length - 1;
  while (end > 0 && dist(pts[end], tip) < s * 0.7) end--;
  const trimmed = [...pts.slice(0, end + 1), notch];

  return { polygon, trimmed };
}

export interface PathGeometry { d: string; head: string | null }

/** Pure: converts a %-based path into pixel SVG geometry (line + optional arrowhead). */
export function buildPathGeometry(pointsPct: Point[], type: string, width: number, height: number): PathGeometry {
  if (!pointsPct || pointsPct.length < 2 || width <= 0 || height <= 0) return { d: '', head: null };
  const px = pointsPct.map(p => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
  const visual = getPathVisual(type);

  let linePts = px;
  let head: string | null = null;
  if (visual.headSize > 0) {
    const arrow = computeArrowHead(px, visual.headSize);
    if (arrow) { linePts = arrow.trimmed; head = arrow.polygon; }
  }

  const d = type === 'dribble' ? getWavyPath(linePts, 4, 10) : getSmoothBezierPath(linePts);
  return { d, head };
}
