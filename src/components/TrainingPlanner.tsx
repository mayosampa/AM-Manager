import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Users, X, GripVertical, Trash2, Plus, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, PlaySquare, Trophy, Swords, MapPin, MessageSquare, Copy, Check, FileText, ClipboardCheck } from 'lucide-react';
import { useSession, Exercise } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '../services/db';
import { cacheService } from '../services/cacheService';
import { reconcileSeasonPlanWithHistory } from '../services/matchSync';
import { isCallable, isActiveRoster } from '../features/squad/domain/availability';
import { buildAttendanceWhatsappText, exportSessionSheetPDF } from '../services/sessionSheetExport';
import { RivalSelector } from '../features/rivals/components/RivalSelector';
import { AttendanceReportModal } from './AttendanceReportModal';

export interface PlannedExercise extends Exercise {
  localId: string;
  duration: number;
  time?: string;
  notes?: string;
  absentPlayers?: string[];
}

export interface MatchDetails {
  opponent: string;
  isHome: boolean;
  competition: string;
  time?: string;
  location?: string;
  played?: boolean;
  score?: string;
}

export interface DailyPlan {
  dateString: string; // YYYY-MM-DD
  type?: 'training' | 'match' | 'rest';
  plannedExercises: PlannedExercise[];
  isMatchDay: boolean;
  isRestDay: boolean;
  playersNeeded: number;
  matchDetails?: MatchDetails;
  notes?: string;
  absentPlayers?: string[];
  attendedPlayers?: string[];
  teamId?: string; // added teamId
}

const getCategoryColor = (cat: string) => {
  const colors: Record<string, string> = {
    'Calentamiento': 'border-orange-500 text-orange-400 bg-orange-500/10',
    'Posesi?n': 'border-blue-500 text-blue-400 bg-blue-500/10',
    'Transiciones': 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
    'Trabajo por L?neas': 'border-cyan-500 text-cyan-400 bg-cyan-500/10',
    'Salida de Bal?n': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    'ABP': 'border-purple-500 text-purple-400 bg-purple-500/10',
    'Otros': 'border-gray-500 text-gray-400 bg-gray-500/10',
    'transition': 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
    'possession': 'border-blue-500 text-blue-400 bg-blue-500/10',
    'buildup': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    'set-piece': 'border-purple-500 text-purple-400 bg-purple-500/10',
  };
  return colors[cat] || 'border-slate-500 text-slate-400 bg-slate-500/10';
};

const mapLegacyCategory = (cat: string) => {
  if (cat === 'transition') return 'Transiciones';
  if (cat === 'possession') return 'Posesión';
  if (cat === 'buildup') return 'Salida de Balón';
  if (cat === 'set-piece') return 'ABP';
  if (cat === 'match') return 'Otros';
  return cat;
};

const createEmptyDay = (dateString: string, teamId?: string): DailyPlan => ({
  dateString,
  type: 'rest',
  plannedExercises: [],
  isMatchDay: false,
  isRestDay: true,
  playersNeeded: 22,
  teamId,
});

export const TrainingPlanner = React.memo(function TrainingPlanner() {
  const { savedExercises, saveExercise } = useSession();
  const { activeTeam, updateTeamPlayers, teams, customCategories, teamSettings } = useTeam();
  
  const availablePlayersCount = React.useMemo(() => {
    if (!activeTeam) return 0;
    return activeTeam.players.filter(isCallable).length;
  }, [activeTeam]);

  const [viewMode, setViewMode] = useState<'micro' | 'macro'>('macro');

  // Core Date & Persistence State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [seasonPlan, setSeasonPlan] = useState<Record<string, DailyPlan>>(() =>
    cacheService.get<Record<string, DailyPlan>>(activeTeam?.id ? `plan_${activeTeam.id}` : 'global_plan', {})
  );

  // UI States
  const [isCatalogOpen, setIsCatalogOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [isDragging, setIsDragging] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | PlannedExercise | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [copiedAttendance, setCopiedAttendance] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  
  const [showMatchModal, setShowMatchModal] = useState<string | null>(null); // holds dateKey
  const [matchForm, setMatchForm] = useState<MatchDetails>({ opponent: '', isHome: true, competition: 'Liga', time: '', location: '' });
  useEffect(() => {
    if (showMatchModal) {
      if (matchForm.isHome) {
        setMatchForm(prev => ({ ...prev, location: activeTeam?.homeStadium || '' }));
      } else {
        setMatchForm(prev => ({ ...prev, location: prev.location === (activeTeam?.homeStadium || '') ? '' : prev.location }));
      }
    }
  }, [matchForm.isHome, showMatchModal, activeTeam?.homeStadium]);


  const [showAdHocModal, setShowAdHocModal] = useState<string | null>(null); // holds dateKey
  const [adHocForm, setAdHocForm] = useState({ title: '', duration: 20, category: '', time: '', notes: '' });

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAttendanceModal) setShowAttendanceModal(false);
        else if (showMatchModal) setShowMatchModal(null);
        else if (showAdHocModal) setShowAdHocModal(null);
        else if (previewExercise) setPreviewExercise(null);
        else if (selectedDayKey) setSelectedDayKey(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAttendanceModal, showMatchModal, showAdHocModal, previewExercise, selectedDayKey]);

  const [filterCategory, setFilterCategory] = useState<string>('Todos');

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const [rawPlan, savedMatches] = await Promise.all([
          db.getSeasonPlan(activeTeam?.id),
          activeTeam?.id ? db.getMatches(activeTeam.id) : Promise.resolve([]),
        ]);
        const { plan, changed } = reconcileSeasonPlanWithHistory(rawPlan || {}, savedMatches || [], activeTeam?.id);

        if (plan && Object.keys(plan).length > 0) {
          const migrated: Record<string, DailyPlan> = {};
          const fallbackTeamId = activeTeam?.id || (teams && teams.length > 0 ? teams[0].id : undefined);

          for (const [key, p] of Object.entries(plan)) {
            migrated[key] = {
              ...(p as DailyPlan),
              teamId: (p as DailyPlan).teamId || fallbackTeamId,
            };
          }
          setSeasonPlan(migrated);
          if (changed) {
            db.saveSeasonPlan(migrated, activeTeam?.id).catch(console.error);
          }
        }
      } catch (e) {
        console.error("Error loading season plan", e);
      }
    };
    loadPlan();
  }, [activeTeam?.id]);

  const saveSeasonPlan = (newPlan: Record<string, DailyPlan>) => {
    setSeasonPlan(newPlan);
    db.saveSeasonPlan(newPlan, activeTeam?.id).catch(console.error);
    
    if (activeTeam && activeTeam.players && updateTeamPlayers) {
      const trainingDays = Object.values(newPlan).filter(d => d.teamId === activeTeam.id && ((!d.isRestDay && !d.isMatchDay) || d.type === 'training'));
      const totalTrainings = trainingDays.length;
      
      if (totalTrainings > 0) {
        let playersChanged = false;
        const updatedPlayers = activeTeam.players.map(player => {
          const absences = trainingDays.filter(d => d.absentPlayers?.includes(player.id)).length;
          const percentage = Math.round(((totalTrainings - absences) / totalTrainings) * 100);
          if (!player.attendance || player.attendance.trainingPercentage !== percentage) {
            playersChanged = true;
            return {
              ...player,
              attendance: {
                ...(player.attendance || { matchPercentage: 100 }),
                trainingPercentage: percentage
              }
            };
          }
          return player;
        });
        if (playersChanged) {
          updateTeamPlayers(updatedPlayers);
        }
      }
    }
  };

  const updateDayPlan = (dateKey: string, partial: Partial<DailyPlan>) => {
    const current = seasonPlan[dateKey] || createEmptyDay(dateKey, activeTeam?.id);
    const updated = { ...current, ...partial, teamId: current.teamId || activeTeam?.id };
    saveSeasonPlan({ ...seasonPlan, [dateKey]: updated });
  };

  const togglePlayerAttendance = (dateKey: string, playerId: string) => {
    const rosterIds = (activeTeam?.players || []).filter(isActiveRoster).map(p => p.id);
    const day = seasonPlan[dateKey] || {
      ...createEmptyDay(dateKey, activeTeam?.id),
      type: 'training' as const,
      isRestDay: false,
      isMatchDay: false,
    };

    // Unify source of truth: if attendedPlayers is already initialized, use it; otherwise derive from rosterIds minus absentPlayers
    const baseAttended = Array.isArray(day.attendedPlayers)
      ? day.attendedPlayers.filter(id => rosterIds.includes(id))
      : rosterIds.filter(id => !(day.absentPlayers || []).includes(id));

    const isCurrentlyAttending = baseAttended.includes(playerId);
    const nextAttended = isCurrentlyAttending
      ? baseAttended.filter(id => id !== playerId)
      : [...baseAttended, playerId];
    const nextAbsents = rosterIds.filter(id => !nextAttended.includes(id));

    updateDayPlan(dateKey, {
      type: day.isMatchDay ? 'match' : 'training',
      isRestDay: false,
      attendedPlayers: nextAttended,
      absentPlayers: nextAbsents,
    });
  };

  // --- DRAG & DROP LOGIC ---

  const handleDragStart = (e: React.DragEvent, exercise: Exercise, sourceDateKey?: string, localId?: string) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({ exercise, sourceDateKey, localId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDateKey: string) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { exercise, sourceDateKey, localId } = data;

      if (!exercise) return;

      let newSeasonPlan = { ...seasonPlan };

      // Remove from source if moving
      if (sourceDateKey && localId && sourceDateKey !== targetDateKey) {
        const sourceDay = newSeasonPlan[sourceDateKey];
        if (sourceDay) {
          newSeasonPlan[sourceDateKey] = {
            ...sourceDay,
            plannedExercises: sourceDay.plannedExercises.filter(ex => ex.localId !== localId)
          };
        }
      }

      // Add to target
      const targetDay = newSeasonPlan[targetDateKey] || createEmptyDay(targetDateKey);
      const exerciseToAdd: PlannedExercise = localId && sourceDateKey
        ? { ...exercise, localId, duration: exercise.duration || 20 }
        : { ...exercise, localId: `${exercise.id}-${Date.now()}`, duration: 20 };

      newSeasonPlan[targetDateKey] = {
        ...targetDay,
        plannedExercises: [...targetDay.plannedExercises, exerciseToAdd]
      };

      saveSeasonPlan(newSeasonPlan);
    } catch (err) {
      console.error(err);
    }
  };

  const removeExercise = (dateKey: string, localId: string) => {
    const day = seasonPlan[dateKey];
    if (day) {
      updateDayPlan(dateKey, {
        plannedExercises: day.plannedExercises.filter(ex => ex.localId !== localId)
      });
    }
  };

  // --- DAY CONFIGURATION LOGIC ---

  const toggleDayStatus = (dateKey: string, status: 'training' | 'match' | 'rest') => {
    const day = seasonPlan[dateKey] || createEmptyDay(dateKey);
    const isMatch = status === 'match';
    const isRest = status === 'rest';
    
    updateDayPlan(dateKey, {
      type: status,
      isMatchDay: isMatch,
      isRestDay: isRest,
      matchDetails: isMatch ? (day.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '', location: '' }) : (isRest ? undefined : day.matchDetails)
    });

    if (isMatch) {
      setMatchForm(day.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '', location: '' });
      setShowMatchModal(dateKey);
    }
  };

  const updatePlayersNeeded = (dateKey: string, players: number) => {
    updateDayPlan(dateKey, { playersNeeded: players });
  };
  
  const updateExerciseDuration = (dateKey: string, localId: string, duration: number) => {
    const day = seasonPlan[dateKey];
    if (day) {
      updateDayPlan(dateKey, {
        plannedExercises: day.plannedExercises.map(ex => ex.localId === localId ? { ...ex, duration } : ex)
      });
    }
  };

  const calculateTotalTime = (exercises: PlannedExercise[]) => {
    if (!exercises) return 0;
    return exercises.reduce((total, ex) => total + (ex.duration || 0), 0);
  };

  // --- CUSTOM MATCH & AD-HOC LOGIC ---

  const handleSaveMatch = () => {
    if (!showMatchModal || !matchForm.opponent) return;
    updateDayPlan(showMatchModal, { 
      isMatchDay: true, 
      isRestDay: false, 
      matchDetails: matchForm 
    });
    setShowMatchModal(null);
  };

  const handleSaveAdHoc = () => {
    if (!showAdHocModal || !adHocForm.title) return;

    const adHocExercise: PlannedExercise = {
      id: `adhoc-${Date.now()}`,
      localId: `local-adhoc-${Date.now()}`,
      title: adHocForm.title,
      category: adHocForm.category as any,
      duration: adHocForm.duration,
      time: adHocForm.time,
      notes: adHocForm.notes,
      thumbnailUrl: '',
      createdAt: Date.now(),
      boardState: { tokens: [], paths: [], shapes: [], selectedTokenId: null, selectedShapeId: null, currentTool: 'pointer', currentPathType: 'freehand', drawingColor: '#ffffff', laneOverlay: 'none' }
    };

    const day = seasonPlan[showAdHocModal] || createEmptyDay(showAdHocModal);
    updateDayPlan(showAdHocModal, {
      plannedExercises: [...day.plannedExercises, adHocExercise]
    });
    
    // GUARDAR EN LA BIBLIOTECA GLOBAL
    const exerciseToSave: Exercise = {
      id: adHocExercise.id,
      title: adHocExercise.title,
      category: adHocExercise.category,
      duration: adHocExercise.duration,
      notes: adHocExercise.notes,
      thumbnailUrl: adHocExercise.thumbnailUrl,
      createdAt: adHocExercise.createdAt,
      boardState: adHocExercise.boardState,
    };
    saveExercise(exerciseToSave).catch(err => console.error("Error saving manual exercise to library:", err));
    
    setShowAdHocModal(null);
    setAdHocForm({ title: '', duration: 20, category: '', time: '', notes: '' });
  };

  // --- CALENDAR RENDERING ---

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const calendarDays = useMemo(() => {
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let currentIterDate = startDate;
    while (currentIterDate <= endDate) {
      days.push(currentIterDate);
      currentIterDate = addDays(currentIterDate, 1);
    }
    return days;
  }, [monthStart]);

  const filteredCatalogExercises = useMemo(() => {
    if (filterCategory === 'Todos') return savedExercises;
    return savedExercises.filter(ex => ex.category === filterCategory);
  }, [savedExercises, filterCategory]);

  const navigatePrev = () => setCurrentDate(viewMode === 'micro' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const navigateNext = () => setCurrentDate(viewMode === 'micro' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  const navigateToday = () => setCurrentDate(new Date());

  const getDayHeaderString = (date: Date) => {
    return format(date, 'EEEE dd/MM', { locale: es }).replace(/^w/, (c) => c.toUpperCase());
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#000000]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0A0A0A] px-5 py-4 border-b border-[#1F1F1F] shrink-0">
        <div>
          <h1 className="text-[18px] font-semibold text-[#EDEDED] tracking-[-0.025em] mb-0.5 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#888888] shrink-0" />
            Planificador de Sesiones
          </h1>
          <p className="text-[12px] text-[#737373]">
            {viewMode === 'micro'
              ? 'Microciclo semanal: arrastra tareas del catálogo o haz clic en un día para pasar lista y exportar PDF.'
              : 'Macrociclo mensual: vista de calendario con sesiones de entrenamiento y jornadas de competición.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full lg:w-auto">
          {/* Attendance Report Button */}
          <button
            onClick={() => setShowAttendanceModal(true)}
            className="h-8 bg-[#111111] text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 px-3 rounded-md text-[12px] font-medium hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Ver informe de asistencia general, mensual y semanal con exportación a PDF"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Informe Asistencia</span>
          </button>

          {viewMode === 'micro' && !isCatalogOpen && (
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="h-8 bg-[#111111] text-[#EDEDED] border border-[#262626] px-3 rounded-md text-[12px] font-medium hover:bg-[#1A1A1A] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#888888]" />
              <span>Catálogo de Tareas</span>
            </button>
          )}

          {/* Segmented View Switcher */}
          <div className="flex bg-[#050505] p-0.5 rounded-md border border-[#1F1F1F]">
            <button
              onClick={() => setViewMode('micro')}
              className={`h-7 flex items-center justify-center gap-1.5 px-3 rounded-[4px] text-[12px] font-medium transition-colors ${
                viewMode === 'micro' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#737373] hover:text-[#EDEDED]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Microciclo
            </button>
            <button
              onClick={() => setViewMode('macro')}
              className={`h-7 flex items-center justify-center gap-1.5 px-3 rounded-[4px] text-[12px] font-medium transition-colors ${
                viewMode === 'macro' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#737373] hover:text-[#EDEDED]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Macrociclo
            </button>
          </div>

          <button
            onClick={navigateToday}
            className="h-8 px-3 font-mono text-[11px] font-medium text-[#EDEDED] bg-[#111111] border border-[#262626] rounded-md hover:bg-[#1A1A1A] transition-colors"
          >
            HOY
          </button>

          <div className="flex items-center h-8 bg-[#050505] rounded-md border border-[#1F1F1F]">
            <button
              onClick={navigatePrev}
              className="h-full px-2 text-[#737373] hover:text-[#EDEDED] transition-colors border-r border-[#1F1F1F]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 font-mono text-[12px] font-medium text-[#EDEDED] min-w-[140px] sm:min-w-[175px] text-center">
              {viewMode === 'micro'
                ? `${format(weekStart, 'd MMM', { locale: es })} – ${format(addDays(weekStart, 6), 'd MMM yyyy', { locale: es })}`
                : format(monthStart, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </span>
            <button
              onClick={navigateNext}
              className="h-full px-2 text-[#737373] hover:text-[#EDEDED] transition-colors border-l border-[#1F1F1F]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'macro' ? (
        // --- MACROCYCLE (MONTH) VIEW ---
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-4 sm:p-6">
          <div className="min-w-[680px] lg:min-w-0 max-w-7xl mx-auto">
            <div className="grid grid-cols-7 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-t-lg overflow-hidden">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div
                  key={d}
                  className="bg-[#0D0D0D] py-2 text-center font-mono text-[11px] font-medium text-[#737373] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-[#1F1F1F] border-x border-b border-[#1F1F1F] rounded-b-lg overflow-hidden">
              {calendarDays.map((dayDate, i) => {
                const dateKey = format(dayDate, 'yyyy-MM-dd');
                const dayPlan = seasonPlan[dateKey] || createEmptyDay(dateKey);
                const isCurrentMonth = isSameMonth(dayDate, monthStart);
                const isTodayDate = isToday(dayDate);

                const totalTime = calculateTotalTime(dayPlan.plannedExercises);
                const hasTraining = dayPlan.plannedExercises.length > 0;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setCurrentDate(dayDate);
                      setViewMode('micro');
                    }}
                    className={`p-3 h-28 flex flex-col cursor-pointer transition-colors relative group ${
                      !isCurrentMonth ? 'bg-[#050505] opacity-40' : 'bg-[#0A0A0A] hover:bg-[#111111]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`font-mono text-[12px] font-semibold px-1.5 py-0.5 rounded ${
                          isTodayDate ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#A1A1AA]'
                        }`}
                      >
                        {format(dayDate, 'd')}
                      </span>
                      <div className="flex gap-1">
                        {!dayPlan?.isMatchDay && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMatchForm({ opponent: '', isHome: true, competition: 'Liga', time: '', location: '' });
                              setShowMatchModal(dateKey);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#666666] hover:text-[#EDEDED] transition-opacity"
                            title="Añadir Partido"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {dayPlan?.isMatchDay && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMatchForm(
                                dayPlan.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '', location: '' }
                              );
                              setShowMatchModal(dateKey);
                            }}
                            className="p-1 text-amber-400 hover:text-white transition-opacity"
                            title="Editar Partido"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-1">
                      {(dayPlan?.type === 'rest' || dayPlan?.isRestDay) && (
                        <div className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#111111] text-[#666666] border border-[#1F1F1F] text-center">
                          Descanso
                        </div>
                      )}

                      {(dayPlan?.type === 'match' || dayPlan?.isMatchDay) && (
                        <div className="font-mono text-[10px] font-medium text-[#EDEDED] bg-[#161616] px-2 py-1 rounded border border-[#2E2E2E] truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate">
                            {dayPlan.matchDetails?.time && <span>{dayPlan.matchDetails.time} · </span>}
                            {dayPlan.matchDetails?.opponent
                              ? `${dayPlan.matchDetails.opponent} (${dayPlan.matchDetails?.isHome ? 'L' : 'V'})`
                              : 'Partido'}
                          </span>
                        </div>
                      )}

                      {(dayPlan?.type === 'training' || (!dayPlan?.isMatchDay && !dayPlan?.isRestDay)) && (
                        <div className="font-mono text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 justify-center">
                          {hasTraining ? (
                            <>
                              <span>{dayPlan.plannedExercises.length} tareas</span>
                              <span className="text-emerald-500/60">·</span>
                              <span>{totalTime}'</span>
                            </>
                          ) : (
                            <span>Entreno</span>
                          )}
                        </div>
                      )}

                      {(dayPlan?.isRestDay || dayPlan?.isMatchDay) && dayPlan?.notes && (
                        <div
                          className="text-[10px] text-[#737373] bg-[#0F0F0F] px-1.5 py-0.5 rounded border border-[#1F1F1F] truncate flex items-center gap-1"
                          title={dayPlan.notes}
                        >
                          <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{dayPlan.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // --- MICROCYCLE (WEEK) VIEW ---
        <div className="flex flex-1 overflow-hidden relative">
          {isCatalogOpen && (
            <div
              onClick={() => setIsCatalogOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            />
          )}

          {/* Left Sidebar - Exercise Library Drawer */}
          <div
            className={`${
              isCatalogOpen ? 'fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw]' : 'hidden'
            } bg-[#0A0A0A] border-r border-[#1F1F1F] flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0`}
          >
            <div className="p-4 border-b border-[#1F1F1F] sticky top-0 bg-[#0A0A0A] z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#EDEDED]">Catálogo de Tareas</h3>
                <button
                  onClick={() => setIsCatalogOpen(false)}
                  className="h-6 px-2 rounded bg-[#111111] hover:bg-[#1A1A1A] text-[#A1A1AA] border border-[#262626] text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title="Ocultar Catálogo"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Ocultar</span>
                </button>
              </div>
              <p className="text-[11px] text-[#666666] mt-0.5">Arrastra ejercicios a los días de la semana</p>

              <div className="mt-3 flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                {['Todos', ...(customCategories || []), 'Carga Física', 'Otros'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-medium whitespace-nowrap transition-colors border ${
                      filterCategory === cat
                        ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                        : 'bg-[#111111] text-[#737373] border-[#1F1F1F] hover:text-[#EDEDED]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 space-y-2">
              {filteredCatalogExercises.length === 0 ? (
                <div className="text-center p-5 border border-dashed border-[#1F1F1F] rounded-md text-[#666666] text-[12px]">
                  No hay tareas guardadas en esta categoría.
                </div>
              ) : (
                filteredCatalogExercises.map(exercise => {
                  const mappedCat = mapLegacyCategory(exercise.category);
                  return (
                    <div
                      key={exercise.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, exercise)}
                      onDragEnd={() => setIsDragging(false)}
                      onClick={() => setPreviewExercise(exercise)}
                      className="p-2.5 rounded-md bg-[#0F0F0F] border border-[#1F1F1F] cursor-grab active:cursor-grabbing hover:border-[#3A3A3A] transition-colors group"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h4 className="font-medium text-[#EDEDED] text-[12px] leading-snug line-clamp-2">
                          {exercise.title}
                        </h4>
                        <GripVertical className="w-3.5 h-3.5 text-[#525252] shrink-0" />
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#A1A1AA]">
                        {mappedCat}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Calendar Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 w-full flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 w-full flex-1">
              {weekDays.map(date => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const isTodayDate = isToday(date);
                const dayPlan = seasonPlan[dateKey] || createEmptyDay(dateKey);
                const totalTime = calculateTotalTime(dayPlan.plannedExercises);

                return (
                  <div
                    key={dateKey}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dateKey)}
                    className={`flex flex-col rounded-lg border transition-colors h-full bg-[#0A0A0A] ${
                      isTodayDate
                        ? 'border-[#404040]'
                        : dayPlan.isMatchDay
                        ? 'border-[#2E2E2E]'
                        : 'border-[#1F1F1F] hover:border-[#2E2E2E]'
                    } ${isDragging ? 'border-dashed' : ''}`}
                  >
                    {/* Day Header */}
                    <div
                      onClick={() => setSelectedDayKey(dateKey)}
                      className="p-3 border-b border-[#1F1F1F] flex flex-col cursor-pointer hover:bg-[#111111] transition-colors rounded-t-lg"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-medium capitalize text-[#EDEDED]">
                          {format(date, 'EEEE', { locale: es })}
                        </span>
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                            isTodayDate ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold' : 'text-[#737373]'
                          }`}
                        >
                          {format(date, 'dd/MM')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-2">
                        <div className="flex gap-1 shrink-0">
                          {(dayPlan.type === 'training' || (!dayPlan.isMatchDay && !dayPlan.isRestDay)) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1 h-1 rounded-full bg-emerald-400" />
                              Entreno
                            </span>
                          )}
                          {dayPlan.isMatchDay && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1 h-1 rounded-full bg-amber-400" />
                              Partido
                            </span>
                          )}
                          {dayPlan.isRestDay && (
                            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] text-[#666666] bg-[#111111] border border-[#1F1F1F]">
                              Descanso
                            </span>
                          )}
                        </div>

                        {!dayPlan.isRestDay && !dayPlan.isMatchDay && (
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#737373] shrink-0">
                            <span>{totalTime}'</span>
                            <span>·</span>
                            <span>{availablePlayersCount}j</span>
                          </div>
                        )}
                      </div>

                      {dayPlan.isMatchDay && dayPlan.matchDetails?.opponent && (
                        <div className="flex items-center gap-1.5 font-mono text-[10px] bg-[#111111] text-[#EDEDED] px-2 py-1 rounded border border-[#262626] truncate mt-2">
                          <Swords className="w-3 h-3 text-[#888888] shrink-0" />
                          {dayPlan.matchDetails.time && <span className="text-[#A1A1AA]">{dayPlan.matchDetails.time}</span>}
                          <span className="truncate">
                            vs {dayPlan.matchDetails.opponent} ({dayPlan.matchDetails.isHome ? 'L' : 'V'})
                          </span>
                        </div>
                      )}

                      {(dayPlan.isRestDay || dayPlan.isMatchDay) && dayPlan.notes && (
                        <div
                          className="flex items-center gap-1 text-[10px] text-[#737373] bg-[#0F0F0F] px-2 py-1 rounded border border-[#1F1F1F] truncate mt-2"
                          title={dayPlan.notes}
                        >
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate">{dayPlan.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Day Content (Droppable) */}
                    <div
                      className={`flex-1 p-2 space-y-1.5 min-h-[150px] ${
                        dayPlan.plannedExercises.length === 0
                          ? 'overflow-hidden flex flex-col justify-center'
                          : 'overflow-y-auto custom-scrollbar'
                      }`}
                    >
                      {dayPlan.isRestDay ? (
                        <div className="h-full flex items-center justify-center text-[#525252] text-[12px]">
                          Día libre
                        </div>
                      ) : (dayPlan.isMatchDay || dayPlan.type === 'match') && dayPlan.plannedExercises.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-3 rounded-md bg-[#0F0F0F] border border-[#1F1F1F] text-[#A1A1AA]">
                          <Trophy className="w-4 h-4 mb-1.5 text-amber-400" />
                          <span className="text-[11px] font-medium">Jornada de Competición</span>
                        </div>
                      ) : dayPlan.plannedExercises.length === 0 ? (
                        <div className="h-full flex flex-col gap-2 items-center justify-center border border-dashed border-[#1F1F1F] rounded-md text-[#525252] text-[11px] text-center p-3">
                          Arrastra tareas aquí
                        </div>
                      ) : (
                        dayPlan.plannedExercises.map((ex, idx) => (
                          <div
                            key={ex.localId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ex, dateKey, ex.localId)}
                            onDragEnd={() => setIsDragging(false)}
                            onClick={() => setPreviewExercise(ex)}
                            className="p-2 rounded-md bg-[#111111] border border-[#222222] hover:border-[#3A3A3A] text-[12px] flex items-start justify-between gap-1.5 group cursor-grab"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-1">
                                <span className="font-mono text-[10px] text-[#666666] shrink-0">#{idx + 1}</span>
                                <span
                                  className="text-[#EDEDED] font-medium line-clamp-2 leading-tight text-[11px]"
                                  title={ex.title}
                                >
                                  {ex.title}
                                </span>
                              </div>
                              {ex.notes && (
                                <div
                                  className="text-[10px] text-[#737373] truncate mt-0.5 flex items-center gap-1"
                                  title={ex.notes}
                                >
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{ex.notes}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono text-[10px] text-[#A1A1AA] bg-[#1A1A1A] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                                {ex.duration}'
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeExercise(dateKey, ex.localId);
                                }}
                                className="text-[#666666] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      {!dayPlan.isRestDay && !dayPlan.isMatchDay && dayPlan.type !== 'match' && (
                        <button
                          onClick={() => setShowAdHocModal(dateKey)}
                          className="w-full mt-1.5 py-1.5 border border-dashed border-[#262626] rounded-md text-[11px] font-medium text-[#737373] hover:text-[#EDEDED] hover:border-[#404040] transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Tarea manual
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedDayKey && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-5 sm:p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
            {(() => {
              const dPlan = seasonPlan[selectedDayKey] || createEmptyDay(selectedDayKey);
              const dDate = parseISO(selectedDayKey);
              return (
                <>
                  <div className="flex justify-between items-start gap-3 mb-5 border-b border-[#1F1F1F] pb-4">
                    <div>
                      <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#EDEDED] flex flex-wrap items-center gap-2 tracking-[-0.02em]">
                        Hoja de Sesión · {getDayHeaderString(dDate)}
                        {dPlan.isMatchDay && (
                          <span className="font-mono px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                            Partido
                          </span>
                        )}
                        {dPlan.isRestDay && (
                          <span className="font-mono px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#888888] border border-[#262626] uppercase">
                            Descanso
                          </span>
                        )}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 font-mono text-[11px] text-[#737373]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {calculateTotalTime(dPlan.plannedExercises)} min
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {availablePlayersCount} disponibles
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDayKey(null)}
                      className="p-1.5 text-[#737373] hover:text-[#EDEDED] bg-[#111111] rounded-md border border-[#262626] shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="bg-[#0F0F0F] p-4 rounded-md border border-[#1F1F1F]">
                        <h4 className="text-[#EDEDED] font-medium mb-2.5 text-[12px]">Tipo de Jornada</h4>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => toggleDayStatus(selectedDayKey, 'training')}
                            className={`h-8 rounded text-[11px] font-medium border transition-colors ${
                              dPlan.type === 'training' || (!dPlan.isMatchDay && !dPlan.isRestDay)
                                ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                                : 'bg-[#0A0A0A] text-[#737373] border-[#262626] hover:text-[#EDEDED]'
                            }`}
                          >
                            Entreno
                          </button>
                          <button
                            onClick={() => toggleDayStatus(selectedDayKey, 'match')}
                            className={`h-8 rounded text-[11px] font-medium border transition-colors ${
                              dPlan.isMatchDay
                                ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                                : 'bg-[#0A0A0A] text-[#737373] border-[#262626] hover:text-[#EDEDED]'
                            }`}
                          >
                            Partido
                          </button>
                          <button
                            onClick={() => toggleDayStatus(selectedDayKey, 'rest')}
                            className={`h-8 rounded text-[11px] font-medium border transition-colors ${
                              dPlan.isRestDay
                                ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                                : 'bg-[#0A0A0A] text-[#737373] border-[#262626] hover:text-[#EDEDED]'
                            }`}
                          >
                            Descanso
                          </button>
                        </div>

                        {dPlan.isMatchDay && (
                          <button
                            onClick={() => {
                              setMatchForm(
                                dPlan.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '', location: '' }
                              );
                              setShowMatchModal(selectedDayKey);
                            }}
                            className="w-full h-8 mt-2.5 bg-[#141414] border border-[#262626] rounded text-[12px] text-[#EDEDED] font-medium hover:bg-[#1F1F1F] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {dPlan.matchDetails?.opponent ? 'Editar Datos del Partido' : 'Configurar Rival y Hora'}
                          </button>
                        )}
                      </div>

                      <div className="bg-[#0F0F0F] p-4 rounded-md border border-[#1F1F1F] flex flex-col justify-between">
                        <h4 className="text-[#EDEDED] font-medium text-[12px]">Efectivos Disponibles</h4>
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <span className="text-[#737373] text-[12px]">Plantilla apta hoy:</span>
                          <div className="bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-1.5 text-[#EDEDED] font-semibold font-mono text-[13px] flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#888888]" />
                            {availablePlayersCount}
                          </div>
                        </div>
                      </div>

                      {(dPlan.isRestDay || dPlan.isMatchDay) && (
                        <div className="bg-[#0F0F0F] p-4 rounded-md border border-[#1F1F1F] md:col-span-2">
                          <h4 className="text-[#EDEDED] font-medium mb-2 text-[12px] flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#737373]" />
                            Observaciones del Día
                          </h4>
                          <textarea
                            value={dPlan.notes || ''}
                            onChange={(e) => updateDayPlan(selectedDayKey, { notes: e.target.value })}
                            placeholder="Ej. Citación 1 hora antes, llevar segunda equipación..."
                            className="w-full bg-[#050505] border border-[#262626] rounded-md p-2.5 text-[#EDEDED] focus:outline-none focus:border-[#525252] min-h-[72px] resize-none text-[12px]"
                          />
                        </div>
                      )}
                    </div>

                    {!dPlan.isRestDay && !dPlan.isMatchDay && activeTeam && (
                      <div className="bg-[#0F0F0F] p-4 rounded-md border border-[#1F1F1F] relative">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h4 className="text-[#EDEDED] font-medium text-[12px]">Control de Asistencia</h4>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#A1A1AA] bg-[#0A0A0A] px-2 py-1 rounded border border-[#222222]">
                              {activeTeam.players.filter(isActiveRoster).length - (dPlan.absentPlayers?.length || 0)} /{' '}
                              {activeTeam.players.filter(isActiveRoster).length}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const rosterPlayers = activeTeam.players.filter(isActiveRoster);
                                const text = buildAttendanceWhatsappText({
                                  dayHeader: getDayHeaderString(dDate),
                                  rosterPlayers,
                                  absentIds: dPlan.absentPlayers || [],
                                });
                                navigator.clipboard.writeText(text).then(() => {
                                  setCopiedAttendance(true);
                                  setTimeout(() => setCopiedAttendance(false), 2500);
                                });
                              }}
                              className="h-7 flex items-center gap-1.5 px-2.5 rounded text-[11px] font-medium border border-[#262626] bg-[#141414] text-[#EDEDED] hover:bg-[#1F1F1F] transition-colors"
                            >
                              {copiedAttendance ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-[#888888]" />
                              )}
                              <span>{copiedAttendance ? 'Copiado' : 'WhatsApp'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                exportSessionSheetPDF({
                                  dayHeader: getDayHeaderString(dDate),
                                  dateKey: selectedDayKey,
                                  teamName: activeTeam.name || 'Mi Equipo',
                                  dayPlan: dPlan,
                                  rosterPlayers: activeTeam.players.filter(isActiveRoster),
                                  mapCategory: mapLegacyCategory,
                                });
                              }}
                              className="h-7 flex items-center gap-1.5 px-2.5 rounded text-[11px] font-medium bg-[#EDEDED] text-[#0A0A0A] hover:bg-white transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Hoja PDF</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[190px] overflow-y-auto custom-scrollbar">
                          {activeTeam.players.filter(isActiveRoster).map(player => {
                            const isAttending = Array.isArray(dPlan.attendedPlayers)
                              ? dPlan.attendedPlayers.includes(player.id)
                              : !dPlan.absentPlayers?.includes(player.id);
                            const isAbsent = !isAttending;
                            return (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => togglePlayerAttendance(selectedDayKey, player.id)}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded border cursor-pointer transition-colors text-left ${
                                  isAbsent
                                    ? 'bg-[#080808] border-[#1F1F1F] text-[#525252]'
                                    : 'bg-[#0A0A0A] border-[#262626] text-[#EDEDED]'
                                }`}
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center shrink-0 border transition-colors ${
                                    isAttending
                                      ? 'bg-[#EDEDED] border-white text-[#0A0A0A]'
                                      : 'bg-transparent border-[#404040] text-transparent'
                                  }`}
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                                <span className={`text-[12px] font-medium truncate ${isAbsent ? 'line-through' : ''}`}>
                                  {player.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-[#EDEDED] font-medium mb-2.5 text-[13px]">Bloques de la Sesión</h4>
                      {dPlan.plannedExercises.length === 0 ? (
                        <div className="p-6 text-center text-[#666666] text-[12px] bg-[#0F0F0F] rounded-md border border-[#1F1F1F] border-dashed">
                          Sin tareas asignadas. Arrastra ejercicios desde el catálogo en la vista semanal.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dPlan.plannedExercises.map((ex, idx) => {
                            const mappedCat = mapLegacyCategory(ex.category);
                            return (
                              <div
                                key={ex.localId}
                                className="flex items-stretch bg-[#0F0F0F] rounded-md border border-[#1F1F1F] overflow-hidden"
                              >
                                <div className="flex flex-col justify-center items-center bg-[#080808] w-10 border-r border-[#1F1F1F]">
                                  <span className="font-mono text-[#737373] font-semibold text-[11px]">#{idx + 1}</span>
                                </div>
                                <div className="p-3 flex-1 flex justify-between items-center gap-3">
                                  <div>
                                    <h5 className="font-medium text-[#EDEDED] text-[13px] mb-1 flex items-center gap-2">
                                      {ex.title}
                                      {ex.time && (
                                        <span className="font-mono text-[10px] text-[#A1A1AA] bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">
                                          {ex.time}
                                        </span>
                                      )}
                                    </h5>
                                    <span className="font-mono text-[10px] text-[#737373]">{mappedCat}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="1"
                                      max="120"
                                      value={ex.duration}
                                      onChange={(e) =>
                                        updateExerciseDuration(selectedDayKey, ex.localId, parseInt(e.target.value) || 0)
                                      }
                                      className="w-14 h-8 bg-[#050505] border border-[#262626] rounded px-2 text-[#EDEDED] font-mono text-[12px] text-center focus:outline-none focus:border-[#525252]"
                                    />
                                    <span className="font-mono text-[#737373] text-[11px]">min</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Match Config Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-6 max-w-sm w-full relative">
            <button
              onClick={() => setShowMatchModal(null)}
              className="absolute top-4 right-4 text-[#71717A] hover:text-[#EDEDED] p-1 rounded-md hover:bg-[#18181B] transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-[16px] font-semibold text-[#EDEDED] mb-4 pr-6">Configurar Jornada de Partido</h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[#888888] text-[11px] font-medium mb-1">Equipo Rival (Liga)</label>
                <RivalSelector
                  teamId={activeTeam?.id}
                  value={matchForm.opponent}
                  isAway={!matchForm.isHome}
                  onChange={(name, rival) =>
                    setMatchForm(prev => ({
                      ...prev,
                      opponent: name,
                      location: !prev.isHome && rival?.stadium ? rival.stadium : prev.location,
                    }))
                  }
                  onAutoStadium={(stadium) => setMatchForm(prev => ({ ...prev, location: stadium }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#888888] text-[11px] font-medium mb-1">Hora</label>
                  <input
                    type="time"
                    value={matchForm.time || ''}
                    onChange={(e) => setMatchForm({ ...matchForm, time: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] font-mono text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                  />
                </div>
                <div>
                  <label className="block text-[#888888] text-[11px] font-medium mb-1">Condición</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setMatchForm({ ...matchForm, isHome: true })}
                      className={`flex-1 h-9 rounded-md text-[12px] font-medium border transition-colors ${
                        matchForm.isHome
                          ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                          : 'bg-[#050505] text-[#737373] border-[#262626]'
                      }`}
                    >
                      Local
                    </button>
                    <button
                      onClick={() => setMatchForm({ ...matchForm, isHome: false })}
                      className={`flex-1 h-9 rounded-md text-[12px] font-medium border transition-colors ${
                        !matchForm.isHome
                          ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                          : 'bg-[#050505] text-[#737373] border-[#262626]'
                      }`}
                    >
                      Visit.
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#888888] text-[11px] font-medium mb-1">Estadio / Campo</label>
                <input
                  type="text"
                  value={matchForm.location || ''}
                  onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })}
                  placeholder="Ej. Estadio Municipal"
                  className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                />
              </div>

              <div>
                <label className="block text-[#888888] text-[11px] font-medium mb-1">Competición</label>
                <select
                  value={matchForm.competition}
                  onChange={(e) => setMatchForm({ ...matchForm, competition: e.target.value })}
                  className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                >
                  <option value="Liga">Liga</option>
                  <option value="Copa">Copa</option>
                  <option value="Amistoso">Amistoso</option>
                  <option value="Torneo">Torneo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#1F1F1F]">
              <button
                onClick={() => setShowMatchModal(null)}
                className="h-8 px-3 rounded-md text-[12px] font-medium text-[#888888] hover:text-[#EDEDED]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMatch}
                disabled={!matchForm.opponent}
                className="h-8 px-4 rounded-md text-[12px] font-medium bg-[#EDEDED] text-[#0A0A0A] hover:bg-white disabled:opacity-40"
              >
                Guardar Partido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AdHoc Exercise Modal */}
      {showAdHocModal && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-6 max-w-sm w-full relative">
            <button
              onClick={() => setShowAdHocModal(null)}
              className="absolute top-4 right-4 text-[#71717A] hover:text-[#EDEDED] p-1 rounded-md hover:bg-[#18181B] transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-[16px] font-semibold text-[#EDEDED] mb-4 pr-6">Añadir Tarea Manual</h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[#888888] text-[11px] font-medium mb-1">Título del Ejercicio</label>
                <input
                  type="text"
                  value={adHocForm.title}
                  onChange={(e) => setAdHocForm({ ...adHocForm, title: e.target.value })}
                  placeholder="Ej. Rondo 4v2"
                  className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#888888] text-[11px] font-medium mb-1">Hora (Opc.)</label>
                  <input
                    type="time"
                    value={adHocForm.time || ''}
                    onChange={(e) => setAdHocForm({ ...adHocForm, time: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] font-mono text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                  />
                </div>
                <div>
                  <label className="block text-[#888888] text-[11px] font-medium mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={adHocForm.duration}
                    onChange={(e) => setAdHocForm({ ...adHocForm, duration: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] font-mono text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#888888] text-[11px] font-medium mb-1">Categoría</label>
                <select
                  value={adHocForm.category}
                  onChange={(e) => setAdHocForm({ ...adHocForm, category: e.target.value })}
                  className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
                >
                  {(customCategories || []).map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Carga Física">Carga Física</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-[#888888] text-[11px] font-medium mb-1">Notas / Consignas</label>
                <textarea
                  value={adHocForm.notes || ''}
                  onChange={(e) => setAdHocForm({ ...adHocForm, notes: e.target.value })}
                  placeholder="Ej. Presión tras pérdida, máxima intensidad..."
                  className="w-full bg-[#050505] border border-[#262626] rounded-md p-2.5 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252] min-h-[72px] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#1F1F1F]">
              <button
                onClick={() => setShowAdHocModal(null)}
                className="h-8 px-3 rounded-md text-[12px] font-medium text-[#888888] hover:text-[#EDEDED]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdHoc}
                disabled={!adHocForm.title}
                className="h-8 px-4 rounded-md text-[12px] font-medium bg-[#EDEDED] text-[#0A0A0A] hover:bg-white disabled:opacity-40"
              >
                Añadir Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Preview Modal */}
      {previewExercise && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-5 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-[15px] font-semibold text-[#EDEDED] pr-4">{previewExercise.title}</h3>
              <button
                onClick={() => setPreviewExercise(null)}
                className="p-1 text-[#737373] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-[#050505] rounded-md border border-[#1F1F1F] mb-4 overflow-hidden relative flex items-center justify-center">
              {previewExercise.thumbnailUrl ? (
                <img src={previewExercise.thumbnailUrl} alt={previewExercise.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-[#525252]">
                  <PlaySquare className="w-6 h-6" />
                  <span className="text-[11px]">Tarea sin captura gráfica</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-md overflow-hidden">
              <div className="bg-[#0A0A0A] p-3">
                <span className="text-[#666666] text-[10px] uppercase block mb-0.5">Categoría</span>
                <span className="font-mono text-[12px] font-medium text-[#EDEDED]">
                  {mapLegacyCategory(previewExercise.category)}
                </span>
              </div>
              <div className="bg-[#0A0A0A] p-3">
                <span className="text-[#666666] text-[10px] uppercase block mb-0.5">Duración</span>
                <span className="font-mono text-[12px] font-medium text-[#EDEDED]">
                  {'duration' in previewExercise ? `${previewExercise.duration} min` : '20 min'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Report Modal */}
      {showAttendanceModal && activeTeam && (
        <AttendanceReportModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          players={activeTeam.players}
          seasonPlan={seasonPlan}
          activeTeamName={activeTeam.name}
          teamSettings={teamSettings}
          teamId={activeTeam.id}
        />
      )}
    </div>
  );
});






