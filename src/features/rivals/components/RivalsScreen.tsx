import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Save, FileDown, Share2, Check } from 'lucide-react';
import { MatchRecord, RivalTeam, RivalScoutingReport } from '../../../types';
import { useTeam } from '../../../context/TeamContext';
import { db } from '../../../services/db';
import { useRivalsDb } from '../hooks/useRivalsDb';
import { computeHeadToHead } from '../services/rivalsService';
import { buildRivalScoutingWhatsappText, exportRivalScoutingPDF } from '../services/rivalScoutingPdf';
import { RivalClubAndNotesSection } from './RivalClubAndNotesSection';
import { RivalTacticalSection } from './RivalTacticalSection';

export const RivalsScreen: React.FC = () => {
  const { activeTeam } = useTeam();
  const teamId = activeTeam?.id;
  const teamName = activeTeam?.name || 'Mi Equipo';

  const { rivals, loading, upsertRival, addQuickRival, removeRival } = useRivalsDb(teamId);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
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
    if (!teamId) {
      setMatches([]);
      return;
    }
    db.getMatches(teamId).then(res => setMatches(res || [])).catch(() => setMatches([]));
  }, [teamId]);

  useEffect(() => {
    if (loading) return;
    if (rivals.length > 0) {
      const currentExists = rivals.find(r => r.id === selectedRivalId);
      const target = currentExists || rivals[0];
      setSelectedRivalId(target.id);
      setDraft(JSON.parse(JSON.stringify(target)));
    } else {
      setSelectedRivalId('');
      setDraft(null);
    }
  }, [loading, teamId, rivals.length]);

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
    const text = buildRivalScoutingWhatsappText(draft, teamName, h2h);
    await navigator.clipboard.writeText(text);
    showToast('📋 Informe táctico copiado para WhatsApp');
  };

  const handleExportPdf = async () => {
    if (!draft || !h2h) return;
    await upsertRival(draft);
    exportRivalScoutingPDF(draft, teamName, h2h);
    showToast('📄 Plantilla PDF generada');
  };

  return (
    <div className="max-w-6xl mx-auto w-full pb-20 space-y-6">
      {/* Top Toolbar */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#111111] border border-[#262626] flex items-center justify-center text-[#EDEDED]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#EDEDED] tracking-[-0.025em]">Directorio de Rivales</h1>
            <p className="text-[12px] text-[#737373]">Base de datos de clubes de la liga, informes tácticos y plantillas PDF · <span className="font-mono text-[#A1A1AA]">{rivals.length}</span> clubes</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedRivalId}
            onChange={e => handleSelectRival(e.target.value)}
            className="h-8 bg-[#0A0A0A] border border-[#262626] rounded-md px-3 text-[12px] font-medium text-[#EDEDED] focus:outline-none focus:border-[#525252]"
          >
            {rivals.length === 0 && <option value="">Sin clubes registrados</option>}
            {rivals.map(r => (
              <option key={r.id} value={r.id}>{r.name} {r.stadium ? `(${r.stadium})` : ''}</option>
            ))}
          </select>
          <button type="button" onClick={() => setIsAddingClub(!isAddingClub)} className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#171717] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors">
            <Plus className="w-3.5 h-3.5 text-[#888888]" /> Nuevo Club
          </button>
          <button type="button" onClick={handleCopyWhatsApp} disabled={!draft} className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#171717] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40">
            <Share2 className="w-3.5 h-3.5 text-[#888888]" /> WhatsApp
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!draft} className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#111111] hover:bg-[#171717] border border-[#262626] text-[#EDEDED] text-[12px] font-medium transition-colors disabled:opacity-40">
            <FileDown className="w-3.5 h-3.5 text-[#888888]" /> Plantilla PDF
          </button>
          <button type="button" onClick={handleSave} disabled={!draft} className="h-8 flex items-center gap-1.5 px-3.5 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-medium transition-colors disabled:opacity-40">
            <Save className="w-3.5 h-3.5" /> Guardar Informe
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-[#111111] border border-[#2E2E2E] rounded-md px-4 py-2.5 text-[12px] font-medium text-[#EDEDED] flex items-center justify-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> {toastMsg}
        </div>
      )}

      {isAddingClub && (
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4 flex flex-wrap items-center gap-2.5">
          <input type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Nombre oficial del club (ej. Cártama B)" className="flex-1 min-w-[200px] h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]" />
          <input type="text" value={newClubStadium} onChange={e => setNewClubStadium(e.target.value)} placeholder="Estadio / Campo (opcional)" className="flex-1 min-w-[200px] h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]" />
          <button type="button" onClick={handleCreateClub} className="h-8 px-3.5 rounded-md bg-[#EDEDED] text-[#0A0A0A] text-[12px] font-medium hover:bg-white">Crear Club</button>
          <button type="button" onClick={() => setIsAddingClub(false)} className="h-8 px-3 rounded-md bg-[#111111] border border-[#262626] text-[#A1A1AA] text-[12px]">Cancelar</button>
        </div>
      )}

      {!draft ? (
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-12 text-center text-zinc-500 text-sm">
          Selecciona un club del desplegable o pulsa "+ Nuevo Club" para comenzar su análisis táctico.
        </div>
      ) : (
        <div className="space-y-5">
          <RivalClubAndNotesSection
            draft={draft}
            h2h={h2h}
            onChangeDraft={setDraft}
            onUpdateScouting={updateScouting}
            onDeleteClub={handleDeleteClub}
          />
          <RivalTacticalSection scouting={draft.scouting} onChange={updateScouting} />
        </div>
      )}
    </div>
  );
};
