import React, { useState, useRef, useCallback } from 'react';
import { Goal, X, AlertTriangle, FileDown, FileText, Loader2, Maximize, Minimize, Undo, Trash2 } from 'lucide-react';
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
  const pitchSize = usePitchAspectRatioSize(containerRef, 0.95, isFullscreen);

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

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden'
          : 'w-full h-full relative overflow-hidden bg-[#F8FAFC] text-slate-900'
      }
    >
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
          className="absolute top-6 right-6 z-[110] w-11 h-11 bg-white/95 text-slate-700 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 shadow-sm transition-transform active:scale-95 pointer-events-auto"
          title="Salir de Pantalla Completa"
        >
          <Minimize className="w-5 h-5" />
        </button>
      )}

      {/* HEADER BAR FLOTANTE */}
      <div className="absolute top-0 left-0 w-full z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2.5 sm:gap-4 pointer-events-auto">
          <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Goal className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <h1 className="text-sm sm:text-xl font-semibold text-slate-900 uppercase tracking-wider">
              {exerciseMeta.title ? exerciseMeta.title : 'Pizarra Táctica'}
            </h1>
            <p className="hidden sm:block text-slate-500 text-xs font-medium">
              {hasNotes ? 'Con notas explicativas del ejercicio' : 'Modo Inmersivo'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={manager.undoPath}
            className="px-2.5 sm:px-3 py-2 bg-white/95 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 shadow-sm flex items-center gap-2"
            title="Deshacer Dibujo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsClearing(true)}
            className="px-2.5 sm:px-3 py-2 bg-white/95 text-slate-700 rounded-lg font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors border border-slate-200 shadow-sm flex items-center gap-2"
            title="Limpiar Pizarra"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-0.5 sm:mx-1 self-center" />

          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-2.5 sm:px-3 py-2 bg-white/95 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 shadow-sm flex items-center gap-2"
              title="Pantalla Completa"
            >
              <Maximize className="w-4 h-4" />
              <span className="text-sm hidden md:inline">Pantalla Completa</span>
            </button>
          )}

          {/* Botón Notas / Explicación del Ejercicio */}
          <button
            onClick={() => setIsNotesOpen(prev => !prev)}
            className={`relative px-2.5 sm:px-3.5 py-2 rounded-lg font-semibold transition-colors border shadow-sm flex items-center gap-2 ${
              isNotesOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white/95 text-slate-700 hover:bg-slate-50 hover:border-slate-300 border-slate-200'
            }`}
            title="Añadir o editar notas explicativas del ejercicio (se incluyen en el PDF)"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Notas</span>
            {hasNotes && (
              <span
                className="w-2 h-2 rounded-full bg-[#059669]"
                title="Este ejercicio tiene notas"
              />
            )}
          </button>

          {/* Botón Exportar PDF */}
          <button
            onClick={handleExportPDF}
            disabled={isPdfLoading}
            className="px-2.5 sm:px-3 py-2 bg-white/95 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors border border-slate-200 shadow-sm flex items-center gap-2 disabled:opacity-50"
            title="Exportar pizarra y notas del ejercicio a PDF"
          >
            {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            <span className="text-xs sm:text-sm">{isPdfLoading ? 'Generando…' : 'PDF'}</span>
          </button>

          <button
            onClick={() => setIsExporting(true)}
            className="px-3 sm:px-4 py-2 bg-[#059669] text-white text-xs sm:text-sm rounded-lg font-semibold hover:bg-[#047857] transition-colors border border-[#059669] shadow-sm"
          >
            <span className="hidden sm:inline">Guardar </span>Ejercicio
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
          playAnimation={manager.playAnimation}
          isPlaying={isPlaying}
          onExportVideo={handleExportVideo}
          videoExportProgress={videoExportProgress}
        />
      </div>

      {/* DRAWER LATERAL DE NOTAS Y EXPLICACIÓN */}
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
        <div className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4 animate-in fade-in">
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
        <div className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4">
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
