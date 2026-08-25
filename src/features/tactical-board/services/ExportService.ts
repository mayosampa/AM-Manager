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
      const canvas = await html2canvas(element, { backgroundColor: '#15803d', scale: 2 });
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      const exportPromise = new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `animacion-${new Date().getTime()}.webm`;
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
        for (let i = 0; i < savedScenes.length - 1; i++) {
          const startState = savedScenes[i].state;
          const endState = savedScenes[i + 1].state;
          for (let frame = 0; frame <= framesPerScene; frame++) {
            const ease = frame / framesPerScene;
            ctx.fillStyle = '#15803d';
            ctx.fillRect(0, 0, width, height);
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
            await new Promise(r => setTimeout(r, 1000 / fps));
          }
        }
      }
      mediaRecorder.stop();
      await exportPromise;
    } catch(err) {
      console.error('Error during video export:', err);
      throw err;
    }
  }
}
