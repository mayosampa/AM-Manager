import { BoardState, BoardToken } from '../../../types';
import { Exercise } from '../../../context/SessionContext';
import { DailyPlan, PlannedExercise } from '../../../components/TrainingPlanner';

export type SessionPhase = string;
export type SessionIntensity = 'Baja' | 'Media' | 'Alta';
export type PhaseColorAccent = 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose';

export interface SessionPhaseItem {
  id: string;
  title: string;
  subtitle?: string;
  colorAccent?: PhaseColorAccent;
  exercises: PlannedExercise[];
}

export interface PhaseColorTheme {
  accentBorder: string;
  accentText: string;
  accentBg: string;
  pdfColor: [number, number, number];
  label: string;
}

export const PHASE_COLOR_THEMES: Record<PhaseColorAccent, PhaseColorTheme> = {
  amber: {
    accentBorder: 'border-amber-200',
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-50',
    pdfColor: [217, 119, 6],
    label: 'Ámbar',
  },
  emerald: {
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    pdfColor: [16, 185, 129],
    label: 'Esmeralda',
  },
  cyan: {
    accentBorder: 'border-sky-200',
    accentText: 'text-sky-700',
    accentBg: 'bg-sky-50',
    pdfColor: [14, 165, 233],
    label: 'Cian',
  },
  purple: {
    accentBorder: 'border-purple-200',
    accentText: 'text-purple-700',
    accentBg: 'bg-purple-50',
    pdfColor: [147, 51, 234],
    label: 'Violeta',
  },
  rose: {
    accentBorder: 'border-rose-200',
    accentText: 'text-rose-700',
    accentBg: 'bg-rose-50',
    pdfColor: [225, 29, 72],
    label: 'Carmesí',
  },
};

export function getPhaseTheme(accent?: PhaseColorAccent): PhaseColorTheme {
  return PHASE_COLOR_THEMES[accent || 'emerald'] || PHASE_COLOR_THEMES.emerald;
}

export function createDefaultSessionPhases(): SessionPhaseItem[] {
  return [
    {
      id: 'warmup',
      title: '1. Fase Inicial / Activación (Calentamiento)',
      subtitle: 'Movilidad articular, activación neuromuscular, rondos introductorios y prevención.',
      colorAccent: 'amber',
      exercises: [],
    },
    {
      id: 'main',
      title: '2. Fase Principal (Desarrollo Táctico / Técnico / Condicional)',
      subtitle: 'Tareas principales del modelo de juego, posesiones, oleadas y partido condicionado.',
      colorAccent: 'emerald',
      exercises: [],
    },
    {
      id: 'cooldown',
      title: '3. Fase Final / Vuelta a la Calma',
      subtitle: 'ABP final, descarga, estiramientos guiados y feedback grupal.',
      colorAccent: 'cyan',
      exercises: [],
    },
  ];
}

export function resolveExercisePhase(ex: Partial<PlannedExercise>): string {
  if (ex.phase && typeof ex.phase === 'string' && ex.phase.trim()) {
    return ex.phase.trim();
  }
  const cat = String(ex.category || '').toLowerCase();
  if (cat.includes('calentamiento') || cat.includes('activac')) return 'warmup';
  if (cat.includes('calma') || cat.includes('recuperac') || cat.includes('estiramiento')) return 'cooldown';
  return 'main';
}

/**
 * Obtiene la lista dinámica de fases de un día (`customPhases`), manteniendo retrocompatibilidad
 * total con sesiones previas o ejercicios arrastrados desde el calendario (`plannedExercises`).
 */
export function getEffectiveSessionPhases(dayPlan?: DailyPlan | null): SessionPhaseItem[] {
  const flatExercises = Array.isArray(dayPlan?.plannedExercises) ? dayPlan!.plannedExercises : [];

  if (Array.isArray(dayPlan?.customPhases)) {
    const phases: SessionPhaseItem[] = dayPlan!.customPhases.map(p => ({
      ...p,
      exercises: Array.isArray(p.exercises) ? [...p.exercises] : [],
    }));

    // Si hay ejercicios añadidos desde la vista de Calendario (en `plannedExercises`) que aún no están
    // dentro de `customPhases`, los integramos en su fase correspondiente (o en la primera fase disponible).
    const seenLocalIds = new Set<string>();
    for (const p of phases) {
      for (const ex of p.exercises) {
        if (ex?.localId) seenLocalIds.add(ex.localId);
      }
    }

    for (const ex of flatExercises) {
      if (!ex || (ex.localId && seenLocalIds.has(ex.localId))) continue;
      const targetPhaseId = resolveExercisePhase(ex);
      const targetPhase = phases.find(p => p.id === targetPhaseId) || phases[0];
      if (targetPhase) {
        targetPhase.exercises.push({ ...ex, phase: targetPhase.id });
        if (ex.localId) seenLocalIds.add(ex.localId);
      }
    }

    return phases;
  }

  // Inicializar con las 3 fases habituales y repartir cualquier ejercicio existente
  const defaults = createDefaultSessionPhases();
  for (const ex of flatExercises) {
    if (!ex) continue;
    const phaseId = resolveExercisePhase(ex);
    const matched = defaults.find(p => p.id === phaseId) || defaults[1] || defaults[0];
    matched.exercises.push({ ...ex, phase: matched.id });
  }
  return defaults;
}

/**
 * Sincroniza el array dinámico `customPhases` con la lista plana `plannedExercises`
 * para que tanto el Calendario como la Preparación de Sesiones lean siempre los mismos ejercicios.
 */
export function syncDayPlanWithPhases(phases: SessionPhaseItem[]): {
  customPhases: SessionPhaseItem[];
  plannedExercises: PlannedExercise[];
} {
  const normalizedPhases: SessionPhaseItem[] = phases.map(p => ({
    ...p,
    exercises: (p.exercises || []).map(ex => ({ ...ex, phase: p.id })),
  }));
  const plannedExercises = normalizedPhases.flatMap(p => p.exercises);
  return { customPhases: normalizedPhases, plannedExercises };
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

function cloneCustomPhasesForTarget(phases?: SessionPhaseItem[]): SessionPhaseItem[] | undefined {
  if (!Array.isArray(phases)) return undefined;
  return phases.map(p => ({
    ...p,
    exercises: cloneSessionExercisesForTarget(p.exercises || []),
  }));
}

/**
 * Traslada un Partido programado de `sourceDateKey` a `targetDateKey` dentro de `season_plan`.
 * Limpia los datos de partido en `sourceDateKey` (dejándolo como Descanso o conservando su entreno si lo tuviera).
 */
export function applyMatchDropOperation(
  seasonPlan: Record<string, DailyPlan>,
  sourceDateKey: string,
  targetDateKey: string,
  teamId?: string,
  createEmptyDayFn?: (dateKey: string, teamId?: string) => DailyPlan
): { nextPlan: Record<string, DailyPlan>; rivalName: string } {
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

  if (sourceDateKey === targetDateKey) {
    return { nextPlan: seasonPlan, rivalName: 'Rival' };
  }

  const sourceDay: any = seasonPlan[sourceDateKey] || makeEmpty(sourceDateKey, teamId);
  const targetDay: any = seasonPlan[targetDateKey] || makeEmpty(targetDateKey, teamId);
  const rivalName = sourceDay.matchDetails?.opponent || sourceDay.opponent || 'Rival';

  const next = { ...seasonPlan };

  // 1. Trasladar todos los campos del partido al día de destino (conservando ejercicios si los hubiera en destino)
  next[targetDateKey] = {
    ...targetDay,
    dateString: targetDateKey,
    teamId: sourceDay.teamId || targetDay.teamId || teamId,
    type: 'match',
    isMatchDay: true,
    isRestDay: false,
    opponent: sourceDay.opponent || sourceDay.matchDetails?.opponent,
    location: sourceDay.location,
    matchDetails: sourceDay.matchDetails ? { ...sourceDay.matchDetails } : undefined,
    calledUpPlayers: sourceDay.calledUpPlayers ? [...sourceDay.calledUpPlayers] : targetDay.calledUpPlayers,
    matchId: sourceDay.matchId,
    score: sourceDay.score,
    isPlayed: sourceDay.isPlayed,
    played: sourceDay.played,
    completed: sourceDay.completed,
    externalPlayed: sourceDay.externalPlayed,
    rfafPlayed: sourceDay.rfafPlayed,
    rfafJornada: sourceDay.rfafJornada,
    notes: [targetDay.notes, sourceDay.notes].filter(Boolean).join('\n') || undefined,
  } as DailyPlan;

  // 2. Limpiar los campos de partido en el día de origen
  const sourceHasTraining =
    Array.isArray(sourceDay.plannedExercises) && sourceDay.plannedExercises.length > 0;

  if (sourceHasTraining) {
    const {
      matchDetails: _md,
      opponent: _opp,
      location: _loc,
      calledUpPlayers: _cup,
      matchId: _mid,
      score: _sc,
      isPlayed: _ip,
      played: _pl,
      completed: _cp,
      externalPlayed: _ep,
      rfafPlayed: _rp,
      rfafJornada: _rj,
      ...restSource
    } = sourceDay;
    next[sourceDateKey] = {
      ...restSource,
      dateString: sourceDateKey,
      type: 'training',
      isMatchDay: false,
      isRestDay: false,
    };
  } else {
    next[sourceDateKey] = makeEmpty(sourceDateKey, teamId);
  }

  return { nextPlan: next, rivalName };
}

/**
 * Ejecuta el movimiento, duplicación, intercambio o fusión de sesiones de entrenamiento entre dos días.
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
    const targetPhases = getEffectiveSessionPhases(targetDay);
    const sourcePhases = getEffectiveSessionPhases(sourceDay);
    const mergedPhasesMap = new Map<string, SessionPhaseItem>();

    for (const tp of targetPhases) {
      mergedPhasesMap.set(tp.id, { ...tp, exercises: [...tp.exercises] });
    }
    for (const sp of sourcePhases) {
      const clonedEx = cloneSessionExercisesForTarget(sp.exercises);
      if (mergedPhasesMap.has(sp.id)) {
        const existing = mergedPhasesMap.get(sp.id)!;
        existing.exercises = [...existing.exercises, ...clonedEx];
      } else if (clonedEx.length > 0) {
        mergedPhasesMap.set(sp.id, { ...sp, exercises: clonedEx });
      }
    }

    const synced = syncDayPlanWithPhases(Array.from(mergedPhasesMap.values()));

    next[targetDateKey] = {
      ...targetDay,
      dateString: targetDateKey,
      type: 'training',
      isRestDay: false,
      isMatchDay: false,
      customPhases: synced.customPhases,
      plannedExercises: synced.plannedExercises,
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
  const clonedCustomPhases = cloneCustomPhasesForTarget(sourceDay.customPhases);
  const synced = clonedCustomPhases
    ? syncDayPlanWithPhases(clonedCustomPhases)
    : {
        customPhases: undefined,
        plannedExercises: cloneSessionExercisesForTarget(sourceDay.plannedExercises || []),
      };

  next[targetDateKey] = {
    ...sourceDay,
    dateString: targetDateKey,
    type: 'training',
    isRestDay: false,
    isMatchDay: false,
    matchDetails: undefined,
    customPhases: synced.customPhases,
    plannedExercises: synced.plannedExercises,
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

    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#166534';
    for (let i = 0; i < 10; i += 2) {
      ctx.fillRect((W / 10) * i, 0, W / 10, H);
    }

    const pad = 14;
    const pw = W - pad * 2;
    const ph = H - pad * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, pw, ph);

    ctx.beginPath();
    ctx.moveTo(W / 2, pad);
    ctx.lineTo(W / 2, H - pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, ph * 0.16, 0, Math.PI * 2);
    ctx.stroke();

    const boxW = pw * 0.16;
    const boxH = ph * 0.56;
    const boxY = (H - boxH) / 2;
    ctx.strokeRect(pad, boxY, boxW, boxH);
    ctx.strokeRect(W - pad - boxW, boxY, boxW, boxH);

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
        const exPt = (pts[1].x / 100) * W;
        const eyPt = (pts[1].y / 100) * H;
        const r = Math.hypot(exPt - cx, eyPt - cy);
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
