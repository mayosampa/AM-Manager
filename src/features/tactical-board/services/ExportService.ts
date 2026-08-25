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
        const { width, height } = canvas;
        const duration = 1500; // 1.5s matches CSS duration

        for (let i = 0; i < savedScenes.length - 1; i++) {
          const startState = savedScenes[i].state;
          const endState = savedScenes[i + 1].state;

          await new Promise<void>(resolve => {
            const startTime = performance.now();

            const drawFrame = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // CSS ease-in-out approximation (cubic)
              const ease = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

              ctx.drawImage(img, 0, 0); 

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

                ctx.save();
                ctx.translate(currentX, currentY);
                
                let rot = startToken.rotation || 0;
                if (endToken && endToken.rotation !== undefined) {
                  rot = rot + (endToken.rotation - rot) * ease;
                }
                ctx.rotate(rot * Math.PI / 180);

                if (startToken.type === 'ball') {
                  ctx.beginPath();
                  ctx.arc(0, 0, 12 * 2, 0, Math.PI * 2);
                  ctx.fillStyle = '#fff';
                  ctx.fill();
                  ctx.lineWidth = 2 * 2;
                  ctx.strokeStyle = '#121215';
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.arc(0, 0, 4 * 2, 0, Math.PI * 2);
                  ctx.fillStyle = '#121215';
                  ctx.fill();
                } else if (startToken.type === 'cone') {
                  ctx.beginPath();
                  ctx.moveTo(0, -16 * 2);
                  ctx.lineTo(8 * 2, 0);
                  ctx.lineTo(-8 * 2, 0);
                  ctx.closePath();
                  ctx.fillStyle = '#ef4444';
                  ctx.fill();
                } else if (startToken.type === 'pole') {
                  ctx.fillStyle = '#facc15';
                  ctx.fillRect(-3, -16 * 2, 6, 32 * 2);
                } else if (startToken.type === 'mini-goal') {
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 4 * 2;
                  ctx.strokeRect(-24 * 2, -12 * 2, 48 * 2, 24 * 2);
                } else if (startToken.type === 'ladder') {
                  ctx.strokeStyle = '#facc15';
                  ctx.lineWidth = 2 * 2;
                  ctx.strokeRect(-40 * 2, -12 * 2, 80 * 2, 24 * 2);
                  for (let j=1; j<5; j++) {
                    ctx.beginPath();
                    ctx.moveTo(-40*2 + (16*2)*j, -12*2);
                    ctx.lineTo(-40*2 + (16*2)*j, 12*2);
                    ctx.stroke();
                  }
                } else if (startToken.type === 'ring') {
                  ctx.beginPath();
                  ctx.arc(0, 0, 16 * 2, 0, Math.PI * 2);
                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 4 * 2;
                  ctx.stroke();
                } else if (startToken.type === 'hurdle') {
                  ctx.beginPath();
                  ctx.moveTo(-20*2, 8*2);
                  ctx.lineTo(-20*2, -8*2);
                  ctx.lineTo(20*2, -8*2);
                  ctx.lineTo(20*2, 8*2);
                  ctx.strokeStyle = '#f43f5e';
                  ctx.lineWidth = 4 * 2;
                  ctx.stroke();
                } else {
                  ctx.beginPath();
                  ctx.arc(0, 0, 15 * 2, 0, Math.PI * 2);
                  ctx.fillStyle = startToken.color || (startToken.team === 'home' ? '#ef4444' : '#3b82f6');
                  ctx.fill();
                  ctx.lineWidth = 2 * 2;
                  ctx.strokeStyle = '#fff';
                  ctx.stroke();
                  if (startToken.number) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(startToken.number.toString(), 0, 0);
                  }
                }
                ctx.restore();
              });

              if (progress < 1) {
                requestAnimationFrame(drawFrame);
              } else {
                resolve();
              }
            };
            requestAnimationFrame(drawFrame);
          });
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
