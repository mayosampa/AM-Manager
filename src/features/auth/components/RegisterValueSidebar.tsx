import React from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';

const INCLUDED_FREE = [
  '1 equipo completo (Fútbol 11 o Fútbol 7)',
  'Pizarra táctica animada con exportación a vídeo .MP4 y PDF',
  'Planificador de sesiones semanales con control de asistencia',
  'Convocatorias enviadas por WhatsApp en 1 toque y acta en vivo',
  'Sincronización automática de calendario, clasificación y rivales',
];

export const RegisterValueSidebar: React.FC = () => {
  return (
    <aside className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700">
            Cuenta gratuita desde el primer día
          </div>
          <h2 className="text-[18px] font-extrabold text-slate-900 leading-snug">
            Todo lo que incluye tu espacio de trabajo en AM Manager
          </h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Sin tarjeta bancaria ni instalaciones. Tu equipo quedará configurado automáticamente según tu club y categoría.
          </p>
        </div>

        <ul className="space-y-3 pt-3 border-t border-slate-100">
          {INCLUDED_FREE.map(item => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-700 leading-snug">
              <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-[13.5px] font-bold text-slate-900">
          <Lock className="w-4 h-4 text-[#059669] shrink-0" />
          <span>Datos 100% privados y aislados</span>
        </div>
        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          Cada cuenta opera bajo aislamiento estricto de base de datos (RLS por usuario). Ningún otro club ni entrenador puede ver tus jugadores, sesiones, actas ni informes de scouting.
        </p>
        <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#059669] shrink-0" />
          <span>Cumplimiento RGPD / LOPDGDD · Portabilidad y borrado en Ajustes</span>
        </div>
      </div>
    </aside>
  );
};
