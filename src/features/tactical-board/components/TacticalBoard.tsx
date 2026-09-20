import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Goal, X, AlertTriangle, FileDown, Loader2, Maximize, Minimize } from 'lucide-react';
import { useBoardManager } from '../controllers/useBoardManager';
import { TokenEditorModal } from './TokenEditorModal';
import { TacticalCanvas } from './TacticalCanvas';
import { FloatingToolbar } from './FloatingToolbar';
import { FloatingTimeline } from './FloatingTimeline';
import { ContextualTokenMenu } from './ContextualTokenMenu';
import { useSession } from '../../../context/SessionContext';
import { exportBoardToPDF } from '../services/exportService';

export function TacticalBoard() {
  const manager = useBoardManager();
  const { boardState, setBoardState, isPlaying, savedScenes, saveScene, loadScene, clearBoard } = manager;
  
  const { loadedExercise, saveExercise } = useSession();
  
  const [exerciseTitle, setExerciseTitle] = useState<string>(loadedExercise?.title || '');
  const [exerciseDuration, setExerciseDuration] = useState<number>(loadedExercise?.duration || 15);
  const [exerciseCategory, setExerciseCategory] = useState<string>('Posesión');
  const [exerciseModality, setExerciseModality] = useState<'F7' | 'F11' | 'Universal'>('Universal');
  const [exerciseNotes, setExerciseNotes] = useState<string>('');
  
  const [isClearing, setIsClearing] = useState(false);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pitchSize, setPitchSize] = useState({ width: '100%', height: '100%' });

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Si estamos en pantalla completa, forzamos que el campo ocupe todo el espacio (flex-1 equivalente)
    if (isFullscreen) {
      setPitchSize({ width: '100%', height: '100%' });
      return;
    }

    const observer = new ResizeObserver((entries) => {
      if (isFullscreen) return; // evitamos recalculaciones en fullscreen
      const { width, height } = entries[0].contentRect;
      const aspect = 105 / 68;
      if (width / height > aspect) {
        setPitchSize({ height: `${height * 0.95}px`, width: `${height * 0.95 * aspect}px` });
      } else {
        setPitchSize({ width: `${width * 0.95}px`, height: `${(width * 0.95) / aspect}px` });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const confirmSaveToLibrary = async () => {
    setIsSaving(true);
    try {
      const newExercise = {
        id: loadedExercise?.id || crypto.randomUUID(),
        title: exerciseTitle,
        category: exerciseCategory,
        modality: exerciseModality,
        duration: exerciseDuration,
        notes: exerciseNotes,
        createdAt: loadedExercise?.createdAt || Date.now(),
        thumbnailUrl: '', // Could generate a mini-canvas snapshot here in the future
        boardState,
        scenes: savedScenes
      };
      
      // Delegamos la escritura al Store global (que persiste en base de datos)
      await saveExercise(newExercise);
      
      alert('¡Ejercicio guardado en la biblioteca con éxito!');
      setIsExporting(false);
    } catch (error) {
      console.error('Error al guardar el ejercicio:', error);
      alert('Hubo un error al guardar el ejercicio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = useCallback(async () => {
    if (!manager.boardRef.current) return;
    setIsPdfLoading(true);
    try {
      await exportBoardToPDF(manager.boardRef.current, exerciseTitle || 'Pizarra Táctica');
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setIsPdfLoading(false);
    }
  }, [manager.boardRef, exerciseTitle]);

  const selectedToken = boardState.selectedTokenId ? boardState.tokens.find(t => t.id === boardState.selectedTokenId) : null;

  return (
    <div className={
      isFullscreen 
        ? "fixed inset-0 z-[100] w-screen h-screen bg-[#121215] flex flex-col items-center justify-center p-4 overflow-hidden" 
        : "w-full h-full relative overflow-hidden bg-[#0A0A0B]"
    }>
      
      {/* CANVAS (Fondo y Campo) */}
      <TacticalCanvas 
        manager={manager}
        pitchSize={pitchSize}
        containerRef={containerRef}
        onEditToken={setEditingTokenId}
        isFullscreen={isFullscreen}
      />
      
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-6 right-6 z-[110] w-12 h-12 bg-[#FF4B4B] text-black rounded-full flex items-center justify-center hover:bg-[#FF4B4B]/80 shadow-2xl transition-transform active:scale-90 pointer-events-auto"
          title="Salir de Pantalla Completa"
        >
          <Minimize className="w-6 h-6" />
        </button>
      )}

      {/* HEADER BAR FLOTANTE */}
      <div className="absolute top-0 left-0 w-full z-40 bg-gradient-to-b from-[#0A0A0B]/90 to-transparent p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="w-8 h-8 rounded bg-[#FF4B4B]/20 flex items-center justify-center">
            <Goal className="w-5 h-5 text-[#FF4B4B]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider drop-shadow-md">Pizarra Táctica</h1>
            <p className="text-white/60 text-xs font-bold drop-shadow-md">Modo Inmersivo</p>
          </div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          {/* Botón Pantalla Completa */}
          {!isFullscreen && (
            <button 
              onClick={() => setIsFullscreen(true)}
              className="px-3 py-2 bg-black/60 text-white rounded-lg font-bold hover:bg-white/10 transition-colors border border-[#2A2A2E] shadow-xl flex items-center gap-2"
              title="Pantalla Completa"
            >
              <Maximize className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Pantalla Completa</span>
            </button>
          )}
          {/* Botón Exportar PDF */}
          <button 
            onClick={handleExportPDF}
            disabled={isPdfLoading}
            className="px-3 py-2 bg-black/60 text-white rounded-lg font-bold hover:bg-white/10 transition-colors border border-[#2A2A2E] shadow-xl flex items-center gap-2 disabled:opacity-50"
            title="Exportar pizarra a PDF"
          >
            {isPdfLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileDown className="w-4 h-4" />
            }
            <span className="text-sm">{isPdfLoading ? 'Generando…' : 'PDF'}</span>
          </button>
          <button 
            onClick={() => setIsExporting(true)}
            className="px-4 py-2 bg-black/60 text-white rounded-lg font-bold hover:bg-[#FF4B4B] transition-colors border border-[#2A2A2E] shadow-xl"
          >
            Guardar Ejercicio
          </button>
        </div>
      </div>

      {/* PANELES FLOTANTES */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <FloatingToolbar 
          manager={manager}
          onEditSelection={setEditingTokenId}
          onClearBoard={() => setIsClearing(true)}
        />

        <FloatingTimeline 
          savedScenes={savedScenes}
          saveScene={saveScene}
          loadScene={loadScene}
          deleteScene={manager.deleteScene}
        />
      </div>


      {isExporting && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsExporting(false)} className="absolute top-4 right-4 text-[#6E6E75] hover:text-white"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold text-white mb-6">Añadir a la Biblioteca</h3>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Título</label>
                  <input type="text" value={exerciseTitle} onChange={(e) => setExerciseTitle(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50" autoFocus />
                </div>
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Categoría</label>
                  <select value={exerciseCategory} onChange={(e) => setExerciseCategory(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50">
                    <option value="Calentamiento">Calentamiento</option><option value="Posesión">Posesión</option><option value="Transiciones">Transiciones</option><option value="Trabajo por Líneas">Trabajo por Líneas</option><option value="Salida de Balón">Salida de Balón</option><option value="ABP">ABP</option><option value="Otros">Otros</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración (min)</label>
                  <input type="number" min="1" value={exerciseDuration} onChange={(e) => setExerciseDuration(Number(e.target.value))} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50" />
                </div>
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-2">Modalidad</label>
                  <div className="flex bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-1 h-[46px]">
                    <button onClick={() => setExerciseModality('Universal')} className={`flex-1 text-xs rounded-lg font-bold transition-colors ${exerciseModality === 'Universal' ? 'bg-[#2A2A2E] text-white shadow' : 'text-[#6E6E75] hover:text-white'}`}>Univ</button>
                    <button onClick={() => setExerciseModality('F7')} className={`flex-1 text-xs rounded-lg font-bold transition-colors ${exerciseModality === 'F7' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'}`}>F7</button>
                    <button onClick={() => setExerciseModality('F11')} className={`flex-1 text-xs rounded-lg font-bold transition-colors ${exerciseModality === 'F11' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'}`}>F11</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Notas / Descripción (Opcional)</label>
                <textarea value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 resize-none h-24" placeholder="Describe el desarrollo de la tarea..." />
              </div>
            </div>
            <button 
              onClick={confirmSaveToLibrary} 
              disabled={!exerciseTitle.trim() || exerciseDuration < 1 || isSaving} 
              className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Ejercicio'}
            </button>
          </div>
        </div>
      )}

      {isClearing && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#FF4B4B]/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#FF4B4B]" />
              </div>
              <h3 className="text-lg font-bold text-white">¿Limpiar Pizarra?</h3>
            </div>
            <p className="text-[#6E6E75] text-sm mb-6 pl-16">¿Estás seguro de que quieres vaciar la pizarra por completo? Se perderán todas las fichas, zonas y el timeline.</p>
            <div className="flex gap-3 pl-16">
              <button onClick={() => setIsClearing(false)} className="flex-1 py-3 rounded-xl bg-[#1C1C1F] border border-[#2A2A2E] text-white font-bold hover:bg-[#2A2A2E] transition-colors">Cancelar</button>
              <button onClick={() => { clearBoard(); setIsClearing(false); }} className="flex-1 py-3 rounded-xl bg-[#FF4B4B] text-white font-bold hover:bg-[#E63939] transition-colors">Limpiar</button>
            </div>
          </div>
        </div>
      )}
      
      {editingTokenId && boardState.tokens.find(t => t.id === editingTokenId) && (
        <TokenEditorModal
          token={boardState.tokens.find(t => t.id === editingTokenId)!}
          onClose={() => setEditingTokenId(null)}
          onUpdate={manager.updateToken}
          onUpdateTeamColor={manager.updateTeamColor}
        />
      )}
    </div>
  );
}
