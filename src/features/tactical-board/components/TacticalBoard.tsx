import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Goal, X, AlertTriangle, FileDown, FileText,
  Loader2, Maximize, Minimize, Undo, Trash2
} from 'lucide-react';
import { useBoardManager } from '../controllers/useBoardManager';
import { usePitchAspectRatioSize } from '../controllers/useElementSize';
import { TokenEditorModal } from './TokenEditorModal';
import { TacticalCanvas } from './TacticalCanvas';
import { FloatingToolbar } from './FloatingToolbar';
import { ExerciseNotesDrawer } from './ExerciseNotesDrawer';
import { useSession } from '../../../context/SessionContext';
import { useTeam } from '../../../context/TeamContext';
import { exportBoardToPDF } from '../services/exportService';
import { renderTacticalThumbnail } from '../../../services/tacticalThumbnail';

const DEFAULT_CATEGORIES = [
  'Calentamiento',
  'Posesión',
  'Transiciones',
  'Trabajo por Líneas',
  'Salida de Balón',
  'ABP',
  'Otros',
];

interface TacticalBoardProps {
  onExit?: () => void;
}

export function TacticalBoard({ onExit }: TacticalBoardProps = {}) {
  const manager = useBoardManager();
  const {
    boardState,
    isPlaying,
    savedScenes,
    saveScene,
    loadScene,
    clearBoard,
    exerciseMeta,
    setExerciseMeta,
  } = manager;

  const { saveExercise } = useSession();
  const { customCategories } = useTeam();

  const categories = customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES;

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [videoExportProgress, setVideoExportProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pitchSize = usePitchAspectRatioSize(containerRef, 0.99, isFullscreen);

  // Sync with native Fullscreen API (PC + Tablet)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fallback Escape key when native Fullscreen API is unavailable (e.g. iOS Safari)
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting && !isClearing && !editingTokenId && !isNotesOpen) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen, isExporting, isClearing, editingTokenId, isNotesOpen]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen(prev => !prev);
      }
    } catch {
      setIsFullscreen(prev => !prev);
    }
  }, []);

  const handleExitStudio = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    onExit?.();
  }, [onExit]);

  const confirmSaveToLibrary = async (mode: 'overwrite' | 'copy' = 'overwrite') => {
    if (!exerciseMeta.title.trim() || exerciseMeta.duration < 1) return;
    setIsSaving(true);
    try {
      const isCopy = mode === 'copy' || !exerciseMeta.id;
      const newId = isCopy ? crypto.randomUUID() : exerciseMeta.id!;
      const newCreatedAt = isCopy ? Date.now() : (exerciseMeta.createdAt || Date.now());
      const generatedThumbnail = renderTacticalThumbnail(savedScenes[0]?.state || boardState);
      const newExercise = {
        id: newId,
        title: exerciseMeta.title.trim(),
        category: exerciseMeta.category,
        modality: exerciseMeta.modality,
        duration: exerciseMeta.duration,
        notes: exerciseMeta.notes,
        createdAt: newCreatedAt,
        thumbnailUrl: generatedThumbnail,
        isCommunityOfficial: false,
        boardState,
        scenes: savedScenes,
      };

      await saveExercise(newExercise);
      setExerciseMeta(prev => ({ ...prev, id: newId, createdAt: newCreatedAt }));
      alert(isCopy && exerciseMeta.id
        ? '¡Copia guardada como nuevo ejercicio en la biblioteca!'
        : '¡Ejercicio guardado en la biblioteca con éxito!');
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
      await exportBoardToPDF(manager.boardRef.current, {
        title: exerciseMeta.title || 'Pizarra Táctica',
        category: exerciseMeta.category,
        duration: exerciseMeta.duration,
        modality: exerciseMeta.modality,
        notes: exerciseMeta.notes,
        tokens: boardState.tokens,
      });
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setIsPdfLoading(false);
    }
  }, [manager.boardRef, exerciseMeta, boardState.tokens]);

  const handleExportVideo = useCallback(async () => {
    if (savedScenes.length < 2) {
      alert('Se necesitan al menos 2 fotogramas en la línea de tiempo para exportar un vídeo.');
      return;
    }
    setVideoExportProgress(0);
    try {
      const { exportTacticalVideo } = await import('../../../services/tacticalVideoExport');
      await exportTacticalVideo(
        {
          title: exerciseMeta.title || 'Pizarra Táctica',
          category: exerciseMeta.category || 'Táctica',
          modality: exerciseMeta.modality || 'F11',
          scenes: savedScenes,
        },
        (progressPercent) => {
          setVideoExportProgress(progressPercent / 100);
        }
      );
    } catch (err: any) {
      console.error('Error exportando vídeo táctico:', err);
      alert(err.message || 'Error al exportar el vídeo táctico.');
    } finally {
      setVideoExportProgress(null);
    }
  }, [savedScenes, exerciseMeta]);

  const hasNotes = Boolean(exerciseMeta.notes && exerciseMeta.notes.trim().length > 0);

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-900 relative overflow-hidden">
      {/* FRANJA 1 — Barra Superior Ultra-Compacta (Estilo TacticalPad / bcoach) */}
      <header className="h-11 shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2 z-30">
        {/* Izquierda: ← Volver + separador + Título del ejercicio + selector de campo */}
        <div className="flex items-center gap-2 min-w-0">
          {onExit && (
            <>
              <button
                type="button"
                onClick={handleExitStudio}
                className="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                title="Volver al Panel Principal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
              <div className="w-px h-5 bg-slate-200 shrink-0" />
            </>
          )}

          <div className="w-6 h-6 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Goal className="w-3.5 h-3.5 text-[#059669]" />
          </div>

          <input
            type="text"
            value={exerciseMeta.title}
            onChange={(e) => setExerciseMeta(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Pizarra Táctica — Título del ejercicio"
            aria-label="Título del ejercicio"
            className="h-7 px-2 rounded-md bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none truncate w-[140px] sm:w-[220px] md:w-[260px]"
          />

          <select
            value={exerciseMeta.modality}
            onChange={(e) => setExerciseMeta(prev => ({ ...prev, modality: e.target.value as 'Universal' | 'F7' | 'F11' }))}
            aria-label="Tipo de campo"
            className="hidden sm:block h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#059669] cursor-pointer shrink-0"
          >
            <option value="Universal">Campo Completo</option>
            <option value="F11">Fútbol 11 (F11)</option>
            <option value="F7">Fútbol 7 (F7)</option>
          </select>
        </div>

        {/* Derecha: Acciones Siempre Visibles */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={manager.undoPath}
            className="h-7 px-2 bg-white text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
            title="Deshacer Dibujo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearing(true)}
            className="h-7 px-2 bg-white text-slate-700 rounded-md text-xs font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors border border-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
            title="Limpiar Pizarra"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Limpiar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNotesOpen(prev => !prev)}
            className={`relative h-7 px-2.5 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1 shrink-0 cursor-pointer ${
              isNotesOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border-slate-200'
            }`}
            title="Notas explicativas del ejercicio (se incluyen en el PDF)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notas</span>
            {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isPdfLoading}
            className="h-7 px-2.5 bg-white text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 flex items-center gap-1 disabled:opacity-50 shrink-0 cursor-pointer"
            title="Exportar pizarra y notas a PDF"
          >
            {isPdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>{isPdfLoading ? 'PDF…' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExporting(true)}
            className="h-7 px-3 bg-[#059669] text-white text-xs rounded-md font-semibold hover:bg-[#047857] transition-colors border border-[#059669] shrink-0 cursor-pointer shadow-xs"
          >
            Guardar
          </button>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1 shrink-0 cursor-pointer ${
              isFullscreen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border-slate-200'
            }`}
            title={isFullscreen ? 'Salir de Pantalla Completa (Esc)' : 'Pantalla Completa Real'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>
        </div>
      </header>

      {/* FRANJA 2 — Zona Central del Campo — Máximo Tamaño (~90% del Viewport) */}
      <TacticalCanvas
        manager={manager}
        pitchSize={pitchSize}
        containerRef={containerRef}
        onEditToken={setEditingTokenId}
        isFullscreen={isFullscreen}
      />

      {/* FRANJA 3 — Barra Inferior Única de Herramientas + Bandejas Desplegables Bajo Demanda */}
      <FloatingToolbar
        manager={manager}
        onEditSelection={setEditingTokenId}
        savedScenes={savedScenes}
        saveScene={saveScene}
        loadScene={loadScene}
        deleteScene={manager.deleteScene}
        playAnimation={manager.playAnimation}
        isPlaying={isPlaying}
        onExportVideo={handleExportVideo}
        videoExportProgress={videoExportProgress}
      />

      {/* MODALES Y DRAWERS (z-[80] para renderizar sobre el Modo Estudio y requestFullscreen) */}
      <ExerciseNotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        meta={exerciseMeta}
        onChangeMeta={setExerciseMeta}
        categories={categories}
        onExportPDF={handleExportPDF}
        isPdfLoading={isPdfLoading}
        onSaveToLibrary={confirmSaveToLibrary}
        isSaving={isSaving}
      />

      {isExporting && (
        <div className="fixed inset-0 z-[80] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4 animate-in fade-in">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-white border border-slate-200 rounded-lg p-6 w-full max-w-md shadow-lg relative text-slate-900">
            <button onClick={() => setIsExporting(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Guardar en la Biblioteca</h3>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Título</label>
                  <input
                    type="text"
                    value={exerciseMeta.title}
                    onChange={(e) => setExerciseMeta(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-md px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Categoría</label>
                  <select
                    value={exerciseMeta.category}
                    onChange={(e) => setExerciseMeta(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-md px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={exerciseMeta.duration}
                    onChange={(e) => setExerciseMeta(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-md px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-2">Modalidad</label>
                  <div className="flex bg-slate-100 border border-slate-200 rounded-md p-1 h-[46px]">
                    {(['Universal', 'F7', 'F11'] as const).map(mod => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setExerciseMeta(prev => ({ ...prev, modality: mod }))}
                        className={`flex-1 text-xs rounded-lg font-bold transition-colors ${
                          exerciseMeta.modality === mod ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mod === 'Universal' ? 'Univ' : mod}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-slate-600 text-sm font-medium mb-1">Notas / Explicación del Ejercicio</label>
                <textarea
                  value={exerciseMeta.notes}
                  onChange={(e) => setExerciseMeta(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-md px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] resize-none h-28"
                  placeholder="Describe el desarrollo, objetivos, reglas y variantes de la tarea..."
                />
              </div>
            </div>
            {exerciseMeta.id ? (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => confirmSaveToLibrary('overwrite')}
                  disabled={!exerciseMeta.title.trim() || exerciseMeta.duration < 1 || isSaving}
                  className="w-full py-3 rounded-md bg-[#059669] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#047857] transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : '💾 Sobrescribir actual'}
                </button>
                <button
                  onClick={() => confirmSaveToLibrary('copy')}
                  disabled={!exerciseMeta.title.trim() || exerciseMeta.duration < 1 || isSaving}
                  className="w-full py-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : '➕ Guardar como nuevo ejercicio'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => confirmSaveToLibrary('overwrite')}
                disabled={!exerciseMeta.title.trim() || exerciseMeta.duration < 1 || isSaving}
                className="w-full py-3 rounded-md bg-[#059669] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#047857] transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Ejercicio'}
              </button>
            )}
          </div>
        </div>
      )}

      {isClearing && (
        <div className="fixed inset-0 z-[80] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-white border border-slate-200 rounded-lg p-6 w-full max-w-sm shadow-lg text-slate-900">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">¿Limpiar Pizarra?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 pl-16">
              ¿Estás seguro de que quieres vaciar la pizarra por completo? Se perderán todas las fichas, zonas y el timeline.
            </p>
            <div className="flex gap-3 pl-16">
              <button
                onClick={() => setIsClearing(false)}
                className="flex-1 py-3 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearBoard();
                  setIsClearing(false);
                }}
                className="flex-1 py-3 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Limpiar
              </button>
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
          onDelete={(id) => {
            manager.deleteSelectedToken(id);
            setEditingTokenId(null);
          }}
        />
      )}
    </div>
  );
}
