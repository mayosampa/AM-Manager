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
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Base de Datos de Rivales (Liga)</h1>
            <p className="text-xs text-zinc-400">Directorio de clubes, scouting táctico, notas libres y plantillas PDF ({rivals.length} clubes)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedRivalId}
            onChange={e => handleSelectRival(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-lime-500"
          >
            {rivals.length === 0 && <option value="">Sin clubes registrados</option>}
            {rivals.map(r => (
              <option key={r.id} value={r.id}>{r.name} {r.stadium ? `(${r.stadium})` : ''}</option>
            ))}
          </select>
          <button type="button" onClick={() => setIsAddingClub(!isAddingClub)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/30 text-lime-300 text-xs font-bold transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Club
          </button>
          <button type="button" onClick={handleCopyWhatsApp} disabled={!draft} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-40">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!draft} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors disabled:opacity-40">
            <FileDown className="w-4 h-4 text-lime-400" /> Plantilla PDF
          </button>
          <button type="button" onClick={handleSave} disabled={!draft} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-black transition-colors disabled:opacity-40">
            <Save className="w-4 h-4" /> Guardar Informe
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-lime-500/20 border border-lime-500/40 rounded-xl px-4 py-2.5 text-xs font-bold text-lime-300 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {isAddingClub && (
        <div className="bg-[#121215] border border-lime-500/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <input type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Nombre oficial del club (ej. Cártama B)" className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white" />
          <input type="text" value={newClubStadium} onChange={e => setNewClubStadium(e.target.value)} placeholder="Estadio / Campo (opcional)" className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white" />
          <button type="button" onClick={handleCreateClub} className="px-4 py-2 rounded-xl bg-lime-500 text-zinc-950 text-xs font-black hover:bg-lime-400">Crear Club</button>
          <button type="button" onClick={() => setIsAddingClub(false)} className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs">Cancelar</button>
        </div>
      )}

      {!draft ? (
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-12 text-center text-zinc-500 text-sm">
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
