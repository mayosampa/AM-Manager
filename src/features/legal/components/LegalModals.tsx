import React, { useEffect, useState } from 'react';
import { Cookie, FileText, ShieldCheck, X } from 'lucide-react';
import { LEGAL_DOCUMENTS, LEGAL_UPDATED_AT, LEGAL_VERSION, LegalDocType } from '../data/legalDocuments';
export { LEGAL_VERSION };
export type { LegalDocType };

interface LegalModalsProps {
  isOpen: boolean;
  initialTab?: LegalDocType;
  onClose: () => void;
}

const TABS: { id: LegalDocType; icon: React.FC<{ className?: string }> }[] = [
  { id: 'terms', icon: FileText },
  { id: 'privacy', icon: ShieldCheck },
  { id: 'cookies', icon: Cookie },
];

export const LegalModals: React.FC<LegalModalsProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const doc = LEGAL_DOCUMENTS[activeTab];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-[#0A0A0A] border border-[#242424] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center justify-between gap-3">
          <div>
            <h2 id="legal-modal-title" className="text-[15px] font-semibold text-[#EDEDED]">
              Documentación Legal y Cumplimiento RGPD · AM Manager
            </h2>
            <p className="text-[11px] text-[#737373]">
              Versión {LEGAL_VERSION} · Actualización: {LEGAL_UPDATED_AT} · ammanager.es
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana legal"
            className="p-1.5 rounded-md text-[#888888] hover:text-white hover:bg-[#1A1A1A] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-2.5 border-b border-[#1F1F1F] bg-[#0A0A0A] flex gap-1.5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const item = LEGAL_DOCUMENTS[tab.id];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-t-lg text-[12px] font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-emerald-500 text-emerald-400 bg-[#111814]'
                    : 'border-transparent text-[#888888] hover:text-[#EDEDED]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.tabLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-5 text-[12.5px] leading-relaxed">
          <div className="pb-3 border-b border-[#1A1A1A]">
            <h3 className="text-[16px] font-semibold text-[#EDEDED]">{doc.heading}</h3>
            <p className="text-[11.5px] text-emerald-400/90 font-mono mt-0.5">{doc.subtitle}</p>
          </div>

          {doc.sections.map(sec => (
            <section key={sec.title} className="space-y-2">
              <h4 className="text-[13px] font-semibold text-[#EDEDED]">{sec.title}</h4>
              {sec.paragraphs.map((p, idx) => (
                <p key={idx} className="text-[#A1A1AA]">
                  {p}
                </p>
              ))}
              {sec.highlight && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/95 text-[12px]">
                  {sec.highlight}
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[#1F1F1F] bg-[#0D0D0D] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
