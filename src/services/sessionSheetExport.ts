import { Player } from '../types';
import { DailyPlan, PlannedExercise } from '../components/TrainingPlanner';
import { drawUnifiedPdfHeader, resolveShieldDataUrl } from './pdfHeaderHelper';
import {
  getEffectiveSessionPhases,
  getPhaseTheme,
  renderExerciseBoardDiagramDataUrl,
  summarizeExerciseMaterial,
  summarizeSessionMaterial,
} from '../features/planner/domain/sessionPlanUtils';

export function buildAttendanceWhatsappText(params: {
  dayHeader: string;
  rosterPlayers: Player[];
  absentIds: string[];
}): string {
  const { dayHeader, rosterPlayers, absentIds } = params;
  const absentSet = new Set(absentIds || []);
  const attendees = rosterPlayers.filter(p => !absentSet.has(p.id));
  const absentees = rosterPlayers.filter(p => absentSet.has(p.id));

  const attendeesStr = attendees.length > 0 ? attendees.map(p => p.name).join(', ') : 'Ninguno';
  const absenteesStr = absentees.length > 0 ? absentees.map(p => p.name).join(', ') : 'Ninguno';

  return [
    `📅 Entrenamiento - ${dayHeader}`,
    `✅ ASISTENTES (${attendees.length}): ${attendeesStr}`,
    `❌ AUSENTES (${absentees.length}): ${absenteesStr}`,
  ].join('\n');
}

export function buildFullSessionWhatsappText(params: {
  dayHeader: string;
  teamName: string;
  dayPlan: DailyPlan;
  rosterPlayers: Player[];
}): string {
  const { dayHeader, teamName, dayPlan, rosterPlayers } = params;
  const dynamicPhases = getEffectiveSessionPhases(dayPlan);
  const exercises = dynamicPhases.flatMap(p => p.exercises);
  const totalMinutes = exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);
  const absentSet = new Set(dayPlan.absentPlayers || []);
  const attendeesCount = rosterPlayers.filter(p => !absentSet.has(p.id)).length;
  const lines: string[] = [
    `⚽ *HOJA DE SESIÓN — ${teamName.toUpperCase()}*`,
    `📅 ${dayHeader}${dayPlan.sessionTitle ? ` · ${dayPlan.sessionTitle}` : ''}`,
    `⏱️ Duración: ${totalMinutes} min | ⚡ Intensidad: ${dayPlan.intensity || 'Media'} | 👥 Efectivos: ${attendeesCount}/${rosterPlayers.length}`,
  ];
  if (dayPlan.primaryObjective) lines.push(`🎯 Obj. Principal: ${dayPlan.primaryObjective}`);
  if (dayPlan.secondaryObjective) lines.push(`🎯 Obj. Secundario: ${dayPlan.secondaryObjective}`);
  const mat = dayPlan.material || summarizeSessionMaterial(exercises);
  if (mat) lines.push(`🧰 Material: ${mat}`);

  dynamicPhases.forEach((phase, phaseIdx) => {
    const phaseEx = phase.exercises || [];
    const phaseMin = phaseEx.reduce((acc, ex) => acc + (ex.duration || 0), 0);
    lines.push('', `*🔹 Fase ${phaseIdx + 1}: ${phase.title}* (${phaseMin} min)`);
    if (phaseEx.length === 0) {
      lines.push(`   (Sin tareas asignadas)`);
      return;
    }
    phaseEx.forEach((ex, idx) => {
      const meta = [
        `${ex.duration || 0}'`,
        ex.dimensions ? `Espacio: ${ex.dimensions}` : '',
        ex.playersCount ? `Jug: ${ex.playersCount}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(`${idx + 1}. *${ex.title}* (${meta})`);
      if (ex.objective) lines.push(`   ↳ Obj: ${ex.objective}`);
      if (ex.notes) lines.push(`   ↳ ${ex.notes}`);
    });
  });

  if (dayPlan.notes) {
    lines.push('', `📝 *Observaciones:* ${dayPlan.notes}`);
  }
  return lines.join('\n');
}

export async function exportSessionSheetPDF(params: {
  dayHeader: string;
  dateKey: string;
  teamName: string;
  teamShieldUrl?: string;
  dayPlan: DailyPlan;
  rosterPlayers: Player[];
  mapCategory: (cat: string) => string;
}): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule as any).default || autoTableModule;

  const { dayHeader, dateKey, teamName, teamShieldUrl, dayPlan, rosterPlayers, mapCategory } = params;
  const dynamicPhases = getEffectiveSessionPhases(dayPlan);
  const exercises: PlannedExercise[] = dynamicPhases.flatMap(p => p.exercises);
  const absentSet = new Set(dayPlan.absentPlayers || []);
  const attendees = rosterPlayers.filter(p => !absentSet.has(p.id));
  const absentees = rosterPlayers.filter(p => absentSet.has(p.id));
  const totalMinutes = exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);
  const effectiveMaterial = (dayPlan.material || '').trim() || summarizeSessionMaterial(exercises);
  const intensity = dayPlan.intensity || 'Media';
  const sessionTitle = (dayPlan.sessionTitle || '').trim() || `Sesión de Entrenamiento · ${dayHeader}`;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const teamShield = await resolveShieldDataUrl(teamShieldUrl, teamName);

  const headerBottomY = drawUnifiedPdfHeader(doc, {
    teamName,
    teamShield,
    reportTitle: `HOJA DE SESIÓN DE ENTRENAMIENTO · ${dayHeader.toUpperCase()}`,
    subtitle: `${sessionTitle}   |   ${totalMinutes} min · ${exercises.length} tareas · Intensidad ${intensity}`,
    dateStr: dateKey,
  });

  // 1. Bloque Resumen de Objetivos, Carga, Material y Efectivos
  autoTable(doc, {
    startY: headerBottomY + 6,
    head: [['Título / Microciclo', 'Duración Total', 'Intensidad / RPE', 'Asistencia Prevista']],
    body: [[
      sessionTitle,
      `${totalMinutes} min (${exercises.length} tareas · ${dynamicPhases.length} fases)`,
      intensity,
      `${attendees.length} / ${rosterPlayers.length} jugadores (${absentees.length} bajas)`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [20, 22, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 30, 35] },
  });

  let cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : headerBottomY + 24;

  autoTable(doc, {
    startY: cursorY,
    head: [['Objetivo Principal', 'Objetivo Secundario', 'Material Total Necesario']],
    body: [[
      dayPlan.primaryObjective?.trim() || 'Consolidar principios tácticos del microciclo semanal.',
      dayPlan.secondaryObjective?.trim() || 'Activación condicional, ritmo de circulación y balón parado.',
      effectiveMaterial,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [10, 10, 12], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 30, 35] },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 62 },
      2: { cellWidth: 58 },
    },
  });

  cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : cursorY + 20;

  // 2. Resumen de Asistencia
  autoTable(doc, {
    startY: cursorY,
    head: [[`Jugadores Asistentes (${attendees.length})`, `Ausentes / Bajas (${absentees.length})`]],
    body: [[
      attendees.length > 0 ? attendees.map(p => `${p.number ? `#${p.number} ` : ''}${p.name}`).join(', ') : 'Ninguno',
      absentees.length > 0 ? absentees.map(p => `${p.number ? `#${p.number} ` : ''}${p.name}`).join(', ') : 'Sin bajas registradas',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [32, 34, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, textColor: [40, 40, 45] },
    columnStyles: {
      0: { cellWidth: 118 },
      1: { cellWidth: 64 },
    },
  });

  cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 7 : cursorY + 24;

  // 3. Desglose Estructurado Dinámico por Fases con Diagrama Táctico
  for (let pIdx = 0; pIdx < dynamicPhases.length; pIdx++) {
    const phase = dynamicPhases[pIdx];
    const phaseExercises = phase.exercises || [];
    const phaseMinutes = phaseExercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);
    const theme = getPhaseTheme(phase.colorAccent);

    if (cursorY + 32 > pageHeight - 16) {
      doc.addPage();
      cursorY = 16;
    }

    const [r, g, b] = theme.pdfColor;
    doc.setFillColor(r, g, b);
    doc.roundedRect(14, cursorY, pageWidth - 28, 7.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${phase.title.toUpperCase()}`, 17, cursorY + 5.1);
    doc.setFontSize(8.5);
    doc.text(
      `${phaseExercises.length} ${phaseExercises.length === 1 ? 'tarea' : 'tareas'} · ${phaseMinutes} min`,
      pageWidth - 17,
      cursorY + 5.1,
      { align: 'right' }
    );
    cursorY += 10;

    if (phaseExercises.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 125, 135);
      doc.text('Sin tareas asignadas en esta fase.', 17, cursorY + 3);
      cursorY += 8;
      continue;
    }

    for (let idx = 0; idx < phaseExercises.length; idx++) {
      const ex = phaseExercises[idx];
      const diagramDataUrl = renderExerciseBoardDiagramDataUrl(ex);
      const exMat = summarizeExerciseMaterial(ex);
      const descText = (ex.notes || '').trim() || 'Sin consignas adicionales registradas.';
      const objText = (ex.objective || '').trim();

      const textColWidth = diagramDataUrl ? pageWidth - 28 - 60 : pageWidth - 28 - 8;
      const wrappedDesc = doc.splitTextToSize(descText, textColWidth);
      const wrappedObj = objText ? doc.splitTextToSize(`Objetivo: ${objText}`, textColWidth) : [];
      const textLinesCount = wrappedDesc.length + wrappedObj.length;
      const minCardH = diagramDataUrl ? 40 : 24;
      const cardH = Math.max(minCardH, 18 + textLinesCount * 3.8);

      if (cursorY + cardH > pageHeight - 16) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFillColor(248, 249, 251);
      doc.setDrawColor(218, 222, 230);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, cursorY, pageWidth - 28, cardH, 2, 2, 'FD');

      let textX = 18;
      if (diagramDataUrl) {
        try {
          doc.addImage(diagramDataUrl, 'PNG', 17, cursorY + 3, 52, 34);
          textX = 73;
        } catch {
          textX = 18;
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(18, 20, 24);
      doc.text(`${idx + 1}. ${ex.title || 'Tarea de Entrenamiento'}`, textX, cursorY + 6.5);

      const pills = [
        `Categoría: ${mapCategory(ex.category || 'Otros')}`,
        `Duración: ${ex.duration || 0} min`,
        ex.dimensions ? `Espacio: ${ex.dimensions}` : '',
        ex.playersCount ? `Jugadores: ${ex.playersCount}` : '',
        ex.time ? `Hora: ${ex.time}` : '',
        exMat ? `Material: ${exMat}` : '',
      ]
        .filter(Boolean)
        .join('   |   ');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(80, 90, 105);
      const wrappedPills = doc.splitTextToSize(pills, pageWidth - 16 - textX);
      doc.text(wrappedPills, textX, cursorY + 11.2);

      let innerY = cursorY + 11.2 + wrappedPills.length * 3.5 + 1.5;

      if (wrappedObj.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(15, 118, 110);
        doc.text(wrappedObj, textX, innerY);
        innerY += wrappedObj.length * 3.7 + 1;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(45, 50, 60);
      doc.text(wrappedDesc, textX, innerY);

      cursorY += cardH + 3.5;
    }
    cursorY += 2;
  }

  // 4. Observaciones del Cuerpo Técnico
  if (dayPlan.notes && dayPlan.notes.trim()) {
    if (cursorY + 26 > pageHeight - 16) {
      doc.addPage();
      cursorY = 16;
    }
    autoTable(doc, {
      startY: cursorY + 2,
      head: [['Observaciones y Consignas Generales del Cuerpo Técnico']],
      body: [[dayPlan.notes.trim()]],
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [35, 35, 40] },
    });
  }

  doc.save(`Hoja_Sesion_${dateKey}.pdf`);
}
