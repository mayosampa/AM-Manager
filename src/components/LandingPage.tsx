import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AmBrandLogo } from '../shared/ui/AmBrandLogo';
import { LandingHeroSection } from '../features/landing/components/LandingHeroSection';
import { LandingFeatureBlocks } from '../features/landing/components/LandingFeatureBlocks';
import { LandingPricingAndFooter } from '../features/landing/components/LandingPricingAndFooter';
import { LegalDocType, LegalModals } from '../features/legal/components/LegalModals';
import { CookieConsentBanner } from '../features/legal/components/CookieConsentBanner';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const NAV_LINKS = [
  { id: 'inicio', href: '#inicio', label: 'Inicio' },
  { id: 'modulos', href: '#modulos', label: 'Módulos' },
  { id: 'pizarra', href: '#pizarra', label: 'Pizarra Táctica' },
  { id: 'planes', href: '#planes', label: 'Planes' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const [activeNav, setActiveNav] = useState('inicio');
  const [legalTab, setLegalTab] = useState<LegalDocType | null>(null);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Barra Superior Limpia — Patrón QuintaAmarilla Editorial Light */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <a href="#inicio" onClick={() => setActiveNav('inicio')} className="shrink-0" aria-label="AM Manager Inicio">
            <AmBrandLogo variant="light" size="md" showText={true} />
          </a>

          {/* Selector segmentado tipo cápsula */}
          <nav
            className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80"
            aria-label="Navegación principal"
          >
            {NAV_LINKS.map(link => {
              const isActive = activeNav === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setActiveNav(link.id)}
                  className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onLogin}
              className="h-9 px-3.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-medium transition-colors cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="h-9 px-4 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Empezar gratis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <LandingHeroSection onRegister={onRegister} onLogin={onLogin} />
        <LandingFeatureBlocks onSelectModule={onRegister} />
        <LandingPricingAndFooter
          onRegister={onRegister}
          onLogin={onLogin}
          onOpenLegal={setLegalTab}
        />
      </main>

      <LegalModals
        isOpen={legalTab !== null}
        initialTab={legalTab || 'terms'}
        onClose={() => setLegalTab(null)}
      />
      <CookieConsentBanner />
    </div>
  );
};
