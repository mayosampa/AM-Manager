import React, { useState } from 'react';
import { Plus, Video, Loader2, Trash2, Play, Pause } from 'lucide-react';
import { SavedScene } from '../../../types';

interface Props {
  savedScenes: SavedScene[];
  saveScene: (title: string) => void;
  loadScene: (sceneOrId: SavedScene | string) => void;
  deleteScene?: (id: string) => void;
  playAnimation?: () => void;
  isPlaying?: boolean;
  onExportVideo?: () => Promise<void>;
  videoExportProgress?: number | null; // 0–1 while recording, null when idle
}

export function FloatingTimeline({
  savedScenes,
  saveScene,
  loadScene,
  deleteScene,
  playAnimation,
  isPlaying,
  onExportVideo,
  videoExportProgress,
}: Props) {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const isRecording = videoExportProgress !== null && videoExportProgress !== undefined;
  const canAnimate = savedScenes.length >= 2;

  return (
    <div className="h-20 shrink-0 w-full bg-white border-t border-slate-200 px-3 flex items-center gap-3 z-20">
      {/* Izquierda: Play/Pause + + Fotograma */}
      <div className="shrink-0 flex items-center gap-2 pr-3 border-r border-slate-200">
        {playAnimation && (
          <button
            type="button"
            onClick={playAnimation}
            disabled={isPlaying || !canAnimate}
            className={`h-9 w-9 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
              canAnimate && !isPlaying
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={
              !canAnimate
                ? 'Necesitas al menos 2 fotogramas para reproducir'
                : isPlaying
                ? 'Reproduciendo animación…'
                : 'Reproducir animación'
            }
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => saveScene(`Fotograma ${savedScenes.length + 1}`)}
          className="h-9 px-3 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Capturar estado actual como nuevo fotograma"
        >
          <Plus className="w-4 h-4" />
          <span>+ Fotograma</span>
        </button>
      </div>

      {/* Centro: Tira horizontal con scroll suave */}
      <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar flex items-center gap-2 py-1">
        {savedScenes.length === 0 ? (
          <span className="text-xs text-slate-400 truncate">
            Captura al menos 2 fotogramas para animar la jugada y exportarla en vídeo .MP4.
          </span>
        ) : (
          savedScenes.map((scene, index) => {
            const isSelected = activeSceneId === scene.id;
            return (
              <div
                key={scene.id}
                onClick={() => {
                  setActiveSceneId(scene.id);
                  loadScene(scene);
                }}
                className={`h-14 min-w-[140px] max-w-[175px] shrink-0 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors flex flex-col justify-between group ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Fotograma {index + 1}
                  </span>
                  {deleteScene && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fallbackScene = savedScenes[index - 1] || savedScenes[index + 1] || null;
                        if (activeSceneId === scene.id || activeSceneId === null) {
                          setActiveSceneId(fallbackScene ? fallbackScene.id : null);
                          if (fallbackScene) loadScene(fallbackScene);
                        }
                        deleteScene(scene.id);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar fotograma"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{scene.title}</p>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${isSelected ? 'bg-[#059669]' : 'bg-slate-400'}`} style={{ width: '100%' }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Derecha: Exportar .MP4 */}
      {onExportVideo && (
        <div className="shrink-0 flex items-center gap-2 pl-3 border-l border-slate-200">
          <button
            type="button"
            onClick={onExportVideo}
            disabled={isRecording || !canAnimate}
            className={`h-9 px-3 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
              isRecording || !canAnimate
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs cursor-pointer'
            }`}
            title={
              !canAnimate
                ? 'Necesitas al menos 2 fotogramas para exportar .MP4'
                : 'Exportar animación a vídeo (.mp4)'
            }
          >
            {isRecording ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                <span className="font-mono text-emerald-700">{Math.round((videoExportProgress ?? 0) * 100)}%</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4 text-[#059669]" />
                <span>Exportar .MP4</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
