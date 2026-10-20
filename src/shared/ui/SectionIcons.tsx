import React from 'react';

export interface IconProps {
  className?: string;
}

/** Inicio / Panel de Control — Bento Grid moderno */
export const IconDashboard: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="8" height="9" rx="2.2" />
    <rect x="14" y="3" width="7" height="5" rx="2" />
    <rect x="14" y="11" width="7" height="10" rx="2.2" />
    <rect x="3" y="15" width="8" height="6" rx="2" />
    <circle cx="7" cy="7.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/** Planificador / Agenda — Calendario de Microciclo con bloques de sesión */
export const IconPlanner: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M8 2v4M16 2v4M3 9.5h18" />
    <path d="M7.5 13.5h4M7.5 17h6" />
    <circle cx="16.5" cy="15.2" r="2" />
  </svg>
);

/** Plantilla — Camiseta oficial de fútbol con dorsal */
export const IconSquadJersey: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 3.5 12 6l3.5-2.5 4.8 2.8-2.1 4.2-2.7-1.1V20a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 20V9.4L5.8 10.5 3.7 6.3 8.5 3.5Z" />
    <path d="M10.5 12.5v4.5M13.5 12.5v4.5" strokeWidth="1.7" />
  </svg>
);

/** Régimen Interno / Multas — Tarjetas disciplinarias de árbitro */
export const IconWhistleCards: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="5" width="10" height="14" rx="2" transform="rotate(-8 9 12)" />
    <path d="M13.5 4.5h5A1.8 1.8 0 0 1 20.3 6.3v10.4a1.8 1.8 0 0 1-1.8 1.8h-4.5" />
    <path d="M8 10.5h3M8 13.5h2" />
  </svg>
);

/** Análisis de Rendimiento / Estadísticas — Barras + curva ascendente con nodos */
export const IconAnalytics: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 20V14M9.5 20V11M15 20v-6M20 20V9" />
    <path d="m4 10 5-3.5 5 2 6-5" />
    <circle cx="20" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

/** Día de Partido / Match Hub — Duelo competitivo (Espadas cruzadas + escudo central) */
export const IconMatchDay: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" y1="19" x2="19" y2="13" />
    <line x1="16" y1="16" x2="20" y2="20" />
    <line x1="19" y1="21" x2="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
    <line x1="5" y1="14" x2="9" y2="18" />
    <line x1="7" y1="17" x2="4" y2="20" />
    <line x1="3" y1="19" x2="5" y2="21" />
  </svg>
);

/** Pizarra Táctica — Campo de fútbol con áreas, círculo central y jugada táctica */
export const IconTacticalBoard: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <line x1="12" y1="4.5" x2="12" y2="19.5" strokeOpacity="0.65" />
    <circle cx="12" cy="12" r="2.6" strokeOpacity="0.8" />
    <path d="M2.5 9h2.8v6H2.5M21.5 9h-2.8v6h2.8" strokeOpacity="0.75" />
    <path d="M7.5 15.5c1.5-2.8 4-4.2 7.8-4.5" />
    <polyline points="13.5 9.3 15.6 10.9 13.8 12.8" />
  </svg>
);

/** Biblioteca de Ejercicios — Cuaderno / Playbook táctico con cono y ruta */
export const IconExerciseLibrary: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 4.5h12.5A2.5 2.5 0 0 1 20 7v12.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V5.5a1 1 0 0 1 1-1Z" />
    <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
    <path d="m9.5 11.5 2-4 2 4h-4Z" />
    <path d="M14.5 8.5c1.5 0 2.5 1 2.5 2.5" />
  </svg>
);

/** Historial de Partidos — Trofeo de competición */
export const IconMatchHistory: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

/** Base de Datos de Rivales & Scouting — Escudo con radar táctico / diana de análisis */
export const IconRivalsScouting: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.5 19.5 5.5v5.8c0 5-3.2 8.9-7.5 10.2-4.3-1.3-7.5-5.2-7.5-10.2V5.5L12 2.5Z" />
    <circle cx="12" cy="11.5" r="3" />
    <path d="M12 7v1.5M12 14.5V16M7.5 11.5H9M15 11.5h1.5" />
  </svg>
);

/** Ajustes — Controles deslizantes de precisión */
export const IconSettingsSliders: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="6" x2="10" y2="6" />
    <line x1="14" y1="6" x2="20" y2="6" />
    <circle cx="12" cy="6" r="2" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="18" y1="12" x2="20" y2="12" />
    <circle cx="16" cy="12" r="2" />
    <line x1="4" y1="18" x2="6" y2="18" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <circle cx="8" cy="18" r="2" />
  </svg>
);
