/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Loader2, PanelLeftClose, PanelLeftOpen, ChevronUp, ShieldCheck, Trophy, X } from 'lucide-react';
import { useSession } from './context/SessionContext';
import { supabase } from './services/supabase';
import { Login } from './components/Login';
import { AmBrandLogo } from './shared/ui/AmBrandLogo';
import { useTeam } from './context/TeamContext';
import {
  decodificarQaPayload,
  sincronizarPlantillaConQuintaAmarilla,
  fetchSancionesFromQuintaAmarilla,
} from './services/quintaAmarillaSync';
import {
  IconDashboard,
  IconPlanner,
  IconSquadJersey,
  IconWhistleCards,
  IconAnalytics,
  IconMatchDay,
  IconTacticalBoard,
  IconExerciseLibrary,
  IconMatchHistory,
  IconRivalsScouting,
  IconSettingsSliders,
} from './shared/ui/SectionIcons';

const TacticalBoard = React.lazy(() => import('./features/tactical-board/components/TacticalBoard').then(module => ({ default: module.TacticalBoard })));
const HomeScreen = React.lazy(() => import('./components/HomeScreen').then(module => ({ default: module.HomeScreen })));
const TeamManagement = React.lazy(() => import('./components/TeamManagement').then(module => ({ default: module.TeamManagement })));
const LibraryScreen = React.lazy(() => import('./components/LibraryScreen').then(module => ({ default: module.LibraryScreen })));
const SettingsScreen = React.lazy(() => import('./components/SettingsScreen').then(module => ({ default: module.SettingsScreen })));
const MatchDashboard = React.lazy(() => import('./components/MatchDashboard').then(module => ({ default: module.MatchDashboard })));
const MatchHistory = React.lazy(() => import('./components/MatchHistory').then(module => ({ default: module.MatchHistory })));
const PlayerStatistics = React.lazy(() => import('./components/PlayerStatistics').then(module => ({ default: module.PlayerStatistics })));
const TrainingPlanner = React.lazy(() => import('./components/TrainingPlanner').then(module => ({ default: module.TrainingPlanner })));
const FinesManagement = React.lazy(() => import('./components/FinesManagement').then(module => ({ default: module.FinesManagement })));
const RivalsScreen = React.lazy(() => import('./features/rivals/components/RivalsScreen').then(module => ({ default: module.RivalsScreen })));
const StandingsScreen = React.lazy(() => import('./features/rfaf/components/StandingsScreen').then(module => ({ default: module.StandingsScreen })));

export type AppView =
  | 'home'
  | 'tactics'
  | 'roster'
  | 'match'
  | 'standings'
  | 'calendar'
  | 'stats'
  | 'library'
  | 'history'
  | 'fines'
  | 'rivals'
  | 'settings';

const VIEW_LABELS: Record<AppView, string> = {
  home: 'Resumen General',
  calendar: 'Planificador de Sesiones',
  roster: 'Plantilla',
  fines: 'Régimen Interno',
  stats: 'Rendimiento y Métricas',
  match: 'Día de Partido',
  standings: 'Clasificación y Liga',
  tactics: 'Pizarra Táctica',
  library: 'Biblioteca de Ejercicios',
  history: 'Historial de Partidos',
  rivals: 'Directorio de Rivales',
  settings: 'Configuración',
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { sessionId } = useSession();
  const { teamSettings, teams, activeTeam, activeTeamId, selectTeam, updateTeamPlayers, updateTeamSettings } = useTeam();
  const [qaSyncToast, setQaSyncToast] = useState<{
    club: string;
    totalSanciones: number;
    blockedCount: number;
    unmatchedCount: number;
  } | null>(null);
  const qaProcessedRef = useRef(false);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Captura automática de ?qa_payload=... o ?qa_club=... desde QuintaAmarilla
  useEffect(() => {
    if (!isAuthenticated || !activeTeam || qaProcessedRef.current) return;
    const search = window.location.search;
    if (!search || (!search.includes('qa_club') && !search.includes('qa_payload'))) return;

    const params = new URLSearchParams(search);
    const qaClub = params.get('qa_club') || '';
    const qaRival = params.get('qa_rival') || '';
    const qaComp = params.get('qa_comp') || '';
    const qaGrupo = params.get('qa_grupo') || '';
    const qaJornada = params.get('qa_jornada') || '';
    const qaPayload = params.get('qa_payload') || '';

    if (!qaClub && !qaPayload) return;
    qaProcessedRef.current = true;

    // Limpiar los query params de la URL inmediatamente
    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState({}, document.title, cleanUrl);

    (async () => {
      try {
        let sanciones = qaPayload ? decodificarQaPayload(qaPayload) : [];
        if (sanciones.length === 0 && qaClub) {
          sanciones = await fetchSancionesFromQuintaAmarilla({
            clubRfaf: qaClub,
            competicion: qaComp,
            grupo: qaGrupo,
          });
        }

        const { updatedPlayers, unmatchedSanciones } = sincronizarPlantillaConQuintaAmarilla(
          activeTeam.players || [],
          sanciones
        );

        await updateTeamPlayers(updatedPlayers);
        await updateTeamSettings({
          rfafLink: {
            ...(teamSettings?.rfafLink || {}),
            competicion: qaComp || teamSettings?.rfafLink?.competicion || '',
            grupo: qaGrupo || teamSettings?.rfafLink?.grupo || '',
            clubRfaf: qaClub || teamSettings?.rfafLink?.clubRfaf || activeTeam.name,
            lastJornada: qaJornada || teamSettings?.rfafLink?.lastJornada || 'TODAS',
            lastSyncAt: new Date().toISOString(),
            unmatchedSanciones,
          },
        });

        try {
          sessionStorage.setItem(
            'am_open_callup_validator',
            JSON.stringify({
              club: qaClub || activeTeam.name,
              rival: qaRival,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore storage error
        }

        const blockedCount = updatedPlayers.filter(p => p && p.isActive !== false && p.isSuspended).length;
        setQaSyncToast({
          club: qaClub || activeTeam.name,
          totalSanciones: sanciones.length,
          blockedCount,
          unmatchedCount: unmatchedSanciones.length,
        });
        setActiveView('match');
      } catch (err) {
        console.error('[QuintaAmarilla] Error sincronizando convocatoria:', err);
      }
    })();
  }, [isAuthenticated, activeTeam, teamSettings?.rfafLink, updateTeamPlayers, updateTeamSettings]);

  if (isAuthenticated === null) {
    return (
      <div className="h-screen bg-[#07090E] flex flex-col items-center justify-center gap-6 p-6">
        <AmBrandLogo
          size="xl"
          showText={true}
          subtitle="Software Profesional de Gestión Táctica y Deportiva"
        />
        <div className="flex items-center gap-2 text-emerald-400/90 text-[12px] font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Iniciando entorno táctico...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const navItem = (
    view: AppView,
    label: string,
    IconComponent: React.FC<{ className?: string }>
  ) => {
    const isActive = activeView === view;
    return (
      <button
        key={view}
        onClick={() => setActiveView(view)}
        title={isSidebarCollapsed ? label : undefined}
        className={`w-full h-8 rounded-md flex items-center transition-colors text-[13px] ${
          isSidebarCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'
        } ${
          isActive
            ? 'bg-[#171717] text-[#EDEDED] font-medium border border-[#292929]'
            : 'text-[#888888] hover:text-[#EDEDED] hover:bg-[#0D0D0D] border border-transparent'
        }`}
      >
        <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EDEDED]' : 'text-[#777777]'}`} />
        {!isSidebarCollapsed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  return (
    <div className="h-screen bg-[#000000] text-[#EDEDED] font-sans flex flex-col overflow-hidden">
      {qaSyncToast && (
        <div className="fixed top-4 right-4 z-[200] max-w-md bg-[#0E1310] border border-emerald-500/40 text-[#EDEDED] px-4 py-3 rounded-lg shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-[12px]">
            <div className="font-semibold text-emerald-300">
              Sincronizado con QuintaAmarilla ({qaSyncToast.club})
            </div>
            <div className="text-[#A1A1AA] mt-0.5">
              {qaSyncToast.blockedCount} jugador(es) bloqueados por sanción ·{' '}
              {qaSyncToast.unmatchedCount > 0
                ? `${qaSyncToast.unmatchedCount} pendiente(s) de vincular en convocatoria`
                : 'Plantilla vinculada al 100%'}
            </div>
          </div>
          <button
            onClick={() => setQaSyncToast(null)}
            className="text-[#737373] hover:text-white p-1 rounded"
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Fixed Full-Width Bar — Permanent Invariable Toggle & Prominent Crest */}
      <header className="h-14 px-3 sm:px-4 border-b border-[#1F1F1F] flex items-center justify-between bg-[#000000]/95 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Permanent Invariable Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="hidden md:flex p-2 rounded-md text-[#71717A] hover:text-[#EDEDED] hover:bg-[#141416] border border-transparent hover:border-[#27272A] transition-colors items-center justify-center shrink-0 cursor-pointer"
            title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            aria-label="Alternar barra lateral"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4.5 h-4.5" />
            ) : (
              <PanelLeftClose className="w-4.5 h-4.5" />
            )}
          </button>

          {/* AM Manager Official App Brand (Fixed Platform Identity) */}
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2.5 min-w-0 group text-left cursor-pointer"
            title="Ir al Inicio — AM Manager"
          >
            <AmBrandLogo size="sm" showText={false} />
            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] font-bold text-[#EDEDED] tracking-tight truncate">
                AM Manager
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 leading-none">
                PRO
              </span>
            </div>
          </button>

          <span className="text-[#333333] text-sm font-light select-none">/</span>

          {/* Active Team Switcher with Club Crest (activeTeam.logo / teamSettings.crestUrl) */}
          <div className="relative flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#121212] border border-[#242424] rounded-md pl-2 pr-1 h-8 transition-colors">
            <div className="w-5 h-5 rounded bg-[#141414] border border-[#2A2A2A] flex items-center justify-center shrink-0 overflow-hidden">
              {activeTeam?.crestUrl || teamSettings?.crestUrl ? (
                <img
                  src={activeTeam?.crestUrl || teamSettings?.crestUrl}
                  alt={activeTeam?.name || 'Club'}
                  className="w-4 h-4 object-contain"
                />
              ) : (
                <span className="text-[9px] font-mono font-bold text-emerald-400">
                  {(activeTeam?.name || 'CL').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <select
              value={activeTeamId || ''}
              onChange={(e) => selectTeam(e.target.value)}
              aria-label="Seleccionar equipo activo"
              className="appearance-none bg-transparent text-[#EDEDED] text-[13px] font-medium pr-6 h-full focus:outline-none cursor-pointer truncate max-w-[140px] sm:max-w-[210px]"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-[#0A0A0A] text-[#EDEDED]">
                  {t.name} ({t.modality})
                </option>
              ))}
            </select>
            <ChevronUp className="w-3.5 h-3.5 text-[#666666] pointer-events-none absolute right-2 rotate-180" />
          </div>

          <span className="text-[#333333] text-sm font-light select-none">/</span>

          <span className="text-[13px] font-medium text-[#EDEDED] truncate">
            {VIEW_LABELS[activeView]}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTeam && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-[#888888] px-2 py-1 rounded border border-[#1F1F1F] bg-[#0A0A0A]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeTeam.modality}
            </span>
          )}
          {activeView !== 'tactics' && (
            <button
              onClick={() => setActiveView('tactics')}
              className="h-8 px-3 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <IconTacticalBoard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abrir Pizarra</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container below Topbar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar — Geist / Vercel Architecture */}
        <aside
          className={`hidden md:flex flex-col bg-[#000000] border-r border-[#1F1F1F] shrink-0 z-20 h-full transition-all duration-150 ${
            isSidebarCollapsed ? 'w-[64px]' : 'w-[228px]'
          }`}
        >
          {/* Navigation Groups */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-4 space-y-5">
            <div className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#555555]">
                  Espacio de Trabajo
                </div>
              )}
              {navItem('home', 'Resumen', IconDashboard)}
              {navItem('calendar', 'Planificador', IconPlanner)}
            </div>

            <div className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#555555]">
                  Dirección de Equipo
                </div>
              )}
              {navItem('roster', 'Plantilla', IconSquadJersey)}
              {navItem('stats', 'Rendimiento', IconAnalytics)}
              {navItem('fines', 'Régimen Interno', IconWhistleCards)}
            </div>

            <div className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#555555]">
                  Táctica y Competición
                </div>
              )}
              {navItem('match', 'Día de Partido', IconMatchDay)}
              {navItem('standings', 'Clasificación', Trophy)}
              {navItem('tactics', 'Pizarra Táctica', IconTacticalBoard)}
              {navItem('library', 'Biblioteca', IconExerciseLibrary)}
              {navItem('history', 'Historial', IconMatchHistory)}
              {navItem('rivals', 'Rivales & Scouting', IconRivalsScouting)}
            </div>
          </nav>

          {/* Footer Settings */}
          <div className="p-2.5 border-t border-[#1F1F1F] shrink-0">
            {navItem('settings', 'Configuración', IconSettingsSliders)}
          </div>
        </aside>

        {/* Main Content Column */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-14 md:pb-0 bg-[#000000]">
          {/* Dynamic View Viewport */}
          <div
            className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col custom-scrollbar ${
              activeView === 'tactics' ? 'p-0' : 'p-4 sm:p-6 lg:p-8'
            }`}
          >
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#888888]" />
              </div>
            }
          >
            {activeView === 'home' && <HomeScreen onNavigate={setActiveView} />}
            {activeView === 'tactics' && (
              <div className="w-full h-full flex-1 flex">
                <TacticalBoard key={sessionId} />
              </div>
            )}
            {activeView === 'roster' && <TeamManagement />}
            {activeView === 'fines' && <FinesManagement />}
            {activeView === 'settings' && <SettingsScreen />}
            {activeView === 'match' && <MatchDashboard onNavigate={setActiveView} />}
            {activeView === 'standings' && <StandingsScreen />}
            {activeView === 'history' && <MatchHistory onNavigate={setActiveView} />}
            {activeView === 'rivals' && <RivalsScreen />}
            {activeView === 'stats' && <PlayerStatistics />}
            {activeView === 'library' && <LibraryScreen onNavigate={setActiveView} />}
            {activeView === 'calendar' && <TrainingPlanner />}
          </Suspense>
        </div>
      </main>
    </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#000000]/95 backdrop-blur-md border-t border-[#1F1F1F] z-50 flex items-center justify-start sm:justify-around overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 py-1.5 pb-safe gap-1">
        {(
          [
            ['home', 'Inicio', IconDashboard],
            ['match', 'Partido', IconMatchDay],
            ['standings', 'Clasif.', Trophy],
            ['calendar', 'Agenda', IconPlanner],
            ['roster', 'Plantilla', IconSquadJersey],
            ['tactics', 'Pizarra', IconTacticalBoard],
            ['rivals', 'Rivales', IconRivalsScouting],
            ['history', 'Historial', IconMatchHistory],
            ['stats', 'Stats', IconAnalytics],
            ['library', 'Biblioteca', IconExerciseLibrary],
            ['fines', 'Multas', IconWhistleCards],
            ['settings', 'Ajustes', IconSettingsSliders],
          ] as [AppView, string, React.FC<{ className?: string }>][]
        ).map(([view, label, IconComp]) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-2.5 py-1.5 min-w-[58px] shrink-0 rounded-md flex flex-col items-center gap-1 transition-colors ${
              activeView === view ? 'text-[#EDEDED] bg-[#141414]' : 'text-[#666666]'
            }`}
          >
            <IconComp className="w-4 h-4" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
