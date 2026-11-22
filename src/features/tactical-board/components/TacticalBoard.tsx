import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Goal, X, AlertTriangle, FileDown, FileText, Loader2, Maximize, Minimize, Undo, Trash2, Video } from 'lucide-react';
import { useBoardManager } from '../controllers/useBoardManager';
import { usePitchAspectRatioSize } from '../controllers/useElementSize';
import { TokenEditorModal } from './TokenEditorModal';
import { TacticalCanvas } from './TacticalCanvas';
import { FloatingToolbar } from './FloatingToolbar';
import { FloatingTimeline } from './FloatingTimeline';
import { ExerciseNotesDrawer } from './ExerciseNotesDrawer';
import { useSession } from '../../../context/SessionContext';
import { useTeam } from '../../../context/TeamContext';
import { exportBoardToPDF } from '../services/exportService';

const DEFAULT_CATEGORIES = [
  'Calentamiento',
  'Posesión',
  'Transiciones',
  'Trabajo por Líneas',
  'Salida de Balón',
  'ABP',
  'Otros',
];

export function TacticalBoard() {
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
  const pitchSize = usePitchAspectRatioSize(containerRef, 0.96, isFullscreen);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting && !isClearing && !editingTokenId && !isNotesOpen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen, isExporting, isClearing, editingTokenId, isNotesOpen]);

  const confirmSaveToLibrary = async (mode: 'overwrite' | 'copy' = 'overwrite') => {
    if (!exerciseMeta.title.trim() || exerciseMeta.duration < 1) return;
    setIsSaving(true);
    try {
      const isCopy = mode === 'copy' || !exerciseMeta.id;
      const newId = isCopy ? crypto.randomUUID() : exerciseMeta.id!;
      const newCreatedAt = isCopy ? Date.now() : (exerciseMeta.createdAt || Date.now());
      const newExercise = {
        id: newId,
        title: exerciseMeta.title.trim(),
        category: exerciseMeta.category,
        modality: exerciseMeta.modality,
        duration: exerciseMeta.duration,
        notes: exerciseMeta.notes,
        createdAt: newCreatedAt,
        thumbnailUrl: '',
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
  const isVideoRecording = videoExportProgress !== null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden'
          : 'h-[calc(100vh-56px)] max-h-full w-full bg-[#F8FAFC] text-slate-900 relative flex flex-col overflow-hidden'
      }
    >
      {/* ZONA 1 — Barra Superior Única Acoplada (sin overlaps) */}
      <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Goal className="w-4 h-4 text-[#059669]" />
          </div>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide truncate max-w-[140px] sm:max-w-[260px]">
            {exerciseMeta.title ? exerciseMeta.title : 'Pizarra Táctica'}
          </h1>
          <select
            value={exerciseMeta.modality}
            onChange={(e) => setExerciseMeta(prev => ({ ...prev, modality: e.target.value as 'Universal' | 'F7' | 'F11' }))}
            aria-label="Tipo de campo"
            className="hidden sm:block h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#059669] cursor-pointer shrink-0"
          >
            <option value="Universal">Campo Completo</option>
            <option value="F11">Fútbol 11</option>
            <option value="F7">Fútbol 7</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={manager.undoPath}
            className="h-8 px-2 bg-white text-slate-700 rounded-md font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Deshacer Dibujo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-xs">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearing(true)}
            className="h-8 px-2 bg-white text-slate-700 rounded-md font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors border border-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Limpiar Pizarra"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-xs">Limpiar</span>
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

          {/* Botón Notas / Explicación del Ejercicio */}
          <button
            type="button"
            onClick={() => setIsNotesOpen(prev => !prev)}
            className={`relative h-8 px-2.5 rounded-md font-semibold transition-colors border flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isNotesOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border-slate-200'
            }`}
            title="Añadir o editar notas explicativas del ejercicio (se incluyen en el PDF)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="text-xs">Notas</span>
            {hasNotes && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#059669]"
                title="Este ejercicio tiene notas"
              />
            )}
          </button>

          {/* Botón Exportar PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isPdfLoading}
            className="h-8 px-2.5 bg-white text-slate-700 rounded-md font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
            title="Exportar pizarra y notas del ejercicio a PDF"
          >
            {isPdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span className="text-xs">{isPdfLoading ? 'PDF…' : 'PDF'}</span>
          </button>

          {/* Botón Exportar Vídeo .MP4 */}
          <button
            type="button"
            onClick={handleExportVideo}
            disabled={isVideoRecording || savedScenes.length < 2}
            className="h-8 px-2.5 bg-white text-slate-700 rounded-md font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            title={savedScenes.length < 2 ? 'Necesitas al menos 2 fotogramas para exportar .MP4' : 'Exportar animación a vídeo .MP4'}
          >
            {isVideoRecording ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" /> : <Video className="w-3.5 h-3.5 text-[#059669]" />}
            <span className="text-xs hidden md:inline">
              {isVideoRecording ? `${Math.round((videoExportProgress ?? 0) * 100)}%` : 'Vídeo .MP4'}
            </span>
          </button>

          {/* CTA Principal: Guardar Ejercicio */}
          <button
            type="button"
            onClick={() => setIsExporting(true)}
            className="h-8 px-3 bg-[#059669] text-white text-xs rounded-md font-semibold hover:bg-[#047857] transition-colors border border-[#059669] shrink-0 cursor-pointer"
          >
            <span className="hidden sm:inline">Guardar </span>Ejercicio
          </button>

          {/* Pantalla Completa / Salir */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="h-8 px-2.5 bg-white text-slate-700 rounded-md font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
            title={isFullscreen ? 'Salir de Pantalla Completa (Esc)' : 'Pantalla Completa'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="text-xs hidden lg:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>
        </div>
      </header>

      {/* ZONA 2 — Cuerpo Central Horizontal (Raíl Fijo + Inventario Acoplado + Lienzo 100% Visible) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <FloatingToolbar
          manager={manager}
          onEditSelection={setEditingTokenId}
          onClearBoard={() => setIsClearing(true)}
        />

        <TacticalCanvas
          manager={manager}
          pitchSize={pitchSize}
          containerRef={containerRef}
          onEditToken={setEditingTokenId}
          isFullscreen={isFullscreen}
        />
      </div>

      {/* ZONA 3 — Barra Inferior Acoplada de Animación / Fotogramas */}
      <FloatingTimeline
        savedScenes={savedScenes}
        saveScene={saveScene}
        loadScene={loadScene}
        deleteScene={manager.deleteScene}
        playAnimation={manager.playAnimation}
        isPlaying={isPlaying}
        onExportVideo={handleExportVideo}
        videoExportProgress={videoExportProgress}
      />

      {/* ZONA 4 — Drawer y Modales sobre Pantalla Completa (z-[70]) */}
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
        <div className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4 animate-in fade-in">
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
        <div className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4">
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
