import { PlayerStatsAggregated } from './playerStatsAggregator';
import { StatMetricsConfig, DEFAULT_STAT_METRICS, Team } from '../types';
import { drawUnifiedPdfHeader, resolveShieldDataUrl } from './pdfHeaderHelper';
import { cacheService } from './cacheService';

export async function exportPerformanceToExcel(
  sortedStats: PlayerStatsAggregated[],
  metrics: StatMetricsConfig = DEFAULT_STAT_METRICS
): Promise<void> {
  const XLSX = await import('xlsx');

  const dataToExport = sortedStats.map(p => {
    const row: Record<string, string | number> = {
      Dorsal: p.number,
      Nombre: p.name,
      Conv: p.callUps,
      Tit: p.starts,
      Partidos: p.matches,
    };
    if (metrics.minutes !== false) {
      row['Minutos'] = p.minutesPlayed;
      row['Min/P'] = p.avgMinutes;
      row['% MIN'] = p.minPercentage;
    }
    row['BAN'] = p.benchStarts;
    row['CAP'] = p.captaincies;
    row['% Ent'] = p.trainingAttendance;
    if (metrics.cleanSheets !== false) row['P.0'] = p.cleanSheets;
    row['Goles'] = p.goals;
    if (metrics.assists !== false) row['Asistencias'] = p.assists;
    if (metrics.shotsOnTarget !== false) row['Tiros a Puerta'] = p.shotsOnTarget;
    if (metrics.shotsOffTarget !== false) row['Tiros Fuera'] = p.shotsOffTarget;
    if (metrics.fouls !== false) row['Faltas'] = p.fouls;
    if (metrics.offsides !== false) row['Fueras de Juego'] = p.offsides;
    if (metrics.cards !== false) {
      row['Amarillas'] = p.yellows;
      row['Rojas'] = p.reds;
    }
    row['Nota Media'] = p.averageRating;
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estadisticas');

  XLSX.writeFile(workbook, 'AM_Manager_Estadisticas.xlsx');
}

export async function exportPerformanceToPDF(
  sortedStats: PlayerStatsAggregated[],
  metrics: StatMetricsConfig = DEFAULT_STAT_METRICS,
  teamName?: string,
  teamShield?: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule as any).default || autoTableModule;

  const doc = new jsPDF({ orientation: 'landscape' });

  const resolvedTeamName =
    teamName || cacheService.get<Team[]>('teams', [])[0]?.name || 'Plantilla Oficial';
  const resolvedShield = await resolveShieldDataUrl(teamShield, resolvedTeamName);

  const headerBottomY = drawUnifiedPdfHeader(doc, {
    teamName: resolvedTeamName,
    teamShield: resolvedShield,
    reportTitle: 'INFORME DE RENDIMIENTO DE PLANTILLA',
    subtitle: `Jugadores evaluados: ${sortedStats.length}   |   Estadísticas acumuladas de temporada`,
  });

  const headRow: string[] = ['Dor.', 'Nombre', 'Conv.', 'Tit.', 'Part.'];
  if (metrics.minutes !== false) headRow.push('Min.', 'Min/P', '% MIN');
  headRow.push('BAN', 'CAP', '% Ent.');
  if (metrics.cleanSheets !== false) headRow.push('P.0');
  headRow.push('Goles');
  if (metrics.assists !== false) headRow.push('Asist.');
  if (metrics.shotsOnTarget !== false) headRow.push('T.P.');
  if (metrics.shotsOffTarget !== false) headRow.push('T.F.');
  if (metrics.fouls !== false) headRow.push('Falt.');
  if (metrics.offsides !== false) headRow.push('F.J.');
  if (metrics.cards !== false) headRow.push('Ama.', 'Roj.');
  headRow.push('Nota');

  const tableData = sortedStats.map(p => {
    const row: (string | number)[] = [
      p.number,
      p.name,
      p.callUps,
      p.starts,
      p.matches,
    ];
    if (metrics.minutes !== false) {
      row.push(p.minutesPlayed, p.avgMinutes, `${p.minPercentage}%`);
    }
    row.push(p.benchStarts, p.captaincies, `${p.trainingAttendance}%`);
    if (metrics.cleanSheets !== false) row.push(p.cleanSheets);
    row.push(p.goals);
    if (metrics.assists !== false) row.push(p.assists);
    if (metrics.shotsOnTarget !== false) row.push(p.shotsOnTarget);
    if (metrics.shotsOffTarget !== false) row.push(p.shotsOffTarget);
    if (metrics.fouls !== false) row.push(p.fouls);
    if (metrics.offsides !== false) row.push(p.offsides);
    if (metrics.cards !== false) row.push(p.yellows, p.reds);
    row.push(p.averageRating);
    return row;
  });

  autoTable(doc, {
    startY: headerBottomY + 6,
    head: [headRow],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [239, 68, 68], fontSize: 7.5 },
  });

  doc.save('AM_Manager_Estadisticas.pdf');
}
