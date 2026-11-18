import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileDown,
  Flame,
  Layers,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { DailyPlan } from '../../../components/TrainingPlanner';
import {
  SessionIntensity,
  summarizeSessionMaterial,
} from '../domain/sessionPlanUtils';

interface SessionHeaderCardProps {
  selectedDateKey: string;
  seasonPlan: Record<string, DailyPlan>;
  dayPlan: DailyPlan;
  totalMinutes: number;
  exercisesCount: number;
  attendeesCount: number;
  rosterCount: number;
  copiedWa: boolean;
  exportingPdf: boolean;
  onSelectDateKey: (dateKey: string) => void;
  onBackToCalendar?: () => void;
  onUpdateDayPlan: (patch: Partial<DailyPlan>) => void;
  onCopyWhatsapp: () => void;
  onExportPdf: () => void;
}

export const SessionHeaderCard: React.FC<SessionHeaderCardProps> = ({
  selectedDateKey,
  seasonPlan,
  dayPlan,
  totalMinutes,
  exercisesCount,
  attendeesCount,
  rosterCount,
  copiedWa,
  exportingPdf,
  onSelectDateKey,
  onBackToCalendar,
  onUpdateDayPlan,
  onCopyWhatsapp,
  onExportPdf,
}) => {
  const parsedDate = parseISO(selectedDateKey);
  const weekStart = startOfWeek(parsedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, idx) => addDays(weekStart, idx));
  const formattedDayTitle = format(parsedDate, "EEEE d 'de' MMMM yyyy", { locale: es }).replace(
    /^\w/,
    c => c.toUpperCase()
  );

  const autoMaterial = summarizeSessionMaterial(dayPlan.plannedExercises || []);
  const intensity: SessionIntensity = dayPlan.intensity || 'Media';

  return (
    <div className="space-y-4">
      {/* Barra Superior de Navegación de Sesión */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {onBackToCalendar && (
            <button
              type="button"
              onClick={onBackToCalendar}
              className="h-8 px-3 rounded-md bg-[#121214] hover:bg-[#1C1C20] border border-[#27272A] text-[#EDEDED] text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#A1A1AA]" />
              <span>← Volver al Calendario</span>
            </button>
          )}

          <div className="flex items-center h-8 bg-[#050505] rounded-md border border-[#1F1F1F]">
            <button
              type="button"
              onClick={() => onSelectDateKey(format(addDays(parsedDate, -1), 'yyyy-MM-dd'))}
              className="h-full px-2.5 text-[#888888] hover:text-white border-r border-[#1F1F1F] text-[11px] flex items-center gap-1 cursor-pointer"
              title="Día Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <input
              type="date"
              value={selectedDateKey}
              onChange={e => e.target.value && onSelectDateKey(e.target.value)}
              aria-label="Seleccionar fecha de sesión"
              className="h-full px-2.5 bg-transparent font-mono text-[12px] text-[#EDEDED] focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onSelectDateKey(format(addDays(parsedDate, 1), 'yyyy-MM-dd'))}
              className="h-full px-2.5 text-[#888888] hover:text-white border-l border-[#1F1F1F] text-[11px] flex items-center gap-1 cursor-pointer"
              title="Día Siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chips rápidos de la semana */}
          <div className="flex items-center gap-1 bg-[#050505] p-1 rounded-md border border-[#1F1F1F] overflow-x-auto">
            {weekDays.map(d => {
              const dk = format(d, 'yyyy-MM-dd');
              const dp = seasonPlan[dk];
              const isSelected = dk === selectedDateKey;
              const hasTrain = dp && (!dp.isRestDay && !dp.isMatchDay && ((dp.plannedExercises?.length || 0) > 0 || dp.type === 'training'));
              const hasMatch = dp?.isMatchDay || dp?.type === 'match';
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => onSelectDateKey(dk)}
                  className={`h-6 px-2 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold'
                      : 'text-[#888888] hover:text-[#EDEDED] hover:bg-[#141414]'
                  }`}
                >
                  <span className="capitalize">{format(d, 'EEE d', { locale: es })}</span>
                  {hasTrain && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-400'}`} />}
                  {hasMatch && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopyWhatsapp}
            className="h-9 px-3 rounded-lg bg-[#121214] hover:bg-[#1B1B1F] border border-[#27272A] text-[#EDEDED] text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
          >
            {copiedWa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#A1A1AA]" />}
            <span>{copiedWa ? 'Copiado WhatsApp' : 'Resumen WhatsApp'}</span>
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>📄 Exportar Sesión en PDF</span>
          </button>
        </div>
      </div>

      {/* Cabecera de Datos Generales de la Sesión y KPIs */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#181818]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDayTitle}</span>
            </div>
            <h1 className="text-[19px] font-semibold text-[#EDEDED] tracking-tight mt-0.5">
              Preparación y Diseño de Sesión
            </h1>
          </div>

          {/* KPIs Automáticos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#0F0F12] border border-[#1F1F24]">
              <span className="text-[10px] font-mono text-[#737373] uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Duración Total
              </span>
              <div className="text-[15px] font-mono font-bold text-[#EDEDED]">{totalMinutes} min</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0F0F12] border border-[#1F1F24]">
              <span className="text-[10px] font-mono text-[#737373] uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-sky-400" /> Nº Ejercicios
              </span>
              <div className="text-[15px] font-mono font-bold text-[#EDEDED]">{exercisesCount} tareas</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0F0F12] border border-[#1F1F24]">
              <span className="text-[10px] font-mono text-[#737373] uppercase flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Intensidad / RPE
              </span>
              <div className="text-[15px] font-mono font-bold text-amber-300">{intensity}</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0F0F12] border border-[#1F1F24]">
              <span className="text-[10px] font-mono text-[#737373] uppercase flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" /> Asistentes Hoy
              </span>
              <div className="text-[15px] font-mono font-bold text-emerald-400">
                {attendeesCount} / {rosterCount}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-medium text-[#888888] mb-1">
              Título de la Sesión / Microciclo (MD)
            </label>
            <input
              type="text"
              value={dayPlan.sessionTitle || ''}
              onChange={e => onUpdateDayPlan({ sessionTitle: e.target.value, type: 'training', isRestDay: false })}
              placeholder="Ej. Sesión MD-3 · Salida de balón y presión tras pérdida"
              className="w-full h-9 px-3 bg-[#050505] border border-[#262626] rounded-md text-[12.5px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-[#888888] mb-1">Intensidad Prevista</label>
            <div className="grid grid-cols-3 gap-1 h-9 bg-[#050505] p-1 rounded-md border border-[#262626]">
              {(['Baja', 'Media', 'Alta'] as SessionIntensity[]).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onUpdateDayPlan({ intensity: level, type: 'training', isRestDay: false })}
                  className={`rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    intensity === level ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold' : 'text-[#888888] hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-[#888888]">Material Total Necesario</label>
              <button
                type="button"
                onClick={() => onUpdateDayPlan({ material: autoMaterial })}
                className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Calcular automáticamente desde las fichas de la pizarra táctica"
              >
                <Sparkles className="w-2.5 h-2.5" /> Auto-calcular
              </button>
            </div>
            <input
              type="text"
              value={dayPlan.material ?? ''}
              onChange={e => onUpdateDayPlan({ material: e.target.value })}
              placeholder={autoMaterial}
              className="w-full h-9 px-3 bg-[#050505] border border-[#262626] rounded-md text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-[11px] font-medium text-[#888888] mb-1">
              Objetivo Principal (Táctico / Modelo de Juego)
            </label>
            <input
              type="text"
              value={dayPlan.primaryObjective || ''}
              onChange={e => onUpdateDayPlan({ primaryObjective: e.target.value, type: 'training', isRestDay: false })}
              placeholder="Ej. Superar primera línea de presión rival mediante tercer hombre y amplitud"
              className="w-full h-9 px-3 bg-[#050505] border border-[#262626] rounded-md text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-[11px] font-medium text-[#888888] mb-1">
              Objetivo Secundario (Técnico / Condicional / ABP)
            </label>
            <input
              type="text"
              value={dayPlan.secondaryObjective || ''}
              onChange={e => onUpdateDayPlan({ secondaryObjective: e.target.value, type: 'training', isRestDay: false })}
              placeholder="Ej. Reacción inmediata 5 segundos tras pérdida y finalización en zona 3"
              className="w-full h-9 px-3 bg-[#050505] border border-[#262626] rounded-md text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
