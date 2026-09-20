import React, { useState } from 'react';
import { Settings, Plus, ChevronRight, ChevronLeft, Video, Loader2 } from 'lucide-react';
import { BoardScene } from '../../../types';

interface Props {
  savedScenes: BoardScene[];
  saveScene: (title: string) => void;
  loadScene: (id: string) => void;
  deleteScene?: (id: string) => void;
  onExportVideo?: () => Promise<void>;
  videoExportProgress?: number | null; // 0–1 while recording, null when idle
}

export function FloatingTimeline({ savedScenes, saveScene, loadScene, deleteScene, onExportVideo, videoExportProgress }: Props) {
  const [isOpen, setIsOpen] = useState(true);
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
            onClick={() => loadScene(scene.id)} 
            className="w-full bg-[#1C1C1F]/80 backdrop-blur-sm border border-[#2A2A2E] rounded-xl p-3 cursor-pointer hover:border-[#FF4B4B] transition-colors group relative shrink-0 shadow-sm"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#6E6E75] uppercase tracking-wider">Fotograma {index + 1}</span>
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
