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
  'Pizarra táctica interactiva con material deportivo',
  'Planificador de sesiones y hoja de entrenamiento',
  'Convocatorias por WhatsApp y actas PDF',
  'Clasificación y calendario oficial sincronizado',
];

const PRO_FEATURES = [
  'Equipos ilimitados dentro del club o temporada',
  'Scouting completo de rivales, H2H y PDFs ilimitados',
  'Estadísticas avanzadas de rendimiento por jugador y acta',
  'Exportaciones 100% Marca Blanca con el escudo de tu club',
  'Asistencia histórica multi-rango y soporte prioritario',
];

export const LandingPricingAndFooter: React.FC<LandingPricingAndFooterProps> = ({
  onRegister,
  onLogin,
  onOpenLegal,
}) => {
  return (
    <>
      <section id="planes" className="bg-[#F8FAFC] py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[#059669]">
              Planes Transparentes
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Empieza gratis hoy. Amplía cuando tu cuerpo técnico lo necesite.
            </h2>
            <p className="text-[14px] text-slate-600">
              Sin permanencia ni costes ocultos. Diseñado para entrenadores y clubes deportivos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Plan Gratis */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-7 shadow-sm flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-slate-900">Plan Míster Gratis</h3>
                  <span className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                    Para empezar
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">0 €</span>
                  <span className="text-[13px] text-slate-500">/ mes · para siempre</span>
                </div>
                <p className="text-[13px] text-slate-600">
                  Todo lo esencial para preparar tus entrenamientos semanales y partidos con tu equipo.
                </p>
                <ul className="space-y-2.5 pt-2 border-t border-slate-100">
                  {FREE_FEATURES.map(item => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={onRegister}
                className="w-full h-10 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Empezar gratis
              </button>
            </div>

            {/* Plan Míster PRO */}
            <div className="bg-white border-2 border-[#059669] rounded-lg p-6 sm:p-7 shadow-sm flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-slate-900">Plan Míster PRO</h3>
                  <span className="px-2.5 py-0.5 rounded bg-[#059669]/10 border border-[#059669]/30 text-[11px] font-mono font-semibold text-[#059669]">
                    Recomendado
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">9,99 €</span>
                  <span className="text-[13px] text-slate-500">/ mes</span>
                  <span className="text-[12px] font-mono font-semibold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded">
                    o 59 €/año
                  </span>
                </div>
                <p className="text-[13px] text-slate-600">
                  La suite táctica y competitiva completa sin límites para cuerpos técnicos exigentes.
                </p>
                <ul className="space-y-2.5 pt-2 border-t border-slate-100">
                  {PRO_FEATURES.map(item => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-start gap-2.5 text-[12px] text-slate-700">
                  <Building2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">Licencias para Clubes y Escuelas:</strong> packs multientrenador con coordinación unificada bajo consulta en <span className="font-mono text-slate-800">ammanager.es</span>.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onRegister}
                className="w-full h-10 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Empezar con Míster PRO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Corporativo y Legal */}
      <footer className="bg-white py-10 text-slate-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <AmBrandLogo
              size="sm"
              showText={true}
              variant="light"
              subtitle="Plataforma integral para entrenadores y clubes de fútbol"
            />
            <p className="text-[12px] text-slate-500">
              Contacto y licencias para clubes: <span className="font-mono text-slate-700">ammanager.es</span> ·{' '}
              <button type="button" onClick={onLogin} className="text-[#059669] hover:underline font-medium cursor-pointer">
                Acceder al panel
              </button>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-slate-500">
            <button type="button" onClick={() => onOpenLegal('terms')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Aviso Legal
            </button>
            <button type="button" onClick={() => onOpenLegal('privacy')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Política de Privacidad
            </button>
            <button type="button" onClick={() => onOpenLegal('cookies')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Política de Cookies
            </button>
            <span className="font-mono text-[11px] text-slate-400">© {new Date().getFullYear()} AM Manager</span>
          </div>
        </div>
      </footer>
    </>
  );
};
