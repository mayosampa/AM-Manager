import React, { useState } from 'react';
import { Check, Loader2, Plus, UserCheck } from 'lucide-react';
import { FedPlayerCandidate, Player, SancionCompactaUrl } from '../../../types';
import { POSITION_CATALOG } from '../../squad/domain/positions';
import {
  aplicarCandidatosValidadosAPlantilla,
  buildCandidatesFromCurrentTeam,
  fetchSquadFromFederationUrl,
  formatearNombreDeportivoDesdeRfaf,
  parseRfafSquadFromHtmlOrText,
} from '../../../services/rfafConnectorService';
import { RfafSourceBar } from './RfafSourceBar';

interface RfafSquadTabProps {
  clubName: string;
  players: Player[];
  unmatchedSanciones: SancionCompactaUrl[];
  rfafTeamUrl: string;
  onChangeUrl: (url: string) => void;
  onApplySquad: (result: {
    updatedPlayers: Player[];
    remainingUnmatched: SancionCompactaUrl[];
    addedCount: number;
    linkedCount: number;
  }) => Promise<void>;
}

export const RfafSquadTab: React.FC<RfafSquadTabProps> = ({
  clubName,
  players,
  unmatchedSanciones,
  rfafTeamUrl,
  onChangeUrl,
  onApplySquad,
}) => {
  const [candidates, setCandidates] = useState<FedPlayerCandidate[]>(() =>
    buildCandidatesFromCurrentTeam(players, unmatchedSanciones)
  );
  const [pasteText, setPasteText] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleFetchFromUrl = async () => {
    if (!rfafTeamUrl.trim()) return;
    setLoadingUrl(true);
    setFeedback(null);
    try {
      const res = await fetchSquadFromFederationUrl(rfafTeamUrl, clubName, players);
      if (res.candidates.length > 0) {
        setCandidates(res.candidates);
        const teamLabel = res.matchedTeam ? ` (${res.matchedTeam.nombre})` : '';
        setFeedback(`✅ ${res.candidates.length} jugadores oficiales extraídos${teamLabel}. Revisa nombres deportivos y dorsales.`);
      } else {
        setFeedback('No se detectaron fichas de jugadores en ese enlace. Puedes pegar el listado de jugadores en el cuadro derecho.');
      }
    } catch (err: any) {
      setFeedback(err?.message || 'Error al conectar con la web de la competición.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRfafSquadFromHtmlOrText(pasteText, players);
    if (parsed.length > 0) {
      setCandidates(parsed);
      setPasteText('');
      setFeedback(`✅ ${parsed.length} jugadores detectados. Revisa nombres deportivos y dorsales.`);
    } else {
      setFeedback('Formato no reconocido (esperado: APELLIDOS, NOMBRE).');
    }
  };

  const updateRow = (id: string, patch: Partial<FedPlayerCandidate>) => {
    setCandidates(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = aplicarCandidatosValidadosAPlantilla(players, candidates, unmatchedSanciones);
      await onApplySquad(res);
      setFeedback(`✅ Plantilla guardada: ${res.addedCount} nuevos y ${res.linkedCount} vinculados con acta oficial.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-[12px]">
      <RfafSourceBar
        urlLabel="Opción A · Enlace de Competición, Jornada o Equipo (`NFG_CmpJornada` / `NFG_VisEquipos`)"
        urlPlaceholder="Pega aquí el enlace de la jornada, calendario o ficha del equipo..."
        urlValue={rfafTeamUrl}
        onUrlChange={onChangeUrl}
        onFetchUrl={handleFetchFromUrl}
        loadingUrl={loadingUrl}
        pasteLabel="Opción B · Pegar listado de plantilla o acta (`APELLIDOS, NOMBRE`)"
        pastePlaceholder="Pega aquí las filas de jugadores de la web oficial o acta..."
        pasteValue={pasteText}
        onPasteChange={setPasteText}
        onParsePaste={handleParseText}
        parseButtonLabel="Auto-Rellenar"
      />
      {feedback && <div className="px-3 py-2 rounded bg-[#111814] border border-emerald-500/30 text-emerald-300">{feedback}</div>}
      <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808]">
        <div className="px-3.5 py-2.5 bg-[#0E0E0E] border-b border-[#1F1F1F] flex items-center justify-between">
          <span className="font-semibold text-[#EDEDED]">
            Validación de Nombre en Acta ➔ Nombre Deportivo ({candidates.filter(c => c.selected).length} seleccionados)
          </span>
          <button
            type="button"
            onClick={() => setCandidates(p => [...p, { id: `m_${Date.now()}`, rfafName: '', suggestedName: '', number: p.length + 1, position: 'MC', selected: true }])}
            className="h-7 px-2.5 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#292929] text-[#EDEDED] text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Añadir fila
          </button>
        </div>
        <div className="max-h-[290px] overflow-y-auto custom-scrollbar divide-y divide-[#161616]">
          {candidates.length === 0 ? (
            <div className="p-6 text-center text-[#737373]">
              Extrae por enlace o pega el listado de jugadores de tu equipo para pre-rellenar los nombres deportivos y vincular las sanciones automáticamente.
            </div>
          ) : (
            candidates.map(cand => (
              <div key={cand.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-[#0D0D0D]">
                <div className="col-span-1 flex justify-center">
                  <input type="checkbox" checked={cand.selected} onChange={e => updateRow(cand.id, { selected: e.target.checked })} className="accent-emerald-500 cursor-pointer" />
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={cand.rfafName}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      updateRow(cand.id, { rfafName: val, suggestedName: cand.suggestedName || formatearNombreDeportivoDesdeRfaf(val) });
                    }}
                    placeholder="APELLIDO1 APELLIDO2, NOMBRE"
                    className="w-full h-7 bg-[#050505] border border-[#222222] rounded px-2 font-mono text-[11px] text-[#A1A1AA]"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={cand.suggestedName}
                    onChange={e => updateRow(cand.id, { suggestedName: e.target.value })}
                    placeholder="Nombre deportivo"
                    className="w-full h-7 bg-[#050505] border border-[#262626] rounded px-2 text-[12px] font-medium text-[#EDEDED]"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={cand.number}
                    onChange={e => updateRow(cand.id, { number: Number(e.target.value) || 0 })}
                    className="w-full h-7 bg-[#050505] border border-[#262626] rounded px-1 text-center font-mono text-[11px] text-[#EDEDED]"
                  />
                </div>
                <div className="col-span-1">
                  <select value={cand.position} onChange={e => updateRow(cand.id, { position: e.target.value })} className="w-full h-7 bg-[#050505] border border-[#262626] rounded px-1 text-[11px] text-[#EDEDED]">
                    {Object.values(POSITION_CATALOG).flat().map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <select
                    value={cand.matchedPlayerId || ''}
                    onChange={e => {
                      const target = players.find(p => p.id === e.target.value);
                      updateRow(cand.id, { matchedPlayerId: target?.id, matchedPlayerName: target?.name, ...(target ? { suggestedName: target.name, number: target.number, position: target.position } : {}) });
                    }}
                    className="w-full h-7 bg-[#0D0D0D] border border-[#242424] rounded px-1.5 text-[10px] text-[#A1A1AA]"
                  >
                    <option value="">✨ Crear nuevo</option>
                    {players.filter(p => p && p.isActive !== false).map(p => <option key={p.id} value={p.id}>🔗 #{p.number} {p.name}</option>)}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-[#737373] flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          El nombre oficial en acta queda vinculado para validar sanciones de QuintaAmarilla al 100%.
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || candidates.filter(c => c.selected && c.rfafName.trim()).length === 0}
          className="h-9 px-4 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-semibold text-[12px] flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Validar y Guardar en Plantilla</span>
        </button>
      </div>
    </div>
  );
};
