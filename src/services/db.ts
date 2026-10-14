import type { Team, MatchRecord } from '../types';
import type { ExerciseDTO } from '../infrastructure/database/db';
import { supabase } from './supabase';

export interface DataService {
  getTeams(): Promise<Team[]>;
  saveTeam(team: Team): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;

  getMatches(teamId: string): Promise<MatchRecord[]>;
  saveMatch(match: MatchRecord): Promise<void>;
  deleteMatch(matchId: string): Promise<void>;

  getExercises(): Promise<ExerciseDTO[]>;
  saveExercise(exercise: ExerciseDTO): Promise<void>;
  deleteExercise(exerciseId: string): Promise<void>;

  getSeasonPlan(teamId?: string): Promise<Record<string, any>>;
  saveSeasonPlan(plan: Record<string, any>, teamId?: string): Promise<void>;
  
  getAppState(key: string): Promise<any>;
  saveAppState(key: string, data: any): Promise<void>;
  deleteAppState(key: string): Promise<void>;
}

/**
 * Clave (en `season_plan`) de la sesión de partido en vivo.
 * Está scopeada por equipo para que dos equipos / dos entrenadores no compartan sesión.
 */
export const matchSessionKey = (teamId?: string): string => `activeMatchSession_${teamId || 'default'}`;

/** Registra el error de Supabase y lo propaga para que la UI nunca dé un falso positivo de guardado. */
function fail(operation: string, error: { message?: string }): never {
  console.error(`${operation} error:`, error);
  throw new Error(`${operation}: ${error.message || 'error desconocido de Supabase'}`, { cause: error });
}

export const db: DataService = {
  async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
    if (error) fail('getTeams', error);
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      modality: row.modality,
      players: (row.players || []).filter(Boolean),
      fines: row.fines || [],
      activeCallUp: row.active_call_up || [],
    }));
  },

  async saveTeam(team: Team): Promise<void> {
    const { error } = await supabase.from('teams').upsert({
      id: team.id, name: team.name, modality: team.modality,
      players: team.players, fines: team.fines || [], active_call_up: team.activeCallUp || [],
    }, { onConflict: 'id' });
    if (error) fail('saveTeam', error);
  },

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) fail('deleteTeam', error);
    const { error: matchesError } = await supabase.from('match_history').delete().eq('team_id', teamId);
    if (matchesError) fail('deleteTeam(match_history)', matchesError);
  },

  async getMatches(teamId: string): Promise<MatchRecord[]> {
    const { data, error } = await supabase.from('match_history').select('*').eq('team_id', teamId).order('date', { ascending: false });
    if (error) fail('getMatches', error);
    return (data || []).map(row => ({ ...row.data, id: row.id, teamId: row.team_id }));
  },

  async saveMatch(match: MatchRecord): Promise<void> {
    const { error } = await supabase.from('match_history').upsert({
      id: match.id, team_id: match.teamId, date: match.date, data: match,
    }, { onConflict: 'id' });
    if (error) fail('saveMatch', error);
  },

  async deleteMatch(matchId: string): Promise<void> {
    const { error } = await supabase.from('match_history').delete().eq('id', matchId);
    if (error) fail('deleteMatch', error);
  },

  async getExercises(): Promise<ExerciseDTO[]> {
    const { data, error } = await supabase.from('exercises').select('*').order('created_at', { ascending: false });
    if (error) fail('getExercises', error);
    return (data || []).map(row => ({ ...row.data, id: row.id }));
  },

  async saveExercise(exercise: ExerciseDTO): Promise<void> {
    const { error } = await supabase.from('exercises').upsert({
      id: exercise.id, title: exercise.title, data: exercise,
    }, { onConflict: 'id' });
    if (error) fail('saveExercise', error);
  },

  async deleteExercise(exerciseId: string): Promise<void> {
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
    if (error) fail('deleteExercise', error);
  },

  async getSeasonPlan(teamId?: string): Promise<Record<string, any>> {
    const { data, error } = await supabase.from('season_plan').select('data').eq('id', teamId ? `plan_${teamId}` : 'global_plan').maybeSingle();
    if (error) fail('getSeasonPlan', error);
    return data ? data.data : {};
  },

  async saveSeasonPlan(plan: Record<string, any>, teamId?: string): Promise<void> {
    const { error } = await supabase.from('season_plan').upsert({ id: teamId ? `plan_${teamId}` : 'global_plan', data: plan }, { onConflict: 'id' });
    if (error) fail('saveSeasonPlan', error);
  },

  async getAppState(key: string): Promise<any> {
    const { data, error } = await supabase.from('season_plan').select('data').eq('id', key).maybeSingle();
    if (error) fail('getAppState', error);
    return data ? data.data : null;
  },

  async saveAppState(key: string, data: any): Promise<void> {
    const { error } = await supabase.from('season_plan').upsert({ id: key, data }, { onConflict: 'id' });
    if (error) fail('saveAppState', error);
  },

  async deleteAppState(key: string): Promise<void> {
    const { error } = await supabase.from('season_plan').delete().eq('id', key);
    if (error) fail('deleteAppState', error);
  }
};
