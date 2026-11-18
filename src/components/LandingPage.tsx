import React, { useState } from 'react';
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
  { href: '#modulos', label: 'Módulos' },
  { href: '#pizarra', label: 'Pizarra Táctica' },
  { href: '#sincronizacion', label: 'Sincronización' },
  { href: '#planes', label: 'Planes' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const [legalTab, setLegalTab] = useState<LegalDocType | null>(null);

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#EDEDED] font-sans">
      {/* Navbar Fija Unificada — Dark Tactical Slate */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-[#090B0E]/95 backdrop-blur-sm border-b border-[#1E242E]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <a href="#" className="shrink-0" aria-label="AM Manager Inicio">
            <AmBrandLogo size="md" showText={true} variant="dark" />
          </a>

          <nav className="hidden md:flex items-center gap-7" aria-label="Navegación principal">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onLogin}
              className="h-9 px-3.5 rounded-md border border-[#2A313D] bg-[#11141A] hover:bg-[#171B23] text-zinc-200 text-[13px] font-medium transition-colors cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="h-9 px-4 rounded-md bg-[#10B981] hover:bg-[#34D399] text-[#051B11] text-[13px] font-semibold transition-colors cursor-pointer"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      </header>

      <main>
        <LandingHeroSection onRegister={onRegister} />
        <LandingFeatureBlocks />
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
