import { BoardState, BoardToken, DrawingPath, GeometricShape, LaneOverlayType } from '../types';
import { buildPathGeometry, getPathVisual } from '../features/tactical-board/utils/arrowGeometry';

export interface ThumbnailRenderOptions {
  width?: number;
  height?: number;
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number;
}

export type ThumbnailSource =
  | BoardState
  | {
      boardState?: BoardState;
      scenes?: Array<{ state?: BoardState }>;
      frames?: Array<{ state?: BoardState }>;
    }
  | null
  | undefined;

const thumbnailMemoryCache = new Map<string, string>();

function extractFirstBoardState(source: ThumbnailSource): BoardState | null {
  if (!source) return null;
  const anySource = source as Record<string, any>;
  if (Array.isArray(anySource.scenes) && anySource.scenes[0]?.state) {
    return anySource.scenes[0].state as BoardState;
  }
  if (Array.isArray(anySource.frames) && anySource.frames[0]?.state) {
    return anySource.frames[0].state as BoardState;
  }
  if (anySource.boardState) {
    return anySource.boardState as BoardState;
  }
  if (Array.isArray(anySource.tokens) || Array.isArray(anySource.paths) || Array.isArray(anySource.shapes)) {
    return source as BoardState;
  }
  return null;
}

function drawPitchBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const stripes = 10;
  const stripeW = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#14532d' : '#166534';
    ctx.fillRect(i * stripeW, 0, stripeW + 0.5, h);
  }

  const pad = Math.round(w * 0.025);
  const fw = w - pad * 2;
  const fh = h - pad * 2;
  const midX = pad + fw / 2;
  const midY = pad + fh / 2;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.lineWidth = Math.max(1.2, w / 280);

  // Outer lines & halfway
  ctx.strokeRect(pad, pad, fw, fh);
  ctx.beginPath();
  ctx.moveTo(midX, pad);
  ctx.lineTo(midX, pad + fh);
  ctx.stroke();

  // Center circle & spot
  const centerR = fh * 0.16;
  ctx.beginPath();
  ctx.arc(midX, midY, centerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(midX, midY, Math.max(2, w / 160), 0, Math.PI * 2);
  ctx.fill();

  // Penalty & goal boxes
  const penW = fw * 0.157;
  const penH = fh * 0.59;
  const penY = pad + (fh - penH) / 2;
  ctx.strokeRect(pad, penY, penW, penH);
  ctx.strokeRect(pad + fw - penW, penY, penW, penH);

  const goalBoxW = fw * 0.052;
  const goalBoxH = fh * 0.27;
  const goalBoxY = pad + (fh - goalBoxH) / 2;
  ctx.strokeRect(pad, goalBoxY, goalBoxW, goalBoxH);
  ctx.strokeRect(pad + fw - goalBoxW, goalBoxY, goalBoxW, goalBoxH);

  // Penalty spots & arcs
  const penSpotOffset = fw * 0.105;
  const leftSpotX = pad + penSpotOffset;
  const rightSpotX = pad + fw - penSpotOffset;
  const dArc = pad + penW - leftSpotX;
  const arcAngle = Math.acos(Math.min(0.99, Math.max(-0.99, dArc / centerR)));

  ctx.beginPath();
  ctx.arc(leftSpotX, midY, Math.max(1.5, w / 190), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(leftSpotX, midY, centerR, -arcAngle, arcAngle);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rightSpotX, midY, Math.max(1.5, w / 190), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rightSpotX, midY, centerR, Math.PI - arcAngle, Math.PI + arcAngle);
  ctx.stroke();

  // Goals
  const goalH = fh * 0.14;
  const goalY = pad + (fh - goalH) / 2;
  const goalD = Math.max(4, pad * 0.65);
  ctx.strokeRect(pad - goalD, goalY, goalD, goalH);
  ctx.strokeRect(pad + fw, goalY, goalD, goalH);

  ctx.restore();
}

function drawLaneOverlay(ctx: CanvasRenderingContext2D, overlay: LaneOverlayType | undefined, w: number, h: number) {
  if (!overlay || overlay === 'none') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = Math.max(1, w / 360);
  ctx.setLineDash([4, 4]);

  if (overlay === 'thirds') {
    [0.3333, 0.6666].forEach(rx => {
      ctx.beginPath();
      ctx.moveTo(w * rx, 0);
      ctx.lineTo(w * rx, h);
      ctx.stroke();
    });
  } else if (overlay === 'quarters') {
    [0.25, 0.5, 0.75].forEach(rx => {
      ctx.beginPath();
      ctx.moveTo(w * rx, 0);
      ctx.lineTo(w * rx, h);
      ctx.stroke();
    });
  } else if (overlay === '5-lanes' || overlay === 'position-play') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(0, h * 0.15, w, h * 0.2);
    ctx.fillRect(0, h * 0.65, w, h * 0.2);
    [0.15, 0.35, 0.65, 0.85].forEach(ry => {
      ctx.beginPath();
      ctx.moveTo(0, h * ry);
      ctx.lineTo(w, h * ry);
      ctx.stroke();
    });
    if (overlay === 'position-play') {
      [0.25, 0.5, 0.75].forEach(rx => {
        ctx.beginPath();
        ctx.moveTo(w * rx, 0);
        ctx.lineTo(w * rx, h);
        ctx.stroke();
      });
    }
  } else if (overlay === 'zone-14') {
    ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
    ctx.fillRect(w * 0.666, h * 0.3, w * 0.167, h * 0.4);
    ctx.strokeRect(w * 0.666, h * 0.3, w * 0.167, h * 0.4);
  }
  ctx.restore();
}

function drawShapes(ctx: CanvasRenderingContext2D, shapes: GeometricShape[] | undefined, w: number, h: number) {
  if (!shapes || shapes.length === 0) return;
  for (const shape of shapes) {
    const pts = shape.points || [];
    if (pts.length < 2) continue;
    const color = shape.color || '#ffffff';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.5, w / 280);

    if (shape.type === 'rectangle') {
      const x = Math.min(pts[0].x, pts[1].x) * (w / 100);
      const y = Math.min(pts[0].y, pts[1].y) * (h / 100);
      const rw = Math.abs(pts[1].x - pts[0].x) * (w / 100);
      const rh = Math.abs(pts[1].y - pts[0].y) * (h / 100);
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, y, rw, rh);
      ctx.globalAlpha = 0.85;
      ctx.strokeRect(x, y, rw, rh);
    } else if (shape.type === 'circle') {
      const cx = (pts[0].x / 100) * w;
      const cy = (pts[0].y / 100) * h;
      const ex = (pts[1].x / 100) * w;
      const ey = (pts[1].y / 100) * h;
      const r = Math.hypot(ex - cx, ey - cy);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.stroke();
    } else {
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = (p.x / 100) * w;
        const py = (p.y / 100) * h;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      if (shape.type === 'polygon') {
        ctx.closePath();
        ctx.globalAlpha = 0.2;
        ctx.fill();
      }
      ctx.globalAlpha = 0.85;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: DrawingPath[] | undefined, w: number, h: number) {
  if (!paths || paths.length === 0) return;
  const scaleRatio = Math.max(0.75, w / 640);

  for (const path of paths) {
    if (!path.points || path.points.length < 2) continue;
    const geom = buildPathGeometry(path, w, h, scaleRatio);
    const visual = getPathVisual(path.type);
    const color = path.color || '#ffffff';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.6, visual.strokeWidth * scaleRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(visual.dash ? visual.dash.split(' ').map(n => Number(n) * scaleRatio) : []);

    if (geom.d && typeof Path2D !== 'undefined') {
      try {
        ctx.stroke(new Path2D(geom.d));
      } catch {
        // ignore invalid SVG path
      }
    }
    if (geom.headD && typeof Path2D !== 'undefined') {
      ctx.setLineDash([]);
      try {
        ctx.fill(new Path2D(geom.headD));
      } catch {
        // ignore
      }
    }
    ctx.restore();
  }
}

function drawToken(ctx: CanvasRenderingContext2D, token: BoardToken, w: number, h: number) {
  const x = (token.position.x / 100) * w;
  const y = (token.position.y / 100) * h;
  const unit = (w / 480) * (token.scale || 1);

  ctx.save();
  ctx.translate(x, y);
  if (token.rotation) {
    ctx.rotate((token.rotation * Math.PI) / 180);
  }

  if (token.type === 'player') {
    const isHome = token.team === 'home';
    const defaultColor = isHome ? '#ef4444' : token.team === 'away' ? '#3b82f6' : '#eab308';
    const fill = token.color && (token.color !== '#3b82f6' || !isHome) ? token.color : defaultColor;
    const r = 9.5 * unit;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6 * unit;
    ctx.stroke();

    if (token.label) {
      const isLight = ['#f8fafc', '#ffffff', '#eab308'].includes(fill.toLowerCase());
      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.font = `700 ${Math.max(7, Math.round(8.5 * unit))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(token.label).slice(0, 3), 0, 0.5);
    }
  } else if (token.type === 'ball') {
    const r = 5.5 * unit;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4 * unit;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  } else if (token.type === 'cone' || token.type === 'flat-cone') {
    const s = 5.5 * unit;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s, s * 0.8);
    ctx.lineTo(s, s * 0.8);
    ctx.closePath();
    ctx.fillStyle = token.color || '#f97316';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8 * unit;
    ctx.stroke();
  } else if (token.type === 'goal') {
    const gw = 22 * unit;
    const gh = 10 * unit;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2 * unit;
    ctx.fillRect(-gw / 2, -gh / 2, gw, gh);
    ctx.strokeRect(-gw / 2, -gh / 2, gw, gh);
  } else if (token.type === 'pole' || token.type === 'pole-ground') {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1 * unit;
    if (token.type === 'pole') {
      ctx.fillRect(-1.8 * unit, -9 * unit, 3.6 * unit, 18 * unit);
    } else {
      ctx.fillRect(-10 * unit, -1.8 * unit, 20 * unit, 3.6 * unit);
    }
  } else if (token.type === 'ladder') {
    const lw = 10 * unit;
    const lh = 22 * unit;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.4 * unit;
    ctx.strokeRect(-lw / 2, -lh / 2, lw, lh);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-lw / 2, i * 5 * unit);
      ctx.lineTo(lw / 2, i * 5 * unit);
      ctx.stroke();
    }
  } else if (token.type === 'ring') {
    ctx.beginPath();
    ctx.arc(0, 0, 7 * unit, 0, Math.PI * 2);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.2 * unit;
    ctx.stroke();
  } else if (token.type === 'dummy') {
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1.2 * unit;
    ctx.beginPath();
    ctx.roundRect(-6 * unit, -8 * unit, 12 * unit, 16 * unit, 3 * unit);
    ctx.fill();
    ctx.stroke();
  } else if (token.type === 'text') {
    const boxW = Math.min(110, (token.width || 180) * 0.5) * unit;
    const boxH = 22 * unit;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = token.color || '#eab308';
    ctx.lineWidth = 1.2 * unit;
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 3 * unit);
    ctx.fill();
    ctx.stroke();
    if (token.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.max(6, Math.round(7.5 * unit))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = token.label.replace(/\s+/g, ' ').trim();
      ctx.fillText(txt.length > 18 ? `${txt.slice(0, 17)}…` : txt, 0, 0);
    }
  } else {
    ctx.fillStyle = token.color || '#fbbf24';
    ctx.fillRect(-4.5 * unit, -4.5 * unit, 9 * unit, 9 * unit);
  }

  ctx.restore();
}

/**
 * Renders the first frame / BoardState onto an offscreen 105:68 canvas (default 480x310)
 * and returns a compact WebP/JPEG data URL.
 */
export function renderTacticalThumbnail(
  source: ThumbnailSource,
  options: ThumbnailRenderOptions = {}
): string {
  if (typeof document === 'undefined') return '';
  const state = extractFirstBoardState(source);
  if (!state) return '';

  const width = options.width ?? 480;
  const height = options.height ?? 310;
  const mimeType = options.mimeType ?? 'image/webp';
  const quality = options.quality ?? 0.72;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    drawPitchBase(ctx, width, height);
    drawLaneOverlay(ctx, state.laneOverlay, width, height);
    drawShapes(ctx, state.shapes, width, height);
    drawPaths(ctx, state.paths, width, height);

    for (const token of state.tokens || []) {
      drawToken(ctx, token, width, height);
    }

    const primary = canvas.toDataURL(mimeType, quality);
    if (mimeType === 'image/webp' && primary.startsWith('data:image/png')) {
      return canvas.toDataURL('image/jpeg', quality);
    }
    return primary;
  } catch {
    return '';
  }
}

/**
 * Returns the persisted `thumbnailUrl` or generates and memoizes an automatic preview
 * for legacy or official exercises so no library card ever looks empty.
 */
export function getOrRenderExerciseThumbnail(exercise: {
  id?: string;
  thumbnailUrl?: string;
  boardState?: BoardState;
  scenes?: Array<{ state?: BoardState }>;
  frames?: Array<{ state?: BoardState }>;
}): string {
  if (exercise.thumbnailUrl && exercise.thumbnailUrl.trim().length > 0) {
    return exercise.thumbnailUrl;
  }
  const state = extractFirstBoardState(exercise);
  if (!state) return '';

  const key = `${exercise.id || 'anon'}:${state.tokens?.length || 0}:${state.paths?.length || 0}:${state.shapes?.length || 0}:${state.laneOverlay || 'none'}`;
  const cached = thumbnailMemoryCache.get(key);
  if (cached) return cached;

  const generated = renderTacticalThumbnail(state);
  if (generated) {
    if (thumbnailMemoryCache.size > 150) {
      const firstKey = thumbnailMemoryCache.keys().next().value;
      if (firstKey) thumbnailMemoryCache.delete(firstKey);
    }
    thumbnailMemoryCache.set(key, generated);
  }
  return generated;
}
