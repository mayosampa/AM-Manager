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
    showToast('✅ Informe y datos del club guardados');
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
    showToast('📋 Informe táctico copiado para WhatsApp');
  };

  const handleExportPdf = async () => {
    if (!draft || !h2h) return;
    await upsertRival(draft);
    exportRivalScoutingPDF(draft, teamName || 'Mi Equipo', h2h);
    showToast('📄 Plantilla PDF generada');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Base de Datos de Rivales & Scouting</h2>
              <p className="text-xs text-zinc-400">Directorio centralizado de clubes de la liga ({rivals.length} registrados)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={selectedRivalId} onChange={e => handleSelectRival(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-lime-500">
              {rivals.length === 0 && <option value="">Sin clubes registrados</option>}
              {rivals.map(r => (
                <option key={r.id} value={r.id}>{r.name} {r.stadium ? `(${r.stadium})` : ''}</option>
              ))}
            </select>
            <button type="button" onClick={() => setIsAddingClub(!isAddingClub)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/30 text-lime-300 text-xs font-bold transition-colors">
              <Plus className="w-4 h-4" /> Nuevo Club
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="bg-lime-500/20 border-b border-lime-500/40 px-4 py-2 text-xs font-bold text-lime-300 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {toastMsg}
          </div>
        )}

        {isAddingClub && (
          <div className="bg-zinc-950/90 border-b border-zinc-800 px-5 py-3 flex flex-wrap items-center gap-2">
            <input type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Nombre oficial del club (ej. Cártama B)" className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white" />
            <input type="text" value={newClubStadium} onChange={e => setNewClubStadium(e.target.value)} placeholder="Estadio / Campo (opcional)" className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white" />
            <button type="button" onClick={handleCreateClub} className="px-3 py-1.5 rounded-lg bg-lime-500 text-zinc-950 text-xs font-bold hover:bg-lime-400">Crear</button>
            <button type="button" onClick={() => setIsAddingClub(false)} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs">Cancelar</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {!draft ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Selecciona o añade un club para ver su ficha táctica.</div>
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

        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">
            {draft?.scouting.updatedAt ? `Última actualización: ${new Date(draft.scouting.updatedAt).toLocaleString('es-ES')}` : ''}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCopyWhatsApp} disabled={!draft} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-40">
              <Share2 className="w-4 h-4" /> Copiar WhatsApp
            </button>
            <button type="button" onClick={handleExportPdf} disabled={!draft} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors disabled:opacity-40">
              <FileDown className="w-4 h-4 text-lime-400" /> Descargar Plantilla PDF
            </button>
            <button type="button" onClick={handleSave} disabled={!draft} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-black transition-colors disabled:opacity-40">
              <Save className="w-4 h-4" /> Guardar Informe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
