import { BoardState, BoardToken, DrawingPath, GeometricShape, Point } from '../types';
import { buildPathGeometry, getPathVisual } from '../features/tactical-board/utils/arrowGeometry';

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
const TRANSITION_SECONDS = 1.0;
const PAUSE_SECONDS = 0.25;
const END_HOLD_SECONDS = 0.5;

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

  // Bottom border line
  ctx.strokeStyle = '#222225';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(CANVAS_WIDTH, 56);
  ctx.stroke();

  // App / Brand Tag
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('AM COACH', 24, 28);

  ctx.fillStyle = '#555555';
  ctx.fillText('•', 105, 28);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Inter, system-ui, sans-serif';
  const displayTitle = title.length > 55 ? `${title.substring(0, 52)}...` : title;
  ctx.fillText(displayTitle, 120, 28);

  // Category Badge
  if (category) {
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    const catText = category.toUpperCase();
    const catWidth = ctx.measureText(catText).width;
    const badgeX = CANVAS_WIDTH - 240;
    const badgeY = 16;
    const badgeW = catWidth + 18;
    const badgeH = 24;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  }

  // Frame Counter Badge
  const frameText = `FOTOGRAMA ${currentSceneIdx + 1} / ${totalScenes}`;
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  const frameW = ctx.measureText(frameText).width + 18;
  const frameX = CANVAS_WIDTH - 24 - frameW;
  const frameY = 16;
  const frameH = 24;

  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameW, frameH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(frameText, frameX + frameW / 2, frameY + frameH / 2);
}

/**
 * Draws tactical arrows and paths using the unified geometry engine.
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
    if (!path.points || path.points.length < 2) continue;

    const geom = buildPathGeometry(path, fw, fh, 1.1);
    if (!geom.d && !geom.headD) continue;

    const visual = getPathVisual(path.type);
    ctx.save();
    ctx.translate(fx, fy);

    ctx.strokeStyle = path.color || '#ffffff';
    ctx.lineWidth = visual.strokeWidth * 1.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (visual.dash) {
      ctx.setLineDash(visual.dash.split(' ').map(Number));
    } else {
      ctx.setLineDash([]);
    }

    if (geom.d) {
      try {
        const bodyPath = new Path2D(geom.d);
        ctx.stroke(bodyPath);
      } catch (_) {}
    }

    if (geom.headD) {
      ctx.setLineDash([]);
      ctx.fillStyle = path.color || '#ffffff';
      try {
        const headPath = new Path2D(geom.headD);
        ctx.fill(headPath);
      } catch (_) {}
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
  const lineHeight = fontSize * 1.35;
  const paddingX = 10 * scale;
  const paddingY = 8 * scale;
  const headerHeight = 18 * scale;

  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  const maxLineWidth = width - paddingX * 2;

  // Split text into lines with word wrap
  const rawParagraphs = text.split('\n');
  const renderedLines: string[] = [];

  for (const para of rawParagraphs) {
    if (para === '') {
      renderedLines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = words[0];
    for (let w = 1; w < words.length; w++) {
      const testLine = `${currentLine} ${words[w]}`;
      if (ctx.measureText(testLine).width <= maxLineWidth) {
        currentLine = testLine;
      } else {
        renderedLines.push(currentLine);
        currentLine = words[w];
      }
    }
    renderedLines.push(currentLine);
  }

  const contentHeight = Math.max(24, renderedLines.length * lineHeight);
  const naturalHeight = headerHeight + contentHeight + paddingY * 2;
  const totalHeight = token.height ? Math.max(32 * scale, token.height * scale) : naturalHeight;

  // Card Background
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = '#0a0a0c';
  ctx.beginPath();
  ctx.roundRect(-width / 2, -totalHeight / 2, width, totalHeight, 6 * scale);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Top header bar
  const topY = -totalHeight / 2;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(-width / 2 + paddingX + 4, topY + headerHeight / 2 + 1, 3.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `bold ${Math.max(8, Math.round(9 * scale))}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = '#a1a1aa';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOTA TÁCTICA', -width / 2 + paddingX + 12, topY + headerHeight / 2 + 1);

  // Separator line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-width / 2 + paddingX, topY + headerHeight);
  ctx.lineTo(width / 2 - paddingX, topY + headerHeight);
  ctx.stroke();

  // Text Lines
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let currentTextY = topY + headerHeight + paddingY + fontSize;
  for (const line of renderedLines) {
    if (line !== '') {
      ctx.fillText(line, -width / 2 + paddingX, currentTextY);
    }
    currentTextY += lineHeight;
  }

  ctx.restore();
}

/**
 * Draws an individual board token (players, ball, cones, equipment, notes).
 */
function drawToken(
  ctx: CanvasRenderingContext2D,
  token: BoardToken,
  px: number,
  py: number
) {
  ctx.save();
  ctx.translate(px, py);

  const rotRad = ((token.rotation || 0) * Math.PI) / 180;
  ctx.rotate(rotRad);

  if (token.type === 'ball') {
    // SOCCER BALL
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (token.type === 'cone') {
    // CONE
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, 11);
    ctx.lineTo(-11, 11);
    ctx.closePath();
    ctx.fillStyle = '#ff4b4b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (token.type === 'flat-cone') {
    // CHINO
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (token.type === 'pole' || token.type === 'pole-ground') {
    // PICA
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2.5, -15, 5, 30);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-2.5, -15, 5, 30);
  } else if (token.type === 'goal') {
    // MINI GOAL
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
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
 * Main export engine: renders interpolated frames to offscreen canvas and encodes
 * WhatsApp-compatible .mp4 video using VideoEncoder + mp4-muxer (with fallback to MediaRecorder).
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

  const framesPerTransition = Math.floor(FPS * TRANSITION_SECONDS);
  const pauseFrames = Math.floor(FPS * PAUSE_SECONDS);
  const endHoldFrames = Math.floor(FPS * END_HOLD_SECONDS);

  const totalFrames =
    (scenes.length - 1) * (framesPerTransition + pauseFrames) + endHoldFrames;

  const renderFrame = (
    stateA: BoardState,
    stateB: BoardState,
    progress: number,
    sceneIdx: number
  ) => {
    // Solid background clear (prevents any alpha/black frame glitches)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw header banner and pitch
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

  // Determine if VideoEncoder is available
  const hasVideoEncoder = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

  if (hasVideoEncoder) {
    try {
      const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        },
        fastStart: 'in-memory', // Obligatorio para reproducción instantánea en WhatsApp
      });

      let selectedCodec = 'avc1.42001f'; // H.264 Baseline Profile Level 3.1
      const VideoEncoderCtor = (window as any).VideoEncoder;
      const VideoFrameCtor = (window as any).VideoFrame;

      if (typeof VideoEncoderCtor.isConfigSupported === 'function') {
        try {
          const support = await VideoEncoderCtor.isConfigSupported({
            codec: 'avc1.42001f',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            bitrate: 1_500_000,
            framerate: FPS,
          });
          if (!support.supported) {
            selectedCodec = 'avc1.4d001f';
          }
        } catch (_) {
          selectedCodec = 'avc1.42001f';
        }
      }

      let encoderError: any = null;
      const encoder = new VideoEncoderCtor({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: any) => {
          encoderError = e;
          console.error('VideoEncoder error:', e);
        },
      });

      encoder.configure({
        codec: selectedCodec,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        bitrate: 1_500_000,
        framerate: FPS,
      });

      let globalFrameIndex = 0;

      const encodeCurrentCanvas = async () => {
        if (encoderError) throw encoderError;
        const keyFrame = globalFrameIndex % 30 === 0;
        const frame = new VideoFrameCtor(canvas, {
          timestamp: Math.round(globalFrameIndex * (1_000_000 / FPS)),
        });
        encoder.encode(frame, { keyFrame });
        frame.close();
        globalFrameIndex++;
        onProgress?.(Math.min(99, Math.round((globalFrameIndex / totalFrames) * 100)));

        // Periodically yield to avoid locking UI
        if (globalFrameIndex % 15 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      };

      // 1. Render & encode transitions
      for (let s = 0; s < scenes.length - 1; s++) {
        const stateA = scenes[s].state;
        const stateB = scenes[s + 1].state;

        // Pause on start frame
        for (let p = 0; p < pauseFrames; p++) {
          renderFrame(stateA, stateA, 0, s);
          await encodeCurrentCanvas();
        }

        // Interpolation
        for (let f = 0; f < framesPerTransition; f++) {
          const linearT = f / framesPerTransition;
          const easedT = easeInOutQuad(linearT);
          renderFrame(stateA, stateB, easedT, s);
          await encodeCurrentCanvas();
        }
      }

      // Final hold on last keyframe
      const lastSceneIdx = scenes.length - 1;
      const lastState = scenes[lastSceneIdx].state;
      for (let e = 0; e < endHoldFrames; e++) {
        renderFrame(lastState, lastState, 1, lastSceneIdx);
        await encodeCurrentCanvas();
      }

      await encoder.flush();
      muxer.finalize();
      onProgress?.(100);

      const buffer = muxer.target.buffer;
      const videoBlob = new Blob([buffer], { type: 'video/mp4' });

      const url = URL.createObjectURL(videoBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `Jugada_${sanitizeFilename(title)}_${Date.now()}.mp4`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return;
    } catch (weberr) {
      console.warn('VideoEncoder falló o no soportado, activando fallback MediaRecorder:', weberr);
    }
  }

  // ── Fallback MediaRecorder ───────────────────────────────────────
  const mimeTypes = [
    'video/mp4;codecs="avc1.42E01E"',
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
  if (!selectedMime) selectedMime = 'video/webm';

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 4_000_000,
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
  let currentFrameCounter = 0;

  for (let s = 0; s < scenes.length - 1; s++) {
    const stateA = scenes[s].state;
    const stateB = scenes[s + 1].state;

    for (let p = 0; p < pauseFrames; p++) {
      renderFrame(stateA, stateA, 0, s);
      currentFrameCounter++;
      onProgress?.(Math.min(99, Math.round((currentFrameCounter / totalFrames) * 100)));
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }

    for (let f = 0; f < framesPerTransition; f++) {
      const linearT = f / framesPerTransition;
      const easedT = easeInOutQuad(linearT);
      renderFrame(stateA, stateB, easedT, s);
      currentFrameCounter++;
      onProgress?.(Math.min(99, Math.round((currentFrameCounter / totalFrames) * 100)));
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }
  }

  const lastSceneIdx = scenes.length - 1;
  const lastState = scenes[lastSceneIdx].state;
  for (let e = 0; e < endHoldFrames; e++) {
    renderFrame(lastState, lastState, 1, lastSceneIdx);
    currentFrameCounter++;
    onProgress?.(Math.min(99, Math.round((currentFrameCounter / totalFrames) * 100)));
    await new Promise((r) => setTimeout(r, 1000 / FPS));
  }

  onProgress?.(100);
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
