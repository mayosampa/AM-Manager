import { Player, Team, SavedScene, MatchRecord } from '../types';

export interface DataService {
  // -- Teams --
  getTeams(): Promise<Team[]>;
  saveTeam(team: Team): Promise<void>;
  
  // -- Roster (Players) --
  getPlayers(teamId: string): Promise<Player[]>;
  savePlayers(teamId: string, players: Player[]): Promise<void>;
  
  // -- Matches --
  getMatches(teamId: string): Promise<MatchRecord[]>;
  saveMatches(teamId: string, matches: MatchRecord[]): Promise<void>;
  
  // -- Exercises (Library) --
  getExercises(): Promise<SavedScene[]>;
  saveExercises(exercises: SavedScene[]): Promise<void>;
}

// Claves de persistencia locales
const KEYS = {
  TEAMS: 'am_manager_teams',
  PLAYERS: (teamId: string) => `am_manager_players_${teamId}`,
  MATCHES: (teamId: string) => `am_manager_matches_${teamId}`,
  EXERCISES: 'am_manager_exercises',
};

// Implementación de LocalStorage simulando asincronía
export const db: DataService = {
  async getTeams(): Promise<Team[]> {
    const data = localStorage.getItem(KEYS.TEAMS);
    if (!data) {
      // Intentar migrar desde la clave antigua si existe
      const oldTeamData = localStorage.getItem('am_coach_active_team');
      if (oldTeamData) {
        try {
          const parsed = JSON.parse(oldTeamData);
          if (parsed && parsed.id) {
            return [parsed];
          }
        } catch (e) {}
      }
      return [];
    }
    return JSON.parse(data);
  },

  async saveTeam(team: Team): Promise<void> {
    const teams = await this.getTeams();
    const index = teams.findIndex(t => t.id === team.id);
    if (index >= 0) {
      teams[index] = team;
    } else {
      teams.push(team);
    }
    localStorage.setItem(KEYS.TEAMS, JSON.stringify(teams));
  },

  async getPlayers(teamId: string): Promise<Player[]> {
    const data = localStorage.getItem(KEYS.PLAYERS(teamId));
    if (!data) return [];
    return JSON.parse(data);
  },

  async savePlayers(teamId: string, players: Player[]): Promise<void> {
    localStorage.setItem(KEYS.PLAYERS(teamId), JSON.stringify(players));
  },

  async getMatches(teamId: string): Promise<MatchRecord[]> {
    const data = localStorage.getItem(KEYS.MATCHES(teamId));
    if (!data) return [];
    return JSON.parse(data);
  },

  async saveMatches(teamId: string, matches: MatchRecord[]): Promise<void> {
    localStorage.setItem(KEYS.MATCHES(teamId), JSON.stringify(matches));
  },

  async getExercises(): Promise<SavedScene[]> {
    const data = localStorage.getItem(KEYS.EXERCISES);
    if (!data) {
      // Migración de datos antiguos
      const oldExercises1 = localStorage.getItem('am_coach_scenes');
      const oldExercises2 = localStorage.getItem('amcoach_exercises');
      
      let merged: SavedScene[] = [];
      if (oldExercises1) {
        try { merged = [...merged, ...JSON.parse(oldExercises1)]; } catch (e) {}
      }
      if (oldExercises2) {
        try { merged = [...merged, ...JSON.parse(oldExercises2)]; } catch (e) {}
      }
      
      // Eliminar duplicados si los hay por ID
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      
      if (unique.length > 0) {
        await this.saveExercises(unique);
      }
      return unique;
    }
    return JSON.parse(data);
  },

  async saveExercises(exercises: SavedScene[]): Promise<void> {
    localStorage.setItem(KEYS.EXERCISES, JSON.stringify(exercises));
  }
};
