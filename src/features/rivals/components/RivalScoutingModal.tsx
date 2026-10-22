import React, { useState, useEffect, useMemo } from 'react';
import { X, Shield, Plus, Save, FileDown, Share2, Check } from 'lucide-react';
import { MatchRecord, RivalTeam, RivalScoutingReport } from '../../../types';
import { useRivalsDb } from '../hooks/useRivalsDb';
import { computeHeadToHead } from '../services/rivalsService';
import { buildRivalScoutingWhatsappText, exportRivalScoutingPDF } from '../services/rivalScoutingPdf';
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
  matches = [],
}) => {
  const { rivals, loading, upsertRival, addQuickRival, removeRival } = useRivalsDb(teamId);
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');
  const [draft, setDraft] = useState<RivalTeam | null>(null);
  const [isAddingClub, setIsAddingClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubStadium, setNewClubStadium] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || loading) return;
    if (initialRivalName?.trim()) {
      const target = initialRivalName.trim().toLowerCase();
      const existing = rivals.find(r => r.name.trim().toLowerCase() === target);
      if (existing) {
        setSelectedRivalId(existing.id);
        setDraft(JSON.parse(JSON.stringify(existing)));
      } else {
        addQuickRival(initialRivalName.trim()).then(created => {
          if (created) {
            setSelectedRivalId(created.id);
            setDraft(JSON.parse(JSON.stringify(created)));
          }
        });
      }
      return;
    }
    if (rivals.length > 0 && !selectedRivalId) {
      setSelectedRivalId(rivals[0].id);
      setDraft(JSON.parse(JSON.stringify(rivals[0])));
    }
  }, [isOpen, loading, initialRivalName, rivals.length]);

  const handleSelectRival = (id: string) => {
    setSelectedRivalId(id);
    const found = rivals.find(r => r.id === id);
    if (found) setDraft(JSON.parse(JSON.stringify(found)));
  };

  const handleCreateClub = async () => {
    if (!newClubName.trim()) return;
    const created = await addQuickRival(newClubName.trim(), newClubStadium.trim() || undefined);
    if (created) {
      setSelectedRivalId(created.id);
      setDraft(JSON.parse(JSON.stringify(created)));
      setNewClubName('');
      setNewClubStadium('');
      setIsAddingClub(false);
      showToast(`Club "${created.name}" añadido a la Liga`);
    }
  };

  const handleSave = async () => {
    if (!draft || !draft.name.trim()) return;
    await upsertRival(draft);
    showToast('Informe y datos del club guardados');
  };

  const handleDeleteClub = async () => {
    if (!draft) return;
    if (!window.confirm(`¿Eliminar "${draft.name}" del directorio de clubes?`)) return;
    await removeRival(draft.id);
    const remaining = rivals.filter(r => r.id !== draft.id);
    setSelectedRivalId(remaining[0]?.id || '');
    setDraft(remaining[0] ? JSON.parse(JSON.stringify(remaining[0])) : null);
    showToast('Club eliminado');
  };

  const updateScouting = (updater: (prev: RivalScoutingReport) => RivalScoutingReport) => {
    setDraft(prev => (prev ? { ...prev, scouting: updater(prev.scouting) } : prev));
  };

  const h2h = useMemo(() => (draft ? computeHeadToHead(draft.name, matches) : null), [draft?.name, matches]);

  const handleCopyWhatsApp = async () => {
    if (!draft || !h2h) return;
    await upsertRival(draft);
    const text = buildRivalScoutingWhatsappText(draft, teamName || 'Mi Equipo', h2h);
    await navigator.clipboard.writeText(text);
    showToast('Informe táctico copiado para WhatsApp');
  };

  const handleExportPdf = async () => {
    if (!draft || !h2h) return;
    await upsertRival(draft);
    exportRivalScoutingPDF(draft, teamName || 'Mi Equipo', h2h);
    showToast('Plantilla PDF generada');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-5">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#141414] border border-[#262626] flex items-center justify-center text-[#EDEDED]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#EDEDED] tracking-[-0.02em]">Directorio de Rivales & Scouting</h2>
              <p className="text-[11px] text-[#737373]">
                Base centralizada de clubes de la liga (<span className="font-mono">{rivals.length}</span> registrados)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedRivalId}
              onChange={e => handleSelectRival(e.target.value)}
              className="h-8 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] font-medium text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            >
              {rivals.length === 0 && <option value="">Sin clubes registrados</option>}
              {rivals.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.stadium ? `(${r.stadium})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsAddingClub(!isAddingClub)}
              className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#888888]" /> Nuevo Club
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-[#737373] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="bg-[#111111] border-b border-[#262626] px-4 py-2 text-[12px] font-medium text-[#EDEDED] flex items-center justify-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> {toastMsg}
          </div>
        )}

        {isAddingClub && (
          <div className="bg-[#0D0D0D] border-b border-[#1F1F1F] px-5 py-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newClubName}
              onChange={e => setNewClubName(e.target.value)}
              placeholder="Nombre oficial del club (ej. Cártama B)"
              className="flex-1 min-w-[180px] h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED]"
            />
            <input
              type="text"
              value={newClubStadium}
              onChange={e => setNewClubStadium(e.target.value)}
              placeholder="Estadio / Campo (opcional)"
              className="flex-1 min-w-[180px] h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED]"
            />
            <button
              type="button"
              onClick={handleCreateClub}
              className="h-8 px-3 rounded-md bg-[#EDEDED] text-[#0A0A0A] text-[12px] font-medium hover:bg-white"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setIsAddingClub(false)}
              className="h-8 px-2.5 rounded-md bg-[#111111] border border-[#262626] text-[#A1A1AA] text-[12px]"
            >
              Cancelar
            </button>
          </div>
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
                h2h={h2h}
                onChangeDraft={setDraft}
                onUpdateScouting={updateScouting}
                onDeleteClub={handleDeleteClub}
              />
              <RivalTacticalSection scouting={draft.scouting} onChange={updateScouting} />
            </>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-[#1F1F1F] bg-[#0D0D0D] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#666666]">
            {draft?.scouting.updatedAt
              ? `Actualizado · ${new Date(draft.scouting.updatedAt).toLocaleString('es-ES')}`
              : ''}
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              disabled={!draft}
              className="w-full sm:w-auto justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40"
            >
              <Share2 className="w-3.5 h-3.5 text-[#888888]" /> Copiar WhatsApp
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!draft}
              className="w-full sm:w-auto justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5 text-[#888888]" /> Plantilla PDF
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft}
              className="w-full sm:w-auto justify-center h-8 flex items-center gap-1.5 px-3.5 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-medium transition-colors disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Informe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
