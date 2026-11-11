import React, { useEffect, useState } from 'react';
import { Check, Loader2, Plus, Trophy } from 'lucide-react';
import { FedStandingRow } from '../../../types';
import {
  clubsMatch,
  deduplicateStandingsRows,
  fetchRfafHtmlDirect,
  parseRfafStandingsFromHtmlOrText,
  resolveStandingsUrl,
} from '../../../services/rfafConnectorService';
import { RfafSourceBar } from './RfafSourceBar';

interface RfafStandingsTabProps {
  clubRfaf: string;
  initialStandings: FedStandingRow[];
  rfafStandingsUrl: string;
  onChangeUrl: (url: string) => void;
  onSaveStandings: (rows: FedStandingRow[]) => Promise<void>;
}

export const RfafStandingsTab: React.FC<RfafStandingsTabProps> = ({
  clubRfaf,
  initialStandings,
  rfafStandingsUrl,
  onChangeUrl,
  onSaveStandings,
}) => {
  const [rows, setRows] = useState<FedStandingRow[]>(() => deduplicateStandingsRows(initialStandings));
  const [pasteText, setPasteText] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setRows(deduplicateStandingsRows(initialStandings));
  }, [initialStandings]);

  const handleFetchUrl = async () => {
    if (!rfafStandingsUrl.trim()) return;
    setLoadingUrl(true);
    setFeedback(null);
    try {
      const targetUrl = resolveStandingsUrl(rfafStandingsUrl);
      const html = await fetchRfafHtmlDirect(targetUrl);
      const parsed = parseRfafStandingsFromHtmlOrText(html);
      if (parsed.length > 0) {
        setRows(parsed);
        setFeedback(`✅ Clasificación de ${parsed.length} equipos extraída correctamente.`);
      } else {
        setFeedback('No se detectó tabla en ese enlace.');
      }
    } catch (err: any) {
      setFeedback(err?.message || 'Error al obtener la clasificación del grupo.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRfafStandingsFromHtmlOrText(pasteText);
    if (parsed.length > 0) {
      setRows(parsed);
      setPasteText('');
      setFeedback(`✅ Clasificación procesada (${parsed.length} equipos).`);
    } else {
      setFeedback('Formato no reconocido. Ejemplo: "1 C.D. ÁLORA 38 15 12 2 1 34 11"');
    }
  };

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        posicion: prev.length + 1,
        equipo: prev.length === 0 ? clubRfaf || 'MI EQUIPO' : `CLUB ${prev.length + 1}`,
        puntos: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0,
      },
    ]);
  };

  const updateRow = (idx: number, patch: Partial<FedStandingRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveStandings(rows);
      setFeedback('✅ Clasificación guardada en el equipo y sincronizada con los clubes rivales.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3.5 text-[12px]">
      {feedback && (
        <div className="px-3 py-2 rounded bg-[#111814] border border-emerald-500/30 text-emerald-300 text-[12px]">
          {feedback}
        </div>
      )}

      <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808]">
        <div className="px-3.5 py-2.5 bg-[#0E0E0E] border-b border-[#1F1F1F] flex items-center justify-between">
          <span className="font-semibold text-[#EDEDED]">
            Tabla de Clasificación del Grupo ({rows.length} equipos)
          </span>
          <button
            type="button"
            onClick={handleAddRow}
            className="h-7 px-2.5 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#292929] text-[#EDEDED] text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Añadir Equipo
          </button>
        </div>

        <div className="max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-[#161616]">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-[#737373]">
              Selecciona arriba tu Competición, Grupo y Equipo y pulsa «⚡ Sincronizar Todo en 1 Clic» para cargar la clasificación actual del grupo.
            </div>
          ) : (
            rows.map((r, idx) => {
              const isMyClub = clubsMatch(r.equipo, clubRfaf);
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-1.5 px-3 py-1.5 items-center ${
                    isMyClub ? 'bg-emerald-500/10' : 'hover:bg-[#0D0D0D]'
                  }`}
                >
                  <div className="col-span-1 font-mono text-[11px] text-center text-[#888888]">{r.posicion}º</div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={r.equipo}
                      onChange={e => updateRow(idx, { equipo: e.target.value })}
                      className={`w-full h-7 bg-[#050505] border border-[#222] rounded px-2 text-[11px] ${
                        isMyClub ? 'text-emerald-400 font-bold' : 'text-[#EDEDED]'
                      }`}
                    />
                  </div>
                  {(['puntos', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc'] as const).map(field => (
                    <div key={field} className="col-span-1">
                      <input
                        type="number"
                        value={r[field]}
                        onChange={e => updateRow(idx, { [field]: Number(e.target.value) || 0 })}
                        title={field.toUpperCase()}
                        className={`w-full h-7 bg-[#050505] border border-[#222] rounded text-center font-mono text-[11px] ${
                          field === 'puntos' ? 'text-emerald-400 font-bold' : 'text-[#A1A1AA]'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-[#737373] flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          Columnas: Pos · Equipo · PTS · PJ · PG · PE · PP · GF · GC
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || rows.length === 0}
          className="h-9 px-4 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-semibold text-[12px] flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Guardar Clasificación</span>
        </button>
      </div>

      <RfafSourceBar
        urlLabel="Opción A · Enlace directo de Clasificación o Jornada"
        urlPlaceholder="Pega aquí el enlace de la clasificación..."
        urlValue={rfafStandingsUrl}
        onUrlChange={onChangeUrl}
        onFetchUrl={handleFetchUrl}
        loadingUrl={loadingUrl}
        pasteLabel="Opción B · Pegar tabla de clasificación"
        pastePlaceholder="Pega las filas de la clasificación (Pos Equipo Pts PJ PG PE PP GF GC)..."
        pasteValue={pasteText}
        onPasteChange={setPasteText}
        onParsePaste={handleParseText}
        parseButtonLabel="Procesar Tabla"
      />
    </div>
  );
};
