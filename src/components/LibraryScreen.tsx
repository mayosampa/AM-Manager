import { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import { PlaySquare, Trash2, Search, Filter, Edit2, X, Plus, Settings, FileText, Film, Video, Loader2 } from 'lucide-react';
import { ExercisePreviewModal } from './ExercisePreviewModal';

interface LibraryScreenProps {
  onNavigate?: (view: 'tactics') => void;
}

const getCategoryColor = (cat: string) => {
  const colors: Record<string, string> = {
    'Calentamiento': 'text-orange-400 border-orange-500/20 bg-orange-500/10',
    'Posesión': 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    'Transiciones': 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10',
    'Trabajo por Líneas': 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
    'Salida de Balón': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    'ABP': 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    'Otros': 'text-gray-400 border-gray-500/20 bg-gray-500/10',
    // Legacy
    'transition': 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10',
    'possession': 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    'buildup': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    'set-piece': 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    'match': 'text-[#EDEDED] border-[#333333] bg-[#161616]',
  };
  return colors[cat] || 'text-slate-400 border-slate-500/20 bg-slate-500/10';
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
  const { savedExercises, deleteExercise, loadExerciseToBoard, saveExercise } = useSession();
  const { customCategories, updateCustomCategories } = useTeam();
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedModality, setSelectedModality] = useState<'Todas' | 'F7' | 'F11'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [previewExercise, setPreviewExercise] = useState<any | null>(null);
  const [exportingVideoId, setExportingVideoId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', modality: 'Universal', duration: 20, notes: '' });

  const handleExportVideo = async (exercise: any) => {
    const scenes = exercise.scenes || exercise.frames || [];
    if (scenes.length < 2) return;
    if (exportingVideoId) return;

    setExportingVideoId(exercise.id);
    setExportProgress(0);

    try {
      const { exportTacticalVideo } = await import('../services/tacticalVideoExport');
      await exportTacticalVideo(
        {
          title: exercise.title || 'Ejercicio',
          category: mapLegacyCategory(exercise.category || exercise.state?.laneOverlay || 'Otros'),
          modality: exercise.modality || 'Universal',
          scenes,
        },
        (percent) => {
          setExportProgress(percent);
        }
      );
    } catch (err: any) {
      console.error('Error exportando vídeo táctico:', err);
      alert(err.message || 'No se pudo generar el vídeo táctico.');
    } finally {
      setExportingVideoId(null);
      setExportProgress(0);
    }
  };
  
  // Modales de Categorías
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const filterCategories = ['Todas', ...(customCategories || [])];

  const handleEdit = (exercise: any) => {
    setEditingExercise(exercise.id);
    setEditForm({
      title: exercise.title || '',
      category: mapLegacyCategory(exercise.category || exercise.state?.laneOverlay || 'Otros'),
      modality: exercise.modality || 'Universal',
      duration: exercise.duration || 20,
      notes: exercise.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingExercise) return;
    const exercise = savedExercises.find(e => e.id === editingExercise);
    if (!exercise) return;
    
    const updatedExercise = {
      ...exercise,
      title: editForm.title,
      category: editForm.category,
      modality: editForm.modality as 'F7' | 'F11' | 'Universal',
      duration: editForm.duration,
      notes: editForm.notes,
    };
    
    saveExercise(updatedExercise);
    setEditingExercise(null);
  };

  // --- Lógica Gestionar Categorías ---
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

  const handleLoad = (exercise: any) => {
    loadExerciseToBoard(exercise);
    if (onNavigate) {
      onNavigate('tactics');
    }
  };

  const filteredExercises = (savedExercises || []).filter((ex: any) => {
    const exCategory = mapLegacyCategory(ex.category || ex.state?.laneOverlay || 'Otros');
    const matchCategory = selectedCategory === 'Todas' || exCategory === selectedCategory;
    const matchModality = selectedModality === 'Todas' || (ex.modality === selectedModality || ex.modality === 'Universal');
    const matchSearch =
      (ex.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchModality && matchSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-20 p-5 md:p-8 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-5 border-b border-[#1F1F1F] gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-[#EDEDED] tracking-[-0.025em] mb-1">Biblioteca de Ejercicios</h1>
          <p className="text-[13px] text-[#737373]">Repositorio de tareas tácticas, rondos y ejercicios con notas de campo</p>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button 
            onClick={() => setShowManageCategories(true)}
            className="h-8 flex items-center gap-1.5 bg-[#0A0A0A] border border-[#262626] text-[#EDEDED] px-3 rounded-md text-[12px] font-medium hover:bg-[#141414] hover:border-[#3A3A3A] transition-colors whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 text-[#888888]" />
            <span>Categorías</span>
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
            <input 
              type="text"
              placeholder="Buscar ejercicio o nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-[#0A0A0A] border border-[#262626] rounded-md pl-9 pr-3 text-[12px] text-[#EDEDED] placeholder:text-[#666666] focus:outline-none focus:border-[#525252] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        {/* Categories Tab */}
        <div className="flex gap-1.5 overflow-x-auto w-full custom-scrollbar pb-2 md:pb-0">
          {filterCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`h-7 px-3 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === cat 
                  ? 'bg-[#EDEDED] text-[#0A0A0A] border-white' 
                  : 'bg-[#0A0A0A] text-[#888888] border-[#1F1F1F] hover:text-[#EDEDED] hover:border-[#333333]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Modality Filter */}
        <div className="flex items-center gap-1 bg-[#0A0A0A] p-0.5 rounded-md border border-[#1F1F1F] shrink-0">
          {['Todas', 'F7', 'F11'].map(mod => (
            <button
              key={mod}
              onClick={() => setSelectedModality(mod as any)}
              className={`h-6 px-2.5 rounded-[4px] font-mono text-[11px] font-medium transition-colors ${
                selectedModality === mod 
                  ? 'bg-[#EDEDED] text-[#0A0A0A]' 
                  : 'text-[#737373] hover:text-[#EDEDED]'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] border border-dashed border-[#262626] rounded-lg bg-[#0A0A0A]">
          <div className="w-10 h-10 bg-[#111111] border border-[#262626] rounded-md flex items-center justify-center mb-3">
            <Filter className="w-4 h-4 text-[#737373]" />
          </div>
          <h3 className="text-[14px] font-medium text-[#EDEDED] mb-1">No se encontraron ejercicios</h3>
          <p className="text-[12px] text-[#737373] text-center max-w-sm">
            Prueba a cambiar los filtros de búsqueda o guarda un nuevo ejercicio desde la Pizarra Táctica.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
          {filteredExercises.map((exercise: any) => {
            const mappedCategory = mapLegacyCategory(exercise.category || exercise.state?.laneOverlay || 'Otros');
            const framesCount = exercise.scenes?.length || exercise.frames?.length || 0;
            const hasAnimation = framesCount > 1;
            const isThisExporting = exportingVideoId === exercise.id;

            return (
              <div key={exercise.id} className="group flex flex-col bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden hover:border-[#3A3A3A] transition-colors">
                {/* Header info */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2.5">
                    <span className={`font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryColor(mappedCategory)}`}>
                      {mappedCategory}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasAnimation && (
                        <span className="font-mono text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1" title="Ejercicio animado">
                          <Film className="w-3 h-3" />
                          {framesCount} frames
                        </span>
                      )}
                      {exercise.modality && exercise.modality !== 'Universal' && (
                        <span className="font-mono text-[10px] font-medium text-[#A1A1AA] bg-[#141414] border border-[#262626] px-1.5 py-0.5 rounded">
                          {exercise.modality}
                        </span>
                      )}
                      {exercise.duration && (
                        <span className="font-mono text-[10px] font-medium text-[#A1A1AA] bg-[#141414] border border-[#262626] px-1.5 py-0.5 rounded">
                          {exercise.duration}'
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-[14px] font-medium text-[#EDEDED] leading-snug mb-1.5 line-clamp-2">{exercise.title || 'Sin Título'}</h3>
                  {exercise.notes ? (
                    <p className="text-[12px] text-[#888888] line-clamp-2 mb-3 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#737373] shrink-0 mt-0.5" />
                      <span>{exercise.notes}</span>
                    </p>
                  ) : null}
                  <p className="text-[#525252] text-[10px] font-mono mt-auto pt-2">ID · {exercise.id}</p>
                </div>

                {/* Actions Grid (5 botones equilibrados) */}
                <div className="grid grid-cols-5 border-t border-[#1F1F1F] bg-[#080808]">
                  <button 
                    onClick={() => handleLoad(exercise)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 text-[#888888] hover:text-[#EDEDED] hover:bg-[#141414] transition-colors border-r border-[#1F1F1F] cursor-pointer"
                    title="Cargar en Pizarra Táctica"
                  >
                    <PlaySquare className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Cargar</span>
                  </button>

                  <button
                    onClick={() => handleExportVideo(exercise)}
                    disabled={!hasAnimation || Boolean(exportingVideoId)}
                    title={
                      hasAnimation
                        ? isThisExporting
                          ? `Generando ${exportProgress}%...`
                          : 'Descargar animación a vídeo (.webm / .mp4)'
                        : 'Añade al menos 2 fotogramas en la pizarra para exportar vídeo'
                    }
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors border-r border-[#1F1F1F] ${
                      !hasAnimation
                        ? 'text-[#444444] cursor-not-allowed opacity-40'
                        : isThisExporting
                        ? 'text-emerald-400 bg-emerald-500/10 cursor-wait'
                        : 'text-[#888888] hover:text-emerald-400 hover:bg-[#141414] cursor-pointer'
                    }`}
                  >
                    {isThisExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span className="text-[9px] font-mono font-medium text-emerald-400">{exportProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Vídeo</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setPreviewExercise(exercise)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 text-[#888888] hover:text-[#EDEDED] hover:bg-[#141414] transition-colors border-r border-[#1F1F1F] cursor-pointer"
                    title="Previsualizar y Exportar PDF"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">PDF</span>
                  </button>
                  <button 
                    onClick={() => handleEdit(exercise)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 text-[#888888] hover:text-[#EDEDED] hover:bg-[#141414] transition-colors border-r border-[#1F1F1F] cursor-pointer"
                    title="Editar detalles"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Editar</span>
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('¿Estás seguro de eliminar este ejercicio?')) {
                        deleteExercise(exercise.id);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 text-[#888888] hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                    title="Eliminar ejercicio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Borrar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Edit Exercise */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#1F1F1F]">
              <h2 className="text-xl font-bold text-white">Editar Ejercicio</h2>
              <button onClick={() => setEditingExercise(null)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Título</label>
                <input 
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Duración (min)</label>
                  <input 
                    type="number"
                    min="1"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({...editForm, duration: parseInt(e.target.value) || 20})}
                    className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252]"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Categoría</label>
                  <select 
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252]"
                  >
                    {(customCategories || []).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Modalidad</label>
                <select 
                  value={editForm.modality}
                  onChange={(e) => setEditForm({...editForm, modality: e.target.value})}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252]"
                >
                  <option value="Universal">Universal</option>
                  <option value="F7">Fútbol 7</option>
                  <option value="F11">Fútbol 11</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Notas / Explicación del Ejercicio</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Explica aquí el desarrollo, objetivos, reglas o variantes del ejercicio..."
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252] resize-y min-h-[120px]"
                />
              </div>
            </div>
            
            <div className="flex gap-3 p-6 bg-[#111111] border-t border-[#1F1F1F]">
              <button 
                onClick={() => setEditingExercise(null)}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-[#0A0A0A] border border-[#1F1F1F] rounded-md hover:bg-[#1A1A1A] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 text-sm font-bold text-black bg-[#EDEDED] rounded-md hover:bg-white transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Categorías */}
      {showManageCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#1F1F1F]">
              <h2 className="text-xl font-bold text-white">Gestionar Categorías</h2>
              <button onClick={() => setShowManageCategories(false)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-[#525252]"
                />
                <button 
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex items-center justify-center px-4 bg-[#EDEDED] text-[#0A0A0A] rounded-md font-bold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(!customCategories || customCategories.length === 0) ? (
                  <p className="text-sm text-[#888888] text-center italic py-4">No hay categorías configuradas.</p>
                ) : (
                  (customCategories || []).map(cat => (
                    <div key={cat} className="flex items-center justify-between bg-[#111111] border border-[#1F1F1F] rounded-lg p-3">
                      <span className="text-white text-sm font-semibold">{cat}</span>
                      <button 
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-[#888888] hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-6 bg-[#111111] border-t border-[#1F1F1F]">
              <button 
                onClick={() => setShowManageCategories(false)}
                className="w-full px-4 py-3 text-sm font-bold text-white bg-[#0A0A0A] border border-[#1F1F1F] rounded-md hover:bg-[#1A1A1A] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Preview */}
      {previewExercise && (
        <ExercisePreviewModal 
          exercise={previewExercise} 
          onClose={() => setPreviewExercise(null)} 
        />
      )}
    </div>
  );
}
