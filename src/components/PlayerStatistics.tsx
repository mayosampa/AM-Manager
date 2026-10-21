import { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, BarChart3, FileSpreadsheet, FileText } from 'lucide-react';
import { useTeamStats, PlayerStatsAggregated } from '../hooks/useTeamStats';
import { useTeam } from '../context/TeamContext';
import { exportPerformanceToExcel, exportPerformanceToPDF } from '../services/performanceExport';

type SortKey = keyof PlayerStatsAggregated;

export function PlayerStatistics() {
  const { activeTeam } = useTeam();
  const rawStats = useTeamStats();
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [sortDesc, setSortDesc] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

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
        className={`px-3 py-2.5 text-left font-medium cursor-pointer select-none whitespace-nowrap transition-colors bg-[#0D0D0D] text-[11px] uppercase tracking-[0.05em] ${
          isActive ? 'text-[#EDEDED]' : 'text-[#737373] hover:text-[#EDEDED]'
        } ${stickyClass || ''}`}
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
    <div className="flex flex-col max-w-6xl mx-auto w-full pb-20">
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
            onClick={() => exportPerformanceToExcel(sortedStats)}
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md border border-[#262626] bg-[#111111] text-[#EDEDED] font-medium text-[12px] hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#888888] shrink-0" /> Exportar Excel
          </button>
          <button
            onClick={() => exportPerformanceToPDF(sortedStats)}
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#EDEDED] text-[#0A0A0A] font-medium text-[12px] hover:bg-white transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[calc(100vh-240px)] w-full">
          <table className="w-full min-w-max text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F1F1F]">
                <SortableHeader label="Dorsal" sortKey="number" stickyClass="sticky left-0 z-20" />
                <SortableHeader label="Jugador" sortKey="name" stickyClass="sticky left-[72px] z-20" />
                <SortableHeader label="Conv." sortKey="callUps" />
                <SortableHeader label="Tit." sortKey="starts" />
                <SortableHeader label="Part." sortKey="matches" />
                <SortableHeader label="Min." sortKey="minutesPlayed" />
                <SortableHeader label="Min/P" sortKey="avgMinutes" />
                <SortableHeader label="% Min." sortKey="minPercentage" />
                <SortableHeader label="Ban." sortKey="benchStarts" />
                <SortableHeader label="Cap." sortKey="captaincies" />
                <SortableHeader label="% Ent." sortKey="trainingAttendance" />
                <SortableHeader label="P.0" sortKey="cleanSheets" />
                <SortableHeader label="Goles" sortKey="goals" />
                <SortableHeader label="Asist." sortKey="assists" />
                <SortableHeader label="T.P." sortKey="shotsOnTarget" />
                <SortableHeader label="T.F." sortKey="shotsOffTarget" />
                <SortableHeader label="Córn." sortKey="corners" />
                <SortableHeader label="Falt." sortKey="fouls" />
                <SortableHeader label="F.J." sortKey="offsides" />
                <SortableHeader label="Ama." sortKey="yellows" />
                <SortableHeader label="Roj." sortKey="reds" />
                <SortableHeader label="Nota" sortKey="averageRating" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-[13px] font-mono">
              {sortedStats.map((p, idx) => (
                <tr key={p.playerId || idx} className="hover:bg-[#111111]/60 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-[#888888] sticky left-0 bg-[#0A0A0A] z-10 border-r border-[#1F1F1F]/40">
                    {p.number !== undefined ? p.number : '-'}
                  </td>
                  <td className="px-3 py-2.5 font-sans font-medium text-[#EDEDED] whitespace-nowrap sticky left-[72px] bg-[#0A0A0A] z-10 border-r border-[#1F1F1F]/40 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                    {p.name}
                  </td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.callUps}</td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.starts}</td>
                  <td className="px-3 py-2.5 text-[#EDEDED] font-semibold">{p.matches}</td>
                  <td className="px-3 py-2.5 text-[#EDEDED] font-semibold">{p.minutesPlayed}'</td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.avgMinutes}'</td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.minPercentage}%</td>
                  <td className="px-3 py-2.5 text-[#737373]">{p.benchStarts}</td>
                  <td className="px-3 py-2.5 text-[#737373]">{p.captaincies}</td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.trainingAttendance}%</td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.cleanSheets}</td>
                  <td className="px-3 py-2.5 text-emerald-400 font-semibold">{p.goals}</td>
                  <td className="px-3 py-2.5 text-blue-400">{p.assists}</td>
                  <td className="px-3 py-2.5 text-[#A1A1AA]">{p.shotsOnTarget}</td>
                  <td className="px-3 py-2.5 text-[#737373]">{p.shotsOffTarget}</td>
                  <td className="px-3 py-2.5 text-[#737373]">{p.corners}</td>
                  <td className="px-3 py-2.5 text-[#737373]">{p.fouls}</td>
                  <td className="px-3 py-2.5 text-[#737373]">{p.offsides}</td>
                  <td className="px-3 py-2.5 text-amber-400">{p.yellows}</td>
                  <td className="px-3 py-2.5 text-red-400">{p.reds}</td>
                  <td className="px-3 py-2.5 text-[#EDEDED] font-semibold">{p.averageRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const TeamPerformance = PlayerStatistics;
