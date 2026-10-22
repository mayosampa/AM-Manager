import type jsPDF from 'jspdf';
import type { Player } from '../../../types';
import type { CrestImage } from '../../../shared/services/crestImage';
import { getAvailabilityInfo, isActiveRoster } from '../domain/availability';
import { LINE_GROUPS, getPlayerLine } from '../domain/positions';
import { formatAge, formatBirthDateEsp, isValidBirthDate, NO_DATA } from '../domain/age';

export interface RosterPdfInput {
  teamName: string;
  /** Escudo ya resuelto (PNG base64) o null para pintar la inicial del equipo. */
  crest: CrestImage | null;
  players: Player[];
}

const MARGIN_X = 14;
const FOOTER_SPACE = 18;
const TOP_MARGIN = 20;
const CREST_BOX_MM = 24;
const OTHER_GROUP_LABEL = 'Otros / Sin línea';

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

const formatToday = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Dorsal ascendente; el dorsal 0 es válido y los jugadores sin dorsal van al final. */
const compareByNumber = (a: Player, b: Player): number => {
  const na = Number.isFinite(a.number) ? a.number : Number.POSITIVE_INFINITY;
  const nb = Number.isFinite(b.number) ? b.number : Number.POSITIVE_INFINITY;
  return na - nb;
};

const formatBirthCell = (birthDate?: string): string =>
  isValidBirthDate(birthDate) ? `${formatAge(birthDate)}\n${formatBirthDateEsp(birthDate)}` : NO_DATA;

function drawHeader(doc: jsPDF, input: RosterPdfInput): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  let y = 12;

  if (input.crest) {
    const scale = Math.min(CREST_BOX_MM / input.crest.width, CREST_BOX_MM / input.crest.height);
    const w = input.crest.width * scale;
    const h = input.crest.height * scale;
    doc.addImage(input.crest.dataUrl, 'PNG', centerX - w / 2, y + (CREST_BOX_MM - h) / 2, w, h);
  } else {
    doc.setFillColor(243, 244, 246);
    doc.circle(centerX, y + CREST_BOX_MM / 2, CREST_BOX_MM / 2, 'F');
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text((input.teamName?.[0] || 'C').toUpperCase(), centerX, y + CREST_BOX_MM / 2 + 2.5, { align: 'center' });
  }
  y += CREST_BOX_MM + 9;

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((input.teamName || 'CLUB DEPORTIVO').toUpperCase(), centerX, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text('PLANTILLA OFICIAL', centerX, y, { align: 'center' });
  y += 5.5;

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generado el ${formatToday()}`, centerX, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
  return y + 8;
}

function drawFooters(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Documento generado por AM-Manager', MARGIN_X, pageHeight - 8);
    doc.text(`Página ${page} de ${total}`, pageWidth - MARGIN_X, pageHeight - 8, { align: 'right' });
  }
}

/** Construye el PDF de la plantilla (solo jugadores activos, todas las líneas, saltos de página por fila). */
export function buildRosterPdf(input: RosterPdfInput, jsPDFClass?: any, autoTableFn?: any): jsPDF {
  const doc = new (jsPDFClass || (window as any).jspdf?.jsPDF || (window as any).jsPDF)('p', 'mm', 'a4');
  const pageHeight = doc.internal.pageSize.getHeight();

  const activePlayers = input.players.filter(Boolean).filter(isActiveRoster);

  // Agrupación: las 4 líneas + "Otros" para quien no tenga línea válida (nadie se omite).
  const groups: { title: string; players: Player[] }[] = LINE_GROUPS.map(line => ({
    title: line,
    players: activePlayers.filter(p => getPlayerLine(p) === line),
  }));
  groups.push({ title: OTHER_GROUP_LABEL, players: activePlayers.filter(p => getPlayerLine(p) === null) });

  let y = drawHeader(doc, input);

  for (const group of groups) {
    if (group.players.length === 0) continue;
    const sorted = [...group.players].sort(compareByNumber);
    const infos = sorted.map(getAvailabilityInfo);

    // Evita un título de grupo huérfano al final de la página.
    if (y + 40 > pageHeight - FOOTER_SPACE) {
      doc.addPage();
      y = TOP_MARGIN;
    }

    const runAutoTable = autoTableFn || (doc as any).autoTable;
    runAutoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X, top: TOP_MARGIN, bottom: FOOTER_SPACE },
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.5, lineColor: [229, 231, 235], lineWidth: 0.2, textColor: [17, 24, 39], valign: 'middle' },
      headStyles: { fillColor: [249, 250, 251], textColor: [55, 65, 81], fontStyle: 'bold' },
      head: [
        [{ content: `${group.title.toUpperCase()} (${sorted.length})`, colSpan: 5, styles: { halign: 'left', fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 11 } }],
        ['Dorsal', 'Nombre', 'Posición', 'Edad / Fecha nac.', 'Estado'],
      ],
      body: sorted.map((p, i) => [
        Number.isFinite(p.number) ? String(p.number) : NO_DATA,
        p.name || NO_DATA,
        p.position || NO_DATA,
        formatBirthCell(p.birthDate),
        infos[i].label,
      ]),
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 40 },
        4: { halign: 'center', cellWidth: 34 },
      },
      didParseCell: data => {
        if (data.section === 'head' && data.row.index === 1) {
          data.cell.styles.halign = data.column.index === 1 ? 'left' : 'center';
        }
        if (data.section === 'body' && data.column.index === 4) {
          const info = infos[data.row.index];
          if (info) {
            data.cell.styles.fillColor = hexToRgb(info.pdf.background);
            data.cell.styles.textColor = hexToRgb(info.pdf.text);
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 9;
          }
        }
      },
    });

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (lastTable?.finalY ?? y) + 8;
  }

  if (activePlayers.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text('No hay jugadores activos en la plantilla.', MARGIN_X, y);
  }

  drawFooters(doc);
  return doc;
}

/** Genera y descarga el PDF de plantilla. */
export async function downloadRosterPdf(input: RosterPdfInput): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule as any).default || autoTableModule;

  const doc = buildRosterPdf(input, jsPDF, autoTable);
  const safeName = (input.teamName || 'Equipo').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '_') || 'Equipo';
  doc.save(`Plantilla_${safeName}.pdf`);
}
