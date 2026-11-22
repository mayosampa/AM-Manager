/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Loader2, PanelLeftClose, PanelLeftOpen, ChevronUp, ShieldCheck, Trophy, X, LogOut, AlertTriangle, ClipboardList } from 'lucide-react';
import { useSession } from './context/SessionContext';
import { supabase } from './services/supabase';
import { performCleanLogout } from './services/authSession';
import { getLocalTodayDateString } from './services/matchSync';
import { sanitizeImageSrc } from './shared/utils/urlSanitizer';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { RegisterPage } from './components/RegisterPage';
import { AmBrandLogo } from './shared/ui/AmBrandLogo';
import { AmWatermark } from './shared/ui/AmWatermark';
import { PasswordRecoveryModal } from './features/auth/components/PasswordRecoveryModal';
import { CookieConsentBanner } from './features/legal/components/CookieConsentBanner';
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
const SessionPreparationScreen = React.lazy(() => import('./components/planner/SessionPreparationScreen').then(module => ({ default: module.SessionPreparationScreen })));
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
  | 'session-prep'
  | 'stats'
  | 'library'
  | 'history'
  | 'fines'
  | 'rivals'
  | 'settings';

const VIEW_LABELS: Record<AppView, string> = {
  home: 'Resumen General',
  calendar: 'Planificador de Sesiones',
  'session-prep': 'Preparación de Sesiones',
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

type UnauthView = 'landing' | 'login' | 'register';

function resolveInitialUnauthView(): UnauthView {
  try {
    const cleanPath = (window.location.pathname || '/').replace(/\/+$/, '').toLowerCase() || '/';
    if (cleanPath === '/registro' || cleanPath === '/register') return 'register';
    if (cleanPath === '/login') return 'login';
  } catch {
    // ignore
  }
  return 'landing';
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedSessionDateKey, setSelectedSessionDateKey] = useState<string>(() => getLocalTodayDateString());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { sessionId } = useSession();
  const { teamSettings, teams, activeTeam, activeTeamId, selectTeam, updateTeamPlayers, updateTeamSettings, syncError, clearSyncError } = useTeam();
  const [qaSyncToast, setQaSyncToast] = useState<{
    club: string;
    totalSanciones: number;
    blockedCount: number;
    unmatchedCount: number;
  } | null>(null);
  const qaProcessedRef = useRef(false);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [unauthView, setUnauthView] = useState<UnauthView>(() => resolveInitialUnauthView());
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  const navigateUnauthView = (next: UnauthView) => {
    setUnauthView(next);
    try {
      if (!window.location.search && !window.location.hash) {
        const nextPath = next === 'register' ? '/registro' : next === 'login' ? '/login' : '/';
        if (window.location.pathname !== nextPath) {
          window.history.replaceState({}, document.title, nextPath);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        try {
          const cleanPath = (window.location.pathname || '/').replace(/\/+$/, '').toLowerCase();
          if ((cleanPath === '/registro' || cleanPath === '/register' || cleanPath === '/login') && !window.location.search && !window.location.hash) {
            window.history.replaceState({}, document.title, '/');
          }
        } catch {
          // ignore
        }
      }
      if (event === 'SIGNED_OUT') {
        setUnauthView('landing');
      }
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordRecovery(true);
      }
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
      <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-6 p-6">
        <AmBrandLogo
          variant="light"
          size="xl"
          showText={true}
          subtitle="Software Profesional de Gestión Táctica y Deportiva"
        />
        <div className="flex items-center gap-2 text-emerald-700 text-[12px] font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
          <span>Iniciando entorno táctico...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (unauthView === 'register') {
      return (
        <RegisterPage
          onBackToLanding={() => navigateUnauthView('landing')}
          onGoToLogin={() => navigateUnauthView('login')}
        />
      );
    }
    if (unauthView === 'login') {
      return (
        <Login
          onBackToLanding={() => navigateUnauthView('landing')}
          onGoToRegister={() => navigateUnauthView('register')}
        />
      );
    }
    return (
      <LandingPage
        onLogin={() => navigateUnauthView('login')}
        onRegister={() => navigateUnauthView('register')}
      />
    );
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
        className={`w-full h-8 rounded-md flex items-center transition-colors text-[13px] cursor-pointer ${
          isSidebarCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'
        } ${
          isActive
            ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
        }`}
      >
        <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#059669]' : 'text-slate-400'}`} />
        {!isSidebarCollapsed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col overflow-hidden">
      {qaSyncToast && (
        <div className="fixed top-4 right-4 z-[200] max-w-md bg-white border border-emerald-200 text-slate-900 px-4 py-3 rounded-lg shadow-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-[12px]">
            <div className="font-semibold text-emerald-800">
              Sincronizado con QuintaAmarilla ({qaSyncToast.club})
            </div>
            <div className="text-slate-600 mt-0.5">
              {qaSyncToast.blockedCount} jugador(es) bloqueados por sanción ·{' '}
              {qaSyncToast.unmatchedCount > 0
                ? `${qaSyncToast.unmatchedCount} pendiente(s) de vincular en convocatoria`
                : 'Plantilla vinculada al 100%'}
            </div>
          </div>
          <button
            onClick={() => setQaSyncToast(null)}
            className="text-slate-400 hover:text-slate-900 p-1 rounded cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {syncError && (
        <div role="alert" className="fixed top-16 right-4 z-[200] max-w-md bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg shadow-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-[12px]">
            <div className="font-semibold text-red-800">Error de sincronización</div>
            <div className="text-red-700 mt-0.5">{syncError}</div>
          </div>
          <button
            type="button"
            onClick={clearSyncError}
            className="text-red-400 hover:text-red-700 p-1 rounded cursor-pointer"
            aria-label="Cerrar error de sincronización"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeView === 'tactics' ? (
        <div className="fixed inset-0 z-40 w-screen h-[100dvh] flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
              </div>
            }
          >
            <TacticalBoard key={sessionId} onExit={() => setActiveView('home')} />
          </Suspense>
        </div>
      ) : (
        <>
          {/* Top Fixed Full-Width Bar — QuintaAmarilla Editorial Light */}
          <header className="h-14 px-3 sm:px-4 border-b border-slate-200 flex items-center justify-between bg-white/95 backdrop-blur-sm z-30 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Permanent Invariable Sidebar Toggle Button */}
              <button
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                className="hidden md:flex p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors items-center justify-center shrink-0 cursor-pointer"
                title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                aria-label="Alternar barra lateral"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4.5 h-4.5" />
                ) : (
                  <PanelLeftClose className="w-4.5 h-4.5" />
                )}
              </button>

              {/* AM Manager Official App Brand */}
              <button
                onClick={() => setActiveView('home')}
                className="flex items-center gap-2.5 min-w-0 group text-left cursor-pointer"
                title="Ir al Inicio — AM Manager"
              >
                <AmBrandLogo variant="light" size="sm" showText={false} />
                <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-extrabold text-slate-900 tracking-tight truncate">
                    AM Manager
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 leading-none">
                    PRO
                  </span>
                </div>
              </button>

              <span className="text-slate-300 text-sm font-light select-none">/</span>

              {/* Active Team Switcher with Club Crest */}
              <div className="relative flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md pl-2 pr-1 h-8 transition-colors">
                <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {sanitizeImageSrc(activeTeam?.crestUrl || teamSettings?.crestUrl) ? (
                    <img
                      src={sanitizeImageSrc(activeTeam?.crestUrl || teamSettings?.crestUrl)!}
                      alt={activeTeam?.name || 'Club'}
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-[#059669]">
                      {(activeTeam?.name || 'CL').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <select
                  value={activeTeamId || ''}
                  onChange={(e) => selectTeam(e.target.value)}
                  aria-label="Seleccionar equipo activo"
                  className="appearance-none bg-transparent text-slate-900 text-[13px] font-semibold pr-6 h-full focus:outline-none cursor-pointer truncate max-w-[140px] sm:max-w-[210px]"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id} className="bg-white text-slate-900">
                      {t.name} ({t.modality})
                    </option>
                  ))}
                </select>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 rotate-180" />
              </div>

              <span className="text-slate-300 text-sm font-light select-none">/</span>

              <span className="text-[13px] font-semibold text-slate-700 truncate">
                {VIEW_LABELS[activeView]}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {activeTeam && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-700 px-2 py-1 rounded border border-emerald-200 bg-emerald-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  {activeTeam.modality}
                </span>
              )}
              <button
                onClick={() => setActiveView('tactics')}
                className="h-8 px-3 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-[12px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <IconTacticalBoard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir Pizarra</span>
              </button>
              <button
                type="button"
                onClick={() => void performCleanLogout()}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="md:hidden h-8 w-8 rounded-md bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Main Container below Topbar */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Desktop Sidebar — Light Editorial */}
            <aside
              className={`hidden md:flex flex-col bg-white border-r border-slate-200 shrink-0 z-20 h-full transition-all duration-150 ${
                isSidebarCollapsed ? 'w-[64px]' : 'w-[228px]'
              }`}
            >
              {/* Navigation Groups */}
              <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-4 space-y-5">
                <div className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="px-2.5 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                      Espacio de Trabajo
                    </div>
                  )}
                  {navItem('home', 'Resumen', IconDashboard)}
                  {navItem('calendar', 'Planificador', IconPlanner)}
                  {navItem('session-prep', 'Preparación de Sesiones', ClipboardList)}
                </div>

                <div className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="px-2.5 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                      Dirección de Equipo
                    </div>
                  )}
                  {navItem('roster', 'Plantilla', IconSquadJersey)}
                  {navItem('stats', 'Rendimiento', IconAnalytics)}
                  {navItem('fines', 'Régimen Interno', IconWhistleCards)}
                </div>

                <div className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="px-2.5 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
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

              {/* Footer Settings & Clean Logout */}
              <div className="p-2.5 border-t border-slate-200 shrink-0 space-y-1">
                {navItem('settings', 'Configuración', IconSettingsSliders)}
                <button
                  type="button"
                  onClick={() => void performCleanLogout()}
                  title={isSidebarCollapsed ? 'Cerrar Sesión' : undefined}
                  className={`w-full h-8 rounded-md flex items-center transition-colors text-[13px] text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent cursor-pointer ${
                    isSidebarCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'
                  }`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Cerrar Sesión</span>}
                </button>
              </div>
            </aside>

            {/* Main Content Column */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-14 md:pb-0 bg-[#F8FAFC]">
              {/* Marca de agua gigante y sutil en el fondo de las vistas principales */}
              <div className="pointer-events-none select-none absolute -right-12 bottom-4 z-0 overflow-hidden">
                <AmWatermark className="w-[420px] h-[420px] opacity-[0.035] text-slate-900" />
              </div>

              {/* Dynamic View Viewport */}
              <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden flex flex-col custom-scrollbar am-editorial-light p-4 sm:p-6 lg:p-8">
                <Suspense
                  fallback={
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
                    </div>
                  }
                >
                  {activeView === 'home' && <HomeScreen onNavigate={setActiveView} />}
                  {activeView === 'roster' && <TeamManagement />}
                  {activeView === 'fines' && <FinesManagement />}
                  {activeView === 'settings' && <SettingsScreen />}
                  {activeView === 'match' && <MatchDashboard onNavigate={setActiveView} />}
                  {activeView === 'standings' && <StandingsScreen />}
                  {activeView === 'history' && <MatchHistory onNavigate={setActiveView} />}
                  {activeView === 'rivals' && <RivalsScreen />}
                  {activeView === 'stats' && <PlayerStatistics />}
                  {activeView === 'library' && <LibraryScreen onNavigate={setActiveView} />}
                  {activeView === 'calendar' && (
                    <TrainingPlanner
                      onOpenSessionPrep={(dateKey) => {
                        setSelectedSessionDateKey(dateKey);
                        setActiveView('session-prep');
                      }}
                      onOpenMatchHub={(dateKey) => {
                        try {
                          sessionStorage.setItem('am_selected_match_date', dateKey);
                        } catch {
                          // ignore
                        }
                        setActiveView('match');
                      }}
                    />
                  )}
                  {activeView === 'session-prep' && (
                    <SessionPreparationScreen
                      selectedDateKey={selectedSessionDateKey}
                      onChangeDateKey={setSelectedSessionDateKey}
                      onBackToCalendar={() => setActiveView('calendar')}
                    />
                  )}
                </Suspense>
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 flex items-center justify-start sm:justify-around overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 py-1.5 pb-safe gap-1">
            {(
              [
                ['home', 'Inicio', IconDashboard],
                ['match', 'Partido', IconMatchDay],
                ['standings', 'Clasif.', Trophy],
                ['calendar', 'Agenda', IconPlanner],
                ['session-prep', 'Sesión', ClipboardList],
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
                  activeView === view ? 'text-[#059669] bg-emerald-50 font-semibold' : 'text-slate-500'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      <PasswordRecoveryModal isOpen={showPasswordRecovery} onComplete={() => setShowPasswordRecovery(false)} />
      <CookieConsentBanner />
    </div>
  );
}
