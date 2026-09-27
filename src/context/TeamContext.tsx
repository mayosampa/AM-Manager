import React, { createContext, useContext, useState, useEffect } from 'react';
import { Team, Player, Fine } from '../types';
import { db } from '../services/db';

export const DEFAULT_CATEGORIES = ['Calentamiento', 'Posesión', 'Transiciones', 'Ataque', 'Defensa', 'Táctica', 'Partidos'];

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
  customCategories: string[];
  updateCustomCategories: (cats: string[]) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    async function loadTeams() {
      try {
        const loadedTeams = await db.getTeams();
        if (loadedTeams.length > 0) {
          setTeams(loadedTeams);
          setActiveTeamId(loadedTeams[0].id);
        } else {
           const defaultTeam: Team = {
              id: 'team-1',
              name: 'Mi Equipo',
              modality: 'F11',
              players: []
           };
           await db.saveTeam(defaultTeam);
           setTeams([defaultTeam]);
           setActiveTeamId(defaultTeam.id);
        }
      } catch (e) {
        console.error('Error loading teams', e);
      }
    }
    loadTeams();
  }, []);

  // Load custom categories when activeTeamId changes
  useEffect(() => {
    async function loadCategories() {
      if (!activeTeamId) return;
      try {
        const data = await db.getAppState(`categories_${activeTeamId}`);
        if (data && Array.isArray(data) && data.length > 0) {
          setCustomCategories(data);
        } else {
          setCustomCategories(DEFAULT_CATEGORIES);
        }
      } catch (e) {
        console.error('Error loading categories', e);
      }
    }
    loadCategories();
  }, [activeTeamId]);

  const updateCustomCategories = async (cats: string[]) => {
    setCustomCategories(cats);
    if (activeTeamId) {
      await db.saveAppState(`categories_${activeTeamId}`, cats);
    }
  };

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
    await db.deleteTeam(id);
    const updated = await db.getTeams();
    setTeams(updated);
    if (activeTeamId === id) {
      setActiveTeamId(updated.length > 0 ? updated[0].id : '');
    }
  };

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return (
    <TeamContext.Provider value={{ 
      teams, activeTeamId, activeTeam, 
      createTeam, selectTeam, updateTeamPlayers, 
      updateTeamCallUp, updateTeamFines, updateTeam, deleteTeam,
      customCategories, updateCustomCategories 
    }}>
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
