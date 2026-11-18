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
          className="fixed bottom-16 md:bottom-4 right-4 left-4 md:left-auto md:max-w-md z-[150] bg-[#0B0E11]/95 backdrop-blur-md border border-[#24292F] rounded-xl p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[12.5px] font-semibold text-[#EDEDED]">
                  Almacenamiento Técnico Esencial
                </h3>
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  aria-label="Cerrar aviso de cookies"
                  className="text-[#737373] hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11.5px] text-[#A1A1AA] mt-1 leading-relaxed">
                AM Manager utiliza únicamente almacenamiento local y cookies técnicas esenciales para tu sesión y el modo offline, sin rastreadores ni publicidad.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="h-7 px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[11.5px] transition-colors cursor-pointer"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={() => setShowCookiesModal(true)}
                  className="h-7 px-3 rounded-md bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#D4D4D8] text-[11.5px] transition-colors cursor-pointer"
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
