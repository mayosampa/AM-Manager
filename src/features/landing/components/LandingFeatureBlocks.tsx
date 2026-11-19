import React from 'react';
import { Check, FileText, Play } from 'lucide-react';
import { LandingModulesGrid } from './LandingModulesGrid';

interface LandingFeatureBlocksProps {
  onSelectModule?: () => void;
}

export const LandingFeatureBlocks: React.FC<LandingFeatureBlocksProps> = ({ onSelectModule }) => {
  return (
    <>
      <LandingModulesGrid onSelectModule={onSelectModule} />

      <div className="bg-white divide-y divide-slate-200 border-b border-slate-200">
        {/* Bloque A: Pizarra Táctica Animada */}
        <section id="pizarra" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Pizarra Táctica · Biblioteca · Vídeo .MP4
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Del diseño de la tarea en pizarra al vídeo en el WhatsApp del vestuario
            </h2>
            <p className="text-[14.5px] text-slate-600 leading-relaxed">
              Dibuja secuencias paso a paso por fotogramas con conos, picas, porterías, bancos y dorsales de tu plantilla. Guarda cada ejercicio en la biblioteca, añádelo a tu sesión semanal y expórtalo como vídeo .MP4 o ficha PDF A4.
            </p>
            <ul className="space-y-2.5 pt-1 text-[13.5px] text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#059669] shrink-0" />
                <span>Campos reglamentarios F11, F7 y carriles de juego configurables.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#059669] shrink-0" />
                <span>Reproducción animada por fotogramas y exportación directa a .MP4.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#059669] shrink-0" />
                <span>Asignación inmediata a cualquier día del Planificador de Sesiones.</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1 tabular-nums">
                <span className="font-semibold text-slate-800">Pizarra · Rondo Presión + Finalización</span>
                <span className="text-emerald-700 font-semibold">Fotograma 3 / 4</span>
              </div>
              <svg viewBox="0 0 420 220" className="w-full rounded-md border border-slate-200 bg-[#15803d]">
                <rect x="14" y="14" width="392" height="192" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                <line x1="210" y1="14" x2="210" y2="206" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeDasharray="5 4" />
                <rect x="14" y="75" width="24" height="70" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                <rect x="382" y="75" width="24" height="70" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                <path d="M92 110 L178 62 L292 84" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeDasharray="5 4" />
                <path d="M292 84 L372 108" fill="none" stroke="#FDE047" strokeWidth="2.6" />
                <polygon points="150,42 144,54 156,54" fill="#F97316" />
                <polygon points="270,42 264,54 276,54" fill="#F97316" />
                {[
                  [92, 110, '#EF4444', '6'],
                  [178, 62, '#EF4444', '8'],
                  [292, 84, '#EF4444', '9'],
                  [232, 130, '#2563EB', '4'],
                  [148, 144, '#2563EB', '5'],
                ].map(([cx, cy, fill, num], idx) => (
                  <g key={idx}>
                    <circle cx={Number(cx)} cy={Number(cy)} r="10.5" fill={String(fill)} stroke="#FFFFFF" strokeWidth="1.8" />
                    <text x={Number(cx)} y={Number(cy) + 3.5} textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                      {num}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 inline-flex items-center gap-1 font-medium">
                    <Play className="w-3 h-3 text-[#059669]" /> Reproducir
                  </span>
                  <span>Material + Zonas</span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#059669] text-white font-semibold">
                  Exportar .MP4 / PDF A4
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Bloque B: Sincronización y Documentación Marca de Club */}
        <section id="sincronizacion" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Documentación Corporativa A4
                    </div>
                    <div className="text-[14px] font-bold text-slate-900">Informes con el Escudo de tu Club</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                  PDF A4
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[12px] tabular-nums">
                {[
                  { title: 'Hoja de Sesión', meta: 'Fases · Objetivos · Material' },
                  { title: 'Convocatoria Oficial', meta: 'Cita · Campo · Sanciones' },
                  { title: 'Informe de Scouting', meta: '4 Fases · ABP · H2H Rival' },
                  { title: 'Asistencia y Plantilla', meta: 'Semanal · Mensual · Global' },
                ].map(doc => (
                  <div key={doc.title} className="bg-white border border-slate-200 rounded-md p-3 space-y-1">
                    <div className="font-semibold text-slate-900">{doc.title}</div>
                    <div className="font-mono text-[10px] text-slate-500">{doc.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Sincronización Oficial · Marca de Club
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Clasificación al día y todos los documentos oficiales listos con tu escudo
            </h2>
            <p className="text-[14.5px] text-slate-600 leading-relaxed">
              Sincroniza competición, calendario y clasificación en un clic, y genera convocatorias, hojas de sesión, listados de plantilla e informes de scouting en formato PDF A4 con el escudo y datos de tu equipo.
            </p>
            <ul className="space-y-2.5 pt-1 text-[13.5px] text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#059669] shrink-0" />
                <span>Cabecera corporativa automática con escudo y categoría en todos los PDFs.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#059669] shrink-0" />
                <span>Cruce directo de clasificación oficial, calendario y balance H2H ante rivales.</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
};
