import React, { useState } from 'react';
import { Calendar, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { RfafMatchDayItem } from '../../../types';
import {
  clubsMatch,
  fetchRfafHtmlDirect,
  importarCalendarioRfafEnPlan,
  parseRfafCalendarFromHtmlOrText,
} from '../../../services/rfafConnectorService';
import { RfafSourceBar } from './RfafSourceBar';

interface RfafCalendarTabProps {
  teamId: string;
  clubRfaf: string;
  competicion: string;
  homeStadium?: string;
  rfafCalendarUrl: string;
  onChangeUrl: (url: string) => void;
  onCalendarImported: () => Promise<void>;
}

export const RfafCalendarTab: React.FC<RfafCalendarTabProps> = ({
  teamId,
  clubRfaf,
  competicion,
  homeStadium,
  rfafCalendarUrl,
  onChangeUrl,
  onCalendarImported,
}) => {
  const [matches, setMatches] = useState<RfafMatchDayItem[]>([]);
  const [detectedClubs, setDetectedClubs] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleFetchUrl = async () => {
    if (!rfafCalendarUrl.trim()) return;
    setLoadingUrl(true);
    setFeedback(null);
    try {
      const html = await fetchRfafHtmlDirect(rfafCalendarUrl);
      const res = parseRfafCalendarFromHtmlOrText(html, clubRfaf);
      setMatches(res.matches);
      setDetectedClubs(res.detectedClubs);
      setFeedback(res.matches.length > 0 ? `✅ ${res.matches.length} jornadas y ${res.detectedClubs.length} rivales detectados.` : 'No se encontraron partidos en esa URL.');
    } catch (err: any) {
      setFeedback(err?.message || 'Error al leer el calendario RFAF.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const res = parseRfafCalendarFromHtmlOrText(pasteText, clubRfaf);
    if (res.matches.length > 0) {
      setMatches(res.matches);
      setDetectedClubs(res.detectedClubs);
      setPasteText('');
      setFeedback(`✅ ${res.matches.length} partidos de calendario y ${res.detectedClubs.length} rivales detectados.`);
    } else {
      setFeedback('Formato no reconocido. Ejemplo: "J1 15/09/2026 C.D. ÁLORA - TOLOX C.F."');
    }
  };

  const updateMatch = (idx: number, patch: Partial<RfafMatchDayItem>) => {
    setMatches(prev => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const handleImport = async () => {
    if (!teamId || matches.length === 0) return;
    setImporting(true);
    try {
      const res = await importarCalendarioRfafEnPlan({ teamId, clubRfaf, competicion, matches, detectedClubs, homeStadium });
      await onCalendarImported();
      setFeedback(`✅ Importados ${res.importedMatchesCount} partidos al Planificador y creados ${res.createdRivalsCount} rivales.`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 text-[12px]">
      <RfafSourceBar
        urlLabel="Opción A · Enlace Calendario / Equipo RFAF (`NFG_CmpJornada` / `NFG_VisEquipos`)"
        urlPlaceholder="https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada?..."
        urlValue={rfafCalendarUrl}
        onUrlChange={onChangeUrl}
        onFetchUrl={handleFetchUrl}
        loadingUrl={loadingUrl}
        pasteLabel="Opción B · Pegar calendario desde web RFAF / Universo RFAF / PDF"
        pastePlaceholder="Ej: J1 15/09/2026 C.D. ÁLORA 2 - 1 TOLOX C.F."
        pasteValue={pasteText}
        onPasteChange={setPasteText}
        onParsePaste={handleParseText}
      />
      {feedback && <div className="px-3 py-2 rounded bg-[#111814] border border-emerald-500/30 text-emerald-300">{feedback}</div>}
      {detectedClubs.length > 0 && (
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg px-3.5 py-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#A1A1AA] mr-1">🛡️ Rivales detectados ({detectedClubs.length}):</span>
          {detectedClubs.map(club => (
            <span key={club} className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[10px] font-mono text-[#EDEDED]">{club}</span>
          ))}
        </div>
      )}
      <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808]">
        <div className="px-3.5 py-2.5 bg-[#0E0E0E] border-b border-[#1F1F1F] flex items-center justify-between">
          <span className="font-semibold text-[#EDEDED]">Partidos a Importar en el Planificador ({matches.length} jornadas)</span>
          <button
            type="button"
            onClick={() => setMatches(p => [...p, { jornada: p.length + 1, fecha: new Date().toISOString().split('T')[0], local: clubRfaf || 'MI EQUIPO', visitante: 'RIVAL C.F.', jugado: false }])}
            className="h-7 px-2.5 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#292929] text-[#EDEDED] text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Añadir Jornada
          </button>
        </div>
        <div className="max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-[#161616]">
          {matches.length === 0 ? (
            <div className="p-6 text-center text-[#737373]">
              Pega el calendario oficial de tu equipo en RFAF o añade las jornadas para programar automáticamente toda la temporada y dar de alta los rivales.
            </div>
          ) : (
            matches.map((m, idx) => {
              const isHome = clubsMatch(m.local, clubRfaf);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-[#0D0D0D]">
                  <div className="col-span-1 font-mono text-[11px] text-[#888888]">J{m.jornada}</div>
                  <div className="col-span-3">
                    <input type="date" value={m.fecha} onChange={e => updateMatch(idx, { fecha: e.target.value })} className="w-full h-7 bg-[#050505] border border-[#242424] rounded px-2 font-mono text-[11px] text-[#EDEDED]" />
                  </div>
                  <div className="col-span-3">
                    <input type="text" value={m.local} onChange={e => updateMatch(idx, { local: e.target.value })} className={`w-full h-7 bg-[#050505] border border-[#242424] rounded px-2 text-[11px] ${isHome ? 'text-emerald-400 font-semibold' : 'text-[#EDEDED]'}`} />
                  </div>
                  <div className="col-span-1 text-center font-mono text-[11px] text-[#A1A1AA]">
                    {m.golesLocal !== undefined && m.golesVisitante !== undefined ? `${m.golesLocal}-${m.golesVisitante}` : 'vs'}
                  </div>
                  <div className="col-span-3">
                    <input type="text" value={m.visitante} onChange={e => updateMatch(idx, { visitante: e.target.value })} className={`w-full h-7 bg-[#050505] border border-[#242424] rounded px-2 text-[11px] ${!isHome ? 'text-emerald-400 font-semibold' : 'text-[#EDEDED]'}`} />
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
          Los partidos se inyectan en el Planificador y todos los clubes del grupo se crean en Rivales & Scouting.
        </span>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || matches.length === 0}
          className="h-9 px-4 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-semibold text-[12px] flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Importar al Planificador y Crear Rivales</span>
        </button>
      </div>
    </div>
  );
};
