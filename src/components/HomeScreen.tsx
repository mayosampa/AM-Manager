import { useState, useEffect, Suspense, lazy } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  HeartPulse,
  MapPin,
  Plus,
  X,
} from 'lucide-react';
import { useSession, TrainingCategory } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import { MatchRecord } from '../types';
import { cacheService } from '../services/cacheService';
import { isActiveRoster, isCallable } from '../features/squad/domain/availability';

const TeamsAdminModal = lazy(() => import('./TeamsAdminModal').then(m => ({ default: m.TeamsAdminModal })));
import {
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
} from '../shared/ui/SectionIcons';

interface Props {
  onNavigate: (
    view:
      | 'home'
      | 'tactics'
      | 'roster'
      | 'match'
      | 'calendar'
      | 'stats'
      | 'history'
      | 'library'
      | 'rivals'
      | 'fines'
      | 'settings'
  ) => void;
}

export function HomeScreen({ onNavigate }: Props) {
  const { startMatchSession, startTrainingSession, savedExercises } = useSession();
  const { teams, activeTeamId, activeTeam, selectTeam, createTeam } = useTeam();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showTeamsAdminModal, setShowTeamsAdminModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState<{ name: string; modality: 'F7' | 'F11' }>({
    name: '',
    modality: 'F11',
  });
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(() =>
    activeTeamId ? cacheService.get<MatchRecord[]>(`matches_${activeTeamId}`, []) : []
  );

  useEffect(() => {
    if (activeTeamId) {
      import('../services/db').then(({ db }) => {
        db.getMatches(activeTeamId).then(matches => setMatchHistory(matches));
      });
    } else {
      setMatchHistory([]);
    }
  }, [activeTeamId]);

  const handleCreateTeam = () => {
    if (!newTeamForm.name) return;
    createTeam(newTeamForm.name, newTeamForm.modality);
    setShowNewTeamModal(false);
    setNewTeamForm({ name: '', modality: 'F11' });
  };

  const handleStartMatch = () => {
    startMatchSession();
    setShowSessionModal(false);
    onNavigate('tactics');
  };

  const handleStartTraining = (category: TrainingCategory) => {
    startTrainingSession(category);
    setShowSessionModal(false);
    onNavigate('tactics');
  };

  const modules = [
    {
      id: 'tactics' as const,
      title: 'Pizarra Táctica',
      desc: 'Lienzo interactivo para jugadas, animaciones y exportación PDF con notas.',
      icon: IconTacticalBoard,
      meta: 'Modo estudio',
    },
    {
      id: 'calendar' as const,
      title: 'Planificador',
      desc: 'Estructura microciclos semanales, hojas de sesión y control de asistencia.',
      icon: IconPlanner,
      meta: 'Microciclo',
    },
    {
      id: 'match' as const,
      title: 'Día de Partido',
      desc: 'Convocatorias, alineación titular y cronómetro de acciones en directo.',
      icon: IconMatchDay,
      meta: 'Match Hub',
    },
    {
      id: 'roster' as const,
      title: 'Plantilla',
      desc: 'Fichas técnicas, disponibilidad médica, sanciones y dorsales.',
      icon: IconSquadJersey,
      meta: `${activeTeam ? activeTeam.players.filter(isActiveRoster).length : 0} activos`,
    },
    {
      id: 'library' as const,
      title: 'Biblioteca de Tareas',
      desc: 'Catálogo de ejercicios clasificados por objetivos tácticos y duración.',
      icon: IconExerciseLibrary,
      meta: `${savedExercises.length} tareas`,
    },
    {
      id: 'rivals' as const,
      title: 'Rivales & Scouting',
      desc: 'Informes tácticos de equipos de la liga, jugadores clave y debilidades.',
      icon: IconRivalsScouting,
      meta: 'Análisis',
    },
  ];

  const recentMatches = [...matchHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getComputedResult = (m: MatchRecord) => {
    if (m.matchResult) return m.matchResult;
    if (m.condition === 'Local') {
      if (m.score.home > m.score.away) return 'Victoria';
      if (m.score.home < m.score.away) return 'Derrota';
      return 'Empate';
    } else if (m.condition === 'Visitante') {
      if (m.score.away > m.score.home) return 'Victoria';
      if (m.score.away < m.score.home) return 'Derrota';
      return 'Empate';
    }
    return undefined;
  };

  const getResultBadgeStyle = (result?: string) => {
    if (result === 'Victoria') return 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10';
    if (result === 'Derrota') return 'text-red-400 border-red-500/25 bg-red-500/10';
    if (result === 'Empate') return 'text-zinc-300 border-zinc-700 bg-zinc-800/60';
    return 'text-[#666666] border-[#222222] bg-[#111111]';
  };

  const getResultDotColor = (result?: string) => {
    if (result === 'Victoria') return 'bg-emerald-500';
    if (result === 'Derrota') return 'bg-red-500';
    if (result === 'Empate') return 'bg-zinc-400';
    return 'bg-zinc-600';
  };

  const getResultLetter = (result?: string) => {
    if (result === 'Victoria') return 'V';
    if (result === 'Derrota') return 'D';
    if (result === 'Empate') return 'E';
    return '-';
  };

  const totalRoster = activeTeam ? activeTeam.players.filter(isActiveRoster).length : 0;
  const availableCount = activeTeam ? activeTeam.players.filter(isCallable).length : 0;
  const injuredCount = activeTeam
    ? activeTeam.players.filter(p => isActiveRoster(p) && p.status === 'injured').length
    : 0;
  const suspendedCount = activeTeam
    ? activeTeam.players.filter(p => isActiveRoster(p) && p.isSuspended).length
    : 0;
  const unavailableCount = activeTeam
    ? activeTeam.players.filter(
        p => isActiveRoster(p) && p.status === 'unavailable' && !p.isSuspended
      ).length
    : 0;

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-8 pb-12">
      {/* Top Workspace Header — Geist Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1F1F1F]">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">
              {activeTeam ? activeTeam.name : 'Espacio de Trabajo'}
            </h1>
            {activeTeam && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#262626] bg-[#111111] text-[#888888]">
                {activeTeam.modality}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#888888]">
            Dirección técnica, planificación de sesiones y análisis competitivo en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeTeamId || ''}
            onChange={(e) => selectTeam(e.target.value)}
            aria-label="Cambiar equipo"
            className="h-8 bg-[#0A0A0A] hover:bg-[#111111] border border-[#262626] text-[#EDEDED] px-3 rounded-md text-[13px] font-medium focus:outline-none focus:border-[#444444] transition-colors"
          >
            <option value="" disabled>
              Seleccionar Equipo
            </option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.modality})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowTeamsAdminModal(true)}
            className="h-8 px-2.5 bg-[#0A0A0A] hover:bg-[#141414] text-[#888888] hover:text-[#EDEDED] border border-[#262626] rounded-md transition-colors flex items-center gap-1.5 text-[12px] font-medium"
            title="Administrar Equipos"
          >
            <IconSettingsSliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Equipos</span>
          </button>

          <button
            onClick={() => setShowNewTeamModal(true)}
            className="h-8 px-3 bg-[#0A0A0A] hover:bg-[#141414] text-[#EDEDED] border border-[#262626] rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#888888]" />
            <span>Nuevo Equipo</span>
          </button>

          <button
            onClick={() => setShowSessionModal(true)}
            className="h-8 px-3.5 bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-medium text-[12px] rounded-md transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Sesión</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip — Vercel Hairline Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="bg-[#0A0A0A] p-4 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
            Plantilla Total
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-semibold text-[#EDEDED] tabular-nums">
              {totalRoster}
            </span>
            <span className="text-[11px] font-mono text-[#555555]">fichas</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
              Disponibles
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-semibold text-[#EDEDED] tabular-nums">
              {availableCount}
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              {totalRoster > 0 ? `${Math.round((availableCount / totalRoster) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
              Lesionados
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-semibold text-[#EDEDED] tabular-nums">
              {injuredCount}
            </span>
            <span className="text-[11px] font-mono text-[#666666]">bajas méd.</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
              Sancionados
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-semibold text-[#EDEDED] tabular-nums">
              {suspendedCount}
            </span>
            <span className="text-[11px] font-mono text-[#666666]">no conv.</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
              Ausentes
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-semibold text-[#EDEDED] tabular-nums">
              {unavailableCount}
            </span>
            <span className="text-[11px] font-mono text-[#666666]">permiso</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] p-4 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
            Biblioteca
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-semibold text-[#EDEDED] tabular-nums">
              {savedExercises.length}
            </span>
            <span className="text-[11px] font-mono text-[#555555]">tareas</span>
          </div>
        </div>
      </section>

      {/* Modules Grid — Monochrome Geist Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[#777777]">
            Módulos Principales
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => onNavigate(mod.id)}
              className="group bg-[#0A0A0A] hover:bg-[#0F0F0F] border border-[#1F1F1F] hover:border-[#363636] rounded-lg p-5 text-left transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-md bg-[#121212] border border-[#242424] group-hover:border-[#383838] flex items-center justify-center text-[#EDEDED] transition-colors">
                    <mod.icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#666666]">{mod.meta}</span>
                    <ArrowUpRight className="w-4 h-4 text-[#444444] group-hover:text-[#EDEDED] transition-colors" />
                  </div>
                </div>
                <h3 className="text-[14px] font-semibold text-[#EDEDED] mb-1">{mod.title}</h3>
                <p className="text-[13px] text-[#888888] leading-relaxed">{mod.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Split: Match Log + Quick Governance Links */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Matches Table (Vercel Deployment Log Style) */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#1F1F1F] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconMatchHistory className="w-4 h-4 text-[#888888]" />
              <h2 className="text-[13px] font-medium text-[#EDEDED]">Registro de Partidos</h2>
            </div>
            <div className="flex items-center gap-3">
              {recentMatches.length > 0 && (
                <div className="hidden sm:flex items-center gap-1" title="Últimos resultados">
                  {recentMatches
                    .slice(0, 5)
                    .reverse()
                    .map((m, i) => {
                      const res = getComputedResult(m);
                      return (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-[10px] font-mono font-semibold flex items-center justify-center border ${getResultBadgeStyle(
                            res
                          )}`}
                        >
                          {getResultLetter(res)}
                        </span>
                      );
                    })}
                </div>
              )}
              <button
                onClick={() => onNavigate('history')}
                className="text-[12px] font-medium text-[#888888] hover:text-[#EDEDED] transition-colors flex items-center gap-1"
              >
                <span>Historial</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#171717] flex-1 flex flex-col">
            {recentMatches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
                <IconMatchHistory className="w-8 h-8 text-[#333333] mb-2.5" />
                <p className="text-[13px] font-medium text-[#888888]">
                  Sin partidos registrados
                </p>
                <p className="text-[12px] text-[#555555] mt-0.5">
                  Las actas finalizadas en Día de Partido aparecerán aquí.
                </p>
              </div>
            ) : (
              recentMatches.map((match) => {
                const res = getComputedResult(match);
                const isLocal = match.condition !== 'Visitante';
                const homeName = isLocal
                  ? match.myTeamName || activeTeam?.name || 'Local'
                  : match.opponent || 'Rival';
                const awayName = isLocal
                  ? match.opponent || 'Rival'
                  : match.myTeamName || activeTeam?.name || 'Visitante';

                return (
                  <div
                    key={match.id}
                    onClick={() => onNavigate('history')}
                    className="px-5 py-3.5 hover:bg-[#0F0F0F] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${getResultDotColor(res)}`}
                        title={res}
                      />
                      <span className="font-mono text-[12px] font-semibold px-2 py-0.5 rounded bg-[#131313] border border-[#252525] text-[#EDEDED] tabular-nums shrink-0">
                        {match.score.home} - {match.score.away}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#EDEDED] truncate">
                          {homeName} <span className="text-[#555555]">vs</span> {awayName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded border border-[#222222] bg-[#111111] text-[#888888]">
                        {match.matchType || 'Liga'}
                      </span>
                      <span className="text-[11px] font-mono text-[#666666] tabular-nums">
                        {new Date(match.date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Secondary Tools & Analytics */}
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-[#1F1F1F]">
              <h2 className="text-[13px] font-medium text-[#EDEDED]">Control y Estadísticas</h2>
            </div>

            <div className="divide-y divide-[#171717]">
              <button
                onClick={() => onNavigate('stats')}
                className="w-full px-5 py-4 hover:bg-[#0F0F0F] transition-colors flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#121212] border border-[#242424] flex items-center justify-center text-[#EDEDED]">
                    <IconAnalytics className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#EDEDED]">
                      Rendimiento de Plantilla
                    </p>
                    <p className="text-[12px] text-[#777777]">
                      Minutos, goles, tiros, tarjetas y exportación.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#EDEDED] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('fines')}
                className="w-full px-5 py-4 hover:bg-[#0F0F0F] transition-colors flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#121212] border border-[#242424] flex items-center justify-center text-[#EDEDED]">
                    <IconWhistleCards className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#EDEDED]">Régimen Interno</p>
                    <p className="text-[12px] text-[#777777]">
                      Control disciplinario, multas y pagos.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#EDEDED] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className="w-full px-5 py-4 hover:bg-[#0F0F0F] transition-colors flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#121212] border border-[#242424] flex items-center justify-center text-[#EDEDED]">
                    <IconSettingsSliders className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#EDEDED]">Ajustes del Club</p>
                    <p className="text-[12px] text-[#777777]">
                      Escudo, estadio local, plantillas y copias.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#EDEDED] transition-colors" />
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-[#1F1F1F] bg-[#070707]">
            <button
              onClick={() => onNavigate('roster')}
              className="w-full h-8 rounded-md border border-[#262626] bg-[#111111] hover:bg-[#181818] text-[12px] font-medium text-[#EDEDED] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ver plantilla completa</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#777777]" />
            </button>
          </div>
        </div>
      </section>

      {/* New Team Modal */}
      {showNewTeamModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#222222] p-6 rounded-lg max-w-md w-full relative">
            <button
              onClick={() => setShowNewTeamModal(false)}
              className="absolute top-4 right-4 text-[#666666] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-[#EDEDED] mb-1">Crear Nuevo Equipo</h2>
            <p className="text-[12px] text-[#777777] mb-5">
              Define el nombre y formato de competición del equipo.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[#888888] block mb-1.5">
                  Nombre del Equipo
                </label>
                <input
                  type="text"
                  value={newTeamForm.name}
                  onChange={e => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#262626] rounded-md px-3 py-2 text-[13px] text-[#EDEDED] focus:border-[#555555] focus:outline-none"
                  placeholder="Ej: C.D. Álora Juvenil"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#888888] block mb-1.5">
                  Modalidad
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#111111] border border-[#262626] rounded-md p-1">
                  <button
                    onClick={() => setNewTeamForm({ ...newTeamForm, modality: 'F7' })}
                    className={`text-[12px] py-2 rounded font-medium transition-colors ${
                      newTeamForm.modality === 'F7'
                        ? 'bg-[#EDEDED] text-[#0A0A0A]'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Fútbol 7
                  </button>
                  <button
                    onClick={() => setNewTeamForm({ ...newTeamForm, modality: 'F11' })}
                    className={`text-[12px] py-2 rounded font-medium transition-colors ${
                      newTeamForm.modality === 'F11'
                        ? 'bg-[#EDEDED] text-[#0A0A0A]'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Fútbol 11
                  </button>
                </div>
              </div>
              <button
                onClick={handleCreateTeam}
                className="w-full h-9 mt-2 bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[13px] font-medium rounded-md transition-colors"
              >
                Crear Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams Admin Modal */}
      {showTeamsAdminModal && (
        <Suspense fallback={null}>
          <TeamsAdminModal onClose={() => setShowTeamsAdminModal(false)} />
        </Suspense>
      )}

      {/* Nueva Sesión Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#1F1F1F] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#EDEDED]">Iniciar Sesión en Pizarra</h3>
                <p className="text-[12px] text-[#888888]">
                  Selecciona el contexto táctico para abrir el lienzo.
                </p>
              </div>
              <button
                onClick={() => setShowSessionModal(false)}
                className="p-1.5 text-[#666666] hover:text-white rounded-md hover:bg-[#141414] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#777777] mb-2.5">
                  Competición
                </h4>
                <button
                  onClick={handleStartMatch}
                  className="w-full text-left bg-[#111111] border border-[#242424] hover:border-[#444444] rounded-lg p-4 transition-colors group flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-md bg-[#181818] border border-[#2A2A2A] text-[#EDEDED] flex items-center justify-center shrink-0">
                    <IconMatchDay className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[13px] font-semibold text-[#EDEDED] mb-0.5">
                      Planteamiento de Partido
                    </h5>
                    <p className="text-[#888888] text-[12px]">
                      Diseña el once inicial, presión sobre salida rival y jugadas a balón parado.
                    </p>
                  </div>
                </button>
              </div>

              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#777777] mb-2.5">
                  Categorías de Entrenamiento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'transition',
                      title: 'Transiciones',
                      desc: 'Ataque-defensa y contraataques.',
                      icon: HeartPulse,
                    },
                    {
                      id: 'possession',
                      title: 'Posesión',
                      desc: 'Rondos, superioridades y juego de posición.',
                      icon: IconTacticalBoard,
                    },
                    {
                      id: 'buildup',
                      title: 'Salida de Balón',
                      desc: 'Progresión desde reinicios y presión alta.',
                      icon: MapPin,
                    },
                    {
                      id: 'set-piece',
                      title: 'Balón Parado (ABP)',
                      desc: 'Córners y faltas estratégicas.',
                      icon: IconExerciseLibrary,
                    },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleStartTraining(cat.id as TrainingCategory)}
                      className="text-left bg-[#111111] border border-[#242424] hover:border-[#444444] rounded-lg p-4 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-md bg-[#181818] border border-[#2A2A2A] text-[#EDEDED] flex items-center justify-center mb-2.5">
                        <cat.icon className="w-4 h-4" />
                      </div>
                      <h5 className="text-[13px] font-semibold text-[#EDEDED] mb-0.5">
                        {cat.title}
                      </h5>
                      <p className="text-[#888888] text-[12px]">{cat.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
