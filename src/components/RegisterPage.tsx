import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  COACH_ROLE_OPTIONS,
  CoachRole,
  MAIN_CATEGORY_OPTIONS,
  MainCategory,
  syncUserProfileFromAuthUser,
} from '../services/userProfileService';
import { AmBrandLogo } from '../shared/ui/AmBrandLogo';
import { RegisterValueSidebar } from '../features/auth/components/RegisterValueSidebar';
import { LEGAL_VERSION, LegalDocType, LegalModals } from '../features/legal/components/LegalModals';
import { CookieConsentBanner } from '../features/legal/components/CookieConsentBanner';

export interface RegisterPageProps {
  onBackToLanding: () => void;
  onGoToLogin: () => void;
}

const FIELD_CLS =
  'block w-full h-9 px-3 border border-[#2A313D] rounded-md bg-[#171B23] text-[13px] text-[#EDEDED] placeholder-zinc-500 focus:outline-none focus:border-[#10B981]';

export const RegisterPage: React.FC<RegisterPageProps> = ({ onBackToLanding, onGoToLogin }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    birthYear: '',
    clubName: '',
    coachRole: 'primer_entrenador' as CoachRole,
    mainCategory: 'senior_regional' as MainCategory,
    province: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalDocType | null>(null);

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.fullName.trim()) { setError('Introduce tu nombre y apellidos para completar el alta.'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (!acceptedTerms) { setError('Debes aceptar la Política de Privacidad y las Condiciones de Uso.'); return; }

    const parsedYear = form.birthYear.trim() ? Number(form.birthYear.trim()) : null;
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1940 || parsedYear > 2010)) {
      setError('El año de nacimiento debe situarse entre 1940 y 2010.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.fullName.trim(),
            birth_year: parsedYear,
            club_name: form.clubName.trim(),
            coach_role: form.coachRole,
            main_category: form.mainCategory,
            province: form.province.trim(),
            accepted_terms_at: new Date().toISOString(),
            terms_version: LEGAL_VERSION,
            club_authorization_declared: true,
          },
        },
      });
      if (signUpErr) { setError(signUpErr.message); return; }
      if (data?.user && data?.session) {
        await syncUserProfileFromAuthUser(data.user);
      } else {
        setNotice('Cuenta creada correctamente. Revisa tu correo electrónico para confirmar el acceso.');
        setField('password', '');
      }
    } catch {
      setError('Ocurrió un error inesperado al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#EDEDED] flex flex-col">
      <header className="h-16 border-b border-[#1E242E] bg-[#090B0E]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <button type="button" onClick={onBackToLanding} className="cursor-pointer text-left">
            <AmBrandLogo variant="dark" size="md" showText={true} />
          </button>
          <div className="flex items-center gap-4 text-[12.5px]">
            <button type="button" onClick={onBackToLanding} className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a la web
            </button>
            <button type="button" onClick={onGoToLogin} className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md border border-[#2A313D] bg-[#11141A] hover:bg-[#171B23] text-zinc-200 font-medium transition-colors cursor-pointer">
              Ya tengo cuenta · Iniciar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-20">
        <div className="mb-6 space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#10B981]">ALTA DE CUENTA DE ENTRENADOR</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Crea tu cuenta gratuita en AM Manager</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-[#11141A] border border-[#1E242E] rounded-lg p-6 space-y-6">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#1E242E] pb-2">Bloque A · Credenciales de Acceso</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Correo electrónico *</label>
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} required placeholder="entrenador@club.com" className={FIELD_CLS} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Contraseña (mín. 6 car.) *</label>
                  <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} required minLength={6} placeholder="••••••••" className={FIELD_CLS} />
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#1E242E] pb-2">Bloque B · Perfil del Entrenador</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Nombre y Apellidos *</label>
                  <input type="text" value={form.fullName} onChange={e => setField('fullName', e.target.value)} required placeholder="Ej: Carlos Mendoza" className={FIELD_CLS} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Año de nacimiento (opc.)</label>
                  <input type="number" min={1940} max={2010} value={form.birthYear} onChange={e => setField('birthYear', e.target.value)} placeholder="Ej: 1992" className={FIELD_CLS} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Club actual (opc.)</label>
                  <input type="text" value={form.clubName} onChange={e => setField('clubName', e.target.value)} placeholder="Ej: C.D. Álora (o Sin equipo)" className={FIELD_CLS} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Provincia (opc.)</label>
                  <input type="text" value={form.province} onChange={e => setField('province', e.target.value)} placeholder="Ej: Málaga" className={FIELD_CLS} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Rol en el cuerpo técnico *</label>
                  <select value={form.coachRole} onChange={e => setField('coachRole', e.target.value as CoachRole)} className={FIELD_CLS}>
                    {COACH_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-300 mb-1">Categoría principal *</label>
                  <select value={form.mainCategory} onChange={e => setField('mainCategory', e.target.value as MainCategory)} className={FIELD_CLS}>
                    {MAIN_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-[11.5px] text-zinc-400 leading-relaxed cursor-pointer select-none pt-1">
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-[#10B981] rounded cursor-pointer shrink-0" />
              <span>
                He leído y acepto la{' '}
                <button type="button" onClick={() => setLegalTab('privacy')} className="text-[#10B981] hover:underline cursor-pointer">Política de Privacidad</button>
                {' '}y las{' '}
                <button type="button" onClick={() => setLegalTab('terms')} className="text-[#10B981] hover:underline cursor-pointer">Condiciones de Uso</button>
                , y confirmo contar con autorización para gestionar datos deportivos de mi equipo.
              </span>
            </label>

            {error && <div className="p-2.5 bg-red-500/10 border border-red-500/25 rounded-md text-[12px] text-red-400">{error}</div>}
            {notice && <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-md text-[12.5px] text-emerald-300">{notice}</div>}

            <div className="space-y-3 pt-1">
              <button type="submit" disabled={loading || !acceptedTerms} className="w-full h-10 flex justify-center items-center gap-2 px-4 rounded-md text-[13px] font-semibold text-[#051B11] bg-[#10B981] hover:bg-[#34D399] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Crear mi cuenta gratis</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <div className="text-center text-[12px] text-zinc-400">
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={onGoToLogin} className="text-[#10B981] hover:underline font-medium cursor-pointer">Iniciar sesión</button>
              </div>
            </div>
          </form>

          <div className="lg:col-span-5"><RegisterValueSidebar /></div>
        </div>
      </main>

      <LegalModals isOpen={legalTab !== null} initialTab={legalTab || 'privacy'} onClose={() => setLegalTab(null)} />
      <CookieConsentBanner />
    </div>
  );
};
