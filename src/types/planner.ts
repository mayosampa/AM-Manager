import { Exercise } from '../context/SessionContext';

export interface PlannedExercise extends Exercise {
  localId: string;
  duration: number;
  time?: string;
}

export type DayEventType = 'training' | 'match' | 'rest';

export interface BaseDayEvent {
  dateString: string; // YYYY-MM-DD
  playersNeeded: number;
}

export interface TrainingEvent extends BaseDayEvent {
  type: 'training';
  plannedExercises: PlannedExercise[];
}

export interface MatchEvent extends BaseDayEvent {
  type: 'match';
  matchId?: string;
  time: string;
  opponent: string;
  location: 'home' | 'away';
  competition?: string;
  score?: string;
  played?: boolean;
  calledUpPlayers?: string[];
}

export interface RestEvent extends BaseDayEvent {
  type: 'rest';
}

export type DayEvent = TrainingEvent | MatchEvent | RestEvent;

// SeasonPlan maps YYYY-MM-DD to DayEvent
export type SeasonPlan = Record<string, DayEvent>;
