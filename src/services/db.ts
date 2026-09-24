import { Player, Team, SavedScene, MatchRecord } from '../types';
import { supabase } from './supabase';

export interface DataService {
  // -- Teams --
  getTeams(): Promise<Team[]>;
  saveTeam(team: Team): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;

  // -- Matches --
  getMatches(teamId: string): Promise<MatchRecord[]>;
  saveMatch(match: MatchRecord): Promise<void>;
  deleteMatch(matchId: string): Promise<void>;

  // -- Exercises (Library) --
  getExercises(): Promise<SavedScene[]>;
  saveExercise(exercise: SavedScene): Promise<void>;
  deleteExercise(exerciseId: string): Promise<void>;

  // -- Season Plan --
  getSeasonPlan(): Promise<Record<string, any>>;
  saveSeasonPlan(plan: Record<string, any>): Promise<void>;
}

export const db: DataService = {
  // ─── TEAMS ─────────────────────────────────────────────
  async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.error('getTeams error:', error); return []; }
    // data rows: { id, name, modality, players, fines, active_call_up, created_at }
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
    const { error } = await supabase
      .from('teams')
      .upsert({
        id: team.id,
        name: team.name,
        modality: team.modality,
        players: team.players,
        fines: team.fines || [],
        active_call_up: team.activeCallUp || [],
      }, { onConflict: 'id' });
    if (error) console.error('saveTeam error:', error);
  },

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) console.error('deleteTeam error:', error);
    // cascade: borrar también sus partidos
    await supabase.from('match_history').delete().eq('team_id', teamId);
  },

  // ─── MATCHES ───────────────────────────────────────────
  async getMatches(teamId: string): Promise<MatchRecord[]> {
    const { data, error } = await supabase
      .from('match_history')
      .select('*')
      .eq('team_id', teamId)
      .order('date', { ascending: false });
    if (error) { console.error('getMatches error:', error); return []; }
    return (data || []).map(row => ({ ...row.data, id: row.id, teamId: row.team_id }));
  },

  async saveMatch(match: MatchRecord): Promise<void> {
    const { error } = await supabase
      .from('match_history')
      .upsert({
        id: match.id,
        team_id: match.teamId,
        date: match.date,
        data: match,
      }, { onConflict: 'id' });
    if (error) console.error('saveMatch error:', error);
  },

  async deleteMatch(matchId: string): Promise<void> {
    const { error } = await supabase.from('match_history').delete().eq('id', matchId);
    if (error) console.error('deleteMatch error:', error);
  },

  // ─── EXERCISES ─────────────────────────────────────────
  async getExercises(): Promise<SavedScene[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('getExercises error:', error); return []; }
    return (data || []).map(row => ({ ...row.data, id: row.id }));
  },

  async saveExercise(exercise: SavedScene): Promise<void> {
    const { error } = await supabase
      .from('exercises')
      .upsert({
        id: exercise.id,
        title: exercise.title,
        data: exercise,
      }, { onConflict: 'id' });
    if (error) console.error('saveExercise error:', error);
  },

  async deleteExercise(exerciseId: string): Promise<void> {
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
    if (error) console.error('deleteExercise error:', error);
  },

  // ─── SEASON PLAN ───────────────────────────────────────
  async getSeasonPlan(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('season_plan')
      .select('data')
      .eq('id', 'global_plan')
      .single();
    if (error && error.code !== 'PGRST116') { console.error('getSeasonPlan error:', error); }
    return data ? data.data : {};
  },

  async saveSeasonPlan(plan: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('season_plan')
      .upsert({
        id: 'global_plan',
        data: plan
      }, { onConflict: 'id' });
    if (error) console.error('saveSeasonPlan error:', error);
  }
};
