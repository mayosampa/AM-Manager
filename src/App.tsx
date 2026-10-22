/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, PanelLeftClose, PanelLeftOpen, ChevronUp } from 'lucide-react';
import { useSession } from './context/SessionContext';
import { supabase } from './services/supabase';
import { Login } from './components/Login';
import { useTeam } from './context/TeamContext';
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

export type AppView =
  | 'home'
  | 'tactics'
  | 'roster'
  | 'match'
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
  const { teamSettings, teams, activeTeam, activeTeamId, selectTeam } = useTeam();

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

  if (isAuthenticated === null) {
    return (
      <div className="h-screen bg-[#000000] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#EDEDED]" />
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

          {/* Club Crest & Brand — Prominent w-10 h-10 (40px) */}
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2.5 min-w-0 group text-left cursor-pointer"
            title="Ir al Inicio"
          >
            <div className="w-10 h-10 rounded-lg border border-[#282828] bg-[#0D0D0D] flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:border-[#444444] transition-colors">
              {teamSettings?.crestUrl ? (
                <img src={teamSettings.crestUrl} alt="Club" className="w-9 h-9 object-contain" />
              ) : (
                <span className="text-xs font-mono font-bold text-[#EDEDED]">AM</span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] font-bold text-[#EDEDED] tracking-tight truncate">
                AM Manager
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#111111] border border-[#242424] text-[#888888]">
                PRO
              </span>
            </div>
          </button>

          <span className="text-[#333333] text-sm font-light select-none">/</span>

          {/* Active Team Switcher in Breadcrumb */}
          <div className="relative flex items-center">
            <select
              value={activeTeamId || ''}
              onChange={(e) => selectTeam(e.target.value)}
              aria-label="Seleccionar equipo activo"
              className="appearance-none bg-[#0A0A0A] hover:bg-[#121212] border border-[#242424] text-[#EDEDED] text-[13px] font-medium pl-2.5 pr-7 h-8 rounded-md focus:outline-none focus:border-[#444444] transition-colors cursor-pointer truncate max-w-[150px] sm:max-w-[220px]"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
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
