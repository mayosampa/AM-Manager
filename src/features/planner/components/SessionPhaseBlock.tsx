import React, { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Check, Clock, Edit2, Eye, Plus, Trash2 } from 'lucide-react';
import { Exercise } from '../../../context/SessionContext';
import { PlannedExercise } from '../../../components/TrainingPlanner';
import {
  getPhaseTheme,
  PHASE_COLOR_THEMES,
  PhaseColorAccent,
  renderExerciseBoardDiagramDataUrl,
  SessionPhaseItem,
  summarizeExerciseMaterial,
} from '../domain/sessionPlanUtils';

interface SessionPhaseBlockProps {
  phase: SessionPhaseItem;
  phaseIndex: number;
  totalPhases: number;
  allPhases: SessionPhaseItem[];
  libraryExercises: Exercise[];
  categories: string[];
  onUpdatePhaseMeta: (phaseId: string, patch: Partial<Pick<SessionPhaseItem, 'title' | 'subtitle' | 'colorAccent'>>) => void;
  onMovePhaseOrder: (phaseId: string, direction: 'up' | 'down') => void;
  onDeletePhase: (phaseId: string) => void;
  onAddFromLibrary: (exercise: Exercise, phaseId: string) => void;
  onAddQuickTask: (
    task: { title: string; duration: number; category: string; dimensions: string; playersCount: string; objective: string; notes: string },
    phaseId: string
  ) => void;
  onUpdateExercise: (phaseId: string, localId: string, patch: Partial<PlannedExercise>) => void;
  onMoveExerciseOrder: (phaseId: string, localId: string, direction: 'up' | 'down') => void;
  onMoveExerciseToPhase: (localId: string, fromPhaseId: string, toPhaseId: string) => void;
  onRemoveExercise: (phaseId: string, localId: string) => void;
  onPreviewExercise: (exercise: PlannedExercise) => void;
}

export const SessionPhaseBlock: React.FC<SessionPhaseBlockProps> = ({
  phase,
  phaseIndex,
  totalPhases,
  allPhases,
  libraryExercises,
  categories,
  onUpdatePhaseMeta,
  onMovePhaseOrder,
  onDeletePhase,
  onAddFromLibrary,
  onAddQuickTask,
  onUpdateExercise,
  onMoveExerciseOrder,
  onMoveExerciseToPhase,
  onRemoveExercise,
  onPreviewExercise,
}) => {
  const [selectedLibId, setSelectedLibId] = useState('');
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [quickTask, setQuickTask] = useState({
    title: '',
    duration: 20,
    category: categories[0] || 'Táctica',
    dimensions: '',
    playersCount: '',
    objective: '',
    notes: '',
  });

  const exercises = phase.exercises || [];
  const phaseMinutes = exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);
  const theme = getPhaseTheme(phase.colorAccent);

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
    <section className={`bg-[#0A0A0A] border ${theme.accentBorder} rounded-xl overflow-hidden`}>
      <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editingHeader ? (
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={phase.title}
                  onChange={e => onUpdatePhaseMeta(phase.id, { title: e.target.value })}
                  placeholder="Título de la fase (ej. Fase 3: Balón Parado ABP)"
                  className="flex-1 min-w-[220px] h-8 px-2.5 bg-[#050505] border border-[#2E2E32] rounded text-[13px] font-semibold text-[#EDEDED] focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  {(Object.keys(PHASE_COLOR_THEMES) as PhaseColorAccent[]).map(acc => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => onUpdatePhaseMeta(phase.id, { colorAccent: acc })}
                      className={`h-7 px-2 rounded text-[10px] font-mono border cursor-pointer ${
                        (phase.colorAccent || 'emerald') === acc
                          ? `${PHASE_COLOR_THEMES[acc].accentBg} ${PHASE_COLOR_THEMES[acc].accentText} ${PHASE_COLOR_THEMES[acc].accentBorder}`
                          : 'bg-[#121214] text-[#737373] border-[#242428]'
                      }`}
                    >
                      {PHASE_COLOR_THEMES[acc].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingHeader(false)}
                  className="h-8 px-2.5 rounded bg-emerald-500 text-black text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Listo
                </button>
              </div>
              <input
                type="text"
                value={phase.subtitle || ''}
                onChange={e => onUpdatePhaseMeta(phase.id, { subtitle: e.target.value })}
                placeholder="Subtítulo o descripción de la fase (opcional)..."
                className="w-full h-7 px-2.5 bg-[#050505] border border-[#242428] rounded text-[11.5px] text-[#A1A1AA] focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${theme.accentBg} ${theme.accentText}`}>
                  Fase {phaseIndex + 1}
                </span>
                <h2
                  onClick={() => setEditingHeader(true)}
                  className="text-[14px] font-semibold text-[#EDEDED] hover:text-emerald-300 cursor-pointer flex items-center gap-1.5"
                  title="Haz clic para renombrar esta fase"
                >
                  <span>{phase.title}</span>
                  <Edit2 className="w-3 h-3 text-[#737373]" />
                </h2>
                <span className="text-[11px] font-mono text-[#888888]">
                  · {exercises.length} {exercises.length === 1 ? 'tarea' : 'tareas'} ({phaseMinutes} min)
                </span>
              </div>
              {phase.subtitle && <p className="text-[11.5px] text-[#737373] mt-0.5">{phase.subtitle}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <div className="relative flex items-center">
            <BookOpen className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 pointer-events-none" />
            <select
              value={selectedLibId}
              onChange={e => e.target.value && handleLibraryPick(e.target.value)}
              aria-label={`Añadir ejercicio de biblioteca a ${phase.title}`}
              className="h-8 pl-8 pr-2.5 bg-[#121214] hover:bg-[#19191D] border border-[#27272A] rounded-md text-[11.5px] text-[#EDEDED] focus:outline-none cursor-pointer max-w-[205px]"
            >
              <option value="">+ Biblioteca ({libraryExercises.length})</option>
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
            className="h-8 px-2.5 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-semibold text-[11.5px] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tarea Rápida</span>
          </button>

          <button
            type="button"
            onClick={() => setEditingHeader(prev => !prev)}
            className="h-8 px-2 rounded-md bg-[#141417] hover:bg-[#1E1E24] border border-[#27272A] text-[#A1A1AA] hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
            title="Renombrar fase o cambiar color"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={phaseIndex === 0}
            onClick={() => onMovePhaseOrder(phase.id, 'up')}
            className="h-8 w-8 rounded-md bg-[#141417] hover:bg-[#1E1E24] border border-[#27272A] text-[#A1A1AA] flex items-center justify-center cursor-pointer disabled:opacity-30"
            title="Subir Fase"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={phaseIndex >= totalPhases - 1}
            onClick={() => onMovePhaseOrder(phase.id, 'down')}
            className="h-8 w-8 rounded-md bg-[#141417] hover:bg-[#1E1E24] border border-[#27272A] text-[#A1A1AA] flex items-center justify-center cursor-pointer disabled:opacity-30"
            title="Bajar Fase"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDeletePhase(phase.id)}
            className="h-8 px-2.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            title="Eliminar esta fase completa de la sesión"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eliminar Fase</span>
          </button>
        </div>
      </div>

      {showQuickForm && (
        <form onSubmit={handleCreateQuick} className="p-4 bg-[#0E1210] border-b border-emerald-500/25 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
            <input type="text" required value={quickTask.title} onChange={e => setQuickTask({ ...quickTask, title: e.target.value })} placeholder="Título de la tarea (ej. Rondo 4v2 + transición)..." className="sm:col-span-2 h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]" />
            <input type="number" min={1} max={120} value={quickTask.duration} onChange={e => setQuickTask({ ...quickTask, duration: Number(e.target.value) || 15 })} placeholder="Min" className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] font-mono text-[#EDEDED]" />
            <input type="text" value={quickTask.dimensions} onChange={e => setQuickTask({ ...quickTask, dimensions: e.target.value })} placeholder="Espacio (ej. 30x25m)" className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]" />
            <input type="text" value={quickTask.playersCount} onChange={e => setQuickTask({ ...quickTask, playersCount: e.target.value })} placeholder="Jugadores (ej. 8v8+2)" className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]" />
            <select value={quickTask.category} onChange={e => setQuickTask({ ...quickTask, category: e.target.value })} className="h-8 px-2 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input type="text" value={quickTask.objective} onChange={e => setQuickTask({ ...quickTask, objective: e.target.value })} placeholder="Objetivo específico de la tarea..." className="h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]" />
            <div className="flex gap-2">
              <input type="text" value={quickTask.notes} onChange={e => setQuickTask({ ...quickTask, notes: e.target.value })} placeholder="Descripción, reglas de provocación y variantes..." className="flex-1 h-8 px-2.5 bg-[#050505] border border-[#262626] rounded text-[12px] text-[#EDEDED]" />
              <button type="submit" className="h-8 px-3.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] cursor-pointer">Guardar</button>
            </div>
          </div>
        </form>
      )}

      <div className="p-4 space-y-3">
        {exercises.length === 0 ? (
          <div className="p-5 text-center rounded-lg border border-dashed border-[#1F1F1F] bg-[#070707] text-[#737373] text-[12px]">
            Sin tareas en esta fase. Añade un ejercicio de la Biblioteca, crea una Tarea Rápida o elimina esta fase si hoy no la necesitas.
          </div>
        ) : (
          exercises.map((ex, idx) => {
            const diagramUrl = renderExerciseBoardDiagramDataUrl(ex);
            const matSummary = summarizeExerciseMaterial(ex);
            return (
              <div key={ex.localId} className="p-3.5 rounded-lg bg-[#0E0E10] border border-[#202024] flex flex-col lg:flex-row gap-4">
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

                <div className="flex-1 space-y-2.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">#{idx + 1}</span>
                      <input type="text" value={ex.title} onChange={e => onUpdateExercise(phase.id, ex.localId, { title: e.target.value })} className="flex-1 h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[13px] font-semibold text-[#EDEDED] focus:outline-none focus:border-[#525252]" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {allPhases.length > 1 && (
                        <select
                          value={phase.id}
                          onChange={e => onMoveExerciseToPhase(ex.localId, phase.id, e.target.value)}
                          className="h-7 px-2 bg-[#141417] border border-[#27272A] rounded text-[11px] text-[#A1A1AA] cursor-pointer max-w-[160px]"
                          title="Mover tarea a otra fase"
                        >
                          {allPhases.map((p, i) => (
                            <option key={p.id} value={p.id}>Fase {i + 1}: {p.title}</option>
                          ))}
                        </select>
                      )}
                      <button type="button" onClick={() => onMoveExerciseOrder(phase.id, ex.localId, 'up')} className="p-1.5 rounded bg-[#141417] hover:bg-[#1F1F24] text-[#A1A1AA] cursor-pointer" title="Subir tarea"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => onMoveExerciseOrder(phase.id, ex.localId, 'down')} className="p-1.5 rounded bg-[#141417] hover:bg-[#1F1F24] text-[#A1A1AA] cursor-pointer" title="Bajar tarea"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => onRemoveExercise(phase.id, ex.localId)} className="p-1.5 rounded bg-[#141417] hover:bg-red-500/15 text-[#888888] hover:text-red-400 cursor-pointer" title="Quitar tarea"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="flex items-center gap-1.5 bg-[#070708] border border-[#242428] rounded px-2 h-8">
                      <Clock className="w-3.5 h-3.5 text-[#737373]" />
                      <input type="number" min={1} max={120} value={ex.duration || 0} onChange={e => onUpdateExercise(phase.id, ex.localId, { duration: Number(e.target.value) || 0 })} className="w-12 bg-transparent font-mono text-[12px] text-[#EDEDED] focus:outline-none" />
                      <span className="text-[11px] font-mono text-[#737373]">min</span>
                    </div>
                    <input type="text" value={ex.dimensions || ''} onChange={e => onUpdateExercise(phase.id, ex.localId, { dimensions: e.target.value })} placeholder="Dimensiones (ej. 30x25m)" className="h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[11.5px] text-[#EDEDED] focus:outline-none" />
                    <input type="text" value={ex.playersCount || ''} onChange={e => onUpdateExercise(phase.id, ex.localId, { playersCount: e.target.value })} placeholder="Nº Jugadores (ej. 8v8+2)" className="h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[11.5px] text-[#EDEDED] focus:outline-none" />
                    <input type="text" value={ex.objective || ''} onChange={e => onUpdateExercise(phase.id, ex.localId, { objective: e.target.value })} placeholder="Objetivo específico..." className="h-8 px-2.5 bg-[#070708] border border-[#242428] rounded text-[11.5px] text-[#EDEDED] focus:outline-none" />
                  </div>

                  <textarea value={ex.notes || ''} onChange={e => onUpdateExercise(phase.id, ex.localId, { notes: e.target.value })} placeholder="Consignas tácticas, reglas de provocación, organización y variantes..." rows={2} className="w-full p-2 bg-[#070708] border border-[#242428] rounded text-[12px] text-[#D4D4D8] focus:outline-none focus:border-[#525252] resize-none" />
                  {matSummary && <div className="text-[11px] font-mono text-emerald-400/90">🧰 Material detectado en pizarra: {matSummary}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
