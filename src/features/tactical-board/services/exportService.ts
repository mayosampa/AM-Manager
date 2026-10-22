/**
 * exportService.ts
 *
 * Pure async service functions for exporting the tactical board.
 * Both functions use dynamic imports so they only load when called,
 * keeping the initial bundle size unchanged.
 */

import { BoardToken, SavedScene } from '../../../types';

export interface BoardPdfOptions {
  title?: string;
  category?: string;
  duration?: number;
  modality?: string;
  notes?: string;
  tokens?: BoardToken[];
}

/** Shared filter: exclude UI overlay elements from all captures */
const captureFilter = (node: Node): boolean => {
  if (node instanceof HTMLElement && node.dataset.exportExclude === 'true') {
    return false;
  }
  if (node instanceof SVGElement && node.getAttribute('data-export-exclude') === 'true') {
    return false;
  }
  return true;
};

const summarizeBoardTokens = (tokens: BoardToken[] = []): string => {
  if (!tokens || tokens.length === 0) return '';
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    if (t.type === 'text') continue;
    counts[t.type] = (counts[t.type] || 0) + 1;
  }
  const labels: Record<string, string> = {
    player: 'Jugadores',
    ball: 'Balones',
    cone: 'Conos',
    'flat-cone': 'Chinos',
    pole: 'Picas',
    'pole-ground': 'Picas suelo',
    goal: 'Porterías',
    ladder: 'Escaleras',
    ring: 'Aros',
    'hurdle-high': 'Vallas altas',
    'hurdle-low': 'Vallas bajas',
    dummy: 'Siluetas',
    'medicine-ball': 'Balones med.',
    bench: 'Bancos',
    dumbbell: 'Mancuernas',
  };
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${labels[type] || type}: ${count}`)
    .join('   •   ');
};

/**
 * Captures the tactical board DOM element as a high-resolution PNG
 * and embeds it into an A4 landscape PDF along with exercise metadata and notes.
 */
export async function exportBoardToPDF(
  boardEl: HTMLElement,
  titleOrOptions: string | BoardPdfOptions = 'Pizarra Táctica'
): Promise<void> {
  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  const opts: BoardPdfOptions =
    typeof titleOrOptions === 'string'
      ? { title: titleOrOptions }
      : titleOrOptions;

  const title = (opts.title || '').trim() || 'Pizarra Táctica';
  const notes = (opts.notes || '').trim();
  const category = (opts.category || '').trim();
  const duration = opts.duration && opts.duration > 0 ? `${opts.duration} min` : '';
  const modality = opts.modality && opts.modality !== 'Universal' ? opts.modality : (opts.modality === 'Universal' ? 'Universal' : '');
  const materialSummary = summarizeBoardTokens(opts.tokens);

  const dataUrl = await toPng(boardEl, {
    cacheBust: true,
    pixelRatio: 2,
    filter: captureFilter,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((res) => { img.onload = () => res(); });

  // A4 landscape in mm
  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 8;
  const HEADER_H = 22;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Header Banner ──
  pdf.setFillColor(18, 18, 21);
  pdf.rect(0, 0, PAGE_W, HEADER_H, 'F');
  pdf.setFillColor(255, 75, 75);
  pdf.rect(0, HEADER_H - 1.2, PAGE_W, 1.2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 75, 75);
  pdf.text('AM MANAGER • FICHA TÉCNICA DE EJERCICIO', MARGIN, 7.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, MARGIN, 16);

  // Metadata badges on the right
  const metaParts = [
    category ? `Categoría: ${category}` : '',
    duration ? `Duración: ${duration}` : '',
    modality ? `Modalidad: ${modality}` : '',
  ].filter(Boolean);

  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 188);
  pdf.text(dateStr, PAGE_W - MARGIN, 8, { align: 'right' });

  if (metaParts.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(52, 211, 153);
    pdf.text(metaParts.join('   |   '), PAGE_W - MARGIN, 15.5, { align: 'right' });
  }

  const contentTop = HEADER_H + 5;
  const contentH = PAGE_H - contentTop - MARGIN;
  const imgAspect = img.width / img.height;

  if (notes) {
    // ── Two-Column Layout: Pitch + Material on Left, Exercise Explanation Notes on Right ──
    const GAP = 6;
    const NOTES_W = 92;
    const LEFT_W = PAGE_W - MARGIN * 2 - NOTES_W - GAP; // 183 mm
    const MATERIAL_BOX_H = materialSummary ? 14 : 0;
    const PITCH_MAX_H = contentH - (MATERIAL_BOX_H > 0 ? MATERIAL_BOX_H + 4 : 0);

    let drawW: number, drawH: number;
    if (imgAspect > LEFT_W / PITCH_MAX_H) {
      drawW = LEFT_W;
      drawH = LEFT_W / imgAspect;
    } else {
      drawH = PITCH_MAX_H;
      drawW = PITCH_MAX_H * imgAspect;
    }

    const pitchX = MARGIN + (LEFT_W - drawW) / 2;
    const pitchY = contentTop + (PITCH_MAX_H - drawH) / 2;

    // Subtle border around pitch
    pdf.setDrawColor(210, 214, 220);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(pitchX - 0.8, pitchY - 0.8, drawW + 1.6, drawH + 1.6, 2, 2, 'S');
    pdf.addImage(dataUrl, 'PNG', pitchX, pitchY, drawW, drawH);

    // Material summary strip below pitch
    if (materialSummary) {
      const matY = contentTop + PITCH_MAX_H + 4;
      pdf.setFillColor(244, 245, 247);
      pdf.setDrawColor(220, 222, 228);
      pdf.roundedRect(MARGIN, matY, LEFT_W, MATERIAL_BOX_H, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(239, 68, 68);
      pdf.text('MATERIAL Y JUGADORES EN PIZARRA:', MARGIN + 4, matY + 5.2);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(45, 45, 52);
      const matLines = pdf.splitTextToSize(materialSummary, LEFT_W - 8);
      pdf.text(matLines.slice(0, 2), MARGIN + 4, matY + 10.2);
    }

    // ── Right Column: Exercise Explanation & Notes Card ──
    const notesX = MARGIN + LEFT_W + GAP;
    const notesY = contentTop;
    const notesCardH = contentH;

    const drawNotesCardShell = (topY: number, boxH: number, isContinuation = false) => {
      pdf.setFillColor(248, 249, 251);
      pdf.setDrawColor(215, 218, 225);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(notesX, topY, NOTES_W, boxH, 2.5, 2.5, 'FD');

      // Card Header
      pdf.setFillColor(28, 28, 33);
      pdf.roundedRect(notesX, topY, NOTES_W, 10, 2.5, 2.5, 'F');
      pdf.rect(notesX, topY + 5, NOTES_W, 5, 'F');

      pdf.setFillColor(255, 75, 75);
      pdf.circle(notesX + 5, topY + 5, 1.4, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(
        isContinuation ? 'EXPLICACIÓN Y NOTAS (CONT.)' : 'EXPLICACIÓN Y NOTAS DEL EJERCICIO',
        notesX + 9,
        topY + 6.2
      );
    };

    drawNotesCardShell(notesY, notesCardH, false);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.2);
    pdf.setTextColor(35, 35, 42);

    const textPadX = 4.5;
    const lineHeight = 4.6;
    const wrappedLines: string[] = pdf.splitTextToSize(notes, NOTES_W - textPadX * 2);

    let cursorY = notesY + 16;
    const maxBottomY = notesY + notesCardH - 5;

    for (let i = 0; i < wrappedLines.length; i++) {
      if (cursorY + lineHeight > maxBottomY) {
        // Add overflow page if notes are extra long
        pdf.addPage('a4', 'landscape');
        pdf.setFillColor(18, 18, 21);
        pdf.rect(0, 0, PAGE_W, 16, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${title} — Notas del Ejercicio (Continuación)`, MARGIN, 10.5);

        const fullBoxY = 22;
        const fullBoxH = PAGE_H - fullBoxY - MARGIN;
        pdf.setFillColor(248, 249, 251);
        pdf.setDrawColor(215, 218, 225);
        pdf.roundedRect(MARGIN, fullBoxY, PAGE_W - MARGIN * 2, fullBoxH, 2.5, 2.5, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(35, 35, 42);

        const remainingText = wrappedLines.slice(i).join(' ');
        const wideLines = pdf.splitTextToSize(remainingText, PAGE_W - MARGIN * 2 - 12);
        pdf.text(wideLines, MARGIN + 6, fullBoxY + 8);
        break;
      }

      const line = wrappedLines[i];
      // Highlight section headers (e.g. "OBJETIVO:", "REGLAS:", "VARIANTES:") in bold
      if (/^(•|-|\*)?\s*[A-ZÁÉÍÓÚÑ0-9\s/]{3,28}:/.test(line.trim())) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(20, 20, 25);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(45, 45, 52);
      }
      pdf.text(line, notesX + textPadX, cursorY);
      cursorY += lineHeight;
    }
  } else {
    // ── Full-Width Pitch Layout (No Notes) ──
    const availW = PAGE_W - MARGIN * 2;
    const matH = materialSummary ? 11 : 0;
    const availH = contentH - (matH > 0 ? matH + 3 : 0);

    let drawW: number, drawH: number;
    if (imgAspect > availW / availH) {
      drawW = availW;
      drawH = availW / imgAspect;
    } else {
      drawH = availH;
      drawW = availH * imgAspect;
    }

    const offsetX = MARGIN + (availW - drawW) / 2;
    const offsetY = contentTop + (availH - drawH) / 2;

    pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, drawW, drawH);

    if (materialSummary) {
      const matY = contentTop + availH + 3;
      pdf.setFillColor(244, 245, 247);
      pdf.setDrawColor(220, 222, 228);
      pdf.roundedRect(MARGIN, matY, availW, matH, 2, 2, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(60, 60, 68);
      pdf.text(`Material y Jugadores:  ${materialSummary}`, MARGIN + 4, matY + 7);
    }
  }

  const safeSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'pizarra-tactica';

  pdf.save(`${safeSlug}-${Date.now()}.pdf`);
}

/**
 * Records the board animation as a WebM video using native MediaRecorder + Canvas APIs.
 * Frames are held for `holdDurationMs` then cross-faded over `transitionDurationMs`.
 */
export async function exportAnimationToVideo(
  boardEl: HTMLElement,
  scenes: SavedScene[],
  loadSceneFn: (scene: SavedScene) => void,
  holdDurationMs = 1000,
  onProgress?: (progress: number) => void,
  onBeforeCapture?: () => Promise<void>,
  transitionMs = 500
): Promise<void> {
  if (scenes.length < 2) {
    throw new Error('Se necesitan al menos 2 fotogramas para exportar un vídeo.');
  }

  const { toPng } = await import('html-to-image');

  const W = boardEl.offsetWidth * 2;
  const H = boardEl.offsetHeight * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const recordingStopped = new Promise<void>((res) => { recorder.onstop = () => res(); });

  const loadImg = (url: string): Promise<HTMLImageElement> =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = url;
    });

  const crossFade = (imgA: HTMLImageElement, imgB: HTMLImageElement, ms: number): Promise<void> =>
    new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / ms, 1);
        ctx.globalAlpha = 1;
        ctx.drawImage(imgA, 0, 0, W, H);
        ctx.globalAlpha = t;
        ctx.drawImage(imgB, 0, 0, W, H);
        ctx.globalAlpha = 1;
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

  const hold = (img: HTMLImageElement, ms: number): Promise<void> =>
    new Promise((resolve) => {
      ctx.globalAlpha = 1;
      ctx.drawImage(img, 0, 0, W, H);
      setTimeout(resolve, ms);
    });

  recorder.start();

  const frameImgs: HTMLImageElement[] = [];

  for (let i = 0; i < scenes.length; i++) {
    loadSceneFn(scenes[i]);
    await new Promise<void>((res) => setTimeout(res, 80));

    if (onBeforeCapture) await onBeforeCapture();
    await new Promise<void>((res) => setTimeout(res, 40));

    const dataUrl = await toPng(boardEl, {
      cacheBust: true,
      pixelRatio: 2,
      filter: captureFilter,
    });
    frameImgs.push(await loadImg(dataUrl));
    onProgress?.((i + 1) / scenes.length * 0.5);
  }

  for (let i = 0; i < frameImgs.length; i++) {
    const img = frameImgs[i];
    const next = frameImgs[i + 1];

    await hold(img, holdDurationMs);

    if (next) {
      await crossFade(img, next, transitionMs);
    } else {
      await hold(img, holdDurationMs);
    }

    onProgress?.(0.5 + (i + 1) / frameImgs.length * 0.5);
  }

  recorder.stop();
  await recordingStopped;

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `animacion-tactica-${Date.now()}.webm`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
