import { toPng } from 'html-to-image';
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
    
    let canvas: HTMLCanvasElement | null = null;
    const tokenElements = element.querySelectorAll('[id^="token-"]');

    try {
      // Temporarily hide tokens to capture a clean pitch
      tokenElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');
      
      const dataUrl = await toPng(element, { cacheBust: true, backgroundColor: '#15803d', pixelRatio: 2 });
      
      // Restore tokens immediately
      tokenElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');

      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);

      canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.style.position = 'fixed';
      canvas.style.top = '-9999px';
      canvas.style.opacity = '0';
      document.body.appendChild(canvas);

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 
                       MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

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
        
        for (let i = 0; i < savedScenes.length - 1; i++) {
          const startState = savedScenes[i].state;
          const endState = savedScenes[i + 1].state;
          
          for (let frame = 0; frame <= framesPerScene; frame++) {
            await new Promise<void>(resolve => {
              requestAnimationFrame(() => {
                const ease = frame / framesPerScene;
                ctx.drawImage(img, 0, 0); // Draw clean pitch background
                
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
                  ctx.arc(currentX, currentY, 15 * 2 /* scale */, 0, Math.PI * 2);
                  ctx.fillStyle = startToken.color || (startToken.team === 'home' ? '#ef4444' : '#3b82f6');
                  ctx.fill();
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = '#fff';
                  ctx.stroke();
                });
                resolve();
              });
            });
            await new Promise(r => setTimeout(r, 1000 / fps));
          }
        }
      }
      mediaRecorder.stop();
      await exportPromise;
      
    } catch(err) {
      console.error('Error during video export:', err);
      // Restore tokens in case of error
      tokenElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');
      alert('Hubo un error al exportar el vídeo. Revisa la consola o asegúrate de que el navegador lo soporta.');
    } finally {
      if (canvas) canvas.remove();
    }
  }
}
