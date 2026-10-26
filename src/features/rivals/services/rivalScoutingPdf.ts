import { RivalTeam } from '../../../types';
import { RivalHeadToHeadSummary } from './rivalsService';
import { drawUnifiedPdfHeader, resolveShieldDataUrl } from '../../../services/pdfHeaderHelper';

export function buildRivalScoutingWhatsappText(
  rival: RivalTeam,
  teamName: string,
  h2h?: RivalHeadToHeadSummary
): string {
  const s = rival.scouting;
  const lines: string[] = [
    `🔍 *INFORME DE SCOUTING — vs ${rival.name.toUpperCase()}*`,
    `🛡️ Club Analizador: ${teamName}`,
  ];

  if (rival.stadium || rival.pitchInfo) {
    lines.push(
      `🏟️ Campo: ${rival.stadium || 'Por definir'}${rival.pitchInfo ? ` (${rival.pitchInfo})` : ''}`
    );
  }

  if (h2h && h2h.played > 0) {
    lines.push(
      `📊 Historial (${h2h.played} PJ): ${h2h.wins}V - ${h2h.draws}E - ${h2h.losses}D (${h2h.goalsFor} GF / ${h2h.goalsAgainst} GC)`
    );
  }

  lines.push(
    '',
    `⚙️ *ESTRUCTURA Y ESTILO*`,
    `• Sistema Base: ${s.baseFormation || '1-4-4-2'}${s.defensiveFormation ? ` (Def: ${s.defensiveFormation})` : ''}`,
    `• Estilo de Juego: ${s.playingStyle || 'No especificado'}`,
    `• Bloque Defensivo: ${s.defensivePhase?.blockHeight || 'Bloque Medio'}`
  );

  lines.push(
    '',
    `⚔️ *4 FASES DEL JUEGO*`,
    `• Salida de Balón: ${s.attackPhase?.buildUp || '-'}`,
    `• Progresión y Finalización: ${s.attackPhase?.progressionAndFinish || '-'}`,
    `• Debilidades a Explotar: ${s.defensivePhase?.weaknessesToExploit || '-'}`,
    `• Transición Ofensiva (Rival): ${s.transitions?.offensiveTransition || '-'}`,
    `• Transición Defensiva (Tras pérdida): ${s.transitions?.defensiveTransition || '-'}`
  );

  if (s.setPieces?.attackingCornersAndFreeKicks || s.setPieces?.defendingCornersAndFreeKicks) {
    lines.push(
      '',
      `🎯 *BALÓN PARADO (ABP)*`,
      `• ABP a Favor (Rival): ${s.setPieces?.attackingCornersAndFreeKicks || '-'}`,
      `• ABP en Contra (Rival): ${s.setPieces?.defendingCornersAndFreeKicks || '-'}`
    );
  }

  if (s.keyPlayers && s.keyPlayers.length > 0) {
    lines.push('', `⚠️ *JUGADORES CLAVE*`);
    for (const kp of s.keyPlayers) {
      const icon = kp.threatLevel === 'Alta' ? '🔴' : kp.threatLevel === 'Media' ? '🟡' : '🟢';
      lines.push(
        `${icon} #${kp.number || '?'} ${kp.name} (${kp.position || '-'}, ${kp.foot || 'Diestro'}) — ${kp.notes || 'Sin observaciones'}`
      );
    }
  }

  if (s.generalPlanAndKeys) {
    lines.push('', `🗝️ *CLAVES DEL PARTIDO*`, s.generalPlanAndKeys);
  }

  if (s.freeNotes) {
    lines.push('', `📝 *NOTAS Y OBSERVACIONES*`, s.freeNotes);
  }

  return lines.join('\n');
}

export async function exportRivalScoutingPDF(
  rival: RivalTeam,
  teamName: string,
  h2h?: RivalHeadToHeadSummary
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule as any).default || autoTableModule;

  const s = rival.scouting;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const stadiumStr = `Estadio: ${rival.stadium || 'No especificado'}${rival.pitchInfo ? ` (${rival.pitchInfo})` : ''}`;
  const updatedDate = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
  const teamShield = await resolveShieldDataUrl(undefined, teamName);

  const headerBottomY = drawUnifiedPdfHeader(doc, {
    teamName,
    teamShield,
    reportTitle: `DOSSIER DE SCOUTING · RIVAL: ${rival.name.toUpperCase()}`,
    subtitle: `${stadiumStr}   |   Sistema Base: ${s.baseFormation || '1-4-4-2'}`,
    dateStr: `Actualizado: ${updatedDate}`,
  });

  // 1. Sistemas, Estilo e Historial
  const h2hText = h2h && h2h.played > 0
    ? `${h2h.played} PJ (${h2h.wins}V - ${h2h.draws}E - ${h2h.losses}D | ${h2h.goalsFor} GF / ${h2h.goalsAgainst} GC)`
    : 'Sin enfrentamientos previos registrados';

  autoTable(doc, {
    startY: headerBottomY + 8,
    head: [['Sistema Base', 'Sistema Defensivo', 'Estilo de Juego', 'Altura de Bloque', 'Historial Directo']],
    body: [[
      s.baseFormation || '1-4-4-2',
      s.defensiveFormation || s.baseFormation || '1-4-4-2',
      s.playingStyle || 'Combinativo',
      s.defensivePhase?.blockHeight || 'Bloque Medio',
      h2hText,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [28, 28, 31], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 3 },
  });

  let nextY = ((doc as any).lastAutoTable?.finalY || 58) + 6;

  // 2. Las 4 Fases del Juego y ABP
  autoTable(doc, {
    startY: nextY,
    head: [['Fase Táctica', 'Análisis y Comportamiento del Rival']],
    body: [
      ['Ataque — Salida de Balón', s.attackPhase?.buildUp || 'Sin especificar'],
      ['Ataque — Progresión y Finalización', s.attackPhase?.progressionAndFinish || 'Sin especificar'],
      ['Defensa — Debilidades a Explotar', s.defensivePhase?.weaknessesToExploit || 'Sin especificar'],
      ['Transición Ofensiva (Contraataque)', s.transitions?.offensiveTransition || 'Sin especificar'],
      ['Transición Defensiva (Tras Pérdida)', s.transitions?.defensiveTransition || 'Sin especificar'],
      ['ABP Ofensivo (Córners / Faltas a favor)', s.setPieces?.attackingCornersAndFreeKicks || 'Sin especificar'],
      ['ABP Defensivo (Córners / Faltas en contra)', s.setPieces?.defendingCornersAndFreeKicks || 'Sin especificar'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: 'bold' },
      1: { cellWidth: 120 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY || 130) + 6;

  // 3. Jugadores Clave
  const keyPlayerRows = (s.keyPlayers || []).length > 0
    ? s.keyPlayers.map(kp => [
        kp.number || '-',
        kp.name || '-',
        kp.position || '-',
        kp.foot || 'Diestro',
        kp.threatLevel || 'Media',
        kp.notes || '-',
      ])
    : [['-', 'Sin jugadores clave destacados', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: nextY,
    head: [['Dorsal', 'Jugador Clave', 'Posición', 'Perfil', 'Amenaza', 'Características / Cómo defenderle']],
    body: keyPlayerRows,
    theme: 'grid',
    headStyles: { fillColor: [28, 28, 31], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 61 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY || 180) + 6;

  // 4. Plan de Partido & Notas Libres
  const notesLogStr = (s.notesLog || [])
    .map(n => `[${n.date}] ${n.text}`)
    .join('\n');
  const combinedFreeNotes = [s.freeNotes || '', notesLogStr].filter(Boolean).join('\n\n') || 'Sin notas adicionales';

  autoTable(doc, {
    startY: nextY,
    head: [['Claves del Partido (Plan Propio)', 'Cuaderno de Notas Libres y Bitácora']],
    body: [[
      s.generalPlanAndKeys || 'Sin claves definidas',
      combinedFreeNotes,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 91 },
      1: { cellWidth: 91 },
    },
  });

  const safeName = rival.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Scouting_${safeName}.pdf`);
}
