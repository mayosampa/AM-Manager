import React, { useMemo, useState } from 'react';
import { Clock, Globe, Lock, Plus, Ruler, Search, Users, X } from 'lucide-react';
import { Exercise } from '../../../context/SessionContext';
import { getOrRenderExerciseThumbnail } from '../../../services/tacticalThumbnail';
import { COMMUNITY_CATEGORIES } from '../../../services/officialCommunityExercises';

interface LibraryExercisePickerModalProps {
  isOpen: boolean;
  phaseTitle: string;
  privateExercises: Exercise[];
  communityExercises: Exercise[];
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export const LibraryExercisePickerModal: React.FC<LibraryExercisePickerModalProps> = ({
  isOpen,
  phaseTitle,
  privateExercises,
  communityExercises,
  onClose,
  onSelect,
}) => {
  const [tab, setTab] = useState<'private' | 'community'>(
    privateExercises.length > 0 ? 'private' : 'community'
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [formatFilter, setFormatFilter] = useState<'Todos' | 'F11' | 'F7'>('Todos');

  const sourceList = tab === 'private' ? privateExercises : communityExercises;

  const categories = useMemo(() => {
    const dynamic = sourceList.map(ex => ex.category).filter(Boolean);
    return ['Todas', ...Array.from(new Set([...COMMUNITY_CATEGORIES, ...dynamic]))];
  }, [sourceList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceList.filter(ex => {
      const catMatch = categoryFilter === 'Todas' || ex.category === categoryFilter;
      const fmt = ex.format || ex.modality || 'Universal';
      const fmtMatch =
        formatFilter === 'Todos' || fmt === formatFilter || fmt === 'Universal' || fmt === 'Ambos';
      const qMatch =
        !q ||
        (ex.title || '').toLowerCase().includes(q) ||
        (ex.notes || '').toLowerCase().includes(q) ||
        (ex.description || '').toLowerCase().includes(q);
      return catMatch && fmtMatch && qMatch;
    });
  }, [sourceList, categoryFilter, formatFilter, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden text-slate-900">
        {/* Cabecera */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              Añadir Ejercicio a &ldquo;{phaseTitle}&rdquo;
            </h3>
            <p className="text-[11.5px] text-slate-500">
              Elige tareas de tu biblioteca privada o de la Biblioteca Común &amp; Comunidad
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas + Buscador + Filtros */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg gap-1 self-start">
              <button
                type="button"
                onClick={() => {
                  setTab('private');
                  setCategoryFilter('Todas');
                }}
                className={`h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'private'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Mis Ejercicios ({privateExercises.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('community');
                  setCategoryFilter('Todas');
                }}
                className={`h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'community'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-[#059669]" />
                <span>Biblioteca Común &amp; Comunidad ({communityExercises.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar tarea..."
                  className="w-full h-8 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                />
              </div>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as 'Todos' | 'F11' | 'F7')}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="F11">F11</option>
                <option value="F7">F7</option>
              </select>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#059669] text-white border-[#059669]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Ejercicios */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 bg-slate-50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center bg-white border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
              No hay tareas que coincidan con estos filtros en{' '}
              <strong>{tab === 'private' ? 'Mis Ejercicios' : 'Biblioteca Común'}</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(ex => {
                const thumb = getOrRenderExerciseThumbnail(ex);
                const duration = ex.duration || ex.durationMin || 20;
                const fmt = ex.format || (ex.modality !== 'Universal' ? ex.modality : 'Ambos');
                return (
                  <div
                    key={`${tab}-${ex.id}`}
                    className="bg-white border border-slate-200 rounded-lg p-3 flex gap-3 hover:border-emerald-300 transition-colors shadow-xs"
                  >
                    <div className="w-28 h-20 rounded-md bg-[#14532d] overflow-hidden border border-slate-200 shrink-0">
                      {thumb ? (
                        <img src={thumb} alt={ex.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669] truncate">
                            {ex.category} · {fmt}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                            <Clock className="w-3 h-3" />
                            {duration}&apos;
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {ex.title}
                        </h4>
                        {(ex.dimensions || ex.playersCount) && (
                          <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-500">
                            {ex.dimensions && (
                              <span className="inline-flex items-center gap-0.5">
                                <Ruler className="w-2.5 h-2.5" /> {ex.dimensions}
                              </span>
                            )}
                            {ex.playersCount && (
                              <span className="inline-flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" /> {ex.playersCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(ex);
                          onClose();
                        }}
                        className="self-start h-7 px-2.5 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir a fase</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
