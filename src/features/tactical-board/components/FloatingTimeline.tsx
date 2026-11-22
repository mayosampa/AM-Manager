import React, { useState } from 'react';
import { Settings, Plus, ChevronRight, ChevronLeft, Video, Loader2, Trash2, Play } from 'lucide-react';
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

export function FloatingTimeline({ savedScenes, saveScene, loadScene, deleteScene, playAnimation, isPlaying, onExportVideo, videoExportProgress }: Props) {
  const [isOpen, setIsOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true));
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const isRecording = videoExportProgress !== null && videoExportProgress !== undefined;

  if (!isOpen) {
    return (
      <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors pointer-events-auto"
          title="Abrir Línea de Tiempo"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 w-52 sm:w-56 h-[78vh] sm:h-[85vh] bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-900 rounded-lg shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200 pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Animación</span>
        <div className="flex items-center gap-1">
          {savedScenes.length >= 2 && playAnimation && (
            <button
              onClick={playAnimation}
              disabled={isPlaying}
              className="p-1 text-slate-500 hover:text-[#059669] transition-colors disabled:opacity-50"
              title="Reproducir animación"
            >
              <Play className="w-4 h-4 shrink-0 fill-current" />
            </button>
          )}
          {/* Botón Exportar Vídeo — visible solo con ≥2 fotogramas */}
          {savedScenes.length >= 2 && onExportVideo && (
            <button
              onClick={onExportVideo}
              disabled={isRecording}
              className="p-1 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isRecording ? 'Grabando vídeo…' : 'Exportar animación a vídeo (.mp4)'}
            >
              {isRecording
                ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                : <Video className="w-4 h-4 shrink-0" />
              }
            </button>
          )}
          <button className="p-1 text-slate-500 hover:text-slate-900 transition-colors" title="Ajustes">
            <Settings className="w-4 h-4 shrink-0" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 text-slate-500 hover:text-slate-900 transition-colors" title="Ocultar Panel">
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Progress bar for video recording */}
      {isRecording && (
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Grabando…</span>
            <span className="text-[10px] text-slate-500 font-mono">{Math.round((videoExportProgress ?? 0) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#059669] rounded-full transition-all duration-300"
              style={{ width: `${(videoExportProgress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {savedScenes.map((scene, index) => (
          <div 
            key={scene.id} 
            onClick={() => {
              setActiveSceneId(scene.id);
              loadScene(scene);
            }} 
            className={`w-full border rounded-md p-3 cursor-pointer transition-colors group relative shrink-0 shadow-xs ${
              activeSceneId === scene.id
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fotograma {index + 1}</span>
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
                  className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Eliminar fotograma"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs font-bold text-slate-900 truncate">{scene.title}</p>
            <div className="w-full h-1 bg-slate-200 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[#059669]" style={{ width: '100%' }} />
            </div>
          </div>
        ))}
        
        <button 
          onClick={() => saveScene(`Fotograma ${savedScenes.length + 1}`)} 
          className="w-full h-20 border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all shrink-0 mt-1 cursor-pointer"
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-center">Añadir Estado</span>
        </button>

        {savedScenes.length >= 2 && onExportVideo && (
          <button
            onClick={onExportVideo}
            disabled={isRecording}
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-md flex items-center justify-center gap-2 text-[11px] font-semibold transition-colors shrink-0 mt-2 disabled:opacity-50 cursor-pointer shadow-xs"
            title="Exportar y descargar la animación a vídeo (.webm / .mp4)"
          >
            {isRecording ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                <span className="text-emerald-700 font-mono">Generando {Math.round((videoExportProgress ?? 0) * 100)}%</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4 text-[#059669]" />
                <span>Descargar Vídeo</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
