import { useState } from 'react';
import { Fine } from '../types';
import { Search, DollarSign, Plus, CheckCircle2, Trash2, Users, Gavel, X } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-12 text-center">
        <Users className="w-8 h-8 text-[#666666] mb-3" />
        <h2 className="text-[16px] font-semibold text-[#EDEDED] mb-1">Ningún equipo seleccionado</h2>
        <p className="text-[13px] text-[#737373]">Selecciona un equipo desde la barra superior para gestionar el régimen interno.</p>
      </div>
    );
  }

  const players = activeTeam.players;
  const fines = activeTeam.fines || [];

  const totalPaid = fines.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
  const totalPending = fines.filter(f => f.status === 'pending').reduce((acc, f) => acc + f.amount, 0);

  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || filteredPlayers[0];
  const selectedPlayerFines = fines
    .filter(f => f.playerId === selectedPlayer?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const addFine = () => {
    if (!selectedPlayer || !fineAmount || !fineReason) return;

    const newFine: Fine = {
      id: Math.random().toString(36).substr(2, 9),
      playerId: selectedPlayer.id,
      amount: Number(fineAmount),
      reason: fineReason,
      date: new Date().toISOString(),
      status: 'pending',
    };

    updateTeamFines([...fines, newFine]);
    setShowAddModal(false);
    setFineAmount('');
    setFineReason('');
  };

  const toggleFineStatus = (fineId: string) => {
    const updated = fines.map(f =>
      f.id === fineId ? ({ ...f, status: f.status === 'pending' ? 'paid' : 'pending' } as Fine) : f
    );
    updateTeamFines(updated);
  };

  const deleteFine = (fineId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta sanción del historial?')) {
      const updated = fines.filter(f => f.id !== fineId);
      updateTeamFines(updated);
    }
  };

  const getPlayerDebt = (playerId: string) =>
    fines.filter(f => f.playerId === playerId && f.status === 'pending').reduce((acc, f) => acc + f.amount, 0);

  const getPlayerPaid = (playerId: string) =>
    fines.filter(f => f.playerId === playerId && f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col gap-6 pb-16">
      {/* Header & KPI Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1F1F1F]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#EDEDED] tracking-[-0.025em] mb-1">Régimen Interno y Multas</h1>
          <p className="text-[13px] text-[#737373]">Control económico de sanciones, puntualidad y fondo común del vestuario.</p>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-lg overflow-hidden shrink-0">
          <div className="bg-[#0A0A0A] px-4 py-2.5 min-w-[140px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Bote Pagado</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="font-mono text-[18px] font-semibold text-[#EDEDED]">{totalPaid}€</div>
          </div>
          <div className="bg-[#0A0A0A] px-4 py-2.5 min-w-[140px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Pendiente</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="font-mono text-[18px] font-semibold text-[#EDEDED]">{totalPending}€</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left Column - List */}
        <div className="w-full xl:w-[55%] flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
            <input
              type="text"
              placeholder="Filtrar jugador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-[#0A0A0A] border border-[#1F1F1F] rounded-md pl-9 pr-3 text-[13px] text-[#EDEDED] placeholder:text-[#666666] focus:outline-none focus:border-[#404040] transition-colors"
            />
          </div>

          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 bg-[#0D0D0D] border-b border-[#1F1F1F] text-[11px] font-medium text-[#737373] uppercase tracking-[0.05em]">
              <div className="col-span-6">Jugador</div>
              <div className="col-span-3 text-right">Pendiente</div>
              <div className="col-span-3 text-right">Abonado</div>
            </div>

            <div className="divide-y divide-[#171717]">
              {filteredPlayers.map(player => {
                const debt = getPlayerDebt(player.id);
                const paid = getPlayerPaid(player.id);
                const isSelected = selectedPlayer?.id === player.id;

                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 items-center cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#141414]' : 'hover:bg-[#0F0F0F]'
                    }`}
                  >
                    <div className="col-span-1 sm:col-span-6 flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-md font-mono text-[12px] font-semibold flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                            : 'bg-[#111111] text-[#A1A1AA] border-[#262626]'
                        }`}
                      >
                        {player.number}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-[#EDEDED] truncate">{player.name}</h4>
                        <p className="text-[11px] text-[#666666]">{player.positionGroup}</p>
                      </div>
                    </div>
                    <div className="col-span-1 sm:col-span-3 flex sm:justify-end">
                      {debt > 0 ? (
                        <span className="font-mono text-[12px] font-medium px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                          -{debt}€
                        </span>
                      ) : (
                        <span className="text-[#525252] font-mono text-[12px]">0€</span>
                      )}
                    </div>
                    <div className="col-span-1 sm:col-span-3 flex sm:justify-end">
                      <span className={`font-mono text-[12px] ${paid > 0 ? 'text-emerald-400 font-medium' : 'text-[#525252]'}`}>
                        {paid > 0 ? `+${paid}€` : '0€'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Player Detail & Fines History */}
        <div className="w-full xl:w-[45%] xl:sticky xl:top-6">
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5 flex flex-col max-h-[calc(100vh-140px)]">
            {selectedPlayer ? (
              <>
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#1F1F1F]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#262626] flex items-center justify-center font-mono font-semibold text-[15px] text-[#EDEDED]">
                      {selectedPlayer.number}
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-[#EDEDED]">{selectedPlayer.name}</h2>
                      <p className="text-[12px] text-[#737373]">
                        Deuda activa:{' '}
                        <span className="font-mono text-[#EDEDED] font-medium">{getPlayerDebt(selectedPlayer.id)}€</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="h-8 px-3 rounded-md bg-[#EDEDED] text-[#0A0A0A] hover:bg-white transition-colors flex items-center gap-1.5 font-medium text-[12px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva Multa
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373] mb-3 flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5" /> Registro de Sanciones
                  </h3>

                  {selectedPlayerFines.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-[#1F1F1F] rounded-md text-[#666666]">
                      <CheckCircle2 className="w-6 h-6 text-[#404040] mx-auto mb-2" />
                      <p className="text-[12px]">Sin multas registradas para este jugador.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {selectedPlayerFines.map(fine => (
                        <div
                          key={fine.id}
                          className="p-3.5 rounded-md bg-[#0F0F0F] border border-[#1F1F1F] hover:border-[#2E2E2E] transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2.5">
                            <div className="flex-1 pr-3">
                              <h4 className="font-medium text-[#EDEDED] text-[13px]">{fine.reason}</h4>
                              <p className="font-mono text-[11px] text-[#666666] mt-0.5">
                                {new Date(fine.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`font-mono text-[14px] font-semibold ${
                                fine.status === 'paid' ? 'text-emerald-400' : 'text-[#EDEDED]'
                              }`}
                            >
                              {fine.amount}€
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#1A1A1A]">
                            <span
                              className={`font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                                fine.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {fine.status === 'paid' ? 'Abonada' : 'Pendiente'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => deleteFine(fine.id)}
                                className="p-1.5 text-[#666666] hover:text-red-400 hover:bg-[#1A1A1A] rounded transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleFineStatus(fine.id)}
                                className="h-7 px-2.5 rounded text-[11px] font-medium border border-[#262626] bg-[#141414] text-[#EDEDED] hover:bg-[#1F1F1F] transition-colors"
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
              <div className="text-center py-12 text-[#666666] flex-1 flex flex-col items-center justify-center">
                <Gavel className="w-8 h-8 text-[#333333] mb-2" />
                <p className="text-[13px]">Selecciona un jugador para ver o gestionar sus sanciones.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Fine Modal */}
      {showAddModal && selectedPlayer && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-lg max-w-md w-full relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#EDEDED]"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-[16px] font-semibold text-[#EDEDED] mb-1">Registrar Sanción</h2>
            <p className="text-[12px] text-[#737373] mb-5">
              Jugador: <span className="text-[#EDEDED] font-medium">{selectedPlayer.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Concepto / Motivo</label>
                <input
                  type="text"
                  value={fineReason}
                  onChange={e => setFineReason(e.target.value)}
                  className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                  placeholder="Ej. Retraso a la convocatoria"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Importe (€)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
                  <input
                    type="number"
                    value={fineAmount}
                    onChange={e => setFineAmount(Number(e.target.value) || '')}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md pl-8 pr-3 text-[13px] font-mono text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                    placeholder="5.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-3 rounded-md bg-[#111111] border border-[#262626] text-[12px] text-[#A1A1AA] hover:text-[#EDEDED]"
                >
                  Cancelar
                </button>
                <button
                  onClick={addFine}
                  disabled={!fineAmount || !fineReason}
                  className="h-8 px-4 bg-[#EDEDED] text-[#0A0A0A] font-medium text-[12px] rounded-md hover:bg-white disabled:opacity-40"
                >
                  Aplicar Sanción
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
