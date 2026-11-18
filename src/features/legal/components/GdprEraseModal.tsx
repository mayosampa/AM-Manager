import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';

interface GdprEraseModalProps {
  isOpen: boolean;
  isFounderStaff: boolean;
  hasSharedClubHint: boolean;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const GdprEraseModal: React.FC<GdprEraseModalProps> = ({
  isOpen,
  isFounderStaff,
  hasSharedClubHint,
  deleting,
  error,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, deleting, onClose]);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'ELIMINAR';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gdpr-erase-title"
      className="fixed inset-0 z-[225] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#0A0A0A] border border-red-500/35 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
            </div>
            <div>
              <h3 id="gdpr-erase-title" className="text-[15px] font-semibold text-[#EDEDED]">
                Supresión de Datos (Derecho al Olvido)
              </h3>
              <p className="text-[11px] text-[#888888]">Acción irreversible · Art. 17 RGPD</p>
            </div>
          </div>
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            aria-label="Cerrar confirmación"
            className="p-1 text-[#737373] hover:text-white rounded cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(isFounderStaff || hasSharedClubHint) && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-200 text-[12px] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Protección Staff Fundador (C.D. Álora):</strong> tu cuenta tiene permisos de cuerpo técnico compartido. Esta operación borrará únicamente los registros cuyo propietario sea tu <code className="text-amber-300">user_id</code> actual, pero podría afectar a datos creados por ti para C.D. Álora. Verifica antes con tu compañero o exporta una copia JSON.
            </span>
          </div>
        )}

        <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">
          Se eliminarán permanentemente de Supabase todos los equipos, plantillas, partidos, planificaciones y ejercicios vinculados a tu cuenta (<code className="text-[#EDEDED]">user_id</code>), se limpiará la caché local y se cerrará tu sesión.
        </p>

        <div>
          <label className="block text-[12px] text-[#888888] mb-1.5">
            Escribe <strong className="text-red-300 font-mono">ELIMINAR</strong> para confirmar:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            disabled={deleting}
            className="w-full h-9 px-3 bg-[#050505] border border-[#262626] rounded-md text-[13px] font-mono text-[#EDEDED] focus:outline-none focus:border-red-500/60"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/25 text-[12px] text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="h-9 px-3.5 rounded-md bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#EDEDED] text-[12px] font-medium cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isConfirmed || deleting}
            onClick={() => void onConfirm()}
            className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{deleting ? 'Eliminando…' : 'Confirmar Supresión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
