import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { useTeam } from '../context/TeamContext';
import { CheckCircle, Save, X } from 'lucide-react';

interface BulkEvaluationModalProps {
  players: Player[];
  matchId: string;
  matchDate: string;
  opponent?: string;
  onComplete: (evals?: Record<string, { rating: number; notes: string }>) => void;
}

export function BulkEvaluationModal({ players, matchId, matchDate, opponent, onComplete }: BulkEvaluationModalProps) {
  const { updateTeamPlayers } = useTeam();
  const [evaluations, setEvaluations] = useState<Record<string, { rating: number; notes: string }>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

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
    onComplete(evaluations);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 rounded-t-lg flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-[#059669]" />
              Evaluación del Vestuario
            </h2>
            <p className="text-slate-600 text-sm mt-1">Puntúa rápidamente a los convocados para nutrir el historial de rendimiento.</p>
          </div>
          <button
            onClick={() => onComplete()}
            className="p-2 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex flex-col gap-3">
            {players.map(player => {
              const currentEval = evaluations[player.id];
              const currentRating = currentEval?.rating || 0;

              return (
                <div key={player.id} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-md border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Player Info */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-sm">
                        {player.number}
                      </div>
                      <span className="font-bold text-slate-900 truncate">{player.name}</span>
                    </div>

                    {/* Rating 1-10 */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => handleRating(player.id, val)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex shrink-0 items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                            currentRating >= val 
                              ? (currentRating >= 8 ? 'bg-[#059669] text-white' : currentRating >= 5 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white')
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
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
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] resize-none min-h-[60px]"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-3 shrink-0">
          <button 
            onClick={() => onComplete()}
            className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Saltar
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-[#059669] text-white font-semibold rounded-md hover:bg-[#047857] transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Finalizar Partido
          </button>
        </div>

      </div>
    </div>
  );
}
