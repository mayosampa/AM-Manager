import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Square, Video, Loader2 } from 'lucide-react';
import { Exercise } from '../context/SessionContext';
import { PitchLines } from '../features/tactical-board/components/PitchLines';
import { BoardTokenItem } from '../features/tactical-board/components/BoardTokenItem';
import { BoardState, BoardToken, DrawingPath } from '../types';

interface Props {
  exercise: Exercise;
  onClose: () => void;
}

export function ExercisePreviewModal({ exercise, onClose }: Props) {
  const [boardState, setBoardState] = useState<BoardState>(exercise.scenes?.[0]?.state || exercise.boardState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [pitchSize, setPitchSize] = useState({ width: '100%', height: '100%' });
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  // Aspect ratio calculation
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const aspect = 105 / 68;
      if (width / height > aspect) {
        setPitchSize({ height: `${height}px`, width: `${height * aspect}px` });
      } else {
        setPitchSize({ width: `${width}px`, height: `${width / aspect}px` });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const hasAnimation = exercise.scenes && exercise.scenes.length > 1;

  const playAnimation = () => {
    if (!hasAnimation) return;
    setIsPlaying(true);
    let frameIdx = 0;
    
    const playNext = () => {
      if (frameIdx >= (exercise.scenes?.length || 0)) {
        setIsPlaying(false);
        return;
      }
      setBoardState(exercise.scenes![frameIdx].state);
      frameIdx++;
      setTimeout(playNext, 1500);
    };
    
    playNext();
  };

  const stopAnimation = () => {
    setIsPlaying(false);
    if (exercise.scenes && exercise.scenes.length > 0) {
      setBoardState(exercise.scenes[0].state);
    }
  };

  const getBoxSize = (type: string) => {
    switch (type) {
      case 'ladder': return { w: 40, h: 128 };
      case 'goal': return { w: 90, h: 40 };
      case 'hurdle': return { w: 48, h: 32 };
      case 'dummy': return { w: 40, h: 48 };
      case 'pole': return { w: 24, h: 48 };
      case 'pole-ground': return { w: 64, h: 16 };
      case 'cone': return { w: 32, h: 32 };
      case 'flat-cone': return { w: 32, h: 32 };
      case 'ball': return { w: 24, h: 24 };
      case 'medicine-ball': return { w: 32, h: 32 };
      case 'ring': return { w: 40, h: 40 };
      default: return { w: 32, h: 32 }; // player
    }
  };

  // Export: Pure Native SVG Serialization (No external libraries, Production-ready)
  const handleExportVideo = useCallback(async () => {
    if (!boardRef.current || !hasAnimation) return;
    const boardEl = boardRef.current;
    
    setVideoProgress(0.01);

    try {
      const W = boardEl.offsetWidth * 2;
      const H = boardEl.offsetHeight * 2;
      
      // 1. Serialize Static Background (PitchLines) natively
      const pitchSvg = Array.from(boardEl.children as HTMLCollection).find(c => c.tagName.toLowerCase() === 'svg') as SVGSVGElement;
      if (!pitchSvg) throw new Error("Pitch SVG not found");
      
      const pitchClone = pitchSvg.cloneNode(true) as SVGSVGElement;
      if (!pitchClone.getAttribute('xmlns')) pitchClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      pitchClone.setAttribute('width', W.toString());
      pitchClone.setAttribute('height', H.toString());
      
      const pitchImg = new Image();
      await new Promise<void>((resolve, reject) => {
        pitchImg.onload = () => resolve();
        pitchImg.onerror = reject;
        pitchImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(pitchClone.outerHTML);
      });

      // 2. Serialize all unique Tokens to Data URIs
      const scenes = exercise.scenes!;
      const tokenCache = new Map<string, HTMLImageElement>();
      const allTokens = new Map<string, BoardToken>();
      scenes.forEach(scene => scene.state.tokens.forEach(t => allTokens.set(t.id, t)));

      const defsEl = document.getElementById('svg-globals');
      const defsHTML = defsEl ? defsEl.innerHTML : '';

      const promises = Array.from(allTokens.values()).map(token => {
        return new Promise<void>((resolve, reject) => {
          const tokenInner = document.getElementById(`token-inner-${token.id}`);
          if (!tokenInner || !tokenInner.firstElementChild) return resolve();
          
          let svgClone: SVGSVGElement | null = null;
          
          if (tokenInner.firstElementChild.tagName.toLowerCase() === 'svg') {
            svgClone = tokenInner.firstElementChild.cloneNode(true) as SVGSVGElement;
          } else {
            // For tokens like TokenPlayer wrapped in a div
            const innerSvg = tokenInner.querySelector('svg');
            if (innerSvg) svgClone = innerSvg.cloneNode(true) as SVGSVGElement;
          }

          if (!svgClone) return resolve();
          
          if (!svgClone.getAttribute('xmlns')) {
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          }
          
          let svgText = svgClone.outerHTML;
          // Inject global defs (shadows, gradients) safely
          if (defsHTML) {
            const svgMatch = svgText.match(/<svg[^>]*>/);
            if (svgMatch) {
              svgText = svgText.replace(svgMatch[0], `${svgMatch[0]}<defs>${defsHTML}</defs>`);
            }
          }
          
          const img = new Image();
          img.onload = () => {
            tokenCache.set(token.id, img);
            resolve();
          };
          img.onerror = () => {
            console.error('Error loading token SVG', token.id);
            reject(new Error(`Falló la carga del token ${token.id}`));
          };
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
        });
      });

      // CRITICAL: Await all image preloading before starting the video loop
      await Promise.all(promises);
      setVideoProgress(0.15);

      // Stop ongoing animation
      setIsPlaying(false);
      
      const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Native Canvas loop Setup
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = W;
      recordCanvas.height = H;
      const ctx = recordCanvas.getContext('2d', { alpha: false })!;
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';

      const FPS = 30;
      const stream = recordCanvas.captureStream(FPS);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const recordingStopped = new Promise<void>((res) => { recorder.onstop = () => res(); });

      recorder.start();

      const SECONDS_PER_SCENE = 1.5;
      const framesPerScene = Math.floor(FPS * SECONDS_PER_SCENE);
      const totalFrames = (scenes.length - 1) * framesPerScene;

      // Draw Paths using native canvas primitives
      const drawPaths = (ctx: CanvasRenderingContext2D, paths: DrawingPath[] | undefined) => {
        if (!paths) return;
        for (const path of paths) {
          if (!path.points || path.points.length === 0) continue;
          
          ctx.beginPath();
          const first = path.points[0];
          ctx.moveTo((first.x / 100) * W, (first.y / 100) * H);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo((path.points[i].x / 100) * W, (path.points[i].y / 100) * H);
          }
          
          const strokePx = path.type === 'shot' ? 4 : 2.5;
          ctx.strokeStyle = path.color;
          ctx.lineWidth = strokePx;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          if (path.type === 'dribble' || path.type === 'dashed') {
            ctx.setLineDash([strokePx * 2, strokePx * 2]);
          } else if (path.type === 'run') {
            ctx.setLineDash([strokePx, strokePx * 1.5]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          if (['dribble', 'pass', 'run', 'shot', 'arrow'].includes(path.type)) {
            const p1 = path.points[path.points.length - 2] || path.points[0];
            const p2 = path.points[path.points.length - 1];
            if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
               const x1 = (p1.x / 100) * W; const y1 = (p1.y / 100) * H;
               const x2 = (p2.x / 100) * W; const y2 = (p2.y / 100) * H;
               const angle = Math.atan2(y2 - y1, x2 - x1);
               const arrowLen = strokePx * 4;
               ctx.beginPath();
               ctx.moveTo(x2, y2);
               ctx.lineTo(x2 - arrowLen * Math.cos(angle - Math.PI / 6), y2 - arrowLen * Math.sin(angle - Math.PI / 6));
               ctx.lineTo(x2 - arrowLen * Math.cos(angle + Math.PI / 6), y2 - arrowLen * Math.sin(angle + Math.PI / 6));
               ctx.fillStyle = path.color;
               ctx.fill();
            }
          }
        }
      };

      const drawToken = (token: BoardToken, pxX: number, pxY: number, rotation: number, scale: number) => {
        const img = tokenCache.get(token.id);
        if (!img) return;

        const box = getBoxSize(token.type);
        const imgW = box.w * 2;
        const imgH = box.h * 2;

        ctx.save();
        ctx.translate(pxX, pxY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        
        ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
        
        // Native rendering for player badges to avoid DOM capture issues
        if (token.playerName) {
          ctx.font = "bold 20px sans-serif";
          const name = token.playerName.split(' ')[0];
          const textY = (imgH / 2); // positioned below the circle
          
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          const metrics = ctx.measureText(name);
          const padX = 12;
          const padY = 6;
          ctx.fillRect(-metrics.width / 2 - padX/2, textY, metrics.width + padX, 20 + padY);
          
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(name, 0, textY + padY/2);
        }
        ctx.restore();
      };

      // Native render loop paced at 30fps
      for (let s = 0; s < scenes.length - 1; s++) {
        const stateA = scenes[s].state;
        const stateB = scenes[s + 1].state;

        for (let f = 0; f < framesPerScene; f++) {
          const t = f / framesPerScene;
          const progress = easeInOutQuad(t);
          
          ctx.fillStyle = '#15803d'; // Green background fallback
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(pitchImg, 0, 0, W, H);
          
          const paths = t < 0.5 ? stateA.paths : stateB.paths;
          drawPaths(ctx, paths);

          for (const tokenA of stateA.tokens) {
            const tokenB = stateB.tokens.find(tk => tk.id === tokenA.id) || tokenA;
            const x = tokenA.position.x + (tokenB.position.x - tokenA.position.x) * progress;
            const y = tokenA.position.y + (tokenB.position.y - tokenA.position.y) * progress;
            const rotA = tokenA.rotation || 0;
            const rotB = tokenB.rotation || 0;
            const rotation = rotA + (rotB - rotA) * progress;
            const scale = tokenA.scale || 1;
            
            drawToken(tokenA, (x / 100) * W, (y / 100) * H, rotation, scale);
          }

          const currentFrame = s * framesPerScene + f;
          setVideoProgress(0.15 + (currentFrame / totalFrames) * 0.85);

          await new Promise<void>(res => setTimeout(res, 1000 / FPS));
        }
      }

      // Final frame pause
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(pitchImg, 0, 0, W, H);
      drawPaths(ctx, scenes[scenes.length - 1].state.paths);
      for (const token of scenes[scenes.length - 1].state.tokens) {
        drawToken(token, (token.position.x / 100) * W, (token.position.y / 100) * H, token.rotation || 0, token.scale || 1);
      }
      setVideoProgress(1);
      await new Promise<void>(res => setTimeout(res, 500));
      
      recorder.stop();
      await recordingStopped;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exercise.title.replace(/\s+/g, '-')}-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

    } catch (err: any) {
      console.error('Error exportando vídeo:', err);
      alert(`No se pudo exportar el vídeo: ${err.message || String(err)}`);
    } finally {
      setVideoProgress(null);
    }
  }, [exercise, hasAnimation]);

  const COLORS = ['#ffffff', '#ef4444', '#fbbf24', '#3b82f6', '#10b981', '#f43f5e', '#a855f7'];

  const getPathStyles = (type: string, color: string) => {
    switch (type) {
      case 'dribble': return { strokeDasharray: '2,2', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'pass': return { strokeDasharray: '0', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'run': return { strokeDasharray: '1,1.5', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'shot': return { strokeDasharray: '0', strokeWidth: '0.6', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'dashed': return { strokeDasharray: '2,2', strokeWidth: '0.4' };
      case 'arrow': return { strokeDasharray: '0', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      default: return { strokeDasharray: '0', strokeWidth: '0.4' };
    }
  };

  const isRecording = videoProgress !== null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-4 text-white">
        <div>
          <h2 className="text-xl font-bold">{exercise.title}</h2>
          {hasAnimation && (
            <p className="text-sm text-gray-400 mt-1">Animación con {exercise.scenes?.length} fotogramas</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {hasAnimation && (
            <>
              {/* Play / Stop */}
              <button 
                onClick={isPlaying ? stopAnimation : playAnimation}
                disabled={isRecording}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-40 ${isPlaying ? 'bg-[#FF4B4B] text-white hover:bg-[#E63939]' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}
              >
                {isPlaying ? (
                  <><Square className="w-4 h-4 fill-current" /> Detener</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Reproducir</>
                )}
              </button>

              {/* Export Video */}
              <button
                onClick={handleExportVideo}
                disabled={isRecording || isPlaying}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-[#1C1C1F] border border-[#2A2A2E] text-white hover:bg-[#2A2A2E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Exportar animación a vídeo (.webm)"
              >
                {isRecording
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {Math.round((videoProgress ?? 0) * 100)}%</>
                  : <><Video className="w-4 h-4" /> Exportar</>
                }
              </button>
            </>
          )}
          <button onClick={onClose} className="p-2 bg-[#1C1C1F] text-gray-400 hover:text-white rounded-lg transition-colors border border-[#2A2A2E]">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recording progress bar */}
      {isRecording && (
        <div className="w-full max-w-5xl mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#FF4B4B] uppercase tracking-wider">Grabando animación…</span>
            <span className="text-xs text-gray-400">{Math.round((videoProgress ?? 0) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF4B4B] rounded-full transition-all duration-300"
              style={{ width: `${(videoProgress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Board Container */}
        <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-[#121215] rounded-xl border border-[#2A2A2E] p-2 md:p-4" ref={containerRef}>
          <div 
            ref={boardRef}
            className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/5 bg-[#15803d] shrink-0"
            style={{ width: pitchSize.width, height: pitchSize.height }}
          >
            <PitchLines />
            
            {/* Drawn Paths Overlay */}
            <svg id="export-paths-layer" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                {COLORS.map(c => (
                  <g key={`markers-${c}`}>
                    <marker id={`arrow-${c.replace('#', '')}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill={c} />
                    </marker>
                  </g>
                ))}
              </defs>
              {boardState.paths?.map(path => (
                <polyline
                  key={path.id}
                  points={path.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={path.color}
                  style={getPathStyles(path.type, path.color)}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            {/* Tokens */}
            <div id="export-tokens-layer" className="absolute inset-0 pointer-events-none">
              {boardState.tokens?.map(token => (
                <BoardTokenItem 
                  key={token.id} 
                  token={token} 
                  isSelected={false} 
                  isAnimating={isPlaying}
                  onPointerDown={() => {}} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Notes Sidebar */}
        {exercise.notes && (
          <div className="w-full lg:w-80 bg-[#121215] border border-[#2A2A2E] rounded-xl p-6 overflow-y-auto shrink-0 flex flex-col">
            <h4 className="text-white font-bold mb-4 text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Notas y Descripción
            </h4>
            <p className="text-sm text-[#8E8E93] leading-relaxed whitespace-pre-wrap">{exercise.notes}</p>
          </div>
        )}
      </div>

    </div>
  );
}

