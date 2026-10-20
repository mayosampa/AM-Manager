import { useState, useMemo } from 'react';
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
  }, [rawStats, showOnlyActive, activeTeam]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

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
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md border border-[#262626] bg-[#111111] text-[#EDEDED] font-medium text-[12px] hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#888888] shrink-0" /> Exportar Excel
          </button>
          <button
            onClick={() => exportPerformanceToPDF(sortedStats)}
            className="flex-1 sm:flex-initial justify-center h-8 flex items-center gap-1.5 px-3 rounded-md bg-[#EDEDED] text-[#0A0A0A] font-medium text-[12px] hover:bg-white transition-colors"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[calc(100vh-240px)] w-full">
          <table className="w-full min-w-max text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#0D0D0D] border-b border-[#1F1F1F]">
                <SortableHeader label="Jugador" sortKey="name" stickyClass="sticky left-0 z-30 border-r border-[#1F1F1F]" />
                <SortableHeader label="Conv." sortKey="callUps" />
                <SortableHeader label="Tit." sortKey="starts" />
                <SortableHeader label="Part." sortKey="matches" />
                <SortableHeader label="Min." sortKey="minutesPlayed" />
                <SortableHeader label="Min/P" sortKey="avgMinutes" />
                <SortableHeader label="% Min" sortKey="minPercentage" />
                <SortableHeader label="Banq." sortKey="benchStarts" />
                <SortableHeader label="Cap." sortKey="captaincies" />
                <SortableHeader label="% Ent." sortKey="trainingAttendance" />
                <SortableHeader label="P.0" sortKey="cleanSheets" />
                <SortableHeader label="Goles" sortKey="goals" />
                <SortableHeader label="Asist." sortKey="assists" />
                <SortableHeader label="T. Puerta" sortKey="shotsOnTarget" />
                <SortableHeader label="T. Fuera" sortKey="shotsOffTarget" />
                <SortableHeader label="Córners" sortKey="corners" />
                <SortableHeader label="Faltas" sortKey="fouls" />
                <SortableHeader label="F. Juego" sortKey="offsides" />
                <SortableHeader label="Amar." sortKey="yellows" />
                <SortableHeader label="Rojas" sortKey="reds" />
                <SortableHeader label="Media" sortKey="averageRating" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]">
              {sortedStats.map((player, index) => {
                const teamPlayer = activeTeam?.players.find(p => p.id === player.playerId);
                const isInactive = teamPlayer ? teamPlayer.isActive === false : true;

                return (
                  <tr
                    key={player.playerId}
                    className={`group hover:bg-[#111111] transition-colors ${isInactive ? 'opacity-45' : ''}`}
                  >
                    <td className="px-3 py-2.5 sticky left-0 z-10 bg-[#0A0A0A] group-hover:bg-[#111111] border-r border-[#1F1F1F]">
                      <div className="flex items-center gap-2.5 min-w-[160px] sm:min-w-[190px]">
                        <span className={`w-6 h-6 rounded-md font-mono flex items-center justify-center font-semibold text-[11px] shrink-0 border ${
                          index === 0 && sortKey === 'goals' && !isInactive
                            ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                            : 'bg-[#141414] text-[#A1A1AA] border-[#262626]'
                        }`}>
                          {player.number}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-[#EDEDED] text-[13px] truncate">{player.name}</span>
                          {isInactive && (
                            <span className="text-[10px] text-[#737373] font-mono uppercase tracking-wider">Baja</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#A1A1AA] text-[12px]">{player.callUps}</td>
                    <td className="px-3 py-2.5 font-mono text-[#A1A1AA] text-[12px]">{player.starts}</td>
                    <td className="px-3 py-2.5 font-mono text-[#EDEDED] text-[12px]">{player.matches}</td>
                    <td className="px-3 py-2.5 font-mono text-[#EDEDED] text-[12px]">{player.minutesPlayed}'</td>
                    <td className="px-3 py-2.5 font-mono text-[#737373] text-[12px]">{player.avgMinutes}'</td>
                    <td className="px-3 py-2.5 font-mono text-[#EDEDED] font-medium text-[12px]">{player.minPercentage}%</td>
                    <td className="px-3 py-2.5 font-mono text-[#A1A1AA] text-[12px]">{player.benchStarts}</td>
                    <td className="px-3 py-2.5 font-mono text-[#A1A1AA] text-[12px]">{player.captaincies}</td>
                    <td className="px-3 py-2.5 font-mono text-[#737373] text-[12px]">{player.trainingAttendance}%</td>
                    <td className="px-3 py-2.5 font-mono text-[#737373] text-[12px]">{player.cleanSheets}</td>
                    <td className={`px-3 py-2.5 font-mono font-semibold text-[12px] ${player.goals > 0 ? 'text-[#EDEDED]' : 'text-[#525252]'}`}>
                      {player.goals}
                    </td>
                    <td className={`px-3 py-2.5 font-mono font-medium text-[12px] ${player.assists > 0 ? 'text-[#EDEDED]' : 'text-[#525252]'}`}>
                      {player.assists}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.shotsOnTarget > 0 ? 'text-[#EDEDED]' : 'text-[#525252]'}`}>
                      {player.shotsOnTarget}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.shotsOffTarget > 0 ? 'text-[#A1A1AA]' : 'text-[#525252]'}`}>
                      {player.shotsOffTarget}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.corners > 0 ? 'text-[#A1A1AA]' : 'text-[#525252]'}`}>
                      {player.corners}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.fouls > 0 ? 'text-[#A1A1AA]' : 'text-[#525252]'}`}>
                      {player.fouls}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.offsides > 0 ? 'text-[#A1A1AA]' : 'text-[#525252]'}`}>
                      {player.offsides}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.yellows > 0 ? 'text-amber-400' : 'text-[#525252]'}`}>
                      {player.yellows}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-[12px] ${player.reds > 0 ? 'text-red-400' : 'text-[#525252]'}`}>
                      {player.reds}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-[#EDEDED] text-[12px]">{player.averageRating}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const TeamPerformance = PlayerStatistics;
