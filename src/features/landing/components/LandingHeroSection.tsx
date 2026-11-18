import React from 'react';
import { ArrowRight, Check, Play, Share2, ShieldAlert, ShieldCheck } from 'lucide-react';

interface LandingHeroSectionProps {
  onRegister: () => void;
}

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({ onRegister }) => {
  return (
    <section className="relative bg-[#090B0E] border-b border-[#1E242E] pt-28 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
      {/* Retícula geométrica sutil de líneas de campo al 2% */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025] text-zinc-100"
        preserveAspectRatio="none"
        viewBox="0 0 1200 700"
      >
        <rect x="48" y="48" width="1104" height="604" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="600" y1="48" x2="600" y2="652" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="600" cy="350" r="92" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="48" y="185" width="160" height="330" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="992" y="185" width="160" height="330" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Columna Izquierda */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#11141A] border border-[#1E242E] font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            SOFTWARE DE GESTIÓN DEPORTIVA • FÚTBOL 11 Y FÚTBOL 7
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-[1.12]">
            Todo tu cuerpo técnico organizado, desde el entrenamiento hasta el acta del domingo.
          </h1>

          <p className="text-[15px] sm:text-[16px] text-zinc-400 leading-relaxed max-w-xl">
            Planifica sesiones con control de asistencia, diseña tareas animadas en pizarra, prepara convocatorias
            en un toque y sincroniza automáticamente tu calendario y clasificación oficial.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onRegister}
              className="h-11 px-5 rounded-md bg-[#10B981] hover:bg-[#34D399] text-[#051B11] text-[14px] font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Crear cuenta gratis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#modulos"
              className="h-11 px-5 rounded-md bg-[#11141A] hover:bg-[#171B23] border border-[#2A313D] text-zinc-200 text-[14px] font-medium transition-colors inline-flex items-center justify-center"
            >
              Explorar funcionalidades
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-zinc-400 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#10B981]" /> Web y móvil (PWA instalable)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#10B981]" /> Exportación PDF con escudo de club
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#10B981]" /> Vídeos tácticos para WhatsApp
            </span>
          </div>
        </div>

        {/* Columna Derecha: Vista previa fiel del Match Hub + Pizarra Táctica */}
        <div className="lg:col-span-6 relative pb-10 sm:pb-8">
          <div className="bg-[#11141A] border border-[#1E242E] rounded-lg overflow-hidden shadow-sm">
            {/* Barra superior estilo Match Hub */}
            <div className="px-4 py-3 border-b border-[#1E242E] bg-[#090B0E] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                  Día de Partido · Match Hub
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#F59E0B] tabular-nums">JORNADA 10 · ACTA PENDIENTE</span>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Encuentro y Comparativa en Tabla */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E242E]">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Próximo Compromiso Oficial
                  </div>
                  <div className="text-[16px] font-bold text-white mt-0.5">
                    C.D. Álora Sénior vs U.D. Humilladero
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#171B23] border border-[#2A313D] font-mono text-[11px] text-zinc-300 tabular-nums">
                  Dom 22 Nov · 17:30 · Local
                </span>
              </div>

              {/* Comparativa de Clasificación real */}
              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="bg-[#171B23] border border-[#1E242E] rounded-md p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Nuestro Club</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-mono text-[18px] font-bold text-[#10B981]">3º</span>
                    <span className="font-mono text-[12px] text-zinc-300">19 pts · 9 PJ</span>
                  </div>
                </div>
                <div className="bg-[#171B23] border border-[#1E242E] rounded-md p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Rival en Liga</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-mono text-[18px] font-bold text-white">7º</span>
                    <span className="font-mono text-[12px] text-zinc-400">14 pts · 9 PJ</span>
                  </div>
                </div>
              </div>

              {/* Estado Plantilla / Sanciones */}
              <div className="grid grid-cols-3 gap-2.5 text-[11px] font-mono tabular-nums">
                <div className="bg-[#090B0E] border border-[#1E242E] rounded-md px-2.5 py-2 flex items-center gap-1.5 text-[#10B981]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>19 Convocables</span>
                </div>
                <div className="bg-[#090B0E] border border-[#1E242E] rounded-md px-2.5 py-2 flex items-center gap-1.5 text-[#EF4444]">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>1 Sancionado</span>
                </div>
                <div className="bg-[#090B0E] border border-[#1E242E] rounded-md px-2.5 py-2 flex items-center gap-1.5 text-[#F59E0B]">
                  <span>2 Duda médica</span>
                </div>
              </div>

              {/* Botones fieles del Match Hub */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="h-8 px-3 rounded-md bg-[#10B981] text-[#051B11] text-[11px] font-semibold inline-flex items-center gap-1.5">
                  <Play className="w-3 h-3" /> Iniciar Partido
                </span>
                <span className="h-8 px-3 rounded-md bg-[#171B23] border border-[#2A313D] text-zinc-200 text-[11px] font-medium inline-flex items-center gap-1.5">
                  <Share2 className="w-3 h-3 text-zinc-400" /> Convocatoria WhatsApp / PDF
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta superpuesta: Pizarra Táctica en acción */}
          <div className="w-60 sm:w-64 bg-[#11141A] border border-[#2A313D] rounded-lg p-2.5 shadow-sm sm:absolute sm:-bottom-5 sm:-right-3 mt-4 sm:mt-0 ml-auto">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1.5 tabular-nums">
              <span>Pizarra · Salida vs Presión</span>
              <span className="text-[#10B981]">2/4 fotog.</span>
            </div>
            <svg viewBox="0 0 220 116" className="w-full rounded-md border border-[#1E242E] bg-[#164A31]">
              <rect x="6" y="6" width="208" height="104" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
              <line x1="110" y1="6" x2="110" y2="110" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <circle cx="110" cy="58" r="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <path d="M40 58 Q 76 32 122 36" fill="none" stroke="#F8FAFC" strokeWidth="1.8" strokeDasharray="4 3" />
              <path d="M122 36 L170 54" fill="none" stroke="#10B981" strokeWidth="2" />
              <circle cx="40" cy="58" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.3" />
              <circle cx="122" cy="36" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.3" />
              <circle cx="170" cy="54" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.3" />
              <circle cx="96" cy="48" r="5.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.3" />
              <circle cx="144" cy="72" r="5.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.3" />
            </svg>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Exportar .MP4 / PDF A4</span>
              <span className="text-white font-semibold">Biblioteca</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
