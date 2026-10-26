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
        <p className="text-xs text-zinc-400">
          Activa o desactiva qué estadísticas deseas registrar en el Partido en Directo y mostrar en las tablas de Rendimiento y exportaciones PDF/Excel.
        </p>
        <button
          type="button"
          onClick={handleEnableAll}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
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
              className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                enabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                  : 'bg-[#18181b]/60 border-white/5 text-zinc-500 hover:border-white/10'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base leading-none mt-0.5">{item.emoji}</span>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${enabled ? 'text-white' : 'text-zinc-400'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-zinc-500 leading-tight mt-0.5 line-clamp-2">
                    {item.desc}
                  </div>
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full shrink-0 p-0.5 transition-colors flex items-center ${
                  enabled ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {enabled && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />}
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#111214] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#18181b]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Configurar Columnas y Métricas
              </h3>
              <p className="text-[11px] text-zinc-400">
                Personaliza las estadísticas activas para tu equipo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          <MetricsConfigPanel />
        </div>

        <div className="px-5 py-3.5 border-t border-white/10 bg-[#18181b]/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
