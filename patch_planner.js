const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, X, GripVertical, Trash2, Plus, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, PlaySquare } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { Exercise } from '../context/SessionContext';

export interface PlannedExercise extends Exercise {
  localId: string;
  duration: number;
}

export interface TrainingDay {
  id: string; // 'mon', 'tue', etc.
  name: string;
  plannedExercises: PlannedExercise[];
  isMatchDay: boolean;
  isRestDay: boolean;
  playersNeeded: number;
}

export type MacroTag = 'Entrenamiento' | 'Partido Oficial' | 'Amistoso' | 'Descanso' | '';

export interface SeasonDay {
  dateString: string; 
  tag: MacroTag;
}

const INITIAL_DAYS: TrainingDay[] = [
  { id: 'mon', name: 'Lunes', plannedExercises: [], isMatchDay: false, isRestDay: true, playersNeeded: 22 },
  { id: 'tue', name: 'Martes', plannedExercises: [], isMatchDay: false, isRestDay: false, playersNeeded: 22 },
  { id: 'wed', name: 'Miércoles', plannedExercises: [], isMatchDay: false, isRestDay: false, playersNeeded: 22 },
  { id: 'thu', name: 'Jueves', plannedExercises: [], isMatchDay: false, isRestDay: false, playersNeeded: 22 },
  { id: 'fri', name: 'Viernes', plannedExercises: [], isMatchDay: false, isRestDay: false, playersNeeded: 22 },
  { id: 'sat', name: 'Sábado', plannedExercises: [], isMatchDay: false, isRestDay: false, playersNeeded: 22 },
  { id: 'sun', name: 'Domingo', plannedExercises: [], isMatchDay: true, isRestDay: false, playersNeeded: 22 },
];

const CategoryColors: Record<string, string> = {
  'transition': 'border-yellow-500 text-yellow-400',
  'possession': 'border-blue-500 text-blue-400',
  'buildup': 'border-green-500 text-green-400',
  'set-piece': 'border-purple-500 text-purple-400',
  'match': 'border-[#FF4B4B] text-[#FF4B4B]',
};

const CategoryLabels: Record<string, string> = {
  'transition': 'Transiciones',
  'possession': 'Posesión',
  'buildup': 'Salida de Balón',
  'set-piece': 'ABP',
  'match': '11v11 / Partido',
};

const TagColors: Record<MacroTag, string> = {
  'Entrenamiento': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  'Partido Oficial': 'bg-[#FF4B4B]/20 text-[#FF4B4B] border-[#FF4B4B]/50',
  'Amistoso': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'Descanso': 'bg-[#2A2A2E]/50 text-[#6E6E75] border-[#2A2A2E]',
  '': 'bg-transparent text-transparent border-transparent'
};

export function TrainingPlanner() {
  const { savedExercises } = useSession();
  
  const [viewMode, setViewMode] = useState<'micro' | 'macro'>('micro');

  // Microcycle State
  const [days, setDays] = useState<TrainingDay[]>(INITIAL_DAYS);
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Preview Modal State
  const [previewExercise, setPreviewExercise] = useState<Exercise | PlannedExercise | null>(null);

  // Macrocycle State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [seasonData, setSeasonData] = useState<Record<string, SeasonDay>>({});

  useEffect(() => {
    const savedMicro = localStorage.getItem('savedMicrocycles_F11');
    if (savedMicro) {
      try {
        const parsed = JSON.parse(savedMicro);
        if (parsed && Array.isArray(parsed) && parsed.length === 7) {
          setDays(parsed);
        }
      } catch (e) {
        console.error("Error loading microcycle", e);
      }
    }
    
    const savedMacro = localStorage.getItem('seasonCalendar');
    if (savedMacro) {
      try {
        setSeasonData(JSON.parse(savedMacro));
      } catch (e) {
        console.error("Error loading macrocycle", e);
      }
    }
  }, []);

  const saveMicrocycle = (newDays: TrainingDay[]) => {
    setDays(newDays);
    localStorage.setItem('savedMicrocycles_F11', JSON.stringify(newDays));
  };
  
  const saveSeasonData = (newData: Record<string, SeasonDay>) => {
    setSeasonData(newData);
    localStorage.setItem('seasonCalendar', JSON.stringify(newData));
  };

  // --- MICROCYCLE LOGIC ---

  const handleDragStart = (e: React.DragEvent, exercise: Exercise, sourceDayId?: string, localId?: string) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({ exercise, sourceDayId, localId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDayId: string) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { exercise, sourceDayId, localId } = data;

      if (!exercise) return;

      let newDays = [...days];

      // Remove from source if it was moved from another day
      if (sourceDayId && localId && sourceDayId !== targetDayId) {
        newDays = newDays.map(d => {
          if (d.id === sourceDayId) {
            return { ...d, plannedExercises: d.plannedExercises.filter(ex => ex.localId !== localId) };
          }
          return d;
        });
      }

      // Add to target day
      const targetDay = newDays.find(d => d.id === targetDayId);
      if (targetDay) {
        // If it was already a PlannedExercise (has localId and duration), keep it.
        // Otherwise, it's a fresh Exercise from the library.
        const exerciseToAdd: PlannedExercise = localId && sourceDayId 
          ? { ...exercise, localId, duration: exercise.duration || 20 } 
          : { ...exercise, localId: \`\${exercise.id}-\${Date.now()}\`, duration: 20 };

        // Prevent exact duplicates locally? No, allow multiple of same exercise
        targetDay.plannedExercises.push(exerciseToAdd);
      }

      saveMicrocycle(newDays);
    } catch (err) {
      console.error("Error dropping exercise", err);
    }
  };

  const removeExercise = (dayId: string, localId: string) => {
    const newDays = days.map(day => {
      if (day.id === dayId) {
        return { ...day, plannedExercises: day.plannedExercises.filter(ex => ex.localId !== localId) };
      }
      return day;
    });
    saveMicrocycle(newDays);
  };

  const toggleDayStatus = (dayId: string, status: 'match' | 'rest') => {
    const newDays = days.map(day => {
      if (day.id === dayId) {
        return { 
          ...day, 
          isMatchDay: status === 'match' ? !day.isMatchDay : (status === 'rest' ? false : day.isMatchDay),
          isRestDay: status === 'rest' ? !day.isRestDay : (status === 'match' ? false : day.isRestDay),
        };
      }
      return day;
    });
    saveMicrocycle(newDays);
  };

  const updatePlayersNeeded = (dayId: string, players: number) => {
    const newDays = days.map(day => {
      if (day.id === dayId) {
        return { ...day, playersNeeded: players };
      }
      return day;
    });
    saveMicrocycle(newDays);
    if (selectedDay && selectedDay.id === dayId) {
      setSelectedDay(newDays.find(d => d.id === dayId) || null);
    }
  };
  
  const updateExerciseDuration = (dayId: string, localId: string, duration: number) => {
    const newDays = days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          plannedExercises: day.plannedExercises.map(ex => ex.localId === localId ? { ...ex, duration } : ex)
        };
      }
      return day;
    });
    saveMicrocycle(newDays);
    if (selectedDay && selectedDay.id === dayId) {
      setSelectedDay(newDays.find(d => d.id === dayId) || null);
    }
  };

  const calculateTotalTime = (exercises: PlannedExercise[]) => {
    return exercises.reduce((total, ex) => total + (ex.duration || 0), 0);
  };

  // --- MACROCYCLE LOGIC ---

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  
  const toggleMacroTag = (dateString: string) => {
    const currentTag = seasonData[dateString]?.tag || '';
    const tagCycle: MacroTag[] = ['', 'Entrenamiento', 'Partido Oficial', 'Amistoso', 'Descanso'];
    const nextIdx = (tagCycle.indexOf(currentTag) + 1) % tagCycle.length;
    const nextTag = tagCycle[nextIdx];
    
    saveSeasonData({
      ...seasonData,
      [dateString]: { dateString, tag: nextTag }
    });
  };

  const renderMacroCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Sunday is 6
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    
    const gridCells = [];
    
    // Empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      gridCells.push(<div key={\`empty-\${i}\`} className="bg-[#0A0A0C] border border-[#1C1C1F] rounded-xl opacity-30"></div>);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(i).padStart(2, '0')}\`;
      const dayData = seasonData[dateString];
      const hasTag = dayData && dayData.tag !== '';
      
      gridCells.push(
        <div 
          key={dateString} 
          onClick={() => toggleMacroTag(dateString)}
          className={\`bg-[#121215] border \${hasTag ? 'border-[#2A2A2E]' : 'border-[#1C1C1F] hover:border-[#FF4B4B]/30'} rounded-xl p-3 h-28 flex flex-col cursor-pointer transition-colors relative\`}
        >
          <span className="text-[#6E6E75] font-bold text-lg mb-2">{i}</span>
          {hasTag && (
            <div className={\`mt-auto text-[10px] font-bold px-2 py-1 rounded border text-center truncate \${TagColors[dayData.tag]}\`}>
              {dayData.tag}
            </div>
          )}
          {!hasTag && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-[#6E6E75] text-xs">Añadir etiqueta</span>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex-1 flex flex-col p-6 bg-[#0A0A0C] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{monthNames[month]} {year}</h2>
          <div className="flex gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 bg-[#1C1C1F] text-[#6E6E75] hover:text-white rounded-lg border border-[#2A2A2E]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 bg-[#1C1C1F] text-[#6E6E75] hover:text-white rounded-lg border border-[#2A2A2E]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-4 mb-4">
          {dayNames.map(d => (
            <div key={d} className="text-center font-bold text-[#6E6E75] text-sm">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-4">
          {gridCells}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center bg-[#121215] p-6 border-b border-[#2A2A2E] shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-[#FF4B4B]" />
            Planificador de Temporada
          </h1>
          <p className="text-[#6E6E75]">Organiza microciclos semanales o la visión a largo plazo del macrociclo.</p>
        </div>
        
        <div className="flex bg-[#1C1C1F] p-1 rounded-xl border border-[#2A2A2E]">
          <button
            onClick={() => setViewMode('micro')}
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors \${viewMode === 'micro' ? 'bg-[#FF4B4B] text-black shadow-lg' : 'text-[#6E6E75] hover:text-white'}\`}
          >
            <LayoutGrid className="w-4 h-4" /> Microciclo Semanal
          </button>
          <button
            onClick={() => setViewMode('macro')}
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors \${viewMode === 'macro' ? 'bg-[#FF4B4B] text-black shadow-lg' : 'text-[#6E6E75] hover:text-white'}\`}
          >
            <CalendarDays className="w-4 h-4" /> Macrociclo Mensual
          </button>
        </div>
      </div>

      {viewMode === 'macro' ? renderMacroCalendar() : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Real Exercise Library */}
          <div className="w-80 bg-[#1C1C1F] border-r border-[#2A2A2E] flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0">
            <div className="p-4 border-b border-[#2A2A2E] sticky top-0 bg-[#1C1C1F] z-10">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#FF4B4B]" />
                Catálogo de Tareas
              </h3>
              <p className="text-xs text-[#6E6E75] mt-1">Arrastra tareas al calendario o haz clic para ver</p>
            </div>
            <div className="p-4 space-y-4">
              {savedExercises.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-[#2A2A2E] rounded-xl text-[#6E6E75] text-sm">
                  No tienes tareas guardadas. Ve a la Pizarra y guarda tus ejercicios para que aparezcan aquí.
                </div>
              ) : (
                savedExercises.map(exercise => (
                  <div 
                    key={exercise.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, exercise)}
                    onDragEnd={() => setIsDragging(false)}
                    onClick={() => setPreviewExercise(exercise)}
                    className={\`p-3 rounded-xl bg-[#121215] border-l-4 \${CategoryColors[exercise.category]?.split(' ')[0] || 'border-gray-500'} border-t border-r border-b border-[#2A2A2E] cursor-grab active:cursor-grabbing hover:bg-[#2A2A2E]/50 transition-colors group\`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white text-sm group-hover:text-[#FF4B4B] transition-colors line-clamp-2">{exercise.title}</h4>
                      <GripVertical className="w-4 h-4 text-[#6E6E75] shrink-0" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={\`px-2 py-0.5 rounded bg-white/5 \${CategoryColors[exercise.category]?.split(' ')[1] || 'text-gray-400'}\`}>
                        {CategoryLabels[exercise.category] || exercise.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Calendar Grid */}
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6 bg-[#0A0A0C]">
            <div className="grid grid-cols-7 gap-4 min-w-[1000px] h-full">
              {days.map(day => {
                const totalTime = calculateTotalTime(day.plannedExercises);
                
                return (
                  <div 
                    key={day.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day.id)}
                    className={\`flex flex-col rounded-2xl border transition-colors h-full \${
                      day.isMatchDay 
                        ? 'bg-[#FF4B4B]/5 border-[#FF4B4B]/30' 
                        : day.isRestDay 
                          ? 'bg-[#1C1C1F]/50 border-[#2A2A2E]/50'
                          : 'bg-[#121215] border-[#2A2A2E] hover:border-[#FF4B4B]/30'
                    } \${isDragging ? 'border-dashed border-opacity-70' : ''}\`}
                  >
                    {/* Day Header */}
                    <div 
                      onClick={() => setSelectedDay(day)}
                      className={\`p-3 border-b flex flex-col gap-2 cursor-pointer transition-colors \${
                        day.isMatchDay ? 'border-[#FF4B4B]/30 hover:bg-[#FF4B4B]/10' : 'border-[#2A2A2E] hover:bg-[#1C1C1F]'
                      } rounded-t-2xl\`}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className={\`font-bold \${day.isMatchDay ? 'text-[#FF4B4B]' : 'text-white'}\`}>{day.name}</h3>
                        <div className="flex gap-1">
                          {day.isMatchDay && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF4B4B] text-black">PARTIDO</span>}
                          {day.isRestDay && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2A2A2E] text-white">DESCANSO</span>}
                        </div>
                      </div>
                      {!day.isRestDay && !day.isMatchDay && (
                        <div className="flex justify-between text-xs text-[#6E6E75] font-medium">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {totalTime} min</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {day.playersNeeded} j.</span>
                        </div>
                      )}
                    </div>

                    {/* Day Content (Droppable) */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar min-h-[150px]">
                      {day.isRestDay ? (
                        <div className="h-full flex items-center justify-center text-[#6E6E75] text-sm italic opacity-50">
                          Día libre
                        </div>
                      ) : day.plannedExercises.length === 0 ? (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-[#2A2A2E] rounded-xl text-[#6E6E75] text-xs text-center p-4">
                          Arrastra tareas aquí
                        </div>
                      ) : (
                        day.plannedExercises.map((ex, idx) => (
                          <div 
                            key={ex.localId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ex, day.id, ex.localId)}
                            onDragEnd={() => setIsDragging(false)}
                            onClick={() => setPreviewExercise(ex)}
                            className={\`p-2 rounded-lg bg-[#1C1C1F] border-l-2 \${CategoryColors[ex.category]?.split(' ')[0] || 'border-gray-500'} border border-[#2A2A2E] text-xs flex justify-between items-center group cursor-grab\`}
                          >
                            <div className="flex-1 truncate mr-2">
                              <span className="text-[#6E6E75] mr-1">#{idx + 1}</span>
                              <span className="text-white font-medium truncate" title={ex.title}>{ex.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[#6E6E75]">{ex.duration}'</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeExercise(day.id, ex.localId); }}
                                className="text-[#6E6E75] hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
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
      {selectedDay && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-start mb-6 border-b border-[#2A2A2E] pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  Hoja de Sesión - {selectedDay.name}
                  {selectedDay.isMatchDay && <span className="px-2 py-1 rounded text-xs font-bold bg-[#FF4B4B] text-black uppercase">Día de Partido</span>}
                  {selectedDay.isRestDay && <span className="px-2 py-1 rounded text-xs font-bold bg-[#2A2A2E] text-white uppercase">Descanso</span>}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-[#6E6E75]">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Duración Total: {calculateTotalTime(selectedDay.plannedExercises)} min</span>
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Jugadores convocados: {selectedDay.playersNeeded}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-2 text-[#6E6E75] hover:text-white bg-[#1C1C1F] rounded-lg border border-[#2A2A2E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]">
                  <h4 className="text-white font-bold mb-3 text-sm">Estado del Día</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleDayStatus(selectedDay.id, 'match')}
                      className={\`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors \${
                        selectedDay.isMatchDay ? 'bg-[#FF4B4B] text-black border-[#FF4B4B]' : 'bg-[#121215] text-[#6E6E75] border-[#2A2A2E] hover:text-white'
                      }\`}
                    >
                      Competición
                    </button>
                    <button 
                      onClick={() => toggleDayStatus(selectedDay.id, 'rest')}
                      className={\`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors \${
                        selectedDay.isRestDay ? 'bg-[#2A2A2E] text-white border-white/20' : 'bg-[#121215] text-[#6E6E75] border-[#2A2A2E] hover:text-white'
                      }\`}
                    >
                      Descanso
                    </button>
                  </div>
                </div>
                
                <div className="bg-[#1C1C1F] p-4 rounded-xl border border-[#2A2A2E]">
                  <h4 className="text-white font-bold mb-3 text-sm">Gestión de Plantilla (F11)</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[#6E6E75] text-sm">Jugadores Disponibles:</span>
                    <input 
                      type="number" 
                      min="1" max="25"
                      value={selectedDay.playersNeeded}
                      onChange={(e) => updatePlayersNeeded(selectedDay.id, parseInt(e.target.value) || 22)}
                      className="w-20 bg-[#121215] border border-[#2A2A2E] rounded-lg px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-[#FF4B4B]"
                    />
                  </div>
                </div>
              </div>

              <h4 className="text-white font-bold mb-3 text-lg">Estructura de la Sesión</h4>
              
              {selectedDay.plannedExercises.length === 0 ? (
                <div className="p-8 text-center text-[#6E6E75] bg-[#1C1C1F] rounded-xl border border-[#2A2A2E] border-dashed">
                  No hay tareas asignadas para este día. Utiliza el panel de la izquierda para arrastrar ejercicios.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.plannedExercises.map((ex, idx) => (
                    <div key={ex.localId} className={\`flex items-stretch bg-[#1C1C1F] rounded-xl border-l-4 \${CategoryColors[ex.category]?.split(' ')[0] || 'border-gray-500'} border-t border-r border-b border-[#2A2A2E] overflow-hidden\`}>
                      <div className="flex flex-col justify-center items-center bg-[#121215] w-12 border-r border-[#2A2A2E]">
                        <span className="text-[#6E6E75] font-bold text-sm">#{idx + 1}</span>
                      </div>
                      <div className="p-4 flex-1 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-white mb-1">{ex.title}</h5>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={\`font-medium px-2 py-0.5 rounded bg-white/5 \${CategoryColors[ex.category]?.split(' ')[1] || 'text-gray-400'}\`}>
                              {CategoryLabels[ex.category] || ex.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="1" max="120"
                            value={ex.duration}
                            onChange={(e) => updateExerciseDuration(selectedDay.id, ex.localId, parseInt(e.target.value) || 0)}
                            className="w-16 bg-[#121215] border border-[#2A2A2E] rounded-lg px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-[#FF4B4B]"
                          />
                          <span className="text-[#6E6E75] text-sm">min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exercise Preview Modal */}
      {previewExercise && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{previewExercise.title}</h3>
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
                  <span className="text-white text-xs">Sin previsualización</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]">
                <span className="text-[#6E6E75] text-xs block mb-1">Categoría</span>
                <span className={\`font-bold \${CategoryColors[previewExercise.category]?.split(' ')[1] || 'text-white'}\`}>
                  {CategoryLabels[previewExercise.category] || previewExercise.category}
                </span>
              </div>
              <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]">
                <span className="text-[#6E6E75] text-xs block mb-1">Duración Asignada</span>
                <span className="text-white font-bold">
                  {'duration' in previewExercise ? \`\${previewExercise.duration} min\` : '20 min (Por defecto)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
fs.writeFileSync('src/components/TrainingPlanner.tsx', content);
