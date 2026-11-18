import React from 'react';
import { Check, Building2 } from 'lucide-react';
import { AmBrandLogo } from '../../../shared/ui/AmBrandLogo';
import { LegalDocType } from '../../legal/components/LegalModals';

interface LandingPricingAndFooterProps {
  onRegister: () => void;
  onLogin: () => void;
  onOpenLegal: (tab: LegalDocType) => void;
}

const FREE_FEATURES = [
  '1 equipo activo (Fútbol 11 o Fútbol 7)',
  'Gestión completa de plantilla y disponibilidad',
  'Planificador de sesiones semanales y asistencia',
  'Pizarra táctica interactiva con material real',
  'Convocatorias WhatsApp/PDF y sincronización de clasificación',
];

const PRO_FEATURES = [
  'Equipos ilimitados dentro del club o temporada',
  'Scouting completo de rivales, balance H2H y PDFs ilimitados',
  'Estadísticas avanzadas de rendimiento por jugador y acta',
  'Exportaciones 100% marca blanca con el escudo de tu club',
  'Asistencia multi-rango y soporte prioritario para cuerpos técnicos',
];

export const LandingPricingAndFooter: React.FC<LandingPricingAndFooterProps> = ({
  onRegister,
  onLogin,
  onOpenLegal,
}) => {
  return (
    <>
      <section id="planes" className="bg-[#090B0E] py-16 sm:py-24 border-b border-[#1E242E]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#10B981]">
              PLANES TRANSPARENTES
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Empieza gratis hoy. Amplía cuando tu cuerpo técnico lo necesite.
            </h2>
            <p className="text-[14px] text-zinc-400">
              Sin permanencia ni costes ocultos. Diseñado para entrenadores y clubes deportivos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Plan Gratis */}
            <div className="bg-[#11141A] border border-[#1E242E] rounded-lg p-6 sm:p-7 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-white">Plan Míster Gratis</h3>
                  <span className="px-2.5 py-0.5 rounded bg-[#171B23] border border-[#2A313D] font-mono text-[11px] text-zinc-400">
                    Para empezar
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-3xl font-bold font-mono text-white">0 €</span>
                  <span className="text-[13px] text-zinc-400">/ mes · para siempre</span>
                </div>
                <p className="text-[13px] text-zinc-400">
                  Todo lo esencial para organizar tu plantilla, sesiones de entrenamiento y convocatorias.
                </p>
                <ul className="space-y-2.5 pt-3 border-t border-[#1E242E]">
                  {FREE_FEATURES.map(item => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-zinc-300">
                      <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={onRegister}
                className="w-full h-10 rounded-md bg-[#171B23] hover:bg-[#1E242E] border border-[#2A313D] text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Empezar gratis
              </button>
            </div>

            {/* Plan Míster PRO */}
            <div className="bg-[#11141A] border border-[#10B981]/70 rounded-lg p-6 sm:p-7 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-white">Plan Míster PRO</h3>
                  <span className="px-2.5 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/35 font-mono text-[11px] font-semibold text-[#10B981]">
                    Uso completo
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                  <span className="text-3xl font-bold font-mono text-white">9,99 €</span>
                  <span className="text-[13px] text-zinc-400">/ mes</span>
                  <span className="text-[12px] font-mono font-semibold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 px-2 py-0.5 rounded">
                    o 59 €/año
                  </span>
                </div>
                <p className="text-[13px] text-zinc-400">
                  La suite táctica y competitiva completa sin límites para entrenadores y cuerpos técnicos.
                </p>
                <ul className="space-y-2.5 pt-3 border-t border-[#1E242E]">
                  {PRO_FEATURES.map(item => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-zinc-300">
                      <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-[#171B23] border border-[#1E242E] rounded-md p-3 flex items-start gap-2.5 text-[12px] text-zinc-300">
                  <Building2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Licencias para Clubes:</strong> paquetes multientrenador para escuelas y clubes deportivos bajo consulta en <span className="font-mono text-zinc-200">ammanager.es</span>.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onRegister}
                className="w-full h-10 rounded-md bg-[#10B981] hover:bg-[#34D399] text-[#051B11] text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Empezar con Míster PRO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Limpio */}
      <footer className="bg-[#090B0E] py-10 text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <AmBrandLogo
              size="sm"
              showText={true}
              variant="dark"
              subtitle="Software de gestión táctica y competitiva para entrenadores de fútbol"
            />
            <p className="text-[12px] text-zinc-500">
              Web oficial: <span className="font-mono text-zinc-300">ammanager.es</span> ·{' '}
              <button type="button" onClick={onLogin} className="text-[#10B981] hover:underline font-medium cursor-pointer">
                Iniciar sesión
              </button>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-zinc-500">
            <button type="button" onClick={() => onOpenLegal('terms')} className="hover:text-zinc-200 transition-colors cursor-pointer">
              Aviso Legal
            </button>
            <button type="button" onClick={() => onOpenLegal('privacy')} className="hover:text-zinc-200 transition-colors cursor-pointer">
              Política de Privacidad
            </button>
            <button type="button" onClick={() => onOpenLegal('cookies')} className="hover:text-zinc-200 transition-colors cursor-pointer">
              Política de Cookies
            </button>
            <span className="font-mono text-[11px] text-zinc-600">© {new Date().getFullYear()} AM Manager</span>
          </div>
        </div>
      </footer>
    </>
  );
};
