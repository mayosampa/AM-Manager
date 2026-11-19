import React from 'react';
import { ChevronRight } from 'lucide-react';

interface LandingModulesGridProps {
  onSelectModule?: () => void;
}

const REAL_MODULES = [
  {
    title: 'Sincronización Oficial de Competición',
    desc: 'Importa jornadas, resultados, clasificación y rivales de tu grupo en 1 clic.',
  },
  {
    title: 'Match Hub y Día de Partido',
    desc: 'Convocatorias por WhatsApp y PDF, control de sanciones, cronómetro y acta en vivo.',
  },
  {
    title: 'Pizarra Táctica Animada (.MP4 y PDF)',
    desc: 'Fotogramas animados con material real de campo y exportación directa a vídeo.',
  },
  {
    title: 'Planificador de Sesiones y Asistencia',
    desc: 'Microciclos, control de bajas y partes de asistencia semanal, mensual y general.',
  },
  {
    title: 'Base de Datos de Rivales y Scouting',
    desc: 'Sistemas F11/F7, 4 fases del juego, balón parado y dossier PDF.',
  },
  {
    title: 'Plantilla, Rendimiento y Biblioteca',
    desc: 'Estadísticas acumuladas por jugador y biblioteca compartida de tareas.',
  },
];

export const LandingModulesGrid: React.FC<LandingModulesGridProps> = ({ onSelectModule }) => {
  return (
    <section id="modulos" className="bg-[#F8FAFC] border-b border-slate-200 py-14 sm:py-18">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
              Módulos de la Plataforma
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Todo lo que necesita tu cuerpo técnico en una sola herramienta
            </h2>
          </div>
          <span className="font-mono text-[12px] text-slate-500 tabular-nums">
            6 módulos integrados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {REAL_MODULES.map(mod => (
            <button
              key={mod.title}
              type="button"
              onClick={onSelectModule}
              className="group w-full text-left bg-white border border-slate-200 hover:border-emerald-400 rounded-lg p-4 shadow-xs transition-colors flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#059669] shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <h3 className="text-[14.5px] font-bold text-slate-900 group-hover:text-[#059669] transition-colors leading-snug">
                    {mod.title}
                  </h3>
                  <p className="text-[13px] text-slate-600 mt-0.5 leading-snug">
                    {mod.desc}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#059669] shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
