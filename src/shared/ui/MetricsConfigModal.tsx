import React from 'react';
import { X, Settings2, Check } from 'lucide-react';
import { StatMetricsConfig, DEFAULT_STAT_METRICS } from '../../types';
import { useTeam } from '../../context/TeamContext';

export interface MetricItemDef {
  key: keyof StatMetricsConfig;
  label: string;
  desc: string;
  emoji: string;
}

export const METRIC_ITEMS: MetricItemDef[] = [
  { key: 'shotsOnTarget', label: 'Tiros a Puerta', desc: 'Disparos entre los 3 palos en directo e informes', emoji: '🎯' },
  { key: 'shotsOffTarget', label: 'Tiros Fuera', desc: 'Disparos desviados en directo e informes', emoji: '💨' },
  { key: 'corners', label: 'Córners (Colectivo)', desc: 'Saques de esquina del equipo en directo e informes', emoji: '🚩' },
  { key: 'fouls', label: 'Faltas', desc: 'Faltas cometidas en directo, tablas e informes', emoji: '🛑' },
  { key: 'offsides', label: 'Fueras de Juego (Colectivo)', desc: 'Posiciones antirreglamentarias colectivas', emoji: '🏳️' },
  { key: 'assists', label: 'Asistencias', desc: 'Pases de gol en directo, tablas e informes', emoji: '👟' },
  { key: 'cleanSheets', label: 'Porterías a Cero (P.C.)', desc: 'Partidos sin encajar gol en tabla de rendimiento', emoji: '🧤' },
  { key: 'minutes', label: 'Minutos Jugados', desc: 'Tiempo en campo y % de minutos en informes', emoji: '⏱️' },
  { key: 'cards', label: 'Tarjetas (Amarillas / Rojas)', desc: 'Amonestaciones y expulsiones en partido y tablas', emoji: '🟨' },
];

export function MetricsConfigPanel() {
  const { statMetrics, updateStatMetrics } = useTeam();

  const handleToggle = (key: keyof StatMetricsConfig) => {
    updateStatMetrics({ [key]: !statMetrics[key] });
  };

  const handleEnableAll = () => {
    updateStatMetrics(DEFAULT_STAT_METRICS);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">
          Activa o desactiva qué estadísticas deseas registrar en el Partido en Directo y mostrar en las tablas de Rendimiento y exportaciones PDF/Excel.
        </p>
        <button
          type="button"
          onClick={handleEnableAll}
          className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Activar todas
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {METRIC_ITEMS.map(item => {
          const enabled = statMetrics[item.key] !== false;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleToggle(item.key)}
              className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                enabled
                  ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base leading-none mt-0.5">{item.emoji}</span>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${enabled ? 'text-slate-900' : 'text-slate-600'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                    {item.desc}
                  </div>
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full shrink-0 p-0.5 transition-colors flex items-center ${
                  enabled ? 'bg-[#059669] justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {enabled && <Check className="w-2.5 h-2.5 text-[#059669] stroke-[3]" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MetricsConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Configurar Columnas y Métricas
              </h3>
              <p className="text-[11px] text-slate-500">
                Personaliza las estadísticas activas para tu equipo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          <MetricsConfigPanel />
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
