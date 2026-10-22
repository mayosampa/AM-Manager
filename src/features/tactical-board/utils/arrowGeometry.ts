import { DrawingPath, Point } from '../../../types';
import { getWavyPath } from './svgMath';

/**
 * Single source of truth for tactical arrow geometry.
 *
 * The SVG board (and therefore the PDF, which rasterises that SVG), the exercise
 * preview and the canvas video exporter all build their arrows with
 * `buildPathGeometry`, so every renderer draws the exact same straight vector,
 * curve and arrowhead.
 *
 * Coordinates: stored paths are in % of the pitch (0-100); geometry is built in px.
 */

/** Arrowhead length in px (scale = 1). */
export const ARROW_HEAD_LENGTH = 14;
/** Half opening angle of the arrowhead (π/6 → 60° total). */
export const ARROW_HEAD_HALF_ANGLE = Math.PI / 6;
/** Tolerance (px) used to pick an arrow with the pointer. */
export const PATH_HIT_TOLERANCE_PX = 12;

/** Below this deviation (in % units) a "curved" stroke is committed as a straight vector. */
const CURVE_STRAIGHT_TOLERANCE_PCT = 0.8;
/** Gap between the two rails of a shot (double line), px at scale 1. */
const SHOT_RAIL_OFFSET = 2.2;

export type HeadKind = 'arrow' | 'bar' | 'none';

export interface PathVisual {
  strokeWidth: number;
  /** SVG dash pattern (canvas: split on spaces). */
  dash?: string;
  head: HeadKind;
}

export function getPathVisual(type: string): PathVisual {
  switch (type) {
    case 'shot':     return { strokeWidth: 1.8, head: 'arrow' };
    case 'run':      return { strokeWidth: 2, dash: '8 6', head: 'arrow' };
    case 'dashed':   return { strokeWidth: 2, dash: '8 6', head: 'none' };
    case 'freehand': return { strokeWidth: 2, head: 'none' };
    case 'block':    return { strokeWidth: 2.5, head: 'bar' };
    default:         return { strokeWidth: 2, head: 'arrow' }; // pass, dribble, arrow
  }
}

/** A clean stroke: straight (control = null) or quadratic Bézier. */
export interface Stroke {
  start: Point;
  control: Point | null;
  end: Point;
}

// ── Vector helpers ────────────────────────────────────────────
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function quadAt(s: Stroke, t: number): Point {
  if (!s.control) return lerp(s.start, s.end, t);
  const mt = 1 - t;
  return {
    x: mt * mt * s.start.x + 2 * mt * t * s.control.x + t * t * s.end.x,
    y: mt * mt * s.start.y + 2 * mt * t * s.control.y + t * t * s.end.y,
  };
}

function sampleStroke(s: Stroke, segments: number): Point[] {
  if (!s.control) return [s.start, s.end];
  const out: Point[] = [];
  for (let i = 0; i <= segments; i++) out.push(quadAt(s, i / segments));
  return out;
}

function strokeLength(s: Stroke): number {
  if (!s.control) return dist(s.start, s.end);
  const pts = sampleStroke(s, 16);
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i], pts[i - 1]);
  return total;
}

/** Point located at half the arc length of a polyline. */
function midByArcLength(pts: Point[]): Point {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i], pts[i - 1]);
  let acc = 0;
  const half = total / 2;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i], pts[i - 1]);
    if (acc + seg >= half && seg > 0) return lerp(pts[i - 1], pts[i], (half - acc) / seg);
    acc += seg;
  }
  return pts[Math.floor(pts.length / 2)];
}

// ── Stroke fitting (storage) ──────────────────────────────────

/**
 * Turns raw pointer samples into a clean stroke.
 * - straight: only the first and last samples are kept (perfect vector).
 * - curve: one quadratic Bézier that passes through start, the mid-arc sample and end,
 *   so hand tremor can never produce a jagged line.
 */
export function fitStroke(points: Point[], curved: boolean): Stroke | null {
  if (!points || points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];
  if (!curved || points.length < 3) return { start, control: null, end };

  const mid = midByArcLength(points);
  if (distancePointToSegment(mid, start, end) < CURVE_STRAIGHT_TOLERANCE_PCT) {
    return { start, control: null, end };
  }
  // B(0.5) = (P0 + 2C + P2) / 4  →  C = 2·B(0.5) − (P0 + P2) / 2
  const chordMid = lerp(start, end, 0.5);
  return { start, control: { x: 2 * mid.x - chordMid.x, y: 2 * mid.y - chordMid.y }, end };
}

export function strokeToPoints(s: Stroke): Point[] {
  return s.control ? [s.start, s.control, s.end] : [s.start, s.end];
}

/** Reads a stored path (new or legacy format) as a clean stroke in % space. */
export function resolveStroke(path: Pick<DrawingPath, 'points' | 'curved'>): Stroke | null {
  const pts = path.points;
  if (!pts || pts.length < 2) return null;
  if (pts.length === 2) return { start: pts[0], control: null, end: pts[1] };
  if (path.curved && pts.length === 3) return { start: pts[0], control: pts[1], end: pts[2] };
  // Legacy freehand polyline → fitted on the fly (never rendered jagged again)
  return fitStroke(pts, true);
}

// ── Pixel geometry ────────────────────────────────────────────

const toPx = (p: Point, w: number, h: number): Point => ({ x: (p.x / 100) * w, y: (p.y / 100) * h });
const fmt = (n: number) => Math.round(n * 100) / 100;

function strokeD(s: Stroke): string {
  const { start: a, control: c, end: b } = s;
  return c
    ? `M ${fmt(a.x)} ${fmt(a.y)} Q ${fmt(c.x)} ${fmt(c.y)} ${fmt(b.x)} ${fmt(b.y)}`
    : `M ${fmt(a.x)} ${fmt(a.y)} L ${fmt(b.x)} ${fmt(b.y)}`;
}

/** Shortens the stroke so it ends `len` px before its tip (exact de Casteljau split for curves). */
function trimEnd(s: Stroke, len: number): Stroke {
  const tip = s.end;
  if (!s.control) {
    const total = dist(s.start, tip);
    if (total <= len) return { ...s, end: s.start };
    return { start: s.start, control: null, end: lerp(tip, s.start, len / total) };
  }
  // Binary search the parameter whose point is `len` px away from the tip
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (dist(quadAt(s, mid), tip) > len) lo = mid; else hi = mid;
  }
  const t = lo;
  return { start: s.start, control: lerp(s.start, s.control, t), end: quadAt(s, t) };
}

function unitNormal(a: Point, b: Point): Point {
  const len = dist(a, b) || 1;
  return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
}

/** Parallel copy of the stroke (used for the two rails of a shot). */
function offsetStroke(s: Stroke, off: number): Stroke {
  const n0 = unitNormal(s.start, s.control ?? s.end);
  const n1 = unitNormal(s.control ?? s.start, s.end);
  const shift = (p: Point, n: Point) => ({ x: p.x + n.x * off, y: p.y + n.y * off });
  if (!s.control) return { start: shift(s.start, n0), control: null, end: shift(s.end, n0) };
  const nm = { x: (n0.x + n1.x) / 2, y: (n0.y + n1.y) / 2 };
  return { start: shift(s.start, n0), control: shift(s.control, nm), end: shift(s.end, n1) };
}

export interface PathGeometry {
  /** Body path (may contain several sub-paths: shot rails, block bar). */
  d: string;
  /** Arrowhead as SVG polygon points ("x,y x,y x,y"). */
  head: string | null;
  /** Arrowhead as path data (for canvas `Path2D`). */
  headD: string | null;
}

const EMPTY_GEOMETRY: PathGeometry = { d: '', head: null, headD: null };

/**
 * Pure: builds the pixel geometry of an arrow.
 * The arrowhead is a filled, symmetric triangle of `14px × scale` with a π/6 half-angle.
 * Its direction is the final tangent of the stroke, and the body ends exactly on the
 * centre of the triangle's base so the tip stays sharp and clean.
 */
export function buildPathGeometry(
  path: Pick<DrawingPath, 'points' | 'type' | 'curved'>,
  width: number,
  height: number,
  scale = 1
): PathGeometry {
  if (width <= 0 || height <= 0) return EMPTY_GEOMETRY;
  const pct = resolveStroke(path);
  if (!pct) return EMPTY_GEOMETRY;

  const stroke: Stroke = {
    start: toPx(pct.start, width, height),
    control: pct.control ? toPx(pct.control, width, height) : null,
    end: toPx(pct.end, width, height),
  };
  const total = strokeLength(stroke);
  if (total < 2) return EMPTY_GEOMETRY;

  const visual = getPathVisual(path.type);
  let body = stroke;
  let head: string | null = null;
  let headD: string | null = null;
  let extra = '';

  if (visual.head === 'arrow') {
    const L = Math.min(ARROW_HEAD_LENGTH * scale, total * 0.5);
    const baseLen = L * Math.cos(ARROW_HEAD_HALF_ANGLE);
    body = trimEnd(stroke, baseLen);
    const tip = stroke.end;
    // Final tangent = direction from the trimmed end (base centre) to the tip
    const theta = Math.atan2(tip.y - body.end.y, tip.x - body.end.x);
    const left = { x: tip.x - L * Math.cos(theta - ARROW_HEAD_HALF_ANGLE), y: tip.y - L * Math.sin(theta - ARROW_HEAD_HALF_ANGLE) };
    const right = { x: tip.x - L * Math.cos(theta + ARROW_HEAD_HALF_ANGLE), y: tip.y - L * Math.sin(theta + ARROW_HEAD_HALF_ANGLE) };
    head = `${fmt(tip.x)},${fmt(tip.y)} ${fmt(left.x)},${fmt(left.y)} ${fmt(right.x)},${fmt(right.y)}`;
    headD = `M ${fmt(tip.x)} ${fmt(tip.y)} L ${fmt(left.x)} ${fmt(left.y)} L ${fmt(right.x)} ${fmt(right.y)} Z`;
  } else if (visual.head === 'bar') {
    const ref = stroke.control ?? stroke.start;
    const n = unitNormal(ref, stroke.end);
    const half = 10 * scale;
    const e = stroke.end;
    extra = ` M ${fmt(e.x + n.x * half)} ${fmt(e.y + n.y * half)} L ${fmt(e.x - n.x * half)} ${fmt(e.y - n.y * half)}`;
  }

  let d: string;
  if (path.type === 'dribble') {
    const segments = Math.max(8, Math.round(strokeLength(body) / 4));
    d = getWavyPath(sampleStroke(body, segments).length > 2 ? sampleStroke(body, segments) : densify(body, segments), 4 * scale, 10 * scale);
  } else if (path.type === 'shot') {
    const off = SHOT_RAIL_OFFSET * scale;
    d = `${strokeD(offsetStroke(body, off))} ${strokeD(offsetStroke(body, -off))}`;
  } else {
    d = strokeD(body);
  }

  return { d: d + extra, head, headD };
}

/** Evenly spaced samples along a straight stroke (the wavy dribble needs a polyline). */
function densify(s: Stroke, segments: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= segments; i++) out.push(lerp(s.start, s.end, i / segments));
  return out;
}

// ── Hit testing ───────────────────────────────────────────────

/** Distance in px from a pixel point to the rendered centre line of a path. */
export function distanceToPath(path: Pick<DrawingPath, 'points' | 'curved'>, p: Point, width: number, height: number): number {
  const pct = resolveStroke(path);
  if (!pct) return Infinity;
  const s: Stroke = {
    start: toPx(pct.start, width, height),
    control: pct.control ? toPx(pct.control, width, height) : null,
    end: toPx(pct.end, width, height),
  };
  const pts = sampleStroke(s, 24);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distancePointToSegment(p, pts[i - 1], pts[i]));
  return best;
}

/** Returns the id of the top-most path within `tolerance` px of the pointer, or null. */
export function findPathAt(
  paths: DrawingPath[],
  p: Point,
  width: number,
  height: number,
  tolerance = PATH_HIT_TOLERANCE_PX
): string | null {
  for (let i = paths.length - 1; i >= 0; i--) {
    if (distanceToPath(paths[i], p, width, height) <= tolerance) return paths[i].id;
  }
  return null;
}
