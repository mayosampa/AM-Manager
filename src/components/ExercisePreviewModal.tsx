import { useState, useEffect, useRef } from 'react';
import { X, Play, Square } from 'lucide-react';
import { Exercise } from '../context/SessionContext';
import { PitchLines } from './PitchLines';
import { BoardTokenItem } from './BoardTokenItem';
import { BoardState } from '../types';

interface Props {
  exercise: Exercise;
  onClose: () => void;
}

export function ExercisePreviewModal({ exercise, onClose }: Props) {
  const [boardState, setBoardState] = useState<BoardState>(exercise.scenes?.[0]?.state || exercise.boardState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pitchSize, setPitchSize] = useState({ width: '100%', height: '100%' });
  const containerRef = useRef<HTMLDivElement>(null);
  
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
        <div className="flex gap-4">
          {hasAnimation && (
            <button 
              onClick={isPlaying ? stopAnimation : playAnimation}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${isPlaying ? 'bg-[#FF4B4B] text-white hover:bg-[#E63939]' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}
            >
              {isPlaying ? (
                <><Square className="w-4 h-4 fill-current" /> Detener</>
              ) : (
                <><Play className="w-4 h-4 fill-current" /> Reproducir Animación</>
              )}
            </button>
          )}
          <button onClick={onClose} className="p-2 bg-[#1C1C1F] text-gray-400 hover:text-white rounded-lg transition-colors border border-[#2A2A2E]">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Board Container */}
      <div className="flex-1 w-full max-w-5xl flex justify-center items-center relative overflow-hidden bg-[#121215] rounded-xl border border-[#2A2A2E] p-2 md:p-4" ref={containerRef}>
        <div 
          className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/5 bg-[#15803d] shrink-0"
          style={{ width: pitchSize.width, height: pitchSize.height }}
        >
          <PitchLines />
          
          {/* Drawn Paths Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
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
          <div className="absolute inset-0 pointer-events-none">
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

    </div>
  );
}
