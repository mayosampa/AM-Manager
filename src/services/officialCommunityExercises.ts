import { BoardState, BoardToken, DrawingPath, GeometricShape, LaneOverlayType, Point } from '../types';
import { SceneDTO, ExerciseDTO } from '../infrastructure/database/db';

export const COMMUNITY_CATEGORIES = [
  'Calentamiento',
  'Posesión',
  'Salida de Balón',
  'Transiciones',
  'Finalización',
  'ABP / Táctico',
] as const;

export type CommunityExerciseCategory = (typeof COMMUNITY_CATEGORIES)[number];

export interface OfficialCommunityExercise extends ExerciseDTO {
  id: string;
  title: string;
  category: CommunityExerciseCategory;
  phase: 'warmup' | 'main' | 'cooldown';
  format: 'F11' | 'F7' | 'Ambos';
  modality: 'F11' | 'F7' | 'Universal';
  durationMin: number;
  duration: number;
  dimensions: string;
  playersCount: string;
  materials: string[];
  objectives: string[];
  description: string;
  coachingPoints: string[];
  authorName: string;
  isCommunityOfficial: true;
  frames: SceneDTO[];
  scenes: SceneDTO[];
}

// ── Compact tactical builders ─────────────────────────────────────────────────

const pHome = (id: string, label: string, x: number, y: number, color?: string): BoardToken => ({
  id,
  type: 'player',
  team: 'home',
  label,
  color: color ?? '#ef4444',
  position: { x, y },
});

const pAway = (id: string, label: string, x: number, y: number, color?: string): BoardToken => ({
  id,
  type: 'player',
  team: 'away',
  label,
  color: color ?? '#3b82f6',
  position: { x, y },
});

const pNeutral = (id: string, label: string, x: number, y: number): BoardToken => ({
  id,
  type: 'player',
  team: 'neutral',
  label,
  color: '#eab308',
  position: { x, y },
});

const ball = (id: string, x: number, y: number): BoardToken => ({
  id,
  type: 'ball',
  position: { x, y },
});

const cone = (id: string, x: number, y: number): BoardToken => ({
  id,
  type: 'cone',
  position: { x, y },
});

const miniGoal = (id: string, x: number, y: number, rotation = 0): BoardToken => ({
  id,
  type: 'goal',
  rotation,
  scale: 0.9,
  position: { x, y },
});

const pass = (id: string, from: Point, to: Point, color = '#ffffff', control?: Point): DrawingPath => ({
  id,
  type: 'pass',
  points: control ? [from, control, to] : [from, to],
  color,
  curved: Boolean(control),
});

const run = (id: string, from: Point, to: Point, color = '#fde047', control?: Point): DrawingPath => ({
  id,
  type: 'run',
  points: control ? [from, control, to] : [from, to],
  color,
  curved: Boolean(control),
});

const dribble = (id: string, from: Point, to: Point, color = '#38bdf8'): DrawingPath => ({
  id,
  type: 'dribble',
  points: [from, to],
  color,
  curved: false,
});

const shot = (id: string, from: Point, to: Point, color = '#f43f5e'): DrawingPath => ({
  id,
  type: 'shot',
  points: [from, to],
  color,
  curved: false,
});

const rectZone = (id: string, x1: number, y1: number, x2: number, y2: number, color = '#ffffff'): GeometricShape => ({
  id,
  type: 'rectangle',
  points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
  color,
});

const makeState = (
  tokens: BoardToken[],
  paths: DrawingPath[] = [],
  shapes: GeometricShape[] = [],
  laneOverlay: LaneOverlayType = 'none'
): BoardState => ({
  tokens,
  paths,
  shapes,
  selectedTokenId: null,
  selectedShapeId: null,
  selectedPathId: null,
  currentTool: 'pointer',
  currentPathType: 'pass',
  drawingColor: '#ffffff',
  laneOverlay,
  arrowMode: 'straight',
});

const frame = (exId: string, idx: number, title: string, state: BoardState): SceneDTO => ({
  id: `${exId}-f${idx}`,
  title,
  timestamp: 1730000000000 + idx * 1000,
  state,
});

function buildNotes(spec: {
  dimensions: string;
  playersCount: string;
  materials: string[];
  objectives: string[];
  description: string;
  coachingPoints: string[];
}): string {
  return [
    `ESPACIO Y ORGANIZACIÓN:\n• Dimensiones: ${spec.dimensions}\n• Participantes: ${spec.playersCount}\n• Material: ${spec.materials.join(', ')}`,
    `OBJETIVOS:\n${spec.objectives.map(o => `• ${o}`).join('\n')}`,
    `DESARROLLO:\n${spec.description}`,
    `CONSIGNAS TÁCTICAS:\n${spec.coachingPoints.map(c => `• ${c}`).join('\n')}`,
  ].join('\n\n');
}

function createOfficialExercise(spec: {
  id: string;
  title: string;
  category: CommunityExerciseCategory;
  phase: 'warmup' | 'main' | 'cooldown';
  format: 'F11' | 'F7' | 'Ambos';
  durationMin: number;
  dimensions: string;
  playersCount: string;
  materials: string[];
  objectives: string[];
  description: string;
  coachingPoints: string[];
  frames: SceneDTO[];
}): OfficialCommunityExercise {
  const modality: 'F11' | 'F7' | 'Universal' =
    spec.format === 'F11' ? 'F11' : spec.format === 'F7' ? 'F7' : 'Universal';

  return {
    id: spec.id,
    title: spec.title,
    category: spec.category,
    phase: spec.phase,
    format: spec.format,
    modality,
    durationMin: spec.durationMin,
    duration: spec.durationMin,
    dimensions: spec.dimensions,
    playersCount: spec.playersCount,
    materials: spec.materials,
    objectives: spec.objectives,
    description: spec.description,
    coachingPoints: spec.coachingPoints,
    notes: buildNotes(spec),
    authorName: 'AM Manager · Metodología Oficial',
    isCommunityOfficial: true,
    isSharedToCommunity: true,
    thumbnailUrl: '',
    createdAt: 1730000000000,
    boardState: spec.frames[0].state,
    frames: spec.frames,
    scenes: spec.frames,
  };
}

// ── 12 Official Methodology Exercises ─────────────────────────────────────────

const ex1Frames: SceneDTO[] = (() => {
  const baseCones = [
    cone('c1', 22, 22), cone('c2', 50, 22), cone('c3', 78, 22),
    cone('c4', 22, 78), cone('c5', 50, 78), cone('c6', 78, 78),
  ];
  const zoneA = rectZone('zA', 22, 22, 49, 78, '#fde047');
  const zoneB = rectZone('zB', 51, 22, 78, 78, '#38bdf8');

  const f1 = makeState(
    [
      ...baseCones,
      pHome('h1', '4', 25, 28), pHome('h2', '5', 25, 72),
      pHome('h3', '6', 46, 28), pHome('h4', '8', 46, 72),
      pAway('a1', '9', 35, 42), pAway('a2', '10', 36, 60),
      pHome('w1', '7', 54, 28), pHome('w2', '11', 75, 28),
      pHome('w3', '2', 54, 72), pHome('w4', '3', 75, 72),
      ball('b1', 28, 30),
    ],
    [
      pass('p1', { x: 28, y: 30 }, { x: 44, y: 28 }),
      pass('p2', { x: 46, y: 32 }, { x: 46, y: 69 }),
      pass('p3', { x: 48, y: 72 }, { x: 54, y: 72 }, '#34d399'),
    ],
    [zoneA, zoneB]
  );

  const f2 = makeState(
    [
      ...baseCones,
      pHome('h1', '4', 25, 28), pHome('h2', '5', 25, 72),
      pHome('h3', '6', 46, 28), pHome('h4', '8', 46, 72),
      pAway('a1', '9', 41, 61), pAway('a2', '10', 55, 58),
      pHome('w1', '7', 55, 26), pHome('w2', '11', 75, 28),
      pHome('w3', '2', 55, 74), pHome('w4', '3', 75, 72),
      ball('b1', 55, 70),
    ],
    [
      pass('p4', { x: 55, y: 70 }, { x: 73, y: 72 }),
      run('r1', { x: 42, y: 60 }, { x: 64, y: 60 }),
      run('r2', { x: 55, y: 57 }, { x: 69, y: 68 }),
    ],
    [zoneA, zoneB]
  );

  const f3 = makeState(
    [
      ...baseCones,
      pHome('h1', '4', 25, 28), pHome('h2', '5', 25, 72),
      pHome('h3', '6', 46, 28), pHome('h4', '8', 46, 72),
      pAway('a1', '9', 62, 45), pAway('a2', '10', 70, 62),
      pHome('w1', '7', 54, 26), pHome('w2', '11', 75, 28),
      pHome('w3', '2', 54, 74), pHome('w4', '3', 75, 72),
      ball('b1', 74, 31),
    ],
    [
      pass('p5', { x: 75, y: 70 }, { x: 75, y: 33 }),
      pass('p6', { x: 72, y: 29 }, { x: 56, y: 27 }),
    ],
    [zoneA, zoneB]
  );

  return [
    frame('official-ex-01', 0, 'Circulación 4v2 en cuadrado A', f1),
    frame('official-ex-01', 1, 'Cambio de cuadrado tras 5 pases', f2),
    frame('official-ex-01', 2, 'Orientación y continuidad en cuadrado B', f3),
  ];
})();

const ex2Frames: SceneDTO[] = (() => {
  const cones = [
    cone('c1', 18, 50), cone('c2', 45, 50), cone('c3', 74, 24), cone('c4', 74, 76),
  ];
  const f1 = makeState(
    [
      ...cones,
      pHome('h1', '4', 18, 50), pHome('h2', '6', 45, 50),
      pHome('h3', '8', 60, 36), pHome('h4', '7', 74, 24),
      pHome('h5', '10', 60, 64), pHome('h6', '11', 74, 76),
      ball('b1', 21, 50),
    ],
    [
      pass('p1', { x: 21, y: 50 }, { x: 43, y: 50 }),
      pass('p2', { x: 47, y: 49 }, { x: 58, y: 37 }),
      run('r1', { x: 45, y: 52 }, { x: 56, y: 40 }),
    ]
  );

  const f2 = makeState(
    [
      ...cones,
      pHome('h1', '4', 28, 50), pHome('h2', '6', 54, 42),
      pHome('h3', '8', 62, 34), pHome('h4', '7', 74, 24),
      pHome('h5', '10', 60, 64), pHome('h6', '11', 74, 76),
      ball('b1', 61, 35),
    ],
    [
      pass('p3', { x: 60, y: 35 }, { x: 55, y: 41 }),
      pass('p4', { x: 55, y: 40 }, { x: 72, y: 25 }),
      run('r2', { x: 74, y: 26 }, { x: 78, y: 45 }),
    ]
  );

  const f3 = makeState(
    [
      ...cones,
      pHome('h1', '4', 44, 50), pHome('h2', '6', 60, 36),
      pHome('h3', '8', 74, 24), pHome('h4', '7', 24, 54),
      pHome('h5', '10', 60, 64), pHome('h6', '11', 74, 76),
      ball('b1', 73, 27),
    ],
    [
      dribble('d1', { x: 72, y: 26 }, { x: 24, y: 52 }),
      pass('p5', { x: 22, y: 52 }, { x: 42, y: 50 }),
    ]
  );

  return [
    frame('official-ex-02', 0, 'Pase al pivote y apoyo interior', f1),
    frame('official-ex-02', 1, 'Pared y descarga al tercer hombre', f2),
    frame('official-ex-02', 2, 'Conducción de retorno y rotación', f3),
  ];
})();

const ex3Frames: SceneDTO[] = (() => {
  const zone = rectZone('z1', 20, 16, 80, 84, '#ffffff');
  const cones = [cone('c1', 20, 16), cone('c2', 80, 16), cone('c3', 20, 84), cone('c4', 80, 84)];
  const baseAway = [
    pAway('a1', '4', 36, 36), pAway('a2', '5', 62, 34), pAway('a3', '6', 49, 52),
    pAway('a4', '8', 38, 66), pAway('a5', '9', 64, 65),
  ];

  const f1 = makeState(
    [
      ...cones,
      pNeutral('n1', 'C1', 17, 50), pNeutral('n2', 'C2', 83, 50), pNeutral('n3', 'CP', 50, 50),
      pHome('h1', '4', 32, 24), pHome('h2', '5', 66, 24), pHome('h3', '8', 42, 42),
      pHome('h4', '10', 58, 62), pHome('h5', '11', 34, 74),
      ...baseAway,
      ball('b1', 20, 49),
    ],
    [
      pass('p1', { x: 19, y: 50 }, { x: 48, y: 50 }),
      pass('p2', { x: 51, y: 50 }, { x: 80, y: 50 }, '#fde047'),
    ],
    [zone]
  );

  const f2 = makeState(
    [
      ...cones,
      pNeutral('n1', 'C1', 17, 50), pNeutral('n2', 'C2', 83, 50), pNeutral('n3', 'CP', 52, 48),
      pHome('h1', '4', 38, 22), pHome('h2', '5', 68, 26), pHome('h3', '8', 46, 38),
      pHome('h4', '10', 64, 58), pHome('h5', '11', 42, 74),
      pAway('a1', '4', 44, 34), pAway('a2', '5', 66, 40), pAway('a3', '6', 54, 56),
      pAway('a4', '8', 46, 66), pAway('a5', '9', 68, 66),
      ball('b1', 53, 48),
    ],
    [
      pass('p3', { x: 54, y: 48 }, { x: 80, y: 50 }),
      run('r1', { x: 64, y: 58 }, { x: 72, y: 40 }),
    ],
    [zone]
  );

  const f3 = makeState(
    [
      ...cones,
      pNeutral('n1', 'C1', 17, 50), pNeutral('n2', 'C2', 83, 50), pNeutral('n3', 'CP', 50, 50),
      pHome('h1', '4', 40, 24), pHome('h2', '5', 70, 28), pHome('h3', '8', 48, 42),
      pHome('h4', '10', 70, 42), pHome('h5', '11', 44, 72),
      pAway('a1', '4', 52, 34), pAway('a2', '5', 72, 48), pAway('a3', '6', 60, 56),
      pAway('a4', '8', 48, 62), pAway('a5', '9', 66, 66),
      ball('b1', 80, 50),
    ],
    [
      pass('p4', { x: 81, y: 50 }, { x: 71, y: 42 }),
      pass('p5', { x: 69, y: 42 }, { x: 46, y: 71 }, '#34d399'),
    ],
    [zone]
  );

  return [
    frame('official-ex-03', 0, 'Conexión de comodín exterior con pivote', f1),
    frame('official-ex-03', 1, 'Perfilado y pase hacia el comodín opuesto', f2),
    frame('official-ex-03', 2, 'Tercer hombre para cambio de orientación', f3),
  ];
})();

const ex4Frames: SceneDTO[] = (() => {
  const f1 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 10, 50, '#10b981'),
      pHome('h1', '4', 22, 32), pHome('h2', '5', 22, 68),
      pHome('h3', '6', 45, 50), pHome('h4', '8', 54, 30),
      pHome('h5', '10', 54, 70), pHome('h6', '9', 76, 50),
      pAway('gk2', '1', 90, 50, '#18181b'),
      pAway('a1', '9', 28, 46), pAway('a2', '7', 30, 64),
      pAway('a3', '6', 58, 48), pAway('a4', '8', 48, 62),
      pAway('a5', '4', 76, 34), pAway('a6', '5', 76, 66),
      ball('b1', 13, 50),
    ],
    [
      pass('p1', { x: 12, y: 50 }, { x: 22, y: 34 }),
      pass('p2', { x: 24, y: 34 }, { x: 44, y: 49 }),
    ],
    [],
    'thirds'
  );

  const f2 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 12, 50, '#10b981'),
      pHome('h1', '4', 26, 30), pHome('h2', '5', 26, 70),
      pHome('h3', '6', 47, 48), pHome('h4', '8', 58, 24),
      pHome('h5', '10', 58, 74), pHome('h6', '9', 79, 54),
      pAway('gk2', '1', 90, 50, '#18181b'),
      pAway('a1', '9', 36, 40), pAway('a2', '7', 38, 60),
      pAway('a3', '6', 56, 42), pAway('a4', '8', 56, 64),
      pAway('a5', '4', 77, 38), pAway('a6', '5', 78, 64),
      ball('b1', 49, 47),
    ],
    [
      pass('p3', { x: 49, y: 47 }, { x: 58, y: 26 }),
      run('r1', { x: 79, y: 54 }, { x: 83, y: 42 }),
    ],
    [],
    'thirds'
  );

  const f3 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 12, 50, '#10b981'),
      pHome('h1', '4', 28, 32), pHome('h2', '5', 28, 68),
      pHome('h3', '6', 52, 48), pHome('h4', '8', 63, 25),
      pHome('h5', '10', 62, 68), pHome('h6', '9', 83, 42),
      pAway('gk2', '1', 89, 48, '#18181b'),
      pAway('a1', '9', 40, 42), pAway('a2', '7', 42, 60),
      pAway('a3', '6', 61, 44), pAway('a4', '8', 60, 62),
      pAway('a5', '4', 80, 38), pAway('a6', '5', 82, 58),
      ball('b1', 81, 43),
    ],
    [
      pass('p4', { x: 64, y: 26 }, { x: 81, y: 42 }),
      shot('s1', { x: 83, y: 43 }, { x: 93, y: 50 }),
    ],
    [],
    'thirds'
  );

  return [
    frame('official-ex-04', 0, 'Inicio desde portero y superación de zona 1', f1),
    frame('official-ex-04', 1, 'Atraer en zona central y encontrar hombre libre', f2),
    frame('official-ex-04', 2, 'Pase vertical a zona 3 y finalización', f3),
  ];
})();

const ex5Frames: SceneDTO[] = (() => {
  const miniGoals = [miniGoal('g1', 56, 20, 180), miniGoal('g2', 56, 50, 180), miniGoal('g3', 56, 80, 180)];
  const f1 = makeState(
    [
      ...miniGoals,
      pHome('gk', '1', 6, 50, '#10b981'),
      pHome('lb', '3', 20, 18), pHome('cb1', '4', 16, 36), pHome('cb2', '5', 16, 64), pHome('rb', '2', 20, 82),
      pHome('dm', '6', 32, 50), pHome('cm1', '8', 42, 32), pHome('cm2', '10', 42, 68),
      pAway('st', '9', 26, 48), pAway('lw', '11', 28, 25), pAway('rw', '7', 28, 75),
      pAway('m1', '8', 39, 40), pAway('m2', '10', 39, 60),
      ball('b1', 8, 50),
    ],
    [
      pass('p1', { x: 8, y: 50 }, { x: 16, y: 63 }),
      run('r1', { x: 26, y: 48 }, { x: 19, y: 61 }),
    ]
  );

  const f2 = makeState(
    [
      ...miniGoals,
      pHome('gk', '1', 9, 52, '#10b981'),
      pHome('lb', '3', 25, 16), pHome('cb1', '4', 18, 35), pHome('cb2', '5', 18, 67), pHome('rb', '2', 27, 86),
      pHome('dm', '6', 30, 52), pHome('cm1', '8', 44, 28), pHome('cm2', '10', 44, 68),
      pAway('st', '9', 21, 61), pAway('lw', '11', 24, 34), pAway('rw', '7', 29, 79),
      pAway('m1', '8', 35, 48), pAway('m2', '10', 41, 65),
      ball('b1', 19, 65),
    ],
    [
      pass('p2', { x: 20, y: 65 }, { x: 29, y: 53 }),
      pass('p3', { x: 31, y: 51 }, { x: 43, y: 30 }, '#fde047'),
    ]
  );

  const f3 = makeState(
    [
      ...miniGoals,
      pHome('gk', '1', 10, 50, '#10b981'),
      pHome('lb', '3', 32, 16), pHome('cb1', '4', 20, 36), pHome('cb2', '5', 20, 66), pHome('rb', '2', 30, 84),
      pHome('dm', '6', 34, 48), pHome('cm1', '8', 46, 26), pHome('cm2', '10', 47, 66),
      pAway('st', '9', 27, 56), pAway('lw', '11', 31, 32), pAway('rw', '7', 33, 76),
      pAway('m1', '8', 38, 44), pAway('m2', '10', 43, 62),
      ball('b1', 46, 26),
    ],
    [
      pass('p4', { x: 47, y: 26 }, { x: 55, y: 20 }, '#34d399'),
      run('r2', { x: 32, y: 16 }, { x: 48, y: 18 }),
    ]
  );

  return [
    frame('official-ex-05', 0, 'Atraer primera línea de presión (9)', f1),
    frame('official-ex-05', 1, 'Tercer hombre con pivote y cambio de lado', f2),
    frame('official-ex-05', 2, 'Conducción o pase a mini-portería libre', f3),
  ];
})();

const ex6Frames: SceneDTO[] = (() => {
  const miniGoals = [miniGoal('g1', 64, 22, 180), miniGoal('g2', 64, 78, 180)];
  const f1 = makeState(
    [
      ...miniGoals,
      pHome('gk', '1', 8, 50, '#10b981'),
      pHome('cb1', '4', 20, 32), pHome('cb2', '5', 20, 68),
      pHome('lw', '11', 38, 16), pHome('cm', '6', 35, 50), pHome('rw', '7', 38, 84),
      pHome('st', '9', 54, 50),
      pAway('a1', '9', 28, 48), pAway('a2', '11', 32, 26), pAway('a3', '7', 32, 74),
      pAway('a4', '6', 46, 48), pAway('a5', '4', 56, 36),
      ball('b1', 10, 50),
    ],
    [
      pass('p1', { x: 10, y: 50 }, { x: 19, y: 67 }),
      run('r1', { x: 38, y: 84 }, { x: 45, y: 86 }),
    ],
    [],
    '5-lanes'
  );

  const f2 = makeState(
    [
      ...miniGoals,
      pHome('gk', '1', 11, 52, '#10b981'),
      pHome('cb1', '4', 22, 32), pHome('cb2', '5', 22, 70),
      pHome('lw', '11', 42, 16), pHome('cm', '6', 37, 56), pHome('rw', '7', 46, 86),
      pHome('st', '9', 56, 56),
      pAway('a1', '9', 26, 62), pAway('a2', '11', 33, 32), pAway('a3', '7', 37, 78),
      pAway('a4', '6', 45, 54), pAway('a5', '4', 58, 44),
      ball('b1', 23, 70),
    ],
    [
      pass('p2', { x: 24, y: 71 }, { x: 45, y: 85 }),
      run('r2', { x: 56, y: 56 }, { x: 58, y: 72 }),
    ],
    [],
    '5-lanes'
  );

  const f3 = makeState(
    [
      ...miniGoals,
      pHome('gk', '1', 11, 50, '#10b981'),
      pHome('cb1', '4', 25, 34), pHome('cb2', '5', 26, 70),
      pHome('lw', '11', 48, 16), pHome('cm', '6', 43, 56), pHome('rw', '7', 50, 86),
      pHome('st', '9', 59, 73),
      pAway('a1', '9', 30, 58), pAway('a2', '11', 36, 36), pAway('a3', '7', 43, 81),
      pAway('a4', '6', 49, 58), pAway('a5', '4', 58, 58),
      ball('b1', 51, 84),
    ],
    [
      pass('p3', { x: 51, y: 84 }, { x: 59, y: 74 }),
      pass('p4', { x: 60, y: 74 }, { x: 64, y: 78 }, '#34d399'),
    ],
    [],
    '5-lanes'
  );

  return [
    frame('official-ex-06', 0, 'Apertura de centrales F7 y fijación interior', f1),
    frame('official-ex-06', 1, 'Pase por carril exterior ante cierre central', f2),
    frame('official-ex-06', 2, 'Apoyo del delantero y gol en mini-portería', f3),
  ];
})();

const ex7Frames: SceneDTO[] = (() => {
  const f1 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 10, 50, '#10b981'),
      pHome('h1', '8', 34, 50), pHome('h2', '11', 38, 25), pHome('h3', '7', 38, 75),
      pAway('gk2', '1', 90, 50, '#18181b'),
      pAway('a1', '4', 66, 38), pAway('a2', '5', 66, 62),
      pAway('a3', '9', 58, 50),
      ball('b1', 36, 50),
    ],
    [
      dribble('d1', { x: 36, y: 50 }, { x: 56, y: 50 }),
      run('r1', { x: 38, y: 25 }, { x: 70, y: 24 }),
      run('r2', { x: 38, y: 75 }, { x: 70, y: 76 }),
    ]
  );

  const f2 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 10, 50, '#10b981'),
      pHome('h1', '8', 58, 50), pHome('h2', '11', 72, 24), pHome('h3', '7', 72, 76),
      pAway('gk2', '1', 90, 50, '#18181b'),
      pAway('a1', '4', 72, 42), pAway('a2', '5', 74, 62),
      pAway('a3', '9', 46, 50),
      ball('b1', 60, 50),
    ],
    [
      pass('p1', { x: 60, y: 50 }, { x: 71, y: 26 }),
      shot('s1', { x: 74, y: 26 }, { x: 92, y: 48 }),
    ]
  );

  const f3 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 10, 50, '#10b981'),
      pHome('h1', '8', 46, 48), pHome('h2', '11', 74, 28), pHome('h3', '7', 72, 74),
      pAway('gk2', '1', 89, 50, '#18181b'),
      pAway('a1', '4', 60, 42), pAway('a2', '5', 60, 60),
      pAway('a3', '9', 50, 52),
      ball('b1', 61, 42),
    ],
    [
      pass('p2', { x: 60, y: 42 }, { x: 49, y: 52 }, '#38bdf8'),
      run('r3', { x: 50, y: 52 }, { x: 30, y: 50 }, '#38bdf8'),
    ]
  );

  return [
    frame('official-ex-07', 0, 'Salida en oleada 3v2 a máxima velocidad', f1),
    frame('official-ex-07', 1, 'Fijación al central y pase a ruptura', f2),
    frame('official-ex-07', 2, 'Transición inmediata 2v1 en campo contrario', f3),
  ];
})();

const ex8Frames: SceneDTO[] = (() => {
  const zone = rectZone('z1', 26, 20, 74, 80, '#ffffff');
  const goals = [miniGoal('g1', 18, 32, 0), miniGoal('g2', 18, 68, 0), miniGoal('g3', 82, 32, 180), miniGoal('g4', 82, 68, 180)];
  const f1 = makeState(
    [
      ...goals,
      pNeutral('n1', 'C1', 50, 24), pNeutral('n2', 'C2', 50, 76),
      pHome('h1', '4', 34, 34), pHome('h2', '6', 44, 48), pHome('h3', '8', 58, 38), pHome('h4', '10', 38, 66),
      pAway('a1', '5', 48, 60), pAway('a2', '6', 62, 52), pAway('a3', '8', 66, 36), pAway('a4', '9', 36, 48),
      ball('b1', 45, 48),
    ],
    [
      pass('p1', { x: 45, y: 48 }, { x: 56, y: 39 }),
      run('r1', { x: 65, y: 36 }, { x: 57, y: 40 }),
    ],
    [zone]
  );

  const f2 = makeState(
    [
      ...goals,
      pNeutral('n1', 'C1', 50, 24), pNeutral('n2', 'C2', 50, 76),
      pHome('h1', '4', 36, 36), pHome('h2', '6', 46, 50), pHome('h3', '8', 58, 40), pHome('h4', '10', 40, 64),
      pAway('a1', '5', 44, 60), pAway('a2', '6', 54, 48), pAway('a3', '8', 60, 41), pAway('a4', '9', 31, 34),
      ball('b1', 59, 41),
    ],
    [
      pass('p2', { x: 59, y: 41 }, { x: 33, y: 34 }, '#38bdf8'),
      run('r2', { x: 31, y: 34 }, { x: 22, y: 32 }, '#38bdf8'),
    ],
    [zone]
  );

  const f3 = makeState(
    [
      ...goals,
      pNeutral('n1', 'C1', 50, 24), pNeutral('n2', 'C2', 50, 76),
      pHome('h1', '4', 32, 36), pHome('h2', '6', 42, 48), pHome('h3', '8', 55, 42), pHome('h4', '10', 40, 62),
      pAway('a1', '5', 40, 56), pAway('a2', '6', 50, 48), pAway('a3', '8', 58, 44), pAway('a4', '9', 23, 33),
      ball('b1', 21, 32),
    ],
    [shot('s1', { x: 23, y: 33 }, { x: 18, y: 32 }, '#38bdf8')],
    [zone]
  );

  return [
    frame('official-ex-08', 0, 'Conservación 4v4+2 en zona central', f1),
    frame('official-ex-08', 1, 'Robo azul y pase vertical en 1-2 toques', f2),
    frame('official-ex-08', 2, 'Finalización en mini-portería en menos de 6s', f3),
  ];
})();

const ex9Frames: SceneDTO[] = (() => {
  const f1 = makeState(
    [
      miniGoal('gR', 95, 50, 180),
      pAway('gk', '1', 92, 50, '#18181b'),
      pHome('h1', '6', 44, 50), pHome('h2', '10', 62, 50),
      pHome('h3', '7', 58, 84), pHome('h4', '9', 68, 42),
      pHome('h5', '11', 68, 22), pHome('h6', '8', 60, 62),
      cone('c1', 42, 46), cone('c2', 56, 86),
      ball('b1', 46, 50),
    ],
    [
      pass('p1', { x: 46, y: 50 }, { x: 60, y: 50 }),
      pass('p2', { x: 62, y: 51 }, { x: 58, y: 82 }),
      run('r1', { x: 58, y: 84 }, { x: 84, y: 85 }),
    ]
  );

  const f2 = makeState(
    [
      miniGoal('gR', 95, 50, 180),
      pAway('gk', '1', 92, 52, '#18181b'),
      pHome('h1', '6', 50, 50), pHome('h2', '10', 70, 56),
      pHome('h3', '7', 84, 84), pHome('h4', '9', 82, 42),
      pHome('h5', '11', 80, 30), pHome('h6', '8', 75, 62),
      cone('c1', 42, 46), cone('c2', 56, 86),
      ball('b1', 83, 83),
    ],
    [
      pass('p3', { x: 83, y: 83 }, { x: 84, y: 45 }, '#ffffff', { x: 89, y: 65 }),
      run('r2', { x: 80, y: 30 }, { x: 86, y: 36 }),
      run('r3', { x: 75, y: 62 }, { x: 82, y: 58 }),
    ]
  );

  const f3 = makeState(
    [
      miniGoal('gR', 95, 50, 180),
      pAway('gk', '1', 91, 47, '#18181b'),
      pHome('h1', '6', 52, 50), pHome('h2', '10', 74, 56),
      pHome('h3', '7', 86, 82), pHome('h4', '9', 86, 44),
      pHome('h5', '11', 86, 33), pHome('h6', '8', 82, 59),
      cone('c1', 42, 46), cone('c2', 56, 86),
      ball('b1', 86, 45),
    ],
    [shot('s1', { x: 86, y: 45 }, { x: 94, y: 48 })]
  );

  return [
    frame('official-ex-09', 0, 'Pared interior y apertura al carril exterior', f1),
    frame('official-ex-09', 1, 'Ganar línea de fondo y centro al área', f2),
    frame('official-ex-09', 2, 'Ocupación de 1º palo, punto de penalti y 2º palo', f3),
  ];
})();

const ex10Frames: SceneDTO[] = (() => {
  const f1 = makeState(
    [
      miniGoal('gR', 94, 50, 180),
      pAway('gk', '1', 91, 50, '#18181b'),
      pHome('h1', '10', 64, 34), pHome('h2', '9', 64, 66),
      pAway('a1', '4', 76, 50),
      cone('c1', 60, 34), cone('c2', 60, 66),
      ball('b1', 66, 35), ball('b2', 62, 69),
    ],
    [
      dribble('d1', { x: 66, y: 35 }, { x: 77, y: 38 }),
      shot('s1', { x: 78, y: 38 }, { x: 93, y: 47 }),
    ]
  );

  const f2 = makeState(
    [
      miniGoal('gR', 94, 50, 180),
      pAway('gk', '1', 91, 50, '#18181b'),
      pHome('h1', '10', 78, 38), pHome('h2', '9', 70, 62),
      pAway('a1', '4', 78, 52),
      cone('c1', 60, 34), cone('c2', 60, 66),
      ball('b1', 93, 47), ball('b2', 72, 61),
    ],
    [
      dribble('d2', { x: 72, y: 61 }, { x: 81, y: 57 }),
      run('r1', { x: 78, y: 52 }, { x: 83, y: 55 }),
    ]
  );

  const f3 = makeState(
    [
      miniGoal('gR', 94, 50, 180),
      pAway('gk', '1', 90, 54, '#18181b'),
      pHome('h1', '10', 78, 38), pHome('h2', '9', 83, 56),
      pAway('a1', '4', 84, 50),
      cone('c1', 60, 34), cone('c2', 60, 66),
      ball('b1', 93, 47), ball('b2', 84, 56),
    ],
    [shot('s2', { x: 84, y: 56 }, { x: 94, y: 52 })]
  );

  return [
    frame('official-ex-10', 0, 'Primer disparo rápido desde frontal', f1),
    frame('official-ex-10', 1, 'Activación inmediata de duelo 1v1 con defensor', f2),
    frame('official-ex-10', 2, 'Desborde y finalización ante portero', f3),
  ];
})();

const ex11Frames: SceneDTO[] = (() => {
  const f1 = makeState(
    [
      miniGoal('gR', 96, 50, 180),
      pAway('gk', '1', 93, 50, '#18181b'),
      pHome('lk', '10', 97, 94),
      pHome('b1', '4', 85, 48), pHome('b2', '5', 84, 56),
      pHome('att1', '9', 80, 40), pHome('att2', '8', 78, 60),
      pHome('edge', '6', 74, 50),
      pAway('d1', '2', 90, 56), pAway('d2', '4', 87, 50), pAway('d3', '5', 86, 44), pAway('d4', '6', 82, 58),
      ball('b1_corner', 96, 93),
    ],
    [
      pass('p1', { x: 96, y: 93 }, { x: 89, y: 45 }, '#fde047', { x: 94, y: 68 }),
      run('r1', { x: 80, y: 40 }, { x: 89, y: 45 }),
      run('r2', { x: 74, y: 50 }, { x: 82, y: 50 }),
    ]
  );

  const f2 = makeState(
    [
      miniGoal('gR', 96, 50, 180),
      pAway('gk', '1', 92, 47, '#18181b'),
      pHome('lk', '10', 95, 90),
      pHome('b1', '4', 86, 48), pHome('b2', '5', 85, 55),
      pHome('att1', '9', 89, 45), pHome('att2', '8', 86, 59),
      pHome('edge', '6', 81, 50),
      pAway('d1', '2', 89, 55), pAway('d2', '4', 88, 50), pAway('d3', '5', 87, 46), pAway('d4', '6', 84, 57),
      ball('b1_corner', 89, 45),
    ],
    [
      shot('s1', { x: 89, y: 45 }, { x: 95, y: 49 }),
      run('r3', { x: 81, y: 50 }, { x: 87, y: 51 }),
    ]
  );

  const f3 = makeState(
    [
      miniGoal('gR', 96, 50, 180),
      pAway('gk', '1', 92, 47, '#18181b'),
      pHome('lk', '10', 92, 85),
      pHome('b1', '4', 87, 49), pHome('b2', '5', 86, 55),
      pHome('att1', '9', 90, 44), pHome('att2', '8', 87, 58),
      pHome('edge', '6', 85, 50),
      pAway('d1', '2', 90, 54), pAway('d2', '4', 89, 50), pAway('d3', '5', 88, 46), pAway('d4', '6', 85, 56),
      ball('b1_corner', 95, 50),
    ],
    [shot('s2', { x: 86, y: 50 }, { x: 95, y: 50 }, '#34d399')]
  );

  return [
    frame('official-ex-11', 0, 'Pantalla de bloqueo y movimiento de arrastre', f1),
    frame('official-ex-11', 1, 'Ataque agresivo al primer palo en envío cerrado', f2),
    frame('official-ex-11', 2, 'Cobertura del rechace en zona frontal', f3),
  ];
})();

const ex12Frames: SceneDTO[] = (() => {
  const f1 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 10, 50, '#10b981'),
      pHome('h1', '4', 28, 36), pHome('h2', '5', 28, 64),
      pHome('h3', '6', 44, 50), pHome('h4', '8', 54, 34), pHome('h5', '10', 54, 66),
      pHome('h6', '11', 50, 10), pHome('h7', '7', 50, 90), pHome('h8', '9', 72, 50),
      pAway('gk2', '1', 90, 50, '#18181b'),
      pAway('a1', '4', 70, 36), pAway('a2', '5', 70, 64),
      pAway('a3', '6', 58, 50), pAway('a4', '8', 46, 36), pAway('a5', '10', 46, 64),
      pAway('a6', '11', 64, 11), pAway('a7', '7', 64, 89), pAway('a8', '9', 32, 50),
      ball('b1', 45, 50),
    ],
    [
      pass('p1', { x: 45, y: 50 }, { x: 50, y: 11 }),
      run('r1', { x: 50, y: 10 }, { x: 74, y: 11 }),
    ],
    [],
    '5-lanes'
  );

  const f2 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 11, 50, '#10b981'),
      pHome('h1', '4', 34, 38), pHome('h2', '5', 34, 62),
      pHome('h3', '6', 50, 48), pHome('h4', '8', 62, 34), pHome('h5', '10', 62, 62),
      pHome('h6', '11', 76, 10), pHome('h7', '7', 64, 88), pHome('h8', '9', 79, 48),
      pAway('gk2', '1', 90, 48, '#18181b'),
      pAway('a1', '4', 75, 38), pAway('a2', '5', 76, 60),
      pAway('a3', '6', 64, 50), pAway('a4', '8', 54, 38), pAway('a5', '10', 54, 60),
      pAway('a6', '11', 70, 14), pAway('a7', '7', 66, 84), pAway('a8', '9', 38, 50),
      ball('b1', 76, 11),
    ],
    [
      pass('p2', { x: 76, y: 12 }, { x: 80, y: 45 }, '#ffffff', { x: 82, y: 26 }),
      run('r2', { x: 62, y: 62 }, { x: 78, y: 57 }),
    ],
    [],
    '5-lanes'
  );

  const f3 = makeState(
    [
      miniGoal('gL', 6, 50, 0), miniGoal('gR', 94, 50, 180),
      pHome('gk1', '1', 11, 50, '#10b981'),
      pHome('h1', '4', 36, 38), pHome('h2', '5', 36, 62),
      pHome('h3', '6', 52, 48), pHome('h4', '8', 66, 36), pHome('h5', '10', 78, 57),
      pHome('h6', '11', 79, 13), pHome('h7', '7', 68, 86), pHome('h8', '9', 82, 45),
      pAway('gk2', '1', 91, 47, '#18181b'),
      pAway('a1', '4', 78, 40), pAway('a2', '5', 79, 58),
      pAway('a3', '6', 66, 50), pAway('a4', '8', 58, 40), pAway('a5', '10', 58, 58),
      pAway('a6', '11', 74, 18), pAway('a7', '7', 68, 80), pAway('a8', '9', 40, 50),
      ball('b1', 83, 45),
    ],
    [shot('s1', { x: 83, y: 45 }, { x: 94, y: 49 })],
    [],
    '5-lanes'
  );

  return [
    frame('official-ex-12', 0, 'Circulación interior y descarga a carril lateral libre', f1),
    frame('official-ex-12', 1, 'Progresión sin oposición por banda y centro', f2),
    frame('official-ex-12', 2, 'Remate en doble área con llegada de segunda línea', f3),
  ];
})();

export const OFFICIAL_COMMUNITY_EXERCISES: OfficialCommunityExercise[] = [
  createOfficialExercise({
    id: 'official-ex-01',
    title: 'Rondo Posicional 4v2 + Transición de Cuadrado',
    category: 'Calentamiento',
    phase: 'warmup',
    format: 'Ambos',
    durationMin: 15,
    dimensions: '15x30m (dos cuadrados de 15x15m)',
    playersCount: '10 jugadores (4v2 + 4 en espera)',
    materials: ['6 conos', 'Balones', 'Petos de 2 colores'],
    objectives: [
      'Aumentar la velocidad de circulación a 1-2 toques bajo presión.',
      'Perfilarse correctamente antes de recibir para encontrar el cambio de cuadrado.',
      'Activar la reacción inmediata tras pérdida (presión tras pérdida 3 segundos).',
    ],
    description:
      'Dos cuadrados adyacentes. En el cuadrado A se juega 4v2 a máximo 2 toques. Tras completar 5 pases seguidos o encontrar línea de pase limpia, el equipo poseedor traslada el balón al cuadrado B donde esperan 4 compañeros, y los 2 defensores saltan a presionar de inmediato.',
    coachingPoints: [
      'Orientación corporal abierta para ver ambos cuadrados.',
      'Ofrecer dos ángulos de pase cercanos al poseedor y un apoyo profundo.',
      'Si los defensores roban, buscan pase rápido o conducción fuera del cuadrado.',
    ],
    frames: ex1Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-02',
    title: "Rueda de Pases en 'Y' con Tercer Hombre y Pared",
    category: 'Calentamiento',
    phase: 'warmup',
    format: 'Ambos',
    durationMin: 15,
    dimensions: '25x20m',
    playersCount: '6-10 jugadores por posta',
    materials: ['4 conos', '3-4 balones'],
    objectives: [
      'Automatizar la secuencia de pase de cara + desmarque de tercer hombre.',
      'Mejorar la precisión del pase tenso al pie alejado y controles orientados.',
      'Coordinar timing entre pasador, apoyo y receptor profundo.',
    ],
    description:
      'El jugador inicial pasa al pivote central, quien descarga de primeras sobre el interior derecho que cae en apoyo. Este juega pared hacia el propio pivote perfilado o hacia la ruptura del extremo en vértice superior, rotando posiciones tras finalizar la conducción de retorno.',
    coachingPoints: [
      'Finta previa al apoyo para generar espacio respecto a la referencia.',
      'Pase fuerte y raso al pie alejado para permitir jugar de cara a 1 toque.',
      'Ritmo progresivo y comunicación constante entre los tres vértices.',
    ],
    frames: ex2Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-03',
    title: 'Posesión 5v5 + 3 Comodines (2 Exteriores y 1 Pivote)',
    category: 'Posesión',
    phase: 'main',
    format: 'Ambos',
    durationMin: 20,
    dimensions: '30x25m',
    playersCount: '13 jugadores (5v5 + 3 comodines)',
    materials: ['4 conos', 'Petos de 3 colores', 'Balones de reserva'],
    objectives: [
      'Consolidar la superioridad numérica interior mediante el pivote comodín.',
      'Conectar comodín exterior con comodín opuesto buscando el lado débil.',
      'Acelerar el cambio de orientación cuando el rival bascula en bloque.',
    ],
    description:
      'Juego posicional 5v5 dentro del rectángulo con 2 comodines fijos en fondos opuestos y 1 pivote comodín libre por dentro. Se obtiene 1 punto cada vez que el equipo en posesión logra llevar el balón de un comodín exterior al opuesto conectando antes con el interior.',
    coachingPoints: [
      'No acumular jugadores a la misma altura que el pivote comodín.',
      'Atraer con pases cortos antes de filtrar al tercer hombre en lado contrario.',
      'Tras pérdida, acoso inmediato sobre el poseedor para evitar el pase al fondo.',
    ],
    frames: ex3Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-04',
    title: 'Juego de Posición 6v6 + 2 Porteros en 3 Zonas',
    category: 'Posesión',
    phase: 'main',
    format: 'F11',
    durationMin: 25,
    dimensions: '45x35m (dividido en 3 carriles transversales)',
    playersCount: '14 jugadores (6v6 + 2 POR)',
    materials: ['2 porterías', 'Conos delimitadores de tercios', 'Balones'],
    objectives: [
      'Progresar de zona de iniciación a finalización sin saltar líneas innecesariamente.',
      'Identificar cuándo fijar en zona media para liberar al punta en zona 3.',
      'Mantener distancias cortas entre líneas al avanzar con balón.',
    ],
    description:
      'Campo dividido en tres tercios transversales con porteros en ambos extremos. Para que el gol sea válido es obligatorio haber progresado tocando en las tres zonas (iniciación, creación y finalización) y que el bloque acompañe dejando máximo una zona vacía.',
    coachingPoints: [
      'Centrales abiertos dando amplitud al portero en zona 1.',
      'Interiores ocupando intervalos entre líneas rivales en zona 2.',
      'Ruptura del delantero al recibir el mediocentro de cara en zona intermedia.',
    ],
    frames: ex4Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-05',
    title: 'Salida de Balón 1-4-3-3 ante Presión Alta (6+1 vs 5)',
    category: 'Salida de Balón',
    phase: 'main',
    format: 'F11',
    durationMin: 25,
    dimensions: 'Medio campo + 3 mini-porterías en línea de medios',
    playersCount: '12 jugadores (POR + 6 vs 5)',
    materials: ['1 portería grande', '3 mini-porterías', 'Balones'],
    objectives: [
      'Superar la primera línea de presión rival mediante el portero como +1.',
      'Encontrar al interior libre o al lateral alto según el salto de presión.',
      'Finalizar la salida en una de las 3 mini-porterías situadas a altura de mediocampo.',
    ],
    description:
      'El equipo en fase de iniciación (POR + 4 defensas + 3 medios) intenta superar la presión alta de 5 atacantes rivales. Si logra conectar con control en campo medio, busca marcar en cualquiera de las 3 mini-porterías. Si el equipo defensor roba, dispone de 8 segundos para finalizar en portería grande.',
    coachingPoints: [
      'Paciencia con centrales cerca de vértices del área para estirar al rival.',
      'Pivote en sombra ofensiva o cayendo a banda para liberar línea de pase al interior.',
      'Lateral del lado fuerte profundo; lateral del lado débil preparado para cambiar.',
    ],
    frames: ex5Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-06',
    title: 'Salida de Balón F7 (1-2-3-1) y Progresión por Carril Exterior',
    category: 'Salida de Balón',
    phase: 'main',
    format: 'F7',
    durationMin: 20,
    dimensions: 'Campo completo Fútbol 7',
    playersCount: '12 jugadores (6+1 vs 5)',
    materials: ['2 mini-porterías', 'Portería F7', 'Conos de pasillos', 'Balones'],
    objectives: [
      'Ampliar el campo en F7 abriendo a los dos centrales a los lados del área.',
      'Reconocer la superioridad en banda cuando el rival bascula hacia el centro.',
      'Conectar apoyo del punta con incorporación del extremo por carril exterior.',
    ],
    description:
      'En estructura 1-2-3-1 de Fútbol 7, el portero inicia en corto sobre uno de los centrales. Si el rival cierra el carril interior sobre el mediocentro, el central conduce para atraer y juega fuera sobre el extremo, que combina con el delantero para finalizar en las mini-porterías.',
    coachingPoints: [
      'Centrales bien abiertos pisando línea lateral del área.',
      'Mediocentro ofrece línea de pase diagonal sin esconderse detrás del 9 rival.',
      'Extremos bien pegados a banda para dar máxima amplitud en F7.',
    ],
    frames: ex6Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-07',
    title: 'Oleadas de Transición Rápida 3v2 -> 2v1',
    category: 'Transiciones',
    phase: 'main',
    format: 'Ambos',
    durationMin: 20,
    dimensions: '40x30m con dos porterías y porteros',
    playersCount: '12-16 jugadores por oleadas',
    materials: ['2 porterías', 'Petos de 2 colores', 'Balones'],
    objectives: [
      'Atacar la última línea con máxima verticalidad y toma de decisión en ventaja.',
      'Realizar el repliegue tras finalizar para defender inmediatamente en inferioridad 2v1.',
      'Temporizar defensivamente cuando se defiende en inferioridad numérica.',
    ],
    description:
      'Oleada inicial de 3 atacantes rojos contra 2 defensores azules. Al finalizar jugada o recuperar el equipo azul, uno de los defensores o un compañero que entra desde fondo inicia una transición contraria 2v1 sobre uno de los rojos que repliega al instante.',
    coachingPoints: [
      'El poseedor en 3v2 conduce directo al intervalo entre los dos centrales.',
      'Desmarques divergentes para abrir línea de pase o espacio de disparo.',
      'En 1v2 defensivo, cerrar línea central obligando a jugar hacia banda.',
    ],
    frames: ex7Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-08',
    title: 'Posesión 4v4 + 2 con Finalización en <6s tras Recuperación',
    category: 'Transiciones',
    phase: 'main',
    format: 'Ambos',
    durationMin: 20,
    dimensions: '35x25m + 4 mini-porterías exteriores',
    playersCount: '10 jugadores (4v4 + 2 comodines)',
    materials: ['4 mini-porterías', '4 conos', 'Balones'],
    objectives: [
      'Acelerar el primer pase hacia delante justo en el instante de recuperar el balón.',
      'Activar la presión inmediata tras pérdida para impedir el giro del recuperador.',
      'Reconocer qué mini-portería queda desprotegida tras el robo.',
    ],
    description:
      'Posesión 4v4 con 2 comodines exteriores en banda. El equipo que pierde el balón debe presionar de forma agresiva; el equipo que recupera tiene un máximo de 6 segundos y 3 pases para marcar en cualquiera de las 2 mini-porterías del campo contrario.',
    coachingPoints: [
      'Pensar en el primer pase vertical antes incluso de completar el robo.',
      'Desmarques de ruptura inmediatos al recuperar para dar opción profunda.',
      'Si el rival cierra en 3 segundos, conservar con comodines y reiniciar ciclo.',
    ],
    frames: ex8Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-09',
    title: 'Circuito de Finalización: Pared Interior + Apertura a Banda y Centro (3 Rematadores)',
    category: 'Finalización',
    phase: 'main',
    format: 'F11',
    durationMin: 20,
    dimensions: 'Medio campo con portería reglamentaria',
    playersCount: '10-14 jugadores + 1-2 porteros',
    materials: ['Portería reglamentaria', 'Conos', '8-10 balones'],
    objectives: [
      'Coordinar pared en zona frontal y apertura precisa al espacio del extremo.',
      'Atacar el área repartiendo zonas de remate (1º palo, punto de penalti, 2º palo).',
      'Ejecutar centros tensos entre línea defensiva y portero.',
    ],
    description:
      'El mediocentro filtra pase al mediapunta, quien descarga de cara y abre a banda para el extremo que gana línea de fondo. Mientras el balón viaja a banda, el delantero centro, el extremo contrario y un llegador de segunda línea atacan de forma escalonada los tres sectores del área para rematar al primer toque.',
    coachingPoints: [
      'Temporizar la entrada al área para llegar en carrera y no parado.',
      'Rematadores cruzan trayectorias para dificultar las marcas.',
      'Centro tenso atrás o al espacio entre centrales y portero.',
    ],
    frames: ex9Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-10',
    title: 'Doble Finalización Dinámica + Duelo 1v1 con Portero',
    category: 'Finalización',
    phase: 'main',
    format: 'Ambos',
    durationMin: 20,
    dimensions: 'Área grande + zona frontal (30x35m)',
    playersCount: '8-12 jugadores + portero(s)',
    materials: ['Portería reglamentaria', '2 conos', 'Balones abundantes'],
    objectives: [
      'Mejorar la precisión en golpeo rápido desde frontal del área.',
      'Resolver situaciones reales de 1v1 en conducción con presión lateral.',
      'Exigir máxima velocidad de reacción al portero entre dos acciones consecutivas.',
    ],
    description:
      'Acción continua en dos pasos: el primer jugador realiza control orientado y disparo desde la frontal ante oposición pasiva; inmediatamente después parte el segundo atacante con balón desde el lado opuesto para encarar un duelo real 1v1 contra un defensor que salta a cerrarle el ángulo de tiro.',
    coachingPoints: [
      'Primer control hacia delante para armar pierna rápido sin perder tiempo.',
      'En el 1v1, fijar al defensor con finta y atacar el espacio exterior o interior.',
      'El portero recupera posición central en menos de 2 segundos tras el primer tiro.',
    ],
    frames: ex10Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-11',
    title: 'ABP Ofensivo: Córner con Bloqueo y Ataque a 1º Palo y Rechace',
    category: 'ABP / Táctico',
    phase: 'main',
    format: 'F11',
    durationMin: 15,
    dimensions: 'Medio campo (zona de penalti y córner)',
    playersCount: '11 atacantes vs 6-8 defensores + POR',
    materials: ['Portería reglamentaria', 'Petos', 'Balones de partido'],
    objectives: [
      'Sincronizar señal de golpeo con bloqueos legales en zona de punto de penalti.',
      'Liberar al principal cabeceador para atacar de frente el primer palo.',
      'Asegurar el rechace en la frontal y la vigilancia defensiva contra contraataques.',
    ],
    description:
      'Dos bloqueadores parten desde el corazón del área para fijar a los marcadores centrales rivales mientras el delantero atacante arranca en carrera curva hacia el primer palo. Un segundo llegador ataca zona de prolongación y el mediocentro ajusta al borde del área para golpear cualquier rechazo o cortar la transición.',
    coachingPoints: [
      'Arrancar en el instante exacto en que el lanzador inicia su carrera.',
      'Bloqueos estáticos sin sujetar con brazos para evitar falta en ataque.',
      'Actitud de caza sobre cualquier balón muerto tras despeje del primer palo.',
    ],
    frames: ex11Frames,
  }),
  createOfficialExercise({
    id: 'official-ex-12',
    title: 'Partido Condicionado 8v8 en Doble Área con Carriles Laterales Libres',
    category: 'ABP / Táctico',
    phase: 'main',
    format: 'Ambos',
    durationMin: 25,
    dimensions: '50x40m (doble área con 2 pasillos laterales de 6m)',
    playersCount: '16 jugadores (7v7 + 2 POR) o 8v8',
    materials: ['2 porterías', 'Conos para carriles exteriores', 'Petos', 'Balones'],
    objectives: [
      'Integrar circulación interior con profundidad real por banda en contexto de partido.',
      'Fomentar llegadas masivas al área con centro lateral y vigilancia de segunda línea.',
      'Trabajar basculación defensiva interior cuando el balón va al pasillo lateral.',
    ],
    description:
      'Partido en espacio amplio con dos carriles exteriores delimitados donde el jugador que entra con balón o en desmarque no puede ser presionado durante 3 segundos para garantizar el centro lateral. Los goles tras centro desde carril exterior o tras llegada de segunda línea valen doble.',
    coachingPoints: [
      'Generar superioridad dentro para poder soltar fuera con ventaja.',
      'Al menos 3 jugadores atacando el área cuando el extremo levanta la cabeza.',
      'Cierre del lado débil y pivote equilibrando posibles pérdidas tras centro.',
    ],
    frames: ex12Frames,
  }),
];
