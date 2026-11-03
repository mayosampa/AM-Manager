import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, SancionCompactaUrl } from '../types';
import { Play, FileText, MessageCircle, ChevronLeft, Save, Edit3, Check, Printer, Loader2, X, ShieldCheck, Lock, AlertTriangle, RefreshCw, Link2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import {
  aplicarSancionAPlayer,
  fetchSancionesFromQuintaAmarilla,
  sincronizarPlantillaConQuintaAmarilla,
  getQuintaAmarillaBaseUrl,
} from '../services/quintaAmarillaSync';

interface PreMatchProps {
  key?: React.Key;
  basePlayers: Player[];
  upcomingMatch: any;
  isAdHoc: boolean;
  onCancel: () => void;
  onStartLive: (squad: Player[]) => void;
  onSaveCallUp: (squadIds: string[]) => void | Promise<void>;
}

const DEFAULT_TEMPLATE = `🏆 CONVOCATORIA OFICIAL

🆚 {{rival}}
📅 {{fecha}}
⏰ {{hora}}
🏟️ {{campo}}

📋 CONVOCADOS:
{{convocados}}

¡Vamos equipo! 💪`;

export function PreMatch({ basePlayers, upcomingMatch, isAdHoc, onCancel, onStartLive, onSaveCallUp }: PreMatchProps) {
  const { activeTeam, updateTeam, teamSettings, updateTeamPlayers, updateTeamSettings } = useTeam();
  const crestUrl = activeTeam?.crestUrl || teamSettings?.crestUrl;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [waTemplate, setWaTemplate] = useState(activeTeam?.whatsappTemplate || DEFAULT_TEMPLATE);
  const [isEditingWa, setIsEditingWa] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingQa, setIsSyncingQa] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<'idle' | 'saved' | 'error'>('idle');

  const callableIdsSet = useMemo(() => new Set(basePlayers.map(p => p.id)), [basePlayers]);

  // Jugadores bloqueados por sanción (de toda la plantilla activa, aunque basePlayers solo traiga isCallable)
  const suspendedPlayers = useMemo(
    () => (activeTeam?.players || []).filter(p => p && p.isActive !== false && p.isSuspended === true),
    [activeTeam?.players]
  );

  // Todos los jugadores activos de la plantilla para el selector de emparejamiento rápido RFAF
  const activeRosterPlayers = useMemo(
    () => (activeTeam?.players || []).filter(p => p && p.isActive !== false),
    [activeTeam?.players]
  );

  const rfafLink = teamSettings?.rfafLink;
  const unmatchedSanciones = rfafLink?.unmatchedSanciones || [];

  const handleLinkUnmatchedSancion = async (sancionItem: SancionCompactaUrl, targetPlayerId: string) => {
    if (!activeTeam || !targetPlayerId) return;
    const updatedPlayers = (activeTeam.players || []).map(p => {
      if (!p || p.id !== targetPlayerId) return p;
      return aplicarSancionAPlayer({ ...p, rfafName: sancionItem.j }, sancionItem);
    });

    const nextUnmatched = unmatchedSanciones.filter(u => u.j !== sancionItem.j);

    if (sancionItem.sanc === 1) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(targetPlayerId);
        return next;
      });
    }

    await updateTeamPlayers(updatedPlayers);
    if (rfafLink) {
      await updateTeamSettings({
        rfafLink: {
          ...rfafLink,
          unmatchedSanciones: nextUnmatched,
        },
      });
    }
  };

  const handleManualSyncQuintaAmarilla = async () => {
    if (!activeTeam || isSyncingQa) return;
    const clubToQuery = rfafLink?.clubRfaf || activeTeam.name;
    setIsSyncingQa(true);
    try {
      const remoteSanciones = await fetchSancionesFromQuintaAmarilla({
        clubRfaf: clubToQuery,
        competicion: rfafLink?.competicion,
        grupo: rfafLink?.grupo,
      });
      if (remoteSanciones.length > 0) {
        const { updatedPlayers, unmatchedSanciones: newUnmatched } =
          sincronizarPlantillaConQuintaAmarilla(activeTeam.players || [], remoteSanciones);
        await updateTeamPlayers(updatedPlayers);
        await updateTeamSettings({
          rfafLink: {
            competicion: rfafLink?.competicion || '',
            grupo: rfafLink?.grupo || '',
            clubRfaf: clubToQuery,
            lastJornada: rfafLink?.lastJornada || 'TODAS',
            lastSyncAt: new Date().toISOString(),
            unmatchedSanciones: newUnmatched,
          },
        });
      } else {
        window.open(getQuintaAmarillaBaseUrl(), '_blank');
      }
    } finally {
      setIsSyncingQa(false);
    }
  };

  useEffect(() => {
    let callupIds: string[] = [];
    if (!isAdHoc && upcomingMatch) {
      if (Array.isArray(upcomingMatch.calledUpPlayers)) {
        callupIds = upcomingMatch.calledUpPlayers;
      } else {
        callupIds = basePlayers.map(p => p.id);
      }
    } else if (isAdHoc) {
      if (Array.isArray(activeTeam?.activeCallUp) && activeTeam.activeCallUp.length > 0) {
        callupIds = activeTeam.activeCallUp;
      } else {
        callupIds = basePlayers.map(p => p.id);
      }
    } else {
      callupIds = basePlayers.map(p => p.id);
    }
    // Filtrar estrictamente contra jugadores convocables (excluyendo sancionados o lesionados)
    const safeCallupIds = callupIds.filter(id => callableIdsSet.has(id));
    setSelectedIds(new Set(safeCallupIds));
  }, [isAdHoc, upcomingMatch?.planKey, upcomingMatch?.date, activeTeam?.id, basePlayers, callableIdsSet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveAndStart = async () => {
    const arr = [...selectedIds];
    try {
      await Promise.resolve(onSaveCallUp(arr));
    } catch (err) {
      console.error('Error al guardar convocatoria antes de iniciar:', err);
    }
    const squad = basePlayers.filter(p => selectedIds.has(p.id));
    onStartLive(squad);
  };

  const saveJustCallUp = async () => {
    setIsSaving(true);
    setSaveFeedback('idle');
    try {
      const arr = [...selectedIds];
      await Promise.resolve(onSaveCallUp(arr));
      setIsSaving(false);
      setSaveFeedback('saved');
      setTimeout(() => {
        setSaveFeedback('idle');
      }, 3000);
    } catch (err) {
      console.error('Error al guardar convocatoria:', err);
      setIsSaving(false);
      setSaveFeedback('error');
      setTimeout(() => {
        setSaveFeedback('idle');
      }, 4000);
    }
  };

  const handleSaveTemplate = async () => {
    setIsEditingWa(false);
    if (activeTeam) {
      await updateTeam(activeTeam.id, { whatsappTemplate: waTemplate });
    }
  };

  const getMatchDetails = () => {
    const rival = upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || 'Rival';
    const rawDate = upcomingMatch?.dateString || upcomingMatch?.date || 'Por determinar';
    const fecha =
      rawDate !== 'Por determinar' && rawDate.includes('-') ? rawDate.split('-').reverse().join('/') : rawDate;
    const hora = upcomingMatch?.time || upcomingMatch?.matchDetails?.time || 'Por determinar';
    const campo = upcomingMatch?.location || upcomingMatch?.matchDetails?.location || 'Por determinar';
    return { rival, fecha, hora, campo };
  };

  const { rival, fecha, hora, campo } = getMatchDetails();

  const getFinalWaText = () => {
    const calledUp = basePlayers
      .filter(p => selectedIds.has(p.id))
      .map((p, i) => `${i + 1}. ${p.name} (${p.number || '-'})`)
      .join('\n');

    return waTemplate
      .replace('{{rival}}', rival)
      .replace('{{fecha}}', fecha)
      .replace('{{hora}}', hora)
      .replace('{{campo}}', campo)
      .replace('{{convocados}}', calledUp || 'Ninguno seleccionado');
  };

  const handleWhatsApp = () => {
    const text = getFinalWaText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePdf = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPdf(true);

    const clone = pdfRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.display = 'block';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.visibility = 'visible';
    clone.style.width = '800px';
    clone.style.zIndex = '-1';

    const imgElement = clone.querySelector('img');

    if (imgElement && crestUrl) {
      try {
        if (typeof crestUrl === 'string' && crestUrl.startsWith('data:image')) {
          imgElement.src = crestUrl;
          await new Promise((resolve) => {
            imgElement.onload = resolve;
            setTimeout(resolve, 500);
          });
        } else {
          let res;
          const urlsToTry = [
            crestUrl,
            `https://wsrv.nl/?url=${encodeURIComponent(crestUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(crestUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(crestUrl)}`,
          ];

          let success = false;
          for (const url of urlsToTry) {
            try {
              res = await fetch(url);
              if (res.ok) {
                success = true;
                break;
              }
            } catch (e) {}
          }

          if (!success || !res) throw new Error('All fetch attempts failed');

          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          imgElement.src = base64;
          await new Promise((resolve) => {
            imgElement.onload = resolve;
            setTimeout(resolve, 500);
          });
        }
      } catch (err) {
        const divFallback = document.createElement('div');
        divFallback.style.cssText =
          'width: 100px; height: 100px; border-radius: 50%; background-color: #f3f4f6; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #000;';
        divFallback.textContent = activeTeam?.name?.[0] || 'C';
        imgElement.parentNode?.replaceChild(divFallback, imgElement);
      }
    }

    document.body.appendChild(clone);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Convocatoria_${activeTeam?.name || 'Equipo'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-20 relative">
      {saveFeedback === 'saved' && (
        <div className="fixed top-5 right-5 z-50 bg-[#111111] border border-[#2E2E2E] text-[#EDEDED] px-4 py-2.5 rounded-md flex items-center gap-2 text-[12px] font-medium">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Convocatoria guardada correctamente</span>
        </div>
      )}
      {saveFeedback === 'error' && (
        <div className="fixed top-5 right-5 z-50 bg-[#111111] border border-red-500/40 text-red-400 px-4 py-2.5 rounded-md flex items-center gap-2 text-[12px] font-medium">
          <span>Error al guardar la convocatoria</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0A0A0A] p-5 rounded-lg border border-[#1F1F1F] relative">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#141416] border border-[#27272A] text-[#888888] hover:text-[#EDEDED] hover:bg-[#202024] hidden sm:flex items-center justify-center transition-colors cursor-pointer"
          title="Cerrar (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div>
          <h1 className="text-[18px] font-semibold text-[#EDEDED] tracking-[-0.025em] mb-0.5">
            {isAdHoc ? 'Convocatoria Rápida' : `Previa de Partido · vs ${rival}`}
          </h1>
          <p className="text-[12px] text-[#737373]">
            Selecciona los jugadores citados y exporta la lista oficial en PDF o WhatsApp.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto justify-center h-8 bg-[#111111] text-[#EDEDED] border border-[#262626] font-medium px-3.5 rounded-md hover:bg-[#1A1A1A] transition-colors flex items-center gap-1.5 text-[12px]"
          >
            <ChevronLeft className="w-4 h-4 text-[#888888]" />
            Volver
          </button>
          {!isAdHoc && (
            <button
              onClick={saveJustCallUp}
              disabled={isSaving}
              className={`w-full sm:w-auto justify-center h-8 font-medium px-3.5 rounded-md transition-colors flex items-center gap-1.5 border text-[12px] ${
                saveFeedback === 'saved'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#111111] text-[#EDEDED] border-[#262626] hover:bg-[#1A1A1A]'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : saveFeedback === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guardado</span>
                </>
              ) : (
                <span>Guardar Convocatoria</span>
              )}
            </button>
          )}
          <button
            onClick={saveAndStart}
            className="w-full sm:w-auto justify-center h-8 bg-[#EDEDED] text-[#0A0A0A] font-medium px-4 rounded-md hover:bg-white transition-colors flex items-center gap-1.5 text-[12px]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Ir al Directo
          </button>
        </div>
      </div>

      {/* 🛡️ Validador de Convocatoria · Conectado con QuintaAmarilla */}
      <div className="bg-[#0A0A0A] border border-emerald-500/30 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h2 className="text-[13px] font-semibold text-[#EDEDED] flex flex-wrap items-center gap-2">
                <span>🛡️ Validador de Convocatoria · Conectado con QuintaAmarilla</span>
                {rfafLink?.clubRfaf && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {rfafLink.clubRfaf}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                {rfafLink ? (
                  <>
                    {rfafLink.competicion ? `${rfafLink.competicion}` : 'Competición Oficial'}
                    {rfafLink.grupo ? ` · ${rfafLink.grupo}` : ''}
                    {rfafLink.lastJornada ? ` · Jornada: ${rfafLink.lastJornada}` : ''}
                    {rfafLink.lastSyncAt && (
                      <>
                        {' · '}Última sincronización:{' '}
                        <span className="font-mono text-[#EDEDED]">
                          {new Date(rfafLink.lastSyncAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  'Protección anti-alineación indebida activa. Abre AM Manager desde QuintaAmarilla o sincroniza las sanciones del acta oficial.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSyncQuintaAmarilla}
            disabled={isSyncingQa}
            className="h-8 px-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQa ? 'animate-spin' : ''}`} />
            <span>{rfafLink ? 'Actualizar Sanciones' : 'Conectar QuintaAmarilla'}</span>
          </button>
        </div>

        {/* Emparejador Rápido de Jugadores del Acta sin vincular */}
        {unmatchedSanciones.length > 0 && (
          <div className="p-4 bg-amber-500/5 border-b border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-[12px] font-semibold">
              <Link2 className="w-4 h-4 shrink-0" />
              <span>
                Jugadores del acta oficial pendientes de vincular con tu plantilla ({unmatchedSanciones.length})
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">
              Asocia cada ficha federativa con el jugador correspondiente de tu plantilla para aplicar su ciclo de tarjetas o bloqueo por sanción automáticamente:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {unmatchedSanciones.map(item => (
                <div
                  key={item.j}
                  className="p-3 rounded-md bg-[#0E0E10] border border-amber-500/30 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] font-bold text-[#EDEDED] truncate">
                        {item.j}
                      </div>
                      <div className="text-[11px] text-[#888888] flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="font-mono px-1.5 py-0.2 rounded bg-[#18181B] border border-[#27272A] text-[#A1A1AA]">
                          Ciclo: {item.ciclo}/5 🟨
                        </span>
                        {item.sanc === 1 ? (
                          <span className="font-mono px-1.5 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-semibold">
                            🟥 SANCIONADO (No Convocable)
                          </span>
                        ) : item.ciclo === 4 ? (
                          <span className="font-mono px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                            ⚠️ Apercibido (4/5)
                          </span>
                        ) : null}
                      </div>
                      {(item.det || item.mot) && (
                        <div className="text-[11px] text-red-300/90 mt-1">
                          {item.det || `${item.mot}${item.art ? ` (Art. ${item.art})` : ''}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        handleLinkUnmatchedSancion(item, e.target.value);
                      }
                    }}
                    className="w-full h-8 bg-[#050505] border border-[#2E2E32] hover:border-amber-500/50 rounded px-2.5 text-[12px] text-[#EDEDED] focus:outline-none focus:border-amber-400"
                  >
                    <option value="" disabled>
                      Vincular con jugador de mi plantilla...
                    </option>
                    {activeRosterPlayers.map(rp => (
                      <option key={rp.id} value={rp.id}>
                        #{rp.number} · {rp.name} {rp.rfafName ? `(${rp.rfafName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🟥 Bloqueados por Sanción RFAF (No Convocables) */}
        <div className="p-4 bg-[#08080A]">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[12px] font-semibold text-red-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>🟥 Bloqueados por Sanción RFAF (No Convocables)</span>
            </h3>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
              {suspendedPlayers.length} bloqueado(s)
            </span>
          </div>

          {suspendedPlayers.length === 0 ? (
            <p className="text-[12px] text-[#737373]">
              ✅ Ningún jugador de la plantilla activa tiene sanción vigente para esta jornada.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {suspendedPlayers.map(sp => (
                <div
                  key={sp.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-red-950/20 border border-red-500/35"
                >
                  <div className="w-8 h-8 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 flex items-center justify-center shrink-0 font-mono text-[12px] font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-red-300">
                        #{sp.number}
                      </span>
                      <span className="text-[13px] font-semibold text-[#EDEDED] truncate">
                        {sp.name}
                      </span>
                      {sp.isCarriedOverSuspension ? (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-500/25 text-red-200 border border-red-400/40 font-semibold">
                          🚨 Sanción arrastrada
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                          Sanción de la jornada
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-red-300/90 mt-1 leading-snug">
                      {sp.suspensionReason || 'Sanción federativa vigente (No convocable)'}
                    </p>
                    {sp.rfafName && (
                      <p className="text-[10px] font-mono text-[#737373] mt-0.5 truncate">
                        Acta Oficial: {sp.rfafName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Jugadores List */}
        <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#1F1F1F]">
            <h2 className="text-[13px] font-medium text-[#EDEDED]">Selección de Plantilla Disponible</h2>
            <span className="font-mono bg-[#141414] border border-[#262626] text-[#EDEDED] px-2.5 py-0.5 rounded text-[11px] font-medium">
              {selectedIds.size} / {basePlayers.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {basePlayers.map(p => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 select-none rounded-md border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#111111] border-[#333333]'
                      : 'bg-[#080808] border-[#1A1A1A] opacity-55 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors ${
                      isSelected ? 'bg-[#EDEDED] border-white' : 'bg-transparent border-[#404040]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#0A0A0A] stroke-[2.5]" />}
                  </div>
                  <span className="w-7 h-7 rounded font-mono bg-[#161616] border border-[#262626] flex items-center justify-center font-semibold text-[11px] text-[#A1A1AA]">
                    {p.number}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-[#EDEDED]' : 'text-[#737373]'}`}>
                        {p.name}
                      </span>
                      {p.rfafCycleCards === 4 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-semibold shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" /> ⚠️ Apercibido (4/5 🟨)
                        </span>
                      )}
                      {typeof p.rfafCycleCards === 'number' && p.rfafCycleCards > 0 && p.rfafCycleCards < 4 && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#161618] border border-[#27272A] text-[#A1A1AA] font-mono text-[10px] shrink-0">
                          {p.rfafCycleCards}/5 🟨
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#666666]">{p.positionGroup}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compartir / Exportar */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-[#1F1F1F]">
              <h2 className="text-[13px] font-medium text-[#EDEDED] flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#888888]" />
                Plantilla para WhatsApp
              </h2>
              {isEditingWa ? (
                <button
                  onClick={handleSaveTemplate}
                  className="text-[#EDEDED] hover:underline text-[12px] font-medium flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingWa(true)}
                  className="text-[#737373] hover:text-[#EDEDED] text-[12px] flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar formato
                </button>
              )}
            </div>

            {isEditingWa ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={waTemplate}
                  onChange={e => setWaTemplate(e.target.value)}
                  className="w-full h-44 bg-[#050505] text-[#EDEDED] p-3 rounded-md border border-[#262626] focus:outline-none focus:border-[#525252] text-[12px] resize-none font-mono"
                />
                <p className="font-mono text-[10px] text-[#666666]">
                  Variables: {'{{rival}}'}, {'{{fecha}}'}, {'{{hora}}'}, {'{{campo}}'}, {'{{convocados}}'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="w-full h-44 bg-[#050505] text-[#A1A1AA] p-3 rounded-md border border-[#1F1F1F] overflow-y-auto whitespace-pre-wrap text-[12px] font-mono custom-scrollbar">
                  {getFinalWaText()}
                </div>
              </div>
            )}

            <button
              onClick={handleWhatsApp}
              className="w-full h-9 mt-3 bg-[#111111] border border-[#262626] text-[#EDEDED] font-medium text-[12px] rounded-md hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              Compartir por WhatsApp
            </button>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5">
            <h2 className="text-[13px] font-medium text-[#EDEDED] mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#888888]" />
              Documento Oficial (PDF)
            </h2>
            <p className="text-[#737373] text-[12px] mb-4">
              Genera una hoja oficial con escudo y dorsales lista para imprimir o enviar al grupo.
            </p>
            <button
              onClick={handlePdf}
              disabled={isGeneratingPdf}
              className="w-full h-9 bg-[#EDEDED] text-[#0A0A0A] font-medium text-[12px] rounded-md hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              {isGeneratingPdf ? 'Generando PDF...' : 'Descargar Convocatoria PDF'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div
          ref={pdfRef}
          style={{
            width: '800px',
            backgroundColor: '#ffffff',
            padding: '40px',
            color: '#000000',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
            {crestUrl ? (
              <img
                src={crestUrl}
                alt="Escudo"
                style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto 10px' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                {activeTeam?.name?.[0] || 'C'}
              </div>
            )}
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
              {activeTeam?.name || 'CLUB DEPORTIVO'}
            </h1>
            <h2 style={{ fontSize: '20px', color: '#4b5563', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
              Convocatoria Oficial
            </h2>
          </div>

          <div
            style={{
              backgroundColor: '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
            }}
          >
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Rival</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{rival}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Campo</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{campo}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Fecha</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{fecha}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Hora</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{hora}</p>
            </div>
          </div>

          <h3
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '10px',
              marginBottom: '20px',
            }}
          >
            JUGADORES CONVOCADOS ({selectedIds.size})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {basePlayers
              .filter(p => selectedIds.has(p.id))
              .map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ width: '30px', fontWeight: 'bold', color: '#6b7280' }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontWeight: 'bold', fontSize: '16px' }}>{p.name}</span>
                  <span
                    style={{
                      backgroundColor: '#e5e7eb',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    #{p.number}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
