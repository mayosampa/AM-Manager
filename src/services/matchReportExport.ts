import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatchRecord, MatchTeamStats, Player, EventType } from '../types';

export interface SingleMatchPlayerStat {
  isStarter: boolean;
  minutes: number;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  corners: number;
  fouls: number;
  offsides: number;
  yellow: number;
  red: number;
}

/** Computes per-match stats for each player directly from the match events and persisted playerMinutes */
export function computeSingleMatchStats(match: MatchRecord): {
  allPlayers: Player[];
  statsMap: Record<string, SingleMatchPlayerStat>;
} {
  const rawPlayers = [...(match.squad || []), ...(match.bench || [])].filter(Boolean);
  // Deduplicate by id preserving order
  const seen = new Set<string>();
  const uniquePlayers: Player[] = [];
  for (const p of rawPlayers) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      uniquePlayers.push(p);
    }
  }

  const squadIds = new Set((match.squad || []).filter(Boolean).map(p => p.id));
  const sortedSubs = (match.events || [])
    .filter(ev => ev.type === 'sub')
    .slice()
    .sort((a, b) => (a.time || 0) - (b.time || 0));

  // Determine true starter status from chronological substitution events
  const firstSubRole = new Map<string, 'out' | 'in'>();
  sortedSubs.forEach(sub => {
    if (sub.playerId && !firstSubRole.has(sub.playerId)) {
      firstSubRole.set(sub.playerId, 'out');
    }
    if (sub.playerInId && !firstSubRole.has(sub.playerInId)) {
      firstSubRole.set(sub.playerInId, 'in');
    }
  });

  const statsMap: Record<string, SingleMatchPlayerStat> = {};
  const durationMin = Math.round((match.duration || 90 * 60) / 60);

  uniquePlayers.forEach(p => {
    const subRole = firstSubRole.get(p.id);
    const isStarter = subRole === 'out' ? true : subRole === 'in' ? false : squadIds.has(p.id);

    statsMap[p.id] = {
      isStarter,
      minutes: isStarter ? durationMin : 0,
      goals: 0,
      assists: 0,
      shotsOnTarget: 0,
      shotsOffTarget: 0,
      corners: 0,
      fouls: 0,
      offsides: 0,
      yellow: 0,
      red: 0,
    };
  });

  if (match.playerMinutes && Object.keys(match.playerMinutes).length > 0) {
    Object.keys(statsMap).forEach(pid => {
      statsMap[pid].minutes = 0;
    });
    Object.entries(match.playerMinutes).forEach(([pid, mins]) => {
      if (statsMap[pid]) statsMap[pid].minutes = Number(mins) || 0;
    });
  } else {
    const enteredAtMap: Record<string, number> = {};
    uniquePlayers.forEach(p => {
      if (statsMap[p.id]?.isStarter) enteredAtMap[p.id] = 0;
    });

    sortedSubs.forEach(ev => {
      const subMin = Math.round((ev.time || 0) / 60);
      if (ev.playerId && statsMap[ev.playerId]) {
        const enteredAt = enteredAtMap[ev.playerId] ?? 0;
        statsMap[ev.playerId].minutes = Math.max(0, subMin - enteredAt);
      }
      if (ev.playerInId && statsMap[ev.playerInId]) {
        enteredAtMap[ev.playerInId] = subMin;
        statsMap[ev.playerInId].minutes = Math.max(0, durationMin - subMin);
      }
    });
  }

  (match.events || []).forEach(ev => {
    if (ev.type === 'goal' && ev.playerId && ev.playerId !== 'rival' && statsMap[ev.playerId]) {
      statsMap[ev.playerId].goals += 1;
      statsMap[ev.playerId].shotsOnTarget += 1;
    }
    if (ev.type === 'goal' && ev.assistId && statsMap[ev.assistId]) {
      statsMap[ev.assistId].assists += 1;
    }
    if (ev.type === 'assist' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].assists += 1;
    }
    if (ev.type === 'shot_on_target' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].shotsOnTarget += 1;
    }
    if (ev.type === 'shot_off_target' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].shotsOffTarget += 1;
    }
    if (ev.type === 'corner' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].corners += 1;
    }
    if (ev.type === 'foul' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].fouls += 1;
    }
    if (ev.type === 'offside' && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].offsides += 1;
    }
    if ((ev.type === 'yellow' || ev.type === 'yellow_card') && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].yellow += 1;
    }
    if ((ev.type === 'red' || ev.type === 'red_card') && ev.playerId && statsMap[ev.playerId]) {
      statsMap[ev.playerId].red += 1;
    }
  });

  // Sort: Starters first, then substitutes with minutes > 0, then remaining bench
  const allPlayers = [...uniquePlayers].sort((a, b) => {
    const sa = statsMap[a.id];
    const sb = statsMap[b.id];
    if (sa.isStarter !== sb.isStarter) return sa.isStarter ? -1 : 1;
    if ((sa.minutes > 0) !== (sb.minutes > 0)) return sa.minutes > 0 ? -1 : 1;
    return (Number(a.number) || 0) - (Number(b.number) || 0);
  });

  return { allPlayers, statsMap };
}

/**
 * Computes the effective team stats for a match by reconciling `match.teamStats`
 * with the sum of individual player events and the match scoreboard so that
 * team statistics (shots on target, yellow cards, red cards, corners, fouls, offsides)
 * are always 100% consistent with the individual player stats table.
 */
export function getEffectiveTeamStats(match: MatchRecord): MatchTeamStats {
  const { statsMap } = computeSingleMatchStats(match);
  const playerTotals = Object.values(statsMap).reduce(
    (acc, s) => {
      acc.shotsOnTarget += s.shotsOnTarget;
      acc.shotsOffTarget += s.shotsOffTarget;
      acc.corners += s.corners;
      acc.fouls += s.fouls;
      acc.offsides += s.offsides;
      acc.yellowCards += s.yellow;
      acc.redCards += s.red;
      return acc;
    },
    {
      shotsOnTarget: 0,
      shotsOffTarget: 0,
      corners: 0,
      fouls: 0,
      offsides: 0,
      yellowCards: 0,
      redCards: 0,
    }
  );

  const isLocal = match.condition !== 'Visitante';
  const myGoals = isLocal ? (match.score?.home || 0) : (match.score?.away || 0);
  const rvGoals = isLocal ? (match.score?.away || 0) : (match.score?.home || 0);

  const rawMy = match.teamStats?.myTeam;
  const rawRv = match.teamStats?.rival;
  const myPoss = rawMy?.possession ?? 50;
  const rvPoss = rawRv?.possession ?? 100 - myPoss;

  return {
    myTeam: {
      shotsOnTarget: Math.max(rawMy?.shotsOnTarget || 0, playerTotals.shotsOnTarget, myGoals),
      shotsOffTarget: Math.max(rawMy?.shotsOffTarget || 0, playerTotals.shotsOffTarget),
      corners: Math.max(rawMy?.corners || 0, playerTotals.corners),
      fouls: Math.max(rawMy?.fouls || 0, playerTotals.fouls),
      offsides: Math.max(rawMy?.offsides || 0, playerTotals.offsides),
      yellowCards: Math.max(rawMy?.yellowCards || 0, playerTotals.yellowCards),
      redCards: Math.max(rawMy?.redCards || 0, playerTotals.redCards),
      possession: myPoss,
    },
    rival: {
      shotsOnTarget: Math.max(rawRv?.shotsOnTarget || 0, rvGoals),
      shotsOffTarget: rawRv?.shotsOffTarget || 0,
      corners: rawRv?.corners || 0,
      fouls: rawRv?.fouls || 0,
      offsides: rawRv?.offsides || 0,
      yellowCards: rawRv?.yellowCards || 0,
      redCards: rawRv?.redCards || 0,
      possession: rvPoss,
    },
  };
}

function getEventTypeLabel(type: EventType, playerId?: string): string {
  switch (type) {
    case 'goal':
      return playerId === 'rival' ? 'Gol en Contra (Rival)' : 'Gol a Favor';
    case 'assist':
      return 'Asistencia';
    case 'shot_on_target':
      return 'Tiro a Puerta';
    case 'shot_off_target':
      return 'Tiro Fuera';
    case 'corner':
      return 'Córner';
    case 'foul':
      return 'Falta';
    case 'offside':
      return 'Fuera de Juego';
    case 'yellow':
    case 'yellow_card':
      return 'Tarjeta Amarilla';
    case 'red':
    case 'red_card':
      return 'Tarjeta Roja';
    case 'sub':
      return 'Sustitución';
    case 'period_end':
      return 'Fin de Parte';
    case 'note':
      return 'Nota Rápida';
    default:
      return String(type);
  }
}

const formatEventTime = (totalSeconds: number) => {
  const m = Math.floor((totalSeconds || 0) / 60);
  const s = (totalSeconds || 0) % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const sanitizeFilename = (str: string) =>
  (str || 'partido')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

export function exportSingleMatchToExcel(
  match: MatchRecord,
  rosterPlayers: Player[] = [],
  defaultTeamName = 'Nuestro Equipo'
): void {
  const myTeamLabel = match.myTeamName || defaultTeamName;
  const rivalLabel = match.opponent || 'Rival';
  const dateStr = match.date ? new Date(match.date).toLocaleDateString('es-ES') : '';
  const dateKey = match.date ? String(match.date).split('T')[0] : 'fecha';

  const effectiveTeamStats = getEffectiveTeamStats(match);
  const myStats = effectiveTeamStats.myTeam;
  const rvStats = effectiveTeamStats.rival;

  const myPoss = myStats.possession ?? 50;
  const rvPoss = rvStats.possession ?? 100 - myPoss;
  const myTotalShots = (myStats.shotsOnTarget || 0) + (myStats.shotsOffTarget || 0);
  const rvTotalShots = (rvStats.shotsOnTarget || 0) + (rvStats.shotsOffTarget || 0);

  const isLocal = match.condition !== 'Visitante';
  const myGoals = isLocal ? match.score.home : match.score.away;
  const rvGoals = isLocal ? match.score.away : match.score.home;

  // Sheet 1: Resumen & Estadísticas Colectivas
  const teamSummaryRows = [
    { Métrica: 'Fecha', [myTeamLabel]: dateStr, [rivalLabel]: match.matchType || 'Liga' },
    { Métrica: 'Condición', [myTeamLabel]: isLocal ? 'Local' : 'Visitante', [rivalLabel]: isLocal ? 'Visitante' : 'Local' },
    { Métrica: 'Resultado', [myTeamLabel]: match.matchResult || '', [rivalLabel]: `${Math.round((match.duration || 0) / 60)} min` },
    { Métrica: 'Goles', [myTeamLabel]: myGoals, [rivalLabel]: rvGoals },
    { Métrica: 'Posesión (%)', [myTeamLabel]: `${myPoss}%`, [rivalLabel]: `${rvPoss}%` },
    { Métrica: 'Tiros Totales', [myTeamLabel]: myTotalShots, [rivalLabel]: rvTotalShots },
    { Métrica: 'Tiros a Puerta', [myTeamLabel]: myStats.shotsOnTarget || 0, [rivalLabel]: rvStats.shotsOnTarget || 0 },
    { Métrica: 'Tiros Fuera', [myTeamLabel]: myStats.shotsOffTarget || 0, [rivalLabel]: rvStats.shotsOffTarget || 0 },
    { Métrica: 'Córners', [myTeamLabel]: myStats.corners || 0, [rivalLabel]: rvStats.corners || 0 },
    { Métrica: 'Faltas', [myTeamLabel]: myStats.fouls || 0, [rivalLabel]: rvStats.fouls || 0 },
    { Métrica: 'Fueras de Juego', [myTeamLabel]: myStats.offsides || 0, [rivalLabel]: rvStats.offsides || 0 },
    { Métrica: 'Tarjetas Amarillas', [myTeamLabel]: myStats.yellowCards || 0, [rivalLabel]: rvStats.yellowCards || 0 },
    { Métrica: 'Tarjetas Rojas', [myTeamLabel]: myStats.redCards || 0, [rivalLabel]: rvStats.redCards || 0 },
  ];

  // Sheet 2: Estadísticas Individuales
  const { allPlayers, statsMap } = computeSingleMatchStats(match);

  const playerRows = allPlayers.map(p => {
    const s = statsMap[p.id];
    const rosterP = rosterPlayers.find(rp => rp.id === p.id);
    const evalEntry = rosterP?.evaluations?.find(ev => ev.matchId === match.id);
    return {
      Dorsal: p.number,
      Jugador: p.name,
      Rol: s?.isStarter ? 'Titular' : 'Suplente',
      Capitán: p.isCaptain ? 'Sí' : 'No',
      Minutos: s?.minutes ?? 0,
      Goles: s?.goals ?? 0,
      Asistencias: s?.assists ?? 0,
      'Tiros a Puerta': s?.shotsOnTarget ?? 0,
      'Tiros Fuera': s?.shotsOffTarget ?? 0,
      Córners: s?.corners ?? 0,
      Faltas: s?.fouls ?? 0,
      'Fueras de Juego': s?.offsides ?? 0,
      Amarillas: s?.yellow ?? 0,
      Rojas: s?.red ?? 0,
      Nota: evalEntry ? evalEntry.rating : '-',
      Observaciones: evalEntry?.notes || '',
    };
  });

  // Sheet 3: Cronología de Eventos
  const chronologicalEvents = [...(match.events || [])].sort((a, b) => (a.time || 0) - (b.time || 0));
  const eventRows = chronologicalEvents.map(ev => {
    const mainPlayer = allPlayers.find(p => p.id === ev.playerId) || rosterPlayers.find(p => p.id === ev.playerId);
    const secondPlayer =
      allPlayers.find(p => p.id === (ev.playerInId || ev.assistId)) ||
      rosterPlayers.find(p => p.id === (ev.playerInId || ev.assistId));

    return {
      Minuto: `${Math.floor((ev.time || 0) / 60)}'`,
      Tiempo: formatEventTime(ev.time || 0),
      Acción: getEventTypeLabel(ev.type, ev.playerId),
      Jugador:
        ev.playerId === 'rival'
          ? rivalLabel
          : mainPlayer
          ? `(${mainPlayer.number}) ${mainPlayer.name}`
          : '-',
      'Asistencia / Entra': secondPlayer ? `(${secondPlayer.number}) ${secondPlayer.name}` : '-',
      Detalle: ev.notes || ev.periodLabel || '',
    };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(teamSummaryRows), 'Resumen y Equipo');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(playerRows), 'Estadisticas Jugadores');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(eventRows), 'Cronologia');

  XLSX.writeFile(workbook, `Partido_${sanitizeFilename(rivalLabel)}_${dateKey}.xlsx`);
}

export function exportSingleMatchToPDF(
  match: MatchRecord,
  rosterPlayers: Player[] = [],
  defaultTeamName = 'Nuestro Equipo'
): void {
  const doc = new jsPDF({ orientation: 'portrait' });
  const myTeamLabel = match.myTeamName || defaultTeamName;
  const rivalLabel = match.opponent || 'Rival';
  const isLocal = match.condition !== 'Visitante';
  const homeName = isLocal ? myTeamLabel : rivalLabel;
  const awayName = isLocal ? rivalLabel : myTeamLabel;
  const dateStr = match.date ? new Date(match.date).toLocaleDateString('es-ES') : '';
  const dateKey = match.date ? String(match.date).split('T')[0] : 'fecha';

  // Header Banner
  doc.setFillColor(18, 18, 21);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(255, 75, 75);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `INFORME DE PARTIDO · ${(match.matchType || 'Liga').toUpperCase()} · ${dateStr} · ${(match.condition || 'Local').toUpperCase()}`,
    14,
    12
  );

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`${homeName}   ${match.score.home} - ${match.score.away}   ${awayName}`, 14, 24);

  doc.setFontSize(10);
  doc.setTextColor(180, 180, 190);
  doc.text(
    `Resultado: ${match.matchResult || '-'}   |   Duración: ${Math.round((match.duration || 0) / 60)} min`,
    14,
    32
  );

  let currentY = 46;

  // Section 1: Estadísticas Colectivas de Equipo (reconciled with player stats)
  const effectiveTeamStats = getEffectiveTeamStats(match);
  const myStats = effectiveTeamStats.myTeam;
  const rvStats = effectiveTeamStats.rival;
  const myPoss = myStats.possession ?? 50;
  const rvPoss = rvStats.possession ?? 100 - myPoss;
  const myTotalShots = (myStats.shotsOnTarget || 0) + (myStats.shotsOffTarget || 0);
  const rvTotalShots = (rvStats.shotsOnTarget || 0) + (rvStats.shotsOffTarget || 0);

  doc.setTextColor(30, 30, 35);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Comparativa de Estadísticas de Equipo', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [[myTeamLabel, 'Métrica Colectiva', rivalLabel]],
    body: [
      [`${myPoss}%`, 'Posesión', `${rvPoss}%`],
      [String(myTotalShots), 'Tiros Totales', String(rvTotalShots)],
      [String(myStats.shotsOnTarget || 0), 'Tiros a Puerta', String(rvStats.shotsOnTarget || 0)],
      [String(myStats.shotsOffTarget || 0), 'Tiros Fuera', String(rvStats.shotsOffTarget || 0)],
      [String(myStats.corners || 0), 'Córners', String(rvStats.corners || 0)],
      [String(myStats.fouls || 0), 'Faltas', String(rvStats.fouls || 0)],
      [String(myStats.offsides || 0), 'Fueras de Juego', String(rvStats.offsides || 0)],
      [String(myStats.yellowCards || 0), 'Tarjetas Amarillas', String(rvStats.yellowCards || 0)],
      [String(myStats.redCards || 0), 'Tarjetas Rojas', String(rvStats.redCards || 0)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { textColor: [90, 90, 100] },
      2: { fontStyle: 'bold', cellWidth: 55 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Section 2: Estadísticas Individuales
  const { allPlayers, statsMap } = computeSingleMatchStats(match);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Estadísticas Individuales de los Jugadores', 14, currentY);

  const playerBody = allPlayers.map(p => {
    const s = statsMap[p.id];
    const rosterP = rosterPlayers.find(rp => rp.id === p.id);
    const evalEntry = rosterP?.evaluations?.find(ev => ev.matchId === match.id);
    return [
      p.number,
      `${p.name}${p.isCaptain ? ' (C)' : ''}`,
      s?.isStarter ? 'Titular' : 'Suplente',
      `${s?.minutes ?? 0}'`,
      s?.goals ?? 0,
      s?.assists ?? 0,
      s?.shotsOnTarget ?? 0,
      s?.shotsOffTarget ?? 0,
      s?.corners ?? 0,
      s?.fouls ?? 0,
      s?.offsides ?? 0,
      s?.yellow ?? 0,
      s?.red ?? 0,
      evalEntry ? evalEntry.rating : '-',
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Jugador', 'Rol', 'Min.', 'Gol', 'Asis', 'T.P.', 'T.F.', 'Cór.', 'Fal.', 'F.J.', 'Ama.', 'Roj.', 'Nota']],
    body: playerBody.length > 0 ? playerBody : [['-', 'Sin jugadores registrados', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center' },
    columnStyles: { 1: { halign: 'left' } },
    headStyles: { fillColor: [30, 30, 36], textColor: 255 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: Cronología de Eventos
  const chronologicalEvents = [...(match.events || [])].sort((a, b) => (a.time || 0) - (b.time || 0));
  if (chronologicalEvents.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Cronología de Eventos (Timeline)', 14, currentY);

    const timelineBody = chronologicalEvents.map(ev => {
      const mainPlayer = allPlayers.find(p => p.id === ev.playerId) || rosterPlayers.find(p => p.id === ev.playerId);
      const secondPlayer =
        allPlayers.find(p => p.id === (ev.playerInId || ev.assistId)) ||
        rosterPlayers.find(p => p.id === (ev.playerInId || ev.assistId));

      let detail = '';
      if (ev.type === 'sub') {
        detail = `Sale: ${mainPlayer ? `(${mainPlayer.number}) ${mainPlayer.name}` : '-'}  ->  Entra: ${
          secondPlayer ? `(${secondPlayer.number}) ${secondPlayer.name}` : '-'
        }`;
      } else if (ev.type === 'goal') {
        detail =
          ev.playerId === 'rival'
            ? `Gol de ${rivalLabel}`
            : `${mainPlayer ? `(${mainPlayer.number}) ${mainPlayer.name}` : '-'}${
                secondPlayer ? ` (Asist: ${secondPlayer.name})` : ''
              }`;
      } else if (ev.type === 'note' || ev.type === 'period_end') {
        detail = ev.notes || ev.periodLabel || '';
      } else {
        detail = mainPlayer ? `(${mainPlayer.number}) ${mainPlayer.name}` : '-';
      }

      return [formatEventTime(ev.time || 0), getEventTypeLabel(ev.type, ev.playerId), detail];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Tiempo', 'Acción', 'Jugador / Detalle']],
      body: timelineBody,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 45, fontStyle: 'bold' },
      },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section 4: Notas del Partido
  if (match.notes && match.notes.trim()) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Observaciones y Notas Tácticas', 14, currentY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(match.notes.trim(), 180);
    doc.text(splitNotes, 14, currentY + 6);
  }

  doc.save(`Informe_Partido_${sanitizeFilename(rivalLabel)}_${dateKey}.pdf`);
}
