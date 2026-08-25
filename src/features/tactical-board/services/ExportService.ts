import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { BoardState, SavedScene } from '../../../types';

export class ExportService {
  static async exportAsImage(element: HTMLElement) {
    try {
      const dataUrl = await toPng(element, { cacheBust: true, backgroundColor: '#15803d' });
      const link = document.createElement('a');
      link.download = `pizarra-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting image', err);
    }
  }

  static async generateThumbnail(element: HTMLElement): Promise<string> {
    return await toPng(element, { cacheBust: true, backgroundColor: '#15803d' });
  }

  static async exportVideo(element: HTMLElement, savedScenes: SavedScene[]) {
    if (savedScenes.length < 2) return;
    try {
      // Temporarily hide tokens to capture a clean pitch
      const tokenElements = element.querySelectorAll('[id^="token-"]');
      tokenElements.forEach(el => (el as HTMLElement).style.display = 'none');
      
      const canvas = await html2canvas(element, { backgroundColor: '#15803d', scale: 2 });
      
      // Restore tokens
      tokenElements.forEach(el => (el as HTMLElement).style.display = '');

      canvas.style.position = 'fixed';
      canvas.style.top = '-9999px';
      canvas.style.opacity = '0';
      document.body.appendChild(canvas);

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 
                       MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      const exportPromise = new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType || 'video/mp4' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm';
          a.download = `animacion-${new Date().getTime()}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        };
      });
      mediaRecorder.start();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const fps = 30;
        const framesPerScene = fps * 1.5;
        const { width, height } = canvas;
        const baseImageData = ctx.getImageData(0, 0, width, height);
        
        for (let i = 0; i < savedScenes.length - 1; i++) {
          const startState = savedScenes[i].state;
          const endState = savedScenes[i + 1].state;
          for (let frame = 0; frame <= framesPerScene; frame++) {
            await new Promise<void>(resolve => {
              requestAnimationFrame(() => {
                const ease = frame / framesPerScene;
                ctx.putImageData(baseImageData, 0, 0);
                startState.tokens.forEach(startToken => {
                  const endToken = endState.tokens.find(t => t.id === startToken.id);
                  let currentX = (startToken.position.x / 100) * width;
                  let currentY = (startToken.position.y / 100) * height;
                  if (endToken) {
                    const endX = (endToken.position.x / 100) * width;
                    const endY = (endToken.position.y / 100) * height;
                    currentX = currentX + (endX - currentX) * ease;
                    currentY = currentY + (endY - currentY) * ease;
                  }
                  ctx.beginPath();
                  ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
                  ctx.fillStyle = startToken.color || '#fff';
                  ctx.fill();
                });
                resolve();
              });
            });
            // Force a small delay to simulate time passing for MediaRecorder
            await new Promise(r => setTimeout(r, 1000 / fps));
          }
        }
      }
      mediaRecorder.stop();
      await exportPromise;
      canvas.remove();
    } catch(err) {
      console.error('Error during video export:', err);
      throw err;
    }
  }
}
