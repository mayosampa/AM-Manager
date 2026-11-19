import React, { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { LegalModals } from './LegalModals';

const COOKIE_ACK_KEY = 'am_cookie_notice_ack_v1';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showCookiesModal, setShowCookiesModal] = useState(false);

  useEffect(() => {
    try {
      const ack = localStorage.getItem(COOKIE_ACK_KEY);
      if (!ack) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem(COOKIE_ACK_KEY, new Date().toISOString());
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <aside
          role="region"
          aria-label="Aviso de almacenamiento local y cookies técnicas"
          className="fixed bottom-16 md:bottom-4 right-4 left-4 md:left-auto md:max-w-md z-[150] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-4 shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[12.5px] font-bold text-slate-900">
                  Almacenamiento Técnico Esencial
                </h3>
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  aria-label="Cerrar aviso de cookies"
                  className="text-slate-400 hover:text-slate-900 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                AM Manager utiliza únicamente almacenamiento local y cookies técnicas esenciales para tu sesión y el modo offline, sin rastreadores ni publicidad.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="h-7 px-3 rounded-md bg-[#059669] hover:bg-[#047857] text-white font-semibold text-[11.5px] transition-colors cursor-pointer"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={() => setShowCookiesModal(true)}
                  className="h-7 px-3 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11.5px] font-medium transition-colors cursor-pointer"
                >
                  Política de Cookies
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      <LegalModals
        isOpen={showCookiesModal}
        initialTab="cookies"
        onClose={() => setShowCookiesModal(false)}
      />
    </>
  );
};
