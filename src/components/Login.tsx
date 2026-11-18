import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { AmBrandLogo } from '../shared/ui/AmBrandLogo';
import { LEGAL_VERSION, LegalDocType, LegalModals } from '../features/legal/components/LegalModals';
import { CookieConsentBanner } from '../features/legal/components/CookieConsentBanner';

type AuthMode = 'login' | 'signup' | 'forgot';

export function Login() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalDocType | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInErr) setError(signInErr.message);
      } else if (mode === 'signup') {
        if (!acceptedTerms) {
          setError('Debes aceptar las Condiciones de Uso y la Política de Privacidad para crear tu cuenta.');
          return;
        }
        if (password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              accepted_terms_at: new Date().toISOString(),
              terms_version: LEGAL_VERSION,
              club_authorization_declared: true,
            },
          },
        });
        if (signUpErr) {
          setError(signUpErr.message);
        } else {
          setNotice('Cuenta creada. Revisa tu correo electrónico para confirmar el acceso.');
          setAcceptedTerms(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (resetErr) {
          setError(resetErr.message);
        } else {
          setNotice('Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.');
        }
      }
    } catch {
      setError('Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center p-4 pb-20">
      <div className="max-w-sm w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-7 shadow-2xl">
        <div className="flex flex-col items-center mb-5">
          <AmBrandLogo size="xl" showText={true} subtitle="Software Profesional de Gestión Táctica y Deportiva" className="mb-3" />
          <div className="w-full grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#050505] border border-[#1F1F1F] mt-2 text-[12px]">
            <button type="button" onClick={() => switchMode('login')} className={`py-1.5 rounded-md font-medium transition-colors cursor-pointer ${mode === 'login' ? 'bg-[#171717] text-[#EDEDED]' : 'text-[#737373] hover:text-[#EDEDED]'}`}>
              Iniciar Sesión
            </button>
            <button type="button" onClick={() => switchMode('signup')} className={`py-1.5 rounded-md font-medium transition-colors cursor-pointer ${mode === 'signup' ? 'bg-[#171717] text-[#EDEDED]' : 'text-[#737373] hover:text-[#EDEDED]'}`}>
              Crear Cuenta
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-1">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="entrenador@club.com" className="block w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] placeholder-[#525252] focus:outline-none focus:border-[#525252]" />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[12px] font-medium text-[#888888] mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'signup' ? 8 : undefined} placeholder="••••••••" className="block w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] placeholder-[#525252] focus:outline-none focus:border-[#525252]" />
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[12px] font-medium text-[#888888] mb-1">Confirmar contraseña</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} placeholder="••••••••" className="block w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] placeholder-[#525252] focus:outline-none focus:border-[#525252]" />
              </div>

              <label className="flex items-start gap-2.5 text-[11px] text-[#A1A1AA] leading-relaxed cursor-pointer pt-1 select-none">
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-emerald-500 rounded cursor-pointer shrink-0" />
                <span>
                  He leído y acepto las{' '}
                  <button type="button" onClick={() => setLegalTab('terms')} className="text-emerald-400 hover:underline cursor-pointer">Condiciones de Uso</button>
                  {' '}y la{' '}
                  <button type="button" onClick={() => setLegalTab('privacy')} className="text-emerald-400 hover:underline cursor-pointer">Política de Privacidad</button>
                  , y declaro contar con la autorización del club/interesados para gestionar los datos deportivos de mi plantilla.
                </span>
              </label>
            </>
          )}

          {error && <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-[12px] text-red-400">{error}</div>}
          {notice && <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-[12px] text-emerald-300">{notice}</div>}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !acceptedTerms)}
            className="w-full h-9 flex justify-center items-center px-4 rounded-md text-[13px] font-medium text-[#0A0A0A] bg-[#EDEDED] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Continuar' : mode === 'signup' ? 'Registrar Cuenta' : 'Enviar Enlace de Recuperación'}
          </button>

          <div className="text-center pt-1">
            {mode === 'login' ? (
              <button type="button" onClick={() => switchMode('forgot')} className="text-[11.5px] text-[#888888] hover:text-emerald-400 transition-colors cursor-pointer">
                ¿Olvidaste tu contraseña? Recupérala aquí
              </button>
            ) : mode === 'forgot' ? (
              <button type="button" onClick={() => switchMode('login')} className="text-[11.5px] text-[#888888] hover:text-[#EDEDED] transition-colors cursor-pointer">
                ← Volver a Iniciar Sesión
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-[#737373]">
        <button type="button" onClick={() => setLegalTab('terms')} className="hover:text-[#EDEDED] cursor-pointer">Aviso Legal y Condiciones</button>
        <span>·</span>
        <button type="button" onClick={() => setLegalTab('privacy')} className="hover:text-[#EDEDED] cursor-pointer">Política de Privacidad (RGPD)</button>
        <span>·</span>
        <button type="button" onClick={() => setLegalTab('cookies')} className="hover:text-[#EDEDED] cursor-pointer">Política de Cookies</button>
      </footer>

      <LegalModals isOpen={legalTab !== null} initialTab={legalTab || 'terms'} onClose={() => setLegalTab(null)} />
      <CookieConsentBanner />
    </div>
  );
}
