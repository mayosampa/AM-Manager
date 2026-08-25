import { useState } from 'react';
import { Play, Plus, Minus } from 'lucide-react';
import { MOCK_PLAYERS } from '../data/players';
import { Player } from '../types';
import { LiveMatch } from './LiveMatch';
import { useTeam } from '../context/TeamContext';
import { useEffect } from 'react';

type MatchPhase = 'pre' | 'live';

interface MatchDashboardProps {
  onNavigate?: (view: any) => void;
}

export function MatchDashboard({ onNavigate }: MatchDashboardProps) {
  const [phase, setPhase] = useState<MatchPhase>('pre');
  const { activeTeam, updateTeamCallUp } = useTeam();
  
  // Filter out injured and suspended players for the match day
  const basePlayers = activeTeam 
    ? activeTeam.players.filter(p => !p.isSuspended && p.status === 'available') 
    : MOCK_PLAYERS.filter(p => !p.isSuspended && p.status === 'available');

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(basePlayers);
  const [squad, setSquad] = useState<Player[]>([]);

  // Load persistent call-up
  useEffect(() => {
    if (activeTeam?.activeCallUp) {
      const calledUp = basePlayers.filter(p => activeTeam.activeCallUp!.includes(p.id));
      const notCalledUp = basePlayers.filter(p => !activeTeam.activeCallUp!.includes(p.id));
      setSquad(calledUp);
      setAvailablePlayers(notCalledUp);
    } else {
      setSquad([]);
      setAvailablePlayers(basePlayers);
    }
  }, [activeTeam?.id]); // Only run when activeTeam changes, not when activeCallUp changes to avoid loops

  const moveToSquad = (p: Player) => {
    setAvailablePlayers(prev => prev.filter(x => x.id !== p.id));
    setSquad(prev => {
      const newSquad = [...prev, p];
      updateTeamCallUp(newSquad.map(x => x.id));
      return newSquad;
    });
  };

  const removeFromSquad = (p: Player) => {
    setSquad(prev => {
      const newSquad = prev.filter(x => x.id !== p.id);
      updateTeamCallUp(newSquad.map(x => x.id));
      return newSquad;
    });
    setAvailablePlayers(prev => [...prev, p]);
  };

  const startMatch = () => {
    if (squad.length === 0) {
      alert('Debes convocar al menos a un jugador.');
      return;
    }
    setPhase('live');
  };

  if (phase === 'live') {
    return <LiveMatch squad={squad} bench={availablePlayers} onNavigate={onNavigate || (() => {})} />;
  }

  // PRE MATCH
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20">
      <div className="flex justify-between items-center bg-[#121215] p-6 rounded-2xl border border-[#2A2A2E]">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Convocatoria</h1>
          <p className="text-[#6E6E75]">Selecciona los jugadores disponibles para el partido.</p>
        </div>
        <button
          onClick={startMatch}
          disabled={squad.length === 0}
          className="bg-[#FF4B4B] text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <Play className="w-5 h-5 fill-current" /> Iniciar Partido
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available */}
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4 flex items-center justify-between">
            Disponibles
            <span className="bg-[#1C1C1F] text-[#6E6E75] px-3 py-1 rounded-full text-sm">{availablePlayers.length}</span>
          </h2>
          <div className="flex flex-col gap-2">
            {availablePlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-[#1C1C1F] rounded-xl border border-[#2A2A2E]">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#2A2A2E] flex items-center justify-center font-bold text-sm text-[#6E6E75]">
                    {p.number}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white leading-tight">{p.name}</span>
                    <span className="text-xs text-[#6E6E75]">{p.positionGroup}{p.position ? ` - ${p.position}` : ''}</span>
                  </div>
                </div>
                <button 
                  onClick={() => moveToSquad(p)}
                  className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Squad */}
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4 flex items-center justify-between">
            Convocados
            <span className="bg-[#FF4B4B]/10 text-[#FF4B4B] px-3 py-1 rounded-full text-sm">{squad.length}</span>
          </h2>
          {squad.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[#2A2A2E] rounded-xl">
              <p className="text-[#6E6E75] font-semibold">Sin convocar</p>
              <p className="text-[#6E6E75] text-sm">Añade jugadores desde la lista</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {squad.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[#FF4B4B]/5 rounded-xl border border-[#FF4B4B]/20">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#FF4B4B] flex items-center justify-center font-bold text-sm text-black shadow-sm shadow-[#FF4B4B]/30">
                      {p.number}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-white leading-tight">{p.name}</span>
                      <span className="text-xs text-[#FF4B4B]/70">{p.positionGroup}{p.position ? ` - ${p.position}` : ''}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromSquad(p)}
                    className="p-2 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded-lg hover:bg-[#FF4B4B]/20 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
