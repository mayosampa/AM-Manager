import React, { useState, useEffect } from 'react';
import { MatchRecord, MatchEvent, EventType, Player } from '../types';
import { Clock, Goal, Handshake, ArrowRightLeft, Trash2, Plus, Calendar, Save, ArrowLeft, FileText, Edit3, Star, BarChart2 } from 'lucide-react';
import { BulkEvaluationModal } from './BulkEvaluationModal';
import { useTeam } from '../context/TeamContext';
import { ManualMatchEntry } from './ManualMatchEntry';

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

/** Computes per-match stats for each player directly from the match events */
function computeMatchStats(match: MatchRecord) {
  const allPlayers = [...(match.squad || []), ...(match.bench || [])];
  const statsMap: Record<string, { minutes: number; goals: number; assists: number; yellow: number; red: number }> = {};

  allPlayers.forEach(p => {
    statsMap[p.id] = { minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0 };
  });

  // Minutes played: starters play full duration unless subbed off
  (match.squad || []).forEach(p => {
    if (statsMap[p.id]) statsMap[p.id].minutes = Math.round(match.duration / 60);
  });

  (match.events || []).forEach(ev => {
    if (ev.type === 'goal' && ev.playerId && ev.playerId !== 'rival' && statsMap[ev.playerId]) {
      statsMap[ev.playerId].goals += 1;
    }
    if (ev.type === 'goal' && ev.assistId && statsMap[ev.assistId]) {
      statsMap[ev.assistId].assists += 1;
    }
    if (ev.type === 'assist' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].assists += 1;
    }
    if (ev.type === 'yellow' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].yellow += 1;
    }
    if (ev.type === 'red' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].red += 1;
    }
    if (ev.type === 'sub') {
      // Player going out: their minutes = time of sub
      if (ev.playerId && statsMap[ev.playerId]) {
        statsMap[ev.playerId].minutes = Math.round(ev.time / 60);
      }
      // Player coming in: their minutes = total - time of sub
      if (ev.playerInId && statsMap[ev.playerInId]) {
        statsMap[ev.playerInId].minutes = Math.round((match.duration - ev.time) / 60);
      }
    }
  });

  return { allPlayers, statsMap };
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
      import('../services/db').then(({ db }) => {
        db.getMatches(activeTeam.id).then(matches => setHistory(matches));
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
    // Optimistic
    setHistory(prev => prev.filter(m => m.id !== matchId));
    if (selectedMatch?.id === matchId) setSelectedMatch(null);
    const { db } = await import('../services/db');
    db.deleteMatch(matchId).catch(console.error);
  };

  const deleteEvent = (match: MatchRecord, eventId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este evento?')) return;

    const eventToDelete = match.events.find(e => e.id === eventId);
    let newScore = { ...match.score };
    if (eventToDelete?.type === 'goal') {
      const isLocal = match.condition === 'Local';
      if (eventToDelete.playerId === 'rival') {
        newScore[isLocal ? 'away' : 'home'] = Math.max(0, newScore[isLocal ? 'away' : 'home'] - 1);
      } else {
        newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
      }
    }
    const newEvents = match.events.filter(e => e.id !== eventId);
    saveHistory({ ...match, events: newEvents, score: newScore });
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
    const isLocal = selectedMatch.condition === 'Local';

    if (editingEventId) {
      const oldEvent = selectedMatch.events.find(ev => ev.id === editingEventId);
      if (oldEvent?.type === 'goal') {
        newScore[isLocal ? 'home' : 'away'] = Math.max(0, newScore[isLocal ? 'home' : 'away'] - 1);
      }
    }

    if (newEvent.type === 'goal') {
      newScore[isLocal ? 'home' : 'away'] += 1;
    }

    const remainingEvents = selectedMatch.events.filter(ev => ev.id !== editingEventId);

    saveHistoryWithSpinner({
      ...selectedMatch,
      events: [newMatchEvent, ...remainingEvents].sort((a, b) => b.time - a.time),
      score: newScore,
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
              loadHistory();
              const updated = history.find(m => m.id === selectedMatch.id);
              if (updated) setSelectedMatch(updated);
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
        <div className="flex justify-between items-center w-full">
          <button
            onClick={() => setSelectedMatch(null)}
            className="flex items-center gap-2 text-[#6E6E75] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Volver al Historial
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEditingFullMatch(true)}
              className="flex items-center gap-2 bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 text-[#FF4B4B] px-4 py-2 rounded-lg hover:bg-[#FF4B4B]/20 transition-colors font-bold"
            >
              <Edit3 className="w-4 h-4" /> Editar Acta Completa
            </button>
            <button
              onClick={(e) => handleDeleteMatch(e, selectedMatch.id)}
              className="flex items-center gap-2 text-[#6E6E75] hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline">Eliminar</span>
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
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Timeline y Edición</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkEvaluationModal(true)}
                  className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-500/20 transition-colors"
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
                  className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2 rounded-lg hover:bg-[#2A2A2E] transition-colors"
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
                          {ev.type === 'yellow' && <><div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" /><span className="text-white font-medium">Amarilla: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
                          {ev.type === 'red' && <><div className="w-2.5 h-3.5 bg-[#FF4B4B] rounded-sm" /><span className="text-white font-medium">Roja: <span className="text-[#6E6E75]">({p?.number}) {p?.name?.split(' ')[0]}</span></span></>}
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
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#FF4B4B]" />
              Estadísticas del Partido
              <span className="text-xs text-[#6E6E75] font-normal ml-2">(calculadas a partir del acta)</span>
            </h2>
            {convocados.length === 0 ? (
              <p className="text-[#6E6E75] italic text-center py-8">No hay jugadores convocados registrados en este partido.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-[#121215] border-b border-[#2A2A2E] text-[#6E6E75] text-xs uppercase tracking-wider">
                      <th className="py-3 px-3">Jugador</th>
                      <th className="py-3 px-3 text-center">Min.</th>
                      <th className="py-3 px-3 text-center">⚽</th>
                      <th className="py-3 px-3 text-center">👟</th>
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
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => handleDeleteMatch(e, match.id)}
                      className="flex items-center gap-1 hover:text-red-500 transition-colors"
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
          <div className="bg-[#121215] w-full max-w-2xl mx-auto border border-[#2A2A2E] rounded-3xl p-6 shadow-2xl">
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
