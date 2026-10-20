import React from 'react';
import { Clock, Users, Swords, Trophy, Trash2, Plus, Home } from 'lucide-react';
import { DayEvent, DayEventType, TrainingEvent, MatchEvent, RestEvent } from '../../types/planner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DayColumnProps {
  date: Date;
  dayPlan: DayEvent;
  isTodayDate: boolean;
  isDragging: boolean;
  onUpdateEvent: (dateKey: string, updatedEvent: DayEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, dateKey: string) => void;
  // Extras inherited from planner
  totalTrainingTime: number;
  handleDragStartTask: (e: React.DragEvent, ex: any, dateKey: string, localId: string) => void;
  removeTask: (dateKey: string, localId: string) => void;
  setPreviewExercise: (ex: any) => void;
  setShowAdHocModal: (dateKey: string) => void;
  mapCategory: (cat: string) => string;
  categoryColors: Record<string, string>;
}

export function DayColumn({
  date,
  dayPlan,
  isTodayDate,
  isDragging,
  onUpdateEvent,
  onDragOver,
  onDrop,
  totalTrainingTime,
  handleDragStartTask,
  removeTask,
  setPreviewExercise,
  setShowAdHocModal,
  mapCategory,
  categoryColors,
}: DayColumnProps) {
  const dateKey = format(date, 'yyyy-MM-dd');
  
  const getDayHeaderString = (d: Date) => {
    return format(d, 'EEEE dd/MM', { locale: es }).replace(/^w/, (c) => c.toUpperCase());
  };

  const handleChangeType = (newType: DayEventType) => {
    let newEvent: DayEvent;
    
    if (newType === 'training') {
      newEvent = { type: 'training', dateString: dateKey, playersNeeded: dayPlan.playersNeeded, plannedExercises: [] } as TrainingEvent;
    } else if (newType === 'match') {
      newEvent = { 
        type: 'match', dateString: dateKey, playersNeeded: dayPlan.playersNeeded, 
        time: '12:00', opponent: '', location: 'home' 
      } as MatchEvent;
    } else {
      newEvent = { type: 'rest', dateString: dateKey, playersNeeded: 0 } as RestEvent;
    }
    
    onUpdateEvent(dateKey, newEvent);
  };

  const handleMatchChange = (field: keyof MatchEvent, value: any) => {
    if (dayPlan.type !== 'match') return;
    onUpdateEvent(dateKey, { ...dayPlan, [field]: value });
  };

  return (
    <div 
      onDragOver={dayPlan.type === 'training' ? onDragOver : undefined}
      onDrop={dayPlan.type === 'training' ? (e) => onDrop(e, dateKey) : undefined}
      className={`flex flex-col rounded-lg border transition-colors h-full ${
        dayPlan.type === 'match'
          ? 'bg-[#161616] border-[#333333]' 
          : dayPlan.type === 'rest'
            ? 'bg-[#111111]/50 border-[#1F1F1F]/50'
            : `bg-[#0A0A0A] ${isTodayDate ? 'border-[#333333]' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`
      } ${isDragging && dayPlan.type === 'training' ? 'border-dashed border-opacity-70' : ''}`}
    >
      {/* HEADER COLUMN */}
      <div className={`p-3 border-b flex flex-col gap-2 rounded-t-2xl relative ${
          dayPlan.type === 'match' ? 'border-[#333333]' : 'border-[#1F1F1F]'
        }`}
      >
        <div className="flex justify-between items-center">
          <h3 className={`font-bold ${dayPlan.type === 'match' || isTodayDate ? 'text-[#EDEDED]' : 'text-white'}`}>
            {getDayHeaderString(date)}
          </h3>
          
          {/* DESPLEGABLE DE TIPO DE EVENTO */}
          <select 
            value={dayPlan.type}
            onChange={(e) => handleChangeType(e.target.value as DayEventType)}
            className="bg-[#111111] text-xs font-bold text-white border border-[#1F1F1F] rounded px-1.5 py-1 focus:outline-none focus:border-[#525252]"
          >
            <option value="training">🏃 Entrenamiento</option>
            <option value="match">⚽ Partido</option>
            <option value="rest">🛋️ Descanso</option>
          </select>
        </div>

        {/* SUMMARY HEADER BADGES */}
        {dayPlan.type === 'training' && (
          <div className="flex justify-between text-xs text-[#888888] font-medium">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {totalTrainingTime} min</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {dayPlan.playersNeeded} j.</span>
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar min-h-[150px]">
        
        {/* VISTA DESCANSO */}
        {dayPlan.type === 'rest' && (
          <div className="h-full flex items-center justify-center text-[#888888] text-sm italic opacity-50">
            Día de descanso activo / pasivo
          </div>
        )}

        {/* VISTA ENTRENAMIENTO (Dropzone) */}
        {dayPlan.type === 'training' && (
          <>
            {dayPlan.plannedExercises.length === 0 ? (
              <div className="h-[120px] flex flex-col gap-2 items-center justify-center border-2 border-dashed border-[#1F1F1F] rounded-md text-[#888888] text-xs text-center p-4">
                Arrastra tareas aquí
              </div>
            ) : (
              dayPlan.plannedExercises.map((ex, idx) => {
                const mappedCat = mapCategory(ex.category);
                return (
                  <div 
                    key={ex.localId}
                    draggable
                    onDragStart={(e) => handleDragStartTask(e, ex, dateKey, ex.localId)}
                    onClick={() => setPreviewExercise(ex)}
                    className={`p-2 rounded-lg bg-[#111111] border-l-2 ${categoryColors[mappedCat]?.split(' ')[0] || 'border-gray-500'} border border-[#1F1F1F] text-xs flex justify-between items-center group cursor-grab`}
                  >
                    <div className="flex-1 truncate mr-2">
                      <span className="text-[#888888] mr-1">#{idx + 1}</span>
                      {ex.time && <span className="text-[#EDEDED] mr-1 text-[10px]">⏰ {ex.time}</span>}
                      <span className="text-white font-medium truncate" title={ex.title}>{ex.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#888888]">{ex.duration}'</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeTask(dateKey, ex.localId); }}
                        className="text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <button 
              onClick={() => setShowAdHocModal(dateKey)}
              className="w-full mt-2 py-1.5 border border-dashed border-[#1F1F1F] rounded-lg text-xs font-bold text-[#888888] hover:text-white hover:border-[#6E6E75] transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> Añadir Tarea Manual
            </button>
          </>
        )}

        {/* VISTA PARTIDO (Formulario Nativo) */}
        {dayPlan.type === 'match' && (
          <div className="flex flex-col gap-3 p-3 bg-[#111111] rounded-md border border-[#1F1F1F]">
            <div>
              <label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1 block">Rival</label>
              <div className="relative">
                <Swords className="w-4 h-4 text-[#EDEDED] absolute left-2.5 top-1/2 -translate-y-1/2 opacity-70" />
                <input 
                  type="text" 
                  value={dayPlan.opponent}
                  onChange={(e) => handleMatchChange('opponent', e.target.value)}
                  placeholder="Ej: CF Inter..."
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#525252] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1 block">Hora</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#EDEDED] absolute left-2.5 top-1/2 -translate-y-1/2 opacity-70" />
                  <input 
                    type="time" 
                    value={dayPlan.time}
                    onChange={(e) => handleMatchChange('time', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg pl-8 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#525252]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1 block">Ubicación</label>
                <div className="flex bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-0.5">
                  <button 
                    onClick={() => handleMatchChange('location', 'home')}
                    className={`flex-1 text-[10px] font-bold rounded-md py-1.5 transition-colors ${
                      dayPlan.location === 'home' ? 'bg-[#EDEDED] text-[#0A0A0A] shadow' : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Local
                  </button>
                  <button 
                    onClick={() => handleMatchChange('location', 'away')}
                    className={`flex-1 text-[10px] font-bold rounded-md py-1.5 transition-colors ${
                      dayPlan.location === 'away' ? 'bg-[#1A1A1A] text-white shadow' : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Visit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
