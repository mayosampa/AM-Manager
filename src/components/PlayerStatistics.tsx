import { useState, useEffect, useMemo } from 'react';
import { MatchRecord } from '../types';
import { ArrowUpDown, ChevronDown, ChevronUp, BarChart3, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PlayerStatsAggregated {
  playerId: string;
  number: number;
  name: string;
  matches: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
}

type SortKey = keyof PlayerStatsAggregated;

export function PlayerStatistics() {
  const [stats, setStats] = useState<PlayerStatsAggregated[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    const rawHistory = localStorage.getItem('matchHistory');
    if (rawHistory) {
      const history: MatchRecord[] = JSON.parse(rawHistory);
      const aggregated = calculateGlobalStats(history);
      setStats(aggregated);
    }
  }, []);

  const calculateGlobalStats = (history: MatchRecord[]): PlayerStatsAggregated[] => {
    const statsMap: Record<string, PlayerStatsAggregated> = {};

    history.forEach(match => {
      // Usamos un Set para no contar el mismo partido dos veces a un jugador
      // por si aparece en 'squad' y luego referenciado en eventos.
      const participants = new Set<string>();
      
      // Consideramos que un jugador ha "jugado" / estado convocado
      // si estaba en el 11 titular (squad) o en el banquillo (bench)
      const allMatchPlayers = [...(match.squad || []), ...(match.bench || [])];

      allMatchPlayers.forEach(p => {
        if (!statsMap[p.id]) {
          statsMap[p.id] = {
            playerId: p.id,
            number: p.number,
            name: p.name,
            matches: 0,
            goals: 0,
            assists: 0,
            yellows: 0,
            reds: 0,
          };
        }
        
        // Contabilizar aparición en el partido
        if (!participants.has(p.id)) {
          statsMap[p.id].matches += 1;
          participants.add(p.id);
        }
      });

      // Procesar timeline de eventos
      match.events?.forEach(ev => {
        if (ev.type === 'goal') {
          if (statsMap[ev.playerId]) statsMap[ev.playerId].goals += 1;
          if (ev.assistId && statsMap[ev.assistId]) {
            statsMap[ev.assistId].assists += 1;
          }
        } else if (statsMap[ev.playerId]) {
          if (ev.type === 'assist') statsMap[ev.playerId].assists += 1;
          if (ev.type === 'yellow') statsMap[ev.playerId].yellows += 1;
          if (ev.type === 'red') statsMap[ev.playerId].reds += 1;
        }
      });
    });

    return Object.values(statsMap);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true); // Por defecto al cambiar de métrica, ordenar de mayor a menor
    }
  };

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      
      if (aVal < bVal) return sortDesc ? 1 : -1;
      if (aVal > bVal) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [stats, sortKey, sortDesc]);

  const SortableHeader = ({ label, sortKey: key }: { label: string, sortKey: SortKey }) => {
    const isActive = sortKey === key;
    return (
      <th 
        onClick={() => handleSort(key)}
        className={`p-4 text-left font-bold cursor-pointer select-none whitespace-nowrap transition-colors ${
          isActive ? 'text-[#FF4B4B]' : 'text-[#6E6E75] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {label}
          {isActive ? (
            sortDesc ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </div>
      </th>
    );
  };

  const exportToExcel = () => {
    const dataToExport = sortedStats.map(p => ({
      Dorsal: p.number,
      Nombre: p.name,
      Partidos: p.matches,
      Goles: p.goals,
      Asistencias: p.assists,
      Amarillas: p.yellows,
      Rojas: p.reds
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estadisticas");
    
    XLSX.writeFile(workbook, "AM_Manager_Estadisticas.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Informe de Rendimiento - AM Manager", 14, 22);
    
    const tableData = sortedStats.map(p => [
      p.number,
      p.name,
      p.matches,
      p.goals,
      p.assists,
      p.yellows,
      p.reds
    ]);
    
    autoTable(doc, {
      startY: 30,
      head: [['Dorsal', 'Nombre', 'Partidos', 'Goles', 'Asistencias', 'Amarillas', 'Rojas']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] } // corresponding to red-500
    });
    
    doc.save("AM_Manager_Estadisticas.pdf");
  };

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
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
      <div className="flex justify-between items-center bg-[#121215] p-6 rounded-t-2xl border border-[#2A2A2E] border-b-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-[#FF4B4B]" />
            Rendimiento de Plantilla
          </h1>
          <p className="text-[#6E6E75]">Estadísticas acumuladas de todos los partidos registrados.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500 text-red-500 font-bold text-sm hover:bg-red-500 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500 text-red-500 font-bold text-sm hover:bg-red-500 hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-[#121215] border border-[#2A2A2E] rounded-b-2xl overflow-hidden shadow-2xl">
        {/* Contenedor con overflow-x-auto para tablas responsive */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1C1C1F] border-b border-[#2A2A2E]">
              <tr>
                <SortableHeader label="Jugador" sortKey="name" />
                <SortableHeader label="Partidos" sortKey="matches" />
                <SortableHeader label="⚽ Goles" sortKey="goals" />
                <SortableHeader label="👟 Asistencias" sortKey="assists" />
                <SortableHeader label="🟨 Amarillas" sortKey="yellows" />
                <SortableHeader label="🟥 Rojas" sortKey="reds" />
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((player, index) => (
                <tr 
                  key={player.playerId} 
                  className={`border-b border-[#2A2A2E]/50 hover:bg-[#1C1C1F] transition-colors ${
                    index === 0 && sortKey === 'goals' ? 'bg-[#FF4B4B]/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === 0 && sortKey === 'goals' 
                          ? 'bg-[#FF4B4B] text-black shadow-[0_0_10px_rgba(255,75,75,0.4)]' 
                          : 'bg-[#2A2A2E] text-white'
                      }`}>
                        {player.number}
                      </span>
                      <span className="font-bold text-white">{player.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-white font-medium">{player.matches}</td>
                  <td className={`p-4 font-mono font-bold ${player.goals > 0 ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
                    {player.goals}
                  </td>
                  <td className={`p-4 font-mono font-bold ${player.assists > 0 ? 'text-white' : 'text-[#6E6E75]'}`}>
                    {player.assists}
                  </td>
                  <td className={`p-4 font-mono font-bold ${player.yellows > 0 ? 'text-yellow-400' : 'text-[#6E6E75]'}`}>
                    {player.yellows}
                  </td>
                  <td className={`p-4 font-mono font-bold ${player.reds > 0 ? 'text-red-500' : 'text-[#6E6E75]'}`}>
                    {player.reds}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
