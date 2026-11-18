import React, { useEffect, useMemo, useState } from 'react';
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
  resolveExercisePhase,
  SESSION_PHASES,
  SessionPhase,
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
  const [previewExercise, setPreviewExercise] = useState<PlannedExercise | null>(null);

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

  const handleAddFromLibrary = (ex: Exercise, phaseId: SessionPhase) => {
    const item: PlannedExercise = {
      ...ex,
      localId: `${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      duration: ex.duration || 20,
      phase: phaseId,
    };
    persistDayPlan({
      type: 'training',
      isRestDay: false,
      plannedExercises: [...(dayPlan.plannedExercises || []), item],
    });
  };

  const handleAddQuickTask = (
    task: {
      title: string;
      duration: number;
      category: string;
      dimensions: string;
      playersCount: string;
      objective: string;
      notes: string;
    },
    phaseId: SessionPhase
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
    persistDayPlan({
      type: 'training',
      isRestDay: false,
      plannedExercises: [...(dayPlan.plannedExercises || []), newEx],
    });
    saveExercise(newEx).catch(() => {});
  };

  const handleUpdateExercise = (localId: string, patch: Partial<PlannedExercise>) => {
    persistDayPlan({
      plannedExercises: (dayPlan.plannedExercises || []).map(ex =>
        ex.localId === localId ? { ...ex, ...patch } : ex
      ),
    });
  };

  const handleMoveExerciseOrder = (localId: string, direction: 'up' | 'down') => {
    const list = [...(dayPlan.plannedExercises || [])];
    const idx = list.findIndex(e => e.localId === localId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const [removed] = list.splice(idx, 1);
    list.splice(targetIdx, 0, removed);
    persistDayPlan({ plannedExercises: list });
  };

  const handleRemoveExercise = (localId: string) => {
    persistDayPlan({
      plannedExercises: (dayPlan.plannedExercises || []).filter(e => e.localId !== localId),
    });
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

  const exercises = dayPlan.plannedExercises || [];
  const totalMinutes = exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);
  const attendeesCount = rosterPlayers.filter(p => !(dayPlan.absentPlayers || []).includes(p.id)).length;

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-5 pb-20">
      <SessionHeaderCard
        selectedDateKey={selectedDateKey}
        seasonPlan={seasonPlan}
        dayPlan={dayPlan}
        totalMinutes={totalMinutes}
        exercisesCount={exercises.length}
        attendeesCount={attendeesCount}
        rosterCount={rosterPlayers.length}
        copiedWa={copiedWa}
        exportingPdf={exportingPdf}
        onSelectDateKey={onChangeDateKey}
        onBackToCalendar={onBackToCalendar}
        onUpdateDayPlan={persistDayPlan}
        onCopyWhatsapp={handleCopyWhatsapp}
        onExportPdf={handleExportPdf}
      />

      {SESSION_PHASES.map(phase => (
        <SessionPhaseBlock
          key={phase.id}
          phase={phase}
          exercises={exercises.filter(ex => resolveExercisePhase(ex) === phase.id)}
          libraryExercises={savedExercises}
          categories={[...(customCategories || []), 'Calentamiento', 'Vuelta a la Calma', 'Carga Física']}
          onAddFromLibrary={handleAddFromLibrary}
          onAddQuickTask={handleAddQuickTask}
          onUpdateExercise={handleUpdateExercise}
          onMoveExerciseOrder={handleMoveExerciseOrder}
          onRemoveExercise={handleRemoveExercise}
          onPreviewExercise={setPreviewExercise}
        />
      ))}

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
