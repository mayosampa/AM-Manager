import React, { useState } from 'react';
import { Trash2, MapPin, NotebookPen, X } from 'lucide-react';
import { RivalTeam, RivalScoutingReport } from '../../../types';
import { RivalHeadToHeadSummary } from '../services/rivalsService';
import { RivalIntelligenceProfile } from '../../../services/rivalAnalyticsHelper';
import { RivalH2HDetailCard } from './RivalH2HDetailCard';

interface RivalClubAndNotesSectionProps {
  draft: RivalTeam;
  h2h: RivalHeadToHeadSummary | null;
  profile?: RivalIntelligenceProfile | null;
  onChangeDraft: (next: RivalTeam) => void;
  onUpdateScouting: (updater: (prev: RivalScoutingReport) => RivalScoutingReport) => void;
  onDeleteClub: () => void;
}

export const RivalClubAndNotesSection: React.FC<RivalClubAndNotesSectionProps> = ({
  draft,
  h2h,
  profile,
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
        <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#1A1A1A]">
            <h4 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#EDEDED] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#888888]" /> Ficha del Club e Instalación
            </h4>
            <button
              type="button"
              onClick={onDeleteClub}
              className="text-[11px] text-[#737373] hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar Club
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1">Nombre del Rival</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => onChangeDraft({ ...draft, name: e.target.value })}
                className="w-full h-8 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] font-medium text-[#EDEDED] focus:outline-none focus:border-[#525252]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1">Estadio / Campo</label>
              <input
                type="text"
                value={draft.stadium || ''}
                onChange={e => onChangeDraft({ ...draft, stadium: e.target.value })}
                placeholder="Autocompleta al jugar fuera"
                className="w-full h-8 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#525252]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1">Dimensiones / Superficie</label>
              <input
                type="text"
                value={draft.pitchInfo || ''}
                onChange={e => onChangeDraft({ ...draft, pitchInfo: e.target.value })}
                placeholder="Ej. Césped artificial, estrecho"
                className="w-full h-8 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#525252]"
              />
            </div>
          </div>
        </div>

        <RivalH2HDetailCard rivalName={draft.name} h2h={h2h} profile={profile} />
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 space-y-3">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#EDEDED] flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
          <NotebookPen className="w-3.5 h-3.5 text-[#888888]" /> Cuaderno de Notas Libres y Bitácora
        </h4>
        <textarea
          rows={3}
          value={draft.scouting.freeNotes}
          onChange={e => onUpdateScouting(prev => ({ ...prev, freeNotes: e.target.value }))}
          placeholder="Apuntes abiertos del rival: bajas por sanción/lesión, estado anímico, estilo del entrenador, observaciones en vivo..."
          className="w-full bg-[#050505] border border-[#262626] rounded-md p-2.5 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#525252] resize-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddQuickNote())}
            placeholder="Añadir entrada rápida con fecha a la bitácora (ej. Su delantero #9 está sancionado esta jornada)..."
            className="flex-1 h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#525252]"
          />
          <button
            type="button"
            onClick={handleAddQuickNote}
            className="h-8 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors"
          >
            Añadir Apunte
          </button>
        </div>
        {draft.scouting.notesLog && draft.scouting.notesLog.length > 0 && (
          <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
            {draft.scouting.notesLog.map(n => (
              <div
                key={n.id}
                className="flex items-center justify-between bg-[#0F0F0F] border border-[#1F1F1F] rounded px-3 py-1.5 text-[12px]"
              >
                <span className="text-[#EDEDED]">
                  <span className="font-mono text-[11px] text-[#737373] mr-2">[{n.date}]</span>
                  {n.text}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateScouting(prev => ({
                      ...prev,
                      notesLog: (prev.notesLog || []).filter(x => x.id !== n.id),
                    }))
                  }
                  className="text-[#666666] hover:text-red-400 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
