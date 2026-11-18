import React from 'react';
import { ArrowLeft, Plus, Save, FileDown, Share2 } from 'lucide-react';
import { RivalIntelligenceProfile } from '../../../services/rivalAnalyticsHelper';

interface RivalDetailToolbarProps {
  profiles: RivalIntelligenceProfile[];
  selectedRivalId: string;
  hasDraft: boolean;
  onBackToOverview: () => void;
  onSelectRival: (rivalId: string) => void;
  onToggleAddClub: () => void;
  onCopyWhatsApp: () => void;
  onExportPdf: () => void;
  onSave: () => void;
}

export const RivalDetailToolbar: React.FC<RivalDetailToolbarProps> = ({
  profiles,
  selectedRivalId,
  hasDraft,
  onBackToOverview,
  onSelectRival,
  onToggleAddClub,
  onCopyWhatsApp,
  onExportPdf,
  onSave,
}) => {
  return (
    <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBackToOverview}
          className="h-8 px-3 rounded-md bg-[#141414] hover:bg-[#1F1F1F] border border-[#2A2A2A] text-[#EDEDED] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Todos los Rivales
        </button>

        <select
          value={selectedRivalId}
          onChange={e => onSelectRival(e.target.value)}
          aria-label="Cambiar club rival"
          className="h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] font-medium text-[#EDEDED] focus:outline-none focus:border-[#525252] min-w-[210px]"
        >
          {profiles.length === 0 && <option value="">Sin clubes registrados</option>}
          {profiles.map(p => (
            <option key={p.rival.id} value={p.rival.id}>
              {p.standing ? `${p.standing.pos}º · ` : ''}
              {p.rival.name}
              {p.rival.stadium ? ` (${p.rival.stadium})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onToggleAddClub}
          className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#171717] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#888888]" /> Nuevo Club
        </button>
        <button
          type="button"
          onClick={onCopyWhatsApp}
          disabled={!hasDraft}
          className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#171717] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-[#888888]" /> WhatsApp
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={!hasDraft}
          className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#171717] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5 text-[#888888]" /> Plantilla PDF
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!hasDraft}
          className="h-8 flex items-center gap-1.5 px-3.5 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-semibold transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> Guardar Informe
        </button>
      </div>
    </div>
  );
};
