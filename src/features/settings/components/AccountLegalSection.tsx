import React, { useEffect, useState } from 'react';
import { Cookie, Download, FileText, Loader2, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { performCleanLogout } from '../../../services/authSession';
import { useTeam } from '../../../context/TeamContext';
import { LegalDocType, LegalModals } from '../../legal/components/LegalModals';
import { GdprEraseModal } from '../../legal/components/GdprEraseModal';
import {
  checkIsFounderStaff,
  deleteAllUserDataAndLogout,
  exportAllUserDataAsJson,
} from '../../legal/services/gdprAccountService';

export const AccountLegalSection: React.FC = () => {
  const { teams } = useTeam();
  const [userEmail, setUserEmail] = useState<string>('');
  const [isFounderStaff, setIsFounderStaff] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalDocType | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [eraseError, setEraseError] = useState<string | null>(null);

  const hasSharedClubHint = teams.some(t => /alora|álora/i.test(t.name || ''));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    }).catch(() => {});
    checkIsFounderStaff().then(setIsFounderStaff).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await performCleanLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    setStatusMsg(null);
    try {
      await exportAllUserDataAsJson();
      setStatusMsg({ type: 'ok', text: 'Copia completa en JSON descargada (Portabilidad Art. 20 RGPD).' });
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err?.message || 'No se pudieron exportar tus datos.' });
    } finally {
      setExportingJson(false);
    }
  };

  const handleConfirmErase = async () => {
    setErasing(true);
    setEraseError(null);
    try {
      await deleteAllUserDataAndLogout();
    } catch (err: any) {
      setEraseError(err?.message || 'No se pudieron eliminar tus datos.');
    } finally {
      setErasing(false);
    }
  };

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <h2 className="text-[13px] font-semibold text-slate-900">Cuenta, Privacidad (RGPD) y Documentación Legal</h2>
          </div>
          {userEmail && <span className="text-[11px] font-mono text-slate-500">{userEmail}</span>}
        </div>

        <div className="p-5 space-y-4">
          {statusMsg && (
            <div className={`px-3 py-2 rounded-md text-[12px] border ${statusMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {statusMsg.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setLegalTab('terms')} className="h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[12px] flex items-center gap-1.5 cursor-pointer">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Aviso Legal y Condiciones
              </button>
              <button type="button" onClick={() => setLegalTab('privacy')} className="h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[12px] flex items-center gap-1.5 cursor-pointer">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                Política de Privacidad
              </button>
              <button type="button" onClick={() => setLegalTab('cookies')} className="h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[12px] flex items-center gap-1.5 cursor-pointer">
                <Cookie className="w-3.5 h-3.5 text-slate-500" />
                Política de Cookies
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="h-8 px-3.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-medium flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar Sesión'}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              disabled={exportingJson}
              className="h-8 px-3.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[12px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingJson ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>📥 Exportar mis datos (Portabilidad RGPD)</span>
            </button>

            <button
              type="button"
              onClick={() => { setEraseError(null); setShowEraseModal(true); }}
              className="h-8 px-3.5 rounded-md bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>🗑️ Eliminar todos mis datos y cerrar cuenta (Derecho al Olvido)</span>
            </button>
          </div>
        </div>
      </section>

      <LegalModals isOpen={legalTab !== null} initialTab={legalTab || 'terms'} onClose={() => setLegalTab(null)} />
      <GdprEraseModal
        isOpen={showEraseModal}
        isFounderStaff={isFounderStaff}
        hasSharedClubHint={hasSharedClubHint}
        deleting={erasing}
        error={eraseError}
        onClose={() => setShowEraseModal(false)}
        onConfirm={handleConfirmErase}
      />
    </>
  );
};
