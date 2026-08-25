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

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return (
    <TeamContext.Provider value={{ teams, activeTeamId, activeTeam, createTeam, selectTeam, updateTeamPlayers, updateTeamCallUp, updateTeamFines }}>
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
