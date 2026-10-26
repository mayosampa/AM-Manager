import type { Team, MatchRecord } from '../types';
import type { ExerciseDTO } from '../infrastructure/database/db';
import { supabase } from './supabase';
import { cacheService } from './cacheService';

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
  flushSeasonPlan(teamId?: string): Promise<void>;
  
  getAppState(key: string): Promise<any>;
  saveAppState(key: string, data: any): Promise<void>;
  flushAppState(key: string): Promise<void>;
  deleteAppState(key: string): Promise<void>;
}

export const matchSessionKey = (teamId?: string): string => `activeMatchSession_${teamId || 'default'}`;

function fail(operation: string, error: { message?: string }): never {
  console.error(`${operation} error:`, error);
  throw new Error(`${operation}: ${error.message || 'error desconocido de Supabase'}`, { cause: error });
}

// Debounce queues for write-heavy tables
const pendingPlanSaves = new Map<string, { plan: Record<string, any>; timer: any; resolve: () => void; reject: (err: any) => void }>();
const pendingAppStateSaves = new Map<string, { data: any; timer: any; resolve: () => void; reject: (err: any) => void }>();
const recentMatchSaves = new Map<string, { id: string; timestamp: number }>();

export const db: DataService = {
  async getTeams(): Promise<Team[]> {
    return cacheService.dedupe('teams', async () => {
      const cached = cacheService.get<Team[] | null>('teams', null);
      try {
        const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
        if (error) {
          if (cached) return cached;
          fail('getTeams', error);
        }
        const mapped = (data || []).map(row => ({
          id: row.id,
          name: row.name,
          modality: row.modality,
          players: (row.players || []).filter(Boolean),
          fines: row.fines || [],
          activeCallUp: row.active_call_up || [],
        }));
        cacheService.set('teams', mapped);
        return mapped;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    });
  },

  async saveTeam(team: Team): Promise<void> {
    const cachedTeams = cacheService.get<Team[]>('teams', []);
    const nextTeams = [...cachedTeams.filter(t => t.id !== team.id), team];
    cacheService.set('teams', nextTeams);

    const { error } = await supabase.from('teams').upsert({
      id: team.id, name: team.name, modality: team.modality,
      players: team.players, fines: team.fines || [], active_call_up: team.activeCallUp || [],
    }, { onConflict: 'id' });
    if (error) fail('saveTeam', error);
  },

  async deleteTeam(teamId: string): Promise<void> {
    const cachedTeams = cacheService.get<Team[]>('teams', []);
    cacheService.set('teams', cachedTeams.filter(t => t.id !== teamId));
    cacheService.remove(`matches_${teamId}`);
    cacheService.remove(`plan_${teamId}`);

    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) fail('deleteTeam', error);
    const { error: matchesError } = await supabase.from('match_history').delete().eq('team_id', teamId);
    if (matchesError) fail('deleteTeam(match_history)', matchesError);
  },

  async getMatches(teamId: string): Promise<MatchRecord[]> {
    const cacheKey = `matches_${teamId}`;
    return cacheService.dedupe(cacheKey, async () => {
      const cached = cacheService.get<MatchRecord[] | null>(cacheKey, null);
      try {
        const { data, error } = await supabase.from('match_history').select('*').eq('team_id', teamId).order('date', { ascending: false });
        if (error) {
          if (cached) return cached;
          fail('getMatches', error);
        }
        const mapped = (data || []).map(row => ({ ...row.data, id: row.id, teamId: row.team_id }));
        cacheService.set(cacheKey, mapped);
        return mapped;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    });
  },

  async saveMatch(match: MatchRecord): Promise<void> {
    const dayKey = (match.date || '').split('T')[0];
    const sig = `${match.teamId}|${(match.opponent || '').trim().toLowerCase()}|${dayKey}|${match.score?.home ?? 0}-${match.score?.away ?? 0}`;
    const now = Date.now();
    const recent = recentMatchSaves.get(sig);
    if (recent && recent.id !== match.id && now - recent.timestamp < 10000) {
      console.warn('[db.saveMatch] Ignorando doble guardado detectado en menos de 10s:', sig);
      return;
    }
    recentMatchSaves.set(sig, { id: match.id, timestamp: now });

    const cacheKey = `matches_${match.teamId}`;
    const cached = cacheService.get<MatchRecord[]>(cacheKey, []);
    const updated = [match, ...cached.filter(m => m.id !== match.id)].sort((a, b) => b.date.localeCompare(a.date));
    cacheService.set(cacheKey, updated);

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
    return cacheService.dedupe('exercises', async () => {
      const cached = cacheService.get<ExerciseDTO[] | null>('exercises', null);
      try {
        const { data, error } = await supabase.from('exercises').select('*').order('created_at', { ascending: false });
        if (error) {
          if (cached) return cached;
          fail('getExercises', error);
        }
        const mapped = (data || []).map(row => ({ ...row.data, id: row.id }));
        cacheService.set('exercises', mapped);
        return mapped;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    });
  },

  async saveExercise(exercise: ExerciseDTO): Promise<void> {
    const cached = cacheService.get<ExerciseDTO[]>('exercises', []);
    const updated = [exercise, ...cached.filter(e => e.id !== exercise.id)];
    cacheService.set('exercises', updated);

    const { error } = await supabase.from('exercises').upsert({
      id: exercise.id, title: exercise.title, data: exercise,
    }, { onConflict: 'id' });
    if (error) fail('saveExercise', error);
  },

  async deleteExercise(exerciseId: string): Promise<void> {
    const cached = cacheService.get<ExerciseDTO[]>('exercises', []);
    cacheService.set('exercises', cached.filter(e => e.id !== exerciseId));

    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
    if (error) fail('deleteExercise', error);
  },

  async getSeasonPlan(teamId?: string): Promise<Record<string, any>> {
    const key = teamId ? `plan_${teamId}` : 'global_plan';
    return cacheService.dedupe(key, async () => {
      const cached = cacheService.get<Record<string, any> | null>(key, null);
      try {
        const { data, error } = await supabase.from('season_plan').select('data').eq('id', key).maybeSingle();
        if (error) {
          if (cached) return cached;
          fail('getSeasonPlan', error);
        }
        const result = data ? data.data : {};
        cacheService.set(key, result);
        return result;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    });
  },

  async saveSeasonPlan(plan: Record<string, any>, teamId?: string): Promise<void> {
    const key = teamId ? `plan_${teamId}` : 'global_plan';
    // 1. Optimistic update in cache immediately (0ms UI latency)
    cacheService.set(key, plan);

    // 2. Debounce remote write (400ms) to coalesce rapid edits (e.g., player attendance clicks)
    return new Promise((resolve, reject) => {
      const existing = pendingPlanSaves.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(async () => {
        pendingPlanSaves.delete(key);
        try {
          const { error } = await supabase.from('season_plan').upsert({ id: key, data: plan }, { onConflict: 'id' });
          if (error) fail('saveSeasonPlan', error);
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 400);

      pendingPlanSaves.set(key, { plan, timer, resolve, reject });
    });
  },

  async flushSeasonPlan(teamId?: string): Promise<void> {
    const key = teamId ? `plan_${teamId}` : 'global_plan';
    const pending = pendingPlanSaves.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      pendingPlanSaves.delete(key);
      const { error } = await supabase.from('season_plan').upsert({ id: key, data: pending.plan }, { onConflict: 'id' });
      if (error) fail('flushSeasonPlan', error);
      pending.resolve();
    }
  },

  async getAppState(key: string): Promise<any> {
    return cacheService.dedupe(`app_state_${key}`, async () => {
      const cached = cacheService.get<any | null>(`app_state_${key}`, null);
      try {
        const { data, error } = await supabase.from('season_plan').select('data').eq('id', key).maybeSingle();
        if (error) {
          if (cached) return cached;
          fail('getAppState', error);
        }
        const result = data ? data.data : null;
        if (result !== null) {
          cacheService.set(`app_state_${key}`, result);
        }
        return result;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    });
  },

  async saveAppState(key: string, data: any): Promise<void> {
    const cacheKey = `app_state_${key}`;
    cacheService.set(cacheKey, data);

    return new Promise((resolve, reject) => {
      const existing = pendingAppStateSaves.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(async () => {
        pendingAppStateSaves.delete(key);
        try {
          const { error } = await supabase.from('season_plan').upsert({ id: key, data }, { onConflict: 'id' });
          if (error) fail('saveAppState', error);
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 400);

      pendingAppStateSaves.set(key, { data, timer, resolve, reject });
    });
  },

  async flushAppState(key: string): Promise<void> {
    const pending = pendingAppStateSaves.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      pendingAppStateSaves.delete(key);
      const { error } = await supabase.from('season_plan').upsert({ id: key, data: pending.data }, { onConflict: 'id' });
      if (error) fail('flushAppState', error);
      pending.resolve();
    }
  },

  async deleteAppState(key: string): Promise<void> {
    const existing = pendingAppStateSaves.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      pendingAppStateSaves.delete(key);
    }
    cacheService.remove(`app_state_${key}`);

    const { error } = await supabase.from('season_plan').delete().eq('id', key);
    if (error) fail('deleteAppState', error);
  }
};
