import React, { useState, useEffect } from 'react';
import { MatchRecord, MatchEvent, EventType, Player, MatchTeamStats, TeamSideStats, StatMetricsConfig, DEFAULT_STAT_METRICS } from '../types';
import { Clock, Goal, Handshake, ArrowRightLeft, Trash2, Plus, Calendar, Save, ArrowLeft, FileText, FileSpreadsheet, Download, Edit3, Star, BarChart2, X, Trophy } from 'lucide-react';
import { BulkEvaluationModal } from './BulkEvaluationModal';
import { useTeam } from '../context/TeamContext';
import { ManualMatchEntry } from './ManualMatchEntry';
import { reconcileSeasonPlanWithHistory } from '../services/matchSync';
import { computeSingleMatchStats, exportSingleMatchToExcel, exportSingleMatchToPDF, getEffectiveTeamStats } from '../services/matchReportExport';

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
  statMetrics = DEFAULT_STAT_METRICS,
}: {
  teamStats: MatchTeamStats;
  myTeamLabel: string;
  rivalLabel: string;
  statMetrics?: StatMetricsConfig;
}) {
  const my = teamStats.myTeam || EMPTY_TEAM_STATS.myTeam;
  const rv = teamStats.rival || EMPTY_TEAM_STATS.rival;
  const myPoss = my.possession ?? 50;
  const rvPoss = rv.possession ?? 100 - myPoss;
  const myTotalShots = (my.shotsOnTarget || 0) + (my.shotsOffTarget || 0);
  const rvTotalShots = (rv.shotsOnTarget || 0) + (rv.shotsOffTarget || 0);

  const rows = [
    { label: 'Posesión', myVal: `${myPoss}%`, rvVal: `${rvPoss}%`, myNum: myPoss, rvNum: rvPoss, show: true },
    { label: 'Tiros Totales', myVal: String(myTotalShots), rvVal: String(rvTotalShots), myNum: myTotalShots, rvNum: rvTotalShots, show: statMetrics.shotsOnTarget || statMetrics.shotsOffTarget },
    { label: 'Tiros a Puerta', myVal: String(my.shotsOnTarget || 0), rvVal: String(rv.shotsOnTarget || 0), myNum: my.shotsOnTarget || 0, rvNum: rv.shotsOnTarget || 0, show: statMetrics.shotsOnTarget },
    { label: 'Tiros Fuera', myVal: String(my.shotsOffTarget || 0), rvVal: String(rv.shotsOffTarget || 0), myNum: my.shotsOffTarget || 0, rvNum: rv.shotsOffTarget || 0, show: statMetrics.shotsOffTarget },
    { label: 'Córners', myVal: String(my.corners || 0), rvVal: String(rv.corners || 0), myNum: my.corners || 0, rvNum: rv.corners || 0, show: statMetrics.corners },
    { label: 'Faltas', myVal: String(my.fouls || 0), rvVal: String(rv.fouls || 0), myNum: my.fouls || 0, rvNum: rv.fouls || 0, show: statMetrics.fouls },
    { label: 'Fueras de Juego', myVal: String(my.offsides || 0), rvVal: String(rv.offsides || 0), myNum: my.offsides || 0, rvNum: rv.offsides || 0, show: statMetrics.offsides },
    { label: 'Tarjetas Amarillas', myVal: String(my.yellowCards || 0), rvVal: String(rv.yellowCards || 0), myNum: my.yellowCards || 0, rvNum: rv.yellowCards || 0, show: statMetrics.cards },
    { label: 'Tarjetas Rojas', myVal: String(my.redCards || 0), rvVal: String(rv.redCards || 0), myNum: my.redCards || 0, rvNum: rv.redCards || 0, show: statMetrics.cards },
  ].filter(r => r.show);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200">
        <span className="text-emerald-700 truncate max-w-[45%]">{myTeamLabel}</span>
        <span className="text-slate-700 truncate max-w-[45%] text-right">{rivalLabel}</span>
      </div>
      {rows.map(r => {
        const total = r.myNum + r.rvNum;
        const myPct = total > 0 ? Math.round((r.myNum / total) * 100) : 50;
        const rvPct = 100 - myPct;
        return (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono tabular-nums font-bold text-emerald-700">{r.myVal}</span>
              <span className="text-slate-600 font-semibold">{r.label}</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">{r.rvVal}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
              <div
                className="h-full bg-[#059669] transition-all duration-300"
                style={{ width: `${myPct}%` }}
              />
              <div
                className="h-full bg-slate-300 transition-all duration-300"
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
  const { activeTeam, updateTeamPlayers, statMetrics } = useTeam();
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
    ownGoalSide?: 'favor' | 'contra';
  }>({ type: 'goal', time: 0, playerId: '', playerInId: '', ownGoalSide: 'favor' });

  // Notes modal
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesMatchId, setNotesMatchId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [editableEvals, setEditableEvals] = useState<{playerId: string, rating: number, notes: string, isDeleted: boolean}[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNotesModalOpen) setIsNotesModalOpen(false);
        else if (showBulkEvaluationModal) setShowBulkEvaluationModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotesModalOpen, showBulkEvaluationModal]);

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
      const teamId = matchToDelete?.teamId || activeTeam?.id;
      await db.deleteMatch(matchId, teamId);

      // Reconciliar season_plan con los partidos restantes en el historial para restaurar al calendario / Match Hub
      const rawPlan = await db.getSeasonPlan(teamId);
      const { plan, changed } = reconcileSeasonPlanWithHistory(rawPlan || {}, remainingMatches, teamId, matchToDelete);
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

    const isLocal = match.condition === 'Local';
    if (eventToDelete?.type === 'own_goal' || eventToDelete?.isOwnGoal) {
      if (eventToDelete.ownGoalSide === 'favor') {
        newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
      } else {
        newScore[isLocal ? 'away' : 'home'] = Math.max(0, newScore[isLocal ? 'away' : 'home'] - 1);
      }
    } else if (eventToDelete?.type === 'goal') {
      if (eventToDelete.playerId === 'rival') {
        newScore[isLocal ? 'away' : 'home'] = Math.max(0, newScore[isLocal ? 'away' : 'home'] - 1);
      } else {
        newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
      }
    }

    if (eventToDelete && eventToDelete.type !== 'own_goal' && !eventToDelete.isOwnGoal) {
      const statKey = getTeamStatKeyForHistoryEvent(eventToDelete.type);
      if (statKey) {
        if (eventToDelete.playerId === 'rival') {
          newTeamStats.rival[statKey] = Math.max(0, (newTeamStats.rival[statKey] || 0) - 1);
        } else if (eventToDelete.playerId && eventToDelete.playerId !== 'system') {
          newTeamStats.myTeam[statKey] = Math.max(0, (newTeamStats.myTeam[statKey] || 0) - 1);
        }
      }
    }

    const newEvents = match.events.filter(e => e.id !== eventId);
    saveHistory({ ...match, events: newEvents, score: newScore, teamStats: newTeamStats });
  };

  // ── Add event form submit
  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    const isCollective = newEvent.type === 'corner';
    const isOwnGoal = newEvent.type === 'own_goal';

    if (newEvent.type === 'sub') {
      if (!newEvent.playerId) { alert('Selecciona el jugador que SALE.'); return; }
      if (!newEvent.playerInId) { alert('Selecciona el jugador que ENTRA.'); return; }
      if (newEvent.playerId === newEvent.playerInId) { alert('El jugador que sale y el que entra no pueden ser el mismo.'); return; }
    } else if (isCollective) {
      if (!newEvent.playerId) { alert('Selecciona el equipo (Mi Equipo o Rival).'); return; }
    } else if (!isOwnGoal) {
      if (!newEvent.playerId) { alert('Selecciona un jugador.'); return; }
    }

    const ogSide = newEvent.ownGoalSide || 'favor';
    const resolvedPlayerId = isCollective
      ? (newEvent.playerId === 'rival' ? 'rival' : 'team')
      : isOwnGoal
      ? (ogSide === 'favor' ? 'rival_own_goal' : (newEvent.playerId || 'own_goal_contra'))
      : newEvent.playerId;

    const newMatchEvent: MatchEvent = {
      id: editingEventId || Math.random().toString(36).substring(2, 9),
      type: newEvent.type,
      playerId: resolvedPlayerId,
      playerInId: newEvent.type === 'sub' ? newEvent.playerInId : undefined,
      time: newEvent.time * 60,
      isOwnGoal: isOwnGoal ? true : undefined,
      ownGoalSide: isOwnGoal ? ogSide : undefined,
    };

    let newScore = { ...selectedMatch.score };
    let newTeamStats: MatchTeamStats = selectedMatch.teamStats
      ? { myTeam: { ...selectedMatch.teamStats.myTeam }, rival: { ...selectedMatch.teamStats.rival } }
      : { myTeam: { ...EMPTY_TEAM_STATS.myTeam }, rival: { ...EMPTY_TEAM_STATS.rival } };
    const isLocal = selectedMatch.condition === 'Local';

    if (editingEventId) {
      const oldEvent = selectedMatch.events.find(ev => ev.id === editingEventId);
      if (oldEvent?.type === 'own_goal' || oldEvent?.isOwnGoal) {
        if (oldEvent.ownGoalSide === 'favor') {
          newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
        } else {
          newScore[isLocal ? 'away' : 'home'] = Math.max(0, newScore[isLocal ? 'away' : 'home'] - 1);
        }
      } else if (oldEvent?.type === 'goal') {
        if (oldEvent.playerId === 'rival') {
          newScore[isLocal ? 'away' : 'home'] = Math.max(0, newScore[isLocal ? 'away' : 'home'] - 1);
        } else {
          newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
        }
      }
      if (oldEvent && oldEvent.type !== 'own_goal' && !oldEvent.isOwnGoal && oldEvent.playerId && oldEvent.playerId !== 'system') {
        const oldStatKey = getTeamStatKeyForHistoryEvent(oldEvent.type);
        if (oldStatKey) {
          if (oldEvent.playerId === 'rival') {
            newTeamStats.rival[oldStatKey] = Math.max(0, (newTeamStats.rival[oldStatKey] || 0) - 1);
          } else {
            newTeamStats.myTeam[oldStatKey] = Math.max(0, (newTeamStats.myTeam[oldStatKey] || 0) - 1);
          }
        }
      }
    }

    if (isOwnGoal) {
      if (ogSide === 'favor') {
        newScore[isLocal ? 'home' : 'away'] += 1;
      } else {
        newScore[isLocal ? 'away' : 'home'] += 1;
      }
    } else if (newEvent.type === 'goal') {
      if (resolvedPlayerId === 'rival') {
        newScore[isLocal ? 'away' : 'home'] += 1;
      } else {
        newScore[isLocal ? 'home' : 'away'] += 1;
      }
    }

    if (!isOwnGoal) {
      const addedStatKey = getTeamStatKeyForHistoryEvent(newEvent.type);
      if (addedStatKey) {
        if (resolvedPlayerId === 'rival') {
          newTeamStats.rival[addedStatKey] = (newTeamStats.rival[addedStatKey] || 0) + 1;
        } else {
          newTeamStats.myTeam[addedStatKey] = (newTeamStats.myTeam[addedStatKey] || 0) + 1;
        }
      }
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
    setNewEvent({ type: 'goal', time: 0, playerId: '', playerInId: '', ownGoalSide: 'favor' });
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

    const { allPlayers, statsMap } = computeMatchStats(selectedMatch);
    const convocados = allPlayers.filter(p => statsMap[p.id]);

    return (
      <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-20 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          <button
            onClick={() => setSelectedMatch(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold text-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" /> Volver al Historial
          </button>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => exportSingleMatchToExcel(selectedMatch, activeTeam?.players || [], activeTeam?.name, statMetrics)}
              className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-semibold text-xs sm:text-sm cursor-pointer"
              title="Exportar estadísticas completas del partido a Excel"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={() => exportSingleMatchToPDF(selectedMatch, activeTeam?.players || [], activeTeam?.name, statMetrics)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors font-semibold text-xs sm:text-sm cursor-pointer"
              title="Descargar informe completo del partido en PDF"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={() => setIsEditingFullMatch(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors font-semibold text-xs sm:text-sm cursor-pointer"
            >
              <Edit3 className="w-4 h-4 shrink-0" /> Editar Acta Completa
            </button>
            <button
              onClick={(e) => handleDeleteMatch(e, selectedMatch.id)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors px-2 py-2 cursor-pointer"
            >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Eliminar</span>
            </button>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-xs">
          <div className="flex justify-center items-center gap-12 mb-6">
            <div className="flex flex-col items-center flex-1">
              <span className="text-slate-500 font-bold uppercase mb-2 truncate max-w-[180px] text-sm">
                {selectedMatch.condition === 'Visitante' ? selectedMatch.opponent : (selectedMatch.myTeamName || activeTeam?.name || 'Local')}
              </span>
              <span className="text-6xl font-bold font-mono tabular-nums text-slate-900">{selectedMatch.score.home}</span>
            </div>
            <div className="text-slate-300 text-4xl font-mono">-</div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-slate-500 font-bold uppercase mb-2 truncate max-w-[180px] text-sm">
                {selectedMatch.condition === 'Visitante' ? (selectedMatch.myTeamName || activeTeam?.name || 'Visitante') : selectedMatch.opponent}
              </span>
              <span className="text-6xl font-bold font-mono tabular-nums text-slate-900">{selectedMatch.score.away}</span>
            </div>
          </div>
          <div className="text-slate-500 font-mono tabular-nums text-xs sm:text-sm flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(selectedMatch.date).toLocaleString()}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-slate-100 border border-slate-200 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-semibold text-sm transition-colors cursor-pointer ${activeTab === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Clock className="w-4 h-4" /> Timeline
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-semibold text-sm transition-colors cursor-pointer ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <BarChart2 className="w-4 h-4" /> Estadísticas del Partido
          </button>
        </div>

        {/* ── TAB: TIMELINE ── */}
        {activeTab === 'timeline' && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Timeline y Edición</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowBulkEvaluationModal(true)}
                  className="flex-1 sm:flex-initial justify-center flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <Star className="w-4 h-4" /> Evaluar Jugadores
                </button>
                <button
                  onClick={() => {
                    if (!showAddEvent) {
                      setEditingEventId(null);
                      setNewEvent({ type: 'goal', time: 0, playerId: '', playerInId: '', ownGoalSide: 'favor' });
                    }
                    setShowAddEvent(!showAddEvent);
                  }}
                  className="flex-1 sm:flex-initial justify-center flex items-center gap-2 bg-[#059669] border border-[#059669] text-white px-4 py-2 rounded-lg hover:bg-[#047857] transition-colors text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Añadir Evento
                </button>
              </div>
            </div>

            {/* ── Add Event Form ── */}
            {showAddEvent && (
              <form onSubmit={handleAddEventSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-col gap-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase">{editingEventId ? 'Editar Evento' : 'Nuevo Evento Manual'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Acción</label>
                    <select
                      className="w-full bg-white border border-slate-300 text-slate-900 p-2 rounded-lg focus:outline-none focus:border-[#059669]"
                      value={newEvent.type}
                      onChange={(e) => {
                        const nextType = e.target.value as EventType;
                        setNewEvent({
                          ...newEvent,
                          type: nextType,
                          playerId: (nextType === 'corner' || nextType === 'offside') ? 'team' : '',
                          playerInId: '',
                          ownGoalSide: 'favor',
                        });
                      }}
                    >
                      <option value="goal">⚽ Gol</option>
                      <option value="own_goal">⚽ Gol en Propia Puerta (P.P.)</option>
                      {statMetrics.assists && <option value="assist">👟 Asistencia</option>}
                      {statMetrics.shotsOnTarget && <option value="shot_on_target">🎯 Tiro a Puerta</option>}
                      {statMetrics.shotsOffTarget && <option value="shot_off_target">💨 Tiro Fuera</option>}
                      {statMetrics.corners && <option value="corner">🚩 Córner (Colectivo)</option>}
                      {statMetrics.offsides && <option value="offside">🏳️ Fuera de Juego (Colectivo)</option>}
                      {statMetrics.fouls && <option value="foul">⚠️ Falta</option>}
                      {statMetrics.cards && <option value="yellow">🟨 Amarilla</option>}
                      {statMetrics.cards && <option value="red">🟥 Roja</option>}
                      <option value="sub">🔄 Cambio (Sustitución)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Minuto (0-120)</label>
                    <input
                      type="number"
                      min="0" max="120"
                      required
                      className="w-full bg-white border border-slate-300 text-slate-900 p-2 rounded-lg font-mono focus:outline-none focus:border-[#059669]"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Substitution: two separate selects */}
                {newEvent.type === 'sub' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1 font-semibold text-red-600">↓ Jugador que SALE *</label>
                      <select
                        className="w-full bg-white border border-red-300 text-slate-900 p-2 rounded-lg focus:outline-none focus:border-red-500"
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
                      <label className="block text-xs mb-1 font-semibold text-emerald-700">↑ Jugador que ENTRA *</label>
                      <select
                        className="w-full bg-white border border-emerald-300 text-slate-900 p-2 rounded-lg focus:outline-none focus:border-[#059669]"
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
                ) : newEvent.type === 'corner' ? (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1.5 font-semibold">Equipo (Evento Colectivo Directo)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, playerId: 'team' })}
                        className={`py-2.5 px-4 rounded-lg font-bold text-xs border transition-all ${
                          newEvent.playerId !== 'rival'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🛡️ {selectedMatch.myTeamName || activeTeam?.name || 'Mi Equipo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, playerId: 'rival' })}
                        className={`py-2.5 px-4 rounded-lg font-bold text-xs border transition-all ${
                          newEvent.playerId === 'rival'
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚔️ {selectedMatch.opponent || 'Rival'}
                      </button>
                    </div>
                  </div>
                ) : newEvent.type === 'own_goal' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Gol en Propia (P.P.)</label>
                      <select
                        className="w-full bg-white border border-slate-300 text-slate-900 p-2 rounded-lg focus:outline-none focus:border-[#059669]"
                        value={newEvent.ownGoalSide || 'favor'}
                        onChange={(e) => setNewEvent({ ...newEvent, ownGoalSide: e.target.value as 'favor' | 'contra', playerId: '' })}
                      >
                        <option value="favor">A Favor (+1 Nuestro Marcador - P.P. del Rival)</option>
                        <option value="contra">En Contra (+1 Rival - P.P. Nuestra)</option>
                      </select>
                    </div>
                    {newEvent.ownGoalSide === 'contra' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Jugador (Opcional)</label>
                        <select
                          className="w-full bg-white border border-slate-300 text-slate-900 p-2 rounded-lg focus:outline-none focus:border-[#059669]"
                          value={newEvent.playerId}
                          onChange={(e) => setNewEvent({ ...newEvent, playerId: e.target.value })}
                        >
                          <option value="">Genérico: Gol en Propia (P.P.)</option>
                          {allPlayers.map(p => (
                            <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Jugador / Equipo</label>
                    <select
                      className="w-full bg-white border border-slate-300 text-slate-900 p-2 rounded-lg focus:outline-none focus:border-[#059669]"
                      value={newEvent.playerId}
                      onChange={(e) => setNewEvent({ ...newEvent, playerId: e.target.value })}
                      required
                    >
                      <option value="">Selecciona...</option>
                      <option value="rival">⚔️ Equipo Rival ({selectedMatch.opponent || 'Rival'})</option>
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
                    setNewEvent({ type: 'goal', time: 0, playerId: '', playerInId: '', ownGoalSide: 'favor' });
                  }} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium">Cancelar</button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#059669] text-white font-semibold rounded-lg hover:bg-[#047857] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Evento'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Events list ── */}
            <div className="flex flex-col gap-3">
              {!selectedMatch.events || selectedMatch.events.length === 0 ? (
                <p className="text-slate-500 italic text-center py-8">No hay eventos registrados en este partido.</p>
              ) : (
                selectedMatch.events.map(ev => {
                  const p = allPlayers.find(x => x.id === ev.playerId);

                  if (ev.type === 'sub') {
                    const pIn = allPlayers.find(x => x.id === ev.playerInId);
                    return (
                      <div key={ev.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-md border border-slate-200 group">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-700 font-mono tabular-nums font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-medium">Cambio</span>
                            <span className="text-slate-500 text-xs">
                              Sale: ({p?.number ?? '?'}) {p?.name?.split(' ')[0] ?? ev.playerId}
                              {' | '}
                              Entra: ({pIn?.number ?? '?'}) {pIn?.name?.split(' ')[0] ?? (ev.playerInId || '—')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            setEditingEventId(ev.id);
                            setNewEvent({ type: ev.type, time: Math.floor(ev.time / 60), playerId: ev.playerId || '', playerInId: ev.playerInId || '', ownGoalSide: ev.ownGoalSide || 'favor' });
                            setShowAddEvent(true);
                          }} className="text-slate-400 hover:text-blue-600 p-2">
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-slate-400 hover:text-red-600 p-2">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (ev.type === 'period_end') {
                    return (
                      <div key={ev.id} className="flex items-center justify-between bg-slate-100 p-4 rounded-md border border-slate-200 group">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-700 font-mono tabular-nums font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-bold">{ev.periodLabel}</span>
                            {ev.addedMinutes !== undefined && ev.addedMinutes > 0 && (
                              <span className="text-slate-600 text-xs font-bold">+{ev.addedMinutes} min</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-slate-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  }

                  if (ev.type === 'note') {
                    return (
                      <div key={ev.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-md border border-slate-200 group">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-700 font-mono tabular-nums font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                          <Edit3 className="w-5 h-5 text-purple-700" />
                          <div className="flex flex-col">
                            <span className="text-purple-700 font-medium">Nota Táctica</span>
                            <span className="text-slate-600 text-xs italic">"{ev.notes}"</span>
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-slate-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={ev.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-md border border-slate-200 group">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-700 font-mono tabular-nums font-bold text-sm min-w-[50px]">[{formatTimeStr(ev.time)}]</span>
                        <div className="flex-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                          {(ev.type === 'own_goal' || ev.isOwnGoal) ? (
                            ev.ownGoalSide === 'favor' ? (
                              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                                ⚽ Gol (P.P.) a favor ({selectedMatch.opponent || 'Rival'})
                              </span>
                            ) : (
                              <span className="text-rose-700 font-medium flex items-center gap-1.5">
                                ⚽ Gol (P.P.) en contra {p ? `((${p.number}) ${p.name.split(' ')[0]})` : ''}
                              </span>
                            )
                          ) : ev.playerId === 'rival' ? (
                            <span className="text-red-700 font-medium flex items-center gap-1.5 flex-wrap">
                              {ev.type === 'goal' && <>⚽ Gol de {selectedMatch.opponent || 'Rival'}</>}
                              {ev.type === 'shot_on_target' && <>🎯 Tiro a Puerta ({selectedMatch.opponent || 'Rival'})</>}
                              {ev.type === 'shot_off_target' && <>💨 Tiro Fuera ({selectedMatch.opponent || 'Rival'})</>}
                              {ev.type === 'corner' && <>🚩 Córner ({selectedMatch.opponent || 'Rival'})</>}
                              {ev.type === 'offside' && <>🏳️ Fuera de Juego ({selectedMatch.opponent || 'Rival'})</>}
                              {ev.type === 'foul' && <>⚠️ Falta ({selectedMatch.opponent || 'Rival'})</>}
                              {(ev.type === 'yellow' || ev.type === 'yellow_card') && <><div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm border border-amber-500/40" /> Amarilla ({selectedMatch.opponent || 'Rival'})</>}
                              {(ev.type === 'red' || ev.type === 'red_card') && <><div className="w-2.5 h-3.5 bg-red-600 rounded-sm" /> Roja ({selectedMatch.opponent || 'Rival'})</>}
                            </span>
                          ) : (
                            <>
                              {ev.type === 'goal' && (
                                <span className="text-slate-900 font-medium flex items-center gap-1">
                                  ⚽ Gol: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span>
                                </span>
                              )}
                              {ev.type === 'goal' && ev.assistId && (() => {
                                const assister = allPlayers.find(x => x.id === ev.assistId);
                                return (
                                  <span className="text-slate-600 font-medium flex items-center gap-1">
                                    <span className="text-slate-300 mx-1">|</span>
                                    👟 Asistencia: <span className="text-slate-600">({assister?.number}) {assister?.name?.split(' ')[0]}</span>
                                  </span>
                                );
                              })()}
                              {ev.type === 'assist' && <><Handshake className="w-4 h-4 text-slate-700" /><span className="text-slate-900 font-medium">Asistencia: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                              {ev.type === 'shot_on_target' && <span className="text-cyan-700 font-medium">🎯 Tiro a Puerta: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                              {ev.type === 'shot_off_target' && <span className="text-slate-700 font-medium">💨 Tiro Fuera: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                              {ev.type === 'corner' && (
                                <span className="text-emerald-700 font-medium">
                                  🚩 Córner: <span className="text-slate-600">{p ? `(${p.number}) ${p.name.split(' ')[0]}` : (selectedMatch.myTeamName || activeTeam?.name || 'Nuestro Equipo')}</span>
                                </span>
                              )}
                              {ev.type === 'offside' && (
                                <span className="text-orange-700 font-medium">
                                  🏳️ Fuera de Juego: <span className="text-slate-600">{p ? `(${p.number}) ${p.name.split(' ')[0]}` : (selectedMatch.myTeamName || activeTeam?.name || 'Nuestro Equipo')}</span>
                                </span>
                              )}
                              {ev.type === 'foul' && <span className="text-amber-700 font-medium">⚠️ Falta: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span></span>}
                              {(ev.type === 'yellow' || ev.type === 'yellow_card') && <><div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm border border-amber-500/40" /><span className="text-slate-900 font-medium">Amarilla: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                              {(ev.type === 'red' || ev.type === 'red_card') && <><div className="w-2.5 h-3.5 bg-red-600 rounded-sm" /><span className="text-slate-900 font-medium">Roja: <span className="text-slate-600">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setEditingEventId(ev.id);
                          setNewEvent({
                            type: (ev.type === 'own_goal' || ev.isOwnGoal) ? 'own_goal' : ev.type,
                            time: Math.floor(ev.time / 60),
                            playerId: ev.playerId || '',
                            playerInId: ev.playerInId || '',
                            ownGoalSide: ev.ownGoalSide || 'favor',
                          });
                          setShowAddEvent(true);
                        }} className="text-slate-400 hover:text-blue-600 p-2">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-slate-400 hover:text-red-600 p-2">
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
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-slate-700" />
                  Comparativa de Equipo
                </h2>
                {!isEditingTeamStats ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTeamStats(getEffectiveTeamStats(selectedMatch));
                      setIsEditingTeamStats(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    {selectedMatch.teamStats ? 'Editar Estadísticas de Equipo' : 'Registrar Estadísticas de Equipo'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingTeamStats(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#059669] text-white hover:bg-[#047857] transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Guardar
                    </button>
                  </div>
                )}
              </div>

              {isEditingTeamStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-slate-50 border border-slate-200 rounded-md p-3">
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
                        className="w-20 bg-white border border-emerald-300 rounded-lg p-1.5 text-center font-mono font-bold text-emerald-700"
                      />
                      <span className="text-xs text-slate-500 font-bold">%</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center min-w-[130px]">
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
                        className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center font-mono font-bold text-slate-900"
                      />
                      <span className="text-xs text-slate-500 font-bold">%</span>
                    </div>
                  </div>

                  {([
                    { key: 'shotsOnTarget', label: 'Tiros a puerta', enabled: statMetrics.shotsOnTarget },
                    { key: 'shotsOffTarget', label: 'Tiros fuera', enabled: statMetrics.shotsOffTarget },
                    { key: 'corners', label: 'Córners', enabled: statMetrics.corners },
                    { key: 'fouls', label: 'Faltas', enabled: statMetrics.fouls },
                    { key: 'offsides', label: 'Fueras de juego', enabled: statMetrics.offsides },
                    { key: 'yellowCards', label: 'Tarjetas amarillas', enabled: statMetrics.cards },
                    { key: 'redCards', label: 'Tarjetas rojas', enabled: statMetrics.cards },
                  ] as { key: keyof Omit<TeamSideStats, 'possession'>; label: string; enabled: boolean }[])
                    .filter(item => item.enabled)
                    .map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                      <div>
                        <input
                          type="number"
                          min={0}
                          value={draftTeamStats.myTeam[key]}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setDraftTeamStats(prev => ({ ...prev, myTeam: { ...prev.myTeam, [key]: val } }));
                          }}
                          className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center font-mono font-bold text-slate-900"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 text-center min-w-[130px]">{label}</span>
                      <div className="flex justify-end">
                        <input
                          type="number"
                          min={0}
                          value={draftTeamStats.rival[key]}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setDraftTeamStats(prev => ({ ...prev, rival: { ...prev.rival, [key]: val } }));
                          }}
                          className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <TeamStatsComparisonBars
                  teamStats={getEffectiveTeamStats(selectedMatch)}
                  myTeamLabel={selectedMatch.myTeamName || activeTeam?.name || 'Nuestro Equipo'}
                  rivalLabel={selectedMatch.opponent || 'Rival'}
                  statMetrics={statMetrics}
                />
              )}
            </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-slate-700" />
              Estadísticas Individuales
              <span className="text-xs text-slate-500 font-normal ml-2">(calculadas a partir del acta)</span>
            </h2>
            {convocados.length === 0 ? (
              <p className="text-slate-500 italic text-center py-8">No hay jugadores convocados registrados en este partido.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="py-3 px-3 sticky left-0 bg-slate-50 z-20">Jugador</th>
                      {statMetrics.minutes && <th className="py-3 px-3 text-center">Min.</th>}
                      <th className="py-3 px-3 text-center">⚽</th>
                      {statMetrics.assists && <th className="py-3 px-3 text-center">👟</th>}
                      {statMetrics.shotsOnTarget && <th className="py-3 px-3 text-center" title="Tiros a Puerta">🎯 T.P.</th>}
                      {statMetrics.shotsOffTarget && <th className="py-3 px-3 text-center" title="Tiros Fuera">💨 T.F.</th>}
                      {statMetrics.fouls && <th className="py-3 px-3 text-center" title="Faltas">⚠️ Fal.</th>}
                      {statMetrics.offsides && <th className="py-3 px-3 text-center" title="Fueras de Juego">🏳️ F.J.</th>}
                      {statMetrics.cards && <th className="py-3 px-3 text-center">🟨</th>}
                      {statMetrics.cards && <th className="py-3 px-3 text-center">🟥</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {convocados.map(p => {
                      const s = statsMap[p.id];
                      const isStarter = s.isStarter;
                      return (
                        <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-mono tabular-nums text-xs w-5">{p.number}</span>
                              <span className="text-slate-900 font-medium text-sm">{p.name}</span>
                              {isStarter && <span className="text-[8px] font-bold uppercase bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">Titular</span>}
                            </div>
                          </td>
                          {statMetrics.minutes && (
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-mono tabular-nums text-sm font-bold ${s.minutes > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{s.minutes}'</span>
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-center">
                            <span className={`font-mono tabular-nums text-sm font-bold ${s.goals > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{s.goals > 0 ? s.goals : '–'}</span>
                          </td>
                          {statMetrics.assists && (
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-mono tabular-nums text-sm font-bold ${s.assists > 0 ? 'text-blue-700' : 'text-slate-400'}`}>{s.assists > 0 ? s.assists : '–'}</span>
                            </td>
                          )}
                          {statMetrics.shotsOnTarget && (
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-mono tabular-nums text-sm font-bold ${s.shotsOnTarget > 0 ? 'text-cyan-700' : 'text-slate-400'}`}>{s.shotsOnTarget > 0 ? s.shotsOnTarget : '–'}</span>
                            </td>
                          )}
                          {statMetrics.shotsOffTarget && (
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-mono tabular-nums text-sm font-bold ${s.shotsOffTarget > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{s.shotsOffTarget > 0 ? s.shotsOffTarget : '–'}</span>
                            </td>
                          )}
                          {statMetrics.fouls && (
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-mono tabular-nums text-sm font-bold ${s.fouls > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{s.fouls > 0 ? s.fouls : '–'}</span>
                            </td>
                          )}
                          {statMetrics.offsides && (
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-mono tabular-nums text-sm font-bold ${s.offsides > 0 ? 'text-orange-700' : 'text-slate-400'}`}>{s.offsides > 0 ? s.offsides : '–'}</span>
                            </td>
                          )}
                          {statMetrics.cards && (
                            <td className="py-2.5 px-3 text-center">
                              {s.yellow > 0 ? (
                                <span className="inline-flex items-center justify-center w-5 h-6 bg-yellow-400 border border-amber-500/40 rounded-sm text-black text-xs font-mono font-bold">{s.yellow}</span>
                              ) : <span className="text-slate-400">–</span>}
                            </td>
                          )}
                          {statMetrics.cards && (
                            <td className="py-2.5 px-3 text-center">
                              {s.red > 0 ? (
                                <span className="inline-flex items-center justify-center w-5 h-6 bg-red-600 rounded-sm text-white text-xs font-mono font-bold">{s.red}</span>
                              ) : <span className="text-slate-400">–</span>}
                            </td>
                          )}
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

  // Quick KPIs for filtered matches
  const kpiSummary = filteredHistory.reduce(
    (acc, m) => {
      acc.total += 1;
      if (m.matchResult === 'Victoria') acc.wins += 1;
      else if (m.matchResult === 'Derrota') acc.losses += 1;
      else acc.draws += 1;

      const isAway = m.condition === 'Visitante';
      const gf = isAway ? (m.score?.away || 0) : (m.score?.home || 0);
      const ga = isAway ? (m.score?.home || 0) : (m.score?.away || 0);
      acc.gf += gf;
      acc.ga += ga;
      return acc;
    },
    { total: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto px-4 sm:px-6 pb-20">
      {/* Unified Header + Quick KPIs */}
      <div className="flex flex-col gap-5 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Trophy className="w-6 h-6 text-[#059669]" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historial de Partidos</h1>
            </div>
            <p className="text-sm text-slate-600">Revisa, edita y exporta las actas y estadísticas de los partidos disputados.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select
              value={filterCompetition}
              onChange={(e) => setFilterCompetition(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 px-3.5 py-2 rounded-lg focus:outline-none focus:border-[#059669] flex-1 sm:flex-none text-xs sm:text-sm font-semibold"
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
              className="bg-white border border-slate-300 text-slate-900 px-3.5 py-2 rounded-lg focus:outline-none focus:border-[#059669] flex-1 sm:flex-none text-xs sm:text-sm font-semibold"
            >
              <option value="Todos">Resultado: Todos</option>
              <option value="Victoria">Victorias</option>
              <option value="Empate">Empates</option>
              <option value="Derrota">Derrotas</option>
            </select>
          </div>
        </div>

        {/* Quick KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Partidos</span>
            <span className="font-mono tabular-nums text-lg font-bold text-slate-900">{kpiSummary.total}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Victorias</span>
            <span className="font-mono tabular-nums text-lg font-bold text-emerald-700">{kpiSummary.wins}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Empates</span>
            <span className="font-mono tabular-nums text-lg font-bold text-slate-800">{kpiSummary.draws}</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Derrotas</span>
            <span className="font-mono tabular-nums text-lg font-bold text-rose-700">{kpiSummary.losses}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Goles (GF / GC)</span>
            <span className="font-mono tabular-nums text-base font-bold text-slate-900">
              <span className="text-emerald-700">{kpiSummary.gf}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-rose-700">{kpiSummary.ga}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredHistory.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-300 rounded-lg bg-white">
            <p className="text-slate-700 font-semibold text-lg">No hay partidos que coincidan con los filtros</p>
            <p className="text-slate-500 text-sm mt-2">Intenta cambiar las opciones de búsqueda.</p>
          </div>
        ) : (
          filteredHistory.map(match => (
            <div
              key={match.id}
              onClick={() => { setSelectedMatch(match); setActiveTab('timeline'); }}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-5 cursor-pointer transition-all group flex flex-col relative overflow-hidden shadow-xs"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                match.matchResult === 'Victoria' ? 'bg-[#059669]' :
                match.matchResult === 'Derrota' ? 'bg-rose-500' :
                'bg-slate-400'
              }`} />
              <div className="flex justify-between items-center mb-4 mt-1">
                <div className="flex gap-2 items-center">
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px] uppercase font-semibold px-2.5 py-0.5 rounded-md">
                    {match.matchType || 'Liga'}
                  </span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-slate-500">
                    {new Date(match.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-slate-500 font-mono tabular-nums text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTimeStr(match.duration)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 my-3 px-2 py-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase text-slate-600 truncate w-full text-center mb-1">
                    {match.condition === 'Visitante' ? (match.opponent || 'Rival') : (match.myTeamName || activeTeam?.name || 'Local')}
                  </span>
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">{match.score.home}</span>
                </div>
                <span className="text-slate-400 font-mono text-xl font-bold">:</span>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase text-slate-600 truncate w-full text-center mb-1">
                    {match.condition === 'Visitante' ? (match.myTeamName || activeTeam?.name || 'Visitante') : (match.opponent || 'Rival')}
                  </span>
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">{match.score.away}</span>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-slate-200 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="font-mono tabular-nums">{match.events?.length || 0} eventos</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSingleMatchToPDF(match, activeTeam?.players || [], activeTeam?.name, statMetrics);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                      title="Descargar informe de partido en PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">PDF</span>
                    </button>
                    <button
                      onClick={(e) => openNotesModal(e, match)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Notas del partido"
                    >
                      {match.notes ? <FileText className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-semibold">{match.notes ? 'Notas' : 'Nota'}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteMatch(e, match.id)}
                      className="p-1.5 rounded bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Eliminar partido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {match.notes && (
                  <div className="text-xs text-slate-600 italic line-clamp-2 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
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
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-white w-full max-w-2xl mx-auto border border-slate-200 rounded-lg p-6 shadow-lg relative">
            <button
              onClick={() => setIsNotesModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#059669]" />
              {notesMatchId && history.find(m => m.id === notesMatchId)
                ? `Notas: ${history.find(m => m.id === notesMatchId)?.myTeamName || 'Mi Equipo'} vs ${history.find(m => m.id === notesMatchId)?.opponent || 'Rival'}`
                : 'Notas del Partido'
              }
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase">Análisis Global</h3>
                <textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 p-4 rounded-md min-h-[200px] focus:outline-none focus:border-[#059669] resize-none"
                  placeholder="Escribe aquí las observaciones tácticas..."
                  autoFocus
                />
              </div>
              {notesMatchId && editableEvals.some(e => !e.isDeleted) && (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase">Rendimiento Individual</h3>
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {editableEvals.filter(e => !e.isDeleted).map(evalItem => {
                      const p = activeTeam?.players.find(player => player.id === evalItem.playerId);
                      if (!p) return null;
                      return (
                        <div key={p.id} className="bg-slate-50 border border-slate-200 p-3 rounded-md flex flex-col gap-2 relative group">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 text-sm">({p.number}) {p.name}</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min="0" max="10" step="0.5"
                                value={evalItem.rating}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditableEvals(prev => prev.map(ev => ev.playerId === p.id ? { ...ev, rating: val } : ev));
                                }}
                                className="w-14 bg-white text-slate-900 text-xs font-bold px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-[#059669] text-center"
                              />
                              <span className="text-slate-500 text-xs font-bold">/10</span>
                              <button
                                onClick={() => {
                                  setEditableEvals(prev => prev.map(ev => ev.playerId === p.id ? { ...ev, isDeleted: true } : ev));
                                }}
                                className="text-slate-400 hover:text-red-600 transition-colors ml-1 p-1 opacity-50 group-hover:opacity-100"
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
                            className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm p-2 rounded-lg resize-none min-h-[60px] focus:outline-none focus:border-[#059669]"
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
              if (!matchForNotes) return null;
              return (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-slate-700" />
                    Estadísticas de Equipo
                  </h3>
                  <TeamStatsComparisonBars
                    teamStats={getEffectiveTeamStats(matchForNotes)}
                    myTeamLabel={matchForNotes.myTeamName || activeTeam?.name || 'Nuestro Equipo'}
                    rivalLabel={matchForNotes.opponent || 'Rival'}
                    statMetrics={statMetrics}
                  />
                </div>
              );
            })()}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsNotesModalOpen(false)} className="px-6 py-2.5 bg-white text-slate-700 font-semibold rounded-md hover:bg-slate-50 transition-colors border border-slate-200 cursor-pointer">
                Cancelar
              </button>
              <button onClick={saveNotes} className="px-6 py-2.5 bg-[#059669] text-white font-semibold rounded-md hover:bg-[#047857] transition-colors flex items-center gap-2 cursor-pointer">
                <Save className="w-4 h-4" /> Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
