import { useMemo, useState } from 'react';
import { Exercise, useSession } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import {
  CheckCircle2, Filter, Globe, Lock, Plus, Search, Settings, Trash2, X
} from 'lucide-react';
import { ExercisePreviewModal } from './ExercisePreviewModal';
import {
  COMMUNITY_CATEGORIES,
  OFFICIAL_COMMUNITY_EXERCISES,
} from '../services/officialCommunityExercises';
import { renderTacticalThumbnail } from '../services/tacticalThumbnail';
import { exportExerciseToPDF } from '../features/tactical-board/services/exportService';
import { ExerciseCard } from '../features/library/components/ExerciseCard';

interface LibraryScreenProps {
  onNavigate?: (view: 'tactics') => void;
}

const getCategoryColor = (cat: string) => {
  const colors: Record<string, string> = {
    'Calentamiento': 'text-orange-700 border-orange-200 bg-orange-50',
    'Posesión': 'text-blue-700 border-blue-200 bg-blue-50',
    'Transiciones': 'text-amber-700 border-amber-200 bg-amber-50',
    'Trabajo por Líneas': 'text-cyan-700 border-cyan-200 bg-cyan-50',
    'Salida de Balón': 'text-emerald-700 border-emerald-200 bg-emerald-50',
    'Finalización': 'text-rose-700 border-rose-200 bg-rose-50',
    'ABP / Táctico': 'text-purple-700 border-purple-200 bg-purple-50',
    'ABP': 'text-purple-700 border-purple-200 bg-purple-50',
    'Otros': 'text-slate-700 border-slate-200 bg-slate-100',
    // Legacy
    'transition': 'text-amber-700 border-amber-200 bg-amber-50',
    'possession': 'text-blue-700 border-blue-200 bg-blue-50',
    'buildup': 'text-emerald-700 border-emerald-200 bg-emerald-50',
    'set-piece': 'text-purple-700 border-purple-200 bg-purple-50',
    'match': 'text-slate-700 border-slate-200 bg-slate-100',
  };
  return colors[cat] || 'text-slate-700 border-slate-200 bg-slate-100';
};

const mapLegacyCategory = (cat: string) => {
  if (cat === 'transition') return 'Transiciones';
  if (cat === 'possession') return 'Posesión';
  if (cat === 'buildup') return 'Salida de Balón';
  if (cat === 'set-piece') return 'ABP';
  if (cat === 'match') return 'Otros';
  return cat;
};

export function LibraryScreen({ onNavigate }: LibraryScreenProps) {
  const {
    savedExercises,
    deleteExercise,
    loadExerciseToBoard,
    saveExercise,
    cloneExerciseToPrivate,
    toggleShareExercise,
  } = useSession();
  const { activeTeam, customCategories, updateCustomCategories } = useTeam();

  const [libraryTab, setLibraryTab] = useState<'private' | 'community'>('private');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedModality, setSelectedModality] = useState<'Todas' | 'F7' | 'F11'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [exportingVideoId, setExportingVideoId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [clonedIds, setClonedIds] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', modality: 'Universal', duration: 20, notes: '' });
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(prev => (prev === msg ? null : prev)), 3200);
  };

  // Combinación segura: los 12 oficiales + únicamente los ejercicios propios marcados voluntariamente como compartidos
  const communityExercises: Exercise[] = useMemo(() => {
    const sharedByUser = (savedExercises || []).filter(ex => ex.isSharedToCommunity === true);
    return [...OFFICIAL_COMMUNITY_EXERCISES, ...sharedByUser];
  }, [savedExercises]);

  const activeList = libraryTab === 'private' ? (savedExercises || []) : communityExercises;

  const filterCategories = useMemo(() => {
    if (libraryTab === 'community') {
      return ['Todas', ...COMMUNITY_CATEGORIES];
    }
    const merged = Array.from(new Set([...(customCategories || []), ...COMMUNITY_CATEGORIES]));
    return ['Todas', ...merged];
  }, [libraryTab, customCategories]);

  const handleTabSwitch = (nextTab: 'private' | 'community') => {
    setLibraryTab(nextTab);
    setSelectedCategory('Todas');
    setSelectedModality('Todas');
  };

  const handleExportVideo = async (exercise: Exercise) => {
    const scenes = exercise.scenes?.length ? exercise.scenes : exercise.frames || [];
    if (scenes.length < 2 || exportingVideoId) return;

    setExportingVideoId(exercise.id);
    setExportProgress(0);
    try {
      const { exportTacticalVideo } = await import('../services/tacticalVideoExport');
      await exportTacticalVideo(
        {
          title: exercise.title || 'Ejercicio',
          category: mapLegacyCategory(exercise.category || 'Otros'),
          modality: exercise.format || exercise.modality || 'Universal',
          scenes,
        },
        (percent) => setExportProgress(percent)
      );
    } catch (err: any) {
      console.error('Error exportando vídeo táctico:', err);
      alert(err.message || 'No se pudo generar el vídeo táctico.');
    } finally {
      setExportingVideoId(null);
      setExportProgress(0);
    }
  };

  const handleExportPdf = async (exercise: Exercise) => {
    if (exportingPdfId) return;
    setExportingPdfId(exercise.id);
    try {
      await exportExerciseToPDF(exercise);
    } catch (err: any) {
      console.error('Error exportando PDF de ejercicio:', err);
      alert(err.message || 'No se pudo generar el PDF del ejercicio.');
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleCloneToPrivate = async (exercise: Exercise) => {
    if (cloningId) return;
    setCloningId(exercise.id);
    try {
      const thumb = exercise.thumbnailUrl || renderTacticalThumbnail(exercise);
      await cloneExerciseToPrivate(exercise, thumb);
      setClonedIds(prev => ({ ...prev, [exercise.id]: true }));
      notify(`"${exercise.title}" guardado en Mis Ejercicios.`);
    } catch (err: any) {
      console.error('Error clonando ejercicio:', err);
      alert(err.message || 'No se pudo guardar en tu biblioteca privada.');
    } finally {
      setCloningId(null);
    }
  };

  const handleToggleShare = async (exercise: Exercise) => {
    try {
      const updated = await toggleShareExercise(exercise, activeTeam?.name || 'Entrenador AM Manager');
      notify(
        updated.isSharedToCommunity
          ? `"${updated.title}" compartido en Biblioteca Común.`
          : `"${updated.title}" devuelto a solo privado.`
      );
    } catch (err: any) {
      console.error('Error cambiando privacidad:', err);
      alert('No se pudo actualizar la visibilidad del ejercicio.');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise.id);
    setEditForm({
      title: exercise.title || '',
      category: mapLegacyCategory(exercise.category || 'Otros'),
      modality: exercise.modality || 'Universal',
      duration: exercise.duration || exercise.durationMin || 20,
      notes: exercise.notes || exercise.description || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingExercise) return;
    const exercise = savedExercises.find(e => e.id === editingExercise);
    if (!exercise) return;
    await saveExercise({
      ...exercise,
      title: editForm.title,
      category: editForm.category,
      modality: editForm.modality as 'F7' | 'F11' | 'Universal',
      duration: editForm.duration,
      notes: editForm.notes,
      thumbnailUrl: exercise.thumbnailUrl || renderTacticalThumbnail(exercise),
    });
    setEditingExercise(null);
    notify('Ejercicio actualizado.');
  };

  const handleAddCategory = () => {
    const cat = newCategoryName.trim();
    if (cat && !(customCategories || []).includes(cat)) {
      updateCustomCategories([...(customCategories || []), cat]);
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    updateCustomCategories((customCategories || []).filter(c => c !== catToRemove));
    if (selectedCategory === catToRemove) setSelectedCategory('Todas');
  };

  const handleLoad = (exercise: Exercise) => {
    loadExerciseToBoard(exercise);
    onNavigate?.('tactics');
  };

  const filteredExercises = activeList.filter((ex: Exercise) => {
    const exCategory = mapLegacyCategory(ex.category || 'Otros');
    const matchCategory = selectedCategory === 'Todas' || exCategory === selectedCategory;

    const exFormat = ex.format || ex.modality || 'Universal';
    const matchModality =
      selectedModality === 'Todas' ||
      exFormat === selectedModality ||
      exFormat === 'Universal' ||
      exFormat === 'Ambos';

    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      (ex.title || '').toLowerCase().includes(q) ||
      (ex.notes || '').toLowerCase().includes(q) ||
      (ex.description || '').toLowerCase().includes(q) ||
      (ex.objectives || []).some(o => o.toLowerCase().includes(q));

    return matchCategory && matchModality && matchSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-20 max-w-6xl mx-auto w-full space-y-5">
      {toastMsg && (
        <div className="fixed bottom-16 md:bottom-5 right-5 z-[90] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cabecera Editorial */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Biblioteca de Ejercicios</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Gestiona tus tareas privadas y explora el catálogo metodológico común listo para pizarra, MP4 y PDF
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowManageCategories(true)}
            className="h-9 flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Categorías</span>
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ejercicio, objetivo o nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Pestañas de Privacidad Estricta */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleTabSwitch('private')}
            className={`h-9 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              libraryTab === 'private'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Mis Ejercicios (Privados)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
              {savedExercises.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('community')}
            className={`h-9 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              libraryTab === 'community'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#059669]" />
            <span>Biblioteca Común &amp; Comunidad</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px]">
              {communityExercises.length}
            </span>
          </button>
        </div>

        <p className="text-[11.5px] text-slate-500">
          {libraryTab === 'private'
            ? '🔒 Tus ejercicios son 100% privados salvo que decidas compartir alguno manualmente.'
            : '🌍 12 tareas oficiales AM Manager con animación + ejercicios compartidos voluntariamente.'}
        </p>
      </div>

      {/* Filtros de Categoría y Formato */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto w-full custom-scrollbar pb-1 md:pb-0">
          {filterCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#059669] text-white border-[#059669] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-xs">
          {(['Todas', 'F11', 'F7'] as const).map(mod => (
            <button
              key={mod}
              type="button"
              onClick={() => setSelectedModality(mod)}
              className={`h-6 px-2.5 rounded-md font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                selectedModality === mod
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {mod === 'Todas' ? 'Todos' : mod}
            </button>
          ))}
        </div>
      </div>

      {/* Rejilla de Tarjetas */}
      {filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] border border-dashed border-slate-300 rounded-xl bg-white p-8">
          <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No se encontraron ejercicios</h3>
          <p className="text-xs text-slate-500 text-center max-w-sm">
            {libraryTab === 'private'
              ? 'Prueba a ajustar los filtros, guarda un ejercicio desde la Pizarra o clona tareas de la Biblioteca Común.'
              : 'Prueba a cambiar el filtro de categoría, formato o búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredExercises.map((exercise: Exercise) => {
            const mappedCategory = mapLegacyCategory(exercise.category || 'Otros');
            return (
              <ExerciseCard
                key={`${libraryTab}-${exercise.id}`}
                exercise={exercise}
                variant={libraryTab}
                categoryLabel={mappedCategory}
                categoryBadgeClass={getCategoryColor(mappedCategory)}
                isExportingVideo={exportingVideoId === exercise.id}
                exportProgress={exportProgress}
                isBusyVideo={Boolean(exportingVideoId)}
                isExportingPdf={exportingPdfId === exercise.id}
                isCloning={cloningId === exercise.id}
                isCloned={Boolean(clonedIds[exercise.id])}
                onPreview={() => setPreviewExercise(exercise)}
                onOpenInBoard={() => handleLoad(exercise)}
                onExportVideo={() => void handleExportVideo(exercise)}
                onExportPdf={() => void handleExportPdf(exercise)}
                onCloneToPrivate={libraryTab === 'community' ? () => void handleCloneToPrivate(exercise) : undefined}
                onToggleShare={libraryTab === 'private' ? () => void handleToggleShare(exercise) : undefined}
                onEdit={libraryTab === 'private' ? () => handleEdit(exercise) : undefined}
                onDelete={
                  libraryTab === 'private'
                    ? () => {
                        if (window.confirm('¿Estás seguro de eliminar este ejercicio privado?')) {
                          void deleteExercise(exercise.id);
                        }
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* MODAL: Editar Ejercicio */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">Editar Ejercicio</h2>
              <button onClick={() => setEditingExercise(null)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Título</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Duración (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value, 10) || 20 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Categoría</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                  >
                    {Array.from(new Set([...(customCategories || []), ...COMMUNITY_CATEGORIES])).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Modalidad</label>
                <select
                  value={editForm.modality}
                  onChange={(e) => setEditForm({ ...editForm, modality: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                >
                  <option value="Universal">Universal</option>
                  <option value="F7">Fútbol 7</option>
                  <option value="F11">Fútbol 11</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas / Explicación del Ejercicio</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Explica aquí el desarrollo, objetivos, reglas o variantes del ejercicio..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#059669] resize-y min-h-[110px]"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingExercise(null)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#059669] rounded-lg hover:bg-[#047857] transition-colors cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Categorías */}
      {showManageCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">Gestionar Categorías</h2>
              <button onClick={() => setShowManageCategories(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#059669]"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex items-center justify-center px-3.5 bg-[#059669] text-white rounded-lg font-bold hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(!customCategories || customCategories.length === 0) ? (
                  <p className="text-sm text-slate-500 text-center italic py-4">No hay categorías configuradas.</p>
                ) : (
                  (customCategories || []).map(cat => (
                    <div key={cat} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                      <span className="text-slate-800 text-sm font-semibold">{cat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowManageCategories(false)}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa */}
      {previewExercise && (
        <ExercisePreviewModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
        />
      )}
    </div>
  );
}
