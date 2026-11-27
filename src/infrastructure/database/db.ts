import Dexie, { Table } from 'dexie';
import { BoardState, BoardToken, DrawingPath } from '../../types';

// Data Transfer Objects (DTOs)
export interface SceneDTO {
  id: string;
  title?: string;
  timestamp: number;
  state: BoardState;
}

export interface ExerciseDTO {
  id: string;
  title: string;
  category: string;
  modality?: 'F7' | 'F11' | 'Universal';
  phase?: string;
  format?: 'F11' | 'F7' | 'Ambos';
  durationMin?: number;
  dimensions?: string;
  playersCount?: string;
  materials?: string[];
  objectives?: string[];
  description?: string;
  coachingPoints?: string[];
  authorName?: string;
  isCommunityOfficial?: boolean;
  isSharedToCommunity?: boolean;
  thumbnailUrl: string;
  createdAt: number;
  duration?: number;
  notes?: string;
  scenes?: SceneDTO[]; // Jerarquía: Ejercicio -> Escenas -> Movimientos (tokens/paths) -> Coordenadas (x,y)
  frames?: SceneDTO[]; // Alias compatible para ejercicios estructurados
  boardState: BoardState; // Estado base o escena inicial
}

export class AMCoachDatabase extends Dexie {
  exercises!: Table<ExerciseDTO, string>;
  // We can add teams, players, matches here later.
  
  constructor() {
    super('AMCoachDB');
    // Define schema
    this.version(1).stores({
      exercises: 'id, category, modality, createdAt',
    });
  }
}

export const appDb = new AMCoachDatabase();
