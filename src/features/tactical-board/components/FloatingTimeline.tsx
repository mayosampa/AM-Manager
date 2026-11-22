import React, { useState } from 'react';
import { Plus, Video, Loader2, Trash2, Play, Pause, Film } from 'lucide-react';
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
    <div className="p-3.5 space-y-3">
      {/* Cabecera de controles de animación */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {playAnimation && (
            <button
              type="button"
              onClick={playAnimation}
              disabled={isPlaying || !canAnimate}
              className={`h-8 px-3 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
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
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Reproduciendo…' : 'Reproducir'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => saveScene(`Fotograma ${savedScenes.length + 1}`)}
            className="h-8 px-3 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            title="Capturar estado actual como nuevo fotograma"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Capturar Fotograma</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-slate-500">
            {savedScenes.length} {savedScenes.length === 1 ? 'fotograma' : 'fotogramas'}
          </span>

          {onExportVideo && (
            <button
              type="button"
              onClick={onExportVideo}
              disabled={isRecording || !canAnimate}
              className={`h-8 px-3 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                  <span className="font-mono text-emerald-700">{Math.round((videoExportProgress ?? 0) * 100)}%</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Exportar .MP4</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tira horizontal de fotogramas */}
      <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar py-1">
        {savedScenes.length === 0 ? (
          <div className="w-full py-6 px-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center gap-2.5 text-slate-500 text-xs">
            <Film className="w-4 h-4 text-[#059669] shrink-0" />
            <span>
              Coloca las fichas en su posición inicial, pulsa <strong>+ Capturar Fotograma</strong>, muévelas al siguiente paso y vuelve a capturar para animar o exportar en <strong>.MP4</strong>.
            </span>
          </div>
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
                className={`h-16 min-w-[155px] max-w-[185px] shrink-0 px-3 py-2 rounded-lg border cursor-pointer transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Paso #{index + 1}
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
    </div>
  );
}
