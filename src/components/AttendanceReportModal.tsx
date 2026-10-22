import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import { addWeeks, subWeeks, addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Player } from '../types';
import { TeamSettings } from '../context/TeamContext';
import { DailyPlan } from './TrainingPlanner';
import {
  calculateAttendanceReport,
  exportAttendanceReportPdf,
  AttendanceReportMode,
} from '../services/attendanceReportPdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  seasonPlan: Record<string, DailyPlan>;
  activeTeamName: string;
  teamSettings?: TeamSettings;
  teamId?: string;
}

export function AttendanceReportModal({
  isOpen,
  onClose,
  players,
  seasonPlan,
  activeTeamName,
  teamSettings,
  teamId,
}: Props) {
  const [mode, setMode] = useState<AttendanceReportMode>('weekly');
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute report data dynamically
  const reportData = useMemo(() => {
    return calculateAttendanceReport(players, seasonPlan, mode, referenceDate, teamId);
  }, [players, seasonPlan, mode, referenceDate, teamId]);

  // Filter player records by search & position
  const filteredRecords = useMemo(() => {
    return reportData.playerRecords.filter(rec => {
      const matchesSearch =
        rec.player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(rec.player.number || '').includes(searchQuery);

      const matchesPos =
        positionFilter === 'ALL' ||
        (rec.player.position && rec.player.position.toUpperCase() === positionFilter.toUpperCase());

      return matchesSearch && matchesPos;
    });
  }, [reportData.playerRecords, searchQuery, positionFilter]);

  if (!isOpen) return null;

  const navigatePrev = () => {
    if (mode === 'weekly') setReferenceDate(prev => subWeeks(prev, 1));
    else if (mode === 'monthly') setReferenceDate(prev => subMonths(prev, 1));
  };

  const navigateNext = () => {
    if (mode === 'weekly') setReferenceDate(prev => addWeeks(prev, 1));
    else if (mode === 'monthly') setReferenceDate(prev => addMonths(prev, 1));
  };

  const navigateToday = () => {
    setReferenceDate(new Date());
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportAttendanceReportPdf(reportData, activeTeamName, teamSettings);
    } catch (err) {
      console.error('Error al exportar informe de asistencia a PDF:', err);
      alert('Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (pct >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-[#0A0A0A] border border-[#242424] rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F1F1F] bg-[#0E0E10] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[#EDEDED] tracking-tight">
                  Informe de Asistencia a Entrenamientos
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                  {activeTeamName}
                </span>
              </div>
              <p className="text-[12px] text-[#71717A]">
                Supervisión detallada de asistencia, faltas y compromiso del grupo por periodo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="h-8.5 px-3.5 bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Descargar informe oficial en formato PDF A4 apaisado"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md text-[#71717A] hover:text-[#EDEDED] hover:bg-[#18181B] border border-transparent hover:border-[#27272A] flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar ventana (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Navigation Controls Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#1F1F1F] bg-[#0A0A0A] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Segmented Mode Selector: Semanal / Mensual / General */}
          <div className="flex bg-[#050505] p-1 rounded-lg border border-[#222222]">
            <button
              onClick={() => setMode('weekly')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'weekly'
                  ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setMode('monthly')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'monthly'
                  ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setMode('general')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'general'
                  ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              General (Temporada)
            </button>
          </div>

          {/* Date Navigator (for weekly & monthly) */}
          {mode !== 'general' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={navigateToday}
                className="h-8 px-2.5 font-mono text-[11px] font-medium text-[#EDEDED] bg-[#121214] border border-[#262626] rounded-md hover:bg-[#1A1A1E] transition-colors cursor-pointer"
              >
                HOY
              </button>
              <div className="flex items-center h-8 bg-[#050505] rounded-md border border-[#222222]">
                <button
                  onClick={navigatePrev}
                  className="h-full px-2.5 text-[#888888] hover:text-[#EDEDED] transition-colors border-r border-[#222222] cursor-pointer"
                  title="Periodo anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-[12px] font-medium text-[#EDEDED] min-w-[170px] sm:min-w-[210px] text-center font-mono">
                  {reportData.dateRangeLabel}
                </span>
                <button
                  onClick={navigateNext}
                  className="h-full px-2.5 text-[#888888] hover:text-[#EDEDED] transition-colors border-l border-[#222222] cursor-pointer"
                  title="Periodo siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-[12px] font-mono text-[#888888] bg-[#121214] px-3 py-1.5 rounded-md border border-[#222222]">
              {reportData.dateRangeLabel}
            </span>
          )}

          {/* Quick Search Input */}
          <div className="relative flex items-center min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o dorsal..."
              className="w-full bg-[#121214] border border-[#222222] text-[#EDEDED] text-[12px] pl-8 pr-3 h-8 rounded-md focus:outline-none focus:border-[#444444] transition-colors"
            />
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#0C0C0E] border-b border-[#1F1F1F] grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-lg bg-[#141416] border border-[#242426] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-0.5">
                Sesiones Computadas
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {reportData.totalEvaluatedSessions}
              </div>
            </div>
            <div className="w-8 h-8 rounded-md bg-[#1C1C1F] flex items-center justify-center text-[#888888]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#141416] border border-[#242426] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-0.5">
                Asistencia Media de Grupo
              </div>
              <div className={`text-2xl font-bold font-mono ${
                reportData.averageAttendancePercentage >= 80 ? 'text-emerald-400' : reportData.averageAttendancePercentage >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {reportData.averageAttendancePercentage}%
              </div>
            </div>
            <div className="w-8 h-8 rounded-md bg-[#1C1C1F] flex items-center justify-center text-[#888888]">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#141416] border border-[#242426] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-0.5">
                Asistencia Plena (100%)
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {reportData.perfectAttendanceCount} <span className="text-xs text-[#71717A] font-normal">/ {reportData.playerRecords.length} jug.</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Interactive Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-4 sm:p-5">
          {reportData.totalEvaluatedSessions === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#242424] rounded-lg my-6">
              <Calendar className="w-8 h-8 text-[#555555] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#EDEDED] mb-1">
                No hay sesiones de entrenamiento registradas en este periodo
              </h3>
              <p className="text-xs text-[#71717A] max-w-md mx-auto">
                Planifica ejercicios o pasa lista en el calendario para que la asistencia se contabilice automáticamente en este informe.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71717A]">
              Ningún jugador coincide con la búsqueda activa.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#242424] text-[11px] font-mono uppercase tracking-wider text-[#71717A] bg-[#0E0E10] sticky top-0 z-10">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Jugador</th>
                  <th className="py-2.5 px-3 text-center">Posición</th>
                  <th className="py-2.5 px-3 text-center">Sesiones</th>
                  <th className="py-2.5 px-3 text-center">Faltas</th>
                  <th className="py-2.5 px-3 text-center w-40">% Asistencia</th>
                  {reportData.evaluatedDates.length <= 14 &&
                    reportData.evaluatedDates.map((d) => (
                      <th key={d.dateString} className="py-2.5 px-2 text-center font-mono">
                        <div className="text-[10px] text-[#A1A1AA]">{d.dayOfWeek}</div>
                        <div className="text-[9px] text-[#555555]">{d.dayNumber}</div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1D] text-[13px]">
                {filteredRecords.map((rec, index) => {
                  const pct = rec.attendancePercentage;
                  const pctClass = getPercentageColor(pct);
                  const barClass = getBarColor(pct);

                  return (
                    <tr
                      key={rec.player.id}
                      className="hover:bg-[#121215] transition-colors group"
                    >
                      {/* Dorsal */}
                      <td className="py-2.5 px-3 text-center font-mono text-[12px] font-semibold text-[#A1A1AA]">
                        {rec.player.number !== undefined ? `#${rec.player.number}` : '-'}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                        <span>{rec.player.name}</span>
                        {pct === 100 && reportData.totalEvaluatedSessions > 0 && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                            100%
                          </span>
                        )}
                      </td>

                      {/* Position */}
                      <td className="py-2.5 px-3 text-center text-[#888888] text-[12px]">
                        {rec.player.position || 'Jugador'}
                      </td>

                      {/* Sessions Attended / Total */}
                      <td className="py-2.5 px-3 text-center font-mono text-[12px] text-[#EDEDED]">
                        <span className="font-semibold text-emerald-400">{rec.presentCount}</span>
                        <span className="text-[#555555]"> / {rec.totalSessions}</span>
                      </td>

                      {/* Absences */}
                      <td className="py-2.5 px-3 text-center font-mono text-[12px]">
                        <span className={rec.absentCount > 0 ? 'text-red-400 font-bold' : 'text-[#555555]'}>
                          {rec.absentCount}
                        </span>
                      </td>

                      {/* Percentage & Progress Bar */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-[#1C1C20] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barClass} transition-all duration-300`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border min-w-[42px] text-center ${pctClass}`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Detailed day checkmarks if <= 14 sessions */}
                      {reportData.evaluatedDates.length <= 14 &&
                        reportData.evaluatedDates.map((d) => {
                          const sessionDetail = rec.sessionDatesDetail.find(
                            (s) => s.dateString === d.dateString
                          );
                          const isPres = sessionDetail?.status === 'present';

                          return (
                            <td key={d.dateString} className="py-2.5 px-2 text-center">
                              {isPres ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold" title="Presente">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-bold" title="Ausente">
                                  ✗
                                </span>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 border-t border-[#1F1F1F] bg-[#0A0A0C] flex items-center justify-between text-[11px] text-[#71717A] shrink-0">
          <span>
            Mostrando <strong className="text-[#EDEDED]">{filteredRecords.length}</strong> de{' '}
            <strong className="text-[#EDEDED]">{reportData.playerRecords.length}</strong> jugadores activos
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-[12px] font-medium text-[#EDEDED] bg-[#141416] hover:bg-[#1E1E22] border border-[#26262A] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
