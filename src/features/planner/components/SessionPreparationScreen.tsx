import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Exercise, useSession } from '../../../context/SessionContext';
import { useTeam } from '../../../context/TeamContext';
import { db } from '../../../services/db';
import { cacheService } from '../../../services/cacheService';
import { isActiveRoster } from '../../squad/domain/availability';
import { DailyPlan, PlannedExercise } from '../../../components/TrainingPlanner';
import { ExercisePreviewModal } from '../../../components/ExercisePreviewModal';
import {
  buildFullSessionWhatsappText,
  exportSessionSheetPDF,
} from '../../../services/sessionSheetExport';
import {
  createDefaultSessionPhases,
  getEffectiveSessionPhases,
  PhaseColorAccent,
  SessionPhaseItem,
  syncDayPlanWithPhases,
} from '../domain/sessionPlanUtils';
import { SessionHeaderCard } from './SessionHeaderCard';
import { SessionPhaseBlock } from './SessionPhaseBlock';
import { SessionAttendanceAndNotesPanel } from './SessionAttendanceAndNotesPanel';

export interface SessionPreparationScreenProps {
  selectedDateKey: string;
  onChangeDateKey: (dateKey: string) => void;
  onBackToCalendar?: () => void;
}

const createEmptyDay = (dateString: string, teamId?: string): DailyPlan => ({
  dateString,
  type: 'training',
  plannedExercises: [],
  isMatchDay: false,
  isRestDay: false,
  playersNeeded: 22,
  teamId,
});

const mapCategoryLabel = (cat: string) => {
  if (cat === 'transition') return 'Transiciones';
  if (cat === 'possession') return 'Posesión';
  if (cat === 'buildup') return 'Salida de Balón';
  if (cat === 'set-piece') return 'ABP';
  return cat || 'Táctica';
};

const ACCENT_CYCLE: PhaseColorAccent[] = ['amber', 'emerald', 'cyan', 'purple', 'rose'];

export const SessionPreparationScreen: React.FC<SessionPreparationScreenProps> = ({
  selectedDateKey,
  onChangeDateKey,
  onBackToCalendar,
}) => {
  const { savedExercises, saveExercise } = useSession();
  const { activeTeam, customCategories, teamSettings } = useTeam();

  const [seasonPlan, setSeasonPlan] = useState<Record<string, DailyPlan>>(() =>
    cacheService.get<Record<string, DailyPlan>>(
      activeTeam?.id ? `plan_${activeTeam.id}` : 'global_plan',
      {}
    )
  );
  const [copiedWa, setCopiedWa] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<PlannedExercise | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 3600);
  };

  useEffect(() => {
    let mounted = true;
    db.getSeasonPlan(activeTeam?.id)
      .then(plan => {
        if (mounted && plan) setSeasonPlan(plan as Record<string, DailyPlan>);
      })
      .catch(console.error);
    return () => {
      mounted = false;
    };
  }, [activeTeam?.id]);

  const dayPlan: DailyPlan = useMemo(
    () => seasonPlan[selectedDateKey] || createEmptyDay(selectedDateKey, activeTeam?.id),
    [seasonPlan, selectedDateKey, activeTeam?.id]
  );

  const phases: SessionPhaseItem[] = useMemo(
    () => getEffectiveSessionPhases(dayPlan),
    [dayPlan]
  );

  const rosterPlayers = useMemo(
    () => (activeTeam?.players || []).filter(isActiveRoster),
    [activeTeam?.players]
  );

  const persistDayPlan = (patch: Partial<DailyPlan>) => {
    const current = seasonPlan[selectedDateKey] || createEmptyDay(selectedDateKey, activeTeam?.id);
    const updated: DailyPlan = {
      ...current,
      ...patch,
      dateString: selectedDateKey,
      teamId: current.teamId || activeTeam?.id,
    };
    const nextPlan = { ...seasonPlan, [selectedDateKey]: updated };
    setSeasonPlan(nextPlan);
    db.saveSeasonPlan(nextPlan, activeTeam?.id).catch(console.error);
  };

  const commitPhases = (nextPhases: SessionPhaseItem[]) => {
    const synced = syncDayPlanWithPhases(nextPhases);
    persistDayPlan({
      type: dayPlan.isMatchDay ? 'match' : 'training',
      isRestDay: false,
      customPhases: synced.customPhases,
      plannedExercises: synced.plannedExercises,
    });
  };

  const handleUpdatePhaseMeta = (
    phaseId: string,
    patch: Partial<Pick<SessionPhaseItem, 'title' | 'subtitle' | 'colorAccent'>>
  ) => {
    commitPhases(phases.map(p => (p.id === phaseId ? { ...p, ...patch } : p)));
  };

  const handleMovePhaseOrder = (phaseId: string, direction: 'up' | 'down') => {
    const list = [...phases];
    const idx = list.findIndex(p => p.id === phaseId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const [removed] = list.splice(idx, 1);
    list.splice(targetIdx, 0, removed);
    commitPhases(list);
  };

  const handleDeletePhase = (phaseId: string) => {
    commitPhases(phases.filter(p => p.id !== phaseId));
    showToast('🗑️ Fase eliminada de la sesión de hoy.');
  };

  const handleAddNewPhase = () => {
    const nextIndex = phases.length + 1;
    const newPhase: SessionPhaseItem = {
      id: `phase_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${nextIndex}. Nueva Fase de Entrenamiento`,
      subtitle: 'Haz clic en el título o en el icono de lápiz para personalizar esta fase.',
      colorAccent: ACCENT_CYCLE[(nextIndex - 1) % ACCENT_CYCLE.length],
      exercises: [],
    };
    commitPhases([...phases, newPhase]);
    showToast(`➕ Fase ${nextIndex} añadida a la sesión.`);
  };

  const handleAddFromLibrary = (ex: Exercise, phaseId: string) => {
    const item: PlannedExercise = {
      ...ex,
      localId: `${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      duration: ex.duration || 20,
      phase: phaseId,
    };
    commitPhases(
      phases.map(p => (p.id === phaseId ? { ...p, exercises: [...p.exercises, item] } : p))
    );
  };

  const handleAddQuickTask = (
    task: { title: string; duration: number; category: string; dimensions: string; playersCount: string; objective: string; notes: string },
    phaseId: string
  ) => {
    const now = Date.now();
    const newEx: PlannedExercise = {
      id: `session-task-${now}`,
      localId: `local-${now}`,
      title: task.title.trim(),
      category: task.category,
      duration: task.duration,
      phase: phaseId,
      dimensions: task.dimensions.trim() || undefined,
      playersCount: task.playersCount.trim() || undefined,
      objective: task.objective.trim() || undefined,
      notes: task.notes.trim() || undefined,
      thumbnailUrl: '',
      createdAt: now,
      boardState: {
        tokens: [],
        paths: [],
        shapes: [],
        selectedTokenId: null,
        selectedShapeId: null,
        currentTool: 'pointer',
        currentPathType: 'freehand',
        drawingColor: '#ffffff',
        laneOverlay: 'none',
      },
    };
    commitPhases(
      phases.map(p => (p.id === phaseId ? { ...p, exercises: [...p.exercises, newEx] } : p))
    );
    saveExercise(newEx).catch(() => {});
  };

  const handleUpdateExercise = (phaseId: string, localId: string, patch: Partial<PlannedExercise>) => {
    commitPhases(
      phases.map(p =>
        p.id === phaseId
          ? { ...p, exercises: p.exercises.map(ex => (ex.localId === localId ? { ...ex, ...patch } : ex)) }
          : p
      )
    );
  };

  const handleMoveExerciseOrder = (phaseId: string, localId: string, direction: 'up' | 'down') => {
    commitPhases(
      phases.map(p => {
        if (p.id !== phaseId) return p;
        const list = [...p.exercises];
        const idx = list.findIndex(e => e.localId === localId);
        if (idx === -1) return p;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return p;
        const [removed] = list.splice(idx, 1);
        list.splice(targetIdx, 0, removed);
        return { ...p, exercises: list };
      })
    );
  };

  const handleMoveExerciseToPhase = (localId: string, fromPhaseId: string, toPhaseId: string) => {
    if (fromPhaseId === toPhaseId) return;
    let movedEx: PlannedExercise | null = null;
    const withoutSource = phases.map(p => {
      if (p.id !== fromPhaseId) return p;
      const found = p.exercises.find(e => e.localId === localId);
      if (found) movedEx = { ...found, phase: toPhaseId };
      return { ...p, exercises: p.exercises.filter(e => e.localId !== localId) };
    });
    if (!movedEx) return;
    commitPhases(
      withoutSource.map(p => (p.id === toPhaseId ? { ...p, exercises: [...p.exercises, movedEx!] } : p))
    );
  };

  const handleRemoveExercise = (phaseId: string, localId: string) => {
    commitPhases(
      phases.map(p =>
        p.id === phaseId ? { ...p, exercises: p.exercises.filter(e => e.localId !== localId) } : p
      )
    );
  };

  const handleToggleAttendance = (playerId: string) => {
    const rosterIds = rosterPlayers.map(p => p.id);
    const absentSet = new Set(dayPlan.absentPlayers || []);
    if (absentSet.has(playerId)) absentSet.delete(playerId);
    else absentSet.add(playerId);
    const nextAbsents = Array.from(absentSet);
    const nextAttended = rosterIds.filter(id => !absentSet.has(id));
    persistDayPlan({
      type: dayPlan.isMatchDay ? 'match' : 'training',
      isRestDay: false,
      absentPlayers: nextAbsents,
      attendedPlayers: nextAttended,
    });
  };

  const dayHeaderLabel = useMemo(() => {
    try {
      return format(parseISO(selectedDateKey), 'EEEE dd/MM/yyyy', { locale: es }).replace(
        /^\w/,
        c => c.toUpperCase()
      );
    } catch {
      return selectedDateKey;
    }
  }, [selectedDateKey]);

  const handleSaveSessionExplicit = async () => {
    setSavingSession(true);
    try {
      const synced = syncDayPlanWithPhases(phases);
      const current = seasonPlan[selectedDateKey] || createEmptyDay(selectedDateKey, activeTeam?.id);
      const updated: DailyPlan = {
        ...current,
        dateString: selectedDateKey,
        teamId: current.teamId || activeTeam?.id,
        type: current.isMatchDay ? 'match' : 'training',
        isRestDay: false,
        customPhases: synced.customPhases,
        plannedExercises: synced.plannedExercises,
      };
      const nextPlan = { ...seasonPlan, [selectedDateKey]: updated };
      setSeasonPlan(nextPlan);
      await db.saveSeasonPlan(nextPlan, activeTeam?.id);
      await db.flushSeasonPlan(activeTeam?.id);
      showToast(`✅ Sesión guardada en el ${dayHeaderLabel}`);
    } catch (err) {
      console.error('Error guardando sesión:', err);
      showToast('⚠️ Error al guardar la sesión en la nube.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleConfirmDeleteSession = async () => {
    setShowDeleteConfirm(false);
    const current = seasonPlan[selectedDateKey];
    const hasMatch = Boolean(current?.isMatchDay || current?.type === 'match');

    const clearedDay: DailyPlan = hasMatch
      ? {
          ...current!,
          dateString: selectedDateKey,
          type: 'match',
          isMatchDay: true,
          isRestDay: false,
          plannedExercises: [],
          customPhases: undefined,
          sessionTitle: undefined,
          primaryObjective: undefined,
          secondaryObjective: undefined,
          intensity: undefined,
          material: undefined,
        }
      : {
          dateString: selectedDateKey,
          type: 'rest',
          isMatchDay: false,
          isRestDay: true,
          playersNeeded: 22,
          plannedExercises: [],
          teamId: activeTeam?.id,
        };

    const nextPlan = { ...seasonPlan, [selectedDateKey]: clearedDay };
    setSeasonPlan(nextPlan);
    try {
      await db.saveSeasonPlan(nextPlan, activeTeam?.id);
      await db.flushSeasonPlan(activeTeam?.id);
    } catch (err) {
      console.error('Error eliminando sesión:', err);
    }
    showToast('🗑️ Sesión eliminada del calendario');
  };

  const handleCopyWhatsapp = () => {
    const text = buildFullSessionWhatsappText({
      dayHeader: dayHeaderLabel,
      teamName: activeTeam?.name || 'Mi Equipo',
      dayPlan,
      rosterPlayers,
    });
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2500);
    });
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportSessionSheetPDF({
        dayHeader: dayHeaderLabel,
        dateKey: selectedDateKey,
        teamName: activeTeam?.name || 'Mi Equipo',
        teamShieldUrl: activeTeam?.crestUrl || teamSettings?.crestUrl,
        dayPlan,
        rosterPlayers,
        mapCategory: mapCategoryLabel,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const allExercises = phases.flatMap(p => p.exercises);
  const totalMinutes = allExercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);
  const attendeesCount = rosterPlayers.filter(p => !(dayPlan.absentPlayers || []).includes(p.id)).length;

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-5 pb-20">
      {toastMsg && (
        <div className="fixed bottom-16 md:bottom-5 right-5 z-[200] px-4 py-3 rounded-lg bg-[#0E1712] border border-emerald-500/40 text-emerald-300 text-[12.5px] font-medium shadow-2xl flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
          {onBackToCalendar && toastMsg.includes('eliminada') && (
            <button
              type="button"
              onClick={onBackToCalendar}
              className="ml-2 px-2.5 py-1 rounded bg-emerald-500 text-black font-semibold text-[11px] cursor-pointer"
            >
              ← Volver al Calendario
            </button>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-red-500/35 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#EDEDED]">
                ¿Eliminar sesión de entrenamiento?
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 text-[#737373] hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">
              ¿Eliminar toda la sesión de entrenamiento del <strong className="text-[#EDEDED]">{dayHeaderLabel}</strong> y dejar el día como Descanso?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-9 px-3.5 rounded-md bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#EDEDED] text-[12px] font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteSession()}
                className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <SessionHeaderCard
        selectedDateKey={selectedDateKey}
        seasonPlan={seasonPlan}
        dayPlan={dayPlan}
        totalMinutes={totalMinutes}
        exercisesCount={allExercises.length}
        attendeesCount={attendeesCount}
        rosterCount={rosterPlayers.length}
        copiedWa={copiedWa}
        exportingPdf={exportingPdf}
        savingSession={savingSession}
        onSelectDateKey={onChangeDateKey}
        onBackToCalendar={onBackToCalendar}
        onUpdateDayPlan={persistDayPlan}
        onSaveSessionExplicit={() => void handleSaveSessionExplicit()}
        onRequestDeleteSession={() => setShowDeleteConfirm(true)}
        onCopyWhatsapp={handleCopyWhatsapp}
        onExportPdf={handleExportPdf}
      />

      {phases.map((phase, idx) => (
        <SessionPhaseBlock
          key={phase.id}
          phase={phase}
          phaseIndex={idx}
          totalPhases={phases.length}
          allPhases={phases}
          libraryExercises={savedExercises}
          categories={[...(customCategories || []), 'Calentamiento', 'Vuelta a la Calma', 'Carga Física']}
          onUpdatePhaseMeta={handleUpdatePhaseMeta}
          onMovePhaseOrder={handleMovePhaseOrder}
          onDeletePhase={handleDeletePhase}
          onAddFromLibrary={handleAddFromLibrary}
          onAddQuickTask={handleAddQuickTask}
          onUpdateExercise={handleUpdateExercise}
          onMoveExerciseOrder={handleMoveExerciseOrder}
          onMoveExerciseToPhase={handleMoveExerciseToPhase}
          onRemoveExercise={handleRemoveExercise}
          onPreviewExercise={setPreviewExercise}
        />
      ))}

      {/* Botón para añadir nuevas fases o restaurar las 3 fases base si se eliminaron todas */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleAddNewPhase}
          className="h-11 px-5 rounded-xl bg-[#0F1713] hover:bg-emerald-500/15 border border-dashed border-emerald-500/45 text-emerald-300 font-semibold text-[13px] flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>➕ Añadir Nueva Fase a la Sesión</span>
        </button>

        {phases.length === 0 && (
          <button
            type="button"
            onClick={() => commitPhases(createDefaultSessionPhases())}
            className="h-11 px-4 rounded-xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#27272A] text-[#A1A1AA] font-medium text-[12.5px] flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar las 3 Fases Clásicas</span>
          </button>
        )}
      </div>

      <SessionAttendanceAndNotesPanel
        dayPlan={dayPlan}
        rosterPlayers={rosterPlayers}
        onTogglePlayerAttendance={handleToggleAttendance}
        onMarkAllPresent={() => persistDayPlan({ absentPlayers: [], attendedPlayers: rosterPlayers.map(p => p.id) })}
        onUpdateNotes={notes => persistDayPlan({ notes })}
      />

      {previewExercise && (
        <ExercisePreviewModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
        />
      )}
    </div>
  );
};
