import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, X, GripVertical, Trash2, Plus, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, PlaySquare, Trophy, Swords, MapPin, MessageSquare } from 'lucide-react';
import { useSession, Exercise } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
  teamId?: string; // added teamId
}

const CategoryColors: Record<string, string> = {
  'Calentamiento': 'border-orange-500 text-orange-400 bg-orange-500/10',
  'Posesión': 'border-blue-500 text-blue-400 bg-blue-500/10',
  'Transiciones': 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  'Trabajo por Líneas': 'border-cyan-500 text-cyan-400 bg-cyan-500/10',
  'Salida de Balón': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  'ABP': 'border-purple-500 text-purple-400 bg-purple-500/10',
  'Otros': 'border-gray-500 text-gray-400 bg-gray-500/10',
  'transition': 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  'possession': 'border-blue-500 text-blue-400 bg-blue-500/10',
  'buildup': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  'set-piece': 'border-purple-500 text-purple-400 bg-purple-500/10',
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
  const { activeTeam, updateTeamPlayers, teams } = useTeam();
  
  const availablePlayersCount = React.useMemo(() => {
    if (!activeTeam) return 0;
    return activeTeam.players.filter(p => p.status !== 'injured' && !p.isSuspended).length;
  }, [activeTeam]);

  const [viewMode, setViewMode] = useState<'micro' | 'macro'>('macro');

  // Core Date & Persistence State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [seasonPlan, setSeasonPlan] = useState<Record<string, DailyPlan>>({});

  // UI States
  const [isDragging, setIsDragging] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | PlannedExercise | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  
  const [showMatchModal, setShowMatchModal] = useState<string | null>(null); // holds dateKey
  const [matchForm, setMatchForm] = useState<MatchDetails>({ opponent: '', isHome: true, competition: 'Liga', time: '' });

  const [showAdHocModal, setShowAdHocModal] = useState<string | null>(null); // holds dateKey
  const [adHocForm, setAdHocForm] = useState({ title: '', duration: 20, category: 'Calentamiento', time: '', notes: '' });

  const [filterCategory, setFilterCategory] = useState<string>('Todos');

  useEffect(() => {
    const savedPlan = localStorage.getItem('am_manager_season_plan');
    if (savedPlan) {
      try {
        const parsed = JSON.parse(savedPlan);
        const migrated: Record<string, DailyPlan> = {};
        const fallbackTeamId = activeTeam?.id || (teams && teams.length > 0 ? teams[0].id : undefined);
        
        for (const [key, plan] of Object.entries(parsed)) {
           migrated[key] = {
             ...(plan as DailyPlan),
             teamId: (plan as DailyPlan).teamId || fallbackTeamId
           };
        }
        setSeasonPlan(migrated);
      } catch (e) {
        console.error("Error loading season plan", e);
      }
    }
  }, [activeTeam?.id, teams]);

  const saveSeasonPlan = (newPlan: Record<string, DailyPlan>) => {
    setSeasonPlan(newPlan);
    localStorage.setItem('am_manager_season_plan', JSON.stringify(newPlan));
    
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
      matchDetails: isMatch ? (day.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '' }) : (isRest ? undefined : day.matchDetails)
    });

    if (isMatch) {
      setMatchForm(day.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '' });
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
    setAdHocForm({ title: '', duration: 20, category: 'Calentamiento', time: '', notes: '' });
  };

  // --- CALENDAR RENDERING ---

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [];
  let currentIterDate = startDate;
  while (currentIterDate <= endDate) {
    calendarDays.push(currentIterDate);
    currentIterDate = addDays(currentIterDate, 1);
  }

  const navigatePrev = () => setCurrentDate(viewMode === 'micro' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const navigateNext = () => setCurrentDate(viewMode === 'micro' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  const navigateToday = () => setCurrentDate(new Date());

  const getDayHeaderString = (date: Date) => {
    return format(date, 'EEEE dd/MM', { locale: es }).replace(/^w/, (c) => c.toUpperCase());
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0A0A0C]">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#121215] p-6 border-b border-[#2A2A2E] shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-[#FF4B4B]" />
            Planificador de Temporada
          </h1>
          <p className="text-[#6E6E75]">
            {viewMode === 'micro' 
              ? 'Organiza el microciclo semanal arrastrando tareas a los días.'
              : 'Visión general a largo plazo del macrociclo.'}
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-end">
          <div className="flex bg-[#1C1C1F] p-1 rounded-xl border border-[#2A2A2E]">
            <button
              onClick={() => setViewMode('micro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'micro' ? 'bg-[#FF4B4B] text-black shadow-lg' : 'text-[#6E6E75] hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Microciclo
            </button>
            <button
              onClick={() => setViewMode('macro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'macro' ? 'bg-[#FF4B4B] text-black shadow-lg' : 'text-[#6E6E75] hover:text-white'}`}
            >
              <CalendarDays className="w-4 h-4" /> Macrociclo
            </button>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <button onClick={navigateToday} className="px-3 py-1.5 text-xs font-bold text-white bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg hover:border-[#FF4B4B]/50 transition-colors">
              HOY
            </button>
            <div className="flex items-center bg-[#1C1C1F] rounded-lg border border-[#2A2A2E]">
              <button onClick={navigatePrev} className="p-2 text-[#6E6E75] hover:text-white transition-colors border-r border-[#2A2A2E]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-bold text-white min-w-[180px] text-center">
                {viewMode === 'micro' 
                  ? `${format(weekStart, 'd MMM', { locale: es })} - ${format(addDays(weekStart, 6), 'd MMM, yyyy', { locale: es })}`
                  : format(monthStart, 'MMMM yyyy', { locale: es }).replace(/^w/, c => c.toUpperCase())
                }
              </span>
              <button onClick={navigateNext} className="p-2 text-[#6E6E75] hover:text-white transition-colors border-l border-[#2A2A2E]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'macro' ? (
        // --- MACROCYCLE (MONTH) VIEW ---
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
              <div key={d} className="text-center font-bold text-[#6E6E75] text-sm uppercase tracking-wider">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-4">
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
                  className={`
                    border rounded-xl p-3 h-32 flex flex-col cursor-pointer transition-all relative group
                    ${!isCurrentMonth ? 'opacity-40 bg-[#0A0A0C] border-[#1C1C1F]' : 'bg-[#121215]'}
                    ${isTodayDate ? 'border-[#FF4B4B]/50 shadow-[0_0_15px_rgba(255,75,75,0.15)]' : 'border-[#2A2A2E] hover:border-[#FF4B4B]/50'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-bold text-lg ${isTodayDate ? 'text-[#FF4B4B]' : 'text-white'}`}>
                      {format(dayDate, 'd')}
                    </span>
                    <div className="flex gap-1">
                      {!dayPlan?.isMatchDay && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMatchForm({ opponent: '', isHome: true, competition: 'Liga', time: '' }); setShowMatchModal(dateKey); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#6E6E75] hover:text-[#FF4B4B] transition-opacity"
                          title="Añadir Partido"
                        >
                          <Trophy className="w-4 h-4" />
                        </button>
                      )}
                      {dayPlan?.isMatchDay && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMatchForm(dayPlan.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '' }); setShowMatchModal(dateKey); }}
                          className="p-1 text-[#FF4B4B] hover:text-white transition-opacity text-white"
                          title="Editar Partido"
                        >
                          <Trophy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-1">
                    {(dayPlan?.type === 'rest' || dayPlan?.isRestDay) && (
                      <div className="text-[10px] font-bold px-2 py-1 rounded bg-[#2A2A2E]/50 text-[#6E6E75] border border-[#2A2A2E] text-center">
                        DESCANSO
                      </div>
                    )}
                    
                    {(dayPlan?.type === 'match' || dayPlan?.isMatchDay) && (
                      <div className="text-[10px] font-bold text-[#FF4B4B] bg-[#FF4B4B]/10 px-2 py-1 rounded border border-[#FF4B4B]/30 truncate flex items-center gap-1">
                        <Trophy className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {dayPlan.matchDetails?.time && <span>{dayPlan.matchDetails.time} - </span>}
                          {dayPlan.matchDetails?.opponent ? `${dayPlan.matchDetails.opponent} (${dayPlan.matchDetails?.isHome ? 'L' : 'V'})` : 'Sin Rival'}
                        </span>
                      </div>
                    )}
                    
                    {(dayPlan?.type === 'training' || (!dayPlan?.isMatchDay && !dayPlan?.isRestDay)) && (
                      <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1 justify-center">
                        {hasTraining ? (
                          <>
                            <LayoutGrid className="w-3 h-3" />
                            {dayPlan.plannedExercises.length} Tareas ({totalTime}')
                          </>
                        ) : (
                          <span>ENTRENO</span>
                        )}
                      </div>
                    )}

                    {(dayPlan?.isRestDay || dayPlan?.isMatchDay) && dayPlan?.notes && (
                      <div className="text-[10px] text-[#6E6E75] bg-[#1C1C1F] px-2 py-1 rounded border border-[#2A2A2E] truncate flex items-center gap-1" title={dayPlan.notes}>
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span className="truncate italic">{dayPlan.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // --- MICROCYCLE (WEEK) VIEW ---
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Real Exercise Library */}
          <div className="w-80 bg-[#1C1C1F] border-r border-[#2A2A2E] flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0">
            <div className="p-4 border-b border-[#2A2A2E] sticky top-0 bg-[#1C1C1F] z-10">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#FF4B4B]" />
                Catálogo de Tareas
              </h3>
              <p className="text-xs text-[#6E6E75] mt-1">Arrastra tareas al calendario</p>
              
              <div className="mt-4 flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                {['Todos', 'Calentamiento', 'Posesión', 'Transiciones', 'Trabajo por Líneas', 'Salida de Balón', 'ABP', 'Carga Física', 'Otros'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border ${
                      filterCategory === cat 
                        ? 'bg-[#FF4B4B] text-black border-[#FF4B4B]' 
                        : 'bg-[#121215] text-[#6E6E75] border-[#2A2A2E] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 space-y-4">
              {(() => {
                const filteredExercises = savedExercises.filter(ex => filterCategory === 'Todos' || ex.category === filterCategory);
                if (filteredExercises.length === 0) {
                  return (
                    <div className="text-center p-6 border border-dashed border-[#2A2A2E] rounded-xl text-[#6E6E75] text-sm">
                      No hay tareas guardadas en esta categoría.
                    </div>
                  );
                }
                return filteredExercises.map(exercise => {
                  const mappedCat = mapLegacyCategory(exercise.category);
                  return (
                    <div 
                      key={exercise.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, exercise)}
                      onDragEnd={() => setIsDragging(false)}
                      onClick={() => setPreviewExercise(exercise)}
                      className={`p-3 rounded-xl bg-[#121215] border-l-4 border ${CategoryColors[mappedCat]?.split(' ')[0] || 'border-gray-500'} border-[#2A2A2E] cursor-grab active:cursor-grabbing hover:bg-[#2A2A2E]/50 transition-colors group`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-sm group-hover:text-[#FF4B4B] transition-colors line-clamp-2">{exercise.title}</h4>
                        <GripVertical className="w-4 h-4 text-[#6E6E75] shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className={`px-2 py-0.5 rounded ${CategoryColors[mappedCat] || 'bg-gray-500/10 text-gray-400'}`}>
                          {mappedCat}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Main Calendar Grid */}
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-7 gap-4 min-w-[1200px] h-full">
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
                    className={`flex flex-col rounded-2xl border transition-colors h-full ${
                      dayPlan.isMatchDay 
                        ? 'bg-[#FF4B4B]/5 border-[#FF4B4B]/30' 
                        : dayPlan.isRestDay 
                          ? 'bg-[#1C1C1F]/50 border-[#2A2A2E]/50'
                          : `bg-[#121215] ${isTodayDate ? 'border-[#FF4B4B]/50' : 'border-[#2A2A2E] hover:border-[#FF4B4B]/30'}`
                    } ${isDragging ? 'border-dashed border-opacity-70' : ''}`}
                  >
                    {/* Day Header */}
                    <div 
                      onClick={() => setSelectedDayKey(dateKey)}
                      className={`p-3 border-b flex flex-col gap-2 cursor-pointer transition-colors ${
                        dayPlan.isMatchDay ? 'border-[#FF4B4B]/30 hover:bg-[#FF4B4B]/10' : 'border-[#2A2A2E] hover:bg-[#1C1C1F]'
                      } rounded-t-2xl relative group`}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className={`font-bold ${dayPlan.isMatchDay || isTodayDate ? 'text-[#FF4B4B]' : 'text-white'}`}>
                          {getDayHeaderString(date)}
                        </h3>
                        <div className="flex gap-1">
                          {(dayPlan.type === 'training' || (!dayPlan.isMatchDay && !dayPlan.isRestDay)) && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-500/50">ENTRENO</span>}
                          {dayPlan.isMatchDay && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF4B4B] text-black">PARTIDO</span>}
                          {dayPlan.isRestDay && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2A2A2E] text-white">DESCANSO</span>}
                        </div>
                      </div>
                      
                      {dayPlan.isMatchDay && dayPlan.matchDetails?.opponent && (
                        <div className="flex items-center gap-1 text-[10px] bg-[#1C1C1F] text-white px-2 py-1 rounded border border-[#2A2A2E] truncate">
                          <Swords className="w-3 h-3 text-[#FF4B4B]" />
                          {dayPlan.matchDetails.time && <span className="text-[#FF4B4B]">{dayPlan.matchDetails.time} - </span>}
                          {dayPlan.matchDetails.played && dayPlan.matchDetails.score && <span className="text-emerald-400 font-bold">✅ {dayPlan.matchDetails.score} - </span>}
                          vs {dayPlan.matchDetails.opponent} ({dayPlan.matchDetails.isHome ? 'L' : 'V'})
                        </div>
                      )}

                      {!dayPlan.isRestDay && !dayPlan.isMatchDay && (
                        <div className="flex justify-between text-xs text-[#6E6E75] font-medium">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {totalTime} min</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {availablePlayersCount} j.</span>
                        </div>
                      )}

                      {(dayPlan.isRestDay || dayPlan.isMatchDay) && dayPlan.notes && (
                        <div className="flex items-center gap-1 text-[10px] text-[#6E6E75] bg-[#1C1C1F] px-2 py-1 rounded border border-[#2A2A2E] truncate" title={dayPlan.notes}>
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate italic">{dayPlan.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Day Content (Droppable) */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar min-h-[150px]">
                      {dayPlan.isRestDay ? (
                        <div className="h-full flex items-center justify-center text-[#6E6E75] text-sm italic opacity-50">
                          Día libre
                        </div>
                      ) : dayPlan.plannedExercises.length === 0 ? (
                        <div className="h-full flex flex-col gap-2 items-center justify-center border-2 border-dashed border-[#2A2A2E] rounded-xl text-[#6E6E75] text-xs text-center p-4">
                          Arrastra tareas aquí
                        </div>
                      ) : (
                        dayPlan.plannedExercises.map((ex, idx) => {
                          const mappedCat = mapLegacyCategory(ex.category);
                          return (
                            <div 
                              key={ex.localId}
                              draggable
                              onDragStart={(e) => handleDragStart(e, ex, dateKey, ex.localId)}
                              onDragEnd={() => setIsDragging(false)}
                              onClick={() => setPreviewExercise(ex)}
                              className={`p-2 rounded-lg bg-[#1C1C1F] border-l-2 ${CategoryColors[mappedCat]?.split(' ')[0] || 'border-gray-500'} border border-[#2A2A2E] text-xs flex justify-between items-center group cursor-grab`}
                            >
                              <div className="flex-1 truncate mr-2">
                                <div className="flex items-center truncate">
                                  <span className="text-[#6E6E75] mr-1">#{idx + 1}</span>
                                  {ex.time && <span className="text-[#FF4B4B] mr-1 text-[10px]">⏰ {ex.time}</span>}
                                  <span className="text-white font-medium truncate" title={ex.title}>{ex.title}</span>
                                </div>
                                {ex.notes && (
                                  <div className="text-[10px] text-[#6E6E75] truncate mt-0.5 flex items-center gap-1" title={ex.notes}>
                                    <MessageSquare className="w-3 h-3 shrink-0" />
                                    <span className="truncate italic">{ex.notes}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[#6E6E75]">{ex.duration}'</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); removeExercise(dateKey, ex.localId); }}
                                  className="text-[#6E6E75] hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                      
                      {!dayPlan.isRestDay && (
                         <button 
                           onClick={() => setShowAdHocModal(dateKey)}
                           className="w-full mt-2 py-1.5 border border-dashed border-[#2A2A2E] rounded-lg text-xs font-bold text-[#6E6E75] hover:text-white hover:border-[#6E6E75] transition-colors flex items-center justify-center gap-1"
                         >
                           <Plus className="w-3 h-3" /> Añadir Tarea Manual
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
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {(() => {
              const dPlan = seasonPlan[selectedDayKey] || createEmptyDay(selectedDayKey);
              const dDate = parseISO(selectedDayKey);
              return (
                <>
                  <div className="flex justify-between items-start mb-6 border-b border-[#2A2A2E] pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        Hoja de Sesión - {getDayHeaderString(dDate)}
                        {dPlan.isMatchDay && <span className="px-2 py-1 rounded text-xs font-bold bg-[#FF4B4B] text-black uppercase">Día de Partido</span>}
                        {dPlan.isRestDay && <span className="px-2 py-1 rounded text-xs font-bold bg-[#2A2A2E] text-white uppercase">Descanso</span>}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-[#6E6E75]">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Duración Total: {calculateTotalTime(dPlan.plannedExercises)} min</span>
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Jugadores convocados: {availablePlayersCount}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedDayKey(null)}
                      className="p-2 text-[#6E6E75] hover:text-white bg-[#1C1C1F] rounded-lg border border-[#2A2A2E]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]">
                        <h4 className="text-white font-bold mb-3 text-sm">Estado del Día</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => toggleDayStatus(selectedDayKey, 'training')}
                            className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                              dPlan.type === 'training' || (!dPlan.isMatchDay && !dPlan.isRestDay) ? 'bg-[#10B981] text-black border-[#10B981]' : 'bg-[#121215] text-[#6E6E75] border-[#2A2A2E] hover:text-white'
                            }`}
                          >
                            Entrenamiento
                          </button>
                          <button 
                            onClick={() => toggleDayStatus(selectedDayKey, 'match')}
                            className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                              dPlan.isMatchDay ? 'bg-[#FF4B4B] text-black border-[#FF4B4B]' : 'bg-[#121215] text-[#6E6E75] border-[#2A2A2E] hover:text-white'
                            }`}
                          >
                            Competición
                          </button>
                          <button 
                            onClick={() => toggleDayStatus(selectedDayKey, 'rest')}
                            className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                              dPlan.isRestDay ? 'bg-[#2A2A2E] text-white border-white/20' : 'bg-[#121215] text-[#6E6E75] border-[#2A2A2E] hover:text-white'
                            }`}
                          >
                            Descanso
                          </button>
                        </div>
                        
                        {dPlan.isMatchDay && (
                          <button
                            onClick={() => {
                              setMatchForm(dPlan.matchDetails || { opponent: '', isHome: true, competition: 'Liga', time: '' });
                              setShowMatchModal(selectedDayKey);
                            }}
                            className="w-full mt-3 py-2 bg-[#121215] border border-[#2A2A2E] rounded-lg text-sm text-white font-medium hover:border-[#FF4B4B]/50 transition-colors flex items-center justify-center gap-2"
                          >
                            <Trophy className="w-4 h-4" /> 
                            {dPlan.matchDetails?.opponent ? 'Editar Partido' : 'Configurar Partido'}
                          </button>
                        )}
                      </div>
                       <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]">
                        <h4 className="text-white font-bold mb-3 text-sm">Gestión de Plantilla</h4>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#6E6E75] text-sm">Jugadores Disponibles (Autocalculado):</span>
                          <div className="bg-[#121215] border border-[#2A2A2E] rounded-lg px-4 py-2 text-[#FF4B4B] font-bold font-mono text-center flex items-center justify-center gap-2 shadow-inner">
                            <Users className="w-4 h-4" />
                            {availablePlayersCount}
                          </div>
                        </div>
                      </div>

                      {(dPlan.isRestDay || dPlan.isMatchDay) && (
                        <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E] col-span-2">
                          <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[#6E6E75]" />
                            Notas / Observaciones del Día
                          </h4>
                          <textarea 
                            value={dPlan.notes || ''}
                            onChange={(e) => updateDayPlan(selectedDayKey, { notes: e.target.value })}
                            placeholder="Ej. Viaje largo en bus, comer a las 14:00..."
                            className="w-full bg-[#121215] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B] min-h-[80px] resize-none text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {!dPlan.isRestDay && !dPlan.isMatchDay && activeTeam && (
                      <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E] mb-6">
                        <h4 className="text-white font-bold mb-3 text-sm flex items-center justify-between">
                          <span>Pase de Lista (Asistencia)</span>
                          <span className="text-xs font-normal text-[#6E6E75] bg-[#121215] px-2 py-1 rounded">
                            {activeTeam.players.length - (dPlan.absentPlayers?.length || 0)} / {activeTeam.players.length} asistentes
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                          {activeTeam.players.map(player => {
                            const isAbsent = dPlan.absentPlayers?.includes(player.id);
                            return (
                              <label key={player.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#2A2A2E] cursor-pointer hover:bg-[#2A2A2E]/50 transition-colors bg-[#121215]">
                                <input 
                                  type="checkbox"
                                  checked={!isAbsent}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    let currentAbsents = dPlan.absentPlayers || [];
                                    if (checked) {
                                      currentAbsents = currentAbsents.filter(id => id !== player.id);
                                    } else {
                                      currentAbsents = [...currentAbsents, player.id];
                                    }
                                    updateDayPlan(selectedDayKey, { absentPlayers: currentAbsents });
                                  }}
                                  className="w-4 h-4 rounded border-[#2A2A2E] text-emerald-500 focus:ring-emerald-500 bg-[#1C1C1F] accent-emerald-500"
                                />
                                <span className={`text-sm font-medium ${isAbsent ? 'text-[#6E6E75] line-through' : 'text-[#E0E0E0]'}`}>
                                  {player.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <h4 className="text-white font-bold mb-3 text-lg">Estructura de la Sesión</h4>
                    
                    {dPlan.plannedExercises.length === 0 ? (
                      <div className="p-8 text-center text-[#6E6E75] bg-[#1C1C1F] rounded-xl border border-[#2A2A2E] border-dashed">
                        No hay tareas asignadas para este día. Utiliza el panel de la izquierda para arrastrar ejercicios.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dPlan.plannedExercises.map((ex, idx) => {
                          const mappedCat = mapLegacyCategory(ex.category);
                          return (
                            <div key={ex.localId} className={`flex items-stretch bg-[#1C1C1F] rounded-xl border-l-4 ${CategoryColors[mappedCat]?.split(' ')[0] || 'border-gray-500'} border-t border-r border-b border-[#2A2A2E] overflow-hidden`}>
                              <div className="flex flex-col justify-center items-center bg-[#121215] w-12 border-r border-[#2A2A2E]">
                                <span className="text-[#6E6E75] font-bold text-sm">#{idx + 1}</span>
                              </div>
                              <div className="p-4 flex-1 flex justify-between items-center">
                                <div>
                                  <h5 className="font-bold text-white mb-1 flex items-center gap-2">
                                    {ex.title}
                                    {ex.time && <span className="text-xs text-[#FF4B4B] bg-[#FF4B4B]/10 px-2 py-0.5 rounded border border-[#FF4B4B]/20">⏱️ {ex.time}</span>}
                                  </h5>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span className={`font-medium px-2 py-0.5 rounded ${CategoryColors[mappedCat] || 'bg-gray-500/10 text-gray-400'}`}>
                                      {mappedCat}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    min="1" max="120"
                                    value={ex.duration}
                                    onChange={(e) => updateExerciseDuration(selectedDayKey, ex.localId, parseInt(e.target.value) || 0)}
                                    className="w-16 bg-[#121215] border border-[#2A2A2E] rounded-lg px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-[#FF4B4B]"
                                  />
                                  <span className="text-[#6E6E75] text-sm">min</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Match Config Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Configurar Partido</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Equipo Rival</label>
                <input 
                  type="text" 
                  value={matchForm.opponent}
                  onChange={(e) => setMatchForm({...matchForm, opponent: e.target.value})}
                  placeholder="Ej. FC Barcelona"
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Hora (Opc.)</label>
                  <input 
                    type="time" 
                    value={matchForm.time || ''}
                    onChange={(e) => setMatchForm({...matchForm, time: e.target.value})}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Condición</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMatchForm({...matchForm, isHome: true})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${matchForm.isHome ? 'bg-[#FF4B4B] text-black border-[#FF4B4B]' : 'bg-[#1C1C1F] text-[#6E6E75] border-[#2A2A2E]'}`}
                    >
                      Local
                    </button>
                    <button
                      onClick={() => setMatchForm({...matchForm, isHome: false})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${!matchForm.isHome ? 'bg-[#2A2A2E] text-white border-white/20' : 'bg-[#1C1C1F] text-[#6E6E75] border-[#2A2A2E]'}`}
                    >
                      Visitante
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Competición</label>
                <select 
                  value={matchForm.competition}
                  onChange={(e) => setMatchForm({...matchForm, competition: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                >
                  <option value="Liga">Liga</option>
                  <option value="Copa">Copa</option>
                  <option value="Amistoso">Amistoso</option>
                  <option value="Torneo">Torneo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowMatchModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-[#6E6E75] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveMatch}
                disabled={!matchForm.opponent}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-[#FF4B4B] text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Guardar Partido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AdHoc Exercise Modal */}
      {showAdHocModal && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Añadir Tarea Manual</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Título del Ejercicio</label>
                <input 
                  type="text" 
                  value={adHocForm.title}
                  onChange={(e) => setAdHocForm({...adHocForm, title: e.target.value})}
                  placeholder="Ej. Rondo 4v2"
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-[#6E6E75] text-sm font-medium mb-1">Hora (Opc.)</label>
                    <input 
                      type="time" 
                      value={adHocForm.time || ''}
                      onChange={(e) => setAdHocForm({...adHocForm, time: e.target.value})}
                      className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración (min)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={adHocForm.duration}
                      onChange={(e) => setAdHocForm({...adHocForm, duration: parseInt(e.target.value)||0})}
                      className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[#6E6E75] text-sm font-medium mb-1">Categoría</label>
                    <select 
                      value={adHocForm.category}
                      onChange={(e) => setAdHocForm({...adHocForm, category: e.target.value})}
                      className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                    >
                      <option value="Calentamiento">Calentamiento</option>
                      <option value="Posesión">Posesión</option>
                      <option value="Transiciones">Transiciones</option>
                      <option value="Trabajo por Líneas">Trabajo por Líneas</option>
                      <option value="Salida de Balón">Salida de Balón</option>
                      <option value="ABP">ABP</option>
                      <option value="Carga Física">Carga Física</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Notas / Observaciones (Opcional)</label>
                  <textarea 
                    value={adHocForm.notes || ''}
                    onChange={(e) => setAdHocForm({...adHocForm, notes: e.target.value})}
                    placeholder="Ej. Presión tras pérdida, máxima intensidad..."
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B] min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowAdHocModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-[#6E6E75] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAdHoc}
                disabled={!adHocForm.title}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-[#FF4B4B] text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Añadir Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Preview Modal */}
      {previewExercise && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white pr-4">{previewExercise.title}</h3>
              <button 
                onClick={() => setPreviewExercise(null)}
                className="p-1 text-[#6E6E75] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="aspect-video bg-[#1C1C1F] rounded-xl border border-[#2A2A2E] mb-4 overflow-hidden relative flex items-center justify-center">
              {previewExercise.thumbnailUrl ? (
                <img src={previewExercise.thumbnailUrl} alt={previewExercise.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <PlaySquare className="w-8 h-8 text-white" />
                  <span className="text-white text-xs">Sin previsualización / Ad-Hoc</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]">
                <span className="text-[#6E6E75] text-xs block mb-1">Categoría</span>
                <span className={`font-bold ${CategoryColors[mapLegacyCategory(previewExercise.category)]?.split(' ')[1] || 'text-white'}`}>
                  {mapLegacyCategory(previewExercise.category)}
                </span>
              </div>
              <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]">
                <span className="text-[#6E6E75] text-xs block mb-1">Duración Asignada</span>
                <span className="text-white font-bold">
                  {'duration' in previewExercise ? `${previewExercise.duration} min` : '20 min (Por defecto)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
