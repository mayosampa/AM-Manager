import React, { useState, useEffect } from 'react';
import { MatchRecord, MatchEvent, EventType, Player } from '../types';
import { Clock, Goal, Handshake, ArrowRightLeft, Trash2, Plus, Calendar, Save, ArrowLeft } from 'lucide-react';

interface MatchHistoryProps {
  onNavigate: (view: any) => void;
}

export function MatchHistory({ onNavigate }: MatchHistoryProps) {
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  
  const [filterCompetition, setFilterCompetition] = useState('Todos');
  const [filterResult, setFilterResult] = useState('Todos');

  // States for adding a new event manually
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<{ type: EventType; time: number; playerId: string; playerInId?: string }>({
    type: 'goal',
    time: 0,
    playerId: ''
  });

  useEffect(() => {
    const raw = localStorage.getItem('matchHistory');
    if (raw) {
      setHistory(JSON.parse(raw));
    }
  }, []);

  const saveHistory = (updatedMatch: MatchRecord) => {
    const newHistory = history.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    setHistory(newHistory);
    localStorage.setItem('matchHistory', JSON.stringify(newHistory));
    setSelectedMatch(updatedMatch);
  };

  const deleteEvent = (match: MatchRecord, eventId: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este evento?")) return;

    const eventToDelete = match.events.find(e => e.id === eventId);
    let newScore = { ...match.score };

    if (eventToDelete?.type === 'goal') {
      newScore.home = Math.max(0, newScore.home - 1);
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
      newScore.home += 1;
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
    const allPlayers = [...selectedMatch.squad, ...selectedMatch.bench];

    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 p-6">
        <button 
          onClick={() => setSelectedMatch(null)} 
          className="flex items-center gap-2 text-[#6E6E75] hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-5 h-5" /> Volver al Historial
        </button>

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
            <button 
              onClick={() => setShowAddEvent(!showAddEvent)}
              className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2 rounded-lg hover:bg-[#2A2A2E] transition-colors"
            >
              <Plus className="w-4 h-4 text-[#FF4B4B]" /> Añadir Evento
            </button>
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
            {selectedMatch.events.length === 0 ? (
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
      </div>
    );
  }

  const filteredHistory = history.filter(match => {
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
              
              <div className="mt-auto pt-4 border-t border-[#2A2A2E] flex justify-between items-center text-sm text-[#6E6E75]">
                <span>{match.events.length} Eventos</span>
                <span className={`font-medium opacity-0 group-hover:opacity-100 transition-opacity ${
                  match.matchResult === 'Victoria' ? 'text-emerald-400' :
                  match.matchResult === 'Derrota' ? 'text-red-400' :
                  'text-gray-400'
                }`}>Editar →</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
