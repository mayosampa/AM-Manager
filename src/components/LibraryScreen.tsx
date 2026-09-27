import { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import { PlaySquare, Download, Trash2, Search, Filter, Edit2, X, Plus, Settings } from 'lucide-react';
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
    'match': 'text-[#FF4B4B] border-[#FF4B4B]/20 bg-[#FF4B4B]/10',
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
  
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null);
  
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', modality: 'Universal', duration: 20 });
  
  // Modales de Categorías
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const filterCategories = ['Todas', ...(customCategories || [])];

  const handleEdit = (exercise: any) => {
    setEditingExercise(exercise.id);
    setEditForm({
      title: exercise.title || '',
      category: mapLegacyCategory(exercise.state?.laneOverlay || 'Otros'),
      modality: exercise.modality || 'Universal',
      duration: exercise.duration || 20
    });
  };

  const handleSaveEdit = () => {
    if (!editingExercise) return;
    const exercise = savedExercises.find(e => e.id === editingExercise);
    if (!exercise) return;
    
    const updatedExercise = {
      ...exercise,
      title: editForm.title,
      modality: editForm.modality,
      duration: editForm.duration,
      state: {
        ...(exercise.state || {}),
        laneOverlay: editForm.category
      }
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

  const filteredExercises = (savedExercises || []).filter(ex => {
    const exCategory = mapLegacyCategory(ex.state?.laneOverlay || 'Otros');
    const matchCategory = selectedCategory === 'Todas' || exCategory === selectedCategory;
    const matchModality = selectedModality === 'Todas' || (ex.modality === selectedModality || ex.modality === 'Universal');
    const matchSearch = (ex.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchModality && matchSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-20 p-6 md:p-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Biblioteca de Ejercicios</h1>
          <p className="text-[#6E6E75]">Gestiona y organiza tus tareas de entrenamiento</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowManageCategories(true)}
            className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white px-4 py-2.5 rounded-xl hover:bg-[#2A2A2E] transition-colors whitespace-nowrap"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Categorías</span>
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E75]" />
            <input 
              type="text"
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        {/* Categories Tab */}
        <div className="flex gap-2 overflow-x-auto w-full custom-scrollbar pb-2 md:pb-0">
          {filterCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                selectedCategory === cat 
                  ? 'bg-[#FF4B4B]/10 text-[#FF4B4B] border-[#FF4B4B]/30' 
                  : 'bg-[#1C1C1F] text-[#6E6E75] border-[#2A2A2E] hover:text-white hover:bg-[#2A2A2E]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Modality Filter */}
        <div className="flex items-center gap-2 bg-[#1C1C1F] p-1 rounded-lg border border-[#2A2A2E] shrink-0">
          {['Todas', 'F7', 'F11'].map(mod => (
            <button
              key={mod}
              onClick={() => setSelectedModality(mod as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedModality === mod 
                  ? 'bg-[#FF4B4B] text-black shadow-sm' 
                  : 'text-[#6E6E75] hover:text-white'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] border-2 border-dashed border-[#2A2A2E] rounded-2xl bg-[#1C1C1F]/50">
          <div className="w-16 h-16 bg-[#2A2A2E] rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-[#6E6E75]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron ejercicios</h3>
          <p className="text-[#6E6E75] text-center max-w-sm">
            Prueba a cambiar los filtros de bsqueda o crea un nuevo ejercicio desde la Pizarra Tctica.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredExercises.map(exercise => {
            const mappedCategory = mapLegacyCategory(exercise.state?.laneOverlay || 'Otros');
            return (
              <div key={exercise.id} className="group flex flex-col bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl overflow-hidden hover:border-[#FF4B4B]/30 transition-all shadow-sm hover:shadow-xl hover:shadow-[#FF4B4B]/5">
                {/* Header info */}
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${getCategoryColor(mappedCategory)}`}>
                      {mappedCategory}
                    </span>
                    <div className="flex gap-1">
                      {exercise.modality && exercise.modality !== 'Universal' && (
                        <span className="text-[10px] font-bold text-[#6E6E75] bg-[#121215] px-2 py-1 rounded-md">
                          {exercise.modality}
                        </span>
                      )}
                      {exercise.duration && (
                        <span className="text-[10px] font-bold text-[#6E6E75] bg-[#121215] px-2 py-1 rounded-md">
                          {exercise.duration}'
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight mb-2 line-clamp-2">{exercise.title || 'Sin Título'}</h3>
                  <p className="text-[#6E6E75] text-xs font-mono">ID: {exercise.id}</p>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-3 border-t border-[#2A2A2E] bg-[#121215] group-hover:bg-[#1A1A1D] transition-colors">
                  <button 
                    onClick={() => setPreviewExerciseId(exercise.id)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 text-[#6E6E75] hover:text-[#FF4B4B] hover:bg-[#FF4B4B]/5 transition-colors border-r border-[#2A2A2E]"
                  >
                    <Search className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Ver</span>
                  </button>
                  <button 
                    onClick={() => handleEdit(exercise)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 text-[#6E6E75] hover:text-white hover:bg-white/5 transition-colors border-r border-[#2A2A2E]"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Editar</span>
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('Ests seguro de eliminar este ejercicio?')) {
                        deleteExercise(exercise.id);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 text-[#6E6E75] hover:text-red-500 hover:bg-red-500/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Borrar</span>
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
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#2A2A2E]">
              <h2 className="text-xl font-bold text-white">Editar Ejercicio</h2>
              <button onClick={() => setEditingExercise(null)} className="text-[#6E6E75] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">Ttulo</label>
                <input 
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">Duracin (min)</label>
                  <input 
                    type="number"
                    min="1"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({...editForm, duration: parseInt(e.target.value) || 20})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">Categora</label>
                  <select 
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                  >
                    {(customCategories || []).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">Modalidad</label>
                <select 
                  value={editForm.modality}
                  onChange={(e) => setEditForm({...editForm, modality: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                >
                  <option value="Universal">Universal</option>
                  <option value="F7">Fútbol 7</option>
                  <option value="F11">Fútbol 11</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 bg-[#1C1C1F] border-t border-[#2A2A2E]">
              <button 
                onClick={() => setEditingExercise(null)}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-[#121215] border border-[#2A2A2E] rounded-xl hover:bg-[#2A2A2E] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 text-sm font-bold text-black bg-[#FF4B4B] rounded-xl hover:bg-[#FF4B4B]/90 transition-colors"
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
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#2A2A2E]">
              <h2 className="text-xl font-bold text-white">Gestionar Categorías</h2>
              <button onClick={() => setShowManageCategories(false)} className="text-[#6E6E75] hover:text-white">
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
                  className="flex-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                />
                <button 
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex items-center justify-center px-4 bg-[#FF4B4B] text-black rounded-xl font-bold hover:bg-[#FF4B4B]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(!customCategories || customCategories.length === 0) ? (
                  <p className="text-sm text-[#6E6E75] text-center italic py-4">No hay categorías configuradas.</p>
                ) : (
                  (customCategories || []).map(cat => (
                    <div key={cat} className="flex items-center justify-between bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-3">
                      <span className="text-white text-sm font-semibold">{cat}</span>
                      <button 
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-[#6E6E75] hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-6 bg-[#1C1C1F] border-t border-[#2A2A2E]">
              <button 
                onClick={() => setShowManageCategories(false)}
                className="w-full px-4 py-3 text-sm font-bold text-white bg-[#121215] border border-[#2A2A2E] rounded-xl hover:bg-[#2A2A2E] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Preview */}
      {previewExerciseId && (
        <ExercisePreviewModal
          exerciseId={previewExerciseId}
          onClose={() => setPreviewExerciseId(null)}
          onLoadToBoard={() => {
            if (onNavigate) {
              loadExerciseToBoard(previewExerciseId);
              onNavigate('tactics');
            }
          }}
        />
      )}
    </div>
  );
}
