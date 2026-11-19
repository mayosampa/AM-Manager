import React from 'react';
import { ArrowRight, Check, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AmWatermark } from '../../../shared/ui/AmWatermark';

interface LandingHeroSectionProps {
  onRegister: () => void;
  onLogin: () => void;
}

const STANDINGS_ROWS = [
  { pos: '1º', team: 'CANDOR C.F.', pj: 9, pts: 24, mine: false },
  { pos: '2º', team: 'C.D. FÚTBOL CLUB MARBELLI', pj: 9, pts: 20, mine: false },
  { pos: '3º', team: 'C.D. ÁLORA "A"', pj: 9, pts: 19, mine: true },
  { pos: '4º', team: 'PEÑA COMPADRES', pj: 9, pts: 18, mine: false },
];

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({ onRegister, onLogin }) => {
  return (
    <section id="inicio" className="relative bg-[#F8FAFC] border-b border-slate-200 pt-28 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
      {/* Marca de agua gigante y sutil del logotipo AM en el fondo derecho */}
      <div className="pointer-events-none select-none absolute -right-14 top-12 sm:right-4 sm:top-6 z-0">
        <AmWatermark className="w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] opacity-[0.045] text-slate-900" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Cabecera Editorial Centrada / Izquierda */}
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>Gestión Integral para Entrenadores · Fútbol 11 y Fútbol 7</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
            Planifica sesiones, diseña tu pizarra y gestiona tu equipo sin perder tiempo.
          </h1>

          <p className="text-[15.5px] sm:text-[17px] text-slate-600 leading-relaxed max-w-2xl">
            Sincroniza tu calendario y clasificación oficial en un clic, prepara convocatorias por WhatsApp y PDF
            con el escudo de tu club y exporta tareas animadas en vídeo.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onRegister}
              className="h-11 px-5 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-[14px] font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Crear cuenta gratis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="h-11 px-5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[14px] font-semibold transition-colors cursor-pointer"
            >
              Ya tengo cuenta
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#059669]" /> Web y móvil (PWA instalable)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#059669]" /> Exportación PDF A4 con escudo del club
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#059669]" /> Vídeos tácticos .MP4 para WhatsApp
            </span>
          </div>
        </div>

        {/* Tarjeta Blanca Elevada de Vista Previa Editorial */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              <span>Vista previa del Panel de Entrenador · C.D. Álora Sénior (F11)</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded tabular-nums">
              2ª Andaluza · Jornada 10
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Clasificación Sincronizada */}
            <div className="lg:col-span-5 bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold text-slate-500">
                  Clasificación Sincronizada
                </span>
                <span className="text-[11px] font-medium text-[#059669]">Actualizada</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100 text-[12px] tabular-nums">
                {STANDINGS_ROWS.map(row => (
                  <div
                    key={row.pos}
                    className={`px-3 py-2 flex items-center justify-between ${
                      row.mine ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-slate-400 w-5">{row.pos}</span>
                      <span className="truncate">{row.team}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono shrink-0">
                      <span className="text-slate-400">{row.pj} PJ</span>
                      <span className="font-bold text-slate-900 w-5 text-right">{row.pts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximo Partido + Convocatoria */}
            <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between gap-3">
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-wider font-semibold text-slate-500">
                  Próximo Partido · Match Hub
                </div>
                <div className="text-[15px] font-bold text-slate-900 mt-1">
                  C.D. Álora vs U.D. Humilladero
                </div>
                <div className="text-[12px] font-mono text-slate-600 mt-0.5 tabular-nums">
                  Domingo 22 Nov · 17:30 · Local
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md px-2.5 py-2 flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>19 Convocables</span>
                </div>
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-2.5 py-2 flex items-center gap-1.5 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>1 Sancionado</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center justify-between text-[11.5px]">
                <span className="font-medium text-slate-700">Convocatoria WhatsApp + PDF</span>
                <span className="font-semibold text-[#059669]">Lista →</span>
              </div>
            </div>

            {/* Acceso rápido a Pizarra Táctica */}
            <div className="lg:col-span-3 bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between text-[10.5px] font-mono font-semibold text-slate-500 uppercase">
                <span>Pizarra Táctica</span>
                <span className="text-[#059669]">.MP4</span>
              </div>
              <svg viewBox="0 0 220 120" className="w-full rounded-md border border-slate-200 bg-[#15803d]">
                <rect x="6" y="6" width="208" height="108" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                <line x1="110" y1="6" x2="110" y2="114" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
                <circle cx="110" cy="60" r="18" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
                <path d="M40 60 Q 78 34 124 38" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M124 38 L172 56" fill="none" stroke="#FDE047" strokeWidth="2.2" />
                <circle cx="40" cy="60" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.4" />
                <circle cx="124" cy="38" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.4" />
                <circle cx="172" cy="56" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.4" />
                <circle cx="96" cy="48" r="5.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.4" />
                <circle cx="144" cy="74" r="5.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.4" />
              </svg>
              <div className="text-[11px] text-slate-600 flex items-center justify-between font-mono tabular-nums">
                <span>4 fotogramas</span>
                <span className="font-semibold text-slate-900">F11 / F7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
