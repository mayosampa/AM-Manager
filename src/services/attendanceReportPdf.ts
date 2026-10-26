import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Player } from '../types';
import { TeamSettings } from '../context/TeamContext';
import { DailyPlan } from '../components/TrainingPlanner';
import { isActiveRoster } from '../features/squad/domain/availability';
import { drawUnifiedPdfHeader, resolveShieldDataUrl } from './pdfHeaderHelper';

export type AttendanceReportMode = 'weekly' | 'monthly' | 'general';

export interface PlayerSessionStatus {
  dateString: string;
  formattedDate: string; // e.g. "12/10"
  dayOfWeek: string;     // e.g. "Lun"
  status: 'present' | 'absent';
}

export interface PlayerAttendanceRecord {
  player: Player;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  sessionDatesDetail: PlayerSessionStatus[];
}

export interface EvaluatedSessionDate {
  dateString: string;
  formattedDate: string;
  dayOfWeek: string;
  dayNumber: string;
}

export interface AttendanceReportData {
  mode: AttendanceReportMode;
  dateRangeLabel: string;
  referenceDate: Date;
  totalEvaluatedSessions: number;
  evaluatedDates: EvaluatedSessionDate[];
  playerRecords: PlayerAttendanceRecord[];
  averageAttendancePercentage: number;
  perfectAttendanceCount: number;
}

/**
 * Calculates training attendance stats for all active roster players over weekly, monthly or season range.
 */
export function calculateAttendanceReport(
  players: Player[],
  seasonPlan: Record<string, DailyPlan>,
  mode: AttendanceReportMode,
  referenceDate: Date,
  teamId?: string
): AttendanceReportData {
  const activePlayers = (players || []).filter(isActiveRoster);

  // 1. Determine date filter interval
  let startInterval: Date | null = null;
  let endInterval: Date | null = null;
  let dateRangeLabel = '';

  if (mode === 'weekly') {
    startInterval = startOfWeek(referenceDate, { weekStartsOn: 1 });
    endInterval = endOfWeek(referenceDate, { weekStartsOn: 1 });
    dateRangeLabel = `Semana del ${format(startInterval, "d 'de' MMMM", { locale: es })} al ${format(endInterval, "d 'de' MMMM yyyy", { locale: es })}`;
  } else if (mode === 'monthly') {
    startInterval = startOfMonth(referenceDate);
    endInterval = endOfMonth(referenceDate);
    dateRangeLabel = format(referenceDate, "MMMM 'de' yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase());
  } else {
    dateRangeLabel = 'Temporada Completa (Historial General)';
  }

  // 2. Scan seasonPlan to find valid training sessions
  const planEntries = Object.entries(seasonPlan || {});
  const evaluatedDatesMap = new Map<string, DailyPlan>();

  for (const [dateKey, dayPlan] of planEntries) {
    if (!dayPlan) continue;
    // Must belong to this team if teamId is bound
    if (teamId && dayPlan.teamId && dayPlan.teamId !== teamId) continue;

    // Discard match days and rest days
    if (dayPlan.isMatchDay || dayPlan.type === 'match') continue;
    if (dayPlan.isRestDay || dayPlan.type === 'rest') continue;

    // Must be training session or have exercises/attendance registered
    const isTraining = dayPlan.type === 'training' ||
      (Array.isArray(dayPlan.plannedExercises) && dayPlan.plannedExercises.length > 0) ||
      (Array.isArray(dayPlan.attendedPlayers) && dayPlan.attendedPlayers.length > 0) ||
      (Array.isArray(dayPlan.absentPlayers) && dayPlan.absentPlayers.length > 0);

    if (!isTraining) continue;

    // Check interval bounds
    let parsed: Date;
    try {
      parsed = parseISO(dateKey);
      if (isNaN(parsed.getTime())) continue;
    } catch {
      continue;
    }

    if (startInterval && endInterval) {
      if (!isWithinInterval(parsed, { start: startInterval, end: endInterval })) {
        continue;
      }
    }

    evaluatedDatesMap.set(dateKey, dayPlan);
  }

  // Sort dates chronologically
  const sortedDateKeys = Array.from(evaluatedDatesMap.keys()).sort((a, b) => a.localeCompare(b));

  const evaluatedDates: EvaluatedSessionDate[] = sortedDateKeys.map(dateKey => {
    const d = parseISO(dateKey);
    return {
      dateString: dateKey,
      formattedDate: format(d, 'd/MM', { locale: es }),
      dayOfWeek: format(d, 'EEE', { locale: es }).replace('.', '').toUpperCase(),
      dayNumber: format(d, 'd', { locale: es }),
    };
  });

  const totalEvaluatedSessions = evaluatedDates.length;

  // 3. Compute stats for each player
  const playerRecords: PlayerAttendanceRecord[] = activePlayers.map(player => {
    let presentCount = 0;
    let absentCount = 0;
    const sessionDatesDetail: PlayerSessionStatus[] = [];

    for (const sessionDate of evaluatedDates) {
      const dayPlan = evaluatedDatesMap.get(sessionDate.dateString)!;
      let isPresent = true;

      if (Array.isArray(dayPlan.attendedPlayers)) {
        isPresent = dayPlan.attendedPlayers.includes(player.id);
      } else if (Array.isArray(dayPlan.absentPlayers)) {
        isPresent = !dayPlan.absentPlayers.includes(player.id);
      }

      if (isPresent) {
        presentCount++;
      } else {
        absentCount++;
      }

      sessionDatesDetail.push({
        dateString: sessionDate.dateString,
        formattedDate: sessionDate.formattedDate,
        dayOfWeek: sessionDate.dayOfWeek,
        status: isPresent ? 'present' : 'absent',
      });
    }

    const attendancePercentage = totalEvaluatedSessions > 0
      ? Math.round((presentCount / totalEvaluatedSessions) * 100)
      : 100;

    return {
      player,
      totalSessions: totalEvaluatedSessions,
      presentCount,
      absentCount,
      attendancePercentage,
      sessionDatesDetail,
    };
  });

  // Sort players by attendance percentage descending, then by number/name
  playerRecords.sort((a, b) => {
    if (b.attendancePercentage !== a.attendancePercentage) {
      return b.attendancePercentage - a.attendancePercentage;
    }
    const numA = parseInt(String(a.player.number || '999'), 10);
    const numB = parseInt(String(b.player.number || '999'), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    return a.player.name.localeCompare(b.player.name);
  });

  // 4. Overall KPIs
  const totalPercentages = playerRecords.reduce((acc, p) => acc + p.attendancePercentage, 0);
  const averageAttendancePercentage = playerRecords.length > 0
    ? Math.round(totalPercentages / playerRecords.length)
    : 0;

  const perfectAttendanceCount = playerRecords.filter(p => p.attendancePercentage === 100 && totalEvaluatedSessions > 0).length;

  return {
    mode,
    dateRangeLabel,
    referenceDate,
    totalEvaluatedSessions,
    evaluatedDates,
    playerRecords,
    averageAttendancePercentage,
    perfectAttendanceCount,
  };
}

/**
 * Loads image as data URL for jsPDF insertion.
 */
async function loadImgDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:image')) return src;
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generates an official A4 Landscape attendance report in PDF format using jsPDF and autoTable.
 */
export async function exportAttendanceReportPdf(
  reportData: AttendanceReportData,
  activeTeamName: string,
  teamSettings?: TeamSettings
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const PAGE_WIDTH = 297;
  const PAGE_HEIGHT = 210;
  const MARGIN = 10;

  // ── Full Page Dark Canvas Background ──
  doc.setFillColor(10, 10, 12);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  const modeTitle = reportData.mode === 'weekly' ? 'SEMANAL' : reportData.mode === 'monthly' ? 'MENSUAL' : 'GENERAL DE TEMPORADA';
  const nowStr = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });
  const teamShield = await resolveShieldDataUrl(teamSettings?.crestUrl, activeTeamName);

  const headerBottomY = drawUnifiedPdfHeader(doc, {
    teamName: activeTeamName,
    teamShield,
    reportTitle: `INFORME DE ASISTENCIA — ${modeTitle}`,
    subtitle: `Periodo: ${reportData.dateRangeLabel}   |   Sesiones: ${reportData.totalEvaluatedSessions}   |   Asistencia Media: ${reportData.averageAttendancePercentage}%   |   Plenos (100%): ${reportData.perfectAttendanceCount}`,
    dateStr: `Emitido el ${nowStr}`,
  });

  // ── Table Column Construction ──
  // Base columns
  const tableHeaders: string[] = ['Dorsal', 'Jugador', 'Posición', 'Asistencias', 'Faltas', '% Asist.'];

  // If sessions <= 14, include individual session day columns for detailed tracking
  const includeDateCols = reportData.evaluatedDates.length > 0 && reportData.evaluatedDates.length <= 14;
  if (includeDateCols) {
    for (const d of reportData.evaluatedDates) {
      tableHeaders.push(`${d.dayOfWeek} ${d.dayNumber}`);
    }
  }

  // Build Table Rows
  const tableRows = reportData.playerRecords.map(rec => {
    const row: any[] = [
      rec.player.number !== undefined ? `#${rec.player.number}` : '-',
      rec.player.name,
      rec.player.position || 'Jugador',
      `${rec.presentCount} / ${rec.totalSessions}`,
      String(rec.absentCount),
      `${rec.attendancePercentage}%`,
    ];

    if (includeDateCols) {
      for (const d of reportData.evaluatedDates) {
        const sessionDetail = rec.sessionDatesDetail.find(s => s.dateString === d.dateString);
        row.push(sessionDetail?.status === 'present' ? 'SÍ' : 'NO');
      }
    }

    return row;
  });

  // Render Table via autoTable
  autoTable(doc, {
    startY: headerBottomY + 5,
    margin: { left: MARGIN, right: MARGIN, bottom: 12 },
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [240, 240, 245],
      lineColor: [40, 40, 48],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [24, 24, 28],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [50, 50, 60],
      lineWidth: 0.3,
      halign: 'center',
    },
    bodyStyles: {
      fillColor: [22, 22, 26],
      textColor: [240, 240, 245],
    },
    alternateRowStyles: {
      fillColor: [14, 14, 17],
      textColor: [240, 240, 245],
    },
    willDrawPage: (data) => {
      // Paint full dark background on subsequent pages and repeat compact header
      if (data.pageNumber > 1) {
        doc.setFillColor(10, 10, 12);
        doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

        doc.setFillColor(18, 18, 21);
        doc.rect(0, 0, PAGE_WIDTH, 14, 'F');

        doc.setFillColor(239, 68, 68);
        doc.rect(0, 13.2, PAGE_WIDTH, 0.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(240, 240, 245);
        doc.text(`CONTROL DE ASISTENCIA — ${activeTeamName} (${reportData.dateRangeLabel})`, MARGIN, 9);
      }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color-code attendance percentage (column index 5)
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw || '');
        const val = parseInt(text.replace('%', ''), 10);
        if (!isNaN(val)) {
          if (val >= 80) {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald
          } else if (val >= 50) {
            data.cell.styles.textColor = [245, 158, 11]; // Amber
          } else {
            data.cell.styles.textColor = [239, 68, 68]; // Red
          }
        }
      }
      // Color-code session attendance (SÍ / NO)
      if (data.section === 'body' && includeDateCols && data.column.index >= 6) {
        data.cell.styles.halign = 'center';
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 8.5;
        if (data.cell.raw === 'SÍ' || data.cell.raw === 'SI') {
          data.cell.styles.textColor = [52, 211, 153]; // Neon emerald
        } else if (data.cell.raw === 'NO') {
          data.cell.styles.textColor = [239, 68, 68]; // Red
        }
      }
    },
    didDrawPage: () => {
      // Page Footer
      const totalPages = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 130);
      doc.text('Documento oficial emitido por AM Manager • Sistema de Gestión Técnica de Alto Rendimiento', MARGIN, PAGE_HEIGHT - 6);
      doc.text(`Página ${currentPage} de ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 6, { align: 'right' });
    },
  });

  // Save the PDF file
  const cleanMode = reportData.mode;
  const dateSlug = format(reportData.referenceDate, 'yyyy-MM-dd');
  doc.save(`informe-asistencia-${cleanMode}-${dateSlug}.pdf`);
}

/**
 * Generates an official Excel (.xlsx) attendance report.
 */
export async function exportAttendanceReportExcel(
  reportData: AttendanceReportData,
  activeTeamName: string
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows = reportData.playerRecords.map(rec => {
    const rowObj: Record<string, string | number> = {
      'Dorsal': rec.player.number !== undefined ? rec.player.number : '-',
      'Jugador': rec.player.name,
      'Posición': rec.player.position || 'Jugador',
      'Asistencias': rec.presentCount,
      'Sesiones Totales': rec.totalSessions,
      'Faltas': rec.absentCount,
      '% Asistencia': `${rec.attendancePercentage}%`,
    };

    for (const d of reportData.evaluatedDates) {
      const sessionDetail = rec.sessionDatesDetail.find(s => s.dateString === d.dateString);
      const colName = `${d.dayOfWeek} ${d.dayNumber}`;
      rowObj[colName] = sessionDetail?.status === 'present' ? 'SÍ' : 'NO';
    }

    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Control Asistencia');

  const cleanMode = reportData.mode;
  const dateSlug = format(reportData.referenceDate, 'yyyy-MM-dd');
  XLSX.writeFile(workbook, `informe-asistencia-${cleanMode}-${dateSlug}.xlsx`);
}
