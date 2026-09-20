import React, { createContext, useContext, useState, useEffect } from 'react';
import { Team, Player, Fine } from '../types';
import { db } from '../services/db';

interface TeamContextType {
  teams: Team[];
  activeTeamId: string;
  activeTeam: Team | undefined;
  createTeam: (name: string, modality: 'F7' | 'F11') => void;
  selectTeam: (id: string) => void;
  updateTeamPlayers: (players: Player[]) => void;
  updateTeamCallUp: (playerIds: string[]) => void;
  updateTeamFines: (fines: Fine[]) => void;
  updateTeam: (id: string, name: string, modality: 'F7' | 'F11') => void;
  deleteTeam: (id: string) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');

  useEffect(() => {
    async function loadTeams() {
      try {
        let loadedTeams = await db.getTeams();
        if (loadedTeams.length === 0) {
          const defaultTeam: Team = {
            id: 'team-1',
            name: 'Mi Equipo',
            modality: 'F11',
            players: []
          };
          await db.saveTeam(defaultTeam);
          loadedTeams = [defaultTeam];
        }
        setTeams(loadedTeams);
        setActiveTeamId(loadedTeams[0].id);

        // --- HARD MIGRATION SCRIPT ---
        const firstTeamId = loadedTeams[0].id;
        
        const rawHistory = localStorage.getItem('matchHistory');
        if (rawHistory) {
          try {
            const parsed = JSON.parse(rawHistory);
            let modified = false;
            const migratedHistory = parsed.map((m: any) => {
              if (!m.teamId) {
                modified = true;
                return { ...m, teamId: firstTeamId };
              }
              return m;
            });
            if (modified) {
              localStorage.setItem('matchHistory', JSON.stringify(migratedHistory));
            }
          } catch(e) {}
        }

        const rawPlan = localStorage.getItem('am_manager_season_plan');
        if (rawPlan) {
          try {
            const parsed = JSON.parse(rawPlan);
            let modified = false;
            for (const key of Object.keys(parsed)) {
              if (!parsed[key].teamId) {
                modified = true;
                parsed[key].teamId = firstTeamId;
              }
            }
            if (modified) {
              localStorage.setItem('am_manager_season_plan', JSON.stringify(parsed));
            }
          } catch(e) {}
        }
        // -----------------------------

      } catch (e) {
        console.error('Error loading teams', e);
      }
    }
    loadTeams();
  }, []);

  const createTeam = async (name: string, modality: 'F7' | 'F11') => {
    const newTeam: Team = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      modality,
      players: []
    };
    await db.saveTeam(newTeam);
    const updated = await db.getTeams();
    setTeams(updated);
    setActiveTeamId(newTeam.id);
  };

  const selectTeam = (id: string) => {
    if (teams.find(t => t.id === id)) {
      setActiveTeamId(id);
    }
  };

  const updateTeamPlayers = async (players: Player[]) => {
    const t = teams.find(t => t.id === activeTeamId);
    if (!t) return;
    
    t.players = players;
    await db.saveTeam(t);
    const updated = await db.getTeams();
    setTeams(updated);
  };

  const updateTeamCallUp = async (playerIds: string[]) => {
    const t = teams.find(t => t.id === activeTeamId);
    if (!t) return;
    
    t.activeCallUp = playerIds;
    await db.saveTeam(t);
    const updated = await db.getTeams();
    setTeams(updated);
  };

  const updateTeamFines = async (fines: Fine[]) => {
    const t = teams.find(t => t.id === activeTeamId);
    if (!t) return;
    
    t.fines = fines;
    await db.saveTeam(t);
    const updated = await db.getTeams();
    setTeams(updated);
  };

  const updateTeam = async (id: string, name: string, modality: 'F7' | 'F11') => {
    const t = teams.find(t => t.id === id);
    if (!t) return;
    t.name = name;
    t.modality = modality;
    await db.saveTeam(t);
    const updated = await db.getTeams();
    setTeams(updated);
  };

  const deleteTeam = async (id: string) => {
    // cascade delete
    const remainingTeams = teams.filter(t => t.id !== id);
    localStorage.setItem('am_manager_teams', JSON.stringify(remainingTeams));
    setTeams(remainingTeams);
    
    if (activeTeamId === id) {
      setActiveTeamId(remainingTeams.length > 0 ? remainingTeams[0].id : '');
    }

    // Limpiar localStorage en cascada
    try {
      const rawHistory = localStorage.getItem('matchHistory');
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        const filteredHistory = parsed.filter((m: any) => m.teamId !== id);
        localStorage.setItem('matchHistory', JSON.stringify(filteredHistory));
      }
      const rawPlan = localStorage.getItem('am_manager_season_plan');
      if (rawPlan) {
        const parsed = JSON.parse(rawPlan);
        for (const key of Object.keys(parsed)) {
          if (parsed[key].teamId === id) {
            delete parsed[key];
          }
        }
        localStorage.setItem('am_manager_season_plan', JSON.stringify(parsed));
      }
    } catch(e) {
      console.error('Error cascade deleting team data', e);
    }
  };

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return (
    <TeamContext.Provider value={{ teams, activeTeamId, activeTeam, createTeam, selectTeam, updateTeamPlayers, updateTeamCallUp, updateTeamFines, updateTeam, deleteTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
