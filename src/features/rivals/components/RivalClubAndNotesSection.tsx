import React, { useState } from 'react';
import { Trash2, MapPin, Trophy, NotebookPen, X } from 'lucide-react';
import { RivalTeam, RivalScoutingReport } from '../../../types';
import { RivalHeadToHeadSummary } from '../services/rivalsService';

interface RivalClubAndNotesSectionProps {
  draft: RivalTeam;
  h2h: RivalHeadToHeadSummary | null;
  onChangeDraft: (next: RivalTeam) => void;
  onUpdateScouting: (updater: (prev: RivalScoutingReport) => RivalScoutingReport) => void;
  onDeleteClub: () => void;
}

export const RivalClubAndNotesSection: React.FC<RivalClubAndNotesSectionProps> = ({
  draft,
  h2h,
  onChangeDraft,
  onUpdateScouting,
  onDeleteClub,
}) => {
  const [quickNote, setQuickNote] = useState('');

  const handleAddQuickNote = () => {
    if (!quickNote.trim()) return;
    const entry = {
      id: `note-${Date.now()}`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      text: quickNote.trim(),
    };
    onUpdateScouting(prev => ({ ...prev, notesLog: [entry, ...(prev.notesLog || [])] }));
    setQuickNote('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-lime-400" /> Ficha del Club e Instalación
            </h4>
            <button type="button" onClick={onDeleteClub} className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar Club
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Nombre del Rival</label>
              <input type="text" value={draft.name} onChange={e => onChangeDraft({ ...draft, name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Estadio / Campo</label>
              <input type="text" value={draft.stadium || ''} onChange={e => onChangeDraft({ ...draft, stadium: e.target.value })} placeholder="Autocompleta al jugar fuera" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Dimensiones / Superficie</label>
              <input type="text" value={draft.pitchInfo || ''} onChange={e => onChangeDraft({ ...draft, pitchInfo: e.target.value })} placeholder="Ej. Césped artificial, estrecho" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4" /> Enfrentamientos Directos (H2H)
          </h4>
          {h2h && h2h.played > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <div className="bg-zinc-900 rounded-lg py-1.5"><div className="text-sm font-black text-white">{h2h.played}</div><div className="text-[10px] text-zinc-500">PJ</div></div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-1.5"><div className="text-sm font-black text-emerald-400">{h2h.wins}</div><div className="text-[10px] text-emerald-500/80">G</div></div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg py-1.5"><div className="text-sm font-black text-amber-400">{h2h.draws}</div><div className="text-[10px] text-amber-500/80">E</div></div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg py-1.5"><div className="text-sm font-black text-red-400">{h2h.losses}</div><div className="text-[10px] text-red-500/80">P</div></div>
                <div className="bg-zinc-900 rounded-lg py-1.5"><div className="text-sm font-black text-zinc-200">{h2h.goalsFor}:{h2h.goalsAgainst}</div><div className="text-[10px] text-zinc-500">GF:GC</div></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h2h.matches.slice(0, 4).map(m => (
                  <span key={m.id} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">
                    {m.date} ({m.condition === 'Visitante' ? 'V' : 'L'}): <strong>{m.myScore}-{m.rivalScore}</strong>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic my-auto">Sin partidos registrados contra {draft.name} en el historial.</p>
          )}
        </div>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
          <NotebookPen className="w-4 h-4" /> Cuaderno de Notas Libres y Observaciones Abiertas
        </h4>
        <textarea
          rows={3}
          value={draft.scouting.freeNotes}
          onChange={e => onUpdateScouting(prev => ({ ...prev, freeNotes: e.target.value }))}
          placeholder="Apuntes abiertos del rival: bajas por sanción/lesión, estado anímico, estilo del entrenador, horarios habituales, observaciones en vivo..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
        />
        <div className="flex gap-2">
          <input type="text" value={quickNote} onChange={e => setQuickNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddQuickNote())} placeholder="Añadir entrada rápida con fecha a la bitácora (ej. Su delantero #9 está sancionado esta jornada)..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white" />
          <button type="button" onClick={handleAddQuickNote} className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 text-xs font-bold">Añadir Apunte</button>
        </div>
        {draft.scouting.notesLog && draft.scouting.notesLog.length > 0 && (
          <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
            {draft.scouting.notesLog.map(n => (
              <div key={n.id} className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded px-2.5 py-1 text-xs">
                <span className="text-zinc-300"><strong className="text-sky-400 mr-2">[{n.date}]</strong>{n.text}</span>
                <button type="button" onClick={() => onUpdateScouting(prev => ({ ...prev, notesLog: (prev.notesLog || []).filter(x => x.id !== n.id) }))} className="text-zinc-500 hover:text-red-400 ml-2"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
