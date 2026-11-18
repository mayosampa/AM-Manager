import React, { useEffect } from 'react';
import { X, Shield, Plus, Save, FileDown, Share2, Check } from 'lucide-react';
import { MatchRecord } from '../../../types';
import { useTeam } from '../../../context/TeamContext';
import { useRivalEditorState } from '../hooks/useRivalEditorState';
import { RivalAddClubInlineBar } from './RivalAddClubInlineBar';
import { RivalClubAndNotesSection } from './RivalClubAndNotesSection';
import { RivalTacticalSection } from './RivalTacticalSection';

interface RivalScoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
  teamName?: string;
  initialRivalName?: string;
  matches?: MatchRecord[];
}

export const RivalScoutingModal: React.FC<RivalScoutingModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  initialRivalName,
  matches,
}) => {
  const { teamSettings } = useTeam();
  const resolvedTeamName = teamName || 'Mi Equipo';
  const ownClubName =
    teamSettings?.officialCompetitionLink?.officialTeamName ||
    teamSettings?.rfafLink?.clubRfaf ||
    resolvedTeamName;
  const standings = teamSettings?.rfafLink?.standings || [];

  const editor = useRivalEditorState({
    teamId,
    teamName: resolvedTeamName,
    ownClubName,
    standings,
    externalMatches: matches,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || editor.loading) return;
    if (initialRivalName?.trim()) {
      void editor.selectOrCreateByName(initialRivalName.trim());
      return;
    }
    if (editor.rivals.length > 0 && !editor.selectedRivalId) {
      editor.selectRivalById(editor.rivals[0].id);
    }
  }, [isOpen, editor.loading, initialRivalName, editor.rivals.length, editor.selectedRivalId, editor.selectOrCreateByName, editor.selectRivalById]);

  if (!isOpen) return null;

  const { draft, profiles, rivals } = editor;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-5">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#141414] border border-[#262626] flex items-center justify-center text-[#EDEDED]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#EDEDED] tracking-[-0.02em]">
                Directorio de Rivales & Scouting
              </h2>
              <p className="text-[11px] text-[#737373]">
                Base centralizada de clubes de la liga (<span className="font-mono">{rivals.length}</span> registrados)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={editor.selectedRivalId}
              onChange={e => editor.selectRivalById(e.target.value)}
              className="h-8 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] font-medium text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            >
              {rivals.length === 0 && <option value="">Sin clubes registrados</option>}
              {(profiles.length > 0 ? profiles.map(p => p.rival) : rivals).map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.stadium ? `(${r.stadium})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => editor.setIsAddingClub(!editor.isAddingClub)}
              className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#888888]" /> Nuevo Club
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-1.5 rounded-md text-[#737373] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {editor.toastMsg && (
          <div className="bg-[#111111] border-b border-[#262626] px-4 py-2 text-[12px] font-medium text-[#EDEDED] flex items-center justify-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> {editor.toastMsg}
          </div>
        )}

        {editor.isAddingClub && (
          <RivalAddClubInlineBar
            compact
            newClubName={editor.newClubName}
            newClubStadium={editor.newClubStadium}
            onChangeName={editor.setNewClubName}
            onChangeStadium={editor.setNewClubStadium}
            onCreate={editor.createClub}
            onCancel={() => editor.setIsAddingClub(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {!draft ? (
            <div className="text-center py-12 text-[#666666] text-[13px]">
              Selecciona o añade un club para ver su ficha táctica.
            </div>
          ) : (
            <>
              <RivalClubAndNotesSection
                draft={draft}
                h2h={editor.h2h}
                profile={editor.activeProfile}
                onChangeDraft={editor.setDraft}
                onUpdateScouting={editor.updateScouting}
                onDeleteClub={editor.deleteDraft}
              />
              <RivalTacticalSection scouting={draft.scouting} onChange={editor.updateScouting} />
            </>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-[#1F1F1F] bg-[#0D0D0D] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#666666]">
            {draft?.scouting.updatedAt ? `Actualizado · ${new Date(draft.scouting.updatedAt).toLocaleString('es-ES')}` : ''}
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button type="button" onClick={editor.copyWhatsApp} disabled={!draft} className="w-full sm:w-auto justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40">
              <Share2 className="w-3.5 h-3.5 text-[#888888]" /> Copiar WhatsApp
            </button>
            <button type="button" onClick={editor.exportPdf} disabled={!draft} className="w-full sm:w-auto justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40">
              <FileDown className="w-3.5 h-3.5 text-[#888888]" /> Plantilla PDF
            </button>
            <button type="button" onClick={editor.saveDraft} disabled={!draft} className="w-full sm:w-auto justify-center h-8 flex items-center gap-1.5 px-3.5 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-medium transition-colors disabled:opacity-40">
              <Save className="w-3.5 h-3.5" /> Guardar Informe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
