export type TeamType = 'home' | 'away' | 'neutral';

export interface Point {
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
}

export interface BoardToken {
  id: string;
  type: 'player' | 'ball' | 'cone' | 'pole' | 'mini-goal' | 'ladder' | 'ring' | 'hurdle';
  team?: TeamType;
  label?: string; // e.g. jersey number
  playerId?: string; // reference to real roster player
  playerName?: string; // name to display under token
  color?: string; // override team color
  position: Point;
  rotation?: number; // 0-360 degrees
}

export type ToolMode = 'pointer' | 'draw' | 'text' | 'measure';

export interface DrawingPath {
  id: string;
  type: 'freehand' | 'arrow' | 'dashed' | 'pass' | 'dribble' | 'run' | 'shot' | 'block';
  points: Point[];
  color: string;
}

export interface BoardState {
  tokens: BoardToken[];
  paths: DrawingPath[];
  selectedTokenId: string | null;
  currentTool: ToolMode;
  currentPathType: DrawingPath['type'];
  drawingColor: string;
}

export interface SavedScene {
  id: string;
  title: string;
  timestamp: number;
  state: BoardState;
}

export type PositionGroup = 'Todos' | 'Porteros' | 'Defensas' | 'Medios' | 'Delanteros';

export interface PlayerStats {
  vision: number;
  pase: number;
  regate: number;
  recuperacion: number;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  positionGroup: PositionGroup;
  position: string;
  secondaryPosition?: string;
  form: number;
  minutes: number;
  status: 'available' | 'injured';
  isSuspended?: boolean;
  suspensionReason?: string;
  age: number;
  height: string;
  foot: string;
  stats: PlayerStats;
  fatigue: number;
  color?: string;
}

export type EventType = 'goal' | 'assist' | 'yellow' | 'red' | 'sub';

export interface MatchEvent {
  id: string;
  type: EventType;
  playerId: string;
  playerInId?: string;
  assistId?: string;
  time: number;
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
  date: string;
  score: { home: number; away: number }; // keep this for compatibility
  events: MatchEvent[];
  duration: number;
  squad: Player[];
  bench: Player[];
  opponent?: string;
  matchType?: 'Liga' | 'Amistoso' | 'Copa' | 'Torneo';
  matchResult?: 'Victoria' | 'Empate' | 'Derrota';
  myTeamName?: string;
  condition?: 'Local' | 'Visitante';
  myScore?: number;
  rivalScore?: number;
}
