import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
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
  exportAttendanceReportExcel,
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
  const [isExportingExcel, setIsExportingExcel] = useState(false);

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

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportAttendanceReportExcel(reportData, activeTeamName);
    } catch (err) {
      console.error('Error al exportar informe de asistencia a Excel:', err);
      alert('Hubo un error al generar el archivo Excel. Por favor, inténtalo de nuevo.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (pct >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-[#059669]';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 rounded-lg w-full max-w-6xl max-h-[92vh] flex flex-col shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
                  Informe de Asistencia a Entrenamientos
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                  {activeTeamName}
                </span>
              </div>
              <p className="text-[12px] text-slate-500">
                Supervisión detallada de asistencia, faltas y compromiso del grupo por periodo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel || isExporting}
              className="h-8.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              title="Descargar informe en formato Excel (.xlsx)"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                  <span>Generando Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Excel (.xlsx)</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting || isExportingExcel}
              className="h-8.5 px-3.5 bg-[#059669] hover:bg-[#047857] text-white text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
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
              className="w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar ventana (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Navigation Controls Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Segmented Mode Selector: Semanal / Mensual / General */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMode('weekly')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'weekly'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setMode('monthly')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'monthly'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setMode('general')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'general'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                className="h-8 px-2.5 font-mono text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                HOY
              </button>
              <div className="flex items-center h-8 bg-slate-50 rounded-md border border-slate-200">
                <button
                  onClick={navigatePrev}
                  className="h-full px-2.5 text-slate-500 hover:text-slate-900 transition-colors border-r border-slate-200 cursor-pointer"
                  title="Periodo anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-[12px] font-medium text-slate-900 min-w-[170px] sm:min-w-[210px] text-center font-mono">
                  {reportData.dateRangeLabel}
                </span>
                <button
                  onClick={navigateNext}
                  className="h-full px-2.5 text-slate-500 hover:text-slate-900 transition-colors border-l border-slate-200 cursor-pointer"
                  title="Periodo siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-[12px] font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
              {reportData.dateRangeLabel}
            </span>
          )}

          {/* Quick Search Input */}
          <div className="relative flex items-center min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o dorsal..."
              className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-[12px] pl-8 pr-3 h-8 rounded-md focus:outline-none focus:border-[#059669] transition-colors"
            />
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                Sesiones Computadas
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {reportData.totalEvaluatedSessions}
              </div>
            </div>
            <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                Asistencia Media de Grupo
              </div>
              <div className={`text-2xl font-bold font-mono ${
                reportData.averageAttendancePercentage >= 80 ? 'text-emerald-700' : reportData.averageAttendancePercentage >= 50 ? 'text-amber-700' : 'text-red-700'
              }`}>
                {reportData.averageAttendancePercentage}%
              </div>
            </div>
            <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                Asistencia Plena (100%)
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {reportData.perfectAttendanceCount} <span className="text-xs text-slate-500 font-normal">/ {reportData.playerRecords.length} jug.</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Interactive Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-4 sm:p-5 bg-white">
          {reportData.totalEvaluatedSessions === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-lg my-6 bg-slate-50">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                No hay sesiones de entrenamiento registradas en este periodo
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Planifica ejercicios o pasa lista en el calendario para que la asistencia se contabilice automáticamente en este informe.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Ningún jugador coincide con la búsqueda activa.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500 bg-slate-50 sticky top-0 z-10">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Jugador</th>
                  <th className="py-2.5 px-3 text-center">Posición</th>
                  <th className="py-2.5 px-3 text-center">Sesiones</th>
                  <th className="py-2.5 px-3 text-center">Faltas</th>
                  <th className="py-2.5 px-3 text-center w-40">% Asistencia</th>
                  {reportData.evaluatedDates.length <= 14 &&
                    reportData.evaluatedDates.map((d) => (
                      <th key={d.dateString} className="py-2.5 px-2 text-center font-mono">
                        <div className="text-[10px] text-slate-700">{d.dayOfWeek}</div>
                        <div className="text-[9px] text-slate-400">{d.dayNumber}</div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[13px]">
                {filteredRecords.map((rec, index) => {
                  const pct = rec.attendancePercentage;
                  const pctClass = getPercentageColor(pct);
                  const barClass = getBarColor(pct);

                  return (
                    <tr
                      key={rec.player.id}
                      className={`transition-colors group hover:bg-slate-100/70 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* Dorsal */}
                      <td className="py-2.5 px-3 text-center font-mono text-[12px] font-semibold text-slate-500">
                        {rec.player.number !== undefined ? `#${rec.player.number}` : '-'}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-2">
                        <span>{rec.player.name}</span>
                        {pct === 100 && reportData.totalEvaluatedSessions > 0 && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                            100%
                          </span>
                        )}
                      </td>

                      {/* Position */}
                      <td className="py-2.5 px-3 text-center text-slate-600 text-[12px]">
                        {rec.player.position || 'Jugador'}
                      </td>

                      {/* Sessions Attended / Total */}
                      <td className="py-2.5 px-3 text-center font-mono text-[12px] text-slate-900">
                        <span className="font-semibold text-emerald-700">{rec.presentCount}</span>
                        <span className="text-slate-400"> / {rec.totalSessions}</span>
                      </td>

                      {/* Absences */}
                      <td className="py-2.5 px-3 text-center font-mono text-[12px]">
                        <span className={rec.absentCount > 0 ? 'text-red-700 font-bold' : 'text-slate-400'}>
                          {rec.absentCount}
                        </span>
                      </td>

                      {/* Percentage & Progress Bar */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
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
                                <span
                                  className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold font-mono tracking-wide"
                                  title="Presente"
                                >
                                  SÍ
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold font-mono tracking-wide"
                                  title="Ausente"
                                >
                                  NO
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
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <span>
            Mostrando <strong className="text-slate-900">{filteredRecords.length}</strong> de{' '}
            <strong className="text-slate-900">{reportData.playerRecords.length}</strong> jugadores activos
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-[12px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
