import React, { useEffect, useState } from 'react';
import { Calendar, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { FedMatchDayItem } from '../../../types';
import {
  autoLinkCalendarMatches,
  clubsMatch,
  ExistingMatchCandidate,
  fetchRfafHtmlDirect,
  importarCalendarioRfafEnPlan,
  loadExistingMatchCandidates,
  parseRfafCalendarFromHtmlOrText,
  resolveCalendarUrl,
} from '../../../services/rfafConnectorService';
import { RfafSourceBar } from './RfafSourceBar';

interface RfafCalendarTabProps {
  teamId: string;
  clubRfaf: string;
  competicion: string;
  grupo?: string;
  homeStadium?: string;
  rfafCalendarUrl: string;
  syncedMatches?: FedMatchDayItem[] | null;
  syncedClubs?: string[] | null;
  onChangeUrl: (url: string) => void;
  onCalendarImported: () => Promise<void>;
}

export const RfafCalendarTab: React.FC<RfafCalendarTabProps> = ({
  teamId,
  clubRfaf,
  competicion,
  grupo,
  homeStadium,
  rfafCalendarUrl,
  syncedMatches,
  syncedClubs,
  onChangeUrl,
  onCalendarImported,
}) => {
  const [matches, setMatches] = useState<FedMatchDayItem[]>(syncedMatches || []);
  const [detectedClubs, setDetectedClubs] = useState<string[]>(syncedClubs || []);
  const [existingCandidates, setExistingCandidates] = useState<ExistingMatchCandidate[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadExistingMatchCandidates(teamId).then(list => {
      setExistingCandidates(list);
      if (list.length > 0) setMatches(prev => autoLinkCalendarMatches(prev, clubRfaf, list));
    });
  }, [teamId, clubRfaf]);

  useEffect(() => {
    if (syncedMatches && syncedMatches.length > 0) {
      setMatches(autoLinkCalendarMatches(syncedMatches, clubRfaf, existingCandidates));
      if (syncedClubs) setDetectedClubs(syncedClubs);
      const linked = syncedMatches.filter(m => m.matchedMatchId || m.matchedPlanKey).length;
      setFeedback(`✅ ${syncedMatches.length} jornadas sincronizadas${linked > 0 ? ` (${linked} enlazadas con partidos existentes conservando estadísticas)` : ''}.`);
    }
  }, [syncedMatches, syncedClubs, existingCandidates, clubRfaf]);

  const handleFetchUrl = async () => {
    if (!rfafCalendarUrl.trim()) return;
    setLoadingUrl(true);
    setFeedback(null);
    try {
      const targetCalendarUrl = resolveCalendarUrl(rfafCalendarUrl);
      const html = await fetchRfafHtmlDirect(targetCalendarUrl);
      let res = parseRfafCalendarFromHtmlOrText(html, clubRfaf);
      if (res.matches.length === 0 && targetCalendarUrl !== rfafCalendarUrl.trim()) {
        const fallbackHtml = await fetchRfafHtmlDirect(rfafCalendarUrl.trim());
        res = parseRfafCalendarFromHtmlOrText(fallbackHtml, clubRfaf);
      }
      const cands = await loadExistingMatchCandidates(teamId);
      setExistingCandidates(cands);
      const linked = autoLinkCalendarMatches(res.matches, clubRfaf, cands);
      setMatches(linked);
      setDetectedClubs(res.detectedClubs);
      const linkedCount = linked.filter(m => m.matchedMatchId || m.matchedPlanKey).length;
      setFeedback(linked.length > 0 ? `✅ ${linked.length} jornadas extraídas (${linkedCount} enlazadas con partidos existentes).` : 'No se encontraron partidos en ese enlace.');
    } catch (err: any) {
      setFeedback(err?.message || 'Error al leer el calendario de la competición.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const res = parseRfafCalendarFromHtmlOrText(pasteText, clubRfaf);
    if (res.matches.length > 0) {
      const linked = autoLinkCalendarMatches(res.matches, clubRfaf, existingCandidates);
      setMatches(linked);
      setDetectedClubs(res.detectedClubs);
      setPasteText('');
      setFeedback(`✅ ${linked.length} partidos de calendario y ${res.detectedClubs.length} rivales detectados.`);
    } else {
      setFeedback('Formato no reconocido. Ejemplo: "J1 15/09/2026 C.D. ÁLORA - TOLOX C.F."');
    }
  };

  const updateMatch = (idx: number, patch: Partial<FedMatchDayItem>) => {
    setMatches(prev => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const handleImport = async () => {
    if (!teamId || matches.length === 0) return;
    setImporting(true);
    try {
      const compLabel = grupo ? `${competicion} · ${grupo}` : competicion;
      const res = await importarCalendarioRfafEnPlan({ teamId, clubRfaf, competicion: compLabel, matches, detectedClubs, homeStadium });
      const refreshed = await loadExistingMatchCandidates(teamId);
      setExistingCandidates(refreshed);
      await onCalendarImported();
      setFeedback(`✅ ${res.importedMatchesCount} jornadas guardadas (${res.linkedMatchesCount} partidos enlazados conservando estadísticas) y ${res.createdRivalsCount} rivales nuevos.`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3.5 text-[12px]">
      {feedback && <div className="px-3 py-2 rounded bg-[#111814] border border-emerald-500/30 text-emerald-300">{feedback}</div>}
      <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808]">
        <div className="px-3.5 py-2.5 bg-[#0E0E0E] border-b border-[#1F1F1F] flex items-center justify-between">
          <span className="font-semibold text-[#EDEDED]">
            Partidos en el Planificador ({matches.length} jornadas · {matches.filter(m => m.matchedMatchId || m.matchedPlanKey).length} enlazados con estadísticas)
          </span>
          <button type="button" onClick={() => setMatches(p => [...p, { jornada: p.length + 1, fecha: new Date().toISOString().split('T')[0], local: clubRfaf || 'MI EQUIPO', visitante: 'RIVAL C.F.', jugado: false }])} className="h-7 px-2.5 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#292929] text-[#EDEDED] text-[11px] flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Añadir Jornada
          </button>
        </div>
        <div className="max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-[#161616]">
          {matches.length === 0 ? (
            <div className="p-6 text-center text-[#737373]">
              Selecciona arriba tu Competición, Grupo y Equipo y pulsa «⚡ Sincronizar Todo» para importar las jornadas y enlazar automáticamente los partidos ya jugados.
            </div>
          ) : (
            matches.map((m, idx) => {
              const isHome = clubsMatch(m.local, clubRfaf);
              const selectedCandId = m.matchedMatchId || (m.matchedPlanKey ? `plan:${m.matchedPlanKey}` : '');
              return (
                <div key={idx} className="grid grid-cols-12 gap-1.5 px-3 py-2 items-center hover:bg-[#0D0D0D]">
                  <div className="col-span-1 font-mono text-[11px] text-[#888888]">J{m.jornada}</div>
                  <div className="col-span-2">
                    <input type="date" value={m.fecha} onChange={e => updateMatch(idx, { fecha: e.target.value })} className="w-full h-7 bg-[#050505] border border-[#242424] rounded px-1.5 font-mono text-[10px] text-[#EDEDED]" />
                  </div>
                  <div className="col-span-3">
                    <input type="text" value={m.local} onChange={e => updateMatch(idx, { local: e.target.value })} className={`w-full h-7 bg-[#050505] border border-[#242424] rounded px-2 text-[11px] ${isHome ? 'text-emerald-400 font-semibold' : 'text-[#EDEDED]'}`} />
                  </div>
                  <div className="col-span-1 text-center font-mono text-[11px] text-[#A1A1AA]">
                    {m.golesLocal !== undefined && m.golesVisitante !== undefined ? `${m.golesLocal}-${m.golesVisitante}` : 'vs'}
                  </div>
                  <div className="col-span-2">
                    <input type="text" value={m.visitante} onChange={e => updateMatch(idx, { visitante: e.target.value })} className={`w-full h-7 bg-[#050505] border border-[#242424] rounded px-2 text-[11px] ${!isHome ? 'text-emerald-400 font-semibold' : 'text-[#EDEDED]'}`} />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={selectedCandId}
                      onChange={e => {
                        const target = existingCandidates.find(c => c.id === e.target.value);
                        updateMatch(idx, { matchedMatchId: target?.matchId, matchedPlanKey: target?.planKey, matchedLabel: target?.label });
                      }}
                      className={`w-full h-7 bg-[#0D0D0D] border rounded px-1.5 text-[10px] ${selectedCandId ? 'border-emerald-500/40 text-emerald-300 font-medium' : 'border-[#242424] text-[#A1A1AA]'}`}
                    >
                      <option value="">✨ Crear nuevo</option>
                      {existingCandidates.map(c => <option key={c.id} value={c.id}>🔗 {c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button type="button" onClick={() => setMatches(prev => prev.filter((_, i) => i !== idx))} className="text-[#666666] hover:text-red-400 p-1 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-[#737373] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          Si un partido ya fue creado, se enlaza automáticamente copiando sus estadísticas y dejando un único partido.
        </span>
        <button type="button" onClick={handleImport} disabled={importing || matches.length === 0} className="h-9 px-4 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-semibold text-[12px] flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Importar y Enlazar Partidos</span>
        </button>
      </div>
      <RfafSourceBar urlLabel="Opción A · Enlace directo de Jornada o Calendario" urlPlaceholder="Pega aquí el enlace del calendario..." urlValue={rfafCalendarUrl} onUrlChange={onChangeUrl} onFetchUrl={handleFetchUrl} loadingUrl={loadingUrl} pasteLabel="Opción B · Pegar calendario desde web oficial o PDF" pastePlaceholder="Ej: J1 15/09/2026 C.D. ÁLORA 2 - 1 TOLOX C.F." pasteValue={pasteText} onPasteChange={setPasteText} onParsePaste={handleParseText} />
    </div>
  );
};
