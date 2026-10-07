import React, { createContext, useContext, useState, useEffect } from 'react';
import { Team, Player, Fine } from '../types';
import { db } from '../services/db';

export const DEFAULT_CATEGORIES = ['Calentamiento', 'Posesión', 'Transiciones', 'Ataque', 'Defensa', 'Táctica', 'Partidos'];

export interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
}

interface TeamContextType {
  teams: Team[];
  activeTeamId: string;
  activeTeam: Team | undefined;
  createTeam: (name: string, modality: 'F7' | 'F11') => void;
  selectTeam: (id: string) => void;
  updateTeamPlayers: (players: Player[]) => void;
  updateTeamCallUp: (playerIds: string[]) => void;
  updateTeamFines: (fines: Fine[]) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  customCategories: string[];
  updateCustomCategories: (cats: string[]) => void;
  teamSettings: TeamSettings;
  updateTeamSettings: (settings: TeamSettings) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [teamSettings, setTeamSettings] = useState<TeamSettings>({ crestUrl: '', defaultFormation: '4-3-3' });

  useEffect(() => {
    async function loadTeams() {
      try {
        let loadedTeams = await db.getTeams();
        
        // Saneamiento de datos: Si updateTeam machacó el string con un objeto JSON
        loadedTeams = loadedTeams.map(t => {
          if (typeof t.name === 'object' || (typeof t.name === 'string' && t.name.startsWith('{'))) {
            try {
              const parsed = typeof t.name === 'string' ? JSON.parse(t.name) : t.name;
              if (parsed.activeCallUp) t.activeCallUp = parsed.activeCallUp;
              if (parsed.whatsappTemplate) t.whatsappTemplate = parsed.whatsappTemplate;
              t.name = 'Equipo Restaurado';
              db.saveTeam(t);
            } catch(e) {
              t.name = 'Equipo Restaurado';
            }
          }
          return t;
        });

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

  // Load custom categories and settings when activeTeamId changes
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
    
    async function loadSettings() {
      if (!activeTeamId) return;
      try {
        const data = await db.getAppState(`settings_${activeTeamId}`);
        if (data) {
          setTeamSettings(data);
        } else {
          setTeamSettings({ crestUrl: '', defaultFormation: '4-3-3' });
        }
      } catch (e) {
        console.error('Error loading settings', e);
      }
    }
    
    loadCategories();
    loadSettings();
  }, [activeTeamId]);

  const updateCustomCategories = async (cats: string[]) => {
    setCustomCategories(cats);
    if (activeTeamId) {
      await db.saveAppState(`categories_${activeTeamId}`, cats);
    }
  };

  const updateTeamSettings = async (settings: TeamSettings) => {
    setTeamSettings(settings);
    if (activeTeamId) {
      await db.saveAppState(`settings_${activeTeamId}`, settings);
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

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    const t = teams.find(t => t.id === id);
    if (!t) return;
    Object.assign(t, updates);
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
      customCategories, updateCustomCategories,
      teamSettings, updateTeamSettings
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
