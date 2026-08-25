import Dexie, { Table } from 'dexie';
import { BoardState, BoardToken, DrawingPath } from '../../types';

// Data Transfer Objects (DTOs)
export interface SceneDTO {
  id: string;
  timestamp: number;
  state: BoardState;
}

export interface ExerciseDTO {
  id: string;
  title: string;
  category: string;
  modality?: 'F7' | 'F11' | 'Universal';
  thumbnailUrl: string; // Should ideally just be a reference, but we keep it here for now
  createdAt: number;
  duration?: number;
  notes?: string;
  scenes?: SceneDTO[]; // Jerarquía: Ejercicio -> Escenas -> Movimientos (tokens/paths) -> Coordenadas (x,y)
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
