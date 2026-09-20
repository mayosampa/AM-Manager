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
