import type { Team, MatchRecord } from '../types';
import type { ExerciseDTO } from '../infrastructure/database/db';
import { supabase } from './supabase';
import { cacheService } from './cacheService';
import {
  registerCachePurgeListener,
  registerPreLogoutHook,
  requireAuthUserId,
} from './authSession';

export interface DataService {
  getTeams(): Promise<Team[]>;
  saveTeam(team: Team): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;

  getMatches(teamId: string): Promise<MatchRecord[]>;
  saveMatch(match: MatchRecord): Promise<void>;
  deleteMatch(matchId: string, teamId?: string): Promise<void>;

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

function isMissingUserIdColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    (error.code === 'PGRST204' || error.code === '42703') &&
    String(error.message || '').toLowerCase().includes('user_id')
  );
}

async function upsertScoped(
  table: 'teams' | 'match_history' | 'exercises' | 'season_plan',
  payload: Record<string, any>,
  userId: string
): Promise<{ error: any }> {
  const res = await supabase.from(table).upsert({ ...payload, user_id: userId }, { onConflict: 'id' });
  if (isMissingUserIdColumnError(res.error)) {
    console.warn(`[db] Ejecuta supabase_security_hardening.sql para habilitar user_id y RLS en '${table}'.`);
    return await supabase.from(table).upsert(payload, { onConflict: 'id' });
  }
  return res;
}

// Debounce queues for write-heavy tables (supports coalesced callers without hanging promises)
const pendingPlanSaves = new Map<string, { plan: Record<string, any>; timer: any; resolvers: Array<() => void>; rejecters: Array<(err: any) => void> }>();
const pendingAppStateSaves = new Map<string, { data: any; timer: any; resolvers: Array<() => void>; rejecters: Array<(err: any) => void> }>();
const recentMatchSaves = new Map<string, { id: string; timestamp: number }>();

function cancelPendingQueues(): void {
  for (const [, entry] of pendingPlanSaves) {
    clearTimeout(entry.timer);
    entry.resolvers.forEach(fn => fn());
  }
  pendingPlanSaves.clear();

  for (const [, entry] of pendingAppStateSaves) {
    clearTimeout(entry.timer);
    entry.resolvers.forEach(fn => fn());
  }
  pendingAppStateSaves.clear();
  recentMatchSaves.clear();
}

registerCachePurgeListener(cancelPendingQueues);

async function flushAllPendingQueues(): Promise<void> {
  const teamIds = Array.from(pendingPlanSaves.keys()).map(k => (k.startsWith('plan_') ? k.slice(5) : undefined));
  const stateKeys = Array.from(pendingAppStateSaves.keys());
  await Promise.all([
    ...teamIds.map(tid => db.flushSeasonPlan(tid).catch(() => {})),
    ...stateKeys.map(k => db.flushAppState(k).catch(() => {})),
  ]);
}

registerPreLogoutHook(flushAllPendingQueues);

const seasonPlanRowKey = (teamId: string | undefined, userId: string): string =>
  teamId ? `plan_${teamId}` : `global_plan_${userId}`;

export const db: DataService = {
  async getTeams(): Promise<Team[]> {
    const userId = await requireAuthUserId();
    return cacheService.dedupe(`teams_${userId}`, async () => {
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
    const userId = await requireAuthUserId();
    const cachedTeams = cacheService.get<Team[]>('teams', []);
    const nextTeams = [...cachedTeams.filter(t => t.id !== team.id), team];
    cacheService.set('teams', nextTeams);

    const { error } = await upsertScoped(
      'teams',
      {
        id: team.id,
        name: team.name,
        modality: team.modality,
        players: team.players,
        fines: team.fines || [],
        active_call_up: team.activeCallUp || [],
      },
      userId
    );
    if (error) fail('saveTeam', error);
  },

  async deleteTeam(teamId: string): Promise<void> {
    await requireAuthUserId();
    const cachedTeams = cacheService.get<Team[]>('teams', []);
    cacheService.set('teams', cachedTeams.filter(t => t.id !== teamId));
    cacheService.remove(`matches_${teamId}`);
    cacheService.remove(`plan_${teamId}`);

    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) fail('deleteTeam', error);
    const { error: matchesError } = await supabase.from('match_history').delete().eq('team_id', teamId);
    if (matchesError) fail('deleteTeam(match_history)', matchesError);
    await supabase.from('season_plan').delete().in('id', [`plan_${teamId}`, `settings_${teamId}`, `rivals_db_${teamId}`]);
  },

  async getMatches(teamId: string): Promise<MatchRecord[]> {
    await requireAuthUserId();
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
    const userId = await requireAuthUserId();
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

    const { error } = await upsertScoped(
      'match_history',
      { id: match.id, team_id: match.teamId, date: match.date, data: match },
      userId
    );
    if (error) fail('saveMatch', error);
  },

  async deleteMatch(matchId: string, teamId?: string): Promise<void> {
    await requireAuthUserId();
    const teamIds = new Set<string>();
    if (teamId) teamIds.add(teamId);
    const cachedTeams = cacheService.get<Team[]>('teams', []);
    for (const t of cachedTeams) {
      if (t?.id) teamIds.add(t.id);
    }
    for (const tid of teamIds) {
      const cacheKey = `matches_${tid}`;
      const list = cacheService.get<MatchRecord[] | null>(cacheKey, null);
      if (Array.isArray(list)) {
        cacheService.set(cacheKey, list.filter(m => m.id !== matchId));
      }
    }

    const { error } = await supabase.from('match_history').delete().eq('id', matchId);
    if (error) fail('deleteMatch', error);
  },

  async getExercises(): Promise<ExerciseDTO[]> {
    const userId = await requireAuthUserId();
    return cacheService.dedupe(`exercises_${userId}`, async () => {
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
    const userId = await requireAuthUserId();
    const cached = cacheService.get<ExerciseDTO[]>('exercises', []);
    const updated = [exercise, ...cached.filter(e => e.id !== exercise.id)];
    cacheService.set('exercises', updated);

    const { error } = await upsertScoped(
      'exercises',
      { id: exercise.id, title: exercise.title, data: exercise },
      userId
    );
    if (error) fail('saveExercise', error);
  },

  async deleteExercise(exerciseId: string): Promise<void> {
    await requireAuthUserId();
    const cached = cacheService.get<ExerciseDTO[]>('exercises', []);
    cacheService.set('exercises', cached.filter(e => e.id !== exerciseId));

    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
    if (error) fail('deleteExercise', error);
  },

  async getSeasonPlan(teamId?: string): Promise<Record<string, any>> {
    const userId = await requireAuthUserId();
    const key = seasonPlanRowKey(teamId, userId);
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
    const userId = await requireAuthUserId();
    const key = seasonPlanRowKey(teamId, userId);
    cacheService.set(key, plan);

    return new Promise((resolve, reject) => {
      const existing = pendingPlanSaves.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }
      const resolvers = existing ? [...existing.resolvers, resolve] : [resolve];
      const rejecters = existing ? [...existing.rejecters, reject] : [reject];

      const timer = setTimeout(async () => {
        pendingPlanSaves.delete(key);
        try {
          const activeUid = await requireAuthUserId();
          const { error } = await upsertScoped('season_plan', { id: key, data: plan }, activeUid);
          if (error) fail('saveSeasonPlan', error);
          resolvers.forEach(fn => fn());
        } catch (err) {
          rejecters.forEach(fn => fn(err));
        }
      }, 400);

      pendingPlanSaves.set(key, { plan, timer, resolvers, rejecters });
    });
  },

  async flushSeasonPlan(teamId?: string): Promise<void> {
    const userId = await requireAuthUserId();
    const key = seasonPlanRowKey(teamId, userId);
    const pending = pendingPlanSaves.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      pendingPlanSaves.delete(key);
      try {
        const { error } = await upsertScoped('season_plan', { id: key, data: pending.plan }, userId);
        if (error) fail('flushSeasonPlan', error);
        pending.resolvers.forEach(fn => fn());
      } catch (err) {
        pending.rejecters.forEach(fn => fn(err));
        throw err;
      }
    }
  },

  async getAppState(key: string): Promise<any> {
    await requireAuthUserId();
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
    await requireAuthUserId();
    const cacheKey = `app_state_${key}`;
    cacheService.set(cacheKey, data);

    return new Promise((resolve, reject) => {
      const existing = pendingAppStateSaves.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }
      const resolvers = existing ? [...existing.resolvers, resolve] : [resolve];
      const rejecters = existing ? [...existing.rejecters, reject] : [reject];

      const timer = setTimeout(async () => {
        pendingAppStateSaves.delete(key);
        try {
          const activeUid = await requireAuthUserId();
          const { error } = await upsertScoped('season_plan', { id: key, data }, activeUid);
          if (error) fail('saveAppState', error);
          resolvers.forEach(fn => fn());
        } catch (err) {
          rejecters.forEach(fn => fn(err));
        }
      }, 400);

      pendingAppStateSaves.set(key, { data, timer, resolvers, rejecters });
    });
  },

  async flushAppState(key: string): Promise<void> {
    const userId = await requireAuthUserId();
    const pending = pendingAppStateSaves.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      pendingAppStateSaves.delete(key);
      try {
        const { error } = await upsertScoped('season_plan', { id: key, data: pending.data }, userId);
        if (error) fail('flushAppState', error);
        pending.resolvers.forEach(fn => fn());
      } catch (err) {
        pending.rejecters.forEach(fn => fn(err));
        throw err;
      }
    }
  },

  async deleteAppState(key: string): Promise<void> {
    await requireAuthUserId();
    const existing = pendingAppStateSaves.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      pendingAppStateSaves.delete(key);
      existing.resolvers.forEach(fn => fn());
    }
    cacheService.remove(`app_state_${key}`);

    const { error } = await supabase.from('season_plan').delete().eq('id', key);
    if (error) fail('deleteAppState', error);
  },
};
