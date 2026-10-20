import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlayerStatsAggregated } from './playerStatsAggregator';

export function exportPerformanceToExcel(sortedStats: PlayerStatsAggregated[]): void {
  const dataToExport = sortedStats.map(p => ({
    Dorsal: p.number,
    Nombre: p.name,
    Conv: p.callUps,
    Tit: p.starts,
    Partidos: p.matches,
    Minutos: p.minutesPlayed,
    'Min/P': p.avgMinutes,
    '% MIN': p.minPercentage,
    BAN: p.benchStarts,
    CAP: p.captaincies,
    '% Ent': p.trainingAttendance,
    'P.0': p.cleanSheets,
    Goles: p.goals,
    Asistencias: p.assists,
    'Tiros a Puerta': p.shotsOnTarget,
    'Tiros Fuera': p.shotsOffTarget,
    'Córners': p.corners,
    Faltas: p.fouls,
    'Fueras de Juego': p.offsides,
    Amarillas: p.yellows,
    Rojas: p.reds,
    'Nota Media': p.averageRating,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estadisticas');

  XLSX.writeFile(workbook, 'AM_Manager_Estadisticas.xlsx');
}

export function exportPerformanceToPDF(sortedStats: PlayerStatsAggregated[]): void {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('Informe de Rendimiento - AM Manager', 14, 18);

  const tableData = sortedStats.map(p => [
    p.number,
    p.name,
    p.callUps,
    p.starts,
    p.matches,
    p.minutesPlayed,
    p.avgMinutes,
    `${p.minPercentage}%`,
    p.benchStarts,
    p.captaincies,
    `${p.trainingAttendance}%`,
    p.cleanSheets,
    p.goals,
    p.assists,
    p.shotsOnTarget,
    p.shotsOffTarget,
    p.corners,
    p.fouls,
    p.offsides,
    p.yellows,
    p.reds,
    p.averageRating,
  ]);

  autoTable(doc, {
    startY: 24,
    head: [[
      'Dor.',
      'Nombre',
      'Conv.',
      'Tit.',
      'Part.',
      'Min.',
      'Min/P',
      '% MIN',
      'BAN',
      'CAP',
      '% Ent.',
      'P.0',
      'Goles',
      'Asist.',
      'T.P.',
      'T.F.',
      'Córn.',
      'Falt.',
      'F.J.',
      'Ama.',
      'Roj.',
      'Nota',
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [239, 68, 68], fontSize: 7.5 },
  });

  doc.save('AM_Manager_Estadisticas.pdf');
}
