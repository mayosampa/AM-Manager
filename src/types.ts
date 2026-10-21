export type TeamType = 'home' | 'away' | 'neutral';

export interface Point {
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
}

export interface BoardToken {
  id: string;
  type: 'player' | 'ball' | 'cone' | 'pole' | 'goal' | 'ladder' | 'ring' | 'hurdle-high' | 'hurdle-low' | 'dummy' | 'pole-ground' | 'flat-cone' | 'medicine-ball' | 'bench' | 'dumbbell' | 'text';
  team?: TeamType;
  label?: string; // e.g. jersey number or note text
  playerId?: string; // reference to real roster player
  playerName?: string; // name to display under token
  color?: string; // override team color
  position: Point;
  rotation?: number; // 0-360 degrees
  scale?: number; // 0.5 to 3.0
  width?: number; // custom width in px (for text box)
  fontSize?: number; // custom font size in px
}

export type ToolMode = 'pointer' | 'draw' | 'text' | 'measure' | 'rectangle' | 'circle' | 'polygon' | 'line';

export interface DrawingPath {
  id: string;
  type: 'freehand' | 'arrow' | 'dashed' | 'pass' | 'dribble' | 'run' | 'shot' | 'block';
  points: Point[];
  color: string;
}

export interface GeometricShape {
  id: string;
  type: 'rectangle' | 'circle' | 'polygon' | 'line';
  points: Point[]; // Rect: [TL, BR]. Circle: [Center, Edge]. Polygon: [...Vertices]. Line: [A, B]
  color: string;
}

export type LaneOverlayType = 'none' | '5-lanes' | 'grid-3x6' | 'quarters' | 'thirds' | 'position-play' | 'zone-14';

export interface BoardState {
  tokens: BoardToken[];
  paths: DrawingPath[];
  shapes: GeometricShape[];
  selectedTokenId: string | null;
  selectedShapeId: string | null;
  currentTool: ToolMode;
  currentPathType: DrawingPath['type'];
  drawingColor: string;
  laneOverlay: LaneOverlayType;
}

export interface SavedScene {
  id: string;
  title: string;
  timestamp: number;
  state: BoardState;
}

export type PositionGroup = 'Todos' | 'Porteros' | 'Defensas' | 'Medios' | 'Delanteros';

export interface PlayerStats {
  matchesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface PlayerAttendance {
  trainingPercentage: number;
  matchPercentage: number;
}

export interface PlayerEvaluation {
  matchId: string;
  date: string;
  opponent?: string;
  rating: number;
  notes?: string;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  positionGroup: PositionGroup;
  position: string;
  secondaryPosition?: string;
  form?: number; // legacy
  minutes?: number; // legacy
  status: 'available' | 'injured' | 'unavailable';
  isSuspended?: boolean;
  suspensionReason?: string;
  birthDate?: string; // dynamically calculate age from this
  height: string;
  weight?: string; // added
  foot: string;
  stats: PlayerStats;
  attendance: PlayerAttendance;
  isCaptain?: boolean;
  evaluations: PlayerEvaluation[];
  notes: string;
  fatigue?: number; // legacy
  color?: string;
  isActive?: boolean;
}

export type EventType =
  | 'goal'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'corner'
  | 'foul'
  | 'offside'
  | 'yellow'
  | 'yellow_card'
  | 'red'
  | 'red_card'
  | 'assist'
  | 'sub'
  | 'period_end'
  | 'note';

export type MatchEventType = EventType;

export interface MatchEvent {
  id: string;
  type: EventType;
  time: number; // in seconds
  period?: string; // '1st_half' | '2nd_half'
  playerId?: string; // missing if period_end or note
  playerInId?: string; // for subs
  assistId?: string; // for goals
  notes?: string; // for 'note' type
  addedMinutes?: number;
  periodLabel?: string;
}

export interface Fine {
  id: string;
  playerId: string;
  amount: number;
  reason: string;
  date: string;
  status: 'pending' | 'paid';
}

export interface Team {
  id: string;
  name: string;
  modality: 'F7' | 'F11';
  players: Player[];
  activeCallUp?: string[]; // Array of Player IDs for the current active match call-up
  fines?: Fine[];
  crestUrl?: string;
  exerciseCategories?: string[];
  defaultFormation?: string;
  whatsappTemplate?: string;
  homeStadium?: string;
}

export interface TeamSideStats {
  shotsOnTarget: number;
  shotsOffTarget: number;
  corners: number;
  fouls: number;
  offsides: number;
  yellowCards?: number;
  redCards?: number;
  possession?: number;
}

export interface MatchTeamStats {
  myTeam: TeamSideStats;
  rival: TeamSideStats;
}

export interface MatchRecord {
  id: string;
  teamId: string; // added teamId
  date: string;
  score: { home: number; away: number }; // keep this for compatibility
  events: MatchEvent[];
  duration: number;
  addedTime?: { firstHalf: number; secondHalf: number; total: number };
  squad: Player[];
  bench: Player[];
  opponent?: string;
  matchType?: 'Liga' | 'Amistoso' | 'Copa' | 'Torneo';
  matchResult?: 'Victoria' | 'Empate' | 'Derrota';
  myTeamName?: string;
  condition?: 'Local' | 'Visitante';
  myScore?: number;
  rivalScore?: number;
  notes?: string;
  /** Explicit minutes per player (key = String(player.id)). Source of truth when present. */
  playerMinutes?: Record<string, number>;
  teamStats?: MatchTeamStats;
}

export interface KeyRivalPlayer {
  id: string;
  number: string;
  name: string;
  position: string;
  foot?: 'Diestro' | 'Zurdo' | 'Ambidiestro';
  threatLevel: 'Alta' | 'Media' | 'Controlada';
  notes: string;
}

export interface RivalNoteEntry {
  id: string;
  date: string;
  text: string;
}

export interface RivalScoutingReport {
  updatedAt: string;
  baseFormation: string;          // ej. '1-4-4-2', '1-4-3-3', '1-4-2-3-1', '1-5-3-2', '1-3-5-2'
  defensiveFormation?: string;
  playingStyle: string;           // ej. 'Juego Directo / 2ª Jugada', 'Combinativo', 'Transiciones Rápidas', 'Bloque Bajo'
  attackPhase: {
    buildUp: string;              // Salida de balón
    progressionAndFinish: string; // Progresión y finalización
  };
  defensivePhase: {
    blockHeight: 'Bloque Alto (Presión)' | 'Bloque Medio' | 'Bloque Bajo (Repliegue)';
    weaknessesToExploit: string;  // Debilidades a explotar
  };
  transitions: {
    offensiveTransition: string;  // Contraataque rival
    defensiveTransition: string;  // Reacción tras pérdida
  };
  setPieces: {
    attackingCornersAndFreeKicks: string; // ABP a favor del rival
    defendingCornersAndFreeKicks: string; // ABP en contra
  };
  keyPlayers: KeyRivalPlayer[];
  generalPlanAndKeys: string;     // Claves tácticas del partido
  freeNotes: string;              // Bloque de Notas Libres / Observaciones abiertas del rival
  notesLog?: RivalNoteEntry[];    // Bitácora de apuntes rápidos
}

export interface RivalTeam {
  id: string;
  name: string;                   // Nombre oficial único (ej. "Tolox", "El Burgo", "Cártama B")
  stadium?: string;               // Nombre de su campo
  pitchInfo?: string;             // Dimensiones / césped
  primaryColor?: string;          // Color principal
  scouting: RivalScoutingReport;
}


