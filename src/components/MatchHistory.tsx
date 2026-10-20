import React, { useState, useEffect } from 'react';
import { MatchRecord, MatchEvent, EventType, Player, MatchTeamStats, TeamSideStats } from '../types';
import { Clock, Goal, Handshake, ArrowRightLeft, Trash2, Plus, Calendar, Save, ArrowLeft, FileText, FileSpreadsheet, Download, Edit3, Star, BarChart2 } from 'lucide-react';
import { BulkEvaluationModal } from './BulkEvaluationModal';
import { useTeam } from '../context/TeamContext';
import { ManualMatchEntry } from './ManualMatchEntry';
import { reconcileSeasonPlanWithHistory } from '../services/matchSync';
import { computeSingleMatchStats, exportSingleMatchToExcel, exportSingleMatchToPDF } from '../services/matchReportExport';

interface MatchHistoryProps {
  onNavigate: (view: any) => void;
}

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────
const formatTimeStr = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const computeMatchStats = computeSingleMatchStats;

const EMPTY_TEAM_STATS: MatchTeamStats = {
  myTeam: { shotsOnTarget: 0, shotsOffTarget: 0, corners: 0, fouls: 0, offsides: 0, yellowCards: 0, redCards: 0, possession: 50 },
  rival: { shotsOnTarget: 0, shotsOffTarget: 0, corners: 0, fouls: 0, offsides: 0, yellowCards: 0, redCards: 0, possession: 50 },
};

const getTeamStatKeyForHistoryEvent = (type: EventType): keyof Omit<TeamSideStats, 'possession'> | null => {
  switch (type) {
    case 'shot_on_target':
    case 'goal':
      return 'shotsOnTarget';
    case 'shot_off_target':
      return 'shotsOffTarget';
    case 'corner':
      return 'corners';
    case 'foul':
      return 'fouls';
    case 'offside':
      return 'offsides';
    case 'yellow':
    case 'yellow_card':
      return 'yellowCards';
    case 'red':
    case 'red_card':
      return 'redCards';
    default:
      return null;
  }
};

function TeamStatsComparisonBars({
  teamStats,
  myTeamLabel,
  rivalLabel,
}: {
  teamStats: MatchTeamStats;
  myTeamLabel: string;
  rivalLabel: string;
}) {
  const my = teamStats.myTeam || EMPTY_TEAM_STATS.myTeam;
  const rv = teamStats.rival || EMPTY_TEAM_STATS.rival;
  const myPoss = my.possession ?? 50;
  const rvPoss = rv.possession ?? 100 - myPoss;
  const myTotalShots = (my.shotsOnTarget || 0) + (my.shotsOffTarget || 0);
  const rvTotalShots = (rv.shotsOnTarget || 0) + (rv.shotsOffTarget || 0);

  const rows = [
    { label: 'Posesión', myVal: `${myPoss}%`, rvVal: `${rvPoss}%`, myNum: myPoss, rvNum: rvPoss },
    { label: 'Tiros Totales', myVal: String(myTotalShots), rvVal: String(rvTotalShots), myNum: myTotalShots, rvNum: rvTotalShots },
    { label: 'Tiros a Puerta', myVal: String(my.shotsOnTarget || 0), rvVal: String(rv.shotsOnTarget || 0), myNum: my.shotsOnTarget || 0, rvNum: rv.shotsOnTarget || 0 },
    { label: 'Tiros Fuera', myVal: String(my.shotsOffTarget || 0), rvVal: String(rv.shotsOffTarget || 0), myNum: my.shotsOffTarget || 0, rvNum: rv.shotsOffTarget || 0 },
    { label: 'Córners', myVal: String(my.corners || 0), rvVal: String(rv.corners || 0), myNum: my.corners || 0, rvNum: rv.corners || 0 },
    { label: 'Faltas', myVal: String(my.fouls || 0), rvVal: String(rv.fouls || 0), myNum: my.fouls || 0, rvNum: rv.fouls || 0 },
    { label: 'Fueras de Juego', myVal: String(my.offsides || 0), rvVal: String(rv.offsides || 0), myNum: my.offsides || 0, rvNum: rv.offsides || 0 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1 border-b border-[#2A2A2E]">
        <span className="text-emerald-400 truncate max-w-[45%]">{myTeamLabel}</span>
        <span className="text-[#FF4B4B] truncate max-w-[45%] text-right">{rivalLabel}</span>
      </div>
      {rows.map(r => {
        const total = r.myNum + r.rvNum;
        const myPct = total > 0 ? Math.round((r.myNum / total) * 100) : 50;
        const rvPct = 100 - myPct;
        return (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-emerald-400">{r.myVal}</span>
              <span className="text-[#8E8E93] font-semibold">{r.label}</span>
              <span className="font-mono font-bold text-[#FF4B4B]">{r.rvVal}</span>
            </div>
            <div className="w-full h-2 bg-[#1C1C1F] rounded-full overflow-hidden flex border border-[#2A2A2E]/60">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${myPct}%` }}
              />
              <div
                className="h-full bg-[#FF4B4B] transition-all duration-300"
                style={{ width: `${rvPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────
export function MatchHistory({ onNavigate }: MatchHistoryProps) {
  const { activeTeam, updateTeamPlayers } = useTeam();
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [filterCompetition, setFilterCompetition] = useState('Todos');
  const [filterResult, setFilterResult] = useState('Todos');
  const [showBulkEvaluationModal, setShowBulkEvaluationModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');
  const [isEditingFullMatch, setIsEditingFullMatch] = useState(false);
  const [isEditingTeamStats, setIsEditingTeamStats] = useState(false);
  const [draftTeamStats, setDraftTeamStats] = useState<MatchTeamStats>(EMPTY_TEAM_STATS);

  // Add event form
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<{
    type: EventType;
    time: number;
    playerId: string;
    playerInId: string;
  }>({ type: 'goal', time: 0, playerId: '', playerInId: '' });

  // Notes modal
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesMatchId, setNotesMatchId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [editableEvals, setEditableEvals] = useState<{playerId: string, rating: number, notes: string, isDeleted: boolean}[]>([]);

  useEffect(() => {
    if (activeTeam?.id) {
      import('../services/db').then(async ({ db }) => {
        const [matches, rawPlan] = await Promise.all([
          db.getMatches(activeTeam.id),
          db.getSeasonPlan(activeTeam.id),
        ]);
        setHistory(matches);
        const { plan, changed } = reconcileSeasonPlanWithHistory(rawPlan || {}, matches || [], activeTeam.id);
        if (changed) {
          db.saveSeasonPlan(plan, activeTeam.id).catch(console.error);
        }
      });
    } else {
      setHistory([]);
    }
  }, [activeTeam?.id]);

  // ── Optimistic save: update UI immediately, persist in background
  const saveHistory = async (updatedMatch: MatchRecord) => {
    // Optimistic update
    setHistory(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    if (selectedMatch?.id === updatedMatch.id) setSelectedMatch(updatedMatch);

    // Background persist (non-blocking)
    import('../services/db').then(({ db }) => {
      db.saveMatch(updatedMatch).catch(console.error);
    });
  };

  const saveHistoryWithSpinner = async (updatedMatch: MatchRecord) => {
    setIsSaving(true);
    try {
      setHistory(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      if (selectedMatch?.id === updatedMatch.id) setSelectedMatch(updatedMatch);
      const { db } = await import('../services/db');
      await db.saveMatch(updatedMatch);
    } catch (e) {
      console.error('Error saving match:', e);
      alert('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const openNotesModal = (e: React.MouseEvent, match: MatchRecord) => {
    e.stopPropagation();
    setNotesMatchId(match.id);
    setCurrentNotes(match.notes || '');

    const initialEvals = activeTeam?.players
      .filter(p => p.evaluations?.some(ev => ev.matchId === match.id))
      .map(p => {
        const ev = p.evaluations!.find(e => e.matchId === match.id)!;
        return {
          playerId: p.id,
          rating: ev.rating,
          notes: ev.notes || '',
          isDeleted: false
        };
      }) || [];
    setEditableEvals(initialEvals);

    setIsNotesModalOpen(true);
  };

  const saveNotes = () => {
    if (!notesMatchId) return;
    const matchToUpdate = history.find(m => m.id === notesMatchId);
    
    // 1. Guardar las notas globales del partido (permitir vacío)
    if (matchToUpdate) {
      saveHistory({ ...matchToUpdate, notes: currentNotes.trim() === '' ? undefined : currentNotes });
    }

    // 2. Procesar las evaluaciones individuales (Optimistic)
    if (activeTeam) {
      let playersModified = false;
      const newPlayers = activeTeam.players.map(p => {
        const evalMod = editableEvals.find(e => e.playerId === p.id);
        if (evalMod) {
          playersModified = true;
          if (evalMod.isDeleted) {
            return {
              ...p,
              evaluations: (p.evaluations || []).filter(e => e.matchId !== notesMatchId)
            };
          } else {
            return {
              ...p,
              evaluations: (p.evaluations || []).map(e => e.matchId === notesMatchId ? {
                ...e,
                rating: evalMod.rating,
                notes: evalMod.notes
              } : e)
            };
          }
        }
        return p;
      });

      if (playersModified) {
        updateTeamPlayers(newPlayers);
      }
    }

    setIsNotesModalOpen(false);
    setNotesMatchId(null);
  };

  const handleDeleteMatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que quieres eliminar TODO el historial de este partido? Esta acción no se puede deshacer.')) return;
    const matchToDelete = history.find(m => m.id === matchId) || (selectedMatch?.id === matchId ? selectedMatch : undefined);
    const remainingMatches = history.filter(m => m.id !== matchId);
    // Optimistic
    setHistory(remainingMatches);
    if (selectedMatch?.id === matchId) setSelectedMatch(null);

    try {
      const { db } = await import('../services/db');
      await db.deleteMatch(matchId);

      // Reconciliar season_plan con los partidos restantes en el historial para restaurar al calendario / Match Hub
      const teamId = matchToDelete?.teamId || activeTeam?.id;
      const rawPlan = await db.getSeasonPlan(teamId);
      const { plan, changed } = reconcileSeasonPlanWithHistory(rawPlan || {}, remainingMatches, teamId);
      if (changed) {
        await db.saveSeasonPlan(plan, teamId);
      }
    } catch (err) {
      console.error('Error deleting match and syncing season plan:', err);
    }
  };

  const deleteEvent = (match: MatchRecord, eventId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este evento?')) return;

    const eventToDelete = match.events.find(e => e.id === eventId);
    let newScore = { ...match.score };
    let newTeamStats: MatchTeamStats = match.teamStats
      ? { myTeam: { ...match.teamStats.myTeam }, rival: { ...match.teamStats.rival } }
      : { myTeam: { ...EMPTY_TEAM_STATS.myTeam }, rival: { ...EMPTY_TEAM_STATS.rival } };

    if (eventToDelete?.type === 'goal') {
      const isLocal = match.condition === 'Local';
      if (eventToDelete.playerId === 'rival') {
        newScore[isLocal ? 'away' : 'home'] = Math.max(0, newScore[isLocal ? 'away' : 'home'] - 1);
      } else {
        newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
      }
    }

    if (eventToDelete && eventToDelete.playerId && eventToDelete.playerId !== 'rival' && eventToDelete.playerId !== 'system') {
      const statKey = getTeamStatKeyForHistoryEvent(eventToDelete.type);
      if (statKey) {
        newTeamStats.myTeam[statKey] = Math.max(0, (newTeamStats.myTeam[statKey] || 0) - 1);
      }
    }

    const newEvents = match.events.filter(e => e.id !== eventId);
    saveHistory({ ...match, events: newEvents, score: newScore, teamStats: newTeamStats });
  };

  // ── Add event form submit
  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (newEvent.type === 'sub') {
      if (!newEvent.playerId) { alert('Selecciona el jugador que SALE.'); return; }
      if (!newEvent.playerInId) { alert('Selecciona el jugador que ENTRA.'); return; }
      if (newEvent.playerId === newEvent.playerInId) { alert('El jugador que sale y el que entra no pueden ser el mismo.'); return; }
    } else {
      if (!newEvent.playerId) { alert('Selecciona un jugador.'); return; }
    }

    const newMatchEvent: MatchEvent = {
      id: editingEventId || Math.random().toString(36).substring(2, 9),
      type: newEvent.type,
      playerId: newEvent.playerId,
      playerInId: newEvent.type === 'sub' ? newEvent.playerInId : undefined,
      time: newEvent.time * 60,
    };

    let newScore = { ...selectedMatch.score };
    let newTeamStats: MatchTeamStats = selectedMatch.teamStats
      ? { myTeam: { ...selectedMatch.teamStats.myTeam }, rival: { ...selectedMatch.teamStats.rival } }
      : { myTeam: { ...EMPTY_TEAM_STATS.myTeam }, rival: { ...EMPTY_TEAM_STATS.rival } };
    const isLocal = selectedMatch.condition === 'Local';

    if (editingEventId) {
      const oldEvent = selectedMatch.events.find(ev => ev.id === editingEventId);
      if (oldEvent?.type === 'goal') {
        newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
      }
      if (oldEvent && oldEvent.playerId && oldEvent.playerId !== 'rival' && oldEvent.playerId !== 'system') {
        const oldStatKey = getTeamStatKeyForHistoryEvent(oldEvent.type);
        if (oldStatKey) {
          newTeamStats.myTeam[oldStatKey] = Math.max(0, (newTeamStats.myTeam[oldStatKey] || 0) - 1);
        }
      }
    }

    if (newEvent.type === 'goal') {
      newScore[isLocal ? 'home' : 'away'] += 1;
    }

    const addedStatKey = getTeamStatKeyForHistoryEvent(newEvent.type);
    if (addedStatKey) {
      newTeamStats.myTeam[addedStatKey] = (newTeamStats.myTeam[addedStatKey] || 0) + 1;
    }

    const remainingEvents = selectedMatch.events.filter(ev => ev.id !== editingEventId);

    saveHistoryWithSpinner({
      ...selectedMatch,
      events: [newMatchEvent, ...remainingEvents].sort((a, b) => b.time - a.time),
      score: newScore,
      teamStats: newTeamStats,
    });

    setShowAddEvent(false);
    setEditingEventId(null);
    setNewEvent({ type: 'goal', time: 0, playerId: '', playerInId: '' });
  };

  // ──────────────────────────────────────────────────────
  // DETAIL VIEW
  // ──────────────────────────────────────────────────────
  if (selectedMatch) {
    if (isEditingFullMatch) {
      return (
        <div className="max-w-4xl mx-auto w-full pb-20">
          <ManualMatchEntry 
            activeTeam={activeTeam} 
            editingMatch={selectedMatch}
            onComplete={() => {
              setIsEditingFullMatch(false);
              import('../services/db').then(({ db }) => {
                db.getMatches(activeTeam!.id).then(matches => {
                  setHistory(matches);
                  const updated = matches.find(m => m.id === selectedMatch.id);
                  if (updated) setSelectedMatch(updated);
                });
              });
            }}
            onCancel={() => setIsEditingFullMatch(false)}
          />
        </div>
      );
    }

    const allPlayers = [...(selectedMatch.squad || []), ...(selectedMatch.bench || [])];
    const { statsMap } = computeMatchStats(selectedMatch);
    const convocados = allPlayers.filter(p => statsMap[p.id]);

    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          <button
            onClick={() => setSelectedMatch(null)}
            className="flex items-center gap-2 text-[#6E6E75] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Volver al Historial
          </button>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => exportSingleMatchToExcel(selectedMatch, activeTeam?.players || [], activeTeam?.name)}
              className="flex items-center gap-1.5 bg-[#1C1C1F] border border-emerald-500/40 text-emerald-400 px-3 py-2 rounded-lg hover:bg-emerald-500 hover:text-black transition-colors font-bold text-xs sm:text-sm"
              title="Exportar estadísticas completas del partido a Excel"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={() => exportSingleMatchToPDF(selectedMatch, activeTeam?.players || [], activeTeam?.name)}
              className="flex items-center gap-1.5 bg-[#1C1C1F] border border-[#FF4B4B]/40 text-[#FF4B4B] px-3 py-2 rounded-lg hover:bg-[#FF4B4B] hover:text-black transition-colors font-bold text-xs sm:text-sm"
              title="Descargar informe completo del partido en PDF"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={() => setIsEditingFullMatch(true)}
              className="flex items-center gap-1.5 bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 text-[#FF4B4B] px-3.5 py-2 rounded-lg hover:bg-[#FF4B4B]/20 transition-colors font-bold text-xs sm:text-sm"
            >
              <Edit3 className="w-4 h-4 shrink-0" /> Editar Acta Completa
            </button>
            <button
              onClick={(e) => handleDeleteMatch(e, selectedMatch.id)}
              className="flex items-center gap-1.5 text-[#6E6E75] hover:text-red-500 transition-colors px-2 py-2"
            >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Eliminar</span>
            </button>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-3xl p-8 shadow-xl text-center">
          <div className="flex justify-center items-center gap-12 mb-6">
            <div className="flex flex-col items-center flex-1">
              <span className="text-[#6E6E75] font-bold uppercase mb-2 truncate max-w-[150px]">
                {selectedMatch.condition === 'Visitante' ? selectedMatch.opponent : (selectedMatch.myTeamName || 'Local')}
              </span>
              <span className="text-6xl font-black text-white">{selectedMatch.score.home}</span>
            </div>
            <div className="text-[#2A2A2E] text-4xl">-</div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-[#6E6E75] font-bold uppercase mb-2 truncate max-w-[150px]">
                {selectedMatch.condition === 'Visitante' ? (selectedMatch.myTeamName || 'Visitante') : selectedMatch.opponent}
              </span>
              <span className="text-6xl font-black text-white">{selectedMatch.score.away}</span>
            </div>
          </div>
          <div className="text-[#6E6E75] font-medium flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(selectedMatch.date).toLocaleString()}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-[#121215] border border-[#2A2A2E] rounded-xl p-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'timeline' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'}`}
          >
            <Clock className="w-4 h-4" /> Timeline
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'stats' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'}`}
          >
            <BarChart2 className="w-4 h-4" /> Estadísticas del Partido
          </button>
        </div>

        {/* ── TAB: TIMELINE ── */}
        {activeTab === 'timeline' && (
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white">Timeline y Edición</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowBulkEvaluationModal(true)}
                  className="flex-1 sm:flex-initial justify-center flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-500/20 transition-colors text-xs sm:text-sm"
                >
                  <Star className="w-4 h-4" /> Evaluar Jugadores
                </button>
                <button
                  onClick={() => {
                    if (!showAddEvent) {
                      setEditingEventId(null);
                      setNewEvent({ type: 'goal', time: 0, playerId: '', playerInId: '' });
                    }
                    setShowAddEvent(!showAddEvent);
                  }}
                  className="flex-1 sm:flex-initial justify-center flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2 rounded-lg hover:bg-[#2A2A2E] transition-colors text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4 text-[#FF4B4B]" /> Añadir Evento
                </button>
              </div>
            </div>

            {/* ── Add Event Form ── */}
            {showAddEvent && (
              <form onSubmit={handleAddEventSubmit} className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E] mb-6 flex flex-col gap-4">
                <h3 className="font-bold text-[#FF4B4B] text-sm uppercase">{editingEventId ? 'Editar Evento' : 'Nuevo Evento Manual'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#6E6E75] mb-1">Tipo de Acción</label>
                    <select
                      className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType, playerId: '', playerInId: '' })}
                    >
                      <option value="goal">Gol</option>
                      <option value="assist">Asistencia</option>
                      <option value="shot_on_target">Tiro a Puerta</option>
                      <option value="shot_off_target">Tiro Fuera</option>
                      <option value="corner">Córner</option>
                      <option value="offside">Fuera de Juego</option>
                      <option value="foul">Falta</option>
                      <option value="yellow">Amarilla</option>
                      <option value="red">Roja</option>
                      <option value="sub">Cambio (Sustitución)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#6E6E75] mb-1">Minuto (0-120)</label>
                    <input
                      type="number"
                      min="0" max="120"
                      required
                      className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Substitution: two separate selects */}
                {newEvent.type === 'sub' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6E6E75] mb-1 font-semibold text-red-400">↑ Jugador que SALE *</label>
                      <select
                        className="w-full bg-[#121215] border border-red-500/40 text-white p-2 rounded-lg"
                        value={newEvent.playerId}
                        onChange={(e) => setNewEvent({ ...newEvent, playerId: e.target.value })}
                        required
                      >
                        <option value="">Selecciona jugador que sale...</option>
                        {allPlayers.map(p => (
                          <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6E6E75] mb-1 font-semibold text-green-400">↓ Jugador que ENTRA *</label>
                      <select
                        className="w-full bg-[#121215] border border-green-500/40 text-white p-2 rounded-lg"
                        value={newEvent.playerInId}
                        onChange={(e) => setNewEvent({ ...newEvent, playerInId: e.target.value })}
                        required
                      >
                        <option value="">Selecciona jugador que entra...</option>
                        {allPlayers.map(p => (
                          <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-[#6E6E75] mb-1">Jugador</label>
                    <select
                      className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                      value={newEvent.playerId}
                      onChange={(e) => setNewEvent({ ...newEvent, playerId: e.target.value })}
                      required
                    >
                      <option value="">Selecciona...</option>
                      {allPlayers.map(p => (
                        <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => {
                    setShowAddEvent(false);
                    setEditingEventId(null);
                    setNewEvent({ type: 'goal', time: 0, playerId: '', playerInId: '' });
                  }} className="px-4 py-2 text-[#6E6E75] hover:text-white">Cancelar</button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#FF4B4B] text-black font-bold rounded-lg hover:bg-[#FF4B4B]/80 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Evento'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Events list ── */}
            <div className="flex flex-col gap-3">
              {!selectedMatch.events || selectedMatch.events.length === 0 ? (
                <p className="text-[#6E6E75] italic text-center py-8">No hay eventos registrados en este partido.</p>
              ) : (
                selectedMatch.events.map(ev => {
                  const p = allPlayers.find(x => x.id === ev.playerId);

                  if (ev.type === 'sub') {
                    const pIn = allPlayers.find(x => x.id === ev.playerInId);
                    return (
                      <div key={ev.id} className="flex items-center justify-between bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]/50 group">
                        <div className="flex items-center gap-4">
                          <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                          <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                          <div className="flex flex-col">
                            <span className="text-white font-medium">Cambio</span>
                            <span className="text-[#6E6E75] text-xs">
                              Sale: ({p?.number ?? '?'}) {p?.name?.split(' ')[0] ?? ev.playerId}
                              {' | '}
                              Entra: ({pIn?.number ?? '?'}) {pIn?.name?.split(' ')[0] ?? (ev.playerInId || '—')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            setEditingEventId(ev.id);
                            setNewEvent({ type: ev.type, time: Math.floor(ev.time / 60), playerId: ev.playerId || '', playerInId: ev.playerInId || '' });
                            setShowAddEvent(true);
                          }} className="text-[#6E6E75] hover:text-blue-400 p-2">
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (ev.type === 'period_end') {
                    return (
                      <div key={ev.id} className="flex items-center justify-between bg-[#FF4B4B]/5 p-4 rounded-xl border border-[#FF4B4B]/20 group">
                        <div className="flex items-center gap-4">
                          <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{ev.periodLabel}</span>
                            {ev.addedMinutes !== undefined && ev.addedMinutes > 0 && (
                              <span className="text-[#FF4B4B] text-xs font-bold">+{ev.addedMinutes} min</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  }

                  if (ev.type === 'note') {
                    return (
                      <div key={ev.id} className="flex items-center justify-between bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]/50 group">
                        <div className="flex items-center gap-4">
                          <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                          <Edit3 className="w-5 h-5 text-purple-400" />
                          <div className="flex flex-col">
                            <span className="text-purple-400 font-medium">Nota Táctica</span>
                            <span className="text-[#6E6E75] text-xs italic">"{ev.notes}"</span>
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={ev.id} className="flex items-center justify-between bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]/50 group">
                      <div className="flex items-center gap-4">
                        <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                        <div className="flex-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                          {ev.type === 'goal' && (
                            <span className="text-white font-medium flex items-center gap-1">
                              {ev.playerId === 'rival' ? '⚽ Gol Rival' : <>⚽ Gol: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></>}
                            </span>
                          )}
                          {ev.type === 'goal' && ev.assistId && (() => {
                            const assister = allPlayers.find(x => x.id === ev.assistId);
                            return (
                              <span className="text-white/70 font-medium flex items-center gap-1">
                                <span className="text-[#2A2A2E] mx-1">|</span>
                                👟 Asistencia: <span className="text-[#6E6E75]">({assister?.number}) {assister?.name?.split(' ')[0]}</span>
                              </span>
                            );
                          })()}
                          {ev.type === 'assist' && <><Handshake className="w-4 h-4 text-white" /><span className="text-white font-medium">Asistencia: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                          {ev.type === 'shot_on_target' && <span className="text-cyan-400 font-medium">🎯 Tiro a Puerta: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                          {ev.type === 'shot_off_target' && <span className="text-zinc-300 font-medium">💨 Tiro Fuera: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                          {ev.type === 'corner' && <span className="text-lime-400 font-medium">🚩 Córner: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                          {ev.type === 'offside' && <span className="text-orange-400 font-medium">🚩 Fuera de Juego: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                          {ev.type === 'foul' && <span className="text-amber-400 font-medium">⚠️ Falta: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                          {(ev.type === 'yellow' || ev.type === 'yellow_card') && <><div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" /><span className="text-white font-medium">Amarilla: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                          {(ev.type === 'red' || ev.type === 'red_card') && <><div className="w-2.5 h-3.5 bg-[#FF4B4B] rounded-sm" /><span className="text-white font-medium">Roja: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setEditingEventId(ev.id);
                          setNewEvent({ type: ev.type, time: Math.floor(ev.time / 60), playerId: ev.playerId || '', playerInId: ev.playerInId || '' });
                          setShowAddEvent(true);
                        }} className="text-[#6E6E75] hover:text-blue-400 p-2">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ESTADÍSTICAS DEL PARTIDO ── */}
        {activeTab === 'stats' && (
          <div className="flex flex-col gap-6">
            {/* Comparativa de Equipo */}
            <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#FF4B4B]" />
                  Comparativa de Equipo
                </h2>
                {!isEditingTeamStats ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTeamStats(selectedMatch.teamStats || EMPTY_TEAM_STATS);
                      setIsEditingTeamStats(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1C1C1F] border border-[#2A2A2E] text-white hover:border-[#FF4B4B]/50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#FF4B4B]" />
                    {selectedMatch.teamStats ? 'Editar Estadísticas de Equipo' : 'Registrar Estadísticas de Equipo'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingTeamStats(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#6E6E75] hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={async () => {
                        await saveHistoryWithSpinner({ ...selectedMatch, teamStats: draftTeamStats });
                        setIsEditingTeamStats(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF4B4B] text-black hover:bg-[#FF4B4B]/90 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Guardar
                    </button>
                  </div>
                )}
              </div>

              {isEditingTeamStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftTeamStats.myTeam.possession ?? 50}
                        onChange={e => {
                          const clamped = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          setDraftTeamStats(prev => ({
                            ...prev,
                            myTeam: { ...prev.myTeam, possession: clamped },
                            rival: { ...prev.rival, possession: 100 - clamped },
                          }));
                        }}
                        className="w-20 bg-[#121215] border border-emerald-500/30 rounded-lg p-1.5 text-center font-mono font-bold text-emerald-400"
                      />
                      <span className="text-xs text-[#6E6E75] font-bold">%</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] text-center min-w-[130px]">
                      Posesión (%)
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftTeamStats.rival.possession ?? 50}
                        onChange={e => {
                          const clamped = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          setDraftTeamStats(prev => ({
                            ...prev,
                            myTeam: { ...prev.myTeam, possession: 100 - clamped },
                            rival: { ...prev.rival, possession: clamped },
                          }));
                        }}
                        className="w-20 bg-[#121215] border border-[#FF4B4B]/30 rounded-lg p-1.5 text-center font-mono font-bold text-[#FF4B4B]"
                      />
                      <span className="text-xs text-[#6E6E75] font-bold">%</span>
                    </div>
                  </div>

                  {([
                    { key: 'shotsOnTarget', label: 'Tiros a puerta' },
                    { key: 'shotsOffTarget', label: 'Tiros fuera' },
                    { key: 'corners', label: 'Córners' },
                    { key: 'fouls', label: 'Faltas' },
                    { key: 'offsides', label: 'Fueras de juego' },
                  ] as { key: keyof Omit<TeamSideStats, 'possession'>; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#1C1C1F] border border-[#2A2A2E]/60 rounded-xl px-3 py-2">
                      <div>
                        <input
                          type="number"
                          min={0}
                          value={draftTeamStats.myTeam[key]}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setDraftTeamStats(prev => ({ ...prev, myTeam: { ...prev.myTeam, [key]: val } }));
                          }}
                          className="w-20 bg-[#121215] border border-[#2A2A2E] rounded-lg p-1.5 text-center font-mono font-bold text-white"
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#8E8E93] text-center min-w-[130px]">{label}</span>
                      <div className="flex justify-end">
                        <input
                          type="number"
                          min={0}
                          value={draftTeamStats.rival[key]}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setDraftTeamStats(prev => ({ ...prev, rival: { ...prev.rival, [key]: val } }));
                          }}
                          className="w-20 bg-[#121215] border border-[#2A2A2E] rounded-lg p-1.5 text-center font-mono font-bold text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <TeamStatsComparisonBars
                  teamStats={selectedMatch.teamStats || EMPTY_TEAM_STATS}
                  myTeamLabel={selectedMatch.myTeamName || activeTeam?.name || 'Nuestro Equipo'}
                  rivalLabel={selectedMatch.opponent || 'Rival'}
                />
              )}
            </div>

          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#FF4B4B]" />
              Estadísticas Individuales
              <span className="text-xs text-[#6E6E75] font-normal ml-2">(calculadas a partir del acta)</span>
            </h2>
            {convocados.length === 0 ? (
              <p className="text-[#6E6E75] italic text-center py-8">No hay jugadores convocados registrados en este partido.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-[#121215] border-b border-[#2A2A2E] text-[#6E6E75] text-xs uppercase tracking-wider">
                      <th className="py-3 px-3">Jugador</th>
                      <th className="py-3 px-3 text-center">Min.</th>
                      <th className="py-3 px-3 text-center">⚽</th>
                      <th className="py-3 px-3 text-center">👟</th>
                      <th className="py-3 px-3 text-center" title="Tiros a Puerta">🎯 T.P.</th>
                      <th className="py-3 px-3 text-center" title="Tiros Fuera">💨 T.F.</th>
                      <th className="py-3 px-3 text-center" title="Córners">🚩 Cór.</th>
                      <th className="py-3 px-3 text-center" title="Faltas">⚠️ Fal.</th>
                      <th className="py-3 px-3 text-center" title="Fueras de Juego">🛑 F.J.</th>
                      <th className="py-3 px-3 text-center">🟨</th>
                      <th className="py-3 px-3 text-center">🟥</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convocados.map(p => {
                      const s = statsMap[p.id];
                      const isStarter = (selectedMatch.squad || []).some(sp => sp.id === p.id);
                      return (
                        <tr key={p.id} className="border-b border-[#2A2A2E]/50 hover:bg-[#1C1C1F] transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[#6E6E75] text-xs w-5">{p.number}</span>
                              <span className="text-white font-medium text-sm">{p.name}</span>
                              {isStarter && <span className="text-[8px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Titular</span>}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`font-mono text-sm font-bold ${s.minutes > 0 ? 'text-white' : 'text-[#6E6E75]'}`}>{s.minutes}'</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.goals > 0 ? 'text-emerald-400' : 'text-[#6E6E75]'}`}>{s.goals > 0 ? s.goals : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.assists > 0 ? 'text-blue-400' : 'text-[#6E6E75]'}`}>{s.assists > 0 ? s.assists : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.shotsOnTarget > 0 ? 'text-cyan-400' : 'text-[#6E6E75]'}`}>{s.shotsOnTarget > 0 ? s.shotsOnTarget : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.shotsOffTarget > 0 ? 'text-zinc-300' : 'text-[#6E6E75]'}`}>{s.shotsOffTarget > 0 ? s.shotsOffTarget : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.corners > 0 ? 'text-lime-400' : 'text-[#6E6E75]'}`}>{s.corners > 0 ? s.corners : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.fouls > 0 ? 'text-amber-400' : 'text-[#6E6E75]'}`}>{s.fouls > 0 ? s.fouls : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-bold ${s.offsides > 0 ? 'text-orange-400' : 'text-[#6E6E75]'}`}>{s.offsides > 0 ? s.offsides : '–'}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {s.yellow > 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-6 bg-yellow-400 rounded-sm text-black text-xs font-black">{s.yellow}</span>
                            ) : <span className="text-[#6E6E75]">–</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {s.red > 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-6 bg-[#FF4B4B] rounded-sm text-black text-xs font-black">{s.red}</span>
                            ) : <span className="text-[#6E6E75]">–</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}

        {showBulkEvaluationModal && selectedMatch && (
          <BulkEvaluationModal
            players={[...selectedMatch.squad, ...selectedMatch.bench]}
            matchId={selectedMatch.id}
            matchDate={selectedMatch.date}
            opponent={selectedMatch.opponent}
            onComplete={(evals) => {
              setShowBulkEvaluationModal(false);
              if (evals && Object.keys(evals).length > 0) {
                const updatedPlayers = activeTeam.players.map(p => {
                  if (evals[p.id]) {
                    return {
                      ...p,
                      evaluations: [
                        {
                          matchId: selectedMatch.id,
                          date: new Date(selectedMatch.date).toLocaleDateString(),
                          opponent: selectedMatch.opponent || 'Desconocido',
                          rating: evals[p.id].rating,
                          notes: evals[p.id].notes
                        },
                        ...(p.evaluations || [])
                      ]
                    };
                  }
                  return p;
                });
                updateTeamPlayers(updatedPlayers);
              }
            }}
          />
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────
  // LIST VIEW
  // ──────────────────────────────────────────────────────
  const filteredHistory = history.filter(match => {
    if (match.teamId !== activeTeam?.id) return false;
    const matchType = match.matchType || 'Liga';
    const matchResult = match.matchResult || 'Empate';
    if (filterCompetition !== 'Todos' && matchType !== filterCompetition) return false;
    if (filterResult !== 'Todos' && matchResult !== filterResult) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#121215] p-6 rounded-2xl border border-[#2A2A2E] gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Historial de Partidos</h1>
          <p className="text-[#6E6E75]">Revisa y edita las estadísticas de partidos finalizados.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterCompetition}
            onChange={(e) => setFilterCompetition(e.target.value)}
            className="bg-[#1C1C1F] border border-[#2A2A2E] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF4B4B]/50 flex-1 md:flex-none text-sm font-medium"
          >
            <option value="Todos">Competición: Todas</option>
            <option value="Liga">Liga</option>
            <option value="Amistoso">Amistoso</option>
            <option value="Copa">Copa</option>
            <option value="Torneo">Torneo</option>
          </select>
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="bg-[#1C1C1F] border border-[#2A2A2E] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF4B4B]/50 flex-1 md:flex-none text-sm font-medium"
          >
            <option value="Todos">Resultado: Todos</option>
            <option value="Victoria">Victorias</option>
            <option value="Empate">Empates</option>
            <option value="Derrota">Derrotas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHistory.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#2A2A2E] rounded-2xl">
            <p className="text-[#6E6E75] font-semibold text-lg">No hay partidos que coincidan con los filtros</p>
            <p className="text-[#6E6E75] text-sm mt-2">Intenta cambiar las opciones de búsqueda.</p>
          </div>
        ) : (
          filteredHistory.map(match => (
            <div
              key={match.id}
              onClick={() => { setSelectedMatch(match); setActiveTab('timeline'); }}
              className={`bg-[#121215] border rounded-2xl p-6 cursor-pointer transition-all group flex flex-col relative overflow-hidden ${
                match.matchResult === 'Victoria' ? 'border-emerald-500/30 hover:border-emerald-400' :
                match.matchResult === 'Derrota' ? 'border-red-500/30 hover:border-red-400' :
                'border-gray-500/30 hover:border-gray-400'
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                match.matchResult === 'Victoria' ? 'bg-emerald-500' :
                match.matchResult === 'Derrota' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <div className="flex justify-between items-start mb-4 mt-2">
                <div className="flex gap-2 items-center">
                  <div className="text-xs font-semibold text-white bg-[#1C1C1F] px-2 py-1 rounded border border-[#2A2A2E]">
                    {match.matchType || 'Liga'}
                  </div>
                  <div className="text-xs font-semibold text-[#6E6E75]">
                    {new Date(match.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-[#6E6E75] font-mono text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTimeStr(match.duration)}
                </div>
              </div>
              <div className="text-center font-bold text-lg text-white mb-2 truncate">
                {match.condition === 'Visitante' ? '@ ' : 'vs '}{match.opponent || 'Desconocido'}
              </div>
              <div className="flex justify-center items-center gap-6 my-2">
                <span className="text-3xl font-black text-white">{match.score.home}</span>
                <span className="text-[#2A2A2E] text-2xl">-</span>
                <span className="text-3xl font-black text-white">{match.score.away}</span>
              </div>
              <div className="mt-auto pt-4 border-t border-[#2A2A2E] flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm text-[#6E6E75]">
                  <span>{match.events?.length || 0} Eventos</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSingleMatchToPDF(match, activeTeam?.players || [], activeTeam?.name);
                      }}
                      className="flex items-center gap-1 hover:text-[#FF4B4B] transition-colors"
                      title="Descargar informe de partido en PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-xs font-semibold">PDF</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteMatch(e, match.id)}
                      className="flex items-center gap-1 hover:text-red-500 transition-colors"
                      title="Eliminar partido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => openNotesModal(e, match)}
                      className={`flex items-center gap-1 hover:text-white transition-colors ${match.notes ? 'text-blue-400 hover:text-blue-300' : ''}`}
                    >
                      {match.notes ? <FileText className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      {match.notes ? 'Ver Notas' : 'Notas'}
                    </button>
                    <span className={`font-medium opacity-0 group-hover:opacity-100 transition-opacity ${
                      match.matchResult === 'Victoria' ? 'text-emerald-400' :
                      match.matchResult === 'Derrota' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>Editar →</span>
                  </div>
                </div>
                {match.notes && (
                  <div className="text-xs text-[#6E6E75] italic line-clamp-2 mt-1 bg-[#1C1C1F] p-2 rounded-lg border border-[#2A2A2E]">
                    "{match.notes}"
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notes Modal */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#121215] w-full max-w-2xl mx-auto border border-[#2A2A2E] rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {notesMatchId && history.find(m => m.id === notesMatchId)
                ? `Notas: ${history.find(m => m.id === notesMatchId)?.myTeamName || 'Mi Equipo'} vs ${history.find(m => m.id === notesMatchId)?.opponent || 'Rival'}`
                : 'Notas del Partido'
              }
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#6E6E75] mb-2 uppercase">Análisis Global</h3>
                <textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] text-white p-4 rounded-xl min-h-[200px] focus:outline-none focus:border-blue-500/50 resize-none"
                  placeholder="Escribe aquí las observaciones tácticas..."
                  autoFocus
                />
              </div>
              {notesMatchId && editableEvals.some(e => !e.isDeleted) && (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-[#6E6E75] mb-2 uppercase">Rendimiento Individual</h3>
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {editableEvals.filter(e => !e.isDeleted).map(evalItem => {
                      const p = activeTeam?.players.find(player => player.id === evalItem.playerId);
                      if (!p) return null;
                      return (
                        <div key={p.id} className="bg-[#1C1C1F] border border-[#2A2A2E] p-3 rounded-xl flex flex-col gap-2 relative group">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-sm">({p.number}) {p.name}</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min="0" max="10" step="0.5"
                                value={evalItem.rating}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditableEvals(prev => prev.map(ev => ev.playerId === p.id ? { ...ev, rating: val } : ev));
                                }}
                                className="w-14 bg-[#121215] text-white text-xs font-bold px-2 py-1 rounded border border-[#2A2A2E] focus:outline-none focus:border-blue-500 text-center"
                              />
                              <span className="text-[#6E6E75] text-xs font-bold">/10</span>
                              <button
                                onClick={() => {
                                  setEditableEvals(prev => prev.map(ev => ev.playerId === p.id ? { ...ev, isDeleted: true } : ev));
                                }}
                                className="text-[#6E6E75] hover:text-red-500 transition-colors ml-1 p-1 opacity-50 group-hover:opacity-100"
                                title="Eliminar nota"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={evalItem.notes}
                            onChange={(e) => {
                              setEditableEvals(prev => prev.map(ev => ev.playerId === p.id ? { ...ev, notes: e.target.value } : ev));
                            }}
                            className="w-full bg-[#121215] border border-[#2A2A2E] text-white text-sm p-2 rounded-lg resize-none min-h-[60px] focus:outline-none focus:border-blue-500/50"
                            placeholder="Añadir nota individual..."
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {(() => {
              const matchForNotes = notesMatchId ? history.find(m => m.id === notesMatchId) : null;
              if (!matchForNotes?.teamStats) return null;
              return (
                <div className="mt-6 bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-[#6E6E75] mb-3 uppercase flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#FF4B4B]" />
                    Estadísticas de Equipo
                  </h3>
                  <TeamStatsComparisonBars
                    teamStats={matchForNotes.teamStats}
                    myTeamLabel={matchForNotes.myTeamName || activeTeam?.name || 'Nuestro Equipo'}
                    rivalLabel={matchForNotes.opponent || 'Rival'}
                  />
                </div>
              );
            })()}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsNotesModalOpen(false)} className="px-6 py-3 bg-[#1C1C1F] text-white font-bold rounded-xl hover:bg-[#2A2A2E] transition-colors border border-[#2A2A2E]">
                Cancelar
              </button>
              <button onClick={saveNotes} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Save className="w-5 h-5" /> Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
