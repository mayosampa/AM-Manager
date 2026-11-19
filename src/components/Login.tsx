import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { syncUserProfileFromAuthUser } from '../services/userProfileService';
import { AmBrandLogo } from '../shared/ui/AmBrandLogo';
import { AmWatermark } from '../shared/ui/AmWatermark';
import { LegalDocType, LegalModals } from '../features/legal/components/LegalModals';
import { CookieConsentBanner } from '../features/legal/components/CookieConsentBanner';

type LoginMode = 'login' | 'forgot';

export interface LoginProps {
  onBackToLanding?: () => void;
  onGoToRegister?: () => void;
}

export function Login({ onBackToLanding, onGoToRegister }: LoginProps) {
  const [mode, setMode] = useState<LoginMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalDocType | null>(null);

  const switchMode = (next: LoginMode) => {
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
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          setError(signInErr.message);
        } else if (data?.user) {
          void syncUserProfileFromAuthUser(data.user);
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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-4 pb-20 overflow-hidden">
      <div className="pointer-events-none select-none fixed -right-12 bottom-6 z-0">
        <AmWatermark className="w-[380px] h-[380px] opacity-[0.045] text-slate-900" />
      </div>

      <div className="relative z-10 max-w-sm w-full space-y-3">
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a la web
          </button>
        )}

        <div className="w-full bg-white border border-slate-200 rounded-lg p-7 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <AmBrandLogo
              variant="light"
              size="xl"
              showText={true}
              subtitle={
                mode === 'login'
                  ? 'Acceso para entrenadores y cuerpo técnico'
                  : 'Recuperación de acceso a tu cuenta'
              }
              className="mb-1"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="entrenador@club.com"
                className="block w-full h-9 px-3 border border-slate-300 rounded-md bg-white text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#059669]"
              />
            </div>

            {mode === 'login' && (
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full h-9 px-3 border border-slate-300 rounded-md bg-white text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#059669]"
                />
              </div>
            )}

            {error && <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-[12px] text-red-700">{error}</div>}
            {notice && <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-[12px] text-emerald-800">{notice}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 flex justify-center items-center px-4 rounded-md text-[13px] font-semibold text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Iniciar Sesión' : 'Enviar Enlace de Recuperación'}
            </button>

            <div className="text-center pt-1">
              {mode === 'login' ? (
                <button type="button" onClick={() => switchMode('forgot')} className="text-[12px] text-slate-500 hover:text-[#059669] transition-colors cursor-pointer">
                  ¿Olvidaste tu contraseña? Recupérala aquí
                </button>
              ) : (
                <button type="button" onClick={() => switchMode('login')} className="text-[12px] text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
                  ← Volver a Iniciar Sesión
                </button>
              )}
            </div>
          </form>

          {onGoToRegister && mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-slate-200 text-center text-[12.5px] text-slate-600">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={onGoToRegister} className="text-[#059669] hover:underline font-semibold cursor-pointer">
                Crear cuenta
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px] text-slate-500">
        <button type="button" onClick={() => setLegalTab('terms')} className="hover:text-slate-900 cursor-pointer">Aviso Legal y Condiciones</button>
        <span>·</span>
        <button type="button" onClick={() => setLegalTab('privacy')} className="hover:text-slate-900 cursor-pointer">Política de Privacidad (RGPD)</button>
        <span>·</span>
        <button type="button" onClick={() => setLegalTab('cookies')} className="hover:text-slate-900 cursor-pointer">Política de Cookies</button>
      </footer>

      <LegalModals isOpen={legalTab !== null} initialTab={legalTab || 'terms'} onClose={() => setLegalTab(null)} />
      <CookieConsentBanner />
    </div>
  );
}
