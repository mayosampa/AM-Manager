import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player } from '../types';
import { DailyPlan, PlannedExercise } from '../components/TrainingPlanner';

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

export function exportSessionSheetPDF(params: {
  dayHeader: string;
  dateKey: string;
  teamName: string;
  dayPlan: DailyPlan;
  rosterPlayers: Player[];
  mapCategory: (cat: string) => string;
}): void {
  const { dayHeader, dateKey, teamName, dayPlan, rosterPlayers, mapCategory } = params;
  const absentSet = new Set(dayPlan.absentPlayers || []);
  const attendees = rosterPlayers.filter(p => !absentSet.has(p.id));
  const absentees = rosterPlayers.filter(p => absentSet.has(p.id));
  const totalMinutes = (dayPlan.plannedExercises || []).reduce((acc, ex) => acc + (ex.duration || 0), 0);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(18, 18, 21);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 75, 75);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(teamName.toUpperCase(), 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`Hoja de Sesión - ${dayHeader}`, 14, 22);

  doc.setTextColor(180, 180, 188);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Duración total: ${totalMinutes} min   |   Asistentes: ${attendees.length} / ${rosterPlayers.length}   |   Ausentes: ${absentees.length}`,
    14,
    28
  );

  // Attendance Summary Table
  autoTable(doc, {
    startY: 38,
    head: [[`Asistentes (${attendees.length})`, `Ausentes (${absentees.length})`]],
    body: [[
      attendees.length > 0 ? attendees.map(p => p.name).join(', ') : 'Ninguno',
      absentees.length > 0 ? absentees.map(p => p.name).join(', ') : 'Ninguno',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [28, 28, 31], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 45] },
    columnStyles: {
      0: { cellWidth: 91 },
      1: { cellWidth: 91 },
    },
  });

  const afterAttendanceY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 72;

  // Session Structure Heading
  doc.setTextColor(20, 20, 24);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Estructura de la Sesión', 14, afterAttendanceY);

  const exercises: PlannedExercise[] = dayPlan.plannedExercises || [];
  const exerciseRows = exercises.length > 0
    ? exercises.map((ex, idx) => [
        `#${idx + 1}`,
        ex.title || 'Sin título',
        mapCategory(ex.category || 'Otros'),
        `${ex.duration || 0} min`,
        [ex.time ? `Hora: ${ex.time}` : '', ex.notes || ''].filter(Boolean).join(' — ') || '-',
      ])
    : [['-', 'Sin tareas asignadas para esta sesión', '-', '-', '-']];

  autoTable(doc, {
    startY: afterAttendanceY + 4,
    head: [['#', 'Tarea / Ejercicio', 'Categoría', 'Duración', 'Notas / Observaciones']],
    body: exerciseRows,
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 34 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 52 },
    },
  });

  doc.save(`Hoja_Sesion_${dateKey}.pdf`);
}
