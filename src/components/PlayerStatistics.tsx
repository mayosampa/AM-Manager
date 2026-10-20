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
        className={`p-3 sm:p-4 text-left font-bold cursor-pointer select-none whitespace-nowrap transition-colors bg-[#1C1C1F] text-xs sm:text-sm ${
          isActive ? 'text-[#FF4B4B]' : 'text-[#6E6E75] hover:text-white'
        } ${stickyClass || ''}`}
      >
        <div className="flex items-center gap-1.5">
          {label}
          {isActive ? (
            sortDesc ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
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
        <div className="w-20 h-20 bg-[#1C1C1F] rounded-full flex items-center justify-center mb-6 border border-[#2A2A2E]">
          <BarChart3 className="w-10 h-10 text-[#6E6E75]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Aún no hay datos</h2>
        <p className="text-[#6E6E75]">
          Juega y finaliza partidos para que el sistema empiece a procesar y acumular las estadísticas de tu plantilla.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-6xl mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121215] p-4 sm:p-6 rounded-t-2xl border border-[#2A2A2E] border-b-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-[#FF4B4B] shrink-0" />
            Rendimiento de Plantilla
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6E75]">Estadísticas acumuladas de todos los partidos registrados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full md:w-auto">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={showOnlyActive}
                onChange={() => setShowOnlyActive(!showOnlyActive)}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${showOnlyActive ? 'bg-[#FF4B4B]' : 'bg-[#2A2A2E]'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOnlyActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-xs sm:text-sm font-medium text-[#E0E0E0]">Ocultar bajas</span>
          </label>
          <div className="hidden sm:block w-px h-6 bg-[#2A2A2E]"></div>
          <button
            onClick={() => exportPerformanceToExcel(sortedStats)}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-500 text-red-500 font-bold text-xs sm:text-sm hover:bg-red-500 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" /> Exportar Excel
          </button>
          <button
            onClick={() => exportPerformanceToPDF(sortedStats)}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-500 text-red-500 font-bold text-xs sm:text-sm hover:bg-red-500 hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4 shrink-0" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-[#121215] border border-[#2A2A2E] rounded-b-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[calc(100vh-250px)] w-full">
          <table className="w-full min-w-max text-left border-collapse">
            <thead className="sticky top-0 z-20 shadow-md">
              <tr className="bg-[#1C1C1F] border-b border-[#2A2A2E]">
                <SortableHeader label="Jugador" sortKey="name" stickyClass="sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]" />
                <SortableHeader label="Conv." sortKey="callUps" />
                <SortableHeader label="Tit." sortKey="starts" />
                <SortableHeader label="Part." sortKey="matches" />
                <SortableHeader label="Min." sortKey="minutesPlayed" />
                <SortableHeader label="Min/P" sortKey="avgMinutes" />
                <SortableHeader label="% MIN" sortKey="minPercentage" />
                <SortableHeader label="BAN" sortKey="benchStarts" />
                <SortableHeader label="CAP" sortKey="captaincies" />
                <SortableHeader label="% Ent." sortKey="trainingAttendance" />
                <SortableHeader label="P.0" sortKey="cleanSheets" />
                <SortableHeader label="⚽ Goles" sortKey="goals" />
                <SortableHeader label="👟 Asist." sortKey="assists" />
                <SortableHeader label="🎯 T. Puerta" sortKey="shotsOnTarget" />
                <SortableHeader label="💨 T. Fuera" sortKey="shotsOffTarget" />
                <SortableHeader label="🚩 Córners" sortKey="corners" />
                <SortableHeader label="⚠️ Faltas" sortKey="fouls" />
                <SortableHeader label="🛑 F. Juego" sortKey="offsides" />
                <SortableHeader label="🟨 Amarillas" sortKey="yellows" />
                <SortableHeader label="🟥 Rojas" sortKey="reds" />
                <SortableHeader label="⭐ Nota Media" sortKey="averageRating" />
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((player, index) => {
                const teamPlayer = activeTeam?.players.find(p => p.id === player.playerId);
                const isInactive = teamPlayer ? teamPlayer.isActive === false : true;

                return (
                  <tr
                    key={player.playerId}
                    className={`group border-b border-[#2A2A2E]/50 hover:bg-[#1C1C1F] transition-colors ${
                      index === 0 && sortKey === 'goals' ? 'bg-[#FF4B4B]/5' : ''
                    } ${isInactive ? 'opacity-50 grayscale' : ''}`}
                  >
                    <td className="p-3 sm:p-4 sticky left-0 z-10 bg-[#121215] group-hover:bg-[#1C1C1F] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-[150px] sm:min-w-[200px]">
                        <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          index === 0 && sortKey === 'goals' && !isInactive
                            ? 'bg-[#FF4B4B] text-black shadow-[0_0_10px_rgba(255,75,75,0.4)]'
                            : 'bg-[#2A2A2E] text-white'
                        }`}>
                          {player.number}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">{player.name}</span>
                          {isInactive && (
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-0.5">Baja</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-white font-medium text-xs sm:text-sm">{player.callUps}</td>
                    <td className="p-3 sm:p-4 text-white font-medium text-xs sm:text-sm">{player.starts}</td>
                    <td className="p-3 sm:p-4 text-white font-medium text-xs sm:text-sm">{player.matches}</td>
                    <td className="p-3 sm:p-4 text-white font-medium text-xs sm:text-sm">{player.minutesPlayed}'</td>
                    <td className="p-3 sm:p-4 text-[#6E6E75] font-medium text-xs sm:text-sm">{player.avgMinutes}'</td>
                    <td className="p-3 sm:p-4 text-white font-bold text-xs sm:text-sm">{player.minPercentage}%</td>
                    <td className="p-3 sm:p-4 text-orange-400 font-bold text-xs sm:text-sm">{player.benchStarts}</td>
                    <td className="p-3 sm:p-4 text-yellow-300 font-bold text-xs sm:text-sm">{player.captaincies}</td>
                    <td className="p-3 sm:p-4 text-[#6E6E75] font-medium text-xs sm:text-sm">{player.trainingAttendance}%</td>
                    <td className="p-3 sm:p-4 text-[#6E6E75] font-medium text-xs sm:text-sm">{player.cleanSheets}</td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.goals > 0 ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
                      {player.goals}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.assists > 0 ? 'text-white' : 'text-[#6E6E75]'}`}>
                      {player.assists}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.shotsOnTarget > 0 ? 'text-cyan-400' : 'text-[#6E6E75]'}`}>
                      {player.shotsOnTarget}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.shotsOffTarget > 0 ? 'text-zinc-300' : 'text-[#6E6E75]'}`}>
                      {player.shotsOffTarget}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.corners > 0 ? 'text-lime-400' : 'text-[#6E6E75]'}`}>
                      {player.corners}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.fouls > 0 ? 'text-amber-400' : 'text-[#6E6E75]'}`}>
                      {player.fouls}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.offsides > 0 ? 'text-orange-400' : 'text-[#6E6E75]'}`}>
                      {player.offsides}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.yellows > 0 ? 'text-yellow-400' : 'text-[#6E6E75]'}`}>
                      {player.yellows}
                    </td>
                    <td className={`p-3 sm:p-4 font-mono font-bold text-xs sm:text-sm ${player.reds > 0 ? 'text-red-500' : 'text-[#6E6E75]'}`}>
                      {player.reds}
                    </td>
                    <td className="p-3 sm:p-4 text-yellow-500 font-bold text-xs sm:text-sm">{player.averageRating}</td>
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
