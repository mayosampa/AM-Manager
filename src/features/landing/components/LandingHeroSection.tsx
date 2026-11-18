import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface LandingHeroSectionProps {
  onRegister: () => void;
}

const HERO_STANDINGS_PREVIEW = [
  { pos: '1º', team: 'CANDOR C.F.', pts: 24, dg: '+14', mine: false },
  { pos: '2º', team: 'F.C. MARBELLÍ', pts: 20, dg: '+9', mine: false },
  { pos: '3º', team: 'C.D. ÁLORA "A"', pts: 19, dg: '+8', mine: true },
  { pos: '4º', team: 'PEÑA COMPADRES', pts: 18, dg: '+6', mine: false },
  { pos: '5º', team: 'C.D. CAMPILLOS', pts: 16, dg: '+3', mine: false },
];

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({ onRegister }) => {
  return (
    <section className="relative bg-[#F8FAFC] border-b border-slate-200 pt-24 pb-16 sm:pt-28 sm:pb-24 overflow-hidden">
      {/* Textura sutil de pizarra táctica al 3% */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035] text-slate-900"
        preserveAspectRatio="none"
        viewBox="0 0 1200 700"
      >
        <rect x="40" y="40" width="1120" height="620" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="600" y1="40" x2="600" y2="660" stroke="currentColor" strokeWidth="2" />
        <circle cx="600" cy="350" r="95" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="40" y="185" width="165" height="330" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="995" y="185" width="165" height="330" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Columna Izquierda */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center px-2.5 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600">
            PARA ENTRENADORES DE FÚTBOL BASE Y REGIONAL
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
            TU EQUIPO. TU ENTRENAMIENTO. TU PIZARRA.
          </h1>

          <p className="text-[15px] sm:text-[16px] text-slate-600 leading-relaxed max-w-xl">
            AM Manager reúne la gestión de plantilla, el planificador de sesiones, el scouting de rivales y la
            pizarra táctica animada en una sola herramienta pensada para usar en el despacho y a pie de campo.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onRegister}
              className="h-11 px-5 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-[14px] font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Empezar gratis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#funcionalidades"
              className="h-11 px-5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[14px] font-medium transition-colors inline-flex items-center justify-center"
            >
              Ver cómo funciona
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium text-slate-600 pt-1">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-[#059669]" /> Sin instalaciones
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-[#059669]" /> Adaptado a móvil, tablet y PC
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-[#059669]" /> Exportación PDF y WhatsApp
            </span>
          </div>
        </div>

        {/* Columna Derecha: Composición Portátil + Smartphone */}
        <div className="lg:col-span-6 relative pb-8 sm:pb-6">
          {/* Marco Portátil */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-2 sm:p-2.5 shadow-sm">
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-md overflow-hidden text-[#EDEDED]">
              <div className="h-8 px-3 border-b border-zinc-800 bg-[#050505] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="font-semibold text-zinc-200">AM Manager · C.D. Álora Sénior</span>
                <span className="text-[#10B981]">J10 · Activo</span>
              </div>
              <div className="p-3.5 sm:p-4 grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-7 bg-[#0F0F10] border border-zinc-800 rounded-md p-2.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    Clasificación Oficial
                  </div>
                  <div className="divide-y divide-zinc-900 text-[11px] tabular-nums">
                    {HERO_STANDINGS_PREVIEW.map(row => (
                      <div
                        key={row.pos}
                        className={`py-1.5 px-1.5 flex items-center justify-between ${
                          row.mine ? 'bg-[#059669]/15 text-emerald-300 font-semibold rounded' : 'text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-zinc-500 w-5">{row.pos}</span>
                          <span className="truncate">{row.team}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono shrink-0">
                          <span className="text-zinc-500">{row.dg}</span>
                          <span className="font-bold text-white w-5 text-right">{row.pts}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-5 flex flex-col gap-2.5">
                  <div className="bg-[#0F0F10] border border-zinc-800 rounded-md p-2.5 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Próximo Partido
                    </div>
                    <div className="text-[12px] font-semibold text-white">vs U.D. Humilladero</div>
                    <div className="text-[11px] font-mono text-zinc-400 tabular-nums">Dom 22 Nov · 17:30</div>
                    <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Disponibles</span>
                      <span className="text-[#10B981] font-semibold tabular-nums">19 / 22</span>
                    </div>
                  </div>
                  <div className="bg-[#0F0F10] border border-zinc-800 rounded-md p-2.5 space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Sesión MD-2
                    </div>
                    <div className="text-[11px] text-zinc-200 font-medium">Presión tras pérdida + ABP</div>
                    <div className="text-[10px] font-mono text-zinc-500 tabular-nums">4 fases · 75 min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smartphone superpuesto en primer plano */}
          <div className="w-52 sm:w-56 bg-slate-900 border border-slate-800 rounded-lg p-1.5 shadow-sm sm:absolute sm:-bottom-4 sm:-right-3 mt-3 sm:mt-0 ml-auto">
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-md p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Pizarra · Salida 1-4-3-3</span>
                <span className="text-[#10B981]">MP4</span>
              </div>
              <svg viewBox="0 0 220 128" className="w-full rounded border border-zinc-800 bg-[#1B4332]">
                <rect x="6" y="6" width="208" height="116" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                <line x1="110" y1="6" x2="110" y2="122" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
                <circle cx="110" cy="64" r="20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
                <path d="M42 64 Q 78 36 122 38" fill="none" stroke="#F8FAFC" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M122 38 L168 58" fill="none" stroke="#10B981" strokeWidth="2.2" />
                <circle cx="42" cy="64" r="6" fill="#E51923" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="122" cy="38" r="6" fill="#E51923" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="168" cy="58" r="6" fill="#E51923" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="145" cy="76" r="6" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="95" cy="48" r="6" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between font-mono tabular-nums">
                <span>Convocatoria: 18 jug.</span>
                <span className="text-white font-semibold">Enviar →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
