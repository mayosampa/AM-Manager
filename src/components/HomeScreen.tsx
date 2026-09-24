import { useState, useEffect } from 'react';
import { 
  Presentation, 
  Users, 
  Calendar, 
  BarChart3, 
  ChevronRight, 
  Shield, 
  Video, 
  HeartPulse,
  MapPin,
  Clock,
  Plus,
  X,
  PlaySquare,
  Settings
} from 'lucide-react';
import { useSession, TrainingCategory } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import { MatchRecord } from '../types';
import { TeamsAdminModal } from './TeamsAdminModal';

interface Props {
  onNavigate: (view: 'home' | 'tactics' | 'roster' | 'calendar' | 'stats' | 'history' | 'library') => void;
}

export function HomeScreen({ onNavigate }: Props) {
  const { currentSessionType, startMatchSession, startTrainingSession, savedExercises } = useSession();
  const { teams, activeTeamId, activeTeam, selectTeam, createTeam } = useTeam();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showTeamsAdminModal, setShowTeamsAdminModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState<{name: string, modality: 'F7'|'F11'}>({ name: '', modality: 'F11' });
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);

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

  const quickLinks = [
    { 
      id: 'tactics' as const, 
      title: 'Pizarra Táctica', 
      desc: 'Diseña tareas y analiza jugadas.', 
      icon: Presentation, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10', 
      border: 'hover:border-emerald-400/50' 
    },
    { 
      id: 'roster' as const, 
      title: 'Plantilla', 
      desc: 'Administra a tus jugadores.', 
      icon: Users, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10', 
      border: 'hover:border-blue-400/50' 
    },
    { 
      id: 'calendar' as const, 
      title: 'Agenda', 
      desc: 'Organiza tus microciclos.', 
      icon: Calendar, 
      color: 'text-purple-400', 
      bg: 'bg-purple-400/10', 
      border: 'hover:border-purple-400/50' 
    },
    { 
      id: 'library' as const, 
      title: 'Biblioteca', 
      desc: 'Tus rutinas guardadas.', 
      icon: Presentation, 
      color: 'text-[#FF4B4B]', 
      bg: 'bg-[#FF4B4B]/10', 
      border: 'hover:border-[#FF4B4B]/50' 
    },
    { 
      id: 'match' as const, 
      title: 'Día de Partido', 
      desc: 'Panel táctico en vivo.', 
      icon: PlaySquare, 
      color: 'text-amber-400', 
      bg: 'bg-amber-400/10', 
      border: 'hover:border-amber-400/50' 
    },
  ];

  const recentMatches = [...matchHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

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

  const getResultColor = (result?: string) => {
    if (result === 'Victoria') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (result === 'Derrota') return 'bg-[#FF4B4B]/10 text-[#FF4B4B] border-[#FF4B4B]/20';
    if (result === 'Empate') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-[#2A2A2E] text-[#6E6E75] border-[#3A3A3E]';
  };
  
  const getResultLetter = (result?: string) => {
    if (result === 'Victoria') return 'V';
    if (result === 'Derrota') return 'D';
    if (result === 'Empate') return 'E';
    return '-';
  };

  return (
    <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-8 pb-12">
      
      {/* Master Team Selector */}
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-sm font-bold text-[#FF4B4B] uppercase tracking-widest mb-2">Equipo Activo</h2>
          <div className="flex items-center gap-4">
            <select
              value={activeTeamId}
              onChange={(e) => selectTeam(e.target.value)}
              className="bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#FF4B4B]/50 font-bold text-xl min-w-[250px]"
            >
              {teams.length === 0 && <option value="" disabled>Sin equipos</option>}
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.modality})</option>
              ))}
            </select>
            <button
              onClick={() => setShowTeamsAdminModal(true)}
              className="p-3 bg-[#1C1C1F] hover:bg-[#2A2A2E] text-[#6E6E75] hover:text-white border border-[#2A2A2E] rounded-xl transition-all"
              title="Administrar Equipos"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNewTeamModal(true)}
              className="flex items-center gap-2 bg-[#1C1C1F] hover:bg-[#2A2A2E] text-white border border-[#2A2A2E] px-4 py-3 rounded-xl font-bold transition-all"
            >
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Nuevo Equipo</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF4B4B] text-black font-bold rounded-xl shadow-lg shadow-[#FF4B4B]/20 hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5" /> Nueva Sesión
          </button>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Panel de Inicio</h1>
          <p className="text-[#6E6E75] mt-1 text-sm">Accesos rápidos y estado real de tu equipo.</p>
        </div>
      </header>

      {/* Quick Access Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id as any)}
            className={`flex flex-col items-start p-6 bg-[#121215] border border-[#2A2A2E] rounded-2xl transition-all duration-200 cursor-pointer ${link.border} hover:bg-[#1C1C1F] group text-left h-full`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${link.bg} ${link.color}`}>
              <link.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{link.title}</h3>
            <p className="text-sm text-[#6E6E75] flex-1 mb-4 leading-relaxed">{link.desc}</p>
            <div className="flex items-center text-xs font-semibold text-white/50 group-hover:text-white transition-colors mt-auto w-full justify-between">
              <span>Acceder</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </section>

      {/* Main Content Grid (Stats & Recent Library) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Real Stats) */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 flex flex-col h-full">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Resumen de Plantilla
            </h2>
            
            <div className="flex flex-col gap-4">
              <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex justify-between items-center">
                <span className="text-[#6E6E75] font-semibold">Total Plantilla</span>
                <span className="text-2xl font-bold text-white">{activeTeam ? activeTeam.players.filter(p => p.isActive !== false).length : 0}</span>
              </div>
              <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex justify-between items-center">
                <span className="text-[#6E6E75] font-semibold">Disponibles</span>
                <span className="text-2xl font-bold text-emerald-400">{activeTeam ? activeTeam.players.filter(p => p.isActive !== false && p.status === 'available' && !p.isSuspended).length : 0}</span>
              </div>
              <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex justify-between items-center">
                <span className="text-[#6E6E75] font-semibold">Lesionados</span>
                <span className="text-2xl font-bold text-yellow-400">{activeTeam ? activeTeam.players.filter(p => p.isActive !== false && p.status === 'injured').length : 0}</span>
              </div>
              <div className="bg-[#1C1C1F] border border-[#FF4B4B]/20 rounded-xl p-4 flex justify-between items-center">
                <span className="text-[#6E6E75] font-semibold">Sancionados</span>
                <span className="text-2xl font-bold text-[#FF4B4B]">{activeTeam ? activeTeam.players.filter(p => p.isActive !== false && p.isSuspended).length : 0}</span>
              </div>
              <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex justify-between items-center mt-4">
                <span className="text-[#6E6E75] font-semibold">Ejercicios Creados</span>
                <span className="text-2xl font-bold text-white">{savedExercises.length}</span>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('roster')}
              className="w-full mt-auto pt-6 text-sm font-semibold text-[#6E6E75] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              Gestionar Plantilla <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column (Recent Matches) */}
        <div className="col-span-1 lg:col-span-2 bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Últimos Partidos
            </h2>
            <div className="flex items-center gap-3">
              {/* Racha */}
              <div className="hidden sm:flex items-center gap-1 mr-2" title="Racha (Últimos 5 partidos)">
                {recentMatches.slice(0, 5).reverse().map((m, i) => {
                  const res = getComputedResult(m);
                  return (
                    <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border ${getResultColor(res)}`}>
                      {getResultLetter(res)}
                    </span>
                  );
                })}
              </div>
              <button 
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold bg-[#2A2A2E] text-white px-3 py-1.5 rounded-lg hover:bg-[#3A3A3E] transition-colors"
              >
                Ver Historial
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 flex-1">
            {recentMatches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6E6E75] min-h-[200px]">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <p>No tienes partidos registrados.</p>
                <p className="text-xs mt-1">Los partidos jugados aparecerán aquí.</p>
              </div>
            ) : (
              recentMatches.map((match) => {
                const res = getComputedResult(match);
                const isLocal = match.condition !== 'Visitante';
                const homeName = isLocal ? (match.myTeamName || activeTeam?.name || 'Mi Equipo') : (match.opponent || 'Rival');
                const awayName = isLocal ? (match.opponent || 'Rival') : (match.myTeamName || activeTeam?.name || 'Mi Equipo');

                return (
                  <div key={match.id} className="flex items-center gap-4 bg-[#1C1C1F] border border-[#2A2A2E] p-4 rounded-xl group hover:border-[#FF4B4B]/30 transition-colors">
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${getResultColor(res)}`}>
                      <span className="font-black text-lg leading-none mb-0.5">{match.score.home}-{match.score.away}</span>
                      <span className="text-[9px] font-bold uppercase opacity-80">{getResultLetter(res)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white truncate text-base">
                          {homeName} vs {awayName}
                        </h4>
                      </div>
                      <p className="text-xs text-[#6E6E75] capitalize">{match.matchType || 'Amistoso'} • {new Date(match.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </section>

      {/* New Team Modal */}
      {showNewTeamModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] p-6 rounded-3xl max-w-md w-full relative">
            <button onClick={() => setShowNewTeamModal(false)} className="absolute top-4 right-4 text-[#6E6E75] hover:text-white"><X className="w-6 h-6"/></button>
            <h2 className="text-xl font-bold text-white mb-6">Crear Nuevo Equipo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-1">Nombre del Equipo</label>
                <input 
                  type="text" 
                  value={newTeamForm.name}
                  onChange={e => setNewTeamForm({...newTeamForm, name: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  placeholder="Ej: Prebenjamín A"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-2">Modalidad</label>
                <div className="flex bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-1">
                  <button 
                    onClick={() => setNewTeamForm({...newTeamForm, modality: 'F7'})}
                    className={`flex-1 text-sm py-3 rounded-lg font-bold transition-colors ${
                      newTeamForm.modality === 'F7' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'
                    }`}
                  >
                    Fútbol 7
                  </button>
                  <button 
                    onClick={() => setNewTeamForm({...newTeamForm, modality: 'F11'})}
                    className={`flex-1 text-sm py-3 rounded-lg font-bold transition-colors ${
                      newTeamForm.modality === 'F11' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'
                    }`}
                  >
                    Fútbol 11
                  </button>
                </div>
              </div>
              <button 
                onClick={handleCreateTeam}
                className="w-full py-3 mt-4 bg-[#FF4B4B] text-black font-bold rounded-xl hover:bg-[#E63939] transition-colors"
              >
                Crear Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams Admin Modal */}
      {showTeamsAdminModal && (
        <TeamsAdminModal onClose={() => setShowTeamsAdminModal(false)} />
      )}

      {/* Nueva Sesión Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between sticky top-0 bg-[#121215]/95 backdrop-blur-sm z-10">
              <div>
                <h3 className="text-xl font-bold text-white">Configurar Nueva Sesión</h3>
                <p className="text-sm text-[#6E6E75]">Selecciona el tipo de trabajo a realizar</p>
              </div>
              <button 
                onClick={() => setShowSessionModal(false)}
                className="p-2 text-[#6E6E75] hover:text-white bg-[#1C1C1F] hover:bg-[#2A2A2E] rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Opción A: Partido */}
              <div className="mb-8">
                <h4 className="text-sm font-bold text-[#FF4B4B] uppercase tracking-widest mb-4">Opción A: Partido</h4>
                <button 
                  onClick={handleStartMatch}
                  className="w-full text-left bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl p-5 hover:border-[#FF4B4B]/50 hover:bg-[#2A2A2E]/50 transition-all group flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-white mb-1">Día de Partido</h5>
                    <p className="text-[#6E6E75] text-sm">Registra alineaciones, goles, eventos y métricas en tiempo real. Análisis táctico en vivo.</p>
                  </div>
                </button>
              </div>

              {/* Opción B: Entrenamiento */}
              <div>
                <h4 className="text-sm font-bold text-[#FF4B4B] uppercase tracking-widest mb-4">Opción B: Entrenamiento (Categorías)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'transition', title: 'Transición', desc: 'Ataque-Defensa y viceversa', icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-400/10' },
                    { id: 'possession', title: 'Posesión', desc: 'Rondos, juegos de posición', icon: PlaySquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { id: 'buildup', title: 'Salida de Balón', desc: 'Superación de presión alta', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    { id: 'set-piece', title: 'ABP', desc: 'Córners, faltas laterales', icon: Presentation, color: 'text-amber-400', bg: 'bg-amber-400/10' }
                  ].map((cat) => (
                    <button 
                      key={cat.id}
                      onClick={() => handleStartTraining(cat.id as TrainingCategory)}
                      className="text-left bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl p-5 hover:border-white/30 hover:bg-[#2A2A2E]/50 transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${cat.bg} ${cat.color}`}>
                        <cat.icon className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold text-white mb-1">{cat.title}</h5>
                      <p className="text-[#6E6E75] text-xs">{cat.desc}</p>
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
