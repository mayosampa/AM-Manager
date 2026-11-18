import React from 'react';
import { Check, MessageSquare, Users } from 'lucide-react';
import { Player } from '../../../types';
import { DailyPlan } from '../../../components/TrainingPlanner';

interface SessionAttendanceAndNotesPanelProps {
  dayPlan: DailyPlan;
  rosterPlayers: Player[];
  onTogglePlayerAttendance: (playerId: string) => void;
  onMarkAllPresent: () => void;
  onUpdateNotes: (notes: string) => void;
}

export const SessionAttendanceAndNotesPanel: React.FC<SessionAttendanceAndNotesPanelProps> = ({
  dayPlan,
  rosterPlayers,
  onTogglePlayerAttendance,
  onMarkAllPresent,
  onUpdateNotes,
}) => {
  const absentSet = new Set(dayPlan.absentPlayers || []);
  const attendeesCount = rosterPlayers.filter(p => !absentSet.has(p.id)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Control de Asistencia */}
      <section className="lg:col-span-7 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#181818]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[13.5px] font-semibold text-[#EDEDED]">
              Asistencia de Plantilla a la Sesión
            </h3>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              {attendeesCount} / {rosterPlayers.length} asistentes
            </span>
          </div>
          {absentSet.size > 0 && (
            <button
              type="button"
              onClick={onMarkAllPresent}
              className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer"
            >
              ✓ Marcar todos presentes
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[230px] overflow-y-auto custom-scrollbar pr-1">
          {rosterPlayers.map(player => {
            const isAttending = !absentSet.has(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onTogglePlayerAttendance(player.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition-colors cursor-pointer ${
                  isAttending
                    ? 'bg-[#0E1310] border-emerald-500/25 text-[#EDEDED]'
                    : 'bg-[#070707] border-[#1A1A1A] text-[#666666]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center shrink-0 border ${
                    isAttending
                      ? 'bg-emerald-500 border-emerald-400 text-black'
                      : 'bg-transparent border-[#404040] text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className={`text-[12px] font-medium truncate ${!isAttending ? 'line-through' : ''}`}>
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Observaciones y Notas de Campo */}
      <section className="lg:col-span-5 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-5 flex flex-col justify-between space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-[#181818]">
          <MessageSquare className="w-4 h-4 text-[#A1A1AA]" />
          <h3 className="text-[13.5px] font-semibold text-[#EDEDED]">
            Observaciones y Notas de Campo de la Sesión
          </h3>
        </div>
        <textarea
          value={dayPlan.notes || ''}
          onChange={e => onUpdateNotes(e.target.value)}
          placeholder="Consignas del cuerpo técnico, distribución de petos, incidencias físicas, cargas individuales o recordatorios para el PDF de sesión..."
          className="w-full flex-1 min-h-[175px] p-3 bg-[#050505] border border-[#262626] rounded-lg text-[12.5px] text-[#EDEDED] placeholder-[#525252] focus:outline-none focus:border-[#525252] resize-none leading-relaxed"
        />
      </section>
    </div>
  );
};
