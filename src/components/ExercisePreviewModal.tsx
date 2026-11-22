import { useState, useRef, useCallback } from 'react';
import { X, Play, Square, Video, Loader2, FileDown } from 'lucide-react';
import { Exercise } from '../context/SessionContext';
import { PitchLines } from '../features/tactical-board/components/PitchLines';
import { BoardTokenItem } from '../features/tactical-board/components/BoardTokenItem';
import { usePitchAspectRatioSize } from '../features/tactical-board/controllers/useElementSize';
import { exportBoardToPDF } from '../features/tactical-board/services/exportService';
import { BoardState } from '../types';

interface Props {
  exercise: Exercise;
  onClose: () => void;
}

export function ExercisePreviewModal({ exercise, onClose }: Props) {
  const [boardState, setBoardState] = useState<BoardState>(exercise.scenes?.[0]?.state || exercise.boardState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const pitchSize = usePitchAspectRatioSize(containerRef, 1, false);

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

  const handleExportPDF = useCallback(async () => {
    if (!boardRef.current) return;
    setIsPdfLoading(true);
    try {
      await exportBoardToPDF(boardRef.current, {
        title: exercise.title || 'Pizarra Táctica',
        category: exercise.category || (exercise as any).state?.laneOverlay,
        duration: exercise.duration,
        modality: exercise.modality,
        notes: exercise.notes,
        tokens: boardState?.tokens || [],
      });
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setIsPdfLoading(false);
    }
  }, [exercise, boardState?.tokens]);

  const handleExportVideo = useCallback(async () => {
    if (!hasAnimation) return;
    setVideoProgress(0.01);

    try {
      const { exportTacticalVideo } = await import('../services/tacticalVideoExport');
      await exportTacticalVideo(
        {
          title: exercise.title || 'Ejercicio',
          category: exercise.category || (exercise as any).state?.laneOverlay || 'Táctica',
          modality: exercise.modality || 'Universal',
          scenes: exercise.scenes || [],
        },
        (progressPercent) => {
          setVideoProgress(progressPercent / 100);
        }
      );
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
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-[100] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden p-4 sm:p-6">
        {/* Header */}
        <div className="w-full flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-200 text-slate-900 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{exercise.title}</h2>
            {hasAnimation && (
              <p className="text-sm text-slate-500 mt-1">Animación con {exercise.scenes?.length} fotogramas</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Export PDF with Notes */}
            <button
              onClick={handleExportPDF}
              disabled={isPdfLoading || isRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40 cursor-pointer"
              title="Descargar PDF de la pizarra con notas del ejercicio"
            >
              {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>{isPdfLoading ? 'Generando PDF…' : 'Descargar PDF'}</span>
            </button>

            {hasAnimation && (
              <>
                <button 
                  onClick={isPlaying ? stopAnimation : playAnimation}
                  disabled={isRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-40 cursor-pointer ${isPlaying ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-[#059669] text-white hover:bg-[#047857]'}`}
                >
                  {isPlaying ? (
                    <><Square className="w-4 h-4 fill-current" /> Detener</>
                  ) : (
                    <><Play className="w-4 h-4 fill-current" /> Reproducir</>
                  )}
                </button>

                <button
                  onClick={handleExportVideo}
                  disabled={isRecording || isPlaying}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Exportar animación a vídeo (.webm)"
                >
                  {isRecording
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {Math.round((videoProgress ?? 0) * 100)}%</>
                    : <><Video className="w-4 h-4 text-[#059669]" /> Vídeo</>
                  }
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recording progress bar */}
        {isRecording && (
          <div className="w-full mb-3 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Grabando animación…</span>
              <span className="text-xs text-slate-500 font-mono">{Math.round((videoProgress ?? 0) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#059669] rounded-full transition-all duration-300"
                style={{ width: `${(videoProgress ?? 0) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="w-full flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Board Container (césped verde intacto) */}
          <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-slate-100 rounded-md border border-slate-200 p-2 md:p-4" ref={containerRef}>
            <div 
              ref={boardRef}
              className="relative rounded-md overflow-hidden border-2 border-slate-300/60 bg-[#15803d] shrink-0 shadow-sm"
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
            <div className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-md p-6 overflow-y-auto shrink-0 flex flex-col">
              <h4 className="text-slate-900 font-bold mb-4 text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#059669]" />
                Notas y Explicación
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{exercise.notes}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
