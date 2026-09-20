import React, { useState } from 'react';
import { Player } from '../types';
import { useTeam } from '../context/TeamContext';
import { CheckCircle, Save } from 'lucide-react';

interface BulkEvaluationModalProps {
  players: Player[];
  matchId: string;
  matchDate: string;
  opponent?: string;
  onComplete: (evals?: Record<string, {rating: number, notes: string}>) => void;
}

export function BulkEvaluationModal({ players, matchId, matchDate, opponent, onComplete }: BulkEvaluationModalProps) {
  const { updateTeamPlayers } = useTeam();
  const [evaluations, setEvaluations] = useState<Record<string, { rating: number; notes: string }>>({});

  const handleRating = (playerId: string, rating: number) => {
    setEvaluations(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], rating, notes: prev[playerId]?.notes || '' }
    }));
  };

  const handleNotes = (playerId: string, notes: string) => {
    setEvaluations(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], rating: prev[playerId]?.rating || 5, notes }
    }));
  };

  const handleSave = () => {
    const activePlayersMap = new Map(players.map(p => [p.id, p]));
    
    // updateTeamPlayers needs the full team. 
    // Wait, useTeam activeTeam is missing here but we can get it from hook.
    // Let's pass the activeTeam players from context or just fetch them inside.
    
    onComplete(evaluations); // We will handle the save outside for safer context update
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2E] bg-[#1C1C1F] rounded-t-2xl flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              Evaluación del Vestuario
            </h2>
            <p className="text-[#6E6E75] text-sm mt-1">Puntúa rápidamente a los convocados para nutrir el historial de rendimiento.</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex flex-col gap-3">
            {players.map(player => {
              const currentEval = evaluations[player.id];
              const currentRating = currentEval?.rating || 0;

              return (
                <div key={player.id} className="flex flex-col gap-3 bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Player Info */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2E] flex items-center justify-center font-bold text-white text-sm">
                        {player.number}
                      </div>
                      <span className="font-bold text-white truncate">{player.name}</span>
                    </div>

                    {/* Rating 1-10 */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => handleRating(player.id, val)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex shrink-0 items-center justify-center text-xs font-bold transition-all ${
                            currentRating >= val 
                              ? (currentRating >= 8 ? 'bg-emerald-500 text-black' : currentRating >= 5 ? 'bg-yellow-500 text-black' : 'bg-[#FF4B4B] text-black')
                              : 'bg-[#121215] text-[#6E6E75] border border-[#2A2A2E] hover:bg-[#2A2A2E]'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <textarea
                    placeholder="Añadir observación del jugador (táctica, física, etc)..."
                    value={currentEval?.notes || ''}
                    onChange={(e) => handleNotes(player.id, e.target.value)}
                    className="w-full bg-[#121215] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6E6E75] focus:outline-none focus:border-yellow-500/50 resize-none min-h-[60px]"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A2E] bg-[#1C1C1F] rounded-b-2xl flex justify-end gap-3 shrink-0">
          <button 
            onClick={() => onComplete()}
            className="px-6 py-2 bg-[#2A2A2E] text-white font-bold rounded-xl hover:bg-[#3f3f46] transition-colors"
          >
            Saltar
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-[#FF4B4B] text-black font-bold rounded-xl hover:bg-red-400 transition-colors shadow-lg shadow-[#FF4B4B]/20"
          >
            <Save className="w-5 h-5" />
            Finalizar Partido
          </button>
        </div>

      </div>
    </div>
  );
}
