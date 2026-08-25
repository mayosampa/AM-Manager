cat << 'INNER_EOF' > src/components/TeamManagement.tsx
import { useState, useEffect } from 'react';
import { PositionGroup, Player, Team } from '../types';
import { Search, Bell, CheckCircle2, PlusSquare, Edit2, Activity, Plus, Trash2, Crown, X } from 'lucide-react';
import { PitchLines } from './PitchLines';
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [isPro, setIsPro] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  const [newTeamForm, setNewTeamForm] = useState({ name: '', formation: '4-3-3' });
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({});
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);

  const [activeTab, setActiveTab] = useState<PositionGroup>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  useEffect(() => {
    const savedTeams = localStorage.getItem('am_manager_teams');
    if (savedTeams) {
      const parsed = JSON.parse(savedTeams);
      setTeams(parsed);
      if (parsed.length > 0) setActiveTeamId(parsed[0].id);
    } else {
      const defaultTeam: Team = {
        id: 'team-1',
        name: 'Mi Equipo',
        formation: '4-3-3',
        players: MOCK_PLAYERS
      };
      setTeams([defaultTeam]);
      setActiveTeamId(defaultTeam.id);
      localStorage.setItem('am_manager_teams', JSON.stringify([defaultTeam]));
    }
  }, []);

  const saveTeams = (newTeams: Team[]) => {
    setTeams(newTeams);
    localStorage.setItem('am_manager_teams', JSON.stringify(newTeams));
  };

  const handleNewTeamClick = () => {
    if (!isPro && teams.length >= 1) {
      setShowPaywall(true);
    } else {
      setShowNewTeamModal(true);
    }
  };

  const createTeam = () => {
    if (!newTeamForm.name) return;
    const newTeam: Team = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTeamForm.name,
      formation: newTeamForm.formation,
      players: []
    };
    const updated = [...teams, newTeam];
    saveTeams(updated);
    setActiveTeamId(newTeam.id);
    setShowNewTeamModal(false);
    setNewTeamForm({ name: '', formation: '4-3-3' });
  };

  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];
  const players = activeTeam?.players || [];

  const filteredPlayers = players.filter(p => {
    const matchesTab = activeTab === 'Todos' || p.positionGroup === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];

  const savePlayer = () => {
    if (!playerForm.name || !playerForm.number) return;
    
    let updatedPlayers;
    if (isEditingPlayer) {
      updatedPlayers = players.map(p => p.id === playerForm.id ? { ...p, ...playerForm } as Player : p);
    } else {
      const newPlayer: Player = {
        id: Math.random().toString(36).substr(2, 9),
        name: playerForm.name,
        number: Number(playerForm.number),
        positionGroup: playerForm.positionGroup as PositionGroup || 'Medios',
        position: playerForm.position || 'Medio Centro (MC)',
        form: 80, minutes: 0, status: 'available', age: playerForm.age || 20, height: playerForm.height || '1.80m', foot: playerForm.foot || 'Diestro',
        stats: { vision: 70, pase: 70, regate: 70, recuperacion: 70 }, fatigue: 0
      };
      updatedPlayers = [...players, newPlayer];
    }
    
    const updatedTeams = teams.map(t => t.id === activeTeamId ? { ...t, players: updatedPlayers } : t);
    saveTeams(updatedTeams);
    setShowPlayerModal(false);
  };

  const deletePlayer = (id: string) => {
    const updatedPlayers = players.filter(p => p.id !== id);
    const updatedTeams = teams.map(t => t.id === activeTeamId ? { ...t, players: updatedPlayers } : t);
    saveTeams(updatedTeams);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  return (
    <div className="max-w-7xl mx-auto w-full h-full flex flex-col xl:flex-row gap-6 relative">
      {/* Top Header - Team Selection */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center z-10 px-6 hidden md:flex">
        <div className="flex items-center gap-4">
          <select 
            value={activeTeamId}
            onChange={(e) => setActiveTeamId(e.target.value)}
            className="bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2 rounded-xl focus:outline-none focus:border-[#FF4B4B]/50 font-bold"
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.formation})</option>)}
          </select>
          <button 
            onClick={handleNewTeamClick}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-500 border border-amber-500/30 px-4 py-2 rounded-xl font-bold hover:from-amber-500/30 hover:to-orange-600/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo Equipo <Crown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Left Column - List */}
      <div className="w-full xl:w-[55%] flex flex-col gap-6 pt-4 md:pt-0">
        <div className="flex items-center gap-4 md:hidden mb-2">
          <select 
            value={activeTeamId}
            onChange={(e) => setActiveTeamId(e.target.value)}
            className="bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2 rounded-xl focus:outline-none focus:border-[#FF4B4B]/50 font-bold flex-1"
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.formation})</option>)}
          </select>
          <button 
            onClick={handleNewTeamClick}
            className="flex items-center justify-center bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-500 border border-amber-500/30 p-2 rounded-xl hover:from-amber-500/30 hover:to-orange-600/30 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] overflow-x-auto w-full sm:w-auto">
            {(['Todos', 'Defensas', 'Medios', 'Delanteros'] as PositionGroup[]).map(tab => (
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
              }`}
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
                {player.status === 'available' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <PlusSquare className="w-5 h-5 text-[#E63939] shrink-0" />
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#FF4B4B]">#{selectedPlayer.number}</span>
                      <span className="text-sm text-[#6E6E75]">|</span>
                      <span className="text-sm text-emerald-400 font-medium">{selectedPlayer.positionGroup}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedPlayer.name}</h2>
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
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deletePlayer(selectedPlayer.id)}
                    className="p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-[#FF4B4B] hover:bg-[#1C1C1F] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Physical State */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Estado Físico
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4">
                  <p className="text-xs text-[#6E6E75] mb-1">Forma General</p>
                  <p className={`text-3xl font-bold ${getStatColor(selectedPlayer.form).replace('bg-', 'text-')}`}>
                    {selectedPlayer.form}%
                  </p>
                </div>
                <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4">
                  <p className="text-xs text-[#6E6E75] mb-1">Fatiga Acumulada</p>
                  <p className="text-3xl font-bold text-white">{selectedPlayer.fatigue}%</p>
                </div>
              </div>

              {/* Technical Attributes */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4">
                Atributos Técnicos
              </h3>
              <div className="flex flex-col gap-4 mb-8">
                {[
                  { label: 'Visión de Juego', value: selectedPlayer.stats.vision },
                  { label: 'Pase Corto', value: selectedPlayer.stats.pase },
                  { label: 'Regate', value: selectedPlayer.stats.regate },
                  { label: 'Recuperación', value: selectedPlayer.stats.recuperacion },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-[#E0E0E0]">{stat.label}</span>
                      <span className={`font-bold ${getStatColor(stat.value).replace('bg-', 'text-')}`}>
                        {stat.value}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1C1C1F] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getStatColor(stat.value)}`} 
                        style={{ width: `${stat.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Heat Map Placeholder */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4">
                Mapa de Calor
              </h3>
              <div className="relative w-full aspect-[3/2] bg-[#1A231E] rounded-xl border border-[#2A2A2E] overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                <PitchLines />
                
                {selectedPlayer.positionGroup === 'Medios' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/40 blur-3xl rounded-full mix-blend-screen" />
                    <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#FF4B4B]/40 blur-2xl rounded-full mix-blend-screen" />
                    <div className="absolute top-1/3 left-[60%] -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-500/30 blur-3xl rounded-full mix-blend-screen" />
                  </>
                )}
                {selectedPlayer.positionGroup === 'Delanteros' && (
                  <>
                    <div className="absolute top-1/2 left-[75%] -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#FF4B4B]/50 blur-3xl rounded-full mix-blend-screen" />
                    <div className="absolute top-[30%] left-[65%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/40 blur-2xl rounded-full mix-blend-screen" />
                  </>
                )}
                {selectedPlayer.positionGroup === 'Defensas' && (
                  <>
                    <div className="absolute top-1/2 left-[25%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/40 blur-3xl rounded-full mix-blend-screen" />
                    <div className="absolute top-[60%] left-[30%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/30 blur-2xl rounded-full mix-blend-screen" />
                  </>
                )}
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-[10px] text-white/50 px-2 py-1 rounded">
                  Datos últimos 5 partidos
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#6E6E75]">
              Selecciona un jugador para ver sus detalles.
            </div>
          )}
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] p-8 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.1)] relative">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-[#6E6E75] hover:text-white"><X className="w-6 h-6"/></button>
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl mx-auto flex items-center justify-center mb-6 rotate-12">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Pásate a PRO</h2>
            <p className="text-[#6E6E75] mb-8">Gestiona equipos y plantillas ilimitadas sin restricciones. Activa todo el potencial de AM Manager.</p>
            <button 
              onClick={() => { setIsPro(true); setShowPaywall(false); setShowNewTeamModal(true); }}
              className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-all text-lg"
            >
              Desbloquear Ahora
            </button>
          </div>
        </div>
      )}

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
                  placeholder="Ej: Juvenil A"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-1">Formación Base</label>
                <select 
                  value={newTeamForm.formation}
                  onChange={e => setNewTeamForm({...newTeamForm, formation: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                >
                  <option value="4-3-3">4-3-3</option>
                  <option value="4-4-2">4-4-2</option>
                  <option value="4-2-3-1">4-2-3-1</option>
                  <option value="3-5-2">3-5-2</option>
                  <option value="3-4-3">3-4-3</option>
                </select>
              </div>
              <button 
                onClick={createTeam}
                className="w-full bg-[#FF4B4B] text-black font-bold py-3 rounded-xl hover:bg-[#FF4B4B]/80 mt-4"
              >
                Guardar Equipo
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <option value="Defensas">Defensas</option>
                    <option value="Medios">Medios</option>
                    <option value="Delanteros">Delanteros</option>
                    <option value="Todos">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-1">Posición Específica</label>
                <input 
                  type="text" 
                  value={playerForm.position || ''}
                  onChange={e => setPlayerForm({...playerForm, position: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  placeholder="Ej: Extremo Izquierdo (EI)"
                />
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
INNER_EOF
