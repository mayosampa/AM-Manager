import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, BarChart3, FileSpreadsheet, FileText, Eye, X, Check } from 'lucide-react';
import { useTeamStats, PlayerStatsAggregated } from '../hooks/useTeamStats';
import { useTeam } from '../context/TeamContext';
import { exportPerformanceToExcel, exportPerformanceToPDF } from '../services/performanceExport';
import { StatMetricsConfig, DEFAULT_STAT_METRICS } from '../types';

type SortKey = keyof PlayerStatsAggregated;

interface VisibleTableColumns {
  minutes: boolean;
  cleanSheets: boolean;
  assists: boolean;
  shotsOnTarget: boolean;
  shotsOffTarget: boolean;
  fouls: boolean;
  offsides: boolean;
  cards: boolean;
}

const DEFAULT_VISIBLE_COLUMNS: VisibleTableColumns = {
  minutes: true,
  cleanSheets: true,
  assists: true,
  shotsOnTarget: true,
  shotsOffTarget: true,
  fouls: true,
  offsides: true,
  cards: true,
};

const VISIBLE_COLUMNS_META: { key: keyof VisibleTableColumns; label: string; desc: string }[] = [
  { key: 'minutes', label: 'Minutos (Min., Min/P, % Min.)', desc: 'Tiempo de juego acumulado y promedio.' },
  { key: 'cleanSheets', label: 'Porterías a Cero (P.0)', desc: 'Partidos sin encajar gol.' },
  { key: 'assists', label: 'Asistencias (Asist.)', desc: 'Pases de gol registrados.' },
  { key: 'shotsOnTarget', label: 'Tiros a Puerta (T.P.)', desc: 'Remates entre los tres palos.' },
  { key: 'shotsOffTarget', label: 'Tiros Fuera (T.F.)', desc: 'Remates desviados.' },
  { key: 'fouls', label: 'Faltas Cometidas (Falt.)', desc: 'Infracciones registradas.' },
  { key: 'offsides', label: 'Fueras de Juego (F.J.)', desc: 'Posiciones antirreglamentarias por jugador.' },
  { key: 'cards', label: 'Tarjetas (Ama. / Roj.)', desc: 'Amonestaciones y expulsiones.' },
];

export function PlayerStatistics() {
  const { activeTeam, activeTeamId, statMetrics, teamSettings } = useTeam();
  const rawStats = useTeamStats();
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [sortDesc, setSortDesc] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [selectedPlayerModalId, setSelectedPlayerModalId] = useState<string | null>(null);

  const storageKey = `visibleTableColumns_${activeTeamId || 'default'}`;

  const [visibleCols, setVisibleCols] = useState<VisibleTableColumns>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setVisibleCols({ ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) });
      } else {
        setVisibleCols(DEFAULT_VISIBLE_COLUMNS);
      }
    } catch {
      setVisibleCols(DEFAULT_VISIBLE_COLUMNS);
    }
  }, [storageKey]);

  const toggleVisibleCol = (key: keyof VisibleTableColumns) => {
    setVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Combinación de Nivel 1 (Estadísticas globales del Entrenador en Ajustes) y Nivel 2 (Columnas visibles de la tabla)
  const effectiveCols = useMemo<StatMetricsConfig>(() => ({
    ...DEFAULT_STAT_METRICS,
    minutes: statMetrics.minutes !== false && visibleCols.minutes !== false,
    cleanSheets: statMetrics.cleanSheets !== false && visibleCols.cleanSheets !== false,
    assists: statMetrics.assists !== false && visibleCols.assists !== false,
    shotsOnTarget: statMetrics.shotsOnTarget !== false && visibleCols.shotsOnTarget !== false,
    shotsOffTarget: statMetrics.shotsOffTarget !== false && visibleCols.shotsOffTarget !== false,
    fouls: statMetrics.fouls !== false && visibleCols.fouls !== false,
    offsides: statMetrics.offsides !== false && visibleCols.offsides !== false,
    cards: statMetrics.cards !== false && visibleCols.cards !== false,
    corners: statMetrics.corners !== false,
  }), [statMetrics, visibleCols]);

  const playerLookup = useMemo(() => {
    const map = new Map<string, { photoUrl?: string; position?: string; number?: number; name?: string }>();
    (activeTeam?.players || []).filter(Boolean).forEach(p => {
      map.set(String(p.id), {
        photoUrl: p.photoUrl || p.avatar,
        position: p.position,
        number: p.number,
        name: p.name,
      });
    });
    return map;
  }, [activeTeam?.players]);

  const stats = useMemo(() => {
    if (!showOnlyActive) return rawStats;
    const activePlayerIds = new Set(
      (activeTeam?.players || []).filter(Boolean).filter(p => p.isActive !== false).map(p => p.id)
    );
    return rawStats.filter(s => activePlayerIds.has(s.playerId));
  }, [rawStats, showOnlyActive, activeTeam?.players]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prevKey => {
      if (prevKey === key) {
        setSortDesc(prevDesc => !prevDesc);
        return prevKey;
      }
      setSortDesc(true);
      return key;
    });
  }, []);

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }

      if ((aVal ?? 0) < (bVal ?? 0)) return sortDesc ? 1 : -1;
      if ((aVal ?? 0) > (bVal ?? 0)) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [stats, sortKey, sortDesc]);

  const SortableHeader = ({ label, sortKey: key, stickyClass }: { label: string; sortKey: SortKey; stickyClass?: string }) => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`px-3 py-3 text-left font-bold cursor-pointer select-none whitespace-nowrap transition-colors sticky top-0 bg-[#111214] shadow-sm backdrop-blur-md text-[11px] uppercase tracking-[0.05em] border-b border-[#1F1F1F] ${
          isActive ? 'text-[#EDEDED]' : 'text-[#737373] hover:text-[#EDEDED]'
        } ${stickyClass || 'z-20'}`}
      >
        <div className="flex items-center gap-1.5">
          {label}
          {isActive ? (
            sortDesc ? <ChevronDown className="w-3.5 h-3.5 text-[#EDEDED]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#EDEDED]" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </div>
      </th>
    );
  };

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center p-4">
        <div className="w-12 h-12 bg-[#111111] rounded-lg flex items-center justify-center mb-4 border border-[#262626]">
          <BarChart3 className="w-5 h-5 text-[#737373]" />
        </div>
        <h2 className="text-[18px] font-semibold text-[#EDEDED] mb-1.5 tracking-[-0.02em]">Aún no hay datos</h2>
        <p className="text-[13px] text-[#737373]">
          Juega y finaliza partidos para que el sistema empiece a procesar y acumular las estadísticas de tu plantilla.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0A0A0A] p-4 sm:p-5 rounded-t-lg border border-[#1F1F1F] border-b-0">
        <div>
          <h1 className="text-[18px] font-semibold text-[#EDEDED] mb-0.5 flex items-center gap-2.5 tracking-[-0.025em]">
            <BarChart3 className="w-4 h-4 text-[#888888] shrink-0" />
            Rendimiento de Plantilla
          </h1>
          <p className="text-[12px] text-[#737373]">Estadísticas acumuladas de todos los partidos registrados en la temporada.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <label className="flex items-center gap-2 cursor-pointer px-2.5 h-8 rounded-md bg-[#111111] border border-[#262626]">
            <input
              type="checkbox"
              className="rounded border-[#333333] bg-[#0A0A0A] text-white focus:ring-0"
              checked={showOnlyActive}
              onChange={() => setShowOnlyActive(!showOnlyActive)}
            />
            <span className="text-[12px] font-medium text-[#A1A1AA]">Ocultar bajas</span>
          </label>
          <button
            onClick={() => setIsColumnsModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md border border-[#2A2A2A] bg-[#141414] text-[#EDEDED] font-medium text-[12px] hover:bg-[#1F1F1F] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 👁️ Columnas Visibles
          </button>
          <button
            onClick={() => exportPerformanceToExcel(sortedStats, effectiveCols)}
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md border border-[#262626] bg-[#111111] text-[#EDEDED] font-medium text-[12px] hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#888888] shrink-0" /> Exportar Excel
          </button>
          <button
            onClick={() => exportPerformanceToPDF(sortedStats, effectiveCols, activeTeam?.name, teamSettings?.crestUrl)}
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#EDEDED] text-[#0A0A0A] font-medium text-[12px] hover:bg-white transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[calc(100vh-210px)] w-full">
          <table className="w-full min-w-max text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#111214] shadow-sm backdrop-blur-md">
              <tr className="border-b border-[#1F1F1F]">
                <SortableHeader label="Dorsal" sortKey="number" stickyClass="left-0 z-30 border-r border-[#1F1F1F]/60" />
                <SortableHeader label="Jugador" sortKey="name" stickyClass="left-[72px] z-30 border-r border-[#1F1F1F]/60 shadow-[2px_0_5px_rgba(0,0,0,0.5)]" />
                <SortableHeader label="Conv." sortKey="callUps" />
                <SortableHeader label="Tit." sortKey="starts" />
                <SortableHeader label="Part." sortKey="matches" />
                {effectiveCols.minutes !== false && (
                  <>
                    <SortableHeader label="Min." sortKey="minutesPlayed" />
                    <SortableHeader label="Min/P" sortKey="avgMinutes" />
                    <SortableHeader label="% Min." sortKey="minPercentage" />
                  </>
                )}
                <SortableHeader label="Ban." sortKey="benchStarts" />
                <SortableHeader label="Cap." sortKey="captaincies" />
                <SortableHeader label="% Ent." sortKey="trainingAttendance" />
                {effectiveCols.cleanSheets !== false && <SortableHeader label="P.0" sortKey="cleanSheets" />}
                <SortableHeader label="Goles" sortKey="goals" />
                {effectiveCols.assists !== false && <SortableHeader label="Asist." sortKey="assists" />}
                {effectiveCols.shotsOnTarget !== false && <SortableHeader label="T.P." sortKey="shotsOnTarget" />}
                {effectiveCols.shotsOffTarget !== false && <SortableHeader label="T.F." sortKey="shotsOffTarget" />}
                {effectiveCols.fouls !== false && <SortableHeader label="Falt." sortKey="fouls" />}
                {effectiveCols.offsides !== false && <SortableHeader label="F.J." sortKey="offsides" />}
                {effectiveCols.cards !== false && (
                  <>
                    <SortableHeader label="Ama." sortKey="yellows" />
                    <SortableHeader label="Roj." sortKey="reds" />
                  </>
                )}
                <SortableHeader label="Nota" sortKey="averageRating" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-[13px] font-mono tabular-nums">
              {sortedStats.map((p, idx) => {
                const pMeta = playerLookup.get(String(p.playerId));
                return (
                  <tr
                    key={p.playerId || idx}
                    onClick={() => setSelectedPlayerModalId(String(p.playerId))}
                    className="hover:bg-[#111111]/60 transition-colors cursor-pointer"
                    title="Clic para ver ficha estadística del jugador"
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#888888] sticky left-0 bg-[#0A0A0A] z-10 border-r border-[#1F1F1F]/40">
                      {p.number !== undefined ? p.number : '-'}
                    </td>
                    <td className="px-3 py-2.5 font-sans font-medium text-[#EDEDED] whitespace-nowrap sticky left-[72px] bg-[#0A0A0A] z-10 border-r border-[#1F1F1F]/40 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2.5">
                        {pMeta?.photoUrl ? (
                          <img
                            src={pMeta.photoUrl}
                            alt={p.name}
                            className="w-6 h-6 rounded-full object-cover border border-[#333333] shrink-0"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-[#161616] border border-[#2A2A2A] font-mono text-[10px] font-semibold text-[#A1A1AA] flex items-center justify-center shrink-0">
                            {p.number ?? '-'}
                          </span>
                        )}
                        <span className="truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#A1A1AA]">{p.callUps}</td>
                    <td className="px-3 py-2.5 text-[#A1A1AA]">{p.starts}</td>
                    <td className="px-3 py-2.5 text-[#EDEDED] font-semibold">{p.matches}</td>
                    {effectiveCols.minutes !== false && (
                      <>
                        <td className="px-3 py-2.5 text-[#EDEDED] font-semibold">{p.minutesPlayed}'</td>
                        <td className="px-3 py-2.5 text-[#A1A1AA]">{p.avgMinutes}'</td>
                        <td className="px-3 py-2.5 text-[#A1A1AA]">{p.minPercentage}%</td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-[#737373]">{p.benchStarts}</td>
                    <td className="px-3 py-2.5 text-[#737373]">{p.captaincies}</td>
                    <td className="px-3 py-2.5 text-[#A1A1AA]">{p.trainingAttendance}%</td>
                    {effectiveCols.cleanSheets !== false && <td className="px-3 py-2.5 text-[#A1A1AA]">{p.cleanSheets}</td>}
                    <td className="px-3 py-2.5 text-emerald-400 font-semibold">{p.goals}</td>
                    {effectiveCols.assists !== false && <td className="px-3 py-2.5 text-blue-400">{p.assists}</td>}
                    {effectiveCols.shotsOnTarget !== false && <td className="px-3 py-2.5 text-[#A1A1AA]">{p.shotsOnTarget}</td>}
                    {effectiveCols.shotsOffTarget !== false && <td className="px-3 py-2.5 text-[#737373]">{p.shotsOffTarget}</td>}
                    {effectiveCols.fouls !== false && <td className="px-3 py-2.5 text-[#737373]">{p.fouls}</td>}
                    {effectiveCols.offsides !== false && <td className="px-3 py-2.5 text-orange-400">{p.offsides}</td>}
                    {effectiveCols.cards !== false && (
                      <>
                        <td className="px-3 py-2.5 text-amber-400">{p.yellows}</td>
                        <td className="px-3 py-2.5 text-red-400">{p.reds}</td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-[#EDEDED] font-semibold">{p.averageRating}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Columnas Visibles (Nivel 2: Solo afecta a esta tabla) */}
      {isColumnsModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsColumnsModalOpen(false)}
        >
          <div
            className="bg-[#0A0A0A] border border-[#262626] rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#1F1F1F] flex items-center justify-between bg-[#0E0E0E]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-[14px] font-semibold text-[#EDEDED]">👁️ Columnas Visibles en Tabla</h3>
              </div>
              <button
                onClick={() => setIsColumnsModalOpen(false)}
                className="text-[#737373] hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <p className="text-[12px] text-[#888888] mb-3">
                Personaliza qué columnas deseas ver ahora mismo en la tabla de Rendimiento. Ocultar una columna aquí <strong>no desactiva</strong> su registro en Partido en Directo.
              </p>
              {VISIBLE_COLUMNS_META.map(col => {
                const globallyDisabled = statMetrics[col.key] === false;
                const isChecked = !globallyDisabled && visibleCols[col.key] !== false;
                return (
                  <button
                    key={col.key}
                    type="button"
                    disabled={globallyDisabled}
                    onClick={() => toggleVisibleCol(col.key)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      globallyDisabled
                        ? 'bg-[#080808] border-[#1A1A1A] opacity-45 cursor-not-allowed'
                        : isChecked
                        ? 'bg-[#121212] border-emerald-500/40 text-white'
                        : 'bg-[#0C0C0C] border-[#222222] text-[#888888] hover:border-[#333333]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold">{col.label}</div>
                      <div className="text-[11px] text-[#666666]">
                        {globallyDisabled ? 'Desactivada globalmente en Configuración del Club' : col.desc}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'bg-[#080808] border-[#333333] text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-[#1F1F1F] bg-[#0D0D0D] flex justify-end">
              <button
                onClick={() => setIsColumnsModalOpen(false)}
                className="h-8 px-4 rounded-md bg-[#EDEDED] text-[#0A0A0A] text-[12px] font-semibold hover:bg-white transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle Rápido del Jugador con Foto Circular */}
      {selectedPlayerModalId && (() => {
        const pStat = sortedStats.find(s => String(s.playerId) === selectedPlayerModalId);
        const pMeta = playerLookup.get(selectedPlayerModalId);
        if (!pStat) return null;
        return (
          <div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPlayerModalId(null)}
          >
            <div
              className="bg-[#0A0A0A] border border-[#262626] rounded-xl w-full max-w-md p-5 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F]">
                <div className="flex items-center gap-3.5">
                  {pMeta?.photoUrl ? (
                    <img
                      src={pMeta.photoUrl}
                      alt={pStat.name}
                      className="w-14 h-14 rounded-full object-cover border border-[#333333]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#141414] border border-[#2A2A2A] flex items-center justify-center font-mono text-xl font-bold text-[#EDEDED]">
                      #{pStat.number}
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] font-mono text-[#888888]">
                      #{pStat.number} · {pMeta?.position || 'Jugador'}
                    </div>
                    <h3 className="text-[17px] font-bold text-[#EDEDED]">{pStat.name}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlayerModalId(null)}
                  className="text-[#737373] hover:text-white p-1.5 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-4 font-mono">
                <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#737373] uppercase">Partidos / Tit.</div>
                  <div className="text-[15px] font-bold text-white mt-0.5">{pStat.matches} / {pStat.starts}</div>
                </div>
                <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#737373] uppercase">Minutos</div>
                  <div className="text-[15px] font-bold text-white mt-0.5">{pStat.minutesPlayed}'</div>
                </div>
                <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#737373] uppercase">Goles / Asist.</div>
                  <div className="text-[15px] font-bold text-emerald-400 mt-0.5">{pStat.goals} / {pStat.assists}</div>
                </div>
                <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#737373] uppercase">Tiros (TP / TF)</div>
                  <div className="text-[15px] font-bold text-white mt-0.5">{pStat.shotsOnTarget} / {pStat.shotsOffTarget}</div>
                </div>
                <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#737373] uppercase">Faltas / F.J.</div>
                  <div className="text-[15px] font-bold text-orange-400 mt-0.5">{pStat.fouls} / {pStat.offsides}</div>
                </div>
                <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#737373] uppercase">Nota Media</div>
                  <div className="text-[15px] font-bold text-amber-400 mt-0.5">{pStat.averageRating}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export const TeamPerformance = PlayerStatistics;
