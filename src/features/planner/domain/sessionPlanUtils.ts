import { BoardState, BoardToken } from '../../../types';
import { Exercise } from '../../../context/SessionContext';
import { DailyPlan, PlannedExercise } from '../../../components/TrainingPlanner';

export type SessionPhase = 'warmup' | 'main' | 'cooldown';
export type SessionIntensity = 'Baja' | 'Media' | 'Alta';

export interface SessionPhaseConfig {
  id: SessionPhase;
  badge: string;
  title: string;
  subtitle: string;
  accentBorder: string;
  accentText: string;
  accentBg: string;
  pdfColor: [number, number, number];
}

export const SESSION_PHASES: SessionPhaseConfig[] = [
  {
    id: 'warmup',
    badge: '🔥 Fase 1',
    title: '1. Fase Inicial / Activación (Calentamiento)',
    subtitle: 'Movilidad articular, activación neuromuscular, rondos introductorios y prevención.',
    accentBorder: 'border-amber-500/35',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    pdfColor: [217, 119, 6],
  },
  {
    id: 'main',
    badge: '⚽ Fase 2',
    title: '2. Fase Principal (Desarrollo Táctico / Técnico / Condicional)',
    subtitle: 'Tareas principales del modelo de juego, posesiones, oleadas, situaciones reducidas y partido condicionado.',
    accentBorder: 'border-emerald-500/35',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    pdfColor: [16, 185, 129],
  },
  {
    id: 'cooldown',
    badge: '🧘 Fase 3',
    title: '3. Fase Final / Vuelta a la Calma',
    subtitle: 'ABP final, descarga, estiramientos guiados y feedback grupal.',
    accentBorder: 'border-sky-500/35',
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-500/10',
    pdfColor: [14, 165, 233],
  },
];

export function resolveExercisePhase(ex: Partial<PlannedExercise>): SessionPhase {
  if (ex.phase === 'warmup' || ex.phase === 'main' || ex.phase === 'cooldown') {
    return ex.phase;
  }
  const cat = String(ex.category || '').toLowerCase();
  if (cat.includes('calentamiento') || cat.includes('activac')) return 'warmup';
  if (cat.includes('calma') || cat.includes('recuperac') || cat.includes('estiramiento')) return 'cooldown';
  return 'main';
}

const TOKEN_LABELS: Record<string, string> = {
  ball: 'Balones',
  cone: 'Conos',
  'flat-cone': 'Chinos',
  pole: 'Picas',
  'pole-ground': 'Picas suelo',
  goal: 'Mini-porterías',
  ladder: 'Escaleras',
  ring: 'Aros',
  'hurdle-high': 'Vallas altas',
  'hurdle-low': 'Vallas bajas',
  dummy: 'Siluetas',
  'medicine-ball': 'Balones med.',
  bench: 'Bancos',
  dumbbell: 'Mancuernas',
};

export function summarizeExerciseMaterial(ex: Partial<PlannedExercise | Exercise>): string {
  const state: BoardState | undefined = (ex as any)?.scenes?.[0]?.state || ex?.boardState;
  const tokens: BoardToken[] = state?.tokens || [];
  if (tokens.length === 0) return '';
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    if (!t || t.type === 'text' || t.type === 'player') continue;
    counts[t.type] = (counts[t.type] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${TOKEN_LABELS[type] || type}`)
    .join(' · ');
}

export function summarizeSessionMaterial(exercises: PlannedExercise[] = []): string {
  const maxCounts: Record<string, number> = {};
  for (const ex of exercises) {
    const state: BoardState | undefined = ex?.scenes?.[0]?.state || ex?.boardState;
    const tokens: BoardToken[] = state?.tokens || [];
    const localCounts: Record<string, number> = {};
    for (const t of tokens) {
      if (!t || t.type === 'text' || t.type === 'player') continue;
      localCounts[t.type] = (localCounts[t.type] || 0) + 1;
    }
    for (const [type, c] of Object.entries(localCounts)) {
      maxCounts[type] = Math.max(maxCounts[type] || 0, c);
    }
  }
  const summary = Object.entries(maxCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${TOKEN_LABELS[type] || type}`)
    .join(', ');
  return summary || 'Balones, petos, conos y chinos';
}

export function cloneSessionExercisesForTarget(exercises: PlannedExercise[] = []): PlannedExercise[] {
  const now = Date.now();
  return exercises.map((ex, idx) => ({
    ...ex,
    localId: `${ex.id || 'ex'}-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
  }));
}

/**
 * Ejecuta el movimiento, duplicación, intercambio o fusión entre dos días del calendario.
 */
export function applySessionDropOperation(
  seasonPlan: Record<string, DailyPlan>,
  sourceDateKey: string,
  targetDateKey: string,
  mode: 'move' | 'duplicate' | 'swap' | 'merge',
  teamId?: string,
  createEmptyDayFn?: (dateKey: string, teamId?: string) => DailyPlan
): Record<string, DailyPlan> {
  if (sourceDateKey === targetDateKey) return seasonPlan;
  const makeEmpty =
    createEmptyDayFn ||
    ((d: string, tid?: string): DailyPlan => ({
      dateString: d,
      type: 'rest',
      plannedExercises: [],
      isMatchDay: false,
      isRestDay: true,
      playersNeeded: 22,
      teamId: tid,
    }));

  const sourceDay = seasonPlan[sourceDateKey] || makeEmpty(sourceDateKey, teamId);
  const targetDay = seasonPlan[targetDateKey] || makeEmpty(targetDateKey, teamId);
  const next = { ...seasonPlan };

  if (mode === 'swap') {
    next[targetDateKey] = {
      ...sourceDay,
      dateString: targetDateKey,
      teamId: sourceDay.teamId || teamId,
    };
    next[sourceDateKey] = {
      ...targetDay,
      dateString: sourceDateKey,
      teamId: targetDay.teamId || teamId,
    };
    return next;
  }

  if (mode === 'merge') {
    const mergedExercises = [
      ...(targetDay.plannedExercises || []),
      ...cloneSessionExercisesForTarget(sourceDay.plannedExercises || []),
    ];
    next[targetDateKey] = {
      ...targetDay,
      dateString: targetDateKey,
      type: 'training',
      isRestDay: false,
      isMatchDay: false,
      plannedExercises: mergedExercises,
      sessionTitle: targetDay.sessionTitle || sourceDay.sessionTitle,
      primaryObjective: targetDay.primaryObjective || sourceDay.primaryObjective,
      secondaryObjective: targetDay.secondaryObjective || sourceDay.secondaryObjective,
      intensity: targetDay.intensity || sourceDay.intensity,
      material: targetDay.material || sourceDay.material,
      notes: [targetDay.notes, sourceDay.notes].filter(Boolean).join('\n'),
      teamId: targetDay.teamId || teamId,
    };
    next[sourceDateKey] = makeEmpty(sourceDateKey, teamId);
    return next;
  }

  // move or duplicate
  next[targetDateKey] = {
    ...sourceDay,
    dateString: targetDateKey,
    type: 'training',
    isRestDay: false,
    isMatchDay: false,
    matchDetails: undefined,
    plannedExercises: cloneSessionExercisesForTarget(sourceDay.plannedExercises || []),
    teamId: sourceDay.teamId || teamId,
  };

  if (mode === 'move') {
    next[sourceDateKey] = makeEmpty(sourceDateKey, teamId);
  }
  return next;
}

/**
 * Renderiza un diagrama táctico 2D (PNG DataURL) a partir del `boardState` o `scenes[0]` de un ejercicio
 * usando un `<canvas>` offscreen para incrustarlo en la vista de Preparación de Sesiones y en el PDF A4.
 */
export function renderExerciseBoardDiagramDataUrl(ex?: Partial<PlannedExercise | Exercise> | null): string | null {
  if (!ex) return null;
  if (typeof ex.thumbnailUrl === 'string' && ex.thumbnailUrl.startsWith('data:image/')) {
    return ex.thumbnailUrl;
  }
  if (typeof document === 'undefined') return null;

  const state: BoardState | undefined = (ex as any)?.scenes?.[0]?.state || ex.boardState;
  if (!state) return null;
  const hasContent =
    (state.tokens && state.tokens.length > 0) ||
    (state.paths && state.paths.length > 0) ||
    (state.shapes && state.shapes.length > 0);
  if (!hasContent) return null;

  try {
    const W = 420;
    const H = 272;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo césped táctico con franjas
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#166534';
    for (let i = 0; i < 10; i += 2) {
      ctx.fillRect((W / 10) * i, 0, W / 10, H);
    }

    // Líneas reglamentarias del campo
    const pad = 14;
    const pw = W - pad * 2;
    const ph = H - pad * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, pw, ph);

    // Medio campo y círculo central
    ctx.beginPath();
    ctx.moveTo(W / 2, pad);
    ctx.lineTo(W / 2, H - pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, ph * 0.16, 0, Math.PI * 2);
    ctx.stroke();

    // Áreas grandes
    const boxW = pw * 0.16;
    const boxH = ph * 0.56;
    const boxY = (H - boxH) / 2;
    ctx.strokeRect(pad, boxY, boxW, boxH);
    ctx.strokeRect(W - pad - boxW, boxY, boxW, boxH);

    // Zonas / shapes
    for (const shape of state.shapes || []) {
      const pts = shape.points || [];
      if (pts.length < 2) continue;
      ctx.save();
      ctx.fillStyle = shape.color || 'rgba(16,185,129,0.22)';
      ctx.strokeStyle = shape.color || 'rgba(16,185,129,0.75)';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.28;
      if (shape.type === 'circle') {
        const cx = (pts[0].x / 100) * W;
        const cy = (pts[0].y / 100) * H;
        const ex = (pts[1].x / 100) * W;
        const ey = (pts[1].y / 100) * H;
        const r = Math.hypot(ex - cx, ey - cy);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.type === 'rectangle') {
        const x1 = (pts[0].x / 100) * W;
        const y1 = (pts[0].y / 100) * H;
        const x2 = (pts[1].x / 100) * W;
        const y2 = (pts[1].y / 100) * H;
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else {
        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const px = (pt.x / 100) * W;
          const py = (pt.y / 100) * H;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        if (shape.type === 'polygon') {
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.85;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Flechas / paths
    for (const path of state.paths || []) {
      if (!path.points || path.points.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = path.color || '#ffffff';
      ctx.lineWidth = 2;
      if (path.type === 'dribble' || path.type === 'run' || path.type === 'dashed') {
        ctx.setLineDash([5, 4]);
      }
      ctx.beginPath();
      path.points.forEach((pt, idx) => {
        const px = (pt.x / 100) * W;
        const py = (pt.y / 100) * H;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Fichas / tokens
    for (const token of state.tokens || []) {
      const tx = (token.position.x / 100) * W;
      const ty = (token.position.y / 100) * H;
      ctx.save();
      if (token.type === 'ball') {
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (token.type === 'cone' || token.type === 'flat-cone') {
        ctx.beginPath();
        ctx.moveTo(tx, ty - 5);
        ctx.lineTo(tx - 5, ty + 4);
        ctx.lineTo(tx + 5, ty + 4);
        ctx.closePath();
        ctx.fillStyle = token.color || '#f97316';
        ctx.fill();
      } else if (token.type === 'player') {
        const fill =
          token.color ||
          (token.team === 'away' ? '#3b82f6' : token.team === 'neutral' ? '#eab308' : '#ef4444');
        ctx.beginPath();
        ctx.arc(tx, ty, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (token.label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(token.label).slice(0, 3), tx, ty);
        }
      } else {
        ctx.fillStyle = token.color || '#fbbf24';
        ctx.fillRect(tx - 4, ty - 4, 8, 8);
      }
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
