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
  const [isOpen, setIsOpen] = useState(true);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const isRecording = videoExportProgress !== null && videoExportProgress !== undefined;

  if (!isOpen) {
    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 bg-[#0A0A0C]/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl text-[#6E6E75] hover:text-white transition-colors pointer-events-auto"
          title="Abrir Línea de Tiempo"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-56 h-[85vh] bg-[#0A0A0C]/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200 pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#2A2A2E]/50">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Animación</span>
        <div className="flex items-center gap-1">
          {savedScenes.length >= 2 && playAnimation && (
            <button
              onClick={playAnimation}
              disabled={isPlaying}
              className="p-1 text-[#6E6E75] hover:text-emerald-400 transition-colors disabled:opacity-50"
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
              className="p-1 text-[#6E6E75] hover:text-[#FF4B4B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isRecording ? 'Grabando vídeo…' : 'Exportar animación a vídeo (.webm)'}
            >
              {isRecording
                ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                : <Video className="w-4 h-4 shrink-0" />
              }
            </button>
          )}
          <button className="p-1 text-[#6E6E75] hover:text-[#FF4B4B] transition-colors" title="Ajustes">
            <Settings className="w-4 h-4 shrink-0" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 text-[#6E6E75] hover:text-white transition-colors" title="Ocultar Panel">
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Progress bar for video recording */}
      {isRecording && (
        <div className="px-3 py-2 border-b border-[#2A2A2E]/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#FF4B4B] uppercase tracking-wider">Grabando…</span>
            <span className="text-[10px] text-[#6E6E75]">{Math.round((videoExportProgress ?? 0) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF4B4B] rounded-full transition-all duration-300"
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
            className={`w-full bg-[#1C1C1F]/80 backdrop-blur-sm border rounded-xl p-3 cursor-pointer transition-colors group relative shrink-0 shadow-sm ${
              activeSceneId === scene.id
                ? 'border-[#FF4B4B] bg-[#1C1C1F]'
                : 'border-[#2A2A2E] hover:border-[#FF4B4B]'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#6E6E75] uppercase tracking-wider">Fotograma {index + 1}</span>
              {deleteScene && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeSceneId === scene.id) setActiveSceneId(null);
                    deleteScene(scene.id);
                  }}
                  className="p-1 -mr-1 -mt-1 rounded-lg text-[#6E6E75] hover:text-[#FF4B4B] hover:bg-[#FF4B4B]/10 transition-colors"
                  title="Eliminar fotograma"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs font-bold text-white truncate">{scene.title}</p>
            <div className="w-full h-1 bg-[#2A2A2E] rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[#FF4B4B]" style={{ width: '100%' }} />
            </div>
          </div>
        ))}
        
        <button 
          onClick={() => saveScene(`Fotograma ${savedScenes.length + 1}`)} 
          className="w-full h-20 border-2 border-dashed border-[#2A2A2E] rounded-xl flex flex-col items-center justify-center gap-1 text-[#6E6E75] hover:text-[#FF4B4B] hover:border-[#FF4B4B] hover:bg-[#FF4B4B]/10 transition-all shrink-0 mt-1"
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-center">Añadir Estado</span>
        </button>
      </div>
    </div>
  );
}
