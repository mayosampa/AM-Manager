/**
 * exportService.ts
 *
 * Pure async service functions for exporting the tactical board.
 * Both functions use dynamic imports so they only load when called,
 * keeping the initial bundle size unchanged.
 */

import { SavedScene } from '../../../types';

/** Shared filter: exclude UI overlay elements from all captures */
const captureFilter = (node: Node): boolean => {
  if (node instanceof HTMLElement && node.dataset.exportExclude === 'true') {
    return false;
  }
  return true;
};

/**
 * Captures the tactical board DOM element as a high-resolution PNG
 * and embeds it into an A4 landscape PDF.
 */
export async function exportBoardToPDF(
  boardEl: HTMLElement,
  title = 'Pizarra Táctica'
): Promise<void> {
  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

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
  const HEADER_H = 10;

  const availW = PAGE_W - MARGIN * 2;
  const availH = PAGE_H - MARGIN * 2 - HEADER_H;

  const imgAspect = img.width / img.height;
  const areaAspect = availW / availH;
  let drawW: number, drawH: number;
  if (imgAspect > areaAspect) {
    drawW = availW;
    drawH = availW / imgAspect;
  } else {
    drawH = availH;
    drawW = availH * imgAspect;
  }

  const offsetX = MARGIN + (availW - drawW) / 2;
  const offsetY = MARGIN + HEADER_H + (availH - drawH) / 2;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  pdf.setFontSize(11);
  pdf.setTextColor(40, 40, 40);
  pdf.text(title, MARGIN, MARGIN + 6);
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
    PAGE_W - MARGIN,
    MARGIN + 6,
    { align: 'right' }
  );

  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, drawW, drawH);
  pdf.save(`pizarra-tactica-${Date.now()}.pdf`);
}

/**
 * Records the board animation as a WebM video using native MediaRecorder + Canvas APIs.
 * Frames are held for `holdDurationMs` then cross-faded over `transitionDurationMs`.
 *
 * @param boardEl          - The board HTMLElement (boardRef.current)
 * @param scenes           - Ordered array of saved scenes (frames)
 * @param loadSceneFn      - Callback to set the board state to a given scene
 * @param holdDurationMs   - Time each frame is held fully visible (default 1000ms)
 * @param transitionMs     - Duration of the cross-fade between frames (default 500ms)
 * @param onProgress       - Optional callback with progress 0–1
 * @param onBeforeCapture  - Optional async callback called before each frame is captured
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

  // --- Helper: load a dataURL into an HTMLImageElement ---
  const loadImg = (url: string): Promise<HTMLImageElement> =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = url;
    });

  // --- Helper: cross-fade from imgA to imgB over `ms` ms using RAF ---
  const crossFade = (imgA: HTMLImageElement, imgB: HTMLImageElement, ms: number): Promise<void> =>
    new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / ms, 1);
        // Draw A fully, then overlay B with increasing opacity
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

  // --- Helper: hold a frame for `ms` ms ---
  const hold = (img: HTMLImageElement, ms: number): Promise<void> =>
    new Promise((resolve) => {
      ctx.globalAlpha = 1;
      ctx.drawImage(img, 0, 0, W, H);
      setTimeout(resolve, ms);
    });

  // --- Step 1: Pre-capture all frames as images ---
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
    onProgress?.((i + 1) / scenes.length * 0.5); // first 50% = capture phase
  }

  // --- Step 2: Render frames to canvas with cross-fade ---
  for (let i = 0; i < frameImgs.length; i++) {
    const img = frameImgs[i];
    const next = frameImgs[i + 1];

    // Hold the current frame
    await hold(img, holdDurationMs);

    // Cross-fade to next if available
    if (next) {
      await crossFade(img, next, transitionMs);
    } else {
      // Last frame: hold a bit longer then end
      await hold(img, holdDurationMs);
    }

    onProgress?.(0.5 + (i + 1) / frameImgs.length * 0.5); // second 50% = render phase
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
