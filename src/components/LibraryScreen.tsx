import { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { PlaySquare, Download, Trash2, Search, Filter, Edit2, X } from 'lucide-react';
import { ExercisePreviewModal } from './ExercisePreviewModal';

interface LibraryScreenProps {
  onNavigate?: (view: 'tactics') => void;
}

const CATEGORIES = [
  'Todas',
  'Calentamiento',
  'Posesión',
  'Transiciones',
  'Trabajo por Líneas',
  'Salida de Balón',
  'ABP',
  'Otros'
];

const CategoryColors: Record<string, string> = {
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
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedModality, setSelectedModality] = useState<'Todas' | 'F7' | 'F11'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', category: 'Posesión', duration: 15, modality: 'Universal' });

  const handleEditClick = (exercise: any) => {
    setEditingExercise(exercise);
    setEditForm({
      title: exercise.title || '',
      category: exercise.category || 'Posesión',
      duration: exercise.duration || 15,
      modality: exercise.modality || exercise.exerciseModality || 'Universal'
    });
  };

  const handleEditSave = () => {
    if (!editingExercise) return;
    saveExercise({
      ...editingExercise,
      title: editForm.title,
      category: editForm.category,
      duration: editForm.duration,
      modality: editForm.modality
    });
    setEditingExercise(null);
  };

  const handleLoad = (exercise: any) => {
    loadExerciseToBoard(exercise);
    if (onNavigate) {
      onNavigate('tactics');
    }
  };

  const filteredExercises = savedExercises.filter(ex => {
    const mappedCat = mapLegacyCategory(ex.category);
    
    // 1. Comprobación de categoría
    const matchCategory = selectedCategory === "Todas" || mappedCat === selectedCategory;
    
    // 2. Comprobación estricta de modalidad
    // Los ejercicios antiguos sin modalidad se asumen como 'Universal'.
    // Si se selecciona 'F7' o 'F11', SOLO se muestran los que coincidan exactamente, ocultando los 'Universal'.
    const exerciseMod = (ex as any).exerciseModality || ex.modality || "Universal";
    const matchModality = selectedModality === "Todas" || exerciseMod === selectedModality;
    
    // 3. Comprobación de búsqueda
    const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchCategory && matchModality && matchesSearch;
  });

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Biblioteca de Ejercicios</h1>
          <p className="text-[#6E6E75] text-sm mt-1">Gestiona tus rutinas, jugadas y entrenamientos guardados.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E75]" />
            <input 
              type="text" 
              placeholder="Buscar ejercicio..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Filter Container */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Categories Tabs */}
        <div className="flex flex-wrap items-center gap-6 border-b border-gray-800 pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`font-bold text-sm transition-colors ${
                selectedCategory === cat 
                  ? 'text-red-500 border-b-2 border-red-500 pb-2 -mb-[10px]' 
                  : 'text-gray-400 hover:text-gray-200 cursor-pointer pb-2'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Modality Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['Todas', 'F7', 'F11'].map(mod => (
            <button
              key={mod}
              onClick={() => setSelectedModality(mod as 'Todas' | 'F7' | 'F11')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                selectedModality === mod
                  ? 'bg-red-500 text-white'
                  : 'bg-[#1C1C1F] text-[#6E6E75] hover:text-white border border-[#2A2A2E]'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {filteredExercises.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#2A2A2E] rounded-2xl bg-[#121215]/50 p-10">
          <PlaySquare className="w-12 h-12 text-[#2A2A2E] mb-4" />
          <h3 className="text-white font-medium text-lg mb-1">Aún no hay ejercicios aquí</h3>
          <p className="text-[#6E6E75] text-sm text-center max-w-md">
            Ve a la Pizarra Táctica, crea tu escena y guárdala con esta categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredExercises.map(exercise => {
            const mappedCat = mapLegacyCategory(exercise.category);
            return (
              <div key={exercise.id} className="bg-[#121215] border border-[#2A2A2E] rounded-2xl overflow-hidden group hover:border-[#FF4B4B]/50 transition-all flex flex-col">
                <div className="aspect-video bg-[#1C1C1F] relative overflow-hidden border-b border-[#2A2A2E]">
                  {exercise.thumbnailUrl ? (
                    <img src={exercise.thumbnailUrl} alt={exercise.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1C1C1F]">
                      <PlaySquare className="w-8 h-8 text-[#2A2A2E]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button 
                      onClick={() => setPreviewExercise(exercise)}
                      className="px-4 py-2 bg-emerald-500 text-black rounded-lg font-bold text-sm hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
                    >
                      <PlaySquare className="w-4 h-4" /> Mostrar
                    </button>
                    <button 
                      onClick={() => handleLoad(exercise)}
                      className="px-4 py-2 bg-[#FF4B4B] text-black rounded-lg font-bold text-sm hover:scale-105 transition-transform shadow-lg"
                    >
                      Cargar en Pizarra
                    </button>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold truncate text-lg" title={exercise.title}>{exercise.title}</h3>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md capitalize border ${CategoryColors[mappedCat] || CategoryColors['Otros']}`}>
                        {mappedCat}
                      </span>
                      {exercise.modality && exercise.modality !== 'Universal' && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-md border bg-[#1C1C1F] text-white border-[#2A2A2E]">
                          {exercise.modality}
                        </span>
                      )}
                      {exercise.duration && (
                        <span className="text-xs font-medium text-gray-400">⏱️ {exercise.duration}'</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEditClick(exercise)}
                        className="p-1.5 text-[#6E6E75] hover:text-white transition-colors" 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteExercise(exercise.id)}
                        className="p-1.5 text-[#6E6E75] hover:text-[#E63939] transition-colors" 
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog Modal */}
      {editingExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Editar Ejercicio</h3>
              <button onClick={() => setEditingExercise(null)} className="text-[#6E6E75] hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Título</label>
                <input 
                  type="text" 
                  placeholder="Ej: Posesión 4v4 + comodines" 
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Categoría</label>
                <select 
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                >
                  <option value="Calentamiento">Calentamiento</option>
                  <option value="Posesión">Posesión</option>
                  <option value="Transiciones">Transiciones</option>
                  <option value="Trabajo por Líneas">Trabajo por Líneas</option>
                  <option value="Salida de Balón">Salida de Balón</option>
                  <option value="ABP">ABP</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración (minutos)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 15" 
                  min="1"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({...editForm, duration: Number(e.target.value)})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                />
              </div>
              
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Modalidad</label>
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

            <button 
               onClick={handleEditSave}
               disabled={!editForm.title.trim() || editForm.duration < 1}
               className="w-full py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-400 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewExercise && (
        <ExercisePreviewModal 
          exercise={previewExercise} 
          onClose={() => setPreviewExercise(null)} 
        />
      )}

    </div>
  );
}
