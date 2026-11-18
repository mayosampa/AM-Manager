import React, { useState } from 'react';
import { Check, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({ isOpen, onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setError(updateErr.message);
      } else {
        setDone(true);
        setTimeout(onComplete, 1200);
      }
    } catch {
      setError('No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-recovery-title"
      className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#0A0A0A] border border-[#242424] rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 id="password-recovery-title" className="text-[15px] font-semibold text-[#EDEDED]">
              Restablecer Contraseña
            </h2>
            <p className="text-[11px] text-[#888888]">Introduce tu nueva contraseña de acceso.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#888888] mb-1">Nueva contraseña (mín. 8 caracteres)</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#888888] mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-9 px-3 border border-[#262626] rounded-md bg-[#050505] text-[13px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-[12px] text-red-400">
              {error}
            </div>
          )}
          {done && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-[12px] text-emerald-300 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Contraseña actualizada correctamente.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || done}
            className="w-full h-9 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Nueva Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};
