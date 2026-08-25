import { useState } from 'react';
import { Player, Fine } from '../types';
import { Search, DollarSign, Wallet, AlertCircle, Plus, CheckCircle2, Trash2, Users, Gavel, X } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

export function FinesManagement() {
  const { activeTeam, updateTeamFines } = useTeam();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [fineAmount, setFineAmount] = useState<number | ''>('');
  const [fineReason, setFineReason] = useState('');

  if (!activeTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#121215] border border-[#2A2A2E] rounded-3xl p-12 text-center">
        <Users className="w-16 h-16 text-[#6E6E75] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Ningún equipo seleccionado</h2>
        <p className="text-[#6E6E75] mb-6">Por favor, selecciona un equipo desde el Panel de Inicio.</p>
      </div>
    );
  }

  const players = activeTeam.players;
  const fines = activeTeam.fines || [];

  // Derived Stats
  const totalPaid = fines.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
  const totalPending = fines.filter(f => f.status === 'pending').reduce((acc, f) => acc + f.amount, 0);

  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || filteredPlayers[0];
  const selectedPlayerFines = fines.filter(f => f.playerId === selectedPlayer?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const addFine = () => {
    if (!selectedPlayer || !fineAmount || !fineReason) return;

    const newFine: Fine = {
      id: Math.random().toString(36).substr(2, 9),
      playerId: selectedPlayer.id,
      amount: Number(fineAmount),
      reason: fineReason,
      date: new Date().toISOString(),
      status: 'pending'
    };

    updateTeamFines([...fines, newFine]);
    setShowAddModal(false);
    setFineAmount('');
    setFineReason('');
  };

  const toggleFineStatus = (fineId: string) => {
    const updated = fines.map(f => f.id === fineId ? { ...f, status: f.status === 'pending' ? 'paid' : 'pending' } as Fine : f);
    updateTeamFines(updated);
  };

  const deleteFine = (fineId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta sanción del historial?')) {
      const updated = fines.filter(f => f.id !== fineId);
      updateTeamFines(updated);
    }
  };

  const getPlayerDebt = (playerId: string) => {
    return fines.filter(f => f.playerId === playerId && f.status === 'pending').reduce((acc, f) => acc + f.amount, 0);
  };

  const getPlayerPaid = (playerId: string) => {
    return fines.filter(f => f.playerId === playerId && f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
  };

  return (
    <div className="max-w-7xl mx-auto w-full h-full flex flex-col xl:flex-row gap-6 relative">
      {/* Left Column - List */}
      <div className="w-full xl:w-[55%] flex flex-col gap-6 pt-4 md:pt-0">
        {/* Dashboard Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1C1C1F] p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-500/70 uppercase tracking-wider mb-1 font-bold">Bote Acumulado (Pagado)</p>
              <p className="text-3xl font-black text-emerald-400">{totalPaid}€</p>
            </div>
            <Wallet className="w-10 h-10 text-emerald-500/20" />
          </div>
          <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#FF4B4B]/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#FF4B4B]/70 uppercase tracking-wider mb-1 font-bold">Deuda Total (Pendiente)</p>
              <p className="text-3xl font-black text-[#FF4B4B]">{totalPending}€</p>
            </div>
            <AlertCircle className="w-10 h-10 text-[#FF4B4B]/20" />
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E75]" />
            <input 
              type="text" 
              placeholder="Buscar jugador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121215] border border-[#2A2A2E] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 transition-colors"
            />
          </div>
        </div>

        {/* List Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-[#6E6E75] uppercase tracking-wider">
          <div className="col-span-6">Jugador</div>
          <div className="col-span-3 text-right">Pendiente</div>
          <div className="col-span-3 text-right">Pagado</div>
        </div>

        {/* Player List */}
        <div className="flex flex-col gap-3">
          {filteredPlayers.map(player => {
            const debt = getPlayerDebt(player.id);
            const paid = getPlayerPaid(player.id);

            return (
              <div 
                key={player.id}
                onClick={() => setSelectedPlayerId(player.id)}
                className={`grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-xl items-center cursor-pointer transition-all border ${
                  selectedPlayerId === player.id 
                    ? 'bg-[#1C1C1F] border-[#FF4B4B]' 
                    : 'bg-[#121215] border-[#2A2A2E] hover:border-[#FF4B4B]/50'
                }`}
              >
                <div className="col-span-1 sm:col-span-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E2E32] to-[#1C1C1F] border border-[#3A3A3E] flex items-center justify-center font-bold text-[#E0E0E0] shrink-0">
                    {player.number}
                  </div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">{player.name}</h4>
                    <p className="text-xs text-[#6E6E75]">{player.positionGroup}</p>
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-3 flex sm:justify-end">
                  {debt > 0 ? (
                    <span className="px-3 py-1 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded-lg font-bold border border-[#FF4B4B]/20">
                      -{debt}€
                    </span>
                  ) : (
                    <span className="text-[#6E6E75] text-sm font-medium">Limpio</span>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-3 flex sm:justify-end">
                  <span className="text-emerald-400 font-bold">{paid > 0 ? `+${paid}€` : '-'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column - Player Detail & Fines History */}
      <div className="w-full xl:w-[45%]">
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 sticky top-0 flex flex-col h-full max-h-[calc(100vh-120px)]">
          {selectedPlayer ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#2A2A2E]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF4B4B] to-[#E63939] flex items-center justify-center font-black text-2xl text-black">
                    {selectedPlayer.number}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedPlayer.name}</h2>
                    <p className="text-sm text-[#6E6E75]">Deuda actual: <span className="text-[#FF4B4B] font-bold">{getPlayerDebt(selectedPlayer.id)}€</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#1C1C1F] border border-[#2A2A2E] text-white p-3 rounded-xl hover:bg-[#FF4B4B] hover:text-black transition-colors flex items-center gap-2 font-bold text-sm"
                >
                  <Plus className="w-4 h-4" /> Multar
                </button>
              </div>

              {/* Fines List */}
              <div className="flex-1 overflow-y-auto pr-2">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6E6E75] mb-4 flex items-center gap-2">
                  <Gavel className="w-4 h-4" /> Historial de Sanciones
                </h3>
                
                {selectedPlayerFines.length === 0 ? (
                  <div className="text-center py-12 text-[#6E6E75]">
                    <CheckCircle2 className="w-12 h-12 text-[#2A2A2E] mx-auto mb-3" />
                    <p>Este jugador no tiene historial de multas.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedPlayerFines.map(fine => (
                      <div key={fine.id} className={`p-4 rounded-xl border ${fine.status === 'paid' ? 'bg-[#1C1C1F] border-emerald-500/20' : 'bg-[#FF4B4B]/5 border-[#FF4B4B]/20'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 pr-4">
                            <h4 className="font-bold text-white text-sm">{fine.reason}</h4>
                            <p className="text-xs text-[#6E6E75]">{new Date(fine.date).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-lg font-black ${fine.status === 'paid' ? 'text-emerald-400' : 'text-[#FF4B4B]'}`}>
                            {fine.amount}€
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${fine.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#FF4B4B]/10 text-[#FF4B4B]'}`}>
                            {fine.status === 'paid' ? 'Pagada' : 'Pendiente'}
                          </span>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => deleteFine(fine.id)}
                              className="p-1.5 text-[#6E6E75] hover:bg-[#2A2A2E] rounded-md transition-colors hover:text-white"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleFineStatus(fine.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                                fine.status === 'paid' 
                                  ? 'bg-[#1C1C1F] border-[#2A2A2E] text-[#6E6E75] hover:text-white' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {fine.status === 'paid' ? 'Marcar Pendiente' : 'Marcar Pagada'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#6E6E75] flex-1 flex flex-col items-center justify-center">
              <Gavel className="w-12 h-12 text-[#2A2A2E] mb-4" />
              <p>Selecciona un jugador para ver o gestionar sus sanciones.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Fine Modal */}
      {showAddModal && selectedPlayer && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] p-6 rounded-3xl max-w-md w-full relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-[#6E6E75] hover:text-white"><X className="w-6 h-6"/></button>
            <h2 className="text-xl font-bold text-white mb-2">Añadir Sanción</h2>
            <p className="text-sm text-[#6E6E75] mb-6">Jugador: <span className="text-white font-bold">{selectedPlayer.name}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-1">Motivo (Régimen Interno)</label>
                <input 
                  type="text" 
                  value={fineReason}
                  onChange={e => setFineReason(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  placeholder="Ej: Retraso al entrenamiento"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6E6E75] block mb-1">Importe (€)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6E75]" />
                  <input 
                    type="number" 
                    value={fineAmount}
                    onChange={e => setFineAmount(Number(e.target.value) || '')}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none text-lg font-bold"
                    placeholder="5.00"
                  />
                </div>
              </div>
              <button 
                onClick={addFine}
                disabled={!fineAmount || !fineReason}
                className="w-full bg-[#FF4B4B] text-black font-bold py-3 rounded-xl hover:bg-[#FF4B4B]/80 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar Sanción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
