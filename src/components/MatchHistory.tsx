import React, { useState, useEffect } from 'react';
import { MatchRecord, MatchEvent, EventType, Player } from '../types';
import { Clock, Goal, Handshake, ArrowRightLeft, Trash2, Plus, Calendar, Save, ArrowLeft, FileText, Edit3, Star } from 'lucide-react';
import { BulkEvaluationModal } from './BulkEvaluationModal';
import { useTeam } from '../context/TeamContext';

interface MatchHistoryProps {
  onNavigate: (view: any) => void;
}

export function MatchHistory({ onNavigate }: MatchHistoryProps) {
  const { activeTeam, updateTeamPlayers } = useTeam();
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  
  const [filterCompetition, setFilterCompetition] = useState('Todos');
  const [filterResult, setFilterResult] = useState('Todos');
  const [showBulkEvaluationModal, setShowBulkEvaluationModal] = useState(false);

  // States for adding a new event manually
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<{ type: EventType; time: number; playerId: string; playerInId?: string }>({
    type: 'goal',
    time: 0,
    playerId: ''
  });

  // Notes Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesMatchId, setNotesMatchId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState("");


  useEffect(() => {
    if (activeTeam?.id) {
      import('../services/db').then(({ db }) => {
        db.getMatches(activeTeam.id).then(matches => setHistory(matches));
      });
    } else {
      setHistory([]);
    }
  }, [activeTeam?.id]);

  const saveHistory = async (updatedMatch: MatchRecord) => {
    const newHistory = history.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    setHistory(newHistory);
    
    const { db } = await import('../services/db');
    await db.saveMatch(updatedMatch);
    
    if (selectedMatch?.id === updatedMatch.id) {
      setSelectedMatch(updatedMatch);
    }
  };

  const openNotesModal = (e: React.MouseEvent, match: MatchRecord) => {
    e.stopPropagation();
    setNotesMatchId(match.id);
    setCurrentNotes(match.notes || "");
    setIsNotesModalOpen(true);
  };

  const saveNotes = () => {
    if (!notesMatchId) return;
    const matchToUpdate = history.find(m => m.id === notesMatchId);
    if (matchToUpdate) {
      saveHistory({ ...matchToUpdate, notes: currentNotes });
    }
    setIsNotesModalOpen(false);
    setNotesMatchId(null);
  };

  const handleDeleteMatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que quieres eliminar TODO el historial de este partido? Esta acción no se puede deshacer.")) return;
    
    const { db } = await import('../services/db');
    await db.deleteMatch(matchId);
    setHistory(prev => prev.filter(m => m.id !== matchId));
    if (selectedMatch?.id === matchId) {
      setSelectedMatch(null);
    }
  };

  const deleteEvent = (match: MatchRecord, eventId: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este evento?")) return;

    const eventToDelete = match.events.find(e => e.id === eventId);
    let newScore = { ...match.score };
    if (eventToDelete?.type === 'goal') {
      const isLocal = match.condition === 'Local';
      if (eventToDelete.playerId === 'rival') {
        if (isLocal) {
          newScore.away = Math.max(0, newScore.away - 1);
        } else {
          newScore.home = Math.max(0, newScore.home - 1);
        }
      } else {
        if (isLocal) {
          newScore.home = Math.max(0, newScore.home - 1);
        } else {
          newScore.away = Math.max(0, newScore.away - 1);
        }
      }
    }

    const newEvents = match.events.filter(e => e.id !== eventId);
    saveHistory({ ...match, events: newEvents, score: newScore });
  };

  const formatTimeStr = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    if (!newEvent.playerId) {
      alert("Selecciona un jugador.");
      return;
    }

    const newMatchEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type: newEvent.type,
      playerId: newEvent.playerId,
      playerInId: newEvent.playerInId,
      time: newEvent.time * 60, // Convert minutes to seconds for internal storage
    };

    let newScore = { ...selectedMatch.score };
    if (newEvent.type === 'goal') {
      const isLocal = selectedMatch.condition === 'Local';
      if (isLocal) {
        newScore.home += 1;
      } else {
        newScore.away += 1;
      }
    }

    saveHistory({ 
      ...selectedMatch, 
      events: [newMatchEvent, ...selectedMatch.events].sort((a, b) => b.time - a.time),
      score: newScore 
    });

    setShowAddEvent(false);
    setNewEvent({ type: 'goal', time: 0, playerId: '' });
  };

  if (selectedMatch) {
    const allPlayers = [...(selectedMatch.squad || []), ...(selectedMatch.bench || [])];

    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 p-6">
        <div className="flex justify-between items-center w-full">
          <button 
            onClick={() => setSelectedMatch(null)} 
            className="flex items-center gap-2 text-[#6E6E75] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Volver al Historial
          </button>
          <button 
            onClick={(e) => handleDeleteMatch(e, selectedMatch.id)}
            className="flex items-center gap-2 text-[#6E6E75] hover:text-red-500 transition-colors"
            title="Eliminar partido definitivamente"
          >
            <Trash2 className="w-5 h-5" />
            <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>

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
                onClick={() => setShowAddEvent(!showAddEvent)}
                className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2 rounded-lg hover:bg-[#2A2A2E] transition-colors"
              >
                <Plus className="w-4 h-4 text-[#FF4B4B]" /> Añadir Evento
              </button>
            </div>
          </div>

          {showAddEvent && (
            <form onSubmit={handleAddEventSubmit} className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E] mb-6 flex flex-col gap-4">
              <h3 className="font-bold text-[#FF4B4B] text-sm uppercase">Nuevo Evento Manual</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#6E6E75] mb-1">Tipo de Acción</label>
                  <select 
                    className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({...newEvent, type: e.target.value as EventType})}
                  >
                    <option value="goal">Gol</option>
                    <option value="assist">Asistencia</option>
                    <option value="yellow">Amarilla</option>
                    <option value="red">Roja</option>
                    <option value="sub">Cambio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#6E6E75] mb-1">Minuto (0-120)</label>
                  <input 
                    type="number" 
                    min="0" max="120"
                    className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6E6E75] mb-1">Jugador Principal</label>
                  <select 
                    className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                    value={newEvent.playerId}
                    onChange={(e) => setNewEvent({...newEvent, playerId: e.target.value})}
                    required
                  >
                    <option value="">Selecciona...</option>
                    {allPlayers.map(p => (
                      <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {newEvent.type === 'sub' && (
                <div>
                  <label className="block text-xs text-[#6E6E75] mb-1">Jugador que Entra</label>
                  <select 
                    className="w-full bg-[#121215] border border-[#2A2A2E] text-white p-2 rounded-lg"
                    value={newEvent.playerInId}
                    onChange={(e) => setNewEvent({...newEvent, playerInId: e.target.value})}
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
                <button type="button" onClick={() => setShowAddEvent(false)} className="px-4 py-2 text-[#6E6E75] hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#FF4B4B] text-black font-bold rounded-lg hover:bg-[#FF4B4B]/80 transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar Evento
                </button>
              </div>
            </form>
          )}

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
                        <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                          [{formatTimeStr(ev.time)}]
                        </span>
                        <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                        <div className="flex flex-col">
                          <span className="text-white font-medium">Cambio</span>
                          <span className="text-[#6E6E75] text-xs">
                            Sale: ({p?.number}) {p?.name.split(' ')[0]} | Entra: ({pIn?.number}) {pIn?.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                if (ev.type === 'period_end') {
                  return (
                    <div key={ev.id} className="flex items-center justify-between bg-[#FF4B4B]/5 p-4 rounded-xl border border-[#FF4B4B]/20 group">
                      <div className="flex items-center gap-4">
                        <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                          [{formatTimeStr(ev.time)}]
                        </span>
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{ev.periodLabel}</span>
                          {ev.addedMinutes !== undefined && ev.addedMinutes > 0 && (
                            <span className="text-[#FF4B4B] text-xs font-bold">+{ev.addedMinutes} min</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                if (ev.type === 'note') {
                  return (
                    <div key={ev.id} className="flex items-center justify-between bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]/50 group">
                      <div className="flex items-center gap-4">
                        <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                          [{formatTimeStr(ev.time)}]
                        </span>
                        <Edit3 className="w-5 h-5 text-purple-400" />
                        <div className="flex flex-col">
                          <span className="text-purple-400 font-medium">Nota Táctica</span>
                          <span className="text-[#6E6E75] text-xs italic">"{ev.notes}"</span>
                        </div>
                      </div>
                      <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={ev.id} className="flex items-center justify-between bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]/50 group">
                    <div className="flex items-center gap-4">
                      <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                        [{formatTimeStr(ev.time)}]
                      </span>
                      <div className="flex-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                        {ev.type === 'goal' && (
                          <span className="text-white font-medium flex items-center gap-1">
                            ⚽ Gol: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span>
                          </span>
                        )}
                        
                        {ev.type === 'goal' && ev.assistId && (() => {
                          const assister = [...selectedMatch.squad, ...selectedMatch.bench].find(x => x.id === ev.assistId);
                          return (
                            <span className="text-white/70 font-medium flex items-center gap-1">
                              <span className="text-[#2A2A2E] mx-1">|</span>
                              👟 Asistencia: <span className="text-[#6E6E75]">({assister?.number}) {assister?.name.split(' ')[0]}</span>
                            </span>
                          );
                        })()}
                        
                        {ev.type === 'assist' && <><Handshake className="w-4 h-4 text-white" /><span className="text-white font-medium">Asistencia: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                        {ev.type === 'yellow' && <><div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" /><span className="text-white font-medium">Amarilla: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                        {ev.type === 'red' && <><div className="w-2.5 h-3.5 bg-[#FF4B4B] rounded-sm" /><span className="text-white font-medium">Roja: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(selectedMatch, ev.id)} className="text-[#6E6E75] hover:text-[#FF4B4B] p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
              onClick={() => setSelectedMatch(match)}
              className={`bg-[#121215] border rounded-2xl p-6 cursor-pointer transition-all group flex flex-col relative overflow-hidden ${
                match.matchResult === 'Victoria' ? 'border-emerald-500/30 hover:border-emerald-400' :
                match.matchResult === 'Derrota' ? 'border-red-500/30 hover:border-red-400' :
                'border-gray-500/30 hover:border-gray-400'
              }`}
            >
              {/* Top border indicator */}
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
          <div className="bg-[#121215] w-full max-w-2xl mx-auto border border-[#2A2A2E] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> 
              {notesMatchId && history.find(m => m.id === notesMatchId) ? 
                `Notas: ${history.find(m => m.id === notesMatchId)?.myTeamName || 'Mi Equipo'} vs ${history.find(m => m.id === notesMatchId)?.opponent || 'Rival'}` 
                : 'Notas del Partido'
              }
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#6E6E75] mb-2 uppercase">Análisis Global</h3>
                <textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] text-white p-4 rounded-xl min-h-[200px] h-[calc(100%-32px)] focus:outline-none focus:border-blue-500/50 resize-none"
                  placeholder="Escribe aquí las observaciones tácticas, rendimiento individual o general del equipo..."
                  autoFocus
                />
              </div>
              
              {notesMatchId && activeTeam.players.some(p => p.evaluations?.some(e => e.matchId === notesMatchId)) && (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-[#6E6E75] mb-2 uppercase">Rendimiento Individual</h3>
                  <div className="flex flex-col gap-2 max-h-[200px] md:max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {activeTeam.players
                      .filter(p => p.evaluations?.some(e => e.matchId === notesMatchId))
                      .map(p => {
                        const evalData = p.evaluations?.find(e => e.matchId === notesMatchId);
                        if (!evalData) return null;
                        return (
                          <div key={p.id} className="bg-[#1C1C1F] border border-[#2A2A2E] p-3 rounded-xl flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white text-sm">({p.number}) {p.name}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${evalData.rating >= 7 ? 'bg-emerald-500/20 text-emerald-400' : evalData.rating >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#FF4B4B]/20 text-[#FF4B4B]'}`}>
                                ⭐ {evalData.rating}/10
                              </span>
                            </div>
                            {evalData.notes && <span className="text-sm text-[#E0E0E0] italic">"{evalData.notes}"</span>}
                          </div>
                        );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsNotesModalOpen(false)}
                className="px-6 py-3 bg-[#1C1C1F] text-white font-bold rounded-xl hover:bg-[#2A2A2E] transition-colors border border-[#2A2A2E]"
              >
                Cancelar
              </button>
              <button 
                onClick={saveNotes}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" /> Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
