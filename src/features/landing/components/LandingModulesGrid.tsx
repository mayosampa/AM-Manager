import React from 'react';
import { RefreshCw, Trophy, Video, CalendarCheck, Shield, Users } from 'lucide-react';

const REAL_MODULES = [
  {
    code: 'MÓDULO 01',
    title: 'Sincronización Oficial de Competición',
    desc: 'Vincula tu categoría y grupo para importar automáticamente las jornadas del calendario, la tabla de clasificación y los equipos rivales de tu liga.',
    icon: RefreshCw,
  },
  {
    code: 'MÓDULO 02',
    title: 'Match Hub y Día de Partido',
    desc: 'Gestiona convocatorias individuales por encuentro (envío directo a WhatsApp y PDF corporativo), control de sanciones, cronómetro en vivo y registro de acta minuto a minuto.',
    icon: Trophy,
  },
  {
    code: 'MÓDULO 03',
    title: 'Pizarra Táctica Animada (.MP4 y PDF)',
    desc: 'Crea ejercicios y jugadas por fotogramas con material real (conos, picas, porterías, bancos), cuadros de texto y expórtalos en vídeo .mp4 o ficha técnica PDF.',
    icon: Video,
  },
  {
    code: 'MÓDULO 04',
    title: 'Planificador de Sesiones y Asistencia',
    desc: 'Organiza microciclos semanales y macrociclos, controla quién entrena cada día y genera informes de asistencia semanal, mensual y general en PDF.',
    icon: CalendarCheck,
  },
  {
    code: 'MÓDULO 05',
    title: 'Base de Datos de Rivales y Scouting',
    desc: 'Registra sistemas tácticos (F11 y F7), análisis de las 4 fases del juego, balón parado (ABP), jugadores clave y descarga el informe de partido en PDF.',
    icon: Shield,
  },
  {
    code: 'MÓDULO 06',
    title: 'Plantilla, Rendimiento y Biblioteca',
    desc: 'Ficha completa de jugadores (disponibilidad, lesiones, juveniles), estadísticas acumuladas por partido (goles, minutos, tarjetas, tiros, córners, fueras de juego) y biblioteca de tareas compartida.',
    icon: Users,
  },
];

export const LandingModulesGrid: React.FC = () => {
  return (
    <section id="modulos" className="bg-[#090B0E] border-b border-[#1E242E] py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="max-w-2xl space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#10B981]">
            ARQUITECTURA MODULAR DE AM MANAGER
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Seis herramientas reales diseñadas para la semana de competición
          </h2>
          <p className="text-[14px] text-zinc-400 leading-relaxed">
            Cada módulo comparte los datos de tu plantilla, calendario e historial para evitar duplicar trabajo entre cuerpo técnico, campo y despacho.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {REAL_MODULES.map(mod => (
            <article
              key={mod.code}
              className="bg-[#11141A] border border-[#1E242E] hover:border-[#2A313D] rounded-lg p-5 flex flex-col justify-between gap-4 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    {mod.code}
                  </span>
                  <div className="w-8 h-8 rounded-md bg-[#171B23] border border-[#2A313D] flex items-center justify-center text-[#10B981]">
                    <mod.icon className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-[15px] font-semibold text-white leading-snug">
                  {mod.title}
                </h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  {mod.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
