import { useState, useEffect } from 'react';
import { PositionGroup, Player, Team } from '../types';
import { Search, Bell, CheckCircle2, PlusSquare, Edit2, Activity, Plus, Trash2, Crown, X, Users, Archive } from 'lucide-react';
import { PitchLines } from '../features/tactical-board/components/PitchLines';
import { useTeam } from '../context/TeamContext';
import { MOCK_PLAYERS } from '../data/players';

const STAT_COLORS = {
  high: 'bg-emerald-400',
  medium: 'bg-yellow-400',
  low: 'bg-[#FF4B4B]',
};

function getStatColor(value: number) {
  if (value >= 80) return STAT_COLORS.high;
  if (value >= 65) return STAT_COLORS.medium;
  return STAT_COLORS.low;
}

export function TeamManagement() {
  const { activeTeam, activeTeamId, updateTeamPlayers } = useTeam();
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({});
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);

  const [activeTab, setActiveTab] = useState<PositionGroup>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const players = activeTeam?.players || [];
  
  const savePlayer = () => {
    if (!playerForm.name || !playerForm.number || !activeTeam) return;
    
    let currentPlayers = [...activeTeam.players];

    if (isEditingPlayer) {
      currentPlayers = currentPlayers.map(p => 
        p.id === playerForm.id ? { ...p, ...playerForm } as Player : p
      );
    } else {
      const newPlayer: Player = {
        ...playerForm,
        id: Math.random().toString(36).substr(2, 9),
        form: 80, minutes: 0, status: 'available', age: playerForm.age || 20, height: playerForm.height || '1.80m', foot: playerForm.foot || 'Diestro',
        stats: { matchesPlayed: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 }, attendance: { trainingPercentage: 100, matchPercentage: 100 }, evaluations: [], notes: ''
      } as Player;
      currentPlayers.push(newPlayer);
    }

    updateTeamPlayers(currentPlayers);
    setShowPlayerModal(false);
  };

  const deletePlayer = (id: string) => {
    if (!activeTeam) return;
    if (!window.confirm("¿Estás seguro de eliminar DEFINITIVAMENTE a este jugador? Sus datos históricos se perderán de su ficha, aunque seguirán en el historial de partidos.")) return;
    
    const currentPlayers = activeTeam.players.filter(p => p.id !== id);
    updateTeamPlayers(currentPlayers);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  const archivePlayer = (id: string) => {
    if (!activeTeam) return;
    if (!window.confirm("¿Quieres dar de baja a este jugador? Desaparecerá de la plantilla activa pero conservará su ficha.")) return;

    const currentPlayers = activeTeam.players.map(p => 
      p.id === id ? { ...p, isActive: false } : p
    );
    updateTeamPlayers(currentPlayers);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  const restorePlayer = (id: string) => {
    if (!activeTeam) return;
    const currentPlayers = activeTeam.players.map(p => 
      p.id === id ? { ...p, isActive: true } : p
    );
    updateTeamPlayers(currentPlayers);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  const filteredPlayers = players.filter(p => {
    const matchesTab = activeTab === 'Todos' || p.positionGroup === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];


  
  if (!activeTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#121215] border border-[#2A2A2E] rounded-3xl p-12 text-center">
        <Users className="w-16 h-16 text-[#6E6E75] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Ningún equipo seleccionado</h2>
        <p className="text-[#6E6E75] mb-6">Por favor, selecciona o crea un equipo desde el Panel de Inicio para gestionar su plantilla.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full h-full flex flex-col xl:flex-row gap-6 relative">
      {/* Left Column - List */}
      <div className="w-full xl:w-[55%] flex flex-col gap-6 pt-4 md:pt-0">
        {/* Dashboard Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E] flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white">{players.length}</span>
            <span className="text-[10px] text-[#6E6E75] uppercase tracking-wider text-center">Total</span>
          </div>
          <div className="bg-[#1C1C1F] p-3 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-emerald-400">{players.filter(p => p.status === 'available' && !p.isSuspended).length}</span>
            <span className="text-[10px] text-emerald-500/70 uppercase tracking-wider text-center">Disp.</span>
          </div>
          <div className="bg-[#1C1C1F] p-3 rounded-xl border border-yellow-500/20 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-yellow-400">{players.filter(p => p.status === 'injured').length}</span>
            <span className="text-[10px] text-yellow-500/70 uppercase tracking-wider text-center">Lesión</span>
          </div>
          <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#FF4B4B]/20 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[#FF4B4B]">{players.filter(p => p.isSuspended).length}</span>
            <span className="text-[10px] text-[#FF4B4B]/70 uppercase tracking-wider text-center">Sanción</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] overflow-x-auto w-full sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(['Todos', 'Porteros', 'Defensas', 'Medios', 'Delanteros'] as PositionGroup[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-sm' 
                    : 'text-[#6E6E75] hover:text-[#E0E0E0] hover:bg-[#1C1C1F]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E75]" />
              <input 
                type="text" 
                placeholder="Buscar jugador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121215] border border-[#2A2A2E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 transition-colors"
              />
            </div>
            <button 
              onClick={() => { setPlayerForm({}); setIsEditingPlayer(false); setShowPlayerModal(true); }}
              className="bg-[#1C1C1F] border border-[#2A2A2E] text-white p-2.5 rounded-xl hover:bg-[#2A2A2E] hover:text-[#FF4B4B] transition-colors"
              title="Añadir Jugador"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-[#6E6E75] uppercase tracking-wider">
          <div className="col-span-5">Jugador</div>
          <div className="col-span-3">Posición</div>
          <div className="col-span-2">Forma</div>
          <div className="col-span-2 text-right">Minutos / Estado</div>
        </div>

        {/* Player List */}
        <div className="flex flex-col gap-3">
          {filteredPlayers.map(player => (
            <div 
              key={player.id}
              onClick={() => setSelectedPlayerId(player.id)}
              className={`grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-xl items-center cursor-pointer transition-all border ${
                selectedPlayerId === player.id 
                  ? 'bg-[#1C1C1F] border-[#FF4B4B]' 
                  : 'bg-[#121215] border-[#2A2A2E] hover:border-[#FF4B4B]/50'
              } ${player.isActive === false ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="col-span-1 sm:col-span-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2E2E32] to-[#1C1C1F] border border-[#3A3A3E] flex items-center justify-center font-bold text-[#E0E0E0] shrink-0">
                  {player.number}
                </div>
                <div>
                  <h4 className="font-bold text-white leading-tight">{player.name}</h4>
                  <p className="text-xs text-[#6E6E75] sm:hidden mt-0.5">{player.position}</p>
                </div>
              </div>
              <div className="hidden sm:block col-span-3 text-sm text-[#E0E0E0]">
                {player.position}
              </div>
              <div className="col-span-1 sm:col-span-2 flex items-center gap-3">
                <div className="w-full h-1.5 bg-[#1C1C1F] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getStatColor(player.form)}`} 
                    style={{ width: `${player.form}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white w-8">{player.form}%</span>
              </div>
              <div className="col-span-1 sm:col-span-2 flex items-center justify-between sm:justify-end gap-4">
                <span className="text-sm text-[#E0E0E0]">{player.minutes}'</span>
                {player.isSuspended ? (
                  <span className="px-2 py-1 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded text-[10px] font-bold shrink-0 uppercase">Sanc.</span>
                ) : player.status === 'available' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <PlusSquare className="w-5 h-5 text-yellow-400 shrink-0" />
                )}
              </div>
            </div>
          ))}
          {filteredPlayers.length === 0 && (
            <div className="text-center py-12 text-[#6E6E75]">
              No se encontraron jugadores en este equipo.
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Player Detail */}
      <div className="w-full xl:w-[45%]">
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 sticky top-0">
          {selectedPlayer ? (
            <>
              <div className="flex items-start justify-between mb-8">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF4B4B] to-[#E63939] border-2 border-[#1C1C1F] shadow-lg flex items-center justify-center font-black text-3xl text-black">
                    {selectedPlayer.number}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-[#FF4B4B]">#{selectedPlayer.number}</span>
                      <span className="text-sm text-[#6E6E75]">|</span>
                      <span className="text-sm text-emerald-400 font-medium">{selectedPlayer.positionGroup}</span>
                      {selectedPlayer.secondaryPosition && (
                        <>
                          <span className="text-sm text-[#6E6E75]">•</span>
                          <span className="text-xs text-yellow-400 font-medium">{selectedPlayer.secondaryPosition}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                      {selectedPlayer.name}
                      {selectedPlayer.isActive === false && (
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-medium">
                          BAJA
                        </span>
                      )}
                    </h2>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded text-xs text-[#E0E0E0]">{selectedPlayer.age} Años</span>
                      <span className="px-2 py-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded text-xs text-[#E0E0E0]">{selectedPlayer.height}</span>
                      <span className="px-2 py-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded text-xs text-[#E0E0E0]">{selectedPlayer.foot}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setPlayerForm(selectedPlayer); setIsEditingPlayer(true); setShowPlayerModal(true); }}
                    className="p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F] transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {selectedPlayer.isActive !== false ? (
                    <button 
                      onClick={() => archivePlayer(selectedPlayer.id)}
                      className="p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-orange-400 hover:bg-[#1C1C1F] transition-colors"
                      title="Dar de baja (Soft Delete)"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => restorePlayer(selectedPlayer.id)}
                      className="p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-emerald-400 hover:bg-[#1C1C1F] transition-colors"
                      title="Restaurar jugador"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => deletePlayer(selectedPlayer.id)}
                    className="p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-[#FF4B4B] hover:bg-[#1C1C1F] transition-colors"
                    title="Borrado permanente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bloque 1 - Compromiso */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Compromiso (Asistencia)
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4">
                  <p className="text-xs text-[#6E6E75] mb-1">Entrenamientos</p>
                  <p className={`text-3xl font-bold ${getStatColor(selectedPlayer.attendance?.trainingPercentage || 0).replace('bg-', 'text-')}`}>
                    {selectedPlayer.attendance?.trainingPercentage || 0}%
                  </p>
                </div>
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4">
                  <p className="text-xs text-[#6E6E75] mb-1">Partidos</p>
                  <p className={`text-3xl font-bold ${getStatColor(selectedPlayer.attendance?.matchPercentage || 0).replace('bg-', 'text-')}`}>
                    {selectedPlayer.attendance?.matchPercentage || 0}%
                  </p>
                </div>
              </div>

              {/* Bloque 2 - Rendimiento Acumulado */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4">
                Rendimiento Acumulado
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[#6E6E75] text-xs mb-1">Partidos Jugados</span>
                  <span className="text-xl font-bold text-white">{selectedPlayer.stats?.matchesPlayed || 0}</span>
                </div>
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[#6E6E75] text-xs mb-1">Minutos</span>
                  <span className="text-xl font-bold text-white">{selectedPlayer.stats?.minutesPlayed || 0}'</span>
                </div>
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[#6E6E75] text-xs mb-1">Goles / Asist.</span>
                  <span className="text-xl font-bold text-white">{selectedPlayer.stats?.goals || 0} / {selectedPlayer.stats?.assists || 0}</span>
                </div>
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[#6E6E75] text-xs mb-1">Tarjetas (A/R)</span>
                  <span className="text-xl font-bold text-white">{selectedPlayer.stats?.yellowCards || 0} / {selectedPlayer.stats?.redCards || 0}</span>
                </div>
              </div>

              {/* Bloque 3 - Historial de Rendimiento */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75]">
                  Historial de Rendimiento
                </h3>
                <button 
                  onClick={() => {
                    const rating = prompt('Puntuación (1-10):', '7');
                    const notes = prompt('Extracto / Evaluación:', 'Buen partido');
                    if (rating && notes) {
                      const updatedPlayer = {
                        ...selectedPlayer,
                        evaluations: [
                          { matchId: `m-${Date.now()}`, date: new Date().toLocaleDateString(), rating: Number(rating), notes, opponent: 'Rival (Manual)' },
                          ...(selectedPlayer.evaluations || [])
                        ]
                      };
                      
                      const currentPlayers = activeTeam.players.map(p => p.id === selectedPlayer.id ? updatedPlayer : p);
                      updateTeamPlayers(currentPlayers);
                    }
                  }}
                  className="text-xs bg-[#2A2A2E] hover:bg-[#FF4B4B] hover:text-black text-white px-2 py-1 rounded transition-colors"
                >
                  + Añadir
                </button>
              </div>
              <div className="flex flex-col gap-3 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {(!selectedPlayer.evaluations || selectedPlayer.evaluations.length === 0) ? (
                  <p className="text-xs text-[#6E6E75] italic">Sin evaluaciones registradas.</p>
                ) : (
                  selectedPlayer.evaluations.map((ev, i) => (
                    <div key={i} className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6E6E75] font-mono">{ev.date}</span>
                          {ev.opponent && (
                            <span className="text-xs font-bold text-white bg-[#2A2A2E] px-1.5 py-0.5 rounded">vs {ev.opponent}</span>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${ev.rating >= 7 ? 'bg-emerald-500/20 text-emerald-400' : ev.rating >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#FF4B4B]/20 text-[#FF4B4B]'}`}>
                          NOTA: {ev.rating}/10
                        </span>
                      </div>
                      {ev.notes && <p className="text-sm text-[#E0E0E0] italic mt-2 border-l-2 border-[#6E6E75] pl-2">"{ev.notes}"</p>}
                    </div>
                  ))
                )}
              </div>

              {/* Bloque 4 - Observaciones Generales */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4">
                Observaciones Generales
              </h3>
              <textarea
                value={selectedPlayer.notes || ''}
                onChange={(e) => {
                  const updatedPlayer = { ...selectedPlayer, notes: e.target.value };
                  const currentPlayers = activeTeam.players.map(p => p.id === selectedPlayer.id ? updatedPlayer : p);
                  updateTeamPlayers(currentPlayers);
                }}
                className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 min-h-[100px] resize-none"
                placeholder="Alergias, comportamiento, molestias tácticas..."
              />
            </>
          ) : (
            <div className="text-center py-12 text-[#6E6E75]">
              Selecciona un jugador para ver sus detalles.
            </div>
          )}
        </div>
      </div>

      {/* Player Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] p-6 rounded-3xl max-w-md w-full relative">
            <button onClick={() => setShowPlayerModal(false)} className="absolute top-4 right-4 text-[#6E6E75] hover:text-white"><X className="w-6 h-6"/></button>
            <h2 className="text-xl font-bold text-white mb-6">{isEditingPlayer ? 'Editar Jugador' : 'Añadir Jugador'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={playerForm.name || ''}
                  onChange={e => setPlayerForm({...playerForm, name: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6E6E75] block mb-1">Dorsal</label>
                  <input 
                    type="number" 
                    value={playerForm.number || ''}
                    onChange={e => setPlayerForm({...playerForm, number: parseInt(e.target.value)})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6E6E75] block mb-1">Línea</label>
                  <select 
                    value={playerForm.positionGroup || 'Medios'}
                    onChange={e => setPlayerForm({...playerForm, positionGroup: e.target.value as PositionGroup})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  >
                    <option value="Porteros">Porteros</option>
                    <option value="Defensas">Defensas</option>
                    <option value="Medios">Medios</option>
                    <option value="Delanteros">Delanteros</option>
                    <option value="Todos">Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6E6E75] block mb-1">Pos. Principal</label>
                  <input 
                    type="text" 
                    value={playerForm.position || ''}
                    onChange={e => setPlayerForm({...playerForm, position: e.target.value})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                    placeholder="Ej: EI"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6E6E75] block mb-1">Pos. Secundaria</label>
                  <input 
                    type="text" 
                    value={playerForm.secondaryPosition || ''}
                    onChange={e => setPlayerForm({...playerForm, secondaryPosition: e.target.value})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                    placeholder="Ej: MCO"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6E6E75] block mb-1">Estado Físico</label>
                  <select 
                    value={playerForm.status || 'available'}
                    onChange={e => setPlayerForm({...playerForm, status: e.target.value as 'available' | 'injured'})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  >
                    <option value="available">Disponible</option>
                    <option value="injured">Lesionado</option>
                  </select>
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer bg-[#1C1C1F] border border-[#2A2A2E] px-4 py-3 rounded-xl w-full">
                    <input 
                      type="checkbox" 
                      checked={playerForm.isSuspended || false}
                      onChange={e => setPlayerForm({...playerForm, isSuspended: e.target.checked})}
                      className="w-5 h-5 rounded border-[#2A2A2E] text-[#FF4B4B] focus:ring-[#FF4B4B] bg-[#121215] accent-[#FF4B4B]"
                    />
                    <span className="text-sm font-medium text-[#FF4B4B]">Sancionado</span>
                  </label>
                </div>
              </div>
              <button 
                onClick={savePlayer}
                className="w-full bg-[#FF4B4B] text-black font-bold py-3 rounded-xl hover:bg-[#FF4B4B]/80 mt-4"
              >
                Guardar Jugador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
