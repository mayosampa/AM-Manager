import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { syncUserProfileFromAuthUser } from '../services/userProfileService';
import { AmBrandLogo } from '../shared/ui/AmBrandLogo';
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
    <div className="min-h-screen bg-[#090B0E] flex flex-col items-center justify-center p-4 pb-20">
      <div className="max-w-sm w-full space-y-3">
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a la web
          </button>
        )}

        <div className="w-full bg-[#11141A] border border-[#1E242E] rounded-lg p-7 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <AmBrandLogo
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
              <label className="block text-[12px] font-medium text-zinc-400 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="entrenador@club.com"
                className="block w-full h-9 px-3 border border-[#2A313D] rounded-md bg-[#171B23] text-[13px] text-[#EDEDED] placeholder-zinc-500 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            {mode === 'login' && (
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full h-9 px-3 border border-[#2A313D] rounded-md bg-[#171B23] text-[13px] text-[#EDEDED] placeholder-zinc-500 focus:outline-none focus:border-[#10B981]"
                />
              </div>
            )}

            {error && <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-[12px] text-red-400">{error}</div>}
            {notice && <div className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/30 rounded-md text-[12px] text-emerald-300">{notice}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 flex justify-center items-center px-4 rounded-md text-[13px] font-semibold text-[#051B11] bg-[#10B981] hover:bg-[#34D399] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Iniciar Sesión' : 'Enviar Enlace de Recuperación'}
            </button>

            <div className="text-center pt-1">
              {mode === 'login' ? (
                <button type="button" onClick={() => switchMode('forgot')} className="text-[11.5px] text-zinc-400 hover:text-[#10B981] transition-colors cursor-pointer">
                  ¿Olvidaste tu contraseña? Recupérala aquí
                </button>
              ) : (
                <button type="button" onClick={() => switchMode('login')} className="text-[11.5px] text-zinc-400 hover:text-[#EDEDED] transition-colors cursor-pointer">
                  ← Volver a Iniciar Sesión
                </button>
              )}
            </div>
          </form>

          {onGoToRegister && mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-[#1E242E] text-center text-[12px] text-zinc-400">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={onGoToRegister} className="text-[#10B981] hover:underline font-semibold cursor-pointer">
                Crear cuenta
              </button>
            </div>
          )}
        </div>
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
