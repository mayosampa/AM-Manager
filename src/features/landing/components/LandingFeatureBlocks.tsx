import React from 'react';
import { Check, Play, Share2 } from 'lucide-react';

const CheckItem: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-start gap-2.5 text-[14px] text-slate-600 leading-relaxed">
    <span className="w-5 h-5 rounded-md bg-[#059669]/10 border border-[#059669]/25 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
      <Check className="w-3.5 h-3.5" />
    </span>
    <span>{text}</span>
  </li>
);

export const LandingFeatureBlocks: React.FC = () => {
  return (
    <div id="funcionalidades" className="bg-white divide-y divide-slate-200 border-b border-slate-200">
      {/* Bloque 1: Sincronización Oficial en 1 Clic */}
      <section id="competicion" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[#059669]">
            01 · Sincronización Oficial en 1 Clic
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Olvídate de picar calendarios y clasificaciones a mano
          </h2>
          <ul className="space-y-3 pt-1">
            <CheckItem text="Selección directa de tu categoría, grupo federativo y equipo oficial en segundos." />
            <CheckItem text="Actualización automática de resultados, jornadas disputadas y clasificación al completo." />
            <CheckItem text="Alta instantánea de todos los rivales de tu liga con cruce directo de enfrentamientos (H2H)." />
          </ul>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">2ª Andaluza Sénior · Grupo 2</div>
                <div className="text-[15px] font-bold text-slate-900">Clasificación y Próxima Jornada</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#059669] text-white text-[11px] font-semibold">Sincronizado</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-[12px] tabular-nums">
              <div className="grid grid-cols-12 bg-slate-100 px-3 py-2 font-mono text-[10px] uppercase text-slate-500">
                <span className="col-span-2">Pos</span>
                <span className="col-span-6">Club</span>
                <span className="col-span-2 text-right">PJ</span>
                <span className="col-span-2 text-right">PTS</span>
              </div>
              {[
                { pos: '1º', club: 'CANDOR C.F.', pj: 9, pts: 24, mine: false },
                { pos: '2º', club: 'C.D. FÚTBOL CLUB MARBELLI', pj: 9, pts: 20, mine: false },
                { pos: '3º', club: 'C.D. ÁLORA "A"', pj: 9, pts: 19, mine: true },
                { pos: '4º', club: 'PEÑA COMPADRES', pj: 9, pts: 18, mine: false },
              ].map(r => (
                <div
                  key={r.pos}
                  className={`grid grid-cols-12 px-3 py-2 border-t border-slate-100 items-center ${
                    r.mine ? 'bg-[#059669]/10 font-semibold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <span className="col-span-2 font-mono text-slate-500">{r.pos}</span>
                  <span className="col-span-6 truncate">{r.club}</span>
                  <span className="col-span-2 text-right font-mono">{r.pj}</span>
                  <span className="col-span-2 text-right font-mono font-bold text-slate-900">{r.pts}</span>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-md px-3.5 py-2.5 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-slate-800">Jornada 10 · C.D. Álora vs U.D. Humilladero</span>
              <span className="font-mono text-slate-500 tabular-nums">Dom 22 Nov · 17:30</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bloque 2: Pizarra Táctica Animada y Exportable a Vídeo */}
      <section id="pizarra" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
              <span>Rondo Posicional + Transición 6c6</span>
              <span className="text-zinc-300 tabular-nums">Fotograma 2 / 4</span>
            </div>
            <svg viewBox="0 0 420 230" className="w-full rounded-md border border-zinc-800 bg-[#1B4332]">
              <rect x="14" y="14" width="392" height="202" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
              <line x1="210" y1="14" x2="210" y2="216" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="6 4" />
              <rect x="14" y="80" width="24" height="70" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              <rect x="382" y="80" width="24" height="70" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              <path d="M90 115 L175 65 L295 85" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="6 4" />
              <path d="M295 85 L370 112" fill="none" stroke="#10B981" strokeWidth="3" />
              {/* Conos naranjas */}
              <polygon points="150,45 144,57 156,57" fill="#F97316" />
              <polygon points="270,45 264,57 276,57" fill="#F97316" />
              {/* Jugadores */}
              {[
                [90, 115, '#E51923', '6'],
                [175, 65, '#E51923', '8'],
                [295, 85, '#E51923', '9'],
                [235, 130, '#3B82F6', '4'],
                [150, 145, '#3B82F6', '5'],
              ].map(([cx, cy, fill, num], idx) => (
                <g key={idx}>
                  <circle cx={Number(cx)} cy={Number(cy)} r="11" fill={String(fill)} stroke="#FFFFFF" strokeWidth="2" />
                  <text x={Number(cx)} y={Number(cy) + 4} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    {num}
                  </text>
                </g>
              ))}
            </svg>
            <div className="flex items-center justify-between pt-1 px-1 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="px-2 py-1 rounded bg-zinc-800 inline-flex items-center gap-1">
                  <Play className="w-3 h-3 text-[#10B981]" /> Reproducir
                </span>
                <span className="text-zinc-500">Fútbol 11 · Conos · Porterías</span>
              </div>
              <span className="px-2 py-1 rounded bg-[#059669] text-white font-semibold">Exportar .MP4 / PDF</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[#059669]">
            02 · Pizarra Táctica Animada
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Diseña tus tareas y compártelas en vídeo por WhatsApp
          </h2>
          <ul className="space-y-3 pt-1">
            <CheckItem text="Animación fluida por fotogramas con material real de entrenamiento (conos, picas, porterías, bancos)." />
            <CheckItem text="Campos de Fútbol 11, Fútbol 7, zonas específicas y carriles de juego configurables." />
            <CheckItem text="Exportación directa a vídeo .mp4 para jugadores y ficha técnica en PDF lista para imprimir." />
          </ul>
        </div>
      </section>

      {/* Bloque 3: Gestión Integral del Vestuario y Día de Partido */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[#059669]">
            03 · Vestuario, Asistencia y Día de Partido
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Control total desde el entrenamiento del martes hasta el acta del domingo
          </h2>
          <ul className="space-y-3 pt-1">
            <CheckItem text="Convocatorias preparadas y enviadas por WhatsApp al grupo de jugadores en 1 toque." />
            <CheckItem text="Control de asistencia semanal, mensual y acumulado de temporada exportable en PDF." />
            <CheckItem text="Informes de scouting por rival, historial H2H y estadísticas completas de rendimiento individual." />
          </ul>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Match Hub · Convocatoria Oficial</div>
                <div className="text-[15px] font-bold text-slate-900">18 Convocados · 0 Sancionados en el XI</div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-300 text-[11px] font-semibold text-slate-800">
                <Share2 className="w-3 h-3 text-[#059669]" /> WhatsApp
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
              <div className="bg-white border border-slate-200 rounded-md p-2.5">
                <div className="font-mono text-lg font-bold text-slate-900">89%</div>
                <div className="text-[11px] text-slate-500">Asistencia Mes</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-md p-2.5">
                <div className="font-mono text-lg font-bold text-[#059669]">19 / 22</div>
                <div className="text-[11px] text-slate-500">Disponibles</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-md p-2.5">
                <div className="font-mono text-lg font-bold text-slate-900">15 / 15</div>
                <div className="text-[11px] text-slate-500">Rivales Liga</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-3 space-y-1.5 text-[12px] tabular-nums">
              <div className="flex justify-between font-medium text-slate-800">
                <span>#9 D. Morales · Delantero</span>
                <span className="font-mono text-[#059669]">685 min · 7 goles</span>
              </div>
              <div className="flex justify-between font-medium text-slate-800">
                <span>#8 C. Medina · Mediocentro</span>
                <span className="font-mono text-slate-600">720 min · 4 asist.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
