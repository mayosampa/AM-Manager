import { BoardState, BoardToken, DrawingPath, GeometricShape, Point, SavedScene } from '../types';

export interface TacticalVideoScene {
  id?: string;
  title?: string;
  timestamp?: number;
  state: BoardState;
}

export interface TacticalVideoExportInput {
  title?: string;
  name?: string;
  category?: string;
  modality?: string;
  scenes?: TacticalVideoScene[];
  frames?: TacticalVideoScene[];
  boardState?: BoardState;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const FPS = 30;
const TRANSITION_SECONDS = 1.3;
const PAUSE_SECONDS = 0.4;
const END_HOLD_SECONDS = 0.8;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function sanitizeFilename(name: string): string {
  return (name || 'Jugada')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Draws professional pitch grass and regulation markings on canvas.
 */
function drawPitch(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  // 1. Alternating Grass Stripes
  const stripes = 12;
  const stripeW = fw / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#14532d' : '#166534';
    ctx.fillRect(fx + i * stripeW, fy, stripeW, fh);
  }

  // 2. Pitch Boundary & Lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

  // Outer boundary
  ctx.strokeRect(fx, fy, fw, fh);

  // Halfway line
  const midX = fx + fw / 2;
  ctx.beginPath();
  ctx.moveTo(midX, fy);
  ctx.lineTo(midX, fy + fh);
  ctx.stroke();

  // Center circle
  const centerRadius = fh * 0.17;
  ctx.beginPath();
  ctx.arc(midX, fy + fh / 2, centerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Center spot
  ctx.beginPath();
  ctx.arc(midX, fy + fh / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Left Penalty Area
  const penBoxW = fw * 0.155;
  const penBoxH = fh * 0.60;
  const penBoxY = fy + (fh - penBoxH) / 2;
  ctx.strokeRect(fx, penBoxY, penBoxW, penBoxH);

  // Left Goal Area
  const goalBoxW = fw * 0.052;
  const goalBoxH = fh * 0.32;
  const goalBoxY = fy + (fh - goalBoxH) / 2;
  ctx.strokeRect(fx, goalBoxY, goalBoxW, goalBoxH);

  // Left Penalty Spot
  const leftPenSpotX = fx + fw * 0.105;
  ctx.beginPath();
  ctx.arc(leftPenSpotX, fy + fh / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Left Penalty Arc (closed seamlessly against penalty area boundary line)
  const dLeft = (fx + penBoxW) - leftPenSpotX;
  const angleLeft = Math.acos(Math.min(0.999, Math.max(-0.999, dLeft / centerRadius)));
  ctx.beginPath();
  ctx.arc(leftPenSpotX, fy + fh / 2, centerRadius, -angleLeft, angleLeft);
  ctx.stroke();

  // Right Penalty Area
  ctx.strokeRect(fx + fw - penBoxW, penBoxY, penBoxW, penBoxH);

  // Right Goal Area
  ctx.strokeRect(fx + fw - goalBoxW, goalBoxY, goalBoxW, goalBoxH);

  // Right Penalty Spot
  const rightPenSpotX = fx + fw - fw * 0.105;
  ctx.beginPath();
  ctx.arc(rightPenSpotX, fy + fh / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Right Penalty Arc (closed seamlessly against penalty area boundary line)
  const dRight = rightPenSpotX - (fx + fw - penBoxW);
  const angleRight = Math.acos(Math.min(0.999, Math.max(-0.999, dRight / centerRadius)));
  ctx.beginPath();
  ctx.arc(rightPenSpotX, fy + fh / 2, centerRadius, Math.PI - angleRight, Math.PI + angleRight);
  ctx.stroke();

  // Goals (Nets outside field)
  const goalDepth = 14;
  const goalHeight = fh * 0.18;
  const goalTop = fy + (fh - goalHeight) / 2;
  ctx.lineWidth = 2;
  ctx.strokeRect(fx - goalDepth, goalTop, goalDepth, goalHeight);
  ctx.strokeRect(fx + fw, goalTop, goalDepth, goalHeight);

  ctx.restore();
}

/**
 * Draws the top info banner with exercise branding, category and frame indicator.
 */
function drawHeaderBanner(
  ctx: CanvasRenderingContext2D,
  title: string,
  category: string,
  currentSceneIdx: number,
  totalScenes: number
) {
  // Header background
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 56);

  // Bottom hairline border
  ctx.fillStyle = '#222226';
  ctx.fillRect(0, 55, CANVAS_WIDTH, 1);

  // Left badge: AM COACH PRO
  ctx.save();
  ctx.fillStyle = '#171717';
  ctx.strokeStyle = '#2e2e2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(18, 14, 82, 28, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ededed';
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AM COACH', 59, 28);
  ctx.restore();

  // Exercise Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const displayTitle = title.length > 40 ? title.substring(0, 38) + '…' : title;
  ctx.fillText(displayTitle, 114, 28);

  // Category Tag
  if (category) {
    const textWidth = ctx.measureText(displayTitle).width;
    const catX = 114 + textWidth + 14;
    ctx.save();
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(catX, 16, 90, 24, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(category.toUpperCase(), catX + 45, 28);
    ctx.restore();
  }

  // Right Side: Frame indicator (Fotograma X de Y)
  ctx.save();
  ctx.fillStyle = '#171717';
  ctx.strokeStyle = '#2e2e2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(CANVAS_WIDTH - 170, 14, 152, 28, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FOTOGRAMA ${currentSceneIdx + 1} / ${totalScenes}`, CANVAS_WIDTH - 94, 28);
  ctx.restore();
}

/**
 * Draws tactical paths and directional arrows with high-fidelity canvas strokes.
 */
function drawPaths(
  ctx: CanvasRenderingContext2D,
  paths: DrawingPath[] | undefined,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  if (!paths || paths.length === 0) return;

  for (const path of paths) {
    if (!path.points || path.points.length === 0) continue;

    ctx.save();
    ctx.beginPath();
    const first = path.points[0];
    ctx.moveTo(fx + (first.x / 100) * fw, fy + (first.y / 100) * fh);

    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(fx + (path.points[i].x / 100) * fw, fy + (path.points[i].y / 100) * fh);
    }

    const strokePx = path.type === 'shot' ? 4.5 : 3;
    ctx.strokeStyle = path.color || '#ffffff';
    ctx.lineWidth = strokePx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.type === 'dribble') {
      ctx.setLineDash([4, 4]);
    } else if (path.type === 'run' || path.type === 'dashed') {
      ctx.setLineDash([strokePx * 2, strokePx * 2]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Arrowhead for directional movements
    if (['dribble', 'pass', 'run', 'shot', 'arrow', 'freehand'].includes(path.type) && path.points.length >= 2) {
      const p1 = path.points[path.points.length - 2];
      const p2 = path.points[path.points.length - 1];
      if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
        const x1 = fx + (p1.x / 100) * fw;
        const y1 = fy + (p1.y / 100) * fh;
        const x2 = fx + (p2.x / 100) * fw;
        const y2 = fy + (p2.y / 100) * fh;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLen = strokePx * 3.8;

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - arrowLen * Math.cos(angle - Math.PI / 6),
          y2 - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - arrowLen * Math.cos(angle + Math.PI / 6),
          y2 - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = path.color || '#ffffff';
        ctx.fill();
      }
    } else if (path.type === 'block' && path.points.length >= 2) {
      const p1 = path.points[path.points.length - 2];
      const p2 = path.points[path.points.length - 1];
      const x1 = fx + (p1.x / 100) * fw;
      const y1 = fy + (p1.y / 100) * fh;
      const x2 = fx + (p2.x / 100) * fw;
      const y2 = fy + (p2.y / 100) * fh;
      const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const barLen = 10;
      ctx.beginPath();
      ctx.moveTo(x2 - barLen * Math.cos(angle), y2 - barLen * Math.sin(angle));
      ctx.lineTo(x2 + barLen * Math.cos(angle), y2 + barLen * Math.sin(angle));
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Draws tactical shapes/zones (rectangles, circles, lines).
 */
function drawShapes(
  ctx: CanvasRenderingContext2D,
  shapes: GeometricShape[] | undefined,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  if (!shapes || shapes.length === 0) return;

  for (const shape of shapes) {
    if (!shape.points || shape.points.length === 0) continue;
    ctx.save();
    ctx.strokeStyle = shape.color || '#ffffff';
    ctx.fillStyle = shape.color ? `${shape.color}33` : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;

    if (shape.type === 'rectangle' && shape.points.length >= 2) {
      const p1 = shape.points[0];
      const p2 = shape.points[1];
      const x = fx + Math.min(p1.x, p2.x) * (fw / 100);
      const y = fy + Math.min(p1.y, p2.y) * (fh / 100);
      const w = Math.abs(p2.x - p1.x) * (fw / 100);
      const h = Math.abs(p2.y - p1.y) * (fh / 100);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (shape.type === 'circle' && shape.points.length >= 2) {
      const p1 = shape.points[0];
      const p2 = shape.points[1];
      const cx = fx + (p1.x / 100) * fw;
      const cy = fy + (p1.y / 100) * fh;
      const ex = fx + (p2.x / 100) * fw;
      const ey = fy + (p2.y / 100) * fh;
      const radius = Math.hypot(ex - cx, ey - cy);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Draws PowerPoint-style multiline text note cards on canvas.
 */
function drawCanvasTextNote(ctx: CanvasRenderingContext2D, token: BoardToken) {
  const text = token.label || token.playerName || '';
  if (!text) return;
  const accentColor = token.color || '#eab308';
  const scale = token.scale || 1;
  const width = (token.width || 220) * scale;
  const fontSize = Math.max(10, Math.round((token.fontSize || 13) * scale));
  const paddingX = 10 * scale;
  const paddingY = 8 * scale;
  const lineHeight = fontSize * 1.45;

  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

  // Break text into lines using explicit newlines and word wrap
  const paragraphs = text.split('\n');
  const maxContentW = width - paddingX * 2;
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth <= maxContentW) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const height = lines.length * lineHeight + paddingY * 2 + 8 * scale;
  const x = -width / 2;
  const y = -height / 2;

  // Background box with accent border
  ctx.fillStyle = 'rgba(10, 10, 12, 0.90)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * scale);
  ctx.fill();
  ctx.stroke();

  // Header dot & label
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x + paddingX + 3 * scale, y + paddingY + 3 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#A1A1AA';
  ctx.font = `bold ${Math.max(8, Math.round(9 * scale))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOTA TÁCTICA', x + paddingX + 9 * scale, y + paddingY + 3 * scale);

  // Text lines
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let lineY = y + paddingY + 8 * scale;
  for (const line of lines) {
    ctx.fillText(line, x + paddingX, lineY);
    lineY += lineHeight;
  }
}

/**
 * Draws individual tokens (players, ball, cones, equipment).
 */
function drawToken(ctx: CanvasRenderingContext2D, token: BoardToken, pxX: number, pxY: number) {
  ctx.save();
  ctx.translate(pxX, pxY);

  if (token.type === 'ball') {
    // Soccer Ball
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center pentagon
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
  } else if (token.type === 'cone') {
    // Training Cone
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, 10);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (token.type === 'flat-cone') {
    // Flat Disc Cone
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (token.type === 'goal') {
    // Mini Goal
    ctx.strokeRect(-18, -10, 36, 20);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(-18, -10, 36, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-18, -10, 36, 20);
  } else if (token.type === 'text') {
    // TEXT NOTE (PowerPoint Style Multiline Box)
    drawCanvasTextNote(ctx, token);
  } else {
    // PLAYER TOKEN (Default)
    const radius = 17;

    // Team color mapping: Local is Red (#ef4444), Away is Blue (#3b82f6), Neutral is Yellow (#eab308)
    let teamColor = '#ef4444'; // Local por defecto es ROJO
    if (token.color) {
      teamColor = token.color;
    } else if (token.team === 'away') {
      teamColor = '#3b82f6'; // Visitante es AZUL
    } else if (token.team === 'neutral') {
      teamColor = '#eab308'; // Neutral / Comodín es AMARILLO
    } else if (token.team === 'home') {
      teamColor = '#ef4444'; // Local es ROJO
    }

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Outer Circle Fill
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = teamColor;
    ctx.fill();

    // Reset shadow for crisp border and text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // White Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Jersey Number / Label
    const label = token.label !== undefined ? String(token.label) : '';
    if (label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0.5);
    }

    // Player Name Tag Below Circle
    if (token.playerName) {
      const name = token.playerName.split(' ')[0];
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(name).width;
      const pillW = textWidth + 12;
      const pillH = 16;
      const pillY = radius + 3;

      ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-pillW / 2, pillY, pillW, pillH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, pillY + pillH / 2);
    }
  }

  ctx.restore();
}

/**
 * Main export engine: renders interpolated frames to offscreen canvas and captures video with MediaRecorder.
 */
export async function exportTacticalVideo(
  input: TacticalVideoExportInput,
  onProgress?: (progressPercent: number) => void
): Promise<void> {
  const scenes = input.scenes || input.frames || [];
  if (scenes.length < 2) {
    throw new Error('El ejercicio debe tener al menos 2 fotogramas para generar un vídeo animado.');
  }

  const title = input.title || input.name || 'Pizarra Táctica';
  const category = input.category || 'Táctica';

  // 1. Offscreen Canvas
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('No se pudo inicializar el contexto de renderizado 2D.');

  // Field dimensions inside canvas (leaving room for header and borders)
  const fx = 20;
  const fy = 68;
  const fw = CANVAS_WIDTH - 40;
  const fh = CANVAS_HEIGHT - 82;

  // 2. Select Best Supported MimeType
  const mimeTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  let selectedMime = '';
  for (const m of mimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }
  if (!selectedMime) {
    selectedMime = 'video/webm';
  }

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 6_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingFinished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: selectedMime }));
    };
  });

  recorder.start();

  const framesPerTransition = Math.floor(FPS * TRANSITION_SECONDS);
  const pauseFrames = Math.floor(FPS * PAUSE_SECONDS);
  const endHoldFrames = Math.floor(FPS * END_HOLD_SECONDS);

  const totalFrames =
    (scenes.length - 1) * (framesPerTransition + pauseFrames) + endHoldFrames;

  let currentFrameCounter = 0;

  const renderFrame = (
    stateA: BoardState,
    stateB: BoardState,
    progress: number,
    sceneIdx: number
  ) => {
    // Background clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw header and pitch
    drawHeaderBanner(ctx, title, category, sceneIdx, scenes.length);
    drawPitch(ctx, fx, fy, fw, fh);

    // Shapes & paths
    const activeShapes = progress < 0.5 ? stateA.shapes : stateB.shapes;
    drawShapes(ctx, activeShapes, fx, fy, fw, fh);

    const activePaths = progress < 0.5 ? stateA.paths : stateB.paths;
    drawPaths(ctx, activePaths, fx, fy, fw, fh);

    // Interpolate tokens
    const tokensA = stateA.tokens || [];
    const tokensB = stateB.tokens || [];
    const tokenBMap = new Map<string, BoardToken>();
    tokensB.forEach((t) => tokenBMap.set(t.id, t));

    for (const tokenA of tokensA) {
      const tokenB = tokenBMap.get(tokenA.id) || tokenA;
      const curX = tokenA.position.x + (tokenB.position.x - tokenA.position.x) * progress;
      const curY = tokenA.position.y + (tokenB.position.y - tokenA.position.y) * progress;

      const pxX = fx + (curX / 100) * fw;
      const pxY = fy + (curY / 100) * fh;

      drawToken(ctx, tokenA, pxX, pxY);
    }

    // Also draw any new tokens in B that weren't in A
    for (const tokenB of tokensB) {
      if (!tokensA.some((t) => t.id === tokenB.id)) {
        const pxX = fx + (tokenB.position.x / 100) * fw;
        const pxY = fy + (tokenB.position.y / 100) * fh;
        drawToken(ctx, tokenB, pxX, pxY);
      }
    }
  };

  // Main Render Sequence
  for (let s = 0; s < scenes.length - 1; s++) {
    const stateA = scenes[s].state;
    const stateB = scenes[s + 1].state;

    // 1. Pause on keyframe so user sees starting layout
    for (let p = 0; p < pauseFrames; p++) {
      renderFrame(stateA, stateA, 0, s);
      currentFrameCounter++;
      onProgress?.(Math.min(99, Math.round((currentFrameCounter / totalFrames) * 100)));
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }

    // 2. Smooth Interpolation to next keyframe
    for (let f = 0; f < framesPerTransition; f++) {
      const linearT = f / framesPerTransition;
      const easedT = easeInOutQuad(linearT);

      renderFrame(stateA, stateB, easedT, s);
      currentFrameCounter++;
      onProgress?.(Math.min(99, Math.round((currentFrameCounter / totalFrames) * 100)));
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }
  }

  // Final hold on last keyframe
  const lastSceneIdx = scenes.length - 1;
  const lastState = scenes[lastSceneIdx].state;
  for (let e = 0; e < endHoldFrames; e++) {
    renderFrame(lastState, lastState, 1, lastSceneIdx);
    currentFrameCounter++;
    onProgress?.(Math.min(99, Math.round((currentFrameCounter / totalFrames) * 100)));
    await new Promise((r) => setTimeout(r, 1000 / FPS));
  }

  onProgress?.(100);

  // Stop recording and trigger download
  recorder.stop();
  const videoBlob = await recordingFinished;

  const extension = selectedMime.includes('mp4') ? 'mp4' : 'webm';
  const url = URL.createObjectURL(videoBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `Jugada_${sanitizeFilename(title)}_${Date.now()}.${extension}`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
