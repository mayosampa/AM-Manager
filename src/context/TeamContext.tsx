import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Team, Player, Fine } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';

export const DEFAULT_CATEGORIES = ['Calentamiento', 'Posesión', 'Transiciones', 'Ataque', 'Defensa', 'Táctica', 'Partidos'];

/**
 * Ajustes del club. NO existen como columnas de `teams`: se persisten en el JSON de
 * `season_plan` bajo la clave `settings_<teamId>` y se hidratan en `activeTeam`.
 */
export interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
  homeStadium?: string;
  whatsappTemplate?: string;
  exerciseCategories?: string[];
}

const DEFAULT_SETTINGS: TeamSettings = { crestUrl: '', defaultFormation: '4-3-3' };
const settingsKey = (teamId: string) => `settings_${teamId}`;
const legacyCategoriesKey = (teamId: string) => `categories_${teamId}`;

interface TeamContextType {
  teams: Team[];
  activeTeamId: string;
  activeTeam: Team | undefined;
  createTeam: (name: string, modality: 'F7' | 'F11') => Promise<void>;
  selectTeam: (id: string) => void;
  updateTeamPlayers: (players: Player[]) => Promise<void>;
  updateTeamCallUp: (playerIds: string[]) => Promise<void>;
  updateTeamFines: (fines: Fine[]) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  customCategories: string[];
  updateCustomCategories: (cats: string[]) => Promise<void>;
  teamSettings: TeamSettings;
  updateTeamSettings: (settings: Partial<TeamSettings>) => Promise<void>;
  /** Último error de sincronización con Supabase (null si no hay). */
  syncError: string | null;
  clearSyncError: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface LoadedSettings { teamId: string; settings: TeamSettings }

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeamsState] = useState<Team[]>([]);
  const teamsRef = useRef<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [settingsState, setSettingsState] = useState<LoadedSettings | null>(null);
  const settingsRef = useRef<LoadedSettings | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  // El ref se actualiza en el mismo tick que el estado: evita closures obsoletas entre guardados seguidos.
  const commitTeams = useCallback((next: Team[]) => {
    teamsRef.current = next;
    setTeamsState(next);
  }, []);

  const commitSettings = useCallback((next: LoadedSettings | null) => {
    settingsRef.current = next;
    setSettingsState(next);
  }, []);

  const reportError = useCallback((message: string, error: unknown) => {
    console.error(message, error);
    setSyncError(message);
  }, []);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  // Carga de equipos: solo con sesión activa (RLS devuelve [] a anónimos y eso NO debe crear un equipo por defecto).
  useEffect(() => {
    async function loadTeams() {
      try {
        const loaded = await db.getTeams();

        // Saneamiento de datos legacy: si un updateTeam antiguo machacó el nombre con un objeto JSON.
        const sanitized = loaded.map(t => {
          if (typeof t.name === 'object' || (typeof t.name === 'string' && t.name.startsWith('{'))) {
            let restored: Team = { ...t, name: 'Equipo Restaurado' };
            try {
              const parsed = typeof t.name === 'string' ? JSON.parse(t.name) : (t.name as any);
              if (parsed.activeCallUp) restored = { ...restored, activeCallUp: parsed.activeCallUp };
              if (parsed.whatsappTemplate) {
                const key = settingsKey(t.id);
                db.getAppState(key)
                  .then(current => db.saveAppState(key, { ...DEFAULT_SETTINGS, ...(current || {}), whatsappTemplate: parsed.whatsappTemplate }))
                  .catch(console.error);
              }
            } catch (e) {
              // nombre irrecuperable: se queda como 'Equipo Restaurado'
            }
            db.saveTeam(restored).catch(console.error);
            return restored;
          }
          return t;
        });

        if (sanitized.length > 0) {
          commitTeams(sanitized);
          setActiveTeamId(sanitized[0].id);
        } else {
          const defaultTeam: Team = {
            id: 'team-1',
            name: 'Mi Equipo',
            modality: 'F11',
            players: []
          };
          await db.saveTeam(defaultTeam);
          commitTeams([defaultTeam]);
          setActiveTeamId(defaultTeam.id);
        }
      } catch (e) {
        loadedUserIdRef.current = null;
        reportError('No se pudieron cargar los equipos desde Supabase.', e);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (!userId) {
        // Logout: limpiar todo para no filtrar datos del club a la siguiente sesión.
        loadedUserIdRef.current = null;
        commitTeams([]);
        commitSettings(null);
        setActiveTeamId('');
        return;
      }
      // Los eventos de refresco de token / re-validación no deben recargar los equipos.
      if (loadedUserIdRef.current === userId) return;
      loadedUserIdRef.current = userId;
      // Diferido: supabase-js recomienda no hacer llamadas al cliente dentro del propio callback.
      setTimeout(loadTeams, 0);
    });

    return () => subscription.unsubscribe();
  }, [commitTeams, commitSettings, reportError]);

  // Ajustes del club (escudo, estadio, plantilla WhatsApp, categorías) al cambiar de equipo.
  useEffect(() => {
    if (!activeTeamId) return;
    let cancelled = false;
    async function loadSettings() {
      try {
        const [stored, legacyCategories] = await Promise.all([
          db.getAppState(settingsKey(activeTeamId)),
          db.getAppState(legacyCategoriesKey(activeTeamId)),
        ]);
        if (cancelled) return;
        const merged: TeamSettings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
        // Migración lazy: las categorías antiguas vivían en `categories_<teamId>`.
        if (!(merged.exerciseCategories && merged.exerciseCategories.length > 0)
            && Array.isArray(legacyCategories) && legacyCategories.length > 0) {
          merged.exerciseCategories = legacyCategories;
        }
        commitSettings({ teamId: activeTeamId, settings: merged });
      } catch (e) {
        if (!cancelled) reportError('No se pudieron cargar los ajustes del equipo.', e);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, [activeTeamId, commitSettings, reportError]);

  /** Ajustes más recientes del equipo. Síncrono si ya están en memoria (evita carreras entre guardados seguidos). */
  const readSettings = (teamId: string): TeamSettings | Promise<TeamSettings> => {
    const loaded = settingsRef.current;
    if (loaded && loaded.teamId === teamId) return loaded.settings;
    return db.getAppState(settingsKey(teamId)).then(stored => ({ ...DEFAULT_SETTINGS, ...(stored || {}) }));
  };

  const writeSettings = async (teamId: string, patch: Partial<TeamSettings>) => {
    const resolved = readSettings(teamId);
    const current = resolved instanceof Promise ? await resolved : resolved;
    const next: TeamSettings = { ...current, ...patch };
    const isLoadedTeam = settingsRef.current?.teamId === teamId || teamId === activeTeamId;
    if (isLoadedTeam) commitSettings({ teamId, settings: next });
    try {
      await db.saveAppState(settingsKey(teamId), next);
    } catch (e) {
      if (isLoadedTeam) commitSettings({ teamId, settings: current });
      reportError('No se pudieron guardar los ajustes del equipo. Los cambios no se han guardado.', e);
      throw e;
    }
  };

  /** Actualiza inmutablemente un equipo, persiste en `teams` y revierte si Supabase falla. */
  const persistTeam = async (teamId: string, mutate: (team: Team) => Team) => {
    const current = teamsRef.current.find(t => t.id === teamId);
    if (!current) return;
    const next = mutate(current);
    commitTeams(teamsRef.current.map(t => (t.id === teamId ? next : t)));
    try {
      await db.saveTeam(next);
    } catch (e) {
      commitTeams(teamsRef.current.map(t => (t.id === teamId ? current : t)));
      reportError('No se pudieron guardar los cambios del equipo. Los cambios no se han guardado.', e);
      throw e;
    }
  };

  const updateCustomCategories = async (cats: string[]) => {
    if (!activeTeamId) return;
    await writeSettings(activeTeamId, { exerciseCategories: cats });
  };

  const updateTeamSettings = async (settings: Partial<TeamSettings>) => {
    if (!activeTeamId) return;
    await writeSettings(activeTeamId, settings);
  };

  const createTeam = async (name: string, modality: 'F7' | 'F11') => {
    const newTeam: Team = {
      id: Math.random().toString(36).slice(2, 11),
      name,
      modality,
      players: []
    };
    try {
      await db.saveTeam(newTeam);
    } catch (e) {
      reportError('No se pudo crear el equipo.', e);
      throw e;
    }
    commitTeams([...teamsRef.current, newTeam]);
    setActiveTeamId(newTeam.id);
  };

  const selectTeam = (id: string) => {
    if (teamsRef.current.find(t => t.id === id)) {
      setActiveTeamId(id);
    }
  };

  const updateTeamPlayers = (players: Player[]) =>
    persistTeam(activeTeamId, t => ({ ...t, players }));

  const updateTeamCallUp = (playerIds: string[]) =>
    persistTeam(activeTeamId, t => ({ ...t, activeCallUp: playerIds }));

  const updateTeamFines = (fines: Fine[]) =>
    persistTeam(activeTeamId, t => ({ ...t, fines }));

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    // Los campos de ajustes viven en season_plan; el resto en la tabla teams.
    const { crestUrl, defaultFormation, homeStadium, whatsappTemplate, exerciseCategories, ...teamPatch } = updates;

    const settingsPatch: Partial<TeamSettings> = {};
    if (crestUrl !== undefined) settingsPatch.crestUrl = crestUrl;
    if (defaultFormation !== undefined) settingsPatch.defaultFormation = defaultFormation;
    if (homeStadium !== undefined) settingsPatch.homeStadium = homeStadium;
    if (whatsappTemplate !== undefined) settingsPatch.whatsappTemplate = whatsappTemplate;
    if (exerciseCategories !== undefined) settingsPatch.exerciseCategories = exerciseCategories;

    if (Object.keys(teamPatch).length > 0) {
      await persistTeam(id, t => ({ ...t, ...teamPatch, id: t.id }));
    }
    if (Object.keys(settingsPatch).length > 0) {
      await writeSettings(id, settingsPatch);
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await db.deleteTeam(id);
    } catch (e) {
      reportError('No se pudo eliminar el equipo.', e);
      throw e;
    }
    const remaining = teamsRef.current.filter(t => t.id !== id);
    commitTeams(remaining);
    if (activeTeamId === id) {
      setActiveTeamId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const teamSettings: TeamSettings =
    settingsState && settingsState.teamId === activeTeamId ? settingsState.settings : DEFAULT_SETTINGS;

  const customCategories: string[] =
    teamSettings.exerciseCategories && teamSettings.exerciseCategories.length > 0
      ? teamSettings.exerciseCategories
      : DEFAULT_CATEGORIES;

  // activeTeam = fila de `teams` + ajustes hidratados (crestUrl, homeStadium, whatsappTemplate...).
  const activeTeam = useMemo<Team | undefined>(() => {
    const base = teams.find(t => t.id === activeTeamId);
    if (!base) return undefined;
    return {
      ...base,
      crestUrl: teamSettings.crestUrl || undefined,
      defaultFormation: teamSettings.defaultFormation,
      homeStadium: teamSettings.homeStadium,
      whatsappTemplate: teamSettings.whatsappTemplate,
      exerciseCategories: customCategories,
    };
  }, [teams, activeTeamId, teamSettings, customCategories]);

  return (
    <TeamContext.Provider value={{ 
      teams, activeTeamId, activeTeam, 
      createTeam, selectTeam, updateTeamPlayers, 
      updateTeamCallUp, updateTeamFines, updateTeam, deleteTeam,
      customCategories, updateCustomCategories,
      teamSettings, updateTeamSettings,
      syncError, clearSyncError
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
