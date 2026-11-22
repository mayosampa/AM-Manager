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
      className="fixed inset-0 z-[225] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-red-200 rounded-lg max-w-md w-full p-6 shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <h3 id="gdpr-erase-title" className="text-[15px] font-semibold text-slate-900">
                Supresión de Datos (Derecho al Olvido)
              </h3>
              <p className="text-[11px] text-slate-500">Acción irreversible · Art. 17 RGPD</p>
            </div>
          </div>
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            aria-label="Cerrar confirmación"
            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(isFounderStaff || hasSharedClubHint) && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[12px] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Protección Staff Fundador (C.D. Álora):</strong> tu cuenta tiene permisos de cuerpo técnico compartido. Esta operación borrará únicamente los registros cuyo propietario sea tu <code className="text-amber-800 font-semibold">user_id</code> actual, pero podría afectar a datos creados por ti para C.D. Álora. Verifica antes con tu compañero o exporta una copia JSON.
            </span>
          </div>
        )}

        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          Se eliminarán permanentemente de Supabase todos los equipos, plantillas, partidos, planificaciones y ejercicios vinculados a tu cuenta (<code className="text-slate-900 font-semibold">user_id</code>), se limpiará la caché local y se cerrará tu sesión.
        </p>

        <div>
          <label className="block text-[12px] text-slate-600 mb-1.5">
            Escribe <strong className="text-red-700 font-mono">ELIMINAR</strong> para confirmar:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            disabled={deleting}
            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-[13px] font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="h-9 px-3.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-medium cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isConfirmed || deleting}
            onClick={() => void onConfirm()}
            className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{deleting ? 'Eliminando…' : 'Confirmar Supresión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
