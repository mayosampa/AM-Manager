import React, { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Clock, Eye, Plus, Trash2 } from 'lucide-react';
import { Exercise } from '../../../context/SessionContext';
import { PlannedExercise } from '../../../components/TrainingPlanner';
import {
  renderExerciseBoardDiagramDataUrl,
  SESSION_PHASES,
  SessionPhase,
  SessionPhaseConfig,
  summarizeExerciseMaterial,
} from '../domain/sessionPlanUtils';

interface SessionPhaseBlockProps {
  phase: SessionPhaseConfig;
  exercises: PlannedExercise[];
  libraryExercises: Exercise[];
  categories: string[];
  onAddFromLibrary: (exercise: Exercise, phaseId: SessionPhase) => void;
  onAddQuickTask: (task: { title: string; duration: number; category: string; dimensions: string; playersCount: string; objective: string; notes: string }, phaseId: SessionPhase) => void;
  onUpdateExercise: (localId: string, patch: Partial<PlannedExercise>) => void;
  onMoveExerciseOrder: (localId: string, direction: 'up' | 'down') => void;
  onRemoveExercise: (localId: string) => void;
  onPreviewExercise: (exercise: PlannedExercise) => void;
}

export const SessionPhaseBlock: React.FC<SessionPhaseBlockProps> = ({
  phase,
  exercises,
  libraryExercises,
  categories,
  onAddFromLibrary,
  onAddQuickTask,
  onUpdateExercise,
  onMoveExerciseOrder,
  onRemoveExercise,
  onPreviewExercise,
}) => {
  const [selectedLibId, setSelectedLibId] = useState('');
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickTask, setQuickTask] = useState({
    title: '',
    duration: phase.id === 'warmup' ? 15 : phase.id === 'cooldown' ? 10 : 25,
    category: phase.id === 'warmup' ? 'Calentamiento' : categories[0] || 'Táctica',
    dimensions: '',
    playersCount: '',
    objective: '',
    notes: '',
  });

  const phaseMinutes = exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);

  const handleLibraryPick = (id: string) => {
    setSelectedLibId('');
    const found = libraryExercises.find(e => e.id === id);
    if (found) onAddFromLibrary(found, phase.id);
  };

  const handleCreateQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.title.trim()) return;
    onAddQuickTask(quickTask, phase.id);
    setQuickTask(prev => ({ ...prev, title: '', dimensions: '', playersCount: '', objective: '', notes: '' }));
    setShowQuickForm(false);
  };

  return (
    <section className={`bg-[#0A0A0A] border ${phase.accentBorder} rounded-xl overflow-hidden`}>
      <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${phase.accentBg} ${phase.accentText}`}>
              {phase.badge}
            </span>
            <h2 className="text-[14px] font-semibold text-[#EDEDED]">{phase.title}</h2>
            <span className="text-[11px] font-mono text-[#888888]">
              · {exercises.length} {exercises.length === 1 ? 'tarea' : 'tareas'} ({phaseMinutes} min)
            </span>
          </div>
          <p className="text-[11.5px] text-[#737373] mt-0.5">{phase.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <BookOpen className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 pointer-events-none" />
            <select
              value={selectedLibId}
              onChange={e => e.target.value && handleLibraryPick(e.target.value)}
              aria-label={`Añadir ejercicio de biblioteca a ${phase.title}`}
              className="h-8 pl-8 pr-3 bg-[#121214] hover:bg-[#19191D] border border-[#27272A] rounded-md text-[12px] text-[#EDEDED] focus:outline-none cursor-pointer max-w-[230px]"
            >
              <option value="">+ Añadir desde Biblioteca ({libraryExercises.length})</option>
              {libraryExercises.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.duration || 20}&apos; · {ex.category})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickForm(prev => !prev)}
            className="h-8 px-3 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-semibold text-[12px] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Tarea en Fase</span>
          </button>
        </div>
      </div>

      {showQuickForm && (
        <form onSubmit={handleCreateQuick} className="p-4 bg-[#0E1210] border-b border-emerald-500/25 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
            <input
              type="text"
              required
              value={quickTask.title}
              onChange={e => setQuickTask({ ...quickTask, title: e.target.value })}
              placeholder="Título de la tarea (ej. Rondo 4v2 + transición)..."
              className="sm:col-span-2 h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]"
            />
            <input
              type="number"
              min={1}
              max={120}
              value={quickTask.duration}
              onChange={e => setQuickTask({ ...quickTask, duration: Number(e.target.value) || 15 })}
              placeholder="Min"
              className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] font-mono text-[#EDEDED]"
            />
            <input
              type="text"
              value={quickTask.dimensions}
              onChange={e => setQuickTask({ ...quickTask, dimensions: e.target.value })}
              placeholder="Espacio (ej. 30x25m)"
              className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]"
            />
            <input
              type="text"
              value={quickTask.playersCount}
              onChange={e => setQuickTask({ ...quickTask, playersCount: e.target.value })}
              placeholder="Jugadores (ej. 8v8+2)"
              className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]"
            />
            <select
              value={quickTask.category}
              onChange={e => setQuickTask({ ...quickTask, category: e.target.value })}
              className="h-8 px-2 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={quickTask.objective}
              onChange={e => setQuickTask({ ...quickTask, objective: e.target.value })}
              placeholder="Objetivo específico de la tarea..."
              className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={quickTask.notes}
                onChange={e => setQuickTask({ ...quickTask, notes: e.target.value })}
                placeholder="Descripción, reglas de provocación y variantes..."
                className="flex-1 h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]"
              />
              <button type="submit" className="h-8 px-3.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] cursor-pointer">
                Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="p-4 space-y-3">
        {exercises.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-[#1F1F1F] bg-[#070707] text-[#737373] text-[12px]">
            No hay ejercicios asignados a esta fase. Selecciona uno de tu Biblioteca arriba o pulsa «Crear Tarea en Fase».
          </div>
        ) : (
          exercises.map((ex, idx) => {
            const diagramUrl = renderExerciseBoardDiagramDataUrl(ex);
            const matSummary = summarizeExerciseMaterial(ex);
            return (
              <div key={ex.localId} className="p-3.5 rounded-lg bg-[#0E0E10] border border-[#202024] flex flex-col lg:flex-row gap-4">
                {/* Miniatura / Diagrama Táctico */}
                <div
                  onClick={() => onPreviewExercise(ex)}
                  className="w-full lg:w-44 h-28 rounded-md bg-[#09140D] border border-[#223026] overflow-hidden shrink-0 relative group cursor-pointer flex items-center justify-center"
                  title="Ver pizarra táctica y animación"
                >
                  {diagramUrl ? (
                    <img src={diagramUrl} alt={ex.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-mono text-[#666666] px-2 text-center">Sin diagrama táctico</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-medium text-white">
                    <Eye className="w-3.5 h-3.5" /> Ver Pizarra
                  </div>
                </div>

                {/* Campos Editables del Ejercicio */}
                <div className="flex-1 space-y-2.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={ex.title}
                        onChange={e => onUpdateExercise(ex.localId, { title: e.target.value })}
                        className="flex-1 h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[13px] font-semibold text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={phase.id}
                        onChange={e => onUpdateExercise(ex.localId, { phase: e.target.value as SessionPhase })}
                        className="h-7 px-2 bg-[#141417] border border-[#27272A] rounded text-[11px] text-[#A1A1AA] cursor-pointer"
                        title="Cambiar de fase"
                      >
                        {SESSION_PHASES.map(p => (
                          <option key={p.id} value={p.id}>{p.badge}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => onMoveExerciseOrder(ex.localId, 'up')} className="p-1.5 rounded bg-[#141417] hover:bg-[#1F1F24] text-[#A1A1AA] cursor-pointer" title="Subir">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => onMoveExerciseOrder(ex.localId, 'down')} className="p-1.5 rounded bg-[#141417] hover:bg-[#1F1F24] text-[#A1A1AA] cursor-pointer" title="Bajar">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => onRemoveExercise(ex.localId)} className="p-1.5 rounded bg-[#141417] hover:bg-red-500/15 text-[#888888] hover:text-red-400 cursor-pointer" title="Quitar de la sesión">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="flex items-center gap-1.5 bg-[#070708] border border-[#242428] rounded px-2 h-8">
                      <Clock className="w-3.5 h-3.5 text-[#737373]" />
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={ex.duration || 0}
                        onChange={e => onUpdateExercise(ex.localId, { duration: Number(e.target.value) || 0 })}
                        className="w-12 bg-transparent font-mono text-[12px] text-[#EDEDED] focus:outline-none"
                      />
                      <span className="text-[11px] font-mono text-[#737373]">min</span>
                    </div>
                    <input
                      type="text"
                      value={ex.dimensions || ''}
                      onChange={e => onUpdateExercise(ex.localId, { dimensions: e.target.value })}
                      placeholder="Dimensiones (ej. 30x25m)"
                      className="h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[11.5px] text-[#EDEDED] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={ex.playersCount || ''}
                      onChange={e => onUpdateExercise(ex.localId, { playersCount: e.target.value })}
                      placeholder="Nº Jugadores (ej. 8v8+2)"
                      className="h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[11.5px] text-[#EDEDED] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={ex.objective || ''}
                      onChange={e => onUpdateExercise(ex.localId, { objective: e.target.value })}
                      placeholder="Objetivo específico..."
                      className="h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[11.5px] text-[#EDEDED] focus:outline-none"
                    />
                  </div>

                  <textarea
                    value={ex.notes || ''}
                    onChange={e => onUpdateExercise(ex.localId, { notes: e.target.value })}
                    placeholder="Consignas tácticas, reglas de provocación, organización y variantes..."
                    rows={2}
                    className="w-full p-2 bg-[#070708] border border-[#242428] rounded text-[12px] text-[#D4D4D8] focus:outline-none focus:border-[#525252] resize-none"
                  />

                  {matSummary && (
                    <div className="text-[11px] font-mono text-emerald-400/90">
                      🧰 Material detectado en pizarra: {matSummary}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
