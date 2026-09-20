export type TeamType = 'home' | 'away' | 'neutral';

export interface Point {
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
}

export interface BoardToken {
  id: string;
  type: 'player' | 'ball' | 'cone' | 'pole' | 'goal' | 'ladder' | 'ring' | 'hurdle' | 'dummy' | 'pole-ground' | 'flat-cone' | 'medicine-ball';
  team?: TeamType;
  label?: string; // e.g. jersey number
  playerId?: string; // reference to real roster player
  playerName?: string; // name to display under token
  color?: string; // override team color
  position: Point;
  rotation?: number; // 0-360 degrees
  scale?: number; // 0.5 to 3.0
}

export type ToolMode = 'pointer' | 'draw' | 'text' | 'measure' | 'rectangle' | 'circle' | 'polygon';

export interface DrawingPath {
  id: string;
  type: 'freehand' | 'arrow' | 'dashed' | 'pass' | 'dribble' | 'run' | 'shot' | 'block';
  points: Point[];
  color: string;
}

export interface GeometricShape {
  id: string;
  type: 'rectangle' | 'circle' | 'polygon';
  points: Point[]; // Rect: [TL, BR]. Circle: [Center, Edge]. Polygon: [...Vertices]
  color: string;
}

export type LaneOverlayType = 'none' | '5-lanes' | 'grid-3x6' | 'quarters';

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
  status: 'available' | 'injured';
  isSuspended?: boolean;
  suspensionReason?: string;
  age: number;
  height: string;
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

export type EventType = 'goal' | 'assist' | 'yellow' | 'red' | 'sub' | 'period_end' | 'note';

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
}
