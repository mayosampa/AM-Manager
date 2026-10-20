import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-7">
        <div className="flex flex-col items-center mb-6">
          <div className="w-9 h-9 bg-[#EDEDED] text-[#0A0A0A] rounded-md flex items-center justify-center mb-4 font-mono font-bold text-[12px]">
            AM
          </div>
          <h1 className="text-[18px] font-semibold text-[#EDEDED] tracking-[-0.025em]">Iniciar sesión en AM Coach</h1>
          <p className="text-[#737373] mt-1 text-[12px] text-center">
            Introduce tus credenciales para acceder al espacio técnico
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] placeholder-[#525252] focus:outline-none focus:border-[#525252] transition-colors"
              placeholder="entrenador@club.com"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] placeholder-[#525252] focus:outline-none focus:border-[#525252] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-[12px] text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 flex justify-center items-center px-4 rounded-md text-[13px] font-medium text-[#0A0A0A] bg-[#EDEDED] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
